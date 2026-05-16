'use client';

import React from 'react';
import { Beaker, Info, Play, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import type { FormState } from './types';

export default function InputForm({
  form,
  setForm,
  onSubmit,
  isLoading,
  onLoadExample,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: () => void;
  isLoading: boolean;
  onLoadExample: () => void;
}) {
  return (
    <Card className="border-emerald-200/50 dark:border-emerald-800/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Beaker className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <CardTitle className="text-lg">Prediction Parameters</CardTitle>
        </div>
        <CardDescription>
          Configure the reaction and search parameters for mechanism prediction.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="reaction" className="text-sm font-medium">
            Reaction SMILES <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="reaction"
            placeholder="e.g., CC(=O)SCC.[OH2:1].[NH3+]CC>>CC(=O)NCC.SCC.[OH3+:1]"
            value={form.reaction}
            onChange={(e) => setForm((prev) => ({ ...prev, reaction: e.target.value }))}
            className="font-mono text-sm min-h-[80px] resize-y"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Use dot-separated SMILES for reactants and products separated by &quot;&gt;&gt;&quot;.
              Atom mapping is supported (e.g., <code className="bg-muted px-1 py-0.5 rounded text-[11px]">[OH2:1]</code>).
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Reaction Radius</Label>
            <RadioGroup
              value={String(form.radius)}
              onValueChange={(val) => setForm((prev) => ({ ...prev, radius: Number(val) }))}
              className="flex gap-3"
              disabled={isLoading}
            >
              {[0, 1, 2].map((r) => (
                <div key={r} className="flex items-center space-x-2">
                  <RadioGroupItem value={String(r)} id={`radius-${r}`} />
                  <Label htmlFor={`radius-${r}`} className="text-sm cursor-pointer font-normal">{r}</Label>
                </div>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground">Higher radius captures more distant chemical context.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-steps" className="text-sm font-medium">Max Steps</Label>
            <Input id="max-steps" type="number" min={1} max={50} value={form.max_steps}
              onChange={(e) => setForm((prev) => ({ ...prev, max_steps: Math.min(50, Math.max(1, Number(e.target.value) || 1)) }))}
              disabled={isLoading} />
            <p className="text-xs text-muted-foreground">Maximum number of mechanistic steps to explore.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="iterations" className="text-sm font-medium">Iterations</Label>
            <Input id="iterations" type="number" min={1} max={20} value={form.iterations}
              onChange={(e) => setForm((prev) => ({ ...prev, iterations: Math.min(20, Math.max(1, Number(e.target.value) || 1)) }))}
              disabled={isLoading} />
            <p className="text-xs text-muted-foreground">Number of search iterations for parsimony optimization.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time-limit" className="text-sm font-medium">Time Limit (seconds)</Label>
            <Input id="time-limit" type="number" min={10} max={600} value={form.time_limit}
              onChange={(e) => setForm((prev) => ({ ...prev, time_limit: Math.min(600, Math.max(10, Number(e.target.value) || 10)) }))}
              disabled={isLoading} />
            <p className="text-xs text-muted-foreground">Maximum computation time allowed.</p>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={onLoadExample} disabled={isLoading}
            className="border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
            <Sparkles className="w-4 h-4 mr-2" /> Load Example
          </Button>
          <Button onClick={onSubmit} disabled={isLoading || !form.reaction.trim()}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20">
            {isLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Predicting...</>) : (<><Play className="w-4 h-4 mr-2" /> Run Prediction</>)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
