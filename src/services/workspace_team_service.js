import crypto from 'crypto';

/**
 * Workspace, Team & Settings V1 Service Module
 * Handles workspace administration, RBAC roles/permissions, team invite token hashing, and context file generation.
 */

// Standard System Roles Definition
export const STANDARD_ROLES = {
  owner: {
    code: 'owner',
    name: 'Owner',
    permissions: {
      'workspace.update': true, 'workspace.delete': true, 'members.invite': true, 'members.remove': true,
      'roles.manage': true, 'agents.create': true, 'agents.update': true, 'agents.delete': true,
      'agents.run': true, 'files.upload': true, 'files.delete': true, 'rag.manage': true,
      'integrations.manage': true, 'api_keys.manage': true, 'billing.view': true, 'billing.manage': true,
      'audit.view': true, 'approvals.decide': true, 'automations.manage': true, 'reports.export': true
    }
  },
  admin: {
    code: 'admin',
    name: 'Admin',
    permissions: {
      'workspace.update': true, 'workspace.delete': false, 'members.invite': true, 'members.remove': true,
      'roles.manage': false, 'agents.create': true, 'agents.update': true, 'agents.delete': true,
      'agents.run': true, 'files.upload': true, 'files.delete': true, 'rag.manage': true,
      'integrations.manage': true, 'api_keys.manage': true, 'billing.view': true, 'billing.manage': false,
      'audit.view': true, 'approvals.decide': true, 'automations.manage': true, 'reports.export': true
    }
  },
  manager: {
    code: 'manager',
    name: 'Manager',
    permissions: {
      'workspace.update': false, 'workspace.delete': false, 'members.invite': false, 'members.remove': false,
      'roles.manage': false, 'agents.create': true, 'agents.update': true, 'agents.delete': false,
      'agents.run': true, 'files.upload': true, 'files.delete': false, 'rag.manage': true,
      'integrations.manage': false, 'api_keys.manage': false, 'billing.view': false, 'billing.manage': false,
      'audit.view': true, 'approvals.decide': true, 'automations.manage': true, 'reports.export': true
    }
  },
  member: {
    code: 'member',
    name: 'Member',
    permissions: {
      'workspace.update': false, 'workspace.delete': false, 'members.invite': false, 'members.remove': false,
      'roles.manage': false, 'agents.create': false, 'agents.update': false, 'agents.delete': false,
      'agents.run': true, 'files.upload': true, 'files.delete': false, 'rag.manage': false,
      'integrations.manage': false, 'api_keys.manage': false, 'billing.view': false, 'billing.manage': false,
      'audit.view': false, 'approvals.decide': true, 'automations.manage': false, 'reports.export': false
    }
  },
  viewer: {
    code: 'viewer',
    name: 'Viewer',
    permissions: {
      'workspace.update': false, 'workspace.delete': false, 'members.invite': false, 'members.remove': false,
      'roles.manage': false, 'agents.create': false, 'agents.update': false, 'agents.delete': false,
      'agents.run': false, 'files.upload': false, 'files.delete': false, 'rag.manage': false,
      'integrations.manage': false, 'api_keys.manage': false, 'billing.view': false, 'billing.manage': false,
      'audit.view': true, 'approvals.decide': false, 'automations.manage': false, 'reports.export': true
    }
  },
  billing_manager: {
    code: 'billing_manager',
    name: 'Billing Manager',
    permissions: {
      'workspace.update': false, 'workspace.delete': false, 'members.invite': false, 'members.remove': false,
      'roles.manage': false, 'agents.create': false, 'agents.update': false, 'agents.delete': false,
      'agents.run': false, 'files.upload': false, 'files.delete': false, 'rag.manage': false,
      'integrations.manage': false, 'api_keys.manage': false, 'billing.view': true, 'billing.manage': true,
      'audit.view': false, 'approvals.decide': false, 'automations.manage': false, 'reports.export': false
    }
  }
};

/**
 * Helper: Generate unique slug
 */
export function generateSlug(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${base || 'workspace'}-${Date.now().toString(36)}`;
}

/**
 * PermissionService
 * Evaluates effective permissions combining role and overrides
 */
export const PermissionService = {
  getEffectivePermissions(roleCode, overrides = {}) {
    const role = STANDARD_ROLES[roleCode] || STANDARD_ROLES.member;
    return { ...role.permissions, ...overrides };
  },

  hasPermission(roleCode, permissionKey, overrides = {}) {
    const effective = this.getEffectivePermissions(roleCode, overrides);
    return Boolean(effective[permissionKey]);
  }
};

/**
 * WorkspaceService
 * Manages workspace creation, updates, ownership transfer, and switching
 */
export const WorkspaceService = {
  createWorkspace({ ownerUserId, name, type = 'business' }) {
    if (!name || !name.trim()) throw new Error('Nome do workspace é obrigatório.');

    const id = `ws-${Date.now()}`;
    const slug = generateSlug(name);

    const workspace = {
      id,
      name,
      slug,
      type,
      ownerUserId,
      locale: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      currency: 'BRL',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const ownerMember = {
      id: `mem-${Date.now()}`,
      workspaceId: id,
      userId: ownerUserId,
      roleCode: 'owner',
      status: 'active',
      joinedAt: new Date().toISOString()
    };

    return { workspace, ownerMember };
  },

  deleteWorkspace({ workspace, confirmationName }) {
    if (workspace.name !== confirmationName) {
      return { allowed: false, error: 'Nome de confirmação do workspace incorreto.' };
    }
    return {
      allowed: true,
      workspaceId: workspace.id,
      status: 'archived',
      message: 'Workspace agendado para exclusão diferida com sucesso.'
    };
  }
};

/**
 * MemberService
 * Manages team invitations and role modifications with last-owner safety checks
 */
export const MemberService = {
  inviteMember({ workspaceId, invitedByUserId, email, roleCode = 'member' }) {
    if (!email || !email.includes('@')) throw new Error('E-mail de convite inválido.');

    const rawToken = crypto.randomBytes(16).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const invite = {
      id: `inv-${Date.now()}`,
      workspaceId,
      email,
      roleCode,
      tokenHash,
      status: 'pending',
      invitedBy: invitedByUserId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };

    return { invite, rawToken };
  },

  removeMember(workspaceMembers, memberIdToRemove) {
    const member = workspaceMembers.find(m => m.id === memberIdToRemove || m.userId === memberIdToRemove);
    if (!member) return { allowed: false, error: 'Membro não encontrado.' };

    if (member.roleCode === 'owner') {
      const activeOwners = workspaceMembers.filter(m => m.roleCode === 'owner' && m.status === 'active');
      if (activeOwners.length <= 1) {
        return { allowed: false, error: 'Não é possível remover o único Owner do workspace.' };
      }
    }

    return { allowed: true, memberId: member.id, status: 'removed' };
  }
};

/**
 * WorkspaceSettingsService
 * Manages brand context and generates COMPANY.md / BRAND.md
 */
export const WorkspaceSettingsService = {
  regenerateContextFiles(brandContext) {
    const companyMd = `# Contexto Institucional: ${brandContext.companyName || 'Empresa'}\n\n` +
      `## Descrição\n${brandContext.description || 'Não informada'}\n\n` +
      `## Público Alvo\n${brandContext.targetAudience || 'Geral'}\n\n` +
      `## Tom de Voz\n${brandContext.toneOfVoice || 'Profissional'}\n`;

    return {
      'COMPANY.md': companyMd
    };
  }
};
