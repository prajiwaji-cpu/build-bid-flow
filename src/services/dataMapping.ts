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
  createdDate: 'created_date',               // Standard creation date
  updatedDate: 'updated_date',               // Standard update date
};

// Status mapping between your app and HiSAFE
export const STATUS_MAPPINGS = {
  // HiSAFE status name -> Your app status
  fromHiSAFE: {
    'Awaiting Approval': 'pending' as QuoteStatus,
    'Awaiting Quote Generation': 'processing' as QuoteStatus,
    'Work in Progress': 'processing' as QuoteStatus,
    'Quote Complete': 'approved' as QuoteStatus,
  },
  // Your app status -> HiSAFE status name
  toHiSAFE: {
    'pending': 'Awaiting Approval',
    'processing': 'Awaiting Quote Generation',
    'approved': 'Quote Complete',
  }
};

export class DataMappingService {
  
  // Convert HiSAFE task to QuoteRequest
  static mapTaskToQuote(task: HiSAFETask): QuoteRequest {
    const fields = task.fields || {};
    
    // Helper function to safely get field values
    const getField = (fieldName: string, defaultValue: any = '') => {
      return fields[fieldName] || defaultValue;
    };
    
    // Map status
    const hisafeStatus = getField(FIELD_MAPPINGS.status);
    const mappedStatus = STATUS_MAPPINGS.fromHiSAFE[hisafeStatus] || 'pending';
    
    const quote: QuoteRequest = {
      id: task.task_id.toString(),
      clientName: getField(FIELD_MAPPINGS.clientName),
      clientEmail: getField(FIELD_MAPPINGS.clientEmail),
      clientPhone: '', // Removed - not used
      projectType: getField(FIELD_MAPPINGS.projectType),
      projectDescription: getField(FIELD_MAPPINGS.projectDescription),
      budget: '', // Removed - not used
      timeline: getField(FIELD_MAPPINGS.estimatedNeedByDate), // Mapped to "Estimated Need by Date"
      location: '', // Removed - not used
      status: mappedStatus,
      submittedAt: this.formatDate(getField(FIELD_MAPPINGS.createdDate)),
      updatedAt: this.formatDate(getField(FIELD_MAPPINGS.updatedDate)),
      estimatedCost: this.parseNumber(getField(FIELD_MAPPINGS.estimatedCost)),
      notes: '', // Removed - not used
      comments: this.parseComments(fields)
    };
    
    return quote;
  }
  
  // Convert QuoteRequest to HiSAFE task fields
  static mapQuoteToTaskFields(quote: Partial<QuoteRequest>): Record<string, any> {
    const fields: Record<string, any> = {};
    
    // Map basic fields (only the ones we use)
    if (quote.clientName !== undefined) fields[FIELD_MAPPINGS.clientName] = quote.clientName;
    if (quote.clientEmail !== undefined) fields[FIELD_MAPPINGS.clientEmail] = quote.clientEmail;
    if (quote.projectType !== undefined) fields[FIELD_MAPPINGS.projectType] = quote.projectType;
    if (quote.projectDescription !== undefined) fields[FIELD_MAPPINGS.projectDescription] = quote.projectDescription;
    if (quote.timeline !== undefined) fields[FIELD_MAPPINGS.estimatedNeedByDate] = quote.timeline;
    if (quote.estimatedCost !== undefined) fields[FIELD_MAPPINGS.estimatedCost] = quote.estimatedCost;
    
    // Map status
    if (quote.status !== undefined) {
      fields[FIELD_MAPPINGS.status] = STATUS_MAPPINGS.toHiSAFE[quote.status];
    }
    
    return fields;
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
    if (!value) return undefined;
    
    const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(parsed) ? undefined : parsed;
  }
  
  // Parse comments from HiSAFE task fields
  // This will need to be customized based on how HiSAFE stores comments in your setup
  private static parseComments(fields: Record<string, any>): Comment[] {
    const comments: Comment[] = [];
    
    // PLACEHOLDER: Update this based on how comments are stored in your HiSAFE setup
    // Option 1: Comments might be in a specific field as JSON
    const commentsField = fields['comments_field']; // Replace with actual field name
    if (commentsField) {
      try {
        const parsedComments = JSON.parse(commentsField);
        return parsedComments.map((comment: any) => ({
          id: comment.id || Math.random().toString(36),
          author: comment.author || 'Unknown',
          authorType: comment.authorType || 'contractor',
          message: comment.message || '',
          timestamp: comment.timestamp || new Date().toISOString()
        }));
      } catch (error) {
        console.warn('Failed to parse comments:', error);
      }
    }
    
    // Option 2: Comments might be in separate comment fields
    // const comment1 = fields['comment_1']; // Replace with actual field names
    // const comment2 = fields['comment_2'];
    // if (comment1) comments.push(this.createComment(comment1, fields));
    // if (comment2) comments.push(this.createComment(comment2, fields));
    
    return comments;
  }
  
  // Helper to create a comment object
  private static createComment(commentText: string, fields: Record<string, any>): Comment {
    return {
      id: Math.random().toString(36),
      author: fields['last_updated_by'] || 'System', // Replace with actual field
      authorType: 'contractor', // You might need logic to determine this
      message: commentText,
      timestamp: this.formatDate(fields[FIELD_MAPPINGS.updatedDate])
    };
  }
  
  // Get form ID based on quote status or other criteria
  static getFormIdForQuote(quote: QuoteRequest): number {
    // PLACEHOLDER: Update this logic based on your business rules
    // Example logic:
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
    
    if (!quote.clientName) errors.push('Customer name is required');
    if (!quote.clientEmail) errors.push('Customer email is required');
    if (!quote.projectDescription) errors.push('Item/Part description is required');
    
    return errors;
  }
}

export default DataMappingService;
