import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
export const PREVIOUS_VERSION='0.20261013b';
export const PREVIOUS_SHA256='5bbe0573940a20d7efe4cf9b78ae76f4ac79a3771bd92f5b182f3e18961aa874';
export const PREVIOUS_DOWNLOAD=`/archives/${PREVIOUS_VERSION}/tensor.core.graph.json`;
const bytes=readFileSync(resolve(process.cwd(),`public${PREVIOUS_DOWNLOAD}`));
if(createHash('sha256').update(bytes).digest('hex')!==PREVIOUS_SHA256)throw new Error('Archived draft citation digest mismatch');
export const previousGraph=JSON.parse(bytes.toString('utf8'));

const evidenceBytes=readFileSync(resolve(process.cwd(), 'public/archives/0.20261013b/entry-evidence-criteria.json'));
if(createHash('sha256').update(evidenceBytes).digest('hex')!=='bbf1faf9a29396cb327c8a8b178328bc8cda6f6b4b95828d43b801ee7cace21a')throw new Error('Archived criteria citation digest mismatch');
export const previousCriteria=JSON.parse(evidenceBytes.toString('utf8'));
