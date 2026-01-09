/**
 * CategoryTree Component
 *
 * Feature: Admin Panel with Category Management
 * Recursive tree view for hierarchical category display with CRUD actions
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, Edit, Trash2, Plus, ChevronRight as IndentIcon, ChevronLeft as OutdentIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { Category } from '@/types/category';

// =============================================================================
// Types
// =============================================================================

interface CategoryTreeProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onMoveUp: (category: Category) => void;
  onMoveDown: (category: Category) => void;
  onIndent: (category: Category) => void;
  onOutdent: (category: Category) => void;
  onAddChild: (parentCategory: Category) => void;
  highlightIssues: boolean;
  issueIds: Set<string>;
}

interface CategoryNodeProps {
  category: Category;
  childCategories: Category[];
  allCategories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onMoveUp: (category: Category) => void;
  onMoveDown: (category: Category) => void;
  onIndent: (category: Category) => void;
  onOutdent: (category: Category) => void;
  onAddChild: (parentCategory: Category) => void;
  highlightIssues: boolean;
  issueIds: Set<string>;
  isFirst: boolean;
  isLast: boolean;
}

// =============================================================================
// Level Badge Styles
// =============================================================================

const levelBadgeStyles = {
  1: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100',
  2: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100',
  3: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100',
};

// =============================================================================
// Category Node (Recursive)
// =============================================================================

function CategoryNode({
  category,
  childCategories,
  allCategories,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onIndent,
  onOutdent,
  onAddChild,
  highlightIssues,
  issueIds,
  isFirst,
  isLast,
}: CategoryNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = childCategories.length > 0;
  const hasIssue = issueIds.has(category.id);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          'rounded-lg border p-3 transition-colors',
          highlightIssues && hasIssue && 'border-destructive bg-destructive/5'
        )}
      >
        <div className="flex items-center gap-2">
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          )}
          {!hasChildren && <div className="w-6" />}

          {/* Level Badge */}
          <Badge variant="outline" className={cn('shrink-0', levelBadgeStyles[category.level])}>
            L{category.level}
          </Badge>

          {/* Category Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{category.label}</p>
              {hasIssue && highlightIssues && (
                <Badge variant="destructive" className="text-xs">
                  Issue
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{category.slug}</p>
            <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
              <span>EN: {category.i18n.en || 'N/A'}</span>
              <span>DE: {category.i18n.de || 'N/A'}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1">
            {/* Move Up */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onMoveUp(category)}
              disabled={isFirst}
              title="Move up"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>

            {/* Move Down */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onMoveDown(category)}
              disabled={isLast}
              title="Move down"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>

            {/* Indent (move into previous sibling) */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onIndent(category)}
              disabled={isFirst || category.level === 3}
              title="Indent (make child of previous sibling)"
            >
              <IndentIcon className="h-4 w-4" />
            </Button>

            {/* Outdent (move up a level) */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOutdent(category)}
              disabled={category.level === 1}
              title="Outdent (move up a level)"
            >
              <OutdentIcon className="h-4 w-4" />
            </Button>

            {/* Edit */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(category)}
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </Button>

            {/* Delete */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(category)}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            {/* Add Child (only for L1 and L2) */}
            {category.level < 3 && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onAddChild(category)}
                title={`Add ${category.level === 1 ? 'subcategory' : 'product type'}`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && (
          <CollapsibleContent>
            <div className="ml-6 mt-3 space-y-2 border-l-2 pl-4">
              {childCategories.map((child, index) => {
                const grandchildren = allCategories.filter((c) => c.parentId === child.id);
                return (
                  <CategoryNode
                    key={child.id}
                    category={child}
                    childCategories={grandchildren}
                    allCategories={allCategories}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onMoveUp={onMoveUp}
                    onMoveDown={onMoveDown}
                    onIndent={onIndent}
                    onOutdent={onOutdent}
                    onAddChild={onAddChild}
                    highlightIssues={highlightIssues}
                    issueIds={issueIds}
                    isFirst={index === 0}
                    isLast={index === childCategories.length - 1}
                  />
                );
              })}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

// =============================================================================
// Category Tree (Root)
// =============================================================================

export function CategoryTree({
  categories,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onIndent,
  onOutdent,
  onAddChild,
  highlightIssues,
  issueIds,
}: CategoryTreeProps) {
  // Get level 1 categories (roots)
  const level1Categories = categories.filter((c) => c.level === 1);

  if (level1Categories.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground">No categories found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {level1Categories.map((cat, index) => {
        const catChildren = categories.filter((c) => c.parentId === cat.id);
        return (
          <CategoryNode
            key={cat.id}
            category={cat}
            childCategories={catChildren}
            allCategories={categories}
            onEdit={onEdit}
            onDelete={onDelete}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onIndent={onIndent}
            onOutdent={onOutdent}
            onAddChild={onAddChild}
            highlightIssues={highlightIssues}
            issueIds={issueIds}
            isFirst={index === 0}
            isLast={index === level1Categories.length - 1}
          />
        );
      })}
    </div>
  );
}
