export const PRODUCT_MODES = {
  personal: { id: 'personal', name: 'Personal' },
  business: { id: 'business', name: 'Business' },
};

export const PLAN_CATALOG = {
  personal: {
    free: { name: 'Free', priceCents: 0, codeProjects: 1, codeConcurrentRuns: 1 },
    pro: { name: 'Pro', priceCents: 4990, codeProjects: 10, codeConcurrentRuns: 2 },
    max: { name: 'Max', priceCents: 8990, codeProjects: 30, codeConcurrentRuns: 4 },
    max_5x: { name: 'Max 5X', priceCents: 19990, codeProjects: 100, codeConcurrentRuns: 8 },
    max_20x: { name: 'Max 20X', priceCents: 49990, codeProjects: 500, codeConcurrentRuns: 20 },
  },
  business: {
    free: { name: 'Free', priceCents: 0, seats: 2, agents: 2, codeProjects: 0 },
    pro: { name: 'Pro', priceCents: 24990, seats: 8, agents: 8, codeProjects: 0 },
    max: { name: 'Max', priceCents: 59990, seats: 20, agents: 20, codeProjects: 20, codeConcurrentRuns: 4 },
    max_5x: { name: 'Max 5X', priceCents: 129990, seats: 50, agents: 60, codeProjects: 100, codeConcurrentRuns: 10 },
    max_20x: { name: 'Max 20X', priceCents: 299990, seats: 200, agents: 250, codeProjects: 500, codeConcurrentRuns: 30 },
    enterprise: { name: 'Enterprise', priceCents: 500000, seats: null, agents: null, codeProjects: null, custom: true },
  },
};

export const PLAN_TIER_ORDER = { free: 1, pro: 2, max: 3, max_5x: 4, max_20x: 5, enterprise: 6 };

export function hasCodeAccess(mode = 'personal', tier = 'free') {
  return mode === 'personal' || (PLAN_TIER_ORDER[tier] || 0) >= PLAN_TIER_ORDER.max;
}

export function getPlan(mode = 'personal', tier = 'free') {
  return PLAN_CATALOG[mode]?.[tier] || PLAN_CATALOG.personal.free;
}
