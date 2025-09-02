// src/services/hisafeApi.ts - Fixed to match the working ApiClient.tsx pattern EXACTLY

// Helper functions for PKCE (matching original)
function encodeBase64Url(value: Uint8Array): string {
  const base64 = btoa(String.fromCharCode.apply(null, value as any as number[]));
  return base64.split("=")[0].replace(/\+/g, "-").replace(/\//g, "_");
}

function generateRandomBase64Url(length: number): string {
  const codeVerifierRaw = new Uint8Array(length);
  crypto.getRandomValues(codeVerifierRaw);
  return encodeBase64Url(codeVerifierRaw);
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const codeChallengeRaw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  return encodeBase64Url(new Uint8Array(codeChallengeRaw));
}

const TOKEN_LOCAL_STORAGE_KEY = "HISAFE_AUTH_TOKEN";
const CODE_VERIFIER_SESSION_STORAGE_KEY = "HISAFE_CODE_VERIFIER/";

export interface HiSAFEConfig {
  baseUrl: string;
  clientId: string;
  portalSlug: string;
  featureType: string;
  apiVersion: string;
}

// Status object structure based on actual API response
export interface HiSAFEStatus {
  id: number;
  name: string;
  type: "Open" | "InProgress" | "Closed";
}

// Owner object structure
export interface HiSAFEOwner {
  contact_id: number;
  name: string;
}

// Assignee object structure (can be array or single object)
export interface HiSAFEAssignee {
  contact_id: number;
  name: string;
}

// Task field data structure to match actual API response
export interface HiSAFETaskFields {
  assignee?: HiSAFEAssignee[] | HiSAFEAssignee;
  brief_description?: string;
  due_date?: string;
  job_id?: string;
  owner?: HiSAFEOwner;
  status?: HiSAFEStatus;
  [fieldName: string]: any;
}

// Main task structure matching actual API response
export interface HiSAFETask {
  task_id: number;
  fields: HiSAFETaskFields;
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

export interface HiSAFEListResult {
  task_id: number;
  fields: HiSAFETaskFields;
}

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
  
  // FIXED: Match the original ApiClient headers pattern exactly
  private headers: Record<string, string> = {
    "Content-Type": 'application/json',
    "X-Timezone-IANA": Intl.DateTimeFormat().resolvedOptions().timeZone,
    "X-Locale": Intl.NumberFormat().resolvedOptions().locale,
  };
  
  // FIXED: Match the original alwaysAddParams pattern exactly
  private alwaysAddParams: URLSearchParams;

  constructor() {
    this.config = {
      baseUrl: import.meta.env.VITE_HISAFE_BASE_URL || 'https://adhikari.forms.jobtraq.app',
      clientId: import.meta.env.VITE_HISAFE_CLIENT_ID || '',
      portalSlug: import.meta.env.VITE_HISAFE_PORTAL_SLUG || 'quotes',
      featureType: 'PORTAL',
      apiVersion: '9.0.0'
    };

    // FIXED: Create alwaysAddParams exactly like original ApiClient
    this.alwaysAddParams = new URLSearchParams([
      ["featureType", this.config.featureType], 
      ["feature", this.config.portalSlug]
    ]);

    if (!this.config.clientId) {
      console.warn('VITE_HISAFE_CLIENT_ID is not set in environment variables');
    }

    console.log('HiSAFE Config (matching original):', {
      baseUrl: this.config.baseUrl,
      clientId: this.config.clientId ? `${this.config.clientId.substring(0, 8)}...` : 'NOT SET',
      portalSlug: this.config.portalSlug,
      featureType: this.config.featureType,
      apiVersion: this.config.apiVersion
    });
  }

  // FIXED: Match original getHisafeApiUrl function exactly
  private getApiUrl(path: string): string {
    const prefix = `${this.config.baseUrl}/api/${this.config.apiVersion}`;
    return path.startsWith("/") ? prefix + path : prefix + "/" + path;
  }

  // FIXED: Match original getAuthorizeUrl function exactly
  private async getAuthorizeUrl(logout: boolean = false): Promise<string> {
    const codeVerifier = generateRandomBase64Url(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateRandomBase64Url(8);

    sessionStorage[CODE_VERIFIER_SESSION_STORAGE_KEY + state] = codeVerifier;

    const params = new URLSearchParams([
        ["feature_type", this.config.featureType],
        ["feature_key", this.config.portalSlug],
        ["response_type", "code"],
        ["client_id", this.config.clientId],
        ["redirect_uri", location.href],
        ["code_challenge_method", "S256"],
        ["code_challenge", codeChallenge],
        ["state", state],
        ["confirm", JSON.stringify(logout)],
    ]);

    // FIXED: Use oauth2/authorize like original, not just authorize
    return this.getApiUrl("oauth2/authorize?" + params);
  }

  // FIXED: Match original initAuth logic exactly
  private async initAuth(): Promise<void> {
    if (this.headers["Authorization"]) {
      return; // Already authenticated
    }

    type HisafeTokens = {
      access_token: string;
      token_type: "Bearer";
    };

    const params = new URLSearchParams(location.search);
    const authCode = params.get("code");
    const state = params.get("state");
    
    if (authCode && state) {
      // Remove these from the URL (exactly like original)
      params.delete("code");
      params.delete("state");
      const qs = params.toString();
      const newUrl = location.origin + location.pathname + (qs ? "?" + qs : "");
      history.replaceState(null, "", newUrl);

      // FIXED: Use oauth2/token like original, not just token
      const result = await this.requestImpl<HisafeTokens>("POST", "oauth2/token", {
        body: JSON.stringify({
          grant_type: "authorization_code",
          code: authCode,
          client_id: this.config.clientId,
          code_verifier: sessionStorage[CODE_VERIFIER_SESSION_STORAGE_KEY + state],
        }),
        headers: {
          "Content-Type": "application/json"
        }
      });

      sessionStorage.removeItem(CODE_VERIFIER_SESSION_STORAGE_KEY + state);
      localStorage[TOKEN_LOCAL_STORAGE_KEY] = JSON.stringify(result);
    }

    if (localStorage[TOKEN_LOCAL_STORAGE_KEY]) {
      const { token_type, access_token } = JSON.parse(localStorage[TOKEN_LOCAL_STORAGE_KEY]) as HisafeTokens;
      this.headers["Authorization"] = token_type + " " + access_token;
    } else {
      location.href = await this.getAuthorizeUrl();
    }
  }

  // FIXED: Match original request function exactly
  private async request<T>(method: "GET" | "POST" | "PATCH", url: string, otherArgs?: Partial<RequestInit>, on401?: () => T): Promise<T> {
    await this.initAuth();
    return await this.requestImpl(method, url, otherArgs, on401);
  }

  // FIXED: Match original requestImpl function exactly
  private async requestImpl<T>(method: "GET" | "POST" | "PATCH", url: string, otherArgs?: Partial<RequestInit>, on401?: () => T): Promise<T> {
    // FIXED: Add alwaysAddParams exactly like original
    url += (url.includes("?") ? "&" : "?") + this.alwaysAddParams;
    
    const response = await fetch(this.getApiUrl(url), {
      method,
      mode: "cors",
      cache: "no-cache",
      redirect: "follow",
      referrerPolicy: 'no-referrer',
      ...otherArgs,
      headers: {
        ...this.headers,
        ...(otherArgs?.headers)
      }
    });

    if (response.status >= 200 && response.status <= 299) {
      return await response.json() as T;
    } else if (response.status === 401) {
      // Reauthorize (exactly like original)
      location.href = await this.getAuthorizeUrl();
      if (on401) {
        return on401();
      }
      throw new Error("We shouldn't get this far. We should have left the page");
    } else {
      // Check if there was an error message (exactly like original)
      let message = await response.text();
      if (message[0] === "{") {
        const jsonValue: any = JSON.parse(message);
        if (jsonValue.message) {
          message = jsonValue.message;
        }
      }

      if (response.status === 500) {
        alert("An unhandled error occured, you may want to reload the page and try again.\n\n" + message);
      } else {
        alert("An error occured:\n" + message);
      }

      console.error("Request failed with " + response.status, message, response);
      throw new Error(`Request failed with ${response.status} to: ${response.url}`);
    }
  }

  // FIXED: Match original getPortalMetadata exactly
  async getPortalMetadata() {
    return this.request('GET', 'portal/metadata');
  }

  // FIXED: Match original getPortalData exactly
  async getPortalData(seriesIds: number[]): Promise<Record<number, HiSAFEPortalDataResponse>> {
    const qs = seriesIds.map(s => "seriesId=" + s).join("&");
    return await this.request("GET", "portal/load?" + qs);
  }

  // Convenience method for loading portal data with string array
  async loadPortalData(seriesIds?: string[]): Promise<Record<string, HiSAFEPortalDataResponse>> {
    if (!seriesIds || seriesIds.length === 0) {
      return await this.request("GET", "portal/load");
    }
    
    const numericIds = seriesIds.map(id => parseInt(id)).filter(id => !isNaN(id));
    const result = await this.getPortalData(numericIds);
    
    // Convert keys from number to string
    const stringKeyResult: Record<string, HiSAFEPortalDataResponse> = {};
    Object.entries(result).forEach(([key, value]) => {
      stringKeyResult[key] = value;
    });
    
    return stringKeyResult;
  }

  // FIXED: Match original getTaskData exactly
  async getTask(taskId: number): Promise<any> {
    return await this.request("GET", "task/" + taskId);
  }

  // Create a new task
  async createTask(formId: number, fields: Record<string, any>) {
    return this.request('POST', 'task', {
      body: JSON.stringify({
        form_id: formId,
        fields,
        options: {}
      }),
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  // Update a task - FIXED: Match original editTaskData pattern
 // Temporary debug version in hisafeApi.ts
// Enhanced debug version in hisafeApi.ts
async updateTask(taskId: number, fields: Record<string, any>) {
  const requestBody = {
    fields,
    options: {}
  };
  
  console.log('🔍 PATCH Request Details:');
  console.log('  URL:', `task/${taskId}`);
  console.log('  TaskId:', taskId);
  console.log('  Fields Object:', JSON.stringify(fields, null, 2));
  console.log('  Full Request Body:', JSON.stringify(requestBody, null, 2));
  
  return this.request('PATCH', `task/${taskId}`, {
    body: JSON.stringify(requestBody),
    headers: {
      "Content-Type": "application/json"
    }
  });
}
  // Get all tasks using the working portal approach
  async getAllTasks(): Promise<HiSAFETask[]> {
    try {
      console.log('🔄 Loading all tasks from HiSAFE using original pattern...');
      
      // Step 1: Get portal metadata
      const metadata = await this.getPortalMetadata();
      console.log('📋 Portal metadata:', metadata);
      
      // Step 2: Extract series IDs from metadata
      const seriesIds: number[] = [];
      if (metadata.dashboardComponents) {
        for (const component of metadata.dashboardComponents) {
          if (component.series) {
            for (const series of component.series) {
              seriesIds.push(series.id);
            }
          }
        }
      }
      
      console.log('📊 Found series IDs:', seriesIds);
      
      if (seriesIds.length === 0) {
        console.warn('⚠️ No series IDs found in metadata, trying default');
        seriesIds.push(1, 2, 3); // fallback
      }
      
      // Step 3: Load portal data using original pattern
      const portalData = await this.getPortalData(seriesIds);
      console.log('✅ Portal data loaded:', portalData);
      
      // Step 4: Extract tasks from response
      const allTasks: HiSAFETask[] = [];
      
      Object.entries(portalData).forEach(([seriesId, componentData]) => {
        console.log(`🔍 Processing series ${seriesId}:`, componentData);
        
        if (componentData && componentData.type === 'list' && componentData.listResult) {
          console.log(`📊 Found ${componentData.listResult.length} tasks in series ${seriesId}`);
          
          const tasks = componentData.listResult.map(item => ({
            task_id: item.task_id,
            fields: item.fields,
            // Copy common fields to root for compatibility
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
      
      console.log(`✅ Total tasks loaded: ${allTasks.length}`);
      return allTasks;
      
    } catch (error) {
      console.error('❌ Failed to load tasks:', error);
      throw error;
    }
  }

  // Test connection method
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔧 Testing HiSAFE connection...');
      await this.initAuth();
      const metadata = await this.getPortalMetadata();
      console.log('✅ HiSAFE connection test successful:', metadata);
      return true;
    } catch (error) {
      console.error('❌ HiSAFE connection test failed:', error);
      return false;
    }
  }
}

// Create and export service instance
export const hisafeApi = new HiSAFEApiService();
export default hisafeApi;
