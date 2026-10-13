// Build-time projection: full normalized evidence stays in the downloadable suite.
// The browser receives only this profile's nine scoped walkthroughs.
const TITLES = { 'primary-match': 'Observe the bounded event', 'independent-match': 'Examine another origin',
  'primary-validation': 'Validate the observation', 'independent-validation': 'Validate the independent observation',
  'hypothesis-test': 'Test the technical hypothesis', 'scope-bound': 'Bound the scope',
  'relationship-test': 'Assess a separate relationship', 'source-test': 'Assess the technical source',
  'effect-test': 'Compare the technical metric', 'bounded-exclusion': 'Test the coverage basis',
  'unresolved-stop': 'Retain the uncertainty', 'refuted-stop': 'Retain the refutation', 'findings-stop': 'Hand off separate assessments' };
function evidenceText(rule, c, selected) {
  const value = field => selected?.facts?.[field]?.value ?? 'unassessed';
  if (rule === 'hypothesis-test') return `${c.analysis.hypothesis.statement} Criterion: ${c.hypothesisFact} = ${c.hypothesisValue}; observed: ${value(c.hypothesisFact)}. Alternatives: ${c.analysis.hypothesis.alternatives.join('; ') || 'not assessed'}.`;
  if (rule === 'scope-bound') return c.analysis.scope.entities.map(e => `${e.eventProfile}: ${Object.entries(e.subjects).map(([k,v])=>`${k}=${v}`).join(', ')} · ${e.disposition}`).join('; ');
  if (rule === 'relationship-test') { const a=c.analysis.correlation; return `Source ${a.sourceRecordId}; target ${a.targetRecord.id} (${a.targetEventProfile}, origin ${a.targetRecord.origin}). Discriminators: ${value(a.sourceFact)} / ${a.targetRecord.facts[a.targetFact]?.value ?? 'unassessed'}. Shared identity is separate from causation.`; }
  if (rule === 'source-test') return `Named technical source ${c.analysis.attribution.sourceEntityId}; assessed discriminator ${value(c.analysis.attribution.criterion.fact)}. Competing explanation: ${c.analysis.attribution.alternatives.join('; ')}.`;
  if (rule === 'effect-test') return `${c.metricId}: baseline ${value('metric.baseline')} ${value('metric.baselineUnit')} at ${value('metric.baselineTime')}; observation ${value('metric.observed')} ${value('metric.observedUnit')} at ${value('metric.observedTime')}. This supplied measurement does not attribute cause or business harm.`;
  if (rule === 'bounded-exclusion') return `Coverage basis: ${c.coverage.method}. Collection continuous: ${c.coverage.continuousCollection}; applicable logging: ${c.coverage.applicableLogging}; retention complete: ${c.coverage.retentionComplete}; clocks bounded: ${c.coverage.clockBounded}; search complete: ${c.coverage.searchComplete}; integrity assessed: ${c.coverage.integrityAssessed}.`;
  if (rule.endsWith('-stop')) return `${c.retention.assessments.length} separate profile-qualified assessments retained, including negative answers and unknowns. Investigation closure: ${c.retention.closesInvestigation}.`;
  if (!selected) return 'No accessible matching observation selected in the examined material; missing evidence does not prove event absence.';
  return `${selected.id} · origin ${selected.origin} · ${selected.eventTime}. event.kind: ${value('event.kind')}; ${c.hypothesisFact}: ${value(c.hypothesisFact)}. Provenance: ${selected.provenanceAssessment}; interpretation: ${selected.interpretationAssessment}; basis: ${selected.assessmentEvidenceRefs.join(', ')}.`;
}
export function expandProfileScenarios(suite, profileId = null) {
  return suite.cases.filter(item => !profileId || item.eventProfile === profileId).map(item => {
    const value = structuredClone(suite.fixtures[item.evidenceRef]);
    if (!value) throw new Error('Unknown profile evidence fixture');
    for (const edit of item.evidenceEdits) {
      if (!Array.isArray(edit.path) || !edit.path.length || edit.path.length > 20
          || edit.path.some(part => !['string','number'].includes(typeof part) || ['__proto__','constructor','prototype'].includes(part))
          || !['set','remove'].includes(edit.op)) throw new Error('Invalid profile evidence edit');
      let parent = value;
      for (const part of edit.path.slice(0,-1)) {
        if (!Object.hasOwn(parent,part)) throw new Error('Unknown profile evidence path');
        parent = parent[part];
      }
      const field = edit.path.at(-1);
      if (edit.op === 'set') parent[field] = structuredClone(edit.value);
      else if (Array.isArray(parent)) parent.splice(field,1);
      else delete parent[field];
    }
    value.id = item.id; value.expectedTrace = structuredClone(item.expectedTrace);
    return value;
  });
}

export function profileGuides(profileId, catalog, definitions, scenarios, validation) {
  const profile = catalog.profiles[profileId];
  if (!profile || definitions.graphSha256 !== catalog.graphSha256 || scenarios.graphSha256 !== catalog.graphSha256
      || validation.graphSha256 !== catalog.graphSha256) throw new Error('Profile source pins disagree');
  const receipts = new Map(validation.results.map(result => [result.caseId, result]));
  return expandProfileScenarios(scenarios, profileId).map(c => {
    const receipt = receipts.get(c.id);
    if (!receipt?.passed) throw new Error(`Unverified profile walkthrough: ${c.id}`);
    const variant = c.id.slice(profileId.length + 1).replaceAll('-', ' ');
    let selected = c.primary.accessible ? c.primary.records[0] : null;
    return {
      id: c.id, profileId, profileVersion: catalog.version, domain: profile.domain,
      title: `${profile.title} · ${variant}`,
      description: c.title,
      context: `${c.hypothesisStatement} Subjects: ${Object.entries(c.bindings).map(([k,v]) => `${k} = ${v}`).join('; ')}. Interval [${c.interval.start}, ${c.interval.end}).`,
      source: '/graphs/working/event-profiles/',
      steps: receipt.trace.map(row => {
        const definition = definitions.profiles[profileId][row.nodeId];
        if (!definition || definition.id !== row.questionId) throw new Error(`Missing qualified definition: ${row.questionId}`);
        if (definition.rule === 'independent-match' && row.answer === 'yes') selected = c.independent.records[0];
        const observed = definition.rule === 'independent-match' ? (c.independent.accessible ? c.independent.records[0] : null) : selected;
        return { questionId: row.nodeId, definitionId: row.questionId, outcome: row.answer,
          title: TITLES[definition.rule] || definition.predicate, evidence: evidenceText(definition.rule, c, observed),
          rationale: row.reason, limitation: c.limitations.join(' '), predicate: definition.predicate };
      }),
    };
  });
}

export function profileGraph(graph, context) {
  if (!context || graph.version !== context.graphVersion) return graph;
  return { ...graph, nodes: graph.nodes.map(node => {
    const definition = context.definitions[node.id];
    return definition ? { ...node, text: definition.predicate, profileDefinitionId: definition.id } : node;
  }) };
}

export function profileCriteria(criteria, context) {
  if (!context) return criteria;
  const nodes = { ...criteria.nodes };
  for (const [nid, definition] of Object.entries(context.definitions)) nodes[nid] = {
    ...nodes[nid], predicate: definition.predicate, boundSubjectFields: definition.boundSubjectFields,
    requiredAssessmentRecord: [...new Set([...nodes[nid].requiredAssessmentRecord, 'eventProfile', 'profileVersion', 'qualifiedQuestionId'])],
  };
  return { ...criteria, nodes, bindingRules: [...criteria.bindingRules, ...context.profile.evidenceRequirements,
    'These are distinct profile-qualified definitions above the graph; preserve the profile/version and qualified question identity during exchange.'] };
}
