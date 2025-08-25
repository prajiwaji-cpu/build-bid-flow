import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { QuoteRequest } from '@/types/quote';
import { Clock, MapPin, DollarSign, Phone, Mail, Calendar } from 'lucide-react';

interface QuoteCardProps {
  quote: QuoteRequest;
  onStatusChange?: (id: string, status: QuoteRequest['status']) => void;
  onAddComment?: (id: string) => void;
  viewMode?: 'client' | 'contractor';
}

export function QuoteCard({ quote, onStatusChange, onAddComment, viewMode = 'client' }: QuoteCardProps) {
  const getStatusColor = (status: QuoteRequest['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-status-pending text-white';
      case 'processing':
        return 'bg-status-processing text-white';
      case 'approved':
        return 'bg-status-approved text-white';
      case 'denied':
        return 'bg-status-denied text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="w-full shadow-card bg-gradient-card hover:shadow-construction transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold line-clamp-2 mb-2">
              {quote.projectDescription.length > 80 
                ? `${quote.projectDescription.substring(0, 80)}...` 
                : quote.projectDescription}
            </CardTitle>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Submitted: {formatDate(quote.submittedAt)}</span>
              </div>
              {viewMode === 'contractor' && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Client:</span>
                  <span>{quote.clientName}</span>
                </div>
              )}
            </div>
          </div>
          <Badge className={getStatusColor(quote.status)} variant="secondary">
            {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>{quote.clientEmail}</span>
            </div>
            {quote.clientPhone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{quote.clientPhone}</span>
              </div>
            )}
            {quote.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{quote.location}</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Project Type:</span> {quote.projectType || 'Not specified'}
            </div>
            <div className="text-sm">
              <span className="font-medium">Budget:</span> {quote.budget || 'Not specified'}
            </div>
            <div className="text-sm">
              <span className="font-medium">Timeline:</span> {quote.timeline || 'Not specified'}
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="font-medium mb-2">Full Project Details:</h4>
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            {quote.projectDescription}
          </p>
        </div>

        {quote.estimatedCost && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-md">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="font-medium">Estimated Cost: ${quote.estimatedCost.toLocaleString()}</span>
          </div>
        )}

        {quote.notes && (
          <div className="p-3 bg-muted/30 rounded-md">
            <h5 className="font-medium mb-1">Contractor Notes:</h5>
            <p className="text-sm text-muted-foreground">{quote.notes}</p>
          </div>
        )}

        {quote.comments.length > 0 && (
          <div className="space-y-2">
            <h5 className="font-medium">Recent Comments:</h5>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {quote.comments.slice(-2).map((comment) => (
                <div key={comment.id} className="text-sm p-2 bg-muted/30 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">{comment.author}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.timestamp)}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{comment.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'contractor' && onStatusChange && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(quote.id, 'processing')}
              disabled={quote.status === 'processing'}
            >
              Processing
            </Button>
            <Button
              size="sm"
              className="bg-status-approved hover:bg-status-approved/90 text-white"
              onClick={() => onStatusChange(quote.id, 'approved')}
              disabled={quote.status === 'approved'}
            >
              Approve
            </Button>
            <Button
              size="sm"
              className="bg-status-denied hover:bg-status-denied/90 text-white"
              onClick={() => onStatusChange(quote.id, 'denied')}
              disabled={quote.status === 'denied'}
            >
              Deny
            </Button>
          </div>
        )}

        {onAddComment && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddComment(quote.id)}
            className="w-full"
          >
            Add Comment
          </Button>
        )}
      </CardContent>
    </Card>
  );
}