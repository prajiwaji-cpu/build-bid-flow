// src/services/dataMapping.ts - Enhanced version with ALL new fields from HiSAFE
import { QuoteRequest, QuoteStatus, Comment } from '@/types/quote';
import { HiSAFETask } from './hisafeApi';

// Enhanced field mapping configuration with ALL available fields
export const FIELD_MAPPINGS = {
  // Client/Customer Information - NOW AVAILABLE!
  clientName: [
    'Customer.name', 'Customer', 'customer_name', 'name', 'client_name', 'Name',
    'Contact Name', 'contact_name', 'Requestor', 'requestor', 'Client', 'client',
    'Company Name', 'company_name', 'Organization', 'organization'
  ],
  clientEmail: [
    'Customer Email', 'Email', 'customer_email', 'email', 'client_email', 
    'Customer.Email', 'Customer.E-mail Address', 'Contact Email', 'contact_email',
    'E-mail', 'e_mail', 'Email Address', 'email_address', 'Customer.email'
  ], 
  clientPhone: [
    'Customer Phone', 'Phone', 'customer_phone', 'phone', 'Customer.Phone',
    'Contact Phone', 'contact_phone', 'Phone Number', 'phone_number',
    'Mobile', 'mobile', 'Cell Phone', 'cell_phone', 'Telephone', 'telephone'
  ],
  
  // Project Information - GREATLY ENHANCED!
  projectType: [
    'Project Type', 'Task Form', 'task_form', 'project_type', 'type', 'form_name',
    'Service Type', 'service_type', 'Work Type', 'work_type', 'Category', 'category',
    'Job Type', 'job_type', 'Request Type', 'request_type'
  ],
  projectDescription: [
    'Item_Part_Name', 'Item/Part Name', 'item_part_name', // PRIMARY - Now available!
    'brief_description', 'project_description', 'details', 'summary', 'description', 
    'Description', 'Project Description', 'Work Description', 'work_description', 
    'Scope', 'scope', 'Requirements', 'requirements', 'Job Description', 'job_description'
  ],
  
  // NEW: Item/Part Specifications
  itemPartName: [
    'Item_Part_Name', 'Item/Part Name', 'item_part_name', 'Part Name', 'part_name',
    'Item Name', 'item_name', 'Product Name', 'product_name'
  ],
  itemPartSize: [
    'Item_Part_Size', 'Item/Part Size', 'item_part_size', 'Size', 'size',
    'Dimensions', 'dimensions', 'Specification', 'specification'
  ],
  
  // Quantity Information - NEW!
  quantity: [
    'Unit_Quantity', 'Unit Quantity', 'unit_quantity', 'Quantity', 'quantity',
    'Units', 'units', 'Count', 'count', 'Amount', 'amount'
  ],
  
  // Timeline and Dates - ENHANCED!
  estimatedNeedByDate: [
    'Estimated_Need_by_Date', 'Estimated Need by Date', 'estimated_need_by_date', // PRIMARY - Now available!
    'due_date', 'timeline', 'deadline', 'Due Date', 'Target Date', 'target_date',
    'Completion Date', 'completion_date', 'Required By', 'required_by', 'Delivery Date', 'delivery_date'
  ],
  
  // Work Estimates - NEW!
  estimatedHours: [
    'Estimated_Job_Hours', 'Estimated Job Hours', 'estimated_job_hours',
    'Job Hours', 'job_hours', 'Work Hours', 'work_hours', 'Labor Hours', 'labor_hours',
    'Duration', 'duration', 'Time Estimate', 'time_estimate'
  ],
  
  // Financial Information - NOW AVAILABLE!
  estimatedCost: [
    'Quote_Total', 'Quote Total', 'quote_total', // PRIMARY - Now available!
    'Total Cost', 'Cost', 'Price', 'total', 'cost', 'amount', 'price',
    'Estimated Cost', 'estimated_cost', 'Budget', 'budget', 'Quote Amount', 'quote_amount',
    'Total Price', 'total_price', 'Final Cost', 'final_cost', 'Contract Value', 'contract_value'
  ],
  
  // Quote Management - NEW!
  quoteExpirationDate: [
    'Quote_Expiration_Date', 'Quote Expiration Date', 'quote_expiration_date',
    'Expiration Date', 'expiration_date', 'Valid Until', 'valid_until'
  ],
  
  // Comments and Notes - NOW AVAILABLE!
  comments: [
    'Comments.text', 'Comments', 'comments', // PRIMARY - Now available!
    'Notes', 'notes', 'remarks', 'Internal Notes', 'Special Instructions', 'special_instructions'
  ],
  extendedDescription: [
    'extended_description.text', 'extended_description', 'Extended Description',
    'Additional Details', 'additional_details', 'Full Description', 'full_description'
  ],
  
  // Location Information
  location: [
    'Location', 'location', 'Address', 'address', 'Site', 'site', 'Job Site', 'job_site',
    'Project Location', 'project_location', 'Work Location', 'work_location',
    'Street Address', 'street_address', 'City', 'city', 'State', 'state'
  ],
  
  // Existing core fields
  jobId: ['job_id', 'Job ID', 'Job Number', 'Work Order', 'work_order', 'Ticket Number', 'ticket_number'],
  
  // System fields
  status: ['status'],
  assignee: ['assignee'],
  owner: ['owner'],
  createdDate: ['post_date', 'created_date', 'date_created', 'submitted_date'],
  updatedDate: ['updated_date', 'updated_at', 'date_updated', 'last_modified', 'modified_date'],
};

// Enhanced status mapping - Updated with new statuses from your data
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
    // Additional mappings
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
  
  // ENHANCED: Convert HiSAFE task to QuoteRequest using ALL new fields
  static mapTaskToQuote(task: HiSAFETask): QuoteRequest {
    console.log('🔄 Mapping task with ENHANCED field support:', task.task_id, 'with fields:', task.fields ? Object.keys(task.fields) : 'NO FIELDS');
    
    const fields = task.fields || {};
    
    // Enhanced helper function to safely get field values
    const getFieldValue = (possibleFieldNames: string[], defaultValue: any = '') => {
      for (const fieldName of possibleFieldNames) {
        // Handle nested field names like 'Customer.name' or 'Comments.text'
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
    
    // ENHANCED: Handle status object correctly
    let rawStatus = 'pending';
    let mappedStatus: QuoteStatus = 'pending';
    
    if (fields.status && typeof fields.status === 'object' && fields.status.name) {
      rawStatus = fields.status.name;
    } else if (fields.status && typeof fields.status === 'string') {
      rawStatus = fields.status;
    } else if (task.status && typeof task.status === 'object' && task.status.name) {
      rawStatus = task.status.name;
    } else if (task.status && typeof task.status === 'string') {
      rawStatus = task.status;
    }
    
    mappedStatus = STATUS_MAPPINGS.fromHiSAFE[rawStatus as keyof typeof STATUS_MAPPINGS.fromHiSAFE] || 'pending';
    
    // ENHANCED: Handle customer object and other contact info
    const getCustomerName = () => {
      // Try Customer.name first (new field)
      if (fields.Customer && typeof fields.Customer === 'object' && fields.Customer.name) {
        return fields.Customer.name;
      }
      // Fallback to owner/assignee
      const ownerName = this.getOwnerName(fields, task);
      const assigneeName = this.getAssigneeName(fields, task);
      return ownerName || assigneeName || `Task ${task.task_id}`;
    };
    
    // ENHANCED: Build comprehensive project description
    const buildProjectDescription = () => {
      const itemName = getFieldValue(FIELD_MAPPINGS.itemPartName);
      const itemSize = getFieldValue(FIELD_MAPPINGS.itemPartSize);
      const quantity = getFieldValue(FIELD_MAPPINGS.quantity);
      const briefDesc = getFieldValue(FIELD_MAPPINGS.projectDescription);
      const extendedDesc = getFieldValue(FIELD_MAPPINGS.extendedDescription);
      
      let description = '';
      
      // Primary: Use item name if available
      if (itemName) {
        description = itemName;
        if (itemSize) description += ` (${itemSize})`;
        if (quantity) description += ` - ${quantity}`;
      } else if (briefDesc) {
        description = briefDesc;
      } else {
        description = 'Project details not specified';
      }
      
      // Add extended description if available and different
      if (extendedDesc && extendedDesc !== description && extendedDesc.trim()) {
        description += `\n\nAdditional Details: ${extendedDesc}`;
      }
      
      return description;
    };
    
    // ENHANCED: Build comprehensive notes section
    const buildNotes = () => {
      const comments = getFieldValue(FIELD_MAPPINGS.comments);
      const extendedDesc = getFieldValue(FIELD_MAPPINGS.extendedDescription);
      const estimatedHours = getFieldValue(FIELD_MAPPINGS.estimatedHours);
      const quantity = getFieldValue(FIELD_MAPPINGS.quantity);
      const itemSize = getFieldValue(FIELD_MAPPINGS.itemPartSize);
      
      const notesParts = [];
      
      if (comments && comments.trim()) {
        notesParts.push(`Comments: ${comments}`);
      }
      
      if (estimatedHours) {
        notesParts.push(`Estimated Hours: ${estimatedHours}`);
      }
      
      if (quantity) {
        notesParts.push(`Quantity: ${quantity}`);
      }
      
      if (itemSize) {
        notesParts.push(`Size/Specification: ${itemSize}`);
      }
      
      // Add system info
      const ownerName = this.getOwnerName(fields, task);
      const assigneeName = this.getAssigneeName(fields, task);
      const systemInfo = [`Job ID: ${fields.job_id || task.task_id}`];
      
      if (ownerName) systemInfo.push(`Owner: ${ownerName}`);
      if (assigneeName) systemInfo.push(`Assigned: ${assigneeName}`);
      
      notesParts.push(systemInfo.join(' | '));
      
      return notesParts.join('\n\n');
    };
    
    // Fix for the quote object in src/services/dataMapping.ts
// Replace the entire quote object definition (around line 250-295) with this:

// ENHANCED: Build the quote object with all new fields
const quote: QuoteRequest = {
  id: task.task_id.toString(),
  clientName: this.cleanString(getCustomerName()),
  clientEmail: this.cleanString(getFieldValue(FIELD_MAPPINGS.clientEmail) || 'unknown@example.com'),
  clientPhone: this.cleanString(getFieldValue(FIELD_MAPPINGS.clientPhone)),
  projectType: this.cleanString(getFieldValue(FIELD_MAPPINGS.projectType) || 'Manufacturing Quote'),
  projectDescription: this.cleanString(buildProjectDescription()),
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
  notes: this.cleanString(buildNotes()),
  comments: this.parseComments(fields, task),
  
  // NEW FIELDS - Extract from HiSAFE data
  itemPartName: this.cleanString(getFieldValue(FIELD_MAPPINGS.itemPartName)),
  itemPartSize: this.cleanString(getFieldValue(FIELD_MAPPINGS.itemPartSize)),
  estimatedJobHours: this.parseNumber(getFieldValue(FIELD_MAPPINGS.estimatedHours)),
  quoteExpirationDate: getFieldValue(FIELD_MAPPINGS.quoteExpirationDate) ? 
    this.formatDate(getFieldValue(FIELD_MAPPINGS.quoteExpirationDate)) : undefined,
  quoteTotal: this.parseNumber(getFieldValue(FIELD_MAPPINGS.estimatedCost))
};
    // Enhanced debug log
    console.log('✅ Enhanced mapping complete:', {
      id: quote.id,
      clientName: quote.clientName,
      projectDescription: quote.projectDescription.substring(0, 100) + '...',
      estimatedCost: quote.estimatedCost,
      status: quote.status,
      originalStatus: rawStatus,
      timeline: quote.timeline,
      customerObject: fields.Customer,
      quoteTotal: fields.Quote_Total,
      itemPartName: fields.Item_Part_Name,
      estimatedNeedBy: fields.Estimated_Need_by_Date
    });
    
    return quote;
  }
  
  // Helper methods
  private static getOwnerName(fields: any, task: HiSAFETask): string {
    if (fields.owner && typeof fields.owner === 'object' && fields.owner.name) {
      return fields.owner.name;
    }
    if (task.owner && typeof task.owner === 'object' && task.owner.name) {
      return task.owner.name;
    }
    return '';
  }
  
  private static getAssigneeName(fields: any, task: HiSAFETask): string {
    // Handle assignee array
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
  }
  
  // Enhanced date formatting
  private static formatDate(dateValue: any): string {
    if (!dateValue) return new Date().toISOString();
    
    // Handle different date formats
    if (typeof dateValue === 'string') {
      // Handle ISO date strings
      if (dateValue.includes('T') || dateValue.includes('Z')) {
        return dateValue;
      }
      // Handle simple date strings like "2025-10-02"
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(dateValue + 'T00:00:00Z').toISOString();
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
  
  // Enhanced numeric parsing with currency support
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
  
  // Fix for the cleanString function in src/services/dataMapping.ts
// Replace the existing cleanString function with this enhanced version:

// Enhanced string cleaning with better type handling
private static cleanString(value: any): string {
  // Handle null/undefined
  if (value === null || value === undefined) return '';
  
  // Handle numbers - convert to string
  if (typeof value === 'number') return String(value);
  
  // Handle booleans - convert to string
  if (typeof value === 'boolean') return String(value);
  
  // Handle objects - check if it has a meaningful property
  if (typeof value === 'object') {
    // Handle common object structures from HiSAFE
    if (value.name) return String(value.name).trim();
    if (value.text) return String(value.text).trim();
    if (value.value) return String(value.value).trim();
    
    // For other objects, try to stringify
    try {
      const stringified = JSON.stringify(value);
      return stringified === '{}' ? '' : stringified;
    } catch {
      return '';
    }
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  
  // Handle strings (the normal case)
  try {
    return String(value).trim();
  } catch {
    return '';
  }
}
  // Enhanced comment parsing
  private static parseComments(fields: Record<string, any>, task: HiSAFETask): Comment[] {
    const comments: Comment[] = [];
    
    // Try to extract comments from various fields
    const commentSources = [
      { source: fields.Comments?.text, label: 'Comments' },
      { source: fields.extended_description?.text, label: 'Extended Description' },
      { source: fields.comments, label: 'Comments' },
      { source: fields.notes, label: 'Notes' },
      { source: fields.remarks, label: 'Remarks' }
    ];
    
    commentSources.forEach(({ source, label }, index) => {
      if (source && typeof source === 'string' && source.trim()) {
        comments.push({
          id: `comment-${index}`,
          author: 'System',
          authorType: 'contractor',
          message: `${label}: ${source.trim()}`,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    return comments;
  }
  
  // All the existing helper methods remain the same...
  static debugTaskStructure(task: HiSAFETask): void {
    console.group(`🔍 Enhanced Task ${task.task_id} Structure Debug:`);
    console.log('✓ Task ID:', task.task_id);
    console.log('✓ Job ID:', task.job_id);
    console.log('✓ Customer:', task.fields?.Customer);
    console.log('✓ Item/Part Name:', task.fields?.Item_Part_Name);
    console.log('✓ Item/Part Size:', task.fields?.Item_Part_Size);
    console.log('✓ Quote Total:', task.fields?.Quote_Total);
    console.log('✓ Unit Quantity:', task.fields?.Unit_Quantity);
    console.log('✓ Estimated Need By:', task.fields?.Estimated_Need_by_Date);
    console.log('✓ Estimated Hours:', task.fields?.Estimated_Job_Hours);
    console.log('✓ Comments:', task.fields?.Comments);
    console.log('✓ Extended Description:', task.fields?.extended_description);
    console.log('✓ Quote Expiration:', task.fields?.Quote_Expiration_Date);
    console.log('✓ Task Status:', task.fields?.status);
    console.log('✓ Owner:', task.fields?.owner);
    console.log('✓ Assignee:', task.fields?.assignee);
    
    if (task.fields && typeof task.fields === 'object') {
      console.log('✓ All Available Fields:', Object.keys(task.fields));
      console.group('📋 All Field Values:');
      Object.entries(task.fields).forEach(([key, value]) => {
        const type = typeof value;
        if (type === 'object' && value !== null) {
          console.log(`${key} (${type}):`, value);
        } else {
          console.log(`${key} (${type}):`, value);
        }
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }
  
  // Existing helper methods remain unchanged...
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
  
  static serializeCommentsForHiSAFE(comments: Comment[]): string {
    return JSON.stringify(comments);
  }
  
  static autoDetectFieldMappings(tasks: HiSAFETask[]): Record<string, string[]> {
    const fieldFrequency: Record<string, number> = {};
    
    tasks.forEach(task => {
      if (task.fields) {
        Object.keys(task.fields).forEach(fieldName => {
          fieldFrequency[fieldName] = (fieldFrequency[fieldName] || 0) + 1;
        });
      }
    });
    
    console.log('🔍 Enhanced field frequency analysis:', fieldFrequency);
    
    const sortedFields = Object.entries(fieldFrequency)
      .sort(([,a], [,b]) => b - a)
      .map(([fieldName]) => fieldName);
    
    console.log('📊 Fields ordered by frequency:', sortedFields);
    
    return {
      commonFields: sortedFields.slice(0, 15), // More fields now available
      allFields: sortedFields
    };
  }
  
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
    
    // Add all fields with enhanced detail
    if (task.fields) {
      Object.entries(task.fields).forEach(([key, value]) => {
        allData[`field_${key}`] = value;
      });
    }
    
    return allData;
  }
}

export default DataMappingService;
