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
    const marker = `lit$${String(Math.random()).slice(9)}$`;
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
     * Interprets a template literal as an SVG fragment that can efficiently
     * render to and update a container.
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
     * shadow root and thus cannot be used within an `<svg>` HTML element.
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
     * template tags cannot be dynamic - the must statically be one of html, svg,
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
        if (!Array.isArray(tsa) || !tsa.hasOwnProperty('raw')) {
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
        let html = type === SVG_RESULT$1 ? '<svg>' : '';
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
        const htmlResult = html + (strings[l] || '<?>') + (type === SVG_RESULT$1 ? '</svg>' : '');
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
            // Re-parent SVG nodes into template root
            if (type === SVG_RESULT$1) {
                const svgElement = this.el.content.firstChild;
                svgElement.replaceWith(...svgElement.childNodes);
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
         * Implementation of RootPart's `isConnected`. Note that this metod
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
     * to keep a number of (otherwise private) top-level exports  mangled in the
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
    (global.litHtmlVersions ??= []).push('3.1.2');
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
    const isTemplateResult = (value, type) => type === undefined
        ? // This property needs to remain unminified.
            value?.['_$litType$'] !== undefined
        : value?.['_$litType$'] === type;
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
         * an an await of this promise resolving, the pauser could be paused again,
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
     * truthy; if the property value is falsey, the property name is removed from
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
            //   remaining clauses is is just a simple guess at which cases
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLmpzIiwic291cmNlcyI6WyJsaXQtaHRtbC9zcmMvbGl0LWh0bWwudHMiLCJsaXQtaHRtbC9zcmMvcHJpdmF0ZS1zc3Itc3VwcG9ydC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmUudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlLWhlbHBlcnMudHMiLCJsaXQtaHRtbC9zcmMvYXN5bmMtZGlyZWN0aXZlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvcmVmLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvcHJpdmF0ZS1hc3luYy1oZWxwZXJzLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvYXN5bmMtcmVwbGFjZS50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2FzeW5jLWFwcGVuZC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2NhY2hlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvY2hvb3NlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvY2xhc3MtbWFwLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvZ3VhcmQudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9pZi1kZWZpbmVkLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvam9pbi50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2tleWVkLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvbGl2ZS50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL21hcC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3JhbmdlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvcmVwZWF0LnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvc3R5bGUtbWFwLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvdGVtcGxhdGUtY29udGVudC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3Vuc2FmZS1odG1sLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvdW5zYWZlLXN2Zy50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3VudGlsLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvd2hlbi50cyIsImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG4vLyBJTVBPUlRBTlQ6IHRoZXNlIGltcG9ydHMgbXVzdCBiZSB0eXBlLW9ubHlcbmltcG9ydCB0eXBlIHtEaXJlY3RpdmUsIERpcmVjdGl2ZVJlc3VsdCwgUGFydEluZm99IGZyb20gJy4vZGlyZWN0aXZlLmpzJztcblxuY29uc3QgREVWX01PREUgPSB0cnVlO1xuY29uc3QgRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTID0gdHJ1ZTtcbmNvbnN0IEVOQUJMRV9TSEFEWURPTV9OT1BBVENIID0gdHJ1ZTtcbmNvbnN0IE5PREVfTU9ERSA9IGZhbHNlO1xuXG4vLyBBbGxvd3MgbWluaWZpZXJzIHRvIHJlbmFtZSByZWZlcmVuY2VzIHRvIGdsb2JhbFRoaXNcbmNvbnN0IGdsb2JhbCA9IGdsb2JhbFRoaXM7XG5cbi8qKlxuICogQ29udGFpbnMgdHlwZXMgdGhhdCBhcmUgcGFydCBvZiB0aGUgdW5zdGFibGUgZGVidWcgQVBJLlxuICpcbiAqIEV2ZXJ5dGhpbmcgaW4gdGhpcyBBUEkgaXMgbm90IHN0YWJsZSBhbmQgbWF5IGNoYW5nZSBvciBiZSByZW1vdmVkIGluIHRoZSBmdXR1cmUsXG4gKiBldmVuIG9uIHBhdGNoIHJlbGVhc2VzLlxuICovXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZVxuZXhwb3J0IG5hbWVzcGFjZSBMaXRVbnN0YWJsZSB7XG4gIC8qKlxuICAgKiBXaGVuIExpdCBpcyBydW5uaW5nIGluIGRldiBtb2RlIGFuZCBgd2luZG93LmVtaXRMaXREZWJ1Z0xvZ0V2ZW50c2AgaXMgdHJ1ZSxcbiAgICogd2Ugd2lsbCBlbWl0ICdsaXQtZGVidWcnIGV2ZW50cyB0byB3aW5kb3csIHdpdGggbGl2ZSBkZXRhaWxzIGFib3V0IHRoZSB1cGRhdGUgYW5kIHJlbmRlclxuICAgKiBsaWZlY3ljbGUuIFRoZXNlIGNhbiBiZSB1c2VmdWwgZm9yIHdyaXRpbmcgZGVidWcgdG9vbGluZyBhbmQgdmlzdWFsaXphdGlvbnMuXG4gICAqXG4gICAqIFBsZWFzZSBiZSBhd2FyZSB0aGF0IHJ1bm5pbmcgd2l0aCB3aW5kb3cuZW1pdExpdERlYnVnTG9nRXZlbnRzIGhhcyBwZXJmb3JtYW5jZSBvdmVyaGVhZCxcbiAgICogbWFraW5nIGNlcnRhaW4gb3BlcmF0aW9ucyB0aGF0IGFyZSBub3JtYWxseSB2ZXJ5IGNoZWFwIChsaWtlIGEgbm8tb3AgcmVuZGVyKSBtdWNoIHNsb3dlcixcbiAgICogYmVjYXVzZSB3ZSBtdXN0IGNvcHkgZGF0YSBhbmQgZGlzcGF0Y2ggZXZlbnRzLlxuICAgKi9cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbiAgZXhwb3J0IG5hbWVzcGFjZSBEZWJ1Z0xvZyB7XG4gICAgZXhwb3J0IHR5cGUgRW50cnkgPVxuICAgICAgfCBUZW1wbGF0ZVByZXBcbiAgICAgIHwgVGVtcGxhdGVJbnN0YW50aWF0ZWRcbiAgICAgIHwgVGVtcGxhdGVJbnN0YW50aWF0ZWRBbmRVcGRhdGVkXG4gICAgICB8IFRlbXBsYXRlVXBkYXRpbmdcbiAgICAgIHwgQmVnaW5SZW5kZXJcbiAgICAgIHwgRW5kUmVuZGVyXG4gICAgICB8IENvbW1pdFBhcnRFbnRyeVxuICAgICAgfCBTZXRQYXJ0VmFsdWU7XG4gICAgZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZVByZXAge1xuICAgICAga2luZDogJ3RlbXBsYXRlIHByZXAnO1xuICAgICAgdGVtcGxhdGU6IFRlbXBsYXRlO1xuICAgICAgc3RyaW5nczogVGVtcGxhdGVTdHJpbmdzQXJyYXk7XG4gICAgICBjbG9uYWJsZVRlbXBsYXRlOiBIVE1MVGVtcGxhdGVFbGVtZW50O1xuICAgICAgcGFydHM6IFRlbXBsYXRlUGFydFtdO1xuICAgIH1cbiAgICBleHBvcnQgaW50ZXJmYWNlIEJlZ2luUmVuZGVyIHtcbiAgICAgIGtpbmQ6ICdiZWdpbiByZW5kZXInO1xuICAgICAgaWQ6IG51bWJlcjtcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgY29udGFpbmVyOiBIVE1MRWxlbWVudCB8IERvY3VtZW50RnJhZ21lbnQ7XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgICAgcGFydDogQ2hpbGRQYXJ0IHwgdW5kZWZpbmVkO1xuICAgIH1cbiAgICBleHBvcnQgaW50ZXJmYWNlIEVuZFJlbmRlciB7XG4gICAgICBraW5kOiAnZW5kIHJlbmRlcic7XG4gICAgICBpZDogbnVtYmVyO1xuICAgICAgdmFsdWU6IHVua25vd247XG4gICAgICBjb250YWluZXI6IEhUTUxFbGVtZW50IHwgRG9jdW1lbnRGcmFnbWVudDtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgICBwYXJ0OiBDaGlsZFBhcnQ7XG4gICAgfVxuICAgIGV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVJbnN0YW50aWF0ZWQge1xuICAgICAga2luZDogJ3RlbXBsYXRlIGluc3RhbnRpYXRlZCc7XG4gICAgICB0ZW1wbGF0ZTogVGVtcGxhdGUgfCBDb21waWxlZFRlbXBsYXRlO1xuICAgICAgaW5zdGFuY2U6IFRlbXBsYXRlSW5zdGFuY2U7XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgICAgZnJhZ21lbnQ6IE5vZGU7XG4gICAgICBwYXJ0czogQXJyYXk8UGFydCB8IHVuZGVmaW5lZD47XG4gICAgICB2YWx1ZXM6IHVua25vd25bXTtcbiAgICB9XG4gICAgZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUluc3RhbnRpYXRlZEFuZFVwZGF0ZWQge1xuICAgICAga2luZDogJ3RlbXBsYXRlIGluc3RhbnRpYXRlZCBhbmQgdXBkYXRlZCc7XG4gICAgICB0ZW1wbGF0ZTogVGVtcGxhdGUgfCBDb21waWxlZFRlbXBsYXRlO1xuICAgICAgaW5zdGFuY2U6IFRlbXBsYXRlSW5zdGFuY2U7XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgICAgZnJhZ21lbnQ6IE5vZGU7XG4gICAgICBwYXJ0czogQXJyYXk8UGFydCB8IHVuZGVmaW5lZD47XG4gICAgICB2YWx1ZXM6IHVua25vd25bXTtcbiAgICB9XG4gICAgZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZVVwZGF0aW5nIHtcbiAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSB1cGRhdGluZyc7XG4gICAgICB0ZW1wbGF0ZTogVGVtcGxhdGUgfCBDb21waWxlZFRlbXBsYXRlO1xuICAgICAgaW5zdGFuY2U6IFRlbXBsYXRlSW5zdGFuY2U7XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgICAgcGFydHM6IEFycmF5PFBhcnQgfCB1bmRlZmluZWQ+O1xuICAgICAgdmFsdWVzOiB1bmtub3duW107XG4gICAgfVxuICAgIGV4cG9ydCBpbnRlcmZhY2UgU2V0UGFydFZhbHVlIHtcbiAgICAgIGtpbmQ6ICdzZXQgcGFydCc7XG4gICAgICBwYXJ0OiBQYXJ0O1xuICAgICAgdmFsdWU6IHVua25vd247XG4gICAgICB2YWx1ZUluZGV4OiBudW1iZXI7XG4gICAgICB2YWx1ZXM6IHVua25vd25bXTtcbiAgICAgIHRlbXBsYXRlSW5zdGFuY2U6IFRlbXBsYXRlSW5zdGFuY2U7XG4gICAgfVxuXG4gICAgZXhwb3J0IHR5cGUgQ29tbWl0UGFydEVudHJ5ID1cbiAgICAgIHwgQ29tbWl0Tm90aGluZ1RvQ2hpbGRFbnRyeVxuICAgICAgfCBDb21taXRUZXh0XG4gICAgICB8IENvbW1pdE5vZGVcbiAgICAgIHwgQ29tbWl0QXR0cmlidXRlXG4gICAgICB8IENvbW1pdFByb3BlcnR5XG4gICAgICB8IENvbW1pdEJvb2xlYW5BdHRyaWJ1dGVcbiAgICAgIHwgQ29tbWl0RXZlbnRMaXN0ZW5lclxuICAgICAgfCBDb21taXRUb0VsZW1lbnRCaW5kaW5nO1xuXG4gICAgZXhwb3J0IGludGVyZmFjZSBDb21taXROb3RoaW5nVG9DaGlsZEVudHJ5IHtcbiAgICAgIGtpbmQ6ICdjb21taXQgbm90aGluZyB0byBjaGlsZCc7XG4gICAgICBzdGFydDogQ2hpbGROb2RlO1xuICAgICAgZW5kOiBDaGlsZE5vZGUgfCBudWxsO1xuICAgICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSB8IHVuZGVmaW5lZDtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZXhwb3J0IGludGVyZmFjZSBDb21taXRUZXh0IHtcbiAgICAgIGtpbmQ6ICdjb21taXQgdGV4dCc7XG4gICAgICBub2RlOiBUZXh0O1xuICAgICAgdmFsdWU6IHVua25vd247XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0Tm9kZSB7XG4gICAgICBraW5kOiAnY29tbWl0IG5vZGUnO1xuICAgICAgc3RhcnQ6IE5vZGU7XG4gICAgICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlIHwgdW5kZWZpbmVkO1xuICAgICAgdmFsdWU6IE5vZGU7XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0QXR0cmlidXRlIHtcbiAgICAgIGtpbmQ6ICdjb21taXQgYXR0cmlidXRlJztcbiAgICAgIGVsZW1lbnQ6IEVsZW1lbnQ7XG4gICAgICBuYW1lOiBzdHJpbmc7XG4gICAgICB2YWx1ZTogdW5rbm93bjtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZXhwb3J0IGludGVyZmFjZSBDb21taXRQcm9wZXJ0eSB7XG4gICAgICBraW5kOiAnY29tbWl0IHByb3BlcnR5JztcbiAgICAgIGVsZW1lbnQ6IEVsZW1lbnQ7XG4gICAgICBuYW1lOiBzdHJpbmc7XG4gICAgICB2YWx1ZTogdW5rbm93bjtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZXhwb3J0IGludGVyZmFjZSBDb21taXRCb29sZWFuQXR0cmlidXRlIHtcbiAgICAgIGtpbmQ6ICdjb21taXQgYm9vbGVhbiBhdHRyaWJ1dGUnO1xuICAgICAgZWxlbWVudDogRWxlbWVudDtcbiAgICAgIG5hbWU6IHN0cmluZztcbiAgICAgIHZhbHVlOiBib29sZWFuO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBleHBvcnQgaW50ZXJmYWNlIENvbW1pdEV2ZW50TGlzdGVuZXIge1xuICAgICAga2luZDogJ2NvbW1pdCBldmVudCBsaXN0ZW5lcic7XG4gICAgICBlbGVtZW50OiBFbGVtZW50O1xuICAgICAgbmFtZTogc3RyaW5nO1xuICAgICAgdmFsdWU6IHVua25vd247XG4gICAgICBvbGRMaXN0ZW5lcjogdW5rbm93bjtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgICAvLyBUcnVlIGlmIHdlJ3JlIHJlbW92aW5nIHRoZSBvbGQgZXZlbnQgbGlzdGVuZXIgKGUuZy4gYmVjYXVzZSBzZXR0aW5ncyBjaGFuZ2VkLCBvciB2YWx1ZSBpcyBub3RoaW5nKVxuICAgICAgcmVtb3ZlTGlzdGVuZXI6IGJvb2xlYW47XG4gICAgICAvLyBUcnVlIGlmIHdlJ3JlIGFkZGluZyBhIG5ldyBldmVudCBsaXN0ZW5lciAoZS5nLiBiZWNhdXNlIGZpcnN0IHJlbmRlciwgb3Igc2V0dGluZ3MgY2hhbmdlZClcbiAgICAgIGFkZExpc3RlbmVyOiBib29sZWFuO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0VG9FbGVtZW50QmluZGluZyB7XG4gICAgICBraW5kOiAnY29tbWl0IHRvIGVsZW1lbnQgYmluZGluZyc7XG4gICAgICBlbGVtZW50OiBFbGVtZW50O1xuICAgICAgdmFsdWU6IHVua25vd247XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxufVxuXG5pbnRlcmZhY2UgRGVidWdMb2dnaW5nV2luZG93IHtcbiAgLy8gRXZlbiBpbiBkZXYgbW9kZSwgd2UgZ2VuZXJhbGx5IGRvbid0IHdhbnQgdG8gZW1pdCB0aGVzZSBldmVudHMsIGFzIHRoYXQnc1xuICAvLyBhbm90aGVyIGxldmVsIG9mIGNvc3QsIHNvIG9ubHkgZW1pdCB0aGVtIHdoZW4gREVWX01PREUgaXMgdHJ1ZSBfYW5kXyB3aGVuXG4gIC8vIHdpbmRvdy5lbWl0TGl0RGVidWdFdmVudHMgaXMgdHJ1ZS5cbiAgZW1pdExpdERlYnVnTG9nRXZlbnRzPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBVc2VmdWwgZm9yIHZpc3VhbGl6aW5nIGFuZCBsb2dnaW5nIGluc2lnaHRzIGludG8gd2hhdCB0aGUgTGl0IHRlbXBsYXRlIHN5c3RlbSBpcyBkb2luZy5cbiAqXG4gKiBDb21waWxlZCBvdXQgb2YgcHJvZCBtb2RlIGJ1aWxkcy5cbiAqL1xuY29uc3QgZGVidWdMb2dFdmVudCA9IERFVl9NT0RFXG4gID8gKGV2ZW50OiBMaXRVbnN0YWJsZS5EZWJ1Z0xvZy5FbnRyeSkgPT4ge1xuICAgICAgY29uc3Qgc2hvdWxkRW1pdCA9IChnbG9iYWwgYXMgdW5rbm93biBhcyBEZWJ1Z0xvZ2dpbmdXaW5kb3cpXG4gICAgICAgIC5lbWl0TGl0RGVidWdMb2dFdmVudHM7XG4gICAgICBpZiAoIXNob3VsZEVtaXQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZ2xvYmFsLmRpc3BhdGNoRXZlbnQoXG4gICAgICAgIG5ldyBDdXN0b21FdmVudDxMaXRVbnN0YWJsZS5EZWJ1Z0xvZy5FbnRyeT4oJ2xpdC1kZWJ1ZycsIHtcbiAgICAgICAgICBkZXRhaWw6IGV2ZW50LFxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG4gIDogdW5kZWZpbmVkO1xuLy8gVXNlZCBmb3IgY29ubmVjdGluZyBiZWdpblJlbmRlciBhbmQgZW5kUmVuZGVyIGV2ZW50cyB3aGVuIHRoZXJlIGFyZSBuZXN0ZWRcbi8vIHJlbmRlcnMgd2hlbiBlcnJvcnMgYXJlIHRocm93biBwcmV2ZW50aW5nIGFuIGVuZFJlbmRlciBldmVudCBmcm9tIGJlaW5nXG4vLyBjYWxsZWQuXG5sZXQgZGVidWdMb2dSZW5kZXJJZCA9IDA7XG5cbmxldCBpc3N1ZVdhcm5pbmc6IChjb2RlOiBzdHJpbmcsIHdhcm5pbmc6IHN0cmluZykgPT4gdm9pZDtcblxuaWYgKERFVl9NT0RFKSB7XG4gIGdsb2JhbC5saXRJc3N1ZWRXYXJuaW5ncyA/Pz0gbmV3IFNldCgpO1xuXG4gIC8vIElzc3VlIGEgd2FybmluZywgaWYgd2UgaGF2ZW4ndCBhbHJlYWR5LlxuICBpc3N1ZVdhcm5pbmcgPSAoY29kZTogc3RyaW5nLCB3YXJuaW5nOiBzdHJpbmcpID0+IHtcbiAgICB3YXJuaW5nICs9IGNvZGVcbiAgICAgID8gYCBTZWUgaHR0cHM6Ly9saXQuZGV2L21zZy8ke2NvZGV9IGZvciBtb3JlIGluZm9ybWF0aW9uLmBcbiAgICAgIDogJyc7XG4gICAgaWYgKCFnbG9iYWwubGl0SXNzdWVkV2FybmluZ3MhLmhhcyh3YXJuaW5nKSkge1xuICAgICAgY29uc29sZS53YXJuKHdhcm5pbmcpO1xuICAgICAgZ2xvYmFsLmxpdElzc3VlZFdhcm5pbmdzIS5hZGQod2FybmluZyk7XG4gICAgfVxuICB9O1xuXG4gIGlzc3VlV2FybmluZyhcbiAgICAnZGV2LW1vZGUnLFxuICAgIGBMaXQgaXMgaW4gZGV2IG1vZGUuIE5vdCByZWNvbW1lbmRlZCBmb3IgcHJvZHVjdGlvbiFgXG4gICk7XG59XG5cbmNvbnN0IHdyYXAgPVxuICBFTkFCTEVfU0hBRFlET01fTk9QQVRDSCAmJlxuICBnbG9iYWwuU2hhZHlET00/LmluVXNlICYmXG4gIGdsb2JhbC5TaGFkeURPTT8ubm9QYXRjaCA9PT0gdHJ1ZVxuICAgID8gKGdsb2JhbC5TaGFkeURPTSEud3JhcCBhcyA8VCBleHRlbmRzIE5vZGU+KG5vZGU6IFQpID0+IFQpXG4gICAgOiA8VCBleHRlbmRzIE5vZGU+KG5vZGU6IFQpID0+IG5vZGU7XG5cbmNvbnN0IHRydXN0ZWRUeXBlcyA9IChnbG9iYWwgYXMgdW5rbm93biBhcyBXaW5kb3cpLnRydXN0ZWRUeXBlcztcblxuLyoqXG4gKiBPdXIgVHJ1c3RlZFR5cGVQb2xpY3kgZm9yIEhUTUwgd2hpY2ggaXMgZGVjbGFyZWQgdXNpbmcgdGhlIGh0bWwgdGVtcGxhdGVcbiAqIHRhZyBmdW5jdGlvbi5cbiAqXG4gKiBUaGF0IEhUTUwgaXMgYSBkZXZlbG9wZXItYXV0aG9yZWQgY29uc3RhbnQsIGFuZCBpcyBwYXJzZWQgd2l0aCBpbm5lckhUTUxcbiAqIGJlZm9yZSBhbnkgdW50cnVzdGVkIGV4cHJlc3Npb25zIGhhdmUgYmVlbiBtaXhlZCBpbi4gVGhlcmVmb3IgaXQgaXNcbiAqIGNvbnNpZGVyZWQgc2FmZSBieSBjb25zdHJ1Y3Rpb24uXG4gKi9cbmNvbnN0IHBvbGljeSA9IHRydXN0ZWRUeXBlc1xuICA/IHRydXN0ZWRUeXBlcy5jcmVhdGVQb2xpY3koJ2xpdC1odG1sJywge1xuICAgICAgY3JlYXRlSFRNTDogKHMpID0+IHMsXG4gICAgfSlcbiAgOiB1bmRlZmluZWQ7XG5cbi8qKlxuICogVXNlZCB0byBzYW5pdGl6ZSBhbnkgdmFsdWUgYmVmb3JlIGl0IGlzIHdyaXR0ZW4gaW50byB0aGUgRE9NLiBUaGlzIGNhbiBiZVxuICogdXNlZCB0byBpbXBsZW1lbnQgYSBzZWN1cml0eSBwb2xpY3kgb2YgYWxsb3dlZCBhbmQgZGlzYWxsb3dlZCB2YWx1ZXMgaW5cbiAqIG9yZGVyIHRvIHByZXZlbnQgWFNTIGF0dGFja3MuXG4gKlxuICogT25lIHdheSBvZiB1c2luZyB0aGlzIGNhbGxiYWNrIHdvdWxkIGJlIHRvIGNoZWNrIGF0dHJpYnV0ZXMgYW5kIHByb3BlcnRpZXNcbiAqIGFnYWluc3QgYSBsaXN0IG9mIGhpZ2ggcmlzayBmaWVsZHMsIGFuZCByZXF1aXJlIHRoYXQgdmFsdWVzIHdyaXR0ZW4gdG8gc3VjaFxuICogZmllbGRzIGJlIGluc3RhbmNlcyBvZiBhIGNsYXNzIHdoaWNoIGlzIHNhZmUgYnkgY29uc3RydWN0aW9uLiBDbG9zdXJlJ3MgU2FmZVxuICogSFRNTCBUeXBlcyBpcyBvbmUgaW1wbGVtZW50YXRpb24gb2YgdGhpcyB0ZWNobmlxdWUgKFxuICogaHR0cHM6Ly9naXRodWIuY29tL2dvb2dsZS9zYWZlLWh0bWwtdHlwZXMvYmxvYi9tYXN0ZXIvZG9jL3NhZmVodG1sLXR5cGVzLm1kKS5cbiAqIFRoZSBUcnVzdGVkVHlwZXMgcG9seWZpbGwgaW4gQVBJLW9ubHkgbW9kZSBjb3VsZCBhbHNvIGJlIHVzZWQgYXMgYSBiYXNpc1xuICogZm9yIHRoaXMgdGVjaG5pcXVlIChodHRwczovL2dpdGh1Yi5jb20vV0lDRy90cnVzdGVkLXR5cGVzKS5cbiAqXG4gKiBAcGFyYW0gbm9kZSBUaGUgSFRNTCBub2RlICh1c3VhbGx5IGVpdGhlciBhICN0ZXh0IG5vZGUgb3IgYW4gRWxlbWVudCkgdGhhdFxuICogICAgIGlzIGJlaW5nIHdyaXR0ZW4gdG8uIE5vdGUgdGhhdCB0aGlzIGlzIGp1c3QgYW4gZXhlbXBsYXIgbm9kZSwgdGhlIHdyaXRlXG4gKiAgICAgbWF5IHRha2UgcGxhY2UgYWdhaW5zdCBhbm90aGVyIGluc3RhbmNlIG9mIHRoZSBzYW1lIGNsYXNzIG9mIG5vZGUuXG4gKiBAcGFyYW0gbmFtZSBUaGUgbmFtZSBvZiBhbiBhdHRyaWJ1dGUgb3IgcHJvcGVydHkgKGZvciBleGFtcGxlLCAnaHJlZicpLlxuICogQHBhcmFtIHR5cGUgSW5kaWNhdGVzIHdoZXRoZXIgdGhlIHdyaXRlIHRoYXQncyBhYm91dCB0byBiZSBwZXJmb3JtZWQgd2lsbFxuICogICAgIGJlIHRvIGEgcHJvcGVydHkgb3IgYSBub2RlLlxuICogQHJldHVybiBBIGZ1bmN0aW9uIHRoYXQgd2lsbCBzYW5pdGl6ZSB0aGlzIGNsYXNzIG9mIHdyaXRlcy5cbiAqL1xuZXhwb3J0IHR5cGUgU2FuaXRpemVyRmFjdG9yeSA9IChcbiAgbm9kZTogTm9kZSxcbiAgbmFtZTogc3RyaW5nLFxuICB0eXBlOiAncHJvcGVydHknIHwgJ2F0dHJpYnV0ZSdcbikgPT4gVmFsdWVTYW5pdGl6ZXI7XG5cbi8qKlxuICogQSBmdW5jdGlvbiB3aGljaCBjYW4gc2FuaXRpemUgdmFsdWVzIHRoYXQgd2lsbCBiZSB3cml0dGVuIHRvIGEgc3BlY2lmaWMga2luZFxuICogb2YgRE9NIHNpbmsuXG4gKlxuICogU2VlIFNhbml0aXplckZhY3RvcnkuXG4gKlxuICogQHBhcmFtIHZhbHVlIFRoZSB2YWx1ZSB0byBzYW5pdGl6ZS4gV2lsbCBiZSB0aGUgYWN0dWFsIHZhbHVlIHBhc3NlZCBpbnRvXG4gKiAgICAgdGhlIGxpdC1odG1sIHRlbXBsYXRlIGxpdGVyYWwsIHNvIHRoaXMgY291bGQgYmUgb2YgYW55IHR5cGUuXG4gKiBAcmV0dXJuIFRoZSB2YWx1ZSB0byB3cml0ZSB0byB0aGUgRE9NLiBVc3VhbGx5IHRoZSBzYW1lIGFzIHRoZSBpbnB1dCB2YWx1ZSxcbiAqICAgICB1bmxlc3Mgc2FuaXRpemF0aW9uIGlzIG5lZWRlZC5cbiAqL1xuZXhwb3J0IHR5cGUgVmFsdWVTYW5pdGl6ZXIgPSAodmFsdWU6IHVua25vd24pID0+IHVua25vd247XG5cbmNvbnN0IGlkZW50aXR5RnVuY3Rpb246IFZhbHVlU2FuaXRpemVyID0gKHZhbHVlOiB1bmtub3duKSA9PiB2YWx1ZTtcbmNvbnN0IG5vb3BTYW5pdGl6ZXI6IFNhbml0aXplckZhY3RvcnkgPSAoXG4gIF9ub2RlOiBOb2RlLFxuICBfbmFtZTogc3RyaW5nLFxuICBfdHlwZTogJ3Byb3BlcnR5JyB8ICdhdHRyaWJ1dGUnXG4pID0+IGlkZW50aXR5RnVuY3Rpb247XG5cbi8qKiBTZXRzIHRoZSBnbG9iYWwgc2FuaXRpemVyIGZhY3RvcnkuICovXG5jb25zdCBzZXRTYW5pdGl6ZXIgPSAobmV3U2FuaXRpemVyOiBTYW5pdGl6ZXJGYWN0b3J5KSA9PiB7XG4gIGlmICghRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwgIT09IG5vb3BTYW5pdGl6ZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgQXR0ZW1wdGVkIHRvIG92ZXJ3cml0ZSBleGlzdGluZyBsaXQtaHRtbCBzZWN1cml0eSBwb2xpY3kuYCArXG4gICAgICAgIGAgc2V0U2FuaXRpemVET01WYWx1ZUZhY3Rvcnkgc2hvdWxkIGJlIGNhbGxlZCBhdCBtb3N0IG9uY2UuYFxuICAgICk7XG4gIH1cbiAgc2FuaXRpemVyRmFjdG9yeUludGVybmFsID0gbmV3U2FuaXRpemVyO1xufTtcblxuLyoqXG4gKiBPbmx5IHVzZWQgaW4gaW50ZXJuYWwgdGVzdHMsIG5vdCBhIHBhcnQgb2YgdGhlIHB1YmxpYyBBUEkuXG4gKi9cbmNvbnN0IF90ZXN0T25seUNsZWFyU2FuaXRpemVyRmFjdG9yeURvTm90Q2FsbE9yRWxzZSA9ICgpID0+IHtcbiAgc2FuaXRpemVyRmFjdG9yeUludGVybmFsID0gbm9vcFNhbml0aXplcjtcbn07XG5cbmNvbnN0IGNyZWF0ZVNhbml0aXplcjogU2FuaXRpemVyRmFjdG9yeSA9IChub2RlLCBuYW1lLCB0eXBlKSA9PiB7XG4gIHJldHVybiBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwobm9kZSwgbmFtZSwgdHlwZSk7XG59O1xuXG4vLyBBZGRlZCB0byBhbiBhdHRyaWJ1dGUgbmFtZSB0byBtYXJrIHRoZSBhdHRyaWJ1dGUgYXMgYm91bmQgc28gd2UgY2FuIGZpbmRcbi8vIGl0IGVhc2lseS5cbmNvbnN0IGJvdW5kQXR0cmlidXRlU3VmZml4ID0gJyRsaXQkJztcblxuLy8gVGhpcyBtYXJrZXIgaXMgdXNlZCBpbiBtYW55IHN5bnRhY3RpYyBwb3NpdGlvbnMgaW4gSFRNTCwgc28gaXQgbXVzdCBiZVxuLy8gYSB2YWxpZCBlbGVtZW50IG5hbWUgYW5kIGF0dHJpYnV0ZSBuYW1lLiBXZSBkb24ndCBzdXBwb3J0IGR5bmFtaWMgbmFtZXMgKHlldClcbi8vIGJ1dCB0aGlzIGF0IGxlYXN0IGVuc3VyZXMgdGhhdCB0aGUgcGFyc2UgdHJlZSBpcyBjbG9zZXIgdG8gdGhlIHRlbXBsYXRlXG4vLyBpbnRlbnRpb24uXG5jb25zdCBtYXJrZXIgPSBgbGl0JCR7U3RyaW5nKE1hdGgucmFuZG9tKCkpLnNsaWNlKDkpfSRgO1xuXG4vLyBTdHJpbmcgdXNlZCB0byB0ZWxsIGlmIGEgY29tbWVudCBpcyBhIG1hcmtlciBjb21tZW50XG5jb25zdCBtYXJrZXJNYXRjaCA9ICc/JyArIG1hcmtlcjtcblxuLy8gVGV4dCB1c2VkIHRvIGluc2VydCBhIGNvbW1lbnQgbWFya2VyIG5vZGUuIFdlIHVzZSBwcm9jZXNzaW5nIGluc3RydWN0aW9uXG4vLyBzeW50YXggYmVjYXVzZSBpdCdzIHNsaWdodGx5IHNtYWxsZXIsIGJ1dCBwYXJzZXMgYXMgYSBjb21tZW50IG5vZGUuXG5jb25zdCBub2RlTWFya2VyID0gYDwke21hcmtlck1hdGNofT5gO1xuXG5jb25zdCBkID1cbiAgTk9ERV9NT0RFICYmIGdsb2JhbC5kb2N1bWVudCA9PT0gdW5kZWZpbmVkXG4gICAgPyAoe1xuICAgICAgICBjcmVhdGVUcmVlV2Fsa2VyKCkge1xuICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfSxcbiAgICAgIH0gYXMgdW5rbm93biBhcyBEb2N1bWVudClcbiAgICA6IGRvY3VtZW50O1xuXG4vLyBDcmVhdGVzIGEgZHluYW1pYyBtYXJrZXIuIFdlIG5ldmVyIGhhdmUgdG8gc2VhcmNoIGZvciB0aGVzZSBpbiB0aGUgRE9NLlxuY29uc3QgY3JlYXRlTWFya2VyID0gKCkgPT4gZC5jcmVhdGVDb21tZW50KCcnKTtcblxuLy8gaHR0cHM6Ly90YzM5LmdpdGh1Yi5pby9lY21hMjYyLyNzZWMtdHlwZW9mLW9wZXJhdG9yXG50eXBlIFByaW1pdGl2ZSA9IG51bGwgfCB1bmRlZmluZWQgfCBib29sZWFuIHwgbnVtYmVyIHwgc3RyaW5nIHwgc3ltYm9sIHwgYmlnaW50O1xuY29uc3QgaXNQcmltaXRpdmUgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBQcmltaXRpdmUgPT5cbiAgdmFsdWUgPT09IG51bGwgfHwgKHR5cGVvZiB2YWx1ZSAhPSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsdWUgIT0gJ2Z1bmN0aW9uJyk7XG5jb25zdCBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcbmNvbnN0IGlzSXRlcmFibGUgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBJdGVyYWJsZTx1bmtub3duPiA9PlxuICBpc0FycmF5KHZhbHVlKSB8fFxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICB0eXBlb2YgKHZhbHVlIGFzIGFueSk/LltTeW1ib2wuaXRlcmF0b3JdID09PSAnZnVuY3Rpb24nO1xuXG5jb25zdCBTUEFDRV9DSEFSID0gYFsgXFx0XFxuXFxmXFxyXWA7XG5jb25zdCBBVFRSX1ZBTFVFX0NIQVIgPSBgW14gXFx0XFxuXFxmXFxyXCInXFxgPD49XWA7XG5jb25zdCBOQU1FX0NIQVIgPSBgW15cXFxcc1wiJz49L11gO1xuXG4vLyBUaGVzZSByZWdleGVzIHJlcHJlc2VudCB0aGUgZml2ZSBwYXJzaW5nIHN0YXRlcyB0aGF0IHdlIGNhcmUgYWJvdXQgaW4gdGhlXG4vLyBUZW1wbGF0ZSdzIEhUTUwgc2Nhbm5lci4gVGhleSBtYXRjaCB0aGUgKmVuZCogb2YgdGhlIHN0YXRlIHRoZXkncmUgbmFtZWRcbi8vIGFmdGVyLlxuLy8gRGVwZW5kaW5nIG9uIHRoZSBtYXRjaCwgd2UgdHJhbnNpdGlvbiB0byBhIG5ldyBzdGF0ZS4gSWYgdGhlcmUncyBubyBtYXRjaCxcbi8vIHdlIHN0YXkgaW4gdGhlIHNhbWUgc3RhdGUuXG4vLyBOb3RlIHRoYXQgdGhlIHJlZ2V4ZXMgYXJlIHN0YXRlZnVsLiBXZSB1dGlsaXplIGxhc3RJbmRleCBhbmQgc3luYyBpdFxuLy8gYWNyb3NzIHRoZSBtdWx0aXBsZSByZWdleGVzIHVzZWQuIEluIGFkZGl0aW9uIHRvIHRoZSBmaXZlIHJlZ2V4ZXMgYmVsb3dcbi8vIHdlIGFsc28gZHluYW1pY2FsbHkgY3JlYXRlIGEgcmVnZXggdG8gZmluZCB0aGUgbWF0Y2hpbmcgZW5kIHRhZ3MgZm9yIHJhd1xuLy8gdGV4dCBlbGVtZW50cy5cblxuLyoqXG4gKiBFbmQgb2YgdGV4dCBpczogYDxgIGZvbGxvd2VkIGJ5OlxuICogICAoY29tbWVudCBzdGFydCkgb3IgKHRhZykgb3IgKGR5bmFtaWMgdGFnIGJpbmRpbmcpXG4gKi9cbmNvbnN0IHRleHRFbmRSZWdleCA9IC88KD86KCEtLXxcXC9bXmEtekEtWl0pfChcXC8/W2EtekEtWl1bXj5cXHNdKil8KFxcLz8kKSkvZztcbmNvbnN0IENPTU1FTlRfU1RBUlQgPSAxO1xuY29uc3QgVEFHX05BTUUgPSAyO1xuY29uc3QgRFlOQU1JQ19UQUdfTkFNRSA9IDM7XG5cbmNvbnN0IGNvbW1lbnRFbmRSZWdleCA9IC8tLT4vZztcbi8qKlxuICogQ29tbWVudHMgbm90IHN0YXJ0ZWQgd2l0aCA8IS0tLCBsaWtlIDwveywgY2FuIGJlIGVuZGVkIGJ5IGEgc2luZ2xlIGA+YFxuICovXG5jb25zdCBjb21tZW50MkVuZFJlZ2V4ID0gLz4vZztcblxuLyoqXG4gKiBUaGUgdGFnRW5kIHJlZ2V4IG1hdGNoZXMgdGhlIGVuZCBvZiB0aGUgXCJpbnNpZGUgYW4gb3BlbmluZ1wiIHRhZyBzeW50YXhcbiAqIHBvc2l0aW9uLiBJdCBlaXRoZXIgbWF0Y2hlcyBhIGA+YCwgYW4gYXR0cmlidXRlLWxpa2Ugc2VxdWVuY2UsIG9yIHRoZSBlbmRcbiAqIG9mIHRoZSBzdHJpbmcgYWZ0ZXIgYSBzcGFjZSAoYXR0cmlidXRlLW5hbWUgcG9zaXRpb24gZW5kaW5nKS5cbiAqXG4gKiBTZWUgYXR0cmlidXRlcyBpbiB0aGUgSFRNTCBzcGVjOlxuICogaHR0cHM6Ly93d3cudzMub3JnL1RSL2h0bWw1L3N5bnRheC5odG1sI2VsZW1lbnRzLWF0dHJpYnV0ZXNcbiAqXG4gKiBcIiBcXHRcXG5cXGZcXHJcIiBhcmUgSFRNTCBzcGFjZSBjaGFyYWN0ZXJzOlxuICogaHR0cHM6Ly9pbmZyYS5zcGVjLndoYXR3Zy5vcmcvI2FzY2lpLXdoaXRlc3BhY2VcbiAqXG4gKiBTbyBhbiBhdHRyaWJ1dGUgaXM6XG4gKiAgKiBUaGUgbmFtZTogYW55IGNoYXJhY3RlciBleGNlcHQgYSB3aGl0ZXNwYWNlIGNoYXJhY3RlciwgKFwiKSwgKCcpLCBcIj5cIixcbiAqICAgIFwiPVwiLCBvciBcIi9cIi4gTm90ZTogdGhpcyBpcyBkaWZmZXJlbnQgZnJvbSB0aGUgSFRNTCBzcGVjIHdoaWNoIGFsc28gZXhjbHVkZXMgY29udHJvbCBjaGFyYWN0ZXJzLlxuICogICogRm9sbG93ZWQgYnkgemVybyBvciBtb3JlIHNwYWNlIGNoYXJhY3RlcnNcbiAqICAqIEZvbGxvd2VkIGJ5IFwiPVwiXG4gKiAgKiBGb2xsb3dlZCBieSB6ZXJvIG9yIG1vcmUgc3BhY2UgY2hhcmFjdGVyc1xuICogICogRm9sbG93ZWQgYnk6XG4gKiAgICAqIEFueSBjaGFyYWN0ZXIgZXhjZXB0IHNwYWNlLCAoJyksIChcIiksIFwiPFwiLCBcIj5cIiwgXCI9XCIsIChgKSwgb3JcbiAqICAgICogKFwiKSB0aGVuIGFueSBub24tKFwiKSwgb3JcbiAqICAgICogKCcpIHRoZW4gYW55IG5vbi0oJylcbiAqL1xuY29uc3QgdGFnRW5kUmVnZXggPSBuZXcgUmVnRXhwKFxuICBgPnwke1NQQUNFX0NIQVJ9KD86KCR7TkFNRV9DSEFSfSspKCR7U1BBQ0VfQ0hBUn0qPSR7U1BBQ0VfQ0hBUn0qKD86JHtBVFRSX1ZBTFVFX0NIQVJ9fChcInwnKXwpKXwkKWAsXG4gICdnJ1xuKTtcbmNvbnN0IEVOVElSRV9NQVRDSCA9IDA7XG5jb25zdCBBVFRSSUJVVEVfTkFNRSA9IDE7XG5jb25zdCBTUEFDRVNfQU5EX0VRVUFMUyA9IDI7XG5jb25zdCBRVU9URV9DSEFSID0gMztcblxuY29uc3Qgc2luZ2xlUXVvdGVBdHRyRW5kUmVnZXggPSAvJy9nO1xuY29uc3QgZG91YmxlUXVvdGVBdHRyRW5kUmVnZXggPSAvXCIvZztcbi8qKlxuICogTWF0Y2hlcyB0aGUgcmF3IHRleHQgZWxlbWVudHMuXG4gKlxuICogQ29tbWVudHMgYXJlIG5vdCBwYXJzZWQgd2l0aGluIHJhdyB0ZXh0IGVsZW1lbnRzLCBzbyB3ZSBuZWVkIHRvIHNlYXJjaCB0aGVpclxuICogdGV4dCBjb250ZW50IGZvciBtYXJrZXIgc3RyaW5ncy5cbiAqL1xuY29uc3QgcmF3VGV4dEVsZW1lbnQgPSAvXig/OnNjcmlwdHxzdHlsZXx0ZXh0YXJlYXx0aXRsZSkkL2k7XG5cbi8qKiBUZW1wbGF0ZVJlc3VsdCB0eXBlcyAqL1xuY29uc3QgSFRNTF9SRVNVTFQgPSAxO1xuY29uc3QgU1ZHX1JFU1VMVCA9IDI7XG5cbnR5cGUgUmVzdWx0VHlwZSA9IHR5cGVvZiBIVE1MX1JFU1VMVCB8IHR5cGVvZiBTVkdfUkVTVUxUO1xuXG4vLyBUZW1wbGF0ZVBhcnQgdHlwZXNcbi8vIElNUE9SVEFOVDogdGhlc2UgbXVzdCBtYXRjaCB0aGUgdmFsdWVzIGluIFBhcnRUeXBlXG5jb25zdCBBVFRSSUJVVEVfUEFSVCA9IDE7XG5jb25zdCBDSElMRF9QQVJUID0gMjtcbmNvbnN0IFBST1BFUlRZX1BBUlQgPSAzO1xuY29uc3QgQk9PTEVBTl9BVFRSSUJVVEVfUEFSVCA9IDQ7XG5jb25zdCBFVkVOVF9QQVJUID0gNTtcbmNvbnN0IEVMRU1FTlRfUEFSVCA9IDY7XG5jb25zdCBDT01NRU5UX1BBUlQgPSA3O1xuXG4vKipcbiAqIFRoZSByZXR1cm4gdHlwZSBvZiB0aGUgdGVtcGxhdGUgdGFnIGZ1bmN0aW9ucywge0BsaW5rY29kZSBodG1sfSBhbmRcbiAqIHtAbGlua2NvZGUgc3ZnfSB3aGVuIGl0IGhhc24ndCBiZWVuIGNvbXBpbGVkIGJ5IEBsaXQtbGFicy9jb21waWxlci5cbiAqXG4gKiBBIGBUZW1wbGF0ZVJlc3VsdGAgb2JqZWN0IGhvbGRzIGFsbCB0aGUgaW5mb3JtYXRpb24gYWJvdXQgYSB0ZW1wbGF0ZVxuICogZXhwcmVzc2lvbiByZXF1aXJlZCB0byByZW5kZXIgaXQ6IHRoZSB0ZW1wbGF0ZSBzdHJpbmdzLCBleHByZXNzaW9uIHZhbHVlcyxcbiAqIGFuZCB0eXBlIG9mIHRlbXBsYXRlIChodG1sIG9yIHN2ZykuXG4gKlxuICogYFRlbXBsYXRlUmVzdWx0YCBvYmplY3RzIGRvIG5vdCBjcmVhdGUgYW55IERPTSBvbiB0aGVpciBvd24uIFRvIGNyZWF0ZSBvclxuICogdXBkYXRlIERPTSB5b3UgbmVlZCB0byByZW5kZXIgdGhlIGBUZW1wbGF0ZVJlc3VsdGAuIFNlZVxuICogW1JlbmRlcmluZ10oaHR0cHM6Ly9saXQuZGV2L2RvY3MvY29tcG9uZW50cy9yZW5kZXJpbmcpIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICpcbiAqL1xuZXhwb3J0IHR5cGUgVW5jb21waWxlZFRlbXBsYXRlUmVzdWx0PFQgZXh0ZW5kcyBSZXN1bHRUeXBlID0gUmVzdWx0VHlwZT4gPSB7XG4gIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gIFsnXyRsaXRUeXBlJCddOiBUO1xuICBzdHJpbmdzOiBUZW1wbGF0ZVN0cmluZ3NBcnJheTtcbiAgdmFsdWVzOiB1bmtub3duW107XG59O1xuXG4vKipcbiAqIFRoaXMgaXMgYSB0ZW1wbGF0ZSByZXN1bHQgdGhhdCBtYXkgYmUgZWl0aGVyIHVuY29tcGlsZWQgb3IgY29tcGlsZWQuXG4gKlxuICogSW4gdGhlIGZ1dHVyZSwgVGVtcGxhdGVSZXN1bHQgd2lsbCBiZSB0aGlzIHR5cGUuIElmIHlvdSB3YW50IHRvIGV4cGxpY2l0bHlcbiAqIG5vdGUgdGhhdCBhIHRlbXBsYXRlIHJlc3VsdCBpcyBwb3RlbnRpYWxseSBjb21waWxlZCwgeW91IGNhbiByZWZlcmVuY2UgdGhpc1xuICogdHlwZSBhbmQgaXQgd2lsbCBjb250aW51ZSB0byBiZWhhdmUgdGhlIHNhbWUgdGhyb3VnaCB0aGUgbmV4dCBtYWpvciB2ZXJzaW9uXG4gKiBvZiBMaXQuIFRoaXMgY2FuIGJlIHVzZWZ1bCBmb3IgY29kZSB0aGF0IHdhbnRzIHRvIHByZXBhcmUgZm9yIHRoZSBuZXh0XG4gKiBtYWpvciB2ZXJzaW9uIG9mIExpdC5cbiAqL1xuZXhwb3J0IHR5cGUgTWF5YmVDb21waWxlZFRlbXBsYXRlUmVzdWx0PFQgZXh0ZW5kcyBSZXN1bHRUeXBlID0gUmVzdWx0VHlwZT4gPVxuICB8IFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdDxUPlxuICB8IENvbXBpbGVkVGVtcGxhdGVSZXN1bHQ7XG5cbi8qKlxuICogVGhlIHJldHVybiB0eXBlIG9mIHRoZSB0ZW1wbGF0ZSB0YWcgZnVuY3Rpb25zLCB7QGxpbmtjb2RlIGh0bWx9IGFuZFxuICoge0BsaW5rY29kZSBzdmd9LlxuICpcbiAqIEEgYFRlbXBsYXRlUmVzdWx0YCBvYmplY3QgaG9sZHMgYWxsIHRoZSBpbmZvcm1hdGlvbiBhYm91dCBhIHRlbXBsYXRlXG4gKiBleHByZXNzaW9uIHJlcXVpcmVkIHRvIHJlbmRlciBpdDogdGhlIHRlbXBsYXRlIHN0cmluZ3MsIGV4cHJlc3Npb24gdmFsdWVzLFxuICogYW5kIHR5cGUgb2YgdGVtcGxhdGUgKGh0bWwgb3Igc3ZnKS5cbiAqXG4gKiBgVGVtcGxhdGVSZXN1bHRgIG9iamVjdHMgZG8gbm90IGNyZWF0ZSBhbnkgRE9NIG9uIHRoZWlyIG93bi4gVG8gY3JlYXRlIG9yXG4gKiB1cGRhdGUgRE9NIHlvdSBuZWVkIHRvIHJlbmRlciB0aGUgYFRlbXBsYXRlUmVzdWx0YC4gU2VlXG4gKiBbUmVuZGVyaW5nXShodHRwczovL2xpdC5kZXYvZG9jcy9jb21wb25lbnRzL3JlbmRlcmluZykgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKlxuICogSW4gTGl0IDQsIHRoaXMgdHlwZSB3aWxsIGJlIGFuIGFsaWFzIG9mXG4gKiBNYXliZUNvbXBpbGVkVGVtcGxhdGVSZXN1bHQsIHNvIHRoYXQgY29kZSB3aWxsIGdldCB0eXBlIGVycm9ycyBpZiBpdCBhc3N1bWVzXG4gKiB0aGF0IExpdCB0ZW1wbGF0ZXMgYXJlIG5vdCBjb21waWxlZC4gV2hlbiBkZWxpYmVyYXRlbHkgd29ya2luZyB3aXRoIG9ubHlcbiAqIG9uZSwgdXNlIGVpdGhlciB7QGxpbmtjb2RlIENvbXBpbGVkVGVtcGxhdGVSZXN1bHR9IG9yXG4gKiB7QGxpbmtjb2RlIFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdH0gZXhwbGljaXRseS5cbiAqL1xuZXhwb3J0IHR5cGUgVGVtcGxhdGVSZXN1bHQ8VCBleHRlbmRzIFJlc3VsdFR5cGUgPSBSZXN1bHRUeXBlPiA9XG4gIFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdDxUPjtcblxuZXhwb3J0IHR5cGUgSFRNTFRlbXBsYXRlUmVzdWx0ID0gVGVtcGxhdGVSZXN1bHQ8dHlwZW9mIEhUTUxfUkVTVUxUPjtcblxuZXhwb3J0IHR5cGUgU1ZHVGVtcGxhdGVSZXN1bHQgPSBUZW1wbGF0ZVJlc3VsdDx0eXBlb2YgU1ZHX1JFU1VMVD47XG5cbi8qKlxuICogQSBUZW1wbGF0ZVJlc3VsdCB0aGF0IGhhcyBiZWVuIGNvbXBpbGVkIGJ5IEBsaXQtbGFicy9jb21waWxlciwgc2tpcHBpbmcgdGhlXG4gKiBwcmVwYXJlIHN0ZXAuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdCB7XG4gIC8vIFRoaXMgaXMgYSBmYWN0b3J5IGluIG9yZGVyIHRvIG1ha2UgdGVtcGxhdGUgaW5pdGlhbGl6YXRpb24gbGF6eVxuICAvLyBhbmQgYWxsb3cgU2hhZHlSZW5kZXJPcHRpb25zIHNjb3BlIHRvIGJlIHBhc3NlZCBpbi5cbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgWydfJGxpdFR5cGUkJ106IENvbXBpbGVkVGVtcGxhdGU7XG4gIHZhbHVlczogdW5rbm93bltdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVkVGVtcGxhdGUgZXh0ZW5kcyBPbWl0PFRlbXBsYXRlLCAnZWwnPiB7XG4gIC8vIGVsIGlzIG92ZXJyaWRkZW4gdG8gYmUgb3B0aW9uYWwuIFdlIGluaXRpYWxpemUgaXQgb24gZmlyc3QgcmVuZGVyXG4gIGVsPzogSFRNTFRlbXBsYXRlRWxlbWVudDtcblxuICAvLyBUaGUgcHJlcGFyZWQgSFRNTCBzdHJpbmcgdG8gY3JlYXRlIGEgdGVtcGxhdGUgZWxlbWVudCBmcm9tLlxuICAvLyBUaGUgdHlwZSBpcyBhIFRlbXBsYXRlU3RyaW5nc0FycmF5IHRvIGd1YXJhbnRlZSB0aGF0IHRoZSB2YWx1ZSBjYW1lIGZyb21cbiAgLy8gc291cmNlIGNvZGUsIHByZXZlbnRpbmcgYSBKU09OIGluamVjdGlvbiBhdHRhY2suXG4gIGg6IFRlbXBsYXRlU3RyaW5nc0FycmF5O1xufVxuXG4vKipcbiAqIEdlbmVyYXRlcyBhIHRlbXBsYXRlIGxpdGVyYWwgdGFnIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIFRlbXBsYXRlUmVzdWx0IHdpdGhcbiAqIHRoZSBnaXZlbiByZXN1bHQgdHlwZS5cbiAqL1xuY29uc3QgdGFnID1cbiAgPFQgZXh0ZW5kcyBSZXN1bHRUeXBlPih0eXBlOiBUKSA9PlxuICAoc3RyaW5nczogVGVtcGxhdGVTdHJpbmdzQXJyYXksIC4uLnZhbHVlczogdW5rbm93bltdKTogVGVtcGxhdGVSZXN1bHQ8VD4gPT4ge1xuICAgIC8vIFdhcm4gYWdhaW5zdCB0ZW1wbGF0ZXMgb2N0YWwgZXNjYXBlIHNlcXVlbmNlc1xuICAgIC8vIFdlIGRvIHRoaXMgaGVyZSByYXRoZXIgdGhhbiBpbiByZW5kZXIgc28gdGhhdCB0aGUgd2FybmluZyBpcyBjbG9zZXIgdG8gdGhlXG4gICAgLy8gdGVtcGxhdGUgZGVmaW5pdGlvbi5cbiAgICBpZiAoREVWX01PREUgJiYgc3RyaW5ncy5zb21lKChzKSA9PiBzID09PSB1bmRlZmluZWQpKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICdTb21lIHRlbXBsYXRlIHN0cmluZ3MgYXJlIHVuZGVmaW5lZC5cXG4nICtcbiAgICAgICAgICAnVGhpcyBpcyBwcm9iYWJseSBjYXVzZWQgYnkgaWxsZWdhbCBvY3RhbCBlc2NhcGUgc2VxdWVuY2VzLidcbiAgICAgICk7XG4gICAgfVxuICAgIGlmIChERVZfTU9ERSkge1xuICAgICAgLy8gSW1wb3J0IHN0YXRpYy1odG1sLmpzIHJlc3VsdHMgaW4gYSBjaXJjdWxhciBkZXBlbmRlbmN5IHdoaWNoIGczIGRvZXNuJ3RcbiAgICAgIC8vIGhhbmRsZS4gSW5zdGVhZCB3ZSBrbm93IHRoYXQgc3RhdGljIHZhbHVlcyBtdXN0IGhhdmUgdGhlIGZpZWxkXG4gICAgICAvLyBgXyRsaXRTdGF0aWMkYC5cbiAgICAgIGlmIChcbiAgICAgICAgdmFsdWVzLnNvbWUoKHZhbCkgPT4gKHZhbCBhcyB7XyRsaXRTdGF0aWMkOiB1bmtub3dufSk/LlsnXyRsaXRTdGF0aWMkJ10pXG4gICAgICApIHtcbiAgICAgICAgaXNzdWVXYXJuaW5nKFxuICAgICAgICAgICcnLFxuICAgICAgICAgIGBTdGF0aWMgdmFsdWVzICdsaXRlcmFsJyBvciAndW5zYWZlU3RhdGljJyBjYW5ub3QgYmUgdXNlZCBhcyB2YWx1ZXMgdG8gbm9uLXN0YXRpYyB0ZW1wbGF0ZXMuXFxuYCArXG4gICAgICAgICAgICBgUGxlYXNlIHVzZSB0aGUgc3RhdGljICdodG1sJyB0YWcgZnVuY3Rpb24uIFNlZSBodHRwczovL2xpdC5kZXYvZG9jcy90ZW1wbGF0ZXMvZXhwcmVzc2lvbnMvI3N0YXRpYy1leHByZXNzaW9uc2BcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgICBbJ18kbGl0VHlwZSQnXTogdHlwZSxcbiAgICAgIHN0cmluZ3MsXG4gICAgICB2YWx1ZXMsXG4gICAgfTtcbiAgfTtcblxuLyoqXG4gKiBJbnRlcnByZXRzIGEgdGVtcGxhdGUgbGl0ZXJhbCBhcyBhbiBIVE1MIHRlbXBsYXRlIHRoYXQgY2FuIGVmZmljaWVudGx5XG4gKiByZW5kZXIgdG8gYW5kIHVwZGF0ZSBhIGNvbnRhaW5lci5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgaGVhZGVyID0gKHRpdGxlOiBzdHJpbmcpID0+IGh0bWxgPGgxPiR7dGl0bGV9PC9oMT5gO1xuICogYGBgXG4gKlxuICogVGhlIGBodG1sYCB0YWcgcmV0dXJucyBhIGRlc2NyaXB0aW9uIG9mIHRoZSBET00gdG8gcmVuZGVyIGFzIGEgdmFsdWUuIEl0IGlzXG4gKiBsYXp5LCBtZWFuaW5nIG5vIHdvcmsgaXMgZG9uZSB1bnRpbCB0aGUgdGVtcGxhdGUgaXMgcmVuZGVyZWQuIFdoZW4gcmVuZGVyaW5nLFxuICogaWYgYSB0ZW1wbGF0ZSBjb21lcyBmcm9tIHRoZSBzYW1lIGV4cHJlc3Npb24gYXMgYSBwcmV2aW91c2x5IHJlbmRlcmVkIHJlc3VsdCxcbiAqIGl0J3MgZWZmaWNpZW50bHkgdXBkYXRlZCBpbnN0ZWFkIG9mIHJlcGxhY2VkLlxuICovXG5leHBvcnQgY29uc3QgaHRtbCA9IHRhZyhIVE1MX1JFU1VMVCk7XG5cbi8qKlxuICogSW50ZXJwcmV0cyBhIHRlbXBsYXRlIGxpdGVyYWwgYXMgYW4gU1ZHIGZyYWdtZW50IHRoYXQgY2FuIGVmZmljaWVudGx5XG4gKiByZW5kZXIgdG8gYW5kIHVwZGF0ZSBhIGNvbnRhaW5lci5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgcmVjdCA9IHN2Z2A8cmVjdCB3aWR0aD1cIjEwXCIgaGVpZ2h0PVwiMTBcIj48L3JlY3Q+YDtcbiAqXG4gKiBjb25zdCBteUltYWdlID0gaHRtbGBcbiAqICAgPHN2ZyB2aWV3Qm94PVwiMCAwIDEwIDEwXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPlxuICogICAgICR7cmVjdH1cbiAqICAgPC9zdmc+YDtcbiAqIGBgYFxuICpcbiAqIFRoZSBgc3ZnYCAqdGFnIGZ1bmN0aW9uKiBzaG91bGQgb25seSBiZSB1c2VkIGZvciBTVkcgZnJhZ21lbnRzLCBvciBlbGVtZW50c1xuICogdGhhdCB3b3VsZCBiZSBjb250YWluZWQgKippbnNpZGUqKiBhbiBgPHN2Zz5gIEhUTUwgZWxlbWVudC4gQSBjb21tb24gZXJyb3IgaXNcbiAqIHBsYWNpbmcgYW4gYDxzdmc+YCAqZWxlbWVudCogaW4gYSB0ZW1wbGF0ZSB0YWdnZWQgd2l0aCB0aGUgYHN2Z2AgdGFnXG4gKiBmdW5jdGlvbi4gVGhlIGA8c3ZnPmAgZWxlbWVudCBpcyBhbiBIVE1MIGVsZW1lbnQgYW5kIHNob3VsZCBiZSB1c2VkIHdpdGhpbiBhXG4gKiB0ZW1wbGF0ZSB0YWdnZWQgd2l0aCB0aGUge0BsaW5rY29kZSBodG1sfSB0YWcgZnVuY3Rpb24uXG4gKlxuICogSW4gTGl0RWxlbWVudCB1c2FnZSwgaXQncyBpbnZhbGlkIHRvIHJldHVybiBhbiBTVkcgZnJhZ21lbnQgZnJvbSB0aGVcbiAqIGByZW5kZXIoKWAgbWV0aG9kLCBhcyB0aGUgU1ZHIGZyYWdtZW50IHdpbGwgYmUgY29udGFpbmVkIHdpdGhpbiB0aGUgZWxlbWVudCdzXG4gKiBzaGFkb3cgcm9vdCBhbmQgdGh1cyBjYW5ub3QgYmUgdXNlZCB3aXRoaW4gYW4gYDxzdmc+YCBIVE1MIGVsZW1lbnQuXG4gKi9cbmV4cG9ydCBjb25zdCBzdmcgPSB0YWcoU1ZHX1JFU1VMVCk7XG5cbi8qKlxuICogQSBzZW50aW5lbCB2YWx1ZSB0aGF0IHNpZ25hbHMgdGhhdCBhIHZhbHVlIHdhcyBoYW5kbGVkIGJ5IGEgZGlyZWN0aXZlIGFuZFxuICogc2hvdWxkIG5vdCBiZSB3cml0dGVuIHRvIHRoZSBET00uXG4gKi9cbmV4cG9ydCBjb25zdCBub0NoYW5nZSA9IFN5bWJvbC5mb3IoJ2xpdC1ub0NoYW5nZScpO1xuXG4vKipcbiAqIEEgc2VudGluZWwgdmFsdWUgdGhhdCBzaWduYWxzIGEgQ2hpbGRQYXJ0IHRvIGZ1bGx5IGNsZWFyIGl0cyBjb250ZW50LlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBidXR0b24gPSBodG1sYCR7XG4gKiAgdXNlci5pc0FkbWluXG4gKiAgICA/IGh0bWxgPGJ1dHRvbj5ERUxFVEU8L2J1dHRvbj5gXG4gKiAgICA6IG5vdGhpbmdcbiAqIH1gO1xuICogYGBgXG4gKlxuICogUHJlZmVyIHVzaW5nIGBub3RoaW5nYCBvdmVyIG90aGVyIGZhbHN5IHZhbHVlcyBhcyBpdCBwcm92aWRlcyBhIGNvbnNpc3RlbnRcbiAqIGJlaGF2aW9yIGJldHdlZW4gdmFyaW91cyBleHByZXNzaW9uIGJpbmRpbmcgY29udGV4dHMuXG4gKlxuICogSW4gY2hpbGQgZXhwcmVzc2lvbnMsIGB1bmRlZmluZWRgLCBgbnVsbGAsIGAnJ2AsIGFuZCBgbm90aGluZ2AgYWxsIGJlaGF2ZSB0aGVcbiAqIHNhbWUgYW5kIHJlbmRlciBubyBub2Rlcy4gSW4gYXR0cmlidXRlIGV4cHJlc3Npb25zLCBgbm90aGluZ2AgX3JlbW92ZXNfIHRoZVxuICogYXR0cmlidXRlLCB3aGlsZSBgdW5kZWZpbmVkYCBhbmQgYG51bGxgIHdpbGwgcmVuZGVyIGFuIGVtcHR5IHN0cmluZy4gSW5cbiAqIHByb3BlcnR5IGV4cHJlc3Npb25zIGBub3RoaW5nYCBiZWNvbWVzIGB1bmRlZmluZWRgLlxuICovXG5leHBvcnQgY29uc3Qgbm90aGluZyA9IFN5bWJvbC5mb3IoJ2xpdC1ub3RoaW5nJyk7XG5cbi8qKlxuICogVGhlIGNhY2hlIG9mIHByZXBhcmVkIHRlbXBsYXRlcywga2V5ZWQgYnkgdGhlIHRhZ2dlZCBUZW1wbGF0ZVN0cmluZ3NBcnJheVxuICogYW5kIF9ub3RfIGFjY291bnRpbmcgZm9yIHRoZSBzcGVjaWZpYyB0ZW1wbGF0ZSB0YWcgdXNlZC4gVGhpcyBtZWFucyB0aGF0XG4gKiB0ZW1wbGF0ZSB0YWdzIGNhbm5vdCBiZSBkeW5hbWljIC0gdGhlIG11c3Qgc3RhdGljYWxseSBiZSBvbmUgb2YgaHRtbCwgc3ZnLFxuICogb3IgYXR0ci4gVGhpcyByZXN0cmljdGlvbiBzaW1wbGlmaWVzIHRoZSBjYWNoZSBsb29rdXAsIHdoaWNoIGlzIG9uIHRoZSBob3RcbiAqIHBhdGggZm9yIHJlbmRlcmluZy5cbiAqL1xuY29uc3QgdGVtcGxhdGVDYWNoZSA9IG5ldyBXZWFrTWFwPFRlbXBsYXRlU3RyaW5nc0FycmF5LCBUZW1wbGF0ZT4oKTtcblxuLyoqXG4gKiBPYmplY3Qgc3BlY2lmeWluZyBvcHRpb25zIGZvciBjb250cm9sbGluZyBsaXQtaHRtbCByZW5kZXJpbmcuIE5vdGUgdGhhdFxuICogd2hpbGUgYHJlbmRlcmAgbWF5IGJlIGNhbGxlZCBtdWx0aXBsZSB0aW1lcyBvbiB0aGUgc2FtZSBgY29udGFpbmVyYCAoYW5kXG4gKiBgcmVuZGVyQmVmb3JlYCByZWZlcmVuY2Ugbm9kZSkgdG8gZWZmaWNpZW50bHkgdXBkYXRlIHRoZSByZW5kZXJlZCBjb250ZW50LFxuICogb25seSB0aGUgb3B0aW9ucyBwYXNzZWQgaW4gZHVyaW5nIHRoZSBmaXJzdCByZW5kZXIgYXJlIHJlc3BlY3RlZCBkdXJpbmdcbiAqIHRoZSBsaWZldGltZSBvZiByZW5kZXJzIHRvIHRoYXQgdW5pcXVlIGBjb250YWluZXJgICsgYHJlbmRlckJlZm9yZWBcbiAqIGNvbWJpbmF0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlbmRlck9wdGlvbnMge1xuICAvKipcbiAgICogQW4gb2JqZWN0IHRvIHVzZSBhcyB0aGUgYHRoaXNgIHZhbHVlIGZvciBldmVudCBsaXN0ZW5lcnMuIEl0J3Mgb2Z0ZW5cbiAgICogdXNlZnVsIHRvIHNldCB0aGlzIHRvIHRoZSBob3N0IGNvbXBvbmVudCByZW5kZXJpbmcgYSB0ZW1wbGF0ZS5cbiAgICovXG4gIGhvc3Q/OiBvYmplY3Q7XG4gIC8qKlxuICAgKiBBIERPTSBub2RlIGJlZm9yZSB3aGljaCB0byByZW5kZXIgY29udGVudCBpbiB0aGUgY29udGFpbmVyLlxuICAgKi9cbiAgcmVuZGVyQmVmb3JlPzogQ2hpbGROb2RlIHwgbnVsbDtcbiAgLyoqXG4gICAqIE5vZGUgdXNlZCBmb3IgY2xvbmluZyB0aGUgdGVtcGxhdGUgKGBpbXBvcnROb2RlYCB3aWxsIGJlIGNhbGxlZCBvbiB0aGlzXG4gICAqIG5vZGUpLiBUaGlzIGNvbnRyb2xzIHRoZSBgb3duZXJEb2N1bWVudGAgb2YgdGhlIHJlbmRlcmVkIERPTSwgYWxvbmcgd2l0aFxuICAgKiBhbnkgaW5oZXJpdGVkIGNvbnRleHQuIERlZmF1bHRzIHRvIHRoZSBnbG9iYWwgYGRvY3VtZW50YC5cbiAgICovXG4gIGNyZWF0aW9uU2NvcGU/OiB7aW1wb3J0Tm9kZShub2RlOiBOb2RlLCBkZWVwPzogYm9vbGVhbik6IE5vZGV9O1xuICAvKipcbiAgICogVGhlIGluaXRpYWwgY29ubmVjdGVkIHN0YXRlIGZvciB0aGUgdG9wLWxldmVsIHBhcnQgYmVpbmcgcmVuZGVyZWQuIElmIG5vXG4gICAqIGBpc0Nvbm5lY3RlZGAgb3B0aW9uIGlzIHNldCwgYEFzeW5jRGlyZWN0aXZlYHMgd2lsbCBiZSBjb25uZWN0ZWQgYnlcbiAgICogZGVmYXVsdC4gU2V0IHRvIGBmYWxzZWAgaWYgdGhlIGluaXRpYWwgcmVuZGVyIG9jY3VycyBpbiBhIGRpc2Nvbm5lY3RlZCB0cmVlXG4gICAqIGFuZCBgQXN5bmNEaXJlY3RpdmVgcyBzaG91bGQgc2VlIGBpc0Nvbm5lY3RlZCA9PT0gZmFsc2VgIGZvciB0aGVpciBpbml0aWFsXG4gICAqIHJlbmRlci4gVGhlIGBwYXJ0LnNldENvbm5lY3RlZCgpYCBtZXRob2QgbXVzdCBiZSB1c2VkIHN1YnNlcXVlbnQgdG8gaW5pdGlhbFxuICAgKiByZW5kZXIgdG8gY2hhbmdlIHRoZSBjb25uZWN0ZWQgc3RhdGUgb2YgdGhlIHBhcnQuXG4gICAqL1xuICBpc0Nvbm5lY3RlZD86IGJvb2xlYW47XG59XG5cbmNvbnN0IHdhbGtlciA9IGQuY3JlYXRlVHJlZVdhbGtlcihcbiAgZCxcbiAgMTI5IC8qIE5vZGVGaWx0ZXIuU0hPV197RUxFTUVOVHxDT01NRU5UfSAqL1xuKTtcblxubGV0IHNhbml0aXplckZhY3RvcnlJbnRlcm5hbDogU2FuaXRpemVyRmFjdG9yeSA9IG5vb3BTYW5pdGl6ZXI7XG5cbi8vXG4vLyBDbGFzc2VzIG9ubHkgYmVsb3cgaGVyZSwgY29uc3QgdmFyaWFibGUgZGVjbGFyYXRpb25zIG9ubHkgYWJvdmUgaGVyZS4uLlxuLy9cbi8vIEtlZXBpbmcgdmFyaWFibGUgZGVjbGFyYXRpb25zIGFuZCBjbGFzc2VzIHRvZ2V0aGVyIGltcHJvdmVzIG1pbmlmaWNhdGlvbi5cbi8vIEludGVyZmFjZXMgYW5kIHR5cGUgYWxpYXNlcyBjYW4gYmUgaW50ZXJsZWF2ZWQgZnJlZWx5LlxuLy9cblxuLy8gVHlwZSBmb3IgY2xhc3NlcyB0aGF0IGhhdmUgYSBgX2RpcmVjdGl2ZWAgb3IgYF9kaXJlY3RpdmVzW11gIGZpZWxkLCB1c2VkIGJ5XG4vLyBgcmVzb2x2ZURpcmVjdGl2ZWBcbmV4cG9ydCBpbnRlcmZhY2UgRGlyZWN0aXZlUGFyZW50IHtcbiAgXyRwYXJlbnQ/OiBEaXJlY3RpdmVQYXJlbnQ7XG4gIF8kaXNDb25uZWN0ZWQ6IGJvb2xlYW47XG4gIF9fZGlyZWN0aXZlPzogRGlyZWN0aXZlO1xuICBfX2RpcmVjdGl2ZXM/OiBBcnJheTxEaXJlY3RpdmUgfCB1bmRlZmluZWQ+O1xufVxuXG5mdW5jdGlvbiB0cnVzdEZyb21UZW1wbGF0ZVN0cmluZyhcbiAgdHNhOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSxcbiAgc3RyaW5nRnJvbVRTQTogc3RyaW5nXG4pOiBUcnVzdGVkSFRNTCB7XG4gIC8vIEEgc2VjdXJpdHkgY2hlY2sgdG8gcHJldmVudCBzcG9vZmluZyBvZiBMaXQgdGVtcGxhdGUgcmVzdWx0cy5cbiAgLy8gSW4gdGhlIGZ1dHVyZSwgd2UgbWF5IGJlIGFibGUgdG8gcmVwbGFjZSB0aGlzIHdpdGggQXJyYXkuaXNUZW1wbGF0ZU9iamVjdCxcbiAgLy8gdGhvdWdoIHdlIG1pZ2h0IG5lZWQgdG8gbWFrZSB0aGF0IGNoZWNrIGluc2lkZSBvZiB0aGUgaHRtbCBhbmQgc3ZnXG4gIC8vIGZ1bmN0aW9ucywgYmVjYXVzZSBwcmVjb21waWxlZCB0ZW1wbGF0ZXMgZG9uJ3QgY29tZSBpbiBhc1xuICAvLyBUZW1wbGF0ZVN0cmluZ0FycmF5IG9iamVjdHMuXG4gIGlmICghQXJyYXkuaXNBcnJheSh0c2EpIHx8ICF0c2EuaGFzT3duUHJvcGVydHkoJ3JhdycpKSB7XG4gICAgbGV0IG1lc3NhZ2UgPSAnaW52YWxpZCB0ZW1wbGF0ZSBzdHJpbmdzIGFycmF5JztcbiAgICBpZiAoREVWX01PREUpIHtcbiAgICAgIG1lc3NhZ2UgPSBgXG4gICAgICAgICAgSW50ZXJuYWwgRXJyb3I6IGV4cGVjdGVkIHRlbXBsYXRlIHN0cmluZ3MgdG8gYmUgYW4gYXJyYXlcbiAgICAgICAgICB3aXRoIGEgJ3JhdycgZmllbGQuIEZha2luZyBhIHRlbXBsYXRlIHN0cmluZ3MgYXJyYXkgYnlcbiAgICAgICAgICBjYWxsaW5nIGh0bWwgb3Igc3ZnIGxpa2UgYW4gb3JkaW5hcnkgZnVuY3Rpb24gaXMgZWZmZWN0aXZlbHlcbiAgICAgICAgICB0aGUgc2FtZSBhcyBjYWxsaW5nIHVuc2FmZUh0bWwgYW5kIGNhbiBsZWFkIHRvIG1ham9yIHNlY3VyaXR5XG4gICAgICAgICAgaXNzdWVzLCBlLmcuIG9wZW5pbmcgeW91ciBjb2RlIHVwIHRvIFhTUyBhdHRhY2tzLlxuICAgICAgICAgIElmIHlvdSdyZSB1c2luZyB0aGUgaHRtbCBvciBzdmcgdGFnZ2VkIHRlbXBsYXRlIGZ1bmN0aW9ucyBub3JtYWxseVxuICAgICAgICAgIGFuZCBzdGlsbCBzZWVpbmcgdGhpcyBlcnJvciwgcGxlYXNlIGZpbGUgYSBidWcgYXRcbiAgICAgICAgICBodHRwczovL2dpdGh1Yi5jb20vbGl0L2xpdC9pc3N1ZXMvbmV3P3RlbXBsYXRlPWJ1Z19yZXBvcnQubWRcbiAgICAgICAgICBhbmQgaW5jbHVkZSBpbmZvcm1hdGlvbiBhYm91dCB5b3VyIGJ1aWxkIHRvb2xpbmcsIGlmIGFueS5cbiAgICAgICAgYFxuICAgICAgICAudHJpbSgpXG4gICAgICAgIC5yZXBsYWNlKC9cXG4gKi9nLCAnXFxuJyk7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgfVxuICByZXR1cm4gcG9saWN5ICE9PSB1bmRlZmluZWRcbiAgICA/IHBvbGljeS5jcmVhdGVIVE1MKHN0cmluZ0Zyb21UU0EpXG4gICAgOiAoc3RyaW5nRnJvbVRTQSBhcyB1bmtub3duIGFzIFRydXN0ZWRIVE1MKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIEhUTUwgc3RyaW5nIGZvciB0aGUgZ2l2ZW4gVGVtcGxhdGVTdHJpbmdzQXJyYXkgYW5kIHJlc3VsdCB0eXBlXG4gKiAoSFRNTCBvciBTVkcpLCBhbG9uZyB3aXRoIHRoZSBjYXNlLXNlbnNpdGl2ZSBib3VuZCBhdHRyaWJ1dGUgbmFtZXMgaW5cbiAqIHRlbXBsYXRlIG9yZGVyLiBUaGUgSFRNTCBjb250YWlucyBjb21tZW50IG1hcmtlcnMgZGVub3RpbmcgdGhlIGBDaGlsZFBhcnRgc1xuICogYW5kIHN1ZmZpeGVzIG9uIGJvdW5kIGF0dHJpYnV0ZXMgZGVub3RpbmcgdGhlIGBBdHRyaWJ1dGVQYXJ0c2AuXG4gKlxuICogQHBhcmFtIHN0cmluZ3MgdGVtcGxhdGUgc3RyaW5ncyBhcnJheVxuICogQHBhcmFtIHR5cGUgSFRNTCBvciBTVkdcbiAqIEByZXR1cm4gQXJyYXkgY29udGFpbmluZyBgW2h0bWwsIGF0dHJOYW1lc11gIChhcnJheSByZXR1cm5lZCBmb3IgdGVyc2VuZXNzLFxuICogICAgIHRvIGF2b2lkIG9iamVjdCBmaWVsZHMgc2luY2UgdGhpcyBjb2RlIGlzIHNoYXJlZCB3aXRoIG5vbi1taW5pZmllZCBTU1JcbiAqICAgICBjb2RlKVxuICovXG5jb25zdCBnZXRUZW1wbGF0ZUh0bWwgPSAoXG4gIHN0cmluZ3M6IFRlbXBsYXRlU3RyaW5nc0FycmF5LFxuICB0eXBlOiBSZXN1bHRUeXBlXG4pOiBbVHJ1c3RlZEhUTUwsIEFycmF5PHN0cmluZz5dID0+IHtcbiAgLy8gSW5zZXJ0IG1ha2VycyBpbnRvIHRoZSB0ZW1wbGF0ZSBIVE1MIHRvIHJlcHJlc2VudCB0aGUgcG9zaXRpb24gb2ZcbiAgLy8gYmluZGluZ3MuIFRoZSBmb2xsb3dpbmcgY29kZSBzY2FucyB0aGUgdGVtcGxhdGUgc3RyaW5ncyB0byBkZXRlcm1pbmUgdGhlXG4gIC8vIHN5bnRhY3RpYyBwb3NpdGlvbiBvZiB0aGUgYmluZGluZ3MuIFRoZXkgY2FuIGJlIGluIHRleHQgcG9zaXRpb24sIHdoZXJlXG4gIC8vIHdlIGluc2VydCBhbiBIVE1MIGNvbW1lbnQsIGF0dHJpYnV0ZSB2YWx1ZSBwb3NpdGlvbiwgd2hlcmUgd2UgaW5zZXJ0IGFcbiAgLy8gc2VudGluZWwgc3RyaW5nIGFuZCByZS13cml0ZSB0aGUgYXR0cmlidXRlIG5hbWUsIG9yIGluc2lkZSBhIHRhZyB3aGVyZVxuICAvLyB3ZSBpbnNlcnQgdGhlIHNlbnRpbmVsIHN0cmluZy5cbiAgY29uc3QgbCA9IHN0cmluZ3MubGVuZ3RoIC0gMTtcbiAgLy8gU3RvcmVzIHRoZSBjYXNlLXNlbnNpdGl2ZSBib3VuZCBhdHRyaWJ1dGUgbmFtZXMgaW4gdGhlIG9yZGVyIG9mIHRoZWlyXG4gIC8vIHBhcnRzLiBFbGVtZW50UGFydHMgYXJlIGFsc28gcmVmbGVjdGVkIGluIHRoaXMgYXJyYXkgYXMgdW5kZWZpbmVkXG4gIC8vIHJhdGhlciB0aGFuIGEgc3RyaW5nLCB0byBkaXNhbWJpZ3VhdGUgZnJvbSBhdHRyaWJ1dGUgYmluZGluZ3MuXG4gIGNvbnN0IGF0dHJOYW1lczogQXJyYXk8c3RyaW5nPiA9IFtdO1xuICBsZXQgaHRtbCA9IHR5cGUgPT09IFNWR19SRVNVTFQgPyAnPHN2Zz4nIDogJyc7XG5cbiAgLy8gV2hlbiB3ZSdyZSBpbnNpZGUgYSByYXcgdGV4dCB0YWcgKG5vdCBpdCdzIHRleHQgY29udGVudCksIHRoZSByZWdleFxuICAvLyB3aWxsIHN0aWxsIGJlIHRhZ1JlZ2V4IHNvIHdlIGNhbiBmaW5kIGF0dHJpYnV0ZXMsIGJ1dCB3aWxsIHN3aXRjaCB0b1xuICAvLyB0aGlzIHJlZ2V4IHdoZW4gdGhlIHRhZyBlbmRzLlxuICBsZXQgcmF3VGV4dEVuZFJlZ2V4OiBSZWdFeHAgfCB1bmRlZmluZWQ7XG5cbiAgLy8gVGhlIGN1cnJlbnQgcGFyc2luZyBzdGF0ZSwgcmVwcmVzZW50ZWQgYXMgYSByZWZlcmVuY2UgdG8gb25lIG9mIHRoZVxuICAvLyByZWdleGVzXG4gIGxldCByZWdleCA9IHRleHRFbmRSZWdleDtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgIGNvbnN0IHMgPSBzdHJpbmdzW2ldO1xuICAgIC8vIFRoZSBpbmRleCBvZiB0aGUgZW5kIG9mIHRoZSBsYXN0IGF0dHJpYnV0ZSBuYW1lLiBXaGVuIHRoaXMgaXNcbiAgICAvLyBwb3NpdGl2ZSBhdCBlbmQgb2YgYSBzdHJpbmcsIGl0IG1lYW5zIHdlJ3JlIGluIGFuIGF0dHJpYnV0ZSB2YWx1ZVxuICAgIC8vIHBvc2l0aW9uIGFuZCBuZWVkIHRvIHJld3JpdGUgdGhlIGF0dHJpYnV0ZSBuYW1lLlxuICAgIC8vIFdlIGFsc28gdXNlIGEgc3BlY2lhbCB2YWx1ZSBvZiAtMiB0byBpbmRpY2F0ZSB0aGF0IHdlIGVuY291bnRlcmVkXG4gICAgLy8gdGhlIGVuZCBvZiBhIHN0cmluZyBpbiBhdHRyaWJ1dGUgbmFtZSBwb3NpdGlvbi5cbiAgICBsZXQgYXR0ck5hbWVFbmRJbmRleCA9IC0xO1xuICAgIGxldCBhdHRyTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIGxldCBsYXN0SW5kZXggPSAwO1xuICAgIGxldCBtYXRjaCE6IFJlZ0V4cEV4ZWNBcnJheSB8IG51bGw7XG5cbiAgICAvLyBUaGUgY29uZGl0aW9ucyBpbiB0aGlzIGxvb3AgaGFuZGxlIHRoZSBjdXJyZW50IHBhcnNlIHN0YXRlLCBhbmQgdGhlXG4gICAgLy8gYXNzaWdubWVudHMgdG8gdGhlIGByZWdleGAgdmFyaWFibGUgYXJlIHRoZSBzdGF0ZSB0cmFuc2l0aW9ucy5cbiAgICB3aGlsZSAobGFzdEluZGV4IDwgcy5sZW5ndGgpIHtcbiAgICAgIC8vIE1ha2Ugc3VyZSB3ZSBzdGFydCBzZWFyY2hpbmcgZnJvbSB3aGVyZSB3ZSBwcmV2aW91c2x5IGxlZnQgb2ZmXG4gICAgICByZWdleC5sYXN0SW5kZXggPSBsYXN0SW5kZXg7XG4gICAgICBtYXRjaCA9IHJlZ2V4LmV4ZWMocyk7XG4gICAgICBpZiAobWF0Y2ggPT09IG51bGwpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBsYXN0SW5kZXggPSByZWdleC5sYXN0SW5kZXg7XG4gICAgICBpZiAocmVnZXggPT09IHRleHRFbmRSZWdleCkge1xuICAgICAgICBpZiAobWF0Y2hbQ09NTUVOVF9TVEFSVF0gPT09ICchLS0nKSB7XG4gICAgICAgICAgcmVnZXggPSBjb21tZW50RW5kUmVnZXg7XG4gICAgICAgIH0gZWxzZSBpZiAobWF0Y2hbQ09NTUVOVF9TVEFSVF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIFdlIHN0YXJ0ZWQgYSB3ZWlyZCBjb21tZW50LCBsaWtlIDwve1xuICAgICAgICAgIHJlZ2V4ID0gY29tbWVudDJFbmRSZWdleDtcbiAgICAgICAgfSBlbHNlIGlmIChtYXRjaFtUQUdfTkFNRV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmIChyYXdUZXh0RWxlbWVudC50ZXN0KG1hdGNoW1RBR19OQU1FXSkpIHtcbiAgICAgICAgICAgIC8vIFJlY29yZCBpZiB3ZSBlbmNvdW50ZXIgYSByYXctdGV4dCBlbGVtZW50LiBXZSdsbCBzd2l0Y2ggdG9cbiAgICAgICAgICAgIC8vIHRoaXMgcmVnZXggYXQgdGhlIGVuZCBvZiB0aGUgdGFnLlxuICAgICAgICAgICAgcmF3VGV4dEVuZFJlZ2V4ID0gbmV3IFJlZ0V4cChgPC8ke21hdGNoW1RBR19OQU1FXX1gLCAnZycpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZWdleCA9IHRhZ0VuZFJlZ2V4O1xuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoW0RZTkFNSUNfVEFHX05BTUVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAoREVWX01PREUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgJ0JpbmRpbmdzIGluIHRhZyBuYW1lcyBhcmUgbm90IHN1cHBvcnRlZC4gUGxlYXNlIHVzZSBzdGF0aWMgdGVtcGxhdGVzIGluc3RlYWQuICcgK1xuICAgICAgICAgICAgICAgICdTZWUgaHR0cHM6Ly9saXQuZGV2L2RvY3MvdGVtcGxhdGVzL2V4cHJlc3Npb25zLyNzdGF0aWMtZXhwcmVzc2lvbnMnXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZWdleCA9IHRhZ0VuZFJlZ2V4O1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHJlZ2V4ID09PSB0YWdFbmRSZWdleCkge1xuICAgICAgICBpZiAobWF0Y2hbRU5USVJFX01BVENIXSA9PT0gJz4nKSB7XG4gICAgICAgICAgLy8gRW5kIG9mIGEgdGFnLiBJZiB3ZSBoYWQgc3RhcnRlZCBhIHJhdy10ZXh0IGVsZW1lbnQsIHVzZSB0aGF0XG4gICAgICAgICAgLy8gcmVnZXhcbiAgICAgICAgICByZWdleCA9IHJhd1RleHRFbmRSZWdleCA/PyB0ZXh0RW5kUmVnZXg7XG4gICAgICAgICAgLy8gV2UgbWF5IGJlIGVuZGluZyBhbiB1bnF1b3RlZCBhdHRyaWJ1dGUgdmFsdWUsIHNvIG1ha2Ugc3VyZSB3ZVxuICAgICAgICAgIC8vIGNsZWFyIGFueSBwZW5kaW5nIGF0dHJOYW1lRW5kSW5kZXhcbiAgICAgICAgICBhdHRyTmFtZUVuZEluZGV4ID0gLTE7XG4gICAgICAgIH0gZWxzZSBpZiAobWF0Y2hbQVRUUklCVVRFX05BTUVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBBdHRyaWJ1dGUgbmFtZSBwb3NpdGlvblxuICAgICAgICAgIGF0dHJOYW1lRW5kSW5kZXggPSAtMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhdHRyTmFtZUVuZEluZGV4ID0gcmVnZXgubGFzdEluZGV4IC0gbWF0Y2hbU1BBQ0VTX0FORF9FUVVBTFNdLmxlbmd0aDtcbiAgICAgICAgICBhdHRyTmFtZSA9IG1hdGNoW0FUVFJJQlVURV9OQU1FXTtcbiAgICAgICAgICByZWdleCA9XG4gICAgICAgICAgICBtYXRjaFtRVU9URV9DSEFSXSA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgID8gdGFnRW5kUmVnZXhcbiAgICAgICAgICAgICAgOiBtYXRjaFtRVU9URV9DSEFSXSA9PT0gJ1wiJ1xuICAgICAgICAgICAgICA/IGRvdWJsZVF1b3RlQXR0ckVuZFJlZ2V4XG4gICAgICAgICAgICAgIDogc2luZ2xlUXVvdGVBdHRyRW5kUmVnZXg7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHJlZ2V4ID09PSBkb3VibGVRdW90ZUF0dHJFbmRSZWdleCB8fFxuICAgICAgICByZWdleCA9PT0gc2luZ2xlUXVvdGVBdHRyRW5kUmVnZXhcbiAgICAgICkge1xuICAgICAgICByZWdleCA9IHRhZ0VuZFJlZ2V4O1xuICAgICAgfSBlbHNlIGlmIChyZWdleCA9PT0gY29tbWVudEVuZFJlZ2V4IHx8IHJlZ2V4ID09PSBjb21tZW50MkVuZFJlZ2V4KSB7XG4gICAgICAgIHJlZ2V4ID0gdGV4dEVuZFJlZ2V4O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gTm90IG9uZSBvZiB0aGUgZml2ZSBzdGF0ZSByZWdleGVzLCBzbyBpdCBtdXN0IGJlIHRoZSBkeW5hbWljYWxseVxuICAgICAgICAvLyBjcmVhdGVkIHJhdyB0ZXh0IHJlZ2V4IGFuZCB3ZSdyZSBhdCB0aGUgY2xvc2Ugb2YgdGhhdCBlbGVtZW50LlxuICAgICAgICByZWdleCA9IHRhZ0VuZFJlZ2V4O1xuICAgICAgICByYXdUZXh0RW5kUmVnZXggPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKERFVl9NT0RFKSB7XG4gICAgICAvLyBJZiB3ZSBoYXZlIGEgYXR0ck5hbWVFbmRJbmRleCwgd2hpY2ggaW5kaWNhdGVzIHRoYXQgd2Ugc2hvdWxkXG4gICAgICAvLyByZXdyaXRlIHRoZSBhdHRyaWJ1dGUgbmFtZSwgYXNzZXJ0IHRoYXQgd2UncmUgaW4gYSB2YWxpZCBhdHRyaWJ1dGVcbiAgICAgIC8vIHBvc2l0aW9uIC0gZWl0aGVyIGluIGEgdGFnLCBvciBhIHF1b3RlZCBhdHRyaWJ1dGUgdmFsdWUuXG4gICAgICBjb25zb2xlLmFzc2VydChcbiAgICAgICAgYXR0ck5hbWVFbmRJbmRleCA9PT0gLTEgfHxcbiAgICAgICAgICByZWdleCA9PT0gdGFnRW5kUmVnZXggfHxcbiAgICAgICAgICByZWdleCA9PT0gc2luZ2xlUXVvdGVBdHRyRW5kUmVnZXggfHxcbiAgICAgICAgICByZWdleCA9PT0gZG91YmxlUXVvdGVBdHRyRW5kUmVnZXgsXG4gICAgICAgICd1bmV4cGVjdGVkIHBhcnNlIHN0YXRlIEInXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIFdlIGhhdmUgZm91ciBjYXNlczpcbiAgICAvLyAgMS4gV2UncmUgaW4gdGV4dCBwb3NpdGlvbiwgYW5kIG5vdCBpbiBhIHJhdyB0ZXh0IGVsZW1lbnRcbiAgICAvLyAgICAgKHJlZ2V4ID09PSB0ZXh0RW5kUmVnZXgpOiBpbnNlcnQgYSBjb21tZW50IG1hcmtlci5cbiAgICAvLyAgMi4gV2UgaGF2ZSBhIG5vbi1uZWdhdGl2ZSBhdHRyTmFtZUVuZEluZGV4IHdoaWNoIG1lYW5zIHdlIG5lZWQgdG9cbiAgICAvLyAgICAgcmV3cml0ZSB0aGUgYXR0cmlidXRlIG5hbWUgdG8gYWRkIGEgYm91bmQgYXR0cmlidXRlIHN1ZmZpeC5cbiAgICAvLyAgMy4gV2UncmUgYXQgdGhlIG5vbi1maXJzdCBiaW5kaW5nIGluIGEgbXVsdGktYmluZGluZyBhdHRyaWJ1dGUsIHVzZSBhXG4gICAgLy8gICAgIHBsYWluIG1hcmtlci5cbiAgICAvLyAgNC4gV2UncmUgc29tZXdoZXJlIGVsc2UgaW5zaWRlIHRoZSB0YWcuIElmIHdlJ3JlIGluIGF0dHJpYnV0ZSBuYW1lXG4gICAgLy8gICAgIHBvc2l0aW9uIChhdHRyTmFtZUVuZEluZGV4ID09PSAtMiksIGFkZCBhIHNlcXVlbnRpYWwgc3VmZml4IHRvXG4gICAgLy8gICAgIGdlbmVyYXRlIGEgdW5pcXVlIGF0dHJpYnV0ZSBuYW1lLlxuXG4gICAgLy8gRGV0ZWN0IGEgYmluZGluZyBuZXh0IHRvIHNlbGYtY2xvc2luZyB0YWcgZW5kIGFuZCBpbnNlcnQgYSBzcGFjZSB0b1xuICAgIC8vIHNlcGFyYXRlIHRoZSBtYXJrZXIgZnJvbSB0aGUgdGFnIGVuZDpcbiAgICBjb25zdCBlbmQgPVxuICAgICAgcmVnZXggPT09IHRhZ0VuZFJlZ2V4ICYmIHN0cmluZ3NbaSArIDFdLnN0YXJ0c1dpdGgoJy8+JykgPyAnICcgOiAnJztcbiAgICBodG1sICs9XG4gICAgICByZWdleCA9PT0gdGV4dEVuZFJlZ2V4XG4gICAgICAgID8gcyArIG5vZGVNYXJrZXJcbiAgICAgICAgOiBhdHRyTmFtZUVuZEluZGV4ID49IDBcbiAgICAgICAgPyAoYXR0ck5hbWVzLnB1c2goYXR0ck5hbWUhKSxcbiAgICAgICAgICBzLnNsaWNlKDAsIGF0dHJOYW1lRW5kSW5kZXgpICtcbiAgICAgICAgICAgIGJvdW5kQXR0cmlidXRlU3VmZml4ICtcbiAgICAgICAgICAgIHMuc2xpY2UoYXR0ck5hbWVFbmRJbmRleCkpICtcbiAgICAgICAgICBtYXJrZXIgK1xuICAgICAgICAgIGVuZFxuICAgICAgICA6IHMgKyBtYXJrZXIgKyAoYXR0ck5hbWVFbmRJbmRleCA9PT0gLTIgPyBpIDogZW5kKTtcbiAgfVxuXG4gIGNvbnN0IGh0bWxSZXN1bHQ6IHN0cmluZyB8IFRydXN0ZWRIVE1MID1cbiAgICBodG1sICsgKHN0cmluZ3NbbF0gfHwgJzw/PicpICsgKHR5cGUgPT09IFNWR19SRVNVTFQgPyAnPC9zdmc+JyA6ICcnKTtcblxuICAvLyBSZXR1cm5lZCBhcyBhbiBhcnJheSBmb3IgdGVyc2VuZXNzXG4gIHJldHVybiBbdHJ1c3RGcm9tVGVtcGxhdGVTdHJpbmcoc3RyaW5ncywgaHRtbFJlc3VsdCksIGF0dHJOYW1lc107XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSB7VGVtcGxhdGV9O1xuY2xhc3MgVGVtcGxhdGUge1xuICAvKiogQGludGVybmFsICovXG4gIGVsITogSFRNTFRlbXBsYXRlRWxlbWVudDtcblxuICBwYXJ0czogQXJyYXk8VGVtcGxhdGVQYXJ0PiA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAge3N0cmluZ3MsIFsnXyRsaXRUeXBlJCddOiB0eXBlfTogVW5jb21waWxlZFRlbXBsYXRlUmVzdWx0LFxuICAgIG9wdGlvbnM/OiBSZW5kZXJPcHRpb25zXG4gICkge1xuICAgIGxldCBub2RlOiBOb2RlIHwgbnVsbDtcbiAgICBsZXQgbm9kZUluZGV4ID0gMDtcbiAgICBsZXQgYXR0ck5hbWVJbmRleCA9IDA7XG4gICAgY29uc3QgcGFydENvdW50ID0gc3RyaW5ncy5sZW5ndGggLSAxO1xuICAgIGNvbnN0IHBhcnRzID0gdGhpcy5wYXJ0cztcblxuICAgIC8vIENyZWF0ZSB0ZW1wbGF0ZSBlbGVtZW50XG4gICAgY29uc3QgW2h0bWwsIGF0dHJOYW1lc10gPSBnZXRUZW1wbGF0ZUh0bWwoc3RyaW5ncywgdHlwZSk7XG4gICAgdGhpcy5lbCA9IFRlbXBsYXRlLmNyZWF0ZUVsZW1lbnQoaHRtbCwgb3B0aW9ucyk7XG4gICAgd2Fsa2VyLmN1cnJlbnROb2RlID0gdGhpcy5lbC5jb250ZW50O1xuXG4gICAgLy8gUmUtcGFyZW50IFNWRyBub2RlcyBpbnRvIHRlbXBsYXRlIHJvb3RcbiAgICBpZiAodHlwZSA9PT0gU1ZHX1JFU1VMVCkge1xuICAgICAgY29uc3Qgc3ZnRWxlbWVudCA9IHRoaXMuZWwuY29udGVudC5maXJzdENoaWxkITtcbiAgICAgIHN2Z0VsZW1lbnQucmVwbGFjZVdpdGgoLi4uc3ZnRWxlbWVudC5jaGlsZE5vZGVzKTtcbiAgICB9XG5cbiAgICAvLyBXYWxrIHRoZSB0ZW1wbGF0ZSB0byBmaW5kIGJpbmRpbmcgbWFya2VycyBhbmQgY3JlYXRlIFRlbXBsYXRlUGFydHNcbiAgICB3aGlsZSAoKG5vZGUgPSB3YWxrZXIubmV4dE5vZGUoKSkgIT09IG51bGwgJiYgcGFydHMubGVuZ3RoIDwgcGFydENvdW50KSB7XG4gICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICBpZiAoREVWX01PREUpIHtcbiAgICAgICAgICBjb25zdCB0YWcgPSAobm9kZSBhcyBFbGVtZW50KS5sb2NhbE5hbWU7XG4gICAgICAgICAgLy8gV2FybiBpZiBgdGV4dGFyZWFgIGluY2x1ZGVzIGFuIGV4cHJlc3Npb24gYW5kIHRocm93IGlmIGB0ZW1wbGF0ZWBcbiAgICAgICAgICAvLyBkb2VzIHNpbmNlIHRoZXNlIGFyZSBub3Qgc3VwcG9ydGVkLiBXZSBkbyB0aGlzIGJ5IGNoZWNraW5nXG4gICAgICAgICAgLy8gaW5uZXJIVE1MIGZvciBhbnl0aGluZyB0aGF0IGxvb2tzIGxpa2UgYSBtYXJrZXIuIFRoaXMgY2F0Y2hlc1xuICAgICAgICAgIC8vIGNhc2VzIGxpa2UgYmluZGluZ3MgaW4gdGV4dGFyZWEgdGhlcmUgbWFya2VycyB0dXJuIGludG8gdGV4dCBub2Rlcy5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAvXig/OnRleHRhcmVhfHRlbXBsYXRlKSQvaSEudGVzdCh0YWcpICYmXG4gICAgICAgICAgICAobm9kZSBhcyBFbGVtZW50KS5pbm5lckhUTUwuaW5jbHVkZXMobWFya2VyKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgY29uc3QgbSA9XG4gICAgICAgICAgICAgIGBFeHByZXNzaW9ucyBhcmUgbm90IHN1cHBvcnRlZCBpbnNpZGUgXFxgJHt0YWd9XFxgIGAgK1xuICAgICAgICAgICAgICBgZWxlbWVudHMuIFNlZSBodHRwczovL2xpdC5kZXYvbXNnL2V4cHJlc3Npb24taW4tJHt0YWd9IGZvciBtb3JlIGAgK1xuICAgICAgICAgICAgICBgaW5mb3JtYXRpb24uYDtcbiAgICAgICAgICAgIGlmICh0YWcgPT09ICd0ZW1wbGF0ZScpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG0pO1xuICAgICAgICAgICAgfSBlbHNlIGlzc3VlV2FybmluZygnJywgbSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE8gKGp1c3RpbmZhZ25hbmkpOiBmb3IgYXR0ZW1wdGVkIGR5bmFtaWMgdGFnIG5hbWVzLCB3ZSBkb24ndFxuICAgICAgICAvLyBpbmNyZW1lbnQgdGhlIGJpbmRpbmdJbmRleCwgYW5kIGl0J2xsIGJlIG9mZiBieSAxIGluIHRoZSBlbGVtZW50XG4gICAgICAgIC8vIGFuZCBvZmYgYnkgdHdvIGFmdGVyIGl0LlxuICAgICAgICBpZiAoKG5vZGUgYXMgRWxlbWVudCkuaGFzQXR0cmlidXRlcygpKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIChub2RlIGFzIEVsZW1lbnQpLmdldEF0dHJpYnV0ZU5hbWVzKCkpIHtcbiAgICAgICAgICAgIGlmIChuYW1lLmVuZHNXaXRoKGJvdW5kQXR0cmlidXRlU3VmZml4KSkge1xuICAgICAgICAgICAgICBjb25zdCByZWFsTmFtZSA9IGF0dHJOYW1lc1thdHRyTmFtZUluZGV4KytdO1xuICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IChub2RlIGFzIEVsZW1lbnQpLmdldEF0dHJpYnV0ZShuYW1lKSE7XG4gICAgICAgICAgICAgIGNvbnN0IHN0YXRpY3MgPSB2YWx1ZS5zcGxpdChtYXJrZXIpO1xuICAgICAgICAgICAgICBjb25zdCBtID0gLyhbLj9AXSk/KC4qKS8uZXhlYyhyZWFsTmFtZSkhO1xuICAgICAgICAgICAgICBwYXJ0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICB0eXBlOiBBVFRSSUJVVEVfUEFSVCxcbiAgICAgICAgICAgICAgICBpbmRleDogbm9kZUluZGV4LFxuICAgICAgICAgICAgICAgIG5hbWU6IG1bMl0sXG4gICAgICAgICAgICAgICAgc3RyaW5nczogc3RhdGljcyxcbiAgICAgICAgICAgICAgICBjdG9yOlxuICAgICAgICAgICAgICAgICAgbVsxXSA9PT0gJy4nXG4gICAgICAgICAgICAgICAgICAgID8gUHJvcGVydHlQYXJ0XG4gICAgICAgICAgICAgICAgICAgIDogbVsxXSA9PT0gJz8nXG4gICAgICAgICAgICAgICAgICAgID8gQm9vbGVhbkF0dHJpYnV0ZVBhcnRcbiAgICAgICAgICAgICAgICAgICAgOiBtWzFdID09PSAnQCdcbiAgICAgICAgICAgICAgICAgICAgPyBFdmVudFBhcnRcbiAgICAgICAgICAgICAgICAgICAgOiBBdHRyaWJ1dGVQYXJ0LFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgKG5vZGUgYXMgRWxlbWVudCkucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChuYW1lLnN0YXJ0c1dpdGgobWFya2VyKSkge1xuICAgICAgICAgICAgICBwYXJ0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICB0eXBlOiBFTEVNRU5UX1BBUlQsXG4gICAgICAgICAgICAgICAgaW5kZXg6IG5vZGVJbmRleCxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIChub2RlIGFzIEVsZW1lbnQpLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETyAoanVzdGluZmFnbmFuaSk6IGJlbmNobWFyayB0aGUgcmVnZXggYWdhaW5zdCB0ZXN0aW5nIGZvciBlYWNoXG4gICAgICAgIC8vIG9mIHRoZSAzIHJhdyB0ZXh0IGVsZW1lbnQgbmFtZXMuXG4gICAgICAgIGlmIChyYXdUZXh0RWxlbWVudC50ZXN0KChub2RlIGFzIEVsZW1lbnQpLnRhZ05hbWUpKSB7XG4gICAgICAgICAgLy8gRm9yIHJhdyB0ZXh0IGVsZW1lbnRzIHdlIG5lZWQgdG8gc3BsaXQgdGhlIHRleHQgY29udGVudCBvblxuICAgICAgICAgIC8vIG1hcmtlcnMsIGNyZWF0ZSBhIFRleHQgbm9kZSBmb3IgZWFjaCBzZWdtZW50LCBhbmQgY3JlYXRlXG4gICAgICAgICAgLy8gYSBUZW1wbGF0ZVBhcnQgZm9yIGVhY2ggbWFya2VyLlxuICAgICAgICAgIGNvbnN0IHN0cmluZ3MgPSAobm9kZSBhcyBFbGVtZW50KS50ZXh0Q29udGVudCEuc3BsaXQobWFya2VyKTtcbiAgICAgICAgICBjb25zdCBsYXN0SW5kZXggPSBzdHJpbmdzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgaWYgKGxhc3RJbmRleCA+IDApIHtcbiAgICAgICAgICAgIChub2RlIGFzIEVsZW1lbnQpLnRleHRDb250ZW50ID0gdHJ1c3RlZFR5cGVzXG4gICAgICAgICAgICAgID8gKHRydXN0ZWRUeXBlcy5lbXB0eVNjcmlwdCBhcyB1bmtub3duIGFzICcnKVxuICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgLy8gR2VuZXJhdGUgYSBuZXcgdGV4dCBub2RlIGZvciBlYWNoIGxpdGVyYWwgc2VjdGlvblxuICAgICAgICAgICAgLy8gVGhlc2Ugbm9kZXMgYXJlIGFsc28gdXNlZCBhcyB0aGUgbWFya2VycyBmb3Igbm9kZSBwYXJ0c1xuICAgICAgICAgICAgLy8gV2UgY2FuJ3QgdXNlIGVtcHR5IHRleHQgbm9kZXMgYXMgbWFya2VycyBiZWNhdXNlIHRoZXkncmVcbiAgICAgICAgICAgIC8vIG5vcm1hbGl6ZWQgd2hlbiBjbG9uaW5nIGluIElFIChjb3VsZCBzaW1wbGlmeSB3aGVuXG4gICAgICAgICAgICAvLyBJRSBpcyBubyBsb25nZXIgc3VwcG9ydGVkKVxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsYXN0SW5kZXg7IGkrKykge1xuICAgICAgICAgICAgICAobm9kZSBhcyBFbGVtZW50KS5hcHBlbmQoc3RyaW5nc1tpXSwgY3JlYXRlTWFya2VyKCkpO1xuICAgICAgICAgICAgICAvLyBXYWxrIHBhc3QgdGhlIG1hcmtlciBub2RlIHdlIGp1c3QgYWRkZWRcbiAgICAgICAgICAgICAgd2Fsa2VyLm5leHROb2RlKCk7XG4gICAgICAgICAgICAgIHBhcnRzLnB1c2goe3R5cGU6IENISUxEX1BBUlQsIGluZGV4OiArK25vZGVJbmRleH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTm90ZSBiZWNhdXNlIHRoaXMgbWFya2VyIGlzIGFkZGVkIGFmdGVyIHRoZSB3YWxrZXIncyBjdXJyZW50XG4gICAgICAgICAgICAvLyBub2RlLCBpdCB3aWxsIGJlIHdhbGtlZCB0byBpbiB0aGUgb3V0ZXIgbG9vcCAoYW5kIGlnbm9yZWQpLCBzb1xuICAgICAgICAgICAgLy8gd2UgZG9uJ3QgbmVlZCB0byBhZGp1c3Qgbm9kZUluZGV4IGhlcmVcbiAgICAgICAgICAgIChub2RlIGFzIEVsZW1lbnQpLmFwcGVuZChzdHJpbmdzW2xhc3RJbmRleF0sIGNyZWF0ZU1hcmtlcigpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gOCkge1xuICAgICAgICBjb25zdCBkYXRhID0gKG5vZGUgYXMgQ29tbWVudCkuZGF0YTtcbiAgICAgICAgaWYgKGRhdGEgPT09IG1hcmtlck1hdGNoKSB7XG4gICAgICAgICAgcGFydHMucHVzaCh7dHlwZTogQ0hJTERfUEFSVCwgaW5kZXg6IG5vZGVJbmRleH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxldCBpID0gLTE7XG4gICAgICAgICAgd2hpbGUgKChpID0gKG5vZGUgYXMgQ29tbWVudCkuZGF0YS5pbmRleE9mKG1hcmtlciwgaSArIDEpKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIC8vIENvbW1lbnQgbm9kZSBoYXMgYSBiaW5kaW5nIG1hcmtlciBpbnNpZGUsIG1ha2UgYW4gaW5hY3RpdmUgcGFydFxuICAgICAgICAgICAgLy8gVGhlIGJpbmRpbmcgd29uJ3Qgd29yaywgYnV0IHN1YnNlcXVlbnQgYmluZGluZ3Mgd2lsbFxuICAgICAgICAgICAgcGFydHMucHVzaCh7dHlwZTogQ09NTUVOVF9QQVJULCBpbmRleDogbm9kZUluZGV4fSk7XG4gICAgICAgICAgICAvLyBNb3ZlIHRvIHRoZSBlbmQgb2YgdGhlIG1hdGNoXG4gICAgICAgICAgICBpICs9IG1hcmtlci5sZW5ndGggLSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbm9kZUluZGV4Kys7XG4gICAgfVxuXG4gICAgaWYgKERFVl9NT0RFKSB7XG4gICAgICAvLyBJZiB0aGVyZSB3YXMgYSBkdXBsaWNhdGUgYXR0cmlidXRlIG9uIGEgdGFnLCB0aGVuIHdoZW4gdGhlIHRhZyBpc1xuICAgICAgLy8gcGFyc2VkIGludG8gYW4gZWxlbWVudCB0aGUgYXR0cmlidXRlIGdldHMgZGUtZHVwbGljYXRlZC4gV2UgY2FuIGRldGVjdFxuICAgICAgLy8gdGhpcyBtaXNtYXRjaCBpZiB3ZSBoYXZlbid0IHByZWNpc2VseSBjb25zdW1lZCBldmVyeSBhdHRyaWJ1dGUgbmFtZVxuICAgICAgLy8gd2hlbiBwcmVwYXJpbmcgdGhlIHRlbXBsYXRlLiBUaGlzIHdvcmtzIGJlY2F1c2UgYGF0dHJOYW1lc2AgaXMgYnVpbHRcbiAgICAgIC8vIGZyb20gdGhlIHRlbXBsYXRlIHN0cmluZyBhbmQgYGF0dHJOYW1lSW5kZXhgIGNvbWVzIGZyb20gcHJvY2Vzc2luZyB0aGVcbiAgICAgIC8vIHJlc3VsdGluZyBET00uXG4gICAgICBpZiAoYXR0ck5hbWVzLmxlbmd0aCAhPT0gYXR0ck5hbWVJbmRleCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYERldGVjdGVkIGR1cGxpY2F0ZSBhdHRyaWJ1dGUgYmluZGluZ3MuIFRoaXMgb2NjdXJzIGlmIHlvdXIgdGVtcGxhdGUgYCArXG4gICAgICAgICAgICBgaGFzIGR1cGxpY2F0ZSBhdHRyaWJ1dGVzIG9uIGFuIGVsZW1lbnQgdGFnLiBGb3IgZXhhbXBsZSBgICtcbiAgICAgICAgICAgIGBcIjxpbnB1dCA/ZGlzYWJsZWQ9XFwke3RydWV9ID9kaXNhYmxlZD1cXCR7ZmFsc2V9PlwiIGNvbnRhaW5zIGEgYCArXG4gICAgICAgICAgICBgZHVwbGljYXRlIFwiZGlzYWJsZWRcIiBhdHRyaWJ1dGUuIFRoZSBlcnJvciB3YXMgZGV0ZWN0ZWQgaW4gYCArXG4gICAgICAgICAgICBgdGhlIGZvbGxvd2luZyB0ZW1wbGF0ZTogXFxuYCArXG4gICAgICAgICAgICAnYCcgK1xuICAgICAgICAgICAgc3RyaW5ncy5qb2luKCckey4uLn0nKSArXG4gICAgICAgICAgICAnYCdcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBXZSBjb3VsZCBzZXQgd2Fsa2VyLmN1cnJlbnROb2RlIHRvIGFub3RoZXIgbm9kZSBoZXJlIHRvIHByZXZlbnQgYSBtZW1vcnlcbiAgICAvLyBsZWFrLCBidXQgZXZlcnkgdGltZSB3ZSBwcmVwYXJlIGEgdGVtcGxhdGUsIHdlIGltbWVkaWF0ZWx5IHJlbmRlciBpdFxuICAgIC8vIGFuZCByZS11c2UgdGhlIHdhbGtlciBpbiBuZXcgVGVtcGxhdGVJbnN0YW5jZS5fY2xvbmUoKS5cbiAgICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAga2luZDogJ3RlbXBsYXRlIHByZXAnLFxuICAgICAgICB0ZW1wbGF0ZTogdGhpcyxcbiAgICAgICAgY2xvbmFibGVUZW1wbGF0ZTogdGhpcy5lbCxcbiAgICAgICAgcGFydHM6IHRoaXMucGFydHMsXG4gICAgICAgIHN0cmluZ3MsXG4gICAgICB9KTtcbiAgfVxuXG4gIC8vIE92ZXJyaWRkZW4gdmlhIGBsaXRIdG1sUG9seWZpbGxTdXBwb3J0YCB0byBwcm92aWRlIHBsYXRmb3JtIHN1cHBvcnQuXG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY3JlYXRlRWxlbWVudChodG1sOiBUcnVzdGVkSFRNTCwgX29wdGlvbnM/OiBSZW5kZXJPcHRpb25zKSB7XG4gICAgY29uc3QgZWwgPSBkLmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgZWwuaW5uZXJIVE1MID0gaHRtbCBhcyB1bmtub3duIGFzIHN0cmluZztcbiAgICByZXR1cm4gZWw7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBEaXNjb25uZWN0YWJsZSB7XG4gIF8kcGFyZW50PzogRGlzY29ubmVjdGFibGU7XG4gIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT47XG4gIC8vIFJhdGhlciB0aGFuIGhvbGQgY29ubmVjdGlvbiBzdGF0ZSBvbiBpbnN0YW5jZXMsIERpc2Nvbm5lY3RhYmxlcyByZWN1cnNpdmVseVxuICAvLyBmZXRjaCB0aGUgY29ubmVjdGlvbiBzdGF0ZSBmcm9tIHRoZSBSb290UGFydCB0aGV5IGFyZSBjb25uZWN0ZWQgaW4gdmlhXG4gIC8vIGdldHRlcnMgdXAgdGhlIERpc2Nvbm5lY3RhYmxlIHRyZWUgdmlhIF8kcGFyZW50IHJlZmVyZW5jZXMuIFRoaXMgcHVzaGVzIHRoZVxuICAvLyBjb3N0IG9mIHRyYWNraW5nIHRoZSBpc0Nvbm5lY3RlZCBzdGF0ZSB0byBgQXN5bmNEaXJlY3RpdmVzYCwgYW5kIGF2b2lkc1xuICAvLyBuZWVkaW5nIHRvIHBhc3MgYWxsIERpc2Nvbm5lY3RhYmxlcyAocGFydHMsIHRlbXBsYXRlIGluc3RhbmNlcywgYW5kXG4gIC8vIGRpcmVjdGl2ZXMpIHRoZWlyIGNvbm5lY3Rpb24gc3RhdGUgZWFjaCB0aW1lIGl0IGNoYW5nZXMsIHdoaWNoIHdvdWxkIGJlXG4gIC8vIGNvc3RseSBmb3IgdHJlZXMgdGhhdCBoYXZlIG5vIEFzeW5jRGlyZWN0aXZlcy5cbiAgXyRpc0Nvbm5lY3RlZDogYm9vbGVhbjtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZURpcmVjdGl2ZShcbiAgcGFydDogQ2hpbGRQYXJ0IHwgQXR0cmlidXRlUGFydCB8IEVsZW1lbnRQYXJ0LFxuICB2YWx1ZTogdW5rbm93bixcbiAgcGFyZW50OiBEaXJlY3RpdmVQYXJlbnQgPSBwYXJ0LFxuICBhdHRyaWJ1dGVJbmRleD86IG51bWJlclxuKTogdW5rbm93biB7XG4gIC8vIEJhaWwgZWFybHkgaWYgdGhlIHZhbHVlIGlzIGV4cGxpY2l0bHkgbm9DaGFuZ2UuIE5vdGUsIHRoaXMgbWVhbnMgYW55XG4gIC8vIG5lc3RlZCBkaXJlY3RpdmUgaXMgc3RpbGwgYXR0YWNoZWQgYW5kIGlzIG5vdCBydW4uXG4gIGlmICh2YWx1ZSA9PT0gbm9DaGFuZ2UpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgbGV0IGN1cnJlbnREaXJlY3RpdmUgPVxuICAgIGF0dHJpYnV0ZUluZGV4ICE9PSB1bmRlZmluZWRcbiAgICAgID8gKHBhcmVudCBhcyBBdHRyaWJ1dGVQYXJ0KS5fX2RpcmVjdGl2ZXM/LlthdHRyaWJ1dGVJbmRleF1cbiAgICAgIDogKHBhcmVudCBhcyBDaGlsZFBhcnQgfCBFbGVtZW50UGFydCB8IERpcmVjdGl2ZSkuX19kaXJlY3RpdmU7XG4gIGNvbnN0IG5leHREaXJlY3RpdmVDb25zdHJ1Y3RvciA9IGlzUHJpbWl0aXZlKHZhbHVlKVxuICAgID8gdW5kZWZpbmVkXG4gICAgOiAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgICAgKHZhbHVlIGFzIERpcmVjdGl2ZVJlc3VsdClbJ18kbGl0RGlyZWN0aXZlJCddO1xuICBpZiAoY3VycmVudERpcmVjdGl2ZT8uY29uc3RydWN0b3IgIT09IG5leHREaXJlY3RpdmVDb25zdHJ1Y3Rvcikge1xuICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgY3VycmVudERpcmVjdGl2ZT8uWydfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkJ10/LihmYWxzZSk7XG4gICAgaWYgKG5leHREaXJlY3RpdmVDb25zdHJ1Y3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjdXJyZW50RGlyZWN0aXZlID0gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBjdXJyZW50RGlyZWN0aXZlID0gbmV3IG5leHREaXJlY3RpdmVDb25zdHJ1Y3RvcihwYXJ0IGFzIFBhcnRJbmZvKTtcbiAgICAgIGN1cnJlbnREaXJlY3RpdmUuXyRpbml0aWFsaXplKHBhcnQsIHBhcmVudCwgYXR0cmlidXRlSW5kZXgpO1xuICAgIH1cbiAgICBpZiAoYXR0cmlidXRlSW5kZXggIT09IHVuZGVmaW5lZCkge1xuICAgICAgKChwYXJlbnQgYXMgQXR0cmlidXRlUGFydCkuX19kaXJlY3RpdmVzID8/PSBbXSlbYXR0cmlidXRlSW5kZXhdID1cbiAgICAgICAgY3VycmVudERpcmVjdGl2ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgKHBhcmVudCBhcyBDaGlsZFBhcnQgfCBEaXJlY3RpdmUpLl9fZGlyZWN0aXZlID0gY3VycmVudERpcmVjdGl2ZTtcbiAgICB9XG4gIH1cbiAgaWYgKGN1cnJlbnREaXJlY3RpdmUgIT09IHVuZGVmaW5lZCkge1xuICAgIHZhbHVlID0gcmVzb2x2ZURpcmVjdGl2ZShcbiAgICAgIHBhcnQsXG4gICAgICBjdXJyZW50RGlyZWN0aXZlLl8kcmVzb2x2ZShwYXJ0LCAodmFsdWUgYXMgRGlyZWN0aXZlUmVzdWx0KS52YWx1ZXMpLFxuICAgICAgY3VycmVudERpcmVjdGl2ZSxcbiAgICAgIGF0dHJpYnV0ZUluZGV4XG4gICAgKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbmV4cG9ydCB0eXBlIHtUZW1wbGF0ZUluc3RhbmNlfTtcbi8qKlxuICogQW4gdXBkYXRlYWJsZSBpbnN0YW5jZSBvZiBhIFRlbXBsYXRlLiBIb2xkcyByZWZlcmVuY2VzIHRvIHRoZSBQYXJ0cyB1c2VkIHRvXG4gKiB1cGRhdGUgdGhlIHRlbXBsYXRlIGluc3RhbmNlLlxuICovXG5jbGFzcyBUZW1wbGF0ZUluc3RhbmNlIGltcGxlbWVudHMgRGlzY29ubmVjdGFibGUge1xuICBfJHRlbXBsYXRlOiBUZW1wbGF0ZTtcbiAgXyRwYXJ0czogQXJyYXk8UGFydCB8IHVuZGVmaW5lZD4gPSBbXTtcblxuICAvKiogQGludGVybmFsICovXG4gIF8kcGFyZW50OiBDaGlsZFBhcnQ7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuPzogU2V0PERpc2Nvbm5lY3RhYmxlPiA9IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3Rvcih0ZW1wbGF0ZTogVGVtcGxhdGUsIHBhcmVudDogQ2hpbGRQYXJ0KSB7XG4gICAgdGhpcy5fJHRlbXBsYXRlID0gdGVtcGxhdGU7XG4gICAgdGhpcy5fJHBhcmVudCA9IHBhcmVudDtcbiAgfVxuXG4gIC8vIENhbGxlZCBieSBDaGlsZFBhcnQgcGFyZW50Tm9kZSBnZXR0ZXJcbiAgZ2V0IHBhcmVudE5vZGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuXyRwYXJlbnQucGFyZW50Tm9kZTtcbiAgfVxuXG4gIC8vIFNlZSBjb21tZW50IGluIERpc2Nvbm5lY3RhYmxlIGludGVyZmFjZSBmb3Igd2h5IHRoaXMgaXMgYSBnZXR0ZXJcbiAgZ2V0IF8kaXNDb25uZWN0ZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuXyRwYXJlbnQuXyRpc0Nvbm5lY3RlZDtcbiAgfVxuXG4gIC8vIFRoaXMgbWV0aG9kIGlzIHNlcGFyYXRlIGZyb20gdGhlIGNvbnN0cnVjdG9yIGJlY2F1c2Ugd2UgbmVlZCB0byByZXR1cm4gYVxuICAvLyBEb2N1bWVudEZyYWdtZW50IGFuZCB3ZSBkb24ndCB3YW50IHRvIGhvbGQgb250byBpdCB3aXRoIGFuIGluc3RhbmNlIGZpZWxkLlxuICBfY2xvbmUob3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IHtcbiAgICAgIGVsOiB7Y29udGVudH0sXG4gICAgICBwYXJ0czogcGFydHMsXG4gICAgfSA9IHRoaXMuXyR0ZW1wbGF0ZTtcbiAgICBjb25zdCBmcmFnbWVudCA9IChvcHRpb25zPy5jcmVhdGlvblNjb3BlID8/IGQpLmltcG9ydE5vZGUoY29udGVudCwgdHJ1ZSk7XG4gICAgd2Fsa2VyLmN1cnJlbnROb2RlID0gZnJhZ21lbnQ7XG5cbiAgICBsZXQgbm9kZSA9IHdhbGtlci5uZXh0Tm9kZSgpITtcbiAgICBsZXQgbm9kZUluZGV4ID0gMDtcbiAgICBsZXQgcGFydEluZGV4ID0gMDtcbiAgICBsZXQgdGVtcGxhdGVQYXJ0ID0gcGFydHNbMF07XG5cbiAgICB3aGlsZSAodGVtcGxhdGVQYXJ0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmIChub2RlSW5kZXggPT09IHRlbXBsYXRlUGFydC5pbmRleCkge1xuICAgICAgICBsZXQgcGFydDogUGFydCB8IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKHRlbXBsYXRlUGFydC50eXBlID09PSBDSElMRF9QQVJUKSB7XG4gICAgICAgICAgcGFydCA9IG5ldyBDaGlsZFBhcnQoXG4gICAgICAgICAgICBub2RlIGFzIEhUTUxFbGVtZW50LFxuICAgICAgICAgICAgbm9kZS5uZXh0U2libGluZyxcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICBvcHRpb25zXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmICh0ZW1wbGF0ZVBhcnQudHlwZSA9PT0gQVRUUklCVVRFX1BBUlQpIHtcbiAgICAgICAgICBwYXJ0ID0gbmV3IHRlbXBsYXRlUGFydC5jdG9yKFxuICAgICAgICAgICAgbm9kZSBhcyBIVE1MRWxlbWVudCxcbiAgICAgICAgICAgIHRlbXBsYXRlUGFydC5uYW1lLFxuICAgICAgICAgICAgdGVtcGxhdGVQYXJ0LnN0cmluZ3MsXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgb3B0aW9uc1xuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAodGVtcGxhdGVQYXJ0LnR5cGUgPT09IEVMRU1FTlRfUEFSVCkge1xuICAgICAgICAgIHBhcnQgPSBuZXcgRWxlbWVudFBhcnQobm9kZSBhcyBIVE1MRWxlbWVudCwgdGhpcywgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fJHBhcnRzLnB1c2gocGFydCk7XG4gICAgICAgIHRlbXBsYXRlUGFydCA9IHBhcnRzWysrcGFydEluZGV4XTtcbiAgICAgIH1cbiAgICAgIGlmIChub2RlSW5kZXggIT09IHRlbXBsYXRlUGFydD8uaW5kZXgpIHtcbiAgICAgICAgbm9kZSA9IHdhbGtlci5uZXh0Tm9kZSgpITtcbiAgICAgICAgbm9kZUluZGV4Kys7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFdlIG5lZWQgdG8gc2V0IHRoZSBjdXJyZW50Tm9kZSBhd2F5IGZyb20gdGhlIGNsb25lZCB0cmVlIHNvIHRoYXQgd2VcbiAgICAvLyBkb24ndCBob2xkIG9udG8gdGhlIHRyZWUgZXZlbiBpZiB0aGUgdHJlZSBpcyBkZXRhY2hlZCBhbmQgc2hvdWxkIGJlXG4gICAgLy8gZnJlZWQuXG4gICAgd2Fsa2VyLmN1cnJlbnROb2RlID0gZDtcbiAgICByZXR1cm4gZnJhZ21lbnQ7XG4gIH1cblxuICBfdXBkYXRlKHZhbHVlczogQXJyYXk8dW5rbm93bj4pIHtcbiAgICBsZXQgaSA9IDA7XG4gICAgZm9yIChjb25zdCBwYXJ0IG9mIHRoaXMuXyRwYXJ0cykge1xuICAgICAgaWYgKHBhcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgICAgICAgZGVidWdMb2dFdmVudCh7XG4gICAgICAgICAgICBraW5kOiAnc2V0IHBhcnQnLFxuICAgICAgICAgICAgcGFydCxcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZXNbaV0sXG4gICAgICAgICAgICB2YWx1ZUluZGV4OiBpLFxuICAgICAgICAgICAgdmFsdWVzLFxuICAgICAgICAgICAgdGVtcGxhdGVJbnN0YW5jZTogdGhpcyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgaWYgKChwYXJ0IGFzIEF0dHJpYnV0ZVBhcnQpLnN0cmluZ3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIChwYXJ0IGFzIEF0dHJpYnV0ZVBhcnQpLl8kc2V0VmFsdWUodmFsdWVzLCBwYXJ0IGFzIEF0dHJpYnV0ZVBhcnQsIGkpO1xuICAgICAgICAgIC8vIFRoZSBudW1iZXIgb2YgdmFsdWVzIHRoZSBwYXJ0IGNvbnN1bWVzIGlzIHBhcnQuc3RyaW5ncy5sZW5ndGggLSAxXG4gICAgICAgICAgLy8gc2luY2UgdmFsdWVzIGFyZSBpbiBiZXR3ZWVuIHRlbXBsYXRlIHNwYW5zLiBXZSBpbmNyZW1lbnQgaSBieSAxXG4gICAgICAgICAgLy8gbGF0ZXIgaW4gdGhlIGxvb3AsIHNvIGluY3JlbWVudCBpdCBieSBwYXJ0LnN0cmluZ3MubGVuZ3RoIC0gMiBoZXJlXG4gICAgICAgICAgaSArPSAocGFydCBhcyBBdHRyaWJ1dGVQYXJ0KS5zdHJpbmdzIS5sZW5ndGggLSAyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhcnQuXyRzZXRWYWx1ZSh2YWx1ZXNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpKys7XG4gICAgfVxuICB9XG59XG5cbi8qXG4gKiBQYXJ0c1xuICovXG50eXBlIEF0dHJpYnV0ZVRlbXBsYXRlUGFydCA9IHtcbiAgcmVhZG9ubHkgdHlwZTogdHlwZW9mIEFUVFJJQlVURV9QQVJUO1xuICByZWFkb25seSBpbmRleDogbnVtYmVyO1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGN0b3I6IHR5cGVvZiBBdHRyaWJ1dGVQYXJ0O1xuICByZWFkb25seSBzdHJpbmdzOiBSZWFkb25seUFycmF5PHN0cmluZz47XG59O1xudHlwZSBDaGlsZFRlbXBsYXRlUGFydCA9IHtcbiAgcmVhZG9ubHkgdHlwZTogdHlwZW9mIENISUxEX1BBUlQ7XG4gIHJlYWRvbmx5IGluZGV4OiBudW1iZXI7XG59O1xudHlwZSBFbGVtZW50VGVtcGxhdGVQYXJ0ID0ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgRUxFTUVOVF9QQVJUO1xuICByZWFkb25seSBpbmRleDogbnVtYmVyO1xufTtcbnR5cGUgQ29tbWVudFRlbXBsYXRlUGFydCA9IHtcbiAgcmVhZG9ubHkgdHlwZTogdHlwZW9mIENPTU1FTlRfUEFSVDtcbiAgcmVhZG9ubHkgaW5kZXg6IG51bWJlcjtcbn07XG5cbi8qKlxuICogQSBUZW1wbGF0ZVBhcnQgcmVwcmVzZW50cyBhIGR5bmFtaWMgcGFydCBpbiBhIHRlbXBsYXRlLCBiZWZvcmUgdGhlIHRlbXBsYXRlXG4gKiBpcyBpbnN0YW50aWF0ZWQuIFdoZW4gYSB0ZW1wbGF0ZSBpcyBpbnN0YW50aWF0ZWQgUGFydHMgYXJlIGNyZWF0ZWQgZnJvbVxuICogVGVtcGxhdGVQYXJ0cy5cbiAqL1xudHlwZSBUZW1wbGF0ZVBhcnQgPVxuICB8IENoaWxkVGVtcGxhdGVQYXJ0XG4gIHwgQXR0cmlidXRlVGVtcGxhdGVQYXJ0XG4gIHwgRWxlbWVudFRlbXBsYXRlUGFydFxuICB8IENvbW1lbnRUZW1wbGF0ZVBhcnQ7XG5cbmV4cG9ydCB0eXBlIFBhcnQgPVxuICB8IENoaWxkUGFydFxuICB8IEF0dHJpYnV0ZVBhcnRcbiAgfCBQcm9wZXJ0eVBhcnRcbiAgfCBCb29sZWFuQXR0cmlidXRlUGFydFxuICB8IEVsZW1lbnRQYXJ0XG4gIHwgRXZlbnRQYXJ0O1xuXG5leHBvcnQgdHlwZSB7Q2hpbGRQYXJ0fTtcbmNsYXNzIENoaWxkUGFydCBpbXBsZW1lbnRzIERpc2Nvbm5lY3RhYmxlIHtcbiAgcmVhZG9ubHkgdHlwZSA9IENISUxEX1BBUlQ7XG4gIHJlYWRvbmx5IG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gIF8kY29tbWl0dGVkVmFsdWU6IHVua25vd24gPSBub3RoaW5nO1xuICAvKiogQGludGVybmFsICovXG4gIF9fZGlyZWN0aXZlPzogRGlyZWN0aXZlO1xuICAvKiogQGludGVybmFsICovXG4gIF8kc3RhcnROb2RlOiBDaGlsZE5vZGU7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRlbmROb2RlOiBDaGlsZE5vZGUgfCBudWxsO1xuICBwcml2YXRlIF90ZXh0U2FuaXRpemVyOiBWYWx1ZVNhbml0aXplciB8IHVuZGVmaW5lZDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHBhcmVudDogRGlzY29ubmVjdGFibGUgfCB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBDb25uZWN0aW9uIHN0YXRlIGZvciBSb290UGFydHMgb25seSAoaS5lLiBDaGlsZFBhcnQgd2l0aG91dCBfJHBhcmVudFxuICAgKiByZXR1cm5lZCBmcm9tIHRvcC1sZXZlbCBgcmVuZGVyYCkuIFRoaXMgZmllbGQgaXMgdW5zZWQgb3RoZXJ3aXNlLiBUaGVcbiAgICogaW50ZW50aW9uIHdvdWxkIGNsZWFyZXIgaWYgd2UgbWFkZSBgUm9vdFBhcnRgIGEgc3ViY2xhc3Mgb2YgYENoaWxkUGFydGBcbiAgICogd2l0aCB0aGlzIGZpZWxkIChhbmQgYSBkaWZmZXJlbnQgXyRpc0Nvbm5lY3RlZCBnZXR0ZXIpLCBidXQgdGhlIHN1YmNsYXNzXG4gICAqIGNhdXNlZCBhIHBlcmYgcmVncmVzc2lvbiwgcG9zc2libHkgZHVlIHRvIG1ha2luZyBjYWxsIHNpdGVzIHBvbHltb3JwaGljLlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIF9faXNDb25uZWN0ZWQ6IGJvb2xlYW47XG5cbiAgLy8gU2VlIGNvbW1lbnQgaW4gRGlzY29ubmVjdGFibGUgaW50ZXJmYWNlIGZvciB3aHkgdGhpcyBpcyBhIGdldHRlclxuICBnZXQgXyRpc0Nvbm5lY3RlZCgpIHtcbiAgICAvLyBDaGlsZFBhcnRzIHRoYXQgYXJlIG5vdCBhdCB0aGUgcm9vdCBzaG91bGQgYWx3YXlzIGJlIGNyZWF0ZWQgd2l0aCBhXG4gICAgLy8gcGFyZW50OyBvbmx5IFJvb3RDaGlsZE5vZGUncyB3b24ndCwgc28gdGhleSByZXR1cm4gdGhlIGxvY2FsIGlzQ29ubmVjdGVkXG4gICAgLy8gc3RhdGVcbiAgICByZXR1cm4gdGhpcy5fJHBhcmVudD8uXyRpc0Nvbm5lY3RlZCA/PyB0aGlzLl9faXNDb25uZWN0ZWQ7XG4gIH1cblxuICAvLyBUaGUgZm9sbG93aW5nIGZpZWxkcyB3aWxsIGJlIHBhdGNoZWQgb250byBDaGlsZFBhcnRzIHdoZW4gcmVxdWlyZWQgYnlcbiAgLy8gQXN5bmNEaXJlY3RpdmVcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4/OiBTZXQ8RGlzY29ubmVjdGFibGU+ID0gdW5kZWZpbmVkO1xuICAvKiogQGludGVybmFsICovXG4gIF8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQ/KFxuICAgIGlzQ29ubmVjdGVkOiBib29sZWFuLFxuICAgIHJlbW92ZUZyb21QYXJlbnQ/OiBib29sZWFuLFxuICAgIGZyb20/OiBudW1iZXJcbiAgKTogdm9pZDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHJlcGFyZW50RGlzY29ubmVjdGFibGVzPyhwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlKTogdm9pZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBzdGFydE5vZGU6IENoaWxkTm9kZSxcbiAgICBlbmROb2RlOiBDaGlsZE5vZGUgfCBudWxsLFxuICAgIHBhcmVudDogVGVtcGxhdGVJbnN0YW5jZSB8IENoaWxkUGFydCB8IHVuZGVmaW5lZCxcbiAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkXG4gICkge1xuICAgIHRoaXMuXyRzdGFydE5vZGUgPSBzdGFydE5vZGU7XG4gICAgdGhpcy5fJGVuZE5vZGUgPSBlbmROb2RlO1xuICAgIHRoaXMuXyRwYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICAvLyBOb3RlIF9faXNDb25uZWN0ZWQgaXMgb25seSBldmVyIGFjY2Vzc2VkIG9uIFJvb3RQYXJ0cyAoaS5lLiB3aGVuIHRoZXJlIGlzXG4gICAgLy8gbm8gXyRwYXJlbnQpOyB0aGUgdmFsdWUgb24gYSBub24tcm9vdC1wYXJ0IGlzIFwiZG9uJ3QgY2FyZVwiLCBidXQgY2hlY2tpbmdcbiAgICAvLyBmb3IgcGFyZW50IHdvdWxkIGJlIG1vcmUgY29kZVxuICAgIHRoaXMuX19pc0Nvbm5lY3RlZCA9IG9wdGlvbnM/LmlzQ29ubmVjdGVkID8/IHRydWU7XG4gICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgLy8gRXhwbGljaXRseSBpbml0aWFsaXplIGZvciBjb25zaXN0ZW50IGNsYXNzIHNoYXBlLlxuICAgICAgdGhpcy5fdGV4dFNhbml0aXplciA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVGhlIHBhcmVudCBub2RlIGludG8gd2hpY2ggdGhlIHBhcnQgcmVuZGVycyBpdHMgY29udGVudC5cbiAgICpcbiAgICogQSBDaGlsZFBhcnQncyBjb250ZW50IGNvbnNpc3RzIG9mIGEgcmFuZ2Ugb2YgYWRqYWNlbnQgY2hpbGQgbm9kZXMgb2ZcbiAgICogYC5wYXJlbnROb2RlYCwgcG9zc2libHkgYm9yZGVyZWQgYnkgJ21hcmtlciBub2RlcycgKGAuc3RhcnROb2RlYCBhbmRcbiAgICogYC5lbmROb2RlYCkuXG4gICAqXG4gICAqIC0gSWYgYm90aCBgLnN0YXJ0Tm9kZWAgYW5kIGAuZW5kTm9kZWAgYXJlIG5vbi1udWxsLCB0aGVuIHRoZSBwYXJ0J3MgY29udGVudFxuICAgKiBjb25zaXN0cyBvZiBhbGwgc2libGluZ3MgYmV0d2VlbiBgLnN0YXJ0Tm9kZWAgYW5kIGAuZW5kTm9kZWAsIGV4Y2x1c2l2ZWx5LlxuICAgKlxuICAgKiAtIElmIGAuc3RhcnROb2RlYCBpcyBub24tbnVsbCBidXQgYC5lbmROb2RlYCBpcyBudWxsLCB0aGVuIHRoZSBwYXJ0J3NcbiAgICogY29udGVudCBjb25zaXN0cyBvZiBhbGwgc2libGluZ3MgZm9sbG93aW5nIGAuc3RhcnROb2RlYCwgdXAgdG8gYW5kXG4gICAqIGluY2x1ZGluZyB0aGUgbGFzdCBjaGlsZCBvZiBgLnBhcmVudE5vZGVgLiBJZiBgLmVuZE5vZGVgIGlzIG5vbi1udWxsLCB0aGVuXG4gICAqIGAuc3RhcnROb2RlYCB3aWxsIGFsd2F5cyBiZSBub24tbnVsbC5cbiAgICpcbiAgICogLSBJZiBib3RoIGAuZW5kTm9kZWAgYW5kIGAuc3RhcnROb2RlYCBhcmUgbnVsbCwgdGhlbiB0aGUgcGFydCdzIGNvbnRlbnRcbiAgICogY29uc2lzdHMgb2YgYWxsIGNoaWxkIG5vZGVzIG9mIGAucGFyZW50Tm9kZWAuXG4gICAqL1xuICBnZXQgcGFyZW50Tm9kZSgpOiBOb2RlIHtcbiAgICBsZXQgcGFyZW50Tm9kZTogTm9kZSA9IHdyYXAodGhpcy5fJHN0YXJ0Tm9kZSkucGFyZW50Tm9kZSE7XG4gICAgY29uc3QgcGFyZW50ID0gdGhpcy5fJHBhcmVudDtcbiAgICBpZiAoXG4gICAgICBwYXJlbnQgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgcGFyZW50Tm9kZT8ubm9kZVR5cGUgPT09IDExIC8qIE5vZGUuRE9DVU1FTlRfRlJBR01FTlQgKi9cbiAgICApIHtcbiAgICAgIC8vIElmIHRoZSBwYXJlbnROb2RlIGlzIGEgRG9jdW1lbnRGcmFnbWVudCwgaXQgbWF5IGJlIGJlY2F1c2UgdGhlIERPTSBpc1xuICAgICAgLy8gc3RpbGwgaW4gdGhlIGNsb25lZCBmcmFnbWVudCBkdXJpbmcgaW5pdGlhbCByZW5kZXI7IGlmIHNvLCBnZXQgdGhlIHJlYWxcbiAgICAgIC8vIHBhcmVudE5vZGUgdGhlIHBhcnQgd2lsbCBiZSBjb21taXR0ZWQgaW50byBieSBhc2tpbmcgdGhlIHBhcmVudC5cbiAgICAgIHBhcmVudE5vZGUgPSAocGFyZW50IGFzIENoaWxkUGFydCB8IFRlbXBsYXRlSW5zdGFuY2UpLnBhcmVudE5vZGU7XG4gICAgfVxuICAgIHJldHVybiBwYXJlbnROb2RlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBwYXJ0J3MgbGVhZGluZyBtYXJrZXIgbm9kZSwgaWYgYW55LiBTZWUgYC5wYXJlbnROb2RlYCBmb3IgbW9yZVxuICAgKiBpbmZvcm1hdGlvbi5cbiAgICovXG4gIGdldCBzdGFydE5vZGUoKTogTm9kZSB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLl8kc3RhcnROb2RlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBwYXJ0J3MgdHJhaWxpbmcgbWFya2VyIG5vZGUsIGlmIGFueS4gU2VlIGAucGFyZW50Tm9kZWAgZm9yIG1vcmVcbiAgICogaW5mb3JtYXRpb24uXG4gICAqL1xuICBnZXQgZW5kTm9kZSgpOiBOb2RlIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuXyRlbmROb2RlO1xuICB9XG5cbiAgXyRzZXRWYWx1ZSh2YWx1ZTogdW5rbm93biwgZGlyZWN0aXZlUGFyZW50OiBEaXJlY3RpdmVQYXJlbnQgPSB0aGlzKTogdm9pZCB7XG4gICAgaWYgKERFVl9NT0RFICYmIHRoaXMucGFyZW50Tm9kZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgVGhpcyBcXGBDaGlsZFBhcnRcXGAgaGFzIG5vIFxcYHBhcmVudE5vZGVcXGAgYW5kIHRoZXJlZm9yZSBjYW5ub3QgYWNjZXB0IGEgdmFsdWUuIFRoaXMgbGlrZWx5IG1lYW5zIHRoZSBlbGVtZW50IGNvbnRhaW5pbmcgdGhlIHBhcnQgd2FzIG1hbmlwdWxhdGVkIGluIGFuIHVuc3VwcG9ydGVkIHdheSBvdXRzaWRlIG9mIExpdCdzIGNvbnRyb2wgc3VjaCB0aGF0IHRoZSBwYXJ0J3MgbWFya2VyIG5vZGVzIHdlcmUgZWplY3RlZCBmcm9tIERPTS4gRm9yIGV4YW1wbGUsIHNldHRpbmcgdGhlIGVsZW1lbnQncyBcXGBpbm5lckhUTUxcXGAgb3IgXFxgdGV4dENvbnRlbnRcXGAgY2FuIGRvIHRoaXMuYFxuICAgICAgKTtcbiAgICB9XG4gICAgdmFsdWUgPSByZXNvbHZlRGlyZWN0aXZlKHRoaXMsIHZhbHVlLCBkaXJlY3RpdmVQYXJlbnQpO1xuICAgIGlmIChpc1ByaW1pdGl2ZSh2YWx1ZSkpIHtcbiAgICAgIC8vIE5vbi1yZW5kZXJpbmcgY2hpbGQgdmFsdWVzLiBJdCdzIGltcG9ydGFudCB0aGF0IHRoZXNlIGRvIG5vdCByZW5kZXJcbiAgICAgIC8vIGVtcHR5IHRleHQgbm9kZXMgdG8gYXZvaWQgaXNzdWVzIHdpdGggcHJldmVudGluZyBkZWZhdWx0IDxzbG90PlxuICAgICAgLy8gZmFsbGJhY2sgY29udGVudC5cbiAgICAgIGlmICh2YWx1ZSA9PT0gbm90aGluZyB8fCB2YWx1ZSA9PSBudWxsIHx8IHZhbHVlID09PSAnJykge1xuICAgICAgICBpZiAodGhpcy5fJGNvbW1pdHRlZFZhbHVlICE9PSBub3RoaW5nKSB7XG4gICAgICAgICAgZGVidWdMb2dFdmVudCAmJlxuICAgICAgICAgICAgZGVidWdMb2dFdmVudCh7XG4gICAgICAgICAgICAgIGtpbmQ6ICdjb21taXQgbm90aGluZyB0byBjaGlsZCcsXG4gICAgICAgICAgICAgIHN0YXJ0OiB0aGlzLl8kc3RhcnROb2RlLFxuICAgICAgICAgICAgICBlbmQ6IHRoaXMuXyRlbmROb2RlLFxuICAgICAgICAgICAgICBwYXJlbnQ6IHRoaXMuXyRwYXJlbnQsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIHRoaXMuXyRjbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IG5vdGhpbmc7XG4gICAgICB9IGVsc2UgaWYgKHZhbHVlICE9PSB0aGlzLl8kY29tbWl0dGVkVmFsdWUgJiYgdmFsdWUgIT09IG5vQ2hhbmdlKSB7XG4gICAgICAgIHRoaXMuX2NvbW1pdFRleHQodmFsdWUpO1xuICAgICAgfVxuICAgICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICB9IGVsc2UgaWYgKCh2YWx1ZSBhcyBUZW1wbGF0ZVJlc3VsdClbJ18kbGl0VHlwZSQnXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9jb21taXRUZW1wbGF0ZVJlc3VsdCh2YWx1ZSBhcyBUZW1wbGF0ZVJlc3VsdCk7XG4gICAgfSBlbHNlIGlmICgodmFsdWUgYXMgTm9kZSkubm9kZVR5cGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKERFVl9NT0RFICYmIHRoaXMub3B0aW9ucz8uaG9zdCA9PT0gdmFsdWUpIHtcbiAgICAgICAgdGhpcy5fY29tbWl0VGV4dChcbiAgICAgICAgICBgW3Byb2JhYmxlIG1pc3Rha2U6IHJlbmRlcmVkIGEgdGVtcGxhdGUncyBob3N0IGluIGl0c2VsZiBgICtcbiAgICAgICAgICAgIGAoY29tbW9ubHkgY2F1c2VkIGJ5IHdyaXRpbmcgXFwke3RoaXN9IGluIGEgdGVtcGxhdGVdYFxuICAgICAgICApO1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgYEF0dGVtcHRlZCB0byByZW5kZXIgdGhlIHRlbXBsYXRlIGhvc3RgLFxuICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgIGBpbnNpZGUgaXRzZWxmLiBUaGlzIGlzIGFsbW9zdCBhbHdheXMgYSBtaXN0YWtlLCBhbmQgaW4gZGV2IG1vZGUgYCxcbiAgICAgICAgICBgd2UgcmVuZGVyIHNvbWUgd2FybmluZyB0ZXh0LiBJbiBwcm9kdWN0aW9uIGhvd2V2ZXIsIHdlJ2xsIGAsXG4gICAgICAgICAgYHJlbmRlciBpdCwgd2hpY2ggd2lsbCB1c3VhbGx5IHJlc3VsdCBpbiBhbiBlcnJvciwgYW5kIHNvbWV0aW1lcyBgLFxuICAgICAgICAgIGBpbiB0aGUgZWxlbWVudCBkaXNhcHBlYXJpbmcgZnJvbSB0aGUgRE9NLmBcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5fY29tbWl0Tm9kZSh2YWx1ZSBhcyBOb2RlKTtcbiAgICB9IGVsc2UgaWYgKGlzSXRlcmFibGUodmFsdWUpKSB7XG4gICAgICB0aGlzLl9jb21taXRJdGVyYWJsZSh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEZhbGxiYWNrLCB3aWxsIHJlbmRlciB0aGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAgICB0aGlzLl9jb21taXRUZXh0KHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9pbnNlcnQ8VCBleHRlbmRzIE5vZGU+KG5vZGU6IFQpIHtcbiAgICByZXR1cm4gd3JhcCh3cmFwKHRoaXMuXyRzdGFydE5vZGUpLnBhcmVudE5vZGUhKS5pbnNlcnRCZWZvcmUoXG4gICAgICBub2RlLFxuICAgICAgdGhpcy5fJGVuZE5vZGVcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBfY29tbWl0Tm9kZSh2YWx1ZTogTm9kZSk6IHZvaWQge1xuICAgIGlmICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICB0aGlzLl8kY2xlYXIoKTtcbiAgICAgIGlmIChcbiAgICAgICAgRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTICYmXG4gICAgICAgIHNhbml0aXplckZhY3RvcnlJbnRlcm5hbCAhPT0gbm9vcFNhbml0aXplclxuICAgICAgKSB7XG4gICAgICAgIGNvbnN0IHBhcmVudE5vZGVOYW1lID0gdGhpcy5fJHN0YXJ0Tm9kZS5wYXJlbnROb2RlPy5ub2RlTmFtZTtcbiAgICAgICAgaWYgKHBhcmVudE5vZGVOYW1lID09PSAnU1RZTEUnIHx8IHBhcmVudE5vZGVOYW1lID09PSAnU0NSSVBUJykge1xuICAgICAgICAgIGxldCBtZXNzYWdlID0gJ0ZvcmJpZGRlbic7XG4gICAgICAgICAgaWYgKERFVl9NT0RFKSB7XG4gICAgICAgICAgICBpZiAocGFyZW50Tm9kZU5hbWUgPT09ICdTVFlMRScpIHtcbiAgICAgICAgICAgICAgbWVzc2FnZSA9XG4gICAgICAgICAgICAgICAgYExpdCBkb2VzIG5vdCBzdXBwb3J0IGJpbmRpbmcgaW5zaWRlIHN0eWxlIG5vZGVzLiBgICtcbiAgICAgICAgICAgICAgICBgVGhpcyBpcyBhIHNlY3VyaXR5IHJpc2ssIGFzIHN0eWxlIGluamVjdGlvbiBhdHRhY2tzIGNhbiBgICtcbiAgICAgICAgICAgICAgICBgZXhmaWx0cmF0ZSBkYXRhIGFuZCBzcG9vZiBVSXMuIGAgK1xuICAgICAgICAgICAgICAgIGBDb25zaWRlciBpbnN0ZWFkIHVzaW5nIGNzc1xcYC4uLlxcYCBsaXRlcmFscyBgICtcbiAgICAgICAgICAgICAgICBgdG8gY29tcG9zZSBzdHlsZXMsIGFuZCBtYWtlIGRvIGR5bmFtaWMgc3R5bGluZyB3aXRoIGAgK1xuICAgICAgICAgICAgICAgIGBjc3MgY3VzdG9tIHByb3BlcnRpZXMsIDo6cGFydHMsIDxzbG90PnMsIGAgK1xuICAgICAgICAgICAgICAgIGBhbmQgYnkgbXV0YXRpbmcgdGhlIERPTSByYXRoZXIgdGhhbiBzdHlsZXNoZWV0cy5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbWVzc2FnZSA9XG4gICAgICAgICAgICAgICAgYExpdCBkb2VzIG5vdCBzdXBwb3J0IGJpbmRpbmcgaW5zaWRlIHNjcmlwdCBub2Rlcy4gYCArXG4gICAgICAgICAgICAgICAgYFRoaXMgaXMgYSBzZWN1cml0eSByaXNrLCBhcyBpdCBjb3VsZCBhbGxvdyBhcmJpdHJhcnkgYCArXG4gICAgICAgICAgICAgICAgYGNvZGUgZXhlY3V0aW9uLmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZGVidWdMb2dFdmVudCAmJlxuICAgICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAgICBraW5kOiAnY29tbWl0IG5vZGUnLFxuICAgICAgICAgIHN0YXJ0OiB0aGlzLl8kc3RhcnROb2RlLFxuICAgICAgICAgIHBhcmVudDogdGhpcy5fJHBhcmVudCxcbiAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICB9KTtcbiAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IHRoaXMuX2luc2VydCh2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfY29tbWl0VGV4dCh2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIC8vIElmIHRoZSBjb21taXR0ZWQgdmFsdWUgaXMgYSBwcmltaXRpdmUgaXQgbWVhbnMgd2UgY2FsbGVkIF9jb21taXRUZXh0IG9uXG4gICAgLy8gdGhlIHByZXZpb3VzIHJlbmRlciwgYW5kIHdlIGtub3cgdGhhdCB0aGlzLl8kc3RhcnROb2RlLm5leHRTaWJsaW5nIGlzIGFcbiAgICAvLyBUZXh0IG5vZGUuIFdlIGNhbiBub3cganVzdCByZXBsYWNlIHRoZSB0ZXh0IGNvbnRlbnQgKC5kYXRhKSBvZiB0aGUgbm9kZS5cbiAgICBpZiAoXG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgIT09IG5vdGhpbmcgJiZcbiAgICAgIGlzUHJpbWl0aXZlKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSlcbiAgICApIHtcbiAgICAgIGNvbnN0IG5vZGUgPSB3cmFwKHRoaXMuXyRzdGFydE5vZGUpLm5leHRTaWJsaW5nIGFzIFRleHQ7XG4gICAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICAgIGlmICh0aGlzLl90ZXh0U2FuaXRpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aGlzLl90ZXh0U2FuaXRpemVyID0gY3JlYXRlU2FuaXRpemVyKG5vZGUsICdkYXRhJywgJ3Byb3BlcnR5Jyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWUgPSB0aGlzLl90ZXh0U2FuaXRpemVyKHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgICAgZGVidWdMb2dFdmVudCh7XG4gICAgICAgICAga2luZDogJ2NvbW1pdCB0ZXh0JyxcbiAgICAgICAgICBub2RlLFxuICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgfSk7XG4gICAgICAobm9kZSBhcyBUZXh0KS5kYXRhID0gdmFsdWUgYXMgc3RyaW5nO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICAgIGNvbnN0IHRleHROb2RlID0gZC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICAgIHRoaXMuX2NvbW1pdE5vZGUodGV4dE5vZGUpO1xuICAgICAgICAvLyBXaGVuIHNldHRpbmcgdGV4dCBjb250ZW50LCBmb3Igc2VjdXJpdHkgcHVycG9zZXMgaXQgbWF0dGVycyBhIGxvdFxuICAgICAgICAvLyB3aGF0IHRoZSBwYXJlbnQgaXMuIEZvciBleGFtcGxlLCA8c3R5bGU+IGFuZCA8c2NyaXB0PiBuZWVkIHRvIGJlXG4gICAgICAgIC8vIGhhbmRsZWQgd2l0aCBjYXJlLCB3aGlsZSA8c3Bhbj4gZG9lcyBub3QuIFNvIGZpcnN0IHdlIG5lZWQgdG8gcHV0IGFcbiAgICAgICAgLy8gdGV4dCBub2RlIGludG8gdGhlIGRvY3VtZW50LCB0aGVuIHdlIGNhbiBzYW5pdGl6ZSBpdHMgY29udGVudC5cbiAgICAgICAgaWYgKHRoaXMuX3RleHRTYW5pdGl6ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRoaXMuX3RleHRTYW5pdGl6ZXIgPSBjcmVhdGVTYW5pdGl6ZXIodGV4dE5vZGUsICdkYXRhJywgJ3Byb3BlcnR5Jyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWUgPSB0aGlzLl90ZXh0U2FuaXRpemVyKHZhbHVlKTtcbiAgICAgICAgZGVidWdMb2dFdmVudCAmJlxuICAgICAgICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAgICAgICAga2luZDogJ2NvbW1pdCB0ZXh0JyxcbiAgICAgICAgICAgIG5vZGU6IHRleHROb2RlLFxuICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgICAgfSk7XG4gICAgICAgIHRleHROb2RlLmRhdGEgPSB2YWx1ZSBhcyBzdHJpbmc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9jb21taXROb2RlKGQuY3JlYXRlVGV4dE5vZGUodmFsdWUgYXMgc3RyaW5nKSk7XG4gICAgICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAgICAgIGtpbmQ6ICdjb21taXQgdGV4dCcsXG4gICAgICAgICAgICBub2RlOiB3cmFwKHRoaXMuXyRzdGFydE5vZGUpLm5leHRTaWJsaW5nIGFzIFRleHQsXG4gICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gdmFsdWU7XG4gIH1cblxuICBwcml2YXRlIF9jb21taXRUZW1wbGF0ZVJlc3VsdChcbiAgICByZXN1bHQ6IFRlbXBsYXRlUmVzdWx0IHwgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdFxuICApOiB2b2lkIHtcbiAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIGNvbnN0IHt2YWx1ZXMsIFsnXyRsaXRUeXBlJCddOiB0eXBlfSA9IHJlc3VsdDtcbiAgICAvLyBJZiAkbGl0VHlwZSQgaXMgYSBudW1iZXIsIHJlc3VsdCBpcyBhIHBsYWluIFRlbXBsYXRlUmVzdWx0IGFuZCB3ZSBnZXRcbiAgICAvLyB0aGUgdGVtcGxhdGUgZnJvbSB0aGUgdGVtcGxhdGUgY2FjaGUuIElmIG5vdCwgcmVzdWx0IGlzIGFcbiAgICAvLyBDb21waWxlZFRlbXBsYXRlUmVzdWx0IGFuZCBfJGxpdFR5cGUkIGlzIGEgQ29tcGlsZWRUZW1wbGF0ZSBhbmQgd2UgbmVlZFxuICAgIC8vIHRvIGNyZWF0ZSB0aGUgPHRlbXBsYXRlPiBlbGVtZW50IHRoZSBmaXJzdCB0aW1lIHdlIHNlZSBpdC5cbiAgICBjb25zdCB0ZW1wbGF0ZTogVGVtcGxhdGUgfCBDb21waWxlZFRlbXBsYXRlID1cbiAgICAgIHR5cGVvZiB0eXBlID09PSAnbnVtYmVyJ1xuICAgICAgICA/IHRoaXMuXyRnZXRUZW1wbGF0ZShyZXN1bHQgYXMgVW5jb21waWxlZFRlbXBsYXRlUmVzdWx0KVxuICAgICAgICA6ICh0eXBlLmVsID09PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgICh0eXBlLmVsID0gVGVtcGxhdGUuY3JlYXRlRWxlbWVudChcbiAgICAgICAgICAgICAgdHJ1c3RGcm9tVGVtcGxhdGVTdHJpbmcodHlwZS5oLCB0eXBlLmhbMF0pLFxuICAgICAgICAgICAgICB0aGlzLm9wdGlvbnNcbiAgICAgICAgICAgICkpLFxuICAgICAgICAgIHR5cGUpO1xuXG4gICAgaWYgKCh0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgVGVtcGxhdGVJbnN0YW5jZSk/Ll8kdGVtcGxhdGUgPT09IHRlbXBsYXRlKSB7XG4gICAgICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSB1cGRhdGluZycsXG4gICAgICAgICAgdGVtcGxhdGUsXG4gICAgICAgICAgaW5zdGFuY2U6IHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBUZW1wbGF0ZUluc3RhbmNlLFxuICAgICAgICAgIHBhcnRzOiAodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIFRlbXBsYXRlSW5zdGFuY2UpLl8kcGFydHMsXG4gICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICAgIHZhbHVlcyxcbiAgICAgICAgfSk7XG4gICAgICAodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIFRlbXBsYXRlSW5zdGFuY2UpLl91cGRhdGUodmFsdWVzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgaW5zdGFuY2UgPSBuZXcgVGVtcGxhdGVJbnN0YW5jZSh0ZW1wbGF0ZSBhcyBUZW1wbGF0ZSwgdGhpcyk7XG4gICAgICBjb25zdCBmcmFnbWVudCA9IGluc3RhbmNlLl9jbG9uZSh0aGlzLm9wdGlvbnMpO1xuICAgICAgZGVidWdMb2dFdmVudCAmJlxuICAgICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAgICBraW5kOiAndGVtcGxhdGUgaW5zdGFudGlhdGVkJyxcbiAgICAgICAgICB0ZW1wbGF0ZSxcbiAgICAgICAgICBpbnN0YW5jZSxcbiAgICAgICAgICBwYXJ0czogaW5zdGFuY2UuXyRwYXJ0cyxcbiAgICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgICAgZnJhZ21lbnQsXG4gICAgICAgICAgdmFsdWVzLFxuICAgICAgICB9KTtcbiAgICAgIGluc3RhbmNlLl91cGRhdGUodmFsdWVzKTtcbiAgICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgICAgZGVidWdMb2dFdmVudCh7XG4gICAgICAgICAga2luZDogJ3RlbXBsYXRlIGluc3RhbnRpYXRlZCBhbmQgdXBkYXRlZCcsXG4gICAgICAgICAgdGVtcGxhdGUsXG4gICAgICAgICAgaW5zdGFuY2UsXG4gICAgICAgICAgcGFydHM6IGluc3RhbmNlLl8kcGFydHMsXG4gICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICAgIGZyYWdtZW50LFxuICAgICAgICAgIHZhbHVlcyxcbiAgICAgICAgfSk7XG4gICAgICB0aGlzLl9jb21taXROb2RlKGZyYWdtZW50KTtcbiAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IGluc3RhbmNlO1xuICAgIH1cbiAgfVxuXG4gIC8vIE92ZXJyaWRkZW4gdmlhIGBsaXRIdG1sUG9seWZpbGxTdXBwb3J0YCB0byBwcm92aWRlIHBsYXRmb3JtIHN1cHBvcnQuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRnZXRUZW1wbGF0ZShyZXN1bHQ6IFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdCkge1xuICAgIGxldCB0ZW1wbGF0ZSA9IHRlbXBsYXRlQ2FjaGUuZ2V0KHJlc3VsdC5zdHJpbmdzKTtcbiAgICBpZiAodGVtcGxhdGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGVtcGxhdGVDYWNoZS5zZXQocmVzdWx0LnN0cmluZ3MsICh0ZW1wbGF0ZSA9IG5ldyBUZW1wbGF0ZShyZXN1bHQpKSk7XG4gICAgfVxuICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbW1pdEl0ZXJhYmxlKHZhbHVlOiBJdGVyYWJsZTx1bmtub3duPik6IHZvaWQge1xuICAgIC8vIEZvciBhbiBJdGVyYWJsZSwgd2UgY3JlYXRlIGEgbmV3IEluc3RhbmNlUGFydCBwZXIgaXRlbSwgdGhlbiBzZXQgaXRzXG4gICAgLy8gdmFsdWUgdG8gdGhlIGl0ZW0uIFRoaXMgaXMgYSBsaXR0bGUgYml0IG9mIG92ZXJoZWFkIGZvciBldmVyeSBpdGVtIGluXG4gICAgLy8gYW4gSXRlcmFibGUsIGJ1dCBpdCBsZXRzIHVzIHJlY3Vyc2UgZWFzaWx5IGFuZCBlZmZpY2llbnRseSB1cGRhdGUgQXJyYXlzXG4gICAgLy8gb2YgVGVtcGxhdGVSZXN1bHRzIHRoYXQgd2lsbCBiZSBjb21tb25seSByZXR1cm5lZCBmcm9tIGV4cHJlc3Npb25zIGxpa2U6XG4gICAgLy8gYXJyYXkubWFwKChpKSA9PiBodG1sYCR7aX1gKSwgYnkgcmV1c2luZyBleGlzdGluZyBUZW1wbGF0ZUluc3RhbmNlcy5cblxuICAgIC8vIElmIHZhbHVlIGlzIGFuIGFycmF5LCB0aGVuIHRoZSBwcmV2aW91cyByZW5kZXIgd2FzIG9mIGFuXG4gICAgLy8gaXRlcmFibGUgYW5kIHZhbHVlIHdpbGwgY29udGFpbiB0aGUgQ2hpbGRQYXJ0cyBmcm9tIHRoZSBwcmV2aW91c1xuICAgIC8vIHJlbmRlci4gSWYgdmFsdWUgaXMgbm90IGFuIGFycmF5LCBjbGVhciB0aGlzIHBhcnQgYW5kIG1ha2UgYSBuZXdcbiAgICAvLyBhcnJheSBmb3IgQ2hpbGRQYXJ0cy5cbiAgICBpZiAoIWlzQXJyYXkodGhpcy5fJGNvbW1pdHRlZFZhbHVlKSkge1xuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gW107XG4gICAgICB0aGlzLl8kY2xlYXIoKTtcbiAgICB9XG5cbiAgICAvLyBMZXRzIHVzIGtlZXAgdHJhY2sgb2YgaG93IG1hbnkgaXRlbXMgd2Ugc3RhbXBlZCBzbyB3ZSBjYW4gY2xlYXIgbGVmdG92ZXJcbiAgICAvLyBpdGVtcyBmcm9tIGEgcHJldmlvdXMgcmVuZGVyXG4gICAgY29uc3QgaXRlbVBhcnRzID0gdGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIENoaWxkUGFydFtdO1xuICAgIGxldCBwYXJ0SW5kZXggPSAwO1xuICAgIGxldCBpdGVtUGFydDogQ2hpbGRQYXJ0IHwgdW5kZWZpbmVkO1xuXG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHZhbHVlKSB7XG4gICAgICBpZiAocGFydEluZGV4ID09PSBpdGVtUGFydHMubGVuZ3RoKSB7XG4gICAgICAgIC8vIElmIG5vIGV4aXN0aW5nIHBhcnQsIGNyZWF0ZSBhIG5ldyBvbmVcbiAgICAgICAgLy8gVE9ETyAoanVzdGluZmFnbmFuaSk6IHRlc3QgcGVyZiBpbXBhY3Qgb2YgYWx3YXlzIGNyZWF0aW5nIHR3byBwYXJ0c1xuICAgICAgICAvLyBpbnN0ZWFkIG9mIHNoYXJpbmcgcGFydHMgYmV0d2VlbiBub2Rlc1xuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbGl0L2xpdC9pc3N1ZXMvMTI2NlxuICAgICAgICBpdGVtUGFydHMucHVzaChcbiAgICAgICAgICAoaXRlbVBhcnQgPSBuZXcgQ2hpbGRQYXJ0KFxuICAgICAgICAgICAgdGhpcy5faW5zZXJ0KGNyZWF0ZU1hcmtlcigpKSxcbiAgICAgICAgICAgIHRoaXMuX2luc2VydChjcmVhdGVNYXJrZXIoKSksXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgdGhpcy5vcHRpb25zXG4gICAgICAgICAgKSlcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFJldXNlIGFuIGV4aXN0aW5nIHBhcnRcbiAgICAgICAgaXRlbVBhcnQgPSBpdGVtUGFydHNbcGFydEluZGV4XTtcbiAgICAgIH1cbiAgICAgIGl0ZW1QYXJ0Ll8kc2V0VmFsdWUoaXRlbSk7XG4gICAgICBwYXJ0SW5kZXgrKztcbiAgICB9XG5cbiAgICBpZiAocGFydEluZGV4IDwgaXRlbVBhcnRzLmxlbmd0aCkge1xuICAgICAgLy8gaXRlbVBhcnRzIGFsd2F5cyBoYXZlIGVuZCBub2Rlc1xuICAgICAgdGhpcy5fJGNsZWFyKFxuICAgICAgICBpdGVtUGFydCAmJiB3cmFwKGl0ZW1QYXJ0Ll8kZW5kTm9kZSEpLm5leHRTaWJsaW5nLFxuICAgICAgICBwYXJ0SW5kZXhcbiAgICAgICk7XG4gICAgICAvLyBUcnVuY2F0ZSB0aGUgcGFydHMgYXJyYXkgc28gX3ZhbHVlIHJlZmxlY3RzIHRoZSBjdXJyZW50IHN0YXRlXG4gICAgICBpdGVtUGFydHMubGVuZ3RoID0gcGFydEluZGV4O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIHRoZSBub2RlcyBjb250YWluZWQgd2l0aGluIHRoaXMgUGFydCBmcm9tIHRoZSBET00uXG4gICAqXG4gICAqIEBwYXJhbSBzdGFydCBTdGFydCBub2RlIHRvIGNsZWFyIGZyb20sIGZvciBjbGVhcmluZyBhIHN1YnNldCBvZiB0aGUgcGFydCdzXG4gICAqICAgICBET00gKHVzZWQgd2hlbiB0cnVuY2F0aW5nIGl0ZXJhYmxlcylcbiAgICogQHBhcmFtIGZyb20gIFdoZW4gYHN0YXJ0YCBpcyBzcGVjaWZpZWQsIHRoZSBpbmRleCB3aXRoaW4gdGhlIGl0ZXJhYmxlIGZyb21cbiAgICogICAgIHdoaWNoIENoaWxkUGFydHMgYXJlIGJlaW5nIHJlbW92ZWQsIHVzZWQgZm9yIGRpc2Nvbm5lY3RpbmcgZGlyZWN0aXZlcyBpblxuICAgKiAgICAgdGhvc2UgUGFydHMuXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgXyRjbGVhcihcbiAgICBzdGFydDogQ2hpbGROb2RlIHwgbnVsbCA9IHdyYXAodGhpcy5fJHN0YXJ0Tm9kZSkubmV4dFNpYmxpbmcsXG4gICAgZnJvbT86IG51bWJlclxuICApIHtcbiAgICB0aGlzLl8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQ/LihmYWxzZSwgdHJ1ZSwgZnJvbSk7XG4gICAgd2hpbGUgKHN0YXJ0ICYmIHN0YXJ0ICE9PSB0aGlzLl8kZW5kTm9kZSkge1xuICAgICAgY29uc3QgbiA9IHdyYXAoc3RhcnQhKS5uZXh0U2libGluZztcbiAgICAgICh3cmFwKHN0YXJ0ISkgYXMgRWxlbWVudCkucmVtb3ZlKCk7XG4gICAgICBzdGFydCA9IG47XG4gICAgfVxuICB9XG4gIC8qKlxuICAgKiBJbXBsZW1lbnRhdGlvbiBvZiBSb290UGFydCdzIGBpc0Nvbm5lY3RlZGAuIE5vdGUgdGhhdCB0aGlzIG1ldG9kXG4gICAqIHNob3VsZCBvbmx5IGJlIGNhbGxlZCBvbiBgUm9vdFBhcnRgcyAodGhlIGBDaGlsZFBhcnRgIHJldHVybmVkIGZyb20gYVxuICAgKiB0b3AtbGV2ZWwgYHJlbmRlcigpYCBjYWxsKS4gSXQgaGFzIG5vIGVmZmVjdCBvbiBub24tcm9vdCBDaGlsZFBhcnRzLlxuICAgKiBAcGFyYW0gaXNDb25uZWN0ZWQgV2hldGhlciB0byBzZXRcbiAgICogQGludGVybmFsXG4gICAqL1xuICBzZXRDb25uZWN0ZWQoaXNDb25uZWN0ZWQ6IGJvb2xlYW4pIHtcbiAgICBpZiAodGhpcy5fJHBhcmVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9faXNDb25uZWN0ZWQgPSBpc0Nvbm5lY3RlZDtcbiAgICAgIHRoaXMuXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZD8uKGlzQ29ubmVjdGVkKTtcbiAgICB9IGVsc2UgaWYgKERFVl9NT0RFKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdwYXJ0LnNldENvbm5lY3RlZCgpIG1heSBvbmx5IGJlIGNhbGxlZCBvbiBhICcgK1xuICAgICAgICAgICdSb290UGFydCByZXR1cm5lZCBmcm9tIHJlbmRlcigpLidcbiAgICAgICk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQSB0b3AtbGV2ZWwgYENoaWxkUGFydGAgcmV0dXJuZWQgZnJvbSBgcmVuZGVyYCB0aGF0IG1hbmFnZXMgdGhlIGNvbm5lY3RlZFxuICogc3RhdGUgb2YgYEFzeW5jRGlyZWN0aXZlYHMgY3JlYXRlZCB0aHJvdWdob3V0IHRoZSB0cmVlIGJlbG93IGl0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJvb3RQYXJ0IGV4dGVuZHMgQ2hpbGRQYXJ0IHtcbiAgLyoqXG4gICAqIFNldHMgdGhlIGNvbm5lY3Rpb24gc3RhdGUgZm9yIGBBc3luY0RpcmVjdGl2ZWBzIGNvbnRhaW5lZCB3aXRoaW4gdGhpcyByb290XG4gICAqIENoaWxkUGFydC5cbiAgICpcbiAgICogbGl0LWh0bWwgZG9lcyBub3QgYXV0b21hdGljYWxseSBtb25pdG9yIHRoZSBjb25uZWN0ZWRuZXNzIG9mIERPTSByZW5kZXJlZDtcbiAgICogYXMgc3VjaCwgaXQgaXMgdGhlIHJlc3BvbnNpYmlsaXR5IG9mIHRoZSBjYWxsZXIgdG8gYHJlbmRlcmAgdG8gZW5zdXJlIHRoYXRcbiAgICogYHBhcnQuc2V0Q29ubmVjdGVkKGZhbHNlKWAgaXMgY2FsbGVkIGJlZm9yZSB0aGUgcGFydCBvYmplY3QgaXMgcG90ZW50aWFsbHlcbiAgICogZGlzY2FyZGVkLCB0byBlbnN1cmUgdGhhdCBgQXN5bmNEaXJlY3RpdmVgcyBoYXZlIGEgY2hhbmNlIHRvIGRpc3Bvc2Ugb2ZcbiAgICogYW55IHJlc291cmNlcyBiZWluZyBoZWxkLiBJZiBhIGBSb290UGFydGAgdGhhdCB3YXMgcHJldmlvdXNseVxuICAgKiBkaXNjb25uZWN0ZWQgaXMgc3Vic2VxdWVudGx5IHJlLWNvbm5lY3RlZCAoYW5kIGl0cyBgQXN5bmNEaXJlY3RpdmVgcyBzaG91bGRcbiAgICogcmUtY29ubmVjdCksIGBzZXRDb25uZWN0ZWQodHJ1ZSlgIHNob3VsZCBiZSBjYWxsZWQuXG4gICAqXG4gICAqIEBwYXJhbSBpc0Nvbm5lY3RlZCBXaGV0aGVyIGRpcmVjdGl2ZXMgd2l0aGluIHRoaXMgdHJlZSBzaG91bGQgYmUgY29ubmVjdGVkXG4gICAqIG9yIG5vdFxuICAgKi9cbiAgc2V0Q29ubmVjdGVkKGlzQ29ubmVjdGVkOiBib29sZWFuKTogdm9pZDtcbn1cblxuZXhwb3J0IHR5cGUge0F0dHJpYnV0ZVBhcnR9O1xuY2xhc3MgQXR0cmlidXRlUGFydCBpbXBsZW1lbnRzIERpc2Nvbm5lY3RhYmxlIHtcbiAgcmVhZG9ubHkgdHlwZSA9IEFUVFJJQlVURV9QQVJUIGFzXG4gICAgfCB0eXBlb2YgQVRUUklCVVRFX1BBUlRcbiAgICB8IHR5cGVvZiBQUk9QRVJUWV9QQVJUXG4gICAgfCB0eXBlb2YgQk9PTEVBTl9BVFRSSUJVVEVfUEFSVFxuICAgIHwgdHlwZW9mIEVWRU5UX1BBUlQ7XG4gIHJlYWRvbmx5IGVsZW1lbnQ6IEhUTUxFbGVtZW50O1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIElmIHRoaXMgYXR0cmlidXRlIHBhcnQgcmVwcmVzZW50cyBhbiBpbnRlcnBvbGF0aW9uLCB0aGlzIGNvbnRhaW5zIHRoZVxuICAgKiBzdGF0aWMgc3RyaW5ncyBvZiB0aGUgaW50ZXJwb2xhdGlvbi4gRm9yIHNpbmdsZS12YWx1ZSwgY29tcGxldGUgYmluZGluZ3MsXG4gICAqIHRoaXMgaXMgdW5kZWZpbmVkLlxuICAgKi9cbiAgcmVhZG9ubHkgc3RyaW5ncz86IFJlYWRvbmx5QXJyYXk8c3RyaW5nPjtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGNvbW1pdHRlZFZhbHVlOiB1bmtub3duIHwgQXJyYXk8dW5rbm93bj4gPSBub3RoaW5nO1xuICAvKiogQGludGVybmFsICovXG4gIF9fZGlyZWN0aXZlcz86IEFycmF5PERpcmVjdGl2ZSB8IHVuZGVmaW5lZD47XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlO1xuICAvKiogQGludGVybmFsICovXG4gIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT4gPSB1bmRlZmluZWQ7XG5cbiAgcHJvdGVjdGVkIF9zYW5pdGl6ZXI6IFZhbHVlU2FuaXRpemVyIHwgdW5kZWZpbmVkO1xuXG4gIGdldCB0YWdOYW1lKCkge1xuICAgIHJldHVybiB0aGlzLmVsZW1lbnQudGFnTmFtZTtcbiAgfVxuXG4gIC8vIFNlZSBjb21tZW50IGluIERpc2Nvbm5lY3RhYmxlIGludGVyZmFjZSBmb3Igd2h5IHRoaXMgaXMgYSBnZXR0ZXJcbiAgZ2V0IF8kaXNDb25uZWN0ZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuXyRwYXJlbnQuXyRpc0Nvbm5lY3RlZDtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGVsZW1lbnQ6IEhUTUxFbGVtZW50LFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBzdHJpbmdzOiBSZWFkb25seUFycmF5PHN0cmluZz4sXG4gICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSxcbiAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkXG4gICkge1xuICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLl8kcGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgaWYgKHN0cmluZ3MubGVuZ3RoID4gMiB8fCBzdHJpbmdzWzBdICE9PSAnJyB8fCBzdHJpbmdzWzFdICE9PSAnJykge1xuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gbmV3IEFycmF5KHN0cmluZ3MubGVuZ3RoIC0gMSkuZmlsbChuZXcgU3RyaW5nKCkpO1xuICAgICAgdGhpcy5zdHJpbmdzID0gc3RyaW5ncztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gbm90aGluZztcbiAgICB9XG4gICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgdGhpcy5fc2FuaXRpemVyID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiB0aGlzIHBhcnQgYnkgcmVzb2x2aW5nIHRoZSB2YWx1ZSBmcm9tIHBvc3NpYmx5IG11bHRpcGxlXG4gICAqIHZhbHVlcyBhbmQgc3RhdGljIHN0cmluZ3MgYW5kIGNvbW1pdHRpbmcgaXQgdG8gdGhlIERPTS5cbiAgICogSWYgdGhpcyBwYXJ0IGlzIHNpbmdsZS12YWx1ZWQsIGB0aGlzLl9zdHJpbmdzYCB3aWxsIGJlIHVuZGVmaW5lZCwgYW5kIHRoZVxuICAgKiBtZXRob2Qgd2lsbCBiZSBjYWxsZWQgd2l0aCBhIHNpbmdsZSB2YWx1ZSBhcmd1bWVudC4gSWYgdGhpcyBwYXJ0IGlzXG4gICAqIG11bHRpLXZhbHVlLCBgdGhpcy5fc3RyaW5nc2Agd2lsbCBiZSBkZWZpbmVkLCBhbmQgdGhlIG1ldGhvZCBpcyBjYWxsZWRcbiAgICogd2l0aCB0aGUgdmFsdWUgYXJyYXkgb2YgdGhlIHBhcnQncyBvd25pbmcgVGVtcGxhdGVJbnN0YW5jZSwgYW5kIGFuIG9mZnNldFxuICAgKiBpbnRvIHRoZSB2YWx1ZSBhcnJheSBmcm9tIHdoaWNoIHRoZSB2YWx1ZXMgc2hvdWxkIGJlIHJlYWQuXG4gICAqIFRoaXMgbWV0aG9kIGlzIG92ZXJsb2FkZWQgdGhpcyB3YXkgdG8gZWxpbWluYXRlIHNob3J0LWxpdmVkIGFycmF5IHNsaWNlc1xuICAgKiBvZiB0aGUgdGVtcGxhdGUgaW5zdGFuY2UgdmFsdWVzLCBhbmQgYWxsb3cgYSBmYXN0LXBhdGggZm9yIHNpbmdsZS12YWx1ZWRcbiAgICogcGFydHMuXG4gICAqXG4gICAqIEBwYXJhbSB2YWx1ZSBUaGUgcGFydCB2YWx1ZSwgb3IgYW4gYXJyYXkgb2YgdmFsdWVzIGZvciBtdWx0aS12YWx1ZWQgcGFydHNcbiAgICogQHBhcmFtIHZhbHVlSW5kZXggdGhlIGluZGV4IHRvIHN0YXJ0IHJlYWRpbmcgdmFsdWVzIGZyb20uIGB1bmRlZmluZWRgIGZvclxuICAgKiAgIHNpbmdsZS12YWx1ZWQgcGFydHNcbiAgICogQHBhcmFtIG5vQ29tbWl0IGNhdXNlcyB0aGUgcGFydCB0byBub3QgY29tbWl0IGl0cyB2YWx1ZSB0byB0aGUgRE9NLiBVc2VkXG4gICAqICAgaW4gaHlkcmF0aW9uIHRvIHByaW1lIGF0dHJpYnV0ZSBwYXJ0cyB3aXRoIHRoZWlyIGZpcnN0LXJlbmRlcmVkIHZhbHVlLFxuICAgKiAgIGJ1dCBub3Qgc2V0IHRoZSBhdHRyaWJ1dGUsIGFuZCBpbiBTU1IgdG8gbm8tb3AgdGhlIERPTSBvcGVyYXRpb24gYW5kXG4gICAqICAgY2FwdHVyZSB0aGUgdmFsdWUgZm9yIHNlcmlhbGl6YXRpb24uXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgXyRzZXRWYWx1ZShcbiAgICB2YWx1ZTogdW5rbm93biB8IEFycmF5PHVua25vd24+LFxuICAgIGRpcmVjdGl2ZVBhcmVudDogRGlyZWN0aXZlUGFyZW50ID0gdGhpcyxcbiAgICB2YWx1ZUluZGV4PzogbnVtYmVyLFxuICAgIG5vQ29tbWl0PzogYm9vbGVhblxuICApIHtcbiAgICBjb25zdCBzdHJpbmdzID0gdGhpcy5zdHJpbmdzO1xuXG4gICAgLy8gV2hldGhlciBhbnkgb2YgdGhlIHZhbHVlcyBoYXMgY2hhbmdlZCwgZm9yIGRpcnR5LWNoZWNraW5nXG4gICAgbGV0IGNoYW5nZSA9IGZhbHNlO1xuXG4gICAgaWYgKHN0cmluZ3MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gU2luZ2xlLXZhbHVlIGJpbmRpbmcgY2FzZVxuICAgICAgdmFsdWUgPSByZXNvbHZlRGlyZWN0aXZlKHRoaXMsIHZhbHVlLCBkaXJlY3RpdmVQYXJlbnQsIDApO1xuICAgICAgY2hhbmdlID1cbiAgICAgICAgIWlzUHJpbWl0aXZlKHZhbHVlKSB8fFxuICAgICAgICAodmFsdWUgIT09IHRoaXMuXyRjb21taXR0ZWRWYWx1ZSAmJiB2YWx1ZSAhPT0gbm9DaGFuZ2UpO1xuICAgICAgaWYgKGNoYW5nZSkge1xuICAgICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSW50ZXJwb2xhdGlvbiBjYXNlXG4gICAgICBjb25zdCB2YWx1ZXMgPSB2YWx1ZSBhcyBBcnJheTx1bmtub3duPjtcbiAgICAgIHZhbHVlID0gc3RyaW5nc1swXTtcblxuICAgICAgbGV0IGksIHY7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgc3RyaW5ncy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgdiA9IHJlc29sdmVEaXJlY3RpdmUodGhpcywgdmFsdWVzW3ZhbHVlSW5kZXghICsgaV0sIGRpcmVjdGl2ZVBhcmVudCwgaSk7XG5cbiAgICAgICAgaWYgKHYgPT09IG5vQ2hhbmdlKSB7XG4gICAgICAgICAgLy8gSWYgdGhlIHVzZXItcHJvdmlkZWQgdmFsdWUgaXMgYG5vQ2hhbmdlYCwgdXNlIHRoZSBwcmV2aW91cyB2YWx1ZVxuICAgICAgICAgIHYgPSAodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIEFycmF5PHVua25vd24+KVtpXTtcbiAgICAgICAgfVxuICAgICAgICBjaGFuZ2UgfHw9XG4gICAgICAgICAgIWlzUHJpbWl0aXZlKHYpIHx8IHYgIT09ICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgQXJyYXk8dW5rbm93bj4pW2ldO1xuICAgICAgICBpZiAodiA9PT0gbm90aGluZykge1xuICAgICAgICAgIHZhbHVlID0gbm90aGluZztcbiAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSAhPT0gbm90aGluZykge1xuICAgICAgICAgIHZhbHVlICs9ICh2ID8/ICcnKSArIHN0cmluZ3NbaSArIDFdO1xuICAgICAgICB9XG4gICAgICAgIC8vIFdlIGFsd2F5cyByZWNvcmQgZWFjaCB2YWx1ZSwgZXZlbiBpZiBvbmUgaXMgYG5vdGhpbmdgLCBmb3IgZnV0dXJlXG4gICAgICAgIC8vIGNoYW5nZSBkZXRlY3Rpb24uXG4gICAgICAgICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgQXJyYXk8dW5rbm93bj4pW2ldID0gdjtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGNoYW5nZSAmJiAhbm9Db21taXQpIHtcbiAgICAgIHRoaXMuX2NvbW1pdFZhbHVlKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIF9jb21taXRWYWx1ZSh2YWx1ZTogdW5rbm93bikge1xuICAgIGlmICh2YWx1ZSA9PT0gbm90aGluZykge1xuICAgICAgKHdyYXAodGhpcy5lbGVtZW50KSBhcyBFbGVtZW50KS5yZW1vdmVBdHRyaWJ1dGUodGhpcy5uYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgICBpZiAodGhpcy5fc2FuaXRpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aGlzLl9zYW5pdGl6ZXIgPSBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwoXG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQsXG4gICAgICAgICAgICB0aGlzLm5hbWUsXG4gICAgICAgICAgICAnYXR0cmlidXRlJ1xuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWUgPSB0aGlzLl9zYW5pdGl6ZXIodmFsdWUgPz8gJycpO1xuICAgICAgfVxuICAgICAgZGVidWdMb2dFdmVudCAmJlxuICAgICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAgICBraW5kOiAnY29tbWl0IGF0dHJpYnV0ZScsXG4gICAgICAgICAgZWxlbWVudDogdGhpcy5lbGVtZW50LFxuICAgICAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgIH0pO1xuICAgICAgKHdyYXAodGhpcy5lbGVtZW50KSBhcyBFbGVtZW50KS5zZXRBdHRyaWJ1dGUoXG4gICAgICAgIHRoaXMubmFtZSxcbiAgICAgICAgKHZhbHVlID8/ICcnKSBhcyBzdHJpbmdcbiAgICAgICk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCB0eXBlIHtQcm9wZXJ0eVBhcnR9O1xuY2xhc3MgUHJvcGVydHlQYXJ0IGV4dGVuZHMgQXR0cmlidXRlUGFydCB7XG4gIG92ZXJyaWRlIHJlYWRvbmx5IHR5cGUgPSBQUk9QRVJUWV9QQVJUO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgb3ZlcnJpZGUgX2NvbW1pdFZhbHVlKHZhbHVlOiB1bmtub3duKSB7XG4gICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgaWYgKHRoaXMuX3Nhbml0aXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX3Nhbml0aXplciA9IHNhbml0aXplckZhY3RvcnlJbnRlcm5hbChcbiAgICAgICAgICB0aGlzLmVsZW1lbnQsXG4gICAgICAgICAgdGhpcy5uYW1lLFxuICAgICAgICAgICdwcm9wZXJ0eSdcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHZhbHVlID0gdGhpcy5fc2FuaXRpemVyKHZhbHVlKTtcbiAgICB9XG4gICAgZGVidWdMb2dFdmVudCAmJlxuICAgICAgZGVidWdMb2dFdmVudCh7XG4gICAgICAgIGtpbmQ6ICdjb21taXQgcHJvcGVydHknLFxuICAgICAgICBlbGVtZW50OiB0aGlzLmVsZW1lbnQsXG4gICAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgICAgdmFsdWUsXG4gICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgIH0pO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgKHRoaXMuZWxlbWVudCBhcyBhbnkpW3RoaXMubmFtZV0gPSB2YWx1ZSA9PT0gbm90aGluZyA/IHVuZGVmaW5lZCA6IHZhbHVlO1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIHtCb29sZWFuQXR0cmlidXRlUGFydH07XG5jbGFzcyBCb29sZWFuQXR0cmlidXRlUGFydCBleHRlbmRzIEF0dHJpYnV0ZVBhcnQge1xuICBvdmVycmlkZSByZWFkb25seSB0eXBlID0gQk9PTEVBTl9BVFRSSUJVVEVfUEFSVDtcblxuICAvKiogQGludGVybmFsICovXG4gIG92ZXJyaWRlIF9jb21taXRWYWx1ZSh2YWx1ZTogdW5rbm93bikge1xuICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAgICBraW5kOiAnY29tbWl0IGJvb2xlYW4gYXR0cmlidXRlJyxcbiAgICAgICAgZWxlbWVudDogdGhpcy5lbGVtZW50LFxuICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgIHZhbHVlOiAhISh2YWx1ZSAmJiB2YWx1ZSAhPT0gbm90aGluZyksXG4gICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgIH0pO1xuICAgICh3cmFwKHRoaXMuZWxlbWVudCkgYXMgRWxlbWVudCkudG9nZ2xlQXR0cmlidXRlKFxuICAgICAgdGhpcy5uYW1lLFxuICAgICAgISF2YWx1ZSAmJiB2YWx1ZSAhPT0gbm90aGluZ1xuICAgICk7XG4gIH1cbn1cblxudHlwZSBFdmVudExpc3RlbmVyV2l0aE9wdGlvbnMgPSBFdmVudExpc3RlbmVyT3JFdmVudExpc3RlbmVyT2JqZWN0ICZcbiAgUGFydGlhbDxBZGRFdmVudExpc3RlbmVyT3B0aW9ucz47XG5cbi8qKlxuICogQW4gQXR0cmlidXRlUGFydCB0aGF0IG1hbmFnZXMgYW4gZXZlbnQgbGlzdGVuZXIgdmlhIGFkZC9yZW1vdmVFdmVudExpc3RlbmVyLlxuICpcbiAqIFRoaXMgcGFydCB3b3JrcyBieSBhZGRpbmcgaXRzZWxmIGFzIHRoZSBldmVudCBsaXN0ZW5lciBvbiBhbiBlbGVtZW50LCB0aGVuXG4gKiBkZWxlZ2F0aW5nIHRvIHRoZSB2YWx1ZSBwYXNzZWQgdG8gaXQuIFRoaXMgcmVkdWNlcyB0aGUgbnVtYmVyIG9mIGNhbGxzIHRvXG4gKiBhZGQvcmVtb3ZlRXZlbnRMaXN0ZW5lciBpZiB0aGUgbGlzdGVuZXIgY2hhbmdlcyBmcmVxdWVudGx5LCBzdWNoIGFzIHdoZW4gYW5cbiAqIGlubGluZSBmdW5jdGlvbiBpcyB1c2VkIGFzIGEgbGlzdGVuZXIuXG4gKlxuICogQmVjYXVzZSBldmVudCBvcHRpb25zIGFyZSBwYXNzZWQgd2hlbiBhZGRpbmcgbGlzdGVuZXJzLCB3ZSBtdXN0IHRha2UgY2FzZVxuICogdG8gYWRkIGFuZCByZW1vdmUgdGhlIHBhcnQgYXMgYSBsaXN0ZW5lciB3aGVuIHRoZSBldmVudCBvcHRpb25zIGNoYW5nZS5cbiAqL1xuZXhwb3J0IHR5cGUge0V2ZW50UGFydH07XG5jbGFzcyBFdmVudFBhcnQgZXh0ZW5kcyBBdHRyaWJ1dGVQYXJ0IHtcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgdHlwZSA9IEVWRU5UX1BBUlQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgZWxlbWVudDogSFRNTEVsZW1lbnQsXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIHN0cmluZ3M6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPixcbiAgICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgc3VwZXIoZWxlbWVudCwgbmFtZSwgc3RyaW5ncywgcGFyZW50LCBvcHRpb25zKTtcblxuICAgIGlmIChERVZfTU9ERSAmJiB0aGlzLnN0cmluZ3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgQSBcXGA8JHtlbGVtZW50LmxvY2FsTmFtZX0+XFxgIGhhcyBhIFxcYEAke25hbWV9PS4uLlxcYCBsaXN0ZW5lciB3aXRoIGAgK1xuICAgICAgICAgICdpbnZhbGlkIGNvbnRlbnQuIEV2ZW50IGxpc3RlbmVycyBpbiB0ZW1wbGF0ZXMgbXVzdCBoYXZlIGV4YWN0bHkgJyArXG4gICAgICAgICAgJ29uZSBleHByZXNzaW9uIGFuZCBubyBzdXJyb3VuZGluZyB0ZXh0LidcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgLy8gRXZlbnRQYXJ0IGRvZXMgbm90IHVzZSB0aGUgYmFzZSBfJHNldFZhbHVlL19yZXNvbHZlVmFsdWUgaW1wbGVtZW50YXRpb25cbiAgLy8gc2luY2UgdGhlIGRpcnR5IGNoZWNraW5nIGlzIG1vcmUgY29tcGxleFxuICAvKiogQGludGVybmFsICovXG4gIG92ZXJyaWRlIF8kc2V0VmFsdWUoXG4gICAgbmV3TGlzdGVuZXI6IHVua25vd24sXG4gICAgZGlyZWN0aXZlUGFyZW50OiBEaXJlY3RpdmVQYXJlbnQgPSB0aGlzXG4gICkge1xuICAgIG5ld0xpc3RlbmVyID1cbiAgICAgIHJlc29sdmVEaXJlY3RpdmUodGhpcywgbmV3TGlzdGVuZXIsIGRpcmVjdGl2ZVBhcmVudCwgMCkgPz8gbm90aGluZztcbiAgICBpZiAobmV3TGlzdGVuZXIgPT09IG5vQ2hhbmdlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG9sZExpc3RlbmVyID0gdGhpcy5fJGNvbW1pdHRlZFZhbHVlO1xuXG4gICAgLy8gSWYgdGhlIG5ldyB2YWx1ZSBpcyBub3RoaW5nIG9yIGFueSBvcHRpb25zIGNoYW5nZSB3ZSBoYXZlIHRvIHJlbW92ZSB0aGVcbiAgICAvLyBwYXJ0IGFzIGEgbGlzdGVuZXIuXG4gICAgY29uc3Qgc2hvdWxkUmVtb3ZlTGlzdGVuZXIgPVxuICAgICAgKG5ld0xpc3RlbmVyID09PSBub3RoaW5nICYmIG9sZExpc3RlbmVyICE9PSBub3RoaW5nKSB8fFxuICAgICAgKG5ld0xpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykuY2FwdHVyZSAhPT1cbiAgICAgICAgKG9sZExpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykuY2FwdHVyZSB8fFxuICAgICAgKG5ld0xpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykub25jZSAhPT1cbiAgICAgICAgKG9sZExpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykub25jZSB8fFxuICAgICAgKG5ld0xpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykucGFzc2l2ZSAhPT1cbiAgICAgICAgKG9sZExpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykucGFzc2l2ZTtcblxuICAgIC8vIElmIHRoZSBuZXcgdmFsdWUgaXMgbm90IG5vdGhpbmcgYW5kIHdlIHJlbW92ZWQgdGhlIGxpc3RlbmVyLCB3ZSBoYXZlXG4gICAgLy8gdG8gYWRkIHRoZSBwYXJ0IGFzIGEgbGlzdGVuZXIuXG4gICAgY29uc3Qgc2hvdWxkQWRkTGlzdGVuZXIgPVxuICAgICAgbmV3TGlzdGVuZXIgIT09IG5vdGhpbmcgJiZcbiAgICAgIChvbGRMaXN0ZW5lciA9PT0gbm90aGluZyB8fCBzaG91bGRSZW1vdmVMaXN0ZW5lcik7XG5cbiAgICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgICBkZWJ1Z0xvZ0V2ZW50KHtcbiAgICAgICAga2luZDogJ2NvbW1pdCBldmVudCBsaXN0ZW5lcicsXG4gICAgICAgIGVsZW1lbnQ6IHRoaXMuZWxlbWVudCxcbiAgICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgICB2YWx1ZTogbmV3TGlzdGVuZXIsXG4gICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgcmVtb3ZlTGlzdGVuZXI6IHNob3VsZFJlbW92ZUxpc3RlbmVyLFxuICAgICAgICBhZGRMaXN0ZW5lcjogc2hvdWxkQWRkTGlzdGVuZXIsXG4gICAgICAgIG9sZExpc3RlbmVyLFxuICAgICAgfSk7XG4gICAgaWYgKHNob3VsZFJlbW92ZUxpc3RlbmVyKSB7XG4gICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcbiAgICAgICAgdGhpcy5uYW1lLFxuICAgICAgICB0aGlzLFxuICAgICAgICBvbGRMaXN0ZW5lciBhcyBFdmVudExpc3RlbmVyV2l0aE9wdGlvbnNcbiAgICAgICk7XG4gICAgfVxuICAgIGlmIChzaG91bGRBZGRMaXN0ZW5lcikge1xuICAgICAgLy8gQmV3YXJlOiBJRTExIGFuZCBDaHJvbWUgNDEgZG9uJ3QgbGlrZSB1c2luZyB0aGUgbGlzdGVuZXIgYXMgdGhlXG4gICAgICAvLyBvcHRpb25zIG9iamVjdC4gRmlndXJlIG91dCBob3cgdG8gZGVhbCB3LyB0aGlzIGluIElFMTEgLSBtYXliZVxuICAgICAgLy8gcGF0Y2ggYWRkRXZlbnRMaXN0ZW5lcj9cbiAgICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgICB0aGlzLm5hbWUsXG4gICAgICAgIHRoaXMsXG4gICAgICAgIG5ld0xpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9uc1xuICAgICAgKTtcbiAgICB9XG4gICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gbmV3TGlzdGVuZXI7XG4gIH1cblxuICBoYW5kbGVFdmVudChldmVudDogRXZlbnQpIHtcbiAgICBpZiAodHlwZW9mIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlLmNhbGwodGhpcy5vcHRpb25zPy5ob3N0ID8/IHRoaXMuZWxlbWVudCwgZXZlbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIEV2ZW50TGlzdGVuZXJPYmplY3QpLmhhbmRsZUV2ZW50KGV2ZW50KTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUge0VsZW1lbnRQYXJ0fTtcbmNsYXNzIEVsZW1lbnRQYXJ0IGltcGxlbWVudHMgRGlzY29ubmVjdGFibGUge1xuICByZWFkb25seSB0eXBlID0gRUxFTUVOVF9QQVJUO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX19kaXJlY3RpdmU/OiBEaXJlY3RpdmU7XG5cbiAgLy8gVGhpcyBpcyB0byBlbnN1cmUgdGhhdCBldmVyeSBQYXJ0IGhhcyBhIF8kY29tbWl0dGVkVmFsdWVcbiAgXyRjb21taXR0ZWRWYWx1ZTogdW5kZWZpbmVkO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRwYXJlbnQhOiBEaXNjb25uZWN0YWJsZTtcblxuICAvKiogQGludGVybmFsICovXG4gIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT4gPSB1bmRlZmluZWQ7XG5cbiAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgZWxlbWVudDogRWxlbWVudCxcbiAgICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgdGhpcy5fJHBhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICB9XG5cbiAgLy8gU2VlIGNvbW1lbnQgaW4gRGlzY29ubmVjdGFibGUgaW50ZXJmYWNlIGZvciB3aHkgdGhpcyBpcyBhIGdldHRlclxuICBnZXQgXyRpc0Nvbm5lY3RlZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fJHBhcmVudC5fJGlzQ29ubmVjdGVkO1xuICB9XG5cbiAgXyRzZXRWYWx1ZSh2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIGRlYnVnTG9nRXZlbnQgJiZcbiAgICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAgICBraW5kOiAnY29tbWl0IHRvIGVsZW1lbnQgYmluZGluZycsXG4gICAgICAgIGVsZW1lbnQ6IHRoaXMuZWxlbWVudCxcbiAgICAgICAgdmFsdWUsXG4gICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgIH0pO1xuICAgIHJlc29sdmVEaXJlY3RpdmUodGhpcywgdmFsdWUpO1xuICB9XG59XG5cbi8qKlxuICogRU5EIFVTRVJTIFNIT1VMRCBOT1QgUkVMWSBPTiBUSElTIE9CSkVDVC5cbiAqXG4gKiBQcml2YXRlIGV4cG9ydHMgZm9yIHVzZSBieSBvdGhlciBMaXQgcGFja2FnZXMsIG5vdCBpbnRlbmRlZCBmb3IgdXNlIGJ5XG4gKiBleHRlcm5hbCB1c2Vycy5cbiAqXG4gKiBXZSBjdXJyZW50bHkgZG8gbm90IG1ha2UgYSBtYW5nbGVkIHJvbGx1cCBidWlsZCBvZiB0aGUgbGl0LXNzciBjb2RlLiBJbiBvcmRlclxuICogdG8ga2VlcCBhIG51bWJlciBvZiAob3RoZXJ3aXNlIHByaXZhdGUpIHRvcC1sZXZlbCBleHBvcnRzICBtYW5nbGVkIGluIHRoZVxuICogY2xpZW50IHNpZGUgY29kZSwgd2UgZXhwb3J0IGEgXyRMSCBvYmplY3QgY29udGFpbmluZyB0aG9zZSBtZW1iZXJzIChvclxuICogaGVscGVyIG1ldGhvZHMgZm9yIGFjY2Vzc2luZyBwcml2YXRlIGZpZWxkcyBvZiB0aG9zZSBtZW1iZXJzKSwgYW5kIHRoZW5cbiAqIHJlLWV4cG9ydCB0aGVtIGZvciB1c2UgaW4gbGl0LXNzci4gVGhpcyBrZWVwcyBsaXQtc3NyIGFnbm9zdGljIHRvIHdoZXRoZXIgdGhlXG4gKiBjbGllbnQtc2lkZSBjb2RlIGlzIGJlaW5nIHVzZWQgaW4gYGRldmAgbW9kZSBvciBgcHJvZGAgbW9kZS5cbiAqXG4gKiBUaGlzIGhhcyBhIHVuaXF1ZSBuYW1lLCB0byBkaXNhbWJpZ3VhdGUgaXQgZnJvbSBwcml2YXRlIGV4cG9ydHMgaW5cbiAqIGxpdC1lbGVtZW50LCB3aGljaCByZS1leHBvcnRzIGFsbCBvZiBsaXQtaHRtbC5cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5leHBvcnQgY29uc3QgXyRMSCA9IHtcbiAgLy8gVXNlZCBpbiBsaXQtc3NyXG4gIF9ib3VuZEF0dHJpYnV0ZVN1ZmZpeDogYm91bmRBdHRyaWJ1dGVTdWZmaXgsXG4gIF9tYXJrZXI6IG1hcmtlcixcbiAgX21hcmtlck1hdGNoOiBtYXJrZXJNYXRjaCxcbiAgX0hUTUxfUkVTVUxUOiBIVE1MX1JFU1VMVCxcbiAgX2dldFRlbXBsYXRlSHRtbDogZ2V0VGVtcGxhdGVIdG1sLFxuICAvLyBVc2VkIGluIHRlc3RzIGFuZCBwcml2YXRlLXNzci1zdXBwb3J0XG4gIF9UZW1wbGF0ZUluc3RhbmNlOiBUZW1wbGF0ZUluc3RhbmNlLFxuICBfaXNJdGVyYWJsZTogaXNJdGVyYWJsZSxcbiAgX3Jlc29sdmVEaXJlY3RpdmU6IHJlc29sdmVEaXJlY3RpdmUsXG4gIF9DaGlsZFBhcnQ6IENoaWxkUGFydCxcbiAgX0F0dHJpYnV0ZVBhcnQ6IEF0dHJpYnV0ZVBhcnQsXG4gIF9Cb29sZWFuQXR0cmlidXRlUGFydDogQm9vbGVhbkF0dHJpYnV0ZVBhcnQsXG4gIF9FdmVudFBhcnQ6IEV2ZW50UGFydCxcbiAgX1Byb3BlcnR5UGFydDogUHJvcGVydHlQYXJ0LFxuICBfRWxlbWVudFBhcnQ6IEVsZW1lbnRQYXJ0LFxufTtcblxuLy8gQXBwbHkgcG9seWZpbGxzIGlmIGF2YWlsYWJsZVxuY29uc3QgcG9seWZpbGxTdXBwb3J0ID0gREVWX01PREVcbiAgPyBnbG9iYWwubGl0SHRtbFBvbHlmaWxsU3VwcG9ydERldk1vZGVcbiAgOiBnbG9iYWwubGl0SHRtbFBvbHlmaWxsU3VwcG9ydDtcbnBvbHlmaWxsU3VwcG9ydD8uKFRlbXBsYXRlLCBDaGlsZFBhcnQpO1xuXG4vLyBJTVBPUlRBTlQ6IGRvIG5vdCBjaGFuZ2UgdGhlIHByb3BlcnR5IG5hbWUgb3IgdGhlIGFzc2lnbm1lbnQgZXhwcmVzc2lvbi5cbi8vIFRoaXMgbGluZSB3aWxsIGJlIHVzZWQgaW4gcmVnZXhlcyB0byBzZWFyY2ggZm9yIGxpdC1odG1sIHVzYWdlLlxuKGdsb2JhbC5saXRIdG1sVmVyc2lvbnMgPz89IFtdKS5wdXNoKCczLjEuMicpO1xuaWYgKERFVl9NT0RFICYmIGdsb2JhbC5saXRIdG1sVmVyc2lvbnMubGVuZ3RoID4gMSkge1xuICBpc3N1ZVdhcm5pbmchKFxuICAgICdtdWx0aXBsZS12ZXJzaW9ucycsXG4gICAgYE11bHRpcGxlIHZlcnNpb25zIG9mIExpdCBsb2FkZWQuIGAgK1xuICAgICAgYExvYWRpbmcgbXVsdGlwbGUgdmVyc2lvbnMgaXMgbm90IHJlY29tbWVuZGVkLmBcbiAgKTtcbn1cblxuLyoqXG4gKiBSZW5kZXJzIGEgdmFsdWUsIHVzdWFsbHkgYSBsaXQtaHRtbCBUZW1wbGF0ZVJlc3VsdCwgdG8gdGhlIGNvbnRhaW5lci5cbiAqXG4gKiBUaGlzIGV4YW1wbGUgcmVuZGVycyB0aGUgdGV4dCBcIkhlbGxvLCBab2UhXCIgaW5zaWRlIGEgcGFyYWdyYXBoIHRhZywgYXBwZW5kaW5nXG4gKiBpdCB0byB0aGUgY29udGFpbmVyIGBkb2N1bWVudC5ib2R5YC5cbiAqXG4gKiBgYGBqc1xuICogaW1wb3J0IHtodG1sLCByZW5kZXJ9IGZyb20gJ2xpdCc7XG4gKlxuICogY29uc3QgbmFtZSA9IFwiWm9lXCI7XG4gKiByZW5kZXIoaHRtbGA8cD5IZWxsbywgJHtuYW1lfSE8L3A+YCwgZG9jdW1lbnQuYm9keSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gdmFsdWUgQW55IFtyZW5kZXJhYmxlXG4gKiAgIHZhbHVlXShodHRwczovL2xpdC5kZXYvZG9jcy90ZW1wbGF0ZXMvZXhwcmVzc2lvbnMvI2NoaWxkLWV4cHJlc3Npb25zKSxcbiAqICAgdHlwaWNhbGx5IGEge0BsaW5rY29kZSBUZW1wbGF0ZVJlc3VsdH0gY3JlYXRlZCBieSBldmFsdWF0aW5nIGEgdGVtcGxhdGUgdGFnXG4gKiAgIGxpa2Uge0BsaW5rY29kZSBodG1sfSBvciB7QGxpbmtjb2RlIHN2Z30uXG4gKiBAcGFyYW0gY29udGFpbmVyIEEgRE9NIGNvbnRhaW5lciB0byByZW5kZXIgdG8uIFRoZSBmaXJzdCByZW5kZXIgd2lsbCBhcHBlbmRcbiAqICAgdGhlIHJlbmRlcmVkIHZhbHVlIHRvIHRoZSBjb250YWluZXIsIGFuZCBzdWJzZXF1ZW50IHJlbmRlcnMgd2lsbFxuICogICBlZmZpY2llbnRseSB1cGRhdGUgdGhlIHJlbmRlcmVkIHZhbHVlIGlmIHRoZSBzYW1lIHJlc3VsdCB0eXBlIHdhc1xuICogICBwcmV2aW91c2x5IHJlbmRlcmVkIHRoZXJlLlxuICogQHBhcmFtIG9wdGlvbnMgU2VlIHtAbGlua2NvZGUgUmVuZGVyT3B0aW9uc30gZm9yIG9wdGlvbnMgZG9jdW1lbnRhdGlvbi5cbiAqIEBzZWVcbiAqIHtAbGluayBodHRwczovL2xpdC5kZXYvZG9jcy9saWJyYXJpZXMvc3RhbmRhbG9uZS10ZW1wbGF0ZXMvI3JlbmRlcmluZy1saXQtaHRtbC10ZW1wbGF0ZXN8IFJlbmRlcmluZyBMaXQgSFRNTCBUZW1wbGF0ZXN9XG4gKi9cbmV4cG9ydCBjb25zdCByZW5kZXIgPSAoXG4gIHZhbHVlOiB1bmtub3duLFxuICBjb250YWluZXI6IEhUTUxFbGVtZW50IHwgRG9jdW1lbnRGcmFnbWVudCxcbiAgb3B0aW9ucz86IFJlbmRlck9wdGlvbnNcbik6IFJvb3RQYXJ0ID0+IHtcbiAgaWYgKERFVl9NT0RFICYmIGNvbnRhaW5lciA9PSBudWxsKSB7XG4gICAgLy8gR2l2ZSBhIGNsZWFyZXIgZXJyb3IgbWVzc2FnZSB0aGFuXG4gICAgLy8gICAgIFVuY2F1Z2h0IFR5cGVFcnJvcjogQ2Fubm90IHJlYWQgcHJvcGVydGllcyBvZiBudWxsIChyZWFkaW5nXG4gICAgLy8gICAgICdfJGxpdFBhcnQkJylcbiAgICAvLyB3aGljaCByZWFkcyBsaWtlIGFuIGludGVybmFsIExpdCBlcnJvci5cbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBUaGUgY29udGFpbmVyIHRvIHJlbmRlciBpbnRvIG1heSBub3QgYmUgJHtjb250YWluZXJ9YCk7XG4gIH1cbiAgY29uc3QgcmVuZGVySWQgPSBERVZfTU9ERSA/IGRlYnVnTG9nUmVuZGVySWQrKyA6IDA7XG4gIGNvbnN0IHBhcnRPd25lck5vZGUgPSBvcHRpb25zPy5yZW5kZXJCZWZvcmUgPz8gY29udGFpbmVyO1xuICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICBsZXQgcGFydDogQ2hpbGRQYXJ0ID0gKHBhcnRPd25lck5vZGUgYXMgYW55KVsnXyRsaXRQYXJ0JCddO1xuICBkZWJ1Z0xvZ0V2ZW50ICYmXG4gICAgZGVidWdMb2dFdmVudCh7XG4gICAgICBraW5kOiAnYmVnaW4gcmVuZGVyJyxcbiAgICAgIGlkOiByZW5kZXJJZCxcbiAgICAgIHZhbHVlLFxuICAgICAgY29udGFpbmVyLFxuICAgICAgb3B0aW9ucyxcbiAgICAgIHBhcnQsXG4gICAgfSk7XG4gIGlmIChwYXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICBjb25zdCBlbmROb2RlID0gb3B0aW9ucz8ucmVuZGVyQmVmb3JlID8/IG51bGw7XG4gICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIChwYXJ0T3duZXJOb2RlIGFzIGFueSlbJ18kbGl0UGFydCQnXSA9IHBhcnQgPSBuZXcgQ2hpbGRQYXJ0KFxuICAgICAgY29udGFpbmVyLmluc2VydEJlZm9yZShjcmVhdGVNYXJrZXIoKSwgZW5kTm9kZSksXG4gICAgICBlbmROb2RlLFxuICAgICAgdW5kZWZpbmVkLFxuICAgICAgb3B0aW9ucyA/PyB7fVxuICAgICk7XG4gIH1cbiAgcGFydC5fJHNldFZhbHVlKHZhbHVlKTtcbiAgZGVidWdMb2dFdmVudCAmJlxuICAgIGRlYnVnTG9nRXZlbnQoe1xuICAgICAga2luZDogJ2VuZCByZW5kZXInLFxuICAgICAgaWQ6IHJlbmRlcklkLFxuICAgICAgdmFsdWUsXG4gICAgICBjb250YWluZXIsXG4gICAgICBvcHRpb25zLFxuICAgICAgcGFydCxcbiAgICB9KTtcbiAgcmV0dXJuIHBhcnQgYXMgUm9vdFBhcnQ7XG59O1xuXG5pZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gIHJlbmRlci5zZXRTYW5pdGl6ZXIgPSBzZXRTYW5pdGl6ZXI7XG4gIHJlbmRlci5jcmVhdGVTYW5pdGl6ZXIgPSBjcmVhdGVTYW5pdGl6ZXI7XG4gIGlmIChERVZfTU9ERSkge1xuICAgIHJlbmRlci5fdGVzdE9ubHlDbGVhclNhbml0aXplckZhY3RvcnlEb05vdENhbGxPckVsc2UgPVxuICAgICAgX3Rlc3RPbmx5Q2xlYXJTYW5pdGl6ZXJGYWN0b3J5RG9Ob3RDYWxsT3JFbHNlO1xuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtcbiAgRGlyZWN0aXZlLFxuICBQYXJ0SW5mbyxcbiAgRGlyZWN0aXZlQ2xhc3MsXG4gIERpcmVjdGl2ZVJlc3VsdCxcbn0gZnJvbSAnLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtcbiAgXyRMSCBhcyBwLFxuICBBdHRyaWJ1dGVQYXJ0LFxuICBub0NoYW5nZSxcbiAgUGFydCxcbiAgRGlzY29ubmVjdGFibGUsXG59IGZyb20gJy4vbGl0LWh0bWwuanMnO1xuXG5pbXBvcnQgdHlwZSB7XG4gIFByb3BlcnR5UGFydCxcbiAgQ2hpbGRQYXJ0LFxuICBCb29sZWFuQXR0cmlidXRlUGFydCxcbiAgRXZlbnRQYXJ0LFxuICBFbGVtZW50UGFydCxcbiAgVGVtcGxhdGVJbnN0YW5jZSxcbn0gZnJvbSAnLi9saXQtaHRtbC5qcyc7XG5cbi8vIENvbnRhaW5zIGVpdGhlciB0aGUgbWluaWZpZWQgb3IgdW5taW5pZmllZCBgXyRyZXNvbHZlYCBEaXJlY3RpdmUgbWV0aG9kIG5hbWUuXG5sZXQgcmVzb2x2ZU1ldGhvZE5hbWU6IEV4dHJhY3Q8a2V5b2YgRGlyZWN0aXZlLCAnXyRyZXNvbHZlJz4gfCBudWxsID0gbnVsbDtcblxuLyoqXG4gKiBFTkQgVVNFUlMgU0hPVUxEIE5PVCBSRUxZIE9OIFRISVMgT0JKRUNULlxuICpcbiAqIFdlIGN1cnJlbnRseSBkbyBub3QgbWFrZSBhIG1hbmdsZWQgcm9sbHVwIGJ1aWxkIG9mIHRoZSBsaXQtc3NyIGNvZGUuIEluIG9yZGVyXG4gKiB0byBrZWVwIGEgbnVtYmVyIG9mIChvdGhlcndpc2UgcHJpdmF0ZSkgdG9wLWxldmVsIGV4cG9ydHMgbWFuZ2xlZCBpbiB0aGVcbiAqIGNsaWVudCBzaWRlIGNvZGUsIHdlIGV4cG9ydCBhIF8kTEggb2JqZWN0IGNvbnRhaW5pbmcgdGhvc2UgbWVtYmVycyAob3JcbiAqIGhlbHBlciBtZXRob2RzIGZvciBhY2Nlc3NpbmcgcHJpdmF0ZSBmaWVsZHMgb2YgdGhvc2UgbWVtYmVycyksIGFuZCB0aGVuXG4gKiByZS1leHBvcnQgdGhlbSBmb3IgdXNlIGluIGxpdC1zc3IuIFRoaXMga2VlcHMgbGl0LXNzciBhZ25vc3RpYyB0byB3aGV0aGVyIHRoZVxuICogY2xpZW50LXNpZGUgY29kZSBpcyBiZWluZyB1c2VkIGluIGBkZXZgIG1vZGUgb3IgYHByb2RgIG1vZGUuXG4gKiBAcHJpdmF0ZVxuICovXG5leHBvcnQgY29uc3QgXyRMSCA9IHtcbiAgYm91bmRBdHRyaWJ1dGVTdWZmaXg6IHAuX2JvdW5kQXR0cmlidXRlU3VmZml4LFxuICBtYXJrZXI6IHAuX21hcmtlcixcbiAgbWFya2VyTWF0Y2g6IHAuX21hcmtlck1hdGNoLFxuICBIVE1MX1JFU1VMVDogcC5fSFRNTF9SRVNVTFQsXG4gIGdldFRlbXBsYXRlSHRtbDogcC5fZ2V0VGVtcGxhdGVIdG1sLFxuICBvdmVycmlkZURpcmVjdGl2ZVJlc29sdmU6IChcbiAgICBkaXJlY3RpdmVDbGFzczogbmV3IChwYXJ0OiBQYXJ0SW5mbykgPT4gRGlyZWN0aXZlICYge3JlbmRlcigpOiB1bmtub3dufSxcbiAgICByZXNvbHZlT3ZlcnJpZGVGbjogKGRpcmVjdGl2ZTogRGlyZWN0aXZlLCB2YWx1ZXM6IHVua25vd25bXSkgPT4gdW5rbm93blxuICApID0+XG4gICAgY2xhc3MgZXh0ZW5kcyBkaXJlY3RpdmVDbGFzcyB7XG4gICAgICBvdmVycmlkZSBfJHJlc29sdmUoXG4gICAgICAgIHRoaXM6IERpcmVjdGl2ZSxcbiAgICAgICAgX3BhcnQ6IFBhcnQsXG4gICAgICAgIHZhbHVlczogdW5rbm93bltdXG4gICAgICApOiB1bmtub3duIHtcbiAgICAgICAgcmV0dXJuIHJlc29sdmVPdmVycmlkZUZuKHRoaXMsIHZhbHVlcyk7XG4gICAgICB9XG4gICAgfSxcbiAgcGF0Y2hEaXJlY3RpdmVSZXNvbHZlOiAoXG4gICAgZGlyZWN0aXZlQ2xhc3M6IHR5cGVvZiBEaXJlY3RpdmUsXG4gICAgcmVzb2x2ZU92ZXJyaWRlRm46IChcbiAgICAgIHRoaXM6IERpcmVjdGl2ZSxcbiAgICAgIF9wYXJ0OiBQYXJ0LFxuICAgICAgdmFsdWVzOiB1bmtub3duW11cbiAgICApID0+IHVua25vd25cbiAgKSA9PiB7XG4gICAgaWYgKGRpcmVjdGl2ZUNsYXNzLnByb3RvdHlwZS5fJHJlc29sdmUgIT09IHJlc29sdmVPdmVycmlkZUZuKSB7XG4gICAgICByZXNvbHZlTWV0aG9kTmFtZSA/Pz0gZGlyZWN0aXZlQ2xhc3MucHJvdG90eXBlLl8kcmVzb2x2ZVxuICAgICAgICAubmFtZSBhcyBOb25OdWxsYWJsZTx0eXBlb2YgcmVzb2x2ZU1ldGhvZE5hbWU+O1xuICAgICAgZm9yIChcbiAgICAgICAgbGV0IHByb3RvID0gZGlyZWN0aXZlQ2xhc3MucHJvdG90eXBlO1xuICAgICAgICBwcm90byAhPT0gT2JqZWN0LnByb3RvdHlwZTtcbiAgICAgICAgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocHJvdG8pXG4gICAgICApIHtcbiAgICAgICAgaWYgKHByb3RvLmhhc093blByb3BlcnR5KHJlc29sdmVNZXRob2ROYW1lKSkge1xuICAgICAgICAgIHByb3RvW3Jlc29sdmVNZXRob2ROYW1lXSA9IHJlc29sdmVPdmVycmlkZUZuO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gTm90aGluZyB3YXMgcGF0Y2hlZCB3aGljaCBpbmRpY2F0ZXMgYW4gZXJyb3IuIFRoZSBtb3N0IGxpa2VseSBlcnJvciBpc1xuICAgICAgLy8gdGhhdCBzb21laG93IGJvdGggbWluaWZpZWQgYW5kIHVubWluaWZpZWQgbGl0IGNvZGUgcGFzc2VkIHRocm91Z2ggdGhpc1xuICAgICAgLy8gY29kZXBhdGguIFRoaXMgaXMgcG9zc2libGUgYXMgbGl0LWxhYnMvc3NyIGNvbnRhaW5zIGl0cyBvd24gbGl0LWh0bWxcbiAgICAgIC8vIG1vZHVsZSBhcyBhIGRlcGVuZGVuY3kgZm9yIHNlcnZlciByZW5kZXJpbmcgY2xpZW50IExpdCBjb2RlLiBJZiBhXG4gICAgICAvLyBjbGllbnQgY29udGFpbnMgbXVsdGlwbGUgZHVwbGljYXRlIExpdCBtb2R1bGVzIHdpdGggbWluaWZpZWQgYW5kXG4gICAgICAvLyB1bm1pbmlmaWVkIGV4cG9ydHMsIHdlIGN1cnJlbnRseSBjYW5ub3QgaGFuZGxlIGJvdGguXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBJbnRlcm5hbCBlcnJvcjogSXQgaXMgcG9zc2libGUgdGhhdCBib3RoIGRldiBtb2RlIGFuZCBwcm9kdWN0aW9uIG1vZGVgICtcbiAgICAgICAgICBgIExpdCB3YXMgbWl4ZWQgdG9nZXRoZXIgZHVyaW5nIFNTUi4gUGxlYXNlIGNvbW1lbnQgb24gdGhlIGlzc3VlOiBgICtcbiAgICAgICAgICBgaHR0cHM6Ly9naXRodWIuY29tL2xpdC9saXQvaXNzdWVzLzQ1MjdgXG4gICAgICApO1xuICAgIH1cbiAgfSxcbiAgc2V0RGlyZWN0aXZlQ2xhc3ModmFsdWU6IERpcmVjdGl2ZVJlc3VsdCwgZGlyZWN0aXZlQ2xhc3M6IERpcmVjdGl2ZUNsYXNzKSB7XG4gICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICB2YWx1ZVsnXyRsaXREaXJlY3RpdmUkJ10gPSBkaXJlY3RpdmVDbGFzcztcbiAgfSxcbiAgZ2V0QXR0cmlidXRlUGFydENvbW1pdHRlZFZhbHVlOiAoXG4gICAgcGFydDogQXR0cmlidXRlUGFydCxcbiAgICB2YWx1ZTogdW5rbm93bixcbiAgICBpbmRleDogbnVtYmVyIHwgdW5kZWZpbmVkXG4gICkgPT4ge1xuICAgIC8vIFVzZSB0aGUgcGFydCBzZXR0ZXIgdG8gcmVzb2x2ZSBkaXJlY3RpdmVzL2NvbmNhdGVuYXRlIG11bHRpcGxlIHBhcnRzXG4gICAgLy8gaW50byBhIGZpbmFsIHZhbHVlIChjYXB0dXJlZCBieSBwYXNzaW5nIGluIGEgY29tbWl0VmFsdWUgb3ZlcnJpZGUpXG4gICAgbGV0IGNvbW1pdHRlZFZhbHVlOiB1bmtub3duID0gbm9DaGFuZ2U7XG4gICAgLy8gTm90ZSB0aGF0IF9jb21taXRWYWx1ZSBuZWVkIG5vdCBiZSBpbiBgc3RhYmxlUHJvcGVydGllc2AgYmVjYXVzZSB0aGlzXG4gICAgLy8gbWV0aG9kIGlzIG9ubHkgcnVuIG9uIGBBdHRyaWJ1dGVQYXJ0YHMgY3JlYXRlZCBieSBsaXQtc3NyIHVzaW5nIHRoZSBzYW1lXG4gICAgLy8gdmVyc2lvbiBvZiB0aGUgbGlicmFyeSBhcyB0aGlzIGZpbGVcbiAgICBwYXJ0Ll9jb21taXRWYWx1ZSA9ICh2YWx1ZTogdW5rbm93bikgPT4gKGNvbW1pdHRlZFZhbHVlID0gdmFsdWUpO1xuICAgIHBhcnQuXyRzZXRWYWx1ZSh2YWx1ZSwgcGFydCwgaW5kZXgpO1xuICAgIHJldHVybiBjb21taXR0ZWRWYWx1ZTtcbiAgfSxcbiAgY29ubmVjdGVkRGlzY29ubmVjdGFibGU6IChwcm9wcz86IG9iamVjdCk6IERpc2Nvbm5lY3RhYmxlID0+ICh7XG4gICAgLi4ucHJvcHMsXG4gICAgXyRpc0Nvbm5lY3RlZDogdHJ1ZSxcbiAgfSksXG4gIHJlc29sdmVEaXJlY3RpdmU6IHAuX3Jlc29sdmVEaXJlY3RpdmUsXG4gIEF0dHJpYnV0ZVBhcnQ6IHAuX0F0dHJpYnV0ZVBhcnQsXG4gIFByb3BlcnR5UGFydDogcC5fUHJvcGVydHlQYXJ0IGFzIHR5cGVvZiBQcm9wZXJ0eVBhcnQsXG4gIEJvb2xlYW5BdHRyaWJ1dGVQYXJ0OiBwLl9Cb29sZWFuQXR0cmlidXRlUGFydCBhcyB0eXBlb2YgQm9vbGVhbkF0dHJpYnV0ZVBhcnQsXG4gIEV2ZW50UGFydDogcC5fRXZlbnRQYXJ0IGFzIHR5cGVvZiBFdmVudFBhcnQsXG4gIEVsZW1lbnRQYXJ0OiBwLl9FbGVtZW50UGFydCBhcyB0eXBlb2YgRWxlbWVudFBhcnQsXG4gIFRlbXBsYXRlSW5zdGFuY2U6IHAuX1RlbXBsYXRlSW5zdGFuY2UgYXMgdHlwZW9mIFRlbXBsYXRlSW5zdGFuY2UsXG4gIGlzSXRlcmFibGU6IHAuX2lzSXRlcmFibGUsXG4gIENoaWxkUGFydDogcC5fQ2hpbGRQYXJ0IGFzIHR5cGVvZiBDaGlsZFBhcnQsXG59O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7RGlzY29ubmVjdGFibGUsIFBhcnR9IGZyb20gJy4vbGl0LWh0bWwuanMnO1xuXG5leHBvcnQge1xuICBBdHRyaWJ1dGVQYXJ0LFxuICBCb29sZWFuQXR0cmlidXRlUGFydCxcbiAgQ2hpbGRQYXJ0LFxuICBFbGVtZW50UGFydCxcbiAgRXZlbnRQYXJ0LFxuICBQYXJ0LFxuICBQcm9wZXJ0eVBhcnQsXG59IGZyb20gJy4vbGl0LWh0bWwuanMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIERpcmVjdGl2ZUNsYXNzIHtcbiAgbmV3IChwYXJ0OiBQYXJ0SW5mbyk6IERpcmVjdGl2ZTtcbn1cblxuLyoqXG4gKiBUaGlzIHV0aWxpdHkgdHlwZSBleHRyYWN0cyB0aGUgc2lnbmF0dXJlIG9mIGEgZGlyZWN0aXZlIGNsYXNzJ3MgcmVuZGVyKClcbiAqIG1ldGhvZCBzbyB3ZSBjYW4gdXNlIGl0IGZvciB0aGUgdHlwZSBvZiB0aGUgZ2VuZXJhdGVkIGRpcmVjdGl2ZSBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IHR5cGUgRGlyZWN0aXZlUGFyYW1ldGVyczxDIGV4dGVuZHMgRGlyZWN0aXZlPiA9IFBhcmFtZXRlcnM8Q1sncmVuZGVyJ10+O1xuXG4vKipcbiAqIEEgZ2VuZXJhdGVkIGRpcmVjdGl2ZSBmdW5jdGlvbiBkb2Vzbid0IGV2YWx1YXRlIHRoZSBkaXJlY3RpdmUsIGJ1dCBqdXN0XG4gKiByZXR1cm5zIGEgRGlyZWN0aXZlUmVzdWx0IG9iamVjdCB0aGF0IGNhcHR1cmVzIHRoZSBhcmd1bWVudHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRGlyZWN0aXZlUmVzdWx0PEMgZXh0ZW5kcyBEaXJlY3RpdmVDbGFzcyA9IERpcmVjdGl2ZUNsYXNzPiB7XG4gIC8qKlxuICAgKiBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgKiBAaW50ZXJuYWwgKi9cbiAgWydfJGxpdERpcmVjdGl2ZSQnXTogQztcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICB2YWx1ZXM6IERpcmVjdGl2ZVBhcmFtZXRlcnM8SW5zdGFuY2VUeXBlPEM+Pjtcbn1cblxuZXhwb3J0IGNvbnN0IFBhcnRUeXBlID0ge1xuICBBVFRSSUJVVEU6IDEsXG4gIENISUxEOiAyLFxuICBQUk9QRVJUWTogMyxcbiAgQk9PTEVBTl9BVFRSSUJVVEU6IDQsXG4gIEVWRU5UOiA1LFxuICBFTEVNRU5UOiA2LFxufSBhcyBjb25zdDtcblxuZXhwb3J0IHR5cGUgUGFydFR5cGUgPSAodHlwZW9mIFBhcnRUeXBlKVtrZXlvZiB0eXBlb2YgUGFydFR5cGVdO1xuXG5leHBvcnQgaW50ZXJmYWNlIENoaWxkUGFydEluZm8ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgUGFydFR5cGUuQ0hJTEQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXR0cmlidXRlUGFydEluZm8ge1xuICByZWFkb25seSB0eXBlOlxuICAgIHwgdHlwZW9mIFBhcnRUeXBlLkFUVFJJQlVURVxuICAgIHwgdHlwZW9mIFBhcnRUeXBlLlBST1BFUlRZXG4gICAgfCB0eXBlb2YgUGFydFR5cGUuQk9PTEVBTl9BVFRSSUJVVEVcbiAgICB8IHR5cGVvZiBQYXJ0VHlwZS5FVkVOVDtcbiAgcmVhZG9ubHkgc3RyaW5ncz86IFJlYWRvbmx5QXJyYXk8c3RyaW5nPjtcbiAgcmVhZG9ubHkgbmFtZTogc3RyaW5nO1xuICByZWFkb25seSB0YWdOYW1lOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRWxlbWVudFBhcnRJbmZvIHtcbiAgcmVhZG9ubHkgdHlwZTogdHlwZW9mIFBhcnRUeXBlLkVMRU1FTlQ7XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHBhcnQgYSBkaXJlY3RpdmUgaXMgYm91bmQgdG8uXG4gKlxuICogVGhpcyBpcyB1c2VmdWwgZm9yIGNoZWNraW5nIHRoYXQgYSBkaXJlY3RpdmUgaXMgYXR0YWNoZWQgdG8gYSB2YWxpZCBwYXJ0LFxuICogc3VjaCBhcyB3aXRoIGRpcmVjdGl2ZSB0aGF0IGNhbiBvbmx5IGJlIHVzZWQgb24gYXR0cmlidXRlIGJpbmRpbmdzLlxuICovXG5leHBvcnQgdHlwZSBQYXJ0SW5mbyA9IENoaWxkUGFydEluZm8gfCBBdHRyaWJ1dGVQYXJ0SW5mbyB8IEVsZW1lbnRQYXJ0SW5mbztcblxuLyoqXG4gKiBDcmVhdGVzIGEgdXNlci1mYWNpbmcgZGlyZWN0aXZlIGZ1bmN0aW9uIGZyb20gYSBEaXJlY3RpdmUgY2xhc3MuIFRoaXNcbiAqIGZ1bmN0aW9uIGhhcyB0aGUgc2FtZSBwYXJhbWV0ZXJzIGFzIHRoZSBkaXJlY3RpdmUncyByZW5kZXIoKSBtZXRob2QuXG4gKi9cbmV4cG9ydCBjb25zdCBkaXJlY3RpdmUgPVxuICA8QyBleHRlbmRzIERpcmVjdGl2ZUNsYXNzPihjOiBDKSA9PlxuICAoLi4udmFsdWVzOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPEluc3RhbmNlVHlwZTxDPj4pOiBEaXJlY3RpdmVSZXN1bHQ8Qz4gPT4gKHtcbiAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIFsnXyRsaXREaXJlY3RpdmUkJ106IGMsXG4gICAgdmFsdWVzLFxuICB9KTtcblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBjcmVhdGluZyBjdXN0b20gZGlyZWN0aXZlcy4gVXNlcnMgc2hvdWxkIGV4dGVuZCB0aGlzIGNsYXNzLFxuICogaW1wbGVtZW50IGByZW5kZXJgIGFuZC9vciBgdXBkYXRlYCwgYW5kIHRoZW4gcGFzcyB0aGVpciBzdWJjbGFzcyB0b1xuICogYGRpcmVjdGl2ZWAuXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBEaXJlY3RpdmUgaW1wbGVtZW50cyBEaXNjb25uZWN0YWJsZSB7XG4gIC8vQGludGVybmFsXG4gIF9fcGFydCE6IFBhcnQ7XG4gIC8vQGludGVybmFsXG4gIF9fYXR0cmlidXRlSW5kZXg6IG51bWJlciB8IHVuZGVmaW5lZDtcbiAgLy9AaW50ZXJuYWxcbiAgX19kaXJlY3RpdmU/OiBEaXJlY3RpdmU7XG5cbiAgLy9AaW50ZXJuYWxcbiAgXyRwYXJlbnQhOiBEaXNjb25uZWN0YWJsZTtcblxuICAvLyBUaGVzZSB3aWxsIG9ubHkgZXhpc3Qgb24gdGhlIEFzeW5jRGlyZWN0aXZlIHN1YmNsYXNzXG4gIC8vQGludGVybmFsXG4gIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT47XG4gIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gIC8vQGludGVybmFsXG4gIFsnXyRub3RpZnlEaXJlY3RpdmVDb25uZWN0aW9uQ2hhbmdlZCddPyhpc0Nvbm5lY3RlZDogYm9vbGVhbik6IHZvaWQ7XG5cbiAgY29uc3RydWN0b3IoX3BhcnRJbmZvOiBQYXJ0SW5mbykge31cblxuICAvLyBTZWUgY29tbWVudCBpbiBEaXNjb25uZWN0YWJsZSBpbnRlcmZhY2UgZm9yIHdoeSB0aGlzIGlzIGEgZ2V0dGVyXG4gIGdldCBfJGlzQ29ubmVjdGVkKCkge1xuICAgIHJldHVybiB0aGlzLl8kcGFyZW50Ll8kaXNDb25uZWN0ZWQ7XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIF8kaW5pdGlhbGl6ZShcbiAgICBwYXJ0OiBQYXJ0LFxuICAgIHBhcmVudDogRGlzY29ubmVjdGFibGUsXG4gICAgYXR0cmlidXRlSW5kZXg6IG51bWJlciB8IHVuZGVmaW5lZFxuICApIHtcbiAgICB0aGlzLl9fcGFydCA9IHBhcnQ7XG4gICAgdGhpcy5fJHBhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLl9fYXR0cmlidXRlSW5kZXggPSBhdHRyaWJ1dGVJbmRleDtcbiAgfVxuICAvKiogQGludGVybmFsICovXG4gIF8kcmVzb2x2ZShwYXJ0OiBQYXJ0LCBwcm9wczogQXJyYXk8dW5rbm93bj4pOiB1bmtub3duIHtcbiAgICByZXR1cm4gdGhpcy51cGRhdGUocGFydCwgcHJvcHMpO1xuICB9XG5cbiAgYWJzdHJhY3QgcmVuZGVyKC4uLnByb3BzOiBBcnJheTx1bmtub3duPik6IHVua25vd247XG5cbiAgdXBkYXRlKF9wYXJ0OiBQYXJ0LCBwcm9wczogQXJyYXk8dW5rbm93bj4pOiB1bmtub3duIHtcbiAgICByZXR1cm4gdGhpcy5yZW5kZXIoLi4ucHJvcHMpO1xuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtcbiAgXyRMSCxcbiAgUGFydCxcbiAgRGlyZWN0aXZlUGFyZW50LFxuICBDb21waWxlZFRlbXBsYXRlUmVzdWx0LFxuICBNYXliZUNvbXBpbGVkVGVtcGxhdGVSZXN1bHQsXG4gIFVuY29tcGlsZWRUZW1wbGF0ZVJlc3VsdCxcbn0gZnJvbSAnLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBEaXJlY3RpdmVSZXN1bHQsXG4gIERpcmVjdGl2ZUNsYXNzLFxuICBQYXJ0SW5mbyxcbiAgQXR0cmlidXRlUGFydEluZm8sXG59IGZyb20gJy4vZGlyZWN0aXZlLmpzJztcbnR5cGUgUHJpbWl0aXZlID0gbnVsbCB8IHVuZGVmaW5lZCB8IGJvb2xlYW4gfCBudW1iZXIgfCBzdHJpbmcgfCBzeW1ib2wgfCBiaWdpbnQ7XG5cbmNvbnN0IHtfQ2hpbGRQYXJ0OiBDaGlsZFBhcnR9ID0gXyRMSDtcblxudHlwZSBDaGlsZFBhcnQgPSBJbnN0YW5jZVR5cGU8dHlwZW9mIENoaWxkUGFydD47XG5cbmNvbnN0IEVOQUJMRV9TSEFEWURPTV9OT1BBVENIID0gdHJ1ZTtcblxuY29uc3Qgd3JhcCA9XG4gIEVOQUJMRV9TSEFEWURPTV9OT1BBVENIICYmXG4gIHdpbmRvdy5TaGFkeURPTT8uaW5Vc2UgJiZcbiAgd2luZG93LlNoYWR5RE9NPy5ub1BhdGNoID09PSB0cnVlXG4gICAgPyB3aW5kb3cuU2hhZHlET00hLndyYXBcbiAgICA6IChub2RlOiBOb2RlKSA9PiBub2RlO1xuXG4vKipcbiAqIFRlc3RzIGlmIGEgdmFsdWUgaXMgYSBwcmltaXRpdmUgdmFsdWUuXG4gKlxuICogU2VlIGh0dHBzOi8vdGMzOS5naXRodWIuaW8vZWNtYTI2Mi8jc2VjLXR5cGVvZi1vcGVyYXRvclxuICovXG5leHBvcnQgY29uc3QgaXNQcmltaXRpdmUgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBQcmltaXRpdmUgPT5cbiAgdmFsdWUgPT09IG51bGwgfHwgKHR5cGVvZiB2YWx1ZSAhPSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsdWUgIT0gJ2Z1bmN0aW9uJyk7XG5cbmV4cG9ydCBjb25zdCBUZW1wbGF0ZVJlc3VsdFR5cGUgPSB7XG4gIEhUTUw6IDEsXG4gIFNWRzogMixcbn0gYXMgY29uc3Q7XG5cbmV4cG9ydCB0eXBlIFRlbXBsYXRlUmVzdWx0VHlwZSA9XG4gICh0eXBlb2YgVGVtcGxhdGVSZXN1bHRUeXBlKVtrZXlvZiB0eXBlb2YgVGVtcGxhdGVSZXN1bHRUeXBlXTtcblxudHlwZSBJc1RlbXBsYXRlUmVzdWx0ID0ge1xuICAodmFsOiB1bmtub3duKTogdmFsIGlzIE1heWJlQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdDtcbiAgPFQgZXh0ZW5kcyBUZW1wbGF0ZVJlc3VsdFR5cGU+KFxuICAgIHZhbDogdW5rbm93bixcbiAgICB0eXBlOiBUXG4gICk6IHZhbCBpcyBVbmNvbXBpbGVkVGVtcGxhdGVSZXN1bHQ8VD47XG59O1xuXG4vKipcbiAqIFRlc3RzIGlmIGEgdmFsdWUgaXMgYSBUZW1wbGF0ZVJlc3VsdCBvciBhIENvbXBpbGVkVGVtcGxhdGVSZXN1bHQuXG4gKi9cbmV4cG9ydCBjb25zdCBpc1RlbXBsYXRlUmVzdWx0OiBJc1RlbXBsYXRlUmVzdWx0ID0gKFxuICB2YWx1ZTogdW5rbm93bixcbiAgdHlwZT86IFRlbXBsYXRlUmVzdWx0VHlwZVxuKTogdmFsdWUgaXMgVW5jb21waWxlZFRlbXBsYXRlUmVzdWx0ID0+XG4gIHR5cGUgPT09IHVuZGVmaW5lZFxuICAgID8gLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICAgICh2YWx1ZSBhcyBVbmNvbXBpbGVkVGVtcGxhdGVSZXN1bHQpPy5bJ18kbGl0VHlwZSQnXSAhPT0gdW5kZWZpbmVkXG4gICAgOiAodmFsdWUgYXMgVW5jb21waWxlZFRlbXBsYXRlUmVzdWx0KT8uWydfJGxpdFR5cGUkJ10gPT09IHR5cGU7XG5cbi8qKlxuICogVGVzdHMgaWYgYSB2YWx1ZSBpcyBhIENvbXBpbGVkVGVtcGxhdGVSZXN1bHQuXG4gKi9cbmV4cG9ydCBjb25zdCBpc0NvbXBpbGVkVGVtcGxhdGVSZXN1bHQgPSAoXG4gIHZhbHVlOiB1bmtub3duXG4pOiB2YWx1ZSBpcyBDb21waWxlZFRlbXBsYXRlUmVzdWx0ID0+IHtcbiAgcmV0dXJuICh2YWx1ZSBhcyBDb21waWxlZFRlbXBsYXRlUmVzdWx0KT8uWydfJGxpdFR5cGUkJ10/LmggIT0gbnVsbDtcbn07XG5cbi8qKlxuICogVGVzdHMgaWYgYSB2YWx1ZSBpcyBhIERpcmVjdGl2ZVJlc3VsdC5cbiAqL1xuZXhwb3J0IGNvbnN0IGlzRGlyZWN0aXZlUmVzdWx0ID0gKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgRGlyZWN0aXZlUmVzdWx0ID0+XG4gIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICh2YWx1ZSBhcyBEaXJlY3RpdmVSZXN1bHQpPy5bJ18kbGl0RGlyZWN0aXZlJCddICE9PSB1bmRlZmluZWQ7XG5cbi8qKlxuICogUmV0cmlldmVzIHRoZSBEaXJlY3RpdmUgY2xhc3MgZm9yIGEgRGlyZWN0aXZlUmVzdWx0XG4gKi9cbmV4cG9ydCBjb25zdCBnZXREaXJlY3RpdmVDbGFzcyA9ICh2YWx1ZTogdW5rbm93bik6IERpcmVjdGl2ZUNsYXNzIHwgdW5kZWZpbmVkID0+XG4gIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICh2YWx1ZSBhcyBEaXJlY3RpdmVSZXN1bHQpPy5bJ18kbGl0RGlyZWN0aXZlJCddO1xuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgYSBwYXJ0IGhhcyBvbmx5IGEgc2luZ2xlLWV4cHJlc3Npb24gd2l0aCBubyBzdHJpbmdzIHRvXG4gKiBpbnRlcnBvbGF0ZSBiZXR3ZWVuLlxuICpcbiAqIE9ubHkgQXR0cmlidXRlUGFydCBhbmQgUHJvcGVydHlQYXJ0IGNhbiBoYXZlIG11bHRpcGxlIGV4cHJlc3Npb25zLlxuICogTXVsdGktZXhwcmVzc2lvbiBwYXJ0cyBoYXZlIGEgYHN0cmluZ3NgIHByb3BlcnR5IGFuZCBzaW5nbGUtZXhwcmVzc2lvblxuICogcGFydHMgZG8gbm90LlxuICovXG5leHBvcnQgY29uc3QgaXNTaW5nbGVFeHByZXNzaW9uID0gKHBhcnQ6IFBhcnRJbmZvKSA9PlxuICAocGFydCBhcyBBdHRyaWJ1dGVQYXJ0SW5mbykuc3RyaW5ncyA9PT0gdW5kZWZpbmVkO1xuXG5jb25zdCBjcmVhdGVNYXJrZXIgPSAoKSA9PiBkb2N1bWVudC5jcmVhdGVDb21tZW50KCcnKTtcblxuLyoqXG4gKiBJbnNlcnRzIGEgQ2hpbGRQYXJ0IGludG8gdGhlIGdpdmVuIGNvbnRhaW5lciBDaGlsZFBhcnQncyBET00sIGVpdGhlciBhdCB0aGVcbiAqIGVuZCBvZiB0aGUgY29udGFpbmVyIENoaWxkUGFydCwgb3IgYmVmb3JlIHRoZSBvcHRpb25hbCBgcmVmUGFydGAuXG4gKlxuICogVGhpcyBkb2VzIG5vdCBhZGQgdGhlIHBhcnQgdG8gdGhlIGNvbnRhaW5lclBhcnQncyBjb21taXR0ZWQgdmFsdWUuIFRoYXQgbXVzdFxuICogYmUgZG9uZSBieSBjYWxsZXJzLlxuICpcbiAqIEBwYXJhbSBjb250YWluZXJQYXJ0IFBhcnQgd2l0aGluIHdoaWNoIHRvIGFkZCB0aGUgbmV3IENoaWxkUGFydFxuICogQHBhcmFtIHJlZlBhcnQgUGFydCBiZWZvcmUgd2hpY2ggdG8gYWRkIHRoZSBuZXcgQ2hpbGRQYXJ0OyB3aGVuIG9taXR0ZWQgdGhlXG4gKiAgICAgcGFydCBhZGRlZCB0byB0aGUgZW5kIG9mIHRoZSBgY29udGFpbmVyUGFydGBcbiAqIEBwYXJhbSBwYXJ0IFBhcnQgdG8gaW5zZXJ0LCBvciB1bmRlZmluZWQgdG8gY3JlYXRlIGEgbmV3IHBhcnRcbiAqL1xuZXhwb3J0IGNvbnN0IGluc2VydFBhcnQgPSAoXG4gIGNvbnRhaW5lclBhcnQ6IENoaWxkUGFydCxcbiAgcmVmUGFydD86IENoaWxkUGFydCxcbiAgcGFydD86IENoaWxkUGFydFxuKTogQ2hpbGRQYXJ0ID0+IHtcbiAgY29uc3QgY29udGFpbmVyID0gd3JhcChjb250YWluZXJQYXJ0Ll8kc3RhcnROb2RlKS5wYXJlbnROb2RlITtcblxuICBjb25zdCByZWZOb2RlID1cbiAgICByZWZQYXJ0ID09PSB1bmRlZmluZWQgPyBjb250YWluZXJQYXJ0Ll8kZW5kTm9kZSA6IHJlZlBhcnQuXyRzdGFydE5vZGU7XG5cbiAgaWYgKHBhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IHN0YXJ0Tm9kZSA9IHdyYXAoY29udGFpbmVyKS5pbnNlcnRCZWZvcmUoY3JlYXRlTWFya2VyKCksIHJlZk5vZGUpO1xuICAgIGNvbnN0IGVuZE5vZGUgPSB3cmFwKGNvbnRhaW5lcikuaW5zZXJ0QmVmb3JlKGNyZWF0ZU1hcmtlcigpLCByZWZOb2RlKTtcbiAgICBwYXJ0ID0gbmV3IENoaWxkUGFydChcbiAgICAgIHN0YXJ0Tm9kZSxcbiAgICAgIGVuZE5vZGUsXG4gICAgICBjb250YWluZXJQYXJ0LFxuICAgICAgY29udGFpbmVyUGFydC5vcHRpb25zXG4gICAgKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBlbmROb2RlID0gd3JhcChwYXJ0Ll8kZW5kTm9kZSEpLm5leHRTaWJsaW5nO1xuICAgIGNvbnN0IG9sZFBhcmVudCA9IHBhcnQuXyRwYXJlbnQ7XG4gICAgY29uc3QgcGFyZW50Q2hhbmdlZCA9IG9sZFBhcmVudCAhPT0gY29udGFpbmVyUGFydDtcbiAgICBpZiAocGFyZW50Q2hhbmdlZCkge1xuICAgICAgcGFydC5fJHJlcGFyZW50RGlzY29ubmVjdGFibGVzPy4oY29udGFpbmVyUGFydCk7XG4gICAgICAvLyBOb3RlIHRoYXQgYWx0aG91Z2ggYF8kcmVwYXJlbnREaXNjb25uZWN0YWJsZXNgIHVwZGF0ZXMgdGhlIHBhcnQnc1xuICAgICAgLy8gYF8kcGFyZW50YCByZWZlcmVuY2UgYWZ0ZXIgdW5saW5raW5nIGZyb20gaXRzIGN1cnJlbnQgcGFyZW50LCB0aGF0XG4gICAgICAvLyBtZXRob2Qgb25seSBleGlzdHMgaWYgRGlzY29ubmVjdGFibGVzIGFyZSBwcmVzZW50LCBzbyB3ZSBuZWVkIHRvXG4gICAgICAvLyB1bmNvbmRpdGlvbmFsbHkgc2V0IGl0IGhlcmVcbiAgICAgIHBhcnQuXyRwYXJlbnQgPSBjb250YWluZXJQYXJ0O1xuICAgICAgLy8gU2luY2UgdGhlIF8kaXNDb25uZWN0ZWQgZ2V0dGVyIGlzIHNvbWV3aGF0IGNvc3RseSwgb25seVxuICAgICAgLy8gcmVhZCBpdCBvbmNlIHdlIGtub3cgdGhlIHN1YnRyZWUgaGFzIGRpcmVjdGl2ZXMgdGhhdCBuZWVkXG4gICAgICAvLyB0byBiZSBub3RpZmllZFxuICAgICAgbGV0IG5ld0Nvbm5lY3Rpb25TdGF0ZTtcbiAgICAgIGlmIChcbiAgICAgICAgcGFydC5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgKG5ld0Nvbm5lY3Rpb25TdGF0ZSA9IGNvbnRhaW5lclBhcnQuXyRpc0Nvbm5lY3RlZCkgIT09XG4gICAgICAgICAgb2xkUGFyZW50IS5fJGlzQ29ubmVjdGVkXG4gICAgICApIHtcbiAgICAgICAgcGFydC5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkKG5ld0Nvbm5lY3Rpb25TdGF0ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChlbmROb2RlICE9PSByZWZOb2RlIHx8IHBhcmVudENoYW5nZWQpIHtcbiAgICAgIGxldCBzdGFydDogTm9kZSB8IG51bGwgPSBwYXJ0Ll8kc3RhcnROb2RlO1xuICAgICAgd2hpbGUgKHN0YXJ0ICE9PSBlbmROb2RlKSB7XG4gICAgICAgIGNvbnN0IG46IE5vZGUgfCBudWxsID0gd3JhcChzdGFydCEpLm5leHRTaWJsaW5nO1xuICAgICAgICB3cmFwKGNvbnRhaW5lcikuaW5zZXJ0QmVmb3JlKHN0YXJ0ISwgcmVmTm9kZSk7XG4gICAgICAgIHN0YXJ0ID0gbjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGFydDtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgdmFsdWUgb2YgYSBQYXJ0LlxuICpcbiAqIE5vdGUgdGhhdCB0aGlzIHNob3VsZCBvbmx5IGJlIHVzZWQgdG8gc2V0L3VwZGF0ZSB0aGUgdmFsdWUgb2YgdXNlci1jcmVhdGVkXG4gKiBwYXJ0cyAoaS5lLiB0aG9zZSBjcmVhdGVkIHVzaW5nIGBpbnNlcnRQYXJ0YCk7IGl0IHNob3VsZCBub3QgYmUgdXNlZFxuICogYnkgZGlyZWN0aXZlcyB0byBzZXQgdGhlIHZhbHVlIG9mIHRoZSBkaXJlY3RpdmUncyBjb250YWluZXIgcGFydC4gRGlyZWN0aXZlc1xuICogc2hvdWxkIHJldHVybiBhIHZhbHVlIGZyb20gYHVwZGF0ZWAvYHJlbmRlcmAgdG8gdXBkYXRlIHRoZWlyIHBhcnQgc3RhdGUuXG4gKlxuICogRm9yIGRpcmVjdGl2ZXMgdGhhdCByZXF1aXJlIHNldHRpbmcgdGhlaXIgcGFydCB2YWx1ZSBhc3luY2hyb25vdXNseSwgdGhleVxuICogc2hvdWxkIGV4dGVuZCBgQXN5bmNEaXJlY3RpdmVgIGFuZCBjYWxsIGB0aGlzLnNldFZhbHVlKClgLlxuICpcbiAqIEBwYXJhbSBwYXJ0IFBhcnQgdG8gc2V0XG4gKiBAcGFyYW0gdmFsdWUgVmFsdWUgdG8gc2V0XG4gKiBAcGFyYW0gaW5kZXggRm9yIGBBdHRyaWJ1dGVQYXJ0YHMsIHRoZSBpbmRleCB0byBzZXRcbiAqIEBwYXJhbSBkaXJlY3RpdmVQYXJlbnQgVXNlZCBpbnRlcm5hbGx5OyBzaG91bGQgbm90IGJlIHNldCBieSB1c2VyXG4gKi9cbmV4cG9ydCBjb25zdCBzZXRDaGlsZFBhcnRWYWx1ZSA9IDxUIGV4dGVuZHMgQ2hpbGRQYXJ0PihcbiAgcGFydDogVCxcbiAgdmFsdWU6IHVua25vd24sXG4gIGRpcmVjdGl2ZVBhcmVudDogRGlyZWN0aXZlUGFyZW50ID0gcGFydFxuKTogVCA9PiB7XG4gIHBhcnQuXyRzZXRWYWx1ZSh2YWx1ZSwgZGlyZWN0aXZlUGFyZW50KTtcbiAgcmV0dXJuIHBhcnQ7XG59O1xuXG4vLyBBIHNlbnRpbmVsIHZhbHVlIHRoYXQgY2FuIG5ldmVyIGFwcGVhciBhcyBhIHBhcnQgdmFsdWUgZXhjZXB0IHdoZW4gc2V0IGJ5XG4vLyBsaXZlKCkuIFVzZWQgdG8gZm9yY2UgYSBkaXJ0eS1jaGVjayB0byBmYWlsIGFuZCBjYXVzZSBhIHJlLXJlbmRlci5cbmNvbnN0IFJFU0VUX1ZBTFVFID0ge307XG5cbi8qKlxuICogU2V0cyB0aGUgY29tbWl0dGVkIHZhbHVlIG9mIGEgQ2hpbGRQYXJ0IGRpcmVjdGx5IHdpdGhvdXQgdHJpZ2dlcmluZyB0aGVcbiAqIGNvbW1pdCBzdGFnZSBvZiB0aGUgcGFydC5cbiAqXG4gKiBUaGlzIGlzIHVzZWZ1bCBpbiBjYXNlcyB3aGVyZSBhIGRpcmVjdGl2ZSBuZWVkcyB0byB1cGRhdGUgdGhlIHBhcnQgc3VjaFxuICogdGhhdCB0aGUgbmV4dCB1cGRhdGUgZGV0ZWN0cyBhIHZhbHVlIGNoYW5nZSBvciBub3QuIFdoZW4gdmFsdWUgaXMgb21pdHRlZCxcbiAqIHRoZSBuZXh0IHVwZGF0ZSB3aWxsIGJlIGd1YXJhbnRlZWQgdG8gYmUgZGV0ZWN0ZWQgYXMgYSBjaGFuZ2UuXG4gKlxuICogQHBhcmFtIHBhcnRcbiAqIEBwYXJhbSB2YWx1ZVxuICovXG5leHBvcnQgY29uc3Qgc2V0Q29tbWl0dGVkVmFsdWUgPSAocGFydDogUGFydCwgdmFsdWU6IHVua25vd24gPSBSRVNFVF9WQUxVRSkgPT5cbiAgKHBhcnQuXyRjb21taXR0ZWRWYWx1ZSA9IHZhbHVlKTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBjb21taXR0ZWQgdmFsdWUgb2YgYSBDaGlsZFBhcnQuXG4gKlxuICogVGhlIGNvbW1pdHRlZCB2YWx1ZSBpcyB1c2VkIGZvciBjaGFuZ2UgZGV0ZWN0aW9uIGFuZCBlZmZpY2llbnQgdXBkYXRlcyBvZlxuICogdGhlIHBhcnQuIEl0IGNhbiBkaWZmZXIgZnJvbSB0aGUgdmFsdWUgc2V0IGJ5IHRoZSB0ZW1wbGF0ZSBvciBkaXJlY3RpdmUgaW5cbiAqIGNhc2VzIHdoZXJlIHRoZSB0ZW1wbGF0ZSB2YWx1ZSBpcyB0cmFuc2Zvcm1lZCBiZWZvcmUgYmVpbmcgY29tbWl0dGVkLlxuICpcbiAqIC0gYFRlbXBsYXRlUmVzdWx0YHMgYXJlIGNvbW1pdHRlZCBhcyBhIGBUZW1wbGF0ZUluc3RhbmNlYFxuICogLSBJdGVyYWJsZXMgYXJlIGNvbW1pdHRlZCBhcyBgQXJyYXk8Q2hpbGRQYXJ0PmBcbiAqIC0gQWxsIG90aGVyIHR5cGVzIGFyZSBjb21taXR0ZWQgYXMgdGhlIHRlbXBsYXRlIHZhbHVlIG9yIHZhbHVlIHJldHVybmVkIG9yXG4gKiAgIHNldCBieSBhIGRpcmVjdGl2ZS5cbiAqXG4gKiBAcGFyYW0gcGFydFxuICovXG5leHBvcnQgY29uc3QgZ2V0Q29tbWl0dGVkVmFsdWUgPSAocGFydDogQ2hpbGRQYXJ0KSA9PiBwYXJ0Ll8kY29tbWl0dGVkVmFsdWU7XG5cbi8qKlxuICogUmVtb3ZlcyBhIENoaWxkUGFydCBmcm9tIHRoZSBET00sIGluY2x1ZGluZyBhbnkgb2YgaXRzIGNvbnRlbnQuXG4gKlxuICogQHBhcmFtIHBhcnQgVGhlIFBhcnQgdG8gcmVtb3ZlXG4gKi9cbmV4cG9ydCBjb25zdCByZW1vdmVQYXJ0ID0gKHBhcnQ6IENoaWxkUGFydCkgPT4ge1xuICBwYXJ0Ll8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQ/LihmYWxzZSwgdHJ1ZSk7XG4gIGxldCBzdGFydDogQ2hpbGROb2RlIHwgbnVsbCA9IHBhcnQuXyRzdGFydE5vZGU7XG4gIGNvbnN0IGVuZDogQ2hpbGROb2RlIHwgbnVsbCA9IHdyYXAocGFydC5fJGVuZE5vZGUhKS5uZXh0U2libGluZztcbiAgd2hpbGUgKHN0YXJ0ICE9PSBlbmQpIHtcbiAgICBjb25zdCBuOiBDaGlsZE5vZGUgfCBudWxsID0gd3JhcChzdGFydCEpLm5leHRTaWJsaW5nO1xuICAgICh3cmFwKHN0YXJ0ISkgYXMgQ2hpbGROb2RlKS5yZW1vdmUoKTtcbiAgICBzdGFydCA9IG47XG4gIH1cbn07XG5cbmV4cG9ydCBjb25zdCBjbGVhclBhcnQgPSAocGFydDogQ2hpbGRQYXJ0KSA9PiB7XG4gIHBhcnQuXyRjbGVhcigpO1xufTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG4vKipcbiAqIE92ZXJ2aWV3OlxuICpcbiAqIFRoaXMgbW9kdWxlIGlzIGRlc2lnbmVkIHRvIGFkZCBzdXBwb3J0IGZvciBhbiBhc3luYyBgc2V0VmFsdWVgIEFQSSBhbmRcbiAqIGBkaXNjb25uZWN0ZWRgIGNhbGxiYWNrIHRvIGRpcmVjdGl2ZXMgd2l0aCB0aGUgbGVhc3QgaW1wYWN0IG9uIHRoZSBjb3JlXG4gKiBydW50aW1lIG9yIHBheWxvYWQgd2hlbiB0aGF0IGZlYXR1cmUgaXMgbm90IHVzZWQuXG4gKlxuICogVGhlIHN0cmF0ZWd5IGlzIHRvIGludHJvZHVjZSBhIGBBc3luY0RpcmVjdGl2ZWAgc3ViY2xhc3Mgb2ZcbiAqIGBEaXJlY3RpdmVgIHRoYXQgY2xpbWJzIHRoZSBcInBhcmVudFwiIHRyZWUgaW4gaXRzIGNvbnN0cnVjdG9yIHRvIG5vdGUgd2hpY2hcbiAqIGJyYW5jaGVzIG9mIGxpdC1odG1sJ3MgXCJsb2dpY2FsIHRyZWVcIiBvZiBkYXRhIHN0cnVjdHVyZXMgY29udGFpbiBzdWNoXG4gKiBkaXJlY3RpdmVzIGFuZCB0aHVzIG5lZWQgdG8gYmUgY3Jhd2xlZCB3aGVuIGEgc3VidHJlZSBpcyBiZWluZyBjbGVhcmVkIChvclxuICogbWFudWFsbHkgZGlzY29ubmVjdGVkKSBpbiBvcmRlciB0byBydW4gdGhlIGBkaXNjb25uZWN0ZWRgIGNhbGxiYWNrLlxuICpcbiAqIFRoZSBcIm5vZGVzXCIgb2YgdGhlIGxvZ2ljYWwgdHJlZSBpbmNsdWRlIFBhcnRzLCBUZW1wbGF0ZUluc3RhbmNlcyAoZm9yIHdoZW4gYVxuICogVGVtcGxhdGVSZXN1bHQgaXMgY29tbWl0dGVkIHRvIGEgdmFsdWUgb2YgYSBDaGlsZFBhcnQpLCBhbmQgRGlyZWN0aXZlczsgdGhlc2VcbiAqIGFsbCBpbXBsZW1lbnQgYSBjb21tb24gaW50ZXJmYWNlIGNhbGxlZCBgRGlzY29ubmVjdGFibGVDaGlsZGAuIEVhY2ggaGFzIGFcbiAqIGBfJHBhcmVudGAgcmVmZXJlbmNlIHdoaWNoIGlzIHNldCBkdXJpbmcgY29uc3RydWN0aW9uIGluIHRoZSBjb3JlIGNvZGUsIGFuZCBhXG4gKiBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCBmaWVsZCB3aGljaCBpcyBpbml0aWFsbHkgdW5kZWZpbmVkLlxuICpcbiAqIFRoZSBzcGFyc2UgdHJlZSBjcmVhdGVkIGJ5IG1lYW5zIG9mIHRoZSBgQXN5bmNEaXJlY3RpdmVgIGNvbnN0cnVjdG9yXG4gKiBjcmF3bGluZyB1cCB0aGUgYF8kcGFyZW50YCB0cmVlIGFuZCBwbGFjaW5nIGEgYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAgU2V0XG4gKiBvbiBlYWNoIHBhcmVudCB0aGF0IGluY2x1ZGVzIGVhY2ggY2hpbGQgdGhhdCBjb250YWlucyBhXG4gKiBgQXN5bmNEaXJlY3RpdmVgIGRpcmVjdGx5IG9yIHRyYW5zaXRpdmVseSB2aWEgaXRzIGNoaWxkcmVuLiBJbiBvcmRlciB0b1xuICogbm90aWZ5IGNvbm5lY3Rpb24gc3RhdGUgY2hhbmdlcyBhbmQgZGlzY29ubmVjdCAob3IgcmVjb25uZWN0KSBhIHRyZWUsIHRoZVxuICogYF8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWRgIEFQSSBpcyBwYXRjaGVkIG9udG8gQ2hpbGRQYXJ0cyBhcyBhIGRpcmVjdGl2ZVxuICogY2xpbWJzIHRoZSBwYXJlbnQgdHJlZSwgd2hpY2ggaXMgY2FsbGVkIGJ5IHRoZSBjb3JlIHdoZW4gY2xlYXJpbmcgYSBwYXJ0IGlmXG4gKiBpdCBleGlzdHMuIFdoZW4gY2FsbGVkLCB0aGF0IG1ldGhvZCBpdGVyYXRlcyBvdmVyIHRoZSBzcGFyc2UgdHJlZSBvZlxuICogU2V0PERpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4+IGJ1aWx0IHVwIGJ5IEFzeW5jRGlyZWN0aXZlcywgYW5kIGNhbGxzXG4gKiBgXyRub3RpZnlEaXJlY3RpdmVDb25uZWN0aW9uQ2hhbmdlZGAgb24gYW55IGRpcmVjdGl2ZXMgdGhhdCBhcmUgZW5jb3VudGVyZWRcbiAqIGluIHRoYXQgdHJlZSwgcnVubmluZyB0aGUgcmVxdWlyZWQgY2FsbGJhY2tzLlxuICpcbiAqIEEgZ2l2ZW4gXCJsb2dpY2FsIHRyZWVcIiBvZiBsaXQtaHRtbCBkYXRhLXN0cnVjdHVyZXMgbWlnaHQgbG9vayBsaWtlIHRoaXM6XG4gKlxuICogIENoaWxkUGFydChOMSkgXyRkQz1bRDIsVDNdXG4gKiAgIC5fZGlyZWN0aXZlXG4gKiAgICAgQXN5bmNEaXJlY3RpdmUoRDIpXG4gKiAgIC5fdmFsdWUgLy8gdXNlciB2YWx1ZSB3YXMgVGVtcGxhdGVSZXN1bHRcbiAqICAgICBUZW1wbGF0ZUluc3RhbmNlKFQzKSBfJGRDPVtBNCxBNixOMTAsTjEyXVxuICogICAgICAuXyRwYXJ0c1tdXG4gKiAgICAgICAgQXR0cmlidXRlUGFydChBNCkgXyRkQz1bRDVdXG4gKiAgICAgICAgIC5fZGlyZWN0aXZlc1tdXG4gKiAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDUpXG4gKiAgICAgICAgQXR0cmlidXRlUGFydChBNikgXyRkQz1bRDcsRDhdXG4gKiAgICAgICAgIC5fZGlyZWN0aXZlc1tdXG4gKiAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDcpXG4gKiAgICAgICAgICAgRGlyZWN0aXZlKEQ4KSBfJGRDPVtEOV1cbiAqICAgICAgICAgICAgLl9kaXJlY3RpdmVcbiAqICAgICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEOSlcbiAqICAgICAgICBDaGlsZFBhcnQoTjEwKSBfJGRDPVtEMTFdXG4gKiAgICAgICAgIC5fZGlyZWN0aXZlXG4gKiAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDExKVxuICogICAgICAgICAuX3ZhbHVlXG4gKiAgICAgICAgICAgc3RyaW5nXG4gKiAgICAgICAgQ2hpbGRQYXJ0KE4xMikgXyRkQz1bRDEzLE4xNCxOMTZdXG4gKiAgICAgICAgIC5fZGlyZWN0aXZlXG4gKiAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDEzKVxuICogICAgICAgICAuX3ZhbHVlIC8vIHVzZXIgdmFsdWUgd2FzIGl0ZXJhYmxlXG4gKiAgICAgICAgICAgQXJyYXk8Q2hpbGRQYXJ0PlxuICogICAgICAgICAgICAgQ2hpbGRQYXJ0KE4xNCkgXyRkQz1bRDE1XVxuICogICAgICAgICAgICAgIC5fdmFsdWVcbiAqICAgICAgICAgICAgICAgIHN0cmluZ1xuICogICAgICAgICAgICAgQ2hpbGRQYXJ0KE4xNikgXyRkQz1bRDE3LFQxOF1cbiAqICAgICAgICAgICAgICAuX2RpcmVjdGl2ZVxuICogICAgICAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDE3KVxuICogICAgICAgICAgICAgIC5fdmFsdWUgLy8gdXNlciB2YWx1ZSB3YXMgVGVtcGxhdGVSZXN1bHRcbiAqICAgICAgICAgICAgICAgIFRlbXBsYXRlSW5zdGFuY2UoVDE4KSBfJGRDPVtBMTksQTIxLE4yNV1cbiAqICAgICAgICAgICAgICAgICAuXyRwYXJ0c1tdXG4gKiAgICAgICAgICAgICAgICAgICBBdHRyaWJ1dGVQYXJ0KEExOSkgXyRkQz1bRDIwXVxuICogICAgICAgICAgICAgICAgICAgIC5fZGlyZWN0aXZlc1tdXG4gKiAgICAgICAgICAgICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEMjApXG4gKiAgICAgICAgICAgICAgICAgICBBdHRyaWJ1dGVQYXJ0KEEyMSkgXyRkQz1bMjIsMjNdXG4gKiAgICAgICAgICAgICAgICAgICAgLl9kaXJlY3RpdmVzW11cbiAqICAgICAgICAgICAgICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQyMilcbiAqICAgICAgICAgICAgICAgICAgICAgIERpcmVjdGl2ZShEMjMpIF8kZEM9W0QyNF1cbiAqICAgICAgICAgICAgICAgICAgICAgICAuX2RpcmVjdGl2ZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDI0KVxuICogICAgICAgICAgICAgICAgICAgQ2hpbGRQYXJ0KE4yNSkgXyRkQz1bRDI2XVxuICogICAgICAgICAgICAgICAgICAgIC5fZGlyZWN0aXZlXG4gKiAgICAgICAgICAgICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEMjYpXG4gKiAgICAgICAgICAgICAgICAgICAgLl92YWx1ZVxuICogICAgICAgICAgICAgICAgICAgICAgc3RyaW5nXG4gKlxuICogRXhhbXBsZSAxOiBUaGUgZGlyZWN0aXZlIGluIENoaWxkUGFydChOMTIpIHVwZGF0ZXMgYW5kIHJldHVybnMgYG5vdGhpbmdgLiBUaGVcbiAqIENoaWxkUGFydCB3aWxsIF9jbGVhcigpIGl0c2VsZiwgYW5kIHNvIHdlIG5lZWQgdG8gZGlzY29ubmVjdCB0aGUgXCJ2YWx1ZVwiIG9mXG4gKiB0aGUgQ2hpbGRQYXJ0IChidXQgbm90IGl0cyBkaXJlY3RpdmUpLiBJbiB0aGlzIGNhc2UsIHdoZW4gYF9jbGVhcigpYCBjYWxsc1xuICogYF8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQoKWAsIHdlIGRvbid0IGl0ZXJhdGUgYWxsIG9mIHRoZVxuICogXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuLCByYXRoZXIgd2UgZG8gYSB2YWx1ZS1zcGVjaWZpYyBkaXNjb25uZWN0aW9uOiBpLmUuXG4gKiBzaW5jZSB0aGUgX3ZhbHVlIHdhcyBhbiBBcnJheTxDaGlsZFBhcnQ+IChiZWNhdXNlIGFuIGl0ZXJhYmxlIGhhZCBiZWVuXG4gKiBjb21taXR0ZWQpLCB3ZSBpdGVyYXRlIHRoZSBhcnJheSBvZiBDaGlsZFBhcnRzIChOMTQsIE4xNikgYW5kIHJ1blxuICogYHNldENvbm5lY3RlZGAgb24gdGhlbSAod2hpY2ggZG9lcyByZWN1cnNlIGRvd24gdGhlIGZ1bGwgdHJlZSBvZlxuICogYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAgYmVsb3cgaXQsIGFuZCBhbHNvIHJlbW92ZXMgTjE0IGFuZCBOMTYgZnJvbSBOMTInc1xuICogYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmApLiBPbmNlIHRoZSB2YWx1ZXMgaGF2ZSBiZWVuIGRpc2Nvbm5lY3RlZCwgd2UgdGhlblxuICogY2hlY2sgd2hldGhlciB0aGUgQ2hpbGRQYXJ0KE4xMikncyBsaXN0IG9mIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gIGlzIGVtcHR5XG4gKiAoYW5kIHdvdWxkIHJlbW92ZSBpdCBmcm9tIGl0cyBwYXJlbnQgVGVtcGxhdGVJbnN0YW5jZShUMykgaWYgc28pLCBidXQgc2luY2VcbiAqIGl0IHdvdWxkIHN0aWxsIGNvbnRhaW4gaXRzIGRpcmVjdGl2ZSBEMTMsIGl0IHN0YXlzIGluIHRoZSBkaXNjb25uZWN0YWJsZVxuICogdHJlZS5cbiAqXG4gKiBFeGFtcGxlIDI6IEluIHRoZSBjb3Vyc2Ugb2YgRXhhbXBsZSAxLCBgc2V0Q29ubmVjdGVkYCB3aWxsIHJlYWNoXG4gKiBDaGlsZFBhcnQoTjE2KTsgaW4gdGhpcyBjYXNlIHRoZSBlbnRpcmUgcGFydCBpcyBiZWluZyBkaXNjb25uZWN0ZWQsIHNvIHdlXG4gKiBzaW1wbHkgaXRlcmF0ZSBhbGwgb2YgTjE2J3MgYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAgKEQxNyxUMTgpIGFuZFxuICogcmVjdXJzaXZlbHkgcnVuIGBzZXRDb25uZWN0ZWRgIG9uIHRoZW0uIE5vdGUgdGhhdCB3ZSBvbmx5IHJlbW92ZSBjaGlsZHJlblxuICogZnJvbSBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCBmb3IgdGhlIHRvcC1sZXZlbCB2YWx1ZXMgYmVpbmcgZGlzY29ubmVjdGVkXG4gKiBvbiBhIGNsZWFyOyBkb2luZyB0aGlzIGJvb2trZWVwaW5nIGxvd2VyIGluIHRoZSB0cmVlIGlzIHdhc3RlZnVsIHNpbmNlIGl0J3NcbiAqIGFsbCBiZWluZyB0aHJvd24gYXdheS5cbiAqXG4gKiBFeGFtcGxlIDM6IElmIHRoZSBMaXRFbGVtZW50IGNvbnRhaW5pbmcgdGhlIGVudGlyZSB0cmVlIGFib3ZlIGJlY29tZXNcbiAqIGRpc2Nvbm5lY3RlZCwgaXQgd2lsbCBydW4gYGNoaWxkUGFydC5zZXRDb25uZWN0ZWQoKWAgKHdoaWNoIGNhbGxzXG4gKiBgY2hpbGRQYXJ0Ll8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQoKWAgaWYgaXQgZXhpc3RzKTsgaW4gdGhpcyBjYXNlLCB3ZVxuICogcmVjdXJzaXZlbHkgcnVuIGBzZXRDb25uZWN0ZWQoKWAgb3ZlciB0aGUgZW50aXJlIHRyZWUsIHdpdGhvdXQgcmVtb3ZpbmcgYW55XG4gKiBjaGlsZHJlbiBmcm9tIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gLCBzaW5jZSB0aGlzIHRyZWUgaXMgcmVxdWlyZWQgdG9cbiAqIHJlLWNvbm5lY3QgdGhlIHRyZWUsIHdoaWNoIGRvZXMgdGhlIHNhbWUgb3BlcmF0aW9uLCBzaW1wbHkgcGFzc2luZ1xuICogYGlzQ29ubmVjdGVkOiB0cnVlYCBkb3duIHRoZSB0cmVlLCBzaWduYWxpbmcgd2hpY2ggY2FsbGJhY2sgdG8gcnVuLlxuICovXG5cbmltcG9ydCB7QXR0cmlidXRlUGFydCwgQ2hpbGRQYXJ0LCBEaXNjb25uZWN0YWJsZSwgUGFydH0gZnJvbSAnLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2lzU2luZ2xlRXhwcmVzc2lvbn0gZnJvbSAnLi9kaXJlY3RpdmUtaGVscGVycy5qcyc7XG5pbXBvcnQge0RpcmVjdGl2ZSwgUGFydEluZm8sIFBhcnRUeXBlfSBmcm9tICcuL2RpcmVjdGl2ZS5qcyc7XG5leHBvcnQgKiBmcm9tICcuL2RpcmVjdGl2ZS5qcyc7XG5cbmNvbnN0IERFVl9NT0RFID0gdHJ1ZTtcblxuLyoqXG4gKiBSZWN1cnNpdmVseSB3YWxrcyBkb3duIHRoZSB0cmVlIG9mIFBhcnRzL1RlbXBsYXRlSW5zdGFuY2VzL0RpcmVjdGl2ZXMgdG8gc2V0XG4gKiB0aGUgY29ubmVjdGVkIHN0YXRlIG9mIGRpcmVjdGl2ZXMgYW5kIHJ1biBgZGlzY29ubmVjdGVkYC8gYHJlY29ubmVjdGVkYFxuICogY2FsbGJhY2tzLlxuICpcbiAqIEByZXR1cm4gVHJ1ZSBpZiB0aGVyZSB3ZXJlIGNoaWxkcmVuIHRvIGRpc2Nvbm5lY3Q7IGZhbHNlIG90aGVyd2lzZVxuICovXG5jb25zdCBub3RpZnlDaGlsZHJlbkNvbm5lY3RlZENoYW5nZWQgPSAoXG4gIHBhcmVudDogRGlzY29ubmVjdGFibGUsXG4gIGlzQ29ubmVjdGVkOiBib29sZWFuXG4pOiBib29sZWFuID0+IHtcbiAgY29uc3QgY2hpbGRyZW4gPSBwYXJlbnQuXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuO1xuICBpZiAoY2hpbGRyZW4gPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBmb3IgKGNvbnN0IG9iaiBvZiBjaGlsZHJlbikge1xuICAgIC8vIFRoZSBleGlzdGVuY2Ugb2YgYF8kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWRgIGlzIHVzZWQgYXMgYSBcImJyYW5kXCIgdG9cbiAgICAvLyBkaXNhbWJpZ3VhdGUgQXN5bmNEaXJlY3RpdmVzIGZyb20gb3RoZXIgRGlzY29ubmVjdGFibGVDaGlsZHJlblxuICAgIC8vIChhcyBvcHBvc2VkIHRvIHVzaW5nIGFuIGluc3RhbmNlb2YgY2hlY2sgdG8ga25vdyB3aGVuIHRvIGNhbGwgaXQpOyB0aGVcbiAgICAvLyByZWR1bmRhbmN5IG9mIFwiRGlyZWN0aXZlXCIgaW4gdGhlIEFQSSBuYW1lIGlzIHRvIGF2b2lkIGNvbmZsaWN0aW5nIHdpdGhcbiAgICAvLyBgXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZGAsIHdoaWNoIGV4aXN0cyBgQ2hpbGRQYXJ0c2Agd2hpY2ggYXJlIGFsc28gaW5cbiAgICAvLyB0aGlzIGxpc3RcbiAgICAvLyBEaXNjb25uZWN0IERpcmVjdGl2ZSAoYW5kIGFueSBuZXN0ZWQgZGlyZWN0aXZlcyBjb250YWluZWQgd2l0aGluKVxuICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgKG9iaiBhcyBBc3luY0RpcmVjdGl2ZSlbJ18kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWQnXT8uKFxuICAgICAgaXNDb25uZWN0ZWQsXG4gICAgICBmYWxzZVxuICAgICk7XG4gICAgLy8gRGlzY29ubmVjdCBQYXJ0L1RlbXBsYXRlSW5zdGFuY2VcbiAgICBub3RpZnlDaGlsZHJlbkNvbm5lY3RlZENoYW5nZWQob2JqLCBpc0Nvbm5lY3RlZCk7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgdGhlIGdpdmVuIGNoaWxkIGZyb20gaXRzIHBhcmVudCBsaXN0IG9mIGRpc2Nvbm5lY3RhYmxlIGNoaWxkcmVuLCBhbmRcbiAqIGlmIHRoZSBwYXJlbnQgbGlzdCBiZWNvbWVzIGVtcHR5IGFzIGEgcmVzdWx0LCByZW1vdmVzIHRoZSBwYXJlbnQgZnJvbSBpdHNcbiAqIHBhcmVudCwgYW5kIHNvIGZvcnRoIHVwIHRoZSB0cmVlIHdoZW4gdGhhdCBjYXVzZXMgc3Vic2VxdWVudCBwYXJlbnQgbGlzdHMgdG9cbiAqIGJlY29tZSBlbXB0eS5cbiAqL1xuY29uc3QgcmVtb3ZlRGlzY29ubmVjdGFibGVGcm9tUGFyZW50ID0gKG9iajogRGlzY29ubmVjdGFibGUpID0+IHtcbiAgbGV0IHBhcmVudCwgY2hpbGRyZW47XG4gIGRvIHtcbiAgICBpZiAoKHBhcmVudCA9IG9iai5fJHBhcmVudCkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNoaWxkcmVuID0gcGFyZW50Ll8kZGlzY29ubmVjdGFibGVDaGlsZHJlbiE7XG4gICAgY2hpbGRyZW4uZGVsZXRlKG9iaik7XG4gICAgb2JqID0gcGFyZW50O1xuICB9IHdoaWxlIChjaGlsZHJlbj8uc2l6ZSA9PT0gMCk7XG59O1xuXG5jb25zdCBhZGREaXNjb25uZWN0YWJsZVRvUGFyZW50ID0gKG9iajogRGlzY29ubmVjdGFibGUpID0+IHtcbiAgLy8gQ2xpbWIgdGhlIHBhcmVudCB0cmVlLCBjcmVhdGluZyBhIHNwYXJzZSB0cmVlIG9mIGNoaWxkcmVuIG5lZWRpbmdcbiAgLy8gZGlzY29ubmVjdGlvblxuICBmb3IgKGxldCBwYXJlbnQ7IChwYXJlbnQgPSBvYmouXyRwYXJlbnQpOyBvYmogPSBwYXJlbnQpIHtcbiAgICBsZXQgY2hpbGRyZW4gPSBwYXJlbnQuXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuO1xuICAgIGlmIChjaGlsZHJlbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBwYXJlbnQuXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuID0gY2hpbGRyZW4gPSBuZXcgU2V0KCk7XG4gICAgfSBlbHNlIGlmIChjaGlsZHJlbi5oYXMob2JqKSkge1xuICAgICAgLy8gT25jZSB3ZSd2ZSByZWFjaGVkIGEgcGFyZW50IHRoYXQgYWxyZWFkeSBjb250YWlucyB0aGlzIGNoaWxkLCB3ZVxuICAgICAgLy8gY2FuIHNob3J0LWNpcmN1aXRcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjaGlsZHJlbi5hZGQob2JqKTtcbiAgICBpbnN0YWxsRGlzY29ubmVjdEFQSShwYXJlbnQpO1xuICB9XG59O1xuXG4vKipcbiAqIENoYW5nZXMgdGhlIHBhcmVudCByZWZlcmVuY2Ugb2YgdGhlIENoaWxkUGFydCwgYW5kIHVwZGF0ZXMgdGhlIHNwYXJzZSB0cmVlIG9mXG4gKiBEaXNjb25uZWN0YWJsZSBjaGlsZHJlbiBhY2NvcmRpbmdseS5cbiAqXG4gKiBOb3RlLCB0aGlzIG1ldGhvZCB3aWxsIGJlIHBhdGNoZWQgb250byBDaGlsZFBhcnQgaW5zdGFuY2VzIGFuZCBjYWxsZWQgZnJvbVxuICogdGhlIGNvcmUgY29kZSB3aGVuIHBhcnRzIGFyZSBtb3ZlZCBiZXR3ZWVuIGRpZmZlcmVudCBwYXJlbnRzLlxuICovXG5mdW5jdGlvbiByZXBhcmVudERpc2Nvbm5lY3RhYmxlcyh0aGlzOiBDaGlsZFBhcnQsIG5ld1BhcmVudDogRGlzY29ubmVjdGFibGUpIHtcbiAgaWYgKHRoaXMuXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuICE9PSB1bmRlZmluZWQpIHtcbiAgICByZW1vdmVEaXNjb25uZWN0YWJsZUZyb21QYXJlbnQodGhpcyk7XG4gICAgdGhpcy5fJHBhcmVudCA9IG5ld1BhcmVudDtcbiAgICBhZGREaXNjb25uZWN0YWJsZVRvUGFyZW50KHRoaXMpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuXyRwYXJlbnQgPSBuZXdQYXJlbnQ7XG4gIH1cbn1cblxuLyoqXG4gKiBTZXRzIHRoZSBjb25uZWN0ZWQgc3RhdGUgb24gYW55IGRpcmVjdGl2ZXMgY29udGFpbmVkIHdpdGhpbiB0aGUgY29tbWl0dGVkXG4gKiB2YWx1ZSBvZiB0aGlzIHBhcnQgKGkuZS4gd2l0aGluIGEgVGVtcGxhdGVJbnN0YW5jZSBvciBpdGVyYWJsZSBvZlxuICogQ2hpbGRQYXJ0cykgYW5kIHJ1bnMgdGhlaXIgYGRpc2Nvbm5lY3RlZGAvYHJlY29ubmVjdGVkYHMsIGFzIHdlbGwgYXMgd2l0aGluXG4gKiBhbnkgZGlyZWN0aXZlcyBzdG9yZWQgb24gdGhlIENoaWxkUGFydCAod2hlbiBgdmFsdWVPbmx5YCBpcyBmYWxzZSkuXG4gKlxuICogYGlzQ2xlYXJpbmdWYWx1ZWAgc2hvdWxkIGJlIHBhc3NlZCBhcyBgdHJ1ZWAgb24gYSB0b3AtbGV2ZWwgcGFydCB0aGF0IGlzXG4gKiBjbGVhcmluZyBpdHNlbGYsIGFuZCBub3QgYXMgYSByZXN1bHQgb2YgcmVjdXJzaXZlbHkgZGlzY29ubmVjdGluZyBkaXJlY3RpdmVzXG4gKiBhcyBwYXJ0IG9mIGEgYGNsZWFyYCBvcGVyYXRpb24gaGlnaGVyIHVwIHRoZSB0cmVlLiBUaGlzIGJvdGggZW5zdXJlcyB0aGF0IGFueVxuICogZGlyZWN0aXZlIG9uIHRoaXMgQ2hpbGRQYXJ0IHRoYXQgcHJvZHVjZWQgYSB2YWx1ZSB0aGF0IGNhdXNlZCB0aGUgY2xlYXJcbiAqIG9wZXJhdGlvbiBpcyBub3QgZGlzY29ubmVjdGVkLCBhbmQgYWxzbyBzZXJ2ZXMgYXMgYSBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb25cbiAqIHRvIGF2b2lkIG5lZWRsZXNzIGJvb2trZWVwaW5nIHdoZW4gYSBzdWJ0cmVlIGlzIGdvaW5nIGF3YXk7IHdoZW4gY2xlYXJpbmcgYVxuICogc3VidHJlZSwgb25seSB0aGUgdG9wLW1vc3QgcGFydCBuZWVkIHRvIHJlbW92ZSBpdHNlbGYgZnJvbSB0aGUgcGFyZW50LlxuICpcbiAqIGBmcm9tUGFydEluZGV4YCBpcyBwYXNzZWQgb25seSBpbiB0aGUgY2FzZSBvZiBhIHBhcnRpYWwgYF9jbGVhcmAgcnVubmluZyBhcyBhXG4gKiByZXN1bHQgb2YgdHJ1bmNhdGluZyBhbiBpdGVyYWJsZS5cbiAqXG4gKiBOb3RlLCB0aGlzIG1ldGhvZCB3aWxsIGJlIHBhdGNoZWQgb250byBDaGlsZFBhcnQgaW5zdGFuY2VzIGFuZCBjYWxsZWQgZnJvbSB0aGVcbiAqIGNvcmUgY29kZSB3aGVuIHBhcnRzIGFyZSBjbGVhcmVkIG9yIHRoZSBjb25uZWN0aW9uIHN0YXRlIGlzIGNoYW5nZWQgYnkgdGhlXG4gKiB1c2VyLlxuICovXG5mdW5jdGlvbiBub3RpZnlDaGlsZFBhcnRDb25uZWN0ZWRDaGFuZ2VkKFxuICB0aGlzOiBDaGlsZFBhcnQsXG4gIGlzQ29ubmVjdGVkOiBib29sZWFuLFxuICBpc0NsZWFyaW5nVmFsdWUgPSBmYWxzZSxcbiAgZnJvbVBhcnRJbmRleCA9IDBcbikge1xuICBjb25zdCB2YWx1ZSA9IHRoaXMuXyRjb21taXR0ZWRWYWx1ZTtcbiAgY29uc3QgY2hpbGRyZW4gPSB0aGlzLl8kZGlzY29ubmVjdGFibGVDaGlsZHJlbjtcbiAgaWYgKGNoaWxkcmVuID09PSB1bmRlZmluZWQgfHwgY2hpbGRyZW4uc2l6ZSA9PT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoaXNDbGVhcmluZ1ZhbHVlKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAvLyBJdGVyYWJsZSBjYXNlOiBBbnkgQ2hpbGRQYXJ0cyBjcmVhdGVkIGJ5IHRoZSBpdGVyYWJsZSBzaG91bGQgYmVcbiAgICAgIC8vIGRpc2Nvbm5lY3RlZCBhbmQgcmVtb3ZlZCBmcm9tIHRoaXMgQ2hpbGRQYXJ0J3MgZGlzY29ubmVjdGFibGVcbiAgICAgIC8vIGNoaWxkcmVuIChzdGFydGluZyBhdCBgZnJvbVBhcnRJbmRleGAgaW4gdGhlIGNhc2Ugb2YgdHJ1bmNhdGlvbilcbiAgICAgIGZvciAobGV0IGkgPSBmcm9tUGFydEluZGV4OyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbm90aWZ5Q2hpbGRyZW5Db25uZWN0ZWRDaGFuZ2VkKHZhbHVlW2ldLCBmYWxzZSk7XG4gICAgICAgIHJlbW92ZURpc2Nvbm5lY3RhYmxlRnJvbVBhcmVudCh2YWx1ZVtpXSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICAvLyBUZW1wbGF0ZUluc3RhbmNlIGNhc2U6IElmIHRoZSB2YWx1ZSBoYXMgZGlzY29ubmVjdGFibGUgY2hpbGRyZW4gKHdpbGxcbiAgICAgIC8vIG9ubHkgYmUgaW4gdGhlIGNhc2UgdGhhdCBpdCBpcyBhIFRlbXBsYXRlSW5zdGFuY2UpLCB3ZSBkaXNjb25uZWN0IGl0XG4gICAgICAvLyBhbmQgcmVtb3ZlIGl0IGZyb20gdGhpcyBDaGlsZFBhcnQncyBkaXNjb25uZWN0YWJsZSBjaGlsZHJlblxuICAgICAgbm90aWZ5Q2hpbGRyZW5Db25uZWN0ZWRDaGFuZ2VkKHZhbHVlIGFzIERpc2Nvbm5lY3RhYmxlLCBmYWxzZSk7XG4gICAgICByZW1vdmVEaXNjb25uZWN0YWJsZUZyb21QYXJlbnQodmFsdWUgYXMgRGlzY29ubmVjdGFibGUpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBub3RpZnlDaGlsZHJlbkNvbm5lY3RlZENoYW5nZWQodGhpcywgaXNDb25uZWN0ZWQpO1xuICB9XG59XG5cbi8qKlxuICogUGF0Y2hlcyBkaXNjb25uZWN0aW9uIEFQSSBvbnRvIENoaWxkUGFydHMuXG4gKi9cbmNvbnN0IGluc3RhbGxEaXNjb25uZWN0QVBJID0gKG9iajogRGlzY29ubmVjdGFibGUpID0+IHtcbiAgaWYgKChvYmogYXMgQ2hpbGRQYXJ0KS50eXBlID09IFBhcnRUeXBlLkNISUxEKSB7XG4gICAgKG9iaiBhcyBDaGlsZFBhcnQpLl8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQgPz89XG4gICAgICBub3RpZnlDaGlsZFBhcnRDb25uZWN0ZWRDaGFuZ2VkO1xuICAgIChvYmogYXMgQ2hpbGRQYXJ0KS5fJHJlcGFyZW50RGlzY29ubmVjdGFibGVzID8/PSByZXBhcmVudERpc2Nvbm5lY3RhYmxlcztcbiAgfVxufTtcblxuLyoqXG4gKiBBbiBhYnN0cmFjdCBgRGlyZWN0aXZlYCBiYXNlIGNsYXNzIHdob3NlIGBkaXNjb25uZWN0ZWRgIG1ldGhvZCB3aWxsIGJlXG4gKiBjYWxsZWQgd2hlbiB0aGUgcGFydCBjb250YWluaW5nIHRoZSBkaXJlY3RpdmUgaXMgY2xlYXJlZCBhcyBhIHJlc3VsdCBvZlxuICogcmUtcmVuZGVyaW5nLCBvciB3aGVuIHRoZSB1c2VyIGNhbGxzIGBwYXJ0LnNldENvbm5lY3RlZChmYWxzZSlgIG9uXG4gKiBhIHBhcnQgdGhhdCB3YXMgcHJldmlvdXNseSByZW5kZXJlZCBjb250YWluaW5nIHRoZSBkaXJlY3RpdmUgKGFzIGhhcHBlbnNcbiAqIHdoZW4gZS5nLiBhIExpdEVsZW1lbnQgZGlzY29ubmVjdHMgZnJvbSB0aGUgRE9NKS5cbiAqXG4gKiBJZiBgcGFydC5zZXRDb25uZWN0ZWQodHJ1ZSlgIGlzIHN1YnNlcXVlbnRseSBjYWxsZWQgb24gYVxuICogY29udGFpbmluZyBwYXJ0LCB0aGUgZGlyZWN0aXZlJ3MgYHJlY29ubmVjdGVkYCBtZXRob2Qgd2lsbCBiZSBjYWxsZWQgcHJpb3JcbiAqIHRvIGl0cyBuZXh0IGB1cGRhdGVgL2ByZW5kZXJgIGNhbGxiYWNrcy4gV2hlbiBpbXBsZW1lbnRpbmcgYGRpc2Nvbm5lY3RlZGAsXG4gKiBgcmVjb25uZWN0ZWRgIHNob3VsZCBhbHNvIGJlIGltcGxlbWVudGVkIHRvIGJlIGNvbXBhdGlibGUgd2l0aCByZWNvbm5lY3Rpb24uXG4gKlxuICogTm90ZSB0aGF0IHVwZGF0ZXMgbWF5IG9jY3VyIHdoaWxlIHRoZSBkaXJlY3RpdmUgaXMgZGlzY29ubmVjdGVkLiBBcyBzdWNoLFxuICogZGlyZWN0aXZlcyBzaG91bGQgZ2VuZXJhbGx5IGNoZWNrIHRoZSBgdGhpcy5pc0Nvbm5lY3RlZGAgZmxhZyBkdXJpbmdcbiAqIHJlbmRlci91cGRhdGUgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgaXQgaXMgc2FmZSB0byBzdWJzY3JpYmUgdG8gcmVzb3VyY2VzXG4gKiB0aGF0IG1heSBwcmV2ZW50IGdhcmJhZ2UgY29sbGVjdGlvbi5cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFzeW5jRGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgLy8gQXMgb3Bwb3NlZCB0byBvdGhlciBEaXNjb25uZWN0YWJsZXMsIEFzeW5jRGlyZWN0aXZlcyBhbHdheXMgZ2V0IG5vdGlmaWVkXG4gIC8vIHdoZW4gdGhlIFJvb3RQYXJ0IGNvbm5lY3Rpb24gY2hhbmdlcywgc28gdGhlIHB1YmxpYyBgaXNDb25uZWN0ZWRgXG4gIC8vIGlzIGEgbG9jYWxseSBzdG9yZWQgdmFyaWFibGUgaW5pdGlhbGl6ZWQgdmlhIGl0cyBwYXJ0J3MgZ2V0dGVyIGFuZCBzeW5jZWRcbiAgLy8gdmlhIGBfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkYC4gVGhpcyBpcyBjaGVhcGVyIHRoYW4gdXNpbmdcbiAgLy8gdGhlIF8kaXNDb25uZWN0ZWQgZ2V0dGVyLCB3aGljaCBoYXMgdG8gbG9vayBiYWNrIHVwIHRoZSB0cmVlIGVhY2ggdGltZS5cbiAgLyoqXG4gICAqIFRoZSBjb25uZWN0aW9uIHN0YXRlIGZvciB0aGlzIERpcmVjdGl2ZS5cbiAgICovXG4gIGlzQ29ubmVjdGVkITogYm9vbGVhbjtcblxuICAvLyBAaW50ZXJuYWxcbiAgb3ZlcnJpZGUgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuPzogU2V0PERpc2Nvbm5lY3RhYmxlPiA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEluaXRpYWxpemUgdGhlIHBhcnQgd2l0aCBpbnRlcm5hbCBmaWVsZHNcbiAgICogQHBhcmFtIHBhcnRcbiAgICogQHBhcmFtIHBhcmVudFxuICAgKiBAcGFyYW0gYXR0cmlidXRlSW5kZXhcbiAgICovXG4gIG92ZXJyaWRlIF8kaW5pdGlhbGl6ZShcbiAgICBwYXJ0OiBQYXJ0LFxuICAgIHBhcmVudDogRGlzY29ubmVjdGFibGUsXG4gICAgYXR0cmlidXRlSW5kZXg6IG51bWJlciB8IHVuZGVmaW5lZFxuICApIHtcbiAgICBzdXBlci5fJGluaXRpYWxpemUocGFydCwgcGFyZW50LCBhdHRyaWJ1dGVJbmRleCk7XG4gICAgYWRkRGlzY29ubmVjdGFibGVUb1BhcmVudCh0aGlzKTtcbiAgICB0aGlzLmlzQ29ubmVjdGVkID0gcGFydC5fJGlzQ29ubmVjdGVkO1xuICB9XG4gIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gIC8qKlxuICAgKiBDYWxsZWQgZnJvbSB0aGUgY29yZSBjb2RlIHdoZW4gYSBkaXJlY3RpdmUgaXMgZ29pbmcgYXdheSBmcm9tIGEgcGFydCAoaW5cbiAgICogd2hpY2ggY2FzZSBgc2hvdWxkUmVtb3ZlRnJvbVBhcmVudGAgc2hvdWxkIGJlIHRydWUpLCBhbmQgZnJvbSB0aGVcbiAgICogYHNldENoaWxkcmVuQ29ubmVjdGVkYCBoZWxwZXIgZnVuY3Rpb24gd2hlbiByZWN1cnNpdmVseSBjaGFuZ2luZyB0aGVcbiAgICogY29ubmVjdGlvbiBzdGF0ZSBvZiBhIHRyZWUgKGluIHdoaWNoIGNhc2UgYHNob3VsZFJlbW92ZUZyb21QYXJlbnRgIHNob3VsZFxuICAgKiBiZSBmYWxzZSkuXG4gICAqXG4gICAqIEBwYXJhbSBpc0Nvbm5lY3RlZFxuICAgKiBAcGFyYW0gaXNDbGVhcmluZ0RpcmVjdGl2ZSAtIFRydWUgd2hlbiB0aGUgZGlyZWN0aXZlIGl0c2VsZiBpcyBiZWluZ1xuICAgKiAgICAgcmVtb3ZlZDsgZmFsc2Ugd2hlbiB0aGUgdHJlZSBpcyBiZWluZyBkaXNjb25uZWN0ZWRcbiAgICogQGludGVybmFsXG4gICAqL1xuICBvdmVycmlkZSBbJ18kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWQnXShcbiAgICBpc0Nvbm5lY3RlZDogYm9vbGVhbixcbiAgICBpc0NsZWFyaW5nRGlyZWN0aXZlID0gdHJ1ZVxuICApIHtcbiAgICBpZiAoaXNDb25uZWN0ZWQgIT09IHRoaXMuaXNDb25uZWN0ZWQpIHtcbiAgICAgIHRoaXMuaXNDb25uZWN0ZWQgPSBpc0Nvbm5lY3RlZDtcbiAgICAgIGlmIChpc0Nvbm5lY3RlZCkge1xuICAgICAgICB0aGlzLnJlY29ubmVjdGVkPy4oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZGlzY29ubmVjdGVkPy4oKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlzQ2xlYXJpbmdEaXJlY3RpdmUpIHtcbiAgICAgIG5vdGlmeUNoaWxkcmVuQ29ubmVjdGVkQ2hhbmdlZCh0aGlzLCBpc0Nvbm5lY3RlZCk7XG4gICAgICByZW1vdmVEaXNjb25uZWN0YWJsZUZyb21QYXJlbnQodGhpcyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHZhbHVlIG9mIHRoZSBkaXJlY3RpdmUncyBQYXJ0IG91dHNpZGUgdGhlIG5vcm1hbCBgdXBkYXRlYC9gcmVuZGVyYFxuICAgKiBsaWZlY3ljbGUgb2YgYSBkaXJlY3RpdmUuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIHNob3VsZCBub3QgYmUgY2FsbGVkIHN5bmNocm9ub3VzbHkgZnJvbSBhIGRpcmVjdGl2ZSdzIGB1cGRhdGVgXG4gICAqIG9yIGByZW5kZXJgLlxuICAgKlxuICAgKiBAcGFyYW0gZGlyZWN0aXZlIFRoZSBkaXJlY3RpdmUgdG8gdXBkYXRlXG4gICAqIEBwYXJhbSB2YWx1ZSBUaGUgdmFsdWUgdG8gc2V0XG4gICAqL1xuICBzZXRWYWx1ZSh2YWx1ZTogdW5rbm93bikge1xuICAgIGlmIChpc1NpbmdsZUV4cHJlc3Npb24odGhpcy5fX3BhcnQgYXMgdW5rbm93biBhcyBQYXJ0SW5mbykpIHtcbiAgICAgIHRoaXMuX19wYXJ0Ll8kc2V0VmFsdWUodmFsdWUsIHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyB0aGlzLl9fYXR0cmlidXRlSW5kZXggd2lsbCBiZSBkZWZpbmVkIGluIHRoaXMgY2FzZSwgYnV0XG4gICAgICAvLyBhc3NlcnQgaXQgaW4gZGV2IG1vZGVcbiAgICAgIGlmIChERVZfTU9ERSAmJiB0aGlzLl9fYXR0cmlidXRlSW5kZXggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIHRoaXMuX19hdHRyaWJ1dGVJbmRleCB0byBiZSBhIG51bWJlcmApO1xuICAgICAgfVxuICAgICAgY29uc3QgbmV3VmFsdWVzID0gWy4uLih0aGlzLl9fcGFydC5fJGNvbW1pdHRlZFZhbHVlIGFzIEFycmF5PHVua25vd24+KV07XG4gICAgICBuZXdWYWx1ZXNbdGhpcy5fX2F0dHJpYnV0ZUluZGV4IV0gPSB2YWx1ZTtcbiAgICAgICh0aGlzLl9fcGFydCBhcyBBdHRyaWJ1dGVQYXJ0KS5fJHNldFZhbHVlKG5ld1ZhbHVlcywgdGhpcywgMCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFVzZXIgY2FsbGJhY2tzIGZvciBpbXBsZW1lbnRpbmcgbG9naWMgdG8gcmVsZWFzZSBhbnkgcmVzb3VyY2VzL3N1YnNjcmlwdGlvbnNcbiAgICogdGhhdCBtYXkgaGF2ZSBiZWVuIHJldGFpbmVkIGJ5IHRoaXMgZGlyZWN0aXZlLiBTaW5jZSBkaXJlY3RpdmVzIG1heSBhbHNvIGJlXG4gICAqIHJlLWNvbm5lY3RlZCwgYHJlY29ubmVjdGVkYCBzaG91bGQgYWxzbyBiZSBpbXBsZW1lbnRlZCB0byByZXN0b3JlIHRoZVxuICAgKiB3b3JraW5nIHN0YXRlIG9mIHRoZSBkaXJlY3RpdmUgcHJpb3IgdG8gdGhlIG5leHQgcmVuZGVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGRpc2Nvbm5lY3RlZCgpIHt9XG4gIHByb3RlY3RlZCByZWNvbm5lY3RlZCgpIHt9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cbmltcG9ydCB7bm90aGluZywgRWxlbWVudFBhcnR9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7ZGlyZWN0aXZlLCBBc3luY0RpcmVjdGl2ZX0gZnJvbSAnLi4vYXN5bmMtZGlyZWN0aXZlLmpzJztcblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IFJlZiBvYmplY3QsIHdoaWNoIGlzIGNvbnRhaW5lciBmb3IgYSByZWZlcmVuY2UgdG8gYW4gZWxlbWVudC5cbiAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZVJlZiA9IDxUID0gRWxlbWVudD4oKSA9PiBuZXcgUmVmPFQ+KCk7XG5cbi8qKlxuICogQW4gb2JqZWN0IHRoYXQgaG9sZHMgYSByZWYgdmFsdWUuXG4gKi9cbmNsYXNzIFJlZjxUID0gRWxlbWVudD4ge1xuICAvKipcbiAgICogVGhlIGN1cnJlbnQgRWxlbWVudCB2YWx1ZSBvZiB0aGUgcmVmLCBvciBlbHNlIGB1bmRlZmluZWRgIGlmIHRoZSByZWYgaXMgbm9cbiAgICogbG9uZ2VyIHJlbmRlcmVkLlxuICAgKi9cbiAgcmVhZG9ubHkgdmFsdWU/OiBUO1xufVxuXG5leHBvcnQgdHlwZSB7UmVmfTtcblxuaW50ZXJmYWNlIFJlZkludGVybmFsIHtcbiAgdmFsdWU6IEVsZW1lbnQgfCB1bmRlZmluZWQ7XG59XG5cbi8vIFdoZW4gY2FsbGJhY2tzIGFyZSB1c2VkIGZvciByZWZzLCB0aGlzIG1hcCB0cmFja3MgdGhlIGxhc3QgdmFsdWUgdGhlIGNhbGxiYWNrXG4vLyB3YXMgY2FsbGVkIHdpdGgsIGZvciBlbnN1cmluZyBhIGRpcmVjdGl2ZSBkb2Vzbid0IGNsZWFyIHRoZSByZWYgaWYgdGhlIHJlZlxuLy8gaGFzIGFscmVhZHkgYmVlbiByZW5kZXJlZCB0byBhIG5ldyBzcG90LiBJdCBpcyBkb3VibGUta2V5ZWQgb24gYm90aCB0aGVcbi8vIGNvbnRleHQgKGBvcHRpb25zLmhvc3RgKSBhbmQgdGhlIGNhbGxiYWNrLCBzaW5jZSB3ZSBhdXRvLWJpbmQgY2xhc3MgbWV0aG9kc1xuLy8gdG8gYG9wdGlvbnMuaG9zdGAuXG5jb25zdCBsYXN0RWxlbWVudEZvckNvbnRleHRBbmRDYWxsYmFjayA9IG5ldyBXZWFrTWFwPFxuICBvYmplY3QsXG4gIFdlYWtNYXA8RnVuY3Rpb24sIEVsZW1lbnQgfCB1bmRlZmluZWQ+XG4+KCk7XG5cbmV4cG9ydCB0eXBlIFJlZk9yQ2FsbGJhY2s8VCA9IEVsZW1lbnQ+ID0gUmVmPFQ+IHwgKChlbDogVCB8IHVuZGVmaW5lZCkgPT4gdm9pZCk7XG5cbmNsYXNzIFJlZkRpcmVjdGl2ZSBleHRlbmRzIEFzeW5jRGlyZWN0aXZlIHtcbiAgcHJpdmF0ZSBfZWxlbWVudD86IEVsZW1lbnQ7XG4gIHByaXZhdGUgX3JlZj86IFJlZk9yQ2FsbGJhY2s7XG4gIHByaXZhdGUgX2NvbnRleHQ/OiBvYmplY3Q7XG5cbiAgcmVuZGVyKF9yZWY/OiBSZWZPckNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIG5vdGhpbmc7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUocGFydDogRWxlbWVudFBhcnQsIFtyZWZdOiBQYXJhbWV0ZXJzPHRoaXNbJ3JlbmRlciddPikge1xuICAgIGNvbnN0IHJlZkNoYW5nZWQgPSByZWYgIT09IHRoaXMuX3JlZjtcbiAgICBpZiAocmVmQ2hhbmdlZCAmJiB0aGlzLl9yZWYgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gVGhlIHJlZiBwYXNzZWQgdG8gdGhlIGRpcmVjdGl2ZSBoYXMgY2hhbmdlZDtcbiAgICAgIC8vIHVuc2V0IHRoZSBwcmV2aW91cyByZWYncyB2YWx1ZVxuICAgICAgdGhpcy5fdXBkYXRlUmVmVmFsdWUodW5kZWZpbmVkKTtcbiAgICB9XG4gICAgaWYgKHJlZkNoYW5nZWQgfHwgdGhpcy5fbGFzdEVsZW1lbnRGb3JSZWYgIT09IHRoaXMuX2VsZW1lbnQpIHtcbiAgICAgIC8vIFdlIGVpdGhlciBnb3QgYSBuZXcgcmVmIG9yIHRoaXMgaXMgdGhlIGZpcnN0IHJlbmRlcjtcbiAgICAgIC8vIHN0b3JlIHRoZSByZWYvZWxlbWVudCAmIHVwZGF0ZSB0aGUgcmVmIHZhbHVlXG4gICAgICB0aGlzLl9yZWYgPSByZWY7XG4gICAgICB0aGlzLl9jb250ZXh0ID0gcGFydC5vcHRpb25zPy5ob3N0O1xuICAgICAgdGhpcy5fdXBkYXRlUmVmVmFsdWUoKHRoaXMuX2VsZW1lbnQgPSBwYXJ0LmVsZW1lbnQpKTtcbiAgICB9XG4gICAgcmV0dXJuIG5vdGhpbmc7XG4gIH1cblxuICBwcml2YXRlIF91cGRhdGVSZWZWYWx1ZShlbGVtZW50OiBFbGVtZW50IHwgdW5kZWZpbmVkKSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLl9yZWYgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIElmIHRoZSBjdXJyZW50IHJlZiB3YXMgY2FsbGVkIHdpdGggYSBwcmV2aW91cyB2YWx1ZSwgY2FsbCB3aXRoXG4gICAgICAvLyBgdW5kZWZpbmVkYDsgV2UgZG8gdGhpcyB0byBlbnN1cmUgY2FsbGJhY2tzIGFyZSBjYWxsZWQgaW4gYSBjb25zaXN0ZW50XG4gICAgICAvLyB3YXkgcmVnYXJkbGVzcyBvZiB3aGV0aGVyIGEgcmVmIG1pZ2h0IGJlIG1vdmluZyB1cCBpbiB0aGUgdHJlZSAoaW5cbiAgICAgIC8vIHdoaWNoIGNhc2UgaXQgd291bGQgb3RoZXJ3aXNlIGJlIGNhbGxlZCB3aXRoIHRoZSBuZXcgdmFsdWUgYmVmb3JlIHRoZVxuICAgICAgLy8gcHJldmlvdXMgb25lIHVuc2V0cyBpdCkgYW5kIGRvd24gaW4gdGhlIHRyZWUgKHdoZXJlIGl0IHdvdWxkIGJlIHVuc2V0XG4gICAgICAvLyBiZWZvcmUgYmVpbmcgc2V0KS4gTm90ZSB0aGF0IGVsZW1lbnQgbG9va3VwIGlzIGtleWVkIGJ5XG4gICAgICAvLyBib3RoIHRoZSBjb250ZXh0IGFuZCB0aGUgY2FsbGJhY2ssIHNpbmNlIHdlIGFsbG93IHBhc3NpbmcgdW5ib3VuZFxuICAgICAgLy8gZnVuY3Rpb25zIHRoYXQgYXJlIGNhbGxlZCBvbiBvcHRpb25zLmhvc3QsIGFuZCB3ZSB3YW50IHRvIHRyZWF0XG4gICAgICAvLyB0aGVzZSBhcyB1bmlxdWUgXCJpbnN0YW5jZXNcIiBvZiBhIGZ1bmN0aW9uLlxuICAgICAgY29uc3QgY29udGV4dCA9IHRoaXMuX2NvbnRleHQgPz8gZ2xvYmFsVGhpcztcbiAgICAgIGxldCBsYXN0RWxlbWVudEZvckNhbGxiYWNrID1cbiAgICAgICAgbGFzdEVsZW1lbnRGb3JDb250ZXh0QW5kQ2FsbGJhY2suZ2V0KGNvbnRleHQpO1xuICAgICAgaWYgKGxhc3RFbGVtZW50Rm9yQ2FsbGJhY2sgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBsYXN0RWxlbWVudEZvckNhbGxiYWNrID0gbmV3IFdlYWtNYXAoKTtcbiAgICAgICAgbGFzdEVsZW1lbnRGb3JDb250ZXh0QW5kQ2FsbGJhY2suc2V0KGNvbnRleHQsIGxhc3RFbGVtZW50Rm9yQ2FsbGJhY2spO1xuICAgICAgfVxuICAgICAgaWYgKGxhc3RFbGVtZW50Rm9yQ2FsbGJhY2suZ2V0KHRoaXMuX3JlZikgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9yZWYuY2FsbCh0aGlzLl9jb250ZXh0LCB1bmRlZmluZWQpO1xuICAgICAgfVxuICAgICAgbGFzdEVsZW1lbnRGb3JDYWxsYmFjay5zZXQodGhpcy5fcmVmLCBlbGVtZW50KTtcbiAgICAgIC8vIENhbGwgdGhlIHJlZiB3aXRoIHRoZSBuZXcgZWxlbWVudCB2YWx1ZVxuICAgICAgaWYgKGVsZW1lbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9yZWYuY2FsbCh0aGlzLl9jb250ZXh0LCBlbGVtZW50KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgKHRoaXMuX3JlZiBhcyBSZWZJbnRlcm5hbCkhLnZhbHVlID0gZWxlbWVudDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldCBfbGFzdEVsZW1lbnRGb3JSZWYoKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB0aGlzLl9yZWYgPT09ICdmdW5jdGlvbidcbiAgICAgID8gbGFzdEVsZW1lbnRGb3JDb250ZXh0QW5kQ2FsbGJhY2tcbiAgICAgICAgICAuZ2V0KHRoaXMuX2NvbnRleHQgPz8gZ2xvYmFsVGhpcylcbiAgICAgICAgICA/LmdldCh0aGlzLl9yZWYpXG4gICAgICA6IHRoaXMuX3JlZj8udmFsdWU7XG4gIH1cblxuICBvdmVycmlkZSBkaXNjb25uZWN0ZWQoKSB7XG4gICAgLy8gT25seSBjbGVhciB0aGUgYm94IGlmIG91ciBlbGVtZW50IGlzIHN0aWxsIHRoZSBvbmUgaW4gaXQgKGkuZS4gYW5vdGhlclxuICAgIC8vIGRpcmVjdGl2ZSBpbnN0YW5jZSBoYXNuJ3QgcmVuZGVyZWQgaXRzIGVsZW1lbnQgdG8gaXQgYmVmb3JlIHVzKTsgdGhhdFxuICAgIC8vIG9ubHkgaGFwcGVucyBpbiB0aGUgZXZlbnQgb2YgdGhlIGRpcmVjdGl2ZSBiZWluZyBjbGVhcmVkIChub3QgdmlhIG1hbnVhbFxuICAgIC8vIGRpc2Nvbm5lY3Rpb24pXG4gICAgaWYgKHRoaXMuX2xhc3RFbGVtZW50Rm9yUmVmID09PSB0aGlzLl9lbGVtZW50KSB7XG4gICAgICB0aGlzLl91cGRhdGVSZWZWYWx1ZSh1bmRlZmluZWQpO1xuICAgIH1cbiAgfVxuXG4gIG92ZXJyaWRlIHJlY29ubmVjdGVkKCkge1xuICAgIC8vIElmIHdlIHdlcmUgbWFudWFsbHkgZGlzY29ubmVjdGVkLCB3ZSBjYW4gc2FmZWx5IHB1dCBvdXIgZWxlbWVudCBiYWNrIGluXG4gICAgLy8gdGhlIGJveCwgc2luY2Ugbm8gcmVuZGVyaW5nIGNvdWxkIGhhdmUgb2NjdXJyZWQgdG8gY2hhbmdlIGl0cyBzdGF0ZVxuICAgIHRoaXMuX3VwZGF0ZVJlZlZhbHVlKHRoaXMuX2VsZW1lbnQpO1xuICB9XG59XG5cbi8qKlxuICogU2V0cyB0aGUgdmFsdWUgb2YgYSBSZWYgb2JqZWN0IG9yIGNhbGxzIGEgcmVmIGNhbGxiYWNrIHdpdGggdGhlIGVsZW1lbnQgaXQnc1xuICogYm91bmQgdG8uXG4gKlxuICogQSBSZWYgb2JqZWN0IGFjdHMgYXMgYSBjb250YWluZXIgZm9yIGEgcmVmZXJlbmNlIHRvIGFuIGVsZW1lbnQuIEEgcmVmXG4gKiBjYWxsYmFjayBpcyBhIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYW4gZWxlbWVudCBhcyBpdHMgb25seSBhcmd1bWVudC5cbiAqXG4gKiBUaGUgcmVmIGRpcmVjdGl2ZSBzZXRzIHRoZSB2YWx1ZSBvZiB0aGUgUmVmIG9iamVjdCBvciBjYWxscyB0aGUgcmVmIGNhbGxiYWNrXG4gKiBkdXJpbmcgcmVuZGVyaW5nLCBpZiB0aGUgcmVmZXJlbmNlZCBlbGVtZW50IGNoYW5nZWQuXG4gKlxuICogTm90ZTogSWYgYSByZWYgY2FsbGJhY2sgaXMgcmVuZGVyZWQgdG8gYSBkaWZmZXJlbnQgZWxlbWVudCBwb3NpdGlvbiBvciBpc1xuICogcmVtb3ZlZCBpbiBhIHN1YnNlcXVlbnQgcmVuZGVyLCBpdCB3aWxsIGZpcnN0IGJlIGNhbGxlZCB3aXRoIGB1bmRlZmluZWRgLFxuICogZm9sbG93ZWQgYnkgYW5vdGhlciBjYWxsIHdpdGggdGhlIG5ldyBlbGVtZW50IGl0IHdhcyByZW5kZXJlZCB0byAoaWYgYW55KS5cbiAqXG4gKiBgYGBqc1xuICogLy8gVXNpbmcgUmVmIG9iamVjdFxuICogY29uc3QgaW5wdXRSZWYgPSBjcmVhdGVSZWYoKTtcbiAqIHJlbmRlcihodG1sYDxpbnB1dCAke3JlZihpbnB1dFJlZil9PmAsIGNvbnRhaW5lcik7XG4gKiBpbnB1dFJlZi52YWx1ZS5mb2N1cygpO1xuICpcbiAqIC8vIFVzaW5nIGNhbGxiYWNrXG4gKiBjb25zdCBjYWxsYmFjayA9IChpbnB1dEVsZW1lbnQpID0+IGlucHV0RWxlbWVudC5mb2N1cygpO1xuICogcmVuZGVyKGh0bWxgPGlucHV0ICR7cmVmKGNhbGxiYWNrKX0+YCwgY29udGFpbmVyKTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcmVmID0gZGlyZWN0aXZlKFJlZkRpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7UmVmRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIxIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG4vLyBOb3RlLCB0aGlzIG1vZHVsZSBpcyBub3QgaW5jbHVkZWQgaW4gcGFja2FnZSBleHBvcnRzIHNvIHRoYXQgaXQncyBwcml2YXRlIHRvXG4vLyBvdXIgZmlyc3QtcGFydHkgZGlyZWN0aXZlcy4gSWYgaXQgZW5kcyB1cCBiZWluZyB1c2VmdWwsIHdlIGNhbiBvcGVuIGl0IHVwIGFuZFxuLy8gZXhwb3J0IGl0LlxuXG4vKipcbiAqIEhlbHBlciB0byBpdGVyYXRlIGFuIEFzeW5jSXRlcmFibGUgaW4gaXRzIG93biBjbG9zdXJlLlxuICogQHBhcmFtIGl0ZXJhYmxlIFRoZSBpdGVyYWJsZSB0byBpdGVyYXRlXG4gKiBAcGFyYW0gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIHRvIGNhbGwgZm9yIGVhY2ggdmFsdWUuIElmIHRoZSBjYWxsYmFjayByZXR1cm5zXG4gKiBgZmFsc2VgLCB0aGUgbG9vcCB3aWxsIGJlIGJyb2tlbi5cbiAqL1xuZXhwb3J0IGNvbnN0IGZvckF3YWl0T2YgPSBhc3luYyA8VD4oXG4gIGl0ZXJhYmxlOiBBc3luY0l0ZXJhYmxlPFQ+LFxuICBjYWxsYmFjazogKHZhbHVlOiBUKSA9PiBQcm9taXNlPGJvb2xlYW4+XG4pID0+IHtcbiAgZm9yIGF3YWl0IChjb25zdCB2IG9mIGl0ZXJhYmxlKSB7XG4gICAgaWYgKChhd2FpdCBjYWxsYmFjayh2KSkgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIEhvbGRzIGEgcmVmZXJlbmNlIHRvIGFuIGluc3RhbmNlIHRoYXQgY2FuIGJlIGRpc2Nvbm5lY3RlZCBhbmQgcmVjb25uZWN0ZWQsXG4gKiBzbyB0aGF0IGEgY2xvc3VyZSBvdmVyIHRoZSByZWYgKGUuZy4gaW4gYSB0aGVuIGZ1bmN0aW9uIHRvIGEgcHJvbWlzZSkgZG9lc1xuICogbm90IHN0cm9uZ2x5IGhvbGQgYSByZWYgdG8gdGhlIGluc3RhbmNlLiBBcHByb3hpbWF0ZXMgYSBXZWFrUmVmIGJ1dCBtdXN0XG4gKiBiZSBtYW51YWxseSBjb25uZWN0ZWQgJiBkaXNjb25uZWN0ZWQgdG8gdGhlIGJhY2tpbmcgaW5zdGFuY2UuXG4gKi9cbmV4cG9ydCBjbGFzcyBQc2V1ZG9XZWFrUmVmPFQ+IHtcbiAgcHJpdmF0ZSBfcmVmPzogVDtcbiAgY29uc3RydWN0b3IocmVmOiBUKSB7XG4gICAgdGhpcy5fcmVmID0gcmVmO1xuICB9XG4gIC8qKlxuICAgKiBEaXNhc3NvY2lhdGVzIHRoZSByZWYgd2l0aCB0aGUgYmFja2luZyBpbnN0YW5jZS5cbiAgICovXG4gIGRpc2Nvbm5lY3QoKSB7XG4gICAgdGhpcy5fcmVmID0gdW5kZWZpbmVkO1xuICB9XG4gIC8qKlxuICAgKiBSZWFzc29jaWF0ZXMgdGhlIHJlZiB3aXRoIHRoZSBiYWNraW5nIGluc3RhbmNlLlxuICAgKi9cbiAgcmVjb25uZWN0KHJlZjogVCkge1xuICAgIHRoaXMuX3JlZiA9IHJlZjtcbiAgfVxuICAvKipcbiAgICogUmV0cmlldmVzIHRoZSBiYWNraW5nIGluc3RhbmNlICh3aWxsIGJlIHVuZGVmaW5lZCB3aGVuIGRpc2Nvbm5lY3RlZClcbiAgICovXG4gIGRlcmVmKCkge1xuICAgIHJldHVybiB0aGlzLl9yZWY7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGhlbHBlciB0byBwYXVzZSBhbmQgcmVzdW1lIHdhaXRpbmcgb24gYSBjb25kaXRpb24gaW4gYW4gYXN5bmMgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IGNsYXNzIFBhdXNlciB7XG4gIHByaXZhdGUgX3Byb21pc2U/OiBQcm9taXNlPHZvaWQ+ID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIF9yZXNvbHZlPzogKCkgPT4gdm9pZCA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIFdoZW4gcGF1c2VkLCByZXR1cm5zIGEgcHJvbWlzZSB0byBiZSBhd2FpdGVkOyB3aGVuIHVucGF1c2VkLCByZXR1cm5zXG4gICAqIHVuZGVmaW5lZC4gTm90ZSB0aGF0IGluIHRoZSBtaWNyb3Rhc2sgYmV0d2VlbiB0aGUgcGF1c2VyIGJlaW5nIHJlc3VtZWRcbiAgICogYW4gYW4gYXdhaXQgb2YgdGhpcyBwcm9taXNlIHJlc29sdmluZywgdGhlIHBhdXNlciBjb3VsZCBiZSBwYXVzZWQgYWdhaW4sXG4gICAqIGhlbmNlIGNhbGxlcnMgc2hvdWxkIGNoZWNrIHRoZSBwcm9taXNlIGluIGEgbG9vcCB3aGVuIGF3YWl0aW5nLlxuICAgKiBAcmV0dXJucyBBIHByb21pc2UgdG8gYmUgYXdhaXRlZCB3aGVuIHBhdXNlZCBvciB1bmRlZmluZWRcbiAgICovXG4gIGdldCgpIHtcbiAgICByZXR1cm4gdGhpcy5fcHJvbWlzZTtcbiAgfVxuICAvKipcbiAgICogQ3JlYXRlcyBhIHByb21pc2UgdG8gYmUgYXdhaXRlZFxuICAgKi9cbiAgcGF1c2UoKSB7XG4gICAgdGhpcy5fcHJvbWlzZSA/Pz0gbmV3IFByb21pc2UoKHJlc29sdmUpID0+ICh0aGlzLl9yZXNvbHZlID0gcmVzb2x2ZSkpO1xuICB9XG4gIC8qKlxuICAgKiBSZXNvbHZlcyB0aGUgcHJvbWlzZSB3aGljaCBtYXkgYmUgYXdhaXRlZFxuICAgKi9cbiAgcmVzdW1lKCkge1xuICAgIHRoaXMuX3Jlc29sdmU/LigpO1xuICAgIHRoaXMuX3Byb21pc2UgPSB0aGlzLl9yZXNvbHZlID0gdW5kZWZpbmVkO1xuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtDaGlsZFBhcnQsIG5vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBBc3luY0RpcmVjdGl2ZSxcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmVQYXJhbWV0ZXJzLFxufSBmcm9tICcuLi9hc3luYy1kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtQYXVzZXIsIFBzZXVkb1dlYWtSZWYsIGZvckF3YWl0T2Z9IGZyb20gJy4vcHJpdmF0ZS1hc3luYy1oZWxwZXJzLmpzJztcblxudHlwZSBNYXBwZXI8VD4gPSAodjogVCwgaW5kZXg/OiBudW1iZXIpID0+IHVua25vd247XG5cbmV4cG9ydCBjbGFzcyBBc3luY1JlcGxhY2VEaXJlY3RpdmUgZXh0ZW5kcyBBc3luY0RpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX192YWx1ZT86IEFzeW5jSXRlcmFibGU8dW5rbm93bj47XG4gIHByaXZhdGUgX193ZWFrVGhpcyA9IG5ldyBQc2V1ZG9XZWFrUmVmKHRoaXMpO1xuICBwcml2YXRlIF9fcGF1c2VyID0gbmV3IFBhdXNlcigpO1xuXG4gIC8vIEB0cy1leHBlY3QtZXJyb3IgdmFsdWUgbm90IHVzZWQsIGJ1dCB3ZSB3YW50IGEgbmljZSBwYXJhbWV0ZXIgZm9yIGRvY3NcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICByZW5kZXI8VD4odmFsdWU6IEFzeW5jSXRlcmFibGU8VD4sIF9tYXBwZXI/OiBNYXBwZXI8VD4pIHtcbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUoXG4gICAgX3BhcnQ6IENoaWxkUGFydCxcbiAgICBbdmFsdWUsIG1hcHBlcl06IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz5cbiAgKSB7XG4gICAgLy8gSWYgb3VyIGluaXRpYWwgcmVuZGVyIG9jY3VycyB3aGlsZSBkaXNjb25uZWN0ZWQsIGVuc3VyZSB0aGF0IHRoZSBwYXVzZXJcbiAgICAvLyBhbmQgd2Vha1RoaXMgYXJlIGluIHRoZSBkaXNjb25uZWN0ZWQgc3RhdGVcbiAgICBpZiAoIXRoaXMuaXNDb25uZWN0ZWQpIHtcbiAgICAgIHRoaXMuZGlzY29ubmVjdGVkKCk7XG4gICAgfVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgc2V0IHVwIHRoaXMgcGFydGljdWxhciBpdGVyYWJsZSwgd2UgZG9uJ3QgbmVlZFxuICAgIC8vIHRvIGRvIGFueXRoaW5nLlxuICAgIGlmICh2YWx1ZSA9PT0gdGhpcy5fX3ZhbHVlKSB7XG4gICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgfVxuICAgIHRoaXMuX192YWx1ZSA9IHZhbHVlO1xuICAgIGxldCBpID0gMDtcbiAgICBjb25zdCB7X193ZWFrVGhpczogd2Vha1RoaXMsIF9fcGF1c2VyOiBwYXVzZXJ9ID0gdGhpcztcbiAgICAvLyBOb3RlLCB0aGUgY2FsbGJhY2sgYXZvaWRzIGNsb3Npbmcgb3ZlciBgdGhpc2Agc28gdGhhdCB0aGUgZGlyZWN0aXZlXG4gICAgLy8gY2FuIGJlIGdjJ2VkIGJlZm9yZSB0aGUgcHJvbWlzZSByZXNvbHZlczsgaW5zdGVhZCBgdGhpc2AgaXMgcmV0cmlldmVkXG4gICAgLy8gZnJvbSBgd2Vha1RoaXNgLCB3aGljaCBjYW4gYnJlYWsgdGhlIGhhcmQgcmVmZXJlbmNlIGluIHRoZSBjbG9zdXJlIHdoZW5cbiAgICAvLyB0aGUgZGlyZWN0aXZlIGRpc2Nvbm5lY3RzXG4gICAgZm9yQXdhaXRPZih2YWx1ZSwgYXN5bmMgKHY6IHVua25vd24pID0+IHtcbiAgICAgIC8vIFRoZSB3aGlsZSBsb29wIGhlcmUgaGFuZGxlcyB0aGUgY2FzZSB0aGF0IHRoZSBjb25uZWN0aW9uIHN0YXRlXG4gICAgICAvLyB0aHJhc2hlcywgY2F1c2luZyB0aGUgcGF1c2VyIHRvIHJlc3VtZSBhbmQgdGhlbiBnZXQgcmUtcGF1c2VkXG4gICAgICB3aGlsZSAocGF1c2VyLmdldCgpKSB7XG4gICAgICAgIGF3YWl0IHBhdXNlci5nZXQoKTtcbiAgICAgIH1cbiAgICAgIC8vIElmIHRoZSBjYWxsYmFjayBnZXRzIGhlcmUgYW5kIHRoZXJlIGlzIG5vIGB0aGlzYCwgaXQgbWVhbnMgdGhhdCB0aGVcbiAgICAgIC8vIGRpcmVjdGl2ZSBoYXMgYmVlbiBkaXNjb25uZWN0ZWQgYW5kIGdhcmJhZ2UgY29sbGVjdGVkIGFuZCB3ZSBkb24ndFxuICAgICAgLy8gbmVlZCB0byBkbyBhbnl0aGluZyBlbHNlXG4gICAgICBjb25zdCBfdGhpcyA9IHdlYWtUaGlzLmRlcmVmKCk7XG4gICAgICBpZiAoX3RoaXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBDaGVjayB0byBtYWtlIHN1cmUgdGhhdCB2YWx1ZSBpcyB0aGUgc3RpbGwgdGhlIGN1cnJlbnQgdmFsdWUgb2ZcbiAgICAgICAgLy8gdGhlIHBhcnQsIGFuZCBpZiBub3QgYmFpbCBiZWNhdXNlIGEgbmV3IHZhbHVlIG93bnMgdGhpcyBwYXJ0XG4gICAgICAgIGlmIChfdGhpcy5fX3ZhbHVlICE9PSB2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFzIGEgY29udmVuaWVuY2UsIGJlY2F1c2UgZnVuY3Rpb25hbC1wcm9ncmFtbWluZy1zdHlsZVxuICAgICAgICAvLyB0cmFuc2Zvcm1zIG9mIGl0ZXJhYmxlcyBhbmQgYXN5bmMgaXRlcmFibGVzIHJlcXVpcmVzIGEgbGlicmFyeSxcbiAgICAgICAgLy8gd2UgYWNjZXB0IGEgbWFwcGVyIGZ1bmN0aW9uLiBUaGlzIGlzIGVzcGVjaWFsbHkgY29udmVuaWVudCBmb3JcbiAgICAgICAgLy8gcmVuZGVyaW5nIGEgdGVtcGxhdGUgZm9yIGVhY2ggaXRlbS5cbiAgICAgICAgaWYgKG1hcHBlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdiA9IG1hcHBlcih2LCBpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIF90aGlzLmNvbW1pdFZhbHVlKHYsIGkpO1xuICAgICAgICBpKys7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cblxuICAvLyBPdmVycmlkZSBwb2ludCBmb3IgQXN5bmNBcHBlbmQgdG8gYXBwZW5kIHJhdGhlciB0aGFuIHJlcGxhY2VcbiAgcHJvdGVjdGVkIGNvbW1pdFZhbHVlKHZhbHVlOiB1bmtub3duLCBfaW5kZXg6IG51bWJlcikge1xuICAgIHRoaXMuc2V0VmFsdWUodmFsdWUpO1xuICB9XG5cbiAgb3ZlcnJpZGUgZGlzY29ubmVjdGVkKCkge1xuICAgIHRoaXMuX193ZWFrVGhpcy5kaXNjb25uZWN0KCk7XG4gICAgdGhpcy5fX3BhdXNlci5wYXVzZSgpO1xuICB9XG5cbiAgb3ZlcnJpZGUgcmVjb25uZWN0ZWQoKSB7XG4gICAgdGhpcy5fX3dlYWtUaGlzLnJlY29ubmVjdCh0aGlzKTtcbiAgICB0aGlzLl9fcGF1c2VyLnJlc3VtZSgpO1xuICB9XG59XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCByZW5kZXJzIHRoZSBpdGVtcyBvZiBhbiBhc3luYyBpdGVyYWJsZVsxXSwgcmVwbGFjaW5nXG4gKiBwcmV2aW91cyB2YWx1ZXMgd2l0aCBuZXcgdmFsdWVzLCBzbyB0aGF0IG9ubHkgb25lIHZhbHVlIGlzIGV2ZXIgcmVuZGVyZWRcbiAqIGF0IGEgdGltZS4gVGhpcyBkaXJlY3RpdmUgbWF5IGJlIHVzZWQgaW4gYW55IGV4cHJlc3Npb24gdHlwZS5cbiAqXG4gKiBBc3luYyBpdGVyYWJsZXMgYXJlIG9iamVjdHMgd2l0aCBhIGBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdYCBtZXRob2QsIHdoaWNoXG4gKiByZXR1cm5zIGFuIGl0ZXJhdG9yIHdobydzIGBuZXh0KClgIG1ldGhvZCByZXR1cm5zIGEgUHJvbWlzZS4gV2hlbiBhIG5ld1xuICogdmFsdWUgaXMgYXZhaWxhYmxlLCB0aGUgUHJvbWlzZSByZXNvbHZlcyBhbmQgdGhlIHZhbHVlIGlzIHJlbmRlcmVkIHRvIHRoZVxuICogUGFydCBjb250cm9sbGVkIGJ5IHRoZSBkaXJlY3RpdmUuIElmIGFub3RoZXIgdmFsdWUgb3RoZXIgdGhhbiB0aGlzXG4gKiBkaXJlY3RpdmUgaGFzIGJlZW4gc2V0IG9uIHRoZSBQYXJ0LCB0aGUgaXRlcmFibGUgd2lsbCBubyBsb25nZXIgYmUgbGlzdGVuZWRcbiAqIHRvIGFuZCBuZXcgdmFsdWVzIHdvbid0IGJlIHdyaXR0ZW4gdG8gdGhlIFBhcnQuXG4gKlxuICogWzFdOiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9TdGF0ZW1lbnRzL2Zvci1hd2FpdC4uLm9mXG4gKlxuICogQHBhcmFtIHZhbHVlIEFuIGFzeW5jIGl0ZXJhYmxlXG4gKiBAcGFyYW0gbWFwcGVyIEFuIG9wdGlvbmFsIGZ1bmN0aW9uIHRoYXQgbWFwcyBmcm9tICh2YWx1ZSwgaW5kZXgpIHRvIGFub3RoZXJcbiAqICAgICB2YWx1ZS4gVXNlZnVsIGZvciBnZW5lcmF0aW5nIHRlbXBsYXRlcyBmb3IgZWFjaCBpdGVtIGluIHRoZSBpdGVyYWJsZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGFzeW5jUmVwbGFjZSA9IGRpcmVjdGl2ZShBc3luY1JlcGxhY2VEaXJlY3RpdmUpO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7Q2hpbGRQYXJ0fSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBkaXJlY3RpdmUsXG4gIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG4gIFBhcnRJbmZvLFxuICBQYXJ0VHlwZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7QXN5bmNSZXBsYWNlRGlyZWN0aXZlfSBmcm9tICcuL2FzeW5jLXJlcGxhY2UuanMnO1xuaW1wb3J0IHtcbiAgY2xlYXJQYXJ0LFxuICBpbnNlcnRQYXJ0LFxuICBzZXRDaGlsZFBhcnRWYWx1ZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuXG5jbGFzcyBBc3luY0FwcGVuZERpcmVjdGl2ZSBleHRlbmRzIEFzeW5jUmVwbGFjZURpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX19jaGlsZFBhcnQhOiBDaGlsZFBhcnQ7XG5cbiAgLy8gT3ZlcnJpZGUgQXN5bmNSZXBsYWNlIHRvIG5hcnJvdyB0aGUgYWxsb3dlZCBwYXJ0IHR5cGUgdG8gQ2hpbGRQYXJ0IG9ubHlcbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICAgIGlmIChwYXJ0SW5mby50eXBlICE9PSBQYXJ0VHlwZS5DSElMRCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdhc3luY0FwcGVuZCBjYW4gb25seSBiZSB1c2VkIGluIGNoaWxkIGV4cHJlc3Npb25zJyk7XG4gICAgfVxuICB9XG5cbiAgLy8gT3ZlcnJpZGUgQXN5bmNSZXBsYWNlIHRvIHNhdmUgdGhlIHBhcnQgc2luY2Ugd2UgbmVlZCB0byBhcHBlbmQgaW50byBpdFxuICBvdmVycmlkZSB1cGRhdGUocGFydDogQ2hpbGRQYXJ0LCBwYXJhbXM6IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICB0aGlzLl9fY2hpbGRQYXJ0ID0gcGFydDtcbiAgICByZXR1cm4gc3VwZXIudXBkYXRlKHBhcnQsIHBhcmFtcyk7XG4gIH1cblxuICAvLyBPdmVycmlkZSBBc3luY1JlcGxhY2UgdG8gYXBwZW5kIHJhdGhlciB0aGFuIHJlcGxhY2VcbiAgcHJvdGVjdGVkIG92ZXJyaWRlIGNvbW1pdFZhbHVlKHZhbHVlOiB1bmtub3duLCBpbmRleDogbnVtYmVyKSB7XG4gICAgLy8gV2hlbiB3ZSBnZXQgdGhlIGZpcnN0IHZhbHVlLCBjbGVhciB0aGUgcGFydC4gVGhpcyBsZXRzIHRoZVxuICAgIC8vIHByZXZpb3VzIHZhbHVlIGRpc3BsYXkgdW50aWwgd2UgY2FuIHJlcGxhY2UgaXQuXG4gICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICBjbGVhclBhcnQodGhpcy5fX2NoaWxkUGFydCk7XG4gICAgfVxuICAgIC8vIENyZWF0ZSBhbmQgaW5zZXJ0IGEgbmV3IHBhcnQgYW5kIHNldCBpdHMgdmFsdWUgdG8gdGhlIG5leHQgdmFsdWVcbiAgICBjb25zdCBuZXdQYXJ0ID0gaW5zZXJ0UGFydCh0aGlzLl9fY2hpbGRQYXJ0KTtcbiAgICBzZXRDaGlsZFBhcnRWYWx1ZShuZXdQYXJ0LCB2YWx1ZSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGRpcmVjdGl2ZSB0aGF0IHJlbmRlcnMgdGhlIGl0ZW1zIG9mIGFuIGFzeW5jIGl0ZXJhYmxlWzFdLCBhcHBlbmRpbmcgbmV3XG4gKiB2YWx1ZXMgYWZ0ZXIgcHJldmlvdXMgdmFsdWVzLCBzaW1pbGFyIHRvIHRoZSBidWlsdC1pbiBzdXBwb3J0IGZvciBpdGVyYWJsZXMuXG4gKiBUaGlzIGRpcmVjdGl2ZSBpcyB1c2FibGUgb25seSBpbiBjaGlsZCBleHByZXNzaW9ucy5cbiAqXG4gKiBBc3luYyBpdGVyYWJsZXMgYXJlIG9iamVjdHMgd2l0aCBhIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gbWV0aG9kLCB3aGljaFxuICogcmV0dXJucyBhbiBpdGVyYXRvciB3aG8ncyBgbmV4dCgpYCBtZXRob2QgcmV0dXJucyBhIFByb21pc2UuIFdoZW4gYSBuZXdcbiAqIHZhbHVlIGlzIGF2YWlsYWJsZSwgdGhlIFByb21pc2UgcmVzb2x2ZXMgYW5kIHRoZSB2YWx1ZSBpcyBhcHBlbmRlZCB0byB0aGVcbiAqIFBhcnQgY29udHJvbGxlZCBieSB0aGUgZGlyZWN0aXZlLiBJZiBhbm90aGVyIHZhbHVlIG90aGVyIHRoYW4gdGhpc1xuICogZGlyZWN0aXZlIGhhcyBiZWVuIHNldCBvbiB0aGUgUGFydCwgdGhlIGl0ZXJhYmxlIHdpbGwgbm8gbG9uZ2VyIGJlIGxpc3RlbmVkXG4gKiB0byBhbmQgbmV3IHZhbHVlcyB3b24ndCBiZSB3cml0dGVuIHRvIHRoZSBQYXJ0LlxuICpcbiAqIFsxXTogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvU3RhdGVtZW50cy9mb3ItYXdhaXQuLi5vZlxuICpcbiAqIEBwYXJhbSB2YWx1ZSBBbiBhc3luYyBpdGVyYWJsZVxuICogQHBhcmFtIG1hcHBlciBBbiBvcHRpb25hbCBmdW5jdGlvbiB0aGF0IG1hcHMgZnJvbSAodmFsdWUsIGluZGV4KSB0byBhbm90aGVyXG4gKiAgICAgdmFsdWUuIFVzZWZ1bCBmb3IgZ2VuZXJhdGluZyB0ZW1wbGF0ZXMgZm9yIGVhY2ggaXRlbSBpbiB0aGUgaXRlcmFibGUuXG4gKi9cbmV4cG9ydCBjb25zdCBhc3luY0FwcGVuZCA9IGRpcmVjdGl2ZShBc3luY0FwcGVuZERpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7QXN5bmNBcHBlbmREaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7XG4gIFRlbXBsYXRlUmVzdWx0LFxuICBDaGlsZFBhcnQsXG4gIFJvb3RQYXJ0LFxuICByZW5kZXIsXG4gIG5vdGhpbmcsXG4gIENvbXBpbGVkVGVtcGxhdGVSZXN1bHQsXG59IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7XG4gIGRpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlLFxuICBEaXJlY3RpdmVQYXJhbWV0ZXJzLFxuICBQYXJ0SW5mbyxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7XG4gIGNsZWFyUGFydCxcbiAgZ2V0Q29tbWl0dGVkVmFsdWUsXG4gIGluc2VydFBhcnQsXG4gIGlzQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdCxcbiAgaXNUZW1wbGF0ZVJlc3VsdCxcbiAgc2V0Q29tbWl0dGVkVmFsdWUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcblxuLyoqXG4gKiBUaGUgdGVtcGxhdGUgc3RyaW5ncyBhcnJheSBjb250ZW50cyBhcmUgbm90IGNvbXBhdGlibGUgYmV0d2VlbiB0aGUgdHdvXG4gKiB0ZW1wbGF0ZSByZXN1bHQgdHlwZXMgYXMgdGhlIGNvbXBpbGVkIHRlbXBsYXRlIGNvbnRhaW5zIGEgcHJlcGFyZWQgc3RyaW5nO1xuICogb25seSB1c2UgdGhlIHJldHVybmVkIHRlbXBsYXRlIHN0cmluZ3MgYXJyYXkgYXMgYSBjYWNoZSBrZXkuXG4gKi9cbmNvbnN0IGdldFN0cmluZ3NGcm9tVGVtcGxhdGVSZXN1bHQgPSAoXG4gIHJlc3VsdDogVGVtcGxhdGVSZXN1bHQgfCBDb21waWxlZFRlbXBsYXRlUmVzdWx0XG4pOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSA9PlxuICBpc0NvbXBpbGVkVGVtcGxhdGVSZXN1bHQocmVzdWx0KSA/IHJlc3VsdFsnXyRsaXRUeXBlJCddLmggOiByZXN1bHQuc3RyaW5ncztcblxuY2xhc3MgQ2FjaGVEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBwcml2YXRlIF90ZW1wbGF0ZUNhY2hlID0gbmV3IFdlYWtNYXA8VGVtcGxhdGVTdHJpbmdzQXJyYXksIFJvb3RQYXJ0PigpO1xuICBwcml2YXRlIF92YWx1ZT86IFRlbXBsYXRlUmVzdWx0IHwgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdDtcblxuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gIH1cblxuICByZW5kZXIodjogdW5rbm93bikge1xuICAgIC8vIFJldHVybiBhbiBhcnJheSBvZiB0aGUgdmFsdWUgdG8gaW5kdWNlIGxpdC1odG1sIHRvIGNyZWF0ZSBhIENoaWxkUGFydFxuICAgIC8vIGZvciB0aGUgdmFsdWUgdGhhdCB3ZSBjYW4gbW92ZSBpbnRvIHRoZSBjYWNoZS5cbiAgICByZXR1cm4gW3ZdO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKGNvbnRhaW5lclBhcnQ6IENoaWxkUGFydCwgW3ZdOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgY29uc3QgX3ZhbHVlS2V5ID0gaXNUZW1wbGF0ZVJlc3VsdCh0aGlzLl92YWx1ZSlcbiAgICAgID8gZ2V0U3RyaW5nc0Zyb21UZW1wbGF0ZVJlc3VsdCh0aGlzLl92YWx1ZSlcbiAgICAgIDogbnVsbDtcbiAgICBjb25zdCB2S2V5ID0gaXNUZW1wbGF0ZVJlc3VsdCh2KSA/IGdldFN0cmluZ3NGcm9tVGVtcGxhdGVSZXN1bHQodikgOiBudWxsO1xuXG4gICAgLy8gSWYgdGhlIHByZXZpb3VzIHZhbHVlIGlzIGEgVGVtcGxhdGVSZXN1bHQgYW5kIHRoZSBuZXcgdmFsdWUgaXMgbm90LFxuICAgIC8vIG9yIGlzIGEgZGlmZmVyZW50IFRlbXBsYXRlIGFzIHRoZSBwcmV2aW91cyB2YWx1ZSwgbW92ZSB0aGUgY2hpbGQgcGFydFxuICAgIC8vIGludG8gdGhlIGNhY2hlLlxuICAgIGlmIChfdmFsdWVLZXkgIT09IG51bGwgJiYgKHZLZXkgPT09IG51bGwgfHwgX3ZhbHVlS2V5ICE9PSB2S2V5KSkge1xuICAgICAgLy8gVGhpcyBpcyBhbHdheXMgYW4gYXJyYXkgYmVjYXVzZSB3ZSByZXR1cm4gW3ZdIGluIHJlbmRlcigpXG4gICAgICBjb25zdCBwYXJ0VmFsdWUgPSBnZXRDb21taXR0ZWRWYWx1ZShjb250YWluZXJQYXJ0KSBhcyBBcnJheTxDaGlsZFBhcnQ+O1xuICAgICAgY29uc3QgY2hpbGRQYXJ0ID0gcGFydFZhbHVlLnBvcCgpITtcbiAgICAgIGxldCBjYWNoZWRDb250YWluZXJQYXJ0ID0gdGhpcy5fdGVtcGxhdGVDYWNoZS5nZXQoX3ZhbHVlS2V5KTtcbiAgICAgIGlmIChjYWNoZWRDb250YWluZXJQYXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3QgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIGNhY2hlZENvbnRhaW5lclBhcnQgPSByZW5kZXIobm90aGluZywgZnJhZ21lbnQpO1xuICAgICAgICBjYWNoZWRDb250YWluZXJQYXJ0LnNldENvbm5lY3RlZChmYWxzZSk7XG4gICAgICAgIHRoaXMuX3RlbXBsYXRlQ2FjaGUuc2V0KF92YWx1ZUtleSwgY2FjaGVkQ29udGFpbmVyUGFydCk7XG4gICAgICB9XG4gICAgICAvLyBNb3ZlIGludG8gY2FjaGVcbiAgICAgIHNldENvbW1pdHRlZFZhbHVlKGNhY2hlZENvbnRhaW5lclBhcnQsIFtjaGlsZFBhcnRdKTtcbiAgICAgIGluc2VydFBhcnQoY2FjaGVkQ29udGFpbmVyUGFydCwgdW5kZWZpbmVkLCBjaGlsZFBhcnQpO1xuICAgIH1cbiAgICAvLyBJZiB0aGUgbmV3IHZhbHVlIGlzIGEgVGVtcGxhdGVSZXN1bHQgYW5kIHRoZSBwcmV2aW91cyB2YWx1ZSBpcyBub3QsXG4gICAgLy8gb3IgaXMgYSBkaWZmZXJlbnQgVGVtcGxhdGUgYXMgdGhlIHByZXZpb3VzIHZhbHVlLCByZXN0b3JlIHRoZSBjaGlsZFxuICAgIC8vIHBhcnQgZnJvbSB0aGUgY2FjaGUuXG4gICAgaWYgKHZLZXkgIT09IG51bGwpIHtcbiAgICAgIGlmIChfdmFsdWVLZXkgPT09IG51bGwgfHwgX3ZhbHVlS2V5ICE9PSB2S2V5KSB7XG4gICAgICAgIGNvbnN0IGNhY2hlZENvbnRhaW5lclBhcnQgPSB0aGlzLl90ZW1wbGF0ZUNhY2hlLmdldCh2S2V5KTtcbiAgICAgICAgaWYgKGNhY2hlZENvbnRhaW5lclBhcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhY2hlZCBwYXJ0IGJhY2sgaW50byB0aGUgY29udGFpbmVyIHBhcnQgdmFsdWVcbiAgICAgICAgICBjb25zdCBwYXJ0VmFsdWUgPSBnZXRDb21taXR0ZWRWYWx1ZShcbiAgICAgICAgICAgIGNhY2hlZENvbnRhaW5lclBhcnRcbiAgICAgICAgICApIGFzIEFycmF5PENoaWxkUGFydD47XG4gICAgICAgICAgY29uc3QgY2FjaGVkUGFydCA9IHBhcnRWYWx1ZS5wb3AoKSE7XG4gICAgICAgICAgLy8gTW92ZSBjYWNoZWQgcGFydCBiYWNrIGludG8gRE9NXG4gICAgICAgICAgY2xlYXJQYXJ0KGNvbnRhaW5lclBhcnQpO1xuICAgICAgICAgIGluc2VydFBhcnQoY29udGFpbmVyUGFydCwgdW5kZWZpbmVkLCBjYWNoZWRQYXJ0KTtcbiAgICAgICAgICBzZXRDb21taXR0ZWRWYWx1ZShjb250YWluZXJQYXJ0LCBbY2FjaGVkUGFydF0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBCZWNhdXNlIHZLZXkgaXMgbm9uIG51bGwsIHYgbXVzdCBiZSBhIFRlbXBsYXRlUmVzdWx0LlxuICAgICAgdGhpcy5fdmFsdWUgPSB2IGFzIFRlbXBsYXRlUmVzdWx0IHwgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fdmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlbmRlcih2KTtcbiAgfVxufVxuXG4vKipcbiAqIEVuYWJsZXMgZmFzdCBzd2l0Y2hpbmcgYmV0d2VlbiBtdWx0aXBsZSB0ZW1wbGF0ZXMgYnkgY2FjaGluZyB0aGUgRE9NIG5vZGVzXG4gKiBhbmQgVGVtcGxhdGVJbnN0YW5jZXMgcHJvZHVjZWQgYnkgdGhlIHRlbXBsYXRlcy5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBsZXQgY2hlY2tlZCA9IGZhbHNlO1xuICpcbiAqIGh0bWxgXG4gKiAgICR7Y2FjaGUoY2hlY2tlZCA/IGh0bWxgaW5wdXQgaXMgY2hlY2tlZGAgOiBodG1sYGlucHV0IGlzIG5vdCBjaGVja2VkYCl9XG4gKiBgXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGNhY2hlID0gZGlyZWN0aXZlKENhY2hlRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtDYWNoZURpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLyoqXG4gKiBDaG9vc2VzIGFuZCBldmFsdWF0ZXMgYSB0ZW1wbGF0ZSBmdW5jdGlvbiBmcm9tIGEgbGlzdCBiYXNlZCBvbiBtYXRjaGluZ1xuICogdGhlIGdpdmVuIGB2YWx1ZWAgdG8gYSBjYXNlLlxuICpcbiAqIENhc2VzIGFyZSBzdHJ1Y3R1cmVkIGFzIGBbY2FzZVZhbHVlLCBmdW5jXWAuIGB2YWx1ZWAgaXMgbWF0Y2hlZCB0b1xuICogYGNhc2VWYWx1ZWAgYnkgc3RyaWN0IGVxdWFsaXR5LiBUaGUgZmlyc3QgbWF0Y2ggaXMgc2VsZWN0ZWQuIENhc2UgdmFsdWVzXG4gKiBjYW4gYmUgb2YgYW55IHR5cGUgaW5jbHVkaW5nIHByaW1pdGl2ZXMsIG9iamVjdHMsIGFuZCBzeW1ib2xzLlxuICpcbiAqIFRoaXMgaXMgc2ltaWxhciB0byBhIHN3aXRjaCBzdGF0ZW1lbnQsIGJ1dCBhcyBhbiBleHByZXNzaW9uIGFuZCB3aXRob3V0XG4gKiBmYWxsdGhyb3VnaC5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiByZW5kZXIoKSB7XG4gKiAgIHJldHVybiBodG1sYFxuICogICAgICR7Y2hvb3NlKHRoaXMuc2VjdGlvbiwgW1xuICogICAgICAgWydob21lJywgKCkgPT4gaHRtbGA8aDE+SG9tZTwvaDE+YF0sXG4gKiAgICAgICBbJ2Fib3V0JywgKCkgPT4gaHRtbGA8aDE+QWJvdXQ8L2gxPmBdXG4gKiAgICAgXSxcbiAqICAgICAoKSA9PiBodG1sYDxoMT5FcnJvcjwvaDE+YCl9XG4gKiAgIGA7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGNob29zZSA9IDxULCBWLCBLIGV4dGVuZHMgVCA9IFQ+KFxuICB2YWx1ZTogVCxcbiAgY2FzZXM6IEFycmF5PFtLLCAoKSA9PiBWXT4sXG4gIGRlZmF1bHRDYXNlPzogKCkgPT4gVlxuKSA9PiB7XG4gIGZvciAoY29uc3QgYyBvZiBjYXNlcykge1xuICAgIGNvbnN0IGNhc2VWYWx1ZSA9IGNbMF07XG4gICAgaWYgKGNhc2VWYWx1ZSA9PT0gdmFsdWUpIHtcbiAgICAgIGNvbnN0IGZuID0gY1sxXTtcbiAgICAgIHJldHVybiBmbigpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVmYXVsdENhc2U/LigpO1xufTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0F0dHJpYnV0ZVBhcnQsIG5vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBkaXJlY3RpdmUsXG4gIERpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbiAgUGFydEluZm8sXG4gIFBhcnRUeXBlLFxufSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuXG4vKipcbiAqIEEga2V5LXZhbHVlIHNldCBvZiBjbGFzcyBuYW1lcyB0byB0cnV0aHkgdmFsdWVzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENsYXNzSW5mbyB7XG4gIHJlYWRvbmx5IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfCBib29sZWFuIHwgbnVtYmVyO1xufVxuXG5jbGFzcyBDbGFzc01hcERpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIC8qKlxuICAgKiBTdG9yZXMgdGhlIENsYXNzSW5mbyBvYmplY3QgYXBwbGllZCB0byBhIGdpdmVuIEF0dHJpYnV0ZVBhcnQuXG4gICAqIFVzZWQgdG8gdW5zZXQgZXhpc3RpbmcgdmFsdWVzIHdoZW4gYSBuZXcgQ2xhc3NJbmZvIG9iamVjdCBpcyBhcHBsaWVkLlxuICAgKi9cbiAgcHJpdmF0ZSBfcHJldmlvdXNDbGFzc2VzPzogU2V0PHN0cmluZz47XG4gIHByaXZhdGUgX3N0YXRpY0NsYXNzZXM/OiBTZXQ8c3RyaW5nPjtcblxuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gICAgaWYgKFxuICAgICAgcGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQVRUUklCVVRFIHx8XG4gICAgICBwYXJ0SW5mby5uYW1lICE9PSAnY2xhc3MnIHx8XG4gICAgICAocGFydEluZm8uc3RyaW5ncz8ubGVuZ3RoIGFzIG51bWJlcikgPiAyXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdgY2xhc3NNYXAoKWAgY2FuIG9ubHkgYmUgdXNlZCBpbiB0aGUgYGNsYXNzYCBhdHRyaWJ1dGUgJyArXG4gICAgICAgICAgJ2FuZCBtdXN0IGJlIHRoZSBvbmx5IHBhcnQgaW4gdGhlIGF0dHJpYnV0ZS4nXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlcihjbGFzc0luZm86IENsYXNzSW5mbykge1xuICAgIC8vIEFkZCBzcGFjZXMgdG8gZW5zdXJlIHNlcGFyYXRpb24gZnJvbSBzdGF0aWMgY2xhc3Nlc1xuICAgIHJldHVybiAoXG4gICAgICAnICcgK1xuICAgICAgT2JqZWN0LmtleXMoY2xhc3NJbmZvKVxuICAgICAgICAuZmlsdGVyKChrZXkpID0+IGNsYXNzSW5mb1trZXldKVxuICAgICAgICAuam9pbignICcpICtcbiAgICAgICcgJ1xuICAgICk7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUocGFydDogQXR0cmlidXRlUGFydCwgW2NsYXNzSW5mb106IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICAvLyBSZW1lbWJlciBkeW5hbWljIGNsYXNzZXMgb24gdGhlIGZpcnN0IHJlbmRlclxuICAgIGlmICh0aGlzLl9wcmV2aW91c0NsYXNzZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fcHJldmlvdXNDbGFzc2VzID0gbmV3IFNldCgpO1xuICAgICAgaWYgKHBhcnQuc3RyaW5ncyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX3N0YXRpY0NsYXNzZXMgPSBuZXcgU2V0KFxuICAgICAgICAgIHBhcnQuc3RyaW5nc1xuICAgICAgICAgICAgLmpvaW4oJyAnKVxuICAgICAgICAgICAgLnNwbGl0KC9cXHMvKVxuICAgICAgICAgICAgLmZpbHRlcigocykgPT4gcyAhPT0gJycpXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IG5hbWUgaW4gY2xhc3NJbmZvKSB7XG4gICAgICAgIGlmIChjbGFzc0luZm9bbmFtZV0gJiYgIXRoaXMuX3N0YXRpY0NsYXNzZXM/LmhhcyhuYW1lKSkge1xuICAgICAgICAgIHRoaXMuX3ByZXZpb3VzQ2xhc3Nlcy5hZGQobmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnJlbmRlcihjbGFzc0luZm8pO1xuICAgIH1cblxuICAgIGNvbnN0IGNsYXNzTGlzdCA9IHBhcnQuZWxlbWVudC5jbGFzc0xpc3Q7XG5cbiAgICAvLyBSZW1vdmUgb2xkIGNsYXNzZXMgdGhhdCBubyBsb25nZXIgYXBwbHlcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgdGhpcy5fcHJldmlvdXNDbGFzc2VzKSB7XG4gICAgICBpZiAoIShuYW1lIGluIGNsYXNzSW5mbykpIHtcbiAgICAgICAgY2xhc3NMaXN0LnJlbW92ZShuYW1lKTtcbiAgICAgICAgdGhpcy5fcHJldmlvdXNDbGFzc2VzIS5kZWxldGUobmFtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWRkIG9yIHJlbW92ZSBjbGFzc2VzIGJhc2VkIG9uIHRoZWlyIGNsYXNzTWFwIHZhbHVlXG4gICAgZm9yIChjb25zdCBuYW1lIGluIGNsYXNzSW5mbykge1xuICAgICAgLy8gV2UgZXhwbGljaXRseSB3YW50IGEgbG9vc2UgdHJ1dGh5IGNoZWNrIG9mIGB2YWx1ZWAgYmVjYXVzZSBpdCBzZWVtc1xuICAgICAgLy8gbW9yZSBjb252ZW5pZW50IHRoYXQgJycgYW5kIDAgYXJlIHNraXBwZWQuXG4gICAgICBjb25zdCB2YWx1ZSA9ICEhY2xhc3NJbmZvW25hbWVdO1xuICAgICAgaWYgKFxuICAgICAgICB2YWx1ZSAhPT0gdGhpcy5fcHJldmlvdXNDbGFzc2VzLmhhcyhuYW1lKSAmJlxuICAgICAgICAhdGhpcy5fc3RhdGljQ2xhc3Nlcz8uaGFzKG5hbWUpXG4gICAgICApIHtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgY2xhc3NMaXN0LmFkZChuYW1lKTtcbiAgICAgICAgICB0aGlzLl9wcmV2aW91c0NsYXNzZXMuYWRkKG5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgICAgICAgdGhpcy5fcHJldmlvdXNDbGFzc2VzLmRlbGV0ZShuYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGRpcmVjdGl2ZSB0aGF0IGFwcGxpZXMgZHluYW1pYyBDU1MgY2xhc3Nlcy5cbiAqXG4gKiBUaGlzIG11c3QgYmUgdXNlZCBpbiB0aGUgYGNsYXNzYCBhdHRyaWJ1dGUgYW5kIG11c3QgYmUgdGhlIG9ubHkgcGFydCB1c2VkIGluXG4gKiB0aGUgYXR0cmlidXRlLiBJdCB0YWtlcyBlYWNoIHByb3BlcnR5IGluIHRoZSBgY2xhc3NJbmZvYCBhcmd1bWVudCBhbmQgYWRkc1xuICogdGhlIHByb3BlcnR5IG5hbWUgdG8gdGhlIGVsZW1lbnQncyBgY2xhc3NMaXN0YCBpZiB0aGUgcHJvcGVydHkgdmFsdWUgaXNcbiAqIHRydXRoeTsgaWYgdGhlIHByb3BlcnR5IHZhbHVlIGlzIGZhbHNleSwgdGhlIHByb3BlcnR5IG5hbWUgaXMgcmVtb3ZlZCBmcm9tXG4gKiB0aGUgZWxlbWVudCdzIGBjbGFzc2AuXG4gKlxuICogRm9yIGV4YW1wbGUgYHtmb286IGJhcn1gIGFwcGxpZXMgdGhlIGNsYXNzIGBmb29gIGlmIHRoZSB2YWx1ZSBvZiBgYmFyYCBpc1xuICogdHJ1dGh5LlxuICpcbiAqIEBwYXJhbSBjbGFzc0luZm9cbiAqL1xuZXhwb3J0IGNvbnN0IGNsYXNzTWFwID0gZGlyZWN0aXZlKENsYXNzTWFwRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtDbGFzc01hcERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtub0NoYW5nZSwgUGFydH0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIERpcmVjdGl2ZSwgRGlyZWN0aXZlUGFyYW1ldGVyc30gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcblxuLy8gQSBzZW50aW5lbCB0aGF0IGluZGljYXRlcyBndWFyZCgpIGhhc24ndCByZW5kZXJlZCBhbnl0aGluZyB5ZXRcbmNvbnN0IGluaXRpYWxWYWx1ZSA9IHt9O1xuXG5jbGFzcyBHdWFyZERpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX3ByZXZpb3VzVmFsdWU6IHVua25vd24gPSBpbml0aWFsVmFsdWU7XG5cbiAgcmVuZGVyKF92YWx1ZTogdW5rbm93biwgZjogKCkgPT4gdW5rbm93bikge1xuICAgIHJldHVybiBmKCk7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUoX3BhcnQ6IFBhcnQsIFt2YWx1ZSwgZl06IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIC8vIERpcnR5LWNoZWNrIGFycmF5cyBieSBpdGVtXG4gICAgICBpZiAoXG4gICAgICAgIEFycmF5LmlzQXJyYXkodGhpcy5fcHJldmlvdXNWYWx1ZSkgJiZcbiAgICAgICAgdGhpcy5fcHJldmlvdXNWYWx1ZS5sZW5ndGggPT09IHZhbHVlLmxlbmd0aCAmJlxuICAgICAgICB2YWx1ZS5ldmVyeSgodiwgaSkgPT4gdiA9PT0gKHRoaXMuX3ByZXZpb3VzVmFsdWUgYXMgQXJyYXk8dW5rbm93bj4pW2ldKVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRoaXMuX3ByZXZpb3VzVmFsdWUgPT09IHZhbHVlKSB7XG4gICAgICAvLyBEaXJ0eS1jaGVjayBub24tYXJyYXlzIGJ5IGlkZW50aXR5XG4gICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgfVxuXG4gICAgLy8gQ29weSB0aGUgdmFsdWUgaWYgaXQncyBhbiBhcnJheSBzbyB0aGF0IGlmIGl0J3MgbXV0YXRlZCB3ZSBkb24ndCBmb3JnZXRcbiAgICAvLyB3aGF0IHRoZSBwcmV2aW91cyB2YWx1ZXMgd2VyZS5cbiAgICB0aGlzLl9wcmV2aW91c1ZhbHVlID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyBBcnJheS5mcm9tKHZhbHVlKSA6IHZhbHVlO1xuICAgIGNvbnN0IHIgPSB0aGlzLnJlbmRlcih2YWx1ZSwgZik7XG4gICAgcmV0dXJuIHI7XG4gIH1cbn1cblxuLyoqXG4gKiBQcmV2ZW50cyByZS1yZW5kZXIgb2YgYSB0ZW1wbGF0ZSBmdW5jdGlvbiB1bnRpbCBhIHNpbmdsZSB2YWx1ZSBvciBhbiBhcnJheSBvZlxuICogdmFsdWVzIGNoYW5nZXMuXG4gKlxuICogVmFsdWVzIGFyZSBjaGVja2VkIGFnYWluc3QgcHJldmlvdXMgdmFsdWVzIHdpdGggc3RyaWN0IGVxdWFsaXR5IChgPT09YCksIGFuZFxuICogc28gdGhlIGNoZWNrIHdvbid0IGRldGVjdCBuZXN0ZWQgcHJvcGVydHkgY2hhbmdlcyBpbnNpZGUgb2JqZWN0cyBvciBhcnJheXMuXG4gKiBBcnJheXMgdmFsdWVzIGhhdmUgZWFjaCBpdGVtIGNoZWNrZWQgYWdhaW5zdCB0aGUgcHJldmlvdXMgdmFsdWUgYXQgdGhlIHNhbWVcbiAqIGluZGV4IHdpdGggc3RyaWN0IGVxdWFsaXR5LiBOZXN0ZWQgYXJyYXlzIGFyZSBhbHNvIGNoZWNrZWQgb25seSBieSBzdHJpY3RcbiAqIGVxdWFsaXR5LlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogYGBganNcbiAqIGh0bWxgXG4gKiAgIDxkaXY+XG4gKiAgICAgJHtndWFyZChbdXNlci5pZCwgY29tcGFueS5pZF0sICgpID0+IGh0bWxgLi4uYCl9XG4gKiAgIDwvZGl2PlxuICogYFxuICogYGBgXG4gKlxuICogSW4gdGhpcyBjYXNlLCB0aGUgdGVtcGxhdGUgb25seSByZXJlbmRlcnMgaWYgZWl0aGVyIGB1c2VyLmlkYCBvciBgY29tcGFueS5pZGBcbiAqIGNoYW5nZXMuXG4gKlxuICogZ3VhcmQoKSBpcyB1c2VmdWwgd2l0aCBpbW11dGFibGUgZGF0YSBwYXR0ZXJucywgYnkgcHJldmVudGluZyBleHBlbnNpdmUgd29ya1xuICogdW50aWwgZGF0YSB1cGRhdGVzLlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogYGBganNcbiAqIGh0bWxgXG4gKiAgIDxkaXY+XG4gKiAgICAgJHtndWFyZChbaW1tdXRhYmxlSXRlbXNdLCAoKSA9PiBpbW11dGFibGVJdGVtcy5tYXAoaSA9PiBodG1sYCR7aX1gKSl9XG4gKiAgIDwvZGl2PlxuICogYFxuICogYGBgXG4gKlxuICogSW4gdGhpcyBjYXNlLCBpdGVtcyBhcmUgbWFwcGVkIG92ZXIgb25seSB3aGVuIHRoZSBhcnJheSByZWZlcmVuY2UgY2hhbmdlcy5cbiAqXG4gKiBAcGFyYW0gdmFsdWUgdGhlIHZhbHVlIHRvIGNoZWNrIGJlZm9yZSByZS1yZW5kZXJpbmdcbiAqIEBwYXJhbSBmIHRoZSB0ZW1wbGF0ZSBmdW5jdGlvblxuICovXG5leHBvcnQgY29uc3QgZ3VhcmQgPSBkaXJlY3RpdmUoR3VhcmREaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge0d1YXJkRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge25vdGhpbmd9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcblxuLyoqXG4gKiBGb3IgQXR0cmlidXRlUGFydHMsIHNldHMgdGhlIGF0dHJpYnV0ZSBpZiB0aGUgdmFsdWUgaXMgZGVmaW5lZCBhbmQgcmVtb3Zlc1xuICogdGhlIGF0dHJpYnV0ZSBpZiB0aGUgdmFsdWUgaXMgdW5kZWZpbmVkLlxuICpcbiAqIEZvciBvdGhlciBwYXJ0IHR5cGVzLCB0aGlzIGRpcmVjdGl2ZSBpcyBhIG5vLW9wLlxuICovXG5leHBvcnQgY29uc3QgaWZEZWZpbmVkID0gPFQ+KHZhbHVlOiBUKSA9PiB2YWx1ZSA/PyBub3RoaW5nO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjEgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbi8qKlxuICogUmV0dXJucyBhbiBpdGVyYWJsZSBjb250YWluaW5nIHRoZSB2YWx1ZXMgaW4gYGl0ZW1zYCBpbnRlcmxlYXZlZCB3aXRoIHRoZVxuICogYGpvaW5lcmAgdmFsdWUuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogcmVuZGVyKCkge1xuICogICByZXR1cm4gaHRtbGBcbiAqICAgICAke2pvaW4oaXRlbXMsIGh0bWxgPHNwYW4gY2xhc3M9XCJzZXBhcmF0b3JcIj58PC9zcGFuPmApfVxuICogICBgO1xuICogfVxuICovXG5leHBvcnQgZnVuY3Rpb24gam9pbjxJLCBKPihcbiAgaXRlbXM6IEl0ZXJhYmxlPEk+IHwgdW5kZWZpbmVkLFxuICBqb2luZXI6IChpbmRleDogbnVtYmVyKSA9PiBKXG4pOiBJdGVyYWJsZTxJIHwgSj47XG5leHBvcnQgZnVuY3Rpb24gam9pbjxJLCBKPihcbiAgaXRlbXM6IEl0ZXJhYmxlPEk+IHwgdW5kZWZpbmVkLFxuICBqb2luZXI6IEpcbik6IEl0ZXJhYmxlPEkgfCBKPjtcbmV4cG9ydCBmdW5jdGlvbiogam9pbjxJLCBKPihpdGVtczogSXRlcmFibGU8ST4gfCB1bmRlZmluZWQsIGpvaW5lcjogSikge1xuICBjb25zdCBpc0Z1bmN0aW9uID0gdHlwZW9mIGpvaW5lciA9PT0gJ2Z1bmN0aW9uJztcbiAgaWYgKGl0ZW1zICE9PSB1bmRlZmluZWQpIHtcbiAgICBsZXQgaSA9IC0xO1xuICAgIGZvciAoY29uc3QgdmFsdWUgb2YgaXRlbXMpIHtcbiAgICAgIGlmIChpID4gLTEpIHtcbiAgICAgICAgeWllbGQgaXNGdW5jdGlvbiA/IGpvaW5lcihpKSA6IGpvaW5lcjtcbiAgICAgIH1cbiAgICAgIGkrKztcbiAgICAgIHlpZWxkIHZhbHVlO1xuICAgIH1cbiAgfVxufVxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjEgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7bm90aGluZ30gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmUsXG4gIENoaWxkUGFydCxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7c2V0Q29tbWl0dGVkVmFsdWV9IGZyb20gJy4uL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcblxuY2xhc3MgS2V5ZWQgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBrZXk6IHVua25vd24gPSBub3RoaW5nO1xuXG4gIHJlbmRlcihrOiB1bmtub3duLCB2OiB1bmtub3duKSB7XG4gICAgdGhpcy5rZXkgPSBrO1xuICAgIHJldHVybiB2O1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IENoaWxkUGFydCwgW2ssIHZdOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgaWYgKGsgIT09IHRoaXMua2V5KSB7XG4gICAgICAvLyBDbGVhciB0aGUgcGFydCBiZWZvcmUgcmV0dXJuaW5nIGEgdmFsdWUuIFRoZSBvbmUtYXJnIGZvcm0gb2ZcbiAgICAgIC8vIHNldENvbW1pdHRlZFZhbHVlIHNldHMgdGhlIHZhbHVlIHRvIGEgc2VudGluZWwgd2hpY2ggZm9yY2VzIGFcbiAgICAgIC8vIGNvbW1pdCB0aGUgbmV4dCByZW5kZXIuXG4gICAgICBzZXRDb21taXR0ZWRWYWx1ZShwYXJ0KTtcbiAgICAgIHRoaXMua2V5ID0gaztcbiAgICB9XG4gICAgcmV0dXJuIHY7XG4gIH1cbn1cblxuLyoqXG4gKiBBc3NvY2lhdGVzIGEgcmVuZGVyYWJsZSB2YWx1ZSB3aXRoIGEgdW5pcXVlIGtleS4gV2hlbiB0aGUga2V5IGNoYW5nZXMsIHRoZVxuICogcHJldmlvdXMgRE9NIGlzIHJlbW92ZWQgYW5kIGRpc3Bvc2VkIGJlZm9yZSByZW5kZXJpbmcgdGhlIG5leHQgdmFsdWUsIGV2ZW5cbiAqIGlmIHRoZSB2YWx1ZSAtIHN1Y2ggYXMgYSB0ZW1wbGF0ZSAtIGlzIHRoZSBzYW1lLlxuICpcbiAqIFRoaXMgaXMgdXNlZnVsIGZvciBmb3JjaW5nIHJlLXJlbmRlcnMgb2Ygc3RhdGVmdWwgY29tcG9uZW50cywgb3Igd29ya2luZ1xuICogd2l0aCBjb2RlIHRoYXQgZXhwZWN0cyBuZXcgZGF0YSB0byBnZW5lcmF0ZSBuZXcgSFRNTCBlbGVtZW50cywgc3VjaCBhcyBzb21lXG4gKiBhbmltYXRpb24gdGVjaG5pcXVlcy5cbiAqL1xuZXhwb3J0IGNvbnN0IGtleWVkID0gZGlyZWN0aXZlKEtleWVkKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtLZXllZH07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtBdHRyaWJ1dGVQYXJ0LCBub0NoYW5nZSwgbm90aGluZ30gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmUsXG4gIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG4gIFBhcnRJbmZvLFxuICBQYXJ0VHlwZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7aXNTaW5nbGVFeHByZXNzaW9uLCBzZXRDb21taXR0ZWRWYWx1ZX0gZnJvbSAnLi4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuXG5jbGFzcyBMaXZlRGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICAgIGlmIChcbiAgICAgICEoXG4gICAgICAgIHBhcnRJbmZvLnR5cGUgPT09IFBhcnRUeXBlLlBST1BFUlRZIHx8XG4gICAgICAgIHBhcnRJbmZvLnR5cGUgPT09IFBhcnRUeXBlLkFUVFJJQlVURSB8fFxuICAgICAgICBwYXJ0SW5mby50eXBlID09PSBQYXJ0VHlwZS5CT09MRUFOX0FUVFJJQlVURVxuICAgICAgKVxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnVGhlIGBsaXZlYCBkaXJlY3RpdmUgaXMgbm90IGFsbG93ZWQgb24gY2hpbGQgb3IgZXZlbnQgYmluZGluZ3MnXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAoIWlzU2luZ2xlRXhwcmVzc2lvbihwYXJ0SW5mbykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignYGxpdmVgIGJpbmRpbmdzIGNhbiBvbmx5IGNvbnRhaW4gYSBzaW5nbGUgZXhwcmVzc2lvbicpO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlcih2YWx1ZTogdW5rbm93bikge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShwYXJ0OiBBdHRyaWJ1dGVQYXJ0LCBbdmFsdWVdOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgaWYgKHZhbHVlID09PSBub0NoYW5nZSB8fCB2YWx1ZSA9PT0gbm90aGluZykge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBjb25zdCBlbGVtZW50ID0gcGFydC5lbGVtZW50O1xuICAgIGNvbnN0IG5hbWUgPSBwYXJ0Lm5hbWU7XG5cbiAgICBpZiAocGFydC50eXBlID09PSBQYXJ0VHlwZS5QUk9QRVJUWSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgIGlmICh2YWx1ZSA9PT0gKGVsZW1lbnQgYXMgYW55KVtuYW1lXSkge1xuICAgICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChwYXJ0LnR5cGUgPT09IFBhcnRUeXBlLkJPT0xFQU5fQVRUUklCVVRFKSB7XG4gICAgICBpZiAoISF2YWx1ZSA9PT0gZWxlbWVudC5oYXNBdHRyaWJ1dGUobmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIG5vQ2hhbmdlO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocGFydC50eXBlID09PSBQYXJ0VHlwZS5BVFRSSUJVVEUpIHtcbiAgICAgIGlmIChlbGVtZW50LmdldEF0dHJpYnV0ZShuYW1lKSA9PT0gU3RyaW5nKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFJlc2V0cyB0aGUgcGFydCdzIHZhbHVlLCBjYXVzaW5nIGl0cyBkaXJ0eS1jaGVjayB0byBmYWlsIHNvIHRoYXQgaXRcbiAgICAvLyBhbHdheXMgc2V0cyB0aGUgdmFsdWUuXG4gICAgc2V0Q29tbWl0dGVkVmFsdWUocGFydCk7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG59XG5cbi8qKlxuICogQ2hlY2tzIGJpbmRpbmcgdmFsdWVzIGFnYWluc3QgbGl2ZSBET00gdmFsdWVzLCBpbnN0ZWFkIG9mIHByZXZpb3VzbHkgYm91bmRcbiAqIHZhbHVlcywgd2hlbiBkZXRlcm1pbmluZyB3aGV0aGVyIHRvIHVwZGF0ZSB0aGUgdmFsdWUuXG4gKlxuICogVGhpcyBpcyB1c2VmdWwgZm9yIGNhc2VzIHdoZXJlIHRoZSBET00gdmFsdWUgbWF5IGNoYW5nZSBmcm9tIG91dHNpZGUgb2ZcbiAqIGxpdC1odG1sLCBzdWNoIGFzIHdpdGggYSBiaW5kaW5nIHRvIGFuIGA8aW5wdXQ+YCBlbGVtZW50J3MgYHZhbHVlYCBwcm9wZXJ0eSxcbiAqIGEgY29udGVudCBlZGl0YWJsZSBlbGVtZW50cyB0ZXh0LCBvciB0byBhIGN1c3RvbSBlbGVtZW50IHRoYXQgY2hhbmdlcyBpdCdzXG4gKiBvd24gcHJvcGVydGllcyBvciBhdHRyaWJ1dGVzLlxuICpcbiAqIEluIHRoZXNlIGNhc2VzIGlmIHRoZSBET00gdmFsdWUgY2hhbmdlcywgYnV0IHRoZSB2YWx1ZSBzZXQgdGhyb3VnaCBsaXQtaHRtbFxuICogYmluZGluZ3MgaGFzbid0LCBsaXQtaHRtbCB3b24ndCBrbm93IHRvIHVwZGF0ZSB0aGUgRE9NIHZhbHVlIGFuZCB3aWxsIGxlYXZlXG4gKiBpdCBhbG9uZS4gSWYgdGhpcyBpcyBub3Qgd2hhdCB5b3Ugd2FudC0taWYgeW91IHdhbnQgdG8gb3ZlcndyaXRlIHRoZSBET01cbiAqIHZhbHVlIHdpdGggdGhlIGJvdW5kIHZhbHVlIG5vIG1hdHRlciB3aGF0LS11c2UgdGhlIGBsaXZlKClgIGRpcmVjdGl2ZTpcbiAqXG4gKiBgYGBqc1xuICogaHRtbGA8aW5wdXQgLnZhbHVlPSR7bGl2ZSh4KX0+YFxuICogYGBgXG4gKlxuICogYGxpdmUoKWAgcGVyZm9ybXMgYSBzdHJpY3QgZXF1YWxpdHkgY2hlY2sgYWdhaW5zdCB0aGUgbGl2ZSBET00gdmFsdWUsIGFuZCBpZlxuICogdGhlIG5ldyB2YWx1ZSBpcyBlcXVhbCB0byB0aGUgbGl2ZSB2YWx1ZSwgZG9lcyBub3RoaW5nLiBUaGlzIG1lYW5zIHRoYXRcbiAqIGBsaXZlKClgIHNob3VsZCBub3QgYmUgdXNlZCB3aGVuIHRoZSBiaW5kaW5nIHdpbGwgY2F1c2UgYSB0eXBlIGNvbnZlcnNpb24uIElmXG4gKiB5b3UgdXNlIGBsaXZlKClgIHdpdGggYW4gYXR0cmlidXRlIGJpbmRpbmcsIG1ha2Ugc3VyZSB0aGF0IG9ubHkgc3RyaW5ncyBhcmVcbiAqIHBhc3NlZCBpbiwgb3IgdGhlIGJpbmRpbmcgd2lsbCB1cGRhdGUgZXZlcnkgcmVuZGVyLlxuICovXG5leHBvcnQgY29uc3QgbGl2ZSA9IGRpcmVjdGl2ZShMaXZlRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtMaXZlRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIxIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG4vKipcbiAqIFJldHVybnMgYW4gaXRlcmFibGUgY29udGFpbmluZyB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgYGYodmFsdWUpYCBvbiBlYWNoXG4gKiB2YWx1ZSBpbiBgaXRlbXNgLlxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogYGBgdHNcbiAqIHJlbmRlcigpIHtcbiAqICAgcmV0dXJuIGh0bWxgXG4gKiAgICAgPHVsPlxuICogICAgICAgJHttYXAoaXRlbXMsIChpKSA9PiBodG1sYDxsaT4ke2l9PC9saT5gKX1cbiAqICAgICA8L3VsPlxuICogICBgO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiogbWFwPFQ+KFxuICBpdGVtczogSXRlcmFibGU8VD4gfCB1bmRlZmluZWQsXG4gIGY6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlcikgPT4gdW5rbm93blxuKSB7XG4gIGlmIChpdGVtcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgbGV0IGkgPSAwO1xuICAgIGZvciAoY29uc3QgdmFsdWUgb2YgaXRlbXMpIHtcbiAgICAgIHlpZWxkIGYodmFsdWUsIGkrKyk7XG4gICAgfVxuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLyoqXG4gKiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIGludGVnZXJzIGZyb20gYHN0YXJ0YCB0byBgZW5kYCAoZXhjbHVzaXZlKVxuICogaW5jcmVtZW50aW5nIGJ5IGBzdGVwYC5cbiAqXG4gKiBJZiBgc3RhcnRgIGlzIG9taXR0ZWQsIHRoZSByYW5nZSBzdGFydHMgYXQgYDBgLiBgc3RlcGAgZGVmYXVsdHMgdG8gYDFgLlxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogYGBgdHNcbiAqIHJlbmRlcigpIHtcbiAqICAgcmV0dXJuIGh0bWxgXG4gKiAgICAgJHttYXAocmFuZ2UoOCksICgpID0+IGh0bWxgPGRpdiBjbGFzcz1cImNlbGxcIj48L2Rpdj5gKX1cbiAqICAgYDtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZ2UoZW5kOiBudW1iZXIpOiBJdGVyYWJsZTxudW1iZXI+O1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmdlKFxuICBzdGFydDogbnVtYmVyLFxuICBlbmQ6IG51bWJlcixcbiAgc3RlcD86IG51bWJlclxuKTogSXRlcmFibGU8bnVtYmVyPjtcbmV4cG9ydCBmdW5jdGlvbiogcmFuZ2Uoc3RhcnRPckVuZDogbnVtYmVyLCBlbmQ/OiBudW1iZXIsIHN0ZXAgPSAxKSB7XG4gIGNvbnN0IHN0YXJ0ID0gZW5kID09PSB1bmRlZmluZWQgPyAwIDogc3RhcnRPckVuZDtcbiAgZW5kID8/PSBzdGFydE9yRW5kO1xuICBmb3IgKGxldCBpID0gc3RhcnQ7IHN0ZXAgPiAwID8gaSA8IGVuZCA6IGVuZCA8IGk7IGkgKz0gc3RlcCkge1xuICAgIHlpZWxkIGk7XG4gIH1cbn1cbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0NoaWxkUGFydCwgbm9DaGFuZ2V9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7ZGlyZWN0aXZlLCBEaXJlY3RpdmUsIFBhcnRJbmZvLCBQYXJ0VHlwZX0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7XG4gIGluc2VydFBhcnQsXG4gIGdldENvbW1pdHRlZFZhbHVlLFxuICByZW1vdmVQYXJ0LFxuICBzZXRDb21taXR0ZWRWYWx1ZSxcbiAgc2V0Q2hpbGRQYXJ0VmFsdWUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcblxuZXhwb3J0IHR5cGUgS2V5Rm48VD4gPSAoaXRlbTogVCwgaW5kZXg6IG51bWJlcikgPT4gdW5rbm93bjtcbmV4cG9ydCB0eXBlIEl0ZW1UZW1wbGF0ZTxUPiA9IChpdGVtOiBULCBpbmRleDogbnVtYmVyKSA9PiB1bmtub3duO1xuXG4vLyBIZWxwZXIgZm9yIGdlbmVyYXRpbmcgYSBtYXAgb2YgYXJyYXkgaXRlbSB0byBpdHMgaW5kZXggb3ZlciBhIHN1YnNldFxuLy8gb2YgYW4gYXJyYXkgKHVzZWQgdG8gbGF6aWx5IGdlbmVyYXRlIGBuZXdLZXlUb0luZGV4TWFwYCBhbmRcbi8vIGBvbGRLZXlUb0luZGV4TWFwYClcbmNvbnN0IGdlbmVyYXRlTWFwID0gKGxpc3Q6IHVua25vd25bXSwgc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIpID0+IHtcbiAgY29uc3QgbWFwID0gbmV3IE1hcDx1bmtub3duLCBudW1iZXI+KCk7XG4gIGZvciAobGV0IGkgPSBzdGFydDsgaSA8PSBlbmQ7IGkrKykge1xuICAgIG1hcC5zZXQobGlzdFtpXSwgaSk7XG4gIH1cbiAgcmV0dXJuIG1hcDtcbn07XG5cbmNsYXNzIFJlcGVhdERpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX2l0ZW1LZXlzPzogdW5rbm93bltdO1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAocGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQ0hJTEQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncmVwZWF0KCkgY2FuIG9ubHkgYmUgdXNlZCBpbiB0ZXh0IGV4cHJlc3Npb25zJyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfZ2V0VmFsdWVzQW5kS2V5czxUPihcbiAgICBpdGVtczogSXRlcmFibGU8VD4sXG4gICAga2V5Rm5PclRlbXBsYXRlOiBLZXlGbjxUPiB8IEl0ZW1UZW1wbGF0ZTxUPixcbiAgICB0ZW1wbGF0ZT86IEl0ZW1UZW1wbGF0ZTxUPlxuICApIHtcbiAgICBsZXQga2V5Rm46IEtleUZuPFQ+IHwgdW5kZWZpbmVkO1xuICAgIGlmICh0ZW1wbGF0ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0ZW1wbGF0ZSA9IGtleUZuT3JUZW1wbGF0ZTtcbiAgICB9IGVsc2UgaWYgKGtleUZuT3JUZW1wbGF0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBrZXlGbiA9IGtleUZuT3JUZW1wbGF0ZSBhcyBLZXlGbjxUPjtcbiAgICB9XG4gICAgY29uc3Qga2V5cyA9IFtdO1xuICAgIGNvbnN0IHZhbHVlcyA9IFtdO1xuICAgIGxldCBpbmRleCA9IDA7XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgICBrZXlzW2luZGV4XSA9IGtleUZuID8ga2V5Rm4oaXRlbSwgaW5kZXgpIDogaW5kZXg7XG4gICAgICB2YWx1ZXNbaW5kZXhdID0gdGVtcGxhdGUhKGl0ZW0sIGluZGV4KTtcbiAgICAgIGluZGV4Kys7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB2YWx1ZXMsXG4gICAgICBrZXlzLFxuICAgIH07XG4gIH1cblxuICByZW5kZXI8VD4oaXRlbXM6IEl0ZXJhYmxlPFQ+LCB0ZW1wbGF0ZTogSXRlbVRlbXBsYXRlPFQ+KTogQXJyYXk8dW5rbm93bj47XG4gIHJlbmRlcjxUPihcbiAgICBpdGVtczogSXRlcmFibGU8VD4sXG4gICAga2V5Rm46IEtleUZuPFQ+IHwgSXRlbVRlbXBsYXRlPFQ+LFxuICAgIHRlbXBsYXRlOiBJdGVtVGVtcGxhdGU8VD5cbiAgKTogQXJyYXk8dW5rbm93bj47XG4gIHJlbmRlcjxUPihcbiAgICBpdGVtczogSXRlcmFibGU8VD4sXG4gICAga2V5Rm5PclRlbXBsYXRlOiBLZXlGbjxUPiB8IEl0ZW1UZW1wbGF0ZTxUPixcbiAgICB0ZW1wbGF0ZT86IEl0ZW1UZW1wbGF0ZTxUPlxuICApIHtcbiAgICByZXR1cm4gdGhpcy5fZ2V0VmFsdWVzQW5kS2V5cyhpdGVtcywga2V5Rm5PclRlbXBsYXRlLCB0ZW1wbGF0ZSkudmFsdWVzO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlPFQ+KFxuICAgIGNvbnRhaW5lclBhcnQ6IENoaWxkUGFydCxcbiAgICBbaXRlbXMsIGtleUZuT3JUZW1wbGF0ZSwgdGVtcGxhdGVdOiBbXG4gICAgICBJdGVyYWJsZTxUPixcbiAgICAgIEtleUZuPFQ+IHwgSXRlbVRlbXBsYXRlPFQ+LFxuICAgICAgSXRlbVRlbXBsYXRlPFQ+XG4gICAgXVxuICApIHtcbiAgICAvLyBPbGQgcGFydCAmIGtleSBsaXN0cyBhcmUgcmV0cmlldmVkIGZyb20gdGhlIGxhc3QgdXBkYXRlICh3aGljaCBtYXlcbiAgICAvLyBiZSBwcmltZWQgYnkgaHlkcmF0aW9uKVxuICAgIGNvbnN0IG9sZFBhcnRzID0gZ2V0Q29tbWl0dGVkVmFsdWUoXG4gICAgICBjb250YWluZXJQYXJ0XG4gICAgKSBhcyBBcnJheTxDaGlsZFBhcnQgfCBudWxsPjtcbiAgICBjb25zdCB7dmFsdWVzOiBuZXdWYWx1ZXMsIGtleXM6IG5ld0tleXN9ID0gdGhpcy5fZ2V0VmFsdWVzQW5kS2V5cyhcbiAgICAgIGl0ZW1zLFxuICAgICAga2V5Rm5PclRlbXBsYXRlLFxuICAgICAgdGVtcGxhdGVcbiAgICApO1xuXG4gICAgLy8gV2UgY2hlY2sgdGhhdCBvbGRQYXJ0cywgdGhlIGNvbW1pdHRlZCB2YWx1ZSwgaXMgYW4gQXJyYXkgYXMgYW5cbiAgICAvLyBpbmRpY2F0b3IgdGhhdCB0aGUgcHJldmlvdXMgdmFsdWUgY2FtZSBmcm9tIGEgcmVwZWF0KCkgY2FsbC4gSWZcbiAgICAvLyBvbGRQYXJ0cyBpcyBub3QgYW4gQXJyYXkgdGhlbiB0aGlzIGlzIHRoZSBmaXJzdCByZW5kZXIgYW5kIHdlIHJldHVyblxuICAgIC8vIGFuIGFycmF5IGZvciBsaXQtaHRtbCdzIGFycmF5IGhhbmRsaW5nIHRvIHJlbmRlciwgYW5kIHJlbWVtYmVyIHRoZVxuICAgIC8vIGtleXMuXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KG9sZFBhcnRzKSkge1xuICAgICAgdGhpcy5faXRlbUtleXMgPSBuZXdLZXlzO1xuICAgICAgcmV0dXJuIG5ld1ZhbHVlcztcbiAgICB9XG5cbiAgICAvLyBJbiBTU1IgaHlkcmF0aW9uIGl0J3MgcG9zc2libGUgZm9yIG9sZFBhcnRzIHRvIGJlIGFuIGFycmF5IGJ1dCBmb3IgdXNcbiAgICAvLyB0byBub3QgaGF2ZSBpdGVtIGtleXMgYmVjYXVzZSB0aGUgdXBkYXRlKCkgaGFzbid0IHJ1biB5ZXQuIFdlIHNldCB0aGVcbiAgICAvLyBrZXlzIHRvIGFuIGVtcHR5IGFycmF5LiBUaGlzIHdpbGwgY2F1c2UgYWxsIG9sZEtleS9uZXdLZXkgY29tcGFyaXNvbnNcbiAgICAvLyB0byBmYWlsIGFuZCBleGVjdXRpb24gdG8gZmFsbCB0byB0aGUgbGFzdCBuZXN0ZWQgYnJhY2ggYmVsb3cgd2hpY2hcbiAgICAvLyByZXVzZXMgdGhlIG9sZFBhcnQuXG4gICAgY29uc3Qgb2xkS2V5cyA9ICh0aGlzLl9pdGVtS2V5cyA/Pz0gW10pO1xuXG4gICAgLy8gTmV3IHBhcnQgbGlzdCB3aWxsIGJlIGJ1aWx0IHVwIGFzIHdlIGdvIChlaXRoZXIgcmV1c2VkIGZyb21cbiAgICAvLyBvbGQgcGFydHMgb3IgY3JlYXRlZCBmb3IgbmV3IGtleXMgaW4gdGhpcyB1cGRhdGUpLiBUaGlzIGlzXG4gICAgLy8gc2F2ZWQgaW4gdGhlIGFib3ZlIGNhY2hlIGF0IHRoZSBlbmQgb2YgdGhlIHVwZGF0ZS5cbiAgICBjb25zdCBuZXdQYXJ0czogQ2hpbGRQYXJ0W10gPSBbXTtcblxuICAgIC8vIE1hcHMgZnJvbSBrZXkgdG8gaW5kZXggZm9yIGN1cnJlbnQgYW5kIHByZXZpb3VzIHVwZGF0ZTsgdGhlc2VcbiAgICAvLyBhcmUgZ2VuZXJhdGVkIGxhemlseSBvbmx5IHdoZW4gbmVlZGVkIGFzIGEgcGVyZm9ybWFuY2VcbiAgICAvLyBvcHRpbWl6YXRpb24sIHNpbmNlIHRoZXkgYXJlIG9ubHkgcmVxdWlyZWQgZm9yIG11bHRpcGxlXG4gICAgLy8gbm9uLWNvbnRpZ3VvdXMgY2hhbmdlcyBpbiB0aGUgbGlzdCwgd2hpY2ggYXJlIGxlc3MgY29tbW9uLlxuICAgIGxldCBuZXdLZXlUb0luZGV4TWFwITogTWFwPHVua25vd24sIG51bWJlcj47XG4gICAgbGV0IG9sZEtleVRvSW5kZXhNYXAhOiBNYXA8dW5rbm93biwgbnVtYmVyPjtcblxuICAgIC8vIEhlYWQgYW5kIHRhaWwgcG9pbnRlcnMgdG8gb2xkIHBhcnRzIGFuZCBuZXcgdmFsdWVzXG4gICAgbGV0IG9sZEhlYWQgPSAwO1xuICAgIGxldCBvbGRUYWlsID0gb2xkUGFydHMubGVuZ3RoIC0gMTtcbiAgICBsZXQgbmV3SGVhZCA9IDA7XG4gICAgbGV0IG5ld1RhaWwgPSBuZXdWYWx1ZXMubGVuZ3RoIC0gMTtcblxuICAgIC8vIE92ZXJ2aWV3IG9mIE8obikgcmVjb25jaWxpYXRpb24gYWxnb3JpdGhtIChnZW5lcmFsIGFwcHJvYWNoXG4gICAgLy8gYmFzZWQgb24gaWRlYXMgZm91bmQgaW4gaXZpLCB2dWUsIHNuYWJiZG9tLCBldGMuKTpcbiAgICAvL1xuICAgIC8vICogV2Ugc3RhcnQgd2l0aCB0aGUgbGlzdCBvZiBvbGQgcGFydHMgYW5kIG5ldyB2YWx1ZXMgKGFuZFxuICAgIC8vICAgYXJyYXlzIG9mIHRoZWlyIHJlc3BlY3RpdmUga2V5cyksIGhlYWQvdGFpbCBwb2ludGVycyBpbnRvXG4gICAgLy8gICBlYWNoLCBhbmQgd2UgYnVpbGQgdXAgdGhlIG5ldyBsaXN0IG9mIHBhcnRzIGJ5IHVwZGF0aW5nXG4gICAgLy8gICAoYW5kIHdoZW4gbmVlZGVkLCBtb3ZpbmcpIG9sZCBwYXJ0cyBvciBjcmVhdGluZyBuZXcgb25lcy5cbiAgICAvLyAgIFRoZSBpbml0aWFsIHNjZW5hcmlvIG1pZ2h0IGxvb2sgbGlrZSB0aGlzIChmb3IgYnJldml0eSBvZlxuICAgIC8vICAgdGhlIGRpYWdyYW1zLCB0aGUgbnVtYmVycyBpbiB0aGUgYXJyYXkgcmVmbGVjdCBrZXlzXG4gICAgLy8gICBhc3NvY2lhdGVkIHdpdGggdGhlIG9sZCBwYXJ0cyBvciBuZXcgdmFsdWVzLCBhbHRob3VnaCBrZXlzXG4gICAgLy8gICBhbmQgcGFydHMvdmFsdWVzIGFyZSBhY3R1YWxseSBzdG9yZWQgaW4gcGFyYWxsZWwgYXJyYXlzXG4gICAgLy8gICBpbmRleGVkIHVzaW5nIHRoZSBzYW1lIGhlYWQvdGFpbCBwb2ludGVycyk6XG4gICAgLy9cbiAgICAvLyAgICAgIG9sZEhlYWQgdiAgICAgICAgICAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIDIsIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWyAsICAsICAsICAsICAsICAsICBdXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdIDwtIHJlZmxlY3RzIHRoZSB1c2VyJ3MgbmV3XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0gb3JkZXJcbiAgICAvLyAgICAgIG5ld0hlYWQgXiAgICAgICAgICAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIEl0ZXJhdGUgb2xkICYgbmV3IGxpc3RzIGZyb20gYm90aCBzaWRlcywgdXBkYXRpbmcsXG4gICAgLy8gICBzd2FwcGluZywgb3IgcmVtb3ZpbmcgcGFydHMgYXQgdGhlIGhlYWQvdGFpbCBsb2NhdGlvbnNcbiAgICAvLyAgIHVudGlsIG5laXRoZXIgaGVhZCBub3IgdGFpbCBjYW4gbW92ZS5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzoga2V5cyBhdCBoZWFkIHBvaW50ZXJzIG1hdGNoLCBzbyB1cGRhdGUgb2xkXG4gICAgLy8gICBwYXJ0IDAgaW4tcGxhY2UgKG5vIG5lZWQgdG8gbW92ZSBpdCkgYW5kIHJlY29yZCBwYXJ0IDAgaW5cbiAgICAvLyAgIHRoZSBgbmV3UGFydHNgIGxpc3QuIFRoZSBsYXN0IHRoaW5nIHdlIGRvIGlzIGFkdmFuY2UgdGhlXG4gICAgLy8gICBgb2xkSGVhZGAgYW5kIGBuZXdIZWFkYCBwb2ludGVycyAod2lsbCBiZSByZWZsZWN0ZWQgaW4gdGhlXG4gICAgLy8gICBuZXh0IGRpYWdyYW0pLlxuICAgIC8vXG4gICAgLy8gICAgICBvbGRIZWFkIHYgICAgICAgICAgICAgICAgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAyLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFswLCAgLCAgLCAgLCAgLCAgLCAgXSA8LSBoZWFkcyBtYXRjaGVkOiB1cGRhdGUgMFxuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSAgICBhbmQgYWR2YW5jZSBib3RoIG9sZEhlYWRcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJiBuZXdIZWFkXG4gICAgLy8gICAgICBuZXdIZWFkIF4gICAgICAgICAgICAgICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBoZWFkIHBvaW50ZXJzIGRvbid0IG1hdGNoLCBidXQgdGFpbFxuICAgIC8vICAgcG9pbnRlcnMgZG8sIHNvIHVwZGF0ZSBwYXJ0IDYgaW4gcGxhY2UgKG5vIG5lZWQgdG8gbW92ZVxuICAgIC8vICAgaXQpLCBhbmQgcmVjb3JkIHBhcnQgNiBpbiB0aGUgYG5ld1BhcnRzYCBsaXN0LiBMYXN0LFxuICAgIC8vICAgYWR2YW5jZSB0aGUgYG9sZFRhaWxgIGFuZCBgb2xkSGVhZGAgcG9pbnRlcnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgIG9sZEhlYWQgdiAgICAgICAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIDIsIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsICAsICAsICAsICAsICAsIDZdIDwtIHRhaWxzIG1hdGNoZWQ6IHVwZGF0ZSA2XG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIGJvdGggb2xkVGFpbFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmIG5ld1RhaWxcbiAgICAvLyAgICAgICAgIG5ld0hlYWQgXiAgICAgICAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIElmIG5laXRoZXIgaGVhZCBub3IgdGFpbCBtYXRjaDsgbmV4dCBjaGVjayBpZiBvbmUgb2YgdGhlXG4gICAgLy8gICBvbGQgaGVhZC90YWlsIGl0ZW1zIHdhcyByZW1vdmVkLiBXZSBmaXJzdCBuZWVkIHRvIGdlbmVyYXRlXG4gICAgLy8gICB0aGUgcmV2ZXJzZSBtYXAgb2YgbmV3IGtleXMgdG8gaW5kZXggKGBuZXdLZXlUb0luZGV4TWFwYCksXG4gICAgLy8gICB3aGljaCBpcyBkb25lIG9uY2UgbGF6aWx5IGFzIGEgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uLFxuICAgIC8vICAgc2luY2Ugd2Ugb25seSBoaXQgdGhpcyBjYXNlIGlmIG11bHRpcGxlIG5vbi1jb250aWd1b3VzXG4gICAgLy8gICBjaGFuZ2VzIHdlcmUgbWFkZS4gTm90ZSB0aGF0IGZvciBjb250aWd1b3VzIHJlbW92YWxcbiAgICAvLyAgIGFueXdoZXJlIGluIHRoZSBsaXN0LCB0aGUgaGVhZCBhbmQgdGFpbHMgd291bGQgYWR2YW5jZVxuICAgIC8vICAgZnJvbSBlaXRoZXIgZW5kIGFuZCBwYXNzIGVhY2ggb3RoZXIgYmVmb3JlIHdlIGdldCB0byB0aGlzXG4gICAgLy8gICBjYXNlIGFuZCByZW1vdmFscyB3b3VsZCBiZSBoYW5kbGVkIGluIHRoZSBmaW5hbCB3aGlsZSBsb29wXG4gICAgLy8gICB3aXRob3V0IG5lZWRpbmcgdG8gZ2VuZXJhdGUgdGhlIG1hcC5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogVGhlIGtleSBhdCBgb2xkVGFpbGAgd2FzIHJlbW92ZWQgKG5vIGxvbmdlclxuICAgIC8vICAgaW4gdGhlIGBuZXdLZXlUb0luZGV4TWFwYCksIHNvIHJlbW92ZSB0aGF0IHBhcnQgZnJvbSB0aGVcbiAgICAvLyAgIERPTSBhbmQgYWR2YW5jZSBqdXN0IHRoZSBgb2xkVGFpbGAgcG9pbnRlci5cbiAgICAvL1xuICAgIC8vICAgICAgICAgb2xkSGVhZCB2ICAgICAgICAgICB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgMiwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgICwgICwgICwgICwgICwgNl0gPC0gNSBub3QgaW4gbmV3IG1hcDogcmVtb3ZlXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIDUgYW5kIGFkdmFuY2Ugb2xkVGFpbFxuICAgIC8vICAgICAgICAgbmV3SGVhZCBeICAgICAgICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogT25jZSBoZWFkIGFuZCB0YWlsIGNhbm5vdCBtb3ZlLCBhbnkgbWlzbWF0Y2hlcyBhcmUgZHVlIHRvXG4gICAgLy8gICBlaXRoZXIgbmV3IG9yIG1vdmVkIGl0ZW1zOyBpZiBhIG5ldyBrZXkgaXMgaW4gdGhlIHByZXZpb3VzXG4gICAgLy8gICBcIm9sZCBrZXkgdG8gb2xkIGluZGV4XCIgbWFwLCBtb3ZlIHRoZSBvbGQgcGFydCB0byB0aGUgbmV3XG4gICAgLy8gICBsb2NhdGlvbiwgb3RoZXJ3aXNlIGNyZWF0ZSBhbmQgaW5zZXJ0IGEgbmV3IHBhcnQuIE5vdGVcbiAgICAvLyAgIHRoYXQgd2hlbiBtb3ZpbmcgYW4gb2xkIHBhcnQgd2UgbnVsbCBpdHMgcG9zaXRpb24gaW4gdGhlXG4gICAgLy8gICBvbGRQYXJ0cyBhcnJheSBpZiBpdCBsaWVzIGJldHdlZW4gdGhlIGhlYWQgYW5kIHRhaWwgc28gd2VcbiAgICAvLyAgIGtub3cgdG8gc2tpcCBpdCB3aGVuIHRoZSBwb2ludGVycyBnZXQgdGhlcmUuXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IG5laXRoZXIgaGVhZCBub3IgdGFpbCBtYXRjaCwgYW5kIG5laXRoZXJcbiAgICAvLyAgIHdlcmUgcmVtb3ZlZDsgc28gZmluZCB0aGUgYG5ld0hlYWRgIGtleSBpbiB0aGVcbiAgICAvLyAgIGBvbGRLZXlUb0luZGV4TWFwYCwgYW5kIG1vdmUgdGhhdCBvbGQgcGFydCdzIERPTSBpbnRvIHRoZVxuICAgIC8vICAgbmV4dCBoZWFkIHBvc2l0aW9uIChiZWZvcmUgYG9sZFBhcnRzW29sZEhlYWRdYCkuIExhc3QsXG4gICAgLy8gICBudWxsIHRoZSBwYXJ0IGluIHRoZSBgb2xkUGFydGAgYXJyYXkgc2luY2UgaXQgd2FzXG4gICAgLy8gICBzb21ld2hlcmUgaW4gdGhlIHJlbWFpbmluZyBvbGRQYXJ0cyBzdGlsbCB0byBiZSBzY2FubmVkXG4gICAgLy8gICAoYmV0d2VlbiB0aGUgaGVhZCBhbmQgdGFpbCBwb2ludGVycykgc28gdGhhdCB3ZSBrbm93IHRvXG4gICAgLy8gICBza2lwIHRoYXQgb2xkIHBhcnQgb24gZnV0dXJlIGl0ZXJhdGlvbnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgIG9sZEhlYWQgdiAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsICAsICAsICAsICAsIDZdIDwtIHN0dWNrOiB1cGRhdGUgJiBtb3ZlIDJcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICAgaW50byBwbGFjZSBhbmQgYWR2YW5jZVxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdIZWFkXG4gICAgLy8gICAgICAgICBuZXdIZWFkIF4gICAgICAgICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBOb3RlIHRoYXQgZm9yIG1vdmVzL2luc2VydGlvbnMgbGlrZSB0aGUgb25lIGFib3ZlLCBhIHBhcnRcbiAgICAvLyAgIGluc2VydGVkIGF0IHRoZSBoZWFkIHBvaW50ZXIgaXMgaW5zZXJ0ZWQgYmVmb3JlIHRoZVxuICAgIC8vICAgY3VycmVudCBgb2xkUGFydHNbb2xkSGVhZF1gLCBhbmQgYSBwYXJ0IGluc2VydGVkIGF0IHRoZVxuICAgIC8vICAgdGFpbCBwb2ludGVyIGlzIGluc2VydGVkIGJlZm9yZSBgbmV3UGFydHNbbmV3VGFpbCsxXWAuIFRoZVxuICAgIC8vICAgc2VlbWluZyBhc3ltbWV0cnkgbGllcyBpbiB0aGUgZmFjdCB0aGF0IG5ldyBwYXJ0cyBhcmVcbiAgICAvLyAgIG1vdmVkIGludG8gcGxhY2Ugb3V0c2lkZSBpbiwgc28gdG8gdGhlIHJpZ2h0IG9mIHRoZSBoZWFkXG4gICAgLy8gICBwb2ludGVyIGFyZSBvbGQgcGFydHMsIGFuZCB0byB0aGUgcmlnaHQgb2YgdGhlIHRhaWxcbiAgICAvLyAgIHBvaW50ZXIgYXJlIG5ldyBwYXJ0cy5cbiAgICAvL1xuICAgIC8vICogV2UgYWx3YXlzIHJlc3RhcnQgYmFjayBmcm9tIHRoZSB0b3Agb2YgdGhlIGFsZ29yaXRobSxcbiAgICAvLyAgIGFsbG93aW5nIG1hdGNoaW5nIGFuZCBzaW1wbGUgdXBkYXRlcyBpbiBwbGFjZSB0b1xuICAgIC8vICAgY29udGludWUuLi5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogdGhlIGhlYWQgcG9pbnRlcnMgb25jZSBhZ2FpbiBtYXRjaCwgc29cbiAgICAvLyAgIHNpbXBseSB1cGRhdGUgcGFydCAxIGFuZCByZWNvcmQgaXQgaW4gdGhlIGBuZXdQYXJ0c2BcbiAgICAvLyAgIGFycmF5LiAgTGFzdCwgYWR2YW5jZSBib3RoIGhlYWQgcG9pbnRlcnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgIG9sZEhlYWQgdiAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsICAsICAsICAsIDZdIDwtIGhlYWRzIG1hdGNoZWQ6IHVwZGF0ZSAxXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIGJvdGggb2xkSGVhZFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmIG5ld0hlYWRcbiAgICAvLyAgICAgICAgICAgIG5ld0hlYWQgXiAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIEFzIG1lbnRpb25lZCBhYm92ZSwgaXRlbXMgdGhhdCB3ZXJlIG1vdmVkIGFzIGEgcmVzdWx0IG9mXG4gICAgLy8gICBiZWluZyBzdHVjayAodGhlIGZpbmFsIGVsc2UgY2xhdXNlIGluIHRoZSBjb2RlIGJlbG93KSBhcmVcbiAgICAvLyAgIG1hcmtlZCB3aXRoIG51bGwsIHNvIHdlIGFsd2F5cyBhZHZhbmNlIG9sZCBwb2ludGVycyBvdmVyXG4gICAgLy8gICB0aGVzZSBzbyB3ZSdyZSBjb21wYXJpbmcgdGhlIG5leHQgYWN0dWFsIG9sZCB2YWx1ZSBvblxuICAgIC8vICAgZWl0aGVyIGVuZC5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogYG9sZEhlYWRgIGlzIG51bGwgKGFscmVhZHkgcGxhY2VkIGluXG4gICAgLy8gICBuZXdQYXJ0cyksIHNvIGFkdmFuY2UgYG9sZEhlYWRgLlxuICAgIC8vXG4gICAgLy8gICAgICAgICAgICBvbGRIZWFkIHYgICAgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAtLCAzLCA0LCA1LCA2XSA8LSBvbGQgaGVhZCBhbHJlYWR5IHVzZWQ6XG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsICAsICAsICAsIDZdICAgIGFkdmFuY2Ugb2xkSGVhZFxuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XVxuICAgIC8vICAgICAgICAgICAgICAgbmV3SGVhZCBeICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogTm90ZSBpdCdzIG5vdCBjcml0aWNhbCB0byBtYXJrIG9sZCBwYXJ0cyBhcyBudWxsIHdoZW4gdGhleVxuICAgIC8vICAgYXJlIG1vdmVkIGZyb20gaGVhZCB0byB0YWlsIG9yIHRhaWwgdG8gaGVhZCwgc2luY2UgdGhleVxuICAgIC8vICAgd2lsbCBiZSBvdXRzaWRlIHRoZSBwb2ludGVyIHJhbmdlIGFuZCBuZXZlciB2aXNpdGVkIGFnYWluLlxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBIZXJlIHRoZSBvbGQgdGFpbCBrZXkgbWF0Y2hlcyB0aGUgbmV3IGhlYWRcbiAgICAvLyAgIGtleSwgc28gdGhlIHBhcnQgYXQgdGhlIGBvbGRUYWlsYCBwb3NpdGlvbiBhbmQgbW92ZSBpdHNcbiAgICAvLyAgIERPTSB0byB0aGUgbmV3IGhlYWQgcG9zaXRpb24gKGJlZm9yZSBgb2xkUGFydHNbb2xkSGVhZF1gKS5cbiAgICAvLyAgIExhc3QsIGFkdmFuY2UgYG9sZFRhaWxgIGFuZCBgbmV3SGVhZGAgcG9pbnRlcnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgICAgICAgIG9sZEhlYWQgdiAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsIDQsICAsICAsIDZdIDwtIG9sZCB0YWlsIG1hdGNoZXMgbmV3XG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgaGVhZDogdXBkYXRlICYgbW92ZSA0LFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkdmFuY2Ugb2xkVGFpbCAmIG5ld0hlYWRcbiAgICAvLyAgICAgICAgICAgICAgIG5ld0hlYWQgXiAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IE9sZCBhbmQgbmV3IGhlYWQga2V5cyBtYXRjaCwgc28gdXBkYXRlIHRoZVxuICAgIC8vICAgb2xkIGhlYWQgcGFydCBpbiBwbGFjZSwgYW5kIGFkdmFuY2UgdGhlIGBvbGRIZWFkYCBhbmRcbiAgICAvLyAgIGBuZXdIZWFkYCBwb2ludGVycy5cbiAgICAvL1xuICAgIC8vICAgICAgICAgICAgICAgb2xkSGVhZCB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgLSwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgMSwgNCwgMywgICAsNl0gPC0gaGVhZHMgbWF0Y2g6IHVwZGF0ZSAzXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIG9sZEhlYWQgJlxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdIZWFkXG4gICAgLy8gICAgICAgICAgICAgICAgICBuZXdIZWFkIF4gIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBPbmNlIHRoZSBuZXcgb3Igb2xkIHBvaW50ZXJzIG1vdmUgcGFzdCBlYWNoIG90aGVyIHRoZW4gYWxsXG4gICAgLy8gICB3ZSBoYXZlIGxlZnQgaXMgYWRkaXRpb25zIChpZiBvbGQgbGlzdCBleGhhdXN0ZWQpIG9yXG4gICAgLy8gICByZW1vdmFscyAoaWYgbmV3IGxpc3QgZXhoYXVzdGVkKS4gVGhvc2UgYXJlIGhhbmRsZWQgaW4gdGhlXG4gICAgLy8gICBmaW5hbCB3aGlsZSBsb29wcyBhdCB0aGUgZW5kLlxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBgb2xkSGVhZGAgZXhjZWVkZWQgYG9sZFRhaWxgLCBzbyB3ZSdyZSBkb25lXG4gICAgLy8gICB3aXRoIHRoZSBtYWluIGxvb3AuICBDcmVhdGUgdGhlIHJlbWFpbmluZyBwYXJ0IGFuZCBpbnNlcnRcbiAgICAvLyAgIGl0IGF0IHRoZSBuZXcgaGVhZCBwb3NpdGlvbiwgYW5kIHRoZSB1cGRhdGUgaXMgY29tcGxldGUuXG4gICAgLy9cbiAgICAvLyAgICAgICAgICAgICAgICAgICAob2xkSGVhZCA+IG9sZFRhaWwpXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsIDQsIDMsIDcgLDZdIDwtIGNyZWF0ZSBhbmQgaW5zZXJ0IDdcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl1cbiAgICAvLyAgICAgICAgICAgICAgICAgICAgIG5ld0hlYWQgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIE5vdGUgdGhhdCB0aGUgb3JkZXIgb2YgdGhlIGlmL2Vsc2UgY2xhdXNlcyBpcyBub3RcbiAgICAvLyAgIGltcG9ydGFudCB0byB0aGUgYWxnb3JpdGhtLCBhcyBsb25nIGFzIHRoZSBudWxsIGNoZWNrc1xuICAgIC8vICAgY29tZSBmaXJzdCAodG8gZW5zdXJlIHdlJ3JlIGFsd2F5cyB3b3JraW5nIG9uIHZhbGlkIG9sZFxuICAgIC8vICAgcGFydHMpIGFuZCB0aGF0IHRoZSBmaW5hbCBlbHNlIGNsYXVzZSBjb21lcyBsYXN0IChzaW5jZVxuICAgIC8vICAgdGhhdCdzIHdoZXJlIHRoZSBleHBlbnNpdmUgbW92ZXMgb2NjdXIpLiBUaGUgb3JkZXIgb2ZcbiAgICAvLyAgIHJlbWFpbmluZyBjbGF1c2VzIGlzIGlzIGp1c3QgYSBzaW1wbGUgZ3Vlc3MgYXQgd2hpY2ggY2FzZXNcbiAgICAvLyAgIHdpbGwgYmUgbW9zdCBjb21tb24uXG4gICAgLy9cbiAgICAvLyAqIE5vdGUsIHdlIGNvdWxkIGNhbGN1bGF0ZSB0aGUgbG9uZ2VzdFxuICAgIC8vICAgaW5jcmVhc2luZyBzdWJzZXF1ZW5jZSAoTElTKSBvZiBvbGQgaXRlbXMgaW4gbmV3IHBvc2l0aW9uLFxuICAgIC8vICAgYW5kIG9ubHkgbW92ZSB0aG9zZSBub3QgaW4gdGhlIExJUyBzZXQuIEhvd2V2ZXIgdGhhdCBjb3N0c1xuICAgIC8vICAgTyhubG9nbikgdGltZSBhbmQgYWRkcyBhIGJpdCBtb3JlIGNvZGUsIGFuZCBvbmx5IGhlbHBzXG4gICAgLy8gICBtYWtlIHJhcmUgdHlwZXMgb2YgbXV0YXRpb25zIHJlcXVpcmUgZmV3ZXIgbW92ZXMuIFRoZVxuICAgIC8vICAgYWJvdmUgaGFuZGxlcyByZW1vdmVzLCBhZGRzLCByZXZlcnNhbCwgc3dhcHMsIGFuZCBzaW5nbGVcbiAgICAvLyAgIG1vdmVzIG9mIGNvbnRpZ3VvdXMgaXRlbXMgaW4gbGluZWFyIHRpbWUsIGluIHRoZSBtaW5pbXVtXG4gICAgLy8gICBudW1iZXIgb2YgbW92ZXMuIEFzIHRoZSBudW1iZXIgb2YgbXVsdGlwbGUgbW92ZXMgd2hlcmUgTElTXG4gICAgLy8gICBtaWdodCBoZWxwIGFwcHJvYWNoZXMgYSByYW5kb20gc2h1ZmZsZSwgdGhlIExJU1xuICAgIC8vICAgb3B0aW1pemF0aW9uIGJlY29tZXMgbGVzcyBoZWxwZnVsLCBzbyBpdCBzZWVtcyBub3Qgd29ydGhcbiAgICAvLyAgIHRoZSBjb2RlIGF0IHRoaXMgcG9pbnQuIENvdWxkIHJlY29uc2lkZXIgaWYgYSBjb21wZWxsaW5nXG4gICAgLy8gICBjYXNlIGFyaXNlcy5cblxuICAgIHdoaWxlIChvbGRIZWFkIDw9IG9sZFRhaWwgJiYgbmV3SGVhZCA8PSBuZXdUYWlsKSB7XG4gICAgICBpZiAob2xkUGFydHNbb2xkSGVhZF0gPT09IG51bGwpIHtcbiAgICAgICAgLy8gYG51bGxgIG1lYW5zIG9sZCBwYXJ0IGF0IGhlYWQgaGFzIGFscmVhZHkgYmVlbiB1c2VkXG4gICAgICAgIC8vIGJlbG93OyBza2lwXG4gICAgICAgIG9sZEhlYWQrKztcbiAgICAgIH0gZWxzZSBpZiAob2xkUGFydHNbb2xkVGFpbF0gPT09IG51bGwpIHtcbiAgICAgICAgLy8gYG51bGxgIG1lYW5zIG9sZCBwYXJ0IGF0IHRhaWwgaGFzIGFscmVhZHkgYmVlbiB1c2VkXG4gICAgICAgIC8vIGJlbG93OyBza2lwXG4gICAgICAgIG9sZFRhaWwtLTtcbiAgICAgIH0gZWxzZSBpZiAob2xkS2V5c1tvbGRIZWFkXSA9PT0gbmV3S2V5c1tuZXdIZWFkXSkge1xuICAgICAgICAvLyBPbGQgaGVhZCBtYXRjaGVzIG5ldyBoZWFkOyB1cGRhdGUgaW4gcGxhY2VcbiAgICAgICAgbmV3UGFydHNbbmV3SGVhZF0gPSBzZXRDaGlsZFBhcnRWYWx1ZShcbiAgICAgICAgICBvbGRQYXJ0c1tvbGRIZWFkXSEsXG4gICAgICAgICAgbmV3VmFsdWVzW25ld0hlYWRdXG4gICAgICAgICk7XG4gICAgICAgIG9sZEhlYWQrKztcbiAgICAgICAgbmV3SGVhZCsrO1xuICAgICAgfSBlbHNlIGlmIChvbGRLZXlzW29sZFRhaWxdID09PSBuZXdLZXlzW25ld1RhaWxdKSB7XG4gICAgICAgIC8vIE9sZCB0YWlsIG1hdGNoZXMgbmV3IHRhaWw7IHVwZGF0ZSBpbiBwbGFjZVxuICAgICAgICBuZXdQYXJ0c1tuZXdUYWlsXSA9IHNldENoaWxkUGFydFZhbHVlKFxuICAgICAgICAgIG9sZFBhcnRzW29sZFRhaWxdISxcbiAgICAgICAgICBuZXdWYWx1ZXNbbmV3VGFpbF1cbiAgICAgICAgKTtcbiAgICAgICAgb2xkVGFpbC0tO1xuICAgICAgICBuZXdUYWlsLS07XG4gICAgICB9IGVsc2UgaWYgKG9sZEtleXNbb2xkSGVhZF0gPT09IG5ld0tleXNbbmV3VGFpbF0pIHtcbiAgICAgICAgLy8gT2xkIGhlYWQgbWF0Y2hlcyBuZXcgdGFpbDsgdXBkYXRlIGFuZCBtb3ZlIHRvIG5ldyB0YWlsXG4gICAgICAgIG5ld1BhcnRzW25ld1RhaWxdID0gc2V0Q2hpbGRQYXJ0VmFsdWUoXG4gICAgICAgICAgb2xkUGFydHNbb2xkSGVhZF0hLFxuICAgICAgICAgIG5ld1ZhbHVlc1tuZXdUYWlsXVxuICAgICAgICApO1xuICAgICAgICBpbnNlcnRQYXJ0KGNvbnRhaW5lclBhcnQsIG5ld1BhcnRzW25ld1RhaWwgKyAxXSwgb2xkUGFydHNbb2xkSGVhZF0hKTtcbiAgICAgICAgb2xkSGVhZCsrO1xuICAgICAgICBuZXdUYWlsLS07XG4gICAgICB9IGVsc2UgaWYgKG9sZEtleXNbb2xkVGFpbF0gPT09IG5ld0tleXNbbmV3SGVhZF0pIHtcbiAgICAgICAgLy8gT2xkIHRhaWwgbWF0Y2hlcyBuZXcgaGVhZDsgdXBkYXRlIGFuZCBtb3ZlIHRvIG5ldyBoZWFkXG4gICAgICAgIG5ld1BhcnRzW25ld0hlYWRdID0gc2V0Q2hpbGRQYXJ0VmFsdWUoXG4gICAgICAgICAgb2xkUGFydHNbb2xkVGFpbF0hLFxuICAgICAgICAgIG5ld1ZhbHVlc1tuZXdIZWFkXVxuICAgICAgICApO1xuICAgICAgICBpbnNlcnRQYXJ0KGNvbnRhaW5lclBhcnQsIG9sZFBhcnRzW29sZEhlYWRdISwgb2xkUGFydHNbb2xkVGFpbF0hKTtcbiAgICAgICAgb2xkVGFpbC0tO1xuICAgICAgICBuZXdIZWFkKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobmV3S2V5VG9JbmRleE1hcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gTGF6aWx5IGdlbmVyYXRlIGtleS10by1pbmRleCBtYXBzLCB1c2VkIGZvciByZW1vdmFscyAmXG4gICAgICAgICAgLy8gbW92ZXMgYmVsb3dcbiAgICAgICAgICBuZXdLZXlUb0luZGV4TWFwID0gZ2VuZXJhdGVNYXAobmV3S2V5cywgbmV3SGVhZCwgbmV3VGFpbCk7XG4gICAgICAgICAgb2xkS2V5VG9JbmRleE1hcCA9IGdlbmVyYXRlTWFwKG9sZEtleXMsIG9sZEhlYWQsIG9sZFRhaWwpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghbmV3S2V5VG9JbmRleE1hcC5oYXMob2xkS2V5c1tvbGRIZWFkXSkpIHtcbiAgICAgICAgICAvLyBPbGQgaGVhZCBpcyBubyBsb25nZXIgaW4gbmV3IGxpc3Q7IHJlbW92ZVxuICAgICAgICAgIHJlbW92ZVBhcnQob2xkUGFydHNbb2xkSGVhZF0hKTtcbiAgICAgICAgICBvbGRIZWFkKys7XG4gICAgICAgIH0gZWxzZSBpZiAoIW5ld0tleVRvSW5kZXhNYXAuaGFzKG9sZEtleXNbb2xkVGFpbF0pKSB7XG4gICAgICAgICAgLy8gT2xkIHRhaWwgaXMgbm8gbG9uZ2VyIGluIG5ldyBsaXN0OyByZW1vdmVcbiAgICAgICAgICByZW1vdmVQYXJ0KG9sZFBhcnRzW29sZFRhaWxdISk7XG4gICAgICAgICAgb2xkVGFpbC0tO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIEFueSBtaXNtYXRjaGVzIGF0IHRoaXMgcG9pbnQgYXJlIGR1ZSB0byBhZGRpdGlvbnMgb3JcbiAgICAgICAgICAvLyBtb3Zlczsgc2VlIGlmIHdlIGhhdmUgYW4gb2xkIHBhcnQgd2UgY2FuIHJldXNlIGFuZCBtb3ZlXG4gICAgICAgICAgLy8gaW50byBwbGFjZVxuICAgICAgICAgIGNvbnN0IG9sZEluZGV4ID0gb2xkS2V5VG9JbmRleE1hcC5nZXQobmV3S2V5c1tuZXdIZWFkXSk7XG4gICAgICAgICAgY29uc3Qgb2xkUGFydCA9IG9sZEluZGV4ICE9PSB1bmRlZmluZWQgPyBvbGRQYXJ0c1tvbGRJbmRleF0gOiBudWxsO1xuICAgICAgICAgIGlmIChvbGRQYXJ0ID09PSBudWxsKSB7XG4gICAgICAgICAgICAvLyBObyBvbGQgcGFydCBmb3IgdGhpcyB2YWx1ZTsgY3JlYXRlIGEgbmV3IG9uZSBhbmRcbiAgICAgICAgICAgIC8vIGluc2VydCBpdFxuICAgICAgICAgICAgY29uc3QgbmV3UGFydCA9IGluc2VydFBhcnQoY29udGFpbmVyUGFydCwgb2xkUGFydHNbb2xkSGVhZF0hKTtcbiAgICAgICAgICAgIHNldENoaWxkUGFydFZhbHVlKG5ld1BhcnQsIG5ld1ZhbHVlc1tuZXdIZWFkXSk7XG4gICAgICAgICAgICBuZXdQYXJ0c1tuZXdIZWFkXSA9IG5ld1BhcnQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFJldXNlIG9sZCBwYXJ0XG4gICAgICAgICAgICBuZXdQYXJ0c1tuZXdIZWFkXSA9IHNldENoaWxkUGFydFZhbHVlKG9sZFBhcnQsIG5ld1ZhbHVlc1tuZXdIZWFkXSk7XG4gICAgICAgICAgICBpbnNlcnRQYXJ0KGNvbnRhaW5lclBhcnQsIG9sZFBhcnRzW29sZEhlYWRdISwgb2xkUGFydCk7XG4gICAgICAgICAgICAvLyBUaGlzIG1hcmtzIHRoZSBvbGQgcGFydCBhcyBoYXZpbmcgYmVlbiB1c2VkLCBzbyB0aGF0XG4gICAgICAgICAgICAvLyBpdCB3aWxsIGJlIHNraXBwZWQgaW4gdGhlIGZpcnN0IHR3byBjaGVja3MgYWJvdmVcbiAgICAgICAgICAgIG9sZFBhcnRzW29sZEluZGV4IGFzIG51bWJlcl0gPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBuZXdIZWFkKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQWRkIHBhcnRzIGZvciBhbnkgcmVtYWluaW5nIG5ldyB2YWx1ZXNcbiAgICB3aGlsZSAobmV3SGVhZCA8PSBuZXdUYWlsKSB7XG4gICAgICAvLyBGb3IgYWxsIHJlbWFpbmluZyBhZGRpdGlvbnMsIHdlIGluc2VydCBiZWZvcmUgbGFzdCBuZXdcbiAgICAgIC8vIHRhaWwsIHNpbmNlIG9sZCBwb2ludGVycyBhcmUgbm8gbG9uZ2VyIHZhbGlkXG4gICAgICBjb25zdCBuZXdQYXJ0ID0gaW5zZXJ0UGFydChjb250YWluZXJQYXJ0LCBuZXdQYXJ0c1tuZXdUYWlsICsgMV0pO1xuICAgICAgc2V0Q2hpbGRQYXJ0VmFsdWUobmV3UGFydCwgbmV3VmFsdWVzW25ld0hlYWRdKTtcbiAgICAgIG5ld1BhcnRzW25ld0hlYWQrK10gPSBuZXdQYXJ0O1xuICAgIH1cbiAgICAvLyBSZW1vdmUgYW55IHJlbWFpbmluZyB1bnVzZWQgb2xkIHBhcnRzXG4gICAgd2hpbGUgKG9sZEhlYWQgPD0gb2xkVGFpbCkge1xuICAgICAgY29uc3Qgb2xkUGFydCA9IG9sZFBhcnRzW29sZEhlYWQrK107XG4gICAgICBpZiAob2xkUGFydCAhPT0gbnVsbCkge1xuICAgICAgICByZW1vdmVQYXJ0KG9sZFBhcnQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNhdmUgb3JkZXIgb2YgbmV3IHBhcnRzIGZvciBuZXh0IHJvdW5kXG4gICAgdGhpcy5faXRlbUtleXMgPSBuZXdLZXlzO1xuICAgIC8vIERpcmVjdGx5IHNldCBwYXJ0IHZhbHVlLCBieXBhc3NpbmcgaXQncyBkaXJ0eS1jaGVja2luZ1xuICAgIHNldENvbW1pdHRlZFZhbHVlKGNvbnRhaW5lclBhcnQsIG5ld1BhcnRzKTtcbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZXBlYXREaXJlY3RpdmVGbiB7XG4gIDxUPihcbiAgICBpdGVtczogSXRlcmFibGU8VD4sXG4gICAga2V5Rm5PclRlbXBsYXRlOiBLZXlGbjxUPiB8IEl0ZW1UZW1wbGF0ZTxUPixcbiAgICB0ZW1wbGF0ZT86IEl0ZW1UZW1wbGF0ZTxUPlxuICApOiB1bmtub3duO1xuICA8VD4oaXRlbXM6IEl0ZXJhYmxlPFQ+LCB0ZW1wbGF0ZTogSXRlbVRlbXBsYXRlPFQ+KTogdW5rbm93bjtcbiAgPFQ+KFxuICAgIGl0ZW1zOiBJdGVyYWJsZTxUPixcbiAgICBrZXlGbjogS2V5Rm48VD4gfCBJdGVtVGVtcGxhdGU8VD4sXG4gICAgdGVtcGxhdGU6IEl0ZW1UZW1wbGF0ZTxUPlxuICApOiB1bmtub3duO1xufVxuXG4vKipcbiAqIEEgZGlyZWN0aXZlIHRoYXQgcmVwZWF0cyBhIHNlcmllcyBvZiB2YWx1ZXMgKHVzdWFsbHkgYFRlbXBsYXRlUmVzdWx0c2ApXG4gKiBnZW5lcmF0ZWQgZnJvbSBhbiBpdGVyYWJsZSwgYW5kIHVwZGF0ZXMgdGhvc2UgaXRlbXMgZWZmaWNpZW50bHkgd2hlbiB0aGVcbiAqIGl0ZXJhYmxlIGNoYW5nZXMgYmFzZWQgb24gdXNlci1wcm92aWRlZCBga2V5c2AgYXNzb2NpYXRlZCB3aXRoIGVhY2ggaXRlbS5cbiAqXG4gKiBOb3RlIHRoYXQgaWYgYSBga2V5Rm5gIGlzIHByb3ZpZGVkLCBzdHJpY3Qga2V5LXRvLURPTSBtYXBwaW5nIGlzIG1haW50YWluZWQsXG4gKiBtZWFuaW5nIHByZXZpb3VzIERPTSBmb3IgYSBnaXZlbiBrZXkgaXMgbW92ZWQgaW50byB0aGUgbmV3IHBvc2l0aW9uIGlmXG4gKiBuZWVkZWQsIGFuZCBET00gd2lsbCBuZXZlciBiZSByZXVzZWQgd2l0aCB2YWx1ZXMgZm9yIGRpZmZlcmVudCBrZXlzIChuZXcgRE9NXG4gKiB3aWxsIGFsd2F5cyBiZSBjcmVhdGVkIGZvciBuZXcga2V5cykuIFRoaXMgaXMgZ2VuZXJhbGx5IHRoZSBtb3N0IGVmZmljaWVudFxuICogd2F5IHRvIHVzZSBgcmVwZWF0YCBzaW5jZSBpdCBwZXJmb3JtcyBtaW5pbXVtIHVubmVjZXNzYXJ5IHdvcmsgZm9yIGluc2VydGlvbnNcbiAqIGFuZCByZW1vdmFscy5cbiAqXG4gKiBUaGUgYGtleUZuYCB0YWtlcyB0d28gcGFyYW1ldGVycywgdGhlIGl0ZW0gYW5kIGl0cyBpbmRleCwgYW5kIHJldHVybnMgYSB1bmlxdWUga2V5IHZhbHVlLlxuICpcbiAqIGBgYGpzXG4gKiBodG1sYFxuICogICA8b2w+XG4gKiAgICAgJHtyZXBlYXQodGhpcy5pdGVtcywgKGl0ZW0pID0+IGl0ZW0uaWQsIChpdGVtLCBpbmRleCkgPT4ge1xuICogICAgICAgcmV0dXJuIGh0bWxgPGxpPiR7aW5kZXh9OiAke2l0ZW0ubmFtZX08L2xpPmA7XG4gKiAgICAgfSl9XG4gKiAgIDwvb2w+XG4gKiBgXG4gKiBgYGBcbiAqXG4gKiAqKkltcG9ydGFudCoqOiBJZiBwcm92aWRpbmcgYSBga2V5Rm5gLCBrZXlzICptdXN0KiBiZSB1bmlxdWUgZm9yIGFsbCBpdGVtcyBpbiBhXG4gKiBnaXZlbiBjYWxsIHRvIGByZXBlYXRgLiBUaGUgYmVoYXZpb3Igd2hlbiB0d28gb3IgbW9yZSBpdGVtcyBoYXZlIHRoZSBzYW1lIGtleVxuICogaXMgdW5kZWZpbmVkLlxuICpcbiAqIElmIG5vIGBrZXlGbmAgaXMgcHJvdmlkZWQsIHRoaXMgZGlyZWN0aXZlIHdpbGwgcGVyZm9ybSBzaW1pbGFyIHRvIG1hcHBpbmdcbiAqIGl0ZW1zIHRvIHZhbHVlcywgYW5kIERPTSB3aWxsIGJlIHJldXNlZCBhZ2FpbnN0IHBvdGVudGlhbGx5IGRpZmZlcmVudCBpdGVtcy5cbiAqL1xuZXhwb3J0IGNvbnN0IHJlcGVhdCA9IGRpcmVjdGl2ZShSZXBlYXREaXJlY3RpdmUpIGFzIFJlcGVhdERpcmVjdGl2ZUZuO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge1JlcGVhdERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtBdHRyaWJ1dGVQYXJ0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmUsXG4gIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG4gIFBhcnRJbmZvLFxuICBQYXJ0VHlwZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcblxuLyoqXG4gKiBBIGtleS12YWx1ZSBzZXQgb2YgQ1NTIHByb3BlcnRpZXMgYW5kIHZhbHVlcy5cbiAqXG4gKiBUaGUga2V5IHNob3VsZCBiZSBlaXRoZXIgYSB2YWxpZCBDU1MgcHJvcGVydHkgbmFtZSBzdHJpbmcsIGxpa2VcbiAqIGAnYmFja2dyb3VuZC1jb2xvcidgLCBvciBhIHZhbGlkIEphdmFTY3JpcHQgY2FtZWwgY2FzZSBwcm9wZXJ0eSBuYW1lXG4gKiBmb3IgQ1NTU3R5bGVEZWNsYXJhdGlvbiBsaWtlIGBiYWNrZ3JvdW5kQ29sb3JgLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFN0eWxlSW5mbyB7XG4gIFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfCBudW1iZXIgfCB1bmRlZmluZWQgfCBudWxsO1xufVxuXG5jb25zdCBpbXBvcnRhbnQgPSAnaW1wb3J0YW50Jztcbi8vIFRoZSBsZWFkaW5nIHNwYWNlIGlzIGltcG9ydGFudFxuY29uc3QgaW1wb3J0YW50RmxhZyA9ICcgIScgKyBpbXBvcnRhbnQ7XG4vLyBIb3cgbWFueSBjaGFyYWN0ZXJzIHRvIHJlbW92ZSBmcm9tIGEgdmFsdWUsIGFzIGEgbmVnYXRpdmUgbnVtYmVyXG5jb25zdCBmbGFnVHJpbSA9IDAgLSBpbXBvcnRhbnRGbGFnLmxlbmd0aDtcblxuY2xhc3MgU3R5bGVNYXBEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBwcml2YXRlIF9wcmV2aW91c1N0eWxlUHJvcGVydGllcz86IFNldDxzdHJpbmc+O1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAoXG4gICAgICBwYXJ0SW5mby50eXBlICE9PSBQYXJ0VHlwZS5BVFRSSUJVVEUgfHxcbiAgICAgIHBhcnRJbmZvLm5hbWUgIT09ICdzdHlsZScgfHxcbiAgICAgIChwYXJ0SW5mby5zdHJpbmdzPy5sZW5ndGggYXMgbnVtYmVyKSA+IDJcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1RoZSBgc3R5bGVNYXBgIGRpcmVjdGl2ZSBtdXN0IGJlIHVzZWQgaW4gdGhlIGBzdHlsZWAgYXR0cmlidXRlICcgK1xuICAgICAgICAgICdhbmQgbXVzdCBiZSB0aGUgb25seSBwYXJ0IGluIHRoZSBhdHRyaWJ1dGUuJ1xuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXIoc3R5bGVJbmZvOiBSZWFkb25seTxTdHlsZUluZm8+KSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHN0eWxlSW5mbykucmVkdWNlKChzdHlsZSwgcHJvcCkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBzdHlsZUluZm9bcHJvcF07XG4gICAgICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gc3R5bGU7XG4gICAgICB9XG4gICAgICAvLyBDb252ZXJ0IHByb3BlcnR5IG5hbWVzIGZyb20gY2FtZWwtY2FzZSB0byBkYXNoLWNhc2UsIGkuZS46XG4gICAgICAvLyAgYGJhY2tncm91bmRDb2xvcmAgLT4gYGJhY2tncm91bmQtY29sb3JgXG4gICAgICAvLyBWZW5kb3ItcHJlZml4ZWQgbmFtZXMgbmVlZCBhbiBleHRyYSBgLWAgYXBwZW5kZWQgdG8gZnJvbnQ6XG4gICAgICAvLyAgYHdlYmtpdEFwcGVhcmFuY2VgIC0+IGAtd2Via2l0LWFwcGVhcmFuY2VgXG4gICAgICAvLyBFeGNlcHRpb24gaXMgYW55IHByb3BlcnR5IG5hbWUgY29udGFpbmluZyBhIGRhc2gsIGluY2x1ZGluZ1xuICAgICAgLy8gY3VzdG9tIHByb3BlcnRpZXM7IHdlIGFzc3VtZSB0aGVzZSBhcmUgYWxyZWFkeSBkYXNoLWNhc2VkIGkuZS46XG4gICAgICAvLyAgYC0tbXktYnV0dG9uLWNvbG9yYCAtLT4gYC0tbXktYnV0dG9uLWNvbG9yYFxuICAgICAgcHJvcCA9IHByb3AuaW5jbHVkZXMoJy0nKVxuICAgICAgICA/IHByb3BcbiAgICAgICAgOiBwcm9wXG4gICAgICAgICAgICAucmVwbGFjZSgvKD86Xih3ZWJraXR8bW96fG1zfG8pfCkoPz1bQS1aXSkvZywgJy0kJicpXG4gICAgICAgICAgICAudG9Mb3dlckNhc2UoKTtcbiAgICAgIHJldHVybiBzdHlsZSArIGAke3Byb3B9OiR7dmFsdWV9O2A7XG4gICAgfSwgJycpO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IEF0dHJpYnV0ZVBhcnQsIFtzdHlsZUluZm9dOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgY29uc3Qge3N0eWxlfSA9IHBhcnQuZWxlbWVudCBhcyBIVE1MRWxlbWVudDtcblxuICAgIGlmICh0aGlzLl9wcmV2aW91c1N0eWxlUHJvcGVydGllcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9wcmV2aW91c1N0eWxlUHJvcGVydGllcyA9IG5ldyBTZXQoT2JqZWN0LmtleXMoc3R5bGVJbmZvKSk7XG4gICAgICByZXR1cm4gdGhpcy5yZW5kZXIoc3R5bGVJbmZvKTtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgb2xkIHByb3BlcnRpZXMgdGhhdCBubyBsb25nZXIgZXhpc3QgaW4gc3R5bGVJbmZvXG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzKSB7XG4gICAgICAvLyBJZiB0aGUgbmFtZSBpc24ndCBpbiBzdHlsZUluZm8gb3IgaXQncyBudWxsL3VuZGVmaW5lZFxuICAgICAgaWYgKHN0eWxlSW5mb1tuYW1lXSA9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzIS5kZWxldGUobmFtZSk7XG4gICAgICAgIGlmIChuYW1lLmluY2x1ZGVzKCctJykpIHtcbiAgICAgICAgICBzdHlsZS5yZW1vdmVQcm9wZXJ0eShuYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICAgIChzdHlsZSBhcyBhbnkpW25hbWVdID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFkZCBvciB1cGRhdGUgcHJvcGVydGllc1xuICAgIGZvciAoY29uc3QgbmFtZSBpbiBzdHlsZUluZm8pIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gc3R5bGVJbmZvW25hbWVdO1xuICAgICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5fcHJldmlvdXNTdHlsZVByb3BlcnRpZXMuYWRkKG5hbWUpO1xuICAgICAgICBjb25zdCBpc0ltcG9ydGFudCA9XG4gICAgICAgICAgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJiB2YWx1ZS5lbmRzV2l0aChpbXBvcnRhbnRGbGFnKTtcbiAgICAgICAgaWYgKG5hbWUuaW5jbHVkZXMoJy0nKSB8fCBpc0ltcG9ydGFudCkge1xuICAgICAgICAgIHN0eWxlLnNldFByb3BlcnR5KFxuICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgIGlzSW1wb3J0YW50XG4gICAgICAgICAgICAgID8gKHZhbHVlIGFzIHN0cmluZykuc2xpY2UoMCwgZmxhZ1RyaW0pXG4gICAgICAgICAgICAgIDogKHZhbHVlIGFzIHN0cmluZyksXG4gICAgICAgICAgICBpc0ltcG9ydGFudCA/IGltcG9ydGFudCA6ICcnXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICAgIChzdHlsZSBhcyBhbnkpW25hbWVdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG59XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCBhcHBsaWVzIENTUyBwcm9wZXJ0aWVzIHRvIGFuIGVsZW1lbnQuXG4gKlxuICogYHN0eWxlTWFwYCBjYW4gb25seSBiZSB1c2VkIGluIHRoZSBgc3R5bGVgIGF0dHJpYnV0ZSBhbmQgbXVzdCBiZSB0aGUgb25seVxuICogZXhwcmVzc2lvbiBpbiB0aGUgYXR0cmlidXRlLiBJdCB0YWtlcyB0aGUgcHJvcGVydHkgbmFtZXMgaW4gdGhlXG4gKiB7QGxpbmsgU3R5bGVJbmZvIHN0eWxlSW5mb30gb2JqZWN0IGFuZCBhZGRzIHRoZSBwcm9wZXJ0aWVzIHRvIHRoZSBpbmxpbmVcbiAqIHN0eWxlIG9mIHRoZSBlbGVtZW50LlxuICpcbiAqIFByb3BlcnR5IG5hbWVzIHdpdGggZGFzaGVzIChgLWApIGFyZSBhc3N1bWVkIHRvIGJlIHZhbGlkIENTU1xuICogcHJvcGVydHkgbmFtZXMgYW5kIHNldCBvbiB0aGUgZWxlbWVudCdzIHN0eWxlIG9iamVjdCB1c2luZyBgc2V0UHJvcGVydHkoKWAuXG4gKiBOYW1lcyB3aXRob3V0IGRhc2hlcyBhcmUgYXNzdW1lZCB0byBiZSBjYW1lbENhc2VkIEphdmFTY3JpcHQgcHJvcGVydHkgbmFtZXNcbiAqIGFuZCBzZXQgb24gdGhlIGVsZW1lbnQncyBzdHlsZSBvYmplY3QgdXNpbmcgcHJvcGVydHkgYXNzaWdubWVudCwgYWxsb3dpbmcgdGhlXG4gKiBzdHlsZSBvYmplY3QgdG8gdHJhbnNsYXRlIEphdmFTY3JpcHQtc3R5bGUgbmFtZXMgdG8gQ1NTIHByb3BlcnR5IG5hbWVzLlxuICpcbiAqIEZvciBleGFtcGxlIGBzdHlsZU1hcCh7YmFja2dyb3VuZENvbG9yOiAncmVkJywgJ2JvcmRlci10b3AnOiAnNXB4JywgJy0tc2l6ZSc6XG4gKiAnMCd9KWAgc2V0cyB0aGUgYGJhY2tncm91bmQtY29sb3JgLCBgYm9yZGVyLXRvcGAgYW5kIGAtLXNpemVgIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHN0eWxlSW5mb1xuICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9saXQuZGV2L2RvY3MvdGVtcGxhdGVzL2RpcmVjdGl2ZXMvI3N0eWxlbWFwIHN0eWxlTWFwIGNvZGUgc2FtcGxlcyBvbiBMaXQuZGV2fVxuICovXG5leHBvcnQgY29uc3Qgc3R5bGVNYXAgPSBkaXJlY3RpdmUoU3R5bGVNYXBEaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge1N0eWxlTWFwRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge25vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgRGlyZWN0aXZlLCBQYXJ0SW5mbywgUGFydFR5cGV9IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5cbmNsYXNzIFRlbXBsYXRlQ29udGVudERpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX3ByZXZpb3VzVGVtcGxhdGU/OiBIVE1MVGVtcGxhdGVFbGVtZW50O1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAocGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQ0hJTEQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigndGVtcGxhdGVDb250ZW50IGNhbiBvbmx5IGJlIHVzZWQgaW4gY2hpbGQgYmluZGluZ3MnKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXIodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQpIHtcbiAgICBpZiAodGhpcy5fcHJldmlvdXNUZW1wbGF0ZSA9PT0gdGVtcGxhdGUpIHtcbiAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICB9XG4gICAgdGhpcy5fcHJldmlvdXNUZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICAgIHJldHVybiBkb2N1bWVudC5pbXBvcnROb2RlKHRlbXBsYXRlLmNvbnRlbnQsIHRydWUpO1xuICB9XG59XG5cbi8qKlxuICogUmVuZGVycyB0aGUgY29udGVudCBvZiBhIHRlbXBsYXRlIGVsZW1lbnQgYXMgSFRNTC5cbiAqXG4gKiBOb3RlLCB0aGUgdGVtcGxhdGUgc2hvdWxkIGJlIGRldmVsb3BlciBjb250cm9sbGVkIGFuZCBub3QgdXNlciBjb250cm9sbGVkLlxuICogUmVuZGVyaW5nIGEgdXNlci1jb250cm9sbGVkIHRlbXBsYXRlIHdpdGggdGhpcyBkaXJlY3RpdmVcbiAqIGNvdWxkIGxlYWQgdG8gY3Jvc3Mtc2l0ZS1zY3JpcHRpbmcgdnVsbmVyYWJpbGl0aWVzLlxuICovXG5leHBvcnQgY29uc3QgdGVtcGxhdGVDb250ZW50ID0gZGlyZWN0aXZlKFRlbXBsYXRlQ29udGVudERpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7VGVtcGxhdGVDb250ZW50RGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge25vdGhpbmcsIFRlbXBsYXRlUmVzdWx0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIERpcmVjdGl2ZSwgUGFydEluZm8sIFBhcnRUeXBlfSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuXG5jb25zdCBIVE1MX1JFU1VMVCA9IDE7XG5cbmV4cG9ydCBjbGFzcyBVbnNhZmVIVE1MRGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgc3RhdGljIGRpcmVjdGl2ZU5hbWUgPSAndW5zYWZlSFRNTCc7XG4gIHN0YXRpYyByZXN1bHRUeXBlID0gSFRNTF9SRVNVTFQ7XG5cbiAgcHJpdmF0ZSBfdmFsdWU6IHVua25vd24gPSBub3RoaW5nO1xuICBwcml2YXRlIF90ZW1wbGF0ZVJlc3VsdD86IFRlbXBsYXRlUmVzdWx0O1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAocGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQ0hJTEQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYCR7XG4gICAgICAgICAgKHRoaXMuY29uc3RydWN0b3IgYXMgdHlwZW9mIFVuc2FmZUhUTUxEaXJlY3RpdmUpLmRpcmVjdGl2ZU5hbWVcbiAgICAgICAgfSgpIGNhbiBvbmx5IGJlIHVzZWQgaW4gY2hpbGQgYmluZGluZ3NgXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlcih2YWx1ZTogc3RyaW5nIHwgdHlwZW9mIG5vdGhpbmcgfCB0eXBlb2Ygbm9DaGFuZ2UgfCB1bmRlZmluZWQgfCBudWxsKSB7XG4gICAgaWYgKHZhbHVlID09PSBub3RoaW5nIHx8IHZhbHVlID09IG51bGwpIHtcbiAgICAgIHRoaXMuX3RlbXBsYXRlUmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgICAgcmV0dXJuICh0aGlzLl92YWx1ZSA9IHZhbHVlKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlID09PSBub0NoYW5nZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHZhbHVlICE9ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGAke1xuICAgICAgICAgICh0aGlzLmNvbnN0cnVjdG9yIGFzIHR5cGVvZiBVbnNhZmVIVE1MRGlyZWN0aXZlKS5kaXJlY3RpdmVOYW1lXG4gICAgICAgIH0oKSBjYWxsZWQgd2l0aCBhIG5vbi1zdHJpbmcgdmFsdWVgXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAodmFsdWUgPT09IHRoaXMuX3ZhbHVlKSB7XG4gICAgICByZXR1cm4gdGhpcy5fdGVtcGxhdGVSZXN1bHQ7XG4gICAgfVxuICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gICAgY29uc3Qgc3RyaW5ncyA9IFt2YWx1ZV0gYXMgdW5rbm93biBhcyBUZW1wbGF0ZVN0cmluZ3NBcnJheTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIChzdHJpbmdzIGFzIGFueSkucmF3ID0gc3RyaW5ncztcbiAgICAvLyBXQVJOSU5HOiBpbXBlcnNvbmF0aW5nIGEgVGVtcGxhdGVSZXN1bHQgbGlrZSB0aGlzIGlzIGV4dHJlbWVseVxuICAgIC8vIGRhbmdlcm91cy4gVGhpcmQtcGFydHkgZGlyZWN0aXZlcyBzaG91bGQgbm90IGRvIHRoaXMuXG4gICAgcmV0dXJuICh0aGlzLl90ZW1wbGF0ZVJlc3VsdCA9IHtcbiAgICAgIC8vIENhc3QgdG8gYSBrbm93biBzZXQgb2YgaW50ZWdlcnMgdGhhdCBzYXRpc2Z5IFJlc3VsdFR5cGUgc28gdGhhdCB3ZVxuICAgICAgLy8gZG9uJ3QgaGF2ZSB0byBleHBvcnQgUmVzdWx0VHlwZSBhbmQgcG9zc2libHkgZW5jb3VyYWdlIHRoaXMgcGF0dGVybi5cbiAgICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgICBbJ18kbGl0VHlwZSQnXTogKHRoaXMuY29uc3RydWN0b3IgYXMgdHlwZW9mIFVuc2FmZUhUTUxEaXJlY3RpdmUpXG4gICAgICAgIC5yZXN1bHRUeXBlIGFzIDEgfCAyLFxuICAgICAgc3RyaW5ncyxcbiAgICAgIHZhbHVlczogW10sXG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW5kZXJzIHRoZSByZXN1bHQgYXMgSFRNTCwgcmF0aGVyIHRoYW4gdGV4dC5cbiAqXG4gKiBUaGUgdmFsdWVzIGB1bmRlZmluZWRgLCBgbnVsbGAsIGFuZCBgbm90aGluZ2AsIHdpbGwgYWxsIHJlc3VsdCBpbiBubyBjb250ZW50XG4gKiAoZW1wdHkgc3RyaW5nKSBiZWluZyByZW5kZXJlZC5cbiAqXG4gKiBOb3RlLCB0aGlzIGlzIHVuc2FmZSB0byB1c2Ugd2l0aCBhbnkgdXNlci1wcm92aWRlZCBpbnB1dCB0aGF0IGhhc24ndCBiZWVuXG4gKiBzYW5pdGl6ZWQgb3IgZXNjYXBlZCwgYXMgaXQgbWF5IGxlYWQgdG8gY3Jvc3Mtc2l0ZS1zY3JpcHRpbmdcbiAqIHZ1bG5lcmFiaWxpdGllcy5cbiAqL1xuZXhwb3J0IGNvbnN0IHVuc2FmZUhUTUwgPSBkaXJlY3RpdmUoVW5zYWZlSFRNTERpcmVjdGl2ZSk7XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtkaXJlY3RpdmV9IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge1Vuc2FmZUhUTUxEaXJlY3RpdmV9IGZyb20gJy4vdW5zYWZlLWh0bWwuanMnO1xuXG5jb25zdCBTVkdfUkVTVUxUID0gMjtcblxuY2xhc3MgVW5zYWZlU1ZHRGlyZWN0aXZlIGV4dGVuZHMgVW5zYWZlSFRNTERpcmVjdGl2ZSB7XG4gIHN0YXRpYyBvdmVycmlkZSBkaXJlY3RpdmVOYW1lID0gJ3Vuc2FmZVNWRyc7XG4gIHN0YXRpYyBvdmVycmlkZSByZXN1bHRUeXBlID0gU1ZHX1JFU1VMVDtcbn1cblxuLyoqXG4gKiBSZW5kZXJzIHRoZSByZXN1bHQgYXMgU1ZHLCByYXRoZXIgdGhhbiB0ZXh0LlxuICpcbiAqIFRoZSB2YWx1ZXMgYHVuZGVmaW5lZGAsIGBudWxsYCwgYW5kIGBub3RoaW5nYCwgd2lsbCBhbGwgcmVzdWx0IGluIG5vIGNvbnRlbnRcbiAqIChlbXB0eSBzdHJpbmcpIGJlaW5nIHJlbmRlcmVkLlxuICpcbiAqIE5vdGUsIHRoaXMgaXMgdW5zYWZlIHRvIHVzZSB3aXRoIGFueSB1c2VyLXByb3ZpZGVkIGlucHV0IHRoYXQgaGFzbid0IGJlZW5cbiAqIHNhbml0aXplZCBvciBlc2NhcGVkLCBhcyBpdCBtYXkgbGVhZCB0byBjcm9zcy1zaXRlLXNjcmlwdGluZ1xuICogdnVsbmVyYWJpbGl0aWVzLlxuICovXG5leHBvcnQgY29uc3QgdW5zYWZlU1ZHID0gZGlyZWN0aXZlKFVuc2FmZVNWR0RpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7VW5zYWZlU1ZHRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge1BhcnQsIG5vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2lzUHJpbWl0aXZlfSBmcm9tICcuLi9kaXJlY3RpdmUtaGVscGVycy5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgQXN5bmNEaXJlY3RpdmV9IGZyb20gJy4uL2FzeW5jLWRpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge1BhdXNlciwgUHNldWRvV2Vha1JlZn0gZnJvbSAnLi9wcml2YXRlLWFzeW5jLWhlbHBlcnMuanMnO1xuXG5jb25zdCBpc1Byb21pc2UgPSAoeDogdW5rbm93bikgPT4ge1xuICByZXR1cm4gIWlzUHJpbWl0aXZlKHgpICYmIHR5cGVvZiAoeCBhcyB7dGhlbj86IHVua25vd259KS50aGVuID09PSAnZnVuY3Rpb24nO1xufTtcbi8vIEVmZmVjdGl2ZWx5IGluZmluaXR5LCBidXQgYSBTTUkuXG5jb25zdCBfaW5maW5pdHkgPSAweDNmZmZmZmZmO1xuXG5leHBvcnQgY2xhc3MgVW50aWxEaXJlY3RpdmUgZXh0ZW5kcyBBc3luY0RpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX19sYXN0UmVuZGVyZWRJbmRleDogbnVtYmVyID0gX2luZmluaXR5O1xuICBwcml2YXRlIF9fdmFsdWVzOiB1bmtub3duW10gPSBbXTtcbiAgcHJpdmF0ZSBfX3dlYWtUaGlzID0gbmV3IFBzZXVkb1dlYWtSZWYodGhpcyk7XG4gIHByaXZhdGUgX19wYXVzZXIgPSBuZXcgUGF1c2VyKCk7XG5cbiAgcmVuZGVyKC4uLmFyZ3M6IEFycmF5PHVua25vd24+KTogdW5rbm93biB7XG4gICAgcmV0dXJuIGFyZ3MuZmluZCgoeCkgPT4gIWlzUHJvbWlzZSh4KSkgPz8gbm9DaGFuZ2U7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUoX3BhcnQ6IFBhcnQsIGFyZ3M6IEFycmF5PHVua25vd24+KSB7XG4gICAgY29uc3QgcHJldmlvdXNWYWx1ZXMgPSB0aGlzLl9fdmFsdWVzO1xuICAgIGxldCBwcmV2aW91c0xlbmd0aCA9IHByZXZpb3VzVmFsdWVzLmxlbmd0aDtcbiAgICB0aGlzLl9fdmFsdWVzID0gYXJncztcblxuICAgIGNvbnN0IHdlYWtUaGlzID0gdGhpcy5fX3dlYWtUaGlzO1xuICAgIGNvbnN0IHBhdXNlciA9IHRoaXMuX19wYXVzZXI7XG5cbiAgICAvLyBJZiBvdXIgaW5pdGlhbCByZW5kZXIgb2NjdXJzIHdoaWxlIGRpc2Nvbm5lY3RlZCwgZW5zdXJlIHRoYXQgdGhlIHBhdXNlclxuICAgIC8vIGFuZCB3ZWFrVGhpcyBhcmUgaW4gdGhlIGRpc2Nvbm5lY3RlZCBzdGF0ZVxuICAgIGlmICghdGhpcy5pc0Nvbm5lY3RlZCkge1xuICAgICAgdGhpcy5kaXNjb25uZWN0ZWQoKTtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIC8vIElmIHdlJ3ZlIHJlbmRlcmVkIGEgaGlnaGVyLXByaW9yaXR5IHZhbHVlIGFscmVhZHksIHN0b3AuXG4gICAgICBpZiAoaSA+IHRoaXMuX19sYXN0UmVuZGVyZWRJbmRleCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgY29uc3QgdmFsdWUgPSBhcmdzW2ldO1xuXG4gICAgICAvLyBSZW5kZXIgbm9uLVByb21pc2UgdmFsdWVzIGltbWVkaWF0ZWx5XG4gICAgICBpZiAoIWlzUHJvbWlzZSh2YWx1ZSkpIHtcbiAgICAgICAgdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4ID0gaTtcbiAgICAgICAgLy8gU2luY2UgYSBsb3dlci1wcmlvcml0eSB2YWx1ZSB3aWxsIG5ldmVyIG92ZXJ3cml0ZSBhIGhpZ2hlci1wcmlvcml0eVxuICAgICAgICAvLyBzeW5jaHJvbm91cyB2YWx1ZSwgd2UgY2FuIHN0b3AgcHJvY2Vzc2luZyBub3cuXG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhpcyBpcyBhIFByb21pc2Ugd2UndmUgYWxyZWFkeSBoYW5kbGVkLCBza2lwIGl0LlxuICAgICAgaWYgKGkgPCBwcmV2aW91c0xlbmd0aCAmJiB2YWx1ZSA9PT0gcHJldmlvdXNWYWx1ZXNbaV0pIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIFdlIGhhdmUgYSBQcm9taXNlIHRoYXQgd2UgaGF2ZW4ndCBzZWVuIGJlZm9yZSwgc28gcHJpb3JpdGllcyBtYXkgaGF2ZVxuICAgICAgLy8gY2hhbmdlZC4gRm9yZ2V0IHdoYXQgd2UgcmVuZGVyZWQgYmVmb3JlLlxuICAgICAgdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4ID0gX2luZmluaXR5O1xuICAgICAgcHJldmlvdXNMZW5ndGggPSAwO1xuXG4gICAgICAvLyBOb3RlLCB0aGUgY2FsbGJhY2sgYXZvaWRzIGNsb3Npbmcgb3ZlciBgdGhpc2Agc28gdGhhdCB0aGUgZGlyZWN0aXZlXG4gICAgICAvLyBjYW4gYmUgZ2MnZWQgYmVmb3JlIHRoZSBwcm9taXNlIHJlc29sdmVzOyBpbnN0ZWFkIGB0aGlzYCBpcyByZXRyaWV2ZWRcbiAgICAgIC8vIGZyb20gYHdlYWtUaGlzYCwgd2hpY2ggY2FuIGJyZWFrIHRoZSBoYXJkIHJlZmVyZW5jZSBpbiB0aGUgY2xvc3VyZSB3aGVuXG4gICAgICAvLyB0aGUgZGlyZWN0aXZlIGRpc2Nvbm5lY3RzXG4gICAgICBQcm9taXNlLnJlc29sdmUodmFsdWUpLnRoZW4oYXN5bmMgKHJlc3VsdDogdW5rbm93bikgPT4ge1xuICAgICAgICAvLyBJZiB3ZSdyZSBkaXNjb25uZWN0ZWQsIHdhaXQgdW50aWwgd2UncmUgKG1heWJlKSByZWNvbm5lY3RlZFxuICAgICAgICAvLyBUaGUgd2hpbGUgbG9vcCBoZXJlIGhhbmRsZXMgdGhlIGNhc2UgdGhhdCB0aGUgY29ubmVjdGlvbiBzdGF0ZVxuICAgICAgICAvLyB0aHJhc2hlcywgY2F1c2luZyB0aGUgcGF1c2VyIHRvIHJlc3VtZSBhbmQgdGhlbiBnZXQgcmUtcGF1c2VkXG4gICAgICAgIHdoaWxlIChwYXVzZXIuZ2V0KCkpIHtcbiAgICAgICAgICBhd2FpdCBwYXVzZXIuZ2V0KCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgdGhlIGNhbGxiYWNrIGdldHMgaGVyZSBhbmQgdGhlcmUgaXMgbm8gYHRoaXNgLCBpdCBtZWFucyB0aGF0IHRoZVxuICAgICAgICAvLyBkaXJlY3RpdmUgaGFzIGJlZW4gZGlzY29ubmVjdGVkIGFuZCBnYXJiYWdlIGNvbGxlY3RlZCBhbmQgd2UgZG9uJ3RcbiAgICAgICAgLy8gbmVlZCB0byBkbyBhbnl0aGluZyBlbHNlXG4gICAgICAgIGNvbnN0IF90aGlzID0gd2Vha1RoaXMuZGVyZWYoKTtcbiAgICAgICAgaWYgKF90aGlzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb25zdCBpbmRleCA9IF90aGlzLl9fdmFsdWVzLmluZGV4T2YodmFsdWUpO1xuICAgICAgICAgIC8vIElmIHN0YXRlLnZhbHVlcyBkb2Vzbid0IGNvbnRhaW4gdGhlIHZhbHVlLCB3ZSd2ZSByZS1yZW5kZXJlZCB3aXRob3V0XG4gICAgICAgICAgLy8gdGhlIHZhbHVlLCBzbyBkb24ndCByZW5kZXIgaXQuIFRoZW4sIG9ubHkgcmVuZGVyIGlmIHRoZSB2YWx1ZSBpc1xuICAgICAgICAgIC8vIGhpZ2hlci1wcmlvcml0eSB0aGFuIHdoYXQncyBhbHJlYWR5IGJlZW4gcmVuZGVyZWQuXG4gICAgICAgICAgaWYgKGluZGV4ID4gLTEgJiYgaW5kZXggPCBfdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4KSB7XG4gICAgICAgICAgICBfdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgICBfdGhpcy5zZXRWYWx1ZShyZXN1bHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG5cbiAgb3ZlcnJpZGUgZGlzY29ubmVjdGVkKCkge1xuICAgIHRoaXMuX193ZWFrVGhpcy5kaXNjb25uZWN0KCk7XG4gICAgdGhpcy5fX3BhdXNlci5wYXVzZSgpO1xuICB9XG5cbiAgb3ZlcnJpZGUgcmVjb25uZWN0ZWQoKSB7XG4gICAgdGhpcy5fX3dlYWtUaGlzLnJlY29ubmVjdCh0aGlzKTtcbiAgICB0aGlzLl9fcGF1c2VyLnJlc3VtZSgpO1xuICB9XG59XG5cbi8qKlxuICogUmVuZGVycyBvbmUgb2YgYSBzZXJpZXMgb2YgdmFsdWVzLCBpbmNsdWRpbmcgUHJvbWlzZXMsIHRvIGEgUGFydC5cbiAqXG4gKiBWYWx1ZXMgYXJlIHJlbmRlcmVkIGluIHByaW9yaXR5IG9yZGVyLCB3aXRoIHRoZSBmaXJzdCBhcmd1bWVudCBoYXZpbmcgdGhlXG4gKiBoaWdoZXN0IHByaW9yaXR5IGFuZCB0aGUgbGFzdCBhcmd1bWVudCBoYXZpbmcgdGhlIGxvd2VzdCBwcmlvcml0eS4gSWYgYVxuICogdmFsdWUgaXMgYSBQcm9taXNlLCBsb3ctcHJpb3JpdHkgdmFsdWVzIHdpbGwgYmUgcmVuZGVyZWQgdW50aWwgaXQgcmVzb2x2ZXMuXG4gKlxuICogVGhlIHByaW9yaXR5IG9mIHZhbHVlcyBjYW4gYmUgdXNlZCB0byBjcmVhdGUgcGxhY2Vob2xkZXIgY29udGVudCBmb3IgYXN5bmNcbiAqIGRhdGEuIEZvciBleGFtcGxlLCBhIFByb21pc2Ugd2l0aCBwZW5kaW5nIGNvbnRlbnQgY2FuIGJlIHRoZSBmaXJzdCxcbiAqIGhpZ2hlc3QtcHJpb3JpdHksIGFyZ3VtZW50LCBhbmQgYSBub25fcHJvbWlzZSBsb2FkaW5nIGluZGljYXRvciB0ZW1wbGF0ZSBjYW5cbiAqIGJlIHVzZWQgYXMgdGhlIHNlY29uZCwgbG93ZXItcHJpb3JpdHksIGFyZ3VtZW50LiBUaGUgbG9hZGluZyBpbmRpY2F0b3Igd2lsbFxuICogcmVuZGVyIGltbWVkaWF0ZWx5LCBhbmQgdGhlIHByaW1hcnkgY29udGVudCB3aWxsIHJlbmRlciB3aGVuIHRoZSBQcm9taXNlXG4gKiByZXNvbHZlcy5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBjb25zdCBjb250ZW50ID0gZmV0Y2goJy4vY29udGVudC50eHQnKS50aGVuKHIgPT4gci50ZXh0KCkpO1xuICogaHRtbGAke3VudGlsKGNvbnRlbnQsIGh0bWxgPHNwYW4+TG9hZGluZy4uLjwvc3Bhbj5gKX1gXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHVudGlsID0gZGlyZWN0aXZlKFVudGlsRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbi8vIGV4cG9ydCB0eXBlIHtVbnRpbERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxudHlwZSBGYWxzeSA9IG51bGwgfCB1bmRlZmluZWQgfCBmYWxzZSB8IDAgfCAtMCB8IDBuIHwgJyc7XG5cbi8qKlxuICogV2hlbiBgY29uZGl0aW9uYCBpcyB0cnVlLCByZXR1cm5zIHRoZSByZXN1bHQgb2YgY2FsbGluZyBgdHJ1ZUNhc2UoKWAsIGVsc2VcbiAqIHJldHVybnMgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIGBmYWxzZUNhc2UoKWAgaWYgYGZhbHNlQ2FzZWAgaXMgZGVmaW5lZC5cbiAqXG4gKiBUaGlzIGlzIGEgY29udmVuaWVuY2Ugd3JhcHBlciBhcm91bmQgYSB0ZXJuYXJ5IGV4cHJlc3Npb24gdGhhdCBtYWtlcyBpdCBhXG4gKiBsaXR0bGUgbmljZXIgdG8gd3JpdGUgYW4gaW5saW5lIGNvbmRpdGlvbmFsIHdpdGhvdXQgYW4gZWxzZS5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiByZW5kZXIoKSB7XG4gKiAgIHJldHVybiBodG1sYFxuICogICAgICR7d2hlbih0aGlzLnVzZXIsICgpID0+IGh0bWxgVXNlcjogJHt0aGlzLnVzZXIudXNlcm5hbWV9YCwgKCkgPT4gaHRtbGBTaWduIEluLi4uYCl9XG4gKiAgIGA7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdoZW48QyBleHRlbmRzIEZhbHN5LCBULCBGID0gdW5kZWZpbmVkPihcbiAgY29uZGl0aW9uOiBDLFxuICB0cnVlQ2FzZTogKGM6IEMpID0+IFQsXG4gIGZhbHNlQ2FzZT86IChjOiBDKSA9PiBGXG4pOiBGO1xuZXhwb3J0IGZ1bmN0aW9uIHdoZW48QywgVCwgRj4oXG4gIGNvbmRpdGlvbjogQyBleHRlbmRzIEZhbHN5ID8gbmV2ZXIgOiBDLFxuICB0cnVlQ2FzZTogKGM6IEMpID0+IFQsXG4gIGZhbHNlQ2FzZT86IChjOiBDKSA9PiBGXG4pOiBUO1xuZXhwb3J0IGZ1bmN0aW9uIHdoZW48QywgVCwgRiA9IHVuZGVmaW5lZD4oXG4gIGNvbmRpdGlvbjogQyxcbiAgdHJ1ZUNhc2U6IChjOiBFeGNsdWRlPEMsIEZhbHN5PikgPT4gVCxcbiAgZmFsc2VDYXNlPzogKGM6IEV4dHJhY3Q8QywgRmFsc3k+KSA9PiBGXG4pOiBDIGV4dGVuZHMgRmFsc3kgPyBGIDogVDtcbmV4cG9ydCBmdW5jdGlvbiB3aGVuKFxuICBjb25kaXRpb246IHVua25vd24sXG4gIHRydWVDYXNlOiAoYzogdW5rbm93bikgPT4gdW5rbm93bixcbiAgZmFsc2VDYXNlPzogKGM6IHVua25vd24pID0+IHVua25vd25cbik6IHVua25vd24ge1xuICByZXR1cm4gY29uZGl0aW9uID8gdHJ1ZUNhc2UoY29uZGl0aW9uKSA6IGZhbHNlQ2FzZT8uKGNvbmRpdGlvbik7XG59XG4iLCJleHBvcnQge1xuICAgIFRlbXBsYXRlUmVzdWx0LFxuICAgIEhUTUxUZW1wbGF0ZVJlc3VsdCxcbiAgICBTVkdUZW1wbGF0ZVJlc3VsdCxcbiAgICBSZW5kZXJPcHRpb25zLFxuICAgIGh0bWwsXG4gICAgc3ZnLFxuICAgIHJlbmRlcixcbiAgICBub0NoYW5nZSxcbiAgICBub3RoaW5nLFxufSBmcm9tICdsaXQtaHRtbCc7XG5cbmV4cG9ydCB7IF8kTEggfSBmcm9tICdsaXQtaHRtbC9wcml2YXRlLXNzci1zdXBwb3J0JztcblxuZXhwb3J0IHtcbiAgICBEaXJlY3RpdmUsXG4gICAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbiAgICBQYXJ0LFxuICAgIFBhcnRJbmZvLFxuICAgIFBhcnRUeXBlLFxuICAgIGRpcmVjdGl2ZSxcbn0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlJztcblxuZXhwb3J0IHsgQXN5bmNEaXJlY3RpdmUgfSBmcm9tICdsaXQtaHRtbC9hc3luYy1kaXJlY3RpdmUnO1xuZXhwb3J0IHsgUmVmLCBjcmVhdGVSZWYgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3JlZic7XG5cbmltcG9ydCB7IGFzeW5jQXBwZW5kIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9hc3luYy1hcHBlbmQnO1xuaW1wb3J0IHsgYXN5bmNSZXBsYWNlIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9hc3luYy1yZXBsYWNlJztcbmltcG9ydCB7IGNhY2hlIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9jYWNoZSc7XG5pbXBvcnQgeyBjaG9vc2UgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2Nob29zZSc7XG5pbXBvcnQgeyBjbGFzc01hcCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvY2xhc3MtbWFwJztcbmltcG9ydCB7IGd1YXJkIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9ndWFyZCc7XG5pbXBvcnQgeyBpZkRlZmluZWQgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2lmLWRlZmluZWQnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvam9pbic7XG5pbXBvcnQgeyBrZXllZCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMva2V5ZWQnO1xuaW1wb3J0IHsgbGl2ZSB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvbGl2ZSc7XG5pbXBvcnQgeyBtYXAgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL21hcCc7XG5pbXBvcnQgeyByYW5nZSB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvcmFuZ2UnO1xuaW1wb3J0IHsgcmVmIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9yZWYnO1xuaW1wb3J0IHsgcmVwZWF0IH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9yZXBlYXQnO1xuaW1wb3J0IHsgc3R5bGVNYXAgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3N0eWxlLW1hcCc7XG5pbXBvcnQgeyB0ZW1wbGF0ZUNvbnRlbnQgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3RlbXBsYXRlLWNvbnRlbnQnO1xuaW1wb3J0IHsgdW5zYWZlSFRNTCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvdW5zYWZlLWh0bWwnO1xuaW1wb3J0IHsgdW5zYWZlU1ZHIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy91bnNhZmUtc3ZnJztcbmltcG9ydCB7IHVudGlsIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy91bnRpbCc7XG5pbXBvcnQgeyB3aGVuIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy93aGVuJztcblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbmRlY2xhcmUgbmFtZXNwYWNlIGRpcmVjdGl2ZXMge1xuICAgIGV4cG9ydCB0eXBlIGFzeW5jQXBwZW5kID0gdHlwZW9mIGFzeW5jQXBwZW5kO1xuICAgIGV4cG9ydCB0eXBlIGFzeW5jUmVwbGFjZSA9IHR5cGVvZiBhc3luY1JlcGxhY2U7XG4gICAgZXhwb3J0IHR5cGUgY2FjaGUgPSB0eXBlb2YgY2FjaGU7XG4gICAgZXhwb3J0IHR5cGUgY2hvb3NlID0gdHlwZW9mIGNob29zZTtcbiAgICBleHBvcnQgdHlwZSBjbGFzc01hcCA9IHR5cGVvZiBjbGFzc01hcDtcbiAgICBleHBvcnQgdHlwZSBndWFyZCA9IHR5cGVvZiBndWFyZDtcbiAgICBleHBvcnQgdHlwZSBpZkRlZmluZWQgPSB0eXBlb2YgaWZEZWZpbmVkO1xuICAgIGV4cG9ydCB0eXBlIGpvaW4gPSB0eXBlb2Ygam9pbjtcbiAgICBleHBvcnQgdHlwZSBrZXllZCA9IHR5cGVvZiBrZXllZDtcbiAgICBleHBvcnQgdHlwZSBsaXZlID0gdHlwZW9mIGxpdmU7XG4gICAgZXhwb3J0IHR5cGUgbWFwID0gdHlwZW9mIG1hcDtcbiAgICBleHBvcnQgdHlwZSByYW5nZSA9IHR5cGVvZiByYW5nZTtcbiAgICBleHBvcnQgdHlwZSByZWYgPSB0eXBlb2YgcmVmO1xuICAgIGV4cG9ydCB0eXBlIHJlcGVhdCA9IHR5cGVvZiByZXBlYXQ7XG4gICAgZXhwb3J0IHR5cGUgc3R5bGVNYXAgPSB0eXBlb2Ygc3R5bGVNYXA7XG4gICAgZXhwb3J0IHR5cGUgdGVtcGxhdGVDb250ZW50ID0gdHlwZW9mIHRlbXBsYXRlQ29udGVudDtcbiAgICBleHBvcnQgdHlwZSB1bnNhZmVIVE1MID0gdHlwZW9mIHVuc2FmZUhUTUw7XG4gICAgZXhwb3J0IHR5cGUgdW5zYWZlU1ZHID0gdHlwZW9mIHVuc2FmZVNWRztcbiAgICBleHBvcnQgdHlwZSB1bnRpbCA9IHR5cGVvZiB1bnRpbDtcbiAgICBleHBvcnQgdHlwZSB3aGVuID0gdHlwZW9mIHdoZW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVEaXJlY3RpdmVzIHtcbiAgICBhc3luY0FwcGVuZDogZGlyZWN0aXZlcy5hc3luY0FwcGVuZDtcbiAgICBhc3luY1JlcGxhY2U6IGRpcmVjdGl2ZXMuYXN5bmNSZXBsYWNlO1xuICAgIGNhY2hlOiBkaXJlY3RpdmVzLmNhY2hlO1xuICAgIGNob29zZTogZGlyZWN0aXZlcy5jaG9vc2U7XG4gICAgY2xhc3NNYXA6IGRpcmVjdGl2ZXMuY2xhc3NNYXA7XG4gICAgZ3VhcmQ6IGRpcmVjdGl2ZXMuZ3VhcmQ7XG4gICAgaWZEZWZpbmVkOiBkaXJlY3RpdmVzLmlmRGVmaW5lZDtcbiAgICBqb2luOiBkaXJlY3RpdmVzLmpvaW47XG4gICAga2V5ZWQ6IGRpcmVjdGl2ZXMua2V5ZWQ7XG4gICAgbGl2ZTogZGlyZWN0aXZlcy5saXZlO1xuICAgIG1hcDogZGlyZWN0aXZlcy5tYXA7XG4gICAgcmFuZ2U6IGRpcmVjdGl2ZXMucmFuZ2U7XG4gICAgcmVmOiBkaXJlY3RpdmVzLnJlZjtcbiAgICByZXBlYXQ6IGRpcmVjdGl2ZXMucmVwZWF0O1xuICAgIHN0eWxlTWFwOiBkaXJlY3RpdmVzLnN0eWxlTWFwO1xuICAgIHRlbXBsYXRlQ29udGVudDogZGlyZWN0aXZlcy50ZW1wbGF0ZUNvbnRlbnQ7XG4gICAgdW5zYWZlSFRNTDogZGlyZWN0aXZlcy51bnNhZmVIVE1MO1xuICAgIHVuc2FmZVNWRzogZGlyZWN0aXZlcy51bnNhZmVTVkc7XG4gICAgdW50aWw6IGRpcmVjdGl2ZXMudW50aWw7XG4gICAgd2hlbjogZGlyZWN0aXZlcy53aGVuO1xufVxuXG5leHBvcnQgY29uc3QgZGlyZWN0aXZlczogVGVtcGxhdGVEaXJlY3RpdmVzID0ge1xuICAgIGFzeW5jQXBwZW5kLFxuICAgIGFzeW5jUmVwbGFjZSxcbiAgICBjYWNoZSxcbiAgICBjaG9vc2UsXG4gICAgY2xhc3NNYXAsXG4gICAgZ3VhcmQsXG4gICAgaWZEZWZpbmVkLFxuICAgIGpvaW4sXG4gICAga2V5ZWQsXG4gICAgbGl2ZSxcbiAgICBtYXAsXG4gICAgcmFuZ2UsXG4gICAgcmVmLFxuICAgIHJlcGVhdCxcbiAgICBzdHlsZU1hcCxcbiAgICB0ZW1wbGF0ZUNvbnRlbnQsXG4gICAgdW5zYWZlSFRNTCxcbiAgICB1bnNhZmVTVkcsXG4gICAgdW50aWwsXG4gICAgd2hlbixcbn07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZnJvbSBgc3RyaW5nYCB0byBgVGVtcGxhdGVTdHJpbmdzQXJyYXlgLiA8YnI+XG4gKiAgICAgVGhpcyBtZXRob2QgaXMgaGVscGVyIGJyaWdkZ2UgZm9yIHRoZSB7QGxpbmsgaHRtbH0gb3IgdGhlIHtAbGluayBzdmd9IGFyZSBhYmxlIHRvIHJlY2VpdmVkIHBsYWluIHN0cmluZy5cbiAqIEBqYSBgc3RyaW5nYCDjgpIgYFRlbXBsYXRlU3RyaW5nc0FycmF5YOOBq+WkieaPmy4gPGJyPlxuICogICAgIHtAbGluayBodG1sfSDjgoQge0BsaW5rIHN2Z30g44GM5paH5a2X5YiX44KS5Y+X44GR5LuY44GR44KL44Gf44KB44Gu44OW44Oq44OD44K444Oh44K944OD44OJXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyB0b1RlbXBsYXRlU3RyaW5nc0FycmF5IGFzIGJyaWRnZSB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogY29uc3QgcmF3ID0gJzxwPkhlbGxvIFJhdyBTdHJpbmc8L3A+JztcbiAqIHJlbmRlcihodG1sKGJyaWRnZShyYXcpKSwgZG9jdW1lbnQuYm9keSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHBsYWluIHN0cmluZyAvIHN0cmluZyBhcnJheS4gZXgpIHtAbGluayBKU1R9IHJldHVybmVkIHZhbHVlLlxuICogIC0gYGphYCDjg5fjg6zjg7zjg7PmloflrZfliJcgLyDmloflrZfliJfphY3liJcuIGV4KSB7QGxpbmsgSlNUfSDjga7miLvjgorlgKTjgarjganjgpLmg7PlrppcbiAqL1xuZXhwb3J0IGNvbnN0IHRvVGVtcGxhdGVTdHJpbmdzQXJyYXkgPSAoc3JjOiBzdHJpbmcgfCBzdHJpbmdbXSB8IFRlbXBsYXRlU3RyaW5nc0FycmF5KTogVGVtcGxhdGVTdHJpbmdzQXJyYXkgPT4ge1xuICAgIGNvbnN0IHN0cmluZ3MgPSBBcnJheS5pc0FycmF5KHNyYykgPyBzcmMgOiBbc3JjXTtcbiAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzdHJpbmdzLCAncmF3JykpIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHN0cmluZ3MsICdyYXcnLCB7IHZhbHVlOiBzdHJpbmdzIH0pO1xuICAgIH1cbiAgICByZXR1cm4gc3RyaW5ncyBhcyB1bmtub3duIGFzIFRlbXBsYXRlU3RyaW5nc0FycmF5O1xufTtcbiJdLCJuYW1lcyI6WyJ3cmFwIiwiY3JlYXRlTWFya2VyIiwiaXNQcmltaXRpdmUiLCJIVE1MX1JFU1VMVCIsIlNWR19SRVNVTFQiLCJDaGlsZFBhcnQiLCJfJExIIiwicCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7OztJQUlHO0lBVUg7SUFDQSxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUM7SUE0TjFCLE1BQU1BLE1BQUksR0FLSixDQUFpQixJQUFPLEtBQUssSUFBSSxDQUFDO0lBRXhDLE1BQU0sWUFBWSxHQUFJLE1BQTRCLENBQUMsWUFBWSxDQUFDO0lBRWhFOzs7Ozs7O0lBT0c7SUFDSCxNQUFNLE1BQU0sR0FBRyxZQUFZO0lBQ3pCLE1BQUUsWUFBWSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUU7SUFDcEMsUUFBQSxVQUFVLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQztTQUNyQixDQUFDO1VBQ0YsU0FBUyxDQUFDO0lBMEVkO0lBQ0E7SUFDQSxNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQztJQUVyQztJQUNBO0lBQ0E7SUFDQTtJQUNBLE1BQU0sTUFBTSxHQUFHLENBQUEsSUFBQSxFQUFPLE1BQU0sQ0FBQyxJQUFJLENB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O1FBQ0wsTUFBTTtRQUNOLFFBQVE7UUFDUixLQUFLO1FBQ0wsU0FBUztRQUNULElBQUk7UUFDSixLQUFLO1FBQ0wsSUFBSTtRQUNKLEdBQUc7UUFDSCxLQUFLO1FBQ0wsR0FBRztRQUNILE1BQU07UUFDTixRQUFRO1FBQ1IsZUFBZTtRQUNmLFVBQVU7UUFDVixTQUFTO1FBQ1QsS0FBSztRQUNMLElBQUk7TUFDTjtJQUVGOzs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFrQkc7QUFDVSxVQUFBLHNCQUFzQixHQUFHLENBQUMsR0FBNkMsS0FBMEI7SUFDMUcsSUFBQSxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pELElBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUU7SUFDdkQsUUFBQSxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztTQUM3RDtJQUNELElBQUEsT0FBTyxPQUEwQyxDQUFDO0lBQ3REOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOlswLDEsMiwzLDQsNSw2LDcsOCw5LDEwLDExLDEyLDEzLDE0LDE1LDE2LDE3LDE4LDE5LDIwLDIxLDIyLDIzLDI0LDI1XSwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZS8ifQ==