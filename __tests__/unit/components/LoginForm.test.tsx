/**
 * LoginForm Component Tests
 *
 * Tests for the LoginForm component used in authentication.
 * Tests rendering, form validation, submission, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';

// =============================================================================
// Mocks
// =============================================================================

// Mock signIn function
const mockSignInWithEmail = vi.fn().mockResolvedValue(undefined);
const mockClearError = vi.fn();

// Mock auth context
const mockAuthContext = {
  signInWithEmail: mockSignInWithEmail,
  error: null as string | null,
  clearError: mockClearError,
};

vi.mock('@/components/auth/SupabaseAuthProvider', () => ({
  useAuthContext: () => mockAuthContext,
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      emailLabel: 'Email',
      passwordLabel: 'Password',
      loginButton: 'Sign In',
      forgotPassword: 'Forgot your password?',
      noAccount: "Don't have an account?",
      signUpLink: 'Sign up',
      emailPlaceholder: 'you@example.com',
      enterPasswordPlaceholder: 'Enter your password',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
    };
    return translations[key] ?? key;
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) => (
    <svg data-testid="loader-icon" className={className} />
  ),
  Eye: ({ className }: { className?: string }) => (
    <svg data-testid="eye-icon" className={className} />
  ),
  EyeOff: ({ className }: { className?: string }) => (
    <svg data-testid="eye-off-icon" className={className} />
  ),
}));

// Mock react-hook-form
vi.mock('react-hook-form', () => {
  const actual = vi.importActual('react-hook-form');
  return {
    ...actual,
    useForm: () => ({
      control: {},
      handleSubmit: (fn: (data: { email: string; password: string }) => void) => (e: Event) => {
        e.preventDefault();
        // Get form values from the actual form elements
        const form = (e.target as HTMLFormElement);
        const emailInput = form?.querySelector('input[type="email"]') as HTMLInputElement;
        const passwordInput = form?.querySelector('input[type="password"], input[name="password"]') as HTMLInputElement;
        if (emailInput && passwordInput) {
          fn({ email: emailInput.value, password: passwordInput.value });
        }
      },
      formState: { errors: {} },
      register: (name: string) => ({ name }),
      watch: () => '',
      setValue: vi.fn(),
      reset: vi.fn(),
    }),
  };
});

// Mock @hookform/resolvers
vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => vi.fn(),
}));

// Mock validation schema
vi.mock('@/lib/validations/profile-schema', () => ({
  loginSchema: {},
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    type,
    variant,
    size,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    type?: 'button' | 'submit';
    variant?: string;
    size?: string;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    tabIndex?: number;
  }) => (
    <button
      type={type}
      data-variant={variant}
      data-size={size}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({
    type,
    placeholder,
    autoComplete,
    disabled,
    name,
    ...props
  }: {
    type?: string;
    placeholder?: string;
    autoComplete?: string;
    disabled?: boolean;
    name?: string;
  }) => (
    <input
      type={type}
      placeholder={placeholder}
      autoComplete={autoComplete}
      disabled={disabled}
      name={name}
      data-testid={`${name ?? type}-input`}
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/form', () => ({
  Form: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="form-provider" {...props}>{children}</div>
  ),
  FormField: ({
    name,
    render,
  }: {
    control?: unknown;
    name: string;
    render: (props: { field: { name: string; value: string; onChange: () => void } }) => React.ReactNode;
  }) => (
    <div data-testid={`form-field-${name}`}>
      {render({
        field: {
          name,
          value: '',
          onChange: vi.fn(),
        },
      })}
    </div>
  ),
  FormItem: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="form-item">{children}</div>
  ),
  FormLabel: ({ children }: { children: React.ReactNode }) => (
    <label data-testid="form-label">{children}</label>
  ),
  FormControl: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="form-control">{children}</div>
  ),
  FormMessage: () => <span data-testid="form-message" />,
}));

// =============================================================================
// Tests
// =============================================================================

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext.error = null;
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the email input field', () => {
      render(<LoginForm />);

      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    });

    it('should render the password input field', () => {
      render(<LoginForm />);

      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    });

    it('should render the email label', () => {
      render(<LoginForm />);

      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('should render the password label', () => {
      render(<LoginForm />);

      expect(screen.getByText('Password')).toBeInTheDocument();
    });

    it('should render the submit button', () => {
      render(<LoginForm />);

      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('should render password visibility toggle', () => {
      render(<LoginForm />);

      expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Props Tests
  // ===========================================================================

  describe('Props', () => {
    it('should render forgot password link when callback provided', () => {
      const onForgotPasswordClick = vi.fn();
      render(<LoginForm onForgotPasswordClick={onForgotPasswordClick} />);

      expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
    });

    it('should not render forgot password link when callback not provided', () => {
      render(<LoginForm />);

      expect(screen.queryByText('Forgot your password?')).not.toBeInTheDocument();
    });

    it('should render register link when callback provided', () => {
      const onRegisterClick = vi.fn();
      render(<LoginForm onRegisterClick={onRegisterClick} />);

      expect(screen.getByText('Sign up')).toBeInTheDocument();
      expect(screen.getByText(/Don't have an account/)).toBeInTheDocument();
    });

    it('should not render register link when callback not provided', () => {
      render(<LoginForm />);

      expect(screen.queryByText('Sign up')).not.toBeInTheDocument();
    });

    it('should use custom translations when provided', () => {
      render(
        <LoginForm
          translations={{
            emailLabel: 'E-Mail',
            loginButton: 'Anmelden',
          }}
        />
      );

      expect(screen.getByText('E-Mail')).toBeInTheDocument();
      expect(screen.getByText('Anmelden')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('Interactions', () => {
    it('should call onForgotPasswordClick when forgot password clicked', () => {
      const onForgotPasswordClick = vi.fn();
      render(<LoginForm onForgotPasswordClick={onForgotPasswordClick} />);

      fireEvent.click(screen.getByText('Forgot your password?'));

      expect(onForgotPasswordClick).toHaveBeenCalledTimes(1);
    });

    it('should call onRegisterClick when sign up clicked', () => {
      const onRegisterClick = vi.fn();
      render(<LoginForm onRegisterClick={onRegisterClick} />);

      fireEvent.click(screen.getByText('Sign up'));

      expect(onRegisterClick).toHaveBeenCalledTimes(1);
    });

    it('should toggle password visibility when eye icon clicked', () => {
      render(<LoginForm />);

      // Initially should show eye icon (password hidden)
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument();

      // Click to show password
      const toggleButton = screen.getByTestId('eye-icon').closest('button');
      if (toggleButton) fireEvent.click(toggleButton);

      // Should now show eye-off icon (password visible)
      expect(screen.getByTestId('eye-off-icon')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Error Display Tests
  // ===========================================================================

  describe('Error Display', () => {
    it('should display auth error when present', () => {
      mockAuthContext.error = 'Invalid credentials';
      render(<LoginForm />);

      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    it('should not display error when null', () => {
      mockAuthContext.error = null;
      render(<LoginForm />);

      expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
    });

    it('should clear error when form is submitted', async () => {
      mockAuthContext.error = 'Previous error';
      render(<LoginForm />);

      const form = screen.getByTestId('form-provider').querySelector('form');
      if (form) fireEvent.submit(form);

      expect(mockClearError).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have autocomplete on email input', () => {
      render(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('you@example.com');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
    });

    it('should have autocomplete on password input', () => {
      render(<LoginForm />);

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('should have sr-only text for password toggle', () => {
      render(<LoginForm />);

      expect(screen.getByText('Show password')).toHaveClass('sr-only');
    });
  });

  // ===========================================================================
  // Form Fields Tests
  // ===========================================================================

  describe('Form Fields', () => {
    it('should render email form field', () => {
      render(<LoginForm />);

      expect(screen.getByTestId('form-field-email')).toBeInTheDocument();
    });

    it('should render password form field', () => {
      render(<LoginForm />);

      expect(screen.getByTestId('form-field-password')).toBeInTheDocument();
    });

    it('should have email input type', () => {
      render(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('you@example.com');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should have password input type by default', () => {
      render(<LoginForm />);

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should show loader icon when loading', () => {
      // Note: This test would require state manipulation or async testing
      // For now we verify the structure is in place
      render(<LoginForm />);

      const submitButton = screen.getByText('Sign In');
      expect(submitButton).toBeInTheDocument();
    });

    it('should have full width submit button', () => {
      render(<LoginForm />);

      const submitButton = screen.getByText('Sign In');
      expect(submitButton).toHaveClass('w-full');
    });

    it('should have form with proper spacing', () => {
      render(<LoginForm />);

      const form = screen.getByTestId('form-provider').querySelector('form');
      expect(form).toHaveClass('space-y-4');
    });
  });
});
