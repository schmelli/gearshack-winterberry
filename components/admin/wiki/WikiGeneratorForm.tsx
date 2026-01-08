/**
 * Wiki Generator Form
 *
 * Feature: Admin Section Enhancement
 *
 * Form for generating wiki articles from URLs using AI.
 */

'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Sparkles, Loader2, ExternalLink, Check, FileText, AlertTriangle, Link2, Merge } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useWikiGenerator } from '@/hooks/admin/useWikiGenerator';
import { useWikiCategories } from '@/hooks/wiki/useWikiCategories';
import { useWikiEditor } from '@/hooks/wiki/useWikiEditor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { WikiGenerationResult, SimilarWikiArticle } from '@/types/admin';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// ============================================================================
// Types
// ============================================================================

interface WikiGeneratorFormProps {
  onArticleCreated?: (slug: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function WikiGeneratorForm({ onArticleCreated }: WikiGeneratorFormProps) {
  const t = useTranslations('Admin.wiki.generator');
  const router = useRouter();

  const { status, result, error, generate, reset } = useWikiGenerator();
  const { categories } = useWikiCategories();
  const { createPage, isSubmitting } = useWikiEditor();

  const [sourceUrl, setSourceUrl] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [previewTab, setPreviewTab] = useState<'en' | 'de'>('en');

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleGenerate = useCallback(async () => {
    if (!sourceUrl.trim()) {
      toast.error(t('urlRequired'));
      return;
    }

    try {
      await generate({
        sourceUrl: sourceUrl.trim(),
        targetCategoryId: selectedCategoryId || undefined,
      });
    } catch {
      // Error is handled in the hook
    }
  }, [sourceUrl, selectedCategoryId, generate, t]);

  const handleSaveToWiki = useCallback(async () => {
    if (!result) return;

    try {
      const page = await createPage({
        title_en: result.title_en,
        title_de: result.title_de,
        content_en: result.content_en,
        content_de: result.content_de,
        category_id: selectedCategoryId || null,
        status: 'draft', // Save as draft for review
        edit_summary: 'AI-generated article',
      });

      if (!page) {
        toast.error(t('saveFailed'));
        return;
      }

      toast.success(t('savedToDraft'));

      if (onArticleCreated) {
        onArticleCreated(page.slug);
      } else {
        router.push(`/community/wiki/${page.slug}/edit`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('saveFailed');
      toast.error(message);
    }
  }, [result, selectedCategoryId, createPage, onArticleCreated, router, t]);

  const handleReset = useCallback(() => {
    reset();
    setSourceUrl('');
    setSelectedCategoryId('');
  }, [reset]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const isGenerating = status === 'fetching' || status === 'generating';

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="source-url">{t('urlLabel')}</Label>
            <div className="flex gap-2">
              <Input
                id="source-url"
                type="url"
                placeholder={t('urlPlaceholder')}
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                disabled={isGenerating}
              />
              {sourceUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                >
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">{t('categoryLabel')}</Label>
            <Select
              value={selectedCategoryId}
              onValueChange={setSelectedCategoryId}
              disabled={isGenerating}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder={t('categoryPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !sourceUrl.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {status === 'fetching' ? t('fetching') : t('generating')}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {t('generateButton')}
              </>
            )}
          </Button>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('preview')}
                </CardTitle>
                {result.suggestedCategory && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="capitalize">
                      {t('suggestedCategory')}: {result.suggestedCategory}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  {t('reset')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveToWiki}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  {t('saveToWiki')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Duplicate Warning */}
            {result.hasPotentialDuplicates && result.similarArticles && result.similarArticles.length > 0 && (
              <DuplicateWarning
                similarArticles={result.similarArticles}
                onViewArticle={(slug) => router.push(`/community/wiki/${slug}`)}
                onEditArticle={(slug) => router.push(`/community/wiki/${slug}/edit`)}
              />
            )}

            <Tabs
              value={previewTab}
              onValueChange={(v) => setPreviewTab(v as 'en' | 'de')}
            >
              <TabsList className="mb-4">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="de">Deutsch</TabsTrigger>
              </TabsList>

              <TabsContent value="en" className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {t('titleLabel')}
                  </Label>
                  <h2 className="text-xl font-bold">{result.title_en}</h2>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {t('contentLabel')}
                  </Label>
                  <div className="prose prose-sm dark:prose-invert max-w-none mt-2 rounded-lg border bg-muted/50 p-4 max-h-[400px] overflow-y-auto">
                    <ArticlePreview content={result.content_en} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="de" className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {t('titleLabel')}
                  </Label>
                  <h2 className="text-xl font-bold">{result.title_de}</h2>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {t('contentLabel')}
                  </Label>
                  <div className="prose prose-sm dark:prose-invert max-w-none mt-2 rounded-lg border bg-muted/50 p-4 max-h-[400px] overflow-y-auto">
                    <ArticlePreview content={result.content_de} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Duplicate Warning Component
// ============================================================================

interface DuplicateWarningProps {
  similarArticles: SimilarWikiArticle[];
  onViewArticle: (slug: string) => void;
  onEditArticle: (slug: string) => void;
}

function DuplicateWarning({ similarArticles, onViewArticle, onEditArticle }: DuplicateWarningProps) {
  return (
    <Alert variant="destructive" className="border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">
        Potential Duplicate Detected
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3 text-amber-700 dark:text-amber-300">
          Similar articles already exist. Consider updating an existing article instead of creating a duplicate.
        </p>
        <div className="space-y-2">
          {similarArticles.map((article) => (
            <div
              key={article.id}
              className="flex items-center justify-between gap-2 rounded-md bg-amber-100 dark:bg-amber-900 p-2"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-amber-900 dark:text-amber-100 truncate">
                  {article.title_en}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {article.matchReason} • Status: {article.status}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs border-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800"
                  onClick={() => onViewArticle(article.slug)}
                >
                  <Link2 className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs border-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800"
                  onClick={() => onEditArticle(article.slug)}
                >
                  <Merge className="h-3 w-3 mr-1" />
                  Edit & Merge
                </Button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
          You can still save as new article if the content is sufficiently different.
        </p>
      </AlertDescription>
    </Alert>
  );
}

// ============================================================================
// Article Preview (Simple Markdown Rendering)
// ============================================================================

function ArticlePreview({ content }: { content: string }) {
  // Simple markdown-to-HTML conversion for preview
  // In production, use react-markdown or similar
  const html = content
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return (
    <div
      dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
      className="whitespace-pre-wrap"
    />
  );
}
