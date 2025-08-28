// src/hooks/useQuotes.ts
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QuoteRequest, QuoteStatus } from '@/types/quote';
import { quotesService } from '@/services/quotesService';
import { useToast } from '@/hooks/use-toast';

export const useQuotes = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all quotes with caching
  const {
    data: quotes = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => quotesService.getAllQuotes(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
  });

  // Get quotes statistics
  const {
    data: stats,
    isLoading: isLoadingStats
  } = useQuery({
    queryKey: ['quotes-stats'],
    queryFn: () => quotesService.getQuotesStats(),
    staleTime: 5 * 60 * 1000,
  });

  // Create quote mutation
  const createQuoteMutation = useMutation({
    mutationFn: (quoteData: Partial<QuoteRequest>) => 
      quotesService.createQuote(quoteData),
    onSuccess: (newQuote) => {
      // Update the quotes cache
      queryClient.setQueryData(['quotes'], (oldQuotes: QuoteRequest[] = []) => 
        [...oldQuotes, newQuote]
      );
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['quotes-stats'] });
      
      toast({
        title: "Quote Created",
        description: `Quote for ${newQuote.clientName} has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Quote",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update quote mutation
  const updateQuoteMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<QuoteRequest> }) =>
      quotesService.updateQuote(id, updates),
    onSuccess: (updatedQuote) => {
      // Update the quotes cache
      queryClient.setQueryData(['quotes'], (oldQuotes: QuoteRequest[] = []) =>
        oldQuotes.map(quote => quote.id === updatedQuote.id ? updatedQuote : quote)
      );
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['quotes-stats'] });
      
      toast({
        title: "Quote Updated",
        description: `Quote for ${updatedQuote.clientName} has been updated.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Quote",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update quote status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuoteStatus }) =>
      quotesService.updateQuoteStatus(id, status),
    onSuccess: (updatedQuote) => {
      queryClient.setQueryData(['quotes'], (oldQuotes: QuoteRequest[] = []) =>
        oldQuotes.map(quote => quote.id === updatedQuote.id ? updatedQuote : quote)
      );
      queryClient.invalidateQueries({ queryKey: ['quotes-stats'] });
      
      const statusMessages = {
        pending: 'moved to pending',
        processing: 'is now being processed',
        approved: 'has been approved',
        denied: 'has been denied'
      };
      
      toast({
        title: "Status Updated",
        description: `Quote for ${updatedQuote.clientName} ${statusMessages[status]}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Status",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Helper functions
  const getQuotesByStatus = useCallback((status: QuoteStatus) => {
    return quotes.filter(quote => quote.status === status);
  }, [quotes]);

  const searchQuotes = useCallback((searchTerm: string) => {
    if (!searchTerm) return quotes;
    
    const term = searchTerm.toLowerCase();
    return quotes.filter(quote =>
      quote.clientName.toLowerCase().includes(term) ||
      quote.clientEmail.toLowerCase().includes(term) ||
      quote.projectDescription.toLowerCase().includes(term) ||
      quote.projectType.toLowerCase().includes(term)
    );
  }, [quotes]);

  const getRecentQuotes = useCallback((days: number = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return quotes.filter(quote =>
      new Date(quote.submittedAt) >= cutoffDate
    ).sort((a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }, [quotes]);

  // Test connection function
  const testConnection = useCallback(async () => {
    try {
      const success = await quotesService.testConnection();
      if (success) {
        toast({
          title: "Connection Successful",
          description: "Successfully connected to HiSAFE API.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: "Failed to connect to HiSAFE API.",
          variant: "destructive",
        });
      }
      return success;
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "An error occurred while testing the connection.",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  return {
    // Data
    quotes,
    stats,
    
    // Loading states
    isLoading,
    isLoadingStats,
    isCreating: createQuoteMutation.isPending,
    isUpdating: updateQuoteMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    
    // Error state
    error,
    
    // Actions
    createQuote: createQuoteMutation.mutate,
    updateQuote: (id: string, updates: Partial<QuoteRequest>) =>
      updateQuoteMutation.mutate({ id, updates }),
    updateStatus: (id: string, status: QuoteStatus) =>
      updateStatusMutation.mutate({ id, status }),
    
    // Utility functions
    getQuotesByStatus,
    searchQuotes,
    getRecentQuotes,
    refetch,
    testConnection,
    
    // Debug
    debugRawData: quotesService.debugRawData,
  };
};
