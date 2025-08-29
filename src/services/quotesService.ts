// src/services/quotesService.ts - Fixed with fallback to working approach
import { QuoteRequest, QuoteStatus } from '@/types/quote';
import { hisafeApi, HiSAFETask } from './hisafeApi';
import DataMappingService from './dataMapping';

export class QuotesService {
  
  // Get all quotes from HiSAFE - using the original working approach with fallback for complete data
  async getAllQuotes(): Promise<QuoteRequest[]> {
    try {
      console.log('🔄 Loading all quotes from HiSAFE...');
      
      // Use the original approach that was working - loading portal data directly
      // This gets the basic task data that we know works
      let portalData;
      
      try {
        // First try to load portal data (this is what was working before)
        portalData = await hisafeApi.loadPortalData();
        console.log('✅ Portal data loaded successfully:', portalData);
      } catch (portalError) {
        console.error('❌ Failed to load portal data:', portalError);
        throw new Error('Failed to connect to HiSAFE portal');
      }
      
      const allQuotes: QuoteRequest[] = [];
      const allRawTasks: any[] = [];
      
      if (portalData && typeof portalData === 'object') {
        // Process each series (form) data - same as before
        for (const [seriesId, componentData] of Object.entries(portalData)) {
          console.log(`📊 Processing series ${seriesId}:`, componentData);
          
          if (componentData && componentData.type === 'list' && componentData.listResult) {
            console.log(`📝 Found ${componentData.listResult.length} tasks in series ${seriesId}`);
            
            allRawTasks.push(...componentData.listResult);
            
            // Process each task
            for (const basicTask of componentData.listResult) {
              try {
                let taskToProcess = basicTask;
                
                // Try to get complete task details, but fall back to basic if it fails
                try {
                  console.log(`🔍 Attempting to get complete data for task ${basicTask.task_id}...`);
                  const completeTask = await hisafeApi.getTask(basicTask.task_id);
                  
                  // Merge basic and complete data
                  taskToProcess = {
                    ...basicTask,
                    ...completeTask,
                    // Ensure we keep the basic fields that we know work
                    task_id: basicTask.task_id,
                    status: completeTask.status || basicTask.status,
                    fields: { ...basicTask.fields, ...completeTask.fields }
                  };
                  
                  console.log(`✅ Got complete data for task ${basicTask.task_id}, fields:`, Object.keys(taskToProcess.fields || {}));
                } catch (completeError) {
                  console.warn(`⚠️ Failed to get complete data for task ${basicTask.task_id}, using basic data:`, completeError.message);
                  // taskToProcess remains as basicTask - this is our fallback
                }
                
                // Map to quote
                const mappedQuote = DataMappingService.mapTaskToQuote(taskToProcess);
                allQuotes.push(mappedQuote);
                
                console.log(`✅ Successfully mapped task ${basicTask.task_id} to quote`);
                
              } catch (mappingError) {
                console.error(`❌ Failed to map task ${basicTask.task_id}:`, mappingError);
                DataMappingService.debugTaskStructure(basicTask);
                
                // Create a minimal fallback quote so we don't lose the task completely
                try {
                  const fallbackQuote: QuoteRequest = {
                    id: basicTask.task_id?.toString() || 'unknown',
                    clientName: basicTask.brief_description || `Task ${basicTask.task_id}`,
                    clientEmail: 'unknown@example.com',
                    clientPhone: '',
                    projectType: 'General',
                    projectDescription: basicTask.brief_description || 'Project details not available',
                    budget: '',
                    timeline: basicTask.due_date || '',
                    location: '',
                    status: this.mapStatus(basicTask.status?.name || 'pending'),
                    submittedAt: basicTask.created_date || new Date().toISOString(),
                    updatedAt: basicTask.updated_date || basicTask.created_date || new Date().toISOString(),
                    estimatedCost: undefined,
                    notes: `Fallback mapping - original data may be incomplete`,
                    comments: []
                  };
                  allQuotes.push(fallbackQuote);
                  console.log(`⚠️ Added fallback quote for task ${basicTask.task_id}`);
                } catch (fallbackError) {
                  console.error(`💥 Complete failure for task ${basicTask.task_id}:`, fallbackError);
                }
              }
            }
          }
        }
      }
      
      console.log(`🎉 Successfully loaded ${allQuotes.length} quotes from ${allRawTasks.length} raw tasks`);
      return allQuotes;
      
    } catch (error) {
      console.error('💥 Failed to get all quotes:', error);
      throw new Error('Failed to load quotes from HiSAFE');
    }
  }
  
  // Helper to map HiSAFE status to our status
  private mapStatus(hisafeStatus: string): QuoteStatus {
    const statusMappings = {
      'Quote Complete': 'approved',
      'Awaiting Approval': 'pending',
      'Work in Progress': 'processing',
      'Awaiting Quote Generation': 'processing',
      'Quote Denied': 'denied',
      'Cancelled': 'denied',
      'Completed': 'approved',
      'Closed': 'approved'
    } as const;
    
    return statusMappings[hisafeStatus as keyof typeof statusMappings] || 'pending';
  }
  
  // Get a single quote by ID with complete data (if possible)
  async getQuote(quoteId: string): Promise<QuoteRequest | null> {
    try {
      const taskId = parseInt(quoteId);
      if (isNaN(taskId)) {
        throw new Error('Invalid quote ID');
      }
      
      console.log(`🔍 Getting quote data for task ${taskId}...`);
      
      try {
        // Try to get complete task details
        const task = await hisafeApi.getTask(taskId);
        return DataMappingService.mapTaskToQuote(task);
      } catch (detailError) {
        console.warn(`Failed to get detailed task data for ${taskId}, searching in loaded quotes:`, detailError.message);
        
        // Fallback: search in already loaded quotes
        const allQuotes = await this.getAllQuotes();
        return allQuotes.find(quote => quote.id === quoteId) || null;
      }
      
    } catch (error) {
      console.error(`Failed to get quote ${quoteId}:`, error);
      return null;
    }
  }
  
  // Add a comment to a quote - simplified version
  async addComment(quoteId: string, commentText: string, author: string = 'User'): Promise<QuoteRequest> {
    try {
      const taskId = parseInt(quoteId);
      if (isNaN(taskId)) {
        throw new Error('Invalid quote ID');
      }
      
      console.log(`💬 Adding comment to task ${taskId}...`);
      
      // Get current quote data
      const currentQuote = await this.getQuote(quoteId);
      if (!currentQuote) {
        throw new Error('Quote not found');
      }
      
      // Add comment to the quote locally
      const updatedQuote = DataMappingService.addCommentToQuote(currentQuote, commentText, author);
      
      try {
        // Try to update HiSAFE with the comment
        const serializedComments = DataMappingService.serializeCommentsForHiSAFE(updatedQuote.comments);
        
        // Prepare fields to update in HiSAFE - you can customize these field names
        const fieldsToUpdate: Record<string, any> = {
          'Comments': serializedComments, // Main comments field
          'Last Comment': `${author}: ${commentText}`, // Simple text field for latest comment
          'Last Updated': new Date().toISOString(), // Update timestamp
          'Internal Notes': `${commentText} - Added by ${author} on ${new Date().toLocaleString()}` // Backup field
        };
        
        await hisafeApi.updateTask(taskId, fieldsToUpdate);
        console.log(`✅ Successfully updated HiSAFE task ${taskId} with comment`);
        
      } catch (updateError) {
        console.warn(`⚠️ Failed to update HiSAFE task ${taskId}, but comment added locally:`, updateError.message);
        // Comment is still added locally, so we can continue
      }
      
      return updatedQuote;
      
    } catch (error) {
      console.error(`Failed to add comment to quote ${quoteId}:`, error);
      throw error;
    }
  }
  
  // Update an existing quote
  async updateQuote(quoteId: string, updates: Partial<QuoteRequest>): Promise<QuoteRequest> {
    try {
      const taskId = parseInt(quoteId);
      if (isNaN(taskId)) {
        throw new Error('Invalid quote ID');
      }
      
      // Get current quote data
      const currentQuote = await this.getQuote(quoteId);
      if (!currentQuote) {
        throw new Error('Quote not found');
      }
      
      // Merge updates with current data
      const updatedQuote = {
        ...currentQuote,
        ...updates,
        id: quoteId, // Ensure ID doesn't change
        updatedAt: new Date().toISOString()
      };
      
      // Validate the updated data
      const errors = DataMappingService.validateQuoteData(updatedQuote);
      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }
      
      // Map to HiSAFE fields (only the updated fields)
      const fields = DataMappingService.mapQuoteToTaskFields(updates);
      
      // Update the task in HiSAFE
      await hisafeApi.updateTask(taskId, fields);
      
      console.log('Updated quote:', quoteId);
      return updatedQuote;
      
    } catch (error) {
      console.error(`Failed to update quote ${quoteId}:`, error);
      throw error;
    }
  }
  
  // Update quote status
  async updateQuoteStatus(quoteId: string, status: QuoteStatus): Promise<QuoteRequest> {
    return this.updateQuote(quoteId, { status });
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
  
  // Search quotes by client name or project description
  async searchQuotes(searchTerm: string): Promise<QuoteRequest[]> {
    const allQuotes = await this.getAllQuotes();
    const term = searchTerm.toLowerCase();
    
    return allQuotes.filter(quote => 
      quote.clientName.toLowerCase().includes(term) ||
      quote.clientEmail.toLowerCase().includes(term) ||
      quote.projectDescription.toLowerCase().includes(term) ||
      quote.projectType.toLowerCase().includes(term)
    );
  }
  
  // Test HiSAFE connection
  async testConnection(): Promise<boolean> {
    try {
      await hisafeApi.initAuth();
      const metadata = await hisafeApi.getPortalMetadata();
      console.log('HiSAFE connection test successful:', metadata);
      return true;
    } catch (error) {
      console.error('HiSAFE connection test failed:', error);
      return false;
    }
  }
  
  // Debug method to inspect raw HiSAFE data
  async debugRawData(): Promise<void> {
    try {
      console.group('HiSAFE Raw Data Debug');
      
      try {
        const portalData = await hisafeApi.loadPortalData();
        console.log('Portal Data:', portalData);
        
        if (portalData && typeof portalData === 'object') {
          Object.entries(portalData).forEach(([seriesId, componentData]: [string, any]) => {
            if (componentData && componentData.type === 'list' && componentData.listResult) {
              console.log(`Series ${seriesId} has ${componentData.listResult.length} tasks`);
              if (componentData.listResult.length > 0) {
                console.group(`First task in series ${seriesId}:`);
                DataMappingService.debugTaskStructure(componentData.listResult[0]);
                console.groupEnd();
              }
            }
          });
        }
      } catch (error) {
        console.error('Failed to load portal data for debugging:', error);
      }
      
      console.groupEnd();
    } catch (error) {
      console.error('Debug failed:', error);
    }
  }
}

// Create and export service instance
export const quotesService = new QuotesService();
export default quotesService;
