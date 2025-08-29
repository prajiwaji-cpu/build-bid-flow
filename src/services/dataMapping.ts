// src/services/dataMapping.ts - Updated to work with your actual HiSAFE fields
import { QuoteRequest, QuoteStatus, Comment } from '@/types/quote';
import { HiSAFETask } from './hisafeApi';

// Field mapping configuration - Updated based on your actual HiSAFE field structure
export const FIELD_MAPPINGS = {
  // Core quote fields - Updated to match your actual data structure
  clientName: ['Customer Name', 'customer_name', 'name', 'client_name', 'Name', 'Customer.Name'],
  clientEmail: ['Customer Email', 'Email', 'customer_email', 'email', 'client_email', 'Customer.Email', 'Customer.E-mail Address'], 
  clientPhone: ['Customer Phone', 'Phone', 'customer_phone', 'phone', 'Customer.Phone'],
  projectType: ['Project Type', 'Task Form', 'task_form', 'project_type', 'type', 'form_name'],
  projectDescription: ['brief_description', 'Item/Part Name', 'item_part_name', 'project_description', 'details', 'summary', 'description'],
  estimatedNeedByDate: ['due_date', 'Estimated Need by Date', 'need_by_date', 'timeline', 'deadline'],
  estimatedCost: ['Quote Total', 'Total Cost', 'Cost', 'Price', 'quote_total', 'total', 'cost', 'amount', 'price'],
  jobId: ['job_id', 'Job ID', 'Job Number'],
  
  // Comment/notes fields - for storing comments when they're added
  comments: ['Comments', 'comments', 'Notes', 'notes', 'remarks', 'Internal Notes'],
  
  // System fields
  status: ['status'],
  assignee: ['assignee'],
  owner: ['owner'],
  createdDate: ['post_date', 'created_date'],
  updatedDate: ['updated_date', 'updated_at', 'date_updated', 'last_modified'],
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
  
  // Convert HiSAFE task to QuoteRequest
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
    
    // Map task status to app status
    const rawStatus = task.status?.name || task.status || 'pending';
    const mappedStatus = STATUS_MAPPINGS.fromHiSAFE[rawStatus as keyof typeof STATUS_MAPPINGS.fromHiSAFE] || 'pending';
    
    // Extract owner/assignee information for client data fallback
    const ownerName = task.owner?.name || '';
    const assigneeName = task.assignee?.[0]?.name || '';
    
    const quote: QuoteRequest = {
      id: task.task_id.toString(),
      clientName: this.cleanString(getFieldValue(FIELD_MAPPINGS.clientName) || `Job ${task.job_id || task.task_id}`),
      clientEmail: this.cleanString(getFieldValue(FIELD_MAPPINGS.clientEmail) || 'unknown@example.com'),
      clientPhone: this.cleanString(getFieldValue(FIELD_MAPPINGS.clientPhone)),
      projectType: this.cleanString(getFieldValue(FIELD_MAPPINGS.projectType) || 'General Quote'),
      projectDescription: this.cleanString(getFieldValue(FIELD_MAPPINGS.projectDescription) || 'Project details not specified'),
      budget: this.cleanString(getFieldValue(['Budget', 'budget', 'estimated_budget'])),
      timeline: this.cleanString(getFieldValue(FIELD_MAPPINGS.estimatedNeedByDate) || this.formatDate(task.due_date)),
      location: this.cleanString(getFieldValue(['Location', 'location', 'address'])),
      status: mappedStatus,
      submittedAt: this.formatDate(getFieldValue(FIELD_MAPPINGS.createdDate) || task.created_date),
      updatedAt: this.formatDate(getFieldValue(FIELD_MAPPINGS.updatedDate) || task.updated_date || task.created_date),
      estimatedCost: this.parseNumber(getFieldValue(FIELD_MAPPINGS.estimatedCost)),
      notes: this.cleanString(getFieldValue(['Notes', 'notes', 'remarks', 'additional_info'])),
      comments: this.parseComments(fields, task)
    };
    
    // Debug log the mapped quote
    console.log('Mapped quote:', {
      id: quote.id,
      clientName: quote.clientName,
      projectDescription: quote.projectDescription,
      estimatedCost: quote.estimatedCost,
      status: quote.status,
      originalStatus: rawStatus,
      jobId: task.job_id
    });
    
    return quote;
  }
  
  // Convert date to ISO format
  private static formatDate(dateValue: any): string {
    if (!dateValue) return new Date().toISOString();
    if (typeof dateValue === 'string') return dateValue;
    if (dateValue instanceof Date) return dateValue.toISOString();
    return new Date(dateValue).toISOString();
  }
  
  // Parse numeric values
  private static parseNumber(value: any): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove currency symbols and commas
      const cleaned = value.replace(/[\$,]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? undefined : parsed;
    }
    
    const parsed = Number(value);
    return isNaN(parsed) ? undefined : parsed;
  }
  
  // Parse comments from HiSAFE task fields
  private static parseComments(fields: Record<string, any>, task: HiSAFETask): Comment[] {
    const comments: Comment[] = [];
    
    // Method 1: Check for a comments field
    const possibleCommentFields = FIELD_MAPPINGS.comments;
    for (const fieldName of possibleCommentFields) {
      const commentsField = fields[fieldName];
      if (commentsField && typeof commentsField === 'string' && commentsField.trim()) {
        try {
          // Try to parse as JSON first (for structured comments)
          const parsedComments = JSON.parse(commentsField);
          if (Array.isArray(parsedComments)) {
            return parsedComments.map((comment: any) => ({
              id: comment.id || Math.random().toString(36),
              author: comment.author || 'System',
              authorType: comment.authorType || 'contractor',
              message: comment.message || comment.text || '',
              timestamp: comment.timestamp || new Date().toISOString()
            }));
          }
        } catch (error) {
          // If not JSON, treat as a single comment
          comments.push({
            id: Math.random().toString(36),
            author: 'System',
            authorType: 'contractor',
            message: commentsField,
            timestamp: this.formatDate(fields.updated_date || task.updated_date)
          });
          break; // Only add one comment to avoid duplicates
        }
      }
    }
    
    return comments;
  }
  
  // Clean string helper
  private static cleanString(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }
  
  // Convert QuoteRequest to HiSAFE task fields
  static mapQuoteToTaskFields(quote: Partial<QuoteRequest>): Record<string, any> {
    const fields: Record<string, any> = {};
    
    // Map basic fields - use first field name from each mapping array
    if (quote.clientName !== undefined) {
      this.setNestedField(fields, FIELD_MAPPINGS.clientName[0], quote.clientName);
    }
    if (quote.clientEmail !== undefined) {
      this.setNestedField(fields, FIELD_MAPPINGS.clientEmail[0], quote.clientEmail);
    }
    if (quote.projectType !== undefined) {
      fields[FIELD_MAPPINGS.projectType[0]] = quote.projectType;
    }
    if (quote.projectDescription !== undefined) {
      fields[FIELD_MAPPINGS.projectDescription[0]] = quote.projectDescription;
    }
    if (quote.timeline !== undefined) {
      fields[FIELD_MAPPINGS.estimatedNeedByDate[0]] = quote.timeline;
    }
    if (quote.estimatedCost !== undefined) {
      fields[FIELD_MAPPINGS.estimatedCost[0]] = quote.estimatedCost;
    }
    
    // Map status
    if (quote.status !== undefined) {
      fields[FIELD_MAPPINGS.status[0]] = STATUS_MAPPINGS.toHiSAFE[quote.status];
    }
    
    return fields;
  }
  
  // Helper to set nested field values
  private static setNestedField(fields: Record<string, any>, fieldPath: string, value: any): void {
    if (fieldPath.includes('.')) {
      const parts = fieldPath.split('.');
      let current = fields;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    } else {
      fields[fieldPath] = value;
    }
  }
  
  // Get form ID based on quote status or other criteria
  static getFormIdForQuote(quote: QuoteRequest): number {
    // Update this logic based on your actual form IDs in HiSAFE
    // You might need to check what form IDs are available in your system
    return 1; // Default form ID - update this based on your HiSAFE setup
  }
  
  // Validate that required fields are present
  static validateQuoteData(quote: Partial<QuoteRequest>): string[] {
    const errors: string[] = [];
    
    if (!quote.clientName?.trim()) errors.push('Customer name is required');
    if (!quote.clientEmail?.trim()) errors.push('Customer email is required');
    if (!quote.projectDescription?.trim()) errors.push('Item/Part description is required');
    
    // Validate email format
    if (quote.clientEmail && !this.isValidEmail(quote.clientEmail)) {
      errors.push('Valid email address is required');
    }
    
    return errors;
  }
  
  // Email validation helper
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  // Debug helper to inspect HiSAFE data structure
  static debugTaskStructure(task: HiSAFETask): void {
    console.group(`🔍 Task ${task.task_id} Structure Debug:`);
    console.log('✓ Task ID:', task.task_id);
    console.log('✓ Job ID:', task.job_id);
    console.log('✓ Task Status:', task.status);
    console.log('✓ Task Created:', task.created_date);
    console.log('✓ Task Updated:', task.updated_date);
    console.log('✓ Due Date:', task.due_date);
    console.log('✓ Brief Description:', task.brief_description);
    console.log('✓ Owner:', task.owner);
    console.log('✓ Assignee:', task.assignee);
    
    if (task.fields && typeof task.fields === 'object') {
      console.log('✓ Available Fields:', Object.keys(task.fields));
      console.group('📋 Field Values:');
      Object.entries(task.fields).forEach(([key, value]) => {
        const type = typeof value;
        const preview = type === 'string' && value.length > 50 
          ? `${String(value).substring(0, 50)}...` 
          : String(value);
        console.log(`${key} (${type}):`, preview);
      });
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
}

export default DataMappingService;
