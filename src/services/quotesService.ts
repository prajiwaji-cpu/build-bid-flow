// src/services/quotesService.ts
import { QuoteRequest, QuoteStatus } from '@/types/quote';
import { hisafeApi, HiSAFETask } from './hisafeApi';
import DataMappingService from './dataMapping';

export class QuotesService {
  
  // Get all quotes from HiSAFE
  async getAllQuotes(): Promise<QuoteRequest[]> {
    try {
      const tasks = await hisafeApi.getAllTasks();
      
      // Map HiSAFE tasks to quote requests
      const quotes = tasks.map(task => {
        try {
          return DataMappingService.mapTaskToQuote(task);
        } catch (error) {
          console.warn(`Failed to map task ${task.task_id}:`, error);
          // Debug the problematic task
          DataMappingService.debugTaskStructure(task);
          return null;
        }
      }).filter(Boolean) as QuoteRequest[];
      
      console.log(`Loaded ${quotes.length} quotes from ${tasks.length} tasks`);
      return quotes;
      
    } catch (error) {
      console.error('Failed to get all quotes:', error);
      throw new Error('Failed to load quotes from HiSAFE');
    }
  }
  
  // Get a single quote by ID
  async getQuote(quoteId: string): Promise<QuoteRequest | null> {
    try {
      const taskId = parseInt(quoteId);
      if (isNaN(taskId)) {
        throw new Error('Invalid quote ID');
      }
      
      const task = await hisafeApi.getTask(taskId);
      return DataMappingService.mapTaskToQuote(task);
      
    } catch (error) {
      console.error(`Failed to get quote ${quoteId}:`, error);
      return null;
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
  
  // Get available form IDs and metadata
  async getAvailableForms(): Promise<any[]> {
    try {
      const metadata = await hisafeApi.getPortalMetadata();
      return metadata.forms || [];
    } catch (error) {
      console.error('Failed to get available forms:', error);
      return [];
    }
  }
  
  // Debug method to inspect raw HiSAFE data
  async debugRawData(): Promise<void> {
    try {
      console.group('HiSAFE Raw Data Debug');
      
      const portalData = await hisafeApi.loadPortalData();
      console.log('Portal Data:', portalData);
      
      const tasks = await hisafeApi.getAllTasks();
      console.log(`Found ${tasks.length} tasks`);
      
      if (tasks.length > 0) {
        console.group('First Task Structure:');
        DataMappingService.debugTaskStructure(tasks[0]);
        console.groupEnd();
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
