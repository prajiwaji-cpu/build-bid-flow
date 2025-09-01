// src/types/quote.ts
export type QuoteStatus = 'pending' | 'processing' | 'approved';

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
  
  // NEW FIELDS
  itemPartName?: string;
  itemPartSize?: string;
  estimatedJobHours?: number;
  quoteExpirationDate?: string;
  quoteTotal?: number;
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
