/*!
 * @cdp/extension-template 0.9.19
 *   extension for template engine
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.CDP = global.CDP || {}, global.CDP.Exension = global.CDP.Exension || {})));
})(this, (function (exports) { 'use strict';

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
         *     which ChildParts are being removed, used for disconnecting directives in
         *     those Parts.
         *
         * @internal
         */
        _$clear(start = wrap$1(this._$startNode).nextSibling, from) {
            this._$notifyConnectionChanged?.(false, true, from);
            while (start && start !== this._$endNode) {
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
    (global.litHtmlVersions ??= []).push('3.3.0');
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
            if (directiveClass.prototype._$resolve !== resolveOverrideFn) {
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
     * Removes a ChildPart from the DOM, including any of its content.
     *
     * @param part The Part to remove
     */
    const removePart = (part) => {
        part._$notifyConnectionChanged?.(false, true);
        let start = part._$startNode;
        const end = wrap(part._$endNode).nextSibling;
        while (start !== end) {
            const n = wrap(start).nextSibling;
            wrap(start).remove();
            start = n;
        }
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

    exports.AsyncDirective = AsyncDirective;
    exports.Directive = Directive;
    exports.PartType = PartType;
    exports._$LH = _$LH;
    exports.createRef = createRef;
    exports.directive = directive;
    exports.directives = directives;
    exports.html = html;
    exports.noChange = noChange;
    exports.nothing = nothing;
    exports.render = render;
    exports.svg = svg;
    exports.toTemplateStringsArray = toTemplateStringsArray;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLmpzIiwic291cmNlcyI6WyJsaXQtaHRtbC9zcmMvbGl0LWh0bWwudHMiLCJsaXQtaHRtbC9zcmMvcHJpdmF0ZS1zc3Itc3VwcG9ydC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmUudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlLWhlbHBlcnMudHMiLCJsaXQtaHRtbC9zcmMvYXN5bmMtZGlyZWN0aXZlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvcmVmLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvcHJpdmF0ZS1hc3luYy1oZWxwZXJzLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvYXN5bmMtcmVwbGFjZS50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2FzeW5jLWFwcGVuZC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2NhY2hlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvY2hvb3NlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvY2xhc3MtbWFwLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvZ3VhcmQudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9pZi1kZWZpbmVkLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvam9pbi50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2tleWVkLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvbGl2ZS50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL21hcC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3JhbmdlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvcmVwZWF0LnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvc3R5bGUtbWFwLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvdGVtcGxhdGUtY29udGVudC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3Vuc2FmZS1odG1sLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvdW5zYWZlLXN2Zy50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3VudGlsLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvd2hlbi50cyIsImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG4vLyBJTVBPUlRBTlQ6IHRoZXNlIGltcG9ydHMgbXVzdCBiZSB0eXBlLW9ubHlcbmltcG9ydCB0eXBlIHtEaXJlY3RpdmUsIERpcmVjdGl2ZVJlc3VsdCwgUGFydEluZm99IGZyb20gJy4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB0eXBlIHtUcnVzdGVkSFRNTCwgVHJ1c3RlZFR5cGVzV2luZG93fSBmcm9tICd0cnVzdGVkLXR5cGVzL2xpYi9pbmRleC5qcyc7XG5cbmNvbnN0IERFVl9NT0RFID0gdHJ1ZTtcbmNvbnN0IEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUyA9IHRydWU7XG5jb25zdCBFTkFCTEVfU0hBRFlET01fTk9QQVRDSCA9IHRydWU7XG5jb25zdCBOT0RFX01PREUgPSBmYWxzZTtcblxuLy8gQWxsb3dzIG1pbmlmaWVycyB0byByZW5hbWUgcmVmZXJlbmNlcyB0byBnbG9iYWxUaGlzXG5jb25zdCBnbG9iYWwgPSBnbG9iYWxUaGlzO1xuXG4vKipcbiAqIENvbnRhaW5zIHR5cGVzIHRoYXQgYXJlIHBhcnQgb2YgdGhlIHVuc3RhYmxlIGRlYnVnIEFQSS5cbiAqXG4gKiBFdmVyeXRoaW5nIGluIHRoaXMgQVBJIGlzIG5vdCBzdGFibGUgYW5kIG1heSBjaGFuZ2Ugb3IgYmUgcmVtb3ZlZCBpbiB0aGUgZnV0dXJlLFxuICogZXZlbiBvbiBwYXRjaCByZWxlYXNlcy5cbiAqL1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbmV4cG9ydCBuYW1lc3BhY2UgTGl0VW5zdGFibGUge1xuICAvKipcbiAgICogV2hlbiBMaXQgaXMgcnVubmluZyBpbiBkZXYgbW9kZSBhbmQgYHdpbmRvdy5lbWl0TGl0RGVidWdMb2dFdmVudHNgIGlzIHRydWUsXG4gICAqIHdlIHdpbGwgZW1pdCAnbGl0LWRlYnVnJyBldmVudHMgdG8gd2luZG93LCB3aXRoIGxpdmUgZGV0YWlscyBhYm91dCB0aGUgdXBkYXRlIGFuZCByZW5kZXJcbiAgICogbGlmZWN5Y2xlLiBUaGVzZSBjYW4gYmUgdXNlZnVsIGZvciB3cml0aW5nIGRlYnVnIHRvb2xpbmcgYW5kIHZpc3VhbGl6YXRpb25zLlxuICAgKlxuICAgKiBQbGVhc2UgYmUgYXdhcmUgdGhhdCBydW5uaW5nIHdpdGggd2luZG93LmVtaXRMaXREZWJ1Z0xvZ0V2ZW50cyBoYXMgcGVyZm9ybWFuY2Ugb3ZlcmhlYWQsXG4gICAqIG1ha2luZyBjZXJ0YWluIG9wZXJhdGlvbnMgdGhhdCBhcmUgbm9ybWFsbHkgdmVyeSBjaGVhcCAobGlrZSBhIG5vLW9wIHJlbmRlcikgbXVjaCBzbG93ZXIsXG4gICAqIGJlY2F1c2Ugd2UgbXVzdCBjb3B5IGRhdGEgYW5kIGRpc3BhdGNoIGV2ZW50cy5cbiAgICovXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlXG4gIGV4cG9ydCBuYW1lc3BhY2UgRGVidWdMb2cge1xuICAgIGV4cG9ydCB0eXBlIEVudHJ5ID1cbiAgICAgIHwgVGVtcGxhdGVQcmVwXG4gICAgICB8IFRlbXBsYXRlSW5zdGFudGlhdGVkXG4gICAgICB8IFRlbXBsYXRlSW5zdGFudGlhdGVkQW5kVXBkYXRlZFxuICAgICAgfCBUZW1wbGF0ZVVwZGF0aW5nXG4gICAgICB8IEJlZ2luUmVuZGVyXG4gICAgICB8IEVuZFJlbmRlclxuICAgICAgfCBDb21taXRQYXJ0RW50cnlcbiAgICAgIHwgU2V0UGFydFZhbHVlO1xuICAgIGV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVQcmVwIHtcbiAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSBwcmVwJztcbiAgICAgIHRlbXBsYXRlOiBUZW1wbGF0ZTtcbiAgICAgIHN0cmluZ3M6IFRlbXBsYXRlU3RyaW5nc0FycmF5O1xuICAgICAgY2xvbmFibGVUZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudDtcbiAgICAgIHBhcnRzOiBUZW1wbGF0ZVBhcnRbXTtcbiAgICB9XG4gICAgZXhwb3J0IGludGVyZmFjZSBCZWdpblJlbmRlciB7XG4gICAgICBraW5kOiAnYmVnaW4gcmVuZGVyJztcbiAgICAgIGlkOiBudW1iZXI7XG4gICAgICB2YWx1ZTogdW5rbm93bjtcbiAgICAgIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCBEb2N1bWVudEZyYWdtZW50O1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICAgIHBhcnQ6IENoaWxkUGFydCB8IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZXhwb3J0IGludGVyZmFjZSBFbmRSZW5kZXIge1xuICAgICAga2luZDogJ2VuZCByZW5kZXInO1xuICAgICAgaWQ6IG51bWJlcjtcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgY29udGFpbmVyOiBIVE1MRWxlbWVudCB8IERvY3VtZW50RnJhZ21lbnQ7XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgICAgcGFydDogQ2hpbGRQYXJ0O1xuICAgIH1cbiAgICBleHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlSW5zdGFudGlhdGVkIHtcbiAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSBpbnN0YW50aWF0ZWQnO1xuICAgICAgdGVtcGxhdGU6IFRlbXBsYXRlIHwgQ29tcGlsZWRUZW1wbGF0ZTtcbiAgICAgIGluc3RhbmNlOiBUZW1wbGF0ZUluc3RhbmNlO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICAgIGZyYWdtZW50OiBOb2RlO1xuICAgICAgcGFydHM6IEFycmF5PFBhcnQgfCB1bmRlZmluZWQ+O1xuICAgICAgdmFsdWVzOiB1bmtub3duW107XG4gICAgfVxuICAgIGV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVJbnN0YW50aWF0ZWRBbmRVcGRhdGVkIHtcbiAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSBpbnN0YW50aWF0ZWQgYW5kIHVwZGF0ZWQnO1xuICAgICAgdGVtcGxhdGU6IFRlbXBsYXRlIHwgQ29tcGlsZWRUZW1wbGF0ZTtcbiAgICAgIGluc3RhbmNlOiBUZW1wbGF0ZUluc3RhbmNlO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICAgIGZyYWdtZW50OiBOb2RlO1xuICAgICAgcGFydHM6IEFycmF5PFBhcnQgfCB1bmRlZmluZWQ+O1xuICAgICAgdmFsdWVzOiB1bmtub3duW107XG4gICAgfVxuICAgIGV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVVcGRhdGluZyB7XG4gICAgICBraW5kOiAndGVtcGxhdGUgdXBkYXRpbmcnO1xuICAgICAgdGVtcGxhdGU6IFRlbXBsYXRlIHwgQ29tcGlsZWRUZW1wbGF0ZTtcbiAgICAgIGluc3RhbmNlOiBUZW1wbGF0ZUluc3RhbmNlO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICAgIHBhcnRzOiBBcnJheTxQYXJ0IHwgdW5kZWZpbmVkPjtcbiAgICAgIHZhbHVlczogdW5rbm93bltdO1xuICAgIH1cbiAgICBleHBvcnQgaW50ZXJmYWNlIFNldFBhcnRWYWx1ZSB7XG4gICAgICBraW5kOiAnc2V0IHBhcnQnO1xuICAgICAgcGFydDogUGFydDtcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgdmFsdWVJbmRleDogbnVtYmVyO1xuICAgICAgdmFsdWVzOiB1bmtub3duW107XG4gICAgICB0ZW1wbGF0ZUluc3RhbmNlOiBUZW1wbGF0ZUluc3RhbmNlO1xuICAgIH1cblxuICAgIGV4cG9ydCB0eXBlIENvbW1pdFBhcnRFbnRyeSA9XG4gICAgICB8IENvbW1pdE5vdGhpbmdUb0NoaWxkRW50cnlcbiAgICAgIHwgQ29tbWl0VGV4dFxuICAgICAgfCBDb21taXROb2RlXG4gICAgICB8IENvbW1pdEF0dHJpYnV0ZVxuICAgICAgfCBDb21taXRQcm9wZXJ0eVxuICAgICAgfCBDb21taXRCb29sZWFuQXR0cmlidXRlXG4gICAgICB8IENvbW1pdEV2ZW50TGlzdGVuZXJcbiAgICAgIHwgQ29tbWl0VG9FbGVtZW50QmluZGluZztcblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0Tm90aGluZ1RvQ2hpbGRFbnRyeSB7XG4gICAgICBraW5kOiAnY29tbWl0IG5vdGhpbmcgdG8gY2hpbGQnO1xuICAgICAgc3RhcnQ6IENoaWxkTm9kZTtcbiAgICAgIGVuZDogQ2hpbGROb2RlIHwgbnVsbDtcbiAgICAgIHBhcmVudDogRGlzY29ubmVjdGFibGUgfCB1bmRlZmluZWQ7XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0VGV4dCB7XG4gICAgICBraW5kOiAnY29tbWl0IHRleHQnO1xuICAgICAgbm9kZTogVGV4dDtcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBleHBvcnQgaW50ZXJmYWNlIENvbW1pdE5vZGUge1xuICAgICAga2luZDogJ2NvbW1pdCBub2RlJztcbiAgICAgIHN0YXJ0OiBOb2RlO1xuICAgICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSB8IHVuZGVmaW5lZDtcbiAgICAgIHZhbHVlOiBOb2RlO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBleHBvcnQgaW50ZXJmYWNlIENvbW1pdEF0dHJpYnV0ZSB7XG4gICAgICBraW5kOiAnY29tbWl0IGF0dHJpYnV0ZSc7XG4gICAgICBlbGVtZW50OiBFbGVtZW50O1xuICAgICAgbmFtZTogc3RyaW5nO1xuICAgICAgdmFsdWU6IHVua25vd247XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0UHJvcGVydHkge1xuICAgICAga2luZDogJ2NvbW1pdCBwcm9wZXJ0eSc7XG4gICAgICBlbGVtZW50OiBFbGVtZW50O1xuICAgICAgbmFtZTogc3RyaW5nO1xuICAgICAgdmFsdWU6IHVua25vd247XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0Qm9vbGVhbkF0dHJpYnV0ZSB7XG4gICAgICBraW5kOiAnY29tbWl0IGJvb2xlYW4gYXR0cmlidXRlJztcbiAgICAgIGVsZW1lbnQ6IEVsZW1lbnQ7XG4gICAgICBuYW1lOiBzdHJpbmc7XG4gICAgICB2YWx1ZTogYm9vbGVhbjtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZXhwb3J0IGludGVyZmFjZSBDb21taXRFdmVudExpc3RlbmVyIHtcbiAgICAgIGtpbmQ6ICdjb21taXQgZXZlbnQgbGlzdGVuZXInO1xuICAgICAgZWxlbWVudDogRWxlbWVudDtcbiAgICAgIG5hbWU6IHN0cmluZztcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgb2xkTGlzdGVuZXI6IHVua25vd247XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgICAgLy8gVHJ1ZSBpZiB3ZSdyZSByZW1vdmluZyB0aGUgb2xkIGV2ZW50IGxpc3RlbmVyIChlLmcuIGJlY2F1c2Ugc2V0dGluZ3MgY2hhbmdlZCwgb3IgdmFsdWUgaXMgbm90aGluZylcbiAgICAgIHJlbW92ZUxpc3RlbmVyOiBib29sZWFuO1xuICAgICAgLy8gVHJ1ZSBpZiB3ZSdyZSBhZGRpbmcgYSBuZXcgZXZlbnQgbGlzdGVuZXIgKGUuZy4gYmVjYXVzZSBmaXJzdCByZW5kZXIsIG9yIHNldHRpbmdzIGNoYW5nZWQpXG4gICAgICBhZGRMaXN0ZW5lcjogYm9vbGVhbjtcbiAgICB9XG5cbiAgICBleHBvcnQgaW50ZXJmYWNlIENvbW1pdFRvRWxlbWVudEJpbmRpbmcge1xuICAgICAga2luZDogJ2NvbW1pdCB0byBlbGVtZW50IGJpbmRpbmcnO1xuICAgICAgZWxlbWVudDogRWxlbWVudDtcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cbn1cblxuaW50ZXJmYWNlIERlYnVnTG9nZ2luZ1dpbmRvdyB7XG4gIC8vIEV2ZW4gaW4gZGV2IG1vZGUsIHdlIGdlbmVyYWxseSBkb24ndCB3YW50IHRvIGVtaXQgdGhlc2UgZXZlbnRzLCBhcyB0aGF0J3NcbiAgLy8gYW5vdGhlciBsZXZlbCBvZiBjb3N0LCBzbyBvbmx5IGVtaXQgdGhlbSB3aGVuIERFVl9NT0RFIGlzIHRydWUgX2FuZF8gd2hlblxuICAvLyB3aW5kb3cuZW1pdExpdERlYnVnRXZlbnRzIGlzIHRydWUuXG4gIGVtaXRMaXREZWJ1Z0xvZ0V2ZW50cz86IGJvb2xlYW47XG59XG5cbi8qKlxuICogVXNlZnVsIGZvciB2aXN1YWxpemluZyBhbmQgbG9nZ2luZyBpbnNpZ2h0cyBpbnRvIHdoYXQgdGhlIExpdCB0ZW1wbGF0ZSBzeXN0ZW0gaXMgZG9pbmcuXG4gKlxuICogQ29tcGlsZWQgb3V0IG9mIHByb2QgbW9kZSBidWlsZHMuXG4gKi9cbmNvbnN0IGRlYnVnTG9nRXZlbnQgPSBERVZfTU9ERVxuICA/IChldmVudDogTGl0VW5zdGFibGUuRGVidWdMb2cuRW50cnkpID0+IHtcbiAgICAgIGNvbnN0IHNob3VsZEVtaXQgPSAoZ2xvYmFsIGFzIHVua25vd24gYXMgRGVidWdMb2dnaW5nV2luZG93KVxuICAgICAgICAuZW1pdExpdERlYnVnTG9nRXZlbnRzO1xuICAgICAgaWYgKCFzaG91bGRFbWl0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGdsb2JhbC5kaXNwYXRjaEV2ZW50KFxuICAgICAgICBuZXcgQ3VzdG9tRXZlbnQ8TGl0VW5zdGFibGUuRGVidWdMb2cuRW50cnk+KCdsaXQtZGVidWcnLCB7XG4gICAgICAgICAgZGV0YWlsOiBldmVudCxcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICA6IHVuZGVmaW5lZDtcbi8vIFVzZWQgZm9yIGNvbm5lY3RpbmcgYmVnaW5SZW5kZXIgYW5kIGVuZFJlbmRlciBldmVudHMgd2hlbiB0aGVyZSBhcmUgbmVzdGVkXG4vLyByZW5kZXJzIHdoZW4gZXJyb3JzIGFyZSB0aHJvd24gcHJldmVudGluZyBhbiBlbmRSZW5kZXIgZXZlbnQgZnJvbSBiZWluZ1xuLy8gY2FsbGVkLlxubGV0IGRlYnVnTG9nUmVuZGVySWQgPSAwO1xuXG5sZXQgaXNzdWVXYXJuaW5nOiAoY29kZTogc3RyaW5nLCB3YXJuaW5nOiBzdHJpbmcpID0+IHZvaWQ7XG5cbmlmIChERVZfTU9ERSkge1xuICBnbG9iYWwubGl0SXNzdWVkV2FybmluZ3MgPz89IG5ldyBTZXQoKTtcblxuICAvKipcbiAgICogSXNzdWUgYSB3YXJuaW5nIGlmIHdlIGhhdmVuJ3QgYWxyZWFkeSwgYmFzZWQgZWl0aGVyIG9uIGBjb2RlYCBvciBgd2FybmluZ2AuXG4gICAqIFdhcm5pbmdzIGFyZSBkaXNhYmxlZCBhdXRvbWF0aWNhbGx5IG9ubHkgYnkgYHdhcm5pbmdgOyBkaXNhYmxpbmcgdmlhIGBjb2RlYFxuICAgKiBjYW4gYmUgZG9uZSBieSB1c2Vycy5cbiAgICovXG4gIGlzc3VlV2FybmluZyA9IChjb2RlOiBzdHJpbmcsIHdhcm5pbmc6IHN0cmluZykgPT4ge1xuICAgIHdhcm5pbmcgKz0gY29kZVxuICAgICAgPyBgIFNlZSBodHRwczovL2xpdC5kZXYvbXNnLyR7Y29kZX0gZm9yIG1vcmUgaW5mb3JtYXRpb24uYFxuICAgICAgOiAnJztcbiAgICBpZiAoXG4gICAgICAhZ2xvYmFsLmxpdElzc3VlZFdhcm5pbmdzIS5oYXMod2FybmluZykgJiZcbiAgICAgICFnbG9iYWwubGl0SXNzdWVkV2FybmluZ3MhLmhhcyhjb2RlKVxuICAgICkge1xuICAgICAgY29uc29sZS53YXJuKHdhcm5pbmcpO1xuICAgICAgZ2xvYmFsLmxpdElzc3VlZFdhcm5pbmdzIS5hZGQod2FybmluZyk7XG4gICAgfVxuICB9O1xuXG4gIHF1ZXVlTWljcm90YXNrKCgpID0+IHtcbiAgICBpc3N1ZVdhcm5pbmcoXG4gICAgICAnZGV2LW1vZGUnLFxuICAgICAgYExpdCBpcyBpbiBkZXYgbW9kZS4gTm90IHJlY29tbWVuZGVkIGZvciBwcm9kdWN0aW9uIWBcbiAgICApO1xuICB9KTtcbn1cblxuY29uc3Qgd3JhcCA9XG4gIEVOQUJMRV9TSEFEWURPTV9OT1BBVENIICYmXG4gIGdsb2JhbC5TaGFkeURPTT8uaW5Vc2UgJiZcbiAgZ2xvYmFsLlNoYWR5RE9NPy5ub1BhdGNoID09PSB0cnVlXG4gICAgPyAoZ2xvYmFsLlNoYWR5RE9NIS53cmFwIGFzIDxUIGV4dGVuZHMgTm9kZT4obm9kZTogVCkgPT4gVClcbiAgICA6IDxUIGV4dGVuZHMgTm9kZT4obm9kZTogVCkgPT4gbm9kZTtcblxuY29uc3QgdHJ1c3RlZFR5cGVzID0gKGdsb2JhbCBhcyB1bmtub3duIGFzIFRydXN0ZWRUeXBlc1dpbmRvdykudHJ1c3RlZFR5cGVzO1xuXG4vKipcbiAqIE91ciBUcnVzdGVkVHlwZVBvbGljeSBmb3IgSFRNTCB3aGljaCBpcyBkZWNsYXJlZCB1c2luZyB0aGUgaHRtbCB0ZW1wbGF0ZVxuICogdGFnIGZ1bmN0aW9uLlxuICpcbiAqIFRoYXQgSFRNTCBpcyBhIGRldmVsb3Blci1hdXRob3JlZCBjb25zdGFudCwgYW5kIGlzIHBhcnNlZCB3aXRoIGlubmVySFRNTFxuICogYmVmb3JlIGFueSB1bnRydXN0ZWQgZXhwcmVzc2lvbnMgaGF2ZSBiZWVuIG1peGVkIGluLiBUaGVyZWZvciBpdCBpc1xuICogY29uc2lkZXJlZCBzYWZlIGJ5IGNvbnN0cnVjdGlvbi5cbiAqL1xuY29uc3QgcG9saWN5ID0gdHJ1c3RlZFR5cGVzXG4gID8gdHJ1c3RlZFR5cGVzLmNyZWF0ZVBvbGljeSgnbGl0LWh0bWwnLCB7XG4gICAgICBjcmVhdGVIVE1MOiAocykgPT4gcyxcbiAgICB9KVxuICA6IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBVc2VkIHRvIHNhbml0aXplIGFueSB2YWx1ZSBiZWZvcmUgaXQgaXMgd3JpdHRlbiBpbnRvIHRoZSBET00uIFRoaXMgY2FuIGJlXG4gKiB1c2VkIHRvIGltcGxlbWVudCBhIHNlY3VyaXR5IHBvbGljeSBvZiBhbGxvd2VkIGFuZCBkaXNhbGxvd2VkIHZhbHVlcyBpblxuICogb3JkZXIgdG8gcHJldmVudCBYU1MgYXR0YWNrcy5cbiAqXG4gKiBPbmUgd2F5IG9mIHVzaW5nIHRoaXMgY2FsbGJhY2sgd291bGQgYmUgdG8gY2hlY2sgYXR0cmlidXRlcyBhbmQgcHJvcGVydGllc1xuICogYWdhaW5zdCBhIGxpc3Qgb2YgaGlnaCByaXNrIGZpZWxkcywgYW5kIHJlcXVpcmUgdGhhdCB2YWx1ZXMgd3JpdHRlbiB0byBzdWNoXG4gKiBmaWVsZHMgYmUgaW5zdGFuY2VzIG9mIGEgY2xhc3Mgd2hpY2ggaXMgc2FmZSBieSBjb25zdHJ1Y3Rpb24uIENsb3N1cmUncyBTYWZlXG4gKiBIVE1MIFR5cGVzIGlzIG9uZSBpbXBsZW1lbnRhdGlvbiBvZiB0aGlzIHRlY2huaXF1ZSAoXG4gKiBodHRwczovL2dpdGh1Yi5jb20vZ29vZ2xlL3NhZmUtaHRtbC10eXBlcy9ibG9iL21hc3Rlci9kb2Mvc2FmZWh0bWwtdHlwZXMubWQpLlxuICogVGhlIFRydXN0ZWRUeXBlcyBwb2x5ZmlsbCBpbiBBUEktb25seSBtb2RlIGNvdWxkIGFsc28gYmUgdXNlZCBhcyBhIGJhc2lzXG4gKiBmb3IgdGhpcyB0ZWNobmlxdWUgKGh0dHBzOi8vZ2l0aHViLmNvbS9XSUNHL3RydXN0ZWQtdHlwZXMpLlxuICpcbiAqIEBwYXJhbSBub2RlIFRoZSBIVE1MIG5vZGUgKHVzdWFsbHkgZWl0aGVyIGEgI3RleHQgbm9kZSBvciBhbiBFbGVtZW50KSB0aGF0XG4gKiAgICAgaXMgYmVpbmcgd3JpdHRlbiB0by4gTm90ZSB0aGF0IHRoaXMgaXMganVzdCBhbiBleGVtcGxhciBub2RlLCB0aGUgd3JpdGVcbiAqICAgICBtYXkgdGFrZSBwbGFjZSBhZ2FpbnN0IGFub3RoZXIgaW5zdGFuY2Ugb2YgdGhlIHNhbWUgY2xhc3Mgb2Ygbm9kZS5cbiAqIEBwYXJhbSBuYW1lIFRoZSBuYW1lIG9mIGFuIGF0dHJpYnV0ZSBvciBwcm9wZXJ0eSAoZm9yIGV4YW1wbGUsICdocmVmJykuXG4gKiBAcGFyYW0gdHlwZSBJbmRpY2F0ZXMgd2hldGhlciB0aGUgd3JpdGUgdGhhdCdzIGFib3V0IHRvIGJlIHBlcmZvcm1lZCB3aWxsXG4gKiAgICAgYmUgdG8gYSBwcm9wZXJ0eSBvciBhIG5vZGUuXG4gKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCB3aWxsIHNhbml0aXplIHRoaXMgY2xhc3Mgb2Ygd3JpdGVzLlxuICovXG5leHBvcnQgdHlwZSBTYW5pdGl6ZXJGYWN0b3J5ID0gKFxuICBub2RlOiBOb2RlLFxuICBuYW1lOiBzdHJpbmcsXG4gIHR5cGU6ICdwcm9wZXJ0eScgfCAnYXR0cmlidXRlJ1xuKSA9PiBWYWx1ZVNhbml0aXplcjtcblxuLyoqXG4gKiBBIGZ1bmN0aW9uIHdoaWNoIGNhbiBzYW5pdGl6ZSB2YWx1ZXMgdGhhdCB3aWxsIGJlIHdyaXR0ZW4gdG8gYSBzcGVjaWZpYyBraW5kXG4gKiBvZiBET00gc2luay5cbiAqXG4gKiBTZWUgU2FuaXRpemVyRmFjdG9yeS5cbiAqXG4gKiBAcGFyYW0gdmFsdWUgVGhlIHZhbHVlIHRvIHNhbml0aXplLiBXaWxsIGJlIHRoZSBhY3R1YWwgdmFsdWUgcGFzc2VkIGludG9cbiAqICAgICB0aGUgbGl0LWh0bWwgdGVtcGxhdGUgbGl0ZXJhbCwgc28gdGhpcyBjb3VsZCBiZSBvZiBhbnkgdHlwZS5cbiAqIEByZXR1cm4gVGhlIHZhbHVlIHRvIHdyaXRlIHRvIHRoZSBET00uIFVzdWFsbHkgdGhlIHNhbWUgYXMgdGhlIGlucHV0IHZhbHVlLFxuICogICAgIHVubGVzcyBzYW5pdGl6YXRpb24gaXMgbmVlZGVkLlxuICovXG5leHBvcnQgdHlwZSBWYWx1ZVNhbml0aXplciA9ICh2YWx1ZTogdW5rbm93bikgPT4gdW5rbm93bjtcblxuY29uc3QgaWRlbnRpdHlGdW5jdGlvbjogVmFsdWVTYW5pdGl6ZXIgPSAodmFsdWU6IHVua25vd24pID0+IHZhbHVlO1xuY29uc3Qgbm9vcFNhbml0aXplcjogU2FuaXRpemVyRmFjdG9yeSA9IChcbiAgX25vZGU6IE5vZGUsXG4gIF9uYW1lOiBzdHJpbmcsXG4gIF90eXBlOiAncHJvcGVydHknIHwgJ2F0dHJpYnV0ZSdcbikgPT4gaWRlbnRpdHlGdW5jdGlvbjtcblxuLyoqIFNldHMgdGhlIGdsb2JhbCBzYW5pdGl6ZXIgZmFjdG9yeS4gKi9cbmNvbnN0IHNldFNhbml0aXplciA9IChuZXdTYW5pdGl6ZXI6IFNhbml0aXplckZhY3RvcnkpID0+IHtcbiAgaWYgKCFFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKHNhbml0aXplckZhY3RvcnlJbnRlcm5hbCAhPT0gbm9vcFNhbml0aXplcikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBBdHRlbXB0ZWQgdG8gb3ZlcndyaXRlIGV4aXN0aW5nIGxpdC1odG1sIHNlY3VyaXR5IHBvbGljeS5gICtcbiAgICAgICAgYCBzZXRTYW5pdGl6ZURPTVZhbHVlRmFjdG9yeSBzaG91bGQgYmUgY2FsbGVkIGF0IG1vc3Qgb25jZS5gXG4gICAgKTtcbiAgfVxuICBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwgPSBuZXdTYW5pdGl6ZXI7XG59O1xuXG4vKipcbiAqIE9ubHkgdXNlZCBpbiBpbnRlcm5hbCB0ZXN0cywgbm90IGEgcGFydCBvZiB0aGUgcHVibGljIEFQSS5cbiAqL1xuY29uc3QgX3Rlc3RPbmx5Q2xlYXJTYW5pdGl6ZXJGYWN0b3J5RG9Ob3RDYWxsT3JFbHNlID0gKCkgPT4ge1xuICBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwgPSBub29wU2FuaXRpemVyO1xufTtcblxuY29uc3QgY3JlYXRlU2FuaXRpemVyOiBTYW5pdGl6ZXJGYWN0b3J5ID0gKG5vZGUsIG5hbWUsIHR5cGUpID0+IHtcbiAgcmV0dXJuIHNhbml0aXplckZhY3RvcnlJbnRlcm5hbChub2RlLCBuYW1lLCB0eXBlKTtcbn07XG5cbi8vIEFkZGVkIHRvIGFuIGF0dHJpYnV0ZSBuYW1lIHRvIG1hcmsgdGhlIGF0dHJpYnV0ZSBhcyBib3VuZCBzbyB3ZSBjYW4gZmluZFxuLy8gaXQgZWFzaWx5LlxuY29uc3QgYm91bmRBdHRyaWJ1dGVTdWZmaXggPSAnJGxpdCQnO1xuXG4vLyBUaGlzIG1hcmtlciBpcyB1c2VkIGluIG1hbnkgc3ludGFjdGljIHBvc2l0aW9ucyBpbiBIVE1MLCBzbyBpdCBtdXN0IGJlXG4vLyBhIHZhbGlkIGVsZW1lbnQgbmFtZSBhbmQgYXR0cmlidXRlIG5hbWUuIFdlIGRvbid0IHN1cHBvcnQgZHluYW1pYyBuYW1lcyAoeWV0KVxuLy8gYnV0IHRoaXMgYXQgbGVhc3QgZW5zdXJlcyB0aGF0IHRoZSBwYXJzZSB0cmVlIGlzIGNsb3NlciB0byB0aGUgdGVtcGxhdGVcbi8vIGludGVudGlvbi5cbmNvbnN0IG1hcmtlciA9IGBsaXQkJHtNYXRoLnJhbmRvbSgpLnRvRml4ZWQoOSkuc2xpY2UoMil9JGA7XG5cbi8vIFN0cmluZyB1c2VkIHRvIHRlbGwgaWYgYSBjb21tZW50IGlzIGEgbWFya2VyIGNvbW1lbnRcbmNvbnN0IG1hcmtlck1hdGNoID0gJz8nICsgbWFya2VyO1xuXG4vLyBUZXh0IHVzZWQgdG8gaW5zZXJ0IGEgY29tbWVudCBtYXJrZXIgbm9kZS4gV2UgdXNlIHByb2Nlc3NpbmcgaW5zdHJ1Y3Rpb25cbi8vIHN5bnRheCBiZWNhdXNlIGl0J3Mgc2xpZ2h0bHkgc21hbGxlciwgYnV0IHBhcnNlcyBhcyBhIGNvbW1lbnQgbm9kZS5cbmNvbnN0IG5vZGVNYXJrZXIgPSBgPCR7bWFya2VyTWF0Y2h9PmA7XG5cbmNvbnN0IGQgPVxuICBOT0RFX01PREUgJiYgZ2xvYmFsLmRvY3VtZW50ID09PSB1bmRlZmluZWRcbiAgICA/ICh7XG4gICAgICAgIGNyZWF0ZVRyZWVXYWxrZXIoKSB7XG4gICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICB9LFxuICAgICAgfSBhcyB1bmtub3duIGFzIERvY3VtZW50KVxuICAgIDogZG9jdW1lbnQ7XG5cbi8vIENyZWF0ZXMgYSBkeW5hbWljIG1hcmtlci4gV2UgbmV2ZXIgaGF2ZSB0byBzZWFyY2ggZm9yIHRoZXNlIGluIHRoZSBET00uXG5jb25zdCBjcmVhdGVNYXJrZXIgPSAoKSA9PiBkLmNyZWF0ZUNvbW1lbnQoJycpO1xuXG4vLyBodHRwczovL3RjMzkuZ2l0aHViLmlvL2VjbWEyNjIvI3NlYy10eXBlb2Ytb3BlcmF0b3JcbnR5cGUgUHJpbWl0aXZlID0gbnVsbCB8IHVuZGVmaW5lZCB8IGJvb2xlYW4gfCBudW1iZXIgfCBzdHJpbmcgfCBzeW1ib2wgfCBiaWdpbnQ7XG5jb25zdCBpc1ByaW1pdGl2ZSA9ICh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFByaW1pdGl2ZSA9PlxuICB2YWx1ZSA9PT0gbnVsbCB8fCAodHlwZW9mIHZhbHVlICE9ICdvYmplY3QnICYmIHR5cGVvZiB2YWx1ZSAhPSAnZnVuY3Rpb24nKTtcbmNvbnN0IGlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuY29uc3QgaXNJdGVyYWJsZSA9ICh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIEl0ZXJhYmxlPHVua25vd24+ID0+XG4gIGlzQXJyYXkodmFsdWUpIHx8XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gIHR5cGVvZiAodmFsdWUgYXMgYW55KT8uW1N5bWJvbC5pdGVyYXRvcl0gPT09ICdmdW5jdGlvbic7XG5cbmNvbnN0IFNQQUNFX0NIQVIgPSBgWyBcXHRcXG5cXGZcXHJdYDtcbmNvbnN0IEFUVFJfVkFMVUVfQ0hBUiA9IGBbXiBcXHRcXG5cXGZcXHJcIidcXGA8Pj1dYDtcbmNvbnN0IE5BTUVfQ0hBUiA9IGBbXlxcXFxzXCInPj0vXWA7XG5cbi8vIFRoZXNlIHJlZ2V4ZXMgcmVwcmVzZW50IHRoZSBmaXZlIHBhcnNpbmcgc3RhdGVzIHRoYXQgd2UgY2FyZSBhYm91dCBpbiB0aGVcbi8vIFRlbXBsYXRlJ3MgSFRNTCBzY2FubmVyLiBUaGV5IG1hdGNoIHRoZSAqZW5kKiBvZiB0aGUgc3RhdGUgdGhleSdyZSBuYW1lZFxuLy8gYWZ0ZXIuXG4vLyBEZXBlbmRpbmcgb24gdGhlIG1hdGNoLCB3ZSB0cmFuc2l0aW9uIHRvIGEgbmV3IHN0YXRlLiBJZiB0aGVyZSdzIG5vIG1hdGNoLFxuLy8gd2Ugc3RheSBpbiB0aGUgc2FtZSBzdGF0ZS5cbi8vIE5vdGUgdGhhdCB0aGUgcmVnZXhlcyBhcmUgc3RhdGVmdWwuIFdlIHV0aWxpemUgbGFzdEluZGV4IGFuZCBzeW5jIGl0XG4vLyBhY3Jvc3MgdGhlIG11bHRpcGxlIHJlZ2V4ZXMgdXNlZC4gSW4gYWRkaXRpb24gdG8gdGhlIGZpdmUgcmVnZXhlcyBiZWxvd1xuLy8gd2UgYWxzbyBkeW5hbWljYWxseSBjcmVhdGUgYSByZWdleCB0byBmaW5kIHRoZSBtYXRjaGluZyBlbmQgdGFncyBmb3IgcmF3XG4vLyB0ZXh0IGVsZW1lbnRzLlxuXG4vKipcbiAqIEVuZCBvZiB0ZXh0IGlzOiBgPGAgZm9sbG93ZWQgYnk6XG4gKiAgIChjb21tZW50IHN0YXJ0KSBvciAodGFnKSBvciAoZHluYW1pYyB0YWcgYmluZGluZylcbiAqL1xuY29uc3QgdGV4dEVuZFJlZ2V4ID0gLzwoPzooIS0tfFxcL1teYS16QS1aXSl8KFxcLz9bYS16QS1aXVtePlxcc10qKXwoXFwvPyQpKS9nO1xuY29uc3QgQ09NTUVOVF9TVEFSVCA9IDE7XG5jb25zdCBUQUdfTkFNRSA9IDI7XG5jb25zdCBEWU5BTUlDX1RBR19OQU1FID0gMztcblxuY29uc3QgY29tbWVudEVuZFJlZ2V4ID0gLy0tPi9nO1xuLyoqXG4gKiBDb21tZW50cyBub3Qgc3RhcnRlZCB3aXRoIDwhLS0sIGxpa2UgPC97LCBjYW4gYmUgZW5kZWQgYnkgYSBzaW5nbGUgYD5gXG4gKi9cbmNvbnN0IGNvbW1lbnQyRW5kUmVnZXggPSAvPi9nO1xuXG4vKipcbiAqIFRoZSB0YWdFbmQgcmVnZXggbWF0Y2hlcyB0aGUgZW5kIG9mIHRoZSBcImluc2lkZSBhbiBvcGVuaW5nXCIgdGFnIHN5bnRheFxuICogcG9zaXRpb24uIEl0IGVpdGhlciBtYXRjaGVzIGEgYD5gLCBhbiBhdHRyaWJ1dGUtbGlrZSBzZXF1ZW5jZSwgb3IgdGhlIGVuZFxuICogb2YgdGhlIHN0cmluZyBhZnRlciBhIHNwYWNlIChhdHRyaWJ1dGUtbmFtZSBwb3NpdGlvbiBlbmRpbmcpLlxuICpcbiAqIFNlZSBhdHRyaWJ1dGVzIGluIHRoZSBIVE1MIHNwZWM6XG4gKiBodHRwczovL3d3dy53My5vcmcvVFIvaHRtbDUvc3ludGF4Lmh0bWwjZWxlbWVudHMtYXR0cmlidXRlc1xuICpcbiAqIFwiIFxcdFxcblxcZlxcclwiIGFyZSBIVE1MIHNwYWNlIGNoYXJhY3RlcnM6XG4gKiBodHRwczovL2luZnJhLnNwZWMud2hhdHdnLm9yZy8jYXNjaWktd2hpdGVzcGFjZVxuICpcbiAqIFNvIGFuIGF0dHJpYnV0ZSBpczpcbiAqICAqIFRoZSBuYW1lOiBhbnkgY2hhcmFjdGVyIGV4Y2VwdCBhIHdoaXRlc3BhY2UgY2hhcmFjdGVyLCAoXCIpLCAoJyksIFwiPlwiLFxuICogICAgXCI9XCIsIG9yIFwiL1wiLiBOb3RlOiB0aGlzIGlzIGRpZmZlcmVudCBmcm9tIHRoZSBIVE1MIHNwZWMgd2hpY2ggYWxzbyBleGNsdWRlcyBjb250cm9sIGNoYXJhY3RlcnMuXG4gKiAgKiBGb2xsb3dlZCBieSB6ZXJvIG9yIG1vcmUgc3BhY2UgY2hhcmFjdGVyc1xuICogICogRm9sbG93ZWQgYnkgXCI9XCJcbiAqICAqIEZvbGxvd2VkIGJ5IHplcm8gb3IgbW9yZSBzcGFjZSBjaGFyYWN0ZXJzXG4gKiAgKiBGb2xsb3dlZCBieTpcbiAqICAgICogQW55IGNoYXJhY3RlciBleGNlcHQgc3BhY2UsICgnKSwgKFwiKSwgXCI8XCIsIFwiPlwiLCBcIj1cIiwgKGApLCBvclxuICogICAgKiAoXCIpIHRoZW4gYW55IG5vbi0oXCIpLCBvclxuICogICAgKiAoJykgdGhlbiBhbnkgbm9uLSgnKVxuICovXG5jb25zdCB0YWdFbmRSZWdleCA9IG5ldyBSZWdFeHAoXG4gIGA+fCR7U1BBQ0VfQ0hBUn0oPzooJHtOQU1FX0NIQVJ9KykoJHtTUEFDRV9DSEFSfSo9JHtTUEFDRV9DSEFSfSooPzoke0FUVFJfVkFMVUVfQ0hBUn18KFwifCcpfCkpfCQpYCxcbiAgJ2cnXG4pO1xuY29uc3QgRU5USVJFX01BVENIID0gMDtcbmNvbnN0IEFUVFJJQlVURV9OQU1FID0gMTtcbmNvbnN0IFNQQUNFU19BTkRfRVFVQUxTID0gMjtcbmNvbnN0IFFVT1RFX0NIQVIgPSAzO1xuXG5jb25zdCBzaW5nbGVRdW90ZUF0dHJFbmRSZWdleCA9IC8nL2c7XG5jb25zdCBkb3VibGVRdW90ZUF0dHJFbmRSZWdleCA9IC9cIi9nO1xuLyoqXG4gKiBNYXRjaGVzIHRoZSByYXcgdGV4dCBlbGVtZW50cy5cbiAqXG4gKiBDb21tZW50cyBhcmUgbm90IHBhcnNlZCB3aXRoaW4gcmF3IHRleHQgZWxlbWVudHMsIHNvIHdlIG5lZWQgdG8gc2VhcmNoIHRoZWlyXG4gKiB0ZXh0IGNvbnRlbnQgZm9yIG1hcmtlciBzdHJpbmdzLlxuICovXG5jb25zdCByYXdUZXh0RWxlbWVudCA9IC9eKD86c2NyaXB0fHN0eWxlfHRleHRhcmVhfHRpdGxlKSQvaTtcblxuLyoqIFRlbXBsYXRlUmVzdWx0IHR5cGVzICovXG5jb25zdCBIVE1MX1JFU1VMVCA9IDE7XG5jb25zdCBTVkdfUkVTVUxUID0gMjtcbmNvbnN0IE1BVEhNTF9SRVNVTFQgPSAzO1xuXG50eXBlIFJlc3VsdFR5cGUgPSB0eXBlb2YgSFRNTF9SRVNVTFQgfCB0eXBlb2YgU1ZHX1JFU1VMVCB8IHR5cGVvZiBNQVRITUxfUkVTVUxUO1xuXG4vLyBUZW1wbGF0ZVBhcnQgdHlwZXNcbi8vIElNUE9SVEFOVDogdGhlc2UgbXVzdCBtYXRjaCB0aGUgdmFsdWVzIGluIFBhcnRUeXBlXG5jb25zdCBBVFRSSUJVVEVfUEFSVCA9IDE7XG5jb25zdCBDSElMRF9QQVJUID0gMjtcbmNvbnN0IFBST1BFUlRZX1BBUlQgPSAzO1xuY29uc3QgQk9PTEVBTl9BVFRSSUJVVEVfUEFSVCA9IDQ7XG5jb25zdCBFVkVOVF9QQVJUID0gNTtcbmNvbnN0IEVMRU1FTlRfUEFSVCA9IDY7XG5jb25zdCBDT01NRU5UX1BBUlQgPSA3O1xuXG4vKipcbiAqIFRoZSByZXR1cm4gdHlwZSBvZiB0aGUgdGVtcGxhdGUgdGFnIGZ1bmN0aW9ucywge0BsaW5rY29kZSBodG1sfSBhbmRcbiAqIHtAbGlua2NvZGUgc3ZnfSB3aGVuIGl0IGhhc24ndCBiZWVuIGNvbXBpbGVkIGJ5IEBsaXQtbGFicy9jb21waWxlci5cbiAqXG4gKiBBIGBUZW1wbGF0ZVJlc3VsdGAgb2JqZWN0IGhvbGRzIGFsbCB0aGUgaW5mb3JtYXRpb24gYWJvdXQgYSB0ZW1wbGF0ZVxuICogZXhwcmVzc2lvbiByZXF1aXJlZCB0byByZW5kZXIgaXQ6IHRoZSB0ZW1wbGF0ZSBzdHJpbmdzLCBleHByZXNzaW9uIHZhbHVlcyxcbiAqIGFuZCB0eXBlIG9mIHRlbXBsYXRlIChodG1sIG9yIHN2ZykuXG4gKlxuICogYFRlbXBsYXRlUmVzdWx0YCBvYmplY3RzIGRvIG5vdCBjcmVhdGUgYW55IERPTSBvbiB0aGVpciBvd24uIFRvIGNyZWF0ZSBvclxuICogdXBkYXRlIERPTSB5b3UgbmVlZCB0byByZW5kZXIgdGhlIGBUZW1wbGF0ZVJlc3VsdGAuIFNlZVxuICogW1JlbmRlcmluZ10oaHR0cHM6Ly9saXQuZGV2L2RvY3MvY29tcG9uZW50cy9yZW5kZXJpbmcpIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICpcbiAqL1xuZXhwb3J0IHR5cGUgVW5jb21waWxlZFRlbXBsYXRlUmVzdWx0PFQgZXh0ZW5kcyBSZXN1bHRUeXBlID0gUmVzdWx0VHlwZT4gPSB7XG4gIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gIFsnXyRsaXRUeXBlJCddOiBUO1xuICBzdHJpbmdzOiBUZW1wbGF0ZVN0cmluZ3NBcnJheTtcbiAgdmFsdWVzOiB1bmtub3duW107XG59O1xuXG4vKipcbiAqIFRoaXMgaXMgYSB0ZW1wbGF0ZSByZXN1bHQgdGhhdCBtYXkgYmUgZWl0aGVyIHVuY29tcGlsZWQgb3IgY29tcGlsZWQuXG4gKlxuICogSW4gdGhlIGZ1dHVyZSwgVGVtcGxhdGVSZXN1bHQgd2lsbCBiZSB0aGlzIHR5cGUuIElmIHlvdSB3YW50IHRvIGV4cGxpY2l0bHlcbiAqIG5vdGUgdGhhdCBhIHRlbXBsYXRlIHJlc3VsdCBpcyBwb3RlbnRpYWxseSBjb21waWxlZCwgeW91IGNhbiByZWZlcmVuY2UgdGhpc1xuICogdHlwZSBhbmQgaXQgd2lsbCBjb250aW51ZSB0byBiZWhhdmUgdGhlIHNhbWUgdGhyb3VnaCB0aGUgbmV4dCBtYWpvciB2ZXJzaW9uXG4gKiBvZiBMaXQuIFRoaXMgY2FuIGJlIHVzZWZ1bCBmb3IgY29kZSB0aGF0IHdhbnRzIHRvIHByZXBhcmUgZm9yIHRoZSBuZXh0XG4gKiBtYWpvciB2ZXJzaW9uIG9mIExpdC5cbiAqL1xuZXhwb3J0IHR5cGUgTWF5YmVDb21waWxlZFRlbXBsYXRlUmVzdWx0PFQgZXh0ZW5kcyBSZXN1bHRUeXBlID0gUmVzdWx0VHlwZT4gPVxuICB8IFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdDxUPlxuICB8IENvbXBpbGVkVGVtcGxhdGVSZXN1bHQ7XG5cbi8qKlxuICogVGhlIHJldHVybiB0eXBlIG9mIHRoZSB0ZW1wbGF0ZSB0YWcgZnVuY3Rpb25zLCB7QGxpbmtjb2RlIGh0bWx9IGFuZFxuICoge0BsaW5rY29kZSBzdmd9LlxuICpcbiAqIEEgYFRlbXBsYXRlUmVzdWx0YCBvYmplY3QgaG9sZHMgYWxsIHRoZSBpbmZvcm1hdGlvbiBhYm91dCBhIHRlbXBsYXRlXG4gKiBleHByZXNzaW9uIHJlcXVpcmVkIHRvIHJlbmRlciBpdDogdGhlIHRlbXBsYXRlIHN0cmluZ3MsIGV4cHJlc3Npb24gdmFsdWVzLFxuICogYW5kIHR5cGUgb2YgdGVtcGxhdGUgKGh0bWwgb3Igc3ZnKS5cbiAqXG4gKiBgVGVtcGxhdGVSZXN1bHRgIG9iamVjdHMgZG8gbm90IGNyZWF0ZSBhbnkgRE9NIG9uIHRoZWlyIG93bi4gVG8gY3JlYXRlIG9yXG4gKiB1cGRhdGUgRE9NIHlvdSBuZWVkIHRvIHJlbmRlciB0aGUgYFRlbXBsYXRlUmVzdWx0YC4gU2VlXG4gKiBbUmVuZGVyaW5nXShodHRwczovL2xpdC5kZXYvZG9jcy9jb21wb25lbnRzL3JlbmRlcmluZykgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKlxuICogSW4gTGl0IDQsIHRoaXMgdHlwZSB3aWxsIGJlIGFuIGFsaWFzIG9mXG4gKiBNYXliZUNvbXBpbGVkVGVtcGxhdGVSZXN1bHQsIHNvIHRoYXQgY29kZSB3aWxsIGdldCB0eXBlIGVycm9ycyBpZiBpdCBhc3N1bWVzXG4gKiB0aGF0IExpdCB0ZW1wbGF0ZXMgYXJlIG5vdCBjb21waWxlZC4gV2hlbiBkZWxpYmVyYXRlbHkgd29ya2luZyB3aXRoIG9ubHlcbiAqIG9uZSwgdXNlIGVpdGhlciB7QGxpbmtjb2RlIENvbXBpbGVkVGVtcGxhdGVSZXN1bHR9IG9yXG4gKiB7QGxpbmtjb2RlIFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdH0gZXhwbGljaXRseS5cbiAqL1xuZXhwb3J0IHR5cGUgVGVtcGxhdGVSZXN1bHQ8VCBleHRlbmRzIFJlc3VsdFR5cGUgPSBSZXN1bHRUeXBlPiA9XG4gIFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdDxUPjtcblxuZXhwb3J0IHR5cGUgSFRNTFRlbXBsYXRlUmVzdWx0ID0gVGVtcGxhdGVSZXN1bHQ8dHlwZW9mIEhUTUxfUkVTVUxUPjtcblxuZXhwb3J0IHR5cGUgU1ZHVGVtcGxhdGVSZXN1bHQgPSBUZW1wbGF0ZVJlc3VsdDx0eXBlb2YgU1ZHX1JFU1VMVD47XG5cbmV4cG9ydCB0eXBlIE1hdGhNTFRlbXBsYXRlUmVzdWx0ID0gVGVtcGxhdGVSZXN1bHQ8dHlwZW9mIE1BVEhNTF9SRVNVTFQ+O1xuXG4vKipcbiAqIEEgVGVtcGxhdGVSZXN1bHQgdGhhdCBoYXMgYmVlbiBjb21waWxlZCBieSBAbGl0LWxhYnMvY29tcGlsZXIsIHNraXBwaW5nIHRoZVxuICogcHJlcGFyZSBzdGVwLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVkVGVtcGxhdGVSZXN1bHQge1xuICAvLyBUaGlzIGlzIGEgZmFjdG9yeSBpbiBvcmRlciB0byBtYWtlIHRlbXBsYXRlIGluaXRpYWxpemF0aW9uIGxhenlcbiAgLy8gYW5kIGFsbG93IFNoYWR5UmVuZGVyT3B0aW9ucyBzY29wZSB0byBiZSBwYXNzZWQgaW4uXG4gIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gIFsnXyRsaXRUeXBlJCddOiBDb21waWxlZFRlbXBsYXRlO1xuICB2YWx1ZXM6IHVua25vd25bXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21waWxlZFRlbXBsYXRlIGV4dGVuZHMgT21pdDxUZW1wbGF0ZSwgJ2VsJz4ge1xuICAvLyBlbCBpcyBvdmVycmlkZGVuIHRvIGJlIG9wdGlvbmFsLiBXZSBpbml0aWFsaXplIGl0IG9uIGZpcnN0IHJlbmRlclxuICBlbD86IEhUTUxUZW1wbGF0ZUVsZW1lbnQ7XG5cbiAgLy8gVGhlIHByZXBhcmVkIEhUTUwgc3RyaW5nIHRvIGNyZWF0ZSBhIHRlbXBsYXRlIGVsZW1lbnQgZnJvbS5cbiAgLy8gVGhlIHR5cGUgaXMgYSBUZW1wbGF0ZVN0cmluZ3NBcnJheSB0byBndWFyYW50ZWUgdGhhdCB0aGUgdmFsdWUgY2FtZSBmcm9tXG4gIC8vIHNvdXJjZSBjb2RlLCBwcmV2ZW50aW5nIGEgSlNPTiBpbmplY3Rpb24gYXR0YWNrLlxuICBoOiBUZW1wbGF0ZVN0cmluZ3NBcnJheTtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZXMgYSB0ZW1wbGF0ZSBsaXRlcmFsIHRhZyBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBUZW1wbGF0ZVJlc3VsdCB3aXRoXG4gKiB0aGUgZ2l2ZW4gcmVzdWx0IHR5cGUuXG4gKi9cbmNvbnN0IHRhZyA9XG4gIDxUIGV4dGVuZHMgUmVzdWx0VHlwZT4odHlwZTogVCkgPT5cbiAgKHN0cmluZ3M6IFRlbXBsYXRlU3RyaW5nc0FycmF5LCAuLi52YWx1ZXM6IHVua25vd25bXSk6IFRlbXBsYXRlUmVzdWx0PFQ+ID0+IHtcbiAgICAvLyBXYXJuIGFnYWluc3QgdGVtcGxhdGVzIG9jdGFsIGVzY2FwZSBzZXF1ZW5jZXNcbiAgICAvLyBXZSBkbyB0aGlzIGhlcmUgcmF0aGVyIHRoYW4gaW4gcmVuZGVyIHNvIHRoYXQgdGhlIHdhcm5pbmcgaXMgY2xvc2VyIHRvIHRoZVxuICAgIC8vIHRlbXBsYXRlIGRlZmluaXRpb24uXG4gICAgaWYgKERFVl9NT0RFICYmIHN0cmluZ3Muc29tZSgocykgPT4gcyA9PT0gdW5kZWZpbmVkKSkge1xuICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAnU29tZSB0ZW1wbGF0ZSBzdHJpbmdzIGFyZSB1bmRlZmluZWQuXFxuJyArXG4gICAgICAgICAgJ1RoaXMgaXMgcHJvYmFibHkgY2F1c2VkIGJ5IGlsbGVnYWwgb2N0YWwgZXNjYXBlIHNlcXVlbmNlcy4nXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAoREVWX01PREUpIHtcbiAgICAgIC8vIEltcG9ydCBzdGF0aWMtaHRtbC5qcyByZXN1bHRzIGluIGEgY2lyY3VsYXIgZGVwZW5kZW5jeSB3aGljaCBnMyBkb2Vzbid0XG4gICAgICAvLyBoYW5kbGUuIEluc3RlYWQgd2Uga25vdyB0aGF0IHN0YXRpYyB2YWx1ZXMgbXVzdCBoYXZlIHRoZSBmaWVsZFxuICAgICAgLy8gYF8kbGl0U3RhdGljJGAuXG4gICAgICBpZiAoXG4gICAgICAgIHZhbHVlcy5zb21lKCh2YWwpID0+ICh2YWwgYXMge18kbGl0U3RhdGljJDogdW5rbm93bn0pPy5bJ18kbGl0U3RhdGljJCddKVxuICAgICAgKSB7XG4gICAgICAgIGlzc3VlV2FybmluZyhcbiAgICAgICAgICAnJyxcbiAgICAgICAgICBgU3RhdGljIHZhbHVlcyAnbGl0ZXJhbCcgb3IgJ3Vuc2FmZVN0YXRpYycgY2Fubm90IGJlIHVzZWQgYXMgdmFsdWVzIHRvIG5vbi1zdGF0aWMgdGVtcGxhdGVzLlxcbmAgK1xuICAgICAgICAgICAgYFBsZWFzZSB1c2UgdGhlIHN0YXRpYyAnaHRtbCcgdGFnIGZ1bmN0aW9uLiBTZWUgaHR0cHM6Ly9saXQuZGV2L2RvY3MvdGVtcGxhdGVzL2V4cHJlc3Npb25zLyNzdGF0aWMtZXhwcmVzc2lvbnNgXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgICAgWydfJGxpdFR5cGUkJ106IHR5cGUsXG4gICAgICBzdHJpbmdzLFxuICAgICAgdmFsdWVzLFxuICAgIH07XG4gIH07XG5cbi8qKlxuICogSW50ZXJwcmV0cyBhIHRlbXBsYXRlIGxpdGVyYWwgYXMgYW4gSFRNTCB0ZW1wbGF0ZSB0aGF0IGNhbiBlZmZpY2llbnRseVxuICogcmVuZGVyIHRvIGFuZCB1cGRhdGUgYSBjb250YWluZXIuXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGhlYWRlciA9ICh0aXRsZTogc3RyaW5nKSA9PiBodG1sYDxoMT4ke3RpdGxlfTwvaDE+YDtcbiAqIGBgYFxuICpcbiAqIFRoZSBgaHRtbGAgdGFnIHJldHVybnMgYSBkZXNjcmlwdGlvbiBvZiB0aGUgRE9NIHRvIHJlbmRlciBhcyBhIHZhbHVlLiBJdCBpc1xuICogbGF6eSwgbWVhbmluZyBubyB3b3JrIGlzIGRvbmUgdW50aWwgdGhlIHRlbXBsYXRlIGlzIHJlbmRlcmVkLiBXaGVuIHJlbmRlcmluZyxcbiAqIGlmIGEgdGVtcGxhdGUgY29tZXMgZnJvbSB0aGUgc2FtZSBleHByZXNzaW9uIGFzIGEgcHJldmlvdXNseSByZW5kZXJlZCByZXN1bHQsXG4gKiBpdCdzIGVmZmljaWVudGx5IHVwZGF0ZWQgaW5zdGVhZCBvZiByZXBsYWNlZC5cbiAqL1xuZXhwb3J0IGNvbnN0IGh0bWwgPSB0YWcoSFRNTF9SRVNVTFQpO1xuXG4vKipcbiAqIEludGVycHJldHMgYSB0ZW1wbGF0ZSBsaXRlcmFsIGFzIGFuIFNWRyBmcmFnbWVudCB0aGF0IGNhbiBlZmZpY2llbnRseSByZW5kZXJcbiAqIHRvIGFuZCB1cGRhdGUgYSBjb250YWluZXIuXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHJlY3QgPSBzdmdgPHJlY3Qgd2lkdGg9XCIxMFwiIGhlaWdodD1cIjEwXCI+PC9yZWN0PmA7XG4gKlxuICogY29uc3QgbXlJbWFnZSA9IGh0bWxgXG4gKiAgIDxzdmcgdmlld0JveD1cIjAgMCAxMCAxMFwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj5cbiAqICAgICAke3JlY3R9XG4gKiAgIDwvc3ZnPmA7XG4gKiBgYGBcbiAqXG4gKiBUaGUgYHN2Z2AgKnRhZyBmdW5jdGlvbiogc2hvdWxkIG9ubHkgYmUgdXNlZCBmb3IgU1ZHIGZyYWdtZW50cywgb3IgZWxlbWVudHNcbiAqIHRoYXQgd291bGQgYmUgY29udGFpbmVkICoqaW5zaWRlKiogYW4gYDxzdmc+YCBIVE1MIGVsZW1lbnQuIEEgY29tbW9uIGVycm9yIGlzXG4gKiBwbGFjaW5nIGFuIGA8c3ZnPmAgKmVsZW1lbnQqIGluIGEgdGVtcGxhdGUgdGFnZ2VkIHdpdGggdGhlIGBzdmdgIHRhZ1xuICogZnVuY3Rpb24uIFRoZSBgPHN2Zz5gIGVsZW1lbnQgaXMgYW4gSFRNTCBlbGVtZW50IGFuZCBzaG91bGQgYmUgdXNlZCB3aXRoaW4gYVxuICogdGVtcGxhdGUgdGFnZ2VkIHdpdGggdGhlIHtAbGlua2NvZGUgaHRtbH0gdGFnIGZ1bmN0aW9uLlxuICpcbiAqIEluIExpdEVsZW1lbnQgdXNhZ2UsIGl0J3MgaW52YWxpZCB0byByZXR1cm4gYW4gU1ZHIGZyYWdtZW50IGZyb20gdGhlXG4gKiBgcmVuZGVyKClgIG1ldGhvZCwgYXMgdGhlIFNWRyBmcmFnbWVudCB3aWxsIGJlIGNvbnRhaW5lZCB3aXRoaW4gdGhlIGVsZW1lbnQnc1xuICogc2hhZG93IHJvb3QgYW5kIHRodXMgbm90IGJlIHByb3Blcmx5IGNvbnRhaW5lZCB3aXRoaW4gYW4gYDxzdmc+YCBIVE1MXG4gKiBlbGVtZW50LlxuICovXG5leHBvcnQgY29uc3Qgc3ZnID0gdGFnKFNWR19SRVNVTFQpO1xuXG4vKipcbiAqIEludGVycHJldHMgYSB0ZW1wbGF0ZSBsaXRlcmFsIGFzIE1hdGhNTCBmcmFnbWVudCB0aGF0IGNhbiBlZmZpY2llbnRseSByZW5kZXJcbiAqIHRvIGFuZCB1cGRhdGUgYSBjb250YWluZXIuXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IG51bSA9IG1hdGhtbGA8bW4+MTwvbW4+YDtcbiAqXG4gKiBjb25zdCBlcSA9IGh0bWxgXG4gKiAgIDxtYXRoPlxuICogICAgICR7bnVtfVxuICogICA8L21hdGg+YDtcbiAqIGBgYFxuICpcbiAqIFRoZSBgbWF0aG1sYCAqdGFnIGZ1bmN0aW9uKiBzaG91bGQgb25seSBiZSB1c2VkIGZvciBNYXRoTUwgZnJhZ21lbnRzLCBvclxuICogZWxlbWVudHMgdGhhdCB3b3VsZCBiZSBjb250YWluZWQgKippbnNpZGUqKiBhIGA8bWF0aD5gIEhUTUwgZWxlbWVudC4gQSBjb21tb25cbiAqIGVycm9yIGlzIHBsYWNpbmcgYSBgPG1hdGg+YCAqZWxlbWVudCogaW4gYSB0ZW1wbGF0ZSB0YWdnZWQgd2l0aCB0aGUgYG1hdGhtbGBcbiAqIHRhZyBmdW5jdGlvbi4gVGhlIGA8bWF0aD5gIGVsZW1lbnQgaXMgYW4gSFRNTCBlbGVtZW50IGFuZCBzaG91bGQgYmUgdXNlZFxuICogd2l0aGluIGEgdGVtcGxhdGUgdGFnZ2VkIHdpdGggdGhlIHtAbGlua2NvZGUgaHRtbH0gdGFnIGZ1bmN0aW9uLlxuICpcbiAqIEluIExpdEVsZW1lbnQgdXNhZ2UsIGl0J3MgaW52YWxpZCB0byByZXR1cm4gYW4gTWF0aE1MIGZyYWdtZW50IGZyb20gdGhlXG4gKiBgcmVuZGVyKClgIG1ldGhvZCwgYXMgdGhlIE1hdGhNTCBmcmFnbWVudCB3aWxsIGJlIGNvbnRhaW5lZCB3aXRoaW4gdGhlXG4gKiBlbGVtZW50J3Mgc2hhZG93IHJvb3QgYW5kIHRodXMgbm90IGJlIHByb3Blcmx5IGNvbnRhaW5lZCB3aXRoaW4gYSBgPG1hdGg+YFxuICogSFRNTCBlbGVtZW50LlxuICovXG5leHBvcnQgY29uc3QgbWF0aG1sID0gdGFnKE1BVEhNTF9SRVNVTFQpO1xuXG4vKipcbiAqIEEgc2VudGluZWwgdmFsdWUgdGhhdCBzaWduYWxzIHRoYXQgYSB2YWx1ZSB3YXMgaGFuZGxlZCBieSBhIGRpcmVjdGl2ZSBhbmRcbiAqIHNob3VsZCBub3QgYmUgd3JpdHRlbiB0byB0aGUgRE9NLlxuICovXG5leHBvcnQgY29uc3Qgbm9DaGFuZ2UgPSBTeW1ib2wuZm9yKCdsaXQtbm9DaGFuZ2UnKTtcblxuLyoqXG4gKiBBIHNlbnRpbmVsIHZhbHVlIHRoYXQgc2lnbmFscyBhIENoaWxkUGFydCB0byBmdWxseSBjbGVhciBpdHMgY29udGVudC5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgYnV0dG9uID0gaHRtbGAke1xuICogIHVzZXIuaXNBZG1pblxuICogICAgPyBodG1sYDxidXR0b24+REVMRVRFPC9idXR0b24+YFxuICogICAgOiBub3RoaW5nXG4gKiB9YDtcbiAqIGBgYFxuICpcbiAqIFByZWZlciB1c2luZyBgbm90aGluZ2Agb3ZlciBvdGhlciBmYWxzeSB2YWx1ZXMgYXMgaXQgcHJvdmlkZXMgYSBjb25zaXN0ZW50XG4gKiBiZWhhdmlvciBiZXR3ZWVuIHZhcmlvdXMgZXhwcmVzc2lvbiBiaW5kaW5nIGNvbnRleHRzLlxuICpcbiAqIEluIGNoaWxkIGV4cHJlc3Npb25zLCBgdW5kZWZpbmVkYCwgYG51bGxgLCBgJydgLCBhbmQgYG5vdGhpbmdgIGFsbCBiZWhhdmUgdGhlXG4gKiBzYW1lIGFuZCByZW5kZXIgbm8gbm9kZXMuIEluIGF0dHJpYnV0ZSBleHByZXNzaW9ucywgYG5vdGhpbmdgIF9yZW1vdmVzXyB0aGVcbiAqIGF0dHJpYnV0ZSwgd2hpbGUgYHVuZGVmaW5lZGAgYW5kIGBudWxsYCB3aWxsIHJlbmRlciBhbiBlbXB0eSBzdHJpbmcuIEluXG4gKiBwcm9wZXJ0eSBleHByZXNzaW9ucyBgbm90aGluZ2AgYmVjb21lcyBgdW5kZWZpbmVkYC5cbiAqL1xuZXhwb3J0IGNvbnN0IG5vdGhpbmcgPSBTeW1ib2wuZm9yKCdsaXQtbm90aGluZycpO1xuXG4vKipcbiAqIFRoZSBjYWNoZSBvZiBwcmVwYXJlZCB0ZW1wbGF0ZXMsIGtleWVkIGJ5IHRoZSB0YWdnZWQgVGVtcGxhdGVTdHJpbmdzQXJyYXlcbiAqIGFuZCBfbm90XyBhY2NvdW50aW5nIGZvciB0aGUgc3BlY2lmaWMgdGVtcGxhdGUgdGFnIHVzZWQuIFRoaXMgbWVhbnMgdGhhdFxuICogdGVtcGxhdGUgdGFncyBjYW5ub3QgYmUgZHluYW1pYyAtIHRoZXkgbXVzdCBzdGF0aWNhbGx5IGJlIG9uZSBvZiBodG1sLCBzdmcsXG4gKiBvciBhdHRyLiBUaGlzIHJlc3RyaWN0aW9uIHNpbXBsaWZpZXMgdGhlIGNhY2hlIGxvb2t1cCwgd2hpY2ggaXMgb24gdGhlIGhvdFxuICogcGF0aCBmb3IgcmVuZGVyaW5nLlxuICovXG5jb25zdCB0ZW1wbGF0ZUNhY2hlID0gbmV3IFdlYWtNYXA8VGVtcGxhdGVTdHJpbmdzQXJyYXksIFRlbXBsYXRlPigpO1xuXG4vKipcbiAqIE9iamVjdCBzcGVjaWZ5aW5nIG9wdGlvbnMgZm9yIGNvbnRyb2xsaW5nIGxpdC1odG1sIHJlbmRlcmluZy4gTm90ZSB0aGF0XG4gKiB3aGlsZSBgcmVuZGVyYCBtYXkgYmUgY2FsbGVkIG11bHRpcGxlIHRpbWVzIG9uIHRoZSBzYW1lIGBjb250YWluZXJgIChhbmRcbiAqIGByZW5kZXJCZWZvcmVgIHJlZmVyZW5jZSBub2RlKSB0byBlZmZpY2llbnRseSB1cGRhdGUgdGhlIHJlbmRlcmVkIGNvbnRlbnQsXG4gKiBvbmx5IHRoZSBvcHRpb25zIHBhc3NlZCBpbiBkdXJpbmcgdGhlIGZpcnN0IHJlbmRlciBhcmUgcmVzcGVjdGVkIGR1cmluZ1xuICogdGhlIGxpZmV0aW1lIG9mIHJlbmRlcnMgdG8gdGhhdCB1bmlxdWUgYGNvbnRhaW5lcmAgKyBgcmVuZGVyQmVmb3JlYFxuICogY29tYmluYXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVuZGVyT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBBbiBvYmplY3QgdG8gdXNlIGFzIHRoZSBgdGhpc2AgdmFsdWUgZm9yIGV2ZW50IGxpc3RlbmVycy4gSXQncyBvZnRlblxuICAgKiB1c2VmdWwgdG8gc2V0IHRoaXMgdG8gdGhlIGhvc3QgY29tcG9uZW50IHJlbmRlcmluZyBhIHRlbXBsYXRlLlxuICAgKi9cbiAgaG9zdD86IG9iamVjdDtcbiAgLyoqXG4gICAqIEEgRE9NIG5vZGUgYmVmb3JlIHdoaWNoIHRvIHJlbmRlciBjb250ZW50IGluIHRoZSBjb250YWluZXIuXG4gICAqL1xuICByZW5kZXJCZWZvcmU/OiBDaGlsZE5vZGUgfCBudWxsO1xuICAvKipcbiAgICogTm9kZSB1c2VkIGZvciBjbG9uaW5nIHRoZSB0ZW1wbGF0ZSAoYGltcG9ydE5vZGVgIHdpbGwgYmUgY2FsbGVkIG9uIHRoaXNcbiAgICogbm9kZSkuIFRoaXMgY29udHJvbHMgdGhlIGBvd25lckRvY3VtZW50YCBvZiB0aGUgcmVuZGVyZWQgRE9NLCBhbG9uZyB3aXRoXG4gICAqIGFueSBpbmhlcml0ZWQgY29udGV4dC4gRGVmYXVsdHMgdG8gdGhlIGdsb2JhbCBgZG9jdW1lbnRgLlxuICAgKi9cbiAgY3JlYXRpb25TY29wZT86IHtpbXBvcnROb2RlKG5vZGU6IE5vZGUsIGRlZXA/OiBib29sZWFuKTogTm9kZX07XG4gIC8qKlxuICAgKiBUaGUgaW5pdGlhbCBjb25uZWN0ZWQgc3RhdGUgZm9yIHRoZSB0b3AtbGV2ZWwgcGFydCBiZWluZyByZW5kZXJlZC4gSWYgbm9cbiAgICogYGlzQ29ubmVjdGVkYCBvcHRpb24gaXMgc2V0LCBgQXN5bmNEaXJlY3RpdmVgcyB3aWxsIGJlIGNvbm5lY3RlZCBieVxuICAgKiBkZWZhdWx0LiBTZXQgdG8gYGZhbHNlYCBpZiB0aGUgaW5pdGlhbCByZW5kZXIgb2NjdXJzIGluIGEgZGlzY29ubmVjdGVkIHRyZWVcbiAgICogYW5kIGBBc3luY0RpcmVjdGl2ZWBzIHNob3VsZCBzZWUgYGlzQ29ubmVjdGVkID09PSBmYWxzZWAgZm9yIHRoZWlyIGluaXRpYWxcbiAgICogcmVuZGVyLiBUaGUgYHBhcnQuc2V0Q29ubmVjdGVkKClgIG1ldGhvZCBtdXN0IGJlIHVzZWQgc3Vic2VxdWVudCB0byBpbml0aWFsXG4gICAqIHJlbmRlciB0byBjaGFuZ2UgdGhlIGNvbm5lY3RlZCBzdGF0ZSBvZiB0aGUgcGFydC5cbiAgICovXG4gIGlzQ29ubmVjdGVkPzogYm9vbGVhbjtcbn1cblxuY29uc3Qgd2Fsa2VyID0gZC5jcmVhdGVUcmVlV2Fsa2VyKFxuICBkLFxuICAxMjkgLyogTm9kZUZpbHRlci5TSE9XX3tFTEVNRU5UfENPTU1FTlR9ICovXG4pO1xuXG5sZXQgc2FuaXRpemVyRmFjdG9yeUludGVybmFsOiBTYW5pdGl6ZXJGYWN0b3J5ID0gbm9vcFNhbml0aXplcjtcblxuLy9cbi8vIENsYXNzZXMgb25seSBiZWxvdyBoZXJlLCBjb25zdCB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgb25seSBhYm92ZSBoZXJlLi4uXG4vL1xuLy8gS2VlcGluZyB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgYW5kIGNsYXNzZXMgdG9nZXRoZXIgaW1wcm92ZXMgbWluaWZpY2F0aW9uLlxuLy8gSW50ZXJmYWNlcyBhbmQgdHlwZSBhbGlhc2VzIGNhbiBiZSBpbnRlcmxlYXZlZCBmcmVlbHkuXG4vL1xuXG4vLyBUeXBlIGZvciBjbGFzc2VzIHRoYXQgaGF2ZSBhIGBfZGlyZWN0aXZlYCBvciBgX2RpcmVjdGl2ZXNbXWAgZmllbGQsIHVzZWQgYnlcbi8vIGByZXNvbHZlRGlyZWN0aXZlYFxuZXhwb3J0IGludGVyZmFjZSBEaXJlY3RpdmVQYXJlbnQge1xuICBfJHBhcmVudD86IERpcmVjdGl2ZVBhcmVudDtcbiAgXyRpc0Nvbm5lY3RlZDogYm9vbGVhbjtcbiAgX19kaXJlY3RpdmU/OiBEaXJlY3RpdmU7XG4gIF9fZGlyZWN0aXZlcz86IEFycmF5PERpcmVjdGl2ZSB8IHVuZGVmaW5lZD47XG59XG5cbmZ1bmN0aW9uIHRydXN0RnJvbVRlbXBsYXRlU3RyaW5nKFxuICB0c2E6IFRlbXBsYXRlU3RyaW5nc0FycmF5LFxuICBzdHJpbmdGcm9tVFNBOiBzdHJpbmdcbik6IFRydXN0ZWRIVE1MIHtcbiAgLy8gQSBzZWN1cml0eSBjaGVjayB0byBwcmV2ZW50IHNwb29maW5nIG9mIExpdCB0ZW1wbGF0ZSByZXN1bHRzLlxuICAvLyBJbiB0aGUgZnV0dXJlLCB3ZSBtYXkgYmUgYWJsZSB0byByZXBsYWNlIHRoaXMgd2l0aCBBcnJheS5pc1RlbXBsYXRlT2JqZWN0LFxuICAvLyB0aG91Z2ggd2UgbWlnaHQgbmVlZCB0byBtYWtlIHRoYXQgY2hlY2sgaW5zaWRlIG9mIHRoZSBodG1sIGFuZCBzdmdcbiAgLy8gZnVuY3Rpb25zLCBiZWNhdXNlIHByZWNvbXBpbGVkIHRlbXBsYXRlcyBkb24ndCBjb21lIGluIGFzXG4gIC8vIFRlbXBsYXRlU3RyaW5nQXJyYXkgb2JqZWN0cy5cbiAgaWYgKCFpc0FycmF5KHRzYSkgfHwgIXRzYS5oYXNPd25Qcm9wZXJ0eSgncmF3JykpIHtcbiAgICBsZXQgbWVzc2FnZSA9ICdpbnZhbGlkIHRlbXBsYXRlIHN0cmluZ3MgYXJyYXknO1xuICAgIGlmIChERVZfTU9ERSkge1xuICAgICAgbWVzc2FnZSA9IGBcbiAgICAgICAgICBJbnRlcm5hbCBFcnJvcjogZXhwZWN0ZWQgdGVtcGxhdGUgc3RyaW5ncyB0byBiZSBhbiBhcnJheVxuICAgICAgICAgIHdpdGggYSAncmF3JyBmaWVsZC4gRmFraW5nIGEgdGVtcGxhdGUgc3RyaW5ncyBhcnJheSBieVxuICAgICAgICAgIGNhbGxpbmcgaHRtbCBvciBzdmcgbGlrZSBhbiBvcmRpbmFyeSBmdW5jdGlvbiBpcyBlZmZlY3RpdmVseVxuICAgICAgICAgIHRoZSBzYW1lIGFzIGNhbGxpbmcgdW5zYWZlSHRtbCBhbmQgY2FuIGxlYWQgdG8gbWFqb3Igc2VjdXJpdHlcbiAgICAgICAgICBpc3N1ZXMsIGUuZy4gb3BlbmluZyB5b3VyIGNvZGUgdXAgdG8gWFNTIGF0dGFja3MuXG4gICAgICAgICAgSWYgeW91J3JlIHVzaW5nIHRoZSBodG1sIG9yIHN2ZyB0YWdnZWQgdGVtcGxhdGUgZnVuY3Rpb25zIG5vcm1hbGx5XG4gICAgICAgICAgYW5kIHN0aWxsIHNlZWluZyB0aGlzIGVycm9yLCBwbGVhc2UgZmlsZSBhIGJ1ZyBhdFxuICAgICAgICAgIGh0dHBzOi8vZ2l0aHViLmNvbS9saXQvbGl0L2lzc3Vlcy9uZXc/dGVtcGxhdGU9YnVnX3JlcG9ydC5tZFxuICAgICAgICAgIGFuZCBpbmNsdWRlIGluZm9ybWF0aW9uIGFib3V0IHlvdXIgYnVpbGQgdG9vbGluZywgaWYgYW55LlxuICAgICAgICBgXG4gICAgICAgIC50cmltKClcbiAgICAgICAgLnJlcGxhY2UoL1xcbiAqL2csICdcXG4nKTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICB9XG4gIHJldHVybiBwb2xpY3kgIT09IHVuZGVmaW5lZFxuICAgID8gcG9saWN5LmNyZWF0ZUhUTUwoc3RyaW5nRnJvbVRTQSlcbiAgICA6IChzdHJpbmdGcm9tVFNBIGFzIHVua25vd24gYXMgVHJ1c3RlZEhUTUwpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYW4gSFRNTCBzdHJpbmcgZm9yIHRoZSBnaXZlbiBUZW1wbGF0ZVN0cmluZ3NBcnJheSBhbmQgcmVzdWx0IHR5cGVcbiAqIChIVE1MIG9yIFNWRyksIGFsb25nIHdpdGggdGhlIGNhc2Utc2Vuc2l0aXZlIGJvdW5kIGF0dHJpYnV0ZSBuYW1lcyBpblxuICogdGVtcGxhdGUgb3JkZXIuIFRoZSBIVE1MIGNvbnRhaW5zIGNvbW1lbnQgbWFya2VycyBkZW5vdGluZyB0aGUgYENoaWxkUGFydGBzXG4gKiBhbmQgc3VmZml4ZXMgb24gYm91bmQgYXR0cmlidXRlcyBkZW5vdGluZyB0aGUgYEF0dHJpYnV0ZVBhcnRzYC5cbiAqXG4gKiBAcGFyYW0gc3RyaW5ncyB0ZW1wbGF0ZSBzdHJpbmdzIGFycmF5XG4gKiBAcGFyYW0gdHlwZSBIVE1MIG9yIFNWR1xuICogQHJldHVybiBBcnJheSBjb250YWluaW5nIGBbaHRtbCwgYXR0ck5hbWVzXWAgKGFycmF5IHJldHVybmVkIGZvciB0ZXJzZW5lc3MsXG4gKiAgICAgdG8gYXZvaWQgb2JqZWN0IGZpZWxkcyBzaW5jZSB0aGlzIGNvZGUgaXMgc2hhcmVkIHdpdGggbm9uLW1pbmlmaWVkIFNTUlxuICogICAgIGNvZGUpXG4gKi9cbmNvbnN0IGdldFRlbXBsYXRlSHRtbCA9IChcbiAgc3RyaW5nczogVGVtcGxhdGVTdHJpbmdzQXJyYXksXG4gIHR5cGU6IFJlc3VsdFR5cGVcbik6IFtUcnVzdGVkSFRNTCwgQXJyYXk8c3RyaW5nPl0gPT4ge1xuICAvLyBJbnNlcnQgbWFrZXJzIGludG8gdGhlIHRlbXBsYXRlIEhUTUwgdG8gcmVwcmVzZW50IHRoZSBwb3NpdGlvbiBvZlxuICAvLyBiaW5kaW5ncy4gVGhlIGZvbGxvd2luZyBjb2RlIHNjYW5zIHRoZSB0ZW1wbGF0ZSBzdHJpbmdzIHRvIGRldGVybWluZSB0aGVcbiAgLy8gc3ludGFjdGljIHBvc2l0aW9uIG9mIHRoZSBiaW5kaW5ncy4gVGhleSBjYW4gYmUgaW4gdGV4dCBwb3NpdGlvbiwgd2hlcmVcbiAgLy8gd2UgaW5zZXJ0IGFuIEhUTUwgY29tbWVudCwgYXR0cmlidXRlIHZhbHVlIHBvc2l0aW9uLCB3aGVyZSB3ZSBpbnNlcnQgYVxuICAvLyBzZW50aW5lbCBzdHJpbmcgYW5kIHJlLXdyaXRlIHRoZSBhdHRyaWJ1dGUgbmFtZSwgb3IgaW5zaWRlIGEgdGFnIHdoZXJlXG4gIC8vIHdlIGluc2VydCB0aGUgc2VudGluZWwgc3RyaW5nLlxuICBjb25zdCBsID0gc3RyaW5ncy5sZW5ndGggLSAxO1xuICAvLyBTdG9yZXMgdGhlIGNhc2Utc2Vuc2l0aXZlIGJvdW5kIGF0dHJpYnV0ZSBuYW1lcyBpbiB0aGUgb3JkZXIgb2YgdGhlaXJcbiAgLy8gcGFydHMuIEVsZW1lbnRQYXJ0cyBhcmUgYWxzbyByZWZsZWN0ZWQgaW4gdGhpcyBhcnJheSBhcyB1bmRlZmluZWRcbiAgLy8gcmF0aGVyIHRoYW4gYSBzdHJpbmcsIHRvIGRpc2FtYmlndWF0ZSBmcm9tIGF0dHJpYnV0ZSBiaW5kaW5ncy5cbiAgY29uc3QgYXR0ck5hbWVzOiBBcnJheTxzdHJpbmc+ID0gW107XG4gIGxldCBodG1sID1cbiAgICB0eXBlID09PSBTVkdfUkVTVUxUID8gJzxzdmc+JyA6IHR5cGUgPT09IE1BVEhNTF9SRVNVTFQgPyAnPG1hdGg+JyA6ICcnO1xuXG4gIC8vIFdoZW4gd2UncmUgaW5zaWRlIGEgcmF3IHRleHQgdGFnIChub3QgaXQncyB0ZXh0IGNvbnRlbnQpLCB0aGUgcmVnZXhcbiAgLy8gd2lsbCBzdGlsbCBiZSB0YWdSZWdleCBzbyB3ZSBjYW4gZmluZCBhdHRyaWJ1dGVzLCBidXQgd2lsbCBzd2l0Y2ggdG9cbiAgLy8gdGhpcyByZWdleCB3aGVuIHRoZSB0YWcgZW5kcy5cbiAgbGV0IHJhd1RleHRFbmRSZWdleDogUmVnRXhwIHwgdW5kZWZpbmVkO1xuXG4gIC8vIFRoZSBjdXJyZW50IHBhcnNpbmcgc3RhdGUsIHJlcHJlc2VudGVkIGFzIGEgcmVmZXJlbmNlIHRvIG9uZSBvZiB0aGVcbiAgLy8gcmVnZXhlc1xuICBsZXQgcmVnZXggPSB0ZXh0RW5kUmVnZXg7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICBjb25zdCBzID0gc3RyaW5nc1tpXTtcbiAgICAvLyBUaGUgaW5kZXggb2YgdGhlIGVuZCBvZiB0aGUgbGFzdCBhdHRyaWJ1dGUgbmFtZS4gV2hlbiB0aGlzIGlzXG4gICAgLy8gcG9zaXRpdmUgYXQgZW5kIG9mIGEgc3RyaW5nLCBpdCBtZWFucyB3ZSdyZSBpbiBhbiBhdHRyaWJ1dGUgdmFsdWVcbiAgICAvLyBwb3NpdGlvbiBhbmQgbmVlZCB0byByZXdyaXRlIHRoZSBhdHRyaWJ1dGUgbmFtZS5cbiAgICAvLyBXZSBhbHNvIHVzZSBhIHNwZWNpYWwgdmFsdWUgb2YgLTIgdG8gaW5kaWNhdGUgdGhhdCB3ZSBlbmNvdW50ZXJlZFxuICAgIC8vIHRoZSBlbmQgb2YgYSBzdHJpbmcgaW4gYXR0cmlidXRlIG5hbWUgcG9zaXRpb24uXG4gICAgbGV0IGF0dHJOYW1lRW5kSW5kZXggPSAtMTtcbiAgICBsZXQgYXR0ck5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBsZXQgbGFzdEluZGV4ID0gMDtcbiAgICBsZXQgbWF0Y2ghOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xuXG4gICAgLy8gVGhlIGNvbmRpdGlvbnMgaW4gdGhpcyBsb29wIGhhbmRsZSB0aGUgY3VycmVudCBwYXJzZSBzdGF0ZSwgYW5kIHRoZVxuICAgIC8vIGFzc2lnbm1lbnRzIHRvIHRoZSBgcmVnZXhgIHZhcmlhYmxlIGFyZSB0aGUgc3RhdGUgdHJhbnNpdGlvbnMuXG4gICAgd2hpbGUgKGxhc3RJbmRleCA8IHMubGVuZ3RoKSB7XG4gICAgICAvLyBNYWtlIHN1cmUgd2Ugc3RhcnQgc2VhcmNoaW5nIGZyb20gd2hlcmUgd2UgcHJldmlvdXNseSBsZWZ0IG9mZlxuICAgICAgcmVnZXgubGFzdEluZGV4ID0gbGFzdEluZGV4O1xuICAgICAgbWF0Y2ggPSByZWdleC5leGVjKHMpO1xuICAgICAgaWYgKG1hdGNoID09PSBudWxsKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgbGFzdEluZGV4ID0gcmVnZXgubGFzdEluZGV4O1xuICAgICAgaWYgKHJlZ2V4ID09PSB0ZXh0RW5kUmVnZXgpIHtcbiAgICAgICAgaWYgKG1hdGNoW0NPTU1FTlRfU1RBUlRdID09PSAnIS0tJykge1xuICAgICAgICAgIHJlZ2V4ID0gY29tbWVudEVuZFJlZ2V4O1xuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoW0NPTU1FTlRfU1RBUlRdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBXZSBzdGFydGVkIGEgd2VpcmQgY29tbWVudCwgbGlrZSA8L3tcbiAgICAgICAgICByZWdleCA9IGNvbW1lbnQyRW5kUmVnZXg7XG4gICAgICAgIH0gZWxzZSBpZiAobWF0Y2hbVEFHX05BTUVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAocmF3VGV4dEVsZW1lbnQudGVzdChtYXRjaFtUQUdfTkFNRV0pKSB7XG4gICAgICAgICAgICAvLyBSZWNvcmQgaWYgd2UgZW5jb3VudGVyIGEgcmF3LXRleHQgZWxlbWVudC4gV2UnbGwgc3dpdGNoIHRvXG4gICAgICAgICAgICAvLyB0aGlzIHJlZ2V4IGF0IHRoZSBlbmQgb2YgdGhlIHRhZy5cbiAgICAgICAgICAgIHJhd1RleHRFbmRSZWdleCA9IG5ldyBSZWdFeHAoYDwvJHttYXRjaFtUQUdfTkFNRV19YCwgJ2cnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVnZXggPSB0YWdFbmRSZWdleDtcbiAgICAgICAgfSBlbHNlIGlmIChtYXRjaFtEWU5BTUlDX1RBR19OQU1FXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKERFVl9NT0RFKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICdCaW5kaW5ncyBpbiB0YWcgbmFtZXMgYXJlIG5vdCBzdXBwb3J0ZWQuIFBsZWFzZSB1c2Ugc3RhdGljIHRlbXBsYXRlcyBpbnN0ZWFkLiAnICtcbiAgICAgICAgICAgICAgICAnU2VlIGh0dHBzOi8vbGl0LmRldi9kb2NzL3RlbXBsYXRlcy9leHByZXNzaW9ucy8jc3RhdGljLWV4cHJlc3Npb25zJ1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVnZXggPSB0YWdFbmRSZWdleDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChyZWdleCA9PT0gdGFnRW5kUmVnZXgpIHtcbiAgICAgICAgaWYgKG1hdGNoW0VOVElSRV9NQVRDSF0gPT09ICc+Jykge1xuICAgICAgICAgIC8vIEVuZCBvZiBhIHRhZy4gSWYgd2UgaGFkIHN0YXJ0ZWQgYSByYXctdGV4dCBlbGVtZW50LCB1c2UgdGhhdFxuICAgICAgICAgIC8vIHJlZ2V4XG4gICAgICAgICAgcmVnZXggPSByYXdUZXh0RW5kUmVnZXggPz8gdGV4dEVuZFJlZ2V4O1xuICAgICAgICAgIC8vIFdlIG1heSBiZSBlbmRpbmcgYW4gdW5xdW90ZWQgYXR0cmlidXRlIHZhbHVlLCBzbyBtYWtlIHN1cmUgd2VcbiAgICAgICAgICAvLyBjbGVhciBhbnkgcGVuZGluZyBhdHRyTmFtZUVuZEluZGV4XG4gICAgICAgICAgYXR0ck5hbWVFbmRJbmRleCA9IC0xO1xuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoW0FUVFJJQlVURV9OQU1FXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gQXR0cmlidXRlIG5hbWUgcG9zaXRpb25cbiAgICAgICAgICBhdHRyTmFtZUVuZEluZGV4ID0gLTI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXR0ck5hbWVFbmRJbmRleCA9IHJlZ2V4Lmxhc3RJbmRleCAtIG1hdGNoW1NQQUNFU19BTkRfRVFVQUxTXS5sZW5ndGg7XG4gICAgICAgICAgYXR0ck5hbWUgPSBtYXRjaFtBVFRSSUJVVEVfTkFNRV07XG4gICAgICAgICAgcmVnZXggPVxuICAgICAgICAgICAgbWF0Y2hbUVVPVEVfQ0hBUl0gPT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICA/IHRhZ0VuZFJlZ2V4XG4gICAgICAgICAgICAgIDogbWF0Y2hbUVVPVEVfQ0hBUl0gPT09ICdcIidcbiAgICAgICAgICAgICAgICA/IGRvdWJsZVF1b3RlQXR0ckVuZFJlZ2V4XG4gICAgICAgICAgICAgICAgOiBzaW5nbGVRdW90ZUF0dHJFbmRSZWdleDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgcmVnZXggPT09IGRvdWJsZVF1b3RlQXR0ckVuZFJlZ2V4IHx8XG4gICAgICAgIHJlZ2V4ID09PSBzaW5nbGVRdW90ZUF0dHJFbmRSZWdleFxuICAgICAgKSB7XG4gICAgICAgIHJlZ2V4ID0gdGFnRW5kUmVnZXg7XG4gICAgICB9IGVsc2UgaWYgKHJlZ2V4ID09PSBjb21tZW50RW5kUmVnZXggfHwgcmVnZXggPT09IGNvbW1lbnQyRW5kUmVnZXgpIHtcbiAgICAgICAgcmVnZXggPSB0ZXh0RW5kUmVnZXg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBOb3Qgb25lIG9mIHRoZSBmaXZlIHN0YXRlIHJlZ2V4ZXMsIHNvIGl0IG11c3QgYmUgdGhlIGR5bmFtaWNhbGx5XG4gICAgICAgIC8vIGNyZWF0ZWQgcmF3IHRleHQgcmVnZXggYW5kIHdlJ3JlIGF0IHRoZSBjbG9zZSBvZiB0aGF0IGVsZW1lbnQuXG4gICAgICAgIHJlZ2V4ID0gdGFnRW5kUmVnZXg7XG4gICAgICAgIHJhd1RleHRFbmRSZWdleCA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoREVWX01PREUpIHtcbiAgICAgIC8vIElmIHdlIGhhdmUgYSBhdHRyTmFtZUVuZEluZGV4LCB3aGljaCBpbmRpY2F0ZXMgdGhhdCB3ZSBzaG91bGRcbiAgICAgIC8vIHJld3JpdGUgdGhlIGF0dHJpYnV0ZSBuYW1lLCBhc3NlcnQgdGhhdCB3ZSdyZSBpbiBhIHZhbGlkIGF0dHJpYnV0ZVxuICAgICAgLy8gcG9zaXRpb24gLSBlaXRoZXIgaW4gYSB0YWcsIG9yIGEgcXVvdGVkIGF0dHJpYnV0ZSB2YWx1ZS5cbiAgICAgIGNvbnNvbGUuYXNzZXJ0KFxuICAgICAgICBhdHRyTmFtZUVuZEluZGV4ID09PSAtMSB8fFxuICAgICAgICAgIHJlZ2V4ID09PSB0YWdFbmRSZWdleCB8fFxuICAgICAgICAgIHJlZ2V4ID09PSBzaW5nbGVRdW90ZUF0dHJFbmRSZWdleCB8fFxuICAgICAgICAgIHJlZ2V4ID09PSBkb3VibGVRdW90ZUF0dHJFbmRSZWdleCxcbiAgICAgICAgJ3VuZXhwZWN0ZWQgcGFyc2Ugc3RhdGUgQidcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gV2UgaGF2ZSBmb3VyIGNhc2VzOlxuICAgIC8vICAxLiBXZSdyZSBpbiB0ZXh0IHBvc2l0aW9uLCBhbmQgbm90IGluIGEgcmF3IHRleHQgZWxlbWVudFxuICAgIC8vICAgICAocmVnZXggPT09IHRleHRFbmRSZWdleCk6IGluc2VydCBhIGNvbW1lbnQgbWFya2VyLlxuICAgIC8vICAyLiBXZSBoYXZlIGEgbm9uLW5lZ2F0aXZlIGF0dHJOYW1lRW5kSW5kZXggd2hpY2ggbWVhbnMgd2UgbmVlZCB0b1xuICAgIC8vICAgICByZXdyaXRlIHRoZSBhdHRyaWJ1dGUgbmFtZSB0byBhZGQgYSBib3VuZCBhdHRyaWJ1dGUgc3VmZml4LlxuICAgIC8vICAzLiBXZSdyZSBhdCB0aGUgbm9uLWZpcnN0IGJpbmRpbmcgaW4gYSBtdWx0aS1iaW5kaW5nIGF0dHJpYnV0ZSwgdXNlIGFcbiAgICAvLyAgICAgcGxhaW4gbWFya2VyLlxuICAgIC8vICA0LiBXZSdyZSBzb21ld2hlcmUgZWxzZSBpbnNpZGUgdGhlIHRhZy4gSWYgd2UncmUgaW4gYXR0cmlidXRlIG5hbWVcbiAgICAvLyAgICAgcG9zaXRpb24gKGF0dHJOYW1lRW5kSW5kZXggPT09IC0yKSwgYWRkIGEgc2VxdWVudGlhbCBzdWZmaXggdG9cbiAgICAvLyAgICAgZ2VuZXJhdGUgYSB1bmlxdWUgYXR0cmlidXRlIG5hbWUuXG5cbiAgICAvLyBEZXRlY3QgYSBiaW5kaW5nIG5leHQgdG8gc2VsZi1jbG9zaW5nIHRhZyBlbmQgYW5kIGluc2VydCBhIHNwYWNlIHRvXG4gICAgLy8gc2VwYXJhdGUgdGhlIG1hcmtlciBmcm9tIHRoZSB0YWcgZW5kOlxuICAgIGNvbnN0IGVuZCA9XG4gICAgICByZWdleCA9PT0gdGFnRW5kUmVnZXggJiYgc3RyaW5nc1tpICsgMV0uc3RhcnRzV2l0aCgnLz4nKSA/ICcgJyA6ICcnO1xuICAgIGh0bWwgKz1cbiAgICAgIHJlZ2V4ID09PSB0ZXh0RW5kUmVnZXhcbiAgICAgICAgPyBzICsgbm9kZU1hcmtlclxuICAgICAgICA6IGF0dHJOYW1lRW5kSW5kZXggPj0gMFxuICAgICAgICAgID8gKGF0dHJOYW1lcy5wdXNoKGF0dHJOYW1lISksXG4gICAgICAgICAgICBzLnNsaWNlKDAsIGF0dHJOYW1lRW5kSW5kZXgpICtcbiAgICAgICAgICAgICAgYm91bmRBdHRyaWJ1dGVTdWZmaXggK1xuICAgICAgICAgICAgICBzLnNsaWNlKGF0dHJOYW1lRW5kSW5kZXgpKSArXG4gICAgICAgICAgICBtYXJrZXIgK1xuICAgICAgICAgICAgZW5kXG4gICAgICAgICAgOiBzICsgbWFya2VyICsgKGF0dHJOYW1lRW5kSW5kZXggPT09IC0yID8gaSA6IGVuZCk7XG4gIH1cblxuICBjb25zdCBodG1sUmVzdWx0OiBzdHJpbmcgfCBUcnVzdGVkSFRNTCA9XG4gICAgaHRtbCArXG4gICAgKHN0cmluZ3NbbF0gfHwgJzw/PicpICtcbiAgICAodHlwZSA9PT0gU1ZHX1JFU1VMVCA/ICc8L3N2Zz4nIDogdHlwZSA9PT0gTUFUSE1MX1JFU1VMVCA/ICc8L21hdGg+JyA6ICcnKTtcblxuICAvLyBSZXR1cm5lZCBhcyBhbiBhcnJheSBmb3IgdGVyc2VuZXNzXG4gIHJldHVybiBbdHJ1c3RGcm9tVGVtcGxhdGVTdHJpbmcoc3RyaW5ncywgaHRtbFJlc3VsdCksIGF0dHJOYW1lc107XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSB7VGVtcGxhdGV9O1xuY2xhc3MgVGVtcGxhdGUge1xuICAvKiogQGludGVybmFsICovXG4gIGVsITogSFRNTFRlbXBsYXRlRWxlbWVudDtcblxuICBwYXJ0czogQXJyYXk8VGVtcGxhdGVQYXJ0PiA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAge3N0cmluZ3MsIFsnXyRsaXRUeXBlJCddOiB0eXBlfTogVW5jb21waWxlZFRlbXBsYXRlUmVzdWx0LFxuICAgIG9wdGlvbnM/OiBSZW5kZXJPcHRpb25zXG4gICkge1xuICAgIGxldCBub2RlOiBOb2RlIHwgbnVsbDtcbiAgICBsZXQgbm9kZUluZGV4ID0gMDtcbiAgICBsZXQgYXR0ck5hbWVJbmRleCA9IDA7XG4gICAgY29uc3QgcGFydENvdW50ID0gc3RyaW5ncy5sZW5ndGggLSAxO1xuICAgIGNvbnN0IHBhcnRzID0gdGhpcy5wYXJ0cztcblxuICAgIC8vIENyZWF0ZSB0ZW1wbGF0ZSBlbGVtZW50XG4gICAgY29uc3QgW2h0bWwsIGF0dHJOYW1lc10gPSBnZXRUZW1wbGF0ZUh0bWwoc3RyaW5ncywgdHlwZSk7XG4gICAgdGhpcy5lbCA9IFRlbXBsYXRlLmNyZWF0ZUVsZW1lbnQoaHRtbCwgb3B0aW9ucyk7XG4gICAgd2Fsa2VyLmN1cnJlbnROb2RlID0gdGhpcy5lbC5jb250ZW50O1xuXG4gICAgLy8gUmUtcGFyZW50IFNWRyBvciBNYXRoTUwgbm9kZXMgaW50byB0ZW1wbGF0ZSByb290XG4gICAgaWYgKHR5cGUgPT09IFNWR19SRVNVTFQgfHwgdHlwZSA9PT0gTUFUSE1MX1JFU1VMVCkge1xuICAgICAgY29uc3Qgd3JhcHBlciA9IHRoaXMuZWwuY29udGVudC5maXJzdENoaWxkITtcbiAgICAgIHdyYXBwZXIucmVwbGFjZVdpdGgoLi4ud3JhcHBlci5jaGlsZE5vZGVzKTtcbiAgICB9XG5cbiAgICAvLyBXYWxrIHRoZSB0ZW1wbGF0ZSB0byBmaW5kIGJpbmRpbmcgbWFya2VycyBhbmQgY3JlYXRlIFRlbXBsYXRlUGFydHNcbiAgICB3aGlsZSAoKG5vZGUgPSB3YWxrZXIubmV4dE5vZGUoKSkgIT09IG51bGwgJiYgcGFydHMubGVuZ3RoIDwgcGFydENvdW50KSB7XG4gICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICBpZiAoREVWX01PREUpIHtcbiAgICAgICAgICBjb25zdCB0YWcgPSAobm9kZSBhcyBFbGVtZW50KS5sb2NhbE5hbWU7XG4gICAgICAgICAgLy8gV2FybiBpZiBgdGV4dGFyZWFgIGluY2x1ZGVzIGFuIGV4cHJlc3Npb24gYW5kIHRocm93IGlmIGB0ZW1wbGF0ZWBcbiAgICAgICAgICAvLyBkb2VzIHNpbmNlIHRoZXNlIGFyZSBub3Qgc3VwcG9ydGVkLiBXZSBkbyB0aGlzIGJ5IGNoZWNraW5nXG4gICAgICAgICAgLy8gaW5uZXJIVE1MIGZvciBhbnl0aGluZyB0aGF0IGxvb2tzIGxpa2UgYSBtYXJrZXIuIFRoaXMgY2F0Y2hlc1xuICAgICAgICAgIC8vIGNhc2VzIGxpa2UgYmluZGluZ3MgaW4gdGV4dGFyZWEgdGhlcmUgbWFya2VycyB0dXJuIGludG8gdGV4dCBub2Rlcy5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAvXig/OnRleHRhcmVhfHRlbXBsYXRlKSQvaSEudGVzdCh0YWcpICYmXG4gICAgICAgICAgICAobm9kZSBhcyBFbGVtZW50KS5pbm5lckhUTUwuaW5jbHVkZXMobWFya2VyKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgY29uc3QgbSA9XG4gICAgICAgICAgICAgIGBFeHByZXNzaW9ucyBhcmUgbm90IHN1cHBvcnRlZCBpbnNpZGUgXFxgJHt0YWd9XFxgIGAgK1xuICAgICAgICAgICAgICBgZWxlbWVudHMuIFNlZSBodHRwczovL2xpdC5kZXYvbXNnL2V4cHJlc3Npb24taW4tJHt0YWd9IGZvciBtb3JlIGAgK1xuICAgICAgICAgICAgICBgaW5mb3JtYXRpb24uYDtcbiAgICAgICAgICAgIGlmICh0YWcgPT09ICd0ZW1wbGF0ZScpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG0pO1xuICAgICAgICAgICAgfSBlbHNlIGlzc3VlV2FybmluZygnJywgbSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE8gKGp1c3RpbmZhZ25hbmkpOiBmb3IgYXR0ZW1wdGVkIGR5bmFtaWMgdGFnIG5hbWVzLCB3ZSBkb24ndFxuICAgICAgICAvLyBpbmNyZW1lbnQgdGhlIGJpbmRpbmdJbmRleCwgYW5kIGl0J2xsIGJlIG9mZiBieSAxIGluIHRoZSBlbGVtZW50XG4gICAgICAgIC8vIGFuZCBvZmYgYnkgdHdvIGFmdGVyIGl0LlxuICAgICAgICBpZiAoKG5vZGUgYXMgRWxlbWVudCkuaGFzQXR0cmlidXRlcygpKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIChub2RlIGFzIEVsZW1lbnQpLmdldEF0dHJpYnV0ZU5hbWVzKCkpIHtcbiAgICAgICAgICAgIGlmIChuYW1lLmVuZHNXaXRoKGJvdW5kQXR0cmlidXRlU3VmZml4KSkge1xuICAgICAgICAgICAgICBjb25zdCByZWFsTmFtZSA9IGF0dHJOYW1lc1thdHRyTmFtZUluZGV4KytdO1xuICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IChub2RlIGFzIEVsZW1lbnQpLmdldEF0dHJpYnV0ZShuYW1lKSE7XG4gICAgICAgICAgICAgIGNvbnN0IHN0YXRpY3MgPSB2YWx1ZS5zcGxpdChtYXJrZXIpO1xuICAgICAgICAgICAgICBjb25zdCBtID0gLyhbLj9AXSk/KC4qKS8uZXhlYyhyZWFsTmFtZSkhO1xuICAgICAgICAgICAgICBwYXJ0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICB0eXBlOiBBVFRSSUJVVEVfUEFSVCxcbiAgICAgICAgICAgICAgICBpbmRleDogbm9kZUluZGV4LFxuICAgICAgICAgICAgICAgIG5hbWU6IG1bMl0sXG4gICAgICAgICAgICAgICAgc3RyaW5nczogc3RhdGljcyxcbiAgICAgICAgICAgICAgICBjdG9yOlxuICAgICAgICAgICAgICAgICAgbVsxXSA9PT0gJy4nXG4gICAgICAgICAgICAgICAgICAgID8gUHJvcGVydHlQYXJ0XG4gICAgICAgICAgICAgICAgICAgIDogbVsxXSA9PT0gJz8nXG4gICAgICAgICAgICAgICAgICAgICAgPyBCb29sZWFuQXR0cmlidXRlUGFydFxuICAgICAgICAgICAgICAgICAgICAgIDogbVsxXSA9PT0gJ0AnXG4gICAgICAgICAgICAgICAgICAgICAgICA/IEV2ZW50UGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgOiBBdHRyaWJ1dGVQYXJ0LFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgKG5vZGUgYXMgRWxlbWVudCkucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChuYW1lLnN0YXJ0c1dpdGgobWFya2VyKSkge1xuICAgICAgICAgICAgICBwYXJ0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICB0eXBlOiBFTEVNRU5UX1BBUlQsXG4gICAgICAgICAgICAgICAgaW5kZXg6IG5vZGVJbmRleCxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIChub2RlIGFzIEVsZW1lbnQpLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETyAoanVzdGluZmFnbmFuaSk6IGJlbmNobWFyayB0aGUgcmVnZXggYWdhaW5zdCB0ZXN0aW5nIGZvciBlYWNoXG4gICAgICAgIC8vIG9mIHRoZSAzIHJhdyB0ZXh0IGVsZW1lbnQgbmFtZXMuXG4gICAgICAgIGlmIChyYXdUZXh0RWxlbWVudC50ZXN0KChub2RlIGFzIEVsZW1lbnQpLnRhZ05hbWUpKSB7XG4gICAgICAgICAgLy8gRm9yIHJhdyB0ZXh0IGVsZW1lbnRzIHdlIG5lZWQgdG8gc3BsaXQgdGhlIHRleHQgY29udGVudCBvblxuICAgICAgICAgIC8vIG1hcmtlcnMsIGNyZWF0ZSBhIFRleHQgbm9kZSBmb3IgZWFjaCBzZWdtZW50LCBhbmQgY3JlYXRlXG4gICAgICAgICAgLy8gYSBUZW1wbGF0ZVBhcnQgZm9yIGVhY2ggbWFya2VyLlxuICAgICAgICAgIGNvbnN0IHN0cmluZ3MgPSAobm9kZSBhcyBFbGVtZW50KS50ZXh0Q29udGVudCEuc3BsaXQobWFya2VyKTtcbiAgICAgICAgICBjb25zdCBsYXN0SW5kZXggPSBzdHJpbmdzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgaWYgKGxhc3RJbmRleCA+IDApIHtcbiAgICAgICAgICAgIChub2RlIGFzIEVsZW1lbnQpLnRleHRDb250ZW50ID0gdHJ1c3RlZFR5cGVzXG4gICAgICAgICAgICAgID8gKHRydXN0ZWRUeXBlcy5lbXB0eVNjcmlwdCBhcyB1bmtub3duIGFzICcnKVxuICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgLy8gR2VuZXJhdGUgYSBuZXcgdGV4dCBub2RlIGZvciBlYWNoIGxpdGVyYWwgc2VjdGlvblxuICAgICAgICAgICAgLy8gVGhlc2Ugbm9kZXMgYXJlIGFsc28gdXNlZCBhcyB0aGUgbWFya2VycyBmb3IgY2hpbGQgcGFydHNcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGFzdEluZGV4OyBpKyspIHtcbiAgICAgICAgICAgICAgKG5vZGUgYXMgRWxlbWVudCkuYXBwZW5kKHN0cmluZ3NbaV0sIGNyZWF0ZU1hcmtlcigpKTtcbiAgICAgICAgICAgICAgLy8gV2FsayBwYXN0IHRoZSBtYXJrZXIgbm9kZSB3ZSBqdXN0IGFkZGVkXG4gICAgICAgICAgICAgIHdhbGtlci5uZXh0Tm9kZSgpO1xuICAgICAgICAgICAgICBwYXJ0cy5wdXNoKHt0eXBlOiBDSElMRF9QQVJULCBpbmRleDogKytub2RlSW5kZXh9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE5vdGUgYmVjYXVzZSB0aGlzIG1hcmtlciBpcyBhZGRlZCBhZnRlciB0aGUgd2Fsa2VyJ3MgY3VycmVudFxuICAgICAgICAgICAgLy8gbm9kZSwgaXQgd2lsbCBiZSB3YWxrZWQgdG8gaW4gdGhlIG91dGVyIGxvb3AgKGFuZCBpZ25vcmVkKSwgc29cbiAgICAgICAgICAgIC8vIHdlIGRvbid0IG5lZWQgdG8gYWRqdXN0IG5vZGVJbmRleCBoZXJlXG4gICAgICAgICAgICAobm9kZSBhcyBFbGVtZW50KS5hcHBlbmQoc3RyaW5nc1tsYXN0SW5kZXhdLCBjcmVhdGVNYXJrZXIoKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IDgpIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IChub2RlIGFzIENvbW1lbnQpLmRhdGE7XG4gICAgICAgIGlmIChkYXRhID09PSBtYXJrZXJNYXRjaCkge1xuICAgICAgICAgIHBhcnRzLnB1c2goe3R5cGU6IENISUxEX1BBUlQsIGluZGV4OiBub2RlSW5kZXh9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsZXQgaSA9IC0xO1xuICAgICAgICAgIHdoaWxlICgoaSA9IChub2RlIGFzIENvbW1lbnQpLmRhdGEuaW5kZXhPZihtYXJrZXIsIGkgKyAxKSkgIT09IC0xKSB7XG4gICAgICAgICAgICAvLyBDb21tZW50IG5vZGUgaGFzIGEgYmluZGluZyBtYXJrZXIgaW5zaWRlLCBtYWtlIGFuIGluYWN0aXZlIHBhcnRcbiAgICAgICAgICAgIC8vIFRoZSBiaW5kaW5nIHdvbid0IHdvcmssIGJ1dCBzdWJzZXF1ZW50IGJpbmRpbmdzIHdpbGxcbiAgICAgICAgICAgIHBhcnRzLnB1c2goe3R5cGU6IENPTU1FTlRfUEFSVCwgaW5kZXg6IG5vZGVJbmRleH0pO1xuICAgICAgICAgICAgLy8gTW92ZSB0byB0aGUgZW5kIG9mIHRoZSBtYXRjaFxuICAgICAgICAgICAgaSArPSBtYXJrZXIubGVuZ3RoIC0gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG5vZGVJbmRleCsrO1xuICAgIH1cblxuICAgIGlmIChERVZfTU9ERSkge1xuICAgICAgLy8gSWYgdGhlcmUgd2FzIGEgZHVwbGljYXRlIGF0dHJpYnV0ZSBvbiBhIHRhZywgdGhlbiB3aGVuIHRoZSB0YWcgaXNcbiAgICAgIC8vIHBhcnNlZCBpbnRvIGFuIGVsZW1lbnQgdGhlIGF0dHJpYnV0ZSBnZXRzIGRlLWR1cGxpY2F0ZWQuIFdlIGNhbiBkZXRlY3RcbiAgICAgIC8vIHRoaXMgbWlzbWF0Y2ggaWYgd2UgaGF2ZW4ndCBwcmVjaXNlbHkgY29uc3VtZWQgZXZlcnkgYXR0cmlidXRlIG5hbWVcbiAgICAgIC8vIHdoZW4gcHJlcGFyaW5nIHRoZSB0ZW1wbGF0ZS4gVGhpcyB3b3JrcyBiZWNhdXNlIGBhdHRyTmFtZXNgIGlzIGJ1aWx0XG4gICAgICAvLyBmcm9tIHRoZSB0ZW1wbGF0ZSBzdHJpbmcgYW5kIGBhdHRyTmFtZUluZGV4YCBjb21lcyBmcm9tIHByb2Nlc3NpbmcgdGhlXG4gICAgICAvLyByZXN1bHRpbmcgRE9NLlxuICAgICAgaWYgKGF0dHJOYW1lcy5sZW5ndGggIT09IGF0dHJOYW1lSW5kZXgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBEZXRlY3RlZCBkdXBsaWNhdGUgYXR0cmlidXRlIGJpbmRpbmdzLiBUaGlzIG9jY3VycyBpZiB5b3VyIHRlbXBsYXRlIGAgK1xuICAgICAgICAgICAgYGhhcyBkdXBsaWNhdGUgYXR0cmlidXRlcyBvbiBhbiBlbGVtZW50IHRhZy4gRm9yIGV4YW1wbGUgYCArXG4gICAgICAgICAgICBgXCI8aW5wdXQgP2Rpc2FibGVkPVxcJHt0cnVlfSA/ZGlzYWJsZWQ9XFwke2ZhbHNlfT5cIiBjb250YWlucyBhIGAgK1xuICAgICAgICAgICAgYGR1cGxpY2F0ZSBcImRpc2FibGVkXCIgYXR0cmlidXRlLiBUaGUgZXJyb3Igd2FzIGRldGVjdGVkIGluIGAgK1xuICAgICAgICAgICAgYHRoZSBmb2xsb3dpbmcgdGVtcGxhdGU6IFxcbmAgK1xuICAgICAgICAgICAgJ2AnICtcbiAgICAgICAgICAgIHN0cmluZ3Muam9pbignJHsuLi59JykgK1xuICAgICAgICAgICAgJ2AnXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gV2UgY291bGQgc2V0IHdhbGtlci5jdXJyZW50Tm9kZSB0byBhbm90aGVyIG5vZGUgaGVyZSB0byBwcmV2ZW50IGEgbWVtb3J5XG4gICAgLy8gbGVhaywgYnV0IGV2ZXJ5IHRpbWUgd2UgcHJlcGFyZSBhIHRlbXBsYXRlLCB3ZSBpbW1lZGlhdGVseSByZW5kZXIgaXRcbiAgICAvLyBhbmQgcmUtdXNlIHRoZSB3YWxrZXIgaW4gbmV3IFRlbXBsYXRlSW5zdGFuY2UuX2Nsb25lKCkuXG4gICAgZGVidWdMb2dFdmVudCAmJlxuICAgICAgZGVidWdMb2dFdmVudCh7XG4gICAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSBwcmVwJyxcbiAgICAgICAgdGVtcGxhdGU6IHRoaXMsXG4gICAgICAgIGNsb25hYmxlVGVtcGxhdGU6IHRoaXMuZWwsXG4gICAgICAgIHBhcnRzOiB0aGlzLnBhcnRzLFxuICAgICAgICBzdHJpbmdzLFxuICAgICAgfSk7XG4gIH1cblxuICAvLyBPdmVycmlkZGVuIHZpYSBgbGl0SHRtbFBvbHlmaWxsU3VwcG9ydGAgdG8gcHJvdmlkZSBwbGF0Zm9ybSBzdXBwb3J0LlxuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGNyZWF0ZUVsZW1lbnQoaHRtbDogVHJ1c3RlZEhUTUwsIF9vcHRpb25zPzogUmVuZGVyT3B0aW9ucykge1xuICAgIGNvbnN0IGVsID0gZC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICAgIGVsLmlubmVySFRNTCA9IGh0bWwgYXMgdW5rbm93biBhcyBzdHJpbmc7XG4gICAgcmV0dXJuIGVsO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGlzY29ubmVjdGFibGUge1xuICBfJHBhcmVudD86IERpc2Nvbm5lY3RhYmxlO1xuICBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4/OiBTZXQ8RGlzY29ubmVjdGFibGU+O1xuICAvLyBSYXRoZXIgdGhhbiBob2xkIGNvbm5lY3Rpb24gc3RhdGUgb24gaW5zdGFuY2VzLCBEaXNjb25uZWN0YWJsZXMgcmVjdXJzaXZlbHlcbiAgLy8gZmV0Y2ggdGhlIGNvbm5lY3Rpb24gc3RhdGUgZnJvbSB0aGUgUm9vdFBhcnQgdGhleSBhcmUgY29ubmVjdGVkIGluIHZpYVxuICAvLyBnZXR0ZXJzIHVwIHRoZSBEaXNjb25uZWN0YWJsZSB0cmVlIHZpYSBfJHBhcmVudCByZWZlcmVuY2VzLiBUaGlzIHB1c2hlcyB0aGVcbiAgLy8gY29zdCBvZiB0cmFja2luZyB0aGUgaXNDb25uZWN0ZWQgc3RhdGUgdG8gYEFzeW5jRGlyZWN0aXZlc2AsIGFuZCBhdm9pZHNcbiAgLy8gbmVlZGluZyB0byBwYXNzIGFsbCBEaXNjb25uZWN0YWJsZXMgKHBhcnRzLCB0ZW1wbGF0ZSBpbnN0YW5jZXMsIGFuZFxuICAvLyBkaXJlY3RpdmVzKSB0aGVpciBjb25uZWN0aW9uIHN0YXRlIGVhY2ggdGltZSBpdCBjaGFuZ2VzLCB3aGljaCB3b3VsZCBiZVxuICAvLyBjb3N0bHkgZm9yIHRyZWVzIHRoYXQgaGF2ZSBubyBBc3luY0RpcmVjdGl2ZXMuXG4gIF8kaXNDb25uZWN0ZWQ6IGJvb2xlYW47XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVEaXJlY3RpdmUoXG4gIHBhcnQ6IENoaWxkUGFydCB8IEF0dHJpYnV0ZVBhcnQgfCBFbGVtZW50UGFydCxcbiAgdmFsdWU6IHVua25vd24sXG4gIHBhcmVudDogRGlyZWN0aXZlUGFyZW50ID0gcGFydCxcbiAgYXR0cmlidXRlSW5kZXg/OiBudW1iZXJcbik6IHVua25vd24ge1xuICAvLyBCYWlsIGVhcmx5IGlmIHRoZSB2YWx1ZSBpcyBleHBsaWNpdGx5IG5vQ2hhbmdlLiBOb3RlLCB0aGlzIG1lYW5zIGFueVxuICAvLyBuZXN0ZWQgZGlyZWN0aXZlIGlzIHN0aWxsIGF0dGFjaGVkIGFuZCBpcyBub3QgcnVuLlxuICBpZiAodmFsdWUgPT09IG5vQ2hhbmdlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIGxldCBjdXJyZW50RGlyZWN0aXZlID1cbiAgICBhdHRyaWJ1dGVJbmRleCAhPT0gdW5kZWZpbmVkXG4gICAgICA/IChwYXJlbnQgYXMgQXR0cmlidXRlUGFydCkuX19kaXJlY3RpdmVzPy5bYXR0cmlidXRlSW5kZXhdXG4gICAgICA6IChwYXJlbnQgYXMgQ2hpbGRQYXJ0IHwgRWxlbWVudFBhcnQgfCBEaXJlY3RpdmUpLl9fZGlyZWN0aXZlO1xuICBjb25zdCBuZXh0RGlyZWN0aXZlQ29uc3RydWN0b3IgPSBpc1ByaW1pdGl2ZSh2YWx1ZSlcbiAgICA/IHVuZGVmaW5lZFxuICAgIDogLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICAgICh2YWx1ZSBhcyBEaXJlY3RpdmVSZXN1bHQpWydfJGxpdERpcmVjdGl2ZSQnXTtcbiAgaWYgKGN1cnJlbnREaXJlY3RpdmU/LmNvbnN0cnVjdG9yICE9PSBuZXh0RGlyZWN0aXZlQ29uc3RydWN0b3IpIHtcbiAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIGN1cnJlbnREaXJlY3RpdmU/LlsnXyRub3RpZnlEaXJlY3RpdmVDb25uZWN0aW9uQ2hhbmdlZCddPy4oZmFsc2UpO1xuICAgIGlmIChuZXh0RGlyZWN0aXZlQ29uc3RydWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY3VycmVudERpcmVjdGl2ZSA9IHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgY3VycmVudERpcmVjdGl2ZSA9IG5ldyBuZXh0RGlyZWN0aXZlQ29uc3RydWN0b3IocGFydCBhcyBQYXJ0SW5mbyk7XG4gICAgICBjdXJyZW50RGlyZWN0aXZlLl8kaW5pdGlhbGl6ZShwYXJ0LCBwYXJlbnQsIGF0dHJpYnV0ZUluZGV4KTtcbiAgICB9XG4gICAgaWYgKGF0dHJpYnV0ZUluZGV4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICgocGFyZW50IGFzIEF0dHJpYnV0ZVBhcnQpLl9fZGlyZWN0aXZlcyA/Pz0gW10pW2F0dHJpYnV0ZUluZGV4XSA9XG4gICAgICAgIGN1cnJlbnREaXJlY3RpdmU7XG4gICAgfSBlbHNlIHtcbiAgICAgIChwYXJlbnQgYXMgQ2hpbGRQYXJ0IHwgRGlyZWN0aXZlKS5fX2RpcmVjdGl2ZSA9IGN1cnJlbnREaXJlY3RpdmU7XG4gICAgfVxuICB9XG4gIGlmIChjdXJyZW50RGlyZWN0aXZlICE9PSB1bmRlZmluZWQpIHtcbiAgICB2YWx1ZSA9IHJlc29sdmVEaXJlY3RpdmUoXG4gICAgICBwYXJ0LFxuICAgICAgY3VycmVudERpcmVjdGl2ZS5fJHJlc29sdmUocGFydCwgKHZhbHVlIGFzIERpcmVjdGl2ZVJlc3VsdCkudmFsdWVzKSxcbiAgICAgIGN1cnJlbnREaXJlY3RpdmUsXG4gICAgICBhdHRyaWJ1dGVJbmRleFxuICAgICk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5leHBvcnQgdHlwZSB7VGVtcGxhdGVJbnN0YW5jZX07XG4vKipcbiAqIEFuIHVwZGF0ZWFibGUgaW5zdGFuY2Ugb2YgYSBUZW1wbGF0ZS4gSG9sZHMgcmVmZXJlbmNlcyB0byB0aGUgUGFydHMgdXNlZCB0b1xuICogdXBkYXRlIHRoZSB0ZW1wbGF0ZSBpbnN0YW5jZS5cbiAqL1xuY2xhc3MgVGVtcGxhdGVJbnN0YW5jZSBpbXBsZW1lbnRzIERpc2Nvbm5lY3RhYmxlIHtcbiAgXyR0ZW1wbGF0ZTogVGVtcGxhdGU7XG4gIF8kcGFydHM6IEFycmF5PFBhcnQgfCB1bmRlZmluZWQ+ID0gW107XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHBhcmVudDogQ2hpbGRQYXJ0O1xuICAvKiogQGludGVybmFsICovXG4gIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT4gPSB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IodGVtcGxhdGU6IFRlbXBsYXRlLCBwYXJlbnQ6IENoaWxkUGFydCkge1xuICAgIHRoaXMuXyR0ZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICAgIHRoaXMuXyRwYXJlbnQgPSBwYXJlbnQ7XG4gIH1cblxuICAvLyBDYWxsZWQgYnkgQ2hpbGRQYXJ0IHBhcmVudE5vZGUgZ2V0dGVyXG4gIGdldCBwYXJlbnROb2RlKCkge1xuICAgIHJldHVybiB0aGlzLl8kcGFyZW50LnBhcmVudE5vZGU7XG4gIH1cblxuICAvLyBTZWUgY29tbWVudCBpbiBEaXNjb25uZWN0YWJsZSBpbnRlcmZhY2UgZm9yIHdoeSB0aGlzIGlzIGEgZ2V0dGVyXG4gIGdldCBfJGlzQ29ubmVjdGVkKCkge1xuICAgIHJldHVybiB0aGlzLl8kcGFyZW50Ll8kaXNDb25uZWN0ZWQ7XG4gIH1cblxuICAvLyBUaGlzIG1ldGhvZCBpcyBzZXBhcmF0ZSBmcm9tIHRoZSBjb25zdHJ1Y3RvciBiZWNhdXNlIHdlIG5lZWQgdG8gcmV0dXJuIGFcbiAgLy8gRG9jdW1lbnRGcmFnbWVudCBhbmQgd2UgZG9uJ3Qgd2FudCB0byBob2xkIG9udG8gaXQgd2l0aCBhbiBpbnN0YW5jZSBmaWVsZC5cbiAgX2Nsb25lKG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQpIHtcbiAgICBjb25zdCB7XG4gICAgICBlbDoge2NvbnRlbnR9LFxuICAgICAgcGFydHM6IHBhcnRzLFxuICAgIH0gPSB0aGlzLl8kdGVtcGxhdGU7XG4gICAgY29uc3QgZnJhZ21lbnQgPSAob3B0aW9ucz8uY3JlYXRpb25TY29wZSA/PyBkKS5pbXBvcnROb2RlKGNvbnRlbnQsIHRydWUpO1xuICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IGZyYWdtZW50O1xuXG4gICAgbGV0IG5vZGUgPSB3YWxrZXIubmV4dE5vZGUoKSE7XG4gICAgbGV0IG5vZGVJbmRleCA9IDA7XG4gICAgbGV0IHBhcnRJbmRleCA9IDA7XG4gICAgbGV0IHRlbXBsYXRlUGFydCA9IHBhcnRzWzBdO1xuXG4gICAgd2hpbGUgKHRlbXBsYXRlUGFydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAobm9kZUluZGV4ID09PSB0ZW1wbGF0ZVBhcnQuaW5kZXgpIHtcbiAgICAgICAgbGV0IHBhcnQ6IFBhcnQgfCB1bmRlZmluZWQ7XG4gICAgICAgIGlmICh0ZW1wbGF0ZVBhcnQudHlwZSA9PT0gQ0hJTERfUEFSVCkge1xuICAgICAgICAgIHBhcnQgPSBuZXcgQ2hpbGRQYXJ0KFxuICAgICAgICAgICAgbm9kZSBhcyBIVE1MRWxlbWVudCxcbiAgICAgICAgICAgIG5vZGUubmV4dFNpYmxpbmcsXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgb3B0aW9uc1xuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAodGVtcGxhdGVQYXJ0LnR5cGUgPT09IEFUVFJJQlVURV9QQVJUKSB7XG4gICAgICAgICAgcGFydCA9IG5ldyB0ZW1wbGF0ZVBhcnQuY3RvcihcbiAgICAgICAgICAgIG5vZGUgYXMgSFRNTEVsZW1lbnQsXG4gICAgICAgICAgICB0ZW1wbGF0ZVBhcnQubmFtZSxcbiAgICAgICAgICAgIHRlbXBsYXRlUGFydC5zdHJpbmdzLFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgIG9wdGlvbnNcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlUGFydC50eXBlID09PSBFTEVNRU5UX1BBUlQpIHtcbiAgICAgICAgICBwYXJ0ID0gbmV3IEVsZW1lbnRQYXJ0KG5vZGUgYXMgSFRNTEVsZW1lbnQsIHRoaXMsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuXyRwYXJ0cy5wdXNoKHBhcnQpO1xuICAgICAgICB0ZW1wbGF0ZVBhcnQgPSBwYXJ0c1srK3BhcnRJbmRleF07XG4gICAgICB9XG4gICAgICBpZiAobm9kZUluZGV4ICE9PSB0ZW1wbGF0ZVBhcnQ/LmluZGV4KSB7XG4gICAgICAgIG5vZGUgPSB3YWxrZXIubmV4dE5vZGUoKSE7XG4gICAgICAgIG5vZGVJbmRleCsrO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBXZSBuZWVkIHRvIHNldCB0aGUgY3VycmVudE5vZGUgYXdheSBmcm9tIHRoZSBjbG9uZWQgdHJlZSBzbyB0aGF0IHdlXG4gICAgLy8gZG9uJ3QgaG9sZCBvbnRvIHRoZSB0cmVlIGV2ZW4gaWYgdGhlIHRyZWUgaXMgZGV0YWNoZWQgYW5kIHNob3VsZCBiZVxuICAgIC8vIGZyZWVkLlxuICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IGQ7XG4gICAgcmV0dXJuIGZyYWdtZW50O1xuICB9XG5cbiAgX3VwZGF0ZSh2YWx1ZXM6IEFycmF5PHVua25vd24+KSB7XG4gICAgbGV0IGkgPSAwO1xuICAgIGZvciAoY29uc3QgcGFydCBvZiB0aGlzLl8kcGFydHMpIHtcbiAgICAgIGlmIChwYXJ0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZGVidWdMb2dFdmVudCAmJlxuICAgICAgICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAgICAgICAga2luZDogJ3NldCBwYXJ0JyxcbiAgICAgICAgICAgIHBhcnQsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWVzW2ldLFxuICAgICAgICAgICAgdmFsdWVJbmRleDogaSxcbiAgICAgICAgICAgIHZhbHVlcyxcbiAgICAgICAgICAgIHRlbXBsYXRlSW5zdGFuY2U6IHRoaXMsXG4gICAgICAgICAgfSk7XG4gICAgICAgIGlmICgocGFydCBhcyBBdHRyaWJ1dGVQYXJ0KS5zdHJpbmdzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAocGFydCBhcyBBdHRyaWJ1dGVQYXJ0KS5fJHNldFZhbHVlKHZhbHVlcywgcGFydCBhcyBBdHRyaWJ1dGVQYXJ0LCBpKTtcbiAgICAgICAgICAvLyBUaGUgbnVtYmVyIG9mIHZhbHVlcyB0aGUgcGFydCBjb25zdW1lcyBpcyBwYXJ0LnN0cmluZ3MubGVuZ3RoIC0gMVxuICAgICAgICAgIC8vIHNpbmNlIHZhbHVlcyBhcmUgaW4gYmV0d2VlbiB0ZW1wbGF0ZSBzcGFucy4gV2UgaW5jcmVtZW50IGkgYnkgMVxuICAgICAgICAgIC8vIGxhdGVyIGluIHRoZSBsb29wLCBzbyBpbmNyZW1lbnQgaXQgYnkgcGFydC5zdHJpbmdzLmxlbmd0aCAtIDIgaGVyZVxuICAgICAgICAgIGkgKz0gKHBhcnQgYXMgQXR0cmlidXRlUGFydCkuc3RyaW5ncyEubGVuZ3RoIC0gMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwYXJ0Ll8kc2V0VmFsdWUodmFsdWVzW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaSsrO1xuICAgIH1cbiAgfVxufVxuXG4vKlxuICogUGFydHNcbiAqL1xudHlwZSBBdHRyaWJ1dGVUZW1wbGF0ZVBhcnQgPSB7XG4gIHJlYWRvbmx5IHR5cGU6IHR5cGVvZiBBVFRSSUJVVEVfUEFSVDtcbiAgcmVhZG9ubHkgaW5kZXg6IG51bWJlcjtcbiAgcmVhZG9ubHkgbmFtZTogc3RyaW5nO1xuICByZWFkb25seSBjdG9yOiB0eXBlb2YgQXR0cmlidXRlUGFydDtcbiAgcmVhZG9ubHkgc3RyaW5nczogUmVhZG9ubHlBcnJheTxzdHJpbmc+O1xufTtcbnR5cGUgQ2hpbGRUZW1wbGF0ZVBhcnQgPSB7XG4gIHJlYWRvbmx5IHR5cGU6IHR5cGVvZiBDSElMRF9QQVJUO1xuICByZWFkb25seSBpbmRleDogbnVtYmVyO1xufTtcbnR5cGUgRWxlbWVudFRlbXBsYXRlUGFydCA9IHtcbiAgcmVhZG9ubHkgdHlwZTogdHlwZW9mIEVMRU1FTlRfUEFSVDtcbiAgcmVhZG9ubHkgaW5kZXg6IG51bWJlcjtcbn07XG50eXBlIENvbW1lbnRUZW1wbGF0ZVBhcnQgPSB7XG4gIHJlYWRvbmx5IHR5cGU6IHR5cGVvZiBDT01NRU5UX1BBUlQ7XG4gIHJlYWRvbmx5IGluZGV4OiBudW1iZXI7XG59O1xuXG4vKipcbiAqIEEgVGVtcGxhdGVQYXJ0IHJlcHJlc2VudHMgYSBkeW5hbWljIHBhcnQgaW4gYSB0ZW1wbGF0ZSwgYmVmb3JlIHRoZSB0ZW1wbGF0ZVxuICogaXMgaW5zdGFudGlhdGVkLiBXaGVuIGEgdGVtcGxhdGUgaXMgaW5zdGFudGlhdGVkIFBhcnRzIGFyZSBjcmVhdGVkIGZyb21cbiAqIFRlbXBsYXRlUGFydHMuXG4gKi9cbnR5cGUgVGVtcGxhdGVQYXJ0ID1cbiAgfCBDaGlsZFRlbXBsYXRlUGFydFxuICB8IEF0dHJpYnV0ZVRlbXBsYXRlUGFydFxuICB8IEVsZW1lbnRUZW1wbGF0ZVBhcnRcbiAgfCBDb21tZW50VGVtcGxhdGVQYXJ0O1xuXG5leHBvcnQgdHlwZSBQYXJ0ID1cbiAgfCBDaGlsZFBhcnRcbiAgfCBBdHRyaWJ1dGVQYXJ0XG4gIHwgUHJvcGVydHlQYXJ0XG4gIHwgQm9vbGVhbkF0dHJpYnV0ZVBhcnRcbiAgfCBFbGVtZW50UGFydFxuICB8IEV2ZW50UGFydDtcblxuZXhwb3J0IHR5cGUge0NoaWxkUGFydH07XG5jbGFzcyBDaGlsZFBhcnQgaW1wbGVtZW50cyBEaXNjb25uZWN0YWJsZSB7XG4gIHJlYWRvbmx5IHR5cGUgPSBDSElMRF9QQVJUO1xuICByZWFkb25seSBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICBfJGNvbW1pdHRlZFZhbHVlOiB1bmtub3duID0gbm90aGluZztcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfX2RpcmVjdGl2ZT86IERpcmVjdGl2ZTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHN0YXJ0Tm9kZTogQ2hpbGROb2RlO1xuICAvKiogQGludGVybmFsICovXG4gIF8kZW5kTm9kZTogQ2hpbGROb2RlIHwgbnVsbDtcbiAgcHJpdmF0ZSBfdGV4dFNhbml0aXplcjogVmFsdWVTYW5pdGl6ZXIgfCB1bmRlZmluZWQ7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlIHwgdW5kZWZpbmVkO1xuICAvKipcbiAgICogQ29ubmVjdGlvbiBzdGF0ZSBmb3IgUm9vdFBhcnRzIG9ubHkgKGkuZS4gQ2hpbGRQYXJ0IHdpdGhvdXQgXyRwYXJlbnRcbiAgICogcmV0dXJuZWQgZnJvbSB0b3AtbGV2ZWwgYHJlbmRlcmApLiBUaGlzIGZpZWxkIGlzIHVudXNlZCBvdGhlcndpc2UuIFRoZVxuICAgKiBpbnRlbnRpb24gd291bGQgYmUgY2xlYXJlciBpZiB3ZSBtYWRlIGBSb290UGFydGAgYSBzdWJjbGFzcyBvZiBgQ2hpbGRQYXJ0YFxuICAgKiB3aXRoIHRoaXMgZmllbGQgKGFuZCBhIGRpZmZlcmVudCBfJGlzQ29ubmVjdGVkIGdldHRlciksIGJ1dCB0aGUgc3ViY2xhc3NcbiAgICogY2F1c2VkIGEgcGVyZiByZWdyZXNzaW9uLCBwb3NzaWJseSBkdWUgdG8gbWFraW5nIGNhbGwgc2l0ZXMgcG9seW1vcnBoaWMuXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgX19pc0Nvbm5lY3RlZDogYm9vbGVhbjtcblxuICAvLyBTZWUgY29tbWVudCBpbiBEaXNjb25uZWN0YWJsZSBpbnRlcmZhY2UgZm9yIHdoeSB0aGlzIGlzIGEgZ2V0dGVyXG4gIGdldCBfJGlzQ29ubmVjdGVkKCkge1xuICAgIC8vIENoaWxkUGFydHMgdGhhdCBhcmUgbm90IGF0IHRoZSByb290IHNob3VsZCBhbHdheXMgYmUgY3JlYXRlZCB3aXRoIGFcbiAgICAvLyBwYXJlbnQ7IG9ubHkgUm9vdENoaWxkTm9kZSdzIHdvbid0LCBzbyB0aGV5IHJldHVybiB0aGUgbG9jYWwgaXNDb25uZWN0ZWRcbiAgICAvLyBzdGF0ZVxuICAgIHJldHVybiB0aGlzLl8kcGFyZW50Py5fJGlzQ29ubmVjdGVkID8/IHRoaXMuX19pc0Nvbm5lY3RlZDtcbiAgfVxuXG4gIC8vIFRoZSBmb2xsb3dpbmcgZmllbGRzIHdpbGwgYmUgcGF0Y2hlZCBvbnRvIENoaWxkUGFydHMgd2hlbiByZXF1aXJlZCBieVxuICAvLyBBc3luY0RpcmVjdGl2ZVxuICAvKiogQGludGVybmFsICovXG4gIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT4gPSB1bmRlZmluZWQ7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZD8oXG4gICAgaXNDb25uZWN0ZWQ6IGJvb2xlYW4sXG4gICAgcmVtb3ZlRnJvbVBhcmVudD86IGJvb2xlYW4sXG4gICAgZnJvbT86IG51bWJlclxuICApOiB2b2lkO1xuICAvKiogQGludGVybmFsICovXG4gIF8kcmVwYXJlbnREaXNjb25uZWN0YWJsZXM/KHBhcmVudDogRGlzY29ubmVjdGFibGUpOiB2b2lkO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHN0YXJ0Tm9kZTogQ2hpbGROb2RlLFxuICAgIGVuZE5vZGU6IENoaWxkTm9kZSB8IG51bGwsXG4gICAgcGFyZW50OiBUZW1wbGF0ZUluc3RhbmNlIHwgQ2hpbGRQYXJ0IHwgdW5kZWZpbmVkLFxuICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgdGhpcy5fJHN0YXJ0Tm9kZSA9IHN0YXJ0Tm9kZTtcbiAgICB0aGlzLl8kZW5kTm9kZSA9IGVuZE5vZGU7XG4gICAgdGhpcy5fJHBhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIC8vIE5vdGUgX19pc0Nvbm5lY3RlZCBpcyBvbmx5IGV2ZXIgYWNjZXNzZWQgb24gUm9vdFBhcnRzIChpLmUuIHdoZW4gdGhlcmUgaXNcbiAgICAvLyBubyBfJHBhcmVudCk7IHRoZSB2YWx1ZSBvbiBhIG5vbi1yb290LXBhcnQgaXMgXCJkb24ndCBjYXJlXCIsIGJ1dCBjaGVja2luZ1xuICAgIC8vIGZvciBwYXJlbnQgd291bGQgYmUgbW9yZSBjb2RlXG4gICAgdGhpcy5fX2lzQ29ubmVjdGVkID0gb3B0aW9ucz8uaXNDb25uZWN0ZWQgPz8gdHJ1ZTtcbiAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICAvLyBFeHBsaWNpdGx5IGluaXRpYWxpemUgZm9yIGNvbnNpc3RlbnQgY2xhc3Mgc2hhcGUuXG4gICAgICB0aGlzLl90ZXh0U2FuaXRpemVyID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgcGFyZW50IG5vZGUgaW50byB3aGljaCB0aGUgcGFydCByZW5kZXJzIGl0cyBjb250ZW50LlxuICAgKlxuICAgKiBBIENoaWxkUGFydCdzIGNvbnRlbnQgY29uc2lzdHMgb2YgYSByYW5nZSBvZiBhZGphY2VudCBjaGlsZCBub2RlcyBvZlxuICAgKiBgLnBhcmVudE5vZGVgLCBwb3NzaWJseSBib3JkZXJlZCBieSAnbWFya2VyIG5vZGVzJyAoYC5zdGFydE5vZGVgIGFuZFxuICAgKiBgLmVuZE5vZGVgKS5cbiAgICpcbiAgICogLSBJZiBib3RoIGAuc3RhcnROb2RlYCBhbmQgYC5lbmROb2RlYCBhcmUgbm9uLW51bGwsIHRoZW4gdGhlIHBhcnQncyBjb250ZW50XG4gICAqIGNvbnNpc3RzIG9mIGFsbCBzaWJsaW5ncyBiZXR3ZWVuIGAuc3RhcnROb2RlYCBhbmQgYC5lbmROb2RlYCwgZXhjbHVzaXZlbHkuXG4gICAqXG4gICAqIC0gSWYgYC5zdGFydE5vZGVgIGlzIG5vbi1udWxsIGJ1dCBgLmVuZE5vZGVgIGlzIG51bGwsIHRoZW4gdGhlIHBhcnQnc1xuICAgKiBjb250ZW50IGNvbnNpc3RzIG9mIGFsbCBzaWJsaW5ncyBmb2xsb3dpbmcgYC5zdGFydE5vZGVgLCB1cCB0byBhbmRcbiAgICogaW5jbHVkaW5nIHRoZSBsYXN0IGNoaWxkIG9mIGAucGFyZW50Tm9kZWAuIElmIGAuZW5kTm9kZWAgaXMgbm9uLW51bGwsIHRoZW5cbiAgICogYC5zdGFydE5vZGVgIHdpbGwgYWx3YXlzIGJlIG5vbi1udWxsLlxuICAgKlxuICAgKiAtIElmIGJvdGggYC5lbmROb2RlYCBhbmQgYC5zdGFydE5vZGVgIGFyZSBudWxsLCB0aGVuIHRoZSBwYXJ0J3MgY29udGVudFxuICAgKiBjb25zaXN0cyBvZiBhbGwgY2hpbGQgbm9kZXMgb2YgYC5wYXJlbnROb2RlYC5cbiAgICovXG4gIGdldCBwYXJlbnROb2RlKCk6IE5vZGUge1xuICAgIGxldCBwYXJlbnROb2RlOiBOb2RlID0gd3JhcCh0aGlzLl8kc3RhcnROb2RlKS5wYXJlbnROb2RlITtcbiAgICBjb25zdCBwYXJlbnQgPSB0aGlzLl8kcGFyZW50O1xuICAgIGlmIChcbiAgICAgIHBhcmVudCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICBwYXJlbnROb2RlPy5ub2RlVHlwZSA9PT0gMTEgLyogTm9kZS5ET0NVTUVOVF9GUkFHTUVOVCAqL1xuICAgICkge1xuICAgICAgLy8gSWYgdGhlIHBhcmVudE5vZGUgaXMgYSBEb2N1bWVudEZyYWdtZW50LCBpdCBtYXkgYmUgYmVjYXVzZSB0aGUgRE9NIGlzXG4gICAgICAvLyBzdGlsbCBpbiB0aGUgY2xvbmVkIGZyYWdtZW50IGR1cmluZyBpbml0aWFsIHJlbmRlcjsgaWYgc28sIGdldCB0aGUgcmVhbFxuICAgICAgLy8gcGFyZW50Tm9kZSB0aGUgcGFydCB3aWxsIGJlIGNvbW1pdHRlZCBpbnRvIGJ5IGFza2luZyB0aGUgcGFyZW50LlxuICAgICAgcGFyZW50Tm9kZSA9IChwYXJlbnQgYXMgQ2hpbGRQYXJ0IHwgVGVtcGxhdGVJbnN0YW5jZSkucGFyZW50Tm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcmVudE5vZGU7XG4gIH1cblxuICAvKipcbiAgICogVGhlIHBhcnQncyBsZWFkaW5nIG1hcmtlciBub2RlLCBpZiBhbnkuIFNlZSBgLnBhcmVudE5vZGVgIGZvciBtb3JlXG4gICAqIGluZm9ybWF0aW9uLlxuICAgKi9cbiAgZ2V0IHN0YXJ0Tm9kZSgpOiBOb2RlIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuXyRzdGFydE5vZGU7XG4gIH1cblxuICAvKipcbiAgICogVGhlIHBhcnQncyB0cmFpbGluZyBtYXJrZXIgbm9kZSwgaWYgYW55LiBTZWUgYC5wYXJlbnROb2RlYCBmb3IgbW9yZVxuICAgKiBpbmZvcm1hdGlvbi5cbiAgICovXG4gIGdldCBlbmROb2RlKCk6IE5vZGUgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5fJGVuZE5vZGU7XG4gIH1cblxuICBfJHNldFZhbHVlKHZhbHVlOiB1bmtub3duLCBkaXJlY3RpdmVQYXJlbnQ6IERpcmVjdGl2ZVBhcmVudCA9IHRoaXMpOiB2b2lkIHtcbiAgICBpZiAoREVWX01PREUgJiYgdGhpcy5wYXJlbnROb2RlID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBUaGlzIFxcYENoaWxkUGFydFxcYCBoYXMgbm8gXFxgcGFyZW50Tm9kZVxcYCBhbmQgdGhlcmVmb3JlIGNhbm5vdCBhY2NlcHQgYSB2YWx1ZS4gVGhpcyBsaWtlbHkgbWVhbnMgdGhlIGVsZW1lbnQgY29udGFpbmluZyB0aGUgcGFydCB3YXMgbWFuaXB1bGF0ZWQgaW4gYW4gdW5zdXBwb3J0ZWQgd2F5IG91dHNpZGUgb2YgTGl0J3MgY29udHJvbCBzdWNoIHRoYXQgdGhlIHBhcnQncyBtYXJrZXIgbm9kZXMgd2VyZSBlamVjdGVkIGZyb20gRE9NLiBGb3IgZXhhbXBsZSwgc2V0dGluZyB0aGUgZWxlbWVudCdzIFxcYGlubmVySFRNTFxcYCBvciBcXGB0ZXh0Q29udGVudFxcYCBjYW4gZG8gdGhpcy5gXG4gICAgICApO1xuICAgIH1cbiAgICB2YWx1ZSA9IHJlc29sdmVEaXJlY3RpdmUodGhpcywgdmFsdWUsIGRpcmVjdGl2ZVBhcmVudCk7XG4gICAgaWYgKGlzUHJpbWl0aXZlKHZhbHVlKSkge1xuICAgICAgLy8gTm9uLXJlbmRlcmluZyBjaGlsZCB2YWx1ZXMuIEl0J3MgaW1wb3J0YW50IHRoYXQgdGhlc2UgZG8gbm90IHJlbmRlclxuICAgICAgLy8gZW1wdHkgdGV4dCBub2RlcyB0byBhdm9pZCBpc3N1ZXMgd2l0aCBwcmV2ZW50aW5nIGRlZmF1bHQgPHNsb3Q+XG4gICAgICAvLyBmYWxsYmFjayBjb250ZW50LlxuICAgICAgaWYgKHZhbHVlID09PSBub3RoaW5nIHx8IHZhbHVlID09IG51bGwgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgICAgIGlmICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgIT09IG5vdGhpbmcpIHtcbiAgICAgICAgICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgICAgICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAgICAgICAga2luZDogJ2NvbW1pdCBub3RoaW5nIHRvIGNoaWxkJyxcbiAgICAgICAgICAgICAgc3RhcnQ6IHRoaXMuXyRzdGFydE5vZGUsXG4gICAgICAgICAgICAgIGVuZDogdGhpcy5fJGVuZE5vZGUsXG4gICAgICAgICAgICAgIHBhcmVudDogdGhpcy5fJHBhcmVudCxcbiAgICAgICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgdGhpcy5fJGNsZWFyKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gbm90aGluZztcbiAgICAgIH0gZWxzZSBpZiAodmFsdWUgIT09IHRoaXMuXyRjb21taXR0ZWRWYWx1ZSAmJiB2YWx1ZSAhPT0gbm9DaGFuZ2UpIHtcbiAgICAgICAgdGhpcy5fY29tbWl0VGV4dCh2YWx1ZSk7XG4gICAgICB9XG4gICAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIH0gZWxzZSBpZiAoKHZhbHVlIGFzIFRlbXBsYXRlUmVzdWx0KVsnXyRsaXRUeXBlJCddICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX2NvbW1pdFRlbXBsYXRlUmVzdWx0KHZhbHVlIGFzIFRlbXBsYXRlUmVzdWx0KTtcbiAgICB9IGVsc2UgaWYgKCh2YWx1ZSBhcyBOb2RlKS5ub2RlVHlwZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoREVWX01PREUgJiYgdGhpcy5vcHRpb25zPy5ob3N0ID09PSB2YWx1ZSkge1xuICAgICAgICB0aGlzLl9jb21taXRUZXh0KFxuICAgICAgICAgIGBbcHJvYmFibGUgbWlzdGFrZTogcmVuZGVyZWQgYSB0ZW1wbGF0ZSdzIGhvc3QgaW4gaXRzZWxmIGAgK1xuICAgICAgICAgICAgYChjb21tb25seSBjYXVzZWQgYnkgd3JpdGluZyBcXCR7dGhpc30gaW4gYSB0ZW1wbGF0ZV1gXG4gICAgICAgICk7XG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICBgQXR0ZW1wdGVkIHRvIHJlbmRlciB0aGUgdGVtcGxhdGUgaG9zdGAsXG4gICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgYGluc2lkZSBpdHNlbGYuIFRoaXMgaXMgYWxtb3N0IGFsd2F5cyBhIG1pc3Rha2UsIGFuZCBpbiBkZXYgbW9kZSBgLFxuICAgICAgICAgIGB3ZSByZW5kZXIgc29tZSB3YXJuaW5nIHRleHQuIEluIHByb2R1Y3Rpb24gaG93ZXZlciwgd2UnbGwgYCxcbiAgICAgICAgICBgcmVuZGVyIGl0LCB3aGljaCB3aWxsIHVzdWFsbHkgcmVzdWx0IGluIGFuIGVycm9yLCBhbmQgc29tZXRpbWVzIGAsXG4gICAgICAgICAgYGluIHRoZSBlbGVtZW50IGRpc2FwcGVhcmluZyBmcm9tIHRoZSBET00uYFxuICAgICAgICApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLl9jb21taXROb2RlKHZhbHVlIGFzIE5vZGUpO1xuICAgIH0gZWxzZSBpZiAoaXNJdGVyYWJsZSh2YWx1ZSkpIHtcbiAgICAgIHRoaXMuX2NvbW1pdEl0ZXJhYmxlKHZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRmFsbGJhY2ssIHdpbGwgcmVuZGVyIHRoZSBzdHJpbmcgcmVwcmVzZW50YXRpb25cbiAgICAgIHRoaXMuX2NvbW1pdFRleHQodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2luc2VydDxUIGV4dGVuZHMgTm9kZT4obm9kZTogVCkge1xuICAgIHJldHVybiB3cmFwKHdyYXAodGhpcy5fJHN0YXJ0Tm9kZSkucGFyZW50Tm9kZSEpLmluc2VydEJlZm9yZShcbiAgICAgIG5vZGUsXG4gICAgICB0aGlzLl8kZW5kTm9kZVxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIF9jb21taXROb2RlKHZhbHVlOiBOb2RlKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgIHRoaXMuXyRjbGVhcigpO1xuICAgICAgaWYgKFxuICAgICAgICBFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MgJiZcbiAgICAgICAgc2FuaXRpemVyRmFjdG9yeUludGVybmFsICE9PSBub29wU2FuaXRpemVyXG4gICAgICApIHtcbiAgICAgICAgY29uc3QgcGFyZW50Tm9kZU5hbWUgPSB0aGlzLl8kc3RhcnROb2RlLnBhcmVudE5vZGU/Lm5vZGVOYW1lO1xuICAgICAgICBpZiAocGFyZW50Tm9kZU5hbWUgPT09ICdTVFlMRScgfHwgcGFyZW50Tm9kZU5hbWUgPT09ICdTQ1JJUFQnKSB7XG4gICAgICAgICAgbGV0IG1lc3NhZ2UgPSAnRm9yYmlkZGVuJztcbiAgICAgICAgICBpZiAoREVWX01PREUpIHtcbiAgICAgICAgICAgIGlmIChwYXJlbnROb2RlTmFtZSA9PT0gJ1NUWUxFJykge1xuICAgICAgICAgICAgICBtZXNzYWdlID1cbiAgICAgICAgICAgICAgICBgTGl0IGRvZXMgbm90IHN1cHBvcnQgYmluZGluZyBpbnNpZGUgc3R5bGUgbm9kZXMuIGAgK1xuICAgICAgICAgICAgICAgIGBUaGlzIGlzIGEgc2VjdXJpdHkgcmlzaywgYXMgc3R5bGUgaW5qZWN0aW9uIGF0dGFja3MgY2FuIGAgK1xuICAgICAgICAgICAgICAgIGBleGZpbHRyYXRlIGRhdGEgYW5kIHNwb29mIFVJcy4gYCArXG4gICAgICAgICAgICAgICAgYENvbnNpZGVyIGluc3RlYWQgdXNpbmcgY3NzXFxgLi4uXFxgIGxpdGVyYWxzIGAgK1xuICAgICAgICAgICAgICAgIGB0byBjb21wb3NlIHN0eWxlcywgYW5kIGRvIGR5bmFtaWMgc3R5bGluZyB3aXRoIGAgK1xuICAgICAgICAgICAgICAgIGBjc3MgY3VzdG9tIHByb3BlcnRpZXMsIDo6cGFydHMsIDxzbG90PnMsIGAgK1xuICAgICAgICAgICAgICAgIGBhbmQgYnkgbXV0YXRpbmcgdGhlIERPTSByYXRoZXIgdGhhbiBzdHlsZXNoZWV0cy5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbWVzc2FnZSA9XG4gICAgICAgICAgICAgICAgYExpdCBkb2VzIG5vdCBzdXBwb3J0IGJpbmRpbmcgaW5zaWRlIHNjcmlwdCBub2Rlcy4gYCArXG4gICAgICAgICAgICAgICAgYFRoaXMgaXMgYSBzZWN1cml0eSByaXNrLCBhcyBpdCBjb3VsZCBhbGxvdyBhcmJpdHJhcnkgYCArXG4gICAgICAgICAgICAgICAgYGNvZGUgZXhlY3V0aW9uLmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZGVidWdMb2dFdmVudCAmJlxuICAgICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAgICBraW5kOiAnY29tbWl0IG5vZGUnLFxuICAgICAgICAgIHN0YXJ0OiB0aGlzLl8kc3RhcnROb2RlLFxuICAgICAgICAgIHBhcmVudDogdGhpcy5fJHBhcmVudCxcbiAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICB9KTtcbiAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IHRoaXMuX2luc2VydCh2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfY29tbWl0VGV4dCh2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIC8vIElmIHRoZSBjb21taXR0ZWQgdmFsdWUgaXMgYSBwcmltaXRpdmUgaXQgbWVhbnMgd2UgY2FsbGVkIF9jb21taXRUZXh0IG9uXG4gICAgLy8gdGhlIHByZXZpb3VzIHJlbmRlciwgYW5kIHdlIGtub3cgdGhhdCB0aGlzLl8kc3RhcnROb2RlLm5leHRTaWJsaW5nIGlzIGFcbiAgICAvLyBUZXh0IG5vZGUuIFdlIGNhbiBub3cganVzdCByZXBsYWNlIHRoZSB0ZXh0IGNvbnRlbnQgKC5kYXRhKSBvZiB0aGUgbm9kZS5cbiAgICBpZiAoXG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgIT09IG5vdGhpbmcgJiZcbiAgICAgIGlzUHJpbWl0aXZlKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSlcbiAgICApIHtcbiAgICAgIGNvbnN0IG5vZGUgPSB3cmFwKHRoaXMuXyRzdGFydE5vZGUpLm5leHRTaWJsaW5nIGFzIFRleHQ7XG4gICAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICAgIGlmICh0aGlzLl90ZXh0U2FuaXRpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aGlzLl90ZXh0U2FuaXRpemVyID0gY3JlYXRlU2FuaXRpemVyKG5vZGUsICdkYXRhJywgJ3Byb3BlcnR5Jyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWUgPSB0aGlzLl90ZXh0U2FuaXRpemVyKHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgICAgZGVidWdMb2dFdmVudCh7XG4gICAgICAgICAga2luZDogJ2NvbW1pdCB0ZXh0JyxcbiAgICAgICAgICBub2RlLFxuICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgfSk7XG4gICAgICAobm9kZSBhcyBUZXh0KS5kYXRhID0gdmFsdWUgYXMgc3RyaW5nO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICAgIGNvbnN0IHRleHROb2RlID0gZC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICAgIHRoaXMuX2NvbW1pdE5vZGUodGV4dE5vZGUpO1xuICAgICAgICAvLyBXaGVuIHNldHRpbmcgdGV4dCBjb250ZW50LCBmb3Igc2VjdXJpdHkgcHVycG9zZXMgaXQgbWF0dGVycyBhIGxvdFxuICAgICAgICAvLyB3aGF0IHRoZSBwYXJlbnQgaXMuIEZvciBleGFtcGxlLCA8c3R5bGU+IGFuZCA8c2NyaXB0PiBuZWVkIHRvIGJlXG4gICAgICAgIC8vIGhhbmRsZWQgd2l0aCBjYXJlLCB3aGlsZSA8c3Bhbj4gZG9lcyBub3QuIFNvIGZpcnN0IHdlIG5lZWQgdG8gcHV0IGFcbiAgICAgICAgLy8gdGV4dCBub2RlIGludG8gdGhlIGRvY3VtZW50LCB0aGVuIHdlIGNhbiBzYW5pdGl6ZSBpdHMgY29udGVudC5cbiAgICAgICAgaWYgKHRoaXMuX3RleHRTYW5pdGl6ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRoaXMuX3RleHRTYW5pdGl6ZXIgPSBjcmVhdGVTYW5pdGl6ZXIodGV4dE5vZGUsICdkYXRhJywgJ3Byb3BlcnR5Jyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWUgPSB0aGlzLl90ZXh0U2FuaXRpemVyKHZhbHVlKTtcbiAgICAgICAgZGVidWdMb2dFdmVudCAmJlxuICAgICAgICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAgICAgICAga2luZDogJ2NvbW1pdCB0ZXh0JyxcbiAgICAgICAgICAgIG5vZGU6IHRleHROb2RlLFxuICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgICAgfSk7XG4gICAgICAgIHRleHROb2RlLmRhdGEgPSB2YWx1ZSBhcyBzdHJpbmc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9jb21taXROb2RlKGQuY3JlYXRlVGV4dE5vZGUodmFsdWUgYXMgc3RyaW5nKSk7XG4gICAgICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAgICAgIGtpbmQ6ICdjb21taXQgdGV4dCcsXG4gICAgICAgICAgICBub2RlOiB3cmFwKHRoaXMuXyRzdGFydE5vZGUpLm5leHRTaWJsaW5nIGFzIFRleHQsXG4gICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gdmFsdWU7XG4gIH1cblxuICBwcml2YXRlIF9jb21taXRUZW1wbGF0ZVJlc3VsdChcbiAgICByZXN1bHQ6IFRlbXBsYXRlUmVzdWx0IHwgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdFxuICApOiB2b2lkIHtcbiAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIGNvbnN0IHt2YWx1ZXMsIFsnXyRsaXRUeXBlJCddOiB0eXBlfSA9IHJlc3VsdDtcbiAgICAvLyBJZiAkbGl0VHlwZSQgaXMgYSBudW1iZXIsIHJlc3VsdCBpcyBhIHBsYWluIFRlbXBsYXRlUmVzdWx0IGFuZCB3ZSBnZXRcbiAgICAvLyB0aGUgdGVtcGxhdGUgZnJvbSB0aGUgdGVtcGxhdGUgY2FjaGUuIElmIG5vdCwgcmVzdWx0IGlzIGFcbiAgICAvLyBDb21waWxlZFRlbXBsYXRlUmVzdWx0IGFuZCBfJGxpdFR5cGUkIGlzIGEgQ29tcGlsZWRUZW1wbGF0ZSBhbmQgd2UgbmVlZFxuICAgIC8vIHRvIGNyZWF0ZSB0aGUgPHRlbXBsYXRlPiBlbGVtZW50IHRoZSBmaXJzdCB0aW1lIHdlIHNlZSBpdC5cbiAgICBjb25zdCB0ZW1wbGF0ZTogVGVtcGxhdGUgfCBDb21waWxlZFRlbXBsYXRlID1cbiAgICAgIHR5cGVvZiB0eXBlID09PSAnbnVtYmVyJ1xuICAgICAgICA/IHRoaXMuXyRnZXRUZW1wbGF0ZShyZXN1bHQgYXMgVW5jb21waWxlZFRlbXBsYXRlUmVzdWx0KVxuICAgICAgICA6ICh0eXBlLmVsID09PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgICh0eXBlLmVsID0gVGVtcGxhdGUuY3JlYXRlRWxlbWVudChcbiAgICAgICAgICAgICAgdHJ1c3RGcm9tVGVtcGxhdGVTdHJpbmcodHlwZS5oLCB0eXBlLmhbMF0pLFxuICAgICAgICAgICAgICB0aGlzLm9wdGlvbnNcbiAgICAgICAgICAgICkpLFxuICAgICAgICAgIHR5cGUpO1xuXG4gICAgaWYgKCh0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgVGVtcGxhdGVJbnN0YW5jZSk/Ll8kdGVtcGxhdGUgPT09IHRlbXBsYXRlKSB7XG4gICAgICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSB1cGRhdGluZycsXG4gICAgICAgICAgdGVtcGxhdGUsXG4gICAgICAgICAgaW5zdGFuY2U6IHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBUZW1wbGF0ZUluc3RhbmNlLFxuICAgICAgICAgIHBhcnRzOiAodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIFRlbXBsYXRlSW5zdGFuY2UpLl8kcGFydHMsXG4gICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICAgIHZhbHVlcyxcbiAgICAgICAgfSk7XG4gICAgICAodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIFRlbXBsYXRlSW5zdGFuY2UpLl91cGRhdGUodmFsdWVzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgaW5zdGFuY2UgPSBuZXcgVGVtcGxhdGVJbnN0YW5jZSh0ZW1wbGF0ZSBhcyBUZW1wbGF0ZSwgdGhpcyk7XG4gICAgICBjb25zdCBmcmFnbWVudCA9IGluc3RhbmNlLl9jbG9uZSh0aGlzLm9wdGlvbnMpO1xuICAgICAgZGVidWdMb2dFdmVudCAmJlxuICAgICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAgICBraW5kOiAndGVtcGxhdGUgaW5zdGFudGlhdGVkJyxcbiAgICAgICAgICB0ZW1wbGF0ZSxcbiAgICAgICAgICBpbnN0YW5jZSxcbiAgICAgICAgICBwYXJ0czogaW5zdGFuY2UuXyRwYXJ0cyxcbiAgICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgICAgZnJhZ21lbnQsXG4gICAgICAgICAgdmFsdWVzLFxuICAgICAgICB9KTtcbiAgICAgIGluc3RhbmNlLl91cGRhdGUodmFsdWVzKTtcbiAgICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgICAgZGVidWdMb2dFdmVudCh7XG4gICAgICAgICAga2luZDogJ3RlbXBsYXRlIGluc3RhbnRpYXRlZCBhbmQgdXBkYXRlZCcsXG4gICAgICAgICAgdGVtcGxhdGUsXG4gICAgICAgICAgaW5zdGFuY2UsXG4gICAgICAgICAgcGFydHM6IGluc3RhbmNlLl8kcGFydHMsXG4gICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICAgIGZyYWdtZW50LFxuICAgICAgICAgIHZhbHVlcyxcbiAgICAgICAgfSk7XG4gICAgICB0aGlzLl9jb21taXROb2RlKGZyYWdtZW50KTtcbiAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IGluc3RhbmNlO1xuICAgIH1cbiAgfVxuXG4gIC8vIE92ZXJyaWRkZW4gdmlhIGBsaXRIdG1sUG9seWZpbGxTdXBwb3J0YCB0byBwcm92aWRlIHBsYXRmb3JtIHN1cHBvcnQuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRnZXRUZW1wbGF0ZShyZXN1bHQ6IFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdCkge1xuICAgIGxldCB0ZW1wbGF0ZSA9IHRlbXBsYXRlQ2FjaGUuZ2V0KHJlc3VsdC5zdHJpbmdzKTtcbiAgICBpZiAodGVtcGxhdGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGVtcGxhdGVDYWNoZS5zZXQocmVzdWx0LnN0cmluZ3MsICh0ZW1wbGF0ZSA9IG5ldyBUZW1wbGF0ZShyZXN1bHQpKSk7XG4gICAgfVxuICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbW1pdEl0ZXJhYmxlKHZhbHVlOiBJdGVyYWJsZTx1bmtub3duPik6IHZvaWQge1xuICAgIC8vIEZvciBhbiBJdGVyYWJsZSwgd2UgY3JlYXRlIGEgbmV3IEluc3RhbmNlUGFydCBwZXIgaXRlbSwgdGhlbiBzZXQgaXRzXG4gICAgLy8gdmFsdWUgdG8gdGhlIGl0ZW0uIFRoaXMgaXMgYSBsaXR0bGUgYml0IG9mIG92ZXJoZWFkIGZvciBldmVyeSBpdGVtIGluXG4gICAgLy8gYW4gSXRlcmFibGUsIGJ1dCBpdCBsZXRzIHVzIHJlY3Vyc2UgZWFzaWx5IGFuZCBlZmZpY2llbnRseSB1cGRhdGUgQXJyYXlzXG4gICAgLy8gb2YgVGVtcGxhdGVSZXN1bHRzIHRoYXQgd2lsbCBiZSBjb21tb25seSByZXR1cm5lZCBmcm9tIGV4cHJlc3Npb25zIGxpa2U6XG4gICAgLy8gYXJyYXkubWFwKChpKSA9PiBodG1sYCR7aX1gKSwgYnkgcmV1c2luZyBleGlzdGluZyBUZW1wbGF0ZUluc3RhbmNlcy5cblxuICAgIC8vIElmIHZhbHVlIGlzIGFuIGFycmF5LCB0aGVuIHRoZSBwcmV2aW91cyByZW5kZXIgd2FzIG9mIGFuXG4gICAgLy8gaXRlcmFibGUgYW5kIHZhbHVlIHdpbGwgY29udGFpbiB0aGUgQ2hpbGRQYXJ0cyBmcm9tIHRoZSBwcmV2aW91c1xuICAgIC8vIHJlbmRlci4gSWYgdmFsdWUgaXMgbm90IGFuIGFycmF5LCBjbGVhciB0aGlzIHBhcnQgYW5kIG1ha2UgYSBuZXdcbiAgICAvLyBhcnJheSBmb3IgQ2hpbGRQYXJ0cy5cbiAgICBpZiAoIWlzQXJyYXkodGhpcy5fJGNvbW1pdHRlZFZhbHVlKSkge1xuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gW107XG4gICAgICB0aGlzLl8kY2xlYXIoKTtcbiAgICB9XG5cbiAgICAvLyBMZXRzIHVzIGtlZXAgdHJhY2sgb2YgaG93IG1hbnkgaXRlbXMgd2Ugc3RhbXBlZCBzbyB3ZSBjYW4gY2xlYXIgbGVmdG92ZXJcbiAgICAvLyBpdGVtcyBmcm9tIGEgcHJldmlvdXMgcmVuZGVyXG4gICAgY29uc3QgaXRlbVBhcnRzID0gdGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIENoaWxkUGFydFtdO1xuICAgIGxldCBwYXJ0SW5kZXggPSAwO1xuICAgIGxldCBpdGVtUGFydDogQ2hpbGRQYXJ0IHwgdW5kZWZpbmVkO1xuXG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHZhbHVlKSB7XG4gICAgICBpZiAocGFydEluZGV4ID09PSBpdGVtUGFydHMubGVuZ3RoKSB7XG4gICAgICAgIC8vIElmIG5vIGV4aXN0aW5nIHBhcnQsIGNyZWF0ZSBhIG5ldyBvbmVcbiAgICAgICAgLy8gVE9ETyAoanVzdGluZmFnbmFuaSk6IHRlc3QgcGVyZiBpbXBhY3Qgb2YgYWx3YXlzIGNyZWF0aW5nIHR3byBwYXJ0c1xuICAgICAgICAvLyBpbnN0ZWFkIG9mIHNoYXJpbmcgcGFydHMgYmV0d2VlbiBub2Rlc1xuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbGl0L2xpdC9pc3N1ZXMvMTI2NlxuICAgICAgICBpdGVtUGFydHMucHVzaChcbiAgICAgICAgICAoaXRlbVBhcnQgPSBuZXcgQ2hpbGRQYXJ0KFxuICAgICAgICAgICAgdGhpcy5faW5zZXJ0KGNyZWF0ZU1hcmtlcigpKSxcbiAgICAgICAgICAgIHRoaXMuX2luc2VydChjcmVhdGVNYXJrZXIoKSksXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgdGhpcy5vcHRpb25zXG4gICAgICAgICAgKSlcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFJldXNlIGFuIGV4aXN0aW5nIHBhcnRcbiAgICAgICAgaXRlbVBhcnQgPSBpdGVtUGFydHNbcGFydEluZGV4XTtcbiAgICAgIH1cbiAgICAgIGl0ZW1QYXJ0Ll8kc2V0VmFsdWUoaXRlbSk7XG4gICAgICBwYXJ0SW5kZXgrKztcbiAgICB9XG5cbiAgICBpZiAocGFydEluZGV4IDwgaXRlbVBhcnRzLmxlbmd0aCkge1xuICAgICAgLy8gaXRlbVBhcnRzIGFsd2F5cyBoYXZlIGVuZCBub2Rlc1xuICAgICAgdGhpcy5fJGNsZWFyKFxuICAgICAgICBpdGVtUGFydCAmJiB3cmFwKGl0ZW1QYXJ0Ll8kZW5kTm9kZSEpLm5leHRTaWJsaW5nLFxuICAgICAgICBwYXJ0SW5kZXhcbiAgICAgICk7XG4gICAgICAvLyBUcnVuY2F0ZSB0aGUgcGFydHMgYXJyYXkgc28gX3ZhbHVlIHJlZmxlY3RzIHRoZSBjdXJyZW50IHN0YXRlXG4gICAgICBpdGVtUGFydHMubGVuZ3RoID0gcGFydEluZGV4O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIHRoZSBub2RlcyBjb250YWluZWQgd2l0aGluIHRoaXMgUGFydCBmcm9tIHRoZSBET00uXG4gICAqXG4gICAqIEBwYXJhbSBzdGFydCBTdGFydCBub2RlIHRvIGNsZWFyIGZyb20sIGZvciBjbGVhcmluZyBhIHN1YnNldCBvZiB0aGUgcGFydCdzXG4gICAqICAgICBET00gKHVzZWQgd2hlbiB0cnVuY2F0aW5nIGl0ZXJhYmxlcylcbiAgICogQHBhcmFtIGZyb20gIFdoZW4gYHN0YXJ0YCBpcyBzcGVjaWZpZWQsIHRoZSBpbmRleCB3aXRoaW4gdGhlIGl0ZXJhYmxlIGZyb21cbiAgICogICAgIHdoaWNoIENoaWxkUGFydHMgYXJlIGJlaW5nIHJlbW92ZWQsIHVzZWQgZm9yIGRpc2Nvbm5lY3RpbmcgZGlyZWN0aXZlcyBpblxuICAgKiAgICAgdGhvc2UgUGFydHMuXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgXyRjbGVhcihcbiAgICBzdGFydDogQ2hpbGROb2RlIHwgbnVsbCA9IHdyYXAodGhpcy5fJHN0YXJ0Tm9kZSkubmV4dFNpYmxpbmcsXG4gICAgZnJvbT86IG51bWJlclxuICApIHtcbiAgICB0aGlzLl8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQ/LihmYWxzZSwgdHJ1ZSwgZnJvbSk7XG4gICAgd2hpbGUgKHN0YXJ0ICYmIHN0YXJ0ICE9PSB0aGlzLl8kZW5kTm9kZSkge1xuICAgICAgY29uc3QgbiA9IHdyYXAoc3RhcnQhKS5uZXh0U2libGluZztcbiAgICAgICh3cmFwKHN0YXJ0ISkgYXMgRWxlbWVudCkucmVtb3ZlKCk7XG4gICAgICBzdGFydCA9IG47XG4gICAgfVxuICB9XG4gIC8qKlxuICAgKiBJbXBsZW1lbnRhdGlvbiBvZiBSb290UGFydCdzIGBpc0Nvbm5lY3RlZGAuIE5vdGUgdGhhdCB0aGlzIG1ldGhvZFxuICAgKiBzaG91bGQgb25seSBiZSBjYWxsZWQgb24gYFJvb3RQYXJ0YHMgKHRoZSBgQ2hpbGRQYXJ0YCByZXR1cm5lZCBmcm9tIGFcbiAgICogdG9wLWxldmVsIGByZW5kZXIoKWAgY2FsbCkuIEl0IGhhcyBubyBlZmZlY3Qgb24gbm9uLXJvb3QgQ2hpbGRQYXJ0cy5cbiAgICogQHBhcmFtIGlzQ29ubmVjdGVkIFdoZXRoZXIgdG8gc2V0XG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgc2V0Q29ubmVjdGVkKGlzQ29ubmVjdGVkOiBib29sZWFuKSB7XG4gICAgaWYgKHRoaXMuXyRwYXJlbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fX2lzQ29ubmVjdGVkID0gaXNDb25uZWN0ZWQ7XG4gICAgICB0aGlzLl8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQ/Lihpc0Nvbm5lY3RlZCk7XG4gICAgfSBlbHNlIGlmIChERVZfTU9ERSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAncGFydC5zZXRDb25uZWN0ZWQoKSBtYXkgb25seSBiZSBjYWxsZWQgb24gYSAnICtcbiAgICAgICAgICAnUm9vdFBhcnQgcmV0dXJuZWQgZnJvbSByZW5kZXIoKS4nXG4gICAgICApO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEEgdG9wLWxldmVsIGBDaGlsZFBhcnRgIHJldHVybmVkIGZyb20gYHJlbmRlcmAgdGhhdCBtYW5hZ2VzIHRoZSBjb25uZWN0ZWRcbiAqIHN0YXRlIG9mIGBBc3luY0RpcmVjdGl2ZWBzIGNyZWF0ZWQgdGhyb3VnaG91dCB0aGUgdHJlZSBiZWxvdyBpdC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSb290UGFydCBleHRlbmRzIENoaWxkUGFydCB7XG4gIC8qKlxuICAgKiBTZXRzIHRoZSBjb25uZWN0aW9uIHN0YXRlIGZvciBgQXN5bmNEaXJlY3RpdmVgcyBjb250YWluZWQgd2l0aGluIHRoaXMgcm9vdFxuICAgKiBDaGlsZFBhcnQuXG4gICAqXG4gICAqIGxpdC1odG1sIGRvZXMgbm90IGF1dG9tYXRpY2FsbHkgbW9uaXRvciB0aGUgY29ubmVjdGVkbmVzcyBvZiBET00gcmVuZGVyZWQ7XG4gICAqIGFzIHN1Y2gsIGl0IGlzIHRoZSByZXNwb25zaWJpbGl0eSBvZiB0aGUgY2FsbGVyIHRvIGByZW5kZXJgIHRvIGVuc3VyZSB0aGF0XG4gICAqIGBwYXJ0LnNldENvbm5lY3RlZChmYWxzZSlgIGlzIGNhbGxlZCBiZWZvcmUgdGhlIHBhcnQgb2JqZWN0IGlzIHBvdGVudGlhbGx5XG4gICAqIGRpc2NhcmRlZCwgdG8gZW5zdXJlIHRoYXQgYEFzeW5jRGlyZWN0aXZlYHMgaGF2ZSBhIGNoYW5jZSB0byBkaXNwb3NlIG9mXG4gICAqIGFueSByZXNvdXJjZXMgYmVpbmcgaGVsZC4gSWYgYSBgUm9vdFBhcnRgIHRoYXQgd2FzIHByZXZpb3VzbHlcbiAgICogZGlzY29ubmVjdGVkIGlzIHN1YnNlcXVlbnRseSByZS1jb25uZWN0ZWQgKGFuZCBpdHMgYEFzeW5jRGlyZWN0aXZlYHMgc2hvdWxkXG4gICAqIHJlLWNvbm5lY3QpLCBgc2V0Q29ubmVjdGVkKHRydWUpYCBzaG91bGQgYmUgY2FsbGVkLlxuICAgKlxuICAgKiBAcGFyYW0gaXNDb25uZWN0ZWQgV2hldGhlciBkaXJlY3RpdmVzIHdpdGhpbiB0aGlzIHRyZWUgc2hvdWxkIGJlIGNvbm5lY3RlZFxuICAgKiBvciBub3RcbiAgICovXG4gIHNldENvbm5lY3RlZChpc0Nvbm5lY3RlZDogYm9vbGVhbik6IHZvaWQ7XG59XG5cbmV4cG9ydCB0eXBlIHtBdHRyaWJ1dGVQYXJ0fTtcbmNsYXNzIEF0dHJpYnV0ZVBhcnQgaW1wbGVtZW50cyBEaXNjb25uZWN0YWJsZSB7XG4gIHJlYWRvbmx5IHR5cGU6XG4gICAgfCB0eXBlb2YgQVRUUklCVVRFX1BBUlRcbiAgICB8IHR5cGVvZiBQUk9QRVJUWV9QQVJUXG4gICAgfCB0eXBlb2YgQk9PTEVBTl9BVFRSSUJVVEVfUEFSVFxuICAgIHwgdHlwZW9mIEVWRU5UX1BBUlQgPSBBVFRSSUJVVEVfUEFSVDtcbiAgcmVhZG9ubHkgZWxlbWVudDogSFRNTEVsZW1lbnQ7XG4gIHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogSWYgdGhpcyBhdHRyaWJ1dGUgcGFydCByZXByZXNlbnRzIGFuIGludGVycG9sYXRpb24sIHRoaXMgY29udGFpbnMgdGhlXG4gICAqIHN0YXRpYyBzdHJpbmdzIG9mIHRoZSBpbnRlcnBvbGF0aW9uLiBGb3Igc2luZ2xlLXZhbHVlLCBjb21wbGV0ZSBiaW5kaW5ncyxcbiAgICogdGhpcyBpcyB1bmRlZmluZWQuXG4gICAqL1xuICByZWFkb25seSBzdHJpbmdzPzogUmVhZG9ubHlBcnJheTxzdHJpbmc+O1xuICAvKiogQGludGVybmFsICovXG4gIF8kY29tbWl0dGVkVmFsdWU6IHVua25vd24gfCBBcnJheTx1bmtub3duPiA9IG5vdGhpbmc7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX19kaXJlY3RpdmVzPzogQXJyYXk8RGlyZWN0aXZlIHwgdW5kZWZpbmVkPjtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHBhcmVudDogRGlzY29ubmVjdGFibGU7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuPzogU2V0PERpc2Nvbm5lY3RhYmxlPiA9IHVuZGVmaW5lZDtcblxuICBwcm90ZWN0ZWQgX3Nhbml0aXplcjogVmFsdWVTYW5pdGl6ZXIgfCB1bmRlZmluZWQ7XG5cbiAgZ2V0IHRhZ05hbWUoKSB7XG4gICAgcmV0dXJuIHRoaXMuZWxlbWVudC50YWdOYW1lO1xuICB9XG5cbiAgLy8gU2VlIGNvbW1lbnQgaW4gRGlzY29ubmVjdGFibGUgaW50ZXJmYWNlIGZvciB3aHkgdGhpcyBpcyBhIGdldHRlclxuICBnZXQgXyRpc0Nvbm5lY3RlZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fJHBhcmVudC5fJGlzQ29ubmVjdGVkO1xuICB9XG5cbiAgY29uc3RydWN0b3IoXG4gICAgZWxlbWVudDogSFRNTEVsZW1lbnQsXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIHN0cmluZ3M6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPixcbiAgICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgdGhpcy5lbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMuXyRwYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICBpZiAoc3RyaW5ncy5sZW5ndGggPiAyIHx8IHN0cmluZ3NbMF0gIT09ICcnIHx8IHN0cmluZ3NbMV0gIT09ICcnKSB7XG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSBuZXcgQXJyYXkoc3RyaW5ncy5sZW5ndGggLSAxKS5maWxsKG5ldyBTdHJpbmcoKSk7XG4gICAgICB0aGlzLnN0cmluZ3MgPSBzdHJpbmdzO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSBub3RoaW5nO1xuICAgIH1cbiAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICB0aGlzLl9zYW5pdGl6ZXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHZhbHVlIG9mIHRoaXMgcGFydCBieSByZXNvbHZpbmcgdGhlIHZhbHVlIGZyb20gcG9zc2libHkgbXVsdGlwbGVcbiAgICogdmFsdWVzIGFuZCBzdGF0aWMgc3RyaW5ncyBhbmQgY29tbWl0dGluZyBpdCB0byB0aGUgRE9NLlxuICAgKiBJZiB0aGlzIHBhcnQgaXMgc2luZ2xlLXZhbHVlZCwgYHRoaXMuX3N0cmluZ3NgIHdpbGwgYmUgdW5kZWZpbmVkLCBhbmQgdGhlXG4gICAqIG1ldGhvZCB3aWxsIGJlIGNhbGxlZCB3aXRoIGEgc2luZ2xlIHZhbHVlIGFyZ3VtZW50LiBJZiB0aGlzIHBhcnQgaXNcbiAgICogbXVsdGktdmFsdWUsIGB0aGlzLl9zdHJpbmdzYCB3aWxsIGJlIGRlZmluZWQsIGFuZCB0aGUgbWV0aG9kIGlzIGNhbGxlZFxuICAgKiB3aXRoIHRoZSB2YWx1ZSBhcnJheSBvZiB0aGUgcGFydCdzIG93bmluZyBUZW1wbGF0ZUluc3RhbmNlLCBhbmQgYW4gb2Zmc2V0XG4gICAqIGludG8gdGhlIHZhbHVlIGFycmF5IGZyb20gd2hpY2ggdGhlIHZhbHVlcyBzaG91bGQgYmUgcmVhZC5cbiAgICogVGhpcyBtZXRob2QgaXMgb3ZlcmxvYWRlZCB0aGlzIHdheSB0byBlbGltaW5hdGUgc2hvcnQtbGl2ZWQgYXJyYXkgc2xpY2VzXG4gICAqIG9mIHRoZSB0ZW1wbGF0ZSBpbnN0YW5jZSB2YWx1ZXMsIGFuZCBhbGxvdyBhIGZhc3QtcGF0aCBmb3Igc2luZ2xlLXZhbHVlZFxuICAgKiBwYXJ0cy5cbiAgICpcbiAgICogQHBhcmFtIHZhbHVlIFRoZSBwYXJ0IHZhbHVlLCBvciBhbiBhcnJheSBvZiB2YWx1ZXMgZm9yIG11bHRpLXZhbHVlZCBwYXJ0c1xuICAgKiBAcGFyYW0gdmFsdWVJbmRleCB0aGUgaW5kZXggdG8gc3RhcnQgcmVhZGluZyB2YWx1ZXMgZnJvbS4gYHVuZGVmaW5lZGAgZm9yXG4gICAqICAgc2luZ2xlLXZhbHVlZCBwYXJ0c1xuICAgKiBAcGFyYW0gbm9Db21taXQgY2F1c2VzIHRoZSBwYXJ0IHRvIG5vdCBjb21taXQgaXRzIHZhbHVlIHRvIHRoZSBET00uIFVzZWRcbiAgICogICBpbiBoeWRyYXRpb24gdG8gcHJpbWUgYXR0cmlidXRlIHBhcnRzIHdpdGggdGhlaXIgZmlyc3QtcmVuZGVyZWQgdmFsdWUsXG4gICAqICAgYnV0IG5vdCBzZXQgdGhlIGF0dHJpYnV0ZSwgYW5kIGluIFNTUiB0byBuby1vcCB0aGUgRE9NIG9wZXJhdGlvbiBhbmRcbiAgICogICBjYXB0dXJlIHRoZSB2YWx1ZSBmb3Igc2VyaWFsaXphdGlvbi5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuICBfJHNldFZhbHVlKFxuICAgIHZhbHVlOiB1bmtub3duIHwgQXJyYXk8dW5rbm93bj4sXG4gICAgZGlyZWN0aXZlUGFyZW50OiBEaXJlY3RpdmVQYXJlbnQgPSB0aGlzLFxuICAgIHZhbHVlSW5kZXg/OiBudW1iZXIsXG4gICAgbm9Db21taXQ/OiBib29sZWFuXG4gICkge1xuICAgIGNvbnN0IHN0cmluZ3MgPSB0aGlzLnN0cmluZ3M7XG5cbiAgICAvLyBXaGV0aGVyIGFueSBvZiB0aGUgdmFsdWVzIGhhcyBjaGFuZ2VkLCBmb3IgZGlydHktY2hlY2tpbmdcbiAgICBsZXQgY2hhbmdlID0gZmFsc2U7XG5cbiAgICBpZiAoc3RyaW5ncyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBTaW5nbGUtdmFsdWUgYmluZGluZyBjYXNlXG4gICAgICB2YWx1ZSA9IHJlc29sdmVEaXJlY3RpdmUodGhpcywgdmFsdWUsIGRpcmVjdGl2ZVBhcmVudCwgMCk7XG4gICAgICBjaGFuZ2UgPVxuICAgICAgICAhaXNQcmltaXRpdmUodmFsdWUpIHx8XG4gICAgICAgICh2YWx1ZSAhPT0gdGhpcy5fJGNvbW1pdHRlZFZhbHVlICYmIHZhbHVlICE9PSBub0NoYW5nZSk7XG4gICAgICBpZiAoY2hhbmdlKSB7XG4gICAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJbnRlcnBvbGF0aW9uIGNhc2VcbiAgICAgIGNvbnN0IHZhbHVlcyA9IHZhbHVlIGFzIEFycmF5PHVua25vd24+O1xuICAgICAgdmFsdWUgPSBzdHJpbmdzWzBdO1xuXG4gICAgICBsZXQgaSwgdjtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBzdHJpbmdzLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICB2ID0gcmVzb2x2ZURpcmVjdGl2ZSh0aGlzLCB2YWx1ZXNbdmFsdWVJbmRleCEgKyBpXSwgZGlyZWN0aXZlUGFyZW50LCBpKTtcblxuICAgICAgICBpZiAodiA9PT0gbm9DaGFuZ2UpIHtcbiAgICAgICAgICAvLyBJZiB0aGUgdXNlci1wcm92aWRlZCB2YWx1ZSBpcyBgbm9DaGFuZ2VgLCB1c2UgdGhlIHByZXZpb3VzIHZhbHVlXG4gICAgICAgICAgdiA9ICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgQXJyYXk8dW5rbm93bj4pW2ldO1xuICAgICAgICB9XG4gICAgICAgIGNoYW5nZSB8fD1cbiAgICAgICAgICAhaXNQcmltaXRpdmUodikgfHwgdiAhPT0gKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBBcnJheTx1bmtub3duPilbaV07XG4gICAgICAgIGlmICh2ID09PSBub3RoaW5nKSB7XG4gICAgICAgICAgdmFsdWUgPSBub3RoaW5nO1xuICAgICAgICB9IGVsc2UgaWYgKHZhbHVlICE9PSBub3RoaW5nKSB7XG4gICAgICAgICAgdmFsdWUgKz0gKHYgPz8gJycpICsgc3RyaW5nc1tpICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgLy8gV2UgYWx3YXlzIHJlY29yZCBlYWNoIHZhbHVlLCBldmVuIGlmIG9uZSBpcyBgbm90aGluZ2AsIGZvciBmdXR1cmVcbiAgICAgICAgLy8gY2hhbmdlIGRldGVjdGlvbi5cbiAgICAgICAgKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBBcnJheTx1bmtub3duPilbaV0gPSB2O1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoY2hhbmdlICYmICFub0NvbW1pdCkge1xuICAgICAgdGhpcy5fY29tbWl0VmFsdWUodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX2NvbW1pdFZhbHVlKHZhbHVlOiB1bmtub3duKSB7XG4gICAgaWYgKHZhbHVlID09PSBub3RoaW5nKSB7XG4gICAgICAod3JhcCh0aGlzLmVsZW1lbnQpIGFzIEVsZW1lbnQpLnJlbW92ZUF0dHJpYnV0ZSh0aGlzLm5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICAgIGlmICh0aGlzLl9zYW5pdGl6ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRoaXMuX3Nhbml0aXplciA9IHNhbml0aXplckZhY3RvcnlJbnRlcm5hbChcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudCxcbiAgICAgICAgICAgIHRoaXMubmFtZSxcbiAgICAgICAgICAgICdhdHRyaWJ1dGUnXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZSA9IHRoaXMuX3Nhbml0aXplcih2YWx1ZSA/PyAnJyk7XG4gICAgICB9XG4gICAgICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAgICAgIGtpbmQ6ICdjb21taXQgYXR0cmlidXRlJyxcbiAgICAgICAgICBlbGVtZW50OiB0aGlzLmVsZW1lbnQsXG4gICAgICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgfSk7XG4gICAgICAod3JhcCh0aGlzLmVsZW1lbnQpIGFzIEVsZW1lbnQpLnNldEF0dHJpYnV0ZShcbiAgICAgICAgdGhpcy5uYW1lLFxuICAgICAgICAodmFsdWUgPz8gJycpIGFzIHN0cmluZ1xuICAgICAgKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUge1Byb3BlcnR5UGFydH07XG5jbGFzcyBQcm9wZXJ0eVBhcnQgZXh0ZW5kcyBBdHRyaWJ1dGVQYXJ0IHtcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgdHlwZSA9IFBST1BFUlRZX1BBUlQ7XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBvdmVycmlkZSBfY29tbWl0VmFsdWUodmFsdWU6IHVua25vd24pIHtcbiAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICBpZiAodGhpcy5fc2FuaXRpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fc2FuaXRpemVyID0gc2FuaXRpemVyRmFjdG9yeUludGVybmFsKFxuICAgICAgICAgIHRoaXMuZWxlbWVudCxcbiAgICAgICAgICB0aGlzLm5hbWUsXG4gICAgICAgICAgJ3Byb3BlcnR5J1xuICAgICAgICApO1xuICAgICAgfVxuICAgICAgdmFsdWUgPSB0aGlzLl9zYW5pdGl6ZXIodmFsdWUpO1xuICAgIH1cbiAgICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAga2luZDogJ2NvbW1pdCBwcm9wZXJ0eScsXG4gICAgICAgIGVsZW1lbnQ6IHRoaXMuZWxlbWVudCxcbiAgICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgICB2YWx1ZSxcbiAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgfSk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAodGhpcy5lbGVtZW50IGFzIGFueSlbdGhpcy5uYW1lXSA9IHZhbHVlID09PSBub3RoaW5nID8gdW5kZWZpbmVkIDogdmFsdWU7XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUge0Jvb2xlYW5BdHRyaWJ1dGVQYXJ0fTtcbmNsYXNzIEJvb2xlYW5BdHRyaWJ1dGVQYXJ0IGV4dGVuZHMgQXR0cmlidXRlUGFydCB7XG4gIG92ZXJyaWRlIHJlYWRvbmx5IHR5cGUgPSBCT09MRUFOX0FUVFJJQlVURV9QQVJUO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgb3ZlcnJpZGUgX2NvbW1pdFZhbHVlKHZhbHVlOiB1bmtub3duKSB7XG4gICAgZGVidWdMb2dFdmVudCAmJlxuICAgICAgZGVidWdMb2dFdmVudCh7XG4gICAgICAgIGtpbmQ6ICdjb21taXQgYm9vbGVhbiBhdHRyaWJ1dGUnLFxuICAgICAgICBlbGVtZW50OiB0aGlzLmVsZW1lbnQsXG4gICAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgICAgdmFsdWU6ICEhKHZhbHVlICYmIHZhbHVlICE9PSBub3RoaW5nKSxcbiAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgfSk7XG4gICAgKHdyYXAodGhpcy5lbGVtZW50KSBhcyBFbGVtZW50KS50b2dnbGVBdHRyaWJ1dGUoXG4gICAgICB0aGlzLm5hbWUsXG4gICAgICAhIXZhbHVlICYmIHZhbHVlICE9PSBub3RoaW5nXG4gICAgKTtcbiAgfVxufVxuXG50eXBlIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucyA9IEV2ZW50TGlzdGVuZXJPckV2ZW50TGlzdGVuZXJPYmplY3QgJlxuICBQYXJ0aWFsPEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zPjtcblxuLyoqXG4gKiBBbiBBdHRyaWJ1dGVQYXJ0IHRoYXQgbWFuYWdlcyBhbiBldmVudCBsaXN0ZW5lciB2aWEgYWRkL3JlbW92ZUV2ZW50TGlzdGVuZXIuXG4gKlxuICogVGhpcyBwYXJ0IHdvcmtzIGJ5IGFkZGluZyBpdHNlbGYgYXMgdGhlIGV2ZW50IGxpc3RlbmVyIG9uIGFuIGVsZW1lbnQsIHRoZW5cbiAqIGRlbGVnYXRpbmcgdG8gdGhlIHZhbHVlIHBhc3NlZCB0byBpdC4gVGhpcyByZWR1Y2VzIHRoZSBudW1iZXIgb2YgY2FsbHMgdG9cbiAqIGFkZC9yZW1vdmVFdmVudExpc3RlbmVyIGlmIHRoZSBsaXN0ZW5lciBjaGFuZ2VzIGZyZXF1ZW50bHksIHN1Y2ggYXMgd2hlbiBhblxuICogaW5saW5lIGZ1bmN0aW9uIGlzIHVzZWQgYXMgYSBsaXN0ZW5lci5cbiAqXG4gKiBCZWNhdXNlIGV2ZW50IG9wdGlvbnMgYXJlIHBhc3NlZCB3aGVuIGFkZGluZyBsaXN0ZW5lcnMsIHdlIG11c3QgdGFrZSBjYXNlXG4gKiB0byBhZGQgYW5kIHJlbW92ZSB0aGUgcGFydCBhcyBhIGxpc3RlbmVyIHdoZW4gdGhlIGV2ZW50IG9wdGlvbnMgY2hhbmdlLlxuICovXG5leHBvcnQgdHlwZSB7RXZlbnRQYXJ0fTtcbmNsYXNzIEV2ZW50UGFydCBleHRlbmRzIEF0dHJpYnV0ZVBhcnQge1xuICBvdmVycmlkZSByZWFkb25seSB0eXBlID0gRVZFTlRfUEFSVDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBlbGVtZW50OiBIVE1MRWxlbWVudCxcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgc3RyaW5nczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LFxuICAgIHBhcmVudDogRGlzY29ubmVjdGFibGUsXG4gICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZFxuICApIHtcbiAgICBzdXBlcihlbGVtZW50LCBuYW1lLCBzdHJpbmdzLCBwYXJlbnQsIG9wdGlvbnMpO1xuXG4gICAgaWYgKERFVl9NT0RFICYmIHRoaXMuc3RyaW5ncyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBBIFxcYDwke2VsZW1lbnQubG9jYWxOYW1lfT5cXGAgaGFzIGEgXFxgQCR7bmFtZX09Li4uXFxgIGxpc3RlbmVyIHdpdGggYCArXG4gICAgICAgICAgJ2ludmFsaWQgY29udGVudC4gRXZlbnQgbGlzdGVuZXJzIGluIHRlbXBsYXRlcyBtdXN0IGhhdmUgZXhhY3RseSAnICtcbiAgICAgICAgICAnb25lIGV4cHJlc3Npb24gYW5kIG5vIHN1cnJvdW5kaW5nIHRleHQuJ1xuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICAvLyBFdmVudFBhcnQgZG9lcyBub3QgdXNlIHRoZSBiYXNlIF8kc2V0VmFsdWUvX3Jlc29sdmVWYWx1ZSBpbXBsZW1lbnRhdGlvblxuICAvLyBzaW5jZSB0aGUgZGlydHkgY2hlY2tpbmcgaXMgbW9yZSBjb21wbGV4XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgb3ZlcnJpZGUgXyRzZXRWYWx1ZShcbiAgICBuZXdMaXN0ZW5lcjogdW5rbm93bixcbiAgICBkaXJlY3RpdmVQYXJlbnQ6IERpcmVjdGl2ZVBhcmVudCA9IHRoaXNcbiAgKSB7XG4gICAgbmV3TGlzdGVuZXIgPVxuICAgICAgcmVzb2x2ZURpcmVjdGl2ZSh0aGlzLCBuZXdMaXN0ZW5lciwgZGlyZWN0aXZlUGFyZW50LCAwKSA/PyBub3RoaW5nO1xuICAgIGlmIChuZXdMaXN0ZW5lciA9PT0gbm9DaGFuZ2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgb2xkTGlzdGVuZXIgPSB0aGlzLl8kY29tbWl0dGVkVmFsdWU7XG5cbiAgICAvLyBJZiB0aGUgbmV3IHZhbHVlIGlzIG5vdGhpbmcgb3IgYW55IG9wdGlvbnMgY2hhbmdlIHdlIGhhdmUgdG8gcmVtb3ZlIHRoZVxuICAgIC8vIHBhcnQgYXMgYSBsaXN0ZW5lci5cbiAgICBjb25zdCBzaG91bGRSZW1vdmVMaXN0ZW5lciA9XG4gICAgICAobmV3TGlzdGVuZXIgPT09IG5vdGhpbmcgJiYgb2xkTGlzdGVuZXIgIT09IG5vdGhpbmcpIHx8XG4gICAgICAobmV3TGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5jYXB0dXJlICE9PVxuICAgICAgICAob2xkTGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5jYXB0dXJlIHx8XG4gICAgICAobmV3TGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5vbmNlICE9PVxuICAgICAgICAob2xkTGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5vbmNlIHx8XG4gICAgICAobmV3TGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5wYXNzaXZlICE9PVxuICAgICAgICAob2xkTGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5wYXNzaXZlO1xuXG4gICAgLy8gSWYgdGhlIG5ldyB2YWx1ZSBpcyBub3Qgbm90aGluZyBhbmQgd2UgcmVtb3ZlZCB0aGUgbGlzdGVuZXIsIHdlIGhhdmVcbiAgICAvLyB0byBhZGQgdGhlIHBhcnQgYXMgYSBsaXN0ZW5lci5cbiAgICBjb25zdCBzaG91bGRBZGRMaXN0ZW5lciA9XG4gICAgICBuZXdMaXN0ZW5lciAhPT0gbm90aGluZyAmJlxuICAgICAgKG9sZExpc3RlbmVyID09PSBub3RoaW5nIHx8IHNob3VsZFJlbW92ZUxpc3RlbmVyKTtcblxuICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAgICBraW5kOiAnY29tbWl0IGV2ZW50IGxpc3RlbmVyJyxcbiAgICAgICAgZWxlbWVudDogdGhpcy5lbGVtZW50LFxuICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgIHZhbHVlOiBuZXdMaXN0ZW5lcixcbiAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICByZW1vdmVMaXN0ZW5lcjogc2hvdWxkUmVtb3ZlTGlzdGVuZXIsXG4gICAgICAgIGFkZExpc3RlbmVyOiBzaG91bGRBZGRMaXN0ZW5lcixcbiAgICAgICAgb2xkTGlzdGVuZXIsXG4gICAgICB9KTtcbiAgICBpZiAoc2hvdWxkUmVtb3ZlTGlzdGVuZXIpIHtcbiAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFxuICAgICAgICB0aGlzLm5hbWUsXG4gICAgICAgIHRoaXMsXG4gICAgICAgIG9sZExpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9uc1xuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKHNob3VsZEFkZExpc3RlbmVyKSB7XG4gICAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgICAgdGhpcy5uYW1lLFxuICAgICAgICB0aGlzLFxuICAgICAgICBuZXdMaXN0ZW5lciBhcyBFdmVudExpc3RlbmVyV2l0aE9wdGlvbnNcbiAgICAgICk7XG4gICAgfVxuICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IG5ld0xpc3RlbmVyO1xuICB9XG5cbiAgaGFuZGxlRXZlbnQoZXZlbnQ6IEV2ZW50KSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZS5jYWxsKHRoaXMub3B0aW9ucz8uaG9zdCA/PyB0aGlzLmVsZW1lbnQsIGV2ZW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBFdmVudExpc3RlbmVyT2JqZWN0KS5oYW5kbGVFdmVudChldmVudCk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCB0eXBlIHtFbGVtZW50UGFydH07XG5jbGFzcyBFbGVtZW50UGFydCBpbXBsZW1lbnRzIERpc2Nvbm5lY3RhYmxlIHtcbiAgcmVhZG9ubHkgdHlwZSA9IEVMRU1FTlRfUEFSVDtcblxuICAvKiogQGludGVybmFsICovXG4gIF9fZGlyZWN0aXZlPzogRGlyZWN0aXZlO1xuXG4gIC8vIFRoaXMgaXMgdG8gZW5zdXJlIHRoYXQgZXZlcnkgUGFydCBoYXMgYSBfJGNvbW1pdHRlZFZhbHVlXG4gIF8kY29tbWl0dGVkVmFsdWU6IHVuZGVmaW5lZDtcblxuICAvKiogQGludGVybmFsICovXG4gIF8kcGFyZW50ITogRGlzY29ubmVjdGFibGU7XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4/OiBTZXQ8RGlzY29ubmVjdGFibGU+ID0gdW5kZWZpbmVkO1xuXG4gIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIGVsZW1lbnQ6IEVsZW1lbnQsXG4gICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSxcbiAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkXG4gICkge1xuICAgIHRoaXMuXyRwYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgfVxuXG4gIC8vIFNlZSBjb21tZW50IGluIERpc2Nvbm5lY3RhYmxlIGludGVyZmFjZSBmb3Igd2h5IHRoaXMgaXMgYSBnZXR0ZXJcbiAgZ2V0IF8kaXNDb25uZWN0ZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuXyRwYXJlbnQuXyRpc0Nvbm5lY3RlZDtcbiAgfVxuXG4gIF8kc2V0VmFsdWUodmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAga2luZDogJ2NvbW1pdCB0byBlbGVtZW50IGJpbmRpbmcnLFxuICAgICAgICBlbGVtZW50OiB0aGlzLmVsZW1lbnQsXG4gICAgICAgIHZhbHVlLFxuICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICB9KTtcbiAgICByZXNvbHZlRGlyZWN0aXZlKHRoaXMsIHZhbHVlKTtcbiAgfVxufVxuXG4vKipcbiAqIEVORCBVU0VSUyBTSE9VTEQgTk9UIFJFTFkgT04gVEhJUyBPQkpFQ1QuXG4gKlxuICogUHJpdmF0ZSBleHBvcnRzIGZvciB1c2UgYnkgb3RoZXIgTGl0IHBhY2thZ2VzLCBub3QgaW50ZW5kZWQgZm9yIHVzZSBieVxuICogZXh0ZXJuYWwgdXNlcnMuXG4gKlxuICogV2UgY3VycmVudGx5IGRvIG5vdCBtYWtlIGEgbWFuZ2xlZCByb2xsdXAgYnVpbGQgb2YgdGhlIGxpdC1zc3IgY29kZS4gSW4gb3JkZXJcbiAqIHRvIGtlZXAgYSBudW1iZXIgb2YgKG90aGVyd2lzZSBwcml2YXRlKSB0b3AtbGV2ZWwgZXhwb3J0cyBtYW5nbGVkIGluIHRoZVxuICogY2xpZW50IHNpZGUgY29kZSwgd2UgZXhwb3J0IGEgXyRMSCBvYmplY3QgY29udGFpbmluZyB0aG9zZSBtZW1iZXJzIChvclxuICogaGVscGVyIG1ldGhvZHMgZm9yIGFjY2Vzc2luZyBwcml2YXRlIGZpZWxkcyBvZiB0aG9zZSBtZW1iZXJzKSwgYW5kIHRoZW5cbiAqIHJlLWV4cG9ydCB0aGVtIGZvciB1c2UgaW4gbGl0LXNzci4gVGhpcyBrZWVwcyBsaXQtc3NyIGFnbm9zdGljIHRvIHdoZXRoZXIgdGhlXG4gKiBjbGllbnQtc2lkZSBjb2RlIGlzIGJlaW5nIHVzZWQgaW4gYGRldmAgbW9kZSBvciBgcHJvZGAgbW9kZS5cbiAqXG4gKiBUaGlzIGhhcyBhIHVuaXF1ZSBuYW1lLCB0byBkaXNhbWJpZ3VhdGUgaXQgZnJvbSBwcml2YXRlIGV4cG9ydHMgaW5cbiAqIGxpdC1lbGVtZW50LCB3aGljaCByZS1leHBvcnRzIGFsbCBvZiBsaXQtaHRtbC5cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5leHBvcnQgY29uc3QgXyRMSCA9IHtcbiAgLy8gVXNlZCBpbiBsaXQtc3NyXG4gIF9ib3VuZEF0dHJpYnV0ZVN1ZmZpeDogYm91bmRBdHRyaWJ1dGVTdWZmaXgsXG4gIF9tYXJrZXI6IG1hcmtlcixcbiAgX21hcmtlck1hdGNoOiBtYXJrZXJNYXRjaCxcbiAgX0hUTUxfUkVTVUxUOiBIVE1MX1JFU1VMVCxcbiAgX2dldFRlbXBsYXRlSHRtbDogZ2V0VGVtcGxhdGVIdG1sLFxuICAvLyBVc2VkIGluIHRlc3RzIGFuZCBwcml2YXRlLXNzci1zdXBwb3J0XG4gIF9UZW1wbGF0ZUluc3RhbmNlOiBUZW1wbGF0ZUluc3RhbmNlLFxuICBfaXNJdGVyYWJsZTogaXNJdGVyYWJsZSxcbiAgX3Jlc29sdmVEaXJlY3RpdmU6IHJlc29sdmVEaXJlY3RpdmUsXG4gIF9DaGlsZFBhcnQ6IENoaWxkUGFydCxcbiAgX0F0dHJpYnV0ZVBhcnQ6IEF0dHJpYnV0ZVBhcnQsXG4gIF9Cb29sZWFuQXR0cmlidXRlUGFydDogQm9vbGVhbkF0dHJpYnV0ZVBhcnQsXG4gIF9FdmVudFBhcnQ6IEV2ZW50UGFydCxcbiAgX1Byb3BlcnR5UGFydDogUHJvcGVydHlQYXJ0LFxuICBfRWxlbWVudFBhcnQ6IEVsZW1lbnRQYXJ0LFxufTtcblxuLy8gQXBwbHkgcG9seWZpbGxzIGlmIGF2YWlsYWJsZVxuY29uc3QgcG9seWZpbGxTdXBwb3J0ID0gREVWX01PREVcbiAgPyBnbG9iYWwubGl0SHRtbFBvbHlmaWxsU3VwcG9ydERldk1vZGVcbiAgOiBnbG9iYWwubGl0SHRtbFBvbHlmaWxsU3VwcG9ydDtcbnBvbHlmaWxsU3VwcG9ydD8uKFRlbXBsYXRlLCBDaGlsZFBhcnQpO1xuXG4vLyBJTVBPUlRBTlQ6IGRvIG5vdCBjaGFuZ2UgdGhlIHByb3BlcnR5IG5hbWUgb3IgdGhlIGFzc2lnbm1lbnQgZXhwcmVzc2lvbi5cbi8vIFRoaXMgbGluZSB3aWxsIGJlIHVzZWQgaW4gcmVnZXhlcyB0byBzZWFyY2ggZm9yIGxpdC1odG1sIHVzYWdlLlxuKGdsb2JhbC5saXRIdG1sVmVyc2lvbnMgPz89IFtdKS5wdXNoKCczLjMuMCcpO1xuaWYgKERFVl9NT0RFICYmIGdsb2JhbC5saXRIdG1sVmVyc2lvbnMubGVuZ3RoID4gMSkge1xuICBxdWV1ZU1pY3JvdGFzaygoKSA9PiB7XG4gICAgaXNzdWVXYXJuaW5nIShcbiAgICAgICdtdWx0aXBsZS12ZXJzaW9ucycsXG4gICAgICBgTXVsdGlwbGUgdmVyc2lvbnMgb2YgTGl0IGxvYWRlZC4gYCArXG4gICAgICAgIGBMb2FkaW5nIG11bHRpcGxlIHZlcnNpb25zIGlzIG5vdCByZWNvbW1lbmRlZC5gXG4gICAgKTtcbiAgfSk7XG59XG5cbi8qKlxuICogUmVuZGVycyBhIHZhbHVlLCB1c3VhbGx5IGEgbGl0LWh0bWwgVGVtcGxhdGVSZXN1bHQsIHRvIHRoZSBjb250YWluZXIuXG4gKlxuICogVGhpcyBleGFtcGxlIHJlbmRlcnMgdGhlIHRleHQgXCJIZWxsbywgWm9lIVwiIGluc2lkZSBhIHBhcmFncmFwaCB0YWcsIGFwcGVuZGluZ1xuICogaXQgdG8gdGhlIGNvbnRhaW5lciBgZG9jdW1lbnQuYm9keWAuXG4gKlxuICogYGBganNcbiAqIGltcG9ydCB7aHRtbCwgcmVuZGVyfSBmcm9tICdsaXQnO1xuICpcbiAqIGNvbnN0IG5hbWUgPSBcIlpvZVwiO1xuICogcmVuZGVyKGh0bWxgPHA+SGVsbG8sICR7bmFtZX0hPC9wPmAsIGRvY3VtZW50LmJvZHkpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHZhbHVlIEFueSBbcmVuZGVyYWJsZVxuICogICB2YWx1ZV0oaHR0cHM6Ly9saXQuZGV2L2RvY3MvdGVtcGxhdGVzL2V4cHJlc3Npb25zLyNjaGlsZC1leHByZXNzaW9ucyksXG4gKiAgIHR5cGljYWxseSBhIHtAbGlua2NvZGUgVGVtcGxhdGVSZXN1bHR9IGNyZWF0ZWQgYnkgZXZhbHVhdGluZyBhIHRlbXBsYXRlIHRhZ1xuICogICBsaWtlIHtAbGlua2NvZGUgaHRtbH0gb3Ige0BsaW5rY29kZSBzdmd9LlxuICogQHBhcmFtIGNvbnRhaW5lciBBIERPTSBjb250YWluZXIgdG8gcmVuZGVyIHRvLiBUaGUgZmlyc3QgcmVuZGVyIHdpbGwgYXBwZW5kXG4gKiAgIHRoZSByZW5kZXJlZCB2YWx1ZSB0byB0aGUgY29udGFpbmVyLCBhbmQgc3Vic2VxdWVudCByZW5kZXJzIHdpbGxcbiAqICAgZWZmaWNpZW50bHkgdXBkYXRlIHRoZSByZW5kZXJlZCB2YWx1ZSBpZiB0aGUgc2FtZSByZXN1bHQgdHlwZSB3YXNcbiAqICAgcHJldmlvdXNseSByZW5kZXJlZCB0aGVyZS5cbiAqIEBwYXJhbSBvcHRpb25zIFNlZSB7QGxpbmtjb2RlIFJlbmRlck9wdGlvbnN9IGZvciBvcHRpb25zIGRvY3VtZW50YXRpb24uXG4gKiBAc2VlXG4gKiB7QGxpbmsgaHR0cHM6Ly9saXQuZGV2L2RvY3MvbGlicmFyaWVzL3N0YW5kYWxvbmUtdGVtcGxhdGVzLyNyZW5kZXJpbmctbGl0LWh0bWwtdGVtcGxhdGVzfCBSZW5kZXJpbmcgTGl0IEhUTUwgVGVtcGxhdGVzfVxuICovXG5leHBvcnQgY29uc3QgcmVuZGVyID0gKFxuICB2YWx1ZTogdW5rbm93bixcbiAgY29udGFpbmVyOiBIVE1MRWxlbWVudCB8IERvY3VtZW50RnJhZ21lbnQsXG4gIG9wdGlvbnM/OiBSZW5kZXJPcHRpb25zXG4pOiBSb290UGFydCA9PiB7XG4gIGlmIChERVZfTU9ERSAmJiBjb250YWluZXIgPT0gbnVsbCkge1xuICAgIC8vIEdpdmUgYSBjbGVhcmVyIGVycm9yIG1lc3NhZ2UgdGhhblxuICAgIC8vICAgICBVbmNhdWdodCBUeXBlRXJyb3I6IENhbm5vdCByZWFkIHByb3BlcnRpZXMgb2YgbnVsbCAocmVhZGluZ1xuICAgIC8vICAgICAnXyRsaXRQYXJ0JCcpXG4gICAgLy8gd2hpY2ggcmVhZHMgbGlrZSBhbiBpbnRlcm5hbCBMaXQgZXJyb3IuXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVGhlIGNvbnRhaW5lciB0byByZW5kZXIgaW50byBtYXkgbm90IGJlICR7Y29udGFpbmVyfWApO1xuICB9XG4gIGNvbnN0IHJlbmRlcklkID0gREVWX01PREUgPyBkZWJ1Z0xvZ1JlbmRlcklkKysgOiAwO1xuICBjb25zdCBwYXJ0T3duZXJOb2RlID0gb3B0aW9ucz8ucmVuZGVyQmVmb3JlID8/IGNvbnRhaW5lcjtcbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgbGV0IHBhcnQ6IENoaWxkUGFydCA9IChwYXJ0T3duZXJOb2RlIGFzIGFueSlbJ18kbGl0UGFydCQnXTtcbiAgZGVidWdMb2dFdmVudCAmJlxuICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAga2luZDogJ2JlZ2luIHJlbmRlcicsXG4gICAgICBpZDogcmVuZGVySWQsXG4gICAgICB2YWx1ZSxcbiAgICAgIGNvbnRhaW5lcixcbiAgICAgIG9wdGlvbnMsXG4gICAgICBwYXJ0LFxuICAgIH0pO1xuICBpZiAocGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgZW5kTm9kZSA9IG9wdGlvbnM/LnJlbmRlckJlZm9yZSA/PyBudWxsO1xuICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAocGFydE93bmVyTm9kZSBhcyBhbnkpWydfJGxpdFBhcnQkJ10gPSBwYXJ0ID0gbmV3IENoaWxkUGFydChcbiAgICAgIGNvbnRhaW5lci5pbnNlcnRCZWZvcmUoY3JlYXRlTWFya2VyKCksIGVuZE5vZGUpLFxuICAgICAgZW5kTm9kZSxcbiAgICAgIHVuZGVmaW5lZCxcbiAgICAgIG9wdGlvbnMgPz8ge31cbiAgICApO1xuICB9XG4gIHBhcnQuXyRzZXRWYWx1ZSh2YWx1ZSk7XG4gIGRlYnVnTG9nRXZlbnQgJiZcbiAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgIGtpbmQ6ICdlbmQgcmVuZGVyJyxcbiAgICAgIGlkOiByZW5kZXJJZCxcbiAgICAgIHZhbHVlLFxuICAgICAgY29udGFpbmVyLFxuICAgICAgb3B0aW9ucyxcbiAgICAgIHBhcnQsXG4gICAgfSk7XG4gIHJldHVybiBwYXJ0IGFzIFJvb3RQYXJ0O1xufTtcblxuaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICByZW5kZXIuc2V0U2FuaXRpemVyID0gc2V0U2FuaXRpemVyO1xuICByZW5kZXIuY3JlYXRlU2FuaXRpemVyID0gY3JlYXRlU2FuaXRpemVyO1xuICBpZiAoREVWX01PREUpIHtcbiAgICByZW5kZXIuX3Rlc3RPbmx5Q2xlYXJTYW5pdGl6ZXJGYWN0b3J5RG9Ob3RDYWxsT3JFbHNlID1cbiAgICAgIF90ZXN0T25seUNsZWFyU2FuaXRpemVyRmFjdG9yeURvTm90Q2FsbE9yRWxzZTtcbiAgfVxufVxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7XG4gIERpcmVjdGl2ZSxcbiAgUGFydEluZm8sXG4gIERpcmVjdGl2ZUNsYXNzLFxuICBEaXJlY3RpdmVSZXN1bHQsXG59IGZyb20gJy4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7XG4gIF8kTEggYXMgcCxcbiAgQXR0cmlidXRlUGFydCxcbiAgbm9DaGFuZ2UsXG4gIFBhcnQsXG4gIERpc2Nvbm5lY3RhYmxlLFxufSBmcm9tICcuL2xpdC1odG1sLmpzJztcblxuaW1wb3J0IHR5cGUge1xuICBQcm9wZXJ0eVBhcnQsXG4gIENoaWxkUGFydCxcbiAgQm9vbGVhbkF0dHJpYnV0ZVBhcnQsXG4gIEV2ZW50UGFydCxcbiAgRWxlbWVudFBhcnQsXG4gIFRlbXBsYXRlSW5zdGFuY2UsXG59IGZyb20gJy4vbGl0LWh0bWwuanMnO1xuXG4vLyBDb250YWlucyBlaXRoZXIgdGhlIG1pbmlmaWVkIG9yIHVubWluaWZpZWQgYF8kcmVzb2x2ZWAgRGlyZWN0aXZlIG1ldGhvZCBuYW1lLlxubGV0IHJlc29sdmVNZXRob2ROYW1lOiBFeHRyYWN0PGtleW9mIERpcmVjdGl2ZSwgJ18kcmVzb2x2ZSc+IHwgbnVsbCA9IG51bGw7XG5cbi8qKlxuICogRU5EIFVTRVJTIFNIT1VMRCBOT1QgUkVMWSBPTiBUSElTIE9CSkVDVC5cbiAqXG4gKiBXZSBjdXJyZW50bHkgZG8gbm90IG1ha2UgYSBtYW5nbGVkIHJvbGx1cCBidWlsZCBvZiB0aGUgbGl0LXNzciBjb2RlLiBJbiBvcmRlclxuICogdG8ga2VlcCBhIG51bWJlciBvZiAob3RoZXJ3aXNlIHByaXZhdGUpIHRvcC1sZXZlbCBleHBvcnRzIG1hbmdsZWQgaW4gdGhlXG4gKiBjbGllbnQgc2lkZSBjb2RlLCB3ZSBleHBvcnQgYSBfJExIIG9iamVjdCBjb250YWluaW5nIHRob3NlIG1lbWJlcnMgKG9yXG4gKiBoZWxwZXIgbWV0aG9kcyBmb3IgYWNjZXNzaW5nIHByaXZhdGUgZmllbGRzIG9mIHRob3NlIG1lbWJlcnMpLCBhbmQgdGhlblxuICogcmUtZXhwb3J0IHRoZW0gZm9yIHVzZSBpbiBsaXQtc3NyLiBUaGlzIGtlZXBzIGxpdC1zc3IgYWdub3N0aWMgdG8gd2hldGhlciB0aGVcbiAqIGNsaWVudC1zaWRlIGNvZGUgaXMgYmVpbmcgdXNlZCBpbiBgZGV2YCBtb2RlIG9yIGBwcm9kYCBtb2RlLlxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IGNvbnN0IF8kTEggPSB7XG4gIGJvdW5kQXR0cmlidXRlU3VmZml4OiBwLl9ib3VuZEF0dHJpYnV0ZVN1ZmZpeCxcbiAgbWFya2VyOiBwLl9tYXJrZXIsXG4gIG1hcmtlck1hdGNoOiBwLl9tYXJrZXJNYXRjaCxcbiAgSFRNTF9SRVNVTFQ6IHAuX0hUTUxfUkVTVUxULFxuICBnZXRUZW1wbGF0ZUh0bWw6IHAuX2dldFRlbXBsYXRlSHRtbCxcbiAgb3ZlcnJpZGVEaXJlY3RpdmVSZXNvbHZlOiAoXG4gICAgZGlyZWN0aXZlQ2xhc3M6IG5ldyAocGFydDogUGFydEluZm8pID0+IERpcmVjdGl2ZSAmIHtyZW5kZXIoKTogdW5rbm93bn0sXG4gICAgcmVzb2x2ZU92ZXJyaWRlRm46IChkaXJlY3RpdmU6IERpcmVjdGl2ZSwgdmFsdWVzOiB1bmtub3duW10pID0+IHVua25vd25cbiAgKSA9PlxuICAgIGNsYXNzIGV4dGVuZHMgZGlyZWN0aXZlQ2xhc3Mge1xuICAgICAgb3ZlcnJpZGUgXyRyZXNvbHZlKFxuICAgICAgICB0aGlzOiBEaXJlY3RpdmUsXG4gICAgICAgIF9wYXJ0OiBQYXJ0LFxuICAgICAgICB2YWx1ZXM6IHVua25vd25bXVxuICAgICAgKTogdW5rbm93biB7XG4gICAgICAgIHJldHVybiByZXNvbHZlT3ZlcnJpZGVGbih0aGlzLCB2YWx1ZXMpO1xuICAgICAgfVxuICAgIH0sXG4gIHBhdGNoRGlyZWN0aXZlUmVzb2x2ZTogKFxuICAgIGRpcmVjdGl2ZUNsYXNzOiB0eXBlb2YgRGlyZWN0aXZlLFxuICAgIHJlc29sdmVPdmVycmlkZUZuOiAoXG4gICAgICB0aGlzOiBEaXJlY3RpdmUsXG4gICAgICBfcGFydDogUGFydCxcbiAgICAgIHZhbHVlczogdW5rbm93bltdXG4gICAgKSA9PiB1bmtub3duXG4gICkgPT4ge1xuICAgIGlmIChkaXJlY3RpdmVDbGFzcy5wcm90b3R5cGUuXyRyZXNvbHZlICE9PSByZXNvbHZlT3ZlcnJpZGVGbikge1xuICAgICAgcmVzb2x2ZU1ldGhvZE5hbWUgPz89IGRpcmVjdGl2ZUNsYXNzLnByb3RvdHlwZS5fJHJlc29sdmVcbiAgICAgICAgLm5hbWUgYXMgTm9uTnVsbGFibGU8dHlwZW9mIHJlc29sdmVNZXRob2ROYW1lPjtcbiAgICAgIGZvciAoXG4gICAgICAgIGxldCBwcm90byA9IGRpcmVjdGl2ZUNsYXNzLnByb3RvdHlwZTtcbiAgICAgICAgcHJvdG8gIT09IE9iamVjdC5wcm90b3R5cGU7XG4gICAgICAgIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHByb3RvKVxuICAgICAgKSB7XG4gICAgICAgIGlmIChwcm90by5oYXNPd25Qcm9wZXJ0eShyZXNvbHZlTWV0aG9kTmFtZSkpIHtcbiAgICAgICAgICBwcm90b1tyZXNvbHZlTWV0aG9kTmFtZV0gPSByZXNvbHZlT3ZlcnJpZGVGbjtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIE5vdGhpbmcgd2FzIHBhdGNoZWQgd2hpY2ggaW5kaWNhdGVzIGFuIGVycm9yLiBUaGUgbW9zdCBsaWtlbHkgZXJyb3IgaXNcbiAgICAgIC8vIHRoYXQgc29tZWhvdyBib3RoIG1pbmlmaWVkIGFuZCB1bm1pbmlmaWVkIGxpdCBjb2RlIHBhc3NlZCB0aHJvdWdoIHRoaXNcbiAgICAgIC8vIGNvZGVwYXRoLiBUaGlzIGlzIHBvc3NpYmxlIGFzIGxpdC1sYWJzL3NzciBjb250YWlucyBpdHMgb3duIGxpdC1odG1sXG4gICAgICAvLyBtb2R1bGUgYXMgYSBkZXBlbmRlbmN5IGZvciBzZXJ2ZXIgcmVuZGVyaW5nIGNsaWVudCBMaXQgY29kZS4gSWYgYVxuICAgICAgLy8gY2xpZW50IGNvbnRhaW5zIG11bHRpcGxlIGR1cGxpY2F0ZSBMaXQgbW9kdWxlcyB3aXRoIG1pbmlmaWVkIGFuZFxuICAgICAgLy8gdW5taW5pZmllZCBleHBvcnRzLCB3ZSBjdXJyZW50bHkgY2Fubm90IGhhbmRsZSBib3RoLlxuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgSW50ZXJuYWwgZXJyb3I6IEl0IGlzIHBvc3NpYmxlIHRoYXQgYm90aCBkZXYgbW9kZSBhbmQgcHJvZHVjdGlvbiBtb2RlYCArXG4gICAgICAgICAgYCBMaXQgd2FzIG1peGVkIHRvZ2V0aGVyIGR1cmluZyBTU1IuIFBsZWFzZSBjb21tZW50IG9uIHRoZSBpc3N1ZTogYCArXG4gICAgICAgICAgYGh0dHBzOi8vZ2l0aHViLmNvbS9saXQvbGl0L2lzc3Vlcy80NTI3YFxuICAgICAgKTtcbiAgICB9XG4gIH0sXG4gIHNldERpcmVjdGl2ZUNsYXNzKHZhbHVlOiBEaXJlY3RpdmVSZXN1bHQsIGRpcmVjdGl2ZUNsYXNzOiBEaXJlY3RpdmVDbGFzcykge1xuICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgdmFsdWVbJ18kbGl0RGlyZWN0aXZlJCddID0gZGlyZWN0aXZlQ2xhc3M7XG4gIH0sXG4gIGdldEF0dHJpYnV0ZVBhcnRDb21taXR0ZWRWYWx1ZTogKFxuICAgIHBhcnQ6IEF0dHJpYnV0ZVBhcnQsXG4gICAgdmFsdWU6IHVua25vd24sXG4gICAgaW5kZXg6IG51bWJlciB8IHVuZGVmaW5lZFxuICApID0+IHtcbiAgICAvLyBVc2UgdGhlIHBhcnQgc2V0dGVyIHRvIHJlc29sdmUgZGlyZWN0aXZlcy9jb25jYXRlbmF0ZSBtdWx0aXBsZSBwYXJ0c1xuICAgIC8vIGludG8gYSBmaW5hbCB2YWx1ZSAoY2FwdHVyZWQgYnkgcGFzc2luZyBpbiBhIGNvbW1pdFZhbHVlIG92ZXJyaWRlKVxuICAgIGxldCBjb21taXR0ZWRWYWx1ZTogdW5rbm93biA9IG5vQ2hhbmdlO1xuICAgIC8vIE5vdGUgdGhhdCBfY29tbWl0VmFsdWUgbmVlZCBub3QgYmUgaW4gYHN0YWJsZVByb3BlcnRpZXNgIGJlY2F1c2UgdGhpc1xuICAgIC8vIG1ldGhvZCBpcyBvbmx5IHJ1biBvbiBgQXR0cmlidXRlUGFydGBzIGNyZWF0ZWQgYnkgbGl0LXNzciB1c2luZyB0aGUgc2FtZVxuICAgIC8vIHZlcnNpb24gb2YgdGhlIGxpYnJhcnkgYXMgdGhpcyBmaWxlXG4gICAgcGFydC5fY29tbWl0VmFsdWUgPSAodmFsdWU6IHVua25vd24pID0+IChjb21taXR0ZWRWYWx1ZSA9IHZhbHVlKTtcbiAgICBwYXJ0Ll8kc2V0VmFsdWUodmFsdWUsIHBhcnQsIGluZGV4KTtcbiAgICByZXR1cm4gY29tbWl0dGVkVmFsdWU7XG4gIH0sXG4gIGNvbm5lY3RlZERpc2Nvbm5lY3RhYmxlOiAocHJvcHM/OiBvYmplY3QpOiBEaXNjb25uZWN0YWJsZSA9PiAoe1xuICAgIC4uLnByb3BzLFxuICAgIF8kaXNDb25uZWN0ZWQ6IHRydWUsXG4gIH0pLFxuICByZXNvbHZlRGlyZWN0aXZlOiBwLl9yZXNvbHZlRGlyZWN0aXZlLFxuICBBdHRyaWJ1dGVQYXJ0OiBwLl9BdHRyaWJ1dGVQYXJ0LFxuICBQcm9wZXJ0eVBhcnQ6IHAuX1Byb3BlcnR5UGFydCBhcyB0eXBlb2YgUHJvcGVydHlQYXJ0LFxuICBCb29sZWFuQXR0cmlidXRlUGFydDogcC5fQm9vbGVhbkF0dHJpYnV0ZVBhcnQgYXMgdHlwZW9mIEJvb2xlYW5BdHRyaWJ1dGVQYXJ0LFxuICBFdmVudFBhcnQ6IHAuX0V2ZW50UGFydCBhcyB0eXBlb2YgRXZlbnRQYXJ0LFxuICBFbGVtZW50UGFydDogcC5fRWxlbWVudFBhcnQgYXMgdHlwZW9mIEVsZW1lbnRQYXJ0LFxuICBUZW1wbGF0ZUluc3RhbmNlOiBwLl9UZW1wbGF0ZUluc3RhbmNlIGFzIHR5cGVvZiBUZW1wbGF0ZUluc3RhbmNlLFxuICBpc0l0ZXJhYmxlOiBwLl9pc0l0ZXJhYmxlLFxuICBDaGlsZFBhcnQ6IHAuX0NoaWxkUGFydCBhcyB0eXBlb2YgQ2hpbGRQYXJ0LFxufTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0Rpc2Nvbm5lY3RhYmxlLCBQYXJ0fSBmcm9tICcuL2xpdC1odG1sLmpzJztcblxuZXhwb3J0IHtcbiAgQXR0cmlidXRlUGFydCxcbiAgQm9vbGVhbkF0dHJpYnV0ZVBhcnQsXG4gIENoaWxkUGFydCxcbiAgRWxlbWVudFBhcnQsXG4gIEV2ZW50UGFydCxcbiAgUGFydCxcbiAgUHJvcGVydHlQYXJ0LFxufSBmcm9tICcuL2xpdC1odG1sLmpzJztcblxuZXhwb3J0IGludGVyZmFjZSBEaXJlY3RpdmVDbGFzcyB7XG4gIG5ldyAocGFydDogUGFydEluZm8pOiBEaXJlY3RpdmU7XG59XG5cbi8qKlxuICogVGhpcyB1dGlsaXR5IHR5cGUgZXh0cmFjdHMgdGhlIHNpZ25hdHVyZSBvZiBhIGRpcmVjdGl2ZSBjbGFzcydzIHJlbmRlcigpXG4gKiBtZXRob2Qgc28gd2UgY2FuIHVzZSBpdCBmb3IgdGhlIHR5cGUgb2YgdGhlIGdlbmVyYXRlZCBkaXJlY3RpdmUgZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCB0eXBlIERpcmVjdGl2ZVBhcmFtZXRlcnM8QyBleHRlbmRzIERpcmVjdGl2ZT4gPSBQYXJhbWV0ZXJzPENbJ3JlbmRlciddPjtcblxuLyoqXG4gKiBBIGdlbmVyYXRlZCBkaXJlY3RpdmUgZnVuY3Rpb24gZG9lc24ndCBldmFsdWF0ZSB0aGUgZGlyZWN0aXZlLCBidXQganVzdFxuICogcmV0dXJucyBhIERpcmVjdGl2ZVJlc3VsdCBvYmplY3QgdGhhdCBjYXB0dXJlcyB0aGUgYXJndW1lbnRzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIERpcmVjdGl2ZVJlc3VsdDxDIGV4dGVuZHMgRGlyZWN0aXZlQ2xhc3MgPSBEaXJlY3RpdmVDbGFzcz4ge1xuICAvKipcbiAgICogVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICogQGludGVybmFsXG4gICAqL1xuICBbJ18kbGl0RGlyZWN0aXZlJCddOiBDO1xuICAvKiogQGludGVybmFsICovXG4gIHZhbHVlczogRGlyZWN0aXZlUGFyYW1ldGVyczxJbnN0YW5jZVR5cGU8Qz4+O1xufVxuXG5leHBvcnQgY29uc3QgUGFydFR5cGUgPSB7XG4gIEFUVFJJQlVURTogMSxcbiAgQ0hJTEQ6IDIsXG4gIFBST1BFUlRZOiAzLFxuICBCT09MRUFOX0FUVFJJQlVURTogNCxcbiAgRVZFTlQ6IDUsXG4gIEVMRU1FTlQ6IDYsXG59IGFzIGNvbnN0O1xuXG5leHBvcnQgdHlwZSBQYXJ0VHlwZSA9ICh0eXBlb2YgUGFydFR5cGUpW2tleW9mIHR5cGVvZiBQYXJ0VHlwZV07XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2hpbGRQYXJ0SW5mbyB7XG4gIHJlYWRvbmx5IHR5cGU6IHR5cGVvZiBQYXJ0VHlwZS5DSElMRDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBdHRyaWJ1dGVQYXJ0SW5mbyB7XG4gIHJlYWRvbmx5IHR5cGU6XG4gICAgfCB0eXBlb2YgUGFydFR5cGUuQVRUUklCVVRFXG4gICAgfCB0eXBlb2YgUGFydFR5cGUuUFJPUEVSVFlcbiAgICB8IHR5cGVvZiBQYXJ0VHlwZS5CT09MRUFOX0FUVFJJQlVURVxuICAgIHwgdHlwZW9mIFBhcnRUeXBlLkVWRU5UO1xuICByZWFkb25seSBzdHJpbmdzPzogUmVhZG9ubHlBcnJheTxzdHJpbmc+O1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IHRhZ05hbWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFbGVtZW50UGFydEluZm8ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgUGFydFR5cGUuRUxFTUVOVDtcbn1cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgcGFydCBhIGRpcmVjdGl2ZSBpcyBib3VuZCB0by5cbiAqXG4gKiBUaGlzIGlzIHVzZWZ1bCBmb3IgY2hlY2tpbmcgdGhhdCBhIGRpcmVjdGl2ZSBpcyBhdHRhY2hlZCB0byBhIHZhbGlkIHBhcnQsXG4gKiBzdWNoIGFzIHdpdGggZGlyZWN0aXZlIHRoYXQgY2FuIG9ubHkgYmUgdXNlZCBvbiBhdHRyaWJ1dGUgYmluZGluZ3MuXG4gKi9cbmV4cG9ydCB0eXBlIFBhcnRJbmZvID0gQ2hpbGRQYXJ0SW5mbyB8IEF0dHJpYnV0ZVBhcnRJbmZvIHwgRWxlbWVudFBhcnRJbmZvO1xuXG4vKipcbiAqIENyZWF0ZXMgYSB1c2VyLWZhY2luZyBkaXJlY3RpdmUgZnVuY3Rpb24gZnJvbSBhIERpcmVjdGl2ZSBjbGFzcy4gVGhpc1xuICogZnVuY3Rpb24gaGFzIHRoZSBzYW1lIHBhcmFtZXRlcnMgYXMgdGhlIGRpcmVjdGl2ZSdzIHJlbmRlcigpIG1ldGhvZC5cbiAqL1xuZXhwb3J0IGNvbnN0IGRpcmVjdGl2ZSA9XG4gIDxDIGV4dGVuZHMgRGlyZWN0aXZlQ2xhc3M+KGM6IEMpID0+XG4gICguLi52YWx1ZXM6IERpcmVjdGl2ZVBhcmFtZXRlcnM8SW5zdGFuY2VUeXBlPEM+Pik6IERpcmVjdGl2ZVJlc3VsdDxDPiA9PiAoe1xuICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgWydfJGxpdERpcmVjdGl2ZSQnXTogYyxcbiAgICB2YWx1ZXMsXG4gIH0pO1xuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIGNyZWF0aW5nIGN1c3RvbSBkaXJlY3RpdmVzLiBVc2VycyBzaG91bGQgZXh0ZW5kIHRoaXMgY2xhc3MsXG4gKiBpbXBsZW1lbnQgYHJlbmRlcmAgYW5kL29yIGB1cGRhdGVgLCBhbmQgdGhlbiBwYXNzIHRoZWlyIHN1YmNsYXNzIHRvXG4gKiBgZGlyZWN0aXZlYC5cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIERpcmVjdGl2ZSBpbXBsZW1lbnRzIERpc2Nvbm5lY3RhYmxlIHtcbiAgLy9AaW50ZXJuYWxcbiAgX19wYXJ0ITogUGFydDtcbiAgLy9AaW50ZXJuYWxcbiAgX19hdHRyaWJ1dGVJbmRleDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICAvL0BpbnRlcm5hbFxuICBfX2RpcmVjdGl2ZT86IERpcmVjdGl2ZTtcblxuICAvL0BpbnRlcm5hbFxuICBfJHBhcmVudCE6IERpc2Nvbm5lY3RhYmxlO1xuXG4gIC8vIFRoZXNlIHdpbGwgb25seSBleGlzdCBvbiB0aGUgQXN5bmNEaXJlY3RpdmUgc3ViY2xhc3NcbiAgLy9AaW50ZXJuYWxcbiAgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuPzogU2V0PERpc2Nvbm5lY3RhYmxlPjtcbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgLy9AaW50ZXJuYWxcbiAgWydfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkJ10/KGlzQ29ubmVjdGVkOiBib29sZWFuKTogdm9pZDtcblxuICBjb25zdHJ1Y3RvcihfcGFydEluZm86IFBhcnRJbmZvKSB7fVxuXG4gIC8vIFNlZSBjb21tZW50IGluIERpc2Nvbm5lY3RhYmxlIGludGVyZmFjZSBmb3Igd2h5IHRoaXMgaXMgYSBnZXR0ZXJcbiAgZ2V0IF8kaXNDb25uZWN0ZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuXyRwYXJlbnQuXyRpc0Nvbm5lY3RlZDtcbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRpbml0aWFsaXplKFxuICAgIHBhcnQ6IFBhcnQsXG4gICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSxcbiAgICBhdHRyaWJ1dGVJbmRleDogbnVtYmVyIHwgdW5kZWZpbmVkXG4gICkge1xuICAgIHRoaXMuX19wYXJ0ID0gcGFydDtcbiAgICB0aGlzLl8kcGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMuX19hdHRyaWJ1dGVJbmRleCA9IGF0dHJpYnV0ZUluZGV4O1xuICB9XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRyZXNvbHZlKHBhcnQ6IFBhcnQsIHByb3BzOiBBcnJheTx1bmtub3duPik6IHVua25vd24ge1xuICAgIHJldHVybiB0aGlzLnVwZGF0ZShwYXJ0LCBwcm9wcyk7XG4gIH1cblxuICBhYnN0cmFjdCByZW5kZXIoLi4ucHJvcHM6IEFycmF5PHVua25vd24+KTogdW5rbm93bjtcblxuICB1cGRhdGUoX3BhcnQ6IFBhcnQsIHByb3BzOiBBcnJheTx1bmtub3duPik6IHVua25vd24ge1xuICAgIHJldHVybiB0aGlzLnJlbmRlciguLi5wcm9wcyk7XG4gIH1cbn1cbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge1xuICBfJExILFxuICBQYXJ0LFxuICBEaXJlY3RpdmVQYXJlbnQsXG4gIENvbXBpbGVkVGVtcGxhdGVSZXN1bHQsXG4gIE1heWJlQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdCxcbiAgVW5jb21waWxlZFRlbXBsYXRlUmVzdWx0LFxufSBmcm9tICcuL2xpdC1odG1sLmpzJztcbmltcG9ydCB7XG4gIERpcmVjdGl2ZVJlc3VsdCxcbiAgRGlyZWN0aXZlQ2xhc3MsXG4gIFBhcnRJbmZvLFxuICBBdHRyaWJ1dGVQYXJ0SW5mbyxcbn0gZnJvbSAnLi9kaXJlY3RpdmUuanMnO1xudHlwZSBQcmltaXRpdmUgPSBudWxsIHwgdW5kZWZpbmVkIHwgYm9vbGVhbiB8IG51bWJlciB8IHN0cmluZyB8IHN5bWJvbCB8IGJpZ2ludDtcblxuY29uc3Qge19DaGlsZFBhcnQ6IENoaWxkUGFydH0gPSBfJExIO1xuXG50eXBlIENoaWxkUGFydCA9IEluc3RhbmNlVHlwZTx0eXBlb2YgQ2hpbGRQYXJ0PjtcblxuY29uc3QgRU5BQkxFX1NIQURZRE9NX05PUEFUQ0ggPSB0cnVlO1xuXG5jb25zdCB3cmFwID1cbiAgRU5BQkxFX1NIQURZRE9NX05PUEFUQ0ggJiZcbiAgd2luZG93LlNoYWR5RE9NPy5pblVzZSAmJlxuICB3aW5kb3cuU2hhZHlET00/Lm5vUGF0Y2ggPT09IHRydWVcbiAgICA/IHdpbmRvdy5TaGFkeURPTSEud3JhcFxuICAgIDogKG5vZGU6IE5vZGUpID0+IG5vZGU7XG5cbi8qKlxuICogVGVzdHMgaWYgYSB2YWx1ZSBpcyBhIHByaW1pdGl2ZSB2YWx1ZS5cbiAqXG4gKiBTZWUgaHR0cHM6Ly90YzM5LmdpdGh1Yi5pby9lY21hMjYyLyNzZWMtdHlwZW9mLW9wZXJhdG9yXG4gKi9cbmV4cG9ydCBjb25zdCBpc1ByaW1pdGl2ZSA9ICh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFByaW1pdGl2ZSA9PlxuICB2YWx1ZSA9PT0gbnVsbCB8fCAodHlwZW9mIHZhbHVlICE9ICdvYmplY3QnICYmIHR5cGVvZiB2YWx1ZSAhPSAnZnVuY3Rpb24nKTtcblxuZXhwb3J0IGNvbnN0IFRlbXBsYXRlUmVzdWx0VHlwZSA9IHtcbiAgSFRNTDogMSxcbiAgU1ZHOiAyLFxuICBNQVRITUw6IDMsXG59IGFzIGNvbnN0O1xuXG5leHBvcnQgdHlwZSBUZW1wbGF0ZVJlc3VsdFR5cGUgPVxuICAodHlwZW9mIFRlbXBsYXRlUmVzdWx0VHlwZSlba2V5b2YgdHlwZW9mIFRlbXBsYXRlUmVzdWx0VHlwZV07XG5cbnR5cGUgSXNUZW1wbGF0ZVJlc3VsdCA9IHtcbiAgKHZhbDogdW5rbm93bik6IHZhbCBpcyBNYXliZUNvbXBpbGVkVGVtcGxhdGVSZXN1bHQ7XG4gIDxUIGV4dGVuZHMgVGVtcGxhdGVSZXN1bHRUeXBlPihcbiAgICB2YWw6IHVua25vd24sXG4gICAgdHlwZTogVFxuICApOiB2YWwgaXMgVW5jb21waWxlZFRlbXBsYXRlUmVzdWx0PFQ+O1xufTtcblxuLyoqXG4gKiBUZXN0cyBpZiBhIHZhbHVlIGlzIGEgVGVtcGxhdGVSZXN1bHQgb3IgYSBDb21waWxlZFRlbXBsYXRlUmVzdWx0LlxuICovXG5leHBvcnQgY29uc3QgaXNUZW1wbGF0ZVJlc3VsdDogSXNUZW1wbGF0ZVJlc3VsdCA9IChcbiAgdmFsdWU6IHVua25vd24sXG4gIHR5cGU/OiBUZW1wbGF0ZVJlc3VsdFR5cGVcbik6IHZhbHVlIGlzIFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdCA9PlxuICB0eXBlID09PSB1bmRlZmluZWRcbiAgICA/IC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgICAodmFsdWUgYXMgVW5jb21waWxlZFRlbXBsYXRlUmVzdWx0KT8uWydfJGxpdFR5cGUkJ10gIT09IHVuZGVmaW5lZFxuICAgIDogKHZhbHVlIGFzIFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdCk/LlsnXyRsaXRUeXBlJCddID09PSB0eXBlO1xuXG4vKipcbiAqIFRlc3RzIGlmIGEgdmFsdWUgaXMgYSBDb21waWxlZFRlbXBsYXRlUmVzdWx0LlxuICovXG5leHBvcnQgY29uc3QgaXNDb21waWxlZFRlbXBsYXRlUmVzdWx0ID0gKFxuICB2YWx1ZTogdW5rbm93blxuKTogdmFsdWUgaXMgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdCA9PiB7XG4gIHJldHVybiAodmFsdWUgYXMgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdCk/LlsnXyRsaXRUeXBlJCddPy5oICE9IG51bGw7XG59O1xuXG4vKipcbiAqIFRlc3RzIGlmIGEgdmFsdWUgaXMgYSBEaXJlY3RpdmVSZXN1bHQuXG4gKi9cbmV4cG9ydCBjb25zdCBpc0RpcmVjdGl2ZVJlc3VsdCA9ICh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIERpcmVjdGl2ZVJlc3VsdCA9PlxuICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAodmFsdWUgYXMgRGlyZWN0aXZlUmVzdWx0KT8uWydfJGxpdERpcmVjdGl2ZSQnXSAhPT0gdW5kZWZpbmVkO1xuXG4vKipcbiAqIFJldHJpZXZlcyB0aGUgRGlyZWN0aXZlIGNsYXNzIGZvciBhIERpcmVjdGl2ZVJlc3VsdFxuICovXG5leHBvcnQgY29uc3QgZ2V0RGlyZWN0aXZlQ2xhc3MgPSAodmFsdWU6IHVua25vd24pOiBEaXJlY3RpdmVDbGFzcyB8IHVuZGVmaW5lZCA9PlxuICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAodmFsdWUgYXMgRGlyZWN0aXZlUmVzdWx0KT8uWydfJGxpdERpcmVjdGl2ZSQnXTtcblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIGEgcGFydCBoYXMgb25seSBhIHNpbmdsZS1leHByZXNzaW9uIHdpdGggbm8gc3RyaW5ncyB0b1xuICogaW50ZXJwb2xhdGUgYmV0d2Vlbi5cbiAqXG4gKiBPbmx5IEF0dHJpYnV0ZVBhcnQgYW5kIFByb3BlcnR5UGFydCBjYW4gaGF2ZSBtdWx0aXBsZSBleHByZXNzaW9ucy5cbiAqIE11bHRpLWV4cHJlc3Npb24gcGFydHMgaGF2ZSBhIGBzdHJpbmdzYCBwcm9wZXJ0eSBhbmQgc2luZ2xlLWV4cHJlc3Npb25cbiAqIHBhcnRzIGRvIG5vdC5cbiAqL1xuZXhwb3J0IGNvbnN0IGlzU2luZ2xlRXhwcmVzc2lvbiA9IChwYXJ0OiBQYXJ0SW5mbykgPT5cbiAgKHBhcnQgYXMgQXR0cmlidXRlUGFydEluZm8pLnN0cmluZ3MgPT09IHVuZGVmaW5lZDtcblxuY29uc3QgY3JlYXRlTWFya2VyID0gKCkgPT4gZG9jdW1lbnQuY3JlYXRlQ29tbWVudCgnJyk7XG5cbi8qKlxuICogSW5zZXJ0cyBhIENoaWxkUGFydCBpbnRvIHRoZSBnaXZlbiBjb250YWluZXIgQ2hpbGRQYXJ0J3MgRE9NLCBlaXRoZXIgYXQgdGhlXG4gKiBlbmQgb2YgdGhlIGNvbnRhaW5lciBDaGlsZFBhcnQsIG9yIGJlZm9yZSB0aGUgb3B0aW9uYWwgYHJlZlBhcnRgLlxuICpcbiAqIFRoaXMgZG9lcyBub3QgYWRkIHRoZSBwYXJ0IHRvIHRoZSBjb250YWluZXJQYXJ0J3MgY29tbWl0dGVkIHZhbHVlLiBUaGF0IG11c3RcbiAqIGJlIGRvbmUgYnkgY2FsbGVycy5cbiAqXG4gKiBAcGFyYW0gY29udGFpbmVyUGFydCBQYXJ0IHdpdGhpbiB3aGljaCB0byBhZGQgdGhlIG5ldyBDaGlsZFBhcnRcbiAqIEBwYXJhbSByZWZQYXJ0IFBhcnQgYmVmb3JlIHdoaWNoIHRvIGFkZCB0aGUgbmV3IENoaWxkUGFydDsgd2hlbiBvbWl0dGVkIHRoZVxuICogICAgIHBhcnQgYWRkZWQgdG8gdGhlIGVuZCBvZiB0aGUgYGNvbnRhaW5lclBhcnRgXG4gKiBAcGFyYW0gcGFydCBQYXJ0IHRvIGluc2VydCwgb3IgdW5kZWZpbmVkIHRvIGNyZWF0ZSBhIG5ldyBwYXJ0XG4gKi9cbmV4cG9ydCBjb25zdCBpbnNlcnRQYXJ0ID0gKFxuICBjb250YWluZXJQYXJ0OiBDaGlsZFBhcnQsXG4gIHJlZlBhcnQ/OiBDaGlsZFBhcnQsXG4gIHBhcnQ/OiBDaGlsZFBhcnRcbik6IENoaWxkUGFydCA9PiB7XG4gIGNvbnN0IGNvbnRhaW5lciA9IHdyYXAoY29udGFpbmVyUGFydC5fJHN0YXJ0Tm9kZSkucGFyZW50Tm9kZSE7XG5cbiAgY29uc3QgcmVmTm9kZSA9XG4gICAgcmVmUGFydCA9PT0gdW5kZWZpbmVkID8gY29udGFpbmVyUGFydC5fJGVuZE5vZGUgOiByZWZQYXJ0Ll8kc3RhcnROb2RlO1xuXG4gIGlmIChwYXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICBjb25zdCBzdGFydE5vZGUgPSB3cmFwKGNvbnRhaW5lcikuaW5zZXJ0QmVmb3JlKGNyZWF0ZU1hcmtlcigpLCByZWZOb2RlKTtcbiAgICBjb25zdCBlbmROb2RlID0gd3JhcChjb250YWluZXIpLmluc2VydEJlZm9yZShjcmVhdGVNYXJrZXIoKSwgcmVmTm9kZSk7XG4gICAgcGFydCA9IG5ldyBDaGlsZFBhcnQoXG4gICAgICBzdGFydE5vZGUsXG4gICAgICBlbmROb2RlLFxuICAgICAgY29udGFpbmVyUGFydCxcbiAgICAgIGNvbnRhaW5lclBhcnQub3B0aW9uc1xuICAgICk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgZW5kTm9kZSA9IHdyYXAocGFydC5fJGVuZE5vZGUhKS5uZXh0U2libGluZztcbiAgICBjb25zdCBvbGRQYXJlbnQgPSBwYXJ0Ll8kcGFyZW50O1xuICAgIGNvbnN0IHBhcmVudENoYW5nZWQgPSBvbGRQYXJlbnQgIT09IGNvbnRhaW5lclBhcnQ7XG4gICAgaWYgKHBhcmVudENoYW5nZWQpIHtcbiAgICAgIHBhcnQuXyRyZXBhcmVudERpc2Nvbm5lY3RhYmxlcz8uKGNvbnRhaW5lclBhcnQpO1xuICAgICAgLy8gTm90ZSB0aGF0IGFsdGhvdWdoIGBfJHJlcGFyZW50RGlzY29ubmVjdGFibGVzYCB1cGRhdGVzIHRoZSBwYXJ0J3NcbiAgICAgIC8vIGBfJHBhcmVudGAgcmVmZXJlbmNlIGFmdGVyIHVubGlua2luZyBmcm9tIGl0cyBjdXJyZW50IHBhcmVudCwgdGhhdFxuICAgICAgLy8gbWV0aG9kIG9ubHkgZXhpc3RzIGlmIERpc2Nvbm5lY3RhYmxlcyBhcmUgcHJlc2VudCwgc28gd2UgbmVlZCB0b1xuICAgICAgLy8gdW5jb25kaXRpb25hbGx5IHNldCBpdCBoZXJlXG4gICAgICBwYXJ0Ll8kcGFyZW50ID0gY29udGFpbmVyUGFydDtcbiAgICAgIC8vIFNpbmNlIHRoZSBfJGlzQ29ubmVjdGVkIGdldHRlciBpcyBzb21ld2hhdCBjb3N0bHksIG9ubHlcbiAgICAgIC8vIHJlYWQgaXQgb25jZSB3ZSBrbm93IHRoZSBzdWJ0cmVlIGhhcyBkaXJlY3RpdmVzIHRoYXQgbmVlZFxuICAgICAgLy8gdG8gYmUgbm90aWZpZWRcbiAgICAgIGxldCBuZXdDb25uZWN0aW9uU3RhdGU7XG4gICAgICBpZiAoXG4gICAgICAgIHBhcnQuXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgIChuZXdDb25uZWN0aW9uU3RhdGUgPSBjb250YWluZXJQYXJ0Ll8kaXNDb25uZWN0ZWQpICE9PVxuICAgICAgICAgIG9sZFBhcmVudCEuXyRpc0Nvbm5lY3RlZFxuICAgICAgKSB7XG4gICAgICAgIHBhcnQuXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZChuZXdDb25uZWN0aW9uU3RhdGUpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZW5kTm9kZSAhPT0gcmVmTm9kZSB8fCBwYXJlbnRDaGFuZ2VkKSB7XG4gICAgICBsZXQgc3RhcnQ6IE5vZGUgfCBudWxsID0gcGFydC5fJHN0YXJ0Tm9kZTtcbiAgICAgIHdoaWxlIChzdGFydCAhPT0gZW5kTm9kZSkge1xuICAgICAgICBjb25zdCBuOiBOb2RlIHwgbnVsbCA9IHdyYXAoc3RhcnQhKS5uZXh0U2libGluZztcbiAgICAgICAgd3JhcChjb250YWluZXIpLmluc2VydEJlZm9yZShzdGFydCEsIHJlZk5vZGUpO1xuICAgICAgICBzdGFydCA9IG47XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhcnQ7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIHZhbHVlIG9mIGEgUGFydC5cbiAqXG4gKiBOb3RlIHRoYXQgdGhpcyBzaG91bGQgb25seSBiZSB1c2VkIHRvIHNldC91cGRhdGUgdGhlIHZhbHVlIG9mIHVzZXItY3JlYXRlZFxuICogcGFydHMgKGkuZS4gdGhvc2UgY3JlYXRlZCB1c2luZyBgaW5zZXJ0UGFydGApOyBpdCBzaG91bGQgbm90IGJlIHVzZWRcbiAqIGJ5IGRpcmVjdGl2ZXMgdG8gc2V0IHRoZSB2YWx1ZSBvZiB0aGUgZGlyZWN0aXZlJ3MgY29udGFpbmVyIHBhcnQuIERpcmVjdGl2ZXNcbiAqIHNob3VsZCByZXR1cm4gYSB2YWx1ZSBmcm9tIGB1cGRhdGVgL2ByZW5kZXJgIHRvIHVwZGF0ZSB0aGVpciBwYXJ0IHN0YXRlLlxuICpcbiAqIEZvciBkaXJlY3RpdmVzIHRoYXQgcmVxdWlyZSBzZXR0aW5nIHRoZWlyIHBhcnQgdmFsdWUgYXN5bmNocm9ub3VzbHksIHRoZXlcbiAqIHNob3VsZCBleHRlbmQgYEFzeW5jRGlyZWN0aXZlYCBhbmQgY2FsbCBgdGhpcy5zZXRWYWx1ZSgpYC5cbiAqXG4gKiBAcGFyYW0gcGFydCBQYXJ0IHRvIHNldFxuICogQHBhcmFtIHZhbHVlIFZhbHVlIHRvIHNldFxuICogQHBhcmFtIGluZGV4IEZvciBgQXR0cmlidXRlUGFydGBzLCB0aGUgaW5kZXggdG8gc2V0XG4gKiBAcGFyYW0gZGlyZWN0aXZlUGFyZW50IFVzZWQgaW50ZXJuYWxseTsgc2hvdWxkIG5vdCBiZSBzZXQgYnkgdXNlclxuICovXG5leHBvcnQgY29uc3Qgc2V0Q2hpbGRQYXJ0VmFsdWUgPSA8VCBleHRlbmRzIENoaWxkUGFydD4oXG4gIHBhcnQ6IFQsXG4gIHZhbHVlOiB1bmtub3duLFxuICBkaXJlY3RpdmVQYXJlbnQ6IERpcmVjdGl2ZVBhcmVudCA9IHBhcnRcbik6IFQgPT4ge1xuICBwYXJ0Ll8kc2V0VmFsdWUodmFsdWUsIGRpcmVjdGl2ZVBhcmVudCk7XG4gIHJldHVybiBwYXJ0O1xufTtcblxuLy8gQSBzZW50aW5lbCB2YWx1ZSB0aGF0IGNhbiBuZXZlciBhcHBlYXIgYXMgYSBwYXJ0IHZhbHVlIGV4Y2VwdCB3aGVuIHNldCBieVxuLy8gbGl2ZSgpLiBVc2VkIHRvIGZvcmNlIGEgZGlydHktY2hlY2sgdG8gZmFpbCBhbmQgY2F1c2UgYSByZS1yZW5kZXIuXG5jb25zdCBSRVNFVF9WQUxVRSA9IHt9O1xuXG4vKipcbiAqIFNldHMgdGhlIGNvbW1pdHRlZCB2YWx1ZSBvZiBhIENoaWxkUGFydCBkaXJlY3RseSB3aXRob3V0IHRyaWdnZXJpbmcgdGhlXG4gKiBjb21taXQgc3RhZ2Ugb2YgdGhlIHBhcnQuXG4gKlxuICogVGhpcyBpcyB1c2VmdWwgaW4gY2FzZXMgd2hlcmUgYSBkaXJlY3RpdmUgbmVlZHMgdG8gdXBkYXRlIHRoZSBwYXJ0IHN1Y2hcbiAqIHRoYXQgdGhlIG5leHQgdXBkYXRlIGRldGVjdHMgYSB2YWx1ZSBjaGFuZ2Ugb3Igbm90LiBXaGVuIHZhbHVlIGlzIG9taXR0ZWQsXG4gKiB0aGUgbmV4dCB1cGRhdGUgd2lsbCBiZSBndWFyYW50ZWVkIHRvIGJlIGRldGVjdGVkIGFzIGEgY2hhbmdlLlxuICpcbiAqIEBwYXJhbSBwYXJ0XG4gKiBAcGFyYW0gdmFsdWVcbiAqL1xuZXhwb3J0IGNvbnN0IHNldENvbW1pdHRlZFZhbHVlID0gKHBhcnQ6IFBhcnQsIHZhbHVlOiB1bmtub3duID0gUkVTRVRfVkFMVUUpID0+XG4gIChwYXJ0Ll8kY29tbWl0dGVkVmFsdWUgPSB2YWx1ZSk7XG5cbi8qKlxuICogUmV0dXJucyB0aGUgY29tbWl0dGVkIHZhbHVlIG9mIGEgQ2hpbGRQYXJ0LlxuICpcbiAqIFRoZSBjb21taXR0ZWQgdmFsdWUgaXMgdXNlZCBmb3IgY2hhbmdlIGRldGVjdGlvbiBhbmQgZWZmaWNpZW50IHVwZGF0ZXMgb2ZcbiAqIHRoZSBwYXJ0LiBJdCBjYW4gZGlmZmVyIGZyb20gdGhlIHZhbHVlIHNldCBieSB0aGUgdGVtcGxhdGUgb3IgZGlyZWN0aXZlIGluXG4gKiBjYXNlcyB3aGVyZSB0aGUgdGVtcGxhdGUgdmFsdWUgaXMgdHJhbnNmb3JtZWQgYmVmb3JlIGJlaW5nIGNvbW1pdHRlZC5cbiAqXG4gKiAtIGBUZW1wbGF0ZVJlc3VsdGBzIGFyZSBjb21taXR0ZWQgYXMgYSBgVGVtcGxhdGVJbnN0YW5jZWBcbiAqIC0gSXRlcmFibGVzIGFyZSBjb21taXR0ZWQgYXMgYEFycmF5PENoaWxkUGFydD5gXG4gKiAtIEFsbCBvdGhlciB0eXBlcyBhcmUgY29tbWl0dGVkIGFzIHRoZSB0ZW1wbGF0ZSB2YWx1ZSBvciB2YWx1ZSByZXR1cm5lZCBvclxuICogICBzZXQgYnkgYSBkaXJlY3RpdmUuXG4gKlxuICogQHBhcmFtIHBhcnRcbiAqL1xuZXhwb3J0IGNvbnN0IGdldENvbW1pdHRlZFZhbHVlID0gKHBhcnQ6IENoaWxkUGFydCkgPT4gcGFydC5fJGNvbW1pdHRlZFZhbHVlO1xuXG4vKipcbiAqIFJlbW92ZXMgYSBDaGlsZFBhcnQgZnJvbSB0aGUgRE9NLCBpbmNsdWRpbmcgYW55IG9mIGl0cyBjb250ZW50LlxuICpcbiAqIEBwYXJhbSBwYXJ0IFRoZSBQYXJ0IHRvIHJlbW92ZVxuICovXG5leHBvcnQgY29uc3QgcmVtb3ZlUGFydCA9IChwYXJ0OiBDaGlsZFBhcnQpID0+IHtcbiAgcGFydC5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkPy4oZmFsc2UsIHRydWUpO1xuICBsZXQgc3RhcnQ6IENoaWxkTm9kZSB8IG51bGwgPSBwYXJ0Ll8kc3RhcnROb2RlO1xuICBjb25zdCBlbmQ6IENoaWxkTm9kZSB8IG51bGwgPSB3cmFwKHBhcnQuXyRlbmROb2RlISkubmV4dFNpYmxpbmc7XG4gIHdoaWxlIChzdGFydCAhPT0gZW5kKSB7XG4gICAgY29uc3QgbjogQ2hpbGROb2RlIHwgbnVsbCA9IHdyYXAoc3RhcnQhKS5uZXh0U2libGluZztcbiAgICAod3JhcChzdGFydCEpIGFzIENoaWxkTm9kZSkucmVtb3ZlKCk7XG4gICAgc3RhcnQgPSBuO1xuICB9XG59O1xuXG5leHBvcnQgY29uc3QgY2xlYXJQYXJ0ID0gKHBhcnQ6IENoaWxkUGFydCkgPT4ge1xuICBwYXJ0Ll8kY2xlYXIoKTtcbn07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLyoqXG4gKiBPdmVydmlldzpcbiAqXG4gKiBUaGlzIG1vZHVsZSBpcyBkZXNpZ25lZCB0byBhZGQgc3VwcG9ydCBmb3IgYW4gYXN5bmMgYHNldFZhbHVlYCBBUEkgYW5kXG4gKiBgZGlzY29ubmVjdGVkYCBjYWxsYmFjayB0byBkaXJlY3RpdmVzIHdpdGggdGhlIGxlYXN0IGltcGFjdCBvbiB0aGUgY29yZVxuICogcnVudGltZSBvciBwYXlsb2FkIHdoZW4gdGhhdCBmZWF0dXJlIGlzIG5vdCB1c2VkLlxuICpcbiAqIFRoZSBzdHJhdGVneSBpcyB0byBpbnRyb2R1Y2UgYSBgQXN5bmNEaXJlY3RpdmVgIHN1YmNsYXNzIG9mXG4gKiBgRGlyZWN0aXZlYCB0aGF0IGNsaW1icyB0aGUgXCJwYXJlbnRcIiB0cmVlIGluIGl0cyBjb25zdHJ1Y3RvciB0byBub3RlIHdoaWNoXG4gKiBicmFuY2hlcyBvZiBsaXQtaHRtbCdzIFwibG9naWNhbCB0cmVlXCIgb2YgZGF0YSBzdHJ1Y3R1cmVzIGNvbnRhaW4gc3VjaFxuICogZGlyZWN0aXZlcyBhbmQgdGh1cyBuZWVkIHRvIGJlIGNyYXdsZWQgd2hlbiBhIHN1YnRyZWUgaXMgYmVpbmcgY2xlYXJlZCAob3JcbiAqIG1hbnVhbGx5IGRpc2Nvbm5lY3RlZCkgaW4gb3JkZXIgdG8gcnVuIHRoZSBgZGlzY29ubmVjdGVkYCBjYWxsYmFjay5cbiAqXG4gKiBUaGUgXCJub2Rlc1wiIG9mIHRoZSBsb2dpY2FsIHRyZWUgaW5jbHVkZSBQYXJ0cywgVGVtcGxhdGVJbnN0YW5jZXMgKGZvciB3aGVuIGFcbiAqIFRlbXBsYXRlUmVzdWx0IGlzIGNvbW1pdHRlZCB0byBhIHZhbHVlIG9mIGEgQ2hpbGRQYXJ0KSwgYW5kIERpcmVjdGl2ZXM7IHRoZXNlXG4gKiBhbGwgaW1wbGVtZW50IGEgY29tbW9uIGludGVyZmFjZSBjYWxsZWQgYERpc2Nvbm5lY3RhYmxlQ2hpbGRgLiBFYWNoIGhhcyBhXG4gKiBgXyRwYXJlbnRgIHJlZmVyZW5jZSB3aGljaCBpcyBzZXQgZHVyaW5nIGNvbnN0cnVjdGlvbiBpbiB0aGUgY29yZSBjb2RlLCBhbmQgYVxuICogYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAgZmllbGQgd2hpY2ggaXMgaW5pdGlhbGx5IHVuZGVmaW5lZC5cbiAqXG4gKiBUaGUgc3BhcnNlIHRyZWUgY3JlYXRlZCBieSBtZWFucyBvZiB0aGUgYEFzeW5jRGlyZWN0aXZlYCBjb25zdHJ1Y3RvclxuICogY3Jhd2xpbmcgdXAgdGhlIGBfJHBhcmVudGAgdHJlZSBhbmQgcGxhY2luZyBhIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gIFNldFxuICogb24gZWFjaCBwYXJlbnQgdGhhdCBpbmNsdWRlcyBlYWNoIGNoaWxkIHRoYXQgY29udGFpbnMgYVxuICogYEFzeW5jRGlyZWN0aXZlYCBkaXJlY3RseSBvciB0cmFuc2l0aXZlbHkgdmlhIGl0cyBjaGlsZHJlbi4gSW4gb3JkZXIgdG9cbiAqIG5vdGlmeSBjb25uZWN0aW9uIHN0YXRlIGNoYW5nZXMgYW5kIGRpc2Nvbm5lY3QgKG9yIHJlY29ubmVjdCkgYSB0cmVlLCB0aGVcbiAqIGBfJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkYCBBUEkgaXMgcGF0Y2hlZCBvbnRvIENoaWxkUGFydHMgYXMgYSBkaXJlY3RpdmVcbiAqIGNsaW1icyB0aGUgcGFyZW50IHRyZWUsIHdoaWNoIGlzIGNhbGxlZCBieSB0aGUgY29yZSB3aGVuIGNsZWFyaW5nIGEgcGFydCBpZlxuICogaXQgZXhpc3RzLiBXaGVuIGNhbGxlZCwgdGhhdCBtZXRob2QgaXRlcmF0ZXMgb3ZlciB0aGUgc3BhcnNlIHRyZWUgb2ZcbiAqIFNldDxEaXNjb25uZWN0YWJsZUNoaWxkcmVuPiBidWlsdCB1cCBieSBBc3luY0RpcmVjdGl2ZXMsIGFuZCBjYWxsc1xuICogYF8kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWRgIG9uIGFueSBkaXJlY3RpdmVzIHRoYXQgYXJlIGVuY291bnRlcmVkXG4gKiBpbiB0aGF0IHRyZWUsIHJ1bm5pbmcgdGhlIHJlcXVpcmVkIGNhbGxiYWNrcy5cbiAqXG4gKiBBIGdpdmVuIFwibG9naWNhbCB0cmVlXCIgb2YgbGl0LWh0bWwgZGF0YS1zdHJ1Y3R1cmVzIG1pZ2h0IGxvb2sgbGlrZSB0aGlzOlxuICpcbiAqICBDaGlsZFBhcnQoTjEpIF8kZEM9W0QyLFQzXVxuICogICAuX2RpcmVjdGl2ZVxuICogICAgIEFzeW5jRGlyZWN0aXZlKEQyKVxuICogICAuX3ZhbHVlIC8vIHVzZXIgdmFsdWUgd2FzIFRlbXBsYXRlUmVzdWx0XG4gKiAgICAgVGVtcGxhdGVJbnN0YW5jZShUMykgXyRkQz1bQTQsQTYsTjEwLE4xMl1cbiAqICAgICAgLl8kcGFydHNbXVxuICogICAgICAgIEF0dHJpYnV0ZVBhcnQoQTQpIF8kZEM9W0Q1XVxuICogICAgICAgICAuX2RpcmVjdGl2ZXNbXVxuICogICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQ1KVxuICogICAgICAgIEF0dHJpYnV0ZVBhcnQoQTYpIF8kZEM9W0Q3LEQ4XVxuICogICAgICAgICAuX2RpcmVjdGl2ZXNbXVxuICogICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQ3KVxuICogICAgICAgICAgIERpcmVjdGl2ZShEOCkgXyRkQz1bRDldXG4gKiAgICAgICAgICAgIC5fZGlyZWN0aXZlXG4gKiAgICAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDkpXG4gKiAgICAgICAgQ2hpbGRQYXJ0KE4xMCkgXyRkQz1bRDExXVxuICogICAgICAgICAuX2RpcmVjdGl2ZVxuICogICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQxMSlcbiAqICAgICAgICAgLl92YWx1ZVxuICogICAgICAgICAgIHN0cmluZ1xuICogICAgICAgIENoaWxkUGFydChOMTIpIF8kZEM9W0QxMyxOMTQsTjE2XVxuICogICAgICAgICAuX2RpcmVjdGl2ZVxuICogICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQxMylcbiAqICAgICAgICAgLl92YWx1ZSAvLyB1c2VyIHZhbHVlIHdhcyBpdGVyYWJsZVxuICogICAgICAgICAgIEFycmF5PENoaWxkUGFydD5cbiAqICAgICAgICAgICAgIENoaWxkUGFydChOMTQpIF8kZEM9W0QxNV1cbiAqICAgICAgICAgICAgICAuX3ZhbHVlXG4gKiAgICAgICAgICAgICAgICBzdHJpbmdcbiAqICAgICAgICAgICAgIENoaWxkUGFydChOMTYpIF8kZEM9W0QxNyxUMThdXG4gKiAgICAgICAgICAgICAgLl9kaXJlY3RpdmVcbiAqICAgICAgICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQxNylcbiAqICAgICAgICAgICAgICAuX3ZhbHVlIC8vIHVzZXIgdmFsdWUgd2FzIFRlbXBsYXRlUmVzdWx0XG4gKiAgICAgICAgICAgICAgICBUZW1wbGF0ZUluc3RhbmNlKFQxOCkgXyRkQz1bQTE5LEEyMSxOMjVdXG4gKiAgICAgICAgICAgICAgICAgLl8kcGFydHNbXVxuICogICAgICAgICAgICAgICAgICAgQXR0cmlidXRlUGFydChBMTkpIF8kZEM9W0QyMF1cbiAqICAgICAgICAgICAgICAgICAgICAuX2RpcmVjdGl2ZXNbXVxuICogICAgICAgICAgICAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDIwKVxuICogICAgICAgICAgICAgICAgICAgQXR0cmlidXRlUGFydChBMjEpIF8kZEM9WzIyLDIzXVxuICogICAgICAgICAgICAgICAgICAgIC5fZGlyZWN0aXZlc1tdXG4gKiAgICAgICAgICAgICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEMjIpXG4gKiAgICAgICAgICAgICAgICAgICAgICBEaXJlY3RpdmUoRDIzKSBfJGRDPVtEMjRdXG4gKiAgICAgICAgICAgICAgICAgICAgICAgLl9kaXJlY3RpdmVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQyNClcbiAqICAgICAgICAgICAgICAgICAgIENoaWxkUGFydChOMjUpIF8kZEM9W0QyNl1cbiAqICAgICAgICAgICAgICAgICAgICAuX2RpcmVjdGl2ZVxuICogICAgICAgICAgICAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDI2KVxuICogICAgICAgICAgICAgICAgICAgIC5fdmFsdWVcbiAqICAgICAgICAgICAgICAgICAgICAgIHN0cmluZ1xuICpcbiAqIEV4YW1wbGUgMTogVGhlIGRpcmVjdGl2ZSBpbiBDaGlsZFBhcnQoTjEyKSB1cGRhdGVzIGFuZCByZXR1cm5zIGBub3RoaW5nYC4gVGhlXG4gKiBDaGlsZFBhcnQgd2lsbCBfY2xlYXIoKSBpdHNlbGYsIGFuZCBzbyB3ZSBuZWVkIHRvIGRpc2Nvbm5lY3QgdGhlIFwidmFsdWVcIiBvZlxuICogdGhlIENoaWxkUGFydCAoYnV0IG5vdCBpdHMgZGlyZWN0aXZlKS4gSW4gdGhpcyBjYXNlLCB3aGVuIGBfY2xlYXIoKWAgY2FsbHNcbiAqIGBfJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkKClgLCB3ZSBkb24ndCBpdGVyYXRlIGFsbCBvZiB0aGVcbiAqIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbiwgcmF0aGVyIHdlIGRvIGEgdmFsdWUtc3BlY2lmaWMgZGlzY29ubmVjdGlvbjogaS5lLlxuICogc2luY2UgdGhlIF92YWx1ZSB3YXMgYW4gQXJyYXk8Q2hpbGRQYXJ0PiAoYmVjYXVzZSBhbiBpdGVyYWJsZSBoYWQgYmVlblxuICogY29tbWl0dGVkKSwgd2UgaXRlcmF0ZSB0aGUgYXJyYXkgb2YgQ2hpbGRQYXJ0cyAoTjE0LCBOMTYpIGFuZCBydW5cbiAqIGBzZXRDb25uZWN0ZWRgIG9uIHRoZW0gKHdoaWNoIGRvZXMgcmVjdXJzZSBkb3duIHRoZSBmdWxsIHRyZWUgb2ZcbiAqIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gIGJlbG93IGl0LCBhbmQgYWxzbyByZW1vdmVzIE4xNCBhbmQgTjE2IGZyb20gTjEyJ3NcbiAqIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gKS4gT25jZSB0aGUgdmFsdWVzIGhhdmUgYmVlbiBkaXNjb25uZWN0ZWQsIHdlIHRoZW5cbiAqIGNoZWNrIHdoZXRoZXIgdGhlIENoaWxkUGFydChOMTIpJ3MgbGlzdCBvZiBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCBpcyBlbXB0eVxuICogKGFuZCB3b3VsZCByZW1vdmUgaXQgZnJvbSBpdHMgcGFyZW50IFRlbXBsYXRlSW5zdGFuY2UoVDMpIGlmIHNvKSwgYnV0IHNpbmNlXG4gKiBpdCB3b3VsZCBzdGlsbCBjb250YWluIGl0cyBkaXJlY3RpdmUgRDEzLCBpdCBzdGF5cyBpbiB0aGUgZGlzY29ubmVjdGFibGVcbiAqIHRyZWUuXG4gKlxuICogRXhhbXBsZSAyOiBJbiB0aGUgY291cnNlIG9mIEV4YW1wbGUgMSwgYHNldENvbm5lY3RlZGAgd2lsbCByZWFjaFxuICogQ2hpbGRQYXJ0KE4xNik7IGluIHRoaXMgY2FzZSB0aGUgZW50aXJlIHBhcnQgaXMgYmVpbmcgZGlzY29ubmVjdGVkLCBzbyB3ZVxuICogc2ltcGx5IGl0ZXJhdGUgYWxsIG9mIE4xNidzIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gIChEMTcsVDE4KSBhbmRcbiAqIHJlY3Vyc2l2ZWx5IHJ1biBgc2V0Q29ubmVjdGVkYCBvbiB0aGVtLiBOb3RlIHRoYXQgd2Ugb25seSByZW1vdmUgY2hpbGRyZW5cbiAqIGZyb20gYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAgZm9yIHRoZSB0b3AtbGV2ZWwgdmFsdWVzIGJlaW5nIGRpc2Nvbm5lY3RlZFxuICogb24gYSBjbGVhcjsgZG9pbmcgdGhpcyBib29ra2VlcGluZyBsb3dlciBpbiB0aGUgdHJlZSBpcyB3YXN0ZWZ1bCBzaW5jZSBpdCdzXG4gKiBhbGwgYmVpbmcgdGhyb3duIGF3YXkuXG4gKlxuICogRXhhbXBsZSAzOiBJZiB0aGUgTGl0RWxlbWVudCBjb250YWluaW5nIHRoZSBlbnRpcmUgdHJlZSBhYm92ZSBiZWNvbWVzXG4gKiBkaXNjb25uZWN0ZWQsIGl0IHdpbGwgcnVuIGBjaGlsZFBhcnQuc2V0Q29ubmVjdGVkKClgICh3aGljaCBjYWxsc1xuICogYGNoaWxkUGFydC5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkKClgIGlmIGl0IGV4aXN0cyk7IGluIHRoaXMgY2FzZSwgd2VcbiAqIHJlY3Vyc2l2ZWx5IHJ1biBgc2V0Q29ubmVjdGVkKClgIG92ZXIgdGhlIGVudGlyZSB0cmVlLCB3aXRob3V0IHJlbW92aW5nIGFueVxuICogY2hpbGRyZW4gZnJvbSBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCwgc2luY2UgdGhpcyB0cmVlIGlzIHJlcXVpcmVkIHRvXG4gKiByZS1jb25uZWN0IHRoZSB0cmVlLCB3aGljaCBkb2VzIHRoZSBzYW1lIG9wZXJhdGlvbiwgc2ltcGx5IHBhc3NpbmdcbiAqIGBpc0Nvbm5lY3RlZDogdHJ1ZWAgZG93biB0aGUgdHJlZSwgc2lnbmFsaW5nIHdoaWNoIGNhbGxiYWNrIHRvIHJ1bi5cbiAqL1xuXG5pbXBvcnQge0F0dHJpYnV0ZVBhcnQsIENoaWxkUGFydCwgRGlzY29ubmVjdGFibGUsIFBhcnR9IGZyb20gJy4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtpc1NpbmdsZUV4cHJlc3Npb259IGZyb20gJy4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuaW1wb3J0IHtEaXJlY3RpdmUsIFBhcnRJbmZvLCBQYXJ0VHlwZX0gZnJvbSAnLi9kaXJlY3RpdmUuanMnO1xuZXhwb3J0ICogZnJvbSAnLi9kaXJlY3RpdmUuanMnO1xuXG5jb25zdCBERVZfTU9ERSA9IHRydWU7XG5cbi8qKlxuICogUmVjdXJzaXZlbHkgd2Fsa3MgZG93biB0aGUgdHJlZSBvZiBQYXJ0cy9UZW1wbGF0ZUluc3RhbmNlcy9EaXJlY3RpdmVzIHRvIHNldFxuICogdGhlIGNvbm5lY3RlZCBzdGF0ZSBvZiBkaXJlY3RpdmVzIGFuZCBydW4gYGRpc2Nvbm5lY3RlZGAvIGByZWNvbm5lY3RlZGBcbiAqIGNhbGxiYWNrcy5cbiAqXG4gKiBAcmV0dXJuIFRydWUgaWYgdGhlcmUgd2VyZSBjaGlsZHJlbiB0byBkaXNjb25uZWN0OyBmYWxzZSBvdGhlcndpc2VcbiAqL1xuY29uc3Qgbm90aWZ5Q2hpbGRyZW5Db25uZWN0ZWRDaGFuZ2VkID0gKFxuICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICBpc0Nvbm5lY3RlZDogYm9vbGVhblxuKTogYm9vbGVhbiA9PiB7XG4gIGNvbnN0IGNoaWxkcmVuID0gcGFyZW50Ll8kZGlzY29ubmVjdGFibGVDaGlsZHJlbjtcbiAgaWYgKGNoaWxkcmVuID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgZm9yIChjb25zdCBvYmogb2YgY2hpbGRyZW4pIHtcbiAgICAvLyBUaGUgZXhpc3RlbmNlIG9mIGBfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkYCBpcyB1c2VkIGFzIGEgXCJicmFuZFwiIHRvXG4gICAgLy8gZGlzYW1iaWd1YXRlIEFzeW5jRGlyZWN0aXZlcyBmcm9tIG90aGVyIERpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5cbiAgICAvLyAoYXMgb3Bwb3NlZCB0byB1c2luZyBhbiBpbnN0YW5jZW9mIGNoZWNrIHRvIGtub3cgd2hlbiB0byBjYWxsIGl0KTsgdGhlXG4gICAgLy8gcmVkdW5kYW5jeSBvZiBcIkRpcmVjdGl2ZVwiIGluIHRoZSBBUEkgbmFtZSBpcyB0byBhdm9pZCBjb25mbGljdGluZyB3aXRoXG4gICAgLy8gYF8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWRgLCB3aGljaCBleGlzdHMgYENoaWxkUGFydHNgIHdoaWNoIGFyZSBhbHNvIGluXG4gICAgLy8gdGhpcyBsaXN0XG4gICAgLy8gRGlzY29ubmVjdCBEaXJlY3RpdmUgKGFuZCBhbnkgbmVzdGVkIGRpcmVjdGl2ZXMgY29udGFpbmVkIHdpdGhpbilcbiAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIChvYmogYXMgQXN5bmNEaXJlY3RpdmUpWydfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkJ10/LihcbiAgICAgIGlzQ29ubmVjdGVkLFxuICAgICAgZmFsc2VcbiAgICApO1xuICAgIC8vIERpc2Nvbm5lY3QgUGFydC9UZW1wbGF0ZUluc3RhbmNlXG4gICAgbm90aWZ5Q2hpbGRyZW5Db25uZWN0ZWRDaGFuZ2VkKG9iaiwgaXNDb25uZWN0ZWQpO1xuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIHRoZSBnaXZlbiBjaGlsZCBmcm9tIGl0cyBwYXJlbnQgbGlzdCBvZiBkaXNjb25uZWN0YWJsZSBjaGlsZHJlbiwgYW5kXG4gKiBpZiB0aGUgcGFyZW50IGxpc3QgYmVjb21lcyBlbXB0eSBhcyBhIHJlc3VsdCwgcmVtb3ZlcyB0aGUgcGFyZW50IGZyb20gaXRzXG4gKiBwYXJlbnQsIGFuZCBzbyBmb3J0aCB1cCB0aGUgdHJlZSB3aGVuIHRoYXQgY2F1c2VzIHN1YnNlcXVlbnQgcGFyZW50IGxpc3RzIHRvXG4gKiBiZWNvbWUgZW1wdHkuXG4gKi9cbmNvbnN0IHJlbW92ZURpc2Nvbm5lY3RhYmxlRnJvbVBhcmVudCA9IChvYmo6IERpc2Nvbm5lY3RhYmxlKSA9PiB7XG4gIGxldCBwYXJlbnQsIGNoaWxkcmVuO1xuICBkbyB7XG4gICAgaWYgKChwYXJlbnQgPSBvYmouXyRwYXJlbnQpID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjaGlsZHJlbiA9IHBhcmVudC5fJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4hO1xuICAgIGNoaWxkcmVuLmRlbGV0ZShvYmopO1xuICAgIG9iaiA9IHBhcmVudDtcbiAgfSB3aGlsZSAoY2hpbGRyZW4/LnNpemUgPT09IDApO1xufTtcblxuY29uc3QgYWRkRGlzY29ubmVjdGFibGVUb1BhcmVudCA9IChvYmo6IERpc2Nvbm5lY3RhYmxlKSA9PiB7XG4gIC8vIENsaW1iIHRoZSBwYXJlbnQgdHJlZSwgY3JlYXRpbmcgYSBzcGFyc2UgdHJlZSBvZiBjaGlsZHJlbiBuZWVkaW5nXG4gIC8vIGRpc2Nvbm5lY3Rpb25cbiAgZm9yIChsZXQgcGFyZW50OyAocGFyZW50ID0gb2JqLl8kcGFyZW50KTsgb2JqID0gcGFyZW50KSB7XG4gICAgbGV0IGNoaWxkcmVuID0gcGFyZW50Ll8kZGlzY29ubmVjdGFibGVDaGlsZHJlbjtcbiAgICBpZiAoY2hpbGRyZW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcGFyZW50Ll8kZGlzY29ubmVjdGFibGVDaGlsZHJlbiA9IGNoaWxkcmVuID0gbmV3IFNldCgpO1xuICAgIH0gZWxzZSBpZiAoY2hpbGRyZW4uaGFzKG9iaikpIHtcbiAgICAgIC8vIE9uY2Ugd2UndmUgcmVhY2hlZCBhIHBhcmVudCB0aGF0IGFscmVhZHkgY29udGFpbnMgdGhpcyBjaGlsZCwgd2VcbiAgICAgIC8vIGNhbiBzaG9ydC1jaXJjdWl0XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY2hpbGRyZW4uYWRkKG9iaik7XG4gICAgaW5zdGFsbERpc2Nvbm5lY3RBUEkocGFyZW50KTtcbiAgfVxufTtcblxuLyoqXG4gKiBDaGFuZ2VzIHRoZSBwYXJlbnQgcmVmZXJlbmNlIG9mIHRoZSBDaGlsZFBhcnQsIGFuZCB1cGRhdGVzIHRoZSBzcGFyc2UgdHJlZSBvZlxuICogRGlzY29ubmVjdGFibGUgY2hpbGRyZW4gYWNjb3JkaW5nbHkuXG4gKlxuICogTm90ZSwgdGhpcyBtZXRob2Qgd2lsbCBiZSBwYXRjaGVkIG9udG8gQ2hpbGRQYXJ0IGluc3RhbmNlcyBhbmQgY2FsbGVkIGZyb21cbiAqIHRoZSBjb3JlIGNvZGUgd2hlbiBwYXJ0cyBhcmUgbW92ZWQgYmV0d2VlbiBkaWZmZXJlbnQgcGFyZW50cy5cbiAqL1xuZnVuY3Rpb24gcmVwYXJlbnREaXNjb25uZWN0YWJsZXModGhpczogQ2hpbGRQYXJ0LCBuZXdQYXJlbnQ6IERpc2Nvbm5lY3RhYmxlKSB7XG4gIGlmICh0aGlzLl8kZGlzY29ubmVjdGFibGVDaGlsZHJlbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmVtb3ZlRGlzY29ubmVjdGFibGVGcm9tUGFyZW50KHRoaXMpO1xuICAgIHRoaXMuXyRwYXJlbnQgPSBuZXdQYXJlbnQ7XG4gICAgYWRkRGlzY29ubmVjdGFibGVUb1BhcmVudCh0aGlzKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLl8kcGFyZW50ID0gbmV3UGFyZW50O1xuICB9XG59XG5cbi8qKlxuICogU2V0cyB0aGUgY29ubmVjdGVkIHN0YXRlIG9uIGFueSBkaXJlY3RpdmVzIGNvbnRhaW5lZCB3aXRoaW4gdGhlIGNvbW1pdHRlZFxuICogdmFsdWUgb2YgdGhpcyBwYXJ0IChpLmUuIHdpdGhpbiBhIFRlbXBsYXRlSW5zdGFuY2Ugb3IgaXRlcmFibGUgb2ZcbiAqIENoaWxkUGFydHMpIGFuZCBydW5zIHRoZWlyIGBkaXNjb25uZWN0ZWRgL2ByZWNvbm5lY3RlZGBzLCBhcyB3ZWxsIGFzIHdpdGhpblxuICogYW55IGRpcmVjdGl2ZXMgc3RvcmVkIG9uIHRoZSBDaGlsZFBhcnQgKHdoZW4gYHZhbHVlT25seWAgaXMgZmFsc2UpLlxuICpcbiAqIGBpc0NsZWFyaW5nVmFsdWVgIHNob3VsZCBiZSBwYXNzZWQgYXMgYHRydWVgIG9uIGEgdG9wLWxldmVsIHBhcnQgdGhhdCBpc1xuICogY2xlYXJpbmcgaXRzZWxmLCBhbmQgbm90IGFzIGEgcmVzdWx0IG9mIHJlY3Vyc2l2ZWx5IGRpc2Nvbm5lY3RpbmcgZGlyZWN0aXZlc1xuICogYXMgcGFydCBvZiBhIGBjbGVhcmAgb3BlcmF0aW9uIGhpZ2hlciB1cCB0aGUgdHJlZS4gVGhpcyBib3RoIGVuc3VyZXMgdGhhdCBhbnlcbiAqIGRpcmVjdGl2ZSBvbiB0aGlzIENoaWxkUGFydCB0aGF0IHByb2R1Y2VkIGEgdmFsdWUgdGhhdCBjYXVzZWQgdGhlIGNsZWFyXG4gKiBvcGVyYXRpb24gaXMgbm90IGRpc2Nvbm5lY3RlZCwgYW5kIGFsc28gc2VydmVzIGFzIGEgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uXG4gKiB0byBhdm9pZCBuZWVkbGVzcyBib29ra2VlcGluZyB3aGVuIGEgc3VidHJlZSBpcyBnb2luZyBhd2F5OyB3aGVuIGNsZWFyaW5nIGFcbiAqIHN1YnRyZWUsIG9ubHkgdGhlIHRvcC1tb3N0IHBhcnQgbmVlZCB0byByZW1vdmUgaXRzZWxmIGZyb20gdGhlIHBhcmVudC5cbiAqXG4gKiBgZnJvbVBhcnRJbmRleGAgaXMgcGFzc2VkIG9ubHkgaW4gdGhlIGNhc2Ugb2YgYSBwYXJ0aWFsIGBfY2xlYXJgIHJ1bm5pbmcgYXMgYVxuICogcmVzdWx0IG9mIHRydW5jYXRpbmcgYW4gaXRlcmFibGUuXG4gKlxuICogTm90ZSwgdGhpcyBtZXRob2Qgd2lsbCBiZSBwYXRjaGVkIG9udG8gQ2hpbGRQYXJ0IGluc3RhbmNlcyBhbmQgY2FsbGVkIGZyb20gdGhlXG4gKiBjb3JlIGNvZGUgd2hlbiBwYXJ0cyBhcmUgY2xlYXJlZCBvciB0aGUgY29ubmVjdGlvbiBzdGF0ZSBpcyBjaGFuZ2VkIGJ5IHRoZVxuICogdXNlci5cbiAqL1xuZnVuY3Rpb24gbm90aWZ5Q2hpbGRQYXJ0Q29ubmVjdGVkQ2hhbmdlZChcbiAgdGhpczogQ2hpbGRQYXJ0LFxuICBpc0Nvbm5lY3RlZDogYm9vbGVhbixcbiAgaXNDbGVhcmluZ1ZhbHVlID0gZmFsc2UsXG4gIGZyb21QYXJ0SW5kZXggPSAwXG4pIHtcbiAgY29uc3QgdmFsdWUgPSB0aGlzLl8kY29tbWl0dGVkVmFsdWU7XG4gIGNvbnN0IGNoaWxkcmVuID0gdGhpcy5fJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW47XG4gIGlmIChjaGlsZHJlbiA9PT0gdW5kZWZpbmVkIHx8IGNoaWxkcmVuLnNpemUgPT09IDApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKGlzQ2xlYXJpbmdWYWx1ZSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgLy8gSXRlcmFibGUgY2FzZTogQW55IENoaWxkUGFydHMgY3JlYXRlZCBieSB0aGUgaXRlcmFibGUgc2hvdWxkIGJlXG4gICAgICAvLyBkaXNjb25uZWN0ZWQgYW5kIHJlbW92ZWQgZnJvbSB0aGlzIENoaWxkUGFydCdzIGRpc2Nvbm5lY3RhYmxlXG4gICAgICAvLyBjaGlsZHJlbiAoc3RhcnRpbmcgYXQgYGZyb21QYXJ0SW5kZXhgIGluIHRoZSBjYXNlIG9mIHRydW5jYXRpb24pXG4gICAgICBmb3IgKGxldCBpID0gZnJvbVBhcnRJbmRleDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5vdGlmeUNoaWxkcmVuQ29ubmVjdGVkQ2hhbmdlZCh2YWx1ZVtpXSwgZmFsc2UpO1xuICAgICAgICByZW1vdmVEaXNjb25uZWN0YWJsZUZyb21QYXJlbnQodmFsdWVbaV0pO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgLy8gVGVtcGxhdGVJbnN0YW5jZSBjYXNlOiBJZiB0aGUgdmFsdWUgaGFzIGRpc2Nvbm5lY3RhYmxlIGNoaWxkcmVuICh3aWxsXG4gICAgICAvLyBvbmx5IGJlIGluIHRoZSBjYXNlIHRoYXQgaXQgaXMgYSBUZW1wbGF0ZUluc3RhbmNlKSwgd2UgZGlzY29ubmVjdCBpdFxuICAgICAgLy8gYW5kIHJlbW92ZSBpdCBmcm9tIHRoaXMgQ2hpbGRQYXJ0J3MgZGlzY29ubmVjdGFibGUgY2hpbGRyZW5cbiAgICAgIG5vdGlmeUNoaWxkcmVuQ29ubmVjdGVkQ2hhbmdlZCh2YWx1ZSBhcyBEaXNjb25uZWN0YWJsZSwgZmFsc2UpO1xuICAgICAgcmVtb3ZlRGlzY29ubmVjdGFibGVGcm9tUGFyZW50KHZhbHVlIGFzIERpc2Nvbm5lY3RhYmxlKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbm90aWZ5Q2hpbGRyZW5Db25uZWN0ZWRDaGFuZ2VkKHRoaXMsIGlzQ29ubmVjdGVkKTtcbiAgfVxufVxuXG4vKipcbiAqIFBhdGNoZXMgZGlzY29ubmVjdGlvbiBBUEkgb250byBDaGlsZFBhcnRzLlxuICovXG5jb25zdCBpbnN0YWxsRGlzY29ubmVjdEFQSSA9IChvYmo6IERpc2Nvbm5lY3RhYmxlKSA9PiB7XG4gIGlmICgob2JqIGFzIENoaWxkUGFydCkudHlwZSA9PSBQYXJ0VHlwZS5DSElMRCkge1xuICAgIChvYmogYXMgQ2hpbGRQYXJ0KS5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkID8/PVxuICAgICAgbm90aWZ5Q2hpbGRQYXJ0Q29ubmVjdGVkQ2hhbmdlZDtcbiAgICAob2JqIGFzIENoaWxkUGFydCkuXyRyZXBhcmVudERpc2Nvbm5lY3RhYmxlcyA/Pz0gcmVwYXJlbnREaXNjb25uZWN0YWJsZXM7XG4gIH1cbn07XG5cbi8qKlxuICogQW4gYWJzdHJhY3QgYERpcmVjdGl2ZWAgYmFzZSBjbGFzcyB3aG9zZSBgZGlzY29ubmVjdGVkYCBtZXRob2Qgd2lsbCBiZVxuICogY2FsbGVkIHdoZW4gdGhlIHBhcnQgY29udGFpbmluZyB0aGUgZGlyZWN0aXZlIGlzIGNsZWFyZWQgYXMgYSByZXN1bHQgb2ZcbiAqIHJlLXJlbmRlcmluZywgb3Igd2hlbiB0aGUgdXNlciBjYWxscyBgcGFydC5zZXRDb25uZWN0ZWQoZmFsc2UpYCBvblxuICogYSBwYXJ0IHRoYXQgd2FzIHByZXZpb3VzbHkgcmVuZGVyZWQgY29udGFpbmluZyB0aGUgZGlyZWN0aXZlIChhcyBoYXBwZW5zXG4gKiB3aGVuIGUuZy4gYSBMaXRFbGVtZW50IGRpc2Nvbm5lY3RzIGZyb20gdGhlIERPTSkuXG4gKlxuICogSWYgYHBhcnQuc2V0Q29ubmVjdGVkKHRydWUpYCBpcyBzdWJzZXF1ZW50bHkgY2FsbGVkIG9uIGFcbiAqIGNvbnRhaW5pbmcgcGFydCwgdGhlIGRpcmVjdGl2ZSdzIGByZWNvbm5lY3RlZGAgbWV0aG9kIHdpbGwgYmUgY2FsbGVkIHByaW9yXG4gKiB0byBpdHMgbmV4dCBgdXBkYXRlYC9gcmVuZGVyYCBjYWxsYmFja3MuIFdoZW4gaW1wbGVtZW50aW5nIGBkaXNjb25uZWN0ZWRgLFxuICogYHJlY29ubmVjdGVkYCBzaG91bGQgYWxzbyBiZSBpbXBsZW1lbnRlZCB0byBiZSBjb21wYXRpYmxlIHdpdGggcmVjb25uZWN0aW9uLlxuICpcbiAqIE5vdGUgdGhhdCB1cGRhdGVzIG1heSBvY2N1ciB3aGlsZSB0aGUgZGlyZWN0aXZlIGlzIGRpc2Nvbm5lY3RlZC4gQXMgc3VjaCxcbiAqIGRpcmVjdGl2ZXMgc2hvdWxkIGdlbmVyYWxseSBjaGVjayB0aGUgYHRoaXMuaXNDb25uZWN0ZWRgIGZsYWcgZHVyaW5nXG4gKiByZW5kZXIvdXBkYXRlIHRvIGRldGVybWluZSB3aGV0aGVyIGl0IGlzIHNhZmUgdG8gc3Vic2NyaWJlIHRvIHJlc291cmNlc1xuICogdGhhdCBtYXkgcHJldmVudCBnYXJiYWdlIGNvbGxlY3Rpb24uXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBc3luY0RpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIC8vIEFzIG9wcG9zZWQgdG8gb3RoZXIgRGlzY29ubmVjdGFibGVzLCBBc3luY0RpcmVjdGl2ZXMgYWx3YXlzIGdldCBub3RpZmllZFxuICAvLyB3aGVuIHRoZSBSb290UGFydCBjb25uZWN0aW9uIGNoYW5nZXMsIHNvIHRoZSBwdWJsaWMgYGlzQ29ubmVjdGVkYFxuICAvLyBpcyBhIGxvY2FsbHkgc3RvcmVkIHZhcmlhYmxlIGluaXRpYWxpemVkIHZpYSBpdHMgcGFydCdzIGdldHRlciBhbmQgc3luY2VkXG4gIC8vIHZpYSBgXyRub3RpZnlEaXJlY3RpdmVDb25uZWN0aW9uQ2hhbmdlZGAuIFRoaXMgaXMgY2hlYXBlciB0aGFuIHVzaW5nXG4gIC8vIHRoZSBfJGlzQ29ubmVjdGVkIGdldHRlciwgd2hpY2ggaGFzIHRvIGxvb2sgYmFjayB1cCB0aGUgdHJlZSBlYWNoIHRpbWUuXG4gIC8qKlxuICAgKiBUaGUgY29ubmVjdGlvbiBzdGF0ZSBmb3IgdGhpcyBEaXJlY3RpdmUuXG4gICAqL1xuICBpc0Nvbm5lY3RlZCE6IGJvb2xlYW47XG5cbiAgLy8gQGludGVybmFsXG4gIG92ZXJyaWRlIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT4gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHRoZSBwYXJ0IHdpdGggaW50ZXJuYWwgZmllbGRzXG4gICAqIEBwYXJhbSBwYXJ0XG4gICAqIEBwYXJhbSBwYXJlbnRcbiAgICogQHBhcmFtIGF0dHJpYnV0ZUluZGV4XG4gICAqL1xuICBvdmVycmlkZSBfJGluaXRpYWxpemUoXG4gICAgcGFydDogUGFydCxcbiAgICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICAgIGF0dHJpYnV0ZUluZGV4OiBudW1iZXIgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgc3VwZXIuXyRpbml0aWFsaXplKHBhcnQsIHBhcmVudCwgYXR0cmlidXRlSW5kZXgpO1xuICAgIGFkZERpc2Nvbm5lY3RhYmxlVG9QYXJlbnQodGhpcyk7XG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IHBhcnQuXyRpc0Nvbm5lY3RlZDtcbiAgfVxuICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAvKipcbiAgICogQ2FsbGVkIGZyb20gdGhlIGNvcmUgY29kZSB3aGVuIGEgZGlyZWN0aXZlIGlzIGdvaW5nIGF3YXkgZnJvbSBhIHBhcnQgKGluXG4gICAqIHdoaWNoIGNhc2UgYHNob3VsZFJlbW92ZUZyb21QYXJlbnRgIHNob3VsZCBiZSB0cnVlKSwgYW5kIGZyb20gdGhlXG4gICAqIGBzZXRDaGlsZHJlbkNvbm5lY3RlZGAgaGVscGVyIGZ1bmN0aW9uIHdoZW4gcmVjdXJzaXZlbHkgY2hhbmdpbmcgdGhlXG4gICAqIGNvbm5lY3Rpb24gc3RhdGUgb2YgYSB0cmVlIChpbiB3aGljaCBjYXNlIGBzaG91bGRSZW1vdmVGcm9tUGFyZW50YCBzaG91bGRcbiAgICogYmUgZmFsc2UpLlxuICAgKlxuICAgKiBAcGFyYW0gaXNDb25uZWN0ZWRcbiAgICogQHBhcmFtIGlzQ2xlYXJpbmdEaXJlY3RpdmUgLSBUcnVlIHdoZW4gdGhlIGRpcmVjdGl2ZSBpdHNlbGYgaXMgYmVpbmdcbiAgICogICAgIHJlbW92ZWQ7IGZhbHNlIHdoZW4gdGhlIHRyZWUgaXMgYmVpbmcgZGlzY29ubmVjdGVkXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgb3ZlcnJpZGUgWydfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkJ10oXG4gICAgaXNDb25uZWN0ZWQ6IGJvb2xlYW4sXG4gICAgaXNDbGVhcmluZ0RpcmVjdGl2ZSA9IHRydWVcbiAgKSB7XG4gICAgaWYgKGlzQ29ubmVjdGVkICE9PSB0aGlzLmlzQ29ubmVjdGVkKSB7XG4gICAgICB0aGlzLmlzQ29ubmVjdGVkID0gaXNDb25uZWN0ZWQ7XG4gICAgICBpZiAoaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgdGhpcy5yZWNvbm5lY3RlZD8uKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmRpc2Nvbm5lY3RlZD8uKCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpc0NsZWFyaW5nRGlyZWN0aXZlKSB7XG4gICAgICBub3RpZnlDaGlsZHJlbkNvbm5lY3RlZENoYW5nZWQodGhpcywgaXNDb25uZWN0ZWQpO1xuICAgICAgcmVtb3ZlRGlzY29ubmVjdGFibGVGcm9tUGFyZW50KHRoaXMpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiB0aGUgZGlyZWN0aXZlJ3MgUGFydCBvdXRzaWRlIHRoZSBub3JtYWwgYHVwZGF0ZWAvYHJlbmRlcmBcbiAgICogbGlmZWN5Y2xlIG9mIGEgZGlyZWN0aXZlLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBzaG91bGQgbm90IGJlIGNhbGxlZCBzeW5jaHJvbm91c2x5IGZyb20gYSBkaXJlY3RpdmUncyBgdXBkYXRlYFxuICAgKiBvciBgcmVuZGVyYC5cbiAgICpcbiAgICogQHBhcmFtIGRpcmVjdGl2ZSBUaGUgZGlyZWN0aXZlIHRvIHVwZGF0ZVxuICAgKiBAcGFyYW0gdmFsdWUgVGhlIHZhbHVlIHRvIHNldFxuICAgKi9cbiAgc2V0VmFsdWUodmFsdWU6IHVua25vd24pIHtcbiAgICBpZiAoaXNTaW5nbGVFeHByZXNzaW9uKHRoaXMuX19wYXJ0IGFzIHVua25vd24gYXMgUGFydEluZm8pKSB7XG4gICAgICB0aGlzLl9fcGFydC5fJHNldFZhbHVlKHZhbHVlLCB0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gdGhpcy5fX2F0dHJpYnV0ZUluZGV4IHdpbGwgYmUgZGVmaW5lZCBpbiB0aGlzIGNhc2UsIGJ1dFxuICAgICAgLy8gYXNzZXJ0IGl0IGluIGRldiBtb2RlXG4gICAgICBpZiAoREVWX01PREUgJiYgdGhpcy5fX2F0dHJpYnV0ZUluZGV4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCB0aGlzLl9fYXR0cmlidXRlSW5kZXggdG8gYmUgYSBudW1iZXJgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5ld1ZhbHVlcyA9IFsuLi4odGhpcy5fX3BhcnQuXyRjb21taXR0ZWRWYWx1ZSBhcyBBcnJheTx1bmtub3duPildO1xuICAgICAgbmV3VmFsdWVzW3RoaXMuX19hdHRyaWJ1dGVJbmRleCFdID0gdmFsdWU7XG4gICAgICAodGhpcy5fX3BhcnQgYXMgQXR0cmlidXRlUGFydCkuXyRzZXRWYWx1ZShuZXdWYWx1ZXMsIHRoaXMsIDApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBVc2VyIGNhbGxiYWNrcyBmb3IgaW1wbGVtZW50aW5nIGxvZ2ljIHRvIHJlbGVhc2UgYW55IHJlc291cmNlcy9zdWJzY3JpcHRpb25zXG4gICAqIHRoYXQgbWF5IGhhdmUgYmVlbiByZXRhaW5lZCBieSB0aGlzIGRpcmVjdGl2ZS4gU2luY2UgZGlyZWN0aXZlcyBtYXkgYWxzbyBiZVxuICAgKiByZS1jb25uZWN0ZWQsIGByZWNvbm5lY3RlZGAgc2hvdWxkIGFsc28gYmUgaW1wbGVtZW50ZWQgdG8gcmVzdG9yZSB0aGVcbiAgICogd29ya2luZyBzdGF0ZSBvZiB0aGUgZGlyZWN0aXZlIHByaW9yIHRvIHRoZSBuZXh0IHJlbmRlci5cbiAgICovXG4gIHByb3RlY3RlZCBkaXNjb25uZWN0ZWQoKSB7fVxuICBwcm90ZWN0ZWQgcmVjb25uZWN0ZWQoKSB7fVxufVxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjAgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5pbXBvcnQge25vdGhpbmcsIEVsZW1lbnRQYXJ0fSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgQXN5bmNEaXJlY3RpdmV9IGZyb20gJy4uL2FzeW5jLWRpcmVjdGl2ZS5qcyc7XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBSZWYgb2JqZWN0LCB3aGljaCBpcyBjb250YWluZXIgZm9yIGEgcmVmZXJlbmNlIHRvIGFuIGVsZW1lbnQuXG4gKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVSZWYgPSA8VCA9IEVsZW1lbnQ+KCkgPT4gbmV3IFJlZjxUPigpO1xuXG4vKipcbiAqIEFuIG9iamVjdCB0aGF0IGhvbGRzIGEgcmVmIHZhbHVlLlxuICovXG5jbGFzcyBSZWY8VCA9IEVsZW1lbnQ+IHtcbiAgLyoqXG4gICAqIFRoZSBjdXJyZW50IEVsZW1lbnQgdmFsdWUgb2YgdGhlIHJlZiwgb3IgZWxzZSBgdW5kZWZpbmVkYCBpZiB0aGUgcmVmIGlzIG5vXG4gICAqIGxvbmdlciByZW5kZXJlZC5cbiAgICovXG4gIHJlYWRvbmx5IHZhbHVlPzogVDtcbn1cblxuZXhwb3J0IHR5cGUge1JlZn07XG5cbmludGVyZmFjZSBSZWZJbnRlcm5hbCB7XG4gIHZhbHVlOiBFbGVtZW50IHwgdW5kZWZpbmVkO1xufVxuXG4vLyBXaGVuIGNhbGxiYWNrcyBhcmUgdXNlZCBmb3IgcmVmcywgdGhpcyBtYXAgdHJhY2tzIHRoZSBsYXN0IHZhbHVlIHRoZSBjYWxsYmFja1xuLy8gd2FzIGNhbGxlZCB3aXRoLCBmb3IgZW5zdXJpbmcgYSBkaXJlY3RpdmUgZG9lc24ndCBjbGVhciB0aGUgcmVmIGlmIHRoZSByZWZcbi8vIGhhcyBhbHJlYWR5IGJlZW4gcmVuZGVyZWQgdG8gYSBuZXcgc3BvdC4gSXQgaXMgZG91YmxlLWtleWVkIG9uIGJvdGggdGhlXG4vLyBjb250ZXh0IChgb3B0aW9ucy5ob3N0YCkgYW5kIHRoZSBjYWxsYmFjaywgc2luY2Ugd2UgYXV0by1iaW5kIGNsYXNzIG1ldGhvZHNcbi8vIHRvIGBvcHRpb25zLmhvc3RgLlxuY29uc3QgbGFzdEVsZW1lbnRGb3JDb250ZXh0QW5kQ2FsbGJhY2sgPSBuZXcgV2Vha01hcDxcbiAgb2JqZWN0LFxuICBXZWFrTWFwPEZ1bmN0aW9uLCBFbGVtZW50IHwgdW5kZWZpbmVkPlxuPigpO1xuXG5leHBvcnQgdHlwZSBSZWZPckNhbGxiYWNrPFQgPSBFbGVtZW50PiA9IFJlZjxUPiB8ICgoZWw6IFQgfCB1bmRlZmluZWQpID0+IHZvaWQpO1xuXG5jbGFzcyBSZWZEaXJlY3RpdmUgZXh0ZW5kcyBBc3luY0RpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX2VsZW1lbnQ/OiBFbGVtZW50O1xuICBwcml2YXRlIF9yZWY/OiBSZWZPckNhbGxiYWNrO1xuICBwcml2YXRlIF9jb250ZXh0Pzogb2JqZWN0O1xuXG4gIHJlbmRlcihfcmVmPzogUmVmT3JDYWxsYmFjaykge1xuICAgIHJldHVybiBub3RoaW5nO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IEVsZW1lbnRQYXJ0LCBbcmVmXTogUGFyYW1ldGVyczx0aGlzWydyZW5kZXInXT4pIHtcbiAgICBjb25zdCByZWZDaGFuZ2VkID0gcmVmICE9PSB0aGlzLl9yZWY7XG4gICAgaWYgKHJlZkNoYW5nZWQgJiYgdGhpcy5fcmVmICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIFRoZSByZWYgcGFzc2VkIHRvIHRoZSBkaXJlY3RpdmUgaGFzIGNoYW5nZWQ7XG4gICAgICAvLyB1bnNldCB0aGUgcHJldmlvdXMgcmVmJ3MgdmFsdWVcbiAgICAgIHRoaXMuX3VwZGF0ZVJlZlZhbHVlKHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIGlmIChyZWZDaGFuZ2VkIHx8IHRoaXMuX2xhc3RFbGVtZW50Rm9yUmVmICE9PSB0aGlzLl9lbGVtZW50KSB7XG4gICAgICAvLyBXZSBlaXRoZXIgZ290IGEgbmV3IHJlZiBvciB0aGlzIGlzIHRoZSBmaXJzdCByZW5kZXI7XG4gICAgICAvLyBzdG9yZSB0aGUgcmVmL2VsZW1lbnQgJiB1cGRhdGUgdGhlIHJlZiB2YWx1ZVxuICAgICAgdGhpcy5fcmVmID0gcmVmO1xuICAgICAgdGhpcy5fY29udGV4dCA9IHBhcnQub3B0aW9ucz8uaG9zdDtcbiAgICAgIHRoaXMuX3VwZGF0ZVJlZlZhbHVlKCh0aGlzLl9lbGVtZW50ID0gcGFydC5lbGVtZW50KSk7XG4gICAgfVxuICAgIHJldHVybiBub3RoaW5nO1xuICB9XG5cbiAgcHJpdmF0ZSBfdXBkYXRlUmVmVmFsdWUoZWxlbWVudDogRWxlbWVudCB8IHVuZGVmaW5lZCkge1xuICAgIGlmICghdGhpcy5pc0Nvbm5lY3RlZCkge1xuICAgICAgZWxlbWVudCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB0aGlzLl9yZWYgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIElmIHRoZSBjdXJyZW50IHJlZiB3YXMgY2FsbGVkIHdpdGggYSBwcmV2aW91cyB2YWx1ZSwgY2FsbCB3aXRoXG4gICAgICAvLyBgdW5kZWZpbmVkYDsgV2UgZG8gdGhpcyB0byBlbnN1cmUgY2FsbGJhY2tzIGFyZSBjYWxsZWQgaW4gYSBjb25zaXN0ZW50XG4gICAgICAvLyB3YXkgcmVnYXJkbGVzcyBvZiB3aGV0aGVyIGEgcmVmIG1pZ2h0IGJlIG1vdmluZyB1cCBpbiB0aGUgdHJlZSAoaW5cbiAgICAgIC8vIHdoaWNoIGNhc2UgaXQgd291bGQgb3RoZXJ3aXNlIGJlIGNhbGxlZCB3aXRoIHRoZSBuZXcgdmFsdWUgYmVmb3JlIHRoZVxuICAgICAgLy8gcHJldmlvdXMgb25lIHVuc2V0cyBpdCkgYW5kIGRvd24gaW4gdGhlIHRyZWUgKHdoZXJlIGl0IHdvdWxkIGJlIHVuc2V0XG4gICAgICAvLyBiZWZvcmUgYmVpbmcgc2V0KS4gTm90ZSB0aGF0IGVsZW1lbnQgbG9va3VwIGlzIGtleWVkIGJ5XG4gICAgICAvLyBib3RoIHRoZSBjb250ZXh0IGFuZCB0aGUgY2FsbGJhY2ssIHNpbmNlIHdlIGFsbG93IHBhc3NpbmcgdW5ib3VuZFxuICAgICAgLy8gZnVuY3Rpb25zIHRoYXQgYXJlIGNhbGxlZCBvbiBvcHRpb25zLmhvc3QsIGFuZCB3ZSB3YW50IHRvIHRyZWF0XG4gICAgICAvLyB0aGVzZSBhcyB1bmlxdWUgXCJpbnN0YW5jZXNcIiBvZiBhIGZ1bmN0aW9uLlxuICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMuX2NvbnRleHQgPz8gZ2xvYmFsVGhpcztcbiAgICAgIGxldCBsYXN0RWxlbWVudEZvckNhbGxiYWNrID1cbiAgICAgICAgbGFzdEVsZW1lbnRGb3JDb250ZXh0QW5kQ2FsbGJhY2suZ2V0KGNvbnRleHQpO1xuICAgICAgaWYgKGxhc3RFbGVtZW50Rm9yQ2FsbGJhY2sgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBsYXN0RWxlbWVudEZvckNhbGxiYWNrID0gbmV3IFdlYWtNYXAoKTtcbiAgICAgICAgbGFzdEVsZW1lbnRGb3JDb250ZXh0QW5kQ2FsbGJhY2suc2V0KGNvbnRleHQsIGxhc3RFbGVtZW50Rm9yQ2FsbGJhY2spO1xuICAgICAgfVxuICAgICAgaWYgKGxhc3RFbGVtZW50Rm9yQ2FsbGJhY2suZ2V0KHRoaXMuX3JlZikgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9yZWYuY2FsbCh0aGlzLl9jb250ZXh0LCB1bmRlZmluZWQpO1xuICAgICAgfVxuICAgICAgbGFzdEVsZW1lbnRGb3JDYWxsYmFjay5zZXQodGhpcy5fcmVmLCBlbGVtZW50KTtcbiAgICAgIC8vIENhbGwgdGhlIHJlZiB3aXRoIHRoZSBuZXcgZWxlbWVudCB2YWx1ZVxuICAgICAgaWYgKGVsZW1lbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9yZWYuY2FsbCh0aGlzLl9jb250ZXh0LCBlbGVtZW50KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgKHRoaXMuX3JlZiBhcyBSZWZJbnRlcm5hbCkhLnZhbHVlID0gZWxlbWVudDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldCBfbGFzdEVsZW1lbnRGb3JSZWYoKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB0aGlzLl9yZWYgPT09ICdmdW5jdGlvbidcbiAgICAgID8gbGFzdEVsZW1lbnRGb3JDb250ZXh0QW5kQ2FsbGJhY2tcbiAgICAgICAgICAuZ2V0KHRoaXMuX2NvbnRleHQgPz8gZ2xvYmFsVGhpcylcbiAgICAgICAgICA/LmdldCh0aGlzLl9yZWYpXG4gICAgICA6IHRoaXMuX3JlZj8udmFsdWU7XG4gIH1cblxuICBvdmVycmlkZSBkaXNjb25uZWN0ZWQoKSB7XG4gICAgLy8gT25seSBjbGVhciB0aGUgYm94IGlmIG91ciBlbGVtZW50IGlzIHN0aWxsIHRoZSBvbmUgaW4gaXQgKGkuZS4gYW5vdGhlclxuICAgIC8vIGRpcmVjdGl2ZSBpbnN0YW5jZSBoYXNuJ3QgcmVuZGVyZWQgaXRzIGVsZW1lbnQgdG8gaXQgYmVmb3JlIHVzKTsgdGhhdFxuICAgIC8vIG9ubHkgaGFwcGVucyBpbiB0aGUgZXZlbnQgb2YgdGhlIGRpcmVjdGl2ZSBiZWluZyBjbGVhcmVkIChub3QgdmlhIG1hbnVhbFxuICAgIC8vIGRpc2Nvbm5lY3Rpb24pXG4gICAgaWYgKHRoaXMuX2xhc3RFbGVtZW50Rm9yUmVmID09PSB0aGlzLl9lbGVtZW50KSB7XG4gICAgICB0aGlzLl91cGRhdGVSZWZWYWx1ZSh1bmRlZmluZWQpO1xuICAgIH1cbiAgfVxuXG4gIG92ZXJyaWRlIHJlY29ubmVjdGVkKCkge1xuICAgIC8vIElmIHdlIHdlcmUgbWFudWFsbHkgZGlzY29ubmVjdGVkLCB3ZSBjYW4gc2FmZWx5IHB1dCBvdXIgZWxlbWVudCBiYWNrIGluXG4gICAgLy8gdGhlIGJveCwgc2luY2Ugbm8gcmVuZGVyaW5nIGNvdWxkIGhhdmUgb2NjdXJyZWQgdG8gY2hhbmdlIGl0cyBzdGF0ZVxuICAgIHRoaXMuX3VwZGF0ZVJlZlZhbHVlKHRoaXMuX2VsZW1lbnQpO1xuICB9XG59XG5cbi8qKlxuICogU2V0cyB0aGUgdmFsdWUgb2YgYSBSZWYgb2JqZWN0IG9yIGNhbGxzIGEgcmVmIGNhbGxiYWNrIHdpdGggdGhlIGVsZW1lbnQgaXQnc1xuICogYm91bmQgdG8uXG4gKlxuICogQSBSZWYgb2JqZWN0IGFjdHMgYXMgYSBjb250YWluZXIgZm9yIGEgcmVmZXJlbmNlIHRvIGFuIGVsZW1lbnQuIEEgcmVmXG4gKiBjYWxsYmFjayBpcyBhIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYW4gZWxlbWVudCBhcyBpdHMgb25seSBhcmd1bWVudC5cbiAqXG4gKiBUaGUgcmVmIGRpcmVjdGl2ZSBzZXRzIHRoZSB2YWx1ZSBvZiB0aGUgUmVmIG9iamVjdCBvciBjYWxscyB0aGUgcmVmIGNhbGxiYWNrXG4gKiBkdXJpbmcgcmVuZGVyaW5nLCBpZiB0aGUgcmVmZXJlbmNlZCBlbGVtZW50IGNoYW5nZWQuXG4gKlxuICogTm90ZTogSWYgYSByZWYgY2FsbGJhY2sgaXMgcmVuZGVyZWQgdG8gYSBkaWZmZXJlbnQgZWxlbWVudCBwb3NpdGlvbiBvciBpc1xuICogcmVtb3ZlZCBpbiBhIHN1YnNlcXVlbnQgcmVuZGVyLCBpdCB3aWxsIGZpcnN0IGJlIGNhbGxlZCB3aXRoIGB1bmRlZmluZWRgLFxuICogZm9sbG93ZWQgYnkgYW5vdGhlciBjYWxsIHdpdGggdGhlIG5ldyBlbGVtZW50IGl0IHdhcyByZW5kZXJlZCB0byAoaWYgYW55KS5cbiAqXG4gKiBgYGBqc1xuICogLy8gVXNpbmcgUmVmIG9iamVjdFxuICogY29uc3QgaW5wdXRSZWYgPSBjcmVhdGVSZWYoKTtcbiAqIHJlbmRlcihodG1sYDxpbnB1dCAke3JlZihpbnB1dFJlZil9PmAsIGNvbnRhaW5lcik7XG4gKiBpbnB1dFJlZi52YWx1ZS5mb2N1cygpO1xuICpcbiAqIC8vIFVzaW5nIGNhbGxiYWNrXG4gKiBjb25zdCBjYWxsYmFjayA9IChpbnB1dEVsZW1lbnQpID0+IGlucHV0RWxlbWVudC5mb2N1cygpO1xuICogcmVuZGVyKGh0bWxgPGlucHV0ICR7cmVmKGNhbGxiYWNrKX0+YCwgY29udGFpbmVyKTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcmVmID0gZGlyZWN0aXZlKFJlZkRpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7UmVmRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIxIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG4vLyBOb3RlLCB0aGlzIG1vZHVsZSBpcyBub3QgaW5jbHVkZWQgaW4gcGFja2FnZSBleHBvcnRzIHNvIHRoYXQgaXQncyBwcml2YXRlIHRvXG4vLyBvdXIgZmlyc3QtcGFydHkgZGlyZWN0aXZlcy4gSWYgaXQgZW5kcyB1cCBiZWluZyB1c2VmdWwsIHdlIGNhbiBvcGVuIGl0IHVwIGFuZFxuLy8gZXhwb3J0IGl0LlxuXG4vKipcbiAqIEhlbHBlciB0byBpdGVyYXRlIGFuIEFzeW5jSXRlcmFibGUgaW4gaXRzIG93biBjbG9zdXJlLlxuICogQHBhcmFtIGl0ZXJhYmxlIFRoZSBpdGVyYWJsZSB0byBpdGVyYXRlXG4gKiBAcGFyYW0gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIHRvIGNhbGwgZm9yIGVhY2ggdmFsdWUuIElmIHRoZSBjYWxsYmFjayByZXR1cm5zXG4gKiBgZmFsc2VgLCB0aGUgbG9vcCB3aWxsIGJlIGJyb2tlbi5cbiAqL1xuZXhwb3J0IGNvbnN0IGZvckF3YWl0T2YgPSBhc3luYyA8VD4oXG4gIGl0ZXJhYmxlOiBBc3luY0l0ZXJhYmxlPFQ+LFxuICBjYWxsYmFjazogKHZhbHVlOiBUKSA9PiBQcm9taXNlPGJvb2xlYW4+XG4pID0+IHtcbiAgZm9yIGF3YWl0IChjb25zdCB2IG9mIGl0ZXJhYmxlKSB7XG4gICAgaWYgKChhd2FpdCBjYWxsYmFjayh2KSkgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIEhvbGRzIGEgcmVmZXJlbmNlIHRvIGFuIGluc3RhbmNlIHRoYXQgY2FuIGJlIGRpc2Nvbm5lY3RlZCBhbmQgcmVjb25uZWN0ZWQsXG4gKiBzbyB0aGF0IGEgY2xvc3VyZSBvdmVyIHRoZSByZWYgKGUuZy4gaW4gYSB0aGVuIGZ1bmN0aW9uIHRvIGEgcHJvbWlzZSkgZG9lc1xuICogbm90IHN0cm9uZ2x5IGhvbGQgYSByZWYgdG8gdGhlIGluc3RhbmNlLiBBcHByb3hpbWF0ZXMgYSBXZWFrUmVmIGJ1dCBtdXN0XG4gKiBiZSBtYW51YWxseSBjb25uZWN0ZWQgJiBkaXNjb25uZWN0ZWQgdG8gdGhlIGJhY2tpbmcgaW5zdGFuY2UuXG4gKi9cbmV4cG9ydCBjbGFzcyBQc2V1ZG9XZWFrUmVmPFQ+IHtcbiAgcHJpdmF0ZSBfcmVmPzogVDtcbiAgY29uc3RydWN0b3IocmVmOiBUKSB7XG4gICAgdGhpcy5fcmVmID0gcmVmO1xuICB9XG4gIC8qKlxuICAgKiBEaXNhc3NvY2lhdGVzIHRoZSByZWYgd2l0aCB0aGUgYmFja2luZyBpbnN0YW5jZS5cbiAgICovXG4gIGRpc2Nvbm5lY3QoKSB7XG4gICAgdGhpcy5fcmVmID0gdW5kZWZpbmVkO1xuICB9XG4gIC8qKlxuICAgKiBSZWFzc29jaWF0ZXMgdGhlIHJlZiB3aXRoIHRoZSBiYWNraW5nIGluc3RhbmNlLlxuICAgKi9cbiAgcmVjb25uZWN0KHJlZjogVCkge1xuICAgIHRoaXMuX3JlZiA9IHJlZjtcbiAgfVxuICAvKipcbiAgICogUmV0cmlldmVzIHRoZSBiYWNraW5nIGluc3RhbmNlICh3aWxsIGJlIHVuZGVmaW5lZCB3aGVuIGRpc2Nvbm5lY3RlZClcbiAgICovXG4gIGRlcmVmKCkge1xuICAgIHJldHVybiB0aGlzLl9yZWY7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGhlbHBlciB0byBwYXVzZSBhbmQgcmVzdW1lIHdhaXRpbmcgb24gYSBjb25kaXRpb24gaW4gYW4gYXN5bmMgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IGNsYXNzIFBhdXNlciB7XG4gIHByaXZhdGUgX3Byb21pc2U/OiBQcm9taXNlPHZvaWQ+ID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIF9yZXNvbHZlPzogKCkgPT4gdm9pZCA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIFdoZW4gcGF1c2VkLCByZXR1cm5zIGEgcHJvbWlzZSB0byBiZSBhd2FpdGVkOyB3aGVuIHVucGF1c2VkLCByZXR1cm5zXG4gICAqIHVuZGVmaW5lZC4gTm90ZSB0aGF0IGluIHRoZSBtaWNyb3Rhc2sgYmV0d2VlbiB0aGUgcGF1c2VyIGJlaW5nIHJlc3VtZWRcbiAgICogYW4gYXdhaXQgb2YgdGhpcyBwcm9taXNlIHJlc29sdmluZywgdGhlIHBhdXNlciBjb3VsZCBiZSBwYXVzZWQgYWdhaW4sXG4gICAqIGhlbmNlIGNhbGxlcnMgc2hvdWxkIGNoZWNrIHRoZSBwcm9taXNlIGluIGEgbG9vcCB3aGVuIGF3YWl0aW5nLlxuICAgKiBAcmV0dXJucyBBIHByb21pc2UgdG8gYmUgYXdhaXRlZCB3aGVuIHBhdXNlZCBvciB1bmRlZmluZWRcbiAgICovXG4gIGdldCgpIHtcbiAgICByZXR1cm4gdGhpcy5fcHJvbWlzZTtcbiAgfVxuICAvKipcbiAgICogQ3JlYXRlcyBhIHByb21pc2UgdG8gYmUgYXdhaXRlZFxuICAgKi9cbiAgcGF1c2UoKSB7XG4gICAgdGhpcy5fcHJvbWlzZSA/Pz0gbmV3IFByb21pc2UoKHJlc29sdmUpID0+ICh0aGlzLl9yZXNvbHZlID0gcmVzb2x2ZSkpO1xuICB9XG4gIC8qKlxuICAgKiBSZXNvbHZlcyB0aGUgcHJvbWlzZSB3aGljaCBtYXkgYmUgYXdhaXRlZFxuICAgKi9cbiAgcmVzdW1lKCkge1xuICAgIHRoaXMuX3Jlc29sdmU/LigpO1xuICAgIHRoaXMuX3Byb21pc2UgPSB0aGlzLl9yZXNvbHZlID0gdW5kZWZpbmVkO1xuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtDaGlsZFBhcnQsIG5vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBBc3luY0RpcmVjdGl2ZSxcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmVQYXJhbWV0ZXJzLFxufSBmcm9tICcuLi9hc3luYy1kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtQYXVzZXIsIFBzZXVkb1dlYWtSZWYsIGZvckF3YWl0T2Z9IGZyb20gJy4vcHJpdmF0ZS1hc3luYy1oZWxwZXJzLmpzJztcblxudHlwZSBNYXBwZXI8VD4gPSAodjogVCwgaW5kZXg/OiBudW1iZXIpID0+IHVua25vd247XG5cbmV4cG9ydCBjbGFzcyBBc3luY1JlcGxhY2VEaXJlY3RpdmUgZXh0ZW5kcyBBc3luY0RpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX192YWx1ZT86IEFzeW5jSXRlcmFibGU8dW5rbm93bj47XG4gIHByaXZhdGUgX193ZWFrVGhpcyA9IG5ldyBQc2V1ZG9XZWFrUmVmKHRoaXMpO1xuICBwcml2YXRlIF9fcGF1c2VyID0gbmV3IFBhdXNlcigpO1xuXG4gIC8vIEB0cy1leHBlY3QtZXJyb3IgdmFsdWUgbm90IHVzZWQsIGJ1dCB3ZSB3YW50IGEgbmljZSBwYXJhbWV0ZXIgZm9yIGRvY3NcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICByZW5kZXI8VD4odmFsdWU6IEFzeW5jSXRlcmFibGU8VD4sIF9tYXBwZXI/OiBNYXBwZXI8VD4pIHtcbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUoXG4gICAgX3BhcnQ6IENoaWxkUGFydCxcbiAgICBbdmFsdWUsIG1hcHBlcl06IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz5cbiAgKSB7XG4gICAgLy8gSWYgb3VyIGluaXRpYWwgcmVuZGVyIG9jY3VycyB3aGlsZSBkaXNjb25uZWN0ZWQsIGVuc3VyZSB0aGF0IHRoZSBwYXVzZXJcbiAgICAvLyBhbmQgd2Vha1RoaXMgYXJlIGluIHRoZSBkaXNjb25uZWN0ZWQgc3RhdGVcbiAgICBpZiAoIXRoaXMuaXNDb25uZWN0ZWQpIHtcbiAgICAgIHRoaXMuZGlzY29ubmVjdGVkKCk7XG4gICAgfVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgc2V0IHVwIHRoaXMgcGFydGljdWxhciBpdGVyYWJsZSwgd2UgZG9uJ3QgbmVlZFxuICAgIC8vIHRvIGRvIGFueXRoaW5nLlxuICAgIGlmICh2YWx1ZSA9PT0gdGhpcy5fX3ZhbHVlKSB7XG4gICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgfVxuICAgIHRoaXMuX192YWx1ZSA9IHZhbHVlO1xuICAgIGxldCBpID0gMDtcbiAgICBjb25zdCB7X193ZWFrVGhpczogd2Vha1RoaXMsIF9fcGF1c2VyOiBwYXVzZXJ9ID0gdGhpcztcbiAgICAvLyBOb3RlLCB0aGUgY2FsbGJhY2sgYXZvaWRzIGNsb3Npbmcgb3ZlciBgdGhpc2Agc28gdGhhdCB0aGUgZGlyZWN0aXZlXG4gICAgLy8gY2FuIGJlIGdjJ2VkIGJlZm9yZSB0aGUgcHJvbWlzZSByZXNvbHZlczsgaW5zdGVhZCBgdGhpc2AgaXMgcmV0cmlldmVkXG4gICAgLy8gZnJvbSBgd2Vha1RoaXNgLCB3aGljaCBjYW4gYnJlYWsgdGhlIGhhcmQgcmVmZXJlbmNlIGluIHRoZSBjbG9zdXJlIHdoZW5cbiAgICAvLyB0aGUgZGlyZWN0aXZlIGRpc2Nvbm5lY3RzXG4gICAgZm9yQXdhaXRPZih2YWx1ZSwgYXN5bmMgKHY6IHVua25vd24pID0+IHtcbiAgICAgIC8vIFRoZSB3aGlsZSBsb29wIGhlcmUgaGFuZGxlcyB0aGUgY2FzZSB0aGF0IHRoZSBjb25uZWN0aW9uIHN0YXRlXG4gICAgICAvLyB0aHJhc2hlcywgY2F1c2luZyB0aGUgcGF1c2VyIHRvIHJlc3VtZSBhbmQgdGhlbiBnZXQgcmUtcGF1c2VkXG4gICAgICB3aGlsZSAocGF1c2VyLmdldCgpKSB7XG4gICAgICAgIGF3YWl0IHBhdXNlci5nZXQoKTtcbiAgICAgIH1cbiAgICAgIC8vIElmIHRoZSBjYWxsYmFjayBnZXRzIGhlcmUgYW5kIHRoZXJlIGlzIG5vIGB0aGlzYCwgaXQgbWVhbnMgdGhhdCB0aGVcbiAgICAgIC8vIGRpcmVjdGl2ZSBoYXMgYmVlbiBkaXNjb25uZWN0ZWQgYW5kIGdhcmJhZ2UgY29sbGVjdGVkIGFuZCB3ZSBkb24ndFxuICAgICAgLy8gbmVlZCB0byBkbyBhbnl0aGluZyBlbHNlXG4gICAgICBjb25zdCBfdGhpcyA9IHdlYWtUaGlzLmRlcmVmKCk7XG4gICAgICBpZiAoX3RoaXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBDaGVjayB0byBtYWtlIHN1cmUgdGhhdCB2YWx1ZSBpcyB0aGUgc3RpbGwgdGhlIGN1cnJlbnQgdmFsdWUgb2ZcbiAgICAgICAgLy8gdGhlIHBhcnQsIGFuZCBpZiBub3QgYmFpbCBiZWNhdXNlIGEgbmV3IHZhbHVlIG93bnMgdGhpcyBwYXJ0XG4gICAgICAgIGlmIChfdGhpcy5fX3ZhbHVlICE9PSB2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFzIGEgY29udmVuaWVuY2UsIGJlY2F1c2UgZnVuY3Rpb25hbC1wcm9ncmFtbWluZy1zdHlsZVxuICAgICAgICAvLyB0cmFuc2Zvcm1zIG9mIGl0ZXJhYmxlcyBhbmQgYXN5bmMgaXRlcmFibGVzIHJlcXVpcmVzIGEgbGlicmFyeSxcbiAgICAgICAgLy8gd2UgYWNjZXB0IGEgbWFwcGVyIGZ1bmN0aW9uLiBUaGlzIGlzIGVzcGVjaWFsbHkgY29udmVuaWVudCBmb3JcbiAgICAgICAgLy8gcmVuZGVyaW5nIGEgdGVtcGxhdGUgZm9yIGVhY2ggaXRlbS5cbiAgICAgICAgaWYgKG1hcHBlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdiA9IG1hcHBlcih2LCBpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIF90aGlzLmNvbW1pdFZhbHVlKHYsIGkpO1xuICAgICAgICBpKys7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cblxuICAvLyBPdmVycmlkZSBwb2ludCBmb3IgQXN5bmNBcHBlbmQgdG8gYXBwZW5kIHJhdGhlciB0aGFuIHJlcGxhY2VcbiAgcHJvdGVjdGVkIGNvbW1pdFZhbHVlKHZhbHVlOiB1bmtub3duLCBfaW5kZXg6IG51bWJlcikge1xuICAgIHRoaXMuc2V0VmFsdWUodmFsdWUpO1xuICB9XG5cbiAgb3ZlcnJpZGUgZGlzY29ubmVjdGVkKCkge1xuICAgIHRoaXMuX193ZWFrVGhpcy5kaXNjb25uZWN0KCk7XG4gICAgdGhpcy5fX3BhdXNlci5wYXVzZSgpO1xuICB9XG5cbiAgb3ZlcnJpZGUgcmVjb25uZWN0ZWQoKSB7XG4gICAgdGhpcy5fX3dlYWtUaGlzLnJlY29ubmVjdCh0aGlzKTtcbiAgICB0aGlzLl9fcGF1c2VyLnJlc3VtZSgpO1xuICB9XG59XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCByZW5kZXJzIHRoZSBpdGVtcyBvZiBhbiBhc3luYyBpdGVyYWJsZVsxXSwgcmVwbGFjaW5nXG4gKiBwcmV2aW91cyB2YWx1ZXMgd2l0aCBuZXcgdmFsdWVzLCBzbyB0aGF0IG9ubHkgb25lIHZhbHVlIGlzIGV2ZXIgcmVuZGVyZWRcbiAqIGF0IGEgdGltZS4gVGhpcyBkaXJlY3RpdmUgbWF5IGJlIHVzZWQgaW4gYW55IGV4cHJlc3Npb24gdHlwZS5cbiAqXG4gKiBBc3luYyBpdGVyYWJsZXMgYXJlIG9iamVjdHMgd2l0aCBhIGBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdYCBtZXRob2QsIHdoaWNoXG4gKiByZXR1cm5zIGFuIGl0ZXJhdG9yIHdobydzIGBuZXh0KClgIG1ldGhvZCByZXR1cm5zIGEgUHJvbWlzZS4gV2hlbiBhIG5ld1xuICogdmFsdWUgaXMgYXZhaWxhYmxlLCB0aGUgUHJvbWlzZSByZXNvbHZlcyBhbmQgdGhlIHZhbHVlIGlzIHJlbmRlcmVkIHRvIHRoZVxuICogUGFydCBjb250cm9sbGVkIGJ5IHRoZSBkaXJlY3RpdmUuIElmIGFub3RoZXIgdmFsdWUgb3RoZXIgdGhhbiB0aGlzXG4gKiBkaXJlY3RpdmUgaGFzIGJlZW4gc2V0IG9uIHRoZSBQYXJ0LCB0aGUgaXRlcmFibGUgd2lsbCBubyBsb25nZXIgYmUgbGlzdGVuZWRcbiAqIHRvIGFuZCBuZXcgdmFsdWVzIHdvbid0IGJlIHdyaXR0ZW4gdG8gdGhlIFBhcnQuXG4gKlxuICogWzFdOiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9TdGF0ZW1lbnRzL2Zvci1hd2FpdC4uLm9mXG4gKlxuICogQHBhcmFtIHZhbHVlIEFuIGFzeW5jIGl0ZXJhYmxlXG4gKiBAcGFyYW0gbWFwcGVyIEFuIG9wdGlvbmFsIGZ1bmN0aW9uIHRoYXQgbWFwcyBmcm9tICh2YWx1ZSwgaW5kZXgpIHRvIGFub3RoZXJcbiAqICAgICB2YWx1ZS4gVXNlZnVsIGZvciBnZW5lcmF0aW5nIHRlbXBsYXRlcyBmb3IgZWFjaCBpdGVtIGluIHRoZSBpdGVyYWJsZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGFzeW5jUmVwbGFjZSA9IGRpcmVjdGl2ZShBc3luY1JlcGxhY2VEaXJlY3RpdmUpO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7Q2hpbGRQYXJ0fSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBkaXJlY3RpdmUsXG4gIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG4gIFBhcnRJbmZvLFxuICBQYXJ0VHlwZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7QXN5bmNSZXBsYWNlRGlyZWN0aXZlfSBmcm9tICcuL2FzeW5jLXJlcGxhY2UuanMnO1xuaW1wb3J0IHtcbiAgY2xlYXJQYXJ0LFxuICBpbnNlcnRQYXJ0LFxuICBzZXRDaGlsZFBhcnRWYWx1ZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuXG5jbGFzcyBBc3luY0FwcGVuZERpcmVjdGl2ZSBleHRlbmRzIEFzeW5jUmVwbGFjZURpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX19jaGlsZFBhcnQhOiBDaGlsZFBhcnQ7XG5cbiAgLy8gT3ZlcnJpZGUgQXN5bmNSZXBsYWNlIHRvIG5hcnJvdyB0aGUgYWxsb3dlZCBwYXJ0IHR5cGUgdG8gQ2hpbGRQYXJ0IG9ubHlcbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICAgIGlmIChwYXJ0SW5mby50eXBlICE9PSBQYXJ0VHlwZS5DSElMRCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdhc3luY0FwcGVuZCBjYW4gb25seSBiZSB1c2VkIGluIGNoaWxkIGV4cHJlc3Npb25zJyk7XG4gICAgfVxuICB9XG5cbiAgLy8gT3ZlcnJpZGUgQXN5bmNSZXBsYWNlIHRvIHNhdmUgdGhlIHBhcnQgc2luY2Ugd2UgbmVlZCB0byBhcHBlbmQgaW50byBpdFxuICBvdmVycmlkZSB1cGRhdGUocGFydDogQ2hpbGRQYXJ0LCBwYXJhbXM6IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICB0aGlzLl9fY2hpbGRQYXJ0ID0gcGFydDtcbiAgICByZXR1cm4gc3VwZXIudXBkYXRlKHBhcnQsIHBhcmFtcyk7XG4gIH1cblxuICAvLyBPdmVycmlkZSBBc3luY1JlcGxhY2UgdG8gYXBwZW5kIHJhdGhlciB0aGFuIHJlcGxhY2VcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIGNvbW1pdFZhbHVlKHZhbHVlOiB1bmtub3duLCBpbmRleDogbnVtYmVyKSB7XG4gICAgLy8gV2hlbiB3ZSBnZXQgdGhlIGZpcnN0IHZhbHVlLCBjbGVhciB0aGUgcGFydC4gVGhpcyBsZXRzIHRoZVxuICAgIC8vIHByZXZpb3VzIHZhbHVlIGRpc3BsYXkgdW50aWwgd2UgY2FuIHJlcGxhY2UgaXQuXG4gICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICBjbGVhclBhcnQodGhpcy5fX2NoaWxkUGFydCk7XG4gICAgfVxuICAgIC8vIENyZWF0ZSBhbmQgaW5zZXJ0IGEgbmV3IHBhcnQgYW5kIHNldCBpdHMgdmFsdWUgdG8gdGhlIG5leHQgdmFsdWVcbiAgICBjb25zdCBuZXdQYXJ0ID0gaW5zZXJ0UGFydCh0aGlzLl9fY2hpbGRQYXJ0KTtcbiAgICBzZXRDaGlsZFBhcnRWYWx1ZShuZXdQYXJ0LCB2YWx1ZSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGRpcmVjdGl2ZSB0aGF0IHJlbmRlcnMgdGhlIGl0ZW1zIG9mIGFuIGFzeW5jIGl0ZXJhYmxlWzFdLCBhcHBlbmRpbmcgbmV3XG4gKiB2YWx1ZXMgYWZ0ZXIgcHJldmlvdXMgdmFsdWVzLCBzaW1pbGFyIHRvIHRoZSBidWlsdC1pbiBzdXBwb3J0IGZvciBpdGVyYWJsZXMuXG4gKiBUaGlzIGRpcmVjdGl2ZSBpcyB1c2FibGUgb25seSBpbiBjaGlsZCBleHByZXNzaW9ucy5cbiAqXG4gKiBBc3luYyBpdGVyYWJsZXMgYXJlIG9iamVjdHMgd2l0aCBhIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gbWV0aG9kLCB3aGljaFxuICogcmV0dXJucyBhbiBpdGVyYXRvciB3aG8ncyBgbmV4dCgpYCBtZXRob2QgcmV0dXJucyBhIFByb21pc2UuIFdoZW4gYSBuZXdcbiAqIHZhbHVlIGlzIGF2YWlsYWJsZSwgdGhlIFByb21pc2UgcmVzb2x2ZXMgYW5kIHRoZSB2YWx1ZSBpcyBhcHBlbmRlZCB0byB0aGVcbiAqIFBhcnQgY29udHJvbGxlZCBieSB0aGUgZGlyZWN0aXZlLiBJZiBhbm90aGVyIHZhbHVlIG90aGVyIHRoYW4gdGhpc1xuICogZGlyZWN0aXZlIGhhcyBiZWVuIHNldCBvbiB0aGUgUGFydCwgdGhlIGl0ZXJhYmxlIHdpbGwgbm8gbG9uZ2VyIGJlIGxpc3RlbmVkXG4gKiB0byBhbmQgbmV3IHZhbHVlcyB3b24ndCBiZSB3cml0dGVuIHRvIHRoZSBQYXJ0LlxuICpcbiAqIFsxXTogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvU3RhdGVtZW50cy9mb3ItYXdhaXQuLi5vZlxuICpcbiAqIEBwYXJhbSB2YWx1ZSBBbiBhc3luYyBpdGVyYWJsZVxuICogQHBhcmFtIG1hcHBlciBBbiBvcHRpb25hbCBmdW5jdGlvbiB0aGF0IG1hcHMgZnJvbSAodmFsdWUsIGluZGV4KSB0byBhbm90aGVyXG4gKiAgICAgdmFsdWUuIFVzZWZ1bCBmb3IgZ2VuZXJhdGluZyB0ZW1wbGF0ZXMgZm9yIGVhY2ggaXRlbSBpbiB0aGUgaXRlcmFibGUuXG4gKi9cbmV4cG9ydCBjb25zdCBhc3luY0FwcGVuZCA9IGRpcmVjdGl2ZShBc3luY0FwcGVuZERpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7QXN5bmNBcHBlbmREaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7XG4gIFRlbXBsYXRlUmVzdWx0LFxuICBDaGlsZFBhcnQsXG4gIFJvb3RQYXJ0LFxuICByZW5kZXIsXG4gIG5vdGhpbmcsXG4gIENvbXBpbGVkVGVtcGxhdGVSZXN1bHQsXG59IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7XG4gIGRpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlLFxuICBEaXJlY3RpdmVQYXJhbWV0ZXJzLFxuICBQYXJ0SW5mbyxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7XG4gIGNsZWFyUGFydCxcbiAgZ2V0Q29tbWl0dGVkVmFsdWUsXG4gIGluc2VydFBhcnQsXG4gIGlzQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdCxcbiAgaXNUZW1wbGF0ZVJlc3VsdCxcbiAgc2V0Q29tbWl0dGVkVmFsdWUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcblxuLyoqXG4gKiBUaGUgdGVtcGxhdGUgc3RyaW5ncyBhcnJheSBjb250ZW50cyBhcmUgbm90IGNvbXBhdGlibGUgYmV0d2VlbiB0aGUgdHdvXG4gKiB0ZW1wbGF0ZSByZXN1bHQgdHlwZXMgYXMgdGhlIGNvbXBpbGVkIHRlbXBsYXRlIGNvbnRhaW5zIGEgcHJlcGFyZWQgc3RyaW5nO1xuICogb25seSB1c2UgdGhlIHJldHVybmVkIHRlbXBsYXRlIHN0cmluZ3MgYXJyYXkgYXMgYSBjYWNoZSBrZXkuXG4gKi9cbmNvbnN0IGdldFN0cmluZ3NGcm9tVGVtcGxhdGVSZXN1bHQgPSAoXG4gIHJlc3VsdDogVGVtcGxhdGVSZXN1bHQgfCBDb21waWxlZFRlbXBsYXRlUmVzdWx0XG4pOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSA9PlxuICBpc0NvbXBpbGVkVGVtcGxhdGVSZXN1bHQocmVzdWx0KSA/IHJlc3VsdFsnXyRsaXRUeXBlJCddLmggOiByZXN1bHQuc3RyaW5ncztcblxuY2xhc3MgQ2FjaGVEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBwcml2YXRlIF90ZW1wbGF0ZUNhY2hlID0gbmV3IFdlYWtNYXA8VGVtcGxhdGVTdHJpbmdzQXJyYXksIFJvb3RQYXJ0PigpO1xuICBwcml2YXRlIF92YWx1ZT86IFRlbXBsYXRlUmVzdWx0IHwgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdDtcblxuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gIH1cblxuICByZW5kZXIodjogdW5rbm93bikge1xuICAgIC8vIFJldHVybiBhbiBhcnJheSBvZiB0aGUgdmFsdWUgdG8gaW5kdWNlIGxpdC1odG1sIHRvIGNyZWF0ZSBhIENoaWxkUGFydFxuICAgIC8vIGZvciB0aGUgdmFsdWUgdGhhdCB3ZSBjYW4gbW92ZSBpbnRvIHRoZSBjYWNoZS5cbiAgICByZXR1cm4gW3ZdO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKGNvbnRhaW5lclBhcnQ6IENoaWxkUGFydCwgW3ZdOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgY29uc3QgX3ZhbHVlS2V5ID0gaXNUZW1wbGF0ZVJlc3VsdCh0aGlzLl92YWx1ZSlcbiAgICAgID8gZ2V0U3RyaW5nc0Zyb21UZW1wbGF0ZVJlc3VsdCh0aGlzLl92YWx1ZSlcbiAgICAgIDogbnVsbDtcbiAgICBjb25zdCB2S2V5ID0gaXNUZW1wbGF0ZVJlc3VsdCh2KSA/IGdldFN0cmluZ3NGcm9tVGVtcGxhdGVSZXN1bHQodikgOiBudWxsO1xuXG4gICAgLy8gSWYgdGhlIHByZXZpb3VzIHZhbHVlIGlzIGEgVGVtcGxhdGVSZXN1bHQgYW5kIHRoZSBuZXcgdmFsdWUgaXMgbm90LFxuICAgIC8vIG9yIGlzIGEgZGlmZmVyZW50IFRlbXBsYXRlIGFzIHRoZSBwcmV2aW91cyB2YWx1ZSwgbW92ZSB0aGUgY2hpbGQgcGFydFxuICAgIC8vIGludG8gdGhlIGNhY2hlLlxuICAgIGlmIChfdmFsdWVLZXkgIT09IG51bGwgJiYgKHZLZXkgPT09IG51bGwgfHwgX3ZhbHVlS2V5ICE9PSB2S2V5KSkge1xuICAgICAgLy8gVGhpcyBpcyBhbHdheXMgYW4gYXJyYXkgYmVjYXVzZSB3ZSByZXR1cm4gW3ZdIGluIHJlbmRlcigpXG4gICAgICBjb25zdCBwYXJ0VmFsdWUgPSBnZXRDb21taXR0ZWRWYWx1ZShjb250YWluZXJQYXJ0KSBhcyBBcnJheTxDaGlsZFBhcnQ+O1xuICAgICAgY29uc3QgY2hpbGRQYXJ0ID0gcGFydFZhbHVlLnBvcCgpITtcbiAgICAgIGxldCBjYWNoZWRDb250YWluZXJQYXJ0ID0gdGhpcy5fdGVtcGxhdGVDYWNoZS5nZXQoX3ZhbHVlS2V5KTtcbiAgICAgIGlmIChjYWNoZWRDb250YWluZXJQYXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3QgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIGNhY2hlZENvbnRhaW5lclBhcnQgPSByZW5kZXIobm90aGluZywgZnJhZ21lbnQpO1xuICAgICAgICBjYWNoZWRDb250YWluZXJQYXJ0LnNldENvbm5lY3RlZChmYWxzZSk7XG4gICAgICAgIHRoaXMuX3RlbXBsYXRlQ2FjaGUuc2V0KF92YWx1ZUtleSwgY2FjaGVkQ29udGFpbmVyUGFydCk7XG4gICAgICB9XG4gICAgICAvLyBNb3ZlIGludG8gY2FjaGVcbiAgICAgIHNldENvbW1pdHRlZFZhbHVlKGNhY2hlZENvbnRhaW5lclBhcnQsIFtjaGlsZFBhcnRdKTtcbiAgICAgIGluc2VydFBhcnQoY2FjaGVkQ29udGFpbmVyUGFydCwgdW5kZWZpbmVkLCBjaGlsZFBhcnQpO1xuICAgIH1cbiAgICAvLyBJZiB0aGUgbmV3IHZhbHVlIGlzIGEgVGVtcGxhdGVSZXN1bHQgYW5kIHRoZSBwcmV2aW91cyB2YWx1ZSBpcyBub3QsXG4gICAgLy8gb3IgaXMgYSBkaWZmZXJlbnQgVGVtcGxhdGUgYXMgdGhlIHByZXZpb3VzIHZhbHVlLCByZXN0b3JlIHRoZSBjaGlsZFxuICAgIC8vIHBhcnQgZnJvbSB0aGUgY2FjaGUuXG4gICAgaWYgKHZLZXkgIT09IG51bGwpIHtcbiAgICAgIGlmIChfdmFsdWVLZXkgPT09IG51bGwgfHwgX3ZhbHVlS2V5ICE9PSB2S2V5KSB7XG4gICAgICAgIGNvbnN0IGNhY2hlZENvbnRhaW5lclBhcnQgPSB0aGlzLl90ZW1wbGF0ZUNhY2hlLmdldCh2S2V5KTtcbiAgICAgICAgaWYgKGNhY2hlZENvbnRhaW5lclBhcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhY2hlZCBwYXJ0IGJhY2sgaW50byB0aGUgY29udGFpbmVyIHBhcnQgdmFsdWVcbiAgICAgICAgICBjb25zdCBwYXJ0VmFsdWUgPSBnZXRDb21taXR0ZWRWYWx1ZShcbiAgICAgICAgICAgIGNhY2hlZENvbnRhaW5lclBhcnRcbiAgICAgICAgICApIGFzIEFycmF5PENoaWxkUGFydD47XG4gICAgICAgICAgY29uc3QgY2FjaGVkUGFydCA9IHBhcnRWYWx1ZS5wb3AoKSE7XG4gICAgICAgICAgLy8gTW92ZSBjYWNoZWQgcGFydCBiYWNrIGludG8gRE9NXG4gICAgICAgICAgY2xlYXJQYXJ0KGNvbnRhaW5lclBhcnQpO1xuICAgICAgICAgIGluc2VydFBhcnQoY29udGFpbmVyUGFydCwgdW5kZWZpbmVkLCBjYWNoZWRQYXJ0KTtcbiAgICAgICAgICBzZXRDb21taXR0ZWRWYWx1ZShjb250YWluZXJQYXJ0LCBbY2FjaGVkUGFydF0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBCZWNhdXNlIHZLZXkgaXMgbm9uIG51bGwsIHYgbXVzdCBiZSBhIFRlbXBsYXRlUmVzdWx0LlxuICAgICAgdGhpcy5fdmFsdWUgPSB2IGFzIFRlbXBsYXRlUmVzdWx0IHwgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fdmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlbmRlcih2KTtcbiAgfVxufVxuXG4vKipcbiAqIEVuYWJsZXMgZmFzdCBzd2l0Y2hpbmcgYmV0d2VlbiBtdWx0aXBsZSB0ZW1wbGF0ZXMgYnkgY2FjaGluZyB0aGUgRE9NIG5vZGVzXG4gKiBhbmQgVGVtcGxhdGVJbnN0YW5jZXMgcHJvZHVjZWQgYnkgdGhlIHRlbXBsYXRlcy5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBsZXQgY2hlY2tlZCA9IGZhbHNlO1xuICpcbiAqIGh0bWxgXG4gKiAgICR7Y2FjaGUoY2hlY2tlZCA/IGh0bWxgaW5wdXQgaXMgY2hlY2tlZGAgOiBodG1sYGlucHV0IGlzIG5vdCBjaGVja2VkYCl9XG4gKiBgXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGNhY2hlID0gZGlyZWN0aXZlKENhY2hlRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtDYWNoZURpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLyoqXG4gKiBDaG9vc2VzIGFuZCBldmFsdWF0ZXMgYSB0ZW1wbGF0ZSBmdW5jdGlvbiBmcm9tIGEgbGlzdCBiYXNlZCBvbiBtYXRjaGluZ1xuICogdGhlIGdpdmVuIGB2YWx1ZWAgdG8gYSBjYXNlLlxuICpcbiAqIENhc2VzIGFyZSBzdHJ1Y3R1cmVkIGFzIGBbY2FzZVZhbHVlLCBmdW5jXWAuIGB2YWx1ZWAgaXMgbWF0Y2hlZCB0b1xuICogYGNhc2VWYWx1ZWAgYnkgc3RyaWN0IGVxdWFsaXR5LiBUaGUgZmlyc3QgbWF0Y2ggaXMgc2VsZWN0ZWQuIENhc2UgdmFsdWVzXG4gKiBjYW4gYmUgb2YgYW55IHR5cGUgaW5jbHVkaW5nIHByaW1pdGl2ZXMsIG9iamVjdHMsIGFuZCBzeW1ib2xzLlxuICpcbiAqIFRoaXMgaXMgc2ltaWxhciB0byBhIHN3aXRjaCBzdGF0ZW1lbnQsIGJ1dCBhcyBhbiBleHByZXNzaW9uIGFuZCB3aXRob3V0XG4gKiBmYWxsdGhyb3VnaC5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiByZW5kZXIoKSB7XG4gKiAgIHJldHVybiBodG1sYFxuICogICAgICR7Y2hvb3NlKHRoaXMuc2VjdGlvbiwgW1xuICogICAgICAgWydob21lJywgKCkgPT4gaHRtbGA8aDE+SG9tZTwvaDE+YF0sXG4gKiAgICAgICBbJ2Fib3V0JywgKCkgPT4gaHRtbGA8aDE+QWJvdXQ8L2gxPmBdXG4gKiAgICAgXSxcbiAqICAgICAoKSA9PiBodG1sYDxoMT5FcnJvcjwvaDE+YCl9XG4gKiAgIGA7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGNob29zZSA9IDxULCBWLCBLIGV4dGVuZHMgVCA9IFQ+KFxuICB2YWx1ZTogVCxcbiAgY2FzZXM6IEFycmF5PFtLLCAoKSA9PiBWXT4sXG4gIGRlZmF1bHRDYXNlPzogKCkgPT4gVlxuKSA9PiB7XG4gIGZvciAoY29uc3QgYyBvZiBjYXNlcykge1xuICAgIGNvbnN0IGNhc2VWYWx1ZSA9IGNbMF07XG4gICAgaWYgKGNhc2VWYWx1ZSA9PT0gdmFsdWUpIHtcbiAgICAgIGNvbnN0IGZuID0gY1sxXTtcbiAgICAgIHJldHVybiBmbigpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVmYXVsdENhc2U/LigpO1xufTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0F0dHJpYnV0ZVBhcnQsIG5vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBkaXJlY3RpdmUsXG4gIERpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbiAgUGFydEluZm8sXG4gIFBhcnRUeXBlLFxufSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuXG4vKipcbiAqIEEga2V5LXZhbHVlIHNldCBvZiBjbGFzcyBuYW1lcyB0byB0cnV0aHkgdmFsdWVzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENsYXNzSW5mbyB7XG4gIHJlYWRvbmx5IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfCBib29sZWFuIHwgbnVtYmVyO1xufVxuXG5jbGFzcyBDbGFzc01hcERpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIC8qKlxuICAgKiBTdG9yZXMgdGhlIENsYXNzSW5mbyBvYmplY3QgYXBwbGllZCB0byBhIGdpdmVuIEF0dHJpYnV0ZVBhcnQuXG4gICAqIFVzZWQgdG8gdW5zZXQgZXhpc3RpbmcgdmFsdWVzIHdoZW4gYSBuZXcgQ2xhc3NJbmZvIG9iamVjdCBpcyBhcHBsaWVkLlxuICAgKi9cbiAgcHJpdmF0ZSBfcHJldmlvdXNDbGFzc2VzPzogU2V0PHN0cmluZz47XG4gIHByaXZhdGUgX3N0YXRpY0NsYXNzZXM/OiBTZXQ8c3RyaW5nPjtcblxuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gICAgaWYgKFxuICAgICAgcGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQVRUUklCVVRFIHx8XG4gICAgICBwYXJ0SW5mby5uYW1lICE9PSAnY2xhc3MnIHx8XG4gICAgICAocGFydEluZm8uc3RyaW5ncz8ubGVuZ3RoIGFzIG51bWJlcikgPiAyXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdgY2xhc3NNYXAoKWAgY2FuIG9ubHkgYmUgdXNlZCBpbiB0aGUgYGNsYXNzYCBhdHRyaWJ1dGUgJyArXG4gICAgICAgICAgJ2FuZCBtdXN0IGJlIHRoZSBvbmx5IHBhcnQgaW4gdGhlIGF0dHJpYnV0ZS4nXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlcihjbGFzc0luZm86IENsYXNzSW5mbykge1xuICAgIC8vIEFkZCBzcGFjZXMgdG8gZW5zdXJlIHNlcGFyYXRpb24gZnJvbSBzdGF0aWMgY2xhc3Nlc1xuICAgIHJldHVybiAoXG4gICAgICAnICcgK1xuICAgICAgT2JqZWN0LmtleXMoY2xhc3NJbmZvKVxuICAgICAgICAuZmlsdGVyKChrZXkpID0+IGNsYXNzSW5mb1trZXldKVxuICAgICAgICAuam9pbignICcpICtcbiAgICAgICcgJ1xuICAgICk7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUocGFydDogQXR0cmlidXRlUGFydCwgW2NsYXNzSW5mb106IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICAvLyBSZW1lbWJlciBkeW5hbWljIGNsYXNzZXMgb24gdGhlIGZpcnN0IHJlbmRlclxuICAgIGlmICh0aGlzLl9wcmV2aW91c0NsYXNzZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fcHJldmlvdXNDbGFzc2VzID0gbmV3IFNldCgpO1xuICAgICAgaWYgKHBhcnQuc3RyaW5ncyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX3N0YXRpY0NsYXNzZXMgPSBuZXcgU2V0KFxuICAgICAgICAgIHBhcnQuc3RyaW5nc1xuICAgICAgICAgICAgLmpvaW4oJyAnKVxuICAgICAgICAgICAgLnNwbGl0KC9cXHMvKVxuICAgICAgICAgICAgLmZpbHRlcigocykgPT4gcyAhPT0gJycpXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IG5hbWUgaW4gY2xhc3NJbmZvKSB7XG4gICAgICAgIGlmIChjbGFzc0luZm9bbmFtZV0gJiYgIXRoaXMuX3N0YXRpY0NsYXNzZXM/LmhhcyhuYW1lKSkge1xuICAgICAgICAgIHRoaXMuX3ByZXZpb3VzQ2xhc3Nlcy5hZGQobmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnJlbmRlcihjbGFzc0luZm8pO1xuICAgIH1cblxuICAgIGNvbnN0IGNsYXNzTGlzdCA9IHBhcnQuZWxlbWVudC5jbGFzc0xpc3Q7XG5cbiAgICAvLyBSZW1vdmUgb2xkIGNsYXNzZXMgdGhhdCBubyBsb25nZXIgYXBwbHlcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgdGhpcy5fcHJldmlvdXNDbGFzc2VzKSB7XG4gICAgICBpZiAoIShuYW1lIGluIGNsYXNzSW5mbykpIHtcbiAgICAgICAgY2xhc3NMaXN0LnJlbW92ZShuYW1lKTtcbiAgICAgICAgdGhpcy5fcHJldmlvdXNDbGFzc2VzIS5kZWxldGUobmFtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWRkIG9yIHJlbW92ZSBjbGFzc2VzIGJhc2VkIG9uIHRoZWlyIGNsYXNzTWFwIHZhbHVlXG4gICAgZm9yIChjb25zdCBuYW1lIGluIGNsYXNzSW5mbykge1xuICAgICAgLy8gV2UgZXhwbGljaXRseSB3YW50IGEgbG9vc2UgdHJ1dGh5IGNoZWNrIG9mIGB2YWx1ZWAgYmVjYXVzZSBpdCBzZWVtc1xuICAgICAgLy8gbW9yZSBjb252ZW5pZW50IHRoYXQgJycgYW5kIDAgYXJlIHNraXBwZWQuXG4gICAgICBjb25zdCB2YWx1ZSA9ICEhY2xhc3NJbmZvW25hbWVdO1xuICAgICAgaWYgKFxuICAgICAgICB2YWx1ZSAhPT0gdGhpcy5fcHJldmlvdXNDbGFzc2VzLmhhcyhuYW1lKSAmJlxuICAgICAgICAhdGhpcy5fc3RhdGljQ2xhc3Nlcz8uaGFzKG5hbWUpXG4gICAgICApIHtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgY2xhc3NMaXN0LmFkZChuYW1lKTtcbiAgICAgICAgICB0aGlzLl9wcmV2aW91c0NsYXNzZXMuYWRkKG5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgICAgICAgdGhpcy5fcHJldmlvdXNDbGFzc2VzLmRlbGV0ZShuYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGRpcmVjdGl2ZSB0aGF0IGFwcGxpZXMgZHluYW1pYyBDU1MgY2xhc3Nlcy5cbiAqXG4gKiBUaGlzIG11c3QgYmUgdXNlZCBpbiB0aGUgYGNsYXNzYCBhdHRyaWJ1dGUgYW5kIG11c3QgYmUgdGhlIG9ubHkgcGFydCB1c2VkIGluXG4gKiB0aGUgYXR0cmlidXRlLiBJdCB0YWtlcyBlYWNoIHByb3BlcnR5IGluIHRoZSBgY2xhc3NJbmZvYCBhcmd1bWVudCBhbmQgYWRkc1xuICogdGhlIHByb3BlcnR5IG5hbWUgdG8gdGhlIGVsZW1lbnQncyBgY2xhc3NMaXN0YCBpZiB0aGUgcHJvcGVydHkgdmFsdWUgaXNcbiAqIHRydXRoeTsgaWYgdGhlIHByb3BlcnR5IHZhbHVlIGlzIGZhbHN5LCB0aGUgcHJvcGVydHkgbmFtZSBpcyByZW1vdmVkIGZyb21cbiAqIHRoZSBlbGVtZW50J3MgYGNsYXNzYC5cbiAqXG4gKiBGb3IgZXhhbXBsZSBge2ZvbzogYmFyfWAgYXBwbGllcyB0aGUgY2xhc3MgYGZvb2AgaWYgdGhlIHZhbHVlIG9mIGBiYXJgIGlzXG4gKiB0cnV0aHkuXG4gKlxuICogQHBhcmFtIGNsYXNzSW5mb1xuICovXG5leHBvcnQgY29uc3QgY2xhc3NNYXAgPSBkaXJlY3RpdmUoQ2xhc3NNYXBEaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge0NsYXNzTWFwRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge25vQ2hhbmdlLCBQYXJ0fSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgRGlyZWN0aXZlLCBEaXJlY3RpdmVQYXJhbWV0ZXJzfSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuXG4vLyBBIHNlbnRpbmVsIHRoYXQgaW5kaWNhdGVzIGd1YXJkKCkgaGFzbid0IHJlbmRlcmVkIGFueXRoaW5nIHlldFxuY29uc3QgaW5pdGlhbFZhbHVlID0ge307XG5cbmNsYXNzIEd1YXJkRGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgcHJpdmF0ZSBfcHJldmlvdXNWYWx1ZTogdW5rbm93biA9IGluaXRpYWxWYWx1ZTtcblxuICByZW5kZXIoX3ZhbHVlOiB1bmtub3duLCBmOiAoKSA9PiB1bmtub3duKSB7XG4gICAgcmV0dXJuIGYoKTtcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShfcGFydDogUGFydCwgW3ZhbHVlLCBmXTogRGlyZWN0aXZlUGFyYW1ldGVyczx0aGlzPikge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgLy8gRGlydHktY2hlY2sgYXJyYXlzIGJ5IGl0ZW1cbiAgICAgIGlmIChcbiAgICAgICAgQXJyYXkuaXNBcnJheSh0aGlzLl9wcmV2aW91c1ZhbHVlKSAmJlxuICAgICAgICB0aGlzLl9wcmV2aW91c1ZhbHVlLmxlbmd0aCA9PT0gdmFsdWUubGVuZ3RoICYmXG4gICAgICAgIHZhbHVlLmV2ZXJ5KCh2LCBpKSA9PiB2ID09PSAodGhpcy5fcHJldmlvdXNWYWx1ZSBhcyBBcnJheTx1bmtub3duPilbaV0pXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIG5vQ2hhbmdlO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy5fcHJldmlvdXNWYWx1ZSA9PT0gdmFsdWUpIHtcbiAgICAgIC8vIERpcnR5LWNoZWNrIG5vbi1hcnJheXMgYnkgaWRlbnRpdHlcbiAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICB9XG5cbiAgICAvLyBDb3B5IHRoZSB2YWx1ZSBpZiBpdCdzIGFuIGFycmF5IHNvIHRoYXQgaWYgaXQncyBtdXRhdGVkIHdlIGRvbid0IGZvcmdldFxuICAgIC8vIHdoYXQgdGhlIHByZXZpb3VzIHZhbHVlcyB3ZXJlLlxuICAgIHRoaXMuX3ByZXZpb3VzVmFsdWUgPSBBcnJheS5pc0FycmF5KHZhbHVlKSA/IEFycmF5LmZyb20odmFsdWUpIDogdmFsdWU7XG4gICAgY29uc3QgciA9IHRoaXMucmVuZGVyKHZhbHVlLCBmKTtcbiAgICByZXR1cm4gcjtcbiAgfVxufVxuXG4vKipcbiAqIFByZXZlbnRzIHJlLXJlbmRlciBvZiBhIHRlbXBsYXRlIGZ1bmN0aW9uIHVudGlsIGEgc2luZ2xlIHZhbHVlIG9yIGFuIGFycmF5IG9mXG4gKiB2YWx1ZXMgY2hhbmdlcy5cbiAqXG4gKiBWYWx1ZXMgYXJlIGNoZWNrZWQgYWdhaW5zdCBwcmV2aW91cyB2YWx1ZXMgd2l0aCBzdHJpY3QgZXF1YWxpdHkgKGA9PT1gKSwgYW5kXG4gKiBzbyB0aGUgY2hlY2sgd29uJ3QgZGV0ZWN0IG5lc3RlZCBwcm9wZXJ0eSBjaGFuZ2VzIGluc2lkZSBvYmplY3RzIG9yIGFycmF5cy5cbiAqIEFycmF5cyB2YWx1ZXMgaGF2ZSBlYWNoIGl0ZW0gY2hlY2tlZCBhZ2FpbnN0IHRoZSBwcmV2aW91cyB2YWx1ZSBhdCB0aGUgc2FtZVxuICogaW5kZXggd2l0aCBzdHJpY3QgZXF1YWxpdHkuIE5lc3RlZCBhcnJheXMgYXJlIGFsc28gY2hlY2tlZCBvbmx5IGJ5IHN0cmljdFxuICogZXF1YWxpdHkuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogaHRtbGBcbiAqICAgPGRpdj5cbiAqICAgICAke2d1YXJkKFt1c2VyLmlkLCBjb21wYW55LmlkXSwgKCkgPT4gaHRtbGAuLi5gKX1cbiAqICAgPC9kaXY+XG4gKiBgXG4gKiBgYGBcbiAqXG4gKiBJbiB0aGlzIGNhc2UsIHRoZSB0ZW1wbGF0ZSBvbmx5IHJlcmVuZGVycyBpZiBlaXRoZXIgYHVzZXIuaWRgIG9yIGBjb21wYW55LmlkYFxuICogY2hhbmdlcy5cbiAqXG4gKiBndWFyZCgpIGlzIHVzZWZ1bCB3aXRoIGltbXV0YWJsZSBkYXRhIHBhdHRlcm5zLCBieSBwcmV2ZW50aW5nIGV4cGVuc2l2ZSB3b3JrXG4gKiB1bnRpbCBkYXRhIHVwZGF0ZXMuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogaHRtbGBcbiAqICAgPGRpdj5cbiAqICAgICAke2d1YXJkKFtpbW11dGFibGVJdGVtc10sICgpID0+IGltbXV0YWJsZUl0ZW1zLm1hcChpID0+IGh0bWxgJHtpfWApKX1cbiAqICAgPC9kaXY+XG4gKiBgXG4gKiBgYGBcbiAqXG4gKiBJbiB0aGlzIGNhc2UsIGl0ZW1zIGFyZSBtYXBwZWQgb3ZlciBvbmx5IHdoZW4gdGhlIGFycmF5IHJlZmVyZW5jZSBjaGFuZ2VzLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSB0aGUgdmFsdWUgdG8gY2hlY2sgYmVmb3JlIHJlLXJlbmRlcmluZ1xuICogQHBhcmFtIGYgdGhlIHRlbXBsYXRlIGZ1bmN0aW9uXG4gKi9cbmV4cG9ydCBjb25zdCBndWFyZCA9IGRpcmVjdGl2ZShHdWFyZERpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7R3VhcmREaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTggR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7bm90aGluZ30gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuXG4vKipcbiAqIEZvciBBdHRyaWJ1dGVQYXJ0cywgc2V0cyB0aGUgYXR0cmlidXRlIGlmIHRoZSB2YWx1ZSBpcyBkZWZpbmVkIGFuZCByZW1vdmVzXG4gKiB0aGUgYXR0cmlidXRlIGlmIHRoZSB2YWx1ZSBpcyB1bmRlZmluZWQuXG4gKlxuICogRm9yIG90aGVyIHBhcnQgdHlwZXMsIHRoaXMgZGlyZWN0aXZlIGlzIGEgbm8tb3AuXG4gKi9cbmV4cG9ydCBjb25zdCBpZkRlZmluZWQgPSA8VD4odmFsdWU6IFQpID0+IHZhbHVlID8/IG5vdGhpbmc7XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLyoqXG4gKiBSZXR1cm5zIGFuIGl0ZXJhYmxlIGNvbnRhaW5pbmcgdGhlIHZhbHVlcyBpbiBgaXRlbXNgIGludGVybGVhdmVkIHdpdGggdGhlXG4gKiBgam9pbmVyYCB2YWx1ZS5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiByZW5kZXIoKSB7XG4gKiAgIHJldHVybiBodG1sYFxuICogICAgICR7am9pbihpdGVtcywgaHRtbGA8c3BhbiBjbGFzcz1cInNlcGFyYXRvclwiPnw8L3NwYW4+YCl9XG4gKiAgIGA7XG4gKiB9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBqb2luPEksIEo+KFxuICBpdGVtczogSXRlcmFibGU8ST4gfCB1bmRlZmluZWQsXG4gIGpvaW5lcjogKGluZGV4OiBudW1iZXIpID0+IEpcbik6IEl0ZXJhYmxlPEkgfCBKPjtcbmV4cG9ydCBmdW5jdGlvbiBqb2luPEksIEo+KFxuICBpdGVtczogSXRlcmFibGU8ST4gfCB1bmRlZmluZWQsXG4gIGpvaW5lcjogSlxuKTogSXRlcmFibGU8SSB8IEo+O1xuZXhwb3J0IGZ1bmN0aW9uKiBqb2luPEksIEo+KGl0ZW1zOiBJdGVyYWJsZTxJPiB8IHVuZGVmaW5lZCwgam9pbmVyOiBKKSB7XG4gIGNvbnN0IGlzRnVuY3Rpb24gPSB0eXBlb2Ygam9pbmVyID09PSAnZnVuY3Rpb24nO1xuICBpZiAoaXRlbXMgIT09IHVuZGVmaW5lZCkge1xuICAgIGxldCBpID0gLTE7XG4gICAgZm9yIChjb25zdCB2YWx1ZSBvZiBpdGVtcykge1xuICAgICAgaWYgKGkgPiAtMSkge1xuICAgICAgICB5aWVsZCBpc0Z1bmN0aW9uID8gam9pbmVyKGkpIDogam9pbmVyO1xuICAgICAgfVxuICAgICAgaSsrO1xuICAgICAgeWllbGQgdmFsdWU7XG4gICAgfVxuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtub3RoaW5nfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBkaXJlY3RpdmUsXG4gIERpcmVjdGl2ZSxcbiAgQ2hpbGRQYXJ0LFxuICBEaXJlY3RpdmVQYXJhbWV0ZXJzLFxufSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtzZXRDb21taXR0ZWRWYWx1ZX0gZnJvbSAnLi4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuXG5jbGFzcyBLZXllZCBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIGtleTogdW5rbm93biA9IG5vdGhpbmc7XG5cbiAgcmVuZGVyKGs6IHVua25vd24sIHY6IHVua25vd24pIHtcbiAgICB0aGlzLmtleSA9IGs7XG4gICAgcmV0dXJuIHY7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUocGFydDogQ2hpbGRQYXJ0LCBbaywgdl06IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICBpZiAoayAhPT0gdGhpcy5rZXkpIHtcbiAgICAgIC8vIENsZWFyIHRoZSBwYXJ0IGJlZm9yZSByZXR1cm5pbmcgYSB2YWx1ZS4gVGhlIG9uZS1hcmcgZm9ybSBvZlxuICAgICAgLy8gc2V0Q29tbWl0dGVkVmFsdWUgc2V0cyB0aGUgdmFsdWUgdG8gYSBzZW50aW5lbCB3aGljaCBmb3JjZXMgYVxuICAgICAgLy8gY29tbWl0IHRoZSBuZXh0IHJlbmRlci5cbiAgICAgIHNldENvbW1pdHRlZFZhbHVlKHBhcnQpO1xuICAgICAgdGhpcy5rZXkgPSBrO1xuICAgIH1cbiAgICByZXR1cm4gdjtcbiAgfVxufVxuXG4vKipcbiAqIEFzc29jaWF0ZXMgYSByZW5kZXJhYmxlIHZhbHVlIHdpdGggYSB1bmlxdWUga2V5LiBXaGVuIHRoZSBrZXkgY2hhbmdlcywgdGhlXG4gKiBwcmV2aW91cyBET00gaXMgcmVtb3ZlZCBhbmQgZGlzcG9zZWQgYmVmb3JlIHJlbmRlcmluZyB0aGUgbmV4dCB2YWx1ZSwgZXZlblxuICogaWYgdGhlIHZhbHVlIC0gc3VjaCBhcyBhIHRlbXBsYXRlIC0gaXMgdGhlIHNhbWUuXG4gKlxuICogVGhpcyBpcyB1c2VmdWwgZm9yIGZvcmNpbmcgcmUtcmVuZGVycyBvZiBzdGF0ZWZ1bCBjb21wb25lbnRzLCBvciB3b3JraW5nXG4gKiB3aXRoIGNvZGUgdGhhdCBleHBlY3RzIG5ldyBkYXRhIHRvIGdlbmVyYXRlIG5ldyBIVE1MIGVsZW1lbnRzLCBzdWNoIGFzIHNvbWVcbiAqIGFuaW1hdGlvbiB0ZWNobmlxdWVzLlxuICovXG5leHBvcnQgY29uc3Qga2V5ZWQgPSBkaXJlY3RpdmUoS2V5ZWQpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge0tleWVkfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0F0dHJpYnV0ZVBhcnQsIG5vQ2hhbmdlLCBub3RoaW5nfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBkaXJlY3RpdmUsXG4gIERpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbiAgUGFydEluZm8sXG4gIFBhcnRUeXBlLFxufSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtpc1NpbmdsZUV4cHJlc3Npb24sIHNldENvbW1pdHRlZFZhbHVlfSBmcm9tICcuLi9kaXJlY3RpdmUtaGVscGVycy5qcyc7XG5cbmNsYXNzIExpdmVEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gICAgaWYgKFxuICAgICAgIShcbiAgICAgICAgcGFydEluZm8udHlwZSA9PT0gUGFydFR5cGUuUFJPUEVSVFkgfHxcbiAgICAgICAgcGFydEluZm8udHlwZSA9PT0gUGFydFR5cGUuQVRUUklCVVRFIHx8XG4gICAgICAgIHBhcnRJbmZvLnR5cGUgPT09IFBhcnRUeXBlLkJPT0xFQU5fQVRUUklCVVRFXG4gICAgICApXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdUaGUgYGxpdmVgIGRpcmVjdGl2ZSBpcyBub3QgYWxsb3dlZCBvbiBjaGlsZCBvciBldmVudCBiaW5kaW5ncydcbiAgICAgICk7XG4gICAgfVxuICAgIGlmICghaXNTaW5nbGVFeHByZXNzaW9uKHBhcnRJbmZvKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdgbGl2ZWAgYmluZGluZ3MgY2FuIG9ubHkgY29udGFpbiBhIHNpbmdsZSBleHByZXNzaW9uJyk7XG4gICAgfVxuICB9XG5cbiAgcmVuZGVyKHZhbHVlOiB1bmtub3duKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IEF0dHJpYnV0ZVBhcnQsIFt2YWx1ZV06IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICBpZiAodmFsdWUgPT09IG5vQ2hhbmdlIHx8IHZhbHVlID09PSBub3RoaW5nKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIGNvbnN0IGVsZW1lbnQgPSBwYXJ0LmVsZW1lbnQ7XG4gICAgY29uc3QgbmFtZSA9IHBhcnQubmFtZTtcblxuICAgIGlmIChwYXJ0LnR5cGUgPT09IFBhcnRUeXBlLlBST1BFUlRZKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgaWYgKHZhbHVlID09PSAoZWxlbWVudCBhcyBhbnkpW25hbWVdKSB7XG4gICAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHBhcnQudHlwZSA9PT0gUGFydFR5cGUuQk9PTEVBTl9BVFRSSUJVVEUpIHtcbiAgICAgIGlmICghIXZhbHVlID09PSBlbGVtZW50Lmhhc0F0dHJpYnV0ZShuYW1lKSkge1xuICAgICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChwYXJ0LnR5cGUgPT09IFBhcnRUeXBlLkFUVFJJQlVURSkge1xuICAgICAgaWYgKGVsZW1lbnQuZ2V0QXR0cmlidXRlKG5hbWUpID09PSBTdHJpbmcodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gUmVzZXRzIHRoZSBwYXJ0J3MgdmFsdWUsIGNhdXNpbmcgaXRzIGRpcnR5LWNoZWNrIHRvIGZhaWwgc28gdGhhdCBpdFxuICAgIC8vIGFsd2F5cyBzZXRzIHRoZSB2YWx1ZS5cbiAgICBzZXRDb21taXR0ZWRWYWx1ZShwYXJ0KTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn1cblxuLyoqXG4gKiBDaGVja3MgYmluZGluZyB2YWx1ZXMgYWdhaW5zdCBsaXZlIERPTSB2YWx1ZXMsIGluc3RlYWQgb2YgcHJldmlvdXNseSBib3VuZFxuICogdmFsdWVzLCB3aGVuIGRldGVybWluaW5nIHdoZXRoZXIgdG8gdXBkYXRlIHRoZSB2YWx1ZS5cbiAqXG4gKiBUaGlzIGlzIHVzZWZ1bCBmb3IgY2FzZXMgd2hlcmUgdGhlIERPTSB2YWx1ZSBtYXkgY2hhbmdlIGZyb20gb3V0c2lkZSBvZlxuICogbGl0LWh0bWwsIHN1Y2ggYXMgd2l0aCBhIGJpbmRpbmcgdG8gYW4gYDxpbnB1dD5gIGVsZW1lbnQncyBgdmFsdWVgIHByb3BlcnR5LFxuICogYSBjb250ZW50IGVkaXRhYmxlIGVsZW1lbnRzIHRleHQsIG9yIHRvIGEgY3VzdG9tIGVsZW1lbnQgdGhhdCBjaGFuZ2VzIGl0J3NcbiAqIG93biBwcm9wZXJ0aWVzIG9yIGF0dHJpYnV0ZXMuXG4gKlxuICogSW4gdGhlc2UgY2FzZXMgaWYgdGhlIERPTSB2YWx1ZSBjaGFuZ2VzLCBidXQgdGhlIHZhbHVlIHNldCB0aHJvdWdoIGxpdC1odG1sXG4gKiBiaW5kaW5ncyBoYXNuJ3QsIGxpdC1odG1sIHdvbid0IGtub3cgdG8gdXBkYXRlIHRoZSBET00gdmFsdWUgYW5kIHdpbGwgbGVhdmVcbiAqIGl0IGFsb25lLiBJZiB0aGlzIGlzIG5vdCB3aGF0IHlvdSB3YW50LS1pZiB5b3Ugd2FudCB0byBvdmVyd3JpdGUgdGhlIERPTVxuICogdmFsdWUgd2l0aCB0aGUgYm91bmQgdmFsdWUgbm8gbWF0dGVyIHdoYXQtLXVzZSB0aGUgYGxpdmUoKWAgZGlyZWN0aXZlOlxuICpcbiAqIGBgYGpzXG4gKiBodG1sYDxpbnB1dCAudmFsdWU9JHtsaXZlKHgpfT5gXG4gKiBgYGBcbiAqXG4gKiBgbGl2ZSgpYCBwZXJmb3JtcyBhIHN0cmljdCBlcXVhbGl0eSBjaGVjayBhZ2FpbnN0IHRoZSBsaXZlIERPTSB2YWx1ZSwgYW5kIGlmXG4gKiB0aGUgbmV3IHZhbHVlIGlzIGVxdWFsIHRvIHRoZSBsaXZlIHZhbHVlLCBkb2VzIG5vdGhpbmcuIFRoaXMgbWVhbnMgdGhhdFxuICogYGxpdmUoKWAgc2hvdWxkIG5vdCBiZSB1c2VkIHdoZW4gdGhlIGJpbmRpbmcgd2lsbCBjYXVzZSBhIHR5cGUgY29udmVyc2lvbi4gSWZcbiAqIHlvdSB1c2UgYGxpdmUoKWAgd2l0aCBhbiBhdHRyaWJ1dGUgYmluZGluZywgbWFrZSBzdXJlIHRoYXQgb25seSBzdHJpbmdzIGFyZVxuICogcGFzc2VkIGluLCBvciB0aGUgYmluZGluZyB3aWxsIHVwZGF0ZSBldmVyeSByZW5kZXIuXG4gKi9cbmV4cG9ydCBjb25zdCBsaXZlID0gZGlyZWN0aXZlKExpdmVEaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge0xpdmVEaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjEgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbi8qKlxuICogUmV0dXJucyBhbiBpdGVyYWJsZSBjb250YWluaW5nIHRoZSByZXN1bHQgb2YgY2FsbGluZyBgZih2YWx1ZSlgIG9uIGVhY2hcbiAqIHZhbHVlIGluIGBpdGVtc2AuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogcmVuZGVyKCkge1xuICogICByZXR1cm4gaHRtbGBcbiAqICAgICA8dWw+XG4gKiAgICAgICAke21hcChpdGVtcywgKGkpID0+IGh0bWxgPGxpPiR7aX08L2xpPmApfVxuICogICAgIDwvdWw+XG4gKiAgIGA7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uKiBtYXA8VD4oXG4gIGl0ZW1zOiBJdGVyYWJsZTxUPiB8IHVuZGVmaW5lZCxcbiAgZjogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyKSA9PiB1bmtub3duXG4pIHtcbiAgaWYgKGl0ZW1zICE9PSB1bmRlZmluZWQpIHtcbiAgICBsZXQgaSA9IDA7XG4gICAgZm9yIChjb25zdCB2YWx1ZSBvZiBpdGVtcykge1xuICAgICAgeWllbGQgZih2YWx1ZSwgaSsrKTtcbiAgICB9XG4gIH1cbn1cbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIxIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG4vKipcbiAqIFJldHVybnMgYW4gaXRlcmFibGUgb2YgaW50ZWdlcnMgZnJvbSBgc3RhcnRgIHRvIGBlbmRgIChleGNsdXNpdmUpXG4gKiBpbmNyZW1lbnRpbmcgYnkgYHN0ZXBgLlxuICpcbiAqIElmIGBzdGFydGAgaXMgb21pdHRlZCwgdGhlIHJhbmdlIHN0YXJ0cyBhdCBgMGAuIGBzdGVwYCBkZWZhdWx0cyB0byBgMWAuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogcmVuZGVyKCkge1xuICogICByZXR1cm4gaHRtbGBcbiAqICAgICAke21hcChyYW5nZSg4KSwgKCkgPT4gaHRtbGA8ZGl2IGNsYXNzPVwiY2VsbFwiPjwvZGl2PmApfVxuICogICBgO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByYW5nZShlbmQ6IG51bWJlcik6IEl0ZXJhYmxlPG51bWJlcj47XG5leHBvcnQgZnVuY3Rpb24gcmFuZ2UoXG4gIHN0YXJ0OiBudW1iZXIsXG4gIGVuZDogbnVtYmVyLFxuICBzdGVwPzogbnVtYmVyXG4pOiBJdGVyYWJsZTxudW1iZXI+O1xuZXhwb3J0IGZ1bmN0aW9uKiByYW5nZShzdGFydE9yRW5kOiBudW1iZXIsIGVuZD86IG51bWJlciwgc3RlcCA9IDEpIHtcbiAgY29uc3Qgc3RhcnQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IDAgOiBzdGFydE9yRW5kO1xuICBlbmQgPz89IHN0YXJ0T3JFbmQ7XG4gIGZvciAobGV0IGkgPSBzdGFydDsgc3RlcCA+IDAgPyBpIDwgZW5kIDogZW5kIDwgaTsgaSArPSBzdGVwKSB7XG4gICAgeWllbGQgaTtcbiAgfVxufVxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7Q2hpbGRQYXJ0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIERpcmVjdGl2ZSwgUGFydEluZm8sIFBhcnRUeXBlfSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtcbiAgaW5zZXJ0UGFydCxcbiAgZ2V0Q29tbWl0dGVkVmFsdWUsXG4gIHJlbW92ZVBhcnQsXG4gIHNldENvbW1pdHRlZFZhbHVlLFxuICBzZXRDaGlsZFBhcnRWYWx1ZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuXG5leHBvcnQgdHlwZSBLZXlGbjxUPiA9IChpdGVtOiBULCBpbmRleDogbnVtYmVyKSA9PiB1bmtub3duO1xuZXhwb3J0IHR5cGUgSXRlbVRlbXBsYXRlPFQ+ID0gKGl0ZW06IFQsIGluZGV4OiBudW1iZXIpID0+IHVua25vd247XG5cbi8vIEhlbHBlciBmb3IgZ2VuZXJhdGluZyBhIG1hcCBvZiBhcnJheSBpdGVtIHRvIGl0cyBpbmRleCBvdmVyIGEgc3Vic2V0XG4vLyBvZiBhbiBhcnJheSAodXNlZCB0byBsYXppbHkgZ2VuZXJhdGUgYG5ld0tleVRvSW5kZXhNYXBgIGFuZFxuLy8gYG9sZEtleVRvSW5kZXhNYXBgKVxuY29uc3QgZ2VuZXJhdGVNYXAgPSAobGlzdDogdW5rbm93bltdLCBzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlcikgPT4ge1xuICBjb25zdCBtYXAgPSBuZXcgTWFwPHVua25vd24sIG51bWJlcj4oKTtcbiAgZm9yIChsZXQgaSA9IHN0YXJ0OyBpIDw9IGVuZDsgaSsrKSB7XG4gICAgbWFwLnNldChsaXN0W2ldLCBpKTtcbiAgfVxuICByZXR1cm4gbWFwO1xufTtcblxuY2xhc3MgUmVwZWF0RGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgcHJpdmF0ZSBfaXRlbUtleXM/OiB1bmtub3duW107XG5cbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICAgIGlmIChwYXJ0SW5mby50eXBlICE9PSBQYXJ0VHlwZS5DSElMRCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdyZXBlYXQoKSBjYW4gb25seSBiZSB1c2VkIGluIHRleHQgZXhwcmVzc2lvbnMnKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9nZXRWYWx1ZXNBbmRLZXlzPFQ+KFxuICAgIGl0ZW1zOiBJdGVyYWJsZTxUPixcbiAgICBrZXlGbk9yVGVtcGxhdGU6IEtleUZuPFQ+IHwgSXRlbVRlbXBsYXRlPFQ+LFxuICAgIHRlbXBsYXRlPzogSXRlbVRlbXBsYXRlPFQ+XG4gICkge1xuICAgIGxldCBrZXlGbjogS2V5Rm48VD4gfCB1bmRlZmluZWQ7XG4gICAgaWYgKHRlbXBsYXRlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRlbXBsYXRlID0ga2V5Rm5PclRlbXBsYXRlO1xuICAgIH0gZWxzZSBpZiAoa2V5Rm5PclRlbXBsYXRlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGtleUZuID0ga2V5Rm5PclRlbXBsYXRlIGFzIEtleUZuPFQ+O1xuICAgIH1cbiAgICBjb25zdCBrZXlzID0gW107XG4gICAgY29uc3QgdmFsdWVzID0gW107XG4gICAgbGV0IGluZGV4ID0gMDtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgIGtleXNbaW5kZXhdID0ga2V5Rm4gPyBrZXlGbihpdGVtLCBpbmRleCkgOiBpbmRleDtcbiAgICAgIHZhbHVlc1tpbmRleF0gPSB0ZW1wbGF0ZSEoaXRlbSwgaW5kZXgpO1xuICAgICAgaW5kZXgrKztcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbHVlcyxcbiAgICAgIGtleXMsXG4gICAgfTtcbiAgfVxuXG4gIHJlbmRlcjxUPihpdGVtczogSXRlcmFibGU8VD4sIHRlbXBsYXRlOiBJdGVtVGVtcGxhdGU8VD4pOiBBcnJheTx1bmtub3duPjtcbiAgcmVuZGVyPFQ+KFxuICAgIGl0ZW1zOiBJdGVyYWJsZTxUPixcbiAgICBrZXlGbjogS2V5Rm48VD4gfCBJdGVtVGVtcGxhdGU8VD4sXG4gICAgdGVtcGxhdGU6IEl0ZW1UZW1wbGF0ZTxUPlxuICApOiBBcnJheTx1bmtub3duPjtcbiAgcmVuZGVyPFQ+KFxuICAgIGl0ZW1zOiBJdGVyYWJsZTxUPixcbiAgICBrZXlGbk9yVGVtcGxhdGU6IEtleUZuPFQ+IHwgSXRlbVRlbXBsYXRlPFQ+LFxuICAgIHRlbXBsYXRlPzogSXRlbVRlbXBsYXRlPFQ+XG4gICkge1xuICAgIHJldHVybiB0aGlzLl9nZXRWYWx1ZXNBbmRLZXlzKGl0ZW1zLCBrZXlGbk9yVGVtcGxhdGUsIHRlbXBsYXRlKS52YWx1ZXM7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGU8VD4oXG4gICAgY29udGFpbmVyUGFydDogQ2hpbGRQYXJ0LFxuICAgIFtpdGVtcywga2V5Rm5PclRlbXBsYXRlLCB0ZW1wbGF0ZV06IFtcbiAgICAgIEl0ZXJhYmxlPFQ+LFxuICAgICAgS2V5Rm48VD4gfCBJdGVtVGVtcGxhdGU8VD4sXG4gICAgICBJdGVtVGVtcGxhdGU8VD4sXG4gICAgXVxuICApIHtcbiAgICAvLyBPbGQgcGFydCAmIGtleSBsaXN0cyBhcmUgcmV0cmlldmVkIGZyb20gdGhlIGxhc3QgdXBkYXRlICh3aGljaCBtYXlcbiAgICAvLyBiZSBwcmltZWQgYnkgaHlkcmF0aW9uKVxuICAgIGNvbnN0IG9sZFBhcnRzID0gZ2V0Q29tbWl0dGVkVmFsdWUoXG4gICAgICBjb250YWluZXJQYXJ0XG4gICAgKSBhcyBBcnJheTxDaGlsZFBhcnQgfCBudWxsPjtcbiAgICBjb25zdCB7dmFsdWVzOiBuZXdWYWx1ZXMsIGtleXM6IG5ld0tleXN9ID0gdGhpcy5fZ2V0VmFsdWVzQW5kS2V5cyhcbiAgICAgIGl0ZW1zLFxuICAgICAga2V5Rm5PclRlbXBsYXRlLFxuICAgICAgdGVtcGxhdGVcbiAgICApO1xuXG4gICAgLy8gV2UgY2hlY2sgdGhhdCBvbGRQYXJ0cywgdGhlIGNvbW1pdHRlZCB2YWx1ZSwgaXMgYW4gQXJyYXkgYXMgYW5cbiAgICAvLyBpbmRpY2F0b3IgdGhhdCB0aGUgcHJldmlvdXMgdmFsdWUgY2FtZSBmcm9tIGEgcmVwZWF0KCkgY2FsbC4gSWZcbiAgICAvLyBvbGRQYXJ0cyBpcyBub3QgYW4gQXJyYXkgdGhlbiB0aGlzIGlzIHRoZSBmaXJzdCByZW5kZXIgYW5kIHdlIHJldHVyblxuICAgIC8vIGFuIGFycmF5IGZvciBsaXQtaHRtbCdzIGFycmF5IGhhbmRsaW5nIHRvIHJlbmRlciwgYW5kIHJlbWVtYmVyIHRoZVxuICAgIC8vIGtleXMuXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KG9sZFBhcnRzKSkge1xuICAgICAgdGhpcy5faXRlbUtleXMgPSBuZXdLZXlzO1xuICAgICAgcmV0dXJuIG5ld1ZhbHVlcztcbiAgICB9XG5cbiAgICAvLyBJbiBTU1IgaHlkcmF0aW9uIGl0J3MgcG9zc2libGUgZm9yIG9sZFBhcnRzIHRvIGJlIGFuIGFycmF5IGJ1dCBmb3IgdXNcbiAgICAvLyB0byBub3QgaGF2ZSBpdGVtIGtleXMgYmVjYXVzZSB0aGUgdXBkYXRlKCkgaGFzbid0IHJ1biB5ZXQuIFdlIHNldCB0aGVcbiAgICAvLyBrZXlzIHRvIGFuIGVtcHR5IGFycmF5LiBUaGlzIHdpbGwgY2F1c2UgYWxsIG9sZEtleS9uZXdLZXkgY29tcGFyaXNvbnNcbiAgICAvLyB0byBmYWlsIGFuZCBleGVjdXRpb24gdG8gZmFsbCB0byB0aGUgbGFzdCBuZXN0ZWQgYnJhY2ggYmVsb3cgd2hpY2hcbiAgICAvLyByZXVzZXMgdGhlIG9sZFBhcnQuXG4gICAgY29uc3Qgb2xkS2V5cyA9ICh0aGlzLl9pdGVtS2V5cyA/Pz0gW10pO1xuXG4gICAgLy8gTmV3IHBhcnQgbGlzdCB3aWxsIGJlIGJ1aWx0IHVwIGFzIHdlIGdvIChlaXRoZXIgcmV1c2VkIGZyb21cbiAgICAvLyBvbGQgcGFydHMgb3IgY3JlYXRlZCBmb3IgbmV3IGtleXMgaW4gdGhpcyB1cGRhdGUpLiBUaGlzIGlzXG4gICAgLy8gc2F2ZWQgaW4gdGhlIGFib3ZlIGNhY2hlIGF0IHRoZSBlbmQgb2YgdGhlIHVwZGF0ZS5cbiAgICBjb25zdCBuZXdQYXJ0czogQ2hpbGRQYXJ0W10gPSBbXTtcblxuICAgIC8vIE1hcHMgZnJvbSBrZXkgdG8gaW5kZXggZm9yIGN1cnJlbnQgYW5kIHByZXZpb3VzIHVwZGF0ZTsgdGhlc2VcbiAgICAvLyBhcmUgZ2VuZXJhdGVkIGxhemlseSBvbmx5IHdoZW4gbmVlZGVkIGFzIGEgcGVyZm9ybWFuY2VcbiAgICAvLyBvcHRpbWl6YXRpb24sIHNpbmNlIHRoZXkgYXJlIG9ubHkgcmVxdWlyZWQgZm9yIG11bHRpcGxlXG4gICAgLy8gbm9uLWNvbnRpZ3VvdXMgY2hhbmdlcyBpbiB0aGUgbGlzdCwgd2hpY2ggYXJlIGxlc3MgY29tbW9uLlxuICAgIGxldCBuZXdLZXlUb0luZGV4TWFwITogTWFwPHVua25vd24sIG51bWJlcj47XG4gICAgbGV0IG9sZEtleVRvSW5kZXhNYXAhOiBNYXA8dW5rbm93biwgbnVtYmVyPjtcblxuICAgIC8vIEhlYWQgYW5kIHRhaWwgcG9pbnRlcnMgdG8gb2xkIHBhcnRzIGFuZCBuZXcgdmFsdWVzXG4gICAgbGV0IG9sZEhlYWQgPSAwO1xuICAgIGxldCBvbGRUYWlsID0gb2xkUGFydHMubGVuZ3RoIC0gMTtcbiAgICBsZXQgbmV3SGVhZCA9IDA7XG4gICAgbGV0IG5ld1RhaWwgPSBuZXdWYWx1ZXMubGVuZ3RoIC0gMTtcblxuICAgIC8vIE92ZXJ2aWV3IG9mIE8obikgcmVjb25jaWxpYXRpb24gYWxnb3JpdGhtIChnZW5lcmFsIGFwcHJvYWNoXG4gICAgLy8gYmFzZWQgb24gaWRlYXMgZm91bmQgaW4gaXZpLCB2dWUsIHNuYWJiZG9tLCBldGMuKTpcbiAgICAvL1xuICAgIC8vICogV2Ugc3RhcnQgd2l0aCB0aGUgbGlzdCBvZiBvbGQgcGFydHMgYW5kIG5ldyB2YWx1ZXMgKGFuZFxuICAgIC8vICAgYXJyYXlzIG9mIHRoZWlyIHJlc3BlY3RpdmUga2V5cyksIGhlYWQvdGFpbCBwb2ludGVycyBpbnRvXG4gICAgLy8gICBlYWNoLCBhbmQgd2UgYnVpbGQgdXAgdGhlIG5ldyBsaXN0IG9mIHBhcnRzIGJ5IHVwZGF0aW5nXG4gICAgLy8gICAoYW5kIHdoZW4gbmVlZGVkLCBtb3ZpbmcpIG9sZCBwYXJ0cyBvciBjcmVhdGluZyBuZXcgb25lcy5cbiAgICAvLyAgIFRoZSBpbml0aWFsIHNjZW5hcmlvIG1pZ2h0IGxvb2sgbGlrZSB0aGlzIChmb3IgYnJldml0eSBvZlxuICAgIC8vICAgdGhlIGRpYWdyYW1zLCB0aGUgbnVtYmVycyBpbiB0aGUgYXJyYXkgcmVmbGVjdCBrZXlzXG4gICAgLy8gICBhc3NvY2lhdGVkIHdpdGggdGhlIG9sZCBwYXJ0cyBvciBuZXcgdmFsdWVzLCBhbHRob3VnaCBrZXlzXG4gICAgLy8gICBhbmQgcGFydHMvdmFsdWVzIGFyZSBhY3R1YWxseSBzdG9yZWQgaW4gcGFyYWxsZWwgYXJyYXlzXG4gICAgLy8gICBpbmRleGVkIHVzaW5nIHRoZSBzYW1lIGhlYWQvdGFpbCBwb2ludGVycyk6XG4gICAgLy9cbiAgICAvLyAgICAgIG9sZEhlYWQgdiAgICAgICAgICAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIDIsIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWyAsICAsICAsICAsICAsICAsICBdXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdIDwtIHJlZmxlY3RzIHRoZSB1c2VyJ3MgbmV3XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0gb3JkZXJcbiAgICAvLyAgICAgIG5ld0hlYWQgXiAgICAgICAgICAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIEl0ZXJhdGUgb2xkICYgbmV3IGxpc3RzIGZyb20gYm90aCBzaWRlcywgdXBkYXRpbmcsXG4gICAgLy8gICBzd2FwcGluZywgb3IgcmVtb3ZpbmcgcGFydHMgYXQgdGhlIGhlYWQvdGFpbCBsb2NhdGlvbnNcbiAgICAvLyAgIHVudGlsIG5laXRoZXIgaGVhZCBub3IgdGFpbCBjYW4gbW92ZS5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzoga2V5cyBhdCBoZWFkIHBvaW50ZXJzIG1hdGNoLCBzbyB1cGRhdGUgb2xkXG4gICAgLy8gICBwYXJ0IDAgaW4tcGxhY2UgKG5vIG5lZWQgdG8gbW92ZSBpdCkgYW5kIHJlY29yZCBwYXJ0IDAgaW5cbiAgICAvLyAgIHRoZSBgbmV3UGFydHNgIGxpc3QuIFRoZSBsYXN0IHRoaW5nIHdlIGRvIGlzIGFkdmFuY2UgdGhlXG4gICAgLy8gICBgb2xkSGVhZGAgYW5kIGBuZXdIZWFkYCBwb2ludGVycyAod2lsbCBiZSByZWZsZWN0ZWQgaW4gdGhlXG4gICAgLy8gICBuZXh0IGRpYWdyYW0pLlxuICAgIC8vXG4gICAgLy8gICAgICBvbGRIZWFkIHYgICAgICAgICAgICAgICAgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAyLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFswLCAgLCAgLCAgLCAgLCAgLCAgXSA8LSBoZWFkcyBtYXRjaGVkOiB1cGRhdGUgMFxuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSAgICBhbmQgYWR2YW5jZSBib3RoIG9sZEhlYWRcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJiBuZXdIZWFkXG4gICAgLy8gICAgICBuZXdIZWFkIF4gICAgICAgICAgICAgICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBoZWFkIHBvaW50ZXJzIGRvbid0IG1hdGNoLCBidXQgdGFpbFxuICAgIC8vICAgcG9pbnRlcnMgZG8sIHNvIHVwZGF0ZSBwYXJ0IDYgaW4gcGxhY2UgKG5vIG5lZWQgdG8gbW92ZVxuICAgIC8vICAgaXQpLCBhbmQgcmVjb3JkIHBhcnQgNiBpbiB0aGUgYG5ld1BhcnRzYCBsaXN0LiBMYXN0LFxuICAgIC8vICAgYWR2YW5jZSB0aGUgYG9sZFRhaWxgIGFuZCBgb2xkSGVhZGAgcG9pbnRlcnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgIG9sZEhlYWQgdiAgICAgICAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIDIsIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsICAsICAsICAsICAsICAsIDZdIDwtIHRhaWxzIG1hdGNoZWQ6IHVwZGF0ZSA2XG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIGJvdGggb2xkVGFpbFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmIG5ld1RhaWxcbiAgICAvLyAgICAgICAgIG5ld0hlYWQgXiAgICAgICAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIElmIG5laXRoZXIgaGVhZCBub3IgdGFpbCBtYXRjaDsgbmV4dCBjaGVjayBpZiBvbmUgb2YgdGhlXG4gICAgLy8gICBvbGQgaGVhZC90YWlsIGl0ZW1zIHdhcyByZW1vdmVkLiBXZSBmaXJzdCBuZWVkIHRvIGdlbmVyYXRlXG4gICAgLy8gICB0aGUgcmV2ZXJzZSBtYXAgb2YgbmV3IGtleXMgdG8gaW5kZXggKGBuZXdLZXlUb0luZGV4TWFwYCksXG4gICAgLy8gICB3aGljaCBpcyBkb25lIG9uY2UgbGF6aWx5IGFzIGEgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uLFxuICAgIC8vICAgc2luY2Ugd2Ugb25seSBoaXQgdGhpcyBjYXNlIGlmIG11bHRpcGxlIG5vbi1jb250aWd1b3VzXG4gICAgLy8gICBjaGFuZ2VzIHdlcmUgbWFkZS4gTm90ZSB0aGF0IGZvciBjb250aWd1b3VzIHJlbW92YWxcbiAgICAvLyAgIGFueXdoZXJlIGluIHRoZSBsaXN0LCB0aGUgaGVhZCBhbmQgdGFpbHMgd291bGQgYWR2YW5jZVxuICAgIC8vICAgZnJvbSBlaXRoZXIgZW5kIGFuZCBwYXNzIGVhY2ggb3RoZXIgYmVmb3JlIHdlIGdldCB0byB0aGlzXG4gICAgLy8gICBjYXNlIGFuZCByZW1vdmFscyB3b3VsZCBiZSBoYW5kbGVkIGluIHRoZSBmaW5hbCB3aGlsZSBsb29wXG4gICAgLy8gICB3aXRob3V0IG5lZWRpbmcgdG8gZ2VuZXJhdGUgdGhlIG1hcC5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogVGhlIGtleSBhdCBgb2xkVGFpbGAgd2FzIHJlbW92ZWQgKG5vIGxvbmdlclxuICAgIC8vICAgaW4gdGhlIGBuZXdLZXlUb0luZGV4TWFwYCksIHNvIHJlbW92ZSB0aGF0IHBhcnQgZnJvbSB0aGVcbiAgICAvLyAgIERPTSBhbmQgYWR2YW5jZSBqdXN0IHRoZSBgb2xkVGFpbGAgcG9pbnRlci5cbiAgICAvL1xuICAgIC8vICAgICAgICAgb2xkSGVhZCB2ICAgICAgICAgICB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgMiwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgICwgICwgICwgICwgICwgNl0gPC0gNSBub3QgaW4gbmV3IG1hcDogcmVtb3ZlXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIDUgYW5kIGFkdmFuY2Ugb2xkVGFpbFxuICAgIC8vICAgICAgICAgbmV3SGVhZCBeICAgICAgICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogT25jZSBoZWFkIGFuZCB0YWlsIGNhbm5vdCBtb3ZlLCBhbnkgbWlzbWF0Y2hlcyBhcmUgZHVlIHRvXG4gICAgLy8gICBlaXRoZXIgbmV3IG9yIG1vdmVkIGl0ZW1zOyBpZiBhIG5ldyBrZXkgaXMgaW4gdGhlIHByZXZpb3VzXG4gICAgLy8gICBcIm9sZCBrZXkgdG8gb2xkIGluZGV4XCIgbWFwLCBtb3ZlIHRoZSBvbGQgcGFydCB0byB0aGUgbmV3XG4gICAgLy8gICBsb2NhdGlvbiwgb3RoZXJ3aXNlIGNyZWF0ZSBhbmQgaW5zZXJ0IGEgbmV3IHBhcnQuIE5vdGVcbiAgICAvLyAgIHRoYXQgd2hlbiBtb3ZpbmcgYW4gb2xkIHBhcnQgd2UgbnVsbCBpdHMgcG9zaXRpb24gaW4gdGhlXG4gICAgLy8gICBvbGRQYXJ0cyBhcnJheSBpZiBpdCBsaWVzIGJldHdlZW4gdGhlIGhlYWQgYW5kIHRhaWwgc28gd2VcbiAgICAvLyAgIGtub3cgdG8gc2tpcCBpdCB3aGVuIHRoZSBwb2ludGVycyBnZXQgdGhlcmUuXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IG5laXRoZXIgaGVhZCBub3IgdGFpbCBtYXRjaCwgYW5kIG5laXRoZXJcbiAgICAvLyAgIHdlcmUgcmVtb3ZlZDsgc28gZmluZCB0aGUgYG5ld0hlYWRgIGtleSBpbiB0aGVcbiAgICAvLyAgIGBvbGRLZXlUb0luZGV4TWFwYCwgYW5kIG1vdmUgdGhhdCBvbGQgcGFydCdzIERPTSBpbnRvIHRoZVxuICAgIC8vICAgbmV4dCBoZWFkIHBvc2l0aW9uIChiZWZvcmUgYG9sZFBhcnRzW29sZEhlYWRdYCkuIExhc3QsXG4gICAgLy8gICBudWxsIHRoZSBwYXJ0IGluIHRoZSBgb2xkUGFydGAgYXJyYXkgc2luY2UgaXQgd2FzXG4gICAgLy8gICBzb21ld2hlcmUgaW4gdGhlIHJlbWFpbmluZyBvbGRQYXJ0cyBzdGlsbCB0byBiZSBzY2FubmVkXG4gICAgLy8gICAoYmV0d2VlbiB0aGUgaGVhZCBhbmQgdGFpbCBwb2ludGVycykgc28gdGhhdCB3ZSBrbm93IHRvXG4gICAgLy8gICBza2lwIHRoYXQgb2xkIHBhcnQgb24gZnV0dXJlIGl0ZXJhdGlvbnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgIG9sZEhlYWQgdiAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsICAsICAsICAsICAsIDZdIDwtIHN0dWNrOiB1cGRhdGUgJiBtb3ZlIDJcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICAgaW50byBwbGFjZSBhbmQgYWR2YW5jZVxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdIZWFkXG4gICAgLy8gICAgICAgICBuZXdIZWFkIF4gICAgICAgICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBOb3RlIHRoYXQgZm9yIG1vdmVzL2luc2VydGlvbnMgbGlrZSB0aGUgb25lIGFib3ZlLCBhIHBhcnRcbiAgICAvLyAgIGluc2VydGVkIGF0IHRoZSBoZWFkIHBvaW50ZXIgaXMgaW5zZXJ0ZWQgYmVmb3JlIHRoZVxuICAgIC8vICAgY3VycmVudCBgb2xkUGFydHNbb2xkSGVhZF1gLCBhbmQgYSBwYXJ0IGluc2VydGVkIGF0IHRoZVxuICAgIC8vICAgdGFpbCBwb2ludGVyIGlzIGluc2VydGVkIGJlZm9yZSBgbmV3UGFydHNbbmV3VGFpbCsxXWAuIFRoZVxuICAgIC8vICAgc2VlbWluZyBhc3ltbWV0cnkgbGllcyBpbiB0aGUgZmFjdCB0aGF0IG5ldyBwYXJ0cyBhcmVcbiAgICAvLyAgIG1vdmVkIGludG8gcGxhY2Ugb3V0c2lkZSBpbiwgc28gdG8gdGhlIHJpZ2h0IG9mIHRoZSBoZWFkXG4gICAgLy8gICBwb2ludGVyIGFyZSBvbGQgcGFydHMsIGFuZCB0byB0aGUgcmlnaHQgb2YgdGhlIHRhaWxcbiAgICAvLyAgIHBvaW50ZXIgYXJlIG5ldyBwYXJ0cy5cbiAgICAvL1xuICAgIC8vICogV2UgYWx3YXlzIHJlc3RhcnQgYmFjayBmcm9tIHRoZSB0b3Agb2YgdGhlIGFsZ29yaXRobSxcbiAgICAvLyAgIGFsbG93aW5nIG1hdGNoaW5nIGFuZCBzaW1wbGUgdXBkYXRlcyBpbiBwbGFjZSB0b1xuICAgIC8vICAgY29udGludWUuLi5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogdGhlIGhlYWQgcG9pbnRlcnMgb25jZSBhZ2FpbiBtYXRjaCwgc29cbiAgICAvLyAgIHNpbXBseSB1cGRhdGUgcGFydCAxIGFuZCByZWNvcmQgaXQgaW4gdGhlIGBuZXdQYXJ0c2BcbiAgICAvLyAgIGFycmF5LiAgTGFzdCwgYWR2YW5jZSBib3RoIGhlYWQgcG9pbnRlcnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgIG9sZEhlYWQgdiAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsICAsICAsICAsIDZdIDwtIGhlYWRzIG1hdGNoZWQ6IHVwZGF0ZSAxXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIGJvdGggb2xkSGVhZFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmIG5ld0hlYWRcbiAgICAvLyAgICAgICAgICAgIG5ld0hlYWQgXiAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIEFzIG1lbnRpb25lZCBhYm92ZSwgaXRlbXMgdGhhdCB3ZXJlIG1vdmVkIGFzIGEgcmVzdWx0IG9mXG4gICAgLy8gICBiZWluZyBzdHVjayAodGhlIGZpbmFsIGVsc2UgY2xhdXNlIGluIHRoZSBjb2RlIGJlbG93KSBhcmVcbiAgICAvLyAgIG1hcmtlZCB3aXRoIG51bGwsIHNvIHdlIGFsd2F5cyBhZHZhbmNlIG9sZCBwb2ludGVycyBvdmVyXG4gICAgLy8gICB0aGVzZSBzbyB3ZSdyZSBjb21wYXJpbmcgdGhlIG5leHQgYWN0dWFsIG9sZCB2YWx1ZSBvblxuICAgIC8vICAgZWl0aGVyIGVuZC5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogYG9sZEhlYWRgIGlzIG51bGwgKGFscmVhZHkgcGxhY2VkIGluXG4gICAgLy8gICBuZXdQYXJ0cyksIHNvIGFkdmFuY2UgYG9sZEhlYWRgLlxuICAgIC8vXG4gICAgLy8gICAgICAgICAgICBvbGRIZWFkIHYgICAgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAtLCAzLCA0LCA1LCA2XSA8LSBvbGQgaGVhZCBhbHJlYWR5IHVzZWQ6XG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsICAsICAsICAsIDZdICAgIGFkdmFuY2Ugb2xkSGVhZFxuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XVxuICAgIC8vICAgICAgICAgICAgICAgbmV3SGVhZCBeICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogTm90ZSBpdCdzIG5vdCBjcml0aWNhbCB0byBtYXJrIG9sZCBwYXJ0cyBhcyBudWxsIHdoZW4gdGhleVxuICAgIC8vICAgYXJlIG1vdmVkIGZyb20gaGVhZCB0byB0YWlsIG9yIHRhaWwgdG8gaGVhZCwgc2luY2UgdGhleVxuICAgIC8vICAgd2lsbCBiZSBvdXRzaWRlIHRoZSBwb2ludGVyIHJhbmdlIGFuZCBuZXZlciB2aXNpdGVkIGFnYWluLlxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBIZXJlIHRoZSBvbGQgdGFpbCBrZXkgbWF0Y2hlcyB0aGUgbmV3IGhlYWRcbiAgICAvLyAgIGtleSwgc28gdGhlIHBhcnQgYXQgdGhlIGBvbGRUYWlsYCBwb3NpdGlvbiBhbmQgbW92ZSBpdHNcbiAgICAvLyAgIERPTSB0byB0aGUgbmV3IGhlYWQgcG9zaXRpb24gKGJlZm9yZSBgb2xkUGFydHNbb2xkSGVhZF1gKS5cbiAgICAvLyAgIExhc3QsIGFkdmFuY2UgYG9sZFRhaWxgIGFuZCBgbmV3SGVhZGAgcG9pbnRlcnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgICAgICAgIG9sZEhlYWQgdiAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsIDQsICAsICAsIDZdIDwtIG9sZCB0YWlsIG1hdGNoZXMgbmV3XG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgaGVhZDogdXBkYXRlICYgbW92ZSA0LFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkdmFuY2Ugb2xkVGFpbCAmIG5ld0hlYWRcbiAgICAvLyAgICAgICAgICAgICAgIG5ld0hlYWQgXiAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IE9sZCBhbmQgbmV3IGhlYWQga2V5cyBtYXRjaCwgc28gdXBkYXRlIHRoZVxuICAgIC8vICAgb2xkIGhlYWQgcGFydCBpbiBwbGFjZSwgYW5kIGFkdmFuY2UgdGhlIGBvbGRIZWFkYCBhbmRcbiAgICAvLyAgIGBuZXdIZWFkYCBwb2ludGVycy5cbiAgICAvL1xuICAgIC8vICAgICAgICAgICAgICAgb2xkSGVhZCB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgLSwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgMSwgNCwgMywgICAsNl0gPC0gaGVhZHMgbWF0Y2g6IHVwZGF0ZSAzXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIG9sZEhlYWQgJlxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdIZWFkXG4gICAgLy8gICAgICAgICAgICAgICAgICBuZXdIZWFkIF4gIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBPbmNlIHRoZSBuZXcgb3Igb2xkIHBvaW50ZXJzIG1vdmUgcGFzdCBlYWNoIG90aGVyIHRoZW4gYWxsXG4gICAgLy8gICB3ZSBoYXZlIGxlZnQgaXMgYWRkaXRpb25zIChpZiBvbGQgbGlzdCBleGhhdXN0ZWQpIG9yXG4gICAgLy8gICByZW1vdmFscyAoaWYgbmV3IGxpc3QgZXhoYXVzdGVkKS4gVGhvc2UgYXJlIGhhbmRsZWQgaW4gdGhlXG4gICAgLy8gICBmaW5hbCB3aGlsZSBsb29wcyBhdCB0aGUgZW5kLlxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBgb2xkSGVhZGAgZXhjZWVkZWQgYG9sZFRhaWxgLCBzbyB3ZSdyZSBkb25lXG4gICAgLy8gICB3aXRoIHRoZSBtYWluIGxvb3AuICBDcmVhdGUgdGhlIHJlbWFpbmluZyBwYXJ0IGFuZCBpbnNlcnRcbiAgICAvLyAgIGl0IGF0IHRoZSBuZXcgaGVhZCBwb3NpdGlvbiwgYW5kIHRoZSB1cGRhdGUgaXMgY29tcGxldGUuXG4gICAgLy9cbiAgICAvLyAgICAgICAgICAgICAgICAgICAob2xkSGVhZCA+IG9sZFRhaWwpXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsIDQsIDMsIDcgLDZdIDwtIGNyZWF0ZSBhbmQgaW5zZXJ0IDdcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl1cbiAgICAvLyAgICAgICAgICAgICAgICAgICAgIG5ld0hlYWQgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIE5vdGUgdGhhdCB0aGUgb3JkZXIgb2YgdGhlIGlmL2Vsc2UgY2xhdXNlcyBpcyBub3RcbiAgICAvLyAgIGltcG9ydGFudCB0byB0aGUgYWxnb3JpdGhtLCBhcyBsb25nIGFzIHRoZSBudWxsIGNoZWNrc1xuICAgIC8vICAgY29tZSBmaXJzdCAodG8gZW5zdXJlIHdlJ3JlIGFsd2F5cyB3b3JraW5nIG9uIHZhbGlkIG9sZFxuICAgIC8vICAgcGFydHMpIGFuZCB0aGF0IHRoZSBmaW5hbCBlbHNlIGNsYXVzZSBjb21lcyBsYXN0IChzaW5jZVxuICAgIC8vICAgdGhhdCdzIHdoZXJlIHRoZSBleHBlbnNpdmUgbW92ZXMgb2NjdXIpLiBUaGUgb3JkZXIgb2ZcbiAgICAvLyAgIHJlbWFpbmluZyBjbGF1c2VzIGlzIGp1c3QgYSBzaW1wbGUgZ3Vlc3MgYXQgd2hpY2ggY2FzZXNcbiAgICAvLyAgIHdpbGwgYmUgbW9zdCBjb21tb24uXG4gICAgLy9cbiAgICAvLyAqIE5vdGUsIHdlIGNvdWxkIGNhbGN1bGF0ZSB0aGUgbG9uZ2VzdFxuICAgIC8vICAgaW5jcmVhc2luZyBzdWJzZXF1ZW5jZSAoTElTKSBvZiBvbGQgaXRlbXMgaW4gbmV3IHBvc2l0aW9uLFxuICAgIC8vICAgYW5kIG9ubHkgbW92ZSB0aG9zZSBub3QgaW4gdGhlIExJUyBzZXQuIEhvd2V2ZXIgdGhhdCBjb3N0c1xuICAgIC8vICAgTyhubG9nbikgdGltZSBhbmQgYWRkcyBhIGJpdCBtb3JlIGNvZGUsIGFuZCBvbmx5IGhlbHBzXG4gICAgLy8gICBtYWtlIHJhcmUgdHlwZXMgb2YgbXV0YXRpb25zIHJlcXVpcmUgZmV3ZXIgbW92ZXMuIFRoZVxuICAgIC8vICAgYWJvdmUgaGFuZGxlcyByZW1vdmVzLCBhZGRzLCByZXZlcnNhbCwgc3dhcHMsIGFuZCBzaW5nbGVcbiAgICAvLyAgIG1vdmVzIG9mIGNvbnRpZ3VvdXMgaXRlbXMgaW4gbGluZWFyIHRpbWUsIGluIHRoZSBtaW5pbXVtXG4gICAgLy8gICBudW1iZXIgb2YgbW92ZXMuIEFzIHRoZSBudW1iZXIgb2YgbXVsdGlwbGUgbW92ZXMgd2hlcmUgTElTXG4gICAgLy8gICBtaWdodCBoZWxwIGFwcHJvYWNoZXMgYSByYW5kb20gc2h1ZmZsZSwgdGhlIExJU1xuICAgIC8vICAgb3B0aW1pemF0aW9uIGJlY29tZXMgbGVzcyBoZWxwZnVsLCBzbyBpdCBzZWVtcyBub3Qgd29ydGhcbiAgICAvLyAgIHRoZSBjb2RlIGF0IHRoaXMgcG9pbnQuIENvdWxkIHJlY29uc2lkZXIgaWYgYSBjb21wZWxsaW5nXG4gICAgLy8gICBjYXNlIGFyaXNlcy5cblxuICAgIHdoaWxlIChvbGRIZWFkIDw9IG9sZFRhaWwgJiYgbmV3SGVhZCA8PSBuZXdUYWlsKSB7XG4gICAgICBpZiAob2xkUGFydHNbb2xkSGVhZF0gPT09IG51bGwpIHtcbiAgICAgICAgLy8gYG51bGxgIG1lYW5zIG9sZCBwYXJ0IGF0IGhlYWQgaGFzIGFscmVhZHkgYmVlbiB1c2VkXG4gICAgICAgIC8vIGJlbG93OyBza2lwXG4gICAgICAgIG9sZEhlYWQrKztcbiAgICAgIH0gZWxzZSBpZiAob2xkUGFydHNbb2xkVGFpbF0gPT09IG51bGwpIHtcbiAgICAgICAgLy8gYG51bGxgIG1lYW5zIG9sZCBwYXJ0IGF0IHRhaWwgaGFzIGFscmVhZHkgYmVlbiB1c2VkXG4gICAgICAgIC8vIGJlbG93OyBza2lwXG4gICAgICAgIG9sZFRhaWwtLTtcbiAgICAgIH0gZWxzZSBpZiAob2xkS2V5c1tvbGRIZWFkXSA9PT0gbmV3S2V5c1tuZXdIZWFkXSkge1xuICAgICAgICAvLyBPbGQgaGVhZCBtYXRjaGVzIG5ldyBoZWFkOyB1cGRhdGUgaW4gcGxhY2VcbiAgICAgICAgbmV3UGFydHNbbmV3SGVhZF0gPSBzZXRDaGlsZFBhcnRWYWx1ZShcbiAgICAgICAgICBvbGRQYXJ0c1tvbGRIZWFkXSEsXG4gICAgICAgICAgbmV3VmFsdWVzW25ld0hlYWRdXG4gICAgICAgICk7XG4gICAgICAgIG9sZEhlYWQrKztcbiAgICAgICAgbmV3SGVhZCsrO1xuICAgICAgfSBlbHNlIGlmIChvbGRLZXlzW29sZFRhaWxdID09PSBuZXdLZXlzW25ld1RhaWxdKSB7XG4gICAgICAgIC8vIE9sZCB0YWlsIG1hdGNoZXMgbmV3IHRhaWw7IHVwZGF0ZSBpbiBwbGFjZVxuICAgICAgICBuZXdQYXJ0c1tuZXdUYWlsXSA9IHNldENoaWxkUGFydFZhbHVlKFxuICAgICAgICAgIG9sZFBhcnRzW29sZFRhaWxdISxcbiAgICAgICAgICBuZXdWYWx1ZXNbbmV3VGFpbF1cbiAgICAgICAgKTtcbiAgICAgICAgb2xkVGFpbC0tO1xuICAgICAgICBuZXdUYWlsLS07XG4gICAgICB9IGVsc2UgaWYgKG9sZEtleXNbb2xkSGVhZF0gPT09IG5ld0tleXNbbmV3VGFpbF0pIHtcbiAgICAgICAgLy8gT2xkIGhlYWQgbWF0Y2hlcyBuZXcgdGFpbDsgdXBkYXRlIGFuZCBtb3ZlIHRvIG5ldyB0YWlsXG4gICAgICAgIG5ld1BhcnRzW25ld1RhaWxdID0gc2V0Q2hpbGRQYXJ0VmFsdWUoXG4gICAgICAgICAgb2xkUGFydHNbb2xkSGVhZF0hLFxuICAgICAgICAgIG5ld1ZhbHVlc1tuZXdUYWlsXVxuICAgICAgICApO1xuICAgICAgICBpbnNlcnRQYXJ0KGNvbnRhaW5lclBhcnQsIG5ld1BhcnRzW25ld1RhaWwgKyAxXSwgb2xkUGFydHNbb2xkSGVhZF0hKTtcbiAgICAgICAgb2xkSGVhZCsrO1xuICAgICAgICBuZXdUYWlsLS07XG4gICAgICB9IGVsc2UgaWYgKG9sZEtleXNbb2xkVGFpbF0gPT09IG5ld0tleXNbbmV3SGVhZF0pIHtcbiAgICAgICAgLy8gT2xkIHRhaWwgbWF0Y2hlcyBuZXcgaGVhZDsgdXBkYXRlIGFuZCBtb3ZlIHRvIG5ldyBoZWFkXG4gICAgICAgIG5ld1BhcnRzW25ld0hlYWRdID0gc2V0Q2hpbGRQYXJ0VmFsdWUoXG4gICAgICAgICAgb2xkUGFydHNbb2xkVGFpbF0hLFxuICAgICAgICAgIG5ld1ZhbHVlc1tuZXdIZWFkXVxuICAgICAgICApO1xuICAgICAgICBpbnNlcnRQYXJ0KGNvbnRhaW5lclBhcnQsIG9sZFBhcnRzW29sZEhlYWRdISwgb2xkUGFydHNbb2xkVGFpbF0hKTtcbiAgICAgICAgb2xkVGFpbC0tO1xuICAgICAgICBuZXdIZWFkKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobmV3S2V5VG9JbmRleE1hcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gTGF6aWx5IGdlbmVyYXRlIGtleS10by1pbmRleCBtYXBzLCB1c2VkIGZvciByZW1vdmFscyAmXG4gICAgICAgICAgLy8gbW92ZXMgYmVsb3dcbiAgICAgICAgICBuZXdLZXlUb0luZGV4TWFwID0gZ2VuZXJhdGVNYXAobmV3S2V5cywgbmV3SGVhZCwgbmV3VGFpbCk7XG4gICAgICAgICAgb2xkS2V5VG9JbmRleE1hcCA9IGdlbmVyYXRlTWFwKG9sZEtleXMsIG9sZEhlYWQsIG9sZFRhaWwpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghbmV3S2V5VG9JbmRleE1hcC5oYXMob2xkS2V5c1tvbGRIZWFkXSkpIHtcbiAgICAgICAgICAvLyBPbGQgaGVhZCBpcyBubyBsb25nZXIgaW4gbmV3IGxpc3Q7IHJlbW92ZVxuICAgICAgICAgIHJlbW92ZVBhcnQob2xkUGFydHNbb2xkSGVhZF0hKTtcbiAgICAgICAgICBvbGRIZWFkKys7XG4gICAgICAgIH0gZWxzZSBpZiAoIW5ld0tleVRvSW5kZXhNYXAuaGFzKG9sZEtleXNbb2xkVGFpbF0pKSB7XG4gICAgICAgICAgLy8gT2xkIHRhaWwgaXMgbm8gbG9uZ2VyIGluIG5ldyBsaXN0OyByZW1vdmVcbiAgICAgICAgICByZW1vdmVQYXJ0KG9sZFBhcnRzW29sZFRhaWxdISk7XG4gICAgICAgICAgb2xkVGFpbC0tO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIEFueSBtaXNtYXRjaGVzIGF0IHRoaXMgcG9pbnQgYXJlIGR1ZSB0byBhZGRpdGlvbnMgb3JcbiAgICAgICAgICAvLyBtb3Zlczsgc2VlIGlmIHdlIGhhdmUgYW4gb2xkIHBhcnQgd2UgY2FuIHJldXNlIGFuZCBtb3ZlXG4gICAgICAgICAgLy8gaW50byBwbGFjZVxuICAgICAgICAgIGNvbnN0IG9sZEluZGV4ID0gb2xkS2V5VG9JbmRleE1hcC5nZXQobmV3S2V5c1tuZXdIZWFkXSk7XG4gICAgICAgICAgY29uc3Qgb2xkUGFydCA9IG9sZEluZGV4ICE9PSB1bmRlZmluZWQgPyBvbGRQYXJ0c1tvbGRJbmRleF0gOiBudWxsO1xuICAgICAgICAgIGlmIChvbGRQYXJ0ID09PSBudWxsKSB7XG4gICAgICAgICAgICAvLyBObyBvbGQgcGFydCBmb3IgdGhpcyB2YWx1ZTsgY3JlYXRlIGEgbmV3IG9uZSBhbmRcbiAgICAgICAgICAgIC8vIGluc2VydCBpdFxuICAgICAgICAgICAgY29uc3QgbmV3UGFydCA9IGluc2VydFBhcnQoY29udGFpbmVyUGFydCwgb2xkUGFydHNbb2xkSGVhZF0hKTtcbiAgICAgICAgICAgIHNldENoaWxkUGFydFZhbHVlKG5ld1BhcnQsIG5ld1ZhbHVlc1tuZXdIZWFkXSk7XG4gICAgICAgICAgICBuZXdQYXJ0c1tuZXdIZWFkXSA9IG5ld1BhcnQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFJldXNlIG9sZCBwYXJ0XG4gICAgICAgICAgICBuZXdQYXJ0c1tuZXdIZWFkXSA9IHNldENoaWxkUGFydFZhbHVlKG9sZFBhcnQsIG5ld1ZhbHVlc1tuZXdIZWFkXSk7XG4gICAgICAgICAgICBpbnNlcnRQYXJ0KGNvbnRhaW5lclBhcnQsIG9sZFBhcnRzW29sZEhlYWRdISwgb2xkUGFydCk7XG4gICAgICAgICAgICAvLyBUaGlzIG1hcmtzIHRoZSBvbGQgcGFydCBhcyBoYXZpbmcgYmVlbiB1c2VkLCBzbyB0aGF0XG4gICAgICAgICAgICAvLyBpdCB3aWxsIGJlIHNraXBwZWQgaW4gdGhlIGZpcnN0IHR3byBjaGVja3MgYWJvdmVcbiAgICAgICAgICAgIG9sZFBhcnRzW29sZEluZGV4IGFzIG51bWJlcl0gPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBuZXdIZWFkKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQWRkIHBhcnRzIGZvciBhbnkgcmVtYWluaW5nIG5ldyB2YWx1ZXNcbiAgICB3aGlsZSAobmV3SGVhZCA8PSBuZXdUYWlsKSB7XG4gICAgICAvLyBGb3IgYWxsIHJlbWFpbmluZyBhZGRpdGlvbnMsIHdlIGluc2VydCBiZWZvcmUgbGFzdCBuZXdcbiAgICAgIC8vIHRhaWwsIHNpbmNlIG9sZCBwb2ludGVycyBhcmUgbm8gbG9uZ2VyIHZhbGlkXG4gICAgICBjb25zdCBuZXdQYXJ0ID0gaW5zZXJ0UGFydChjb250YWluZXJQYXJ0LCBuZXdQYXJ0c1tuZXdUYWlsICsgMV0pO1xuICAgICAgc2V0Q2hpbGRQYXJ0VmFsdWUobmV3UGFydCwgbmV3VmFsdWVzW25ld0hlYWRdKTtcbiAgICAgIG5ld1BhcnRzW25ld0hlYWQrK10gPSBuZXdQYXJ0O1xuICAgIH1cbiAgICAvLyBSZW1vdmUgYW55IHJlbWFpbmluZyB1bnVzZWQgb2xkIHBhcnRzXG4gICAgd2hpbGUgKG9sZEhlYWQgPD0gb2xkVGFpbCkge1xuICAgICAgY29uc3Qgb2xkUGFydCA9IG9sZFBhcnRzW29sZEhlYWQrK107XG4gICAgICBpZiAob2xkUGFydCAhPT0gbnVsbCkge1xuICAgICAgICByZW1vdmVQYXJ0KG9sZFBhcnQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNhdmUgb3JkZXIgb2YgbmV3IHBhcnRzIGZvciBuZXh0IHJvdW5kXG4gICAgdGhpcy5faXRlbUtleXMgPSBuZXdLZXlzO1xuICAgIC8vIERpcmVjdGx5IHNldCBwYXJ0IHZhbHVlLCBieXBhc3NpbmcgaXQncyBkaXJ0eS1jaGVja2luZ1xuICAgIHNldENvbW1pdHRlZFZhbHVlKGNvbnRhaW5lclBhcnQsIG5ld1BhcnRzKTtcbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZXBlYXREaXJlY3RpdmVGbiB7XG4gIDxUPihcbiAgICBpdGVtczogSXRlcmFibGU8VD4sXG4gICAga2V5Rm5PclRlbXBsYXRlOiBLZXlGbjxUPiB8IEl0ZW1UZW1wbGF0ZTxUPixcbiAgICB0ZW1wbGF0ZT86IEl0ZW1UZW1wbGF0ZTxUPlxuICApOiB1bmtub3duO1xuICA8VD4oaXRlbXM6IEl0ZXJhYmxlPFQ+LCB0ZW1wbGF0ZTogSXRlbVRlbXBsYXRlPFQ+KTogdW5rbm93bjtcbiAgPFQ+KFxuICAgIGl0ZW1zOiBJdGVyYWJsZTxUPixcbiAgICBrZXlGbjogS2V5Rm48VD4gfCBJdGVtVGVtcGxhdGU8VD4sXG4gICAgdGVtcGxhdGU6IEl0ZW1UZW1wbGF0ZTxUPlxuICApOiB1bmtub3duO1xufVxuXG4vKipcbiAqIEEgZGlyZWN0aXZlIHRoYXQgcmVwZWF0cyBhIHNlcmllcyBvZiB2YWx1ZXMgKHVzdWFsbHkgYFRlbXBsYXRlUmVzdWx0c2ApXG4gKiBnZW5lcmF0ZWQgZnJvbSBhbiBpdGVyYWJsZSwgYW5kIHVwZGF0ZXMgdGhvc2UgaXRlbXMgZWZmaWNpZW50bHkgd2hlbiB0aGVcbiAqIGl0ZXJhYmxlIGNoYW5nZXMgYmFzZWQgb24gdXNlci1wcm92aWRlZCBga2V5c2AgYXNzb2NpYXRlZCB3aXRoIGVhY2ggaXRlbS5cbiAqXG4gKiBOb3RlIHRoYXQgaWYgYSBga2V5Rm5gIGlzIHByb3ZpZGVkLCBzdHJpY3Qga2V5LXRvLURPTSBtYXBwaW5nIGlzIG1haW50YWluZWQsXG4gKiBtZWFuaW5nIHByZXZpb3VzIERPTSBmb3IgYSBnaXZlbiBrZXkgaXMgbW92ZWQgaW50byB0aGUgbmV3IHBvc2l0aW9uIGlmXG4gKiBuZWVkZWQsIGFuZCBET00gd2lsbCBuZXZlciBiZSByZXVzZWQgd2l0aCB2YWx1ZXMgZm9yIGRpZmZlcmVudCBrZXlzIChuZXcgRE9NXG4gKiB3aWxsIGFsd2F5cyBiZSBjcmVhdGVkIGZvciBuZXcga2V5cykuIFRoaXMgaXMgZ2VuZXJhbGx5IHRoZSBtb3N0IGVmZmljaWVudFxuICogd2F5IHRvIHVzZSBgcmVwZWF0YCBzaW5jZSBpdCBwZXJmb3JtcyBtaW5pbXVtIHVubmVjZXNzYXJ5IHdvcmsgZm9yIGluc2VydGlvbnNcbiAqIGFuZCByZW1vdmFscy5cbiAqXG4gKiBUaGUgYGtleUZuYCB0YWtlcyB0d28gcGFyYW1ldGVycywgdGhlIGl0ZW0gYW5kIGl0cyBpbmRleCwgYW5kIHJldHVybnMgYSB1bmlxdWUga2V5IHZhbHVlLlxuICpcbiAqIGBgYGpzXG4gKiBodG1sYFxuICogICA8b2w+XG4gKiAgICAgJHtyZXBlYXQodGhpcy5pdGVtcywgKGl0ZW0pID0+IGl0ZW0uaWQsIChpdGVtLCBpbmRleCkgPT4ge1xuICogICAgICAgcmV0dXJuIGh0bWxgPGxpPiR7aW5kZXh9OiAke2l0ZW0ubmFtZX08L2xpPmA7XG4gKiAgICAgfSl9XG4gKiAgIDwvb2w+XG4gKiBgXG4gKiBgYGBcbiAqXG4gKiAqKkltcG9ydGFudCoqOiBJZiBwcm92aWRpbmcgYSBga2V5Rm5gLCBrZXlzICptdXN0KiBiZSB1bmlxdWUgZm9yIGFsbCBpdGVtcyBpbiBhXG4gKiBnaXZlbiBjYWxsIHRvIGByZXBlYXRgLiBUaGUgYmVoYXZpb3Igd2hlbiB0d28gb3IgbW9yZSBpdGVtcyBoYXZlIHRoZSBzYW1lIGtleVxuICogaXMgdW5kZWZpbmVkLlxuICpcbiAqIElmIG5vIGBrZXlGbmAgaXMgcHJvdmlkZWQsIHRoaXMgZGlyZWN0aXZlIHdpbGwgcGVyZm9ybSBzaW1pbGFyIHRvIG1hcHBpbmdcbiAqIGl0ZW1zIHRvIHZhbHVlcywgYW5kIERPTSB3aWxsIGJlIHJldXNlZCBhZ2FpbnN0IHBvdGVudGlhbGx5IGRpZmZlcmVudCBpdGVtcy5cbiAqL1xuZXhwb3J0IGNvbnN0IHJlcGVhdCA9IGRpcmVjdGl2ZShSZXBlYXREaXJlY3RpdmUpIGFzIFJlcGVhdERpcmVjdGl2ZUZuO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge1JlcGVhdERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtBdHRyaWJ1dGVQYXJ0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmUsXG4gIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG4gIFBhcnRJbmZvLFxuICBQYXJ0VHlwZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcblxuLyoqXG4gKiBBIGtleS12YWx1ZSBzZXQgb2YgQ1NTIHByb3BlcnRpZXMgYW5kIHZhbHVlcy5cbiAqXG4gKiBUaGUga2V5IHNob3VsZCBiZSBlaXRoZXIgYSB2YWxpZCBDU1MgcHJvcGVydHkgbmFtZSBzdHJpbmcsIGxpa2VcbiAqIGAnYmFja2dyb3VuZC1jb2xvcidgLCBvciBhIHZhbGlkIEphdmFTY3JpcHQgY2FtZWwgY2FzZSBwcm9wZXJ0eSBuYW1lXG4gKiBmb3IgQ1NTU3R5bGVEZWNsYXJhdGlvbiBsaWtlIGBiYWNrZ3JvdW5kQ29sb3JgLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFN0eWxlSW5mbyB7XG4gIFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfCBudW1iZXIgfCB1bmRlZmluZWQgfCBudWxsO1xufVxuXG5jb25zdCBpbXBvcnRhbnQgPSAnaW1wb3J0YW50Jztcbi8vIFRoZSBsZWFkaW5nIHNwYWNlIGlzIGltcG9ydGFudFxuY29uc3QgaW1wb3J0YW50RmxhZyA9ICcgIScgKyBpbXBvcnRhbnQ7XG4vLyBIb3cgbWFueSBjaGFyYWN0ZXJzIHRvIHJlbW92ZSBmcm9tIGEgdmFsdWUsIGFzIGEgbmVnYXRpdmUgbnVtYmVyXG5jb25zdCBmbGFnVHJpbSA9IDAgLSBpbXBvcnRhbnRGbGFnLmxlbmd0aDtcblxuY2xhc3MgU3R5bGVNYXBEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBwcml2YXRlIF9wcmV2aW91c1N0eWxlUHJvcGVydGllcz86IFNldDxzdHJpbmc+O1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAoXG4gICAgICBwYXJ0SW5mby50eXBlICE9PSBQYXJ0VHlwZS5BVFRSSUJVVEUgfHxcbiAgICAgIHBhcnRJbmZvLm5hbWUgIT09ICdzdHlsZScgfHxcbiAgICAgIChwYXJ0SW5mby5zdHJpbmdzPy5sZW5ndGggYXMgbnVtYmVyKSA+IDJcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1RoZSBgc3R5bGVNYXBgIGRpcmVjdGl2ZSBtdXN0IGJlIHVzZWQgaW4gdGhlIGBzdHlsZWAgYXR0cmlidXRlICcgK1xuICAgICAgICAgICdhbmQgbXVzdCBiZSB0aGUgb25seSBwYXJ0IGluIHRoZSBhdHRyaWJ1dGUuJ1xuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXIoc3R5bGVJbmZvOiBSZWFkb25seTxTdHlsZUluZm8+KSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHN0eWxlSW5mbykucmVkdWNlKChzdHlsZSwgcHJvcCkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBzdHlsZUluZm9bcHJvcF07XG4gICAgICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gc3R5bGU7XG4gICAgICB9XG4gICAgICAvLyBDb252ZXJ0IHByb3BlcnR5IG5hbWVzIGZyb20gY2FtZWwtY2FzZSB0byBkYXNoLWNhc2UsIGkuZS46XG4gICAgICAvLyAgYGJhY2tncm91bmRDb2xvcmAgLT4gYGJhY2tncm91bmQtY29sb3JgXG4gICAgICAvLyBWZW5kb3ItcHJlZml4ZWQgbmFtZXMgbmVlZCBhbiBleHRyYSBgLWAgYXBwZW5kZWQgdG8gZnJvbnQ6XG4gICAgICAvLyAgYHdlYmtpdEFwcGVhcmFuY2VgIC0+IGAtd2Via2l0LWFwcGVhcmFuY2VgXG4gICAgICAvLyBFeGNlcHRpb24gaXMgYW55IHByb3BlcnR5IG5hbWUgY29udGFpbmluZyBhIGRhc2gsIGluY2x1ZGluZ1xuICAgICAgLy8gY3VzdG9tIHByb3BlcnRpZXM7IHdlIGFzc3VtZSB0aGVzZSBhcmUgYWxyZWFkeSBkYXNoLWNhc2VkIGkuZS46XG4gICAgICAvLyAgYC0tbXktYnV0dG9uLWNvbG9yYCAtLT4gYC0tbXktYnV0dG9uLWNvbG9yYFxuICAgICAgcHJvcCA9IHByb3AuaW5jbHVkZXMoJy0nKVxuICAgICAgICA/IHByb3BcbiAgICAgICAgOiBwcm9wXG4gICAgICAgICAgICAucmVwbGFjZSgvKD86Xih3ZWJraXR8bW96fG1zfG8pfCkoPz1bQS1aXSkvZywgJy0kJicpXG4gICAgICAgICAgICAudG9Mb3dlckNhc2UoKTtcbiAgICAgIHJldHVybiBzdHlsZSArIGAke3Byb3B9OiR7dmFsdWV9O2A7XG4gICAgfSwgJycpO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IEF0dHJpYnV0ZVBhcnQsIFtzdHlsZUluZm9dOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgY29uc3Qge3N0eWxlfSA9IHBhcnQuZWxlbWVudCBhcyBIVE1MRWxlbWVudDtcblxuICAgIGlmICh0aGlzLl9wcmV2aW91c1N0eWxlUHJvcGVydGllcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9wcmV2aW91c1N0eWxlUHJvcGVydGllcyA9IG5ldyBTZXQoT2JqZWN0LmtleXMoc3R5bGVJbmZvKSk7XG4gICAgICByZXR1cm4gdGhpcy5yZW5kZXIoc3R5bGVJbmZvKTtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgb2xkIHByb3BlcnRpZXMgdGhhdCBubyBsb25nZXIgZXhpc3QgaW4gc3R5bGVJbmZvXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzKSB7XG4gICAgICAvLyBJZiB0aGUgbmFtZSBpc24ndCBpbiBzdHlsZUluZm8gb3IgaXQncyBudWxsL3VuZGVmaW5lZFxuICAgICAgaWYgKHN0eWxlSW5mb1tuYW1lXSA9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzIS5kZWxldGUobmFtZSk7XG4gICAgICAgIGlmIChuYW1lLmluY2x1ZGVzKCctJykpIHtcbiAgICAgICAgICBzdHlsZS5yZW1vdmVQcm9wZXJ0eShuYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICAgIChzdHlsZSBhcyBhbnkpW25hbWVdID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFkZCBvciB1cGRhdGUgcHJvcGVydGllc1xuICAgIGZvciAoY29uc3QgbmFtZSBpbiBzdHlsZUluZm8pIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gc3R5bGVJbmZvW25hbWVdO1xuICAgICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5fcHJldmlvdXNTdHlsZVByb3BlcnRpZXMuYWRkKG5hbWUpO1xuICAgICAgICBjb25zdCBpc0ltcG9ydGFudCA9XG4gICAgICAgICAgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJiB2YWx1ZS5lbmRzV2l0aChpbXBvcnRhbnRGbGFnKTtcbiAgICAgICAgaWYgKG5hbWUuaW5jbHVkZXMoJy0nKSB8fCBpc0ltcG9ydGFudCkge1xuICAgICAgICAgIHN0eWxlLnNldFByb3BlcnR5KFxuICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgIGlzSW1wb3J0YW50XG4gICAgICAgICAgICAgID8gKHZhbHVlIGFzIHN0cmluZykuc2xpY2UoMCwgZmxhZ1RyaW0pXG4gICAgICAgICAgICAgIDogKHZhbHVlIGFzIHN0cmluZyksXG4gICAgICAgICAgICBpc0ltcG9ydGFudCA/IGltcG9ydGFudCA6ICcnXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICAgIChzdHlsZSBhcyBhbnkpW25hbWVdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG59XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCBhcHBsaWVzIENTUyBwcm9wZXJ0aWVzIHRvIGFuIGVsZW1lbnQuXG4gKlxuICogYHN0eWxlTWFwYCBjYW4gb25seSBiZSB1c2VkIGluIHRoZSBgc3R5bGVgIGF0dHJpYnV0ZSBhbmQgbXVzdCBiZSB0aGUgb25seVxuICogZXhwcmVzc2lvbiBpbiB0aGUgYXR0cmlidXRlLiBJdCB0YWtlcyB0aGUgcHJvcGVydHkgbmFtZXMgaW4gdGhlXG4gKiB7QGxpbmsgU3R5bGVJbmZvIHN0eWxlSW5mb30gb2JqZWN0IGFuZCBhZGRzIHRoZSBwcm9wZXJ0aWVzIHRvIHRoZSBpbmxpbmVcbiAqIHN0eWxlIG9mIHRoZSBlbGVtZW50LlxuICpcbiAqIFByb3BlcnR5IG5hbWVzIHdpdGggZGFzaGVzIChgLWApIGFyZSBhc3N1bWVkIHRvIGJlIHZhbGlkIENTU1xuICogcHJvcGVydHkgbmFtZXMgYW5kIHNldCBvbiB0aGUgZWxlbWVudCdzIHN0eWxlIG9iamVjdCB1c2luZyBgc2V0UHJvcGVydHkoKWAuXG4gKiBOYW1lcyB3aXRob3V0IGRhc2hlcyBhcmUgYXNzdW1lZCB0byBiZSBjYW1lbENhc2VkIEphdmFTY3JpcHQgcHJvcGVydHkgbmFtZXNcbiAqIGFuZCBzZXQgb24gdGhlIGVsZW1lbnQncyBzdHlsZSBvYmplY3QgdXNpbmcgcHJvcGVydHkgYXNzaWdubWVudCwgYWxsb3dpbmcgdGhlXG4gKiBzdHlsZSBvYmplY3QgdG8gdHJhbnNsYXRlIEphdmFTY3JpcHQtc3R5bGUgbmFtZXMgdG8gQ1NTIHByb3BlcnR5IG5hbWVzLlxuICpcbiAqIEZvciBleGFtcGxlIGBzdHlsZU1hcCh7YmFja2dyb3VuZENvbG9yOiAncmVkJywgJ2JvcmRlci10b3AnOiAnNXB4JywgJy0tc2l6ZSc6XG4gKiAnMCd9KWAgc2V0cyB0aGUgYGJhY2tncm91bmQtY29sb3JgLCBgYm9yZGVyLXRvcGAgYW5kIGAtLXNpemVgIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHN0eWxlSW5mb1xuICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9saXQuZGV2L2RvY3MvdGVtcGxhdGVzL2RpcmVjdGl2ZXMvI3N0eWxlbWFwIHN0eWxlTWFwIGNvZGUgc2FtcGxlcyBvbiBMaXQuZGV2fVxuICovXG5leHBvcnQgY29uc3Qgc3R5bGVNYXAgPSBkaXJlY3RpdmUoU3R5bGVNYXBEaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge1N0eWxlTWFwRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge25vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgRGlyZWN0aXZlLCBQYXJ0SW5mbywgUGFydFR5cGV9IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5cbmNsYXNzIFRlbXBsYXRlQ29udGVudERpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX3ByZXZpb3VzVGVtcGxhdGU/OiBIVE1MVGVtcGxhdGVFbGVtZW50O1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAocGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQ0hJTEQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigndGVtcGxhdGVDb250ZW50IGNhbiBvbmx5IGJlIHVzZWQgaW4gY2hpbGQgYmluZGluZ3MnKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXIodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQpIHtcbiAgICBpZiAodGhpcy5fcHJldmlvdXNUZW1wbGF0ZSA9PT0gdGVtcGxhdGUpIHtcbiAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICB9XG4gICAgdGhpcy5fcHJldmlvdXNUZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICAgIHJldHVybiBkb2N1bWVudC5pbXBvcnROb2RlKHRlbXBsYXRlLmNvbnRlbnQsIHRydWUpO1xuICB9XG59XG5cbi8qKlxuICogUmVuZGVycyB0aGUgY29udGVudCBvZiBhIHRlbXBsYXRlIGVsZW1lbnQgYXMgSFRNTC5cbiAqXG4gKiBOb3RlLCB0aGUgdGVtcGxhdGUgc2hvdWxkIGJlIGRldmVsb3BlciBjb250cm9sbGVkIGFuZCBub3QgdXNlciBjb250cm9sbGVkLlxuICogUmVuZGVyaW5nIGEgdXNlci1jb250cm9sbGVkIHRlbXBsYXRlIHdpdGggdGhpcyBkaXJlY3RpdmVcbiAqIGNvdWxkIGxlYWQgdG8gY3Jvc3Mtc2l0ZS1zY3JpcHRpbmcgdnVsbmVyYWJpbGl0aWVzLlxuICovXG5leHBvcnQgY29uc3QgdGVtcGxhdGVDb250ZW50ID0gZGlyZWN0aXZlKFRlbXBsYXRlQ29udGVudERpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7VGVtcGxhdGVDb250ZW50RGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge25vdGhpbmcsIFRlbXBsYXRlUmVzdWx0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIERpcmVjdGl2ZSwgUGFydEluZm8sIFBhcnRUeXBlfSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuXG5jb25zdCBIVE1MX1JFU1VMVCA9IDE7XG5cbmV4cG9ydCBjbGFzcyBVbnNhZmVIVE1MRGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgc3RhdGljIGRpcmVjdGl2ZU5hbWUgPSAndW5zYWZlSFRNTCc7XG4gIHN0YXRpYyByZXN1bHRUeXBlID0gSFRNTF9SRVNVTFQ7XG5cbiAgcHJpdmF0ZSBfdmFsdWU6IHVua25vd24gPSBub3RoaW5nO1xuICBwcml2YXRlIF90ZW1wbGF0ZVJlc3VsdD86IFRlbXBsYXRlUmVzdWx0O1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAocGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQ0hJTEQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYCR7XG4gICAgICAgICAgKHRoaXMuY29uc3RydWN0b3IgYXMgdHlwZW9mIFVuc2FmZUhUTUxEaXJlY3RpdmUpLmRpcmVjdGl2ZU5hbWVcbiAgICAgICAgfSgpIGNhbiBvbmx5IGJlIHVzZWQgaW4gY2hpbGQgYmluZGluZ3NgXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlcih2YWx1ZTogc3RyaW5nIHwgdHlwZW9mIG5vdGhpbmcgfCB0eXBlb2Ygbm9DaGFuZ2UgfCB1bmRlZmluZWQgfCBudWxsKSB7XG4gICAgaWYgKHZhbHVlID09PSBub3RoaW5nIHx8IHZhbHVlID09IG51bGwpIHtcbiAgICAgIHRoaXMuX3RlbXBsYXRlUmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgICAgcmV0dXJuICh0aGlzLl92YWx1ZSA9IHZhbHVlKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlID09PSBub0NoYW5nZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHZhbHVlICE9ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGAke1xuICAgICAgICAgICh0aGlzLmNvbnN0cnVjdG9yIGFzIHR5cGVvZiBVbnNhZmVIVE1MRGlyZWN0aXZlKS5kaXJlY3RpdmVOYW1lXG4gICAgICAgIH0oKSBjYWxsZWQgd2l0aCBhIG5vbi1zdHJpbmcgdmFsdWVgXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAodmFsdWUgPT09IHRoaXMuX3ZhbHVlKSB7XG4gICAgICByZXR1cm4gdGhpcy5fdGVtcGxhdGVSZXN1bHQ7XG4gICAgfVxuICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gICAgY29uc3Qgc3RyaW5ncyA9IFt2YWx1ZV0gYXMgdW5rbm93biBhcyBUZW1wbGF0ZVN0cmluZ3NBcnJheTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIChzdHJpbmdzIGFzIGFueSkucmF3ID0gc3RyaW5ncztcbiAgICAvLyBXQVJOSU5HOiBpbXBlcnNvbmF0aW5nIGEgVGVtcGxhdGVSZXN1bHQgbGlrZSB0aGlzIGlzIGV4dHJlbWVseVxuICAgIC8vIGRhbmdlcm91cy4gVGhpcmQtcGFydHkgZGlyZWN0aXZlcyBzaG91bGQgbm90IGRvIHRoaXMuXG4gICAgcmV0dXJuICh0aGlzLl90ZW1wbGF0ZVJlc3VsdCA9IHtcbiAgICAgIC8vIENhc3QgdG8gYSBrbm93biBzZXQgb2YgaW50ZWdlcnMgdGhhdCBzYXRpc2Z5IFJlc3VsdFR5cGUgc28gdGhhdCB3ZVxuICAgICAgLy8gZG9uJ3QgaGF2ZSB0byBleHBvcnQgUmVzdWx0VHlwZSBhbmQgcG9zc2libHkgZW5jb3VyYWdlIHRoaXMgcGF0dGVybi5cbiAgICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgICBbJ18kbGl0VHlwZSQnXTogKHRoaXMuY29uc3RydWN0b3IgYXMgdHlwZW9mIFVuc2FmZUhUTUxEaXJlY3RpdmUpXG4gICAgICAgIC5yZXN1bHRUeXBlIGFzIDEgfCAyLFxuICAgICAgc3RyaW5ncyxcbiAgICAgIHZhbHVlczogW10sXG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW5kZXJzIHRoZSByZXN1bHQgYXMgSFRNTCwgcmF0aGVyIHRoYW4gdGV4dC5cbiAqXG4gKiBUaGUgdmFsdWVzIGB1bmRlZmluZWRgLCBgbnVsbGAsIGFuZCBgbm90aGluZ2AsIHdpbGwgYWxsIHJlc3VsdCBpbiBubyBjb250ZW50XG4gKiAoZW1wdHkgc3RyaW5nKSBiZWluZyByZW5kZXJlZC5cbiAqXG4gKiBOb3RlLCB0aGlzIGlzIHVuc2FmZSB0byB1c2Ugd2l0aCBhbnkgdXNlci1wcm92aWRlZCBpbnB1dCB0aGF0IGhhc24ndCBiZWVuXG4gKiBzYW5pdGl6ZWQgb3IgZXNjYXBlZCwgYXMgaXQgbWF5IGxlYWQgdG8gY3Jvc3Mtc2l0ZS1zY3JpcHRpbmdcbiAqIHZ1bG5lcmFiaWxpdGllcy5cbiAqL1xuZXhwb3J0IGNvbnN0IHVuc2FmZUhUTUwgPSBkaXJlY3RpdmUoVW5zYWZlSFRNTERpcmVjdGl2ZSk7XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtkaXJlY3RpdmV9IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge1Vuc2FmZUhUTUxEaXJlY3RpdmV9IGZyb20gJy4vdW5zYWZlLWh0bWwuanMnO1xuXG5jb25zdCBTVkdfUkVTVUxUID0gMjtcblxuY2xhc3MgVW5zYWZlU1ZHRGlyZWN0aXZlIGV4dGVuZHMgVW5zYWZlSFRNTERpcmVjdGl2ZSB7XG4gIHN0YXRpYyBvdmVycmlkZSBkaXJlY3RpdmVOYW1lID0gJ3Vuc2FmZVNWRyc7XG4gIHN0YXRpYyBvdmVycmlkZSByZXN1bHRUeXBlID0gU1ZHX1JFU1VMVDtcbn1cblxuLyoqXG4gKiBSZW5kZXJzIHRoZSByZXN1bHQgYXMgU1ZHLCByYXRoZXIgdGhhbiB0ZXh0LlxuICpcbiAqIFRoZSB2YWx1ZXMgYHVuZGVmaW5lZGAsIGBudWxsYCwgYW5kIGBub3RoaW5nYCwgd2lsbCBhbGwgcmVzdWx0IGluIG5vIGNvbnRlbnRcbiAqIChlbXB0eSBzdHJpbmcpIGJlaW5nIHJlbmRlcmVkLlxuICpcbiAqIE5vdGUsIHRoaXMgaXMgdW5zYWZlIHRvIHVzZSB3aXRoIGFueSB1c2VyLXByb3ZpZGVkIGlucHV0IHRoYXQgaGFzbid0IGJlZW5cbiAqIHNhbml0aXplZCBvciBlc2NhcGVkLCBhcyBpdCBtYXkgbGVhZCB0byBjcm9zcy1zaXRlLXNjcmlwdGluZ1xuICogdnVsbmVyYWJpbGl0aWVzLlxuICovXG5leHBvcnQgY29uc3QgdW5zYWZlU1ZHID0gZGlyZWN0aXZlKFVuc2FmZVNWR0RpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7VW5zYWZlU1ZHRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge1BhcnQsIG5vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2lzUHJpbWl0aXZlfSBmcm9tICcuLi9kaXJlY3RpdmUtaGVscGVycy5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgQXN5bmNEaXJlY3RpdmV9IGZyb20gJy4uL2FzeW5jLWRpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge1BhdXNlciwgUHNldWRvV2Vha1JlZn0gZnJvbSAnLi9wcml2YXRlLWFzeW5jLWhlbHBlcnMuanMnO1xuXG5jb25zdCBpc1Byb21pc2UgPSAoeDogdW5rbm93bikgPT4ge1xuICByZXR1cm4gIWlzUHJpbWl0aXZlKHgpICYmIHR5cGVvZiAoeCBhcyB7dGhlbj86IHVua25vd259KS50aGVuID09PSAnZnVuY3Rpb24nO1xufTtcbi8vIEVmZmVjdGl2ZWx5IGluZmluaXR5LCBidXQgYSBTTUkuXG5jb25zdCBfaW5maW5pdHkgPSAweDNmZmZmZmZmO1xuXG5leHBvcnQgY2xhc3MgVW50aWxEaXJlY3RpdmUgZXh0ZW5kcyBBc3luY0RpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX19sYXN0UmVuZGVyZWRJbmRleDogbnVtYmVyID0gX2luZmluaXR5O1xuICBwcml2YXRlIF9fdmFsdWVzOiB1bmtub3duW10gPSBbXTtcbiAgcHJpdmF0ZSBfX3dlYWtUaGlzID0gbmV3IFBzZXVkb1dlYWtSZWYodGhpcyk7XG4gIHByaXZhdGUgX19wYXVzZXIgPSBuZXcgUGF1c2VyKCk7XG5cbiAgcmVuZGVyKC4uLmFyZ3M6IEFycmF5PHVua25vd24+KTogdW5rbm93biB7XG4gICAgcmV0dXJuIGFyZ3MuZmluZCgoeCkgPT4gIWlzUHJvbWlzZSh4KSkgPz8gbm9DaGFuZ2U7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUoX3BhcnQ6IFBhcnQsIGFyZ3M6IEFycmF5PHVua25vd24+KSB7XG4gICAgY29uc3QgcHJldmlvdXNWYWx1ZXMgPSB0aGlzLl9fdmFsdWVzO1xuICAgIGxldCBwcmV2aW91c0xlbmd0aCA9IHByZXZpb3VzVmFsdWVzLmxlbmd0aDtcbiAgICB0aGlzLl9fdmFsdWVzID0gYXJncztcblxuICAgIGNvbnN0IHdlYWtUaGlzID0gdGhpcy5fX3dlYWtUaGlzO1xuICAgIGNvbnN0IHBhdXNlciA9IHRoaXMuX19wYXVzZXI7XG5cbiAgICAvLyBJZiBvdXIgaW5pdGlhbCByZW5kZXIgb2NjdXJzIHdoaWxlIGRpc2Nvbm5lY3RlZCwgZW5zdXJlIHRoYXQgdGhlIHBhdXNlclxuICAgIC8vIGFuZCB3ZWFrVGhpcyBhcmUgaW4gdGhlIGRpc2Nvbm5lY3RlZCBzdGF0ZVxuICAgIGlmICghdGhpcy5pc0Nvbm5lY3RlZCkge1xuICAgICAgdGhpcy5kaXNjb25uZWN0ZWQoKTtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIC8vIElmIHdlJ3ZlIHJlbmRlcmVkIGEgaGlnaGVyLXByaW9yaXR5IHZhbHVlIGFscmVhZHksIHN0b3AuXG4gICAgICBpZiAoaSA+IHRoaXMuX19sYXN0UmVuZGVyZWRJbmRleCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgY29uc3QgdmFsdWUgPSBhcmdzW2ldO1xuXG4gICAgICAvLyBSZW5kZXIgbm9uLVByb21pc2UgdmFsdWVzIGltbWVkaWF0ZWx5XG4gICAgICBpZiAoIWlzUHJvbWlzZSh2YWx1ZSkpIHtcbiAgICAgICAgdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4ID0gaTtcbiAgICAgICAgLy8gU2luY2UgYSBsb3dlci1wcmlvcml0eSB2YWx1ZSB3aWxsIG5ldmVyIG92ZXJ3cml0ZSBhIGhpZ2hlci1wcmlvcml0eVxuICAgICAgICAvLyBzeW5jaHJvbm91cyB2YWx1ZSwgd2UgY2FuIHN0b3AgcHJvY2Vzc2luZyBub3cuXG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhpcyBpcyBhIFByb21pc2Ugd2UndmUgYWxyZWFkeSBoYW5kbGVkLCBza2lwIGl0LlxuICAgICAgaWYgKGkgPCBwcmV2aW91c0xlbmd0aCAmJiB2YWx1ZSA9PT0gcHJldmlvdXNWYWx1ZXNbaV0pIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIFdlIGhhdmUgYSBQcm9taXNlIHRoYXQgd2UgaGF2ZW4ndCBzZWVuIGJlZm9yZSwgc28gcHJpb3JpdGllcyBtYXkgaGF2ZVxuICAgICAgLy8gY2hhbmdlZC4gRm9yZ2V0IHdoYXQgd2UgcmVuZGVyZWQgYmVmb3JlLlxuICAgICAgdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4ID0gX2luZmluaXR5O1xuICAgICAgcHJldmlvdXNMZW5ndGggPSAwO1xuXG4gICAgICAvLyBOb3RlLCB0aGUgY2FsbGJhY2sgYXZvaWRzIGNsb3Npbmcgb3ZlciBgdGhpc2Agc28gdGhhdCB0aGUgZGlyZWN0aXZlXG4gICAgICAvLyBjYW4gYmUgZ2MnZWQgYmVmb3JlIHRoZSBwcm9taXNlIHJlc29sdmVzOyBpbnN0ZWFkIGB0aGlzYCBpcyByZXRyaWV2ZWRcbiAgICAgIC8vIGZyb20gYHdlYWtUaGlzYCwgd2hpY2ggY2FuIGJyZWFrIHRoZSBoYXJkIHJlZmVyZW5jZSBpbiB0aGUgY2xvc3VyZSB3aGVuXG4gICAgICAvLyB0aGUgZGlyZWN0aXZlIGRpc2Nvbm5lY3RzXG4gICAgICBQcm9taXNlLnJlc29sdmUodmFsdWUpLnRoZW4oYXN5bmMgKHJlc3VsdDogdW5rbm93bikgPT4ge1xuICAgICAgICAvLyBJZiB3ZSdyZSBkaXNjb25uZWN0ZWQsIHdhaXQgdW50aWwgd2UncmUgKG1heWJlKSByZWNvbm5lY3RlZFxuICAgICAgICAvLyBUaGUgd2hpbGUgbG9vcCBoZXJlIGhhbmRsZXMgdGhlIGNhc2UgdGhhdCB0aGUgY29ubmVjdGlvbiBzdGF0ZVxuICAgICAgICAvLyB0aHJhc2hlcywgY2F1c2luZyB0aGUgcGF1c2VyIHRvIHJlc3VtZSBhbmQgdGhlbiBnZXQgcmUtcGF1c2VkXG4gICAgICAgIHdoaWxlIChwYXVzZXIuZ2V0KCkpIHtcbiAgICAgICAgICBhd2FpdCBwYXVzZXIuZ2V0KCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgdGhlIGNhbGxiYWNrIGdldHMgaGVyZSBhbmQgdGhlcmUgaXMgbm8gYHRoaXNgLCBpdCBtZWFucyB0aGF0IHRoZVxuICAgICAgICAvLyBkaXJlY3RpdmUgaGFzIGJlZW4gZGlzY29ubmVjdGVkIGFuZCBnYXJiYWdlIGNvbGxlY3RlZCBhbmQgd2UgZG9uJ3RcbiAgICAgICAgLy8gbmVlZCB0byBkbyBhbnl0aGluZyBlbHNlXG4gICAgICAgIGNvbnN0IF90aGlzID0gd2Vha1RoaXMuZGVyZWYoKTtcbiAgICAgICAgaWYgKF90aGlzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb25zdCBpbmRleCA9IF90aGlzLl9fdmFsdWVzLmluZGV4T2YodmFsdWUpO1xuICAgICAgICAgIC8vIElmIHN0YXRlLnZhbHVlcyBkb2Vzbid0IGNvbnRhaW4gdGhlIHZhbHVlLCB3ZSd2ZSByZS1yZW5kZXJlZCB3aXRob3V0XG4gICAgICAgICAgLy8gdGhlIHZhbHVlLCBzbyBkb24ndCByZW5kZXIgaXQuIFRoZW4sIG9ubHkgcmVuZGVyIGlmIHRoZSB2YWx1ZSBpc1xuICAgICAgICAgIC8vIGhpZ2hlci1wcmlvcml0eSB0aGFuIHdoYXQncyBhbHJlYWR5IGJlZW4gcmVuZGVyZWQuXG4gICAgICAgICAgaWYgKGluZGV4ID4gLTEgJiYgaW5kZXggPCBfdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4KSB7XG4gICAgICAgICAgICBfdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgICBfdGhpcy5zZXRWYWx1ZShyZXN1bHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG5cbiAgb3ZlcnJpZGUgZGlzY29ubmVjdGVkKCkge1xuICAgIHRoaXMuX193ZWFrVGhpcy5kaXNjb25uZWN0KCk7XG4gICAgdGhpcy5fX3BhdXNlci5wYXVzZSgpO1xuICB9XG5cbiAgb3ZlcnJpZGUgcmVjb25uZWN0ZWQoKSB7XG4gICAgdGhpcy5fX3dlYWtUaGlzLnJlY29ubmVjdCh0aGlzKTtcbiAgICB0aGlzLl9fcGF1c2VyLnJlc3VtZSgpO1xuICB9XG59XG5cbi8qKlxuICogUmVuZGVycyBvbmUgb2YgYSBzZXJpZXMgb2YgdmFsdWVzLCBpbmNsdWRpbmcgUHJvbWlzZXMsIHRvIGEgUGFydC5cbiAqXG4gKiBWYWx1ZXMgYXJlIHJlbmRlcmVkIGluIHByaW9yaXR5IG9yZGVyLCB3aXRoIHRoZSBmaXJzdCBhcmd1bWVudCBoYXZpbmcgdGhlXG4gKiBoaWdoZXN0IHByaW9yaXR5IGFuZCB0aGUgbGFzdCBhcmd1bWVudCBoYXZpbmcgdGhlIGxvd2VzdCBwcmlvcml0eS4gSWYgYVxuICogdmFsdWUgaXMgYSBQcm9taXNlLCBsb3ctcHJpb3JpdHkgdmFsdWVzIHdpbGwgYmUgcmVuZGVyZWQgdW50aWwgaXQgcmVzb2x2ZXMuXG4gKlxuICogVGhlIHByaW9yaXR5IG9mIHZhbHVlcyBjYW4gYmUgdXNlZCB0byBjcmVhdGUgcGxhY2Vob2xkZXIgY29udGVudCBmb3IgYXN5bmNcbiAqIGRhdGEuIEZvciBleGFtcGxlLCBhIFByb21pc2Ugd2l0aCBwZW5kaW5nIGNvbnRlbnQgY2FuIGJlIHRoZSBmaXJzdCxcbiAqIGhpZ2hlc3QtcHJpb3JpdHksIGFyZ3VtZW50LCBhbmQgYSBub25fcHJvbWlzZSBsb2FkaW5nIGluZGljYXRvciB0ZW1wbGF0ZSBjYW5cbiAqIGJlIHVzZWQgYXMgdGhlIHNlY29uZCwgbG93ZXItcHJpb3JpdHksIGFyZ3VtZW50LiBUaGUgbG9hZGluZyBpbmRpY2F0b3Igd2lsbFxuICogcmVuZGVyIGltbWVkaWF0ZWx5LCBhbmQgdGhlIHByaW1hcnkgY29udGVudCB3aWxsIHJlbmRlciB3aGVuIHRoZSBQcm9taXNlXG4gKiByZXNvbHZlcy5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBjb25zdCBjb250ZW50ID0gZmV0Y2goJy4vY29udGVudC50eHQnKS50aGVuKHIgPT4gci50ZXh0KCkpO1xuICogaHRtbGAke3VudGlsKGNvbnRlbnQsIGh0bWxgPHNwYW4+TG9hZGluZy4uLjwvc3Bhbj5gKX1gXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHVudGlsID0gZGlyZWN0aXZlKFVudGlsRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbi8vIGV4cG9ydCB0eXBlIHtVbnRpbERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxudHlwZSBGYWxzeSA9IG51bGwgfCB1bmRlZmluZWQgfCBmYWxzZSB8IDAgfCAtMCB8IDBuIHwgJyc7XG5cbi8qKlxuICogV2hlbiBgY29uZGl0aW9uYCBpcyB0cnVlLCByZXR1cm5zIHRoZSByZXN1bHQgb2YgY2FsbGluZyBgdHJ1ZUNhc2UoKWAsIGVsc2VcbiAqIHJldHVybnMgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIGBmYWxzZUNhc2UoKWAgaWYgYGZhbHNlQ2FzZWAgaXMgZGVmaW5lZC5cbiAqXG4gKiBUaGlzIGlzIGEgY29udmVuaWVuY2Ugd3JhcHBlciBhcm91bmQgYSB0ZXJuYXJ5IGV4cHJlc3Npb24gdGhhdCBtYWtlcyBpdCBhXG4gKiBsaXR0bGUgbmljZXIgdG8gd3JpdGUgYW4gaW5saW5lIGNvbmRpdGlvbmFsIHdpdGhvdXQgYW4gZWxzZS5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiByZW5kZXIoKSB7XG4gKiAgIHJldHVybiBodG1sYFxuICogICAgICR7d2hlbih0aGlzLnVzZXIsICgpID0+IGh0bWxgVXNlcjogJHt0aGlzLnVzZXIudXNlcm5hbWV9YCwgKCkgPT4gaHRtbGBTaWduIEluLi4uYCl9XG4gKiAgIGA7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdoZW48QyBleHRlbmRzIEZhbHN5LCBULCBGID0gdW5kZWZpbmVkPihcbiAgY29uZGl0aW9uOiBDLFxuICB0cnVlQ2FzZTogKGM6IEMpID0+IFQsXG4gIGZhbHNlQ2FzZT86IChjOiBDKSA9PiBGXG4pOiBGO1xuZXhwb3J0IGZ1bmN0aW9uIHdoZW48QywgVCwgRj4oXG4gIGNvbmRpdGlvbjogQyBleHRlbmRzIEZhbHN5ID8gbmV2ZXIgOiBDLFxuICB0cnVlQ2FzZTogKGM6IEMpID0+IFQsXG4gIGZhbHNlQ2FzZT86IChjOiBDKSA9PiBGXG4pOiBUO1xuZXhwb3J0IGZ1bmN0aW9uIHdoZW48QywgVCwgRiA9IHVuZGVmaW5lZD4oXG4gIGNvbmRpdGlvbjogQyxcbiAgdHJ1ZUNhc2U6IChjOiBFeGNsdWRlPEMsIEZhbHN5PikgPT4gVCxcbiAgZmFsc2VDYXNlPzogKGM6IEV4dHJhY3Q8QywgRmFsc3k+KSA9PiBGXG4pOiBDIGV4dGVuZHMgRmFsc3kgPyBGIDogVDtcbmV4cG9ydCBmdW5jdGlvbiB3aGVuKFxuICBjb25kaXRpb246IHVua25vd24sXG4gIHRydWVDYXNlOiAoYzogdW5rbm93bikgPT4gdW5rbm93bixcbiAgZmFsc2VDYXNlPzogKGM6IHVua25vd24pID0+IHVua25vd25cbik6IHVua25vd24ge1xuICByZXR1cm4gY29uZGl0aW9uID8gdHJ1ZUNhc2UoY29uZGl0aW9uKSA6IGZhbHNlQ2FzZT8uKGNvbmRpdGlvbik7XG59XG4iLCJleHBvcnQge1xuICAgIFRlbXBsYXRlUmVzdWx0LFxuICAgIEhUTUxUZW1wbGF0ZVJlc3VsdCxcbiAgICBTVkdUZW1wbGF0ZVJlc3VsdCxcbiAgICBSZW5kZXJPcHRpb25zLFxuICAgIGh0bWwsXG4gICAgc3ZnLFxuICAgIHJlbmRlcixcbiAgICBub0NoYW5nZSxcbiAgICBub3RoaW5nLFxufSBmcm9tICdsaXQtaHRtbCc7XG5cbmV4cG9ydCB7IF8kTEggfSBmcm9tICdsaXQtaHRtbC9wcml2YXRlLXNzci1zdXBwb3J0JztcblxuZXhwb3J0IHtcbiAgICBEaXJlY3RpdmUsXG4gICAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbiAgICBQYXJ0LFxuICAgIFBhcnRJbmZvLFxuICAgIFBhcnRUeXBlLFxuICAgIGRpcmVjdGl2ZSxcbn0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlJztcblxuZXhwb3J0IHsgQXN5bmNEaXJlY3RpdmUgfSBmcm9tICdsaXQtaHRtbC9hc3luYy1kaXJlY3RpdmUnO1xuZXhwb3J0IHsgUmVmLCBjcmVhdGVSZWYgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3JlZic7XG5cbmltcG9ydCB7IGFzeW5jQXBwZW5kIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9hc3luYy1hcHBlbmQnO1xuaW1wb3J0IHsgYXN5bmNSZXBsYWNlIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9hc3luYy1yZXBsYWNlJztcbmltcG9ydCB7IGNhY2hlIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9jYWNoZSc7XG5pbXBvcnQgeyBjaG9vc2UgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2Nob29zZSc7XG5pbXBvcnQgeyBjbGFzc01hcCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvY2xhc3MtbWFwJztcbmltcG9ydCB7IGd1YXJkIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9ndWFyZCc7XG5pbXBvcnQgeyBpZkRlZmluZWQgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2lmLWRlZmluZWQnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvam9pbic7XG5pbXBvcnQgeyBrZXllZCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMva2V5ZWQnO1xuaW1wb3J0IHsgbGl2ZSB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvbGl2ZSc7XG5pbXBvcnQgeyBtYXAgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL21hcCc7XG5pbXBvcnQgeyByYW5nZSB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvcmFuZ2UnO1xuaW1wb3J0IHsgcmVmIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9yZWYnO1xuaW1wb3J0IHsgcmVwZWF0IH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9yZXBlYXQnO1xuaW1wb3J0IHsgc3R5bGVNYXAgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3N0eWxlLW1hcCc7XG5pbXBvcnQgeyB0ZW1wbGF0ZUNvbnRlbnQgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3RlbXBsYXRlLWNvbnRlbnQnO1xuaW1wb3J0IHsgdW5zYWZlSFRNTCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvdW5zYWZlLWh0bWwnO1xuaW1wb3J0IHsgdW5zYWZlU1ZHIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy91bnNhZmUtc3ZnJztcbmltcG9ydCB7IHVudGlsIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy91bnRpbCc7XG5pbXBvcnQgeyB3aGVuIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy93aGVuJztcblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbmRlY2xhcmUgbmFtZXNwYWNlIGRpcmVjdGl2ZXMge1xuICAgIGV4cG9ydCB0eXBlIGFzeW5jQXBwZW5kID0gdHlwZW9mIGFzeW5jQXBwZW5kO1xuICAgIGV4cG9ydCB0eXBlIGFzeW5jUmVwbGFjZSA9IHR5cGVvZiBhc3luY1JlcGxhY2U7XG4gICAgZXhwb3J0IHR5cGUgY2FjaGUgPSB0eXBlb2YgY2FjaGU7XG4gICAgZXhwb3J0IHR5cGUgY2hvb3NlID0gdHlwZW9mIGNob29zZTtcbiAgICBleHBvcnQgdHlwZSBjbGFzc01hcCA9IHR5cGVvZiBjbGFzc01hcDtcbiAgICBleHBvcnQgdHlwZSBndWFyZCA9IHR5cGVvZiBndWFyZDtcbiAgICBleHBvcnQgdHlwZSBpZkRlZmluZWQgPSB0eXBlb2YgaWZEZWZpbmVkO1xuICAgIGV4cG9ydCB0eXBlIGpvaW4gPSB0eXBlb2Ygam9pbjtcbiAgICBleHBvcnQgdHlwZSBrZXllZCA9IHR5cGVvZiBrZXllZDtcbiAgICBleHBvcnQgdHlwZSBsaXZlID0gdHlwZW9mIGxpdmU7XG4gICAgZXhwb3J0IHR5cGUgbWFwID0gdHlwZW9mIG1hcDtcbiAgICBleHBvcnQgdHlwZSByYW5nZSA9IHR5cGVvZiByYW5nZTtcbiAgICBleHBvcnQgdHlwZSByZWYgPSB0eXBlb2YgcmVmO1xuICAgIGV4cG9ydCB0eXBlIHJlcGVhdCA9IHR5cGVvZiByZXBlYXQ7XG4gICAgZXhwb3J0IHR5cGUgc3R5bGVNYXAgPSB0eXBlb2Ygc3R5bGVNYXA7XG4gICAgZXhwb3J0IHR5cGUgdGVtcGxhdGVDb250ZW50ID0gdHlwZW9mIHRlbXBsYXRlQ29udGVudDtcbiAgICBleHBvcnQgdHlwZSB1bnNhZmVIVE1MID0gdHlwZW9mIHVuc2FmZUhUTUw7XG4gICAgZXhwb3J0IHR5cGUgdW5zYWZlU1ZHID0gdHlwZW9mIHVuc2FmZVNWRztcbiAgICBleHBvcnQgdHlwZSB1bnRpbCA9IHR5cGVvZiB1bnRpbDtcbiAgICBleHBvcnQgdHlwZSB3aGVuID0gdHlwZW9mIHdoZW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVEaXJlY3RpdmVzIHtcbiAgICBhc3luY0FwcGVuZDogZGlyZWN0aXZlcy5hc3luY0FwcGVuZDtcbiAgICBhc3luY1JlcGxhY2U6IGRpcmVjdGl2ZXMuYXN5bmNSZXBsYWNlO1xuICAgIGNhY2hlOiBkaXJlY3RpdmVzLmNhY2hlO1xuICAgIGNob29zZTogZGlyZWN0aXZlcy5jaG9vc2U7XG4gICAgY2xhc3NNYXA6IGRpcmVjdGl2ZXMuY2xhc3NNYXA7XG4gICAgZ3VhcmQ6IGRpcmVjdGl2ZXMuZ3VhcmQ7XG4gICAgaWZEZWZpbmVkOiBkaXJlY3RpdmVzLmlmRGVmaW5lZDtcbiAgICBqb2luOiBkaXJlY3RpdmVzLmpvaW47XG4gICAga2V5ZWQ6IGRpcmVjdGl2ZXMua2V5ZWQ7XG4gICAgbGl2ZTogZGlyZWN0aXZlcy5saXZlO1xuICAgIG1hcDogZGlyZWN0aXZlcy5tYXA7XG4gICAgcmFuZ2U6IGRpcmVjdGl2ZXMucmFuZ2U7XG4gICAgcmVmOiBkaXJlY3RpdmVzLnJlZjtcbiAgICByZXBlYXQ6IGRpcmVjdGl2ZXMucmVwZWF0O1xuICAgIHN0eWxlTWFwOiBkaXJlY3RpdmVzLnN0eWxlTWFwO1xuICAgIHRlbXBsYXRlQ29udGVudDogZGlyZWN0aXZlcy50ZW1wbGF0ZUNvbnRlbnQ7XG4gICAgdW5zYWZlSFRNTDogZGlyZWN0aXZlcy51bnNhZmVIVE1MO1xuICAgIHVuc2FmZVNWRzogZGlyZWN0aXZlcy51bnNhZmVTVkc7XG4gICAgdW50aWw6IGRpcmVjdGl2ZXMudW50aWw7XG4gICAgd2hlbjogZGlyZWN0aXZlcy53aGVuO1xufVxuXG5leHBvcnQgY29uc3QgZGlyZWN0aXZlczogVGVtcGxhdGVEaXJlY3RpdmVzID0ge1xuICAgIGFzeW5jQXBwZW5kLFxuICAgIGFzeW5jUmVwbGFjZSxcbiAgICBjYWNoZSxcbiAgICBjaG9vc2UsXG4gICAgY2xhc3NNYXAsXG4gICAgZ3VhcmQsXG4gICAgaWZEZWZpbmVkLFxuICAgIGpvaW4sXG4gICAga2V5ZWQsXG4gICAgbGl2ZSxcbiAgICBtYXAsXG4gICAgcmFuZ2UsXG4gICAgcmVmLFxuICAgIHJlcGVhdCxcbiAgICBzdHlsZU1hcCxcbiAgICB0ZW1wbGF0ZUNvbnRlbnQsXG4gICAgdW5zYWZlSFRNTCxcbiAgICB1bnNhZmVTVkcsXG4gICAgdW50aWwsXG4gICAgd2hlbixcbn07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZnJvbSBgc3RyaW5nYCB0byBgVGVtcGxhdGVTdHJpbmdzQXJyYXlgLiA8YnI+XG4gKiAgICAgVGhpcyBtZXRob2QgaXMgaGVscGVyIGJyaWdkZ2UgZm9yIHRoZSB7QGxpbmsgaHRtbH0gb3IgdGhlIHtAbGluayBzdmd9IGFyZSBhYmxlIHRvIHJlY2VpdmVkIHBsYWluIHN0cmluZy5cbiAqIEBqYSBgc3RyaW5nYCDjgpIgYFRlbXBsYXRlU3RyaW5nc0FycmF5YOOBq+WkieaPmy4gPGJyPlxuICogICAgIHtAbGluayBodG1sfSDjgoQge0BsaW5rIHN2Z30g44GM5paH5a2X5YiX44KS5Y+X44GR5LuY44GR44KL44Gf44KB44Gu44OW44Oq44OD44K444Oh44K944OD44OJXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyB0b1RlbXBsYXRlU3RyaW5nc0FycmF5IGFzIGJyaWRnZSB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogY29uc3QgcmF3ID0gJzxwPkhlbGxvIFJhdyBTdHJpbmc8L3A+JztcbiAqIHJlbmRlcihodG1sKGJyaWRnZShyYXcpKSwgZG9jdW1lbnQuYm9keSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHBsYWluIHN0cmluZyAvIHN0cmluZyBhcnJheS4gZXgpIHtAbGluayBKU1R9IHJldHVybmVkIHZhbHVlLlxuICogIC0gYGphYCDjg5fjg6zjg7zjg7PmloflrZfliJcgLyDmloflrZfliJfphY3liJcuIGV4KSB7QGxpbmsgSlNUfSDjga7miLvjgorlgKTjgarjganjgpLmg7PlrppcbiAqL1xuZXhwb3J0IGNvbnN0IHRvVGVtcGxhdGVTdHJpbmdzQXJyYXkgPSAoc3JjOiBzdHJpbmcgfCBzdHJpbmdbXSB8IFRlbXBsYXRlU3RyaW5nc0FycmF5KTogVGVtcGxhdGVTdHJpbmdzQXJyYXkgPT4ge1xuICAgIGNvbnN0IHN0cmluZ3MgPSBBcnJheS5pc0FycmF5KHNyYykgPyBzcmMgOiBbc3JjXTtcbiAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzdHJpbmdzLCAncmF3JykpIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHN0cmluZ3MsICdyYXcnLCB7IHZhbHVlOiBzdHJpbmdzIH0pO1xuICAgIH1cbiAgICByZXR1cm4gc3RyaW5ncyBhcyB1bmtub3duIGFzIFRlbXBsYXRlU3RyaW5nc0FycmF5O1xufTtcbiJdLCJuYW1lcyI6WyJ3cmFwIiwiY3JlYXRlTWFya2VyIiwiaXNQcmltaXRpdmUiLCJIVE1MX1JFU1VMVCIsIlNWR19SRVNVTFQiLCJDaGlsZFBhcnQiLCJfJExIIiwicCJd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QUNJLFVBQU0sc0JBQXNCLEdBQUcsQ0FBQyxHQUE2QyxLQUEwQjtJQUMxRyxJQUFBLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDO0lBQ2hELElBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUU7SUFDdkQsUUFBQSxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUM7O0lBRTdELElBQUEsT0FBTyxPQUEwQztJQUNyRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwxLDIsMyw0LDUsNiw3LDgsOSwxMCwxMSwxMiwxMywxNCwxNSwxNiwxNywxOCwxOSwyMCwyMSwyMiwyMywyNCwyNV0sInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9leHRlbnNpb24tdGVtcGxhdGUvIn0=