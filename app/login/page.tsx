/**
 * Login Page
 *
 * Feature: 008-auth-and-profile
 * T017: Login page with Google sign-in button
 * T024: Include LoginForm, RegistrationForm toggle, and ForgotPassword link
 * T020, T049: Redirect after successful sign-in to originally requested page or /inventory
 * T041-T042: Glassmorphism card styling (T039-T044 handles background later)
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegistrationForm } from '@/components/auth/RegistrationForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { BackgroundRotator } from '@/components/auth/BackgroundRotator';

// =============================================================================
// Types
// =============================================================================

type AuthView = 'login' | 'register' | 'forgot-password';

// =============================================================================
// Login Content Component (uses useSearchParams)
// =============================================================================

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuthContext();
  const [view, setView] = useState<AuthView>('login');

  // Get return URL from query params (FR-009)
  const returnUrl = searchParams.get('returnUrl') || '/inventory';

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.replace(decodeURIComponent(returnUrl));
    }
  }, [user, loading, router, returnUrl]);

  // Handle successful auth
  function handleAuthSuccess() {
    router.replace(decodeURIComponent(returnUrl));
  }

  // Feature 022: Removed blocking render gate (if loading || user)
  // The form now always renders immediately. The useEffect above handles redirect for authenticated users.
  // This fixes the infinite loading spinner bug when Firebase Auth is slow to respond.

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
      {/* T040-T041: Rotating background images with fallback gradient */}
      <BackgroundRotator />

      {/* T042: Glassmorphism Card */}
      <Card className="w-full max-w-md border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl dark:bg-black/20">
        <CardHeader className="space-y-1 text-center">
          {/* Logo */}
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center">
            <Image
              src="/logos/small_gearshack_logo.png"
              alt="Gearshack Logo"
              width={64}
              height={64}
              className="h-16 w-16"
              priority
            />
          </div>
          <h1 className="font-[family-name:var(--font-rock-salt)] text-2xl text-white">
            Gearshack
          </h1>
          <p className="text-sm text-white/70">
            {view === 'login' && 'Sign in to manage your gear'}
            {view === 'register' && 'Create your account'}
            {view === 'forgot-password' && 'Reset your password'}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Login View */}
          {view === 'login' && (
            <>
              {/* Google Sign-In (T015) */}
              <GoogleSignInButton onSuccess={handleAuthSuccess} />

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-white/50">
                    or continue with email
                  </span>
                </div>
              </div>

              {/* Login Form (T021) */}
              <div className="[&_label]:text-white/90 [&_input]:border-white/20 [&_input]:bg-white/10 [&_input]:text-white [&_input]:placeholder:text-white/50 [&_button[type=submit]]:bg-white [&_button[type=submit]]:text-black [&_button[type=submit]]:hover:bg-white/90 [&_p]:text-white/70 [&_a]:text-white [&_button[variant=link]]:text-white">
                <LoginForm
                  onSuccess={handleAuthSuccess}
                  onRegisterClick={() => setView('register')}
                  onForgotPasswordClick={() => setView('forgot-password')}
                />
              </div>
            </>
          )}

          {/* Registration View */}
          {view === 'register' && (
            <>
              {/* Google Sign-In */}
              <GoogleSignInButton onSuccess={handleAuthSuccess} />

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-white/50">
                    or register with email
                  </span>
                </div>
              </div>

              {/* Registration Form (T022) */}
              <div className="[&_label]:text-white/90 [&_input]:border-white/20 [&_input]:bg-white/10 [&_input]:text-white [&_input]:placeholder:text-white/50 [&_button[type=submit]]:bg-white [&_button[type=submit]]:text-black [&_button[type=submit]]:hover:bg-white/90 [&_p]:text-white/70 [&_a]:text-white [&_button[variant=link]]:text-white">
                <RegistrationForm
                  onSuccess={handleAuthSuccess}
                  onLoginClick={() => setView('login')}
                />
              </div>
            </>
          )}

          {/* Forgot Password View */}
          {view === 'forgot-password' && (
            <div className="[&_label]:text-white/90 [&_input]:border-white/20 [&_input]:bg-white/10 [&_input]:text-white [&_input]:placeholder:text-white/50 [&_button[type=submit]]:bg-white [&_button[type=submit]]:text-black [&_button[type=submit]]:hover:bg-white/90 [&_p]:text-white/70 [&_h3]:text-white">
              <ForgotPasswordForm onBackClick={() => setView('login')} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Page Component
// =============================================================================

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
