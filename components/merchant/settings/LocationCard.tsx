/**
 * LocationCard Component
 *
 * Feature: 053-merchant-integration
 *
 * Displays a single merchant location with actions.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Edit, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { MerchantLocation } from '@/types/merchant';

interface LocationCardProps {
  location: MerchantLocation;
  onEdit: () => void;
  onDelete: () => Promise<boolean>;
  onSetPrimary: () => Promise<boolean>;
  isSaving: boolean;
}

export function LocationCard({
  location,
  onEdit,
  onDelete,
  onSetPrimary,
  isSaving,
}: LocationCardProps) {
  const t = useTranslations('MerchantSettings.locations');

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium truncate">{location.name}</h3>
              {location.isPrimary && (
                <Badge variant="outline" className="gap-1">
                  <Star className="h-3 w-3" />
                  Primary
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {location.addressLine1}
              {location.addressLine2 && `, ${location.addressLine2}`}
            </p>
            <p className="text-sm text-muted-foreground">
              {location.postalCode} {location.city}, {location.country}
            </p>
            {location.phone && (
              <p className="text-sm text-muted-foreground mt-1">{location.phone}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!location.isPrimary && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSetPrimary()}
                disabled={isSaving}
              >
                <Star className="h-4 w-4 mr-1" />
                {t('makePrimary')}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onEdit} disabled={isSaving}>
              <Edit className="h-4 w-4" />
              <span className="sr-only">{t('edit')}</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  disabled={isSaving}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">{t('delete')}</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('deleteConfirmDescription', { name: location.name })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
