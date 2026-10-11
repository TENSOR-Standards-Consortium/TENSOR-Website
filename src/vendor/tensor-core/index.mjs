import { BINDING_VERSION, schemas } from './schemas.mjs';
import { inspectJSON, parseJSON, stableJSON, semanticEqual, limitsFor, DEFAULT_LIMITS, byteLength } from './json.mjs';
import { validateSchema, validURI, compareTimestamps } from './schema-validator.mjs';
export { BINDING_VERSION, DEFAULT_LIMITS, semanticEqual, schemas };
export function parseBundle(text, options = {}) {
  const bundle = parseJSON(text, options);
  const errors = validateSchema(bundle, schemas.bundle);
  if (errors.length) throw new Error(`Invalid bundle envelope: ${errors[0].message} at ${errors[0].path}`);
  return bundle;
}
export function serializeBundle(bundle, options = {}) {
  const limits = limitsFor(options); inspectJSON(bundle, limits);
  let output = JSON.stringify(bundle, null, options.pretty === false ? undefined : 2);
  if (byteLength(output) > limits.maxBytes) output = JSON.stringify(bundle);
  return byteLength(output) < limits.maxBytes ? `${output}\n` : output;
}
export async function sha256(text) {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto is required (a secure browser context or Node.js 22+)');
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const typeNames = ['Actor', 'QuestionInstance', 'EvidenceReference', 'Observation', 'Hypothesis', 'Assessment', 'Decision', 'ActionRecord', 'PolicyReference', 'AuthorityAssertion'];
const pinKey = pin => `${pin.id}\n${pin.version}\n${pin.sha256}`;
const same = (a, b) => stableJSON(a) === stableJSON(b);
const pathSafe = path => !path.includes('\\') && !path.startsWith('/') && !path.split('/').some(p => p === '.' || p === '..' || !p) && !/^[a-z][a-z0-9+.-]*:/i.test(path);

/** Validate only data. No locators are fetched, imports executed, or permissions granted. */
export async function validateBundle(bundle, options = {}) {
  const checks = []; const transitions = []; const unresolvedReviews = [];
  let limits; let sequence = 0; let inspected = false; let dependencySteps = 0;
  const step = () => { if (++dependencySteps > limits.maxDependencySteps) throw new Error('Dependency analysis exceeds the receiver work budget'); };
  const add = (requirement, status, message, path, label = 'semantic') => {
    if (checks.length >= (limits?.maxChecks ?? DEFAULT_LIMITS.maxChecks)) throw new Error('Validation exceeds check budget');
    checks.push({ id: `${label}.${++sequence}`, requirement, status, message, ...(path ? { path } : {}) });
  };
  const assert = (condition, requirement, message, path) => { add(requirement, condition ? 'pass' : 'fail', message, path); return condition; };
  const finish = () => ({
    status: checks.some(c => c.status === 'fail') ? 'fail' : checks.some(c => c.status === 'indeterminate') ? 'indeterminate' : 'pass',
    bindingVersion: BINDING_VERSION,
    scope: {
      proposal: '0.1.0', binding: BINDING_VERSION, implementation: 'tensor-core-reference/0.1.0-draft.1',
      roles: ['reader', 'transition-interpreter', 'lossless-exchanger'], supportedProfiles: [], supportedExtensions: [],
      claims: 'Bounded candidate-binding checks; not certification, ratification, independent interoperability, factual verification, or execution authorization',
      exclusions: ['Truth and completeness of evidence', 'Mutual exclusivity and adequacy of natural-language criteria', 'Undisclosed history and changed meaning across unseen definition releases', 'Namespace ownership', 'Legal authority, safety and real-world action effects', 'Independent implementation exchange']
    }, checks, transitions, unresolvedReviews,
    summary: { entries: inspected ? bundle?.record?.entries?.length ?? 0 : 0, suppliedDefinitions: inspected ? bundle?.definitions?.length ?? 0 : 0, transitionDecisions: transitions.length }
  });
  try {
    limits = limitsFor(options); inspectJSON(bundle, limits); inspected = true; add('TC-35', 'pass', 'Input is bounded JSON data; validation performs no external retrieval or execution', '/', 'input');
    const envelopeErrors = validateSchema(bundle, schemas.bundle, '');
    for (const e of envelopeErrors) add('TC-37', 'fail', e.message, e.path, 'structure.bundle');
    if (envelopeErrors.length) return finish();
    if (!assert(bundle.record.entries?.length <= limits.maxEntries && bundle.definitions.length <= limits.maxDefinitions, 'TC-35', 'Entry and definition counts remain within receiver limits', '/')) return finish();
    const recordErrors = validateSchema(bundle.record, schemas.record, '/record');
    for (const e of recordErrors) add('TC-37', 'fail', e.message, e.path, 'structure.record');
    if (recordErrors.length) { add('TC-23', 'notRun', 'Semantic interpretation requires a structurally valid record', '/record'); return finish(); }
    add('TC-37', 'pass', 'Record satisfies the published candidate JSON Schema', '/record', 'structure.record');
    const record = bundle.record;
    assert(!record.sourceSnapshotIds?.includes(record.snapshotId) && new Set(record.sourceSnapshotIds ?? []).size === (record.sourceSnapshotIds?.length ?? 0), 'TC-07', 'Snapshot provenance is unique and does not name the snapshot itself', '/record/sourceSnapshotIds');
    const entries = new Map(); const entryPaths = new Map(); const definitions = new Map(); const artifacts = new Map(); const concepts = new Map(); const omitted = new Map();
    const blocked = new Set(); const refsByEntry = new Map(); const reasoningRefs = new Map(); const identityOwners = new Map();
    const objectIdentity = (id, kind, path) => {
      const previous = identityOwners.get(id);
      if (previous && previous.kind !== kind) add('TC-05', 'fail', `Identifier is reused across ${previous.kind} and ${kind}`, path);
      else identityOwners.set(id, { kind, path });
    };
    objectIdentity(record.snapshotId, 'Snapshot', '/record/snapshotId'); objectIdentity(record.investigationId, 'Investigation', '/record/investigationId');
    const checkDependencies = (object, key, path) => {
      const namespaces = new Set(); const dependencies = new Set();
      for (const extension of object.extensions ?? []) {
        assert(!namespaces.has(extension.namespace), 'TC-31', 'Extension namespaces are unique on an object', `${path}/extensions`); namespaces.add(extension.namespace);
        if (extension.requiredForInterpretation) { blocked.add(key); add('TC-31', 'indeterminate', `Unsupported required extension ${extension.namespace}@${extension.version}; affected semantics are not interpreted`, `${path}/extensions`); }
        else add('TC-31', 'pass', `Optional extension ${extension.namespace}@${extension.version} is retained opaquely`, `${path}/extensions`);
      }
      for (const dependency of object.dependencies ?? []) {
        const depKey = `${dependency.id}\n${dependency.version}`;
        assert(!dependencies.has(depKey), 'TC-03', 'Dependency identity and version are unique', `${path}/dependencies`); dependencies.add(depKey);
        if (dependency.requiredForInterpretation) { blocked.add(key); add('TC-29', 'indeterminate', `Unsupported required ${dependency.kind} ${dependency.id}@${dependency.version}`, `${path}/dependencies`); }
        else add('TC-29', 'pass', `Non-required dependency ${dependency.id}@${dependency.version} retained without interpreting it`, `${path}/dependencies`);
      }
    };
    checkDependencies(record, record.snapshotId, '/record');
    record.entries.forEach((entry, i) => {
      const p = `/record/entries/${i}`;
      assert(!entries.has(entry.id), 'TC-07', entries.has(entry.id) && !same(entries.get(entry.id), entry) ? 'Identity conflict: different entry content has the same ID' : 'Entry IDs are unique within a snapshot', `${p}/id`);
      if (!entries.has(entry.id)) { entries.set(entry.id, entry); entryPaths.set(entry.id, p); }
      objectIdentity(entry.id, entry.type, `${p}/id`); checkDependencies(entry, entry.id, p);
    });
    for (const [i, omission] of record.omissions.entries()) {
      assert(!omitted.has(omission.id) && !entries.has(omission.id), 'TC-33', 'Omissions are unique and do not describe included entries', `/record/omissions/${i}`);
      omitted.set(omission.id, omission);
    }
    assert(record.completeness.exchangeScope === 'partial' || !record.omissions.length, 'TC-33', 'Full snapshots have no omitted Core references', '/record/completeness');
    if (record.completeness.exchangeScope === 'partial') add('TC-33', 'indeterminate', 'Partial exchange is declared; affected meaning may be unavailable', '/record/completeness');
    if (record.losses.length) add('TC-34', 'indeterminate', 'Semantic losses are disclosed; this artifact does not establish lossless exchange', '/record/losses');
    const seriesVersions = new Map();
    for (const [i, artifact] of bundle.definitions.entries()) {
      const p = `/definitions/${i}`;
      if (!assert(pathSafe(artifact.path) && !artifacts.has(artifact.path), 'TC-06', 'Artifact paths are unique, relative labels without traversal', `${p}/path`)) continue;
      let definition;
      try { definition = parseJSON(artifact.content, limits); } catch (error) { add('TC-06', 'fail', `Definition bytes are not bounded, unambiguous JSON: ${error.message}`, `${p}/content`); continue; }
      const errors = validateSchema(definition, schemas.definition, `${p}/content`);
      for (const e of errors) add('TC-37', 'fail', e.message, e.path, 'structure.definition');
      if (errors.length) continue;
      const digest = await sha256(artifact.content); const key = pinKey({ ...definition, sha256: digest });
      const versionKey = `${definition.id}\n${definition.version}`;
      assert(!seriesVersions.has(versionKey) || seriesVersions.get(versionKey) === digest, 'TC-05', 'A definition ID and version identify only one exact byte artifact', p);
      seriesVersions.set(versionKey, digest); objectIdentity(definition.id, 'Definition', p);
      const prepared = { ...definition, digest, key, path: artifact.path, questionsById: new Map(), transitionsById: new Map() };
      definitions.set(key, prepared); artifacts.set(artifact.path, prepared); checkDependencies(definition, key, p);
      for (const [qi, question] of definition.questions.entries()) {
        const qp = `${p}/content/questions/${qi}`;
        assert(!prepared.questionsById.has(question.id), 'TC-05', 'Question IDs are unique within a definition', qp); prepared.questionsById.set(question.id, question);
        objectIdentity(question.id, 'Question', qp);
        const meaning = { proposition: question.proposition, parameters: question.parameters, applicabilityCriteria: question.applicabilityCriteria, assessmentCriteria: question.assessmentCriteria, evidenceRequirements: question.evidenceRequirements };
        assert(!concepts.has(question.id) || same(concepts.get(question.id), meaning), 'TC-05', 'Supplied versions do not reuse a question ID for changed meaning', qp); concepts.set(question.id, meaning);
        assert(question.evidenceRequirements.length > 0 || Boolean(question.noEvidenceReason), 'TC-09', 'A question with no evidence requirements explains why', qp);
        assert(question.assessmentCriteria.yes !== question.assessmentCriteria.no, 'TC-09', 'Yes and no criteria are not identical; their logical adequacy requires human review', qp);
        for (const parameter of Object.values(question.parameters)) {
          assert(!parameter.referenceType || parameter.type === 'URI', 'TC-10', 'Core reference parameters use URI values', qp);
          assert(!parameter.bindsTo || parameter.bindsTo === 'timeContext' || parameter.bindsTo === 'scopeOrganization' || /^subject:[^:]+$/.test(parameter.bindsTo), 'TC-10', 'Context binding names a subject, time context, or organization', qp);
        }
        checkDependencies(question, `${key}\n${question.id}`, qp);
      }
      for (const [ti, transition] of definition.transitions.entries()) {
        const tp = `${p}/content/transitions/${ti}`;
        assert(!prepared.transitionsById.has(transition.id), 'TC-05', 'Transition IDs are unique within a definition', tp); prepared.transitionsById.set(transition.id, transition);
        objectIdentity(transition.id, 'Transition', tp);
        const meaning = { source: transition.sourceQuestionId, target: transition.targetQuestionId, guard: transition.guardOutcome };
        assert(!concepts.has(transition.id) || same(concepts.get(transition.id), meaning), 'TC-05', 'Supplied versions do not reuse a transition ID for changed meaning', tp); concepts.set(transition.id, meaning);
        assert(prepared.questionsById.has(transition.sourceQuestionId) && prepared.questionsById.has(transition.targetQuestionId), 'TC-11', 'Transition endpoints exist in the same definition', tp);
        checkDependencies(transition, `${key}\n${transition.id}`, tp);
      }
      assert(new Set(definition.entryQuestionIds).size === definition.entryQuestionIds.length && definition.entryQuestionIds.every(id => prepared.questionsById.has(id)), 'TC-12', 'Entry questions are unique and exist; cycles and reconvergence are allowed', `${p}/content/entryQuestionIds`);
      add('TC-06', 'pass', `Parsed supplied artifact and calculated exact-byte SHA-256 ${digest}`, p);
    }
    const resolvePin = (pin, path) => {
      const artifact = artifacts.get(pin.artifact); const exact = definitions.get(pinKey(pin));
      if (artifact && (artifact.id !== pin.id || artifact.version !== pin.version || artifact.digest !== pin.sha256)) { add('TC-06', 'fail', 'Definition ID, version or SHA-256 does not match the supplied exact bytes', path); return null; }
      if (!exact || !artifact) {
        const omission = omitted.get(pin.id);
        if (record.completeness.exchangeScope === 'partial' && omission?.expectedType === 'Definition') add('TC-06', 'indeterminate', 'Pinned definition intentionally omitted from partial snapshot', path);
        else add('TC-33', 'fail', 'Pinned definition bytes are missing without a matching partial omission', path);
        return null;
      }
      add('TC-06', 'pass', 'Definition pin matches supplied exact UTF-8 bytes', path); return exact;
    };
    const declaredPins = new Set();
    for (const [i, pin] of record.definitionReferences.entries()) { const key = pinKey(pin); assert(!declaredPins.has(key), 'TC-05', 'Definition references are unique', `/record/definitionReferences/${i}`); declaredPins.add(key); resolvePin(pin, `/record/definitionReferences/${i}`); }
    const referencedOmissions = new Set();
    const resolve = (id, expected, path, owner) => {
      if (owner) { if (!refsByEntry.has(owner)) refsByEntry.set(owner, new Set()); refsByEntry.get(owner).add(id); }
      const target = entries.get(id); const types = Array.isArray(expected) ? expected : expected ? [expected] : typeNames;
      if (target) { if (!assert(types.includes(target.type), 'TC-04', `Reference must resolve to ${types.join(' or ')}`, path)) return null; return target; }
      const omission = omitted.get(id);
      if (record.completeness.exchangeScope === 'partial' && omission && types.includes(omission.expectedType)) { referencedOmissions.add(id); add('TC-33', 'indeterminate', `Referenced ${omission.expectedType} is intentionally omitted: ${omission.reason}`, path); if (owner) blocked.add(owner); }
      else add('TC-33', 'fail', `Unexplained dangling reference or incorrect omission type: ${id}`, path);
      return null;
    };
    const time = (value, path) => {
      if (value.status === 'bounded' || (value.start && value.end)) assert(compareTimestamps(value.start, value.end) <= 0, 'TC-08', 'Interval end does not precede its start at its declared fractional precision', path);
      if (value.status === 'open') assert(value.unknownBoundary === 'start' ? !value.start && Boolean(value.end) : !value.end && Boolean(value.start), 'TC-08', 'Open time context identifies exactly its unknown boundary', path);
    };
    const instanceDefinitions = new Map(); const unresolvedInstances = new Set();
    for (const entry of entries.values()) {
      const p = entryPaths.get(entry.id);
      const inputs = new Set((entry.relationships ?? []).filter(r => r.role !== 'derivedFrom').map(r => r.entryId));
      if (entry.type === 'Observation') entry.evidenceRefIds.forEach(id => inputs.add(id));
      if (entry.type === 'Assessment') { inputs.add(entry.targetInstanceId); entry.inputs.forEach(input => inputs.add(input.entryId)); }
      if (entry.type === 'Decision') {
        if (entry.targetInstanceId) inputs.add(entry.targetInstanceId);
        if (entry.selectedAssessmentId) inputs.add(entry.selectedAssessmentId);
        for (const id of [...entry.selectedInputIds ?? [], ...entry.policyStatus.policyRefIds ?? [], ...entry.authorityStatus.authorityRefIds ?? []]) inputs.add(id);
        for (const id of [...entry.triggeringEntryIds ?? [], ...entry.replacementEntryIds ?? []]) inputs.add(id);
      }
      if (entry.type === 'AuthorityAssertion') entry.basisReferences.forEach(id => inputs.add(id));
      if (entry.type === 'ActionRecord' && entry.decisionId) inputs.add(entry.decisionId);
      if (entry.policyBinding) inputs.add(entry.policyBinding.policyRefId);
      reasoningRefs.set(entry.id, inputs);
      if (entry.attribution.actorId) resolve(entry.attribution.actorId, 'Actor', `${p}/attribution/actorId`, entry.id);
      for (const [i, relation] of (entry.relationships ?? []).entries()) resolve(relation.entryId, null, `${p}/relationships/${i}`, entry.id);
      if (entry.eventTime) time(entry.eventTime, `${p}/eventTime`);
      if (entry.type === 'Actor' && entry.identityStatus === 'verified') {
        assert(Boolean(entry.verification), 'TC-14', 'Verified actor identity includes a stated method and evidence references', p);
        for (const id of entry.verification?.evidenceRefIds ?? []) resolve(id, 'EvidenceReference', `${p}/verification`, entry.id);
      }
      if (entry.type === 'QuestionInstance') {
        time(entry.timeContext, `${p}/timeContext`);
        const key = pinKey(entry.definitionRef); assert(declaredPins.has(key), 'TC-13', 'Instance definition is declared in the record envelope', `${p}/definitionRef`);
        const definition = resolvePin(entry.definitionRef, `${p}/definitionRef`); if (!definition) { blocked.add(entry.id); continue; }
        instanceDefinitions.set(entry.id, definition);
        const question = definition.questionsById.get(entry.questionId);
        if (!assert(Boolean(question), 'TC-13', 'Question exists in the exact pinned definition', `${p}/questionId`)) continue;
        if (blocked.has(key) || blocked.has(`${key}\n${question.id}`)) blocked.add(entry.id);
        for (const key of Object.keys(entry.parameterBindings)) assert(Object.hasOwn(question.parameters, key), 'TC-10', 'Supplied parameter is declared', `${p}/parameterBindings/${key}`);
        for (const [name, parameter] of Object.entries(question.parameters)) {
          const value = entry.parameterBindings[name]; const pp = `${p}/parameterBindings/${name}`;
          if (value === undefined) { assert(!parameter.required, 'TC-13', 'Required parameter is supplied or explicitly unresolved', pp); if (parameter.required) unresolvedInstances.add(entry.id); continue; }
          if (value && typeof value === 'object' && !Array.isArray(value) && value.status === 'unresolved') {
            assert(typeof value.reason === 'string' && value.reason.length > 0 && Object.keys(value).every(k => ['status', 'reason'].includes(k)), 'TC-13', 'Unresolved parameter has an explicit reason', pp);
            if (parameter.required) unresolvedInstances.add(entry.id); continue;
          }
          let valid = parameter.type === 'URI' ? validURI(value) : parameter.type === 'timeContext' ? validateSchema(value, { $defs: schemas.record.$defs, ...schemas.record.$defs.timeContext }).length === 0 : parameter.type === 'integer' ? Number.isSafeInteger(value) : typeof value === parameter.type;
          assert(valid, 'TC-13', `Parameter satisfies declared type ${parameter.type}`, pp);
          if (parameter.type === 'timeContext' && valid) time(value, pp);
          if (parameter.referenceType && typeof value === 'string') { resolve(value, parameter.referenceType, pp, entry.id); inputs.add(value); }
          if (parameter.bindsTo) {
            const expected = parameter.bindsTo === 'timeContext' ? entry.timeContext : parameter.bindsTo === 'scopeOrganization' ? record.scope.organization : entry.subjectBindings[parameter.bindsTo.slice('subject:'.length)];
            assert(expected !== undefined && same(value, expected), 'TC-13', 'Material parameter agrees with its explicitly bound instance context', pp);
          }
        }
        if (entry.origin.kind === 'entry') assert(definition.entryQuestionIds.includes(entry.questionId), 'TC-12', 'Entry origin names a designated entry question', `${p}/origin`);
        if (entry.origin.kind === 'transition') {
          assert(Boolean(entry.origin.originDecisionId), 'TC-13', 'Transition origin identifies a decision', `${p}/origin`);
          if (entry.origin.originDecisionId) resolve(entry.origin.originDecisionId, 'Decision', `${p}/origin/originDecisionId`, entry.id);
        } else assert(!entry.origin.originDecisionId, 'TC-13', 'Non-transition origin does not carry a transition decision', `${p}/origin`);
        if (entry.origin.kind === 'reassessmentContext') assert(Boolean(entry.origin.relatedInstanceId), 'TC-13', 'Reassessment context identifies its related instance', `${p}/origin`);
        if (entry.origin.relatedInstanceId) resolve(entry.origin.relatedInstanceId, 'QuestionInstance', `${p}/origin/relatedInstanceId`, entry.id);
      }
      if (entry.type === 'EvidenceReference') {
        assert(Boolean(entry.locator) || Boolean(entry.locatorAbsentReason), 'TC-15', 'Missing evidence locator has an explicit reason', p);
        if (entry.availability !== 'available') assert(Boolean(entry.materialAbsentReason || entry.locatorAbsentReason), 'TC-15', 'Unavailable, withheld, redacted or unknown material has an omission reason', p);
      }
      if (entry.type === 'Observation') entry.evidenceRefIds.forEach(id => resolve(id, 'EvidenceReference', `${p}/evidenceRefIds`, entry.id));
      if (entry.type === 'Hypothesis') {
        if (entry.relatedInstanceId) resolve(entry.relatedInstanceId, 'QuestionInstance', `${p}/relatedInstanceId`, entry.id);
        if (entry.relatedInvestigationId) assert(entry.relatedInvestigationId === record.investigationId, 'TC-13', 'Hypothesis investigation scope matches this record', p);
      }
      if (entry.type === 'Assessment') {
        resolve(entry.targetInstanceId, 'QuestionInstance', `${p}/targetInstanceId`, entry.id);
        assert(entry.applicability.status === 'applicable' ? Object.hasOwn(entry, 'outcome') : !Object.hasOwn(entry, 'outcome'), 'TC-18', 'Only applicable assessments have a yes, no, or unknown outcome', p);
        assert(entry.outcome !== 'unknown' || Boolean(entry.unknownReasons?.length), 'TC-20', 'Unknown outcome includes at least one explicit reason', p);
        assert(entry.outcome === 'unknown' || !entry.unknownReasons, 'TC-20', 'Unknown reasons only accompany unknown outcomes', p);
        assert(entry.inputs.length > 0 || Boolean(entry.zeroInputsReason), 'TC-19', 'Zero assessment inputs have an explicit explanation', p);
        entry.inputs.forEach(input => resolve(input.entryId, null, `${p}/inputs`, entry.id));
      }
      if (entry.policyBinding) resolve(entry.policyBinding.policyRefId, 'PolicyReference', `${p}/policyBinding/policyRefId`, entry.id);
      if (entry.type === 'PolicyReference') time(entry.effectiveTime, `${p}/effectiveTime`);
      if (entry.type === 'AuthorityAssertion') {
        resolve(entry.issuerId, 'Actor', `${p}/issuerId`, entry.id); resolve(entry.granteeId, 'Actor', `${p}/granteeId`, entry.id);
        entry.basisReferences.forEach(id => resolve(id, null, `${p}/basisReferences`, entry.id));
      }
      if (entry.type === 'Decision') {
        if (entry.targetInstanceId) resolve(entry.targetInstanceId, 'QuestionInstance', `${p}/targetInstanceId`, entry.id);
        if (entry.targetInvestigationId) assert(entry.targetInvestigationId === record.investigationId, 'TC-26', 'Decision investigation scope matches this record', p);
        if (entry.selectedAssessmentId) resolve(entry.selectedAssessmentId, 'Assessment', `${p}/selectedAssessmentId`, entry.id);
        for (const id of entry.selectedInputIds ?? []) resolve(id, null, `${p}/selectedInputIds`, entry.id);
        for (const id of entry.policyStatus.policyRefIds ?? []) resolve(id, 'PolicyReference', `${p}/policyStatus`, entry.id);
        for (const id of entry.authorityStatus.authorityRefIds ?? []) resolve(id, 'AuthorityAssertion', `${p}/authorityStatus`, entry.id);
        for (const selection of entry.selections ?? []) resolve(selection.targetInstanceId, 'QuestionInstance', `${p}/selections/targetInstanceId`, entry.id);
        if (['close', 'suspend', 'reopen'].includes(entry.disposition)) assert(Boolean(entry.targetInvestigationId) && Boolean(entry.limitations), 'TC-26', 'Case disposition declares investigation scope and known limitations (empty allowed)', p);
        if (entry.reviewedEntryIds) {
          assert(Boolean(entry.targetInvestigationId) && ['retained', 'revised', 'withdrawn', 'unresolved'].includes(entry.disposition), 'TC-28', 'Review decisions have investigation scope and a defined review disposition', p);
          if (entry.disposition === 'revised') assert(Boolean(entry.replacementEntryIds?.length), 'TC-28', 'Revised review identifies replacement entries', p);
          for (const field of ['reviewedEntryIds', 'triggeringEntryIds', 'replacementEntryIds']) for (const id of entry[field] ?? []) resolve(id, null, `${p}/${field}`, entry.id);
          assert(!entry.reviewedEntryIds.includes(entry.id), 'TC-28', 'A review does not review itself', p);
        } else assert(!entry.triggeringEntryIds && !entry.replacementEntryIds, 'TC-28', 'Review-only fields require reviewed entries', p);
      }
      if (entry.type === 'ActionRecord' && entry.decisionId) resolve(entry.decisionId, 'Decision', `${p}/decisionId`, entry.id);
      if (entry.supersedes) resolve(entry.supersedes.entryId, entry.type, `${p}/supersedes`, entry.id);
    }
    // A later instance in array order must not bypass unresolved-context checks.
    for (const entry of entries.values()) if (entry.type === 'Assessment') assert(entry.applicability.status !== 'applicable' || !unresolvedInstances.has(entry.targetInstanceId), 'TC-13', 'Applicable assessments have resolved required instance bindings', entryPaths.get(entry.id));
    // Block dependent interpretation; a required extension is never assumed false.
    if (blocked.has(record.snapshotId)) for (const id of entries.keys()) blocked.add(id);
    for (let changed = true; changed;) { changed = false; for (const [owner, refs] of refsByEntry) if (!blocked.has(owner) && [...refs].some(id => { step(); return blocked.has(id); })) { blocked.add(owner); changed = true; } }
    // A failed prerequisite is different from unavailable semantics. Preserve
    // that distinction in each transition result, not only the aggregate.
    const invalidEntries = new Set(); const invalidDefinitions = new Set(); const conflictingDefinitionPins = new Set();
    const collectInvalidPrerequisites = () => {
      for (const check of checks.filter(c => c.status === 'fail')) {
        const entryMatch = /^\/record\/entries\/(\d+)(?:\/|$)/.exec(check.path ?? '');
        if (entryMatch) invalidEntries.add(record.entries[Number(entryMatch[1])]?.id);
        const definitionMatch = /^\/definitions\/(\d+)(?:\/|$)/.exec(check.path ?? '');
        if (definitionMatch) {
          const artifact = artifacts.get(bundle.definitions[Number(definitionMatch[1])]?.path);
          if (artifact) invalidDefinitions.add(artifact.key);
        }
      }
      for (const [id, definition] of instanceDefinitions) if (invalidDefinitions.has(definition.key) || conflictingDefinitionPins.has(`${definition.id}\n${definition.version}`)) invalidEntries.add(id);
    };
    const propagateInvalid = () => {
      for (let changed = true; changed;) { changed = false; for (const [owner, refs] of refsByEntry) if (!invalidEntries.has(owner) && [...refs].some(id => { step(); return invalidEntries.has(id); })) { invalidEntries.add(owner); changed = true; } }
    };
    collectInvalidPrerequisites(); propagateInvalid();
    for (const entry of entries.values()) if (entry.type === 'Decision') {
      const p = entryPaths.get(entry.id);
      if (entry.disposition !== 'transition') { assert(!entry.selections, 'TC-22', 'Only transition decisions select graph transitions', p); continue; }
      const before = checks.length; let eligibleTransitionIds = [];
      assert(Boolean(entry.targetInstanceId && entry.selectedAssessmentId && entry.selections?.length), 'TC-22', 'Transition decision explicitly selects a source assessment and transition/target pairs', p);
      const source = entries.get(entry.targetInstanceId); const assessment = entries.get(entry.selectedAssessmentId);
      const definition = instanceDefinitions.get(source?.id);
      if (invalidEntries.has(entry.id)) add('TC-23', 'fail', 'Transition has a known-invalid prerequisite; guard interpretation cannot pass', p);
      else if (!source || source.type !== 'QuestionInstance' || !assessment || assessment.type !== 'Assessment' || !definition || blocked.has(entry.id)) add('TC-23', 'indeterminate', 'Transition depends on missing or unsupported semantics', p);
      else {
        assert(assessment.targetInstanceId === source.id && assessment.applicability.status === 'applicable', 'TC-22', 'Selected applicable assessment targets exactly the source instance', p);
        eligibleTransitionIds = [...definition.transitionsById.values()].filter(t => t.sourceQuestionId === source.questionId && t.guardOutcome === assessment.outcome && assessment.applicability.status === 'applicable').map(t => t.id);
        const pairs = new Set();
        for (const selection of entry.selections ?? []) {
          const pairKey = `${selection.transitionId}\n${selection.targetInstanceId}`;
          assert(!pairs.has(pairKey), 'TC-22', 'Selected transition/target pairs are unique', p); pairs.add(pairKey);
          const target = resolve(selection.targetInstanceId, 'QuestionInstance', `${p}/selections`, entry.id); const transition = definition.transitionsById.get(selection.transitionId);
          if (!transition) { add('TC-23', 'fail', 'Selected transition is absent from the exact source definition', p); continue; }
          if (!target || blocked.has(target.id) || blocked.has(`${definition.key}\n${transition.id}`)) { add('TC-23', 'indeterminate', 'Selected transition target or required semantics are unavailable', p); continue; }
          assert(pinKey(source.definitionRef) === pinKey(target.definitionRef), 'TC-23', 'Source and target instances pin the same exact definition artifact', p);
          assert(transition.sourceQuestionId === source.questionId && transition.targetQuestionId === target.questionId && transition.guardOutcome === assessment.outcome && assessment.applicability.status === 'applicable', 'TC-23', 'Selected transition source, target and guard match the recorded assessment', p);
          assert(target.origin.kind === 'transition' && target.origin.originDecisionId === entry.id, 'TC-23', 'Each selected target points back to this originating decision', p);
        }
      }
      const ownChecks = checks.slice(before); const status = ownChecks.some(c => c.status === 'fail') ? 'fail' : ownChecks.some(c => c.status === 'indeterminate') ? 'indeterminate' : 'pass';
      if (status === 'fail') { invalidEntries.add(entry.id); propagateInvalid(); }
      transitions.push({ decisionId: entry.id, status, eligibleTransitionIds, selectedPairs: entry.selections ?? [], match: status === 'fail' ? 'invalid' : status === 'indeterminate' ? 'indeterminate' : eligibleTransitionIds.length ? 'eligible' : 'no-match' });
    }
    for (const entry of entries.values()) if (entry.type === 'QuestionInstance' && entry.origin.kind === 'transition' && entry.origin.originDecisionId) {
      const origin = entries.get(entry.origin.originDecisionId);
      if (origin) assert(origin.type === 'Decision' && origin.disposition === 'transition' && Boolean(origin.selections?.some(pair => pair.targetInstanceId === entry.id)), 'TC-23', 'Transition-origin instance is explicitly paired by its originating decision', entryPaths.get(entry.id));
    }
    // If a dependency appears later in the serialized array, its failure must
    // also invalidate an earlier transition report. Array order is not priority.
    propagateInvalid();
    for (const transition of transitions) if (transition.status !== 'fail' && invalidEntries.has(transition.decisionId)) {
      transition.status = 'fail'; transition.match = 'invalid';
      add('TC-23', 'fail', 'Transition depends on a known-invalid recorded prerequisite', entryPaths.get(transition.decisionId));
    }
    const logicalTarget = entry => {
      switch (entry.type) {
        case 'QuestionInstance': return { definition: pinKey(entry.definitionRef), questionId: entry.questionId, subjectBindings: entry.subjectBindings, timeContext: entry.timeContext, parameterBindings: entry.parameterBindings };
        case 'Assessment': return entry.targetInstanceId;
        case 'Decision': return entry.reviewedEntryIds ? { investigation: entry.targetInvestigationId, reviewedEntryIds: entry.reviewedEntryIds } : entry.targetInstanceId ?? entry.targetInvestigationId;
        case 'Hypothesis': return { subject: entry.relatedInstanceId ?? entry.relatedInvestigationId, statement: entry.statement };
        case 'ActionRecord': return { subject: entry.operationSubject, operation: entry.operationDescription };
        case 'PolicyReference': return entry.policyIdentity;
        case 'Actor': return { kind: entry.kind, label: entry.label };
        case 'AuthorityAssertion': return { issuer: entry.issuerId, grantee: entry.granteeId, operation: entry.permittedOperation, scope: entry.scope };
        case 'Observation': return { evidence: entry.evidenceRefIds, eventTime: entry.eventTime };
        case 'EvidenceReference': return entry.source;
      }
    };
    const superseded = new Set();
    for (const entry of entries.values()) if (entry.supersedes) {
      const previous = entries.get(entry.supersedes.entryId); superseded.add(entry.supersedes.entryId);
      assert(entry.id !== entry.supersedes.entryId, 'TC-27', 'Entries cannot supersede themselves', entryPaths.get(entry.id));
      if (previous) assert(previous.type === entry.type && same(logicalTarget(previous), logicalTarget(entry)), 'TC-27', 'Revision preserves entry type and the candidate binding logical target', entryPaths.get(entry.id));
      const seen = new Set([entry.id]); let ancestor = entry.supersedes.entryId;
      while (ancestor) { step(); if (seen.has(ancestor)) { add('TC-27', 'fail', 'Supersedes graph contains a cycle', entryPaths.get(entry.id)); break; } seen.add(ancestor); ancestor = entries.get(ancestor)?.supersedes?.entryId; }
    }
    const reviewDecisions = [...entries.values()].filter(e => e.type === 'Decision' && e.reviewedEntryIds);
    collectInvalidPrerequisites(); propagateInvalid();
    const activeReviewDecisions = reviewDecisions.filter(e => !superseded.has(e.id));
    const selectedViewDecisions = new Set(record.view?.selectionDecisionIds ?? []);
    for (const id of selectedViewDecisions) resolve(id, 'Decision', '/record/view/selectionDecisionIds');
    // Carry change-event identities through the reasoning graph. A review can
    // explicitly account for an already-known correction; a later correction
    // must not be hidden by that earlier retained disposition.
    const affectedEvents = new Map();
    const addEvent = (id, eventId) => { if (!affectedEvents.has(id)) affectedEvents.set(id, new Set()); affectedEvents.get(id).add(eventId); };
    for (const entry of entries.values()) if (entry.supersedes) addEvent(entry.supersedes.entryId, entry.id);
    for (const review of activeReviewDecisions) if (['revised', 'withdrawn', 'unresolved'].includes(review.disposition)) review.reviewedEntryIds.forEach(id => addEvent(id, review.id));
    for (let changed = true; changed;) {
      changed = false;
      for (const [id, refs] of reasoningRefs) for (const ref of refs) for (const event of affectedEvents.get(ref) ?? []) {
        step();
        if (!affectedEvents.get(id)?.has(event)) { addEvent(id, event); changed = true; }
      }
    }
    const affected = new Set(affectedEvents.keys());
    const staleReviews = new Set();
    for (const review of activeReviewDecisions) {
      const coveredEvents = new Set([review.id]);
      for (const trigger of review.triggeringEntryIds ?? []) {
        let ancestor = trigger;
        while (ancestor && !coveredEvents.has(ancestor)) { step(); coveredEvents.add(ancestor); ancestor = entries.get(ancestor)?.supersedes?.entryId; }
      }
      const reviewedDependencies = new Set([...reasoningRefs.get(review.id) ?? [], ...review.reviewedEntryIds]);
      const staleBasis = [...reviewedDependencies].some(id => [...affectedEvents.get(id) ?? []].some(event => !coveredEvents.has(event)));
      if (staleBasis || blocked.has(review.id) || invalidEntries.has(review.id)) staleReviews.add(review.id);
    }
    for (const entry of entries.values()) if (['Assessment', 'Decision'].includes(entry.type) && [...reasoningRefs.get(entry.id) ?? []].some(id => affected.has(id))) {
      if (entry.reviewedEntryIds && !staleReviews.has(entry.id)) continue;
      const reviews = activeReviewDecisions.filter(r => r.reviewedEntryIds.includes(entry.id));
      const pending = !reviews.length || reviews.some(r => r.disposition === 'unresolved' || staleReviews.has(r.id));
      if (pending) unresolvedReviews.push({ entryId: entry.id, status: 'unresolved', reviewDecisionIds: reviews.map(r => r.id) });
      if (record.view?.mode === 'current') {
        const selected = reviews.filter(r => selectedViewDecisions.has(r.id));
        if (pending || !selected.length || selected.some(r => r.disposition === 'unresolved' || staleReviews.has(r.id)) || blocked.has(entry.id) || invalidEntries.has(entry.id)) add('TC-28', 'indeterminate', 'Current-view dependent conclusion lacks an explicit supported reconciliation; review remains unresolved', entryPaths.get(entry.id));
        else add('TC-28', 'pass', 'Current view names review decisions while preserving original inputs and competing reviews', entryPaths.get(entry.id));
      }
    }
    for (const [i, omission] of record.omissions.entries()) if (omission.expectedType === 'Definition') {
      assert(record.definitionReferences.some(pin => pin.id === omission.id) && ![...definitions.values()].some(d => d.id === omission.id), 'TC-33', 'Definition omission names a referenced artifact that is actually absent', `/record/omissions/${i}`);
    } else assert(referencedOmissions.has(omission.id), 'TC-33', 'Omission describes an actual referenced missing entry', `/record/omissions/${i}`);
    // Optional prior records make immutable-entry conflicts observable; unseen history is excluded.
    const comparedDefinitionPins = new Map(record.definitionReferences.map(pin => [`${pin.id}\n${pin.version}`, pin.sha256]));
    for (const [i, previous] of (options.previousRecords ?? []).entries()) {
      inspectJSON(previous, limits); const previousErrors = validateSchema(previous, schemas.record);
      if (previousErrors.length) { add('TC-07', 'fail', 'Prior comparison record is structurally invalid', `/previousRecords/${i}`); continue; }
      for (const pin of previous.definitionReferences) {
        const identity = `${pin.id}\n${pin.version}`;
        if (!assert(!comparedDefinitionPins.has(identity) || comparedDefinitionPins.get(identity) === pin.sha256, 'TC-05', 'Supplied history does not reuse a definition ID and version for different digests', `/previousRecords/${i}/definitionReferences`)) conflictingDefinitionPins.add(identity);
        comparedDefinitionPins.set(identity, pin.sha256);
      }
      const sameContent = same(previous, record);
      if (previous.snapshotId === record.snapshotId) assert(sameContent, 'TC-07', 'An existing snapshot ID is not reused for changed content', '/record/snapshotId');
      else if (previous.investigationId === record.investigationId && !sameContent) assert(record.sourceSnapshotIds?.includes(previous.snapshotId), 'TC-07', 'Derived snapshot identifies its supplied source snapshot', '/record/sourceSnapshotIds');
      for (const prior of previous.entries) if (entries.has(prior.id)) assert(same(prior, entries.get(prior.id)), 'TC-07', 'An entry identity has unchanged content across supplied snapshots', entryPaths.get(prior.id));
    }
    collectInvalidPrerequisites(); propagateInvalid();
    for (const transition of transitions) if (transition.status !== 'fail' && invalidEntries.has(transition.decisionId)) {
      transition.status = 'fail'; transition.match = 'invalid';
      add('TC-23', 'fail', 'Transition depends on a prerequisite invalidated by lineage or supplied-history checks', entryPaths.get(transition.decisionId));
    }
    add('TC-09', 'notRun', 'Natural-language proposition adequacy, evidence sufficiency and criterion exclusivity require expert review', '/definitions');
    add('TC-24', 'notRun', 'Claimed authority is preserved; receiver-local execution authorization is outside this validator', '/record');
    add('TC-38', 'notRun', 'This reference implementation alone does not establish independent interoperability', '/');
    return finish();
  } catch (error) {
    for (const transition of transitions) if (transition.status === 'pass') { transition.status = 'indeterminate'; transition.match = 'indeterminate'; }
    checks.push({ id: `input.${++sequence}`, requirement: 'TC-35', status: 'fail', message: `Validation stopped safely: ${error.message}`, path: '/' });
    return finish();
  }
}
