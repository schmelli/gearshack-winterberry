/**
 * SmartProductSearchModal Component
 *
 * Feature: XXX-smart-product-search
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Modal dialog for smart product search with catalog and internet results.
 * Shows two sections: "From GearGraph" and "From Web" (when applicable).
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, Database, Globe, Weight, DollarSign } from 'lucide-react';

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

import { useSmartProductSearch } from '@/hooks/useSmartProductSearch';
import type {
  CatalogProductResult,
  InternetProductResult,
  ExtractedProductData,
} from '@/types/smart-search';

// =============================================================================
// Types
// =============================================================================

interface SmartProductSearchModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Initial search query (brand + name) */
  initialQuery: string;
  /** Callback when catalog result is selected */
  onCatalogSelect: (result: CatalogProductResult) => void;
  /** Callback when internet result extraction is complete */
  onInternetExtracted: (data: ExtractedProductData) => void;
}

// =============================================================================
// Component
// =============================================================================

export function SmartProductSearchModal({
  open,
  onOpenChange,
  initialQuery,
  onCatalogSelect,
  onInternetExtracted,
}: SmartProductSearchModalProps) {
  const [searchInput, setSearchInput] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAutoSearched = useRef(false);

  const smartSearch = useSmartProductSearch();

  // Extract stable function reference to avoid dependency issues
  const { search: performSearch } = smartSearch;

  // Auto-search when modal opens with initial query
  useEffect(() => {
    if (open && initialQuery && !hasAutoSearched.current) {
      hasAutoSearched.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync input state with initialQuery on modal open, performSearch triggers async state updates for data fetching
      setSearchInput(initialQuery);
      performSearch(initialQuery);
    }
  }, [open, initialQuery, performSearch]);

  // Reset auto-search flag when modal closes
  useEffect(() => {
    if (!open) {
      hasAutoSearched.current = false;
    }
  }, [open]);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Handle search submit
  const handleSearch = useCallback(() => {
    if (searchInput.trim().length >= 2) {
      performSearch(searchInput.trim());
    }
  }, [searchInput, performSearch]);

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle catalog result selection
  const handleCatalogSelect = (result: CatalogProductResult) => {
    const selected = smartSearch.selectCatalogResult(result);
    onCatalogSelect(selected);
    onOpenChange(false);
    smartSearch.clear();
  };

  // Handle internet result selection
  const handleInternetSelect = async (result: InternetProductResult) => {
    await smartSearch.selectInternetResult(result);
  };

  // Handle extraction confirmation (called from preview dialog)
  const handleConfirmExtraction = () => {
    const data = smartSearch.confirmExtractedData();
    if (data) {
      onInternetExtracted(data);
      onOpenChange(false);
      smartSearch.clear();
    }
  };

  // Handle modal close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      smartSearch.clear();
    }
    onOpenChange(newOpen);
  };

  const isSearching = smartSearch.status === 'searching';
  const isExtracting = smartSearch.status === 'extracting';
  const hasResults = smartSearch.catalogResults.length > 0 || smartSearch.internetResults.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Smart Product Search
          </DialogTitle>
          <DialogDescription>
            Search GearGraph catalog and web for product information
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter product name..."
            disabled={isSearching || isExtracting}
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching || isExtracting || searchInput.trim().length < 2}
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search
          </Button>
        </div>

        {/* Results */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 pr-4">
            {/* Loading State */}
            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Extracting State */}
            {isExtracting && smartSearch.selectedInternetResult && (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Extracting data from {smartSearch.selectedInternetResult.domain}...
                </p>
              </div>
            )}

            {/* Extracted Data Preview */}
            {smartSearch.extractedData && !isExtracting && (
              <ExtractedDataPreview
                data={smartSearch.extractedData}
                onConfirm={handleConfirmExtraction}
                onCancel={smartSearch.clearExtractedData}
              />
            )}

            {/* Results Display */}
            {!isSearching && !isExtracting && !smartSearch.extractedData && hasResults && (
              <>
                {/* Catalog Results */}
                {smartSearch.catalogResults.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="h-4 w-4 text-green-600" />
                      <h3 className="font-medium">From GearGraph Catalog</h3>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {smartSearch.catalogResults.length} found
                      </Badge>
                    </div>
                    <div className="grid gap-2">
                      {smartSearch.catalogResults.map((result) => (
                        <CatalogResultCard
                          key={result.id}
                          result={result}
                          onClick={() => handleCatalogSelect(result)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Internet Results */}
                {smartSearch.showInternetResults && smartSearch.internetResults.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="h-4 w-4 text-blue-600" />
                      <h3 className="font-medium">From Web</h3>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {smartSearch.internetResults.length} found
                      </Badge>
                    </div>
                    <div className="grid gap-2">
                      {smartSearch.internetResults.map((result, index) => (
                        <InternetResultCard
                          key={`${result.link}-${index}`}
                          result={result}
                          onClick={() => handleInternetSelect(result)}
                          disabled={isExtracting}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* No Results */}
            {!isSearching && !hasResults && smartSearch.status === 'success' && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No products found. Try a different search term.</p>
              </div>
            )}

            {/* Rate Limit Warning */}
            {smartSearch.isRateLimited && (
              <div className="text-center py-4 px-6 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  Daily internet search limit reached. Catalog results are still available.
                  <br />
                  <span className="font-medium">Upgrade to Trailblazer for unlimited searches.</span>
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
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
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border hover:bg-accent hover:border-primary transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{result.name}</p>
          {result.brand && (
            <p className="text-sm text-muted-foreground">{result.brand.name}</p>
          )}
          {result.productType && (
            <p className="text-xs text-muted-foreground">{result.productType}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="outline" className="text-xs">
            {Math.round(result.score * 100)}% match
          </Badge>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {result.weightGrams && (
              <span className="flex items-center gap-1">
                <Weight className="h-3 w-3" />
                {result.weightGrams}g
              </span>
            )}
            {result.priceUsd && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                ${result.priceUsd}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

interface InternetResultCardProps {
  result: InternetProductResult;
  onClick: () => void;
  disabled: boolean;
}

function InternetResultCard({ result, onClick, disabled }: InternetResultCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left p-3 rounded-lg border hover:bg-accent hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{result.title}</p>
          <p className="text-xs text-muted-foreground truncate">{result.domain}</p>
          {result.snippet && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {result.snippet}
            </p>
          )}
        </div>
        <Badge variant="outline" className="shrink-0 text-xs bg-blue-50">
          Web
        </Badge>
      </div>
    </button>
  );
}

interface ExtractedDataPreviewProps {
  data: ExtractedProductData;
  onConfirm: () => void;
  onCancel: () => void;
}

function ExtractedDataPreview({ data, onConfirm, onCancel }: ExtractedDataPreviewProps) {
  const confidenceColors = {
    high: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-red-100 text-red-800',
  };

  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Extracted Product Data</h3>
        <Badge className={confidenceColors[data.confidence]}>
          {data.confidence} confidence
        </Badge>
      </div>

      <div className="grid gap-3 text-sm">
        {data.name && (
          <div>
            <span className="text-muted-foreground">Name:</span>{' '}
            <span className="font-medium">{data.name}</span>
          </div>
        )}
        {data.brand && (
          <div>
            <span className="text-muted-foreground">Brand:</span>{' '}
            <span>{data.brand}</span>
          </div>
        )}
        {data.weightGrams && (
          <div className="flex items-center gap-1">
            <Weight className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Weight:</span>{' '}
            <span>{data.weightGrams}g</span>
          </div>
        )}
        {data.priceValue && (
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Price:</span>{' '}
            <span>{data.currency} {data.priceValue}</span>
          </div>
        )}
        {data.description && (
          <div>
            <span className="text-muted-foreground">Description:</span>
            <p className="mt-1 text-xs line-clamp-3">{data.description}</p>
          </div>
        )}
        {data.imageUrl && (
          <div>
            <span className="text-muted-foreground">Image:</span>
            <p className="mt-1 text-xs truncate text-blue-600">{data.imageUrl}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <Button onClick={onConfirm} className="flex-1">
          Apply to Form
        </Button>
        <Button onClick={onCancel} variant="outline" className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  );
}
