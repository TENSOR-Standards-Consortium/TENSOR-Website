// Presentation only. Labels never replace identity, resolve references, or assert evidence.
const opaque = /^(?:urn:\S+|[a-z]+[-_]?\d+)$/i;
const named = value => typeof value === 'string' && value.trim() && !/^urn:/i.test(value.trim()) ? value.trim() : '';
const readable = value => typeof value === 'string' && value.trim() && !opaque.test(value.trim()) ? value.trim() : '';
export function typeLabel(value) {
  return typeof value === 'string' ? value.replace(/([a-z])([A-Z])/g, '$1 $2') : 'Entry';
}
export function propertyLabel(value, fallback = 'Name not supplied') {
  if (typeof value === 'string') return readable(value) || fallback;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of ['label', 'name', 'title', 'hostname', 'fqdn', 'fileName', 'path', 'email', 'username', 'ipAddress', 'address', 'description']) {
      if (named(value[key])) return value[key].trim();
    }
  }
  return fallback;
}
export function questionLabel(node) {
  for (const value of [node?.question?.prompt, node?.prompt, node?.text, node?.label]) {
    if (readable(value)) return value.trim();
  }
  return 'Question description unavailable';
}
export function compactQuestionLabel(node, limit = 46) {
  const full = propertyLabel(node?.occurrenceLabel || node?.question?.metadata?.title || node?.metadata?.title || node?.title, '') || questionLabel(node);
  const prefix = `${node?.category || ''}: `;
  const description = full.startsWith(prefix) ? full.slice(prefix.length) : full;
  const label = node?.assessmentSummary?`${node.assessmentSummary} · ${description}`:description;
  if (label.length <= limit) return label;
  const shortened = label.slice(0, limit - 1);
  return shortened.slice(0, shortened.lastIndexOf(' ') > limit / 2 ? shortened.lastIndexOf(' ') : shortened.length) + '…';
}
export function questionKey(pin, questionId) {
  return JSON.stringify([pin?.artifact, pin?.id, pin?.version, pin?.sha256, questionId]);
}
export function subjectLabel(entry) {
  const bindings = entry?.subjectBindings;
  if (!bindings || typeof bindings !== 'object') return 'Subject not supplied';
  const labels = entry?.metadata?.subjectLabels;
  return Object.entries(bindings).slice(0, 8).map(([key, value]) => {
    // Only an explicit property mapped to this exact bound identity can name it.
    const declared = typeof value === 'string' && labels && Object.hasOwn(labels, value) ? named(labels[value]) : '';
    const unnamed = 'Referenced subject · name not supplied';
    const isReference = typeof value === 'string' && /^[a-z][a-z0-9+.-]*:/i.test(value);
    return `${typeLabel(key)}: ${declared || (isReference ? unnamed : propertyLabel(value, unnamed))}`;
  }).join(' · ') || 'Subject not supplied';
}
export function timeLabel(context) {
  if (!context || typeof context !== 'object') return 'Time not supplied';
  return [context.start, context.end].filter(v => typeof v === 'string').join(' – ') || propertyLabel(context.reason, typeLabel(context.status || 'Time not supplied'));
}
export function entryTitle(entry, { questions = new Map(), entriesById = new Map() } = {}) {
  if (entry?.type === 'QuestionInstance') {
    const q = questions.get(questionKey(entry.definitionRef, entry.questionId));
    return q ? questionLabel(q) : 'Question definition unavailable';
  }
  if (entry?.type === 'Assessment' || entry?.type === 'Decision') {
    const target = entriesById.get(entry.targetInstanceId);
    const q = target?.type === 'QuestionInstance' && questions.get(questionKey(target.definitionRef, target.questionId));
    if (q) return `${typeLabel(entry.type)} · ${entry.outcome || entry.disposition || 'Recorded'} · ${questionLabel(q)}${entry.recordedAt ? ` · ${entry.recordedAt}` : ''}`;
  }
  for (const field of ['label', 'name', 'title', 'statement', 'operationDescription', 'description', 'rationale', 'permittedOperation']) {
    if (readable(entry?.[field])) return entry[field].trim();
  }
  if (entry?.type === 'PolicyReference') return propertyLabel(entry.policyIdentity, 'Policy reference');
  // Only resolve a single hop through the unique entry index. Never recurse through a record cycle.
  const target = entriesById.get(entry?.targetInstanceId);
  const q = target?.type === 'QuestionInstance' && questions.get(questionKey(target.definitionRef, target.questionId));
  return `${typeLabel(entry?.type)}${q ? ` · ${questionLabel(q)}` : ''}`;
}

export function valueLabel(value, depth = 0) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return propertyLabel(value, 'Referenced item · see exact details');
  if (typeof value !== 'object') return String(value);
  if (depth >= 3) return 'Additional properties · see exact details';
  if (Array.isArray(value)) return value.slice(0, 30).map(v => valueLabel(v, depth + 1)).join(' · ') + (value.length > 30 ? ' · More in exact details' : '');
  return Object.entries(value).slice(0, 30).map(([key, v]) => `${typeLabel(key)}: ${/(?:^id$|Id$|Ids$)/.test(key) ? 'Referenced item · see exact details' : valueLabel(v, depth + 1)}`).join(' · ');
}
