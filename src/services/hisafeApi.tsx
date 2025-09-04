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
 // Update the requestImpl method in hisafeApi.ts to capture error details
private async requestImpl<T>(method: "GET" | "POST" | "PATCH", url: string, otherArgs?: Partial<RequestInit>, on401?: () => T): Promise<T> {
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
    location.href = await this.getAuthorizeUrl();
    if (on401) {
      return on401();
    }
    throw new Error("We shouldn't get this far. We should have left the page");
  } else {
    // ENHANCED: Capture 400 error details
    let message = await response.text();
    console.log('🔍 Raw error response:', message);
    
    if (message[0] === "{") {
      const jsonValue: any = JSON.parse(message);
      if (jsonValue.message) {
        message = jsonValue.message;
      }
      console.log('🔍 Parsed error JSON:', jsonValue);
    }

    console.error("Request failed with " + response.status, message, response);
    throw new Error(`Request failed with ${response.status}: ${message} to: ${response.url}`);
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



// Add this method to your HiSafeApi class  
getCreateFormUrl(formId: number): string {
  const params = new URLSearchParams([
    ["client_id", this.config.clientId],
    ["redirect_uri", window.location.href],
  ]);
  return `${this.config.baseUrl}/api/9.0.0/portal/${this.config.portalSlug}/create-task/${formId}?${params}`;
} 
// NEW: Utility method to update specific fields safely
async updateTaskField(taskId: number, fieldName: string, fieldValue: any) {
  const updateFields: Record<string, any> = {};
  updateFields[fieldName] = fieldValue;
  return await this.updateTask(taskId, updateFields);
}

// NEW: Utility method to update status specifically
async updateTaskStatus(taskId: number, statusId: number, statusName: string, statusType: "Open" | "InProgress" | "Closed") {
  return await this.updateTask(taskId, {
    status: {
      id: statusId,
      name: statusName,
      type: statusType
    }
  });
}
// Add this method to the HiSAFEApiService class in src/services/hisafeApi.ts
async getCurrentUser(): Promise<{ name: string | null }> {
  try {
    console.log('🔄 Getting current user info...');
    const userInfo = await this.request<{ name: string | null }>("GET", "self");
    console.log('✅ Current user info:', userInfo);
    return userInfo;
  } catch (error) {
    console.error('❌ Failed to get user info:', error);
    return { name: null };
  }
}
// NEW: Utility method to append to Comments field safely  
async appendToComments(taskId: number, newComment: string, author: string = 'User') {
  try {
    // Get current task to read existing comments
    const currentTask = await this.getTask(taskId);
    const existingComments = this.safeString(currentTask.fields?.Comments || '');
    
    // Format new comment with timestamp
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const newCommentEntry = `[${timestamp}] ${author}: ${newComment}`;
    
    // Append to existing comments
    const updatedCommentsText = existingComments 
      ? `${existingComments}\n\n${newCommentEntry}`
      : newCommentEntry;
    
    // Update the Comments field
    return await this.updateTaskField(taskId, 'Comments', updatedCommentsText);
  } catch (error) {
    console.error('Failed to append comment:', error);
    throw error;
  }
}
// FIRST: Add this debug method to src/services/hisafeApi.ts to understand field structures

async debugTaskFieldStructure(taskId: number) {
  try {
    console.log('🔍 DEBUGGING: Getting task metadata and field structure for task:', taskId);
    
    // Get task metadata (this is what we use for updates)
    const taskMetadata = await this.request("GET", `task/${taskId}`);
    console.log('📋 Task Metadata Structure:', JSON.stringify(taskMetadata, null, 2));
    
    // Also get the raw task data 
    const taskData = await this.getTask(taskId);
    console.log('📊 Raw Task Data:', JSON.stringify(taskData, null, 2));
    
    // Focus on the key fields we're trying to update
    console.group('🎯 Key Field Analysis:');
    
    if (taskData.fields?.Comments) {
      console.log('Comments field structure:', JSON.stringify(taskData.fields.Comments, null, 2));
    }
    
    if (taskData.fields?.status) {
      console.log('Status field structure:', JSON.stringify(taskData.fields.status, null, 2));
    }
    
    if (taskData.fields?.extended_description) {
      console.log('Extended Description structure:', JSON.stringify(taskData.fields.extended_description, null, 2));
    }
    
    console.groupEnd();
    
    return { taskMetadata, taskData };
    
  } catch (error) {
    console.error('Debug failed:', error);
    throw error;
  }
}

// CORRECTED: Update task method that handles object field structures properly
async updateTask(taskId: number, fields: Record<string, any>) {
  try {
    console.log('🔍 Starting task update for:', taskId);
    console.log('📝 Fields to update:', JSON.stringify(fields, null, 2));

    // STEP 1: Get task metadata to obtain editSessionToken
    const taskMetadata = await this.request("GET", `task/${taskId}`);
    
    if (!taskMetadata || !taskMetadata.editSessionToken) {
      throw new Error('Could not get edit session token for task');
    }

    console.log('🔑 Got editSessionToken:', taskMetadata.editSessionToken);

    // STEP 2: Get current task data to understand field structures
    const currentTask = await this.getTask(taskId);
    console.log('📊 Current task structure for field analysis:', {
      comments: currentTask.fields?.Comments,
      status: currentTask.fields?.status,
      extended_description: currentTask.fields?.extended_description
    });

    // STEP 3: Transform fields to match expected object structures
    const transformedFields: Record<string, any> = {};
    
    Object.entries(fields).forEach(([fieldName, fieldValue]) => {
      if (fieldName === 'Comments') {
  // FIXED: Comments field uses rich text format with value/format/operation
  if (typeof fieldValue === 'string') {
    transformedFields[fieldName] = {
      value: fieldValue,
      format: "text",
      operation: "append"  // This will add to existing comments instead of replacing
    };
  } else if (fieldValue && typeof fieldValue === 'object') {
    // If it's already properly formatted, use as-is
    transformedFields[fieldName] = fieldValue;
  } else {
    transformedFields[fieldName] = {
      value: String(fieldValue || ''),
      format: "text", 
      operation: "append"
    };
  }
  console.log('📝 Comments field transformed to:', transformedFields[fieldName]);
    } else if (fieldName === 'status') {
  // FIXED: Status field must be just the ID or name, not the full object
  if (typeof fieldValue === 'object' && fieldValue !== null) {
    // If we received an object, extract just the ID
    transformedFields[fieldName] = fieldValue.id || fieldValue.name;
  } else {
    // If it's already a simple value, use it as-is
    transformedFields[fieldName] = fieldValue;
  }
  console.log('🔧 Status field transformed to:', transformedFields[fieldName]);
      } else if (fieldName === 'extended_description') {
        // Extended description might also be an object
        if (typeof fieldValue === 'string') {
          transformedFields[fieldName] = { text: fieldValue };
        } else {
          transformedFields[fieldName] = fieldValue;
        }
      } else {
        // For other fields, use as-is
        transformedFields[fieldName] = fieldValue;
      }
    });

    console.log('🔄 Transformed fields for API:', JSON.stringify(transformedFields, null, 2));

    // STEP 4: Build request body exactly like working ApiClient.tsx pattern
    const requestBody = {
      fields: transformedFields,
      options: {
        editSessionToken: taskMetadata.editSessionToken
      }
    };
    
    console.log('📤 Final PATCH Request Body:', JSON.stringify(requestBody, null, 2));
    
    // STEP 5: Make the PATCH request
    const result = await this.request('PATCH', `task/${taskId}`, {
      body: JSON.stringify(requestBody),
      headers: {
        "Content-Type": "application/json"
      }
    });

    console.log('✅ Task update successful:', result);
    return result;

  } catch (error) {
    console.error('❌ Task update failed:', error);
    throw error;
  }
}

// SIMPLIFIED: Status update method that handles object structure
async updateTaskStatus(taskId: number, statusId: number, statusName: string, statusType: "Open" | "InProgress" | "Closed") {
  console.log(`🎯 Updating status for task ${taskId} to:`, { id: statusId, name: statusName, type: statusType });
  
  return await this.updateTask(taskId, {
    status: {
      id: statusId,
      name: statusName,
      type: statusType
    }
  });
}

// CORRECTED: Comments update that uses object structure
async appendToComments(taskId: number, newComment: string, author: string = 'User') {
  try {
    console.log(`💬 Appending comment to task ${taskId}:`, newComment);
    
    // Get current task to read existing comments
    const currentTask = await this.getTask(taskId);
    
    // Extract existing comments text from object structure
    let existingCommentsText = '';
    if (currentTask.fields?.Comments) {
      if (typeof currentTask.fields.Comments === 'object' && currentTask.fields.Comments.text) {
        existingCommentsText = String(currentTask.fields.Comments.text);
      } else if (typeof currentTask.fields.Comments === 'string') {
        existingCommentsText = currentTask.fields.Comments;
      }
    }
    
    // Format new comment with timestamp
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const newCommentEntry = `[${timestamp}] ${author}: ${newComment}`;
    
    // Append to existing comments
    const updatedCommentsText = existingCommentsText 
      ? `${existingCommentsText}\n\n${newCommentEntry}`
      : newCommentEntry;
    
    console.log('📝 Comments update details:', {
      existing: existingCommentsText,
      new: newCommentEntry,
      final: updatedCommentsText
    });
    
    // Update using object structure (Comments field expects { text: "..." })
    return await this.updateTask(taskId, {
      Comments: { text: updatedCommentsText }
    });
    
  } catch (error) {
    console.error('Failed to append comment:', error);
    throw error;
  }
}
// Helper method for safe string conversion
private safeString(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    if (value.text) return String(value.text);
    if (value.name) return String(value.name);
    if (value.value) return String(value.value);
    try {
      const stringified = JSON.stringify(value);
      return stringified === '{}' ? '' : stringified;
    } catch {
      return String(value);
    }
  }
  return String(value);
}
  // Get all tasks using the working portal approach
 // Simplified getAllTasks that doesn't depend on portal metadata
// Alternative getAllTasks that uses task search instead of portal/load
// Load tasks using the actual series IDs from portal metadata
async getAllTasks(): Promise<HiSAFETask[]> {
  try {
    console.log('🔄 Loading all tasks from HiSAFE using portal metadata series IDs...');
    
    // Step 1: Get portal metadata to find the real series IDs
    const metadata = await this.getPortalMetadata();
    console.log('📋 Portal metadata for series extraction:', metadata);
    
    // Step 2: Extract ACTUAL series IDs from metadata
    const seriesIds: number[] = [];
    if (metadata.dashboardComponents && Array.isArray(metadata.dashboardComponents)) {
      for (const component of metadata.dashboardComponents) {
        console.log('📊 Checking component:', component);
        if (component.series && Array.isArray(component.series)) {
          for (const series of component.series) {
            console.log('📈 Found series:', series);
            if (series.id) {
              seriesIds.push(series.id);
            }
          }
        }
      }
    }
    
    console.log('🎯 Extracted series IDs from metadata:', seriesIds);
    
    if (seriesIds.length === 0) {
      console.log('⚠️ No series IDs found in metadata. Full metadata structure:');
      console.log(JSON.stringify(metadata, null, 2));
      console.log('⚠️ Returning empty array - check your HiSAFE portal configuration');
      return [];
    }
    
    // Step 3: Load portal data using the REAL series IDs
    const portalData = await this.getPortalData(seriesIds);
    console.log('✅ Portal data loaded with real series IDs:', portalData);
    
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
    console.log('🔍 Detailed error info:', {
      message: error.message,
      stack: error.stack
    });
    
    // Return empty array so app doesn't crash
    return [];
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
// Add proper logout method
async logout(): Promise<void> {
  try {
    console.log('🚪 Logging out user...');
    
    // Clear all stored tokens
    localStorage.removeItem(TOKEN_LOCAL_STORAGE_KEY);
    delete this.headers["Authorization"];
    
    // Clear any stored auth codes
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(CODE_VERIFIER_SESSION_STORAGE_KEY)) {
        sessionStorage.removeItem(key);
      }
    });
    
    console.log('✅ Tokens cleared, redirecting to logout...');
    
    // Redirect to HiSAFE logout (with confirm=true to force re-login)
    location.href = await this.getAuthorizeUrl(true);
    
  } catch (error) {
    console.error('❌ Logout failed:', error);
    // Fallback: just clear everything and refresh
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
  }
}

// Add method to force fresh authentication
async forceReauth(): Promise<void> {
  try {
    console.log('🔑 Forcing fresh authentication...');
    
    // Clear all stored tokens
    localStorage.removeItem(TOKEN_LOCAL_STORAGE_KEY);
    delete this.headers["Authorization"];
    
    // Clear any stored auth codes
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(CODE_VERIFIER_SESSION_STORAGE_KEY)) {
        sessionStorage.removeItem(key);
      }
    });
    
    // Redirect to fresh auth
    location.href = await this.getAuthorizeUrl(false);
    
  } catch (error) {
    console.error('❌ Force reauth failed:', error);
    location.reload();
  }
}

// Add method to check if user is authenticated
isAuthenticated(): boolean {
  return !!this.headers["Authorization"] && !!localStorage[TOKEN_LOCAL_STORAGE_KEY];
}
}

// Create and export service instance
export const hisafeApi = new HiSAFEApiService();
export default hisafeApi;
