/**
 * MerchantSettingsClient Component
 *
 * Feature: 053-merchant-integration
 * Task: T044
 *
 * Client-side merchant settings with profile and location management.
 */

'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Building2,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Star,
  Save,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { useMerchantAuth, useMerchantProfile, useMerchantLocations } from '@/hooks/merchant';
import type { MerchantLocation, MerchantLocationInput } from '@/types/merchant';

// =============================================================================
// Component
// =============================================================================

export function MerchantSettingsClient() {
  const t = useTranslations('MerchantSettings');

  const { merchant, isLoading: isAuthLoading } = useMerchantAuth();
  const { updateProfile, operationStatus: profileOperationStatus } = useMerchantProfile();
  const isProfileSaving = profileOperationStatus === 'loading';
  const {
    locations,
    isLoading: isLocationsLoading,
    addLocation,
    updateLocation,
    deleteLocation,
    setPrimaryLocation,
    isSaving: isLocationsSaving,
  } = useMerchantLocations();

  const isLoading = isAuthLoading || isLocationsLoading;

  // Location dialog state
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<MerchantLocation | null>(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    businessName: merchant?.businessName ?? '',
    description: merchant?.description ?? '',
    contactEmail: merchant?.contactEmail ?? '',
    contactPhone: merchant?.contactPhone ?? '',
    website: merchant?.website ?? '',
  });

  // Handle profile save
  const handleProfileSave = useCallback(async () => {
    await updateProfile({
      businessName: profileForm.businessName,
      description: profileForm.description,
      contactEmail: profileForm.contactEmail,
      contactPhone: profileForm.contactPhone || undefined,
      website: profileForm.website || undefined,
    });
  }, [updateProfile, profileForm]);

  // Handle add location
  const handleAddLocation = useCallback(() => {
    setEditingLocation(null);
    setLocationDialogOpen(true);
  }, []);

  // Handle edit location
  const handleEditLocation = useCallback((location: MerchantLocation) => {
    setEditingLocation(location);
    setLocationDialogOpen(true);
  }, []);

  // Loading state
  if (isLoading) {
    return <MerchantSettingsSkeleton />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <Building2 className="h-4 w-4" />
            {t('tabs.profile')}
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-2">
            <MapPin className="h-4 w-4" />
            {t('tabs.locations')}
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.title')}</CardTitle>
              <CardDescription>{t('profile.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessName">{t('profile.businessName')}</Label>
                  <Input
                    id="businessName"
                    value={profileForm.businessName}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, businessName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">{t('profile.contactEmail')}</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={profileForm.contactEmail}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, contactEmail: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">{t('profile.contactPhone')}</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={profileForm.contactPhone}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, contactPhone: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">{t('profile.website')}</Label>
                  <Input
                    id="website"
                    type="url"
                    value={profileForm.website}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, website: e.target.value }))
                    }
                    placeholder="https://"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t('profile.businessDescription')}</Label>
                <Textarea
                  id="description"
                  value={profileForm.description}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={4}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleProfileSave} disabled={isProfileSaving}>
                  {isProfileSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {t('saveChanges')}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t('locations.title')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('locations.description')}
              </p>
            </div>
            <Button onClick={handleAddLocation}>
              <Plus className="mr-2 h-4 w-4" />
              {t('locations.addLocation')}
            </Button>
          </div>

          {locations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="font-medium text-muted-foreground">
                  {t('locations.noLocations')}
                </p>
                <p className="text-sm text-muted-foreground/75 mt-1">
                  {t('locations.noLocationsHint')}
                </p>
                <Button onClick={handleAddLocation} variant="outline" className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('locations.addFirst')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {locations.map((location) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  onEdit={() => handleEditLocation(location)}
                  onDelete={() => deleteLocation(location.id)}
                  onSetPrimary={() => setPrimaryLocation(location.id)}
                  isSaving={isLocationsSaving}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Location Dialog */}
      <LocationFormDialog
        open={locationDialogOpen}
        onOpenChange={setLocationDialogOpen}
        location={editingLocation}
        onSave={async (input) => {
          if (editingLocation) {
            await updateLocation(editingLocation.id, input);
          } else {
            await addLocation(input);
          }
          setLocationDialogOpen(false);
        }}
        isSaving={isLocationsSaving}
      />
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface LocationCardProps {
  location: MerchantLocation;
  onEdit: () => void;
  onDelete: () => Promise<boolean>;
  onSetPrimary: () => Promise<boolean>;
  isSaving: boolean;
}

function LocationCard({
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

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: MerchantLocation | null;
  onSave: (input: MerchantLocationInput) => Promise<void>;
  isSaving: boolean;
}

function LocationFormDialog({
  open,
  onOpenChange,
  location,
  onSave,
  isSaving,
}: LocationFormDialogProps) {
  const t = useTranslations('MerchantSettings.locations');

  const [form, setForm] = useState<MerchantLocationInput>({
    name: location?.name ?? '',
    addressLine1: location?.addressLine1 ?? '',
    addressLine2: location?.addressLine2 ?? undefined,
    city: location?.city ?? '',
    postalCode: location?.postalCode ?? '',
    country: location?.country ?? 'DE',
    latitude: location?.latitude ?? 0,
    longitude: location?.longitude ?? 0,
    phone: location?.phone ?? undefined,
    isPrimary: location?.isPrimary ?? false,
  });

  const handleSubmit = async () => {
    await onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {location ? t('editLocation') : t('addLocation')}
          </DialogTitle>
          <DialogDescription>{t('formDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="loc-name">{t('form.name')}</Label>
            <Input
              id="loc-name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t('form.namePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loc-address1">{t('form.address')}</Label>
            <Input
              id="loc-address1"
              value={form.addressLine1}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, addressLine1: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loc-postal">{t('form.postalCode')}</Label>
              <Input
                id="loc-postal"
                value={form.postalCode}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, postalCode: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-city">{t('form.city')}</Label>
              <Input
                id="loc-city"
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="loc-phone">{t('form.phone')}</Label>
            <Input
              id="loc-phone"
              type="tel"
              value={form.phone ?? ''}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, phone: e.target.value || undefined }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loc-lat">{t('form.latitude')}</Label>
              <Input
                id="loc-lat"
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-lng">{t('form.longitude')}</Label>
              <Input
                id="loc-lng"
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    longitude: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !form.name || !form.city}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Skeleton
// =============================================================================

function MerchantSettingsSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      <Skeleton className="h-10 w-64" />

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
