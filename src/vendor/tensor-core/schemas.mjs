// Single source for the published JSON Schemas and the portable validator.
export const BINDING_VERSION = '0.1.0-draft.1';
const str = { type: 'string', minLength: 1 };
const uri = { ...str, format: 'uri' };
const timestamp = { ...str, format: 'date-time' };
const bool = { type: 'boolean' };
const enumOf = (...values) => ({ enum: values });
const arr = (items, minItems = 0) => ({ type: 'array', items, minItems });
const obj = (properties, required = Object.keys(properties), extras = {}) => ({ type: 'object', properties, required, additionalProperties: false, ...extras });
const either = (...schemas) => ({ oneOf: schemas });
const optionalMeta = { metadata: { type: 'object' }, extensions: arr({ $ref: '#/$defs/extension' }) };
const withMeta = (properties, required) => obj({ ...properties, ...optionalMeta }, required ?? Object.keys(properties));
const ref = name => ({ $ref: `#/$defs/${name}` });
const refIds = arr(uri);
const nonemptyRefs = arr(uri, 1);
const timeContext = either(
  obj({ status: { const: 'bounded' }, start: timestamp, end: timestamp, precision: str }, ['status', 'start', 'end']),
  obj({ status: { const: 'open' }, start: timestamp, end: timestamp, unknownBoundary: enumOf('start', 'end'), reason: str, precision: str }, ['status', 'unknownBoundary', 'reason']),
  obj({ status: { const: 'unknown' }, reason: str })
);
const eventTime = { anyOf: [timeContext, obj({ status: { const: 'known' }, at: timestamp, precision: str }, ['status', 'at'])] };
const statusReference = name => either(
  obj({ status: { const: 'referenced' }, [name]: nonemptyRefs }),
  obj({ status: { const: 'unknown' }, reason: str }),
  obj({ status: { const: 'notApplicable' } })
);
const contractRef = obj({ proposal: { const: '0.1.0' }, bindingVersion: { const: BINDING_VERSION }, status: { const: 'candidate; unratified' } });
const definitionRef = obj({ id: uri, version: str, sha256: { type: 'string', pattern: '^[0-9a-f]{64}$' }, artifact: str });
const dependency = obj({ id: uri, version: str, kind: enumOf('profile', 'extension'), requiredForInterpretation: bool });
const extension = obj({ namespace: uri, version: str, requiredForInterpretation: bool, data: { type: 'object' } });
const relationship = obj({ entryId: uri, role: enumOf('supports', 'contradicts', 'derivedFrom', 'selectedFor', 'context'), reason: str }, ['entryId', 'role']);
const defs = { extension, dependency, contractRef, definitionRef, timeContext, eventTime, relationship };
const pin = ref('definitionRef');
const base = {
  id: uri, type: str, recordedAt: timestamp,
  attribution: either(obj({ actorId: uri }), obj({ status: { const: 'unknown' }, reason: str })),
  supersedes: obj({ entryId: uri, reason: str }),
  relationships: arr(ref('relationship')),
  ...optionalMeta
};
function entry(type, properties, required, extras = {}) {
  return obj({ ...base, ...properties, type: { const: type } }, ['id', 'type', 'recordedAt', 'attribution', ...required], extras);
}
const commonDecision = {
  targetInstanceId: uri, targetInvestigationId: uri, selectedAssessmentId: uri, selectedInputIds: refIds,
  disposition: str, rationale: str, policyStatus: statusReference('policyRefIds'), authorityStatus: statusReference('authorityRefIds'),
  selections: arr(obj({ transitionId: uri, targetInstanceId: uri }), 1),
  reviewedEntryIds: nonemptyRefs, triggeringEntryIds: refIds, replacementEntryIds: nonemptyRefs, limitations: arr(str),
  policyBinding: obj({ policyRefId: uri, parameterBindings: { type: 'object' } })
};
const entries = [
  entry('Actor', { kind: enumOf('human', 'agent', 'system', 'unknown'), label: str, identityStatus: enumOf('selfDeclared', 'asserted', 'verified', 'unknown'), identitySource: str, verification: obj({ method: str, evidenceRefIds: nonemptyRefs }), configurationContext: str }, ['kind', 'label', 'identityStatus']),
  entry('QuestionInstance', { definitionRef: pin, questionId: uri, subjectBindings: { type: 'object', minProperties: 1, additionalProperties: uri }, timeContext: ref('timeContext'), parameterBindings: { type: 'object' }, origin: obj({ kind: enumOf('entry', 'newLead', 'transition', 'reassessmentContext'), rationale: str, originDecisionId: uri, relatedInstanceId: uri }, ['kind', 'rationale']) }, ['definitionRef', 'questionId', 'subjectBindings', 'timeContext', 'parameterBindings', 'origin']),
  entry('EvidenceReference', { description: str, source: obj({ label: str, provenanceStatus: str, sourceId: uri }, ['label', 'provenanceStatus']), availability: enumOf('available', 'unavailable', 'withheld', 'redacted', 'unknown'), locator: uri, locatorAbsentReason: str, materialAbsentReason: str, accessRestrictions: str, integrity: obj({ algorithm: str, digest: str, coveredMaterial: str }) }, ['description', 'source', 'availability'], { anyOf: [{ required: ['locator'] }, { required: ['locatorAbsentReason'] }] }),
  entry('Observation', { statement: str, evidenceRefIds: nonemptyRefs, method: str, eventTime: ref('eventTime'), independentlyVerified: bool }, ['statement', 'evidenceRefIds', 'method', 'eventTime']),
  entry('Hypothesis', { statement: str, relatedInstanceId: uri, relatedInvestigationId: uri, status: enumOf('proposed', 'retained', 'rejected', 'unresolved') }, ['statement', 'status'], { oneOf: [{ required: ['relatedInstanceId'], not: { required: ['relatedInvestigationId'] } }, { required: ['relatedInvestigationId'], not: { required: ['relatedInstanceId'] } }] }),
  entry('Assessment', { targetInstanceId: uri, applicability: obj({ status: enumOf('applicable', 'notApplicable', 'unresolved'), rationale: str }), outcome: enumOf('yes', 'no', 'unknown'), rationale: str, inputs: arr(obj({ entryId: uri, role: enumOf('supports', 'contradicts', 'context') })), zeroInputsReason: str, method: str, unknownReasons: arr(obj({ code: enumOf('notCollected', 'unavailable', 'withheld', 'conflicting', 'insufficient', 'unsupported', 'other'), explanation: str }, ['code', 'explanation']), 1), confidence: obj({ scale: str, value: { anyOf: [{ type: 'number' }, str] }, method: str, interpretation: str }), policyBinding: obj({ policyRefId: uri, parameterBindings: { type: 'object' } }) }, ['targetInstanceId', 'applicability', 'rationale', 'inputs', 'method']),
  entry('Decision', commonDecision, ['disposition', 'rationale', 'policyStatus', 'authorityStatus'], { oneOf: [{ required: ['targetInstanceId'], not: { required: ['targetInvestigationId'] } }, { required: ['targetInvestigationId'], not: { required: ['targetInstanceId'] } }], anyOf: [{ required: ['selectedAssessmentId'] }, { required: ['selectedInputIds'] }] }),
  entry('ActionRecord', { operationDescription: str, operationSubject: uri, stage: enumOf('planned', 'requested', 'attempted', 'completed', 'failed', 'unknown'), decisionId: uri, decisionAbsentReason: str, eventTime: ref('eventTime'), result: str }, ['operationDescription', 'operationSubject', 'stage', 'eventTime'], { anyOf: [{ required: ['decisionId'] }, { required: ['decisionAbsentReason'] }] }),
  entry('PolicyReference', { policyIdentity: uri, version: str, effectiveTime: either(obj({ status: { const: 'known' }, start: timestamp, end: timestamp }, ['status', 'start']), obj({ status: { const: 'unknown' }, reason: str })), applicableScope: str, locator: uri, locatorAbsentReason: str, conditions: str }, ['policyIdentity', 'version', 'effectiveTime', 'applicableScope'], { anyOf: [{ required: ['locator'] }, { required: ['locatorAbsentReason'] }] }),
  entry('AuthorityAssertion', { issuerId: uri, granteeId: uri, permittedOperation: str, scope: str, validityStatus: obj({ status: enumOf('claimedValid', 'claimedInvalid', 'unknown'), reason: str }), basisReferences: refIds, receiverLocalVerification: { const: 'notPerformed' } }, ['issuerId', 'granteeId', 'permittedOperation', 'scope', 'validityStatus', 'basisReferences', 'receiverLocalVerification'])
];
const parameter = obj({ type: enumOf('URI', 'string', 'number', 'integer', 'boolean', 'timeContext'), required: bool, bindsTo: str, referenceType: enumOf(...entries.map(e => e.properties.type.const)) }, ['type', 'required']);
const question = withMeta({ id: uri, prompt: str, proposition: str, parameters: { type: 'object', additionalProperties: parameter }, applicabilityCriteria: str, assessmentCriteria: obj({ yes: str, no: str, unknown: str }), evidenceRequirements: arr(str), noEvidenceReason: str }, ['id', 'prompt', 'proposition', 'parameters', 'applicabilityCriteria', 'assessmentCriteria', 'evidenceRequirements']);
const transition = withMeta({ id: uri, sourceQuestionId: uri, targetQuestionId: uri, guardOutcome: enumOf('yes', 'no', 'unknown') });
const metaSchema = 'https://json-schema.org/draft/2020-12/schema';
const schema = (name, body) => ({ $schema: metaSchema, $id: `https://tensor-website.pages.dev/core/${BINDING_VERSION}/schemas/${name}.schema.json`, title: `TENSOR candidate ${name} ${BINDING_VERSION}`, ...body, $defs: defs });
export const definitionSchema = schema('definition', withMeta({ id: uri, version: str, publicationStatus: enumOf('draft', 'candidate', 'stable', 'deprecated'), title: str, contractRef: ref('contractRef'), questions: arr(question, 1), transitions: arr(transition), entryQuestionIds: nonemptyRefs, dependencies: arr(ref('dependency')) }));
export const recordSchema = schema('record', withMeta({ snapshotId: uri, investigationId: uri, contractRef: ref('contractRef'), producer: obj({ label: str, version: str, implementationStatus: str }, ['label', 'version']), recordedAt: timestamp, scope: obj({ purpose: str, subjectBoundary: nonemptyRefs, organization: uri }, ['purpose', 'subjectBoundary']), definitionReferences: arr(pin), dependencies: arr(ref('dependency')), entries: arr({ oneOf: entries }), completeness: obj({ exchangeScope: enumOf('full', 'partial'), meaning: str }, ['exchangeScope']), omissions: arr(obj({ id: uri, expectedType: enumOf('Definition', ...entries.map(e => e.properties.type.const)), reason: str, effect: str })), losses: arr(obj({ affectedIds: nonemptyRefs, mappingVersion: str, explanation: str })), sourceSnapshotIds: refIds, view: obj({ mode: enumOf('historical', 'current'), selectionDecisionIds: refIds }, ['mode']) }, ['snapshotId', 'investigationId', 'contractRef', 'producer', 'recordedAt', 'scope', 'definitionReferences', 'dependencies', 'entries', 'completeness', 'omissions', 'losses']));
export const bundleSchema = schema('bundle', obj({ format: { const: 'tensor-investigation-bundle' }, bindingVersion: { const: BINDING_VERSION }, record: { type: 'object' }, definitions: arr(obj({ path: str, content: str })), metadata: { type: 'object' } }, ['format', 'bindingVersion', 'record', 'definitions']));
export const schemas = { bundle: bundleSchema, record: recordSchema, definition: definitionSchema };
