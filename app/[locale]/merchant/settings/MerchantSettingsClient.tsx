/**
 * MerchantSettingsClient Component
 *
 * Feature: 053-merchant-integration
 * Task: T044
 *
 * Client-side merchant settings with profile and location management.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Building2, MapPin, Plus, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMerchantAuth, useMerchantProfile, useMerchantLocations } from '@/hooks/merchant';
import {
  LocationCard,
  LocationFormDialog,
  MerchantSettingsSkeleton,
} from '@/components/merchant/settings';
import type { MerchantLocation, MerchantLocationInput } from '@/types/merchant';

// =============================================================================
// Types
// =============================================================================

interface ProfileFormState {
  businessName: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
}

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

  // Profile form state - initialize from merchant data
  const initialProfileForm = useMemo<ProfileFormState>(
    () => ({
      businessName: merchant?.businessName ?? '',
      description: merchant?.description ?? '',
      contactEmail: merchant?.contactEmail ?? '',
      contactPhone: merchant?.contactPhone ?? '',
      website: merchant?.website ?? '',
    }),
    [merchant]
  );

  const [profileForm, setProfileForm] = useState<ProfileFormState>(initialProfileForm);

  // Reset form when merchant data loads (for initial load only)
  const merchantId = merchant?.id;
  const [lastMerchantId, setLastMerchantId] = useState<string | null>(null);
  if (merchantId && merchantId !== lastMerchantId) {
    setLastMerchantId(merchantId);
    setProfileForm(initialProfileForm);
  }

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

  // Handle location save
  const handleLocationSave = useCallback(
    async (input: MerchantLocationInput) => {
      if (editingLocation) {
        await updateLocation(editingLocation.id, input);
      } else {
        await addLocation(input);
      }
      setLocationDialogOpen(false);
    },
    [editingLocation, updateLocation, addLocation]
  );

  // Handle form field change
  function handleFieldChange(field: keyof ProfileFormState, value: string): void {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  }

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
                    onChange={(e) => handleFieldChange('businessName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">{t('profile.contactEmail')}</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={profileForm.contactEmail}
                    onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">{t('profile.contactPhone')}</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={profileForm.contactPhone}
                    onChange={(e) => handleFieldChange('contactPhone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">{t('profile.website')}</Label>
                  <Input
                    id="website"
                    type="url"
                    value={profileForm.website}
                    onChange={(e) => handleFieldChange('website', e.target.value)}
                    placeholder="https://"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t('profile.businessDescription')}</Label>
                <Textarea
                  id="description"
                  value={profileForm.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
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
        onSave={handleLocationSave}
        isSaving={isLocationsSaving}
      />
    </div>
  );
}
