'use client';

import React, { useState, useCallback } from 'react';
import { FlaskConical, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Footer() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const response = await fetch('/api/download');
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const cd = response.headers.get('Content-Disposition');
      const filename = cd ? cd.split('filename=')[1]?.replace(/"/g, '') : 'mechfind-source.zip';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'mechfind-source.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  }, []);

  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <FlaskConical className="w-3.5 h-3.5" />
            <span>MechFind &copy; 2025, The Pennsylvania State University</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleDownload} disabled={downloading}
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {downloading ? 'Preparing...' : 'Download Source Code'}
            </Button>
            <span>All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
