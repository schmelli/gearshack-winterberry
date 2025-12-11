/**
 * Supabase API Patterns for Gearshack Winterberry
 *
 * Feature: 040-supabase-migration
 * Date: 2025-12-10
 *
 * This file documents the expected API patterns for Supabase operations.
 * These are NOT runnable code - they serve as contracts for implementation.
 */

import type { Database } from '@/types/database';

// Type aliases for convenience
type GearItem = Database['public']['Tables']['gear_items']['Row'];
type GearItemInsert = Database['public']['Tables']['gear_items']['Insert'];
type GearItemUpdate = Database['public']['Tables']['gear_items']['Update'];
type Loadout = Database['public']['Tables']['loadouts']['Row'];
type LoadoutItem = Database['public']['Tables']['loadout_items']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

// =============================================================================
// AUTHENTICATION CONTRACTS
// =============================================================================

/**
 * Sign up with email and password
 * FR-001: System MUST allow users to register with email and password
 */
interface SignUpContract {
  input: {
    email: string;
    password: string;
    options?: {
      data?: {
        display_name?: string;
      };
    };
  };
  output: {
    user: { id: string; email: string } | null;
    session: { access_token: string } | null;
    error: { message: string } | null;
  };
}

/**
 * Sign in with email and password
 * FR-002: System MUST allow users to sign in with email and password
 */
interface SignInContract {
  input: {
    email: string;
    password: string;
  };
  output: {
    user: { id: string; email: string } | null;
    session: { access_token: string } | null;
    error: { message: string } | null;
  };
}

/**
 * Sign in with magic link
 * FR-003: System MUST support passwordless authentication via magic link email
 */
interface MagicLinkContract {
  input: {
    email: string;
    options: {
      emailRedirectTo: string; // e.g., `${origin}/auth/callback`
    };
  };
  output: {
    error: { message: string } | null;
  };
}

/**
 * Sign out
 * FR-005: System MUST allow users to sign out and clear their session
 */
interface SignOutContract {
  input: void;
  output: {
    error: { message: string } | null;
  };
}

// =============================================================================
// GEAR ITEMS CONTRACTS
// =============================================================================

/**
 * List user's gear items
 * FR-009: System MUST allow users to view a list of their gear items
 */
interface ListGearItemsContract {
  query: `
    SELECT * FROM gear_items
    WHERE user_id = auth.uid()
    ORDER BY created_at DESC
  `;
  output: GearItem[];
}

/**
 * Get single gear item
 */
interface GetGearItemContract {
  query: `
    SELECT * FROM gear_items
    WHERE id = $id AND user_id = auth.uid()
  `;
  params: { id: string };
  output: GearItem | null;
}

/**
 * Create gear item
 * FR-007: System MUST allow authenticated users to create gear items
 */
interface CreateGearItemContract {
  query: `
    INSERT INTO gear_items (user_id, name, brand, ...)
    VALUES (auth.uid(), $name, $brand, ...)
    RETURNING *
  `;
  input: GearItemInsert;
  output: GearItem;
}

/**
 * Update gear item
 * FR-010: System MUST allow users to edit their gear items
 */
interface UpdateGearItemContract {
  query: `
    UPDATE gear_items
    SET name = $name, brand = $brand, ..., updated_at = NOW()
    WHERE id = $id AND user_id = auth.uid()
    RETURNING *
  `;
  input: { id: string } & GearItemUpdate;
  output: GearItem;
}

/**
 * Delete gear item
 * FR-011: System MUST allow users to delete their gear items
 * Note: CASCADE removes item from all loadouts
 */
interface DeleteGearItemContract {
  query: `
    DELETE FROM gear_items
    WHERE id = $id AND user_id = auth.uid()
  `;
  input: { id: string };
  output: void;
}

/**
 * Filter gear items by category
 * FR-023: System MUST allow filtering gear items by category
 */
interface FilterGearByCategoryContract {
  query: `
    SELECT * FROM gear_items
    WHERE user_id = auth.uid()
    AND category_id = $categoryId
    ORDER BY created_at DESC
  `;
  params: { categoryId: string };
  output: GearItem[];
}

// =============================================================================
// LOADOUTS CONTRACTS
// =============================================================================

/**
 * List user's loadouts
 */
interface ListLoadoutsContract {
  query: `
    SELECT * FROM loadouts
    WHERE user_id = auth.uid()
    ORDER BY created_at DESC
  `;
  output: Loadout[];
}

/**
 * Get loadout with items
 */
interface GetLoadoutWithItemsContract {
  query: `
    SELECT
      loadouts.*,
      loadout_items.id as item_id,
      loadout_items.gear_item_id,
      loadout_items.quantity,
      loadout_items.is_worn,
      loadout_items.is_consumable
    FROM loadouts
    LEFT JOIN loadout_items ON loadouts.id = loadout_items.loadout_id
    WHERE loadouts.id = $id AND loadouts.user_id = auth.uid()
  `;
  params: { id: string };
  output: Loadout & { items: LoadoutItem[] };
}

/**
 * Create loadout
 * FR-013: System MUST allow users to create named loadouts
 */
interface CreateLoadoutContract {
  query: `
    INSERT INTO loadouts (user_id, name, description, trip_date)
    VALUES (auth.uid(), $name, $description, $tripDate)
    RETURNING *
  `;
  input: {
    name: string;
    description?: string;
    trip_date?: string;
  };
  output: Loadout;
}

/**
 * Add item to loadout
 * FR-014: System MUST allow users to add gear items to loadouts
 */
interface AddItemToLoadoutContract {
  query: `
    INSERT INTO loadout_items (loadout_id, gear_item_id, quantity, is_worn, is_consumable)
    VALUES ($loadoutId, $gearItemId, $quantity, $isWorn, $isConsumable)
    RETURNING *
  `;
  input: {
    loadout_id: string;
    gear_item_id: string;
    quantity?: number;
    is_worn?: boolean;
    is_consumable?: boolean;
  };
  output: LoadoutItem;
}

/**
 * Remove item from loadout
 * FR-016: System MUST allow users to remove items from loadouts
 */
interface RemoveItemFromLoadoutContract {
  query: `
    DELETE FROM loadout_items
    WHERE loadout_id = $loadoutId AND gear_item_id = $gearItemId
  `;
  input: {
    loadout_id: string;
    gear_item_id: string;
  };
  output: void;
}

/**
 * Delete loadout
 * FR-017: System MUST allow users to delete loadouts
 */
interface DeleteLoadoutContract {
  query: `
    DELETE FROM loadouts
    WHERE id = $id AND user_id = auth.uid()
  `;
  input: { id: string };
  output: void;
}

// =============================================================================
// CATEGORIES CONTRACTS
// =============================================================================

/**
 * List all categories
 * FR-022: System MUST provide a predefined set of gear categories
 */
interface ListCategoriesContract {
  query: `
    SELECT * FROM categories
    ORDER BY level, label
  `;
  output: Category[];
}

// =============================================================================
// PROFILE CONTRACTS
// =============================================================================

/**
 * Get current user's profile
 * FR-006: System MUST provide a user profile with basic information
 */
interface GetProfileContract {
  query: `
    SELECT * FROM profiles
    WHERE id = auth.uid()
  `;
  output: Profile | null;
}

/**
 * Update profile
 */
interface UpdateProfileContract {
  query: `
    UPDATE profiles
    SET display_name = $displayName, avatar_url = $avatarUrl, updated_at = NOW()
    WHERE id = auth.uid()
    RETURNING *
  `;
  input: {
    display_name?: string;
    avatar_url?: string;
  };
  output: Profile;
}

// =============================================================================
// SUPABASE CLIENT USAGE PATTERNS
// =============================================================================

/**
 * Example: Fetch gear items in a hook
 *
 * ```typescript
 * const supabase = createClient();
 *
 * const { data, error } = await supabase
 *   .from('gear_items')
 *   .select('*')
 *   .order('created_at', { ascending: false });
 *
 * // RLS automatically filters to current user's items
 * ```
 */

/**
 * Example: Insert gear item
 *
 * ```typescript
 * const { data, error } = await supabase
 *   .from('gear_items')
 *   .insert({
 *     user_id: user.id, // Must match auth.uid() or RLS rejects
 *     name: 'Tent',
 *     brand: 'Big Agnes',
 *     weight_grams: 1200,
 *   })
 *   .select()
 *   .single();
 * ```
 */

/**
 * Example: Update gear item
 *
 * ```typescript
 * const { data, error } = await supabase
 *   .from('gear_items')
 *   .update({ name: 'Updated Tent Name' })
 *   .eq('id', itemId)
 *   .select()
 *   .single();
 *
 * // RLS ensures user can only update their own items
 * ```
 */

/**
 * Example: Delete gear item
 *
 * ```typescript
 * const { error } = await supabase
 *   .from('gear_items')
 *   .delete()
 *   .eq('id', itemId);
 *
 * // CASCADE automatically removes from all loadouts
 * ```
 */

export type {
  SignUpContract,
  SignInContract,
  MagicLinkContract,
  SignOutContract,
  ListGearItemsContract,
  GetGearItemContract,
  CreateGearItemContract,
  UpdateGearItemContract,
  DeleteGearItemContract,
  FilterGearByCategoryContract,
  ListLoadoutsContract,
  GetLoadoutWithItemsContract,
  CreateLoadoutContract,
  AddItemToLoadoutContract,
  RemoveItemFromLoadoutContract,
  DeleteLoadoutContract,
  ListCategoriesContract,
  GetProfileContract,
  UpdateProfileContract,
};
