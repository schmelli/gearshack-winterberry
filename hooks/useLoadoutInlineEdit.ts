/**
 * useLoadoutInlineEdit Hook
 *
 * Feature: 009-grand-visual-polish
 * Task: T003a
 * Constitution Principle I: Business logic in hooks (no useState in components)
 *
 * Provides state management for inline description editing in LoadoutHeader.
 */

'use client';

import { useState, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface UseLoadoutInlineEditReturn {
  /** Whether the edit mode is currently active */
  isEditing: boolean;
  /** Current value being edited */
  editValue: string;
  /** Start editing with the current description */
  startEdit: (currentDescription: string | null) => void;
  /** Cancel editing and discard changes */
  cancelEdit: () => void;
  /** Update the edit value as user types */
  updateValue: (value: string) => void;
  /** Get the value to save (returns editValue) */
  getValueToSave: () => string | null;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useLoadoutInlineEdit(): UseLoadoutInlineEditReturn {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const startEdit = useCallback((currentDescription: string | null) => {
    setEditValue(currentDescription ?? '');
    setIsEditing(true);
  }, []);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue('');
  }, []);

  const updateValue = useCallback((value: string) => {
    setEditValue(value);
  }, []);

  const getValueToSave = useCallback((): string | null => {
    const trimmed = editValue.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, [editValue]);

  return {
    isEditing,
    editValue,
    startEdit,
    cancelEdit,
    updateValue,
    getValueToSave,
  };
}
