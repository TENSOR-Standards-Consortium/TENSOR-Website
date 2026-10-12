import { parseJSON } from '../vendor/tensor-core/json.mjs';
import { serializeBundle, sha256 } from '../vendor/tensor-core/index.mjs';

export const MAX_BUNDLE_BYTES = 2 * 1024 * 1024;
export const CASES = Object.freeze([
  { id: 'case-a', title: 'An agent’s outbound transfer', description: 'Follow a missing payload, a precautionary pause, and an assessment revised after new evidence.', path: '/core/0.1.0-draft.1/examples/case-a.bundle.json' },
  { id: 'case-b', title: 'An ambiguous identity incident', description: 'Review a human–agent handoff, conflicting explanations, and a correction that keeps uncertainty visible.', path: '/core/0.1.0-draft.1/examples/case-b.bundle.json' },
]);
export const SECTIONS = Object.freeze([
  { id: 'overview', label: 'Scope & handoff' },
  { id: 'graph', label: 'Recorded path' },
  { id: 'QuestionInstance', label: 'Questions' },
  { id: 'EvidenceReference', label: 'Evidence' },
  { id: 'Observation', label: 'Observations' },
  { id: 'Hypothesis', label: 'Hypotheses' },
  { id: 'Assessment', label: 'Assessments' },
  { id: 'Decision', label: 'Decisions' },
  { id: 'ActionRecord', label: 'Actions' },
  { id: 'Actor', label: 'Actors' },
  { id: 'history', label: 'History' },
  { id: 'all', label: 'All entries' },
]);

export function asText(value) {
  if (value === undefined || value === null) return '';
  return typeof value === 'string' ? value : typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export function validateImportSize(text) {
  if (typeof text !== 'string') throw new Error('Expected JSON text.');
  if (text.length > MAX_BUNDLE_BYTES || new TextEncoder().encode(text).byteLength > MAX_BUNDLE_BYTES) {
    throw new Error('This bundle exceeds the 2 MiB import limit.');
  }
  if (!text.trim()) throw new Error('The bundle is empty. Choose a JSON bundle or paste its contents.');
  return text;
}

export function decodeBundleBytes(bytes) {
  if (bytes.byteLength > MAX_BUNDLE_BYTES) throw new Error('This bundle exceeds the 2 MiB import limit.');
  try {
    return validateImportSize(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof TypeError) throw new Error('The file contains invalid UTF-8 bytes. Export valid UTF-8 JSON and try again.');
    throw error;
  }
}

export function getEntries(bundle) {
  return Array.isArray(bundle?.record?.entries)
    ? bundle.record.entries.filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
    : [];
}

export function groupEntries(entries) {
  const grouped = Object.create(null);
  for (const entry of entries) {
    if (typeof entry.type !== 'string') continue;
    (grouped[entry.type] ||= []).push(entry);
  }
  return grouped;
}

// Ambiguous IDs must not silently resolve to whichever entry occurs last.
export function indexEntries(entries) {
  const indexed = new Map();
  for (const entry of entries) {
    if (typeof entry.id !== 'string') continue;
    indexed.set(entry.id, indexed.has(entry.id) ? null : entry);
  }
  return indexed;
}

export function attributionLabel(entry, entriesById) {
  const actor = entriesById.get(entry.attribution?.actorId);
  if (actor?.type === 'Actor') return asText(actor.label || actor.id);
  return asText(entry.attribution?.unknownReason || 'Attribution unresolved');
}

export function entryTitle(entry) {
  for (const field of ['label', 'statement', 'operationDescription', 'description', 'rationale', 'policyIdentity', 'permittedOperation']) {
    if (typeof entry?.[field] === 'string' && entry[field].trim()) return entry[field];
  }
  return asText(entry?.type || 'Unrecognized entry');
}

export function questionKey(pin, questionId) {
  return JSON.stringify([pin?.artifact, pin?.id, pin?.version, pin?.sha256, questionId]);
}

export async function getDefinitionQuestions(bundle) {
  const questions = new Map();
  if (!Array.isArray(bundle?.definitions)) return questions;
  const pathCounts = new Map();
  for (const artifact of bundle.definitions) pathCounts.set(artifact?.path, (pathCounts.get(artifact?.path) || 0) + 1);
  for (const artifact of bundle.definitions) {
    if (typeof artifact?.content !== 'string' || typeof artifact.path !== 'string' || pathCounts.get(artifact.path) !== 1) continue;
    try {
      const definition = parseJSON(artifact.content, { maxBytes: MAX_BUNDLE_BYTES });
      if (!Array.isArray(definition.questions)) continue;
      const digest = await sha256(artifact.content);
      for (const question of definition.questions) {
        if (!question || typeof question.id !== 'string') continue;
        const key = questionKey({ artifact: artifact.path, id: definition.id, version: definition.version, sha256: digest }, question.id);
        questions.set(key, questions.has(key) ? null : question);
      }
    } catch { /* Invalid artifacts remain visible in the full bundle and validator report. */ }
  }
  return questions;
}

export function filterEntries(entries, query = '', selectedEntryId = '') {
  if (selectedEntryId) return entries.filter((entry) => entry.id === selectedEntryId);
  const search = query.toLocaleLowerCase().trim();
  return search ? entries.filter((entry) => JSON.stringify(entry).toLocaleLowerCase().includes(search)) : entries;
}

export function summarizeValidation(report) {
  const counts = { pass: 0, fail: 0, indeterminate: 0, notRun: 0 };
  for (const check of Array.isArray(report?.checks) ? report.checks : []) {
    if (Object.hasOwn(counts, check?.status)) counts[check.status]++;
  }
  const status = report?.status;
  return {
    counts,
    title: status === 'pass' ? 'Bounded checks passed' : status === 'fail' ? 'Validation failed' : 'Interpretation remains indeterminate',
    description: status === 'pass'
      ? 'The supplied bundle passes this reference implementation’s structural and semantic checks. Review the record’s evidence limits and unresolved judgments separately.'
      : status === 'fail'
        ? 'The validator found a structural or semantic error. You can inspect and download the supplied record, but these results do not establish conformance.'
        : 'The validator cannot determine all affected meaning from the supplied record and supported dependencies. Review the specific checks below.',
  };
}

export function downloadName(bundle, suffix = 'bundle') {
  const id = typeof bundle?.record?.investigationId === 'string' ? bundle.record.investigationId : 'investigation';
  const stem = id.split(/[:/]/).filter(Boolean).slice(-2).join('-').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 72) || 'investigation';
  return `tensor-${stem}.${suffix === 'validation' ? 'validation' : 'bundle'}.json`;
}

// Prefer readable JSON, but do not inflate a valid import beyond the Lab limit.
export function serializeForLab(bundle) {
  return serializeBundle(bundle, { maxBytes: MAX_BUNDLE_BYTES });
}
