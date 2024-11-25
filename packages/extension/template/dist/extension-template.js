/*!
 * @cdp/extension-template 0.9.18
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
                            // These nodes are also used as the markers for node parts
                            // We can't use empty text nodes as markers because they're
                            // normalized when cloning in IE (could simplify when
                            // IE is no longer supported)
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
                // Beware: IE11 and Chrome 41 don't like using the listener as the
                // options object. Figure out how to deal w/ this in IE11 - maybe
                // patch addEventListener?
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
    (global.litHtmlVersions ??= []).push('3.2.1');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLmpzIiwic291cmNlcyI6WyJsaXQtaHRtbC9zcmMvbGl0LWh0bWwudHMiLCJsaXQtaHRtbC9zcmMvcHJpdmF0ZS1zc3Itc3VwcG9ydC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmUudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlLWhlbHBlcnMudHMiLCJsaXQtaHRtbC9zcmMvYXN5bmMtZGlyZWN0aXZlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvcmVmLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvcHJpdmF0ZS1hc3luYy1oZWxwZXJzLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvYXN5bmMtcmVwbGFjZS50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2FzeW5jLWFwcGVuZC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2NhY2hlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvY2hvb3NlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvY2xhc3MtbWFwLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvZ3VhcmQudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9pZi1kZWZpbmVkLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvam9pbi50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2tleWVkLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvbGl2ZS50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL21hcC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3JhbmdlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvcmVwZWF0LnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvc3R5bGUtbWFwLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvdGVtcGxhdGUtY29udGVudC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3Vuc2FmZS1odG1sLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvdW5zYWZlLXN2Zy50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3VudGlsLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvd2hlbi50cyIsImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG4vLyBJTVBPUlRBTlQ6IHRoZXNlIGltcG9ydHMgbXVzdCBiZSB0eXBlLW9ubHlcbmltcG9ydCB0eXBlIHtEaXJlY3RpdmUsIERpcmVjdGl2ZVJlc3VsdCwgUGFydEluZm99IGZyb20gJy4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB0eXBlIHtUcnVzdGVkSFRNTCwgVHJ1c3RlZFR5cGVzV2luZG93fSBmcm9tICd0cnVzdGVkLXR5cGVzL2xpYic7XG5cbmNvbnN0IERFVl9NT0RFID0gdHJ1ZTtcbmNvbnN0IEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUyA9IHRydWU7XG5jb25zdCBFTkFCTEVfU0hBRFlET01fTk9QQVRDSCA9IHRydWU7XG5jb25zdCBOT0RFX01PREUgPSBmYWxzZTtcblxuLy8gQWxsb3dzIG1pbmlmaWVycyB0byByZW5hbWUgcmVmZXJlbmNlcyB0byBnbG9iYWxUaGlzXG5jb25zdCBnbG9iYWwgPSBnbG9iYWxUaGlzO1xuXG4vKipcbiAqIENvbnRhaW5zIHR5cGVzIHRoYXQgYXJlIHBhcnQgb2YgdGhlIHVuc3RhYmxlIGRlYnVnIEFQSS5cbiAqXG4gKiBFdmVyeXRoaW5nIGluIHRoaXMgQVBJIGlzIG5vdCBzdGFibGUgYW5kIG1heSBjaGFuZ2Ugb3IgYmUgcmVtb3ZlZCBpbiB0aGUgZnV0dXJlLFxuICogZXZlbiBvbiBwYXRjaCByZWxlYXNlcy5cbiAqL1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbmV4cG9ydCBuYW1lc3BhY2UgTGl0VW5zdGFibGUge1xuICAvKipcbiAgICogV2hlbiBMaXQgaXMgcnVubmluZyBpbiBkZXYgbW9kZSBhbmQgYHdpbmRvdy5lbWl0TGl0RGVidWdMb2dFdmVudHNgIGlzIHRydWUsXG4gICAqIHdlIHdpbGwgZW1pdCAnbGl0LWRlYnVnJyBldmVudHMgdG8gd2luZG93LCB3aXRoIGxpdmUgZGV0YWlscyBhYm91dCB0aGUgdXBkYXRlIGFuZCByZW5kZXJcbiAgICogbGlmZWN5Y2xlLiBUaGVzZSBjYW4gYmUgdXNlZnVsIGZvciB3cml0aW5nIGRlYnVnIHRvb2xpbmcgYW5kIHZpc3VhbGl6YXRpb25zLlxuICAgKlxuICAgKiBQbGVhc2UgYmUgYXdhcmUgdGhhdCBydW5uaW5nIHdpdGggd2luZG93LmVtaXRMaXREZWJ1Z0xvZ0V2ZW50cyBoYXMgcGVyZm9ybWFuY2Ugb3ZlcmhlYWQsXG4gICAqIG1ha2luZyBjZXJ0YWluIG9wZXJhdGlvbnMgdGhhdCBhcmUgbm9ybWFsbHkgdmVyeSBjaGVhcCAobGlrZSBhIG5vLW9wIHJlbmRlcikgbXVjaCBzbG93ZXIsXG4gICAqIGJlY2F1c2Ugd2UgbXVzdCBjb3B5IGRhdGEgYW5kIGRpc3BhdGNoIGV2ZW50cy5cbiAgICovXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlXG4gIGV4cG9ydCBuYW1lc3BhY2UgRGVidWdMb2cge1xuICAgIGV4cG9ydCB0eXBlIEVudHJ5ID1cbiAgICAgIHwgVGVtcGxhdGVQcmVwXG4gICAgICB8IFRlbXBsYXRlSW5zdGFudGlhdGVkXG4gICAgICB8IFRlbXBsYXRlSW5zdGFudGlhdGVkQW5kVXBkYXRlZFxuICAgICAgfCBUZW1wbGF0ZVVwZGF0aW5nXG4gICAgICB8IEJlZ2luUmVuZGVyXG4gICAgICB8IEVuZFJlbmRlclxuICAgICAgfCBDb21taXRQYXJ0RW50cnlcbiAgICAgIHwgU2V0UGFydFZhbHVlO1xuICAgIGV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVQcmVwIHtcbiAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSBwcmVwJztcbiAgICAgIHRlbXBsYXRlOiBUZW1wbGF0ZTtcbiAgICAgIHN0cmluZ3M6IFRlbXBsYXRlU3RyaW5nc0FycmF5O1xuICAgICAgY2xvbmFibGVUZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudDtcbiAgICAgIHBhcnRzOiBUZW1wbGF0ZVBhcnRbXTtcbiAgICB9XG4gICAgZXhwb3J0IGludGVyZmFjZSBCZWdpblJlbmRlciB7XG4gICAgICBraW5kOiAnYmVnaW4gcmVuZGVyJztcbiAgICAgIGlkOiBudW1iZXI7XG4gICAgICB2YWx1ZTogdW5rbm93bjtcbiAgICAgIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCBEb2N1bWVudEZyYWdtZW50O1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICAgIHBhcnQ6IENoaWxkUGFydCB8IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZXhwb3J0IGludGVyZmFjZSBFbmRSZW5kZXIge1xuICAgICAga2luZDogJ2VuZCByZW5kZXInO1xuICAgICAgaWQ6IG51bWJlcjtcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgY29udGFpbmVyOiBIVE1MRWxlbWVudCB8IERvY3VtZW50RnJhZ21lbnQ7XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgICAgcGFydDogQ2hpbGRQYXJ0O1xuICAgIH1cbiAgICBleHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlSW5zdGFudGlhdGVkIHtcbiAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSBpbnN0YW50aWF0ZWQnO1xuICAgICAgdGVtcGxhdGU6IFRlbXBsYXRlIHwgQ29tcGlsZWRUZW1wbGF0ZTtcbiAgICAgIGluc3RhbmNlOiBUZW1wbGF0ZUluc3RhbmNlO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICAgIGZyYWdtZW50OiBOb2RlO1xuICAgICAgcGFydHM6IEFycmF5PFBhcnQgfCB1bmRlZmluZWQ+O1xuICAgICAgdmFsdWVzOiB1bmtub3duW107XG4gICAgfVxuICAgIGV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVJbnN0YW50aWF0ZWRBbmRVcGRhdGVkIHtcbiAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSBpbnN0YW50aWF0ZWQgYW5kIHVwZGF0ZWQnO1xuICAgICAgdGVtcGxhdGU6IFRlbXBsYXRlIHwgQ29tcGlsZWRUZW1wbGF0ZTtcbiAgICAgIGluc3RhbmNlOiBUZW1wbGF0ZUluc3RhbmNlO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICAgIGZyYWdtZW50OiBOb2RlO1xuICAgICAgcGFydHM6IEFycmF5PFBhcnQgfCB1bmRlZmluZWQ+O1xuICAgICAgdmFsdWVzOiB1bmtub3duW107XG4gICAgfVxuICAgIGV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVVcGRhdGluZyB7XG4gICAgICBraW5kOiAndGVtcGxhdGUgdXBkYXRpbmcnO1xuICAgICAgdGVtcGxhdGU6IFRlbXBsYXRlIHwgQ29tcGlsZWRUZW1wbGF0ZTtcbiAgICAgIGluc3RhbmNlOiBUZW1wbGF0ZUluc3RhbmNlO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICAgIHBhcnRzOiBBcnJheTxQYXJ0IHwgdW5kZWZpbmVkPjtcbiAgICAgIHZhbHVlczogdW5rbm93bltdO1xuICAgIH1cbiAgICBleHBvcnQgaW50ZXJmYWNlIFNldFBhcnRWYWx1ZSB7XG4gICAgICBraW5kOiAnc2V0IHBhcnQnO1xuICAgICAgcGFydDogUGFydDtcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgdmFsdWVJbmRleDogbnVtYmVyO1xuICAgICAgdmFsdWVzOiB1bmtub3duW107XG4gICAgICB0ZW1wbGF0ZUluc3RhbmNlOiBUZW1wbGF0ZUluc3RhbmNlO1xuICAgIH1cblxuICAgIGV4cG9ydCB0eXBlIENvbW1pdFBhcnRFbnRyeSA9XG4gICAgICB8IENvbW1pdE5vdGhpbmdUb0NoaWxkRW50cnlcbiAgICAgIHwgQ29tbWl0VGV4dFxuICAgICAgfCBDb21taXROb2RlXG4gICAgICB8IENvbW1pdEF0dHJpYnV0ZVxuICAgICAgfCBDb21taXRQcm9wZXJ0eVxuICAgICAgfCBDb21taXRCb29sZWFuQXR0cmlidXRlXG4gICAgICB8IENvbW1pdEV2ZW50TGlzdGVuZXJcbiAgICAgIHwgQ29tbWl0VG9FbGVtZW50QmluZGluZztcblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0Tm90aGluZ1RvQ2hpbGRFbnRyeSB7XG4gICAgICBraW5kOiAnY29tbWl0IG5vdGhpbmcgdG8gY2hpbGQnO1xuICAgICAgc3RhcnQ6IENoaWxkTm9kZTtcbiAgICAgIGVuZDogQ2hpbGROb2RlIHwgbnVsbDtcbiAgICAgIHBhcmVudDogRGlzY29ubmVjdGFibGUgfCB1bmRlZmluZWQ7XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0VGV4dCB7XG4gICAgICBraW5kOiAnY29tbWl0IHRleHQnO1xuICAgICAgbm9kZTogVGV4dDtcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBleHBvcnQgaW50ZXJmYWNlIENvbW1pdE5vZGUge1xuICAgICAga2luZDogJ2NvbW1pdCBub2RlJztcbiAgICAgIHN0YXJ0OiBOb2RlO1xuICAgICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSB8IHVuZGVmaW5lZDtcbiAgICAgIHZhbHVlOiBOb2RlO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBleHBvcnQgaW50ZXJmYWNlIENvbW1pdEF0dHJpYnV0ZSB7XG4gICAgICBraW5kOiAnY29tbWl0IGF0dHJpYnV0ZSc7XG4gICAgICBlbGVtZW50OiBFbGVtZW50O1xuICAgICAgbmFtZTogc3RyaW5nO1xuICAgICAgdmFsdWU6IHVua25vd247XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0UHJvcGVydHkge1xuICAgICAga2luZDogJ2NvbW1pdCBwcm9wZXJ0eSc7XG4gICAgICBlbGVtZW50OiBFbGVtZW50O1xuICAgICAgbmFtZTogc3RyaW5nO1xuICAgICAgdmFsdWU6IHVua25vd247XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0Qm9vbGVhbkF0dHJpYnV0ZSB7XG4gICAgICBraW5kOiAnY29tbWl0IGJvb2xlYW4gYXR0cmlidXRlJztcbiAgICAgIGVsZW1lbnQ6IEVsZW1lbnQ7XG4gICAgICBuYW1lOiBzdHJpbmc7XG4gICAgICB2YWx1ZTogYm9vbGVhbjtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZXhwb3J0IGludGVyZmFjZSBDb21taXRFdmVudExpc3RlbmVyIHtcbiAgICAgIGtpbmQ6ICdjb21taXQgZXZlbnQgbGlzdGVuZXInO1xuICAgICAgZWxlbWVudDogRWxlbWVudDtcbiAgICAgIG5hbWU6IHN0cmluZztcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgb2xkTGlzdGVuZXI6IHVua25vd247XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgICAgLy8gVHJ1ZSBpZiB3ZSdyZSByZW1vdmluZyB0aGUgb2xkIGV2ZW50IGxpc3RlbmVyIChlLmcuIGJlY2F1c2Ugc2V0dGluZ3MgY2hhbmdlZCwgb3IgdmFsdWUgaXMgbm90aGluZylcbiAgICAgIHJlbW92ZUxpc3RlbmVyOiBib29sZWFuO1xuICAgICAgLy8gVHJ1ZSBpZiB3ZSdyZSBhZGRpbmcgYSBuZXcgZXZlbnQgbGlzdGVuZXIgKGUuZy4gYmVjYXVzZSBmaXJzdCByZW5kZXIsIG9yIHNldHRpbmdzIGNoYW5nZWQpXG4gICAgICBhZGRMaXN0ZW5lcjogYm9vbGVhbjtcbiAgICB9XG5cbiAgICBleHBvcnQgaW50ZXJmYWNlIENvbW1pdFRvRWxlbWVudEJpbmRpbmcge1xuICAgICAga2luZDogJ2NvbW1pdCB0byBlbGVtZW50IGJpbmRpbmcnO1xuICAgICAgZWxlbWVudDogRWxlbWVudDtcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cbn1cblxuaW50ZXJmYWNlIERlYnVnTG9nZ2luZ1dpbmRvdyB7XG4gIC8vIEV2ZW4gaW4gZGV2IG1vZGUsIHdlIGdlbmVyYWxseSBkb24ndCB3YW50IHRvIGVtaXQgdGhlc2UgZXZlbnRzLCBhcyB0aGF0J3NcbiAgLy8gYW5vdGhlciBsZXZlbCBvZiBjb3N0LCBzbyBvbmx5IGVtaXQgdGhlbSB3aGVuIERFVl9NT0RFIGlzIHRydWUgX2FuZF8gd2hlblxuICAvLyB3aW5kb3cuZW1pdExpdERlYnVnRXZlbnRzIGlzIHRydWUuXG4gIGVtaXRMaXREZWJ1Z0xvZ0V2ZW50cz86IGJvb2xlYW47XG59XG5cbi8qKlxuICogVXNlZnVsIGZvciB2aXN1YWxpemluZyBhbmQgbG9nZ2luZyBpbnNpZ2h0cyBpbnRvIHdoYXQgdGhlIExpdCB0ZW1wbGF0ZSBzeXN0ZW0gaXMgZG9pbmcuXG4gKlxuICogQ29tcGlsZWQgb3V0IG9mIHByb2QgbW9kZSBidWlsZHMuXG4gKi9cbmNvbnN0IGRlYnVnTG9nRXZlbnQgPSBERVZfTU9ERVxuICA/IChldmVudDogTGl0VW5zdGFibGUuRGVidWdMb2cuRW50cnkpID0+IHtcbiAgICAgIGNvbnN0IHNob3VsZEVtaXQgPSAoZ2xvYmFsIGFzIHVua25vd24gYXMgRGVidWdMb2dnaW5nV2luZG93KVxuICAgICAgICAuZW1pdExpdERlYnVnTG9nRXZlbnRzO1xuICAgICAgaWYgKCFzaG91bGRFbWl0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGdsb2JhbC5kaXNwYXRjaEV2ZW50KFxuICAgICAgICBuZXcgQ3VzdG9tRXZlbnQ8TGl0VW5zdGFibGUuRGVidWdMb2cuRW50cnk+KCdsaXQtZGVidWcnLCB7XG4gICAgICAgICAgZGV0YWlsOiBldmVudCxcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICA6IHVuZGVmaW5lZDtcbi8vIFVzZWQgZm9yIGNvbm5lY3RpbmcgYmVnaW5SZW5kZXIgYW5kIGVuZFJlbmRlciBldmVudHMgd2hlbiB0aGVyZSBhcmUgbmVzdGVkXG4vLyByZW5kZXJzIHdoZW4gZXJyb3JzIGFyZSB0aHJvd24gcHJldmVudGluZyBhbiBlbmRSZW5kZXIgZXZlbnQgZnJvbSBiZWluZ1xuLy8gY2FsbGVkLlxubGV0IGRlYnVnTG9nUmVuZGVySWQgPSAwO1xuXG5sZXQgaXNzdWVXYXJuaW5nOiAoY29kZTogc3RyaW5nLCB3YXJuaW5nOiBzdHJpbmcpID0+IHZvaWQ7XG5cbmlmIChERVZfTU9ERSkge1xuICBnbG9iYWwubGl0SXNzdWVkV2FybmluZ3MgPz89IG5ldyBTZXQoKTtcblxuICAvLyBJc3N1ZSBhIHdhcm5pbmcsIGlmIHdlIGhhdmVuJ3QgYWxyZWFkeS5cbiAgaXNzdWVXYXJuaW5nID0gKGNvZGU6IHN0cmluZywgd2FybmluZzogc3RyaW5nKSA9PiB7XG4gICAgd2FybmluZyArPSBjb2RlXG4gICAgICA/IGAgU2VlIGh0dHBzOi8vbGl0LmRldi9tc2cvJHtjb2RlfSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5gXG4gICAgICA6ICcnO1xuICAgIGlmICghZ2xvYmFsLmxpdElzc3VlZFdhcm5pbmdzIS5oYXMod2FybmluZykpIHtcbiAgICAgIGNvbnNvbGUud2Fybih3YXJuaW5nKTtcbiAgICAgIGdsb2JhbC5saXRJc3N1ZWRXYXJuaW5ncyEuYWRkKHdhcm5pbmcpO1xuICAgIH1cbiAgfTtcblxuICBpc3N1ZVdhcm5pbmcoXG4gICAgJ2Rldi1tb2RlJyxcbiAgICBgTGl0IGlzIGluIGRldiBtb2RlLiBOb3QgcmVjb21tZW5kZWQgZm9yIHByb2R1Y3Rpb24hYFxuICApO1xufVxuXG5jb25zdCB3cmFwID1cbiAgRU5BQkxFX1NIQURZRE9NX05PUEFUQ0ggJiZcbiAgZ2xvYmFsLlNoYWR5RE9NPy5pblVzZSAmJlxuICBnbG9iYWwuU2hhZHlET00/Lm5vUGF0Y2ggPT09IHRydWVcbiAgICA/IChnbG9iYWwuU2hhZHlET00hLndyYXAgYXMgPFQgZXh0ZW5kcyBOb2RlPihub2RlOiBUKSA9PiBUKVxuICAgIDogPFQgZXh0ZW5kcyBOb2RlPihub2RlOiBUKSA9PiBub2RlO1xuXG5jb25zdCB0cnVzdGVkVHlwZXMgPSAoZ2xvYmFsIGFzIHVua25vd24gYXMgVHJ1c3RlZFR5cGVzV2luZG93KS50cnVzdGVkVHlwZXM7XG5cbi8qKlxuICogT3VyIFRydXN0ZWRUeXBlUG9saWN5IGZvciBIVE1MIHdoaWNoIGlzIGRlY2xhcmVkIHVzaW5nIHRoZSBodG1sIHRlbXBsYXRlXG4gKiB0YWcgZnVuY3Rpb24uXG4gKlxuICogVGhhdCBIVE1MIGlzIGEgZGV2ZWxvcGVyLWF1dGhvcmVkIGNvbnN0YW50LCBhbmQgaXMgcGFyc2VkIHdpdGggaW5uZXJIVE1MXG4gKiBiZWZvcmUgYW55IHVudHJ1c3RlZCBleHByZXNzaW9ucyBoYXZlIGJlZW4gbWl4ZWQgaW4uIFRoZXJlZm9yIGl0IGlzXG4gKiBjb25zaWRlcmVkIHNhZmUgYnkgY29uc3RydWN0aW9uLlxuICovXG5jb25zdCBwb2xpY3kgPSB0cnVzdGVkVHlwZXNcbiAgPyB0cnVzdGVkVHlwZXMuY3JlYXRlUG9saWN5KCdsaXQtaHRtbCcsIHtcbiAgICAgIGNyZWF0ZUhUTUw6IChzKSA9PiBzLFxuICAgIH0pXG4gIDogdW5kZWZpbmVkO1xuXG4vKipcbiAqIFVzZWQgdG8gc2FuaXRpemUgYW55IHZhbHVlIGJlZm9yZSBpdCBpcyB3cml0dGVuIGludG8gdGhlIERPTS4gVGhpcyBjYW4gYmVcbiAqIHVzZWQgdG8gaW1wbGVtZW50IGEgc2VjdXJpdHkgcG9saWN5IG9mIGFsbG93ZWQgYW5kIGRpc2FsbG93ZWQgdmFsdWVzIGluXG4gKiBvcmRlciB0byBwcmV2ZW50IFhTUyBhdHRhY2tzLlxuICpcbiAqIE9uZSB3YXkgb2YgdXNpbmcgdGhpcyBjYWxsYmFjayB3b3VsZCBiZSB0byBjaGVjayBhdHRyaWJ1dGVzIGFuZCBwcm9wZXJ0aWVzXG4gKiBhZ2FpbnN0IGEgbGlzdCBvZiBoaWdoIHJpc2sgZmllbGRzLCBhbmQgcmVxdWlyZSB0aGF0IHZhbHVlcyB3cml0dGVuIHRvIHN1Y2hcbiAqIGZpZWxkcyBiZSBpbnN0YW5jZXMgb2YgYSBjbGFzcyB3aGljaCBpcyBzYWZlIGJ5IGNvbnN0cnVjdGlvbi4gQ2xvc3VyZSdzIFNhZmVcbiAqIEhUTUwgVHlwZXMgaXMgb25lIGltcGxlbWVudGF0aW9uIG9mIHRoaXMgdGVjaG5pcXVlIChcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9nb29nbGUvc2FmZS1odG1sLXR5cGVzL2Jsb2IvbWFzdGVyL2RvYy9zYWZlaHRtbC10eXBlcy5tZCkuXG4gKiBUaGUgVHJ1c3RlZFR5cGVzIHBvbHlmaWxsIGluIEFQSS1vbmx5IG1vZGUgY291bGQgYWxzbyBiZSB1c2VkIGFzIGEgYmFzaXNcbiAqIGZvciB0aGlzIHRlY2huaXF1ZSAoaHR0cHM6Ly9naXRodWIuY29tL1dJQ0cvdHJ1c3RlZC10eXBlcykuXG4gKlxuICogQHBhcmFtIG5vZGUgVGhlIEhUTUwgbm9kZSAodXN1YWxseSBlaXRoZXIgYSAjdGV4dCBub2RlIG9yIGFuIEVsZW1lbnQpIHRoYXRcbiAqICAgICBpcyBiZWluZyB3cml0dGVuIHRvLiBOb3RlIHRoYXQgdGhpcyBpcyBqdXN0IGFuIGV4ZW1wbGFyIG5vZGUsIHRoZSB3cml0ZVxuICogICAgIG1heSB0YWtlIHBsYWNlIGFnYWluc3QgYW5vdGhlciBpbnN0YW5jZSBvZiB0aGUgc2FtZSBjbGFzcyBvZiBub2RlLlxuICogQHBhcmFtIG5hbWUgVGhlIG5hbWUgb2YgYW4gYXR0cmlidXRlIG9yIHByb3BlcnR5IChmb3IgZXhhbXBsZSwgJ2hyZWYnKS5cbiAqIEBwYXJhbSB0eXBlIEluZGljYXRlcyB3aGV0aGVyIHRoZSB3cml0ZSB0aGF0J3MgYWJvdXQgdG8gYmUgcGVyZm9ybWVkIHdpbGxcbiAqICAgICBiZSB0byBhIHByb3BlcnR5IG9yIGEgbm9kZS5cbiAqIEByZXR1cm4gQSBmdW5jdGlvbiB0aGF0IHdpbGwgc2FuaXRpemUgdGhpcyBjbGFzcyBvZiB3cml0ZXMuXG4gKi9cbmV4cG9ydCB0eXBlIFNhbml0aXplckZhY3RvcnkgPSAoXG4gIG5vZGU6IE5vZGUsXG4gIG5hbWU6IHN0cmluZyxcbiAgdHlwZTogJ3Byb3BlcnR5JyB8ICdhdHRyaWJ1dGUnXG4pID0+IFZhbHVlU2FuaXRpemVyO1xuXG4vKipcbiAqIEEgZnVuY3Rpb24gd2hpY2ggY2FuIHNhbml0aXplIHZhbHVlcyB0aGF0IHdpbGwgYmUgd3JpdHRlbiB0byBhIHNwZWNpZmljIGtpbmRcbiAqIG9mIERPTSBzaW5rLlxuICpcbiAqIFNlZSBTYW5pdGl6ZXJGYWN0b3J5LlxuICpcbiAqIEBwYXJhbSB2YWx1ZSBUaGUgdmFsdWUgdG8gc2FuaXRpemUuIFdpbGwgYmUgdGhlIGFjdHVhbCB2YWx1ZSBwYXNzZWQgaW50b1xuICogICAgIHRoZSBsaXQtaHRtbCB0ZW1wbGF0ZSBsaXRlcmFsLCBzbyB0aGlzIGNvdWxkIGJlIG9mIGFueSB0eXBlLlxuICogQHJldHVybiBUaGUgdmFsdWUgdG8gd3JpdGUgdG8gdGhlIERPTS4gVXN1YWxseSB0aGUgc2FtZSBhcyB0aGUgaW5wdXQgdmFsdWUsXG4gKiAgICAgdW5sZXNzIHNhbml0aXphdGlvbiBpcyBuZWVkZWQuXG4gKi9cbmV4cG9ydCB0eXBlIFZhbHVlU2FuaXRpemVyID0gKHZhbHVlOiB1bmtub3duKSA9PiB1bmtub3duO1xuXG5jb25zdCBpZGVudGl0eUZ1bmN0aW9uOiBWYWx1ZVNhbml0aXplciA9ICh2YWx1ZTogdW5rbm93bikgPT4gdmFsdWU7XG5jb25zdCBub29wU2FuaXRpemVyOiBTYW5pdGl6ZXJGYWN0b3J5ID0gKFxuICBfbm9kZTogTm9kZSxcbiAgX25hbWU6IHN0cmluZyxcbiAgX3R5cGU6ICdwcm9wZXJ0eScgfCAnYXR0cmlidXRlJ1xuKSA9PiBpZGVudGl0eUZ1bmN0aW9uO1xuXG4vKiogU2V0cyB0aGUgZ2xvYmFsIHNhbml0aXplciBmYWN0b3J5LiAqL1xuY29uc3Qgc2V0U2FuaXRpemVyID0gKG5ld1Nhbml0aXplcjogU2FuaXRpemVyRmFjdG9yeSkgPT4ge1xuICBpZiAoIUVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoc2FuaXRpemVyRmFjdG9yeUludGVybmFsICE9PSBub29wU2FuaXRpemVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYEF0dGVtcHRlZCB0byBvdmVyd3JpdGUgZXhpc3RpbmcgbGl0LWh0bWwgc2VjdXJpdHkgcG9saWN5LmAgK1xuICAgICAgICBgIHNldFNhbml0aXplRE9NVmFsdWVGYWN0b3J5IHNob3VsZCBiZSBjYWxsZWQgYXQgbW9zdCBvbmNlLmBcbiAgICApO1xuICB9XG4gIHNhbml0aXplckZhY3RvcnlJbnRlcm5hbCA9IG5ld1Nhbml0aXplcjtcbn07XG5cbi8qKlxuICogT25seSB1c2VkIGluIGludGVybmFsIHRlc3RzLCBub3QgYSBwYXJ0IG9mIHRoZSBwdWJsaWMgQVBJLlxuICovXG5jb25zdCBfdGVzdE9ubHlDbGVhclNhbml0aXplckZhY3RvcnlEb05vdENhbGxPckVsc2UgPSAoKSA9PiB7XG4gIHNhbml0aXplckZhY3RvcnlJbnRlcm5hbCA9IG5vb3BTYW5pdGl6ZXI7XG59O1xuXG5jb25zdCBjcmVhdGVTYW5pdGl6ZXI6IFNhbml0aXplckZhY3RvcnkgPSAobm9kZSwgbmFtZSwgdHlwZSkgPT4ge1xuICByZXR1cm4gc2FuaXRpemVyRmFjdG9yeUludGVybmFsKG5vZGUsIG5hbWUsIHR5cGUpO1xufTtcblxuLy8gQWRkZWQgdG8gYW4gYXR0cmlidXRlIG5hbWUgdG8gbWFyayB0aGUgYXR0cmlidXRlIGFzIGJvdW5kIHNvIHdlIGNhbiBmaW5kXG4vLyBpdCBlYXNpbHkuXG5jb25zdCBib3VuZEF0dHJpYnV0ZVN1ZmZpeCA9ICckbGl0JCc7XG5cbi8vIFRoaXMgbWFya2VyIGlzIHVzZWQgaW4gbWFueSBzeW50YWN0aWMgcG9zaXRpb25zIGluIEhUTUwsIHNvIGl0IG11c3QgYmVcbi8vIGEgdmFsaWQgZWxlbWVudCBuYW1lIGFuZCBhdHRyaWJ1dGUgbmFtZS4gV2UgZG9uJ3Qgc3VwcG9ydCBkeW5hbWljIG5hbWVzICh5ZXQpXG4vLyBidXQgdGhpcyBhdCBsZWFzdCBlbnN1cmVzIHRoYXQgdGhlIHBhcnNlIHRyZWUgaXMgY2xvc2VyIHRvIHRoZSB0ZW1wbGF0ZVxuLy8gaW50ZW50aW9uLlxuY29uc3QgbWFya2VyID0gYGxpdCQke01hdGgucmFuZG9tKCkudG9GaXhlZCg5KS5zbGljZSgyKX0kYDtcblxuLy8gU3RyaW5nIHVzZWQgdG8gdGVsbCBpZiBhIGNvbW1lbnQgaXMgYSBtYXJrZXIgY29tbWVudFxuY29uc3QgbWFya2VyTWF0Y2ggPSAnPycgKyBtYXJrZXI7XG5cbi8vIFRleHQgdXNlZCB0byBpbnNlcnQgYSBjb21tZW50IG1hcmtlciBub2RlLiBXZSB1c2UgcHJvY2Vzc2luZyBpbnN0cnVjdGlvblxuLy8gc3ludGF4IGJlY2F1c2UgaXQncyBzbGlnaHRseSBzbWFsbGVyLCBidXQgcGFyc2VzIGFzIGEgY29tbWVudCBub2RlLlxuY29uc3Qgbm9kZU1hcmtlciA9IGA8JHttYXJrZXJNYXRjaH0+YDtcblxuY29uc3QgZCA9XG4gIE5PREVfTU9ERSAmJiBnbG9iYWwuZG9jdW1lbnQgPT09IHVuZGVmaW5lZFxuICAgID8gKHtcbiAgICAgICAgY3JlYXRlVHJlZVdhbGtlcigpIHtcbiAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgIH0sXG4gICAgICB9IGFzIHVua25vd24gYXMgRG9jdW1lbnQpXG4gICAgOiBkb2N1bWVudDtcblxuLy8gQ3JlYXRlcyBhIGR5bmFtaWMgbWFya2VyLiBXZSBuZXZlciBoYXZlIHRvIHNlYXJjaCBmb3IgdGhlc2UgaW4gdGhlIERPTS5cbmNvbnN0IGNyZWF0ZU1hcmtlciA9ICgpID0+IGQuY3JlYXRlQ29tbWVudCgnJyk7XG5cbi8vIGh0dHBzOi8vdGMzOS5naXRodWIuaW8vZWNtYTI2Mi8jc2VjLXR5cGVvZi1vcGVyYXRvclxudHlwZSBQcmltaXRpdmUgPSBudWxsIHwgdW5kZWZpbmVkIHwgYm9vbGVhbiB8IG51bWJlciB8IHN0cmluZyB8IHN5bWJvbCB8IGJpZ2ludDtcbmNvbnN0IGlzUHJpbWl0aXZlID0gKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgUHJpbWl0aXZlID0+XG4gIHZhbHVlID09PSBudWxsIHx8ICh0eXBlb2YgdmFsdWUgIT0gJ29iamVjdCcgJiYgdHlwZW9mIHZhbHVlICE9ICdmdW5jdGlvbicpO1xuY29uc3QgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5jb25zdCBpc0l0ZXJhYmxlID0gKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgSXRlcmFibGU8dW5rbm93bj4gPT5cbiAgaXNBcnJheSh2YWx1ZSkgfHxcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgdHlwZW9mICh2YWx1ZSBhcyBhbnkpPy5bU3ltYm9sLml0ZXJhdG9yXSA9PT0gJ2Z1bmN0aW9uJztcblxuY29uc3QgU1BBQ0VfQ0hBUiA9IGBbIFxcdFxcblxcZlxccl1gO1xuY29uc3QgQVRUUl9WQUxVRV9DSEFSID0gYFteIFxcdFxcblxcZlxcclwiJ1xcYDw+PV1gO1xuY29uc3QgTkFNRV9DSEFSID0gYFteXFxcXHNcIic+PS9dYDtcblxuLy8gVGhlc2UgcmVnZXhlcyByZXByZXNlbnQgdGhlIGZpdmUgcGFyc2luZyBzdGF0ZXMgdGhhdCB3ZSBjYXJlIGFib3V0IGluIHRoZVxuLy8gVGVtcGxhdGUncyBIVE1MIHNjYW5uZXIuIFRoZXkgbWF0Y2ggdGhlICplbmQqIG9mIHRoZSBzdGF0ZSB0aGV5J3JlIG5hbWVkXG4vLyBhZnRlci5cbi8vIERlcGVuZGluZyBvbiB0aGUgbWF0Y2gsIHdlIHRyYW5zaXRpb24gdG8gYSBuZXcgc3RhdGUuIElmIHRoZXJlJ3Mgbm8gbWF0Y2gsXG4vLyB3ZSBzdGF5IGluIHRoZSBzYW1lIHN0YXRlLlxuLy8gTm90ZSB0aGF0IHRoZSByZWdleGVzIGFyZSBzdGF0ZWZ1bC4gV2UgdXRpbGl6ZSBsYXN0SW5kZXggYW5kIHN5bmMgaXRcbi8vIGFjcm9zcyB0aGUgbXVsdGlwbGUgcmVnZXhlcyB1c2VkLiBJbiBhZGRpdGlvbiB0byB0aGUgZml2ZSByZWdleGVzIGJlbG93XG4vLyB3ZSBhbHNvIGR5bmFtaWNhbGx5IGNyZWF0ZSBhIHJlZ2V4IHRvIGZpbmQgdGhlIG1hdGNoaW5nIGVuZCB0YWdzIGZvciByYXdcbi8vIHRleHQgZWxlbWVudHMuXG5cbi8qKlxuICogRW5kIG9mIHRleHQgaXM6IGA8YCBmb2xsb3dlZCBieTpcbiAqICAgKGNvbW1lbnQgc3RhcnQpIG9yICh0YWcpIG9yIChkeW5hbWljIHRhZyBiaW5kaW5nKVxuICovXG5jb25zdCB0ZXh0RW5kUmVnZXggPSAvPCg/OighLS18XFwvW15hLXpBLVpdKXwoXFwvP1thLXpBLVpdW14+XFxzXSopfChcXC8/JCkpL2c7XG5jb25zdCBDT01NRU5UX1NUQVJUID0gMTtcbmNvbnN0IFRBR19OQU1FID0gMjtcbmNvbnN0IERZTkFNSUNfVEFHX05BTUUgPSAzO1xuXG5jb25zdCBjb21tZW50RW5kUmVnZXggPSAvLS0+L2c7XG4vKipcbiAqIENvbW1lbnRzIG5vdCBzdGFydGVkIHdpdGggPCEtLSwgbGlrZSA8L3ssIGNhbiBiZSBlbmRlZCBieSBhIHNpbmdsZSBgPmBcbiAqL1xuY29uc3QgY29tbWVudDJFbmRSZWdleCA9IC8+L2c7XG5cbi8qKlxuICogVGhlIHRhZ0VuZCByZWdleCBtYXRjaGVzIHRoZSBlbmQgb2YgdGhlIFwiaW5zaWRlIGFuIG9wZW5pbmdcIiB0YWcgc3ludGF4XG4gKiBwb3NpdGlvbi4gSXQgZWl0aGVyIG1hdGNoZXMgYSBgPmAsIGFuIGF0dHJpYnV0ZS1saWtlIHNlcXVlbmNlLCBvciB0aGUgZW5kXG4gKiBvZiB0aGUgc3RyaW5nIGFmdGVyIGEgc3BhY2UgKGF0dHJpYnV0ZS1uYW1lIHBvc2l0aW9uIGVuZGluZykuXG4gKlxuICogU2VlIGF0dHJpYnV0ZXMgaW4gdGhlIEhUTUwgc3BlYzpcbiAqIGh0dHBzOi8vd3d3LnczLm9yZy9UUi9odG1sNS9zeW50YXguaHRtbCNlbGVtZW50cy1hdHRyaWJ1dGVzXG4gKlxuICogXCIgXFx0XFxuXFxmXFxyXCIgYXJlIEhUTUwgc3BhY2UgY2hhcmFjdGVyczpcbiAqIGh0dHBzOi8vaW5mcmEuc3BlYy53aGF0d2cub3JnLyNhc2NpaS13aGl0ZXNwYWNlXG4gKlxuICogU28gYW4gYXR0cmlidXRlIGlzOlxuICogICogVGhlIG5hbWU6IGFueSBjaGFyYWN0ZXIgZXhjZXB0IGEgd2hpdGVzcGFjZSBjaGFyYWN0ZXIsIChcIiksICgnKSwgXCI+XCIsXG4gKiAgICBcIj1cIiwgb3IgXCIvXCIuIE5vdGU6IHRoaXMgaXMgZGlmZmVyZW50IGZyb20gdGhlIEhUTUwgc3BlYyB3aGljaCBhbHNvIGV4Y2x1ZGVzIGNvbnRyb2wgY2hhcmFjdGVycy5cbiAqICAqIEZvbGxvd2VkIGJ5IHplcm8gb3IgbW9yZSBzcGFjZSBjaGFyYWN0ZXJzXG4gKiAgKiBGb2xsb3dlZCBieSBcIj1cIlxuICogICogRm9sbG93ZWQgYnkgemVybyBvciBtb3JlIHNwYWNlIGNoYXJhY3RlcnNcbiAqICAqIEZvbGxvd2VkIGJ5OlxuICogICAgKiBBbnkgY2hhcmFjdGVyIGV4Y2VwdCBzcGFjZSwgKCcpLCAoXCIpLCBcIjxcIiwgXCI+XCIsIFwiPVwiLCAoYCksIG9yXG4gKiAgICAqIChcIikgdGhlbiBhbnkgbm9uLShcIiksIG9yXG4gKiAgICAqICgnKSB0aGVuIGFueSBub24tKCcpXG4gKi9cbmNvbnN0IHRhZ0VuZFJlZ2V4ID0gbmV3IFJlZ0V4cChcbiAgYD58JHtTUEFDRV9DSEFSfSg/Oigke05BTUVfQ0hBUn0rKSgke1NQQUNFX0NIQVJ9Kj0ke1NQQUNFX0NIQVJ9Kig/OiR7QVRUUl9WQUxVRV9DSEFSfXwoXCJ8Jyl8KSl8JClgLFxuICAnZydcbik7XG5jb25zdCBFTlRJUkVfTUFUQ0ggPSAwO1xuY29uc3QgQVRUUklCVVRFX05BTUUgPSAxO1xuY29uc3QgU1BBQ0VTX0FORF9FUVVBTFMgPSAyO1xuY29uc3QgUVVPVEVfQ0hBUiA9IDM7XG5cbmNvbnN0IHNpbmdsZVF1b3RlQXR0ckVuZFJlZ2V4ID0gLycvZztcbmNvbnN0IGRvdWJsZVF1b3RlQXR0ckVuZFJlZ2V4ID0gL1wiL2c7XG4vKipcbiAqIE1hdGNoZXMgdGhlIHJhdyB0ZXh0IGVsZW1lbnRzLlxuICpcbiAqIENvbW1lbnRzIGFyZSBub3QgcGFyc2VkIHdpdGhpbiByYXcgdGV4dCBlbGVtZW50cywgc28gd2UgbmVlZCB0byBzZWFyY2ggdGhlaXJcbiAqIHRleHQgY29udGVudCBmb3IgbWFya2VyIHN0cmluZ3MuXG4gKi9cbmNvbnN0IHJhd1RleHRFbGVtZW50ID0gL14oPzpzY3JpcHR8c3R5bGV8dGV4dGFyZWF8dGl0bGUpJC9pO1xuXG4vKiogVGVtcGxhdGVSZXN1bHQgdHlwZXMgKi9cbmNvbnN0IEhUTUxfUkVTVUxUID0gMTtcbmNvbnN0IFNWR19SRVNVTFQgPSAyO1xuY29uc3QgTUFUSE1MX1JFU1VMVCA9IDM7XG5cbnR5cGUgUmVzdWx0VHlwZSA9IHR5cGVvZiBIVE1MX1JFU1VMVCB8IHR5cGVvZiBTVkdfUkVTVUxUIHwgdHlwZW9mIE1BVEhNTF9SRVNVTFQ7XG5cbi8vIFRlbXBsYXRlUGFydCB0eXBlc1xuLy8gSU1QT1JUQU5UOiB0aGVzZSBtdXN0IG1hdGNoIHRoZSB2YWx1ZXMgaW4gUGFydFR5cGVcbmNvbnN0IEFUVFJJQlVURV9QQVJUID0gMTtcbmNvbnN0IENISUxEX1BBUlQgPSAyO1xuY29uc3QgUFJPUEVSVFlfUEFSVCA9IDM7XG5jb25zdCBCT09MRUFOX0FUVFJJQlVURV9QQVJUID0gNDtcbmNvbnN0IEVWRU5UX1BBUlQgPSA1O1xuY29uc3QgRUxFTUVOVF9QQVJUID0gNjtcbmNvbnN0IENPTU1FTlRfUEFSVCA9IDc7XG5cbi8qKlxuICogVGhlIHJldHVybiB0eXBlIG9mIHRoZSB0ZW1wbGF0ZSB0YWcgZnVuY3Rpb25zLCB7QGxpbmtjb2RlIGh0bWx9IGFuZFxuICoge0BsaW5rY29kZSBzdmd9IHdoZW4gaXQgaGFzbid0IGJlZW4gY29tcGlsZWQgYnkgQGxpdC1sYWJzL2NvbXBpbGVyLlxuICpcbiAqIEEgYFRlbXBsYXRlUmVzdWx0YCBvYmplY3QgaG9sZHMgYWxsIHRoZSBpbmZvcm1hdGlvbiBhYm91dCBhIHRlbXBsYXRlXG4gKiBleHByZXNzaW9uIHJlcXVpcmVkIHRvIHJlbmRlciBpdDogdGhlIHRlbXBsYXRlIHN0cmluZ3MsIGV4cHJlc3Npb24gdmFsdWVzLFxuICogYW5kIHR5cGUgb2YgdGVtcGxhdGUgKGh0bWwgb3Igc3ZnKS5cbiAqXG4gKiBgVGVtcGxhdGVSZXN1bHRgIG9iamVjdHMgZG8gbm90IGNyZWF0ZSBhbnkgRE9NIG9uIHRoZWlyIG93bi4gVG8gY3JlYXRlIG9yXG4gKiB1cGRhdGUgRE9NIHlvdSBuZWVkIHRvIHJlbmRlciB0aGUgYFRlbXBsYXRlUmVzdWx0YC4gU2VlXG4gKiBbUmVuZGVyaW5nXShodHRwczovL2xpdC5kZXYvZG9jcy9jb21wb25lbnRzL3JlbmRlcmluZykgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKlxuICovXG5leHBvcnQgdHlwZSBVbmNvbXBpbGVkVGVtcGxhdGVSZXN1bHQ8VCBleHRlbmRzIFJlc3VsdFR5cGUgPSBSZXN1bHRUeXBlPiA9IHtcbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgWydfJGxpdFR5cGUkJ106IFQ7XG4gIHN0cmluZ3M6IFRlbXBsYXRlU3RyaW5nc0FycmF5O1xuICB2YWx1ZXM6IHVua25vd25bXTtcbn07XG5cbi8qKlxuICogVGhpcyBpcyBhIHRlbXBsYXRlIHJlc3VsdCB0aGF0IG1heSBiZSBlaXRoZXIgdW5jb21waWxlZCBvciBjb21waWxlZC5cbiAqXG4gKiBJbiB0aGUgZnV0dXJlLCBUZW1wbGF0ZVJlc3VsdCB3aWxsIGJlIHRoaXMgdHlwZS4gSWYgeW91IHdhbnQgdG8gZXhwbGljaXRseVxuICogbm90ZSB0aGF0IGEgdGVtcGxhdGUgcmVzdWx0IGlzIHBvdGVudGlhbGx5IGNvbXBpbGVkLCB5b3UgY2FuIHJlZmVyZW5jZSB0aGlzXG4gKiB0eXBlIGFuZCBpdCB3aWxsIGNvbnRpbnVlIHRvIGJlaGF2ZSB0aGUgc2FtZSB0aHJvdWdoIHRoZSBuZXh0IG1ham9yIHZlcnNpb25cbiAqIG9mIExpdC4gVGhpcyBjYW4gYmUgdXNlZnVsIGZvciBjb2RlIHRoYXQgd2FudHMgdG8gcHJlcGFyZSBmb3IgdGhlIG5leHRcbiAqIG1ham9yIHZlcnNpb24gb2YgTGl0LlxuICovXG5leHBvcnQgdHlwZSBNYXliZUNvbXBpbGVkVGVtcGxhdGVSZXN1bHQ8VCBleHRlbmRzIFJlc3VsdFR5cGUgPSBSZXN1bHRUeXBlPiA9XG4gIHwgVW5jb21waWxlZFRlbXBsYXRlUmVzdWx0PFQ+XG4gIHwgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdDtcblxuLyoqXG4gKiBUaGUgcmV0dXJuIHR5cGUgb2YgdGhlIHRlbXBsYXRlIHRhZyBmdW5jdGlvbnMsIHtAbGlua2NvZGUgaHRtbH0gYW5kXG4gKiB7QGxpbmtjb2RlIHN2Z30uXG4gKlxuICogQSBgVGVtcGxhdGVSZXN1bHRgIG9iamVjdCBob2xkcyBhbGwgdGhlIGluZm9ybWF0aW9uIGFib3V0IGEgdGVtcGxhdGVcbiAqIGV4cHJlc3Npb24gcmVxdWlyZWQgdG8gcmVuZGVyIGl0OiB0aGUgdGVtcGxhdGUgc3RyaW5ncywgZXhwcmVzc2lvbiB2YWx1ZXMsXG4gKiBhbmQgdHlwZSBvZiB0ZW1wbGF0ZSAoaHRtbCBvciBzdmcpLlxuICpcbiAqIGBUZW1wbGF0ZVJlc3VsdGAgb2JqZWN0cyBkbyBub3QgY3JlYXRlIGFueSBET00gb24gdGhlaXIgb3duLiBUbyBjcmVhdGUgb3JcbiAqIHVwZGF0ZSBET00geW91IG5lZWQgdG8gcmVuZGVyIHRoZSBgVGVtcGxhdGVSZXN1bHRgLiBTZWVcbiAqIFtSZW5kZXJpbmddKGh0dHBzOi8vbGl0LmRldi9kb2NzL2NvbXBvbmVudHMvcmVuZGVyaW5nKSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAqXG4gKiBJbiBMaXQgNCwgdGhpcyB0eXBlIHdpbGwgYmUgYW4gYWxpYXMgb2ZcbiAqIE1heWJlQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdCwgc28gdGhhdCBjb2RlIHdpbGwgZ2V0IHR5cGUgZXJyb3JzIGlmIGl0IGFzc3VtZXNcbiAqIHRoYXQgTGl0IHRlbXBsYXRlcyBhcmUgbm90IGNvbXBpbGVkLiBXaGVuIGRlbGliZXJhdGVseSB3b3JraW5nIHdpdGggb25seVxuICogb25lLCB1c2UgZWl0aGVyIHtAbGlua2NvZGUgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdH0gb3JcbiAqIHtAbGlua2NvZGUgVW5jb21waWxlZFRlbXBsYXRlUmVzdWx0fSBleHBsaWNpdGx5LlxuICovXG5leHBvcnQgdHlwZSBUZW1wbGF0ZVJlc3VsdDxUIGV4dGVuZHMgUmVzdWx0VHlwZSA9IFJlc3VsdFR5cGU+ID1cbiAgVW5jb21waWxlZFRlbXBsYXRlUmVzdWx0PFQ+O1xuXG5leHBvcnQgdHlwZSBIVE1MVGVtcGxhdGVSZXN1bHQgPSBUZW1wbGF0ZVJlc3VsdDx0eXBlb2YgSFRNTF9SRVNVTFQ+O1xuXG5leHBvcnQgdHlwZSBTVkdUZW1wbGF0ZVJlc3VsdCA9IFRlbXBsYXRlUmVzdWx0PHR5cGVvZiBTVkdfUkVTVUxUPjtcblxuZXhwb3J0IHR5cGUgTWF0aE1MVGVtcGxhdGVSZXN1bHQgPSBUZW1wbGF0ZVJlc3VsdDx0eXBlb2YgTUFUSE1MX1JFU1VMVD47XG5cbi8qKlxuICogQSBUZW1wbGF0ZVJlc3VsdCB0aGF0IGhhcyBiZWVuIGNvbXBpbGVkIGJ5IEBsaXQtbGFicy9jb21waWxlciwgc2tpcHBpbmcgdGhlXG4gKiBwcmVwYXJlIHN0ZXAuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdCB7XG4gIC8vIFRoaXMgaXMgYSBmYWN0b3J5IGluIG9yZGVyIHRvIG1ha2UgdGVtcGxhdGUgaW5pdGlhbGl6YXRpb24gbGF6eVxuICAvLyBhbmQgYWxsb3cgU2hhZHlSZW5kZXJPcHRpb25zIHNjb3BlIHRvIGJlIHBhc3NlZCBpbi5cbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgWydfJGxpdFR5cGUkJ106IENvbXBpbGVkVGVtcGxhdGU7XG4gIHZhbHVlczogdW5rbm93bltdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVkVGVtcGxhdGUgZXh0ZW5kcyBPbWl0PFRlbXBsYXRlLCAnZWwnPiB7XG4gIC8vIGVsIGlzIG92ZXJyaWRkZW4gdG8gYmUgb3B0aW9uYWwuIFdlIGluaXRpYWxpemUgaXQgb24gZmlyc3QgcmVuZGVyXG4gIGVsPzogSFRNTFRlbXBsYXRlRWxlbWVudDtcblxuICAvLyBUaGUgcHJlcGFyZWQgSFRNTCBzdHJpbmcgdG8gY3JlYXRlIGEgdGVtcGxhdGUgZWxlbWVudCBmcm9tLlxuICAvLyBUaGUgdHlwZSBpcyBhIFRlbXBsYXRlU3RyaW5nc0FycmF5IHRvIGd1YXJhbnRlZSB0aGF0IHRoZSB2YWx1ZSBjYW1lIGZyb21cbiAgLy8gc291cmNlIGNvZGUsIHByZXZlbnRpbmcgYSBKU09OIGluamVjdGlvbiBhdHRhY2suXG4gIGg6IFRlbXBsYXRlU3RyaW5nc0FycmF5O1xufVxuXG4vKipcbiAqIEdlbmVyYXRlcyBhIHRlbXBsYXRlIGxpdGVyYWwgdGFnIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIFRlbXBsYXRlUmVzdWx0IHdpdGhcbiAqIHRoZSBnaXZlbiByZXN1bHQgdHlwZS5cbiAqL1xuY29uc3QgdGFnID1cbiAgPFQgZXh0ZW5kcyBSZXN1bHRUeXBlPih0eXBlOiBUKSA9PlxuICAoc3RyaW5nczogVGVtcGxhdGVTdHJpbmdzQXJyYXksIC4uLnZhbHVlczogdW5rbm93bltdKTogVGVtcGxhdGVSZXN1bHQ8VD4gPT4ge1xuICAgIC8vIFdhcm4gYWdhaW5zdCB0ZW1wbGF0ZXMgb2N0YWwgZXNjYXBlIHNlcXVlbmNlc1xuICAgIC8vIFdlIGRvIHRoaXMgaGVyZSByYXRoZXIgdGhhbiBpbiByZW5kZXIgc28gdGhhdCB0aGUgd2FybmluZyBpcyBjbG9zZXIgdG8gdGhlXG4gICAgLy8gdGVtcGxhdGUgZGVmaW5pdGlvbi5cbiAgICBpZiAoREVWX01PREUgJiYgc3RyaW5ncy5zb21lKChzKSA9PiBzID09PSB1bmRlZmluZWQpKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICdTb21lIHRlbXBsYXRlIHN0cmluZ3MgYXJlIHVuZGVmaW5lZC5cXG4nICtcbiAgICAgICAgICAnVGhpcyBpcyBwcm9iYWJseSBjYXVzZWQgYnkgaWxsZWdhbCBvY3RhbCBlc2NhcGUgc2VxdWVuY2VzLidcbiAgICAgICk7XG4gICAgfVxuICAgIGlmIChERVZfTU9ERSkge1xuICAgICAgLy8gSW1wb3J0IHN0YXRpYy1odG1sLmpzIHJlc3VsdHMgaW4gYSBjaXJjdWxhciBkZXBlbmRlbmN5IHdoaWNoIGczIGRvZXNuJ3RcbiAgICAgIC8vIGhhbmRsZS4gSW5zdGVhZCB3ZSBrbm93IHRoYXQgc3RhdGljIHZhbHVlcyBtdXN0IGhhdmUgdGhlIGZpZWxkXG4gICAgICAvLyBgXyRsaXRTdGF0aWMkYC5cbiAgICAgIGlmIChcbiAgICAgICAgdmFsdWVzLnNvbWUoKHZhbCkgPT4gKHZhbCBhcyB7XyRsaXRTdGF0aWMkOiB1bmtub3dufSk/LlsnXyRsaXRTdGF0aWMkJ10pXG4gICAgICApIHtcbiAgICAgICAgaXNzdWVXYXJuaW5nKFxuICAgICAgICAgICcnLFxuICAgICAgICAgIGBTdGF0aWMgdmFsdWVzICdsaXRlcmFsJyBvciAndW5zYWZlU3RhdGljJyBjYW5ub3QgYmUgdXNlZCBhcyB2YWx1ZXMgdG8gbm9uLXN0YXRpYyB0ZW1wbGF0ZXMuXFxuYCArXG4gICAgICAgICAgICBgUGxlYXNlIHVzZSB0aGUgc3RhdGljICdodG1sJyB0YWcgZnVuY3Rpb24uIFNlZSBodHRwczovL2xpdC5kZXYvZG9jcy90ZW1wbGF0ZXMvZXhwcmVzc2lvbnMvI3N0YXRpYy1leHByZXNzaW9uc2BcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgICBbJ18kbGl0VHlwZSQnXTogdHlwZSxcbiAgICAgIHN0cmluZ3MsXG4gICAgICB2YWx1ZXMsXG4gICAgfTtcbiAgfTtcblxuLyoqXG4gKiBJbnRlcnByZXRzIGEgdGVtcGxhdGUgbGl0ZXJhbCBhcyBhbiBIVE1MIHRlbXBsYXRlIHRoYXQgY2FuIGVmZmljaWVudGx5XG4gKiByZW5kZXIgdG8gYW5kIHVwZGF0ZSBhIGNvbnRhaW5lci5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgaGVhZGVyID0gKHRpdGxlOiBzdHJpbmcpID0+IGh0bWxgPGgxPiR7dGl0bGV9PC9oMT5gO1xuICogYGBgXG4gKlxuICogVGhlIGBodG1sYCB0YWcgcmV0dXJucyBhIGRlc2NyaXB0aW9uIG9mIHRoZSBET00gdG8gcmVuZGVyIGFzIGEgdmFsdWUuIEl0IGlzXG4gKiBsYXp5LCBtZWFuaW5nIG5vIHdvcmsgaXMgZG9uZSB1bnRpbCB0aGUgdGVtcGxhdGUgaXMgcmVuZGVyZWQuIFdoZW4gcmVuZGVyaW5nLFxuICogaWYgYSB0ZW1wbGF0ZSBjb21lcyBmcm9tIHRoZSBzYW1lIGV4cHJlc3Npb24gYXMgYSBwcmV2aW91c2x5IHJlbmRlcmVkIHJlc3VsdCxcbiAqIGl0J3MgZWZmaWNpZW50bHkgdXBkYXRlZCBpbnN0ZWFkIG9mIHJlcGxhY2VkLlxuICovXG5leHBvcnQgY29uc3QgaHRtbCA9IHRhZyhIVE1MX1JFU1VMVCk7XG5cbi8qKlxuICogSW50ZXJwcmV0cyBhIHRlbXBsYXRlIGxpdGVyYWwgYXMgYW4gU1ZHIGZyYWdtZW50IHRoYXQgY2FuIGVmZmljaWVudGx5IHJlbmRlclxuICogdG8gYW5kIHVwZGF0ZSBhIGNvbnRhaW5lci5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgcmVjdCA9IHN2Z2A8cmVjdCB3aWR0aD1cIjEwXCIgaGVpZ2h0PVwiMTBcIj48L3JlY3Q+YDtcbiAqXG4gKiBjb25zdCBteUltYWdlID0gaHRtbGBcbiAqICAgPHN2ZyB2aWV3Qm94PVwiMCAwIDEwIDEwXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPlxuICogICAgICR7cmVjdH1cbiAqICAgPC9zdmc+YDtcbiAqIGBgYFxuICpcbiAqIFRoZSBgc3ZnYCAqdGFnIGZ1bmN0aW9uKiBzaG91bGQgb25seSBiZSB1c2VkIGZvciBTVkcgZnJhZ21lbnRzLCBvciBlbGVtZW50c1xuICogdGhhdCB3b3VsZCBiZSBjb250YWluZWQgKippbnNpZGUqKiBhbiBgPHN2Zz5gIEhUTUwgZWxlbWVudC4gQSBjb21tb24gZXJyb3IgaXNcbiAqIHBsYWNpbmcgYW4gYDxzdmc+YCAqZWxlbWVudCogaW4gYSB0ZW1wbGF0ZSB0YWdnZWQgd2l0aCB0aGUgYHN2Z2AgdGFnXG4gKiBmdW5jdGlvbi4gVGhlIGA8c3ZnPmAgZWxlbWVudCBpcyBhbiBIVE1MIGVsZW1lbnQgYW5kIHNob3VsZCBiZSB1c2VkIHdpdGhpbiBhXG4gKiB0ZW1wbGF0ZSB0YWdnZWQgd2l0aCB0aGUge0BsaW5rY29kZSBodG1sfSB0YWcgZnVuY3Rpb24uXG4gKlxuICogSW4gTGl0RWxlbWVudCB1c2FnZSwgaXQncyBpbnZhbGlkIHRvIHJldHVybiBhbiBTVkcgZnJhZ21lbnQgZnJvbSB0aGVcbiAqIGByZW5kZXIoKWAgbWV0aG9kLCBhcyB0aGUgU1ZHIGZyYWdtZW50IHdpbGwgYmUgY29udGFpbmVkIHdpdGhpbiB0aGUgZWxlbWVudCdzXG4gKiBzaGFkb3cgcm9vdCBhbmQgdGh1cyBub3QgYmUgcHJvcGVybHkgY29udGFpbmVkIHdpdGhpbiBhbiBgPHN2Zz5gIEhUTUxcbiAqIGVsZW1lbnQuXG4gKi9cbmV4cG9ydCBjb25zdCBzdmcgPSB0YWcoU1ZHX1JFU1VMVCk7XG5cbi8qKlxuICogSW50ZXJwcmV0cyBhIHRlbXBsYXRlIGxpdGVyYWwgYXMgTWF0aE1MIGZyYWdtZW50IHRoYXQgY2FuIGVmZmljaWVudGx5IHJlbmRlclxuICogdG8gYW5kIHVwZGF0ZSBhIGNvbnRhaW5lci5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgbnVtID0gbWF0aG1sYDxtbj4xPC9tbj5gO1xuICpcbiAqIGNvbnN0IGVxID0gaHRtbGBcbiAqICAgPG1hdGg+XG4gKiAgICAgJHtudW19XG4gKiAgIDwvbWF0aD5gO1xuICogYGBgXG4gKlxuICogVGhlIGBtYXRobWxgICp0YWcgZnVuY3Rpb24qIHNob3VsZCBvbmx5IGJlIHVzZWQgZm9yIE1hdGhNTCBmcmFnbWVudHMsIG9yXG4gKiBlbGVtZW50cyB0aGF0IHdvdWxkIGJlIGNvbnRhaW5lZCAqKmluc2lkZSoqIGEgYDxtYXRoPmAgSFRNTCBlbGVtZW50LiBBIGNvbW1vblxuICogZXJyb3IgaXMgcGxhY2luZyBhIGA8bWF0aD5gICplbGVtZW50KiBpbiBhIHRlbXBsYXRlIHRhZ2dlZCB3aXRoIHRoZSBgbWF0aG1sYFxuICogdGFnIGZ1bmN0aW9uLiBUaGUgYDxtYXRoPmAgZWxlbWVudCBpcyBhbiBIVE1MIGVsZW1lbnQgYW5kIHNob3VsZCBiZSB1c2VkXG4gKiB3aXRoaW4gYSB0ZW1wbGF0ZSB0YWdnZWQgd2l0aCB0aGUge0BsaW5rY29kZSBodG1sfSB0YWcgZnVuY3Rpb24uXG4gKlxuICogSW4gTGl0RWxlbWVudCB1c2FnZSwgaXQncyBpbnZhbGlkIHRvIHJldHVybiBhbiBNYXRoTUwgZnJhZ21lbnQgZnJvbSB0aGVcbiAqIGByZW5kZXIoKWAgbWV0aG9kLCBhcyB0aGUgTWF0aE1MIGZyYWdtZW50IHdpbGwgYmUgY29udGFpbmVkIHdpdGhpbiB0aGVcbiAqIGVsZW1lbnQncyBzaGFkb3cgcm9vdCBhbmQgdGh1cyBub3QgYmUgcHJvcGVybHkgY29udGFpbmVkIHdpdGhpbiBhIGA8bWF0aD5gXG4gKiBIVE1MIGVsZW1lbnQuXG4gKi9cbmV4cG9ydCBjb25zdCBtYXRobWwgPSB0YWcoTUFUSE1MX1JFU1VMVCk7XG5cbi8qKlxuICogQSBzZW50aW5lbCB2YWx1ZSB0aGF0IHNpZ25hbHMgdGhhdCBhIHZhbHVlIHdhcyBoYW5kbGVkIGJ5IGEgZGlyZWN0aXZlIGFuZFxuICogc2hvdWxkIG5vdCBiZSB3cml0dGVuIHRvIHRoZSBET00uXG4gKi9cbmV4cG9ydCBjb25zdCBub0NoYW5nZSA9IFN5bWJvbC5mb3IoJ2xpdC1ub0NoYW5nZScpO1xuXG4vKipcbiAqIEEgc2VudGluZWwgdmFsdWUgdGhhdCBzaWduYWxzIGEgQ2hpbGRQYXJ0IHRvIGZ1bGx5IGNsZWFyIGl0cyBjb250ZW50LlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBidXR0b24gPSBodG1sYCR7XG4gKiAgdXNlci5pc0FkbWluXG4gKiAgICA/IGh0bWxgPGJ1dHRvbj5ERUxFVEU8L2J1dHRvbj5gXG4gKiAgICA6IG5vdGhpbmdcbiAqIH1gO1xuICogYGBgXG4gKlxuICogUHJlZmVyIHVzaW5nIGBub3RoaW5nYCBvdmVyIG90aGVyIGZhbHN5IHZhbHVlcyBhcyBpdCBwcm92aWRlcyBhIGNvbnNpc3RlbnRcbiAqIGJlaGF2aW9yIGJldHdlZW4gdmFyaW91cyBleHByZXNzaW9uIGJpbmRpbmcgY29udGV4dHMuXG4gKlxuICogSW4gY2hpbGQgZXhwcmVzc2lvbnMsIGB1bmRlZmluZWRgLCBgbnVsbGAsIGAnJ2AsIGFuZCBgbm90aGluZ2AgYWxsIGJlaGF2ZSB0aGVcbiAqIHNhbWUgYW5kIHJlbmRlciBubyBub2Rlcy4gSW4gYXR0cmlidXRlIGV4cHJlc3Npb25zLCBgbm90aGluZ2AgX3JlbW92ZXNfIHRoZVxuICogYXR0cmlidXRlLCB3aGlsZSBgdW5kZWZpbmVkYCBhbmQgYG51bGxgIHdpbGwgcmVuZGVyIGFuIGVtcHR5IHN0cmluZy4gSW5cbiAqIHByb3BlcnR5IGV4cHJlc3Npb25zIGBub3RoaW5nYCBiZWNvbWVzIGB1bmRlZmluZWRgLlxuICovXG5leHBvcnQgY29uc3Qgbm90aGluZyA9IFN5bWJvbC5mb3IoJ2xpdC1ub3RoaW5nJyk7XG5cbi8qKlxuICogVGhlIGNhY2hlIG9mIHByZXBhcmVkIHRlbXBsYXRlcywga2V5ZWQgYnkgdGhlIHRhZ2dlZCBUZW1wbGF0ZVN0cmluZ3NBcnJheVxuICogYW5kIF9ub3RfIGFjY291bnRpbmcgZm9yIHRoZSBzcGVjaWZpYyB0ZW1wbGF0ZSB0YWcgdXNlZC4gVGhpcyBtZWFucyB0aGF0XG4gKiB0ZW1wbGF0ZSB0YWdzIGNhbm5vdCBiZSBkeW5hbWljIC0gdGhleSBtdXN0IHN0YXRpY2FsbHkgYmUgb25lIG9mIGh0bWwsIHN2ZyxcbiAqIG9yIGF0dHIuIFRoaXMgcmVzdHJpY3Rpb24gc2ltcGxpZmllcyB0aGUgY2FjaGUgbG9va3VwLCB3aGljaCBpcyBvbiB0aGUgaG90XG4gKiBwYXRoIGZvciByZW5kZXJpbmcuXG4gKi9cbmNvbnN0IHRlbXBsYXRlQ2FjaGUgPSBuZXcgV2Vha01hcDxUZW1wbGF0ZVN0cmluZ3NBcnJheSwgVGVtcGxhdGU+KCk7XG5cbi8qKlxuICogT2JqZWN0IHNwZWNpZnlpbmcgb3B0aW9ucyBmb3IgY29udHJvbGxpbmcgbGl0LWh0bWwgcmVuZGVyaW5nLiBOb3RlIHRoYXRcbiAqIHdoaWxlIGByZW5kZXJgIG1heSBiZSBjYWxsZWQgbXVsdGlwbGUgdGltZXMgb24gdGhlIHNhbWUgYGNvbnRhaW5lcmAgKGFuZFxuICogYHJlbmRlckJlZm9yZWAgcmVmZXJlbmNlIG5vZGUpIHRvIGVmZmljaWVudGx5IHVwZGF0ZSB0aGUgcmVuZGVyZWQgY29udGVudCxcbiAqIG9ubHkgdGhlIG9wdGlvbnMgcGFzc2VkIGluIGR1cmluZyB0aGUgZmlyc3QgcmVuZGVyIGFyZSByZXNwZWN0ZWQgZHVyaW5nXG4gKiB0aGUgbGlmZXRpbWUgb2YgcmVuZGVycyB0byB0aGF0IHVuaXF1ZSBgY29udGFpbmVyYCArIGByZW5kZXJCZWZvcmVgXG4gKiBjb21iaW5hdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZW5kZXJPcHRpb25zIHtcbiAgLyoqXG4gICAqIEFuIG9iamVjdCB0byB1c2UgYXMgdGhlIGB0aGlzYCB2YWx1ZSBmb3IgZXZlbnQgbGlzdGVuZXJzLiBJdCdzIG9mdGVuXG4gICAqIHVzZWZ1bCB0byBzZXQgdGhpcyB0byB0aGUgaG9zdCBjb21wb25lbnQgcmVuZGVyaW5nIGEgdGVtcGxhdGUuXG4gICAqL1xuICBob3N0Pzogb2JqZWN0O1xuICAvKipcbiAgICogQSBET00gbm9kZSBiZWZvcmUgd2hpY2ggdG8gcmVuZGVyIGNvbnRlbnQgaW4gdGhlIGNvbnRhaW5lci5cbiAgICovXG4gIHJlbmRlckJlZm9yZT86IENoaWxkTm9kZSB8IG51bGw7XG4gIC8qKlxuICAgKiBOb2RlIHVzZWQgZm9yIGNsb25pbmcgdGhlIHRlbXBsYXRlIChgaW1wb3J0Tm9kZWAgd2lsbCBiZSBjYWxsZWQgb24gdGhpc1xuICAgKiBub2RlKS4gVGhpcyBjb250cm9scyB0aGUgYG93bmVyRG9jdW1lbnRgIG9mIHRoZSByZW5kZXJlZCBET00sIGFsb25nIHdpdGhcbiAgICogYW55IGluaGVyaXRlZCBjb250ZXh0LiBEZWZhdWx0cyB0byB0aGUgZ2xvYmFsIGBkb2N1bWVudGAuXG4gICAqL1xuICBjcmVhdGlvblNjb3BlPzoge2ltcG9ydE5vZGUobm9kZTogTm9kZSwgZGVlcD86IGJvb2xlYW4pOiBOb2RlfTtcbiAgLyoqXG4gICAqIFRoZSBpbml0aWFsIGNvbm5lY3RlZCBzdGF0ZSBmb3IgdGhlIHRvcC1sZXZlbCBwYXJ0IGJlaW5nIHJlbmRlcmVkLiBJZiBub1xuICAgKiBgaXNDb25uZWN0ZWRgIG9wdGlvbiBpcyBzZXQsIGBBc3luY0RpcmVjdGl2ZWBzIHdpbGwgYmUgY29ubmVjdGVkIGJ5XG4gICAqIGRlZmF1bHQuIFNldCB0byBgZmFsc2VgIGlmIHRoZSBpbml0aWFsIHJlbmRlciBvY2N1cnMgaW4gYSBkaXNjb25uZWN0ZWQgdHJlZVxuICAgKiBhbmQgYEFzeW5jRGlyZWN0aXZlYHMgc2hvdWxkIHNlZSBgaXNDb25uZWN0ZWQgPT09IGZhbHNlYCBmb3IgdGhlaXIgaW5pdGlhbFxuICAgKiByZW5kZXIuIFRoZSBgcGFydC5zZXRDb25uZWN0ZWQoKWAgbWV0aG9kIG11c3QgYmUgdXNlZCBzdWJzZXF1ZW50IHRvIGluaXRpYWxcbiAgICogcmVuZGVyIHRvIGNoYW5nZSB0aGUgY29ubmVjdGVkIHN0YXRlIG9mIHRoZSBwYXJ0LlxuICAgKi9cbiAgaXNDb25uZWN0ZWQ/OiBib29sZWFuO1xufVxuXG5jb25zdCB3YWxrZXIgPSBkLmNyZWF0ZVRyZWVXYWxrZXIoXG4gIGQsXG4gIDEyOSAvKiBOb2RlRmlsdGVyLlNIT1dfe0VMRU1FTlR8Q09NTUVOVH0gKi9cbik7XG5cbmxldCBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWw6IFNhbml0aXplckZhY3RvcnkgPSBub29wU2FuaXRpemVyO1xuXG4vL1xuLy8gQ2xhc3NlcyBvbmx5IGJlbG93IGhlcmUsIGNvbnN0IHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBvbmx5IGFib3ZlIGhlcmUuLi5cbi8vXG4vLyBLZWVwaW5nIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBhbmQgY2xhc3NlcyB0b2dldGhlciBpbXByb3ZlcyBtaW5pZmljYXRpb24uXG4vLyBJbnRlcmZhY2VzIGFuZCB0eXBlIGFsaWFzZXMgY2FuIGJlIGludGVybGVhdmVkIGZyZWVseS5cbi8vXG5cbi8vIFR5cGUgZm9yIGNsYXNzZXMgdGhhdCBoYXZlIGEgYF9kaXJlY3RpdmVgIG9yIGBfZGlyZWN0aXZlc1tdYCBmaWVsZCwgdXNlZCBieVxuLy8gYHJlc29sdmVEaXJlY3RpdmVgXG5leHBvcnQgaW50ZXJmYWNlIERpcmVjdGl2ZVBhcmVudCB7XG4gIF8kcGFyZW50PzogRGlyZWN0aXZlUGFyZW50O1xuICBfJGlzQ29ubmVjdGVkOiBib29sZWFuO1xuICBfX2RpcmVjdGl2ZT86IERpcmVjdGl2ZTtcbiAgX19kaXJlY3RpdmVzPzogQXJyYXk8RGlyZWN0aXZlIHwgdW5kZWZpbmVkPjtcbn1cblxuZnVuY3Rpb24gdHJ1c3RGcm9tVGVtcGxhdGVTdHJpbmcoXG4gIHRzYTogVGVtcGxhdGVTdHJpbmdzQXJyYXksXG4gIHN0cmluZ0Zyb21UU0E6IHN0cmluZ1xuKTogVHJ1c3RlZEhUTUwge1xuICAvLyBBIHNlY3VyaXR5IGNoZWNrIHRvIHByZXZlbnQgc3Bvb2Zpbmcgb2YgTGl0IHRlbXBsYXRlIHJlc3VsdHMuXG4gIC8vIEluIHRoZSBmdXR1cmUsIHdlIG1heSBiZSBhYmxlIHRvIHJlcGxhY2UgdGhpcyB3aXRoIEFycmF5LmlzVGVtcGxhdGVPYmplY3QsXG4gIC8vIHRob3VnaCB3ZSBtaWdodCBuZWVkIHRvIG1ha2UgdGhhdCBjaGVjayBpbnNpZGUgb2YgdGhlIGh0bWwgYW5kIHN2Z1xuICAvLyBmdW5jdGlvbnMsIGJlY2F1c2UgcHJlY29tcGlsZWQgdGVtcGxhdGVzIGRvbid0IGNvbWUgaW4gYXNcbiAgLy8gVGVtcGxhdGVTdHJpbmdBcnJheSBvYmplY3RzLlxuICBpZiAoIWlzQXJyYXkodHNhKSB8fCAhdHNhLmhhc093blByb3BlcnR5KCdyYXcnKSkge1xuICAgIGxldCBtZXNzYWdlID0gJ2ludmFsaWQgdGVtcGxhdGUgc3RyaW5ncyBhcnJheSc7XG4gICAgaWYgKERFVl9NT0RFKSB7XG4gICAgICBtZXNzYWdlID0gYFxuICAgICAgICAgIEludGVybmFsIEVycm9yOiBleHBlY3RlZCB0ZW1wbGF0ZSBzdHJpbmdzIHRvIGJlIGFuIGFycmF5XG4gICAgICAgICAgd2l0aCBhICdyYXcnIGZpZWxkLiBGYWtpbmcgYSB0ZW1wbGF0ZSBzdHJpbmdzIGFycmF5IGJ5XG4gICAgICAgICAgY2FsbGluZyBodG1sIG9yIHN2ZyBsaWtlIGFuIG9yZGluYXJ5IGZ1bmN0aW9uIGlzIGVmZmVjdGl2ZWx5XG4gICAgICAgICAgdGhlIHNhbWUgYXMgY2FsbGluZyB1bnNhZmVIdG1sIGFuZCBjYW4gbGVhZCB0byBtYWpvciBzZWN1cml0eVxuICAgICAgICAgIGlzc3VlcywgZS5nLiBvcGVuaW5nIHlvdXIgY29kZSB1cCB0byBYU1MgYXR0YWNrcy5cbiAgICAgICAgICBJZiB5b3UncmUgdXNpbmcgdGhlIGh0bWwgb3Igc3ZnIHRhZ2dlZCB0ZW1wbGF0ZSBmdW5jdGlvbnMgbm9ybWFsbHlcbiAgICAgICAgICBhbmQgc3RpbGwgc2VlaW5nIHRoaXMgZXJyb3IsIHBsZWFzZSBmaWxlIGEgYnVnIGF0XG4gICAgICAgICAgaHR0cHM6Ly9naXRodWIuY29tL2xpdC9saXQvaXNzdWVzL25ldz90ZW1wbGF0ZT1idWdfcmVwb3J0Lm1kXG4gICAgICAgICAgYW5kIGluY2x1ZGUgaW5mb3JtYXRpb24gYWJvdXQgeW91ciBidWlsZCB0b29saW5nLCBpZiBhbnkuXG4gICAgICAgIGBcbiAgICAgICAgLnRyaW0oKVxuICAgICAgICAucmVwbGFjZSgvXFxuICovZywgJ1xcbicpO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gIH1cbiAgcmV0dXJuIHBvbGljeSAhPT0gdW5kZWZpbmVkXG4gICAgPyBwb2xpY3kuY3JlYXRlSFRNTChzdHJpbmdGcm9tVFNBKVxuICAgIDogKHN0cmluZ0Zyb21UU0EgYXMgdW5rbm93biBhcyBUcnVzdGVkSFRNTCk7XG59XG5cbi8qKlxuICogUmV0dXJucyBhbiBIVE1MIHN0cmluZyBmb3IgdGhlIGdpdmVuIFRlbXBsYXRlU3RyaW5nc0FycmF5IGFuZCByZXN1bHQgdHlwZVxuICogKEhUTUwgb3IgU1ZHKSwgYWxvbmcgd2l0aCB0aGUgY2FzZS1zZW5zaXRpdmUgYm91bmQgYXR0cmlidXRlIG5hbWVzIGluXG4gKiB0ZW1wbGF0ZSBvcmRlci4gVGhlIEhUTUwgY29udGFpbnMgY29tbWVudCBtYXJrZXJzIGRlbm90aW5nIHRoZSBgQ2hpbGRQYXJ0YHNcbiAqIGFuZCBzdWZmaXhlcyBvbiBib3VuZCBhdHRyaWJ1dGVzIGRlbm90aW5nIHRoZSBgQXR0cmlidXRlUGFydHNgLlxuICpcbiAqIEBwYXJhbSBzdHJpbmdzIHRlbXBsYXRlIHN0cmluZ3MgYXJyYXlcbiAqIEBwYXJhbSB0eXBlIEhUTUwgb3IgU1ZHXG4gKiBAcmV0dXJuIEFycmF5IGNvbnRhaW5pbmcgYFtodG1sLCBhdHRyTmFtZXNdYCAoYXJyYXkgcmV0dXJuZWQgZm9yIHRlcnNlbmVzcyxcbiAqICAgICB0byBhdm9pZCBvYmplY3QgZmllbGRzIHNpbmNlIHRoaXMgY29kZSBpcyBzaGFyZWQgd2l0aCBub24tbWluaWZpZWQgU1NSXG4gKiAgICAgY29kZSlcbiAqL1xuY29uc3QgZ2V0VGVtcGxhdGVIdG1sID0gKFxuICBzdHJpbmdzOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSxcbiAgdHlwZTogUmVzdWx0VHlwZVxuKTogW1RydXN0ZWRIVE1MLCBBcnJheTxzdHJpbmc+XSA9PiB7XG4gIC8vIEluc2VydCBtYWtlcnMgaW50byB0aGUgdGVtcGxhdGUgSFRNTCB0byByZXByZXNlbnQgdGhlIHBvc2l0aW9uIG9mXG4gIC8vIGJpbmRpbmdzLiBUaGUgZm9sbG93aW5nIGNvZGUgc2NhbnMgdGhlIHRlbXBsYXRlIHN0cmluZ3MgdG8gZGV0ZXJtaW5lIHRoZVxuICAvLyBzeW50YWN0aWMgcG9zaXRpb24gb2YgdGhlIGJpbmRpbmdzLiBUaGV5IGNhbiBiZSBpbiB0ZXh0IHBvc2l0aW9uLCB3aGVyZVxuICAvLyB3ZSBpbnNlcnQgYW4gSFRNTCBjb21tZW50LCBhdHRyaWJ1dGUgdmFsdWUgcG9zaXRpb24sIHdoZXJlIHdlIGluc2VydCBhXG4gIC8vIHNlbnRpbmVsIHN0cmluZyBhbmQgcmUtd3JpdGUgdGhlIGF0dHJpYnV0ZSBuYW1lLCBvciBpbnNpZGUgYSB0YWcgd2hlcmVcbiAgLy8gd2UgaW5zZXJ0IHRoZSBzZW50aW5lbCBzdHJpbmcuXG4gIGNvbnN0IGwgPSBzdHJpbmdzLmxlbmd0aCAtIDE7XG4gIC8vIFN0b3JlcyB0aGUgY2FzZS1zZW5zaXRpdmUgYm91bmQgYXR0cmlidXRlIG5hbWVzIGluIHRoZSBvcmRlciBvZiB0aGVpclxuICAvLyBwYXJ0cy4gRWxlbWVudFBhcnRzIGFyZSBhbHNvIHJlZmxlY3RlZCBpbiB0aGlzIGFycmF5IGFzIHVuZGVmaW5lZFxuICAvLyByYXRoZXIgdGhhbiBhIHN0cmluZywgdG8gZGlzYW1iaWd1YXRlIGZyb20gYXR0cmlidXRlIGJpbmRpbmdzLlxuICBjb25zdCBhdHRyTmFtZXM6IEFycmF5PHN0cmluZz4gPSBbXTtcbiAgbGV0IGh0bWwgPVxuICAgIHR5cGUgPT09IFNWR19SRVNVTFQgPyAnPHN2Zz4nIDogdHlwZSA9PT0gTUFUSE1MX1JFU1VMVCA/ICc8bWF0aD4nIDogJyc7XG5cbiAgLy8gV2hlbiB3ZSdyZSBpbnNpZGUgYSByYXcgdGV4dCB0YWcgKG5vdCBpdCdzIHRleHQgY29udGVudCksIHRoZSByZWdleFxuICAvLyB3aWxsIHN0aWxsIGJlIHRhZ1JlZ2V4IHNvIHdlIGNhbiBmaW5kIGF0dHJpYnV0ZXMsIGJ1dCB3aWxsIHN3aXRjaCB0b1xuICAvLyB0aGlzIHJlZ2V4IHdoZW4gdGhlIHRhZyBlbmRzLlxuICBsZXQgcmF3VGV4dEVuZFJlZ2V4OiBSZWdFeHAgfCB1bmRlZmluZWQ7XG5cbiAgLy8gVGhlIGN1cnJlbnQgcGFyc2luZyBzdGF0ZSwgcmVwcmVzZW50ZWQgYXMgYSByZWZlcmVuY2UgdG8gb25lIG9mIHRoZVxuICAvLyByZWdleGVzXG4gIGxldCByZWdleCA9IHRleHRFbmRSZWdleDtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgIGNvbnN0IHMgPSBzdHJpbmdzW2ldO1xuICAgIC8vIFRoZSBpbmRleCBvZiB0aGUgZW5kIG9mIHRoZSBsYXN0IGF0dHJpYnV0ZSBuYW1lLiBXaGVuIHRoaXMgaXNcbiAgICAvLyBwb3NpdGl2ZSBhdCBlbmQgb2YgYSBzdHJpbmcsIGl0IG1lYW5zIHdlJ3JlIGluIGFuIGF0dHJpYnV0ZSB2YWx1ZVxuICAgIC8vIHBvc2l0aW9uIGFuZCBuZWVkIHRvIHJld3JpdGUgdGhlIGF0dHJpYnV0ZSBuYW1lLlxuICAgIC8vIFdlIGFsc28gdXNlIGEgc3BlY2lhbCB2YWx1ZSBvZiAtMiB0byBpbmRpY2F0ZSB0aGF0IHdlIGVuY291bnRlcmVkXG4gICAgLy8gdGhlIGVuZCBvZiBhIHN0cmluZyBpbiBhdHRyaWJ1dGUgbmFtZSBwb3NpdGlvbi5cbiAgICBsZXQgYXR0ck5hbWVFbmRJbmRleCA9IC0xO1xuICAgIGxldCBhdHRyTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIGxldCBsYXN0SW5kZXggPSAwO1xuICAgIGxldCBtYXRjaCE6IFJlZ0V4cEV4ZWNBcnJheSB8IG51bGw7XG5cbiAgICAvLyBUaGUgY29uZGl0aW9ucyBpbiB0aGlzIGxvb3AgaGFuZGxlIHRoZSBjdXJyZW50IHBhcnNlIHN0YXRlLCBhbmQgdGhlXG4gICAgLy8gYXNzaWdubWVudHMgdG8gdGhlIGByZWdleGAgdmFyaWFibGUgYXJlIHRoZSBzdGF0ZSB0cmFuc2l0aW9ucy5cbiAgICB3aGlsZSAobGFzdEluZGV4IDwgcy5sZW5ndGgpIHtcbiAgICAgIC8vIE1ha2Ugc3VyZSB3ZSBzdGFydCBzZWFyY2hpbmcgZnJvbSB3aGVyZSB3ZSBwcmV2aW91c2x5IGxlZnQgb2ZmXG4gICAgICByZWdleC5sYXN0SW5kZXggPSBsYXN0SW5kZXg7XG4gICAgICBtYXRjaCA9IHJlZ2V4LmV4ZWMocyk7XG4gICAgICBpZiAobWF0Y2ggPT09IG51bGwpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBsYXN0SW5kZXggPSByZWdleC5sYXN0SW5kZXg7XG4gICAgICBpZiAocmVnZXggPT09IHRleHRFbmRSZWdleCkge1xuICAgICAgICBpZiAobWF0Y2hbQ09NTUVOVF9TVEFSVF0gPT09ICchLS0nKSB7XG4gICAgICAgICAgcmVnZXggPSBjb21tZW50RW5kUmVnZXg7XG4gICAgICAgIH0gZWxzZSBpZiAobWF0Y2hbQ09NTUVOVF9TVEFSVF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIFdlIHN0YXJ0ZWQgYSB3ZWlyZCBjb21tZW50LCBsaWtlIDwve1xuICAgICAgICAgIHJlZ2V4ID0gY29tbWVudDJFbmRSZWdleDtcbiAgICAgICAgfSBlbHNlIGlmIChtYXRjaFtUQUdfTkFNRV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmIChyYXdUZXh0RWxlbWVudC50ZXN0KG1hdGNoW1RBR19OQU1FXSkpIHtcbiAgICAgICAgICAgIC8vIFJlY29yZCBpZiB3ZSBlbmNvdW50ZXIgYSByYXctdGV4dCBlbGVtZW50LiBXZSdsbCBzd2l0Y2ggdG9cbiAgICAgICAgICAgIC8vIHRoaXMgcmVnZXggYXQgdGhlIGVuZCBvZiB0aGUgdGFnLlxuICAgICAgICAgICAgcmF3VGV4dEVuZFJlZ2V4ID0gbmV3IFJlZ0V4cChgPC8ke21hdGNoW1RBR19OQU1FXX1gLCAnZycpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZWdleCA9IHRhZ0VuZFJlZ2V4O1xuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoW0RZTkFNSUNfVEFHX05BTUVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAoREVWX01PREUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgJ0JpbmRpbmdzIGluIHRhZyBuYW1lcyBhcmUgbm90IHN1cHBvcnRlZC4gUGxlYXNlIHVzZSBzdGF0aWMgdGVtcGxhdGVzIGluc3RlYWQuICcgK1xuICAgICAgICAgICAgICAgICdTZWUgaHR0cHM6Ly9saXQuZGV2L2RvY3MvdGVtcGxhdGVzL2V4cHJlc3Npb25zLyNzdGF0aWMtZXhwcmVzc2lvbnMnXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZWdleCA9IHRhZ0VuZFJlZ2V4O1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHJlZ2V4ID09PSB0YWdFbmRSZWdleCkge1xuICAgICAgICBpZiAobWF0Y2hbRU5USVJFX01BVENIXSA9PT0gJz4nKSB7XG4gICAgICAgICAgLy8gRW5kIG9mIGEgdGFnLiBJZiB3ZSBoYWQgc3RhcnRlZCBhIHJhdy10ZXh0IGVsZW1lbnQsIHVzZSB0aGF0XG4gICAgICAgICAgLy8gcmVnZXhcbiAgICAgICAgICByZWdleCA9IHJhd1RleHRFbmRSZWdleCA/PyB0ZXh0RW5kUmVnZXg7XG4gICAgICAgICAgLy8gV2UgbWF5IGJlIGVuZGluZyBhbiB1bnF1b3RlZCBhdHRyaWJ1dGUgdmFsdWUsIHNvIG1ha2Ugc3VyZSB3ZVxuICAgICAgICAgIC8vIGNsZWFyIGFueSBwZW5kaW5nIGF0dHJOYW1lRW5kSW5kZXhcbiAgICAgICAgICBhdHRyTmFtZUVuZEluZGV4ID0gLTE7XG4gICAgICAgIH0gZWxzZSBpZiAobWF0Y2hbQVRUUklCVVRFX05BTUVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBBdHRyaWJ1dGUgbmFtZSBwb3NpdGlvblxuICAgICAgICAgIGF0dHJOYW1lRW5kSW5kZXggPSAtMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhdHRyTmFtZUVuZEluZGV4ID0gcmVnZXgubGFzdEluZGV4IC0gbWF0Y2hbU1BBQ0VTX0FORF9FUVVBTFNdLmxlbmd0aDtcbiAgICAgICAgICBhdHRyTmFtZSA9IG1hdGNoW0FUVFJJQlVURV9OQU1FXTtcbiAgICAgICAgICByZWdleCA9XG4gICAgICAgICAgICBtYXRjaFtRVU9URV9DSEFSXSA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgID8gdGFnRW5kUmVnZXhcbiAgICAgICAgICAgICAgOiBtYXRjaFtRVU9URV9DSEFSXSA9PT0gJ1wiJ1xuICAgICAgICAgICAgICAgID8gZG91YmxlUXVvdGVBdHRyRW5kUmVnZXhcbiAgICAgICAgICAgICAgICA6IHNpbmdsZVF1b3RlQXR0ckVuZFJlZ2V4O1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKFxuICAgICAgICByZWdleCA9PT0gZG91YmxlUXVvdGVBdHRyRW5kUmVnZXggfHxcbiAgICAgICAgcmVnZXggPT09IHNpbmdsZVF1b3RlQXR0ckVuZFJlZ2V4XG4gICAgICApIHtcbiAgICAgICAgcmVnZXggPSB0YWdFbmRSZWdleDtcbiAgICAgIH0gZWxzZSBpZiAocmVnZXggPT09IGNvbW1lbnRFbmRSZWdleCB8fCByZWdleCA9PT0gY29tbWVudDJFbmRSZWdleCkge1xuICAgICAgICByZWdleCA9IHRleHRFbmRSZWdleDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE5vdCBvbmUgb2YgdGhlIGZpdmUgc3RhdGUgcmVnZXhlcywgc28gaXQgbXVzdCBiZSB0aGUgZHluYW1pY2FsbHlcbiAgICAgICAgLy8gY3JlYXRlZCByYXcgdGV4dCByZWdleCBhbmQgd2UncmUgYXQgdGhlIGNsb3NlIG9mIHRoYXQgZWxlbWVudC5cbiAgICAgICAgcmVnZXggPSB0YWdFbmRSZWdleDtcbiAgICAgICAgcmF3VGV4dEVuZFJlZ2V4ID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChERVZfTU9ERSkge1xuICAgICAgLy8gSWYgd2UgaGF2ZSBhIGF0dHJOYW1lRW5kSW5kZXgsIHdoaWNoIGluZGljYXRlcyB0aGF0IHdlIHNob3VsZFxuICAgICAgLy8gcmV3cml0ZSB0aGUgYXR0cmlidXRlIG5hbWUsIGFzc2VydCB0aGF0IHdlJ3JlIGluIGEgdmFsaWQgYXR0cmlidXRlXG4gICAgICAvLyBwb3NpdGlvbiAtIGVpdGhlciBpbiBhIHRhZywgb3IgYSBxdW90ZWQgYXR0cmlidXRlIHZhbHVlLlxuICAgICAgY29uc29sZS5hc3NlcnQoXG4gICAgICAgIGF0dHJOYW1lRW5kSW5kZXggPT09IC0xIHx8XG4gICAgICAgICAgcmVnZXggPT09IHRhZ0VuZFJlZ2V4IHx8XG4gICAgICAgICAgcmVnZXggPT09IHNpbmdsZVF1b3RlQXR0ckVuZFJlZ2V4IHx8XG4gICAgICAgICAgcmVnZXggPT09IGRvdWJsZVF1b3RlQXR0ckVuZFJlZ2V4LFxuICAgICAgICAndW5leHBlY3RlZCBwYXJzZSBzdGF0ZSBCJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyBXZSBoYXZlIGZvdXIgY2FzZXM6XG4gICAgLy8gIDEuIFdlJ3JlIGluIHRleHQgcG9zaXRpb24sIGFuZCBub3QgaW4gYSByYXcgdGV4dCBlbGVtZW50XG4gICAgLy8gICAgIChyZWdleCA9PT0gdGV4dEVuZFJlZ2V4KTogaW5zZXJ0IGEgY29tbWVudCBtYXJrZXIuXG4gICAgLy8gIDIuIFdlIGhhdmUgYSBub24tbmVnYXRpdmUgYXR0ck5hbWVFbmRJbmRleCB3aGljaCBtZWFucyB3ZSBuZWVkIHRvXG4gICAgLy8gICAgIHJld3JpdGUgdGhlIGF0dHJpYnV0ZSBuYW1lIHRvIGFkZCBhIGJvdW5kIGF0dHJpYnV0ZSBzdWZmaXguXG4gICAgLy8gIDMuIFdlJ3JlIGF0IHRoZSBub24tZmlyc3QgYmluZGluZyBpbiBhIG11bHRpLWJpbmRpbmcgYXR0cmlidXRlLCB1c2UgYVxuICAgIC8vICAgICBwbGFpbiBtYXJrZXIuXG4gICAgLy8gIDQuIFdlJ3JlIHNvbWV3aGVyZSBlbHNlIGluc2lkZSB0aGUgdGFnLiBJZiB3ZSdyZSBpbiBhdHRyaWJ1dGUgbmFtZVxuICAgIC8vICAgICBwb3NpdGlvbiAoYXR0ck5hbWVFbmRJbmRleCA9PT0gLTIpLCBhZGQgYSBzZXF1ZW50aWFsIHN1ZmZpeCB0b1xuICAgIC8vICAgICBnZW5lcmF0ZSBhIHVuaXF1ZSBhdHRyaWJ1dGUgbmFtZS5cblxuICAgIC8vIERldGVjdCBhIGJpbmRpbmcgbmV4dCB0byBzZWxmLWNsb3NpbmcgdGFnIGVuZCBhbmQgaW5zZXJ0IGEgc3BhY2UgdG9cbiAgICAvLyBzZXBhcmF0ZSB0aGUgbWFya2VyIGZyb20gdGhlIHRhZyBlbmQ6XG4gICAgY29uc3QgZW5kID1cbiAgICAgIHJlZ2V4ID09PSB0YWdFbmRSZWdleCAmJiBzdHJpbmdzW2kgKyAxXS5zdGFydHNXaXRoKCcvPicpID8gJyAnIDogJyc7XG4gICAgaHRtbCArPVxuICAgICAgcmVnZXggPT09IHRleHRFbmRSZWdleFxuICAgICAgICA/IHMgKyBub2RlTWFya2VyXG4gICAgICAgIDogYXR0ck5hbWVFbmRJbmRleCA+PSAwXG4gICAgICAgICAgPyAoYXR0ck5hbWVzLnB1c2goYXR0ck5hbWUhKSxcbiAgICAgICAgICAgIHMuc2xpY2UoMCwgYXR0ck5hbWVFbmRJbmRleCkgK1xuICAgICAgICAgICAgICBib3VuZEF0dHJpYnV0ZVN1ZmZpeCArXG4gICAgICAgICAgICAgIHMuc2xpY2UoYXR0ck5hbWVFbmRJbmRleCkpICtcbiAgICAgICAgICAgIG1hcmtlciArXG4gICAgICAgICAgICBlbmRcbiAgICAgICAgICA6IHMgKyBtYXJrZXIgKyAoYXR0ck5hbWVFbmRJbmRleCA9PT0gLTIgPyBpIDogZW5kKTtcbiAgfVxuXG4gIGNvbnN0IGh0bWxSZXN1bHQ6IHN0cmluZyB8IFRydXN0ZWRIVE1MID1cbiAgICBodG1sICtcbiAgICAoc3RyaW5nc1tsXSB8fCAnPD8+JykgK1xuICAgICh0eXBlID09PSBTVkdfUkVTVUxUID8gJzwvc3ZnPicgOiB0eXBlID09PSBNQVRITUxfUkVTVUxUID8gJzwvbWF0aD4nIDogJycpO1xuXG4gIC8vIFJldHVybmVkIGFzIGFuIGFycmF5IGZvciB0ZXJzZW5lc3NcbiAgcmV0dXJuIFt0cnVzdEZyb21UZW1wbGF0ZVN0cmluZyhzdHJpbmdzLCBodG1sUmVzdWx0KSwgYXR0ck5hbWVzXTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIHtUZW1wbGF0ZX07XG5jbGFzcyBUZW1wbGF0ZSB7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgZWwhOiBIVE1MVGVtcGxhdGVFbGVtZW50O1xuXG4gIHBhcnRzOiBBcnJheTxUZW1wbGF0ZVBhcnQ+ID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICB7c3RyaW5ncywgWydfJGxpdFR5cGUkJ106IHR5cGV9OiBVbmNvbXBpbGVkVGVtcGxhdGVSZXN1bHQsXG4gICAgb3B0aW9ucz86IFJlbmRlck9wdGlvbnNcbiAgKSB7XG4gICAgbGV0IG5vZGU6IE5vZGUgfCBudWxsO1xuICAgIGxldCBub2RlSW5kZXggPSAwO1xuICAgIGxldCBhdHRyTmFtZUluZGV4ID0gMDtcbiAgICBjb25zdCBwYXJ0Q291bnQgPSBzdHJpbmdzLmxlbmd0aCAtIDE7XG4gICAgY29uc3QgcGFydHMgPSB0aGlzLnBhcnRzO1xuXG4gICAgLy8gQ3JlYXRlIHRlbXBsYXRlIGVsZW1lbnRcbiAgICBjb25zdCBbaHRtbCwgYXR0ck5hbWVzXSA9IGdldFRlbXBsYXRlSHRtbChzdHJpbmdzLCB0eXBlKTtcbiAgICB0aGlzLmVsID0gVGVtcGxhdGUuY3JlYXRlRWxlbWVudChodG1sLCBvcHRpb25zKTtcbiAgICB3YWxrZXIuY3VycmVudE5vZGUgPSB0aGlzLmVsLmNvbnRlbnQ7XG5cbiAgICAvLyBSZS1wYXJlbnQgU1ZHIG9yIE1hdGhNTCBub2RlcyBpbnRvIHRlbXBsYXRlIHJvb3RcbiAgICBpZiAodHlwZSA9PT0gU1ZHX1JFU1VMVCB8fCB0eXBlID09PSBNQVRITUxfUkVTVUxUKSB7XG4gICAgICBjb25zdCB3cmFwcGVyID0gdGhpcy5lbC5jb250ZW50LmZpcnN0Q2hpbGQhO1xuICAgICAgd3JhcHBlci5yZXBsYWNlV2l0aCguLi53cmFwcGVyLmNoaWxkTm9kZXMpO1xuICAgIH1cblxuICAgIC8vIFdhbGsgdGhlIHRlbXBsYXRlIHRvIGZpbmQgYmluZGluZyBtYXJrZXJzIGFuZCBjcmVhdGUgVGVtcGxhdGVQYXJ0c1xuICAgIHdoaWxlICgobm9kZSA9IHdhbGtlci5uZXh0Tm9kZSgpKSAhPT0gbnVsbCAmJiBwYXJ0cy5sZW5ndGggPCBwYXJ0Q291bnQpIHtcbiAgICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIGlmIChERVZfTU9ERSkge1xuICAgICAgICAgIGNvbnN0IHRhZyA9IChub2RlIGFzIEVsZW1lbnQpLmxvY2FsTmFtZTtcbiAgICAgICAgICAvLyBXYXJuIGlmIGB0ZXh0YXJlYWAgaW5jbHVkZXMgYW4gZXhwcmVzc2lvbiBhbmQgdGhyb3cgaWYgYHRlbXBsYXRlYFxuICAgICAgICAgIC8vIGRvZXMgc2luY2UgdGhlc2UgYXJlIG5vdCBzdXBwb3J0ZWQuIFdlIGRvIHRoaXMgYnkgY2hlY2tpbmdcbiAgICAgICAgICAvLyBpbm5lckhUTUwgZm9yIGFueXRoaW5nIHRoYXQgbG9va3MgbGlrZSBhIG1hcmtlci4gVGhpcyBjYXRjaGVzXG4gICAgICAgICAgLy8gY2FzZXMgbGlrZSBiaW5kaW5ncyBpbiB0ZXh0YXJlYSB0aGVyZSBtYXJrZXJzIHR1cm4gaW50byB0ZXh0IG5vZGVzLlxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIC9eKD86dGV4dGFyZWF8dGVtcGxhdGUpJC9pIS50ZXN0KHRhZykgJiZcbiAgICAgICAgICAgIChub2RlIGFzIEVsZW1lbnQpLmlubmVySFRNTC5pbmNsdWRlcyhtYXJrZXIpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBjb25zdCBtID1cbiAgICAgICAgICAgICAgYEV4cHJlc3Npb25zIGFyZSBub3Qgc3VwcG9ydGVkIGluc2lkZSBcXGAke3RhZ31cXGAgYCArXG4gICAgICAgICAgICAgIGBlbGVtZW50cy4gU2VlIGh0dHBzOi8vbGl0LmRldi9tc2cvZXhwcmVzc2lvbi1pbi0ke3RhZ30gZm9yIG1vcmUgYCArXG4gICAgICAgICAgICAgIGBpbmZvcm1hdGlvbi5gO1xuICAgICAgICAgICAgaWYgKHRhZyA9PT0gJ3RlbXBsYXRlJykge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobSk7XG4gICAgICAgICAgICB9IGVsc2UgaXNzdWVXYXJuaW5nKCcnLCBtKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETyAoanVzdGluZmFnbmFuaSk6IGZvciBhdHRlbXB0ZWQgZHluYW1pYyB0YWcgbmFtZXMsIHdlIGRvbid0XG4gICAgICAgIC8vIGluY3JlbWVudCB0aGUgYmluZGluZ0luZGV4LCBhbmQgaXQnbGwgYmUgb2ZmIGJ5IDEgaW4gdGhlIGVsZW1lbnRcbiAgICAgICAgLy8gYW5kIG9mZiBieSB0d28gYWZ0ZXIgaXQuXG4gICAgICAgIGlmICgobm9kZSBhcyBFbGVtZW50KS5oYXNBdHRyaWJ1dGVzKCkpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgKG5vZGUgYXMgRWxlbWVudCkuZ2V0QXR0cmlidXRlTmFtZXMoKSkge1xuICAgICAgICAgICAgaWYgKG5hbWUuZW5kc1dpdGgoYm91bmRBdHRyaWJ1dGVTdWZmaXgpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHJlYWxOYW1lID0gYXR0ck5hbWVzW2F0dHJOYW1lSW5kZXgrK107XG4gICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gKG5vZGUgYXMgRWxlbWVudCkuZ2V0QXR0cmlidXRlKG5hbWUpITtcbiAgICAgICAgICAgICAgY29uc3Qgc3RhdGljcyA9IHZhbHVlLnNwbGl0KG1hcmtlcik7XG4gICAgICAgICAgICAgIGNvbnN0IG0gPSAvKFsuP0BdKT8oLiopLy5leGVjKHJlYWxOYW1lKSE7XG4gICAgICAgICAgICAgIHBhcnRzLnB1c2goe1xuICAgICAgICAgICAgICAgIHR5cGU6IEFUVFJJQlVURV9QQVJULFxuICAgICAgICAgICAgICAgIGluZGV4OiBub2RlSW5kZXgsXG4gICAgICAgICAgICAgICAgbmFtZTogbVsyXSxcbiAgICAgICAgICAgICAgICBzdHJpbmdzOiBzdGF0aWNzLFxuICAgICAgICAgICAgICAgIGN0b3I6XG4gICAgICAgICAgICAgICAgICBtWzFdID09PSAnLidcbiAgICAgICAgICAgICAgICAgICAgPyBQcm9wZXJ0eVBhcnRcbiAgICAgICAgICAgICAgICAgICAgOiBtWzFdID09PSAnPydcbiAgICAgICAgICAgICAgICAgICAgICA/IEJvb2xlYW5BdHRyaWJ1dGVQYXJ0XG4gICAgICAgICAgICAgICAgICAgICAgOiBtWzFdID09PSAnQCdcbiAgICAgICAgICAgICAgICAgICAgICAgID8gRXZlbnRQYXJ0XG4gICAgICAgICAgICAgICAgICAgICAgICA6IEF0dHJpYnV0ZVBhcnQsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAobm9kZSBhcyBFbGVtZW50KS5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG5hbWUuc3RhcnRzV2l0aChtYXJrZXIpKSB7XG4gICAgICAgICAgICAgIHBhcnRzLnB1c2goe1xuICAgICAgICAgICAgICAgIHR5cGU6IEVMRU1FTlRfUEFSVCxcbiAgICAgICAgICAgICAgICBpbmRleDogbm9kZUluZGV4LFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgKG5vZGUgYXMgRWxlbWVudCkucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPIChqdXN0aW5mYWduYW5pKTogYmVuY2htYXJrIHRoZSByZWdleCBhZ2FpbnN0IHRlc3RpbmcgZm9yIGVhY2hcbiAgICAgICAgLy8gb2YgdGhlIDMgcmF3IHRleHQgZWxlbWVudCBuYW1lcy5cbiAgICAgICAgaWYgKHJhd1RleHRFbGVtZW50LnRlc3QoKG5vZGUgYXMgRWxlbWVudCkudGFnTmFtZSkpIHtcbiAgICAgICAgICAvLyBGb3IgcmF3IHRleHQgZWxlbWVudHMgd2UgbmVlZCB0byBzcGxpdCB0aGUgdGV4dCBjb250ZW50IG9uXG4gICAgICAgICAgLy8gbWFya2VycywgY3JlYXRlIGEgVGV4dCBub2RlIGZvciBlYWNoIHNlZ21lbnQsIGFuZCBjcmVhdGVcbiAgICAgICAgICAvLyBhIFRlbXBsYXRlUGFydCBmb3IgZWFjaCBtYXJrZXIuXG4gICAgICAgICAgY29uc3Qgc3RyaW5ncyA9IChub2RlIGFzIEVsZW1lbnQpLnRleHRDb250ZW50IS5zcGxpdChtYXJrZXIpO1xuICAgICAgICAgIGNvbnN0IGxhc3RJbmRleCA9IHN0cmluZ3MubGVuZ3RoIC0gMTtcbiAgICAgICAgICBpZiAobGFzdEluZGV4ID4gMCkge1xuICAgICAgICAgICAgKG5vZGUgYXMgRWxlbWVudCkudGV4dENvbnRlbnQgPSB0cnVzdGVkVHlwZXNcbiAgICAgICAgICAgICAgPyAodHJ1c3RlZFR5cGVzLmVtcHR5U2NyaXB0IGFzIHVua25vd24gYXMgJycpXG4gICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICAvLyBHZW5lcmF0ZSBhIG5ldyB0ZXh0IG5vZGUgZm9yIGVhY2ggbGl0ZXJhbCBzZWN0aW9uXG4gICAgICAgICAgICAvLyBUaGVzZSBub2RlcyBhcmUgYWxzbyB1c2VkIGFzIHRoZSBtYXJrZXJzIGZvciBub2RlIHBhcnRzXG4gICAgICAgICAgICAvLyBXZSBjYW4ndCB1c2UgZW1wdHkgdGV4dCBub2RlcyBhcyBtYXJrZXJzIGJlY2F1c2UgdGhleSdyZVxuICAgICAgICAgICAgLy8gbm9ybWFsaXplZCB3aGVuIGNsb25pbmcgaW4gSUUgKGNvdWxkIHNpbXBsaWZ5IHdoZW5cbiAgICAgICAgICAgIC8vIElFIGlzIG5vIGxvbmdlciBzdXBwb3J0ZWQpXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxhc3RJbmRleDsgaSsrKSB7XG4gICAgICAgICAgICAgIChub2RlIGFzIEVsZW1lbnQpLmFwcGVuZChzdHJpbmdzW2ldLCBjcmVhdGVNYXJrZXIoKSk7XG4gICAgICAgICAgICAgIC8vIFdhbGsgcGFzdCB0aGUgbWFya2VyIG5vZGUgd2UganVzdCBhZGRlZFxuICAgICAgICAgICAgICB3YWxrZXIubmV4dE5vZGUoKTtcbiAgICAgICAgICAgICAgcGFydHMucHVzaCh7dHlwZTogQ0hJTERfUEFSVCwgaW5kZXg6ICsrbm9kZUluZGV4fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBOb3RlIGJlY2F1c2UgdGhpcyBtYXJrZXIgaXMgYWRkZWQgYWZ0ZXIgdGhlIHdhbGtlcidzIGN1cnJlbnRcbiAgICAgICAgICAgIC8vIG5vZGUsIGl0IHdpbGwgYmUgd2Fsa2VkIHRvIGluIHRoZSBvdXRlciBsb29wIChhbmQgaWdub3JlZCksIHNvXG4gICAgICAgICAgICAvLyB3ZSBkb24ndCBuZWVkIHRvIGFkanVzdCBub2RlSW5kZXggaGVyZVxuICAgICAgICAgICAgKG5vZGUgYXMgRWxlbWVudCkuYXBwZW5kKHN0cmluZ3NbbGFzdEluZGV4XSwgY3JlYXRlTWFya2VyKCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChub2RlLm5vZGVUeXBlID09PSA4KSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSAobm9kZSBhcyBDb21tZW50KS5kYXRhO1xuICAgICAgICBpZiAoZGF0YSA9PT0gbWFya2VyTWF0Y2gpIHtcbiAgICAgICAgICBwYXJ0cy5wdXNoKHt0eXBlOiBDSElMRF9QQVJULCBpbmRleDogbm9kZUluZGV4fSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0IGkgPSAtMTtcbiAgICAgICAgICB3aGlsZSAoKGkgPSAobm9kZSBhcyBDb21tZW50KS5kYXRhLmluZGV4T2YobWFya2VyLCBpICsgMSkpICE9PSAtMSkge1xuICAgICAgICAgICAgLy8gQ29tbWVudCBub2RlIGhhcyBhIGJpbmRpbmcgbWFya2VyIGluc2lkZSwgbWFrZSBhbiBpbmFjdGl2ZSBwYXJ0XG4gICAgICAgICAgICAvLyBUaGUgYmluZGluZyB3b24ndCB3b3JrLCBidXQgc3Vic2VxdWVudCBiaW5kaW5ncyB3aWxsXG4gICAgICAgICAgICBwYXJ0cy5wdXNoKHt0eXBlOiBDT01NRU5UX1BBUlQsIGluZGV4OiBub2RlSW5kZXh9KTtcbiAgICAgICAgICAgIC8vIE1vdmUgdG8gdGhlIGVuZCBvZiB0aGUgbWF0Y2hcbiAgICAgICAgICAgIGkgKz0gbWFya2VyLmxlbmd0aCAtIDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBub2RlSW5kZXgrKztcbiAgICB9XG5cbiAgICBpZiAoREVWX01PREUpIHtcbiAgICAgIC8vIElmIHRoZXJlIHdhcyBhIGR1cGxpY2F0ZSBhdHRyaWJ1dGUgb24gYSB0YWcsIHRoZW4gd2hlbiB0aGUgdGFnIGlzXG4gICAgICAvLyBwYXJzZWQgaW50byBhbiBlbGVtZW50IHRoZSBhdHRyaWJ1dGUgZ2V0cyBkZS1kdXBsaWNhdGVkLiBXZSBjYW4gZGV0ZWN0XG4gICAgICAvLyB0aGlzIG1pc21hdGNoIGlmIHdlIGhhdmVuJ3QgcHJlY2lzZWx5IGNvbnN1bWVkIGV2ZXJ5IGF0dHJpYnV0ZSBuYW1lXG4gICAgICAvLyB3aGVuIHByZXBhcmluZyB0aGUgdGVtcGxhdGUuIFRoaXMgd29ya3MgYmVjYXVzZSBgYXR0ck5hbWVzYCBpcyBidWlsdFxuICAgICAgLy8gZnJvbSB0aGUgdGVtcGxhdGUgc3RyaW5nIGFuZCBgYXR0ck5hbWVJbmRleGAgY29tZXMgZnJvbSBwcm9jZXNzaW5nIHRoZVxuICAgICAgLy8gcmVzdWx0aW5nIERPTS5cbiAgICAgIGlmIChhdHRyTmFtZXMubGVuZ3RoICE9PSBhdHRyTmFtZUluZGV4KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgRGV0ZWN0ZWQgZHVwbGljYXRlIGF0dHJpYnV0ZSBiaW5kaW5ncy4gVGhpcyBvY2N1cnMgaWYgeW91ciB0ZW1wbGF0ZSBgICtcbiAgICAgICAgICAgIGBoYXMgZHVwbGljYXRlIGF0dHJpYnV0ZXMgb24gYW4gZWxlbWVudCB0YWcuIEZvciBleGFtcGxlIGAgK1xuICAgICAgICAgICAgYFwiPGlucHV0ID9kaXNhYmxlZD1cXCR7dHJ1ZX0gP2Rpc2FibGVkPVxcJHtmYWxzZX0+XCIgY29udGFpbnMgYSBgICtcbiAgICAgICAgICAgIGBkdXBsaWNhdGUgXCJkaXNhYmxlZFwiIGF0dHJpYnV0ZS4gVGhlIGVycm9yIHdhcyBkZXRlY3RlZCBpbiBgICtcbiAgICAgICAgICAgIGB0aGUgZm9sbG93aW5nIHRlbXBsYXRlOiBcXG5gICtcbiAgICAgICAgICAgICdgJyArXG4gICAgICAgICAgICBzdHJpbmdzLmpvaW4oJyR7Li4ufScpICtcbiAgICAgICAgICAgICdgJ1xuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFdlIGNvdWxkIHNldCB3YWxrZXIuY3VycmVudE5vZGUgdG8gYW5vdGhlciBub2RlIGhlcmUgdG8gcHJldmVudCBhIG1lbW9yeVxuICAgIC8vIGxlYWssIGJ1dCBldmVyeSB0aW1lIHdlIHByZXBhcmUgYSB0ZW1wbGF0ZSwgd2UgaW1tZWRpYXRlbHkgcmVuZGVyIGl0XG4gICAgLy8gYW5kIHJlLXVzZSB0aGUgd2Fsa2VyIGluIG5ldyBUZW1wbGF0ZUluc3RhbmNlLl9jbG9uZSgpLlxuICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAgICBraW5kOiAndGVtcGxhdGUgcHJlcCcsXG4gICAgICAgIHRlbXBsYXRlOiB0aGlzLFxuICAgICAgICBjbG9uYWJsZVRlbXBsYXRlOiB0aGlzLmVsLFxuICAgICAgICBwYXJ0czogdGhpcy5wYXJ0cyxcbiAgICAgICAgc3RyaW5ncyxcbiAgICAgIH0pO1xuICB9XG5cbiAgLy8gT3ZlcnJpZGRlbiB2aWEgYGxpdEh0bWxQb2x5ZmlsbFN1cHBvcnRgIHRvIHByb3ZpZGUgcGxhdGZvcm0gc3VwcG9ydC5cbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBjcmVhdGVFbGVtZW50KGh0bWw6IFRydXN0ZWRIVE1MLCBfb3B0aW9ucz86IFJlbmRlck9wdGlvbnMpIHtcbiAgICBjb25zdCBlbCA9IGQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICBlbC5pbm5lckhUTUwgPSBodG1sIGFzIHVua25vd24gYXMgc3RyaW5nO1xuICAgIHJldHVybiBlbDtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIERpc2Nvbm5lY3RhYmxlIHtcbiAgXyRwYXJlbnQ/OiBEaXNjb25uZWN0YWJsZTtcbiAgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuPzogU2V0PERpc2Nvbm5lY3RhYmxlPjtcbiAgLy8gUmF0aGVyIHRoYW4gaG9sZCBjb25uZWN0aW9uIHN0YXRlIG9uIGluc3RhbmNlcywgRGlzY29ubmVjdGFibGVzIHJlY3Vyc2l2ZWx5XG4gIC8vIGZldGNoIHRoZSBjb25uZWN0aW9uIHN0YXRlIGZyb20gdGhlIFJvb3RQYXJ0IHRoZXkgYXJlIGNvbm5lY3RlZCBpbiB2aWFcbiAgLy8gZ2V0dGVycyB1cCB0aGUgRGlzY29ubmVjdGFibGUgdHJlZSB2aWEgXyRwYXJlbnQgcmVmZXJlbmNlcy4gVGhpcyBwdXNoZXMgdGhlXG4gIC8vIGNvc3Qgb2YgdHJhY2tpbmcgdGhlIGlzQ29ubmVjdGVkIHN0YXRlIHRvIGBBc3luY0RpcmVjdGl2ZXNgLCBhbmQgYXZvaWRzXG4gIC8vIG5lZWRpbmcgdG8gcGFzcyBhbGwgRGlzY29ubmVjdGFibGVzIChwYXJ0cywgdGVtcGxhdGUgaW5zdGFuY2VzLCBhbmRcbiAgLy8gZGlyZWN0aXZlcykgdGhlaXIgY29ubmVjdGlvbiBzdGF0ZSBlYWNoIHRpbWUgaXQgY2hhbmdlcywgd2hpY2ggd291bGQgYmVcbiAgLy8gY29zdGx5IGZvciB0cmVlcyB0aGF0IGhhdmUgbm8gQXN5bmNEaXJlY3RpdmVzLlxuICBfJGlzQ29ubmVjdGVkOiBib29sZWFuO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlRGlyZWN0aXZlKFxuICBwYXJ0OiBDaGlsZFBhcnQgfCBBdHRyaWJ1dGVQYXJ0IHwgRWxlbWVudFBhcnQsXG4gIHZhbHVlOiB1bmtub3duLFxuICBwYXJlbnQ6IERpcmVjdGl2ZVBhcmVudCA9IHBhcnQsXG4gIGF0dHJpYnV0ZUluZGV4PzogbnVtYmVyXG4pOiB1bmtub3duIHtcbiAgLy8gQmFpbCBlYXJseSBpZiB0aGUgdmFsdWUgaXMgZXhwbGljaXRseSBub0NoYW5nZS4gTm90ZSwgdGhpcyBtZWFucyBhbnlcbiAgLy8gbmVzdGVkIGRpcmVjdGl2ZSBpcyBzdGlsbCBhdHRhY2hlZCBhbmQgaXMgbm90IHJ1bi5cbiAgaWYgKHZhbHVlID09PSBub0NoYW5nZSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBsZXQgY3VycmVudERpcmVjdGl2ZSA9XG4gICAgYXR0cmlidXRlSW5kZXggIT09IHVuZGVmaW5lZFxuICAgICAgPyAocGFyZW50IGFzIEF0dHJpYnV0ZVBhcnQpLl9fZGlyZWN0aXZlcz8uW2F0dHJpYnV0ZUluZGV4XVxuICAgICAgOiAocGFyZW50IGFzIENoaWxkUGFydCB8IEVsZW1lbnRQYXJ0IHwgRGlyZWN0aXZlKS5fX2RpcmVjdGl2ZTtcbiAgY29uc3QgbmV4dERpcmVjdGl2ZUNvbnN0cnVjdG9yID0gaXNQcmltaXRpdmUodmFsdWUpXG4gICAgPyB1bmRlZmluZWRcbiAgICA6IC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgICAodmFsdWUgYXMgRGlyZWN0aXZlUmVzdWx0KVsnXyRsaXREaXJlY3RpdmUkJ107XG4gIGlmIChjdXJyZW50RGlyZWN0aXZlPy5jb25zdHJ1Y3RvciAhPT0gbmV4dERpcmVjdGl2ZUNvbnN0cnVjdG9yKSB7XG4gICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICBjdXJyZW50RGlyZWN0aXZlPy5bJ18kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWQnXT8uKGZhbHNlKTtcbiAgICBpZiAobmV4dERpcmVjdGl2ZUNvbnN0cnVjdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGN1cnJlbnREaXJlY3RpdmUgPSB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGN1cnJlbnREaXJlY3RpdmUgPSBuZXcgbmV4dERpcmVjdGl2ZUNvbnN0cnVjdG9yKHBhcnQgYXMgUGFydEluZm8pO1xuICAgICAgY3VycmVudERpcmVjdGl2ZS5fJGluaXRpYWxpemUocGFydCwgcGFyZW50LCBhdHRyaWJ1dGVJbmRleCk7XG4gICAgfVxuICAgIGlmIChhdHRyaWJ1dGVJbmRleCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAoKHBhcmVudCBhcyBBdHRyaWJ1dGVQYXJ0KS5fX2RpcmVjdGl2ZXMgPz89IFtdKVthdHRyaWJ1dGVJbmRleF0gPVxuICAgICAgICBjdXJyZW50RGlyZWN0aXZlO1xuICAgIH0gZWxzZSB7XG4gICAgICAocGFyZW50IGFzIENoaWxkUGFydCB8IERpcmVjdGl2ZSkuX19kaXJlY3RpdmUgPSBjdXJyZW50RGlyZWN0aXZlO1xuICAgIH1cbiAgfVxuICBpZiAoY3VycmVudERpcmVjdGl2ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdmFsdWUgPSByZXNvbHZlRGlyZWN0aXZlKFxuICAgICAgcGFydCxcbiAgICAgIGN1cnJlbnREaXJlY3RpdmUuXyRyZXNvbHZlKHBhcnQsICh2YWx1ZSBhcyBEaXJlY3RpdmVSZXN1bHQpLnZhbHVlcyksXG4gICAgICBjdXJyZW50RGlyZWN0aXZlLFxuICAgICAgYXR0cmlidXRlSW5kZXhcbiAgICApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZXhwb3J0IHR5cGUge1RlbXBsYXRlSW5zdGFuY2V9O1xuLyoqXG4gKiBBbiB1cGRhdGVhYmxlIGluc3RhbmNlIG9mIGEgVGVtcGxhdGUuIEhvbGRzIHJlZmVyZW5jZXMgdG8gdGhlIFBhcnRzIHVzZWQgdG9cbiAqIHVwZGF0ZSB0aGUgdGVtcGxhdGUgaW5zdGFuY2UuXG4gKi9cbmNsYXNzIFRlbXBsYXRlSW5zdGFuY2UgaW1wbGVtZW50cyBEaXNjb25uZWN0YWJsZSB7XG4gIF8kdGVtcGxhdGU6IFRlbXBsYXRlO1xuICBfJHBhcnRzOiBBcnJheTxQYXJ0IHwgdW5kZWZpbmVkPiA9IFtdO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRwYXJlbnQ6IENoaWxkUGFydDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4/OiBTZXQ8RGlzY29ubmVjdGFibGU+ID0gdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKHRlbXBsYXRlOiBUZW1wbGF0ZSwgcGFyZW50OiBDaGlsZFBhcnQpIHtcbiAgICB0aGlzLl8kdGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgICB0aGlzLl8kcGFyZW50ID0gcGFyZW50O1xuICB9XG5cbiAgLy8gQ2FsbGVkIGJ5IENoaWxkUGFydCBwYXJlbnROb2RlIGdldHRlclxuICBnZXQgcGFyZW50Tm9kZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fJHBhcmVudC5wYXJlbnROb2RlO1xuICB9XG5cbiAgLy8gU2VlIGNvbW1lbnQgaW4gRGlzY29ubmVjdGFibGUgaW50ZXJmYWNlIGZvciB3aHkgdGhpcyBpcyBhIGdldHRlclxuICBnZXQgXyRpc0Nvbm5lY3RlZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fJHBhcmVudC5fJGlzQ29ubmVjdGVkO1xuICB9XG5cbiAgLy8gVGhpcyBtZXRob2QgaXMgc2VwYXJhdGUgZnJvbSB0aGUgY29uc3RydWN0b3IgYmVjYXVzZSB3ZSBuZWVkIHRvIHJldHVybiBhXG4gIC8vIERvY3VtZW50RnJhZ21lbnQgYW5kIHdlIGRvbid0IHdhbnQgdG8gaG9sZCBvbnRvIGl0IHdpdGggYW4gaW5zdGFuY2UgZmllbGQuXG4gIF9jbG9uZShvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkKSB7XG4gICAgY29uc3Qge1xuICAgICAgZWw6IHtjb250ZW50fSxcbiAgICAgIHBhcnRzOiBwYXJ0cyxcbiAgICB9ID0gdGhpcy5fJHRlbXBsYXRlO1xuICAgIGNvbnN0IGZyYWdtZW50ID0gKG9wdGlvbnM/LmNyZWF0aW9uU2NvcGUgPz8gZCkuaW1wb3J0Tm9kZShjb250ZW50LCB0cnVlKTtcbiAgICB3YWxrZXIuY3VycmVudE5vZGUgPSBmcmFnbWVudDtcblxuICAgIGxldCBub2RlID0gd2Fsa2VyLm5leHROb2RlKCkhO1xuICAgIGxldCBub2RlSW5kZXggPSAwO1xuICAgIGxldCBwYXJ0SW5kZXggPSAwO1xuICAgIGxldCB0ZW1wbGF0ZVBhcnQgPSBwYXJ0c1swXTtcblxuICAgIHdoaWxlICh0ZW1wbGF0ZVBhcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKG5vZGVJbmRleCA9PT0gdGVtcGxhdGVQYXJ0LmluZGV4KSB7XG4gICAgICAgIGxldCBwYXJ0OiBQYXJ0IHwgdW5kZWZpbmVkO1xuICAgICAgICBpZiAodGVtcGxhdGVQYXJ0LnR5cGUgPT09IENISUxEX1BBUlQpIHtcbiAgICAgICAgICBwYXJ0ID0gbmV3IENoaWxkUGFydChcbiAgICAgICAgICAgIG5vZGUgYXMgSFRNTEVsZW1lbnQsXG4gICAgICAgICAgICBub2RlLm5leHRTaWJsaW5nLFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgIG9wdGlvbnNcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlUGFydC50eXBlID09PSBBVFRSSUJVVEVfUEFSVCkge1xuICAgICAgICAgIHBhcnQgPSBuZXcgdGVtcGxhdGVQYXJ0LmN0b3IoXG4gICAgICAgICAgICBub2RlIGFzIEhUTUxFbGVtZW50LFxuICAgICAgICAgICAgdGVtcGxhdGVQYXJ0Lm5hbWUsXG4gICAgICAgICAgICB0ZW1wbGF0ZVBhcnQuc3RyaW5ncyxcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICBvcHRpb25zXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmICh0ZW1wbGF0ZVBhcnQudHlwZSA9PT0gRUxFTUVOVF9QQVJUKSB7XG4gICAgICAgICAgcGFydCA9IG5ldyBFbGVtZW50UGFydChub2RlIGFzIEhUTUxFbGVtZW50LCB0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl8kcGFydHMucHVzaChwYXJ0KTtcbiAgICAgICAgdGVtcGxhdGVQYXJ0ID0gcGFydHNbKytwYXJ0SW5kZXhdO1xuICAgICAgfVxuICAgICAgaWYgKG5vZGVJbmRleCAhPT0gdGVtcGxhdGVQYXJ0Py5pbmRleCkge1xuICAgICAgICBub2RlID0gd2Fsa2VyLm5leHROb2RlKCkhO1xuICAgICAgICBub2RlSW5kZXgrKztcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gV2UgbmVlZCB0byBzZXQgdGhlIGN1cnJlbnROb2RlIGF3YXkgZnJvbSB0aGUgY2xvbmVkIHRyZWUgc28gdGhhdCB3ZVxuICAgIC8vIGRvbid0IGhvbGQgb250byB0aGUgdHJlZSBldmVuIGlmIHRoZSB0cmVlIGlzIGRldGFjaGVkIGFuZCBzaG91bGQgYmVcbiAgICAvLyBmcmVlZC5cbiAgICB3YWxrZXIuY3VycmVudE5vZGUgPSBkO1xuICAgIHJldHVybiBmcmFnbWVudDtcbiAgfVxuXG4gIF91cGRhdGUodmFsdWVzOiBBcnJheTx1bmtub3duPikge1xuICAgIGxldCBpID0gMDtcbiAgICBmb3IgKGNvbnN0IHBhcnQgb2YgdGhpcy5fJHBhcnRzKSB7XG4gICAgICBpZiAocGFydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAgICAgIGtpbmQ6ICdzZXQgcGFydCcsXG4gICAgICAgICAgICBwYXJ0LFxuICAgICAgICAgICAgdmFsdWU6IHZhbHVlc1tpXSxcbiAgICAgICAgICAgIHZhbHVlSW5kZXg6IGksXG4gICAgICAgICAgICB2YWx1ZXMsXG4gICAgICAgICAgICB0ZW1wbGF0ZUluc3RhbmNlOiB0aGlzLFxuICAgICAgICAgIH0pO1xuICAgICAgICBpZiAoKHBhcnQgYXMgQXR0cmlidXRlUGFydCkuc3RyaW5ncyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgKHBhcnQgYXMgQXR0cmlidXRlUGFydCkuXyRzZXRWYWx1ZSh2YWx1ZXMsIHBhcnQgYXMgQXR0cmlidXRlUGFydCwgaSk7XG4gICAgICAgICAgLy8gVGhlIG51bWJlciBvZiB2YWx1ZXMgdGhlIHBhcnQgY29uc3VtZXMgaXMgcGFydC5zdHJpbmdzLmxlbmd0aCAtIDFcbiAgICAgICAgICAvLyBzaW5jZSB2YWx1ZXMgYXJlIGluIGJldHdlZW4gdGVtcGxhdGUgc3BhbnMuIFdlIGluY3JlbWVudCBpIGJ5IDFcbiAgICAgICAgICAvLyBsYXRlciBpbiB0aGUgbG9vcCwgc28gaW5jcmVtZW50IGl0IGJ5IHBhcnQuc3RyaW5ncy5sZW5ndGggLSAyIGhlcmVcbiAgICAgICAgICBpICs9IChwYXJ0IGFzIEF0dHJpYnV0ZVBhcnQpLnN0cmluZ3MhLmxlbmd0aCAtIDI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGFydC5fJHNldFZhbHVlKHZhbHVlc1tpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGkrKztcbiAgICB9XG4gIH1cbn1cblxuLypcbiAqIFBhcnRzXG4gKi9cbnR5cGUgQXR0cmlidXRlVGVtcGxhdGVQYXJ0ID0ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgQVRUUklCVVRFX1BBUlQ7XG4gIHJlYWRvbmx5IGluZGV4OiBudW1iZXI7XG4gIHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgY3RvcjogdHlwZW9mIEF0dHJpYnV0ZVBhcnQ7XG4gIHJlYWRvbmx5IHN0cmluZ3M6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPjtcbn07XG50eXBlIENoaWxkVGVtcGxhdGVQYXJ0ID0ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgQ0hJTERfUEFSVDtcbiAgcmVhZG9ubHkgaW5kZXg6IG51bWJlcjtcbn07XG50eXBlIEVsZW1lbnRUZW1wbGF0ZVBhcnQgPSB7XG4gIHJlYWRvbmx5IHR5cGU6IHR5cGVvZiBFTEVNRU5UX1BBUlQ7XG4gIHJlYWRvbmx5IGluZGV4OiBudW1iZXI7XG59O1xudHlwZSBDb21tZW50VGVtcGxhdGVQYXJ0ID0ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgQ09NTUVOVF9QQVJUO1xuICByZWFkb25seSBpbmRleDogbnVtYmVyO1xufTtcblxuLyoqXG4gKiBBIFRlbXBsYXRlUGFydCByZXByZXNlbnRzIGEgZHluYW1pYyBwYXJ0IGluIGEgdGVtcGxhdGUsIGJlZm9yZSB0aGUgdGVtcGxhdGVcbiAqIGlzIGluc3RhbnRpYXRlZC4gV2hlbiBhIHRlbXBsYXRlIGlzIGluc3RhbnRpYXRlZCBQYXJ0cyBhcmUgY3JlYXRlZCBmcm9tXG4gKiBUZW1wbGF0ZVBhcnRzLlxuICovXG50eXBlIFRlbXBsYXRlUGFydCA9XG4gIHwgQ2hpbGRUZW1wbGF0ZVBhcnRcbiAgfCBBdHRyaWJ1dGVUZW1wbGF0ZVBhcnRcbiAgfCBFbGVtZW50VGVtcGxhdGVQYXJ0XG4gIHwgQ29tbWVudFRlbXBsYXRlUGFydDtcblxuZXhwb3J0IHR5cGUgUGFydCA9XG4gIHwgQ2hpbGRQYXJ0XG4gIHwgQXR0cmlidXRlUGFydFxuICB8IFByb3BlcnR5UGFydFxuICB8IEJvb2xlYW5BdHRyaWJ1dGVQYXJ0XG4gIHwgRWxlbWVudFBhcnRcbiAgfCBFdmVudFBhcnQ7XG5cbmV4cG9ydCB0eXBlIHtDaGlsZFBhcnR9O1xuY2xhc3MgQ2hpbGRQYXJ0IGltcGxlbWVudHMgRGlzY29ubmVjdGFibGUge1xuICByZWFkb25seSB0eXBlID0gQ0hJTERfUEFSVDtcbiAgcmVhZG9ubHkgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgXyRjb21taXR0ZWRWYWx1ZTogdW5rbm93biA9IG5vdGhpbmc7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX19kaXJlY3RpdmU/OiBEaXJlY3RpdmU7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRzdGFydE5vZGU6IENoaWxkTm9kZTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGVuZE5vZGU6IENoaWxkTm9kZSB8IG51bGw7XG4gIHByaXZhdGUgX3RleHRTYW5pdGl6ZXI6IFZhbHVlU2FuaXRpemVyIHwgdW5kZWZpbmVkO1xuICAvKiogQGludGVybmFsICovXG4gIF8kcGFyZW50OiBEaXNjb25uZWN0YWJsZSB8IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIENvbm5lY3Rpb24gc3RhdGUgZm9yIFJvb3RQYXJ0cyBvbmx5IChpLmUuIENoaWxkUGFydCB3aXRob3V0IF8kcGFyZW50XG4gICAqIHJldHVybmVkIGZyb20gdG9wLWxldmVsIGByZW5kZXJgKS4gVGhpcyBmaWVsZCBpcyB1bnVzZWQgb3RoZXJ3aXNlLiBUaGVcbiAgICogaW50ZW50aW9uIHdvdWxkIGJlIGNsZWFyZXIgaWYgd2UgbWFkZSBgUm9vdFBhcnRgIGEgc3ViY2xhc3Mgb2YgYENoaWxkUGFydGBcbiAgICogd2l0aCB0aGlzIGZpZWxkIChhbmQgYSBkaWZmZXJlbnQgXyRpc0Nvbm5lY3RlZCBnZXR0ZXIpLCBidXQgdGhlIHN1YmNsYXNzXG4gICAqIGNhdXNlZCBhIHBlcmYgcmVncmVzc2lvbiwgcG9zc2libHkgZHVlIHRvIG1ha2luZyBjYWxsIHNpdGVzIHBvbHltb3JwaGljLlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIF9faXNDb25uZWN0ZWQ6IGJvb2xlYW47XG5cbiAgLy8gU2VlIGNvbW1lbnQgaW4gRGlzY29ubmVjdGFibGUgaW50ZXJmYWNlIGZvciB3aHkgdGhpcyBpcyBhIGdldHRlclxuICBnZXQgXyRpc0Nvbm5lY3RlZCgpIHtcbiAgICAvLyBDaGlsZFBhcnRzIHRoYXQgYXJlIG5vdCBhdCB0aGUgcm9vdCBzaG91bGQgYWx3YXlzIGJlIGNyZWF0ZWQgd2l0aCBhXG4gICAgLy8gcGFyZW50OyBvbmx5IFJvb3RDaGlsZE5vZGUncyB3b24ndCwgc28gdGhleSByZXR1cm4gdGhlIGxvY2FsIGlzQ29ubmVjdGVkXG4gICAgLy8gc3RhdGVcbiAgICByZXR1cm4gdGhpcy5fJHBhcmVudD8uXyRpc0Nvbm5lY3RlZCA/PyB0aGlzLl9faXNDb25uZWN0ZWQ7XG4gIH1cblxuICAvLyBUaGUgZm9sbG93aW5nIGZpZWxkcyB3aWxsIGJlIHBhdGNoZWQgb250byBDaGlsZFBhcnRzIHdoZW4gcmVxdWlyZWQgYnlcbiAgLy8gQXN5bmNEaXJlY3RpdmVcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4/OiBTZXQ8RGlzY29ubmVjdGFibGU+ID0gdW5kZWZpbmVkO1xuICAvKiogQGludGVybmFsICovXG4gIF8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQ/KFxuICAgIGlzQ29ubmVjdGVkOiBib29sZWFuLFxuICAgIHJlbW92ZUZyb21QYXJlbnQ/OiBib29sZWFuLFxuICAgIGZyb20/OiBudW1iZXJcbiAgKTogdm9pZDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHJlcGFyZW50RGlzY29ubmVjdGFibGVzPyhwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlKTogdm9pZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBzdGFydE5vZGU6IENoaWxkTm9kZSxcbiAgICBlbmROb2RlOiBDaGlsZE5vZGUgfCBudWxsLFxuICAgIHBhcmVudDogVGVtcGxhdGVJbnN0YW5jZSB8IENoaWxkUGFydCB8IHVuZGVmaW5lZCxcbiAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkXG4gICkge1xuICAgIHRoaXMuXyRzdGFydE5vZGUgPSBzdGFydE5vZGU7XG4gICAgdGhpcy5fJGVuZE5vZGUgPSBlbmROb2RlO1xuICAgIHRoaXMuXyRwYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICAvLyBOb3RlIF9faXNDb25uZWN0ZWQgaXMgb25seSBldmVyIGFjY2Vzc2VkIG9uIFJvb3RQYXJ0cyAoaS5lLiB3aGVuIHRoZXJlIGlzXG4gICAgLy8gbm8gXyRwYXJlbnQpOyB0aGUgdmFsdWUgb24gYSBub24tcm9vdC1wYXJ0IGlzIFwiZG9uJ3QgY2FyZVwiLCBidXQgY2hlY2tpbmdcbiAgICAvLyBmb3IgcGFyZW50IHdvdWxkIGJlIG1vcmUgY29kZVxuICAgIHRoaXMuX19pc0Nvbm5lY3RlZCA9IG9wdGlvbnM/LmlzQ29ubmVjdGVkID8/IHRydWU7XG4gICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgLy8gRXhwbGljaXRseSBpbml0aWFsaXplIGZvciBjb25zaXN0ZW50IGNsYXNzIHNoYXBlLlxuICAgICAgdGhpcy5fdGV4dFNhbml0aXplciA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVGhlIHBhcmVudCBub2RlIGludG8gd2hpY2ggdGhlIHBhcnQgcmVuZGVycyBpdHMgY29udGVudC5cbiAgICpcbiAgICogQSBDaGlsZFBhcnQncyBjb250ZW50IGNvbnNpc3RzIG9mIGEgcmFuZ2Ugb2YgYWRqYWNlbnQgY2hpbGQgbm9kZXMgb2ZcbiAgICogYC5wYXJlbnROb2RlYCwgcG9zc2libHkgYm9yZGVyZWQgYnkgJ21hcmtlciBub2RlcycgKGAuc3RhcnROb2RlYCBhbmRcbiAgICogYC5lbmROb2RlYCkuXG4gICAqXG4gICAqIC0gSWYgYm90aCBgLnN0YXJ0Tm9kZWAgYW5kIGAuZW5kTm9kZWAgYXJlIG5vbi1udWxsLCB0aGVuIHRoZSBwYXJ0J3MgY29udGVudFxuICAgKiBjb25zaXN0cyBvZiBhbGwgc2libGluZ3MgYmV0d2VlbiBgLnN0YXJ0Tm9kZWAgYW5kIGAuZW5kTm9kZWAsIGV4Y2x1c2l2ZWx5LlxuICAgKlxuICAgKiAtIElmIGAuc3RhcnROb2RlYCBpcyBub24tbnVsbCBidXQgYC5lbmROb2RlYCBpcyBudWxsLCB0aGVuIHRoZSBwYXJ0J3NcbiAgICogY29udGVudCBjb25zaXN0cyBvZiBhbGwgc2libGluZ3MgZm9sbG93aW5nIGAuc3RhcnROb2RlYCwgdXAgdG8gYW5kXG4gICAqIGluY2x1ZGluZyB0aGUgbGFzdCBjaGlsZCBvZiBgLnBhcmVudE5vZGVgLiBJZiBgLmVuZE5vZGVgIGlzIG5vbi1udWxsLCB0aGVuXG4gICAqIGAuc3RhcnROb2RlYCB3aWxsIGFsd2F5cyBiZSBub24tbnVsbC5cbiAgICpcbiAgICogLSBJZiBib3RoIGAuZW5kTm9kZWAgYW5kIGAuc3RhcnROb2RlYCBhcmUgbnVsbCwgdGhlbiB0aGUgcGFydCdzIGNvbnRlbnRcbiAgICogY29uc2lzdHMgb2YgYWxsIGNoaWxkIG5vZGVzIG9mIGAucGFyZW50Tm9kZWAuXG4gICAqL1xuICBnZXQgcGFyZW50Tm9kZSgpOiBOb2RlIHtcbiAgICBsZXQgcGFyZW50Tm9kZTogTm9kZSA9IHdyYXAodGhpcy5fJHN0YXJ0Tm9kZSkucGFyZW50Tm9kZSE7XG4gICAgY29uc3QgcGFyZW50ID0gdGhpcy5fJHBhcmVudDtcbiAgICBpZiAoXG4gICAgICBwYXJlbnQgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgcGFyZW50Tm9kZT8ubm9kZVR5cGUgPT09IDExIC8qIE5vZGUuRE9DVU1FTlRfRlJBR01FTlQgKi9cbiAgICApIHtcbiAgICAgIC8vIElmIHRoZSBwYXJlbnROb2RlIGlzIGEgRG9jdW1lbnRGcmFnbWVudCwgaXQgbWF5IGJlIGJlY2F1c2UgdGhlIERPTSBpc1xuICAgICAgLy8gc3RpbGwgaW4gdGhlIGNsb25lZCBmcmFnbWVudCBkdXJpbmcgaW5pdGlhbCByZW5kZXI7IGlmIHNvLCBnZXQgdGhlIHJlYWxcbiAgICAgIC8vIHBhcmVudE5vZGUgdGhlIHBhcnQgd2lsbCBiZSBjb21taXR0ZWQgaW50byBieSBhc2tpbmcgdGhlIHBhcmVudC5cbiAgICAgIHBhcmVudE5vZGUgPSAocGFyZW50IGFzIENoaWxkUGFydCB8IFRlbXBsYXRlSW5zdGFuY2UpLnBhcmVudE5vZGU7XG4gICAgfVxuICAgIHJldHVybiBwYXJlbnROb2RlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBwYXJ0J3MgbGVhZGluZyBtYXJrZXIgbm9kZSwgaWYgYW55LiBTZWUgYC5wYXJlbnROb2RlYCBmb3IgbW9yZVxuICAgKiBpbmZvcm1hdGlvbi5cbiAgICovXG4gIGdldCBzdGFydE5vZGUoKTogTm9kZSB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLl8kc3RhcnROb2RlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBwYXJ0J3MgdHJhaWxpbmcgbWFya2VyIG5vZGUsIGlmIGFueS4gU2VlIGAucGFyZW50Tm9kZWAgZm9yIG1vcmVcbiAgICogaW5mb3JtYXRpb24uXG4gICAqL1xuICBnZXQgZW5kTm9kZSgpOiBOb2RlIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuXyRlbmROb2RlO1xuICB9XG5cbiAgXyRzZXRWYWx1ZSh2YWx1ZTogdW5rbm93biwgZGlyZWN0aXZlUGFyZW50OiBEaXJlY3RpdmVQYXJlbnQgPSB0aGlzKTogdm9pZCB7XG4gICAgaWYgKERFVl9NT0RFICYmIHRoaXMucGFyZW50Tm9kZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgVGhpcyBcXGBDaGlsZFBhcnRcXGAgaGFzIG5vIFxcYHBhcmVudE5vZGVcXGAgYW5kIHRoZXJlZm9yZSBjYW5ub3QgYWNjZXB0IGEgdmFsdWUuIFRoaXMgbGlrZWx5IG1lYW5zIHRoZSBlbGVtZW50IGNvbnRhaW5pbmcgdGhlIHBhcnQgd2FzIG1hbmlwdWxhdGVkIGluIGFuIHVuc3VwcG9ydGVkIHdheSBvdXRzaWRlIG9mIExpdCdzIGNvbnRyb2wgc3VjaCB0aGF0IHRoZSBwYXJ0J3MgbWFya2VyIG5vZGVzIHdlcmUgZWplY3RlZCBmcm9tIERPTS4gRm9yIGV4YW1wbGUsIHNldHRpbmcgdGhlIGVsZW1lbnQncyBcXGBpbm5lckhUTUxcXGAgb3IgXFxgdGV4dENvbnRlbnRcXGAgY2FuIGRvIHRoaXMuYFxuICAgICAgKTtcbiAgICB9XG4gICAgdmFsdWUgPSByZXNvbHZlRGlyZWN0aXZlKHRoaXMsIHZhbHVlLCBkaXJlY3RpdmVQYXJlbnQpO1xuICAgIGlmIChpc1ByaW1pdGl2ZSh2YWx1ZSkpIHtcbiAgICAgIC8vIE5vbi1yZW5kZXJpbmcgY2hpbGQgdmFsdWVzLiBJdCdzIGltcG9ydGFudCB0aGF0IHRoZXNlIGRvIG5vdCByZW5kZXJcbiAgICAgIC8vIGVtcHR5IHRleHQgbm9kZXMgdG8gYXZvaWQgaXNzdWVzIHdpdGggcHJldmVudGluZyBkZWZhdWx0IDxzbG90PlxuICAgICAgLy8gZmFsbGJhY2sgY29udGVudC5cbiAgICAgIGlmICh2YWx1ZSA9PT0gbm90aGluZyB8fCB2YWx1ZSA9PSBudWxsIHx8IHZhbHVlID09PSAnJykge1xuICAgICAgICBpZiAodGhpcy5fJGNvbW1pdHRlZFZhbHVlICE9PSBub3RoaW5nKSB7XG4gICAgICAgICAgZGVidWdMb2dFdmVudCAmJlxuICAgICAgICAgICAgZGVidWdMb2dFdmVudCh7XG4gICAgICAgICAgICAgIGtpbmQ6ICdjb21taXQgbm90aGluZyB0byBjaGlsZCcsXG4gICAgICAgICAgICAgIHN0YXJ0OiB0aGlzLl8kc3RhcnROb2RlLFxuICAgICAgICAgICAgICBlbmQ6IHRoaXMuXyRlbmROb2RlLFxuICAgICAgICAgICAgICBwYXJlbnQ6IHRoaXMuXyRwYXJlbnQsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIHRoaXMuXyRjbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IG5vdGhpbmc7XG4gICAgICB9IGVsc2UgaWYgKHZhbHVlICE9PSB0aGlzLl8kY29tbWl0dGVkVmFsdWUgJiYgdmFsdWUgIT09IG5vQ2hhbmdlKSB7XG4gICAgICAgIHRoaXMuX2NvbW1pdFRleHQodmFsdWUpO1xuICAgICAgfVxuICAgICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICB9IGVsc2UgaWYgKCh2YWx1ZSBhcyBUZW1wbGF0ZVJlc3VsdClbJ18kbGl0VHlwZSQnXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9jb21taXRUZW1wbGF0ZVJlc3VsdCh2YWx1ZSBhcyBUZW1wbGF0ZVJlc3VsdCk7XG4gICAgfSBlbHNlIGlmICgodmFsdWUgYXMgTm9kZSkubm9kZVR5cGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKERFVl9NT0RFICYmIHRoaXMub3B0aW9ucz8uaG9zdCA9PT0gdmFsdWUpIHtcbiAgICAgICAgdGhpcy5fY29tbWl0VGV4dChcbiAgICAgICAgICBgW3Byb2JhYmxlIG1pc3Rha2U6IHJlbmRlcmVkIGEgdGVtcGxhdGUncyBob3N0IGluIGl0c2VsZiBgICtcbiAgICAgICAgICAgIGAoY29tbW9ubHkgY2F1c2VkIGJ5IHdyaXRpbmcgXFwke3RoaXN9IGluIGEgdGVtcGxhdGVdYFxuICAgICAgICApO1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgYEF0dGVtcHRlZCB0byByZW5kZXIgdGhlIHRlbXBsYXRlIGhvc3RgLFxuICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgIGBpbnNpZGUgaXRzZWxmLiBUaGlzIGlzIGFsbW9zdCBhbHdheXMgYSBtaXN0YWtlLCBhbmQgaW4gZGV2IG1vZGUgYCxcbiAgICAgICAgICBgd2UgcmVuZGVyIHNvbWUgd2FybmluZyB0ZXh0LiBJbiBwcm9kdWN0aW9uIGhvd2V2ZXIsIHdlJ2xsIGAsXG4gICAgICAgICAgYHJlbmRlciBpdCwgd2hpY2ggd2lsbCB1c3VhbGx5IHJlc3VsdCBpbiBhbiBlcnJvciwgYW5kIHNvbWV0aW1lcyBgLFxuICAgICAgICAgIGBpbiB0aGUgZWxlbWVudCBkaXNhcHBlYXJpbmcgZnJvbSB0aGUgRE9NLmBcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5fY29tbWl0Tm9kZSh2YWx1ZSBhcyBOb2RlKTtcbiAgICB9IGVsc2UgaWYgKGlzSXRlcmFibGUodmFsdWUpKSB7XG4gICAgICB0aGlzLl9jb21taXRJdGVyYWJsZSh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEZhbGxiYWNrLCB3aWxsIHJlbmRlciB0aGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAgICB0aGlzLl9jb21taXRUZXh0KHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9pbnNlcnQ8VCBleHRlbmRzIE5vZGU+KG5vZGU6IFQpIHtcbiAgICByZXR1cm4gd3JhcCh3cmFwKHRoaXMuXyRzdGFydE5vZGUpLnBhcmVudE5vZGUhKS5pbnNlcnRCZWZvcmUoXG4gICAgICBub2RlLFxuICAgICAgdGhpcy5fJGVuZE5vZGVcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBfY29tbWl0Tm9kZSh2YWx1ZTogTm9kZSk6IHZvaWQge1xuICAgIGlmICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICB0aGlzLl8kY2xlYXIoKTtcbiAgICAgIGlmIChcbiAgICAgICAgRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTICYmXG4gICAgICAgIHNhbml0aXplckZhY3RvcnlJbnRlcm5hbCAhPT0gbm9vcFNhbml0aXplclxuICAgICAgKSB7XG4gICAgICAgIGNvbnN0IHBhcmVudE5vZGVOYW1lID0gdGhpcy5fJHN0YXJ0Tm9kZS5wYXJlbnROb2RlPy5ub2RlTmFtZTtcbiAgICAgICAgaWYgKHBhcmVudE5vZGVOYW1lID09PSAnU1RZTEUnIHx8IHBhcmVudE5vZGVOYW1lID09PSAnU0NSSVBUJykge1xuICAgICAgICAgIGxldCBtZXNzYWdlID0gJ0ZvcmJpZGRlbic7XG4gICAgICAgICAgaWYgKERFVl9NT0RFKSB7XG4gICAgICAgICAgICBpZiAocGFyZW50Tm9kZU5hbWUgPT09ICdTVFlMRScpIHtcbiAgICAgICAgICAgICAgbWVzc2FnZSA9XG4gICAgICAgICAgICAgICAgYExpdCBkb2VzIG5vdCBzdXBwb3J0IGJpbmRpbmcgaW5zaWRlIHN0eWxlIG5vZGVzLiBgICtcbiAgICAgICAgICAgICAgICBgVGhpcyBpcyBhIHNlY3VyaXR5IHJpc2ssIGFzIHN0eWxlIGluamVjdGlvbiBhdHRhY2tzIGNhbiBgICtcbiAgICAgICAgICAgICAgICBgZXhmaWx0cmF0ZSBkYXRhIGFuZCBzcG9vZiBVSXMuIGAgK1xuICAgICAgICAgICAgICAgIGBDb25zaWRlciBpbnN0ZWFkIHVzaW5nIGNzc1xcYC4uLlxcYCBsaXRlcmFscyBgICtcbiAgICAgICAgICAgICAgICBgdG8gY29tcG9zZSBzdHlsZXMsIGFuZCBkbyBkeW5hbWljIHN0eWxpbmcgd2l0aCBgICtcbiAgICAgICAgICAgICAgICBgY3NzIGN1c3RvbSBwcm9wZXJ0aWVzLCA6OnBhcnRzLCA8c2xvdD5zLCBgICtcbiAgICAgICAgICAgICAgICBgYW5kIGJ5IG11dGF0aW5nIHRoZSBET00gcmF0aGVyIHRoYW4gc3R5bGVzaGVldHMuYDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG1lc3NhZ2UgPVxuICAgICAgICAgICAgICAgIGBMaXQgZG9lcyBub3Qgc3VwcG9ydCBiaW5kaW5nIGluc2lkZSBzY3JpcHQgbm9kZXMuIGAgK1xuICAgICAgICAgICAgICAgIGBUaGlzIGlzIGEgc2VjdXJpdHkgcmlzaywgYXMgaXQgY291bGQgYWxsb3cgYXJiaXRyYXJ5IGAgK1xuICAgICAgICAgICAgICAgIGBjb2RlIGV4ZWN1dGlvbi5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgICAgZGVidWdMb2dFdmVudCh7XG4gICAgICAgICAga2luZDogJ2NvbW1pdCBub2RlJyxcbiAgICAgICAgICBzdGFydDogdGhpcy5fJHN0YXJ0Tm9kZSxcbiAgICAgICAgICBwYXJlbnQ6IHRoaXMuXyRwYXJlbnQsXG4gICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgfSk7XG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSB0aGlzLl9pbnNlcnQodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2NvbW1pdFRleHQodmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICAvLyBJZiB0aGUgY29tbWl0dGVkIHZhbHVlIGlzIGEgcHJpbWl0aXZlIGl0IG1lYW5zIHdlIGNhbGxlZCBfY29tbWl0VGV4dCBvblxuICAgIC8vIHRoZSBwcmV2aW91cyByZW5kZXIsIGFuZCB3ZSBrbm93IHRoYXQgdGhpcy5fJHN0YXJ0Tm9kZS5uZXh0U2libGluZyBpcyBhXG4gICAgLy8gVGV4dCBub2RlLiBXZSBjYW4gbm93IGp1c3QgcmVwbGFjZSB0aGUgdGV4dCBjb250ZW50ICguZGF0YSkgb2YgdGhlIG5vZGUuXG4gICAgaWYgKFxuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlICE9PSBub3RoaW5nICYmXG4gICAgICBpc1ByaW1pdGl2ZSh0aGlzLl8kY29tbWl0dGVkVmFsdWUpXG4gICAgKSB7XG4gICAgICBjb25zdCBub2RlID0gd3JhcCh0aGlzLl8kc3RhcnROb2RlKS5uZXh0U2libGluZyBhcyBUZXh0O1xuICAgICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgICBpZiAodGhpcy5fdGV4dFNhbml0aXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhpcy5fdGV4dFNhbml0aXplciA9IGNyZWF0ZVNhbml0aXplcihub2RlLCAnZGF0YScsICdwcm9wZXJ0eScpO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlID0gdGhpcy5fdGV4dFNhbml0aXplcih2YWx1ZSk7XG4gICAgICB9XG4gICAgICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAgICAgIGtpbmQ6ICdjb21taXQgdGV4dCcsXG4gICAgICAgICAgbm9kZSxcbiAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgIH0pO1xuICAgICAgKG5vZGUgYXMgVGV4dCkuZGF0YSA9IHZhbHVlIGFzIHN0cmluZztcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgICBjb25zdCB0ZXh0Tm9kZSA9IGQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgICB0aGlzLl9jb21taXROb2RlKHRleHROb2RlKTtcbiAgICAgICAgLy8gV2hlbiBzZXR0aW5nIHRleHQgY29udGVudCwgZm9yIHNlY3VyaXR5IHB1cnBvc2VzIGl0IG1hdHRlcnMgYSBsb3RcbiAgICAgICAgLy8gd2hhdCB0aGUgcGFyZW50IGlzLiBGb3IgZXhhbXBsZSwgPHN0eWxlPiBhbmQgPHNjcmlwdD4gbmVlZCB0byBiZVxuICAgICAgICAvLyBoYW5kbGVkIHdpdGggY2FyZSwgd2hpbGUgPHNwYW4+IGRvZXMgbm90LiBTbyBmaXJzdCB3ZSBuZWVkIHRvIHB1dCBhXG4gICAgICAgIC8vIHRleHQgbm9kZSBpbnRvIHRoZSBkb2N1bWVudCwgdGhlbiB3ZSBjYW4gc2FuaXRpemUgaXRzIGNvbnRlbnQuXG4gICAgICAgIGlmICh0aGlzLl90ZXh0U2FuaXRpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aGlzLl90ZXh0U2FuaXRpemVyID0gY3JlYXRlU2FuaXRpemVyKHRleHROb2RlLCAnZGF0YScsICdwcm9wZXJ0eScpO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlID0gdGhpcy5fdGV4dFNhbml0aXplcih2YWx1ZSk7XG4gICAgICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAgICAgIGtpbmQ6ICdjb21taXQgdGV4dCcsXG4gICAgICAgICAgICBub2RlOiB0ZXh0Tm9kZSxcbiAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICAgIH0pO1xuICAgICAgICB0ZXh0Tm9kZS5kYXRhID0gdmFsdWUgYXMgc3RyaW5nO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fY29tbWl0Tm9kZShkLmNyZWF0ZVRleHROb2RlKHZhbHVlIGFzIHN0cmluZykpO1xuICAgICAgICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgICAgICAgZGVidWdMb2dFdmVudCh7XG4gICAgICAgICAgICBraW5kOiAnY29tbWl0IHRleHQnLFxuICAgICAgICAgICAgbm9kZTogd3JhcCh0aGlzLl8kc3RhcnROb2RlKS5uZXh0U2libGluZyBhcyBUZXh0LFxuICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IHZhbHVlO1xuICB9XG5cbiAgcHJpdmF0ZSBfY29tbWl0VGVtcGxhdGVSZXN1bHQoXG4gICAgcmVzdWx0OiBUZW1wbGF0ZVJlc3VsdCB8IENvbXBpbGVkVGVtcGxhdGVSZXN1bHRcbiAgKTogdm9pZCB7XG4gICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICBjb25zdCB7dmFsdWVzLCBbJ18kbGl0VHlwZSQnXTogdHlwZX0gPSByZXN1bHQ7XG4gICAgLy8gSWYgJGxpdFR5cGUkIGlzIGEgbnVtYmVyLCByZXN1bHQgaXMgYSBwbGFpbiBUZW1wbGF0ZVJlc3VsdCBhbmQgd2UgZ2V0XG4gICAgLy8gdGhlIHRlbXBsYXRlIGZyb20gdGhlIHRlbXBsYXRlIGNhY2hlLiBJZiBub3QsIHJlc3VsdCBpcyBhXG4gICAgLy8gQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdCBhbmQgXyRsaXRUeXBlJCBpcyBhIENvbXBpbGVkVGVtcGxhdGUgYW5kIHdlIG5lZWRcbiAgICAvLyB0byBjcmVhdGUgdGhlIDx0ZW1wbGF0ZT4gZWxlbWVudCB0aGUgZmlyc3QgdGltZSB3ZSBzZWUgaXQuXG4gICAgY29uc3QgdGVtcGxhdGU6IFRlbXBsYXRlIHwgQ29tcGlsZWRUZW1wbGF0ZSA9XG4gICAgICB0eXBlb2YgdHlwZSA9PT0gJ251bWJlcidcbiAgICAgICAgPyB0aGlzLl8kZ2V0VGVtcGxhdGUocmVzdWx0IGFzIFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdClcbiAgICAgICAgOiAodHlwZS5lbCA9PT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAodHlwZS5lbCA9IFRlbXBsYXRlLmNyZWF0ZUVsZW1lbnQoXG4gICAgICAgICAgICAgIHRydXN0RnJvbVRlbXBsYXRlU3RyaW5nKHR5cGUuaCwgdHlwZS5oWzBdKSxcbiAgICAgICAgICAgICAgdGhpcy5vcHRpb25zXG4gICAgICAgICAgICApKSxcbiAgICAgICAgICB0eXBlKTtcblxuICAgIGlmICgodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIFRlbXBsYXRlSW5zdGFuY2UpPy5fJHRlbXBsYXRlID09PSB0ZW1wbGF0ZSkge1xuICAgICAgZGVidWdMb2dFdmVudCAmJlxuICAgICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAgICBraW5kOiAndGVtcGxhdGUgdXBkYXRpbmcnLFxuICAgICAgICAgIHRlbXBsYXRlLFxuICAgICAgICAgIGluc3RhbmNlOiB0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgVGVtcGxhdGVJbnN0YW5jZSxcbiAgICAgICAgICBwYXJ0czogKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBUZW1wbGF0ZUluc3RhbmNlKS5fJHBhcnRzLFxuICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgICB2YWx1ZXMsXG4gICAgICAgIH0pO1xuICAgICAgKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBUZW1wbGF0ZUluc3RhbmNlKS5fdXBkYXRlKHZhbHVlcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGluc3RhbmNlID0gbmV3IFRlbXBsYXRlSW5zdGFuY2UodGVtcGxhdGUgYXMgVGVtcGxhdGUsIHRoaXMpO1xuICAgICAgY29uc3QgZnJhZ21lbnQgPSBpbnN0YW5jZS5fY2xvbmUodGhpcy5vcHRpb25zKTtcbiAgICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgICAgZGVidWdMb2dFdmVudCh7XG4gICAgICAgICAga2luZDogJ3RlbXBsYXRlIGluc3RhbnRpYXRlZCcsXG4gICAgICAgICAgdGVtcGxhdGUsXG4gICAgICAgICAgaW5zdGFuY2UsXG4gICAgICAgICAgcGFydHM6IGluc3RhbmNlLl8kcGFydHMsXG4gICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICAgIGZyYWdtZW50LFxuICAgICAgICAgIHZhbHVlcyxcbiAgICAgICAgfSk7XG4gICAgICBpbnN0YW5jZS5fdXBkYXRlKHZhbHVlcyk7XG4gICAgICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSBpbnN0YW50aWF0ZWQgYW5kIHVwZGF0ZWQnLFxuICAgICAgICAgIHRlbXBsYXRlLFxuICAgICAgICAgIGluc3RhbmNlLFxuICAgICAgICAgIHBhcnRzOiBpbnN0YW5jZS5fJHBhcnRzLFxuICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgICBmcmFnbWVudCxcbiAgICAgICAgICB2YWx1ZXMsXG4gICAgICAgIH0pO1xuICAgICAgdGhpcy5fY29tbWl0Tm9kZShmcmFnbWVudCk7XG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSBpbnN0YW5jZTtcbiAgICB9XG4gIH1cblxuICAvLyBPdmVycmlkZGVuIHZpYSBgbGl0SHRtbFBvbHlmaWxsU3VwcG9ydGAgdG8gcHJvdmlkZSBwbGF0Zm9ybSBzdXBwb3J0LlxuICAvKiogQGludGVybmFsICovXG4gIF8kZ2V0VGVtcGxhdGUocmVzdWx0OiBVbmNvbXBpbGVkVGVtcGxhdGVSZXN1bHQpIHtcbiAgICBsZXQgdGVtcGxhdGUgPSB0ZW1wbGF0ZUNhY2hlLmdldChyZXN1bHQuc3RyaW5ncyk7XG4gICAgaWYgKHRlbXBsYXRlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRlbXBsYXRlQ2FjaGUuc2V0KHJlc3VsdC5zdHJpbmdzLCAodGVtcGxhdGUgPSBuZXcgVGVtcGxhdGUocmVzdWx0KSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGVtcGxhdGU7XG4gIH1cblxuICBwcml2YXRlIF9jb21taXRJdGVyYWJsZSh2YWx1ZTogSXRlcmFibGU8dW5rbm93bj4pOiB2b2lkIHtcbiAgICAvLyBGb3IgYW4gSXRlcmFibGUsIHdlIGNyZWF0ZSBhIG5ldyBJbnN0YW5jZVBhcnQgcGVyIGl0ZW0sIHRoZW4gc2V0IGl0c1xuICAgIC8vIHZhbHVlIHRvIHRoZSBpdGVtLiBUaGlzIGlzIGEgbGl0dGxlIGJpdCBvZiBvdmVyaGVhZCBmb3IgZXZlcnkgaXRlbSBpblxuICAgIC8vIGFuIEl0ZXJhYmxlLCBidXQgaXQgbGV0cyB1cyByZWN1cnNlIGVhc2lseSBhbmQgZWZmaWNpZW50bHkgdXBkYXRlIEFycmF5c1xuICAgIC8vIG9mIFRlbXBsYXRlUmVzdWx0cyB0aGF0IHdpbGwgYmUgY29tbW9ubHkgcmV0dXJuZWQgZnJvbSBleHByZXNzaW9ucyBsaWtlOlxuICAgIC8vIGFycmF5Lm1hcCgoaSkgPT4gaHRtbGAke2l9YCksIGJ5IHJldXNpbmcgZXhpc3RpbmcgVGVtcGxhdGVJbnN0YW5jZXMuXG5cbiAgICAvLyBJZiB2YWx1ZSBpcyBhbiBhcnJheSwgdGhlbiB0aGUgcHJldmlvdXMgcmVuZGVyIHdhcyBvZiBhblxuICAgIC8vIGl0ZXJhYmxlIGFuZCB2YWx1ZSB3aWxsIGNvbnRhaW4gdGhlIENoaWxkUGFydHMgZnJvbSB0aGUgcHJldmlvdXNcbiAgICAvLyByZW5kZXIuIElmIHZhbHVlIGlzIG5vdCBhbiBhcnJheSwgY2xlYXIgdGhpcyBwYXJ0IGFuZCBtYWtlIGEgbmV3XG4gICAgLy8gYXJyYXkgZm9yIENoaWxkUGFydHMuXG4gICAgaWYgKCFpc0FycmF5KHRoaXMuXyRjb21taXR0ZWRWYWx1ZSkpIHtcbiAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IFtdO1xuICAgICAgdGhpcy5fJGNsZWFyKCk7XG4gICAgfVxuXG4gICAgLy8gTGV0cyB1cyBrZWVwIHRyYWNrIG9mIGhvdyBtYW55IGl0ZW1zIHdlIHN0YW1wZWQgc28gd2UgY2FuIGNsZWFyIGxlZnRvdmVyXG4gICAgLy8gaXRlbXMgZnJvbSBhIHByZXZpb3VzIHJlbmRlclxuICAgIGNvbnN0IGl0ZW1QYXJ0cyA9IHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBDaGlsZFBhcnRbXTtcbiAgICBsZXQgcGFydEluZGV4ID0gMDtcbiAgICBsZXQgaXRlbVBhcnQ6IENoaWxkUGFydCB8IHVuZGVmaW5lZDtcblxuICAgIGZvciAoY29uc3QgaXRlbSBvZiB2YWx1ZSkge1xuICAgICAgaWYgKHBhcnRJbmRleCA9PT0gaXRlbVBhcnRzLmxlbmd0aCkge1xuICAgICAgICAvLyBJZiBubyBleGlzdGluZyBwYXJ0LCBjcmVhdGUgYSBuZXcgb25lXG4gICAgICAgIC8vIFRPRE8gKGp1c3RpbmZhZ25hbmkpOiB0ZXN0IHBlcmYgaW1wYWN0IG9mIGFsd2F5cyBjcmVhdGluZyB0d28gcGFydHNcbiAgICAgICAgLy8gaW5zdGVhZCBvZiBzaGFyaW5nIHBhcnRzIGJldHdlZW4gbm9kZXNcbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2xpdC9saXQvaXNzdWVzLzEyNjZcbiAgICAgICAgaXRlbVBhcnRzLnB1c2goXG4gICAgICAgICAgKGl0ZW1QYXJ0ID0gbmV3IENoaWxkUGFydChcbiAgICAgICAgICAgIHRoaXMuX2luc2VydChjcmVhdGVNYXJrZXIoKSksXG4gICAgICAgICAgICB0aGlzLl9pbnNlcnQoY3JlYXRlTWFya2VyKCkpLFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgIHRoaXMub3B0aW9uc1xuICAgICAgICAgICkpXG4gICAgICAgICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBSZXVzZSBhbiBleGlzdGluZyBwYXJ0XG4gICAgICAgIGl0ZW1QYXJ0ID0gaXRlbVBhcnRzW3BhcnRJbmRleF07XG4gICAgICB9XG4gICAgICBpdGVtUGFydC5fJHNldFZhbHVlKGl0ZW0pO1xuICAgICAgcGFydEluZGV4Kys7XG4gICAgfVxuXG4gICAgaWYgKHBhcnRJbmRleCA8IGl0ZW1QYXJ0cy5sZW5ndGgpIHtcbiAgICAgIC8vIGl0ZW1QYXJ0cyBhbHdheXMgaGF2ZSBlbmQgbm9kZXNcbiAgICAgIHRoaXMuXyRjbGVhcihcbiAgICAgICAgaXRlbVBhcnQgJiYgd3JhcChpdGVtUGFydC5fJGVuZE5vZGUhKS5uZXh0U2libGluZyxcbiAgICAgICAgcGFydEluZGV4XG4gICAgICApO1xuICAgICAgLy8gVHJ1bmNhdGUgdGhlIHBhcnRzIGFycmF5IHNvIF92YWx1ZSByZWZsZWN0cyB0aGUgY3VycmVudCBzdGF0ZVxuICAgICAgaXRlbVBhcnRzLmxlbmd0aCA9IHBhcnRJbmRleDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyB0aGUgbm9kZXMgY29udGFpbmVkIHdpdGhpbiB0aGlzIFBhcnQgZnJvbSB0aGUgRE9NLlxuICAgKlxuICAgKiBAcGFyYW0gc3RhcnQgU3RhcnQgbm9kZSB0byBjbGVhciBmcm9tLCBmb3IgY2xlYXJpbmcgYSBzdWJzZXQgb2YgdGhlIHBhcnQnc1xuICAgKiAgICAgRE9NICh1c2VkIHdoZW4gdHJ1bmNhdGluZyBpdGVyYWJsZXMpXG4gICAqIEBwYXJhbSBmcm9tICBXaGVuIGBzdGFydGAgaXMgc3BlY2lmaWVkLCB0aGUgaW5kZXggd2l0aGluIHRoZSBpdGVyYWJsZSBmcm9tXG4gICAqICAgICB3aGljaCBDaGlsZFBhcnRzIGFyZSBiZWluZyByZW1vdmVkLCB1c2VkIGZvciBkaXNjb25uZWN0aW5nIGRpcmVjdGl2ZXMgaW5cbiAgICogICAgIHRob3NlIFBhcnRzLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIF8kY2xlYXIoXG4gICAgc3RhcnQ6IENoaWxkTm9kZSB8IG51bGwgPSB3cmFwKHRoaXMuXyRzdGFydE5vZGUpLm5leHRTaWJsaW5nLFxuICAgIGZyb20/OiBudW1iZXJcbiAgKSB7XG4gICAgdGhpcy5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkPy4oZmFsc2UsIHRydWUsIGZyb20pO1xuICAgIHdoaWxlIChzdGFydCAmJiBzdGFydCAhPT0gdGhpcy5fJGVuZE5vZGUpIHtcbiAgICAgIGNvbnN0IG4gPSB3cmFwKHN0YXJ0ISkubmV4dFNpYmxpbmc7XG4gICAgICAod3JhcChzdGFydCEpIGFzIEVsZW1lbnQpLnJlbW92ZSgpO1xuICAgICAgc3RhcnQgPSBuO1xuICAgIH1cbiAgfVxuICAvKipcbiAgICogSW1wbGVtZW50YXRpb24gb2YgUm9vdFBhcnQncyBgaXNDb25uZWN0ZWRgLiBOb3RlIHRoYXQgdGhpcyBtZXRob2RcbiAgICogc2hvdWxkIG9ubHkgYmUgY2FsbGVkIG9uIGBSb290UGFydGBzICh0aGUgYENoaWxkUGFydGAgcmV0dXJuZWQgZnJvbSBhXG4gICAqIHRvcC1sZXZlbCBgcmVuZGVyKClgIGNhbGwpLiBJdCBoYXMgbm8gZWZmZWN0IG9uIG5vbi1yb290IENoaWxkUGFydHMuXG4gICAqIEBwYXJhbSBpc0Nvbm5lY3RlZCBXaGV0aGVyIHRvIHNldFxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHNldENvbm5lY3RlZChpc0Nvbm5lY3RlZDogYm9vbGVhbikge1xuICAgIGlmICh0aGlzLl8kcGFyZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX19pc0Nvbm5lY3RlZCA9IGlzQ29ubmVjdGVkO1xuICAgICAgdGhpcy5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkPy4oaXNDb25uZWN0ZWQpO1xuICAgIH0gZWxzZSBpZiAoREVWX01PREUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ3BhcnQuc2V0Q29ubmVjdGVkKCkgbWF5IG9ubHkgYmUgY2FsbGVkIG9uIGEgJyArXG4gICAgICAgICAgJ1Jvb3RQYXJ0IHJldHVybmVkIGZyb20gcmVuZGVyKCkuJ1xuICAgICAgKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBIHRvcC1sZXZlbCBgQ2hpbGRQYXJ0YCByZXR1cm5lZCBmcm9tIGByZW5kZXJgIHRoYXQgbWFuYWdlcyB0aGUgY29ubmVjdGVkXG4gKiBzdGF0ZSBvZiBgQXN5bmNEaXJlY3RpdmVgcyBjcmVhdGVkIHRocm91Z2hvdXQgdGhlIHRyZWUgYmVsb3cgaXQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUm9vdFBhcnQgZXh0ZW5kcyBDaGlsZFBhcnQge1xuICAvKipcbiAgICogU2V0cyB0aGUgY29ubmVjdGlvbiBzdGF0ZSBmb3IgYEFzeW5jRGlyZWN0aXZlYHMgY29udGFpbmVkIHdpdGhpbiB0aGlzIHJvb3RcbiAgICogQ2hpbGRQYXJ0LlxuICAgKlxuICAgKiBsaXQtaHRtbCBkb2VzIG5vdCBhdXRvbWF0aWNhbGx5IG1vbml0b3IgdGhlIGNvbm5lY3RlZG5lc3Mgb2YgRE9NIHJlbmRlcmVkO1xuICAgKiBhcyBzdWNoLCBpdCBpcyB0aGUgcmVzcG9uc2liaWxpdHkgb2YgdGhlIGNhbGxlciB0byBgcmVuZGVyYCB0byBlbnN1cmUgdGhhdFxuICAgKiBgcGFydC5zZXRDb25uZWN0ZWQoZmFsc2UpYCBpcyBjYWxsZWQgYmVmb3JlIHRoZSBwYXJ0IG9iamVjdCBpcyBwb3RlbnRpYWxseVxuICAgKiBkaXNjYXJkZWQsIHRvIGVuc3VyZSB0aGF0IGBBc3luY0RpcmVjdGl2ZWBzIGhhdmUgYSBjaGFuY2UgdG8gZGlzcG9zZSBvZlxuICAgKiBhbnkgcmVzb3VyY2VzIGJlaW5nIGhlbGQuIElmIGEgYFJvb3RQYXJ0YCB0aGF0IHdhcyBwcmV2aW91c2x5XG4gICAqIGRpc2Nvbm5lY3RlZCBpcyBzdWJzZXF1ZW50bHkgcmUtY29ubmVjdGVkIChhbmQgaXRzIGBBc3luY0RpcmVjdGl2ZWBzIHNob3VsZFxuICAgKiByZS1jb25uZWN0KSwgYHNldENvbm5lY3RlZCh0cnVlKWAgc2hvdWxkIGJlIGNhbGxlZC5cbiAgICpcbiAgICogQHBhcmFtIGlzQ29ubmVjdGVkIFdoZXRoZXIgZGlyZWN0aXZlcyB3aXRoaW4gdGhpcyB0cmVlIHNob3VsZCBiZSBjb25uZWN0ZWRcbiAgICogb3Igbm90XG4gICAqL1xuICBzZXRDb25uZWN0ZWQoaXNDb25uZWN0ZWQ6IGJvb2xlYW4pOiB2b2lkO1xufVxuXG5leHBvcnQgdHlwZSB7QXR0cmlidXRlUGFydH07XG5jbGFzcyBBdHRyaWJ1dGVQYXJ0IGltcGxlbWVudHMgRGlzY29ubmVjdGFibGUge1xuICByZWFkb25seSB0eXBlOlxuICAgIHwgdHlwZW9mIEFUVFJJQlVURV9QQVJUXG4gICAgfCB0eXBlb2YgUFJPUEVSVFlfUEFSVFxuICAgIHwgdHlwZW9mIEJPT0xFQU5fQVRUUklCVVRFX1BBUlRcbiAgICB8IHR5cGVvZiBFVkVOVF9QQVJUID0gQVRUUklCVVRFX1BBUlQ7XG4gIHJlYWRvbmx5IGVsZW1lbnQ6IEhUTUxFbGVtZW50O1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIElmIHRoaXMgYXR0cmlidXRlIHBhcnQgcmVwcmVzZW50cyBhbiBpbnRlcnBvbGF0aW9uLCB0aGlzIGNvbnRhaW5zIHRoZVxuICAgKiBzdGF0aWMgc3RyaW5ncyBvZiB0aGUgaW50ZXJwb2xhdGlvbi4gRm9yIHNpbmdsZS12YWx1ZSwgY29tcGxldGUgYmluZGluZ3MsXG4gICAqIHRoaXMgaXMgdW5kZWZpbmVkLlxuICAgKi9cbiAgcmVhZG9ubHkgc3RyaW5ncz86IFJlYWRvbmx5QXJyYXk8c3RyaW5nPjtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGNvbW1pdHRlZFZhbHVlOiB1bmtub3duIHwgQXJyYXk8dW5rbm93bj4gPSBub3RoaW5nO1xuICAvKiogQGludGVybmFsICovXG4gIF9fZGlyZWN0aXZlcz86IEFycmF5PERpcmVjdGl2ZSB8IHVuZGVmaW5lZD47XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlO1xuICAvKiogQGludGVybmFsICovXG4gIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT4gPSB1bmRlZmluZWQ7XG5cbiAgcHJvdGVjdGVkIF9zYW5pdGl6ZXI6IFZhbHVlU2FuaXRpemVyIHwgdW5kZWZpbmVkO1xuXG4gIGdldCB0YWdOYW1lKCkge1xuICAgIHJldHVybiB0aGlzLmVsZW1lbnQudGFnTmFtZTtcbiAgfVxuXG4gIC8vIFNlZSBjb21tZW50IGluIERpc2Nvbm5lY3RhYmxlIGludGVyZmFjZSBmb3Igd2h5IHRoaXMgaXMgYSBnZXR0ZXJcbiAgZ2V0IF8kaXNDb25uZWN0ZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuXyRwYXJlbnQuXyRpc0Nvbm5lY3RlZDtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGVsZW1lbnQ6IEhUTUxFbGVtZW50LFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBzdHJpbmdzOiBSZWFkb25seUFycmF5PHN0cmluZz4sXG4gICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSxcbiAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkXG4gICkge1xuICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLl8kcGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgaWYgKHN0cmluZ3MubGVuZ3RoID4gMiB8fCBzdHJpbmdzWzBdICE9PSAnJyB8fCBzdHJpbmdzWzFdICE9PSAnJykge1xuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gbmV3IEFycmF5KHN0cmluZ3MubGVuZ3RoIC0gMSkuZmlsbChuZXcgU3RyaW5nKCkpO1xuICAgICAgdGhpcy5zdHJpbmdzID0gc3RyaW5ncztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gbm90aGluZztcbiAgICB9XG4gICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgdGhpcy5fc2FuaXRpemVyID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiB0aGlzIHBhcnQgYnkgcmVzb2x2aW5nIHRoZSB2YWx1ZSBmcm9tIHBvc3NpYmx5IG11bHRpcGxlXG4gICAqIHZhbHVlcyBhbmQgc3RhdGljIHN0cmluZ3MgYW5kIGNvbW1pdHRpbmcgaXQgdG8gdGhlIERPTS5cbiAgICogSWYgdGhpcyBwYXJ0IGlzIHNpbmdsZS12YWx1ZWQsIGB0aGlzLl9zdHJpbmdzYCB3aWxsIGJlIHVuZGVmaW5lZCwgYW5kIHRoZVxuICAgKiBtZXRob2Qgd2lsbCBiZSBjYWxsZWQgd2l0aCBhIHNpbmdsZSB2YWx1ZSBhcmd1bWVudC4gSWYgdGhpcyBwYXJ0IGlzXG4gICAqIG11bHRpLXZhbHVlLCBgdGhpcy5fc3RyaW5nc2Agd2lsbCBiZSBkZWZpbmVkLCBhbmQgdGhlIG1ldGhvZCBpcyBjYWxsZWRcbiAgICogd2l0aCB0aGUgdmFsdWUgYXJyYXkgb2YgdGhlIHBhcnQncyBvd25pbmcgVGVtcGxhdGVJbnN0YW5jZSwgYW5kIGFuIG9mZnNldFxuICAgKiBpbnRvIHRoZSB2YWx1ZSBhcnJheSBmcm9tIHdoaWNoIHRoZSB2YWx1ZXMgc2hvdWxkIGJlIHJlYWQuXG4gICAqIFRoaXMgbWV0aG9kIGlzIG92ZXJsb2FkZWQgdGhpcyB3YXkgdG8gZWxpbWluYXRlIHNob3J0LWxpdmVkIGFycmF5IHNsaWNlc1xuICAgKiBvZiB0aGUgdGVtcGxhdGUgaW5zdGFuY2UgdmFsdWVzLCBhbmQgYWxsb3cgYSBmYXN0LXBhdGggZm9yIHNpbmdsZS12YWx1ZWRcbiAgICogcGFydHMuXG4gICAqXG4gICAqIEBwYXJhbSB2YWx1ZSBUaGUgcGFydCB2YWx1ZSwgb3IgYW4gYXJyYXkgb2YgdmFsdWVzIGZvciBtdWx0aS12YWx1ZWQgcGFydHNcbiAgICogQHBhcmFtIHZhbHVlSW5kZXggdGhlIGluZGV4IHRvIHN0YXJ0IHJlYWRpbmcgdmFsdWVzIGZyb20uIGB1bmRlZmluZWRgIGZvclxuICAgKiAgIHNpbmdsZS12YWx1ZWQgcGFydHNcbiAgICogQHBhcmFtIG5vQ29tbWl0IGNhdXNlcyB0aGUgcGFydCB0byBub3QgY29tbWl0IGl0cyB2YWx1ZSB0byB0aGUgRE9NLiBVc2VkXG4gICAqICAgaW4gaHlkcmF0aW9uIHRvIHByaW1lIGF0dHJpYnV0ZSBwYXJ0cyB3aXRoIHRoZWlyIGZpcnN0LXJlbmRlcmVkIHZhbHVlLFxuICAgKiAgIGJ1dCBub3Qgc2V0IHRoZSBhdHRyaWJ1dGUsIGFuZCBpbiBTU1IgdG8gbm8tb3AgdGhlIERPTSBvcGVyYXRpb24gYW5kXG4gICAqICAgY2FwdHVyZSB0aGUgdmFsdWUgZm9yIHNlcmlhbGl6YXRpb24uXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgXyRzZXRWYWx1ZShcbiAgICB2YWx1ZTogdW5rbm93biB8IEFycmF5PHVua25vd24+LFxuICAgIGRpcmVjdGl2ZVBhcmVudDogRGlyZWN0aXZlUGFyZW50ID0gdGhpcyxcbiAgICB2YWx1ZUluZGV4PzogbnVtYmVyLFxuICAgIG5vQ29tbWl0PzogYm9vbGVhblxuICApIHtcbiAgICBjb25zdCBzdHJpbmdzID0gdGhpcy5zdHJpbmdzO1xuXG4gICAgLy8gV2hldGhlciBhbnkgb2YgdGhlIHZhbHVlcyBoYXMgY2hhbmdlZCwgZm9yIGRpcnR5LWNoZWNraW5nXG4gICAgbGV0IGNoYW5nZSA9IGZhbHNlO1xuXG4gICAgaWYgKHN0cmluZ3MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gU2luZ2xlLXZhbHVlIGJpbmRpbmcgY2FzZVxuICAgICAgdmFsdWUgPSByZXNvbHZlRGlyZWN0aXZlKHRoaXMsIHZhbHVlLCBkaXJlY3RpdmVQYXJlbnQsIDApO1xuICAgICAgY2hhbmdlID1cbiAgICAgICAgIWlzUHJpbWl0aXZlKHZhbHVlKSB8fFxuICAgICAgICAodmFsdWUgIT09IHRoaXMuXyRjb21taXR0ZWRWYWx1ZSAmJiB2YWx1ZSAhPT0gbm9DaGFuZ2UpO1xuICAgICAgaWYgKGNoYW5nZSkge1xuICAgICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSW50ZXJwb2xhdGlvbiBjYXNlXG4gICAgICBjb25zdCB2YWx1ZXMgPSB2YWx1ZSBhcyBBcnJheTx1bmtub3duPjtcbiAgICAgIHZhbHVlID0gc3RyaW5nc1swXTtcblxuICAgICAgbGV0IGksIHY7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgc3RyaW5ncy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgdiA9IHJlc29sdmVEaXJlY3RpdmUodGhpcywgdmFsdWVzW3ZhbHVlSW5kZXghICsgaV0sIGRpcmVjdGl2ZVBhcmVudCwgaSk7XG5cbiAgICAgICAgaWYgKHYgPT09IG5vQ2hhbmdlKSB7XG4gICAgICAgICAgLy8gSWYgdGhlIHVzZXItcHJvdmlkZWQgdmFsdWUgaXMgYG5vQ2hhbmdlYCwgdXNlIHRoZSBwcmV2aW91cyB2YWx1ZVxuICAgICAgICAgIHYgPSAodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIEFycmF5PHVua25vd24+KVtpXTtcbiAgICAgICAgfVxuICAgICAgICBjaGFuZ2UgfHw9XG4gICAgICAgICAgIWlzUHJpbWl0aXZlKHYpIHx8IHYgIT09ICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgQXJyYXk8dW5rbm93bj4pW2ldO1xuICAgICAgICBpZiAodiA9PT0gbm90aGluZykge1xuICAgICAgICAgIHZhbHVlID0gbm90aGluZztcbiAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSAhPT0gbm90aGluZykge1xuICAgICAgICAgIHZhbHVlICs9ICh2ID8/ICcnKSArIHN0cmluZ3NbaSArIDFdO1xuICAgICAgICB9XG4gICAgICAgIC8vIFdlIGFsd2F5cyByZWNvcmQgZWFjaCB2YWx1ZSwgZXZlbiBpZiBvbmUgaXMgYG5vdGhpbmdgLCBmb3IgZnV0dXJlXG4gICAgICAgIC8vIGNoYW5nZSBkZXRlY3Rpb24uXG4gICAgICAgICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgQXJyYXk8dW5rbm93bj4pW2ldID0gdjtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGNoYW5nZSAmJiAhbm9Db21taXQpIHtcbiAgICAgIHRoaXMuX2NvbW1pdFZhbHVlKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIF9jb21taXRWYWx1ZSh2YWx1ZTogdW5rbm93bikge1xuICAgIGlmICh2YWx1ZSA9PT0gbm90aGluZykge1xuICAgICAgKHdyYXAodGhpcy5lbGVtZW50KSBhcyBFbGVtZW50KS5yZW1vdmVBdHRyaWJ1dGUodGhpcy5uYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgICBpZiAodGhpcy5fc2FuaXRpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aGlzLl9zYW5pdGl6ZXIgPSBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwoXG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQsXG4gICAgICAgICAgICB0aGlzLm5hbWUsXG4gICAgICAgICAgICAnYXR0cmlidXRlJ1xuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWUgPSB0aGlzLl9zYW5pdGl6ZXIodmFsdWUgPz8gJycpO1xuICAgICAgfVxuICAgICAgZGVidWdMb2dFdmVudCAmJlxuICAgICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAgICBraW5kOiAnY29tbWl0IGF0dHJpYnV0ZScsXG4gICAgICAgICAgZWxlbWVudDogdGhpcy5lbGVtZW50LFxuICAgICAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgIH0pO1xuICAgICAgKHdyYXAodGhpcy5lbGVtZW50KSBhcyBFbGVtZW50KS5zZXRBdHRyaWJ1dGUoXG4gICAgICAgIHRoaXMubmFtZSxcbiAgICAgICAgKHZhbHVlID8/ICcnKSBhcyBzdHJpbmdcbiAgICAgICk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCB0eXBlIHtQcm9wZXJ0eVBhcnR9O1xuY2xhc3MgUHJvcGVydHlQYXJ0IGV4dGVuZHMgQXR0cmlidXRlUGFydCB7XG4gIG92ZXJyaWRlIHJlYWRvbmx5IHR5cGUgPSBQUk9QRVJUWV9QQVJUO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgb3ZlcnJpZGUgX2NvbW1pdFZhbHVlKHZhbHVlOiB1bmtub3duKSB7XG4gICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgaWYgKHRoaXMuX3Nhbml0aXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX3Nhbml0aXplciA9IHNhbml0aXplckZhY3RvcnlJbnRlcm5hbChcbiAgICAgICAgICB0aGlzLmVsZW1lbnQsXG4gICAgICAgICAgdGhpcy5uYW1lLFxuICAgICAgICAgICdwcm9wZXJ0eSdcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHZhbHVlID0gdGhpcy5fc2FuaXRpemVyKHZhbHVlKTtcbiAgICB9XG4gICAgZGVidWdMb2dFdmVudCAmJlxuICAgICAgZGVidWdMb2dFdmVudCh7XG4gICAgICAgIGtpbmQ6ICdjb21taXQgcHJvcGVydHknLFxuICAgICAgICBlbGVtZW50OiB0aGlzLmVsZW1lbnQsXG4gICAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgICAgdmFsdWUsXG4gICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgIH0pO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgKHRoaXMuZWxlbWVudCBhcyBhbnkpW3RoaXMubmFtZV0gPSB2YWx1ZSA9PT0gbm90aGluZyA/IHVuZGVmaW5lZCA6IHZhbHVlO1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIHtCb29sZWFuQXR0cmlidXRlUGFydH07XG5jbGFzcyBCb29sZWFuQXR0cmlidXRlUGFydCBleHRlbmRzIEF0dHJpYnV0ZVBhcnQge1xuICBvdmVycmlkZSByZWFkb25seSB0eXBlID0gQk9PTEVBTl9BVFRSSUJVVEVfUEFSVDtcblxuICAvKiogQGludGVybmFsICovXG4gIG92ZXJyaWRlIF9jb21taXRWYWx1ZSh2YWx1ZTogdW5rbm93bikge1xuICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAgICBraW5kOiAnY29tbWl0IGJvb2xlYW4gYXR0cmlidXRlJyxcbiAgICAgICAgZWxlbWVudDogdGhpcy5lbGVtZW50LFxuICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgIHZhbHVlOiAhISh2YWx1ZSAmJiB2YWx1ZSAhPT0gbm90aGluZyksXG4gICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgIH0pO1xuICAgICh3cmFwKHRoaXMuZWxlbWVudCkgYXMgRWxlbWVudCkudG9nZ2xlQXR0cmlidXRlKFxuICAgICAgdGhpcy5uYW1lLFxuICAgICAgISF2YWx1ZSAmJiB2YWx1ZSAhPT0gbm90aGluZ1xuICAgICk7XG4gIH1cbn1cblxudHlwZSBFdmVudExpc3RlbmVyV2l0aE9wdGlvbnMgPSBFdmVudExpc3RlbmVyT3JFdmVudExpc3RlbmVyT2JqZWN0ICZcbiAgUGFydGlhbDxBZGRFdmVudExpc3RlbmVyT3B0aW9ucz47XG5cbi8qKlxuICogQW4gQXR0cmlidXRlUGFydCB0aGF0IG1hbmFnZXMgYW4gZXZlbnQgbGlzdGVuZXIgdmlhIGFkZC9yZW1vdmVFdmVudExpc3RlbmVyLlxuICpcbiAqIFRoaXMgcGFydCB3b3JrcyBieSBhZGRpbmcgaXRzZWxmIGFzIHRoZSBldmVudCBsaXN0ZW5lciBvbiBhbiBlbGVtZW50LCB0aGVuXG4gKiBkZWxlZ2F0aW5nIHRvIHRoZSB2YWx1ZSBwYXNzZWQgdG8gaXQuIFRoaXMgcmVkdWNlcyB0aGUgbnVtYmVyIG9mIGNhbGxzIHRvXG4gKiBhZGQvcmVtb3ZlRXZlbnRMaXN0ZW5lciBpZiB0aGUgbGlzdGVuZXIgY2hhbmdlcyBmcmVxdWVudGx5LCBzdWNoIGFzIHdoZW4gYW5cbiAqIGlubGluZSBmdW5jdGlvbiBpcyB1c2VkIGFzIGEgbGlzdGVuZXIuXG4gKlxuICogQmVjYXVzZSBldmVudCBvcHRpb25zIGFyZSBwYXNzZWQgd2hlbiBhZGRpbmcgbGlzdGVuZXJzLCB3ZSBtdXN0IHRha2UgY2FzZVxuICogdG8gYWRkIGFuZCByZW1vdmUgdGhlIHBhcnQgYXMgYSBsaXN0ZW5lciB3aGVuIHRoZSBldmVudCBvcHRpb25zIGNoYW5nZS5cbiAqL1xuZXhwb3J0IHR5cGUge0V2ZW50UGFydH07XG5jbGFzcyBFdmVudFBhcnQgZXh0ZW5kcyBBdHRyaWJ1dGVQYXJ0IHtcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgdHlwZSA9IEVWRU5UX1BBUlQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgZWxlbWVudDogSFRNTEVsZW1lbnQsXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIHN0cmluZ3M6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPixcbiAgICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgc3VwZXIoZWxlbWVudCwgbmFtZSwgc3RyaW5ncywgcGFyZW50LCBvcHRpb25zKTtcblxuICAgIGlmIChERVZfTU9ERSAmJiB0aGlzLnN0cmluZ3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgQSBcXGA8JHtlbGVtZW50LmxvY2FsTmFtZX0+XFxgIGhhcyBhIFxcYEAke25hbWV9PS4uLlxcYCBsaXN0ZW5lciB3aXRoIGAgK1xuICAgICAgICAgICdpbnZhbGlkIGNvbnRlbnQuIEV2ZW50IGxpc3RlbmVycyBpbiB0ZW1wbGF0ZXMgbXVzdCBoYXZlIGV4YWN0bHkgJyArXG4gICAgICAgICAgJ29uZSBleHByZXNzaW9uIGFuZCBubyBzdXJyb3VuZGluZyB0ZXh0LidcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgLy8gRXZlbnRQYXJ0IGRvZXMgbm90IHVzZSB0aGUgYmFzZSBfJHNldFZhbHVlL19yZXNvbHZlVmFsdWUgaW1wbGVtZW50YXRpb25cbiAgLy8gc2luY2UgdGhlIGRpcnR5IGNoZWNraW5nIGlzIG1vcmUgY29tcGxleFxuICAvKiogQGludGVybmFsICovXG4gIG92ZXJyaWRlIF8kc2V0VmFsdWUoXG4gICAgbmV3TGlzdGVuZXI6IHVua25vd24sXG4gICAgZGlyZWN0aXZlUGFyZW50OiBEaXJlY3RpdmVQYXJlbnQgPSB0aGlzXG4gICkge1xuICAgIG5ld0xpc3RlbmVyID1cbiAgICAgIHJlc29sdmVEaXJlY3RpdmUodGhpcywgbmV3TGlzdGVuZXIsIGRpcmVjdGl2ZVBhcmVudCwgMCkgPz8gbm90aGluZztcbiAgICBpZiAobmV3TGlzdGVuZXIgPT09IG5vQ2hhbmdlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG9sZExpc3RlbmVyID0gdGhpcy5fJGNvbW1pdHRlZFZhbHVlO1xuXG4gICAgLy8gSWYgdGhlIG5ldyB2YWx1ZSBpcyBub3RoaW5nIG9yIGFueSBvcHRpb25zIGNoYW5nZSB3ZSBoYXZlIHRvIHJlbW92ZSB0aGVcbiAgICAvLyBwYXJ0IGFzIGEgbGlzdGVuZXIuXG4gICAgY29uc3Qgc2hvdWxkUmVtb3ZlTGlzdGVuZXIgPVxuICAgICAgKG5ld0xpc3RlbmVyID09PSBub3RoaW5nICYmIG9sZExpc3RlbmVyICE9PSBub3RoaW5nKSB8fFxuICAgICAgKG5ld0xpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykuY2FwdHVyZSAhPT1cbiAgICAgICAgKG9sZExpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykuY2FwdHVyZSB8fFxuICAgICAgKG5ld0xpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykub25jZSAhPT1cbiAgICAgICAgKG9sZExpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykub25jZSB8fFxuICAgICAgKG5ld0xpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykucGFzc2l2ZSAhPT1cbiAgICAgICAgKG9sZExpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykucGFzc2l2ZTtcblxuICAgIC8vIElmIHRoZSBuZXcgdmFsdWUgaXMgbm90IG5vdGhpbmcgYW5kIHdlIHJlbW92ZWQgdGhlIGxpc3RlbmVyLCB3ZSBoYXZlXG4gICAgLy8gdG8gYWRkIHRoZSBwYXJ0IGFzIGEgbGlzdGVuZXIuXG4gICAgY29uc3Qgc2hvdWxkQWRkTGlzdGVuZXIgPVxuICAgICAgbmV3TGlzdGVuZXIgIT09IG5vdGhpbmcgJiZcbiAgICAgIChvbGRMaXN0ZW5lciA9PT0gbm90aGluZyB8fCBzaG91bGRSZW1vdmVMaXN0ZW5lcik7XG5cbiAgICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAga2luZDogJ2NvbW1pdCBldmVudCBsaXN0ZW5lcicsXG4gICAgICAgIGVsZW1lbnQ6IHRoaXMuZWxlbWVudCxcbiAgICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgICB2YWx1ZTogbmV3TGlzdGVuZXIsXG4gICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgcmVtb3ZlTGlzdGVuZXI6IHNob3VsZFJlbW92ZUxpc3RlbmVyLFxuICAgICAgICBhZGRMaXN0ZW5lcjogc2hvdWxkQWRkTGlzdGVuZXIsXG4gICAgICAgIG9sZExpc3RlbmVyLFxuICAgICAgfSk7XG4gICAgaWYgKHNob3VsZFJlbW92ZUxpc3RlbmVyKSB7XG4gICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcbiAgICAgICAgdGhpcy5uYW1lLFxuICAgICAgICB0aGlzLFxuICAgICAgICBvbGRMaXN0ZW5lciBhcyBFdmVudExpc3RlbmVyV2l0aE9wdGlvbnNcbiAgICAgICk7XG4gICAgfVxuICAgIGlmIChzaG91bGRBZGRMaXN0ZW5lcikge1xuICAgICAgLy8gQmV3YXJlOiBJRTExIGFuZCBDaHJvbWUgNDEgZG9uJ3QgbGlrZSB1c2luZyB0aGUgbGlzdGVuZXIgYXMgdGhlXG4gICAgICAvLyBvcHRpb25zIG9iamVjdC4gRmlndXJlIG91dCBob3cgdG8gZGVhbCB3LyB0aGlzIGluIElFMTEgLSBtYXliZVxuICAgICAgLy8gcGF0Y2ggYWRkRXZlbnRMaXN0ZW5lcj9cbiAgICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgICB0aGlzLm5hbWUsXG4gICAgICAgIHRoaXMsXG4gICAgICAgIG5ld0xpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9uc1xuICAgICAgKTtcbiAgICB9XG4gICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gbmV3TGlzdGVuZXI7XG4gIH1cblxuICBoYW5kbGVFdmVudChldmVudDogRXZlbnQpIHtcbiAgICBpZiAodHlwZW9mIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlLmNhbGwodGhpcy5vcHRpb25zPy5ob3N0ID8/IHRoaXMuZWxlbWVudCwgZXZlbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIEV2ZW50TGlzdGVuZXJPYmplY3QpLmhhbmRsZUV2ZW50KGV2ZW50KTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUge0VsZW1lbnRQYXJ0fTtcbmNsYXNzIEVsZW1lbnRQYXJ0IGltcGxlbWVudHMgRGlzY29ubmVjdGFibGUge1xuICByZWFkb25seSB0eXBlID0gRUxFTUVOVF9QQVJUO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX19kaXJlY3RpdmU/OiBEaXJlY3RpdmU7XG5cbiAgLy8gVGhpcyBpcyB0byBlbnN1cmUgdGhhdCBldmVyeSBQYXJ0IGhhcyBhIF8kY29tbWl0dGVkVmFsdWVcbiAgXyRjb21taXR0ZWRWYWx1ZTogdW5kZWZpbmVkO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRwYXJlbnQhOiBEaXNjb25uZWN0YWJsZTtcblxuICAvKiogQGludGVybmFsICovXG4gIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT4gPSB1bmRlZmluZWQ7XG5cbiAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgZWxlbWVudDogRWxlbWVudCxcbiAgICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgdGhpcy5fJHBhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICB9XG5cbiAgLy8gU2VlIGNvbW1lbnQgaW4gRGlzY29ubmVjdGFibGUgaW50ZXJmYWNlIGZvciB3aHkgdGhpcyBpcyBhIGdldHRlclxuICBnZXQgXyRpc0Nvbm5lY3RlZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fJHBhcmVudC5fJGlzQ29ubmVjdGVkO1xuICB9XG5cbiAgXyRzZXRWYWx1ZSh2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAgICBraW5kOiAnY29tbWl0IHRvIGVsZW1lbnQgYmluZGluZycsXG4gICAgICAgIGVsZW1lbnQ6IHRoaXMuZWxlbWVudCxcbiAgICAgICAgdmFsdWUsXG4gICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgIH0pO1xuICAgIHJlc29sdmVEaXJlY3RpdmUodGhpcywgdmFsdWUpO1xuICB9XG59XG5cbi8qKlxuICogRU5EIFVTRVJTIFNIT1VMRCBOT1QgUkVMWSBPTiBUSElTIE9CSkVDVC5cbiAqXG4gKiBQcml2YXRlIGV4cG9ydHMgZm9yIHVzZSBieSBvdGhlciBMaXQgcGFja2FnZXMsIG5vdCBpbnRlbmRlZCBmb3IgdXNlIGJ5XG4gKiBleHRlcm5hbCB1c2Vycy5cbiAqXG4gKiBXZSBjdXJyZW50bHkgZG8gbm90IG1ha2UgYSBtYW5nbGVkIHJvbGx1cCBidWlsZCBvZiB0aGUgbGl0LXNzciBjb2RlLiBJbiBvcmRlclxuICogdG8ga2VlcCBhIG51bWJlciBvZiAob3RoZXJ3aXNlIHByaXZhdGUpIHRvcC1sZXZlbCBleHBvcnRzIG1hbmdsZWQgaW4gdGhlXG4gKiBjbGllbnQgc2lkZSBjb2RlLCB3ZSBleHBvcnQgYSBfJExIIG9iamVjdCBjb250YWluaW5nIHRob3NlIG1lbWJlcnMgKG9yXG4gKiBoZWxwZXIgbWV0aG9kcyBmb3IgYWNjZXNzaW5nIHByaXZhdGUgZmllbGRzIG9mIHRob3NlIG1lbWJlcnMpLCBhbmQgdGhlblxuICogcmUtZXhwb3J0IHRoZW0gZm9yIHVzZSBpbiBsaXQtc3NyLiBUaGlzIGtlZXBzIGxpdC1zc3IgYWdub3N0aWMgdG8gd2hldGhlciB0aGVcbiAqIGNsaWVudC1zaWRlIGNvZGUgaXMgYmVpbmcgdXNlZCBpbiBgZGV2YCBtb2RlIG9yIGBwcm9kYCBtb2RlLlxuICpcbiAqIFRoaXMgaGFzIGEgdW5pcXVlIG5hbWUsIHRvIGRpc2FtYmlndWF0ZSBpdCBmcm9tIHByaXZhdGUgZXhwb3J0cyBpblxuICogbGl0LWVsZW1lbnQsIHdoaWNoIHJlLWV4cG9ydHMgYWxsIG9mIGxpdC1odG1sLlxuICpcbiAqIEBwcml2YXRlXG4gKi9cbmV4cG9ydCBjb25zdCBfJExIID0ge1xuICAvLyBVc2VkIGluIGxpdC1zc3JcbiAgX2JvdW5kQXR0cmlidXRlU3VmZml4OiBib3VuZEF0dHJpYnV0ZVN1ZmZpeCxcbiAgX21hcmtlcjogbWFya2VyLFxuICBfbWFya2VyTWF0Y2g6IG1hcmtlck1hdGNoLFxuICBfSFRNTF9SRVNVTFQ6IEhUTUxfUkVTVUxULFxuICBfZ2V0VGVtcGxhdGVIdG1sOiBnZXRUZW1wbGF0ZUh0bWwsXG4gIC8vIFVzZWQgaW4gdGVzdHMgYW5kIHByaXZhdGUtc3NyLXN1cHBvcnRcbiAgX1RlbXBsYXRlSW5zdGFuY2U6IFRlbXBsYXRlSW5zdGFuY2UsXG4gIF9pc0l0ZXJhYmxlOiBpc0l0ZXJhYmxlLFxuICBfcmVzb2x2ZURpcmVjdGl2ZTogcmVzb2x2ZURpcmVjdGl2ZSxcbiAgX0NoaWxkUGFydDogQ2hpbGRQYXJ0LFxuICBfQXR0cmlidXRlUGFydDogQXR0cmlidXRlUGFydCxcbiAgX0Jvb2xlYW5BdHRyaWJ1dGVQYXJ0OiBCb29sZWFuQXR0cmlidXRlUGFydCxcbiAgX0V2ZW50UGFydDogRXZlbnRQYXJ0LFxuICBfUHJvcGVydHlQYXJ0OiBQcm9wZXJ0eVBhcnQsXG4gIF9FbGVtZW50UGFydDogRWxlbWVudFBhcnQsXG59O1xuXG4vLyBBcHBseSBwb2x5ZmlsbHMgaWYgYXZhaWxhYmxlXG5jb25zdCBwb2x5ZmlsbFN1cHBvcnQgPSBERVZfTU9ERVxuICA/IGdsb2JhbC5saXRIdG1sUG9seWZpbGxTdXBwb3J0RGV2TW9kZVxuICA6IGdsb2JhbC5saXRIdG1sUG9seWZpbGxTdXBwb3J0O1xucG9seWZpbGxTdXBwb3J0Py4oVGVtcGxhdGUsIENoaWxkUGFydCk7XG5cbi8vIElNUE9SVEFOVDogZG8gbm90IGNoYW5nZSB0aGUgcHJvcGVydHkgbmFtZSBvciB0aGUgYXNzaWdubWVudCBleHByZXNzaW9uLlxuLy8gVGhpcyBsaW5lIHdpbGwgYmUgdXNlZCBpbiByZWdleGVzIHRvIHNlYXJjaCBmb3IgbGl0LWh0bWwgdXNhZ2UuXG4oZ2xvYmFsLmxpdEh0bWxWZXJzaW9ucyA/Pz0gW10pLnB1c2goJzMuMi4xJyk7XG5pZiAoREVWX01PREUgJiYgZ2xvYmFsLmxpdEh0bWxWZXJzaW9ucy5sZW5ndGggPiAxKSB7XG4gIGlzc3VlV2FybmluZyEoXG4gICAgJ211bHRpcGxlLXZlcnNpb25zJyxcbiAgICBgTXVsdGlwbGUgdmVyc2lvbnMgb2YgTGl0IGxvYWRlZC4gYCArXG4gICAgICBgTG9hZGluZyBtdWx0aXBsZSB2ZXJzaW9ucyBpcyBub3QgcmVjb21tZW5kZWQuYFxuICApO1xufVxuXG4vKipcbiAqIFJlbmRlcnMgYSB2YWx1ZSwgdXN1YWxseSBhIGxpdC1odG1sIFRlbXBsYXRlUmVzdWx0LCB0byB0aGUgY29udGFpbmVyLlxuICpcbiAqIFRoaXMgZXhhbXBsZSByZW5kZXJzIHRoZSB0ZXh0IFwiSGVsbG8sIFpvZSFcIiBpbnNpZGUgYSBwYXJhZ3JhcGggdGFnLCBhcHBlbmRpbmdcbiAqIGl0IHRvIHRoZSBjb250YWluZXIgYGRvY3VtZW50LmJvZHlgLlxuICpcbiAqIGBgYGpzXG4gKiBpbXBvcnQge2h0bWwsIHJlbmRlcn0gZnJvbSAnbGl0JztcbiAqXG4gKiBjb25zdCBuYW1lID0gXCJab2VcIjtcbiAqIHJlbmRlcihodG1sYDxwPkhlbGxvLCAke25hbWV9ITwvcD5gLCBkb2N1bWVudC5ib2R5KTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB2YWx1ZSBBbnkgW3JlbmRlcmFibGVcbiAqICAgdmFsdWVdKGh0dHBzOi8vbGl0LmRldi9kb2NzL3RlbXBsYXRlcy9leHByZXNzaW9ucy8jY2hpbGQtZXhwcmVzc2lvbnMpLFxuICogICB0eXBpY2FsbHkgYSB7QGxpbmtjb2RlIFRlbXBsYXRlUmVzdWx0fSBjcmVhdGVkIGJ5IGV2YWx1YXRpbmcgYSB0ZW1wbGF0ZSB0YWdcbiAqICAgbGlrZSB7QGxpbmtjb2RlIGh0bWx9IG9yIHtAbGlua2NvZGUgc3ZnfS5cbiAqIEBwYXJhbSBjb250YWluZXIgQSBET00gY29udGFpbmVyIHRvIHJlbmRlciB0by4gVGhlIGZpcnN0IHJlbmRlciB3aWxsIGFwcGVuZFxuICogICB0aGUgcmVuZGVyZWQgdmFsdWUgdG8gdGhlIGNvbnRhaW5lciwgYW5kIHN1YnNlcXVlbnQgcmVuZGVycyB3aWxsXG4gKiAgIGVmZmljaWVudGx5IHVwZGF0ZSB0aGUgcmVuZGVyZWQgdmFsdWUgaWYgdGhlIHNhbWUgcmVzdWx0IHR5cGUgd2FzXG4gKiAgIHByZXZpb3VzbHkgcmVuZGVyZWQgdGhlcmUuXG4gKiBAcGFyYW0gb3B0aW9ucyBTZWUge0BsaW5rY29kZSBSZW5kZXJPcHRpb25zfSBmb3Igb3B0aW9ucyBkb2N1bWVudGF0aW9uLlxuICogQHNlZVxuICoge0BsaW5rIGh0dHBzOi8vbGl0LmRldi9kb2NzL2xpYnJhcmllcy9zdGFuZGFsb25lLXRlbXBsYXRlcy8jcmVuZGVyaW5nLWxpdC1odG1sLXRlbXBsYXRlc3wgUmVuZGVyaW5nIExpdCBIVE1MIFRlbXBsYXRlc31cbiAqL1xuZXhwb3J0IGNvbnN0IHJlbmRlciA9IChcbiAgdmFsdWU6IHVua25vd24sXG4gIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCBEb2N1bWVudEZyYWdtZW50LFxuICBvcHRpb25zPzogUmVuZGVyT3B0aW9uc1xuKTogUm9vdFBhcnQgPT4ge1xuICBpZiAoREVWX01PREUgJiYgY29udGFpbmVyID09IG51bGwpIHtcbiAgICAvLyBHaXZlIGEgY2xlYXJlciBlcnJvciBtZXNzYWdlIHRoYW5cbiAgICAvLyAgICAgVW5jYXVnaHQgVHlwZUVycm9yOiBDYW5ub3QgcmVhZCBwcm9wZXJ0aWVzIG9mIG51bGwgKHJlYWRpbmdcbiAgICAvLyAgICAgJ18kbGl0UGFydCQnKVxuICAgIC8vIHdoaWNoIHJlYWRzIGxpa2UgYW4gaW50ZXJuYWwgTGl0IGVycm9yLlxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFRoZSBjb250YWluZXIgdG8gcmVuZGVyIGludG8gbWF5IG5vdCBiZSAke2NvbnRhaW5lcn1gKTtcbiAgfVxuICBjb25zdCByZW5kZXJJZCA9IERFVl9NT0RFID8gZGVidWdMb2dSZW5kZXJJZCsrIDogMDtcbiAgY29uc3QgcGFydE93bmVyTm9kZSA9IG9wdGlvbnM/LnJlbmRlckJlZm9yZSA/PyBjb250YWluZXI7XG4gIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gIGxldCBwYXJ0OiBDaGlsZFBhcnQgPSAocGFydE93bmVyTm9kZSBhcyBhbnkpWydfJGxpdFBhcnQkJ107XG4gIGRlYnVnTG9nRXZlbnQgJiZcbiAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgIGtpbmQ6ICdiZWdpbiByZW5kZXInLFxuICAgICAgaWQ6IHJlbmRlcklkLFxuICAgICAgdmFsdWUsXG4gICAgICBjb250YWluZXIsXG4gICAgICBvcHRpb25zLFxuICAgICAgcGFydCxcbiAgICB9KTtcbiAgaWYgKHBhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IGVuZE5vZGUgPSBvcHRpb25zPy5yZW5kZXJCZWZvcmUgPz8gbnVsbDtcbiAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgKHBhcnRPd25lck5vZGUgYXMgYW55KVsnXyRsaXRQYXJ0JCddID0gcGFydCA9IG5ldyBDaGlsZFBhcnQoXG4gICAgICBjb250YWluZXIuaW5zZXJ0QmVmb3JlKGNyZWF0ZU1hcmtlcigpLCBlbmROb2RlKSxcbiAgICAgIGVuZE5vZGUsXG4gICAgICB1bmRlZmluZWQsXG4gICAgICBvcHRpb25zID8/IHt9XG4gICAgKTtcbiAgfVxuICBwYXJ0Ll8kc2V0VmFsdWUodmFsdWUpO1xuICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgZGVidWdMb2dFdmVudCh7XG4gICAgICBraW5kOiAnZW5kIHJlbmRlcicsXG4gICAgICBpZDogcmVuZGVySWQsXG4gICAgICB2YWx1ZSxcbiAgICAgIGNvbnRhaW5lcixcbiAgICAgIG9wdGlvbnMsXG4gICAgICBwYXJ0LFxuICAgIH0pO1xuICByZXR1cm4gcGFydCBhcyBSb290UGFydDtcbn07XG5cbmlmIChFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MpIHtcbiAgcmVuZGVyLnNldFNhbml0aXplciA9IHNldFNhbml0aXplcjtcbiAgcmVuZGVyLmNyZWF0ZVNhbml0aXplciA9IGNyZWF0ZVNhbml0aXplcjtcbiAgaWYgKERFVl9NT0RFKSB7XG4gICAgcmVuZGVyLl90ZXN0T25seUNsZWFyU2FuaXRpemVyRmFjdG9yeURvTm90Q2FsbE9yRWxzZSA9XG4gICAgICBfdGVzdE9ubHlDbGVhclNhbml0aXplckZhY3RvcnlEb05vdENhbGxPckVsc2U7XG4gIH1cbn1cbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE5IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge1xuICBEaXJlY3RpdmUsXG4gIFBhcnRJbmZvLFxuICBEaXJlY3RpdmVDbGFzcyxcbiAgRGlyZWN0aXZlUmVzdWx0LFxufSBmcm9tICcuL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge1xuICBfJExIIGFzIHAsXG4gIEF0dHJpYnV0ZVBhcnQsXG4gIG5vQ2hhbmdlLFxuICBQYXJ0LFxuICBEaXNjb25uZWN0YWJsZSxcbn0gZnJvbSAnLi9saXQtaHRtbC5qcyc7XG5cbmltcG9ydCB0eXBlIHtcbiAgUHJvcGVydHlQYXJ0LFxuICBDaGlsZFBhcnQsXG4gIEJvb2xlYW5BdHRyaWJ1dGVQYXJ0LFxuICBFdmVudFBhcnQsXG4gIEVsZW1lbnRQYXJ0LFxuICBUZW1wbGF0ZUluc3RhbmNlLFxufSBmcm9tICcuL2xpdC1odG1sLmpzJztcblxuLy8gQ29udGFpbnMgZWl0aGVyIHRoZSBtaW5pZmllZCBvciB1bm1pbmlmaWVkIGBfJHJlc29sdmVgIERpcmVjdGl2ZSBtZXRob2QgbmFtZS5cbmxldCByZXNvbHZlTWV0aG9kTmFtZTogRXh0cmFjdDxrZXlvZiBEaXJlY3RpdmUsICdfJHJlc29sdmUnPiB8IG51bGwgPSBudWxsO1xuXG4vKipcbiAqIEVORCBVU0VSUyBTSE9VTEQgTk9UIFJFTFkgT04gVEhJUyBPQkpFQ1QuXG4gKlxuICogV2UgY3VycmVudGx5IGRvIG5vdCBtYWtlIGEgbWFuZ2xlZCByb2xsdXAgYnVpbGQgb2YgdGhlIGxpdC1zc3IgY29kZS4gSW4gb3JkZXJcbiAqIHRvIGtlZXAgYSBudW1iZXIgb2YgKG90aGVyd2lzZSBwcml2YXRlKSB0b3AtbGV2ZWwgZXhwb3J0cyBtYW5nbGVkIGluIHRoZVxuICogY2xpZW50IHNpZGUgY29kZSwgd2UgZXhwb3J0IGEgXyRMSCBvYmplY3QgY29udGFpbmluZyB0aG9zZSBtZW1iZXJzIChvclxuICogaGVscGVyIG1ldGhvZHMgZm9yIGFjY2Vzc2luZyBwcml2YXRlIGZpZWxkcyBvZiB0aG9zZSBtZW1iZXJzKSwgYW5kIHRoZW5cbiAqIHJlLWV4cG9ydCB0aGVtIGZvciB1c2UgaW4gbGl0LXNzci4gVGhpcyBrZWVwcyBsaXQtc3NyIGFnbm9zdGljIHRvIHdoZXRoZXIgdGhlXG4gKiBjbGllbnQtc2lkZSBjb2RlIGlzIGJlaW5nIHVzZWQgaW4gYGRldmAgbW9kZSBvciBgcHJvZGAgbW9kZS5cbiAqIEBwcml2YXRlXG4gKi9cbmV4cG9ydCBjb25zdCBfJExIID0ge1xuICBib3VuZEF0dHJpYnV0ZVN1ZmZpeDogcC5fYm91bmRBdHRyaWJ1dGVTdWZmaXgsXG4gIG1hcmtlcjogcC5fbWFya2VyLFxuICBtYXJrZXJNYXRjaDogcC5fbWFya2VyTWF0Y2gsXG4gIEhUTUxfUkVTVUxUOiBwLl9IVE1MX1JFU1VMVCxcbiAgZ2V0VGVtcGxhdGVIdG1sOiBwLl9nZXRUZW1wbGF0ZUh0bWwsXG4gIG92ZXJyaWRlRGlyZWN0aXZlUmVzb2x2ZTogKFxuICAgIGRpcmVjdGl2ZUNsYXNzOiBuZXcgKHBhcnQ6IFBhcnRJbmZvKSA9PiBEaXJlY3RpdmUgJiB7cmVuZGVyKCk6IHVua25vd259LFxuICAgIHJlc29sdmVPdmVycmlkZUZuOiAoZGlyZWN0aXZlOiBEaXJlY3RpdmUsIHZhbHVlczogdW5rbm93bltdKSA9PiB1bmtub3duXG4gICkgPT5cbiAgICBjbGFzcyBleHRlbmRzIGRpcmVjdGl2ZUNsYXNzIHtcbiAgICAgIG92ZXJyaWRlIF8kcmVzb2x2ZShcbiAgICAgICAgdGhpczogRGlyZWN0aXZlLFxuICAgICAgICBfcGFydDogUGFydCxcbiAgICAgICAgdmFsdWVzOiB1bmtub3duW11cbiAgICAgICk6IHVua25vd24ge1xuICAgICAgICByZXR1cm4gcmVzb2x2ZU92ZXJyaWRlRm4odGhpcywgdmFsdWVzKTtcbiAgICAgIH1cbiAgICB9LFxuICBwYXRjaERpcmVjdGl2ZVJlc29sdmU6IChcbiAgICBkaXJlY3RpdmVDbGFzczogdHlwZW9mIERpcmVjdGl2ZSxcbiAgICByZXNvbHZlT3ZlcnJpZGVGbjogKFxuICAgICAgdGhpczogRGlyZWN0aXZlLFxuICAgICAgX3BhcnQ6IFBhcnQsXG4gICAgICB2YWx1ZXM6IHVua25vd25bXVxuICAgICkgPT4gdW5rbm93blxuICApID0+IHtcbiAgICBpZiAoZGlyZWN0aXZlQ2xhc3MucHJvdG90eXBlLl8kcmVzb2x2ZSAhPT0gcmVzb2x2ZU92ZXJyaWRlRm4pIHtcbiAgICAgIHJlc29sdmVNZXRob2ROYW1lID8/PSBkaXJlY3RpdmVDbGFzcy5wcm90b3R5cGUuXyRyZXNvbHZlXG4gICAgICAgIC5uYW1lIGFzIE5vbk51bGxhYmxlPHR5cGVvZiByZXNvbHZlTWV0aG9kTmFtZT47XG4gICAgICBmb3IgKFxuICAgICAgICBsZXQgcHJvdG8gPSBkaXJlY3RpdmVDbGFzcy5wcm90b3R5cGU7XG4gICAgICAgIHByb3RvICE9PSBPYmplY3QucHJvdG90eXBlO1xuICAgICAgICBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihwcm90bylcbiAgICAgICkge1xuICAgICAgICBpZiAocHJvdG8uaGFzT3duUHJvcGVydHkocmVzb2x2ZU1ldGhvZE5hbWUpKSB7XG4gICAgICAgICAgcHJvdG9bcmVzb2x2ZU1ldGhvZE5hbWVdID0gcmVzb2x2ZU92ZXJyaWRlRm47XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBOb3RoaW5nIHdhcyBwYXRjaGVkIHdoaWNoIGluZGljYXRlcyBhbiBlcnJvci4gVGhlIG1vc3QgbGlrZWx5IGVycm9yIGlzXG4gICAgICAvLyB0aGF0IHNvbWVob3cgYm90aCBtaW5pZmllZCBhbmQgdW5taW5pZmllZCBsaXQgY29kZSBwYXNzZWQgdGhyb3VnaCB0aGlzXG4gICAgICAvLyBjb2RlcGF0aC4gVGhpcyBpcyBwb3NzaWJsZSBhcyBsaXQtbGFicy9zc3IgY29udGFpbnMgaXRzIG93biBsaXQtaHRtbFxuICAgICAgLy8gbW9kdWxlIGFzIGEgZGVwZW5kZW5jeSBmb3Igc2VydmVyIHJlbmRlcmluZyBjbGllbnQgTGl0IGNvZGUuIElmIGFcbiAgICAgIC8vIGNsaWVudCBjb250YWlucyBtdWx0aXBsZSBkdXBsaWNhdGUgTGl0IG1vZHVsZXMgd2l0aCBtaW5pZmllZCBhbmRcbiAgICAgIC8vIHVubWluaWZpZWQgZXhwb3J0cywgd2UgY3VycmVudGx5IGNhbm5vdCBoYW5kbGUgYm90aC5cbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEludGVybmFsIGVycm9yOiBJdCBpcyBwb3NzaWJsZSB0aGF0IGJvdGggZGV2IG1vZGUgYW5kIHByb2R1Y3Rpb24gbW9kZWAgK1xuICAgICAgICAgIGAgTGl0IHdhcyBtaXhlZCB0b2dldGhlciBkdXJpbmcgU1NSLiBQbGVhc2UgY29tbWVudCBvbiB0aGUgaXNzdWU6IGAgK1xuICAgICAgICAgIGBodHRwczovL2dpdGh1Yi5jb20vbGl0L2xpdC9pc3N1ZXMvNDUyN2BcbiAgICAgICk7XG4gICAgfVxuICB9LFxuICBzZXREaXJlY3RpdmVDbGFzcyh2YWx1ZTogRGlyZWN0aXZlUmVzdWx0LCBkaXJlY3RpdmVDbGFzczogRGlyZWN0aXZlQ2xhc3MpIHtcbiAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIHZhbHVlWydfJGxpdERpcmVjdGl2ZSQnXSA9IGRpcmVjdGl2ZUNsYXNzO1xuICB9LFxuICBnZXRBdHRyaWJ1dGVQYXJ0Q29tbWl0dGVkVmFsdWU6IChcbiAgICBwYXJ0OiBBdHRyaWJ1dGVQYXJ0LFxuICAgIHZhbHVlOiB1bmtub3duLFxuICAgIGluZGV4OiBudW1iZXIgfCB1bmRlZmluZWRcbiAgKSA9PiB7XG4gICAgLy8gVXNlIHRoZSBwYXJ0IHNldHRlciB0byByZXNvbHZlIGRpcmVjdGl2ZXMvY29uY2F0ZW5hdGUgbXVsdGlwbGUgcGFydHNcbiAgICAvLyBpbnRvIGEgZmluYWwgdmFsdWUgKGNhcHR1cmVkIGJ5IHBhc3NpbmcgaW4gYSBjb21taXRWYWx1ZSBvdmVycmlkZSlcbiAgICBsZXQgY29tbWl0dGVkVmFsdWU6IHVua25vd24gPSBub0NoYW5nZTtcbiAgICAvLyBOb3RlIHRoYXQgX2NvbW1pdFZhbHVlIG5lZWQgbm90IGJlIGluIGBzdGFibGVQcm9wZXJ0aWVzYCBiZWNhdXNlIHRoaXNcbiAgICAvLyBtZXRob2QgaXMgb25seSBydW4gb24gYEF0dHJpYnV0ZVBhcnRgcyBjcmVhdGVkIGJ5IGxpdC1zc3IgdXNpbmcgdGhlIHNhbWVcbiAgICAvLyB2ZXJzaW9uIG9mIHRoZSBsaWJyYXJ5IGFzIHRoaXMgZmlsZVxuICAgIHBhcnQuX2NvbW1pdFZhbHVlID0gKHZhbHVlOiB1bmtub3duKSA9PiAoY29tbWl0dGVkVmFsdWUgPSB2YWx1ZSk7XG4gICAgcGFydC5fJHNldFZhbHVlKHZhbHVlLCBwYXJ0LCBpbmRleCk7XG4gICAgcmV0dXJuIGNvbW1pdHRlZFZhbHVlO1xuICB9LFxuICBjb25uZWN0ZWREaXNjb25uZWN0YWJsZTogKHByb3BzPzogb2JqZWN0KTogRGlzY29ubmVjdGFibGUgPT4gKHtcbiAgICAuLi5wcm9wcyxcbiAgICBfJGlzQ29ubmVjdGVkOiB0cnVlLFxuICB9KSxcbiAgcmVzb2x2ZURpcmVjdGl2ZTogcC5fcmVzb2x2ZURpcmVjdGl2ZSxcbiAgQXR0cmlidXRlUGFydDogcC5fQXR0cmlidXRlUGFydCxcbiAgUHJvcGVydHlQYXJ0OiBwLl9Qcm9wZXJ0eVBhcnQgYXMgdHlwZW9mIFByb3BlcnR5UGFydCxcbiAgQm9vbGVhbkF0dHJpYnV0ZVBhcnQ6IHAuX0Jvb2xlYW5BdHRyaWJ1dGVQYXJ0IGFzIHR5cGVvZiBCb29sZWFuQXR0cmlidXRlUGFydCxcbiAgRXZlbnRQYXJ0OiBwLl9FdmVudFBhcnQgYXMgdHlwZW9mIEV2ZW50UGFydCxcbiAgRWxlbWVudFBhcnQ6IHAuX0VsZW1lbnRQYXJ0IGFzIHR5cGVvZiBFbGVtZW50UGFydCxcbiAgVGVtcGxhdGVJbnN0YW5jZTogcC5fVGVtcGxhdGVJbnN0YW5jZSBhcyB0eXBlb2YgVGVtcGxhdGVJbnN0YW5jZSxcbiAgaXNJdGVyYWJsZTogcC5faXNJdGVyYWJsZSxcbiAgQ2hpbGRQYXJ0OiBwLl9DaGlsZFBhcnQgYXMgdHlwZW9mIENoaWxkUGFydCxcbn07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtEaXNjb25uZWN0YWJsZSwgUGFydH0gZnJvbSAnLi9saXQtaHRtbC5qcyc7XG5cbmV4cG9ydCB7XG4gIEF0dHJpYnV0ZVBhcnQsXG4gIEJvb2xlYW5BdHRyaWJ1dGVQYXJ0LFxuICBDaGlsZFBhcnQsXG4gIEVsZW1lbnRQYXJ0LFxuICBFdmVudFBhcnQsXG4gIFBhcnQsXG4gIFByb3BlcnR5UGFydCxcbn0gZnJvbSAnLi9saXQtaHRtbC5qcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGlyZWN0aXZlQ2xhc3Mge1xuICBuZXcgKHBhcnQ6IFBhcnRJbmZvKTogRGlyZWN0aXZlO1xufVxuXG4vKipcbiAqIFRoaXMgdXRpbGl0eSB0eXBlIGV4dHJhY3RzIHRoZSBzaWduYXR1cmUgb2YgYSBkaXJlY3RpdmUgY2xhc3MncyByZW5kZXIoKVxuICogbWV0aG9kIHNvIHdlIGNhbiB1c2UgaXQgZm9yIHRoZSB0eXBlIG9mIHRoZSBnZW5lcmF0ZWQgZGlyZWN0aXZlIGZ1bmN0aW9uLlxuICovXG5leHBvcnQgdHlwZSBEaXJlY3RpdmVQYXJhbWV0ZXJzPEMgZXh0ZW5kcyBEaXJlY3RpdmU+ID0gUGFyYW1ldGVyczxDWydyZW5kZXInXT47XG5cbi8qKlxuICogQSBnZW5lcmF0ZWQgZGlyZWN0aXZlIGZ1bmN0aW9uIGRvZXNuJ3QgZXZhbHVhdGUgdGhlIGRpcmVjdGl2ZSwgYnV0IGp1c3RcbiAqIHJldHVybnMgYSBEaXJlY3RpdmVSZXN1bHQgb2JqZWN0IHRoYXQgY2FwdHVyZXMgdGhlIGFyZ3VtZW50cy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEaXJlY3RpdmVSZXN1bHQ8QyBleHRlbmRzIERpcmVjdGl2ZUNsYXNzID0gRGlyZWN0aXZlQ2xhc3M+IHtcbiAgLyoqXG4gICAqIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgWydfJGxpdERpcmVjdGl2ZSQnXTogQztcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICB2YWx1ZXM6IERpcmVjdGl2ZVBhcmFtZXRlcnM8SW5zdGFuY2VUeXBlPEM+Pjtcbn1cblxuZXhwb3J0IGNvbnN0IFBhcnRUeXBlID0ge1xuICBBVFRSSUJVVEU6IDEsXG4gIENISUxEOiAyLFxuICBQUk9QRVJUWTogMyxcbiAgQk9PTEVBTl9BVFRSSUJVVEU6IDQsXG4gIEVWRU5UOiA1LFxuICBFTEVNRU5UOiA2LFxufSBhcyBjb25zdDtcblxuZXhwb3J0IHR5cGUgUGFydFR5cGUgPSAodHlwZW9mIFBhcnRUeXBlKVtrZXlvZiB0eXBlb2YgUGFydFR5cGVdO1xuXG5leHBvcnQgaW50ZXJmYWNlIENoaWxkUGFydEluZm8ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgUGFydFR5cGUuQ0hJTEQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXR0cmlidXRlUGFydEluZm8ge1xuICByZWFkb25seSB0eXBlOlxuICAgIHwgdHlwZW9mIFBhcnRUeXBlLkFUVFJJQlVURVxuICAgIHwgdHlwZW9mIFBhcnRUeXBlLlBST1BFUlRZXG4gICAgfCB0eXBlb2YgUGFydFR5cGUuQk9PTEVBTl9BVFRSSUJVVEVcbiAgICB8IHR5cGVvZiBQYXJ0VHlwZS5FVkVOVDtcbiAgcmVhZG9ubHkgc3RyaW5ncz86IFJlYWRvbmx5QXJyYXk8c3RyaW5nPjtcbiAgcmVhZG9ubHkgbmFtZTogc3RyaW5nO1xuICByZWFkb25seSB0YWdOYW1lOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRWxlbWVudFBhcnRJbmZvIHtcbiAgcmVhZG9ubHkgdHlwZTogdHlwZW9mIFBhcnRUeXBlLkVMRU1FTlQ7XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHBhcnQgYSBkaXJlY3RpdmUgaXMgYm91bmQgdG8uXG4gKlxuICogVGhpcyBpcyB1c2VmdWwgZm9yIGNoZWNraW5nIHRoYXQgYSBkaXJlY3RpdmUgaXMgYXR0YWNoZWQgdG8gYSB2YWxpZCBwYXJ0LFxuICogc3VjaCBhcyB3aXRoIGRpcmVjdGl2ZSB0aGF0IGNhbiBvbmx5IGJlIHVzZWQgb24gYXR0cmlidXRlIGJpbmRpbmdzLlxuICovXG5leHBvcnQgdHlwZSBQYXJ0SW5mbyA9IENoaWxkUGFydEluZm8gfCBBdHRyaWJ1dGVQYXJ0SW5mbyB8IEVsZW1lbnRQYXJ0SW5mbztcblxuLyoqXG4gKiBDcmVhdGVzIGEgdXNlci1mYWNpbmcgZGlyZWN0aXZlIGZ1bmN0aW9uIGZyb20gYSBEaXJlY3RpdmUgY2xhc3MuIFRoaXNcbiAqIGZ1bmN0aW9uIGhhcyB0aGUgc2FtZSBwYXJhbWV0ZXJzIGFzIHRoZSBkaXJlY3RpdmUncyByZW5kZXIoKSBtZXRob2QuXG4gKi9cbmV4cG9ydCBjb25zdCBkaXJlY3RpdmUgPVxuICA8QyBleHRlbmRzIERpcmVjdGl2ZUNsYXNzPihjOiBDKSA9PlxuICAoLi4udmFsdWVzOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPEluc3RhbmNlVHlwZTxDPj4pOiBEaXJlY3RpdmVSZXN1bHQ8Qz4gPT4gKHtcbiAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIFsnXyRsaXREaXJlY3RpdmUkJ106IGMsXG4gICAgdmFsdWVzLFxuICB9KTtcblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBjcmVhdGluZyBjdXN0b20gZGlyZWN0aXZlcy4gVXNlcnMgc2hvdWxkIGV4dGVuZCB0aGlzIGNsYXNzLFxuICogaW1wbGVtZW50IGByZW5kZXJgIGFuZC9vciBgdXBkYXRlYCwgYW5kIHRoZW4gcGFzcyB0aGVpciBzdWJjbGFzcyB0b1xuICogYGRpcmVjdGl2ZWAuXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBEaXJlY3RpdmUgaW1wbGVtZW50cyBEaXNjb25uZWN0YWJsZSB7XG4gIC8vQGludGVybmFsXG4gIF9fcGFydCE6IFBhcnQ7XG4gIC8vQGludGVybmFsXG4gIF9fYXR0cmlidXRlSW5kZXg6IG51bWJlciB8IHVuZGVmaW5lZDtcbiAgLy9AaW50ZXJuYWxcbiAgX19kaXJlY3RpdmU/OiBEaXJlY3RpdmU7XG5cbiAgLy9AaW50ZXJuYWxcbiAgXyRwYXJlbnQhOiBEaXNjb25uZWN0YWJsZTtcblxuICAvLyBUaGVzZSB3aWxsIG9ubHkgZXhpc3Qgb24gdGhlIEFzeW5jRGlyZWN0aXZlIHN1YmNsYXNzXG4gIC8vQGludGVybmFsXG4gIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT47XG4gIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gIC8vQGludGVybmFsXG4gIFsnXyRub3RpZnlEaXJlY3RpdmVDb25uZWN0aW9uQ2hhbmdlZCddPyhpc0Nvbm5lY3RlZDogYm9vbGVhbik6IHZvaWQ7XG5cbiAgY29uc3RydWN0b3IoX3BhcnRJbmZvOiBQYXJ0SW5mbykge31cblxuICAvLyBTZWUgY29tbWVudCBpbiBEaXNjb25uZWN0YWJsZSBpbnRlcmZhY2UgZm9yIHdoeSB0aGlzIGlzIGEgZ2V0dGVyXG4gIGdldCBfJGlzQ29ubmVjdGVkKCkge1xuICAgIHJldHVybiB0aGlzLl8kcGFyZW50Ll8kaXNDb25uZWN0ZWQ7XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIF8kaW5pdGlhbGl6ZShcbiAgICBwYXJ0OiBQYXJ0LFxuICAgIHBhcmVudDogRGlzY29ubmVjdGFibGUsXG4gICAgYXR0cmlidXRlSW5kZXg6IG51bWJlciB8IHVuZGVmaW5lZFxuICApIHtcbiAgICB0aGlzLl9fcGFydCA9IHBhcnQ7XG4gICAgdGhpcy5fJHBhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLl9fYXR0cmlidXRlSW5kZXggPSBhdHRyaWJ1dGVJbmRleDtcbiAgfVxuICAvKiogQGludGVybmFsICovXG4gIF8kcmVzb2x2ZShwYXJ0OiBQYXJ0LCBwcm9wczogQXJyYXk8dW5rbm93bj4pOiB1bmtub3duIHtcbiAgICByZXR1cm4gdGhpcy51cGRhdGUocGFydCwgcHJvcHMpO1xuICB9XG5cbiAgYWJzdHJhY3QgcmVuZGVyKC4uLnByb3BzOiBBcnJheTx1bmtub3duPik6IHVua25vd247XG5cbiAgdXBkYXRlKF9wYXJ0OiBQYXJ0LCBwcm9wczogQXJyYXk8dW5rbm93bj4pOiB1bmtub3duIHtcbiAgICByZXR1cm4gdGhpcy5yZW5kZXIoLi4ucHJvcHMpO1xuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtcbiAgXyRMSCxcbiAgUGFydCxcbiAgRGlyZWN0aXZlUGFyZW50LFxuICBDb21waWxlZFRlbXBsYXRlUmVzdWx0LFxuICBNYXliZUNvbXBpbGVkVGVtcGxhdGVSZXN1bHQsXG4gIFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdCxcbn0gZnJvbSAnLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBEaXJlY3RpdmVSZXN1bHQsXG4gIERpcmVjdGl2ZUNsYXNzLFxuICBQYXJ0SW5mbyxcbiAgQXR0cmlidXRlUGFydEluZm8sXG59IGZyb20gJy4vZGlyZWN0aXZlLmpzJztcbnR5cGUgUHJpbWl0aXZlID0gbnVsbCB8IHVuZGVmaW5lZCB8IGJvb2xlYW4gfCBudW1iZXIgfCBzdHJpbmcgfCBzeW1ib2wgfCBiaWdpbnQ7XG5cbmNvbnN0IHtfQ2hpbGRQYXJ0OiBDaGlsZFBhcnR9ID0gXyRMSDtcblxudHlwZSBDaGlsZFBhcnQgPSBJbnN0YW5jZVR5cGU8dHlwZW9mIENoaWxkUGFydD47XG5cbmNvbnN0IEVOQUJMRV9TSEFEWURPTV9OT1BBVENIID0gdHJ1ZTtcblxuY29uc3Qgd3JhcCA9XG4gIEVOQUJMRV9TSEFEWURPTV9OT1BBVENIICYmXG4gIHdpbmRvdy5TaGFkeURPTT8uaW5Vc2UgJiZcbiAgd2luZG93LlNoYWR5RE9NPy5ub1BhdGNoID09PSB0cnVlXG4gICAgPyB3aW5kb3cuU2hhZHlET00hLndyYXBcbiAgICA6IChub2RlOiBOb2RlKSA9PiBub2RlO1xuXG4vKipcbiAqIFRlc3RzIGlmIGEgdmFsdWUgaXMgYSBwcmltaXRpdmUgdmFsdWUuXG4gKlxuICogU2VlIGh0dHBzOi8vdGMzOS5naXRodWIuaW8vZWNtYTI2Mi8jc2VjLXR5cGVvZi1vcGVyYXRvclxuICovXG5leHBvcnQgY29uc3QgaXNQcmltaXRpdmUgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBQcmltaXRpdmUgPT5cbiAgdmFsdWUgPT09IG51bGwgfHwgKHR5cGVvZiB2YWx1ZSAhPSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsdWUgIT0gJ2Z1bmN0aW9uJyk7XG5cbmV4cG9ydCBjb25zdCBUZW1wbGF0ZVJlc3VsdFR5cGUgPSB7XG4gIEhUTUw6IDEsXG4gIFNWRzogMixcbiAgTUFUSE1MOiAzLFxufSBhcyBjb25zdDtcblxuZXhwb3J0IHR5cGUgVGVtcGxhdGVSZXN1bHRUeXBlID1cbiAgKHR5cGVvZiBUZW1wbGF0ZVJlc3VsdFR5cGUpW2tleW9mIHR5cGVvZiBUZW1wbGF0ZVJlc3VsdFR5cGVdO1xuXG50eXBlIElzVGVtcGxhdGVSZXN1bHQgPSB7XG4gICh2YWw6IHVua25vd24pOiB2YWwgaXMgTWF5YmVDb21waWxlZFRlbXBsYXRlUmVzdWx0O1xuICA8VCBleHRlbmRzIFRlbXBsYXRlUmVzdWx0VHlwZT4oXG4gICAgdmFsOiB1bmtub3duLFxuICAgIHR5cGU6IFRcbiAgKTogdmFsIGlzIFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdDxUPjtcbn07XG5cbi8qKlxuICogVGVzdHMgaWYgYSB2YWx1ZSBpcyBhIFRlbXBsYXRlUmVzdWx0IG9yIGEgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdC5cbiAqL1xuZXhwb3J0IGNvbnN0IGlzVGVtcGxhdGVSZXN1bHQ6IElzVGVtcGxhdGVSZXN1bHQgPSAoXG4gIHZhbHVlOiB1bmtub3duLFxuICB0eXBlPzogVGVtcGxhdGVSZXN1bHRUeXBlXG4pOiB2YWx1ZSBpcyBVbmNvbXBpbGVkVGVtcGxhdGVSZXN1bHQgPT5cbiAgdHlwZSA9PT0gdW5kZWZpbmVkXG4gICAgPyAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgICAgKHZhbHVlIGFzIFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdCk/LlsnXyRsaXRUeXBlJCddICE9PSB1bmRlZmluZWRcbiAgICA6ICh2YWx1ZSBhcyBVbmNvbXBpbGVkVGVtcGxhdGVSZXN1bHQpPy5bJ18kbGl0VHlwZSQnXSA9PT0gdHlwZTtcblxuLyoqXG4gKiBUZXN0cyBpZiBhIHZhbHVlIGlzIGEgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdC5cbiAqL1xuZXhwb3J0IGNvbnN0IGlzQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdCA9IChcbiAgdmFsdWU6IHVua25vd25cbik6IHZhbHVlIGlzIENvbXBpbGVkVGVtcGxhdGVSZXN1bHQgPT4ge1xuICByZXR1cm4gKHZhbHVlIGFzIENvbXBpbGVkVGVtcGxhdGVSZXN1bHQpPy5bJ18kbGl0VHlwZSQnXT8uaCAhPSBudWxsO1xufTtcblxuLyoqXG4gKiBUZXN0cyBpZiBhIHZhbHVlIGlzIGEgRGlyZWN0aXZlUmVzdWx0LlxuICovXG5leHBvcnQgY29uc3QgaXNEaXJlY3RpdmVSZXN1bHQgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBEaXJlY3RpdmVSZXN1bHQgPT5cbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgKHZhbHVlIGFzIERpcmVjdGl2ZVJlc3VsdCk/LlsnXyRsaXREaXJlY3RpdmUkJ10gIT09IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBSZXRyaWV2ZXMgdGhlIERpcmVjdGl2ZSBjbGFzcyBmb3IgYSBEaXJlY3RpdmVSZXN1bHRcbiAqL1xuZXhwb3J0IGNvbnN0IGdldERpcmVjdGl2ZUNsYXNzID0gKHZhbHVlOiB1bmtub3duKTogRGlyZWN0aXZlQ2xhc3MgfCB1bmRlZmluZWQgPT5cbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgKHZhbHVlIGFzIERpcmVjdGl2ZVJlc3VsdCk/LlsnXyRsaXREaXJlY3RpdmUkJ107XG5cbi8qKlxuICogVGVzdHMgd2hldGhlciBhIHBhcnQgaGFzIG9ubHkgYSBzaW5nbGUtZXhwcmVzc2lvbiB3aXRoIG5vIHN0cmluZ3MgdG9cbiAqIGludGVycG9sYXRlIGJldHdlZW4uXG4gKlxuICogT25seSBBdHRyaWJ1dGVQYXJ0IGFuZCBQcm9wZXJ0eVBhcnQgY2FuIGhhdmUgbXVsdGlwbGUgZXhwcmVzc2lvbnMuXG4gKiBNdWx0aS1leHByZXNzaW9uIHBhcnRzIGhhdmUgYSBgc3RyaW5nc2AgcHJvcGVydHkgYW5kIHNpbmdsZS1leHByZXNzaW9uXG4gKiBwYXJ0cyBkbyBub3QuXG4gKi9cbmV4cG9ydCBjb25zdCBpc1NpbmdsZUV4cHJlc3Npb24gPSAocGFydDogUGFydEluZm8pID0+XG4gIChwYXJ0IGFzIEF0dHJpYnV0ZVBhcnRJbmZvKS5zdHJpbmdzID09PSB1bmRlZmluZWQ7XG5cbmNvbnN0IGNyZWF0ZU1hcmtlciA9ICgpID0+IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJycpO1xuXG4vKipcbiAqIEluc2VydHMgYSBDaGlsZFBhcnQgaW50byB0aGUgZ2l2ZW4gY29udGFpbmVyIENoaWxkUGFydCdzIERPTSwgZWl0aGVyIGF0IHRoZVxuICogZW5kIG9mIHRoZSBjb250YWluZXIgQ2hpbGRQYXJ0LCBvciBiZWZvcmUgdGhlIG9wdGlvbmFsIGByZWZQYXJ0YC5cbiAqXG4gKiBUaGlzIGRvZXMgbm90IGFkZCB0aGUgcGFydCB0byB0aGUgY29udGFpbmVyUGFydCdzIGNvbW1pdHRlZCB2YWx1ZS4gVGhhdCBtdXN0XG4gKiBiZSBkb25lIGJ5IGNhbGxlcnMuXG4gKlxuICogQHBhcmFtIGNvbnRhaW5lclBhcnQgUGFydCB3aXRoaW4gd2hpY2ggdG8gYWRkIHRoZSBuZXcgQ2hpbGRQYXJ0XG4gKiBAcGFyYW0gcmVmUGFydCBQYXJ0IGJlZm9yZSB3aGljaCB0byBhZGQgdGhlIG5ldyBDaGlsZFBhcnQ7IHdoZW4gb21pdHRlZCB0aGVcbiAqICAgICBwYXJ0IGFkZGVkIHRvIHRoZSBlbmQgb2YgdGhlIGBjb250YWluZXJQYXJ0YFxuICogQHBhcmFtIHBhcnQgUGFydCB0byBpbnNlcnQsIG9yIHVuZGVmaW5lZCB0byBjcmVhdGUgYSBuZXcgcGFydFxuICovXG5leHBvcnQgY29uc3QgaW5zZXJ0UGFydCA9IChcbiAgY29udGFpbmVyUGFydDogQ2hpbGRQYXJ0LFxuICByZWZQYXJ0PzogQ2hpbGRQYXJ0LFxuICBwYXJ0PzogQ2hpbGRQYXJ0XG4pOiBDaGlsZFBhcnQgPT4ge1xuICBjb25zdCBjb250YWluZXIgPSB3cmFwKGNvbnRhaW5lclBhcnQuXyRzdGFydE5vZGUpLnBhcmVudE5vZGUhO1xuXG4gIGNvbnN0IHJlZk5vZGUgPVxuICAgIHJlZlBhcnQgPT09IHVuZGVmaW5lZCA/IGNvbnRhaW5lclBhcnQuXyRlbmROb2RlIDogcmVmUGFydC5fJHN0YXJ0Tm9kZTtcblxuICBpZiAocGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3Qgc3RhcnROb2RlID0gd3JhcChjb250YWluZXIpLmluc2VydEJlZm9yZShjcmVhdGVNYXJrZXIoKSwgcmVmTm9kZSk7XG4gICAgY29uc3QgZW5kTm9kZSA9IHdyYXAoY29udGFpbmVyKS5pbnNlcnRCZWZvcmUoY3JlYXRlTWFya2VyKCksIHJlZk5vZGUpO1xuICAgIHBhcnQgPSBuZXcgQ2hpbGRQYXJ0KFxuICAgICAgc3RhcnROb2RlLFxuICAgICAgZW5kTm9kZSxcbiAgICAgIGNvbnRhaW5lclBhcnQsXG4gICAgICBjb250YWluZXJQYXJ0Lm9wdGlvbnNcbiAgICApO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGVuZE5vZGUgPSB3cmFwKHBhcnQuXyRlbmROb2RlISkubmV4dFNpYmxpbmc7XG4gICAgY29uc3Qgb2xkUGFyZW50ID0gcGFydC5fJHBhcmVudDtcbiAgICBjb25zdCBwYXJlbnRDaGFuZ2VkID0gb2xkUGFyZW50ICE9PSBjb250YWluZXJQYXJ0O1xuICAgIGlmIChwYXJlbnRDaGFuZ2VkKSB7XG4gICAgICBwYXJ0Ll8kcmVwYXJlbnREaXNjb25uZWN0YWJsZXM/Lihjb250YWluZXJQYXJ0KTtcbiAgICAgIC8vIE5vdGUgdGhhdCBhbHRob3VnaCBgXyRyZXBhcmVudERpc2Nvbm5lY3RhYmxlc2AgdXBkYXRlcyB0aGUgcGFydCdzXG4gICAgICAvLyBgXyRwYXJlbnRgIHJlZmVyZW5jZSBhZnRlciB1bmxpbmtpbmcgZnJvbSBpdHMgY3VycmVudCBwYXJlbnQsIHRoYXRcbiAgICAgIC8vIG1ldGhvZCBvbmx5IGV4aXN0cyBpZiBEaXNjb25uZWN0YWJsZXMgYXJlIHByZXNlbnQsIHNvIHdlIG5lZWQgdG9cbiAgICAgIC8vIHVuY29uZGl0aW9uYWxseSBzZXQgaXQgaGVyZVxuICAgICAgcGFydC5fJHBhcmVudCA9IGNvbnRhaW5lclBhcnQ7XG4gICAgICAvLyBTaW5jZSB0aGUgXyRpc0Nvbm5lY3RlZCBnZXR0ZXIgaXMgc29tZXdoYXQgY29zdGx5LCBvbmx5XG4gICAgICAvLyByZWFkIGl0IG9uY2Ugd2Uga25vdyB0aGUgc3VidHJlZSBoYXMgZGlyZWN0aXZlcyB0aGF0IG5lZWRcbiAgICAgIC8vIHRvIGJlIG5vdGlmaWVkXG4gICAgICBsZXQgbmV3Q29ubmVjdGlvblN0YXRlO1xuICAgICAgaWYgKFxuICAgICAgICBwYXJ0Ll8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAobmV3Q29ubmVjdGlvblN0YXRlID0gY29udGFpbmVyUGFydC5fJGlzQ29ubmVjdGVkKSAhPT1cbiAgICAgICAgICBvbGRQYXJlbnQhLl8kaXNDb25uZWN0ZWRcbiAgICAgICkge1xuICAgICAgICBwYXJ0Ll8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQobmV3Q29ubmVjdGlvblN0YXRlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGVuZE5vZGUgIT09IHJlZk5vZGUgfHwgcGFyZW50Q2hhbmdlZCkge1xuICAgICAgbGV0IHN0YXJ0OiBOb2RlIHwgbnVsbCA9IHBhcnQuXyRzdGFydE5vZGU7XG4gICAgICB3aGlsZSAoc3RhcnQgIT09IGVuZE5vZGUpIHtcbiAgICAgICAgY29uc3QgbjogTm9kZSB8IG51bGwgPSB3cmFwKHN0YXJ0ISkubmV4dFNpYmxpbmc7XG4gICAgICAgIHdyYXAoY29udGFpbmVyKS5pbnNlcnRCZWZvcmUoc3RhcnQhLCByZWZOb2RlKTtcbiAgICAgICAgc3RhcnQgPSBuO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwYXJ0O1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIFBhcnQuXG4gKlxuICogTm90ZSB0aGF0IHRoaXMgc2hvdWxkIG9ubHkgYmUgdXNlZCB0byBzZXQvdXBkYXRlIHRoZSB2YWx1ZSBvZiB1c2VyLWNyZWF0ZWRcbiAqIHBhcnRzIChpLmUuIHRob3NlIGNyZWF0ZWQgdXNpbmcgYGluc2VydFBhcnRgKTsgaXQgc2hvdWxkIG5vdCBiZSB1c2VkXG4gKiBieSBkaXJlY3RpdmVzIHRvIHNldCB0aGUgdmFsdWUgb2YgdGhlIGRpcmVjdGl2ZSdzIGNvbnRhaW5lciBwYXJ0LiBEaXJlY3RpdmVzXG4gKiBzaG91bGQgcmV0dXJuIGEgdmFsdWUgZnJvbSBgdXBkYXRlYC9gcmVuZGVyYCB0byB1cGRhdGUgdGhlaXIgcGFydCBzdGF0ZS5cbiAqXG4gKiBGb3IgZGlyZWN0aXZlcyB0aGF0IHJlcXVpcmUgc2V0dGluZyB0aGVpciBwYXJ0IHZhbHVlIGFzeW5jaHJvbm91c2x5LCB0aGV5XG4gKiBzaG91bGQgZXh0ZW5kIGBBc3luY0RpcmVjdGl2ZWAgYW5kIGNhbGwgYHRoaXMuc2V0VmFsdWUoKWAuXG4gKlxuICogQHBhcmFtIHBhcnQgUGFydCB0byBzZXRcbiAqIEBwYXJhbSB2YWx1ZSBWYWx1ZSB0byBzZXRcbiAqIEBwYXJhbSBpbmRleCBGb3IgYEF0dHJpYnV0ZVBhcnRgcywgdGhlIGluZGV4IHRvIHNldFxuICogQHBhcmFtIGRpcmVjdGl2ZVBhcmVudCBVc2VkIGludGVybmFsbHk7IHNob3VsZCBub3QgYmUgc2V0IGJ5IHVzZXJcbiAqL1xuZXhwb3J0IGNvbnN0IHNldENoaWxkUGFydFZhbHVlID0gPFQgZXh0ZW5kcyBDaGlsZFBhcnQ+KFxuICBwYXJ0OiBULFxuICB2YWx1ZTogdW5rbm93bixcbiAgZGlyZWN0aXZlUGFyZW50OiBEaXJlY3RpdmVQYXJlbnQgPSBwYXJ0XG4pOiBUID0+IHtcbiAgcGFydC5fJHNldFZhbHVlKHZhbHVlLCBkaXJlY3RpdmVQYXJlbnQpO1xuICByZXR1cm4gcGFydDtcbn07XG5cbi8vIEEgc2VudGluZWwgdmFsdWUgdGhhdCBjYW4gbmV2ZXIgYXBwZWFyIGFzIGEgcGFydCB2YWx1ZSBleGNlcHQgd2hlbiBzZXQgYnlcbi8vIGxpdmUoKS4gVXNlZCB0byBmb3JjZSBhIGRpcnR5LWNoZWNrIHRvIGZhaWwgYW5kIGNhdXNlIGEgcmUtcmVuZGVyLlxuY29uc3QgUkVTRVRfVkFMVUUgPSB7fTtcblxuLyoqXG4gKiBTZXRzIHRoZSBjb21taXR0ZWQgdmFsdWUgb2YgYSBDaGlsZFBhcnQgZGlyZWN0bHkgd2l0aG91dCB0cmlnZ2VyaW5nIHRoZVxuICogY29tbWl0IHN0YWdlIG9mIHRoZSBwYXJ0LlxuICpcbiAqIFRoaXMgaXMgdXNlZnVsIGluIGNhc2VzIHdoZXJlIGEgZGlyZWN0aXZlIG5lZWRzIHRvIHVwZGF0ZSB0aGUgcGFydCBzdWNoXG4gKiB0aGF0IHRoZSBuZXh0IHVwZGF0ZSBkZXRlY3RzIGEgdmFsdWUgY2hhbmdlIG9yIG5vdC4gV2hlbiB2YWx1ZSBpcyBvbWl0dGVkLFxuICogdGhlIG5leHQgdXBkYXRlIHdpbGwgYmUgZ3VhcmFudGVlZCB0byBiZSBkZXRlY3RlZCBhcyBhIGNoYW5nZS5cbiAqXG4gKiBAcGFyYW0gcGFydFxuICogQHBhcmFtIHZhbHVlXG4gKi9cbmV4cG9ydCBjb25zdCBzZXRDb21taXR0ZWRWYWx1ZSA9IChwYXJ0OiBQYXJ0LCB2YWx1ZTogdW5rbm93biA9IFJFU0VUX1ZBTFVFKSA9PlxuICAocGFydC5fJGNvbW1pdHRlZFZhbHVlID0gdmFsdWUpO1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGNvbW1pdHRlZCB2YWx1ZSBvZiBhIENoaWxkUGFydC5cbiAqXG4gKiBUaGUgY29tbWl0dGVkIHZhbHVlIGlzIHVzZWQgZm9yIGNoYW5nZSBkZXRlY3Rpb24gYW5kIGVmZmljaWVudCB1cGRhdGVzIG9mXG4gKiB0aGUgcGFydC4gSXQgY2FuIGRpZmZlciBmcm9tIHRoZSB2YWx1ZSBzZXQgYnkgdGhlIHRlbXBsYXRlIG9yIGRpcmVjdGl2ZSBpblxuICogY2FzZXMgd2hlcmUgdGhlIHRlbXBsYXRlIHZhbHVlIGlzIHRyYW5zZm9ybWVkIGJlZm9yZSBiZWluZyBjb21taXR0ZWQuXG4gKlxuICogLSBgVGVtcGxhdGVSZXN1bHRgcyBhcmUgY29tbWl0dGVkIGFzIGEgYFRlbXBsYXRlSW5zdGFuY2VgXG4gKiAtIEl0ZXJhYmxlcyBhcmUgY29tbWl0dGVkIGFzIGBBcnJheTxDaGlsZFBhcnQ+YFxuICogLSBBbGwgb3RoZXIgdHlwZXMgYXJlIGNvbW1pdHRlZCBhcyB0aGUgdGVtcGxhdGUgdmFsdWUgb3IgdmFsdWUgcmV0dXJuZWQgb3JcbiAqICAgc2V0IGJ5IGEgZGlyZWN0aXZlLlxuICpcbiAqIEBwYXJhbSBwYXJ0XG4gKi9cbmV4cG9ydCBjb25zdCBnZXRDb21taXR0ZWRWYWx1ZSA9IChwYXJ0OiBDaGlsZFBhcnQpID0+IHBhcnQuXyRjb21taXR0ZWRWYWx1ZTtcblxuLyoqXG4gKiBSZW1vdmVzIGEgQ2hpbGRQYXJ0IGZyb20gdGhlIERPTSwgaW5jbHVkaW5nIGFueSBvZiBpdHMgY29udGVudC5cbiAqXG4gKiBAcGFyYW0gcGFydCBUaGUgUGFydCB0byByZW1vdmVcbiAqL1xuZXhwb3J0IGNvbnN0IHJlbW92ZVBhcnQgPSAocGFydDogQ2hpbGRQYXJ0KSA9PiB7XG4gIHBhcnQuXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZD8uKGZhbHNlLCB0cnVlKTtcbiAgbGV0IHN0YXJ0OiBDaGlsZE5vZGUgfCBudWxsID0gcGFydC5fJHN0YXJ0Tm9kZTtcbiAgY29uc3QgZW5kOiBDaGlsZE5vZGUgfCBudWxsID0gd3JhcChwYXJ0Ll8kZW5kTm9kZSEpLm5leHRTaWJsaW5nO1xuICB3aGlsZSAoc3RhcnQgIT09IGVuZCkge1xuICAgIGNvbnN0IG46IENoaWxkTm9kZSB8IG51bGwgPSB3cmFwKHN0YXJ0ISkubmV4dFNpYmxpbmc7XG4gICAgKHdyYXAoc3RhcnQhKSBhcyBDaGlsZE5vZGUpLnJlbW92ZSgpO1xuICAgIHN0YXJ0ID0gbjtcbiAgfVxufTtcblxuZXhwb3J0IGNvbnN0IGNsZWFyUGFydCA9IChwYXJ0OiBDaGlsZFBhcnQpID0+IHtcbiAgcGFydC5fJGNsZWFyKCk7XG59O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbi8qKlxuICogT3ZlcnZpZXc6XG4gKlxuICogVGhpcyBtb2R1bGUgaXMgZGVzaWduZWQgdG8gYWRkIHN1cHBvcnQgZm9yIGFuIGFzeW5jIGBzZXRWYWx1ZWAgQVBJIGFuZFxuICogYGRpc2Nvbm5lY3RlZGAgY2FsbGJhY2sgdG8gZGlyZWN0aXZlcyB3aXRoIHRoZSBsZWFzdCBpbXBhY3Qgb24gdGhlIGNvcmVcbiAqIHJ1bnRpbWUgb3IgcGF5bG9hZCB3aGVuIHRoYXQgZmVhdHVyZSBpcyBub3QgdXNlZC5cbiAqXG4gKiBUaGUgc3RyYXRlZ3kgaXMgdG8gaW50cm9kdWNlIGEgYEFzeW5jRGlyZWN0aXZlYCBzdWJjbGFzcyBvZlxuICogYERpcmVjdGl2ZWAgdGhhdCBjbGltYnMgdGhlIFwicGFyZW50XCIgdHJlZSBpbiBpdHMgY29uc3RydWN0b3IgdG8gbm90ZSB3aGljaFxuICogYnJhbmNoZXMgb2YgbGl0LWh0bWwncyBcImxvZ2ljYWwgdHJlZVwiIG9mIGRhdGEgc3RydWN0dXJlcyBjb250YWluIHN1Y2hcbiAqIGRpcmVjdGl2ZXMgYW5kIHRodXMgbmVlZCB0byBiZSBjcmF3bGVkIHdoZW4gYSBzdWJ0cmVlIGlzIGJlaW5nIGNsZWFyZWQgKG9yXG4gKiBtYW51YWxseSBkaXNjb25uZWN0ZWQpIGluIG9yZGVyIHRvIHJ1biB0aGUgYGRpc2Nvbm5lY3RlZGAgY2FsbGJhY2suXG4gKlxuICogVGhlIFwibm9kZXNcIiBvZiB0aGUgbG9naWNhbCB0cmVlIGluY2x1ZGUgUGFydHMsIFRlbXBsYXRlSW5zdGFuY2VzIChmb3Igd2hlbiBhXG4gKiBUZW1wbGF0ZVJlc3VsdCBpcyBjb21taXR0ZWQgdG8gYSB2YWx1ZSBvZiBhIENoaWxkUGFydCksIGFuZCBEaXJlY3RpdmVzOyB0aGVzZVxuICogYWxsIGltcGxlbWVudCBhIGNvbW1vbiBpbnRlcmZhY2UgY2FsbGVkIGBEaXNjb25uZWN0YWJsZUNoaWxkYC4gRWFjaCBoYXMgYVxuICogYF8kcGFyZW50YCByZWZlcmVuY2Ugd2hpY2ggaXMgc2V0IGR1cmluZyBjb25zdHJ1Y3Rpb24gaW4gdGhlIGNvcmUgY29kZSwgYW5kIGFcbiAqIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gIGZpZWxkIHdoaWNoIGlzIGluaXRpYWxseSB1bmRlZmluZWQuXG4gKlxuICogVGhlIHNwYXJzZSB0cmVlIGNyZWF0ZWQgYnkgbWVhbnMgb2YgdGhlIGBBc3luY0RpcmVjdGl2ZWAgY29uc3RydWN0b3JcbiAqIGNyYXdsaW5nIHVwIHRoZSBgXyRwYXJlbnRgIHRyZWUgYW5kIHBsYWNpbmcgYSBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCBTZXRcbiAqIG9uIGVhY2ggcGFyZW50IHRoYXQgaW5jbHVkZXMgZWFjaCBjaGlsZCB0aGF0IGNvbnRhaW5zIGFcbiAqIGBBc3luY0RpcmVjdGl2ZWAgZGlyZWN0bHkgb3IgdHJhbnNpdGl2ZWx5IHZpYSBpdHMgY2hpbGRyZW4uIEluIG9yZGVyIHRvXG4gKiBub3RpZnkgY29ubmVjdGlvbiBzdGF0ZSBjaGFuZ2VzIGFuZCBkaXNjb25uZWN0IChvciByZWNvbm5lY3QpIGEgdHJlZSwgdGhlXG4gKiBgXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZGAgQVBJIGlzIHBhdGNoZWQgb250byBDaGlsZFBhcnRzIGFzIGEgZGlyZWN0aXZlXG4gKiBjbGltYnMgdGhlIHBhcmVudCB0cmVlLCB3aGljaCBpcyBjYWxsZWQgYnkgdGhlIGNvcmUgd2hlbiBjbGVhcmluZyBhIHBhcnQgaWZcbiAqIGl0IGV4aXN0cy4gV2hlbiBjYWxsZWQsIHRoYXQgbWV0aG9kIGl0ZXJhdGVzIG92ZXIgdGhlIHNwYXJzZSB0cmVlIG9mXG4gKiBTZXQ8RGlzY29ubmVjdGFibGVDaGlsZHJlbj4gYnVpbHQgdXAgYnkgQXN5bmNEaXJlY3RpdmVzLCBhbmQgY2FsbHNcbiAqIGBfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkYCBvbiBhbnkgZGlyZWN0aXZlcyB0aGF0IGFyZSBlbmNvdW50ZXJlZFxuICogaW4gdGhhdCB0cmVlLCBydW5uaW5nIHRoZSByZXF1aXJlZCBjYWxsYmFja3MuXG4gKlxuICogQSBnaXZlbiBcImxvZ2ljYWwgdHJlZVwiIG9mIGxpdC1odG1sIGRhdGEtc3RydWN0dXJlcyBtaWdodCBsb29rIGxpa2UgdGhpczpcbiAqXG4gKiAgQ2hpbGRQYXJ0KE4xKSBfJGRDPVtEMixUM11cbiAqICAgLl9kaXJlY3RpdmVcbiAqICAgICBBc3luY0RpcmVjdGl2ZShEMilcbiAqICAgLl92YWx1ZSAvLyB1c2VyIHZhbHVlIHdhcyBUZW1wbGF0ZVJlc3VsdFxuICogICAgIFRlbXBsYXRlSW5zdGFuY2UoVDMpIF8kZEM9W0E0LEE2LE4xMCxOMTJdXG4gKiAgICAgIC5fJHBhcnRzW11cbiAqICAgICAgICBBdHRyaWJ1dGVQYXJ0KEE0KSBfJGRDPVtENV1cbiAqICAgICAgICAgLl9kaXJlY3RpdmVzW11cbiAqICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShENSlcbiAqICAgICAgICBBdHRyaWJ1dGVQYXJ0KEE2KSBfJGRDPVtENyxEOF1cbiAqICAgICAgICAgLl9kaXJlY3RpdmVzW11cbiAqICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShENylcbiAqICAgICAgICAgICBEaXJlY3RpdmUoRDgpIF8kZEM9W0Q5XVxuICogICAgICAgICAgICAuX2RpcmVjdGl2ZVxuICogICAgICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQ5KVxuICogICAgICAgIENoaWxkUGFydChOMTApIF8kZEM9W0QxMV1cbiAqICAgICAgICAgLl9kaXJlY3RpdmVcbiAqICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEMTEpXG4gKiAgICAgICAgIC5fdmFsdWVcbiAqICAgICAgICAgICBzdHJpbmdcbiAqICAgICAgICBDaGlsZFBhcnQoTjEyKSBfJGRDPVtEMTMsTjE0LE4xNl1cbiAqICAgICAgICAgLl9kaXJlY3RpdmVcbiAqICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEMTMpXG4gKiAgICAgICAgIC5fdmFsdWUgLy8gdXNlciB2YWx1ZSB3YXMgaXRlcmFibGVcbiAqICAgICAgICAgICBBcnJheTxDaGlsZFBhcnQ+XG4gKiAgICAgICAgICAgICBDaGlsZFBhcnQoTjE0KSBfJGRDPVtEMTVdXG4gKiAgICAgICAgICAgICAgLl92YWx1ZVxuICogICAgICAgICAgICAgICAgc3RyaW5nXG4gKiAgICAgICAgICAgICBDaGlsZFBhcnQoTjE2KSBfJGRDPVtEMTcsVDE4XVxuICogICAgICAgICAgICAgIC5fZGlyZWN0aXZlXG4gKiAgICAgICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEMTcpXG4gKiAgICAgICAgICAgICAgLl92YWx1ZSAvLyB1c2VyIHZhbHVlIHdhcyBUZW1wbGF0ZVJlc3VsdFxuICogICAgICAgICAgICAgICAgVGVtcGxhdGVJbnN0YW5jZShUMTgpIF8kZEM9W0ExOSxBMjEsTjI1XVxuICogICAgICAgICAgICAgICAgIC5fJHBhcnRzW11cbiAqICAgICAgICAgICAgICAgICAgIEF0dHJpYnV0ZVBhcnQoQTE5KSBfJGRDPVtEMjBdXG4gKiAgICAgICAgICAgICAgICAgICAgLl9kaXJlY3RpdmVzW11cbiAqICAgICAgICAgICAgICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQyMClcbiAqICAgICAgICAgICAgICAgICAgIEF0dHJpYnV0ZVBhcnQoQTIxKSBfJGRDPVsyMiwyM11cbiAqICAgICAgICAgICAgICAgICAgICAuX2RpcmVjdGl2ZXNbXVxuICogICAgICAgICAgICAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDIyKVxuICogICAgICAgICAgICAgICAgICAgICAgRGlyZWN0aXZlKEQyMykgXyRkQz1bRDI0XVxuICogICAgICAgICAgICAgICAgICAgICAgIC5fZGlyZWN0aXZlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEMjQpXG4gKiAgICAgICAgICAgICAgICAgICBDaGlsZFBhcnQoTjI1KSBfJGRDPVtEMjZdXG4gKiAgICAgICAgICAgICAgICAgICAgLl9kaXJlY3RpdmVcbiAqICAgICAgICAgICAgICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQyNilcbiAqICAgICAgICAgICAgICAgICAgICAuX3ZhbHVlXG4gKiAgICAgICAgICAgICAgICAgICAgICBzdHJpbmdcbiAqXG4gKiBFeGFtcGxlIDE6IFRoZSBkaXJlY3RpdmUgaW4gQ2hpbGRQYXJ0KE4xMikgdXBkYXRlcyBhbmQgcmV0dXJucyBgbm90aGluZ2AuIFRoZVxuICogQ2hpbGRQYXJ0IHdpbGwgX2NsZWFyKCkgaXRzZWxmLCBhbmQgc28gd2UgbmVlZCB0byBkaXNjb25uZWN0IHRoZSBcInZhbHVlXCIgb2ZcbiAqIHRoZSBDaGlsZFBhcnQgKGJ1dCBub3QgaXRzIGRpcmVjdGl2ZSkuIEluIHRoaXMgY2FzZSwgd2hlbiBgX2NsZWFyKClgIGNhbGxzXG4gKiBgXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZCgpYCwgd2UgZG9uJ3QgaXRlcmF0ZSBhbGwgb2YgdGhlXG4gKiBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4sIHJhdGhlciB3ZSBkbyBhIHZhbHVlLXNwZWNpZmljIGRpc2Nvbm5lY3Rpb246IGkuZS5cbiAqIHNpbmNlIHRoZSBfdmFsdWUgd2FzIGFuIEFycmF5PENoaWxkUGFydD4gKGJlY2F1c2UgYW4gaXRlcmFibGUgaGFkIGJlZW5cbiAqIGNvbW1pdHRlZCksIHdlIGl0ZXJhdGUgdGhlIGFycmF5IG9mIENoaWxkUGFydHMgKE4xNCwgTjE2KSBhbmQgcnVuXG4gKiBgc2V0Q29ubmVjdGVkYCBvbiB0aGVtICh3aGljaCBkb2VzIHJlY3Vyc2UgZG93biB0aGUgZnVsbCB0cmVlIG9mXG4gKiBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCBiZWxvdyBpdCwgYW5kIGFsc28gcmVtb3ZlcyBOMTQgYW5kIE4xNiBmcm9tIE4xMidzXG4gKiBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCkuIE9uY2UgdGhlIHZhbHVlcyBoYXZlIGJlZW4gZGlzY29ubmVjdGVkLCB3ZSB0aGVuXG4gKiBjaGVjayB3aGV0aGVyIHRoZSBDaGlsZFBhcnQoTjEyKSdzIGxpc3Qgb2YgYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAgaXMgZW1wdHlcbiAqIChhbmQgd291bGQgcmVtb3ZlIGl0IGZyb20gaXRzIHBhcmVudCBUZW1wbGF0ZUluc3RhbmNlKFQzKSBpZiBzbyksIGJ1dCBzaW5jZVxuICogaXQgd291bGQgc3RpbGwgY29udGFpbiBpdHMgZGlyZWN0aXZlIEQxMywgaXQgc3RheXMgaW4gdGhlIGRpc2Nvbm5lY3RhYmxlXG4gKiB0cmVlLlxuICpcbiAqIEV4YW1wbGUgMjogSW4gdGhlIGNvdXJzZSBvZiBFeGFtcGxlIDEsIGBzZXRDb25uZWN0ZWRgIHdpbGwgcmVhY2hcbiAqIENoaWxkUGFydChOMTYpOyBpbiB0aGlzIGNhc2UgdGhlIGVudGlyZSBwYXJ0IGlzIGJlaW5nIGRpc2Nvbm5lY3RlZCwgc28gd2VcbiAqIHNpbXBseSBpdGVyYXRlIGFsbCBvZiBOMTYncyBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCAoRDE3LFQxOCkgYW5kXG4gKiByZWN1cnNpdmVseSBydW4gYHNldENvbm5lY3RlZGAgb24gdGhlbS4gTm90ZSB0aGF0IHdlIG9ubHkgcmVtb3ZlIGNoaWxkcmVuXG4gKiBmcm9tIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gIGZvciB0aGUgdG9wLWxldmVsIHZhbHVlcyBiZWluZyBkaXNjb25uZWN0ZWRcbiAqIG9uIGEgY2xlYXI7IGRvaW5nIHRoaXMgYm9va2tlZXBpbmcgbG93ZXIgaW4gdGhlIHRyZWUgaXMgd2FzdGVmdWwgc2luY2UgaXQnc1xuICogYWxsIGJlaW5nIHRocm93biBhd2F5LlxuICpcbiAqIEV4YW1wbGUgMzogSWYgdGhlIExpdEVsZW1lbnQgY29udGFpbmluZyB0aGUgZW50aXJlIHRyZWUgYWJvdmUgYmVjb21lc1xuICogZGlzY29ubmVjdGVkLCBpdCB3aWxsIHJ1biBgY2hpbGRQYXJ0LnNldENvbm5lY3RlZCgpYCAod2hpY2ggY2FsbHNcbiAqIGBjaGlsZFBhcnQuXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZCgpYCBpZiBpdCBleGlzdHMpOyBpbiB0aGlzIGNhc2UsIHdlXG4gKiByZWN1cnNpdmVseSBydW4gYHNldENvbm5lY3RlZCgpYCBvdmVyIHRoZSBlbnRpcmUgdHJlZSwgd2l0aG91dCByZW1vdmluZyBhbnlcbiAqIGNoaWxkcmVuIGZyb20gYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAsIHNpbmNlIHRoaXMgdHJlZSBpcyByZXF1aXJlZCB0b1xuICogcmUtY29ubmVjdCB0aGUgdHJlZSwgd2hpY2ggZG9lcyB0aGUgc2FtZSBvcGVyYXRpb24sIHNpbXBseSBwYXNzaW5nXG4gKiBgaXNDb25uZWN0ZWQ6IHRydWVgIGRvd24gdGhlIHRyZWUsIHNpZ25hbGluZyB3aGljaCBjYWxsYmFjayB0byBydW4uXG4gKi9cblxuaW1wb3J0IHtBdHRyaWJ1dGVQYXJ0LCBDaGlsZFBhcnQsIERpc2Nvbm5lY3RhYmxlLCBQYXJ0fSBmcm9tICcuL2xpdC1odG1sLmpzJztcbmltcG9ydCB7aXNTaW5nbGVFeHByZXNzaW9ufSBmcm9tICcuL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcbmltcG9ydCB7RGlyZWN0aXZlLCBQYXJ0SW5mbywgUGFydFR5cGV9IGZyb20gJy4vZGlyZWN0aXZlLmpzJztcbmV4cG9ydCAqIGZyb20gJy4vZGlyZWN0aXZlLmpzJztcblxuY29uc3QgREVWX01PREUgPSB0cnVlO1xuXG4vKipcbiAqIFJlY3Vyc2l2ZWx5IHdhbGtzIGRvd24gdGhlIHRyZWUgb2YgUGFydHMvVGVtcGxhdGVJbnN0YW5jZXMvRGlyZWN0aXZlcyB0byBzZXRcbiAqIHRoZSBjb25uZWN0ZWQgc3RhdGUgb2YgZGlyZWN0aXZlcyBhbmQgcnVuIGBkaXNjb25uZWN0ZWRgLyBgcmVjb25uZWN0ZWRgXG4gKiBjYWxsYmFja3MuXG4gKlxuICogQHJldHVybiBUcnVlIGlmIHRoZXJlIHdlcmUgY2hpbGRyZW4gdG8gZGlzY29ubmVjdDsgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbmNvbnN0IG5vdGlmeUNoaWxkcmVuQ29ubmVjdGVkQ2hhbmdlZCA9IChcbiAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSxcbiAgaXNDb25uZWN0ZWQ6IGJvb2xlYW5cbik6IGJvb2xlYW4gPT4ge1xuICBjb25zdCBjaGlsZHJlbiA9IHBhcmVudC5fJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW47XG4gIGlmIChjaGlsZHJlbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGZvciAoY29uc3Qgb2JqIG9mIGNoaWxkcmVuKSB7XG4gICAgLy8gVGhlIGV4aXN0ZW5jZSBvZiBgXyRub3RpZnlEaXJlY3RpdmVDb25uZWN0aW9uQ2hhbmdlZGAgaXMgdXNlZCBhcyBhIFwiYnJhbmRcIiB0b1xuICAgIC8vIGRpc2FtYmlndWF0ZSBBc3luY0RpcmVjdGl2ZXMgZnJvbSBvdGhlciBEaXNjb25uZWN0YWJsZUNoaWxkcmVuXG4gICAgLy8gKGFzIG9wcG9zZWQgdG8gdXNpbmcgYW4gaW5zdGFuY2VvZiBjaGVjayB0byBrbm93IHdoZW4gdG8gY2FsbCBpdCk7IHRoZVxuICAgIC8vIHJlZHVuZGFuY3kgb2YgXCJEaXJlY3RpdmVcIiBpbiB0aGUgQVBJIG5hbWUgaXMgdG8gYXZvaWQgY29uZmxpY3Rpbmcgd2l0aFxuICAgIC8vIGBfJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkYCwgd2hpY2ggZXhpc3RzIGBDaGlsZFBhcnRzYCB3aGljaCBhcmUgYWxzbyBpblxuICAgIC8vIHRoaXMgbGlzdFxuICAgIC8vIERpc2Nvbm5lY3QgRGlyZWN0aXZlIChhbmQgYW55IG5lc3RlZCBkaXJlY3RpdmVzIGNvbnRhaW5lZCB3aXRoaW4pXG4gICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICAob2JqIGFzIEFzeW5jRGlyZWN0aXZlKVsnXyRub3RpZnlEaXJlY3RpdmVDb25uZWN0aW9uQ2hhbmdlZCddPy4oXG4gICAgICBpc0Nvbm5lY3RlZCxcbiAgICAgIGZhbHNlXG4gICAgKTtcbiAgICAvLyBEaXNjb25uZWN0IFBhcnQvVGVtcGxhdGVJbnN0YW5jZVxuICAgIG5vdGlmeUNoaWxkcmVuQ29ubmVjdGVkQ2hhbmdlZChvYmosIGlzQ29ubmVjdGVkKTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyB0aGUgZ2l2ZW4gY2hpbGQgZnJvbSBpdHMgcGFyZW50IGxpc3Qgb2YgZGlzY29ubmVjdGFibGUgY2hpbGRyZW4sIGFuZFxuICogaWYgdGhlIHBhcmVudCBsaXN0IGJlY29tZXMgZW1wdHkgYXMgYSByZXN1bHQsIHJlbW92ZXMgdGhlIHBhcmVudCBmcm9tIGl0c1xuICogcGFyZW50LCBhbmQgc28gZm9ydGggdXAgdGhlIHRyZWUgd2hlbiB0aGF0IGNhdXNlcyBzdWJzZXF1ZW50IHBhcmVudCBsaXN0cyB0b1xuICogYmVjb21lIGVtcHR5LlxuICovXG5jb25zdCByZW1vdmVEaXNjb25uZWN0YWJsZUZyb21QYXJlbnQgPSAob2JqOiBEaXNjb25uZWN0YWJsZSkgPT4ge1xuICBsZXQgcGFyZW50LCBjaGlsZHJlbjtcbiAgZG8ge1xuICAgIGlmICgocGFyZW50ID0gb2JqLl8kcGFyZW50KSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY2hpbGRyZW4gPSBwYXJlbnQuXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuITtcbiAgICBjaGlsZHJlbi5kZWxldGUob2JqKTtcbiAgICBvYmogPSBwYXJlbnQ7XG4gIH0gd2hpbGUgKGNoaWxkcmVuPy5zaXplID09PSAwKTtcbn07XG5cbmNvbnN0IGFkZERpc2Nvbm5lY3RhYmxlVG9QYXJlbnQgPSAob2JqOiBEaXNjb25uZWN0YWJsZSkgPT4ge1xuICAvLyBDbGltYiB0aGUgcGFyZW50IHRyZWUsIGNyZWF0aW5nIGEgc3BhcnNlIHRyZWUgb2YgY2hpbGRyZW4gbmVlZGluZ1xuICAvLyBkaXNjb25uZWN0aW9uXG4gIGZvciAobGV0IHBhcmVudDsgKHBhcmVudCA9IG9iai5fJHBhcmVudCk7IG9iaiA9IHBhcmVudCkge1xuICAgIGxldCBjaGlsZHJlbiA9IHBhcmVudC5fJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW47XG4gICAgaWYgKGNoaWxkcmVuID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHBhcmVudC5fJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4gPSBjaGlsZHJlbiA9IG5ldyBTZXQoKTtcbiAgICB9IGVsc2UgaWYgKGNoaWxkcmVuLmhhcyhvYmopKSB7XG4gICAgICAvLyBPbmNlIHdlJ3ZlIHJlYWNoZWQgYSBwYXJlbnQgdGhhdCBhbHJlYWR5IGNvbnRhaW5zIHRoaXMgY2hpbGQsIHdlXG4gICAgICAvLyBjYW4gc2hvcnQtY2lyY3VpdFxuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNoaWxkcmVuLmFkZChvYmopO1xuICAgIGluc3RhbGxEaXNjb25uZWN0QVBJKHBhcmVudCk7XG4gIH1cbn07XG5cbi8qKlxuICogQ2hhbmdlcyB0aGUgcGFyZW50IHJlZmVyZW5jZSBvZiB0aGUgQ2hpbGRQYXJ0LCBhbmQgdXBkYXRlcyB0aGUgc3BhcnNlIHRyZWUgb2ZcbiAqIERpc2Nvbm5lY3RhYmxlIGNoaWxkcmVuIGFjY29yZGluZ2x5LlxuICpcbiAqIE5vdGUsIHRoaXMgbWV0aG9kIHdpbGwgYmUgcGF0Y2hlZCBvbnRvIENoaWxkUGFydCBpbnN0YW5jZXMgYW5kIGNhbGxlZCBmcm9tXG4gKiB0aGUgY29yZSBjb2RlIHdoZW4gcGFydHMgYXJlIG1vdmVkIGJldHdlZW4gZGlmZmVyZW50IHBhcmVudHMuXG4gKi9cbmZ1bmN0aW9uIHJlcGFyZW50RGlzY29ubmVjdGFibGVzKHRoaXM6IENoaWxkUGFydCwgbmV3UGFyZW50OiBEaXNjb25uZWN0YWJsZSkge1xuICBpZiAodGhpcy5fJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4gIT09IHVuZGVmaW5lZCkge1xuICAgIHJlbW92ZURpc2Nvbm5lY3RhYmxlRnJvbVBhcmVudCh0aGlzKTtcbiAgICB0aGlzLl8kcGFyZW50ID0gbmV3UGFyZW50O1xuICAgIGFkZERpc2Nvbm5lY3RhYmxlVG9QYXJlbnQodGhpcyk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fJHBhcmVudCA9IG5ld1BhcmVudDtcbiAgfVxufVxuXG4vKipcbiAqIFNldHMgdGhlIGNvbm5lY3RlZCBzdGF0ZSBvbiBhbnkgZGlyZWN0aXZlcyBjb250YWluZWQgd2l0aGluIHRoZSBjb21taXR0ZWRcbiAqIHZhbHVlIG9mIHRoaXMgcGFydCAoaS5lLiB3aXRoaW4gYSBUZW1wbGF0ZUluc3RhbmNlIG9yIGl0ZXJhYmxlIG9mXG4gKiBDaGlsZFBhcnRzKSBhbmQgcnVucyB0aGVpciBgZGlzY29ubmVjdGVkYC9gcmVjb25uZWN0ZWRgcywgYXMgd2VsbCBhcyB3aXRoaW5cbiAqIGFueSBkaXJlY3RpdmVzIHN0b3JlZCBvbiB0aGUgQ2hpbGRQYXJ0ICh3aGVuIGB2YWx1ZU9ubHlgIGlzIGZhbHNlKS5cbiAqXG4gKiBgaXNDbGVhcmluZ1ZhbHVlYCBzaG91bGQgYmUgcGFzc2VkIGFzIGB0cnVlYCBvbiBhIHRvcC1sZXZlbCBwYXJ0IHRoYXQgaXNcbiAqIGNsZWFyaW5nIGl0c2VsZiwgYW5kIG5vdCBhcyBhIHJlc3VsdCBvZiByZWN1cnNpdmVseSBkaXNjb25uZWN0aW5nIGRpcmVjdGl2ZXNcbiAqIGFzIHBhcnQgb2YgYSBgY2xlYXJgIG9wZXJhdGlvbiBoaWdoZXIgdXAgdGhlIHRyZWUuIFRoaXMgYm90aCBlbnN1cmVzIHRoYXQgYW55XG4gKiBkaXJlY3RpdmUgb24gdGhpcyBDaGlsZFBhcnQgdGhhdCBwcm9kdWNlZCBhIHZhbHVlIHRoYXQgY2F1c2VkIHRoZSBjbGVhclxuICogb3BlcmF0aW9uIGlzIG5vdCBkaXNjb25uZWN0ZWQsIGFuZCBhbHNvIHNlcnZlcyBhcyBhIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvblxuICogdG8gYXZvaWQgbmVlZGxlc3MgYm9va2tlZXBpbmcgd2hlbiBhIHN1YnRyZWUgaXMgZ29pbmcgYXdheTsgd2hlbiBjbGVhcmluZyBhXG4gKiBzdWJ0cmVlLCBvbmx5IHRoZSB0b3AtbW9zdCBwYXJ0IG5lZWQgdG8gcmVtb3ZlIGl0c2VsZiBmcm9tIHRoZSBwYXJlbnQuXG4gKlxuICogYGZyb21QYXJ0SW5kZXhgIGlzIHBhc3NlZCBvbmx5IGluIHRoZSBjYXNlIG9mIGEgcGFydGlhbCBgX2NsZWFyYCBydW5uaW5nIGFzIGFcbiAqIHJlc3VsdCBvZiB0cnVuY2F0aW5nIGFuIGl0ZXJhYmxlLlxuICpcbiAqIE5vdGUsIHRoaXMgbWV0aG9kIHdpbGwgYmUgcGF0Y2hlZCBvbnRvIENoaWxkUGFydCBpbnN0YW5jZXMgYW5kIGNhbGxlZCBmcm9tIHRoZVxuICogY29yZSBjb2RlIHdoZW4gcGFydHMgYXJlIGNsZWFyZWQgb3IgdGhlIGNvbm5lY3Rpb24gc3RhdGUgaXMgY2hhbmdlZCBieSB0aGVcbiAqIHVzZXIuXG4gKi9cbmZ1bmN0aW9uIG5vdGlmeUNoaWxkUGFydENvbm5lY3RlZENoYW5nZWQoXG4gIHRoaXM6IENoaWxkUGFydCxcbiAgaXNDb25uZWN0ZWQ6IGJvb2xlYW4sXG4gIGlzQ2xlYXJpbmdWYWx1ZSA9IGZhbHNlLFxuICBmcm9tUGFydEluZGV4ID0gMFxuKSB7XG4gIGNvbnN0IHZhbHVlID0gdGhpcy5fJGNvbW1pdHRlZFZhbHVlO1xuICBjb25zdCBjaGlsZHJlbiA9IHRoaXMuXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuO1xuICBpZiAoY2hpbGRyZW4gPT09IHVuZGVmaW5lZCB8fCBjaGlsZHJlbi5zaXplID09PSAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChpc0NsZWFyaW5nVmFsdWUpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIC8vIEl0ZXJhYmxlIGNhc2U6IEFueSBDaGlsZFBhcnRzIGNyZWF0ZWQgYnkgdGhlIGl0ZXJhYmxlIHNob3VsZCBiZVxuICAgICAgLy8gZGlzY29ubmVjdGVkIGFuZCByZW1vdmVkIGZyb20gdGhpcyBDaGlsZFBhcnQncyBkaXNjb25uZWN0YWJsZVxuICAgICAgLy8gY2hpbGRyZW4gKHN0YXJ0aW5nIGF0IGBmcm9tUGFydEluZGV4YCBpbiB0aGUgY2FzZSBvZiB0cnVuY2F0aW9uKVxuICAgICAgZm9yIChsZXQgaSA9IGZyb21QYXJ0SW5kZXg7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICBub3RpZnlDaGlsZHJlbkNvbm5lY3RlZENoYW5nZWQodmFsdWVbaV0sIGZhbHNlKTtcbiAgICAgICAgcmVtb3ZlRGlzY29ubmVjdGFibGVGcm9tUGFyZW50KHZhbHVlW2ldKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgIC8vIFRlbXBsYXRlSW5zdGFuY2UgY2FzZTogSWYgdGhlIHZhbHVlIGhhcyBkaXNjb25uZWN0YWJsZSBjaGlsZHJlbiAod2lsbFxuICAgICAgLy8gb25seSBiZSBpbiB0aGUgY2FzZSB0aGF0IGl0IGlzIGEgVGVtcGxhdGVJbnN0YW5jZSksIHdlIGRpc2Nvbm5lY3QgaXRcbiAgICAgIC8vIGFuZCByZW1vdmUgaXQgZnJvbSB0aGlzIENoaWxkUGFydCdzIGRpc2Nvbm5lY3RhYmxlIGNoaWxkcmVuXG4gICAgICBub3RpZnlDaGlsZHJlbkNvbm5lY3RlZENoYW5nZWQodmFsdWUgYXMgRGlzY29ubmVjdGFibGUsIGZhbHNlKTtcbiAgICAgIHJlbW92ZURpc2Nvbm5lY3RhYmxlRnJvbVBhcmVudCh2YWx1ZSBhcyBEaXNjb25uZWN0YWJsZSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG5vdGlmeUNoaWxkcmVuQ29ubmVjdGVkQ2hhbmdlZCh0aGlzLCBpc0Nvbm5lY3RlZCk7XG4gIH1cbn1cblxuLyoqXG4gKiBQYXRjaGVzIGRpc2Nvbm5lY3Rpb24gQVBJIG9udG8gQ2hpbGRQYXJ0cy5cbiAqL1xuY29uc3QgaW5zdGFsbERpc2Nvbm5lY3RBUEkgPSAob2JqOiBEaXNjb25uZWN0YWJsZSkgPT4ge1xuICBpZiAoKG9iaiBhcyBDaGlsZFBhcnQpLnR5cGUgPT0gUGFydFR5cGUuQ0hJTEQpIHtcbiAgICAob2JqIGFzIENoaWxkUGFydCkuXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZCA/Pz1cbiAgICAgIG5vdGlmeUNoaWxkUGFydENvbm5lY3RlZENoYW5nZWQ7XG4gICAgKG9iaiBhcyBDaGlsZFBhcnQpLl8kcmVwYXJlbnREaXNjb25uZWN0YWJsZXMgPz89IHJlcGFyZW50RGlzY29ubmVjdGFibGVzO1xuICB9XG59O1xuXG4vKipcbiAqIEFuIGFic3RyYWN0IGBEaXJlY3RpdmVgIGJhc2UgY2xhc3Mgd2hvc2UgYGRpc2Nvbm5lY3RlZGAgbWV0aG9kIHdpbGwgYmVcbiAqIGNhbGxlZCB3aGVuIHRoZSBwYXJ0IGNvbnRhaW5pbmcgdGhlIGRpcmVjdGl2ZSBpcyBjbGVhcmVkIGFzIGEgcmVzdWx0IG9mXG4gKiByZS1yZW5kZXJpbmcsIG9yIHdoZW4gdGhlIHVzZXIgY2FsbHMgYHBhcnQuc2V0Q29ubmVjdGVkKGZhbHNlKWAgb25cbiAqIGEgcGFydCB0aGF0IHdhcyBwcmV2aW91c2x5IHJlbmRlcmVkIGNvbnRhaW5pbmcgdGhlIGRpcmVjdGl2ZSAoYXMgaGFwcGVuc1xuICogd2hlbiBlLmcuIGEgTGl0RWxlbWVudCBkaXNjb25uZWN0cyBmcm9tIHRoZSBET00pLlxuICpcbiAqIElmIGBwYXJ0LnNldENvbm5lY3RlZCh0cnVlKWAgaXMgc3Vic2VxdWVudGx5IGNhbGxlZCBvbiBhXG4gKiBjb250YWluaW5nIHBhcnQsIHRoZSBkaXJlY3RpdmUncyBgcmVjb25uZWN0ZWRgIG1ldGhvZCB3aWxsIGJlIGNhbGxlZCBwcmlvclxuICogdG8gaXRzIG5leHQgYHVwZGF0ZWAvYHJlbmRlcmAgY2FsbGJhY2tzLiBXaGVuIGltcGxlbWVudGluZyBgZGlzY29ubmVjdGVkYCxcbiAqIGByZWNvbm5lY3RlZGAgc2hvdWxkIGFsc28gYmUgaW1wbGVtZW50ZWQgdG8gYmUgY29tcGF0aWJsZSB3aXRoIHJlY29ubmVjdGlvbi5cbiAqXG4gKiBOb3RlIHRoYXQgdXBkYXRlcyBtYXkgb2NjdXIgd2hpbGUgdGhlIGRpcmVjdGl2ZSBpcyBkaXNjb25uZWN0ZWQuIEFzIHN1Y2gsXG4gKiBkaXJlY3RpdmVzIHNob3VsZCBnZW5lcmFsbHkgY2hlY2sgdGhlIGB0aGlzLmlzQ29ubmVjdGVkYCBmbGFnIGR1cmluZ1xuICogcmVuZGVyL3VwZGF0ZSB0byBkZXRlcm1pbmUgd2hldGhlciBpdCBpcyBzYWZlIHRvIHN1YnNjcmliZSB0byByZXNvdXJjZXNcbiAqIHRoYXQgbWF5IHByZXZlbnQgZ2FyYmFnZSBjb2xsZWN0aW9uLlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQXN5bmNEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICAvLyBBcyBvcHBvc2VkIHRvIG90aGVyIERpc2Nvbm5lY3RhYmxlcywgQXN5bmNEaXJlY3RpdmVzIGFsd2F5cyBnZXQgbm90aWZpZWRcbiAgLy8gd2hlbiB0aGUgUm9vdFBhcnQgY29ubmVjdGlvbiBjaGFuZ2VzLCBzbyB0aGUgcHVibGljIGBpc0Nvbm5lY3RlZGBcbiAgLy8gaXMgYSBsb2NhbGx5IHN0b3JlZCB2YXJpYWJsZSBpbml0aWFsaXplZCB2aWEgaXRzIHBhcnQncyBnZXR0ZXIgYW5kIHN5bmNlZFxuICAvLyB2aWEgYF8kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWRgLiBUaGlzIGlzIGNoZWFwZXIgdGhhbiB1c2luZ1xuICAvLyB0aGUgXyRpc0Nvbm5lY3RlZCBnZXR0ZXIsIHdoaWNoIGhhcyB0byBsb29rIGJhY2sgdXAgdGhlIHRyZWUgZWFjaCB0aW1lLlxuICAvKipcbiAgICogVGhlIGNvbm5lY3Rpb24gc3RhdGUgZm9yIHRoaXMgRGlyZWN0aXZlLlxuICAgKi9cbiAgaXNDb25uZWN0ZWQhOiBib29sZWFuO1xuXG4gIC8vIEBpbnRlcm5hbFxuICBvdmVycmlkZSBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4/OiBTZXQ8RGlzY29ubmVjdGFibGU+ID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogSW5pdGlhbGl6ZSB0aGUgcGFydCB3aXRoIGludGVybmFsIGZpZWxkc1xuICAgKiBAcGFyYW0gcGFydFxuICAgKiBAcGFyYW0gcGFyZW50XG4gICAqIEBwYXJhbSBhdHRyaWJ1dGVJbmRleFxuICAgKi9cbiAgb3ZlcnJpZGUgXyRpbml0aWFsaXplKFxuICAgIHBhcnQ6IFBhcnQsXG4gICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSxcbiAgICBhdHRyaWJ1dGVJbmRleDogbnVtYmVyIHwgdW5kZWZpbmVkXG4gICkge1xuICAgIHN1cGVyLl8kaW5pdGlhbGl6ZShwYXJ0LCBwYXJlbnQsIGF0dHJpYnV0ZUluZGV4KTtcbiAgICBhZGREaXNjb25uZWN0YWJsZVRvUGFyZW50KHRoaXMpO1xuICAgIHRoaXMuaXNDb25uZWN0ZWQgPSBwYXJ0Ll8kaXNDb25uZWN0ZWQ7XG4gIH1cbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgLyoqXG4gICAqIENhbGxlZCBmcm9tIHRoZSBjb3JlIGNvZGUgd2hlbiBhIGRpcmVjdGl2ZSBpcyBnb2luZyBhd2F5IGZyb20gYSBwYXJ0IChpblxuICAgKiB3aGljaCBjYXNlIGBzaG91bGRSZW1vdmVGcm9tUGFyZW50YCBzaG91bGQgYmUgdHJ1ZSksIGFuZCBmcm9tIHRoZVxuICAgKiBgc2V0Q2hpbGRyZW5Db25uZWN0ZWRgIGhlbHBlciBmdW5jdGlvbiB3aGVuIHJlY3Vyc2l2ZWx5IGNoYW5naW5nIHRoZVxuICAgKiBjb25uZWN0aW9uIHN0YXRlIG9mIGEgdHJlZSAoaW4gd2hpY2ggY2FzZSBgc2hvdWxkUmVtb3ZlRnJvbVBhcmVudGAgc2hvdWxkXG4gICAqIGJlIGZhbHNlKS5cbiAgICpcbiAgICogQHBhcmFtIGlzQ29ubmVjdGVkXG4gICAqIEBwYXJhbSBpc0NsZWFyaW5nRGlyZWN0aXZlIC0gVHJ1ZSB3aGVuIHRoZSBkaXJlY3RpdmUgaXRzZWxmIGlzIGJlaW5nXG4gICAqICAgICByZW1vdmVkOyBmYWxzZSB3aGVuIHRoZSB0cmVlIGlzIGJlaW5nIGRpc2Nvbm5lY3RlZFxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIG92ZXJyaWRlIFsnXyRub3RpZnlEaXJlY3RpdmVDb25uZWN0aW9uQ2hhbmdlZCddKFxuICAgIGlzQ29ubmVjdGVkOiBib29sZWFuLFxuICAgIGlzQ2xlYXJpbmdEaXJlY3RpdmUgPSB0cnVlXG4gICkge1xuICAgIGlmIChpc0Nvbm5lY3RlZCAhPT0gdGhpcy5pc0Nvbm5lY3RlZCkge1xuICAgICAgdGhpcy5pc0Nvbm5lY3RlZCA9IGlzQ29ubmVjdGVkO1xuICAgICAgaWYgKGlzQ29ubmVjdGVkKSB7XG4gICAgICAgIHRoaXMucmVjb25uZWN0ZWQ/LigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5kaXNjb25uZWN0ZWQ/LigpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXNDbGVhcmluZ0RpcmVjdGl2ZSkge1xuICAgICAgbm90aWZ5Q2hpbGRyZW5Db25uZWN0ZWRDaGFuZ2VkKHRoaXMsIGlzQ29ubmVjdGVkKTtcbiAgICAgIHJlbW92ZURpc2Nvbm5lY3RhYmxlRnJvbVBhcmVudCh0aGlzKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgdmFsdWUgb2YgdGhlIGRpcmVjdGl2ZSdzIFBhcnQgb3V0c2lkZSB0aGUgbm9ybWFsIGB1cGRhdGVgL2ByZW5kZXJgXG4gICAqIGxpZmVjeWNsZSBvZiBhIGRpcmVjdGl2ZS5cbiAgICpcbiAgICogVGhpcyBtZXRob2Qgc2hvdWxkIG5vdCBiZSBjYWxsZWQgc3luY2hyb25vdXNseSBmcm9tIGEgZGlyZWN0aXZlJ3MgYHVwZGF0ZWBcbiAgICogb3IgYHJlbmRlcmAuXG4gICAqXG4gICAqIEBwYXJhbSBkaXJlY3RpdmUgVGhlIGRpcmVjdGl2ZSB0byB1cGRhdGVcbiAgICogQHBhcmFtIHZhbHVlIFRoZSB2YWx1ZSB0byBzZXRcbiAgICovXG4gIHNldFZhbHVlKHZhbHVlOiB1bmtub3duKSB7XG4gICAgaWYgKGlzU2luZ2xlRXhwcmVzc2lvbih0aGlzLl9fcGFydCBhcyB1bmtub3duIGFzIFBhcnRJbmZvKSkge1xuICAgICAgdGhpcy5fX3BhcnQuXyRzZXRWYWx1ZSh2YWx1ZSwgdGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHRoaXMuX19hdHRyaWJ1dGVJbmRleCB3aWxsIGJlIGRlZmluZWQgaW4gdGhpcyBjYXNlLCBidXRcbiAgICAgIC8vIGFzc2VydCBpdCBpbiBkZXYgbW9kZVxuICAgICAgaWYgKERFVl9NT0RFICYmIHRoaXMuX19hdHRyaWJ1dGVJbmRleCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgdGhpcy5fX2F0dHJpYnV0ZUluZGV4IHRvIGJlIGEgbnVtYmVyYCk7XG4gICAgICB9XG4gICAgICBjb25zdCBuZXdWYWx1ZXMgPSBbLi4uKHRoaXMuX19wYXJ0Ll8kY29tbWl0dGVkVmFsdWUgYXMgQXJyYXk8dW5rbm93bj4pXTtcbiAgICAgIG5ld1ZhbHVlc1t0aGlzLl9fYXR0cmlidXRlSW5kZXghXSA9IHZhbHVlO1xuICAgICAgKHRoaXMuX19wYXJ0IGFzIEF0dHJpYnV0ZVBhcnQpLl8kc2V0VmFsdWUobmV3VmFsdWVzLCB0aGlzLCAwKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVXNlciBjYWxsYmFja3MgZm9yIGltcGxlbWVudGluZyBsb2dpYyB0byByZWxlYXNlIGFueSByZXNvdXJjZXMvc3Vic2NyaXB0aW9uc1xuICAgKiB0aGF0IG1heSBoYXZlIGJlZW4gcmV0YWluZWQgYnkgdGhpcyBkaXJlY3RpdmUuIFNpbmNlIGRpcmVjdGl2ZXMgbWF5IGFsc28gYmVcbiAgICogcmUtY29ubmVjdGVkLCBgcmVjb25uZWN0ZWRgIHNob3VsZCBhbHNvIGJlIGltcGxlbWVudGVkIHRvIHJlc3RvcmUgdGhlXG4gICAqIHdvcmtpbmcgc3RhdGUgb2YgdGhlIGRpcmVjdGl2ZSBwcmlvciB0byB0aGUgbmV4dCByZW5kZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgZGlzY29ubmVjdGVkKCkge31cbiAgcHJvdGVjdGVkIHJlY29ubmVjdGVkKCkge31cbn1cbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuaW1wb3J0IHtub3RoaW5nLCBFbGVtZW50UGFydH0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIEFzeW5jRGlyZWN0aXZlfSBmcm9tICcuLi9hc3luYy1kaXJlY3RpdmUuanMnO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgUmVmIG9iamVjdCwgd2hpY2ggaXMgY29udGFpbmVyIGZvciBhIHJlZmVyZW5jZSB0byBhbiBlbGVtZW50LlxuICovXG5leHBvcnQgY29uc3QgY3JlYXRlUmVmID0gPFQgPSBFbGVtZW50PigpID0+IG5ldyBSZWY8VD4oKTtcblxuLyoqXG4gKiBBbiBvYmplY3QgdGhhdCBob2xkcyBhIHJlZiB2YWx1ZS5cbiAqL1xuY2xhc3MgUmVmPFQgPSBFbGVtZW50PiB7XG4gIC8qKlxuICAgKiBUaGUgY3VycmVudCBFbGVtZW50IHZhbHVlIG9mIHRoZSByZWYsIG9yIGVsc2UgYHVuZGVmaW5lZGAgaWYgdGhlIHJlZiBpcyBub1xuICAgKiBsb25nZXIgcmVuZGVyZWQuXG4gICAqL1xuICByZWFkb25seSB2YWx1ZT86IFQ7XG59XG5cbmV4cG9ydCB0eXBlIHtSZWZ9O1xuXG5pbnRlcmZhY2UgUmVmSW50ZXJuYWwge1xuICB2YWx1ZTogRWxlbWVudCB8IHVuZGVmaW5lZDtcbn1cblxuLy8gV2hlbiBjYWxsYmFja3MgYXJlIHVzZWQgZm9yIHJlZnMsIHRoaXMgbWFwIHRyYWNrcyB0aGUgbGFzdCB2YWx1ZSB0aGUgY2FsbGJhY2tcbi8vIHdhcyBjYWxsZWQgd2l0aCwgZm9yIGVuc3VyaW5nIGEgZGlyZWN0aXZlIGRvZXNuJ3QgY2xlYXIgdGhlIHJlZiBpZiB0aGUgcmVmXG4vLyBoYXMgYWxyZWFkeSBiZWVuIHJlbmRlcmVkIHRvIGEgbmV3IHNwb3QuIEl0IGlzIGRvdWJsZS1rZXllZCBvbiBib3RoIHRoZVxuLy8gY29udGV4dCAoYG9wdGlvbnMuaG9zdGApIGFuZCB0aGUgY2FsbGJhY2ssIHNpbmNlIHdlIGF1dG8tYmluZCBjbGFzcyBtZXRob2RzXG4vLyB0byBgb3B0aW9ucy5ob3N0YC5cbmNvbnN0IGxhc3RFbGVtZW50Rm9yQ29udGV4dEFuZENhbGxiYWNrID0gbmV3IFdlYWtNYXA8XG4gIG9iamVjdCxcbiAgV2Vha01hcDxGdW5jdGlvbiwgRWxlbWVudCB8IHVuZGVmaW5lZD5cbj4oKTtcblxuZXhwb3J0IHR5cGUgUmVmT3JDYWxsYmFjazxUID0gRWxlbWVudD4gPSBSZWY8VD4gfCAoKGVsOiBUIHwgdW5kZWZpbmVkKSA9PiB2b2lkKTtcblxuY2xhc3MgUmVmRGlyZWN0aXZlIGV4dGVuZHMgQXN5bmNEaXJlY3RpdmUge1xuICBwcml2YXRlIF9lbGVtZW50PzogRWxlbWVudDtcbiAgcHJpdmF0ZSBfcmVmPzogUmVmT3JDYWxsYmFjaztcbiAgcHJpdmF0ZSBfY29udGV4dD86IG9iamVjdDtcblxuICByZW5kZXIoX3JlZj86IFJlZk9yQ2FsbGJhY2spIHtcbiAgICByZXR1cm4gbm90aGluZztcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShwYXJ0OiBFbGVtZW50UGFydCwgW3JlZl06IFBhcmFtZXRlcnM8dGhpc1sncmVuZGVyJ10+KSB7XG4gICAgY29uc3QgcmVmQ2hhbmdlZCA9IHJlZiAhPT0gdGhpcy5fcmVmO1xuICAgIGlmIChyZWZDaGFuZ2VkICYmIHRoaXMuX3JlZiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBUaGUgcmVmIHBhc3NlZCB0byB0aGUgZGlyZWN0aXZlIGhhcyBjaGFuZ2VkO1xuICAgICAgLy8gdW5zZXQgdGhlIHByZXZpb3VzIHJlZidzIHZhbHVlXG4gICAgICB0aGlzLl91cGRhdGVSZWZWYWx1ZSh1bmRlZmluZWQpO1xuICAgIH1cbiAgICBpZiAocmVmQ2hhbmdlZCB8fCB0aGlzLl9sYXN0RWxlbWVudEZvclJlZiAhPT0gdGhpcy5fZWxlbWVudCkge1xuICAgICAgLy8gV2UgZWl0aGVyIGdvdCBhIG5ldyByZWYgb3IgdGhpcyBpcyB0aGUgZmlyc3QgcmVuZGVyO1xuICAgICAgLy8gc3RvcmUgdGhlIHJlZi9lbGVtZW50ICYgdXBkYXRlIHRoZSByZWYgdmFsdWVcbiAgICAgIHRoaXMuX3JlZiA9IHJlZjtcbiAgICAgIHRoaXMuX2NvbnRleHQgPSBwYXJ0Lm9wdGlvbnM/Lmhvc3Q7XG4gICAgICB0aGlzLl91cGRhdGVSZWZWYWx1ZSgodGhpcy5fZWxlbWVudCA9IHBhcnQuZWxlbWVudCkpO1xuICAgIH1cbiAgICByZXR1cm4gbm90aGluZztcbiAgfVxuXG4gIHByaXZhdGUgX3VwZGF0ZVJlZlZhbHVlKGVsZW1lbnQ6IEVsZW1lbnQgfCB1bmRlZmluZWQpIHtcbiAgICBpZiAoIXRoaXMuaXNDb25uZWN0ZWQpIHtcbiAgICAgIGVsZW1lbnQgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgdGhpcy5fcmVmID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAvLyBJZiB0aGUgY3VycmVudCByZWYgd2FzIGNhbGxlZCB3aXRoIGEgcHJldmlvdXMgdmFsdWUsIGNhbGwgd2l0aFxuICAgICAgLy8gYHVuZGVmaW5lZGA7IFdlIGRvIHRoaXMgdG8gZW5zdXJlIGNhbGxiYWNrcyBhcmUgY2FsbGVkIGluIGEgY29uc2lzdGVudFxuICAgICAgLy8gd2F5IHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciBhIHJlZiBtaWdodCBiZSBtb3ZpbmcgdXAgaW4gdGhlIHRyZWUgKGluXG4gICAgICAvLyB3aGljaCBjYXNlIGl0IHdvdWxkIG90aGVyd2lzZSBiZSBjYWxsZWQgd2l0aCB0aGUgbmV3IHZhbHVlIGJlZm9yZSB0aGVcbiAgICAgIC8vIHByZXZpb3VzIG9uZSB1bnNldHMgaXQpIGFuZCBkb3duIGluIHRoZSB0cmVlICh3aGVyZSBpdCB3b3VsZCBiZSB1bnNldFxuICAgICAgLy8gYmVmb3JlIGJlaW5nIHNldCkuIE5vdGUgdGhhdCBlbGVtZW50IGxvb2t1cCBpcyBrZXllZCBieVxuICAgICAgLy8gYm90aCB0aGUgY29udGV4dCBhbmQgdGhlIGNhbGxiYWNrLCBzaW5jZSB3ZSBhbGxvdyBwYXNzaW5nIHVuYm91bmRcbiAgICAgIC8vIGZ1bmN0aW9ucyB0aGF0IGFyZSBjYWxsZWQgb24gb3B0aW9ucy5ob3N0LCBhbmQgd2Ugd2FudCB0byB0cmVhdFxuICAgICAgLy8gdGhlc2UgYXMgdW5pcXVlIFwiaW5zdGFuY2VzXCIgb2YgYSBmdW5jdGlvbi5cbiAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLl9jb250ZXh0ID8/IGdsb2JhbFRoaXM7XG4gICAgICBsZXQgbGFzdEVsZW1lbnRGb3JDYWxsYmFjayA9XG4gICAgICAgIGxhc3RFbGVtZW50Rm9yQ29udGV4dEFuZENhbGxiYWNrLmdldChjb250ZXh0KTtcbiAgICAgIGlmIChsYXN0RWxlbWVudEZvckNhbGxiYWNrID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbGFzdEVsZW1lbnRGb3JDYWxsYmFjayA9IG5ldyBXZWFrTWFwKCk7XG4gICAgICAgIGxhc3RFbGVtZW50Rm9yQ29udGV4dEFuZENhbGxiYWNrLnNldChjb250ZXh0LCBsYXN0RWxlbWVudEZvckNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIGlmIChsYXN0RWxlbWVudEZvckNhbGxiYWNrLmdldCh0aGlzLl9yZWYpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fcmVmLmNhbGwodGhpcy5fY29udGV4dCwgdW5kZWZpbmVkKTtcbiAgICAgIH1cbiAgICAgIGxhc3RFbGVtZW50Rm9yQ2FsbGJhY2suc2V0KHRoaXMuX3JlZiwgZWxlbWVudCk7XG4gICAgICAvLyBDYWxsIHRoZSByZWYgd2l0aCB0aGUgbmV3IGVsZW1lbnQgdmFsdWVcbiAgICAgIGlmIChlbGVtZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fcmVmLmNhbGwodGhpcy5fY29udGV4dCwgZWxlbWVudCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICh0aGlzLl9yZWYgYXMgUmVmSW50ZXJuYWwpIS52YWx1ZSA9IGVsZW1lbnQ7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXQgX2xhc3RFbGVtZW50Rm9yUmVmKCkge1xuICAgIHJldHVybiB0eXBlb2YgdGhpcy5fcmVmID09PSAnZnVuY3Rpb24nXG4gICAgICA/IGxhc3RFbGVtZW50Rm9yQ29udGV4dEFuZENhbGxiYWNrXG4gICAgICAgICAgLmdldCh0aGlzLl9jb250ZXh0ID8/IGdsb2JhbFRoaXMpXG4gICAgICAgICAgPy5nZXQodGhpcy5fcmVmKVxuICAgICAgOiB0aGlzLl9yZWY/LnZhbHVlO1xuICB9XG5cbiAgb3ZlcnJpZGUgZGlzY29ubmVjdGVkKCkge1xuICAgIC8vIE9ubHkgY2xlYXIgdGhlIGJveCBpZiBvdXIgZWxlbWVudCBpcyBzdGlsbCB0aGUgb25lIGluIGl0IChpLmUuIGFub3RoZXJcbiAgICAvLyBkaXJlY3RpdmUgaW5zdGFuY2UgaGFzbid0IHJlbmRlcmVkIGl0cyBlbGVtZW50IHRvIGl0IGJlZm9yZSB1cyk7IHRoYXRcbiAgICAvLyBvbmx5IGhhcHBlbnMgaW4gdGhlIGV2ZW50IG9mIHRoZSBkaXJlY3RpdmUgYmVpbmcgY2xlYXJlZCAobm90IHZpYSBtYW51YWxcbiAgICAvLyBkaXNjb25uZWN0aW9uKVxuICAgIGlmICh0aGlzLl9sYXN0RWxlbWVudEZvclJlZiA9PT0gdGhpcy5fZWxlbWVudCkge1xuICAgICAgdGhpcy5fdXBkYXRlUmVmVmFsdWUodW5kZWZpbmVkKTtcbiAgICB9XG4gIH1cblxuICBvdmVycmlkZSByZWNvbm5lY3RlZCgpIHtcbiAgICAvLyBJZiB3ZSB3ZXJlIG1hbnVhbGx5IGRpc2Nvbm5lY3RlZCwgd2UgY2FuIHNhZmVseSBwdXQgb3VyIGVsZW1lbnQgYmFjayBpblxuICAgIC8vIHRoZSBib3gsIHNpbmNlIG5vIHJlbmRlcmluZyBjb3VsZCBoYXZlIG9jY3VycmVkIHRvIGNoYW5nZSBpdHMgc3RhdGVcbiAgICB0aGlzLl91cGRhdGVSZWZWYWx1ZSh0aGlzLl9lbGVtZW50KTtcbiAgfVxufVxuXG4vKipcbiAqIFNldHMgdGhlIHZhbHVlIG9mIGEgUmVmIG9iamVjdCBvciBjYWxscyBhIHJlZiBjYWxsYmFjayB3aXRoIHRoZSBlbGVtZW50IGl0J3NcbiAqIGJvdW5kIHRvLlxuICpcbiAqIEEgUmVmIG9iamVjdCBhY3RzIGFzIGEgY29udGFpbmVyIGZvciBhIHJlZmVyZW5jZSB0byBhbiBlbGVtZW50LiBBIHJlZlxuICogY2FsbGJhY2sgaXMgYSBmdW5jdGlvbiB0aGF0IHRha2VzIGFuIGVsZW1lbnQgYXMgaXRzIG9ubHkgYXJndW1lbnQuXG4gKlxuICogVGhlIHJlZiBkaXJlY3RpdmUgc2V0cyB0aGUgdmFsdWUgb2YgdGhlIFJlZiBvYmplY3Qgb3IgY2FsbHMgdGhlIHJlZiBjYWxsYmFja1xuICogZHVyaW5nIHJlbmRlcmluZywgaWYgdGhlIHJlZmVyZW5jZWQgZWxlbWVudCBjaGFuZ2VkLlxuICpcbiAqIE5vdGU6IElmIGEgcmVmIGNhbGxiYWNrIGlzIHJlbmRlcmVkIHRvIGEgZGlmZmVyZW50IGVsZW1lbnQgcG9zaXRpb24gb3IgaXNcbiAqIHJlbW92ZWQgaW4gYSBzdWJzZXF1ZW50IHJlbmRlciwgaXQgd2lsbCBmaXJzdCBiZSBjYWxsZWQgd2l0aCBgdW5kZWZpbmVkYCxcbiAqIGZvbGxvd2VkIGJ5IGFub3RoZXIgY2FsbCB3aXRoIHRoZSBuZXcgZWxlbWVudCBpdCB3YXMgcmVuZGVyZWQgdG8gKGlmIGFueSkuXG4gKlxuICogYGBganNcbiAqIC8vIFVzaW5nIFJlZiBvYmplY3RcbiAqIGNvbnN0IGlucHV0UmVmID0gY3JlYXRlUmVmKCk7XG4gKiByZW5kZXIoaHRtbGA8aW5wdXQgJHtyZWYoaW5wdXRSZWYpfT5gLCBjb250YWluZXIpO1xuICogaW5wdXRSZWYudmFsdWUuZm9jdXMoKTtcbiAqXG4gKiAvLyBVc2luZyBjYWxsYmFja1xuICogY29uc3QgY2FsbGJhY2sgPSAoaW5wdXRFbGVtZW50KSA9PiBpbnB1dEVsZW1lbnQuZm9jdXMoKTtcbiAqIHJlbmRlcihodG1sYDxpbnB1dCAke3JlZihjYWxsYmFjayl9PmAsIGNvbnRhaW5lcik7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHJlZiA9IGRpcmVjdGl2ZShSZWZEaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge1JlZkRpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLy8gTm90ZSwgdGhpcyBtb2R1bGUgaXMgbm90IGluY2x1ZGVkIGluIHBhY2thZ2UgZXhwb3J0cyBzbyB0aGF0IGl0J3MgcHJpdmF0ZSB0b1xuLy8gb3VyIGZpcnN0LXBhcnR5IGRpcmVjdGl2ZXMuIElmIGl0IGVuZHMgdXAgYmVpbmcgdXNlZnVsLCB3ZSBjYW4gb3BlbiBpdCB1cCBhbmRcbi8vIGV4cG9ydCBpdC5cblxuLyoqXG4gKiBIZWxwZXIgdG8gaXRlcmF0ZSBhbiBBc3luY0l0ZXJhYmxlIGluIGl0cyBvd24gY2xvc3VyZS5cbiAqIEBwYXJhbSBpdGVyYWJsZSBUaGUgaXRlcmFibGUgdG8gaXRlcmF0ZVxuICogQHBhcmFtIGNhbGxiYWNrIFRoZSBjYWxsYmFjayB0byBjYWxsIGZvciBlYWNoIHZhbHVlLiBJZiB0aGUgY2FsbGJhY2sgcmV0dXJuc1xuICogYGZhbHNlYCwgdGhlIGxvb3Agd2lsbCBiZSBicm9rZW4uXG4gKi9cbmV4cG9ydCBjb25zdCBmb3JBd2FpdE9mID0gYXN5bmMgPFQ+KFxuICBpdGVyYWJsZTogQXN5bmNJdGVyYWJsZTxUPixcbiAgY2FsbGJhY2s6ICh2YWx1ZTogVCkgPT4gUHJvbWlzZTxib29sZWFuPlxuKSA9PiB7XG4gIGZvciBhd2FpdCAoY29uc3QgdiBvZiBpdGVyYWJsZSkge1xuICAgIGlmICgoYXdhaXQgY2FsbGJhY2sodikpID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBIb2xkcyBhIHJlZmVyZW5jZSB0byBhbiBpbnN0YW5jZSB0aGF0IGNhbiBiZSBkaXNjb25uZWN0ZWQgYW5kIHJlY29ubmVjdGVkLFxuICogc28gdGhhdCBhIGNsb3N1cmUgb3ZlciB0aGUgcmVmIChlLmcuIGluIGEgdGhlbiBmdW5jdGlvbiB0byBhIHByb21pc2UpIGRvZXNcbiAqIG5vdCBzdHJvbmdseSBob2xkIGEgcmVmIHRvIHRoZSBpbnN0YW5jZS4gQXBwcm94aW1hdGVzIGEgV2Vha1JlZiBidXQgbXVzdFxuICogYmUgbWFudWFsbHkgY29ubmVjdGVkICYgZGlzY29ubmVjdGVkIHRvIHRoZSBiYWNraW5nIGluc3RhbmNlLlxuICovXG5leHBvcnQgY2xhc3MgUHNldWRvV2Vha1JlZjxUPiB7XG4gIHByaXZhdGUgX3JlZj86IFQ7XG4gIGNvbnN0cnVjdG9yKHJlZjogVCkge1xuICAgIHRoaXMuX3JlZiA9IHJlZjtcbiAgfVxuICAvKipcbiAgICogRGlzYXNzb2NpYXRlcyB0aGUgcmVmIHdpdGggdGhlIGJhY2tpbmcgaW5zdGFuY2UuXG4gICAqL1xuICBkaXNjb25uZWN0KCkge1xuICAgIHRoaXMuX3JlZiA9IHVuZGVmaW5lZDtcbiAgfVxuICAvKipcbiAgICogUmVhc3NvY2lhdGVzIHRoZSByZWYgd2l0aCB0aGUgYmFja2luZyBpbnN0YW5jZS5cbiAgICovXG4gIHJlY29ubmVjdChyZWY6IFQpIHtcbiAgICB0aGlzLl9yZWYgPSByZWY7XG4gIH1cbiAgLyoqXG4gICAqIFJldHJpZXZlcyB0aGUgYmFja2luZyBpbnN0YW5jZSAod2lsbCBiZSB1bmRlZmluZWQgd2hlbiBkaXNjb25uZWN0ZWQpXG4gICAqL1xuICBkZXJlZigpIHtcbiAgICByZXR1cm4gdGhpcy5fcmVmO1xuICB9XG59XG5cbi8qKlxuICogQSBoZWxwZXIgdG8gcGF1c2UgYW5kIHJlc3VtZSB3YWl0aW5nIG9uIGEgY29uZGl0aW9uIGluIGFuIGFzeW5jIGZ1bmN0aW9uXG4gKi9cbmV4cG9ydCBjbGFzcyBQYXVzZXIge1xuICBwcml2YXRlIF9wcm9taXNlPzogUHJvbWlzZTx2b2lkPiA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfcmVzb2x2ZT86ICgpID0+IHZvaWQgPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBXaGVuIHBhdXNlZCwgcmV0dXJucyBhIHByb21pc2UgdG8gYmUgYXdhaXRlZDsgd2hlbiB1bnBhdXNlZCwgcmV0dXJuc1xuICAgKiB1bmRlZmluZWQuIE5vdGUgdGhhdCBpbiB0aGUgbWljcm90YXNrIGJldHdlZW4gdGhlIHBhdXNlciBiZWluZyByZXN1bWVkXG4gICAqIGFuIGF3YWl0IG9mIHRoaXMgcHJvbWlzZSByZXNvbHZpbmcsIHRoZSBwYXVzZXIgY291bGQgYmUgcGF1c2VkIGFnYWluLFxuICAgKiBoZW5jZSBjYWxsZXJzIHNob3VsZCBjaGVjayB0aGUgcHJvbWlzZSBpbiBhIGxvb3Agd2hlbiBhd2FpdGluZy5cbiAgICogQHJldHVybnMgQSBwcm9taXNlIHRvIGJlIGF3YWl0ZWQgd2hlbiBwYXVzZWQgb3IgdW5kZWZpbmVkXG4gICAqL1xuICBnZXQoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Byb21pc2U7XG4gIH1cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBwcm9taXNlIHRvIGJlIGF3YWl0ZWRcbiAgICovXG4gIHBhdXNlKCkge1xuICAgIHRoaXMuX3Byb21pc2UgPz89IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiAodGhpcy5fcmVzb2x2ZSA9IHJlc29sdmUpKTtcbiAgfVxuICAvKipcbiAgICogUmVzb2x2ZXMgdGhlIHByb21pc2Ugd2hpY2ggbWF5IGJlIGF3YWl0ZWRcbiAgICovXG4gIHJlc3VtZSgpIHtcbiAgICB0aGlzLl9yZXNvbHZlPy4oKTtcbiAgICB0aGlzLl9wcm9taXNlID0gdGhpcy5fcmVzb2x2ZSA9IHVuZGVmaW5lZDtcbiAgfVxufVxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7Q2hpbGRQYXJ0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgQXN5bmNEaXJlY3RpdmUsXG4gIGRpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbn0gZnJvbSAnLi4vYXN5bmMtZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7UGF1c2VyLCBQc2V1ZG9XZWFrUmVmLCBmb3JBd2FpdE9mfSBmcm9tICcuL3ByaXZhdGUtYXN5bmMtaGVscGVycy5qcyc7XG5cbnR5cGUgTWFwcGVyPFQ+ID0gKHY6IFQsIGluZGV4PzogbnVtYmVyKSA9PiB1bmtub3duO1xuXG5leHBvcnQgY2xhc3MgQXN5bmNSZXBsYWNlRGlyZWN0aXZlIGV4dGVuZHMgQXN5bmNEaXJlY3RpdmUge1xuICBwcml2YXRlIF9fdmFsdWU/OiBBc3luY0l0ZXJhYmxlPHVua25vd24+O1xuICBwcml2YXRlIF9fd2Vha1RoaXMgPSBuZXcgUHNldWRvV2Vha1JlZih0aGlzKTtcbiAgcHJpdmF0ZSBfX3BhdXNlciA9IG5ldyBQYXVzZXIoKTtcblxuICAvLyBAdHMtZXhwZWN0LWVycm9yIHZhbHVlIG5vdCB1c2VkLCBidXQgd2Ugd2FudCBhIG5pY2UgcGFyYW1ldGVyIGZvciBkb2NzXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgcmVuZGVyPFQ+KHZhbHVlOiBBc3luY0l0ZXJhYmxlPFQ+LCBfbWFwcGVyPzogTWFwcGVyPFQ+KSB7XG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKFxuICAgIF9wYXJ0OiBDaGlsZFBhcnQsXG4gICAgW3ZhbHVlLCBtYXBwZXJdOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+XG4gICkge1xuICAgIC8vIElmIG91ciBpbml0aWFsIHJlbmRlciBvY2N1cnMgd2hpbGUgZGlzY29ubmVjdGVkLCBlbnN1cmUgdGhhdCB0aGUgcGF1c2VyXG4gICAgLy8gYW5kIHdlYWtUaGlzIGFyZSBpbiB0aGUgZGlzY29ubmVjdGVkIHN0YXRlXG4gICAgaWYgKCF0aGlzLmlzQ29ubmVjdGVkKSB7XG4gICAgICB0aGlzLmRpc2Nvbm5lY3RlZCgpO1xuICAgIH1cbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IHNldCB1cCB0aGlzIHBhcnRpY3VsYXIgaXRlcmFibGUsIHdlIGRvbid0IG5lZWRcbiAgICAvLyB0byBkbyBhbnl0aGluZy5cbiAgICBpZiAodmFsdWUgPT09IHRoaXMuX192YWx1ZSkge1xuICAgICAgcmV0dXJuIG5vQ2hhbmdlO1xuICAgIH1cbiAgICB0aGlzLl9fdmFsdWUgPSB2YWx1ZTtcbiAgICBsZXQgaSA9IDA7XG4gICAgY29uc3Qge19fd2Vha1RoaXM6IHdlYWtUaGlzLCBfX3BhdXNlcjogcGF1c2VyfSA9IHRoaXM7XG4gICAgLy8gTm90ZSwgdGhlIGNhbGxiYWNrIGF2b2lkcyBjbG9zaW5nIG92ZXIgYHRoaXNgIHNvIHRoYXQgdGhlIGRpcmVjdGl2ZVxuICAgIC8vIGNhbiBiZSBnYydlZCBiZWZvcmUgdGhlIHByb21pc2UgcmVzb2x2ZXM7IGluc3RlYWQgYHRoaXNgIGlzIHJldHJpZXZlZFxuICAgIC8vIGZyb20gYHdlYWtUaGlzYCwgd2hpY2ggY2FuIGJyZWFrIHRoZSBoYXJkIHJlZmVyZW5jZSBpbiB0aGUgY2xvc3VyZSB3aGVuXG4gICAgLy8gdGhlIGRpcmVjdGl2ZSBkaXNjb25uZWN0c1xuICAgIGZvckF3YWl0T2YodmFsdWUsIGFzeW5jICh2OiB1bmtub3duKSA9PiB7XG4gICAgICAvLyBUaGUgd2hpbGUgbG9vcCBoZXJlIGhhbmRsZXMgdGhlIGNhc2UgdGhhdCB0aGUgY29ubmVjdGlvbiBzdGF0ZVxuICAgICAgLy8gdGhyYXNoZXMsIGNhdXNpbmcgdGhlIHBhdXNlciB0byByZXN1bWUgYW5kIHRoZW4gZ2V0IHJlLXBhdXNlZFxuICAgICAgd2hpbGUgKHBhdXNlci5nZXQoKSkge1xuICAgICAgICBhd2FpdCBwYXVzZXIuZ2V0KCk7XG4gICAgICB9XG4gICAgICAvLyBJZiB0aGUgY2FsbGJhY2sgZ2V0cyBoZXJlIGFuZCB0aGVyZSBpcyBubyBgdGhpc2AsIGl0IG1lYW5zIHRoYXQgdGhlXG4gICAgICAvLyBkaXJlY3RpdmUgaGFzIGJlZW4gZGlzY29ubmVjdGVkIGFuZCBnYXJiYWdlIGNvbGxlY3RlZCBhbmQgd2UgZG9uJ3RcbiAgICAgIC8vIG5lZWQgdG8gZG8gYW55dGhpbmcgZWxzZVxuICAgICAgY29uc3QgX3RoaXMgPSB3ZWFrVGhpcy5kZXJlZigpO1xuICAgICAgaWYgKF90aGlzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gQ2hlY2sgdG8gbWFrZSBzdXJlIHRoYXQgdmFsdWUgaXMgdGhlIHN0aWxsIHRoZSBjdXJyZW50IHZhbHVlIG9mXG4gICAgICAgIC8vIHRoZSBwYXJ0LCBhbmQgaWYgbm90IGJhaWwgYmVjYXVzZSBhIG5ldyB2YWx1ZSBvd25zIHRoaXMgcGFydFxuICAgICAgICBpZiAoX3RoaXMuX192YWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBcyBhIGNvbnZlbmllbmNlLCBiZWNhdXNlIGZ1bmN0aW9uYWwtcHJvZ3JhbW1pbmctc3R5bGVcbiAgICAgICAgLy8gdHJhbnNmb3JtcyBvZiBpdGVyYWJsZXMgYW5kIGFzeW5jIGl0ZXJhYmxlcyByZXF1aXJlcyBhIGxpYnJhcnksXG4gICAgICAgIC8vIHdlIGFjY2VwdCBhIG1hcHBlciBmdW5jdGlvbi4gVGhpcyBpcyBlc3BlY2lhbGx5IGNvbnZlbmllbnQgZm9yXG4gICAgICAgIC8vIHJlbmRlcmluZyBhIHRlbXBsYXRlIGZvciBlYWNoIGl0ZW0uXG4gICAgICAgIGlmIChtYXBwZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHYgPSBtYXBwZXIodiwgaSk7XG4gICAgICAgIH1cblxuICAgICAgICBfdGhpcy5jb21taXRWYWx1ZSh2LCBpKTtcbiAgICAgICAgaSsrO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG5cbiAgLy8gT3ZlcnJpZGUgcG9pbnQgZm9yIEFzeW5jQXBwZW5kIHRvIGFwcGVuZCByYXRoZXIgdGhhbiByZXBsYWNlXG4gIHByb3RlY3RlZCBjb21taXRWYWx1ZSh2YWx1ZTogdW5rbm93biwgX2luZGV4OiBudW1iZXIpIHtcbiAgICB0aGlzLnNldFZhbHVlKHZhbHVlKTtcbiAgfVxuXG4gIG92ZXJyaWRlIGRpc2Nvbm5lY3RlZCgpIHtcbiAgICB0aGlzLl9fd2Vha1RoaXMuZGlzY29ubmVjdCgpO1xuICAgIHRoaXMuX19wYXVzZXIucGF1c2UoKTtcbiAgfVxuXG4gIG92ZXJyaWRlIHJlY29ubmVjdGVkKCkge1xuICAgIHRoaXMuX193ZWFrVGhpcy5yZWNvbm5lY3QodGhpcyk7XG4gICAgdGhpcy5fX3BhdXNlci5yZXN1bWUoKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgZGlyZWN0aXZlIHRoYXQgcmVuZGVycyB0aGUgaXRlbXMgb2YgYW4gYXN5bmMgaXRlcmFibGVbMV0sIHJlcGxhY2luZ1xuICogcHJldmlvdXMgdmFsdWVzIHdpdGggbmV3IHZhbHVlcywgc28gdGhhdCBvbmx5IG9uZSB2YWx1ZSBpcyBldmVyIHJlbmRlcmVkXG4gKiBhdCBhIHRpbWUuIFRoaXMgZGlyZWN0aXZlIG1heSBiZSB1c2VkIGluIGFueSBleHByZXNzaW9uIHR5cGUuXG4gKlxuICogQXN5bmMgaXRlcmFibGVzIGFyZSBvYmplY3RzIHdpdGggYSBgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXWAgbWV0aG9kLCB3aGljaFxuICogcmV0dXJucyBhbiBpdGVyYXRvciB3aG8ncyBgbmV4dCgpYCBtZXRob2QgcmV0dXJucyBhIFByb21pc2UuIFdoZW4gYSBuZXdcbiAqIHZhbHVlIGlzIGF2YWlsYWJsZSwgdGhlIFByb21pc2UgcmVzb2x2ZXMgYW5kIHRoZSB2YWx1ZSBpcyByZW5kZXJlZCB0byB0aGVcbiAqIFBhcnQgY29udHJvbGxlZCBieSB0aGUgZGlyZWN0aXZlLiBJZiBhbm90aGVyIHZhbHVlIG90aGVyIHRoYW4gdGhpc1xuICogZGlyZWN0aXZlIGhhcyBiZWVuIHNldCBvbiB0aGUgUGFydCwgdGhlIGl0ZXJhYmxlIHdpbGwgbm8gbG9uZ2VyIGJlIGxpc3RlbmVkXG4gKiB0byBhbmQgbmV3IHZhbHVlcyB3b24ndCBiZSB3cml0dGVuIHRvIHRoZSBQYXJ0LlxuICpcbiAqIFsxXTogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvU3RhdGVtZW50cy9mb3ItYXdhaXQuLi5vZlxuICpcbiAqIEBwYXJhbSB2YWx1ZSBBbiBhc3luYyBpdGVyYWJsZVxuICogQHBhcmFtIG1hcHBlciBBbiBvcHRpb25hbCBmdW5jdGlvbiB0aGF0IG1hcHMgZnJvbSAodmFsdWUsIGluZGV4KSB0byBhbm90aGVyXG4gKiAgICAgdmFsdWUuIFVzZWZ1bCBmb3IgZ2VuZXJhdGluZyB0ZW1wbGF0ZXMgZm9yIGVhY2ggaXRlbSBpbiB0aGUgaXRlcmFibGUuXG4gKi9cbmV4cG9ydCBjb25zdCBhc3luY1JlcGxhY2UgPSBkaXJlY3RpdmUoQXN5bmNSZXBsYWNlRGlyZWN0aXZlKTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0NoaWxkUGFydH0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmVQYXJhbWV0ZXJzLFxuICBQYXJ0SW5mbyxcbiAgUGFydFR5cGUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge0FzeW5jUmVwbGFjZURpcmVjdGl2ZX0gZnJvbSAnLi9hc3luYy1yZXBsYWNlLmpzJztcbmltcG9ydCB7XG4gIGNsZWFyUGFydCxcbiAgaW5zZXJ0UGFydCxcbiAgc2V0Q2hpbGRQYXJ0VmFsdWUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcblxuY2xhc3MgQXN5bmNBcHBlbmREaXJlY3RpdmUgZXh0ZW5kcyBBc3luY1JlcGxhY2VEaXJlY3RpdmUge1xuICBwcml2YXRlIF9fY2hpbGRQYXJ0ITogQ2hpbGRQYXJ0O1xuXG4gIC8vIE92ZXJyaWRlIEFzeW5jUmVwbGFjZSB0byBuYXJyb3cgdGhlIGFsbG93ZWQgcGFydCB0eXBlIHRvIENoaWxkUGFydCBvbmx5XG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAocGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQ0hJTEQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignYXN5bmNBcHBlbmQgY2FuIG9ubHkgYmUgdXNlZCBpbiBjaGlsZCBleHByZXNzaW9ucycpO1xuICAgIH1cbiAgfVxuXG4gIC8vIE92ZXJyaWRlIEFzeW5jUmVwbGFjZSB0byBzYXZlIHRoZSBwYXJ0IHNpbmNlIHdlIG5lZWQgdG8gYXBwZW5kIGludG8gaXRcbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IENoaWxkUGFydCwgcGFyYW1zOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgdGhpcy5fX2NoaWxkUGFydCA9IHBhcnQ7XG4gICAgcmV0dXJuIHN1cGVyLnVwZGF0ZShwYXJ0LCBwYXJhbXMpO1xuICB9XG5cbiAgLy8gT3ZlcnJpZGUgQXN5bmNSZXBsYWNlIHRvIGFwcGVuZCByYXRoZXIgdGhhbiByZXBsYWNlXG4gIHByb3RlY3RlZCBvdmVycmlkZSBjb21taXRWYWx1ZSh2YWx1ZTogdW5rbm93biwgaW5kZXg6IG51bWJlcikge1xuICAgIC8vIFdoZW4gd2UgZ2V0IHRoZSBmaXJzdCB2YWx1ZSwgY2xlYXIgdGhlIHBhcnQuIFRoaXMgbGV0cyB0aGVcbiAgICAvLyBwcmV2aW91cyB2YWx1ZSBkaXNwbGF5IHVudGlsIHdlIGNhbiByZXBsYWNlIGl0LlxuICAgIGlmIChpbmRleCA9PT0gMCkge1xuICAgICAgY2xlYXJQYXJ0KHRoaXMuX19jaGlsZFBhcnQpO1xuICAgIH1cbiAgICAvLyBDcmVhdGUgYW5kIGluc2VydCBhIG5ldyBwYXJ0IGFuZCBzZXQgaXRzIHZhbHVlIHRvIHRoZSBuZXh0IHZhbHVlXG4gICAgY29uc3QgbmV3UGFydCA9IGluc2VydFBhcnQodGhpcy5fX2NoaWxkUGFydCk7XG4gICAgc2V0Q2hpbGRQYXJ0VmFsdWUobmV3UGFydCwgdmFsdWUpO1xuICB9XG59XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCByZW5kZXJzIHRoZSBpdGVtcyBvZiBhbiBhc3luYyBpdGVyYWJsZVsxXSwgYXBwZW5kaW5nIG5ld1xuICogdmFsdWVzIGFmdGVyIHByZXZpb3VzIHZhbHVlcywgc2ltaWxhciB0byB0aGUgYnVpbHQtaW4gc3VwcG9ydCBmb3IgaXRlcmFibGVzLlxuICogVGhpcyBkaXJlY3RpdmUgaXMgdXNhYmxlIG9ubHkgaW4gY2hpbGQgZXhwcmVzc2lvbnMuXG4gKlxuICogQXN5bmMgaXRlcmFibGVzIGFyZSBvYmplY3RzIHdpdGggYSBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdIG1ldGhvZCwgd2hpY2hcbiAqIHJldHVybnMgYW4gaXRlcmF0b3Igd2hvJ3MgYG5leHQoKWAgbWV0aG9kIHJldHVybnMgYSBQcm9taXNlLiBXaGVuIGEgbmV3XG4gKiB2YWx1ZSBpcyBhdmFpbGFibGUsIHRoZSBQcm9taXNlIHJlc29sdmVzIGFuZCB0aGUgdmFsdWUgaXMgYXBwZW5kZWQgdG8gdGhlXG4gKiBQYXJ0IGNvbnRyb2xsZWQgYnkgdGhlIGRpcmVjdGl2ZS4gSWYgYW5vdGhlciB2YWx1ZSBvdGhlciB0aGFuIHRoaXNcbiAqIGRpcmVjdGl2ZSBoYXMgYmVlbiBzZXQgb24gdGhlIFBhcnQsIHRoZSBpdGVyYWJsZSB3aWxsIG5vIGxvbmdlciBiZSBsaXN0ZW5lZFxuICogdG8gYW5kIG5ldyB2YWx1ZXMgd29uJ3QgYmUgd3JpdHRlbiB0byB0aGUgUGFydC5cbiAqXG4gKiBbMV06IGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL1N0YXRlbWVudHMvZm9yLWF3YWl0Li4ub2ZcbiAqXG4gKiBAcGFyYW0gdmFsdWUgQW4gYXN5bmMgaXRlcmFibGVcbiAqIEBwYXJhbSBtYXBwZXIgQW4gb3B0aW9uYWwgZnVuY3Rpb24gdGhhdCBtYXBzIGZyb20gKHZhbHVlLCBpbmRleCkgdG8gYW5vdGhlclxuICogICAgIHZhbHVlLiBVc2VmdWwgZm9yIGdlbmVyYXRpbmcgdGVtcGxhdGVzIGZvciBlYWNoIGl0ZW0gaW4gdGhlIGl0ZXJhYmxlLlxuICovXG5leHBvcnQgY29uc3QgYXN5bmNBcHBlbmQgPSBkaXJlY3RpdmUoQXN5bmNBcHBlbmREaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge0FzeW5jQXBwZW5kRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge1xuICBUZW1wbGF0ZVJlc3VsdCxcbiAgQ2hpbGRQYXJ0LFxuICBSb290UGFydCxcbiAgcmVuZGVyLFxuICBub3RoaW5nLFxuICBDb21waWxlZFRlbXBsYXRlUmVzdWx0LFxufSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBkaXJlY3RpdmUsXG4gIERpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbiAgUGFydEluZm8sXG59IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge1xuICBjbGVhclBhcnQsXG4gIGdldENvbW1pdHRlZFZhbHVlLFxuICBpbnNlcnRQYXJ0LFxuICBpc0NvbXBpbGVkVGVtcGxhdGVSZXN1bHQsXG4gIGlzVGVtcGxhdGVSZXN1bHQsXG4gIHNldENvbW1pdHRlZFZhbHVlLFxufSBmcm9tICcuLi9kaXJlY3RpdmUtaGVscGVycy5qcyc7XG5cbi8qKlxuICogVGhlIHRlbXBsYXRlIHN0cmluZ3MgYXJyYXkgY29udGVudHMgYXJlIG5vdCBjb21wYXRpYmxlIGJldHdlZW4gdGhlIHR3b1xuICogdGVtcGxhdGUgcmVzdWx0IHR5cGVzIGFzIHRoZSBjb21waWxlZCB0ZW1wbGF0ZSBjb250YWlucyBhIHByZXBhcmVkIHN0cmluZztcbiAqIG9ubHkgdXNlIHRoZSByZXR1cm5lZCB0ZW1wbGF0ZSBzdHJpbmdzIGFycmF5IGFzIGEgY2FjaGUga2V5LlxuICovXG5jb25zdCBnZXRTdHJpbmdzRnJvbVRlbXBsYXRlUmVzdWx0ID0gKFxuICByZXN1bHQ6IFRlbXBsYXRlUmVzdWx0IHwgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdFxuKTogVGVtcGxhdGVTdHJpbmdzQXJyYXkgPT5cbiAgaXNDb21waWxlZFRlbXBsYXRlUmVzdWx0KHJlc3VsdCkgPyByZXN1bHRbJ18kbGl0VHlwZSQnXS5oIDogcmVzdWx0LnN0cmluZ3M7XG5cbmNsYXNzIENhY2hlRGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgcHJpdmF0ZSBfdGVtcGxhdGVDYWNoZSA9IG5ldyBXZWFrTWFwPFRlbXBsYXRlU3RyaW5nc0FycmF5LCBSb290UGFydD4oKTtcbiAgcHJpdmF0ZSBfdmFsdWU/OiBUZW1wbGF0ZVJlc3VsdCB8IENvbXBpbGVkVGVtcGxhdGVSZXN1bHQ7XG5cbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICB9XG5cbiAgcmVuZGVyKHY6IHVua25vd24pIHtcbiAgICAvLyBSZXR1cm4gYW4gYXJyYXkgb2YgdGhlIHZhbHVlIHRvIGluZHVjZSBsaXQtaHRtbCB0byBjcmVhdGUgYSBDaGlsZFBhcnRcbiAgICAvLyBmb3IgdGhlIHZhbHVlIHRoYXQgd2UgY2FuIG1vdmUgaW50byB0aGUgY2FjaGUuXG4gICAgcmV0dXJuIFt2XTtcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShjb250YWluZXJQYXJ0OiBDaGlsZFBhcnQsIFt2XTogRGlyZWN0aXZlUGFyYW1ldGVyczx0aGlzPikge1xuICAgIGNvbnN0IF92YWx1ZUtleSA9IGlzVGVtcGxhdGVSZXN1bHQodGhpcy5fdmFsdWUpXG4gICAgICA/IGdldFN0cmluZ3NGcm9tVGVtcGxhdGVSZXN1bHQodGhpcy5fdmFsdWUpXG4gICAgICA6IG51bGw7XG4gICAgY29uc3QgdktleSA9IGlzVGVtcGxhdGVSZXN1bHQodikgPyBnZXRTdHJpbmdzRnJvbVRlbXBsYXRlUmVzdWx0KHYpIDogbnVsbDtcblxuICAgIC8vIElmIHRoZSBwcmV2aW91cyB2YWx1ZSBpcyBhIFRlbXBsYXRlUmVzdWx0IGFuZCB0aGUgbmV3IHZhbHVlIGlzIG5vdCxcbiAgICAvLyBvciBpcyBhIGRpZmZlcmVudCBUZW1wbGF0ZSBhcyB0aGUgcHJldmlvdXMgdmFsdWUsIG1vdmUgdGhlIGNoaWxkIHBhcnRcbiAgICAvLyBpbnRvIHRoZSBjYWNoZS5cbiAgICBpZiAoX3ZhbHVlS2V5ICE9PSBudWxsICYmICh2S2V5ID09PSBudWxsIHx8IF92YWx1ZUtleSAhPT0gdktleSkpIHtcbiAgICAgIC8vIFRoaXMgaXMgYWx3YXlzIGFuIGFycmF5IGJlY2F1c2Ugd2UgcmV0dXJuIFt2XSBpbiByZW5kZXIoKVxuICAgICAgY29uc3QgcGFydFZhbHVlID0gZ2V0Q29tbWl0dGVkVmFsdWUoY29udGFpbmVyUGFydCkgYXMgQXJyYXk8Q2hpbGRQYXJ0PjtcbiAgICAgIGNvbnN0IGNoaWxkUGFydCA9IHBhcnRWYWx1ZS5wb3AoKSE7XG4gICAgICBsZXQgY2FjaGVkQ29udGFpbmVyUGFydCA9IHRoaXMuX3RlbXBsYXRlQ2FjaGUuZ2V0KF92YWx1ZUtleSk7XG4gICAgICBpZiAoY2FjaGVkQ29udGFpbmVyUGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnN0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICBjYWNoZWRDb250YWluZXJQYXJ0ID0gcmVuZGVyKG5vdGhpbmcsIGZyYWdtZW50KTtcbiAgICAgICAgY2FjaGVkQ29udGFpbmVyUGFydC5zZXRDb25uZWN0ZWQoZmFsc2UpO1xuICAgICAgICB0aGlzLl90ZW1wbGF0ZUNhY2hlLnNldChfdmFsdWVLZXksIGNhY2hlZENvbnRhaW5lclBhcnQpO1xuICAgICAgfVxuICAgICAgLy8gTW92ZSBpbnRvIGNhY2hlXG4gICAgICBzZXRDb21taXR0ZWRWYWx1ZShjYWNoZWRDb250YWluZXJQYXJ0LCBbY2hpbGRQYXJ0XSk7XG4gICAgICBpbnNlcnRQYXJ0KGNhY2hlZENvbnRhaW5lclBhcnQsIHVuZGVmaW5lZCwgY2hpbGRQYXJ0KTtcbiAgICB9XG4gICAgLy8gSWYgdGhlIG5ldyB2YWx1ZSBpcyBhIFRlbXBsYXRlUmVzdWx0IGFuZCB0aGUgcHJldmlvdXMgdmFsdWUgaXMgbm90LFxuICAgIC8vIG9yIGlzIGEgZGlmZmVyZW50IFRlbXBsYXRlIGFzIHRoZSBwcmV2aW91cyB2YWx1ZSwgcmVzdG9yZSB0aGUgY2hpbGRcbiAgICAvLyBwYXJ0IGZyb20gdGhlIGNhY2hlLlxuICAgIGlmICh2S2V5ICE9PSBudWxsKSB7XG4gICAgICBpZiAoX3ZhbHVlS2V5ID09PSBudWxsIHx8IF92YWx1ZUtleSAhPT0gdktleSkge1xuICAgICAgICBjb25zdCBjYWNoZWRDb250YWluZXJQYXJ0ID0gdGhpcy5fdGVtcGxhdGVDYWNoZS5nZXQodktleSk7XG4gICAgICAgIGlmIChjYWNoZWRDb250YWluZXJQYXJ0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBNb3ZlIHRoZSBjYWNoZWQgcGFydCBiYWNrIGludG8gdGhlIGNvbnRhaW5lciBwYXJ0IHZhbHVlXG4gICAgICAgICAgY29uc3QgcGFydFZhbHVlID0gZ2V0Q29tbWl0dGVkVmFsdWUoXG4gICAgICAgICAgICBjYWNoZWRDb250YWluZXJQYXJ0XG4gICAgICAgICAgKSBhcyBBcnJheTxDaGlsZFBhcnQ+O1xuICAgICAgICAgIGNvbnN0IGNhY2hlZFBhcnQgPSBwYXJ0VmFsdWUucG9wKCkhO1xuICAgICAgICAgIC8vIE1vdmUgY2FjaGVkIHBhcnQgYmFjayBpbnRvIERPTVxuICAgICAgICAgIGNsZWFyUGFydChjb250YWluZXJQYXJ0KTtcbiAgICAgICAgICBpbnNlcnRQYXJ0KGNvbnRhaW5lclBhcnQsIHVuZGVmaW5lZCwgY2FjaGVkUGFydCk7XG4gICAgICAgICAgc2V0Q29tbWl0dGVkVmFsdWUoY29udGFpbmVyUGFydCwgW2NhY2hlZFBhcnRdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gQmVjYXVzZSB2S2V5IGlzIG5vbiBudWxsLCB2IG11c3QgYmUgYSBUZW1wbGF0ZVJlc3VsdC5cbiAgICAgIHRoaXMuX3ZhbHVlID0gdiBhcyBUZW1wbGF0ZVJlc3VsdCB8IENvbXBpbGVkVGVtcGxhdGVSZXN1bHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3ZhbHVlID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZW5kZXIodik7XG4gIH1cbn1cblxuLyoqXG4gKiBFbmFibGVzIGZhc3Qgc3dpdGNoaW5nIGJldHdlZW4gbXVsdGlwbGUgdGVtcGxhdGVzIGJ5IGNhY2hpbmcgdGhlIERPTSBub2Rlc1xuICogYW5kIFRlbXBsYXRlSW5zdGFuY2VzIHByb2R1Y2VkIGJ5IHRoZSB0ZW1wbGF0ZXMuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogbGV0IGNoZWNrZWQgPSBmYWxzZTtcbiAqXG4gKiBodG1sYFxuICogICAke2NhY2hlKGNoZWNrZWQgPyBodG1sYGlucHV0IGlzIGNoZWNrZWRgIDogaHRtbGBpbnB1dCBpcyBub3QgY2hlY2tlZGApfVxuICogYFxuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBjYWNoZSA9IGRpcmVjdGl2ZShDYWNoZURpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7Q2FjaGVEaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjEgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbi8qKlxuICogQ2hvb3NlcyBhbmQgZXZhbHVhdGVzIGEgdGVtcGxhdGUgZnVuY3Rpb24gZnJvbSBhIGxpc3QgYmFzZWQgb24gbWF0Y2hpbmdcbiAqIHRoZSBnaXZlbiBgdmFsdWVgIHRvIGEgY2FzZS5cbiAqXG4gKiBDYXNlcyBhcmUgc3RydWN0dXJlZCBhcyBgW2Nhc2VWYWx1ZSwgZnVuY11gLiBgdmFsdWVgIGlzIG1hdGNoZWQgdG9cbiAqIGBjYXNlVmFsdWVgIGJ5IHN0cmljdCBlcXVhbGl0eS4gVGhlIGZpcnN0IG1hdGNoIGlzIHNlbGVjdGVkLiBDYXNlIHZhbHVlc1xuICogY2FuIGJlIG9mIGFueSB0eXBlIGluY2x1ZGluZyBwcmltaXRpdmVzLCBvYmplY3RzLCBhbmQgc3ltYm9scy5cbiAqXG4gKiBUaGlzIGlzIHNpbWlsYXIgdG8gYSBzd2l0Y2ggc3RhdGVtZW50LCBidXQgYXMgYW4gZXhwcmVzc2lvbiBhbmQgd2l0aG91dFxuICogZmFsbHRocm91Z2guXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogcmVuZGVyKCkge1xuICogICByZXR1cm4gaHRtbGBcbiAqICAgICAke2Nob29zZSh0aGlzLnNlY3Rpb24sIFtcbiAqICAgICAgIFsnaG9tZScsICgpID0+IGh0bWxgPGgxPkhvbWU8L2gxPmBdLFxuICogICAgICAgWydhYm91dCcsICgpID0+IGh0bWxgPGgxPkFib3V0PC9oMT5gXVxuICogICAgIF0sXG4gKiAgICAgKCkgPT4gaHRtbGA8aDE+RXJyb3I8L2gxPmApfVxuICogICBgO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBjaG9vc2UgPSA8VCwgViwgSyBleHRlbmRzIFQgPSBUPihcbiAgdmFsdWU6IFQsXG4gIGNhc2VzOiBBcnJheTxbSywgKCkgPT4gVl0+LFxuICBkZWZhdWx0Q2FzZT86ICgpID0+IFZcbikgPT4ge1xuICBmb3IgKGNvbnN0IGMgb2YgY2FzZXMpIHtcbiAgICBjb25zdCBjYXNlVmFsdWUgPSBjWzBdO1xuICAgIGlmIChjYXNlVmFsdWUgPT09IHZhbHVlKSB7XG4gICAgICBjb25zdCBmbiA9IGNbMV07XG4gICAgICByZXR1cm4gZm4oKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlZmF1bHRDYXNlPy4oKTtcbn07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtBdHRyaWJ1dGVQYXJ0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmUsXG4gIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG4gIFBhcnRJbmZvLFxuICBQYXJ0VHlwZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcblxuLyoqXG4gKiBBIGtleS12YWx1ZSBzZXQgb2YgY2xhc3MgbmFtZXMgdG8gdHJ1dGh5IHZhbHVlcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDbGFzc0luZm8ge1xuICByZWFkb25seSBbbmFtZTogc3RyaW5nXTogc3RyaW5nIHwgYm9vbGVhbiB8IG51bWJlcjtcbn1cblxuY2xhc3MgQ2xhc3NNYXBEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICAvKipcbiAgICogU3RvcmVzIHRoZSBDbGFzc0luZm8gb2JqZWN0IGFwcGxpZWQgdG8gYSBnaXZlbiBBdHRyaWJ1dGVQYXJ0LlxuICAgKiBVc2VkIHRvIHVuc2V0IGV4aXN0aW5nIHZhbHVlcyB3aGVuIGEgbmV3IENsYXNzSW5mbyBvYmplY3QgaXMgYXBwbGllZC5cbiAgICovXG4gIHByaXZhdGUgX3ByZXZpb3VzQ2xhc3Nlcz86IFNldDxzdHJpbmc+O1xuICBwcml2YXRlIF9zdGF0aWNDbGFzc2VzPzogU2V0PHN0cmluZz47XG5cbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICAgIGlmIChcbiAgICAgIHBhcnRJbmZvLnR5cGUgIT09IFBhcnRUeXBlLkFUVFJJQlVURSB8fFxuICAgICAgcGFydEluZm8ubmFtZSAhPT0gJ2NsYXNzJyB8fFxuICAgICAgKHBhcnRJbmZvLnN0cmluZ3M/Lmxlbmd0aCBhcyBudW1iZXIpID4gMlxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnYGNsYXNzTWFwKClgIGNhbiBvbmx5IGJlIHVzZWQgaW4gdGhlIGBjbGFzc2AgYXR0cmlidXRlICcgK1xuICAgICAgICAgICdhbmQgbXVzdCBiZSB0aGUgb25seSBwYXJ0IGluIHRoZSBhdHRyaWJ1dGUuJ1xuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXIoY2xhc3NJbmZvOiBDbGFzc0luZm8pIHtcbiAgICAvLyBBZGQgc3BhY2VzIHRvIGVuc3VyZSBzZXBhcmF0aW9uIGZyb20gc3RhdGljIGNsYXNzZXNcbiAgICByZXR1cm4gKFxuICAgICAgJyAnICtcbiAgICAgIE9iamVjdC5rZXlzKGNsYXNzSW5mbylcbiAgICAgICAgLmZpbHRlcigoa2V5KSA9PiBjbGFzc0luZm9ba2V5XSlcbiAgICAgICAgLmpvaW4oJyAnKSArXG4gICAgICAnICdcbiAgICApO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IEF0dHJpYnV0ZVBhcnQsIFtjbGFzc0luZm9dOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgLy8gUmVtZW1iZXIgZHluYW1pYyBjbGFzc2VzIG9uIHRoZSBmaXJzdCByZW5kZXJcbiAgICBpZiAodGhpcy5fcHJldmlvdXNDbGFzc2VzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX3ByZXZpb3VzQ2xhc3NlcyA9IG5ldyBTZXQoKTtcbiAgICAgIGlmIChwYXJ0LnN0cmluZ3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9zdGF0aWNDbGFzc2VzID0gbmV3IFNldChcbiAgICAgICAgICBwYXJ0LnN0cmluZ3NcbiAgICAgICAgICAgIC5qb2luKCcgJylcbiAgICAgICAgICAgIC5zcGxpdCgvXFxzLylcbiAgICAgICAgICAgIC5maWx0ZXIoKHMpID0+IHMgIT09ICcnKVxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBuYW1lIGluIGNsYXNzSW5mbykge1xuICAgICAgICBpZiAoY2xhc3NJbmZvW25hbWVdICYmICF0aGlzLl9zdGF0aWNDbGFzc2VzPy5oYXMobmFtZSkpIHtcbiAgICAgICAgICB0aGlzLl9wcmV2aW91c0NsYXNzZXMuYWRkKG5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5yZW5kZXIoY2xhc3NJbmZvKTtcbiAgICB9XG5cbiAgICBjb25zdCBjbGFzc0xpc3QgPSBwYXJ0LmVsZW1lbnQuY2xhc3NMaXN0O1xuXG4gICAgLy8gUmVtb3ZlIG9sZCBjbGFzc2VzIHRoYXQgbm8gbG9uZ2VyIGFwcGx5XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHRoaXMuX3ByZXZpb3VzQ2xhc3Nlcykge1xuICAgICAgaWYgKCEobmFtZSBpbiBjbGFzc0luZm8pKSB7XG4gICAgICAgIGNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgICAgIHRoaXMuX3ByZXZpb3VzQ2xhc3NlcyEuZGVsZXRlKG5hbWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFkZCBvciByZW1vdmUgY2xhc3NlcyBiYXNlZCBvbiB0aGVpciBjbGFzc01hcCB2YWx1ZVxuICAgIGZvciAoY29uc3QgbmFtZSBpbiBjbGFzc0luZm8pIHtcbiAgICAgIC8vIFdlIGV4cGxpY2l0bHkgd2FudCBhIGxvb3NlIHRydXRoeSBjaGVjayBvZiBgdmFsdWVgIGJlY2F1c2UgaXQgc2VlbXNcbiAgICAgIC8vIG1vcmUgY29udmVuaWVudCB0aGF0ICcnIGFuZCAwIGFyZSBza2lwcGVkLlxuICAgICAgY29uc3QgdmFsdWUgPSAhIWNsYXNzSW5mb1tuYW1lXTtcbiAgICAgIGlmIChcbiAgICAgICAgdmFsdWUgIT09IHRoaXMuX3ByZXZpb3VzQ2xhc3Nlcy5oYXMobmFtZSkgJiZcbiAgICAgICAgIXRoaXMuX3N0YXRpY0NsYXNzZXM/LmhhcyhuYW1lKVxuICAgICAgKSB7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgIGNsYXNzTGlzdC5hZGQobmFtZSk7XG4gICAgICAgICAgdGhpcy5fcHJldmlvdXNDbGFzc2VzLmFkZChuYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjbGFzc0xpc3QucmVtb3ZlKG5hbWUpO1xuICAgICAgICAgIHRoaXMuX3ByZXZpb3VzQ2xhc3Nlcy5kZWxldGUobmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG59XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCBhcHBsaWVzIGR5bmFtaWMgQ1NTIGNsYXNzZXMuXG4gKlxuICogVGhpcyBtdXN0IGJlIHVzZWQgaW4gdGhlIGBjbGFzc2AgYXR0cmlidXRlIGFuZCBtdXN0IGJlIHRoZSBvbmx5IHBhcnQgdXNlZCBpblxuICogdGhlIGF0dHJpYnV0ZS4gSXQgdGFrZXMgZWFjaCBwcm9wZXJ0eSBpbiB0aGUgYGNsYXNzSW5mb2AgYXJndW1lbnQgYW5kIGFkZHNcbiAqIHRoZSBwcm9wZXJ0eSBuYW1lIHRvIHRoZSBlbGVtZW50J3MgYGNsYXNzTGlzdGAgaWYgdGhlIHByb3BlcnR5IHZhbHVlIGlzXG4gKiB0cnV0aHk7IGlmIHRoZSBwcm9wZXJ0eSB2YWx1ZSBpcyBmYWxzeSwgdGhlIHByb3BlcnR5IG5hbWUgaXMgcmVtb3ZlZCBmcm9tXG4gKiB0aGUgZWxlbWVudCdzIGBjbGFzc2AuXG4gKlxuICogRm9yIGV4YW1wbGUgYHtmb286IGJhcn1gIGFwcGxpZXMgdGhlIGNsYXNzIGBmb29gIGlmIHRoZSB2YWx1ZSBvZiBgYmFyYCBpc1xuICogdHJ1dGh5LlxuICpcbiAqIEBwYXJhbSBjbGFzc0luZm9cbiAqL1xuZXhwb3J0IGNvbnN0IGNsYXNzTWFwID0gZGlyZWN0aXZlKENsYXNzTWFwRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtDbGFzc01hcERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtub0NoYW5nZSwgUGFydH0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIERpcmVjdGl2ZSwgRGlyZWN0aXZlUGFyYW1ldGVyc30gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcblxuLy8gQSBzZW50aW5lbCB0aGF0IGluZGljYXRlcyBndWFyZCgpIGhhc24ndCByZW5kZXJlZCBhbnl0aGluZyB5ZXRcbmNvbnN0IGluaXRpYWxWYWx1ZSA9IHt9O1xuXG5jbGFzcyBHdWFyZERpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX3ByZXZpb3VzVmFsdWU6IHVua25vd24gPSBpbml0aWFsVmFsdWU7XG5cbiAgcmVuZGVyKF92YWx1ZTogdW5rbm93biwgZjogKCkgPT4gdW5rbm93bikge1xuICAgIHJldHVybiBmKCk7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUoX3BhcnQ6IFBhcnQsIFt2YWx1ZSwgZl06IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIC8vIERpcnR5LWNoZWNrIGFycmF5cyBieSBpdGVtXG4gICAgICBpZiAoXG4gICAgICAgIEFycmF5LmlzQXJyYXkodGhpcy5fcHJldmlvdXNWYWx1ZSkgJiZcbiAgICAgICAgdGhpcy5fcHJldmlvdXNWYWx1ZS5sZW5ndGggPT09IHZhbHVlLmxlbmd0aCAmJlxuICAgICAgICB2YWx1ZS5ldmVyeSgodiwgaSkgPT4gdiA9PT0gKHRoaXMuX3ByZXZpb3VzVmFsdWUgYXMgQXJyYXk8dW5rbm93bj4pW2ldKVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRoaXMuX3ByZXZpb3VzVmFsdWUgPT09IHZhbHVlKSB7XG4gICAgICAvLyBEaXJ0eS1jaGVjayBub24tYXJyYXlzIGJ5IGlkZW50aXR5XG4gICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgfVxuXG4gICAgLy8gQ29weSB0aGUgdmFsdWUgaWYgaXQncyBhbiBhcnJheSBzbyB0aGF0IGlmIGl0J3MgbXV0YXRlZCB3ZSBkb24ndCBmb3JnZXRcbiAgICAvLyB3aGF0IHRoZSBwcmV2aW91cyB2YWx1ZXMgd2VyZS5cbiAgICB0aGlzLl9wcmV2aW91c1ZhbHVlID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyBBcnJheS5mcm9tKHZhbHVlKSA6IHZhbHVlO1xuICAgIGNvbnN0IHIgPSB0aGlzLnJlbmRlcih2YWx1ZSwgZik7XG4gICAgcmV0dXJuIHI7XG4gIH1cbn1cblxuLyoqXG4gKiBQcmV2ZW50cyByZS1yZW5kZXIgb2YgYSB0ZW1wbGF0ZSBmdW5jdGlvbiB1bnRpbCBhIHNpbmdsZSB2YWx1ZSBvciBhbiBhcnJheSBvZlxuICogdmFsdWVzIGNoYW5nZXMuXG4gKlxuICogVmFsdWVzIGFyZSBjaGVja2VkIGFnYWluc3QgcHJldmlvdXMgdmFsdWVzIHdpdGggc3RyaWN0IGVxdWFsaXR5IChgPT09YCksIGFuZFxuICogc28gdGhlIGNoZWNrIHdvbid0IGRldGVjdCBuZXN0ZWQgcHJvcGVydHkgY2hhbmdlcyBpbnNpZGUgb2JqZWN0cyBvciBhcnJheXMuXG4gKiBBcnJheXMgdmFsdWVzIGhhdmUgZWFjaCBpdGVtIGNoZWNrZWQgYWdhaW5zdCB0aGUgcHJldmlvdXMgdmFsdWUgYXQgdGhlIHNhbWVcbiAqIGluZGV4IHdpdGggc3RyaWN0IGVxdWFsaXR5LiBOZXN0ZWQgYXJyYXlzIGFyZSBhbHNvIGNoZWNrZWQgb25seSBieSBzdHJpY3RcbiAqIGVxdWFsaXR5LlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogYGBganNcbiAqIGh0bWxgXG4gKiAgIDxkaXY+XG4gKiAgICAgJHtndWFyZChbdXNlci5pZCwgY29tcGFueS5pZF0sICgpID0+IGh0bWxgLi4uYCl9XG4gKiAgIDwvZGl2PlxuICogYFxuICogYGBgXG4gKlxuICogSW4gdGhpcyBjYXNlLCB0aGUgdGVtcGxhdGUgb25seSByZXJlbmRlcnMgaWYgZWl0aGVyIGB1c2VyLmlkYCBvciBgY29tcGFueS5pZGBcbiAqIGNoYW5nZXMuXG4gKlxuICogZ3VhcmQoKSBpcyB1c2VmdWwgd2l0aCBpbW11dGFibGUgZGF0YSBwYXR0ZXJucywgYnkgcHJldmVudGluZyBleHBlbnNpdmUgd29ya1xuICogdW50aWwgZGF0YSB1cGRhdGVzLlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogYGBganNcbiAqIGh0bWxgXG4gKiAgIDxkaXY+XG4gKiAgICAgJHtndWFyZChbaW1tdXRhYmxlSXRlbXNdLCAoKSA9PiBpbW11dGFibGVJdGVtcy5tYXAoaSA9PiBodG1sYCR7aX1gKSl9XG4gKiAgIDwvZGl2PlxuICogYFxuICogYGBgXG4gKlxuICogSW4gdGhpcyBjYXNlLCBpdGVtcyBhcmUgbWFwcGVkIG92ZXIgb25seSB3aGVuIHRoZSBhcnJheSByZWZlcmVuY2UgY2hhbmdlcy5cbiAqXG4gKiBAcGFyYW0gdmFsdWUgdGhlIHZhbHVlIHRvIGNoZWNrIGJlZm9yZSByZS1yZW5kZXJpbmdcbiAqIEBwYXJhbSBmIHRoZSB0ZW1wbGF0ZSBmdW5jdGlvblxuICovXG5leHBvcnQgY29uc3QgZ3VhcmQgPSBkaXJlY3RpdmUoR3VhcmREaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge0d1YXJkRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge25vdGhpbmd9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcblxuLyoqXG4gKiBGb3IgQXR0cmlidXRlUGFydHMsIHNldHMgdGhlIGF0dHJpYnV0ZSBpZiB0aGUgdmFsdWUgaXMgZGVmaW5lZCBhbmQgcmVtb3Zlc1xuICogdGhlIGF0dHJpYnV0ZSBpZiB0aGUgdmFsdWUgaXMgdW5kZWZpbmVkLlxuICpcbiAqIEZvciBvdGhlciBwYXJ0IHR5cGVzLCB0aGlzIGRpcmVjdGl2ZSBpcyBhIG5vLW9wLlxuICovXG5leHBvcnQgY29uc3QgaWZEZWZpbmVkID0gPFQ+KHZhbHVlOiBUKSA9PiB2YWx1ZSA/PyBub3RoaW5nO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjEgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbi8qKlxuICogUmV0dXJucyBhbiBpdGVyYWJsZSBjb250YWluaW5nIHRoZSB2YWx1ZXMgaW4gYGl0ZW1zYCBpbnRlcmxlYXZlZCB3aXRoIHRoZVxuICogYGpvaW5lcmAgdmFsdWUuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogcmVuZGVyKCkge1xuICogICByZXR1cm4gaHRtbGBcbiAqICAgICAke2pvaW4oaXRlbXMsIGh0bWxgPHNwYW4gY2xhc3M9XCJzZXBhcmF0b3JcIj58PC9zcGFuPmApfVxuICogICBgO1xuICogfVxuICovXG5leHBvcnQgZnVuY3Rpb24gam9pbjxJLCBKPihcbiAgaXRlbXM6IEl0ZXJhYmxlPEk+IHwgdW5kZWZpbmVkLFxuICBqb2luZXI6IChpbmRleDogbnVtYmVyKSA9PiBKXG4pOiBJdGVyYWJsZTxJIHwgSj47XG5leHBvcnQgZnVuY3Rpb24gam9pbjxJLCBKPihcbiAgaXRlbXM6IEl0ZXJhYmxlPEk+IHwgdW5kZWZpbmVkLFxuICBqb2luZXI6IEpcbik6IEl0ZXJhYmxlPEkgfCBKPjtcbmV4cG9ydCBmdW5jdGlvbiogam9pbjxJLCBKPihpdGVtczogSXRlcmFibGU8ST4gfCB1bmRlZmluZWQsIGpvaW5lcjogSikge1xuICBjb25zdCBpc0Z1bmN0aW9uID0gdHlwZW9mIGpvaW5lciA9PT0gJ2Z1bmN0aW9uJztcbiAgaWYgKGl0ZW1zICE9PSB1bmRlZmluZWQpIHtcbiAgICBsZXQgaSA9IC0xO1xuICAgIGZvciAoY29uc3QgdmFsdWUgb2YgaXRlbXMpIHtcbiAgICAgIGlmIChpID4gLTEpIHtcbiAgICAgICAgeWllbGQgaXNGdW5jdGlvbiA/IGpvaW5lcihpKSA6IGpvaW5lcjtcbiAgICAgIH1cbiAgICAgIGkrKztcbiAgICAgIHlpZWxkIHZhbHVlO1xuICAgIH1cbiAgfVxufVxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjEgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7bm90aGluZ30gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmUsXG4gIENoaWxkUGFydCxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7c2V0Q29tbWl0dGVkVmFsdWV9IGZyb20gJy4uL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcblxuY2xhc3MgS2V5ZWQgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBrZXk6IHVua25vd24gPSBub3RoaW5nO1xuXG4gIHJlbmRlcihrOiB1bmtub3duLCB2OiB1bmtub3duKSB7XG4gICAgdGhpcy5rZXkgPSBrO1xuICAgIHJldHVybiB2O1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IENoaWxkUGFydCwgW2ssIHZdOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgaWYgKGsgIT09IHRoaXMua2V5KSB7XG4gICAgICAvLyBDbGVhciB0aGUgcGFydCBiZWZvcmUgcmV0dXJuaW5nIGEgdmFsdWUuIFRoZSBvbmUtYXJnIGZvcm0gb2ZcbiAgICAgIC8vIHNldENvbW1pdHRlZFZhbHVlIHNldHMgdGhlIHZhbHVlIHRvIGEgc2VudGluZWwgd2hpY2ggZm9yY2VzIGFcbiAgICAgIC8vIGNvbW1pdCB0aGUgbmV4dCByZW5kZXIuXG4gICAgICBzZXRDb21taXR0ZWRWYWx1ZShwYXJ0KTtcbiAgICAgIHRoaXMua2V5ID0gaztcbiAgICB9XG4gICAgcmV0dXJuIHY7XG4gIH1cbn1cblxuLyoqXG4gKiBBc3NvY2lhdGVzIGEgcmVuZGVyYWJsZSB2YWx1ZSB3aXRoIGEgdW5pcXVlIGtleS4gV2hlbiB0aGUga2V5IGNoYW5nZXMsIHRoZVxuICogcHJldmlvdXMgRE9NIGlzIHJlbW92ZWQgYW5kIGRpc3Bvc2VkIGJlZm9yZSByZW5kZXJpbmcgdGhlIG5leHQgdmFsdWUsIGV2ZW5cbiAqIGlmIHRoZSB2YWx1ZSAtIHN1Y2ggYXMgYSB0ZW1wbGF0ZSAtIGlzIHRoZSBzYW1lLlxuICpcbiAqIFRoaXMgaXMgdXNlZnVsIGZvciBmb3JjaW5nIHJlLXJlbmRlcnMgb2Ygc3RhdGVmdWwgY29tcG9uZW50cywgb3Igd29ya2luZ1xuICogd2l0aCBjb2RlIHRoYXQgZXhwZWN0cyBuZXcgZGF0YSB0byBnZW5lcmF0ZSBuZXcgSFRNTCBlbGVtZW50cywgc3VjaCBhcyBzb21lXG4gKiBhbmltYXRpb24gdGVjaG5pcXVlcy5cbiAqL1xuZXhwb3J0IGNvbnN0IGtleWVkID0gZGlyZWN0aXZlKEtleWVkKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtLZXllZH07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtBdHRyaWJ1dGVQYXJ0LCBub0NoYW5nZSwgbm90aGluZ30gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmUsXG4gIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG4gIFBhcnRJbmZvLFxuICBQYXJ0VHlwZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7aXNTaW5nbGVFeHByZXNzaW9uLCBzZXRDb21taXR0ZWRWYWx1ZX0gZnJvbSAnLi4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuXG5jbGFzcyBMaXZlRGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICAgIGlmIChcbiAgICAgICEoXG4gICAgICAgIHBhcnRJbmZvLnR5cGUgPT09IFBhcnRUeXBlLlBST1BFUlRZIHx8XG4gICAgICAgIHBhcnRJbmZvLnR5cGUgPT09IFBhcnRUeXBlLkFUVFJJQlVURSB8fFxuICAgICAgICBwYXJ0SW5mby50eXBlID09PSBQYXJ0VHlwZS5CT09MRUFOX0FUVFJJQlVURVxuICAgICAgKVxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnVGhlIGBsaXZlYCBkaXJlY3RpdmUgaXMgbm90IGFsbG93ZWQgb24gY2hpbGQgb3IgZXZlbnQgYmluZGluZ3MnXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAoIWlzU2luZ2xlRXhwcmVzc2lvbihwYXJ0SW5mbykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignYGxpdmVgIGJpbmRpbmdzIGNhbiBvbmx5IGNvbnRhaW4gYSBzaW5nbGUgZXhwcmVzc2lvbicpO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlcih2YWx1ZTogdW5rbm93bikge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShwYXJ0OiBBdHRyaWJ1dGVQYXJ0LCBbdmFsdWVdOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgaWYgKHZhbHVlID09PSBub0NoYW5nZSB8fCB2YWx1ZSA9PT0gbm90aGluZykge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBjb25zdCBlbGVtZW50ID0gcGFydC5lbGVtZW50O1xuICAgIGNvbnN0IG5hbWUgPSBwYXJ0Lm5hbWU7XG5cbiAgICBpZiAocGFydC50eXBlID09PSBQYXJ0VHlwZS5QUk9QRVJUWSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgIGlmICh2YWx1ZSA9PT0gKGVsZW1lbnQgYXMgYW55KVtuYW1lXSkge1xuICAgICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChwYXJ0LnR5cGUgPT09IFBhcnRUeXBlLkJPT0xFQU5fQVRUUklCVVRFKSB7XG4gICAgICBpZiAoISF2YWx1ZSA9PT0gZWxlbWVudC5oYXNBdHRyaWJ1dGUobmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIG5vQ2hhbmdlO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocGFydC50eXBlID09PSBQYXJ0VHlwZS5BVFRSSUJVVEUpIHtcbiAgICAgIGlmIChlbGVtZW50LmdldEF0dHJpYnV0ZShuYW1lKSA9PT0gU3RyaW5nKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFJlc2V0cyB0aGUgcGFydCdzIHZhbHVlLCBjYXVzaW5nIGl0cyBkaXJ0eS1jaGVjayB0byBmYWlsIHNvIHRoYXQgaXRcbiAgICAvLyBhbHdheXMgc2V0cyB0aGUgdmFsdWUuXG4gICAgc2V0Q29tbWl0dGVkVmFsdWUocGFydCk7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG59XG5cbi8qKlxuICogQ2hlY2tzIGJpbmRpbmcgdmFsdWVzIGFnYWluc3QgbGl2ZSBET00gdmFsdWVzLCBpbnN0ZWFkIG9mIHByZXZpb3VzbHkgYm91bmRcbiAqIHZhbHVlcywgd2hlbiBkZXRlcm1pbmluZyB3aGV0aGVyIHRvIHVwZGF0ZSB0aGUgdmFsdWUuXG4gKlxuICogVGhpcyBpcyB1c2VmdWwgZm9yIGNhc2VzIHdoZXJlIHRoZSBET00gdmFsdWUgbWF5IGNoYW5nZSBmcm9tIG91dHNpZGUgb2ZcbiAqIGxpdC1odG1sLCBzdWNoIGFzIHdpdGggYSBiaW5kaW5nIHRvIGFuIGA8aW5wdXQ+YCBlbGVtZW50J3MgYHZhbHVlYCBwcm9wZXJ0eSxcbiAqIGEgY29udGVudCBlZGl0YWJsZSBlbGVtZW50cyB0ZXh0LCBvciB0byBhIGN1c3RvbSBlbGVtZW50IHRoYXQgY2hhbmdlcyBpdCdzXG4gKiBvd24gcHJvcGVydGllcyBvciBhdHRyaWJ1dGVzLlxuICpcbiAqIEluIHRoZXNlIGNhc2VzIGlmIHRoZSBET00gdmFsdWUgY2hhbmdlcywgYnV0IHRoZSB2YWx1ZSBzZXQgdGhyb3VnaCBsaXQtaHRtbFxuICogYmluZGluZ3MgaGFzbid0LCBsaXQtaHRtbCB3b24ndCBrbm93IHRvIHVwZGF0ZSB0aGUgRE9NIHZhbHVlIGFuZCB3aWxsIGxlYXZlXG4gKiBpdCBhbG9uZS4gSWYgdGhpcyBpcyBub3Qgd2hhdCB5b3Ugd2FudC0taWYgeW91IHdhbnQgdG8gb3ZlcndyaXRlIHRoZSBET01cbiAqIHZhbHVlIHdpdGggdGhlIGJvdW5kIHZhbHVlIG5vIG1hdHRlciB3aGF0LS11c2UgdGhlIGBsaXZlKClgIGRpcmVjdGl2ZTpcbiAqXG4gKiBgYGBqc1xuICogaHRtbGA8aW5wdXQgLnZhbHVlPSR7bGl2ZSh4KX0+YFxuICogYGBgXG4gKlxuICogYGxpdmUoKWAgcGVyZm9ybXMgYSBzdHJpY3QgZXF1YWxpdHkgY2hlY2sgYWdhaW5zdCB0aGUgbGl2ZSBET00gdmFsdWUsIGFuZCBpZlxuICogdGhlIG5ldyB2YWx1ZSBpcyBlcXVhbCB0byB0aGUgbGl2ZSB2YWx1ZSwgZG9lcyBub3RoaW5nLiBUaGlzIG1lYW5zIHRoYXRcbiAqIGBsaXZlKClgIHNob3VsZCBub3QgYmUgdXNlZCB3aGVuIHRoZSBiaW5kaW5nIHdpbGwgY2F1c2UgYSB0eXBlIGNvbnZlcnNpb24uIElmXG4gKiB5b3UgdXNlIGBsaXZlKClgIHdpdGggYW4gYXR0cmlidXRlIGJpbmRpbmcsIG1ha2Ugc3VyZSB0aGF0IG9ubHkgc3RyaW5ncyBhcmVcbiAqIHBhc3NlZCBpbiwgb3IgdGhlIGJpbmRpbmcgd2lsbCB1cGRhdGUgZXZlcnkgcmVuZGVyLlxuICovXG5leHBvcnQgY29uc3QgbGl2ZSA9IGRpcmVjdGl2ZShMaXZlRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtMaXZlRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIxIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG4vKipcbiAqIFJldHVybnMgYW4gaXRlcmFibGUgY29udGFpbmluZyB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgYGYodmFsdWUpYCBvbiBlYWNoXG4gKiB2YWx1ZSBpbiBgaXRlbXNgLlxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogYGBgdHNcbiAqIHJlbmRlcigpIHtcbiAqICAgcmV0dXJuIGh0bWxgXG4gKiAgICAgPHVsPlxuICogICAgICAgJHttYXAoaXRlbXMsIChpKSA9PiBodG1sYDxsaT4ke2l9PC9saT5gKX1cbiAqICAgICA8L3VsPlxuICogICBgO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiogbWFwPFQ+KFxuICBpdGVtczogSXRlcmFibGU8VD4gfCB1bmRlZmluZWQsXG4gIGY6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlcikgPT4gdW5rbm93blxuKSB7XG4gIGlmIChpdGVtcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgbGV0IGkgPSAwO1xuICAgIGZvciAoY29uc3QgdmFsdWUgb2YgaXRlbXMpIHtcbiAgICAgIHlpZWxkIGYodmFsdWUsIGkrKyk7XG4gICAgfVxuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLyoqXG4gKiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIGludGVnZXJzIGZyb20gYHN0YXJ0YCB0byBgZW5kYCAoZXhjbHVzaXZlKVxuICogaW5jcmVtZW50aW5nIGJ5IGBzdGVwYC5cbiAqXG4gKiBJZiBgc3RhcnRgIGlzIG9taXR0ZWQsIHRoZSByYW5nZSBzdGFydHMgYXQgYDBgLiBgc3RlcGAgZGVmYXVsdHMgdG8gYDFgLlxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogYGBgdHNcbiAqIHJlbmRlcigpIHtcbiAqICAgcmV0dXJuIGh0bWxgXG4gKiAgICAgJHttYXAocmFuZ2UoOCksICgpID0+IGh0bWxgPGRpdiBjbGFzcz1cImNlbGxcIj48L2Rpdj5gKX1cbiAqICAgYDtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZ2UoZW5kOiBudW1iZXIpOiBJdGVyYWJsZTxudW1iZXI+O1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmdlKFxuICBzdGFydDogbnVtYmVyLFxuICBlbmQ6IG51bWJlcixcbiAgc3RlcD86IG51bWJlclxuKTogSXRlcmFibGU8bnVtYmVyPjtcbmV4cG9ydCBmdW5jdGlvbiogcmFuZ2Uoc3RhcnRPckVuZDogbnVtYmVyLCBlbmQ/OiBudW1iZXIsIHN0ZXAgPSAxKSB7XG4gIGNvbnN0IHN0YXJ0ID0gZW5kID09PSB1bmRlZmluZWQgPyAwIDogc3RhcnRPckVuZDtcbiAgZW5kID8/PSBzdGFydE9yRW5kO1xuICBmb3IgKGxldCBpID0gc3RhcnQ7IHN0ZXAgPiAwID8gaSA8IGVuZCA6IGVuZCA8IGk7IGkgKz0gc3RlcCkge1xuICAgIHlpZWxkIGk7XG4gIH1cbn1cbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0NoaWxkUGFydCwgbm9DaGFuZ2V9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7ZGlyZWN0aXZlLCBEaXJlY3RpdmUsIFBhcnRJbmZvLCBQYXJ0VHlwZX0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7XG4gIGluc2VydFBhcnQsXG4gIGdldENvbW1pdHRlZFZhbHVlLFxuICByZW1vdmVQYXJ0LFxuICBzZXRDb21taXR0ZWRWYWx1ZSxcbiAgc2V0Q2hpbGRQYXJ0VmFsdWUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcblxuZXhwb3J0IHR5cGUgS2V5Rm48VD4gPSAoaXRlbTogVCwgaW5kZXg6IG51bWJlcikgPT4gdW5rbm93bjtcbmV4cG9ydCB0eXBlIEl0ZW1UZW1wbGF0ZTxUPiA9IChpdGVtOiBULCBpbmRleDogbnVtYmVyKSA9PiB1bmtub3duO1xuXG4vLyBIZWxwZXIgZm9yIGdlbmVyYXRpbmcgYSBtYXAgb2YgYXJyYXkgaXRlbSB0byBpdHMgaW5kZXggb3ZlciBhIHN1YnNldFxuLy8gb2YgYW4gYXJyYXkgKHVzZWQgdG8gbGF6aWx5IGdlbmVyYXRlIGBuZXdLZXlUb0luZGV4TWFwYCBhbmRcbi8vIGBvbGRLZXlUb0luZGV4TWFwYClcbmNvbnN0IGdlbmVyYXRlTWFwID0gKGxpc3Q6IHVua25vd25bXSwgc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIpID0+IHtcbiAgY29uc3QgbWFwID0gbmV3IE1hcDx1bmtub3duLCBudW1iZXI+KCk7XG4gIGZvciAobGV0IGkgPSBzdGFydDsgaSA8PSBlbmQ7IGkrKykge1xuICAgIG1hcC5zZXQobGlzdFtpXSwgaSk7XG4gIH1cbiAgcmV0dXJuIG1hcDtcbn07XG5cbmNsYXNzIFJlcGVhdERpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX2l0ZW1LZXlzPzogdW5rbm93bltdO1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAocGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQ0hJTEQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncmVwZWF0KCkgY2FuIG9ubHkgYmUgdXNlZCBpbiB0ZXh0IGV4cHJlc3Npb25zJyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfZ2V0VmFsdWVzQW5kS2V5czxUPihcbiAgICBpdGVtczogSXRlcmFibGU8VD4sXG4gICAga2V5Rm5PclRlbXBsYXRlOiBLZXlGbjxUPiB8IEl0ZW1UZW1wbGF0ZTxUPixcbiAgICB0ZW1wbGF0ZT86IEl0ZW1UZW1wbGF0ZTxUPlxuICApIHtcbiAgICBsZXQga2V5Rm46IEtleUZuPFQ+IHwgdW5kZWZpbmVkO1xuICAgIGlmICh0ZW1wbGF0ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0ZW1wbGF0ZSA9IGtleUZuT3JUZW1wbGF0ZTtcbiAgICB9IGVsc2UgaWYgKGtleUZuT3JUZW1wbGF0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBrZXlGbiA9IGtleUZuT3JUZW1wbGF0ZSBhcyBLZXlGbjxUPjtcbiAgICB9XG4gICAgY29uc3Qga2V5cyA9IFtdO1xuICAgIGNvbnN0IHZhbHVlcyA9IFtdO1xuICAgIGxldCBpbmRleCA9IDA7XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgICBrZXlzW2luZGV4XSA9IGtleUZuID8ga2V5Rm4oaXRlbSwgaW5kZXgpIDogaW5kZXg7XG4gICAgICB2YWx1ZXNbaW5kZXhdID0gdGVtcGxhdGUhKGl0ZW0sIGluZGV4KTtcbiAgICAgIGluZGV4Kys7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB2YWx1ZXMsXG4gICAgICBrZXlzLFxuICAgIH07XG4gIH1cblxuICByZW5kZXI8VD4oaXRlbXM6IEl0ZXJhYmxlPFQ+LCB0ZW1wbGF0ZTogSXRlbVRlbXBsYXRlPFQ+KTogQXJyYXk8dW5rbm93bj47XG4gIHJlbmRlcjxUPihcbiAgICBpdGVtczogSXRlcmFibGU8VD4sXG4gICAga2V5Rm46IEtleUZuPFQ+IHwgSXRlbVRlbXBsYXRlPFQ+LFxuICAgIHRlbXBsYXRlOiBJdGVtVGVtcGxhdGU8VD5cbiAgKTogQXJyYXk8dW5rbm93bj47XG4gIHJlbmRlcjxUPihcbiAgICBpdGVtczogSXRlcmFibGU8VD4sXG4gICAga2V5Rm5PclRlbXBsYXRlOiBLZXlGbjxUPiB8IEl0ZW1UZW1wbGF0ZTxUPixcbiAgICB0ZW1wbGF0ZT86IEl0ZW1UZW1wbGF0ZTxUPlxuICApIHtcbiAgICByZXR1cm4gdGhpcy5fZ2V0VmFsdWVzQW5kS2V5cyhpdGVtcywga2V5Rm5PclRlbXBsYXRlLCB0ZW1wbGF0ZSkudmFsdWVzO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlPFQ+KFxuICAgIGNvbnRhaW5lclBhcnQ6IENoaWxkUGFydCxcbiAgICBbaXRlbXMsIGtleUZuT3JUZW1wbGF0ZSwgdGVtcGxhdGVdOiBbXG4gICAgICBJdGVyYWJsZTxUPixcbiAgICAgIEtleUZuPFQ+IHwgSXRlbVRlbXBsYXRlPFQ+LFxuICAgICAgSXRlbVRlbXBsYXRlPFQ+LFxuICAgIF1cbiAgKSB7XG4gICAgLy8gT2xkIHBhcnQgJiBrZXkgbGlzdHMgYXJlIHJldHJpZXZlZCBmcm9tIHRoZSBsYXN0IHVwZGF0ZSAod2hpY2ggbWF5XG4gICAgLy8gYmUgcHJpbWVkIGJ5IGh5ZHJhdGlvbilcbiAgICBjb25zdCBvbGRQYXJ0cyA9IGdldENvbW1pdHRlZFZhbHVlKFxuICAgICAgY29udGFpbmVyUGFydFxuICAgICkgYXMgQXJyYXk8Q2hpbGRQYXJ0IHwgbnVsbD47XG4gICAgY29uc3Qge3ZhbHVlczogbmV3VmFsdWVzLCBrZXlzOiBuZXdLZXlzfSA9IHRoaXMuX2dldFZhbHVlc0FuZEtleXMoXG4gICAgICBpdGVtcyxcbiAgICAgIGtleUZuT3JUZW1wbGF0ZSxcbiAgICAgIHRlbXBsYXRlXG4gICAgKTtcblxuICAgIC8vIFdlIGNoZWNrIHRoYXQgb2xkUGFydHMsIHRoZSBjb21taXR0ZWQgdmFsdWUsIGlzIGFuIEFycmF5IGFzIGFuXG4gICAgLy8gaW5kaWNhdG9yIHRoYXQgdGhlIHByZXZpb3VzIHZhbHVlIGNhbWUgZnJvbSBhIHJlcGVhdCgpIGNhbGwuIElmXG4gICAgLy8gb2xkUGFydHMgaXMgbm90IGFuIEFycmF5IHRoZW4gdGhpcyBpcyB0aGUgZmlyc3QgcmVuZGVyIGFuZCB3ZSByZXR1cm5cbiAgICAvLyBhbiBhcnJheSBmb3IgbGl0LWh0bWwncyBhcnJheSBoYW5kbGluZyB0byByZW5kZXIsIGFuZCByZW1lbWJlciB0aGVcbiAgICAvLyBrZXlzLlxuICAgIGlmICghQXJyYXkuaXNBcnJheShvbGRQYXJ0cykpIHtcbiAgICAgIHRoaXMuX2l0ZW1LZXlzID0gbmV3S2V5cztcbiAgICAgIHJldHVybiBuZXdWYWx1ZXM7XG4gICAgfVxuXG4gICAgLy8gSW4gU1NSIGh5ZHJhdGlvbiBpdCdzIHBvc3NpYmxlIGZvciBvbGRQYXJ0cyB0byBiZSBhbiBhcnJheSBidXQgZm9yIHVzXG4gICAgLy8gdG8gbm90IGhhdmUgaXRlbSBrZXlzIGJlY2F1c2UgdGhlIHVwZGF0ZSgpIGhhc24ndCBydW4geWV0LiBXZSBzZXQgdGhlXG4gICAgLy8ga2V5cyB0byBhbiBlbXB0eSBhcnJheS4gVGhpcyB3aWxsIGNhdXNlIGFsbCBvbGRLZXkvbmV3S2V5IGNvbXBhcmlzb25zXG4gICAgLy8gdG8gZmFpbCBhbmQgZXhlY3V0aW9uIHRvIGZhbGwgdG8gdGhlIGxhc3QgbmVzdGVkIGJyYWNoIGJlbG93IHdoaWNoXG4gICAgLy8gcmV1c2VzIHRoZSBvbGRQYXJ0LlxuICAgIGNvbnN0IG9sZEtleXMgPSAodGhpcy5faXRlbUtleXMgPz89IFtdKTtcblxuICAgIC8vIE5ldyBwYXJ0IGxpc3Qgd2lsbCBiZSBidWlsdCB1cCBhcyB3ZSBnbyAoZWl0aGVyIHJldXNlZCBmcm9tXG4gICAgLy8gb2xkIHBhcnRzIG9yIGNyZWF0ZWQgZm9yIG5ldyBrZXlzIGluIHRoaXMgdXBkYXRlKS4gVGhpcyBpc1xuICAgIC8vIHNhdmVkIGluIHRoZSBhYm92ZSBjYWNoZSBhdCB0aGUgZW5kIG9mIHRoZSB1cGRhdGUuXG4gICAgY29uc3QgbmV3UGFydHM6IENoaWxkUGFydFtdID0gW107XG5cbiAgICAvLyBNYXBzIGZyb20ga2V5IHRvIGluZGV4IGZvciBjdXJyZW50IGFuZCBwcmV2aW91cyB1cGRhdGU7IHRoZXNlXG4gICAgLy8gYXJlIGdlbmVyYXRlZCBsYXppbHkgb25seSB3aGVuIG5lZWRlZCBhcyBhIHBlcmZvcm1hbmNlXG4gICAgLy8gb3B0aW1pemF0aW9uLCBzaW5jZSB0aGV5IGFyZSBvbmx5IHJlcXVpcmVkIGZvciBtdWx0aXBsZVxuICAgIC8vIG5vbi1jb250aWd1b3VzIGNoYW5nZXMgaW4gdGhlIGxpc3QsIHdoaWNoIGFyZSBsZXNzIGNvbW1vbi5cbiAgICBsZXQgbmV3S2V5VG9JbmRleE1hcCE6IE1hcDx1bmtub3duLCBudW1iZXI+O1xuICAgIGxldCBvbGRLZXlUb0luZGV4TWFwITogTWFwPHVua25vd24sIG51bWJlcj47XG5cbiAgICAvLyBIZWFkIGFuZCB0YWlsIHBvaW50ZXJzIHRvIG9sZCBwYXJ0cyBhbmQgbmV3IHZhbHVlc1xuICAgIGxldCBvbGRIZWFkID0gMDtcbiAgICBsZXQgb2xkVGFpbCA9IG9sZFBhcnRzLmxlbmd0aCAtIDE7XG4gICAgbGV0IG5ld0hlYWQgPSAwO1xuICAgIGxldCBuZXdUYWlsID0gbmV3VmFsdWVzLmxlbmd0aCAtIDE7XG5cbiAgICAvLyBPdmVydmlldyBvZiBPKG4pIHJlY29uY2lsaWF0aW9uIGFsZ29yaXRobSAoZ2VuZXJhbCBhcHByb2FjaFxuICAgIC8vIGJhc2VkIG9uIGlkZWFzIGZvdW5kIGluIGl2aSwgdnVlLCBzbmFiYmRvbSwgZXRjLik6XG4gICAgLy9cbiAgICAvLyAqIFdlIHN0YXJ0IHdpdGggdGhlIGxpc3Qgb2Ygb2xkIHBhcnRzIGFuZCBuZXcgdmFsdWVzIChhbmRcbiAgICAvLyAgIGFycmF5cyBvZiB0aGVpciByZXNwZWN0aXZlIGtleXMpLCBoZWFkL3RhaWwgcG9pbnRlcnMgaW50b1xuICAgIC8vICAgZWFjaCwgYW5kIHdlIGJ1aWxkIHVwIHRoZSBuZXcgbGlzdCBvZiBwYXJ0cyBieSB1cGRhdGluZ1xuICAgIC8vICAgKGFuZCB3aGVuIG5lZWRlZCwgbW92aW5nKSBvbGQgcGFydHMgb3IgY3JlYXRpbmcgbmV3IG9uZXMuXG4gICAgLy8gICBUaGUgaW5pdGlhbCBzY2VuYXJpbyBtaWdodCBsb29rIGxpa2UgdGhpcyAoZm9yIGJyZXZpdHkgb2ZcbiAgICAvLyAgIHRoZSBkaWFncmFtcywgdGhlIG51bWJlcnMgaW4gdGhlIGFycmF5IHJlZmxlY3Qga2V5c1xuICAgIC8vICAgYXNzb2NpYXRlZCB3aXRoIHRoZSBvbGQgcGFydHMgb3IgbmV3IHZhbHVlcywgYWx0aG91Z2gga2V5c1xuICAgIC8vICAgYW5kIHBhcnRzL3ZhbHVlcyBhcmUgYWN0dWFsbHkgc3RvcmVkIGluIHBhcmFsbGVsIGFycmF5c1xuICAgIC8vICAgaW5kZXhlZCB1c2luZyB0aGUgc2FtZSBoZWFkL3RhaWwgcG9pbnRlcnMpOlxuICAgIC8vXG4gICAgLy8gICAgICBvbGRIZWFkIHYgICAgICAgICAgICAgICAgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAyLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFsgLCAgLCAgLCAgLCAgLCAgLCAgXVxuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSA8LSByZWZsZWN0cyB0aGUgdXNlcidzIG5ld1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtIG9yZGVyXG4gICAgLy8gICAgICBuZXdIZWFkIF4gICAgICAgICAgICAgICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBJdGVyYXRlIG9sZCAmIG5ldyBsaXN0cyBmcm9tIGJvdGggc2lkZXMsIHVwZGF0aW5nLFxuICAgIC8vICAgc3dhcHBpbmcsIG9yIHJlbW92aW5nIHBhcnRzIGF0IHRoZSBoZWFkL3RhaWwgbG9jYXRpb25zXG4gICAgLy8gICB1bnRpbCBuZWl0aGVyIGhlYWQgbm9yIHRhaWwgY2FuIG1vdmUuXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IGtleXMgYXQgaGVhZCBwb2ludGVycyBtYXRjaCwgc28gdXBkYXRlIG9sZFxuICAgIC8vICAgcGFydCAwIGluLXBsYWNlIChubyBuZWVkIHRvIG1vdmUgaXQpIGFuZCByZWNvcmQgcGFydCAwIGluXG4gICAgLy8gICB0aGUgYG5ld1BhcnRzYCBsaXN0LiBUaGUgbGFzdCB0aGluZyB3ZSBkbyBpcyBhZHZhbmNlIHRoZVxuICAgIC8vICAgYG9sZEhlYWRgIGFuZCBgbmV3SGVhZGAgcG9pbnRlcnMgKHdpbGwgYmUgcmVmbGVjdGVkIGluIHRoZVxuICAgIC8vICAgbmV4dCBkaWFncmFtKS5cbiAgICAvL1xuICAgIC8vICAgICAgb2xkSGVhZCB2ICAgICAgICAgICAgICAgICB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgMiwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgICwgICwgICwgICwgICwgIF0gPC0gaGVhZHMgbWF0Y2hlZDogdXBkYXRlIDBcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICAgYW5kIGFkdmFuY2UgYm90aCBvbGRIZWFkXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICYgbmV3SGVhZFxuICAgIC8vICAgICAgbmV3SGVhZCBeICAgICAgICAgICAgICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogaGVhZCBwb2ludGVycyBkb24ndCBtYXRjaCwgYnV0IHRhaWxcbiAgICAvLyAgIHBvaW50ZXJzIGRvLCBzbyB1cGRhdGUgcGFydCA2IGluIHBsYWNlIChubyBuZWVkIHRvIG1vdmVcbiAgICAvLyAgIGl0KSwgYW5kIHJlY29yZCBwYXJ0IDYgaW4gdGhlIGBuZXdQYXJ0c2AgbGlzdC4gTGFzdCxcbiAgICAvLyAgIGFkdmFuY2UgdGhlIGBvbGRUYWlsYCBhbmQgYG9sZEhlYWRgIHBvaW50ZXJzLlxuICAgIC8vXG4gICAgLy8gICAgICAgICBvbGRIZWFkIHYgICAgICAgICAgICAgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAyLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFswLCAgLCAgLCAgLCAgLCAgLCA2XSA8LSB0YWlscyBtYXRjaGVkOiB1cGRhdGUgNlxuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSAgICBhbmQgYWR2YW5jZSBib3RoIG9sZFRhaWxcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJiBuZXdUYWlsXG4gICAgLy8gICAgICAgICBuZXdIZWFkIF4gICAgICAgICAgICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBJZiBuZWl0aGVyIGhlYWQgbm9yIHRhaWwgbWF0Y2g7IG5leHQgY2hlY2sgaWYgb25lIG9mIHRoZVxuICAgIC8vICAgb2xkIGhlYWQvdGFpbCBpdGVtcyB3YXMgcmVtb3ZlZC4gV2UgZmlyc3QgbmVlZCB0byBnZW5lcmF0ZVxuICAgIC8vICAgdGhlIHJldmVyc2UgbWFwIG9mIG5ldyBrZXlzIHRvIGluZGV4IChgbmV3S2V5VG9JbmRleE1hcGApLFxuICAgIC8vICAgd2hpY2ggaXMgZG9uZSBvbmNlIGxhemlseSBhcyBhIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvbixcbiAgICAvLyAgIHNpbmNlIHdlIG9ubHkgaGl0IHRoaXMgY2FzZSBpZiBtdWx0aXBsZSBub24tY29udGlndW91c1xuICAgIC8vICAgY2hhbmdlcyB3ZXJlIG1hZGUuIE5vdGUgdGhhdCBmb3IgY29udGlndW91cyByZW1vdmFsXG4gICAgLy8gICBhbnl3aGVyZSBpbiB0aGUgbGlzdCwgdGhlIGhlYWQgYW5kIHRhaWxzIHdvdWxkIGFkdmFuY2VcbiAgICAvLyAgIGZyb20gZWl0aGVyIGVuZCBhbmQgcGFzcyBlYWNoIG90aGVyIGJlZm9yZSB3ZSBnZXQgdG8gdGhpc1xuICAgIC8vICAgY2FzZSBhbmQgcmVtb3ZhbHMgd291bGQgYmUgaGFuZGxlZCBpbiB0aGUgZmluYWwgd2hpbGUgbG9vcFxuICAgIC8vICAgd2l0aG91dCBuZWVkaW5nIHRvIGdlbmVyYXRlIHRoZSBtYXAuXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IFRoZSBrZXkgYXQgYG9sZFRhaWxgIHdhcyByZW1vdmVkIChubyBsb25nZXJcbiAgICAvLyAgIGluIHRoZSBgbmV3S2V5VG9JbmRleE1hcGApLCBzbyByZW1vdmUgdGhhdCBwYXJ0IGZyb20gdGhlXG4gICAgLy8gICBET00gYW5kIGFkdmFuY2UganVzdCB0aGUgYG9sZFRhaWxgIHBvaW50ZXIuXG4gICAgLy9cbiAgICAvLyAgICAgICAgIG9sZEhlYWQgdiAgICAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIDIsIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsICAsICAsICAsICAsICAsIDZdIDwtIDUgbm90IGluIG5ldyBtYXA6IHJlbW92ZVxuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSAgICA1IGFuZCBhZHZhbmNlIG9sZFRhaWxcbiAgICAvLyAgICAgICAgIG5ld0hlYWQgXiAgICAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIE9uY2UgaGVhZCBhbmQgdGFpbCBjYW5ub3QgbW92ZSwgYW55IG1pc21hdGNoZXMgYXJlIGR1ZSB0b1xuICAgIC8vICAgZWl0aGVyIG5ldyBvciBtb3ZlZCBpdGVtczsgaWYgYSBuZXcga2V5IGlzIGluIHRoZSBwcmV2aW91c1xuICAgIC8vICAgXCJvbGQga2V5IHRvIG9sZCBpbmRleFwiIG1hcCwgbW92ZSB0aGUgb2xkIHBhcnQgdG8gdGhlIG5ld1xuICAgIC8vICAgbG9jYXRpb24sIG90aGVyd2lzZSBjcmVhdGUgYW5kIGluc2VydCBhIG5ldyBwYXJ0LiBOb3RlXG4gICAgLy8gICB0aGF0IHdoZW4gbW92aW5nIGFuIG9sZCBwYXJ0IHdlIG51bGwgaXRzIHBvc2l0aW9uIGluIHRoZVxuICAgIC8vICAgb2xkUGFydHMgYXJyYXkgaWYgaXQgbGllcyBiZXR3ZWVuIHRoZSBoZWFkIGFuZCB0YWlsIHNvIHdlXG4gICAgLy8gICBrbm93IHRvIHNraXAgaXQgd2hlbiB0aGUgcG9pbnRlcnMgZ2V0IHRoZXJlLlxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBuZWl0aGVyIGhlYWQgbm9yIHRhaWwgbWF0Y2gsIGFuZCBuZWl0aGVyXG4gICAgLy8gICB3ZXJlIHJlbW92ZWQ7IHNvIGZpbmQgdGhlIGBuZXdIZWFkYCBrZXkgaW4gdGhlXG4gICAgLy8gICBgb2xkS2V5VG9JbmRleE1hcGAsIGFuZCBtb3ZlIHRoYXQgb2xkIHBhcnQncyBET00gaW50byB0aGVcbiAgICAvLyAgIG5leHQgaGVhZCBwb3NpdGlvbiAoYmVmb3JlIGBvbGRQYXJ0c1tvbGRIZWFkXWApLiBMYXN0LFxuICAgIC8vICAgbnVsbCB0aGUgcGFydCBpbiB0aGUgYG9sZFBhcnRgIGFycmF5IHNpbmNlIGl0IHdhc1xuICAgIC8vICAgc29tZXdoZXJlIGluIHRoZSByZW1haW5pbmcgb2xkUGFydHMgc3RpbGwgdG8gYmUgc2Nhbm5lZFxuICAgIC8vICAgKGJldHdlZW4gdGhlIGhlYWQgYW5kIHRhaWwgcG9pbnRlcnMpIHNvIHRoYXQgd2Uga25vdyB0b1xuICAgIC8vICAgc2tpcCB0aGF0IG9sZCBwYXJ0IG9uIGZ1dHVyZSBpdGVyYXRpb25zLlxuICAgIC8vXG4gICAgLy8gICAgICAgICBvbGRIZWFkIHYgICAgICAgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAtLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFswLCAyLCAgLCAgLCAgLCAgLCA2XSA8LSBzdHVjazogdXBkYXRlICYgbW92ZSAyXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGludG8gcGxhY2UgYW5kIGFkdmFuY2VcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3SGVhZFxuICAgIC8vICAgICAgICAgbmV3SGVhZCBeICAgICAgICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogTm90ZSB0aGF0IGZvciBtb3Zlcy9pbnNlcnRpb25zIGxpa2UgdGhlIG9uZSBhYm92ZSwgYSBwYXJ0XG4gICAgLy8gICBpbnNlcnRlZCBhdCB0aGUgaGVhZCBwb2ludGVyIGlzIGluc2VydGVkIGJlZm9yZSB0aGVcbiAgICAvLyAgIGN1cnJlbnQgYG9sZFBhcnRzW29sZEhlYWRdYCwgYW5kIGEgcGFydCBpbnNlcnRlZCBhdCB0aGVcbiAgICAvLyAgIHRhaWwgcG9pbnRlciBpcyBpbnNlcnRlZCBiZWZvcmUgYG5ld1BhcnRzW25ld1RhaWwrMV1gLiBUaGVcbiAgICAvLyAgIHNlZW1pbmcgYXN5bW1ldHJ5IGxpZXMgaW4gdGhlIGZhY3QgdGhhdCBuZXcgcGFydHMgYXJlXG4gICAgLy8gICBtb3ZlZCBpbnRvIHBsYWNlIG91dHNpZGUgaW4sIHNvIHRvIHRoZSByaWdodCBvZiB0aGUgaGVhZFxuICAgIC8vICAgcG9pbnRlciBhcmUgb2xkIHBhcnRzLCBhbmQgdG8gdGhlIHJpZ2h0IG9mIHRoZSB0YWlsXG4gICAgLy8gICBwb2ludGVyIGFyZSBuZXcgcGFydHMuXG4gICAgLy9cbiAgICAvLyAqIFdlIGFsd2F5cyByZXN0YXJ0IGJhY2sgZnJvbSB0aGUgdG9wIG9mIHRoZSBhbGdvcml0aG0sXG4gICAgLy8gICBhbGxvd2luZyBtYXRjaGluZyBhbmQgc2ltcGxlIHVwZGF0ZXMgaW4gcGxhY2UgdG9cbiAgICAvLyAgIGNvbnRpbnVlLi4uXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IHRoZSBoZWFkIHBvaW50ZXJzIG9uY2UgYWdhaW4gbWF0Y2gsIHNvXG4gICAgLy8gICBzaW1wbHkgdXBkYXRlIHBhcnQgMSBhbmQgcmVjb3JkIGl0IGluIHRoZSBgbmV3UGFydHNgXG4gICAgLy8gICBhcnJheS4gIExhc3QsIGFkdmFuY2UgYm90aCBoZWFkIHBvaW50ZXJzLlxuICAgIC8vXG4gICAgLy8gICAgICAgICBvbGRIZWFkIHYgICAgICAgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAtLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFswLCAyLCAxLCAgLCAgLCAgLCA2XSA8LSBoZWFkcyBtYXRjaGVkOiB1cGRhdGUgMVxuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSAgICBhbmQgYWR2YW5jZSBib3RoIG9sZEhlYWRcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJiBuZXdIZWFkXG4gICAgLy8gICAgICAgICAgICBuZXdIZWFkIF4gICAgICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBBcyBtZW50aW9uZWQgYWJvdmUsIGl0ZW1zIHRoYXQgd2VyZSBtb3ZlZCBhcyBhIHJlc3VsdCBvZlxuICAgIC8vICAgYmVpbmcgc3R1Y2sgKHRoZSBmaW5hbCBlbHNlIGNsYXVzZSBpbiB0aGUgY29kZSBiZWxvdykgYXJlXG4gICAgLy8gICBtYXJrZWQgd2l0aCBudWxsLCBzbyB3ZSBhbHdheXMgYWR2YW5jZSBvbGQgcG9pbnRlcnMgb3ZlclxuICAgIC8vICAgdGhlc2Ugc28gd2UncmUgY29tcGFyaW5nIHRoZSBuZXh0IGFjdHVhbCBvbGQgdmFsdWUgb25cbiAgICAvLyAgIGVpdGhlciBlbmQuXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IGBvbGRIZWFkYCBpcyBudWxsIChhbHJlYWR5IHBsYWNlZCBpblxuICAgIC8vICAgbmV3UGFydHMpLCBzbyBhZHZhbmNlIGBvbGRIZWFkYC5cbiAgICAvL1xuICAgIC8vICAgICAgICAgICAgb2xkSGVhZCB2ICAgICB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgLSwgMywgNCwgNSwgNl0gPC0gb2xkIGhlYWQgYWxyZWFkeSB1c2VkOlxuICAgIC8vICAgbmV3UGFydHM6IFswLCAyLCAxLCAgLCAgLCAgLCA2XSAgICBhZHZhbmNlIG9sZEhlYWRcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl1cbiAgICAvLyAgICAgICAgICAgICAgIG5ld0hlYWQgXiAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIE5vdGUgaXQncyBub3QgY3JpdGljYWwgdG8gbWFyayBvbGQgcGFydHMgYXMgbnVsbCB3aGVuIHRoZXlcbiAgICAvLyAgIGFyZSBtb3ZlZCBmcm9tIGhlYWQgdG8gdGFpbCBvciB0YWlsIHRvIGhlYWQsIHNpbmNlIHRoZXlcbiAgICAvLyAgIHdpbGwgYmUgb3V0c2lkZSB0aGUgcG9pbnRlciByYW5nZSBhbmQgbmV2ZXIgdmlzaXRlZCBhZ2Fpbi5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogSGVyZSB0aGUgb2xkIHRhaWwga2V5IG1hdGNoZXMgdGhlIG5ldyBoZWFkXG4gICAgLy8gICBrZXksIHNvIHRoZSBwYXJ0IGF0IHRoZSBgb2xkVGFpbGAgcG9zaXRpb24gYW5kIG1vdmUgaXRzXG4gICAgLy8gICBET00gdG8gdGhlIG5ldyBoZWFkIHBvc2l0aW9uIChiZWZvcmUgYG9sZFBhcnRzW29sZEhlYWRdYCkuXG4gICAgLy8gICBMYXN0LCBhZHZhbmNlIGBvbGRUYWlsYCBhbmQgYG5ld0hlYWRgIHBvaW50ZXJzLlxuICAgIC8vXG4gICAgLy8gICAgICAgICAgICAgICBvbGRIZWFkIHYgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAtLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFswLCAyLCAxLCA0LCAgLCAgLCA2XSA8LSBvbGQgdGFpbCBtYXRjaGVzIG5ld1xuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSAgIGhlYWQ6IHVwZGF0ZSAmIG1vdmUgNCxcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZHZhbmNlIG9sZFRhaWwgJiBuZXdIZWFkXG4gICAgLy8gICAgICAgICAgICAgICBuZXdIZWFkIF4gICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBPbGQgYW5kIG5ldyBoZWFkIGtleXMgbWF0Y2gsIHNvIHVwZGF0ZSB0aGVcbiAgICAvLyAgIG9sZCBoZWFkIHBhcnQgaW4gcGxhY2UsIGFuZCBhZHZhbmNlIHRoZSBgb2xkSGVhZGAgYW5kXG4gICAgLy8gICBgbmV3SGVhZGAgcG9pbnRlcnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgICAgICAgIG9sZEhlYWQgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsIDQsIDMsICAgLDZdIDwtIGhlYWRzIG1hdGNoOiB1cGRhdGUgM1xuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSAgICBhbmQgYWR2YW5jZSBvbGRIZWFkICZcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3SGVhZFxuICAgIC8vICAgICAgICAgICAgICAgICAgbmV3SGVhZCBeICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogT25jZSB0aGUgbmV3IG9yIG9sZCBwb2ludGVycyBtb3ZlIHBhc3QgZWFjaCBvdGhlciB0aGVuIGFsbFxuICAgIC8vICAgd2UgaGF2ZSBsZWZ0IGlzIGFkZGl0aW9ucyAoaWYgb2xkIGxpc3QgZXhoYXVzdGVkKSBvclxuICAgIC8vICAgcmVtb3ZhbHMgKGlmIG5ldyBsaXN0IGV4aGF1c3RlZCkuIFRob3NlIGFyZSBoYW5kbGVkIGluIHRoZVxuICAgIC8vICAgZmluYWwgd2hpbGUgbG9vcHMgYXQgdGhlIGVuZC5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogYG9sZEhlYWRgIGV4Y2VlZGVkIGBvbGRUYWlsYCwgc28gd2UncmUgZG9uZVxuICAgIC8vICAgd2l0aCB0aGUgbWFpbiBsb29wLiAgQ3JlYXRlIHRoZSByZW1haW5pbmcgcGFydCBhbmQgaW5zZXJ0XG4gICAgLy8gICBpdCBhdCB0aGUgbmV3IGhlYWQgcG9zaXRpb24sIGFuZCB0aGUgdXBkYXRlIGlzIGNvbXBsZXRlLlxuICAgIC8vXG4gICAgLy8gICAgICAgICAgICAgICAgICAgKG9sZEhlYWQgPiBvbGRUYWlsKVxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAtLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFswLCAyLCAxLCA0LCAzLCA3ICw2XSA8LSBjcmVhdGUgYW5kIGluc2VydCA3XG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICBuZXdIZWFkIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBOb3RlIHRoYXQgdGhlIG9yZGVyIG9mIHRoZSBpZi9lbHNlIGNsYXVzZXMgaXMgbm90XG4gICAgLy8gICBpbXBvcnRhbnQgdG8gdGhlIGFsZ29yaXRobSwgYXMgbG9uZyBhcyB0aGUgbnVsbCBjaGVja3NcbiAgICAvLyAgIGNvbWUgZmlyc3QgKHRvIGVuc3VyZSB3ZSdyZSBhbHdheXMgd29ya2luZyBvbiB2YWxpZCBvbGRcbiAgICAvLyAgIHBhcnRzKSBhbmQgdGhhdCB0aGUgZmluYWwgZWxzZSBjbGF1c2UgY29tZXMgbGFzdCAoc2luY2VcbiAgICAvLyAgIHRoYXQncyB3aGVyZSB0aGUgZXhwZW5zaXZlIG1vdmVzIG9jY3VyKS4gVGhlIG9yZGVyIG9mXG4gICAgLy8gICByZW1haW5pbmcgY2xhdXNlcyBpcyBqdXN0IGEgc2ltcGxlIGd1ZXNzIGF0IHdoaWNoIGNhc2VzXG4gICAgLy8gICB3aWxsIGJlIG1vc3QgY29tbW9uLlxuICAgIC8vXG4gICAgLy8gKiBOb3RlLCB3ZSBjb3VsZCBjYWxjdWxhdGUgdGhlIGxvbmdlc3RcbiAgICAvLyAgIGluY3JlYXNpbmcgc3Vic2VxdWVuY2UgKExJUykgb2Ygb2xkIGl0ZW1zIGluIG5ldyBwb3NpdGlvbixcbiAgICAvLyAgIGFuZCBvbmx5IG1vdmUgdGhvc2Ugbm90IGluIHRoZSBMSVMgc2V0LiBIb3dldmVyIHRoYXQgY29zdHNcbiAgICAvLyAgIE8obmxvZ24pIHRpbWUgYW5kIGFkZHMgYSBiaXQgbW9yZSBjb2RlLCBhbmQgb25seSBoZWxwc1xuICAgIC8vICAgbWFrZSByYXJlIHR5cGVzIG9mIG11dGF0aW9ucyByZXF1aXJlIGZld2VyIG1vdmVzLiBUaGVcbiAgICAvLyAgIGFib3ZlIGhhbmRsZXMgcmVtb3ZlcywgYWRkcywgcmV2ZXJzYWwsIHN3YXBzLCBhbmQgc2luZ2xlXG4gICAgLy8gICBtb3ZlcyBvZiBjb250aWd1b3VzIGl0ZW1zIGluIGxpbmVhciB0aW1lLCBpbiB0aGUgbWluaW11bVxuICAgIC8vICAgbnVtYmVyIG9mIG1vdmVzLiBBcyB0aGUgbnVtYmVyIG9mIG11bHRpcGxlIG1vdmVzIHdoZXJlIExJU1xuICAgIC8vICAgbWlnaHQgaGVscCBhcHByb2FjaGVzIGEgcmFuZG9tIHNodWZmbGUsIHRoZSBMSVNcbiAgICAvLyAgIG9wdGltaXphdGlvbiBiZWNvbWVzIGxlc3MgaGVscGZ1bCwgc28gaXQgc2VlbXMgbm90IHdvcnRoXG4gICAgLy8gICB0aGUgY29kZSBhdCB0aGlzIHBvaW50LiBDb3VsZCByZWNvbnNpZGVyIGlmIGEgY29tcGVsbGluZ1xuICAgIC8vICAgY2FzZSBhcmlzZXMuXG5cbiAgICB3aGlsZSAob2xkSGVhZCA8PSBvbGRUYWlsICYmIG5ld0hlYWQgPD0gbmV3VGFpbCkge1xuICAgICAgaWYgKG9sZFBhcnRzW29sZEhlYWRdID09PSBudWxsKSB7XG4gICAgICAgIC8vIGBudWxsYCBtZWFucyBvbGQgcGFydCBhdCBoZWFkIGhhcyBhbHJlYWR5IGJlZW4gdXNlZFxuICAgICAgICAvLyBiZWxvdzsgc2tpcFxuICAgICAgICBvbGRIZWFkKys7XG4gICAgICB9IGVsc2UgaWYgKG9sZFBhcnRzW29sZFRhaWxdID09PSBudWxsKSB7XG4gICAgICAgIC8vIGBudWxsYCBtZWFucyBvbGQgcGFydCBhdCB0YWlsIGhhcyBhbHJlYWR5IGJlZW4gdXNlZFxuICAgICAgICAvLyBiZWxvdzsgc2tpcFxuICAgICAgICBvbGRUYWlsLS07XG4gICAgICB9IGVsc2UgaWYgKG9sZEtleXNbb2xkSGVhZF0gPT09IG5ld0tleXNbbmV3SGVhZF0pIHtcbiAgICAgICAgLy8gT2xkIGhlYWQgbWF0Y2hlcyBuZXcgaGVhZDsgdXBkYXRlIGluIHBsYWNlXG4gICAgICAgIG5ld1BhcnRzW25ld0hlYWRdID0gc2V0Q2hpbGRQYXJ0VmFsdWUoXG4gICAgICAgICAgb2xkUGFydHNbb2xkSGVhZF0hLFxuICAgICAgICAgIG5ld1ZhbHVlc1tuZXdIZWFkXVxuICAgICAgICApO1xuICAgICAgICBvbGRIZWFkKys7XG4gICAgICAgIG5ld0hlYWQrKztcbiAgICAgIH0gZWxzZSBpZiAob2xkS2V5c1tvbGRUYWlsXSA9PT0gbmV3S2V5c1tuZXdUYWlsXSkge1xuICAgICAgICAvLyBPbGQgdGFpbCBtYXRjaGVzIG5ldyB0YWlsOyB1cGRhdGUgaW4gcGxhY2VcbiAgICAgICAgbmV3UGFydHNbbmV3VGFpbF0gPSBzZXRDaGlsZFBhcnRWYWx1ZShcbiAgICAgICAgICBvbGRQYXJ0c1tvbGRUYWlsXSEsXG4gICAgICAgICAgbmV3VmFsdWVzW25ld1RhaWxdXG4gICAgICAgICk7XG4gICAgICAgIG9sZFRhaWwtLTtcbiAgICAgICAgbmV3VGFpbC0tO1xuICAgICAgfSBlbHNlIGlmIChvbGRLZXlzW29sZEhlYWRdID09PSBuZXdLZXlzW25ld1RhaWxdKSB7XG4gICAgICAgIC8vIE9sZCBoZWFkIG1hdGNoZXMgbmV3IHRhaWw7IHVwZGF0ZSBhbmQgbW92ZSB0byBuZXcgdGFpbFxuICAgICAgICBuZXdQYXJ0c1tuZXdUYWlsXSA9IHNldENoaWxkUGFydFZhbHVlKFxuICAgICAgICAgIG9sZFBhcnRzW29sZEhlYWRdISxcbiAgICAgICAgICBuZXdWYWx1ZXNbbmV3VGFpbF1cbiAgICAgICAgKTtcbiAgICAgICAgaW5zZXJ0UGFydChjb250YWluZXJQYXJ0LCBuZXdQYXJ0c1tuZXdUYWlsICsgMV0sIG9sZFBhcnRzW29sZEhlYWRdISk7XG4gICAgICAgIG9sZEhlYWQrKztcbiAgICAgICAgbmV3VGFpbC0tO1xuICAgICAgfSBlbHNlIGlmIChvbGRLZXlzW29sZFRhaWxdID09PSBuZXdLZXlzW25ld0hlYWRdKSB7XG4gICAgICAgIC8vIE9sZCB0YWlsIG1hdGNoZXMgbmV3IGhlYWQ7IHVwZGF0ZSBhbmQgbW92ZSB0byBuZXcgaGVhZFxuICAgICAgICBuZXdQYXJ0c1tuZXdIZWFkXSA9IHNldENoaWxkUGFydFZhbHVlKFxuICAgICAgICAgIG9sZFBhcnRzW29sZFRhaWxdISxcbiAgICAgICAgICBuZXdWYWx1ZXNbbmV3SGVhZF1cbiAgICAgICAgKTtcbiAgICAgICAgaW5zZXJ0UGFydChjb250YWluZXJQYXJ0LCBvbGRQYXJ0c1tvbGRIZWFkXSEsIG9sZFBhcnRzW29sZFRhaWxdISk7XG4gICAgICAgIG9sZFRhaWwtLTtcbiAgICAgICAgbmV3SGVhZCsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKG5ld0tleVRvSW5kZXhNYXAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIExhemlseSBnZW5lcmF0ZSBrZXktdG8taW5kZXggbWFwcywgdXNlZCBmb3IgcmVtb3ZhbHMgJlxuICAgICAgICAgIC8vIG1vdmVzIGJlbG93XG4gICAgICAgICAgbmV3S2V5VG9JbmRleE1hcCA9IGdlbmVyYXRlTWFwKG5ld0tleXMsIG5ld0hlYWQsIG5ld1RhaWwpO1xuICAgICAgICAgIG9sZEtleVRvSW5kZXhNYXAgPSBnZW5lcmF0ZU1hcChvbGRLZXlzLCBvbGRIZWFkLCBvbGRUYWlsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW5ld0tleVRvSW5kZXhNYXAuaGFzKG9sZEtleXNbb2xkSGVhZF0pKSB7XG4gICAgICAgICAgLy8gT2xkIGhlYWQgaXMgbm8gbG9uZ2VyIGluIG5ldyBsaXN0OyByZW1vdmVcbiAgICAgICAgICByZW1vdmVQYXJ0KG9sZFBhcnRzW29sZEhlYWRdISk7XG4gICAgICAgICAgb2xkSGVhZCsrO1xuICAgICAgICB9IGVsc2UgaWYgKCFuZXdLZXlUb0luZGV4TWFwLmhhcyhvbGRLZXlzW29sZFRhaWxdKSkge1xuICAgICAgICAgIC8vIE9sZCB0YWlsIGlzIG5vIGxvbmdlciBpbiBuZXcgbGlzdDsgcmVtb3ZlXG4gICAgICAgICAgcmVtb3ZlUGFydChvbGRQYXJ0c1tvbGRUYWlsXSEpO1xuICAgICAgICAgIG9sZFRhaWwtLTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBBbnkgbWlzbWF0Y2hlcyBhdCB0aGlzIHBvaW50IGFyZSBkdWUgdG8gYWRkaXRpb25zIG9yXG4gICAgICAgICAgLy8gbW92ZXM7IHNlZSBpZiB3ZSBoYXZlIGFuIG9sZCBwYXJ0IHdlIGNhbiByZXVzZSBhbmQgbW92ZVxuICAgICAgICAgIC8vIGludG8gcGxhY2VcbiAgICAgICAgICBjb25zdCBvbGRJbmRleCA9IG9sZEtleVRvSW5kZXhNYXAuZ2V0KG5ld0tleXNbbmV3SGVhZF0pO1xuICAgICAgICAgIGNvbnN0IG9sZFBhcnQgPSBvbGRJbmRleCAhPT0gdW5kZWZpbmVkID8gb2xkUGFydHNbb2xkSW5kZXhdIDogbnVsbDtcbiAgICAgICAgICBpZiAob2xkUGFydCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgLy8gTm8gb2xkIHBhcnQgZm9yIHRoaXMgdmFsdWU7IGNyZWF0ZSBhIG5ldyBvbmUgYW5kXG4gICAgICAgICAgICAvLyBpbnNlcnQgaXRcbiAgICAgICAgICAgIGNvbnN0IG5ld1BhcnQgPSBpbnNlcnRQYXJ0KGNvbnRhaW5lclBhcnQsIG9sZFBhcnRzW29sZEhlYWRdISk7XG4gICAgICAgICAgICBzZXRDaGlsZFBhcnRWYWx1ZShuZXdQYXJ0LCBuZXdWYWx1ZXNbbmV3SGVhZF0pO1xuICAgICAgICAgICAgbmV3UGFydHNbbmV3SGVhZF0gPSBuZXdQYXJ0O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBSZXVzZSBvbGQgcGFydFxuICAgICAgICAgICAgbmV3UGFydHNbbmV3SGVhZF0gPSBzZXRDaGlsZFBhcnRWYWx1ZShvbGRQYXJ0LCBuZXdWYWx1ZXNbbmV3SGVhZF0pO1xuICAgICAgICAgICAgaW5zZXJ0UGFydChjb250YWluZXJQYXJ0LCBvbGRQYXJ0c1tvbGRIZWFkXSEsIG9sZFBhcnQpO1xuICAgICAgICAgICAgLy8gVGhpcyBtYXJrcyB0aGUgb2xkIHBhcnQgYXMgaGF2aW5nIGJlZW4gdXNlZCwgc28gdGhhdFxuICAgICAgICAgICAgLy8gaXQgd2lsbCBiZSBza2lwcGVkIGluIHRoZSBmaXJzdCB0d28gY2hlY2tzIGFib3ZlXG4gICAgICAgICAgICBvbGRQYXJ0c1tvbGRJbmRleCBhcyBudW1iZXJdID0gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgbmV3SGVhZCsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEFkZCBwYXJ0cyBmb3IgYW55IHJlbWFpbmluZyBuZXcgdmFsdWVzXG4gICAgd2hpbGUgKG5ld0hlYWQgPD0gbmV3VGFpbCkge1xuICAgICAgLy8gRm9yIGFsbCByZW1haW5pbmcgYWRkaXRpb25zLCB3ZSBpbnNlcnQgYmVmb3JlIGxhc3QgbmV3XG4gICAgICAvLyB0YWlsLCBzaW5jZSBvbGQgcG9pbnRlcnMgYXJlIG5vIGxvbmdlciB2YWxpZFxuICAgICAgY29uc3QgbmV3UGFydCA9IGluc2VydFBhcnQoY29udGFpbmVyUGFydCwgbmV3UGFydHNbbmV3VGFpbCArIDFdKTtcbiAgICAgIHNldENoaWxkUGFydFZhbHVlKG5ld1BhcnQsIG5ld1ZhbHVlc1tuZXdIZWFkXSk7XG4gICAgICBuZXdQYXJ0c1tuZXdIZWFkKytdID0gbmV3UGFydDtcbiAgICB9XG4gICAgLy8gUmVtb3ZlIGFueSByZW1haW5pbmcgdW51c2VkIG9sZCBwYXJ0c1xuICAgIHdoaWxlIChvbGRIZWFkIDw9IG9sZFRhaWwpIHtcbiAgICAgIGNvbnN0IG9sZFBhcnQgPSBvbGRQYXJ0c1tvbGRIZWFkKytdO1xuICAgICAgaWYgKG9sZFBhcnQgIT09IG51bGwpIHtcbiAgICAgICAgcmVtb3ZlUGFydChvbGRQYXJ0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTYXZlIG9yZGVyIG9mIG5ldyBwYXJ0cyBmb3IgbmV4dCByb3VuZFxuICAgIHRoaXMuX2l0ZW1LZXlzID0gbmV3S2V5cztcbiAgICAvLyBEaXJlY3RseSBzZXQgcGFydCB2YWx1ZSwgYnlwYXNzaW5nIGl0J3MgZGlydHktY2hlY2tpbmdcbiAgICBzZXRDb21taXR0ZWRWYWx1ZShjb250YWluZXJQYXJ0LCBuZXdQYXJ0cyk7XG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVwZWF0RGlyZWN0aXZlRm4ge1xuICA8VD4oXG4gICAgaXRlbXM6IEl0ZXJhYmxlPFQ+LFxuICAgIGtleUZuT3JUZW1wbGF0ZTogS2V5Rm48VD4gfCBJdGVtVGVtcGxhdGU8VD4sXG4gICAgdGVtcGxhdGU/OiBJdGVtVGVtcGxhdGU8VD5cbiAgKTogdW5rbm93bjtcbiAgPFQ+KGl0ZW1zOiBJdGVyYWJsZTxUPiwgdGVtcGxhdGU6IEl0ZW1UZW1wbGF0ZTxUPik6IHVua25vd247XG4gIDxUPihcbiAgICBpdGVtczogSXRlcmFibGU8VD4sXG4gICAga2V5Rm46IEtleUZuPFQ+IHwgSXRlbVRlbXBsYXRlPFQ+LFxuICAgIHRlbXBsYXRlOiBJdGVtVGVtcGxhdGU8VD5cbiAgKTogdW5rbm93bjtcbn1cblxuLyoqXG4gKiBBIGRpcmVjdGl2ZSB0aGF0IHJlcGVhdHMgYSBzZXJpZXMgb2YgdmFsdWVzICh1c3VhbGx5IGBUZW1wbGF0ZVJlc3VsdHNgKVxuICogZ2VuZXJhdGVkIGZyb20gYW4gaXRlcmFibGUsIGFuZCB1cGRhdGVzIHRob3NlIGl0ZW1zIGVmZmljaWVudGx5IHdoZW4gdGhlXG4gKiBpdGVyYWJsZSBjaGFuZ2VzIGJhc2VkIG9uIHVzZXItcHJvdmlkZWQgYGtleXNgIGFzc29jaWF0ZWQgd2l0aCBlYWNoIGl0ZW0uXG4gKlxuICogTm90ZSB0aGF0IGlmIGEgYGtleUZuYCBpcyBwcm92aWRlZCwgc3RyaWN0IGtleS10by1ET00gbWFwcGluZyBpcyBtYWludGFpbmVkLFxuICogbWVhbmluZyBwcmV2aW91cyBET00gZm9yIGEgZ2l2ZW4ga2V5IGlzIG1vdmVkIGludG8gdGhlIG5ldyBwb3NpdGlvbiBpZlxuICogbmVlZGVkLCBhbmQgRE9NIHdpbGwgbmV2ZXIgYmUgcmV1c2VkIHdpdGggdmFsdWVzIGZvciBkaWZmZXJlbnQga2V5cyAobmV3IERPTVxuICogd2lsbCBhbHdheXMgYmUgY3JlYXRlZCBmb3IgbmV3IGtleXMpLiBUaGlzIGlzIGdlbmVyYWxseSB0aGUgbW9zdCBlZmZpY2llbnRcbiAqIHdheSB0byB1c2UgYHJlcGVhdGAgc2luY2UgaXQgcGVyZm9ybXMgbWluaW11bSB1bm5lY2Vzc2FyeSB3b3JrIGZvciBpbnNlcnRpb25zXG4gKiBhbmQgcmVtb3ZhbHMuXG4gKlxuICogVGhlIGBrZXlGbmAgdGFrZXMgdHdvIHBhcmFtZXRlcnMsIHRoZSBpdGVtIGFuZCBpdHMgaW5kZXgsIGFuZCByZXR1cm5zIGEgdW5pcXVlIGtleSB2YWx1ZS5cbiAqXG4gKiBgYGBqc1xuICogaHRtbGBcbiAqICAgPG9sPlxuICogICAgICR7cmVwZWF0KHRoaXMuaXRlbXMsIChpdGVtKSA9PiBpdGVtLmlkLCAoaXRlbSwgaW5kZXgpID0+IHtcbiAqICAgICAgIHJldHVybiBodG1sYDxsaT4ke2luZGV4fTogJHtpdGVtLm5hbWV9PC9saT5gO1xuICogICAgIH0pfVxuICogICA8L29sPlxuICogYFxuICogYGBgXG4gKlxuICogKipJbXBvcnRhbnQqKjogSWYgcHJvdmlkaW5nIGEgYGtleUZuYCwga2V5cyAqbXVzdCogYmUgdW5pcXVlIGZvciBhbGwgaXRlbXMgaW4gYVxuICogZ2l2ZW4gY2FsbCB0byBgcmVwZWF0YC4gVGhlIGJlaGF2aW9yIHdoZW4gdHdvIG9yIG1vcmUgaXRlbXMgaGF2ZSB0aGUgc2FtZSBrZXlcbiAqIGlzIHVuZGVmaW5lZC5cbiAqXG4gKiBJZiBubyBga2V5Rm5gIGlzIHByb3ZpZGVkLCB0aGlzIGRpcmVjdGl2ZSB3aWxsIHBlcmZvcm0gc2ltaWxhciB0byBtYXBwaW5nXG4gKiBpdGVtcyB0byB2YWx1ZXMsIGFuZCBET00gd2lsbCBiZSByZXVzZWQgYWdhaW5zdCBwb3RlbnRpYWxseSBkaWZmZXJlbnQgaXRlbXMuXG4gKi9cbmV4cG9ydCBjb25zdCByZXBlYXQgPSBkaXJlY3RpdmUoUmVwZWF0RGlyZWN0aXZlKSBhcyBSZXBlYXREaXJlY3RpdmVGbjtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtSZXBlYXREaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTggR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7QXR0cmlidXRlUGFydCwgbm9DaGFuZ2V9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7XG4gIGRpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlLFxuICBEaXJlY3RpdmVQYXJhbWV0ZXJzLFxuICBQYXJ0SW5mbyxcbiAgUGFydFR5cGUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5cbi8qKlxuICogQSBrZXktdmFsdWUgc2V0IG9mIENTUyBwcm9wZXJ0aWVzIGFuZCB2YWx1ZXMuXG4gKlxuICogVGhlIGtleSBzaG91bGQgYmUgZWl0aGVyIGEgdmFsaWQgQ1NTIHByb3BlcnR5IG5hbWUgc3RyaW5nLCBsaWtlXG4gKiBgJ2JhY2tncm91bmQtY29sb3InYCwgb3IgYSB2YWxpZCBKYXZhU2NyaXB0IGNhbWVsIGNhc2UgcHJvcGVydHkgbmFtZVxuICogZm9yIENTU1N0eWxlRGVjbGFyYXRpb24gbGlrZSBgYmFja2dyb3VuZENvbG9yYC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTdHlsZUluZm8ge1xuICBbbmFtZTogc3RyaW5nXTogc3RyaW5nIHwgbnVtYmVyIHwgdW5kZWZpbmVkIHwgbnVsbDtcbn1cblxuY29uc3QgaW1wb3J0YW50ID0gJ2ltcG9ydGFudCc7XG4vLyBUaGUgbGVhZGluZyBzcGFjZSBpcyBpbXBvcnRhbnRcbmNvbnN0IGltcG9ydGFudEZsYWcgPSAnICEnICsgaW1wb3J0YW50O1xuLy8gSG93IG1hbnkgY2hhcmFjdGVycyB0byByZW1vdmUgZnJvbSBhIHZhbHVlLCBhcyBhIG5lZ2F0aXZlIG51bWJlclxuY29uc3QgZmxhZ1RyaW0gPSAwIC0gaW1wb3J0YW50RmxhZy5sZW5ndGg7XG5cbmNsYXNzIFN0eWxlTWFwRGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgcHJpdmF0ZSBfcHJldmlvdXNTdHlsZVByb3BlcnRpZXM/OiBTZXQ8c3RyaW5nPjtcblxuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gICAgaWYgKFxuICAgICAgcGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQVRUUklCVVRFIHx8XG4gICAgICBwYXJ0SW5mby5uYW1lICE9PSAnc3R5bGUnIHx8XG4gICAgICAocGFydEluZm8uc3RyaW5ncz8ubGVuZ3RoIGFzIG51bWJlcikgPiAyXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdUaGUgYHN0eWxlTWFwYCBkaXJlY3RpdmUgbXVzdCBiZSB1c2VkIGluIHRoZSBgc3R5bGVgIGF0dHJpYnV0ZSAnICtcbiAgICAgICAgICAnYW5kIG11c3QgYmUgdGhlIG9ubHkgcGFydCBpbiB0aGUgYXR0cmlidXRlLidcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcmVuZGVyKHN0eWxlSW5mbzogUmVhZG9ubHk8U3R5bGVJbmZvPikge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhzdHlsZUluZm8pLnJlZHVjZSgoc3R5bGUsIHByb3ApID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gc3R5bGVJbmZvW3Byb3BdO1xuICAgICAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHN0eWxlO1xuICAgICAgfVxuICAgICAgLy8gQ29udmVydCBwcm9wZXJ0eSBuYW1lcyBmcm9tIGNhbWVsLWNhc2UgdG8gZGFzaC1jYXNlLCBpLmUuOlxuICAgICAgLy8gIGBiYWNrZ3JvdW5kQ29sb3JgIC0+IGBiYWNrZ3JvdW5kLWNvbG9yYFxuICAgICAgLy8gVmVuZG9yLXByZWZpeGVkIG5hbWVzIG5lZWQgYW4gZXh0cmEgYC1gIGFwcGVuZGVkIHRvIGZyb250OlxuICAgICAgLy8gIGB3ZWJraXRBcHBlYXJhbmNlYCAtPiBgLXdlYmtpdC1hcHBlYXJhbmNlYFxuICAgICAgLy8gRXhjZXB0aW9uIGlzIGFueSBwcm9wZXJ0eSBuYW1lIGNvbnRhaW5pbmcgYSBkYXNoLCBpbmNsdWRpbmdcbiAgICAgIC8vIGN1c3RvbSBwcm9wZXJ0aWVzOyB3ZSBhc3N1bWUgdGhlc2UgYXJlIGFscmVhZHkgZGFzaC1jYXNlZCBpLmUuOlxuICAgICAgLy8gIGAtLW15LWJ1dHRvbi1jb2xvcmAgLS0+IGAtLW15LWJ1dHRvbi1jb2xvcmBcbiAgICAgIHByb3AgPSBwcm9wLmluY2x1ZGVzKCctJylcbiAgICAgICAgPyBwcm9wXG4gICAgICAgIDogcHJvcFxuICAgICAgICAgICAgLnJlcGxhY2UoLyg/Ol4od2Via2l0fG1venxtc3xvKXwpKD89W0EtWl0pL2csICctJCYnKVxuICAgICAgICAgICAgLnRvTG93ZXJDYXNlKCk7XG4gICAgICByZXR1cm4gc3R5bGUgKyBgJHtwcm9wfToke3ZhbHVlfTtgO1xuICAgIH0sICcnKTtcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShwYXJ0OiBBdHRyaWJ1dGVQYXJ0LCBbc3R5bGVJbmZvXTogRGlyZWN0aXZlUGFyYW1ldGVyczx0aGlzPikge1xuICAgIGNvbnN0IHtzdHlsZX0gPSBwYXJ0LmVsZW1lbnQgYXMgSFRNTEVsZW1lbnQ7XG5cbiAgICBpZiAodGhpcy5fcHJldmlvdXNTdHlsZVByb3BlcnRpZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fcHJldmlvdXNTdHlsZVByb3BlcnRpZXMgPSBuZXcgU2V0KE9iamVjdC5rZXlzKHN0eWxlSW5mbykpO1xuICAgICAgcmV0dXJuIHRoaXMucmVuZGVyKHN0eWxlSW5mbyk7XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIG9sZCBwcm9wZXJ0aWVzIHRoYXQgbm8gbG9uZ2VyIGV4aXN0IGluIHN0eWxlSW5mb1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiB0aGlzLl9wcmV2aW91c1N0eWxlUHJvcGVydGllcykge1xuICAgICAgLy8gSWYgdGhlIG5hbWUgaXNuJ3QgaW4gc3R5bGVJbmZvIG9yIGl0J3MgbnVsbC91bmRlZmluZWRcbiAgICAgIGlmIChzdHlsZUluZm9bbmFtZV0gPT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9wcmV2aW91c1N0eWxlUHJvcGVydGllcyEuZGVsZXRlKG5hbWUpO1xuICAgICAgICBpZiAobmFtZS5pbmNsdWRlcygnLScpKSB7XG4gICAgICAgICAgc3R5bGUucmVtb3ZlUHJvcGVydHkobmFtZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgICAgICAoc3R5bGUgYXMgYW55KVtuYW1lXSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBZGQgb3IgdXBkYXRlIHByb3BlcnRpZXNcbiAgICBmb3IgKGNvbnN0IG5hbWUgaW4gc3R5bGVJbmZvKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHN0eWxlSW5mb1tuYW1lXTtcbiAgICAgIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzLmFkZChuYW1lKTtcbiAgICAgICAgY29uc3QgaXNJbXBvcnRhbnQgPVxuICAgICAgICAgIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgJiYgdmFsdWUuZW5kc1dpdGgoaW1wb3J0YW50RmxhZyk7XG4gICAgICAgIGlmIChuYW1lLmluY2x1ZGVzKCctJykgfHwgaXNJbXBvcnRhbnQpIHtcbiAgICAgICAgICBzdHlsZS5zZXRQcm9wZXJ0eShcbiAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICBpc0ltcG9ydGFudFxuICAgICAgICAgICAgICA/ICh2YWx1ZSBhcyBzdHJpbmcpLnNsaWNlKDAsIGZsYWdUcmltKVxuICAgICAgICAgICAgICA6ICh2YWx1ZSBhcyBzdHJpbmcpLFxuICAgICAgICAgICAgaXNJbXBvcnRhbnQgPyBpbXBvcnRhbnQgOiAnJ1xuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgICAgICAoc3R5bGUgYXMgYW55KVtuYW1lXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBub0NoYW5nZTtcbiAgfVxufVxuXG4vKipcbiAqIEEgZGlyZWN0aXZlIHRoYXQgYXBwbGllcyBDU1MgcHJvcGVydGllcyB0byBhbiBlbGVtZW50LlxuICpcbiAqIGBzdHlsZU1hcGAgY2FuIG9ubHkgYmUgdXNlZCBpbiB0aGUgYHN0eWxlYCBhdHRyaWJ1dGUgYW5kIG11c3QgYmUgdGhlIG9ubHlcbiAqIGV4cHJlc3Npb24gaW4gdGhlIGF0dHJpYnV0ZS4gSXQgdGFrZXMgdGhlIHByb3BlcnR5IG5hbWVzIGluIHRoZVxuICoge0BsaW5rIFN0eWxlSW5mbyBzdHlsZUluZm99IG9iamVjdCBhbmQgYWRkcyB0aGUgcHJvcGVydGllcyB0byB0aGUgaW5saW5lXG4gKiBzdHlsZSBvZiB0aGUgZWxlbWVudC5cbiAqXG4gKiBQcm9wZXJ0eSBuYW1lcyB3aXRoIGRhc2hlcyAoYC1gKSBhcmUgYXNzdW1lZCB0byBiZSB2YWxpZCBDU1NcbiAqIHByb3BlcnR5IG5hbWVzIGFuZCBzZXQgb24gdGhlIGVsZW1lbnQncyBzdHlsZSBvYmplY3QgdXNpbmcgYHNldFByb3BlcnR5KClgLlxuICogTmFtZXMgd2l0aG91dCBkYXNoZXMgYXJlIGFzc3VtZWQgdG8gYmUgY2FtZWxDYXNlZCBKYXZhU2NyaXB0IHByb3BlcnR5IG5hbWVzXG4gKiBhbmQgc2V0IG9uIHRoZSBlbGVtZW50J3Mgc3R5bGUgb2JqZWN0IHVzaW5nIHByb3BlcnR5IGFzc2lnbm1lbnQsIGFsbG93aW5nIHRoZVxuICogc3R5bGUgb2JqZWN0IHRvIHRyYW5zbGF0ZSBKYXZhU2NyaXB0LXN0eWxlIG5hbWVzIHRvIENTUyBwcm9wZXJ0eSBuYW1lcy5cbiAqXG4gKiBGb3IgZXhhbXBsZSBgc3R5bGVNYXAoe2JhY2tncm91bmRDb2xvcjogJ3JlZCcsICdib3JkZXItdG9wJzogJzVweCcsICctLXNpemUnOlxuICogJzAnfSlgIHNldHMgdGhlIGBiYWNrZ3JvdW5kLWNvbG9yYCwgYGJvcmRlci10b3BgIGFuZCBgLS1zaXplYCBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSBzdHlsZUluZm9cbiAqIEBzZWUge0BsaW5rIGh0dHBzOi8vbGl0LmRldi9kb2NzL3RlbXBsYXRlcy9kaXJlY3RpdmVzLyNzdHlsZW1hcCBzdHlsZU1hcCBjb2RlIHNhbXBsZXMgb24gTGl0LmRldn1cbiAqL1xuZXhwb3J0IGNvbnN0IHN0eWxlTWFwID0gZGlyZWN0aXZlKFN0eWxlTWFwRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtTdHlsZU1hcERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIERpcmVjdGl2ZSwgUGFydEluZm8sIFBhcnRUeXBlfSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuXG5jbGFzcyBUZW1wbGF0ZUNvbnRlbnREaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBwcml2YXRlIF9wcmV2aW91c1RlbXBsYXRlPzogSFRNTFRlbXBsYXRlRWxlbWVudDtcblxuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gICAgaWYgKHBhcnRJbmZvLnR5cGUgIT09IFBhcnRUeXBlLkNISUxEKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3RlbXBsYXRlQ29udGVudCBjYW4gb25seSBiZSB1c2VkIGluIGNoaWxkIGJpbmRpbmdzJyk7XG4gICAgfVxuICB9XG5cbiAgcmVuZGVyKHRlbXBsYXRlOiBIVE1MVGVtcGxhdGVFbGVtZW50KSB7XG4gICAgaWYgKHRoaXMuX3ByZXZpb3VzVGVtcGxhdGUgPT09IHRlbXBsYXRlKSB7XG4gICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgfVxuICAgIHRoaXMuX3ByZXZpb3VzVGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgICByZXR1cm4gZG9jdW1lbnQuaW1wb3J0Tm9kZSh0ZW1wbGF0ZS5jb250ZW50LCB0cnVlKTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbmRlcnMgdGhlIGNvbnRlbnQgb2YgYSB0ZW1wbGF0ZSBlbGVtZW50IGFzIEhUTUwuXG4gKlxuICogTm90ZSwgdGhlIHRlbXBsYXRlIHNob3VsZCBiZSBkZXZlbG9wZXIgY29udHJvbGxlZCBhbmQgbm90IHVzZXIgY29udHJvbGxlZC5cbiAqIFJlbmRlcmluZyBhIHVzZXItY29udHJvbGxlZCB0ZW1wbGF0ZSB3aXRoIHRoaXMgZGlyZWN0aXZlXG4gKiBjb3VsZCBsZWFkIHRvIGNyb3NzLXNpdGUtc2NyaXB0aW5nIHZ1bG5lcmFiaWxpdGllcy5cbiAqL1xuZXhwb3J0IGNvbnN0IHRlbXBsYXRlQ29udGVudCA9IGRpcmVjdGl2ZShUZW1wbGF0ZUNvbnRlbnREaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge1RlbXBsYXRlQ29udGVudERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtub3RoaW5nLCBUZW1wbGF0ZVJlc3VsdCwgbm9DaGFuZ2V9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7ZGlyZWN0aXZlLCBEaXJlY3RpdmUsIFBhcnRJbmZvLCBQYXJ0VHlwZX0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcblxuY29uc3QgSFRNTF9SRVNVTFQgPSAxO1xuXG5leHBvcnQgY2xhc3MgVW5zYWZlSFRNTERpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIHN0YXRpYyBkaXJlY3RpdmVOYW1lID0gJ3Vuc2FmZUhUTUwnO1xuICBzdGF0aWMgcmVzdWx0VHlwZSA9IEhUTUxfUkVTVUxUO1xuXG4gIHByaXZhdGUgX3ZhbHVlOiB1bmtub3duID0gbm90aGluZztcbiAgcHJpdmF0ZSBfdGVtcGxhdGVSZXN1bHQ/OiBUZW1wbGF0ZVJlc3VsdDtcblxuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gICAgaWYgKHBhcnRJbmZvLnR5cGUgIT09IFBhcnRUeXBlLkNISUxEKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGAke1xuICAgICAgICAgICh0aGlzLmNvbnN0cnVjdG9yIGFzIHR5cGVvZiBVbnNhZmVIVE1MRGlyZWN0aXZlKS5kaXJlY3RpdmVOYW1lXG4gICAgICAgIH0oKSBjYW4gb25seSBiZSB1c2VkIGluIGNoaWxkIGJpbmRpbmdzYFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXIodmFsdWU6IHN0cmluZyB8IHR5cGVvZiBub3RoaW5nIHwgdHlwZW9mIG5vQ2hhbmdlIHwgdW5kZWZpbmVkIHwgbnVsbCkge1xuICAgIGlmICh2YWx1ZSA9PT0gbm90aGluZyB8fCB2YWx1ZSA9PSBudWxsKSB7XG4gICAgICB0aGlzLl90ZW1wbGF0ZVJlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICAgIHJldHVybiAodGhpcy5fdmFsdWUgPSB2YWx1ZSk7XG4gICAgfVxuICAgIGlmICh2YWx1ZSA9PT0gbm9DaGFuZ2UpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgJHtcbiAgICAgICAgICAodGhpcy5jb25zdHJ1Y3RvciBhcyB0eXBlb2YgVW5zYWZlSFRNTERpcmVjdGl2ZSkuZGlyZWN0aXZlTmFtZVxuICAgICAgICB9KCkgY2FsbGVkIHdpdGggYSBub24tc3RyaW5nIHZhbHVlYFxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlID09PSB0aGlzLl92YWx1ZSkge1xuICAgICAgcmV0dXJuIHRoaXMuX3RlbXBsYXRlUmVzdWx0O1xuICAgIH1cbiAgICB0aGlzLl92YWx1ZSA9IHZhbHVlO1xuICAgIGNvbnN0IHN0cmluZ3MgPSBbdmFsdWVdIGFzIHVua25vd24gYXMgVGVtcGxhdGVTdHJpbmdzQXJyYXk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAoc3RyaW5ncyBhcyBhbnkpLnJhdyA9IHN0cmluZ3M7XG4gICAgLy8gV0FSTklORzogaW1wZXJzb25hdGluZyBhIFRlbXBsYXRlUmVzdWx0IGxpa2UgdGhpcyBpcyBleHRyZW1lbHlcbiAgICAvLyBkYW5nZXJvdXMuIFRoaXJkLXBhcnR5IGRpcmVjdGl2ZXMgc2hvdWxkIG5vdCBkbyB0aGlzLlxuICAgIHJldHVybiAodGhpcy5fdGVtcGxhdGVSZXN1bHQgPSB7XG4gICAgICAvLyBDYXN0IHRvIGEga25vd24gc2V0IG9mIGludGVnZXJzIHRoYXQgc2F0aXNmeSBSZXN1bHRUeXBlIHNvIHRoYXQgd2VcbiAgICAgIC8vIGRvbid0IGhhdmUgdG8gZXhwb3J0IFJlc3VsdFR5cGUgYW5kIHBvc3NpYmx5IGVuY291cmFnZSB0aGlzIHBhdHRlcm4uXG4gICAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgICAgWydfJGxpdFR5cGUkJ106ICh0aGlzLmNvbnN0cnVjdG9yIGFzIHR5cGVvZiBVbnNhZmVIVE1MRGlyZWN0aXZlKVxuICAgICAgICAucmVzdWx0VHlwZSBhcyAxIHwgMixcbiAgICAgIHN0cmluZ3MsXG4gICAgICB2YWx1ZXM6IFtdLFxuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogUmVuZGVycyB0aGUgcmVzdWx0IGFzIEhUTUwsIHJhdGhlciB0aGFuIHRleHQuXG4gKlxuICogVGhlIHZhbHVlcyBgdW5kZWZpbmVkYCwgYG51bGxgLCBhbmQgYG5vdGhpbmdgLCB3aWxsIGFsbCByZXN1bHQgaW4gbm8gY29udGVudFxuICogKGVtcHR5IHN0cmluZykgYmVpbmcgcmVuZGVyZWQuXG4gKlxuICogTm90ZSwgdGhpcyBpcyB1bnNhZmUgdG8gdXNlIHdpdGggYW55IHVzZXItcHJvdmlkZWQgaW5wdXQgdGhhdCBoYXNuJ3QgYmVlblxuICogc2FuaXRpemVkIG9yIGVzY2FwZWQsIGFzIGl0IG1heSBsZWFkIHRvIGNyb3NzLXNpdGUtc2NyaXB0aW5nXG4gKiB2dWxuZXJhYmlsaXRpZXMuXG4gKi9cbmV4cG9ydCBjb25zdCB1bnNhZmVIVE1MID0gZGlyZWN0aXZlKFVuc2FmZUhUTUxEaXJlY3RpdmUpO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7ZGlyZWN0aXZlfSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtVbnNhZmVIVE1MRGlyZWN0aXZlfSBmcm9tICcuL3Vuc2FmZS1odG1sLmpzJztcblxuY29uc3QgU1ZHX1JFU1VMVCA9IDI7XG5cbmNsYXNzIFVuc2FmZVNWR0RpcmVjdGl2ZSBleHRlbmRzIFVuc2FmZUhUTUxEaXJlY3RpdmUge1xuICBzdGF0aWMgb3ZlcnJpZGUgZGlyZWN0aXZlTmFtZSA9ICd1bnNhZmVTVkcnO1xuICBzdGF0aWMgb3ZlcnJpZGUgcmVzdWx0VHlwZSA9IFNWR19SRVNVTFQ7XG59XG5cbi8qKlxuICogUmVuZGVycyB0aGUgcmVzdWx0IGFzIFNWRywgcmF0aGVyIHRoYW4gdGV4dC5cbiAqXG4gKiBUaGUgdmFsdWVzIGB1bmRlZmluZWRgLCBgbnVsbGAsIGFuZCBgbm90aGluZ2AsIHdpbGwgYWxsIHJlc3VsdCBpbiBubyBjb250ZW50XG4gKiAoZW1wdHkgc3RyaW5nKSBiZWluZyByZW5kZXJlZC5cbiAqXG4gKiBOb3RlLCB0aGlzIGlzIHVuc2FmZSB0byB1c2Ugd2l0aCBhbnkgdXNlci1wcm92aWRlZCBpbnB1dCB0aGF0IGhhc24ndCBiZWVuXG4gKiBzYW5pdGl6ZWQgb3IgZXNjYXBlZCwgYXMgaXQgbWF5IGxlYWQgdG8gY3Jvc3Mtc2l0ZS1zY3JpcHRpbmdcbiAqIHZ1bG5lcmFiaWxpdGllcy5cbiAqL1xuZXhwb3J0IGNvbnN0IHVuc2FmZVNWRyA9IGRpcmVjdGl2ZShVbnNhZmVTVkdEaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge1Vuc2FmZVNWR0RpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtQYXJ0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtpc1ByaW1pdGl2ZX0gZnJvbSAnLi4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIEFzeW5jRGlyZWN0aXZlfSBmcm9tICcuLi9hc3luYy1kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtQYXVzZXIsIFBzZXVkb1dlYWtSZWZ9IGZyb20gJy4vcHJpdmF0ZS1hc3luYy1oZWxwZXJzLmpzJztcblxuY29uc3QgaXNQcm9taXNlID0gKHg6IHVua25vd24pID0+IHtcbiAgcmV0dXJuICFpc1ByaW1pdGl2ZSh4KSAmJiB0eXBlb2YgKHggYXMge3RoZW4/OiB1bmtub3dufSkudGhlbiA9PT0gJ2Z1bmN0aW9uJztcbn07XG4vLyBFZmZlY3RpdmVseSBpbmZpbml0eSwgYnV0IGEgU01JLlxuY29uc3QgX2luZmluaXR5ID0gMHgzZmZmZmZmZjtcblxuZXhwb3J0IGNsYXNzIFVudGlsRGlyZWN0aXZlIGV4dGVuZHMgQXN5bmNEaXJlY3RpdmUge1xuICBwcml2YXRlIF9fbGFzdFJlbmRlcmVkSW5kZXg6IG51bWJlciA9IF9pbmZpbml0eTtcbiAgcHJpdmF0ZSBfX3ZhbHVlczogdW5rbm93bltdID0gW107XG4gIHByaXZhdGUgX193ZWFrVGhpcyA9IG5ldyBQc2V1ZG9XZWFrUmVmKHRoaXMpO1xuICBwcml2YXRlIF9fcGF1c2VyID0gbmV3IFBhdXNlcigpO1xuXG4gIHJlbmRlciguLi5hcmdzOiBBcnJheTx1bmtub3duPik6IHVua25vd24ge1xuICAgIHJldHVybiBhcmdzLmZpbmQoKHgpID0+ICFpc1Byb21pc2UoeCkpID8/IG5vQ2hhbmdlO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKF9wYXJ0OiBQYXJ0LCBhcmdzOiBBcnJheTx1bmtub3duPikge1xuICAgIGNvbnN0IHByZXZpb3VzVmFsdWVzID0gdGhpcy5fX3ZhbHVlcztcbiAgICBsZXQgcHJldmlvdXNMZW5ndGggPSBwcmV2aW91c1ZhbHVlcy5sZW5ndGg7XG4gICAgdGhpcy5fX3ZhbHVlcyA9IGFyZ3M7XG5cbiAgICBjb25zdCB3ZWFrVGhpcyA9IHRoaXMuX193ZWFrVGhpcztcbiAgICBjb25zdCBwYXVzZXIgPSB0aGlzLl9fcGF1c2VyO1xuXG4gICAgLy8gSWYgb3VyIGluaXRpYWwgcmVuZGVyIG9jY3VycyB3aGlsZSBkaXNjb25uZWN0ZWQsIGVuc3VyZSB0aGF0IHRoZSBwYXVzZXJcbiAgICAvLyBhbmQgd2Vha1RoaXMgYXJlIGluIHRoZSBkaXNjb25uZWN0ZWQgc3RhdGVcbiAgICBpZiAoIXRoaXMuaXNDb25uZWN0ZWQpIHtcbiAgICAgIHRoaXMuZGlzY29ubmVjdGVkKCk7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAvLyBJZiB3ZSd2ZSByZW5kZXJlZCBhIGhpZ2hlci1wcmlvcml0eSB2YWx1ZSBhbHJlYWR5LCBzdG9wLlxuICAgICAgaWYgKGkgPiB0aGlzLl9fbGFzdFJlbmRlcmVkSW5kZXgpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHZhbHVlID0gYXJnc1tpXTtcblxuICAgICAgLy8gUmVuZGVyIG5vbi1Qcm9taXNlIHZhbHVlcyBpbW1lZGlhdGVseVxuICAgICAgaWYgKCFpc1Byb21pc2UodmFsdWUpKSB7XG4gICAgICAgIHRoaXMuX19sYXN0UmVuZGVyZWRJbmRleCA9IGk7XG4gICAgICAgIC8vIFNpbmNlIGEgbG93ZXItcHJpb3JpdHkgdmFsdWUgd2lsbCBuZXZlciBvdmVyd3JpdGUgYSBoaWdoZXItcHJpb3JpdHlcbiAgICAgICAgLy8gc3luY2hyb25vdXMgdmFsdWUsIHdlIGNhbiBzdG9wIHByb2Nlc3Npbmcgbm93LlxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoaXMgaXMgYSBQcm9taXNlIHdlJ3ZlIGFscmVhZHkgaGFuZGxlZCwgc2tpcCBpdC5cbiAgICAgIGlmIChpIDwgcHJldmlvdXNMZW5ndGggJiYgdmFsdWUgPT09IHByZXZpb3VzVmFsdWVzW2ldKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBXZSBoYXZlIGEgUHJvbWlzZSB0aGF0IHdlIGhhdmVuJ3Qgc2VlbiBiZWZvcmUsIHNvIHByaW9yaXRpZXMgbWF5IGhhdmVcbiAgICAgIC8vIGNoYW5nZWQuIEZvcmdldCB3aGF0IHdlIHJlbmRlcmVkIGJlZm9yZS5cbiAgICAgIHRoaXMuX19sYXN0UmVuZGVyZWRJbmRleCA9IF9pbmZpbml0eTtcbiAgICAgIHByZXZpb3VzTGVuZ3RoID0gMDtcblxuICAgICAgLy8gTm90ZSwgdGhlIGNhbGxiYWNrIGF2b2lkcyBjbG9zaW5nIG92ZXIgYHRoaXNgIHNvIHRoYXQgdGhlIGRpcmVjdGl2ZVxuICAgICAgLy8gY2FuIGJlIGdjJ2VkIGJlZm9yZSB0aGUgcHJvbWlzZSByZXNvbHZlczsgaW5zdGVhZCBgdGhpc2AgaXMgcmV0cmlldmVkXG4gICAgICAvLyBmcm9tIGB3ZWFrVGhpc2AsIHdoaWNoIGNhbiBicmVhayB0aGUgaGFyZCByZWZlcmVuY2UgaW4gdGhlIGNsb3N1cmUgd2hlblxuICAgICAgLy8gdGhlIGRpcmVjdGl2ZSBkaXNjb25uZWN0c1xuICAgICAgUHJvbWlzZS5yZXNvbHZlKHZhbHVlKS50aGVuKGFzeW5jIChyZXN1bHQ6IHVua25vd24pID0+IHtcbiAgICAgICAgLy8gSWYgd2UncmUgZGlzY29ubmVjdGVkLCB3YWl0IHVudGlsIHdlJ3JlIChtYXliZSkgcmVjb25uZWN0ZWRcbiAgICAgICAgLy8gVGhlIHdoaWxlIGxvb3AgaGVyZSBoYW5kbGVzIHRoZSBjYXNlIHRoYXQgdGhlIGNvbm5lY3Rpb24gc3RhdGVcbiAgICAgICAgLy8gdGhyYXNoZXMsIGNhdXNpbmcgdGhlIHBhdXNlciB0byByZXN1bWUgYW5kIHRoZW4gZ2V0IHJlLXBhdXNlZFxuICAgICAgICB3aGlsZSAocGF1c2VyLmdldCgpKSB7XG4gICAgICAgICAgYXdhaXQgcGF1c2VyLmdldCgpO1xuICAgICAgICB9XG4gICAgICAgIC8vIElmIHRoZSBjYWxsYmFjayBnZXRzIGhlcmUgYW5kIHRoZXJlIGlzIG5vIGB0aGlzYCwgaXQgbWVhbnMgdGhhdCB0aGVcbiAgICAgICAgLy8gZGlyZWN0aXZlIGhhcyBiZWVuIGRpc2Nvbm5lY3RlZCBhbmQgZ2FyYmFnZSBjb2xsZWN0ZWQgYW5kIHdlIGRvbid0XG4gICAgICAgIC8vIG5lZWQgdG8gZG8gYW55dGhpbmcgZWxzZVxuICAgICAgICBjb25zdCBfdGhpcyA9IHdlYWtUaGlzLmRlcmVmKCk7XG4gICAgICAgIGlmIChfdGhpcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY29uc3QgaW5kZXggPSBfdGhpcy5fX3ZhbHVlcy5pbmRleE9mKHZhbHVlKTtcbiAgICAgICAgICAvLyBJZiBzdGF0ZS52YWx1ZXMgZG9lc24ndCBjb250YWluIHRoZSB2YWx1ZSwgd2UndmUgcmUtcmVuZGVyZWQgd2l0aG91dFxuICAgICAgICAgIC8vIHRoZSB2YWx1ZSwgc28gZG9uJ3QgcmVuZGVyIGl0LiBUaGVuLCBvbmx5IHJlbmRlciBpZiB0aGUgdmFsdWUgaXNcbiAgICAgICAgICAvLyBoaWdoZXItcHJpb3JpdHkgdGhhbiB3aGF0J3MgYWxyZWFkeSBiZWVuIHJlbmRlcmVkLlxuICAgICAgICAgIGlmIChpbmRleCA+IC0xICYmIGluZGV4IDwgX3RoaXMuX19sYXN0UmVuZGVyZWRJbmRleCkge1xuICAgICAgICAgICAgX3RoaXMuX19sYXN0UmVuZGVyZWRJbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgX3RoaXMuc2V0VmFsdWUocmVzdWx0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBub0NoYW5nZTtcbiAgfVxuXG4gIG92ZXJyaWRlIGRpc2Nvbm5lY3RlZCgpIHtcbiAgICB0aGlzLl9fd2Vha1RoaXMuZGlzY29ubmVjdCgpO1xuICAgIHRoaXMuX19wYXVzZXIucGF1c2UoKTtcbiAgfVxuXG4gIG92ZXJyaWRlIHJlY29ubmVjdGVkKCkge1xuICAgIHRoaXMuX193ZWFrVGhpcy5yZWNvbm5lY3QodGhpcyk7XG4gICAgdGhpcy5fX3BhdXNlci5yZXN1bWUoKTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbmRlcnMgb25lIG9mIGEgc2VyaWVzIG9mIHZhbHVlcywgaW5jbHVkaW5nIFByb21pc2VzLCB0byBhIFBhcnQuXG4gKlxuICogVmFsdWVzIGFyZSByZW5kZXJlZCBpbiBwcmlvcml0eSBvcmRlciwgd2l0aCB0aGUgZmlyc3QgYXJndW1lbnQgaGF2aW5nIHRoZVxuICogaGlnaGVzdCBwcmlvcml0eSBhbmQgdGhlIGxhc3QgYXJndW1lbnQgaGF2aW5nIHRoZSBsb3dlc3QgcHJpb3JpdHkuIElmIGFcbiAqIHZhbHVlIGlzIGEgUHJvbWlzZSwgbG93LXByaW9yaXR5IHZhbHVlcyB3aWxsIGJlIHJlbmRlcmVkIHVudGlsIGl0IHJlc29sdmVzLlxuICpcbiAqIFRoZSBwcmlvcml0eSBvZiB2YWx1ZXMgY2FuIGJlIHVzZWQgdG8gY3JlYXRlIHBsYWNlaG9sZGVyIGNvbnRlbnQgZm9yIGFzeW5jXG4gKiBkYXRhLiBGb3IgZXhhbXBsZSwgYSBQcm9taXNlIHdpdGggcGVuZGluZyBjb250ZW50IGNhbiBiZSB0aGUgZmlyc3QsXG4gKiBoaWdoZXN0LXByaW9yaXR5LCBhcmd1bWVudCwgYW5kIGEgbm9uX3Byb21pc2UgbG9hZGluZyBpbmRpY2F0b3IgdGVtcGxhdGUgY2FuXG4gKiBiZSB1c2VkIGFzIHRoZSBzZWNvbmQsIGxvd2VyLXByaW9yaXR5LCBhcmd1bWVudC4gVGhlIGxvYWRpbmcgaW5kaWNhdG9yIHdpbGxcbiAqIHJlbmRlciBpbW1lZGlhdGVseSwgYW5kIHRoZSBwcmltYXJ5IGNvbnRlbnQgd2lsbCByZW5kZXIgd2hlbiB0aGUgUHJvbWlzZVxuICogcmVzb2x2ZXMuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogY29uc3QgY29udGVudCA9IGZldGNoKCcuL2NvbnRlbnQudHh0JykudGhlbihyID0+IHIudGV4dCgpKTtcbiAqIGh0bWxgJHt1bnRpbChjb250ZW50LCBodG1sYDxzcGFuPkxvYWRpbmcuLi48L3NwYW4+YCl9YFxuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB1bnRpbCA9IGRpcmVjdGl2ZShVbnRpbERpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG4vLyBleHBvcnQgdHlwZSB7VW50aWxEaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjEgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbnR5cGUgRmFsc3kgPSBudWxsIHwgdW5kZWZpbmVkIHwgZmFsc2UgfCAwIHwgLTAgfCAwbiB8ICcnO1xuXG4vKipcbiAqIFdoZW4gYGNvbmRpdGlvbmAgaXMgdHJ1ZSwgcmV0dXJucyB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgYHRydWVDYXNlKClgLCBlbHNlXG4gKiByZXR1cm5zIHRoZSByZXN1bHQgb2YgY2FsbGluZyBgZmFsc2VDYXNlKClgIGlmIGBmYWxzZUNhc2VgIGlzIGRlZmluZWQuXG4gKlxuICogVGhpcyBpcyBhIGNvbnZlbmllbmNlIHdyYXBwZXIgYXJvdW5kIGEgdGVybmFyeSBleHByZXNzaW9uIHRoYXQgbWFrZXMgaXQgYVxuICogbGl0dGxlIG5pY2VyIHRvIHdyaXRlIGFuIGlubGluZSBjb25kaXRpb25hbCB3aXRob3V0IGFuIGVsc2UuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogcmVuZGVyKCkge1xuICogICByZXR1cm4gaHRtbGBcbiAqICAgICAke3doZW4odGhpcy51c2VyLCAoKSA9PiBodG1sYFVzZXI6ICR7dGhpcy51c2VyLnVzZXJuYW1lfWAsICgpID0+IGh0bWxgU2lnbiBJbi4uLmApfVxuICogICBgO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aGVuPEMgZXh0ZW5kcyBGYWxzeSwgVCwgRiA9IHVuZGVmaW5lZD4oXG4gIGNvbmRpdGlvbjogQyxcbiAgdHJ1ZUNhc2U6IChjOiBDKSA9PiBULFxuICBmYWxzZUNhc2U/OiAoYzogQykgPT4gRlxuKTogRjtcbmV4cG9ydCBmdW5jdGlvbiB3aGVuPEMsIFQsIEY+KFxuICBjb25kaXRpb246IEMgZXh0ZW5kcyBGYWxzeSA/IG5ldmVyIDogQyxcbiAgdHJ1ZUNhc2U6IChjOiBDKSA9PiBULFxuICBmYWxzZUNhc2U/OiAoYzogQykgPT4gRlxuKTogVDtcbmV4cG9ydCBmdW5jdGlvbiB3aGVuPEMsIFQsIEYgPSB1bmRlZmluZWQ+KFxuICBjb25kaXRpb246IEMsXG4gIHRydWVDYXNlOiAoYzogRXhjbHVkZTxDLCBGYWxzeT4pID0+IFQsXG4gIGZhbHNlQ2FzZT86IChjOiBFeHRyYWN0PEMsIEZhbHN5PikgPT4gRlxuKTogQyBleHRlbmRzIEZhbHN5ID8gRiA6IFQ7XG5leHBvcnQgZnVuY3Rpb24gd2hlbihcbiAgY29uZGl0aW9uOiB1bmtub3duLFxuICB0cnVlQ2FzZTogKGM6IHVua25vd24pID0+IHVua25vd24sXG4gIGZhbHNlQ2FzZT86IChjOiB1bmtub3duKSA9PiB1bmtub3duXG4pOiB1bmtub3duIHtcbiAgcmV0dXJuIGNvbmRpdGlvbiA/IHRydWVDYXNlKGNvbmRpdGlvbikgOiBmYWxzZUNhc2U/Lihjb25kaXRpb24pO1xufVxuIiwiZXhwb3J0IHtcbiAgICBUZW1wbGF0ZVJlc3VsdCxcbiAgICBIVE1MVGVtcGxhdGVSZXN1bHQsXG4gICAgU1ZHVGVtcGxhdGVSZXN1bHQsXG4gICAgUmVuZGVyT3B0aW9ucyxcbiAgICBodG1sLFxuICAgIHN2ZyxcbiAgICByZW5kZXIsXG4gICAgbm9DaGFuZ2UsXG4gICAgbm90aGluZyxcbn0gZnJvbSAnbGl0LWh0bWwnO1xuXG5leHBvcnQgeyBfJExIIH0gZnJvbSAnbGl0LWh0bWwvcHJpdmF0ZS1zc3Itc3VwcG9ydCc7XG5cbmV4cG9ydCB7XG4gICAgRGlyZWN0aXZlLFxuICAgIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG4gICAgUGFydCxcbiAgICBQYXJ0SW5mbyxcbiAgICBQYXJ0VHlwZSxcbiAgICBkaXJlY3RpdmUsXG59IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZSc7XG5cbmV4cG9ydCB7IEFzeW5jRGlyZWN0aXZlIH0gZnJvbSAnbGl0LWh0bWwvYXN5bmMtZGlyZWN0aXZlJztcbmV4cG9ydCB7IFJlZiwgY3JlYXRlUmVmIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9yZWYnO1xuXG5pbXBvcnQgeyBhc3luY0FwcGVuZCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvYXN5bmMtYXBwZW5kJztcbmltcG9ydCB7IGFzeW5jUmVwbGFjZSB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvYXN5bmMtcmVwbGFjZSc7XG5pbXBvcnQgeyBjYWNoZSB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvY2FjaGUnO1xuaW1wb3J0IHsgY2hvb3NlIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9jaG9vc2UnO1xuaW1wb3J0IHsgY2xhc3NNYXAgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2NsYXNzLW1hcCc7XG5pbXBvcnQgeyBndWFyZCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvZ3VhcmQnO1xuaW1wb3J0IHsgaWZEZWZpbmVkIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9pZi1kZWZpbmVkJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2pvaW4nO1xuaW1wb3J0IHsga2V5ZWQgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2tleWVkJztcbmltcG9ydCB7IGxpdmUgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2xpdmUnO1xuaW1wb3J0IHsgbWFwIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9tYXAnO1xuaW1wb3J0IHsgcmFuZ2UgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3JhbmdlJztcbmltcG9ydCB7IHJlZiB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvcmVmJztcbmltcG9ydCB7IHJlcGVhdCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvcmVwZWF0JztcbmltcG9ydCB7IHN0eWxlTWFwIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9zdHlsZS1tYXAnO1xuaW1wb3J0IHsgdGVtcGxhdGVDb250ZW50IH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy90ZW1wbGF0ZS1jb250ZW50JztcbmltcG9ydCB7IHVuc2FmZUhUTUwgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3Vuc2FmZS1odG1sJztcbmltcG9ydCB7IHVuc2FmZVNWRyB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvdW5zYWZlLXN2Zyc7XG5pbXBvcnQgeyB1bnRpbCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvdW50aWwnO1xuaW1wb3J0IHsgd2hlbiB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvd2hlbic7XG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlXG5kZWNsYXJlIG5hbWVzcGFjZSBkaXJlY3RpdmVzIHtcbiAgICBleHBvcnQgdHlwZSBhc3luY0FwcGVuZCA9IHR5cGVvZiBhc3luY0FwcGVuZDtcbiAgICBleHBvcnQgdHlwZSBhc3luY1JlcGxhY2UgPSB0eXBlb2YgYXN5bmNSZXBsYWNlO1xuICAgIGV4cG9ydCB0eXBlIGNhY2hlID0gdHlwZW9mIGNhY2hlO1xuICAgIGV4cG9ydCB0eXBlIGNob29zZSA9IHR5cGVvZiBjaG9vc2U7XG4gICAgZXhwb3J0IHR5cGUgY2xhc3NNYXAgPSB0eXBlb2YgY2xhc3NNYXA7XG4gICAgZXhwb3J0IHR5cGUgZ3VhcmQgPSB0eXBlb2YgZ3VhcmQ7XG4gICAgZXhwb3J0IHR5cGUgaWZEZWZpbmVkID0gdHlwZW9mIGlmRGVmaW5lZDtcbiAgICBleHBvcnQgdHlwZSBqb2luID0gdHlwZW9mIGpvaW47XG4gICAgZXhwb3J0IHR5cGUga2V5ZWQgPSB0eXBlb2Yga2V5ZWQ7XG4gICAgZXhwb3J0IHR5cGUgbGl2ZSA9IHR5cGVvZiBsaXZlO1xuICAgIGV4cG9ydCB0eXBlIG1hcCA9IHR5cGVvZiBtYXA7XG4gICAgZXhwb3J0IHR5cGUgcmFuZ2UgPSB0eXBlb2YgcmFuZ2U7XG4gICAgZXhwb3J0IHR5cGUgcmVmID0gdHlwZW9mIHJlZjtcbiAgICBleHBvcnQgdHlwZSByZXBlYXQgPSB0eXBlb2YgcmVwZWF0O1xuICAgIGV4cG9ydCB0eXBlIHN0eWxlTWFwID0gdHlwZW9mIHN0eWxlTWFwO1xuICAgIGV4cG9ydCB0eXBlIHRlbXBsYXRlQ29udGVudCA9IHR5cGVvZiB0ZW1wbGF0ZUNvbnRlbnQ7XG4gICAgZXhwb3J0IHR5cGUgdW5zYWZlSFRNTCA9IHR5cGVvZiB1bnNhZmVIVE1MO1xuICAgIGV4cG9ydCB0eXBlIHVuc2FmZVNWRyA9IHR5cGVvZiB1bnNhZmVTVkc7XG4gICAgZXhwb3J0IHR5cGUgdW50aWwgPSB0eXBlb2YgdW50aWw7XG4gICAgZXhwb3J0IHR5cGUgd2hlbiA9IHR5cGVvZiB3aGVuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlRGlyZWN0aXZlcyB7XG4gICAgYXN5bmNBcHBlbmQ6IGRpcmVjdGl2ZXMuYXN5bmNBcHBlbmQ7XG4gICAgYXN5bmNSZXBsYWNlOiBkaXJlY3RpdmVzLmFzeW5jUmVwbGFjZTtcbiAgICBjYWNoZTogZGlyZWN0aXZlcy5jYWNoZTtcbiAgICBjaG9vc2U6IGRpcmVjdGl2ZXMuY2hvb3NlO1xuICAgIGNsYXNzTWFwOiBkaXJlY3RpdmVzLmNsYXNzTWFwO1xuICAgIGd1YXJkOiBkaXJlY3RpdmVzLmd1YXJkO1xuICAgIGlmRGVmaW5lZDogZGlyZWN0aXZlcy5pZkRlZmluZWQ7XG4gICAgam9pbjogZGlyZWN0aXZlcy5qb2luO1xuICAgIGtleWVkOiBkaXJlY3RpdmVzLmtleWVkO1xuICAgIGxpdmU6IGRpcmVjdGl2ZXMubGl2ZTtcbiAgICBtYXA6IGRpcmVjdGl2ZXMubWFwO1xuICAgIHJhbmdlOiBkaXJlY3RpdmVzLnJhbmdlO1xuICAgIHJlZjogZGlyZWN0aXZlcy5yZWY7XG4gICAgcmVwZWF0OiBkaXJlY3RpdmVzLnJlcGVhdDtcbiAgICBzdHlsZU1hcDogZGlyZWN0aXZlcy5zdHlsZU1hcDtcbiAgICB0ZW1wbGF0ZUNvbnRlbnQ6IGRpcmVjdGl2ZXMudGVtcGxhdGVDb250ZW50O1xuICAgIHVuc2FmZUhUTUw6IGRpcmVjdGl2ZXMudW5zYWZlSFRNTDtcbiAgICB1bnNhZmVTVkc6IGRpcmVjdGl2ZXMudW5zYWZlU1ZHO1xuICAgIHVudGlsOiBkaXJlY3RpdmVzLnVudGlsO1xuICAgIHdoZW46IGRpcmVjdGl2ZXMud2hlbjtcbn1cblxuZXhwb3J0IGNvbnN0IGRpcmVjdGl2ZXM6IFRlbXBsYXRlRGlyZWN0aXZlcyA9IHtcbiAgICBhc3luY0FwcGVuZCxcbiAgICBhc3luY1JlcGxhY2UsXG4gICAgY2FjaGUsXG4gICAgY2hvb3NlLFxuICAgIGNsYXNzTWFwLFxuICAgIGd1YXJkLFxuICAgIGlmRGVmaW5lZCxcbiAgICBqb2luLFxuICAgIGtleWVkLFxuICAgIGxpdmUsXG4gICAgbWFwLFxuICAgIHJhbmdlLFxuICAgIHJlZixcbiAgICByZXBlYXQsXG4gICAgc3R5bGVNYXAsXG4gICAgdGVtcGxhdGVDb250ZW50LFxuICAgIHVuc2FmZUhUTUwsXG4gICAgdW5zYWZlU1ZHLFxuICAgIHVudGlsLFxuICAgIHdoZW4sXG59O1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGZyb20gYHN0cmluZ2AgdG8gYFRlbXBsYXRlU3RyaW5nc0FycmF5YC4gPGJyPlxuICogICAgIFRoaXMgbWV0aG9kIGlzIGhlbHBlciBicmlnZGdlIGZvciB0aGUge0BsaW5rIGh0bWx9IG9yIHRoZSB7QGxpbmsgc3ZnfSBhcmUgYWJsZSB0byByZWNlaXZlZCBwbGFpbiBzdHJpbmcuXG4gKiBAamEgYHN0cmluZ2Ag44KSIGBUZW1wbGF0ZVN0cmluZ3NBcnJheWDjgavlpInmj5suIDxicj5cbiAqICAgICB7QGxpbmsgaHRtbH0g44KEIHtAbGluayBzdmd9IOOBjOaWh+Wtl+WIl+OCkuWPl+OBkeS7mOOBkeOCi+OBn+OCgeOBruODluODquODg+OCuOODoeOCveODg+ODiVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgdG9UZW1wbGF0ZVN0cmluZ3NBcnJheSBhcyBicmlkZ2UgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIGNvbnN0IHJhdyA9ICc8cD5IZWxsbyBSYXcgU3RyaW5nPC9wPic7XG4gKiByZW5kZXIoaHRtbChicmlkZ2UocmF3KSksIGRvY3VtZW50LmJvZHkpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBwbGFpbiBzdHJpbmcgLyBzdHJpbmcgYXJyYXkuIGV4KSB7QGxpbmsgSlNUfSByZXR1cm5lZCB2YWx1ZS5cbiAqICAtIGBqYWAg44OX44Os44O844Oz5paH5a2X5YiXIC8g5paH5a2X5YiX6YWN5YiXLiBleCkge0BsaW5rIEpTVH0g44Gu5oi744KK5YCk44Gq44Gp44KS5oOz5a6aXG4gKi9cbmV4cG9ydCBjb25zdCB0b1RlbXBsYXRlU3RyaW5nc0FycmF5ID0gKHNyYzogc3RyaW5nIHwgc3RyaW5nW10gfCBUZW1wbGF0ZVN0cmluZ3NBcnJheSk6IFRlbXBsYXRlU3RyaW5nc0FycmF5ID0+IHtcbiAgICBjb25zdCBzdHJpbmdzID0gQXJyYXkuaXNBcnJheShzcmMpID8gc3JjIDogW3NyY107XG4gICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc3RyaW5ncywgJ3JhdycpKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzdHJpbmdzLCAncmF3JywgeyB2YWx1ZTogc3RyaW5ncyB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHN0cmluZ3MgYXMgdW5rbm93biBhcyBUZW1wbGF0ZVN0cmluZ3NBcnJheTtcbn07XG4iXSwibmFtZXMiOlsid3JhcCIsImNyZWF0ZU1hcmtlciIsImlzUHJpbWl0aXZlIiwi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UUFDSCxNQUFNO1FBQ04sUUFBUTtRQUNSLGVBQWU7UUFDZixVQUFVO1FBQ1YsU0FBUztRQUNULEtBQUs7UUFDTCxJQUFJOztJQUdSOzs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFrQkc7QUFDVSxVQUFBLHNCQUFzQixHQUFHLENBQUMsR0FBNkMsS0FBMEI7SUFDMUcsSUFBQSxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQztJQUNoRCxJQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxFQUFFO0lBQ3ZELFFBQUEsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDOztJQUU3RCxJQUFBLE9BQU8sT0FBMEM7SUFDckQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzAsMSwyLDMsNCw1LDYsNyw4LDksMTAsMTEsMTIsMTMsMTQsMTUsMTYsMTcsMTgsMTksMjAsMjEsMjIsMjMsMjQsMjVdLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlLyJ9