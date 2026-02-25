import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Global mock for next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// Factory function for creating Link mock
const createLinkMock = () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return React.createElement('a', { href }, children);
  };
};

// Factory for router mock
const createRouterMock = () => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
});

// Global mock for next-intl navigation (prevents ESM resolution issues)
vi.mock('next-intl/navigation', () => ({
  createNavigation: () => ({
    Link: createLinkMock(),
    useRouter: () => createRouterMock(),
    usePathname: () => '/',
    redirect: vi.fn(),
  }),
  useRouter: () => createRouterMock(),
  usePathname: () => '/',
  Link: createLinkMock(),
  redirect: vi.fn(),
}));

// Mock @/i18n/navigation for components that use it
vi.mock('@/i18n/navigation', () => ({
  Link: createLinkMock(),
  useRouter: () => createRouterMock(),
  usePathname: () => '/',
  redirect: vi.fn(),
}));
