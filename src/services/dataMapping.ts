// src/services/dataMapping.ts - Fixed version with correct API response structure
import { QuoteRequest, QuoteStatus, Comment } from '@/types/quote';
import { HiSAFETask } from './hisafeApi';

// Expanded field mapping configuration with many more fields
export const FIELD_MAPPINGS = {
  // Client/Customer Information - Expanded with more possible field names
  clientName: [
    'Customer Name', 'customer_name', 'name', 'client_name', 'Name', 
    'Customer.Name', 'Client Name', 'Contact Name', 'contact_name',
    'Requestor', 'requestor', 'Customer', 'customer', 'Client', 'client',
    'Company Name', 'company_name', 'Organization', 'organization'
  ],
  clientEmail: [
    'Customer Email', 'Email', 'customer_email', 'email', 'client_email', 
    'Customer.Email', 'Customer.E-mail Address', 'Contact Email', 'contact_email',
    'E-mail', 'e_mail', 'Email Address', 'email_address'
  ], 
  clientPhone: [
    'Customer Phone', 'Phone', 'customer_phone', 'phone', 'Customer.Phone',
    'Contact Phone', 'contact_phone', 'Phone Number', 'phone_number',
    'Mobile', 'mobile', 'Cell Phone', 'cell_phone', 'Telephone', 'telephone'
  ],
  
  // Project Information - Greatly expanded
  projectType: [
    'Project Type', 'Task Form', 'task_form', 'project_type', 'type', 'form_name',
    'Service Type', 'service_type', 'Work Type', 'work_type', 'Category', 'category',
    'Job Type', 'job_type', 'Request Type', 'request_type'
  ],
  projectDescription: [
    'brief_description', 'Item/Part Name', 'item_part_name', 'project_description', 
    'details', 'summary', 'description', 'Description', 'Project Description',
    'Work Description', 'work_description', 'Scope', 'scope', 'Requirements', 'requirements',
    'Details', 'Job Description', 'job_description', 'Task Description', 'task_description'
  ],
  
  // Timeline and Dates
  estimatedNeedByDate: [
    'due_date', 'Estimated Need by Date', 'need_by_date', 'timeline', 'deadline',
    'Due Date', 'Target Date', 'target_date', 'Completion Date', 'completion_date',
    'Required By', 'required_by', 'Delivery Date', 'delivery_date'
  ],
  
  // Financial Information - Expanded
  estimatedCost: [
    'Quote Total', 'Total Cost', 'Cost', 'Price', 'quote_total', 'total', 'cost', 'amount', 'price',
    'Estimated Cost', 'estimated_cost', 'Budget', 'budget', 'Quote Amount', 'quote_amount',
    'Total Price', 'total_price', 'Final Cost', 'final_cost', 'Contract Value', 'contract_value'
  ],
  
  // Location Information - New
  location: [
    'Location', 'location', 'Address', 'address', 'Site', 'site', 'Job Site', 'job_site',
    'Project Location', 'project_location', 'Work Location', 'work_location',
    'Street Address', 'street_address', 'City', 'city', 'State', 'state'
  ],
  
  // Contact Information - Additional fields
  contactInfo: [
    'Additional Contact', 'additional_contact', 'Secondary Contact', 'secondary_contact',
    'Emergency Contact', 'emergency_contact', 'Alternate Phone', 'alternate_phone'
  ],
  
  // Technical/Equipment Information - New
  equipment: [
    'Equipment', 'equipment', 'Model', 'model', 'Serial Number', 'serial_number',
    'Part Number', 'part_number', 'Asset', 'asset', 'Unit', 'unit'
  ],
  
  // Priority/Urgency - New
  priority: [
    'Priority', 'priority', 'Urgency', 'urgency', 'Importance', 'importance',
    'Rush Job', 'rush_job', 'Emergency', 'emergency'
  ],
  
  // Additional Business Information - New
  department: [
    'Department', 'department', 'Division', 'division', 'Business Unit', 'business_unit',
    'Cost Center', 'cost_center', 'Account', 'account'
  ],
  
  // Existing core fields
  jobId: ['job_id', 'Job ID', 'Job Number', 'Work Order', 'work_order', 'Ticket Number', 'ticket_number'],
  comments: ['Comments', 'comments', 'Notes', 'notes', 'remarks', 'Internal Notes', 'Special Instructions', 'special_instructions'],
  
  // System fields
  status: ['status'],
  assignee: ['assignee'],
  owner: ['owner'],
  createdDate: ['post_date', 'created_date', 'date_created', 'submitted_date'],
  updatedDate: ['updated_date', 'updated_at', 'date_updated', 'last_modified', 'modified_date'],
};

// Status mapping between your app and HiSAFE - Updated based on your actual statuses
export const STATUS_MAPPINGS = {
  // HiSAFE status name -> Your app status
  fromHiSAFE: {
    'Awaiting Approval': 'pending' as QuoteStatus,
    'Awaiting Quote Generation': 'processing' as QuoteStatus,
    'Work in Progress': 'processing' as QuoteStatus,
    'Quote Complete': 'approved' as QuoteStatus,
    'Quote Denied': 'denied' as QuoteStatus,
    'Cancelled': 'denied' as QuoteStatus,
    'Completed': 'approved' as QuoteStatus,
    'Closed': 'approved' as QuoteStatus,
    // Add any other status names you encounter
    'Open': 'pending' as QuoteStatus,
    'In Progress': 'processing' as QuoteStatus,
    'New': 'pending' as QuoteStatus,
    'Draft': 'pending' as QuoteStatus,
  },
  // Your app status -> HiSAFE status name
  toHiSAFE: {
    'pending': 'Awaiting Approval',
    'processing': 'Work in Progress', 
    'approved': 'Quote Complete',
    'denied': 'Quote Denied',
  }
};

export class DataMappingService {
  
  // Convert HiSAFE task to QuoteRequest - Fixed to handle correct API structure
  static mapTaskToQuote(task: HiSAFETask): QuoteRequest {
    console.log('Mapping task:', task.task_id, 'with fields:', task.fields ? Object.keys(task.fields) : 'NO FIELDS');
    
    const fields = task.fields || {};
    
    // Helper function to safely get field values using multiple possible field names
    const getFieldValue = (possibleFieldNames: string[], defaultValue: any = '') => {
      for (const fieldName of possibleFieldNames) {
        // Handle nested field names like 'Customer.Name'
        if (fieldName.includes('.')) {
          const parts = fieldName.split('.');
          let value = fields;
          for (const part of parts) {
            value = value?.[part];
            if (value === undefined || value === null) break;
          }
          if (value !== undefined && value !== null && value !== '') return value;
        } else {
          // Direct field access
          const value = fields[fieldName];
          if (value !== undefined && value !== null && value !== '') return value;
        }
      }
      return defaultValue;
    };
    
    // FIXED: Handle status object correctly based on API response structure
    let rawStatus = 'pending';
    let mappedStatus: QuoteStatus = 'pending';
    
    // Check multiple possible locations for status
    if (fields.status && typeof fields.status === 'object' && fields.status.name) {
      // Status is an object with name property (as shown in your example)
      rawStatus = fields.status.name;
    } else if (fields.status && typeof fields.status === 'string') {
      // Status is a direct string
      rawStatus = fields.status;
    } else if (task.status && typeof task.status === 'object' && task.status.name) {
      // Status at task level as object
      rawStatus = task.status.name;
    } else if (task.status && typeof task.status === 'string') {
      // Status at task level as string
      rawStatus = task.status;
    }
    
    // Map to our app's status
    mappedStatus = STATUS_MAPPINGS.fromHiSAFE[rawStatus as keyof typeof STATUS_MAPPINGS.fromHiSAFE] || 'pending';
    
    // FIXED: Handle owner and assignee objects correctly
    const getOwnerName = () => {
      if (fields.owner && typeof fields.owner === 'object' && fields.owner.name) {
        return fields.owner.name;
      }
      if (task.owner && typeof task.owner === 'object' && task.owner.name) {
        return task.owner.name;
      }
      return '';
    };
    
    const getAssigneeName = () => {
      // Handle assignee array as shown in your API response
      if (fields.assignee && Array.isArray(fields.assignee) && fields.assignee.length > 0) {
        return fields.assignee[0]?.name || '';
      }
      if (fields.assignee && typeof fields.assignee === 'object' && fields.assignee.name) {
        return fields.assignee.name;
      }
      if (task.assignee && Array.isArray(task.assignee) && task.assignee.length > 0) {
        return task.assignee[0]?.name || '';
      }
      if (task.assignee && typeof task.assignee === 'object' && task.assignee.name) {
        return task.assignee.name;
      }
      return '';
    };
    
    const ownerName = getOwnerName();
    const assigneeName = getAssigneeName();
    
    // Build the quote object with expanded field mapping
    const quote: QuoteRequest = {
      id: task.task_id.toString(),
      clientName: this.cleanString(
        getFieldValue(FIELD_MAPPINGS.clientName) || 
        ownerName || 
        assigneeName || 
        `Job ${fields.job_id || task.task_id}`
      ),
      clientEmail: this.cleanString(getFieldValue(FIELD_MAPPINGS.clientEmail) || 'unknown@example.com'),
      clientPhone: this.cleanString(getFieldValue(FIELD_MAPPINGS.clientPhone)),
      projectType: this.cleanString(getFieldValue(FIELD_MAPPINGS.projectType) || 'General Quote'),
      projectDescription: this.cleanString(
        getFieldValue(FIELD_MAPPINGS.projectDescription) || 
        fields.brief_description || 
        'Project details not specified'
      ),
      budget: this.cleanString(getFieldValue(['Budget', 'budget', 'estimated_budget'])),
      timeline: this.cleanString(
        getFieldValue(FIELD_MAPPINGS.estimatedNeedByDate) || 
        this.formatDate(fields.due_date) ||
        this.formatDate(task.due_date)
      ),
      location: this.cleanString(getFieldValue(FIELD_MAPPINGS.location)),
      status: mappedStatus,
      submittedAt: this.formatDate(
        getFieldValue(FIELD_MAPPINGS.createdDate) || 
        task.created_date || 
        new Date().toISOString()
      ),
      updatedAt: this.formatDate(
        getFieldValue(FIELD_MAPPINGS.updatedDate) || 
        task.updated_date || 
        task.created_date || 
        new Date().toISOString()
      ),
      estimatedCost: this.parseNumber(getFieldValue(FIELD_MAPPINGS.estimatedCost)),
      notes: this.cleanString(
        getFieldValue(['Notes', 'notes', 'remarks', 'additional_info', 'special_instructions']) ||
        `Job ID: ${fields.job_id || 'N/A'} | Owner: ${ownerName} | Assignee: ${assigneeName}`
      ),
      comments: this.parseComments(fields, task)
    };
    
    // Enhanced debug log with status information
    console.log('Mapped quote:', {
      id: quote.id,
      clientName: quote.clientName,
      projectDescription: quote.projectDescription,
      estimatedCost: quote.estimatedCost,
      status: quote.status,
      originalStatus: rawStatus,
      statusObject: fields.status,
      jobId: fields.job_id,
      owner: ownerName,
      assignee: assigneeName
    });
    
    return quote;
  }
  
  // Convert date to ISO format
  private static formatDate(dateValue: any): string {
    if (!dateValue) return new Date().toISOString();
    if (typeof dateValue === 'string') {
      // Handle ISO date strings
      if (dateValue.includes('T') || dateValue.includes('Z')) {
        return dateValue;
      }
      // Try to parse other date formats
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    }
    if (dateValue instanceof Date) return dateValue.toISOString();
    
    try {
      return new Date(dateValue).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  
  // Parse numeric values with better error handling
  private static parseNumber(value: any): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove currency symbols, commas, and spaces
      const cleaned = value.replace(/[\$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? undefined : parsed;
    }
    
    const parsed = Number(value);
    return isNaN(parsed) ? undefined : parsed;
  }
  
  // Clean string values
  private static cleanString(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }
  
  // Parse comments from various field formats
  private static parseComments(fields: Record<string, any>, task: HiSAFETask): Comment[] {
    const comments: Comment[] = [];
    
    // Try to extract comments from various fields
    const commentSources = [
      fields.comments, fields.Comments, fields.notes, fields.Notes, 
      fields.remarks, fields.internal_notes, task.comments
    ];
    
    commentSources.forEach((source, index) => {
      if (source && typeof source === 'string' && source.trim()) {
        comments.push({
          id: `comment-${index}`,
          author: 'System',
          authorType: 'contractor',
          message: source.trim(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    return comments;
  }
  
  // Validate email format
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  // Enhanced debug helper to inspect HiSAFE data structure
  static debugTaskStructure(task: HiSAFETask): void {
    console.group(`🔍 Task ${task.task_id} Structure Debug:`);
    console.log('✓ Task ID:', task.task_id);
    console.log('✓ Job ID:', task.job_id);
    console.log('✓ Task Status (root):', task.status);
    console.log('✓ Task Created:', task.created_date);
    console.log('✓ Task Updated:', task.updated_date);
    console.log('✓ Due Date:', task.due_date);
    console.log('✓ Brief Description:', task.brief_description);
    console.log('✓ Owner (root):', task.owner);
    console.log('✓ Assignee (root):', task.assignee);
    
    if (task.fields && typeof task.fields === 'object') {
      console.log('✓ Available Fields:', Object.keys(task.fields));
      console.group('📋 Field Values:');
      
      // Special handling for important fields
      console.log('🎯 Status Field:', task.fields.status);
      console.log('🎯 Owner Field:', task.fields.owner);
      console.log('🎯 Assignee Field:', task.fields.assignee);
      console.log('🎯 Job ID Field:', task.fields.job_id);
      console.log('🎯 Brief Description Field:', task.fields.brief_description);
      console.log('🎯 Due Date Field:', task.fields.due_date);
      
      console.group('📋 All Field Values:');
      Object.entries(task.fields).forEach(([key, value]) => {
        const type = typeof value;
        if (type === 'object' && value !== null) {
          console.log(`${key} (${type}):`, value);
        } else {
          const preview = type === 'string' && value && value.length > 50 
            ? `${String(value).substring(0, 50)}...` 
            : String(value);
          console.log(`${key} (${type}):`, preview);
        }
      });
      console.groupEnd();
      console.groupEnd();
    } else {
      console.warn('⚠️ No fields object found in task');
    }
    
    console.log('✓ All task properties:', Object.keys(task));
    console.groupEnd();
  }
  
  // Method to add a comment to a quote
  static addCommentToQuote(quote: QuoteRequest, commentText: string, author: string = 'User'): QuoteRequest {
    const newComment: Comment = {
      id: Math.random().toString(36),
      author: author,
      authorType: 'contractor',
      message: commentText,
      timestamp: new Date().toISOString()
    };
    
    return {
      ...quote,
      comments: [...quote.comments, newComment],
      updatedAt: new Date().toISOString()
    };
  }
  
  // Method to serialize comments for HiSAFE storage
  static serializeCommentsForHiSAFE(comments: Comment[]): string {
    return JSON.stringify(comments);
  }
  
  // Auto-detect field mappings from actual task data
  static autoDetectFieldMappings(tasks: HiSAFETask[]): Record<string, string[]> {
    const fieldFrequency: Record<string, number> = {};
    
    // Count field occurrences across all tasks
    tasks.forEach(task => {
      if (task.fields) {
        Object.keys(task.fields).forEach(fieldName => {
          fieldFrequency[fieldName] = (fieldFrequency[fieldName] || 0) + 1;
        });
      }
    });
    
    console.log('🔍 Field frequency analysis:', fieldFrequency);
    
    // Sort fields by frequency (most common first)
    const sortedFields = Object.entries(fieldFrequency)
      .sort(([,a], [,b]) => b - a)
      .map(([fieldName]) => fieldName);
    
    console.log('📊 Fields ordered by frequency:', sortedFields);
    
    return {
      commonFields: sortedFields.slice(0, 10), // Top 10 most common fields
      allFields: sortedFields
    };
  }
  
  // NEW: Method to extract all available field data for debugging/expansion
  static extractAllFieldData(task: HiSAFETask): Record<string, any> {
    const allData: Record<string, any> = {
      // Root level properties
      task_id: task.task_id,
      job_id: task.job_id,
      created_date: task.created_date,
      updated_date: task.updated_date,
      due_date: task.due_date,
      brief_description: task.brief_description,
      status_root: task.status,
      owner_root: task.owner,
      assignee_root: task.assignee,
    };
    
    // Add all fields
    if (task.fields) {
      Object.entries(task.fields).forEach(([key, value]) => {
        allData[`field_${key}`] = value;
      });
    }
    
    return allData;
  }
}

export default DataMappingService;
