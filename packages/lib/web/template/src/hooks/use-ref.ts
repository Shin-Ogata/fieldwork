import { useMemo } from './use-memo';

/** @internal */
export const useRef: <T>(initialValue: T) => { current: T; } = <T>(initialValue: T) => useMemo(() => ({
    current: initialValue
}), []);
