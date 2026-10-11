# Synthetic candidate investigations

These cases encode the founding proposal's two illustrative investigations under the executable candidate binding `0.1.0-draft.1`. They use new candidate identifiers and new definition versions. Original founding examples and existing framework releases are not rewritten.

- **Case A:** a human-led investigation of an agent job. Outbound transfer is assessed yes; restricted attachment content starts unknown, then a later assessment reports yes. A policy-bound precaution and claimed authority are separate from evidence. Planned, attempted and reported-completed action stages are retained. Review of the earlier precaution remains unresolved.
- **Case B:** an agent prepares an identity-session investigation for human review. A later egress assessment changes, while token replay remains unknown. A verification action stays planned.

All actors, organizations, events, evidence, policies, authority assertions and action reports are fictional. No source evidence is supplied or fetched. These examples do not prove factual truth, authorization, effectiveness, or independent tool interoperability.

For each case, `.definition.json` contains the exact pinned UTF-8 bytes; `.record.json` is the standalone record; `.bundle.json` contains that record and the exact definition text. `manifest.json` lists SHA-256 hashes of these six artifacts. It has no self-containing digest. Reformatting a definition requires a new version and pin. Record transport formatting may change without changing its parsed content.

Run `npm run validate:examples` from the repository root. It runs the candidate validator, not an investigation. Run `npm test` for positive, adversarial and schema parity checks. Test outcomes have bounded implementation scope and do not establish ratification or certification.
