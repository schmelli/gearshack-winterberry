/**
 * useWikiSidebar Hook
 *
 * Feature: Community Section Restructure
 *
 * Manages the open/close state of the mobile Wiki sidebar Sheet.
 * Extracted from WikiLayout to comply with the stateless component rule.
 */

'use client';

import { useState } from 'react';

export function useWikiSidebar() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}
