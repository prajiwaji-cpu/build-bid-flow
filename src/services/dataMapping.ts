// src/services/dataMapping.ts
import { QuoteRequest, QuoteStatus, Comment } from '@/types/quote';
import { HiSAFETask } from './hisafeApi';

// Field mapping configuration - UPDATE THESE WITH YOUR ACTUAL HISAFE FIELD NAMES
export const FIELD_MAPPINGS = {
  // Core quote fields - replace with your actual HiSAFE field names
  clientName: 'client_name_field',           // Replace with actual field name
  clientEmail: 'client_email_field',         // Replace with actual field name  
  clientPhone: 'client_phone_field',         // Replace with actual field name
  projectType: 'project_type_field',         // Replace with actual field name
  projectDescription: 'project_desc_field',  // Replace with actual field name
  budget: 'budget_field',                    // Replace with actual field name
  timeline: 'timeline_field',                // Replace with actual field name
  location: 'location_field',                // Replace with actual field name
  estimatedCost: 'estimated_cost_field',     // Replace with actual field name
  notes: 'notes_field',                      // Replace with actual field name
  
  // System fields (these might be standard HiSAFE fields)
  status: 'status',                          // Might be standard 'status' field
  createdDate: 'created_date',               // Might be standard creation date
  updatedDate: 'updated_date',               // Might be standard update date
};

// Status mapping between your app and HiSAFE
export const STATUS_MAPPINGS = {
  // HiSAFE status ID/name -> Your app status
  fromHiSAFE: {
    1: 'pending' as QuoteStatus,      // Replace 1 with actual HiSAFE status ID for pending
    2: 'processing' as QuoteStatus,   // Replace 2 with actual HiSAFE status ID for processing  
    3: 'approved' as QuoteStatus,     // Replace 3 with actual HiSAFE status ID for approved
    4: 'denied' as QuoteStatus,       // Replace 4 with actual HiSAFE status ID for denied
  },
  // Your app status -> HiSAFE status ID/name
  toHiSAFE: {
    'pending': 1,      // Replace 1 with actual HiSAFE status ID for pending
    'processing': 2,   // Replace 2 with actual HiSAFE status ID for processing
    'approved': 3,     // Replace 3 with actual HiSAFE status ID for approved
    'denied': 4,       // Replace 4 with actual HiSAFE status ID for denied
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
      clientPhone: getField(FIELD_MAPPINGS.clientPhone),
      projectType: getField(FIELD_MAPPINGS.projectType),
      projectDescription: getField(FIELD_MAPPINGS.projectDescription),
      budget: getField(FIELD_MAPPINGS.budget),
      timeline: getField(FIELD_MAPPINGS.timeline),
      location: getField(FIELD_MAPPINGS.location),
      status: mappedStatus,
      submittedAt: this.formatDate(getField(FIELD_MAPPINGS.createdDate)),
      updatedAt: this.formatDate(getField(FIELD_MAPPINGS.updatedDate)),
      estimatedCost: this.parseNumber(getField(FIELD_MAPPINGS.estimatedCost)),
      notes: getField(FIELD_MAPPINGS.notes),
      comments: this.parseComments(fields) // We'll implement this based on how comments are stored
    };
    
    return quote;
  }
  
  // Convert QuoteRequest to HiSAFE task fields
  static mapQuoteToTaskFields(quote: Partial<QuoteRequest>): Record<string, any> {
    const fields: Record<string, any> = {};
    
    // Map basic fields
    if (quote.clientName !== undefined) fields[FIELD_MAPPINGS.clientName] = quote.clientName;
    if (quote.clientEmail !== undefined) fields[FIELD_MAPPINGS.clientEmail] = quote.clientEmail;
    if (quote.clientPhone !== undefined) fields[FIELD_MAPPINGS.clientPhone] = quote.clientPhone;
    if (quote.projectType !== undefined) fields[FIELD_MAPPINGS.projectType] = quote.projectType;
    if (quote.projectDescription !== undefined) fields[FIELD_MAPPINGS.projectDescription] = quote.projectDescription;
    if (quote.budget !== undefined) fields[FIELD_MAPPINGS.budget] = quote.budget;
    if (quote.timeline !== undefined) fields[FIELD_MAPPINGS.timeline] = quote.timeline;
    if (quote.location !== undefined) fields[FIELD_MAPPINGS.location] = quote.location;
    if (quote.estimatedCost !== undefined) fields[FIELD_MAPPINGS.estimatedCost] = quote.estimatedCost;
    if (quote.notes !== undefined) fields[FIELD_MAPPINGS.notes] = quote.notes;
    
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
    
    if (!quote.clientName) errors.push('Client name is required');
    if (!quote.clientEmail) errors.push('Client email is required');
    if (!quote.projectDescription) errors.push('Project description is required');
    
    return errors;
  }
}

export default DataMappingService;
