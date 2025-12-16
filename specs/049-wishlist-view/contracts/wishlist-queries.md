# Wishlist Queries Contract

**Feature**: 049-wishlist-view
**File**: `lib/supabase/wishlist-queries.ts`
**Date**: 2025-12-16

## Overview

This contract defines all Supabase query functions for wishlist CRUD operations. All functions follow the existing pattern established in `lib/supabase/` directory and use the Supabase client for database operations.

## Functions

### 1. fetchWishlistItems

**Purpose**: Retrieve all wishlist items for the authenticated user

**Signature**:
```typescript
export async function fetchWishlistItems(): Promise<WishlistItem[]>
```

**Query**:
```typescript
const { data, error } = await supabase
  .from('gear_items')
  .select(`
    *,
    category:categories!category_id(id, label),
    subcategory:categories!subcategory_id(id, label),
    product_type:categories!product_type_id(id, label)
  `)
  .eq('user_id', userId)
  .eq('status', 'wishlist')
  .order('created_at', { ascending: false });
```

**Returns**:
- `WishlistItem[]` - Array of wishlist items with category labels
- Throws error if query fails

**Error Handling**:
- Validates user is authenticated
- Returns empty array if no items found
- Throws descriptive error on database failure

---

### 2. addWishlistItem

**Purpose**: Create a new wishlist item

**Signature**:
```typescript
export async function addWishlistItem(
  item: Omit<WishlistItem, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'status'>
): Promise<WishlistItem>
```

**Validation**:
- Validate with `addToWishlistSchema` from `lib/validations/wishlist.ts`
- Check duplicate via `checkWishlistDuplicate()` before insert
- Enforce status='wishlist'

**Query**:
```typescript
const { data, error } = await supabase
  .from('gear_items')
  .insert({
    ...item,
    user_id: userId,
    status: 'wishlist',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  .select()
  .single();
```

**Returns**:
- `WishlistItem` - Newly created wishlist item
- Throws error if duplicate detected or insert fails

**Error Handling**:
- Throws DuplicateError if brand+model already exists
- Throws ValidationError if schema validation fails
- Throws DatabaseError on insert failure

---

### 3. updateWishlistItem

**Purpose**: Update an existing wishlist item

**Signature**:
```typescript
export async function updateWishlistItem(
  itemId: string,
  updates: Partial<Omit<WishlistItem, 'id' | 'createdAt' | 'userId' | 'status'>>
): Promise<WishlistItem>
```

**Validation**:
- Validate itemId is UUID
- Validate user owns the item (RLS handles this)
- Cannot change status via this function (use moveToInventory)

**Query**:
```typescript
const { data, error } = await supabase
  .from('gear_items')
  .update({
    ...updates,
    updated_at: new Date().toISOString(),
  })
  .eq('id', itemId)
  .eq('user_id', userId)
  .eq('status', 'wishlist')
  .select()
  .single();
```

**Returns**:
- `WishlistItem` - Updated wishlist item
- Throws error if not found or update fails

---

### 4. deleteWishlistItem

**Purpose**: Delete a wishlist item

**Signature**:
```typescript
export async function deleteWishlistItem(itemId: string): Promise<void>
```

**Query**:
```typescript
const { error } = await supabase
  .from('gear_items')
  .delete()
  .eq('id', itemId)
  .eq('user_id', userId)
  .eq('status', 'wishlist');
```

**Returns**:
- `void` - No return value on success
- Throws error if not found or delete fails

---

### 5. moveWishlistItemToInventory

**Purpose**: Transfer wishlist item to inventory (change status from 'wishlist' to 'own')

**Signature**:
```typescript
export async function moveWishlistItemToInventory(itemId: string): Promise<GearItem>
```

**Query**:
```typescript
const { data, error } = await supabase
  .from('gear_items')
  .update({
    status: 'own',
    updated_at: new Date().toISOString(),
  })
  .eq('id', itemId)
  .eq('user_id', userId)
  .eq('status', 'wishlist')
  .select()
  .single();
```

**Returns**:
- `GearItem` - Item with status='own' (now in inventory)
- Throws error if not found or update fails

**Side Effects**:
- Item removed from wishlist queries
- Item appears in inventory queries
- All data preserved (images, notes, etc.)

---

### 6. checkWishlistDuplicate

**Purpose**: Check if wishlist item with same brand+model already exists

**Signature**:
```typescript
export async function checkWishlistDuplicate(
  brand: string | null,
  modelNumber: string | null
): Promise<WishlistItem | null>
```

**Logic**:
```typescript
// Normalize inputs
const normalizedBrand = brand?.toLowerCase().trim() || '';
const normalizedModel = modelNumber?.toLowerCase().trim() || '';

const { data, error } = await supabase
  .from('gear_items')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'wishlist')
  .ilike('brand', normalizedBrand)
  .ilike('model_number', normalizedModel)
  .maybeSingle();
```

**Returns**:
- `WishlistItem` - Existing duplicate item if found
- `null` - No duplicate exists
- Throws error on query failure

**Match Criteria**:
- Case-insensitive brand match
- Case-insensitive model_number match
- Both must match for duplicate detection

---

## Error Types

```typescript
export class WishlistError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'WishlistError';
  }
}

export class DuplicateError extends WishlistError {
  constructor(existingItem: WishlistItem) {
    super(
      `Item "${existingItem.brand} ${existingItem.modelNumber}" already in wishlist`,
      'DUPLICATE_ITEM'
    );
  }
}

export class NotFoundError extends WishlistError {
  constructor(itemId: string) {
    super(`Wishlist item ${itemId} not found`, 'NOT_FOUND');
  }
}

export class ValidationError extends WishlistError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}
```

## Usage Examples

### Fetch Wishlist
```typescript
import { fetchWishlistItems } from '@/lib/supabase/wishlist-queries';

const wishlistItems = await fetchWishlistItems();
console.log(`Found ${wishlistItems.length} wishlist items`);
```

### Add to Wishlist
```typescript
import { addWishlistItem } from '@/lib/supabase/wishlist-queries';

try {
  const newItem = await addWishlistItem({
    name: 'Osprey Atmos AG 65',
    brand: 'Osprey',
    modelNumber: 'Atmos AG 65',
    categoryId: 'abc-123',
    weightGrams: 2100,
    // ... other fields
  });
  toast.success('Added to wishlist!');
} catch (error) {
  if (error instanceof DuplicateError) {
    toast.warning('This item is already in your wishlist');
  } else {
    toast.error('Failed to add to wishlist');
  }
}
```

### Check Duplicate Before Add
```typescript
import { checkWishlistDuplicate } from '@/lib/supabase/wishlist-queries';

const duplicate = await checkWishlistDuplicate('Osprey', 'Atmos AG 65');
if (duplicate) {
  console.warn('Duplicate found:', duplicate.name);
  // Show warning to user
} else {
  // Proceed with add
}
```

### Move to Inventory
```typescript
import { moveWishlistItemToInventory } from '@/lib/supabase/wishlist-queries';

try {
  const movedItem = await moveWishlistItemToInventory(itemId);
  toast.success(`${movedItem.name} moved to inventory!`);
  router.push('/inventory'); // Navigate to inventory view
} catch (error) {
  toast.error('Failed to move item');
}
```

## Performance Considerations

1. **Indexing**: All queries benefit from existing indexes:
   - `idx_gear_items_user` on user_id
   - `idx_gear_items_status` on status
   - `idx_gear_items_created` on created_at DESC

2. **Category Joins**: Use same pattern as inventory queries for consistency

3. **Duplicate Checks**: Case-insensitive ILIKE can be slow for large datasets, but acceptable for per-user queries

4. **Batch Operations**: Not implemented in initial version (add if needed)

## Testing Checklist

- [ ] fetchWishlistItems returns empty array for new user
- [ ] fetchWishlistItems returns only wishlist items (not inventory)
- [ ] fetchWishlistItems includes category labels
- [ ] addWishlistItem creates item with status='wishlist'
- [ ] addWishlistItem throws DuplicateError for matching brand+model
- [ ] updateWishlistItem updates fields correctly
- [ ] updateWishlistItem cannot change status
- [ ] deleteWishlistItem removes item permanently
- [ ] moveWishlistItemToInventory changes status to 'own'
- [ ] moveWishlistItemToInventory preserves all item data
- [ ] checkWishlistDuplicate is case-insensitive
- [ ] checkWishlistDuplicate handles null brand/model
- [ ] All queries respect RLS policies (user can only access own items)
