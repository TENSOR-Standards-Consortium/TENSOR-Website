// Authored, illustrative walkthroughs. These are definition-route demonstrations,
// not incident records, Core exchange bundles, or independently verified findings.
export const GUIDE_GRAPH_VERSION = '0.20261013a';
export const GUIDE_GRAPH_SHA256 = '4943feee2af28d414fcfd98194e63d196bee529ce8f85117aed4932d977e4d5e';
export const GUIDE_CRITERIA_SHA256 = 'e57de29a7b0edc64139d6ef5f1f9ff0447785f5cba14c388bfb954f6cb216cf6';
export const GUIDE_PROVENANCE = 'TENSOR-authored illustrative evidence and assessments; no real incident data. Steps are presentation order, not event-time chronology. These guides demonstrate the working graph, not Core record conformance or investigation effectiveness.';
const step = (questionId, outcome, title, evidence, rationale, limitation) => ({ questionId, outcome, title, evidence, rationale, limitation });
export const GUIDES = [
  {
    id: 'agent-request', title: 'An agent crosses a data boundary', domain: 'Application',
    description: 'A tool request, a technical content test, and a qualified handoff.',
    context: 'Application: assistant-gateway. Request: report upload, tool export_report, destination external.example. Interval: 09:00–09:10 UTC on the example day. Hypothesis: this request contained a restricted report addressed outside the declared internal destination set. This technical criterion is separate from authorization or malicious intent.',
    steps: [
      step('Q6','yes','A tool request appears','E01 · The report-upload gateway trace records export_report with the restricted report and destination external.example at 09:04 UTC.','The examined trace matches the application, request ID and interval.','A request record does not establish successful delivery.'),
      step('Q85','yes','Validate the trace','E02 · Collector receipt binds E01 to gateway instance the examined gateway instance; the retained export digest matches the receipt. The parser maps request fields without a material contradiction.','The authored provenance and interpretation basis supports this request record.','This example does not independently validate a production collector.'),
      step('Q190','yes','Test the named hypothesis','E03 · Retained payload identifies the restricted report as restricted; the destination allowlist snapshot contains only internal.example. external.example is outside that set.','The request satisfies the declared restricted-report / external-destination criterion. A redacted payload alternative was evaluated and contradicted by the retained body.','No policy violation, harmful intent or agent autonomy is inferred.'),
      step('Q279','yes','Bound the investigation','E04 · Scope worksheet includes the report-upload request, the restricted report and the examined gateway instance for 09:00–09:10; excludes separately evidenced the separate internal request. Other gateway instances are marked unexamined.','Entity inclusions, exclusions and unknown scope have an explicit evidence basis.','This does not establish population-wide completeness.'),
      step('Q345','unknown','Delivery remains uncertain','E05 · The only destination receipt is a copy of the gateway trace. No independently originating destination observation is retained.','A copied request identifier cannot support the named relationship: the report-upload request caused receipt of the restricted report at the destination.','Continue with the relationship unknown; do not claim exfiltration.'),
      step('Q430','unknown','Keep source attribution open','E06 · A session label says the named investigation agent, but the session-to-process discriminator and competing human replay explanation are unresolved.','The named technical source, the named agent runtime, is not established by an authenticated discriminator.','No human identity, organization or intent is attributed.'),
      step('Q509','no','Measure the observed effect','E07 · Comparable gateway accepted-export counters read 12 before and 12 after the interval; same instance, sampling method and units (accepted exports).','The named metric change is zero on these observations.','This does not rule out other paths, later delivery or other effects.'),
      step('Q563','yes','Hand off qualified findings','E08 · Review index retains E01–E07, the supported request hypothesis, bounded scope, unknown delivery/source, unchanged metric and all limitations.','The separate assessments and their negative and unknown outcomes are retained for review.','A qualified handoff is not case closure or authorization to take action.'),
    ],
  },
  {
    id: 'identity-session', title: 'A session beyond its expected boundary', domain: 'Identity',
    description: 'An audience-mismatch finding with separate relationship, source, and impact assessments.',
    context: 'Principal: svc-report. Action: token exchange the examined token exchange. Interval: 14:00–14:15 UTC on the example day. Hypothesis: the issued token audience differs from the explicitly declared reporting-service audience. Scope is one exchange; intent and authorization are separate questions.',
    steps: [
      step('Q1','yes','Find the exchange','I01 · Identity audit record the examined token exchange names svc-report, token exchange and 14:06 UTC.','The record matches every bound subject field and the interval.','Other exchanges are outside this initial observation.'),
      step('Q155','yes','Check origin and meaning','I02 · A retained collector receipt and export digest bind I01 to the issuer audit stream; the documented event code means an issued token.','The primary record has an acceptable provenance and interpretation basis without a material unresolved conflict.','The example receipt is illustrative, not a live issuer attestation.'),
      step('Q233','yes','Apply a falsifiable test','I03 · The recorded audience is files-api; the bound reporting-service audience is reports-api. A documented alias explanation was examined and rejected by the audience registry.','The validated exchange satisfies the audience-mismatch criterion.','An unexpected audience is not by itself proof of compromise.'),
      step('Q253','yes','Record scope and gaps','I04 · Scope includes svc-report and the examined token exchange for the stated interval; a separate exchange the earlier token exchange is excluded by its principal. Other issuer regions remain unknown.','The scope basis retains explicit inclusions, exclusions and unexamined regions.','No tenant-wide completeness claim is made.'),
      step('Q379','no','Reject a proposed relationship','I05 · An independently collected resource access record predates token issuance and names the earlier token exchange rather than the examined token exchange.','The chronology and exchange discriminator contradict the named relation: the examined token exchange enabled this particular resource access.','This refutes only that relationship, not all resource access.'),
      step('Q425','unknown','Leave the source unresolved','I06 · The presented client label is shared by multiple runtimes; no discriminating process binding is retained.','The named source criterion cannot distinguish runtime the reporting runner from a replaying client.','A client label does not identify a person or establish intent.'),
      step('Q492','unknown','Avoid inventing impact','I07 · The post-interval access count is 6 requests, but the baseline is missing and sampling coverage is unknown.','A comparable metric change cannot be assessed without a baseline and coverage basis.','Neither zero impact nor a realized loss is claimed.'),
      step('Q558','yes','Preserve a reviewable handoff','I08 · Review index retains the audience test, scope, refuted relationship, unresolved source/effect and I01–I07.','Required independent assessments, negative answers and uncertainty are retained.','The investigation may remain open.'),
    ],
  },
  {
    id: 'host-alternative', title: 'Host event and refuted hypothesis', domain: 'Host',
    description: 'A negative classification preserves the event and rejects only the tested explanation.',
    context: 'Host: the finance workstation. Process: the observed process instance. Interval: 02:00–02:05 UTC on the example day. Hypothesis: the observed process executed outside the declared maintenance window (02:00–02:10 UTC).',
    steps: [
      step('Q2','yes','Observe process execution','H01 · Endpoint event names the finance workstation and the observed process starting at 02:02 UTC.','The examined record matches the process, host and interval.','A process name alone does not establish malicious behavior.'),
      step('Q156','yes','Validate the execution record','H02 · Endpoint export digest matches its retained collection receipt; start-event semantics and UTC conversion are documented.','Provenance and interpretation support the bound execution with no unresolved material contradiction.','This is an authored example of the required basis.'),
      step('Q214','no','Test and refute the explanation','H03 · The retained schedule defines 02:00–02:10 UTC; 02:02 UTC falls inside it. A timezone-offset alternative is contradicted by the documented UTC configuration.','The discriminating evidence contradicts the exact outside-window criterion.','Being inside a window does not establish authorization or overall benignness.'),
      step('Q604','yes','Retain the refutation','H04 · The review retains H01–H03, the execution event and the no assessment of the outside-window hypothesis.','The refutation basis is preserved without substituting another hypothesis as true.','This route ends; other explanations remain open.'),
    ],
  },
  {
    id: 'cloud-gap', title: 'Cloud audit collection gap', domain: 'Cloud',
    description: 'Missing records lead to an unresolved handoff, not a declaration that nothing happened.',
    context: 'Resource: the reporting bucket. Operation: change access policy. Interval: 11:00–11:20 UTC on the example day. The primary audit export has a documented collection interruption. No exclusion claim is made.',
    steps: [
      step('Q4','unknown','The primary audit is incomplete','C01 · Collection receipt reports a gap from 11:08–11:15 UTC within the bound interval.','The primary material cannot be searched completely for the bound operation and resource.','No event absence can be inferred from incomplete logging.'),
      step('Q11','no','Search the independent material','C02 · A completed search of available separately originating inventory snapshots finds no matching operation record. Snapshots describe state at 11:00 and 11:20 only.','No independent matching record was found in the examined material; its coverage limits are recorded.','Snapshots cannot exclude an operation between observations.'),
      step('Q599','yes','Stop with uncertainty intact','C03 · The review retains the collection interruption and snapshot limitations with the same resource, operation and interval.','These material gaps prevent resolution of the event proposition.','No permission change, absence of change or case closure is asserted.'),
    ],
  },
];

export function guideState(graph, guide, index, visibility = 'all') {
  const through = Math.max(0, Math.min(guide.steps.length - 1, index));
  const prefix = guide.steps.slice(0, through + 1);
  const currentId = prefix.at(-1).questionId;
  const visitedIds = prefix.map(s => s.questionId);
  const nextEdges = graph.edges.filter(e => e.source === currentId);
  const nextIds = [...new Set(nextEdges.map(e => e.target))];
  const selectedEdges = prefix.slice(0, -1).map((s, i) => {
    const id=`${s.questionId}-${s.outcome}-${prefix[i+1].questionId}`;
    const edge=graph.edges.find(e=>e.id===id);
    if(!edge)throw new Error('The authored continuation is not present in the pinned graph.');
    return edge;
  });
  return { currentId, visitedIds, nextIds, selectedEdges, visibleIds: visibility === 'path' ? [...new Set([...visitedIds, ...nextIds])] : null };
}

export function readGuideState(search, guides = GUIDES) {
  const params = new URLSearchParams(search);
  const guide = guides.find(g => g.id === params.get('investigation'));
  const raw = Number(params.get('step') || 0);
  return {
    renderer: params.get('renderer') === '3d' ? '3d' : 'atlas',
    guideId: guide?.id || null,
    step: guide && Number.isInteger(raw) ? Math.max(0, Math.min(guide.steps.length - 1, raw)) : 0,
    visibility: params.get('context') === 'path' ? 'path' : 'all',
  };
}
