/**
 * New Loadout Page
 *
 * Feature: 005-loadout-management
 * FR-024: Allow users to set loadout name and trip date
 */

'use client';

import { useState } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useStore } from '@/hooks/useStore';
import { loadoutFormSchema } from '@/lib/validations/loadout-schema';

export default function NewLoadoutPage() {
  const router = useRouter();
  const createLoadout = useStore((state) => state.createLoadout);

  const [name, setName] = useState('');
  const [tripDate, setTripDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate with Zod
      const result = loadoutFormSchema.safeParse({ name, tripDate });

      if (!result.success) {
        // Zod 4 uses issues array
        const firstIssue = result.error.issues[0];
        setError(firstIssue?.message ?? 'Validation failed');
        setIsSubmitting(false);
        return;
      }

      // Create loadout in store (now async)
      const loadoutId = await createLoadout(result.data.name, result.data.tripDate);

      // Redirect to editor
      router.push(`/loadouts/${loadoutId}`);
    } catch {
      setError('Failed to create loadout');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      {/* Back Link */}
      <Link
        href="/loadouts"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Loadouts
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create New Loadout</CardTitle>
          <CardDescription>
            Start planning your trip by giving it a name and optional date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">Loadout Name</Label>
              <Input
                id="name"
                placeholder="e.g., PCT Section A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Trip Date Field */}
            <div className="space-y-2">
              <Label htmlFor="tripDate">Trip Date (optional)</Label>
              <Input
                id="tripDate"
                type="date"
                value={tripDate}
                onChange={(e) => setTripDate(e.target.value)}
              />
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Loadout'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/loadouts">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
