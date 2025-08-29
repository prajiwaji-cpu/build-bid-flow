// src/pages/Dashboard.tsx - Diagnostic version
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QuoteCard } from '@/components/QuoteCard';
import { CommentDialog } from '@/components/CommentDialog';
import { useToast } from '@/hooks/use-toast';
import { QuoteRequest, QuoteStatus } from '@/types/quote';
import { quotesService } from '@/services/quotesService';
import { hisafeApi } from '@/services/hisafeApi';
import { 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Bug,
  Activity
} from 'lucide-react';

export function Dashboard({ viewMode = 'contractor' }: { viewMode?: 'contractor' | 'customer' }) {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  const [selectedQuoteForComment, setSelectedQuoteForComment] = useState<QuoteRequest | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    // Don't auto-load on mount, let user trigger it
  }, []);

  const runDiagnostics = async () => {
    try {
      setLoading(true);
      setError(null);
      setDiagnostics([]);
      
      console.log('🔬 Running comprehensive diagnostics...');
      
      const results = [];
      
      // Test 1: Authentication
      try {
        await hisafeApi.initAuth();
        results.push({ test: 'Authentication', status: 'success', message: 'Authentication successful' });
      } catch (authError) {
        results.push({ test: 'Authentication', status: 'error', message: authError.message });
      }
      
      // Test 2: Portal Metadata
      try {
        const metadata = await hisafeApi.getPortalMetadata();
        results.push({ 
          test: 'Portal Metadata', 
          status: 'success', 
          message: `Metadata loaded successfully`,
          data: metadata
        });
      } catch (metadataError) {
        results.push({ test: 'Portal Metadata', status: 'error', message: metadataError.message });
      }
      
      // Test 3: Portal Load Variations
      const loadTests = [
        { name: 'Portal Load (no params)', method: () => hisafeApi.loadPortalData() },
        { name: 'Portal Load (series 1)', method: () => hisafeApi.loadPortalData(['1']) },
        { name: 'Portal Load (series 2)', method: () => hisafeApi.loadPortalData(['2']) },
        { name: 'Portal Load (series 3)', method: () => hisafeApi.loadPortalData(['3']) },
      ];
      
      for (const test of loadTests) {
        try {
          const result = await test.method();
          results.push({
            test: test.name,
            status: 'success',
            message: `Loaded successfully`,
            data: result
          });
          // If we got successful data, break out and don't try other variations
          break;
        } catch (error) {
          results.push({
            test: test.name,
            status: 'error',
            message: error.message
          });
        }
      }
      
      // Test 4: Direct Task Access
      try {
        const task = await hisafeApi.getTask(434); // We know this task exists from your logs
        results.push({
          test: 'Direct Task Access (434)',
          status: 'success',
          message: 'Task 434 accessed successfully',
          data: task
        });
      } catch (taskError) {
        results.push({
          test: 'Direct Task Access (434)',
          status: 'error',
          message: taskError.message
        });
      }
      
      setDiagnostics(results);
      
      // If we have any successful portal loads, try to load quotes
      const successfulPortalLoad = results.find(r => 
        r.test.includes('Portal Load') && r.status === 'success'
      );
      
      if (successfulPortalLoad) {
        console.log('✅ Found successful portal load, attempting to load quotes...');
        try {
          const allQuotes = await quotesService.getAllQuotes();
          setQuotes(allQuotes);
          toast({
            title: "Success!",
            description: `Loaded ${allQuotes.length} quotes successfully`,
          });
        } catch (quotesError) {
          setError(`Failed to process quotes: ${quotesError.message}`);
        }
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Diagnostic failed';
      setError(errorMessage);
      console.error('💥 Diagnostic error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: QuoteStatus) => {
    try {
      const updatedQuote = await quotesService.updateQuoteStatus(id, status);
      setQuotes(prev => prev.map(quote => 
        quote.id === id ? updatedQuote : quote
      ));
      toast({
        title: "Status Updated",
        description: `Quote status changed to ${status}`,
      });
    } catch (err) {
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : 'Failed to update status',
        variant: "destructive"
      });
    }
  };

  const handleAddComment = async (id: string) => {
    const quote = quotes.find(q => q.id === id);
    if (quote) {
      setSelectedQuoteForComment(quote);
      setCommentDialogOpen(true);
    }
  };

  const handleSubmitComment = async (quoteId: string, commentText: string, author: string) => {
    try {
      const updatedQuote = await quotesService.addComment(quoteId, commentText, author);
      setQuotes(prev => prev.map(quote => 
        quote.id === quoteId ? updatedQuote : quote
      ));
      if (selectedQuoteForComment && selectedQuoteForComment.id === quoteId) {
        setSelectedQuoteForComment(updatedQuote);
      }
      toast({
        title: "Comment Added",
        description: "Your comment has been saved successfully",
      });
    } catch (err) {
      toast({
        title: "Comment Failed",
        description: err instanceof Error ? err.message : 'Failed to add comment',
        variant: "destructive"
      });
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                HiSAFE Diagnostic Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Diagnosing connection and data loading issues
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={runDiagnostics}
                disabled={loading}
                variant="default"
              >
                <Activity className="w-4 h-4 mr-2" />
                {loading ? 'Running Diagnostics...' : 'Run Diagnostics'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        
        {/* Diagnostic Results */}
        {diagnostics.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="w-5 h-5" />
                Diagnostic Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {diagnostics.map((result, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    {result.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">{result.test}</h4>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                      {result.data && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer text-blue-600">
                            View Data
                          </summary>
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(result.data, null, 2).substring(0, 1000)}
                            {JSON.stringify(result.data, null, 2).length > 1000 ? '...' : ''}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {diagnostics.some(d => d.status === 'success') && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-green-800 font-medium">
                    ✅ Some tests passed! Check successful results above for working endpoints.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Error:</span>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Quotes Display */}
        {quotes.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Loaded Quotes ({quotes.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  viewMode={viewMode}
                  onStatusChange={handleStatusChange}
                  onAddComment={handleAddComment}
                />
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {diagnostics.length === 0 && (
          <Card className="text-center p-8">
            <CardContent>
              <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Ready to Diagnose</h3>
              <p className="text-muted-foreground mb-4">
                Click "Run Diagnostics" to test your HiSAFE connection and identify issues.
              </p>
              <Button onClick={runDiagnostics} disabled={loading}>
                <Activity className="w-4 h-4 mr-2" />
                Start Diagnosis
              </Button>
            </CardContent>
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
