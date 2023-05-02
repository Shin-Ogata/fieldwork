/** @internal */ export const phaseSymbol = Symbol('phase');
/** @internal */ export const hookSymbol = Symbol('hook');

/** @internal */ export const updateSymbol = Symbol('update');
/** @internal */ export const commitSymbol = Symbol('commit');
/** @internal */ export const effectsSymbol = Symbol('effects');
/** @internal */ export const layoutEffectsSymbol = Symbol('layoutEffects');

/** @internal */ export type EffectsSymbols = typeof effectsSymbol | typeof layoutEffectsSymbol;
/** @internal */ export type Phase = typeof updateSymbol | typeof commitSymbol | typeof effectsSymbol;

/** @internal */ export const contextEvent = 'hooks.context';
