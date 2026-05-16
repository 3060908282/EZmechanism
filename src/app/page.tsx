'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import Header from '@/components/mechfind/Header';
import InputForm from '@/components/mechfind/InputForm';
import ResultsSection from '@/components/mechfind/ResultsSection';
import AboutSection from '@/components/mechfind/AboutSection';
import Footer from '@/components/mechfind/Footer';

import type { FormState, PredictionResult } from '@/components/mechfind/types';
import { DEFAULT_EXAMPLE, DEFAULT_FORM } from '@/components/mechfind/constants';

export default function Home() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  // Progress simulation
  useEffect(() => {
    if (!isLoading) { setProgress(0); return; }
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev + 0.2;
        if (prev >= 70) return prev + 0.5;
        if (prev >= 40) return prev + 1;
        return prev + 2;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleLoadExample = useCallback(async () => {
    try {
      const response = await fetch('/api/mechfind');
      if (response.ok) {
        const data = await response.json();
        if (data.examples && data.examples.length > 0) {
          const firstExample = data.examples[0];
          setForm((prev) => ({
            ...prev,
            reaction: typeof firstExample === 'string' ? firstExample : firstExample.reaction || firstExample.smiles || DEFAULT_EXAMPLE,
          }));
          toast({ title: 'Example loaded', description: 'Example reaction has been loaded.' });
          return;
        }
      }
    } catch { /* fall through */ }
    setForm((prev) => ({ ...prev, reaction: DEFAULT_EXAMPLE }));
    toast({ title: 'Example loaded', description: 'Default example reaction loaded.' });
  }, [toast]);

  const handleSubmit = useCallback(async () => {
    if (!form.reaction.trim()) {
      toast({ title: 'Missing reaction', description: 'Please enter a reaction SMILES string.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/mechfind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reaction: form.reaction.trim(),
          radius: form.radius,
          max_steps: form.max_steps,
          iterations: form.iterations,
          time_limit: form.time_limit,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.detail || `Server error (${response.status})`);

      setResult(data as PredictionResult);
      toast({ title: 'Prediction complete', description: `Found ${data.mechanisms?.length || 0} mechanism(s) in ${data.summary?.computation_time?.toFixed(1) || '?'}s.` });
      setTimeout(() => document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      toast({ title: 'Prediction failed', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [form, toast]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <InputForm form={form} setForm={setForm} onSubmit={handleSubmit} isLoading={isLoading} onLoadExample={handleLoadExample} />

        {error && (
          <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-950/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-red-800 dark:text-red-300">Prediction Error</p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {(result || isLoading) && (
          <div id="results-section">
            <ResultsSection result={result} isLoading={isLoading} progress={progress} />
          </div>
        )}

        <AboutSection />
      </main>

      <Footer />
    </div>
  );
}
