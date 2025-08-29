// src/services/quotesService.ts - Updated to get complete task details
import { QuoteRequest, QuoteStatus } from '@/types/quote';
import { hisafeApi, HiSAFETask } from './hisafeApi';
import DataMappingService from './dataMapping';

export class QuotesService {
  
  // Get all quotes from HiSAFE with complete field data
  async getAllQuotes(): Promise<QuoteRequest[]> {
    try {
      console.log('🔄 Loading all quotes with complete data...');
      
      // First, get the basic task list from portal data
      const basicTasks = await hisafeApi.getAllTasks();
      console.log(`📋 Found ${basicTasks.length} basic tasks`);
      
      if (basicTasks.length === 0) {
        console.warn('⚠️ No tasks found in portal data');
        return [];
      }
      
      // Then, get complete details for each task
      const completeQuotes: QuoteRequest[] = [];
      const failedTasks: number[] = [];
      
      for (const basicTask of basicTasks) {
        try {
          console.log(`🔍 Getting complete data for task ${basicTask.task_id}...`);
          
          // Get complete task details including all form fields
          const completeTask = await hisafeApi.getTask(basicTask.task_id);
          
          // Merge basic task data with complete task data
          const mergedTask: HiSAFETask = {
            ...basicTask,
            ...completeTask,
            // Ensure we keep the basic fields from the list view
            task_id: basicTask.task_id,
            status: completeTask.status || basicTask.status,
            fields: completeTask.fields || basicTask.fields || {}
          };
          
          console.log(`✅ Complete task data for ${basicTask.task_id}:`, {
            taskId: mergedTask.task_id,
            status: mergedTask.status,
            fieldsCount: Object.keys(mergedTask.fields || {}).length,
            availableFields: Object.keys(mergedTask.fields || {})
          });
          
          // Map to quote
          const quote = DataMappingService.mapTaskToQuote(mergedTask);
          completeQuotes.push(quote);
          
        } catch (error) {
          console.error(`❌ Failed to get complete data for task ${basicTask.task_id}:`, error);
          failedTasks.push(basicTask.task_id);
          
          // Fallback: use basic task data
          try {
            const fallbackQuote = DataMappingService.mapTaskToQuote(basicTask);
            fallbackQuote.notes = `Limited data available - full details failed to load`;
            completeQuotes.push(fallbackQuote);
            console.log(`⚠️ Using fallback data for task ${basicTask.task_id}`);
          } catch (fallbackError) {
            console.error(`💥 Complete failure for task ${basicTask.task_id}:`, fallbackError);
          }
        }
      }
      
      if (failedTasks.length > 0) {
        console.warn(`⚠️ Failed to get complete data for ${failedTasks.length} tasks:`, failedTasks);
      }
      
      console.log(`🎉 Successfully loaded ${completeQuotes.length} complete quotes from ${basicTasks.length} tasks`);
      return completeQuotes;
      
    } catch (error) {
      console.error('💥 Failed to get all quotes:', error);
      throw new Error('Failed to load quotes from HiSAFE');
    }
  }
  
  // Get a single quote by ID with complete data
  async getQuote(quoteId: string): Promise<QuoteRequest | null> {
    try {
      const taskId = parseInt(quoteId);
      if (isNaN(taskId)) {
        throw new Error('Invalid quote ID');
      }
      
      console.log(`🔍 Getting complete quote data for task ${taskId}...`);
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
      
      // Add comment to the quote
      const updatedQuote = DataMappingService.addCommentToQuote(currentQuote, commentText, author);
      
      // Serialize comments for HiSAFE storage
      const serializedComments = DataMappingService.serializeCommentsForHiSAFE(updatedQuote.comments);
      
      // Prepare fields to update in HiSAFE
      const fieldsToUpdate: Record<string, any> = {};
      
      // Update the comments field in HiSAFE
      const commentsFieldName = 'Comments'; // You can adjust this based on your HiSAFE field name
      fieldsToUpdate[commentsFieldName] = serializedComments;
      
      // Also update any other field you want to modify when a comment is added
      // For example, if you have a "Last Comment" or "Internal Notes" field:
      fieldsToUpdate['Last Comment'] = `${author}: ${commentText}`;
      fieldsToUpdate['Last Updated'] = new Date().toISOString();
      
      // Update the task in HiSAFE
      await hisafeApi.updateTask(taskId, fieldsToUpdate);
      
      console.log(`✅ Successfully added comment to task ${taskId}`);
      return updatedQuote;
      
    } catch (error) {
      console.error(`Failed to add comment to quote ${quoteId}:`, error);
      throw error;
    }
  }
  
  // Create a new quote
  async createQuote(quoteData: Partial<QuoteRequest>): Promise<QuoteRequest> {
    try {
      // Validate the quote data
      const errors = DataMappingService.validateQuoteData(quoteData);
      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }
      
      // Set default values
      const quote: QuoteRequest = {
        id: '', // Will be set after creation
        clientName: quoteData.clientName || '',
        clientEmail: quoteData.clientEmail || '',
        clientPhone: quoteData.clientPhone || '',
        projectType: quoteData.projectType || '',
        projectDescription: quoteData.projectDescription || '',
        budget: quoteData.budget || '',
        timeline: quoteData.timeline || '',
        location: quoteData.location || '',
        status: quoteData.status || 'pending',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        estimatedCost: quoteData.estimatedCost,
        notes: quoteData.notes || '',
        comments: quoteData.comments || []
      };
      
      // Map to HiSAFE fields
      const fields = DataMappingService.mapQuoteToTaskFields(quote);
      
      // Get the appropriate form ID
      const formId = DataMappingService.getFormIdForQuote(quote);
      
      // Create the task in HiSAFE
      const createdTask = await hisafeApi.createTask(formId, fields);
      
      // Return the created quote with the actual ID
      quote.id = createdTask.task_id?.toString() || createdTask.id?.toString();
      
      console.log('Created new quote:', quote.id);
      return quote;
      
    } catch (error) {
      console.error('Failed to create quote:', error);
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
  
  // Get recent quotes (last 30 days)
  async getRecentQuotes(days: number = 30): Promise<QuoteRequest[]> {
    const allQuotes = await this.getAllQuotes();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return allQuotes.filter(quote => 
      new Date(quote.submittedAt) >= cutoffDate
    ).sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }
  
  // Test HiSAFE connection
  async test
