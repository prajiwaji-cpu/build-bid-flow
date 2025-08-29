// src/services/quotesService.ts - Diagnostic version with multiple approaches to get data
import { QuoteRequest, QuoteStatus } from '@/types/quote';
import { hisafeApi, HiSAFETask } from './hisafeApi';
import DataMappingService from './dataMapping';

export class QuotesService {
  
  // Get all quotes from HiSAFE - trying multiple approaches
  async getAllQuotes(): Promise<QuoteRequest[]> {
    try {
      console.log('🔄 Starting comprehensive data loading process...');
      
      // Step 1: Test basic connectivity
      console.log('🧪 Step 1: Testing basic connectivity...');
      try {
        await hisafeApi.initAuth();
        console.log('✅ Authentication successful');
      } catch (authError) {
        console.error('❌ Authentication failed:', authError);
        throw new Error('Authentication failed');
      }
      
      // Step 2: Try to get metadata first
      console.log('🧪 Step 2: Getting portal metadata...');
      let metadata;
      try {
        metadata = await hisafeApi.getPortalMetadata();
        console.log('✅ Portal metadata retrieved:', metadata);
      } catch (metadataError) {
        console.warn('⚠️ Portal metadata failed:', metadataError.message);
      }
      
      // Step 3: Try multiple approaches to get task data
      console.log('🧪 Step 3: Attempting to load task data with different approaches...');
      
      const approaches = [
        { name: 'Portal Load - No Params', method: () => hisafeApi.loadPortalData() },
        { name: 'Portal Load - With Series 1', method: () => hisafeApi.loadPortalData(['1']) },
        { name: 'Portal Load - With Series 2', method: () => hisafeApi.loadPortalData(['2']) },
        { name: 'Portal Load - With Series 3', method: () => hisafeApi.loadPortalData(['3']) },
        { name: 'Portal Load - Multiple Series', method: () => hisafeApi.loadPortalData(['1', '2', '3']) },
      ];
      
      let successfulData = null;
      let allAttempts = [];
      
      for (const approach of approaches) {
        try {
          console.log(`🎯 Trying: ${approach.name}...`);
          const result = await approach.method();
          console.log(`✅ SUCCESS with ${approach.name}:`, result);
          
          allAttempts.push({ name: approach.name, success: true, data: result });
          
          if (!successfulData) {
            successfulData = result;
          } else {
            // Merge results if we have multiple successful approaches
            Object.assign(successfulData, result);
          }
          
        } catch (error) {
          console.log(`❌ FAILED with ${approach.name}:`, error.message);
          allAttempts.push({ name: approach.name, success: false, error: error.message });
        }
      }
      
      console.log('📊 All loading attempts summary:', allAttempts);
      
      // Step 4: If portal loading completely failed, try direct task access
      if (!successfulData) {
        console.log('🧪 Step 4: Portal loading failed, trying direct task access...');
        
        // Try to guess task IDs and access them directly
        const knownTaskIds = [434]; // From your debug data, we know task 434 exists
        const directTasks = [];
        
        for (const taskId of knownTaskIds) {
          try {
            console.log(`🎯 Trying direct access to task ${taskId}...`);
            const task = await hisafeApi.getTask(taskId);
            console.log(`✅ Successfully accessed task ${taskId}:`, task);
            directTasks.push(task);
          } catch (taskError) {
            console.log(`❌ Failed to access task ${taskId}:`, taskError.message);
          }
        }
        
        if (directTasks.length > 0) {
          console.log(`✅ Successfully got ${directTasks.length} tasks via direct access`);
          // Convert to quotes
          const quotes = directTasks.map(task => DataMappingService.mapTaskToQuote(task));
          return quotes;
        }
      }
      
      if (!successfulData) {
        throw new Error('All data loading approaches failed. The HiSAFE portal/load endpoint appears to be having issues.');
      }
      
      // Step 5: Process successful data
      console.log('🧪 Step 5: Processing successful portal data...');
      const allQuotes: QuoteRequest[] = [];
      const allRawTasks: any[] = [];
      
      if (successfulData && typeof successfulData === 'object') {
        Object.entries(successfulData).forEach(([seriesId, componentData]: [string, any]) => {
          console.log(`📊 Processing series ${seriesId}:`, componentData);
          
          if (componentData && componentData.type === 'list' && componentData.listResult) {
            console.log(`📝 Found ${componentData.listResult.length} tasks in series ${seriesId}`);
            allRawTasks.push(...componentData.listResult);
            
            // Process each task
            componentData.listResult.forEach((task: any, index: number) => {
              try {
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
            console.log(`ℹ️ Series ${seriesId} does not contain list data:`, componentData);
          }
        });
      }
      
      console.log(`🎉 Final result: ${allQuotes.length} quotes from ${allRawTasks.length} raw tasks`);
      
      // Step 6: Try to enhance with complete task data (if we have time and it's working)
      if (allQuotes.length > 0 && allQuotes.length <= 5) { // Only try this for small datasets
        console.log('🧪 Step 6: Attempting to enhance with complete task data...');
        
        for (let i = 0; i < allQuotes.length; i++) {
          const quote = allQuotes[i];
          try {
            const completeTask = await hisafeApi.getTask(parseInt(quote.id));
            const enhancedQuote = DataMappingService.mapTaskToQuote(completeTask);
            allQuotes[i] = enhancedQuote;
            console.log(`✅ Enhanced quote ${quote.id} with complete data`);
          } catch (enhanceError) {
            console.log(`⚠️ Could not enhance quote ${quote.id}:`, enhanceError.message);
            // Keep the original quote
          }
        }
      }
      
      return allQuotes;
      
    } catch (error) {
      console.error('💥 Complete failure in getAllQuotes:', error);
      throw new Error(`Failed to load quotes from HiSAFE: ${error.message}`);
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
          'Last Updated': new Date().toISOString()
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
      
      // Update status
      const updatedQuote = { ...currentQuote, status, updatedAt: new Date().toISOString() };
      
      // Map to HiSAFE status
      const hisafeStatus = {
        'pending': 'Awaiting Approval',
        'processing': 'Work in Progress',
        'approved': 'Quote Complete',
        'denied': 'Quote Denied'
      }[status];
      
      // Update in HiSAFE
      if (hisafeStatus) {
        await hisafeApi.updateTask(taskId, { status: hisafeStatus });
      }
      
      return updatedQuote;
      
    } catch (error) {
      console.error(`Failed to update quote status ${quoteId}:`, error);
      throw error;
    }
  }
  
  // Diagnostic method - comprehensive debug
  async diagnosticDebug(): Promise<void> {
    try {
      console.group('🔬 COMPREHENSIVE DIAGNOSTIC DEBUG');
      
      // Test 1: Authentication
      console.group('🧪 Test 1: Authentication');
      try {
        await hisafeApi.initAuth();
        console.log('✅ Authentication: PASSED');
      } catch (authError) {
        console.error('❌ Authentication: FAILED', authError);
      }
      console.groupEnd();
      
      // Test 2: Portal Metadata
      console.group('🧪 Test 2: Portal Metadata');
      try {
        const metadata = await hisafeApi.getPortalMetadata();
        console.log('✅ Portal Metadata: PASSED', metadata);
      } catch (metadataError) {
        console.error('❌ Portal Metadata: FAILED', metadataError);
      }
      console.groupEnd();
      
      // Test 3: Portal Load (various approaches)
      console.group('🧪 Test 3: Portal Load Variations');
      const loadVariations = [
        { name: 'No params', params: [] },
        { name: 'Series 1', params: ['1'] },
        { name: 'Series 2', params: ['2'] },
        { name: 'Multiple', params: ['1', '2', '3'] }
      ];
      
      for (const variation of loadVariations) {
        try {
          const result = await hisafeApi.loadPortalData(variation.params);
          console.log(`✅ Portal Load (${variation.name}): PASSED`, result);
        } catch (error) {
          console.error(`❌ Portal Load (${variation.name}): FAILED`, error);
        }
      }
      console.groupEnd();
      
      // Test 4: Direct Task Access (if we know any task IDs)
      console.group('🧪 Test 4: Direct Task Access');
      const knownTaskIds = [434]; // Add any known task IDs
      for (const taskId of knownTaskIds) {
        try {
          const task = await hisafeApi.getTask(taskId);
          console.log(`✅ Direct Task ${taskId}: PASSED`, task);
        } catch (error) {
          console.error(`❌ Direct Task ${taskId}: FAILED`, error);
        }
      }
      console.groupEnd();
      
      console.groupEnd();
    } catch (error) {
      console.error('Diagnostic debug failed:', error);
    }
  }
}

// Create and export service instance
export const quotesService = new QuotesService();
export default quotesService;
