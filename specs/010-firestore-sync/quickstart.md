# Quickstart: The Great Sync

**Feature**: 010-firestore-sync
**Date**: 2025-12-05

## Overview

This guide provides quick validation steps for the Firestore sync feature. Use these scenarios to verify the implementation works correctly.

## Prerequisites

- Firebase project configured with Firestore and Storage
- Environment variables set in `.env.local`:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
- Test user account with existing gear data in Firestore

## Quick Validation Scenarios

### Scenario 1: Initial Data Sync

**Steps**:
1. Clear browser localStorage
2. Navigate to app
3. Log in with test credentials
4. Observe inventory gallery

**Expected**:
- [ ] Sync indicator shows "syncing" in header
- [ ] Gear items appear within 5 seconds
- [ ] Sync indicator returns to "idle" state
- [ ] Items match Firestore data

### Scenario 2: Real-Time Update

**Steps**:
1. Log in on two browser tabs
2. In Tab 1: Add a new gear item
3. Observe Tab 2

**Expected**:
- [ ] New item appears in Tab 2 without refresh
- [ ] Update visible within 2 seconds
- [ ] No duplicate items

### Scenario 3: Create Gear Item

**Steps**:
1. Log in to app
2. Navigate to "Add New Item"
3. Fill in required fields (name, condition, status)
4. Click Save

**Expected**:
- [ ] Item appears immediately in inventory (optimistic)
- [ ] Sync indicator shows activity
- [ ] Item persists after page refresh
- [ ] Item visible in Firestore Console

### Scenario 4: Update Gear Item

**Steps**:
1. Log in and view existing gear item
2. Click Edit
3. Change name or weight
4. Click Save

**Expected**:
- [ ] Changes visible immediately (optimistic)
- [ ] Firestore document updated
- [ ] updatedAt timestamp changes

### Scenario 5: Delete Gear Item

**Steps**:
1. Log in and view existing gear item
2. Click Delete
3. Confirm deletion

**Expected**:
- [ ] Item removed from inventory immediately
- [ ] Item removed from Firestore
- [ ] Item removed from any loadouts referencing it

### Scenario 6: Image Upload

**Steps**:
1. Log in and edit a gear item
2. Click to add image
3. Select a JPG/PNG file (<10MB)
4. Save the item

**Expected**:
- [ ] Upload progress shown on save button
- [ ] Image URL saved to item
- [ ] Image displays in gear card
- [ ] Image accessible in Firebase Storage

### Scenario 7: Legacy Data Handling

**Steps**:
1. In Firestore Console, create a gear item with:
   - `weight` instead of `weightGrams`
   - `created_at` as Firestore Timestamp
   - Missing `condition` field
2. Refresh web app

**Expected**:
- [ ] Item displays correctly
- [ ] Weight value preserved
- [ ] Timestamp converted to Date
- [ ] Default condition applied

### Scenario 8: Error Recovery

**Steps**:
1. Log in to app
2. Open browser DevTools → Network
3. Set network to Offline
4. Try to add a new gear item
5. Re-enable network

**Expected**:
- [ ] Error toast displayed
- [ ] Optimistic update rolled back
- [ ] Sync indicator shows error state
- [ ] Retry succeeds when network restored

### Scenario 9: Loadout Sync

**Steps**:
1. Log in and navigate to Loadouts
2. Create a new loadout
3. Add gear items to loadout
4. Refresh page

**Expected**:
- [ ] Loadout persists after refresh
- [ ] Gear items correctly associated
- [ ] Weight totals calculate correctly

### Scenario 10: Multi-Device Consistency

**Steps**:
1. Log in on web app
2. Add gear item via Flutter app (or Firestore Console)
3. Observe web app inventory

**Expected**:
- [ ] Item appears in web app
- [ ] All fields display correctly
- [ ] No data corruption

## Validation Checklist

### P1 - Core Sync (Must Pass)

| Test | Status |
|------|--------|
| Initial data loads on login | ⬜ |
| Real-time updates work | ⬜ |
| Create item persists | ⬜ |
| Update item persists | ⬜ |
| Delete item persists | ⬜ |
| Loadout sync works | ⬜ |

### P2 - Image Upload (Must Pass)

| Test | Status |
|------|--------|
| Image upload succeeds | ⬜ |
| Upload progress visible | ⬜ |
| Image displays in UI | ⬜ |

### P2 - UI Feedback (Should Pass)

| Test | Status |
|------|--------|
| Sync indicator visible | ⬜ |
| Sync states change correctly | ⬜ |
| Error messages display | ⬜ |

### Edge Cases (Should Pass)

| Test | Status |
|------|--------|
| Legacy data transforms | ⬜ |
| Network error recovery | ⬜ |
| Missing fields handled | ⬜ |

## Troubleshooting

### Sync Not Starting

1. Check Firebase config in `.env.local`
2. Verify user is authenticated
3. Check browser console for errors
4. Confirm Firestore rules allow read/write

### Data Not Appearing

1. Verify collection path: `userBase/{uid}/gearInventory`
2. Check if documents exist in Firestore Console
3. Look for adapter transformation errors in console

### Image Upload Failing

1. Check Storage rules in Firebase Console
2. Verify file is under 10MB
3. Confirm file type is JPG/PNG/WebP/GIF
4. Check browser console for Storage errors

### Infinite Loop Detected

1. Check for console warnings about repeated updates
2. Verify pendingWrites tracking is working
3. Look for missing unsubscribe calls

## Performance Benchmarks

| Metric | Target | Acceptable |
|--------|--------|------------|
| Initial sync | < 5s | < 10s |
| Real-time update | < 2s | < 5s |
| Image upload (5MB) | < 10s | < 30s |
| CRUD operation | < 1s | < 3s |
