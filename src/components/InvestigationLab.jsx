import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_SCENARIO_ID, getInvestigationScenario } from '../data/investigationLabScenario';

const AUTO_ADVANCE_MS = 9000;

function sanitizeMode(value) {
  return value === 'walkthrough' ? 'walkthrough' : 'mission';
}

function formatConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 'n/a';
  }

  return `${Math.round(numeric * 100)}%`;
}

function describeOutcome(outcome) {
  if (outcome === 'yes') {
    return 'Yes';
  }
  if (outcome === 'no') {
    return 'No';
  }
  return 'Unknown';
}

function scoreBand(value) {
  if (value >= 85) {
    return 'High';
  }
  if (value >= 70) {
    return 'Moderate';
  }
  return 'Needs review';
}

function toClassNames(parts) {
  return parts.filter(Boolean).join(' ');
}

function modeFromUrl(fallbackMode) {
  if (typeof window === 'undefined') {
    return sanitizeMode(fallbackMode);
  }

  const rawValue = new URLSearchParams(window.location.search).get('mode');
  return sanitizeMode(rawValue || fallbackMode);
}

function writeModeToUrl(mode, replace) {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set('mode', mode);
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({}, '', nextUrl);
}

export default function InvestigationLab({
  defaultMode = 'mission',
  scenarioId = DEFAULT_SCENARIO_ID,
  showTraditionalContrast = true,
  primaryCtaHref = '/implement/',
}) {
  const scenario = useMemo(() => getInvestigationScenario(scenarioId), [scenarioId]);

  const totalTimelineSteps = Math.max(scenario.frames.length, scenario.questions.length);
  const maxIndex = Math.max(totalTimelineSteps - 1, 0);
  const lastQuestionIndex = Math.max(scenario.questions.length - 1, 0);

  const [mode, setMode] = useState(() => sanitizeMode(defaultMode));
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedOutcomes, setSelectedOutcomes] = useState({});
  const [shownHints, setShownHints] = useState({});
  const [shownExplanations, setShownExplanations] = useState({});
  const [selectedActionId, setSelectedActionId] = useState('');
  const [pauseRevealed, setPauseRevealed] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [lastAnsweredAt, setLastAnsweredAt] = useState(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const fallbackMode = sanitizeMode(defaultMode);
    const parsedMode = modeFromUrl(fallbackMode);
    setMode(parsedMode);

    if (typeof window === 'undefined') {
      return undefined;
    }

    const initialRawMode = new URLSearchParams(window.location.search).get('mode');
    if (initialRawMode && sanitizeMode(initialRawMode) !== initialRawMode) {
      writeModeToUrl(parsedMode, true);
    }

    const onPopState = () => {
      setMode(modeFromUrl(fallbackMode));
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [defaultMode]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applySetting = () => {
      setPrefersReducedMotion(Boolean(mediaQuery.matches));
    };

    applySetting();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', applySetting);
      return () => {
        mediaQuery.removeEventListener('change', applySetting);
      };
    }

    return undefined;
  }, []);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, maxIndex));
  }, [maxIndex]);

  useEffect(() => {
    if (mode !== 'walkthrough' || prefersReducedMotion || activeIndex >= maxIndex) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current >= maxIndex ? current : current + 1));
    }, AUTO_ADVANCE_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeIndex, maxIndex, mode, prefersReducedMotion]);

  useEffect(() => {
    setPauseRevealed(false);
  }, [activeIndex, mode]);

  const currentStep = scenario.questions[Math.min(activeIndex, lastQuestionIndex)];
  const currentFrame = scenario.frames[Math.min(activeIndex, Math.max(scenario.frames.length - 1, 0))];
  const currentOutcome = currentStep ? selectedOutcomes[currentStep.id] || '' : '';
  const currentOption = currentStep?.options.find((option) => option.outcome === currentOutcome) || null;

  const currentActions = useMemo(() => {
    if (!currentStep) {
      return [];
    }

    return scenario.collaboration.filter((action) => action.stepId === currentStep.id);
  }, [currentStep, scenario.collaboration]);

  useEffect(() => {
    if (currentActions.length === 0) {
      setSelectedActionId('');
      return;
    }

    const stillValid = currentActions.some((action) => action.id === selectedActionId);
    if (!stillValid) {
      setSelectedActionId(currentActions[0].id);
    }
  }, [currentActions, selectedActionId]);

  const selectedAction =
    currentActions.find((action) => action.id === selectedActionId) || currentActions[0] || null;

  const missionComplete =
    Boolean(currentStep) && activeIndex === lastQuestionIndex && Boolean(selectedOutcomes[currentStep.id]);

  const scorecard = useMemo(() => {
    const total = scenario.questions.length || 1;
    let answeredCount = 0;
    let correctCount = 0;
    let falsePositiveCount = 0;

    scenario.questions.forEach((step) => {
      const outcome = selectedOutcomes[step.id];
      if (!outcome) {
        return;
      }

      answeredCount += 1;
      if (outcome === step.expectedOutcome) {
        correctCount += 1;
      }

      const chosenOption = step.options.find((option) => option.outcome === outcome);
      if (chosenOption?.falsePositiveRisk) {
        falsePositiveCount += 1;
      }
    });

    const correctness = Math.round((correctCount / total) * 100);
    const falsePositiveAvoidance = Math.max(0, 100 - falsePositiveCount * 30);
    const explanationViews = Object.values(shownExplanations).filter(Boolean).length;
    const hintViews = Object.values(shownHints).filter(Boolean).length;
    const reasoningQuality = Math.max(
      45,
      Math.min(
        100,
        Math.round(58 + (correctCount / total) * 32 + explanationViews * 4 - falsePositiveCount * 7 + hintViews * 2)
      )
    );

    const elapsedSeconds =
      startedAt && lastAnsweredAt ? Math.max(1, Math.round((lastAnsweredAt - startedAt) / 1000)) : 0;
    const timeToConfidence =
      elapsedSeconds === 0 ? 'Not started' : `${elapsedSeconds}s (${elapsedSeconds <= 180 ? 'fast' : 'deliberate'})`;

    return {
      answeredCount,
      correctness,
      falsePositiveAvoidance,
      reasoningQuality,
      timeToConfidence,
    };
  }, [lastAnsweredAt, scenario.questions, selectedOutcomes, shownExplanations, shownHints, startedAt]);

  function switchMode(nextMode) {
    const sanitizedMode = sanitizeMode(nextMode);
    if (sanitizedMode === mode) {
      return;
    }

    setMode(sanitizedMode);
    writeModeToUrl(sanitizedMode, false);
  }

  function selectOutcome(option) {
    if (!currentStep) {
      return;
    }

    const now = Date.now();
    setSelectedOutcomes((previous) => ({
      ...previous,
      [currentStep.id]: option.outcome,
    }));

    setStartedAt((previous) => previous || now);
    setLastAnsweredAt(now);
  }

  function toggleHint(stepId) {
    setShownHints((previous) => ({
      ...previous,
      [stepId]: !previous[stepId],
    }));
  }

  function toggleExplanation(stepId) {
    setShownExplanations((previous) => ({
      ...previous,
      [stepId]: !previous[stepId],
    }));
  }

  function goToPreviousStep() {
    setActiveIndex((current) => (current <= 0 ? 0 : current - 1));
  }

  function goToNextStep() {
    setActiveIndex((current) => (current >= maxIndex ? current : current + 1));
  }

  function chooseAction(actionId) {
    setSelectedActionId(actionId);
  }

  function renderMissionPane() {
    if (!currentStep) {
      return <p className="lab-empty">Scenario questions are unavailable.</p>;
    }

    const hintVisible = Boolean(shownHints[currentStep.id]);
    const explanationVisible = Boolean(shownExplanations[currentStep.id]);
    const canAdvance = Boolean(selectedOutcomes[currentStep.id]);
    const atLastQuestion = activeIndex >= lastQuestionIndex;

    return (
      <div className="lab-step-card">
        <p className="lab-node-label">{currentStep.nodeId}</p>
        <h4>{currentStep.prompt}</h4>

        <div className="lab-option-grid" role="group" aria-label="Choose branch outcome">
          {currentStep.options.map((option) => {
            const isSelected = currentOutcome === option.outcome;
            return (
              <button
                key={option.id}
                type="button"
                className={toClassNames(['lab-option-btn', isSelected ? 'is-selected' : '', option.falsePositiveRisk ? 'is-risky' : ''])}
                onClick={() => selectOutcome(option)}
              >
                <span>{describeOutcome(option.outcome)}</span>
                <strong>{option.label}</strong>
              </button>
            );
          })}
        </div>

        {currentOption ? (
          <div className="lab-feedback-card">
            <p>
              <strong>Selected branch:</strong> {describeOutcome(currentOption.outcome)}
            </p>
            <p>{currentOption.rationale}</p>
          </div>
        ) : (
          <p className="lab-empty">Select a branch outcome to continue.</p>
        )}

        <div className="lab-reveal-row">
          <button
            type="button"
            onClick={() => toggleHint(currentStep.id)}
            data-telemetry-event="lab-hint-open"
            data-telemetry-location="investigation-lab-mission"
          >
            {hintVisible ? 'Hide hint' : 'Show hint'}
          </button>
          <button
            type="button"
            onClick={() => toggleExplanation(currentStep.id)}
            data-telemetry-event="lab-explanation-open"
            data-telemetry-location="investigation-lab-mission"
          >
            {explanationVisible ? 'Hide explanation' : 'Reveal branch reasoning'}
          </button>
        </div>

        {hintVisible ? <p className="lab-note-card"><strong>Hint:</strong> {currentStep.hint}</p> : null}
        {explanationVisible ? (
          <p className="lab-note-card"><strong>Why this branch:</strong> {currentStep.explanation}</p>
        ) : null}

        <div className="lab-step-nav">
          <button
            type="button"
            onClick={goToPreviousStep}
            disabled={activeIndex === 0}
            data-telemetry-event="lab-step-advance"
            data-telemetry-location="investigation-lab-mission"
          >
            Previous step
          </button>
          <button
            type="button"
            onClick={goToNextStep}
            disabled={!canAdvance || atLastQuestion}
            data-telemetry-event="lab-step-advance"
            data-telemetry-location="investigation-lab-mission"
          >
            Next step
          </button>
        </div>

        {missionComplete ? (
          <section className="lab-scorecard" aria-live="polite">
            <h5>Mission Scorecard (Conceptual)</h5>
            <div className="lab-score-grid">
              <article>
                <span>Correctness</span>
                <strong>{scorecard.correctness}%</strong>
                <p>{scoreBand(scorecard.correctness)} confidence</p>
              </article>
              <article>
                <span>Time-to-confidence</span>
                <strong>{scorecard.timeToConfidence}</strong>
                <p>Tracks investigation pacing</p>
              </article>
              <article>
                <span>False-positive avoidance</span>
                <strong>{scorecard.falsePositiveAvoidance}%</strong>
                <p>Measures containment precision</p>
              </article>
              <article>
                <span>Reasoning quality</span>
                <strong>{scorecard.reasoningQuality}%</strong>
                <p>Depth of auditable logic</p>
              </article>
            </div>
            <p className="lab-score-note">
              Conceptual metrics are intentionally framework-oriented. They show how a vendor implementation could score
              investigation quality without product lock-in.
            </p>
          </section>
        ) : null}
      </div>
    );
  }

  function renderWalkthroughPane() {
    if (!currentStep) {
      return <p className="lab-empty">Scenario questions are unavailable.</p>;
    }

    return (
      <div className="lab-step-card">
        <p className="lab-node-label">{currentStep.nodeId}</p>
        <h4>{currentStep.prompt}</h4>
        <p className="lab-note-card">
          <strong>Expected branch:</strong> {describeOutcome(currentStep.expectedOutcome)}
        </p>

        <div className="lab-pause-card">
          <p>{currentStep.pausePrompt}</p>
          <button
            type="button"
            onClick={() => setPauseRevealed((value) => !value)}
            data-telemetry-event="lab-explanation-open"
            data-telemetry-location="investigation-lab-walkthrough"
          >
            {pauseRevealed ? 'Hide analyst + agent answer' : 'Reveal analyst + agent answer'}
          </button>
          {pauseRevealed ? (
            <p className="lab-note-card">
              <strong>Answer:</strong> {currentStep.explanation}
            </p>
          ) : null}
        </div>

        <div className="lab-step-nav">
          <button
            type="button"
            onClick={goToPreviousStep}
            disabled={activeIndex === 0}
            data-telemetry-event="lab-step-advance"
            data-telemetry-location="investigation-lab-walkthrough"
          >
            Previous frame
          </button>
          <button
            type="button"
            onClick={goToNextStep}
            disabled={activeIndex >= maxIndex}
            data-telemetry-event="lab-step-advance"
            data-telemetry-location="investigation-lab-walkthrough"
          >
            Next frame
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="investigation-lab" aria-label="TENSOR investigation lab">
      <div className="lab-shell">
        <header className="lab-header">
          <div>
            <p className="section-kicker">Concept Demo</p>
            <h3>{scenario.title}</h3>
            <p>{scenario.summary}</p>
            <p className="lab-objective"><strong>Objective:</strong> {scenario.objective}</p>
          </div>
          <div className="lab-mode-tabs" role="tablist" aria-label="Investigation lab mode selector">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'mission'}
              className={toClassNames(['lab-mode-tab', mode === 'mission' ? 'is-active' : ''])}
              onClick={() => switchMode('mission')}
              data-telemetry-event="lab-mode-switch"
              data-telemetry-location="investigation-lab-header"
            >
              Mission Mode
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'walkthrough'}
              className={toClassNames(['lab-mode-tab', mode === 'walkthrough' ? 'is-active' : ''])}
              onClick={() => switchMode('walkthrough')}
              data-telemetry-event="lab-mode-switch"
              data-telemetry-location="investigation-lab-header"
            >
              Walkthrough Mode
            </button>
          </div>
        </header>

        <div className="lab-grid">
          <section className="lab-pane" aria-label="Investigation timeline">
            <h4>Investigation Feed</h4>
            <p className="lab-pane-copy">
              Scripted timeline evidence on the left, deterministic graph questions on the right.
            </p>
            <ol className="lab-timeline-list">
              {scenario.frames.map((frame, index) => {
                const status = index < activeIndex ? 'is-complete' : index === activeIndex ? 'is-active' : '';
                return (
                  <li key={frame.id} className={toClassNames(['lab-timeline-item', status])}>
                    <div className="lab-timeline-top">
                      <strong>{frame.time}</strong>
                      <span>{frame.artifact}</span>
                    </div>
                    <p>{frame.analystNote}</p>
                    <p className="lab-evidence">{frame.evidenceSnippet}</p>
                  </li>
                );
              })}
            </ol>
            {mode === 'walkthrough' ? (
              <p className="lab-auto-note">
                {prefersReducedMotion
                  ? 'Auto-advance disabled due to reduced-motion preference.'
                  : `Auto-advance active every ${Math.round(AUTO_ADVANCE_MS / 1000)} seconds.`}
              </p>
            ) : null}
          </section>

          <section className="lab-pane" aria-label="Graph question path">
            <h4>Graph Question Path</h4>
            <p className="lab-pane-copy">
              Branches stay deterministic with explicit <code>yes</code>/<code>no</code>/<code>unknown</code> outcomes.
            </p>
            <ol className="lab-question-list">
              {scenario.questions.map((step, index) => {
                const status = index < activeIndex ? 'is-complete' : index === activeIndex ? 'is-active' : '';
                const selectedOutcome = selectedOutcomes[step.id];
                return (
                  <li key={step.id} className={toClassNames(['lab-question-item', status])}>
                    <div className="lab-question-head">
                      <span>{step.nodeId}</span>
                      <strong>{step.prompt}</strong>
                    </div>
                    <p>
                      Expected: <code>{step.expectedOutcome}</code>
                      {selectedOutcome ? (
                        <>
                          {' '}
                          · Selected: <code>{selectedOutcome}</code>
                        </>
                      ) : null}
                    </p>
                  </li>
                );
              })}
            </ol>
            {mode === 'mission' ? renderMissionPane() : renderWalkthroughPane()}
          </section>
        </div>

        <section className="lab-collaboration">
          <h4>Human + Agent Collaboration Lane</h4>
          <p className="lab-pane-copy">
            Every recommendation keeps rationale and confidence visible so vendors can implement transparent handoffs.
          </p>
          <div className="lab-collaboration-grid">
            <div className="lab-action-list" role="list">
              {currentActions.map((action) => {
                const isSelected = selectedAction?.id === action.id;
                return (
                  <button
                    key={action.id}
                    type="button"
                    role="listitem"
                    className={toClassNames(['lab-action-item', isSelected ? 'is-selected' : '', action.isOverride ? 'is-override' : ''])}
                    onClick={() => chooseAction(action.id)}
                    data-telemetry-event="lab-human-agent-action"
                    data-telemetry-location="investigation-lab-collaboration"
                  >
                    <span>{action.actor === 'agent' ? 'Agent analyst' : 'Human analyst'}</span>
                    <strong>{action.actionType}</strong>
                    <em>Confidence {formatConfidence(action.confidence)}</em>
                  </button>
                );
              })}
            </div>

            {selectedAction ? (
              <article className="lab-action-detail">
                <p>
                  <strong>Current action:</strong> {selectedAction.actionType}
                  {selectedAction.isOverride ? ' (human override)' : ''}
                </p>
                <p>{selectedAction.rationale}</p>
                <p>
                  <strong>Why this lead:</strong> {selectedAction.whyThisLead}
                </p>
              </article>
            ) : (
              <p className="lab-empty">No collaboration actions available for this step.</p>
            )}
          </div>
        </section>

        {showTraditionalContrast && currentStep ? (
          <section className="lab-contrast">
            <h4>Balanced Contrast: Traditional Playbooks vs Graph Questioning</h4>
            <div className="lab-contrast-grid">
              <article>
                <h5>Traditional Linear Path (Useful, but often insufficient)</h5>
                <p>{currentStep.traditionalPlaybookRisk}</p>
              </article>
              <article>
                <h5>TENSOR Graph Path (Deterministic and portable)</h5>
                <p>{currentStep.graphBranchBenefit}</p>
              </article>
            </div>
          </section>
        ) : null}

        <section className="lab-conversion">
          <h4>Framework Adoption Path</h4>
          <p>
            Use this concept flow to align your implementation with the shared contract, then validate via
            conformance before production rollout.
          </p>
          <div className="cta-group">
            <a
              className="btn btn-primary"
              href={primaryCtaHref}
              data-telemetry-event="lab-cta-implement"
              data-telemetry-location="investigation-lab-conversion"
            >
              Implement Core
            </a>
            <a
              className="btn btn-secondary"
              href="/conformance/"
              data-telemetry-event="lab-cta-conformance"
              data-telemetry-location="investigation-lab-conversion"
            >
              Run Conformance Suite
            </a>
          </div>
          <p className="lab-footnote">
            Mission progress: {scorecard.answeredCount}/{scenario.questions.length} answered · Current frame:{' '}
            {currentFrame ? currentFrame.time : 'n/a'}
          </p>
        </section>
      </div>
    </section>
  );
}
