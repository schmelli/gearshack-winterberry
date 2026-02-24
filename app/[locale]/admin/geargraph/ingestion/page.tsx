/**
 * GearGraph Ingestion Page
 *
 * Interface for submitting URLs to be processed and ingested
 * into the GearGraph knowledge graph.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Link as LinkIcon, AlertCircle, Construction } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function GearGraphIngestionPage() {
  const [url, setUrl] = useState('');
  const [submittedUrls, setSubmittedUrls] = useState<string[]>([]);
  const t = useTranslations('GearGraphIngestion');

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
        <h1 className="text-2xl font-bold">{t('pageTitle')}</h1>
        <p className="text-muted-foreground">
          {t('pageDescription')}
        </p>
      </div>

      <Alert>
        <Construction className="h-4 w-4" />
        <AlertTitle>{t('wipTitle')}</AlertTitle>
        <AlertDescription>
          {t('wipDescription')}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t('submitTitle')}
          </CardTitle>
          <CardDescription>
            {t('submitDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="url"
                placeholder={t('urlPlaceholder')}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={!url.trim()}>
              <Upload className="mr-2 h-4 w-4" />
              {t('submit')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {submittedUrls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('submittedUrls')}</CardTitle>
            <CardDescription>
              {t('submittedUrlsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {submittedUrls.map((submittedUrl, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-md border p-3"
                >
                  <Badge variant="secondary">{t('queued')}</Badge>
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
            {t('supportedUrlTypes')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>{t('urlTypes.productPages')}</li>
            <li>{t('urlTypes.manufacturerSpecs')}</li>
            <li>{t('urlTypes.gearReviews')}</li>
            <li>{t('urlTypes.trailReports')}</li>
            <li>{t('urlTypes.communityForums')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
