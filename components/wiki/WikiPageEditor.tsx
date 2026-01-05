/**
 * Wiki Page Editor Component
 *
 * Feature: Community Section Restructure
 *
 * Markdown editor for creating and editing wiki pages.
 */

'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { useWikiCategories } from '@/hooks/wiki/useWikiCategories';
import { useWikiEditor } from '@/hooks/wiki/useWikiEditor';
import type { WikiPageWithAuthor, WikiPageStatus } from '@/types/wiki';

const wikiPageSchema = z.object({
  title_en: z.string().min(3, 'Title must be at least 3 characters'),
  title_de: z.string().min(3, 'Titel muss mindestens 3 Zeichen haben'),
  content_en: z.string().min(10, 'Content must be at least 10 characters'),
  content_de: z.string().min(10, 'Inhalt muss mindestens 10 Zeichen haben'),
  category_id: z.string().nullable(),
  status: z.enum(['draft', 'published', 'archived']),
  edit_summary: z.string().optional(),
});

type WikiPageFormValues = z.infer<typeof wikiPageSchema>;

interface WikiPageEditorProps {
  page?: WikiPageWithAuthor;
  mode: 'create' | 'edit';
}

export function WikiPageEditor({ page, mode }: WikiPageEditorProps) {
  const t = useTranslations('Wiki');
  const locale = useLocale();
  const router = useRouter();
  const [showPreview, setShowPreview] = useState(false);
  const [activeLocale, setActiveLocale] = useState<'en' | 'de'>(locale as 'en' | 'de');

  const { categories, isLoading: categoriesLoading } = useWikiCategories();
  const { createPage, updatePage, isSubmitting, error } = useWikiEditor();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WikiPageFormValues>({
    resolver: zodResolver(wikiPageSchema),
    defaultValues: {
      title_en: page?.title_en || '',
      title_de: page?.title_de || '',
      content_en: page?.content_en || '',
      content_de: page?.content_de || '',
      category_id: page?.category_id || null,
      status: (page?.status as WikiPageStatus) || 'draft',
      edit_summary: '',
    },
  });

  const watchContent = watch(activeLocale === 'de' ? 'content_de' : 'content_en');

  const onSubmit = async (data: WikiPageFormValues) => {
    let result;

    if (mode === 'create') {
      result = await createPage(data);
    } else if (page) {
      result = await updatePage(page.slug, data);
    }

    if (result) {
      toast.success(mode === 'create' ? t('pageCreated') : t('pageUpdated'));
      router.push(`/community/wiki/${result.slug}`);
    } else if (error) {
      toast.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Language Tabs */}
      <Tabs value={activeLocale} onValueChange={(v) => setActiveLocale(v as 'en' | 'de')}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="en">English</TabsTrigger>
            <TabsTrigger value="de">Deutsch</TabsTrigger>
          </TabsList>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                {t('hidePreview')}
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                {t('showPreview')}
              </>
            )}
          </Button>
        </div>

        <TabsContent value="en" className="space-y-4">
          <div>
            <Label htmlFor="title_en">{t('titleEn')}</Label>
            <Input
              id="title_en"
              {...register('title_en')}
              placeholder={t('titlePlaceholder')}
            />
            {errors.title_en && (
              <p className="text-sm text-destructive mt-1">{errors.title_en.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="content_en">{t('contentEn')}</Label>
            <Textarea
              id="content_en"
              {...register('content_en')}
              placeholder={t('contentPlaceholder')}
              className="min-h-[300px] font-mono"
            />
            {errors.content_en && (
              <p className="text-sm text-destructive mt-1">{errors.content_en.message}</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="de" className="space-y-4">
          <div>
            <Label htmlFor="title_de">{t('titleDe')}</Label>
            <Input
              id="title_de"
              {...register('title_de')}
              placeholder={t('titlePlaceholderDe')}
            />
            {errors.title_de && (
              <p className="text-sm text-destructive mt-1">{errors.title_de.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="content_de">{t('contentDe')}</Label>
            <Textarea
              id="content_de"
              {...register('content_de')}
              placeholder={t('contentPlaceholderDe')}
              className="min-h-[300px] font-mono"
            />
            {errors.content_de && (
              <p className="text-sm text-destructive mt-1">{errors.content_de.message}</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>{t('preview')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{watchContent || ''}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meta Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">{t('category')}</Label>
          <Select
            value={watch('category_id') || 'none'}
            onValueChange={(v) => setValue('category_id', v === 'none' ? null : v)}
            disabled={categoriesLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectCategory')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('noCategory')}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {locale === 'de' ? cat.name_de : cat.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="status">{t('status')}</Label>
          <Select
            value={watch('status')}
            onValueChange={(v) => setValue('status', v as 'draft' | 'published')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">{t('statusDraft')}</SelectItem>
              <SelectItem value="published">{t('statusPublished')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Edit Summary (only for edits) */}
      {mode === 'edit' && (
        <div>
          <Label htmlFor="edit_summary">{t('editSummary')}</Label>
          <Input
            id="edit_summary"
            {...register('edit_summary')}
            placeholder={t('editSummaryPlaceholder')}
          />
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('saving')}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {mode === 'create' ? t('createPage') : t('savePage')}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
