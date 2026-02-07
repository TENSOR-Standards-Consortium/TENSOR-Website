export interface RouteSeo {
  title: string;
  description: string;
  canonicalPath: string;
  ogType?: 'website' | 'article';
  noindex?: boolean;
}

export const seo = {
  home: {
    title: 'TENSOR | Open Security Investigation Graph Standard',
    description:
      'TENSOR is an open standard for security investigation logic. Implement a stable graph contract, run conformance checks, and contribute improvements across vendors.',
    canonicalPath: '/',
    ogType: 'website',
  },
  implement: {
    title: 'Implement TENSOR Core in 30 Minutes',
    description:
      'Follow the implementation path for TENSOR Core: load schema and graph artifacts, validate compatibility, run conformance fixtures, and ship an interoperable integration.',
    canonicalPath: '/implement/',
    ogType: 'article',
  },
  standards: {
    title: 'TENSOR Standards and Conformance',
    description:
      'Review TENSOR core standards, conformance tiers, release policy, compatibility guarantees, and deprecation windows for multi-vendor interoperability.',
    canonicalPath: '/standards/',
    ogType: 'article',
  },
  docs: {
    title: 'TENSOR Documentation for Implementers',
    description:
      'Technical documentation for implementing the TENSOR object model, node and edge contracts, execution semantics, compatibility handling, and AI integration controls.',
    canonicalPath: '/docs/',
    ogType: 'article',
  },
  conformance: {
    title: 'TENSOR Conformance Suite',
    description:
      'Run the TENSOR conformance suite with baseline fixtures and pass criteria for consumer, executor, and authoring-tool integrations.',
    canonicalPath: '/conformance/',
    ogType: 'article',
  },
  governance: {
    title: 'TENSOR Governance',
    description:
      'Understand TENSOR governance: decision process, release cadence, deprecation policy, and how changes move from proposal to adopted standard.',
    canonicalPath: '/governance/',
    ogType: 'article',
  },
  contribute: {
    title: 'Contribute to TENSOR',
    description:
      'Contribute to TENSOR through documentation updates, fixtures, schema proposals, and governance participation using a transparent quality bar.',
    canonicalPath: '/contribute/',
    ogType: 'article',
  },
  about: {
    title: 'About the TENSOR Standard',
    description:
      'Learn why TENSOR exists, which interoperability problems it solves, what it does not solve, and why vendors implement it as a shared investigation contract.',
    canonicalPath: '/about/',
    ogType: 'article',
  },
  aiReliability: {
    title: 'AI Reliability in TENSOR',
    description:
      'Use TENSOR to keep AI-assisted investigations deterministic: explicit branch decisions, replayable paths, and auditable adjudication patterns.',
    canonicalPath: '/ai-reliability/',
    ogType: 'article',
  },
  metrics: {
    title: 'TENSOR Metrics and Release Health',
    description:
      'Inspect release quality telemetry, coverage trends, and publish gate outcomes that indicate ecosystem readiness for TENSOR standard adoption.',
    canonicalPath: '/metrics/',
    ogType: 'article',
  },
  schemas: {
    title: 'TENSOR Schema Release Channel',
    description:
      'Track the TENSOR schema release channel, access current and historical schema artifacts, and verify compatibility before integrating new versions.',
    canonicalPath: '/schemas/',
    ogType: 'article',
  },
  graphs: {
    title: 'TENSOR Graph Release Channel',
    description:
      'Track the TENSOR graph release channel, compare versions, and use canonical graph artifacts to keep investigation logic interoperable.',
    canonicalPath: '/graphs/',
    ogType: 'article',
  },
  extensions: {
    title: 'TENSOR Extension Contract',
    description:
      'Implement TENSOR extensions safely with namespaced keys, portability boundaries, and anti-pattern guidance that preserves core interoperability.',
    canonicalPath: '/extensions/',
    ogType: 'article',
  },
  studio: {
    title: 'TENSOR Graph Studio',
    description:
      'Explore TENSOR graph and schema releases in a reference sandbox, inspect decision paths, and compare version diffs before production rollout.',
    canonicalPath: '/studio/',
    ogType: 'article',
  },
  investigationLab: {
    title: 'TENSOR Investigation Lab Concept Demo',
    description:
      'Experience a concept workflow for graph-native investigations: mission training mode, split-screen walkthrough mode, and human-agent collaboration traces for framework adoption.',
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
    name: 'TENSOR Standards Consortium',
    url: absoluteUrl(siteUrl, '/'),
    sameAs: ['https://github.com/tensor-standards-consortium/tensor-framework'],
  };
}
