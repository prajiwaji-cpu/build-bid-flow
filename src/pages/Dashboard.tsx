import { useState } from 'react';
import { QuoteCard } from '@/components/QuoteCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { QuoteRequest, QuoteStatus } from '@/types/quote';
import { Plus, Building2, Users, Clock, CheckCircle } from 'lucide-react';

// Mock data - in a real app this would come from your backend
const mockQuotes: QuoteRequest[] = [{
  id: '1',
  clientName: 'John Smith',
  clientEmail: 'john.smith@email.com',
  clientPhone: '(555) 123-4567',
  projectType: 'residential',
  projectDescription: 'Complete kitchen renovation including new cabinets, countertops, and appliances. Looking for modern design with island and updated lighting.',
  budget: '15k-50k',
  timeline: '3-6months',
  location: 'Austin, TX',
  status: 'pending',
  submittedAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
  comments: []
}, {
  id: '2',
  clientName: 'Sarah Johnson',
  clientEmail: 'sarah.j@email.com',
  clientPhone: '(555) 987-6543',
  projectType: 'commercial',
  projectDescription: 'Office space buildout for tech startup. Need modern open office layout with conference rooms and break area.',
  budget: '50k-100k',
  timeline: '1-3months',
  location: 'Dallas, TX',
  status: 'processing',
  submittedAt: '2024-01-14T14:20:00Z',
  updatedAt: '2024-01-16T09:15:00Z',
  estimatedCost: 75000,
  notes: 'Preliminary estimate provided. Waiting for final measurements and material selections.',
  comments: [{
    id: '1',
    author: 'Mike Builder',
    authorType: 'contractor',
    message: 'Reviewed the space and created initial estimate. Will need to discuss material preferences.',
    timestamp: '2024-01-16T09:15:00Z'
  }]
}, {
  id: '3',
  clientName: 'Robert Wilson',
  clientEmail: 'rob.wilson@email.com',
  clientPhone: '(555) 555-1234',
  projectType: 'roofing',
  projectDescription: 'Roof replacement for 2-story home. Current roof has multiple leaks and needs complete replacement.',
  budget: '15k-50k',
  timeline: 'asap',
  location: 'Houston, TX',
  status: 'approved',
  submittedAt: '2024-01-13T11:45:00Z',
  updatedAt: '2024-01-17T16:30:00Z',
  estimatedCost: 28500,
  notes: 'Quote approved. Materials ordered. Installation scheduled for next week.',
  comments: [{
    id: '2',
    author: 'Robert Wilson',
    authorType: 'client',
    message: 'Great! When can we start?',
    timestamp: '2024-01-17T14:20:00Z'
  }, {
    id: '3',
    author: 'Mike Builder',
    authorType: 'contractor',
    message: 'Materials will arrive Tuesday. We can start installation Wednesday morning.',
    timestamp: '2024-01-17T16:30:00Z'
  }]
}];
interface DashboardProps {
  viewMode?: 'client' | 'contractor';
}
export default function Dashboard({
  viewMode = 'client'
}: DashboardProps) {
  const [quotes, setQuotes] = useState<QuoteRequest[]>(mockQuotes);
  const [activeTab, setActiveTab] = useState('all');
  const handleStatusChange = (id: string, status: QuoteStatus) => {
    setQuotes(prev => prev.map(quote => quote.id === id ? {
      ...quote,
      status,
      updatedAt: new Date().toISOString()
    } : quote));
  };
  const getFilteredQuotes = (status?: QuoteStatus) => {
    let filteredQuotes = status ? quotes.filter(quote => quote.status === status) : quotes;

    // Sort quotes: processing quotes go to bottom, others by most recent first
    return filteredQuotes.sort((a, b) => {
      // If one is processing and other isn't, processing goes to bottom
      if (a.status === 'processing' && b.status !== 'processing') return 1;
      if (a.status !== 'processing' && b.status === 'processing') return -1;

      // Otherwise sort by most recent first
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  };
  const getStatusCounts = () => {
    return {
      all: quotes.length,
      pending: quotes.filter(q => q.status === 'pending').length,
      processing: quotes.filter(q => q.status === 'processing').length,
      approved: quotes.filter(q => q.status === 'approved').length,
      denied: quotes.filter(q => q.status === 'denied').length
    };
  };
  const counts = getStatusCounts();
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                {viewMode === 'contractor' ? 'Construction Dashboard' : 'My Quote Requests'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {viewMode === 'contractor' ? 'Manage and process construction quote requests' : 'Track your construction quote requests and their progress'}
              </p>
            </div>
            <Button className="bg-primary hover:bg-primary-hover text-primary-foreground shadow-construction">
              <Plus className="w-4 h-4 mr-2" />
              {viewMode === 'contractor' ? 'New Project' : 'New Request'}
            </Button>
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

        {/* Tabs for filtering */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-5">
            <TabsTrigger value="all">
              All
              <Badge variant="secondary" className="ml-2 text-xs">
                {counts.all}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="mx-[5px]">
              Pending
              <Badge variant="secondary" className="ml-2 text-xs">
                {counts.pending}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="processing" className="mx-[5px]">
              Processing
              <Badge variant="secondary" className="ml-2 text-xs">
                {counts.processing}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="approved" className="mx-[5px]">
              Approved
              <Badge variant="secondary" className="ml-2 text-xs">
                {counts.approved}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="denied" className="mx-[5px]">
              Denied
              <Badge variant="secondary" className="ml-2 text-xs">
                {counts.denied}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid gap-6">
              {getFilteredQuotes().map(quote => <QuoteCard key={quote.id} quote={quote} onStatusChange={viewMode === 'contractor' ? handleStatusChange : undefined} viewMode={viewMode} />)}
            </div>
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <div className="grid gap-6">
              {getFilteredQuotes('pending').map(quote => <QuoteCard key={quote.id} quote={quote} onStatusChange={viewMode === 'contractor' ? handleStatusChange : undefined} viewMode={viewMode} />)}
            </div>
          </TabsContent>

          <TabsContent value="processing" className="mt-6">
            <div className="grid gap-6">
              {getFilteredQuotes('processing').map(quote => <QuoteCard key={quote.id} quote={quote} onStatusChange={viewMode === 'contractor' ? handleStatusChange : undefined} viewMode={viewMode} />)}
            </div>
          </TabsContent>

          <TabsContent value="approved" className="mt-6">
            <div className="grid gap-6">
              {getFilteredQuotes('approved').map(quote => <QuoteCard key={quote.id} quote={quote} onStatusChange={viewMode === 'contractor' ? handleStatusChange : undefined} viewMode={viewMode} />)}
            </div>
          </TabsContent>

          <TabsContent value="denied" className="mt-6">
            <div className="grid gap-6">
              {getFilteredQuotes('denied').map(quote => <QuoteCard key={quote.id} quote={quote} onStatusChange={viewMode === 'contractor' ? handleStatusChange : undefined} viewMode={viewMode} />)}
            </div>
          </TabsContent>
        </Tabs>

        {quotes.length === 0 && <Card className="text-center py-12 shadow-card bg-gradient-card">
            <CardHeader>
              <CardTitle>No Quote Requests</CardTitle>
              <CardDescription>
                {viewMode === 'contractor' ? "No quote requests have been submitted yet." : "You haven't submitted any quote requests yet."}
              </CardDescription>
            </CardHeader>
          </Card>}
      </div>
    </div>;
}