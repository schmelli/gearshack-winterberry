/**
 * GearEditorForm Component Tests
 *
 * Tests for the GearEditorForm component used for creating and editing gear items.
 * Tests form rendering, tab navigation, user interactions, and form submission.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GearEditorForm } from '@/components/gear-editor/GearEditorForm';
import type { GearItem, GearItemFormData } from '@/types/gear';
import type { UseGearEditorReturn } from '@/hooks/useGearEditor';
import { type UseFormReturn } from 'react-hook-form';

// =============================================================================
// Mocks
// =============================================================================

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      GearEditor: {
        editTitle: 'Edit Gear Item',
        addTitle: 'Add Gear Item',
        'tabs.general': 'General',
        'tabs.details': 'Details',
        'tabs.media': 'Media',
        'tabs.status': 'Status',
        deleteItem: 'Delete item',
        deleteItemTitle: 'Delete Item?',
        deleteItemDescription: 'This action cannot be undone.',
        unsavedChanges: 'Unsaved changes',
        saving: 'Saving...',
        saveChanges: 'Save Changes',
        addItem: 'Add Item',
      },
      Common: {
        cancel: 'Cancel',
        delete: 'Delete',
      },
    };
    return translations[namespace]?.[key] ?? key;
  },
}));

// Mock useItems hook
const mockItems: GearItem[] = [];
vi.mock('@/hooks/useSupabaseStore', () => ({
  useItems: () => mockItems,
}));

// Create mock form object
const createMockForm = (overrides: Partial<UseFormReturn<GearItemFormData>> = {}) => {
  const mockForm = {
    register: vi.fn((name: string) => ({
      name,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      ref: vi.fn(),
    })),
    handleSubmit: vi.fn((fn) => (e?: React.BaseSyntheticEvent) => {
      e?.preventDefault();
      return fn({} as GearItemFormData);
    }),
    watch: vi.fn(),
    setValue: vi.fn(),
    getValues: vi.fn(() => ({
      name: '',
      brand: '',
      description: '',
      brandUrl: '',
      modelNumber: '',
      productUrl: '',
      productTypeId: '',
      weightValue: '',
      weightDisplayUnit: 'g',
      lengthCm: '',
      widthCm: '',
      heightCm: '',
      size: '',
      color: '',
      volumeLiters: '',
      materials: '',
      tentConstruction: '',
      pricePaid: '',
      currency: 'USD',
      purchaseDate: '',
      retailer: '',
      retailerUrl: '',
      primaryImageUrl: '',
      galleryImageUrls: [],
      condition: 'new',
      status: 'own',
      notes: '',
      quantity: '1',
      isFavourite: false,
      isForSale: false,
      canBeBorrowed: false,
      canBeTraded: false,
      dependencyIds: [],
    })),
    formState: {
      errors: {},
      isDirty: false,
      isSubmitting: false,
      isValid: true,
      dirtyFields: {},
      touchedFields: {},
    },
    reset: vi.fn(),
    control: {} as UseFormReturn<GearItemFormData>['control'],
    trigger: vi.fn(() => Promise.resolve(true)),
    ...overrides,
  } as unknown as UseFormReturn<GearItemFormData>;
  return mockForm;
};

// Create mock useGearEditor return value
const createMockGearEditorReturn = (
  overrides: Partial<UseGearEditorReturn> = {}
): UseGearEditorReturn => ({
  form: createMockForm(),
  isEditing: false,
  isDirty: false,
  isSubmitting: false,
  isUploading: false,
  isDeleting: false,
  handleSubmit: vi.fn((e?: React.BaseSyntheticEvent) => {
    e?.preventDefault();
    return Promise.resolve();
  }),
  handleCancel: vi.fn(),
  resetForm: vi.fn(),
  handleDelete: vi.fn(() => Promise.resolve()),
  duplicateDetection: {
    isOpen: false,
    bestMatch: null,
    isIncreasingQuantity: false,
    onConfirmSave: vi.fn(),
    onCancel: vi.fn(),
    onIncreaseQuantity: vi.fn(),
  },
  ...overrides,
});

// Store the mock return value for manipulation in tests
let mockGearEditorReturn: UseGearEditorReturn;

vi.mock('@/hooks/useGearEditor', () => ({
  useGearEditor: () => mockGearEditorReturn,
}));

// Mock UI components
vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="form-provider">{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    type,
    variant,
    disabled,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    type?: string;
    variant?: string;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button
      type={type as 'button' | 'submit' | 'reset' | undefined}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="card-title">{children}</h2>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-footer" className={className}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({
    children,
    defaultValue,
  }: {
    children: React.ReactNode;
    defaultValue: string;
  }) => (
    <div data-testid="tabs" data-default-value={defaultValue}>
      {children}
    </div>
  ),
  TabsList: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="tabs-list" role="tablist" className={className}>
      {children}
    </div>
  ),
  TabsTrigger: ({
    children,
    value,
    className,
  }: {
    children: React.ReactNode;
    value: string;
    className?: string;
  }) => (
    <button data-testid={`tab-${value}`} role="tab" className={className}>
      {children}
    </button>
  ),
  TabsContent: ({
    children,
    value,
    className,
  }: {
    children: React.ReactNode;
    value: string;
    className?: string;
  }) => (
    <div data-testid={`tab-content-${value}`} role="tabpanel" className={className}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AlertDialogTrigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => {
    if (asChild) return children;
    return <>{children}</>;
  },
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="alert-dialog-title">{children}</h3>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="alert-dialog-description">{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="alert-dialog-cancel">{children}</button>
  ),
  AlertDialogAction: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button data-testid="alert-dialog-action" onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

// Mock form sections
vi.mock('@/components/gear-editor/sections/GeneralInfoSection', () => ({
  GeneralInfoSection: () => <div data-testid="general-info-section">General Info Section</div>,
}));

vi.mock('@/components/gear-editor/sections/CategorySpecsSection', () => ({
  CategorySpecsSection: () => (
    <div data-testid="category-specs-section">Category Specs Section</div>
  ),
}));

vi.mock('@/components/gear-editor/sections/PurchaseSection', () => ({
  PurchaseSection: () => <div data-testid="purchase-section">Purchase Section</div>,
}));

vi.mock('@/components/gear-editor/sections/MediaSection', () => ({
  MediaSection: () => <div data-testid="media-section">Media Section</div>,
}));

vi.mock('@/components/gear-editor/sections/StatusSection', () => ({
  StatusSection: () => <div data-testid="status-section">Status Section</div>,
}));

vi.mock('@/components/gear-editor/DuplicateWarningDialog', () => ({
  DuplicateWarningDialog: ({
    isOpen,
  }: {
    isOpen: boolean;
  }) => (isOpen ? <div data-testid="duplicate-warning-dialog">Duplicate Warning</div> : null),
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockGearItem = (overrides: Partial<GearItem> = {}): GearItem => ({
  id: 'gear-001',
  name: 'Big Agnes Copper Spur HV UL2',
  brand: 'Big Agnes',
  brandUrl: 'https://bigagnes.com',
  modelNumber: 'Copper Spur HV UL2',
  description: 'Ultralight 2-person backpacking tent',
  productUrl: null,
  productTypeId: 'shelter-tent',
  weightGrams: 1020,
  weightDisplayUnit: 'g',
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  size: null,
  color: 'Olive Green',
  volumeLiters: null,
  materials: 'Solution-dyed ripstop nylon',
  tentConstruction: 'Semi-freestanding',
  pricePaid: 449.95,
  currency: 'USD',
  purchaseDate: new Date('2023-06-15'),
  retailer: 'REI',
  retailerUrl: 'https://rei.com',
  primaryImageUrl: 'https://res.cloudinary.com/test/tent.jpg',
  galleryImageUrls: [],
  condition: 'new',
  status: 'own',
  notes: 'Great for PCT thru-hike',
  quantity: 1,
  isFavourite: false,
  isForSale: false,
  canBeBorrowed: false,
  canBeTraded: false,
  dependencyIds: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('GearEditorForm', () => {
  beforeEach(() => {
    mockGearEditorReturn = createMockGearEditorReturn();
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the form card', () => {
      render(<GearEditorForm />);

      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('should display "Add Gear Item" title for new items', () => {
      render(<GearEditorForm />);

      expect(screen.getByTestId('card-title')).toHaveTextContent('Add Gear Item');
    });

    it('should display "Edit Gear Item" title when editing existing item', () => {
      mockGearEditorReturn = createMockGearEditorReturn({ isEditing: true });
      render(<GearEditorForm initialItem={createMockGearItem()} />);

      expect(screen.getByTestId('card-title')).toHaveTextContent('Edit Gear Item');
    });

    it('should display custom title when provided', () => {
      render(<GearEditorForm title="Custom Title" />);

      expect(screen.getByTestId('card-title')).toHaveTextContent('Custom Title');
    });
  });

  // ===========================================================================
  // Tab Navigation Tests
  // ===========================================================================

  describe('Tab Navigation', () => {
    it('should render all four tabs', () => {
      render(<GearEditorForm />);

      expect(screen.getByTestId('tab-general')).toBeInTheDocument();
      expect(screen.getByTestId('tab-details')).toBeInTheDocument();
      expect(screen.getByTestId('tab-media')).toBeInTheDocument();
      expect(screen.getByTestId('tab-status')).toBeInTheDocument();
    });

    it('should display correct tab labels', () => {
      render(<GearEditorForm />);

      expect(screen.getByTestId('tab-general')).toHaveTextContent('General');
      expect(screen.getByTestId('tab-details')).toHaveTextContent('Details');
      expect(screen.getByTestId('tab-media')).toHaveTextContent('Media');
      expect(screen.getByTestId('tab-status')).toHaveTextContent('Status');
    });

    it('should default to general tab', () => {
      render(<GearEditorForm />);

      const tabs = screen.getByTestId('tabs');
      expect(tabs).toHaveAttribute('data-default-value', 'general');
    });

    it('should render GeneralInfoSection in general tab', () => {
      render(<GearEditorForm />);

      expect(screen.getByTestId('general-info-section')).toBeInTheDocument();
    });

    it('should render CategorySpecsSection and PurchaseSection in details tab', () => {
      render(<GearEditorForm />);

      expect(screen.getByTestId('category-specs-section')).toBeInTheDocument();
      expect(screen.getByTestId('purchase-section')).toBeInTheDocument();
    });

    it('should render MediaSection in media tab', () => {
      render(<GearEditorForm />);

      expect(screen.getByTestId('media-section')).toBeInTheDocument();
    });

    it('should render StatusSection in status tab', () => {
      render(<GearEditorForm />);

      expect(screen.getByTestId('status-section')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Form Actions Tests
  // ===========================================================================

  describe('Form Actions', () => {
    it('should render cancel button', () => {
      render(<GearEditorForm />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should call handleCancel when cancel button is clicked', async () => {
      const handleCancel = vi.fn();
      mockGearEditorReturn = createMockGearEditorReturn({ handleCancel });
      render(<GearEditorForm />);

      const cancelButton = screen.getByText('Cancel');
      await userEvent.click(cancelButton);

      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('should render submit button with "Add Item" text for new items', () => {
      render(<GearEditorForm />);

      expect(screen.getByText('Add Item')).toBeInTheDocument();
    });

    it('should render submit button with "Save Changes" text when editing', () => {
      mockGearEditorReturn = createMockGearEditorReturn({ isEditing: true });
      render(<GearEditorForm initialItem={createMockGearItem()} />);

      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('should show "Saving..." when form is submitting', () => {
      mockGearEditorReturn = createMockGearEditorReturn({ isSubmitting: true });
      render(<GearEditorForm />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('should disable submit button when submitting', () => {
      mockGearEditorReturn = createMockGearEditorReturn({ isSubmitting: true });
      render(<GearEditorForm />);

      const submitButton = screen.getByText('Saving...');
      expect(submitButton).toBeDisabled();
    });
  });

  // ===========================================================================
  // Delete Functionality Tests
  // ===========================================================================

  describe('Delete Functionality', () => {
    it('should not show delete button for new items', () => {
      render(<GearEditorForm />);

      expect(screen.queryByLabelText(/delete/i)).not.toBeInTheDocument();
    });

    it('should show delete button when editing existing item', () => {
      mockGearEditorReturn = createMockGearEditorReturn({ isEditing: true });
      render(<GearEditorForm initialItem={createMockGearItem()} />);

      // The delete button has sr-only text "Delete item"
      expect(screen.getByText('Delete item')).toBeInTheDocument();
    });

    it('should render delete confirmation dialog', () => {
      mockGearEditorReturn = createMockGearEditorReturn({ isEditing: true });
      render(<GearEditorForm initialItem={createMockGearItem()} />);

      expect(screen.getByTestId('alert-dialog-title')).toHaveTextContent('Delete Item?');
      expect(screen.getByTestId('alert-dialog-description')).toHaveTextContent(
        'This action cannot be undone.'
      );
    });

    it('should call handleDelete when delete is confirmed', async () => {
      const handleDelete = vi.fn(() => Promise.resolve());
      mockGearEditorReturn = createMockGearEditorReturn({
        isEditing: true,
        handleDelete,
      });
      render(<GearEditorForm initialItem={createMockGearItem()} />);

      const deleteConfirmButton = screen.getByTestId('alert-dialog-action');
      await userEvent.click(deleteConfirmButton);

      expect(handleDelete).toHaveBeenCalledTimes(1);
    });

    it('should disable delete button when submitting', () => {
      mockGearEditorReturn = createMockGearEditorReturn({
        isEditing: true,
        isSubmitting: true,
      });
      render(<GearEditorForm initialItem={createMockGearItem()} />);

      // Find the delete button (it's a ghost variant with icon)
      const deleteButton = screen.getByText('Delete item').closest('button');
      expect(deleteButton).toBeDisabled();
    });

    it('should disable delete button when deleting', () => {
      mockGearEditorReturn = createMockGearEditorReturn({
        isEditing: true,
        isDeleting: true,
      });
      render(<GearEditorForm initialItem={createMockGearItem()} />);

      const deleteButton = screen.getByText('Delete item').closest('button');
      expect(deleteButton).toBeDisabled();
    });
  });

  // ===========================================================================
  // Unsaved Changes Tests
  // ===========================================================================

  describe('Unsaved Changes', () => {
    it('should not show unsaved changes indicator when form is clean', () => {
      render(<GearEditorForm />);

      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
    });

    it('should show unsaved changes indicator when form is dirty', () => {
      mockGearEditorReturn = createMockGearEditorReturn({ isDirty: true });
      render(<GearEditorForm />);

      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Duplicate Detection Tests
  // ===========================================================================

  describe('Duplicate Detection', () => {
    it('should not show duplicate warning dialog by default', () => {
      render(<GearEditorForm />);

      expect(screen.queryByTestId('duplicate-warning-dialog')).not.toBeInTheDocument();
    });

    it('should show duplicate warning dialog when isOpen is true', () => {
      mockGearEditorReturn = createMockGearEditorReturn({
        duplicateDetection: {
          isOpen: true,
          bestMatch: createMockGearItem(),
          isIncreasingQuantity: false,
          onConfirmSave: vi.fn(),
          onCancel: vi.fn(),
          onIncreaseQuantity: vi.fn(),
        },
      });
      render(<GearEditorForm />);

      expect(screen.getByTestId('duplicate-warning-dialog')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Mode Tests
  // ===========================================================================

  describe('Mode Variants', () => {
    it('should support inventory mode by default', () => {
      render(<GearEditorForm />);

      // Component should render without errors
      expect(screen.getByTestId('form-provider')).toBeInTheDocument();
    });

    it('should support wishlist mode', () => {
      render(<GearEditorForm mode="wishlist" />);

      // Component should render without errors
      expect(screen.getByTestId('form-provider')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Form Submission Tests
  // ===========================================================================

  describe('Form Submission', () => {
    it('should call handleSubmit on form submission', async () => {
      const handleSubmit = vi.fn((e?: React.BaseSyntheticEvent) => {
        e?.preventDefault();
        return Promise.resolve();
      });
      mockGearEditorReturn = createMockGearEditorReturn({ handleSubmit });
      render(<GearEditorForm />);

      const form = screen.getByTestId('form-provider').querySelector('form');
      if (form) {
        fireEvent.submit(form);
      }

      expect(handleSubmit).toHaveBeenCalled();
    });

    it('should render submit button as submit type', () => {
      render(<GearEditorForm />);

      const submitButton = screen.getByText('Add Item');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible tab list', () => {
      render(<GearEditorForm />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('should have accessible tab buttons', () => {
      render(<GearEditorForm />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(4);
    });

    it('should have accessible tab panels', () => {
      render(<GearEditorForm />);

      const tabPanels = screen.getAllByRole('tabpanel');
      expect(tabPanels.length).toBeGreaterThan(0);
    });

    it('should have screen reader text for delete button', () => {
      mockGearEditorReturn = createMockGearEditorReturn({ isEditing: true });
      render(<GearEditorForm initialItem={createMockGearItem()} />);

      expect(screen.getByText('Delete item')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle undefined initialItem gracefully', () => {
      render(<GearEditorForm initialItem={undefined} />);

      expect(screen.getByTestId('form-provider')).toBeInTheDocument();
    });

    it('should handle null callbacks gracefully', () => {
      render(
        <GearEditorForm
          onSaveSuccess={undefined}
          onSaveError={undefined}
        />
      );

      expect(screen.getByTestId('form-provider')).toBeInTheDocument();
    });

    it('should use default redirectPath when not provided', () => {
      render(<GearEditorForm />);

      // Component should render without errors
      expect(screen.getByTestId('form-provider')).toBeInTheDocument();
    });

    it('should accept custom redirectPath', () => {
      render(<GearEditorForm redirectPath="/wishlist" />);

      // Component should render without errors
      expect(screen.getByTestId('form-provider')).toBeInTheDocument();
    });
  });
});
