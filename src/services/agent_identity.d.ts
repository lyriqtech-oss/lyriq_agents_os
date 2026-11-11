export type AgentIdentity = {
  purpose: 'personal' | 'professional';
  audience: string;
  tone: string;
  outputs: string;
  successCriteria: string;
  autonomy: 'suggest' | 'approve' | 'bounded';
};
export type ReadinessCheck = { id: string; label: string; done: boolean };
export type AgentReadiness = { purpose: AgentIdentity['purpose']; checks: ReadinessCheck[]; completed: number; total: number; stage: 'configuring' | 'test' | 'ready'; tested: boolean };
export function normalizeAgentIdentity(value?: Partial<AgentIdentity>): AgentIdentity;
export function isValidAgentIdentity(value: unknown): boolean;
export function evaluateAgentReadiness(agent: { name?: string; role?: string; instructions?: string; boundaries?: string; installedSkills?: string[]; provider_connection_id?: string | null; model_id?: string | null; last_tested_at?: string | null; identity?: Partial<AgentIdentity> }, options?: { providerValid?: boolean }): AgentReadiness;
