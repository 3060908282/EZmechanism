'use client';

import { Dna } from 'lucide-react';

export default function Header() {
  return (
    <header className="border-b border-emerald-200/50 dark:border-emerald-800/30 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-cyan-950/20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
            <Dna className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Mech<span className="text-emerald-600 dark:text-emerald-400">Find</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
              De Novo Prediction of Enzyme Mechanisms
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground max-w-2xl leading-relaxed">
          MechFind is a computational framework that predicts enzyme reaction mechanisms from reactant and product structures
          using a two-stage approach: <strong className="text-foreground">Parsimony Search</strong> to find minimal mechanisms,
          followed by <strong className="text-foreground">Similarity Re-ranking</strong> against the M-CSA database.
        </p>
      </div>
    </header>
  );
}
