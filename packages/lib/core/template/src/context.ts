import type { TemplateContext } from './interfaces';
import {
    type UnknownFunction,
    type UnknownObject,
    type PlainObject,
    isFunction,
    has,
    primitiveHasOwnProperty,
} from './utils';

/**
 * Represents a rendering context by wrapping a view object and
 * maintaining a reference to the parent context.
 */
export class Context implements TemplateContext {
    private readonly _view: PlainObject;
    private readonly _parent?: Context;
    private readonly _cache: PlainObject;

    /** constructor */
    constructor(view: PlainObject, parentContext?: Context) {
        this._view   = view;
        this._cache  = { '.': this._view };
        this._parent = parentContext;
    }

///////////////////////////////////////////////////////////////////////
// public methods:

    /**
     * View parameter getter.
     */
    get view(): PlainObject {
        return this._view;
    }

    /**
     * Creates a new context using the given view with this context
     * as the parent.
     */
    push(view: PlainObject): Context {
        return new Context(view, this);
    }

    /**
     * Returns the value of the given name in this context, traversing
     * up the context hierarchy if the value is absent in this context's view.
     */
    lookup(name: string): unknown {
        const cache = this._cache;

        let value: unknown;
        if (Object.prototype.hasOwnProperty.call(cache, name)) {
            value = cache[name];
        } else {
            let context: Context | undefined = this; // eslint-disable-line @typescript-eslint/no-this-alias
            let intermediateValue: UnknownObject | undefined | null;
            let names: string[];
            let index: number;
            let lookupHit = false;

            while (context) {
                if (0 < name.indexOf('.')) {
                    intermediateValue = context._view;
                    names = name.split('.');
                    index = 0;

                    /**
                     * Using the dot notion path in `name`, we descend through the
                     * nested objects.
                     *
                     * To be certain that the lookup has been successful, we have to
                     * check if the last object in the path actually has the property
                     * we are looking for. We store the result in `lookupHit`.
                     *
                     * This is specially necessary for when the value has been set to
                     * `undefined` and we want to avoid looking up parent contexts.
                     *
                     * In the case where dot notation is used, we consider the lookup
                     * to be successful even if the last "object" in the path is
                     * not actually an object but a primitive (e.g., a string, or an
                     * integer), because it is sometimes useful to access a property
                     * of an autoboxed primitive, such as the length of a string.
                     **/
                    while (null != intermediateValue && index < names.length) {
                        if (index === names.length - 1) {
                            lookupHit = (
                                has(intermediateValue, names[index]) ||
                                primitiveHasOwnProperty(intermediateValue, names[index])
                            );
                        }
                        intermediateValue = intermediateValue[names[index++]] as UnknownObject;
                    }
                } else {
                    intermediateValue = context._view[name];

                    /**
                     * Only checking against `hasProperty`, which always returns `false` if
                     * `context.view` is not an object. Deliberately omitting the check
                     * against `primitiveHasOwnProperty` if dot notation is not used.
                     *
                     * Consider this example:
                     * ```
                     * Mustache.render("The length of a football field is {{#length}}{{length}}{{/length}}.", {length: "100 yards"})
                     * ```
                     *
                     * If we were to check also against `primitiveHasOwnProperty`, as we do
                     * in the dot notation case, then render call would return:
                     *
                     * "The length of a football field is 9."
                     *
                     * rather than the expected:
                     *
                     * "The length of a football field is 100 yards."
                     **/
                    lookupHit = has(context._view, name);
                }

                if (lookupHit) {
                    value = intermediateValue;
                    break;
                }

                context = context._parent;
            }

            cache[name] = value as object;
        }

        if (isFunction(value)) {
            value = (value as UnknownFunction).call(this._view);
        }

        return value;
    }
}
