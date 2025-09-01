// src/services/hisafeApi.ts - Updated types to match actual API response structure

// Helper functions for PKCE (unchanged)
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

// UPDATED: Status object structure based on actual API response
export interface HiSAFEStatus {
  id: number;
  name: string;
  type: "Open" | "InProgress" | "Closed";
}

// UPDATED: Owner object structure
export interface HiSAFEOwner {
  contact_id: number;
  name: string;
}

// UPDATED: Assignee object structure (can be array or single object)
export interface HiSAFEAssignee {
  contact_id: number;
  name: string;
}

// UPDATED: Task field data structure to match actual API response
export interface HiSAFETaskFields {
  // Core fields that appear at the fields level based on API response
  assignee?: HiSAFEAssignee[] | HiSAFEAssignee;
  brief_description?: string;
  due_date?: string;
  job_id?: string;
  owner?: HiSAFEOwner;
  status?: HiSAFEStatus;
  
  // Additional dynamic fields that could be present
  [fieldName: string]: any;
}

// UPDATED: Main task structure matching actual API response
export interface HiSAFETask {
  task_id: number;
  fields: HiSAFETaskFields;
  
  // These may also exist at root level (fallback)
  status?: HiSAFEStatus | string;
  created_date?: string;
  updated_date?: string;
  due_date?: string;
  brief_description?: string;
  job_id?: string;
  owner?: HiSAFEOwner;
  assignee?: HiSAFEAssignee[] | HiSAFEAssignee;
}

export interface HiSAFEAuthResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

// UPDATED: List result structure from portal/load endpoint
export interface HiSAFEListResult {
  task_id: number;
  fields: HiSAFETaskFields;
}

// UPDATED: Portal data response structure
export interface HiSAFEPortalDataResponse {
  type: "list" | "gauge" | "chart" | "error";
  listResult?: HiSAFEListResult[];
  listResultCountBeforeLimiting?: number;
  values?: number[];
  groups?: any[];
  error?: string;
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
      return !!token.access_token;
    } catch {
      return false;
    }
  }

  // Initialize authentication
  async initAuth(): Promise<void> {
    if (this.hasValidToken()) {
      console.log('Using existing HiSAFE token');
      return;
    }

    // Check for auth code in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    
    if (authCode) {
      console.log('Found auth code, exchanging for token...');
      await this.exchangeCodeForToken(authCode);
      return;
    }

    // Redirect to authorization
    console.log('No token found, redirecting to authorization...');
    await this.redirectToAuthorization();
  }

  // Redirect to HiSAFE authorization
  private async redirectToAuthorization(): Promise<void> {
    const codeVerifier = generateRandomBase64Url(128);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    sessionStorage.setItem(CODE_VERIFIER_SESSION_STORAGE_KEY, codeVerifier);
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: window.location.origin + window.location.pathname,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      feature_key: this.config.portalSlug,
      state: 'auth'
    });
    
    const authUrl = `${this.config.baseUrl}/api/${this.config.apiVersion}/authorize?${params}`;
    console.log('Redirecting to:', authUrl);
    window.location.href = authUrl;
  }

  // Exchange authorization code for access token
  private async exchangeCodeForToken(code: string): Promise<void> {
    const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_SESSION_STORAGE_KEY);
    if (!codeVerifier) {
      throw new Error('No code verifier found in session storage');
    }

    const response = await fetch(this.getApiUrl('token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        code: code,
        redirect_uri: window.location.origin + window.location.pathname,
        code_verifier: codeVerifier
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
    }

    const tokenData: HiSAFEAuthResponse = await response.json();
    localStorage.setItem(TOKEN_LOCAL_STORAGE_KEY, JSON.stringify(tokenData));
    sessionStorage.removeItem(CODE_VERIFIER_SESSION_STORAGE_KEY);
    
    // Remove auth code from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    window.history.replaceState({}, document.title, url.toString());
    
    console.log('Token exchanged successfully');
  }

  // Get authorization header
  private getAuthHeader(): string {
    const tokenData = localStorage.getItem(TOKEN_LOCAL_STORAGE_KEY);
    if (!tokenData) throw new Error('No access token available');
    
    const token = JSON.parse(tokenData);
    return `Bearer ${token.access_token}`;
  }

  // Make authenticated API request
  private async request(method: string, endpoint: string, body?: any): Promise<any> {
    await this.initAuth();
    
    const url = this.getApiUrl(endpoint);
    const options: RequestInit = {
      method,
      headers: {
        ...this.headers,
        'Authorization': this.getAuthHeader()
      }
    };

    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    console.log(`HiSAFE API Request: ${method} ${endpoint}`);
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HiSAFE API Error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`HiSAFE API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`HiSAFE API Response: ${method} ${endpoint}`, data);
    return data;
  }

  // Get portal metadata
  async getPortalMetadata() {
    return this.request('GET', 'portal/metadata');
  }

  // Load portal data - UPDATED to handle the actual response structure
  async loadPortalData(seriesIds?: string[]): Promise<Record<string, HiSAFEPortalDataResponse>> {
    const queryString = seriesIds ? seriesIds.map(id => `seriesId=${id}`).join('&') : '';
    const endpoint = queryString ? `portal/load?${queryString}` : 'portal/load';
    
    return this.request('GET', endpoint);
  }

  // Get task metadata for a specific form
  async getTaskMetadata(formId: number) {
    return this.request('GET', `create-task/${formId}`);
  }

  // Get specific task details
  async getTask(taskId: number): Promise<HiSAFETask> {
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

  // UPDATED: Get all tasks with proper type handling
  async getAllTasks(): Promise<HiSAFETask[]> {
    try {
      console.log('Loading all tasks from HiSAFE...');
      
      // First try to load portal data with specific series IDs
      let portalData: Record<string, HiSAFEPortalDataResponse>;
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
        Object.entries(portalData).forEach(([seriesId, componentData]: [string, HiSAFEPortalDataResponse]) => {
          console.log(`Processing series ${seriesId}:`, componentData);
          
          if (componentData && componentData.type === 'list' && componentData.listResult) {
            console.log(`Found ${componentData.listResult.length} tasks in series ${seriesId}`);
            
            // Convert HiSAFEListResult to HiSAFETask format
            const tasks = componentData.listResult.map(item => ({
              task_id: item.task_id,
              fields: item.fields,
              // Also copy common fields to root level for compatibility
              status: item.fields.status,
              created_date: item.fields.created_date,
              updated_date: item.fields.updated_date,
              due_date: item.fields.due_date,
              brief_description: item.fields.brief_description,
              job_id: item.fields.job_id,
              owner: item.fields.owner,
              assignee: item.fields.assignee
            } as HiSAFETask));
            
            allTasks.push(...tasks);
          }
        });
      }
      
      console.log(`Total tasks loaded: ${allTasks.length}`);
      return allTasks;
      
    } catch (error) {
      console.error('Failed to load tasks from HiSAFE:', error);
      throw error;
    }
  }

  // Test connection method
  async testConnection(): Promise<boolean> {
    try {
      await this.initAuth();
      const metadata = await this.getPortalMetadata();
      console.log('HiSAFE connection test successful:', metadata);
      return true;
    } catch (error) {
      console.error('HiSAFE connection test failed:', error);
      return false;
    }
  }

  // Debug method to test specific task access
  async debugTaskAccess(taskIds: number[]): Promise<void> {
    console.group('🔬 Testing Task Access');
    
    for (const taskId of taskIds) {
      try {
        const task = await this.getTask(taskId);
        console.log(`✅ Task ${taskId}: ACCESSIBLE`, {
          brief_description: task.fields?.brief_description || task.brief_description,
          status: task.fields?.status?.name || task.status,
          due_date: task.fields?.due_date || task.due_date,
          job_id: task.fields?.job_id || task.job_id
        });
      } catch (error: any) {
        if (error.message.includes('403')) {
          console.log(`❌ Task ${taskId}: EXISTS but not accessible`);
        } else if (error.message.includes('404')) {
          console.log(`ℹ️ Task ${taskId}: DOESN'T EXIST`);
        } else {
          console.log(`⚠️ Task ${taskId}: ERROR - ${error.message}`);
        }
      }
    }
    
    console.groupEnd();
  }
}

// Create and export service instance
export const hisafeApi = new HiSAFEApiService();
export default hisafeApi;
