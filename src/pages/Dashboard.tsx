// src/pages/Dashboard.tsx
import { useState, useEffect } from 'react';
import { QuoteCard } from '@/components/QuoteCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { QuoteRequest, QuoteStatus } from '@/types/quote';
import { Plus, Building2, Users, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import hisafeApi from '@/services/hisafeApi';
import DataMappingService from '@/services/dataMapping';

interface DashboardProps {
  viewMode?: 'client' | 'contractor';
}

export default function Dashboard({ viewMode = 'client' }: DashboardProps) {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  // Load quotes from HiSAFE on component mount
  useEffect(() => {
    loadQuotesFromHiSAFE();
  }, []);

  const loadQuotesFromHiSAFE = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load portal data which should include tasks from all forms (1, 2, 3)
      const portalData = await hisafeApi.loadPortalData(['1', '2', '3']);
      
      const allQuotes: QuoteRequest[] = [];

      // Process each series (form) data
      Object.entries(portalData).forEach(([seriesId, componentData]: [string, any]) => {
        if (componentData.type === 'list' && componentData.listResult) {
          // Convert HiSAFE tasks to quotes
          const quotesFromSeries = componentData.listResult.map((task: any) => {
            return DataMappingService.mapTaskToQuote(task);
          });
          
          allQuotes.push(...quotesFromSeries);
        }
      });

      setQuotes(allQuotes);
      
      toast({
        title: "Data Loaded",
        description: `Successfully loaded ${allQuotes.length} quotes from HiSAFE`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load quotes';
      setError(errorMessage);
      console.error('Error loading quotes:', err);
      
      toast({
        title: "Error Loading Data",
        description: errorMessage,
        variant: "destructive"
      });

      // Fallback to mock data for development/testing
      console.warn('Falling back to mock data due to API error');
      // You can uncomment the line below to use mock data during development
      // setQuotes(mockQuotes);
      
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: QuoteStatus) => {
    try {
      const taskId = parseInt(id);
      if (isNaN(taskId)) {
        throw new Error('Invalid task ID');
      }

      // Find the current quote to get existing data
      const currentQuote = quotes.find(q => q.id === id);
      if (!currentQuote) {
        throw new Error('Quote not found');
      }

      // Create updated quote with new status
      const updatedQuote = { ...currentQuote, status };

      // Convert to HiSAFE task fields
      const taskFields = DataMappingService.mapQuoteToTaskFields(updatedQuote);

      // Update in HiSAFE
      await hisafeApi.updateTask(taskId, taskFields);

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
      console.error('Error updating status:', err);
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleAddComment = async (id: string) => {
    // TODO: Implement comment functionality
    // This would require a dialog/modal to collect comment text
    // and then update the task in HiSAFE
    toast({
      title: "Comments",
      description: "Comment functionality coming soon!",
    });
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

  const counts = getStatusCounts();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center shadow-card bg-gradient-card">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-semibold mb-2">Loading Quotes</h2>
          <p className="text-muted-foreground">Connecting to HiSAFE and loading your data...</p>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && quotes.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center shadow-card bg-gradient-card max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadQuotesFromHiSAFE} className="bg-primary hover:bg-primary-hover">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Connection
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">
                {viewMode === 'contractor' ? 'Construction Dashboard' : 'My Quote Requests'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {viewMode === 'contractor' 
                  ? 'Manage and process construction quote requests from HiSAFE' 
                  : 'Track your construction quote requests and their progress'}
              </p>
              {error && (
                <div className="flex items-center gap-2 mt-2 text-sm text-amber-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>Some data may be outdated due to connection issues</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={loadQuotesFromHiSAFE}
                disabled={loading}
                className="shadow-card"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button className="bg-primary hover:bg-primary-hover text-primary-foreground shadow-construction">
                <Plus className="w-4 h-4 mr-2" />
                {viewMode === 'contractor' ? 'New Project' : 'New Request'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
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
              <Clock className="h-4 w-4 text-status-pending" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-status-pending">{counts.pending}</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card bg-gradient-card">
            <CardHeader className="flex flex-row items-
