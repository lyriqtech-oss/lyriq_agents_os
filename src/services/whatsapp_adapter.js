import crypto from 'crypto';

/**
 * WhatsApp Provider Adapter - Meta Cloud API V1 Implementation
 */
export class MetaCloudWhatsAppAdapter {
  constructor(options = {}) {
    this.provider = 'meta_cloud';
    this.apiVersion = options.apiVersion || 'v20.0';
    this.baseUrl = options.baseUrl || `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Verify Webhook GET request from Meta
   */
  async verifyWebhook({ hubMode, hubVerifyToken, hubChallenge, expectedVerifyToken }) {
    if (hubMode === 'subscribe' && hubVerifyToken && expectedVerifyToken && hubVerifyToken === expectedVerifyToken) {
      return {
        success: true,
        challenge: hubChallenge
      };
    }
    return {
      success: false,
      error: 'WEBHOOK_VERIFICATION_FAILED',
      message: 'Token de verificação inválido ou modo incorreto.'
    };
  }

  /**
   * Validate webhook X-Hub-Signature-256 header using App Secret and Raw Body
   */
  verifySignature(rawBody, signatureHeader, appSecret) {
    if (!appSecret) {
      return { valid: true, mode: 'unverified_secret_missing' };
    }
    if (!signatureHeader) {
      return { valid: false, error: 'SIGNATURE_HEADER_MISSING' };
    }

    const elements = signatureHeader.split('=');
    const signatureHash = elements[1] || '';
    const expectedHash = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    const bufA = Buffer.from(signatureHash, 'hex');
    const bufB = Buffer.from(expectedHash, 'hex');

    if (bufA.length !== bufB.length) {
      return { valid: false };
    }

    const isValid = crypto.timingSafeEqual(bufA, bufB);
    return { valid: isValid };
  }

  /**
   * Parse Meta Cloud Inbound Webhook Payload into normalized events array
   */
  async parseInboundWebhook(payload) {
    const events = [];

    if (!payload || payload.object !== 'whatsapp_business_account' || !payload.entry) {
      return events;
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value) continue;

        const metadata = value.metadata || {};
        const phoneNumberId = metadata.phone_number_id;

        // Process inbound messages
        if (value.messages && Array.isArray(value.messages)) {
          const contactMap = {};
          if (value.contacts && Array.isArray(value.contacts)) {
            for (const c of value.contacts) {
              contactMap[c.wa_id] = {
                waId: c.wa_id,
                displayName: c.profile?.name || c.wa_id,
                profileName: c.profile?.name
              };
            }
          }

          for (const msg of value.messages) {
            const senderWaId = msg.from;
            const contact = contactMap[senderWaId] || { waId: senderWaId, displayName: senderWaId };

            let msgType = msg.type || 'unknown';
            let text = null;
            let mediaId = null;
            let mimeType = null;
            let filename = null;
            let caption = null;

            if (msgType === 'text') {
              text = msg.text?.body || '';
            } else if (msgType === 'image') {
              mediaId = msg.image?.id;
              mimeType = msg.image?.mime_type;
              caption = msg.image?.caption;
            } else if (msgType === 'audio') {
              mediaId = msg.audio?.id;
              mimeType = msg.audio?.mime_type;
            } else if (msgType === 'document') {
              mediaId = msg.document?.id;
              mimeType = msg.document?.mime_type;
              filename = msg.document?.filename;
              caption = msg.document?.caption;
            } else if (msgType === 'interactive') {
              text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '[Resposta Interativa]';
            } else if (msgType === 'button') {
              text = msg.button?.text || '[Botão]';
            }

            events.push({
              provider: 'meta_cloud',
              connectionId: phoneNumberId,
              providerMessageId: msg.id,
              eventType: 'message_received',
              timestamp: msg.timestamp ? new Date(parseInt(msg.timestamp) * 1000).toISOString() : new Date().toISOString(),
              contact: {
                waId: contact.waId,
                displayName: contact.displayName,
                profileName: contact.profileName
              },
              message: {
                type: msgType,
                text,
                mediaId,
                mimeType,
                filename,
                caption,
                raw: msg
              },
              raw: payload
            });
          }
        }

        // Process message status updates (sent, delivered, read, failed)
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const st of value.statuses) {
            events.push({
              provider: 'meta_cloud',
              connectionId: phoneNumberId,
              providerMessageId: st.id,
              eventType: 'message_status',
              timestamp: st.timestamp ? new Date(parseInt(st.timestamp) * 1000).toISOString() : new Date().toISOString(),
              contact: {
                waId: st.recipient_id
              },
              status: {
                status: st.status, // 'sent' | 'delivered' | 'read' | 'failed'
                errorCode: st.errors?.[0]?.code ? String(st.errors[0].code) : null,
                errorMessage: st.errors?.[0]?.title || st.errors?.[0]?.message || null
              },
              raw: payload
            });
          }
        }
      }
    }

    return events;
  }

  /**
   * Send text message via Meta Cloud API
   */
  async sendText({ phoneNumberId, accessToken, to, text }) {
    if (!phoneNumberId || !accessToken || !to || !text) {
      throw new Error('Parâmetros obrigatórios ausentes para envio de mensagem de texto.');
    }

    if (accessToken.startsWith('mock-') || accessToken.startsWith('bW9jay')) {
      return {
        success: true,
        providerMessageId: `wamid.mock.${Date.now()}.${Math.random().toString(36).substring(7)}`,
        status: 'sent'
      };
    }

    const response = await fetch(`${this.baseUrl}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/\D/g, ''),
        type: 'text',
        text: { preview_url: false, body: text }
      })
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error?.message || 'Erro ao enviar mensagem via Meta Cloud API.');
    }

    return {
      success: true,
      providerMessageId: json.messages?.[0]?.id,
      status: 'sent'
    };
  }

  /**
   * Send approved template message
   */
  async sendTemplate({ phoneNumberId, accessToken, to, templateName, language = 'pt_BR', components = [] }) {
    if (!phoneNumberId || !accessToken || !to || !templateName) {
      throw new Error('Parâmetros para envio de template ausentes.');
    }

    if (accessToken.startsWith('mock-') || accessToken.startsWith('bW9jay')) {
      return {
        success: true,
        providerMessageId: `wamid.mock.tmpl.${Date.now()}`,
        status: 'sent'
      };
    }

    const response = await fetch(`${this.baseUrl}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''),
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          components
        }
      })
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error?.message || 'Erro ao enviar template via Meta Cloud API.');
    }

    return {
      success: true,
      providerMessageId: json.messages?.[0]?.id,
      status: 'sent'
    };
  }

  /**
   * Validate Connection / Token against Meta Cloud API
   */
  async validateConnection({ phoneNumberId, wabaId, accessToken }) {
    if (!phoneNumberId || !accessToken) {
      return {
        valid: false,
        error: 'CREDENTIALS_MISSING',
        message: 'Phone Number ID e Access Token são obrigatórios.'
      };
    }

    if (accessToken.startsWith('mock-') || accessToken.startsWith('bW9jay')) {
      return {
        valid: true,
        phoneNumberId,
        wabaId: wabaId || '987654321098765',
        displayPhoneNumber: '+55 11 99999-8888',
        verifiedName: 'Lyriq Agents Business Test'
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/${phoneNumberId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();

      if (!res.ok) {
        return {
          valid: false,
          error: 'PROVIDER_AUTH_FAILED',
          message: data.error?.message || 'Falha ao autenticar com a Meta API.'
        };
      }

      return {
        valid: true,
        phoneNumberId: data.id,
        displayPhoneNumber: data.display_phone_number,
        verifiedName: data.verified_name
      };
    } catch (err) {
      return {
        valid: false,
        error: 'CONNECTION_ERROR',
        message: err.message
      };
    }
  }
}
