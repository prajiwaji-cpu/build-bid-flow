import { useState } from 'react';
import { QuoteRequestForm } from '@/components/QuoteRequestForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QuoteFormData, QuoteRequest } from '@/types/quote';
import { Building2, Clock, Users, Award, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);

  const handleQuoteSubmit = (formData: QuoteFormData) => {
    const newQuote: QuoteRequest = {
      ...formData,
      id: Date.now().toString(),
      status: 'pending',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
    };
    
    setQuotes(prev => [...prev, newQuote]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 py-24">
          <div className="text-center text-white">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Professional Construction
              <span className="block">Quote Requests</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto">
              Connect with trusted contractors and get detailed estimates for your construction projects
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-white/90 text-lg px-8"
                asChild
              >
                <Link to="/dashboard">
                  View Dashboard
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white hover:text-primary text-lg px-8"
                asChild
              >
                <Link to="/contractor">
                  Contractor Portal
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Our Platform?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Streamlined process for getting accurate construction quotes and managing your projects
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center shadow-card bg-gradient-card">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Fast Response</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Get quotes within 24-48 hours from vetted construction professionals in your area
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center shadow-card bg-gradient-card">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-construction-orange/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-construction-orange" />
                </div>
                <CardTitle>Trusted Network</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  All contractors are pre-screened and verified with proper licensing and insurance
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center shadow-card bg-gradient-card">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-status-approved/10 rounded-lg flex items-center justify-center mb-4">
                  <Award className="w-6 h-6 text-status-approved" />
                </div>
                <CardTitle>Quality Assured</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Transparent pricing, detailed estimates, and project tracking from start to finish
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Quote Request Form Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Get Your Quote Today</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Fill out our simple form and receive detailed estimates from qualified contractors
            </p>
          </div>
          
          <QuoteRequestForm onSubmit={handleQuoteSubmit} />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Building2 className="w-6 h-6 text-primary" />
              <span className="text-lg font-semibold">ConstructQuote Pro</span>
            </div>
            <p className="text-muted-foreground text-center md:text-right">
              © 2024 ConstructQuote Pro. Professional construction quote management platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
