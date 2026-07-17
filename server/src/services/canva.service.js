const fetch = require('node-fetch');

const CANVA_API_BASE = 'https://api.canva.com/rest/v1';
const SCOPES = 'design:content:read design:content:write brandtemplate:meta:read brandtemplate:content:read asset:read asset:write';

class CanvaService {
  constructor() {
    this.clientId = process.env.CANVA_CLIENT_ID;
    this.clientSecret = process.env.CANVA_CLIENT_SECRET;
    this.redirectUri = process.env.CANVA_REDIRECT_URI;

    if (!this.clientId) {
      console.warn('[CanvaService] CANVA_CLIENT_ID not set — service will return null for all methods');
    }
  }

  _isConfigured() {
    if (!this.clientId) {
      console.warn('[CanvaService] Skipping call — CANVA_CLIENT_ID not configured');
      return false;
    }
    return true;
  }

  async _request(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
      });

      if (!response.ok) {
        const body = await response.text();
        console.error(`[CanvaService] HTTP ${response.status} from ${url}: ${body}`);
        return null;
      }

      return response.status === 204 ? null : response.json();
    } catch (err) {
      console.error(`[CanvaService] Request failed for ${url}:`, err.message);
      return null;
    }
  }

  getAuthUrl(state) {
    if (!this._isConfigured()) return null;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: SCOPES,
      state,
    });

    return `https://www.canva.com/api/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code) {
    if (!this._isConfigured()) return null;

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      code,
    });

    return this._request(`${CANVA_API_BASE}/oauth/token`, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }

  async refreshAccessToken(refreshToken) {
    if (!this._isConfigured()) return null;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    });

    const result = await this._request(`${CANVA_API_BASE}/oauth/token`, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (result) {
      result.expires_at = Date.now() + result.expires_in * 1000;
    }

    return result;
  }

  async getBrandTemplates(accessToken) {
    if (!this._isConfigured()) return null;

    return this._request(`${CANVA_API_BASE}/brand-templates`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async getTemplateDataset(accessToken, brandTemplateId) {
    if (!this._isConfigured()) return null;

    return this._request(`${CANVA_API_BASE}/brand-templates/${brandTemplateId}/dataset`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async createAutofillJob(accessToken, brandTemplateId, data) {
    if (!this._isConfigured()) return null;

    return this._request(`${CANVA_API_BASE}/autofills`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        brand_template_id: brandTemplateId,
        data,
      }),
    });
  }

  async getAutofillJob(accessToken, jobId) {
    if (!this._isConfigured()) return null;

    return this._request(`${CANVA_API_BASE}/autofills/${jobId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async exportDesign(accessToken, designId, format = 'pdf') {
    if (!this._isConfigured()) return null;

    const { job } = await this._request(`${CANVA_API_BASE}/exports`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ design_id: designId, format }),
    }) || {};

    if (!job || !job.id) {
      console.error('[CanvaService] Failed to create export job');
      return null;
    }

    for (let attempt = 1; attempt <= 30; attempt++) {
      await new Promise(r => setTimeout(r, 2000));

      const result = await this._request(`${CANVA_API_BASE}/exports/${job.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!result) return null;

      const exportJob = result.job;
      if (exportJob.status === 'success') {
        return exportJob;
      }
      if (exportJob.status === 'failed') {
        console.error(`[CanvaService] Export job ${job.id} failed:`, exportJob.error);
        return null;
      }
    }

    console.error(`[CanvaService] Export job ${job.id} timed out after 30 retries`);
    return null;
  }

  async generatePdfFromTemplate(accessToken, brandTemplateId, data) {
    if (!this._isConfigured()) return null;

    const autofillResult = await this.createAutofillJob(accessToken, brandTemplateId, data);
    if (!autofillResult || !autofillResult.job) {
      console.error('[CanvaService] Failed to create autofill job');
      return null;
    }

    const autofillJobId = autofillResult.job.id;

    let designId = null;
    for (let attempt = 1; attempt <= 30; attempt++) {
      await new Promise(r => setTimeout(r, 2000));

      const pollResult = await this.getAutofillJob(accessToken, autofillJobId);
      if (!pollResult || !pollResult.job) return null;

      const job = pollResult.job;
      if (job.status === 'completed') {
        designId = job.design_id;
        break;
      }
      if (job.status === 'failed') {
        console.error(`[CanvaService] Autofill job ${autofillJobId} failed:`, job.error);
        return null;
      }
    }

    if (!designId) {
      console.error(`[CanvaService] Autofill job ${autofillJobId} timed out`);
      return null;
    }

    const exportResult = await this.exportDesign(accessToken, designId, 'pdf');
    if (!exportResult || !exportResult.download_url) {
      console.error('[CanvaService] Failed to export design as PDF');
      return null;
    }

    try {
      const response = await fetch(exportResult.download_url);
      if (!response.ok) {
        console.error(`[CanvaService] Failed to download PDF: HTTP ${response.status}`);
        return null;
      }
      return response.buffer();
    } catch (err) {
      console.error('[CanvaService] Failed to fetch PDF buffer:', err.message);
      return null;
    }
  }
}

module.exports = new CanvaService();
