/*!
 * @cdp/extension-template 0.9.20
 *   extension for template engine
 */

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
// Allows minifiers to rename references to globalThis
const global = globalThis;
const wrap$1 = (node) => node;
const trustedTypes = global.trustedTypes;
/**
 * Our TrustedTypePolicy for HTML which is declared using the html template
 * tag function.
 *
 * That HTML is a developer-authored constant, and is parsed with innerHTML
 * before any untrusted expressions have been mixed in. Therefor it is
 * considered safe by construction.
 */
const policy = trustedTypes
    ? trustedTypes.createPolicy('lit-html', {
        createHTML: (s) => s,
    })
    : undefined;
// Added to an attribute name to mark the attribute as bound so we can find
// it easily.
const boundAttributeSuffix = '$lit$';
// This marker is used in many syntactic positions in HTML, so it must be
// a valid element name and attribute name. We don't support dynamic names (yet)
// but this at least ensures that the parse tree is closer to the template
// intention.
const marker = `lit$${Math.random().toFixed(9).slice(2)}$`;
// String used to tell if a comment is a marker comment
const markerMatch = '?' + marker;
// Text used to insert a comment marker node. We use processing instruction
// syntax because it's slightly smaller, but parses as a comment node.
const nodeMarker = `<${markerMatch}>`;
const d = document;
// Creates a dynamic marker. We never have to search for these in the DOM.
const createMarker$1 = () => d.createComment('');
const isPrimitive$1 = (value) => value === null || (typeof value != 'object' && typeof value != 'function');
const isArray = Array.isArray;
const isIterable = (value) => isArray(value) ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof value?.[Symbol.iterator] === 'function';
const SPACE_CHAR = `[ \t\n\f\r]`;
const ATTR_VALUE_CHAR = `[^ \t\n\f\r"'\`<>=]`;
const NAME_CHAR = `[^\\s"'>=/]`;
// These regexes represent the five parsing states that we care about in the
// Template's HTML scanner. They match the *end* of the state they're named
// after.
// Depending on the match, we transition to a new state. If there's no match,
// we stay in the same state.
// Note that the regexes are stateful. We utilize lastIndex and sync it
// across the multiple regexes used. In addition to the five regexes below
// we also dynamically create a regex to find the matching end tags for raw
// text elements.
/**
 * End of text is: `<` followed by:
 *   (comment start) or (tag) or (dynamic tag binding)
 */
const textEndRegex = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
const COMMENT_START = 1;
const TAG_NAME = 2;
const DYNAMIC_TAG_NAME = 3;
const commentEndRegex = /-->/g;
/**
 * Comments not started with <!--, like </{, can be ended by a single `>`
 */
const comment2EndRegex = />/g;
/**
 * The tagEnd regex matches the end of the "inside an opening" tag syntax
 * position. It either matches a `>`, an attribute-like sequence, or the end
 * of the string after a space (attribute-name position ending).
 *
 * See attributes in the HTML spec:
 * https://www.w3.org/TR/html5/syntax.html#elements-attributes
 *
 * " \t\n\f\r" are HTML space characters:
 * https://infra.spec.whatwg.org/#ascii-whitespace
 *
 * So an attribute is:
 *  * The name: any character except a whitespace character, ("), ('), ">",
 *    "=", or "/". Note: this is different from the HTML spec which also excludes control characters.
 *  * Followed by zero or more space characters
 *  * Followed by "="
 *  * Followed by zero or more space characters
 *  * Followed by:
 *    * Any character except space, ('), ("), "<", ">", "=", (`), or
 *    * (") then any non-("), or
 *    * (') then any non-(')
 */
const tagEndRegex = new RegExp(`>|${SPACE_CHAR}(?:(${NAME_CHAR}+)(${SPACE_CHAR}*=${SPACE_CHAR}*(?:${ATTR_VALUE_CHAR}|("|')|))|$)`, 'g');
const ENTIRE_MATCH = 0;
const ATTRIBUTE_NAME = 1;
const SPACES_AND_EQUALS = 2;
const QUOTE_CHAR = 3;
const singleQuoteAttrEndRegex = /'/g;
const doubleQuoteAttrEndRegex = /"/g;
/**
 * Matches the raw text elements.
 *
 * Comments are not parsed within raw text elements, so we need to search their
 * text content for marker strings.
 */
const rawTextElement = /^(?:script|style|textarea|title)$/i;
/** TemplateResult types */
const HTML_RESULT$1 = 1;
const SVG_RESULT$1 = 2;
const MATHML_RESULT = 3;
// TemplatePart types
// IMPORTANT: these must match the values in PartType
const ATTRIBUTE_PART = 1;
const CHILD_PART = 2;
const PROPERTY_PART = 3;
const BOOLEAN_ATTRIBUTE_PART = 4;
const EVENT_PART = 5;
const ELEMENT_PART = 6;
const COMMENT_PART = 7;
/**
 * Generates a template literal tag function that returns a TemplateResult with
 * the given result type.
 */
const tag = (type) => (strings, ...values) => {
    return {
        // This property needs to remain unminified.
        ['_$litType$']: type,
        strings,
        values,
    };
};
/**
 * Interprets a template literal as an HTML template that can efficiently
 * render to and update a container.
 *
 * ```ts
 * const header = (title: string) => html`<h1>${title}</h1>`;
 * ```
 *
 * The `html` tag returns a description of the DOM to render as a value. It is
 * lazy, meaning no work is done until the template is rendered. When rendering,
 * if a template comes from the same expression as a previously rendered result,
 * it's efficiently updated instead of replaced.
 */
const html = tag(HTML_RESULT$1);
/**
 * Interprets a template literal as an SVG fragment that can efficiently render
 * to and update a container.
 *
 * ```ts
 * const rect = svg`<rect width="10" height="10"></rect>`;
 *
 * const myImage = html`
 *   <svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
 *     ${rect}
 *   </svg>`;
 * ```
 *
 * The `svg` *tag function* should only be used for SVG fragments, or elements
 * that would be contained **inside** an `<svg>` HTML element. A common error is
 * placing an `<svg>` *element* in a template tagged with the `svg` tag
 * function. The `<svg>` element is an HTML element and should be used within a
 * template tagged with the {@linkcode html} tag function.
 *
 * In LitElement usage, it's invalid to return an SVG fragment from the
 * `render()` method, as the SVG fragment will be contained within the element's
 * shadow root and thus not be properly contained within an `<svg>` HTML
 * element.
 */
const svg = tag(SVG_RESULT$1);
/**
 * A sentinel value that signals that a value was handled by a directive and
 * should not be written to the DOM.
 */
const noChange = Symbol.for('lit-noChange');
/**
 * A sentinel value that signals a ChildPart to fully clear its content.
 *
 * ```ts
 * const button = html`${
 *  user.isAdmin
 *    ? html`<button>DELETE</button>`
 *    : nothing
 * }`;
 * ```
 *
 * Prefer using `nothing` over other falsy values as it provides a consistent
 * behavior between various expression binding contexts.
 *
 * In child expressions, `undefined`, `null`, `''`, and `nothing` all behave the
 * same and render no nodes. In attribute expressions, `nothing` _removes_ the
 * attribute, while `undefined` and `null` will render an empty string. In
 * property expressions `nothing` becomes `undefined`.
 */
const nothing = Symbol.for('lit-nothing');
/**
 * The cache of prepared templates, keyed by the tagged TemplateStringsArray
 * and _not_ accounting for the specific template tag used. This means that
 * template tags cannot be dynamic - they must statically be one of html, svg,
 * or attr. This restriction simplifies the cache lookup, which is on the hot
 * path for rendering.
 */
const templateCache = new WeakMap();
const walker = d.createTreeWalker(d, 129 /* NodeFilter.SHOW_{ELEMENT|COMMENT} */);
function trustFromTemplateString(tsa, stringFromTSA) {
    // A security check to prevent spoofing of Lit template results.
    // In the future, we may be able to replace this with Array.isTemplateObject,
    // though we might need to make that check inside of the html and svg
    // functions, because precompiled templates don't come in as
    // TemplateStringArray objects.
    if (!isArray(tsa) || !tsa.hasOwnProperty('raw')) {
        let message = 'invalid template strings array';
        throw new Error(message);
    }
    return policy !== undefined
        ? policy.createHTML(stringFromTSA)
        : stringFromTSA;
}
/**
 * Returns an HTML string for the given TemplateStringsArray and result type
 * (HTML or SVG), along with the case-sensitive bound attribute names in
 * template order. The HTML contains comment markers denoting the `ChildPart`s
 * and suffixes on bound attributes denoting the `AttributeParts`.
 *
 * @param strings template strings array
 * @param type HTML or SVG
 * @return Array containing `[html, attrNames]` (array returned for terseness,
 *     to avoid object fields since this code is shared with non-minified SSR
 *     code)
 */
const getTemplateHtml = (strings, type) => {
    // Insert makers into the template HTML to represent the position of
    // bindings. The following code scans the template strings to determine the
    // syntactic position of the bindings. They can be in text position, where
    // we insert an HTML comment, attribute value position, where we insert a
    // sentinel string and re-write the attribute name, or inside a tag where
    // we insert the sentinel string.
    const l = strings.length - 1;
    // Stores the case-sensitive bound attribute names in the order of their
    // parts. ElementParts are also reflected in this array as undefined
    // rather than a string, to disambiguate from attribute bindings.
    const attrNames = [];
    let html = type === SVG_RESULT$1 ? '<svg>' : type === MATHML_RESULT ? '<math>' : '';
    // When we're inside a raw text tag (not it's text content), the regex
    // will still be tagRegex so we can find attributes, but will switch to
    // this regex when the tag ends.
    let rawTextEndRegex;
    // The current parsing state, represented as a reference to one of the
    // regexes
    let regex = textEndRegex;
    for (let i = 0; i < l; i++) {
        const s = strings[i];
        // The index of the end of the last attribute name. When this is
        // positive at end of a string, it means we're in an attribute value
        // position and need to rewrite the attribute name.
        // We also use a special value of -2 to indicate that we encountered
        // the end of a string in attribute name position.
        let attrNameEndIndex = -1;
        let attrName;
        let lastIndex = 0;
        let match;
        // The conditions in this loop handle the current parse state, and the
        // assignments to the `regex` variable are the state transitions.
        while (lastIndex < s.length) {
            // Make sure we start searching from where we previously left off
            regex.lastIndex = lastIndex;
            match = regex.exec(s);
            if (match === null) {
                break;
            }
            lastIndex = regex.lastIndex;
            if (regex === textEndRegex) {
                if (match[COMMENT_START] === '!--') {
                    regex = commentEndRegex;
                }
                else if (match[COMMENT_START] !== undefined) {
                    // We started a weird comment, like </{
                    regex = comment2EndRegex;
                }
                else if (match[TAG_NAME] !== undefined) {
                    if (rawTextElement.test(match[TAG_NAME])) {
                        // Record if we encounter a raw-text element. We'll switch to
                        // this regex at the end of the tag.
                        rawTextEndRegex = new RegExp(`</${match[TAG_NAME]}`, 'g');
                    }
                    regex = tagEndRegex;
                }
                else if (match[DYNAMIC_TAG_NAME] !== undefined) {
                    regex = tagEndRegex;
                }
            }
            else if (regex === tagEndRegex) {
                if (match[ENTIRE_MATCH] === '>') {
                    // End of a tag. If we had started a raw-text element, use that
                    // regex
                    regex = rawTextEndRegex ?? textEndRegex;
                    // We may be ending an unquoted attribute value, so make sure we
                    // clear any pending attrNameEndIndex
                    attrNameEndIndex = -1;
                }
                else if (match[ATTRIBUTE_NAME] === undefined) {
                    // Attribute name position
                    attrNameEndIndex = -2;
                }
                else {
                    attrNameEndIndex = regex.lastIndex - match[SPACES_AND_EQUALS].length;
                    attrName = match[ATTRIBUTE_NAME];
                    regex =
                        match[QUOTE_CHAR] === undefined
                            ? tagEndRegex
                            : match[QUOTE_CHAR] === '"'
                                ? doubleQuoteAttrEndRegex
                                : singleQuoteAttrEndRegex;
                }
            }
            else if (regex === doubleQuoteAttrEndRegex ||
                regex === singleQuoteAttrEndRegex) {
                regex = tagEndRegex;
            }
            else if (regex === commentEndRegex || regex === comment2EndRegex) {
                regex = textEndRegex;
            }
            else {
                // Not one of the five state regexes, so it must be the dynamically
                // created raw text regex and we're at the close of that element.
                regex = tagEndRegex;
                rawTextEndRegex = undefined;
            }
        }
        // We have four cases:
        //  1. We're in text position, and not in a raw text element
        //     (regex === textEndRegex): insert a comment marker.
        //  2. We have a non-negative attrNameEndIndex which means we need to
        //     rewrite the attribute name to add a bound attribute suffix.
        //  3. We're at the non-first binding in a multi-binding attribute, use a
        //     plain marker.
        //  4. We're somewhere else inside the tag. If we're in attribute name
        //     position (attrNameEndIndex === -2), add a sequential suffix to
        //     generate a unique attribute name.
        // Detect a binding next to self-closing tag end and insert a space to
        // separate the marker from the tag end:
        const end = regex === tagEndRegex && strings[i + 1].startsWith('/>') ? ' ' : '';
        html +=
            regex === textEndRegex
                ? s + nodeMarker
                : attrNameEndIndex >= 0
                    ? (attrNames.push(attrName),
                        s.slice(0, attrNameEndIndex) +
                            boundAttributeSuffix +
                            s.slice(attrNameEndIndex)) +
                        marker +
                        end
                    : s + marker + (attrNameEndIndex === -2 ? i : end);
    }
    const htmlResult = html +
        (strings[l] || '<?>') +
        (type === SVG_RESULT$1 ? '</svg>' : type === MATHML_RESULT ? '</math>' : '');
    // Returned as an array for terseness
    return [trustFromTemplateString(strings, htmlResult), attrNames];
};
class Template {
    constructor(
    // This property needs to remain unminified.
    { strings, ['_$litType$']: type }, options) {
        this.parts = [];
        let node;
        let nodeIndex = 0;
        let attrNameIndex = 0;
        const partCount = strings.length - 1;
        const parts = this.parts;
        // Create template element
        const [html, attrNames] = getTemplateHtml(strings, type);
        this.el = Template.createElement(html, options);
        walker.currentNode = this.el.content;
        // Re-parent SVG or MathML nodes into template root
        if (type === SVG_RESULT$1 || type === MATHML_RESULT) {
            const wrapper = this.el.content.firstChild;
            wrapper.replaceWith(...wrapper.childNodes);
        }
        // Walk the template to find binding markers and create TemplateParts
        while ((node = walker.nextNode()) !== null && parts.length < partCount) {
            if (node.nodeType === 1) {
                // TODO (justinfagnani): for attempted dynamic tag names, we don't
                // increment the bindingIndex, and it'll be off by 1 in the element
                // and off by two after it.
                if (node.hasAttributes()) {
                    for (const name of node.getAttributeNames()) {
                        if (name.endsWith(boundAttributeSuffix)) {
                            const realName = attrNames[attrNameIndex++];
                            const value = node.getAttribute(name);
                            const statics = value.split(marker);
                            const m = /([.?@])?(.*)/.exec(realName);
                            parts.push({
                                type: ATTRIBUTE_PART,
                                index: nodeIndex,
                                name: m[2],
                                strings: statics,
                                ctor: m[1] === '.'
                                    ? PropertyPart
                                    : m[1] === '?'
                                        ? BooleanAttributePart
                                        : m[1] === '@'
                                            ? EventPart
                                            : AttributePart,
                            });
                            node.removeAttribute(name);
                        }
                        else if (name.startsWith(marker)) {
                            parts.push({
                                type: ELEMENT_PART,
                                index: nodeIndex,
                            });
                            node.removeAttribute(name);
                        }
                    }
                }
                // TODO (justinfagnani): benchmark the regex against testing for each
                // of the 3 raw text element names.
                if (rawTextElement.test(node.tagName)) {
                    // For raw text elements we need to split the text content on
                    // markers, create a Text node for each segment, and create
                    // a TemplatePart for each marker.
                    const strings = node.textContent.split(marker);
                    const lastIndex = strings.length - 1;
                    if (lastIndex > 0) {
                        node.textContent = trustedTypes
                            ? trustedTypes.emptyScript
                            : '';
                        // Generate a new text node for each literal section
                        // These nodes are also used as the markers for child parts
                        for (let i = 0; i < lastIndex; i++) {
                            node.append(strings[i], createMarker$1());
                            // Walk past the marker node we just added
                            walker.nextNode();
                            parts.push({ type: CHILD_PART, index: ++nodeIndex });
                        }
                        // Note because this marker is added after the walker's current
                        // node, it will be walked to in the outer loop (and ignored), so
                        // we don't need to adjust nodeIndex here
                        node.append(strings[lastIndex], createMarker$1());
                    }
                }
            }
            else if (node.nodeType === 8) {
                const data = node.data;
                if (data === markerMatch) {
                    parts.push({ type: CHILD_PART, index: nodeIndex });
                }
                else {
                    let i = -1;
                    while ((i = node.data.indexOf(marker, i + 1)) !== -1) {
                        // Comment node has a binding marker inside, make an inactive part
                        // The binding won't work, but subsequent bindings will
                        parts.push({ type: COMMENT_PART, index: nodeIndex });
                        // Move to the end of the match
                        i += marker.length - 1;
                    }
                }
            }
            nodeIndex++;
        }
    }
    // Overridden via `litHtmlPolyfillSupport` to provide platform support.
    /** @nocollapse */
    static createElement(html, _options) {
        const el = d.createElement('template');
        el.innerHTML = html;
        return el;
    }
}
function resolveDirective(part, value, parent = part, attributeIndex) {
    // Bail early if the value is explicitly noChange. Note, this means any
    // nested directive is still attached and is not run.
    if (value === noChange) {
        return value;
    }
    let currentDirective = attributeIndex !== undefined
        ? parent.__directives?.[attributeIndex]
        : parent.__directive;
    const nextDirectiveConstructor = isPrimitive$1(value)
        ? undefined
        : // This property needs to remain unminified.
            value['_$litDirective$'];
    if (currentDirective?.constructor !== nextDirectiveConstructor) {
        // This property needs to remain unminified.
        currentDirective?.['_$notifyDirectiveConnectionChanged']?.(false);
        if (nextDirectiveConstructor === undefined) {
            currentDirective = undefined;
        }
        else {
            currentDirective = new nextDirectiveConstructor(part);
            currentDirective._$initialize(part, parent, attributeIndex);
        }
        if (attributeIndex !== undefined) {
            (parent.__directives ??= [])[attributeIndex] =
                currentDirective;
        }
        else {
            parent.__directive = currentDirective;
        }
    }
    if (currentDirective !== undefined) {
        value = resolveDirective(part, currentDirective._$resolve(part, value.values), currentDirective, attributeIndex);
    }
    return value;
}
/**
 * An updateable instance of a Template. Holds references to the Parts used to
 * update the template instance.
 */
class TemplateInstance {
    constructor(template, parent) {
        this._$parts = [];
        /** @internal */
        this._$disconnectableChildren = undefined;
        this._$template = template;
        this._$parent = parent;
    }
    // Called by ChildPart parentNode getter
    get parentNode() {
        return this._$parent.parentNode;
    }
    // See comment in Disconnectable interface for why this is a getter
    get _$isConnected() {
        return this._$parent._$isConnected;
    }
    // This method is separate from the constructor because we need to return a
    // DocumentFragment and we don't want to hold onto it with an instance field.
    _clone(options) {
        const { el: { content }, parts: parts, } = this._$template;
        const fragment = (options?.creationScope ?? d).importNode(content, true);
        walker.currentNode = fragment;
        let node = walker.nextNode();
        let nodeIndex = 0;
        let partIndex = 0;
        let templatePart = parts[0];
        while (templatePart !== undefined) {
            if (nodeIndex === templatePart.index) {
                let part;
                if (templatePart.type === CHILD_PART) {
                    part = new ChildPart$1(node, node.nextSibling, this, options);
                }
                else if (templatePart.type === ATTRIBUTE_PART) {
                    part = new templatePart.ctor(node, templatePart.name, templatePart.strings, this, options);
                }
                else if (templatePart.type === ELEMENT_PART) {
                    part = new ElementPart(node, this, options);
                }
                this._$parts.push(part);
                templatePart = parts[++partIndex];
            }
            if (nodeIndex !== templatePart?.index) {
                node = walker.nextNode();
                nodeIndex++;
            }
        }
        // We need to set the currentNode away from the cloned tree so that we
        // don't hold onto the tree even if the tree is detached and should be
        // freed.
        walker.currentNode = d;
        return fragment;
    }
    _update(values) {
        let i = 0;
        for (const part of this._$parts) {
            if (part !== undefined) {
                if (part.strings !== undefined) {
                    part._$setValue(values, part, i);
                    // The number of values the part consumes is part.strings.length - 1
                    // since values are in between template spans. We increment i by 1
                    // later in the loop, so increment it by part.strings.length - 2 here
                    i += part.strings.length - 2;
                }
                else {
                    part._$setValue(values[i]);
                }
            }
            i++;
        }
    }
}
let ChildPart$1 = class ChildPart {
    // See comment in Disconnectable interface for why this is a getter
    get _$isConnected() {
        // ChildParts that are not at the root should always be created with a
        // parent; only RootChildNode's won't, so they return the local isConnected
        // state
        return this._$parent?._$isConnected ?? this.__isConnected;
    }
    constructor(startNode, endNode, parent, options) {
        this.type = CHILD_PART;
        this._$committedValue = nothing;
        // The following fields will be patched onto ChildParts when required by
        // AsyncDirective
        /** @internal */
        this._$disconnectableChildren = undefined;
        this._$startNode = startNode;
        this._$endNode = endNode;
        this._$parent = parent;
        this.options = options;
        // Note __isConnected is only ever accessed on RootParts (i.e. when there is
        // no _$parent); the value on a non-root-part is "don't care", but checking
        // for parent would be more code
        this.__isConnected = options?.isConnected ?? true;
    }
    /**
     * The parent node into which the part renders its content.
     *
     * A ChildPart's content consists of a range of adjacent child nodes of
     * `.parentNode`, possibly bordered by 'marker nodes' (`.startNode` and
     * `.endNode`).
     *
     * - If both `.startNode` and `.endNode` are non-null, then the part's content
     * consists of all siblings between `.startNode` and `.endNode`, exclusively.
     *
     * - If `.startNode` is non-null but `.endNode` is null, then the part's
     * content consists of all siblings following `.startNode`, up to and
     * including the last child of `.parentNode`. If `.endNode` is non-null, then
     * `.startNode` will always be non-null.
     *
     * - If both `.endNode` and `.startNode` are null, then the part's content
     * consists of all child nodes of `.parentNode`.
     */
    get parentNode() {
        let parentNode = wrap$1(this._$startNode).parentNode;
        const parent = this._$parent;
        if (parent !== undefined &&
            parentNode?.nodeType === 11 /* Node.DOCUMENT_FRAGMENT */) {
            // If the parentNode is a DocumentFragment, it may be because the DOM is
            // still in the cloned fragment during initial render; if so, get the real
            // parentNode the part will be committed into by asking the parent.
            parentNode = parent.parentNode;
        }
        return parentNode;
    }
    /**
     * The part's leading marker node, if any. See `.parentNode` for more
     * information.
     */
    get startNode() {
        return this._$startNode;
    }
    /**
     * The part's trailing marker node, if any. See `.parentNode` for more
     * information.
     */
    get endNode() {
        return this._$endNode;
    }
    _$setValue(value, directiveParent = this) {
        value = resolveDirective(this, value, directiveParent);
        if (isPrimitive$1(value)) {
            // Non-rendering child values. It's important that these do not render
            // empty text nodes to avoid issues with preventing default <slot>
            // fallback content.
            if (value === nothing || value == null || value === '') {
                if (this._$committedValue !== nothing) {
                    this._$clear();
                }
                this._$committedValue = nothing;
            }
            else if (value !== this._$committedValue && value !== noChange) {
                this._commitText(value);
            }
            // This property needs to remain unminified.
        }
        else if (value['_$litType$'] !== undefined) {
            this._commitTemplateResult(value);
        }
        else if (value.nodeType !== undefined) {
            this._commitNode(value);
        }
        else if (isIterable(value)) {
            this._commitIterable(value);
        }
        else {
            // Fallback, will render the string representation
            this._commitText(value);
        }
    }
    _insert(node) {
        return wrap$1(wrap$1(this._$startNode).parentNode).insertBefore(node, this._$endNode);
    }
    _commitNode(value) {
        if (this._$committedValue !== value) {
            this._$clear();
            this._$committedValue = this._insert(value);
        }
    }
    _commitText(value) {
        // If the committed value is a primitive it means we called _commitText on
        // the previous render, and we know that this._$startNode.nextSibling is a
        // Text node. We can now just replace the text content (.data) of the node.
        if (this._$committedValue !== nothing &&
            isPrimitive$1(this._$committedValue)) {
            const node = wrap$1(this._$startNode).nextSibling;
            node.data = value;
        }
        else {
            {
                this._commitNode(d.createTextNode(value));
            }
        }
        this._$committedValue = value;
    }
    _commitTemplateResult(result) {
        // This property needs to remain unminified.
        const { values, ['_$litType$']: type } = result;
        // If $litType$ is a number, result is a plain TemplateResult and we get
        // the template from the template cache. If not, result is a
        // CompiledTemplateResult and _$litType$ is a CompiledTemplate and we need
        // to create the <template> element the first time we see it.
        const template = typeof type === 'number'
            ? this._$getTemplate(result)
            : (type.el === undefined &&
                (type.el = Template.createElement(trustFromTemplateString(type.h, type.h[0]), this.options)),
                type);
        if (this._$committedValue?._$template === template) {
            this._$committedValue._update(values);
        }
        else {
            const instance = new TemplateInstance(template, this);
            const fragment = instance._clone(this.options);
            instance._update(values);
            this._commitNode(fragment);
            this._$committedValue = instance;
        }
    }
    // Overridden via `litHtmlPolyfillSupport` to provide platform support.
    /** @internal */
    _$getTemplate(result) {
        let template = templateCache.get(result.strings);
        if (template === undefined) {
            templateCache.set(result.strings, (template = new Template(result)));
        }
        return template;
    }
    _commitIterable(value) {
        // For an Iterable, we create a new InstancePart per item, then set its
        // value to the item. This is a little bit of overhead for every item in
        // an Iterable, but it lets us recurse easily and efficiently update Arrays
        // of TemplateResults that will be commonly returned from expressions like:
        // array.map((i) => html`${i}`), by reusing existing TemplateInstances.
        // If value is an array, then the previous render was of an
        // iterable and value will contain the ChildParts from the previous
        // render. If value is not an array, clear this part and make a new
        // array for ChildParts.
        if (!isArray(this._$committedValue)) {
            this._$committedValue = [];
            this._$clear();
        }
        // Lets us keep track of how many items we stamped so we can clear leftover
        // items from a previous render
        const itemParts = this._$committedValue;
        let partIndex = 0;
        let itemPart;
        for (const item of value) {
            if (partIndex === itemParts.length) {
                // If no existing part, create a new one
                // TODO (justinfagnani): test perf impact of always creating two parts
                // instead of sharing parts between nodes
                // https://github.com/lit/lit/issues/1266
                itemParts.push((itemPart = new ChildPart(this._insert(createMarker$1()), this._insert(createMarker$1()), this, this.options)));
            }
            else {
                // Reuse an existing part
                itemPart = itemParts[partIndex];
            }
            itemPart._$setValue(item);
            partIndex++;
        }
        if (partIndex < itemParts.length) {
            // itemParts always have end nodes
            this._$clear(itemPart && wrap$1(itemPart._$endNode).nextSibling, partIndex);
            // Truncate the parts array so _value reflects the current state
            itemParts.length = partIndex;
        }
    }
    /**
     * Removes the nodes contained within this Part from the DOM.
     *
     * @param start Start node to clear from, for clearing a subset of the part's
     *     DOM (used when truncating iterables)
     * @param from  When `start` is specified, the index within the iterable from
     *     which ChildParts are being removed, used for disconnecting directives
     *     in those Parts.
     *
     * @internal
     */
    _$clear(start = wrap$1(this._$startNode).nextSibling, from) {
        this._$notifyConnectionChanged?.(false, true, from);
        while (start !== this._$endNode) {
            // The non-null assertion is safe because if _$startNode.nextSibling is
            // null, then _$endNode is also null, and we would not have entered this
            // loop.
            const n = wrap$1(start).nextSibling;
            wrap$1(start).remove();
            start = n;
        }
    }
    /**
     * Implementation of RootPart's `isConnected`. Note that this method
     * should only be called on `RootPart`s (the `ChildPart` returned from a
     * top-level `render()` call). It has no effect on non-root ChildParts.
     * @param isConnected Whether to set
     * @internal
     */
    setConnected(isConnected) {
        if (this._$parent === undefined) {
            this.__isConnected = isConnected;
            this._$notifyConnectionChanged?.(isConnected);
        }
    }
};
class AttributePart {
    get tagName() {
        return this.element.tagName;
    }
    // See comment in Disconnectable interface for why this is a getter
    get _$isConnected() {
        return this._$parent._$isConnected;
    }
    constructor(element, name, strings, parent, options) {
        this.type = ATTRIBUTE_PART;
        /** @internal */
        this._$committedValue = nothing;
        /** @internal */
        this._$disconnectableChildren = undefined;
        this.element = element;
        this.name = name;
        this._$parent = parent;
        this.options = options;
        if (strings.length > 2 || strings[0] !== '' || strings[1] !== '') {
            this._$committedValue = new Array(strings.length - 1).fill(new String());
            this.strings = strings;
        }
        else {
            this._$committedValue = nothing;
        }
    }
    /**
     * Sets the value of this part by resolving the value from possibly multiple
     * values and static strings and committing it to the DOM.
     * If this part is single-valued, `this._strings` will be undefined, and the
     * method will be called with a single value argument. If this part is
     * multi-value, `this._strings` will be defined, and the method is called
     * with the value array of the part's owning TemplateInstance, and an offset
     * into the value array from which the values should be read.
     * This method is overloaded this way to eliminate short-lived array slices
     * of the template instance values, and allow a fast-path for single-valued
     * parts.
     *
     * @param value The part value, or an array of values for multi-valued parts
     * @param valueIndex the index to start reading values from. `undefined` for
     *   single-valued parts
     * @param noCommit causes the part to not commit its value to the DOM. Used
     *   in hydration to prime attribute parts with their first-rendered value,
     *   but not set the attribute, and in SSR to no-op the DOM operation and
     *   capture the value for serialization.
     *
     * @internal
     */
    _$setValue(value, directiveParent = this, valueIndex, noCommit) {
        const strings = this.strings;
        // Whether any of the values has changed, for dirty-checking
        let change = false;
        if (strings === undefined) {
            // Single-value binding case
            value = resolveDirective(this, value, directiveParent, 0);
            change =
                !isPrimitive$1(value) ||
                    (value !== this._$committedValue && value !== noChange);
            if (change) {
                this._$committedValue = value;
            }
        }
        else {
            // Interpolation case
            const values = value;
            value = strings[0];
            let i, v;
            for (i = 0; i < strings.length - 1; i++) {
                v = resolveDirective(this, values[valueIndex + i], directiveParent, i);
                if (v === noChange) {
                    // If the user-provided value is `noChange`, use the previous value
                    v = this._$committedValue[i];
                }
                change ||=
                    !isPrimitive$1(v) || v !== this._$committedValue[i];
                if (v === nothing) {
                    value = nothing;
                }
                else if (value !== nothing) {
                    value += (v ?? '') + strings[i + 1];
                }
                // We always record each value, even if one is `nothing`, for future
                // change detection.
                this._$committedValue[i] = v;
            }
        }
        if (change && !noCommit) {
            this._commitValue(value);
        }
    }
    /** @internal */
    _commitValue(value) {
        if (value === nothing) {
            wrap$1(this.element).removeAttribute(this.name);
        }
        else {
            wrap$1(this.element).setAttribute(this.name, (value ?? ''));
        }
    }
}
class PropertyPart extends AttributePart {
    constructor() {
        super(...arguments);
        this.type = PROPERTY_PART;
    }
    /** @internal */
    _commitValue(value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.element[this.name] = value === nothing ? undefined : value;
    }
}
class BooleanAttributePart extends AttributePart {
    constructor() {
        super(...arguments);
        this.type = BOOLEAN_ATTRIBUTE_PART;
    }
    /** @internal */
    _commitValue(value) {
        wrap$1(this.element).toggleAttribute(this.name, !!value && value !== nothing);
    }
}
class EventPart extends AttributePart {
    constructor(element, name, strings, parent, options) {
        super(element, name, strings, parent, options);
        this.type = EVENT_PART;
    }
    // EventPart does not use the base _$setValue/_resolveValue implementation
    // since the dirty checking is more complex
    /** @internal */
    _$setValue(newListener, directiveParent = this) {
        newListener =
            resolveDirective(this, newListener, directiveParent, 0) ?? nothing;
        if (newListener === noChange) {
            return;
        }
        const oldListener = this._$committedValue;
        // If the new value is nothing or any options change we have to remove the
        // part as a listener.
        const shouldRemoveListener = (newListener === nothing && oldListener !== nothing) ||
            newListener.capture !==
                oldListener.capture ||
            newListener.once !==
                oldListener.once ||
            newListener.passive !==
                oldListener.passive;
        // If the new value is not nothing and we removed the listener, we have
        // to add the part as a listener.
        const shouldAddListener = newListener !== nothing &&
            (oldListener === nothing || shouldRemoveListener);
        if (shouldRemoveListener) {
            this.element.removeEventListener(this.name, this, oldListener);
        }
        if (shouldAddListener) {
            this.element.addEventListener(this.name, this, newListener);
        }
        this._$committedValue = newListener;
    }
    handleEvent(event) {
        if (typeof this._$committedValue === 'function') {
            this._$committedValue.call(this.options?.host ?? this.element, event);
        }
        else {
            this._$committedValue.handleEvent(event);
        }
    }
}
class ElementPart {
    constructor(element, parent, options) {
        this.element = element;
        this.type = ELEMENT_PART;
        /** @internal */
        this._$disconnectableChildren = undefined;
        this._$parent = parent;
        this.options = options;
    }
    // See comment in Disconnectable interface for why this is a getter
    get _$isConnected() {
        return this._$parent._$isConnected;
    }
    _$setValue(value) {
        resolveDirective(this, value);
    }
}
/**
 * END USERS SHOULD NOT RELY ON THIS OBJECT.
 *
 * Private exports for use by other Lit packages, not intended for use by
 * external users.
 *
 * We currently do not make a mangled rollup build of the lit-ssr code. In order
 * to keep a number of (otherwise private) top-level exports mangled in the
 * client side code, we export a _$LH object containing those members (or
 * helper methods for accessing private fields of those members), and then
 * re-export them for use in lit-ssr. This keeps lit-ssr agnostic to whether the
 * client-side code is being used in `dev` mode or `prod` mode.
 *
 * This has a unique name, to disambiguate it from private exports in
 * lit-element, which re-exports all of lit-html.
 *
 * @private
 */
const _$LH$1 = {
    // Used in lit-ssr
    _boundAttributeSuffix: boundAttributeSuffix,
    _marker: marker,
    _markerMatch: markerMatch,
    _HTML_RESULT: HTML_RESULT$1,
    _getTemplateHtml: getTemplateHtml,
    // Used in tests and private-ssr-support
    _TemplateInstance: TemplateInstance,
    _isIterable: isIterable,
    _resolveDirective: resolveDirective,
    _ChildPart: ChildPart$1,
    _AttributePart: AttributePart,
    _BooleanAttributePart: BooleanAttributePart,
    _EventPart: EventPart,
    _PropertyPart: PropertyPart,
    _ElementPart: ElementPart,
};
// Apply polyfills if available
const polyfillSupport = global.litHtmlPolyfillSupport;
polyfillSupport?.(Template, ChildPart$1);
// IMPORTANT: do not change the property name or the assignment expression.
// This line will be used in regexes to search for lit-html usage.
(global.litHtmlVersions ??= []).push('3.3.1');
/**
 * Renders a value, usually a lit-html TemplateResult, to the container.
 *
 * This example renders the text "Hello, Zoe!" inside a paragraph tag, appending
 * it to the container `document.body`.
 *
 * ```js
 * import {html, render} from 'lit';
 *
 * const name = "Zoe";
 * render(html`<p>Hello, ${name}!</p>`, document.body);
 * ```
 *
 * @param value Any [renderable
 *   value](https://lit.dev/docs/templates/expressions/#child-expressions),
 *   typically a {@linkcode TemplateResult} created by evaluating a template tag
 *   like {@linkcode html} or {@linkcode svg}.
 * @param container A DOM container to render to. The first render will append
 *   the rendered value to the container, and subsequent renders will
 *   efficiently update the rendered value if the same result type was
 *   previously rendered there.
 * @param options See {@linkcode RenderOptions} for options documentation.
 * @see
 * {@link https://lit.dev/docs/libraries/standalone-templates/#rendering-lit-html-templates| Rendering Lit HTML Templates}
 */
const render = (value, container, options) => {
    const partOwnerNode = options?.renderBefore ?? container;
    // This property needs to remain unminified.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let part = partOwnerNode['_$litPart$'];
    if (part === undefined) {
        const endNode = options?.renderBefore ?? null;
        // This property needs to remain unminified.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        partOwnerNode['_$litPart$'] = part = new ChildPart$1(container.insertBefore(createMarker$1(), endNode), endNode, undefined, options ?? {});
    }
    part._$setValue(value);
    return part;
};

/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
// Contains either the minified or unminified `_$resolve` Directive method name.
let resolveMethodName = null;
/**
 * END USERS SHOULD NOT RELY ON THIS OBJECT.
 *
 * We currently do not make a mangled rollup build of the lit-ssr code. In order
 * to keep a number of (otherwise private) top-level exports mangled in the
 * client side code, we export a _$LH object containing those members (or
 * helper methods for accessing private fields of those members), and then
 * re-export them for use in lit-ssr. This keeps lit-ssr agnostic to whether the
 * client-side code is being used in `dev` mode or `prod` mode.
 * @private
 */
const _$LH = {
    boundAttributeSuffix: _$LH$1._boundAttributeSuffix,
    marker: _$LH$1._marker,
    markerMatch: _$LH$1._markerMatch,
    HTML_RESULT: _$LH$1._HTML_RESULT,
    getTemplateHtml: _$LH$1._getTemplateHtml,
    overrideDirectiveResolve: (directiveClass, resolveOverrideFn) => class extends directiveClass {
        _$resolve(_part, values) {
            return resolveOverrideFn(this, values);
        }
    },
    patchDirectiveResolve: (directiveClass, resolveOverrideFn) => {
        if (directiveClass.prototype._$resolve.name !== resolveOverrideFn.name) {
            resolveMethodName ??= directiveClass.prototype._$resolve
                .name;
            for (let proto = directiveClass.prototype; proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
                if (proto.hasOwnProperty(resolveMethodName)) {
                    proto[resolveMethodName] = resolveOverrideFn;
                    return;
                }
            }
            // Nothing was patched which indicates an error. The most likely error is
            // that somehow both minified and unminified lit code passed through this
            // codepath. This is possible as lit-labs/ssr contains its own lit-html
            // module as a dependency for server rendering client Lit code. If a
            // client contains multiple duplicate Lit modules with minified and
            // unminified exports, we currently cannot handle both.
            throw new Error(`Internal error: It is possible that both dev mode and production mode` +
                ` Lit was mixed together during SSR. Please comment on the issue: ` +
                `https://github.com/lit/lit/issues/4527`);
        }
    },
    setDirectiveClass(value, directiveClass) {
        // This property needs to remain unminified.
        value['_$litDirective$'] = directiveClass;
    },
    getAttributePartCommittedValue: (part, value, index) => {
        // Use the part setter to resolve directives/concatenate multiple parts
        // into a final value (captured by passing in a commitValue override)
        let committedValue = noChange;
        // Note that _commitValue need not be in `stableProperties` because this
        // method is only run on `AttributePart`s created by lit-ssr using the same
        // version of the library as this file
        part._commitValue = (value) => (committedValue = value);
        part._$setValue(value, part, index);
        return committedValue;
    },
    connectedDisconnectable: (props) => ({
        ...props,
        _$isConnected: true,
    }),
    resolveDirective: _$LH$1._resolveDirective,
    AttributePart: _$LH$1._AttributePart,
    PropertyPart: _$LH$1._PropertyPart,
    BooleanAttributePart: _$LH$1._BooleanAttributePart,
    EventPart: _$LH$1._EventPart,
    ElementPart: _$LH$1._ElementPart,
    TemplateInstance: _$LH$1._TemplateInstance,
    isIterable: _$LH$1._isIterable,
    ChildPart: _$LH$1._ChildPart,
};

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const PartType = {
    ATTRIBUTE: 1,
    CHILD: 2,
    PROPERTY: 3,
    BOOLEAN_ATTRIBUTE: 4,
    EVENT: 5,
    ELEMENT: 6,
};
/**
 * Creates a user-facing directive function from a Directive class. This
 * function has the same parameters as the directive's render() method.
 */
const directive = (c) => (...values) => ({
    // This property needs to remain unminified.
    ['_$litDirective$']: c,
    values,
});
/**
 * Base class for creating custom directives. Users should extend this class,
 * implement `render` and/or `update`, and then pass their subclass to
 * `directive`.
 */
class Directive {
    constructor(_partInfo) { }
    // See comment in Disconnectable interface for why this is a getter
    get _$isConnected() {
        return this._$parent._$isConnected;
    }
    /** @internal */
    _$initialize(part, parent, attributeIndex) {
        this.__part = part;
        this._$parent = parent;
        this.__attributeIndex = attributeIndex;
    }
    /** @internal */
    _$resolve(part, props) {
        return this.update(part, props);
    }
    update(_part, props) {
        return this.render(...props);
    }
}

/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { _ChildPart: ChildPart } = _$LH$1;
const wrap = (node) => node;
/**
 * Tests if a value is a primitive value.
 *
 * See https://tc39.github.io/ecma262/#sec-typeof-operator
 */
const isPrimitive = (value) => value === null || (typeof value != 'object' && typeof value != 'function');
/**
 * Tests if a value is a TemplateResult or a CompiledTemplateResult.
 */
const isTemplateResult = (value, type) => // This property needs to remain unminified.
        value?.['_$litType$'] !== undefined
    ;
/**
 * Tests if a value is a CompiledTemplateResult.
 */
const isCompiledTemplateResult = (value) => {
    return value?.['_$litType$']?.h != null;
};
/**
 * Tests whether a part has only a single-expression with no strings to
 * interpolate between.
 *
 * Only AttributePart and PropertyPart can have multiple expressions.
 * Multi-expression parts have a `strings` property and single-expression
 * parts do not.
 */
const isSingleExpression = (part) => part.strings === undefined;
const createMarker = () => document.createComment('');
/**
 * Inserts a ChildPart into the given container ChildPart's DOM, either at the
 * end of the container ChildPart, or before the optional `refPart`.
 *
 * This does not add the part to the containerPart's committed value. That must
 * be done by callers.
 *
 * @param containerPart Part within which to add the new ChildPart
 * @param refPart Part before which to add the new ChildPart; when omitted the
 *     part added to the end of the `containerPart`
 * @param part Part to insert, or undefined to create a new part
 */
const insertPart = (containerPart, refPart, part) => {
    const container = wrap(containerPart._$startNode).parentNode;
    const refNode = refPart === undefined ? containerPart._$endNode : refPart._$startNode;
    if (part === undefined) {
        const startNode = wrap(container).insertBefore(createMarker(), refNode);
        const endNode = wrap(container).insertBefore(createMarker(), refNode);
        part = new ChildPart(startNode, endNode, containerPart, containerPart.options);
    }
    else {
        const endNode = wrap(part._$endNode).nextSibling;
        const oldParent = part._$parent;
        const parentChanged = oldParent !== containerPart;
        if (parentChanged) {
            part._$reparentDisconnectables?.(containerPart);
            // Note that although `_$reparentDisconnectables` updates the part's
            // `_$parent` reference after unlinking from its current parent, that
            // method only exists if Disconnectables are present, so we need to
            // unconditionally set it here
            part._$parent = containerPart;
            // Since the _$isConnected getter is somewhat costly, only
            // read it once we know the subtree has directives that need
            // to be notified
            let newConnectionState;
            if (part._$notifyConnectionChanged !== undefined &&
                (newConnectionState = containerPart._$isConnected) !==
                    oldParent._$isConnected) {
                part._$notifyConnectionChanged(newConnectionState);
            }
        }
        if (endNode !== refNode || parentChanged) {
            let start = part._$startNode;
            while (start !== endNode) {
                const n = wrap(start).nextSibling;
                wrap(container).insertBefore(start, refNode);
                start = n;
            }
        }
    }
    return part;
};
/**
 * Sets the value of a Part.
 *
 * Note that this should only be used to set/update the value of user-created
 * parts (i.e. those created using `insertPart`); it should not be used
 * by directives to set the value of the directive's container part. Directives
 * should return a value from `update`/`render` to update their part state.
 *
 * For directives that require setting their part value asynchronously, they
 * should extend `AsyncDirective` and call `this.setValue()`.
 *
 * @param part Part to set
 * @param value Value to set
 * @param index For `AttributePart`s, the index to set
 * @param directiveParent Used internally; should not be set by user
 */
const setChildPartValue = (part, value, directiveParent = part) => {
    part._$setValue(value, directiveParent);
    return part;
};
// A sentinel value that can never appear as a part value except when set by
// live(). Used to force a dirty-check to fail and cause a re-render.
const RESET_VALUE = {};
/**
 * Sets the committed value of a ChildPart directly without triggering the
 * commit stage of the part.
 *
 * This is useful in cases where a directive needs to update the part such
 * that the next update detects a value change or not. When value is omitted,
 * the next update will be guaranteed to be detected as a change.
 *
 * @param part
 * @param value
 */
const setCommittedValue = (part, value = RESET_VALUE) => (part._$committedValue = value);
/**
 * Returns the committed value of a ChildPart.
 *
 * The committed value is used for change detection and efficient updates of
 * the part. It can differ from the value set by the template or directive in
 * cases where the template value is transformed before being committed.
 *
 * - `TemplateResult`s are committed as a `TemplateInstance`
 * - Iterables are committed as `Array<ChildPart>`
 * - All other types are committed as the template value or value returned or
 *   set by a directive.
 *
 * @param part
 */
const getCommittedValue = (part) => part._$committedValue;
/**
 * Removes a ChildPart from the DOM, including any of its content and markers.
 *
 * Note: The only difference between this and clearPart() is that this also
 * removes the part's start node. This means that the ChildPart must own its
 * start node, ie it must be a marker node specifically for this part and not an
 * anchor from surrounding content.
 *
 * @param part The Part to remove
 */
const removePart = (part) => {
    part._$clear();
    part._$startNode.remove();
};
const clearPart = (part) => {
    part._$clear();
};

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * Recursively walks down the tree of Parts/TemplateInstances/Directives to set
 * the connected state of directives and run `disconnected`/ `reconnected`
 * callbacks.
 *
 * @return True if there were children to disconnect; false otherwise
 */
const notifyChildrenConnectedChanged = (parent, isConnected) => {
    const children = parent._$disconnectableChildren;
    if (children === undefined) {
        return false;
    }
    for (const obj of children) {
        // The existence of `_$notifyDirectiveConnectionChanged` is used as a "brand" to
        // disambiguate AsyncDirectives from other DisconnectableChildren
        // (as opposed to using an instanceof check to know when to call it); the
        // redundancy of "Directive" in the API name is to avoid conflicting with
        // `_$notifyConnectionChanged`, which exists `ChildParts` which are also in
        // this list
        // Disconnect Directive (and any nested directives contained within)
        // This property needs to remain unminified.
        obj['_$notifyDirectiveConnectionChanged']?.(isConnected, false);
        // Disconnect Part/TemplateInstance
        notifyChildrenConnectedChanged(obj, isConnected);
    }
    return true;
};
/**
 * Removes the given child from its parent list of disconnectable children, and
 * if the parent list becomes empty as a result, removes the parent from its
 * parent, and so forth up the tree when that causes subsequent parent lists to
 * become empty.
 */
const removeDisconnectableFromParent = (obj) => {
    let parent, children;
    do {
        if ((parent = obj._$parent) === undefined) {
            break;
        }
        children = parent._$disconnectableChildren;
        children.delete(obj);
        obj = parent;
    } while (children?.size === 0);
};
const addDisconnectableToParent = (obj) => {
    // Climb the parent tree, creating a sparse tree of children needing
    // disconnection
    for (let parent; (parent = obj._$parent); obj = parent) {
        let children = parent._$disconnectableChildren;
        if (children === undefined) {
            parent._$disconnectableChildren = children = new Set();
        }
        else if (children.has(obj)) {
            // Once we've reached a parent that already contains this child, we
            // can short-circuit
            break;
        }
        children.add(obj);
        installDisconnectAPI(parent);
    }
};
/**
 * Changes the parent reference of the ChildPart, and updates the sparse tree of
 * Disconnectable children accordingly.
 *
 * Note, this method will be patched onto ChildPart instances and called from
 * the core code when parts are moved between different parents.
 */
function reparentDisconnectables(newParent) {
    if (this._$disconnectableChildren !== undefined) {
        removeDisconnectableFromParent(this);
        this._$parent = newParent;
        addDisconnectableToParent(this);
    }
    else {
        this._$parent = newParent;
    }
}
/**
 * Sets the connected state on any directives contained within the committed
 * value of this part (i.e. within a TemplateInstance or iterable of
 * ChildParts) and runs their `disconnected`/`reconnected`s, as well as within
 * any directives stored on the ChildPart (when `valueOnly` is false).
 *
 * `isClearingValue` should be passed as `true` on a top-level part that is
 * clearing itself, and not as a result of recursively disconnecting directives
 * as part of a `clear` operation higher up the tree. This both ensures that any
 * directive on this ChildPart that produced a value that caused the clear
 * operation is not disconnected, and also serves as a performance optimization
 * to avoid needless bookkeeping when a subtree is going away; when clearing a
 * subtree, only the top-most part need to remove itself from the parent.
 *
 * `fromPartIndex` is passed only in the case of a partial `_clear` running as a
 * result of truncating an iterable.
 *
 * Note, this method will be patched onto ChildPart instances and called from the
 * core code when parts are cleared or the connection state is changed by the
 * user.
 */
function notifyChildPartConnectedChanged(isConnected, isClearingValue = false, fromPartIndex = 0) {
    const value = this._$committedValue;
    const children = this._$disconnectableChildren;
    if (children === undefined || children.size === 0) {
        return;
    }
    if (isClearingValue) {
        if (Array.isArray(value)) {
            // Iterable case: Any ChildParts created by the iterable should be
            // disconnected and removed from this ChildPart's disconnectable
            // children (starting at `fromPartIndex` in the case of truncation)
            for (let i = fromPartIndex; i < value.length; i++) {
                notifyChildrenConnectedChanged(value[i], false);
                removeDisconnectableFromParent(value[i]);
            }
        }
        else if (value != null) {
            // TemplateInstance case: If the value has disconnectable children (will
            // only be in the case that it is a TemplateInstance), we disconnect it
            // and remove it from this ChildPart's disconnectable children
            notifyChildrenConnectedChanged(value, false);
            removeDisconnectableFromParent(value);
        }
    }
    else {
        notifyChildrenConnectedChanged(this, isConnected);
    }
}
/**
 * Patches disconnection API onto ChildParts.
 */
const installDisconnectAPI = (obj) => {
    if (obj.type == PartType.CHILD) {
        obj._$notifyConnectionChanged ??=
            notifyChildPartConnectedChanged;
        obj._$reparentDisconnectables ??= reparentDisconnectables;
    }
};
/**
 * An abstract `Directive` base class whose `disconnected` method will be
 * called when the part containing the directive is cleared as a result of
 * re-rendering, or when the user calls `part.setConnected(false)` on
 * a part that was previously rendered containing the directive (as happens
 * when e.g. a LitElement disconnects from the DOM).
 *
 * If `part.setConnected(true)` is subsequently called on a
 * containing part, the directive's `reconnected` method will be called prior
 * to its next `update`/`render` callbacks. When implementing `disconnected`,
 * `reconnected` should also be implemented to be compatible with reconnection.
 *
 * Note that updates may occur while the directive is disconnected. As such,
 * directives should generally check the `this.isConnected` flag during
 * render/update to determine whether it is safe to subscribe to resources
 * that may prevent garbage collection.
 */
class AsyncDirective extends Directive {
    constructor() {
        super(...arguments);
        // @internal
        this._$disconnectableChildren = undefined;
    }
    /**
     * Initialize the part with internal fields
     * @param part
     * @param parent
     * @param attributeIndex
     */
    _$initialize(part, parent, attributeIndex) {
        super._$initialize(part, parent, attributeIndex);
        addDisconnectableToParent(this);
        this.isConnected = part._$isConnected;
    }
    // This property needs to remain unminified.
    /**
     * Called from the core code when a directive is going away from a part (in
     * which case `shouldRemoveFromParent` should be true), and from the
     * `setChildrenConnected` helper function when recursively changing the
     * connection state of a tree (in which case `shouldRemoveFromParent` should
     * be false).
     *
     * @param isConnected
     * @param isClearingDirective - True when the directive itself is being
     *     removed; false when the tree is being disconnected
     * @internal
     */
    ['_$notifyDirectiveConnectionChanged'](isConnected, isClearingDirective = true) {
        if (isConnected !== this.isConnected) {
            this.isConnected = isConnected;
            if (isConnected) {
                this.reconnected?.();
            }
            else {
                this.disconnected?.();
            }
        }
        if (isClearingDirective) {
            notifyChildrenConnectedChanged(this, isConnected);
            removeDisconnectableFromParent(this);
        }
    }
    /**
     * Sets the value of the directive's Part outside the normal `update`/`render`
     * lifecycle of a directive.
     *
     * This method should not be called synchronously from a directive's `update`
     * or `render`.
     *
     * @param directive The directive to update
     * @param value The value to set
     */
    setValue(value) {
        if (isSingleExpression(this.__part)) {
            this.__part._$setValue(value, this);
        }
        else {
            const newValues = [...this.__part._$committedValue];
            newValues[this.__attributeIndex] = value;
            this.__part._$setValue(newValues, this, 0);
        }
    }
    /**
     * User callbacks for implementing logic to release any resources/subscriptions
     * that may have been retained by this directive. Since directives may also be
     * re-connected, `reconnected` should also be implemented to restore the
     * working state of the directive prior to the next render.
     */
    disconnected() { }
    reconnected() { }
}

/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * Creates a new Ref object, which is container for a reference to an element.
 */
const createRef = () => new Ref();
/**
 * An object that holds a ref value.
 */
class Ref {
}
// When callbacks are used for refs, this map tracks the last value the callback
// was called with, for ensuring a directive doesn't clear the ref if the ref
// has already been rendered to a new spot. It is double-keyed on both the
// context (`options.host`) and the callback, since we auto-bind class methods
// to `options.host`.
const lastElementForContextAndCallback = new WeakMap();
class RefDirective extends AsyncDirective {
    render(_ref) {
        return nothing;
    }
    update(part, [ref]) {
        const refChanged = ref !== this._ref;
        if (refChanged && this._ref !== undefined) {
            // The ref passed to the directive has changed;
            // unset the previous ref's value
            this._updateRefValue(undefined);
        }
        if (refChanged || this._lastElementForRef !== this._element) {
            // We either got a new ref or this is the first render;
            // store the ref/element & update the ref value
            this._ref = ref;
            this._context = part.options?.host;
            this._updateRefValue((this._element = part.element));
        }
        return nothing;
    }
    _updateRefValue(element) {
        if (!this.isConnected) {
            element = undefined;
        }
        if (typeof this._ref === 'function') {
            // If the current ref was called with a previous value, call with
            // `undefined`; We do this to ensure callbacks are called in a consistent
            // way regardless of whether a ref might be moving up in the tree (in
            // which case it would otherwise be called with the new value before the
            // previous one unsets it) and down in the tree (where it would be unset
            // before being set). Note that element lookup is keyed by
            // both the context and the callback, since we allow passing unbound
            // functions that are called on options.host, and we want to treat
            // these as unique "instances" of a function.
            const context = this._context ?? globalThis;
            let lastElementForCallback = lastElementForContextAndCallback.get(context);
            if (lastElementForCallback === undefined) {
                lastElementForCallback = new WeakMap();
                lastElementForContextAndCallback.set(context, lastElementForCallback);
            }
            if (lastElementForCallback.get(this._ref) !== undefined) {
                this._ref.call(this._context, undefined);
            }
            lastElementForCallback.set(this._ref, element);
            // Call the ref with the new element value
            if (element !== undefined) {
                this._ref.call(this._context, element);
            }
        }
        else {
            this._ref.value = element;
        }
    }
    get _lastElementForRef() {
        return typeof this._ref === 'function'
            ? lastElementForContextAndCallback
                .get(this._context ?? globalThis)
                ?.get(this._ref)
            : this._ref?.value;
    }
    disconnected() {
        // Only clear the box if our element is still the one in it (i.e. another
        // directive instance hasn't rendered its element to it before us); that
        // only happens in the event of the directive being cleared (not via manual
        // disconnection)
        if (this._lastElementForRef === this._element) {
            this._updateRefValue(undefined);
        }
    }
    reconnected() {
        // If we were manually disconnected, we can safely put our element back in
        // the box, since no rendering could have occurred to change its state
        this._updateRefValue(this._element);
    }
}
/**
 * Sets the value of a Ref object or calls a ref callback with the element it's
 * bound to.
 *
 * A Ref object acts as a container for a reference to an element. A ref
 * callback is a function that takes an element as its only argument.
 *
 * The ref directive sets the value of the Ref object or calls the ref callback
 * during rendering, if the referenced element changed.
 *
 * Note: If a ref callback is rendered to a different element position or is
 * removed in a subsequent render, it will first be called with `undefined`,
 * followed by another call with the new element it was rendered to (if any).
 *
 * ```js
 * // Using Ref object
 * const inputRef = createRef();
 * render(html`<input ${ref(inputRef)}>`, container);
 * inputRef.value.focus();
 *
 * // Using callback
 * const callback = (inputElement) => inputElement.focus();
 * render(html`<input ${ref(callback)}>`, container);
 * ```
 */
const ref = directive(RefDirective);

/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
// Note, this module is not included in package exports so that it's private to
// our first-party directives. If it ends up being useful, we can open it up and
// export it.
/**
 * Helper to iterate an AsyncIterable in its own closure.
 * @param iterable The iterable to iterate
 * @param callback The callback to call for each value. If the callback returns
 * `false`, the loop will be broken.
 */
const forAwaitOf = async (iterable, callback) => {
    for await (const v of iterable) {
        if ((await callback(v)) === false) {
            return;
        }
    }
};
/**
 * Holds a reference to an instance that can be disconnected and reconnected,
 * so that a closure over the ref (e.g. in a then function to a promise) does
 * not strongly hold a ref to the instance. Approximates a WeakRef but must
 * be manually connected & disconnected to the backing instance.
 */
class PseudoWeakRef {
    constructor(ref) {
        this._ref = ref;
    }
    /**
     * Disassociates the ref with the backing instance.
     */
    disconnect() {
        this._ref = undefined;
    }
    /**
     * Reassociates the ref with the backing instance.
     */
    reconnect(ref) {
        this._ref = ref;
    }
    /**
     * Retrieves the backing instance (will be undefined when disconnected)
     */
    deref() {
        return this._ref;
    }
}
/**
 * A helper to pause and resume waiting on a condition in an async function
 */
class Pauser {
    constructor() {
        this._promise = undefined;
        this._resolve = undefined;
    }
    /**
     * When paused, returns a promise to be awaited; when unpaused, returns
     * undefined. Note that in the microtask between the pauser being resumed
     * an await of this promise resolving, the pauser could be paused again,
     * hence callers should check the promise in a loop when awaiting.
     * @returns A promise to be awaited when paused or undefined
     */
    get() {
        return this._promise;
    }
    /**
     * Creates a promise to be awaited
     */
    pause() {
        this._promise ??= new Promise((resolve) => (this._resolve = resolve));
    }
    /**
     * Resolves the promise which may be awaited
     */
    resume() {
        this._resolve?.();
        this._promise = this._resolve = undefined;
    }
}

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
class AsyncReplaceDirective extends AsyncDirective {
    constructor() {
        super(...arguments);
        this.__weakThis = new PseudoWeakRef(this);
        this.__pauser = new Pauser();
    }
    // @ts-expect-error value not used, but we want a nice parameter for docs
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    render(value, _mapper) {
        return noChange;
    }
    update(_part, [value, mapper]) {
        // If our initial render occurs while disconnected, ensure that the pauser
        // and weakThis are in the disconnected state
        if (!this.isConnected) {
            this.disconnected();
        }
        // If we've already set up this particular iterable, we don't need
        // to do anything.
        if (value === this.__value) {
            return noChange;
        }
        this.__value = value;
        let i = 0;
        const { __weakThis: weakThis, __pauser: pauser } = this;
        // Note, the callback avoids closing over `this` so that the directive
        // can be gc'ed before the promise resolves; instead `this` is retrieved
        // from `weakThis`, which can break the hard reference in the closure when
        // the directive disconnects
        forAwaitOf(value, async (v) => {
            // The while loop here handles the case that the connection state
            // thrashes, causing the pauser to resume and then get re-paused
            while (pauser.get()) {
                await pauser.get();
            }
            // If the callback gets here and there is no `this`, it means that the
            // directive has been disconnected and garbage collected and we don't
            // need to do anything else
            const _this = weakThis.deref();
            if (_this !== undefined) {
                // Check to make sure that value is the still the current value of
                // the part, and if not bail because a new value owns this part
                if (_this.__value !== value) {
                    return false;
                }
                // As a convenience, because functional-programming-style
                // transforms of iterables and async iterables requires a library,
                // we accept a mapper function. This is especially convenient for
                // rendering a template for each item.
                if (mapper !== undefined) {
                    v = mapper(v, i);
                }
                _this.commitValue(v, i);
                i++;
            }
            return true;
        });
        return noChange;
    }
    // Override point for AsyncAppend to append rather than replace
    commitValue(value, _index) {
        this.setValue(value);
    }
    disconnected() {
        this.__weakThis.disconnect();
        this.__pauser.pause();
    }
    reconnected() {
        this.__weakThis.reconnect(this);
        this.__pauser.resume();
    }
}
/**
 * A directive that renders the items of an async iterable[1], replacing
 * previous values with new values, so that only one value is ever rendered
 * at a time. This directive may be used in any expression type.
 *
 * Async iterables are objects with a `[Symbol.asyncIterator]` method, which
 * returns an iterator who's `next()` method returns a Promise. When a new
 * value is available, the Promise resolves and the value is rendered to the
 * Part controlled by the directive. If another value other than this
 * directive has been set on the Part, the iterable will no longer be listened
 * to and new values won't be written to the Part.
 *
 * [1]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of
 *
 * @param value An async iterable
 * @param mapper An optional function that maps from (value, index) to another
 *     value. Useful for generating templates for each item in the iterable.
 */
const asyncReplace = directive(AsyncReplaceDirective);

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
class AsyncAppendDirective extends AsyncReplaceDirective {
    // Override AsyncReplace to narrow the allowed part type to ChildPart only
    constructor(partInfo) {
        super(partInfo);
        if (partInfo.type !== PartType.CHILD) {
            throw new Error('asyncAppend can only be used in child expressions');
        }
    }
    // Override AsyncReplace to save the part since we need to append into it
    update(part, params) {
        this.__childPart = part;
        return super.update(part, params);
    }
    // Override AsyncReplace to append rather than replace
    commitValue(value, index) {
        // When we get the first value, clear the part. This lets the
        // previous value display until we can replace it.
        if (index === 0) {
            clearPart(this.__childPart);
        }
        // Create and insert a new part and set its value to the next value
        const newPart = insertPart(this.__childPart);
        setChildPartValue(newPart, value);
    }
}
/**
 * A directive that renders the items of an async iterable[1], appending new
 * values after previous values, similar to the built-in support for iterables.
 * This directive is usable only in child expressions.
 *
 * Async iterables are objects with a [Symbol.asyncIterator] method, which
 * returns an iterator who's `next()` method returns a Promise. When a new
 * value is available, the Promise resolves and the value is appended to the
 * Part controlled by the directive. If another value other than this
 * directive has been set on the Part, the iterable will no longer be listened
 * to and new values won't be written to the Part.
 *
 * [1]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of
 *
 * @param value An async iterable
 * @param mapper An optional function that maps from (value, index) to another
 *     value. Useful for generating templates for each item in the iterable.
 */
const asyncAppend = directive(AsyncAppendDirective);

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * The template strings array contents are not compatible between the two
 * template result types as the compiled template contains a prepared string;
 * only use the returned template strings array as a cache key.
 */
const getStringsFromTemplateResult = (result) => isCompiledTemplateResult(result) ? result['_$litType$'].h : result.strings;
class CacheDirective extends Directive {
    constructor(partInfo) {
        super(partInfo);
        this._templateCache = new WeakMap();
    }
    render(v) {
        // Return an array of the value to induce lit-html to create a ChildPart
        // for the value that we can move into the cache.
        return [v];
    }
    update(containerPart, [v]) {
        const _valueKey = isTemplateResult(this._value)
            ? getStringsFromTemplateResult(this._value)
            : null;
        const vKey = isTemplateResult(v) ? getStringsFromTemplateResult(v) : null;
        // If the previous value is a TemplateResult and the new value is not,
        // or is a different Template as the previous value, move the child part
        // into the cache.
        if (_valueKey !== null && (vKey === null || _valueKey !== vKey)) {
            // This is always an array because we return [v] in render()
            const partValue = getCommittedValue(containerPart);
            const childPart = partValue.pop();
            let cachedContainerPart = this._templateCache.get(_valueKey);
            if (cachedContainerPart === undefined) {
                const fragment = document.createDocumentFragment();
                cachedContainerPart = render(nothing, fragment);
                cachedContainerPart.setConnected(false);
                this._templateCache.set(_valueKey, cachedContainerPart);
            }
            // Move into cache
            setCommittedValue(cachedContainerPart, [childPart]);
            insertPart(cachedContainerPart, undefined, childPart);
        }
        // If the new value is a TemplateResult and the previous value is not,
        // or is a different Template as the previous value, restore the child
        // part from the cache.
        if (vKey !== null) {
            if (_valueKey === null || _valueKey !== vKey) {
                const cachedContainerPart = this._templateCache.get(vKey);
                if (cachedContainerPart !== undefined) {
                    // Move the cached part back into the container part value
                    const partValue = getCommittedValue(cachedContainerPart);
                    const cachedPart = partValue.pop();
                    // Move cached part back into DOM
                    clearPart(containerPart);
                    insertPart(containerPart, undefined, cachedPart);
                    setCommittedValue(containerPart, [cachedPart]);
                }
            }
            // Because vKey is non null, v must be a TemplateResult.
            this._value = v;
        }
        else {
            this._value = undefined;
        }
        return this.render(v);
    }
}
/**
 * Enables fast switching between multiple templates by caching the DOM nodes
 * and TemplateInstances produced by the templates.
 *
 * Example:
 *
 * ```js
 * let checked = false;
 *
 * html`
 *   ${cache(checked ? html`input is checked` : html`input is not checked`)}
 * `
 * ```
 */
const cache = directive(CacheDirective);

/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * Chooses and evaluates a template function from a list based on matching
 * the given `value` to a case.
 *
 * Cases are structured as `[caseValue, func]`. `value` is matched to
 * `caseValue` by strict equality. The first match is selected. Case values
 * can be of any type including primitives, objects, and symbols.
 *
 * This is similar to a switch statement, but as an expression and without
 * fallthrough.
 *
 * @example
 *
 * ```ts
 * render() {
 *   return html`
 *     ${choose(this.section, [
 *       ['home', () => html`<h1>Home</h1>`],
 *       ['about', () => html`<h1>About</h1>`]
 *     ],
 *     () => html`<h1>Error</h1>`)}
 *   `;
 * }
 * ```
 */
const choose = (value, cases, defaultCase) => {
    for (const c of cases) {
        const caseValue = c[0];
        if (caseValue === value) {
            const fn = c[1];
            return fn();
        }
    }
    return defaultCase?.();
};

/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
class ClassMapDirective extends Directive {
    constructor(partInfo) {
        super(partInfo);
        if (partInfo.type !== PartType.ATTRIBUTE ||
            partInfo.name !== 'class' ||
            partInfo.strings?.length > 2) {
            throw new Error('`classMap()` can only be used in the `class` attribute ' +
                'and must be the only part in the attribute.');
        }
    }
    render(classInfo) {
        // Add spaces to ensure separation from static classes
        return (' ' +
            Object.keys(classInfo)
                .filter((key) => classInfo[key])
                .join(' ') +
            ' ');
    }
    update(part, [classInfo]) {
        // Remember dynamic classes on the first render
        if (this._previousClasses === undefined) {
            this._previousClasses = new Set();
            if (part.strings !== undefined) {
                this._staticClasses = new Set(part.strings
                    .join(' ')
                    .split(/\s/)
                    .filter((s) => s !== ''));
            }
            for (const name in classInfo) {
                if (classInfo[name] && !this._staticClasses?.has(name)) {
                    this._previousClasses.add(name);
                }
            }
            return this.render(classInfo);
        }
        const classList = part.element.classList;
        // Remove old classes that no longer apply
        for (const name of this._previousClasses) {
            if (!(name in classInfo)) {
                classList.remove(name);
                this._previousClasses.delete(name);
            }
        }
        // Add or remove classes based on their classMap value
        for (const name in classInfo) {
            // We explicitly want a loose truthy check of `value` because it seems
            // more convenient that '' and 0 are skipped.
            const value = !!classInfo[name];
            if (value !== this._previousClasses.has(name) &&
                !this._staticClasses?.has(name)) {
                if (value) {
                    classList.add(name);
                    this._previousClasses.add(name);
                }
                else {
                    classList.remove(name);
                    this._previousClasses.delete(name);
                }
            }
        }
        return noChange;
    }
}
/**
 * A directive that applies dynamic CSS classes.
 *
 * This must be used in the `class` attribute and must be the only part used in
 * the attribute. It takes each property in the `classInfo` argument and adds
 * the property name to the element's `classList` if the property value is
 * truthy; if the property value is falsy, the property name is removed from
 * the element's `class`.
 *
 * For example `{foo: bar}` applies the class `foo` if the value of `bar` is
 * truthy.
 *
 * @param classInfo
 */
const classMap = directive(ClassMapDirective);

/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
// A sentinel that indicates guard() hasn't rendered anything yet
const initialValue = {};
class GuardDirective extends Directive {
    constructor() {
        super(...arguments);
        this._previousValue = initialValue;
    }
    render(_value, f) {
        return f();
    }
    update(_part, [value, f]) {
        if (Array.isArray(value)) {
            // Dirty-check arrays by item
            if (Array.isArray(this._previousValue) &&
                this._previousValue.length === value.length &&
                value.every((v, i) => v === this._previousValue[i])) {
                return noChange;
            }
        }
        else if (this._previousValue === value) {
            // Dirty-check non-arrays by identity
            return noChange;
        }
        // Copy the value if it's an array so that if it's mutated we don't forget
        // what the previous values were.
        this._previousValue = Array.isArray(value) ? Array.from(value) : value;
        const r = this.render(value, f);
        return r;
    }
}
/**
 * Prevents re-render of a template function until a single value or an array of
 * values changes.
 *
 * Values are checked against previous values with strict equality (`===`), and
 * so the check won't detect nested property changes inside objects or arrays.
 * Arrays values have each item checked against the previous value at the same
 * index with strict equality. Nested arrays are also checked only by strict
 * equality.
 *
 * Example:
 *
 * ```js
 * html`
 *   <div>
 *     ${guard([user.id, company.id], () => html`...`)}
 *   </div>
 * `
 * ```
 *
 * In this case, the template only rerenders if either `user.id` or `company.id`
 * changes.
 *
 * guard() is useful with immutable data patterns, by preventing expensive work
 * until data updates.
 *
 * Example:
 *
 * ```js
 * html`
 *   <div>
 *     ${guard([immutableItems], () => immutableItems.map(i => html`${i}`))}
 *   </div>
 * `
 * ```
 *
 * In this case, items are mapped over only when the array reference changes.
 *
 * @param value the value to check before re-rendering
 * @param f the template function
 */
const guard = directive(GuardDirective);

/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * For AttributeParts, sets the attribute if the value is defined and removes
 * the attribute if the value is undefined.
 *
 * For other part types, this directive is a no-op.
 */
const ifDefined = (value) => value ?? nothing;

/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function* join(items, joiner) {
    const isFunction = typeof joiner === 'function';
    if (items !== undefined) {
        let i = -1;
        for (const value of items) {
            if (i > -1) {
                yield isFunction ? joiner(i) : joiner;
            }
            i++;
            yield value;
        }
    }
}

/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
class Keyed extends Directive {
    constructor() {
        super(...arguments);
        this.key = nothing;
    }
    render(k, v) {
        this.key = k;
        return v;
    }
    update(part, [k, v]) {
        if (k !== this.key) {
            // Clear the part before returning a value. The one-arg form of
            // setCommittedValue sets the value to a sentinel which forces a
            // commit the next render.
            setCommittedValue(part);
            this.key = k;
        }
        return v;
    }
}
/**
 * Associates a renderable value with a unique key. When the key changes, the
 * previous DOM is removed and disposed before rendering the next value, even
 * if the value - such as a template - is the same.
 *
 * This is useful for forcing re-renders of stateful components, or working
 * with code that expects new data to generate new HTML elements, such as some
 * animation techniques.
 */
const keyed = directive(Keyed);

/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
class LiveDirective extends Directive {
    constructor(partInfo) {
        super(partInfo);
        if (!(partInfo.type === PartType.PROPERTY ||
            partInfo.type === PartType.ATTRIBUTE ||
            partInfo.type === PartType.BOOLEAN_ATTRIBUTE)) {
            throw new Error('The `live` directive is not allowed on child or event bindings');
        }
        if (!isSingleExpression(partInfo)) {
            throw new Error('`live` bindings can only contain a single expression');
        }
    }
    render(value) {
        return value;
    }
    update(part, [value]) {
        if (value === noChange || value === nothing) {
            return value;
        }
        const element = part.element;
        const name = part.name;
        if (part.type === PartType.PROPERTY) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (value === element[name]) {
                return noChange;
            }
        }
        else if (part.type === PartType.BOOLEAN_ATTRIBUTE) {
            if (!!value === element.hasAttribute(name)) {
                return noChange;
            }
        }
        else if (part.type === PartType.ATTRIBUTE) {
            if (element.getAttribute(name) === String(value)) {
                return noChange;
            }
        }
        // Resets the part's value, causing its dirty-check to fail so that it
        // always sets the value.
        setCommittedValue(part);
        return value;
    }
}
/**
 * Checks binding values against live DOM values, instead of previously bound
 * values, when determining whether to update the value.
 *
 * This is useful for cases where the DOM value may change from outside of
 * lit-html, such as with a binding to an `<input>` element's `value` property,
 * a content editable elements text, or to a custom element that changes it's
 * own properties or attributes.
 *
 * In these cases if the DOM value changes, but the value set through lit-html
 * bindings hasn't, lit-html won't know to update the DOM value and will leave
 * it alone. If this is not what you want--if you want to overwrite the DOM
 * value with the bound value no matter what--use the `live()` directive:
 *
 * ```js
 * html`<input .value=${live(x)}>`
 * ```
 *
 * `live()` performs a strict equality check against the live DOM value, and if
 * the new value is equal to the live value, does nothing. This means that
 * `live()` should not be used when the binding will cause a type conversion. If
 * you use `live()` with an attribute binding, make sure that only strings are
 * passed in, or the binding will update every render.
 */
const live = directive(LiveDirective);

/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * Returns an iterable containing the result of calling `f(value)` on each
 * value in `items`.
 *
 * @example
 *
 * ```ts
 * render() {
 *   return html`
 *     <ul>
 *       ${map(items, (i) => html`<li>${i}</li>`)}
 *     </ul>
 *   `;
 * }
 * ```
 */
function* map(items, f) {
    if (items !== undefined) {
        let i = 0;
        for (const value of items) {
            yield f(value, i++);
        }
    }
}

/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function* range(startOrEnd, end, step = 1) {
    const start = end === undefined ? 0 : startOrEnd;
    end ??= startOrEnd;
    for (let i = start; step > 0 ? i < end : end < i; i += step) {
        yield i;
    }
}

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
// Helper for generating a map of array item to its index over a subset
// of an array (used to lazily generate `newKeyToIndexMap` and
// `oldKeyToIndexMap`)
const generateMap = (list, start, end) => {
    const map = new Map();
    for (let i = start; i <= end; i++) {
        map.set(list[i], i);
    }
    return map;
};
class RepeatDirective extends Directive {
    constructor(partInfo) {
        super(partInfo);
        if (partInfo.type !== PartType.CHILD) {
            throw new Error('repeat() can only be used in text expressions');
        }
    }
    _getValuesAndKeys(items, keyFnOrTemplate, template) {
        let keyFn;
        if (template === undefined) {
            template = keyFnOrTemplate;
        }
        else if (keyFnOrTemplate !== undefined) {
            keyFn = keyFnOrTemplate;
        }
        const keys = [];
        const values = [];
        let index = 0;
        for (const item of items) {
            keys[index] = keyFn ? keyFn(item, index) : index;
            values[index] = template(item, index);
            index++;
        }
        return {
            values,
            keys,
        };
    }
    render(items, keyFnOrTemplate, template) {
        return this._getValuesAndKeys(items, keyFnOrTemplate, template).values;
    }
    update(containerPart, [items, keyFnOrTemplate, template]) {
        // Old part & key lists are retrieved from the last update (which may
        // be primed by hydration)
        const oldParts = getCommittedValue(containerPart);
        const { values: newValues, keys: newKeys } = this._getValuesAndKeys(items, keyFnOrTemplate, template);
        // We check that oldParts, the committed value, is an Array as an
        // indicator that the previous value came from a repeat() call. If
        // oldParts is not an Array then this is the first render and we return
        // an array for lit-html's array handling to render, and remember the
        // keys.
        if (!Array.isArray(oldParts)) {
            this._itemKeys = newKeys;
            return newValues;
        }
        // In SSR hydration it's possible for oldParts to be an array but for us
        // to not have item keys because the update() hasn't run yet. We set the
        // keys to an empty array. This will cause all oldKey/newKey comparisons
        // to fail and execution to fall to the last nested brach below which
        // reuses the oldPart.
        const oldKeys = (this._itemKeys ??= []);
        // New part list will be built up as we go (either reused from
        // old parts or created for new keys in this update). This is
        // saved in the above cache at the end of the update.
        const newParts = [];
        // Maps from key to index for current and previous update; these
        // are generated lazily only when needed as a performance
        // optimization, since they are only required for multiple
        // non-contiguous changes in the list, which are less common.
        let newKeyToIndexMap;
        let oldKeyToIndexMap;
        // Head and tail pointers to old parts and new values
        let oldHead = 0;
        let oldTail = oldParts.length - 1;
        let newHead = 0;
        let newTail = newValues.length - 1;
        // Overview of O(n) reconciliation algorithm (general approach
        // based on ideas found in ivi, vue, snabbdom, etc.):
        //
        // * We start with the list of old parts and new values (and
        //   arrays of their respective keys), head/tail pointers into
        //   each, and we build up the new list of parts by updating
        //   (and when needed, moving) old parts or creating new ones.
        //   The initial scenario might look like this (for brevity of
        //   the diagrams, the numbers in the array reflect keys
        //   associated with the old parts or new values, although keys
        //   and parts/values are actually stored in parallel arrays
        //   indexed using the same head/tail pointers):
        //
        //      oldHead v                 v oldTail
        //   oldKeys:  [0, 1, 2, 3, 4, 5, 6]
        //   newParts: [ ,  ,  ,  ,  ,  ,  ]
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6] <- reflects the user's new
        //                                      item order
        //      newHead ^                 ^ newTail
        //
        // * Iterate old & new lists from both sides, updating,
        //   swapping, or removing parts at the head/tail locations
        //   until neither head nor tail can move.
        //
        // * Example below: keys at head pointers match, so update old
        //   part 0 in-place (no need to move it) and record part 0 in
        //   the `newParts` list. The last thing we do is advance the
        //   `oldHead` and `newHead` pointers (will be reflected in the
        //   next diagram).
        //
        //      oldHead v                 v oldTail
        //   oldKeys:  [0, 1, 2, 3, 4, 5, 6]
        //   newParts: [0,  ,  ,  ,  ,  ,  ] <- heads matched: update 0
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6]    and advance both oldHead
        //                                      & newHead
        //      newHead ^                 ^ newTail
        //
        // * Example below: head pointers don't match, but tail
        //   pointers do, so update part 6 in place (no need to move
        //   it), and record part 6 in the `newParts` list. Last,
        //   advance the `oldTail` and `oldHead` pointers.
        //
        //         oldHead v              v oldTail
        //   oldKeys:  [0, 1, 2, 3, 4, 5, 6]
        //   newParts: [0,  ,  ,  ,  ,  , 6] <- tails matched: update 6
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6]    and advance both oldTail
        //                                      & newTail
        //         newHead ^              ^ newTail
        //
        // * If neither head nor tail match; next check if one of the
        //   old head/tail items was removed. We first need to generate
        //   the reverse map of new keys to index (`newKeyToIndexMap`),
        //   which is done once lazily as a performance optimization,
        //   since we only hit this case if multiple non-contiguous
        //   changes were made. Note that for contiguous removal
        //   anywhere in the list, the head and tails would advance
        //   from either end and pass each other before we get to this
        //   case and removals would be handled in the final while loop
        //   without needing to generate the map.
        //
        // * Example below: The key at `oldTail` was removed (no longer
        //   in the `newKeyToIndexMap`), so remove that part from the
        //   DOM and advance just the `oldTail` pointer.
        //
        //         oldHead v           v oldTail
        //   oldKeys:  [0, 1, 2, 3, 4, 5, 6]
        //   newParts: [0,  ,  ,  ,  ,  , 6] <- 5 not in new map: remove
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6]    5 and advance oldTail
        //         newHead ^           ^ newTail
        //
        // * Once head and tail cannot move, any mismatches are due to
        //   either new or moved items; if a new key is in the previous
        //   "old key to old index" map, move the old part to the new
        //   location, otherwise create and insert a new part. Note
        //   that when moving an old part we null its position in the
        //   oldParts array if it lies between the head and tail so we
        //   know to skip it when the pointers get there.
        //
        // * Example below: neither head nor tail match, and neither
        //   were removed; so find the `newHead` key in the
        //   `oldKeyToIndexMap`, and move that old part's DOM into the
        //   next head position (before `oldParts[oldHead]`). Last,
        //   null the part in the `oldPart` array since it was
        //   somewhere in the remaining oldParts still to be scanned
        //   (between the head and tail pointers) so that we know to
        //   skip that old part on future iterations.
        //
        //         oldHead v        v oldTail
        //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
        //   newParts: [0, 2,  ,  ,  ,  , 6] <- stuck: update & move 2
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6]    into place and advance
        //                                      newHead
        //         newHead ^           ^ newTail
        //
        // * Note that for moves/insertions like the one above, a part
        //   inserted at the head pointer is inserted before the
        //   current `oldParts[oldHead]`, and a part inserted at the
        //   tail pointer is inserted before `newParts[newTail+1]`. The
        //   seeming asymmetry lies in the fact that new parts are
        //   moved into place outside in, so to the right of the head
        //   pointer are old parts, and to the right of the tail
        //   pointer are new parts.
        //
        // * We always restart back from the top of the algorithm,
        //   allowing matching and simple updates in place to
        //   continue...
        //
        // * Example below: the head pointers once again match, so
        //   simply update part 1 and record it in the `newParts`
        //   array.  Last, advance both head pointers.
        //
        //         oldHead v        v oldTail
        //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
        //   newParts: [0, 2, 1,  ,  ,  , 6] <- heads matched: update 1
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6]    and advance both oldHead
        //                                      & newHead
        //            newHead ^        ^ newTail
        //
        // * As mentioned above, items that were moved as a result of
        //   being stuck (the final else clause in the code below) are
        //   marked with null, so we always advance old pointers over
        //   these so we're comparing the next actual old value on
        //   either end.
        //
        // * Example below: `oldHead` is null (already placed in
        //   newParts), so advance `oldHead`.
        //
        //            oldHead v     v oldTail
        //   oldKeys:  [0, 1, -, 3, 4, 5, 6] <- old head already used:
        //   newParts: [0, 2, 1,  ,  ,  , 6]    advance oldHead
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6]
        //               newHead ^     ^ newTail
        //
        // * Note it's not critical to mark old parts as null when they
        //   are moved from head to tail or tail to head, since they
        //   will be outside the pointer range and never visited again.
        //
        // * Example below: Here the old tail key matches the new head
        //   key, so the part at the `oldTail` position and move its
        //   DOM to the new head position (before `oldParts[oldHead]`).
        //   Last, advance `oldTail` and `newHead` pointers.
        //
        //               oldHead v  v oldTail
        //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
        //   newParts: [0, 2, 1, 4,  ,  , 6] <- old tail matches new
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6]   head: update & move 4,
        //                                     advance oldTail & newHead
        //               newHead ^     ^ newTail
        //
        // * Example below: Old and new head keys match, so update the
        //   old head part in place, and advance the `oldHead` and
        //   `newHead` pointers.
        //
        //               oldHead v oldTail
        //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
        //   newParts: [0, 2, 1, 4, 3,   ,6] <- heads match: update 3
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6]    and advance oldHead &
        //                                      newHead
        //                  newHead ^  ^ newTail
        //
        // * Once the new or old pointers move past each other then all
        //   we have left is additions (if old list exhausted) or
        //   removals (if new list exhausted). Those are handled in the
        //   final while loops at the end.
        //
        // * Example below: `oldHead` exceeded `oldTail`, so we're done
        //   with the main loop.  Create the remaining part and insert
        //   it at the new head position, and the update is complete.
        //
        //                   (oldHead > oldTail)
        //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
        //   newParts: [0, 2, 1, 4, 3, 7 ,6] <- create and insert 7
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6]
        //                     newHead ^ newTail
        //
        // * Note that the order of the if/else clauses is not
        //   important to the algorithm, as long as the null checks
        //   come first (to ensure we're always working on valid old
        //   parts) and that the final else clause comes last (since
        //   that's where the expensive moves occur). The order of
        //   remaining clauses is just a simple guess at which cases
        //   will be most common.
        //
        // * Note, we could calculate the longest
        //   increasing subsequence (LIS) of old items in new position,
        //   and only move those not in the LIS set. However that costs
        //   O(nlogn) time and adds a bit more code, and only helps
        //   make rare types of mutations require fewer moves. The
        //   above handles removes, adds, reversal, swaps, and single
        //   moves of contiguous items in linear time, in the minimum
        //   number of moves. As the number of multiple moves where LIS
        //   might help approaches a random shuffle, the LIS
        //   optimization becomes less helpful, so it seems not worth
        //   the code at this point. Could reconsider if a compelling
        //   case arises.
        while (oldHead <= oldTail && newHead <= newTail) {
            if (oldParts[oldHead] === null) {
                // `null` means old part at head has already been used
                // below; skip
                oldHead++;
            }
            else if (oldParts[oldTail] === null) {
                // `null` means old part at tail has already been used
                // below; skip
                oldTail--;
            }
            else if (oldKeys[oldHead] === newKeys[newHead]) {
                // Old head matches new head; update in place
                newParts[newHead] = setChildPartValue(oldParts[oldHead], newValues[newHead]);
                oldHead++;
                newHead++;
            }
            else if (oldKeys[oldTail] === newKeys[newTail]) {
                // Old tail matches new tail; update in place
                newParts[newTail] = setChildPartValue(oldParts[oldTail], newValues[newTail]);
                oldTail--;
                newTail--;
            }
            else if (oldKeys[oldHead] === newKeys[newTail]) {
                // Old head matches new tail; update and move to new tail
                newParts[newTail] = setChildPartValue(oldParts[oldHead], newValues[newTail]);
                insertPart(containerPart, newParts[newTail + 1], oldParts[oldHead]);
                oldHead++;
                newTail--;
            }
            else if (oldKeys[oldTail] === newKeys[newHead]) {
                // Old tail matches new head; update and move to new head
                newParts[newHead] = setChildPartValue(oldParts[oldTail], newValues[newHead]);
                insertPart(containerPart, oldParts[oldHead], oldParts[oldTail]);
                oldTail--;
                newHead++;
            }
            else {
                if (newKeyToIndexMap === undefined) {
                    // Lazily generate key-to-index maps, used for removals &
                    // moves below
                    newKeyToIndexMap = generateMap(newKeys, newHead, newTail);
                    oldKeyToIndexMap = generateMap(oldKeys, oldHead, oldTail);
                }
                if (!newKeyToIndexMap.has(oldKeys[oldHead])) {
                    // Old head is no longer in new list; remove
                    removePart(oldParts[oldHead]);
                    oldHead++;
                }
                else if (!newKeyToIndexMap.has(oldKeys[oldTail])) {
                    // Old tail is no longer in new list; remove
                    removePart(oldParts[oldTail]);
                    oldTail--;
                }
                else {
                    // Any mismatches at this point are due to additions or
                    // moves; see if we have an old part we can reuse and move
                    // into place
                    const oldIndex = oldKeyToIndexMap.get(newKeys[newHead]);
                    const oldPart = oldIndex !== undefined ? oldParts[oldIndex] : null;
                    if (oldPart === null) {
                        // No old part for this value; create a new one and
                        // insert it
                        const newPart = insertPart(containerPart, oldParts[oldHead]);
                        setChildPartValue(newPart, newValues[newHead]);
                        newParts[newHead] = newPart;
                    }
                    else {
                        // Reuse old part
                        newParts[newHead] = setChildPartValue(oldPart, newValues[newHead]);
                        insertPart(containerPart, oldParts[oldHead], oldPart);
                        // This marks the old part as having been used, so that
                        // it will be skipped in the first two checks above
                        oldParts[oldIndex] = null;
                    }
                    newHead++;
                }
            }
        }
        // Add parts for any remaining new values
        while (newHead <= newTail) {
            // For all remaining additions, we insert before last new
            // tail, since old pointers are no longer valid
            const newPart = insertPart(containerPart, newParts[newTail + 1]);
            setChildPartValue(newPart, newValues[newHead]);
            newParts[newHead++] = newPart;
        }
        // Remove any remaining unused old parts
        while (oldHead <= oldTail) {
            const oldPart = oldParts[oldHead++];
            if (oldPart !== null) {
                removePart(oldPart);
            }
        }
        // Save order of new parts for next round
        this._itemKeys = newKeys;
        // Directly set part value, bypassing it's dirty-checking
        setCommittedValue(containerPart, newParts);
        return noChange;
    }
}
/**
 * A directive that repeats a series of values (usually `TemplateResults`)
 * generated from an iterable, and updates those items efficiently when the
 * iterable changes based on user-provided `keys` associated with each item.
 *
 * Note that if a `keyFn` is provided, strict key-to-DOM mapping is maintained,
 * meaning previous DOM for a given key is moved into the new position if
 * needed, and DOM will never be reused with values for different keys (new DOM
 * will always be created for new keys). This is generally the most efficient
 * way to use `repeat` since it performs minimum unnecessary work for insertions
 * and removals.
 *
 * The `keyFn` takes two parameters, the item and its index, and returns a unique key value.
 *
 * ```js
 * html`
 *   <ol>
 *     ${repeat(this.items, (item) => item.id, (item, index) => {
 *       return html`<li>${index}: ${item.name}</li>`;
 *     })}
 *   </ol>
 * `
 * ```
 *
 * **Important**: If providing a `keyFn`, keys *must* be unique for all items in a
 * given call to `repeat`. The behavior when two or more items have the same key
 * is undefined.
 *
 * If no `keyFn` is provided, this directive will perform similar to mapping
 * items to values, and DOM will be reused against potentially different items.
 */
const repeat = directive(RepeatDirective);

/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const important = 'important';
// The leading space is important
const importantFlag = ' !' + important;
// How many characters to remove from a value, as a negative number
const flagTrim = 0 - importantFlag.length;
class StyleMapDirective extends Directive {
    constructor(partInfo) {
        super(partInfo);
        if (partInfo.type !== PartType.ATTRIBUTE ||
            partInfo.name !== 'style' ||
            partInfo.strings?.length > 2) {
            throw new Error('The `styleMap` directive must be used in the `style` attribute ' +
                'and must be the only part in the attribute.');
        }
    }
    render(styleInfo) {
        return Object.keys(styleInfo).reduce((style, prop) => {
            const value = styleInfo[prop];
            if (value == null) {
                return style;
            }
            // Convert property names from camel-case to dash-case, i.e.:
            //  `backgroundColor` -> `background-color`
            // Vendor-prefixed names need an extra `-` appended to front:
            //  `webkitAppearance` -> `-webkit-appearance`
            // Exception is any property name containing a dash, including
            // custom properties; we assume these are already dash-cased i.e.:
            //  `--my-button-color` --> `--my-button-color`
            prop = prop.includes('-')
                ? prop
                : prop
                    .replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g, '-$&')
                    .toLowerCase();
            return style + `${prop}:${value};`;
        }, '');
    }
    update(part, [styleInfo]) {
        const { style } = part.element;
        if (this._previousStyleProperties === undefined) {
            this._previousStyleProperties = new Set(Object.keys(styleInfo));
            return this.render(styleInfo);
        }
        // Remove old properties that no longer exist in styleInfo
        for (const name of this._previousStyleProperties) {
            // If the name isn't in styleInfo or it's null/undefined
            if (styleInfo[name] == null) {
                this._previousStyleProperties.delete(name);
                if (name.includes('-')) {
                    style.removeProperty(name);
                }
                else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    style[name] = null;
                }
            }
        }
        // Add or update properties
        for (const name in styleInfo) {
            const value = styleInfo[name];
            if (value != null) {
                this._previousStyleProperties.add(name);
                const isImportant = typeof value === 'string' && value.endsWith(importantFlag);
                if (name.includes('-') || isImportant) {
                    style.setProperty(name, isImportant
                        ? value.slice(0, flagTrim)
                        : value, isImportant ? important : '');
                }
                else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    style[name] = value;
                }
            }
        }
        return noChange;
    }
}
/**
 * A directive that applies CSS properties to an element.
 *
 * `styleMap` can only be used in the `style` attribute and must be the only
 * expression in the attribute. It takes the property names in the
 * {@link StyleInfo styleInfo} object and adds the properties to the inline
 * style of the element.
 *
 * Property names with dashes (`-`) are assumed to be valid CSS
 * property names and set on the element's style object using `setProperty()`.
 * Names without dashes are assumed to be camelCased JavaScript property names
 * and set on the element's style object using property assignment, allowing the
 * style object to translate JavaScript-style names to CSS property names.
 *
 * For example `styleMap({backgroundColor: 'red', 'border-top': '5px', '--size':
 * '0'})` sets the `background-color`, `border-top` and `--size` properties.
 *
 * @param styleInfo
 * @see {@link https://lit.dev/docs/templates/directives/#stylemap styleMap code samples on Lit.dev}
 */
const styleMap = directive(StyleMapDirective);

/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
class TemplateContentDirective extends Directive {
    constructor(partInfo) {
        super(partInfo);
        if (partInfo.type !== PartType.CHILD) {
            throw new Error('templateContent can only be used in child bindings');
        }
    }
    render(template) {
        if (this._previousTemplate === template) {
            return noChange;
        }
        this._previousTemplate = template;
        return document.importNode(template.content, true);
    }
}
/**
 * Renders the content of a template element as HTML.
 *
 * Note, the template should be developer controlled and not user controlled.
 * Rendering a user-controlled template with this directive
 * could lead to cross-site-scripting vulnerabilities.
 */
const templateContent = directive(TemplateContentDirective);

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const HTML_RESULT = 1;
class UnsafeHTMLDirective extends Directive {
    constructor(partInfo) {
        super(partInfo);
        this._value = nothing;
        if (partInfo.type !== PartType.CHILD) {
            throw new Error(`${this.constructor.directiveName}() can only be used in child bindings`);
        }
    }
    render(value) {
        if (value === nothing || value == null) {
            this._templateResult = undefined;
            return (this._value = value);
        }
        if (value === noChange) {
            return value;
        }
        if (typeof value != 'string') {
            throw new Error(`${this.constructor.directiveName}() called with a non-string value`);
        }
        if (value === this._value) {
            return this._templateResult;
        }
        this._value = value;
        const strings = [value];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        strings.raw = strings;
        // WARNING: impersonating a TemplateResult like this is extremely
        // dangerous. Third-party directives should not do this.
        return (this._templateResult = {
            // Cast to a known set of integers that satisfy ResultType so that we
            // don't have to export ResultType and possibly encourage this pattern.
            // This property needs to remain unminified.
            ['_$litType$']: this.constructor
                .resultType,
            strings,
            values: [],
        });
    }
}
UnsafeHTMLDirective.directiveName = 'unsafeHTML';
UnsafeHTMLDirective.resultType = HTML_RESULT;
/**
 * Renders the result as HTML, rather than text.
 *
 * The values `undefined`, `null`, and `nothing`, will all result in no content
 * (empty string) being rendered.
 *
 * Note, this is unsafe to use with any user-provided input that hasn't been
 * sanitized or escaped, as it may lead to cross-site-scripting
 * vulnerabilities.
 */
const unsafeHTML = directive(UnsafeHTMLDirective);

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const SVG_RESULT = 2;
class UnsafeSVGDirective extends UnsafeHTMLDirective {
}
UnsafeSVGDirective.directiveName = 'unsafeSVG';
UnsafeSVGDirective.resultType = SVG_RESULT;
/**
 * Renders the result as SVG, rather than text.
 *
 * The values `undefined`, `null`, and `nothing`, will all result in no content
 * (empty string) being rendered.
 *
 * Note, this is unsafe to use with any user-provided input that hasn't been
 * sanitized or escaped, as it may lead to cross-site-scripting
 * vulnerabilities.
 */
const unsafeSVG = directive(UnsafeSVGDirective);

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const isPromise = (x) => {
    return !isPrimitive(x) && typeof x.then === 'function';
};
// Effectively infinity, but a SMI.
const _infinity = 0x3fffffff;
class UntilDirective extends AsyncDirective {
    constructor() {
        super(...arguments);
        this.__lastRenderedIndex = _infinity;
        this.__values = [];
        this.__weakThis = new PseudoWeakRef(this);
        this.__pauser = new Pauser();
    }
    render(...args) {
        return args.find((x) => !isPromise(x)) ?? noChange;
    }
    update(_part, args) {
        const previousValues = this.__values;
        let previousLength = previousValues.length;
        this.__values = args;
        const weakThis = this.__weakThis;
        const pauser = this.__pauser;
        // If our initial render occurs while disconnected, ensure that the pauser
        // and weakThis are in the disconnected state
        if (!this.isConnected) {
            this.disconnected();
        }
        for (let i = 0; i < args.length; i++) {
            // If we've rendered a higher-priority value already, stop.
            if (i > this.__lastRenderedIndex) {
                break;
            }
            const value = args[i];
            // Render non-Promise values immediately
            if (!isPromise(value)) {
                this.__lastRenderedIndex = i;
                // Since a lower-priority value will never overwrite a higher-priority
                // synchronous value, we can stop processing now.
                return value;
            }
            // If this is a Promise we've already handled, skip it.
            if (i < previousLength && value === previousValues[i]) {
                continue;
            }
            // We have a Promise that we haven't seen before, so priorities may have
            // changed. Forget what we rendered before.
            this.__lastRenderedIndex = _infinity;
            previousLength = 0;
            // Note, the callback avoids closing over `this` so that the directive
            // can be gc'ed before the promise resolves; instead `this` is retrieved
            // from `weakThis`, which can break the hard reference in the closure when
            // the directive disconnects
            Promise.resolve(value).then(async (result) => {
                // If we're disconnected, wait until we're (maybe) reconnected
                // The while loop here handles the case that the connection state
                // thrashes, causing the pauser to resume and then get re-paused
                while (pauser.get()) {
                    await pauser.get();
                }
                // If the callback gets here and there is no `this`, it means that the
                // directive has been disconnected and garbage collected and we don't
                // need to do anything else
                const _this = weakThis.deref();
                if (_this !== undefined) {
                    const index = _this.__values.indexOf(value);
                    // If state.values doesn't contain the value, we've re-rendered without
                    // the value, so don't render it. Then, only render if the value is
                    // higher-priority than what's already been rendered.
                    if (index > -1 && index < _this.__lastRenderedIndex) {
                        _this.__lastRenderedIndex = index;
                        _this.setValue(result);
                    }
                }
            });
        }
        return noChange;
    }
    disconnected() {
        this.__weakThis.disconnect();
        this.__pauser.pause();
    }
    reconnected() {
        this.__weakThis.reconnect(this);
        this.__pauser.resume();
    }
}
/**
 * Renders one of a series of values, including Promises, to a Part.
 *
 * Values are rendered in priority order, with the first argument having the
 * highest priority and the last argument having the lowest priority. If a
 * value is a Promise, low-priority values will be rendered until it resolves.
 *
 * The priority of values can be used to create placeholder content for async
 * data. For example, a Promise with pending content can be the first,
 * highest-priority, argument, and a non_promise loading indicator template can
 * be used as the second, lower-priority, argument. The loading indicator will
 * render immediately, and the primary content will render when the Promise
 * resolves.
 *
 * Example:
 *
 * ```js
 * const content = fetch('./content.txt').then(r => r.text());
 * html`${until(content, html`<span>Loading...</span>`)}`
 * ```
 */
const until = directive(UntilDirective);
/**
 * The type of the class that powers this directive. Necessary for naming the
 * directive's return type.
 */
// export type {UntilDirective};

/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function when(condition, trueCase, falseCase) {
    return condition ? trueCase(condition) : falseCase?.(condition);
}

const directives = {
    asyncAppend,
    asyncReplace,
    cache,
    choose,
    classMap,
    guard,
    ifDefined,
    join,
    keyed,
    live,
    map,
    range,
    ref,
    repeat,
    styleMap,
    templateContent,
    unsafeHTML,
    unsafeSVG,
    until,
    when,
};
/**
 * @en Convert from `string` to `TemplateStringsArray`. <br>
 *     This method is helper brigdge for the {@link html} or the {@link svg} are able to received plain string.
 * @ja `string` を `TemplateStringsArray`に変換. <br>
 *     {@link html} や {@link svg} が文字列を受け付けるためのブリッジメソッド
 *
 * @example <br>
 *
 * ```ts
 * import { toTemplateStringsArray as bridge } from '@cdp/runtime';
 *
 * const raw = '<p>Hello Raw String</p>';
 * render(html(bridge(raw)), document.body);
 * ```
 *
 * @param src
 *  - `en` plain string / string array. ex) {@link JST} returned value.
 *  - `ja` プレーン文字列 / 文字列配列. ex) {@link JST} の戻り値などを想定
 */
const toTemplateStringsArray = (src) => {
    const strings = Array.isArray(src) ? src : [src];
    if (!Object.prototype.hasOwnProperty.call(strings, 'raw')) {
        Object.defineProperty(strings, 'raw', { value: strings });
    }
    return strings;
};

export { AsyncDirective, Directive, PartType, _$LH, createRef, directive, directives, html, noChange, nothing, render, svg, toTemplateStringsArray };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLm1qcyIsInNvdXJjZXMiOlsibGl0LWh0bWwvc3JjL2xpdC1odG1sLnRzIiwibGl0LWh0bWwvc3JjL3ByaXZhdGUtc3NyLXN1cHBvcnQudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZS1oZWxwZXJzLnRzIiwibGl0LWh0bWwvc3JjL2FzeW5jLWRpcmVjdGl2ZS50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3JlZi50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3ByaXZhdGUtYXN5bmMtaGVscGVycy50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2FzeW5jLXJlcGxhY2UudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9hc3luYy1hcHBlbmQudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9jYWNoZS50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2Nob29zZS50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2NsYXNzLW1hcC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2d1YXJkLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvaWYtZGVmaW5lZC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2pvaW4udHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9rZXllZC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2xpdmUudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9tYXAudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9yYW5nZS50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3JlcGVhdC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3N0eWxlLW1hcC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3RlbXBsYXRlLWNvbnRlbnQudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy91bnNhZmUtaHRtbC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3Vuc2FmZS1zdmcudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy91bnRpbC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3doZW4udHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLy8gSU1QT1JUQU5UOiB0aGVzZSBpbXBvcnRzIG11c3QgYmUgdHlwZS1vbmx5XG5pbXBvcnQgdHlwZSB7RGlyZWN0aXZlLCBEaXJlY3RpdmVSZXN1bHQsIFBhcnRJbmZvfSBmcm9tICcuL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQgdHlwZSB7VHJ1c3RlZEhUTUwsIFRydXN0ZWRUeXBlc1dpbmRvd30gZnJvbSAndHJ1c3RlZC10eXBlcy9saWIvaW5kZXguanMnO1xuXG5jb25zdCBERVZfTU9ERSA9IHRydWU7XG5jb25zdCBFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MgPSB0cnVlO1xuY29uc3QgRU5BQkxFX1NIQURZRE9NX05PUEFUQ0ggPSB0cnVlO1xuY29uc3QgTk9ERV9NT0RFID0gZmFsc2U7XG5cbi8vIEFsbG93cyBtaW5pZmllcnMgdG8gcmVuYW1lIHJlZmVyZW5jZXMgdG8gZ2xvYmFsVGhpc1xuY29uc3QgZ2xvYmFsID0gZ2xvYmFsVGhpcztcblxuLyoqXG4gKiBDb250YWlucyB0eXBlcyB0aGF0IGFyZSBwYXJ0IG9mIHRoZSB1bnN0YWJsZSBkZWJ1ZyBBUEkuXG4gKlxuICogRXZlcnl0aGluZyBpbiB0aGlzIEFQSSBpcyBub3Qgc3RhYmxlIGFuZCBtYXkgY2hhbmdlIG9yIGJlIHJlbW92ZWQgaW4gdGhlIGZ1dHVyZSxcbiAqIGV2ZW4gb24gcGF0Y2ggcmVsZWFzZXMuXG4gKi9cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlXG5leHBvcnQgbmFtZXNwYWNlIExpdFVuc3RhYmxlIHtcbiAgLyoqXG4gICAqIFdoZW4gTGl0IGlzIHJ1bm5pbmcgaW4gZGV2IG1vZGUgYW5kIGB3aW5kb3cuZW1pdExpdERlYnVnTG9nRXZlbnRzYCBpcyB0cnVlLFxuICAgKiB3ZSB3aWxsIGVtaXQgJ2xpdC1kZWJ1ZycgZXZlbnRzIHRvIHdpbmRvdywgd2l0aCBsaXZlIGRldGFpbHMgYWJvdXQgdGhlIHVwZGF0ZSBhbmQgcmVuZGVyXG4gICAqIGxpZmVjeWNsZS4gVGhlc2UgY2FuIGJlIHVzZWZ1bCBmb3Igd3JpdGluZyBkZWJ1ZyB0b29saW5nIGFuZCB2aXN1YWxpemF0aW9ucy5cbiAgICpcbiAgICogUGxlYXNlIGJlIGF3YXJlIHRoYXQgcnVubmluZyB3aXRoIHdpbmRvdy5lbWl0TGl0RGVidWdMb2dFdmVudHMgaGFzIHBlcmZvcm1hbmNlIG92ZXJoZWFkLFxuICAgKiBtYWtpbmcgY2VydGFpbiBvcGVyYXRpb25zIHRoYXQgYXJlIG5vcm1hbGx5IHZlcnkgY2hlYXAgKGxpa2UgYSBuby1vcCByZW5kZXIpIG11Y2ggc2xvd2VyLFxuICAgKiBiZWNhdXNlIHdlIG11c3QgY29weSBkYXRhIGFuZCBkaXNwYXRjaCBldmVudHMuXG4gICAqL1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZVxuICBleHBvcnQgbmFtZXNwYWNlIERlYnVnTG9nIHtcbiAgICBleHBvcnQgdHlwZSBFbnRyeSA9XG4gICAgICB8IFRlbXBsYXRlUHJlcFxuICAgICAgfCBUZW1wbGF0ZUluc3RhbnRpYXRlZFxuICAgICAgfCBUZW1wbGF0ZUluc3RhbnRpYXRlZEFuZFVwZGF0ZWRcbiAgICAgIHwgVGVtcGxhdGVVcGRhdGluZ1xuICAgICAgfCBCZWdpblJlbmRlclxuICAgICAgfCBFbmRSZW5kZXJcbiAgICAgIHwgQ29tbWl0UGFydEVudHJ5XG4gICAgICB8IFNldFBhcnRWYWx1ZTtcbiAgICBleHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlUHJlcCB7XG4gICAgICBraW5kOiAndGVtcGxhdGUgcHJlcCc7XG4gICAgICB0ZW1wbGF0ZTogVGVtcGxhdGU7XG4gICAgICBzdHJpbmdzOiBUZW1wbGF0ZVN0cmluZ3NBcnJheTtcbiAgICAgIGNsb25hYmxlVGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQ7XG4gICAgICBwYXJ0czogVGVtcGxhdGVQYXJ0W107XG4gICAgfVxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQmVnaW5SZW5kZXIge1xuICAgICAga2luZDogJ2JlZ2luIHJlbmRlcic7XG4gICAgICBpZDogbnVtYmVyO1xuICAgICAgdmFsdWU6IHVua25vd247XG4gICAgICBjb250YWluZXI6IEhUTUxFbGVtZW50IHwgRG9jdW1lbnRGcmFnbWVudDtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgICBwYXJ0OiBDaGlsZFBhcnQgfCB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGV4cG9ydCBpbnRlcmZhY2UgRW5kUmVuZGVyIHtcbiAgICAgIGtpbmQ6ICdlbmQgcmVuZGVyJztcbiAgICAgIGlkOiBudW1iZXI7XG4gICAgICB2YWx1ZTogdW5rbm93bjtcbiAgICAgIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCBEb2N1bWVudEZyYWdtZW50O1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICAgIHBhcnQ6IENoaWxkUGFydDtcbiAgICB9XG4gICAgZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUluc3RhbnRpYXRlZCB7XG4gICAgICBraW5kOiAndGVtcGxhdGUgaW5zdGFudGlhdGVkJztcbiAgICAgIHRlbXBsYXRlOiBUZW1wbGF0ZSB8IENvbXBpbGVkVGVtcGxhdGU7XG4gICAgICBpbnN0YW5jZTogVGVtcGxhdGVJbnN0YW5jZTtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgICBmcmFnbWVudDogTm9kZTtcbiAgICAgIHBhcnRzOiBBcnJheTxQYXJ0IHwgdW5kZWZpbmVkPjtcbiAgICAgIHZhbHVlczogdW5rbm93bltdO1xuICAgIH1cbiAgICBleHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlSW5zdGFudGlhdGVkQW5kVXBkYXRlZCB7XG4gICAgICBraW5kOiAndGVtcGxhdGUgaW5zdGFudGlhdGVkIGFuZCB1cGRhdGVkJztcbiAgICAgIHRlbXBsYXRlOiBUZW1wbGF0ZSB8IENvbXBpbGVkVGVtcGxhdGU7XG4gICAgICBpbnN0YW5jZTogVGVtcGxhdGVJbnN0YW5jZTtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgICBmcmFnbWVudDogTm9kZTtcbiAgICAgIHBhcnRzOiBBcnJheTxQYXJ0IHwgdW5kZWZpbmVkPjtcbiAgICAgIHZhbHVlczogdW5rbm93bltdO1xuICAgIH1cbiAgICBleHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlVXBkYXRpbmcge1xuICAgICAga2luZDogJ3RlbXBsYXRlIHVwZGF0aW5nJztcbiAgICAgIHRlbXBsYXRlOiBUZW1wbGF0ZSB8IENvbXBpbGVkVGVtcGxhdGU7XG4gICAgICBpbnN0YW5jZTogVGVtcGxhdGVJbnN0YW5jZTtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgICBwYXJ0czogQXJyYXk8UGFydCB8IHVuZGVmaW5lZD47XG4gICAgICB2YWx1ZXM6IHVua25vd25bXTtcbiAgICB9XG4gICAgZXhwb3J0IGludGVyZmFjZSBTZXRQYXJ0VmFsdWUge1xuICAgICAga2luZDogJ3NldCBwYXJ0JztcbiAgICAgIHBhcnQ6IFBhcnQ7XG4gICAgICB2YWx1ZTogdW5rbm93bjtcbiAgICAgIHZhbHVlSW5kZXg6IG51bWJlcjtcbiAgICAgIHZhbHVlczogdW5rbm93bltdO1xuICAgICAgdGVtcGxhdGVJbnN0YW5jZTogVGVtcGxhdGVJbnN0YW5jZTtcbiAgICB9XG5cbiAgICBleHBvcnQgdHlwZSBDb21taXRQYXJ0RW50cnkgPVxuICAgICAgfCBDb21taXROb3RoaW5nVG9DaGlsZEVudHJ5XG4gICAgICB8IENvbW1pdFRleHRcbiAgICAgIHwgQ29tbWl0Tm9kZVxuICAgICAgfCBDb21taXRBdHRyaWJ1dGVcbiAgICAgIHwgQ29tbWl0UHJvcGVydHlcbiAgICAgIHwgQ29tbWl0Qm9vbGVhbkF0dHJpYnV0ZVxuICAgICAgfCBDb21taXRFdmVudExpc3RlbmVyXG4gICAgICB8IENvbW1pdFRvRWxlbWVudEJpbmRpbmc7XG5cbiAgICBleHBvcnQgaW50ZXJmYWNlIENvbW1pdE5vdGhpbmdUb0NoaWxkRW50cnkge1xuICAgICAga2luZDogJ2NvbW1pdCBub3RoaW5nIHRvIGNoaWxkJztcbiAgICAgIHN0YXJ0OiBDaGlsZE5vZGU7XG4gICAgICBlbmQ6IENoaWxkTm9kZSB8IG51bGw7XG4gICAgICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlIHwgdW5kZWZpbmVkO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBleHBvcnQgaW50ZXJmYWNlIENvbW1pdFRleHQge1xuICAgICAga2luZDogJ2NvbW1pdCB0ZXh0JztcbiAgICAgIG5vZGU6IFRleHQ7XG4gICAgICB2YWx1ZTogdW5rbm93bjtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZXhwb3J0IGludGVyZmFjZSBDb21taXROb2RlIHtcbiAgICAgIGtpbmQ6ICdjb21taXQgbm9kZSc7XG4gICAgICBzdGFydDogTm9kZTtcbiAgICAgIHBhcmVudDogRGlzY29ubmVjdGFibGUgfCB1bmRlZmluZWQ7XG4gICAgICB2YWx1ZTogTm9kZTtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZXhwb3J0IGludGVyZmFjZSBDb21taXRBdHRyaWJ1dGUge1xuICAgICAga2luZDogJ2NvbW1pdCBhdHRyaWJ1dGUnO1xuICAgICAgZWxlbWVudDogRWxlbWVudDtcbiAgICAgIG5hbWU6IHN0cmluZztcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBleHBvcnQgaW50ZXJmYWNlIENvbW1pdFByb3BlcnR5IHtcbiAgICAgIGtpbmQ6ICdjb21taXQgcHJvcGVydHknO1xuICAgICAgZWxlbWVudDogRWxlbWVudDtcbiAgICAgIG5hbWU6IHN0cmluZztcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBleHBvcnQgaW50ZXJmYWNlIENvbW1pdEJvb2xlYW5BdHRyaWJ1dGUge1xuICAgICAga2luZDogJ2NvbW1pdCBib29sZWFuIGF0dHJpYnV0ZSc7XG4gICAgICBlbGVtZW50OiBFbGVtZW50O1xuICAgICAgbmFtZTogc3RyaW5nO1xuICAgICAgdmFsdWU6IGJvb2xlYW47XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0RXZlbnRMaXN0ZW5lciB7XG4gICAgICBraW5kOiAnY29tbWl0IGV2ZW50IGxpc3RlbmVyJztcbiAgICAgIGVsZW1lbnQ6IEVsZW1lbnQ7XG4gICAgICBuYW1lOiBzdHJpbmc7XG4gICAgICB2YWx1ZTogdW5rbm93bjtcbiAgICAgIG9sZExpc3RlbmVyOiB1bmtub3duO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICAgIC8vIFRydWUgaWYgd2UncmUgcmVtb3ZpbmcgdGhlIG9sZCBldmVudCBsaXN0ZW5lciAoZS5nLiBiZWNhdXNlIHNldHRpbmdzIGNoYW5nZWQsIG9yIHZhbHVlIGlzIG5vdGhpbmcpXG4gICAgICByZW1vdmVMaXN0ZW5lcjogYm9vbGVhbjtcbiAgICAgIC8vIFRydWUgaWYgd2UncmUgYWRkaW5nIGEgbmV3IGV2ZW50IGxpc3RlbmVyIChlLmcuIGJlY2F1c2UgZmlyc3QgcmVuZGVyLCBvciBzZXR0aW5ncyBjaGFuZ2VkKVxuICAgICAgYWRkTGlzdGVuZXI6IGJvb2xlYW47XG4gICAgfVxuXG4gICAgZXhwb3J0IGludGVyZmFjZSBDb21taXRUb0VsZW1lbnRCaW5kaW5nIHtcbiAgICAgIGtpbmQ6ICdjb21taXQgdG8gZWxlbWVudCBiaW5kaW5nJztcbiAgICAgIGVsZW1lbnQ6IEVsZW1lbnQ7XG4gICAgICB2YWx1ZTogdW5rbm93bjtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG59XG5cbmludGVyZmFjZSBEZWJ1Z0xvZ2dpbmdXaW5kb3cge1xuICAvLyBFdmVuIGluIGRldiBtb2RlLCB3ZSBnZW5lcmFsbHkgZG9uJ3Qgd2FudCB0byBlbWl0IHRoZXNlIGV2ZW50cywgYXMgdGhhdCdzXG4gIC8vIGFub3RoZXIgbGV2ZWwgb2YgY29zdCwgc28gb25seSBlbWl0IHRoZW0gd2hlbiBERVZfTU9ERSBpcyB0cnVlIF9hbmRfIHdoZW5cbiAgLy8gd2luZG93LmVtaXRMaXREZWJ1Z0V2ZW50cyBpcyB0cnVlLlxuICBlbWl0TGl0RGVidWdMb2dFdmVudHM/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIFVzZWZ1bCBmb3IgdmlzdWFsaXppbmcgYW5kIGxvZ2dpbmcgaW5zaWdodHMgaW50byB3aGF0IHRoZSBMaXQgdGVtcGxhdGUgc3lzdGVtIGlzIGRvaW5nLlxuICpcbiAqIENvbXBpbGVkIG91dCBvZiBwcm9kIG1vZGUgYnVpbGRzLlxuICovXG5jb25zdCBkZWJ1Z0xvZ0V2ZW50ID0gREVWX01PREVcbiAgPyAoZXZlbnQ6IExpdFVuc3RhYmxlLkRlYnVnTG9nLkVudHJ5KSA9PiB7XG4gICAgICBjb25zdCBzaG91bGRFbWl0ID0gKGdsb2JhbCBhcyB1bmtub3duIGFzIERlYnVnTG9nZ2luZ1dpbmRvdylcbiAgICAgICAgLmVtaXRMaXREZWJ1Z0xvZ0V2ZW50cztcbiAgICAgIGlmICghc2hvdWxkRW1pdCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBnbG9iYWwuZGlzcGF0Y2hFdmVudChcbiAgICAgICAgbmV3IEN1c3RvbUV2ZW50PExpdFVuc3RhYmxlLkRlYnVnTG9nLkVudHJ5PignbGl0LWRlYnVnJywge1xuICAgICAgICAgIGRldGFpbDogZXZlbnQsXG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH1cbiAgOiB1bmRlZmluZWQ7XG4vLyBVc2VkIGZvciBjb25uZWN0aW5nIGJlZ2luUmVuZGVyIGFuZCBlbmRSZW5kZXIgZXZlbnRzIHdoZW4gdGhlcmUgYXJlIG5lc3RlZFxuLy8gcmVuZGVycyB3aGVuIGVycm9ycyBhcmUgdGhyb3duIHByZXZlbnRpbmcgYW4gZW5kUmVuZGVyIGV2ZW50IGZyb20gYmVpbmdcbi8vIGNhbGxlZC5cbmxldCBkZWJ1Z0xvZ1JlbmRlcklkID0gMDtcblxubGV0IGlzc3VlV2FybmluZzogKGNvZGU6IHN0cmluZywgd2FybmluZzogc3RyaW5nKSA9PiB2b2lkO1xuXG5pZiAoREVWX01PREUpIHtcbiAgZ2xvYmFsLmxpdElzc3VlZFdhcm5pbmdzID8/PSBuZXcgU2V0KCk7XG5cbiAgLyoqXG4gICAqIElzc3VlIGEgd2FybmluZyBpZiB3ZSBoYXZlbid0IGFscmVhZHksIGJhc2VkIGVpdGhlciBvbiBgY29kZWAgb3IgYHdhcm5pbmdgLlxuICAgKiBXYXJuaW5ncyBhcmUgZGlzYWJsZWQgYXV0b21hdGljYWxseSBvbmx5IGJ5IGB3YXJuaW5nYDsgZGlzYWJsaW5nIHZpYSBgY29kZWBcbiAgICogY2FuIGJlIGRvbmUgYnkgdXNlcnMuXG4gICAqL1xuICBpc3N1ZVdhcm5pbmcgPSAoY29kZTogc3RyaW5nLCB3YXJuaW5nOiBzdHJpbmcpID0+IHtcbiAgICB3YXJuaW5nICs9IGNvZGVcbiAgICAgID8gYCBTZWUgaHR0cHM6Ly9saXQuZGV2L21zZy8ke2NvZGV9IGZvciBtb3JlIGluZm9ybWF0aW9uLmBcbiAgICAgIDogJyc7XG4gICAgaWYgKFxuICAgICAgIWdsb2JhbC5saXRJc3N1ZWRXYXJuaW5ncyEuaGFzKHdhcm5pbmcpICYmXG4gICAgICAhZ2xvYmFsLmxpdElzc3VlZFdhcm5pbmdzIS5oYXMoY29kZSlcbiAgICApIHtcbiAgICAgIGNvbnNvbGUud2Fybih3YXJuaW5nKTtcbiAgICAgIGdsb2JhbC5saXRJc3N1ZWRXYXJuaW5ncyEuYWRkKHdhcm5pbmcpO1xuICAgIH1cbiAgfTtcblxuICBxdWV1ZU1pY3JvdGFzaygoKSA9PiB7XG4gICAgaXNzdWVXYXJuaW5nKFxuICAgICAgJ2Rldi1tb2RlJyxcbiAgICAgIGBMaXQgaXMgaW4gZGV2IG1vZGUuIE5vdCByZWNvbW1lbmRlZCBmb3IgcHJvZHVjdGlvbiFgXG4gICAgKTtcbiAgfSk7XG59XG5cbmNvbnN0IHdyYXAgPVxuICBFTkFCTEVfU0hBRFlET01fTk9QQVRDSCAmJlxuICBnbG9iYWwuU2hhZHlET00/LmluVXNlICYmXG4gIGdsb2JhbC5TaGFkeURPTT8ubm9QYXRjaCA9PT0gdHJ1ZVxuICAgID8gKGdsb2JhbC5TaGFkeURPTSEud3JhcCBhcyA8VCBleHRlbmRzIE5vZGU+KG5vZGU6IFQpID0+IFQpXG4gICAgOiA8VCBleHRlbmRzIE5vZGU+KG5vZGU6IFQpID0+IG5vZGU7XG5cbmNvbnN0IHRydXN0ZWRUeXBlcyA9IChnbG9iYWwgYXMgdW5rbm93biBhcyBUcnVzdGVkVHlwZXNXaW5kb3cpLnRydXN0ZWRUeXBlcztcblxuLyoqXG4gKiBPdXIgVHJ1c3RlZFR5cGVQb2xpY3kgZm9yIEhUTUwgd2hpY2ggaXMgZGVjbGFyZWQgdXNpbmcgdGhlIGh0bWwgdGVtcGxhdGVcbiAqIHRhZyBmdW5jdGlvbi5cbiAqXG4gKiBUaGF0IEhUTUwgaXMgYSBkZXZlbG9wZXItYXV0aG9yZWQgY29uc3RhbnQsIGFuZCBpcyBwYXJzZWQgd2l0aCBpbm5lckhUTUxcbiAqIGJlZm9yZSBhbnkgdW50cnVzdGVkIGV4cHJlc3Npb25zIGhhdmUgYmVlbiBtaXhlZCBpbi4gVGhlcmVmb3IgaXQgaXNcbiAqIGNvbnNpZGVyZWQgc2FmZSBieSBjb25zdHJ1Y3Rpb24uXG4gKi9cbmNvbnN0IHBvbGljeSA9IHRydXN0ZWRUeXBlc1xuICA/IHRydXN0ZWRUeXBlcy5jcmVhdGVQb2xpY3koJ2xpdC1odG1sJywge1xuICAgICAgY3JlYXRlSFRNTDogKHMpID0+IHMsXG4gICAgfSlcbiAgOiB1bmRlZmluZWQ7XG5cbi8qKlxuICogVXNlZCB0byBzYW5pdGl6ZSBhbnkgdmFsdWUgYmVmb3JlIGl0IGlzIHdyaXR0ZW4gaW50byB0aGUgRE9NLiBUaGlzIGNhbiBiZVxuICogdXNlZCB0byBpbXBsZW1lbnQgYSBzZWN1cml0eSBwb2xpY3kgb2YgYWxsb3dlZCBhbmQgZGlzYWxsb3dlZCB2YWx1ZXMgaW5cbiAqIG9yZGVyIHRvIHByZXZlbnQgWFNTIGF0dGFja3MuXG4gKlxuICogT25lIHdheSBvZiB1c2luZyB0aGlzIGNhbGxiYWNrIHdvdWxkIGJlIHRvIGNoZWNrIGF0dHJpYnV0ZXMgYW5kIHByb3BlcnRpZXNcbiAqIGFnYWluc3QgYSBsaXN0IG9mIGhpZ2ggcmlzayBmaWVsZHMsIGFuZCByZXF1aXJlIHRoYXQgdmFsdWVzIHdyaXR0ZW4gdG8gc3VjaFxuICogZmllbGRzIGJlIGluc3RhbmNlcyBvZiBhIGNsYXNzIHdoaWNoIGlzIHNhZmUgYnkgY29uc3RydWN0aW9uLiBDbG9zdXJlJ3MgU2FmZVxuICogSFRNTCBUeXBlcyBpcyBvbmUgaW1wbGVtZW50YXRpb24gb2YgdGhpcyB0ZWNobmlxdWUgKFxuICogaHR0cHM6Ly9naXRodWIuY29tL2dvb2dsZS9zYWZlLWh0bWwtdHlwZXMvYmxvYi9tYXN0ZXIvZG9jL3NhZmVodG1sLXR5cGVzLm1kKS5cbiAqIFRoZSBUcnVzdGVkVHlwZXMgcG9seWZpbGwgaW4gQVBJLW9ubHkgbW9kZSBjb3VsZCBhbHNvIGJlIHVzZWQgYXMgYSBiYXNpc1xuICogZm9yIHRoaXMgdGVjaG5pcXVlIChodHRwczovL2dpdGh1Yi5jb20vV0lDRy90cnVzdGVkLXR5cGVzKS5cbiAqXG4gKiBAcGFyYW0gbm9kZSBUaGUgSFRNTCBub2RlICh1c3VhbGx5IGVpdGhlciBhICN0ZXh0IG5vZGUgb3IgYW4gRWxlbWVudCkgdGhhdFxuICogICAgIGlzIGJlaW5nIHdyaXR0ZW4gdG8uIE5vdGUgdGhhdCB0aGlzIGlzIGp1c3QgYW4gZXhlbXBsYXIgbm9kZSwgdGhlIHdyaXRlXG4gKiAgICAgbWF5IHRha2UgcGxhY2UgYWdhaW5zdCBhbm90aGVyIGluc3RhbmNlIG9mIHRoZSBzYW1lIGNsYXNzIG9mIG5vZGUuXG4gKiBAcGFyYW0gbmFtZSBUaGUgbmFtZSBvZiBhbiBhdHRyaWJ1dGUgb3IgcHJvcGVydHkgKGZvciBleGFtcGxlLCAnaHJlZicpLlxuICogQHBhcmFtIHR5cGUgSW5kaWNhdGVzIHdoZXRoZXIgdGhlIHdyaXRlIHRoYXQncyBhYm91dCB0byBiZSBwZXJmb3JtZWQgd2lsbFxuICogICAgIGJlIHRvIGEgcHJvcGVydHkgb3IgYSBub2RlLlxuICogQHJldHVybiBBIGZ1bmN0aW9uIHRoYXQgd2lsbCBzYW5pdGl6ZSB0aGlzIGNsYXNzIG9mIHdyaXRlcy5cbiAqL1xuZXhwb3J0IHR5cGUgU2FuaXRpemVyRmFjdG9yeSA9IChcbiAgbm9kZTogTm9kZSxcbiAgbmFtZTogc3RyaW5nLFxuICB0eXBlOiAncHJvcGVydHknIHwgJ2F0dHJpYnV0ZSdcbikgPT4gVmFsdWVTYW5pdGl6ZXI7XG5cbi8qKlxuICogQSBmdW5jdGlvbiB3aGljaCBjYW4gc2FuaXRpemUgdmFsdWVzIHRoYXQgd2lsbCBiZSB3cml0dGVuIHRvIGEgc3BlY2lmaWMga2luZFxuICogb2YgRE9NIHNpbmsuXG4gKlxuICogU2VlIFNhbml0aXplckZhY3RvcnkuXG4gKlxuICogQHBhcmFtIHZhbHVlIFRoZSB2YWx1ZSB0byBzYW5pdGl6ZS4gV2lsbCBiZSB0aGUgYWN0dWFsIHZhbHVlIHBhc3NlZCBpbnRvXG4gKiAgICAgdGhlIGxpdC1odG1sIHRlbXBsYXRlIGxpdGVyYWwsIHNvIHRoaXMgY291bGQgYmUgb2YgYW55IHR5cGUuXG4gKiBAcmV0dXJuIFRoZSB2YWx1ZSB0byB3cml0ZSB0byB0aGUgRE9NLiBVc3VhbGx5IHRoZSBzYW1lIGFzIHRoZSBpbnB1dCB2YWx1ZSxcbiAqICAgICB1bmxlc3Mgc2FuaXRpemF0aW9uIGlzIG5lZWRlZC5cbiAqL1xuZXhwb3J0IHR5cGUgVmFsdWVTYW5pdGl6ZXIgPSAodmFsdWU6IHVua25vd24pID0+IHVua25vd247XG5cbmNvbnN0IGlkZW50aXR5RnVuY3Rpb246IFZhbHVlU2FuaXRpemVyID0gKHZhbHVlOiB1bmtub3duKSA9PiB2YWx1ZTtcbmNvbnN0IG5vb3BTYW5pdGl6ZXI6IFNhbml0aXplckZhY3RvcnkgPSAoXG4gIF9ub2RlOiBOb2RlLFxuICBfbmFtZTogc3RyaW5nLFxuICBfdHlwZTogJ3Byb3BlcnR5JyB8ICdhdHRyaWJ1dGUnXG4pID0+IGlkZW50aXR5RnVuY3Rpb247XG5cbi8qKiBTZXRzIHRoZSBnbG9iYWwgc2FuaXRpemVyIGZhY3RvcnkuICovXG5jb25zdCBzZXRTYW5pdGl6ZXIgPSAobmV3U2FuaXRpemVyOiBTYW5pdGl6ZXJGYWN0b3J5KSA9PiB7XG4gIGlmICghRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwgIT09IG5vb3BTYW5pdGl6ZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgQXR0ZW1wdGVkIHRvIG92ZXJ3cml0ZSBleGlzdGluZyBsaXQtaHRtbCBzZWN1cml0eSBwb2xpY3kuYCArXG4gICAgICAgIGAgc2V0U2FuaXRpemVET01WYWx1ZUZhY3Rvcnkgc2hvdWxkIGJlIGNhbGxlZCBhdCBtb3N0IG9uY2UuYFxuICAgICk7XG4gIH1cbiAgc2FuaXRpemVyRmFjdG9yeUludGVybmFsID0gbmV3U2FuaXRpemVyO1xufTtcblxuLyoqXG4gKiBPbmx5IHVzZWQgaW4gaW50ZXJuYWwgdGVzdHMsIG5vdCBhIHBhcnQgb2YgdGhlIHB1YmxpYyBBUEkuXG4gKi9cbmNvbnN0IF90ZXN0T25seUNsZWFyU2FuaXRpemVyRmFjdG9yeURvTm90Q2FsbE9yRWxzZSA9ICgpID0+IHtcbiAgc2FuaXRpemVyRmFjdG9yeUludGVybmFsID0gbm9vcFNhbml0aXplcjtcbn07XG5cbmNvbnN0IGNyZWF0ZVNhbml0aXplcjogU2FuaXRpemVyRmFjdG9yeSA9IChub2RlLCBuYW1lLCB0eXBlKSA9PiB7XG4gIHJldHVybiBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwobm9kZSwgbmFtZSwgdHlwZSk7XG59O1xuXG4vLyBBZGRlZCB0byBhbiBhdHRyaWJ1dGUgbmFtZSB0byBtYXJrIHRoZSBhdHRyaWJ1dGUgYXMgYm91bmQgc28gd2UgY2FuIGZpbmRcbi8vIGl0IGVhc2lseS5cbmNvbnN0IGJvdW5kQXR0cmlidXRlU3VmZml4ID0gJyRsaXQkJztcblxuLy8gVGhpcyBtYXJrZXIgaXMgdXNlZCBpbiBtYW55IHN5bnRhY3RpYyBwb3NpdGlvbnMgaW4gSFRNTCwgc28gaXQgbXVzdCBiZVxuLy8gYSB2YWxpZCBlbGVtZW50IG5hbWUgYW5kIGF0dHJpYnV0ZSBuYW1lLiBXZSBkb24ndCBzdXBwb3J0IGR5bmFtaWMgbmFtZXMgKHlldClcbi8vIGJ1dCB0aGlzIGF0IGxlYXN0IGVuc3VyZXMgdGhhdCB0aGUgcGFyc2UgdHJlZSBpcyBjbG9zZXIgdG8gdGhlIHRlbXBsYXRlXG4vLyBpbnRlbnRpb24uXG5jb25zdCBtYXJrZXIgPSBgbGl0JCR7TWF0aC5yYW5kb20oKS50b0ZpeGVkKDkpLnNsaWNlKDIpfSRgO1xuXG4vLyBTdHJpbmcgdXNlZCB0byB0ZWxsIGlmIGEgY29tbWVudCBpcyBhIG1hcmtlciBjb21tZW50XG5jb25zdCBtYXJrZXJNYXRjaCA9ICc/JyArIG1hcmtlcjtcblxuLy8gVGV4dCB1c2VkIHRvIGluc2VydCBhIGNvbW1lbnQgbWFya2VyIG5vZGUuIFdlIHVzZSBwcm9jZXNzaW5nIGluc3RydWN0aW9uXG4vLyBzeW50YXggYmVjYXVzZSBpdCdzIHNsaWdodGx5IHNtYWxsZXIsIGJ1dCBwYXJzZXMgYXMgYSBjb21tZW50IG5vZGUuXG5jb25zdCBub2RlTWFya2VyID0gYDwke21hcmtlck1hdGNofT5gO1xuXG5jb25zdCBkID1cbiAgTk9ERV9NT0RFICYmIGdsb2JhbC5kb2N1bWVudCA9PT0gdW5kZWZpbmVkXG4gICAgPyAoe1xuICAgICAgICBjcmVhdGVUcmVlV2Fsa2VyKCkge1xuICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfSxcbiAgICAgIH0gYXMgdW5rbm93biBhcyBEb2N1bWVudClcbiAgICA6IGRvY3VtZW50O1xuXG4vLyBDcmVhdGVzIGEgZHluYW1pYyBtYXJrZXIuIFdlIG5ldmVyIGhhdmUgdG8gc2VhcmNoIGZvciB0aGVzZSBpbiB0aGUgRE9NLlxuY29uc3QgY3JlYXRlTWFya2VyID0gKCkgPT4gZC5jcmVhdGVDb21tZW50KCcnKTtcblxuLy8gaHR0cHM6Ly90YzM5LmdpdGh1Yi5pby9lY21hMjYyLyNzZWMtdHlwZW9mLW9wZXJhdG9yXG50eXBlIFByaW1pdGl2ZSA9IG51bGwgfCB1bmRlZmluZWQgfCBib29sZWFuIHwgbnVtYmVyIHwgc3RyaW5nIHwgc3ltYm9sIHwgYmlnaW50O1xuY29uc3QgaXNQcmltaXRpdmUgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBQcmltaXRpdmUgPT5cbiAgdmFsdWUgPT09IG51bGwgfHwgKHR5cGVvZiB2YWx1ZSAhPSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsdWUgIT0gJ2Z1bmN0aW9uJyk7XG5jb25zdCBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcbmNvbnN0IGlzSXRlcmFibGUgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBJdGVyYWJsZTx1bmtub3duPiA9PlxuICBpc0FycmF5KHZhbHVlKSB8fFxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICB0eXBlb2YgKHZhbHVlIGFzIGFueSk/LltTeW1ib2wuaXRlcmF0b3JdID09PSAnZnVuY3Rpb24nO1xuXG5jb25zdCBTUEFDRV9DSEFSID0gYFsgXFx0XFxuXFxmXFxyXWA7XG5jb25zdCBBVFRSX1ZBTFVFX0NIQVIgPSBgW14gXFx0XFxuXFxmXFxyXCInXFxgPD49XWA7XG5jb25zdCBOQU1FX0NIQVIgPSBgW15cXFxcc1wiJz49L11gO1xuXG4vLyBUaGVzZSByZWdleGVzIHJlcHJlc2VudCB0aGUgZml2ZSBwYXJzaW5nIHN0YXRlcyB0aGF0IHdlIGNhcmUgYWJvdXQgaW4gdGhlXG4vLyBUZW1wbGF0ZSdzIEhUTUwgc2Nhbm5lci4gVGhleSBtYXRjaCB0aGUgKmVuZCogb2YgdGhlIHN0YXRlIHRoZXkncmUgbmFtZWRcbi8vIGFmdGVyLlxuLy8gRGVwZW5kaW5nIG9uIHRoZSBtYXRjaCwgd2UgdHJhbnNpdGlvbiB0byBhIG5ldyBzdGF0ZS4gSWYgdGhlcmUncyBubyBtYXRjaCxcbi8vIHdlIHN0YXkgaW4gdGhlIHNhbWUgc3RhdGUuXG4vLyBOb3RlIHRoYXQgdGhlIHJlZ2V4ZXMgYXJlIHN0YXRlZnVsLiBXZSB1dGlsaXplIGxhc3RJbmRleCBhbmQgc3luYyBpdFxuLy8gYWNyb3NzIHRoZSBtdWx0aXBsZSByZWdleGVzIHVzZWQuIEluIGFkZGl0aW9uIHRvIHRoZSBmaXZlIHJlZ2V4ZXMgYmVsb3dcbi8vIHdlIGFsc28gZHluYW1pY2FsbHkgY3JlYXRlIGEgcmVnZXggdG8gZmluZCB0aGUgbWF0Y2hpbmcgZW5kIHRhZ3MgZm9yIHJhd1xuLy8gdGV4dCBlbGVtZW50cy5cblxuLyoqXG4gKiBFbmQgb2YgdGV4dCBpczogYDxgIGZvbGxvd2VkIGJ5OlxuICogICAoY29tbWVudCBzdGFydCkgb3IgKHRhZykgb3IgKGR5bmFtaWMgdGFnIGJpbmRpbmcpXG4gKi9cbmNvbnN0IHRleHRFbmRSZWdleCA9IC88KD86KCEtLXxcXC9bXmEtekEtWl0pfChcXC8/W2EtekEtWl1bXj5cXHNdKil8KFxcLz8kKSkvZztcbmNvbnN0IENPTU1FTlRfU1RBUlQgPSAxO1xuY29uc3QgVEFHX05BTUUgPSAyO1xuY29uc3QgRFlOQU1JQ19UQUdfTkFNRSA9IDM7XG5cbmNvbnN0IGNvbW1lbnRFbmRSZWdleCA9IC8tLT4vZztcbi8qKlxuICogQ29tbWVudHMgbm90IHN0YXJ0ZWQgd2l0aCA8IS0tLCBsaWtlIDwveywgY2FuIGJlIGVuZGVkIGJ5IGEgc2luZ2xlIGA+YFxuICovXG5jb25zdCBjb21tZW50MkVuZFJlZ2V4ID0gLz4vZztcblxuLyoqXG4gKiBUaGUgdGFnRW5kIHJlZ2V4IG1hdGNoZXMgdGhlIGVuZCBvZiB0aGUgXCJpbnNpZGUgYW4gb3BlbmluZ1wiIHRhZyBzeW50YXhcbiAqIHBvc2l0aW9uLiBJdCBlaXRoZXIgbWF0Y2hlcyBhIGA+YCwgYW4gYXR0cmlidXRlLWxpa2Ugc2VxdWVuY2UsIG9yIHRoZSBlbmRcbiAqIG9mIHRoZSBzdHJpbmcgYWZ0ZXIgYSBzcGFjZSAoYXR0cmlidXRlLW5hbWUgcG9zaXRpb24gZW5kaW5nKS5cbiAqXG4gKiBTZWUgYXR0cmlidXRlcyBpbiB0aGUgSFRNTCBzcGVjOlxuICogaHR0cHM6Ly93d3cudzMub3JnL1RSL2h0bWw1L3N5bnRheC5odG1sI2VsZW1lbnRzLWF0dHJpYnV0ZXNcbiAqXG4gKiBcIiBcXHRcXG5cXGZcXHJcIiBhcmUgSFRNTCBzcGFjZSBjaGFyYWN0ZXJzOlxuICogaHR0cHM6Ly9pbmZyYS5zcGVjLndoYXR3Zy5vcmcvI2FzY2lpLXdoaXRlc3BhY2VcbiAqXG4gKiBTbyBhbiBhdHRyaWJ1dGUgaXM6XG4gKiAgKiBUaGUgbmFtZTogYW55IGNoYXJhY3RlciBleGNlcHQgYSB3aGl0ZXNwYWNlIGNoYXJhY3RlciwgKFwiKSwgKCcpLCBcIj5cIixcbiAqICAgIFwiPVwiLCBvciBcIi9cIi4gTm90ZTogdGhpcyBpcyBkaWZmZXJlbnQgZnJvbSB0aGUgSFRNTCBzcGVjIHdoaWNoIGFsc28gZXhjbHVkZXMgY29udHJvbCBjaGFyYWN0ZXJzLlxuICogICogRm9sbG93ZWQgYnkgemVybyBvciBtb3JlIHNwYWNlIGNoYXJhY3RlcnNcbiAqICAqIEZvbGxvd2VkIGJ5IFwiPVwiXG4gKiAgKiBGb2xsb3dlZCBieSB6ZXJvIG9yIG1vcmUgc3BhY2UgY2hhcmFjdGVyc1xuICogICogRm9sbG93ZWQgYnk6XG4gKiAgICAqIEFueSBjaGFyYWN0ZXIgZXhjZXB0IHNwYWNlLCAoJyksIChcIiksIFwiPFwiLCBcIj5cIiwgXCI9XCIsIChgKSwgb3JcbiAqICAgICogKFwiKSB0aGVuIGFueSBub24tKFwiKSwgb3JcbiAqICAgICogKCcpIHRoZW4gYW55IG5vbi0oJylcbiAqL1xuY29uc3QgdGFnRW5kUmVnZXggPSBuZXcgUmVnRXhwKFxuICBgPnwke1NQQUNFX0NIQVJ9KD86KCR7TkFNRV9DSEFSfSspKCR7U1BBQ0VfQ0hBUn0qPSR7U1BBQ0VfQ0hBUn0qKD86JHtBVFRSX1ZBTFVFX0NIQVJ9fChcInwnKXwpKXwkKWAsXG4gICdnJ1xuKTtcbmNvbnN0IEVOVElSRV9NQVRDSCA9IDA7XG5jb25zdCBBVFRSSUJVVEVfTkFNRSA9IDE7XG5jb25zdCBTUEFDRVNfQU5EX0VRVUFMUyA9IDI7XG5jb25zdCBRVU9URV9DSEFSID0gMztcblxuY29uc3Qgc2luZ2xlUXVvdGVBdHRyRW5kUmVnZXggPSAvJy9nO1xuY29uc3QgZG91YmxlUXVvdGVBdHRyRW5kUmVnZXggPSAvXCIvZztcbi8qKlxuICogTWF0Y2hlcyB0aGUgcmF3IHRleHQgZWxlbWVudHMuXG4gKlxuICogQ29tbWVudHMgYXJlIG5vdCBwYXJzZWQgd2l0aGluIHJhdyB0ZXh0IGVsZW1lbnRzLCBzbyB3ZSBuZWVkIHRvIHNlYXJjaCB0aGVpclxuICogdGV4dCBjb250ZW50IGZvciBtYXJrZXIgc3RyaW5ncy5cbiAqL1xuY29uc3QgcmF3VGV4dEVsZW1lbnQgPSAvXig/OnNjcmlwdHxzdHlsZXx0ZXh0YXJlYXx0aXRsZSkkL2k7XG5cbi8qKiBUZW1wbGF0ZVJlc3VsdCB0eXBlcyAqL1xuY29uc3QgSFRNTF9SRVNVTFQgPSAxO1xuY29uc3QgU1ZHX1JFU1VMVCA9IDI7XG5jb25zdCBNQVRITUxfUkVTVUxUID0gMztcblxudHlwZSBSZXN1bHRUeXBlID0gdHlwZW9mIEhUTUxfUkVTVUxUIHwgdHlwZW9mIFNWR19SRVNVTFQgfCB0eXBlb2YgTUFUSE1MX1JFU1VMVDtcblxuLy8gVGVtcGxhdGVQYXJ0IHR5cGVzXG4vLyBJTVBPUlRBTlQ6IHRoZXNlIG11c3QgbWF0Y2ggdGhlIHZhbHVlcyBpbiBQYXJ0VHlwZVxuY29uc3QgQVRUUklCVVRFX1BBUlQgPSAxO1xuY29uc3QgQ0hJTERfUEFSVCA9IDI7XG5jb25zdCBQUk9QRVJUWV9QQVJUID0gMztcbmNvbnN0IEJPT0xFQU5fQVRUUklCVVRFX1BBUlQgPSA0O1xuY29uc3QgRVZFTlRfUEFSVCA9IDU7XG5jb25zdCBFTEVNRU5UX1BBUlQgPSA2O1xuY29uc3QgQ09NTUVOVF9QQVJUID0gNztcblxuLyoqXG4gKiBUaGUgcmV0dXJuIHR5cGUgb2YgdGhlIHRlbXBsYXRlIHRhZyBmdW5jdGlvbnMsIHtAbGlua2NvZGUgaHRtbH0gYW5kXG4gKiB7QGxpbmtjb2RlIHN2Z30gd2hlbiBpdCBoYXNuJ3QgYmVlbiBjb21waWxlZCBieSBAbGl0LWxhYnMvY29tcGlsZXIuXG4gKlxuICogQSBgVGVtcGxhdGVSZXN1bHRgIG9iamVjdCBob2xkcyBhbGwgdGhlIGluZm9ybWF0aW9uIGFib3V0IGEgdGVtcGxhdGVcbiAqIGV4cHJlc3Npb24gcmVxdWlyZWQgdG8gcmVuZGVyIGl0OiB0aGUgdGVtcGxhdGUgc3RyaW5ncywgZXhwcmVzc2lvbiB2YWx1ZXMsXG4gKiBhbmQgdHlwZSBvZiB0ZW1wbGF0ZSAoaHRtbCBvciBzdmcpLlxuICpcbiAqIGBUZW1wbGF0ZVJlc3VsdGAgb2JqZWN0cyBkbyBub3QgY3JlYXRlIGFueSBET00gb24gdGhlaXIgb3duLiBUbyBjcmVhdGUgb3JcbiAqIHVwZGF0ZSBET00geW91IG5lZWQgdG8gcmVuZGVyIHRoZSBgVGVtcGxhdGVSZXN1bHRgLiBTZWVcbiAqIFtSZW5kZXJpbmddKGh0dHBzOi8vbGl0LmRldi9kb2NzL2NvbXBvbmVudHMvcmVuZGVyaW5nKSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAqXG4gKi9cbmV4cG9ydCB0eXBlIFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdDxUIGV4dGVuZHMgUmVzdWx0VHlwZSA9IFJlc3VsdFR5cGU+ID0ge1xuICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICBbJ18kbGl0VHlwZSQnXTogVDtcbiAgc3RyaW5nczogVGVtcGxhdGVTdHJpbmdzQXJyYXk7XG4gIHZhbHVlczogdW5rbm93bltdO1xufTtcblxuLyoqXG4gKiBUaGlzIGlzIGEgdGVtcGxhdGUgcmVzdWx0IHRoYXQgbWF5IGJlIGVpdGhlciB1bmNvbXBpbGVkIG9yIGNvbXBpbGVkLlxuICpcbiAqIEluIHRoZSBmdXR1cmUsIFRlbXBsYXRlUmVzdWx0IHdpbGwgYmUgdGhpcyB0eXBlLiBJZiB5b3Ugd2FudCB0byBleHBsaWNpdGx5XG4gKiBub3RlIHRoYXQgYSB0ZW1wbGF0ZSByZXN1bHQgaXMgcG90ZW50aWFsbHkgY29tcGlsZWQsIHlvdSBjYW4gcmVmZXJlbmNlIHRoaXNcbiAqIHR5cGUgYW5kIGl0IHdpbGwgY29udGludWUgdG8gYmVoYXZlIHRoZSBzYW1lIHRocm91Z2ggdGhlIG5leHQgbWFqb3IgdmVyc2lvblxuICogb2YgTGl0LiBUaGlzIGNhbiBiZSB1c2VmdWwgZm9yIGNvZGUgdGhhdCB3YW50cyB0byBwcmVwYXJlIGZvciB0aGUgbmV4dFxuICogbWFqb3IgdmVyc2lvbiBvZiBMaXQuXG4gKi9cbmV4cG9ydCB0eXBlIE1heWJlQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdDxUIGV4dGVuZHMgUmVzdWx0VHlwZSA9IFJlc3VsdFR5cGU+ID1cbiAgfCBVbmNvbXBpbGVkVGVtcGxhdGVSZXN1bHQ8VD5cbiAgfCBDb21waWxlZFRlbXBsYXRlUmVzdWx0O1xuXG4vKipcbiAqIFRoZSByZXR1cm4gdHlwZSBvZiB0aGUgdGVtcGxhdGUgdGFnIGZ1bmN0aW9ucywge0BsaW5rY29kZSBodG1sfSBhbmRcbiAqIHtAbGlua2NvZGUgc3ZnfS5cbiAqXG4gKiBBIGBUZW1wbGF0ZVJlc3VsdGAgb2JqZWN0IGhvbGRzIGFsbCB0aGUgaW5mb3JtYXRpb24gYWJvdXQgYSB0ZW1wbGF0ZVxuICogZXhwcmVzc2lvbiByZXF1aXJlZCB0byByZW5kZXIgaXQ6IHRoZSB0ZW1wbGF0ZSBzdHJpbmdzLCBleHByZXNzaW9uIHZhbHVlcyxcbiAqIGFuZCB0eXBlIG9mIHRlbXBsYXRlIChodG1sIG9yIHN2ZykuXG4gKlxuICogYFRlbXBsYXRlUmVzdWx0YCBvYmplY3RzIGRvIG5vdCBjcmVhdGUgYW55IERPTSBvbiB0aGVpciBvd24uIFRvIGNyZWF0ZSBvclxuICogdXBkYXRlIERPTSB5b3UgbmVlZCB0byByZW5kZXIgdGhlIGBUZW1wbGF0ZVJlc3VsdGAuIFNlZVxuICogW1JlbmRlcmluZ10oaHR0cHM6Ly9saXQuZGV2L2RvY3MvY29tcG9uZW50cy9yZW5kZXJpbmcpIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICpcbiAqIEluIExpdCA0LCB0aGlzIHR5cGUgd2lsbCBiZSBhbiBhbGlhcyBvZlxuICogTWF5YmVDb21waWxlZFRlbXBsYXRlUmVzdWx0LCBzbyB0aGF0IGNvZGUgd2lsbCBnZXQgdHlwZSBlcnJvcnMgaWYgaXQgYXNzdW1lc1xuICogdGhhdCBMaXQgdGVtcGxhdGVzIGFyZSBub3QgY29tcGlsZWQuIFdoZW4gZGVsaWJlcmF0ZWx5IHdvcmtpbmcgd2l0aCBvbmx5XG4gKiBvbmUsIHVzZSBlaXRoZXIge0BsaW5rY29kZSBDb21waWxlZFRlbXBsYXRlUmVzdWx0fSBvclxuICoge0BsaW5rY29kZSBVbmNvbXBpbGVkVGVtcGxhdGVSZXN1bHR9IGV4cGxpY2l0bHkuXG4gKi9cbmV4cG9ydCB0eXBlIFRlbXBsYXRlUmVzdWx0PFQgZXh0ZW5kcyBSZXN1bHRUeXBlID0gUmVzdWx0VHlwZT4gPVxuICBVbmNvbXBpbGVkVGVtcGxhdGVSZXN1bHQ8VD47XG5cbmV4cG9ydCB0eXBlIEhUTUxUZW1wbGF0ZVJlc3VsdCA9IFRlbXBsYXRlUmVzdWx0PHR5cGVvZiBIVE1MX1JFU1VMVD47XG5cbmV4cG9ydCB0eXBlIFNWR1RlbXBsYXRlUmVzdWx0ID0gVGVtcGxhdGVSZXN1bHQ8dHlwZW9mIFNWR19SRVNVTFQ+O1xuXG5leHBvcnQgdHlwZSBNYXRoTUxUZW1wbGF0ZVJlc3VsdCA9IFRlbXBsYXRlUmVzdWx0PHR5cGVvZiBNQVRITUxfUkVTVUxUPjtcblxuLyoqXG4gKiBBIFRlbXBsYXRlUmVzdWx0IHRoYXQgaGFzIGJlZW4gY29tcGlsZWQgYnkgQGxpdC1sYWJzL2NvbXBpbGVyLCBza2lwcGluZyB0aGVcbiAqIHByZXBhcmUgc3RlcC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21waWxlZFRlbXBsYXRlUmVzdWx0IHtcbiAgLy8gVGhpcyBpcyBhIGZhY3RvcnkgaW4gb3JkZXIgdG8gbWFrZSB0ZW1wbGF0ZSBpbml0aWFsaXphdGlvbiBsYXp5XG4gIC8vIGFuZCBhbGxvdyBTaGFkeVJlbmRlck9wdGlvbnMgc2NvcGUgdG8gYmUgcGFzc2VkIGluLlxuICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICBbJ18kbGl0VHlwZSQnXTogQ29tcGlsZWRUZW1wbGF0ZTtcbiAgdmFsdWVzOiB1bmtub3duW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRUZW1wbGF0ZSBleHRlbmRzIE9taXQ8VGVtcGxhdGUsICdlbCc+IHtcbiAgLy8gZWwgaXMgb3ZlcnJpZGRlbiB0byBiZSBvcHRpb25hbC4gV2UgaW5pdGlhbGl6ZSBpdCBvbiBmaXJzdCByZW5kZXJcbiAgZWw/OiBIVE1MVGVtcGxhdGVFbGVtZW50O1xuXG4gIC8vIFRoZSBwcmVwYXJlZCBIVE1MIHN0cmluZyB0byBjcmVhdGUgYSB0ZW1wbGF0ZSBlbGVtZW50IGZyb20uXG4gIC8vIFRoZSB0eXBlIGlzIGEgVGVtcGxhdGVTdHJpbmdzQXJyYXkgdG8gZ3VhcmFudGVlIHRoYXQgdGhlIHZhbHVlIGNhbWUgZnJvbVxuICAvLyBzb3VyY2UgY29kZSwgcHJldmVudGluZyBhIEpTT04gaW5qZWN0aW9uIGF0dGFjay5cbiAgaDogVGVtcGxhdGVTdHJpbmdzQXJyYXk7XG59XG5cbi8qKlxuICogR2VuZXJhdGVzIGEgdGVtcGxhdGUgbGl0ZXJhbCB0YWcgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgVGVtcGxhdGVSZXN1bHQgd2l0aFxuICogdGhlIGdpdmVuIHJlc3VsdCB0eXBlLlxuICovXG5jb25zdCB0YWcgPVxuICA8VCBleHRlbmRzIFJlc3VsdFR5cGU+KHR5cGU6IFQpID0+XG4gIChzdHJpbmdzOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSwgLi4udmFsdWVzOiB1bmtub3duW10pOiBUZW1wbGF0ZVJlc3VsdDxUPiA9PiB7XG4gICAgLy8gV2FybiBhZ2FpbnN0IHRlbXBsYXRlcyBvY3RhbCBlc2NhcGUgc2VxdWVuY2VzXG4gICAgLy8gV2UgZG8gdGhpcyBoZXJlIHJhdGhlciB0aGFuIGluIHJlbmRlciBzbyB0aGF0IHRoZSB3YXJuaW5nIGlzIGNsb3NlciB0byB0aGVcbiAgICAvLyB0ZW1wbGF0ZSBkZWZpbml0aW9uLlxuICAgIGlmIChERVZfTU9ERSAmJiBzdHJpbmdzLnNvbWUoKHMpID0+IHMgPT09IHVuZGVmaW5lZCkpIHtcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgJ1NvbWUgdGVtcGxhdGUgc3RyaW5ncyBhcmUgdW5kZWZpbmVkLlxcbicgK1xuICAgICAgICAgICdUaGlzIGlzIHByb2JhYmx5IGNhdXNlZCBieSBpbGxlZ2FsIG9jdGFsIGVzY2FwZSBzZXF1ZW5jZXMuJ1xuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKERFVl9NT0RFKSB7XG4gICAgICAvLyBJbXBvcnQgc3RhdGljLWh0bWwuanMgcmVzdWx0cyBpbiBhIGNpcmN1bGFyIGRlcGVuZGVuY3kgd2hpY2ggZzMgZG9lc24ndFxuICAgICAgLy8gaGFuZGxlLiBJbnN0ZWFkIHdlIGtub3cgdGhhdCBzdGF0aWMgdmFsdWVzIG11c3QgaGF2ZSB0aGUgZmllbGRcbiAgICAgIC8vIGBfJGxpdFN0YXRpYyRgLlxuICAgICAgaWYgKFxuICAgICAgICB2YWx1ZXMuc29tZSgodmFsKSA9PiAodmFsIGFzIHtfJGxpdFN0YXRpYyQ6IHVua25vd259KT8uWydfJGxpdFN0YXRpYyQnXSlcbiAgICAgICkge1xuICAgICAgICBpc3N1ZVdhcm5pbmcoXG4gICAgICAgICAgJycsXG4gICAgICAgICAgYFN0YXRpYyB2YWx1ZXMgJ2xpdGVyYWwnIG9yICd1bnNhZmVTdGF0aWMnIGNhbm5vdCBiZSB1c2VkIGFzIHZhbHVlcyB0byBub24tc3RhdGljIHRlbXBsYXRlcy5cXG5gICtcbiAgICAgICAgICAgIGBQbGVhc2UgdXNlIHRoZSBzdGF0aWMgJ2h0bWwnIHRhZyBmdW5jdGlvbi4gU2VlIGh0dHBzOi8vbGl0LmRldi9kb2NzL3RlbXBsYXRlcy9leHByZXNzaW9ucy8jc3RhdGljLWV4cHJlc3Npb25zYFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICAgIFsnXyRsaXRUeXBlJCddOiB0eXBlLFxuICAgICAgc3RyaW5ncyxcbiAgICAgIHZhbHVlcyxcbiAgICB9O1xuICB9O1xuXG4vKipcbiAqIEludGVycHJldHMgYSB0ZW1wbGF0ZSBsaXRlcmFsIGFzIGFuIEhUTUwgdGVtcGxhdGUgdGhhdCBjYW4gZWZmaWNpZW50bHlcbiAqIHJlbmRlciB0byBhbmQgdXBkYXRlIGEgY29udGFpbmVyLlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBoZWFkZXIgPSAodGl0bGU6IHN0cmluZykgPT4gaHRtbGA8aDE+JHt0aXRsZX08L2gxPmA7XG4gKiBgYGBcbiAqXG4gKiBUaGUgYGh0bWxgIHRhZyByZXR1cm5zIGEgZGVzY3JpcHRpb24gb2YgdGhlIERPTSB0byByZW5kZXIgYXMgYSB2YWx1ZS4gSXQgaXNcbiAqIGxhenksIG1lYW5pbmcgbm8gd29yayBpcyBkb25lIHVudGlsIHRoZSB0ZW1wbGF0ZSBpcyByZW5kZXJlZC4gV2hlbiByZW5kZXJpbmcsXG4gKiBpZiBhIHRlbXBsYXRlIGNvbWVzIGZyb20gdGhlIHNhbWUgZXhwcmVzc2lvbiBhcyBhIHByZXZpb3VzbHkgcmVuZGVyZWQgcmVzdWx0LFxuICogaXQncyBlZmZpY2llbnRseSB1cGRhdGVkIGluc3RlYWQgb2YgcmVwbGFjZWQuXG4gKi9cbmV4cG9ydCBjb25zdCBodG1sID0gdGFnKEhUTUxfUkVTVUxUKTtcblxuLyoqXG4gKiBJbnRlcnByZXRzIGEgdGVtcGxhdGUgbGl0ZXJhbCBhcyBhbiBTVkcgZnJhZ21lbnQgdGhhdCBjYW4gZWZmaWNpZW50bHkgcmVuZGVyXG4gKiB0byBhbmQgdXBkYXRlIGEgY29udGFpbmVyLlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCByZWN0ID0gc3ZnYDxyZWN0IHdpZHRoPVwiMTBcIiBoZWlnaHQ9XCIxMFwiPjwvcmVjdD5gO1xuICpcbiAqIGNvbnN0IG15SW1hZ2UgPSBodG1sYFxuICogICA8c3ZnIHZpZXdCb3g9XCIwIDAgMTAgMTBcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XG4gKiAgICAgJHtyZWN0fVxuICogICA8L3N2Zz5gO1xuICogYGBgXG4gKlxuICogVGhlIGBzdmdgICp0YWcgZnVuY3Rpb24qIHNob3VsZCBvbmx5IGJlIHVzZWQgZm9yIFNWRyBmcmFnbWVudHMsIG9yIGVsZW1lbnRzXG4gKiB0aGF0IHdvdWxkIGJlIGNvbnRhaW5lZCAqKmluc2lkZSoqIGFuIGA8c3ZnPmAgSFRNTCBlbGVtZW50LiBBIGNvbW1vbiBlcnJvciBpc1xuICogcGxhY2luZyBhbiBgPHN2Zz5gICplbGVtZW50KiBpbiBhIHRlbXBsYXRlIHRhZ2dlZCB3aXRoIHRoZSBgc3ZnYCB0YWdcbiAqIGZ1bmN0aW9uLiBUaGUgYDxzdmc+YCBlbGVtZW50IGlzIGFuIEhUTUwgZWxlbWVudCBhbmQgc2hvdWxkIGJlIHVzZWQgd2l0aGluIGFcbiAqIHRlbXBsYXRlIHRhZ2dlZCB3aXRoIHRoZSB7QGxpbmtjb2RlIGh0bWx9IHRhZyBmdW5jdGlvbi5cbiAqXG4gKiBJbiBMaXRFbGVtZW50IHVzYWdlLCBpdCdzIGludmFsaWQgdG8gcmV0dXJuIGFuIFNWRyBmcmFnbWVudCBmcm9tIHRoZVxuICogYHJlbmRlcigpYCBtZXRob2QsIGFzIHRoZSBTVkcgZnJhZ21lbnQgd2lsbCBiZSBjb250YWluZWQgd2l0aGluIHRoZSBlbGVtZW50J3NcbiAqIHNoYWRvdyByb290IGFuZCB0aHVzIG5vdCBiZSBwcm9wZXJseSBjb250YWluZWQgd2l0aGluIGFuIGA8c3ZnPmAgSFRNTFxuICogZWxlbWVudC5cbiAqL1xuZXhwb3J0IGNvbnN0IHN2ZyA9IHRhZyhTVkdfUkVTVUxUKTtcblxuLyoqXG4gKiBJbnRlcnByZXRzIGEgdGVtcGxhdGUgbGl0ZXJhbCBhcyBNYXRoTUwgZnJhZ21lbnQgdGhhdCBjYW4gZWZmaWNpZW50bHkgcmVuZGVyXG4gKiB0byBhbmQgdXBkYXRlIGEgY29udGFpbmVyLlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBudW0gPSBtYXRobWxgPG1uPjE8L21uPmA7XG4gKlxuICogY29uc3QgZXEgPSBodG1sYFxuICogICA8bWF0aD5cbiAqICAgICAke251bX1cbiAqICAgPC9tYXRoPmA7XG4gKiBgYGBcbiAqXG4gKiBUaGUgYG1hdGhtbGAgKnRhZyBmdW5jdGlvbiogc2hvdWxkIG9ubHkgYmUgdXNlZCBmb3IgTWF0aE1MIGZyYWdtZW50cywgb3JcbiAqIGVsZW1lbnRzIHRoYXQgd291bGQgYmUgY29udGFpbmVkICoqaW5zaWRlKiogYSBgPG1hdGg+YCBIVE1MIGVsZW1lbnQuIEEgY29tbW9uXG4gKiBlcnJvciBpcyBwbGFjaW5nIGEgYDxtYXRoPmAgKmVsZW1lbnQqIGluIGEgdGVtcGxhdGUgdGFnZ2VkIHdpdGggdGhlIGBtYXRobWxgXG4gKiB0YWcgZnVuY3Rpb24uIFRoZSBgPG1hdGg+YCBlbGVtZW50IGlzIGFuIEhUTUwgZWxlbWVudCBhbmQgc2hvdWxkIGJlIHVzZWRcbiAqIHdpdGhpbiBhIHRlbXBsYXRlIHRhZ2dlZCB3aXRoIHRoZSB7QGxpbmtjb2RlIGh0bWx9IHRhZyBmdW5jdGlvbi5cbiAqXG4gKiBJbiBMaXRFbGVtZW50IHVzYWdlLCBpdCdzIGludmFsaWQgdG8gcmV0dXJuIGFuIE1hdGhNTCBmcmFnbWVudCBmcm9tIHRoZVxuICogYHJlbmRlcigpYCBtZXRob2QsIGFzIHRoZSBNYXRoTUwgZnJhZ21lbnQgd2lsbCBiZSBjb250YWluZWQgd2l0aGluIHRoZVxuICogZWxlbWVudCdzIHNoYWRvdyByb290IGFuZCB0aHVzIG5vdCBiZSBwcm9wZXJseSBjb250YWluZWQgd2l0aGluIGEgYDxtYXRoPmBcbiAqIEhUTUwgZWxlbWVudC5cbiAqL1xuZXhwb3J0IGNvbnN0IG1hdGhtbCA9IHRhZyhNQVRITUxfUkVTVUxUKTtcblxuLyoqXG4gKiBBIHNlbnRpbmVsIHZhbHVlIHRoYXQgc2lnbmFscyB0aGF0IGEgdmFsdWUgd2FzIGhhbmRsZWQgYnkgYSBkaXJlY3RpdmUgYW5kXG4gKiBzaG91bGQgbm90IGJlIHdyaXR0ZW4gdG8gdGhlIERPTS5cbiAqL1xuZXhwb3J0IGNvbnN0IG5vQ2hhbmdlID0gU3ltYm9sLmZvcignbGl0LW5vQ2hhbmdlJyk7XG5cbi8qKlxuICogQSBzZW50aW5lbCB2YWx1ZSB0aGF0IHNpZ25hbHMgYSBDaGlsZFBhcnQgdG8gZnVsbHkgY2xlYXIgaXRzIGNvbnRlbnQuXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGJ1dHRvbiA9IGh0bWxgJHtcbiAqICB1c2VyLmlzQWRtaW5cbiAqICAgID8gaHRtbGA8YnV0dG9uPkRFTEVURTwvYnV0dG9uPmBcbiAqICAgIDogbm90aGluZ1xuICogfWA7XG4gKiBgYGBcbiAqXG4gKiBQcmVmZXIgdXNpbmcgYG5vdGhpbmdgIG92ZXIgb3RoZXIgZmFsc3kgdmFsdWVzIGFzIGl0IHByb3ZpZGVzIGEgY29uc2lzdGVudFxuICogYmVoYXZpb3IgYmV0d2VlbiB2YXJpb3VzIGV4cHJlc3Npb24gYmluZGluZyBjb250ZXh0cy5cbiAqXG4gKiBJbiBjaGlsZCBleHByZXNzaW9ucywgYHVuZGVmaW5lZGAsIGBudWxsYCwgYCcnYCwgYW5kIGBub3RoaW5nYCBhbGwgYmVoYXZlIHRoZVxuICogc2FtZSBhbmQgcmVuZGVyIG5vIG5vZGVzLiBJbiBhdHRyaWJ1dGUgZXhwcmVzc2lvbnMsIGBub3RoaW5nYCBfcmVtb3Zlc18gdGhlXG4gKiBhdHRyaWJ1dGUsIHdoaWxlIGB1bmRlZmluZWRgIGFuZCBgbnVsbGAgd2lsbCByZW5kZXIgYW4gZW1wdHkgc3RyaW5nLiBJblxuICogcHJvcGVydHkgZXhwcmVzc2lvbnMgYG5vdGhpbmdgIGJlY29tZXMgYHVuZGVmaW5lZGAuXG4gKi9cbmV4cG9ydCBjb25zdCBub3RoaW5nID0gU3ltYm9sLmZvcignbGl0LW5vdGhpbmcnKTtcblxuLyoqXG4gKiBUaGUgY2FjaGUgb2YgcHJlcGFyZWQgdGVtcGxhdGVzLCBrZXllZCBieSB0aGUgdGFnZ2VkIFRlbXBsYXRlU3RyaW5nc0FycmF5XG4gKiBhbmQgX25vdF8gYWNjb3VudGluZyBmb3IgdGhlIHNwZWNpZmljIHRlbXBsYXRlIHRhZyB1c2VkLiBUaGlzIG1lYW5zIHRoYXRcbiAqIHRlbXBsYXRlIHRhZ3MgY2Fubm90IGJlIGR5bmFtaWMgLSB0aGV5IG11c3Qgc3RhdGljYWxseSBiZSBvbmUgb2YgaHRtbCwgc3ZnLFxuICogb3IgYXR0ci4gVGhpcyByZXN0cmljdGlvbiBzaW1wbGlmaWVzIHRoZSBjYWNoZSBsb29rdXAsIHdoaWNoIGlzIG9uIHRoZSBob3RcbiAqIHBhdGggZm9yIHJlbmRlcmluZy5cbiAqL1xuY29uc3QgdGVtcGxhdGVDYWNoZSA9IG5ldyBXZWFrTWFwPFRlbXBsYXRlU3RyaW5nc0FycmF5LCBUZW1wbGF0ZT4oKTtcblxuLyoqXG4gKiBPYmplY3Qgc3BlY2lmeWluZyBvcHRpb25zIGZvciBjb250cm9sbGluZyBsaXQtaHRtbCByZW5kZXJpbmcuIE5vdGUgdGhhdFxuICogd2hpbGUgYHJlbmRlcmAgbWF5IGJlIGNhbGxlZCBtdWx0aXBsZSB0aW1lcyBvbiB0aGUgc2FtZSBgY29udGFpbmVyYCAoYW5kXG4gKiBgcmVuZGVyQmVmb3JlYCByZWZlcmVuY2Ugbm9kZSkgdG8gZWZmaWNpZW50bHkgdXBkYXRlIHRoZSByZW5kZXJlZCBjb250ZW50LFxuICogb25seSB0aGUgb3B0aW9ucyBwYXNzZWQgaW4gZHVyaW5nIHRoZSBmaXJzdCByZW5kZXIgYXJlIHJlc3BlY3RlZCBkdXJpbmdcbiAqIHRoZSBsaWZldGltZSBvZiByZW5kZXJzIHRvIHRoYXQgdW5pcXVlIGBjb250YWluZXJgICsgYHJlbmRlckJlZm9yZWBcbiAqIGNvbWJpbmF0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlbmRlck9wdGlvbnMge1xuICAvKipcbiAgICogQW4gb2JqZWN0IHRvIHVzZSBhcyB0aGUgYHRoaXNgIHZhbHVlIGZvciBldmVudCBsaXN0ZW5lcnMuIEl0J3Mgb2Z0ZW5cbiAgICogdXNlZnVsIHRvIHNldCB0aGlzIHRvIHRoZSBob3N0IGNvbXBvbmVudCByZW5kZXJpbmcgYSB0ZW1wbGF0ZS5cbiAgICovXG4gIGhvc3Q/OiBvYmplY3Q7XG4gIC8qKlxuICAgKiBBIERPTSBub2RlIGJlZm9yZSB3aGljaCB0byByZW5kZXIgY29udGVudCBpbiB0aGUgY29udGFpbmVyLlxuICAgKi9cbiAgcmVuZGVyQmVmb3JlPzogQ2hpbGROb2RlIHwgbnVsbDtcbiAgLyoqXG4gICAqIE5vZGUgdXNlZCBmb3IgY2xvbmluZyB0aGUgdGVtcGxhdGUgKGBpbXBvcnROb2RlYCB3aWxsIGJlIGNhbGxlZCBvbiB0aGlzXG4gICAqIG5vZGUpLiBUaGlzIGNvbnRyb2xzIHRoZSBgb3duZXJEb2N1bWVudGAgb2YgdGhlIHJlbmRlcmVkIERPTSwgYWxvbmcgd2l0aFxuICAgKiBhbnkgaW5oZXJpdGVkIGNvbnRleHQuIERlZmF1bHRzIHRvIHRoZSBnbG9iYWwgYGRvY3VtZW50YC5cbiAgICovXG4gIGNyZWF0aW9uU2NvcGU/OiB7aW1wb3J0Tm9kZShub2RlOiBOb2RlLCBkZWVwPzogYm9vbGVhbik6IE5vZGV9O1xuICAvKipcbiAgICogVGhlIGluaXRpYWwgY29ubmVjdGVkIHN0YXRlIGZvciB0aGUgdG9wLWxldmVsIHBhcnQgYmVpbmcgcmVuZGVyZWQuIElmIG5vXG4gICAqIGBpc0Nvbm5lY3RlZGAgb3B0aW9uIGlzIHNldCwgYEFzeW5jRGlyZWN0aXZlYHMgd2lsbCBiZSBjb25uZWN0ZWQgYnlcbiAgICogZGVmYXVsdC4gU2V0IHRvIGBmYWxzZWAgaWYgdGhlIGluaXRpYWwgcmVuZGVyIG9jY3VycyBpbiBhIGRpc2Nvbm5lY3RlZCB0cmVlXG4gICAqIGFuZCBgQXN5bmNEaXJlY3RpdmVgcyBzaG91bGQgc2VlIGBpc0Nvbm5lY3RlZCA9PT0gZmFsc2VgIGZvciB0aGVpciBpbml0aWFsXG4gICAqIHJlbmRlci4gVGhlIGBwYXJ0LnNldENvbm5lY3RlZCgpYCBtZXRob2QgbXVzdCBiZSB1c2VkIHN1YnNlcXVlbnQgdG8gaW5pdGlhbFxuICAgKiByZW5kZXIgdG8gY2hhbmdlIHRoZSBjb25uZWN0ZWQgc3RhdGUgb2YgdGhlIHBhcnQuXG4gICAqL1xuICBpc0Nvbm5lY3RlZD86IGJvb2xlYW47XG59XG5cbmNvbnN0IHdhbGtlciA9IGQuY3JlYXRlVHJlZVdhbGtlcihcbiAgZCxcbiAgMTI5IC8qIE5vZGVGaWx0ZXIuU0hPV197RUxFTUVOVHxDT01NRU5UfSAqL1xuKTtcblxubGV0IHNhbml0aXplckZhY3RvcnlJbnRlcm5hbDogU2FuaXRpemVyRmFjdG9yeSA9IG5vb3BTYW5pdGl6ZXI7XG5cbi8vXG4vLyBDbGFzc2VzIG9ubHkgYmVsb3cgaGVyZSwgY29uc3QgdmFyaWFibGUgZGVjbGFyYXRpb25zIG9ubHkgYWJvdmUgaGVyZS4uLlxuLy9cbi8vIEtlZXBpbmcgdmFyaWFibGUgZGVjbGFyYXRpb25zIGFuZCBjbGFzc2VzIHRvZ2V0aGVyIGltcHJvdmVzIG1pbmlmaWNhdGlvbi5cbi8vIEludGVyZmFjZXMgYW5kIHR5cGUgYWxpYXNlcyBjYW4gYmUgaW50ZXJsZWF2ZWQgZnJlZWx5LlxuLy9cblxuLy8gVHlwZSBmb3IgY2xhc3NlcyB0aGF0IGhhdmUgYSBgX2RpcmVjdGl2ZWAgb3IgYF9kaXJlY3RpdmVzW11gIGZpZWxkLCB1c2VkIGJ5XG4vLyBgcmVzb2x2ZURpcmVjdGl2ZWBcbmV4cG9ydCBpbnRlcmZhY2UgRGlyZWN0aXZlUGFyZW50IHtcbiAgXyRwYXJlbnQ/OiBEaXJlY3RpdmVQYXJlbnQ7XG4gIF8kaXNDb25uZWN0ZWQ6IGJvb2xlYW47XG4gIF9fZGlyZWN0aXZlPzogRGlyZWN0aXZlO1xuICBfX2RpcmVjdGl2ZXM/OiBBcnJheTxEaXJlY3RpdmUgfCB1bmRlZmluZWQ+O1xufVxuXG5mdW5jdGlvbiB0cnVzdEZyb21UZW1wbGF0ZVN0cmluZyhcbiAgdHNhOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSxcbiAgc3RyaW5nRnJvbVRTQTogc3RyaW5nXG4pOiBUcnVzdGVkSFRNTCB7XG4gIC8vIEEgc2VjdXJpdHkgY2hlY2sgdG8gcHJldmVudCBzcG9vZmluZyBvZiBMaXQgdGVtcGxhdGUgcmVzdWx0cy5cbiAgLy8gSW4gdGhlIGZ1dHVyZSwgd2UgbWF5IGJlIGFibGUgdG8gcmVwbGFjZSB0aGlzIHdpdGggQXJyYXkuaXNUZW1wbGF0ZU9iamVjdCxcbiAgLy8gdGhvdWdoIHdlIG1pZ2h0IG5lZWQgdG8gbWFrZSB0aGF0IGNoZWNrIGluc2lkZSBvZiB0aGUgaHRtbCBhbmQgc3ZnXG4gIC8vIGZ1bmN0aW9ucywgYmVjYXVzZSBwcmVjb21waWxlZCB0ZW1wbGF0ZXMgZG9uJ3QgY29tZSBpbiBhc1xuICAvLyBUZW1wbGF0ZVN0cmluZ0FycmF5IG9iamVjdHMuXG4gIGlmICghaXNBcnJheSh0c2EpIHx8ICF0c2EuaGFzT3duUHJvcGVydHkoJ3JhdycpKSB7XG4gICAgbGV0IG1lc3NhZ2UgPSAnaW52YWxpZCB0ZW1wbGF0ZSBzdHJpbmdzIGFycmF5JztcbiAgICBpZiAoREVWX01PREUpIHtcbiAgICAgIG1lc3NhZ2UgPSBgXG4gICAgICAgICAgSW50ZXJuYWwgRXJyb3I6IGV4cGVjdGVkIHRlbXBsYXRlIHN0cmluZ3MgdG8gYmUgYW4gYXJyYXlcbiAgICAgICAgICB3aXRoIGEgJ3JhdycgZmllbGQuIEZha2luZyBhIHRlbXBsYXRlIHN0cmluZ3MgYXJyYXkgYnlcbiAgICAgICAgICBjYWxsaW5nIGh0bWwgb3Igc3ZnIGxpa2UgYW4gb3JkaW5hcnkgZnVuY3Rpb24gaXMgZWZmZWN0aXZlbHlcbiAgICAgICAgICB0aGUgc2FtZSBhcyBjYWxsaW5nIHVuc2FmZUh0bWwgYW5kIGNhbiBsZWFkIHRvIG1ham9yIHNlY3VyaXR5XG4gICAgICAgICAgaXNzdWVzLCBlLmcuIG9wZW5pbmcgeW91ciBjb2RlIHVwIHRvIFhTUyBhdHRhY2tzLlxuICAgICAgICAgIElmIHlvdSdyZSB1c2luZyB0aGUgaHRtbCBvciBzdmcgdGFnZ2VkIHRlbXBsYXRlIGZ1bmN0aW9ucyBub3JtYWxseVxuICAgICAgICAgIGFuZCBzdGlsbCBzZWVpbmcgdGhpcyBlcnJvciwgcGxlYXNlIGZpbGUgYSBidWcgYXRcbiAgICAgICAgICBodHRwczovL2dpdGh1Yi5jb20vbGl0L2xpdC9pc3N1ZXMvbmV3P3RlbXBsYXRlPWJ1Z19yZXBvcnQubWRcbiAgICAgICAgICBhbmQgaW5jbHVkZSBpbmZvcm1hdGlvbiBhYm91dCB5b3VyIGJ1aWxkIHRvb2xpbmcsIGlmIGFueS5cbiAgICAgICAgYFxuICAgICAgICAudHJpbSgpXG4gICAgICAgIC5yZXBsYWNlKC9cXG4gKi9nLCAnXFxuJyk7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgfVxuICByZXR1cm4gcG9saWN5ICE9PSB1bmRlZmluZWRcbiAgICA/IHBvbGljeS5jcmVhdGVIVE1MKHN0cmluZ0Zyb21UU0EpXG4gICAgOiAoc3RyaW5nRnJvbVRTQSBhcyB1bmtub3duIGFzIFRydXN0ZWRIVE1MKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIEhUTUwgc3RyaW5nIGZvciB0aGUgZ2l2ZW4gVGVtcGxhdGVTdHJpbmdzQXJyYXkgYW5kIHJlc3VsdCB0eXBlXG4gKiAoSFRNTCBvciBTVkcpLCBhbG9uZyB3aXRoIHRoZSBjYXNlLXNlbnNpdGl2ZSBib3VuZCBhdHRyaWJ1dGUgbmFtZXMgaW5cbiAqIHRlbXBsYXRlIG9yZGVyLiBUaGUgSFRNTCBjb250YWlucyBjb21tZW50IG1hcmtlcnMgZGVub3RpbmcgdGhlIGBDaGlsZFBhcnRgc1xuICogYW5kIHN1ZmZpeGVzIG9uIGJvdW5kIGF0dHJpYnV0ZXMgZGVub3RpbmcgdGhlIGBBdHRyaWJ1dGVQYXJ0c2AuXG4gKlxuICogQHBhcmFtIHN0cmluZ3MgdGVtcGxhdGUgc3RyaW5ncyBhcnJheVxuICogQHBhcmFtIHR5cGUgSFRNTCBvciBTVkdcbiAqIEByZXR1cm4gQXJyYXkgY29udGFpbmluZyBgW2h0bWwsIGF0dHJOYW1lc11gIChhcnJheSByZXR1cm5lZCBmb3IgdGVyc2VuZXNzLFxuICogICAgIHRvIGF2b2lkIG9iamVjdCBmaWVsZHMgc2luY2UgdGhpcyBjb2RlIGlzIHNoYXJlZCB3aXRoIG5vbi1taW5pZmllZCBTU1JcbiAqICAgICBjb2RlKVxuICovXG5jb25zdCBnZXRUZW1wbGF0ZUh0bWwgPSAoXG4gIHN0cmluZ3M6IFRlbXBsYXRlU3RyaW5nc0FycmF5LFxuICB0eXBlOiBSZXN1bHRUeXBlXG4pOiBbVHJ1c3RlZEhUTUwsIEFycmF5PHN0cmluZz5dID0+IHtcbiAgLy8gSW5zZXJ0IG1ha2VycyBpbnRvIHRoZSB0ZW1wbGF0ZSBIVE1MIHRvIHJlcHJlc2VudCB0aGUgcG9zaXRpb24gb2ZcbiAgLy8gYmluZGluZ3MuIFRoZSBmb2xsb3dpbmcgY29kZSBzY2FucyB0aGUgdGVtcGxhdGUgc3RyaW5ncyB0byBkZXRlcm1pbmUgdGhlXG4gIC8vIHN5bnRhY3RpYyBwb3NpdGlvbiBvZiB0aGUgYmluZGluZ3MuIFRoZXkgY2FuIGJlIGluIHRleHQgcG9zaXRpb24sIHdoZXJlXG4gIC8vIHdlIGluc2VydCBhbiBIVE1MIGNvbW1lbnQsIGF0dHJpYnV0ZSB2YWx1ZSBwb3NpdGlvbiwgd2hlcmUgd2UgaW5zZXJ0IGFcbiAgLy8gc2VudGluZWwgc3RyaW5nIGFuZCByZS13cml0ZSB0aGUgYXR0cmlidXRlIG5hbWUsIG9yIGluc2lkZSBhIHRhZyB3aGVyZVxuICAvLyB3ZSBpbnNlcnQgdGhlIHNlbnRpbmVsIHN0cmluZy5cbiAgY29uc3QgbCA9IHN0cmluZ3MubGVuZ3RoIC0gMTtcbiAgLy8gU3RvcmVzIHRoZSBjYXNlLXNlbnNpdGl2ZSBib3VuZCBhdHRyaWJ1dGUgbmFtZXMgaW4gdGhlIG9yZGVyIG9mIHRoZWlyXG4gIC8vIHBhcnRzLiBFbGVtZW50UGFydHMgYXJlIGFsc28gcmVmbGVjdGVkIGluIHRoaXMgYXJyYXkgYXMgdW5kZWZpbmVkXG4gIC8vIHJhdGhlciB0aGFuIGEgc3RyaW5nLCB0byBkaXNhbWJpZ3VhdGUgZnJvbSBhdHRyaWJ1dGUgYmluZGluZ3MuXG4gIGNvbnN0IGF0dHJOYW1lczogQXJyYXk8c3RyaW5nPiA9IFtdO1xuICBsZXQgaHRtbCA9XG4gICAgdHlwZSA9PT0gU1ZHX1JFU1VMVCA/ICc8c3ZnPicgOiB0eXBlID09PSBNQVRITUxfUkVTVUxUID8gJzxtYXRoPicgOiAnJztcblxuICAvLyBXaGVuIHdlJ3JlIGluc2lkZSBhIHJhdyB0ZXh0IHRhZyAobm90IGl0J3MgdGV4dCBjb250ZW50KSwgdGhlIHJlZ2V4XG4gIC8vIHdpbGwgc3RpbGwgYmUgdGFnUmVnZXggc28gd2UgY2FuIGZpbmQgYXR0cmlidXRlcywgYnV0IHdpbGwgc3dpdGNoIHRvXG4gIC8vIHRoaXMgcmVnZXggd2hlbiB0aGUgdGFnIGVuZHMuXG4gIGxldCByYXdUZXh0RW5kUmVnZXg6IFJlZ0V4cCB8IHVuZGVmaW5lZDtcblxuICAvLyBUaGUgY3VycmVudCBwYXJzaW5nIHN0YXRlLCByZXByZXNlbnRlZCBhcyBhIHJlZmVyZW5jZSB0byBvbmUgb2YgdGhlXG4gIC8vIHJlZ2V4ZXNcbiAgbGV0IHJlZ2V4ID0gdGV4dEVuZFJlZ2V4O1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgY29uc3QgcyA9IHN0cmluZ3NbaV07XG4gICAgLy8gVGhlIGluZGV4IG9mIHRoZSBlbmQgb2YgdGhlIGxhc3QgYXR0cmlidXRlIG5hbWUuIFdoZW4gdGhpcyBpc1xuICAgIC8vIHBvc2l0aXZlIGF0IGVuZCBvZiBhIHN0cmluZywgaXQgbWVhbnMgd2UncmUgaW4gYW4gYXR0cmlidXRlIHZhbHVlXG4gICAgLy8gcG9zaXRpb24gYW5kIG5lZWQgdG8gcmV3cml0ZSB0aGUgYXR0cmlidXRlIG5hbWUuXG4gICAgLy8gV2UgYWxzbyB1c2UgYSBzcGVjaWFsIHZhbHVlIG9mIC0yIHRvIGluZGljYXRlIHRoYXQgd2UgZW5jb3VudGVyZWRcbiAgICAvLyB0aGUgZW5kIG9mIGEgc3RyaW5nIGluIGF0dHJpYnV0ZSBuYW1lIHBvc2l0aW9uLlxuICAgIGxldCBhdHRyTmFtZUVuZEluZGV4ID0gLTE7XG4gICAgbGV0IGF0dHJOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgbGV0IGxhc3RJbmRleCA9IDA7XG4gICAgbGV0IG1hdGNoITogUmVnRXhwRXhlY0FycmF5IHwgbnVsbDtcblxuICAgIC8vIFRoZSBjb25kaXRpb25zIGluIHRoaXMgbG9vcCBoYW5kbGUgdGhlIGN1cnJlbnQgcGFyc2Ugc3RhdGUsIGFuZCB0aGVcbiAgICAvLyBhc3NpZ25tZW50cyB0byB0aGUgYHJlZ2V4YCB2YXJpYWJsZSBhcmUgdGhlIHN0YXRlIHRyYW5zaXRpb25zLlxuICAgIHdoaWxlIChsYXN0SW5kZXggPCBzLmxlbmd0aCkge1xuICAgICAgLy8gTWFrZSBzdXJlIHdlIHN0YXJ0IHNlYXJjaGluZyBmcm9tIHdoZXJlIHdlIHByZXZpb3VzbHkgbGVmdCBvZmZcbiAgICAgIHJlZ2V4Lmxhc3RJbmRleCA9IGxhc3RJbmRleDtcbiAgICAgIG1hdGNoID0gcmVnZXguZXhlYyhzKTtcbiAgICAgIGlmIChtYXRjaCA9PT0gbnVsbCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGxhc3RJbmRleCA9IHJlZ2V4Lmxhc3RJbmRleDtcbiAgICAgIGlmIChyZWdleCA9PT0gdGV4dEVuZFJlZ2V4KSB7XG4gICAgICAgIGlmIChtYXRjaFtDT01NRU5UX1NUQVJUXSA9PT0gJyEtLScpIHtcbiAgICAgICAgICByZWdleCA9IGNvbW1lbnRFbmRSZWdleDtcbiAgICAgICAgfSBlbHNlIGlmIChtYXRjaFtDT01NRU5UX1NUQVJUXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gV2Ugc3RhcnRlZCBhIHdlaXJkIGNvbW1lbnQsIGxpa2UgPC97XG4gICAgICAgICAgcmVnZXggPSBjb21tZW50MkVuZFJlZ2V4O1xuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoW1RBR19OQU1FXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKHJhd1RleHRFbGVtZW50LnRlc3QobWF0Y2hbVEFHX05BTUVdKSkge1xuICAgICAgICAgICAgLy8gUmVjb3JkIGlmIHdlIGVuY291bnRlciBhIHJhdy10ZXh0IGVsZW1lbnQuIFdlJ2xsIHN3aXRjaCB0b1xuICAgICAgICAgICAgLy8gdGhpcyByZWdleCBhdCB0aGUgZW5kIG9mIHRoZSB0YWcuXG4gICAgICAgICAgICByYXdUZXh0RW5kUmVnZXggPSBuZXcgUmVnRXhwKGA8LyR7bWF0Y2hbVEFHX05BTUVdfWAsICdnJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlZ2V4ID0gdGFnRW5kUmVnZXg7XG4gICAgICAgIH0gZWxzZSBpZiAobWF0Y2hbRFlOQU1JQ19UQUdfTkFNRV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmIChERVZfTU9ERSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAnQmluZGluZ3MgaW4gdGFnIG5hbWVzIGFyZSBub3Qgc3VwcG9ydGVkLiBQbGVhc2UgdXNlIHN0YXRpYyB0ZW1wbGF0ZXMgaW5zdGVhZC4gJyArXG4gICAgICAgICAgICAgICAgJ1NlZSBodHRwczovL2xpdC5kZXYvZG9jcy90ZW1wbGF0ZXMvZXhwcmVzc2lvbnMvI3N0YXRpYy1leHByZXNzaW9ucydcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlZ2V4ID0gdGFnRW5kUmVnZXg7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocmVnZXggPT09IHRhZ0VuZFJlZ2V4KSB7XG4gICAgICAgIGlmIChtYXRjaFtFTlRJUkVfTUFUQ0hdID09PSAnPicpIHtcbiAgICAgICAgICAvLyBFbmQgb2YgYSB0YWcuIElmIHdlIGhhZCBzdGFydGVkIGEgcmF3LXRleHQgZWxlbWVudCwgdXNlIHRoYXRcbiAgICAgICAgICAvLyByZWdleFxuICAgICAgICAgIHJlZ2V4ID0gcmF3VGV4dEVuZFJlZ2V4ID8/IHRleHRFbmRSZWdleDtcbiAgICAgICAgICAvLyBXZSBtYXkgYmUgZW5kaW5nIGFuIHVucXVvdGVkIGF0dHJpYnV0ZSB2YWx1ZSwgc28gbWFrZSBzdXJlIHdlXG4gICAgICAgICAgLy8gY2xlYXIgYW55IHBlbmRpbmcgYXR0ck5hbWVFbmRJbmRleFxuICAgICAgICAgIGF0dHJOYW1lRW5kSW5kZXggPSAtMTtcbiAgICAgICAgfSBlbHNlIGlmIChtYXRjaFtBVFRSSUJVVEVfTkFNRV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIEF0dHJpYnV0ZSBuYW1lIHBvc2l0aW9uXG4gICAgICAgICAgYXR0ck5hbWVFbmRJbmRleCA9IC0yO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF0dHJOYW1lRW5kSW5kZXggPSByZWdleC5sYXN0SW5kZXggLSBtYXRjaFtTUEFDRVNfQU5EX0VRVUFMU10ubGVuZ3RoO1xuICAgICAgICAgIGF0dHJOYW1lID0gbWF0Y2hbQVRUUklCVVRFX05BTUVdO1xuICAgICAgICAgIHJlZ2V4ID1cbiAgICAgICAgICAgIG1hdGNoW1FVT1RFX0NIQVJdID09PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgPyB0YWdFbmRSZWdleFxuICAgICAgICAgICAgICA6IG1hdGNoW1FVT1RFX0NIQVJdID09PSAnXCInXG4gICAgICAgICAgICAgICAgPyBkb3VibGVRdW90ZUF0dHJFbmRSZWdleFxuICAgICAgICAgICAgICAgIDogc2luZ2xlUXVvdGVBdHRyRW5kUmVnZXg7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHJlZ2V4ID09PSBkb3VibGVRdW90ZUF0dHJFbmRSZWdleCB8fFxuICAgICAgICByZWdleCA9PT0gc2luZ2xlUXVvdGVBdHRyRW5kUmVnZXhcbiAgICAgICkge1xuICAgICAgICByZWdleCA9IHRhZ0VuZFJlZ2V4O1xuICAgICAgfSBlbHNlIGlmIChyZWdleCA9PT0gY29tbWVudEVuZFJlZ2V4IHx8IHJlZ2V4ID09PSBjb21tZW50MkVuZFJlZ2V4KSB7XG4gICAgICAgIHJlZ2V4ID0gdGV4dEVuZFJlZ2V4O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gTm90IG9uZSBvZiB0aGUgZml2ZSBzdGF0ZSByZWdleGVzLCBzbyBpdCBtdXN0IGJlIHRoZSBkeW5hbWljYWxseVxuICAgICAgICAvLyBjcmVhdGVkIHJhdyB0ZXh0IHJlZ2V4IGFuZCB3ZSdyZSBhdCB0aGUgY2xvc2Ugb2YgdGhhdCBlbGVtZW50LlxuICAgICAgICByZWdleCA9IHRhZ0VuZFJlZ2V4O1xuICAgICAgICByYXdUZXh0RW5kUmVnZXggPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKERFVl9NT0RFKSB7XG4gICAgICAvLyBJZiB3ZSBoYXZlIGEgYXR0ck5hbWVFbmRJbmRleCwgd2hpY2ggaW5kaWNhdGVzIHRoYXQgd2Ugc2hvdWxkXG4gICAgICAvLyByZXdyaXRlIHRoZSBhdHRyaWJ1dGUgbmFtZSwgYXNzZXJ0IHRoYXQgd2UncmUgaW4gYSB2YWxpZCBhdHRyaWJ1dGVcbiAgICAgIC8vIHBvc2l0aW9uIC0gZWl0aGVyIGluIGEgdGFnLCBvciBhIHF1b3RlZCBhdHRyaWJ1dGUgdmFsdWUuXG4gICAgICBjb25zb2xlLmFzc2VydChcbiAgICAgICAgYXR0ck5hbWVFbmRJbmRleCA9PT0gLTEgfHxcbiAgICAgICAgICByZWdleCA9PT0gdGFnRW5kUmVnZXggfHxcbiAgICAgICAgICByZWdleCA9PT0gc2luZ2xlUXVvdGVBdHRyRW5kUmVnZXggfHxcbiAgICAgICAgICByZWdleCA9PT0gZG91YmxlUXVvdGVBdHRyRW5kUmVnZXgsXG4gICAgICAgICd1bmV4cGVjdGVkIHBhcnNlIHN0YXRlIEInXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIFdlIGhhdmUgZm91ciBjYXNlczpcbiAgICAvLyAgMS4gV2UncmUgaW4gdGV4dCBwb3NpdGlvbiwgYW5kIG5vdCBpbiBhIHJhdyB0ZXh0IGVsZW1lbnRcbiAgICAvLyAgICAgKHJlZ2V4ID09PSB0ZXh0RW5kUmVnZXgpOiBpbnNlcnQgYSBjb21tZW50IG1hcmtlci5cbiAgICAvLyAgMi4gV2UgaGF2ZSBhIG5vbi1uZWdhdGl2ZSBhdHRyTmFtZUVuZEluZGV4IHdoaWNoIG1lYW5zIHdlIG5lZWQgdG9cbiAgICAvLyAgICAgcmV3cml0ZSB0aGUgYXR0cmlidXRlIG5hbWUgdG8gYWRkIGEgYm91bmQgYXR0cmlidXRlIHN1ZmZpeC5cbiAgICAvLyAgMy4gV2UncmUgYXQgdGhlIG5vbi1maXJzdCBiaW5kaW5nIGluIGEgbXVsdGktYmluZGluZyBhdHRyaWJ1dGUsIHVzZSBhXG4gICAgLy8gICAgIHBsYWluIG1hcmtlci5cbiAgICAvLyAgNC4gV2UncmUgc29tZXdoZXJlIGVsc2UgaW5zaWRlIHRoZSB0YWcuIElmIHdlJ3JlIGluIGF0dHJpYnV0ZSBuYW1lXG4gICAgLy8gICAgIHBvc2l0aW9uIChhdHRyTmFtZUVuZEluZGV4ID09PSAtMiksIGFkZCBhIHNlcXVlbnRpYWwgc3VmZml4IHRvXG4gICAgLy8gICAgIGdlbmVyYXRlIGEgdW5pcXVlIGF0dHJpYnV0ZSBuYW1lLlxuXG4gICAgLy8gRGV0ZWN0IGEgYmluZGluZyBuZXh0IHRvIHNlbGYtY2xvc2luZyB0YWcgZW5kIGFuZCBpbnNlcnQgYSBzcGFjZSB0b1xuICAgIC8vIHNlcGFyYXRlIHRoZSBtYXJrZXIgZnJvbSB0aGUgdGFnIGVuZDpcbiAgICBjb25zdCBlbmQgPVxuICAgICAgcmVnZXggPT09IHRhZ0VuZFJlZ2V4ICYmIHN0cmluZ3NbaSArIDFdLnN0YXJ0c1dpdGgoJy8+JykgPyAnICcgOiAnJztcbiAgICBodG1sICs9XG4gICAgICByZWdleCA9PT0gdGV4dEVuZFJlZ2V4XG4gICAgICAgID8gcyArIG5vZGVNYXJrZXJcbiAgICAgICAgOiBhdHRyTmFtZUVuZEluZGV4ID49IDBcbiAgICAgICAgICA/IChhdHRyTmFtZXMucHVzaChhdHRyTmFtZSEpLFxuICAgICAgICAgICAgcy5zbGljZSgwLCBhdHRyTmFtZUVuZEluZGV4KSArXG4gICAgICAgICAgICAgIGJvdW5kQXR0cmlidXRlU3VmZml4ICtcbiAgICAgICAgICAgICAgcy5zbGljZShhdHRyTmFtZUVuZEluZGV4KSkgK1xuICAgICAgICAgICAgbWFya2VyICtcbiAgICAgICAgICAgIGVuZFxuICAgICAgICAgIDogcyArIG1hcmtlciArIChhdHRyTmFtZUVuZEluZGV4ID09PSAtMiA/IGkgOiBlbmQpO1xuICB9XG5cbiAgY29uc3QgaHRtbFJlc3VsdDogc3RyaW5nIHwgVHJ1c3RlZEhUTUwgPVxuICAgIGh0bWwgK1xuICAgIChzdHJpbmdzW2xdIHx8ICc8Pz4nKSArXG4gICAgKHR5cGUgPT09IFNWR19SRVNVTFQgPyAnPC9zdmc+JyA6IHR5cGUgPT09IE1BVEhNTF9SRVNVTFQgPyAnPC9tYXRoPicgOiAnJyk7XG5cbiAgLy8gUmV0dXJuZWQgYXMgYW4gYXJyYXkgZm9yIHRlcnNlbmVzc1xuICByZXR1cm4gW3RydXN0RnJvbVRlbXBsYXRlU3RyaW5nKHN0cmluZ3MsIGh0bWxSZXN1bHQpLCBhdHRyTmFtZXNdO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUge1RlbXBsYXRlfTtcbmNsYXNzIFRlbXBsYXRlIHtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBlbCE6IEhUTUxUZW1wbGF0ZUVsZW1lbnQ7XG5cbiAgcGFydHM6IEFycmF5PFRlbXBsYXRlUGFydD4gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIHtzdHJpbmdzLCBbJ18kbGl0VHlwZSQnXTogdHlwZX06IFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdCxcbiAgICBvcHRpb25zPzogUmVuZGVyT3B0aW9uc1xuICApIHtcbiAgICBsZXQgbm9kZTogTm9kZSB8IG51bGw7XG4gICAgbGV0IG5vZGVJbmRleCA9IDA7XG4gICAgbGV0IGF0dHJOYW1lSW5kZXggPSAwO1xuICAgIGNvbnN0IHBhcnRDb3VudCA9IHN0cmluZ3MubGVuZ3RoIC0gMTtcbiAgICBjb25zdCBwYXJ0cyA9IHRoaXMucGFydHM7XG5cbiAgICAvLyBDcmVhdGUgdGVtcGxhdGUgZWxlbWVudFxuICAgIGNvbnN0IFtodG1sLCBhdHRyTmFtZXNdID0gZ2V0VGVtcGxhdGVIdG1sKHN0cmluZ3MsIHR5cGUpO1xuICAgIHRoaXMuZWwgPSBUZW1wbGF0ZS5jcmVhdGVFbGVtZW50KGh0bWwsIG9wdGlvbnMpO1xuICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IHRoaXMuZWwuY29udGVudDtcblxuICAgIC8vIFJlLXBhcmVudCBTVkcgb3IgTWF0aE1MIG5vZGVzIGludG8gdGVtcGxhdGUgcm9vdFxuICAgIGlmICh0eXBlID09PSBTVkdfUkVTVUxUIHx8IHR5cGUgPT09IE1BVEhNTF9SRVNVTFQpIHtcbiAgICAgIGNvbnN0IHdyYXBwZXIgPSB0aGlzLmVsLmNvbnRlbnQuZmlyc3RDaGlsZCE7XG4gICAgICB3cmFwcGVyLnJlcGxhY2VXaXRoKC4uLndyYXBwZXIuY2hpbGROb2Rlcyk7XG4gICAgfVxuXG4gICAgLy8gV2FsayB0aGUgdGVtcGxhdGUgdG8gZmluZCBiaW5kaW5nIG1hcmtlcnMgYW5kIGNyZWF0ZSBUZW1wbGF0ZVBhcnRzXG4gICAgd2hpbGUgKChub2RlID0gd2Fsa2VyLm5leHROb2RlKCkpICE9PSBudWxsICYmIHBhcnRzLmxlbmd0aCA8IHBhcnRDb3VudCkge1xuICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgaWYgKERFVl9NT0RFKSB7XG4gICAgICAgICAgY29uc3QgdGFnID0gKG5vZGUgYXMgRWxlbWVudCkubG9jYWxOYW1lO1xuICAgICAgICAgIC8vIFdhcm4gaWYgYHRleHRhcmVhYCBpbmNsdWRlcyBhbiBleHByZXNzaW9uIGFuZCB0aHJvdyBpZiBgdGVtcGxhdGVgXG4gICAgICAgICAgLy8gZG9lcyBzaW5jZSB0aGVzZSBhcmUgbm90IHN1cHBvcnRlZC4gV2UgZG8gdGhpcyBieSBjaGVja2luZ1xuICAgICAgICAgIC8vIGlubmVySFRNTCBmb3IgYW55dGhpbmcgdGhhdCBsb29rcyBsaWtlIGEgbWFya2VyLiBUaGlzIGNhdGNoZXNcbiAgICAgICAgICAvLyBjYXNlcyBsaWtlIGJpbmRpbmdzIGluIHRleHRhcmVhIHRoZXJlIG1hcmtlcnMgdHVybiBpbnRvIHRleHQgbm9kZXMuXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgL14oPzp0ZXh0YXJlYXx0ZW1wbGF0ZSkkL2khLnRlc3QodGFnKSAmJlxuICAgICAgICAgICAgKG5vZGUgYXMgRWxlbWVudCkuaW5uZXJIVE1MLmluY2x1ZGVzKG1hcmtlcilcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIGNvbnN0IG0gPVxuICAgICAgICAgICAgICBgRXhwcmVzc2lvbnMgYXJlIG5vdCBzdXBwb3J0ZWQgaW5zaWRlIFxcYCR7dGFnfVxcYCBgICtcbiAgICAgICAgICAgICAgYGVsZW1lbnRzLiBTZWUgaHR0cHM6Ly9saXQuZGV2L21zZy9leHByZXNzaW9uLWluLSR7dGFnfSBmb3IgbW9yZSBgICtcbiAgICAgICAgICAgICAgYGluZm9ybWF0aW9uLmA7XG4gICAgICAgICAgICBpZiAodGFnID09PSAndGVtcGxhdGUnKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtKTtcbiAgICAgICAgICAgIH0gZWxzZSBpc3N1ZVdhcm5pbmcoJycsIG0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPIChqdXN0aW5mYWduYW5pKTogZm9yIGF0dGVtcHRlZCBkeW5hbWljIHRhZyBuYW1lcywgd2UgZG9uJ3RcbiAgICAgICAgLy8gaW5jcmVtZW50IHRoZSBiaW5kaW5nSW5kZXgsIGFuZCBpdCdsbCBiZSBvZmYgYnkgMSBpbiB0aGUgZWxlbWVudFxuICAgICAgICAvLyBhbmQgb2ZmIGJ5IHR3byBhZnRlciBpdC5cbiAgICAgICAgaWYgKChub2RlIGFzIEVsZW1lbnQpLmhhc0F0dHJpYnV0ZXMoKSkge1xuICAgICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiAobm9kZSBhcyBFbGVtZW50KS5nZXRBdHRyaWJ1dGVOYW1lcygpKSB7XG4gICAgICAgICAgICBpZiAobmFtZS5lbmRzV2l0aChib3VuZEF0dHJpYnV0ZVN1ZmZpeCkpIHtcbiAgICAgICAgICAgICAgY29uc3QgcmVhbE5hbWUgPSBhdHRyTmFtZXNbYXR0ck5hbWVJbmRleCsrXTtcbiAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAobm9kZSBhcyBFbGVtZW50KS5nZXRBdHRyaWJ1dGUobmFtZSkhO1xuICAgICAgICAgICAgICBjb25zdCBzdGF0aWNzID0gdmFsdWUuc3BsaXQobWFya2VyKTtcbiAgICAgICAgICAgICAgY29uc3QgbSA9IC8oWy4/QF0pPyguKikvLmV4ZWMocmVhbE5hbWUpITtcbiAgICAgICAgICAgICAgcGFydHMucHVzaCh7XG4gICAgICAgICAgICAgICAgdHlwZTogQVRUUklCVVRFX1BBUlQsXG4gICAgICAgICAgICAgICAgaW5kZXg6IG5vZGVJbmRleCxcbiAgICAgICAgICAgICAgICBuYW1lOiBtWzJdLFxuICAgICAgICAgICAgICAgIHN0cmluZ3M6IHN0YXRpY3MsXG4gICAgICAgICAgICAgICAgY3RvcjpcbiAgICAgICAgICAgICAgICAgIG1bMV0gPT09ICcuJ1xuICAgICAgICAgICAgICAgICAgICA/IFByb3BlcnR5UGFydFxuICAgICAgICAgICAgICAgICAgICA6IG1bMV0gPT09ICc/J1xuICAgICAgICAgICAgICAgICAgICAgID8gQm9vbGVhbkF0dHJpYnV0ZVBhcnRcbiAgICAgICAgICAgICAgICAgICAgICA6IG1bMV0gPT09ICdAJ1xuICAgICAgICAgICAgICAgICAgICAgICAgPyBFdmVudFBhcnRcbiAgICAgICAgICAgICAgICAgICAgICAgIDogQXR0cmlidXRlUGFydCxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIChub2RlIGFzIEVsZW1lbnQpLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobmFtZS5zdGFydHNXaXRoKG1hcmtlcikpIHtcbiAgICAgICAgICAgICAgcGFydHMucHVzaCh7XG4gICAgICAgICAgICAgICAgdHlwZTogRUxFTUVOVF9QQVJULFxuICAgICAgICAgICAgICAgIGluZGV4OiBub2RlSW5kZXgsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAobm9kZSBhcyBFbGVtZW50KS5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE8gKGp1c3RpbmZhZ25hbmkpOiBiZW5jaG1hcmsgdGhlIHJlZ2V4IGFnYWluc3QgdGVzdGluZyBmb3IgZWFjaFxuICAgICAgICAvLyBvZiB0aGUgMyByYXcgdGV4dCBlbGVtZW50IG5hbWVzLlxuICAgICAgICBpZiAocmF3VGV4dEVsZW1lbnQudGVzdCgobm9kZSBhcyBFbGVtZW50KS50YWdOYW1lKSkge1xuICAgICAgICAgIC8vIEZvciByYXcgdGV4dCBlbGVtZW50cyB3ZSBuZWVkIHRvIHNwbGl0IHRoZSB0ZXh0IGNvbnRlbnQgb25cbiAgICAgICAgICAvLyBtYXJrZXJzLCBjcmVhdGUgYSBUZXh0IG5vZGUgZm9yIGVhY2ggc2VnbWVudCwgYW5kIGNyZWF0ZVxuICAgICAgICAgIC8vIGEgVGVtcGxhdGVQYXJ0IGZvciBlYWNoIG1hcmtlci5cbiAgICAgICAgICBjb25zdCBzdHJpbmdzID0gKG5vZGUgYXMgRWxlbWVudCkudGV4dENvbnRlbnQhLnNwbGl0KG1hcmtlcik7XG4gICAgICAgICAgY29uc3QgbGFzdEluZGV4ID0gc3RyaW5ncy5sZW5ndGggLSAxO1xuICAgICAgICAgIGlmIChsYXN0SW5kZXggPiAwKSB7XG4gICAgICAgICAgICAobm9kZSBhcyBFbGVtZW50KS50ZXh0Q29udGVudCA9IHRydXN0ZWRUeXBlc1xuICAgICAgICAgICAgICA/ICh0cnVzdGVkVHlwZXMuZW1wdHlTY3JpcHQgYXMgdW5rbm93biBhcyAnJylcbiAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgICAgIC8vIEdlbmVyYXRlIGEgbmV3IHRleHQgbm9kZSBmb3IgZWFjaCBsaXRlcmFsIHNlY3Rpb25cbiAgICAgICAgICAgIC8vIFRoZXNlIG5vZGVzIGFyZSBhbHNvIHVzZWQgYXMgdGhlIG1hcmtlcnMgZm9yIGNoaWxkIHBhcnRzXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxhc3RJbmRleDsgaSsrKSB7XG4gICAgICAgICAgICAgIChub2RlIGFzIEVsZW1lbnQpLmFwcGVuZChzdHJpbmdzW2ldLCBjcmVhdGVNYXJrZXIoKSk7XG4gICAgICAgICAgICAgIC8vIFdhbGsgcGFzdCB0aGUgbWFya2VyIG5vZGUgd2UganVzdCBhZGRlZFxuICAgICAgICAgICAgICB3YWxrZXIubmV4dE5vZGUoKTtcbiAgICAgICAgICAgICAgcGFydHMucHVzaCh7dHlwZTogQ0hJTERfUEFSVCwgaW5kZXg6ICsrbm9kZUluZGV4fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBOb3RlIGJlY2F1c2UgdGhpcyBtYXJrZXIgaXMgYWRkZWQgYWZ0ZXIgdGhlIHdhbGtlcidzIGN1cnJlbnRcbiAgICAgICAgICAgIC8vIG5vZGUsIGl0IHdpbGwgYmUgd2Fsa2VkIHRvIGluIHRoZSBvdXRlciBsb29wIChhbmQgaWdub3JlZCksIHNvXG4gICAgICAgICAgICAvLyB3ZSBkb24ndCBuZWVkIHRvIGFkanVzdCBub2RlSW5kZXggaGVyZVxuICAgICAgICAgICAgKG5vZGUgYXMgRWxlbWVudCkuYXBwZW5kKHN0cmluZ3NbbGFzdEluZGV4XSwgY3JlYXRlTWFya2VyKCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChub2RlLm5vZGVUeXBlID09PSA4KSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSAobm9kZSBhcyBDb21tZW50KS5kYXRhO1xuICAgICAgICBpZiAoZGF0YSA9PT0gbWFya2VyTWF0Y2gpIHtcbiAgICAgICAgICBwYXJ0cy5wdXNoKHt0eXBlOiBDSElMRF9QQVJULCBpbmRleDogbm9kZUluZGV4fSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0IGkgPSAtMTtcbiAgICAgICAgICB3aGlsZSAoKGkgPSAobm9kZSBhcyBDb21tZW50KS5kYXRhLmluZGV4T2YobWFya2VyLCBpICsgMSkpICE9PSAtMSkge1xuICAgICAgICAgICAgLy8gQ29tbWVudCBub2RlIGhhcyBhIGJpbmRpbmcgbWFya2VyIGluc2lkZSwgbWFrZSBhbiBpbmFjdGl2ZSBwYXJ0XG4gICAgICAgICAgICAvLyBUaGUgYmluZGluZyB3b24ndCB3b3JrLCBidXQgc3Vic2VxdWVudCBiaW5kaW5ncyB3aWxsXG4gICAgICAgICAgICBwYXJ0cy5wdXNoKHt0eXBlOiBDT01NRU5UX1BBUlQsIGluZGV4OiBub2RlSW5kZXh9KTtcbiAgICAgICAgICAgIC8vIE1vdmUgdG8gdGhlIGVuZCBvZiB0aGUgbWF0Y2hcbiAgICAgICAgICAgIGkgKz0gbWFya2VyLmxlbmd0aCAtIDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBub2RlSW5kZXgrKztcbiAgICB9XG5cbiAgICBpZiAoREVWX01PREUpIHtcbiAgICAgIC8vIElmIHRoZXJlIHdhcyBhIGR1cGxpY2F0ZSBhdHRyaWJ1dGUgb24gYSB0YWcsIHRoZW4gd2hlbiB0aGUgdGFnIGlzXG4gICAgICAvLyBwYXJzZWQgaW50byBhbiBlbGVtZW50IHRoZSBhdHRyaWJ1dGUgZ2V0cyBkZS1kdXBsaWNhdGVkLiBXZSBjYW4gZGV0ZWN0XG4gICAgICAvLyB0aGlzIG1pc21hdGNoIGlmIHdlIGhhdmVuJ3QgcHJlY2lzZWx5IGNvbnN1bWVkIGV2ZXJ5IGF0dHJpYnV0ZSBuYW1lXG4gICAgICAvLyB3aGVuIHByZXBhcmluZyB0aGUgdGVtcGxhdGUuIFRoaXMgd29ya3MgYmVjYXVzZSBgYXR0ck5hbWVzYCBpcyBidWlsdFxuICAgICAgLy8gZnJvbSB0aGUgdGVtcGxhdGUgc3RyaW5nIGFuZCBgYXR0ck5hbWVJbmRleGAgY29tZXMgZnJvbSBwcm9jZXNzaW5nIHRoZVxuICAgICAgLy8gcmVzdWx0aW5nIERPTS5cbiAgICAgIGlmIChhdHRyTmFtZXMubGVuZ3RoICE9PSBhdHRyTmFtZUluZGV4KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgRGV0ZWN0ZWQgZHVwbGljYXRlIGF0dHJpYnV0ZSBiaW5kaW5ncy4gVGhpcyBvY2N1cnMgaWYgeW91ciB0ZW1wbGF0ZSBgICtcbiAgICAgICAgICAgIGBoYXMgZHVwbGljYXRlIGF0dHJpYnV0ZXMgb24gYW4gZWxlbWVudCB0YWcuIEZvciBleGFtcGxlIGAgK1xuICAgICAgICAgICAgYFwiPGlucHV0ID9kaXNhYmxlZD1cXCR7dHJ1ZX0gP2Rpc2FibGVkPVxcJHtmYWxzZX0+XCIgY29udGFpbnMgYSBgICtcbiAgICAgICAgICAgIGBkdXBsaWNhdGUgXCJkaXNhYmxlZFwiIGF0dHJpYnV0ZS4gVGhlIGVycm9yIHdhcyBkZXRlY3RlZCBpbiBgICtcbiAgICAgICAgICAgIGB0aGUgZm9sbG93aW5nIHRlbXBsYXRlOiBcXG5gICtcbiAgICAgICAgICAgICdgJyArXG4gICAgICAgICAgICBzdHJpbmdzLmpvaW4oJyR7Li4ufScpICtcbiAgICAgICAgICAgICdgJ1xuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFdlIGNvdWxkIHNldCB3YWxrZXIuY3VycmVudE5vZGUgdG8gYW5vdGhlciBub2RlIGhlcmUgdG8gcHJldmVudCBhIG1lbW9yeVxuICAgIC8vIGxlYWssIGJ1dCBldmVyeSB0aW1lIHdlIHByZXBhcmUgYSB0ZW1wbGF0ZSwgd2UgaW1tZWRpYXRlbHkgcmVuZGVyIGl0XG4gICAgLy8gYW5kIHJlLXVzZSB0aGUgd2Fsa2VyIGluIG5ldyBUZW1wbGF0ZUluc3RhbmNlLl9jbG9uZSgpLlxuICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAgICBraW5kOiAndGVtcGxhdGUgcHJlcCcsXG4gICAgICAgIHRlbXBsYXRlOiB0aGlzLFxuICAgICAgICBjbG9uYWJsZVRlbXBsYXRlOiB0aGlzLmVsLFxuICAgICAgICBwYXJ0czogdGhpcy5wYXJ0cyxcbiAgICAgICAgc3RyaW5ncyxcbiAgICAgIH0pO1xuICB9XG5cbiAgLy8gT3ZlcnJpZGRlbiB2aWEgYGxpdEh0bWxQb2x5ZmlsbFN1cHBvcnRgIHRvIHByb3ZpZGUgcGxhdGZvcm0gc3VwcG9ydC5cbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBjcmVhdGVFbGVtZW50KGh0bWw6IFRydXN0ZWRIVE1MLCBfb3B0aW9ucz86IFJlbmRlck9wdGlvbnMpIHtcbiAgICBjb25zdCBlbCA9IGQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICBlbC5pbm5lckhUTUwgPSBodG1sIGFzIHVua25vd24gYXMgc3RyaW5nO1xuICAgIHJldHVybiBlbDtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIERpc2Nvbm5lY3RhYmxlIHtcbiAgXyRwYXJlbnQ/OiBEaXNjb25uZWN0YWJsZTtcbiAgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuPzogU2V0PERpc2Nvbm5lY3RhYmxlPjtcbiAgLy8gUmF0aGVyIHRoYW4gaG9sZCBjb25uZWN0aW9uIHN0YXRlIG9uIGluc3RhbmNlcywgRGlzY29ubmVjdGFibGVzIHJlY3Vyc2l2ZWx5XG4gIC8vIGZldGNoIHRoZSBjb25uZWN0aW9uIHN0YXRlIGZyb20gdGhlIFJvb3RQYXJ0IHRoZXkgYXJlIGNvbm5lY3RlZCBpbiB2aWFcbiAgLy8gZ2V0dGVycyB1cCB0aGUgRGlzY29ubmVjdGFibGUgdHJlZSB2aWEgXyRwYXJlbnQgcmVmZXJlbmNlcy4gVGhpcyBwdXNoZXMgdGhlXG4gIC8vIGNvc3Qgb2YgdHJhY2tpbmcgdGhlIGlzQ29ubmVjdGVkIHN0YXRlIHRvIGBBc3luY0RpcmVjdGl2ZXNgLCBhbmQgYXZvaWRzXG4gIC8vIG5lZWRpbmcgdG8gcGFzcyBhbGwgRGlzY29ubmVjdGFibGVzIChwYXJ0cywgdGVtcGxhdGUgaW5zdGFuY2VzLCBhbmRcbiAgLy8gZGlyZWN0aXZlcykgdGhlaXIgY29ubmVjdGlvbiBzdGF0ZSBlYWNoIHRpbWUgaXQgY2hhbmdlcywgd2hpY2ggd291bGQgYmVcbiAgLy8gY29zdGx5IGZvciB0cmVlcyB0aGF0IGhhdmUgbm8gQXN5bmNEaXJlY3RpdmVzLlxuICBfJGlzQ29ubmVjdGVkOiBib29sZWFuO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlRGlyZWN0aXZlKFxuICBwYXJ0OiBDaGlsZFBhcnQgfCBBdHRyaWJ1dGVQYXJ0IHwgRWxlbWVudFBhcnQsXG4gIHZhbHVlOiB1bmtub3duLFxuICBwYXJlbnQ6IERpcmVjdGl2ZVBhcmVudCA9IHBhcnQsXG4gIGF0dHJpYnV0ZUluZGV4PzogbnVtYmVyXG4pOiB1bmtub3duIHtcbiAgLy8gQmFpbCBlYXJseSBpZiB0aGUgdmFsdWUgaXMgZXhwbGljaXRseSBub0NoYW5nZS4gTm90ZSwgdGhpcyBtZWFucyBhbnlcbiAgLy8gbmVzdGVkIGRpcmVjdGl2ZSBpcyBzdGlsbCBhdHRhY2hlZCBhbmQgaXMgbm90IHJ1bi5cbiAgaWYgKHZhbHVlID09PSBub0NoYW5nZSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBsZXQgY3VycmVudERpcmVjdGl2ZSA9XG4gICAgYXR0cmlidXRlSW5kZXggIT09IHVuZGVmaW5lZFxuICAgICAgPyAocGFyZW50IGFzIEF0dHJpYnV0ZVBhcnQpLl9fZGlyZWN0aXZlcz8uW2F0dHJpYnV0ZUluZGV4XVxuICAgICAgOiAocGFyZW50IGFzIENoaWxkUGFydCB8IEVsZW1lbnRQYXJ0IHwgRGlyZWN0aXZlKS5fX2RpcmVjdGl2ZTtcbiAgY29uc3QgbmV4dERpcmVjdGl2ZUNvbnN0cnVjdG9yID0gaXNQcmltaXRpdmUodmFsdWUpXG4gICAgPyB1bmRlZmluZWRcbiAgICA6IC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgICAodmFsdWUgYXMgRGlyZWN0aXZlUmVzdWx0KVsnXyRsaXREaXJlY3RpdmUkJ107XG4gIGlmIChjdXJyZW50RGlyZWN0aXZlPy5jb25zdHJ1Y3RvciAhPT0gbmV4dERpcmVjdGl2ZUNvbnN0cnVjdG9yKSB7XG4gICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICBjdXJyZW50RGlyZWN0aXZlPy5bJ18kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWQnXT8uKGZhbHNlKTtcbiAgICBpZiAobmV4dERpcmVjdGl2ZUNvbnN0cnVjdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGN1cnJlbnREaXJlY3RpdmUgPSB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGN1cnJlbnREaXJlY3RpdmUgPSBuZXcgbmV4dERpcmVjdGl2ZUNvbnN0cnVjdG9yKHBhcnQgYXMgUGFydEluZm8pO1xuICAgICAgY3VycmVudERpcmVjdGl2ZS5fJGluaXRpYWxpemUocGFydCwgcGFyZW50LCBhdHRyaWJ1dGVJbmRleCk7XG4gICAgfVxuICAgIGlmIChhdHRyaWJ1dGVJbmRleCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAoKHBhcmVudCBhcyBBdHRyaWJ1dGVQYXJ0KS5fX2RpcmVjdGl2ZXMgPz89IFtdKVthdHRyaWJ1dGVJbmRleF0gPVxuICAgICAgICBjdXJyZW50RGlyZWN0aXZlO1xuICAgIH0gZWxzZSB7XG4gICAgICAocGFyZW50IGFzIENoaWxkUGFydCB8IERpcmVjdGl2ZSkuX19kaXJlY3RpdmUgPSBjdXJyZW50RGlyZWN0aXZlO1xuICAgIH1cbiAgfVxuICBpZiAoY3VycmVudERpcmVjdGl2ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdmFsdWUgPSByZXNvbHZlRGlyZWN0aXZlKFxuICAgICAgcGFydCxcbiAgICAgIGN1cnJlbnREaXJlY3RpdmUuXyRyZXNvbHZlKHBhcnQsICh2YWx1ZSBhcyBEaXJlY3RpdmVSZXN1bHQpLnZhbHVlcyksXG4gICAgICBjdXJyZW50RGlyZWN0aXZlLFxuICAgICAgYXR0cmlidXRlSW5kZXhcbiAgICApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZXhwb3J0IHR5cGUge1RlbXBsYXRlSW5zdGFuY2V9O1xuLyoqXG4gKiBBbiB1cGRhdGVhYmxlIGluc3RhbmNlIG9mIGEgVGVtcGxhdGUuIEhvbGRzIHJlZmVyZW5jZXMgdG8gdGhlIFBhcnRzIHVzZWQgdG9cbiAqIHVwZGF0ZSB0aGUgdGVtcGxhdGUgaW5zdGFuY2UuXG4gKi9cbmNsYXNzIFRlbXBsYXRlSW5zdGFuY2UgaW1wbGVtZW50cyBEaXNjb25uZWN0YWJsZSB7XG4gIF8kdGVtcGxhdGU6IFRlbXBsYXRlO1xuICBfJHBhcnRzOiBBcnJheTxQYXJ0IHwgdW5kZWZpbmVkPiA9IFtdO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRwYXJlbnQ6IENoaWxkUGFydDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4/OiBTZXQ8RGlzY29ubmVjdGFibGU+ID0gdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKHRlbXBsYXRlOiBUZW1wbGF0ZSwgcGFyZW50OiBDaGlsZFBhcnQpIHtcbiAgICB0aGlzLl8kdGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgICB0aGlzLl8kcGFyZW50ID0gcGFyZW50O1xuICB9XG5cbiAgLy8gQ2FsbGVkIGJ5IENoaWxkUGFydCBwYXJlbnROb2RlIGdldHRlclxuICBnZXQgcGFyZW50Tm9kZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fJHBhcmVudC5wYXJlbnROb2RlO1xuICB9XG5cbiAgLy8gU2VlIGNvbW1lbnQgaW4gRGlzY29ubmVjdGFibGUgaW50ZXJmYWNlIGZvciB3aHkgdGhpcyBpcyBhIGdldHRlclxuICBnZXQgXyRpc0Nvbm5lY3RlZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fJHBhcmVudC5fJGlzQ29ubmVjdGVkO1xuICB9XG5cbiAgLy8gVGhpcyBtZXRob2QgaXMgc2VwYXJhdGUgZnJvbSB0aGUgY29uc3RydWN0b3IgYmVjYXVzZSB3ZSBuZWVkIHRvIHJldHVybiBhXG4gIC8vIERvY3VtZW50RnJhZ21lbnQgYW5kIHdlIGRvbid0IHdhbnQgdG8gaG9sZCBvbnRvIGl0IHdpdGggYW4gaW5zdGFuY2UgZmllbGQuXG4gIF9jbG9uZShvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkKSB7XG4gICAgY29uc3Qge1xuICAgICAgZWw6IHtjb250ZW50fSxcbiAgICAgIHBhcnRzOiBwYXJ0cyxcbiAgICB9ID0gdGhpcy5fJHRlbXBsYXRlO1xuICAgIGNvbnN0IGZyYWdtZW50ID0gKG9wdGlvbnM/LmNyZWF0aW9uU2NvcGUgPz8gZCkuaW1wb3J0Tm9kZShjb250ZW50LCB0cnVlKTtcbiAgICB3YWxrZXIuY3VycmVudE5vZGUgPSBmcmFnbWVudDtcblxuICAgIGxldCBub2RlID0gd2Fsa2VyLm5leHROb2RlKCkhO1xuICAgIGxldCBub2RlSW5kZXggPSAwO1xuICAgIGxldCBwYXJ0SW5kZXggPSAwO1xuICAgIGxldCB0ZW1wbGF0ZVBhcnQgPSBwYXJ0c1swXTtcblxuICAgIHdoaWxlICh0ZW1wbGF0ZVBhcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKG5vZGVJbmRleCA9PT0gdGVtcGxhdGVQYXJ0LmluZGV4KSB7XG4gICAgICAgIGxldCBwYXJ0OiBQYXJ0IHwgdW5kZWZpbmVkO1xuICAgICAgICBpZiAodGVtcGxhdGVQYXJ0LnR5cGUgPT09IENISUxEX1BBUlQpIHtcbiAgICAgICAgICBwYXJ0ID0gbmV3IENoaWxkUGFydChcbiAgICAgICAgICAgIG5vZGUgYXMgSFRNTEVsZW1lbnQsXG4gICAgICAgICAgICBub2RlLm5leHRTaWJsaW5nLFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgIG9wdGlvbnNcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlUGFydC50eXBlID09PSBBVFRSSUJVVEVfUEFSVCkge1xuICAgICAgICAgIHBhcnQgPSBuZXcgdGVtcGxhdGVQYXJ0LmN0b3IoXG4gICAgICAgICAgICBub2RlIGFzIEhUTUxFbGVtZW50LFxuICAgICAgICAgICAgdGVtcGxhdGVQYXJ0Lm5hbWUsXG4gICAgICAgICAgICB0ZW1wbGF0ZVBhcnQuc3RyaW5ncyxcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICBvcHRpb25zXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmICh0ZW1wbGF0ZVBhcnQudHlwZSA9PT0gRUxFTUVOVF9QQVJUKSB7XG4gICAgICAgICAgcGFydCA9IG5ldyBFbGVtZW50UGFydChub2RlIGFzIEhUTUxFbGVtZW50LCB0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl8kcGFydHMucHVzaChwYXJ0KTtcbiAgICAgICAgdGVtcGxhdGVQYXJ0ID0gcGFydHNbKytwYXJ0SW5kZXhdO1xuICAgICAgfVxuICAgICAgaWYgKG5vZGVJbmRleCAhPT0gdGVtcGxhdGVQYXJ0Py5pbmRleCkge1xuICAgICAgICBub2RlID0gd2Fsa2VyLm5leHROb2RlKCkhO1xuICAgICAgICBub2RlSW5kZXgrKztcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gV2UgbmVlZCB0byBzZXQgdGhlIGN1cnJlbnROb2RlIGF3YXkgZnJvbSB0aGUgY2xvbmVkIHRyZWUgc28gdGhhdCB3ZVxuICAgIC8vIGRvbid0IGhvbGQgb250byB0aGUgdHJlZSBldmVuIGlmIHRoZSB0cmVlIGlzIGRldGFjaGVkIGFuZCBzaG91bGQgYmVcbiAgICAvLyBmcmVlZC5cbiAgICB3YWxrZXIuY3VycmVudE5vZGUgPSBkO1xuICAgIHJldHVybiBmcmFnbWVudDtcbiAgfVxuXG4gIF91cGRhdGUodmFsdWVzOiBBcnJheTx1bmtub3duPikge1xuICAgIGxldCBpID0gMDtcbiAgICBmb3IgKGNvbnN0IHBhcnQgb2YgdGhpcy5fJHBhcnRzKSB7XG4gICAgICBpZiAocGFydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAgICAgIGtpbmQ6ICdzZXQgcGFydCcsXG4gICAgICAgICAgICBwYXJ0LFxuICAgICAgICAgICAgdmFsdWU6IHZhbHVlc1tpXSxcbiAgICAgICAgICAgIHZhbHVlSW5kZXg6IGksXG4gICAgICAgICAgICB2YWx1ZXMsXG4gICAgICAgICAgICB0ZW1wbGF0ZUluc3RhbmNlOiB0aGlzLFxuICAgICAgICAgIH0pO1xuICAgICAgICBpZiAoKHBhcnQgYXMgQXR0cmlidXRlUGFydCkuc3RyaW5ncyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgKHBhcnQgYXMgQXR0cmlidXRlUGFydCkuXyRzZXRWYWx1ZSh2YWx1ZXMsIHBhcnQgYXMgQXR0cmlidXRlUGFydCwgaSk7XG4gICAgICAgICAgLy8gVGhlIG51bWJlciBvZiB2YWx1ZXMgdGhlIHBhcnQgY29uc3VtZXMgaXMgcGFydC5zdHJpbmdzLmxlbmd0aCAtIDFcbiAgICAgICAgICAvLyBzaW5jZSB2YWx1ZXMgYXJlIGluIGJldHdlZW4gdGVtcGxhdGUgc3BhbnMuIFdlIGluY3JlbWVudCBpIGJ5IDFcbiAgICAgICAgICAvLyBsYXRlciBpbiB0aGUgbG9vcCwgc28gaW5jcmVtZW50IGl0IGJ5IHBhcnQuc3RyaW5ncy5sZW5ndGggLSAyIGhlcmVcbiAgICAgICAgICBpICs9IChwYXJ0IGFzIEF0dHJpYnV0ZVBhcnQpLnN0cmluZ3MhLmxlbmd0aCAtIDI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGFydC5fJHNldFZhbHVlKHZhbHVlc1tpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGkrKztcbiAgICB9XG4gIH1cbn1cblxuLypcbiAqIFBhcnRzXG4gKi9cbnR5cGUgQXR0cmlidXRlVGVtcGxhdGVQYXJ0ID0ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgQVRUUklCVVRFX1BBUlQ7XG4gIHJlYWRvbmx5IGluZGV4OiBudW1iZXI7XG4gIHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgY3RvcjogdHlwZW9mIEF0dHJpYnV0ZVBhcnQ7XG4gIHJlYWRvbmx5IHN0cmluZ3M6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPjtcbn07XG50eXBlIENoaWxkVGVtcGxhdGVQYXJ0ID0ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgQ0hJTERfUEFSVDtcbiAgcmVhZG9ubHkgaW5kZXg6IG51bWJlcjtcbn07XG50eXBlIEVsZW1lbnRUZW1wbGF0ZVBhcnQgPSB7XG4gIHJlYWRvbmx5IHR5cGU6IHR5cGVvZiBFTEVNRU5UX1BBUlQ7XG4gIHJlYWRvbmx5IGluZGV4OiBudW1iZXI7XG59O1xudHlwZSBDb21tZW50VGVtcGxhdGVQYXJ0ID0ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgQ09NTUVOVF9QQVJUO1xuICByZWFkb25seSBpbmRleDogbnVtYmVyO1xufTtcblxuLyoqXG4gKiBBIFRlbXBsYXRlUGFydCByZXByZXNlbnRzIGEgZHluYW1pYyBwYXJ0IGluIGEgdGVtcGxhdGUsIGJlZm9yZSB0aGUgdGVtcGxhdGVcbiAqIGlzIGluc3RhbnRpYXRlZC4gV2hlbiBhIHRlbXBsYXRlIGlzIGluc3RhbnRpYXRlZCBQYXJ0cyBhcmUgY3JlYXRlZCBmcm9tXG4gKiBUZW1wbGF0ZVBhcnRzLlxuICovXG50eXBlIFRlbXBsYXRlUGFydCA9XG4gIHwgQ2hpbGRUZW1wbGF0ZVBhcnRcbiAgfCBBdHRyaWJ1dGVUZW1wbGF0ZVBhcnRcbiAgfCBFbGVtZW50VGVtcGxhdGVQYXJ0XG4gIHwgQ29tbWVudFRlbXBsYXRlUGFydDtcblxuZXhwb3J0IHR5cGUgUGFydCA9XG4gIHwgQ2hpbGRQYXJ0XG4gIHwgQXR0cmlidXRlUGFydFxuICB8IFByb3BlcnR5UGFydFxuICB8IEJvb2xlYW5BdHRyaWJ1dGVQYXJ0XG4gIHwgRWxlbWVudFBhcnRcbiAgfCBFdmVudFBhcnQ7XG5cbmV4cG9ydCB0eXBlIHtDaGlsZFBhcnR9O1xuY2xhc3MgQ2hpbGRQYXJ0IGltcGxlbWVudHMgRGlzY29ubmVjdGFibGUge1xuICByZWFkb25seSB0eXBlID0gQ0hJTERfUEFSVDtcbiAgcmVhZG9ubHkgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgXyRjb21taXR0ZWRWYWx1ZTogdW5rbm93biA9IG5vdGhpbmc7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX19kaXJlY3RpdmU/OiBEaXJlY3RpdmU7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRzdGFydE5vZGU6IENoaWxkTm9kZTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGVuZE5vZGU6IENoaWxkTm9kZSB8IG51bGw7XG4gIHByaXZhdGUgX3RleHRTYW5pdGl6ZXI6IFZhbHVlU2FuaXRpemVyIHwgdW5kZWZpbmVkO1xuICAvKiogQGludGVybmFsICovXG4gIF8kcGFyZW50OiBEaXNjb25uZWN0YWJsZSB8IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIENvbm5lY3Rpb24gc3RhdGUgZm9yIFJvb3RQYXJ0cyBvbmx5IChpLmUuIENoaWxkUGFydCB3aXRob3V0IF8kcGFyZW50XG4gICAqIHJldHVybmVkIGZyb20gdG9wLWxldmVsIGByZW5kZXJgKS4gVGhpcyBmaWVsZCBpcyB1bnVzZWQgb3RoZXJ3aXNlLiBUaGVcbiAgICogaW50ZW50aW9uIHdvdWxkIGJlIGNsZWFyZXIgaWYgd2UgbWFkZSBgUm9vdFBhcnRgIGEgc3ViY2xhc3Mgb2YgYENoaWxkUGFydGBcbiAgICogd2l0aCB0aGlzIGZpZWxkIChhbmQgYSBkaWZmZXJlbnQgXyRpc0Nvbm5lY3RlZCBnZXR0ZXIpLCBidXQgdGhlIHN1YmNsYXNzXG4gICAqIGNhdXNlZCBhIHBlcmYgcmVncmVzc2lvbiwgcG9zc2libHkgZHVlIHRvIG1ha2luZyBjYWxsIHNpdGVzIHBvbHltb3JwaGljLlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIF9faXNDb25uZWN0ZWQ6IGJvb2xlYW47XG5cbiAgLy8gU2VlIGNvbW1lbnQgaW4gRGlzY29ubmVjdGFibGUgaW50ZXJmYWNlIGZvciB3aHkgdGhpcyBpcyBhIGdldHRlclxuICBnZXQgXyRpc0Nvbm5lY3RlZCgpIHtcbiAgICAvLyBDaGlsZFBhcnRzIHRoYXQgYXJlIG5vdCBhdCB0aGUgcm9vdCBzaG91bGQgYWx3YXlzIGJlIGNyZWF0ZWQgd2l0aCBhXG4gICAgLy8gcGFyZW50OyBvbmx5IFJvb3RDaGlsZE5vZGUncyB3b24ndCwgc28gdGhleSByZXR1cm4gdGhlIGxvY2FsIGlzQ29ubmVjdGVkXG4gICAgLy8gc3RhdGVcbiAgICByZXR1cm4gdGhpcy5fJHBhcmVudD8uXyRpc0Nvbm5lY3RlZCA/PyB0aGlzLl9faXNDb25uZWN0ZWQ7XG4gIH1cblxuICAvLyBUaGUgZm9sbG93aW5nIGZpZWxkcyB3aWxsIGJlIHBhdGNoZWQgb250byBDaGlsZFBhcnRzIHdoZW4gcmVxdWlyZWQgYnlcbiAgLy8gQXN5bmNEaXJlY3RpdmVcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4/OiBTZXQ8RGlzY29ubmVjdGFibGU+ID0gdW5kZWZpbmVkO1xuICAvKiogQGludGVybmFsICovXG4gIF8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQ/KFxuICAgIGlzQ29ubmVjdGVkOiBib29sZWFuLFxuICAgIHJlbW92ZUZyb21QYXJlbnQ/OiBib29sZWFuLFxuICAgIGZyb20/OiBudW1iZXJcbiAgKTogdm9pZDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHJlcGFyZW50RGlzY29ubmVjdGFibGVzPyhwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlKTogdm9pZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBzdGFydE5vZGU6IENoaWxkTm9kZSxcbiAgICBlbmROb2RlOiBDaGlsZE5vZGUgfCBudWxsLFxuICAgIHBhcmVudDogVGVtcGxhdGVJbnN0YW5jZSB8IENoaWxkUGFydCB8IHVuZGVmaW5lZCxcbiAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkXG4gICkge1xuICAgIHRoaXMuXyRzdGFydE5vZGUgPSBzdGFydE5vZGU7XG4gICAgdGhpcy5fJGVuZE5vZGUgPSBlbmROb2RlO1xuICAgIHRoaXMuXyRwYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICAvLyBOb3RlIF9faXNDb25uZWN0ZWQgaXMgb25seSBldmVyIGFjY2Vzc2VkIG9uIFJvb3RQYXJ0cyAoaS5lLiB3aGVuIHRoZXJlIGlzXG4gICAgLy8gbm8gXyRwYXJlbnQpOyB0aGUgdmFsdWUgb24gYSBub24tcm9vdC1wYXJ0IGlzIFwiZG9uJ3QgY2FyZVwiLCBidXQgY2hlY2tpbmdcbiAgICAvLyBmb3IgcGFyZW50IHdvdWxkIGJlIG1vcmUgY29kZVxuICAgIHRoaXMuX19pc0Nvbm5lY3RlZCA9IG9wdGlvbnM/LmlzQ29ubmVjdGVkID8/IHRydWU7XG4gICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgLy8gRXhwbGljaXRseSBpbml0aWFsaXplIGZvciBjb25zaXN0ZW50IGNsYXNzIHNoYXBlLlxuICAgICAgdGhpcy5fdGV4dFNhbml0aXplciA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVGhlIHBhcmVudCBub2RlIGludG8gd2hpY2ggdGhlIHBhcnQgcmVuZGVycyBpdHMgY29udGVudC5cbiAgICpcbiAgICogQSBDaGlsZFBhcnQncyBjb250ZW50IGNvbnNpc3RzIG9mIGEgcmFuZ2Ugb2YgYWRqYWNlbnQgY2hpbGQgbm9kZXMgb2ZcbiAgICogYC5wYXJlbnROb2RlYCwgcG9zc2libHkgYm9yZGVyZWQgYnkgJ21hcmtlciBub2RlcycgKGAuc3RhcnROb2RlYCBhbmRcbiAgICogYC5lbmROb2RlYCkuXG4gICAqXG4gICAqIC0gSWYgYm90aCBgLnN0YXJ0Tm9kZWAgYW5kIGAuZW5kTm9kZWAgYXJlIG5vbi1udWxsLCB0aGVuIHRoZSBwYXJ0J3MgY29udGVudFxuICAgKiBjb25zaXN0cyBvZiBhbGwgc2libGluZ3MgYmV0d2VlbiBgLnN0YXJ0Tm9kZWAgYW5kIGAuZW5kTm9kZWAsIGV4Y2x1c2l2ZWx5LlxuICAgKlxuICAgKiAtIElmIGAuc3RhcnROb2RlYCBpcyBub24tbnVsbCBidXQgYC5lbmROb2RlYCBpcyBudWxsLCB0aGVuIHRoZSBwYXJ0J3NcbiAgICogY29udGVudCBjb25zaXN0cyBvZiBhbGwgc2libGluZ3MgZm9sbG93aW5nIGAuc3RhcnROb2RlYCwgdXAgdG8gYW5kXG4gICAqIGluY2x1ZGluZyB0aGUgbGFzdCBjaGlsZCBvZiBgLnBhcmVudE5vZGVgLiBJZiBgLmVuZE5vZGVgIGlzIG5vbi1udWxsLCB0aGVuXG4gICAqIGAuc3RhcnROb2RlYCB3aWxsIGFsd2F5cyBiZSBub24tbnVsbC5cbiAgICpcbiAgICogLSBJZiBib3RoIGAuZW5kTm9kZWAgYW5kIGAuc3RhcnROb2RlYCBhcmUgbnVsbCwgdGhlbiB0aGUgcGFydCdzIGNvbnRlbnRcbiAgICogY29uc2lzdHMgb2YgYWxsIGNoaWxkIG5vZGVzIG9mIGAucGFyZW50Tm9kZWAuXG4gICAqL1xuICBnZXQgcGFyZW50Tm9kZSgpOiBOb2RlIHtcbiAgICBsZXQgcGFyZW50Tm9kZTogTm9kZSA9IHdyYXAodGhpcy5fJHN0YXJ0Tm9kZSkucGFyZW50Tm9kZSE7XG4gICAgY29uc3QgcGFyZW50ID0gdGhpcy5fJHBhcmVudDtcbiAgICBpZiAoXG4gICAgICBwYXJlbnQgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgcGFyZW50Tm9kZT8ubm9kZVR5cGUgPT09IDExIC8qIE5vZGUuRE9DVU1FTlRfRlJBR01FTlQgKi9cbiAgICApIHtcbiAgICAgIC8vIElmIHRoZSBwYXJlbnROb2RlIGlzIGEgRG9jdW1lbnRGcmFnbWVudCwgaXQgbWF5IGJlIGJlY2F1c2UgdGhlIERPTSBpc1xuICAgICAgLy8gc3RpbGwgaW4gdGhlIGNsb25lZCBmcmFnbWVudCBkdXJpbmcgaW5pdGlhbCByZW5kZXI7IGlmIHNvLCBnZXQgdGhlIHJlYWxcbiAgICAgIC8vIHBhcmVudE5vZGUgdGhlIHBhcnQgd2lsbCBiZSBjb21taXR0ZWQgaW50byBieSBhc2tpbmcgdGhlIHBhcmVudC5cbiAgICAgIHBhcmVudE5vZGUgPSAocGFyZW50IGFzIENoaWxkUGFydCB8IFRlbXBsYXRlSW5zdGFuY2UpLnBhcmVudE5vZGU7XG4gICAgfVxuICAgIHJldHVybiBwYXJlbnROb2RlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBwYXJ0J3MgbGVhZGluZyBtYXJrZXIgbm9kZSwgaWYgYW55LiBTZWUgYC5wYXJlbnROb2RlYCBmb3IgbW9yZVxuICAgKiBpbmZvcm1hdGlvbi5cbiAgICovXG4gIGdldCBzdGFydE5vZGUoKTogTm9kZSB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLl8kc3RhcnROb2RlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBwYXJ0J3MgdHJhaWxpbmcgbWFya2VyIG5vZGUsIGlmIGFueS4gU2VlIGAucGFyZW50Tm9kZWAgZm9yIG1vcmVcbiAgICogaW5mb3JtYXRpb24uXG4gICAqL1xuICBnZXQgZW5kTm9kZSgpOiBOb2RlIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuXyRlbmROb2RlO1xuICB9XG5cbiAgXyRzZXRWYWx1ZSh2YWx1ZTogdW5rbm93biwgZGlyZWN0aXZlUGFyZW50OiBEaXJlY3RpdmVQYXJlbnQgPSB0aGlzKTogdm9pZCB7XG4gICAgaWYgKERFVl9NT0RFICYmIHRoaXMucGFyZW50Tm9kZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgVGhpcyBcXGBDaGlsZFBhcnRcXGAgaGFzIG5vIFxcYHBhcmVudE5vZGVcXGAgYW5kIHRoZXJlZm9yZSBjYW5ub3QgYWNjZXB0IGEgdmFsdWUuIFRoaXMgbGlrZWx5IG1lYW5zIHRoZSBlbGVtZW50IGNvbnRhaW5pbmcgdGhlIHBhcnQgd2FzIG1hbmlwdWxhdGVkIGluIGFuIHVuc3VwcG9ydGVkIHdheSBvdXRzaWRlIG9mIExpdCdzIGNvbnRyb2wgc3VjaCB0aGF0IHRoZSBwYXJ0J3MgbWFya2VyIG5vZGVzIHdlcmUgZWplY3RlZCBmcm9tIERPTS4gRm9yIGV4YW1wbGUsIHNldHRpbmcgdGhlIGVsZW1lbnQncyBcXGBpbm5lckhUTUxcXGAgb3IgXFxgdGV4dENvbnRlbnRcXGAgY2FuIGRvIHRoaXMuYFxuICAgICAgKTtcbiAgICB9XG4gICAgdmFsdWUgPSByZXNvbHZlRGlyZWN0aXZlKHRoaXMsIHZhbHVlLCBkaXJlY3RpdmVQYXJlbnQpO1xuICAgIGlmIChpc1ByaW1pdGl2ZSh2YWx1ZSkpIHtcbiAgICAgIC8vIE5vbi1yZW5kZXJpbmcgY2hpbGQgdmFsdWVzLiBJdCdzIGltcG9ydGFudCB0aGF0IHRoZXNlIGRvIG5vdCByZW5kZXJcbiAgICAgIC8vIGVtcHR5IHRleHQgbm9kZXMgdG8gYXZvaWQgaXNzdWVzIHdpdGggcHJldmVudGluZyBkZWZhdWx0IDxzbG90PlxuICAgICAgLy8gZmFsbGJhY2sgY29udGVudC5cbiAgICAgIGlmICh2YWx1ZSA9PT0gbm90aGluZyB8fCB2YWx1ZSA9PSBudWxsIHx8IHZhbHVlID09PSAnJykge1xuICAgICAgICBpZiAodGhpcy5fJGNvbW1pdHRlZFZhbHVlICE9PSBub3RoaW5nKSB7XG4gICAgICAgICAgZGVidWdMb2dFdmVudCAmJlxuICAgICAgICAgICAgZGVidWdMb2dFdmVudCh7XG4gICAgICAgICAgICAgIGtpbmQ6ICdjb21taXQgbm90aGluZyB0byBjaGlsZCcsXG4gICAgICAgICAgICAgIHN0YXJ0OiB0aGlzLl8kc3RhcnROb2RlLFxuICAgICAgICAgICAgICBlbmQ6IHRoaXMuXyRlbmROb2RlLFxuICAgICAgICAgICAgICBwYXJlbnQ6IHRoaXMuXyRwYXJlbnQsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIHRoaXMuXyRjbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IG5vdGhpbmc7XG4gICAgICB9IGVsc2UgaWYgKHZhbHVlICE9PSB0aGlzLl8kY29tbWl0dGVkVmFsdWUgJiYgdmFsdWUgIT09IG5vQ2hhbmdlKSB7XG4gICAgICAgIHRoaXMuX2NvbW1pdFRleHQodmFsdWUpO1xuICAgICAgfVxuICAgICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICB9IGVsc2UgaWYgKCh2YWx1ZSBhcyBUZW1wbGF0ZVJlc3VsdClbJ18kbGl0VHlwZSQnXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9jb21taXRUZW1wbGF0ZVJlc3VsdCh2YWx1ZSBhcyBUZW1wbGF0ZVJlc3VsdCk7XG4gICAgfSBlbHNlIGlmICgodmFsdWUgYXMgTm9kZSkubm9kZVR5cGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKERFVl9NT0RFICYmIHRoaXMub3B0aW9ucz8uaG9zdCA9PT0gdmFsdWUpIHtcbiAgICAgICAgdGhpcy5fY29tbWl0VGV4dChcbiAgICAgICAgICBgW3Byb2JhYmxlIG1pc3Rha2U6IHJlbmRlcmVkIGEgdGVtcGxhdGUncyBob3N0IGluIGl0c2VsZiBgICtcbiAgICAgICAgICAgIGAoY29tbW9ubHkgY2F1c2VkIGJ5IHdyaXRpbmcgXFwke3RoaXN9IGluIGEgdGVtcGxhdGVdYFxuICAgICAgICApO1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgYEF0dGVtcHRlZCB0byByZW5kZXIgdGhlIHRlbXBsYXRlIGhvc3RgLFxuICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgIGBpbnNpZGUgaXRzZWxmLiBUaGlzIGlzIGFsbW9zdCBhbHdheXMgYSBtaXN0YWtlLCBhbmQgaW4gZGV2IG1vZGUgYCxcbiAgICAgICAgICBgd2UgcmVuZGVyIHNvbWUgd2FybmluZyB0ZXh0LiBJbiBwcm9kdWN0aW9uIGhvd2V2ZXIsIHdlJ2xsIGAsXG4gICAgICAgICAgYHJlbmRlciBpdCwgd2hpY2ggd2lsbCB1c3VhbGx5IHJlc3VsdCBpbiBhbiBlcnJvciwgYW5kIHNvbWV0aW1lcyBgLFxuICAgICAgICAgIGBpbiB0aGUgZWxlbWVudCBkaXNhcHBlYXJpbmcgZnJvbSB0aGUgRE9NLmBcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5fY29tbWl0Tm9kZSh2YWx1ZSBhcyBOb2RlKTtcbiAgICB9IGVsc2UgaWYgKGlzSXRlcmFibGUodmFsdWUpKSB7XG4gICAgICB0aGlzLl9jb21taXRJdGVyYWJsZSh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEZhbGxiYWNrLCB3aWxsIHJlbmRlciB0aGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAgICB0aGlzLl9jb21taXRUZXh0KHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9pbnNlcnQ8VCBleHRlbmRzIE5vZGU+KG5vZGU6IFQpIHtcbiAgICByZXR1cm4gd3JhcCh3cmFwKHRoaXMuXyRzdGFydE5vZGUpLnBhcmVudE5vZGUhKS5pbnNlcnRCZWZvcmUoXG4gICAgICBub2RlLFxuICAgICAgdGhpcy5fJGVuZE5vZGVcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBfY29tbWl0Tm9kZSh2YWx1ZTogTm9kZSk6IHZvaWQge1xuICAgIGlmICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICB0aGlzLl8kY2xlYXIoKTtcbiAgICAgIGlmIChcbiAgICAgICAgRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTICYmXG4gICAgICAgIHNhbml0aXplckZhY3RvcnlJbnRlcm5hbCAhPT0gbm9vcFNhbml0aXplclxuICAgICAgKSB7XG4gICAgICAgIGNvbnN0IHBhcmVudE5vZGVOYW1lID0gdGhpcy5fJHN0YXJ0Tm9kZS5wYXJlbnROb2RlPy5ub2RlTmFtZTtcbiAgICAgICAgaWYgKHBhcmVudE5vZGVOYW1lID09PSAnU1RZTEUnIHx8IHBhcmVudE5vZGVOYW1lID09PSAnU0NSSVBUJykge1xuICAgICAgICAgIGxldCBtZXNzYWdlID0gJ0ZvcmJpZGRlbic7XG4gICAgICAgICAgaWYgKERFVl9NT0RFKSB7XG4gICAgICAgICAgICBpZiAocGFyZW50Tm9kZU5hbWUgPT09ICdTVFlMRScpIHtcbiAgICAgICAgICAgICAgbWVzc2FnZSA9XG4gICAgICAgICAgICAgICAgYExpdCBkb2VzIG5vdCBzdXBwb3J0IGJpbmRpbmcgaW5zaWRlIHN0eWxlIG5vZGVzLiBgICtcbiAgICAgICAgICAgICAgICBgVGhpcyBpcyBhIHNlY3VyaXR5IHJpc2ssIGFzIHN0eWxlIGluamVjdGlvbiBhdHRhY2tzIGNhbiBgICtcbiAgICAgICAgICAgICAgICBgZXhmaWx0cmF0ZSBkYXRhIGFuZCBzcG9vZiBVSXMuIGAgK1xuICAgICAgICAgICAgICAgIGBDb25zaWRlciBpbnN0ZWFkIHVzaW5nIGNzc1xcYC4uLlxcYCBsaXRlcmFscyBgICtcbiAgICAgICAgICAgICAgICBgdG8gY29tcG9zZSBzdHlsZXMsIGFuZCBkbyBkeW5hbWljIHN0eWxpbmcgd2l0aCBgICtcbiAgICAgICAgICAgICAgICBgY3NzIGN1c3RvbSBwcm9wZXJ0aWVzLCA6OnBhcnRzLCA8c2xvdD5zLCBgICtcbiAgICAgICAgICAgICAgICBgYW5kIGJ5IG11dGF0aW5nIHRoZSBET00gcmF0aGVyIHRoYW4gc3R5bGVzaGVldHMuYDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG1lc3NhZ2UgPVxuICAgICAgICAgICAgICAgIGBMaXQgZG9lcyBub3Qgc3VwcG9ydCBiaW5kaW5nIGluc2lkZSBzY3JpcHQgbm9kZXMuIGAgK1xuICAgICAgICAgICAgICAgIGBUaGlzIGlzIGEgc2VjdXJpdHkgcmlzaywgYXMgaXQgY291bGQgYWxsb3cgYXJiaXRyYXJ5IGAgK1xuICAgICAgICAgICAgICAgIGBjb2RlIGV4ZWN1dGlvbi5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgICAgZGVidWdMb2dFdmVudCh7XG4gICAgICAgICAga2luZDogJ2NvbW1pdCBub2RlJyxcbiAgICAgICAgICBzdGFydDogdGhpcy5fJHN0YXJ0Tm9kZSxcbiAgICAgICAgICBwYXJlbnQ6IHRoaXMuXyRwYXJlbnQsXG4gICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgfSk7XG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSB0aGlzLl9pbnNlcnQodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2NvbW1pdFRleHQodmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICAvLyBJZiB0aGUgY29tbWl0dGVkIHZhbHVlIGlzIGEgcHJpbWl0aXZlIGl0IG1lYW5zIHdlIGNhbGxlZCBfY29tbWl0VGV4dCBvblxuICAgIC8vIHRoZSBwcmV2aW91cyByZW5kZXIsIGFuZCB3ZSBrbm93IHRoYXQgdGhpcy5fJHN0YXJ0Tm9kZS5uZXh0U2libGluZyBpcyBhXG4gICAgLy8gVGV4dCBub2RlLiBXZSBjYW4gbm93IGp1c3QgcmVwbGFjZSB0aGUgdGV4dCBjb250ZW50ICguZGF0YSkgb2YgdGhlIG5vZGUuXG4gICAgaWYgKFxuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlICE9PSBub3RoaW5nICYmXG4gICAgICBpc1ByaW1pdGl2ZSh0aGlzLl8kY29tbWl0dGVkVmFsdWUpXG4gICAgKSB7XG4gICAgICBjb25zdCBub2RlID0gd3JhcCh0aGlzLl8kc3RhcnROb2RlKS5uZXh0U2libGluZyBhcyBUZXh0O1xuICAgICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgICBpZiAodGhpcy5fdGV4dFNhbml0aXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhpcy5fdGV4dFNhbml0aXplciA9IGNyZWF0ZVNhbml0aXplcihub2RlLCAnZGF0YScsICdwcm9wZXJ0eScpO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlID0gdGhpcy5fdGV4dFNhbml0aXplcih2YWx1ZSk7XG4gICAgICB9XG4gICAgICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAgICAgIGtpbmQ6ICdjb21taXQgdGV4dCcsXG4gICAgICAgICAgbm9kZSxcbiAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgIH0pO1xuICAgICAgKG5vZGUgYXMgVGV4dCkuZGF0YSA9IHZhbHVlIGFzIHN0cmluZztcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgICBjb25zdCB0ZXh0Tm9kZSA9IGQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgICB0aGlzLl9jb21taXROb2RlKHRleHROb2RlKTtcbiAgICAgICAgLy8gV2hlbiBzZXR0aW5nIHRleHQgY29udGVudCwgZm9yIHNlY3VyaXR5IHB1cnBvc2VzIGl0IG1hdHRlcnMgYSBsb3RcbiAgICAgICAgLy8gd2hhdCB0aGUgcGFyZW50IGlzLiBGb3IgZXhhbXBsZSwgPHN0eWxlPiBhbmQgPHNjcmlwdD4gbmVlZCB0byBiZVxuICAgICAgICAvLyBoYW5kbGVkIHdpdGggY2FyZSwgd2hpbGUgPHNwYW4+IGRvZXMgbm90LiBTbyBmaXJzdCB3ZSBuZWVkIHRvIHB1dCBhXG4gICAgICAgIC8vIHRleHQgbm9kZSBpbnRvIHRoZSBkb2N1bWVudCwgdGhlbiB3ZSBjYW4gc2FuaXRpemUgaXRzIGNvbnRlbnQuXG4gICAgICAgIGlmICh0aGlzLl90ZXh0U2FuaXRpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aGlzLl90ZXh0U2FuaXRpemVyID0gY3JlYXRlU2FuaXRpemVyKHRleHROb2RlLCAnZGF0YScsICdwcm9wZXJ0eScpO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlID0gdGhpcy5fdGV4dFNhbml0aXplcih2YWx1ZSk7XG4gICAgICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAgICAgIGtpbmQ6ICdjb21taXQgdGV4dCcsXG4gICAgICAgICAgICBub2RlOiB0ZXh0Tm9kZSxcbiAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICAgIH0pO1xuICAgICAgICB0ZXh0Tm9kZS5kYXRhID0gdmFsdWUgYXMgc3RyaW5nO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fY29tbWl0Tm9kZShkLmNyZWF0ZVRleHROb2RlKHZhbHVlIGFzIHN0cmluZykpO1xuICAgICAgICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgICAgICAgZGVidWdMb2dFdmVudCh7XG4gICAgICAgICAgICBraW5kOiAnY29tbWl0IHRleHQnLFxuICAgICAgICAgICAgbm9kZTogd3JhcCh0aGlzLl8kc3RhcnROb2RlKS5uZXh0U2libGluZyBhcyBUZXh0LFxuICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IHZhbHVlO1xuICB9XG5cbiAgcHJpdmF0ZSBfY29tbWl0VGVtcGxhdGVSZXN1bHQoXG4gICAgcmVzdWx0OiBUZW1wbGF0ZVJlc3VsdCB8IENvbXBpbGVkVGVtcGxhdGVSZXN1bHRcbiAgKTogdm9pZCB7XG4gICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICBjb25zdCB7dmFsdWVzLCBbJ18kbGl0VHlwZSQnXTogdHlwZX0gPSByZXN1bHQ7XG4gICAgLy8gSWYgJGxpdFR5cGUkIGlzIGEgbnVtYmVyLCByZXN1bHQgaXMgYSBwbGFpbiBUZW1wbGF0ZVJlc3VsdCBhbmQgd2UgZ2V0XG4gICAgLy8gdGhlIHRlbXBsYXRlIGZyb20gdGhlIHRlbXBsYXRlIGNhY2hlLiBJZiBub3QsIHJlc3VsdCBpcyBhXG4gICAgLy8gQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdCBhbmQgXyRsaXRUeXBlJCBpcyBhIENvbXBpbGVkVGVtcGxhdGUgYW5kIHdlIG5lZWRcbiAgICAvLyB0byBjcmVhdGUgdGhlIDx0ZW1wbGF0ZT4gZWxlbWVudCB0aGUgZmlyc3QgdGltZSB3ZSBzZWUgaXQuXG4gICAgY29uc3QgdGVtcGxhdGU6IFRlbXBsYXRlIHwgQ29tcGlsZWRUZW1wbGF0ZSA9XG4gICAgICB0eXBlb2YgdHlwZSA9PT0gJ251bWJlcidcbiAgICAgICAgPyB0aGlzLl8kZ2V0VGVtcGxhdGUocmVzdWx0IGFzIFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdClcbiAgICAgICAgOiAodHlwZS5lbCA9PT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAodHlwZS5lbCA9IFRlbXBsYXRlLmNyZWF0ZUVsZW1lbnQoXG4gICAgICAgICAgICAgIHRydXN0RnJvbVRlbXBsYXRlU3RyaW5nKHR5cGUuaCwgdHlwZS5oWzBdKSxcbiAgICAgICAgICAgICAgdGhpcy5vcHRpb25zXG4gICAgICAgICAgICApKSxcbiAgICAgICAgICB0eXBlKTtcblxuICAgIGlmICgodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIFRlbXBsYXRlSW5zdGFuY2UpPy5fJHRlbXBsYXRlID09PSB0ZW1wbGF0ZSkge1xuICAgICAgZGVidWdMb2dFdmVudCAmJlxuICAgICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAgICBraW5kOiAndGVtcGxhdGUgdXBkYXRpbmcnLFxuICAgICAgICAgIHRlbXBsYXRlLFxuICAgICAgICAgIGluc3RhbmNlOiB0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgVGVtcGxhdGVJbnN0YW5jZSxcbiAgICAgICAgICBwYXJ0czogKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBUZW1wbGF0ZUluc3RhbmNlKS5fJHBhcnRzLFxuICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgICB2YWx1ZXMsXG4gICAgICAgIH0pO1xuICAgICAgKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBUZW1wbGF0ZUluc3RhbmNlKS5fdXBkYXRlKHZhbHVlcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGluc3RhbmNlID0gbmV3IFRlbXBsYXRlSW5zdGFuY2UodGVtcGxhdGUgYXMgVGVtcGxhdGUsIHRoaXMpO1xuICAgICAgY29uc3QgZnJhZ21lbnQgPSBpbnN0YW5jZS5fY2xvbmUodGhpcy5vcHRpb25zKTtcbiAgICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgICAgZGVidWdMb2dFdmVudCh7XG4gICAgICAgICAga2luZDogJ3RlbXBsYXRlIGluc3RhbnRpYXRlZCcsXG4gICAgICAgICAgdGVtcGxhdGUsXG4gICAgICAgICAgaW5zdGFuY2UsXG4gICAgICAgICAgcGFydHM6IGluc3RhbmNlLl8kcGFydHMsXG4gICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICAgIGZyYWdtZW50LFxuICAgICAgICAgIHZhbHVlcyxcbiAgICAgICAgfSk7XG4gICAgICBpbnN0YW5jZS5fdXBkYXRlKHZhbHVlcyk7XG4gICAgICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSBpbnN0YW50aWF0ZWQgYW5kIHVwZGF0ZWQnLFxuICAgICAgICAgIHRlbXBsYXRlLFxuICAgICAgICAgIGluc3RhbmNlLFxuICAgICAgICAgIHBhcnRzOiBpbnN0YW5jZS5fJHBhcnRzLFxuICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgICBmcmFnbWVudCxcbiAgICAgICAgICB2YWx1ZXMsXG4gICAgICAgIH0pO1xuICAgICAgdGhpcy5fY29tbWl0Tm9kZShmcmFnbWVudCk7XG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSBpbnN0YW5jZTtcbiAgICB9XG4gIH1cblxuICAvLyBPdmVycmlkZGVuIHZpYSBgbGl0SHRtbFBvbHlmaWxsU3VwcG9ydGAgdG8gcHJvdmlkZSBwbGF0Zm9ybSBzdXBwb3J0LlxuICAvKiogQGludGVybmFsICovXG4gIF8kZ2V0VGVtcGxhdGUocmVzdWx0OiBVbmNvbXBpbGVkVGVtcGxhdGVSZXN1bHQpIHtcbiAgICBsZXQgdGVtcGxhdGUgPSB0ZW1wbGF0ZUNhY2hlLmdldChyZXN1bHQuc3RyaW5ncyk7XG4gICAgaWYgKHRlbXBsYXRlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRlbXBsYXRlQ2FjaGUuc2V0KHJlc3VsdC5zdHJpbmdzLCAodGVtcGxhdGUgPSBuZXcgVGVtcGxhdGUocmVzdWx0KSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGVtcGxhdGU7XG4gIH1cblxuICBwcml2YXRlIF9jb21taXRJdGVyYWJsZSh2YWx1ZTogSXRlcmFibGU8dW5rbm93bj4pOiB2b2lkIHtcbiAgICAvLyBGb3IgYW4gSXRlcmFibGUsIHdlIGNyZWF0ZSBhIG5ldyBJbnN0YW5jZVBhcnQgcGVyIGl0ZW0sIHRoZW4gc2V0IGl0c1xuICAgIC8vIHZhbHVlIHRvIHRoZSBpdGVtLiBUaGlzIGlzIGEgbGl0dGxlIGJpdCBvZiBvdmVyaGVhZCBmb3IgZXZlcnkgaXRlbSBpblxuICAgIC8vIGFuIEl0ZXJhYmxlLCBidXQgaXQgbGV0cyB1cyByZWN1cnNlIGVhc2lseSBhbmQgZWZmaWNpZW50bHkgdXBkYXRlIEFycmF5c1xuICAgIC8vIG9mIFRlbXBsYXRlUmVzdWx0cyB0aGF0IHdpbGwgYmUgY29tbW9ubHkgcmV0dXJuZWQgZnJvbSBleHByZXNzaW9ucyBsaWtlOlxuICAgIC8vIGFycmF5Lm1hcCgoaSkgPT4gaHRtbGAke2l9YCksIGJ5IHJldXNpbmcgZXhpc3RpbmcgVGVtcGxhdGVJbnN0YW5jZXMuXG5cbiAgICAvLyBJZiB2YWx1ZSBpcyBhbiBhcnJheSwgdGhlbiB0aGUgcHJldmlvdXMgcmVuZGVyIHdhcyBvZiBhblxuICAgIC8vIGl0ZXJhYmxlIGFuZCB2YWx1ZSB3aWxsIGNvbnRhaW4gdGhlIENoaWxkUGFydHMgZnJvbSB0aGUgcHJldmlvdXNcbiAgICAvLyByZW5kZXIuIElmIHZhbHVlIGlzIG5vdCBhbiBhcnJheSwgY2xlYXIgdGhpcyBwYXJ0IGFuZCBtYWtlIGEgbmV3XG4gICAgLy8gYXJyYXkgZm9yIENoaWxkUGFydHMuXG4gICAgaWYgKCFpc0FycmF5KHRoaXMuXyRjb21taXR0ZWRWYWx1ZSkpIHtcbiAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IFtdO1xuICAgICAgdGhpcy5fJGNsZWFyKCk7XG4gICAgfVxuXG4gICAgLy8gTGV0cyB1cyBrZWVwIHRyYWNrIG9mIGhvdyBtYW55IGl0ZW1zIHdlIHN0YW1wZWQgc28gd2UgY2FuIGNsZWFyIGxlZnRvdmVyXG4gICAgLy8gaXRlbXMgZnJvbSBhIHByZXZpb3VzIHJlbmRlclxuICAgIGNvbnN0IGl0ZW1QYXJ0cyA9IHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBDaGlsZFBhcnRbXTtcbiAgICBsZXQgcGFydEluZGV4ID0gMDtcbiAgICBsZXQgaXRlbVBhcnQ6IENoaWxkUGFydCB8IHVuZGVmaW5lZDtcblxuICAgIGZvciAoY29uc3QgaXRlbSBvZiB2YWx1ZSkge1xuICAgICAgaWYgKHBhcnRJbmRleCA9PT0gaXRlbVBhcnRzLmxlbmd0aCkge1xuICAgICAgICAvLyBJZiBubyBleGlzdGluZyBwYXJ0LCBjcmVhdGUgYSBuZXcgb25lXG4gICAgICAgIC8vIFRPRE8gKGp1c3RpbmZhZ25hbmkpOiB0ZXN0IHBlcmYgaW1wYWN0IG9mIGFsd2F5cyBjcmVhdGluZyB0d28gcGFydHNcbiAgICAgICAgLy8gaW5zdGVhZCBvZiBzaGFyaW5nIHBhcnRzIGJldHdlZW4gbm9kZXNcbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2xpdC9saXQvaXNzdWVzLzEyNjZcbiAgICAgICAgaXRlbVBhcnRzLnB1c2goXG4gICAgICAgICAgKGl0ZW1QYXJ0ID0gbmV3IENoaWxkUGFydChcbiAgICAgICAgICAgIHRoaXMuX2luc2VydChjcmVhdGVNYXJrZXIoKSksXG4gICAgICAgICAgICB0aGlzLl9pbnNlcnQoY3JlYXRlTWFya2VyKCkpLFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgIHRoaXMub3B0aW9uc1xuICAgICAgICAgICkpXG4gICAgICAgICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBSZXVzZSBhbiBleGlzdGluZyBwYXJ0XG4gICAgICAgIGl0ZW1QYXJ0ID0gaXRlbVBhcnRzW3BhcnRJbmRleF07XG4gICAgICB9XG4gICAgICBpdGVtUGFydC5fJHNldFZhbHVlKGl0ZW0pO1xuICAgICAgcGFydEluZGV4Kys7XG4gICAgfVxuXG4gICAgaWYgKHBhcnRJbmRleCA8IGl0ZW1QYXJ0cy5sZW5ndGgpIHtcbiAgICAgIC8vIGl0ZW1QYXJ0cyBhbHdheXMgaGF2ZSBlbmQgbm9kZXNcbiAgICAgIHRoaXMuXyRjbGVhcihcbiAgICAgICAgaXRlbVBhcnQgJiYgd3JhcChpdGVtUGFydC5fJGVuZE5vZGUhKS5uZXh0U2libGluZyxcbiAgICAgICAgcGFydEluZGV4XG4gICAgICApO1xuICAgICAgLy8gVHJ1bmNhdGUgdGhlIHBhcnRzIGFycmF5IHNvIF92YWx1ZSByZWZsZWN0cyB0aGUgY3VycmVudCBzdGF0ZVxuICAgICAgaXRlbVBhcnRzLmxlbmd0aCA9IHBhcnRJbmRleDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyB0aGUgbm9kZXMgY29udGFpbmVkIHdpdGhpbiB0aGlzIFBhcnQgZnJvbSB0aGUgRE9NLlxuICAgKlxuICAgKiBAcGFyYW0gc3RhcnQgU3RhcnQgbm9kZSB0byBjbGVhciBmcm9tLCBmb3IgY2xlYXJpbmcgYSBzdWJzZXQgb2YgdGhlIHBhcnQnc1xuICAgKiAgICAgRE9NICh1c2VkIHdoZW4gdHJ1bmNhdGluZyBpdGVyYWJsZXMpXG4gICAqIEBwYXJhbSBmcm9tICBXaGVuIGBzdGFydGAgaXMgc3BlY2lmaWVkLCB0aGUgaW5kZXggd2l0aGluIHRoZSBpdGVyYWJsZSBmcm9tXG4gICAqICAgICB3aGljaCBDaGlsZFBhcnRzIGFyZSBiZWluZyByZW1vdmVkLCB1c2VkIGZvciBkaXNjb25uZWN0aW5nIGRpcmVjdGl2ZXNcbiAgICogICAgIGluIHRob3NlIFBhcnRzLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIF8kY2xlYXIoXG4gICAgc3RhcnQ6IENoaWxkTm9kZSB8IG51bGwgPSB3cmFwKHRoaXMuXyRzdGFydE5vZGUpLm5leHRTaWJsaW5nLFxuICAgIGZyb20/OiBudW1iZXJcbiAgKSB7XG4gICAgdGhpcy5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkPy4oZmFsc2UsIHRydWUsIGZyb20pO1xuICAgIHdoaWxlIChzdGFydCAhPT0gdGhpcy5fJGVuZE5vZGUpIHtcbiAgICAgIC8vIFRoZSBub24tbnVsbCBhc3NlcnRpb24gaXMgc2FmZSBiZWNhdXNlIGlmIF8kc3RhcnROb2RlLm5leHRTaWJsaW5nIGlzXG4gICAgICAvLyBudWxsLCB0aGVuIF8kZW5kTm9kZSBpcyBhbHNvIG51bGwsIGFuZCB3ZSB3b3VsZCBub3QgaGF2ZSBlbnRlcmVkIHRoaXNcbiAgICAgIC8vIGxvb3AuXG4gICAgICBjb25zdCBuID0gd3JhcChzdGFydCEpLm5leHRTaWJsaW5nO1xuICAgICAgd3JhcChzdGFydCEpLnJlbW92ZSgpO1xuICAgICAgc3RhcnQgPSBuO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbXBsZW1lbnRhdGlvbiBvZiBSb290UGFydCdzIGBpc0Nvbm5lY3RlZGAuIE5vdGUgdGhhdCB0aGlzIG1ldGhvZFxuICAgKiBzaG91bGQgb25seSBiZSBjYWxsZWQgb24gYFJvb3RQYXJ0YHMgKHRoZSBgQ2hpbGRQYXJ0YCByZXR1cm5lZCBmcm9tIGFcbiAgICogdG9wLWxldmVsIGByZW5kZXIoKWAgY2FsbCkuIEl0IGhhcyBubyBlZmZlY3Qgb24gbm9uLXJvb3QgQ2hpbGRQYXJ0cy5cbiAgICogQHBhcmFtIGlzQ29ubmVjdGVkIFdoZXRoZXIgdG8gc2V0XG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgc2V0Q29ubmVjdGVkKGlzQ29ubmVjdGVkOiBib29sZWFuKSB7XG4gICAgaWYgKHRoaXMuXyRwYXJlbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fX2lzQ29ubmVjdGVkID0gaXNDb25uZWN0ZWQ7XG4gICAgICB0aGlzLl8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQ/Lihpc0Nvbm5lY3RlZCk7XG4gICAgfSBlbHNlIGlmIChERVZfTU9ERSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAncGFydC5zZXRDb25uZWN0ZWQoKSBtYXkgb25seSBiZSBjYWxsZWQgb24gYSAnICtcbiAgICAgICAgICAnUm9vdFBhcnQgcmV0dXJuZWQgZnJvbSByZW5kZXIoKS4nXG4gICAgICApO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEEgdG9wLWxldmVsIGBDaGlsZFBhcnRgIHJldHVybmVkIGZyb20gYHJlbmRlcmAgdGhhdCBtYW5hZ2VzIHRoZSBjb25uZWN0ZWRcbiAqIHN0YXRlIG9mIGBBc3luY0RpcmVjdGl2ZWBzIGNyZWF0ZWQgdGhyb3VnaG91dCB0aGUgdHJlZSBiZWxvdyBpdC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSb290UGFydCBleHRlbmRzIENoaWxkUGFydCB7XG4gIC8qKlxuICAgKiBTZXRzIHRoZSBjb25uZWN0aW9uIHN0YXRlIGZvciBgQXN5bmNEaXJlY3RpdmVgcyBjb250YWluZWQgd2l0aGluIHRoaXMgcm9vdFxuICAgKiBDaGlsZFBhcnQuXG4gICAqXG4gICAqIGxpdC1odG1sIGRvZXMgbm90IGF1dG9tYXRpY2FsbHkgbW9uaXRvciB0aGUgY29ubmVjdGVkbmVzcyBvZiBET00gcmVuZGVyZWQ7XG4gICAqIGFzIHN1Y2gsIGl0IGlzIHRoZSByZXNwb25zaWJpbGl0eSBvZiB0aGUgY2FsbGVyIHRvIGByZW5kZXJgIHRvIGVuc3VyZSB0aGF0XG4gICAqIGBwYXJ0LnNldENvbm5lY3RlZChmYWxzZSlgIGlzIGNhbGxlZCBiZWZvcmUgdGhlIHBhcnQgb2JqZWN0IGlzIHBvdGVudGlhbGx5XG4gICAqIGRpc2NhcmRlZCwgdG8gZW5zdXJlIHRoYXQgYEFzeW5jRGlyZWN0aXZlYHMgaGF2ZSBhIGNoYW5jZSB0byBkaXNwb3NlIG9mXG4gICAqIGFueSByZXNvdXJjZXMgYmVpbmcgaGVsZC4gSWYgYSBgUm9vdFBhcnRgIHRoYXQgd2FzIHByZXZpb3VzbHlcbiAgICogZGlzY29ubmVjdGVkIGlzIHN1YnNlcXVlbnRseSByZS1jb25uZWN0ZWQgKGFuZCBpdHMgYEFzeW5jRGlyZWN0aXZlYHMgc2hvdWxkXG4gICAqIHJlLWNvbm5lY3QpLCBgc2V0Q29ubmVjdGVkKHRydWUpYCBzaG91bGQgYmUgY2FsbGVkLlxuICAgKlxuICAgKiBAcGFyYW0gaXNDb25uZWN0ZWQgV2hldGhlciBkaXJlY3RpdmVzIHdpdGhpbiB0aGlzIHRyZWUgc2hvdWxkIGJlIGNvbm5lY3RlZFxuICAgKiBvciBub3RcbiAgICovXG4gIHNldENvbm5lY3RlZChpc0Nvbm5lY3RlZDogYm9vbGVhbik6IHZvaWQ7XG59XG5cbmV4cG9ydCB0eXBlIHtBdHRyaWJ1dGVQYXJ0fTtcbmNsYXNzIEF0dHJpYnV0ZVBhcnQgaW1wbGVtZW50cyBEaXNjb25uZWN0YWJsZSB7XG4gIHJlYWRvbmx5IHR5cGU6XG4gICAgfCB0eXBlb2YgQVRUUklCVVRFX1BBUlRcbiAgICB8IHR5cGVvZiBQUk9QRVJUWV9QQVJUXG4gICAgfCB0eXBlb2YgQk9PTEVBTl9BVFRSSUJVVEVfUEFSVFxuICAgIHwgdHlwZW9mIEVWRU5UX1BBUlQgPSBBVFRSSUJVVEVfUEFSVDtcbiAgcmVhZG9ubHkgZWxlbWVudDogSFRNTEVsZW1lbnQ7XG4gIHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogSWYgdGhpcyBhdHRyaWJ1dGUgcGFydCByZXByZXNlbnRzIGFuIGludGVycG9sYXRpb24sIHRoaXMgY29udGFpbnMgdGhlXG4gICAqIHN0YXRpYyBzdHJpbmdzIG9mIHRoZSBpbnRlcnBvbGF0aW9uLiBGb3Igc2luZ2xlLXZhbHVlLCBjb21wbGV0ZSBiaW5kaW5ncyxcbiAgICogdGhpcyBpcyB1bmRlZmluZWQuXG4gICAqL1xuICByZWFkb25seSBzdHJpbmdzPzogUmVhZG9ubHlBcnJheTxzdHJpbmc+O1xuICAvKiogQGludGVybmFsICovXG4gIF8kY29tbWl0dGVkVmFsdWU6IHVua25vd24gfCBBcnJheTx1bmtub3duPiA9IG5vdGhpbmc7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX19kaXJlY3RpdmVzPzogQXJyYXk8RGlyZWN0aXZlIHwgdW5kZWZpbmVkPjtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHBhcmVudDogRGlzY29ubmVjdGFibGU7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuPzogU2V0PERpc2Nvbm5lY3RhYmxlPiA9IHVuZGVmaW5lZDtcblxuICBwcm90ZWN0ZWQgX3Nhbml0aXplcjogVmFsdWVTYW5pdGl6ZXIgfCB1bmRlZmluZWQ7XG5cbiAgZ2V0IHRhZ05hbWUoKSB7XG4gICAgcmV0dXJuIHRoaXMuZWxlbWVudC50YWdOYW1lO1xuICB9XG5cbiAgLy8gU2VlIGNvbW1lbnQgaW4gRGlzY29ubmVjdGFibGUgaW50ZXJmYWNlIGZvciB3aHkgdGhpcyBpcyBhIGdldHRlclxuICBnZXQgXyRpc0Nvbm5lY3RlZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fJHBhcmVudC5fJGlzQ29ubmVjdGVkO1xuICB9XG5cbiAgY29uc3RydWN0b3IoXG4gICAgZWxlbWVudDogSFRNTEVsZW1lbnQsXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIHN0cmluZ3M6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPixcbiAgICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgdGhpcy5lbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMuXyRwYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICBpZiAoc3RyaW5ncy5sZW5ndGggPiAyIHx8IHN0cmluZ3NbMF0gIT09ICcnIHx8IHN0cmluZ3NbMV0gIT09ICcnKSB7XG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSBuZXcgQXJyYXkoc3RyaW5ncy5sZW5ndGggLSAxKS5maWxsKG5ldyBTdHJpbmcoKSk7XG4gICAgICB0aGlzLnN0cmluZ3MgPSBzdHJpbmdzO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSBub3RoaW5nO1xuICAgIH1cbiAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICB0aGlzLl9zYW5pdGl6ZXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHZhbHVlIG9mIHRoaXMgcGFydCBieSByZXNvbHZpbmcgdGhlIHZhbHVlIGZyb20gcG9zc2libHkgbXVsdGlwbGVcbiAgICogdmFsdWVzIGFuZCBzdGF0aWMgc3RyaW5ncyBhbmQgY29tbWl0dGluZyBpdCB0byB0aGUgRE9NLlxuICAgKiBJZiB0aGlzIHBhcnQgaXMgc2luZ2xlLXZhbHVlZCwgYHRoaXMuX3N0cmluZ3NgIHdpbGwgYmUgdW5kZWZpbmVkLCBhbmQgdGhlXG4gICAqIG1ldGhvZCB3aWxsIGJlIGNhbGxlZCB3aXRoIGEgc2luZ2xlIHZhbHVlIGFyZ3VtZW50LiBJZiB0aGlzIHBhcnQgaXNcbiAgICogbXVsdGktdmFsdWUsIGB0aGlzLl9zdHJpbmdzYCB3aWxsIGJlIGRlZmluZWQsIGFuZCB0aGUgbWV0aG9kIGlzIGNhbGxlZFxuICAgKiB3aXRoIHRoZSB2YWx1ZSBhcnJheSBvZiB0aGUgcGFydCdzIG93bmluZyBUZW1wbGF0ZUluc3RhbmNlLCBhbmQgYW4gb2Zmc2V0XG4gICAqIGludG8gdGhlIHZhbHVlIGFycmF5IGZyb20gd2hpY2ggdGhlIHZhbHVlcyBzaG91bGQgYmUgcmVhZC5cbiAgICogVGhpcyBtZXRob2QgaXMgb3ZlcmxvYWRlZCB0aGlzIHdheSB0byBlbGltaW5hdGUgc2hvcnQtbGl2ZWQgYXJyYXkgc2xpY2VzXG4gICAqIG9mIHRoZSB0ZW1wbGF0ZSBpbnN0YW5jZSB2YWx1ZXMsIGFuZCBhbGxvdyBhIGZhc3QtcGF0aCBmb3Igc2luZ2xlLXZhbHVlZFxuICAgKiBwYXJ0cy5cbiAgICpcbiAgICogQHBhcmFtIHZhbHVlIFRoZSBwYXJ0IHZhbHVlLCBvciBhbiBhcnJheSBvZiB2YWx1ZXMgZm9yIG11bHRpLXZhbHVlZCBwYXJ0c1xuICAgKiBAcGFyYW0gdmFsdWVJbmRleCB0aGUgaW5kZXggdG8gc3RhcnQgcmVhZGluZyB2YWx1ZXMgZnJvbS4gYHVuZGVmaW5lZGAgZm9yXG4gICAqICAgc2luZ2xlLXZhbHVlZCBwYXJ0c1xuICAgKiBAcGFyYW0gbm9Db21taXQgY2F1c2VzIHRoZSBwYXJ0IHRvIG5vdCBjb21taXQgaXRzIHZhbHVlIHRvIHRoZSBET00uIFVzZWRcbiAgICogICBpbiBoeWRyYXRpb24gdG8gcHJpbWUgYXR0cmlidXRlIHBhcnRzIHdpdGggdGhlaXIgZmlyc3QtcmVuZGVyZWQgdmFsdWUsXG4gICAqICAgYnV0IG5vdCBzZXQgdGhlIGF0dHJpYnV0ZSwgYW5kIGluIFNTUiB0byBuby1vcCB0aGUgRE9NIG9wZXJhdGlvbiBhbmRcbiAgICogICBjYXB0dXJlIHRoZSB2YWx1ZSBmb3Igc2VyaWFsaXphdGlvbi5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuICBfJHNldFZhbHVlKFxuICAgIHZhbHVlOiB1bmtub3duIHwgQXJyYXk8dW5rbm93bj4sXG4gICAgZGlyZWN0aXZlUGFyZW50OiBEaXJlY3RpdmVQYXJlbnQgPSB0aGlzLFxuICAgIHZhbHVlSW5kZXg/OiBudW1iZXIsXG4gICAgbm9Db21taXQ/OiBib29sZWFuXG4gICkge1xuICAgIGNvbnN0IHN0cmluZ3MgPSB0aGlzLnN0cmluZ3M7XG5cbiAgICAvLyBXaGV0aGVyIGFueSBvZiB0aGUgdmFsdWVzIGhhcyBjaGFuZ2VkLCBmb3IgZGlydHktY2hlY2tpbmdcbiAgICBsZXQgY2hhbmdlID0gZmFsc2U7XG5cbiAgICBpZiAoc3RyaW5ncyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBTaW5nbGUtdmFsdWUgYmluZGluZyBjYXNlXG4gICAgICB2YWx1ZSA9IHJlc29sdmVEaXJlY3RpdmUodGhpcywgdmFsdWUsIGRpcmVjdGl2ZVBhcmVudCwgMCk7XG4gICAgICBjaGFuZ2UgPVxuICAgICAgICAhaXNQcmltaXRpdmUodmFsdWUpIHx8XG4gICAgICAgICh2YWx1ZSAhPT0gdGhpcy5fJGNvbW1pdHRlZFZhbHVlICYmIHZhbHVlICE9PSBub0NoYW5nZSk7XG4gICAgICBpZiAoY2hhbmdlKSB7XG4gICAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJbnRlcnBvbGF0aW9uIGNhc2VcbiAgICAgIGNvbnN0IHZhbHVlcyA9IHZhbHVlIGFzIEFycmF5PHVua25vd24+O1xuICAgICAgdmFsdWUgPSBzdHJpbmdzWzBdO1xuXG4gICAgICBsZXQgaSwgdjtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBzdHJpbmdzLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICB2ID0gcmVzb2x2ZURpcmVjdGl2ZSh0aGlzLCB2YWx1ZXNbdmFsdWVJbmRleCEgKyBpXSwgZGlyZWN0aXZlUGFyZW50LCBpKTtcblxuICAgICAgICBpZiAodiA9PT0gbm9DaGFuZ2UpIHtcbiAgICAgICAgICAvLyBJZiB0aGUgdXNlci1wcm92aWRlZCB2YWx1ZSBpcyBgbm9DaGFuZ2VgLCB1c2UgdGhlIHByZXZpb3VzIHZhbHVlXG4gICAgICAgICAgdiA9ICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgQXJyYXk8dW5rbm93bj4pW2ldO1xuICAgICAgICB9XG4gICAgICAgIGNoYW5nZSB8fD1cbiAgICAgICAgICAhaXNQcmltaXRpdmUodikgfHwgdiAhPT0gKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBBcnJheTx1bmtub3duPilbaV07XG4gICAgICAgIGlmICh2ID09PSBub3RoaW5nKSB7XG4gICAgICAgICAgdmFsdWUgPSBub3RoaW5nO1xuICAgICAgICB9IGVsc2UgaWYgKHZhbHVlICE9PSBub3RoaW5nKSB7XG4gICAgICAgICAgdmFsdWUgKz0gKHYgPz8gJycpICsgc3RyaW5nc1tpICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgLy8gV2UgYWx3YXlzIHJlY29yZCBlYWNoIHZhbHVlLCBldmVuIGlmIG9uZSBpcyBgbm90aGluZ2AsIGZvciBmdXR1cmVcbiAgICAgICAgLy8gY2hhbmdlIGRldGVjdGlvbi5cbiAgICAgICAgKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBBcnJheTx1bmtub3duPilbaV0gPSB2O1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoY2hhbmdlICYmICFub0NvbW1pdCkge1xuICAgICAgdGhpcy5fY29tbWl0VmFsdWUodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX2NvbW1pdFZhbHVlKHZhbHVlOiB1bmtub3duKSB7XG4gICAgaWYgKHZhbHVlID09PSBub3RoaW5nKSB7XG4gICAgICAod3JhcCh0aGlzLmVsZW1lbnQpIGFzIEVsZW1lbnQpLnJlbW92ZUF0dHJpYnV0ZSh0aGlzLm5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICAgIGlmICh0aGlzLl9zYW5pdGl6ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRoaXMuX3Nhbml0aXplciA9IHNhbml0aXplckZhY3RvcnlJbnRlcm5hbChcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudCxcbiAgICAgICAgICAgIHRoaXMubmFtZSxcbiAgICAgICAgICAgICdhdHRyaWJ1dGUnXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZSA9IHRoaXMuX3Nhbml0aXplcih2YWx1ZSA/PyAnJyk7XG4gICAgICB9XG4gICAgICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAgICAgIGtpbmQ6ICdjb21taXQgYXR0cmlidXRlJyxcbiAgICAgICAgICBlbGVtZW50OiB0aGlzLmVsZW1lbnQsXG4gICAgICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgfSk7XG4gICAgICAod3JhcCh0aGlzLmVsZW1lbnQpIGFzIEVsZW1lbnQpLnNldEF0dHJpYnV0ZShcbiAgICAgICAgdGhpcy5uYW1lLFxuICAgICAgICAodmFsdWUgPz8gJycpIGFzIHN0cmluZ1xuICAgICAgKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUge1Byb3BlcnR5UGFydH07XG5jbGFzcyBQcm9wZXJ0eVBhcnQgZXh0ZW5kcyBBdHRyaWJ1dGVQYXJ0IHtcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgdHlwZSA9IFBST1BFUlRZX1BBUlQ7XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBvdmVycmlkZSBfY29tbWl0VmFsdWUodmFsdWU6IHVua25vd24pIHtcbiAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICBpZiAodGhpcy5fc2FuaXRpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fc2FuaXRpemVyID0gc2FuaXRpemVyRmFjdG9yeUludGVybmFsKFxuICAgICAgICAgIHRoaXMuZWxlbWVudCxcbiAgICAgICAgICB0aGlzLm5hbWUsXG4gICAgICAgICAgJ3Byb3BlcnR5J1xuICAgICAgICApO1xuICAgICAgfVxuICAgICAgdmFsdWUgPSB0aGlzLl9zYW5pdGl6ZXIodmFsdWUpO1xuICAgIH1cbiAgICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAga2luZDogJ2NvbW1pdCBwcm9wZXJ0eScsXG4gICAgICAgIGVsZW1lbnQ6IHRoaXMuZWxlbWVudCxcbiAgICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgICB2YWx1ZSxcbiAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgfSk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAodGhpcy5lbGVtZW50IGFzIGFueSlbdGhpcy5uYW1lXSA9IHZhbHVlID09PSBub3RoaW5nID8gdW5kZWZpbmVkIDogdmFsdWU7XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUge0Jvb2xlYW5BdHRyaWJ1dGVQYXJ0fTtcbmNsYXNzIEJvb2xlYW5BdHRyaWJ1dGVQYXJ0IGV4dGVuZHMgQXR0cmlidXRlUGFydCB7XG4gIG92ZXJyaWRlIHJlYWRvbmx5IHR5cGUgPSBCT09MRUFOX0FUVFJJQlVURV9QQVJUO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgb3ZlcnJpZGUgX2NvbW1pdFZhbHVlKHZhbHVlOiB1bmtub3duKSB7XG4gICAgZGVidWdMb2dFdmVudCAmJlxuICAgICAgZGVidWdMb2dFdmVudCh7XG4gICAgICAgIGtpbmQ6ICdjb21taXQgYm9vbGVhbiBhdHRyaWJ1dGUnLFxuICAgICAgICBlbGVtZW50OiB0aGlzLmVsZW1lbnQsXG4gICAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgICAgdmFsdWU6ICEhKHZhbHVlICYmIHZhbHVlICE9PSBub3RoaW5nKSxcbiAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgfSk7XG4gICAgKHdyYXAodGhpcy5lbGVtZW50KSBhcyBFbGVtZW50KS50b2dnbGVBdHRyaWJ1dGUoXG4gICAgICB0aGlzLm5hbWUsXG4gICAgICAhIXZhbHVlICYmIHZhbHVlICE9PSBub3RoaW5nXG4gICAgKTtcbiAgfVxufVxuXG50eXBlIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucyA9IEV2ZW50TGlzdGVuZXJPckV2ZW50TGlzdGVuZXJPYmplY3QgJlxuICBQYXJ0aWFsPEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zPjtcblxuLyoqXG4gKiBBbiBBdHRyaWJ1dGVQYXJ0IHRoYXQgbWFuYWdlcyBhbiBldmVudCBsaXN0ZW5lciB2aWEgYWRkL3JlbW92ZUV2ZW50TGlzdGVuZXIuXG4gKlxuICogVGhpcyBwYXJ0IHdvcmtzIGJ5IGFkZGluZyBpdHNlbGYgYXMgdGhlIGV2ZW50IGxpc3RlbmVyIG9uIGFuIGVsZW1lbnQsIHRoZW5cbiAqIGRlbGVnYXRpbmcgdG8gdGhlIHZhbHVlIHBhc3NlZCB0byBpdC4gVGhpcyByZWR1Y2VzIHRoZSBudW1iZXIgb2YgY2FsbHMgdG9cbiAqIGFkZC9yZW1vdmVFdmVudExpc3RlbmVyIGlmIHRoZSBsaXN0ZW5lciBjaGFuZ2VzIGZyZXF1ZW50bHksIHN1Y2ggYXMgd2hlbiBhblxuICogaW5saW5lIGZ1bmN0aW9uIGlzIHVzZWQgYXMgYSBsaXN0ZW5lci5cbiAqXG4gKiBCZWNhdXNlIGV2ZW50IG9wdGlvbnMgYXJlIHBhc3NlZCB3aGVuIGFkZGluZyBsaXN0ZW5lcnMsIHdlIG11c3QgdGFrZSBjYXNlXG4gKiB0byBhZGQgYW5kIHJlbW92ZSB0aGUgcGFydCBhcyBhIGxpc3RlbmVyIHdoZW4gdGhlIGV2ZW50IG9wdGlvbnMgY2hhbmdlLlxuICovXG5leHBvcnQgdHlwZSB7RXZlbnRQYXJ0fTtcbmNsYXNzIEV2ZW50UGFydCBleHRlbmRzIEF0dHJpYnV0ZVBhcnQge1xuICBvdmVycmlkZSByZWFkb25seSB0eXBlID0gRVZFTlRfUEFSVDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBlbGVtZW50OiBIVE1MRWxlbWVudCxcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgc3RyaW5nczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LFxuICAgIHBhcmVudDogRGlzY29ubmVjdGFibGUsXG4gICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZFxuICApIHtcbiAgICBzdXBlcihlbGVtZW50LCBuYW1lLCBzdHJpbmdzLCBwYXJlbnQsIG9wdGlvbnMpO1xuXG4gICAgaWYgKERFVl9NT0RFICYmIHRoaXMuc3RyaW5ncyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBBIFxcYDwke2VsZW1lbnQubG9jYWxOYW1lfT5cXGAgaGFzIGEgXFxgQCR7bmFtZX09Li4uXFxgIGxpc3RlbmVyIHdpdGggYCArXG4gICAgICAgICAgJ2ludmFsaWQgY29udGVudC4gRXZlbnQgbGlzdGVuZXJzIGluIHRlbXBsYXRlcyBtdXN0IGhhdmUgZXhhY3RseSAnICtcbiAgICAgICAgICAnb25lIGV4cHJlc3Npb24gYW5kIG5vIHN1cnJvdW5kaW5nIHRleHQuJ1xuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICAvLyBFdmVudFBhcnQgZG9lcyBub3QgdXNlIHRoZSBiYXNlIF8kc2V0VmFsdWUvX3Jlc29sdmVWYWx1ZSBpbXBsZW1lbnRhdGlvblxuICAvLyBzaW5jZSB0aGUgZGlydHkgY2hlY2tpbmcgaXMgbW9yZSBjb21wbGV4XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgb3ZlcnJpZGUgXyRzZXRWYWx1ZShcbiAgICBuZXdMaXN0ZW5lcjogdW5rbm93bixcbiAgICBkaXJlY3RpdmVQYXJlbnQ6IERpcmVjdGl2ZVBhcmVudCA9IHRoaXNcbiAgKSB7XG4gICAgbmV3TGlzdGVuZXIgPVxuICAgICAgcmVzb2x2ZURpcmVjdGl2ZSh0aGlzLCBuZXdMaXN0ZW5lciwgZGlyZWN0aXZlUGFyZW50LCAwKSA/PyBub3RoaW5nO1xuICAgIGlmIChuZXdMaXN0ZW5lciA9PT0gbm9DaGFuZ2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgb2xkTGlzdGVuZXIgPSB0aGlzLl8kY29tbWl0dGVkVmFsdWU7XG5cbiAgICAvLyBJZiB0aGUgbmV3IHZhbHVlIGlzIG5vdGhpbmcgb3IgYW55IG9wdGlvbnMgY2hhbmdlIHdlIGhhdmUgdG8gcmVtb3ZlIHRoZVxuICAgIC8vIHBhcnQgYXMgYSBsaXN0ZW5lci5cbiAgICBjb25zdCBzaG91bGRSZW1vdmVMaXN0ZW5lciA9XG4gICAgICAobmV3TGlzdGVuZXIgPT09IG5vdGhpbmcgJiYgb2xkTGlzdGVuZXIgIT09IG5vdGhpbmcpIHx8XG4gICAgICAobmV3TGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5jYXB0dXJlICE9PVxuICAgICAgICAob2xkTGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5jYXB0dXJlIHx8XG4gICAgICAobmV3TGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5vbmNlICE9PVxuICAgICAgICAob2xkTGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5vbmNlIHx8XG4gICAgICAobmV3TGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5wYXNzaXZlICE9PVxuICAgICAgICAob2xkTGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5wYXNzaXZlO1xuXG4gICAgLy8gSWYgdGhlIG5ldyB2YWx1ZSBpcyBub3Qgbm90aGluZyBhbmQgd2UgcmVtb3ZlZCB0aGUgbGlzdGVuZXIsIHdlIGhhdmVcbiAgICAvLyB0byBhZGQgdGhlIHBhcnQgYXMgYSBsaXN0ZW5lci5cbiAgICBjb25zdCBzaG91bGRBZGRMaXN0ZW5lciA9XG4gICAgICBuZXdMaXN0ZW5lciAhPT0gbm90aGluZyAmJlxuICAgICAgKG9sZExpc3RlbmVyID09PSBub3RoaW5nIHx8IHNob3VsZFJlbW92ZUxpc3RlbmVyKTtcblxuICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAgICBraW5kOiAnY29tbWl0IGV2ZW50IGxpc3RlbmVyJyxcbiAgICAgICAgZWxlbWVudDogdGhpcy5lbGVtZW50LFxuICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgIHZhbHVlOiBuZXdMaXN0ZW5lcixcbiAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICByZW1vdmVMaXN0ZW5lcjogc2hvdWxkUmVtb3ZlTGlzdGVuZXIsXG4gICAgICAgIGFkZExpc3RlbmVyOiBzaG91bGRBZGRMaXN0ZW5lcixcbiAgICAgICAgb2xkTGlzdGVuZXIsXG4gICAgICB9KTtcbiAgICBpZiAoc2hvdWxkUmVtb3ZlTGlzdGVuZXIpIHtcbiAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFxuICAgICAgICB0aGlzLm5hbWUsXG4gICAgICAgIHRoaXMsXG4gICAgICAgIG9sZExpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9uc1xuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKHNob3VsZEFkZExpc3RlbmVyKSB7XG4gICAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgICAgdGhpcy5uYW1lLFxuICAgICAgICB0aGlzLFxuICAgICAgICBuZXdMaXN0ZW5lciBhcyBFdmVudExpc3RlbmVyV2l0aE9wdGlvbnNcbiAgICAgICk7XG4gICAgfVxuICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IG5ld0xpc3RlbmVyO1xuICB9XG5cbiAgaGFuZGxlRXZlbnQoZXZlbnQ6IEV2ZW50KSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZS5jYWxsKHRoaXMub3B0aW9ucz8uaG9zdCA/PyB0aGlzLmVsZW1lbnQsIGV2ZW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBFdmVudExpc3RlbmVyT2JqZWN0KS5oYW5kbGVFdmVudChldmVudCk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCB0eXBlIHtFbGVtZW50UGFydH07XG5jbGFzcyBFbGVtZW50UGFydCBpbXBsZW1lbnRzIERpc2Nvbm5lY3RhYmxlIHtcbiAgcmVhZG9ubHkgdHlwZSA9IEVMRU1FTlRfUEFSVDtcblxuICAvKiogQGludGVybmFsICovXG4gIF9fZGlyZWN0aXZlPzogRGlyZWN0aXZlO1xuXG4gIC8vIFRoaXMgaXMgdG8gZW5zdXJlIHRoYXQgZXZlcnkgUGFydCBoYXMgYSBfJGNvbW1pdHRlZFZhbHVlXG4gIF8kY29tbWl0dGVkVmFsdWU6IHVuZGVmaW5lZDtcblxuICAvKiogQGludGVybmFsICovXG4gIF8kcGFyZW50ITogRGlzY29ubmVjdGFibGU7XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4/OiBTZXQ8RGlzY29ubmVjdGFibGU+ID0gdW5kZWZpbmVkO1xuXG4gIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIGVsZW1lbnQ6IEVsZW1lbnQsXG4gICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSxcbiAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkXG4gICkge1xuICAgIHRoaXMuXyRwYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgfVxuXG4gIC8vIFNlZSBjb21tZW50IGluIERpc2Nvbm5lY3RhYmxlIGludGVyZmFjZSBmb3Igd2h5IHRoaXMgaXMgYSBnZXR0ZXJcbiAgZ2V0IF8kaXNDb25uZWN0ZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuXyRwYXJlbnQuXyRpc0Nvbm5lY3RlZDtcbiAgfVxuXG4gIF8kc2V0VmFsdWUodmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAga2luZDogJ2NvbW1pdCB0byBlbGVtZW50IGJpbmRpbmcnLFxuICAgICAgICBlbGVtZW50OiB0aGlzLmVsZW1lbnQsXG4gICAgICAgIHZhbHVlLFxuICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICB9KTtcbiAgICByZXNvbHZlRGlyZWN0aXZlKHRoaXMsIHZhbHVlKTtcbiAgfVxufVxuXG4vKipcbiAqIEVORCBVU0VSUyBTSE9VTEQgTk9UIFJFTFkgT04gVEhJUyBPQkpFQ1QuXG4gKlxuICogUHJpdmF0ZSBleHBvcnRzIGZvciB1c2UgYnkgb3RoZXIgTGl0IHBhY2thZ2VzLCBub3QgaW50ZW5kZWQgZm9yIHVzZSBieVxuICogZXh0ZXJuYWwgdXNlcnMuXG4gKlxuICogV2UgY3VycmVudGx5IGRvIG5vdCBtYWtlIGEgbWFuZ2xlZCByb2xsdXAgYnVpbGQgb2YgdGhlIGxpdC1zc3IgY29kZS4gSW4gb3JkZXJcbiAqIHRvIGtlZXAgYSBudW1iZXIgb2YgKG90aGVyd2lzZSBwcml2YXRlKSB0b3AtbGV2ZWwgZXhwb3J0cyBtYW5nbGVkIGluIHRoZVxuICogY2xpZW50IHNpZGUgY29kZSwgd2UgZXhwb3J0IGEgXyRMSCBvYmplY3QgY29udGFpbmluZyB0aG9zZSBtZW1iZXJzIChvclxuICogaGVscGVyIG1ldGhvZHMgZm9yIGFjY2Vzc2luZyBwcml2YXRlIGZpZWxkcyBvZiB0aG9zZSBtZW1iZXJzKSwgYW5kIHRoZW5cbiAqIHJlLWV4cG9ydCB0aGVtIGZvciB1c2UgaW4gbGl0LXNzci4gVGhpcyBrZWVwcyBsaXQtc3NyIGFnbm9zdGljIHRvIHdoZXRoZXIgdGhlXG4gKiBjbGllbnQtc2lkZSBjb2RlIGlzIGJlaW5nIHVzZWQgaW4gYGRldmAgbW9kZSBvciBgcHJvZGAgbW9kZS5cbiAqXG4gKiBUaGlzIGhhcyBhIHVuaXF1ZSBuYW1lLCB0byBkaXNhbWJpZ3VhdGUgaXQgZnJvbSBwcml2YXRlIGV4cG9ydHMgaW5cbiAqIGxpdC1lbGVtZW50LCB3aGljaCByZS1leHBvcnRzIGFsbCBvZiBsaXQtaHRtbC5cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5leHBvcnQgY29uc3QgXyRMSCA9IHtcbiAgLy8gVXNlZCBpbiBsaXQtc3NyXG4gIF9ib3VuZEF0dHJpYnV0ZVN1ZmZpeDogYm91bmRBdHRyaWJ1dGVTdWZmaXgsXG4gIF9tYXJrZXI6IG1hcmtlcixcbiAgX21hcmtlck1hdGNoOiBtYXJrZXJNYXRjaCxcbiAgX0hUTUxfUkVTVUxUOiBIVE1MX1JFU1VMVCxcbiAgX2dldFRlbXBsYXRlSHRtbDogZ2V0VGVtcGxhdGVIdG1sLFxuICAvLyBVc2VkIGluIHRlc3RzIGFuZCBwcml2YXRlLXNzci1zdXBwb3J0XG4gIF9UZW1wbGF0ZUluc3RhbmNlOiBUZW1wbGF0ZUluc3RhbmNlLFxuICBfaXNJdGVyYWJsZTogaXNJdGVyYWJsZSxcbiAgX3Jlc29sdmVEaXJlY3RpdmU6IHJlc29sdmVEaXJlY3RpdmUsXG4gIF9DaGlsZFBhcnQ6IENoaWxkUGFydCxcbiAgX0F0dHJpYnV0ZVBhcnQ6IEF0dHJpYnV0ZVBhcnQsXG4gIF9Cb29sZWFuQXR0cmlidXRlUGFydDogQm9vbGVhbkF0dHJpYnV0ZVBhcnQsXG4gIF9FdmVudFBhcnQ6IEV2ZW50UGFydCxcbiAgX1Byb3BlcnR5UGFydDogUHJvcGVydHlQYXJ0LFxuICBfRWxlbWVudFBhcnQ6IEVsZW1lbnRQYXJ0LFxufTtcblxuLy8gQXBwbHkgcG9seWZpbGxzIGlmIGF2YWlsYWJsZVxuY29uc3QgcG9seWZpbGxTdXBwb3J0ID0gREVWX01PREVcbiAgPyBnbG9iYWwubGl0SHRtbFBvbHlmaWxsU3VwcG9ydERldk1vZGVcbiAgOiBnbG9iYWwubGl0SHRtbFBvbHlmaWxsU3VwcG9ydDtcbnBvbHlmaWxsU3VwcG9ydD8uKFRlbXBsYXRlLCBDaGlsZFBhcnQpO1xuXG4vLyBJTVBPUlRBTlQ6IGRvIG5vdCBjaGFuZ2UgdGhlIHByb3BlcnR5IG5hbWUgb3IgdGhlIGFzc2lnbm1lbnQgZXhwcmVzc2lvbi5cbi8vIFRoaXMgbGluZSB3aWxsIGJlIHVzZWQgaW4gcmVnZXhlcyB0byBzZWFyY2ggZm9yIGxpdC1odG1sIHVzYWdlLlxuKGdsb2JhbC5saXRIdG1sVmVyc2lvbnMgPz89IFtdKS5wdXNoKCczLjMuMScpO1xuaWYgKERFVl9NT0RFICYmIGdsb2JhbC5saXRIdG1sVmVyc2lvbnMubGVuZ3RoID4gMSkge1xuICBxdWV1ZU1pY3JvdGFzaygoKSA9PiB7XG4gICAgaXNzdWVXYXJuaW5nIShcbiAgICAgICdtdWx0aXBsZS12ZXJzaW9ucycsXG4gICAgICBgTXVsdGlwbGUgdmVyc2lvbnMgb2YgTGl0IGxvYWRlZC4gYCArXG4gICAgICAgIGBMb2FkaW5nIG11bHRpcGxlIHZlcnNpb25zIGlzIG5vdCByZWNvbW1lbmRlZC5gXG4gICAgKTtcbiAgfSk7XG59XG5cbi8qKlxuICogUmVuZGVycyBhIHZhbHVlLCB1c3VhbGx5IGEgbGl0LWh0bWwgVGVtcGxhdGVSZXN1bHQsIHRvIHRoZSBjb250YWluZXIuXG4gKlxuICogVGhpcyBleGFtcGxlIHJlbmRlcnMgdGhlIHRleHQgXCJIZWxsbywgWm9lIVwiIGluc2lkZSBhIHBhcmFncmFwaCB0YWcsIGFwcGVuZGluZ1xuICogaXQgdG8gdGhlIGNvbnRhaW5lciBgZG9jdW1lbnQuYm9keWAuXG4gKlxuICogYGBganNcbiAqIGltcG9ydCB7aHRtbCwgcmVuZGVyfSBmcm9tICdsaXQnO1xuICpcbiAqIGNvbnN0IG5hbWUgPSBcIlpvZVwiO1xuICogcmVuZGVyKGh0bWxgPHA+SGVsbG8sICR7bmFtZX0hPC9wPmAsIGRvY3VtZW50LmJvZHkpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHZhbHVlIEFueSBbcmVuZGVyYWJsZVxuICogICB2YWx1ZV0oaHR0cHM6Ly9saXQuZGV2L2RvY3MvdGVtcGxhdGVzL2V4cHJlc3Npb25zLyNjaGlsZC1leHByZXNzaW9ucyksXG4gKiAgIHR5cGljYWxseSBhIHtAbGlua2NvZGUgVGVtcGxhdGVSZXN1bHR9IGNyZWF0ZWQgYnkgZXZhbHVhdGluZyBhIHRlbXBsYXRlIHRhZ1xuICogICBsaWtlIHtAbGlua2NvZGUgaHRtbH0gb3Ige0BsaW5rY29kZSBzdmd9LlxuICogQHBhcmFtIGNvbnRhaW5lciBBIERPTSBjb250YWluZXIgdG8gcmVuZGVyIHRvLiBUaGUgZmlyc3QgcmVuZGVyIHdpbGwgYXBwZW5kXG4gKiAgIHRoZSByZW5kZXJlZCB2YWx1ZSB0byB0aGUgY29udGFpbmVyLCBhbmQgc3Vic2VxdWVudCByZW5kZXJzIHdpbGxcbiAqICAgZWZmaWNpZW50bHkgdXBkYXRlIHRoZSByZW5kZXJlZCB2YWx1ZSBpZiB0aGUgc2FtZSByZXN1bHQgdHlwZSB3YXNcbiAqICAgcHJldmlvdXNseSByZW5kZXJlZCB0aGVyZS5cbiAqIEBwYXJhbSBvcHRpb25zIFNlZSB7QGxpbmtjb2RlIFJlbmRlck9wdGlvbnN9IGZvciBvcHRpb25zIGRvY3VtZW50YXRpb24uXG4gKiBAc2VlXG4gKiB7QGxpbmsgaHR0cHM6Ly9saXQuZGV2L2RvY3MvbGlicmFyaWVzL3N0YW5kYWxvbmUtdGVtcGxhdGVzLyNyZW5kZXJpbmctbGl0LWh0bWwtdGVtcGxhdGVzfCBSZW5kZXJpbmcgTGl0IEhUTUwgVGVtcGxhdGVzfVxuICovXG5leHBvcnQgY29uc3QgcmVuZGVyID0gKFxuICB2YWx1ZTogdW5rbm93bixcbiAgY29udGFpbmVyOiBIVE1MRWxlbWVudCB8IERvY3VtZW50RnJhZ21lbnQsXG4gIG9wdGlvbnM/OiBSZW5kZXJPcHRpb25zXG4pOiBSb290UGFydCA9PiB7XG4gIGlmIChERVZfTU9ERSAmJiBjb250YWluZXIgPT0gbnVsbCkge1xuICAgIC8vIEdpdmUgYSBjbGVhcmVyIGVycm9yIG1lc3NhZ2UgdGhhblxuICAgIC8vICAgICBVbmNhdWdodCBUeXBlRXJyb3I6IENhbm5vdCByZWFkIHByb3BlcnRpZXMgb2YgbnVsbCAocmVhZGluZ1xuICAgIC8vICAgICAnXyRsaXRQYXJ0JCcpXG4gICAgLy8gd2hpY2ggcmVhZHMgbGlrZSBhbiBpbnRlcm5hbCBMaXQgZXJyb3IuXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVGhlIGNvbnRhaW5lciB0byByZW5kZXIgaW50byBtYXkgbm90IGJlICR7Y29udGFpbmVyfWApO1xuICB9XG4gIGNvbnN0IHJlbmRlcklkID0gREVWX01PREUgPyBkZWJ1Z0xvZ1JlbmRlcklkKysgOiAwO1xuICBjb25zdCBwYXJ0T3duZXJOb2RlID0gb3B0aW9ucz8ucmVuZGVyQmVmb3JlID8/IGNvbnRhaW5lcjtcbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgbGV0IHBhcnQ6IENoaWxkUGFydCA9IChwYXJ0T3duZXJOb2RlIGFzIGFueSlbJ18kbGl0UGFydCQnXTtcbiAgZGVidWdMb2dFdmVudCAmJlxuICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAga2luZDogJ2JlZ2luIHJlbmRlcicsXG4gICAgICBpZDogcmVuZGVySWQsXG4gICAgICB2YWx1ZSxcbiAgICAgIGNvbnRhaW5lcixcbiAgICAgIG9wdGlvbnMsXG4gICAgICBwYXJ0LFxuICAgIH0pO1xuICBpZiAocGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgZW5kTm9kZSA9IG9wdGlvbnM/LnJlbmRlckJlZm9yZSA/PyBudWxsO1xuICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAocGFydE93bmVyTm9kZSBhcyBhbnkpWydfJGxpdFBhcnQkJ10gPSBwYXJ0ID0gbmV3IENoaWxkUGFydChcbiAgICAgIGNvbnRhaW5lci5pbnNlcnRCZWZvcmUoY3JlYXRlTWFya2VyKCksIGVuZE5vZGUpLFxuICAgICAgZW5kTm9kZSxcbiAgICAgIHVuZGVmaW5lZCxcbiAgICAgIG9wdGlvbnMgPz8ge31cbiAgICApO1xuICB9XG4gIHBhcnQuXyRzZXRWYWx1ZSh2YWx1ZSk7XG4gIGRlYnVnTG9nRXZlbnQgJiZcbiAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgIGtpbmQ6ICdlbmQgcmVuZGVyJyxcbiAgICAgIGlkOiByZW5kZXJJZCxcbiAgICAgIHZhbHVlLFxuICAgICAgY29udGFpbmVyLFxuICAgICAgb3B0aW9ucyxcbiAgICAgIHBhcnQsXG4gICAgfSk7XG4gIHJldHVybiBwYXJ0IGFzIFJvb3RQYXJ0O1xufTtcblxuaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICByZW5kZXIuc2V0U2FuaXRpemVyID0gc2V0U2FuaXRpemVyO1xuICByZW5kZXIuY3JlYXRlU2FuaXRpemVyID0gY3JlYXRlU2FuaXRpemVyO1xuICBpZiAoREVWX01PREUpIHtcbiAgICByZW5kZXIuX3Rlc3RPbmx5Q2xlYXJTYW5pdGl6ZXJGYWN0b3J5RG9Ob3RDYWxsT3JFbHNlID1cbiAgICAgIF90ZXN0T25seUNsZWFyU2FuaXRpemVyRmFjdG9yeURvTm90Q2FsbE9yRWxzZTtcbiAgfVxufVxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7XG4gIERpcmVjdGl2ZSxcbiAgUGFydEluZm8sXG4gIERpcmVjdGl2ZUNsYXNzLFxuICBEaXJlY3RpdmVSZXN1bHQsXG59IGZyb20gJy4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7XG4gIF8kTEggYXMgcCxcbiAgQXR0cmlidXRlUGFydCxcbiAgbm9DaGFuZ2UsXG4gIFBhcnQsXG4gIERpc2Nvbm5lY3RhYmxlLFxufSBmcm9tICcuL2xpdC1odG1sLmpzJztcblxuaW1wb3J0IHR5cGUge1xuICBQcm9wZXJ0eVBhcnQsXG4gIENoaWxkUGFydCxcbiAgQm9vbGVhbkF0dHJpYnV0ZVBhcnQsXG4gIEV2ZW50UGFydCxcbiAgRWxlbWVudFBhcnQsXG4gIFRlbXBsYXRlSW5zdGFuY2UsXG59IGZyb20gJy4vbGl0LWh0bWwuanMnO1xuXG4vLyBDb250YWlucyBlaXRoZXIgdGhlIG1pbmlmaWVkIG9yIHVubWluaWZpZWQgYF8kcmVzb2x2ZWAgRGlyZWN0aXZlIG1ldGhvZCBuYW1lLlxubGV0IHJlc29sdmVNZXRob2ROYW1lOiBFeHRyYWN0PGtleW9mIERpcmVjdGl2ZSwgJ18kcmVzb2x2ZSc+IHwgbnVsbCA9IG51bGw7XG5cbi8qKlxuICogRU5EIFVTRVJTIFNIT1VMRCBOT1QgUkVMWSBPTiBUSElTIE9CSkVDVC5cbiAqXG4gKiBXZSBjdXJyZW50bHkgZG8gbm90IG1ha2UgYSBtYW5nbGVkIHJvbGx1cCBidWlsZCBvZiB0aGUgbGl0LXNzciBjb2RlLiBJbiBvcmRlclxuICogdG8ga2VlcCBhIG51bWJlciBvZiAob3RoZXJ3aXNlIHByaXZhdGUpIHRvcC1sZXZlbCBleHBvcnRzIG1hbmdsZWQgaW4gdGhlXG4gKiBjbGllbnQgc2lkZSBjb2RlLCB3ZSBleHBvcnQgYSBfJExIIG9iamVjdCBjb250YWluaW5nIHRob3NlIG1lbWJlcnMgKG9yXG4gKiBoZWxwZXIgbWV0aG9kcyBmb3IgYWNjZXNzaW5nIHByaXZhdGUgZmllbGRzIG9mIHRob3NlIG1lbWJlcnMpLCBhbmQgdGhlblxuICogcmUtZXhwb3J0IHRoZW0gZm9yIHVzZSBpbiBsaXQtc3NyLiBUaGlzIGtlZXBzIGxpdC1zc3IgYWdub3N0aWMgdG8gd2hldGhlciB0aGVcbiAqIGNsaWVudC1zaWRlIGNvZGUgaXMgYmVpbmcgdXNlZCBpbiBgZGV2YCBtb2RlIG9yIGBwcm9kYCBtb2RlLlxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IGNvbnN0IF8kTEggPSB7XG4gIGJvdW5kQXR0cmlidXRlU3VmZml4OiBwLl9ib3VuZEF0dHJpYnV0ZVN1ZmZpeCxcbiAgbWFya2VyOiBwLl9tYXJrZXIsXG4gIG1hcmtlck1hdGNoOiBwLl9tYXJrZXJNYXRjaCxcbiAgSFRNTF9SRVNVTFQ6IHAuX0hUTUxfUkVTVUxULFxuICBnZXRUZW1wbGF0ZUh0bWw6IHAuX2dldFRlbXBsYXRlSHRtbCxcbiAgb3ZlcnJpZGVEaXJlY3RpdmVSZXNvbHZlOiAoXG4gICAgZGlyZWN0aXZlQ2xhc3M6IG5ldyAocGFydDogUGFydEluZm8pID0+IERpcmVjdGl2ZSAmIHtyZW5kZXIoKTogdW5rbm93bn0sXG4gICAgcmVzb2x2ZU92ZXJyaWRlRm46IChkaXJlY3RpdmU6IERpcmVjdGl2ZSwgdmFsdWVzOiB1bmtub3duW10pID0+IHVua25vd25cbiAgKSA9PlxuICAgIGNsYXNzIGV4dGVuZHMgZGlyZWN0aXZlQ2xhc3Mge1xuICAgICAgb3ZlcnJpZGUgXyRyZXNvbHZlKFxuICAgICAgICB0aGlzOiBEaXJlY3RpdmUsXG4gICAgICAgIF9wYXJ0OiBQYXJ0LFxuICAgICAgICB2YWx1ZXM6IHVua25vd25bXVxuICAgICAgKTogdW5rbm93biB7XG4gICAgICAgIHJldHVybiByZXNvbHZlT3ZlcnJpZGVGbih0aGlzLCB2YWx1ZXMpO1xuICAgICAgfVxuICAgIH0sXG4gIHBhdGNoRGlyZWN0aXZlUmVzb2x2ZTogKFxuICAgIGRpcmVjdGl2ZUNsYXNzOiB0eXBlb2YgRGlyZWN0aXZlLFxuICAgIHJlc29sdmVPdmVycmlkZUZuOiAoXG4gICAgICB0aGlzOiBEaXJlY3RpdmUsXG4gICAgICBfcGFydDogUGFydCxcbiAgICAgIHZhbHVlczogdW5rbm93bltdXG4gICAgKSA9PiB1bmtub3duXG4gICkgPT4ge1xuICAgIGlmIChkaXJlY3RpdmVDbGFzcy5wcm90b3R5cGUuXyRyZXNvbHZlLm5hbWUgIT09IHJlc29sdmVPdmVycmlkZUZuLm5hbWUpIHtcbiAgICAgIHJlc29sdmVNZXRob2ROYW1lID8/PSBkaXJlY3RpdmVDbGFzcy5wcm90b3R5cGUuXyRyZXNvbHZlXG4gICAgICAgIC5uYW1lIGFzIE5vbk51bGxhYmxlPHR5cGVvZiByZXNvbHZlTWV0aG9kTmFtZT47XG4gICAgICBmb3IgKFxuICAgICAgICBsZXQgcHJvdG8gPSBkaXJlY3RpdmVDbGFzcy5wcm90b3R5cGU7XG4gICAgICAgIHByb3RvICE9PSBPYmplY3QucHJvdG90eXBlO1xuICAgICAgICBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihwcm90bylcbiAgICAgICkge1xuICAgICAgICBpZiAocHJvdG8uaGFzT3duUHJvcGVydHkocmVzb2x2ZU1ldGhvZE5hbWUpKSB7XG4gICAgICAgICAgcHJvdG9bcmVzb2x2ZU1ldGhvZE5hbWVdID0gcmVzb2x2ZU92ZXJyaWRlRm47XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBOb3RoaW5nIHdhcyBwYXRjaGVkIHdoaWNoIGluZGljYXRlcyBhbiBlcnJvci4gVGhlIG1vc3QgbGlrZWx5IGVycm9yIGlzXG4gICAgICAvLyB0aGF0IHNvbWVob3cgYm90aCBtaW5pZmllZCBhbmQgdW5taW5pZmllZCBsaXQgY29kZSBwYXNzZWQgdGhyb3VnaCB0aGlzXG4gICAgICAvLyBjb2RlcGF0aC4gVGhpcyBpcyBwb3NzaWJsZSBhcyBsaXQtbGFicy9zc3IgY29udGFpbnMgaXRzIG93biBsaXQtaHRtbFxuICAgICAgLy8gbW9kdWxlIGFzIGEgZGVwZW5kZW5jeSBmb3Igc2VydmVyIHJlbmRlcmluZyBjbGllbnQgTGl0IGNvZGUuIElmIGFcbiAgICAgIC8vIGNsaWVudCBjb250YWlucyBtdWx0aXBsZSBkdXBsaWNhdGUgTGl0IG1vZHVsZXMgd2l0aCBtaW5pZmllZCBhbmRcbiAgICAgIC8vIHVubWluaWZpZWQgZXhwb3J0cywgd2UgY3VycmVudGx5IGNhbm5vdCBoYW5kbGUgYm90aC5cbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEludGVybmFsIGVycm9yOiBJdCBpcyBwb3NzaWJsZSB0aGF0IGJvdGggZGV2IG1vZGUgYW5kIHByb2R1Y3Rpb24gbW9kZWAgK1xuICAgICAgICAgIGAgTGl0IHdhcyBtaXhlZCB0b2dldGhlciBkdXJpbmcgU1NSLiBQbGVhc2UgY29tbWVudCBvbiB0aGUgaXNzdWU6IGAgK1xuICAgICAgICAgIGBodHRwczovL2dpdGh1Yi5jb20vbGl0L2xpdC9pc3N1ZXMvNDUyN2BcbiAgICAgICk7XG4gICAgfVxuICB9LFxuICBzZXREaXJlY3RpdmVDbGFzcyh2YWx1ZTogRGlyZWN0aXZlUmVzdWx0LCBkaXJlY3RpdmVDbGFzczogRGlyZWN0aXZlQ2xhc3MpIHtcbiAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIHZhbHVlWydfJGxpdERpcmVjdGl2ZSQnXSA9IGRpcmVjdGl2ZUNsYXNzO1xuICB9LFxuICBnZXRBdHRyaWJ1dGVQYXJ0Q29tbWl0dGVkVmFsdWU6IChcbiAgICBwYXJ0OiBBdHRyaWJ1dGVQYXJ0LFxuICAgIHZhbHVlOiB1bmtub3duLFxuICAgIGluZGV4OiBudW1iZXIgfCB1bmRlZmluZWRcbiAgKSA9PiB7XG4gICAgLy8gVXNlIHRoZSBwYXJ0IHNldHRlciB0byByZXNvbHZlIGRpcmVjdGl2ZXMvY29uY2F0ZW5hdGUgbXVsdGlwbGUgcGFydHNcbiAgICAvLyBpbnRvIGEgZmluYWwgdmFsdWUgKGNhcHR1cmVkIGJ5IHBhc3NpbmcgaW4gYSBjb21taXRWYWx1ZSBvdmVycmlkZSlcbiAgICBsZXQgY29tbWl0dGVkVmFsdWU6IHVua25vd24gPSBub0NoYW5nZTtcbiAgICAvLyBOb3RlIHRoYXQgX2NvbW1pdFZhbHVlIG5lZWQgbm90IGJlIGluIGBzdGFibGVQcm9wZXJ0aWVzYCBiZWNhdXNlIHRoaXNcbiAgICAvLyBtZXRob2QgaXMgb25seSBydW4gb24gYEF0dHJpYnV0ZVBhcnRgcyBjcmVhdGVkIGJ5IGxpdC1zc3IgdXNpbmcgdGhlIHNhbWVcbiAgICAvLyB2ZXJzaW9uIG9mIHRoZSBsaWJyYXJ5IGFzIHRoaXMgZmlsZVxuICAgIHBhcnQuX2NvbW1pdFZhbHVlID0gKHZhbHVlOiB1bmtub3duKSA9PiAoY29tbWl0dGVkVmFsdWUgPSB2YWx1ZSk7XG4gICAgcGFydC5fJHNldFZhbHVlKHZhbHVlLCBwYXJ0LCBpbmRleCk7XG4gICAgcmV0dXJuIGNvbW1pdHRlZFZhbHVlO1xuICB9LFxuICBjb25uZWN0ZWREaXNjb25uZWN0YWJsZTogKHByb3BzPzogb2JqZWN0KTogRGlzY29ubmVjdGFibGUgPT4gKHtcbiAgICAuLi5wcm9wcyxcbiAgICBfJGlzQ29ubmVjdGVkOiB0cnVlLFxuICB9KSxcbiAgcmVzb2x2ZURpcmVjdGl2ZTogcC5fcmVzb2x2ZURpcmVjdGl2ZSxcbiAgQXR0cmlidXRlUGFydDogcC5fQXR0cmlidXRlUGFydCxcbiAgUHJvcGVydHlQYXJ0OiBwLl9Qcm9wZXJ0eVBhcnQgYXMgdHlwZW9mIFByb3BlcnR5UGFydCxcbiAgQm9vbGVhbkF0dHJpYnV0ZVBhcnQ6IHAuX0Jvb2xlYW5BdHRyaWJ1dGVQYXJ0IGFzIHR5cGVvZiBCb29sZWFuQXR0cmlidXRlUGFydCxcbiAgRXZlbnRQYXJ0OiBwLl9FdmVudFBhcnQgYXMgdHlwZW9mIEV2ZW50UGFydCxcbiAgRWxlbWVudFBhcnQ6IHAuX0VsZW1lbnRQYXJ0IGFzIHR5cGVvZiBFbGVtZW50UGFydCxcbiAgVGVtcGxhdGVJbnN0YW5jZTogcC5fVGVtcGxhdGVJbnN0YW5jZSBhcyB0eXBlb2YgVGVtcGxhdGVJbnN0YW5jZSxcbiAgaXNJdGVyYWJsZTogcC5faXNJdGVyYWJsZSxcbiAgQ2hpbGRQYXJ0OiBwLl9DaGlsZFBhcnQgYXMgdHlwZW9mIENoaWxkUGFydCxcbn07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtEaXNjb25uZWN0YWJsZSwgUGFydH0gZnJvbSAnLi9saXQtaHRtbC5qcyc7XG5cbmV4cG9ydCB7XG4gIEF0dHJpYnV0ZVBhcnQsXG4gIEJvb2xlYW5BdHRyaWJ1dGVQYXJ0LFxuICBDaGlsZFBhcnQsXG4gIEVsZW1lbnRQYXJ0LFxuICBFdmVudFBhcnQsXG4gIFBhcnQsXG4gIFByb3BlcnR5UGFydCxcbn0gZnJvbSAnLi9saXQtaHRtbC5qcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGlyZWN0aXZlQ2xhc3Mge1xuICBuZXcgKHBhcnQ6IFBhcnRJbmZvKTogRGlyZWN0aXZlO1xufVxuXG4vKipcbiAqIFRoaXMgdXRpbGl0eSB0eXBlIGV4dHJhY3RzIHRoZSBzaWduYXR1cmUgb2YgYSBkaXJlY3RpdmUgY2xhc3MncyByZW5kZXIoKVxuICogbWV0aG9kIHNvIHdlIGNhbiB1c2UgaXQgZm9yIHRoZSB0eXBlIG9mIHRoZSBnZW5lcmF0ZWQgZGlyZWN0aXZlIGZ1bmN0aW9uLlxuICovXG5leHBvcnQgdHlwZSBEaXJlY3RpdmVQYXJhbWV0ZXJzPEMgZXh0ZW5kcyBEaXJlY3RpdmU+ID0gUGFyYW1ldGVyczxDWydyZW5kZXInXT47XG5cbi8qKlxuICogQSBnZW5lcmF0ZWQgZGlyZWN0aXZlIGZ1bmN0aW9uIGRvZXNuJ3QgZXZhbHVhdGUgdGhlIGRpcmVjdGl2ZSwgYnV0IGp1c3RcbiAqIHJldHVybnMgYSBEaXJlY3RpdmVSZXN1bHQgb2JqZWN0IHRoYXQgY2FwdHVyZXMgdGhlIGFyZ3VtZW50cy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEaXJlY3RpdmVSZXN1bHQ8QyBleHRlbmRzIERpcmVjdGl2ZUNsYXNzID0gRGlyZWN0aXZlQ2xhc3M+IHtcbiAgLyoqXG4gICAqIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgWydfJGxpdERpcmVjdGl2ZSQnXTogQztcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICB2YWx1ZXM6IERpcmVjdGl2ZVBhcmFtZXRlcnM8SW5zdGFuY2VUeXBlPEM+Pjtcbn1cblxuZXhwb3J0IGNvbnN0IFBhcnRUeXBlID0ge1xuICBBVFRSSUJVVEU6IDEsXG4gIENISUxEOiAyLFxuICBQUk9QRVJUWTogMyxcbiAgQk9PTEVBTl9BVFRSSUJVVEU6IDQsXG4gIEVWRU5UOiA1LFxuICBFTEVNRU5UOiA2LFxufSBhcyBjb25zdDtcblxuZXhwb3J0IHR5cGUgUGFydFR5cGUgPSAodHlwZW9mIFBhcnRUeXBlKVtrZXlvZiB0eXBlb2YgUGFydFR5cGVdO1xuXG5leHBvcnQgaW50ZXJmYWNlIENoaWxkUGFydEluZm8ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgUGFydFR5cGUuQ0hJTEQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXR0cmlidXRlUGFydEluZm8ge1xuICByZWFkb25seSB0eXBlOlxuICAgIHwgdHlwZW9mIFBhcnRUeXBlLkFUVFJJQlVURVxuICAgIHwgdHlwZW9mIFBhcnRUeXBlLlBST1BFUlRZXG4gICAgfCB0eXBlb2YgUGFydFR5cGUuQk9PTEVBTl9BVFRSSUJVVEVcbiAgICB8IHR5cGVvZiBQYXJ0VHlwZS5FVkVOVDtcbiAgcmVhZG9ubHkgc3RyaW5ncz86IFJlYWRvbmx5QXJyYXk8c3RyaW5nPjtcbiAgcmVhZG9ubHkgbmFtZTogc3RyaW5nO1xuICByZWFkb25seSB0YWdOYW1lOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRWxlbWVudFBhcnRJbmZvIHtcbiAgcmVhZG9ubHkgdHlwZTogdHlwZW9mIFBhcnRUeXBlLkVMRU1FTlQ7XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHBhcnQgYSBkaXJlY3RpdmUgaXMgYm91bmQgdG8uXG4gKlxuICogVGhpcyBpcyB1c2VmdWwgZm9yIGNoZWNraW5nIHRoYXQgYSBkaXJlY3RpdmUgaXMgYXR0YWNoZWQgdG8gYSB2YWxpZCBwYXJ0LFxuICogc3VjaCBhcyB3aXRoIGRpcmVjdGl2ZSB0aGF0IGNhbiBvbmx5IGJlIHVzZWQgb24gYXR0cmlidXRlIGJpbmRpbmdzLlxuICovXG5leHBvcnQgdHlwZSBQYXJ0SW5mbyA9IENoaWxkUGFydEluZm8gfCBBdHRyaWJ1dGVQYXJ0SW5mbyB8IEVsZW1lbnRQYXJ0SW5mbztcblxuLyoqXG4gKiBDcmVhdGVzIGEgdXNlci1mYWNpbmcgZGlyZWN0aXZlIGZ1bmN0aW9uIGZyb20gYSBEaXJlY3RpdmUgY2xhc3MuIFRoaXNcbiAqIGZ1bmN0aW9uIGhhcyB0aGUgc2FtZSBwYXJhbWV0ZXJzIGFzIHRoZSBkaXJlY3RpdmUncyByZW5kZXIoKSBtZXRob2QuXG4gKi9cbmV4cG9ydCBjb25zdCBkaXJlY3RpdmUgPVxuICA8QyBleHRlbmRzIERpcmVjdGl2ZUNsYXNzPihjOiBDKSA9PlxuICAoLi4udmFsdWVzOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPEluc3RhbmNlVHlwZTxDPj4pOiBEaXJlY3RpdmVSZXN1bHQ8Qz4gPT4gKHtcbiAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIFsnXyRsaXREaXJlY3RpdmUkJ106IGMsXG4gICAgdmFsdWVzLFxuICB9KTtcblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBjcmVhdGluZyBjdXN0b20gZGlyZWN0aXZlcy4gVXNlcnMgc2hvdWxkIGV4dGVuZCB0aGlzIGNsYXNzLFxuICogaW1wbGVtZW50IGByZW5kZXJgIGFuZC9vciBgdXBkYXRlYCwgYW5kIHRoZW4gcGFzcyB0aGVpciBzdWJjbGFzcyB0b1xuICogYGRpcmVjdGl2ZWAuXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBEaXJlY3RpdmUgaW1wbGVtZW50cyBEaXNjb25uZWN0YWJsZSB7XG4gIC8vQGludGVybmFsXG4gIF9fcGFydCE6IFBhcnQ7XG4gIC8vQGludGVybmFsXG4gIF9fYXR0cmlidXRlSW5kZXg6IG51bWJlciB8IHVuZGVmaW5lZDtcbiAgLy9AaW50ZXJuYWxcbiAgX19kaXJlY3RpdmU/OiBEaXJlY3RpdmU7XG5cbiAgLy9AaW50ZXJuYWxcbiAgXyRwYXJlbnQhOiBEaXNjb25uZWN0YWJsZTtcblxuICAvLyBUaGVzZSB3aWxsIG9ubHkgZXhpc3Qgb24gdGhlIEFzeW5jRGlyZWN0aXZlIHN1YmNsYXNzXG4gIC8vQGludGVybmFsXG4gIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT47XG4gIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gIC8vQGludGVybmFsXG4gIFsnXyRub3RpZnlEaXJlY3RpdmVDb25uZWN0aW9uQ2hhbmdlZCddPyhpc0Nvbm5lY3RlZDogYm9vbGVhbik6IHZvaWQ7XG5cbiAgY29uc3RydWN0b3IoX3BhcnRJbmZvOiBQYXJ0SW5mbykge31cblxuICAvLyBTZWUgY29tbWVudCBpbiBEaXNjb25uZWN0YWJsZSBpbnRlcmZhY2UgZm9yIHdoeSB0aGlzIGlzIGEgZ2V0dGVyXG4gIGdldCBfJGlzQ29ubmVjdGVkKCkge1xuICAgIHJldHVybiB0aGlzLl8kcGFyZW50Ll8kaXNDb25uZWN0ZWQ7XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIF8kaW5pdGlhbGl6ZShcbiAgICBwYXJ0OiBQYXJ0LFxuICAgIHBhcmVudDogRGlzY29ubmVjdGFibGUsXG4gICAgYXR0cmlidXRlSW5kZXg6IG51bWJlciB8IHVuZGVmaW5lZFxuICApIHtcbiAgICB0aGlzLl9fcGFydCA9IHBhcnQ7XG4gICAgdGhpcy5fJHBhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLl9fYXR0cmlidXRlSW5kZXggPSBhdHRyaWJ1dGVJbmRleDtcbiAgfVxuICAvKiogQGludGVybmFsICovXG4gIF8kcmVzb2x2ZShwYXJ0OiBQYXJ0LCBwcm9wczogQXJyYXk8dW5rbm93bj4pOiB1bmtub3duIHtcbiAgICByZXR1cm4gdGhpcy51cGRhdGUocGFydCwgcHJvcHMpO1xuICB9XG5cbiAgYWJzdHJhY3QgcmVuZGVyKC4uLnByb3BzOiBBcnJheTx1bmtub3duPik6IHVua25vd247XG5cbiAgdXBkYXRlKF9wYXJ0OiBQYXJ0LCBwcm9wczogQXJyYXk8dW5rbm93bj4pOiB1bmtub3duIHtcbiAgICByZXR1cm4gdGhpcy5yZW5kZXIoLi4ucHJvcHMpO1xuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtcbiAgXyRMSCxcbiAgUGFydCxcbiAgRGlyZWN0aXZlUGFyZW50LFxuICBDb21waWxlZFRlbXBsYXRlUmVzdWx0LFxuICBNYXliZUNvbXBpbGVkVGVtcGxhdGVSZXN1bHQsXG4gIFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdCxcbn0gZnJvbSAnLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBEaXJlY3RpdmVSZXN1bHQsXG4gIERpcmVjdGl2ZUNsYXNzLFxuICBQYXJ0SW5mbyxcbiAgQXR0cmlidXRlUGFydEluZm8sXG59IGZyb20gJy4vZGlyZWN0aXZlLmpzJztcbnR5cGUgUHJpbWl0aXZlID0gbnVsbCB8IHVuZGVmaW5lZCB8IGJvb2xlYW4gfCBudW1iZXIgfCBzdHJpbmcgfCBzeW1ib2wgfCBiaWdpbnQ7XG5cbmNvbnN0IHtfQ2hpbGRQYXJ0OiBDaGlsZFBhcnR9ID0gXyRMSDtcblxudHlwZSBDaGlsZFBhcnQgPSBJbnN0YW5jZVR5cGU8dHlwZW9mIENoaWxkUGFydD47XG5cbmNvbnN0IEVOQUJMRV9TSEFEWURPTV9OT1BBVENIID0gdHJ1ZTtcblxuY29uc3Qgd3JhcCA9XG4gIEVOQUJMRV9TSEFEWURPTV9OT1BBVENIICYmXG4gIHdpbmRvdy5TaGFkeURPTT8uaW5Vc2UgJiZcbiAgd2luZG93LlNoYWR5RE9NPy5ub1BhdGNoID09PSB0cnVlXG4gICAgPyB3aW5kb3cuU2hhZHlET00hLndyYXBcbiAgICA6IChub2RlOiBOb2RlKSA9PiBub2RlO1xuXG4vKipcbiAqIFRlc3RzIGlmIGEgdmFsdWUgaXMgYSBwcmltaXRpdmUgdmFsdWUuXG4gKlxuICogU2VlIGh0dHBzOi8vdGMzOS5naXRodWIuaW8vZWNtYTI2Mi8jc2VjLXR5cGVvZi1vcGVyYXRvclxuICovXG5leHBvcnQgY29uc3QgaXNQcmltaXRpdmUgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBQcmltaXRpdmUgPT5cbiAgdmFsdWUgPT09IG51bGwgfHwgKHR5cGVvZiB2YWx1ZSAhPSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsdWUgIT0gJ2Z1bmN0aW9uJyk7XG5cbmV4cG9ydCBjb25zdCBUZW1wbGF0ZVJlc3VsdFR5cGUgPSB7XG4gIEhUTUw6IDEsXG4gIFNWRzogMixcbiAgTUFUSE1MOiAzLFxufSBhcyBjb25zdDtcblxuZXhwb3J0IHR5cGUgVGVtcGxhdGVSZXN1bHRUeXBlID1cbiAgKHR5cGVvZiBUZW1wbGF0ZVJlc3VsdFR5cGUpW2tleW9mIHR5cGVvZiBUZW1wbGF0ZVJlc3VsdFR5cGVdO1xuXG50eXBlIElzVGVtcGxhdGVSZXN1bHQgPSB7XG4gICh2YWw6IHVua25vd24pOiB2YWwgaXMgTWF5YmVDb21waWxlZFRlbXBsYXRlUmVzdWx0O1xuICA8VCBleHRlbmRzIFRlbXBsYXRlUmVzdWx0VHlwZT4oXG4gICAgdmFsOiB1bmtub3duLFxuICAgIHR5cGU6IFRcbiAgKTogdmFsIGlzIFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdDxUPjtcbn07XG5cbi8qKlxuICogVGVzdHMgaWYgYSB2YWx1ZSBpcyBhIFRlbXBsYXRlUmVzdWx0IG9yIGEgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdC5cbiAqL1xuZXhwb3J0IGNvbnN0IGlzVGVtcGxhdGVSZXN1bHQ6IElzVGVtcGxhdGVSZXN1bHQgPSAoXG4gIHZhbHVlOiB1bmtub3duLFxuICB0eXBlPzogVGVtcGxhdGVSZXN1bHRUeXBlXG4pOiB2YWx1ZSBpcyBVbmNvbXBpbGVkVGVtcGxhdGVSZXN1bHQgPT5cbiAgdHlwZSA9PT0gdW5kZWZpbmVkXG4gICAgPyAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgICAgKHZhbHVlIGFzIFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdCk/LlsnXyRsaXRUeXBlJCddICE9PSB1bmRlZmluZWRcbiAgICA6ICh2YWx1ZSBhcyBVbmNvbXBpbGVkVGVtcGxhdGVSZXN1bHQpPy5bJ18kbGl0VHlwZSQnXSA9PT0gdHlwZTtcblxuLyoqXG4gKiBUZXN0cyBpZiBhIHZhbHVlIGlzIGEgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdC5cbiAqL1xuZXhwb3J0IGNvbnN0IGlzQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdCA9IChcbiAgdmFsdWU6IHVua25vd25cbik6IHZhbHVlIGlzIENvbXBpbGVkVGVtcGxhdGVSZXN1bHQgPT4ge1xuICByZXR1cm4gKHZhbHVlIGFzIENvbXBpbGVkVGVtcGxhdGVSZXN1bHQpPy5bJ18kbGl0VHlwZSQnXT8uaCAhPSBudWxsO1xufTtcblxuLyoqXG4gKiBUZXN0cyBpZiBhIHZhbHVlIGlzIGEgRGlyZWN0aXZlUmVzdWx0LlxuICovXG5leHBvcnQgY29uc3QgaXNEaXJlY3RpdmVSZXN1bHQgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBEaXJlY3RpdmVSZXN1bHQgPT5cbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgKHZhbHVlIGFzIERpcmVjdGl2ZVJlc3VsdCk/LlsnXyRsaXREaXJlY3RpdmUkJ10gIT09IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBSZXRyaWV2ZXMgdGhlIERpcmVjdGl2ZSBjbGFzcyBmb3IgYSBEaXJlY3RpdmVSZXN1bHRcbiAqL1xuZXhwb3J0IGNvbnN0IGdldERpcmVjdGl2ZUNsYXNzID0gKHZhbHVlOiB1bmtub3duKTogRGlyZWN0aXZlQ2xhc3MgfCB1bmRlZmluZWQgPT5cbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgKHZhbHVlIGFzIERpcmVjdGl2ZVJlc3VsdCk/LlsnXyRsaXREaXJlY3RpdmUkJ107XG5cbi8qKlxuICogVGVzdHMgd2hldGhlciBhIHBhcnQgaGFzIG9ubHkgYSBzaW5nbGUtZXhwcmVzc2lvbiB3aXRoIG5vIHN0cmluZ3MgdG9cbiAqIGludGVycG9sYXRlIGJldHdlZW4uXG4gKlxuICogT25seSBBdHRyaWJ1dGVQYXJ0IGFuZCBQcm9wZXJ0eVBhcnQgY2FuIGhhdmUgbXVsdGlwbGUgZXhwcmVzc2lvbnMuXG4gKiBNdWx0aS1leHByZXNzaW9uIHBhcnRzIGhhdmUgYSBgc3RyaW5nc2AgcHJvcGVydHkgYW5kIHNpbmdsZS1leHByZXNzaW9uXG4gKiBwYXJ0cyBkbyBub3QuXG4gKi9cbmV4cG9ydCBjb25zdCBpc1NpbmdsZUV4cHJlc3Npb24gPSAocGFydDogUGFydEluZm8pID0+XG4gIChwYXJ0IGFzIEF0dHJpYnV0ZVBhcnRJbmZvKS5zdHJpbmdzID09PSB1bmRlZmluZWQ7XG5cbmNvbnN0IGNyZWF0ZU1hcmtlciA9ICgpID0+IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJycpO1xuXG4vKipcbiAqIEluc2VydHMgYSBDaGlsZFBhcnQgaW50byB0aGUgZ2l2ZW4gY29udGFpbmVyIENoaWxkUGFydCdzIERPTSwgZWl0aGVyIGF0IHRoZVxuICogZW5kIG9mIHRoZSBjb250YWluZXIgQ2hpbGRQYXJ0LCBvciBiZWZvcmUgdGhlIG9wdGlvbmFsIGByZWZQYXJ0YC5cbiAqXG4gKiBUaGlzIGRvZXMgbm90IGFkZCB0aGUgcGFydCB0byB0aGUgY29udGFpbmVyUGFydCdzIGNvbW1pdHRlZCB2YWx1ZS4gVGhhdCBtdXN0XG4gKiBiZSBkb25lIGJ5IGNhbGxlcnMuXG4gKlxuICogQHBhcmFtIGNvbnRhaW5lclBhcnQgUGFydCB3aXRoaW4gd2hpY2ggdG8gYWRkIHRoZSBuZXcgQ2hpbGRQYXJ0XG4gKiBAcGFyYW0gcmVmUGFydCBQYXJ0IGJlZm9yZSB3aGljaCB0byBhZGQgdGhlIG5ldyBDaGlsZFBhcnQ7IHdoZW4gb21pdHRlZCB0aGVcbiAqICAgICBwYXJ0IGFkZGVkIHRvIHRoZSBlbmQgb2YgdGhlIGBjb250YWluZXJQYXJ0YFxuICogQHBhcmFtIHBhcnQgUGFydCB0byBpbnNlcnQsIG9yIHVuZGVmaW5lZCB0byBjcmVhdGUgYSBuZXcgcGFydFxuICovXG5leHBvcnQgY29uc3QgaW5zZXJ0UGFydCA9IChcbiAgY29udGFpbmVyUGFydDogQ2hpbGRQYXJ0LFxuICByZWZQYXJ0PzogQ2hpbGRQYXJ0LFxuICBwYXJ0PzogQ2hpbGRQYXJ0XG4pOiBDaGlsZFBhcnQgPT4ge1xuICBjb25zdCBjb250YWluZXIgPSB3cmFwKGNvbnRhaW5lclBhcnQuXyRzdGFydE5vZGUpLnBhcmVudE5vZGUhO1xuXG4gIGNvbnN0IHJlZk5vZGUgPVxuICAgIHJlZlBhcnQgPT09IHVuZGVmaW5lZCA/IGNvbnRhaW5lclBhcnQuXyRlbmROb2RlIDogcmVmUGFydC5fJHN0YXJ0Tm9kZTtcblxuICBpZiAocGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3Qgc3RhcnROb2RlID0gd3JhcChjb250YWluZXIpLmluc2VydEJlZm9yZShjcmVhdGVNYXJrZXIoKSwgcmVmTm9kZSk7XG4gICAgY29uc3QgZW5kTm9kZSA9IHdyYXAoY29udGFpbmVyKS5pbnNlcnRCZWZvcmUoY3JlYXRlTWFya2VyKCksIHJlZk5vZGUpO1xuICAgIHBhcnQgPSBuZXcgQ2hpbGRQYXJ0KFxuICAgICAgc3RhcnROb2RlLFxuICAgICAgZW5kTm9kZSxcbiAgICAgIGNvbnRhaW5lclBhcnQsXG4gICAgICBjb250YWluZXJQYXJ0Lm9wdGlvbnNcbiAgICApO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGVuZE5vZGUgPSB3cmFwKHBhcnQuXyRlbmROb2RlISkubmV4dFNpYmxpbmc7XG4gICAgY29uc3Qgb2xkUGFyZW50ID0gcGFydC5fJHBhcmVudDtcbiAgICBjb25zdCBwYXJlbnRDaGFuZ2VkID0gb2xkUGFyZW50ICE9PSBjb250YWluZXJQYXJ0O1xuICAgIGlmIChwYXJlbnRDaGFuZ2VkKSB7XG4gICAgICBwYXJ0Ll8kcmVwYXJlbnREaXNjb25uZWN0YWJsZXM/Lihjb250YWluZXJQYXJ0KTtcbiAgICAgIC8vIE5vdGUgdGhhdCBhbHRob3VnaCBgXyRyZXBhcmVudERpc2Nvbm5lY3RhYmxlc2AgdXBkYXRlcyB0aGUgcGFydCdzXG4gICAgICAvLyBgXyRwYXJlbnRgIHJlZmVyZW5jZSBhZnRlciB1bmxpbmtpbmcgZnJvbSBpdHMgY3VycmVudCBwYXJlbnQsIHRoYXRcbiAgICAgIC8vIG1ldGhvZCBvbmx5IGV4aXN0cyBpZiBEaXNjb25uZWN0YWJsZXMgYXJlIHByZXNlbnQsIHNvIHdlIG5lZWQgdG9cbiAgICAgIC8vIHVuY29uZGl0aW9uYWxseSBzZXQgaXQgaGVyZVxuICAgICAgcGFydC5fJHBhcmVudCA9IGNvbnRhaW5lclBhcnQ7XG4gICAgICAvLyBTaW5jZSB0aGUgXyRpc0Nvbm5lY3RlZCBnZXR0ZXIgaXMgc29tZXdoYXQgY29zdGx5LCBvbmx5XG4gICAgICAvLyByZWFkIGl0IG9uY2Ugd2Uga25vdyB0aGUgc3VidHJlZSBoYXMgZGlyZWN0aXZlcyB0aGF0IG5lZWRcbiAgICAgIC8vIHRvIGJlIG5vdGlmaWVkXG4gICAgICBsZXQgbmV3Q29ubmVjdGlvblN0YXRlO1xuICAgICAgaWYgKFxuICAgICAgICBwYXJ0Ll8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAobmV3Q29ubmVjdGlvblN0YXRlID0gY29udGFpbmVyUGFydC5fJGlzQ29ubmVjdGVkKSAhPT1cbiAgICAgICAgICBvbGRQYXJlbnQhLl8kaXNDb25uZWN0ZWRcbiAgICAgICkge1xuICAgICAgICBwYXJ0Ll8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQobmV3Q29ubmVjdGlvblN0YXRlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGVuZE5vZGUgIT09IHJlZk5vZGUgfHwgcGFyZW50Q2hhbmdlZCkge1xuICAgICAgbGV0IHN0YXJ0OiBOb2RlIHwgbnVsbCA9IHBhcnQuXyRzdGFydE5vZGU7XG4gICAgICB3aGlsZSAoc3RhcnQgIT09IGVuZE5vZGUpIHtcbiAgICAgICAgY29uc3QgbjogTm9kZSB8IG51bGwgPSB3cmFwKHN0YXJ0ISkubmV4dFNpYmxpbmc7XG4gICAgICAgIHdyYXAoY29udGFpbmVyKS5pbnNlcnRCZWZvcmUoc3RhcnQhLCByZWZOb2RlKTtcbiAgICAgICAgc3RhcnQgPSBuO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwYXJ0O1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIFBhcnQuXG4gKlxuICogTm90ZSB0aGF0IHRoaXMgc2hvdWxkIG9ubHkgYmUgdXNlZCB0byBzZXQvdXBkYXRlIHRoZSB2YWx1ZSBvZiB1c2VyLWNyZWF0ZWRcbiAqIHBhcnRzIChpLmUuIHRob3NlIGNyZWF0ZWQgdXNpbmcgYGluc2VydFBhcnRgKTsgaXQgc2hvdWxkIG5vdCBiZSB1c2VkXG4gKiBieSBkaXJlY3RpdmVzIHRvIHNldCB0aGUgdmFsdWUgb2YgdGhlIGRpcmVjdGl2ZSdzIGNvbnRhaW5lciBwYXJ0LiBEaXJlY3RpdmVzXG4gKiBzaG91bGQgcmV0dXJuIGEgdmFsdWUgZnJvbSBgdXBkYXRlYC9gcmVuZGVyYCB0byB1cGRhdGUgdGhlaXIgcGFydCBzdGF0ZS5cbiAqXG4gKiBGb3IgZGlyZWN0aXZlcyB0aGF0IHJlcXVpcmUgc2V0dGluZyB0aGVpciBwYXJ0IHZhbHVlIGFzeW5jaHJvbm91c2x5LCB0aGV5XG4gKiBzaG91bGQgZXh0ZW5kIGBBc3luY0RpcmVjdGl2ZWAgYW5kIGNhbGwgYHRoaXMuc2V0VmFsdWUoKWAuXG4gKlxuICogQHBhcmFtIHBhcnQgUGFydCB0byBzZXRcbiAqIEBwYXJhbSB2YWx1ZSBWYWx1ZSB0byBzZXRcbiAqIEBwYXJhbSBpbmRleCBGb3IgYEF0dHJpYnV0ZVBhcnRgcywgdGhlIGluZGV4IHRvIHNldFxuICogQHBhcmFtIGRpcmVjdGl2ZVBhcmVudCBVc2VkIGludGVybmFsbHk7IHNob3VsZCBub3QgYmUgc2V0IGJ5IHVzZXJcbiAqL1xuZXhwb3J0IGNvbnN0IHNldENoaWxkUGFydFZhbHVlID0gPFQgZXh0ZW5kcyBDaGlsZFBhcnQ+KFxuICBwYXJ0OiBULFxuICB2YWx1ZTogdW5rbm93bixcbiAgZGlyZWN0aXZlUGFyZW50OiBEaXJlY3RpdmVQYXJlbnQgPSBwYXJ0XG4pOiBUID0+IHtcbiAgcGFydC5fJHNldFZhbHVlKHZhbHVlLCBkaXJlY3RpdmVQYXJlbnQpO1xuICByZXR1cm4gcGFydDtcbn07XG5cbi8vIEEgc2VudGluZWwgdmFsdWUgdGhhdCBjYW4gbmV2ZXIgYXBwZWFyIGFzIGEgcGFydCB2YWx1ZSBleGNlcHQgd2hlbiBzZXQgYnlcbi8vIGxpdmUoKS4gVXNlZCB0byBmb3JjZSBhIGRpcnR5LWNoZWNrIHRvIGZhaWwgYW5kIGNhdXNlIGEgcmUtcmVuZGVyLlxuY29uc3QgUkVTRVRfVkFMVUUgPSB7fTtcblxuLyoqXG4gKiBTZXRzIHRoZSBjb21taXR0ZWQgdmFsdWUgb2YgYSBDaGlsZFBhcnQgZGlyZWN0bHkgd2l0aG91dCB0cmlnZ2VyaW5nIHRoZVxuICogY29tbWl0IHN0YWdlIG9mIHRoZSBwYXJ0LlxuICpcbiAqIFRoaXMgaXMgdXNlZnVsIGluIGNhc2VzIHdoZXJlIGEgZGlyZWN0aXZlIG5lZWRzIHRvIHVwZGF0ZSB0aGUgcGFydCBzdWNoXG4gKiB0aGF0IHRoZSBuZXh0IHVwZGF0ZSBkZXRlY3RzIGEgdmFsdWUgY2hhbmdlIG9yIG5vdC4gV2hlbiB2YWx1ZSBpcyBvbWl0dGVkLFxuICogdGhlIG5leHQgdXBkYXRlIHdpbGwgYmUgZ3VhcmFudGVlZCB0byBiZSBkZXRlY3RlZCBhcyBhIGNoYW5nZS5cbiAqXG4gKiBAcGFyYW0gcGFydFxuICogQHBhcmFtIHZhbHVlXG4gKi9cbmV4cG9ydCBjb25zdCBzZXRDb21taXR0ZWRWYWx1ZSA9IChwYXJ0OiBQYXJ0LCB2YWx1ZTogdW5rbm93biA9IFJFU0VUX1ZBTFVFKSA9PlxuICAocGFydC5fJGNvbW1pdHRlZFZhbHVlID0gdmFsdWUpO1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGNvbW1pdHRlZCB2YWx1ZSBvZiBhIENoaWxkUGFydC5cbiAqXG4gKiBUaGUgY29tbWl0dGVkIHZhbHVlIGlzIHVzZWQgZm9yIGNoYW5nZSBkZXRlY3Rpb24gYW5kIGVmZmljaWVudCB1cGRhdGVzIG9mXG4gKiB0aGUgcGFydC4gSXQgY2FuIGRpZmZlciBmcm9tIHRoZSB2YWx1ZSBzZXQgYnkgdGhlIHRlbXBsYXRlIG9yIGRpcmVjdGl2ZSBpblxuICogY2FzZXMgd2hlcmUgdGhlIHRlbXBsYXRlIHZhbHVlIGlzIHRyYW5zZm9ybWVkIGJlZm9yZSBiZWluZyBjb21taXR0ZWQuXG4gKlxuICogLSBgVGVtcGxhdGVSZXN1bHRgcyBhcmUgY29tbWl0dGVkIGFzIGEgYFRlbXBsYXRlSW5zdGFuY2VgXG4gKiAtIEl0ZXJhYmxlcyBhcmUgY29tbWl0dGVkIGFzIGBBcnJheTxDaGlsZFBhcnQ+YFxuICogLSBBbGwgb3RoZXIgdHlwZXMgYXJlIGNvbW1pdHRlZCBhcyB0aGUgdGVtcGxhdGUgdmFsdWUgb3IgdmFsdWUgcmV0dXJuZWQgb3JcbiAqICAgc2V0IGJ5IGEgZGlyZWN0aXZlLlxuICpcbiAqIEBwYXJhbSBwYXJ0XG4gKi9cbmV4cG9ydCBjb25zdCBnZXRDb21taXR0ZWRWYWx1ZSA9IChwYXJ0OiBDaGlsZFBhcnQpID0+IHBhcnQuXyRjb21taXR0ZWRWYWx1ZTtcblxuLyoqXG4gKiBSZW1vdmVzIGEgQ2hpbGRQYXJ0IGZyb20gdGhlIERPTSwgaW5jbHVkaW5nIGFueSBvZiBpdHMgY29udGVudCBhbmQgbWFya2Vycy5cbiAqXG4gKiBOb3RlOiBUaGUgb25seSBkaWZmZXJlbmNlIGJldHdlZW4gdGhpcyBhbmQgY2xlYXJQYXJ0KCkgaXMgdGhhdCB0aGlzIGFsc29cbiAqIHJlbW92ZXMgdGhlIHBhcnQncyBzdGFydCBub2RlLiBUaGlzIG1lYW5zIHRoYXQgdGhlIENoaWxkUGFydCBtdXN0IG93biBpdHNcbiAqIHN0YXJ0IG5vZGUsIGllIGl0IG11c3QgYmUgYSBtYXJrZXIgbm9kZSBzcGVjaWZpY2FsbHkgZm9yIHRoaXMgcGFydCBhbmQgbm90IGFuXG4gKiBhbmNob3IgZnJvbSBzdXJyb3VuZGluZyBjb250ZW50LlxuICpcbiAqIEBwYXJhbSBwYXJ0IFRoZSBQYXJ0IHRvIHJlbW92ZVxuICovXG5leHBvcnQgY29uc3QgcmVtb3ZlUGFydCA9IChwYXJ0OiBDaGlsZFBhcnQpID0+IHtcbiAgcGFydC5fJGNsZWFyKCk7XG4gIHBhcnQuXyRzdGFydE5vZGUucmVtb3ZlKCk7XG59O1xuXG5leHBvcnQgY29uc3QgY2xlYXJQYXJ0ID0gKHBhcnQ6IENoaWxkUGFydCkgPT4ge1xuICBwYXJ0Ll8kY2xlYXIoKTtcbn07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLyoqXG4gKiBPdmVydmlldzpcbiAqXG4gKiBUaGlzIG1vZHVsZSBpcyBkZXNpZ25lZCB0byBhZGQgc3VwcG9ydCBmb3IgYW4gYXN5bmMgYHNldFZhbHVlYCBBUEkgYW5kXG4gKiBgZGlzY29ubmVjdGVkYCBjYWxsYmFjayB0byBkaXJlY3RpdmVzIHdpdGggdGhlIGxlYXN0IGltcGFjdCBvbiB0aGUgY29yZVxuICogcnVudGltZSBvciBwYXlsb2FkIHdoZW4gdGhhdCBmZWF0dXJlIGlzIG5vdCB1c2VkLlxuICpcbiAqIFRoZSBzdHJhdGVneSBpcyB0byBpbnRyb2R1Y2UgYSBgQXN5bmNEaXJlY3RpdmVgIHN1YmNsYXNzIG9mXG4gKiBgRGlyZWN0aXZlYCB0aGF0IGNsaW1icyB0aGUgXCJwYXJlbnRcIiB0cmVlIGluIGl0cyBjb25zdHJ1Y3RvciB0byBub3RlIHdoaWNoXG4gKiBicmFuY2hlcyBvZiBsaXQtaHRtbCdzIFwibG9naWNhbCB0cmVlXCIgb2YgZGF0YSBzdHJ1Y3R1cmVzIGNvbnRhaW4gc3VjaFxuICogZGlyZWN0aXZlcyBhbmQgdGh1cyBuZWVkIHRvIGJlIGNyYXdsZWQgd2hlbiBhIHN1YnRyZWUgaXMgYmVpbmcgY2xlYXJlZCAob3JcbiAqIG1hbnVhbGx5IGRpc2Nvbm5lY3RlZCkgaW4gb3JkZXIgdG8gcnVuIHRoZSBgZGlzY29ubmVjdGVkYCBjYWxsYmFjay5cbiAqXG4gKiBUaGUgXCJub2Rlc1wiIG9mIHRoZSBsb2dpY2FsIHRyZWUgaW5jbHVkZSBQYXJ0cywgVGVtcGxhdGVJbnN0YW5jZXMgKGZvciB3aGVuIGFcbiAqIFRlbXBsYXRlUmVzdWx0IGlzIGNvbW1pdHRlZCB0byBhIHZhbHVlIG9mIGEgQ2hpbGRQYXJ0KSwgYW5kIERpcmVjdGl2ZXM7IHRoZXNlXG4gKiBhbGwgaW1wbGVtZW50IGEgY29tbW9uIGludGVyZmFjZSBjYWxsZWQgYERpc2Nvbm5lY3RhYmxlQ2hpbGRgLiBFYWNoIGhhcyBhXG4gKiBgXyRwYXJlbnRgIHJlZmVyZW5jZSB3aGljaCBpcyBzZXQgZHVyaW5nIGNvbnN0cnVjdGlvbiBpbiB0aGUgY29yZSBjb2RlLCBhbmQgYVxuICogYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAgZmllbGQgd2hpY2ggaXMgaW5pdGlhbGx5IHVuZGVmaW5lZC5cbiAqXG4gKiBUaGUgc3BhcnNlIHRyZWUgY3JlYXRlZCBieSBtZWFucyBvZiB0aGUgYEFzeW5jRGlyZWN0aXZlYCBjb25zdHJ1Y3RvclxuICogY3Jhd2xpbmcgdXAgdGhlIGBfJHBhcmVudGAgdHJlZSBhbmQgcGxhY2luZyBhIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gIFNldFxuICogb24gZWFjaCBwYXJlbnQgdGhhdCBpbmNsdWRlcyBlYWNoIGNoaWxkIHRoYXQgY29udGFpbnMgYVxuICogYEFzeW5jRGlyZWN0aXZlYCBkaXJlY3RseSBvciB0cmFuc2l0aXZlbHkgdmlhIGl0cyBjaGlsZHJlbi4gSW4gb3JkZXIgdG9cbiAqIG5vdGlmeSBjb25uZWN0aW9uIHN0YXRlIGNoYW5nZXMgYW5kIGRpc2Nvbm5lY3QgKG9yIHJlY29ubmVjdCkgYSB0cmVlLCB0aGVcbiAqIGBfJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkYCBBUEkgaXMgcGF0Y2hlZCBvbnRvIENoaWxkUGFydHMgYXMgYSBkaXJlY3RpdmVcbiAqIGNsaW1icyB0aGUgcGFyZW50IHRyZWUsIHdoaWNoIGlzIGNhbGxlZCBieSB0aGUgY29yZSB3aGVuIGNsZWFyaW5nIGEgcGFydCBpZlxuICogaXQgZXhpc3RzLiBXaGVuIGNhbGxlZCwgdGhhdCBtZXRob2QgaXRlcmF0ZXMgb3ZlciB0aGUgc3BhcnNlIHRyZWUgb2ZcbiAqIFNldDxEaXNjb25uZWN0YWJsZUNoaWxkcmVuPiBidWlsdCB1cCBieSBBc3luY0RpcmVjdGl2ZXMsIGFuZCBjYWxsc1xuICogYF8kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWRgIG9uIGFueSBkaXJlY3RpdmVzIHRoYXQgYXJlIGVuY291bnRlcmVkXG4gKiBpbiB0aGF0IHRyZWUsIHJ1bm5pbmcgdGhlIHJlcXVpcmVkIGNhbGxiYWNrcy5cbiAqXG4gKiBBIGdpdmVuIFwibG9naWNhbCB0cmVlXCIgb2YgbGl0LWh0bWwgZGF0YS1zdHJ1Y3R1cmVzIG1pZ2h0IGxvb2sgbGlrZSB0aGlzOlxuICpcbiAqICBDaGlsZFBhcnQoTjEpIF8kZEM9W0QyLFQzXVxuICogICAuX2RpcmVjdGl2ZVxuICogICAgIEFzeW5jRGlyZWN0aXZlKEQyKVxuICogICAuX3ZhbHVlIC8vIHVzZXIgdmFsdWUgd2FzIFRlbXBsYXRlUmVzdWx0XG4gKiAgICAgVGVtcGxhdGVJbnN0YW5jZShUMykgXyRkQz1bQTQsQTYsTjEwLE4xMl1cbiAqICAgICAgLl8kcGFydHNbXVxuICogICAgICAgIEF0dHJpYnV0ZVBhcnQoQTQpIF8kZEM9W0Q1XVxuICogICAgICAgICAuX2RpcmVjdGl2ZXNbXVxuICogICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQ1KVxuICogICAgICAgIEF0dHJpYnV0ZVBhcnQoQTYpIF8kZEM9W0Q3LEQ4XVxuICogICAgICAgICAuX2RpcmVjdGl2ZXNbXVxuICogICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQ3KVxuICogICAgICAgICAgIERpcmVjdGl2ZShEOCkgXyRkQz1bRDldXG4gKiAgICAgICAgICAgIC5fZGlyZWN0aXZlXG4gKiAgICAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDkpXG4gKiAgICAgICAgQ2hpbGRQYXJ0KE4xMCkgXyRkQz1bRDExXVxuICogICAgICAgICAuX2RpcmVjdGl2ZVxuICogICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQxMSlcbiAqICAgICAgICAgLl92YWx1ZVxuICogICAgICAgICAgIHN0cmluZ1xuICogICAgICAgIENoaWxkUGFydChOMTIpIF8kZEM9W0QxMyxOMTQsTjE2XVxuICogICAgICAgICAuX2RpcmVjdGl2ZVxuICogICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQxMylcbiAqICAgICAgICAgLl92YWx1ZSAvLyB1c2VyIHZhbHVlIHdhcyBpdGVyYWJsZVxuICogICAgICAgICAgIEFycmF5PENoaWxkUGFydD5cbiAqICAgICAgICAgICAgIENoaWxkUGFydChOMTQpIF8kZEM9W0QxNV1cbiAqICAgICAgICAgICAgICAuX3ZhbHVlXG4gKiAgICAgICAgICAgICAgICBzdHJpbmdcbiAqICAgICAgICAgICAgIENoaWxkUGFydChOMTYpIF8kZEM9W0QxNyxUMThdXG4gKiAgICAgICAgICAgICAgLl9kaXJlY3RpdmVcbiAqICAgICAgICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQxNylcbiAqICAgICAgICAgICAgICAuX3ZhbHVlIC8vIHVzZXIgdmFsdWUgd2FzIFRlbXBsYXRlUmVzdWx0XG4gKiAgICAgICAgICAgICAgICBUZW1wbGF0ZUluc3RhbmNlKFQxOCkgXyRkQz1bQTE5LEEyMSxOMjVdXG4gKiAgICAgICAgICAgICAgICAgLl8kcGFydHNbXVxuICogICAgICAgICAgICAgICAgICAgQXR0cmlidXRlUGFydChBMTkpIF8kZEM9W0QyMF1cbiAqICAgICAgICAgICAgICAgICAgICAuX2RpcmVjdGl2ZXNbXVxuICogICAgICAgICAgICAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDIwKVxuICogICAgICAgICAgICAgICAgICAgQXR0cmlidXRlUGFydChBMjEpIF8kZEM9WzIyLDIzXVxuICogICAgICAgICAgICAgICAgICAgIC5fZGlyZWN0aXZlc1tdXG4gKiAgICAgICAgICAgICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEMjIpXG4gKiAgICAgICAgICAgICAgICAgICAgICBEaXJlY3RpdmUoRDIzKSBfJGRDPVtEMjRdXG4gKiAgICAgICAgICAgICAgICAgICAgICAgLl9kaXJlY3RpdmVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQyNClcbiAqICAgICAgICAgICAgICAgICAgIENoaWxkUGFydChOMjUpIF8kZEM9W0QyNl1cbiAqICAgICAgICAgICAgICAgICAgICAuX2RpcmVjdGl2ZVxuICogICAgICAgICAgICAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDI2KVxuICogICAgICAgICAgICAgICAgICAgIC5fdmFsdWVcbiAqICAgICAgICAgICAgICAgICAgICAgIHN0cmluZ1xuICpcbiAqIEV4YW1wbGUgMTogVGhlIGRpcmVjdGl2ZSBpbiBDaGlsZFBhcnQoTjEyKSB1cGRhdGVzIGFuZCByZXR1cm5zIGBub3RoaW5nYC4gVGhlXG4gKiBDaGlsZFBhcnQgd2lsbCBfY2xlYXIoKSBpdHNlbGYsIGFuZCBzbyB3ZSBuZWVkIHRvIGRpc2Nvbm5lY3QgdGhlIFwidmFsdWVcIiBvZlxuICogdGhlIENoaWxkUGFydCAoYnV0IG5vdCBpdHMgZGlyZWN0aXZlKS4gSW4gdGhpcyBjYXNlLCB3aGVuIGBfY2xlYXIoKWAgY2FsbHNcbiAqIGBfJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkKClgLCB3ZSBkb24ndCBpdGVyYXRlIGFsbCBvZiB0aGVcbiAqIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbiwgcmF0aGVyIHdlIGRvIGEgdmFsdWUtc3BlY2lmaWMgZGlzY29ubmVjdGlvbjogaS5lLlxuICogc2luY2UgdGhlIF92YWx1ZSB3YXMgYW4gQXJyYXk8Q2hpbGRQYXJ0PiAoYmVjYXVzZSBhbiBpdGVyYWJsZSBoYWQgYmVlblxuICogY29tbWl0dGVkKSwgd2UgaXRlcmF0ZSB0aGUgYXJyYXkgb2YgQ2hpbGRQYXJ0cyAoTjE0LCBOMTYpIGFuZCBydW5cbiAqIGBzZXRDb25uZWN0ZWRgIG9uIHRoZW0gKHdoaWNoIGRvZXMgcmVjdXJzZSBkb3duIHRoZSBmdWxsIHRyZWUgb2ZcbiAqIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gIGJlbG93IGl0LCBhbmQgYWxzbyByZW1vdmVzIE4xNCBhbmQgTjE2IGZyb20gTjEyJ3NcbiAqIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gKS4gT25jZSB0aGUgdmFsdWVzIGhhdmUgYmVlbiBkaXNjb25uZWN0ZWQsIHdlIHRoZW5cbiAqIGNoZWNrIHdoZXRoZXIgdGhlIENoaWxkUGFydChOMTIpJ3MgbGlzdCBvZiBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCBpcyBlbXB0eVxuICogKGFuZCB3b3VsZCByZW1vdmUgaXQgZnJvbSBpdHMgcGFyZW50IFRlbXBsYXRlSW5zdGFuY2UoVDMpIGlmIHNvKSwgYnV0IHNpbmNlXG4gKiBpdCB3b3VsZCBzdGlsbCBjb250YWluIGl0cyBkaXJlY3RpdmUgRDEzLCBpdCBzdGF5cyBpbiB0aGUgZGlzY29ubmVjdGFibGVcbiAqIHRyZWUuXG4gKlxuICogRXhhbXBsZSAyOiBJbiB0aGUgY291cnNlIG9mIEV4YW1wbGUgMSwgYHNldENvbm5lY3RlZGAgd2lsbCByZWFjaFxuICogQ2hpbGRQYXJ0KE4xNik7IGluIHRoaXMgY2FzZSB0aGUgZW50aXJlIHBhcnQgaXMgYmVpbmcgZGlzY29ubmVjdGVkLCBzbyB3ZVxuICogc2ltcGx5IGl0ZXJhdGUgYWxsIG9mIE4xNidzIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gIChEMTcsVDE4KSBhbmRcbiAqIHJlY3Vyc2l2ZWx5IHJ1biBgc2V0Q29ubmVjdGVkYCBvbiB0aGVtLiBOb3RlIHRoYXQgd2Ugb25seSByZW1vdmUgY2hpbGRyZW5cbiAqIGZyb20gYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAgZm9yIHRoZSB0b3AtbGV2ZWwgdmFsdWVzIGJlaW5nIGRpc2Nvbm5lY3RlZFxuICogb24gYSBjbGVhcjsgZG9pbmcgdGhpcyBib29ra2VlcGluZyBsb3dlciBpbiB0aGUgdHJlZSBpcyB3YXN0ZWZ1bCBzaW5jZSBpdCdzXG4gKiBhbGwgYmVpbmcgdGhyb3duIGF3YXkuXG4gKlxuICogRXhhbXBsZSAzOiBJZiB0aGUgTGl0RWxlbWVudCBjb250YWluaW5nIHRoZSBlbnRpcmUgdHJlZSBhYm92ZSBiZWNvbWVzXG4gKiBkaXNjb25uZWN0ZWQsIGl0IHdpbGwgcnVuIGBjaGlsZFBhcnQuc2V0Q29ubmVjdGVkKClgICh3aGljaCBjYWxsc1xuICogYGNoaWxkUGFydC5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkKClgIGlmIGl0IGV4aXN0cyk7IGluIHRoaXMgY2FzZSwgd2VcbiAqIHJlY3Vyc2l2ZWx5IHJ1biBgc2V0Q29ubmVjdGVkKClgIG92ZXIgdGhlIGVudGlyZSB0cmVlLCB3aXRob3V0IHJlbW92aW5nIGFueVxuICogY2hpbGRyZW4gZnJvbSBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCwgc2luY2UgdGhpcyB0cmVlIGlzIHJlcXVpcmVkIHRvXG4gKiByZS1jb25uZWN0IHRoZSB0cmVlLCB3aGljaCBkb2VzIHRoZSBzYW1lIG9wZXJhdGlvbiwgc2ltcGx5IHBhc3NpbmdcbiAqIGBpc0Nvbm5lY3RlZDogdHJ1ZWAgZG93biB0aGUgdHJlZSwgc2lnbmFsaW5nIHdoaWNoIGNhbGxiYWNrIHRvIHJ1bi5cbiAqL1xuXG5pbXBvcnQge0F0dHJpYnV0ZVBhcnQsIENoaWxkUGFydCwgRGlzY29ubmVjdGFibGUsIFBhcnR9IGZyb20gJy4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtpc1NpbmdsZUV4cHJlc3Npb259IGZyb20gJy4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuaW1wb3J0IHtEaXJlY3RpdmUsIFBhcnRJbmZvLCBQYXJ0VHlwZX0gZnJvbSAnLi9kaXJlY3RpdmUuanMnO1xuZXhwb3J0ICogZnJvbSAnLi9kaXJlY3RpdmUuanMnO1xuXG5jb25zdCBERVZfTU9ERSA9IHRydWU7XG5cbi8qKlxuICogUmVjdXJzaXZlbHkgd2Fsa3MgZG93biB0aGUgdHJlZSBvZiBQYXJ0cy9UZW1wbGF0ZUluc3RhbmNlcy9EaXJlY3RpdmVzIHRvIHNldFxuICogdGhlIGNvbm5lY3RlZCBzdGF0ZSBvZiBkaXJlY3RpdmVzIGFuZCBydW4gYGRpc2Nvbm5lY3RlZGAvIGByZWNvbm5lY3RlZGBcbiAqIGNhbGxiYWNrcy5cbiAqXG4gKiBAcmV0dXJuIFRydWUgaWYgdGhlcmUgd2VyZSBjaGlsZHJlbiB0byBkaXNjb25uZWN0OyBmYWxzZSBvdGhlcndpc2VcbiAqL1xuY29uc3Qgbm90aWZ5Q2hpbGRyZW5Db25uZWN0ZWRDaGFuZ2VkID0gKFxuICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICBpc0Nvbm5lY3RlZDogYm9vbGVhblxuKTogYm9vbGVhbiA9PiB7XG4gIGNvbnN0IGNoaWxkcmVuID0gcGFyZW50Ll8kZGlzY29ubmVjdGFibGVDaGlsZHJlbjtcbiAgaWYgKGNoaWxkcmVuID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgZm9yIChjb25zdCBvYmogb2YgY2hpbGRyZW4pIHtcbiAgICAvLyBUaGUgZXhpc3RlbmNlIG9mIGBfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkYCBpcyB1c2VkIGFzIGEgXCJicmFuZFwiIHRvXG4gICAgLy8gZGlzYW1iaWd1YXRlIEFzeW5jRGlyZWN0aXZlcyBmcm9tIG90aGVyIERpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5cbiAgICAvLyAoYXMgb3Bwb3NlZCB0byB1c2luZyBhbiBpbnN0YW5jZW9mIGNoZWNrIHRvIGtub3cgd2hlbiB0byBjYWxsIGl0KTsgdGhlXG4gICAgLy8gcmVkdW5kYW5jeSBvZiBcIkRpcmVjdGl2ZVwiIGluIHRoZSBBUEkgbmFtZSBpcyB0byBhdm9pZCBjb25mbGljdGluZyB3aXRoXG4gICAgLy8gYF8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWRgLCB3aGljaCBleGlzdHMgYENoaWxkUGFydHNgIHdoaWNoIGFyZSBhbHNvIGluXG4gICAgLy8gdGhpcyBsaXN0XG4gICAgLy8gRGlzY29ubmVjdCBEaXJlY3RpdmUgKGFuZCBhbnkgbmVzdGVkIGRpcmVjdGl2ZXMgY29udGFpbmVkIHdpdGhpbilcbiAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIChvYmogYXMgQXN5bmNEaXJlY3RpdmUpWydfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkJ10/LihcbiAgICAgIGlzQ29ubmVjdGVkLFxuICAgICAgZmFsc2VcbiAgICApO1xuICAgIC8vIERpc2Nvbm5lY3QgUGFydC9UZW1wbGF0ZUluc3RhbmNlXG4gICAgbm90aWZ5Q2hpbGRyZW5Db25uZWN0ZWRDaGFuZ2VkKG9iaiwgaXNDb25uZWN0ZWQpO1xuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIHRoZSBnaXZlbiBjaGlsZCBmcm9tIGl0cyBwYXJlbnQgbGlzdCBvZiBkaXNjb25uZWN0YWJsZSBjaGlsZHJlbiwgYW5kXG4gKiBpZiB0aGUgcGFyZW50IGxpc3QgYmVjb21lcyBlbXB0eSBhcyBhIHJlc3VsdCwgcmVtb3ZlcyB0aGUgcGFyZW50IGZyb20gaXRzXG4gKiBwYXJlbnQsIGFuZCBzbyBmb3J0aCB1cCB0aGUgdHJlZSB3aGVuIHRoYXQgY2F1c2VzIHN1YnNlcXVlbnQgcGFyZW50IGxpc3RzIHRvXG4gKiBiZWNvbWUgZW1wdHkuXG4gKi9cbmNvbnN0IHJlbW92ZURpc2Nvbm5lY3RhYmxlRnJvbVBhcmVudCA9IChvYmo6IERpc2Nvbm5lY3RhYmxlKSA9PiB7XG4gIGxldCBwYXJlbnQsIGNoaWxkcmVuO1xuICBkbyB7XG4gICAgaWYgKChwYXJlbnQgPSBvYmouXyRwYXJlbnQpID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjaGlsZHJlbiA9IHBhcmVudC5fJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4hO1xuICAgIGNoaWxkcmVuLmRlbGV0ZShvYmopO1xuICAgIG9iaiA9IHBhcmVudDtcbiAgfSB3aGlsZSAoY2hpbGRyZW4/LnNpemUgPT09IDApO1xufTtcblxuY29uc3QgYWRkRGlzY29ubmVjdGFibGVUb1BhcmVudCA9IChvYmo6IERpc2Nvbm5lY3RhYmxlKSA9PiB7XG4gIC8vIENsaW1iIHRoZSBwYXJlbnQgdHJlZSwgY3JlYXRpbmcgYSBzcGFyc2UgdHJlZSBvZiBjaGlsZHJlbiBuZWVkaW5nXG4gIC8vIGRpc2Nvbm5lY3Rpb25cbiAgZm9yIChsZXQgcGFyZW50OyAocGFyZW50ID0gb2JqLl8kcGFyZW50KTsgb2JqID0gcGFyZW50KSB7XG4gICAgbGV0IGNoaWxkcmVuID0gcGFyZW50Ll8kZGlzY29ubmVjdGFibGVDaGlsZHJlbjtcbiAgICBpZiAoY2hpbGRyZW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcGFyZW50Ll8kZGlzY29ubmVjdGFibGVDaGlsZHJlbiA9IGNoaWxkcmVuID0gbmV3IFNldCgpO1xuICAgIH0gZWxzZSBpZiAoY2hpbGRyZW4uaGFzKG9iaikpIHtcbiAgICAgIC8vIE9uY2Ugd2UndmUgcmVhY2hlZCBhIHBhcmVudCB0aGF0IGFscmVhZHkgY29udGFpbnMgdGhpcyBjaGlsZCwgd2VcbiAgICAgIC8vIGNhbiBzaG9ydC1jaXJjdWl0XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY2hpbGRyZW4uYWRkKG9iaik7XG4gICAgaW5zdGFsbERpc2Nvbm5lY3RBUEkocGFyZW50KTtcbiAgfVxufTtcblxuLyoqXG4gKiBDaGFuZ2VzIHRoZSBwYXJlbnQgcmVmZXJlbmNlIG9mIHRoZSBDaGlsZFBhcnQsIGFuZCB1cGRhdGVzIHRoZSBzcGFyc2UgdHJlZSBvZlxuICogRGlzY29ubmVjdGFibGUgY2hpbGRyZW4gYWNjb3JkaW5nbHkuXG4gKlxuICogTm90ZSwgdGhpcyBtZXRob2Qgd2lsbCBiZSBwYXRjaGVkIG9udG8gQ2hpbGRQYXJ0IGluc3RhbmNlcyBhbmQgY2FsbGVkIGZyb21cbiAqIHRoZSBjb3JlIGNvZGUgd2hlbiBwYXJ0cyBhcmUgbW92ZWQgYmV0d2VlbiBkaWZmZXJlbnQgcGFyZW50cy5cbiAqL1xuZnVuY3Rpb24gcmVwYXJlbnREaXNjb25uZWN0YWJsZXModGhpczogQ2hpbGRQYXJ0LCBuZXdQYXJlbnQ6IERpc2Nvbm5lY3RhYmxlKSB7XG4gIGlmICh0aGlzLl8kZGlzY29ubmVjdGFibGVDaGlsZHJlbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmVtb3ZlRGlzY29ubmVjdGFibGVGcm9tUGFyZW50KHRoaXMpO1xuICAgIHRoaXMuXyRwYXJlbnQgPSBuZXdQYXJlbnQ7XG4gICAgYWRkRGlzY29ubmVjdGFibGVUb1BhcmVudCh0aGlzKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLl8kcGFyZW50ID0gbmV3UGFyZW50O1xuICB9XG59XG5cbi8qKlxuICogU2V0cyB0aGUgY29ubmVjdGVkIHN0YXRlIG9uIGFueSBkaXJlY3RpdmVzIGNvbnRhaW5lZCB3aXRoaW4gdGhlIGNvbW1pdHRlZFxuICogdmFsdWUgb2YgdGhpcyBwYXJ0IChpLmUuIHdpdGhpbiBhIFRlbXBsYXRlSW5zdGFuY2Ugb3IgaXRlcmFibGUgb2ZcbiAqIENoaWxkUGFydHMpIGFuZCBydW5zIHRoZWlyIGBkaXNjb25uZWN0ZWRgL2ByZWNvbm5lY3RlZGBzLCBhcyB3ZWxsIGFzIHdpdGhpblxuICogYW55IGRpcmVjdGl2ZXMgc3RvcmVkIG9uIHRoZSBDaGlsZFBhcnQgKHdoZW4gYHZhbHVlT25seWAgaXMgZmFsc2UpLlxuICpcbiAqIGBpc0NsZWFyaW5nVmFsdWVgIHNob3VsZCBiZSBwYXNzZWQgYXMgYHRydWVgIG9uIGEgdG9wLWxldmVsIHBhcnQgdGhhdCBpc1xuICogY2xlYXJpbmcgaXRzZWxmLCBhbmQgbm90IGFzIGEgcmVzdWx0IG9mIHJlY3Vyc2l2ZWx5IGRpc2Nvbm5lY3RpbmcgZGlyZWN0aXZlc1xuICogYXMgcGFydCBvZiBhIGBjbGVhcmAgb3BlcmF0aW9uIGhpZ2hlciB1cCB0aGUgdHJlZS4gVGhpcyBib3RoIGVuc3VyZXMgdGhhdCBhbnlcbiAqIGRpcmVjdGl2ZSBvbiB0aGlzIENoaWxkUGFydCB0aGF0IHByb2R1Y2VkIGEgdmFsdWUgdGhhdCBjYXVzZWQgdGhlIGNsZWFyXG4gKiBvcGVyYXRpb24gaXMgbm90IGRpc2Nvbm5lY3RlZCwgYW5kIGFsc28gc2VydmVzIGFzIGEgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uXG4gKiB0byBhdm9pZCBuZWVkbGVzcyBib29ra2VlcGluZyB3aGVuIGEgc3VidHJlZSBpcyBnb2luZyBhd2F5OyB3aGVuIGNsZWFyaW5nIGFcbiAqIHN1YnRyZWUsIG9ubHkgdGhlIHRvcC1tb3N0IHBhcnQgbmVlZCB0byByZW1vdmUgaXRzZWxmIGZyb20gdGhlIHBhcmVudC5cbiAqXG4gKiBgZnJvbVBhcnRJbmRleGAgaXMgcGFzc2VkIG9ubHkgaW4gdGhlIGNhc2Ugb2YgYSBwYXJ0aWFsIGBfY2xlYXJgIHJ1bm5pbmcgYXMgYVxuICogcmVzdWx0IG9mIHRydW5jYXRpbmcgYW4gaXRlcmFibGUuXG4gKlxuICogTm90ZSwgdGhpcyBtZXRob2Qgd2lsbCBiZSBwYXRjaGVkIG9udG8gQ2hpbGRQYXJ0IGluc3RhbmNlcyBhbmQgY2FsbGVkIGZyb20gdGhlXG4gKiBjb3JlIGNvZGUgd2hlbiBwYXJ0cyBhcmUgY2xlYXJlZCBvciB0aGUgY29ubmVjdGlvbiBzdGF0ZSBpcyBjaGFuZ2VkIGJ5IHRoZVxuICogdXNlci5cbiAqL1xuZnVuY3Rpb24gbm90aWZ5Q2hpbGRQYXJ0Q29ubmVjdGVkQ2hhbmdlZChcbiAgdGhpczogQ2hpbGRQYXJ0LFxuICBpc0Nvbm5lY3RlZDogYm9vbGVhbixcbiAgaXNDbGVhcmluZ1ZhbHVlID0gZmFsc2UsXG4gIGZyb21QYXJ0SW5kZXggPSAwXG4pIHtcbiAgY29uc3QgdmFsdWUgPSB0aGlzLl8kY29tbWl0dGVkVmFsdWU7XG4gIGNvbnN0IGNoaWxkcmVuID0gdGhpcy5fJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW47XG4gIGlmIChjaGlsZHJlbiA9PT0gdW5kZWZpbmVkIHx8IGNoaWxkcmVuLnNpemUgPT09IDApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKGlzQ2xlYXJpbmdWYWx1ZSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgLy8gSXRlcmFibGUgY2FzZTogQW55IENoaWxkUGFydHMgY3JlYXRlZCBieSB0aGUgaXRlcmFibGUgc2hvdWxkIGJlXG4gICAgICAvLyBkaXNjb25uZWN0ZWQgYW5kIHJlbW92ZWQgZnJvbSB0aGlzIENoaWxkUGFydCdzIGRpc2Nvbm5lY3RhYmxlXG4gICAgICAvLyBjaGlsZHJlbiAoc3RhcnRpbmcgYXQgYGZyb21QYXJ0SW5kZXhgIGluIHRoZSBjYXNlIG9mIHRydW5jYXRpb24pXG4gICAgICBmb3IgKGxldCBpID0gZnJvbVBhcnRJbmRleDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5vdGlmeUNoaWxkcmVuQ29ubmVjdGVkQ2hhbmdlZCh2YWx1ZVtpXSwgZmFsc2UpO1xuICAgICAgICByZW1vdmVEaXNjb25uZWN0YWJsZUZyb21QYXJlbnQodmFsdWVbaV0pO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgLy8gVGVtcGxhdGVJbnN0YW5jZSBjYXNlOiBJZiB0aGUgdmFsdWUgaGFzIGRpc2Nvbm5lY3RhYmxlIGNoaWxkcmVuICh3aWxsXG4gICAgICAvLyBvbmx5IGJlIGluIHRoZSBjYXNlIHRoYXQgaXQgaXMgYSBUZW1wbGF0ZUluc3RhbmNlKSwgd2UgZGlzY29ubmVjdCBpdFxuICAgICAgLy8gYW5kIHJlbW92ZSBpdCBmcm9tIHRoaXMgQ2hpbGRQYXJ0J3MgZGlzY29ubmVjdGFibGUgY2hpbGRyZW5cbiAgICAgIG5vdGlmeUNoaWxkcmVuQ29ubmVjdGVkQ2hhbmdlZCh2YWx1ZSBhcyBEaXNjb25uZWN0YWJsZSwgZmFsc2UpO1xuICAgICAgcmVtb3ZlRGlzY29ubmVjdGFibGVGcm9tUGFyZW50KHZhbHVlIGFzIERpc2Nvbm5lY3RhYmxlKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbm90aWZ5Q2hpbGRyZW5Db25uZWN0ZWRDaGFuZ2VkKHRoaXMsIGlzQ29ubmVjdGVkKTtcbiAgfVxufVxuXG4vKipcbiAqIFBhdGNoZXMgZGlzY29ubmVjdGlvbiBBUEkgb250byBDaGlsZFBhcnRzLlxuICovXG5jb25zdCBpbnN0YWxsRGlzY29ubmVjdEFQSSA9IChvYmo6IERpc2Nvbm5lY3RhYmxlKSA9PiB7XG4gIGlmICgob2JqIGFzIENoaWxkUGFydCkudHlwZSA9PSBQYXJ0VHlwZS5DSElMRCkge1xuICAgIChvYmogYXMgQ2hpbGRQYXJ0KS5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkID8/PVxuICAgICAgbm90aWZ5Q2hpbGRQYXJ0Q29ubmVjdGVkQ2hhbmdlZDtcbiAgICAob2JqIGFzIENoaWxkUGFydCkuXyRyZXBhcmVudERpc2Nvbm5lY3RhYmxlcyA/Pz0gcmVwYXJlbnREaXNjb25uZWN0YWJsZXM7XG4gIH1cbn07XG5cbi8qKlxuICogQW4gYWJzdHJhY3QgYERpcmVjdGl2ZWAgYmFzZSBjbGFzcyB3aG9zZSBgZGlzY29ubmVjdGVkYCBtZXRob2Qgd2lsbCBiZVxuICogY2FsbGVkIHdoZW4gdGhlIHBhcnQgY29udGFpbmluZyB0aGUgZGlyZWN0aXZlIGlzIGNsZWFyZWQgYXMgYSByZXN1bHQgb2ZcbiAqIHJlLXJlbmRlcmluZywgb3Igd2hlbiB0aGUgdXNlciBjYWxscyBgcGFydC5zZXRDb25uZWN0ZWQoZmFsc2UpYCBvblxuICogYSBwYXJ0IHRoYXQgd2FzIHByZXZpb3VzbHkgcmVuZGVyZWQgY29udGFpbmluZyB0aGUgZGlyZWN0aXZlIChhcyBoYXBwZW5zXG4gKiB3aGVuIGUuZy4gYSBMaXRFbGVtZW50IGRpc2Nvbm5lY3RzIGZyb20gdGhlIERPTSkuXG4gKlxuICogSWYgYHBhcnQuc2V0Q29ubmVjdGVkKHRydWUpYCBpcyBzdWJzZXF1ZW50bHkgY2FsbGVkIG9uIGFcbiAqIGNvbnRhaW5pbmcgcGFydCwgdGhlIGRpcmVjdGl2ZSdzIGByZWNvbm5lY3RlZGAgbWV0aG9kIHdpbGwgYmUgY2FsbGVkIHByaW9yXG4gKiB0byBpdHMgbmV4dCBgdXBkYXRlYC9gcmVuZGVyYCBjYWxsYmFja3MuIFdoZW4gaW1wbGVtZW50aW5nIGBkaXNjb25uZWN0ZWRgLFxuICogYHJlY29ubmVjdGVkYCBzaG91bGQgYWxzbyBiZSBpbXBsZW1lbnRlZCB0byBiZSBjb21wYXRpYmxlIHdpdGggcmVjb25uZWN0aW9uLlxuICpcbiAqIE5vdGUgdGhhdCB1cGRhdGVzIG1heSBvY2N1ciB3aGlsZSB0aGUgZGlyZWN0aXZlIGlzIGRpc2Nvbm5lY3RlZC4gQXMgc3VjaCxcbiAqIGRpcmVjdGl2ZXMgc2hvdWxkIGdlbmVyYWxseSBjaGVjayB0aGUgYHRoaXMuaXNDb25uZWN0ZWRgIGZsYWcgZHVyaW5nXG4gKiByZW5kZXIvdXBkYXRlIHRvIGRldGVybWluZSB3aGV0aGVyIGl0IGlzIHNhZmUgdG8gc3Vic2NyaWJlIHRvIHJlc291cmNlc1xuICogdGhhdCBtYXkgcHJldmVudCBnYXJiYWdlIGNvbGxlY3Rpb24uXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBc3luY0RpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIC8vIEFzIG9wcG9zZWQgdG8gb3RoZXIgRGlzY29ubmVjdGFibGVzLCBBc3luY0RpcmVjdGl2ZXMgYWx3YXlzIGdldCBub3RpZmllZFxuICAvLyB3aGVuIHRoZSBSb290UGFydCBjb25uZWN0aW9uIGNoYW5nZXMsIHNvIHRoZSBwdWJsaWMgYGlzQ29ubmVjdGVkYFxuICAvLyBpcyBhIGxvY2FsbHkgc3RvcmVkIHZhcmlhYmxlIGluaXRpYWxpemVkIHZpYSBpdHMgcGFydCdzIGdldHRlciBhbmQgc3luY2VkXG4gIC8vIHZpYSBgXyRub3RpZnlEaXJlY3RpdmVDb25uZWN0aW9uQ2hhbmdlZGAuIFRoaXMgaXMgY2hlYXBlciB0aGFuIHVzaW5nXG4gIC8vIHRoZSBfJGlzQ29ubmVjdGVkIGdldHRlciwgd2hpY2ggaGFzIHRvIGxvb2sgYmFjayB1cCB0aGUgdHJlZSBlYWNoIHRpbWUuXG4gIC8qKlxuICAgKiBUaGUgY29ubmVjdGlvbiBzdGF0ZSBmb3IgdGhpcyBEaXJlY3RpdmUuXG4gICAqL1xuICBpc0Nvbm5lY3RlZCE6IGJvb2xlYW47XG5cbiAgLy8gQGludGVybmFsXG4gIG92ZXJyaWRlIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT4gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHRoZSBwYXJ0IHdpdGggaW50ZXJuYWwgZmllbGRzXG4gICAqIEBwYXJhbSBwYXJ0XG4gICAqIEBwYXJhbSBwYXJlbnRcbiAgICogQHBhcmFtIGF0dHJpYnV0ZUluZGV4XG4gICAqL1xuICBvdmVycmlkZSBfJGluaXRpYWxpemUoXG4gICAgcGFydDogUGFydCxcbiAgICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICAgIGF0dHJpYnV0ZUluZGV4OiBudW1iZXIgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgc3VwZXIuXyRpbml0aWFsaXplKHBhcnQsIHBhcmVudCwgYXR0cmlidXRlSW5kZXgpO1xuICAgIGFkZERpc2Nvbm5lY3RhYmxlVG9QYXJlbnQodGhpcyk7XG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IHBhcnQuXyRpc0Nvbm5lY3RlZDtcbiAgfVxuICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAvKipcbiAgICogQ2FsbGVkIGZyb20gdGhlIGNvcmUgY29kZSB3aGVuIGEgZGlyZWN0aXZlIGlzIGdvaW5nIGF3YXkgZnJvbSBhIHBhcnQgKGluXG4gICAqIHdoaWNoIGNhc2UgYHNob3VsZFJlbW92ZUZyb21QYXJlbnRgIHNob3VsZCBiZSB0cnVlKSwgYW5kIGZyb20gdGhlXG4gICAqIGBzZXRDaGlsZHJlbkNvbm5lY3RlZGAgaGVscGVyIGZ1bmN0aW9uIHdoZW4gcmVjdXJzaXZlbHkgY2hhbmdpbmcgdGhlXG4gICAqIGNvbm5lY3Rpb24gc3RhdGUgb2YgYSB0cmVlIChpbiB3aGljaCBjYXNlIGBzaG91bGRSZW1vdmVGcm9tUGFyZW50YCBzaG91bGRcbiAgICogYmUgZmFsc2UpLlxuICAgKlxuICAgKiBAcGFyYW0gaXNDb25uZWN0ZWRcbiAgICogQHBhcmFtIGlzQ2xlYXJpbmdEaXJlY3RpdmUgLSBUcnVlIHdoZW4gdGhlIGRpcmVjdGl2ZSBpdHNlbGYgaXMgYmVpbmdcbiAgICogICAgIHJlbW92ZWQ7IGZhbHNlIHdoZW4gdGhlIHRyZWUgaXMgYmVpbmcgZGlzY29ubmVjdGVkXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgb3ZlcnJpZGUgWydfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkJ10oXG4gICAgaXNDb25uZWN0ZWQ6IGJvb2xlYW4sXG4gICAgaXNDbGVhcmluZ0RpcmVjdGl2ZSA9IHRydWVcbiAgKSB7XG4gICAgaWYgKGlzQ29ubmVjdGVkICE9PSB0aGlzLmlzQ29ubmVjdGVkKSB7XG4gICAgICB0aGlzLmlzQ29ubmVjdGVkID0gaXNDb25uZWN0ZWQ7XG4gICAgICBpZiAoaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgdGhpcy5yZWNvbm5lY3RlZD8uKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmRpc2Nvbm5lY3RlZD8uKCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpc0NsZWFyaW5nRGlyZWN0aXZlKSB7XG4gICAgICBub3RpZnlDaGlsZHJlbkNvbm5lY3RlZENoYW5nZWQodGhpcywgaXNDb25uZWN0ZWQpO1xuICAgICAgcmVtb3ZlRGlzY29ubmVjdGFibGVGcm9tUGFyZW50KHRoaXMpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiB0aGUgZGlyZWN0aXZlJ3MgUGFydCBvdXRzaWRlIHRoZSBub3JtYWwgYHVwZGF0ZWAvYHJlbmRlcmBcbiAgICogbGlmZWN5Y2xlIG9mIGEgZGlyZWN0aXZlLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBzaG91bGQgbm90IGJlIGNhbGxlZCBzeW5jaHJvbm91c2x5IGZyb20gYSBkaXJlY3RpdmUncyBgdXBkYXRlYFxuICAgKiBvciBgcmVuZGVyYC5cbiAgICpcbiAgICogQHBhcmFtIGRpcmVjdGl2ZSBUaGUgZGlyZWN0aXZlIHRvIHVwZGF0ZVxuICAgKiBAcGFyYW0gdmFsdWUgVGhlIHZhbHVlIHRvIHNldFxuICAgKi9cbiAgc2V0VmFsdWUodmFsdWU6IHVua25vd24pIHtcbiAgICBpZiAoaXNTaW5nbGVFeHByZXNzaW9uKHRoaXMuX19wYXJ0IGFzIHVua25vd24gYXMgUGFydEluZm8pKSB7XG4gICAgICB0aGlzLl9fcGFydC5fJHNldFZhbHVlKHZhbHVlLCB0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gdGhpcy5fX2F0dHJpYnV0ZUluZGV4IHdpbGwgYmUgZGVmaW5lZCBpbiB0aGlzIGNhc2UsIGJ1dFxuICAgICAgLy8gYXNzZXJ0IGl0IGluIGRldiBtb2RlXG4gICAgICBpZiAoREVWX01PREUgJiYgdGhpcy5fX2F0dHJpYnV0ZUluZGV4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCB0aGlzLl9fYXR0cmlidXRlSW5kZXggdG8gYmUgYSBudW1iZXJgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5ld1ZhbHVlcyA9IFsuLi4odGhpcy5fX3BhcnQuXyRjb21taXR0ZWRWYWx1ZSBhcyBBcnJheTx1bmtub3duPildO1xuICAgICAgbmV3VmFsdWVzW3RoaXMuX19hdHRyaWJ1dGVJbmRleCFdID0gdmFsdWU7XG4gICAgICAodGhpcy5fX3BhcnQgYXMgQXR0cmlidXRlUGFydCkuXyRzZXRWYWx1ZShuZXdWYWx1ZXMsIHRoaXMsIDApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBVc2VyIGNhbGxiYWNrcyBmb3IgaW1wbGVtZW50aW5nIGxvZ2ljIHRvIHJlbGVhc2UgYW55IHJlc291cmNlcy9zdWJzY3JpcHRpb25zXG4gICAqIHRoYXQgbWF5IGhhdmUgYmVlbiByZXRhaW5lZCBieSB0aGlzIGRpcmVjdGl2ZS4gU2luY2UgZGlyZWN0aXZlcyBtYXkgYWxzbyBiZVxuICAgKiByZS1jb25uZWN0ZWQsIGByZWNvbm5lY3RlZGAgc2hvdWxkIGFsc28gYmUgaW1wbGVtZW50ZWQgdG8gcmVzdG9yZSB0aGVcbiAgICogd29ya2luZyBzdGF0ZSBvZiB0aGUgZGlyZWN0aXZlIHByaW9yIHRvIHRoZSBuZXh0IHJlbmRlci5cbiAgICovXG4gIHByb3RlY3RlZCBkaXNjb25uZWN0ZWQoKSB7fVxuICBwcm90ZWN0ZWQgcmVjb25uZWN0ZWQoKSB7fVxufVxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjAgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5pbXBvcnQge25vdGhpbmcsIEVsZW1lbnRQYXJ0fSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgQXN5bmNEaXJlY3RpdmV9IGZyb20gJy4uL2FzeW5jLWRpcmVjdGl2ZS5qcyc7XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBSZWYgb2JqZWN0LCB3aGljaCBpcyBjb250YWluZXIgZm9yIGEgcmVmZXJlbmNlIHRvIGFuIGVsZW1lbnQuXG4gKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVSZWYgPSA8VCA9IEVsZW1lbnQ+KCkgPT4gbmV3IFJlZjxUPigpO1xuXG4vKipcbiAqIEFuIG9iamVjdCB0aGF0IGhvbGRzIGEgcmVmIHZhbHVlLlxuICovXG5jbGFzcyBSZWY8VCA9IEVsZW1lbnQ+IHtcbiAgLyoqXG4gICAqIFRoZSBjdXJyZW50IEVsZW1lbnQgdmFsdWUgb2YgdGhlIHJlZiwgb3IgZWxzZSBgdW5kZWZpbmVkYCBpZiB0aGUgcmVmIGlzIG5vXG4gICAqIGxvbmdlciByZW5kZXJlZC5cbiAgICovXG4gIHJlYWRvbmx5IHZhbHVlPzogVDtcbn1cblxuZXhwb3J0IHR5cGUge1JlZn07XG5cbmludGVyZmFjZSBSZWZJbnRlcm5hbCB7XG4gIHZhbHVlOiBFbGVtZW50IHwgdW5kZWZpbmVkO1xufVxuXG4vLyBXaGVuIGNhbGxiYWNrcyBhcmUgdXNlZCBmb3IgcmVmcywgdGhpcyBtYXAgdHJhY2tzIHRoZSBsYXN0IHZhbHVlIHRoZSBjYWxsYmFja1xuLy8gd2FzIGNhbGxlZCB3aXRoLCBmb3IgZW5zdXJpbmcgYSBkaXJlY3RpdmUgZG9lc24ndCBjbGVhciB0aGUgcmVmIGlmIHRoZSByZWZcbi8vIGhhcyBhbHJlYWR5IGJlZW4gcmVuZGVyZWQgdG8gYSBuZXcgc3BvdC4gSXQgaXMgZG91YmxlLWtleWVkIG9uIGJvdGggdGhlXG4vLyBjb250ZXh0IChgb3B0aW9ucy5ob3N0YCkgYW5kIHRoZSBjYWxsYmFjaywgc2luY2Ugd2UgYXV0by1iaW5kIGNsYXNzIG1ldGhvZHNcbi8vIHRvIGBvcHRpb25zLmhvc3RgLlxuY29uc3QgbGFzdEVsZW1lbnRGb3JDb250ZXh0QW5kQ2FsbGJhY2sgPSBuZXcgV2Vha01hcDxcbiAgb2JqZWN0LFxuICBXZWFrTWFwPEZ1bmN0aW9uLCBFbGVtZW50IHwgdW5kZWZpbmVkPlxuPigpO1xuXG5leHBvcnQgdHlwZSBSZWZPckNhbGxiYWNrPFQgPSBFbGVtZW50PiA9IFJlZjxUPiB8ICgoZWw6IFQgfCB1bmRlZmluZWQpID0+IHZvaWQpO1xuXG5jbGFzcyBSZWZEaXJlY3RpdmUgZXh0ZW5kcyBBc3luY0RpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX2VsZW1lbnQ/OiBFbGVtZW50O1xuICBwcml2YXRlIF9yZWY/OiBSZWZPckNhbGxiYWNrO1xuICBwcml2YXRlIF9jb250ZXh0Pzogb2JqZWN0O1xuXG4gIHJlbmRlcihfcmVmPzogUmVmT3JDYWxsYmFjaykge1xuICAgIHJldHVybiBub3RoaW5nO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IEVsZW1lbnRQYXJ0LCBbcmVmXTogUGFyYW1ldGVyczx0aGlzWydyZW5kZXInXT4pIHtcbiAgICBjb25zdCByZWZDaGFuZ2VkID0gcmVmICE9PSB0aGlzLl9yZWY7XG4gICAgaWYgKHJlZkNoYW5nZWQgJiYgdGhpcy5fcmVmICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIFRoZSByZWYgcGFzc2VkIHRvIHRoZSBkaXJlY3RpdmUgaGFzIGNoYW5nZWQ7XG4gICAgICAvLyB1bnNldCB0aGUgcHJldmlvdXMgcmVmJ3MgdmFsdWVcbiAgICAgIHRoaXMuX3VwZGF0ZVJlZlZhbHVlKHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIGlmIChyZWZDaGFuZ2VkIHx8IHRoaXMuX2xhc3RFbGVtZW50Rm9yUmVmICE9PSB0aGlzLl9lbGVtZW50KSB7XG4gICAgICAvLyBXZSBlaXRoZXIgZ290IGEgbmV3IHJlZiBvciB0aGlzIGlzIHRoZSBmaXJzdCByZW5kZXI7XG4gICAgICAvLyBzdG9yZSB0aGUgcmVmL2VsZW1lbnQgJiB1cGRhdGUgdGhlIHJlZiB2YWx1ZVxuICAgICAgdGhpcy5fcmVmID0gcmVmO1xuICAgICAgdGhpcy5fY29udGV4dCA9IHBhcnQub3B0aW9ucz8uaG9zdDtcbiAgICAgIHRoaXMuX3VwZGF0ZVJlZlZhbHVlKCh0aGlzLl9lbGVtZW50ID0gcGFydC5lbGVtZW50KSk7XG4gICAgfVxuICAgIHJldHVybiBub3RoaW5nO1xuICB9XG5cbiAgcHJpdmF0ZSBfdXBkYXRlUmVmVmFsdWUoZWxlbWVudDogRWxlbWVudCB8IHVuZGVmaW5lZCkge1xuICAgIGlmICghdGhpcy5pc0Nvbm5lY3RlZCkge1xuICAgICAgZWxlbWVudCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB0aGlzLl9yZWYgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIElmIHRoZSBjdXJyZW50IHJlZiB3YXMgY2FsbGVkIHdpdGggYSBwcmV2aW91cyB2YWx1ZSwgY2FsbCB3aXRoXG4gICAgICAvLyBgdW5kZWZpbmVkYDsgV2UgZG8gdGhpcyB0byBlbnN1cmUgY2FsbGJhY2tzIGFyZSBjYWxsZWQgaW4gYSBjb25zaXN0ZW50XG4gICAgICAvLyB3YXkgcmVnYXJkbGVzcyBvZiB3aGV0aGVyIGEgcmVmIG1pZ2h0IGJlIG1vdmluZyB1cCBpbiB0aGUgdHJlZSAoaW5cbiAgICAgIC8vIHdoaWNoIGNhc2UgaXQgd291bGQgb3RoZXJ3aXNlIGJlIGNhbGxlZCB3aXRoIHRoZSBuZXcgdmFsdWUgYmVmb3JlIHRoZVxuICAgICAgLy8gcHJldmlvdXMgb25lIHVuc2V0cyBpdCkgYW5kIGRvd24gaW4gdGhlIHRyZWUgKHdoZXJlIGl0IHdvdWxkIGJlIHVuc2V0XG4gICAgICAvLyBiZWZvcmUgYmVpbmcgc2V0KS4gTm90ZSB0aGF0IGVsZW1lbnQgbG9va3VwIGlzIGtleWVkIGJ5XG4gICAgICAvLyBib3RoIHRoZSBjb250ZXh0IGFuZCB0aGUgY2FsbGJhY2ssIHNpbmNlIHdlIGFsbG93IHBhc3NpbmcgdW5ib3VuZFxuICAgICAgLy8gZnVuY3Rpb25zIHRoYXQgYXJlIGNhbGxlZCBvbiBvcHRpb25zLmhvc3QsIGFuZCB3ZSB3YW50IHRvIHRyZWF0XG4gICAgICAvLyB0aGVzZSBhcyB1bmlxdWUgXCJpbnN0YW5jZXNcIiBvZiBhIGZ1bmN0aW9uLlxuICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMuX2NvbnRleHQgPz8gZ2xvYmFsVGhpcztcbiAgICAgIGxldCBsYXN0RWxlbWVudEZvckNhbGxiYWNrID1cbiAgICAgICAgbGFzdEVsZW1lbnRGb3JDb250ZXh0QW5kQ2FsbGJhY2suZ2V0KGNvbnRleHQpO1xuICAgICAgaWYgKGxhc3RFbGVtZW50Rm9yQ2FsbGJhY2sgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBsYXN0RWxlbWVudEZvckNhbGxiYWNrID0gbmV3IFdlYWtNYXAoKTtcbiAgICAgICAgbGFzdEVsZW1lbnRGb3JDb250ZXh0QW5kQ2FsbGJhY2suc2V0KGNvbnRleHQsIGxhc3RFbGVtZW50Rm9yQ2FsbGJhY2spO1xuICAgICAgfVxuICAgICAgaWYgKGxhc3RFbGVtZW50Rm9yQ2FsbGJhY2suZ2V0KHRoaXMuX3JlZikgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9yZWYuY2FsbCh0aGlzLl9jb250ZXh0LCB1bmRlZmluZWQpO1xuICAgICAgfVxuICAgICAgbGFzdEVsZW1lbnRGb3JDYWxsYmFjay5zZXQodGhpcy5fcmVmLCBlbGVtZW50KTtcbiAgICAgIC8vIENhbGwgdGhlIHJlZiB3aXRoIHRoZSBuZXcgZWxlbWVudCB2YWx1ZVxuICAgICAgaWYgKGVsZW1lbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9yZWYuY2FsbCh0aGlzLl9jb250ZXh0LCBlbGVtZW50KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgKHRoaXMuX3JlZiBhcyBSZWZJbnRlcm5hbCkhLnZhbHVlID0gZWxlbWVudDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldCBfbGFzdEVsZW1lbnRGb3JSZWYoKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB0aGlzLl9yZWYgPT09ICdmdW5jdGlvbidcbiAgICAgID8gbGFzdEVsZW1lbnRGb3JDb250ZXh0QW5kQ2FsbGJhY2tcbiAgICAgICAgICAuZ2V0KHRoaXMuX2NvbnRleHQgPz8gZ2xvYmFsVGhpcylcbiAgICAgICAgICA/LmdldCh0aGlzLl9yZWYpXG4gICAgICA6IHRoaXMuX3JlZj8udmFsdWU7XG4gIH1cblxuICBvdmVycmlkZSBkaXNjb25uZWN0ZWQoKSB7XG4gICAgLy8gT25seSBjbGVhciB0aGUgYm94IGlmIG91ciBlbGVtZW50IGlzIHN0aWxsIHRoZSBvbmUgaW4gaXQgKGkuZS4gYW5vdGhlclxuICAgIC8vIGRpcmVjdGl2ZSBpbnN0YW5jZSBoYXNuJ3QgcmVuZGVyZWQgaXRzIGVsZW1lbnQgdG8gaXQgYmVmb3JlIHVzKTsgdGhhdFxuICAgIC8vIG9ubHkgaGFwcGVucyBpbiB0aGUgZXZlbnQgb2YgdGhlIGRpcmVjdGl2ZSBiZWluZyBjbGVhcmVkIChub3QgdmlhIG1hbnVhbFxuICAgIC8vIGRpc2Nvbm5lY3Rpb24pXG4gICAgaWYgKHRoaXMuX2xhc3RFbGVtZW50Rm9yUmVmID09PSB0aGlzLl9lbGVtZW50KSB7XG4gICAgICB0aGlzLl91cGRhdGVSZWZWYWx1ZSh1bmRlZmluZWQpO1xuICAgIH1cbiAgfVxuXG4gIG92ZXJyaWRlIHJlY29ubmVjdGVkKCkge1xuICAgIC8vIElmIHdlIHdlcmUgbWFudWFsbHkgZGlzY29ubmVjdGVkLCB3ZSBjYW4gc2FmZWx5IHB1dCBvdXIgZWxlbWVudCBiYWNrIGluXG4gICAgLy8gdGhlIGJveCwgc2luY2Ugbm8gcmVuZGVyaW5nIGNvdWxkIGhhdmUgb2NjdXJyZWQgdG8gY2hhbmdlIGl0cyBzdGF0ZVxuICAgIHRoaXMuX3VwZGF0ZVJlZlZhbHVlKHRoaXMuX2VsZW1lbnQpO1xuICB9XG59XG5cbi8qKlxuICogU2V0cyB0aGUgdmFsdWUgb2YgYSBSZWYgb2JqZWN0IG9yIGNhbGxzIGEgcmVmIGNhbGxiYWNrIHdpdGggdGhlIGVsZW1lbnQgaXQnc1xuICogYm91bmQgdG8uXG4gKlxuICogQSBSZWYgb2JqZWN0IGFjdHMgYXMgYSBjb250YWluZXIgZm9yIGEgcmVmZXJlbmNlIHRvIGFuIGVsZW1lbnQuIEEgcmVmXG4gKiBjYWxsYmFjayBpcyBhIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYW4gZWxlbWVudCBhcyBpdHMgb25seSBhcmd1bWVudC5cbiAqXG4gKiBUaGUgcmVmIGRpcmVjdGl2ZSBzZXRzIHRoZSB2YWx1ZSBvZiB0aGUgUmVmIG9iamVjdCBvciBjYWxscyB0aGUgcmVmIGNhbGxiYWNrXG4gKiBkdXJpbmcgcmVuZGVyaW5nLCBpZiB0aGUgcmVmZXJlbmNlZCBlbGVtZW50IGNoYW5nZWQuXG4gKlxuICogTm90ZTogSWYgYSByZWYgY2FsbGJhY2sgaXMgcmVuZGVyZWQgdG8gYSBkaWZmZXJlbnQgZWxlbWVudCBwb3NpdGlvbiBvciBpc1xuICogcmVtb3ZlZCBpbiBhIHN1YnNlcXVlbnQgcmVuZGVyLCBpdCB3aWxsIGZpcnN0IGJlIGNhbGxlZCB3aXRoIGB1bmRlZmluZWRgLFxuICogZm9sbG93ZWQgYnkgYW5vdGhlciBjYWxsIHdpdGggdGhlIG5ldyBlbGVtZW50IGl0IHdhcyByZW5kZXJlZCB0byAoaWYgYW55KS5cbiAqXG4gKiBgYGBqc1xuICogLy8gVXNpbmcgUmVmIG9iamVjdFxuICogY29uc3QgaW5wdXRSZWYgPSBjcmVhdGVSZWYoKTtcbiAqIHJlbmRlcihodG1sYDxpbnB1dCAke3JlZihpbnB1dFJlZil9PmAsIGNvbnRhaW5lcik7XG4gKiBpbnB1dFJlZi52YWx1ZS5mb2N1cygpO1xuICpcbiAqIC8vIFVzaW5nIGNhbGxiYWNrXG4gKiBjb25zdCBjYWxsYmFjayA9IChpbnB1dEVsZW1lbnQpID0+IGlucHV0RWxlbWVudC5mb2N1cygpO1xuICogcmVuZGVyKGh0bWxgPGlucHV0ICR7cmVmKGNhbGxiYWNrKX0+YCwgY29udGFpbmVyKTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcmVmID0gZGlyZWN0aXZlKFJlZkRpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7UmVmRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIxIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG4vLyBOb3RlLCB0aGlzIG1vZHVsZSBpcyBub3QgaW5jbHVkZWQgaW4gcGFja2FnZSBleHBvcnRzIHNvIHRoYXQgaXQncyBwcml2YXRlIHRvXG4vLyBvdXIgZmlyc3QtcGFydHkgZGlyZWN0aXZlcy4gSWYgaXQgZW5kcyB1cCBiZWluZyB1c2VmdWwsIHdlIGNhbiBvcGVuIGl0IHVwIGFuZFxuLy8gZXhwb3J0IGl0LlxuXG4vKipcbiAqIEhlbHBlciB0byBpdGVyYXRlIGFuIEFzeW5jSXRlcmFibGUgaW4gaXRzIG93biBjbG9zdXJlLlxuICogQHBhcmFtIGl0ZXJhYmxlIFRoZSBpdGVyYWJsZSB0byBpdGVyYXRlXG4gKiBAcGFyYW0gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIHRvIGNhbGwgZm9yIGVhY2ggdmFsdWUuIElmIHRoZSBjYWxsYmFjayByZXR1cm5zXG4gKiBgZmFsc2VgLCB0aGUgbG9vcCB3aWxsIGJlIGJyb2tlbi5cbiAqL1xuZXhwb3J0IGNvbnN0IGZvckF3YWl0T2YgPSBhc3luYyA8VD4oXG4gIGl0ZXJhYmxlOiBBc3luY0l0ZXJhYmxlPFQ+LFxuICBjYWxsYmFjazogKHZhbHVlOiBUKSA9PiBQcm9taXNlPGJvb2xlYW4+XG4pID0+IHtcbiAgZm9yIGF3YWl0IChjb25zdCB2IG9mIGl0ZXJhYmxlKSB7XG4gICAgaWYgKChhd2FpdCBjYWxsYmFjayh2KSkgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIEhvbGRzIGEgcmVmZXJlbmNlIHRvIGFuIGluc3RhbmNlIHRoYXQgY2FuIGJlIGRpc2Nvbm5lY3RlZCBhbmQgcmVjb25uZWN0ZWQsXG4gKiBzbyB0aGF0IGEgY2xvc3VyZSBvdmVyIHRoZSByZWYgKGUuZy4gaW4gYSB0aGVuIGZ1bmN0aW9uIHRvIGEgcHJvbWlzZSkgZG9lc1xuICogbm90IHN0cm9uZ2x5IGhvbGQgYSByZWYgdG8gdGhlIGluc3RhbmNlLiBBcHByb3hpbWF0ZXMgYSBXZWFrUmVmIGJ1dCBtdXN0XG4gKiBiZSBtYW51YWxseSBjb25uZWN0ZWQgJiBkaXNjb25uZWN0ZWQgdG8gdGhlIGJhY2tpbmcgaW5zdGFuY2UuXG4gKi9cbmV4cG9ydCBjbGFzcyBQc2V1ZG9XZWFrUmVmPFQ+IHtcbiAgcHJpdmF0ZSBfcmVmPzogVDtcbiAgY29uc3RydWN0b3IocmVmOiBUKSB7XG4gICAgdGhpcy5fcmVmID0gcmVmO1xuICB9XG4gIC8qKlxuICAgKiBEaXNhc3NvY2lhdGVzIHRoZSByZWYgd2l0aCB0aGUgYmFja2luZyBpbnN0YW5jZS5cbiAgICovXG4gIGRpc2Nvbm5lY3QoKSB7XG4gICAgdGhpcy5fcmVmID0gdW5kZWZpbmVkO1xuICB9XG4gIC8qKlxuICAgKiBSZWFzc29jaWF0ZXMgdGhlIHJlZiB3aXRoIHRoZSBiYWNraW5nIGluc3RhbmNlLlxuICAgKi9cbiAgcmVjb25uZWN0KHJlZjogVCkge1xuICAgIHRoaXMuX3JlZiA9IHJlZjtcbiAgfVxuICAvKipcbiAgICogUmV0cmlldmVzIHRoZSBiYWNraW5nIGluc3RhbmNlICh3aWxsIGJlIHVuZGVmaW5lZCB3aGVuIGRpc2Nvbm5lY3RlZClcbiAgICovXG4gIGRlcmVmKCkge1xuICAgIHJldHVybiB0aGlzLl9yZWY7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGhlbHBlciB0byBwYXVzZSBhbmQgcmVzdW1lIHdhaXRpbmcgb24gYSBjb25kaXRpb24gaW4gYW4gYXN5bmMgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IGNsYXNzIFBhdXNlciB7XG4gIHByaXZhdGUgX3Byb21pc2U/OiBQcm9taXNlPHZvaWQ+ID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIF9yZXNvbHZlPzogKCkgPT4gdm9pZCA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIFdoZW4gcGF1c2VkLCByZXR1cm5zIGEgcHJvbWlzZSB0byBiZSBhd2FpdGVkOyB3aGVuIHVucGF1c2VkLCByZXR1cm5zXG4gICAqIHVuZGVmaW5lZC4gTm90ZSB0aGF0IGluIHRoZSBtaWNyb3Rhc2sgYmV0d2VlbiB0aGUgcGF1c2VyIGJlaW5nIHJlc3VtZWRcbiAgICogYW4gYXdhaXQgb2YgdGhpcyBwcm9taXNlIHJlc29sdmluZywgdGhlIHBhdXNlciBjb3VsZCBiZSBwYXVzZWQgYWdhaW4sXG4gICAqIGhlbmNlIGNhbGxlcnMgc2hvdWxkIGNoZWNrIHRoZSBwcm9taXNlIGluIGEgbG9vcCB3aGVuIGF3YWl0aW5nLlxuICAgKiBAcmV0dXJucyBBIHByb21pc2UgdG8gYmUgYXdhaXRlZCB3aGVuIHBhdXNlZCBvciB1bmRlZmluZWRcbiAgICovXG4gIGdldCgpIHtcbiAgICByZXR1cm4gdGhpcy5fcHJvbWlzZTtcbiAgfVxuICAvKipcbiAgICogQ3JlYXRlcyBhIHByb21pc2UgdG8gYmUgYXdhaXRlZFxuICAgKi9cbiAgcGF1c2UoKSB7XG4gICAgdGhpcy5fcHJvbWlzZSA/Pz0gbmV3IFByb21pc2UoKHJlc29sdmUpID0+ICh0aGlzLl9yZXNvbHZlID0gcmVzb2x2ZSkpO1xuICB9XG4gIC8qKlxuICAgKiBSZXNvbHZlcyB0aGUgcHJvbWlzZSB3aGljaCBtYXkgYmUgYXdhaXRlZFxuICAgKi9cbiAgcmVzdW1lKCkge1xuICAgIHRoaXMuX3Jlc29sdmU/LigpO1xuICAgIHRoaXMuX3Byb21pc2UgPSB0aGlzLl9yZXNvbHZlID0gdW5kZWZpbmVkO1xuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtDaGlsZFBhcnQsIG5vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBBc3luY0RpcmVjdGl2ZSxcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmVQYXJhbWV0ZXJzLFxufSBmcm9tICcuLi9hc3luYy1kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtQYXVzZXIsIFBzZXVkb1dlYWtSZWYsIGZvckF3YWl0T2Z9IGZyb20gJy4vcHJpdmF0ZS1hc3luYy1oZWxwZXJzLmpzJztcblxudHlwZSBNYXBwZXI8VD4gPSAodjogVCwgaW5kZXg/OiBudW1iZXIpID0+IHVua25vd247XG5cbmV4cG9ydCBjbGFzcyBBc3luY1JlcGxhY2VEaXJlY3RpdmUgZXh0ZW5kcyBBc3luY0RpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX192YWx1ZT86IEFzeW5jSXRlcmFibGU8dW5rbm93bj47XG4gIHByaXZhdGUgX193ZWFrVGhpcyA9IG5ldyBQc2V1ZG9XZWFrUmVmKHRoaXMpO1xuICBwcml2YXRlIF9fcGF1c2VyID0gbmV3IFBhdXNlcigpO1xuXG4gIC8vIEB0cy1leHBlY3QtZXJyb3IgdmFsdWUgbm90IHVzZWQsIGJ1dCB3ZSB3YW50IGEgbmljZSBwYXJhbWV0ZXIgZm9yIGRvY3NcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICByZW5kZXI8VD4odmFsdWU6IEFzeW5jSXRlcmFibGU8VD4sIF9tYXBwZXI/OiBNYXBwZXI8VD4pIHtcbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUoXG4gICAgX3BhcnQ6IENoaWxkUGFydCxcbiAgICBbdmFsdWUsIG1hcHBlcl06IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz5cbiAgKSB7XG4gICAgLy8gSWYgb3VyIGluaXRpYWwgcmVuZGVyIG9jY3VycyB3aGlsZSBkaXNjb25uZWN0ZWQsIGVuc3VyZSB0aGF0IHRoZSBwYXVzZXJcbiAgICAvLyBhbmQgd2Vha1RoaXMgYXJlIGluIHRoZSBkaXNjb25uZWN0ZWQgc3RhdGVcbiAgICBpZiAoIXRoaXMuaXNDb25uZWN0ZWQpIHtcbiAgICAgIHRoaXMuZGlzY29ubmVjdGVkKCk7XG4gICAgfVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgc2V0IHVwIHRoaXMgcGFydGljdWxhciBpdGVyYWJsZSwgd2UgZG9uJ3QgbmVlZFxuICAgIC8vIHRvIGRvIGFueXRoaW5nLlxuICAgIGlmICh2YWx1ZSA9PT0gdGhpcy5fX3ZhbHVlKSB7XG4gICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgfVxuICAgIHRoaXMuX192YWx1ZSA9IHZhbHVlO1xuICAgIGxldCBpID0gMDtcbiAgICBjb25zdCB7X193ZWFrVGhpczogd2Vha1RoaXMsIF9fcGF1c2VyOiBwYXVzZXJ9ID0gdGhpcztcbiAgICAvLyBOb3RlLCB0aGUgY2FsbGJhY2sgYXZvaWRzIGNsb3Npbmcgb3ZlciBgdGhpc2Agc28gdGhhdCB0aGUgZGlyZWN0aXZlXG4gICAgLy8gY2FuIGJlIGdjJ2VkIGJlZm9yZSB0aGUgcHJvbWlzZSByZXNvbHZlczsgaW5zdGVhZCBgdGhpc2AgaXMgcmV0cmlldmVkXG4gICAgLy8gZnJvbSBgd2Vha1RoaXNgLCB3aGljaCBjYW4gYnJlYWsgdGhlIGhhcmQgcmVmZXJlbmNlIGluIHRoZSBjbG9zdXJlIHdoZW5cbiAgICAvLyB0aGUgZGlyZWN0aXZlIGRpc2Nvbm5lY3RzXG4gICAgZm9yQXdhaXRPZih2YWx1ZSwgYXN5bmMgKHY6IHVua25vd24pID0+IHtcbiAgICAgIC8vIFRoZSB3aGlsZSBsb29wIGhlcmUgaGFuZGxlcyB0aGUgY2FzZSB0aGF0IHRoZSBjb25uZWN0aW9uIHN0YXRlXG4gICAgICAvLyB0aHJhc2hlcywgY2F1c2luZyB0aGUgcGF1c2VyIHRvIHJlc3VtZSBhbmQgdGhlbiBnZXQgcmUtcGF1c2VkXG4gICAgICB3aGlsZSAocGF1c2VyLmdldCgpKSB7XG4gICAgICAgIGF3YWl0IHBhdXNlci5nZXQoKTtcbiAgICAgIH1cbiAgICAgIC8vIElmIHRoZSBjYWxsYmFjayBnZXRzIGhlcmUgYW5kIHRoZXJlIGlzIG5vIGB0aGlzYCwgaXQgbWVhbnMgdGhhdCB0aGVcbiAgICAgIC8vIGRpcmVjdGl2ZSBoYXMgYmVlbiBkaXNjb25uZWN0ZWQgYW5kIGdhcmJhZ2UgY29sbGVjdGVkIGFuZCB3ZSBkb24ndFxuICAgICAgLy8gbmVlZCB0byBkbyBhbnl0aGluZyBlbHNlXG4gICAgICBjb25zdCBfdGhpcyA9IHdlYWtUaGlzLmRlcmVmKCk7XG4gICAgICBpZiAoX3RoaXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBDaGVjayB0byBtYWtlIHN1cmUgdGhhdCB2YWx1ZSBpcyB0aGUgc3RpbGwgdGhlIGN1cnJlbnQgdmFsdWUgb2ZcbiAgICAgICAgLy8gdGhlIHBhcnQsIGFuZCBpZiBub3QgYmFpbCBiZWNhdXNlIGEgbmV3IHZhbHVlIG93bnMgdGhpcyBwYXJ0XG4gICAgICAgIGlmIChfdGhpcy5fX3ZhbHVlICE9PSB2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFzIGEgY29udmVuaWVuY2UsIGJlY2F1c2UgZnVuY3Rpb25hbC1wcm9ncmFtbWluZy1zdHlsZVxuICAgICAgICAvLyB0cmFuc2Zvcm1zIG9mIGl0ZXJhYmxlcyBhbmQgYXN5bmMgaXRlcmFibGVzIHJlcXVpcmVzIGEgbGlicmFyeSxcbiAgICAgICAgLy8gd2UgYWNjZXB0IGEgbWFwcGVyIGZ1bmN0aW9uLiBUaGlzIGlzIGVzcGVjaWFsbHkgY29udmVuaWVudCBmb3JcbiAgICAgICAgLy8gcmVuZGVyaW5nIGEgdGVtcGxhdGUgZm9yIGVhY2ggaXRlbS5cbiAgICAgICAgaWYgKG1hcHBlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdiA9IG1hcHBlcih2LCBpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIF90aGlzLmNvbW1pdFZhbHVlKHYsIGkpO1xuICAgICAgICBpKys7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cblxuICAvLyBPdmVycmlkZSBwb2ludCBmb3IgQXN5bmNBcHBlbmQgdG8gYXBwZW5kIHJhdGhlciB0aGFuIHJlcGxhY2VcbiAgcHJvdGVjdGVkIGNvbW1pdFZhbHVlKHZhbHVlOiB1bmtub3duLCBfaW5kZXg6IG51bWJlcikge1xuICAgIHRoaXMuc2V0VmFsdWUodmFsdWUpO1xuICB9XG5cbiAgb3ZlcnJpZGUgZGlzY29ubmVjdGVkKCkge1xuICAgIHRoaXMuX193ZWFrVGhpcy5kaXNjb25uZWN0KCk7XG4gICAgdGhpcy5fX3BhdXNlci5wYXVzZSgpO1xuICB9XG5cbiAgb3ZlcnJpZGUgcmVjb25uZWN0ZWQoKSB7XG4gICAgdGhpcy5fX3dlYWtUaGlzLnJlY29ubmVjdCh0aGlzKTtcbiAgICB0aGlzLl9fcGF1c2VyLnJlc3VtZSgpO1xuICB9XG59XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCByZW5kZXJzIHRoZSBpdGVtcyBvZiBhbiBhc3luYyBpdGVyYWJsZVsxXSwgcmVwbGFjaW5nXG4gKiBwcmV2aW91cyB2YWx1ZXMgd2l0aCBuZXcgdmFsdWVzLCBzbyB0aGF0IG9ubHkgb25lIHZhbHVlIGlzIGV2ZXIgcmVuZGVyZWRcbiAqIGF0IGEgdGltZS4gVGhpcyBkaXJlY3RpdmUgbWF5IGJlIHVzZWQgaW4gYW55IGV4cHJlc3Npb24gdHlwZS5cbiAqXG4gKiBBc3luYyBpdGVyYWJsZXMgYXJlIG9iamVjdHMgd2l0aCBhIGBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdYCBtZXRob2QsIHdoaWNoXG4gKiByZXR1cm5zIGFuIGl0ZXJhdG9yIHdobydzIGBuZXh0KClgIG1ldGhvZCByZXR1cm5zIGEgUHJvbWlzZS4gV2hlbiBhIG5ld1xuICogdmFsdWUgaXMgYXZhaWxhYmxlLCB0aGUgUHJvbWlzZSByZXNvbHZlcyBhbmQgdGhlIHZhbHVlIGlzIHJlbmRlcmVkIHRvIHRoZVxuICogUGFydCBjb250cm9sbGVkIGJ5IHRoZSBkaXJlY3RpdmUuIElmIGFub3RoZXIgdmFsdWUgb3RoZXIgdGhhbiB0aGlzXG4gKiBkaXJlY3RpdmUgaGFzIGJlZW4gc2V0IG9uIHRoZSBQYXJ0LCB0aGUgaXRlcmFibGUgd2lsbCBubyBsb25nZXIgYmUgbGlzdGVuZWRcbiAqIHRvIGFuZCBuZXcgdmFsdWVzIHdvbid0IGJlIHdyaXR0ZW4gdG8gdGhlIFBhcnQuXG4gKlxuICogWzFdOiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9TdGF0ZW1lbnRzL2Zvci1hd2FpdC4uLm9mXG4gKlxuICogQHBhcmFtIHZhbHVlIEFuIGFzeW5jIGl0ZXJhYmxlXG4gKiBAcGFyYW0gbWFwcGVyIEFuIG9wdGlvbmFsIGZ1bmN0aW9uIHRoYXQgbWFwcyBmcm9tICh2YWx1ZSwgaW5kZXgpIHRvIGFub3RoZXJcbiAqICAgICB2YWx1ZS4gVXNlZnVsIGZvciBnZW5lcmF0aW5nIHRlbXBsYXRlcyBmb3IgZWFjaCBpdGVtIGluIHRoZSBpdGVyYWJsZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGFzeW5jUmVwbGFjZSA9IGRpcmVjdGl2ZShBc3luY1JlcGxhY2VEaXJlY3RpdmUpO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7Q2hpbGRQYXJ0fSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBkaXJlY3RpdmUsXG4gIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG4gIFBhcnRJbmZvLFxuICBQYXJ0VHlwZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7QXN5bmNSZXBsYWNlRGlyZWN0aXZlfSBmcm9tICcuL2FzeW5jLXJlcGxhY2UuanMnO1xuaW1wb3J0IHtcbiAgY2xlYXJQYXJ0LFxuICBpbnNlcnRQYXJ0LFxuICBzZXRDaGlsZFBhcnRWYWx1ZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuXG5jbGFzcyBBc3luY0FwcGVuZERpcmVjdGl2ZSBleHRlbmRzIEFzeW5jUmVwbGFjZURpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX19jaGlsZFBhcnQhOiBDaGlsZFBhcnQ7XG5cbiAgLy8gT3ZlcnJpZGUgQXN5bmNSZXBsYWNlIHRvIG5hcnJvdyB0aGUgYWxsb3dlZCBwYXJ0IHR5cGUgdG8gQ2hpbGRQYXJ0IG9ubHlcbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICAgIGlmIChwYXJ0SW5mby50eXBlICE9PSBQYXJ0VHlwZS5DSElMRCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdhc3luY0FwcGVuZCBjYW4gb25seSBiZSB1c2VkIGluIGNoaWxkIGV4cHJlc3Npb25zJyk7XG4gICAgfVxuICB9XG5cbiAgLy8gT3ZlcnJpZGUgQXN5bmNSZXBsYWNlIHRvIHNhdmUgdGhlIHBhcnQgc2luY2Ugd2UgbmVlZCB0byBhcHBlbmQgaW50byBpdFxuICBvdmVycmlkZSB1cGRhdGUocGFydDogQ2hpbGRQYXJ0LCBwYXJhbXM6IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICB0aGlzLl9fY2hpbGRQYXJ0ID0gcGFydDtcbiAgICByZXR1cm4gc3VwZXIudXBkYXRlKHBhcnQsIHBhcmFtcyk7XG4gIH1cblxuICAvLyBPdmVycmlkZSBBc3luY1JlcGxhY2UgdG8gYXBwZW5kIHJhdGhlciB0aGFuIHJlcGxhY2VcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIGNvbW1pdFZhbHVlKHZhbHVlOiB1bmtub3duLCBpbmRleDogbnVtYmVyKSB7XG4gICAgLy8gV2hlbiB3ZSBnZXQgdGhlIGZpcnN0IHZhbHVlLCBjbGVhciB0aGUgcGFydC4gVGhpcyBsZXRzIHRoZVxuICAgIC8vIHByZXZpb3VzIHZhbHVlIGRpc3BsYXkgdW50aWwgd2UgY2FuIHJlcGxhY2UgaXQuXG4gICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICBjbGVhclBhcnQodGhpcy5fX2NoaWxkUGFydCk7XG4gICAgfVxuICAgIC8vIENyZWF0ZSBhbmQgaW5zZXJ0IGEgbmV3IHBhcnQgYW5kIHNldCBpdHMgdmFsdWUgdG8gdGhlIG5leHQgdmFsdWVcbiAgICBjb25zdCBuZXdQYXJ0ID0gaW5zZXJ0UGFydCh0aGlzLl9fY2hpbGRQYXJ0KTtcbiAgICBzZXRDaGlsZFBhcnRWYWx1ZShuZXdQYXJ0LCB2YWx1ZSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGRpcmVjdGl2ZSB0aGF0IHJlbmRlcnMgdGhlIGl0ZW1zIG9mIGFuIGFzeW5jIGl0ZXJhYmxlWzFdLCBhcHBlbmRpbmcgbmV3XG4gKiB2YWx1ZXMgYWZ0ZXIgcHJldmlvdXMgdmFsdWVzLCBzaW1pbGFyIHRvIHRoZSBidWlsdC1pbiBzdXBwb3J0IGZvciBpdGVyYWJsZXMuXG4gKiBUaGlzIGRpcmVjdGl2ZSBpcyB1c2FibGUgb25seSBpbiBjaGlsZCBleHByZXNzaW9ucy5cbiAqXG4gKiBBc3luYyBpdGVyYWJsZXMgYXJlIG9iamVjdHMgd2l0aCBhIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gbWV0aG9kLCB3aGljaFxuICogcmV0dXJucyBhbiBpdGVyYXRvciB3aG8ncyBgbmV4dCgpYCBtZXRob2QgcmV0dXJucyBhIFByb21pc2UuIFdoZW4gYSBuZXdcbiAqIHZhbHVlIGlzIGF2YWlsYWJsZSwgdGhlIFByb21pc2UgcmVzb2x2ZXMgYW5kIHRoZSB2YWx1ZSBpcyBhcHBlbmRlZCB0byB0aGVcbiAqIFBhcnQgY29udHJvbGxlZCBieSB0aGUgZGlyZWN0aXZlLiBJZiBhbm90aGVyIHZhbHVlIG90aGVyIHRoYW4gdGhpc1xuICogZGlyZWN0aXZlIGhhcyBiZWVuIHNldCBvbiB0aGUgUGFydCwgdGhlIGl0ZXJhYmxlIHdpbGwgbm8gbG9uZ2VyIGJlIGxpc3RlbmVkXG4gKiB0byBhbmQgbmV3IHZhbHVlcyB3b24ndCBiZSB3cml0dGVuIHRvIHRoZSBQYXJ0LlxuICpcbiAqIFsxXTogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvU3RhdGVtZW50cy9mb3ItYXdhaXQuLi5vZlxuICpcbiAqIEBwYXJhbSB2YWx1ZSBBbiBhc3luYyBpdGVyYWJsZVxuICogQHBhcmFtIG1hcHBlciBBbiBvcHRpb25hbCBmdW5jdGlvbiB0aGF0IG1hcHMgZnJvbSAodmFsdWUsIGluZGV4KSB0byBhbm90aGVyXG4gKiAgICAgdmFsdWUuIFVzZWZ1bCBmb3IgZ2VuZXJhdGluZyB0ZW1wbGF0ZXMgZm9yIGVhY2ggaXRlbSBpbiB0aGUgaXRlcmFibGUuXG4gKi9cbmV4cG9ydCBjb25zdCBhc3luY0FwcGVuZCA9IGRpcmVjdGl2ZShBc3luY0FwcGVuZERpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7QXN5bmNBcHBlbmREaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7XG4gIFRlbXBsYXRlUmVzdWx0LFxuICBDaGlsZFBhcnQsXG4gIFJvb3RQYXJ0LFxuICByZW5kZXIsXG4gIG5vdGhpbmcsXG4gIENvbXBpbGVkVGVtcGxhdGVSZXN1bHQsXG59IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7XG4gIGRpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlLFxuICBEaXJlY3RpdmVQYXJhbWV0ZXJzLFxuICBQYXJ0SW5mbyxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7XG4gIGNsZWFyUGFydCxcbiAgZ2V0Q29tbWl0dGVkVmFsdWUsXG4gIGluc2VydFBhcnQsXG4gIGlzQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdCxcbiAgaXNUZW1wbGF0ZVJlc3VsdCxcbiAgc2V0Q29tbWl0dGVkVmFsdWUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcblxuLyoqXG4gKiBUaGUgdGVtcGxhdGUgc3RyaW5ncyBhcnJheSBjb250ZW50cyBhcmUgbm90IGNvbXBhdGlibGUgYmV0d2VlbiB0aGUgdHdvXG4gKiB0ZW1wbGF0ZSByZXN1bHQgdHlwZXMgYXMgdGhlIGNvbXBpbGVkIHRlbXBsYXRlIGNvbnRhaW5zIGEgcHJlcGFyZWQgc3RyaW5nO1xuICogb25seSB1c2UgdGhlIHJldHVybmVkIHRlbXBsYXRlIHN0cmluZ3MgYXJyYXkgYXMgYSBjYWNoZSBrZXkuXG4gKi9cbmNvbnN0IGdldFN0cmluZ3NGcm9tVGVtcGxhdGVSZXN1bHQgPSAoXG4gIHJlc3VsdDogVGVtcGxhdGVSZXN1bHQgfCBDb21waWxlZFRlbXBsYXRlUmVzdWx0XG4pOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSA9PlxuICBpc0NvbXBpbGVkVGVtcGxhdGVSZXN1bHQocmVzdWx0KSA/IHJlc3VsdFsnXyRsaXRUeXBlJCddLmggOiByZXN1bHQuc3RyaW5ncztcblxuY2xhc3MgQ2FjaGVEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBwcml2YXRlIF90ZW1wbGF0ZUNhY2hlID0gbmV3IFdlYWtNYXA8VGVtcGxhdGVTdHJpbmdzQXJyYXksIFJvb3RQYXJ0PigpO1xuICBwcml2YXRlIF92YWx1ZT86IFRlbXBsYXRlUmVzdWx0IHwgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdDtcblxuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gIH1cblxuICByZW5kZXIodjogdW5rbm93bikge1xuICAgIC8vIFJldHVybiBhbiBhcnJheSBvZiB0aGUgdmFsdWUgdG8gaW5kdWNlIGxpdC1odG1sIHRvIGNyZWF0ZSBhIENoaWxkUGFydFxuICAgIC8vIGZvciB0aGUgdmFsdWUgdGhhdCB3ZSBjYW4gbW92ZSBpbnRvIHRoZSBjYWNoZS5cbiAgICByZXR1cm4gW3ZdO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKGNvbnRhaW5lclBhcnQ6IENoaWxkUGFydCwgW3ZdOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgY29uc3QgX3ZhbHVlS2V5ID0gaXNUZW1wbGF0ZVJlc3VsdCh0aGlzLl92YWx1ZSlcbiAgICAgID8gZ2V0U3RyaW5nc0Zyb21UZW1wbGF0ZVJlc3VsdCh0aGlzLl92YWx1ZSlcbiAgICAgIDogbnVsbDtcbiAgICBjb25zdCB2S2V5ID0gaXNUZW1wbGF0ZVJlc3VsdCh2KSA/IGdldFN0cmluZ3NGcm9tVGVtcGxhdGVSZXN1bHQodikgOiBudWxsO1xuXG4gICAgLy8gSWYgdGhlIHByZXZpb3VzIHZhbHVlIGlzIGEgVGVtcGxhdGVSZXN1bHQgYW5kIHRoZSBuZXcgdmFsdWUgaXMgbm90LFxuICAgIC8vIG9yIGlzIGEgZGlmZmVyZW50IFRlbXBsYXRlIGFzIHRoZSBwcmV2aW91cyB2YWx1ZSwgbW92ZSB0aGUgY2hpbGQgcGFydFxuICAgIC8vIGludG8gdGhlIGNhY2hlLlxuICAgIGlmIChfdmFsdWVLZXkgIT09IG51bGwgJiYgKHZLZXkgPT09IG51bGwgfHwgX3ZhbHVlS2V5ICE9PSB2S2V5KSkge1xuICAgICAgLy8gVGhpcyBpcyBhbHdheXMgYW4gYXJyYXkgYmVjYXVzZSB3ZSByZXR1cm4gW3ZdIGluIHJlbmRlcigpXG4gICAgICBjb25zdCBwYXJ0VmFsdWUgPSBnZXRDb21taXR0ZWRWYWx1ZShjb250YWluZXJQYXJ0KSBhcyBBcnJheTxDaGlsZFBhcnQ+O1xuICAgICAgY29uc3QgY2hpbGRQYXJ0ID0gcGFydFZhbHVlLnBvcCgpITtcbiAgICAgIGxldCBjYWNoZWRDb250YWluZXJQYXJ0ID0gdGhpcy5fdGVtcGxhdGVDYWNoZS5nZXQoX3ZhbHVlS2V5KTtcbiAgICAgIGlmIChjYWNoZWRDb250YWluZXJQYXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3QgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIGNhY2hlZENvbnRhaW5lclBhcnQgPSByZW5kZXIobm90aGluZywgZnJhZ21lbnQpO1xuICAgICAgICBjYWNoZWRDb250YWluZXJQYXJ0LnNldENvbm5lY3RlZChmYWxzZSk7XG4gICAgICAgIHRoaXMuX3RlbXBsYXRlQ2FjaGUuc2V0KF92YWx1ZUtleSwgY2FjaGVkQ29udGFpbmVyUGFydCk7XG4gICAgICB9XG4gICAgICAvLyBNb3ZlIGludG8gY2FjaGVcbiAgICAgIHNldENvbW1pdHRlZFZhbHVlKGNhY2hlZENvbnRhaW5lclBhcnQsIFtjaGlsZFBhcnRdKTtcbiAgICAgIGluc2VydFBhcnQoY2FjaGVkQ29udGFpbmVyUGFydCwgdW5kZWZpbmVkLCBjaGlsZFBhcnQpO1xuICAgIH1cbiAgICAvLyBJZiB0aGUgbmV3IHZhbHVlIGlzIGEgVGVtcGxhdGVSZXN1bHQgYW5kIHRoZSBwcmV2aW91cyB2YWx1ZSBpcyBub3QsXG4gICAgLy8gb3IgaXMgYSBkaWZmZXJlbnQgVGVtcGxhdGUgYXMgdGhlIHByZXZpb3VzIHZhbHVlLCByZXN0b3JlIHRoZSBjaGlsZFxuICAgIC8vIHBhcnQgZnJvbSB0aGUgY2FjaGUuXG4gICAgaWYgKHZLZXkgIT09IG51bGwpIHtcbiAgICAgIGlmIChfdmFsdWVLZXkgPT09IG51bGwgfHwgX3ZhbHVlS2V5ICE9PSB2S2V5KSB7XG4gICAgICAgIGNvbnN0IGNhY2hlZENvbnRhaW5lclBhcnQgPSB0aGlzLl90ZW1wbGF0ZUNhY2hlLmdldCh2S2V5KTtcbiAgICAgICAgaWYgKGNhY2hlZENvbnRhaW5lclBhcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhY2hlZCBwYXJ0IGJhY2sgaW50byB0aGUgY29udGFpbmVyIHBhcnQgdmFsdWVcbiAgICAgICAgICBjb25zdCBwYXJ0VmFsdWUgPSBnZXRDb21taXR0ZWRWYWx1ZShcbiAgICAgICAgICAgIGNhY2hlZENvbnRhaW5lclBhcnRcbiAgICAgICAgICApIGFzIEFycmF5PENoaWxkUGFydD47XG4gICAgICAgICAgY29uc3QgY2FjaGVkUGFydCA9IHBhcnRWYWx1ZS5wb3AoKSE7XG4gICAgICAgICAgLy8gTW92ZSBjYWNoZWQgcGFydCBiYWNrIGludG8gRE9NXG4gICAgICAgICAgY2xlYXJQYXJ0KGNvbnRhaW5lclBhcnQpO1xuICAgICAgICAgIGluc2VydFBhcnQoY29udGFpbmVyUGFydCwgdW5kZWZpbmVkLCBjYWNoZWRQYXJ0KTtcbiAgICAgICAgICBzZXRDb21taXR0ZWRWYWx1ZShjb250YWluZXJQYXJ0LCBbY2FjaGVkUGFydF0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBCZWNhdXNlIHZLZXkgaXMgbm9uIG51bGwsIHYgbXVzdCBiZSBhIFRlbXBsYXRlUmVzdWx0LlxuICAgICAgdGhpcy5fdmFsdWUgPSB2IGFzIFRlbXBsYXRlUmVzdWx0IHwgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fdmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlbmRlcih2KTtcbiAgfVxufVxuXG4vKipcbiAqIEVuYWJsZXMgZmFzdCBzd2l0Y2hpbmcgYmV0d2VlbiBtdWx0aXBsZSB0ZW1wbGF0ZXMgYnkgY2FjaGluZyB0aGUgRE9NIG5vZGVzXG4gKiBhbmQgVGVtcGxhdGVJbnN0YW5jZXMgcHJvZHVjZWQgYnkgdGhlIHRlbXBsYXRlcy5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBsZXQgY2hlY2tlZCA9IGZhbHNlO1xuICpcbiAqIGh0bWxgXG4gKiAgICR7Y2FjaGUoY2hlY2tlZCA/IGh0bWxgaW5wdXQgaXMgY2hlY2tlZGAgOiBodG1sYGlucHV0IGlzIG5vdCBjaGVja2VkYCl9XG4gKiBgXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGNhY2hlID0gZGlyZWN0aXZlKENhY2hlRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtDYWNoZURpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLyoqXG4gKiBDaG9vc2VzIGFuZCBldmFsdWF0ZXMgYSB0ZW1wbGF0ZSBmdW5jdGlvbiBmcm9tIGEgbGlzdCBiYXNlZCBvbiBtYXRjaGluZ1xuICogdGhlIGdpdmVuIGB2YWx1ZWAgdG8gYSBjYXNlLlxuICpcbiAqIENhc2VzIGFyZSBzdHJ1Y3R1cmVkIGFzIGBbY2FzZVZhbHVlLCBmdW5jXWAuIGB2YWx1ZWAgaXMgbWF0Y2hlZCB0b1xuICogYGNhc2VWYWx1ZWAgYnkgc3RyaWN0IGVxdWFsaXR5LiBUaGUgZmlyc3QgbWF0Y2ggaXMgc2VsZWN0ZWQuIENhc2UgdmFsdWVzXG4gKiBjYW4gYmUgb2YgYW55IHR5cGUgaW5jbHVkaW5nIHByaW1pdGl2ZXMsIG9iamVjdHMsIGFuZCBzeW1ib2xzLlxuICpcbiAqIFRoaXMgaXMgc2ltaWxhciB0byBhIHN3aXRjaCBzdGF0ZW1lbnQsIGJ1dCBhcyBhbiBleHByZXNzaW9uIGFuZCB3aXRob3V0XG4gKiBmYWxsdGhyb3VnaC5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiByZW5kZXIoKSB7XG4gKiAgIHJldHVybiBodG1sYFxuICogICAgICR7Y2hvb3NlKHRoaXMuc2VjdGlvbiwgW1xuICogICAgICAgWydob21lJywgKCkgPT4gaHRtbGA8aDE+SG9tZTwvaDE+YF0sXG4gKiAgICAgICBbJ2Fib3V0JywgKCkgPT4gaHRtbGA8aDE+QWJvdXQ8L2gxPmBdXG4gKiAgICAgXSxcbiAqICAgICAoKSA9PiBodG1sYDxoMT5FcnJvcjwvaDE+YCl9XG4gKiAgIGA7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGNob29zZSA9IDxULCBWLCBLIGV4dGVuZHMgVCA9IFQ+KFxuICB2YWx1ZTogVCxcbiAgY2FzZXM6IEFycmF5PFtLLCAoKSA9PiBWXT4sXG4gIGRlZmF1bHRDYXNlPzogKCkgPT4gVlxuKSA9PiB7XG4gIGZvciAoY29uc3QgYyBvZiBjYXNlcykge1xuICAgIGNvbnN0IGNhc2VWYWx1ZSA9IGNbMF07XG4gICAgaWYgKGNhc2VWYWx1ZSA9PT0gdmFsdWUpIHtcbiAgICAgIGNvbnN0IGZuID0gY1sxXTtcbiAgICAgIHJldHVybiBmbigpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVmYXVsdENhc2U/LigpO1xufTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0F0dHJpYnV0ZVBhcnQsIG5vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBkaXJlY3RpdmUsXG4gIERpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbiAgUGFydEluZm8sXG4gIFBhcnRUeXBlLFxufSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuXG4vKipcbiAqIEEga2V5LXZhbHVlIHNldCBvZiBjbGFzcyBuYW1lcyB0byB0cnV0aHkgdmFsdWVzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENsYXNzSW5mbyB7XG4gIHJlYWRvbmx5IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfCBib29sZWFuIHwgbnVtYmVyO1xufVxuXG5jbGFzcyBDbGFzc01hcERpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIC8qKlxuICAgKiBTdG9yZXMgdGhlIENsYXNzSW5mbyBvYmplY3QgYXBwbGllZCB0byBhIGdpdmVuIEF0dHJpYnV0ZVBhcnQuXG4gICAqIFVzZWQgdG8gdW5zZXQgZXhpc3RpbmcgdmFsdWVzIHdoZW4gYSBuZXcgQ2xhc3NJbmZvIG9iamVjdCBpcyBhcHBsaWVkLlxuICAgKi9cbiAgcHJpdmF0ZSBfcHJldmlvdXNDbGFzc2VzPzogU2V0PHN0cmluZz47XG4gIHByaXZhdGUgX3N0YXRpY0NsYXNzZXM/OiBTZXQ8c3RyaW5nPjtcblxuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gICAgaWYgKFxuICAgICAgcGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQVRUUklCVVRFIHx8XG4gICAgICBwYXJ0SW5mby5uYW1lICE9PSAnY2xhc3MnIHx8XG4gICAgICAocGFydEluZm8uc3RyaW5ncz8ubGVuZ3RoIGFzIG51bWJlcikgPiAyXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdgY2xhc3NNYXAoKWAgY2FuIG9ubHkgYmUgdXNlZCBpbiB0aGUgYGNsYXNzYCBhdHRyaWJ1dGUgJyArXG4gICAgICAgICAgJ2FuZCBtdXN0IGJlIHRoZSBvbmx5IHBhcnQgaW4gdGhlIGF0dHJpYnV0ZS4nXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlcihjbGFzc0luZm86IENsYXNzSW5mbykge1xuICAgIC8vIEFkZCBzcGFjZXMgdG8gZW5zdXJlIHNlcGFyYXRpb24gZnJvbSBzdGF0aWMgY2xhc3Nlc1xuICAgIHJldHVybiAoXG4gICAgICAnICcgK1xuICAgICAgT2JqZWN0LmtleXMoY2xhc3NJbmZvKVxuICAgICAgICAuZmlsdGVyKChrZXkpID0+IGNsYXNzSW5mb1trZXldKVxuICAgICAgICAuam9pbignICcpICtcbiAgICAgICcgJ1xuICAgICk7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUocGFydDogQXR0cmlidXRlUGFydCwgW2NsYXNzSW5mb106IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICAvLyBSZW1lbWJlciBkeW5hbWljIGNsYXNzZXMgb24gdGhlIGZpcnN0IHJlbmRlclxuICAgIGlmICh0aGlzLl9wcmV2aW91c0NsYXNzZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fcHJldmlvdXNDbGFzc2VzID0gbmV3IFNldCgpO1xuICAgICAgaWYgKHBhcnQuc3RyaW5ncyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX3N0YXRpY0NsYXNzZXMgPSBuZXcgU2V0KFxuICAgICAgICAgIHBhcnQuc3RyaW5nc1xuICAgICAgICAgICAgLmpvaW4oJyAnKVxuICAgICAgICAgICAgLnNwbGl0KC9cXHMvKVxuICAgICAgICAgICAgLmZpbHRlcigocykgPT4gcyAhPT0gJycpXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IG5hbWUgaW4gY2xhc3NJbmZvKSB7XG4gICAgICAgIGlmIChjbGFzc0luZm9bbmFtZV0gJiYgIXRoaXMuX3N0YXRpY0NsYXNzZXM/LmhhcyhuYW1lKSkge1xuICAgICAgICAgIHRoaXMuX3ByZXZpb3VzQ2xhc3Nlcy5hZGQobmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnJlbmRlcihjbGFzc0luZm8pO1xuICAgIH1cblxuICAgIGNvbnN0IGNsYXNzTGlzdCA9IHBhcnQuZWxlbWVudC5jbGFzc0xpc3Q7XG5cbiAgICAvLyBSZW1vdmUgb2xkIGNsYXNzZXMgdGhhdCBubyBsb25nZXIgYXBwbHlcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgdGhpcy5fcHJldmlvdXNDbGFzc2VzKSB7XG4gICAgICBpZiAoIShuYW1lIGluIGNsYXNzSW5mbykpIHtcbiAgICAgICAgY2xhc3NMaXN0LnJlbW92ZShuYW1lKTtcbiAgICAgICAgdGhpcy5fcHJldmlvdXNDbGFzc2VzIS5kZWxldGUobmFtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWRkIG9yIHJlbW92ZSBjbGFzc2VzIGJhc2VkIG9uIHRoZWlyIGNsYXNzTWFwIHZhbHVlXG4gICAgZm9yIChjb25zdCBuYW1lIGluIGNsYXNzSW5mbykge1xuICAgICAgLy8gV2UgZXhwbGljaXRseSB3YW50IGEgbG9vc2UgdHJ1dGh5IGNoZWNrIG9mIGB2YWx1ZWAgYmVjYXVzZSBpdCBzZWVtc1xuICAgICAgLy8gbW9yZSBjb252ZW5pZW50IHRoYXQgJycgYW5kIDAgYXJlIHNraXBwZWQuXG4gICAgICBjb25zdCB2YWx1ZSA9ICEhY2xhc3NJbmZvW25hbWVdO1xuICAgICAgaWYgKFxuICAgICAgICB2YWx1ZSAhPT0gdGhpcy5fcHJldmlvdXNDbGFzc2VzLmhhcyhuYW1lKSAmJlxuICAgICAgICAhdGhpcy5fc3RhdGljQ2xhc3Nlcz8uaGFzKG5hbWUpXG4gICAgICApIHtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgY2xhc3NMaXN0LmFkZChuYW1lKTtcbiAgICAgICAgICB0aGlzLl9wcmV2aW91c0NsYXNzZXMuYWRkKG5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgICAgICAgdGhpcy5fcHJldmlvdXNDbGFzc2VzLmRlbGV0ZShuYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGRpcmVjdGl2ZSB0aGF0IGFwcGxpZXMgZHluYW1pYyBDU1MgY2xhc3Nlcy5cbiAqXG4gKiBUaGlzIG11c3QgYmUgdXNlZCBpbiB0aGUgYGNsYXNzYCBhdHRyaWJ1dGUgYW5kIG11c3QgYmUgdGhlIG9ubHkgcGFydCB1c2VkIGluXG4gKiB0aGUgYXR0cmlidXRlLiBJdCB0YWtlcyBlYWNoIHByb3BlcnR5IGluIHRoZSBgY2xhc3NJbmZvYCBhcmd1bWVudCBhbmQgYWRkc1xuICogdGhlIHByb3BlcnR5IG5hbWUgdG8gdGhlIGVsZW1lbnQncyBgY2xhc3NMaXN0YCBpZiB0aGUgcHJvcGVydHkgdmFsdWUgaXNcbiAqIHRydXRoeTsgaWYgdGhlIHByb3BlcnR5IHZhbHVlIGlzIGZhbHN5LCB0aGUgcHJvcGVydHkgbmFtZSBpcyByZW1vdmVkIGZyb21cbiAqIHRoZSBlbGVtZW50J3MgYGNsYXNzYC5cbiAqXG4gKiBGb3IgZXhhbXBsZSBge2ZvbzogYmFyfWAgYXBwbGllcyB0aGUgY2xhc3MgYGZvb2AgaWYgdGhlIHZhbHVlIG9mIGBiYXJgIGlzXG4gKiB0cnV0aHkuXG4gKlxuICogQHBhcmFtIGNsYXNzSW5mb1xuICovXG5leHBvcnQgY29uc3QgY2xhc3NNYXAgPSBkaXJlY3RpdmUoQ2xhc3NNYXBEaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge0NsYXNzTWFwRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge25vQ2hhbmdlLCBQYXJ0fSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgRGlyZWN0aXZlLCBEaXJlY3RpdmVQYXJhbWV0ZXJzfSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuXG4vLyBBIHNlbnRpbmVsIHRoYXQgaW5kaWNhdGVzIGd1YXJkKCkgaGFzbid0IHJlbmRlcmVkIGFueXRoaW5nIHlldFxuY29uc3QgaW5pdGlhbFZhbHVlID0ge307XG5cbmNsYXNzIEd1YXJkRGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgcHJpdmF0ZSBfcHJldmlvdXNWYWx1ZTogdW5rbm93biA9IGluaXRpYWxWYWx1ZTtcblxuICByZW5kZXIoX3ZhbHVlOiB1bmtub3duLCBmOiAoKSA9PiB1bmtub3duKSB7XG4gICAgcmV0dXJuIGYoKTtcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShfcGFydDogUGFydCwgW3ZhbHVlLCBmXTogRGlyZWN0aXZlUGFyYW1ldGVyczx0aGlzPikge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgLy8gRGlydHktY2hlY2sgYXJyYXlzIGJ5IGl0ZW1cbiAgICAgIGlmIChcbiAgICAgICAgQXJyYXkuaXNBcnJheSh0aGlzLl9wcmV2aW91c1ZhbHVlKSAmJlxuICAgICAgICB0aGlzLl9wcmV2aW91c1ZhbHVlLmxlbmd0aCA9PT0gdmFsdWUubGVuZ3RoICYmXG4gICAgICAgIHZhbHVlLmV2ZXJ5KCh2LCBpKSA9PiB2ID09PSAodGhpcy5fcHJldmlvdXNWYWx1ZSBhcyBBcnJheTx1bmtub3duPilbaV0pXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIG5vQ2hhbmdlO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy5fcHJldmlvdXNWYWx1ZSA9PT0gdmFsdWUpIHtcbiAgICAgIC8vIERpcnR5LWNoZWNrIG5vbi1hcnJheXMgYnkgaWRlbnRpdHlcbiAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICB9XG5cbiAgICAvLyBDb3B5IHRoZSB2YWx1ZSBpZiBpdCdzIGFuIGFycmF5IHNvIHRoYXQgaWYgaXQncyBtdXRhdGVkIHdlIGRvbid0IGZvcmdldFxuICAgIC8vIHdoYXQgdGhlIHByZXZpb3VzIHZhbHVlcyB3ZXJlLlxuICAgIHRoaXMuX3ByZXZpb3VzVmFsdWUgPSBBcnJheS5pc0FycmF5KHZhbHVlKSA/IEFycmF5LmZyb20odmFsdWUpIDogdmFsdWU7XG4gICAgY29uc3QgciA9IHRoaXMucmVuZGVyKHZhbHVlLCBmKTtcbiAgICByZXR1cm4gcjtcbiAgfVxufVxuXG4vKipcbiAqIFByZXZlbnRzIHJlLXJlbmRlciBvZiBhIHRlbXBsYXRlIGZ1bmN0aW9uIHVudGlsIGEgc2luZ2xlIHZhbHVlIG9yIGFuIGFycmF5IG9mXG4gKiB2YWx1ZXMgY2hhbmdlcy5cbiAqXG4gKiBWYWx1ZXMgYXJlIGNoZWNrZWQgYWdhaW5zdCBwcmV2aW91cyB2YWx1ZXMgd2l0aCBzdHJpY3QgZXF1YWxpdHkgKGA9PT1gKSwgYW5kXG4gKiBzbyB0aGUgY2hlY2sgd29uJ3QgZGV0ZWN0IG5lc3RlZCBwcm9wZXJ0eSBjaGFuZ2VzIGluc2lkZSBvYmplY3RzIG9yIGFycmF5cy5cbiAqIEFycmF5cyB2YWx1ZXMgaGF2ZSBlYWNoIGl0ZW0gY2hlY2tlZCBhZ2FpbnN0IHRoZSBwcmV2aW91cyB2YWx1ZSBhdCB0aGUgc2FtZVxuICogaW5kZXggd2l0aCBzdHJpY3QgZXF1YWxpdHkuIE5lc3RlZCBhcnJheXMgYXJlIGFsc28gY2hlY2tlZCBvbmx5IGJ5IHN0cmljdFxuICogZXF1YWxpdHkuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogaHRtbGBcbiAqICAgPGRpdj5cbiAqICAgICAke2d1YXJkKFt1c2VyLmlkLCBjb21wYW55LmlkXSwgKCkgPT4gaHRtbGAuLi5gKX1cbiAqICAgPC9kaXY+XG4gKiBgXG4gKiBgYGBcbiAqXG4gKiBJbiB0aGlzIGNhc2UsIHRoZSB0ZW1wbGF0ZSBvbmx5IHJlcmVuZGVycyBpZiBlaXRoZXIgYHVzZXIuaWRgIG9yIGBjb21wYW55LmlkYFxuICogY2hhbmdlcy5cbiAqXG4gKiBndWFyZCgpIGlzIHVzZWZ1bCB3aXRoIGltbXV0YWJsZSBkYXRhIHBhdHRlcm5zLCBieSBwcmV2ZW50aW5nIGV4cGVuc2l2ZSB3b3JrXG4gKiB1bnRpbCBkYXRhIHVwZGF0ZXMuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogaHRtbGBcbiAqICAgPGRpdj5cbiAqICAgICAke2d1YXJkKFtpbW11dGFibGVJdGVtc10sICgpID0+IGltbXV0YWJsZUl0ZW1zLm1hcChpID0+IGh0bWxgJHtpfWApKX1cbiAqICAgPC9kaXY+XG4gKiBgXG4gKiBgYGBcbiAqXG4gKiBJbiB0aGlzIGNhc2UsIGl0ZW1zIGFyZSBtYXBwZWQgb3ZlciBvbmx5IHdoZW4gdGhlIGFycmF5IHJlZmVyZW5jZSBjaGFuZ2VzLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSB0aGUgdmFsdWUgdG8gY2hlY2sgYmVmb3JlIHJlLXJlbmRlcmluZ1xuICogQHBhcmFtIGYgdGhlIHRlbXBsYXRlIGZ1bmN0aW9uXG4gKi9cbmV4cG9ydCBjb25zdCBndWFyZCA9IGRpcmVjdGl2ZShHdWFyZERpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7R3VhcmREaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTggR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7bm90aGluZ30gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuXG4vKipcbiAqIEZvciBBdHRyaWJ1dGVQYXJ0cywgc2V0cyB0aGUgYXR0cmlidXRlIGlmIHRoZSB2YWx1ZSBpcyBkZWZpbmVkIGFuZCByZW1vdmVzXG4gKiB0aGUgYXR0cmlidXRlIGlmIHRoZSB2YWx1ZSBpcyB1bmRlZmluZWQuXG4gKlxuICogRm9yIG90aGVyIHBhcnQgdHlwZXMsIHRoaXMgZGlyZWN0aXZlIGlzIGEgbm8tb3AuXG4gKi9cbmV4cG9ydCBjb25zdCBpZkRlZmluZWQgPSA8VD4odmFsdWU6IFQpID0+IHZhbHVlID8/IG5vdGhpbmc7XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLyoqXG4gKiBSZXR1cm5zIGFuIGl0ZXJhYmxlIGNvbnRhaW5pbmcgdGhlIHZhbHVlcyBpbiBgaXRlbXNgIGludGVybGVhdmVkIHdpdGggdGhlXG4gKiBgam9pbmVyYCB2YWx1ZS5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiByZW5kZXIoKSB7XG4gKiAgIHJldHVybiBodG1sYFxuICogICAgICR7am9pbihpdGVtcywgaHRtbGA8c3BhbiBjbGFzcz1cInNlcGFyYXRvclwiPnw8L3NwYW4+YCl9XG4gKiAgIGA7XG4gKiB9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBqb2luPEksIEo+KFxuICBpdGVtczogSXRlcmFibGU8ST4gfCB1bmRlZmluZWQsXG4gIGpvaW5lcjogKGluZGV4OiBudW1iZXIpID0+IEpcbik6IEl0ZXJhYmxlPEkgfCBKPjtcbmV4cG9ydCBmdW5jdGlvbiBqb2luPEksIEo+KFxuICBpdGVtczogSXRlcmFibGU8ST4gfCB1bmRlZmluZWQsXG4gIGpvaW5lcjogSlxuKTogSXRlcmFibGU8SSB8IEo+O1xuZXhwb3J0IGZ1bmN0aW9uKiBqb2luPEksIEo+KGl0ZW1zOiBJdGVyYWJsZTxJPiB8IHVuZGVmaW5lZCwgam9pbmVyOiBKKSB7XG4gIGNvbnN0IGlzRnVuY3Rpb24gPSB0eXBlb2Ygam9pbmVyID09PSAnZnVuY3Rpb24nO1xuICBpZiAoaXRlbXMgIT09IHVuZGVmaW5lZCkge1xuICAgIGxldCBpID0gLTE7XG4gICAgZm9yIChjb25zdCB2YWx1ZSBvZiBpdGVtcykge1xuICAgICAgaWYgKGkgPiAtMSkge1xuICAgICAgICB5aWVsZCBpc0Z1bmN0aW9uID8gam9pbmVyKGkpIDogam9pbmVyO1xuICAgICAgfVxuICAgICAgaSsrO1xuICAgICAgeWllbGQgdmFsdWU7XG4gICAgfVxuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtub3RoaW5nfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBkaXJlY3RpdmUsXG4gIERpcmVjdGl2ZSxcbiAgQ2hpbGRQYXJ0LFxuICBEaXJlY3RpdmVQYXJhbWV0ZXJzLFxufSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtzZXRDb21taXR0ZWRWYWx1ZX0gZnJvbSAnLi4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuXG5jbGFzcyBLZXllZCBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIGtleTogdW5rbm93biA9IG5vdGhpbmc7XG5cbiAgcmVuZGVyKGs6IHVua25vd24sIHY6IHVua25vd24pIHtcbiAgICB0aGlzLmtleSA9IGs7XG4gICAgcmV0dXJuIHY7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUocGFydDogQ2hpbGRQYXJ0LCBbaywgdl06IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICBpZiAoayAhPT0gdGhpcy5rZXkpIHtcbiAgICAgIC8vIENsZWFyIHRoZSBwYXJ0IGJlZm9yZSByZXR1cm5pbmcgYSB2YWx1ZS4gVGhlIG9uZS1hcmcgZm9ybSBvZlxuICAgICAgLy8gc2V0Q29tbWl0dGVkVmFsdWUgc2V0cyB0aGUgdmFsdWUgdG8gYSBzZW50aW5lbCB3aGljaCBmb3JjZXMgYVxuICAgICAgLy8gY29tbWl0IHRoZSBuZXh0IHJlbmRlci5cbiAgICAgIHNldENvbW1pdHRlZFZhbHVlKHBhcnQpO1xuICAgICAgdGhpcy5rZXkgPSBrO1xuICAgIH1cbiAgICByZXR1cm4gdjtcbiAgfVxufVxuXG4vKipcbiAqIEFzc29jaWF0ZXMgYSByZW5kZXJhYmxlIHZhbHVlIHdpdGggYSB1bmlxdWUga2V5LiBXaGVuIHRoZSBrZXkgY2hhbmdlcywgdGhlXG4gKiBwcmV2aW91cyBET00gaXMgcmVtb3ZlZCBhbmQgZGlzcG9zZWQgYmVmb3JlIHJlbmRlcmluZyB0aGUgbmV4dCB2YWx1ZSwgZXZlblxuICogaWYgdGhlIHZhbHVlIC0gc3VjaCBhcyBhIHRlbXBsYXRlIC0gaXMgdGhlIHNhbWUuXG4gKlxuICogVGhpcyBpcyB1c2VmdWwgZm9yIGZvcmNpbmcgcmUtcmVuZGVycyBvZiBzdGF0ZWZ1bCBjb21wb25lbnRzLCBvciB3b3JraW5nXG4gKiB3aXRoIGNvZGUgdGhhdCBleHBlY3RzIG5ldyBkYXRhIHRvIGdlbmVyYXRlIG5ldyBIVE1MIGVsZW1lbnRzLCBzdWNoIGFzIHNvbWVcbiAqIGFuaW1hdGlvbiB0ZWNobmlxdWVzLlxuICovXG5leHBvcnQgY29uc3Qga2V5ZWQgPSBkaXJlY3RpdmUoS2V5ZWQpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge0tleWVkfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0F0dHJpYnV0ZVBhcnQsIG5vQ2hhbmdlLCBub3RoaW5nfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBkaXJlY3RpdmUsXG4gIERpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbiAgUGFydEluZm8sXG4gIFBhcnRUeXBlLFxufSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtpc1NpbmdsZUV4cHJlc3Npb24sIHNldENvbW1pdHRlZFZhbHVlfSBmcm9tICcuLi9kaXJlY3RpdmUtaGVscGVycy5qcyc7XG5cbmNsYXNzIExpdmVEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gICAgaWYgKFxuICAgICAgIShcbiAgICAgICAgcGFydEluZm8udHlwZSA9PT0gUGFydFR5cGUuUFJPUEVSVFkgfHxcbiAgICAgICAgcGFydEluZm8udHlwZSA9PT0gUGFydFR5cGUuQVRUUklCVVRFIHx8XG4gICAgICAgIHBhcnRJbmZvLnR5cGUgPT09IFBhcnRUeXBlLkJPT0xFQU5fQVRUUklCVVRFXG4gICAgICApXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdUaGUgYGxpdmVgIGRpcmVjdGl2ZSBpcyBub3QgYWxsb3dlZCBvbiBjaGlsZCBvciBldmVudCBiaW5kaW5ncydcbiAgICAgICk7XG4gICAgfVxuICAgIGlmICghaXNTaW5nbGVFeHByZXNzaW9uKHBhcnRJbmZvKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdgbGl2ZWAgYmluZGluZ3MgY2FuIG9ubHkgY29udGFpbiBhIHNpbmdsZSBleHByZXNzaW9uJyk7XG4gICAgfVxuICB9XG5cbiAgcmVuZGVyKHZhbHVlOiB1bmtub3duKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IEF0dHJpYnV0ZVBhcnQsIFt2YWx1ZV06IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICBpZiAodmFsdWUgPT09IG5vQ2hhbmdlIHx8IHZhbHVlID09PSBub3RoaW5nKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIGNvbnN0IGVsZW1lbnQgPSBwYXJ0LmVsZW1lbnQ7XG4gICAgY29uc3QgbmFtZSA9IHBhcnQubmFtZTtcblxuICAgIGlmIChwYXJ0LnR5cGUgPT09IFBhcnRUeXBlLlBST1BFUlRZKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgaWYgKHZhbHVlID09PSAoZWxlbWVudCBhcyBhbnkpW25hbWVdKSB7XG4gICAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHBhcnQudHlwZSA9PT0gUGFydFR5cGUuQk9PTEVBTl9BVFRSSUJVVEUpIHtcbiAgICAgIGlmICghIXZhbHVlID09PSBlbGVtZW50Lmhhc0F0dHJpYnV0ZShuYW1lKSkge1xuICAgICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChwYXJ0LnR5cGUgPT09IFBhcnRUeXBlLkFUVFJJQlVURSkge1xuICAgICAgaWYgKGVsZW1lbnQuZ2V0QXR0cmlidXRlKG5hbWUpID09PSBTdHJpbmcodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gUmVzZXRzIHRoZSBwYXJ0J3MgdmFsdWUsIGNhdXNpbmcgaXRzIGRpcnR5LWNoZWNrIHRvIGZhaWwgc28gdGhhdCBpdFxuICAgIC8vIGFsd2F5cyBzZXRzIHRoZSB2YWx1ZS5cbiAgICBzZXRDb21taXR0ZWRWYWx1ZShwYXJ0KTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn1cblxuLyoqXG4gKiBDaGVja3MgYmluZGluZyB2YWx1ZXMgYWdhaW5zdCBsaXZlIERPTSB2YWx1ZXMsIGluc3RlYWQgb2YgcHJldmlvdXNseSBib3VuZFxuICogdmFsdWVzLCB3aGVuIGRldGVybWluaW5nIHdoZXRoZXIgdG8gdXBkYXRlIHRoZSB2YWx1ZS5cbiAqXG4gKiBUaGlzIGlzIHVzZWZ1bCBmb3IgY2FzZXMgd2hlcmUgdGhlIERPTSB2YWx1ZSBtYXkgY2hhbmdlIGZyb20gb3V0c2lkZSBvZlxuICogbGl0LWh0bWwsIHN1Y2ggYXMgd2l0aCBhIGJpbmRpbmcgdG8gYW4gYDxpbnB1dD5gIGVsZW1lbnQncyBgdmFsdWVgIHByb3BlcnR5LFxuICogYSBjb250ZW50IGVkaXRhYmxlIGVsZW1lbnRzIHRleHQsIG9yIHRvIGEgY3VzdG9tIGVsZW1lbnQgdGhhdCBjaGFuZ2VzIGl0J3NcbiAqIG93biBwcm9wZXJ0aWVzIG9yIGF0dHJpYnV0ZXMuXG4gKlxuICogSW4gdGhlc2UgY2FzZXMgaWYgdGhlIERPTSB2YWx1ZSBjaGFuZ2VzLCBidXQgdGhlIHZhbHVlIHNldCB0aHJvdWdoIGxpdC1odG1sXG4gKiBiaW5kaW5ncyBoYXNuJ3QsIGxpdC1odG1sIHdvbid0IGtub3cgdG8gdXBkYXRlIHRoZSBET00gdmFsdWUgYW5kIHdpbGwgbGVhdmVcbiAqIGl0IGFsb25lLiBJZiB0aGlzIGlzIG5vdCB3aGF0IHlvdSB3YW50LS1pZiB5b3Ugd2FudCB0byBvdmVyd3JpdGUgdGhlIERPTVxuICogdmFsdWUgd2l0aCB0aGUgYm91bmQgdmFsdWUgbm8gbWF0dGVyIHdoYXQtLXVzZSB0aGUgYGxpdmUoKWAgZGlyZWN0aXZlOlxuICpcbiAqIGBgYGpzXG4gKiBodG1sYDxpbnB1dCAudmFsdWU9JHtsaXZlKHgpfT5gXG4gKiBgYGBcbiAqXG4gKiBgbGl2ZSgpYCBwZXJmb3JtcyBhIHN0cmljdCBlcXVhbGl0eSBjaGVjayBhZ2FpbnN0IHRoZSBsaXZlIERPTSB2YWx1ZSwgYW5kIGlmXG4gKiB0aGUgbmV3IHZhbHVlIGlzIGVxdWFsIHRvIHRoZSBsaXZlIHZhbHVlLCBkb2VzIG5vdGhpbmcuIFRoaXMgbWVhbnMgdGhhdFxuICogYGxpdmUoKWAgc2hvdWxkIG5vdCBiZSB1c2VkIHdoZW4gdGhlIGJpbmRpbmcgd2lsbCBjYXVzZSBhIHR5cGUgY29udmVyc2lvbi4gSWZcbiAqIHlvdSB1c2UgYGxpdmUoKWAgd2l0aCBhbiBhdHRyaWJ1dGUgYmluZGluZywgbWFrZSBzdXJlIHRoYXQgb25seSBzdHJpbmdzIGFyZVxuICogcGFzc2VkIGluLCBvciB0aGUgYmluZGluZyB3aWxsIHVwZGF0ZSBldmVyeSByZW5kZXIuXG4gKi9cbmV4cG9ydCBjb25zdCBsaXZlID0gZGlyZWN0aXZlKExpdmVEaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge0xpdmVEaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjEgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbi8qKlxuICogUmV0dXJucyBhbiBpdGVyYWJsZSBjb250YWluaW5nIHRoZSByZXN1bHQgb2YgY2FsbGluZyBgZih2YWx1ZSlgIG9uIGVhY2hcbiAqIHZhbHVlIGluIGBpdGVtc2AuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogcmVuZGVyKCkge1xuICogICByZXR1cm4gaHRtbGBcbiAqICAgICA8dWw+XG4gKiAgICAgICAke21hcChpdGVtcywgKGkpID0+IGh0bWxgPGxpPiR7aX08L2xpPmApfVxuICogICAgIDwvdWw+XG4gKiAgIGA7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uKiBtYXA8VD4oXG4gIGl0ZW1zOiBJdGVyYWJsZTxUPiB8IHVuZGVmaW5lZCxcbiAgZjogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyKSA9PiB1bmtub3duXG4pIHtcbiAgaWYgKGl0ZW1zICE9PSB1bmRlZmluZWQpIHtcbiAgICBsZXQgaSA9IDA7XG4gICAgZm9yIChjb25zdCB2YWx1ZSBvZiBpdGVtcykge1xuICAgICAgeWllbGQgZih2YWx1ZSwgaSsrKTtcbiAgICB9XG4gIH1cbn1cbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIxIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG4vKipcbiAqIFJldHVybnMgYW4gaXRlcmFibGUgb2YgaW50ZWdlcnMgZnJvbSBgc3RhcnRgIHRvIGBlbmRgIChleGNsdXNpdmUpXG4gKiBpbmNyZW1lbnRpbmcgYnkgYHN0ZXBgLlxuICpcbiAqIElmIGBzdGFydGAgaXMgb21pdHRlZCwgdGhlIHJhbmdlIHN0YXJ0cyBhdCBgMGAuIGBzdGVwYCBkZWZhdWx0cyB0byBgMWAuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogcmVuZGVyKCkge1xuICogICByZXR1cm4gaHRtbGBcbiAqICAgICAke21hcChyYW5nZSg4KSwgKCkgPT4gaHRtbGA8ZGl2IGNsYXNzPVwiY2VsbFwiPjwvZGl2PmApfVxuICogICBgO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5nZShlbmQ6IG51bWJlcik6IEl0ZXJhYmxlPG51bWJlcj47XG5leHBvcnQgZnVuY3Rpb24gcmFuZ2UoXG4gIHN0YXJ0OiBudW1iZXIsXG4gIGVuZDogbnVtYmVyLFxuICBzdGVwPzogbnVtYmVyXG4pOiBJdGVyYWJsZTxudW1iZXI+O1xuZXhwb3J0IGZ1bmN0aW9uKiByYW5nZShzdGFydE9yRW5kOiBudW1iZXIsIGVuZD86IG51bWJlciwgc3RlcCA9IDEpIHtcbiAgY29uc3Qgc3RhcnQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IDAgOiBzdGFydE9yRW5kO1xuICBlbmQgPz89IHN0YXJ0T3JFbmQ7XG4gIGZvciAobGV0IGkgPSBzdGFydDsgc3RlcCA+IDAgPyBpIDwgZW5kIDogZW5kIDwgaTsgaSArPSBzdGVwKSB7XG4gICAgeWllbGQgaTtcbiAgfVxufVxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7Q2hpbGRQYXJ0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIERpcmVjdGl2ZSwgUGFydEluZm8sIFBhcnRUeXBlfSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtcbiAgaW5zZXJ0UGFydCxcbiAgZ2V0Q29tbWl0dGVkVmFsdWUsXG4gIHJlbW92ZVBhcnQsXG4gIHNldENvbW1pdHRlZFZhbHVlLFxuICBzZXRDaGlsZFBhcnRWYWx1ZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuXG5leHBvcnQgdHlwZSBLZXlGbjxUPiA9IChpdGVtOiBULCBpbmRleDogbnVtYmVyKSA9PiB1bmtub3duO1xuZXhwb3J0IHR5cGUgSXRlbVRlbXBsYXRlPFQ+ID0gKGl0ZW06IFQsIGluZGV4OiBudW1iZXIpID0+IHVua25vd247XG5cbi8vIEhlbHBlciBmb3IgZ2VuZXJhdGluZyBhIG1hcCBvZiBhcnJheSBpdGVtIHRvIGl0cyBpbmRleCBvdmVyIGEgc3Vic2V0XG4vLyBvZiBhbiBhcnJheSAodXNlZCB0byBsYXppbHkgZ2VuZXJhdGUgYG5ld0tleVRvSW5kZXhNYXBgIGFuZFxuLy8gYG9sZEtleVRvSW5kZXhNYXBgKVxuY29uc3QgZ2VuZXJhdGVNYXAgPSAobGlzdDogdW5rbm93bltdLCBzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlcikgPT4ge1xuICBjb25zdCBtYXAgPSBuZXcgTWFwPHVua25vd24sIG51bWJlcj4oKTtcbiAgZm9yIChsZXQgaSA9IHN0YXJ0OyBpIDw9IGVuZDsgaSsrKSB7XG4gICAgbWFwLnNldChsaXN0W2ldLCBpKTtcbiAgfVxuICByZXR1cm4gbWFwO1xufTtcblxuY2xhc3MgUmVwZWF0RGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgcHJpdmF0ZSBfaXRlbUtleXM/OiB1bmtub3duW107XG5cbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICAgIGlmIChwYXJ0SW5mby50eXBlICE9PSBQYXJ0VHlwZS5DSElMRCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdyZXBlYXQoKSBjYW4gb25seSBiZSB1c2VkIGluIHRleHQgZXhwcmVzc2lvbnMnKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9nZXRWYWx1ZXNBbmRLZXlzPFQ+KFxuICAgIGl0ZW1zOiBJdGVyYWJsZTxUPixcbiAgICBrZXlGbk9yVGVtcGxhdGU6IEtleUZuPFQ+IHwgSXRlbVRlbXBsYXRlPFQ+LFxuICAgIHRlbXBsYXRlPzogSXRlbVRlbXBsYXRlPFQ+XG4gICkge1xuICAgIGxldCBrZXlGbjogS2V5Rm48VD4gfCB1bmRlZmluZWQ7XG4gICAgaWYgKHRlbXBsYXRlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRlbXBsYXRlID0ga2V5Rm5PclRlbXBsYXRlO1xuICAgIH0gZWxzZSBpZiAoa2V5Rm5PclRlbXBsYXRlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGtleUZuID0ga2V5Rm5PclRlbXBsYXRlIGFzIEtleUZuPFQ+O1xuICAgIH1cbiAgICBjb25zdCBrZXlzID0gW107XG4gICAgY29uc3QgdmFsdWVzID0gW107XG4gICAgbGV0IGluZGV4ID0gMDtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgIGtleXNbaW5kZXhdID0ga2V5Rm4gPyBrZXlGbihpdGVtLCBpbmRleCkgOiBpbmRleDtcbiAgICAgIHZhbHVlc1tpbmRleF0gPSB0ZW1wbGF0ZSEoaXRlbSwgaW5kZXgpO1xuICAgICAgaW5kZXgrKztcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbHVlcyxcbiAgICAgIGtleXMsXG4gICAgfTtcbiAgfVxuXG4gIHJlbmRlcjxUPihpdGVtczogSXRlcmFibGU8VD4sIHRlbXBsYXRlOiBJdGVtVGVtcGxhdGU8VD4pOiBBcnJheTx1bmtub3duPjtcbiAgcmVuZGVyPFQ+KFxuICAgIGl0ZW1zOiBJdGVyYWJsZTxUPixcbiAgICBrZXlGbjogS2V5Rm48VD4gfCBJdGVtVGVtcGxhdGU8VD4sXG4gICAgdGVtcGxhdGU6IEl0ZW1UZW1wbGF0ZTxUPlxuICApOiBBcnJheTx1bmtub3duPjtcbiAgcmVuZGVyPFQ+KFxuICAgIGl0ZW1zOiBJdGVyYWJsZTxUPixcbiAgICBrZXlGbk9yVGVtcGxhdGU6IEtleUZuPFQ+IHwgSXRlbVRlbXBsYXRlPFQ+LFxuICAgIHRlbXBsYXRlPzogSXRlbVRlbXBsYXRlPFQ+XG4gICkge1xuICAgIHJldHVybiB0aGlzLl9nZXRWYWx1ZXNBbmRLZXlzKGl0ZW1zLCBrZXlGbk9yVGVtcGxhdGUsIHRlbXBsYXRlKS52YWx1ZXM7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGU8VD4oXG4gICAgY29udGFpbmVyUGFydDogQ2hpbGRQYXJ0LFxuICAgIFtpdGVtcywga2V5Rm5PclRlbXBsYXRlLCB0ZW1wbGF0ZV06IFtcbiAgICAgIEl0ZXJhYmxlPFQ+LFxuICAgICAgS2V5Rm48VD4gfCBJdGVtVGVtcGxhdGU8VD4sXG4gICAgICBJdGVtVGVtcGxhdGU8VD4sXG4gICAgXVxuICApIHtcbiAgICAvLyBPbGQgcGFydCAmIGtleSBsaXN0cyBhcmUgcmV0cmlldmVkIGZyb20gdGhlIGxhc3QgdXBkYXRlICh3aGljaCBtYXlcbiAgICAvLyBiZSBwcmltZWQgYnkgaHlkcmF0aW9uKVxuICAgIGNvbnN0IG9sZFBhcnRzID0gZ2V0Q29tbWl0dGVkVmFsdWUoXG4gICAgICBjb250YWluZXJQYXJ0XG4gICAgKSBhcyBBcnJheTxDaGlsZFBhcnQgfCBudWxsPjtcbiAgICBjb25zdCB7dmFsdWVzOiBuZXdWYWx1ZXMsIGtleXM6IG5ld0tleXN9ID0gdGhpcy5fZ2V0VmFsdWVzQW5kS2V5cyhcbiAgICAgIGl0ZW1zLFxuICAgICAga2V5Rm5PclRlbXBsYXRlLFxuICAgICAgdGVtcGxhdGVcbiAgICApO1xuXG4gICAgLy8gV2UgY2hlY2sgdGhhdCBvbGRQYXJ0cywgdGhlIGNvbW1pdHRlZCB2YWx1ZSwgaXMgYW4gQXJyYXkgYXMgYW5cbiAgICAvLyBpbmRpY2F0b3IgdGhhdCB0aGUgcHJldmlvdXMgdmFsdWUgY2FtZSBmcm9tIGEgcmVwZWF0KCkgY2FsbC4gSWZcbiAgICAvLyBvbGRQYXJ0cyBpcyBub3QgYW4gQXJyYXkgdGhlbiB0aGlzIGlzIHRoZSBmaXJzdCByZW5kZXIgYW5kIHdlIHJldHVyblxuICAgIC8vIGFuIGFycmF5IGZvciBsaXQtaHRtbCdzIGFycmF5IGhhbmRsaW5nIHRvIHJlbmRlciwgYW5kIHJlbWVtYmVyIHRoZVxuICAgIC8vIGtleXMuXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KG9sZFBhcnRzKSkge1xuICAgICAgdGhpcy5faXRlbUtleXMgPSBuZXdLZXlzO1xuICAgICAgcmV0dXJuIG5ld1ZhbHVlcztcbiAgICB9XG5cbiAgICAvLyBJbiBTU1IgaHlkcmF0aW9uIGl0J3MgcG9zc2libGUgZm9yIG9sZFBhcnRzIHRvIGJlIGFuIGFycmF5IGJ1dCBmb3IgdXNcbiAgICAvLyB0byBub3QgaGF2ZSBpdGVtIGtleXMgYmVjYXVzZSB0aGUgdXBkYXRlKCkgaGFzbid0IHJ1biB5ZXQuIFdlIHNldCB0aGVcbiAgICAvLyBrZXlzIHRvIGFuIGVtcHR5IGFycmF5LiBUaGlzIHdpbGwgY2F1c2UgYWxsIG9sZEtleS9uZXdLZXkgY29tcGFyaXNvbnNcbiAgICAvLyB0byBmYWlsIGFuZCBleGVjdXRpb24gdG8gZmFsbCB0byB0aGUgbGFzdCBuZXN0ZWQgYnJhY2ggYmVsb3cgd2hpY2hcbiAgICAvLyByZXVzZXMgdGhlIG9sZFBhcnQuXG4gICAgY29uc3Qgb2xkS2V5cyA9ICh0aGlzLl9pdGVtS2V5cyA/Pz0gW10pO1xuXG4gICAgLy8gTmV3IHBhcnQgbGlzdCB3aWxsIGJlIGJ1aWx0IHVwIGFzIHdlIGdvIChlaXRoZXIgcmV1c2VkIGZyb21cbiAgICAvLyBvbGQgcGFydHMgb3IgY3JlYXRlZCBmb3IgbmV3IGtleXMgaW4gdGhpcyB1cGRhdGUpLiBUaGlzIGlzXG4gICAgLy8gc2F2ZWQgaW4gdGhlIGFib3ZlIGNhY2hlIGF0IHRoZSBlbmQgb2YgdGhlIHVwZGF0ZS5cbiAgICBjb25zdCBuZXdQYXJ0czogQ2hpbGRQYXJ0W10gPSBbXTtcblxuICAgIC8vIE1hcHMgZnJvbSBrZXkgdG8gaW5kZXggZm9yIGN1cnJlbnQgYW5kIHByZXZpb3VzIHVwZGF0ZTsgdGhlc2VcbiAgICAvLyBhcmUgZ2VuZXJhdGVkIGxhemlseSBvbmx5IHdoZW4gbmVlZGVkIGFzIGEgcGVyZm9ybWFuY2VcbiAgICAvLyBvcHRpbWl6YXRpb24sIHNpbmNlIHRoZXkgYXJlIG9ubHkgcmVxdWlyZWQgZm9yIG11bHRpcGxlXG4gICAgLy8gbm9uLWNvbnRpZ3VvdXMgY2hhbmdlcyBpbiB0aGUgbGlzdCwgd2hpY2ggYXJlIGxlc3MgY29tbW9uLlxuICAgIGxldCBuZXdLZXlUb0luZGV4TWFwITogTWFwPHVua25vd24sIG51bWJlcj47XG4gICAgbGV0IG9sZEtleVRvSW5kZXhNYXAhOiBNYXA8dW5rbm93biwgbnVtYmVyPjtcblxuICAgIC8vIEhlYWQgYW5kIHRhaWwgcG9pbnRlcnMgdG8gb2xkIHBhcnRzIGFuZCBuZXcgdmFsdWVzXG4gICAgbGV0IG9sZEhlYWQgPSAwO1xuICAgIGxldCBvbGRUYWlsID0gb2xkUGFydHMubGVuZ3RoIC0gMTtcbiAgICBsZXQgbmV3SGVhZCA9IDA7XG4gICAgbGV0IG5ld1RhaWwgPSBuZXdWYWx1ZXMubGVuZ3RoIC0gMTtcblxuICAgIC8vIE92ZXJ2aWV3IG9mIE8obikgcmVjb25jaWxpYXRpb24gYWxnb3JpdGhtIChnZW5lcmFsIGFwcHJvYWNoXG4gICAgLy8gYmFzZWQgb24gaWRlYXMgZm91bmQgaW4gaXZpLCB2dWUsIHNuYWJiZG9tLCBldGMuKTpcbiAgICAvL1xuICAgIC8vICogV2Ugc3RhcnQgd2l0aCB0aGUgbGlzdCBvZiBvbGQgcGFydHMgYW5kIG5ldyB2YWx1ZXMgKGFuZFxuICAgIC8vICAgYXJyYXlzIG9mIHRoZWlyIHJlc3BlY3RpdmUga2V5cyksIGhlYWQvdGFpbCBwb2ludGVycyBpbnRvXG4gICAgLy8gICBlYWNoLCBhbmQgd2UgYnVpbGQgdXAgdGhlIG5ldyBsaXN0IG9mIHBhcnRzIGJ5IHVwZGF0aW5nXG4gICAgLy8gICAoYW5kIHdoZW4gbmVlZGVkLCBtb3ZpbmcpIG9sZCBwYXJ0cyBvciBjcmVhdGluZyBuZXcgb25lcy5cbiAgICAvLyAgIFRoZSBpbml0aWFsIHNjZW5hcmlvIG1pZ2h0IGxvb2sgbGlrZSB0aGlzIChmb3IgYnJldml0eSBvZlxuICAgIC8vICAgdGhlIGRpYWdyYW1zLCB0aGUgbnVtYmVycyBpbiB0aGUgYXJyYXkgcmVmbGVjdCBrZXlzXG4gICAgLy8gICBhc3NvY2lhdGVkIHdpdGggdGhlIG9sZCBwYXJ0cyBvciBuZXcgdmFsdWVzLCBhbHRob3VnaCBrZXlzXG4gICAgLy8gICBhbmQgcGFydHMvdmFsdWVzIGFyZSBhY3R1YWxseSBzdG9yZWQgaW4gcGFyYWxsZWwgYXJyYXlzXG4gICAgLy8gICBpbmRleGVkIHVzaW5nIHRoZSBzYW1lIGhlYWQvdGFpbCBwb2ludGVycyk6XG4gICAgLy9cbiAgICAvLyAgICAgIG9sZEhlYWQgdiAgICAgICAgICAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIDIsIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWyAsICAsICAsICAsICAsICAsICBdXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdIDwtIHJlZmxlY3RzIHRoZSB1c2VyJ3MgbmV3XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0gb3JkZXJcbiAgICAvLyAgICAgIG5ld0hlYWQgXiAgICAgICAgICAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIEl0ZXJhdGUgb2xkICYgbmV3IGxpc3RzIGZyb20gYm90aCBzaWRlcywgdXBkYXRpbmcsXG4gICAgLy8gICBzd2FwcGluZywgb3IgcmVtb3ZpbmcgcGFydHMgYXQgdGhlIGhlYWQvdGFpbCBsb2NhdGlvbnNcbiAgICAvLyAgIHVudGlsIG5laXRoZXIgaGVhZCBub3IgdGFpbCBjYW4gbW92ZS5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzoga2V5cyBhdCBoZWFkIHBvaW50ZXJzIG1hdGNoLCBzbyB1cGRhdGUgb2xkXG4gICAgLy8gICBwYXJ0IDAgaW4tcGxhY2UgKG5vIG5lZWQgdG8gbW92ZSBpdCkgYW5kIHJlY29yZCBwYXJ0IDAgaW5cbiAgICAvLyAgIHRoZSBgbmV3UGFydHNgIGxpc3QuIFRoZSBsYXN0IHRoaW5nIHdlIGRvIGlzIGFkdmFuY2UgdGhlXG4gICAgLy8gICBgb2xkSGVhZGAgYW5kIGBuZXdIZWFkYCBwb2ludGVycyAod2lsbCBiZSByZWZsZWN0ZWQgaW4gdGhlXG4gICAgLy8gICBuZXh0IGRpYWdyYW0pLlxuICAgIC8vXG4gICAgLy8gICAgICBvbGRIZWFkIHYgICAgICAgICAgICAgICAgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAyLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFswLCAgLCAgLCAgLCAgLCAgLCAgXSA8LSBoZWFkcyBtYXRjaGVkOiB1cGRhdGUgMFxuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSAgICBhbmQgYWR2YW5jZSBib3RoIG9sZEhlYWRcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJiBuZXdIZWFkXG4gICAgLy8gICAgICBuZXdIZWFkIF4gICAgICAgICAgICAgICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBoZWFkIHBvaW50ZXJzIGRvbid0IG1hdGNoLCBidXQgdGFpbFxuICAgIC8vICAgcG9pbnRlcnMgZG8sIHNvIHVwZGF0ZSBwYXJ0IDYgaW4gcGxhY2UgKG5vIG5lZWQgdG8gbW92ZVxuICAgIC8vICAgaXQpLCBhbmQgcmVjb3JkIHBhcnQgNiBpbiB0aGUgYG5ld1BhcnRzYCBsaXN0LiBMYXN0LFxuICAgIC8vICAgYWR2YW5jZSB0aGUgYG9sZFRhaWxgIGFuZCBgb2xkSGVhZGAgcG9pbnRlcnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgIG9sZEhlYWQgdiAgICAgICAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIDIsIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsICAsICAsICAsICAsICAsIDZdIDwtIHRhaWxzIG1hdGNoZWQ6IHVwZGF0ZSA2XG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIGJvdGggb2xkVGFpbFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmIG5ld1RhaWxcbiAgICAvLyAgICAgICAgIG5ld0hlYWQgXiAgICAgICAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIElmIG5laXRoZXIgaGVhZCBub3IgdGFpbCBtYXRjaDsgbmV4dCBjaGVjayBpZiBvbmUgb2YgdGhlXG4gICAgLy8gICBvbGQgaGVhZC90YWlsIGl0ZW1zIHdhcyByZW1vdmVkLiBXZSBmaXJzdCBuZWVkIHRvIGdlbmVyYXRlXG4gICAgLy8gICB0aGUgcmV2ZXJzZSBtYXAgb2YgbmV3IGtleXMgdG8gaW5kZXggKGBuZXdLZXlUb0luZGV4TWFwYCksXG4gICAgLy8gICB3aGljaCBpcyBkb25lIG9uY2UgbGF6aWx5IGFzIGEgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uLFxuICAgIC8vICAgc2luY2Ugd2Ugb25seSBoaXQgdGhpcyBjYXNlIGlmIG11bHRpcGxlIG5vbi1jb250aWd1b3VzXG4gICAgLy8gICBjaGFuZ2VzIHdlcmUgbWFkZS4gTm90ZSB0aGF0IGZvciBjb250aWd1b3VzIHJlbW92YWxcbiAgICAvLyAgIGFueXdoZXJlIGluIHRoZSBsaXN0LCB0aGUgaGVhZCBhbmQgdGFpbHMgd291bGQgYWR2YW5jZVxuICAgIC8vICAgZnJvbSBlaXRoZXIgZW5kIGFuZCBwYXNzIGVhY2ggb3RoZXIgYmVmb3JlIHdlIGdldCB0byB0aGlzXG4gICAgLy8gICBjYXNlIGFuZCByZW1vdmFscyB3b3VsZCBiZSBoYW5kbGVkIGluIHRoZSBmaW5hbCB3aGlsZSBsb29wXG4gICAgLy8gICB3aXRob3V0IG5lZWRpbmcgdG8gZ2VuZXJhdGUgdGhlIG1hcC5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogVGhlIGtleSBhdCBgb2xkVGFpbGAgd2FzIHJlbW92ZWQgKG5vIGxvbmdlclxuICAgIC8vICAgaW4gdGhlIGBuZXdLZXlUb0luZGV4TWFwYCksIHNvIHJlbW92ZSB0aGF0IHBhcnQgZnJvbSB0aGVcbiAgICAvLyAgIERPTSBhbmQgYWR2YW5jZSBqdXN0IHRoZSBgb2xkVGFpbGAgcG9pbnRlci5cbiAgICAvL1xuICAgIC8vICAgICAgICAgb2xkSGVhZCB2ICAgICAgICAgICB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgMiwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgICwgICwgICwgICwgICwgNl0gPC0gNSBub3QgaW4gbmV3IG1hcDogcmVtb3ZlXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIDUgYW5kIGFkdmFuY2Ugb2xkVGFpbFxuICAgIC8vICAgICAgICAgbmV3SGVhZCBeICAgICAgICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogT25jZSBoZWFkIGFuZCB0YWlsIGNhbm5vdCBtb3ZlLCBhbnkgbWlzbWF0Y2hlcyBhcmUgZHVlIHRvXG4gICAgLy8gICBlaXRoZXIgbmV3IG9yIG1vdmVkIGl0ZW1zOyBpZiBhIG5ldyBrZXkgaXMgaW4gdGhlIHByZXZpb3VzXG4gICAgLy8gICBcIm9sZCBrZXkgdG8gb2xkIGluZGV4XCIgbWFwLCBtb3ZlIHRoZSBvbGQgcGFydCB0byB0aGUgbmV3XG4gICAgLy8gICBsb2NhdGlvbiwgb3RoZXJ3aXNlIGNyZWF0ZSBhbmQgaW5zZXJ0IGEgbmV3IHBhcnQuIE5vdGVcbiAgICAvLyAgIHRoYXQgd2hlbiBtb3ZpbmcgYW4gb2xkIHBhcnQgd2UgbnVsbCBpdHMgcG9zaXRpb24gaW4gdGhlXG4gICAgLy8gICBvbGRQYXJ0cyBhcnJheSBpZiBpdCBsaWVzIGJldHdlZW4gdGhlIGhlYWQgYW5kIHRhaWwgc28gd2VcbiAgICAvLyAgIGtub3cgdG8gc2tpcCBpdCB3aGVuIHRoZSBwb2ludGVycyBnZXQgdGhlcmUuXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IG5laXRoZXIgaGVhZCBub3IgdGFpbCBtYXRjaCwgYW5kIG5laXRoZXJcbiAgICAvLyAgIHdlcmUgcmVtb3ZlZDsgc28gZmluZCB0aGUgYG5ld0hlYWRgIGtleSBpbiB0aGVcbiAgICAvLyAgIGBvbGRLZXlUb0luZGV4TWFwYCwgYW5kIG1vdmUgdGhhdCBvbGQgcGFydCdzIERPTSBpbnRvIHRoZVxuICAgIC8vICAgbmV4dCBoZWFkIHBvc2l0aW9uIChiZWZvcmUgYG9sZFBhcnRzW29sZEhlYWRdYCkuIExhc3QsXG4gICAgLy8gICBudWxsIHRoZSBwYXJ0IGluIHRoZSBgb2xkUGFydGAgYXJyYXkgc2luY2UgaXQgd2FzXG4gICAgLy8gICBzb21ld2hlcmUgaW4gdGhlIHJlbWFpbmluZyBvbGRQYXJ0cyBzdGlsbCB0byBiZSBzY2FubmVkXG4gICAgLy8gICAoYmV0d2VlbiB0aGUgaGVhZCBhbmQgdGFpbCBwb2ludGVycykgc28gdGhhdCB3ZSBrbm93IHRvXG4gICAgLy8gICBza2lwIHRoYXQgb2xkIHBhcnQgb24gZnV0dXJlIGl0ZXJhdGlvbnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgIG9sZEhlYWQgdiAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsICAsICAsICAsICAsIDZdIDwtIHN0dWNrOiB1cGRhdGUgJiBtb3ZlIDJcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICAgaW50byBwbGFjZSBhbmQgYWR2YW5jZVxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdIZWFkXG4gICAgLy8gICAgICAgICBuZXdIZWFkIF4gICAgICAgICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBOb3RlIHRoYXQgZm9yIG1vdmVzL2luc2VydGlvbnMgbGlrZSB0aGUgb25lIGFib3ZlLCBhIHBhcnRcbiAgICAvLyAgIGluc2VydGVkIGF0IHRoZSBoZWFkIHBvaW50ZXIgaXMgaW5zZXJ0ZWQgYmVmb3JlIHRoZVxuICAgIC8vICAgY3VycmVudCBgb2xkUGFydHNbb2xkSGVhZF1gLCBhbmQgYSBwYXJ0IGluc2VydGVkIGF0IHRoZVxuICAgIC8vICAgdGFpbCBwb2ludGVyIGlzIGluc2VydGVkIGJlZm9yZSBgbmV3UGFydHNbbmV3VGFpbCsxXWAuIFRoZVxuICAgIC8vICAgc2VlbWluZyBhc3ltbWV0cnkgbGllcyBpbiB0aGUgZmFjdCB0aGF0IG5ldyBwYXJ0cyBhcmVcbiAgICAvLyAgIG1vdmVkIGludG8gcGxhY2Ugb3V0c2lkZSBpbiwgc28gdG8gdGhlIHJpZ2h0IG9mIHRoZSBoZWFkXG4gICAgLy8gICBwb2ludGVyIGFyZSBvbGQgcGFydHMsIGFuZCB0byB0aGUgcmlnaHQgb2YgdGhlIHRhaWxcbiAgICAvLyAgIHBvaW50ZXIgYXJlIG5ldyBwYXJ0cy5cbiAgICAvL1xuICAgIC8vICogV2UgYWx3YXlzIHJlc3RhcnQgYmFjayBmcm9tIHRoZSB0b3Agb2YgdGhlIGFsZ29yaXRobSxcbiAgICAvLyAgIGFsbG93aW5nIG1hdGNoaW5nIGFuZCBzaW1wbGUgdXBkYXRlcyBpbiBwbGFjZSB0b1xuICAgIC8vICAgY29udGludWUuLi5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogdGhlIGhlYWQgcG9pbnRlcnMgb25jZSBhZ2FpbiBtYXRjaCwgc29cbiAgICAvLyAgIHNpbXBseSB1cGRhdGUgcGFydCAxIGFuZCByZWNvcmQgaXQgaW4gdGhlIGBuZXdQYXJ0c2BcbiAgICAvLyAgIGFycmF5LiAgTGFzdCwgYWR2YW5jZSBib3RoIGhlYWQgcG9pbnRlcnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgIG9sZEhlYWQgdiAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsICAsICAsICAsIDZdIDwtIGhlYWRzIG1hdGNoZWQ6IHVwZGF0ZSAxXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIGJvdGggb2xkSGVhZFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmIG5ld0hlYWRcbiAgICAvLyAgICAgICAgICAgIG5ld0hlYWQgXiAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIEFzIG1lbnRpb25lZCBhYm92ZSwgaXRlbXMgdGhhdCB3ZXJlIG1vdmVkIGFzIGEgcmVzdWx0IG9mXG4gICAgLy8gICBiZWluZyBzdHVjayAodGhlIGZpbmFsIGVsc2UgY2xhdXNlIGluIHRoZSBjb2RlIGJlbG93KSBhcmVcbiAgICAvLyAgIG1hcmtlZCB3aXRoIG51bGwsIHNvIHdlIGFsd2F5cyBhZHZhbmNlIG9sZCBwb2ludGVycyBvdmVyXG4gICAgLy8gICB0aGVzZSBzbyB3ZSdyZSBjb21wYXJpbmcgdGhlIG5leHQgYWN0dWFsIG9sZCB2YWx1ZSBvblxuICAgIC8vICAgZWl0aGVyIGVuZC5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogYG9sZEhlYWRgIGlzIG51bGwgKGFscmVhZHkgcGxhY2VkIGluXG4gICAgLy8gICBuZXdQYXJ0cyksIHNvIGFkdmFuY2UgYG9sZEhlYWRgLlxuICAgIC8vXG4gICAgLy8gICAgICAgICAgICBvbGRIZWFkIHYgICAgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAtLCAzLCA0LCA1LCA2XSA8LSBvbGQgaGVhZCBhbHJlYWR5IHVzZWQ6XG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsICAsICAsICAsIDZdICAgIGFkdmFuY2Ugb2xkSGVhZFxuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XVxuICAgIC8vICAgICAgICAgICAgICAgbmV3SGVhZCBeICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogTm90ZSBpdCdzIG5vdCBjcml0aWNhbCB0byBtYXJrIG9sZCBwYXJ0cyBhcyBudWxsIHdoZW4gdGhleVxuICAgIC8vICAgYXJlIG1vdmVkIGZyb20gaGVhZCB0byB0YWlsIG9yIHRhaWwgdG8gaGVhZCwgc2luY2UgdGhleVxuICAgIC8vICAgd2lsbCBiZSBvdXRzaWRlIHRoZSBwb2ludGVyIHJhbmdlIGFuZCBuZXZlciB2aXNpdGVkIGFnYWluLlxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBIZXJlIHRoZSBvbGQgdGFpbCBrZXkgbWF0Y2hlcyB0aGUgbmV3IGhlYWRcbiAgICAvLyAgIGtleSwgc28gdGhlIHBhcnQgYXQgdGhlIGBvbGRUYWlsYCBwb3NpdGlvbiBhbmQgbW92ZSBpdHNcbiAgICAvLyAgIERPTSB0byB0aGUgbmV3IGhlYWQgcG9zaXRpb24gKGJlZm9yZSBgb2xkUGFydHNbb2xkSGVhZF1gKS5cbiAgICAvLyAgIExhc3QsIGFkdmFuY2UgYG9sZFRhaWxgIGFuZCBgbmV3SGVhZGAgcG9pbnRlcnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgICAgICAgIG9sZEhlYWQgdiAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsIDQsICAsICAsIDZdIDwtIG9sZCB0YWlsIG1hdGNoZXMgbmV3XG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgaGVhZDogdXBkYXRlICYgbW92ZSA0LFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkdmFuY2Ugb2xkVGFpbCAmIG5ld0hlYWRcbiAgICAvLyAgICAgICAgICAgICAgIG5ld0hlYWQgXiAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IE9sZCBhbmQgbmV3IGhlYWQga2V5cyBtYXRjaCwgc28gdXBkYXRlIHRoZVxuICAgIC8vICAgb2xkIGhlYWQgcGFydCBpbiBwbGFjZSwgYW5kIGFkdmFuY2UgdGhlIGBvbGRIZWFkYCBhbmRcbiAgICAvLyAgIGBuZXdIZWFkYCBwb2ludGVycy5cbiAgICAvL1xuICAgIC8vICAgICAgICAgICAgICAgb2xkSGVhZCB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgLSwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgMSwgNCwgMywgICAsNl0gPC0gaGVhZHMgbWF0Y2g6IHVwZGF0ZSAzXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIG9sZEhlYWQgJlxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdIZWFkXG4gICAgLy8gICAgICAgICAgICAgICAgICBuZXdIZWFkIF4gIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBPbmNlIHRoZSBuZXcgb3Igb2xkIHBvaW50ZXJzIG1vdmUgcGFzdCBlYWNoIG90aGVyIHRoZW4gYWxsXG4gICAgLy8gICB3ZSBoYXZlIGxlZnQgaXMgYWRkaXRpb25zIChpZiBvbGQgbGlzdCBleGhhdXN0ZWQpIG9yXG4gICAgLy8gICByZW1vdmFscyAoaWYgbmV3IGxpc3QgZXhoYXVzdGVkKS4gVGhvc2UgYXJlIGhhbmRsZWQgaW4gdGhlXG4gICAgLy8gICBmaW5hbCB3aGlsZSBsb29wcyBhdCB0aGUgZW5kLlxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBgb2xkSGVhZGAgZXhjZWVkZWQgYG9sZFRhaWxgLCBzbyB3ZSdyZSBkb25lXG4gICAgLy8gICB3aXRoIHRoZSBtYWluIGxvb3AuICBDcmVhdGUgdGhlIHJlbWFpbmluZyBwYXJ0IGFuZCBpbnNlcnRcbiAgICAvLyAgIGl0IGF0IHRoZSBuZXcgaGVhZCBwb3NpdGlvbiwgYW5kIHRoZSB1cGRhdGUgaXMgY29tcGxldGUuXG4gICAgLy9cbiAgICAvLyAgICAgICAgICAgICAgICAgICAob2xkSGVhZCA+IG9sZFRhaWwpXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsIDQsIDMsIDcgLDZdIDwtIGNyZWF0ZSBhbmQgaW5zZXJ0IDdcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl1cbiAgICAvLyAgICAgICAgICAgICAgICAgICAgIG5ld0hlYWQgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIE5vdGUgdGhhdCB0aGUgb3JkZXIgb2YgdGhlIGlmL2Vsc2UgY2xhdXNlcyBpcyBub3RcbiAgICAvLyAgIGltcG9ydGFudCB0byB0aGUgYWxnb3JpdGhtLCBhcyBsb25nIGFzIHRoZSBudWxsIGNoZWNrc1xuICAgIC8vICAgY29tZSBmaXJzdCAodG8gZW5zdXJlIHdlJ3JlIGFsd2F5cyB3b3JraW5nIG9uIHZhbGlkIG9sZFxuICAgIC8vICAgcGFydHMpIGFuZCB0aGF0IHRoZSBmaW5hbCBlbHNlIGNsYXVzZSBjb21lcyBsYXN0IChzaW5jZVxuICAgIC8vICAgdGhhdCdzIHdoZXJlIHRoZSBleHBlbnNpdmUgbW92ZXMgb2NjdXIpLiBUaGUgb3JkZXIgb2ZcbiAgICAvLyAgIHJlbWFpbmluZyBjbGF1c2VzIGlzIGp1c3QgYSBzaW1wbGUgZ3Vlc3MgYXQgd2hpY2ggY2FzZXNcbiAgICAvLyAgIHdpbGwgYmUgbW9zdCBjb21tb24uXG4gICAgLy9cbiAgICAvLyAqIE5vdGUsIHdlIGNvdWxkIGNhbGN1bGF0ZSB0aGUgbG9uZ2VzdFxuICAgIC8vICAgaW5jcmVhc2luZyBzdWJzZXF1ZW5jZSAoTElTKSBvZiBvbGQgaXRlbXMgaW4gbmV3IHBvc2l0aW9uLFxuICAgIC8vICAgYW5kIG9ubHkgbW92ZSB0aG9zZSBub3QgaW4gdGhlIExJUyBzZXQuIEhvd2V2ZXIgdGhhdCBjb3N0c1xuICAgIC8vICAgTyhubG9nbikgdGltZSBhbmQgYWRkcyBhIGJpdCBtb3JlIGNvZGUsIGFuZCBvbmx5IGhlbHBzXG4gICAgLy8gICBtYWtlIHJhcmUgdHlwZXMgb2YgbXV0YXRpb25zIHJlcXVpcmUgZmV3ZXIgbW92ZXMuIFRoZVxuICAgIC8vICAgYWJvdmUgaGFuZGxlcyByZW1vdmVzLCBhZGRzLCByZXZlcnNhbCwgc3dhcHMsIGFuZCBzaW5nbGVcbiAgICAvLyAgIG1vdmVzIG9mIGNvbnRpZ3VvdXMgaXRlbXMgaW4gbGluZWFyIHRpbWUsIGluIHRoZSBtaW5pbXVtXG4gICAgLy8gICBudW1iZXIgb2YgbW92ZXMuIEFzIHRoZSBudW1iZXIgb2YgbXVsdGlwbGUgbW92ZXMgd2hlcmUgTElTXG4gICAgLy8gICBtaWdodCBoZWxwIGFwcHJvYWNoZXMgYSByYW5kb20gc2h1ZmZsZSwgdGhlIExJU1xuICAgIC8vICAgb3B0aW1pemF0aW9uIGJlY29tZXMgbGVzcyBoZWxwZnVsLCBzbyBpdCBzZWVtcyBub3Qgd29ydGhcbiAgICAvLyAgIHRoZSBjb2RlIGF0IHRoaXMgcG9pbnQuIENvdWxkIHJlY29uc2lkZXIgaWYgYSBjb21wZWxsaW5nXG4gICAgLy8gICBjYXNlIGFyaXNlcy5cblxuICAgIHdoaWxlIChvbGRIZWFkIDw9IG9sZFRhaWwgJiYgbmV3SGVhZCA8PSBuZXdUYWlsKSB7XG4gICAgICBpZiAob2xkUGFydHNbb2xkSGVhZF0gPT09IG51bGwpIHtcbiAgICAgICAgLy8gYG51bGxgIG1lYW5zIG9sZCBwYXJ0IGF0IGhlYWQgaGFzIGFscmVhZHkgYmVlbiB1c2VkXG4gICAgICAgIC8vIGJlbG93OyBza2lwXG4gICAgICAgIG9sZEhlYWQrKztcbiAgICAgIH0gZWxzZSBpZiAob2xkUGFydHNbb2xkVGFpbF0gPT09IG51bGwpIHtcbiAgICAgICAgLy8gYG51bGxgIG1lYW5zIG9sZCBwYXJ0IGF0IHRhaWwgaGFzIGFscmVhZHkgYmVlbiB1c2VkXG4gICAgICAgIC8vIGJlbG93OyBza2lwXG4gICAgICAgIG9sZFRhaWwtLTtcbiAgICAgIH0gZWxzZSBpZiAob2xkS2V5c1tvbGRIZWFkXSA9PT0gbmV3S2V5c1tuZXdIZWFkXSkge1xuICAgICAgICAvLyBPbGQgaGVhZCBtYXRjaGVzIG5ldyBoZWFkOyB1cGRhdGUgaW4gcGxhY2VcbiAgICAgICAgbmV3UGFydHNbbmV3SGVhZF0gPSBzZXRDaGlsZFBhcnRWYWx1ZShcbiAgICAgICAgICBvbGRQYXJ0c1tvbGRIZWFkXSEsXG4gICAgICAgICAgbmV3VmFsdWVzW25ld0hlYWRdXG4gICAgICAgICk7XG4gICAgICAgIG9sZEhlYWQrKztcbiAgICAgICAgbmV3SGVhZCsrO1xuICAgICAgfSBlbHNlIGlmIChvbGRLZXlzW29sZFRhaWxdID09PSBuZXdLZXlzW25ld1RhaWxdKSB7XG4gICAgICAgIC8vIE9sZCB0YWlsIG1hdGNoZXMgbmV3IHRhaWw7IHVwZGF0ZSBpbiBwbGFjZVxuICAgICAgICBuZXdQYXJ0c1tuZXdUYWlsXSA9IHNldENoaWxkUGFydFZhbHVlKFxuICAgICAgICAgIG9sZFBhcnRzW29sZFRhaWxdISxcbiAgICAgICAgICBuZXdWYWx1ZXNbbmV3VGFpbF1cbiAgICAgICAgKTtcbiAgICAgICAgb2xkVGFpbC0tO1xuICAgICAgICBuZXdUYWlsLS07XG4gICAgICB9IGVsc2UgaWYgKG9sZEtleXNbb2xkSGVhZF0gPT09IG5ld0tleXNbbmV3VGFpbF0pIHtcbiAgICAgICAgLy8gT2xkIGhlYWQgbWF0Y2hlcyBuZXcgdGFpbDsgdXBkYXRlIGFuZCBtb3ZlIHRvIG5ldyB0YWlsXG4gICAgICAgIG5ld1BhcnRzW25ld1RhaWxdID0gc2V0Q2hpbGRQYXJ0VmFsdWUoXG4gICAgICAgICAgb2xkUGFydHNbb2xkSGVhZF0hLFxuICAgICAgICAgIG5ld1ZhbHVlc1tuZXdUYWlsXVxuICAgICAgICApO1xuICAgICAgICBpbnNlcnRQYXJ0KGNvbnRhaW5lclBhcnQsIG5ld1BhcnRzW25ld1RhaWwgKyAxXSwgb2xkUGFydHNbb2xkSGVhZF0hKTtcbiAgICAgICAgb2xkSGVhZCsrO1xuICAgICAgICBuZXdUYWlsLS07XG4gICAgICB9IGVsc2UgaWYgKG9sZEtleXNbb2xkVGFpbF0gPT09IG5ld0tleXNbbmV3SGVhZF0pIHtcbiAgICAgICAgLy8gT2xkIHRhaWwgbWF0Y2hlcyBuZXcgaGVhZDsgdXBkYXRlIGFuZCBtb3ZlIHRvIG5ldyBoZWFkXG4gICAgICAgIG5ld1BhcnRzW25ld0hlYWRdID0gc2V0Q2hpbGRQYXJ0VmFsdWUoXG4gICAgICAgICAgb2xkUGFydHNbb2xkVGFpbF0hLFxuICAgICAgICAgIG5ld1ZhbHVlc1tuZXdIZWFkXVxuICAgICAgICApO1xuICAgICAgICBpbnNlcnRQYXJ0KGNvbnRhaW5lclBhcnQsIG9sZFBhcnRzW29sZEhlYWRdISwgb2xkUGFydHNbb2xkVGFpbF0hKTtcbiAgICAgICAgb2xkVGFpbC0tO1xuICAgICAgICBuZXdIZWFkKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobmV3S2V5VG9JbmRleE1hcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gTGF6aWx5IGdlbmVyYXRlIGtleS10by1pbmRleCBtYXBzLCB1c2VkIGZvciByZW1vdmFscyAmXG4gICAgICAgICAgLy8gbW92ZXMgYmVsb3dcbiAgICAgICAgICBuZXdLZXlUb0luZGV4TWFwID0gZ2VuZXJhdGVNYXAobmV3S2V5cywgbmV3SGVhZCwgbmV3VGFpbCk7XG4gICAgICAgICAgb2xkS2V5VG9JbmRleE1hcCA9IGdlbmVyYXRlTWFwKG9sZEtleXMsIG9sZEhlYWQsIG9sZFRhaWwpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghbmV3S2V5VG9JbmRleE1hcC5oYXMob2xkS2V5c1tvbGRIZWFkXSkpIHtcbiAgICAgICAgICAvLyBPbGQgaGVhZCBpcyBubyBsb25nZXIgaW4gbmV3IGxpc3Q7IHJlbW92ZVxuICAgICAgICAgIHJlbW92ZVBhcnQob2xkUGFydHNbb2xkSGVhZF0hKTtcbiAgICAgICAgICBvbGRIZWFkKys7XG4gICAgICAgIH0gZWxzZSBpZiAoIW5ld0tleVRvSW5kZXhNYXAuaGFzKG9sZEtleXNbb2xkVGFpbF0pKSB7XG4gICAgICAgICAgLy8gT2xkIHRhaWwgaXMgbm8gbG9uZ2VyIGluIG5ldyBsaXN0OyByZW1vdmVcbiAgICAgICAgICByZW1vdmVQYXJ0KG9sZFBhcnRzW29sZFRhaWxdISk7XG4gICAgICAgICAgb2xkVGFpbC0tO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIEFueSBtaXNtYXRjaGVzIGF0IHRoaXMgcG9pbnQgYXJlIGR1ZSB0byBhZGRpdGlvbnMgb3JcbiAgICAgICAgICAvLyBtb3Zlczsgc2VlIGlmIHdlIGhhdmUgYW4gb2xkIHBhcnQgd2UgY2FuIHJldXNlIGFuZCBtb3ZlXG4gICAgICAgICAgLy8gaW50byBwbGFjZVxuICAgICAgICAgIGNvbnN0IG9sZEluZGV4ID0gb2xkS2V5VG9JbmRleE1hcC5nZXQobmV3S2V5c1tuZXdIZWFkXSk7XG4gICAgICAgICAgY29uc3Qgb2xkUGFydCA9IG9sZEluZGV4ICE9PSB1bmRlZmluZWQgPyBvbGRQYXJ0c1tvbGRJbmRleF0gOiBudWxsO1xuICAgICAgICAgIGlmIChvbGRQYXJ0ID09PSBudWxsKSB7XG4gICAgICAgICAgICAvLyBObyBvbGQgcGFydCBmb3IgdGhpcyB2YWx1ZTsgY3JlYXRlIGEgbmV3IG9uZSBhbmRcbiAgICAgICAgICAgIC8vIGluc2VydCBpdFxuICAgICAgICAgICAgY29uc3QgbmV3UGFydCA9IGluc2VydFBhcnQoY29udGFpbmVyUGFydCwgb2xkUGFydHNbb2xkSGVhZF0hKTtcbiAgICAgICAgICAgIHNldENoaWxkUGFydFZhbHVlKG5ld1BhcnQsIG5ld1ZhbHVlc1tuZXdIZWFkXSk7XG4gICAgICAgICAgICBuZXdQYXJ0c1tuZXdIZWFkXSA9IG5ld1BhcnQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFJldXNlIG9sZCBwYXJ0XG4gICAgICAgICAgICBuZXdQYXJ0c1tuZXdIZWFkXSA9IHNldENoaWxkUGFydFZhbHVlKG9sZFBhcnQsIG5ld1ZhbHVlc1tuZXdIZWFkXSk7XG4gICAgICAgICAgICBpbnNlcnRQYXJ0KGNvbnRhaW5lclBhcnQsIG9sZFBhcnRzW29sZEhlYWRdISwgb2xkUGFydCk7XG4gICAgICAgICAgICAvLyBUaGlzIG1hcmtzIHRoZSBvbGQgcGFydCBhcyBoYXZpbmcgYmVlbiB1c2VkLCBzbyB0aGF0XG4gICAgICAgICAgICAvLyBpdCB3aWxsIGJlIHNraXBwZWQgaW4gdGhlIGZpcnN0IHR3byBjaGVja3MgYWJvdmVcbiAgICAgICAgICAgIG9sZFBhcnRzW29sZEluZGV4IGFzIG51bWJlcl0gPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBuZXdIZWFkKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQWRkIHBhcnRzIGZvciBhbnkgcmVtYWluaW5nIG5ldyB2YWx1ZXNcbiAgICB3aGlsZSAobmV3SGVhZCA8PSBuZXdUYWlsKSB7XG4gICAgICAvLyBGb3IgYWxsIHJlbWFpbmluZyBhZGRpdGlvbnMsIHdlIGluc2VydCBiZWZvcmUgbGFzdCBuZXdcbiAgICAgIC8vIHRhaWwsIHNpbmNlIG9sZCBwb2ludGVycyBhcmUgbm8gbG9uZ2VyIHZhbGlkXG4gICAgICBjb25zdCBuZXdQYXJ0ID0gaW5zZXJ0UGFydChjb250YWluZXJQYXJ0LCBuZXdQYXJ0c1tuZXdUYWlsICsgMV0pO1xuICAgICAgc2V0Q2hpbGRQYXJ0VmFsdWUobmV3UGFydCwgbmV3VmFsdWVzW25ld0hlYWRdKTtcbiAgICAgIG5ld1BhcnRzW25ld0hlYWQrK10gPSBuZXdQYXJ0O1xuICAgIH1cbiAgICAvLyBSZW1vdmUgYW55IHJlbWFpbmluZyB1bnVzZWQgb2xkIHBhcnRzXG4gICAgd2hpbGUgKG9sZEhlYWQgPD0gb2xkVGFpbCkge1xuICAgICAgY29uc3Qgb2xkUGFydCA9IG9sZFBhcnRzW29sZEhlYWQrK107XG4gICAgICBpZiAob2xkUGFydCAhPT0gbnVsbCkge1xuICAgICAgICByZW1vdmVQYXJ0KG9sZFBhcnQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNhdmUgb3JkZXIgb2YgbmV3IHBhcnRzIGZvciBuZXh0IHJvdW5kXG4gICAgdGhpcy5faXRlbUtleXMgPSBuZXdLZXlzO1xuICAgIC8vIERpcmVjdGx5IHNldCBwYXJ0IHZhbHVlLCBieXBhc3NpbmcgaXQncyBkaXJ0eS1jaGVja2luZ1xuICAgIHNldENvbW1pdHRlZFZhbHVlKGNvbnRhaW5lclBhcnQsIG5ld1BhcnRzKTtcbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZXBlYXREaXJlY3RpdmVGbiB7XG4gIDxUPihcbiAgICBpdGVtczogSXRlcmFibGU8VD4sXG4gICAga2V5Rm5PclRlbXBsYXRlOiBLZXlGbjxUPiB8IEl0ZW1UZW1wbGF0ZTxUPixcbiAgICB0ZW1wbGF0ZT86IEl0ZW1UZW1wbGF0ZTxUPlxuICApOiB1bmtub3duO1xuICA8VD4oaXRlbXM6IEl0ZXJhYmxlPFQ+LCB0ZW1wbGF0ZTogSXRlbVRlbXBsYXRlPFQ+KTogdW5rbm93bjtcbiAgPFQ+KFxuICAgIGl0ZW1zOiBJdGVyYWJsZTxUPixcbiAgICBrZXlGbjogS2V5Rm48VD4gfCBJdGVtVGVtcGxhdGU8VD4sXG4gICAgdGVtcGxhdGU6IEl0ZW1UZW1wbGF0ZTxUPlxuICApOiB1bmtub3duO1xufVxuXG4vKipcbiAqIEEgZGlyZWN0aXZlIHRoYXQgcmVwZWF0cyBhIHNlcmllcyBvZiB2YWx1ZXMgKHVzdWFsbHkgYFRlbXBsYXRlUmVzdWx0c2ApXG4gKiBnZW5lcmF0ZWQgZnJvbSBhbiBpdGVyYWJsZSwgYW5kIHVwZGF0ZXMgdGhvc2UgaXRlbXMgZWZmaWNpZW50bHkgd2hlbiB0aGVcbiAqIGl0ZXJhYmxlIGNoYW5nZXMgYmFzZWQgb24gdXNlci1wcm92aWRlZCBga2V5c2AgYXNzb2NpYXRlZCB3aXRoIGVhY2ggaXRlbS5cbiAqXG4gKiBOb3RlIHRoYXQgaWYgYSBga2V5Rm5gIGlzIHByb3ZpZGVkLCBzdHJpY3Qga2V5LXRvLURPTSBtYXBwaW5nIGlzIG1haW50YWluZWQsXG4gKiBtZWFuaW5nIHByZXZpb3VzIERPTSBmb3IgYSBnaXZlbiBrZXkgaXMgbW92ZWQgaW50byB0aGUgbmV3IHBvc2l0aW9uIGlmXG4gKiBuZWVkZWQsIGFuZCBET00gd2lsbCBuZXZlciBiZSByZXVzZWQgd2l0aCB2YWx1ZXMgZm9yIGRpZmZlcmVudCBrZXlzIChuZXcgRE9NXG4gKiB3aWxsIGFsd2F5cyBiZSBjcmVhdGVkIGZvciBuZXcga2V5cykuIFRoaXMgaXMgZ2VuZXJhbGx5IHRoZSBtb3N0IGVmZmljaWVudFxuICogd2F5IHRvIHVzZSBgcmVwZWF0YCBzaW5jZSBpdCBwZXJmb3JtcyBtaW5pbXVtIHVubmVjZXNzYXJ5IHdvcmsgZm9yIGluc2VydGlvbnNcbiAqIGFuZCByZW1vdmFscy5cbiAqXG4gKiBUaGUgYGtleUZuYCB0YWtlcyB0d28gcGFyYW1ldGVycywgdGhlIGl0ZW0gYW5kIGl0cyBpbmRleCwgYW5kIHJldHVybnMgYSB1bmlxdWUga2V5IHZhbHVlLlxuICpcbiAqIGBgYGpzXG4gKiBodG1sYFxuICogICA8b2w+XG4gKiAgICAgJHtyZXBlYXQodGhpcy5pdGVtcywgKGl0ZW0pID0+IGl0ZW0uaWQsIChpdGVtLCBpbmRleCkgPT4ge1xuICogICAgICAgcmV0dXJuIGh0bWxgPGxpPiR7aW5kZXh9OiAke2l0ZW0ubmFtZX08L2xpPmA7XG4gKiAgICAgfSl9XG4gKiAgIDwvb2w+XG4gKiBgXG4gKiBgYGBcbiAqXG4gKiAqKkltcG9ydGFudCoqOiBJZiBwcm92aWRpbmcgYSBga2V5Rm5gLCBrZXlzICptdXN0KiBiZSB1bmlxdWUgZm9yIGFsbCBpdGVtcyBpbiBhXG4gKiBnaXZlbiBjYWxsIHRvIGByZXBlYXRgLiBUaGUgYmVoYXZpb3Igd2hlbiB0d28gb3IgbW9yZSBpdGVtcyBoYXZlIHRoZSBzYW1lIGtleVxuICogaXMgdW5kZWZpbmVkLlxuICpcbiAqIElmIG5vIGBrZXlGbmAgaXMgcHJvdmlkZWQsIHRoaXMgZGlyZWN0aXZlIHdpbGwgcGVyZm9ybSBzaW1pbGFyIHRvIG1hcHBpbmdcbiAqIGl0ZW1zIHRvIHZhbHVlcywgYW5kIERPTSB3aWxsIGJlIHJldXNlZCBhZ2FpbnN0IHBvdGVudGlhbGx5IGRpZmZlcmVudCBpdGVtcy5cbiAqL1xuZXhwb3J0IGNvbnN0IHJlcGVhdCA9IGRpcmVjdGl2ZShSZXBlYXREaXJlY3RpdmUpIGFzIFJlcGVhdERpcmVjdGl2ZUZuO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge1JlcGVhdERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtBdHRyaWJ1dGVQYXJ0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmUsXG4gIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG4gIFBhcnRJbmZvLFxuICBQYXJ0VHlwZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcblxuLyoqXG4gKiBBIGtleS12YWx1ZSBzZXQgb2YgQ1NTIHByb3BlcnRpZXMgYW5kIHZhbHVlcy5cbiAqXG4gKiBUaGUga2V5IHNob3VsZCBiZSBlaXRoZXIgYSB2YWxpZCBDU1MgcHJvcGVydHkgbmFtZSBzdHJpbmcsIGxpa2VcbiAqIGAnYmFja2dyb3VuZC1jb2xvcidgLCBvciBhIHZhbGlkIEphdmFTY3JpcHQgY2FtZWwgY2FzZSBwcm9wZXJ0eSBuYW1lXG4gKiBmb3IgQ1NTU3R5bGVEZWNsYXJhdGlvbiBsaWtlIGBiYWNrZ3JvdW5kQ29sb3JgLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFN0eWxlSW5mbyB7XG4gIFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfCBudW1iZXIgfCB1bmRlZmluZWQgfCBudWxsO1xufVxuXG5jb25zdCBpbXBvcnRhbnQgPSAnaW1wb3J0YW50Jztcbi8vIFRoZSBsZWFkaW5nIHNwYWNlIGlzIGltcG9ydGFudFxuY29uc3QgaW1wb3J0YW50RmxhZyA9ICcgIScgKyBpbXBvcnRhbnQ7XG4vLyBIb3cgbWFueSBjaGFyYWN0ZXJzIHRvIHJlbW92ZSBmcm9tIGEgdmFsdWUsIGFzIGEgbmVnYXRpdmUgbnVtYmVyXG5jb25zdCBmbGFnVHJpbSA9IDAgLSBpbXBvcnRhbnRGbGFnLmxlbmd0aDtcblxuY2xhc3MgU3R5bGVNYXBEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBwcml2YXRlIF9wcmV2aW91c1N0eWxlUHJvcGVydGllcz86IFNldDxzdHJpbmc+O1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAoXG4gICAgICBwYXJ0SW5mby50eXBlICE9PSBQYXJ0VHlwZS5BVFRSSUJVVEUgfHxcbiAgICAgIHBhcnRJbmZvLm5hbWUgIT09ICdzdHlsZScgfHxcbiAgICAgIChwYXJ0SW5mby5zdHJpbmdzPy5sZW5ndGggYXMgbnVtYmVyKSA+IDJcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1RoZSBgc3R5bGVNYXBgIGRpcmVjdGl2ZSBtdXN0IGJlIHVzZWQgaW4gdGhlIGBzdHlsZWAgYXR0cmlidXRlICcgK1xuICAgICAgICAgICdhbmQgbXVzdCBiZSB0aGUgb25seSBwYXJ0IGluIHRoZSBhdHRyaWJ1dGUuJ1xuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXIoc3R5bGVJbmZvOiBSZWFkb25seTxTdHlsZUluZm8+KSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHN0eWxlSW5mbykucmVkdWNlKChzdHlsZSwgcHJvcCkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBzdHlsZUluZm9bcHJvcF07XG4gICAgICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gc3R5bGU7XG4gICAgICB9XG4gICAgICAvLyBDb252ZXJ0IHByb3BlcnR5IG5hbWVzIGZyb20gY2FtZWwtY2FzZSB0byBkYXNoLWNhc2UsIGkuZS46XG4gICAgICAvLyAgYGJhY2tncm91bmRDb2xvcmAgLT4gYGJhY2tncm91bmQtY29sb3JgXG4gICAgICAvLyBWZW5kb3ItcHJlZml4ZWQgbmFtZXMgbmVlZCBhbiBleHRyYSBgLWAgYXBwZW5kZWQgdG8gZnJvbnQ6XG4gICAgICAvLyAgYHdlYmtpdEFwcGVhcmFuY2VgIC0+IGAtd2Via2l0LWFwcGVhcmFuY2VgXG4gICAgICAvLyBFeGNlcHRpb24gaXMgYW55IHByb3BlcnR5IG5hbWUgY29udGFpbmluZyBhIGRhc2gsIGluY2x1ZGluZ1xuICAgICAgLy8gY3VzdG9tIHByb3BlcnRpZXM7IHdlIGFzc3VtZSB0aGVzZSBhcmUgYWxyZWFkeSBkYXNoLWNhc2VkIGkuZS46XG4gICAgICAvLyAgYC0tbXktYnV0dG9uLWNvbG9yYCAtLT4gYC0tbXktYnV0dG9uLWNvbG9yYFxuICAgICAgcHJvcCA9IHByb3AuaW5jbHVkZXMoJy0nKVxuICAgICAgICA/IHByb3BcbiAgICAgICAgOiBwcm9wXG4gICAgICAgICAgICAucmVwbGFjZSgvKD86Xih3ZWJraXR8bW96fG1zfG8pfCkoPz1bQS1aXSkvZywgJy0kJicpXG4gICAgICAgICAgICAudG9Mb3dlckNhc2UoKTtcbiAgICAgIHJldHVybiBzdHlsZSArIGAke3Byb3B9OiR7dmFsdWV9O2A7XG4gICAgfSwgJycpO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IEF0dHJpYnV0ZVBhcnQsIFtzdHlsZUluZm9dOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgY29uc3Qge3N0eWxlfSA9IHBhcnQuZWxlbWVudCBhcyBIVE1MRWxlbWVudDtcblxuICAgIGlmICh0aGlzLl9wcmV2aW91c1N0eWxlUHJvcGVydGllcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9wcmV2aW91c1N0eWxlUHJvcGVydGllcyA9IG5ldyBTZXQoT2JqZWN0LmtleXMoc3R5bGVJbmZvKSk7XG4gICAgICByZXR1cm4gdGhpcy5yZW5kZXIoc3R5bGVJbmZvKTtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgb2xkIHByb3BlcnRpZXMgdGhhdCBubyBsb25nZXIgZXhpc3QgaW4gc3R5bGVJbmZvXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzKSB7XG4gICAgICAvLyBJZiB0aGUgbmFtZSBpc24ndCBpbiBzdHlsZUluZm8gb3IgaXQncyBudWxsL3VuZGVmaW5lZFxuICAgICAgaWYgKHN0eWxlSW5mb1tuYW1lXSA9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzIS5kZWxldGUobmFtZSk7XG4gICAgICAgIGlmIChuYW1lLmluY2x1ZGVzKCctJykpIHtcbiAgICAgICAgICBzdHlsZS5yZW1vdmVQcm9wZXJ0eShuYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICAgIChzdHlsZSBhcyBhbnkpW25hbWVdID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFkZCBvciB1cGRhdGUgcHJvcGVydGllc1xuICAgIGZvciAoY29uc3QgbmFtZSBpbiBzdHlsZUluZm8pIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gc3R5bGVJbmZvW25hbWVdO1xuICAgICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5fcHJldmlvdXNTdHlsZVByb3BlcnRpZXMuYWRkKG5hbWUpO1xuICAgICAgICBjb25zdCBpc0ltcG9ydGFudCA9XG4gICAgICAgICAgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJiB2YWx1ZS5lbmRzV2l0aChpbXBvcnRhbnRGbGFnKTtcbiAgICAgICAgaWYgKG5hbWUuaW5jbHVkZXMoJy0nKSB8fCBpc0ltcG9ydGFudCkge1xuICAgICAgICAgIHN0eWxlLnNldFByb3BlcnR5KFxuICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgIGlzSW1wb3J0YW50XG4gICAgICAgICAgICAgID8gKHZhbHVlIGFzIHN0cmluZykuc2xpY2UoMCwgZmxhZ1RyaW0pXG4gICAgICAgICAgICAgIDogKHZhbHVlIGFzIHN0cmluZyksXG4gICAgICAgICAgICBpc0ltcG9ydGFudCA/IGltcG9ydGFudCA6ICcnXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICAgIChzdHlsZSBhcyBhbnkpW25hbWVdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG59XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCBhcHBsaWVzIENTUyBwcm9wZXJ0aWVzIHRvIGFuIGVsZW1lbnQuXG4gKlxuICogYHN0eWxlTWFwYCBjYW4gb25seSBiZSB1c2VkIGluIHRoZSBgc3R5bGVgIGF0dHJpYnV0ZSBhbmQgbXVzdCBiZSB0aGUgb25seVxuICogZXhwcmVzc2lvbiBpbiB0aGUgYXR0cmlidXRlLiBJdCB0YWtlcyB0aGUgcHJvcGVydHkgbmFtZXMgaW4gdGhlXG4gKiB7QGxpbmsgU3R5bGVJbmZvIHN0eWxlSW5mb30gb2JqZWN0IGFuZCBhZGRzIHRoZSBwcm9wZXJ0aWVzIHRvIHRoZSBpbmxpbmVcbiAqIHN0eWxlIG9mIHRoZSBlbGVtZW50LlxuICpcbiAqIFByb3BlcnR5IG5hbWVzIHdpdGggZGFzaGVzIChgLWApIGFyZSBhc3N1bWVkIHRvIGJlIHZhbGlkIENTU1xuICogcHJvcGVydHkgbmFtZXMgYW5kIHNldCBvbiB0aGUgZWxlbWVudCdzIHN0eWxlIG9iamVjdCB1c2luZyBgc2V0UHJvcGVydHkoKWAuXG4gKiBOYW1lcyB3aXRob3V0IGRhc2hlcyBhcmUgYXNzdW1lZCB0byBiZSBjYW1lbENhc2VkIEphdmFTY3JpcHQgcHJvcGVydHkgbmFtZXNcbiAqIGFuZCBzZXQgb24gdGhlIGVsZW1lbnQncyBzdHlsZSBvYmplY3QgdXNpbmcgcHJvcGVydHkgYXNzaWdubWVudCwgYWxsb3dpbmcgdGhlXG4gKiBzdHlsZSBvYmplY3QgdG8gdHJhbnNsYXRlIEphdmFTY3JpcHQtc3R5bGUgbmFtZXMgdG8gQ1NTIHByb3BlcnR5IG5hbWVzLlxuICpcbiAqIEZvciBleGFtcGxlIGBzdHlsZU1hcCh7YmFja2dyb3VuZENvbG9yOiAncmVkJywgJ2JvcmRlci10b3AnOiAnNXB4JywgJy0tc2l6ZSc6XG4gKiAnMCd9KWAgc2V0cyB0aGUgYGJhY2tncm91bmQtY29sb3JgLCBgYm9yZGVyLXRvcGAgYW5kIGAtLXNpemVgIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHN0eWxlSW5mb1xuICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9saXQuZGV2L2RvY3MvdGVtcGxhdGVzL2RpcmVjdGl2ZXMvI3N0eWxlbWFwIHN0eWxlTWFwIGNvZGUgc2FtcGxlcyBvbiBMaXQuZGV2fVxuICovXG5leHBvcnQgY29uc3Qgc3R5bGVNYXAgPSBkaXJlY3RpdmUoU3R5bGVNYXBEaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge1N0eWxlTWFwRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge25vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgRGlyZWN0aXZlLCBQYXJ0SW5mbywgUGFydFR5cGV9IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5cbmNsYXNzIFRlbXBsYXRlQ29udGVudERpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX3ByZXZpb3VzVGVtcGxhdGU/OiBIVE1MVGVtcGxhdGVFbGVtZW50O1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAocGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQ0hJTEQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigndGVtcGxhdGVDb250ZW50IGNhbiBvbmx5IGJlIHVzZWQgaW4gY2hpbGQgYmluZGluZ3MnKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXIodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQpIHtcbiAgICBpZiAodGhpcy5fcHJldmlvdXNUZW1wbGF0ZSA9PT0gdGVtcGxhdGUpIHtcbiAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICB9XG4gICAgdGhpcy5fcHJldmlvdXNUZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICAgIHJldHVybiBkb2N1bWVudC5pbXBvcnROb2RlKHRlbXBsYXRlLmNvbnRlbnQsIHRydWUpO1xuICB9XG59XG5cbi8qKlxuICogUmVuZGVycyB0aGUgY29udGVudCBvZiBhIHRlbXBsYXRlIGVsZW1lbnQgYXMgSFRNTC5cbiAqXG4gKiBOb3RlLCB0aGUgdGVtcGxhdGUgc2hvdWxkIGJlIGRldmVsb3BlciBjb250cm9sbGVkIGFuZCBub3QgdXNlciBjb250cm9sbGVkLlxuICogUmVuZGVyaW5nIGEgdXNlci1jb250cm9sbGVkIHRlbXBsYXRlIHdpdGggdGhpcyBkaXJlY3RpdmVcbiAqIGNvdWxkIGxlYWQgdG8gY3Jvc3Mtc2l0ZS1zY3JpcHRpbmcgdnVsbmVyYWJpbGl0aWVzLlxuICovXG5leHBvcnQgY29uc3QgdGVtcGxhdGVDb250ZW50ID0gZGlyZWN0aXZlKFRlbXBsYXRlQ29udGVudERpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7VGVtcGxhdGVDb250ZW50RGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge25vdGhpbmcsIFRlbXBsYXRlUmVzdWx0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIERpcmVjdGl2ZSwgUGFydEluZm8sIFBhcnRUeXBlfSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuXG5jb25zdCBIVE1MX1JFU1VMVCA9IDE7XG5cbmV4cG9ydCBjbGFzcyBVbnNhZmVIVE1MRGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgc3RhdGljIGRpcmVjdGl2ZU5hbWUgPSAndW5zYWZlSFRNTCc7XG4gIHN0YXRpYyByZXN1bHRUeXBlID0gSFRNTF9SRVNVTFQ7XG5cbiAgcHJpdmF0ZSBfdmFsdWU6IHVua25vd24gPSBub3RoaW5nO1xuICBwcml2YXRlIF90ZW1wbGF0ZVJlc3VsdD86IFRlbXBsYXRlUmVzdWx0O1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAocGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQ0hJTEQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYCR7XG4gICAgICAgICAgKHRoaXMuY29uc3RydWN0b3IgYXMgdHlwZW9mIFVuc2FmZUhUTUxEaXJlY3RpdmUpLmRpcmVjdGl2ZU5hbWVcbiAgICAgICAgfSgpIGNhbiBvbmx5IGJlIHVzZWQgaW4gY2hpbGQgYmluZGluZ3NgXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlcih2YWx1ZTogc3RyaW5nIHwgdHlwZW9mIG5vdGhpbmcgfCB0eXBlb2Ygbm9DaGFuZ2UgfCB1bmRlZmluZWQgfCBudWxsKSB7XG4gICAgaWYgKHZhbHVlID09PSBub3RoaW5nIHx8IHZhbHVlID09IG51bGwpIHtcbiAgICAgIHRoaXMuX3RlbXBsYXRlUmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgICAgcmV0dXJuICh0aGlzLl92YWx1ZSA9IHZhbHVlKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlID09PSBub0NoYW5nZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHZhbHVlICE9ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGAke1xuICAgICAgICAgICh0aGlzLmNvbnN0cnVjdG9yIGFzIHR5cGVvZiBVbnNhZmVIVE1MRGlyZWN0aXZlKS5kaXJlY3RpdmVOYW1lXG4gICAgICAgIH0oKSBjYWxsZWQgd2l0aCBhIG5vbi1zdHJpbmcgdmFsdWVgXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAodmFsdWUgPT09IHRoaXMuX3ZhbHVlKSB7XG4gICAgICByZXR1cm4gdGhpcy5fdGVtcGxhdGVSZXN1bHQ7XG4gICAgfVxuICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gICAgY29uc3Qgc3RyaW5ncyA9IFt2YWx1ZV0gYXMgdW5rbm93biBhcyBUZW1wbGF0ZVN0cmluZ3NBcnJheTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIChzdHJpbmdzIGFzIGFueSkucmF3ID0gc3RyaW5ncztcbiAgICAvLyBXQVJOSU5HOiBpbXBlcnNvbmF0aW5nIGEgVGVtcGxhdGVSZXN1bHQgbGlrZSB0aGlzIGlzIGV4dHJlbWVseVxuICAgIC8vIGRhbmdlcm91cy4gVGhpcmQtcGFydHkgZGlyZWN0aXZlcyBzaG91bGQgbm90IGRvIHRoaXMuXG4gICAgcmV0dXJuICh0aGlzLl90ZW1wbGF0ZVJlc3VsdCA9IHtcbiAgICAgIC8vIENhc3QgdG8gYSBrbm93biBzZXQgb2YgaW50ZWdlcnMgdGhhdCBzYXRpc2Z5IFJlc3VsdFR5cGUgc28gdGhhdCB3ZVxuICAgICAgLy8gZG9uJ3QgaGF2ZSB0byBleHBvcnQgUmVzdWx0VHlwZSBhbmQgcG9zc2libHkgZW5jb3VyYWdlIHRoaXMgcGF0dGVybi5cbiAgICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgICBbJ18kbGl0VHlwZSQnXTogKHRoaXMuY29uc3RydWN0b3IgYXMgdHlwZW9mIFVuc2FmZUhUTUxEaXJlY3RpdmUpXG4gICAgICAgIC5yZXN1bHRUeXBlIGFzIDEgfCAyLFxuICAgICAgc3RyaW5ncyxcbiAgICAgIHZhbHVlczogW10sXG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW5kZXJzIHRoZSByZXN1bHQgYXMgSFRNTCwgcmF0aGVyIHRoYW4gdGV4dC5cbiAqXG4gKiBUaGUgdmFsdWVzIGB1bmRlZmluZWRgLCBgbnVsbGAsIGFuZCBgbm90aGluZ2AsIHdpbGwgYWxsIHJlc3VsdCBpbiBubyBjb250ZW50XG4gKiAoZW1wdHkgc3RyaW5nKSBiZWluZyByZW5kZXJlZC5cbiAqXG4gKiBOb3RlLCB0aGlzIGlzIHVuc2FmZSB0byB1c2Ugd2l0aCBhbnkgdXNlci1wcm92aWRlZCBpbnB1dCB0aGF0IGhhc24ndCBiZWVuXG4gKiBzYW5pdGl6ZWQgb3IgZXNjYXBlZCwgYXMgaXQgbWF5IGxlYWQgdG8gY3Jvc3Mtc2l0ZS1zY3JpcHRpbmdcbiAqIHZ1bG5lcmFiaWxpdGllcy5cbiAqL1xuZXhwb3J0IGNvbnN0IHVuc2FmZUhUTUwgPSBkaXJlY3RpdmUoVW5zYWZlSFRNTERpcmVjdGl2ZSk7XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtkaXJlY3RpdmV9IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge1Vuc2FmZUhUTUxEaXJlY3RpdmV9IGZyb20gJy4vdW5zYWZlLWh0bWwuanMnO1xuXG5jb25zdCBTVkdfUkVTVUxUID0gMjtcblxuY2xhc3MgVW5zYWZlU1ZHRGlyZWN0aXZlIGV4dGVuZHMgVW5zYWZlSFRNTERpcmVjdGl2ZSB7XG4gIHN0YXRpYyBvdmVycmlkZSBkaXJlY3RpdmVOYW1lID0gJ3Vuc2FmZVNWRyc7XG4gIHN0YXRpYyBvdmVycmlkZSByZXN1bHRUeXBlID0gU1ZHX1JFU1VMVDtcbn1cblxuLyoqXG4gKiBSZW5kZXJzIHRoZSByZXN1bHQgYXMgU1ZHLCByYXRoZXIgdGhhbiB0ZXh0LlxuICpcbiAqIFRoZSB2YWx1ZXMgYHVuZGVmaW5lZGAsIGBudWxsYCwgYW5kIGBub3RoaW5nYCwgd2lsbCBhbGwgcmVzdWx0IGluIG5vIGNvbnRlbnRcbiAqIChlbXB0eSBzdHJpbmcpIGJlaW5nIHJlbmRlcmVkLlxuICpcbiAqIE5vdGUsIHRoaXMgaXMgdW5zYWZlIHRvIHVzZSB3aXRoIGFueSB1c2VyLXByb3ZpZGVkIGlucHV0IHRoYXQgaGFzbid0IGJlZW5cbiAqIHNhbml0aXplZCBvciBlc2NhcGVkLCBhcyBpdCBtYXkgbGVhZCB0byBjcm9zcy1zaXRlLXNjcmlwdGluZ1xuICogdnVsbmVyYWJpbGl0aWVzLlxuICovXG5leHBvcnQgY29uc3QgdW5zYWZlU1ZHID0gZGlyZWN0aXZlKFVuc2FmZVNWR0RpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7VW5zYWZlU1ZHRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge1BhcnQsIG5vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2lzUHJpbWl0aXZlfSBmcm9tICcuLi9kaXJlY3RpdmUtaGVscGVycy5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgQXN5bmNEaXJlY3RpdmV9IGZyb20gJy4uL2FzeW5jLWRpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge1BhdXNlciwgUHNldWRvV2Vha1JlZn0gZnJvbSAnLi9wcml2YXRlLWFzeW5jLWhlbHBlcnMuanMnO1xuXG5jb25zdCBpc1Byb21pc2UgPSAoeDogdW5rbm93bikgPT4ge1xuICByZXR1cm4gIWlzUHJpbWl0aXZlKHgpICYmIHR5cGVvZiAoeCBhcyB7dGhlbj86IHVua25vd259KS50aGVuID09PSAnZnVuY3Rpb24nO1xufTtcbi8vIEVmZmVjdGl2ZWx5IGluZmluaXR5LCBidXQgYSBTTUkuXG5jb25zdCBfaW5maW5pdHkgPSAweDNmZmZmZmZmO1xuXG5leHBvcnQgY2xhc3MgVW50aWxEaXJlY3RpdmUgZXh0ZW5kcyBBc3luY0RpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX19sYXN0UmVuZGVyZWRJbmRleDogbnVtYmVyID0gX2luZmluaXR5O1xuICBwcml2YXRlIF9fdmFsdWVzOiB1bmtub3duW10gPSBbXTtcbiAgcHJpdmF0ZSBfX3dlYWtUaGlzID0gbmV3IFBzZXVkb1dlYWtSZWYodGhpcyk7XG4gIHByaXZhdGUgX19wYXVzZXIgPSBuZXcgUGF1c2VyKCk7XG5cbiAgcmVuZGVyKC4uLmFyZ3M6IEFycmF5PHVua25vd24+KTogdW5rbm93biB7XG4gICAgcmV0dXJuIGFyZ3MuZmluZCgoeCkgPT4gIWlzUHJvbWlzZSh4KSkgPz8gbm9DaGFuZ2U7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUoX3BhcnQ6IFBhcnQsIGFyZ3M6IEFycmF5PHVua25vd24+KSB7XG4gICAgY29uc3QgcHJldmlvdXNWYWx1ZXMgPSB0aGlzLl9fdmFsdWVzO1xuICAgIGxldCBwcmV2aW91c0xlbmd0aCA9IHByZXZpb3VzVmFsdWVzLmxlbmd0aDtcbiAgICB0aGlzLl9fdmFsdWVzID0gYXJncztcblxuICAgIGNvbnN0IHdlYWtUaGlzID0gdGhpcy5fX3dlYWtUaGlzO1xuICAgIGNvbnN0IHBhdXNlciA9IHRoaXMuX19wYXVzZXI7XG5cbiAgICAvLyBJZiBvdXIgaW5pdGlhbCByZW5kZXIgb2NjdXJzIHdoaWxlIGRpc2Nvbm5lY3RlZCwgZW5zdXJlIHRoYXQgdGhlIHBhdXNlclxuICAgIC8vIGFuZCB3ZWFrVGhpcyBhcmUgaW4gdGhlIGRpc2Nvbm5lY3RlZCBzdGF0ZVxuICAgIGlmICghdGhpcy5pc0Nvbm5lY3RlZCkge1xuICAgICAgdGhpcy5kaXNjb25uZWN0ZWQoKTtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIC8vIElmIHdlJ3ZlIHJlbmRlcmVkIGEgaGlnaGVyLXByaW9yaXR5IHZhbHVlIGFscmVhZHksIHN0b3AuXG4gICAgICBpZiAoaSA+IHRoaXMuX19sYXN0UmVuZGVyZWRJbmRleCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgY29uc3QgdmFsdWUgPSBhcmdzW2ldO1xuXG4gICAgICAvLyBSZW5kZXIgbm9uLVByb21pc2UgdmFsdWVzIGltbWVkaWF0ZWx5XG4gICAgICBpZiAoIWlzUHJvbWlzZSh2YWx1ZSkpIHtcbiAgICAgICAgdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4ID0gaTtcbiAgICAgICAgLy8gU2luY2UgYSBsb3dlci1wcmlvcml0eSB2YWx1ZSB3aWxsIG5ldmVyIG92ZXJ3cml0ZSBhIGhpZ2hlci1wcmlvcml0eVxuICAgICAgICAvLyBzeW5jaHJvbm91cyB2YWx1ZSwgd2UgY2FuIHN0b3AgcHJvY2Vzc2luZyBub3cuXG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhpcyBpcyBhIFByb21pc2Ugd2UndmUgYWxyZWFkeSBoYW5kbGVkLCBza2lwIGl0LlxuICAgICAgaWYgKGkgPCBwcmV2aW91c0xlbmd0aCAmJiB2YWx1ZSA9PT0gcHJldmlvdXNWYWx1ZXNbaV0pIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIFdlIGhhdmUgYSBQcm9taXNlIHRoYXQgd2UgaGF2ZW4ndCBzZWVuIGJlZm9yZSwgc28gcHJpb3JpdGllcyBtYXkgaGF2ZVxuICAgICAgLy8gY2hhbmdlZC4gRm9yZ2V0IHdoYXQgd2UgcmVuZGVyZWQgYmVmb3JlLlxuICAgICAgdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4ID0gX2luZmluaXR5O1xuICAgICAgcHJldmlvdXNMZW5ndGggPSAwO1xuXG4gICAgICAvLyBOb3RlLCB0aGUgY2FsbGJhY2sgYXZvaWRzIGNsb3Npbmcgb3ZlciBgdGhpc2Agc28gdGhhdCB0aGUgZGlyZWN0aXZlXG4gICAgICAvLyBjYW4gYmUgZ2MnZWQgYmVmb3JlIHRoZSBwcm9taXNlIHJlc29sdmVzOyBpbnN0ZWFkIGB0aGlzYCBpcyByZXRyaWV2ZWRcbiAgICAgIC8vIGZyb20gYHdlYWtUaGlzYCwgd2hpY2ggY2FuIGJyZWFrIHRoZSBoYXJkIHJlZmVyZW5jZSBpbiB0aGUgY2xvc3VyZSB3aGVuXG4gICAgICAvLyB0aGUgZGlyZWN0aXZlIGRpc2Nvbm5lY3RzXG4gICAgICBQcm9taXNlLnJlc29sdmUodmFsdWUpLnRoZW4oYXN5bmMgKHJlc3VsdDogdW5rbm93bikgPT4ge1xuICAgICAgICAvLyBJZiB3ZSdyZSBkaXNjb25uZWN0ZWQsIHdhaXQgdW50aWwgd2UncmUgKG1heWJlKSByZWNvbm5lY3RlZFxuICAgICAgICAvLyBUaGUgd2hpbGUgbG9vcCBoZXJlIGhhbmRsZXMgdGhlIGNhc2UgdGhhdCB0aGUgY29ubmVjdGlvbiBzdGF0ZVxuICAgICAgICAvLyB0aHJhc2hlcywgY2F1c2luZyB0aGUgcGF1c2VyIHRvIHJlc3VtZSBhbmQgdGhlbiBnZXQgcmUtcGF1c2VkXG4gICAgICAgIHdoaWxlIChwYXVzZXIuZ2V0KCkpIHtcbiAgICAgICAgICBhd2FpdCBwYXVzZXIuZ2V0KCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgdGhlIGNhbGxiYWNrIGdldHMgaGVyZSBhbmQgdGhlcmUgaXMgbm8gYHRoaXNgLCBpdCBtZWFucyB0aGF0IHRoZVxuICAgICAgICAvLyBkaXJlY3RpdmUgaGFzIGJlZW4gZGlzY29ubmVjdGVkIGFuZCBnYXJiYWdlIGNvbGxlY3RlZCBhbmQgd2UgZG9uJ3RcbiAgICAgICAgLy8gbmVlZCB0byBkbyBhbnl0aGluZyBlbHNlXG4gICAgICAgIGNvbnN0IF90aGlzID0gd2Vha1RoaXMuZGVyZWYoKTtcbiAgICAgICAgaWYgKF90aGlzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb25zdCBpbmRleCA9IF90aGlzLl9fdmFsdWVzLmluZGV4T2YodmFsdWUpO1xuICAgICAgICAgIC8vIElmIHN0YXRlLnZhbHVlcyBkb2Vzbid0IGNvbnRhaW4gdGhlIHZhbHVlLCB3ZSd2ZSByZS1yZW5kZXJlZCB3aXRob3V0XG4gICAgICAgICAgLy8gdGhlIHZhbHVlLCBzbyBkb24ndCByZW5kZXIgaXQuIFRoZW4sIG9ubHkgcmVuZGVyIGlmIHRoZSB2YWx1ZSBpc1xuICAgICAgICAgIC8vIGhpZ2hlci1wcmlvcml0eSB0aGFuIHdoYXQncyBhbHJlYWR5IGJlZW4gcmVuZGVyZWQuXG4gICAgICAgICAgaWYgKGluZGV4ID4gLTEgJiYgaW5kZXggPCBfdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4KSB7XG4gICAgICAgICAgICBfdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgICBfdGhpcy5zZXRWYWx1ZShyZXN1bHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG5cbiAgb3ZlcnJpZGUgZGlzY29ubmVjdGVkKCkge1xuICAgIHRoaXMuX193ZWFrVGhpcy5kaXNjb25uZWN0KCk7XG4gICAgdGhpcy5fX3BhdXNlci5wYXVzZSgpO1xuICB9XG5cbiAgb3ZlcnJpZGUgcmVjb25uZWN0ZWQoKSB7XG4gICAgdGhpcy5fX3dlYWtUaGlzLnJlY29ubmVjdCh0aGlzKTtcbiAgICB0aGlzLl9fcGF1c2VyLnJlc3VtZSgpO1xuICB9XG59XG5cbi8qKlxuICogUmVuZGVycyBvbmUgb2YgYSBzZXJpZXMgb2YgdmFsdWVzLCBpbmNsdWRpbmcgUHJvbWlzZXMsIHRvIGEgUGFydC5cbiAqXG4gKiBWYWx1ZXMgYXJlIHJlbmRlcmVkIGluIHByaW9yaXR5IG9yZGVyLCB3aXRoIHRoZSBmaXJzdCBhcmd1bWVudCBoYXZpbmcgdGhlXG4gKiBoaWdoZXN0IHByaW9yaXR5IGFuZCB0aGUgbGFzdCBhcmd1bWVudCBoYXZpbmcgdGhlIGxvd2VzdCBwcmlvcml0eS4gSWYgYVxuICogdmFsdWUgaXMgYSBQcm9taXNlLCBsb3ctcHJpb3JpdHkgdmFsdWVzIHdpbGwgYmUgcmVuZGVyZWQgdW50aWwgaXQgcmVzb2x2ZXMuXG4gKlxuICogVGhlIHByaW9yaXR5IG9mIHZhbHVlcyBjYW4gYmUgdXNlZCB0byBjcmVhdGUgcGxhY2Vob2xkZXIgY29udGVudCBmb3IgYXN5bmNcbiAqIGRhdGEuIEZvciBleGFtcGxlLCBhIFByb21pc2Ugd2l0aCBwZW5kaW5nIGNvbnRlbnQgY2FuIGJlIHRoZSBmaXJzdCxcbiAqIGhpZ2hlc3QtcHJpb3JpdHksIGFyZ3VtZW50LCBhbmQgYSBub25fcHJvbWlzZSBsb2FkaW5nIGluZGljYXRvciB0ZW1wbGF0ZSBjYW5cbiAqIGJlIHVzZWQgYXMgdGhlIHNlY29uZCwgbG93ZXItcHJpb3JpdHksIGFyZ3VtZW50LiBUaGUgbG9hZGluZyBpbmRpY2F0b3Igd2lsbFxuICogcmVuZGVyIGltbWVkaWF0ZWx5LCBhbmQgdGhlIHByaW1hcnkgY29udGVudCB3aWxsIHJlbmRlciB3aGVuIHRoZSBQcm9taXNlXG4gKiByZXNvbHZlcy5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBjb25zdCBjb250ZW50ID0gZmV0Y2goJy4vY29udGVudC50eHQnKS50aGVuKHIgPT4gci50ZXh0KCkpO1xuICogaHRtbGAke3VudGlsKGNvbnRlbnQsIGh0bWxgPHNwYW4+TG9hZGluZy4uLjwvc3Bhbj5gKX1gXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHVudGlsID0gZGlyZWN0aXZlKFVudGlsRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbi8vIGV4cG9ydCB0eXBlIHtVbnRpbERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxudHlwZSBGYWxzeSA9IG51bGwgfCB1bmRlZmluZWQgfCBmYWxzZSB8IDAgfCAtMCB8IDBuIHwgJyc7XG5cbi8qKlxuICogV2hlbiBgY29uZGl0aW9uYCBpcyB0cnVlLCByZXR1cm5zIHRoZSByZXN1bHQgb2YgY2FsbGluZyBgdHJ1ZUNhc2UoKWAsIGVsc2VcbiAqIHJldHVybnMgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIGBmYWxzZUNhc2UoKWAgaWYgYGZhbHNlQ2FzZWAgaXMgZGVmaW5lZC5cbiAqXG4gKiBUaGlzIGlzIGEgY29udmVuaWVuY2Ugd3JhcHBlciBhcm91bmQgYSB0ZXJuYXJ5IGV4cHJlc3Npb24gdGhhdCBtYWtlcyBpdCBhXG4gKiBsaXR0bGUgbmljZXIgdG8gd3JpdGUgYW4gaW5saW5lIGNvbmRpdGlvbmFsIHdpdGhvdXQgYW4gZWxzZS5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiByZW5kZXIoKSB7XG4gKiAgIHJldHVybiBodG1sYFxuICogICAgICR7d2hlbih0aGlzLnVzZXIsICgpID0+IGh0bWxgVXNlcjogJHt0aGlzLnVzZXIudXNlcm5hbWV9YCwgKCkgPT4gaHRtbGBTaWduIEluLi4uYCl9XG4gKiAgIGA7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdoZW48QyBleHRlbmRzIEZhbHN5LCBULCBGID0gdW5kZWZpbmVkPihcbiAgY29uZGl0aW9uOiBDLFxuICB0cnVlQ2FzZTogKGM6IEMpID0+IFQsXG4gIGZhbHNlQ2FzZT86IChjOiBDKSA9PiBGXG4pOiBGO1xuZXhwb3J0IGZ1bmN0aW9uIHdoZW48QywgVCwgRj4oXG4gIGNvbmRpdGlvbjogQyBleHRlbmRzIEZhbHN5ID8gbmV2ZXIgOiBDLFxuICB0cnVlQ2FzZTogKGM6IEMpID0+IFQsXG4gIGZhbHNlQ2FzZT86IChjOiBDKSA9PiBGXG4pOiBUO1xuZXhwb3J0IGZ1bmN0aW9uIHdoZW48QywgVCwgRiA9IHVuZGVmaW5lZD4oXG4gIGNvbmRpdGlvbjogQyxcbiAgdHJ1ZUNhc2U6IChjOiBFeGNsdWRlPEMsIEZhbHN5PikgPT4gVCxcbiAgZmFsc2VDYXNlPzogKGM6IEV4dHJhY3Q8QywgRmFsc3k+KSA9PiBGXG4pOiBDIGV4dGVuZHMgRmFsc3kgPyBGIDogVDtcbmV4cG9ydCBmdW5jdGlvbiB3aGVuKFxuICBjb25kaXRpb246IHVua25vd24sXG4gIHRydWVDYXNlOiAoYzogdW5rbm93bikgPT4gdW5rbm93bixcbiAgZmFsc2VDYXNlPzogKGM6IHVua25vd24pID0+IHVua25vd25cbik6IHVua25vd24ge1xuICByZXR1cm4gY29uZGl0aW9uID8gdHJ1ZUNhc2UoY29uZGl0aW9uKSA6IGZhbHNlQ2FzZT8uKGNvbmRpdGlvbik7XG59XG4iLCJleHBvcnQge1xuICAgIFRlbXBsYXRlUmVzdWx0LFxuICAgIEhUTUxUZW1wbGF0ZVJlc3VsdCxcbiAgICBTVkdUZW1wbGF0ZVJlc3VsdCxcbiAgICBSZW5kZXJPcHRpb25zLFxuICAgIGh0bWwsXG4gICAgc3ZnLFxuICAgIHJlbmRlcixcbiAgICBub0NoYW5nZSxcbiAgICBub3RoaW5nLFxufSBmcm9tICdsaXQtaHRtbCc7XG5cbmV4cG9ydCB7IF8kTEggfSBmcm9tICdsaXQtaHRtbC9wcml2YXRlLXNzci1zdXBwb3J0JztcblxuZXhwb3J0IHtcbiAgICBEaXJlY3RpdmUsXG4gICAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbiAgICBQYXJ0LFxuICAgIFBhcnRJbmZvLFxuICAgIFBhcnRUeXBlLFxuICAgIGRpcmVjdGl2ZSxcbn0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlJztcblxuZXhwb3J0IHsgQXN5bmNEaXJlY3RpdmUgfSBmcm9tICdsaXQtaHRtbC9hc3luYy1kaXJlY3RpdmUnO1xuZXhwb3J0IHsgUmVmLCBjcmVhdGVSZWYgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3JlZic7XG5cbmltcG9ydCB7IGFzeW5jQXBwZW5kIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9hc3luYy1hcHBlbmQnO1xuaW1wb3J0IHsgYXN5bmNSZXBsYWNlIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9hc3luYy1yZXBsYWNlJztcbmltcG9ydCB7IGNhY2hlIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9jYWNoZSc7XG5pbXBvcnQgeyBjaG9vc2UgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2Nob29zZSc7XG5pbXBvcnQgeyBjbGFzc01hcCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvY2xhc3MtbWFwJztcbmltcG9ydCB7IGd1YXJkIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9ndWFyZCc7XG5pbXBvcnQgeyBpZkRlZmluZWQgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2lmLWRlZmluZWQnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvam9pbic7XG5pbXBvcnQgeyBrZXllZCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMva2V5ZWQnO1xuaW1wb3J0IHsgbGl2ZSB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvbGl2ZSc7XG5pbXBvcnQgeyBtYXAgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL21hcCc7XG5pbXBvcnQgeyByYW5nZSB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvcmFuZ2UnO1xuaW1wb3J0IHsgcmVmIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9yZWYnO1xuaW1wb3J0IHsgcmVwZWF0IH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9yZXBlYXQnO1xuaW1wb3J0IHsgc3R5bGVNYXAgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3N0eWxlLW1hcCc7XG5pbXBvcnQgeyB0ZW1wbGF0ZUNvbnRlbnQgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3RlbXBsYXRlLWNvbnRlbnQnO1xuaW1wb3J0IHsgdW5zYWZlSFRNTCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvdW5zYWZlLWh0bWwnO1xuaW1wb3J0IHsgdW5zYWZlU1ZHIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy91bnNhZmUtc3ZnJztcbmltcG9ydCB7IHVudGlsIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy91bnRpbCc7XG5pbXBvcnQgeyB3aGVuIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy93aGVuJztcblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbmRlY2xhcmUgbmFtZXNwYWNlIGRpcmVjdGl2ZXMge1xuICAgIGV4cG9ydCB0eXBlIGFzeW5jQXBwZW5kID0gdHlwZW9mIGFzeW5jQXBwZW5kO1xuICAgIGV4cG9ydCB0eXBlIGFzeW5jUmVwbGFjZSA9IHR5cGVvZiBhc3luY1JlcGxhY2U7XG4gICAgZXhwb3J0IHR5cGUgY2FjaGUgPSB0eXBlb2YgY2FjaGU7XG4gICAgZXhwb3J0IHR5cGUgY2hvb3NlID0gdHlwZW9mIGNob29zZTtcbiAgICBleHBvcnQgdHlwZSBjbGFzc01hcCA9IHR5cGVvZiBjbGFzc01hcDtcbiAgICBleHBvcnQgdHlwZSBndWFyZCA9IHR5cGVvZiBndWFyZDtcbiAgICBleHBvcnQgdHlwZSBpZkRlZmluZWQgPSB0eXBlb2YgaWZEZWZpbmVkO1xuICAgIGV4cG9ydCB0eXBlIGpvaW4gPSB0eXBlb2Ygam9pbjtcbiAgICBleHBvcnQgdHlwZSBrZXllZCA9IHR5cGVvZiBrZXllZDtcbiAgICBleHBvcnQgdHlwZSBsaXZlID0gdHlwZW9mIGxpdmU7XG4gICAgZXhwb3J0IHR5cGUgbWFwID0gdHlwZW9mIG1hcDtcbiAgICBleHBvcnQgdHlwZSByYW5nZSA9IHR5cGVvZiByYW5nZTtcbiAgICBleHBvcnQgdHlwZSByZWYgPSB0eXBlb2YgcmVmO1xuICAgIGV4cG9ydCB0eXBlIHJlcGVhdCA9IHR5cGVvZiByZXBlYXQ7XG4gICAgZXhwb3J0IHR5cGUgc3R5bGVNYXAgPSB0eXBlb2Ygc3R5bGVNYXA7XG4gICAgZXhwb3J0IHR5cGUgdGVtcGxhdGVDb250ZW50ID0gdHlwZW9mIHRlbXBsYXRlQ29udGVudDtcbiAgICBleHBvcnQgdHlwZSB1bnNhZmVIVE1MID0gdHlwZW9mIHVuc2FmZUhUTUw7XG4gICAgZXhwb3J0IHR5cGUgdW5zYWZlU1ZHID0gdHlwZW9mIHVuc2FmZVNWRztcbiAgICBleHBvcnQgdHlwZSB1bnRpbCA9IHR5cGVvZiB1bnRpbDtcbiAgICBleHBvcnQgdHlwZSB3aGVuID0gdHlwZW9mIHdoZW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVEaXJlY3RpdmVzIHtcbiAgICBhc3luY0FwcGVuZDogZGlyZWN0aXZlcy5hc3luY0FwcGVuZDtcbiAgICBhc3luY1JlcGxhY2U6IGRpcmVjdGl2ZXMuYXN5bmNSZXBsYWNlO1xuICAgIGNhY2hlOiBkaXJlY3RpdmVzLmNhY2hlO1xuICAgIGNob29zZTogZGlyZWN0aXZlcy5jaG9vc2U7XG4gICAgY2xhc3NNYXA6IGRpcmVjdGl2ZXMuY2xhc3NNYXA7XG4gICAgZ3VhcmQ6IGRpcmVjdGl2ZXMuZ3VhcmQ7XG4gICAgaWZEZWZpbmVkOiBkaXJlY3RpdmVzLmlmRGVmaW5lZDtcbiAgICBqb2luOiBkaXJlY3RpdmVzLmpvaW47XG4gICAga2V5ZWQ6IGRpcmVjdGl2ZXMua2V5ZWQ7XG4gICAgbGl2ZTogZGlyZWN0aXZlcy5saXZlO1xuICAgIG1hcDogZGlyZWN0aXZlcy5tYXA7XG4gICAgcmFuZ2U6IGRpcmVjdGl2ZXMucmFuZ2U7XG4gICAgcmVmOiBkaXJlY3RpdmVzLnJlZjtcbiAgICByZXBlYXQ6IGRpcmVjdGl2ZXMucmVwZWF0O1xuICAgIHN0eWxlTWFwOiBkaXJlY3RpdmVzLnN0eWxlTWFwO1xuICAgIHRlbXBsYXRlQ29udGVudDogZGlyZWN0aXZlcy50ZW1wbGF0ZUNvbnRlbnQ7XG4gICAgdW5zYWZlSFRNTDogZGlyZWN0aXZlcy51bnNhZmVIVE1MO1xuICAgIHVuc2FmZVNWRzogZGlyZWN0aXZlcy51bnNhZmVTVkc7XG4gICAgdW50aWw6IGRpcmVjdGl2ZXMudW50aWw7XG4gICAgd2hlbjogZGlyZWN0aXZlcy53aGVuO1xufVxuXG5leHBvcnQgY29uc3QgZGlyZWN0aXZlczogVGVtcGxhdGVEaXJlY3RpdmVzID0ge1xuICAgIGFzeW5jQXBwZW5kLFxuICAgIGFzeW5jUmVwbGFjZSxcbiAgICBjYWNoZSxcbiAgICBjaG9vc2UsXG4gICAgY2xhc3NNYXAsXG4gICAgZ3VhcmQsXG4gICAgaWZEZWZpbmVkLFxuICAgIGpvaW4sXG4gICAga2V5ZWQsXG4gICAgbGl2ZSxcbiAgICBtYXAsXG4gICAgcmFuZ2UsXG4gICAgcmVmLFxuICAgIHJlcGVhdCxcbiAgICBzdHlsZU1hcCxcbiAgICB0ZW1wbGF0ZUNvbnRlbnQsXG4gICAgdW5zYWZlSFRNTCxcbiAgICB1bnNhZmVTVkcsXG4gICAgdW50aWwsXG4gICAgd2hlbixcbn07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZnJvbSBgc3RyaW5nYCB0byBgVGVtcGxhdGVTdHJpbmdzQXJyYXlgLiA8YnI+XG4gKiAgICAgVGhpcyBtZXRob2QgaXMgaGVscGVyIGJyaWdkZ2UgZm9yIHRoZSB7QGxpbmsgaHRtbH0gb3IgdGhlIHtAbGluayBzdmd9IGFyZSBhYmxlIHRvIHJlY2VpdmVkIHBsYWluIHN0cmluZy5cbiAqIEBqYSBgc3RyaW5nYCDjgpIgYFRlbXBsYXRlU3RyaW5nc0FycmF5YOOBq+WkieaPmy4gPGJyPlxuICogICAgIHtAbGluayBodG1sfSDjgoQge0BsaW5rIHN2Z30g44GM5paH5a2X5YiX44KS5Y+X44GR5LuY44GR44KL44Gf44KB44Gu44OW44Oq44OD44K444Oh44K944OD44OJXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyB0b1RlbXBsYXRlU3RyaW5nc0FycmF5IGFzIGJyaWRnZSB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogY29uc3QgcmF3ID0gJzxwPkhlbGxvIFJhdyBTdHJpbmc8L3A+JztcbiAqIHJlbmRlcihodG1sKGJyaWRnZShyYXcpKSwgZG9jdW1lbnQuYm9keSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHBsYWluIHN0cmluZyAvIHN0cmluZyBhcnJheS4gZXgpIHtAbGluayBKU1R9IHJldHVybmVkIHZhbHVlLlxuICogIC0gYGphYCDjg5fjg6zjg7zjg7PmloflrZfliJcgLyDmloflrZfliJfphY3liJcuIGV4KSB7QGxpbmsgSlNUfSDjga7miLvjgorlgKTjgarjganjgpLmg7PlrppcbiAqL1xuZXhwb3J0IGNvbnN0IHRvVGVtcGxhdGVTdHJpbmdzQXJyYXkgPSAoc3JjOiBzdHJpbmcgfCBzdHJpbmdbXSB8IFRlbXBsYXRlU3RyaW5nc0FycmF5KTogVGVtcGxhdGVTdHJpbmdzQXJyYXkgPT4ge1xuICAgIGNvbnN0IHN0cmluZ3MgPSBBcnJheS5pc0FycmF5KHNyYykgPyBzcmMgOiBbc3JjXTtcbiAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzdHJpbmdzLCAncmF3JykpIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHN0cmluZ3MsICdyYXcnLCB7IHZhbHVlOiBzdHJpbmdzIH0pO1xuICAgIH1cbiAgICByZXR1cm4gc3RyaW5ncyBhcyB1bmtub3duIGFzIFRlbXBsYXRlU3RyaW5nc0FycmF5O1xufTtcbiJdLCJuYW1lcyI6WyJ3cmFwIiwiY3JlYXRlTWFya2VyIiwiaXNQcmltaXRpdmUiLCJIVE1MX1JFU1VMVCIsIlNWR19SRVNVTFQiLCJDaGlsZFBhcnQiLCJfJExIIiwicCJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQTs7OztBQUlHO0FBV0g7QUFDQSxNQUFNLE1BQU0sR0FBRyxVQUFVO0FBcU96QixNQUFNQSxNQUFJLEdBS0osQ0FBaUIsSUFBTyxLQUFLLElBQUk7QUFFdkMsTUFBTSxZQUFZLEdBQUksTUFBd0MsQ0FBQyxZQUFZO0FBRTNFOzs7Ozs7O0FBT0c7QUFDSCxNQUFNLE1BQU0sR0FBRztBQUNiLE1BQUUsWUFBWSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUU7QUFDcEMsUUFBQSxVQUFVLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQztLQUNyQjtNQUNELFNBQVM7QUEwRWI7QUFDQTtBQUNBLE1BQU0sb0JBQW9CLEdBQUcsT0FBTztBQUVwQztBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU0sTUFBTSxHQUFHLENBQUEsSUFBQSxFQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBRTFEO0FBQ0EsTUFBTSxXQUFXLEdBQUcsR0FBRyxHQUFHLE1BQU07QUFFaEM7QUFDQTtBQUNBLE1BQU0sVUFBVSxHQUFHLENBQUEsQ0FBQSxFQUFJLFdBQVcsR0FBRztBQUVyQyxNQUFNLENBQUMsR0FPRCxRQUFRO0FBRWQ7QUFDQSxNQUFNQyxjQUFZLEdBQUcsTUFBTSxDQUFDLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztBQUk5QyxNQUFNQyxhQUFXLEdBQUcsQ0FBQyxLQUFjLEtBQ2pDLEtBQUssS0FBSyxJQUFJLEtBQUssT0FBTyxLQUFLLElBQUksUUFBUSxJQUFJLE9B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OUM7OztBQUdHO0FBQ0g7O0FDeElBOzs7O0FBSUc7U0FvQ2EsSUFBSSxDQUNsQixTQUFrQixFQUNsQixRQUFpQyxFQUNqQyxTQUFtQyxFQUFBO0FBRW5DLElBQUEsT0FBTyxTQUFTLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLFNBQVMsR0FBRyxTQUFTLENBQUM7QUFDakU7O0FDZ0RPLE1BQU0sVUFBVSxHQUF1QjtJQUMxQyxXQUFXO0lBQ1gsWUFBWTtJQUNaLEtBQUs7SUFDTCxNQUFNO0lBQ04sUUFBUTtJQUNSLEtBQUs7SUFDTCxTQUFTO0lBQ1QsSUFBSTtJQUNKLEtBQUs7SUFDTCxJQUFJO0lBQ0osR0FBRztJQUNILEtBQUs7SUFDTCxHQUFHO0lBQ0gsTUFBTTtJQUNOLFFBQVE7SUFDUixlQUFlO0lBQ2YsVUFBVTtJQUNWLFNBQVM7SUFDVCxLQUFLO0lBQ0wsSUFBSTs7QUFHUjs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JHO0FBQ0ksTUFBTSxzQkFBc0IsR0FBRyxDQUFDLEdBQTZDLEtBQTBCO0FBQzFHLElBQUEsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7QUFDaEQsSUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsRUFBRTtBQUN2RCxRQUFBLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQztJQUM3RDtBQUNBLElBQUEsT0FBTyxPQUEwQztBQUNyRDs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwxLDIsMyw0LDUsNiw3LDgsOSwxMCwxMSwxMiwxMywxNCwxNSwxNiwxNywxOCwxOSwyMCwyMSwyMiwyMywyNCwyNV0sInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9leHRlbnNpb24tdGVtcGxhdGUvIn0=