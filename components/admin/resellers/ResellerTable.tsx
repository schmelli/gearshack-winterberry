/**
 * ResellerTable Component
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Admin table view for reseller management
 *
 * Constitution: UI components must be stateless - all logic in hooks
 */

'use client';

import { useTranslations } from 'next-intl';
import {
  ExternalLink,
  Edit,
  Trash2,
  MoreHorizontal,
  Store,
  Globe,
  Building,
  ArrowUpDown,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  Reseller,
  ResellerStatus,
  ResellerSortField,
  ResellerSortOrder,
} from '@/types/reseller';
import { RESELLER_STATUS_LABELS, RESELLER_STATUS_COLORS, RESELLER_TYPE_LABELS } from '@/types/reseller';

// =============================================================================
// Types
// =============================================================================

interface ResellerTableProps {
  /** List of resellers */
  resellers: Reseller[];
  /** Loading state */
  isLoading: boolean;
  /** Current sort field */
  sortField: ResellerSortField;
  /** Current sort order */
  sortOrder: ResellerSortOrder;
  /** Callback when sort changes */
  onSortChange: (field: ResellerSortField, order: ResellerSortOrder) => void;
  /** Callback when active toggle changes */
  onToggleActive: (id: string) => Promise<void>;
  /** Callback when status changes */
  onStatusChange: (id: string, status: ResellerStatus) => Promise<void>;
  /** Callback when edit is clicked */
  onEdit: (reseller: Reseller) => void;
  /** Callback when delete is clicked */
  onDelete: (id: string) => void;
}

// =============================================================================
// Helper Components
// =============================================================================

function TypeIcon({ type }: { type: Reseller['resellerType'] }) {
  switch (type) {
    case 'local':
      return <Store className="h-4 w-4" />;
    case 'online':
      return <Globe className="h-4 w-4" />;
    case 'chain':
      return <Building className="h-4 w-4" />;
    default:
      return null;
  }
}

function StatusBadge({ status }: { status: ResellerStatus }) {
  const colorMap: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  };

  const color = RESELLER_STATUS_COLORS[status];

  return (
    <Badge
      variant="secondary"
      className={colorMap[color] || colorMap.gray}
    >
      {RESELLER_STATUS_LABELS[status]}
    </Badge>
  );
}

function SortableHeader({
  field,
  label,
  currentField,
  currentOrder,
  onSort,
}: {
  field: ResellerSortField;
  label: string;
  currentField: ResellerSortField;
  currentOrder: ResellerSortOrder;
  onSort: (field: ResellerSortField, order: ResellerSortOrder) => void;
}) {
  const isActive = field === currentField;
  const nextOrder = isActive && currentOrder === 'asc' ? 'desc' : 'asc';

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => onSort(field, nextOrder)}
    >
      {label}
      <ArrowUpDown className={`ml-2 h-4 w-4 ${isActive ? 'opacity-100' : 'opacity-40'}`} />
    </Button>
  );
}

function LoadingSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-4 w-32" />
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-6 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-10" /></TableCell>
          <TableCell><Skeleton className="h-8 w-8" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ResellerTable({
  resellers,
  isLoading,
  sortField,
  sortOrder,
  onSortChange,
  onToggleActive,
  onStatusChange,
  onEdit,
  onDelete,
}: ResellerTableProps) {
  const t = useTranslations('AdminResellers');

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">
              <SortableHeader
                field="name"
                label={t('columns.name')}
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={onSortChange}
              />
            </TableHead>
            <TableHead>{t('columns.type')}</TableHead>
            <TableHead>
              <SortableHeader
                field="status"
                label={t('columns.status')}
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={onSortChange}
              />
            </TableHead>
            <TableHead>{t('columns.countries')}</TableHead>
            <TableHead>{t('columns.active')}</TableHead>
            <TableHead className="w-[70px]">{t('columns.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <LoadingSkeleton />
          ) : resellers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                {t('noResellers')}
              </TableCell>
            </TableRow>
          ) : (
            resellers.map((reseller) => (
              <TableRow key={reseller.id}>
                {/* Name with logo */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                      {reseller.logoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={reseller.logoUrl}
                          alt={reseller.name}
                          className="h-6 w-6 object-contain"
                        />
                      ) : (
                        <TypeIcon type={reseller.resellerType} />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{reseller.name}</div>
                      <a
                        href={reseller.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {new URL(reseller.websiteUrl).hostname}
                      </a>
                    </div>
                  </div>
                </TableCell>

                {/* Type */}
                <TableCell>
                  <div className="flex items-center gap-1.5 text-sm">
                    <TypeIcon type={reseller.resellerType} />
                    {RESELLER_TYPE_LABELS[reseller.resellerType]}
                  </div>
                </TableCell>

                {/* Status (editable) */}
                <TableCell>
                  <Select
                    value={reseller.status}
                    onValueChange={(value) => onStatusChange(reseller.id, value as ResellerStatus)}
                  >
                    <SelectTrigger className="h-7 w-28 border-0 bg-transparent p-0">
                      <SelectValue>
                        <StatusBadge status={reseller.status} />
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(['standard', 'vip', 'partner', 'suspended'] as ResellerStatus[]).map((status) => (
                        <SelectItem key={status} value={status}>
                          <StatusBadge status={status} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                {/* Countries */}
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {reseller.countriesServed.slice(0, 3).map((country) => (
                      <Badge key={country} variant="outline" className="text-xs">
                        {country}
                      </Badge>
                    ))}
                    {reseller.countriesServed.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{reseller.countriesServed.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Active toggle */}
                <TableCell>
                  <Switch
                    checked={reseller.isActive}
                    onCheckedChange={() => onToggleActive(reseller.id)}
                    aria-label={t('toggleActive')}
                  />
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">{t('openMenu')}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onEdit(reseller)}>
                        <Edit className="mr-2 h-4 w-4" />
                        {t('edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(reseller.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
