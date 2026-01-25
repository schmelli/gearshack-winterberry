'use client';

import { Download, FileDown, FileSpreadsheet, ListChecks } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CATEGORY_LABELS, formatTripDate, formatWeight } from '@/lib/loadout-utils';
import type {
  ActivityType,
  Loadout,
  LoadoutItemState,
  Season,
} from '@/types/loadout';
import type { GearItem } from '@/types/gear';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { getParentCategoryIds } from '@/lib/utils/category-helpers';

/**
 * Export dropdown for the loadout page.
 * Provides CSV and PDF (clean or checklist) generation using client-side rendering.
 */
interface LoadoutExportMenuProps {
  loadout: Loadout;
  items: GearItem[];
  itemStates: LoadoutItemState[];
  activityTypes: ActivityType[];
  seasons: Season[];
  totalWeight: number;
  baseWeight: number;
  /** Show as icon button (for header) instead of labeled button */
  iconOnly?: boolean;
  /** Additional CSS classes for the trigger button */
  className?: string;
}

/** HTML escape helper to prevent injection in generated markup. */
function escape(value: string | null | undefined): string {
  const safe = value ?? '';
  return String(safe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Sanitize filenames to be filesystem-friendly. */
function sanitizeFileName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'loadout';
}

/** Resolve a human-readable category label with fallback. */
function _buildCategoryLabel(categoryId: string | null): string {
  if (!categoryId) return 'Uncategorized';
  return CATEGORY_LABELS[categoryId] || categoryId;
}

/** Map boolean flags to human-readable strings. */
function _formatBoolean(value: boolean | undefined): string {
  return value ? 'Yes' : 'No';
}

interface PdfTemplateOptions {
  loadout: Loadout;
  activitiesLabel: string;
  seasonsLabel: string;
  description: string | null;
  generatedAt: string;
  itemCount: number;
  totalWeight: number;
  baseWeight: number;
  wornWeight: number;
  consumableWeight: number;
  rows: string;
  checklistHeader: string;
  includeChecklist: boolean;
  formattedDate: string;
}

function buildPdfHtml({
  loadout,
  activitiesLabel,
  seasonsLabel,
  description,
  generatedAt,
  itemCount,
  totalWeight,
  baseWeight,
  wornWeight,
  consumableWeight,
  rows,
  checklistHeader,
  formattedDate,
}: PdfTemplateOptions): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>${escape(loadout.name)} - Loadout Export</title>
        <style>
          :root {
            color-scheme: light;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          body {
            margin: 0;
            padding: 32px;
            background: #f8fafc;
            color: #0f172a;
          }
          .card {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
          }
          header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 28px;
            font-weight: 700;
            margin: 0;
          }
          .meta {
            display: grid;
            gap: 6px;
            font-size: 12px;
            color: #475569;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 12px;
            margin-bottom: 20px;
          }
          .summary .pill {
            border-radius: 10px;
            padding: 12px;
            background: #f1f5f9;
          }
          .label {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
          }
          .value {
            font-size: 18px;
            font-weight: 600;
            color: #0f172a;
          }
          .section-title {
            font-size: 16px;
            font-weight: 700;
            margin: 0 0 10px;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            border-bottom: 1px solid #e2e8f0;
            padding: 10px 8px;
            font-size: 13px;
            text-align: left;
          }
          th {
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.05em;
            color: #475569;
            background: #f8fafc;
          }
          .right { text-align: right; }
          .item-name { font-weight: 600; }
          .muted { color: #64748b; font-size: 12px; }
          .badge-row {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 6px;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            padding: 6px 10px;
            border-radius: 999px;
            background: #e2e8f0;
            font-size: 12px;
            color: #0f172a;
          }
          .checkbox-cell { width: 60px; }
          .checkbox {
            width: 16px;
            height: 16px;
            border: 1.5px solid #cbd5e1;
            border-radius: 4px;
            margin: 0 auto;
          }
          @media print {
            body { background: #fff; }
            .card { box-shadow: none; border: 1px solid #e2e8f0; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <header>
            <div>
              <h1 class="title">${escape(loadout.name)}</h1>
              <div class="meta">
                <div><strong>Date:</strong> ${escape(formattedDate)}</div>
                <div><strong>Activities:</strong> ${activitiesLabel}</div>
                <div><strong>Seasons:</strong> ${seasonsLabel}</div>
              </div>
            </div>
            <div class="meta" style="text-align: right;">
              <div><strong>Generated:</strong> ${escape(generatedAt)}</div>
              <div><strong>Items:</strong> ${escape(String(itemCount))}</div>
            </div>
          </header>

          ${
            description
              ? `<p class="muted" style="margin: 0 0 16px;">${escape(description)}</p>`
              : ''
          }

          <div class="summary">
            <div class="pill">
              <div class="label">Total Weight</div>
              <div class="value">${formatWeight(totalWeight)}</div>
            </div>
            <div class="pill">
              <div class="label">Base Weight</div>
              <div class="value">${formatWeight(baseWeight)}</div>
            </div>
            <div class="pill">
              <div class="label">Worn Items</div>
              <div class="value">${formatWeight(wornWeight)}</div>
            </div>
            <div class="pill">
              <div class="label">Consumables</div>
              <div class="value">${formatWeight(consumableWeight)}</div>
            </div>
          </div>

          <div>
            <p class="label" style="margin: 0;">Activities & Seasons</p>
            <div class="badge-row">
              ${
                loadout.activityTypes?.length
                  ? loadout.activityTypes.map((activity) => `<span class="badge">${escape(activity)}</span>`).join('')
                  : '<span class="muted">No activities specified</span>'
              }
              ${
                loadout.seasons?.length
                  ? loadout.seasons.map((season) => `<span class="badge">${escape(season)}</span>`).join('')
                  : ''
              }
            </div>
          </div>

          <div style="margin-top: 18px;">
            <p class="section-title">Pack List</p>
            <table>
              <thead>
                <tr>
                  ${checklistHeader}
                  <th>Item</th>
                  <th>Category</th>
                  <th class="right">Weight</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function LoadoutExportMenu({
  loadout,
  items,
  itemStates,
  activityTypes,
  seasons,
  totalWeight,
  baseWeight,
  iconOnly = false,
  className,
}: LoadoutExportMenuProps) {
  const t = useTranslations('Loadouts');
  const tCommon = useTranslations('Common');
  // Cascading Category Refactor: Get categories for deriving categoryId from productTypeId
  const categories = useCategoriesStore((state) => state.categories);

  // Helper functions that use translations
  const buildCategoryLabelLocal = (categoryId: string | null): string => {
    if (!categoryId) return tCommon('uncategorized');
    return CATEGORY_LABELS[categoryId] || categoryId;
  };

  const formatBooleanLocal = (value: boolean | undefined): string => {
    return value ? t('yes') : t('no');
  };

  const buildFileName = (suffix: string) => {
    const date = new Date().toISOString().slice(0, 10);
    return `${sanitizeFileName(loadout.name)}-${suffix}-${date}`;
  };

  const exportCsv = () => {
    const headers = ['Item', 'Brand', 'Category', 'Weight (g)', 'Worn', 'Consumable'];
    const rows = items.map((item) => {
      const state = itemStates.find((s) => s.itemId === item.id);
      const { categoryId } = getParentCategoryIds(item.productTypeId, categories);
      return [
        item.name,
        item.brand ?? '',
        buildCategoryLabelLocal(categoryId),
        item.weightGrams ?? '',
        formatBooleanLocal(state?.isWorn),
        formatBooleanLocal(state?.isConsumable),
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => {
            const safe = String(value ?? '');
            return `"${safe.replace(/"/g, '""')}"`;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${buildFileName('loadout')}.csv`;
    link.click();
    // Delay revocation to ensure download starts (some browsers need this)
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const renderPdf = (includeChecklist: boolean) => {
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
      alert(t('popupBlockedAlert'));
      return;
    }

    const formattedDate = formatTripDate(loadout.tripDate) ?? 'Not set';
    const activitiesLabel =
      activityTypes.length > 0
        ? activityTypes
            .map((activity) => escape(activity.charAt(0).toUpperCase() + activity.slice(1)))
            .join(', ')
        : 'Not set';
    const seasonsLabel =
      seasons.length > 0
        ? seasons.map((season) => escape(season.charAt(0).toUpperCase() + season.slice(1))).join(', ')
        : 'Not set';

    const itemWeightMap = new Map(items.map((item) => [item.id, item.weightGrams ?? 0]));
    const wornWeight = itemStates
      .filter((state) => state.isWorn)
      .reduce((sum, state) => sum + (itemWeightMap.get(state.itemId) ?? 0), 0);
    const consumableWeight = itemStates
      .filter((state) => state.isConsumable)
      .reduce((sum, state) => sum + (itemWeightMap.get(state.itemId) ?? 0), 0);

    const rows = items
      .map((item) => {
        const state = itemStates.find((s) => s.itemId === item.id);
        const { categoryId } = getParentCategoryIds(item.productTypeId, categories);
        const checklistCell = includeChecklist ? '<td class="checkbox-cell"><div class="checkbox"></div></td>' : '';
        const statusParts = [];
        if (state?.isWorn) statusParts.push('Worn');
        if (state?.isConsumable) statusParts.push('Consumable');

        return `
          <tr>
            ${checklistCell}
            <td>
              <div class="item-name">${escape(item.name)}</div>
              ${item.brand ? `<div class="muted">${escape(item.brand)}</div>` : ''}
            </td>
            <td>${escape(buildCategoryLabelLocal(categoryId))}</td>
            <td class="right">${formatWeight(item.weightGrams)}</td>
            <td>${statusParts.length > 0 ? statusParts.map(escape).join(' • ') : '—'}</td>
          </tr>
        `;
      })
      .join('');

    const checklistHeader = includeChecklist ? '<th class="checkbox-cell">Pack</th>' : '';
    const html = buildPdfHtml({
      loadout: {
        ...loadout,
        activityTypes,
        seasons,
      },
      activitiesLabel,
      seasonsLabel,
      description: loadout.description,
      generatedAt: new Date().toLocaleString(),
      itemCount: items.length,
      totalWeight,
      baseWeight,
      wornWeight,
      consumableWeight,
      rows,
      checklistHeader,
      includeChecklist,
      formattedDate,
    });

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {iconOnly ? (
          <Button variant="ghost" size="icon" className={className ?? "h-8 w-8 shrink-0"} aria-label={t('export')}>
            <Download className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className={className}>
            <Download className="mr-2 h-4 w-4" />
            {t('export')}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t('exportOptions')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => renderPdf(false)}>
          <FileDown className="mr-2 h-4 w-4" />
          {t('pdfClean')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => renderPdf(true)}>
          <ListChecks className="mr-2 h-4 w-4" />
          {t('pdfChecklist')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportCsv}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          {t('csvExport')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
