// src/services/dataMapping.ts - Updated with better field mapping and debugging
import { QuoteRequest, QuoteStatus, Comment } from '@/types/quote';
import { HiSAFETask } from './hisafeApi';

// Field mapping configuration - HiSAFE field names
export const FIELD_MAPPINGS = {
  // Core quote fields - Updated based on common HiSafe field names
  clientName: ['Customer.Name', 'customer_name', 'name', 'client_name', 'Name'],
  clientEmail: ['Customer.E-mail Address', 'customer_email', 'email', 'client_email', 'Email'], 
  projectType: ['Task Form', 'task_form', 'project_type', 'type', 'form_name'],
  projectDescription: ['Item/Part Name', 'item_part_name', 'description', 'project_description', 'details', 'summary'],
  estimatedNeedByDate: ['Estimated Need by Date', 'need_by_date', 'timeline', 'due_date', 'deadline'],
  estimatedCost: ['Quote Total', 'quote_total', 'total', 'cost', 'amount', 'price'],
  
  // System fields
  status: ['Status', 'status', 'task_status'],
  createdDate: ['created_date', 'created_at', 'date_created'],
  updatedDate: ['updated_date', 'updated_at', 'date_updated', 'last_modified'],
};

// Status mapping between your app and HiSAFE
export const STATUS_MAPPINGS = {
  // HiSAFE status name -> Your app status
  fromHiSAFE: {
    'Awaiting Approval': 'pending' as QuoteStatus,
    'Awaiting Quote Generation': 'processing' as QuoteStatus,
    'Work in Progress': 'processing' as QuoteStatus,
    'Quote Complete': 'approved' as QuoteStatus,
    'Quote Denied': 'denied' as QuoteStatus,
    'Cancelled': 'denied' as QuoteStatus,
    'Open': 'pending' as QuoteStatus,
    'In Progress': 'processing' as QuoteStatus,
    'Completed': 'approved' as QuoteStatus,
    'Closed': 'approved' as QuoteStatus,
  },
  // Your app status -> HiSAFE status name
  toHiSAFE: {
    'pending': 'Awaiting Approval',
    'processing': 'Awaiting Quote Generation', 
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
            if (value === undefined) break;
          }
          if (value !== undefined && value !== null && value !== '') {
            return value;
          }
        } else {
          // Direct field access
          const value = fields[fieldName];
          if (value !== undefined && value !== null && value !== '') {
            return value;
          }
        }
      }
      return defaultValue;
    };
    
    // Map status with fallback
    const rawStatus = getFieldValue(FIELD_MAPPINGS.status) || task.status || 'Open';
    const mappedStatus = STATUS_MAPPINGS.fromHiSAFE[rawStatus] || 'pending';
    
    // Get client name - try multiple possible field names
    const clientName = getFieldValue(FIELD_MAPPINGS.clientName) || `Customer ${task.task_id}`;
    
    // Get client email
    const clientEmail = getFieldValue(FIELD_MAPPINGS.clientEmail) || 'unknown@example.com';
    
    // Get project description
    const projectDescription = getFieldValue(FIELD_MAPPINGS.projectDescription) || 'Project details not specified';
    
    // Get project type
    const projectType = getFieldValue(FIELD_MAPPINGS.projectType) || 'General';
    
    const quote: QuoteRequest = {
      id: task.task_id.toString(),
      clientName: this.cleanString(clientName),
      clientEmail: this.cleanString(clientEmail),
      clientPhone: this.cleanString(getFieldValue(['Customer.Phone', 'customer_phone', 'phone'])),
      projectType: this.cleanString(projectType),
      projectDescription: this.cleanString(projectDescription),
      budget: this.cleanString(getFieldValue(['Budget', 'budget', 'estimated_budget'])),
      timeline: this.cleanString(getFieldValue(FIELD_MAPPINGS.estimatedNeedByDate)),
      location: this.cleanString(getFieldValue(['Location', 'location', 'address'])),
      status: mappedStatus,
      submittedAt: this.formatDate(getFieldValue(FIELD_MAPPINGS.createdDate) || task.created_date),
      updatedAt: this.formatDate(getFieldValue(FIELD_MAPPINGS.updatedDate) || task.updated_date || task.created_date),
      estimatedCost: this.parseNumber(getFieldValue(FIELD_MAPPINGS.estimatedCost)),
      notes: this.cleanString(getFieldValue(['Notes', 'notes', 'comments', 'additional_info'])),
      comments: this.parseComments(fields, task)
    };
    
    // Debug log the mapped quote
    console.log('Mapped quote:', {
      id: quote.id,
      clientName: quote.clientName,
      clientEmail: quote.clientEmail,
      projectType: quote.projectType,
      status: quote.status,
      originalStatus: rawStatus
    });
    
    return quote;
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
      
      // Create nested structure
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
      
      // Set the final value
      current[parts[parts.length - 1]] = value;
    } else {
      fields[fieldPath] = value;
    }
  }
  
  // Helper function to format dates
  private static formatDate(dateValue: any): string {
    if (!dateValue) return new Date().toISOString();
    
    // If it's already a valid date string, return it
    if (typeof dateValue === 'string' && !isNaN(Date.parse(dateValue))) {
      return new Date(dateValue).toISOString();
    }
    
    // If it's a timestamp
    if (typeof dateValue === 'number') {
      return new Date(dateValue).toISOString();
    }
    
    // Default to current date
    return new Date().toISOString();
  }
  
  // Helper function to parse numbers
  private static parseNumber(value: any): number | undefined {
    if (value === null || value === undefined) return undefined;
    
    // Handle string values that might have currency symbols or commas
    if (typeof value === 'string') {
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
    const possibleCommentFields = ['Comments', 'comments', 'Notes', 'notes', 'remarks'];
    for (const fieldName of possibleCommentFields) {
      const commentsField = fields[fieldName];
      if (commentsField && typeof commentsField === 'string' && commentsField.trim()) {
        try {
          // Try to parse as JSON first
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
  
  // Get form ID based on quote status or other criteria
  static getFormIdForQuote(quote: QuoteRequest): number {
    // Update this logic based on your actual form IDs in HiSAFE
    switch (quote.status) {
      case 'pending':
        return 1; // Form ID for new/pending quotes
      case 'processing':
        return 2; // Form ID for quotes being processed
      case 'approved':
      case 'denied':
        return 3; // Form ID for completed quotes
      default:
        return 1; // Default form ID
    }
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
    console.log('✓ Task Status:', task.status);
    console.log('✓ Task Created:', task.created_date);
    console.log('✓ Task Updated:', task.updated_date);
    
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
  
  // New method to detect field mappings automatically
  static autoDetectFieldMappings(tasks: HiSAFETask[]): Record<string, string[]> {
    const detectedMappings: Record<string, string[]> = {};
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
