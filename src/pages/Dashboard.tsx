// Updated Dashboard component with new summary cards and enhanced quote cards
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { QuoteRequest, QuoteStatus } from '@/types/quote';
import { quotesService } from '@/services/quotesService';
import { 
  RefreshCw, 
  Building2, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  DollarSign,
  Search,
  Settings,
  Calendar,
  Package,
  Ruler
} from 'lucide-react';

// Enhanced QuoteCard component with new fields
function EnhancedQuoteCard({ 
  quote, 
  onStatusChange 
}: { 
  quote: QuoteRequest; 
  onStatusChange: (id: string, status: QuoteStatus) => void;
}) {
  const { toast } = useToast();
  
  // Extract enhanced fields from notes (temporary until we get direct field access)
  const extractFieldFromNotes = (fieldName: string): string => {
    const match = quote.notes?.match(new RegExp(`${fieldName}:\\s*([^\\n\\|]+)`));
    return match ? match[1].trim() : '';
  };
  
  const estimatedHours = extractFieldFromNotes('Estimated Hours');
  const quantity = extractFieldFromNotes('Quantity');
  const sizeSpec = extractFieldFromNotes('Size/Specification');
  
  // Extract item part name from project description
  const getItemPartName = (): string => {
    // Try to extract item name before the first parentheses or dash
    const match = quote.projectDescription.match(/^([^(\-]+)/);
    return match ? match[1].trim() : quote.projectDescription.split('\n')[0];
  };
  
  // Check if quote is expired (placeholder - will need actual expiration date field)
  const isExpired = false; // Will implement when we have Quote_Expiration_Date directly
  
  const handleStatusChange = (newStatus: QuoteStatus) => {
    onStatusChange(quote.id, newStatus);
    toast({
      title: "Status Updated",
      description: `Quote status changed to ${newStatus}`,
    });
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    processing: 'bg-blue-100 text-blue-800 border-blue-300',
    approved: 'bg-green-100 text-green-800 border-green-300',
    denied: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {quote.clientName}
            </CardTitle>
            <div className="mt-1 space-y-1">
              {/* Item Part Name - NEW */}
              <div className="flex items-center text-sm text-gray-600">
                <Package className="w-4 h-4 mr-1" />
                <span className="font-medium">{getItemPartName()}</span>
              </div>
              
              {/* Item Part Size - NEW */}
              {sizeSpec && (
                <div className="flex items-center text-sm text-gray-500">
                  <Ruler className="w-4 h-4 mr-1" />
                  <span>Size: {sizeSpec}</span>
                </div>
              )}
              
              {/* Quantity */}
              {quantity && (
                <div className="flex items-center text-sm text-gray-500">
                  <span>Qty: {quantity}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <Badge className={statusColors[quote.status]}>
              {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
            </Badge>
            
            {/* Quote Total - NEW */}
            {quote.estimatedCost && (
              <div className="mt-2 text-lg font-bold text-green-600">
                ${quote.estimatedCost.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Timeline */}
          <div>
            <div className="text-sm text-gray-500 mb-1">Timeline</div>
            <div className="flex items-center text-sm">
              <Calendar className="w-4 h-4 mr-1" />
              {quote.timeline ? new Date(quote.timeline).toLocaleDateString() : 'Not specified'}
            </div>
          </div>
          
          {/* Estimated Hours - NEW */}
          {estimatedHours && (
            <div>
              <div className="text-sm text-gray-500 mb-1">Estimated Hours</div>
              <div className="flex items-center text-sm">
                <Clock className="w-4 h-4 mr-1" />
                {estimatedHours}
              </div>
            </div>
          )}
          
          {/* Quote Expiration - NEW (placeholder styling) */}
          <div className="md:col-span-2">
            <div className="text-sm text-gray-500 mb-1">Quote Expiration</div>
            <div className={`inline-flex items-center px-2 py-1 rounded text-sm ${
              isExpired ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              <Calendar className="w-4 h-4 mr-1" />
              {isExpired ? 'Expired' : 'Active'} (Needs expiration date field)
            </div>
          </div>
        </div>

        {/* Project Description */}
        <div className="mb-4">
          <div className="text-sm text-gray-500 mb-1">Project Description</div>
          <p className="text-sm text-gray-700 line-clamp-2">
            {quote.projectDescription}
          </p>
        </div>

        {/* Status Change Buttons - Removed "Start Processing" */}
        <div className="flex flex-wrap gap-2">
          {quote.status === 'pending' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('approved')}
              className="text-green-600 border-green-300 hover:bg-green-50"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Approve
            </Button>
          )}
          
          {quote.status === 'processing' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('approved')}
              className="text-green-600 border-green-300 hover:bg-green-50"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Complete
            </Button>
          )}
          
          {(quote.status === 'pending' || quote.status === 'processing') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('denied')}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <AlertCircle className="w-4 h-4 mr-1" />
              Deny
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard({ viewMode = 'contractor' }: { viewMode?: 'contractor' | 'customer' }) {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    loadQuotesFromHiSAFE();
  }, []);

  const loadQuotesFromHiSAFE = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading quotes with enhanced mapping...');
      
      const allQuotes = await quotesService.getAllQuotes();
      setQuotes(allQuotes);
      
      toast({
        title: "Data Loaded Successfully",
        description: `Found ${allQuotes.length} quotes with enhanced field mapping`,
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
      const updatedQuote = await quotesService.updateQuoteStatus(id, status);
      
      setQuotes(prev => prev.map(quote => 
        quote.id === id ? updatedQuote : quote
      ));

      toast({
        title: "Status Updated",
        description: `Quote status changed to ${status}`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status';
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Calculate stats with new structure
  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === 'pending').length,
    processing: quotes.filter(q => q.status === 'processing').length, // NEW
    completed: quotes.filter(q => q.status === 'approved').length,   // MOVED
  };

  const getQuotesByStatus = (status: QuoteStatus) => {
    return quotes.filter(quote => quote.status === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading quotes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadQuotesFromHiSAFE}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quote Dashboard</h1>
              <p className="text-gray-600">Manage and track manufacturing quotes</p>
            </div>
            <Button onClick={loadQuotesFromHiSAFE} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* UPDATED Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Requests */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building2 className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Processing - NEW */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Settings className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Processing</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.processing}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Completed - MOVED */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quotes Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All Quotes ({stats.total})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
            <TabsTrigger value="processing">Processing ({stats.processing})</TabsTrigger>
            <TabsTrigger value="approved">Completed ({stats.completed})</TabsTrigger>
            <TabsTrigger value="denied">Denied ({quotes.filter(q => q.status === 'denied').length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="space-y-4">
              {quotes.map((quote) => (
                <EnhancedQuoteCard
                  key={quote.id}
                  quote={quote}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <div className="space-y-4">
              {getQuotesByStatus('pending').map((quote) => (
                <EnhancedQuoteCard
                  key={quote.id}
                  quote={quote}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="processing" className="mt-6">
            <div className="space-y-4">
              {getQuotesByStatus('processing').map((quote) => (
                <EnhancedQuoteCard
                  key={quote.id}
                  quote={quote}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="approved" className="mt-6">
            <div className="space-y-4">
              {getQuotesByStatus('approved').map((quote) => (
                <EnhancedQuoteCard
                  key={quote.id}
                  quote={quote}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="denied" className="mt-6">
            <div className="space-y-4">
              {getQuotesByStatus('denied').map((quote) => (
                <EnhancedQuoteCard
                  key={quote.id}
                  quote={quote}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
