# Quickstart: Identity & Access with Profile Management

**Feature**: 008-auth-and-profile
**Date**: 2025-12-05

## Prerequisites

1. Node.js 18+ and npm
2. Access to Firebase project 'gearshack-springbreak'
3. Firebase Console access for OAuth configuration

## Setup Steps

### 1. Install Dependencies

```bash
npm install firebase
```

### 2. Configure Environment Variables

Create or update `.env.local` with Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=gearshack-springbreak.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=gearshack-springbreak
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=gearshack-springbreak.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 3. Configure Next.js Image Domains

Update `next.config.ts`:

```typescript
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
```

### 4. Configure Firebase OAuth (Firebase Console)

1. Go to Firebase Console > Authentication > Sign-in method
2. Enable Google provider
3. Add authorized domain: `localhost` (for development)
4. Add production domain when deploying

## Development Workflow

### Start Development Server

```bash
npm run dev
```

### Test Authentication Flow

1. Navigate to http://localhost:3000/login
2. Click "Sign in with Google" or use email/password
3. Verify redirect to /inventory
4. Check profile modal in header menu

### Test Route Protection

1. Sign out or open incognito window
2. Navigate directly to http://localhost:3000/inventory
3. Verify redirect to /login
4. After sign-in, verify return to /inventory

## File Structure

```
lib/firebase/
├── config.ts        # Firebase app initialization
├── auth.ts          # Auth utility functions
└── firestore.ts     # Firestore utility functions

hooks/
├── useAuth.ts       # Auth state and actions
├── useProfile.ts    # Profile CRUD operations
└── useBackgroundImages.ts  # Login background images

components/auth/
├── AuthProvider.tsx       # Auth context provider
├── ProtectedRoute.tsx     # Route protection wrapper
├── LoginForm.tsx          # Email/password form
├── GoogleSignInButton.tsx # OAuth button
├── ForgotPasswordForm.tsx # Password reset form
└── BackgroundRotator.tsx  # Login background rotation

components/profile/
├── ProfileModal.tsx       # View/Edit profile dialog
├── ProfileView.tsx        # Read-only profile display
├── ProfileEditForm.tsx    # Edit form with validation
└── AvatarWithFallback.tsx # Avatar with initials fallback

types/
├── auth.ts          # Auth-related types
└── profile.ts       # Profile form types
```

## Key Integration Points

### AuthProvider in Layout

```typescript
// app/layout.tsx
import { AuthProvider } from '@/components/auth/AuthProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Protected Routes

```typescript
// app/inventory/page.tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function InventoryPage() {
  return (
    <ProtectedRoute>
      {/* Page content */}
    </ProtectedRoute>
  );
}
```

### Using Auth Hook

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, mergedUser, signOut } = useAuth();

  if (!user) return <LoginPrompt />;

  return (
    <div>
      <p>Welcome, {mergedUser?.displayName}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

## Troubleshooting

### Firebase Auth Errors

- **auth/popup-closed-by-user**: User closed OAuth popup - no action needed
- **auth/network-request-failed**: Check network connection
- **auth/invalid-email**: Validate email format before submission
- **auth/wrong-password**: Show generic "Invalid credentials" message

### Firestore Errors

- **permission-denied**: Check Firestore security rules
- **not-found**: Profile document doesn't exist - will be auto-created

### Image Loading Errors

- Check next.config.ts has correct remote patterns
- Verify Firebase Storage rules allow read access
- Use fallback gradient if images fail to load

## Validation Checklist

- [ ] Google sign-in works
- [ ] Email/password registration works
- [ ] Email/password sign-in works
- [ ] Password reset email sends
- [ ] Protected routes redirect to login
- [ ] Return URL preserved after login
- [ ] Profile modal opens
- [ ] Profile edit saves correctly
- [ ] Avatar displays with fallback
- [ ] Background images rotate
- [ ] Sign out clears session
