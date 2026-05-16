'use client';

import React, { useState } from 'react';
import {
  Atom, AlertCircle, ChevronDown, ChevronUp, Clock, Hash,
  Settings2, Info, Zap, Target, BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import type { Mechanism, MatrixData, SummaryData, PredictionResult } from './types';

function getMatrixCellClass(value: number): string {
  if (value > 0) return 'text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/30';
  if (value < 0) return 'text-red-700 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-950/30';
  return 'text-muted-foreground';
}

function formatMatrixValue(value: number): string {
  if (value === 0) return '0';
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(2);
}

function ResultsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MechanismCard({ mechanism, index }: { mechanism: Mechanism; index: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const similarityPct = typeof mechanism.similarity === 'number'
    ? (mechanism.similarity * 100).toFixed(1)
    : mechanism.score ? ((mechanism.score as number) * 100).toFixed(1) : '—';
  const rules = mechanism.rules || mechanism.steps || [];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
      <div className="border rounded-lg p-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-bold shrink-0">
              {mechanism.rank ?? index + 1}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">Mechanism #{mechanism.rank ?? index + 1}</span>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">
                  <Target className="w-3 h-3 mr-1" />{similarityPct}% similarity
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {rules.map((rule, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-mono">{rule}</Badge>
                ))}
              </div>
            </div>
          </div>
          {mechanism.mcsa_matches && mechanism.mcsa_matches.length > 0 && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="shrink-0">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span className="ml-1 text-xs hidden sm:inline">M-CSA Matches</span>
              </Button>
            </CollapsibleTrigger>
          )}
        </div>
        {mechanism.mcsa_matches && mechanism.mcsa_matches.length > 0 && (
          <CollapsibleContent>
            <div className="mt-3 pt-3 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top M-CSA Database Matches</p>
              <div className="space-y-1.5">
                {mechanism.mcsa_matches.map((match, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-muted/50 rounded-md px-3 py-2">
                    <span className="font-mono text-xs">M-CSA {match.mcsa_id}{match.enzyme_name ? ` — ${match.enzyme_name}` : ''}</span>
                    {match.score !== undefined && <Badge variant="outline" className="text-xs">{(match.score * 100).toFixed(1)}%</Badge>}
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

function MechanismMatrixTab({ matrix }: { matrix: MatrixData }) {
  if (!matrix || !matrix.moieties || matrix.moieties.length === 0) {
    return (<div className="text-center py-8 text-muted-foreground"><AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" /><p className="text-sm">No matrix data available.</p></div>);
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Moiety change matrix showing atom group transfers across reaction steps.
        <span className="inline-flex items-center gap-2 ml-3">
          <span className="inline-flex items-center gap-1 text-xs"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 dark:bg-emerald-800" /> Positive</span>
          <span className="inline-flex items-center gap-1 text-xs"><span className="w-2.5 h-2.5 rounded-sm bg-red-200 dark:bg-red-800" /> Negative</span>
          <span className="inline-flex items-center gap-1 text-xs"><span className="w-2.5 h-2.5 rounded-sm bg-muted" /> Zero</span>
        </span>
      </p>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-mono text-xs sticky left-0 bg-muted/50 z-10 min-w-[140px]">Moiety SMILES</TableHead>
              {(matrix.columns || []).map((col, i) => <TableHead key={i} className="text-xs text-center min-w-[70px]">{col}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.moieties.map((moiety, rowIdx) => (
              <TableRow key={rowIdx}>
                <TableCell className="font-mono text-xs sticky left-0 bg-background z-10 border-r max-w-[200px] truncate">{moiety}</TableCell>
                {(matrix.rows[rowIdx] || []).map((val, colIdx) => (
                  <TableCell key={colIdx} className={`text-center text-xs ${getMatrixCellClass(val)}`}>{formatMatrixValue(val)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SummaryTab({ summary }: { summary: SummaryData }) {
  if (!summary) return (<div className="text-center py-8 text-muted-foreground"><AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" /><p className="text-sm">No summary data available.</p></div>);
  const params = summary.parameters || {};
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 p-4 border rounded-lg bg-gradient-to-br from-emerald-50 to-transparent dark:from-emerald-950/20">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40"><Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
          <div><p className="text-xs text-muted-foreground">Computation Time</p><p className="text-lg font-bold">{typeof summary.computation_time === 'number' ? `${summary.computation_time.toFixed(1)}s` : '—'}</p></div>
        </div>
        <div className="flex items-center gap-3 p-4 border rounded-lg bg-gradient-to-br from-teal-50 to-transparent dark:from-teal-950/20">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40"><Hash className="w-5 h-5 text-teal-600 dark:text-teal-400" /></div>
          <div><p className="text-xs text-muted-foreground">Solutions Found</p><p className="text-lg font-bold">{summary.num_solutions ?? '—'}</p></div>
        </div>
        <div className="flex items-center gap-3 p-4 border rounded-lg bg-gradient-to-br from-cyan-50 to-transparent dark:from-cyan-950/20">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/40"><BarChart3 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /></div>
          <div><p className="text-xs text-muted-foreground">Search Status</p><p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Complete</p></div>
        </div>
      </div>
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2"><Settings2 className="w-4 h-4 text-muted-foreground" /><p className="text-sm font-medium">Parameters Used</p></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-md p-3"><p className="text-xs text-muted-foreground">Radius</p><p className="font-mono text-sm font-medium">{params.radius ?? '—'}</p></div>
          <div className="bg-muted/50 rounded-md p-3"><p className="text-xs text-muted-foreground">Max Steps</p><p className="font-mono text-sm font-medium">{params.max_steps ?? '—'}</p></div>
          <div className="bg-muted/50 rounded-md p-3"><p className="text-xs text-muted-foreground">Iterations</p><p className="font-mono text-sm font-medium">{params.iterations ?? '—'}</p></div>
          <div className="bg-muted/50 rounded-md p-3"><p className="text-xs text-muted-foreground">Time Limit</p><p className="font-mono text-sm font-medium">{params.time_limit ? `${params.time_limit}s` : '—'}</p></div>
          <div className="bg-muted/50 rounded-md p-3 col-span-2 sm:col-span-2"><p className="text-xs text-muted-foreground">Reaction</p><p className="font-mono text-xs font-medium break-all">{params.reaction ?? '—'}</p></div>
        </div>
      </div>
    </div>
  );
}

export default function ResultsSection({
  result,
  isLoading,
  progress,
}: {
  result: PredictionResult | null;
  isLoading: boolean;
  progress: number;
}) {
  if (isLoading) {
    return (
      <Card className="border-emerald-200/50 dark:border-emerald-800/30">
        <CardContent className="pt-6">
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Running prediction...</span><span>{Math.min(Math.round(progress), 99)}%</span>
            </div>
            <Progress value={Math.min(progress, 99)} className="h-1.5" />
          </div>
          <ResultsSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  const mechanisms = result.mechanisms || [];
  const matrix = result.matrix || { moieties: [], columns: [], rows: [] };
  const summary = result.summary || { computation_time: 0, num_solutions: 0, parameters: { reaction: '', radius: 0, max_steps: 0, iterations: 0, time_limit: 0 } };

  return (
    <Card className="border-emerald-200/50 dark:border-emerald-800/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Atom className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <CardTitle className="text-lg">Prediction Results</CardTitle>
        </div>
        <CardDescription>Explore the predicted mechanisms, moiety change matrix, and computation summary.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="mechanisms" className="w-full">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="mechanisms" className="gap-1.5"><Zap className="w-3.5 h-3.5" />Mechanisms</TabsTrigger>
            <TabsTrigger value="matrix" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Matrix</TabsTrigger>
            <TabsTrigger value="summary" className="gap-1.5"><Info className="w-3.5 h-3.5" />Summary</TabsTrigger>
          </TabsList>
          <TabsContent value="mechanisms" className="mt-4">
            {mechanisms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground"><AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" /><p className="text-sm">No mechanisms found.</p></div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Found <strong className="text-foreground">{mechanisms.length}</strong> predicted mechanism{mechanisms.length > 1 ? 's' : ''}, sorted by similarity score.</p>
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {mechanisms.map((mech, i) => <MechanismCard key={i} mechanism={mech} index={i} />)}
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="matrix" className="mt-4"><MechanismMatrixTab matrix={matrix} /></TabsContent>
          <TabsContent value="summary" className="mt-4"><SummaryTab summary={summary} /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
