import { useMemo } from 'react';

/**
 * Minimal stub hook to avoid build-time errors. It preserves the UI by defaulting
 * diagnostics to off. If a fuller implementation is added later, simply replace this.
 */
export function useLoginDiagnostic() {
  const state = useMemo(() => ({ hasLoginIssues: false, shouldShowDiagnostic: false }), []);
  return state;
}
