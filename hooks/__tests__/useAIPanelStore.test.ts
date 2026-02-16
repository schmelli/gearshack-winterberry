import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';

// Mock localStorage before importing the store
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Import after localStorage mock is set up
const { useAIPanelStore } = await import('../useAIPanelStore');

describe('useAIPanelStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Reset zustand store between tests
    useAIPanelStore.setState({
      isOpen: false,
      panelWidth: 400,
    });
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAIPanelStore());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.panelWidth).toBe(400);
  });

  it('should open and close panel', () => {
    const { result } = renderHook(() => useAIPanelStore());

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('should toggle panel', () => {
    const { result } = renderHook(() => useAIPanelStore());

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('should set panel width within valid range', () => {
    const { result } = renderHook(() => useAIPanelStore());

    act(() => {
      result.current.setWidth(450);
    });
    expect(result.current.panelWidth).toBe(450);
  });

  it('should clamp panel width to min value', () => {
    const { result } = renderHook(() => useAIPanelStore());

    act(() => {
      result.current.setWidth(200);
    });
    expect(result.current.panelWidth).toBe(300);
  });

  it('should clamp panel width to max value', () => {
    const { result } = renderHook(() => useAIPanelStore());

    act(() => {
      result.current.setWidth(700);
    });
    expect(result.current.panelWidth).toBe(600);
  });
});
