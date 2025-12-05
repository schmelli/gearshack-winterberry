/**
 * Firebase Auth Utilities
 *
 * Feature: 008-auth-and-profile
 * Authentication helper functions using Firebase Auth
 */

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  type UserCredential,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  return signInWithPopup(auth, googleProvider);
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Register new user with email and password
 */
export async function registerWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password);
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  return signOut(auth);
}
