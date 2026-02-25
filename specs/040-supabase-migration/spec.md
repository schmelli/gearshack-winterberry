# Feature Specification: Migration from Firebase to Supabase (Greenfield)

**Feature Branch**: `040-supabase-migration`
**Created**: 2025-12-09
**Status**: Draft
**Input**: User description: "Migration from Firebase to Supabase (Greenfield) - Replace Firebase Auth & Firestore with Supabase Auth & PostgreSQL using a fresh relational database schema."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Registration and Login (Priority: P1)

A new user visits the application and wants to create an account. They can register using their email address and password, or use a magic link for passwordless authentication. After registration, users can log in to access their personal gear inventory.

**Why this priority**: Authentication is the foundation for all other features. Without a working auth system, users cannot access the application or have personalized data.

**Independent Test**: Create a new account with email/password, log out, then log back in. Verify the user session persists across page refreshes.

**Acceptance Scenarios**:

1. **Given** a visitor on the login page, **When** they enter a valid email and password and click "Sign Up", **Then** a new account is created and they are redirected to the inventory page
2. **Given** a visitor on the login page, **When** they enter their email and request a magic link, **Then** they receive an email with a login link that signs them in when clicked
3. **Given** a registered user, **When** they enter correct credentials and click "Sign In", **Then** they are authenticated and redirected to the inventory page
4. **Given** an authenticated user, **When** they refresh the page, **Then** they remain logged in (session persists)
5. **Given** an authenticated user, **When** they click "Sign Out", **Then** they are logged out and redirected to the login page

---

### User Story 2 - Gear Item Management (Priority: P1)

An authenticated user wants to manage their outdoor gear inventory. They can create new gear items with details like name, brand, weight, category, and images. Items are stored in the database and can be viewed, edited, and deleted.

**Why this priority**: Gear inventory is the core data of the application. Users need to create and manage items immediately after authentication.

**Independent Test**: Create a gear item with all fields populated (including a Cloudinary image URL), verify it appears in the inventory list, edit it, then delete it.

**Acceptance Scenarios**:

1. **Given** an authenticated user on the inventory page, **When** they click "Add New Item" and fill in the form with name, brand, weight, and category, **Then** a new gear item is created and appears in their inventory
2. **Given** a user creating a gear item, **When** they attach a Cloudinary image URL, **Then** the image URL is saved with the item and displays correctly
3. **Given** a user viewing their inventory, **When** they click on an item, **Then** they can view all details of that item
4. **Given** a user viewing an item, **When** they click "Edit" and modify fields, **Then** the changes are saved and reflected immediately
5. **Given** a user viewing an item, **When** they click "Delete" and confirm, **Then** the item is removed from their inventory

---

### User Story 3 - Data Privacy and Security (Priority: P1)

Users expect their gear data to be private and only accessible to themselves. The system must enforce strict data isolation so users can only view, edit, or delete their own items.

**Why this priority**: Data security is non-negotiable. Row Level Security must be implemented from day one to prevent unauthorized data access.

**Independent Test**: Create two test accounts, add items to each, then verify that User A cannot see or access User B's items through any means.

**Acceptance Scenarios**:

1. **Given** User A with gear items, **When** User B queries the database, **Then** User B cannot see any of User A's items
2. **Given** User A's gear item ID, **When** User B attempts to access it directly, **Then** the request is denied with an authorization error
3. **Given** an unauthenticated request, **When** attempting to access any gear data, **Then** the request is rejected

---

### User Story 4 - Loadout Management (Priority: P2)

An authenticated user wants to organize their gear into loadouts (packing lists) for different trips or activities. They can create loadouts, add gear items to them, and see total weight calculations.

**Why this priority**: Loadouts are a secondary feature that builds on top of gear items. Users need gear items first before they can organize them into loadouts.

**Independent Test**: Create a loadout, add existing gear items to it, verify weight calculations are correct, then remove items and delete the loadout.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they create a new loadout with a name, **Then** the loadout is created and appears in their loadout list
2. **Given** a user editing a loadout, **When** they add gear items to it, **Then** the items appear in the loadout with correct weights
3. **Given** a loadout with multiple items, **When** viewing the loadout, **Then** the total weight is calculated and displayed
4. **Given** a user viewing a loadout, **When** they remove an item, **Then** the item is removed and weight recalculated

---

### Edge Cases

- What happens when a user tries to register with an email that already exists? (Show "Email already registered" error)
- What happens when a magic link expires? (Show "Link expired, please request a new one" and allow retry)
- What happens when creating a gear item with missing required fields? (Show validation errors for missing fields)
- What happens when network connection is lost during save? (Show error message, allow retry when connection restored)
- What happens when a user deletes all items from a loadout? (Loadout remains with 0 items and 0 weight)
- What happens when deleting a gear item that exists in a loadout? (Item is removed from all loadouts automatically)

## Requirements *(mandatory)*

### Functional Requirements

**Authentication**:
- **FR-001**: System MUST allow users to register with email and password
- **FR-002**: System MUST allow users to sign in with email and password
- **FR-003**: System MUST support passwordless authentication via magic link email
- **FR-004**: System MUST persist user sessions across page refreshes
- **FR-005**: System MUST allow users to sign out and clear their session
- **FR-006**: System MUST provide a user profile with basic information (email, display name)

**Gear Items**:
- **FR-007**: System MUST allow authenticated users to create gear items with name (required), brand, description, weight, dimensions, and category
- **FR-008**: System MUST support Cloudinary image URLs for primary and gallery images
- **FR-009**: System MUST allow users to view a list of their gear items
- **FR-010**: System MUST allow users to edit their gear items
- **FR-011**: System MUST allow users to delete their gear items
- **FR-012**: System MUST store weight in grams and support display in grams, ounces, or pounds

**Loadouts**:
- **FR-013**: System MUST allow users to create named loadouts
- **FR-014**: System MUST allow users to add gear items to loadouts
- **FR-015**: System MUST calculate total weight for loadouts
- **FR-016**: System MUST allow users to remove items from loadouts
- **FR-017**: System MUST allow users to delete loadouts

**Data Security**:
- **FR-018**: System MUST ensure users can only access their own gear items via PostgreSQL Row Level Security (RLS) policies
- **FR-019**: System MUST ensure users can only access their own loadouts via PostgreSQL Row Level Security (RLS) policies
- **FR-020**: System MUST reject unauthenticated requests to protected data
- **FR-021**: Client applications use Supabase anon key with RLS policies enforcing data isolation (no server-side proxy required)

**Categories**:
- **FR-022**: System MUST provide a predefined set of gear categories
- **FR-023**: System MUST allow filtering gear items by category

### Key Entities

- **Profile**: User account information including ID, email, display name, and avatar URL. Created automatically on registration.
- **Gear Item**: Individual piece of outdoor gear with full field parity (~30 fields) as defined in `data-model.md`. Fields organized in 7 sections: General Info (name, brand, description, URLs), Classification (category, subcategory, product type), Weight & Specs (weight, dimensions), Purchase Details (price, date, retailer), Media (Cloudinary URLs, nobg_images), Status & Condition (status: Own/Wishlist/Sold/Lent/Retired, condition), and Dependencies. Belongs to one user and optionally one category.
- **Category**: Classification for gear items (e.g., Shelter, Sleep System, Clothing, Electronics). System-defined, shared across all users.
- **Loadout**: Named collection of gear items representing a packing list. Belongs to one user, contains references to multiple gear items with calculated total weight.
- **Loadout Item**: Junction entity linking a loadout to a gear item, including quantity if needed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete registration and first login in under 60 seconds
- **SC-002**: Gear item creation (including image) completes in under 5 seconds
- **SC-003**: Inventory list loads within 2 seconds for users with up to 500 items
- **SC-004**: 100% of data access attempts by non-owners are blocked
- **SC-005**: User sessions persist correctly across page refreshes with 100% reliability
- **SC-006**: All existing Cloudinary image URLs continue to display correctly after migration
- **SC-007**: Magic link emails are delivered within 30 seconds of request
- **SC-008**: Weight calculations in loadouts are accurate to 0.1 grams

## Clarifications

### Session 2025-12-09

- Q: What happens to existing Firebase code during migration? → A: Complete replacement - Remove all Firebase code, Supabase is the only backend
- Q: How many gear item fields should be implemented in Supabase schema? → A: Full field parity - Replicate all 40+ fields from current gear item model
- Q: Which Supabase client package for Next.js App Router? → A: @supabase/ssr - Official SSR package with cookie-based auth
- Q: What gear item statuses should be supported? → A: Own/Wishlist/Sold/Lent/Retired - Extended lifecycle
- Q: How should client access Supabase database? → A: Direct client + RLS - Client uses anon key, RLS policies enforce security

## Assumptions

- Supabase project is already created and configured with appropriate environment variables
- Firebase code and dependencies will be completely removed (no parallel operation or fallback)
- Users will start fresh - no data migration from Firebase is required (greenfield approach)
- Cloudinary integration remains unchanged - only the URL storage location moves to Supabase
- Google OAuth will not be implemented in the initial release (email/password and magic link only)
- The existing UI components will be reused with only the data layer being replaced
- Categories will be seeded with predefined values matching the current gear ontology
- Supabase client uses @supabase/ssr package for proper Next.js App Router integration with cookie-based session management
