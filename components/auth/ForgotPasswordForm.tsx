/**
 * ForgotPasswordForm Component
 *
 * Feature: 008-auth-and-profile
 * T023: Password reset request form
 * T026: Success toast after sending reset email
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';
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
import { passwordResetSchema, type PasswordResetFormData } from '@/lib/validations/profile-schema';

// =============================================================================
// Component
// =============================================================================

interface ForgotPasswordFormProps {
  /** Callback to return to login form */
  onBackClick?: () => void;
}

export function ForgotPasswordForm({ onBackClick }: ForgotPasswordFormProps) {
  const { sendPasswordReset } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const form = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(data: PasswordResetFormData) {
    setIsLoading(true);

    try {
      await sendPasswordReset(data.email);
      setIsEmailSent(true);
      // T026: Success toast
      toast.success('Password reset email sent', {
        description: 'Check your inbox for instructions to reset your password.',
      });
    } catch {
      // sendPasswordReset doesn't throw to prevent email enumeration
      // Always show success to prevent revealing if email exists
      setIsEmailSent(true);
      toast.success('Password reset email sent', {
        description: 'If an account exists with this email, you will receive reset instructions.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Success state - email sent
  if (isEmailSent) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Check your email</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            If an account exists with that email, we&apos;ve sent password reset instructions.
          </p>
        </div>
        {onBackClick && (
          <Button variant="outline" onClick={onBackClick} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Button>
        )}
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Forgot password?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you reset instructions.
          </p>
        </div>

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

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send Reset Link
        </Button>

        {/* Back to Login */}
        {onBackClick && (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onBackClick}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Button>
        )}
      </form>
    </Form>
  );
}
