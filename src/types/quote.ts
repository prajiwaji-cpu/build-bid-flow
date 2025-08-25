export type QuoteStatus = 'pending' | 'processing' | 'approved' | 'denied';

export interface QuoteRequest {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  projectType: string;
  projectDescription: string;
  budget: string;
  timeline: string;
  location: string;
  status: QuoteStatus;
  submittedAt: string;
  updatedAt: string;
  estimatedCost?: number;
  notes?: string;
  comments: Comment[];
}

export interface Comment {
  id: string;
  author: string;
  authorType: 'client' | 'contractor';
  message: string;
  timestamp: string;
}

export interface QuoteFormData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  projectType: string;
  projectDescription: string;
  budget: string;
  timeline: string;
  location: string;
}