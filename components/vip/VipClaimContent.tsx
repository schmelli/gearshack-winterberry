/**
 * VipClaimContent Component
 *
 * Feature: 052-vip-loadouts
 * Task: T077
 *
 * Client component that handles the VIP claim flow.
 * Shows VIP info, verifies token, and completes claim process.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Loader2, UserCheck, AlertTriangle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// Types
// =============================================================================

interface VipClaimContentProps {
  token: string;
}

interface ClaimData {
  invitation: {
    id: string;
    email: string;
    status: string;
    expiresAt: string;
  };
  vip: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string;
    bio: string;
    status: string;
  };
}

type ClaimStatus = 'loading' | 'valid' | 'invalid' | 'expired' | 'claimed' | 'claiming' | 'success' | 'error';

// =============================================================================
// Component
// =============================================================================

export function VipClaimContent({ token }: VipClaimContentProps) {
  const t = useTranslations('vip.claim');
  const router = useRouter();
  const supabase = createClient();

  const [status, setStatus] = useState<ClaimStatus>('loading');
  const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup redirect timeout on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, []);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Fetch claim invitation details
  useEffect(() => {
    const fetchClaimData = async () => {
      try {
        const response = await fetch(`/api/vip/claim/${token}`);
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            setStatus('invalid');
            setError(data.error || t('errors.invalidToken'));
          } else if (response.status === 410) {
            setStatus('expired');
            setError(data.error || t('errors.expired'));
          } else if (response.status === 400) {
            setStatus('claimed');
            setError(data.error || t('errors.alreadyClaimed'));
          } else {
            setStatus('error');
            setError(data.error || t('errors.loadFailed'));
          }
          return;
        }

        setClaimData(data);
        setStatus('valid');
      } catch (err) {
        console.error('Error fetching claim data:', err);
        setStatus('error');
        setError(t('errors.loadFailed'));
      }
    };

    fetchClaimData();
  }, [token, t]);

  // Handle claim completion
  const handleClaim = useCallback(async () => {
    setStatus('claiming');
    setError(null);

    try {
      const response = await fetch(`/api/vip/claim/${token}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus('valid');
        setError(data.error || t('errors.claimFailed'));
        toast.error(t('errors.claimFailed'), {
          description: data.error,
        });
        return;
      }

      setStatus('success');
      toast.success(t('claimSuccess'), {
        description: t('claimSuccessDescription', { name: data.vip.name }),
      });

      // Redirect to VIP profile after a short delay (with cleanup on unmount)
      redirectTimeoutRef.current = setTimeout(() => {
        router.push(`/vip/${data.vip.slug}`);
      }, 2000);
    } catch (err) {
      console.error('Error completing claim:', err);
      setStatus('valid');
      setError(t('errors.claimFailed'));
      toast.error(t('errors.claimFailed'));
    }
  }, [token, t, router]);

  // Loading state
  if (status === 'loading' || isAuthenticated === null) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">{t('loading')}</p>
        </CardContent>
      </Card>
    );
  }

  // Error states
  if (status === 'invalid' || status === 'expired' || status === 'error') {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle>
            {status === 'invalid' && t('errors.invalidTitle')}
            {status === 'expired' && t('errors.expiredTitle')}
            {status === 'error' && t('errors.errorTitle')}
          </CardTitle>
          <CardDescription>
            {error || t('errors.genericError')}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Button asChild variant="outline">
            <Link href="/">{t('backToHome')}</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Already claimed
  if (status === 'claimed') {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <UserCheck className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>{t('errors.alreadyClaimedTitle')}</CardTitle>
          <CardDescription>{t('errors.alreadyClaimed')}</CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Button asChild variant="outline">
            <Link href="/vip">{t('browseVips')}</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle>{t('successTitle')}</CardTitle>
          <CardDescription>
            {t('successDescription', { name: claimData?.vip.name || '' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">{t('redirecting')}</p>
        </CardContent>
      </Card>
    );
  }

  // Valid claim - show VIP info and claim button
  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        {claimData?.vip.avatarUrl && (
          <div className="mx-auto mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={claimData.vip.avatarUrl}
              alt={claimData.vip.name}
              className="h-20 w-20 rounded-full object-cover ring-4 ring-primary/10"
            />
          </div>
        )}
        <CardTitle>{t('claimTitle', { name: claimData?.vip.name || '' })}</CardTitle>
        <CardDescription>
          {t('claimDescription')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* VIP Info */}
        {claimData?.vip.bio && (
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">{claimData.vip.bio}</p>
          </div>
        )}

        {/* Benefits */}
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('benefits.title')}</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              {t('benefits.manageLoadouts')}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              {t('benefits.verifiedBadge')}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              {t('benefits.directMessages')}
            </li>
          </ul>
        </div>

        {/* Error alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('errors.errorTitle')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Not authenticated warning */}
        {!isAuthenticated && (
          <Alert>
            <LogIn className="h-4 w-4" />
            <AlertTitle>{t('signInRequired')}</AlertTitle>
            <AlertDescription>{t('signInDescription')}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        {isAuthenticated ? (
          <Button
            onClick={handleClaim}
            disabled={status === 'claiming'}
            className="w-full"
            size="lg"
          >
            {status === 'claiming' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('claiming')}
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                {t('claimAccount')}
              </>
            )}
          </Button>
        ) : (
          <Button asChild className="w-full" size="lg">
            <Link href={`/login?redirect=/vip/claim/${token}`}>
              <LogIn className="mr-2 h-4 w-4" />
              {t('signInToClaim')}
            </Link>
          </Button>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {t('expiresNotice', {
            date: claimData?.invitation.expiresAt
              ? new Date(claimData.invitation.expiresAt).toLocaleDateString()
              : '',
          })}
        </p>
      </CardFooter>
    </Card>
  );
}

export default VipClaimContent;
