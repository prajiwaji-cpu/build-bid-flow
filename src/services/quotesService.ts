// src/services/quotesService.ts - Updated with improved error handling and status mapping

import { QuoteRequest, QuoteStatus } from '@/types/quote';
import { hisafeApi } from './hisafeApi';
import { DataMappingService } from './dataMapping';

class QuotesService {
  
  // Get all quotes with enhanced error handling and debugging
  async getAllQuotes(): Promise<QuoteRequest[]> {
    try {
      console.log('🔄 Loading all quotes from HiSAFE...');
      
      // Load tasks from HiSAFE API
      const tasks = await hisafeApi.getAllTasks();
      console.log(`📊 Loaded ${tasks.length} tasks from HiSAFE`);
      
      if (tasks.length === 0) {
        console.warn('⚠️ No tasks returned from HiSAFE API');
        return [];
      }

      // Debug the first few tasks to understand structure
      if (tasks.length > 0) {
        console.group('🔍 Debugging task structures:');
        tasks.slice(0, 3).forEach((task, index) => {
          console.log(`Task ${index + 1}:`, {
            task_id: task.task_id,
            status_field: task.fields?.status,
            status_root: task.status,
            assignee_field: task.fields?.assignee,
            owner_field: task.fields?.owner,
            job_id: task.fields?.job_id,
            brief_description: task.fields?.brief_description
          });
          DataMappingService.debugTaskStructure(task);
        });
        console.groupEnd();
      }

      // Auto-detect field mappings for better understanding
      const fieldAnalysis = DataMappingService.autoDetectFieldMappings(tasks);
      console.log('📋 Field analysis:', fieldAnalysis);

      const allQuotes: QuoteRequest[] = [];
      let successfulMappings = 0;
      let failedMappings = 0;

      // Process each task
      tasks.forEach((task, index) => {
        try {
          console.log(`🔄 Processing task ${task.task_id} (${index + 1}/${tasks.length})`);
          
          // Map the task to a quote using the updated mapping service
          const mappedQuote = DataMappingService.mapTaskToQuote(task);
          allQuotes.push(mappedQuote);
          successfulMappings++;
          
          console.log(`✅ Successfully mapped task ${task.task_id} to quote`);
          
        } catch (mappingError) {
          console.error(`❌ Failed to map task ${task.task_id}:`, mappingError);
          failedMappings++;
          
          // Create fallback quote to prevent total failure
          try {
            const fallbackQuote: QuoteRequest = {
              id: task.task_id?.toString() || `fallback-${index}`,
              clientName: this.extractFallbackClientName(task),
              clientEmail: 'unknown@example.com',
              clientPhone: '',
              projectType: 'General',
              projectDescription: this.extractFallbackDescription(task),
              budget: '',
              timeline: this.extractFallbackTimeline(task),
              location: '',
              status: this.extractFallbackStatus(task),
              submittedAt: task.created_date || new Date().toISOString(),
              updatedAt: task.updated_date || task.created_date || new Date().toISOString(),
              estimatedCost: undefined,
              notes: `Fallback mapping - Task ID: ${task.task_id}`,
              comments: []
            };
            
            allQuotes.push(fallbackQuote);
            console.log(`⚠️ Added fallback quote for task ${task.task_id}`);
            
          } catch (fallbackError) {
            console.error(`💥 Complete failure for task ${task.task_id}:`, fallbackError);
          }
        }
      });

      console.log(`📈 Mapping Results: ${successfulMappings} successful, ${failedMappings} failed, ${allQuotes.length} total quotes`);
      
      // Log status distribution for debugging
      const statusCounts = allQuotes.reduce((acc, quote) => {
        acc[quote.status] = (acc[quote.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('📊 Status distribution:', statusCounts);

      return allQuotes;
      
    } catch (error) {
      console.error('💥 Failed to load quotes:', error);
      throw new Error(`Failed to load quotes: ${error.message}`);
    }
  }

  // Helper methods for fallback quote creation
  private extractFallbackClientName(task: any): string {
    if (task.fields?.owner?.name) return task.fields.owner.name;
    if (task.owner?.name) return task.owner.name;
    if (task.fields?.assignee?.[0]?.name) return task.fields.assignee[0].name;
    if (task.fields?.assignee?.name) return task.fields.assignee.name;
    if (task.assignee?.[0]?.name) return task.assignee[0].name;
    if (task.assignee?.name) return task.assignee.name;
    return `Task ${task.task_id}`;
  }

  private extractFallbackDescription(task: any): string {
    return task.fields?.brief_description || 
           task.brief_description || 
           `Project details for task ${task.task_id}`;
  }

  private extractFallbackTimeline(task: any): string {
    return task.fields?.due_date || 
           task.due_date || 
           '';
  }

  private extractFallbackStatus(task: any): QuoteStatus {
    // Try to extract status from various locations
    let statusName = '';
    
    if (task.fields?.status?.name) {
      statusName = task.fields.status.name;
    } else if (task.fields?.status && typeof task.fields.status === 'string') {
      statusName = task.fields.status;
    } else if (task.status?.name) {
      statusName = task.status.name;
    } else if (task.status && typeof task.status === 'string') {
      statusName = task.status;
    }

    // Simple status mapping for fallback
    const lowerStatus = statusName.toLowerCase();
    if (lowerStatus.includes('complete') || lowerStatus.includes('approved') || lowerStatus.includes('closed')) {
      return 'approved';
    }
    if (lowerStatus.includes('progress') || lowerStatus.includes('processing') || lowerStatus.includes('generation')) {
      return 'processing';
    }
    if (lowerStatus.includes('denied') || lowerStatus.includes('cancelled')) {
      return 'denied';
    }
    
    return 'pending';
  }

  // Get single quote by ID
  async getQuote(quoteId: string): Promise<QuoteRequest | null> {
    try {
      const taskId = parseInt(quoteId);
      if (isNaN(taskId)) {
        console.error('Invalid quote ID:', quoteId);
        return null;
      }

      console.log(`🔍 Loading quote ${quoteId} from HiSAFE...`);
      
      // Try to get specific task first
      try {
        const task = await hisafeApi.getTask(taskId);
        return DataMappingService.mapTaskToQuote(task);
      } catch (taskError) {
        console.warn(`Direct task access failed for ${taskId}, trying from all tasks:`, taskError.message);
        
        // Fallback to loading all quotes and filtering
        const allQuotes = await this.getAllQuotes();
        return allQuotes.find(quote => quote.id === quoteId) || null;
      }

    } catch (error) {
      console.error(`Failed to load quote ${quoteId}:`, error);
      throw error;
    }
  }
  
  // Update quote status
// Replace the updateQuoteStatus method in src/services/quotesService.ts with this fixed version:
// Replace the updateQuoteStatus method in src/services/quotesService.ts with this corrected version:

// SIMPLIFIED: Replace the updateQuoteStatus method in src/services/quotesService.ts

async updateQuoteStatus(quoteId: string, status: QuoteStatus): Promise<QuoteRequest> {
  try {
    const taskId = parseInt(quoteId);
    if (isNaN(taskId)) {
      throw new Error('Invalid quote ID');
    }
    
    console.log(`🔄 Updating quote ${quoteId} status to ${status}`);
    
    // Get current quote
    const currentQuote = await this.getQuote(quoteId);
    if (!currentQuote) {
      throw new Error('Quote not found');
    }
    
    // Status mappings based on your existing data
    const statusMappings = {
      'pending': { id: 5, name: 'Awaiting Approval', type: 'Open' },
      'processing': { id: 6, name: 'Work in Progress', type: 'InProgress' },
      'approved': { id: 3, name: 'Quote Complete', type: 'Open' },
      'denied': { id: 7, name: 'Quote Denied', type: 'Closed' }
    };
    
    const hisafeStatus = statusMappings[status];
    if (!hisafeStatus) {
      throw new Error(`Unknown status: ${status}`);
    }

    // Update in HiSAFE using the fixed updateTask method
    // Now that updateTask properly gets editSessionToken, we can send the full status object
    await hisafeApi.updateTask(taskId, {
      status: {
        id: hisafeStatus.id,
        name: hisafeStatus.name,
        type: hisafeStatus.type
      }
    });
    
    console.log(`✅ Updated task ${taskId} status to ${hisafeStatus.name} (ID: ${hisafeStatus.id})`);
    
    // Return updated quote with new status
    const updatedQuote = { 
      ...currentQuote, 
      status, 
      updatedAt: new Date().toISOString() 
    };
    
    return updatedQuote;
    
  } catch (error) {
    console.error(`Failed to update quote status ${quoteId}:`, error);
    throw error;
  }
}
  // Add this new method to src/services/quotesService.ts to handle comment appending

async addComment(quoteId: string, commentText: string, author: string = 'User'): Promise<QuoteRequest> {
  try {
    const taskId = parseInt(quoteId);
    if (isNaN(taskId)) {
      throw new Error('Invalid quote ID');
    }
    
    console.log(`💬 Adding comment to quote ${quoteId}...`);
    
    // Get current quote to read existing comments
    const currentQuote = await this.getQuote(quoteId);
    if (!currentQuote) {
      throw new Error('Quote not found');
    }

    // Get the current task to read the existing Comments field
    const currentTask = await hisafeApi.getTask(taskId);
    const existingComments = this.safeString(currentTask.fields?.Comments || '');
    
    // Format new comment with timestamp and author
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const newCommentEntry = `[${timestamp}] ${author}: ${commentText}`;
    
    // Append to existing comments (don't replace)
    const updatedCommentsText = existingComments 
      ? `${existingComments}\n\n${newCommentEntry}`
      : newCommentEntry;
    
    console.log(`📝 Appending comment to existing text:`, {
      existingLength: existingComments.length,
      newEntry: newCommentEntry,
      totalLength: updatedCommentsText.length
    });
    
    // Update the Comments field in HiSAFE using the proper API structure
    try {
      await hisafeApi.updateTask(taskId, {
        Comments: updatedCommentsText  // Direct field update
      });
      console.log(`✅ Successfully updated Comments field in HiSAFE for task ${taskId}`);
    } catch (updateError) {
      console.error(`⚠️ Failed to update Comments field in HiSAFE:`, updateError);
      throw new Error(`Failed to save comment to HiSAFE: ${updateError.message}`);
    }
    
    // Update local quote object with new comment
    const newComment: Comment = {
      id: Math.random().toString(36),
      author: author,
      authorType: 'contractor',
      message: commentText,
      timestamp: new Date().toISOString()
    };
    
    const updatedQuote: QuoteRequest = {
      ...currentQuote,
      comments: [...currentQuote.comments, newComment],
      updatedAt: new Date().toISOString()
    };
    
    console.log(`✅ Comment added successfully to quote ${quoteId}`);
    return updatedQuote;
    
  } catch (error) {
    console.error(`Failed to add comment to quote ${quoteId}:`, error);
    throw error;
  }
}

// Helper method to safely convert values to strings (add this to quotesService.ts)
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
      return '';
    }
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  try {
    return String(value);
  } catch {
    return '';
  }
}
  // Get quotes by status
  async getQuotesByStatus(status: QuoteStatus): Promise<QuoteRequest[]> {
    const allQuotes = await this.getAllQuotes();
    return allQuotes.filter(quote => quote.status === status);
  }
  
  // Get quotes statistics
  async getQuotesStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    approved: number;
    denied: number;
    totalValue: number;
  }> {
    try {
      const quotes = await this.getAllQuotes();
      
      const stats = {
        total: quotes.length,
        pending: 0,
        processing: 0,
        approved: 0,
        denied: 0,
        totalValue: 0
      };
      
      quotes.forEach(quote => {
        stats[quote.status]++;
        if (quote.estimatedCost) {
          stats.totalValue += quote.estimatedCost;
        }
      });
   
      console.log('📊 Quote stats calculated:', stats);
      return stats;
    } catch (error) {
      console.error('Failed to get quotes stats:', error);
      return {
        total: 0,
        pending: 0,
        processing: 0,
        approved: 0,
        denied: 0,
        totalValue: 0
      };
    }
  }
  
  // Search quotes
  async searchQuotes(searchTerm: string): Promise<QuoteRequest[]> {
    const allQuotes = await this.getAllQuotes();
    const term = searchTerm.toLowerCase();
    
    return allQuotes.filter(quote => 
      quote.clientName.toLowerCase().includes(term) ||
      quote.clientEmail.toLowerCase().includes(term) ||
      quote.projectDescription.toLowerCase().includes(term) ||
      quote.projectType.toLowerCase().includes(term) ||
      (quote.notes && quote.notes.toLowerCase().includes(term))
    );
  }
  
  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔧 Testing HiSAFE connection...');
      await hisafeApi.initAuth();
      const metadata = await hisafeApi.getPortalMetadata();
      console.log('✅ HiSAFE connection test successful:', metadata);
      return true;
    } catch (error) {
      console.error('❌ HiSAFE connection test failed:', error);
      return false;
    }
  }
  
  // Enhanced debug method
  async debugConnection(): Promise<void> {
    console.group('🔬 HiSAFE Connection Debug');
    
    try {
      // Test basic connection
      const connectionOk = await this.testConnection();
      console.log('Connection Status:', connectionOk ? '✅ OK' : '❌ Failed');
      
      if (!connectionOk) {
        console.groupEnd();
        return;
      }

      // Test task loading
      console.log('🔄 Testing task loading...');
      const tasks = await hisafeApi.getAllTasks();
      console.log(`📊 Loaded ${tasks.length} tasks`);
      
      if (tasks.length > 0) {
        console.log('🔍 Sample task structures:');
        tasks.slice(0, 2).forEach((task, index) => {
          console.group(`Task ${index + 1} (ID: ${task.task_id})`);
          console.log('Fields available:', Object.keys(task.fields || {}));
          console.log('Status structure:', task.fields?.status);
          console.log('Owner structure:', task.fields?.owner);
          console.log('Assignee structure:', task.fields?.assignee);
          console.groupEnd();
        });
      }
      
      // Test field mapping
      console.log('🗺️ Testing field mapping...');
      if (tasks.length > 0) {
        const fieldAnalysis = DataMappingService.autoDetectFieldMappings(tasks);
        console.log('Common fields:', fieldAnalysis.commonFields);
        
        // Test mapping on first task
        try {
          const mappedQuote = DataMappingService.mapTaskToQuote(tasks[0]);
          console.log('✅ Sample mapping successful:', {
            id: mappedQuote.id,
            clientName: mappedQuote.clientName,
            status: mappedQuote.status,
            projectDescription: mappedQuote.projectDescription
          });
        } catch (mappingError) {
          console.error('❌ Sample mapping failed:', mappingError);
        }
      }
      
    } catch (error) {
      console.error('💥 Debug failed:', error);
    } finally {
      console.groupEnd();
    }
  }
}

// Create and export service instance
export const quotesService = new QuotesService();
export default quotesService;
