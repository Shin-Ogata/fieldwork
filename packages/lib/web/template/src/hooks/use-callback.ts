import type { UnknownFunction } from '@cdp/core-utils';
import { useMemo } from './use-memo';

/** @internal */
export const useCallback: <T extends UnknownFunction>(fn: T, inputs: unknown[]) => T
    = <T extends UnknownFunction>(fn: T, inputs: unknown[]) => useMemo(() => fn, inputs);
