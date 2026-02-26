/**
 * RegistrationForm Component
 *
 * Feature: 008-auth-and-profile
 * T022: Email/password registration form with validation
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Eye, EyeOff, Mail } from 'lucide-react';
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
import { registrationSchema, type RegistrationFormData } from '@/lib/validations/profile-schema';

// =============================================================================
// Component
// =============================================================================

interface RegistrationFormProps {
  /** Callback after successful registration */
  onSuccess?: () => void;
  /** Callback to switch to login form */
  onLoginClick?: () => void;
}

export function RegistrationForm({
  onSuccess,
  onLoginClick,
}: RegistrationFormProps) {
  const t = useTranslations('Auth');
  const { registerWithEmail, error: authError, clearError } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(data: RegistrationFormData) {
    // Feature 023: Debug logging for form submission (FR-008)
    console.log('[RegistrationForm] onSubmit triggered', { email: data.email });
    clearError();
    setIsLoading(true);

    try {
      await registerWithEmail(data.email, data.password);
      onSuccess?.();
    } catch (error) {
      // Check if email confirmation is required
      if (error instanceof Error && error.message === 'CONFIRMATION_REQUIRED') {
        setRegisteredEmail(data.email);
        setConfirmationSent(true);
      }
      // Other errors are handled by useAuth and displayed via authError
    } finally {
      setIsLoading(false);
    }
  }

  // Show confirmation success message
  if (confirmationSent) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-medium">{t('confirmation.checkEmail')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('confirmation.sentTo', { email: registeredEmail })}
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onLoginClick}
        >
          {t('backToSignIn')}
        </Button>
      </div>
    );
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
              <FormLabel>{t('emailLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={t('emailPlaceholder')}
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
              <FormLabel>{t('passwordLabel')}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('createPasswordPlaceholder')}
                    autoComplete="new-password"
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
                      {showPassword ? t('hidePassword') : t('showPassword')}
                    </span>
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Confirm Password Field */}
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('confirmPasswordLabel')}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder={t('confirmPasswordPlaceholder')}
                    autoComplete="new-password"
                    disabled={isLoading}
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="sr-only">
                      {showConfirmPassword ? t('hidePassword') : t('showPassword')}
                    </span>
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Error Message */}
        {authError && (
          <p className="text-sm text-destructive">{authError}</p>
        )}

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('registerButton')}
        </Button>

        {/* Login Link */}
        {onLoginClick && (
          <p className="text-center text-sm text-muted-foreground">
            {t('hasAccount')}{' '}
            <Button
              type="button"
              variant="link"
              size="sm"
              className="px-1"
              onClick={onLoginClick}
            >
              {t('signInLink')}
            </Button>
          </p>
        )}
      </form>
    </Form>
  );
}
