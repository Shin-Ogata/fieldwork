import { TemplateContext } from './interfaces';
import { PlainObject } from './utils';
/**
 * Represents a rendering context by wrapping a view object and
 * maintaining a reference to the parent context.
 */
export declare class Context implements TemplateContext {
    private readonly _view;
    private readonly _parent?;
    private readonly _cache;
    /** constructor */
    constructor(view: PlainObject, parentContext?: Context);
    /**
     * View parameter getter.
     */
    get view(): PlainObject;
    /**
     * Creates a new context using the given view with this context
     * as the parent.
     */
    push(view: PlainObject): Context;
    /**
     * Returns the value of the given name in this context, traversing
     * up the context hierarchy if the value is absent in this context's view.
     */
    lookup(name: string): unknown;
}
