/**
 * Storage, Backend Limits & Paid Add-ons V1 Service Module
 * Enforces per-workspace file storage and RAG indexed limits, plan ceilings, and Stripe Add-on subscriptions.
 */

export const STORAGE_PLAN_LIMITS = {
  free: {
    storageBytes: 10 * 1024 * 1024,        // 10 MB
    ragBytes: 5 * 1024 * 1024,             // 5 MB
    maxFileSizeBytes: 5 * 1024 * 1024,     // 5 MB per file
    maxFiles: 5,
    egressBytes: 100 * 1024 * 1024,        // 100 MB
    maxStorageWithAddonBytes: 10 * 1024 * 1024, // No add-ons
    maxRagWithAddonBytes: 5 * 1024 * 1024
  },
  flash: {
    storageBytes: 50 * 1024 * 1024,        // 50 MB
    ragBytes: 20 * 1024 * 1024,            // 20 MB
    maxFileSizeBytes: 10 * 1024 * 1024,    // 10 MB
    maxFiles: 20,
    egressBytes: 500 * 1024 * 1024,       // 500 MB
    maxStorageWithAddonBytes: 1 * 1024 * 1024 * 1024, // 1 GB
    maxRagWithAddonBytes: 250 * 1024 * 1024       // 250 MB
  },
  pro: {
    storageBytes: 250 * 1024 * 1024,       // 250 MB
    ragBytes: 100 * 1024 * 1024,           // 100 MB
    maxFileSizeBytes: 25 * 1024 * 1024,    // 25 MB
    maxFiles: 100,
    egressBytes: 2 * 1024 * 1024 * 1024,   // 2 GB
    maxStorageWithAddonBytes: 5 * 1024 * 1024 * 1024, // 5 GB
    maxRagWithAddonBytes: 1 * 1024 * 1024 * 1024       // 1 GB
  },
  max_5x: {
    storageBytes: 1 * 1024 * 1024 * 1024,   // 1 GB
    ragBytes: 500 * 1024 * 1024,            // 500 MB
    maxFileSizeBytes: 50 * 1024 * 1024,    // 50 MB
    maxFiles: 500,
    egressBytes: 10 * 1024 * 1024 * 1024,  // 10 GB
    maxStorageWithAddonBytes: 25 * 1024 * 1024 * 1024, // 25 GB
    maxRagWithAddonBytes: 5 * 1024 * 1024 * 1024        // 5 GB
  },
  max_20x: {
    storageBytes: 3 * 1024 * 1024 * 1024,   // 3 GB
    ragBytes: 1 * 1024 * 1024 * 1024,       // 1 GB
    maxFileSizeBytes: 100 * 1024 * 1024,   // 100 MB
    maxFiles: 1500,
    egressBytes: 30 * 1024 * 1024 * 1024,  // 30 GB
    maxStorageWithAddonBytes: 75 * 1024 * 1024 * 1024, // 75 GB
    maxRagWithAddonBytes: 10 * 1024 * 1024 * 1024       // 10 GB
  },
  business: {
    storageBytes: 5 * 1024 * 1024 * 1024,   // 5 GB
    ragBytes: 2 * 1024 * 1024 * 1024,       // 2 GB
    maxFileSizeBytes: 150 * 1024 * 1024,   // 150 MB
    maxFiles: 3000,
    egressBytes: 60 * 1024 * 1024 * 1024,  // 60 GB
    maxStorageWithAddonBytes: 150 * 1024 * 1024 * 1024, // 150 GB
    maxRagWithAddonBytes: 25 * 1024 * 1024 * 1024        // 25 GB
  },
  enterprise: {
    storageBytes: 1000 * 1024 * 1024 * 1024,
    ragBytes: 500 * 1024 * 1024 * 1024,
    maxFileSizeBytes: 500 * 1024 * 1024,
    maxFiles: 99999,
    egressBytes: 10000 * 1024 * 1024 * 1024,
    maxStorageWithAddonBytes: 10000 * 1024 * 1024 * 1024,
    maxRagWithAddonBytes: 5000 * 1024 * 1024 * 1024
  }
};

export const AVAILABLE_ADDONS = [
  { code: 'storage_extra_1gb', name: 'Storage Extra 1GB', category: 'storage', amountCents: 1990, includedUnits: 1073741824, unitType: 'bytes' },
  { code: 'storage_extra_5gb', name: 'Storage Extra 5GB', category: 'storage', amountCents: 7990, includedUnits: 5368709120, unitType: 'bytes' },
  { code: 'storage_extra_10gb', name: 'Storage Extra 10GB', category: 'storage', amountCents: 13990, includedUnits: 10737418240, unitType: 'bytes' },
  { code: 'rag_extra_250mb', name: 'RAG Extra 250MB', category: 'rag', amountCents: 3990, includedUnits: 262144000, unitType: 'bytes' },
  { code: 'rag_extra_1gb', name: 'RAG Extra 1GB', category: 'rag', amountCents: 11990, includedUnits: 1073741824, unitType: 'bytes' },
  { code: 'egress_extra_10gb', name: 'Egress Extra 10GB', category: 'egress', amountCents: 2990, includedUnits: 10737418240, unitType: 'bytes' }
];

/**
 * StorageLimitEngine
 * Calculates effective storage/RAG limits incorporating active add-ons & plan ceilings
 */
export const StorageLimitEngine = {
  getEffectiveLimits(planCode = 'pro', activeAddons = []) {
    const base = STORAGE_PLAN_LIMITS[planCode] || STORAGE_PLAN_LIMITS.pro;

    let extraStorageBytes = 0;
    let extraRagBytes = 0;

    for (const addon of activeAddons) {
      if (addon.status === 'active') {
        const def = AVAILABLE_ADDONS.find(a => a.code === addon.addonCode);
        if (def) {
          if (def.category === 'storage') extraStorageBytes += def.includedUnits * (addon.quantity || 1);
          if (def.category === 'rag') extraRagBytes += def.includedUnits * (addon.quantity || 1);
        }
      }
    }

    const calculatedStorage = base.storageBytes + extraStorageBytes;
    const calculatedRag = base.ragBytes + extraRagBytes;

    const effectiveStorage = Math.min(calculatedStorage, base.maxStorageWithAddonBytes);
    const effectiveRag = Math.min(calculatedRag, base.maxRagWithAddonBytes);

    return {
      planCode,
      baseStorageBytes: base.storageBytes,
      baseRagBytes: base.ragBytes,
      extraStorageBytes,
      extraRagBytes,
      effectiveStorageBytes: effectiveStorage,
      effectiveRagBytes: effectiveRag,
      maxStorageCeilingBytes: base.maxStorageWithAddonBytes,
      maxRagCeilingBytes: base.maxRagWithAddonBytes,
      maxFileSizeBytes: base.maxFileSizeBytes,
      maxFiles: base.maxFiles
    };
  },

  canUploadFile({ currentStorageBytes, newFileSizeBytes, planCode = 'pro', activeAddons = [] }) {
    const limits = this.getEffectiveLimits(planCode, activeAddons);

    if (newFileSizeBytes > limits.maxFileSizeBytes) {
      return { allowed: false, error: `O arquivo ultrapassa o tamanho máximo permitido por arquivo de ${Math.round(limits.maxFileSizeBytes / 1024 / 1024)} MB.` };
    }

    if (currentStorageBytes + newFileSizeBytes > limits.effectiveStorageBytes) {
      return {
        allowed: false,
        error: `Seu workspace atingiu o limite de File Storage de ${Math.round(limits.effectiveStorageBytes / 1024 / 1024)} MB. Desindexe/apague arquivos antigos ou adquira Storage Extra.`,
        recommendation: 'buy_storage_addon_or_upgrade'
      };
    }

    return { allowed: true };
  },

  canIndexFile({ currentRagBytes, newRagBytes, planCode = 'pro', activeAddons = [] }) {
    const limits = this.getEffectiveLimits(planCode, activeAddons);

    if (currentRagBytes + newRagBytes > limits.effectiveRagBytes) {
      return {
        allowed: false,
        error: `Seu workspace atingiu o limite de RAG indexado em banco de ${Math.round(limits.effectiveRagBytes / 1024 / 1024)} MB. Desindexe documentos ou adquira RAG Extra.`,
        recommendation: 'buy_rag_addon_or_upgrade'
      };
    }

    return { allowed: true };
  }
};

/**
 * AddonBillingService
 * Manages Add-on purchases & Stripe subscription items
 */
export const AddonBillingService = {
  listAvailableAddons() {
    return AVAILABLE_ADDONS;
  },

  purchaseAddon({ workspaceId, addonCode, quantity = 1 }) {
    const addon = AVAILABLE_ADDONS.find(a => a.code === addonCode);
    if (!addon) throw new Error('Add-on não encontrado.');

    return {
      sessionId: `cs_addon_${Date.now()}`,
      checkoutUrl: `https://checkout.stripe.com/test-addon?workspace=${workspaceId}&addon=${addonCode}&qty=${quantity}`,
      addonCode,
      amountCents: addon.amountCents * quantity
    };
  }
};
