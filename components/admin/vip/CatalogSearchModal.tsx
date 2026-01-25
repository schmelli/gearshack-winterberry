/**
 * CatalogSearchModal Component (Admin - Feature 052)
 *
 * Simplified catalog search for adding items to VIP loadouts.
 * Searches GearGraph catalog and creates gear_items in VIP user's inventory.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, Database } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';

import { useCatalogSearch } from '@/hooks/admin/vip/useCatalogSearch';
import type { CatalogProductResult } from '@/types/smart-search';

// =============================================================================
// Types
// =============================================================================

interface CatalogSearchModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when catalog result is selected */
  onSelect: (result: CatalogProductResult) => void;
}

// =============================================================================
// Subcomponents
// =============================================================================

interface CatalogResultCardProps {
  result: CatalogProductResult;
  onClick: () => void;
}

function CatalogResultCard({ result, onClick }: CatalogResultCardProps) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50 hover:border-primary/50"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <h4 className="font-medium truncate">{result.name}</h4>
              {result.brand && (
                <span className="text-sm text-muted-foreground">
                  by {typeof result.brand === 'string' ? result.brand : result.brand.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              {result.weightGrams && (
                <div className="flex items-center gap-1">
                  <span className="font-medium text-foreground">{result.weightGrams}g</span>
                </div>
              )}
              {result.priceUsd && (
                <div className="flex items-center gap-1">
                  <span className="font-medium text-foreground">${result.priceUsd}</span>
                </div>
              )}
              {result.categoryMain && (
                <Badge variant="outline" className="text-xs">
                  {result.categoryMain}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function CatalogSearchModal({
  open,
  onOpenChange,
  onSelect,
}: CatalogSearchModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  // Timer ref for focus delay cleanup
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { results, status, error, search, clear } = useCatalogSearch();

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      focusTimeoutRef.current = setTimeout(() => inputRef.current?.focus(), 100);
    }
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, [open]);

  // Handle search submit
  const handleSearch = useCallback(() => {
    if (searchInput.trim().length >= 2) {
      search(searchInput.trim());
    }
  }, [searchInput, search]);

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle result selection
  const handleSelect = (result: CatalogProductResult) => {
    onSelect(result);
    onOpenChange(false);
    clear();
    setSearchInput('');
  };

  // Handle modal close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      clear();
      setSearchInput('');
    }
    onOpenChange(newOpen);
  };

  const isSearching = status === 'searching';
  const hasResults = results.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Search GearGraph Catalog
          </DialogTitle>
          <DialogDescription>
            Search for products in the GearGraph catalog to add to this VIP loadout
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter product name or brand..."
            disabled={isSearching}
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching || searchInput.trim().length < 2}
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
            {error}
          </div>
        )}

        {/* Results */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-4 pr-4">
            {/* Loading State */}
            {isSearching && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* No Results */}
            {!isSearching && status === 'success' && !hasResults && (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No products found in the catalog.</p>
                <p className="text-xs mt-1">Try a different search term.</p>
              </div>
            )}

            {/* Results Display */}
            {!isSearching && hasResults && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Database className="h-4 w-4 text-green-600" />
                  <h3 className="font-medium">GearGraph Catalog</h3>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {results.length} found
                  </Badge>
                </div>
                <div className="grid gap-2">
                  {results.map((result) => (
                    <CatalogResultCard
                      key={result.id}
                      result={result}
                      onClick={() => handleSelect(result)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default CatalogSearchModal;
