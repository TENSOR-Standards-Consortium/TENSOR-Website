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
    description:
      'A shared investigative layer for humans and agents. Explore portable questions, evidence, decisions, and revisions in the TENSOR Core implementation candidate.',
    canonicalPath: '/',
    ogType: 'website',
  },
  review: {
    title: 'Review TENSOR | Frozen Technical Candidate',
    description: 'Review one pinned TENSOR candidate with a first-hour walkthrough, source archive, evidence criteria, reproducible checks and a clear feedback route.',
    canonicalPath: '/review/',
    ogType: 'article',
  },
  implement: {
    title: 'Implement the TENSOR Core Candidate',
    description:
      'Validate synthetic investigation bundles with the TENSOR reference CLI, pin candidate artifacts, and test a scoped integration for portable investigative meaning.',
    canonicalPath: '/implement/',
    ogType: 'article',
  },
  standards: {
    title: 'TENSOR and Existing Standards',
    description:
      'Review proposed TENSOR boundaries alongside ATT&CK, D3FEND, ATLAS, CASE/UCO, STIX, Attack Flow, CACAO, and OCSF. Mappings remain subject to exchange evidence.',
    canonicalPath: '/standards/',
    ogType: 'article',
  },
  docs: {
    title: 'TENSOR Documentation',
    description:
      'Find the Core contract, candidate binding, schemas, validation coverage, public governance proposal, and preserved legacy investigation graph.',
    canonicalPath: '/docs/',
    ogType: 'article',
  },
  conformance: {
    title: 'TENSOR Validation and Conformance',
    description:
      'Run candidate reference checks and report their scope. Distinguish structural and semantic validation from independent interoperability and certification.',
    canonicalPath: '/conformance/',
    ogType: 'article',
  },
  governance: {
    title: 'Proposed TENSOR Governance',
    description:
      'Review proposed public stewardship, open roles, independent review, conflicts, appeals, and the evidence required before a stable TENSOR Core release.',
    canonicalPath: '/governance/',
    ogType: 'article',
  },
  contribute: {
    title: 'Contribute to TENSOR',
    description:
      'Bring a synthetic investigation case, independent implementation, standards mapping, or technical review to help make cyber investigations portable.',
    canonicalPath: '/contribute/',
    ogType: 'article',
  },
  about: {
    title: 'About TENSOR',
    description:
      'TENSOR is a public standard initiative for all cyber investigations, with one shared Core for humans and agents and vendor and business layers above it.',
    canonicalPath: '/about/',
    ogType: 'article',
  },
  aiReliability: {
    title: 'Human and Agent Investigations with TENSOR',
    description:
      'Represent questions, evidence, attribution, disagreement, decisions, and revisions consistently across human, agent, and mixed investigative teams.',
    canonicalPath: '/ai-reliability/',
    ogType: 'article',
  },
  metrics: {
    title: 'TENSOR Legacy Graph Metrics',
    description:
      'Inspect structural properties and release checks for the legacy TENSOR graph. These diagnostics do not measure security effectiveness or adoption.',
    canonicalPath: '/metrics/',
    ogType: 'article',
  },
  schemas: {
    title: 'TENSOR Candidate and Legacy Schemas',
    description:
      'Access versioned candidate schemas for investigation bundles, definitions, and records, plus the preserved legacy graph schema archive.',
    canonicalPath: '/schemas/',
    ogType: 'article',
  },
  graphs: {
    title: 'TENSOR Legacy Graph Releases',
    description:
      'Explore the preserved TENSOR question graph and release archive, with explicit semantic review requirements for migration to the new Core candidate.',
    canonicalPath: '/graphs/',
    ogType: 'article',
  },
  extensions: {
    title: 'TENSOR Profiles and Extensions',
    description:
      'Build public profiles, vendor tools, and business policy above TENSOR Core while declaring semantic dependencies, unsupported content, and exchange losses.',
    canonicalPath: '/extensions/',
    ogType: 'article',
  },
  studio: {
    title: 'TENSOR Legacy Graph Studio',
    description:
      'Inspect the earlier TENSOR graph and schema releases. Legacy Graph Studio uses the graph-only model, separate from the new Core investigation record candidate.',
    canonicalPath: '/studio/',
    ogType: 'article',
  },
  investigationLab: {
    title: 'TENSOR Investigation Lab',
    description:
      'Inspect, import, validate, and export synthetic investigation bundles using the TENSOR Core candidate contract for humans and agents.',
    canonicalPath: '/investigation-lab/',
    ogType: 'article',
  },
  offline: {
    title: 'TENSOR Offline Mode',
    description: 'Offline mode for cached TENSOR documentation and Graph Studio assets.',
    canonicalPath: '/offline/',
    ogType: 'website',
    noindex: true,
  },
  notFound: {
    title: 'Page Not Found | TENSOR',
    description: 'The requested TENSOR page could not be found.',
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
    name: 'TENSOR public standard initiative',
    url: absoluteUrl(siteUrl, '/'),
    sameAs: ['https://github.com/tensor-standards-consortium/tensor-framework'],
  };
}
