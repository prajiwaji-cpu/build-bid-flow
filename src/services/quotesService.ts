// src/services/quotesService.ts - Using the same method as ExamplePresentation
import { QuoteRequest, QuoteStatus } from '@/types/quote';
import { hisafeApi, HiSAFETask } from './hisafeApi';
import DataMappingService from './dataMapping';

export class QuotesService {
  
  // Get all quotes from HiSAFE - using the EXACT same method as ExamplePresentation
  async getAllQuotes(): Promise<QuoteRequest[]> {
    try {
      console.log('🔄 Loading quotes using portal method like ExamplePresentation...');
      
      // Step 1: Get portal metadata to find available series IDs (just like ExamplePresentation)
      const metadata = await hisafeApi.getPortalMetadata();
      console.log('Portal metadata:', metadata);
      
      // Step 2: Extract series IDs from dashboard components
      const seriesIds: string[] = [];
      if (metadata.dashboardComponents) {
        for (const component of metadata.dashboardComponents) {
          if (component.series) {
            for (const series of component.series) {
              if (series.id) {
                seriesIds.push(series.id.toString());
              }
            }
          }
        }
      }
      
      console.log('📊 Found series IDs in metadata:', seriesIds);
      
      // If no series found in metadata, use the one we know from diagnostics
      if (seriesIds.length === 0) {
        seriesIds.push('50'); // From your diagnostic results
        console.log('⚠️ No series found in metadata, using known series 50');
      }
      
      // Step 3: Load portal data for each series (same as ExamplePresentation does)
      const allQuotes: QuoteRequest[] = [];
      
      for (const seriesId of seriesIds) {
        try {
          console.log(`🎯 Loading portal data for series ${seriesId}...`);
          
          // Call loadPortalData with specific series ID (just like ApiClient.getPortalData)
          const portalData = await hisafeApi.loadPortalData([seriesId]);
          console.log(`✅ Portal data loaded for series ${seriesId}:`, portalData);
          
          // Step 4: Process the results (same structure as your working version)
          if (portalData && typeof portalData === 'object') {
            Object.entries(portalData).forEach(([returnedSeriesId, componentData]: [string, any]) => {
              console.log(`📊 Processing returned series ${returnedSeriesId}:`, componentData);
              
              if (componentData && componentData.type === 'list' && componentData.listResult) {
                console.log(`📝 Found ${componentData.listResult.length} tasks in series ${returnedSeriesId}`);
                
                // Process each task
                componentData.listResult.forEach((task: any, index: number) => {
                  try {
                    // Map the task to a quote (same as before)
                    const mappedQuote = DataMappingService.mapTaskToQuote(task);
                    allQuotes.push(mappedQuote);
                    console.log(`✅ Mapped task ${task.task_id} successfully`);
                  } catch (mappingError) {
                    console.error(`❌ Failed to map task ${task.task_id}:`, mappingError);
                    DataMappingService.debugTaskStructure(task);
                    
                    // Create fallback quote
                    try {
                      const fallbackQuote: QuoteRequest = {
                        id: task.task_id?.toString() || `fallback-${index}`,
                        clientName: task.brief_description || `Task ${task.task_id}`,
                        clientEmail: 'unknown@example.com',
                        clientPhone: '',
                        projectType: 'General',
                        projectDescription: task.brief_description || 'Project details not available',
                        budget: '',
                        timeline: task.due_date || '',
                        location: '',
                        status: this.mapStatus(task.status?.name || 'pending'),
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
              } else {
                console.log(`ℹ️ Series ${returnedSeriesId} does not contain list data:`, componentData);
              }
            });
          }
          
        } catch (seriesError) {
          console.error(`❌ Failed to load portal data for series ${seriesId}:`, seriesError);
          // Continue to next series
        }
      }
      
      // Step 5: Validate we got the expected task IDs
      const expectedTaskIds = [1, 2, 3, 5, 7, 421, 431, 433, 434];
      const foundTaskIds = allQuotes.map(q => parseInt(q.id)).sort((a, b) => a - b);
      const missingTaskIds = expectedTaskIds.filter(id => !foundTaskIds.includes(id));
      
      console.log(`📊 Expected task IDs: ${expectedTaskIds.join(', ')}`);
      console.log(`📊 Found task IDs: ${foundTaskIds.join(', ')}`);
      if (missingTaskIds.length > 0) {
        console.log(`⚠️ Missing task IDs: ${missingTaskIds.join(', ')}`);
      }
      
      console.log(`🎉 Successfully loaded ${allQuotes.length} quotes using portal method`);
      
      // Sort quotes by ID for consistent display
      allQuotes.sort((a, b) => parseInt(a.id) - parseInt(b.id));
      
      return allQuotes;
      
    } catch (error) {
      console.error('💥 Failed to get all quotes:', error);
      throw new Error(`Failed to load quotes: ${error.message}`);
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
  
  // Get a single quote by ID
  async getQuote(quoteId: string): Promise<QuoteRequest | null> {
    try {
      const taskId = parseInt(quoteId);
      if (isNaN(taskId)) {
        throw new Error('Invalid quote ID');
      }
      
      console.log(`🔍 Getting quote data for task ${taskId}...`);
      const task = await hisafeApi.getTask(taskId);
      return DataMappingService.mapTaskToQuote(task);
      
    } catch (error) {
      console.error(`Failed to get quote ${quoteId}:`, error);
      return null;
    }
  }
  
  // Add a comment to a quote
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
        
        // Try multiple field names for storing comments
        const fieldsToUpdate: Record<string, any> = {
          'Comments': serializedComments,
          'comments': serializedComments,
          'Notes': serializedComments,
          'notes': serializedComments,
          'Internal Comments': serializedComments,
          'Last Comment': `${author}: ${commentText}`,
          'Last Updated': new Date().toISOString(),
          'Activity': `Comment added by ${author}: ${commentText}`,
          'Remarks': `${author}: ${commentText}`
        };
        
        await hisafeApi.updateTask(taskId, fieldsToUpdate);
        console.log(`✅ Successfully updated HiSAFE task ${taskId} with comment`);
        
      } catch (updateError) {
        console.warn(`⚠️ Failed to update HiSAFE task ${taskId}, but comment added locally:`, updateError.message);
      }
      
      return updatedQuote;
      
    } catch (error) {
      console.error(`Failed to add comment to quote ${quoteId}:`, error);
      throw error;
    }
  }
  
  // Update quote status
  async updateQuoteStatus(quoteId: string, status: QuoteStatus): Promise<QuoteRequest> {
    try {
      const taskId = parseInt(quoteId);
      if (isNaN(taskId)) {
        throw new Error('Invalid quote ID');
      }
      
      // Get current quote
      const currentQuote = await this.getQuote(quoteId);
      if (!currentQuote) {
        throw new Error('Quote not found');
      }
      
      // Update status locally
      const updatedQuote = { ...currentQuote, status, updatedAt: new Date().toISOString() };
      
      try {
        // Map to HiSAFE status and update
        const statusMappings = {
          'pending': 'Awaiting Approval',
          'processing': 'Work in Progress', 
          'approved': 'Quote Complete',
          'denied': 'Quote Denied'
        };
        
        const hisafeStatus = statusMappings[status];
        if (hisafeStatus) {
          await hisafeApi.updateTask(taskId, { status: hisafeStatus });
          console.log(`✅ Updated task ${taskId} status to ${hisafeStatus}`);
        }
      } catch (updateError) {
        console.warn(`⚠️ Failed to update HiSAFE status for task ${taskId}:`, updateError.message);
      }
      
      return updatedQuote;
      
    } catch (error) {
      console.error(`Failed to update quote status ${quoteId}:`, error);
      throw error;
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
      quote.projectType.toLowerCase().includes(term)
    );
  }
  
  // Test connection
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
  
  // Debug method - test if we can load the expected task IDs
  async debugExpectedTasks(): Promise<void> {
    const expectedTaskIds = [1, 2, 3, 5, 7, 421, 431, 433, 434];
    
    console.group('🔬 Testing Expected Task IDs');
    
    for (const taskId of expectedTaskIds) {
      try {
        const task = await hisafeApi.getTask(taskId);
        console.log(`✅ Task ${taskId}: ACCESSIBLE`, {
          brief_description: task.brief_description || task.fields?.brief_description,
          status: task.status?.name || task.fields?.status?.name,
          due_date: task.due_date || task.fields?.due_date
        });
      } catch (error) {
        if (error.message.includes('403')) {
          console.log(`❌ Task ${taskId}: EXISTS but not in portal scope`);
        } else if (error.message.includes('404')) {
          console.log(`ℹ️ Task ${taskId}: DOESN'T EXIST`);
        } else {
          console.log(`⚠️ Task ${taskId}: ERROR - ${error.message}`);
        }
      }
    }
    
    console.groupEnd();
  }
}

// Create and export service instance
export const quotesService = new QuotesService();
export default quotesService;
