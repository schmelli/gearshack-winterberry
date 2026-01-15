/**
 * GearGraph Ingestion Page
 *
 * Interface for submitting URLs to be processed and ingested
 * into the GearGraph knowledge graph.
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Link as LinkIcon, AlertCircle, Construction } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function GearGraphIngestionPage() {
  const [url, setUrl] = useState('');
  const [submittedUrls, setSubmittedUrls] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      // TODO: Implement actual URL submission to GearGraph ingestion API
      setSubmittedUrls(prev => [...prev, url.trim()]);
      setUrl('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">GearGraph Ingestion</h1>
        <p className="text-muted-foreground">
          Submit URLs for processing and ingestion into the knowledge graph
        </p>
      </div>

      <Alert>
        <Construction className="h-4 w-4" />
        <AlertTitle>Work in Progress</AlertTitle>
        <AlertDescription>
          This interface is under development. URL submission will be connected
          to the GearGraph ingestion pipeline in a future update.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Submit URL for Ingestion
          </CardTitle>
          <CardDescription>
            Enter a URL to a product page, review, or gear-related content to add
            to the GearGraph knowledge base.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://example.com/product/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={!url.trim()}>
              <Upload className="mr-2 h-4 w-4" />
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>

      {submittedUrls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Submitted URLs</CardTitle>
            <CardDescription>
              URLs queued for processing (demo - not yet connected to backend)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {submittedUrls.map((submittedUrl, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-md border p-3"
                >
                  <Badge variant="secondary">Queued</Badge>
                  <span className="flex-1 truncate text-sm font-mono">
                    {submittedUrl}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Supported URL Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>Product pages from outdoor gear retailers</li>
            <li>Manufacturer product specifications</li>
            <li>Gear review articles and videos</li>
            <li>Trail reports with gear recommendations</li>
            <li>Community forum discussions about gear</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
