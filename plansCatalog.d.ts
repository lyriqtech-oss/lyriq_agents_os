export type WorkspaceMode = 'personal' | 'business';
export type PlanTier = 'free' | 'pro' | 'max' | 'max_5x' | 'max_20x' | 'enterprise';

export interface ProductPlan {
  name: string;
  priceCents: number;
  codeProjects: number | null;
  codeConcurrentRuns?: number;
  seats?: number | null;
  agents?: number | null;
  custom?: boolean;
}

export const PRODUCT_MODES: Record<WorkspaceMode, { id: WorkspaceMode; name: string }>;
export const PLAN_CATALOG: Record<WorkspaceMode, Partial<Record<PlanTier, ProductPlan>>>;
export const PLAN_TIER_ORDER: Record<PlanTier, number>;
export function hasCodeAccess(mode?: WorkspaceMode, tier?: string): boolean;
export function getPlan(mode?: WorkspaceMode, tier?: string): ProductPlan;
