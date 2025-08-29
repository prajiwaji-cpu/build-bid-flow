// src/pages/Dashboard.tsx - Enhanced with better debugging
import { useState, useEffect } from 'react';
import { QuoteCard } from '@/components/QuoteCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { QuoteRequest, QuoteStatus } from '@/types/quote';
import { Plus, Building2, Users, Clock, CheckCircle, AlertCircle, RefreshCw, Bug } from 'lucide-react';
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
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [rawTasksData, setRawTasksData] = useState<any[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const { toast } = useToast();

  // Load quotes from HiSAFE on component mount
  useEffect(() => {
    loadQuotesFromHiSAFE();
  }, []);

  const loadQuotesFromHiSAFE = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo(null);

      console.log('🚀 Starting to load quotes from HiSAFE...');

      // First, get the portal metadata to understand what's available
      let portalMetadata;
      try {
        console.log('📋 Loading portal metadata...');
        portalMetadata = await hisafeApi.getPortalMetadata();
        console.log('✅ Portal metadata loaded:', portalMetadata);
        setDebugInfo(prev => ({ ...prev, metadata: portalMetadata }));
      } catch (metadataError) {
        console.warn('⚠️ Failed to load portal metadata, continuing anyway:', metadataError);
      }

      // Extract available series/form IDs from metadata if available
      let availableSeriesIds: string[] = [];
      if (portalMetadata?.dashboardComponents) {
        portalMetadata.dashboardComponents.forEach((component: any) => {
          if (component.series) {
            component.series.forEach((series: any) => {
              if (series.id && !availableSeriesIds.includes(series.id.toString())) {
                availableSeriesIds.push(series.id.toString());
              }
            });
          }
        });
      }

      console.log('🔢 Available series IDs from metadata:', availableSeriesIds);

      // Try different approaches to load portal data
      let portalData;
      let loadingAttempts = [];

      // Approach 1: Try with no series IDs (load all)
      try {
        console.log('🎯 Attempt 1: Loading portal data with no series IDs...');
        portalData = await hisafeApi.loadPortalData();
        console.log('✅ Success - portal data loaded without series IDs:', portalData);
        loadingAttempts.push({ approach: 'No series IDs', success: true, data: portalData });
      } catch (error1) {
        console.log('❌ Attempt 1 failed:', error1.message);
        loadingAttempts.push({ approach: 'No series IDs', success: false, error: error1.message });

        // Approach 2: Try with metadata-discovered series IDs
        if (availableSeriesIds.length > 0) {
          try {
            console.log(`🎯 Attempt 2: Loading portal data with discovered series IDs: ${availableSeriesIds.join(', ')}`);
            portalData = await hisafeApi.loadPortalData(availableSeriesIds);
            console.log('✅ Success - portal data loaded with discovered series IDs:', portalData);
            loadingAttempts.push({ approach: 'Discovered series IDs', success: true, data: portalData });
          } catch (error2) {
            console.log('❌ Attempt 2 failed:', error2.message);
            loadingAttempts.push({ approach: 'Discovered series IDs', success: false, error: error2.message });
          }
        }

        // Approach 3: Try with common series IDs one by one
        if (!portalData) {
          const commonSeriesIds = ['1', '2', '3', '4', '5', '50'];
          for (const seriesId of commonSeriesIds) {
            try {
              console.log(`🎯 Attempt 3.${seriesId}: Loading portal data with series ID: ${seriesId}`);
              const singleSeriesData = await hisafeApi.loadPortalData([seriesId]);
              console.log(`✅ Success - portal data loaded with series ID ${seriesId}:`, singleSeriesData);
              
              if (!portalData) {
                portalData = singleSeriesData;
              } else {
                // Merge data from multiple series
                Object.assign(portalData, singleSeriesData);
              }
              
              loadingAttempts.push({ approach: `Single series ID: ${seriesId}`, success: true, data: singleSeriesData });
            } catch (singleError) {
              console.log(`❌ Attempt 3.${seriesId} failed:`, singleError.message);
              loadingAttempts.push({ approach: `Single series ID: ${seriesId}`, success: false, error: singleError.message });
            }
          }
        }
      }

      setDebugInfo(prev => ({ ...prev, loadingAttempts }));

      if (!portalData) {
        throw new Error('Failed to load portal data with any approach. Check the console for detailed attempts.');
      }

      const allQuotes: QuoteRequest[] = [];
      const allRawTasks: any[] = [];

      // Process the portal data
      if (portalData && typeof portalData === 'object') {
        Object.entries(portalData).forEach(([seriesId, componentData]: [string, any]) => {
          console.log(`📊 Processing series ${seriesId}:`, componentData);
          
          if (componentData && componentData.type === 'list' && componentData.listResult) {
            console.log(`📝 Found ${componentData.listResult.length} tasks in series ${seriesId}`);
            
            // Store raw tasks for debugging
            allRawTasks.push(...componentData.listResult);
            
            // Auto-detect field mappings if we have tasks
            if (componentData.listResult.length > 0) {
              const fieldMappings = DataMappingService.autoDetectFieldMappings(componentData.listResult);
              setDebugInfo(prev => ({ ...prev, fieldMappings, sampleTask: componentData.listResult[0] }));
            }
            
            // Convert HiSAFE tasks to quotes
            const quotesFromSeries = componentData.listResult.map((task: any, index: number) => {
              try {
                const mappedQuote = DataMappingService.mapTaskToQuote(task);
                console.log(`✅ Successfully mapped task ${task.task_id}:`, {
                  id: mappedQuote.id,
                  clientName: mappedQuote.clientName,
                  status: mappedQuote.status
                });
                return mappedQuote;
              } catch (mappingError) {
                console.error(`❌ Failed to map task ${task.task_id}:`, mappingError);
                console.log('🔍 Raw task data:', task);
                DataMappingService.debugTaskStructure(task);
                
                // Create a fallback quote so we don't lose data
                return {
                  id: task.task_id?.toString() || `fallback-${index}`,
                  clientName: `Task ${task.task_id} (Mapping Error)`,
                  clientEmail: 'unknown@example.com',
                  clientPhone: '',
                  projectType: 'Unknown',
                  projectDescription: 'Failed to map task data - check console for details',
                  budget: '',
                  timeline: '',
                  location: '',
                  status: 'pending' as QuoteStatus,
                  submittedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  notes: `Original task ID: ${task.task_id}`,
                  comments: []
                };
              }
            });
            
            allQuotes.push(...quotesFromSeries);
            console.log(`✅ Added ${quotesFromSeries.length} quotes from series ${seriesId}`);
          } else if (componentData && componentData.type) {
            console.log(`ℹ️ Series ${seriesId} has component type '${componentData.type}' but no listResult`);
          }
        });
      }

      setQuotes(allQuotes);
      setRawTasksData(allRawTasks);
      
      toast({
        title: "Data Loaded Successfully",
        description: `Loaded ${allQuotes.length} quotes from HiSAFE`,
      });

      console.log(`🎉 Successfully loaded ${allQuotes.length} quotes from ${allRawTasks.length} raw tasks`);

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
      const taskId = parseInt(id);
      if (isNaN(taskId)) {
        throw new Error('Invalid task ID');
      }

      console.log(`🔄 Updating task ${taskId} status to ${status}`);

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
      console.error('💥 Error updating status:', err);
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleAddComment = async (id: string) => {
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
          <p className="text-muted-foreground">Connecting to HiSAFE and discovering available data sources...</p>
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
          
          {debugInfo && (
            <div className="text-left text-sm mb-4 p-4 bg-muted rounded-lg max-h-64 overflow-y-auto">
              <h3 className="font-semibold mb-2">🔍 Debug Information:</h3>
              {debugInfo.metadata && (
                <div className="mb-2">
                  <strong>Portal components:</strong> {debugInfo.metadata.dashboardComponents?.length || 0}
                </div>
              )}
              {debugInfo.loadingAttempts && debugInfo.loadingAttempts.length > 0 && (
                <div>
                  <strong>Loading attempts:</strong>
                  <ul className="ml-4 mt-1">
                    {debugInfo.loadingAttempts.map((attempt: any, index: number) => (
                      <li key={index} className={attempt.success ? 'text-green-600' : 'text-red-600'}>
                        {attempt.approach}: {attempt.success ? 'Success' : `Failed - ${attempt.error}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {debugInfo.sampleTask && (
                <div className="mt-2">
                  <strong>Sample task fields:</strong>
                  <div className="text-xs mt-1 font-mono">
                    {Object.keys(debugInfo.sampleTask.fields || {}).join(', ')}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-2">
            <Button onClick={loadQuotesFromHiSAFE} className="bg-primary hover:bg-primary-hover w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Connection
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                console.log('=== CONFIGURATION DEBUG ===');
                console.log('Base URL:', import.meta.env.VITE_HISAFE_BASE_URL);
                console.log('Client ID:', import.meta.env.VITE_HISAFE_CLIENT_ID ? 'Set' : 'Not set');
                console.log('Portal Slug:', import.meta.env.VITE_HISAFE_PORTAL_SLUG);
                console.log('Debug Info:', debugInfo);
                console.log('Raw Tasks:', rawTasksData);
                console.log('============================');
                setShowDebugPanel(true);
              }}
              className="w-full"
            >
              Show Debug Panel
            </Button>
          </div>
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
                <p>Raw tasks loaded: {rawTasksData.length}</p>
                <p>Successfully mapped quotes: {quotes.length}</p>
                <p>Mapping success rate: {rawTasksData.length > 0 ? Math.round((quotes.length / rawTasksData.length) * 100) : 0}%</p>
              </div>
              
              {debugInfo.fieldMappings && (
                <div>
                  <h4 className="font-semibold">Common Fields Found:</h4>
                  <div className="text-sm font-mono bg-gray-100 p-2 rounded">
                    {debugInfo.fieldMappings.commonFields?.join(', ')}
                  </div>
                </div>
              )}
              
              {debugInfo.sampleTask && (
                <div>
                  <h4 className="font-semibold">Sample Task Structure:</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(debugInfo.sampleTask, null, 2).substring(0, 500)}...
                  </pre>
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
              {rawTasksData.length !== counts.all && (
                <p className="text-xs text-muted-foreground">
                  ({rawTasksData.length} raw tasks loaded)
                </p>
              )}
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
              <Users className="h-4 w-4 text-status-processing" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-status-processing">{counts.processing}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card bg-gradient-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-status-approved" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-status-approved">{counts.approved}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for filtering quotes */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              All <Badge variant="secondary" className="ml-2">{counts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending <Badge variant="secondary" className="ml-2">{counts.pending}</Badge>
            </TabsTrigger>
            <TabsTrigger value="processing">
              Processing <Badge variant="secondary" className="ml-2">{counts.processing}</Badge>
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved <Badge variant="secondary" className="ml-2">{counts.approved}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid gap-6">
              {getFilteredQuotes().map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  viewMode={viewMode}
                  onStatusChange={handleStatusChange}
                  onAddComment={handleAddComment}
                />
              ))}
              {getFilteredQuotes().length === 0 && (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">No quotes found.</p>
                  <Button 
                    onClick={loadQuotesFromHiSAFE} 
                    className="mt-4"
                    variant="outline"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reload Data
                  </Button>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <div className="grid gap-6">
              {getFilteredQuotes('pending').map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  viewMode={viewMode}
                  onStatusChange={handleStatusChange}
                  onAddComment={handleAddComment}
                />
              ))}
              {getFilteredQuotes('pending').length === 0 && (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No pending quotes.</p>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="processing" className="mt-6">
            <div className="grid gap-6">
              {getFilteredQuotes('processing').map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  viewMode={viewMode}
                  onStatusChange={handleStatusChange}
                  onAddComment={handleAddComment}
                />
              ))}
              {getFilteredQuotes('processing').length === 0 && (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No processing quotes.</p>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="approved" className="mt-6">
            <div className="grid gap-6">
              {getFilteredQuotes('approved').map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  viewMode={viewMode}
                  onStatusChange={handleStatusChange}
                  onAddComment={handleAddComment}
                />
              ))}
              {getFilteredQuotes('approved').length === 0 && (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No approved quotes.</p>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
