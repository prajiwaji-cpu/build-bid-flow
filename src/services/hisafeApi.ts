// src/services/hisafeApi.ts

// Helper functions for PKCE
function encodeBase64Url(value: Uint8Array): string {
  const base64 = btoa(String.fromCharCode.apply(null, value as any as number[]));
  return base64.split("=")[0].replace(/\+/g, "-").replace(/\//g, "_");
}

function generateRandomBase64Url(length: number): string {
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  return encodeBase64Url(randomBytes);
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const codeChallengeRaw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  return encodeBase64Url(new Uint8Array(codeChallengeRaw));
}

const CODE_VERIFIER_SESSION_STORAGE_KEY = "HISAFE_CODE_VERIFIER/";

export interface HiSAFEConfig {
  baseUrl: string;
  clientId: string;
  portalSlug: string;
  featureType: string;
  apiVersion: string;
}

export interface HiSAFETask {
  task_id: number;
  fields: Record<string, any>;
  status?: string;
  created_date?: string;
  updated_date?: string;
}

export interface HiSAFEAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

class HiSAFEApiService {
  private config: HiSAFEConfig;
  private headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Timezone-IANA': Intl.DateTimeFormat().resolvedOptions().timeZone,
    'X-Locale': Intl.NumberFormat().resolvedOptions().locale,
  };

  constructor() {
    // Use import.meta.env for Vite environment variables
    this.config = {
      baseUrl: import.meta.env.VITE_HISAFE_BASE_URL || 'https://adhikari.forms.jobtraq.app',
      clientId: import.meta.env.VITE_HISAFE_CLIENT_ID || '',
      portalSlug: import.meta.env.VITE_HISAFE_PORTAL_SLUG || 'quotes',
      featureType: 'PORTAL',
      apiVersion: '9.0.0'
    };

    if (!this.config.clientId) {
      console.error('VITE_HISAFE_CLIENT_ID is not set in environment variables');
    }
  }

  private getApiUrl(path: string): string {
    const prefix = `${this.config.baseUrl}/api/${this.config.apiVersion}`;
    return path.startsWith('/') ? prefix + path : prefix + '/' + path;
  }

  async initAuth(): Promise<boolean> {
    // Check if we're returning from auth redirect
    const params = new URLSearchParams(location.search);
    const state = params.get('state');
    
    if (state === 'auth-complete') {
      // Clean up URL
      params.delete('state');
      const qs = params.toString();
      history.replaceState(null, '', location.origin + location.pathname + (qs ? '?' + qs : ''));
      
      // Test if auth worked
      try {
        await this.testAuth();
        return true;
      } catch (error) {
        console.error('Auth test failed:', error);
        return false;
      }
    }

    // Test current auth status
    try {
      await this.testAuth();
      return true;
    } catch (error) {
      // Need to authenticate
      await this.redirectToAuth();
      return false;
    }
  }

  private async redirectToAuth(): Promise<void> {
    const codeVerifier = generateRandomBase64Url(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateRandomBase64Url(8);

    // Store verifier for later use (if switching to code flow)
    sessionStorage.setItem(CODE_VERIFIER_SESSION_STORAGE_KEY + state, codeVerifier);

    const params = new URLSearchParams([
      ['feature_type', this.config.featureType],
      ['feature_key', this.config.portalSlug],
      ['response_type', 'none'], // Frontend-only auth
      ['client_id', this.config.clientId],
      ['redirect_uri', location.href],
      ['code_challenge_method', 'S256'],
      ['code_challenge', codeChallenge],
      ['state', 'auth-complete'],
    ]);

    location.href = this.getApiUrl('oauth2/authorize?' + params.toString());
  }

  private async testAuth(): Promise<any> {
    const params = new URLSearchParams([
      ['featureType', this.config.featureType],
      ['feature', this.config.portalSlug]
    ]);

    const response = await fetch(this.getApiUrl('self?' + params.toString()), {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'include', // Important for cookie-based auth
      headers: this.headers,
      redirect: 'follow',
      referrerPolicy: 'no-referrer'
    });

    if (!response.ok) {
      throw new Error('Not authenticated');
    }

    return response.json();
  }

  // Get portal metadata
  async getPortalMetadata() {
    const isAuthenticated = await this.initAuth();
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    const params = new URLSearchParams([
      ['featureType', this.config.featureType],
      ['feature', this.config.portalSlug]
    ]);

    const response = await fetch(this.getApiUrl('portal/metadata?' + params.toString()), {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'include',
      headers: this.headers,
      redirect: 'follow',
      referrerPolicy: 'no-referrer'
    });

    if (!response.ok) {
      throw new Error(`Failed to get portal metadata: ${response.statusText}`);
    }

    return response.json();
  }

  // Load portal dashboard data (gets tasks)
  async loadPortalData(seriesIds: string[] = ['1', '2', '3']) {
    const isAuthenticated = await this.initAuth();
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    const params = new URLSearchParams([
      ['featureType', this.config.featureType],
      ['feature', this.config.portalSlug]
    ]);
    
    seriesIds.forEach(id => params.append('seriesId', id));

    const response = await fetch(this.getApiUrl('portal/load?' + params.toString()), {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'include',
      headers: this.headers,
      redirect: 'follow',
      referrerPolicy: 'no-referrer'
    });

    if (!response.ok) {
      throw new Error(`Failed to load portal data: ${response.statusText}`);
    }

    return response.json();
  }

  // Get task metadata for a specific form
  async getTaskMetadata(formId: number) {
    const isAuthenticated = await this.initAuth();
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    const params = new URLSearchParams([
      ['featureType', this.config.featureType],
      ['feature', this.config.portalSlug]
    ]);

    const response = await fetch(this.getApiUrl(`create-task/${formId}?` + params.toString()), {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'include',
      headers: this.headers,
      redirect: 'follow',
      referrerPolicy: 'no-referrer'
    });

    if (!response.ok) {
      throw new Error(`Failed to get task metadata: ${response.statusText}`);
    }

    return response.json();
  }

  // Get specific task details
  async getTask(taskId: number) {
    const isAuthenticated = await this.initAuth();
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    const params = new URLSearchParams([
      ['featureType', this.config.featureType],
      ['feature', this.config.portalSlug]
    ]);

    const response = await fetch(this.getApiUrl(`task/${taskId}?` + params.toString()), {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'include',
      headers: this.headers,
      redirect: 'follow',
      referrerPolicy: 'no-referrer'
    });

    if (!response.ok) {
      throw new Error(`Failed to get task: ${response.statusText}`);
    }

    return response.json();
  }

  // Create a new task
  async createTask(formId: number, fields: Record<string, any>) {
    const isAuthenticated = await this.initAuth();
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    const params = new URLSearchParams([
      ['featureType', this.config.featureType],
      ['feature', this.config.portalSlug]
    ]);

    const response = await fetch(this.getApiUrl('task?' + params.toString()), {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'include',
      headers: this.headers,
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({
        form_id: formId,
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
    const isAuthenticated = await this.initAuth();
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    const params = new URLSearchParams([
      ['featureType', this.config.featureType],
      ['feature', this.config.portalSlug]
    ]);

    const response = await fetch(this.getApiUrl(`task/${taskId}?` + params.toString()), {
      method: 'PATCH',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'include',
      headers: this.headers,
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
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

  // Helper method to get all tasks (quotes) with proper error handling
  async getAllTasks(): Promise<HiSAFETask[]> {
    try {
      const portalData = await this.loadPortalData();
      
      // The response structure may vary - adjust based on actual API response
      if (portalData && portalData.tasks) {
        return portalData.tasks;
      } else if (portalData && Array.isArray(portalData)) {
        return portalData;
      } else if (portalData && portalData.data && Array.isArray(portalData.data)) {
        return portalData.data;
      }
      
      console.warn('Unexpected portal data structure:', portalData);
      return [];
    } catch (error) {
      console.error('Failed to get all tasks:', error);
      throw error;
    }
  }
}

// Create and export service instance
export const hisafeApi = new HiSAFEApiService();
export default hisafeApi;
