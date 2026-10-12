# Investigation atlas validation

Historical atlas review, before nebula and original-question restoration. Current working draft: 609 questions; all 588 author dispositions recorded, independent review pending. Counts and observations below describe the earlier build.

Baseline: website `eb1e586a69bc3b5d05aadc8a59f02352af57ed4a`. Framework source: clean merged `bbf06b5b9d7b2baa6c74d04273cdf6966182d169` (Framework PR #13).

## Delivered behavior

The public atlas opens with the complete working definition and switches to the entire preserved published graph. All 103/225 or 588/1,554 source nodes/routes are rendered; focus changes camera and emphasis without truncating source content. Domain/stage positions organize definitions and do not assert route order. Portrait layout uses the same data with transposed domain/stage coordinates. Selection highlights actual incident edges; it is exploration, not a recorded assessment.

URL state includes graph, node and all/focus view. Camera zoom/pan is temporary. Source change and browser Back resolve against the selected definition version; a shared numeric ID is never an equivalence claim. Evidence criteria apply only to the working source. Both complete text alternatives are server-rendered. Questions, route controls, pan/zoom controls and the optional overview provide alternatives to pointer exploration. Fullscreen rejection has a visible fallback. Reduced motion disables camera animation.

At close zoom, node IDs remain centered and context edges become quieter. Full labels are available on pointer hover and in the keyboard-accessible inspector; neighboring full labels are not painted over one another. Coordinate labels have a viewport font-size cap.

Shared shell, button/badge/focus primitives, typography, domain and canvas tokens remain centralized. The private Lab uses its existing independent instance/selection renderer and local-data privacy contract.

## Observed verification

- `fnm exec --using=24.21.0 npm run validate`: 66 tests passed; 609 HTML pages passed the shared-shell, CSP, source-provenance and hosting checks.
- Local Chromium at 1600×1000 and 390×844: all source element counts, actual canvas node click, incident-edge emphasis, source-specific inspector, fullscreen, search, shared URL/reload/Back including focus restoration, mobile inspector, no page overflow, and coverage filtering passed with no page/console errors.
- JavaScript disabled: all 103 working and 588 published question/route text entries retained. Renderer request blocked: search, route inspection and evidence text remained usable.
- Lab cases A/B: retained unknown/yes revisions, recorded selections, replay, exact local bundle download/import and no outbound writes passed.
- All 51 pre-existing generated artifacts matched their baseline SHA-256 values. Added three coverage artifacts; schema, released graphs, Core candidate and frozen review package bytes stayed unchanged.
- Live animation-frame samples showed camera interpolation; reduced-motion camera changes were instant. Subjective temporal pacing was not independently reviewed.

Independent Art Director pixel review initially requested larger graph proportions, stronger selection and more compact mobile chrome. Those were refined and the completion review accepted the material visual revision, with a final adjustment to clear the Overview control from stage labels. That is an agent judgment, not user taste approval. Screenshots and browser QA receipts were produced outside the repository.

## Follow-up boundary

The ledger is an ID-lineage inventory, not approved semantic migration. All 588 original dispositions are pending. See the Framework roadmap and public coverage page before claiming full investigative coverage. No question routes were changed in this website work.
