/**
 * Billing, Subscriptions and Stripe Checkout V1 Service Module
 * Handles plan limits, entitlements, checkout session creation, upgrade/downgrade logic, and idempotent Stripe webhooks.
 */

// Commercial Plans Definition
export const COMMERCIAL_PLANS = {
  free: {
    code: 'free',
    name: 'Free / Teste',
    monthlyPriceCents: 0,
    limits: { maxAgents: 1, maxWorkspaceUsers: 1, maxFiles: 5, maxStorageMb: 100, monthlyCredits: 500, maxAutomations: 0, maxActiveChannels: 1, byokEnabled: true, templatesEnabled: false, pdfReportsEnabled: false }
  },
  flash: {
    code: 'flash',
    name: 'Flash',
    monthlyPriceCents: 4990,
    limits: { maxAgents: 2, maxWorkspaceUsers: 2, maxFiles: 25, maxStorageMb: 500, monthlyCredits: 2000, maxAutomations: 3, maxActiveChannels: 2, byokEnabled: true, templatesEnabled: false, pdfReportsEnabled: false }
  },
  pro: {
    code: 'pro',
    name: 'Pro',
    monthlyPriceCents: 9990,
    limits: { maxAgents: 5, maxWorkspaceUsers: 5, maxFiles: 100, maxStorageMb: 2000, monthlyCredits: 10000, maxAutomations: 10, maxActiveChannels: 3, byokEnabled: true, templatesEnabled: true, pdfReportsEnabled: true }
  },
  max_5x: {
    code: 'max_5x',
    name: 'Max 5X',
    monthlyPriceCents: 44990,
    limits: { maxAgents: 15, maxWorkspaceUsers: 15, maxFiles: 500, maxStorageMb: 10000, monthlyCredits: 50000, maxAutomations: 25, maxActiveChannels: 5, byokEnabled: true, templatesEnabled: true, pdfReportsEnabled: true }
  },
  max_20x: {
    code: 'max_20x',
    name: 'Max 20X',
    monthlyPriceCents: 84990,
    limits: { maxAgents: 30, maxWorkspaceUsers: 30, maxFiles: 2000, maxStorageMb: 50000, monthlyCredits: 200000, maxAutomations: 100, maxActiveChannels: 10, byokEnabled: true, templatesEnabled: true, pdfReportsEnabled: true }
  },
  business: {
    code: 'business',
    name: 'Business',
    monthlyPriceCents: 119990,
    limits: { maxAgents: 100, maxWorkspaceUsers: 100, maxFiles: 10000, maxStorageMb: 200000, monthlyCredits: 1000000, maxAutomations: 500, maxActiveChannels: 25, byokEnabled: true, templatesEnabled: true, pdfReportsEnabled: true }
  },
  enterprise: {
    code: 'enterprise',
    name: 'Enterprise',
    monthlyPriceCents: 0,
    limits: { maxAgents: 9999, maxWorkspaceUsers: 9999, maxFiles: 99999, maxStorageMb: 1000000, monthlyCredits: 9999999, maxAutomations: 9999, maxActiveChannels: 999, byokEnabled: true, templatesEnabled: true, pdfReportsEnabled: true }
  }
};

/**
 * PlanLimitService
 * Centralized backend plan limit checking
 */
export const PlanLimitService = {
  getCurrentPlan(subscription) {
    const planCode = subscription?.planCode || 'pro';
    return COMMERCIAL_PLANS[planCode] || COMMERCIAL_PLANS.pro;
  },

  getLimits(subscription) {
    return this.getCurrentPlan(subscription).limits;
  },

  canCreateAgent(subscription, currentAgentCount = 0) {
    const limits = this.getLimits(subscription);
    const allowed = currentAgentCount < limits.maxAgents;
    return {
      allowed,
      current: currentAgentCount,
      limit: limits.maxAgents,
      reason: allowed ? null : `Limite de agentes atingido (${currentAgentCount}/${limits.maxAgents}). Faça upgrade para criar mais agentes.`
    };
  },

  canUploadFile(subscription, currentFileCount = 0) {
    const limits = this.getLimits(subscription);
    const allowed = currentFileCount < limits.maxFiles;
    return {
      allowed,
      current: currentFileCount,
      limit: limits.maxFiles,
      reason: allowed ? null : `Limite de arquivos na base de conhecimento atingido (${currentFileCount}/${limits.maxFiles}).`
    };
  },

  canRunAutomation(subscription, currentAutomationCount = 0) {
    const limits = this.getLimits(subscription);
    const allowed = currentAutomationCount < limits.maxAutomations;
    return {
      allowed,
      current: currentAutomationCount,
      limit: limits.maxAutomations,
      reason: allowed ? null : `Limite de automações ativas atingido (${currentAutomationCount}/${limits.maxAutomations}).`
    };
  },

  getUpgradeRecommendation(blockedAction) {
    if (blockedAction === 'create_agent') {
      return { recommendedPlan: 'max_5x', reason: 'O plano Max 5X permite até 15 agentes customizados.' };
    }
    return { recommendedPlan: 'pro', reason: 'Faça upgrade para liberar recursos avançados.' };
  }
};

/**
 * EntitlementService
 * Feature flags and permissions per plan
 */
export const EntitlementService = {
  hasFeature(subscription, featureKey) {
    const limits = PlanLimitService.getLimits(subscription);
    return Boolean(limits[featureKey]);
  },

  explainMissingFeature(featureKey) {
    if (featureKey === 'pdfReportsEnabled') {
      return 'Exportação de relatórios PDF requer o plano Pro ou superior.';
    }
    if (featureKey === 'templatesEnabled') {
      return 'Biblioteca de templates avançados requer o plano Pro ou superior.';
    }
    return 'Recurso não disponível no plano atual.';
  }
};

/**
 * BillingService
 * Manages checkout sessions and subscription states
 */
export const BillingService = {
  createCheckoutSession({ workspaceId, planCode = 'pro', successUrl, cancelUrl }) {
    const plan = COMMERCIAL_PLANS[planCode] || COMMERCIAL_PLANS.pro;
    const checkoutUrl = `https://checkout.stripe.com/mock-checkout-session?workspace_id=${workspaceId}&plan=${planCode}&amount=${plan.monthlyPriceCents}`;

    return {
      success: true,
      sessionId: `cs_test_${Date.now()}`,
      checkoutUrl,
      planCode,
      amountCents: plan.monthlyPriceCents
    };
  },

  createBillingPortalSession({ workspaceId }) {
    return {
      success: true,
      portalUrl: `https://billing.stripe.com/p/session/test_${workspaceId}`
    };
  },

  scheduleDowngrade({ subscription, targetPlanCode }) {
    if (!subscription) return { error: 'Assinatura não encontrada.' };

    subscription.pendingPlanCode = targetPlanCode;
    subscription.cancelAtPeriodEnd = false;
    subscription.updatedAt = new Date().toISOString();

    return {
      success: true,
      subscription,
      userNotice: `Downgrade agendado para o plano ${targetPlanCode}. Os recursos excedentes serão pausados no fim do ciclo sem exclusão de dados.`
    };
  }
};

/**
 * StripeWebhookService
 * Idempotent webhook handler with payload sanitization
 */
export const StripeWebhookService = {
  verifySignature(rawBody, signature, secret) {
    if (!signature && process.env.NODE_ENV !== 'test') return false;
    return true;
  },

  processEvent(event, processedEventIds = new Set()) {
    if (!event || !event.id) return { error: 'Evento inválido.' };
    if (processedEventIds.has(event.id)) {
      return { duplicate: true, message: 'Evento Stripe já processado anteriormente.' };
    }

    processedEventIds.add(event.id);
    const eventType = event.type;

    // Sanitization: Remove credit card details
    const sanitizedPayload = { ...event };
    if (sanitizedPayload.data?.object?.payment_method_details) {
      delete sanitizedPayload.data.object.payment_method_details;
    }

    return {
      success: true,
      eventId: event.id,
      eventType,
      sanitizedPayload,
      processedAt: new Date().toISOString()
    };
  }
};
