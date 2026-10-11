# Core artifacts and source provenance

The framework repository owns the Core runtime, candidate schemas and examples, founding proposal, and preserved legacy release. This website commits exact copies so local builds and deployments do not fetch changing content or require access to another repository.

After the framework changes are committed, run from the website checkout:

```sh
node scripts/sync-core.mjs --framework /absolute/path/to/TENSOR-Framework-checkout
node scripts/sync-core.mjs --check
node scripts/sync-core.mjs --check --framework /absolute/path/to/TENSOR-Framework-checkout
```

The first command copies the four browser runtime modules, Core documentation, schemas, examples, founding proposal and illustrative examples, and the legacy graph. It also copies the framework's Apache 2.0 license alongside the vendored runtime and public candidate artifacts. The second checks every generated file offline. The third also compares the supplied source checkout, including Git commit and dirty status. No command fetches a URL or executes framework source code.

`public/core/0.1.0-draft.1/provenance.json` records the full source Git commit, whether the checkout had uncommitted changes, source-relative paths, destination-relative paths, byte lengths, and SHA-256 digests. It has no timestamps or machine-specific paths. The manifest is reproducible for the same checkout and inputs. It is an integrity inventory, not a cryptographic signature or independent endorsement. Review the manifest and source diff together.

The generated directories are:

- `src/vendor/tensor-core/`: browser runtime, imported by the Investigation Lab, and its upstream `LICENSE`.
- `public/core/0.1.0-draft.1/`: downloadable candidate documentation, schemas, examples, upstream `LICENSE`, and provenance.
- `public/founding/`: the founding proposal, validation notes, and explicitly listed illustrative examples from `proposals/founding-core-v0.1.0/`. The Python authoring checker is a downloadable source file; the sync script never executes it.
- `public/legacy/0.20260206e/`: the exact published legacy graph. Its fixed SHA-256 is `dfc3f1a965c01b6f7ade253e426e69abcbad688fab20d9d00065d71c777c010c`.

Edit the framework source and resync rather than editing these copies. Both source and destination paths reject traversal, unexpected path characters, and symbolic links. Unknown files in generated directories fail verification; the script never deletes them automatically.

The copied license applies to the imported framework materials. Its inclusion does not change or describe the license of the website repository as a whole.

For the initial local integration only, `--founding /absolute/path/to/founding-draft` can supply the founding proposal before it is present in the framework checkout. This records `external-draft-bootstrap` in provenance and warns that a final sync is required. A release candidate must use the repository source, a clean committed framework checkout, and a checked-in manifest with `foundingSource: "framework-repository"` and `sourceDirty: false`.

Validation commands that release the website should include `node scripts/sync-core.mjs --check`. The optional source comparison belongs in local release preparation; CI can validate the committed website without a second repository checkout.
