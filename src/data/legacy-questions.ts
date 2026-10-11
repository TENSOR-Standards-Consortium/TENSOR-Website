import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const LEGACY_VERSION = '0.20260206e';
export const LEGACY_SHA256 = 'dfc3f1a965c01b6f7ade253e426e69abcbad688fab20d9d00065d71c777c010c';
export const LEGACY_DOWNLOAD = `/legacy/${LEGACY_VERSION}/tensor.core.graph.json`;
export const LEGACY_SOURCE = 'https://github.com/TENSOR-Standards-Consortium/TENSOR-Framework/blob/221e7d0542df6d51f882f1ab26689084dd976ea9/releases/core/graphs/v0.20260206e/tensor.core.graph.json';

type LegacyQuestion = { id: string; text: string; label: string; category: string; archetype: string };
type LegacyEdge = { id: string; source: string; target: string; decision: 'yes' | 'no' | 'unknown' };
type LegacyGraph = { version: string; entryNodeIds: string[]; nodes: LegacyQuestion[]; edges: LegacyEdge[] };

// Build from the exact preserved release. Updating this inventory is an explicit
// version-and-digest change; mutable "latest" pointers never determine its URLs.
const source = readFileSync(resolve(process.cwd(), `public${LEGACY_DOWNLOAD}`));
if (createHash('sha256').update(source).digest('hex') !== LEGACY_SHA256) {
  throw new Error(`Legacy question inventory digest mismatch for ${LEGACY_VERSION}`);
}
export const legacyGraph = JSON.parse(source.toString('utf8')) as LegacyGraph;
if (legacyGraph.version !== LEGACY_VERSION) throw new Error('Legacy question inventory version mismatch');
export const legacyQuestions = legacyGraph.nodes;
export const legacyCategories = [...new Set(legacyQuestions.map((node) => node.category))];
export const questionById = new Map(legacyQuestions.map((node) => [node.id, node]));
export const questionPath = (id: string) => `/questions/${LEGACY_VERSION}/${encodeURIComponent(id)}/`;
