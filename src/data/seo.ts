export interface RouteSeo {
  title: string;
  description: string;
  canonicalPath: string;
  ogType?: 'website' | 'article';
  noindex?: boolean;
}

export const seo = {
  home: {
    title: 'TENSOR | A Public Standard for Cyber Investigations',
    description: 'Public investigation knowledge and a shared Core for human and agent records, with vendor and organization graphs above the same foundation. Core is an implementation candidate.',
    canonicalPath: '/',
    ogType: 'website',
  },
  review: {
    title: 'Technical review | TENSOR',
    description: 'Pinned Core source, artifact manifest, reference cases, evaluation baseline, and technical finding forms.',
    canonicalPath: '/review/',
    ogType: 'article',
  },
  implement: {
    title: 'Implementation guide | TENSOR',
    description: 'Browser and command-line quick starts, investigation bundles, integration roles, and vendor and organization graph resources.',
    canonicalPath: '/implement/',
    ogType: 'article',
  },
  standards: {
    title: 'Standards relationships | TENSOR',
    description: 'Proposed relationships with ATT&CK, D3FEND, ATLAS, CASE/UCO, STIX, Attack Flow, CACAO, and OCSF.',
    canonicalPath: '/standards/',
    ogType: 'article',
  },
  docs: {
    title: 'Resources | TENSOR',
    description: 'The complete directory of TENSOR specifications, tools, graph resources, downloads, implementation guides, and project information.',
    canonicalPath: '/docs/',
    ogType: 'article',
  },
  conformance: {
    title: 'Validation | TENSOR',
    description: 'Reference validation scope, result meanings, supported implementation roles, and reproducible exchange reports.',
    canonicalPath: '/conformance/',
    ogType: 'article',
  },
  governance: {
    title: 'Governance | TENSOR',
    description: 'Current TENSOR stewardship, proposed public governance, review handling, conflicts, and decision records.',
    canonicalPath: '/governance/',
    ogType: 'article',
  },
  contribute: {
    title: 'Contributions | TENSOR',
    description: 'Question reviews, vendor and organization graphs, implementation reports, standards mappings, and technical proposals.',
    canonicalPath: '/contribute/',
    ogType: 'article',
  },
  about: {
    title: 'About TENSOR',
    description: 'Purpose, scope, available resources, public Core, vendor and organization layers, and project status.',
    canonicalPath: '/about/',
    ogType: 'article',
  },
  aiReliability: {
    title: 'Human and agent investigations | TENSOR',
    description: 'The common record model for attribution, questions, evidence, assessments, decisions, and revisions across human and agent teams.',
    canonicalPath: '/ai-reliability/',
    ogType: 'article',
  },
  metrics: {
    title: 'Historical graph metrics | TENSOR',
    description: 'Structural counts, route diagnostics, calculated scores, and check history for published TENSOR graph releases.',
    canonicalPath: '/metrics/',
    ogType: 'article',
  },
  schemas: {
    title: 'JSON Schemas | TENSOR',
    description: 'Versioned JSON Schemas for Core bundles, definitions, and records, plus the published graph format.',
    canonicalPath: '/schemas/',
    ogType: 'article',
  },
  graphs: {
    title: 'Investigation atlas | TENSOR',
    description: 'Working and published public graphs, question evidence criteria, routes, 3D views, and example investigations.',
    canonicalPath: '/graphs/',
    ogType: 'article',
  },
  extensions: {
    title: 'Vendor & organization graphs | TENSOR',
    description: 'Layer responsibilities, product and policy graphs, a working cloud example, downloadable layer files, and Core extension formats.',
    canonicalPath: '/extensions/',
    ogType: 'article',
  },
  studio: {
    title: 'Graph Studio | TENSOR',
    description: 'Graph and layer import, combination, and export for the published TENSOR graph format, including vendor and organization examples.',
    canonicalPath: '/studio/',
    ogType: 'article',
  },
  investigationLab: {
    title: 'Investigation Lab | TENSOR',
    description: 'Local inspection, validation, recorded-path replay, and import/export of Core investigation bundles.',
    canonicalPath: '/investigation-lab/',
    ogType: 'article',
  },
  offline: {
    title: 'Connection unavailable | TENSOR',
    description: 'Access to previously cached TENSOR resources when a connection is unavailable.',
    canonicalPath: '/offline/',
    ogType: 'website',
    noindex: true,
  },
  notFound: {
    title: 'Page not found | TENSOR',
    description: 'Resource directory and implementation links for an unavailable TENSOR page.',
    canonicalPath: '/404',
    ogType: 'website',
    noindex: true,
  },
} as const;

export function absoluteUrl(siteUrl: string, path: string): string {
  return new URL(path, siteUrl).toString();
}

export function organizationJsonLd(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TENSOR Standards Consortium',
    url: absoluteUrl(siteUrl, '/'),
    sameAs: ['https://github.com/tensor-standards-consortium/tensor-framework'],
  };
}
