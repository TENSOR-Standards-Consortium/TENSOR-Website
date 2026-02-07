export type LabMode = 'mission' | 'walkthrough';

export type DecisionOutcome = 'yes' | 'no' | 'unknown';

export interface ScenarioFrame {
  id: string;
  time: string;
  artifact: string;
  analystNote: string;
  evidenceSnippet: string;
}

export interface QuestionOption {
  id: string;
  label: string;
  outcome: DecisionOutcome;
  rationale: string;
  falsePositiveRisk?: boolean;
}

export interface QuestionStep {
  id: string;
  nodeId: string;
  prompt: string;
  options: QuestionOption[];
  expectedOutcome: DecisionOutcome;
  explanation: string;
  hint: string;
  pausePrompt: string;
  traditionalPlaybookRisk: string;
  graphBranchBenefit: string;
}

export interface CollaborationAction {
  id: string;
  stepId: string;
  actor: 'human' | 'agent';
  actionType: string;
  rationale: string;
  confidence: number;
  whyThisLead: string;
  isOverride?: boolean;
}

export interface InvestigationScenario {
  id: string;
  title: string;
  summary: string;
  objective: string;
  frames: ScenarioFrame[];
  questions: QuestionStep[];
  collaboration: CollaborationAction[];
}

export const DEFAULT_SCENARIO_ID = 'identity-session-takeover';

export const INVESTIGATION_SCENARIOS: InvestigationScenario[] = [
  {
    id: DEFAULT_SCENARIO_ID,
    title: 'Suspicious Identity and Session Abuse',
    summary:
      'Reference scenario showing how graph-native questioning keeps investigators aligned while agents accelerate triage.',
    objective:
      'Determine whether this is isolated credential misuse or coordinated takeover activity, while minimizing false-positive containment.',
    frames: [
      {
        id: 'frame-1',
        time: '09:02',
        artifact: 'SIEM identity alert',
        analystNote: 'Impossible travel and first-seen device fingerprint fired on a privileged user.',
        evidenceSnippet: 'Geo delta 4,200 miles in 18 minutes; user agent changed to unmanaged browser.',
      },
      {
        id: 'frame-2',
        time: '09:06',
        artifact: 'IdP session telemetry',
        analystNote: 'Token reuse appears outside expected MFA-binding profile.',
        evidenceSnippet: 'Refresh token minted with prior claim set but new ASN and no compliant device attestation.',
      },
      {
        id: 'frame-3',
        time: '09:11',
        artifact: 'Agent enrichment pass',
        analystNote: 'Agent found a matching pattern in two low-privilege users from the same network block.',
        evidenceSnippet: 'Shared ASN and cookie replay fingerprints across users U-8821 and U-9014.',
      },
      {
        id: 'frame-4',
        time: '09:15',
        artifact: 'Containment checkpoint',
        analystNote: 'Human analyst rejects full account disable and applies scoped session invalidation.',
        evidenceSnippet: 'Business travel confirmed for executive account; broad disable would disrupt incident response bridge.',
      },
      {
        id: 'frame-5',
        time: '09:19',
        artifact: 'Hunt expansion decision',
        analystNote: 'Evidence reaches threshold for coordinated takeover hunt and vendor-portable response path.',
        evidenceSnippet: 'Three tenants show correlated token replay behavior over 12-minute window.',
      },
    ],
    questions: [
      {
        id: 'step-1',
        nodeId: 'Q12',
        prompt: 'Do identity and device signals support suspicious session origination?',
        expectedOutcome: 'yes',
        explanation:
          'The graph path expects "yes" only when identity and endpoint context align. This prevents one-alert pivots from driving premature containment.',
        hint: 'Look for combined evidence: impossible travel plus first-seen unmanaged device.',
        pausePrompt: 'Pause: Would you open an investigation branch now, or wait for more evidence?',
        traditionalPlaybookRisk:
          'Linear playbooks often branch on a single impossible-travel alert and can over-trigger emergency controls.',
        graphBranchBenefit:
          'Graph semantics force multi-signal validation before moving to higher-impact actions.',
        options: [
          {
            id: 'step-1-yes',
            label: 'Yes, correlated identity + device anomalies indicate suspicious session origination.',
            outcome: 'yes',
            rationale: 'Correlated evidence meets threshold for investigation branch activation.',
          },
          {
            id: 'step-1-no',
            label: 'No, impossible travel alone is enough and no further triage is needed.',
            outcome: 'no',
            rationale: 'Rejects relevant endpoint context and misses supporting evidence.',
            falsePositiveRisk: true,
          },
          {
            id: 'step-1-unknown',
            label: 'Unknown until manual ticket review is complete.',
            outcome: 'unknown',
            rationale: 'Defers decision despite already available corroborating telemetry.',
          },
        ],
      },
      {
        id: 'step-2',
        nodeId: 'Q19',
        prompt: 'Does token issuance behavior remain consistent with verified MFA and device binding?',
        expectedOutcome: 'no',
        explanation:
          'A "no" outcome here is critical. It indicates compromised session continuity and supports controlled containment without assuming full account compromise.',
        hint: 'Compare token claim continuity against MFA-binding and attested device posture.',
        pausePrompt: 'Pause: Is this a full account compromise, or a session-level compromise first?',
        traditionalPlaybookRisk:
          'Traditional workflows frequently collapse session and identity compromise into one bucket, inflating blast-radius decisions.',
        graphBranchBenefit:
          'The graph separates session-abuse and identity-abuse branches so containment can be proportional.',
        options: [
          {
            id: 'step-2-yes',
            label: 'Yes, token claims still match expected MFA-bound context.',
            outcome: 'yes',
            rationale: 'Conflicts with observed ASN and attestation drift.',
          },
          {
            id: 'step-2-no',
            label: 'No, token continuity broke from MFA/device constraints.',
            outcome: 'no',
            rationale: 'Supports session abuse branch while preserving evidence for escalation.',
          },
          {
            id: 'step-2-unknown',
            label: 'Unknown, because MFA logs are delayed.',
            outcome: 'unknown',
            rationale: 'Reasonable fallback if controls are blind, but current data is sufficient.',
          },
        ],
      },
      {
        id: 'step-3',
        nodeId: 'Q27',
        prompt: 'Is there sufficient evidence of privilege escalation tied to the reused session?',
        expectedOutcome: 'unknown',
        explanation:
          'Using "unknown" keeps uncertainty explicit while the hunt expands. This avoids forcing binary outcomes when escalation evidence is incomplete.',
        hint: 'Distinguish suspicious access from confirmed privilege escalation.',
        pausePrompt: 'Pause: Should you mark this as confirmed escalation now, or preserve uncertainty?',
        traditionalPlaybookRisk:
          'Linear playbooks often force yes/no escalation decisions too early, leading to noisy executive incidents.',
        graphBranchBenefit:
          'Graph paths preserve uncertainty with unknown transitions, enabling controlled data gathering.',
        options: [
          {
            id: 'step-3-yes',
            label: 'Yes, treat this as confirmed privilege escalation immediately.',
            outcome: 'yes',
            rationale: 'Escalates severity before host and entitlement evidence is complete.',
            falsePositiveRisk: true,
          },
          {
            id: 'step-3-no',
            label: 'No, there is clearly no escalation risk.',
            outcome: 'no',
            rationale: 'Dismisses meaningful weak signals and can delay response.',
          },
          {
            id: 'step-3-unknown',
            label: 'Unknown, retain uncertainty and gather host/entitlement evidence.',
            outcome: 'unknown',
            rationale: 'Keeps control flow deterministic without overcommitting.',
          },
        ],
      },
      {
        id: 'step-4',
        nodeId: 'Q33',
        prompt: 'Should containment disable every privileged account in scope right now?',
        expectedOutcome: 'no',
        explanation:
          'The preferred answer is "no" because broad disablement causes avoidable business impact when scoped containment is still effective.',
        hint: 'Check whether targeted session invalidation plus watchlist controls reduce risk sufficiently.',
        pausePrompt: 'Pause: Would broad account disablement reduce risk enough to justify operational impact?',
        traditionalPlaybookRisk:
          'Single-lane playbooks push blanket account disablement when severity rises, even if precision controls are available.',
        graphBranchBenefit:
          'Graph branching supports proportional containment tied to current evidence and explicit uncertainty.',
        options: [
          {
            id: 'step-4-yes',
            label: 'Yes, disable all privileged accounts immediately to be safe.',
            outcome: 'yes',
            rationale: 'High-friction action with high false-positive blast radius.',
            falsePositiveRisk: true,
          },
          {
            id: 'step-4-no',
            label: 'No, perform scoped session invalidation and continue controlled monitoring.',
            outcome: 'no',
            rationale: 'Balances containment effectiveness with operational continuity.',
          },
          {
            id: 'step-4-unknown',
            label: 'Unknown, postpone all containment actions until complete certainty.',
            outcome: 'unknown',
            rationale: 'Creates unnecessary response delay under active abuse conditions.',
          },
        ],
      },
      {
        id: 'step-5',
        nodeId: 'Q41',
        prompt: 'Do correlated indicators justify expanding this to a coordinated takeover hunt?',
        expectedOutcome: 'yes',
        explanation:
          'A "yes" outcome transitions from isolated triage to multi-account hunt while keeping traceability and vendor-portable graph semantics.',
        hint: 'Look for repeated token replay patterns and shared infrastructure across accounts.',
        pausePrompt: 'Pause: Is this isolated to one account, or does the evidence support coordinated activity?',
        traditionalPlaybookRisk:
          'Traditional flows often close incidents after immediate containment, missing campaign-level patterns.',
        graphBranchBenefit:
          'Graph-linked questions preserve investigative continuity and make multi-vendor hunt execution repeatable.',
        options: [
          {
            id: 'step-5-yes',
            label: 'Yes, expand to coordinated takeover hunt and preserve the graph path as evidence.',
            outcome: 'yes',
            rationale: 'Supports campaign-level response while preserving deterministic auditability.',
          },
          {
            id: 'step-5-no',
            label: 'No, close as an isolated anomaly after local containment.',
            outcome: 'no',
            rationale: 'Can miss lateral spread patterns and recurrence.',
          },
          {
            id: 'step-5-unknown',
            label: 'Unknown, defer hunt expansion until next business day.',
            outcome: 'unknown',
            rationale: 'Introduces avoidable detection latency for correlated activity.',
          },
        ],
      },
    ],
    collaboration: [
      {
        id: 'act-1a',
        stepId: 'step-1',
        actor: 'agent',
        actionType: 'Correlated identity alerts',
        rationale: 'Clustered impossible-travel and first-seen-device signals into one investigation candidate.',
        confidence: 0.91,
        whyThisLead: 'Cross-source correlation reduced noisy alert volume and prioritized high-signal evidence.',
      },
      {
        id: 'act-1b',
        stepId: 'step-1',
        actor: 'human',
        actionType: 'Validated business context',
        rationale: 'Confirmed executive travel status and kept investigation open based on unmanaged browser telemetry.',
        confidence: 0.84,
        whyThisLead: 'Human context prevented premature closure without blocking the investigation path.',
      },
      {
        id: 'act-2a',
        stepId: 'step-2',
        actor: 'agent',
        actionType: 'Checked token/MFA continuity',
        rationale: 'Compared token claims with MFA-binding metadata and flagged continuity mismatch.',
        confidence: 0.94,
        whyThisLead: 'Session abuse indicators became explicit before identity-wide containment actions.',
      },
      {
        id: 'act-2b',
        stepId: 'step-2',
        actor: 'human',
        actionType: 'Required second-source confirmation',
        rationale: 'Confirmed IdP evidence quality before approving branch transition.',
        confidence: 0.88,
        whyThisLead: 'Human verification preserved audit confidence and reduced model overreach risk.',
      },
      {
        id: 'act-3a',
        stepId: 'step-3',
        actor: 'agent',
        actionType: 'Proposed escalation to confirmed takeover',
        rationale: 'Agent suggested immediate escalation from correlated behavior across users.',
        confidence: 0.76,
        whyThisLead: 'Pattern similarity suggested possible campaign behavior, but certainty remained incomplete.',
      },
      {
        id: 'act-3b',
        stepId: 'step-3',
        actor: 'human',
        actionType: 'Overrode to explicit unknown',
        rationale: 'Analyst preserved uncertainty pending host and entitlement evidence.',
        confidence: 0.72,
        whyThisLead: 'Unknown branch kept flow deterministic without forcing premature yes/no commitment.',
        isOverride: true,
      },
      {
        id: 'act-4a',
        stepId: 'step-4',
        actor: 'agent',
        actionType: 'Recommended broad account disablement',
        rationale: 'Agent prioritized maximum immediate risk reduction under uncertainty.',
        confidence: 0.67,
        whyThisLead: 'High-severity heuristics favored blanket containment, but with large operational impact.',
      },
      {
        id: 'act-4b',
        stepId: 'step-4',
        actor: 'human',
        actionType: 'Applied scoped containment instead',
        rationale: 'Used targeted session invalidation and enhanced monitoring to avoid false-positive disruption.',
        confidence: 0.89,
        whyThisLead: 'Preserved operational continuity while maintaining measurable risk reduction.',
        isOverride: true,
      },
      {
        id: 'act-5a',
        stepId: 'step-5',
        actor: 'agent',
        actionType: 'Identified campaign pattern',
        rationale: 'Linked replay indicators across accounts and tenants into a coordinated-hunt recommendation.',
        confidence: 0.9,
        whyThisLead: 'Multi-account correlation justified transition from incident triage to campaign response.',
      },
      {
        id: 'act-5b',
        stepId: 'step-5',
        actor: 'human',
        actionType: 'Approved vendor-portable hunt path',
        rationale: 'Committed the investigation trace to the shared graph path and opened cross-vendor execution.',
        confidence: 0.93,
        whyThisLead: 'Decision trace can be replayed consistently across SIEM/SOAR/vendor implementations.',
      },
    ],
  },
];

export function getInvestigationScenario(scenarioId?: string): InvestigationScenario {
  const requestedId = typeof scenarioId === 'string' ? scenarioId.trim() : '';
  const match = INVESTIGATION_SCENARIOS.find((scenario) => scenario.id === requestedId);
  return match || INVESTIGATION_SCENARIOS[0];
}
