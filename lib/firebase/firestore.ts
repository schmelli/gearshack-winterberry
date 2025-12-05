/**
 * Firestore Utilities
 *
 * Feature: 008-auth-and-profile
 * Firestore helper functions for user profile management
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { UserProfile, AuthUser } from '@/types/auth';
import type { ProfileUpdatePayload } from '@/types/profile';

const USERS_COLLECTION = 'userBase';

/**
 * Get user profile from Firestore
 */
export async function getProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
}

/**
 * Update user profile in Firestore
 * Preserves isVIP and first_launch fields (FR-013)
 */
export async function updateProfile(
  uid: string,
  data: ProfileUpdatePayload
): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);

  // Get existing profile to preserve system fields
  const existing = await getProfile(uid);

  if (existing) {
    // Update existing profile, preserving system fields
    await updateDoc(docRef, {
      ...data,
      // Explicitly preserve system fields by not including them in update
    });
  } else {
    // Create new profile if it doesn't exist
    await setDoc(docRef, {
      ...data,
      first_launch: serverTimestamp(),
    });
  }
}

/**
 * Create default profile for first-time users (FR-014)
 */
export async function createDefaultProfile(
  uid: string,
  authUser: AuthUser
): Promise<UserProfile> {
  const defaultProfile: UserProfile = {
    displayName: authUser.displayName || authUser.email?.split('@')[0] || 'User',
    avatarUrl: authUser.photoURL || undefined,
    trailName: undefined,
    bio: undefined,
    location: undefined,
    instagram: undefined,
    facebook: undefined,
    youtube: undefined,
    website: undefined,
  };

  const docRef = doc(db, USERS_COLLECTION, uid);
  await setDoc(docRef, {
    ...defaultProfile,
    first_launch: serverTimestamp(),
  });

  return defaultProfile;
}
