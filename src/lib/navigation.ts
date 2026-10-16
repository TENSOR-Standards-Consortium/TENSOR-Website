export const navigation = [
  { title: 'Start here', url: '/start/' },
  { title: 'Core', url: '/core/' },
  { title: 'Graph', url: '/graphs/' },
  { title: 'Investigation Lab', url: '/investigation-lab/' },
  { title: 'Implement', url: '/implement/' },
  { title: 'Vendors & organizations', url: '/extensions/' },
  { title: 'Resources', url: '/docs/' },
];

export const resourceGroups = [
  { title: 'Start here', resources: [
    { title: 'TENSOR in five minutes', url: '/start/', description: 'One SOC investigation, the shared model, and how human, agent, vendor, and company roles fit together.' },
  ] },
  { title: 'Specification', resources: [
    { title: 'TENSOR Core', url: '/core/', description: 'Investigation model, contract, binding, and reference cases.' },
    { title: 'JSON Schemas', url: '/schemas/', description: 'Versioned schemas for bundles, definitions, records, and published graphs.' },
    { title: 'Standards relationships', url: '/standards/', description: 'TENSOR alongside ATT&CK, D3FEND, ATLAS, CASE/UCO, and related standards.' },
    { title: 'Human and agent investigations', url: '/ai-reliability/', description: 'Attribution, assessment history, policy, and authority across mixed teams.' },
  ] },
  { title: 'Implementation', resources: [
    { title: 'Implementation guide', url: '/implement/', description: 'Browser and command-line workflows, example bundles, and integration roles.' },
    { title: 'Vendors & organizations', url: '/extensions/', description: 'Product graphs, organizational policy, layer examples, and extension formats.' },
    { title: 'Validation', url: '/conformance/', description: 'Reference checks, result meanings, and implementation reports.' },
    { title: 'Investigation Lab', url: '/investigation-lab/', description: 'Local inspection, validation, replay, and exchange of investigation bundles.' },
  ] },
  { title: 'Graph resources', resources: [
    { title: 'Cross-domain investigations', url: '/investigations/', description: 'Matching interactive graphs and Core records across seven domains, with human, agent, vendor, and company roles.' },
    { title: 'Investigation atlas', url: '/graphs/', description: 'All current public questions, evidence criteria, routes, and guided examples.' },
    { title: 'Event profiles', url: '/graphs/profiles/', description: 'Sixteen event contexts and example paths across seven domains.' },
    { title: 'Question and route review', url: '/graphs/review/', description: 'Item-level semantic review, independent challenges, exact source pins, and scope limits.' },
    { title: 'Coverage ledger', url: '/graphs/coverage/', description: 'Original and revised questions, evidence changes, and review status.' },
    { title: 'Question catalog', url: '/questions/', description: 'All current public questions, evidence criteria, routes and citations.' },
    { title: 'Graph Studio', url: '/studio/', description: 'The current public graph with vendor and organization layer import/export.' },
    { title: 'Historical graph metrics', url: '/metrics/', description: 'Structural diagnostics and release-check history.' },
  ] },
  { title: 'Project', resources: [
    { title: 'Technical review', url: '/review/', description: 'Pinned review package, reproducible baseline, and finding process.' },
    { title: 'Historical archives', url: '/archives/', description: 'Earlier graph releases and review snapshots preserved for citation.' },
    { title: 'Governance', url: '/governance/', description: 'Current stewardship, proposed governance, and public decision process.' },
    { title: 'Contributions', url: '/contribute/', description: 'Question reviews, implementation reports, mappings, and proposals.' },
    { title: 'About TENSOR', url: '/about/', description: 'Purpose, scope, public foundation, and project status.' },
  ] },
];

export const footerNavigation = [
  { title: 'Start here', url: '/start/' },
  { title: 'About', url: '/about/' },
  { title: 'Resources', url: '/docs/' },
  { title: 'Implement', url: '/implement/' },
  { title: 'Vendors & organizations', url: '/extensions/' },
  { title: 'Review', url: '/review/' },
  { title: 'Dataset', url: '/dataset/current.json' },
  { title: 'Archives', url: '/archives/' },
  { title: 'Governance', url: '/governance/' },
  { title: 'GitHub', url: 'https://github.com/tensor-standards-consortium/TENSOR-Framework' },
];
