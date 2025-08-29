// src/pages/Dashboard.tsx - Updated with comment functionality
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuoteCard } from '@/components/QuoteCard';
import { CommentDialog } from '@/components/CommentDialog'; // Import the new dialog
import { useToast } from '@/hooks/use-toast';
import { QuoteRequest, QuoteStatus } from '@/types/quote';
import { quotesService } from '@/services/quotesService';
import DataMappingService from '@/services/dataMapping';
import { 
  RefreshCw, 
  Building2, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  DollarSign,
  Bug
} from 'lucide-react';

export function Dashboard({ viewMode = 'contractor' }: { viewMode?: 'contractor' | 'customer' }) {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [rawTasksData, setRawTasksData] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  // Comment dialog state
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedQuoteForComment, setSelectedQuoteForComment] = useState<QuoteRequest | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    loadQuotesFromHiSAFE();
  }, []);

  const loadQuotesFromHiSAFE = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Starting to load quotes from HiSAFE...');
      
      // Get all quotes with complete data
      const allQuotes = await quotesService.getAllQuotes();
      
      // Auto-detect field mappings for debug info
      const allRawTasks: any[] = []; // This would be populated by the raw task data
      const fieldMappings = DataMappingService.autoDetectFieldMappings(allRawTasks);
      
      setQuotes(allQuotes);
      setRawTasksData(allRawTasks);
      setDebugInfo({
        loadingAttempts: [{ success: true, quotesFound: allQuotes.length }],
        fieldMappings,
        sampleTask: allRawTasks[0] || null
      });
      
      toast({
        title: "Data Loaded Successfully",
        description: `Loaded ${allQuotes.length} quotes from HiSAFE`,
      });

      console.log(`🎉 Successfully loaded ${allQuotes.length} quotes`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load quotes';
      setError(errorMessage);
      console.error('💥 Error loading quotes:', err);
      
      toast({
        title: "Error Loading Data",
        description: errorMessage,
        variant: "destructive"
      });
      
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: QuoteStatus) => {
    try {
      console.log(`🔄 Updating task ${id} status to ${status}`);

      // Update the quote status using the service
      const updatedQuote = await quotesService.updateQuoteStatus(id, status);

      // Update local state
      setQuotes(prev => prev.map(quote => 
        quote.id === id 
          ? { ...quote, status, updatedAt: new Date().toISOString() }
          : quote
      ));

      toast({
        title: "Status Updated",
        description: `Quote status changed to ${status}`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status';
      console.error('💥 Error updating status:', err);
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleAddComment = async (id: string) => {
    const quote = quotes.find(q => q.id === id);
    if (!quote) {
      toast({
        title: "Error",
        description: "Quote not found",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedQuoteForComment(quote);
    setCommentDialogOpen(true);
  };
  
  const handleSubmitComment = async (quoteId: string, commentText: string, author: string) => {
    try {
      console.log(`💬 Adding comment to quote ${quoteId}...`);
      
      // Add comment using the service
      const updatedQuote = await quotesService.addComment(quoteId, commentText, author);
      
      // Update local state
      setQuotes(prev => prev.map(quote => 
        quote.id === quoteId 
          ? updatedQuote
          : quote
      ));
      
      // Update the selected quote for the dialog
      if (selectedQuoteForComment && selectedQuoteForComment.id === quoteId) {
        setSelectedQuoteForComment(updatedQuote);
      }
      
      toast({
        title: "Comment Added",
        description: "Your comment has been saved successfully",
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add comment';
      console.error('💥 Error adding comment:', err);
      
      toast({
        title: "Comment Failed",
        description: errorMessage,
        variant: "destructive"
      });
      throw err; // Re-throw so dialog can handle it
    }
  };

  const getFilteredQuotes = (status?: QuoteStatus) => {
    let filteredQuotes = status ? quotes.filter(quote => quote.status === status) : quotes;

    // Sort quotes: processing quotes go to bottom, others by most recent first
    return filteredQuotes.sort((a, b) => {
      if (a.status === 'processing' && b.status !== 'processing') return 1;
      if (a.status !== 'processing' && b.status === 'processing') return -1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  };

  const getStatusCounts = () => {
    return {
      all: quotes.length,
      pending: quotes.filter(q => q.status === 'pending').length,
      processing: quotes.filter(q => q.status === 'processing').length,
      approved: quotes.filter(q => q.status === 'approved').length
    };
  };
  
  const getTotalValue = () => {
    return quotes.reduce((sum, quote) => sum + (quote.estimatedCost || 0), 0);
  };

  const counts = getStatusCounts();
  const totalValue = getTotalValue();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center shadow-card bg-gradient-card">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-semibold mb-2">Loading Quotes</h2>
          <p className="text-muted-foreground">Connecting to HiSAFE and getting complete task data...</p>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && quotes.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center shadow-card bg-gradient-card max-w-2xl">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          
          <div className="flex gap-2 justify-center">
            <Button onClick={loadQuotesFromHiSAFE} variant="default">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button 
              onClick={() => setShowDebugPanel(true)} 
              variant="outline"
            >
              <Bug className="w-4 h-4 mr-2" />
              Debug
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {viewMode === 'contractor' ? 'Construction Dashboard' : 'My Quote Requests'}
              </h1>
              {error && (
                <p className="text-sm text-muted-foreground mt-2">
                  Warning: {error} (Showing available data)
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDebugPanel(!showDebugPanel)}
              >
                <Bug className="w-4 h-4 mr-2" />
                Debug
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={loadQuotesFromHiSAFE}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Debug Panel */}
        {showDebugPanel && debugInfo && (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-800">🔍 Debug Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold">Data Summary:</h4>
                <p>Successfully mapped quotes: {quotes.length}</p>
                <p>Quotes with cost data: {quotes.filter(q => q.estimatedCost).length}</p>
                <p>Total value: ${totalValue.toLocaleString()}</p>
              </div>
              
              {debugInfo.fieldMappings && (
                <div>
                  <h4 className="font-semibold">Common Fields Found:</h4>
                  <div className="text-sm font-mono bg-gray-100 p-2 rounded">
                    {debugInfo.fieldMappings.commonFields?.join(', ')}
                  </div>
                </div>
              )}
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  console.log('=== FULL DEBUG DATA ===');
                  console.log('Raw Tasks:', rawTasksData);
                  console.log('Mapped Quotes:', quotes);
                  console.log('Debug Info:', debugInfo);
                  quotesService.debugRawData(); // Run additional debug
                  console.log('======================');
                }}
              >
                Log Full Data to Console
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-card bg-gradient-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.all}</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card bg-gradient-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.pending}</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card bg-gradient-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.approved}</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card bg-gradient-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quotes Grid */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-muted/50 backdrop-blur-sm">
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
            <TabsTrigger value="processing">In Progress ({counts.processing})</TabsTrigger>
            <TabsTrigger value="approved">Completed ({counts.approved})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFilteredQuotes().map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  viewMode={viewMode}
                  onStatusChange={handleStatusChange}
                  onAddComment={handleAddComment}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFilteredQuotes('pending').map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  viewMode={viewMode}
                  onStatusChange={handleStatusChange}
                  onAddComment={handleAddComment}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="processing" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFilteredQuotes('processing').map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  viewMode={viewMode}
                  onStatusChange={handleStatusChange}
                  onAddComment={handleAddComment}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFilteredQuotes('approved').map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  viewMode={viewMode}
                  onStatusChange={handleStatusChange}
                  onAddComment={handleAddComment}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Empty State */}
        {quotes.length === 0 && !loading && (
          <Card className="p-8 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Quotes Found</h3>
            <p className="text-muted-foreground mb-4">
              No quote requests found in your HiSAFE system.
            </p>
            <Button onClick={loadQuotesFromHiSAFE}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
          </Card>
        )}
      </div>
      
      {/* Comment Dialog */}
      {selectedQuoteForComment && (
        <CommentDialog
          open={commentDialogOpen}
          onOpenChange={setCommentDialogOpen}
          quote={selectedQuoteForComment}
          onAddComment={handleSubmitComment}
        />
      )}
    </div>
  );
}

export default Dashboard;
