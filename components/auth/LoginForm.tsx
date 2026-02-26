/**
 * LoginForm Component
 *
 * Feature: 008-auth-and-profile
 * T021: Email/password login form with validation
 * FR-005: Generic error messages to prevent email enumeration
 *
 * Feature: 028-landing-page-i18n
 * T026: Support translations via props (FR-009)
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { loginSchema, type LoginFormData } from '@/lib/validations/profile-schema';

// =============================================================================
// Component
// =============================================================================

interface LoginFormTranslations {
  emailLabel: string;
  passwordLabel: string;
  loginButton: string;
  forgotPassword: string;
  noAccount: string;
  signUpLink: string;
  emailPlaceholder: string;
  enterPasswordPlaceholder: string;
  showPassword: string;
  hidePassword: string;
}

interface LoginFormProps {
  /** Callback after successful login */
  onSuccess?: () => void;
  /** Callback to switch to registration form */
  onRegisterClick?: () => void;
  /** Callback to show forgot password form */
  onForgotPasswordClick?: () => void;
  /** Translations for form labels and buttons */
  translations?: Partial<LoginFormTranslations>;
}

export function LoginForm({
  onSuccess,
  onRegisterClick,
  onForgotPasswordClick,
  translations: translationsProp,
}: LoginFormProps) {
  const tAuth = useTranslations('Auth');
  const { signInWithEmail, error: authError, clearError } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Use translations from props if provided, otherwise use i18n
  const t: LoginFormTranslations = {
    emailLabel: translationsProp?.emailLabel ?? tAuth('emailLabel'),
    passwordLabel: translationsProp?.passwordLabel ?? tAuth('passwordLabel'),
    loginButton: translationsProp?.loginButton ?? tAuth('loginButton'),
    forgotPassword: translationsProp?.forgotPassword ?? tAuth('forgotPassword'),
    noAccount: translationsProp?.noAccount ?? tAuth('noAccount'),
    signUpLink: translationsProp?.signUpLink ?? tAuth('signUpLink'),
    emailPlaceholder: translationsProp?.emailPlaceholder ?? tAuth('emailPlaceholder'),
    enterPasswordPlaceholder: translationsProp?.enterPasswordPlaceholder ?? tAuth('enterPasswordPlaceholder'),
    showPassword: translationsProp?.showPassword ?? tAuth('showPassword'),
    hidePassword: translationsProp?.hidePassword ?? tAuth('hidePassword'),
  };

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginFormData) {
    // Feature 023: Debug logging for form submission (FR-008)
    console.log('[LoginForm] onSubmit triggered', { email: data.email });
    clearError();
    setIsLoading(true);

    try {
      await signInWithEmail(data.email, data.password);
      onSuccess?.();
    } catch {
      // Error is handled by useAuth and displayed via authError
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.emailLabel}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={t.emailPlaceholder}
                  autoComplete="email"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password Field */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.passwordLabel}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t.enterPasswordPlaceholder}
                    autoComplete="current-password"
                    disabled={isLoading}
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="sr-only">
                      {showPassword ? t.hidePassword : t.showPassword}
                    </span>
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Error Message (T025) */}
        {authError && (
          <p className="text-sm text-destructive">{authError}</p>
        )}

        {/* Forgot Password Link */}
        {onForgotPasswordClick && (
          <div className="text-right">
            <Button
              type="button"
              variant="link"
              size="sm"
              className="px-0 text-xs"
              onClick={onForgotPasswordClick}
            >
              {t.forgotPassword}
            </Button>
          </div>
        )}

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t.loginButton}
        </Button>

        {/* Register Link */}
        {onRegisterClick && (
          <p className="text-center text-sm text-muted-foreground">
            {t.noAccount}{' '}
            <Button
              type="button"
              variant="link"
              size="sm"
              className="px-1"
              onClick={onRegisterClick}
            >
              {t.signUpLink}
            </Button>
          </p>
        )}
      </form>
    </Form>
  );
}
