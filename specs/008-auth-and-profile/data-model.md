# Data Model: Identity & Access with Profile Management

**Feature**: 008-auth-and-profile
**Date**: 2025-12-05

## Entities

### AuthUser (Firebase Auth)

Source of truth for authentication state. Provided by Firebase Auth SDK.

| Field | Type | Description |
|-------|------|-------------|
| uid | string | Unique identifier from Firebase Auth |
| email | string \| null | User's email address |
| displayName | string \| null | Display name from OAuth provider |
| photoURL | string \| null | Profile photo URL from OAuth provider |
| emailVerified | boolean | Email verification status |

**Source**: `firebase/auth` - `User` type

### UserProfile (Firestore)

Extended user profile stored in Firestore at `userBase/{uid}`.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| avatarUrl | string | No | Valid URL | Custom avatar URL (overrides Auth photoURL) |
| displayName | string | Yes | 2-50 chars | User's display name |
| trailName | string | No | 2-30 chars | Hiking/trail nickname |
| bio | string | No | Max 500 chars | User biography |
| location | string | No | Max 100 chars | User's location |
| instagram | string | No | Valid URL | Instagram profile URL |
| facebook | string | No | Valid URL | Facebook profile URL |
| youtube | string | No | Valid URL | YouTube channel URL |
| website | string | No | Valid URL | Personal website URL |
| isVIP | boolean | No | - | VIP status flag (system-managed, never overwritten) |
| first_launch | Timestamp | No | - | First login timestamp (system-managed, never overwritten) |

**Firestore Path**: `userBase/{uid}`
**Relationships**: One-to-one with AuthUser via `uid`

### MergedUser (Application)

Combined view of AuthUser + UserProfile for UI consumption.

| Field | Type | Source | Priority |
|-------|------|--------|----------|
| uid | string | AuthUser | - |
| email | string \| null | AuthUser | - |
| displayName | string | UserProfile > AuthUser | Profile first |
| avatarUrl | string \| null | UserProfile.avatarUrl > AuthUser.photoURL | Profile first |
| trailName | string \| null | UserProfile | - |
| bio | string \| null | UserProfile | - |
| location | string \| null | UserProfile | - |
| instagram | string \| null | UserProfile | - |
| facebook | string \| null | UserProfile | - |
| youtube | string \| null | UserProfile | - |
| website | string \| null | UserProfile | - |
| isVIP | boolean | UserProfile | Default: false |

**Note**: MergedUser is computed client-side, not stored.

### BackgroundImage (Firebase Storage)

HD background images for the login page.

| Field | Type | Description |
|-------|------|-------------|
| url | string | Download URL from Firebase Storage |
| name | string | File name for identification |

**Storage Path**: `backgrounds/hd/`
**Expected Files**: nature1.jpg, nature2.jpg, etc.

## State Transitions

### Authentication State

```
[Unauthenticated] --signIn--> [Loading] --success--> [Authenticated]
                                        --failure--> [Unauthenticated + Error]

[Authenticated] --signOut--> [Unauthenticated]

[Authenticated] --sessionExpired--> [Unauthenticated]
```

### Profile State

```
[No Profile] --firstSignIn--> [Create Default] --> [Profile Loaded]

[Profile Loaded] --edit--> [Editing]

[Editing] --save--> [Saving] --success--> [Profile Loaded]
                            --failure--> [Editing + Error]

[Editing] --cancel--> [Profile Loaded]
```

## Validation Rules

### Profile Edit Form (Zod Schema)

```typescript
const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be at most 50 characters'),
  trailName: z
    .string()
    .min(2, 'Trail name must be at least 2 characters')
    .max(30, 'Trail name must be at most 30 characters')
    .optional()
    .or(z.literal('')),
  bio: z
    .string()
    .max(500, 'Bio must be at most 500 characters')
    .optional(),
  location: z
    .string()
    .max(100, 'Location must be at most 100 characters')
    .optional(),
  avatarUrl: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  instagram: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  facebook: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  youtube: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  website: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
});
```

### Email/Password Registration

```typescript
const registrationSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
```

### Login Form

```typescript
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
```

## Data Flow

### Sign In Flow

1. User initiates sign-in (Google OAuth or Email/Password)
2. Firebase Auth authenticates user, returns `User` object
3. `onAuthStateChanged` fires with authenticated user
4. `useAuth` hook updates context with user
5. `useProfile` hook fetches `userBase/{uid}` from Firestore
6. If document doesn't exist, create with defaults from Auth data
7. Merge Auth + Profile into `MergedUser`
8. Redirect to originally requested page or /inventory

### Profile Update Flow

1. User opens Profile modal from UserMenu
2. `ProfileModal` renders `ProfileView` (read-only mode)
3. User clicks "Edit" - modal switches to `ProfileEditForm`
4. User modifies fields, validation runs on blur/submit
5. User clicks "Save"
6. `useProfile.updateProfile()` called with form data
7. Firestore update preserves `isVIP` and `first_launch`
8. Toast notification shows success/error
9. Modal closes, UI reflects updated data

### Route Protection Flow

1. User navigates to protected route (/inventory, /loadouts, /settings)
2. `ProtectedRoute` wrapper checks auth state
3. If loading: show skeleton
4. If unauthenticated: redirect to /login with return URL
5. If authenticated: render children
6. After successful login: redirect back to original URL
