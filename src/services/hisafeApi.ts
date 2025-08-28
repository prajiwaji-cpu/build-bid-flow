// src/services/hisafeApi.ts - Fixed version with token authentication

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
const TOKEN_LOCAL_STORAGE_KEY = "HISAFE_AUTH_TOKEN";

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
  expires_in?: number;
}

class HiSAFEApiService {
  private config: HiSAFEConfig;
  private headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Timezone-IANA': Intl.DateTimeFormat().resolvedOptions().timeZone,
    'X-Locale': Intl.NumberFormat().resolvedOptions().locale,
  };

  constructor() {
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

  // Check if we have a valid token
  private hasValidToken(): boolean {
    try {
      const tokenData = localStorage.getItem(TOKEN_LOCAL_STORAGE_KEY);
      if (!tokenData) return false;
      
      const token = JSON.parse(tokenData);
      return !!(token.access_token && token.token_type);
    } catch {
      return false;
    }
  }

  // Set authorization header from stored token
  private setAuthHeader(): void {
    try {
      const tokenData = localStorage.getItem(TOKEN_LOCAL_STORAGE_KEY);
      if (tokenData) {
        const token = JSON.parse(tokenData);
        this.headers["Authorization"] = `${token.token_type} ${token.access_token}`;
      } else {
        delete this.headers["Authorization"];
      }
    } catch (error) {
      console.error('Error setting auth header:', error);
      delete this.headers["Authorization"];
    }
  }

  async initAuth(): Promise<boolean> {
    // Check for auth code in URL (returning from OAuth)
    const params = new URLSearchParams(location.search);
    const authCode = params.get('code');
    const state = params.get('state');
    
    if (authCode && state) {
      // Clean up URL first
      params.delete('code');
      params.delete('state');
      const qs = params.toString();
      history.replaceState(null, '', location.origin + location.pathname + (qs ? '?' + qs : ''));

      try {
        // Exchange code for token
        const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_SESSION_STORAGE_KEY + state);
        if (!codeVerifier) {
          throw new Error('Code verifier not found');
        }

        const tokenResponse = await this.exchangeCodeForToken(authCode, codeVerifier);
        
        // Store token
        localStorage.setItem(TOKEN_LOCAL_STORAGE_KEY, JSON.stringify(tokenResponse));
        
        // Clean up session storage
        sessionStorage.removeItem(CODE_VERIFIER_SESSION_STORAGE_KEY + state);
        
        // Set auth header
        this.setAuthHeader();
        
        // Test the token
        await this.testAuth();
        return true;
        
      } catch (error) {
        console.error('Failed to exchange code for token:', error);
        localStorage.removeItem(TOKEN_LOCAL_STORAGE_KEY);
        // Redirect to auth
        await this.redirectToAuth();
        return false;
      }
    }

    // Check if we have a stored token
    if (this.hasValidToken()) {
      this.setAuthHeader();
      try {
        await this.testAuth();
        return true;
      } catch (error) {
        console.log('Stored token invalid, re-authenticating...');
        localStorage.removeItem(TOKEN_LOCAL_STORAGE_KEY);
      }
    }

    // Need to authenticate
    await this.redirectToAuth();
    return false;
  }

  private async exchangeCodeForToken(code: string, codeVerifier: string): Promise<HiSAFEAuthResponse> {
    const alwaysAddParams = new URLSearchParams([
      ["featureType", this.config.featureType], 
      ["feature", this.config.portalSlug]
    ]);

    const response = await fetch(this.getApiUrl("oauth2/token?" + alwaysAddParams), {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      // Remove credentials: 'include' - use token instead
      headers: {
        "Content-Type": "application/json"
      },
      redirect: "follow",
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: code,
        client_id: this.config.clientId,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async redirectToAuth(): Promise<void> {
    const codeVerifier = generateRandomBase64Url(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateRandomBase64Url(8);

    // Store verifier for token exchange
    sessionStorage.setItem(CODE_VERIFIER_SESSION_STORAGE_KEY + state, codeVerifier);

    const params = new URLSearchParams([
      ['feature_type', this.config.featureType],
      ['feature_key', this.config.portalSlug],
      ['response_type', 'code'], // Use authorization code flow
      ['client_id', this.config.clientId],
      ['redirect_uri', location.href],
      ['code_challenge_method', 'S256'],
      ['code_challenge', codeChallenge],
      ['state', state],
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
      // Remove credentials: 'include' - use Authorization header instead
      headers: this.headers,
      redirect: 'follow',
      referrerPolicy: 'no-referrer'
    });

    if (!response.ok) {
      throw new Error(`Auth test failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Generic API request method
  private async request<T>(method: string, url: string, body?: any): Promise<T> {
    const isAuthenticated = await this.initAuth();
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    const alwaysAddParams = new URLSearchParams([
      ["featureType", this.config.featureType],
      ["feature", this.config.portalSlug]
    ]);
    
    const separator = url.includes('?') ? '&' : '?';
    const fullUrl = this.getApiUrl(url) + separator + alwaysAddParams;

    const response = await fetch(fullUrl, {
      method,
      mode: 'cors',
      cache: 'no-cache',
      // Remove credentials: 'include' - use Authorization header
      headers: this.headers,
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      body: body ? JSON.stringify(body) : undefined
    });

    if (response.status === 401) {
      // Token expired, re-authenticate
      localStorage.removeItem(TOKEN_LOCAL_STORAGE_KEY);
      location.href = await this.redirectToAuth();
      throw new Error('Authentication expired');
    }

    if (!response.ok) {
      let errorMessage = `Request failed: ${response.statusText}`;
      try {
        const errorText = await response.text();
        if (errorText.startsWith('{')) {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        }
      } catch {
        // Use default error message
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Get portal metadata
  async getPortalMetadata() {
    return this.request('GET', 'portal/metadata');
  }

  // Load portal dashboard data (gets tasks)
  async loadPortalData(seriesIds: string[] = ['1', '2', '3']) {
    const params = new URLSearchParams();
    seriesIds.forEach(id => params.append('seriesId', id));
    return this.request('GET', `portal/load?${params}`);
  }

  // Get task metadata for a specific form
  async getTaskMetadata(formId: number) {
    return this.request('GET', `create-task/${formId}`);
  }

  // Get specific task details
  async getTask(taskId: number) {
    return this.request('GET', `task/${taskId}`);
  }

  // Create a new task
  async createTask(formId: number, fields: Record<string, any>) {
    return this.request('POST', 'task', {
      form_id: formId,
      fields,
      options: {}
    });
  }

  // Update a task
  async updateTask(taskId: number, fields: Record<string, any>) {
    return this.request('PATCH', `task/${taskId}`, {
      fields,
      options: {}
    });
  }

  // Helper method to get all tasks (quotes) with proper error handling
  async getAllTasks(): Promise<HiSAFETask[]> {
    try {
      const portalData = await this.loadPortalData();
      
      // Extract tasks from the response structure
      const allTasks: HiSAFETask[] = [];
      
      // Process each series (form) data
      Object.entries(portalData).forEach(([seriesId, componentData]: [string, any]) => {
        if (componentData.type === 'list' && componentData.listResult) {
          allTasks.push(...componentData.listResult);
        }
      });
      
      return allTasks;
    } catch (error) {
      console.error('Failed to get all tasks:', error);
      throw error;
    }
  }

  // Logout method
  logout(): void {
    localStorage.removeItem(TOKEN_LOCAL_STORAGE_KEY);
    delete this.headers["Authorization"];
    // Optionally redirect to login
    // location.reload();
  }
}

// Create and export service instance
export const hisafeApi = new HiSAFEApiService();
export default hisafeApi;

// Create and export service instance
import hisafeApi from "@/services/hisafeApi";

