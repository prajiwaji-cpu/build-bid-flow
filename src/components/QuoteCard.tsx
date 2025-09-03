// src/components/QuoteCard.tsx - Improved with better spacing and responsive design
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { QuoteRequest } from '@/types/quote';
import { Clock, DollarSign, Calendar, Package, Ruler, TimerIcon, CalendarClock } from 'lucide-react';

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
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const isProcessing = quote.status === 'processing';
  const hasComments = quote.comments && quote.comments.length > 0;
  
  const cardClassName = isProcessing 
    ? 'w-full shadow-card bg-gradient-card hover:shadow-construction transition-all opacity-60 border-l-4 border-l-status-processing h-fit'
    : 'w-full shadow-card bg-gradient-card hover:shadow-construction transition-shadow h-fit';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateString: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatEstimatedNeedByDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className={cardClassName}>
      {isProcessing && (
        <div className="bg-status-processing/10 px-4 py-2 border-b">
          <div className="flex items-center gap-2 text-sm text-status-processing">
            <Clock className="w-4 h-4 animate-spin" />
            <span className="font-medium">Quote in Progress</span>
            <span className="text-muted-foreground">
              - Our team is preparing your detailed estimate
            </span>
          </div>
        </div>
      )}
      
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
           <CardTitle className="text-lg font-semibold line-clamp-2 mb-2">
            {quote.clientName}
            {quote.itemPartName && ` - ${quote.itemPartName}`}
          </CardTitle>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Submitted: {formatDate(quote.submittedAt)}</span>
              </div>
              {viewMode === 'contractor' && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Customer:</span>
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
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Estimated Need by Date */}
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Estimated Need by Date:</span> {formatEstimatedNeedByDate(quote.timeline)}
            </div>
          </div>

          <Separator />

          {/* Item/Part Details Section */}
          <div>
            <h4 className="font-medium mb-3">Item/Part Details:</h4>
            <div className="space-y-2">
              {/* Item Part Name */}
              {quote.itemPartName && (
                <div className="flex items-center gap-2 text-sm">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Item/Part Name:</span>
                  <span>{quote.itemPartName}</span>
                </div>
              )}
              
              {/* Item Part Size */}
              {quote.itemPartSize && (
                <div className="flex items-center gap-2 text-sm">
                  <Ruler className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Item/Part Size:</span>
                  <span>{quote.itemPartSize}</span>
                </div>
              )}
              
              {/* Estimated Job Hours */}
              {quote.estimatedJobHours && (
                <div className="flex items-center gap-2 text-sm">
                  <TimerIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Estimated Job Hours:</span>
                  <span>{quote.estimatedJobHours} hours</span>
                </div>
              )}
              
              {/* Project Description (fallback if no specific item details) */}
              {(!quote.itemPartName && !quote.itemPartSize) && (
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                  {quote.projectDescription}
                </p>
              )}
            </div>
          </div>

          {/* Quote Expiration Date */}
          {quote.quoteExpirationDate && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-md border border-orange-200 dark:border-orange-800">
              <CalendarClock className="w-4 h-4 text-orange-600" />
              <div className="text-sm">
                <span className="font-medium text-orange-800 dark:text-orange-200">Quote Expires:</span>
                <span className="ml-2 text-orange-700 dark:text-orange-300">
                  {formatDateOnly(quote.quoteExpirationDate)}
                </span>
              </div>
            </div>
          )}

          {/* Quote Total */}
          {(quote.quoteTotal || quote.estimatedCost) && (
            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-md">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="font-medium">Quote Total: ${(quote.quoteTotal || quote.estimatedCost)?.toLocaleString()}</span>
            </div>
          )}

          {/* Comments Section - Only show if there are comments */}
          {hasComments && (
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
        </div>

        {/* Actions Section - Only add top margin/border if there are actions to show */}
        <div className="space-y-2 mt-4">
          {/* Contractor Actions - Non-processing states */}
          {viewMode === 'contractor' && onStatusChange && !isProcessing && quote.status === 'pending' && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                size="sm"
                className="bg-status-approved hover:bg-status-approved/90 text-white"
                onClick={() => onStatusChange(quote.id, 'approved')}
              >
                Quick Approve
              </Button>
            </div>
          )}

          {/* Comment Actions */}
          {onAddComment && !isProcessing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddComment(quote.id)}
              className="w-full"
            >
              Add Comment
            </Button>
          )}

          {onAddComment && isProcessing && (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">
                Comments will be available once processing is complete
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
