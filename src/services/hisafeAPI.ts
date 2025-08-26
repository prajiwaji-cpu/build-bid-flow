// src/services/hisafeApi.ts

export interface HiSAFEConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  portalSlug: string;
}

export interface HiSAFETask {
  task_id: number;
  fields: Record<string, any>;
}

export interface HiSAFEAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

class HiSAFEApiService {
  private config: HiSAFEConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: HiSAFEConfig) {
    this.config = config;
  }

  // OAuth2 Authentication
  private async authenticate(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      // Step 1: Get authorization code (this is simplified - in reality you'd need PKCE)
      const authUrl = new URL(`${this.config.baseUrl}/api/9.0.0/oauth2/authorize`);
      authUrl.searchParams.set('feature_type', 'PORTAL');
      authUrl.searchParams.set('feature_key', this.config.portalSlug);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', this.config.clientId);
      authUrl.searchParams.set('redirect_uri', window.location.origin);

      // For backend integration, you'd handle this differently
      // This is a simplified approach for demonstration
      console.warn('Full OAuth2 flow needed - this is a simplified implementation');

      // Step 2: Exchange code for token (placeholder)
      const tokenResponse = await fetch(`${this.config.baseUrl}/api/9.0.0/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Timezone-IANA': 'America/New_York',
          'X-Locale': 'en-US',
          'Accept-Language': 'en-US',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: 'AUTHORIZATION_CODE_FROM_REDIRECT',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code_verifier: 'CODE_VERIFIER_FROM_PKCE'
        })
      });

      if (!tokenResponse.ok) {
        throw new Error(`Authentication failed: ${tokenResponse.statusText}`);
      }

      const authData: HiSAFEAuthResponse = await tokenResponse.json();
      this.accessToken = authData.access_token;
      this.tokenExpiry = Date.now() + (authData.expires_in * 1000);
      
      return this.accessToken;

    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error('Failed to authenticate with HiSAFE');
    }
  }

  // Get portal metadata
  async getPortalMetadata() {
    const token = await this.authenticate();
    
    const response = await fetch(`${this.config.baseUrl}/api/9.0.0/portal/metadata`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Timezone-IANA': 'America/New_York',
        'X-Locale': 'en-US',
        'Accept-Language': 'en-US',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get portal metadata: ${response.statusText}`);
    }

    return response.json();
  }

  // Load portal dashboard data (gets tasks)
  async loadPortalData(seriesIds: string[] = ['1', '2', '3']) {
    const token = await this.authenticate();
    
    const url = new URL(`${this.config.baseUrl}/api/9.0.0/portal/load`);
    seriesIds.forEach(id => url.searchParams.append('seriesId', id));
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Timezone-IANA': 'America/New_York',
        'X-Locale': 'en-US',
        'Accept-Language': 'en-US',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load portal data: ${response.statusText}`);
    }

    return response.json();
  }

  // Get task metadata for a specific form
  async getTaskMetadata(formId: number) {
    const token = await this.authenticate();
    
    const response = await fetch(`${this.config.baseUrl}/api/9.0.0/create-task/${formId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Timezone-IANA': 'America/New_York',
        'X-Locale': 'en-US',
        'Accept-Language': 'en-US',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get task metadata: ${response.statusText}`);
    }

    return response.json();
  }

  // Get specific task details
  async getTask(taskId: number) {
    const token = await this.authenticate();
    
    const response = await fetch(`${this.config.baseUrl}/api/9.0.0/task/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Timezone-IANA': 'America/New_York',
        'X-Locale': 'en-US',
        'Accept-Language': 'en-US',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get task: ${response.statusText}`);
    }

    return response.json();
  }

  // Create a new task
  async createTask(formId: number, fields: Record<string, any>) {
    const token = await this.authenticate();
    
    const response = await fetch(`${this.config.baseUrl}/api/9.0.0/task`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Timezone-IANA': 'America/New_York',
        'X-Locale': 'en-US',
        'Accept-Language': 'en-US',
      },
      body: JSON.stringify({
        fields,
        options: {}
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create task: ${response.statusText}`);
    }

    return response.json();
  }

  // Update a task
  async updateTask(taskId: number, fields: Record<string, any>) {
    const token = await this.authenticate();
    
    const response = await fetch(`${this.config.baseUrl}/api/9.0.0/task/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Timezone-IANA': 'America/New_York',
        'X-Locale': 'en-US',
        'Accept-Language': 'en-US',
      },
      body: JSON.stringify({
        fields,
        options: {}
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update task: ${response.statusText}`);
    }

    return response.json();
  }
}

// Create and export service instance
const hisafeConfig: HiSAFEConfig = {
  baseUrl: 'https://adhikari.forms.jobtraq.app',
  clientId: process.env.VITE_HISAFE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE',
  clientSecret: process.env.VITE_HISAFE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE',
  portalSlug: 'quotes'
};

export const hisafeApi = new HiSAFEApiService(hisafeConfig);
export default hisafeApi;
