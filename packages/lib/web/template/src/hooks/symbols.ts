/** @internal */
export const hookSymbol = Symbol('hook');
/** @internal */
export const effectsSymbol = Symbol('effects');
/** @internal */
export const layoutEffectsSymbol = Symbol('layoutEffects');

/** @internal */
export type EffectsSymbols = typeof effectsSymbol | typeof layoutEffectsSymbol;
