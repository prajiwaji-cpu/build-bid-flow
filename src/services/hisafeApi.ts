// src/services/hisafeApi.ts - Fixed version with proper authentication and error handling

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
      apiVersion: '10.1.0'
    };

    if (!this.config.clientId) {
      console.warn('VITE_HISAFE_CLIENT_ID is not set in environment variables');
    }

    console.log('HiSAFE Config:', {
      baseUrl: this.config.baseUrl,
      clientId: this.config.clientId ? `${this.config.clientId.substring(0, 8)}...` : 'NOT SET',
      portalSlug: this.config.portalSlug,
      featureType: this.config.featureType,
      apiVersion: this.config.apiVersion
    });
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
    console.log('Initializing HiSAFE authentication...');
    
    // Check for auth code in URL (returning from OAuth)
    const params = new URLSearchParams(location.search);
    const authCode = params.get('code');
    const state = params.get('state');
    
    if (authCode && state) {
      console.log('Found auth code in URL, exchanging for token...');
      
      // Clean up URL first
      params.delete('code');
      params.delete('state');
      const qs = params.toString();
      history.replaceState(null, '', location.origin + location.pathname + (qs ? '?' + qs : ''));

      try {
        // Exchange code for token
        const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_SESSION_STORAGE_KEY + state);
        if (!codeVerifier) {
          throw new Error('Code verifier not found in session storage');
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
        console.log('Authentication successful!');
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
      console.log('Found stored token, testing...');
      this.setAuthHeader();
      try {
        await this.testAuth();
        console.log('Stored token is valid');
        return true;
      } catch (error) {
        console.log('Stored token invalid, re-authenticating...');
        localStorage.removeItem(TOKEN_LOCAL_STORAGE_KEY);
      }
    }

    // Need to authenticate
    console.log('No valid token found, redirecting to auth...');
    await this.redirectToAuth();
    return false;
  }

  private async exchangeCodeForToken(code: string, codeVerifier: string): Promise<HiSAFEAuthResponse> {
    const alwaysAddParams = new URLSearchParams([
      ["featureType", this.config.featureType], 
      ["feature", this.config.portalSlug]
    ]);

    const tokenUrl = this.getApiUrl("oauth2/token?" + alwaysAddParams);
    console.log('Exchanging code for token at:', tokenUrl);

    const response = await fetch(tokenUrl, {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
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
      const errorText = await response.text();
      console.error('Token exchange failed:', response.status, errorText);
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const tokenData = await response.json();
    console.log('Successfully obtained token');
    return tokenData;
  }

  private async redirectToAuth(): Promise<void> {
    if (!this.config.clientId) {
      throw new Error('Client ID is required for authentication. Please check your environment variables.');
    }

    const codeVerifier = generateRandomBase64Url(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateRandomBase64Url(8);

    // Store verifier for token exchange
    sessionStorage.setItem(CODE_VERIFIER_SESSION_STORAGE_KEY + state, codeVerifier);

    const params = new URLSearchParams([
      ['feature_type', this.config.featureType],
      ['feature_key', this.config.portalSlug],
      ['response_type', 'code'],
      ['client_id', this.config.clientId],
      ['redirect_uri', location.href],
      ['code_challenge_method', 'S256'],
      ['code_challenge', codeChallenge],
      ['state', state],
    ]);

    const authUrl = this.getApiUrl('oauth2/authorize?' + params.toString());
    console.log('Redirecting to auth URL:', authUrl);
    location.href = authUrl;
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
      headers: this.headers,
      redirect: 'follow',
      referrerPolicy: 'no-referrer'
    });

    if (!response.ok) {
      throw new Error(`Auth test failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Auth test successful:', result);
    return result;
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

    console.log(`Making API request [${method}]:`, fullUrl);
    
    const response = await fetch(fullUrl, {
      method,
      mode: 'cors',
      cache: 'no-cache',
      headers: this.headers,
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      body: body ? JSON.stringify(body) : undefined
    });

    if (response.status === 401) {
      console.log('Got 401, token expired. Re-authenticating...');
      // Token expired, re-authenticate
      localStorage.removeItem(TOKEN_LOCAL_STORAGE_KEY);
      await this.redirectToAuth();
      throw new Error('Authentication expired');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      
      let errorMessage = `Request failed: ${response.statusText}`;
      try {
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

    const result = await response.json();
    console.log(`API request successful [${method}]:`, result);
    return result;
  }

  // Get portal metadata
  async getPortalMetadata() {
    return this.request('GET', 'portal/metadata');
  }

  // Load portal dashboard data (gets tasks) - FIXED: Added proper params handling
  async loadPortalData(seriesIds: string[] = []): Promise<any> {
    const params = new URLSearchParams();
    seriesIds.forEach(id => params.append('seriesId', id));
    
    const queryString = params.toString();
    const endpoint = queryString ? `portal/load?${queryString}` : 'portal/load';
    
    return this.request('GET', endpoint);
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
      console.log('Loading all tasks from HiSAFE...');
      
      // First try to load portal data with specific series IDs
      let portalData;
      try {
        portalData = await this.loadPortalData(['1', '2', '3']);
      } catch (error) {
        console.warn('Failed to load with specific series IDs, trying without:', error);
        portalData = await this.loadPortalData();
      }
      
      console.log('Portal data loaded:', portalData);
      
      // Extract tasks from the response structure
      const allTasks: HiSAFETask[] = [];
      
      if (portalData && typeof portalData === 'object') {
        // Process each series (form) data
        Object.entries(portalData).forEach(([seriesId, componentData]: [string, any]) => {
          console.log(`Processing series ${seriesId}:`, componentData);
          
          if (componentData && componentData.type === 'list' && componentData.listResult) {
            console.log(`Found ${componentData.listResult.length} tasks in series ${seriesId}`);
            allTasks.push(...componentData.listResult);
          }
        });
      }
      
      console.log(`Total tasks loaded: ${allTasks.length}`);
      return allTasks;
    } catch (error) {
      console.error('Failed to get all tasks:', error);
      throw error;
    }
  }

  // Test connection without full auth flow
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing HiSAFE connection...');
      const metadata = await this.getPortalMetadata();
      console.log('Connection test successful:', metadata);
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  // Logout method
  logout(): void {
    console.log('Logging out of HiSAFE...');
    localStorage.removeItem(TOKEN_LOCAL_STORAGE_KEY);
    delete this.headers["Authorization"];
    
    // Clear all session storage items related to auth
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(CODE_VERIFIER_SESSION_STORAGE_KEY)) {
        sessionStorage.removeItem(key);
      }
    });
  }
}

// Create and export service instance
export const hisafeApi = new HiSAFEApiService();
export default hisafeApi;

