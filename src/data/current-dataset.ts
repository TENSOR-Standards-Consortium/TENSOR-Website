import graph from '../../public/graphs/working/tensor.core.graph.json';
import criteria from '../../public/graphs/working/entry-evidence-criteria.json';
import dataset from '../../public/dataset/current.json';
import source from '../../public/core/0.1.0-draft.1/provenance.json';

if (dataset.graphVersion !== graph.version || dataset.counts.questions !== graph.nodes.length || dataset.counts.routes !== graph.edges.length) throw new Error('Current graph and dataset inventory disagree');
export { graph, criteria, dataset, source };
export const questions = graph.nodes;
export const categories = [...new Set(questions.map(node => node.category))];
export const questionById = new Map(questions.map(node => [node.id, node]));
export const questionPath = (id: string) => `/questions/${graph.version}/${encodeURIComponent(id)}/`;
