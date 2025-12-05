/**
 * LoginForm Component
 *
 * Feature: 008-auth-and-profile
 * T021: Email/password login form with validation
 * FR-005: Generic error messages to prevent email enumeration
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Eye, EyeOff } from 'lucide-react';
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
import { useAuthContext } from '@/components/auth/AuthProvider';
import { loginSchema, type LoginFormData } from '@/lib/validations/profile-schema';

// =============================================================================
// Component
// =============================================================================

interface LoginFormProps {
  /** Callback after successful login */
  onSuccess?: () => void;
  /** Callback to switch to registration form */
  onRegisterClick?: () => void;
  /** Callback to show forgot password form */
  onForgotPasswordClick?: () => void;
}

export function LoginForm({
  onSuccess,
  onRegisterClick,
  onForgotPasswordClick,
}: LoginFormProps) {
  const { signInWithEmail, error: authError, clearError } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginFormData) {
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@example.com"
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
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
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
                      {showPassword ? 'Hide password' : 'Show password'}
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
              Forgot password?
            </Button>
          </div>
        )}

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign In
        </Button>

        {/* Register Link */}
        {onRegisterClick && (
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Button
              type="button"
              variant="link"
              size="sm"
              className="px-1"
              onClick={onRegisterClick}
            >
              Sign up
            </Button>
          </p>
        )}
      </form>
    </Form>
  );
}
