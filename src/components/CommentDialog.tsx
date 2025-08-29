// src/components/CommentDialog.tsx - Dialog for adding comments to quotes
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
import { useForm } from 'react-hook-form';
import { QuoteRequest } from '@/types/quote';
import { MessageSquare, User, Clock } from 'lucide-react';

interface CommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuoteRequest;
  onAddComment: (quoteId: string, comment: string, author: string) => Promise<void>;
  loading?: boolean;
}

interface CommentFormData {
  author: string;
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
      author: 'Contractor', // Default author name
      message: ''
    }
  });
  
  const handleSubmit = async (data: CommentFormData) => {
    if (!data.message.trim()) return;
    
    try {
      setIsSubmitting(true);
      await onAddComment(quote.id, data.message.trim(), data.author.trim() || 'User');
      
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
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Add Comment to Quote
          </DialogTitle>
          <DialogDescription>
            Add a comment to <strong>{quote.clientName}</strong> - {quote.projectDescription}
          </DialogDescription>
        </DialogHeader>
        
        {/* Existing Comments Display */}
        {quote.comments.length > 0 && (
          <div className="flex-1 min-h-0">
            <h4 className="font-medium mb-3 text-sm text-muted-foreground">Recent Comments</h4>
            <div className="space-y-3 max-h-48 overflow-y-auto border rounded-md p-3 bg-muted/20">
              {quote.comments.slice(-5).map((comment) => (
                <div key={comment.id} className="bg-background rounded-md p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{comment.author}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDate(comment.timestamp)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{comment.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Add Comment Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="author"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your name" 
                      {...field} 
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                      className="min-h-[100px]"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="gap-2">
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
