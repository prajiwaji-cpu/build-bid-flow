// src/services/dataMapping.ts
import { QuoteRequest, QuoteStatus, Comment } from '@/types/quote';
import { HiSAFETask } from './hisafeApi';

// Field mapping configuration - HiSAFE field names
export const FIELD_MAPPINGS = {
  // Core quote fields
  clientName: 'Customer.Name',
  clientEmail: 'Customer.E-mail Address', 
  projectType: 'Task Form',
  projectDescription: 'Item/Part Name',
  estimatedNeedByDate: 'Estimated Need by Date',
  estimatedCost: 'Quote Total',
  
  // System fields
  status: 'Status',
  createdDate: 'created_date',
  updatedDate: 'updated_date',
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
    const fields = task.fields || {};
    
    // Helper function to safely get field values
    const getField = (fieldName: string, defaultValue: any = '') => {
      // Handle nested field names like 'Customer.Name'
      if (fieldName.includes('.')) {
        const parts = fieldName.split('.');
        let value = fields;
        for (const part of parts) {
          value = value?.[part];
          if (value === undefined) break;
        }
        return value || defaultValue;
      }
      return fields[fieldName] || defaultValue;
    };
    
    // Map status with fallback
    const hisafeStatus = getField(FIELD_MAPPINGS.status) || task.status;
    const mappedStatus = STATUS_MAPPINGS.fromHiSAFE[hisafeStatus] || 'pending';
    
    const quote: QuoteRequest = {
      id: task.task_id.toString(),
      clientName: getField(FIELD_MAPPINGS.clientName),
      clientEmail: getField(FIELD_MAPPINGS.clientEmail),
      clientPhone: getField('Customer.Phone', ''), // Add if available
      projectType: getField(FIELD_MAPPINGS.projectType),
      projectDescription: getField(FIELD_MAPPINGS.projectDescription),
      budget: getField('Budget', ''), // Add if available
      timeline: getField(FIELD_MAPPINGS.estimatedNeedByDate),
      location: getField('Location', ''), // Add if available
      status: mappedStatus,
      submittedAt: this.formatDate(getField(FIELD_MAPPINGS.createdDate) || task.created_date),
      updatedAt: this.formatDate(getField(FIELD_MAPPINGS.updatedDate) || task.updated_date),
      estimatedCost: this.parseNumber(getField(FIELD_MAPPINGS.estimatedCost)),
      notes: getField('Notes', ''), // Add if available
      comments: this.parseComments(fields, task)
    };
    
    return quote;
  }
  
  // Convert QuoteRequest to HiSAFE task fields
  static mapQuoteToTaskFields(quote: Partial<QuoteRequest>): Record<string, any> {
    const fields: Record<string, any> = {};
    
    // Map basic fields - handle nested field names
    if (quote.clientName !== undefined) {
      this.setNestedField(fields, FIELD_MAPPINGS.clientName, quote.clientName);
    }
    if (quote.clientEmail !== undefined) {
      this.setNestedField(fields, FIELD_MAPPINGS.clientEmail, quote.clientEmail);
    }
    if (quote.projectType !== undefined) {
      fields[FIELD_MAPPINGS.projectType] = quote.projectType;
    }
    if (quote.projectDescription !== undefined) {
      fields[FIELD_MAPPINGS.projectDescription] = quote.projectDescription;
    }
    if (quote.timeline !== undefined) {
      fields[FIELD_MAPPINGS.estimatedNeedByDate] = quote.timeline;
    }
    if (quote.estimatedCost !== undefined) {
      fields[FIELD_MAPPINGS.estimatedCost] = quote.estimatedCost;
    }
    
    // Map status
    if (quote.status !== undefined) {
      fields[FIELD_MAPPINGS.status] = STATUS_MAPPINGS.toHiSAFE[quote.status];
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
    
    // Method 1: Check for a comments field that might contain JSON
    const commentsField = fields['Comments'] || fields['comments'] || fields['Notes'] || fields['notes'];
    if (commentsField && typeof commentsField === 'string') {
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
          timestamp: this.formatDate(fields[FIELD_MAPPINGS.updatedDate] || task.updated_date)
        });
      }
    }
    
    // Method 2: Check for multiple comment fields (comment_1, comment_2, etc.)
    Object.keys(fields).forEach(fieldName => {
      if (fieldName.toLowerCase().includes('comment') && fieldName !== 'Comments' && fieldName !== 'comments') {
        const commentText = fields[fieldName];
        if (commentText && typeof commentText === 'string' && commentText.trim()) {
          comments.push({
            id: Math.random().toString(36),
            author: fields['last_updated_by'] || 'System',
            authorType: 'contractor',
            message: commentText,
            timestamp: this.formatDate(fields[FIELD_MAPPINGS.updatedDate] || task.updated_date)
          });
        }
      }
    });
    
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
    console.group(`Task ${task.task_id} Structure:`);
    console.log('Task ID:', task.task_id);
    console.log('Fields:', Object.keys(task.fields || {}));
    console.log('All task properties:', Object.keys(task));
    
    if (task.fields) {
      console.group('Field Values:');
      Object.entries(task.fields).forEach(([key, value]) => {
        console.log(`${key}:`, value);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }
}

export default DataMappingService;
