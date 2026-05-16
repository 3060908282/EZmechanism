'use client';

import { BookOpen, ExternalLink, FlaskConical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function AboutSection() {
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <CardTitle className="text-lg">About MechFind</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Two-Stage Approach</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 space-y-2 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/10">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">1</span>
                  </div>
                  <h4 className="font-semibold text-sm">Parsimony Search</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Finds the minimal set of moiety-based rules that can explain the overall reaction transformation.
                  The search iteratively combines rules from a curated library to cover the observed atom group changes.
                </p>
              </div>
              <div className="border rounded-lg p-4 space-y-2 bg-gradient-to-br from-teal-50/50 to-transparent dark:from-teal-950/10">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/40">
                    <span className="text-teal-600 dark:text-teal-400 font-bold text-xs">2</span>
                  </div>
                  <h4 className="font-semibold text-sm">Similarity Re-ranking</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Re-ranks candidate mechanisms by comparing their moiety change profiles against known enzyme mechanisms
                  in the M-CSA database, prioritizing mechanisms that resemble biochemically validated ones.
                </p>
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Moiety-Based Rules</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Moiety-based rules describe elementary chemical transformations as the transfer of atom groups (moieties) between molecules.
              Unlike graph-based reaction rules, moiety rules capture the essential chemical logic — which atom groups are added, removed,
              or rearranged — enabling efficient mechanism enumeration and comparison across diverse enzyme families.
            </p>
          </div>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Reference</h3>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground leading-relaxed">
              <p>MechFind: De Novo Prediction of Enzyme Mechanisms via Parsimony Search and Similarity Re-ranking.</p>
              <p className="mt-2 text-xs">The Pennsylvania State University &middot; Department of Chemistry</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs gap-1"><ExternalLink className="w-3 h-3" />M-CSA Database</Badge>
              <Badge variant="outline" className="text-xs gap-1"><FlaskConical className="w-3 h-3" />RDKit</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
