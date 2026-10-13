import { questionLabel, subjectLabel, compactQuestionLabel } from './displayLabels.mjs';
import { getEntries, indexEntries, questionKey } from './investigationLab.mjs';

export function definitionView(graph, selectedId, whole = false) {
  const nodes = graph.nodes;
  const ids = new Set(nodes.map((node) => node.id));
  const selected = ids.has(selectedId) ? selectedId : graph.entryNodeIds[0];
  const edges = graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  const visible = whole ? ids : new Set([selected]);
  if (!whole) for (const edge of edges) {
    if (edge.source === selected) visible.add(edge.target);
    if (edge.target === selected) visible.add(edge.source);
  }
  return {
    selected,
    nodes: nodes.filter((node) => visible.has(node.id)).map((node) => ({ id: node.id, label: questionLabel(node), entryId: node.id })),
    edges: edges.filter((edge) => visible.has(edge.source) && visible.has(edge.target)).map((edge, index) => ({ id: `route-${index}`, source: edge.source, target: edge.target, label: edge.decision, outcome: edge.decision })),
  };
}

// A prefix means file order, not causal or event-time order. Original entries never change.
// IDs are resolved against the full record so duplicates cannot become unambiguous in a prefix.
export function recordedView(bundle, questions = new Map(), through = Infinity) {
  const all = getEntries(bundle);
  const index = indexEntries(all);
  const entries = all.slice(0, Math.max(0, through));
  const visibleIds = new Set(entries.filter((entry) => index.get(entry.id) === entry).map((entry) => entry.id));
  const instances = entries.filter((entry) => entry.type === 'QuestionInstance' && typeof entry.id === 'string' && index.get(entry.id) === entry);
  const ids = new Map(instances.map((entry, i) => [entry.id, `instance-${i}`]));
  const issues = [];
  if (entries.some((entry) => typeof entry.id !== 'string' || !index.get(entry.id))) issues.push('Entries with missing or ambiguous IDs cannot be resolved in this graph. Inspect the validation report and complete record.');
  const byInstance = new Map();
  for (const entry of entries) if (entry.type === 'Assessment') {
    if (!byInstance.has(entry.targetInstanceId)) byInstance.set(entry.targetInstanceId, []);
    byInstance.get(entry.targetInstanceId).push(entry);
  }
  const nodes = instances.map((entry, i) => {
    const assessments = byInstance.get(entry.id) || [];
    const question = questions.get(questionKey(entry.definitionRef, entry.questionId));
    return { id: ids.get(entry.id), entryId: entry.id, entry, assessments, question,
      label: `${i + 1}. ${compactQuestionLabel(question, 60)}\n${subjectLabel(entry).slice(0, 42)}\n${assessments.length} assessment${assessments.length === 1 ? '' : 's'}` };
  });
  const edges = [];
  for (const decision of entries.filter((entry) => entry.type === 'Decision' && index.get(entry.id) === entry)) {
    for (const [i, selection] of (Array.isArray(decision.selections) ? decision.selections : []).entries()) {
      if (!selection || !ids.has(decision.targetInstanceId) || !ids.has(selection.targetInstanceId)) {
        issues.push('A recorded transition has an unavailable, ambiguous, or not-yet-visible question instance endpoint.');
        continue;
      }
      const assessment = index.get(decision.selectedAssessmentId);
      const resolved = visibleIds.has(decision.selectedAssessmentId) && assessment?.type === 'Assessment' && assessment.targetInstanceId === decision.targetInstanceId;
      const outcome = resolved && ['yes', 'no', 'unknown'].includes(assessment.outcome) ? assessment.outcome : 'unresolved';
      if (outcome === 'unresolved') issues.push('A transition’s selected assessment is unavailable, ambiguous, or does not match its source instance.');
      edges.push({ id: `selection-${edges.length}-${i}`, source: ids.get(decision.targetInstanceId), target: ids.get(selection.targetInstanceId), outcome, label: `Recorded selection: ${outcome}`, entryId: decision.id, transitionId: selection.transitionId });
    }
  }
  return { nodes, edges, entries, issues: [...new Set(issues)] };
}
