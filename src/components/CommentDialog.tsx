// src/components/CommentDialog.tsx - Improved to show ALL comments with better layout
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useForm } from 'react-hook-form';
import { QuoteRequest } from '@/types/quote';
import { MessageSquare, User, Clock } from 'lucide-react';
import { quotesService } from '@/services/quotesService';

interface CommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuoteRequest;
  onAddComment: (quoteId: string, comment: string, author: string) => Promise<void>;
  loading?: boolean;
}

interface CommentFormData {
  message: string;
}

export function CommentDialog({ 
  open, 
  onOpenChange, 
  quote, 
  onAddComment, 
  loading = false 
}: CommentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<CommentFormData>({
  defaultValues: {
    message: ''
  }
});
  
const handleSubmit = async (data: CommentFormData) => {
  if (!data.message.trim()) return;
  
  try {
    setIsSubmitting(true);
    
    // Get the current user's name automatically
    const userName = await quotesService.getCurrentUserName();
    
    await onAddComment(quote.id, data.message.trim(), userName);
      // Reset form and close dialog
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to add comment:', error);
      // Error handling is done in the parent component
    } finally {
      setIsSubmitting(false);
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
  
  const hasComments = quote.comments && quote.comments.length > 0;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Add Comment to Quote
          </DialogTitle>
          <DialogDescription>
            Add a comment to <strong>{quote.clientName}</strong> - {quote.projectDescription?.substring(0, 60)}...
          </DialogDescription>
        </DialogHeader>
        
        {/* All Comments Display - Shows ALL comments, not just recent ones */}
        {hasComments && (
          <div className="flex-1 min-h-0 mb-4">
            <h4 className="font-medium mb-3 text-sm text-muted-foreground">
              All Comments ({quote.comments.length})
            </h4>
            <ScrollArea className="h-64 w-full rounded-md border p-4 bg-muted/20">
              <div className="space-y-4">
                {quote.comments.map((comment) => (
                  <div key={comment.id} className="bg-background rounded-md p-4 shadow-sm border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{comment.author}</span>
                        {comment.authorType && (
                          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                            {comment.authorType}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDate(comment.timestamp)}
                      </div>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {comment.message}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Show message if no comments exist */}
        {!hasComments && (
          <div className="flex-1 min-h-0 mb-4">
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No comments yet. Be the first to add one!</p>
            </div>
          </div>
        )}
        
        {/* Add Comment Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
           
            
            <FormField
              control={form.control}
              name="message"
              rules={{ 
                required: 'Comment message is required',
                minLength: { value: 3, message: 'Comment must be at least 3 characters long' }
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comment</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your comment here..."
                      className="min-h-[120px] resize-none"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="gap-2 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !form.watch('message')?.trim()}
              >
                {isSubmitting ? 'Adding Comment...' : 'Add Comment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CommentDialog;
