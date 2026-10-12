import { useEffect, useMemo, useRef, useState } from 'react';
import { BINDING_VERSION, parseBundle, validateBundle } from '../vendor/tensor-core/index.mjs';
import {
  MAX_BUNDLE_BYTES, CASES, SECTIONS, asText, attributionLabel, entryTitle, getDefinitionQuestions,
  getEntries, groupEntries, indexEntries, questionKey, serializeForLab, summarizeValidation, validateImportSize, downloadName, decodeBundleBytes, filterEntries,
} from '../lib/investigationLab.mjs';
import '../styles/investigation-lab.css';
import { Badge } from './WorkspaceUI.jsx';
import InvestigationGraph from './InvestigationGraph.jsx';

const PAGE_SIZE = 30;

function Status({ value, children }) {
  return <Badge value={value}>{children || asText(value)}</Badge>;
}

function JsonDetails({ value, label = 'Inspect complete JSON' }) {
  return <details className="il-json"><summary>{label}</summary><pre>{JSON.stringify(value, null, 2)}</pre></details>;
}

function Field({ label, value }) {
  if (value === undefined || value === null || value === '') return null;
  return <div><dt>{label}</dt><dd>{asText(value)}</dd></div>;
}

function EntryReference({ id, entriesById, onInspect, label }) {
  if (!id) return null;
  const entry = typeof id === 'string' ? entriesById.get(id) : undefined;
  return entry
    ? <button type="button" className="il-reference" onClick={() => onInspect(id)} title={id}>{label || entryTitle(entry)}</button>
    : <span className="il-missing-reference">{label ? `${label}: ` : ''}{asText(id)} <small>({entriesById.has(id) ? 'ambiguous ID' : 'not included'})</small></span>;
}

function ReferenceList({ ids, ...props }) {
  return Array.isArray(ids) && ids.length > 0
    ? <ul className="il-reference-list">{ids.map((id, index) => <li key={index}><EntryReference id={id} {...props} /></li>)}</ul>
    : null;
}

function EntryCard({ entry, questions, entriesById, onInspect }) {
  const refs = { entriesById, onInspect };
  const question = entry.type === 'QuestionInstance' ? questions.get(questionKey(entry.definitionRef, entry.questionId)) : null;
  return <article className="tensor-panel il-entry">
    <div className="il-entry-top"><span className="il-eyebrow">{asText(entry.type)}</span><Status value={entry.outcome || entry.stage || entry.availability || entry.status}>{asText(entry.outcome || entry.stage || entry.availability || entry.status || 'recorded')}</Status></div>
    <h3>{question?.prompt ? asText(question.prompt) : entryTitle(entry)}</h3>
    <p className="il-attribution">{attributionLabel(entry, entriesById)}<span aria-hidden="true"> · </span><time>{asText(entry.recordedAt || 'Recorded time unspecified')}</time></p>
    {entry.type === 'QuestionInstance' && <>
      {!question && <p className="il-caption">The exact pinned question is unavailable or ambiguous. Review the validation report and the complete instance JSON.</p>}
      <dl className="il-fields"><Field label="Subject" value={entry.subjectBindings} /><Field label="Time context" value={entry.timeContext} /><Field label="Definition version" value={entry.definitionRef?.version} /><Field label="Origin" value={entry.origin?.rationale || entry.origin?.kind} /></dl>
      {question && <details className="il-criteria"><summary>Question criteria and parameter bindings</summary><p>{asText(question.proposition)}</p><dl className="il-fields"><Field label="Yes" value={question.assessmentCriteria?.yes} /><Field label="No" value={question.assessmentCriteria?.no} /><Field label="Unknown" value={question.assessmentCriteria?.unknown} /><Field label="Applicability" value={question.applicabilityCriteria} /><Field label="Bindings" value={entry.parameterBindings} /></dl></details>}
    </>}
    {entry.type === 'EvidenceReference' && <dl className="il-fields"><Field label="Source" value={entry.source} /><Field label="Access limitation" value={entry.locatorAbsentReason} /><Field label="Restrictions" value={entry.accessRestrictions} /><Field label="Locator (not opened)" value={entry.locator} /><Field label="Integrity" value={entry.integrity} /></dl>}
    {entry.type === 'Observation' && <><dl className="il-fields"><Field label="Method" value={entry.method} /><Field label="Event time" value={entry.eventTime} /></dl><p className="il-field-label">Evidence references</p><ReferenceList ids={entry.evidenceRefIds} {...refs} /></>}
    {entry.type === 'Assessment' && <>
      <p>{asText(entry.rationale)}</p><dl className="il-fields"><Field label="Applicability" value={entry.applicability} /><Field label="Method" value={entry.method} /></dl>
      <p className="il-field-label">Question instance</p><EntryReference id={entry.targetInstanceId} {...refs} />
      {Array.isArray(entry.inputs) && entry.inputs.length > 0 && <><p className="il-field-label">Inputs and their roles</p><ul className="il-reference-list">{entry.inputs.map((input, i) => <li key={i}><span className="il-input-role">{asText(input?.role)}</span><EntryReference id={input?.entryId} {...refs} /></li>)}</ul></>}
      {Array.isArray(entry.unknownReasons) && <div className="il-unknown-reasons">{entry.unknownReasons.map((reason, i) => <p key={i}><strong>{asText(reason?.code)}</strong> — {asText(reason?.explanation)}</p>)}</div>}
    </>}
    {entry.type === 'Decision' && <>
      <dl className="il-fields"><Field label="Disposition" value={entry.disposition} /><Field label="Policy status" value={entry.policyStatus?.status} /><Field label="Authority status" value={entry.authorityStatus?.status} /></dl>
      <p>{asText(entry.rationale)}</p>
      {entry.targetInstanceId && <><p className="il-field-label">Question instance</p><EntryReference id={entry.targetInstanceId} {...refs} /></>}
      {entry.selectedAssessmentId && <><p className="il-field-label">Selected assessment</p><EntryReference id={entry.selectedAssessmentId} {...refs} /></>}
      <ReferenceList ids={entry.selectedInputIds} {...refs} />
      {Array.isArray(entry.selections) && <><p className="il-field-label">Explicit transition selections</p><ul className="il-reference-list">{entry.selections.map((selection, i) => <li key={i}><code>{asText(selection?.transitionId)}</code><span aria-hidden="true"> → </span><EntryReference id={selection?.targetInstanceId} {...refs} /></li>)}</ul></>}
      {Array.isArray(entry.reviewedEntryIds) && <><p className="il-field-label">Reviews these historical entries</p><ReferenceList ids={entry.reviewedEntryIds} {...refs} /></>}
      <ReferenceList ids={entry.policyStatus?.policyRefIds} {...refs} /><ReferenceList ids={entry.authorityStatus?.authorityRefIds} {...refs} />
    </>}
    {entry.type === 'ActionRecord' && <><dl className="il-fields"><Field label="Operation subject" value={entry.operationSubject} /><Field label="Event time" value={entry.eventTime} /><Field label="Reported result" value={entry.result} /></dl>{entry.decisionId && <><p className="il-field-label">Related decision</p><EntryReference id={entry.decisionId} {...refs} /></>}<p className="il-caption">An action record describes an attributed stage; importing it does not execute or authorize an operation.</p></>}
    {entry.type === 'Actor' && <dl className="il-fields"><Field label="Actor kind" value={entry.kind} /><Field label="Asserted identity status" value={entry.identityStatus} /></dl>}
    {entry.type === 'PolicyReference' && <dl className="il-fields"><Field label="Version" value={entry.version} /><Field label="Effective time" value={entry.effectiveTime} /><Field label="Applicable scope" value={entry.applicableScope} /><Field label="Conditions" value={entry.conditions} /><Field label="Access limitation" value={entry.locatorAbsentReason} /></dl>}
    {entry.type === 'AuthorityAssertion' && <><dl className="il-fields"><Field label="Scope" value={entry.scope} /><Field label="Claimed validity" value={entry.validityStatus} /><Field label="Receiver verification" value={entry.receiverLocalVerification} /></dl><p className="il-field-label">Claimed issuer and grantee</p><ReferenceList ids={[entry.issuerId, entry.granteeId].filter(Boolean)} {...refs} /><p className="il-field-label">Asserted basis</p><ReferenceList ids={entry.basisReferences} {...refs} /><p className="il-caption">This records a claim of authority. Receiving it does not grant permission.</p></>}
    {entry.type === 'Hypothesis' && <EntryReference id={entry.relatedInstanceId} {...refs} />}
    {entry.supersedes && <div className="il-revision"><p className="il-field-label">Supersedes a retained entry</p><EntryReference id={entry.supersedes.entryId} {...refs} /><p>{asText(entry.supersedes.reason)}</p></div>}
    <p className="il-entry-id"><span>ID</span><code>{asText(entry.id)}</code></p>
    <JsonDetails value={entry} />
  </article>;
}

function ValidationReport({ report, onDownload }) {
  const [checkPage, setCheckPage] = useState(0);
  useEffect(() => setCheckPage(0), [report]);
  const summary = summarizeValidation(report);
  const checks = Array.isArray(report?.checks) ? report.checks : [];
  const ordered = [...checks].sort((a, b) => ({ fail: 0, indeterminate: 1, notRun: 2, pass: 3 }[a.status] ?? 4) - ({ fail: 0, indeterminate: 1, notRun: 2, pass: 3 }[b.status] ?? 4));
  return <section className="tensor-panel il-validation" aria-labelledby="il-validation-title">
    <div className="il-validation-heading"><div><p className="il-eyebrow">Local validation</p><h2 id="il-validation-title">{summary.title}</h2></div><Status value={report.status}>{report.status}</Status></div>
    <p>{summary.description}</p>
    <p className="il-check-counts">{summary.counts.pass} passed · {summary.counts.fail} failed · {summary.counts.indeterminate} indeterminate{summary.counts.notRun ? ` · ${summary.counts.notRun} not run` : ''}</p>
    <p className="il-caption">These checks evaluate the named draft binding. They do not establish evidence truth, investigator authority, safety, effectiveness, or independent interoperability.</p>
    <details className="il-checks" open={report.status !== 'pass'}><summary>Inspect {checks.length} check results</summary><p className="il-caption">Failures and indeterminate checks appear first. {checks.length > 50 ? `Showing ${checkPage * 50 + 1}–${Math.min((checkPage + 1) * 50, checks.length)} of ${checks.length}.` : ''}</p><ol>{ordered.slice(checkPage * 50, (checkPage + 1) * 50).map((check, index) => <li key={`${check.id}-${index}`}><div><Status value={check.status}>{asText(check.status)}</Status><strong>{asText(check.id)}</strong>{check.requirement && <span className="il-requirement">{asText(check.requirement)}</span>}</div><p>{asText(check.message)}</p>{check.path && <code>{asText(check.path)}</code>}</li>)}</ol>{checks.length > 50 && <div className="il-pagination"><button type="button" className="btn btn-secondary" disabled={checkPage === 0} onClick={() => setCheckPage((value) => value - 1)}>Previous checks</button><button type="button" className="btn btn-secondary" disabled={(checkPage + 1) * 50 >= checks.length} onClick={() => setCheckPage((value) => value + 1)}>Next checks</button></div>}</details>
    <details className="il-checks"><summary>Validation scope and complete report</summary><p className="il-caption">{asText(report.scope?.claims)}</p><JsonDetails value={report.scope} label="Claims and exclusions" /><JsonDetails value={report} label="Machine-readable report" /></details>
    <button type="button" className="il-text-button" onClick={onDownload}>Download validation report ↓</button>
  </section>;
}

export default function InvestigationLab() {
  const [bundle, setBundle] = useState(null);
  const [report, setReport] = useState(null);
  const [source, setSource] = useState(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [section, setSection] = useState('overview');
  const [query, setQuery] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [questions, setQuestions] = useState(() => new Map());
  const [page, setPage] = useState(0);
  const [paste, setPaste] = useState('');
  const operation = useRef(0);
  const contentRef = useRef(null);
  const entries = useMemo(() => getEntries(bundle), [bundle]);
  const entriesById = useMemo(() => indexEntries(entries), [entries]);
  const groups = useMemo(() => groupEntries(entries), [entries]);
  const visible = useMemo(() => {
    const scoped = section === 'history' || section === 'all' ? entries : (groups[section] || []);
    return filterEntries(scoped, query, selectedEntryId);
  }, [entries, groups, section, query, selectedEntryId]);

  async function importText(text, nextSource, ticket) {
    validateImportSize(text);
    const parsed = parseBundle(text, { maxBytes: MAX_BUNDLE_BYTES });
    const [result, questionIndex] = await Promise.all([validateBundle(parsed, { maxBytes: MAX_BUNDLE_BYTES }), getDefinitionQuestions(parsed)]);
    if (ticket !== operation.current) return;
    setBundle(parsed); setReport(result); setSource(nextSource); setQuestions(questionIndex);
    setSection('overview'); setQuery(''); setSelectedEntryId(''); setPage(0);
    setNotice(`Opened ${nextSource.label}. ${summarizeValidation(result).title}.`);
  }

  async function runOperation(work) {
    if (!ready) return;
    const ticket = ++operation.current;
    setBusy(true); setError(''); setNotice('');
    try { await work(ticket); }
    catch (caught) { if (ticket === operation.current) setError(caught instanceof Error ? caught.message : 'The bundle could not be opened.'); }
    finally { if (ticket === operation.current) setBusy(false); }
  }

  function loadCase(sample) {
    runOperation(async (ticket) => {
      const response = await fetch(sample.path, { credentials: 'omit', redirect: 'error' });
      if (!response.ok) throw new Error(`The example could not be loaded (${response.status}). Download it below or try again.`);
      const declared = Number(response.headers.get('content-length'));
      if (Number.isFinite(declared) && declared > MAX_BUNDLE_BYTES) throw new Error('The example exceeds the 2 MiB import limit.');
      await importText(decodeBundleBytes(await response.arrayBuffer()), { label: sample.title, kind: 'synthetic' }, ticket);
    });
  }

  function importFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    runOperation(async (ticket) => {
      if (file.size > MAX_BUNDLE_BYTES) throw new Error('This file exceeds the 2 MiB import limit. The current bundle has been retained.');
      await importText(decodeBundleBytes(await file.arrayBuffer()), { label: file.name, kind: 'import' }, ticket);
    });
  }

  function download(text, name) {
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href; link.download = name;
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    setNotice(`Download prepared: ${name}`);
  }

  function showSection(next) { setSection(next); setQuery(''); setSelectedEntryId(''); setPage(0); }
  function inspectEntry(id) {
    setSection('all'); setQuery(id); setSelectedEntryId(id); setPage(0);
    window.requestAnimationFrame(() => contentRef.current?.focus({ preventScroll: false }));
  }

  return <div className="tensor-investigation-lab" aria-busy={busy || !ready}>
    <section className="tensor-panel il-start" aria-labelledby="il-start-title">
      <div className="il-start-heading"><div><p className="il-eyebrow">One record. A shared basis for review.</p><h2 id="il-start-title">Open an investigation</h2></div><span className="il-version">Core {BINDING_VERSION}</span></div>
      <p className="il-lead">Follow the questions, evidence, judgments, and decisions. Then carry the same record to another tool.</p>
      <div className="il-case-grid">{CASES.map((sample, index) => <button type="button" className={`il-case ${source?.label === sample.title ? 'is-selected' : ''}`} key={sample.id} disabled={busy || !ready} onClick={() => loadCase(sample)}><span className="il-case-number">0{index + 1} / SYNTHETIC CASE</span><strong>{sample.title}</strong><span>{sample.description}</span><span className="il-case-action">Open reference case <span aria-hidden="true">↗</span></span></button>)}</div>
      <div className="il-import-row"><div><label htmlFor="il-bundle-file" className="il-file-label">Import a local bundle</label><input id="il-bundle-file" type="file" accept=".json,application/json" onChange={importFile} disabled={busy || !ready} aria-describedby="il-privacy" /></div><p id="il-privacy">JSON · up to 2 MiB. Your file is read in this browser and is not uploaded. Evidence locations are never opened and recorded actions are never executed.</p></div>
      <details className="il-paste"><summary>Or paste bundle JSON</summary><form onSubmit={(event) => { event.preventDefault(); runOperation((ticket) => importText(paste, { label: 'Pasted bundle', kind: 'import' }, ticket)); }}><label htmlFor="il-json-paste">Bundle JSON to open</label><textarea id="il-json-paste" value={paste} onChange={(event) => setPaste(event.target.value)} spellCheck="false" rows={7} placeholder='{ "format": "tensor-investigation-bundle", … }' maxLength={MAX_BUNDLE_BYTES} /><button type="submit" className="btn btn-primary" disabled={busy || !ready || !paste.trim()}>Open pasted bundle</button></form></details>
      <div className="il-live" aria-live="polite" aria-atomic="true">{!ready ? 'Preparing the local investigation workspace…' : busy ? 'Reading and validating the bundle locally…' : notice}</div>
      {error && <div className="il-error" role="alert"><strong>Could not open this bundle</strong><p>{error}</p>{bundle && <p>The previously opened record is unchanged.</p>}</div>}
    </section>

    {bundle && <>
      <section className="tensor-panel il-workspace-bar" aria-label="Open bundle"><div><span className="il-eyebrow">{source.kind === 'synthetic' ? 'Synthetic reference case' : 'Imported record · assertions unverified'}</span><h2>{source.label}</h2><p>{asText(bundle.record?.scope?.purpose || 'No readable scope purpose supplied.')}</p></div><div className="il-workspace-actions"><button type="button" className="btn btn-secondary" disabled={busy || !ready} onClick={() => runOperation(async (ticket) => { const result = await validateBundle(bundle, { maxBytes: MAX_BUNDLE_BYTES }); if (ticket === operation.current) { setReport(result); setNotice(summarizeValidation(result).title); } })}>Run checks again</button><button type="button" className="btn btn-primary" onClick={() => { try { download(serializeForLab(bundle), downloadName(bundle)); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Export failed.'); } }}>Download bundle ↓</button></div></section>
      {report && <ValidationReport report={report} onDownload={() => download(JSON.stringify(report, null, 2), downloadName(bundle, 'validation'))} />}
      <div className="tensor-panel il-workbench">
        <nav className="il-sections" aria-label="Investigation sections">{SECTIONS.map((item) => <button type="button" key={item.id} className={section === item.id ? 'is-active' : ''} aria-current={section === item.id ? 'page' : undefined} onClick={() => showSection(item.id)}><span>{item.label}</span>{!['overview', 'graph'].includes(item.id) && <span className="il-count">{item.id === 'all' || item.id === 'history' ? entries.length : (groups[item.id]?.length || 0)}</span>}</button>)}<p>The record preserves attributed assertions. A newer entry does not silently replace an earlier one.</p></nav>
        <section className="il-content" ref={contentRef} tabIndex={-1} aria-label={SECTIONS.find((item) => item.id === section)?.label || 'Record contents'}>
          {section === 'graph' ? <InvestigationGraph bundle={bundle} questions={questions} onInspect={inspectEntry} /> : section === 'overview' ? <>
            <div className="il-content-heading"><p className="il-eyebrow">Investigation context</p><h2>Scope and handoff</h2></div>
            <div className="il-overview-metrics"><div><strong>{entries.length}</strong><span>inspectable entries</span></div><div><strong>{groups.QuestionInstance?.length || 0}</strong><span>question instances</span></div><div><strong>{groups.Actor?.length || 0}</strong><span>actor entries</span></div></div>
            <article className="tensor-panel il-overview-card"><h3>Record boundary</h3><dl className="il-fields"><Field label="Purpose" value={bundle.record?.scope?.purpose} /><Field label="Subjects" value={bundle.record?.scope?.subjectBoundary} /><Field label="Exchange scope" value={bundle.record?.completeness?.exchangeScope} /><Field label="Completeness meaning" value={bundle.record?.completeness?.meaning} /><Field label="Investigation ID" value={bundle.record?.investigationId} /><Field label="Snapshot ID" value={bundle.record?.snapshotId} /><Field label="Recorded at" value={bundle.record?.recordedAt} /><Field label="Producer" value={bundle.record?.producer} /></dl><JsonDetails value={bundle.record?.scope} label="Complete scope" /></article>
            <article className="tensor-panel il-overview-card"><h3>Exact definition artifacts</h3><p>Each attached definition retains its original content string. The validator checks the record’s digest references against those bytes.</p>{Array.isArray(bundle.definitions) && bundle.definitions.map((definition, index) => <details className="il-definition" key={index}><summary>{asText(definition?.path)}</summary><pre>{asText(definition?.content)}</pre></details>)}</article>
            <article className="tensor-panel il-overview-card"><h3>Limits and outstanding review</h3><p>Missing source evidence can remain explicit in a complete Core exchange. A structurally valid record can still contain unknown assessments or unresolved decisions.</p><dl className="il-fields"><Field label="Omissions" value={bundle.record?.omissions} /><Field label="Transformation losses" value={bundle.record?.losses} /></dl>{report?.unresolvedReviews && <JsonDetails value={report.unresolvedReviews} label="Recorded review dependencies" />}</article>
            <JsonDetails value={bundle} label="Inspect complete bundle, including opaque metadata" />
          </> : <>
            <div className="il-content-heading"><p className="il-eyebrow">{section === 'history' ? 'Preserved record order' : 'Inspectable assertions'}</p><h2>{SECTIONS.find((item) => item.id === section)?.label}</h2></div>
            {section === 'history' && <p className="il-caption">Shown in file order. Timestamps describe recorded time and do not establish causality. Supersession links retain the earlier entry.</p>}
            <label className="il-search-label" htmlFor="il-entry-search">Find text or an entry ID</label><input id="il-entry-search" className="il-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSelectedEntryId(''); setPage(0); }} />
            <p className="il-results">{visible.length} {visible.length === 1 ? 'entry' : 'entries'}{query ? ' matching your search' : ''}</p>
            {visible.length === 0 && <p className="il-empty">No entries in this view. Try another section or clear the search.</p>}
            {section === 'history' ? <ol className="il-history" start={page * PAGE_SIZE + 1}>{visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((entry, index) => <li key={index}><div><span className="il-eyebrow">{asText(entry.type)}</span><time>{asText(entry.recordedAt)}</time></div><EntryReference id={entry.id} {...{ entriesById, onInspect: inspectEntry }} /><p>{attributionLabel(entry, entriesById)}</p>{entry.supersedes && <p className="il-caption">Supersedes <code>{asText(entry.supersedes.entryId)}</code></p>}</li>)}</ol> : visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((entry, index) => <EntryCard key={index} entry={entry} questions={questions} entriesById={entriesById} onInspect={inspectEntry} />)}
            {visible.length > PAGE_SIZE && <div className="il-pagination"><button type="button" className="btn btn-secondary" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous entries</button><span>Page {page + 1} of {Math.ceil(visible.length / PAGE_SIZE)}</span><button type="button" className="btn btn-secondary" disabled={(page + 1) * PAGE_SIZE >= visible.length} onClick={() => setPage((value) => value + 1)}>Next entries</button></div>}
          </>}
        </section>
      </div>
      <p className="il-export-note">Download preserves the imported record, identities, attached definition strings, and unknown metadata. JSON formatting may change. Reopening your own export tests this implementation’s round trip; independent exchange requires another implementation.</p>
    </>}
  </div>;
}
