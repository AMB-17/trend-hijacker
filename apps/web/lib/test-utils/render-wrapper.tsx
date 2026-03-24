import React from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';

/**
 * Wrapper component that provides all necessary providers for testing
 */
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  // Add any global providers here (e.g., ThemeProvider, QueryClientProvider)
  return <>{children}</>;
};

/**
 * Custom render function that includes all providers
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

/**
 * Re-export everything from @testing-library/react
 */
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
