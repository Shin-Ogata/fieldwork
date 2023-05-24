/*!
 * @cdp/extension-template 0.9.17
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
    var _d;
    // Use window for browser builds because IE11 doesn't have globalThis.
    const global = window;
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
        typeof (value === null || value === void 0 ? void 0 : value[Symbol.iterator]) === 'function';
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
    const walker = d.createTreeWalker(d, 129 /* NodeFilter.SHOW_{ELEMENT|COMMENT} */, null, false);
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
                        regex = rawTextEndRegex !== null && rawTextEndRegex !== void 0 ? rawTextEndRegex : textEndRegex;
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
                        : s +
                            marker +
                            (attrNameEndIndex === -2 ? (attrNames.push(undefined), i) : end);
        }
        const htmlResult = html + (strings[l] || '<?>') + (type === SVG_RESULT$1 ? '</svg>' : '');
        // A security check to prevent spoofing of Lit template results.
        // In the future, we may be able to replace this with Array.isTemplateObject,
        // though we might need to make that check inside of the html and svg
        // functions, because precompiled templates don't come in as
        // TemplateStringArray objects.
        if (!Array.isArray(strings) || !strings.hasOwnProperty('raw')) {
            let message = 'invalid template strings array';
            throw new Error(message);
        }
        // Returned as an array for terseness
        return [
            policy !== undefined
                ? policy.createHTML(htmlResult)
                : htmlResult,
            attrNames,
        ];
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
            // Reparent SVG nodes into template root
            if (type === SVG_RESULT$1) {
                const content = this.el.content;
                const svgElement = content.firstChild;
                svgElement.remove();
                content.append(...svgElement.childNodes);
            }
            // Walk the template to find binding markers and create TemplateParts
            while ((node = walker.nextNode()) !== null && parts.length < partCount) {
                if (node.nodeType === 1) {
                    // TODO (justinfagnani): for attempted dynamic tag names, we don't
                    // increment the bindingIndex, and it'll be off by 1 in the element
                    // and off by two after it.
                    if (node.hasAttributes()) {
                        // We defer removing bound attributes because on IE we might not be
                        // iterating attributes in their template order, and would sometimes
                        // remove an attribute that we still need to create a part for.
                        const attrsToRemove = [];
                        for (const name of node.getAttributeNames()) {
                            // `name` is the name of the attribute we're iterating over, but not
                            // _necessarily_ the name of the attribute we will create a part
                            // for. They can be different in browsers that don't iterate on
                            // attributes in source order. In that case the attrNames array
                            // contains the attribute name we'll process next. We only need the
                            // attribute name here to know if we should process a bound attribute
                            // on this element.
                            if (name.endsWith(boundAttributeSuffix) ||
                                name.startsWith(marker)) {
                                const realName = attrNames[attrNameIndex++];
                                attrsToRemove.push(name);
                                if (realName !== undefined) {
                                    // Lowercase for case-sensitive SVG attributes like viewBox
                                    const value = node.getAttribute(realName.toLowerCase() + boundAttributeSuffix);
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
                                }
                                else {
                                    parts.push({
                                        type: ELEMENT_PART,
                                        index: nodeIndex,
                                    });
                                }
                            }
                        }
                        for (const name of attrsToRemove) {
                            node.removeAttribute(name);
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
        var _a, _b, _c;
        var _d;
        // Bail early if the value is explicitly noChange. Note, this means any
        // nested directive is still attached and is not run.
        if (value === noChange) {
            return value;
        }
        let currentDirective = attributeIndex !== undefined
            ? (_a = parent.__directives) === null || _a === void 0 ? void 0 : _a[attributeIndex]
            : parent.__directive;
        const nextDirectiveConstructor = isPrimitive$1(value)
            ? undefined
            : // This property needs to remain unminified.
                value['_$litDirective$'];
        if ((currentDirective === null || currentDirective === void 0 ? void 0 : currentDirective.constructor) !== nextDirectiveConstructor) {
            // This property needs to remain unminified.
            (_b = currentDirective === null || currentDirective === void 0 ? void 0 : currentDirective['_$notifyDirectiveConnectionChanged']) === null || _b === void 0 ? void 0 : _b.call(currentDirective, false);
            if (nextDirectiveConstructor === undefined) {
                currentDirective = undefined;
            }
            else {
                currentDirective = new nextDirectiveConstructor(part);
                currentDirective._$initialize(part, parent, attributeIndex);
            }
            if (attributeIndex !== undefined) {
                ((_c = (_d = parent).__directives) !== null && _c !== void 0 ? _c : (_d.__directives = []))[attributeIndex] =
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
            var _a;
            const { el: { content }, parts: parts, } = this._$template;
            const fragment = ((_a = options === null || options === void 0 ? void 0 : options.creationScope) !== null && _a !== void 0 ? _a : d).importNode(content, true);
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
                if (nodeIndex !== (templatePart === null || templatePart === void 0 ? void 0 : templatePart.index)) {
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
        constructor(startNode, endNode, parent, options) {
            var _a;
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
            this.__isConnected = (_a = options === null || options === void 0 ? void 0 : options.isConnected) !== null && _a !== void 0 ? _a : true;
        }
        // See comment in Disconnectable interface for why this is a getter
        get _$isConnected() {
            var _a, _b;
            // ChildParts that are not at the root should always be created with a
            // parent; only RootChildNode's won't, so they return the local isConnected
            // state
            return (_b = (_a = this._$parent) === null || _a === void 0 ? void 0 : _a._$isConnected) !== null && _b !== void 0 ? _b : this.__isConnected;
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
                (parentNode === null || parentNode === void 0 ? void 0 : parentNode.nodeType) === 11 /* Node.DOCUMENT_FRAGMENT */) {
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
            var _a;
            // This property needs to remain unminified.
            const { values, ['_$litType$']: type } = result;
            // If $litType$ is a number, result is a plain TemplateResult and we get
            // the template from the template cache. If not, result is a
            // CompiledTemplateResult and _$litType$ is a CompiledTemplate and we need
            // to create the <template> element the first time we see it.
            const template = typeof type === 'number'
                ? this._$getTemplate(result)
                : (type.el === undefined &&
                    (type.el = Template.createElement(type.h, this.options)),
                    type);
            if (((_a = this._$committedValue) === null || _a === void 0 ? void 0 : _a._$template) === template) {
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
            var _a;
            (_a = this._$notifyConnectionChanged) === null || _a === void 0 ? void 0 : _a.call(this, false, true, from);
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
            var _a;
            if (this._$parent === undefined) {
                this.__isConnected = isConnected;
                (_a = this._$notifyConnectionChanged) === null || _a === void 0 ? void 0 : _a.call(this, isConnected);
            }
        }
    };
    class AttributePart {
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
        get tagName() {
            return this.element.tagName;
        }
        // See comment in Disconnectable interface for why this is a getter
        get _$isConnected() {
            return this._$parent._$isConnected;
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
                    change || (change = !isPrimitive$1(v) || v !== this._$committedValue[i]);
                    if (v === nothing) {
                        value = nothing;
                    }
                    else if (value !== nothing) {
                        value += (v !== null && v !== void 0 ? v : '') + strings[i + 1];
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
                wrap$1(this.element).setAttribute(this.name, (value !== null && value !== void 0 ? value : ''));
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
    // Temporary workaround for https://crbug.com/993268
    // Currently, any attribute starting with "on" is considered to be a
    // TrustedScript source. Such boolean attributes must be set to the equivalent
    // trusted emptyScript value.
    const emptyStringForBooleanAttribute = trustedTypes
        ? trustedTypes.emptyScript
        : '';
    class BooleanAttributePart extends AttributePart {
        constructor() {
            super(...arguments);
            this.type = BOOLEAN_ATTRIBUTE_PART;
        }
        /** @internal */
        _commitValue(value) {
            if (value && value !== nothing) {
                wrap$1(this.element).setAttribute(this.name, emptyStringForBooleanAttribute);
            }
            else {
                wrap$1(this.element).removeAttribute(this.name);
            }
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
            var _a;
            newListener =
                (_a = resolveDirective(this, newListener, directiveParent, 0)) !== null && _a !== void 0 ? _a : nothing;
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
            var _a, _b;
            if (typeof this._$committedValue === 'function') {
                this._$committedValue.call((_b = (_a = this.options) === null || _a === void 0 ? void 0 : _a.host) !== null && _b !== void 0 ? _b : this.element, event);
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
    const _$LH = {
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
    polyfillSupport === null || polyfillSupport === void 0 ? void 0 : polyfillSupport(Template, ChildPart$1);
    // IMPORTANT: do not change the property name or the assignment expression.
    // This line will be used in regexes to search for lit-html usage.
    ((_d = global.litHtmlVersions) !== null && _d !== void 0 ? _d : (global.litHtmlVersions = [])).push('2.7.4');
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
        var _a, _b;
        const partOwnerNode = (_a = options === null || options === void 0 ? void 0 : options.renderBefore) !== null && _a !== void 0 ? _a : container;
        // This property needs to remain unminified.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let part = partOwnerNode['_$litPart$'];
        if (part === undefined) {
            const endNode = (_b = options === null || options === void 0 ? void 0 : options.renderBefore) !== null && _b !== void 0 ? _b : null;
            // This property needs to remain unminified.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            partOwnerNode['_$litPart$'] = part = new ChildPart$1(container.insertBefore(createMarker$1(), endNode), endNode, undefined, options !== null && options !== void 0 ? options : {});
        }
        part._$setValue(value);
        return part;
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
    const { _ChildPart: ChildPart } = _$LH;
    const wrap = (node) => node;
    /**
     * Tests if a value is a primitive value.
     *
     * See https://tc39.github.io/ecma262/#sec-typeof-operator
     */
    const isPrimitive = (value) => value === null || (typeof value != 'object' && typeof value != 'function');
    /**
     * Tests if a value is a TemplateResult.
     */
    const isTemplateResult = (value, type) => type === undefined
        ? // This property needs to remain unminified.
            (value === null || value === void 0 ? void 0 : value['_$litType$']) !== undefined
        : (value === null || value === void 0 ? void 0 : value['_$litType$']) === type;
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
        var _a;
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
                (_a = part._$reparentDisconnectables) === null || _a === void 0 ? void 0 : _a.call(part, containerPart);
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
        var _a;
        (_a = part._$notifyConnectionChanged) === null || _a === void 0 ? void 0 : _a.call(part, false, true);
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
        var _a, _b;
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
            (_b = (_a = obj)['_$notifyDirectiveConnectionChanged']) === null || _b === void 0 ? void 0 : _b.call(_a, isConnected, false);
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
        } while ((children === null || children === void 0 ? void 0 : children.size) === 0);
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
        var _a, _b;
        var _c, _d;
        if (obj.type == PartType.CHILD) {
            (_a = (_c = obj)._$notifyConnectionChanged) !== null && _a !== void 0 ? _a : (_c._$notifyConnectionChanged = notifyChildPartConnectedChanged);
            (_b = (_d = obj)._$reparentDisconnectables) !== null && _b !== void 0 ? _b : (_d._$reparentDisconnectables = reparentDisconnectables);
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
            var _a, _b;
            if (isConnected !== this.isConnected) {
                this.isConnected = isConnected;
                if (isConnected) {
                    (_a = this.reconnected) === null || _a === void 0 ? void 0 : _a.call(this);
                }
                else {
                    (_b = this.disconnected) === null || _b === void 0 ? void 0 : _b.call(this);
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
            var _a;
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
                this._context = (_a = part.options) === null || _a === void 0 ? void 0 : _a.host;
                this._updateRefValue((this._element = part.element));
            }
            return nothing;
        }
        _updateRefValue(element) {
            var _a;
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
                const context = (_a = this._context) !== null && _a !== void 0 ? _a : globalThis;
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
            var _a, _b, _c;
            return typeof this._ref === 'function'
                ? (_b = lastElementForContextAndCallback
                    .get((_a = this._context) !== null && _a !== void 0 ? _a : globalThis)) === null || _b === void 0 ? void 0 : _b.get(this._ref)
                : (_c = this._ref) === null || _c === void 0 ? void 0 : _c.value;
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
            var _a;
            (_a = this._promise) !== null && _a !== void 0 ? _a : (this._promise = new Promise((resolve) => (this._resolve = resolve)));
        }
        /**
         * Resolves the promise which may be awaited
         */
        resume() {
            var _a;
            (_a = this._resolve) === null || _a === void 0 ? void 0 : _a.call(this);
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
                return;
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
            // If the previous value is a TemplateResult and the new value is not,
            // or is a different Template as the previous value, move the child part
            // into the cache.
            if (isTemplateResult(this._value) &&
                (!isTemplateResult(v) || this._value.strings !== v.strings)) {
                // This is always an array because we return [v] in render()
                const partValue = getCommittedValue(containerPart);
                const childPart = partValue.pop();
                let cachedContainerPart = this._templateCache.get(this._value.strings);
                if (cachedContainerPart === undefined) {
                    const fragment = document.createDocumentFragment();
                    cachedContainerPart = render(nothing, fragment);
                    cachedContainerPart.setConnected(false);
                    this._templateCache.set(this._value.strings, cachedContainerPart);
                }
                // Move into cache
                setCommittedValue(cachedContainerPart, [childPart]);
                insertPart(cachedContainerPart, undefined, childPart);
            }
            // If the new value is a TemplateResult and the previous value is not,
            // or is a different Template as the previous value, restore the child
            // part from the cache.
            if (isTemplateResult(v)) {
                if (!isTemplateResult(this._value) || this._value.strings !== v.strings) {
                    const cachedContainerPart = this._templateCache.get(v.strings);
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
        return defaultCase === null || defaultCase === void 0 ? void 0 : defaultCase();
    };

    /**
     * @license
     * Copyright 2018 Google LLC
     * SPDX-License-Identifier: BSD-3-Clause
     */
    class ClassMapDirective extends Directive {
        constructor(partInfo) {
            var _a;
            super(partInfo);
            if (partInfo.type !== PartType.ATTRIBUTE ||
                partInfo.name !== 'class' ||
                ((_a = partInfo.strings) === null || _a === void 0 ? void 0 : _a.length) > 2) {
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
            var _a, _b;
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
                    if (classInfo[name] && !((_a = this._staticClasses) === null || _a === void 0 ? void 0 : _a.has(name))) {
                        this._previousClasses.add(name);
                    }
                }
                return this.render(classInfo);
            }
            const classList = part.element.classList;
            // Remove old classes that no longer apply
            // We use forEach() instead of for-of so that we don't require down-level
            // iteration.
            this._previousClasses.forEach((name) => {
                if (!(name in classInfo)) {
                    classList.remove(name);
                    this._previousClasses.delete(name);
                }
            });
            // Add or remove classes based on their classMap value
            for (const name in classInfo) {
                // We explicitly want a loose truthy check of `value` because it seems
                // more convenient that '' and 0 are skipped.
                const value = !!classInfo[name];
                if (value !== this._previousClasses.has(name) &&
                    !((_b = this._staticClasses) === null || _b === void 0 ? void 0 : _b.has(name))) {
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
    const ifDefined = (value) => value !== null && value !== void 0 ? value : nothing;

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
        end !== null && end !== void 0 ? end : (end = startOrEnd);
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
            var _a;
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
            const oldKeys = ((_a = this._itemKeys) !== null && _a !== void 0 ? _a : (this._itemKeys = []));
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
            var _a;
            super(partInfo);
            if (partInfo.type !== PartType.ATTRIBUTE ||
                partInfo.name !== 'style' ||
                ((_a = partInfo.strings) === null || _a === void 0 ? void 0 : _a.length) > 2) {
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
                this._previousStyleProperties = new Set();
                for (const name in styleInfo) {
                    this._previousStyleProperties.add(name);
                }
                return this.render(styleInfo);
            }
            // Remove old properties that no longer exist in styleInfo
            // We use forEach() instead of for-of so that re don't require down-level
            // iteration.
            this._previousStyleProperties.forEach((name) => {
                // If the name isn't in styleInfo or it's null/undefined
                if (styleInfo[name] == null) {
                    this._previousStyleProperties.delete(name);
                    if (name.includes('-')) {
                        style.removeProperty(name);
                    }
                    else {
                        // Note reset using empty string (vs null) as IE11 does not always
                        // reset via null (https://developer.mozilla.org/en-US/docs/Web/API/ElementCSSInlineStyle/style#setting_styles)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        style[name] = '';
                    }
                }
            });
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
            var _a;
            return (_a = args.find((x) => !isPromise(x))) !== null && _a !== void 0 ? _a : noChange;
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
        return condition ? trueCase() : falseCase === null || falseCase === void 0 ? void 0 : falseCase();
    }

    const _Σ = {
        AttributePart: _$LH._AttributePart,
        PropertyPart: _$LH._PropertyPart,
        BooleanAttributePart: _$LH._BooleanAttributePart,
        EventPart: _$LH._EventPart,
        ElementPart: _$LH._ElementPart,
    };
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
    exports["_Σ"] = _Σ;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLmpzIiwic291cmNlcyI6WyJsaXQtaHRtbC9zcmMvbGl0LWh0bWwudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZS1oZWxwZXJzLnRzIiwibGl0LWh0bWwvc3JjL2FzeW5jLWRpcmVjdGl2ZS50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3JlZi50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3ByaXZhdGUtYXN5bmMtaGVscGVycy50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2FzeW5jLXJlcGxhY2UudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9hc3luYy1hcHBlbmQudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9jYWNoZS50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2Nob29zZS50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2NsYXNzLW1hcC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2d1YXJkLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvaWYtZGVmaW5lZC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2pvaW4udHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9rZXllZC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2xpdmUudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9tYXAudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9yYW5nZS50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3JlcGVhdC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3N0eWxlLW1hcC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3RlbXBsYXRlLWNvbnRlbnQudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy91bnNhZmUtaHRtbC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3Vuc2FmZS1zdmcudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy91bnRpbC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3doZW4udHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLy8gSU1QT1JUQU5UOiB0aGVzZSBpbXBvcnRzIG11c3QgYmUgdHlwZS1vbmx5XG5pbXBvcnQgdHlwZSB7RGlyZWN0aXZlLCBEaXJlY3RpdmVSZXN1bHQsIFBhcnRJbmZvfSBmcm9tICcuL2RpcmVjdGl2ZS5qcyc7XG5cbmNvbnN0IERFVl9NT0RFID0gdHJ1ZTtcbmNvbnN0IEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUyA9IHRydWU7XG5jb25zdCBFTkFCTEVfU0hBRFlET01fTk9QQVRDSCA9IHRydWU7XG5jb25zdCBOT0RFX01PREUgPSBmYWxzZTtcbi8vIFVzZSB3aW5kb3cgZm9yIGJyb3dzZXIgYnVpbGRzIGJlY2F1c2UgSUUxMSBkb2Vzbid0IGhhdmUgZ2xvYmFsVGhpcy5cbmNvbnN0IGdsb2JhbCA9IE5PREVfTU9ERSA/IGdsb2JhbFRoaXMgOiB3aW5kb3c7XG5cbi8qKlxuICogQ29udGFpbnMgdHlwZXMgdGhhdCBhcmUgcGFydCBvZiB0aGUgdW5zdGFibGUgZGVidWcgQVBJLlxuICpcbiAqIEV2ZXJ5dGhpbmcgaW4gdGhpcyBBUEkgaXMgbm90IHN0YWJsZSBhbmQgbWF5IGNoYW5nZSBvciBiZSByZW1vdmVkIGluIHRoZSBmdXR1cmUsXG4gKiBldmVuIG9uIHBhdGNoIHJlbGVhc2VzLlxuICovXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZVxuZXhwb3J0IG5hbWVzcGFjZSBMaXRVbnN0YWJsZSB7XG4gIC8qKlxuICAgKiBXaGVuIExpdCBpcyBydW5uaW5nIGluIGRldiBtb2RlIGFuZCBgd2luZG93LmVtaXRMaXREZWJ1Z0xvZ0V2ZW50c2AgaXMgdHJ1ZSxcbiAgICogd2Ugd2lsbCBlbWl0ICdsaXQtZGVidWcnIGV2ZW50cyB0byB3aW5kb3csIHdpdGggbGl2ZSBkZXRhaWxzIGFib3V0IHRoZSB1cGRhdGUgYW5kIHJlbmRlclxuICAgKiBsaWZlY3ljbGUuIFRoZXNlIGNhbiBiZSB1c2VmdWwgZm9yIHdyaXRpbmcgZGVidWcgdG9vbGluZyBhbmQgdmlzdWFsaXphdGlvbnMuXG4gICAqXG4gICAqIFBsZWFzZSBiZSBhd2FyZSB0aGF0IHJ1bm5pbmcgd2l0aCB3aW5kb3cuZW1pdExpdERlYnVnTG9nRXZlbnRzIGhhcyBwZXJmb3JtYW5jZSBvdmVyaGVhZCxcbiAgICogbWFraW5nIGNlcnRhaW4gb3BlcmF0aW9ucyB0aGF0IGFyZSBub3JtYWxseSB2ZXJ5IGNoZWFwIChsaWtlIGEgbm8tb3AgcmVuZGVyKSBtdWNoIHNsb3dlcixcbiAgICogYmVjYXVzZSB3ZSBtdXN0IGNvcHkgZGF0YSBhbmQgZGlzcGF0Y2ggZXZlbnRzLlxuICAgKi9cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbiAgZXhwb3J0IG5hbWVzcGFjZSBEZWJ1Z0xvZyB7XG4gICAgZXhwb3J0IHR5cGUgRW50cnkgPVxuICAgICAgfCBUZW1wbGF0ZVByZXBcbiAgICAgIHwgVGVtcGxhdGVJbnN0YW50aWF0ZWRcbiAgICAgIHwgVGVtcGxhdGVJbnN0YW50aWF0ZWRBbmRVcGRhdGVkXG4gICAgICB8IFRlbXBsYXRlVXBkYXRpbmdcbiAgICAgIHwgQmVnaW5SZW5kZXJcbiAgICAgIHwgRW5kUmVuZGVyXG4gICAgICB8IENvbW1pdFBhcnRFbnRyeVxuICAgICAgfCBTZXRQYXJ0VmFsdWU7XG4gICAgZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZVByZXAge1xuICAgICAga2luZDogJ3RlbXBsYXRlIHByZXAnO1xuICAgICAgdGVtcGxhdGU6IFRlbXBsYXRlO1xuICAgICAgc3RyaW5nczogVGVtcGxhdGVTdHJpbmdzQXJyYXk7XG4gICAgICBjbG9uYWJsZVRlbXBsYXRlOiBIVE1MVGVtcGxhdGVFbGVtZW50O1xuICAgICAgcGFydHM6IFRlbXBsYXRlUGFydFtdO1xuICAgIH1cbiAgICBleHBvcnQgaW50ZXJmYWNlIEJlZ2luUmVuZGVyIHtcbiAgICAgIGtpbmQ6ICdiZWdpbiByZW5kZXInO1xuICAgICAgaWQ6IG51bWJlcjtcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgY29udGFpbmVyOiBIVE1MRWxlbWVudCB8IERvY3VtZW50RnJhZ21lbnQ7XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgICAgcGFydDogQ2hpbGRQYXJ0IHwgdW5kZWZpbmVkO1xuICAgIH1cbiAgICBleHBvcnQgaW50ZXJmYWNlIEVuZFJlbmRlciB7XG4gICAgICBraW5kOiAnZW5kIHJlbmRlcic7XG4gICAgICBpZDogbnVtYmVyO1xuICAgICAgdmFsdWU6IHVua25vd247XG4gICAgICBjb250YWluZXI6IEhUTUxFbGVtZW50IHwgRG9jdW1lbnRGcmFnbWVudDtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgICBwYXJ0OiBDaGlsZFBhcnQ7XG4gICAgfVxuICAgIGV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVJbnN0YW50aWF0ZWQge1xuICAgICAga2luZDogJ3RlbXBsYXRlIGluc3RhbnRpYXRlZCc7XG4gICAgICB0ZW1wbGF0ZTogVGVtcGxhdGUgfCBDb21waWxlZFRlbXBsYXRlO1xuICAgICAgaW5zdGFuY2U6IFRlbXBsYXRlSW5zdGFuY2U7XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgICAgZnJhZ21lbnQ6IE5vZGU7XG4gICAgICBwYXJ0czogQXJyYXk8UGFydCB8IHVuZGVmaW5lZD47XG4gICAgICB2YWx1ZXM6IHVua25vd25bXTtcbiAgICB9XG4gICAgZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUluc3RhbnRpYXRlZEFuZFVwZGF0ZWQge1xuICAgICAga2luZDogJ3RlbXBsYXRlIGluc3RhbnRpYXRlZCBhbmQgdXBkYXRlZCc7XG4gICAgICB0ZW1wbGF0ZTogVGVtcGxhdGUgfCBDb21waWxlZFRlbXBsYXRlO1xuICAgICAgaW5zdGFuY2U6IFRlbXBsYXRlSW5zdGFuY2U7XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgICAgZnJhZ21lbnQ6IE5vZGU7XG4gICAgICBwYXJ0czogQXJyYXk8UGFydCB8IHVuZGVmaW5lZD47XG4gICAgICB2YWx1ZXM6IHVua25vd25bXTtcbiAgICB9XG4gICAgZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZVVwZGF0aW5nIHtcbiAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSB1cGRhdGluZyc7XG4gICAgICB0ZW1wbGF0ZTogVGVtcGxhdGUgfCBDb21waWxlZFRlbXBsYXRlO1xuICAgICAgaW5zdGFuY2U6IFRlbXBsYXRlSW5zdGFuY2U7XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgICAgcGFydHM6IEFycmF5PFBhcnQgfCB1bmRlZmluZWQ+O1xuICAgICAgdmFsdWVzOiB1bmtub3duW107XG4gICAgfVxuICAgIGV4cG9ydCBpbnRlcmZhY2UgU2V0UGFydFZhbHVlIHtcbiAgICAgIGtpbmQ6ICdzZXQgcGFydCc7XG4gICAgICBwYXJ0OiBQYXJ0O1xuICAgICAgdmFsdWU6IHVua25vd247XG4gICAgICB2YWx1ZUluZGV4OiBudW1iZXI7XG4gICAgICB2YWx1ZXM6IHVua25vd25bXTtcbiAgICAgIHRlbXBsYXRlSW5zdGFuY2U6IFRlbXBsYXRlSW5zdGFuY2U7XG4gICAgfVxuXG4gICAgZXhwb3J0IHR5cGUgQ29tbWl0UGFydEVudHJ5ID1cbiAgICAgIHwgQ29tbWl0Tm90aGluZ1RvQ2hpbGRFbnRyeVxuICAgICAgfCBDb21taXRUZXh0XG4gICAgICB8IENvbW1pdE5vZGVcbiAgICAgIHwgQ29tbWl0QXR0cmlidXRlXG4gICAgICB8IENvbW1pdFByb3BlcnR5XG4gICAgICB8IENvbW1pdEJvb2xlYW5BdHRyaWJ1dGVcbiAgICAgIHwgQ29tbWl0RXZlbnRMaXN0ZW5lclxuICAgICAgfCBDb21taXRUb0VsZW1lbnRCaW5kaW5nO1xuXG4gICAgZXhwb3J0IGludGVyZmFjZSBDb21taXROb3RoaW5nVG9DaGlsZEVudHJ5IHtcbiAgICAgIGtpbmQ6ICdjb21taXQgbm90aGluZyB0byBjaGlsZCc7XG4gICAgICBzdGFydDogQ2hpbGROb2RlO1xuICAgICAgZW5kOiBDaGlsZE5vZGUgfCBudWxsO1xuICAgICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSB8IHVuZGVmaW5lZDtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZXhwb3J0IGludGVyZmFjZSBDb21taXRUZXh0IHtcbiAgICAgIGtpbmQ6ICdjb21taXQgdGV4dCc7XG4gICAgICBub2RlOiBUZXh0O1xuICAgICAgdmFsdWU6IHVua25vd247XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0Tm9kZSB7XG4gICAgICBraW5kOiAnY29tbWl0IG5vZGUnO1xuICAgICAgc3RhcnQ6IE5vZGU7XG4gICAgICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlIHwgdW5kZWZpbmVkO1xuICAgICAgdmFsdWU6IE5vZGU7XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0QXR0cmlidXRlIHtcbiAgICAgIGtpbmQ6ICdjb21taXQgYXR0cmlidXRlJztcbiAgICAgIGVsZW1lbnQ6IEVsZW1lbnQ7XG4gICAgICBuYW1lOiBzdHJpbmc7XG4gICAgICB2YWx1ZTogdW5rbm93bjtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZXhwb3J0IGludGVyZmFjZSBDb21taXRQcm9wZXJ0eSB7XG4gICAgICBraW5kOiAnY29tbWl0IHByb3BlcnR5JztcbiAgICAgIGVsZW1lbnQ6IEVsZW1lbnQ7XG4gICAgICBuYW1lOiBzdHJpbmc7XG4gICAgICB2YWx1ZTogdW5rbm93bjtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZXhwb3J0IGludGVyZmFjZSBDb21taXRCb29sZWFuQXR0cmlidXRlIHtcbiAgICAgIGtpbmQ6ICdjb21taXQgYm9vbGVhbiBhdHRyaWJ1dGUnO1xuICAgICAgZWxlbWVudDogRWxlbWVudDtcbiAgICAgIG5hbWU6IHN0cmluZztcbiAgICAgIHZhbHVlOiBib29sZWFuO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBleHBvcnQgaW50ZXJmYWNlIENvbW1pdEV2ZW50TGlzdGVuZXIge1xuICAgICAga2luZDogJ2NvbW1pdCBldmVudCBsaXN0ZW5lcic7XG4gICAgICBlbGVtZW50OiBFbGVtZW50O1xuICAgICAgbmFtZTogc3RyaW5nO1xuICAgICAgdmFsdWU6IHVua25vd247XG4gICAgICBvbGRMaXN0ZW5lcjogdW5rbm93bjtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgICAvLyBUcnVlIGlmIHdlJ3JlIHJlbW92aW5nIHRoZSBvbGQgZXZlbnQgbGlzdGVuZXIgKGUuZy4gYmVjYXVzZSBzZXR0aW5ncyBjaGFuZ2VkLCBvciB2YWx1ZSBpcyBub3RoaW5nKVxuICAgICAgcmVtb3ZlTGlzdGVuZXI6IGJvb2xlYW47XG4gICAgICAvLyBUcnVlIGlmIHdlJ3JlIGFkZGluZyBhIG5ldyBldmVudCBsaXN0ZW5lciAoZS5nLiBiZWNhdXNlIGZpcnN0IHJlbmRlciwgb3Igc2V0dGluZ3MgY2hhbmdlZClcbiAgICAgIGFkZExpc3RlbmVyOiBib29sZWFuO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0VG9FbGVtZW50QmluZGluZyB7XG4gICAgICBraW5kOiAnY29tbWl0IHRvIGVsZW1lbnQgYmluZGluZyc7XG4gICAgICBlbGVtZW50OiBFbGVtZW50O1xuICAgICAgdmFsdWU6IHVua25vd247XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxufVxuXG5pbnRlcmZhY2UgRGVidWdMb2dnaW5nV2luZG93IHtcbiAgLy8gRXZlbiBpbiBkZXYgbW9kZSwgd2UgZ2VuZXJhbGx5IGRvbid0IHdhbnQgdG8gZW1pdCB0aGVzZSBldmVudHMsIGFzIHRoYXQnc1xuICAvLyBhbm90aGVyIGxldmVsIG9mIGNvc3QsIHNvIG9ubHkgZW1pdCB0aGVtIHdoZW4gREVWX01PREUgaXMgdHJ1ZSBfYW5kXyB3aGVuXG4gIC8vIHdpbmRvdy5lbWl0TGl0RGVidWdFdmVudHMgaXMgdHJ1ZS5cbiAgZW1pdExpdERlYnVnTG9nRXZlbnRzPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBVc2VmdWwgZm9yIHZpc3VhbGl6aW5nIGFuZCBsb2dnaW5nIGluc2lnaHRzIGludG8gd2hhdCB0aGUgTGl0IHRlbXBsYXRlIHN5c3RlbSBpcyBkb2luZy5cbiAqXG4gKiBDb21waWxlZCBvdXQgb2YgcHJvZCBtb2RlIGJ1aWxkcy5cbiAqL1xuY29uc3QgZGVidWdMb2dFdmVudCA9IERFVl9NT0RFXG4gID8gKGV2ZW50OiBMaXRVbnN0YWJsZS5EZWJ1Z0xvZy5FbnRyeSkgPT4ge1xuICAgICAgY29uc3Qgc2hvdWxkRW1pdCA9IChnbG9iYWwgYXMgdW5rbm93biBhcyBEZWJ1Z0xvZ2dpbmdXaW5kb3cpXG4gICAgICAgIC5lbWl0TGl0RGVidWdMb2dFdmVudHM7XG4gICAgICBpZiAoIXNob3VsZEVtaXQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZ2xvYmFsLmRpc3BhdGNoRXZlbnQoXG4gICAgICAgIG5ldyBDdXN0b21FdmVudDxMaXRVbnN0YWJsZS5EZWJ1Z0xvZy5FbnRyeT4oJ2xpdC1kZWJ1ZycsIHtcbiAgICAgICAgICBkZXRhaWw6IGV2ZW50LFxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG4gIDogdW5kZWZpbmVkO1xuLy8gVXNlZCBmb3IgY29ubmVjdGluZyBiZWdpblJlbmRlciBhbmQgZW5kUmVuZGVyIGV2ZW50cyB3aGVuIHRoZXJlIGFyZSBuZXN0ZWRcbi8vIHJlbmRlcnMgd2hlbiBlcnJvcnMgYXJlIHRocm93biBwcmV2ZW50aW5nIGFuIGVuZFJlbmRlciBldmVudCBmcm9tIGJlaW5nXG4vLyBjYWxsZWQuXG5sZXQgZGVidWdMb2dSZW5kZXJJZCA9IDA7XG5cbmxldCBpc3N1ZVdhcm5pbmc6IChjb2RlOiBzdHJpbmcsIHdhcm5pbmc6IHN0cmluZykgPT4gdm9pZDtcblxuaWYgKERFVl9NT0RFKSB7XG4gIGdsb2JhbC5saXRJc3N1ZWRXYXJuaW5ncyA/Pz0gbmV3IFNldCgpO1xuXG4gIC8vIElzc3VlIGEgd2FybmluZywgaWYgd2UgaGF2ZW4ndCBhbHJlYWR5LlxuICBpc3N1ZVdhcm5pbmcgPSAoY29kZTogc3RyaW5nLCB3YXJuaW5nOiBzdHJpbmcpID0+IHtcbiAgICB3YXJuaW5nICs9IGNvZGVcbiAgICAgID8gYCBTZWUgaHR0cHM6Ly9saXQuZGV2L21zZy8ke2NvZGV9IGZvciBtb3JlIGluZm9ybWF0aW9uLmBcbiAgICAgIDogJyc7XG4gICAgaWYgKCFnbG9iYWwubGl0SXNzdWVkV2FybmluZ3MhLmhhcyh3YXJuaW5nKSkge1xuICAgICAgY29uc29sZS53YXJuKHdhcm5pbmcpO1xuICAgICAgZ2xvYmFsLmxpdElzc3VlZFdhcm5pbmdzIS5hZGQod2FybmluZyk7XG4gICAgfVxuICB9O1xuXG4gIGlzc3VlV2FybmluZyhcbiAgICAnZGV2LW1vZGUnLFxuICAgIGBMaXQgaXMgaW4gZGV2IG1vZGUuIE5vdCByZWNvbW1lbmRlZCBmb3IgcHJvZHVjdGlvbiFgXG4gICk7XG59XG5cbmNvbnN0IHdyYXAgPVxuICBFTkFCTEVfU0hBRFlET01fTk9QQVRDSCAmJlxuICBnbG9iYWwuU2hhZHlET00/LmluVXNlICYmXG4gIGdsb2JhbC5TaGFkeURPTT8ubm9QYXRjaCA9PT0gdHJ1ZVxuICAgID8gZ2xvYmFsLlNoYWR5RE9NIS53cmFwXG4gICAgOiAobm9kZTogTm9kZSkgPT4gbm9kZTtcblxuY29uc3QgdHJ1c3RlZFR5cGVzID0gKGdsb2JhbCBhcyB1bmtub3duIGFzIFBhcnRpYWw8V2luZG93PikudHJ1c3RlZFR5cGVzO1xuXG4vKipcbiAqIE91ciBUcnVzdGVkVHlwZVBvbGljeSBmb3IgSFRNTCB3aGljaCBpcyBkZWNsYXJlZCB1c2luZyB0aGUgaHRtbCB0ZW1wbGF0ZVxuICogdGFnIGZ1bmN0aW9uLlxuICpcbiAqIFRoYXQgSFRNTCBpcyBhIGRldmVsb3Blci1hdXRob3JlZCBjb25zdGFudCwgYW5kIGlzIHBhcnNlZCB3aXRoIGlubmVySFRNTFxuICogYmVmb3JlIGFueSB1bnRydXN0ZWQgZXhwcmVzc2lvbnMgaGF2ZSBiZWVuIG1peGVkIGluLiBUaGVyZWZvciBpdCBpc1xuICogY29uc2lkZXJlZCBzYWZlIGJ5IGNvbnN0cnVjdGlvbi5cbiAqL1xuY29uc3QgcG9saWN5ID0gdHJ1c3RlZFR5cGVzXG4gID8gdHJ1c3RlZFR5cGVzLmNyZWF0ZVBvbGljeSgnbGl0LWh0bWwnLCB7XG4gICAgICBjcmVhdGVIVE1MOiAocykgPT4gcyxcbiAgICB9KVxuICA6IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBVc2VkIHRvIHNhbml0aXplIGFueSB2YWx1ZSBiZWZvcmUgaXQgaXMgd3JpdHRlbiBpbnRvIHRoZSBET00uIFRoaXMgY2FuIGJlXG4gKiB1c2VkIHRvIGltcGxlbWVudCBhIHNlY3VyaXR5IHBvbGljeSBvZiBhbGxvd2VkIGFuZCBkaXNhbGxvd2VkIHZhbHVlcyBpblxuICogb3JkZXIgdG8gcHJldmVudCBYU1MgYXR0YWNrcy5cbiAqXG4gKiBPbmUgd2F5IG9mIHVzaW5nIHRoaXMgY2FsbGJhY2sgd291bGQgYmUgdG8gY2hlY2sgYXR0cmlidXRlcyBhbmQgcHJvcGVydGllc1xuICogYWdhaW5zdCBhIGxpc3Qgb2YgaGlnaCByaXNrIGZpZWxkcywgYW5kIHJlcXVpcmUgdGhhdCB2YWx1ZXMgd3JpdHRlbiB0byBzdWNoXG4gKiBmaWVsZHMgYmUgaW5zdGFuY2VzIG9mIGEgY2xhc3Mgd2hpY2ggaXMgc2FmZSBieSBjb25zdHJ1Y3Rpb24uIENsb3N1cmUncyBTYWZlXG4gKiBIVE1MIFR5cGVzIGlzIG9uZSBpbXBsZW1lbnRhdGlvbiBvZiB0aGlzIHRlY2huaXF1ZSAoXG4gKiBodHRwczovL2dpdGh1Yi5jb20vZ29vZ2xlL3NhZmUtaHRtbC10eXBlcy9ibG9iL21hc3Rlci9kb2Mvc2FmZWh0bWwtdHlwZXMubWQpLlxuICogVGhlIFRydXN0ZWRUeXBlcyBwb2x5ZmlsbCBpbiBBUEktb25seSBtb2RlIGNvdWxkIGFsc28gYmUgdXNlZCBhcyBhIGJhc2lzXG4gKiBmb3IgdGhpcyB0ZWNobmlxdWUgKGh0dHBzOi8vZ2l0aHViLmNvbS9XSUNHL3RydXN0ZWQtdHlwZXMpLlxuICpcbiAqIEBwYXJhbSBub2RlIFRoZSBIVE1MIG5vZGUgKHVzdWFsbHkgZWl0aGVyIGEgI3RleHQgbm9kZSBvciBhbiBFbGVtZW50KSB0aGF0XG4gKiAgICAgaXMgYmVpbmcgd3JpdHRlbiB0by4gTm90ZSB0aGF0IHRoaXMgaXMganVzdCBhbiBleGVtcGxhciBub2RlLCB0aGUgd3JpdGVcbiAqICAgICBtYXkgdGFrZSBwbGFjZSBhZ2FpbnN0IGFub3RoZXIgaW5zdGFuY2Ugb2YgdGhlIHNhbWUgY2xhc3Mgb2Ygbm9kZS5cbiAqIEBwYXJhbSBuYW1lIFRoZSBuYW1lIG9mIGFuIGF0dHJpYnV0ZSBvciBwcm9wZXJ0eSAoZm9yIGV4YW1wbGUsICdocmVmJykuXG4gKiBAcGFyYW0gdHlwZSBJbmRpY2F0ZXMgd2hldGhlciB0aGUgd3JpdGUgdGhhdCdzIGFib3V0IHRvIGJlIHBlcmZvcm1lZCB3aWxsXG4gKiAgICAgYmUgdG8gYSBwcm9wZXJ0eSBvciBhIG5vZGUuXG4gKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCB3aWxsIHNhbml0aXplIHRoaXMgY2xhc3Mgb2Ygd3JpdGVzLlxuICovXG5leHBvcnQgdHlwZSBTYW5pdGl6ZXJGYWN0b3J5ID0gKFxuICBub2RlOiBOb2RlLFxuICBuYW1lOiBzdHJpbmcsXG4gIHR5cGU6ICdwcm9wZXJ0eScgfCAnYXR0cmlidXRlJ1xuKSA9PiBWYWx1ZVNhbml0aXplcjtcblxuLyoqXG4gKiBBIGZ1bmN0aW9uIHdoaWNoIGNhbiBzYW5pdGl6ZSB2YWx1ZXMgdGhhdCB3aWxsIGJlIHdyaXR0ZW4gdG8gYSBzcGVjaWZpYyBraW5kXG4gKiBvZiBET00gc2luay5cbiAqXG4gKiBTZWUgU2FuaXRpemVyRmFjdG9yeS5cbiAqXG4gKiBAcGFyYW0gdmFsdWUgVGhlIHZhbHVlIHRvIHNhbml0aXplLiBXaWxsIGJlIHRoZSBhY3R1YWwgdmFsdWUgcGFzc2VkIGludG9cbiAqICAgICB0aGUgbGl0LWh0bWwgdGVtcGxhdGUgbGl0ZXJhbCwgc28gdGhpcyBjb3VsZCBiZSBvZiBhbnkgdHlwZS5cbiAqIEByZXR1cm4gVGhlIHZhbHVlIHRvIHdyaXRlIHRvIHRoZSBET00uIFVzdWFsbHkgdGhlIHNhbWUgYXMgdGhlIGlucHV0IHZhbHVlLFxuICogICAgIHVubGVzcyBzYW5pdGl6YXRpb24gaXMgbmVlZGVkLlxuICovXG5leHBvcnQgdHlwZSBWYWx1ZVNhbml0aXplciA9ICh2YWx1ZTogdW5rbm93bikgPT4gdW5rbm93bjtcblxuY29uc3QgaWRlbnRpdHlGdW5jdGlvbjogVmFsdWVTYW5pdGl6ZXIgPSAodmFsdWU6IHVua25vd24pID0+IHZhbHVlO1xuY29uc3Qgbm9vcFNhbml0aXplcjogU2FuaXRpemVyRmFjdG9yeSA9IChcbiAgX25vZGU6IE5vZGUsXG4gIF9uYW1lOiBzdHJpbmcsXG4gIF90eXBlOiAncHJvcGVydHknIHwgJ2F0dHJpYnV0ZSdcbikgPT4gaWRlbnRpdHlGdW5jdGlvbjtcblxuLyoqIFNldHMgdGhlIGdsb2JhbCBzYW5pdGl6ZXIgZmFjdG9yeS4gKi9cbmNvbnN0IHNldFNhbml0aXplciA9IChuZXdTYW5pdGl6ZXI6IFNhbml0aXplckZhY3RvcnkpID0+IHtcbiAgaWYgKCFFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKHNhbml0aXplckZhY3RvcnlJbnRlcm5hbCAhPT0gbm9vcFNhbml0aXplcikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBBdHRlbXB0ZWQgdG8gb3ZlcndyaXRlIGV4aXN0aW5nIGxpdC1odG1sIHNlY3VyaXR5IHBvbGljeS5gICtcbiAgICAgICAgYCBzZXRTYW5pdGl6ZURPTVZhbHVlRmFjdG9yeSBzaG91bGQgYmUgY2FsbGVkIGF0IG1vc3Qgb25jZS5gXG4gICAgKTtcbiAgfVxuICBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwgPSBuZXdTYW5pdGl6ZXI7XG59O1xuXG4vKipcbiAqIE9ubHkgdXNlZCBpbiBpbnRlcm5hbCB0ZXN0cywgbm90IGEgcGFydCBvZiB0aGUgcHVibGljIEFQSS5cbiAqL1xuY29uc3QgX3Rlc3RPbmx5Q2xlYXJTYW5pdGl6ZXJGYWN0b3J5RG9Ob3RDYWxsT3JFbHNlID0gKCkgPT4ge1xuICBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwgPSBub29wU2FuaXRpemVyO1xufTtcblxuY29uc3QgY3JlYXRlU2FuaXRpemVyOiBTYW5pdGl6ZXJGYWN0b3J5ID0gKG5vZGUsIG5hbWUsIHR5cGUpID0+IHtcbiAgcmV0dXJuIHNhbml0aXplckZhY3RvcnlJbnRlcm5hbChub2RlLCBuYW1lLCB0eXBlKTtcbn07XG5cbi8vIEFkZGVkIHRvIGFuIGF0dHJpYnV0ZSBuYW1lIHRvIG1hcmsgdGhlIGF0dHJpYnV0ZSBhcyBib3VuZCBzbyB3ZSBjYW4gZmluZFxuLy8gaXQgZWFzaWx5LlxuY29uc3QgYm91bmRBdHRyaWJ1dGVTdWZmaXggPSAnJGxpdCQnO1xuXG4vLyBUaGlzIG1hcmtlciBpcyB1c2VkIGluIG1hbnkgc3ludGFjdGljIHBvc2l0aW9ucyBpbiBIVE1MLCBzbyBpdCBtdXN0IGJlXG4vLyBhIHZhbGlkIGVsZW1lbnQgbmFtZSBhbmQgYXR0cmlidXRlIG5hbWUuIFdlIGRvbid0IHN1cHBvcnQgZHluYW1pYyBuYW1lcyAoeWV0KVxuLy8gYnV0IHRoaXMgYXQgbGVhc3QgZW5zdXJlcyB0aGF0IHRoZSBwYXJzZSB0cmVlIGlzIGNsb3NlciB0byB0aGUgdGVtcGxhdGVcbi8vIGludGVudGlvbi5cbmNvbnN0IG1hcmtlciA9IGBsaXQkJHtTdHJpbmcoTWF0aC5yYW5kb20oKSkuc2xpY2UoOSl9JGA7XG5cbi8vIFN0cmluZyB1c2VkIHRvIHRlbGwgaWYgYSBjb21tZW50IGlzIGEgbWFya2VyIGNvbW1lbnRcbmNvbnN0IG1hcmtlck1hdGNoID0gJz8nICsgbWFya2VyO1xuXG4vLyBUZXh0IHVzZWQgdG8gaW5zZXJ0IGEgY29tbWVudCBtYXJrZXIgbm9kZS4gV2UgdXNlIHByb2Nlc3NpbmcgaW5zdHJ1Y3Rpb25cbi8vIHN5bnRheCBiZWNhdXNlIGl0J3Mgc2xpZ2h0bHkgc21hbGxlciwgYnV0IHBhcnNlcyBhcyBhIGNvbW1lbnQgbm9kZS5cbmNvbnN0IG5vZGVNYXJrZXIgPSBgPCR7bWFya2VyTWF0Y2h9PmA7XG5cbmNvbnN0IGQgPVxuICBOT0RFX01PREUgJiYgZ2xvYmFsLmRvY3VtZW50ID09PSB1bmRlZmluZWRcbiAgICA/ICh7XG4gICAgICAgIGNyZWF0ZVRyZWVXYWxrZXIoKSB7XG4gICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICB9LFxuICAgICAgfSBhcyB1bmtub3duIGFzIERvY3VtZW50KVxuICAgIDogZG9jdW1lbnQ7XG5cbi8vIENyZWF0ZXMgYSBkeW5hbWljIG1hcmtlci4gV2UgbmV2ZXIgaGF2ZSB0byBzZWFyY2ggZm9yIHRoZXNlIGluIHRoZSBET00uXG5jb25zdCBjcmVhdGVNYXJrZXIgPSAoKSA9PiBkLmNyZWF0ZUNvbW1lbnQoJycpO1xuXG4vLyBodHRwczovL3RjMzkuZ2l0aHViLmlvL2VjbWEyNjIvI3NlYy10eXBlb2Ytb3BlcmF0b3JcbnR5cGUgUHJpbWl0aXZlID0gbnVsbCB8IHVuZGVmaW5lZCB8IGJvb2xlYW4gfCBudW1iZXIgfCBzdHJpbmcgfCBzeW1ib2wgfCBiaWdpbnQ7XG5jb25zdCBpc1ByaW1pdGl2ZSA9ICh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFByaW1pdGl2ZSA9PlxuICB2YWx1ZSA9PT0gbnVsbCB8fCAodHlwZW9mIHZhbHVlICE9ICdvYmplY3QnICYmIHR5cGVvZiB2YWx1ZSAhPSAnZnVuY3Rpb24nKTtcbmNvbnN0IGlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuY29uc3QgaXNJdGVyYWJsZSA9ICh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIEl0ZXJhYmxlPHVua25vd24+ID0+XG4gIGlzQXJyYXkodmFsdWUpIHx8XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gIHR5cGVvZiAodmFsdWUgYXMgYW55KT8uW1N5bWJvbC5pdGVyYXRvcl0gPT09ICdmdW5jdGlvbic7XG5cbmNvbnN0IFNQQUNFX0NIQVIgPSBgWyBcXHRcXG5cXGZcXHJdYDtcbmNvbnN0IEFUVFJfVkFMVUVfQ0hBUiA9IGBbXiBcXHRcXG5cXGZcXHJcIidcXGA8Pj1dYDtcbmNvbnN0IE5BTUVfQ0hBUiA9IGBbXlxcXFxzXCInPj0vXWA7XG5cbi8vIFRoZXNlIHJlZ2V4ZXMgcmVwcmVzZW50IHRoZSBmaXZlIHBhcnNpbmcgc3RhdGVzIHRoYXQgd2UgY2FyZSBhYm91dCBpbiB0aGVcbi8vIFRlbXBsYXRlJ3MgSFRNTCBzY2FubmVyLiBUaGV5IG1hdGNoIHRoZSAqZW5kKiBvZiB0aGUgc3RhdGUgdGhleSdyZSBuYW1lZFxuLy8gYWZ0ZXIuXG4vLyBEZXBlbmRpbmcgb24gdGhlIG1hdGNoLCB3ZSB0cmFuc2l0aW9uIHRvIGEgbmV3IHN0YXRlLiBJZiB0aGVyZSdzIG5vIG1hdGNoLFxuLy8gd2Ugc3RheSBpbiB0aGUgc2FtZSBzdGF0ZS5cbi8vIE5vdGUgdGhhdCB0aGUgcmVnZXhlcyBhcmUgc3RhdGVmdWwuIFdlIHV0aWxpemUgbGFzdEluZGV4IGFuZCBzeW5jIGl0XG4vLyBhY3Jvc3MgdGhlIG11bHRpcGxlIHJlZ2V4ZXMgdXNlZC4gSW4gYWRkaXRpb24gdG8gdGhlIGZpdmUgcmVnZXhlcyBiZWxvd1xuLy8gd2UgYWxzbyBkeW5hbWljYWxseSBjcmVhdGUgYSByZWdleCB0byBmaW5kIHRoZSBtYXRjaGluZyBlbmQgdGFncyBmb3IgcmF3XG4vLyB0ZXh0IGVsZW1lbnRzLlxuXG4vKipcbiAqIEVuZCBvZiB0ZXh0IGlzOiBgPGAgZm9sbG93ZWQgYnk6XG4gKiAgIChjb21tZW50IHN0YXJ0KSBvciAodGFnKSBvciAoZHluYW1pYyB0YWcgYmluZGluZylcbiAqL1xuY29uc3QgdGV4dEVuZFJlZ2V4ID0gLzwoPzooIS0tfFxcL1teYS16QS1aXSl8KFxcLz9bYS16QS1aXVtePlxcc10qKXwoXFwvPyQpKS9nO1xuY29uc3QgQ09NTUVOVF9TVEFSVCA9IDE7XG5jb25zdCBUQUdfTkFNRSA9IDI7XG5jb25zdCBEWU5BTUlDX1RBR19OQU1FID0gMztcblxuY29uc3QgY29tbWVudEVuZFJlZ2V4ID0gLy0tPi9nO1xuLyoqXG4gKiBDb21tZW50cyBub3Qgc3RhcnRlZCB3aXRoIDwhLS0sIGxpa2UgPC97LCBjYW4gYmUgZW5kZWQgYnkgYSBzaW5nbGUgYD5gXG4gKi9cbmNvbnN0IGNvbW1lbnQyRW5kUmVnZXggPSAvPi9nO1xuXG4vKipcbiAqIFRoZSB0YWdFbmQgcmVnZXggbWF0Y2hlcyB0aGUgZW5kIG9mIHRoZSBcImluc2lkZSBhbiBvcGVuaW5nXCIgdGFnIHN5bnRheFxuICogcG9zaXRpb24uIEl0IGVpdGhlciBtYXRjaGVzIGEgYD5gLCBhbiBhdHRyaWJ1dGUtbGlrZSBzZXF1ZW5jZSwgb3IgdGhlIGVuZFxuICogb2YgdGhlIHN0cmluZyBhZnRlciBhIHNwYWNlIChhdHRyaWJ1dGUtbmFtZSBwb3NpdGlvbiBlbmRpbmcpLlxuICpcbiAqIFNlZSBhdHRyaWJ1dGVzIGluIHRoZSBIVE1MIHNwZWM6XG4gKiBodHRwczovL3d3dy53My5vcmcvVFIvaHRtbDUvc3ludGF4Lmh0bWwjZWxlbWVudHMtYXR0cmlidXRlc1xuICpcbiAqIFwiIFxcdFxcblxcZlxcclwiIGFyZSBIVE1MIHNwYWNlIGNoYXJhY3RlcnM6XG4gKiBodHRwczovL2luZnJhLnNwZWMud2hhdHdnLm9yZy8jYXNjaWktd2hpdGVzcGFjZVxuICpcbiAqIFNvIGFuIGF0dHJpYnV0ZSBpczpcbiAqICAqIFRoZSBuYW1lOiBhbnkgY2hhcmFjdGVyIGV4Y2VwdCBhIHdoaXRlc3BhY2UgY2hhcmFjdGVyLCAoXCIpLCAoJyksIFwiPlwiLFxuICogICAgXCI9XCIsIG9yIFwiL1wiLiBOb3RlOiB0aGlzIGlzIGRpZmZlcmVudCBmcm9tIHRoZSBIVE1MIHNwZWMgd2hpY2ggYWxzbyBleGNsdWRlcyBjb250cm9sIGNoYXJhY3RlcnMuXG4gKiAgKiBGb2xsb3dlZCBieSB6ZXJvIG9yIG1vcmUgc3BhY2UgY2hhcmFjdGVyc1xuICogICogRm9sbG93ZWQgYnkgXCI9XCJcbiAqICAqIEZvbGxvd2VkIGJ5IHplcm8gb3IgbW9yZSBzcGFjZSBjaGFyYWN0ZXJzXG4gKiAgKiBGb2xsb3dlZCBieTpcbiAqICAgICogQW55IGNoYXJhY3RlciBleGNlcHQgc3BhY2UsICgnKSwgKFwiKSwgXCI8XCIsIFwiPlwiLCBcIj1cIiwgKGApLCBvclxuICogICAgKiAoXCIpIHRoZW4gYW55IG5vbi0oXCIpLCBvclxuICogICAgKiAoJykgdGhlbiBhbnkgbm9uLSgnKVxuICovXG5jb25zdCB0YWdFbmRSZWdleCA9IG5ldyBSZWdFeHAoXG4gIGA+fCR7U1BBQ0VfQ0hBUn0oPzooJHtOQU1FX0NIQVJ9KykoJHtTUEFDRV9DSEFSfSo9JHtTUEFDRV9DSEFSfSooPzoke0FUVFJfVkFMVUVfQ0hBUn18KFwifCcpfCkpfCQpYCxcbiAgJ2cnXG4pO1xuY29uc3QgRU5USVJFX01BVENIID0gMDtcbmNvbnN0IEFUVFJJQlVURV9OQU1FID0gMTtcbmNvbnN0IFNQQUNFU19BTkRfRVFVQUxTID0gMjtcbmNvbnN0IFFVT1RFX0NIQVIgPSAzO1xuXG5jb25zdCBzaW5nbGVRdW90ZUF0dHJFbmRSZWdleCA9IC8nL2c7XG5jb25zdCBkb3VibGVRdW90ZUF0dHJFbmRSZWdleCA9IC9cIi9nO1xuLyoqXG4gKiBNYXRjaGVzIHRoZSByYXcgdGV4dCBlbGVtZW50cy5cbiAqXG4gKiBDb21tZW50cyBhcmUgbm90IHBhcnNlZCB3aXRoaW4gcmF3IHRleHQgZWxlbWVudHMsIHNvIHdlIG5lZWQgdG8gc2VhcmNoIHRoZWlyXG4gKiB0ZXh0IGNvbnRlbnQgZm9yIG1hcmtlciBzdHJpbmdzLlxuICovXG5jb25zdCByYXdUZXh0RWxlbWVudCA9IC9eKD86c2NyaXB0fHN0eWxlfHRleHRhcmVhfHRpdGxlKSQvaTtcblxuLyoqIFRlbXBsYXRlUmVzdWx0IHR5cGVzICovXG5jb25zdCBIVE1MX1JFU1VMVCA9IDE7XG5jb25zdCBTVkdfUkVTVUxUID0gMjtcblxudHlwZSBSZXN1bHRUeXBlID0gdHlwZW9mIEhUTUxfUkVTVUxUIHwgdHlwZW9mIFNWR19SRVNVTFQ7XG5cbi8vIFRlbXBsYXRlUGFydCB0eXBlc1xuLy8gSU1QT1JUQU5UOiB0aGVzZSBtdXN0IG1hdGNoIHRoZSB2YWx1ZXMgaW4gUGFydFR5cGVcbmNvbnN0IEFUVFJJQlVURV9QQVJUID0gMTtcbmNvbnN0IENISUxEX1BBUlQgPSAyO1xuY29uc3QgUFJPUEVSVFlfUEFSVCA9IDM7XG5jb25zdCBCT09MRUFOX0FUVFJJQlVURV9QQVJUID0gNDtcbmNvbnN0IEVWRU5UX1BBUlQgPSA1O1xuY29uc3QgRUxFTUVOVF9QQVJUID0gNjtcbmNvbnN0IENPTU1FTlRfUEFSVCA9IDc7XG5cbi8qKlxuICogVGhlIHJldHVybiB0eXBlIG9mIHRoZSB0ZW1wbGF0ZSB0YWcgZnVuY3Rpb25zLCB7QGxpbmtjb2RlIGh0bWx9IGFuZFxuICoge0BsaW5rY29kZSBzdmd9LlxuICpcbiAqIEEgYFRlbXBsYXRlUmVzdWx0YCBvYmplY3QgaG9sZHMgYWxsIHRoZSBpbmZvcm1hdGlvbiBhYm91dCBhIHRlbXBsYXRlXG4gKiBleHByZXNzaW9uIHJlcXVpcmVkIHRvIHJlbmRlciBpdDogdGhlIHRlbXBsYXRlIHN0cmluZ3MsIGV4cHJlc3Npb24gdmFsdWVzLFxuICogYW5kIHR5cGUgb2YgdGVtcGxhdGUgKGh0bWwgb3Igc3ZnKS5cbiAqXG4gKiBgVGVtcGxhdGVSZXN1bHRgIG9iamVjdHMgZG8gbm90IGNyZWF0ZSBhbnkgRE9NIG9uIHRoZWlyIG93bi4gVG8gY3JlYXRlIG9yXG4gKiB1cGRhdGUgRE9NIHlvdSBuZWVkIHRvIHJlbmRlciB0aGUgYFRlbXBsYXRlUmVzdWx0YC4gU2VlXG4gKiBbUmVuZGVyaW5nXShodHRwczovL2xpdC5kZXYvZG9jcy9jb21wb25lbnRzL3JlbmRlcmluZykgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKlxuICovXG5leHBvcnQgdHlwZSBUZW1wbGF0ZVJlc3VsdDxUIGV4dGVuZHMgUmVzdWx0VHlwZSA9IFJlc3VsdFR5cGU+ID0ge1xuICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICBbJ18kbGl0VHlwZSQnXTogVDtcbiAgc3RyaW5nczogVGVtcGxhdGVTdHJpbmdzQXJyYXk7XG4gIHZhbHVlczogdW5rbm93bltdO1xufTtcblxuZXhwb3J0IHR5cGUgSFRNTFRlbXBsYXRlUmVzdWx0ID0gVGVtcGxhdGVSZXN1bHQ8dHlwZW9mIEhUTUxfUkVTVUxUPjtcblxuZXhwb3J0IHR5cGUgU1ZHVGVtcGxhdGVSZXN1bHQgPSBUZW1wbGF0ZVJlc3VsdDx0eXBlb2YgU1ZHX1JFU1VMVD47XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdCB7XG4gIC8vIFRoaXMgaXMgYSBmYWN0b3J5IGluIG9yZGVyIHRvIG1ha2UgdGVtcGxhdGUgaW5pdGlhbGl6YXRpb24gbGF6eVxuICAvLyBhbmQgYWxsb3cgU2hhZHlSZW5kZXJPcHRpb25zIHNjb3BlIHRvIGJlIHBhc3NlZCBpbi5cbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgWydfJGxpdFR5cGUkJ106IENvbXBpbGVkVGVtcGxhdGU7XG4gIHZhbHVlczogdW5rbm93bltdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVkVGVtcGxhdGUgZXh0ZW5kcyBPbWl0PFRlbXBsYXRlLCAnZWwnPiB7XG4gIC8vIGVsIGlzIG92ZXJyaWRkZW4gdG8gYmUgb3B0aW9uYWwuIFdlIGluaXRpYWxpemUgaXQgb24gZmlyc3QgcmVuZGVyXG4gIGVsPzogSFRNTFRlbXBsYXRlRWxlbWVudDtcblxuICAvLyBUaGUgcHJlcGFyZWQgSFRNTCBzdHJpbmcgdG8gY3JlYXRlIGEgdGVtcGxhdGUgZWxlbWVudCBmcm9tLlxuICBoOiBUcnVzdGVkSFRNTDtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZXMgYSB0ZW1wbGF0ZSBsaXRlcmFsIHRhZyBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBUZW1wbGF0ZVJlc3VsdCB3aXRoXG4gKiB0aGUgZ2l2ZW4gcmVzdWx0IHR5cGUuXG4gKi9cbmNvbnN0IHRhZyA9XG4gIDxUIGV4dGVuZHMgUmVzdWx0VHlwZT4odHlwZTogVCkgPT5cbiAgKHN0cmluZ3M6IFRlbXBsYXRlU3RyaW5nc0FycmF5LCAuLi52YWx1ZXM6IHVua25vd25bXSk6IFRlbXBsYXRlUmVzdWx0PFQ+ID0+IHtcbiAgICAvLyBXYXJuIGFnYWluc3QgdGVtcGxhdGVzIG9jdGFsIGVzY2FwZSBzZXF1ZW5jZXNcbiAgICAvLyBXZSBkbyB0aGlzIGhlcmUgcmF0aGVyIHRoYW4gaW4gcmVuZGVyIHNvIHRoYXQgdGhlIHdhcm5pbmcgaXMgY2xvc2VyIHRvIHRoZVxuICAgIC8vIHRlbXBsYXRlIGRlZmluaXRpb24uXG4gICAgaWYgKERFVl9NT0RFICYmIHN0cmluZ3Muc29tZSgocykgPT4gcyA9PT0gdW5kZWZpbmVkKSkge1xuICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAnU29tZSB0ZW1wbGF0ZSBzdHJpbmdzIGFyZSB1bmRlZmluZWQuXFxuJyArXG4gICAgICAgICAgJ1RoaXMgaXMgcHJvYmFibHkgY2F1c2VkIGJ5IGlsbGVnYWwgb2N0YWwgZXNjYXBlIHNlcXVlbmNlcy4nXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICAgIFsnXyRsaXRUeXBlJCddOiB0eXBlLFxuICAgICAgc3RyaW5ncyxcbiAgICAgIHZhbHVlcyxcbiAgICB9O1xuICB9O1xuXG4vKipcbiAqIEludGVycHJldHMgYSB0ZW1wbGF0ZSBsaXRlcmFsIGFzIGFuIEhUTUwgdGVtcGxhdGUgdGhhdCBjYW4gZWZmaWNpZW50bHlcbiAqIHJlbmRlciB0byBhbmQgdXBkYXRlIGEgY29udGFpbmVyLlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBoZWFkZXIgPSAodGl0bGU6IHN0cmluZykgPT4gaHRtbGA8aDE+JHt0aXRsZX08L2gxPmA7XG4gKiBgYGBcbiAqXG4gKiBUaGUgYGh0bWxgIHRhZyByZXR1cm5zIGEgZGVzY3JpcHRpb24gb2YgdGhlIERPTSB0byByZW5kZXIgYXMgYSB2YWx1ZS4gSXQgaXNcbiAqIGxhenksIG1lYW5pbmcgbm8gd29yayBpcyBkb25lIHVudGlsIHRoZSB0ZW1wbGF0ZSBpcyByZW5kZXJlZC4gV2hlbiByZW5kZXJpbmcsXG4gKiBpZiBhIHRlbXBsYXRlIGNvbWVzIGZyb20gdGhlIHNhbWUgZXhwcmVzc2lvbiBhcyBhIHByZXZpb3VzbHkgcmVuZGVyZWQgcmVzdWx0LFxuICogaXQncyBlZmZpY2llbnRseSB1cGRhdGVkIGluc3RlYWQgb2YgcmVwbGFjZWQuXG4gKi9cbmV4cG9ydCBjb25zdCBodG1sID0gdGFnKEhUTUxfUkVTVUxUKTtcblxuLyoqXG4gKiBJbnRlcnByZXRzIGEgdGVtcGxhdGUgbGl0ZXJhbCBhcyBhbiBTVkcgZnJhZ21lbnQgdGhhdCBjYW4gZWZmaWNpZW50bHlcbiAqIHJlbmRlciB0byBhbmQgdXBkYXRlIGEgY29udGFpbmVyLlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCByZWN0ID0gc3ZnYDxyZWN0IHdpZHRoPVwiMTBcIiBoZWlnaHQ9XCIxMFwiPjwvcmVjdD5gO1xuICpcbiAqIGNvbnN0IG15SW1hZ2UgPSBodG1sYFxuICogICA8c3ZnIHZpZXdCb3g9XCIwIDAgMTAgMTBcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XG4gKiAgICAgJHtyZWN0fVxuICogICA8L3N2Zz5gO1xuICogYGBgXG4gKlxuICogVGhlIGBzdmdgICp0YWcgZnVuY3Rpb24qIHNob3VsZCBvbmx5IGJlIHVzZWQgZm9yIFNWRyBmcmFnbWVudHMsIG9yIGVsZW1lbnRzXG4gKiB0aGF0IHdvdWxkIGJlIGNvbnRhaW5lZCAqKmluc2lkZSoqIGFuIGA8c3ZnPmAgSFRNTCBlbGVtZW50LiBBIGNvbW1vbiBlcnJvciBpc1xuICogcGxhY2luZyBhbiBgPHN2Zz5gICplbGVtZW50KiBpbiBhIHRlbXBsYXRlIHRhZ2dlZCB3aXRoIHRoZSBgc3ZnYCB0YWdcbiAqIGZ1bmN0aW9uLiBUaGUgYDxzdmc+YCBlbGVtZW50IGlzIGFuIEhUTUwgZWxlbWVudCBhbmQgc2hvdWxkIGJlIHVzZWQgd2l0aGluIGFcbiAqIHRlbXBsYXRlIHRhZ2dlZCB3aXRoIHRoZSB7QGxpbmtjb2RlIGh0bWx9IHRhZyBmdW5jdGlvbi5cbiAqXG4gKiBJbiBMaXRFbGVtZW50IHVzYWdlLCBpdCdzIGludmFsaWQgdG8gcmV0dXJuIGFuIFNWRyBmcmFnbWVudCBmcm9tIHRoZVxuICogYHJlbmRlcigpYCBtZXRob2QsIGFzIHRoZSBTVkcgZnJhZ21lbnQgd2lsbCBiZSBjb250YWluZWQgd2l0aGluIHRoZSBlbGVtZW50J3NcbiAqIHNoYWRvdyByb290IGFuZCB0aHVzIGNhbm5vdCBiZSB1c2VkIHdpdGhpbiBhbiBgPHN2Zz5gIEhUTUwgZWxlbWVudC5cbiAqL1xuZXhwb3J0IGNvbnN0IHN2ZyA9IHRhZyhTVkdfUkVTVUxUKTtcblxuLyoqXG4gKiBBIHNlbnRpbmVsIHZhbHVlIHRoYXQgc2lnbmFscyB0aGF0IGEgdmFsdWUgd2FzIGhhbmRsZWQgYnkgYSBkaXJlY3RpdmUgYW5kXG4gKiBzaG91bGQgbm90IGJlIHdyaXR0ZW4gdG8gdGhlIERPTS5cbiAqL1xuZXhwb3J0IGNvbnN0IG5vQ2hhbmdlID0gU3ltYm9sLmZvcignbGl0LW5vQ2hhbmdlJyk7XG5cbi8qKlxuICogQSBzZW50aW5lbCB2YWx1ZSB0aGF0IHNpZ25hbHMgYSBDaGlsZFBhcnQgdG8gZnVsbHkgY2xlYXIgaXRzIGNvbnRlbnQuXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGJ1dHRvbiA9IGh0bWxgJHtcbiAqICB1c2VyLmlzQWRtaW5cbiAqICAgID8gaHRtbGA8YnV0dG9uPkRFTEVURTwvYnV0dG9uPmBcbiAqICAgIDogbm90aGluZ1xuICogfWA7XG4gKiBgYGBcbiAqXG4gKiBQcmVmZXIgdXNpbmcgYG5vdGhpbmdgIG92ZXIgb3RoZXIgZmFsc3kgdmFsdWVzIGFzIGl0IHByb3ZpZGVzIGEgY29uc2lzdGVudFxuICogYmVoYXZpb3IgYmV0d2VlbiB2YXJpb3VzIGV4cHJlc3Npb24gYmluZGluZyBjb250ZXh0cy5cbiAqXG4gKiBJbiBjaGlsZCBleHByZXNzaW9ucywgYHVuZGVmaW5lZGAsIGBudWxsYCwgYCcnYCwgYW5kIGBub3RoaW5nYCBhbGwgYmVoYXZlIHRoZVxuICogc2FtZSBhbmQgcmVuZGVyIG5vIG5vZGVzLiBJbiBhdHRyaWJ1dGUgZXhwcmVzc2lvbnMsIGBub3RoaW5nYCBfcmVtb3Zlc18gdGhlXG4gKiBhdHRyaWJ1dGUsIHdoaWxlIGB1bmRlZmluZWRgIGFuZCBgbnVsbGAgd2lsbCByZW5kZXIgYW4gZW1wdHkgc3RyaW5nLiBJblxuICogcHJvcGVydHkgZXhwcmVzc2lvbnMgYG5vdGhpbmdgIGJlY29tZXMgYHVuZGVmaW5lZGAuXG4gKi9cbmV4cG9ydCBjb25zdCBub3RoaW5nID0gU3ltYm9sLmZvcignbGl0LW5vdGhpbmcnKTtcblxuLyoqXG4gKiBUaGUgY2FjaGUgb2YgcHJlcGFyZWQgdGVtcGxhdGVzLCBrZXllZCBieSB0aGUgdGFnZ2VkIFRlbXBsYXRlU3RyaW5nc0FycmF5XG4gKiBhbmQgX25vdF8gYWNjb3VudGluZyBmb3IgdGhlIHNwZWNpZmljIHRlbXBsYXRlIHRhZyB1c2VkLiBUaGlzIG1lYW5zIHRoYXRcbiAqIHRlbXBsYXRlIHRhZ3MgY2Fubm90IGJlIGR5bmFtaWMgLSB0aGUgbXVzdCBzdGF0aWNhbGx5IGJlIG9uZSBvZiBodG1sLCBzdmcsXG4gKiBvciBhdHRyLiBUaGlzIHJlc3RyaWN0aW9uIHNpbXBsaWZpZXMgdGhlIGNhY2hlIGxvb2t1cCwgd2hpY2ggaXMgb24gdGhlIGhvdFxuICogcGF0aCBmb3IgcmVuZGVyaW5nLlxuICovXG5jb25zdCB0ZW1wbGF0ZUNhY2hlID0gbmV3IFdlYWtNYXA8VGVtcGxhdGVTdHJpbmdzQXJyYXksIFRlbXBsYXRlPigpO1xuXG4vKipcbiAqIE9iamVjdCBzcGVjaWZ5aW5nIG9wdGlvbnMgZm9yIGNvbnRyb2xsaW5nIGxpdC1odG1sIHJlbmRlcmluZy4gTm90ZSB0aGF0XG4gKiB3aGlsZSBgcmVuZGVyYCBtYXkgYmUgY2FsbGVkIG11bHRpcGxlIHRpbWVzIG9uIHRoZSBzYW1lIGBjb250YWluZXJgIChhbmRcbiAqIGByZW5kZXJCZWZvcmVgIHJlZmVyZW5jZSBub2RlKSB0byBlZmZpY2llbnRseSB1cGRhdGUgdGhlIHJlbmRlcmVkIGNvbnRlbnQsXG4gKiBvbmx5IHRoZSBvcHRpb25zIHBhc3NlZCBpbiBkdXJpbmcgdGhlIGZpcnN0IHJlbmRlciBhcmUgcmVzcGVjdGVkIGR1cmluZ1xuICogdGhlIGxpZmV0aW1lIG9mIHJlbmRlcnMgdG8gdGhhdCB1bmlxdWUgYGNvbnRhaW5lcmAgKyBgcmVuZGVyQmVmb3JlYFxuICogY29tYmluYXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVuZGVyT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBBbiBvYmplY3QgdG8gdXNlIGFzIHRoZSBgdGhpc2AgdmFsdWUgZm9yIGV2ZW50IGxpc3RlbmVycy4gSXQncyBvZnRlblxuICAgKiB1c2VmdWwgdG8gc2V0IHRoaXMgdG8gdGhlIGhvc3QgY29tcG9uZW50IHJlbmRlcmluZyBhIHRlbXBsYXRlLlxuICAgKi9cbiAgaG9zdD86IG9iamVjdDtcbiAgLyoqXG4gICAqIEEgRE9NIG5vZGUgYmVmb3JlIHdoaWNoIHRvIHJlbmRlciBjb250ZW50IGluIHRoZSBjb250YWluZXIuXG4gICAqL1xuICByZW5kZXJCZWZvcmU/OiBDaGlsZE5vZGUgfCBudWxsO1xuICAvKipcbiAgICogTm9kZSB1c2VkIGZvciBjbG9uaW5nIHRoZSB0ZW1wbGF0ZSAoYGltcG9ydE5vZGVgIHdpbGwgYmUgY2FsbGVkIG9uIHRoaXNcbiAgICogbm9kZSkuIFRoaXMgY29udHJvbHMgdGhlIGBvd25lckRvY3VtZW50YCBvZiB0aGUgcmVuZGVyZWQgRE9NLCBhbG9uZyB3aXRoXG4gICAqIGFueSBpbmhlcml0ZWQgY29udGV4dC4gRGVmYXVsdHMgdG8gdGhlIGdsb2JhbCBgZG9jdW1lbnRgLlxuICAgKi9cbiAgY3JlYXRpb25TY29wZT86IHtpbXBvcnROb2RlKG5vZGU6IE5vZGUsIGRlZXA/OiBib29sZWFuKTogTm9kZX07XG4gIC8qKlxuICAgKiBUaGUgaW5pdGlhbCBjb25uZWN0ZWQgc3RhdGUgZm9yIHRoZSB0b3AtbGV2ZWwgcGFydCBiZWluZyByZW5kZXJlZC4gSWYgbm9cbiAgICogYGlzQ29ubmVjdGVkYCBvcHRpb24gaXMgc2V0LCBgQXN5bmNEaXJlY3RpdmVgcyB3aWxsIGJlIGNvbm5lY3RlZCBieVxuICAgKiBkZWZhdWx0LiBTZXQgdG8gYGZhbHNlYCBpZiB0aGUgaW5pdGlhbCByZW5kZXIgb2NjdXJzIGluIGEgZGlzY29ubmVjdGVkIHRyZWVcbiAgICogYW5kIGBBc3luY0RpcmVjdGl2ZWBzIHNob3VsZCBzZWUgYGlzQ29ubmVjdGVkID09PSBmYWxzZWAgZm9yIHRoZWlyIGluaXRpYWxcbiAgICogcmVuZGVyLiBUaGUgYHBhcnQuc2V0Q29ubmVjdGVkKClgIG1ldGhvZCBtdXN0IGJlIHVzZWQgc3Vic2VxdWVudCB0byBpbml0aWFsXG4gICAqIHJlbmRlciB0byBjaGFuZ2UgdGhlIGNvbm5lY3RlZCBzdGF0ZSBvZiB0aGUgcGFydC5cbiAgICovXG4gIGlzQ29ubmVjdGVkPzogYm9vbGVhbjtcbn1cblxuY29uc3Qgd2Fsa2VyID0gZC5jcmVhdGVUcmVlV2Fsa2VyKFxuICBkLFxuICAxMjkgLyogTm9kZUZpbHRlci5TSE9XX3tFTEVNRU5UfENPTU1FTlR9ICovLFxuICBudWxsLFxuICBmYWxzZVxuKTtcblxubGV0IHNhbml0aXplckZhY3RvcnlJbnRlcm5hbDogU2FuaXRpemVyRmFjdG9yeSA9IG5vb3BTYW5pdGl6ZXI7XG5cbi8vXG4vLyBDbGFzc2VzIG9ubHkgYmVsb3cgaGVyZSwgY29uc3QgdmFyaWFibGUgZGVjbGFyYXRpb25zIG9ubHkgYWJvdmUgaGVyZS4uLlxuLy9cbi8vIEtlZXBpbmcgdmFyaWFibGUgZGVjbGFyYXRpb25zIGFuZCBjbGFzc2VzIHRvZ2V0aGVyIGltcHJvdmVzIG1pbmlmaWNhdGlvbi5cbi8vIEludGVyZmFjZXMgYW5kIHR5cGUgYWxpYXNlcyBjYW4gYmUgaW50ZXJsZWF2ZWQgZnJlZWx5LlxuLy9cblxuLy8gVHlwZSBmb3IgY2xhc3NlcyB0aGF0IGhhdmUgYSBgX2RpcmVjdGl2ZWAgb3IgYF9kaXJlY3RpdmVzW11gIGZpZWxkLCB1c2VkIGJ5XG4vLyBgcmVzb2x2ZURpcmVjdGl2ZWBcbmV4cG9ydCBpbnRlcmZhY2UgRGlyZWN0aXZlUGFyZW50IHtcbiAgXyRwYXJlbnQ/OiBEaXJlY3RpdmVQYXJlbnQ7XG4gIF8kaXNDb25uZWN0ZWQ6IGJvb2xlYW47XG4gIF9fZGlyZWN0aXZlPzogRGlyZWN0aXZlO1xuICBfX2RpcmVjdGl2ZXM/OiBBcnJheTxEaXJlY3RpdmUgfCB1bmRlZmluZWQ+O1xufVxuXG4vKipcbiAqIFJldHVybnMgYW4gSFRNTCBzdHJpbmcgZm9yIHRoZSBnaXZlbiBUZW1wbGF0ZVN0cmluZ3NBcnJheSBhbmQgcmVzdWx0IHR5cGVcbiAqIChIVE1MIG9yIFNWRyksIGFsb25nIHdpdGggdGhlIGNhc2Utc2Vuc2l0aXZlIGJvdW5kIGF0dHJpYnV0ZSBuYW1lcyBpblxuICogdGVtcGxhdGUgb3JkZXIuIFRoZSBIVE1MIGNvbnRhaW5zIGNvbW1lbnQgbWFya2VycyBkZW5vdGluZyB0aGUgYENoaWxkUGFydGBzXG4gKiBhbmQgc3VmZml4ZXMgb24gYm91bmQgYXR0cmlidXRlcyBkZW5vdGluZyB0aGUgYEF0dHJpYnV0ZVBhcnRzYC5cbiAqXG4gKiBAcGFyYW0gc3RyaW5ncyB0ZW1wbGF0ZSBzdHJpbmdzIGFycmF5XG4gKiBAcGFyYW0gdHlwZSBIVE1MIG9yIFNWR1xuICogQHJldHVybiBBcnJheSBjb250YWluaW5nIGBbaHRtbCwgYXR0ck5hbWVzXWAgKGFycmF5IHJldHVybmVkIGZvciB0ZXJzZW5lc3MsXG4gKiAgICAgdG8gYXZvaWQgb2JqZWN0IGZpZWxkcyBzaW5jZSB0aGlzIGNvZGUgaXMgc2hhcmVkIHdpdGggbm9uLW1pbmlmaWVkIFNTUlxuICogICAgIGNvZGUpXG4gKi9cbmNvbnN0IGdldFRlbXBsYXRlSHRtbCA9IChcbiAgc3RyaW5nczogVGVtcGxhdGVTdHJpbmdzQXJyYXksXG4gIHR5cGU6IFJlc3VsdFR5cGVcbik6IFtUcnVzdGVkSFRNTCwgQXJyYXk8c3RyaW5nIHwgdW5kZWZpbmVkPl0gPT4ge1xuICAvLyBJbnNlcnQgbWFrZXJzIGludG8gdGhlIHRlbXBsYXRlIEhUTUwgdG8gcmVwcmVzZW50IHRoZSBwb3NpdGlvbiBvZlxuICAvLyBiaW5kaW5ncy4gVGhlIGZvbGxvd2luZyBjb2RlIHNjYW5zIHRoZSB0ZW1wbGF0ZSBzdHJpbmdzIHRvIGRldGVybWluZSB0aGVcbiAgLy8gc3ludGFjdGljIHBvc2l0aW9uIG9mIHRoZSBiaW5kaW5ncy4gVGhleSBjYW4gYmUgaW4gdGV4dCBwb3NpdGlvbiwgd2hlcmVcbiAgLy8gd2UgaW5zZXJ0IGFuIEhUTUwgY29tbWVudCwgYXR0cmlidXRlIHZhbHVlIHBvc2l0aW9uLCB3aGVyZSB3ZSBpbnNlcnQgYVxuICAvLyBzZW50aW5lbCBzdHJpbmcgYW5kIHJlLXdyaXRlIHRoZSBhdHRyaWJ1dGUgbmFtZSwgb3IgaW5zaWRlIGEgdGFnIHdoZXJlXG4gIC8vIHdlIGluc2VydCB0aGUgc2VudGluZWwgc3RyaW5nLlxuICBjb25zdCBsID0gc3RyaW5ncy5sZW5ndGggLSAxO1xuICAvLyBTdG9yZXMgdGhlIGNhc2Utc2Vuc2l0aXZlIGJvdW5kIGF0dHJpYnV0ZSBuYW1lcyBpbiB0aGUgb3JkZXIgb2YgdGhlaXJcbiAgLy8gcGFydHMuIEVsZW1lbnRQYXJ0cyBhcmUgYWxzbyByZWZsZWN0ZWQgaW4gdGhpcyBhcnJheSBhcyB1bmRlZmluZWRcbiAgLy8gcmF0aGVyIHRoYW4gYSBzdHJpbmcsIHRvIGRpc2FtYmlndWF0ZSBmcm9tIGF0dHJpYnV0ZSBiaW5kaW5ncy5cbiAgY29uc3QgYXR0ck5hbWVzOiBBcnJheTxzdHJpbmcgfCB1bmRlZmluZWQ+ID0gW107XG4gIGxldCBodG1sID0gdHlwZSA9PT0gU1ZHX1JFU1VMVCA/ICc8c3ZnPicgOiAnJztcblxuICAvLyBXaGVuIHdlJ3JlIGluc2lkZSBhIHJhdyB0ZXh0IHRhZyAobm90IGl0J3MgdGV4dCBjb250ZW50KSwgdGhlIHJlZ2V4XG4gIC8vIHdpbGwgc3RpbGwgYmUgdGFnUmVnZXggc28gd2UgY2FuIGZpbmQgYXR0cmlidXRlcywgYnV0IHdpbGwgc3dpdGNoIHRvXG4gIC8vIHRoaXMgcmVnZXggd2hlbiB0aGUgdGFnIGVuZHMuXG4gIGxldCByYXdUZXh0RW5kUmVnZXg6IFJlZ0V4cCB8IHVuZGVmaW5lZDtcblxuICAvLyBUaGUgY3VycmVudCBwYXJzaW5nIHN0YXRlLCByZXByZXNlbnRlZCBhcyBhIHJlZmVyZW5jZSB0byBvbmUgb2YgdGhlXG4gIC8vIHJlZ2V4ZXNcbiAgbGV0IHJlZ2V4ID0gdGV4dEVuZFJlZ2V4O1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgY29uc3QgcyA9IHN0cmluZ3NbaV07XG4gICAgLy8gVGhlIGluZGV4IG9mIHRoZSBlbmQgb2YgdGhlIGxhc3QgYXR0cmlidXRlIG5hbWUuIFdoZW4gdGhpcyBpc1xuICAgIC8vIHBvc2l0aXZlIGF0IGVuZCBvZiBhIHN0cmluZywgaXQgbWVhbnMgd2UncmUgaW4gYW4gYXR0cmlidXRlIHZhbHVlXG4gICAgLy8gcG9zaXRpb24gYW5kIG5lZWQgdG8gcmV3cml0ZSB0aGUgYXR0cmlidXRlIG5hbWUuXG4gICAgLy8gV2UgYWxzbyB1c2UgYSBzcGVjaWFsIHZhbHVlIG9mIC0yIHRvIGluZGljYXRlIHRoYXQgd2UgZW5jb3VudGVyZWRcbiAgICAvLyB0aGUgZW5kIG9mIGEgc3RyaW5nIGluIGF0dHJpYnV0ZSBuYW1lIHBvc2l0aW9uLlxuICAgIGxldCBhdHRyTmFtZUVuZEluZGV4ID0gLTE7XG4gICAgbGV0IGF0dHJOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgbGV0IGxhc3RJbmRleCA9IDA7XG4gICAgbGV0IG1hdGNoITogUmVnRXhwRXhlY0FycmF5IHwgbnVsbDtcblxuICAgIC8vIFRoZSBjb25kaXRpb25zIGluIHRoaXMgbG9vcCBoYW5kbGUgdGhlIGN1cnJlbnQgcGFyc2Ugc3RhdGUsIGFuZCB0aGVcbiAgICAvLyBhc3NpZ25tZW50cyB0byB0aGUgYHJlZ2V4YCB2YXJpYWJsZSBhcmUgdGhlIHN0YXRlIHRyYW5zaXRpb25zLlxuICAgIHdoaWxlIChsYXN0SW5kZXggPCBzLmxlbmd0aCkge1xuICAgICAgLy8gTWFrZSBzdXJlIHdlIHN0YXJ0IHNlYXJjaGluZyBmcm9tIHdoZXJlIHdlIHByZXZpb3VzbHkgbGVmdCBvZmZcbiAgICAgIHJlZ2V4Lmxhc3RJbmRleCA9IGxhc3RJbmRleDtcbiAgICAgIG1hdGNoID0gcmVnZXguZXhlYyhzKTtcbiAgICAgIGlmIChtYXRjaCA9PT0gbnVsbCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGxhc3RJbmRleCA9IHJlZ2V4Lmxhc3RJbmRleDtcbiAgICAgIGlmIChyZWdleCA9PT0gdGV4dEVuZFJlZ2V4KSB7XG4gICAgICAgIGlmIChtYXRjaFtDT01NRU5UX1NUQVJUXSA9PT0gJyEtLScpIHtcbiAgICAgICAgICByZWdleCA9IGNvbW1lbnRFbmRSZWdleDtcbiAgICAgICAgfSBlbHNlIGlmIChtYXRjaFtDT01NRU5UX1NUQVJUXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gV2Ugc3RhcnRlZCBhIHdlaXJkIGNvbW1lbnQsIGxpa2UgPC97XG4gICAgICAgICAgcmVnZXggPSBjb21tZW50MkVuZFJlZ2V4O1xuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoW1RBR19OQU1FXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKHJhd1RleHRFbGVtZW50LnRlc3QobWF0Y2hbVEFHX05BTUVdKSkge1xuICAgICAgICAgICAgLy8gUmVjb3JkIGlmIHdlIGVuY291bnRlciBhIHJhdy10ZXh0IGVsZW1lbnQuIFdlJ2xsIHN3aXRjaCB0b1xuICAgICAgICAgICAgLy8gdGhpcyByZWdleCBhdCB0aGUgZW5kIG9mIHRoZSB0YWcuXG4gICAgICAgICAgICByYXdUZXh0RW5kUmVnZXggPSBuZXcgUmVnRXhwKGA8LyR7bWF0Y2hbVEFHX05BTUVdfWAsICdnJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlZ2V4ID0gdGFnRW5kUmVnZXg7XG4gICAgICAgIH0gZWxzZSBpZiAobWF0Y2hbRFlOQU1JQ19UQUdfTkFNRV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmIChERVZfTU9ERSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAnQmluZGluZ3MgaW4gdGFnIG5hbWVzIGFyZSBub3Qgc3VwcG9ydGVkLiBQbGVhc2UgdXNlIHN0YXRpYyB0ZW1wbGF0ZXMgaW5zdGVhZC4gJyArXG4gICAgICAgICAgICAgICAgJ1NlZSBodHRwczovL2xpdC5kZXYvZG9jcy90ZW1wbGF0ZXMvZXhwcmVzc2lvbnMvI3N0YXRpYy1leHByZXNzaW9ucydcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlZ2V4ID0gdGFnRW5kUmVnZXg7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocmVnZXggPT09IHRhZ0VuZFJlZ2V4KSB7XG4gICAgICAgIGlmIChtYXRjaFtFTlRJUkVfTUFUQ0hdID09PSAnPicpIHtcbiAgICAgICAgICAvLyBFbmQgb2YgYSB0YWcuIElmIHdlIGhhZCBzdGFydGVkIGEgcmF3LXRleHQgZWxlbWVudCwgdXNlIHRoYXRcbiAgICAgICAgICAvLyByZWdleFxuICAgICAgICAgIHJlZ2V4ID0gcmF3VGV4dEVuZFJlZ2V4ID8/IHRleHRFbmRSZWdleDtcbiAgICAgICAgICAvLyBXZSBtYXkgYmUgZW5kaW5nIGFuIHVucXVvdGVkIGF0dHJpYnV0ZSB2YWx1ZSwgc28gbWFrZSBzdXJlIHdlXG4gICAgICAgICAgLy8gY2xlYXIgYW55IHBlbmRpbmcgYXR0ck5hbWVFbmRJbmRleFxuICAgICAgICAgIGF0dHJOYW1lRW5kSW5kZXggPSAtMTtcbiAgICAgICAgfSBlbHNlIGlmIChtYXRjaFtBVFRSSUJVVEVfTkFNRV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIEF0dHJpYnV0ZSBuYW1lIHBvc2l0aW9uXG4gICAgICAgICAgYXR0ck5hbWVFbmRJbmRleCA9IC0yO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF0dHJOYW1lRW5kSW5kZXggPSByZWdleC5sYXN0SW5kZXggLSBtYXRjaFtTUEFDRVNfQU5EX0VRVUFMU10ubGVuZ3RoO1xuICAgICAgICAgIGF0dHJOYW1lID0gbWF0Y2hbQVRUUklCVVRFX05BTUVdO1xuICAgICAgICAgIHJlZ2V4ID1cbiAgICAgICAgICAgIG1hdGNoW1FVT1RFX0NIQVJdID09PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgPyB0YWdFbmRSZWdleFxuICAgICAgICAgICAgICA6IG1hdGNoW1FVT1RFX0NIQVJdID09PSAnXCInXG4gICAgICAgICAgICAgID8gZG91YmxlUXVvdGVBdHRyRW5kUmVnZXhcbiAgICAgICAgICAgICAgOiBzaW5nbGVRdW90ZUF0dHJFbmRSZWdleDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgcmVnZXggPT09IGRvdWJsZVF1b3RlQXR0ckVuZFJlZ2V4IHx8XG4gICAgICAgIHJlZ2V4ID09PSBzaW5nbGVRdW90ZUF0dHJFbmRSZWdleFxuICAgICAgKSB7XG4gICAgICAgIHJlZ2V4ID0gdGFnRW5kUmVnZXg7XG4gICAgICB9IGVsc2UgaWYgKHJlZ2V4ID09PSBjb21tZW50RW5kUmVnZXggfHwgcmVnZXggPT09IGNvbW1lbnQyRW5kUmVnZXgpIHtcbiAgICAgICAgcmVnZXggPSB0ZXh0RW5kUmVnZXg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBOb3Qgb25lIG9mIHRoZSBmaXZlIHN0YXRlIHJlZ2V4ZXMsIHNvIGl0IG11c3QgYmUgdGhlIGR5bmFtaWNhbGx5XG4gICAgICAgIC8vIGNyZWF0ZWQgcmF3IHRleHQgcmVnZXggYW5kIHdlJ3JlIGF0IHRoZSBjbG9zZSBvZiB0aGF0IGVsZW1lbnQuXG4gICAgICAgIHJlZ2V4ID0gdGFnRW5kUmVnZXg7XG4gICAgICAgIHJhd1RleHRFbmRSZWdleCA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoREVWX01PREUpIHtcbiAgICAgIC8vIElmIHdlIGhhdmUgYSBhdHRyTmFtZUVuZEluZGV4LCB3aGljaCBpbmRpY2F0ZXMgdGhhdCB3ZSBzaG91bGRcbiAgICAgIC8vIHJld3JpdGUgdGhlIGF0dHJpYnV0ZSBuYW1lLCBhc3NlcnQgdGhhdCB3ZSdyZSBpbiBhIHZhbGlkIGF0dHJpYnV0ZVxuICAgICAgLy8gcG9zaXRpb24gLSBlaXRoZXIgaW4gYSB0YWcsIG9yIGEgcXVvdGVkIGF0dHJpYnV0ZSB2YWx1ZS5cbiAgICAgIGNvbnNvbGUuYXNzZXJ0KFxuICAgICAgICBhdHRyTmFtZUVuZEluZGV4ID09PSAtMSB8fFxuICAgICAgICAgIHJlZ2V4ID09PSB0YWdFbmRSZWdleCB8fFxuICAgICAgICAgIHJlZ2V4ID09PSBzaW5nbGVRdW90ZUF0dHJFbmRSZWdleCB8fFxuICAgICAgICAgIHJlZ2V4ID09PSBkb3VibGVRdW90ZUF0dHJFbmRSZWdleCxcbiAgICAgICAgJ3VuZXhwZWN0ZWQgcGFyc2Ugc3RhdGUgQidcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gV2UgaGF2ZSBmb3VyIGNhc2VzOlxuICAgIC8vICAxLiBXZSdyZSBpbiB0ZXh0IHBvc2l0aW9uLCBhbmQgbm90IGluIGEgcmF3IHRleHQgZWxlbWVudFxuICAgIC8vICAgICAocmVnZXggPT09IHRleHRFbmRSZWdleCk6IGluc2VydCBhIGNvbW1lbnQgbWFya2VyLlxuICAgIC8vICAyLiBXZSBoYXZlIGEgbm9uLW5lZ2F0aXZlIGF0dHJOYW1lRW5kSW5kZXggd2hpY2ggbWVhbnMgd2UgbmVlZCB0b1xuICAgIC8vICAgICByZXdyaXRlIHRoZSBhdHRyaWJ1dGUgbmFtZSB0byBhZGQgYSBib3VuZCBhdHRyaWJ1dGUgc3VmZml4LlxuICAgIC8vICAzLiBXZSdyZSBhdCB0aGUgbm9uLWZpcnN0IGJpbmRpbmcgaW4gYSBtdWx0aS1iaW5kaW5nIGF0dHJpYnV0ZSwgdXNlIGFcbiAgICAvLyAgICAgcGxhaW4gbWFya2VyLlxuICAgIC8vICA0LiBXZSdyZSBzb21ld2hlcmUgZWxzZSBpbnNpZGUgdGhlIHRhZy4gSWYgd2UncmUgaW4gYXR0cmlidXRlIG5hbWVcbiAgICAvLyAgICAgcG9zaXRpb24gKGF0dHJOYW1lRW5kSW5kZXggPT09IC0yKSwgYWRkIGEgc2VxdWVudGlhbCBzdWZmaXggdG9cbiAgICAvLyAgICAgZ2VuZXJhdGUgYSB1bmlxdWUgYXR0cmlidXRlIG5hbWUuXG5cbiAgICAvLyBEZXRlY3QgYSBiaW5kaW5nIG5leHQgdG8gc2VsZi1jbG9zaW5nIHRhZyBlbmQgYW5kIGluc2VydCBhIHNwYWNlIHRvXG4gICAgLy8gc2VwYXJhdGUgdGhlIG1hcmtlciBmcm9tIHRoZSB0YWcgZW5kOlxuICAgIGNvbnN0IGVuZCA9XG4gICAgICByZWdleCA9PT0gdGFnRW5kUmVnZXggJiYgc3RyaW5nc1tpICsgMV0uc3RhcnRzV2l0aCgnLz4nKSA/ICcgJyA6ICcnO1xuICAgIGh0bWwgKz1cbiAgICAgIHJlZ2V4ID09PSB0ZXh0RW5kUmVnZXhcbiAgICAgICAgPyBzICsgbm9kZU1hcmtlclxuICAgICAgICA6IGF0dHJOYW1lRW5kSW5kZXggPj0gMFxuICAgICAgICA/IChhdHRyTmFtZXMucHVzaChhdHRyTmFtZSEpLFxuICAgICAgICAgIHMuc2xpY2UoMCwgYXR0ck5hbWVFbmRJbmRleCkgK1xuICAgICAgICAgICAgYm91bmRBdHRyaWJ1dGVTdWZmaXggK1xuICAgICAgICAgICAgcy5zbGljZShhdHRyTmFtZUVuZEluZGV4KSkgK1xuICAgICAgICAgIG1hcmtlciArXG4gICAgICAgICAgZW5kXG4gICAgICAgIDogcyArXG4gICAgICAgICAgbWFya2VyICtcbiAgICAgICAgICAoYXR0ck5hbWVFbmRJbmRleCA9PT0gLTIgPyAoYXR0ck5hbWVzLnB1c2godW5kZWZpbmVkKSwgaSkgOiBlbmQpO1xuICB9XG5cbiAgY29uc3QgaHRtbFJlc3VsdDogc3RyaW5nIHwgVHJ1c3RlZEhUTUwgPVxuICAgIGh0bWwgKyAoc3RyaW5nc1tsXSB8fCAnPD8+JykgKyAodHlwZSA9PT0gU1ZHX1JFU1VMVCA/ICc8L3N2Zz4nIDogJycpO1xuXG4gIC8vIEEgc2VjdXJpdHkgY2hlY2sgdG8gcHJldmVudCBzcG9vZmluZyBvZiBMaXQgdGVtcGxhdGUgcmVzdWx0cy5cbiAgLy8gSW4gdGhlIGZ1dHVyZSwgd2UgbWF5IGJlIGFibGUgdG8gcmVwbGFjZSB0aGlzIHdpdGggQXJyYXkuaXNUZW1wbGF0ZU9iamVjdCxcbiAgLy8gdGhvdWdoIHdlIG1pZ2h0IG5lZWQgdG8gbWFrZSB0aGF0IGNoZWNrIGluc2lkZSBvZiB0aGUgaHRtbCBhbmQgc3ZnXG4gIC8vIGZ1bmN0aW9ucywgYmVjYXVzZSBwcmVjb21waWxlZCB0ZW1wbGF0ZXMgZG9uJ3QgY29tZSBpbiBhc1xuICAvLyBUZW1wbGF0ZVN0cmluZ0FycmF5IG9iamVjdHMuXG4gIGlmICghQXJyYXkuaXNBcnJheShzdHJpbmdzKSB8fCAhc3RyaW5ncy5oYXNPd25Qcm9wZXJ0eSgncmF3JykpIHtcbiAgICBsZXQgbWVzc2FnZSA9ICdpbnZhbGlkIHRlbXBsYXRlIHN0cmluZ3MgYXJyYXknO1xuICAgIGlmIChERVZfTU9ERSkge1xuICAgICAgbWVzc2FnZSA9IGBcbiAgICAgICAgICBJbnRlcm5hbCBFcnJvcjogZXhwZWN0ZWQgdGVtcGxhdGUgc3RyaW5ncyB0byBiZSBhbiBhcnJheVxuICAgICAgICAgIHdpdGggYSAncmF3JyBmaWVsZC4gRmFraW5nIGEgdGVtcGxhdGUgc3RyaW5ncyBhcnJheSBieVxuICAgICAgICAgIGNhbGxpbmcgaHRtbCBvciBzdmcgbGlrZSBhbiBvcmRpbmFyeSBmdW5jdGlvbiBpcyBlZmZlY3RpdmVseVxuICAgICAgICAgIHRoZSBzYW1lIGFzIGNhbGxpbmcgdW5zYWZlSHRtbCBhbmQgY2FuIGxlYWQgdG8gbWFqb3Igc2VjdXJpdHlcbiAgICAgICAgICBpc3N1ZXMsIGUuZy4gb3BlbmluZyB5b3VyIGNvZGUgdXAgdG8gWFNTIGF0dGFja3MuXG5cbiAgICAgICAgICBJZiB5b3UncmUgdXNpbmcgdGhlIGh0bWwgb3Igc3ZnIHRhZ2dlZCB0ZW1wbGF0ZSBmdW5jdGlvbnMgbm9ybWFsbHlcbiAgICAgICAgICBhbmQgc3RpbGwgc2VlaW5nIHRoaXMgZXJyb3IsIHBsZWFzZSBmaWxlIGEgYnVnIGF0XG4gICAgICAgICAgaHR0cHM6Ly9naXRodWIuY29tL2xpdC9saXQvaXNzdWVzL25ldz90ZW1wbGF0ZT1idWdfcmVwb3J0Lm1kXG4gICAgICAgICAgYW5kIGluY2x1ZGUgaW5mb3JtYXRpb24gYWJvdXQgeW91ciBidWlsZCB0b29saW5nLCBpZiBhbnkuXG4gICAgICAgIGBcbiAgICAgICAgLnRyaW0oKVxuICAgICAgICAucmVwbGFjZSgvXFxuICovZywgJ1xcbicpO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gIH1cbiAgLy8gUmV0dXJuZWQgYXMgYW4gYXJyYXkgZm9yIHRlcnNlbmVzc1xuICByZXR1cm4gW1xuICAgIHBvbGljeSAhPT0gdW5kZWZpbmVkXG4gICAgICA/IHBvbGljeS5jcmVhdGVIVE1MKGh0bWxSZXN1bHQpXG4gICAgICA6IChodG1sUmVzdWx0IGFzIHVua25vd24gYXMgVHJ1c3RlZEhUTUwpLFxuICAgIGF0dHJOYW1lcyxcbiAgXTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIHtUZW1wbGF0ZX07XG5jbGFzcyBUZW1wbGF0ZSB7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgZWwhOiBIVE1MVGVtcGxhdGVFbGVtZW50O1xuXG4gIHBhcnRzOiBBcnJheTxUZW1wbGF0ZVBhcnQ+ID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICB7c3RyaW5ncywgWydfJGxpdFR5cGUkJ106IHR5cGV9OiBUZW1wbGF0ZVJlc3VsdCxcbiAgICBvcHRpb25zPzogUmVuZGVyT3B0aW9uc1xuICApIHtcbiAgICBsZXQgbm9kZTogTm9kZSB8IG51bGw7XG4gICAgbGV0IG5vZGVJbmRleCA9IDA7XG4gICAgbGV0IGF0dHJOYW1lSW5kZXggPSAwO1xuICAgIGNvbnN0IHBhcnRDb3VudCA9IHN0cmluZ3MubGVuZ3RoIC0gMTtcbiAgICBjb25zdCBwYXJ0cyA9IHRoaXMucGFydHM7XG5cbiAgICAvLyBDcmVhdGUgdGVtcGxhdGUgZWxlbWVudFxuICAgIGNvbnN0IFtodG1sLCBhdHRyTmFtZXNdID0gZ2V0VGVtcGxhdGVIdG1sKHN0cmluZ3MsIHR5cGUpO1xuICAgIHRoaXMuZWwgPSBUZW1wbGF0ZS5jcmVhdGVFbGVtZW50KGh0bWwsIG9wdGlvbnMpO1xuICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IHRoaXMuZWwuY29udGVudDtcblxuICAgIC8vIFJlcGFyZW50IFNWRyBub2RlcyBpbnRvIHRlbXBsYXRlIHJvb3RcbiAgICBpZiAodHlwZSA9PT0gU1ZHX1JFU1VMVCkge1xuICAgICAgY29uc3QgY29udGVudCA9IHRoaXMuZWwuY29udGVudDtcbiAgICAgIGNvbnN0IHN2Z0VsZW1lbnQgPSBjb250ZW50LmZpcnN0Q2hpbGQhO1xuICAgICAgc3ZnRWxlbWVudC5yZW1vdmUoKTtcbiAgICAgIGNvbnRlbnQuYXBwZW5kKC4uLnN2Z0VsZW1lbnQuY2hpbGROb2Rlcyk7XG4gICAgfVxuXG4gICAgLy8gV2FsayB0aGUgdGVtcGxhdGUgdG8gZmluZCBiaW5kaW5nIG1hcmtlcnMgYW5kIGNyZWF0ZSBUZW1wbGF0ZVBhcnRzXG4gICAgd2hpbGUgKChub2RlID0gd2Fsa2VyLm5leHROb2RlKCkpICE9PSBudWxsICYmIHBhcnRzLmxlbmd0aCA8IHBhcnRDb3VudCkge1xuICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgaWYgKERFVl9NT0RFKSB7XG4gICAgICAgICAgY29uc3QgdGFnID0gKG5vZGUgYXMgRWxlbWVudCkubG9jYWxOYW1lO1xuICAgICAgICAgIC8vIFdhcm4gaWYgYHRleHRhcmVhYCBpbmNsdWRlcyBhbiBleHByZXNzaW9uIGFuZCB0aHJvdyBpZiBgdGVtcGxhdGVgXG4gICAgICAgICAgLy8gZG9lcyBzaW5jZSB0aGVzZSBhcmUgbm90IHN1cHBvcnRlZC4gV2UgZG8gdGhpcyBieSBjaGVja2luZ1xuICAgICAgICAgIC8vIGlubmVySFRNTCBmb3IgYW55dGhpbmcgdGhhdCBsb29rcyBsaWtlIGEgbWFya2VyLiBUaGlzIGNhdGNoZXNcbiAgICAgICAgICAvLyBjYXNlcyBsaWtlIGJpbmRpbmdzIGluIHRleHRhcmVhIHRoZXJlIG1hcmtlcnMgdHVybiBpbnRvIHRleHQgbm9kZXMuXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgL14oPzp0ZXh0YXJlYXx0ZW1wbGF0ZSkkL2khLnRlc3QodGFnKSAmJlxuICAgICAgICAgICAgKG5vZGUgYXMgRWxlbWVudCkuaW5uZXJIVE1MLmluY2x1ZGVzKG1hcmtlcilcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIGNvbnN0IG0gPVxuICAgICAgICAgICAgICBgRXhwcmVzc2lvbnMgYXJlIG5vdCBzdXBwb3J0ZWQgaW5zaWRlIFxcYCR7dGFnfVxcYCBgICtcbiAgICAgICAgICAgICAgYGVsZW1lbnRzLiBTZWUgaHR0cHM6Ly9saXQuZGV2L21zZy9leHByZXNzaW9uLWluLSR7dGFnfSBmb3IgbW9yZSBgICtcbiAgICAgICAgICAgICAgYGluZm9ybWF0aW9uLmA7XG4gICAgICAgICAgICBpZiAodGFnID09PSAndGVtcGxhdGUnKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtKTtcbiAgICAgICAgICAgIH0gZWxzZSBpc3N1ZVdhcm5pbmcoJycsIG0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPIChqdXN0aW5mYWduYW5pKTogZm9yIGF0dGVtcHRlZCBkeW5hbWljIHRhZyBuYW1lcywgd2UgZG9uJ3RcbiAgICAgICAgLy8gaW5jcmVtZW50IHRoZSBiaW5kaW5nSW5kZXgsIGFuZCBpdCdsbCBiZSBvZmYgYnkgMSBpbiB0aGUgZWxlbWVudFxuICAgICAgICAvLyBhbmQgb2ZmIGJ5IHR3byBhZnRlciBpdC5cbiAgICAgICAgaWYgKChub2RlIGFzIEVsZW1lbnQpLmhhc0F0dHJpYnV0ZXMoKSkge1xuICAgICAgICAgIC8vIFdlIGRlZmVyIHJlbW92aW5nIGJvdW5kIGF0dHJpYnV0ZXMgYmVjYXVzZSBvbiBJRSB3ZSBtaWdodCBub3QgYmVcbiAgICAgICAgICAvLyBpdGVyYXRpbmcgYXR0cmlidXRlcyBpbiB0aGVpciB0ZW1wbGF0ZSBvcmRlciwgYW5kIHdvdWxkIHNvbWV0aW1lc1xuICAgICAgICAgIC8vIHJlbW92ZSBhbiBhdHRyaWJ1dGUgdGhhdCB3ZSBzdGlsbCBuZWVkIHRvIGNyZWF0ZSBhIHBhcnQgZm9yLlxuICAgICAgICAgIGNvbnN0IGF0dHJzVG9SZW1vdmUgPSBbXTtcbiAgICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgKG5vZGUgYXMgRWxlbWVudCkuZ2V0QXR0cmlidXRlTmFtZXMoKSkge1xuICAgICAgICAgICAgLy8gYG5hbWVgIGlzIHRoZSBuYW1lIG9mIHRoZSBhdHRyaWJ1dGUgd2UncmUgaXRlcmF0aW5nIG92ZXIsIGJ1dCBub3RcbiAgICAgICAgICAgIC8vIF9uZWNlc3NhcmlseV8gdGhlIG5hbWUgb2YgdGhlIGF0dHJpYnV0ZSB3ZSB3aWxsIGNyZWF0ZSBhIHBhcnRcbiAgICAgICAgICAgIC8vIGZvci4gVGhleSBjYW4gYmUgZGlmZmVyZW50IGluIGJyb3dzZXJzIHRoYXQgZG9uJ3QgaXRlcmF0ZSBvblxuICAgICAgICAgICAgLy8gYXR0cmlidXRlcyBpbiBzb3VyY2Ugb3JkZXIuIEluIHRoYXQgY2FzZSB0aGUgYXR0ck5hbWVzIGFycmF5XG4gICAgICAgICAgICAvLyBjb250YWlucyB0aGUgYXR0cmlidXRlIG5hbWUgd2UnbGwgcHJvY2VzcyBuZXh0LiBXZSBvbmx5IG5lZWQgdGhlXG4gICAgICAgICAgICAvLyBhdHRyaWJ1dGUgbmFtZSBoZXJlIHRvIGtub3cgaWYgd2Ugc2hvdWxkIHByb2Nlc3MgYSBib3VuZCBhdHRyaWJ1dGVcbiAgICAgICAgICAgIC8vIG9uIHRoaXMgZWxlbWVudC5cbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgbmFtZS5lbmRzV2l0aChib3VuZEF0dHJpYnV0ZVN1ZmZpeCkgfHxcbiAgICAgICAgICAgICAgbmFtZS5zdGFydHNXaXRoKG1hcmtlcilcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICBjb25zdCByZWFsTmFtZSA9IGF0dHJOYW1lc1thdHRyTmFtZUluZGV4KytdO1xuICAgICAgICAgICAgICBhdHRyc1RvUmVtb3ZlLnB1c2gobmFtZSk7XG4gICAgICAgICAgICAgIGlmIChyZWFsTmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgLy8gTG93ZXJjYXNlIGZvciBjYXNlLXNlbnNpdGl2ZSBTVkcgYXR0cmlidXRlcyBsaWtlIHZpZXdCb3hcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IChub2RlIGFzIEVsZW1lbnQpLmdldEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICAgIHJlYWxOYW1lLnRvTG93ZXJDYXNlKCkgKyBib3VuZEF0dHJpYnV0ZVN1ZmZpeFxuICAgICAgICAgICAgICAgICkhO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRpY3MgPSB2YWx1ZS5zcGxpdChtYXJrZXIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG0gPSAvKFsuP0BdKT8oLiopLy5leGVjKHJlYWxOYW1lKSE7XG4gICAgICAgICAgICAgICAgcGFydHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICB0eXBlOiBBVFRSSUJVVEVfUEFSVCxcbiAgICAgICAgICAgICAgICAgIGluZGV4OiBub2RlSW5kZXgsXG4gICAgICAgICAgICAgICAgICBuYW1lOiBtWzJdLFxuICAgICAgICAgICAgICAgICAgc3RyaW5nczogc3RhdGljcyxcbiAgICAgICAgICAgICAgICAgIGN0b3I6XG4gICAgICAgICAgICAgICAgICAgIG1bMV0gPT09ICcuJ1xuICAgICAgICAgICAgICAgICAgICAgID8gUHJvcGVydHlQYXJ0XG4gICAgICAgICAgICAgICAgICAgICAgOiBtWzFdID09PSAnPydcbiAgICAgICAgICAgICAgICAgICAgICA/IEJvb2xlYW5BdHRyaWJ1dGVQYXJ0XG4gICAgICAgICAgICAgICAgICAgICAgOiBtWzFdID09PSAnQCdcbiAgICAgICAgICAgICAgICAgICAgICA/IEV2ZW50UGFydFxuICAgICAgICAgICAgICAgICAgICAgIDogQXR0cmlidXRlUGFydCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6IEVMRU1FTlRfUEFSVCxcbiAgICAgICAgICAgICAgICAgIGluZGV4OiBub2RlSW5kZXgsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGF0dHJzVG9SZW1vdmUpIHtcbiAgICAgICAgICAgIChub2RlIGFzIEVsZW1lbnQpLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETyAoanVzdGluZmFnbmFuaSk6IGJlbmNobWFyayB0aGUgcmVnZXggYWdhaW5zdCB0ZXN0aW5nIGZvciBlYWNoXG4gICAgICAgIC8vIG9mIHRoZSAzIHJhdyB0ZXh0IGVsZW1lbnQgbmFtZXMuXG4gICAgICAgIGlmIChyYXdUZXh0RWxlbWVudC50ZXN0KChub2RlIGFzIEVsZW1lbnQpLnRhZ05hbWUpKSB7XG4gICAgICAgICAgLy8gRm9yIHJhdyB0ZXh0IGVsZW1lbnRzIHdlIG5lZWQgdG8gc3BsaXQgdGhlIHRleHQgY29udGVudCBvblxuICAgICAgICAgIC8vIG1hcmtlcnMsIGNyZWF0ZSBhIFRleHQgbm9kZSBmb3IgZWFjaCBzZWdtZW50LCBhbmQgY3JlYXRlXG4gICAgICAgICAgLy8gYSBUZW1wbGF0ZVBhcnQgZm9yIGVhY2ggbWFya2VyLlxuICAgICAgICAgIGNvbnN0IHN0cmluZ3MgPSAobm9kZSBhcyBFbGVtZW50KS50ZXh0Q29udGVudCEuc3BsaXQobWFya2VyKTtcbiAgICAgICAgICBjb25zdCBsYXN0SW5kZXggPSBzdHJpbmdzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgaWYgKGxhc3RJbmRleCA+IDApIHtcbiAgICAgICAgICAgIChub2RlIGFzIEVsZW1lbnQpLnRleHRDb250ZW50ID0gdHJ1c3RlZFR5cGVzXG4gICAgICAgICAgICAgID8gKHRydXN0ZWRUeXBlcy5lbXB0eVNjcmlwdCBhcyB1bmtub3duIGFzICcnKVxuICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgLy8gR2VuZXJhdGUgYSBuZXcgdGV4dCBub2RlIGZvciBlYWNoIGxpdGVyYWwgc2VjdGlvblxuICAgICAgICAgICAgLy8gVGhlc2Ugbm9kZXMgYXJlIGFsc28gdXNlZCBhcyB0aGUgbWFya2VycyBmb3Igbm9kZSBwYXJ0c1xuICAgICAgICAgICAgLy8gV2UgY2FuJ3QgdXNlIGVtcHR5IHRleHQgbm9kZXMgYXMgbWFya2VycyBiZWNhdXNlIHRoZXkncmVcbiAgICAgICAgICAgIC8vIG5vcm1hbGl6ZWQgd2hlbiBjbG9uaW5nIGluIElFIChjb3VsZCBzaW1wbGlmeSB3aGVuXG4gICAgICAgICAgICAvLyBJRSBpcyBubyBsb25nZXIgc3VwcG9ydGVkKVxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsYXN0SW5kZXg7IGkrKykge1xuICAgICAgICAgICAgICAobm9kZSBhcyBFbGVtZW50KS5hcHBlbmQoc3RyaW5nc1tpXSwgY3JlYXRlTWFya2VyKCkpO1xuICAgICAgICAgICAgICAvLyBXYWxrIHBhc3QgdGhlIG1hcmtlciBub2RlIHdlIGp1c3QgYWRkZWRcbiAgICAgICAgICAgICAgd2Fsa2VyLm5leHROb2RlKCk7XG4gICAgICAgICAgICAgIHBhcnRzLnB1c2goe3R5cGU6IENISUxEX1BBUlQsIGluZGV4OiArK25vZGVJbmRleH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTm90ZSBiZWNhdXNlIHRoaXMgbWFya2VyIGlzIGFkZGVkIGFmdGVyIHRoZSB3YWxrZXIncyBjdXJyZW50XG4gICAgICAgICAgICAvLyBub2RlLCBpdCB3aWxsIGJlIHdhbGtlZCB0byBpbiB0aGUgb3V0ZXIgbG9vcCAoYW5kIGlnbm9yZWQpLCBzb1xuICAgICAgICAgICAgLy8gd2UgZG9uJ3QgbmVlZCB0byBhZGp1c3Qgbm9kZUluZGV4IGhlcmVcbiAgICAgICAgICAgIChub2RlIGFzIEVsZW1lbnQpLmFwcGVuZChzdHJpbmdzW2xhc3RJbmRleF0sIGNyZWF0ZU1hcmtlcigpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gOCkge1xuICAgICAgICBjb25zdCBkYXRhID0gKG5vZGUgYXMgQ29tbWVudCkuZGF0YTtcbiAgICAgICAgaWYgKGRhdGEgPT09IG1hcmtlck1hdGNoKSB7XG4gICAgICAgICAgcGFydHMucHVzaCh7dHlwZTogQ0hJTERfUEFSVCwgaW5kZXg6IG5vZGVJbmRleH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxldCBpID0gLTE7XG4gICAgICAgICAgd2hpbGUgKChpID0gKG5vZGUgYXMgQ29tbWVudCkuZGF0YS5pbmRleE9mKG1hcmtlciwgaSArIDEpKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIC8vIENvbW1lbnQgbm9kZSBoYXMgYSBiaW5kaW5nIG1hcmtlciBpbnNpZGUsIG1ha2UgYW4gaW5hY3RpdmUgcGFydFxuICAgICAgICAgICAgLy8gVGhlIGJpbmRpbmcgd29uJ3Qgd29yaywgYnV0IHN1YnNlcXVlbnQgYmluZGluZ3Mgd2lsbFxuICAgICAgICAgICAgcGFydHMucHVzaCh7dHlwZTogQ09NTUVOVF9QQVJULCBpbmRleDogbm9kZUluZGV4fSk7XG4gICAgICAgICAgICAvLyBNb3ZlIHRvIHRoZSBlbmQgb2YgdGhlIG1hdGNoXG4gICAgICAgICAgICBpICs9IG1hcmtlci5sZW5ndGggLSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbm9kZUluZGV4Kys7XG4gICAgfVxuICAgIC8vIFdlIGNvdWxkIHNldCB3YWxrZXIuY3VycmVudE5vZGUgdG8gYW5vdGhlciBub2RlIGhlcmUgdG8gcHJldmVudCBhIG1lbW9yeVxuICAgIC8vIGxlYWssIGJ1dCBldmVyeSB0aW1lIHdlIHByZXBhcmUgYSB0ZW1wbGF0ZSwgd2UgaW1tZWRpYXRlbHkgcmVuZGVyIGl0XG4gICAgLy8gYW5kIHJlLXVzZSB0aGUgd2Fsa2VyIGluIG5ldyBUZW1wbGF0ZUluc3RhbmNlLl9jbG9uZSgpLlxuICAgIGRlYnVnTG9nRXZlbnQ/Lih7XG4gICAgICBraW5kOiAndGVtcGxhdGUgcHJlcCcsXG4gICAgICB0ZW1wbGF0ZTogdGhpcyxcbiAgICAgIGNsb25hYmxlVGVtcGxhdGU6IHRoaXMuZWwsXG4gICAgICBwYXJ0czogdGhpcy5wYXJ0cyxcbiAgICAgIHN0cmluZ3MsXG4gICAgfSk7XG4gIH1cblxuICAvLyBPdmVycmlkZGVuIHZpYSBgbGl0SHRtbFBvbHlmaWxsU3VwcG9ydGAgdG8gcHJvdmlkZSBwbGF0Zm9ybSBzdXBwb3J0LlxuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGNyZWF0ZUVsZW1lbnQoaHRtbDogVHJ1c3RlZEhUTUwsIF9vcHRpb25zPzogUmVuZGVyT3B0aW9ucykge1xuICAgIGNvbnN0IGVsID0gZC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICAgIGVsLmlubmVySFRNTCA9IGh0bWwgYXMgdW5rbm93biBhcyBzdHJpbmc7XG4gICAgcmV0dXJuIGVsO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGlzY29ubmVjdGFibGUge1xuICBfJHBhcmVudD86IERpc2Nvbm5lY3RhYmxlO1xuICBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4/OiBTZXQ8RGlzY29ubmVjdGFibGU+O1xuICAvLyBSYXRoZXIgdGhhbiBob2xkIGNvbm5lY3Rpb24gc3RhdGUgb24gaW5zdGFuY2VzLCBEaXNjb25uZWN0YWJsZXMgcmVjdXJzaXZlbHlcbiAgLy8gZmV0Y2ggdGhlIGNvbm5lY3Rpb24gc3RhdGUgZnJvbSB0aGUgUm9vdFBhcnQgdGhleSBhcmUgY29ubmVjdGVkIGluIHZpYVxuICAvLyBnZXR0ZXJzIHVwIHRoZSBEaXNjb25uZWN0YWJsZSB0cmVlIHZpYSBfJHBhcmVudCByZWZlcmVuY2VzLiBUaGlzIHB1c2hlcyB0aGVcbiAgLy8gY29zdCBvZiB0cmFja2luZyB0aGUgaXNDb25uZWN0ZWQgc3RhdGUgdG8gYEFzeW5jRGlyZWN0aXZlc2AsIGFuZCBhdm9pZHNcbiAgLy8gbmVlZGluZyB0byBwYXNzIGFsbCBEaXNjb25uZWN0YWJsZXMgKHBhcnRzLCB0ZW1wbGF0ZSBpbnN0YW5jZXMsIGFuZFxuICAvLyBkaXJlY3RpdmVzKSB0aGVpciBjb25uZWN0aW9uIHN0YXRlIGVhY2ggdGltZSBpdCBjaGFuZ2VzLCB3aGljaCB3b3VsZCBiZVxuICAvLyBjb3N0bHkgZm9yIHRyZWVzIHRoYXQgaGF2ZSBubyBBc3luY0RpcmVjdGl2ZXMuXG4gIF8kaXNDb25uZWN0ZWQ6IGJvb2xlYW47XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVEaXJlY3RpdmUoXG4gIHBhcnQ6IENoaWxkUGFydCB8IEF0dHJpYnV0ZVBhcnQgfCBFbGVtZW50UGFydCxcbiAgdmFsdWU6IHVua25vd24sXG4gIHBhcmVudDogRGlyZWN0aXZlUGFyZW50ID0gcGFydCxcbiAgYXR0cmlidXRlSW5kZXg/OiBudW1iZXJcbik6IHVua25vd24ge1xuICAvLyBCYWlsIGVhcmx5IGlmIHRoZSB2YWx1ZSBpcyBleHBsaWNpdGx5IG5vQ2hhbmdlLiBOb3RlLCB0aGlzIG1lYW5zIGFueVxuICAvLyBuZXN0ZWQgZGlyZWN0aXZlIGlzIHN0aWxsIGF0dGFjaGVkIGFuZCBpcyBub3QgcnVuLlxuICBpZiAodmFsdWUgPT09IG5vQ2hhbmdlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIGxldCBjdXJyZW50RGlyZWN0aXZlID1cbiAgICBhdHRyaWJ1dGVJbmRleCAhPT0gdW5kZWZpbmVkXG4gICAgICA/IChwYXJlbnQgYXMgQXR0cmlidXRlUGFydCkuX19kaXJlY3RpdmVzPy5bYXR0cmlidXRlSW5kZXhdXG4gICAgICA6IChwYXJlbnQgYXMgQ2hpbGRQYXJ0IHwgRWxlbWVudFBhcnQgfCBEaXJlY3RpdmUpLl9fZGlyZWN0aXZlO1xuICBjb25zdCBuZXh0RGlyZWN0aXZlQ29uc3RydWN0b3IgPSBpc1ByaW1pdGl2ZSh2YWx1ZSlcbiAgICA/IHVuZGVmaW5lZFxuICAgIDogLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICAgICh2YWx1ZSBhcyBEaXJlY3RpdmVSZXN1bHQpWydfJGxpdERpcmVjdGl2ZSQnXTtcbiAgaWYgKGN1cnJlbnREaXJlY3RpdmU/LmNvbnN0cnVjdG9yICE9PSBuZXh0RGlyZWN0aXZlQ29uc3RydWN0b3IpIHtcbiAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIGN1cnJlbnREaXJlY3RpdmU/LlsnXyRub3RpZnlEaXJlY3RpdmVDb25uZWN0aW9uQ2hhbmdlZCddPy4oZmFsc2UpO1xuICAgIGlmIChuZXh0RGlyZWN0aXZlQ29uc3RydWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY3VycmVudERpcmVjdGl2ZSA9IHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgY3VycmVudERpcmVjdGl2ZSA9IG5ldyBuZXh0RGlyZWN0aXZlQ29uc3RydWN0b3IocGFydCBhcyBQYXJ0SW5mbyk7XG4gICAgICBjdXJyZW50RGlyZWN0aXZlLl8kaW5pdGlhbGl6ZShwYXJ0LCBwYXJlbnQsIGF0dHJpYnV0ZUluZGV4KTtcbiAgICB9XG4gICAgaWYgKGF0dHJpYnV0ZUluZGV4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICgocGFyZW50IGFzIEF0dHJpYnV0ZVBhcnQpLl9fZGlyZWN0aXZlcyA/Pz0gW10pW2F0dHJpYnV0ZUluZGV4XSA9XG4gICAgICAgIGN1cnJlbnREaXJlY3RpdmU7XG4gICAgfSBlbHNlIHtcbiAgICAgIChwYXJlbnQgYXMgQ2hpbGRQYXJ0IHwgRGlyZWN0aXZlKS5fX2RpcmVjdGl2ZSA9IGN1cnJlbnREaXJlY3RpdmU7XG4gICAgfVxuICB9XG4gIGlmIChjdXJyZW50RGlyZWN0aXZlICE9PSB1bmRlZmluZWQpIHtcbiAgICB2YWx1ZSA9IHJlc29sdmVEaXJlY3RpdmUoXG4gICAgICBwYXJ0LFxuICAgICAgY3VycmVudERpcmVjdGl2ZS5fJHJlc29sdmUocGFydCwgKHZhbHVlIGFzIERpcmVjdGl2ZVJlc3VsdCkudmFsdWVzKSxcbiAgICAgIGN1cnJlbnREaXJlY3RpdmUsXG4gICAgICBhdHRyaWJ1dGVJbmRleFxuICAgICk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5leHBvcnQgdHlwZSB7VGVtcGxhdGVJbnN0YW5jZX07XG4vKipcbiAqIEFuIHVwZGF0ZWFibGUgaW5zdGFuY2Ugb2YgYSBUZW1wbGF0ZS4gSG9sZHMgcmVmZXJlbmNlcyB0byB0aGUgUGFydHMgdXNlZCB0b1xuICogdXBkYXRlIHRoZSB0ZW1wbGF0ZSBpbnN0YW5jZS5cbiAqL1xuY2xhc3MgVGVtcGxhdGVJbnN0YW5jZSBpbXBsZW1lbnRzIERpc2Nvbm5lY3RhYmxlIHtcbiAgXyR0ZW1wbGF0ZTogVGVtcGxhdGU7XG4gIF8kcGFydHM6IEFycmF5PFBhcnQgfCB1bmRlZmluZWQ+ID0gW107XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHBhcmVudDogQ2hpbGRQYXJ0O1xuICAvKiogQGludGVybmFsICovXG4gIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT4gPSB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IodGVtcGxhdGU6IFRlbXBsYXRlLCBwYXJlbnQ6IENoaWxkUGFydCkge1xuICAgIHRoaXMuXyR0ZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICAgIHRoaXMuXyRwYXJlbnQgPSBwYXJlbnQ7XG4gIH1cblxuICAvLyBDYWxsZWQgYnkgQ2hpbGRQYXJ0IHBhcmVudE5vZGUgZ2V0dGVyXG4gIGdldCBwYXJlbnROb2RlKCkge1xuICAgIHJldHVybiB0aGlzLl8kcGFyZW50LnBhcmVudE5vZGU7XG4gIH1cblxuICAvLyBTZWUgY29tbWVudCBpbiBEaXNjb25uZWN0YWJsZSBpbnRlcmZhY2UgZm9yIHdoeSB0aGlzIGlzIGEgZ2V0dGVyXG4gIGdldCBfJGlzQ29ubmVjdGVkKCkge1xuICAgIHJldHVybiB0aGlzLl8kcGFyZW50Ll8kaXNDb25uZWN0ZWQ7XG4gIH1cblxuICAvLyBUaGlzIG1ldGhvZCBpcyBzZXBhcmF0ZSBmcm9tIHRoZSBjb25zdHJ1Y3RvciBiZWNhdXNlIHdlIG5lZWQgdG8gcmV0dXJuIGFcbiAgLy8gRG9jdW1lbnRGcmFnbWVudCBhbmQgd2UgZG9uJ3Qgd2FudCB0byBob2xkIG9udG8gaXQgd2l0aCBhbiBpbnN0YW5jZSBmaWVsZC5cbiAgX2Nsb25lKG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQpIHtcbiAgICBjb25zdCB7XG4gICAgICBlbDoge2NvbnRlbnR9LFxuICAgICAgcGFydHM6IHBhcnRzLFxuICAgIH0gPSB0aGlzLl8kdGVtcGxhdGU7XG4gICAgY29uc3QgZnJhZ21lbnQgPSAob3B0aW9ucz8uY3JlYXRpb25TY29wZSA/PyBkKS5pbXBvcnROb2RlKGNvbnRlbnQsIHRydWUpO1xuICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IGZyYWdtZW50O1xuXG4gICAgbGV0IG5vZGUgPSB3YWxrZXIubmV4dE5vZGUoKSE7XG4gICAgbGV0IG5vZGVJbmRleCA9IDA7XG4gICAgbGV0IHBhcnRJbmRleCA9IDA7XG4gICAgbGV0IHRlbXBsYXRlUGFydCA9IHBhcnRzWzBdO1xuXG4gICAgd2hpbGUgKHRlbXBsYXRlUGFydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAobm9kZUluZGV4ID09PSB0ZW1wbGF0ZVBhcnQuaW5kZXgpIHtcbiAgICAgICAgbGV0IHBhcnQ6IFBhcnQgfCB1bmRlZmluZWQ7XG4gICAgICAgIGlmICh0ZW1wbGF0ZVBhcnQudHlwZSA9PT0gQ0hJTERfUEFSVCkge1xuICAgICAgICAgIHBhcnQgPSBuZXcgQ2hpbGRQYXJ0KFxuICAgICAgICAgICAgbm9kZSBhcyBIVE1MRWxlbWVudCxcbiAgICAgICAgICAgIG5vZGUubmV4dFNpYmxpbmcsXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgb3B0aW9uc1xuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAodGVtcGxhdGVQYXJ0LnR5cGUgPT09IEFUVFJJQlVURV9QQVJUKSB7XG4gICAgICAgICAgcGFydCA9IG5ldyB0ZW1wbGF0ZVBhcnQuY3RvcihcbiAgICAgICAgICAgIG5vZGUgYXMgSFRNTEVsZW1lbnQsXG4gICAgICAgICAgICB0ZW1wbGF0ZVBhcnQubmFtZSxcbiAgICAgICAgICAgIHRlbXBsYXRlUGFydC5zdHJpbmdzLFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgIG9wdGlvbnNcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlUGFydC50eXBlID09PSBFTEVNRU5UX1BBUlQpIHtcbiAgICAgICAgICBwYXJ0ID0gbmV3IEVsZW1lbnRQYXJ0KG5vZGUgYXMgSFRNTEVsZW1lbnQsIHRoaXMsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuXyRwYXJ0cy5wdXNoKHBhcnQpO1xuICAgICAgICB0ZW1wbGF0ZVBhcnQgPSBwYXJ0c1srK3BhcnRJbmRleF07XG4gICAgICB9XG4gICAgICBpZiAobm9kZUluZGV4ICE9PSB0ZW1wbGF0ZVBhcnQ/LmluZGV4KSB7XG4gICAgICAgIG5vZGUgPSB3YWxrZXIubmV4dE5vZGUoKSE7XG4gICAgICAgIG5vZGVJbmRleCsrO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBXZSBuZWVkIHRvIHNldCB0aGUgY3VycmVudE5vZGUgYXdheSBmcm9tIHRoZSBjbG9uZWQgdHJlZSBzbyB0aGF0IHdlXG4gICAgLy8gZG9uJ3QgaG9sZCBvbnRvIHRoZSB0cmVlIGV2ZW4gaWYgdGhlIHRyZWUgaXMgZGV0YWNoZWQgYW5kIHNob3VsZCBiZVxuICAgIC8vIGZyZWVkLlxuICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IGQ7XG4gICAgcmV0dXJuIGZyYWdtZW50O1xuICB9XG5cbiAgX3VwZGF0ZSh2YWx1ZXM6IEFycmF5PHVua25vd24+KSB7XG4gICAgbGV0IGkgPSAwO1xuICAgIGZvciAoY29uc3QgcGFydCBvZiB0aGlzLl8kcGFydHMpIHtcbiAgICAgIGlmIChwYXJ0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZGVidWdMb2dFdmVudD8uKHtcbiAgICAgICAgICBraW5kOiAnc2V0IHBhcnQnLFxuICAgICAgICAgIHBhcnQsXG4gICAgICAgICAgdmFsdWU6IHZhbHVlc1tpXSxcbiAgICAgICAgICB2YWx1ZUluZGV4OiBpLFxuICAgICAgICAgIHZhbHVlcyxcbiAgICAgICAgICB0ZW1wbGF0ZUluc3RhbmNlOiB0aGlzLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKChwYXJ0IGFzIEF0dHJpYnV0ZVBhcnQpLnN0cmluZ3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIChwYXJ0IGFzIEF0dHJpYnV0ZVBhcnQpLl8kc2V0VmFsdWUodmFsdWVzLCBwYXJ0IGFzIEF0dHJpYnV0ZVBhcnQsIGkpO1xuICAgICAgICAgIC8vIFRoZSBudW1iZXIgb2YgdmFsdWVzIHRoZSBwYXJ0IGNvbnN1bWVzIGlzIHBhcnQuc3RyaW5ncy5sZW5ndGggLSAxXG4gICAgICAgICAgLy8gc2luY2UgdmFsdWVzIGFyZSBpbiBiZXR3ZWVuIHRlbXBsYXRlIHNwYW5zLiBXZSBpbmNyZW1lbnQgaSBieSAxXG4gICAgICAgICAgLy8gbGF0ZXIgaW4gdGhlIGxvb3AsIHNvIGluY3JlbWVudCBpdCBieSBwYXJ0LnN0cmluZ3MubGVuZ3RoIC0gMiBoZXJlXG4gICAgICAgICAgaSArPSAocGFydCBhcyBBdHRyaWJ1dGVQYXJ0KS5zdHJpbmdzIS5sZW5ndGggLSAyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhcnQuXyRzZXRWYWx1ZSh2YWx1ZXNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpKys7XG4gICAgfVxuICB9XG59XG5cbi8qXG4gKiBQYXJ0c1xuICovXG50eXBlIEF0dHJpYnV0ZVRlbXBsYXRlUGFydCA9IHtcbiAgcmVhZG9ubHkgdHlwZTogdHlwZW9mIEFUVFJJQlVURV9QQVJUO1xuICByZWFkb25seSBpbmRleDogbnVtYmVyO1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGN0b3I6IHR5cGVvZiBBdHRyaWJ1dGVQYXJ0O1xuICByZWFkb25seSBzdHJpbmdzOiBSZWFkb25seUFycmF5PHN0cmluZz47XG59O1xudHlwZSBOb2RlVGVtcGxhdGVQYXJ0ID0ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgQ0hJTERfUEFSVDtcbiAgcmVhZG9ubHkgaW5kZXg6IG51bWJlcjtcbn07XG50eXBlIEVsZW1lbnRUZW1wbGF0ZVBhcnQgPSB7XG4gIHJlYWRvbmx5IHR5cGU6IHR5cGVvZiBFTEVNRU5UX1BBUlQ7XG4gIHJlYWRvbmx5IGluZGV4OiBudW1iZXI7XG59O1xudHlwZSBDb21tZW50VGVtcGxhdGVQYXJ0ID0ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgQ09NTUVOVF9QQVJUO1xuICByZWFkb25seSBpbmRleDogbnVtYmVyO1xufTtcblxuLyoqXG4gKiBBIFRlbXBsYXRlUGFydCByZXByZXNlbnRzIGEgZHluYW1pYyBwYXJ0IGluIGEgdGVtcGxhdGUsIGJlZm9yZSB0aGUgdGVtcGxhdGVcbiAqIGlzIGluc3RhbnRpYXRlZC4gV2hlbiBhIHRlbXBsYXRlIGlzIGluc3RhbnRpYXRlZCBQYXJ0cyBhcmUgY3JlYXRlZCBmcm9tXG4gKiBUZW1wbGF0ZVBhcnRzLlxuICovXG50eXBlIFRlbXBsYXRlUGFydCA9XG4gIHwgTm9kZVRlbXBsYXRlUGFydFxuICB8IEF0dHJpYnV0ZVRlbXBsYXRlUGFydFxuICB8IEVsZW1lbnRUZW1wbGF0ZVBhcnRcbiAgfCBDb21tZW50VGVtcGxhdGVQYXJ0O1xuXG5leHBvcnQgdHlwZSBQYXJ0ID1cbiAgfCBDaGlsZFBhcnRcbiAgfCBBdHRyaWJ1dGVQYXJ0XG4gIHwgUHJvcGVydHlQYXJ0XG4gIHwgQm9vbGVhbkF0dHJpYnV0ZVBhcnRcbiAgfCBFbGVtZW50UGFydFxuICB8IEV2ZW50UGFydDtcblxuZXhwb3J0IHR5cGUge0NoaWxkUGFydH07XG5jbGFzcyBDaGlsZFBhcnQgaW1wbGVtZW50cyBEaXNjb25uZWN0YWJsZSB7XG4gIHJlYWRvbmx5IHR5cGUgPSBDSElMRF9QQVJUO1xuICByZWFkb25seSBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICBfJGNvbW1pdHRlZFZhbHVlOiB1bmtub3duID0gbm90aGluZztcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfX2RpcmVjdGl2ZT86IERpcmVjdGl2ZTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHN0YXJ0Tm9kZTogQ2hpbGROb2RlO1xuICAvKiogQGludGVybmFsICovXG4gIF8kZW5kTm9kZTogQ2hpbGROb2RlIHwgbnVsbDtcbiAgcHJpdmF0ZSBfdGV4dFNhbml0aXplcjogVmFsdWVTYW5pdGl6ZXIgfCB1bmRlZmluZWQ7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlIHwgdW5kZWZpbmVkO1xuICAvKipcbiAgICogQ29ubmVjdGlvbiBzdGF0ZSBmb3IgUm9vdFBhcnRzIG9ubHkgKGkuZS4gQ2hpbGRQYXJ0IHdpdGhvdXQgXyRwYXJlbnRcbiAgICogcmV0dXJuZWQgZnJvbSB0b3AtbGV2ZWwgYHJlbmRlcmApLiBUaGlzIGZpZWxkIGlzIHVuc2VkIG90aGVyd2lzZS4gVGhlXG4gICAqIGludGVudGlvbiB3b3VsZCBjbGVhcmVyIGlmIHdlIG1hZGUgYFJvb3RQYXJ0YCBhIHN1YmNsYXNzIG9mIGBDaGlsZFBhcnRgXG4gICAqIHdpdGggdGhpcyBmaWVsZCAoYW5kIGEgZGlmZmVyZW50IF8kaXNDb25uZWN0ZWQgZ2V0dGVyKSwgYnV0IHRoZSBzdWJjbGFzc1xuICAgKiBjYXVzZWQgYSBwZXJmIHJlZ3Jlc3Npb24sIHBvc3NpYmx5IGR1ZSB0byBtYWtpbmcgY2FsbCBzaXRlcyBwb2x5bW9ycGhpYy5cbiAgICogQGludGVybmFsXG4gICAqL1xuICBfX2lzQ29ubmVjdGVkOiBib29sZWFuO1xuXG4gIC8vIFNlZSBjb21tZW50IGluIERpc2Nvbm5lY3RhYmxlIGludGVyZmFjZSBmb3Igd2h5IHRoaXMgaXMgYSBnZXR0ZXJcbiAgZ2V0IF8kaXNDb25uZWN0ZWQoKSB7XG4gICAgLy8gQ2hpbGRQYXJ0cyB0aGF0IGFyZSBub3QgYXQgdGhlIHJvb3Qgc2hvdWxkIGFsd2F5cyBiZSBjcmVhdGVkIHdpdGggYVxuICAgIC8vIHBhcmVudDsgb25seSBSb290Q2hpbGROb2RlJ3Mgd29uJ3QsIHNvIHRoZXkgcmV0dXJuIHRoZSBsb2NhbCBpc0Nvbm5lY3RlZFxuICAgIC8vIHN0YXRlXG4gICAgcmV0dXJuIHRoaXMuXyRwYXJlbnQ/Ll8kaXNDb25uZWN0ZWQgPz8gdGhpcy5fX2lzQ29ubmVjdGVkO1xuICB9XG5cbiAgLy8gVGhlIGZvbGxvd2luZyBmaWVsZHMgd2lsbCBiZSBwYXRjaGVkIG9udG8gQ2hpbGRQYXJ0cyB3aGVuIHJlcXVpcmVkIGJ5XG4gIC8vIEFzeW5jRGlyZWN0aXZlXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuPzogU2V0PERpc2Nvbm5lY3RhYmxlPiA9IHVuZGVmaW5lZDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkPyhcbiAgICBpc0Nvbm5lY3RlZDogYm9vbGVhbixcbiAgICByZW1vdmVGcm9tUGFyZW50PzogYm9vbGVhbixcbiAgICBmcm9tPzogbnVtYmVyXG4gICk6IHZvaWQ7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRyZXBhcmVudERpc2Nvbm5lY3RhYmxlcz8ocGFyZW50OiBEaXNjb25uZWN0YWJsZSk6IHZvaWQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgc3RhcnROb2RlOiBDaGlsZE5vZGUsXG4gICAgZW5kTm9kZTogQ2hpbGROb2RlIHwgbnVsbCxcbiAgICBwYXJlbnQ6IFRlbXBsYXRlSW5zdGFuY2UgfCBDaGlsZFBhcnQgfCB1bmRlZmluZWQsXG4gICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZFxuICApIHtcbiAgICB0aGlzLl8kc3RhcnROb2RlID0gc3RhcnROb2RlO1xuICAgIHRoaXMuXyRlbmROb2RlID0gZW5kTm9kZTtcbiAgICB0aGlzLl8kcGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgLy8gTm90ZSBfX2lzQ29ubmVjdGVkIGlzIG9ubHkgZXZlciBhY2Nlc3NlZCBvbiBSb290UGFydHMgKGkuZS4gd2hlbiB0aGVyZSBpc1xuICAgIC8vIG5vIF8kcGFyZW50KTsgdGhlIHZhbHVlIG9uIGEgbm9uLXJvb3QtcGFydCBpcyBcImRvbid0IGNhcmVcIiwgYnV0IGNoZWNraW5nXG4gICAgLy8gZm9yIHBhcmVudCB3b3VsZCBiZSBtb3JlIGNvZGVcbiAgICB0aGlzLl9faXNDb25uZWN0ZWQgPSBvcHRpb25zPy5pc0Nvbm5lY3RlZCA/PyB0cnVlO1xuICAgIGlmIChFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MpIHtcbiAgICAgIC8vIEV4cGxpY2l0bHkgaW5pdGlhbGl6ZSBmb3IgY29uc2lzdGVudCBjbGFzcyBzaGFwZS5cbiAgICAgIHRoaXMuX3RleHRTYW5pdGl6ZXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBwYXJlbnQgbm9kZSBpbnRvIHdoaWNoIHRoZSBwYXJ0IHJlbmRlcnMgaXRzIGNvbnRlbnQuXG4gICAqXG4gICAqIEEgQ2hpbGRQYXJ0J3MgY29udGVudCBjb25zaXN0cyBvZiBhIHJhbmdlIG9mIGFkamFjZW50IGNoaWxkIG5vZGVzIG9mXG4gICAqIGAucGFyZW50Tm9kZWAsIHBvc3NpYmx5IGJvcmRlcmVkIGJ5ICdtYXJrZXIgbm9kZXMnIChgLnN0YXJ0Tm9kZWAgYW5kXG4gICAqIGAuZW5kTm9kZWApLlxuICAgKlxuICAgKiAtIElmIGJvdGggYC5zdGFydE5vZGVgIGFuZCBgLmVuZE5vZGVgIGFyZSBub24tbnVsbCwgdGhlbiB0aGUgcGFydCdzIGNvbnRlbnRcbiAgICogY29uc2lzdHMgb2YgYWxsIHNpYmxpbmdzIGJldHdlZW4gYC5zdGFydE5vZGVgIGFuZCBgLmVuZE5vZGVgLCBleGNsdXNpdmVseS5cbiAgICpcbiAgICogLSBJZiBgLnN0YXJ0Tm9kZWAgaXMgbm9uLW51bGwgYnV0IGAuZW5kTm9kZWAgaXMgbnVsbCwgdGhlbiB0aGUgcGFydCdzXG4gICAqIGNvbnRlbnQgY29uc2lzdHMgb2YgYWxsIHNpYmxpbmdzIGZvbGxvd2luZyBgLnN0YXJ0Tm9kZWAsIHVwIHRvIGFuZFxuICAgKiBpbmNsdWRpbmcgdGhlIGxhc3QgY2hpbGQgb2YgYC5wYXJlbnROb2RlYC4gSWYgYC5lbmROb2RlYCBpcyBub24tbnVsbCwgdGhlblxuICAgKiBgLnN0YXJ0Tm9kZWAgd2lsbCBhbHdheXMgYmUgbm9uLW51bGwuXG4gICAqXG4gICAqIC0gSWYgYm90aCBgLmVuZE5vZGVgIGFuZCBgLnN0YXJ0Tm9kZWAgYXJlIG51bGwsIHRoZW4gdGhlIHBhcnQncyBjb250ZW50XG4gICAqIGNvbnNpc3RzIG9mIGFsbCBjaGlsZCBub2RlcyBvZiBgLnBhcmVudE5vZGVgLlxuICAgKi9cbiAgZ2V0IHBhcmVudE5vZGUoKTogTm9kZSB7XG4gICAgbGV0IHBhcmVudE5vZGU6IE5vZGUgPSB3cmFwKHRoaXMuXyRzdGFydE5vZGUpLnBhcmVudE5vZGUhO1xuICAgIGNvbnN0IHBhcmVudCA9IHRoaXMuXyRwYXJlbnQ7XG4gICAgaWYgKFxuICAgICAgcGFyZW50ICE9PSB1bmRlZmluZWQgJiZcbiAgICAgIHBhcmVudE5vZGU/Lm5vZGVUeXBlID09PSAxMSAvKiBOb2RlLkRPQ1VNRU5UX0ZSQUdNRU5UICovXG4gICAgKSB7XG4gICAgICAvLyBJZiB0aGUgcGFyZW50Tm9kZSBpcyBhIERvY3VtZW50RnJhZ21lbnQsIGl0IG1heSBiZSBiZWNhdXNlIHRoZSBET00gaXNcbiAgICAgIC8vIHN0aWxsIGluIHRoZSBjbG9uZWQgZnJhZ21lbnQgZHVyaW5nIGluaXRpYWwgcmVuZGVyOyBpZiBzbywgZ2V0IHRoZSByZWFsXG4gICAgICAvLyBwYXJlbnROb2RlIHRoZSBwYXJ0IHdpbGwgYmUgY29tbWl0dGVkIGludG8gYnkgYXNraW5nIHRoZSBwYXJlbnQuXG4gICAgICBwYXJlbnROb2RlID0gKHBhcmVudCBhcyBDaGlsZFBhcnQgfCBUZW1wbGF0ZUluc3RhbmNlKS5wYXJlbnROb2RlO1xuICAgIH1cbiAgICByZXR1cm4gcGFyZW50Tm9kZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgcGFydCdzIGxlYWRpbmcgbWFya2VyIG5vZGUsIGlmIGFueS4gU2VlIGAucGFyZW50Tm9kZWAgZm9yIG1vcmVcbiAgICogaW5mb3JtYXRpb24uXG4gICAqL1xuICBnZXQgc3RhcnROb2RlKCk6IE5vZGUgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5fJHN0YXJ0Tm9kZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgcGFydCdzIHRyYWlsaW5nIG1hcmtlciBub2RlLCBpZiBhbnkuIFNlZSBgLnBhcmVudE5vZGVgIGZvciBtb3JlXG4gICAqIGluZm9ybWF0aW9uLlxuICAgKi9cbiAgZ2V0IGVuZE5vZGUoKTogTm9kZSB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLl8kZW5kTm9kZTtcbiAgfVxuXG4gIF8kc2V0VmFsdWUodmFsdWU6IHVua25vd24sIGRpcmVjdGl2ZVBhcmVudDogRGlyZWN0aXZlUGFyZW50ID0gdGhpcyk6IHZvaWQge1xuICAgIGlmIChERVZfTU9ERSAmJiB0aGlzLnBhcmVudE5vZGUgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFRoaXMgXFxgQ2hpbGRQYXJ0XFxgIGhhcyBubyBcXGBwYXJlbnROb2RlXFxgIGFuZCB0aGVyZWZvcmUgY2Fubm90IGFjY2VwdCBhIHZhbHVlLiBUaGlzIGxpa2VseSBtZWFucyB0aGUgZWxlbWVudCBjb250YWluaW5nIHRoZSBwYXJ0IHdhcyBtYW5pcHVsYXRlZCBpbiBhbiB1bnN1cHBvcnRlZCB3YXkgb3V0c2lkZSBvZiBMaXQncyBjb250cm9sIHN1Y2ggdGhhdCB0aGUgcGFydCdzIG1hcmtlciBub2RlcyB3ZXJlIGVqZWN0ZWQgZnJvbSBET00uIEZvciBleGFtcGxlLCBzZXR0aW5nIHRoZSBlbGVtZW50J3MgXFxgaW5uZXJIVE1MXFxgIG9yIFxcYHRleHRDb250ZW50XFxgIGNhbiBkbyB0aGlzLmBcbiAgICAgICk7XG4gICAgfVxuICAgIHZhbHVlID0gcmVzb2x2ZURpcmVjdGl2ZSh0aGlzLCB2YWx1ZSwgZGlyZWN0aXZlUGFyZW50KTtcbiAgICBpZiAoaXNQcmltaXRpdmUodmFsdWUpKSB7XG4gICAgICAvLyBOb24tcmVuZGVyaW5nIGNoaWxkIHZhbHVlcy4gSXQncyBpbXBvcnRhbnQgdGhhdCB0aGVzZSBkbyBub3QgcmVuZGVyXG4gICAgICAvLyBlbXB0eSB0ZXh0IG5vZGVzIHRvIGF2b2lkIGlzc3VlcyB3aXRoIHByZXZlbnRpbmcgZGVmYXVsdCA8c2xvdD5cbiAgICAgIC8vIGZhbGxiYWNrIGNvbnRlbnQuXG4gICAgICBpZiAodmFsdWUgPT09IG5vdGhpbmcgfHwgdmFsdWUgPT0gbnVsbCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICAgICAgaWYgKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSAhPT0gbm90aGluZykge1xuICAgICAgICAgIGRlYnVnTG9nRXZlbnQ/Lih7XG4gICAgICAgICAgICBraW5kOiAnY29tbWl0IG5vdGhpbmcgdG8gY2hpbGQnLFxuICAgICAgICAgICAgc3RhcnQ6IHRoaXMuXyRzdGFydE5vZGUsXG4gICAgICAgICAgICBlbmQ6IHRoaXMuXyRlbmROb2RlLFxuICAgICAgICAgICAgcGFyZW50OiB0aGlzLl8kcGFyZW50LFxuICAgICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHRoaXMuXyRjbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IG5vdGhpbmc7XG4gICAgICB9IGVsc2UgaWYgKHZhbHVlICE9PSB0aGlzLl8kY29tbWl0dGVkVmFsdWUgJiYgdmFsdWUgIT09IG5vQ2hhbmdlKSB7XG4gICAgICAgIHRoaXMuX2NvbW1pdFRleHQodmFsdWUpO1xuICAgICAgfVxuICAgICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICB9IGVsc2UgaWYgKCh2YWx1ZSBhcyBUZW1wbGF0ZVJlc3VsdClbJ18kbGl0VHlwZSQnXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9jb21taXRUZW1wbGF0ZVJlc3VsdCh2YWx1ZSBhcyBUZW1wbGF0ZVJlc3VsdCk7XG4gICAgfSBlbHNlIGlmICgodmFsdWUgYXMgTm9kZSkubm9kZVR5cGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKERFVl9NT0RFICYmIHRoaXMub3B0aW9ucz8uaG9zdCA9PT0gdmFsdWUpIHtcbiAgICAgICAgdGhpcy5fY29tbWl0VGV4dChcbiAgICAgICAgICBgW3Byb2JhYmxlIG1pc3Rha2U6IHJlbmRlcmVkIGEgdGVtcGxhdGUncyBob3N0IGluIGl0c2VsZiBgICtcbiAgICAgICAgICAgIGAoY29tbW9ubHkgY2F1c2VkIGJ5IHdyaXRpbmcgXFwke3RoaXN9IGluIGEgdGVtcGxhdGVdYFxuICAgICAgICApO1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgYEF0dGVtcHRlZCB0byByZW5kZXIgdGhlIHRlbXBsYXRlIGhvc3RgLFxuICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgIGBpbnNpZGUgaXRzZWxmLiBUaGlzIGlzIGFsbW9zdCBhbHdheXMgYSBtaXN0YWtlLCBhbmQgaW4gZGV2IG1vZGUgYCxcbiAgICAgICAgICBgd2UgcmVuZGVyIHNvbWUgd2FybmluZyB0ZXh0LiBJbiBwcm9kdWN0aW9uIGhvd2V2ZXIsIHdlJ2xsIGAsXG4gICAgICAgICAgYHJlbmRlciBpdCwgd2hpY2ggd2lsbCB1c3VhbGx5IHJlc3VsdCBpbiBhbiBlcnJvciwgYW5kIHNvbWV0aW1lcyBgLFxuICAgICAgICAgIGBpbiB0aGUgZWxlbWVudCBkaXNhcHBlYXJpbmcgZnJvbSB0aGUgRE9NLmBcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5fY29tbWl0Tm9kZSh2YWx1ZSBhcyBOb2RlKTtcbiAgICB9IGVsc2UgaWYgKGlzSXRlcmFibGUodmFsdWUpKSB7XG4gICAgICB0aGlzLl9jb21taXRJdGVyYWJsZSh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEZhbGxiYWNrLCB3aWxsIHJlbmRlciB0aGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAgICB0aGlzLl9jb21taXRUZXh0KHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9pbnNlcnQ8VCBleHRlbmRzIE5vZGU+KG5vZGU6IFQpIHtcbiAgICByZXR1cm4gd3JhcCh3cmFwKHRoaXMuXyRzdGFydE5vZGUpLnBhcmVudE5vZGUhKS5pbnNlcnRCZWZvcmUoXG4gICAgICBub2RlLFxuICAgICAgdGhpcy5fJGVuZE5vZGVcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBfY29tbWl0Tm9kZSh2YWx1ZTogTm9kZSk6IHZvaWQge1xuICAgIGlmICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICB0aGlzLl8kY2xlYXIoKTtcbiAgICAgIGlmIChcbiAgICAgICAgRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTICYmXG4gICAgICAgIHNhbml0aXplckZhY3RvcnlJbnRlcm5hbCAhPT0gbm9vcFNhbml0aXplclxuICAgICAgKSB7XG4gICAgICAgIGNvbnN0IHBhcmVudE5vZGVOYW1lID0gdGhpcy5fJHN0YXJ0Tm9kZS5wYXJlbnROb2RlPy5ub2RlTmFtZTtcbiAgICAgICAgaWYgKHBhcmVudE5vZGVOYW1lID09PSAnU1RZTEUnIHx8IHBhcmVudE5vZGVOYW1lID09PSAnU0NSSVBUJykge1xuICAgICAgICAgIGxldCBtZXNzYWdlID0gJ0ZvcmJpZGRlbic7XG4gICAgICAgICAgaWYgKERFVl9NT0RFKSB7XG4gICAgICAgICAgICBpZiAocGFyZW50Tm9kZU5hbWUgPT09ICdTVFlMRScpIHtcbiAgICAgICAgICAgICAgbWVzc2FnZSA9XG4gICAgICAgICAgICAgICAgYExpdCBkb2VzIG5vdCBzdXBwb3J0IGJpbmRpbmcgaW5zaWRlIHN0eWxlIG5vZGVzLiBgICtcbiAgICAgICAgICAgICAgICBgVGhpcyBpcyBhIHNlY3VyaXR5IHJpc2ssIGFzIHN0eWxlIGluamVjdGlvbiBhdHRhY2tzIGNhbiBgICtcbiAgICAgICAgICAgICAgICBgZXhmaWx0cmF0ZSBkYXRhIGFuZCBzcG9vZiBVSXMuIGAgK1xuICAgICAgICAgICAgICAgIGBDb25zaWRlciBpbnN0ZWFkIHVzaW5nIGNzc1xcYC4uLlxcYCBsaXRlcmFscyBgICtcbiAgICAgICAgICAgICAgICBgdG8gY29tcG9zZSBzdHlsZXMsIGFuZCBtYWtlIGRvIGR5bmFtaWMgc3R5bGluZyB3aXRoIGAgK1xuICAgICAgICAgICAgICAgIGBjc3MgY3VzdG9tIHByb3BlcnRpZXMsIDo6cGFydHMsIDxzbG90PnMsIGAgK1xuICAgICAgICAgICAgICAgIGBhbmQgYnkgbXV0YXRpbmcgdGhlIERPTSByYXRoZXIgdGhhbiBzdHlsZXNoZWV0cy5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbWVzc2FnZSA9XG4gICAgICAgICAgICAgICAgYExpdCBkb2VzIG5vdCBzdXBwb3J0IGJpbmRpbmcgaW5zaWRlIHNjcmlwdCBub2Rlcy4gYCArXG4gICAgICAgICAgICAgICAgYFRoaXMgaXMgYSBzZWN1cml0eSByaXNrLCBhcyBpdCBjb3VsZCBhbGxvdyBhcmJpdHJhcnkgYCArXG4gICAgICAgICAgICAgICAgYGNvZGUgZXhlY3V0aW9uLmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZGVidWdMb2dFdmVudD8uKHtcbiAgICAgICAga2luZDogJ2NvbW1pdCBub2RlJyxcbiAgICAgICAgc3RhcnQ6IHRoaXMuXyRzdGFydE5vZGUsXG4gICAgICAgIHBhcmVudDogdGhpcy5fJHBhcmVudCxcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICB9KTtcbiAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IHRoaXMuX2luc2VydCh2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfY29tbWl0VGV4dCh2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIC8vIElmIHRoZSBjb21taXR0ZWQgdmFsdWUgaXMgYSBwcmltaXRpdmUgaXQgbWVhbnMgd2UgY2FsbGVkIF9jb21taXRUZXh0IG9uXG4gICAgLy8gdGhlIHByZXZpb3VzIHJlbmRlciwgYW5kIHdlIGtub3cgdGhhdCB0aGlzLl8kc3RhcnROb2RlLm5leHRTaWJsaW5nIGlzIGFcbiAgICAvLyBUZXh0IG5vZGUuIFdlIGNhbiBub3cganVzdCByZXBsYWNlIHRoZSB0ZXh0IGNvbnRlbnQgKC5kYXRhKSBvZiB0aGUgbm9kZS5cbiAgICBpZiAoXG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgIT09IG5vdGhpbmcgJiZcbiAgICAgIGlzUHJpbWl0aXZlKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSlcbiAgICApIHtcbiAgICAgIGNvbnN0IG5vZGUgPSB3cmFwKHRoaXMuXyRzdGFydE5vZGUpLm5leHRTaWJsaW5nIGFzIFRleHQ7XG4gICAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICAgIGlmICh0aGlzLl90ZXh0U2FuaXRpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aGlzLl90ZXh0U2FuaXRpemVyID0gY3JlYXRlU2FuaXRpemVyKG5vZGUsICdkYXRhJywgJ3Byb3BlcnR5Jyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWUgPSB0aGlzLl90ZXh0U2FuaXRpemVyKHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIGRlYnVnTG9nRXZlbnQ/Lih7XG4gICAgICAgIGtpbmQ6ICdjb21taXQgdGV4dCcsXG4gICAgICAgIG5vZGUsXG4gICAgICAgIHZhbHVlLFxuICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICB9KTtcbiAgICAgIChub2RlIGFzIFRleHQpLmRhdGEgPSB2YWx1ZSBhcyBzdHJpbmc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MpIHtcbiAgICAgICAgY29uc3QgdGV4dE5vZGUgPSBkLmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgICAgdGhpcy5fY29tbWl0Tm9kZSh0ZXh0Tm9kZSk7XG4gICAgICAgIC8vIFdoZW4gc2V0dGluZyB0ZXh0IGNvbnRlbnQsIGZvciBzZWN1cml0eSBwdXJwb3NlcyBpdCBtYXR0ZXJzIGEgbG90XG4gICAgICAgIC8vIHdoYXQgdGhlIHBhcmVudCBpcy4gRm9yIGV4YW1wbGUsIDxzdHlsZT4gYW5kIDxzY3JpcHQ+IG5lZWQgdG8gYmVcbiAgICAgICAgLy8gaGFuZGxlZCB3aXRoIGNhcmUsIHdoaWxlIDxzcGFuPiBkb2VzIG5vdC4gU28gZmlyc3Qgd2UgbmVlZCB0byBwdXQgYVxuICAgICAgICAvLyB0ZXh0IG5vZGUgaW50byB0aGUgZG9jdW1lbnQsIHRoZW4gd2UgY2FuIHNhbml0aXplIGl0cyBjb250ZW50LlxuICAgICAgICBpZiAodGhpcy5fdGV4dFNhbml0aXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhpcy5fdGV4dFNhbml0aXplciA9IGNyZWF0ZVNhbml0aXplcih0ZXh0Tm9kZSwgJ2RhdGEnLCAncHJvcGVydHknKTtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZSA9IHRoaXMuX3RleHRTYW5pdGl6ZXIodmFsdWUpO1xuICAgICAgICBkZWJ1Z0xvZ0V2ZW50Py4oe1xuICAgICAgICAgIGtpbmQ6ICdjb21taXQgdGV4dCcsXG4gICAgICAgICAgbm9kZTogdGV4dE5vZGUsXG4gICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICB9KTtcbiAgICAgICAgdGV4dE5vZGUuZGF0YSA9IHZhbHVlIGFzIHN0cmluZztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2NvbW1pdE5vZGUoZC5jcmVhdGVUZXh0Tm9kZSh2YWx1ZSBhcyBzdHJpbmcpKTtcbiAgICAgICAgZGVidWdMb2dFdmVudD8uKHtcbiAgICAgICAgICBraW5kOiAnY29tbWl0IHRleHQnLFxuICAgICAgICAgIG5vZGU6IHdyYXAodGhpcy5fJHN0YXJ0Tm9kZSkubmV4dFNpYmxpbmcgYXMgVGV4dCxcbiAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSB2YWx1ZTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbW1pdFRlbXBsYXRlUmVzdWx0KFxuICAgIHJlc3VsdDogVGVtcGxhdGVSZXN1bHQgfCBDb21waWxlZFRlbXBsYXRlUmVzdWx0XG4gICk6IHZvaWQge1xuICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgY29uc3Qge3ZhbHVlcywgWydfJGxpdFR5cGUkJ106IHR5cGV9ID0gcmVzdWx0O1xuICAgIC8vIElmICRsaXRUeXBlJCBpcyBhIG51bWJlciwgcmVzdWx0IGlzIGEgcGxhaW4gVGVtcGxhdGVSZXN1bHQgYW5kIHdlIGdldFxuICAgIC8vIHRoZSB0ZW1wbGF0ZSBmcm9tIHRoZSB0ZW1wbGF0ZSBjYWNoZS4gSWYgbm90LCByZXN1bHQgaXMgYVxuICAgIC8vIENvbXBpbGVkVGVtcGxhdGVSZXN1bHQgYW5kIF8kbGl0VHlwZSQgaXMgYSBDb21waWxlZFRlbXBsYXRlIGFuZCB3ZSBuZWVkXG4gICAgLy8gdG8gY3JlYXRlIHRoZSA8dGVtcGxhdGU+IGVsZW1lbnQgdGhlIGZpcnN0IHRpbWUgd2Ugc2VlIGl0LlxuICAgIGNvbnN0IHRlbXBsYXRlOiBUZW1wbGF0ZSB8IENvbXBpbGVkVGVtcGxhdGUgPVxuICAgICAgdHlwZW9mIHR5cGUgPT09ICdudW1iZXInXG4gICAgICAgID8gdGhpcy5fJGdldFRlbXBsYXRlKHJlc3VsdCBhcyBUZW1wbGF0ZVJlc3VsdClcbiAgICAgICAgOiAodHlwZS5lbCA9PT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAodHlwZS5lbCA9IFRlbXBsYXRlLmNyZWF0ZUVsZW1lbnQodHlwZS5oLCB0aGlzLm9wdGlvbnMpKSxcbiAgICAgICAgICB0eXBlKTtcblxuICAgIGlmICgodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIFRlbXBsYXRlSW5zdGFuY2UpPy5fJHRlbXBsYXRlID09PSB0ZW1wbGF0ZSkge1xuICAgICAgZGVidWdMb2dFdmVudD8uKHtcbiAgICAgICAga2luZDogJ3RlbXBsYXRlIHVwZGF0aW5nJyxcbiAgICAgICAgdGVtcGxhdGUsXG4gICAgICAgIGluc3RhbmNlOiB0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgVGVtcGxhdGVJbnN0YW5jZSxcbiAgICAgICAgcGFydHM6ICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgVGVtcGxhdGVJbnN0YW5jZSkuXyRwYXJ0cyxcbiAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICB2YWx1ZXMsXG4gICAgICB9KTtcbiAgICAgICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgVGVtcGxhdGVJbnN0YW5jZSkuX3VwZGF0ZSh2YWx1ZXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBpbnN0YW5jZSA9IG5ldyBUZW1wbGF0ZUluc3RhbmNlKHRlbXBsYXRlIGFzIFRlbXBsYXRlLCB0aGlzKTtcbiAgICAgIGNvbnN0IGZyYWdtZW50ID0gaW5zdGFuY2UuX2Nsb25lKHRoaXMub3B0aW9ucyk7XG4gICAgICBkZWJ1Z0xvZ0V2ZW50Py4oe1xuICAgICAgICBraW5kOiAndGVtcGxhdGUgaW5zdGFudGlhdGVkJyxcbiAgICAgICAgdGVtcGxhdGUsXG4gICAgICAgIGluc3RhbmNlLFxuICAgICAgICBwYXJ0czogaW5zdGFuY2UuXyRwYXJ0cyxcbiAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICBmcmFnbWVudCxcbiAgICAgICAgdmFsdWVzLFxuICAgICAgfSk7XG4gICAgICBpbnN0YW5jZS5fdXBkYXRlKHZhbHVlcyk7XG4gICAgICBkZWJ1Z0xvZ0V2ZW50Py4oe1xuICAgICAgICBraW5kOiAndGVtcGxhdGUgaW5zdGFudGlhdGVkIGFuZCB1cGRhdGVkJyxcbiAgICAgICAgdGVtcGxhdGUsXG4gICAgICAgIGluc3RhbmNlLFxuICAgICAgICBwYXJ0czogaW5zdGFuY2UuXyRwYXJ0cyxcbiAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICBmcmFnbWVudCxcbiAgICAgICAgdmFsdWVzLFxuICAgICAgfSk7XG4gICAgICB0aGlzLl9jb21taXROb2RlKGZyYWdtZW50KTtcbiAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IGluc3RhbmNlO1xuICAgIH1cbiAgfVxuXG4gIC8vIE92ZXJyaWRkZW4gdmlhIGBsaXRIdG1sUG9seWZpbGxTdXBwb3J0YCB0byBwcm92aWRlIHBsYXRmb3JtIHN1cHBvcnQuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRnZXRUZW1wbGF0ZShyZXN1bHQ6IFRlbXBsYXRlUmVzdWx0KSB7XG4gICAgbGV0IHRlbXBsYXRlID0gdGVtcGxhdGVDYWNoZS5nZXQocmVzdWx0LnN0cmluZ3MpO1xuICAgIGlmICh0ZW1wbGF0ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0ZW1wbGF0ZUNhY2hlLnNldChyZXN1bHQuc3RyaW5ncywgKHRlbXBsYXRlID0gbmV3IFRlbXBsYXRlKHJlc3VsdCkpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRlbXBsYXRlO1xuICB9XG5cbiAgcHJpdmF0ZSBfY29tbWl0SXRlcmFibGUodmFsdWU6IEl0ZXJhYmxlPHVua25vd24+KTogdm9pZCB7XG4gICAgLy8gRm9yIGFuIEl0ZXJhYmxlLCB3ZSBjcmVhdGUgYSBuZXcgSW5zdGFuY2VQYXJ0IHBlciBpdGVtLCB0aGVuIHNldCBpdHNcbiAgICAvLyB2YWx1ZSB0byB0aGUgaXRlbS4gVGhpcyBpcyBhIGxpdHRsZSBiaXQgb2Ygb3ZlcmhlYWQgZm9yIGV2ZXJ5IGl0ZW0gaW5cbiAgICAvLyBhbiBJdGVyYWJsZSwgYnV0IGl0IGxldHMgdXMgcmVjdXJzZSBlYXNpbHkgYW5kIGVmZmljaWVudGx5IHVwZGF0ZSBBcnJheXNcbiAgICAvLyBvZiBUZW1wbGF0ZVJlc3VsdHMgdGhhdCB3aWxsIGJlIGNvbW1vbmx5IHJldHVybmVkIGZyb20gZXhwcmVzc2lvbnMgbGlrZTpcbiAgICAvLyBhcnJheS5tYXAoKGkpID0+IGh0bWxgJHtpfWApLCBieSByZXVzaW5nIGV4aXN0aW5nIFRlbXBsYXRlSW5zdGFuY2VzLlxuXG4gICAgLy8gSWYgdmFsdWUgaXMgYW4gYXJyYXksIHRoZW4gdGhlIHByZXZpb3VzIHJlbmRlciB3YXMgb2YgYW5cbiAgICAvLyBpdGVyYWJsZSBhbmQgdmFsdWUgd2lsbCBjb250YWluIHRoZSBDaGlsZFBhcnRzIGZyb20gdGhlIHByZXZpb3VzXG4gICAgLy8gcmVuZGVyLiBJZiB2YWx1ZSBpcyBub3QgYW4gYXJyYXksIGNsZWFyIHRoaXMgcGFydCBhbmQgbWFrZSBhIG5ld1xuICAgIC8vIGFycmF5IGZvciBDaGlsZFBhcnRzLlxuICAgIGlmICghaXNBcnJheSh0aGlzLl8kY29tbWl0dGVkVmFsdWUpKSB7XG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSBbXTtcbiAgICAgIHRoaXMuXyRjbGVhcigpO1xuICAgIH1cblxuICAgIC8vIExldHMgdXMga2VlcCB0cmFjayBvZiBob3cgbWFueSBpdGVtcyB3ZSBzdGFtcGVkIHNvIHdlIGNhbiBjbGVhciBsZWZ0b3ZlclxuICAgIC8vIGl0ZW1zIGZyb20gYSBwcmV2aW91cyByZW5kZXJcbiAgICBjb25zdCBpdGVtUGFydHMgPSB0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgQ2hpbGRQYXJ0W107XG4gICAgbGV0IHBhcnRJbmRleCA9IDA7XG4gICAgbGV0IGl0ZW1QYXJ0OiBDaGlsZFBhcnQgfCB1bmRlZmluZWQ7XG5cbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdmFsdWUpIHtcbiAgICAgIGlmIChwYXJ0SW5kZXggPT09IGl0ZW1QYXJ0cy5sZW5ndGgpIHtcbiAgICAgICAgLy8gSWYgbm8gZXhpc3RpbmcgcGFydCwgY3JlYXRlIGEgbmV3IG9uZVxuICAgICAgICAvLyBUT0RPIChqdXN0aW5mYWduYW5pKTogdGVzdCBwZXJmIGltcGFjdCBvZiBhbHdheXMgY3JlYXRpbmcgdHdvIHBhcnRzXG4gICAgICAgIC8vIGluc3RlYWQgb2Ygc2hhcmluZyBwYXJ0cyBiZXR3ZWVuIG5vZGVzXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9saXQvbGl0L2lzc3Vlcy8xMjY2XG4gICAgICAgIGl0ZW1QYXJ0cy5wdXNoKFxuICAgICAgICAgIChpdGVtUGFydCA9IG5ldyBDaGlsZFBhcnQoXG4gICAgICAgICAgICB0aGlzLl9pbnNlcnQoY3JlYXRlTWFya2VyKCkpLFxuICAgICAgICAgICAgdGhpcy5faW5zZXJ0KGNyZWF0ZU1hcmtlcigpKSxcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICB0aGlzLm9wdGlvbnNcbiAgICAgICAgICApKVxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gUmV1c2UgYW4gZXhpc3RpbmcgcGFydFxuICAgICAgICBpdGVtUGFydCA9IGl0ZW1QYXJ0c1twYXJ0SW5kZXhdO1xuICAgICAgfVxuICAgICAgaXRlbVBhcnQuXyRzZXRWYWx1ZShpdGVtKTtcbiAgICAgIHBhcnRJbmRleCsrO1xuICAgIH1cblxuICAgIGlmIChwYXJ0SW5kZXggPCBpdGVtUGFydHMubGVuZ3RoKSB7XG4gICAgICAvLyBpdGVtUGFydHMgYWx3YXlzIGhhdmUgZW5kIG5vZGVzXG4gICAgICB0aGlzLl8kY2xlYXIoXG4gICAgICAgIGl0ZW1QYXJ0ICYmIHdyYXAoaXRlbVBhcnQuXyRlbmROb2RlISkubmV4dFNpYmxpbmcsXG4gICAgICAgIHBhcnRJbmRleFxuICAgICAgKTtcbiAgICAgIC8vIFRydW5jYXRlIHRoZSBwYXJ0cyBhcnJheSBzbyBfdmFsdWUgcmVmbGVjdHMgdGhlIGN1cnJlbnQgc3RhdGVcbiAgICAgIGl0ZW1QYXJ0cy5sZW5ndGggPSBwYXJ0SW5kZXg7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgdGhlIG5vZGVzIGNvbnRhaW5lZCB3aXRoaW4gdGhpcyBQYXJ0IGZyb20gdGhlIERPTS5cbiAgICpcbiAgICogQHBhcmFtIHN0YXJ0IFN0YXJ0IG5vZGUgdG8gY2xlYXIgZnJvbSwgZm9yIGNsZWFyaW5nIGEgc3Vic2V0IG9mIHRoZSBwYXJ0J3NcbiAgICogICAgIERPTSAodXNlZCB3aGVuIHRydW5jYXRpbmcgaXRlcmFibGVzKVxuICAgKiBAcGFyYW0gZnJvbSAgV2hlbiBgc3RhcnRgIGlzIHNwZWNpZmllZCwgdGhlIGluZGV4IHdpdGhpbiB0aGUgaXRlcmFibGUgZnJvbVxuICAgKiAgICAgd2hpY2ggQ2hpbGRQYXJ0cyBhcmUgYmVpbmcgcmVtb3ZlZCwgdXNlZCBmb3IgZGlzY29ubmVjdGluZyBkaXJlY3RpdmVzIGluXG4gICAqICAgICB0aG9zZSBQYXJ0cy5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuICBfJGNsZWFyKFxuICAgIHN0YXJ0OiBDaGlsZE5vZGUgfCBudWxsID0gd3JhcCh0aGlzLl8kc3RhcnROb2RlKS5uZXh0U2libGluZyxcbiAgICBmcm9tPzogbnVtYmVyXG4gICkge1xuICAgIHRoaXMuXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZD8uKGZhbHNlLCB0cnVlLCBmcm9tKTtcbiAgICB3aGlsZSAoc3RhcnQgJiYgc3RhcnQgIT09IHRoaXMuXyRlbmROb2RlKSB7XG4gICAgICBjb25zdCBuID0gd3JhcChzdGFydCEpLm5leHRTaWJsaW5nO1xuICAgICAgKHdyYXAoc3RhcnQhKSBhcyBFbGVtZW50KS5yZW1vdmUoKTtcbiAgICAgIHN0YXJ0ID0gbjtcbiAgICB9XG4gIH1cbiAgLyoqXG4gICAqIEltcGxlbWVudGF0aW9uIG9mIFJvb3RQYXJ0J3MgYGlzQ29ubmVjdGVkYC4gTm90ZSB0aGF0IHRoaXMgbWV0b2RcbiAgICogc2hvdWxkIG9ubHkgYmUgY2FsbGVkIG9uIGBSb290UGFydGBzICh0aGUgYENoaWxkUGFydGAgcmV0dXJuZWQgZnJvbSBhXG4gICAqIHRvcC1sZXZlbCBgcmVuZGVyKClgIGNhbGwpLiBJdCBoYXMgbm8gZWZmZWN0IG9uIG5vbi1yb290IENoaWxkUGFydHMuXG4gICAqIEBwYXJhbSBpc0Nvbm5lY3RlZCBXaGV0aGVyIHRvIHNldFxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHNldENvbm5lY3RlZChpc0Nvbm5lY3RlZDogYm9vbGVhbikge1xuICAgIGlmICh0aGlzLl8kcGFyZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX19pc0Nvbm5lY3RlZCA9IGlzQ29ubmVjdGVkO1xuICAgICAgdGhpcy5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkPy4oaXNDb25uZWN0ZWQpO1xuICAgIH0gZWxzZSBpZiAoREVWX01PREUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ3BhcnQuc2V0Q29ubmVjdGVkKCkgbWF5IG9ubHkgYmUgY2FsbGVkIG9uIGEgJyArXG4gICAgICAgICAgJ1Jvb3RQYXJ0IHJldHVybmVkIGZyb20gcmVuZGVyKCkuJ1xuICAgICAgKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBIHRvcC1sZXZlbCBgQ2hpbGRQYXJ0YCByZXR1cm5lZCBmcm9tIGByZW5kZXJgIHRoYXQgbWFuYWdlcyB0aGUgY29ubmVjdGVkXG4gKiBzdGF0ZSBvZiBgQXN5bmNEaXJlY3RpdmVgcyBjcmVhdGVkIHRocm91Z2hvdXQgdGhlIHRyZWUgYmVsb3cgaXQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUm9vdFBhcnQgZXh0ZW5kcyBDaGlsZFBhcnQge1xuICAvKipcbiAgICogU2V0cyB0aGUgY29ubmVjdGlvbiBzdGF0ZSBmb3IgYEFzeW5jRGlyZWN0aXZlYHMgY29udGFpbmVkIHdpdGhpbiB0aGlzIHJvb3RcbiAgICogQ2hpbGRQYXJ0LlxuICAgKlxuICAgKiBsaXQtaHRtbCBkb2VzIG5vdCBhdXRvbWF0aWNhbGx5IG1vbml0b3IgdGhlIGNvbm5lY3RlZG5lc3Mgb2YgRE9NIHJlbmRlcmVkO1xuICAgKiBhcyBzdWNoLCBpdCBpcyB0aGUgcmVzcG9uc2liaWxpdHkgb2YgdGhlIGNhbGxlciB0byBgcmVuZGVyYCB0byBlbnN1cmUgdGhhdFxuICAgKiBgcGFydC5zZXRDb25uZWN0ZWQoZmFsc2UpYCBpcyBjYWxsZWQgYmVmb3JlIHRoZSBwYXJ0IG9iamVjdCBpcyBwb3RlbnRpYWxseVxuICAgKiBkaXNjYXJkZWQsIHRvIGVuc3VyZSB0aGF0IGBBc3luY0RpcmVjdGl2ZWBzIGhhdmUgYSBjaGFuY2UgdG8gZGlzcG9zZSBvZlxuICAgKiBhbnkgcmVzb3VyY2VzIGJlaW5nIGhlbGQuIElmIGEgYFJvb3RQYXJ0YCB0aGF0IHdhcyBwcmV2aW91c2x5XG4gICAqIGRpc2Nvbm5lY3RlZCBpcyBzdWJzZXF1ZW50bHkgcmUtY29ubmVjdGVkIChhbmQgaXRzIGBBc3luY0RpcmVjdGl2ZWBzIHNob3VsZFxuICAgKiByZS1jb25uZWN0KSwgYHNldENvbm5lY3RlZCh0cnVlKWAgc2hvdWxkIGJlIGNhbGxlZC5cbiAgICpcbiAgICogQHBhcmFtIGlzQ29ubmVjdGVkIFdoZXRoZXIgZGlyZWN0aXZlcyB3aXRoaW4gdGhpcyB0cmVlIHNob3VsZCBiZSBjb25uZWN0ZWRcbiAgICogb3Igbm90XG4gICAqL1xuICBzZXRDb25uZWN0ZWQoaXNDb25uZWN0ZWQ6IGJvb2xlYW4pOiB2b2lkO1xufVxuXG5leHBvcnQgdHlwZSB7QXR0cmlidXRlUGFydH07XG5jbGFzcyBBdHRyaWJ1dGVQYXJ0IGltcGxlbWVudHMgRGlzY29ubmVjdGFibGUge1xuICByZWFkb25seSB0eXBlID0gQVRUUklCVVRFX1BBUlQgYXNcbiAgICB8IHR5cGVvZiBBVFRSSUJVVEVfUEFSVFxuICAgIHwgdHlwZW9mIFBST1BFUlRZX1BBUlRcbiAgICB8IHR5cGVvZiBCT09MRUFOX0FUVFJJQlVURV9QQVJUXG4gICAgfCB0eXBlb2YgRVZFTlRfUEFSVDtcbiAgcmVhZG9ubHkgZWxlbWVudDogSFRNTEVsZW1lbnQ7XG4gIHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogSWYgdGhpcyBhdHRyaWJ1dGUgcGFydCByZXByZXNlbnRzIGFuIGludGVycG9sYXRpb24sIHRoaXMgY29udGFpbnMgdGhlXG4gICAqIHN0YXRpYyBzdHJpbmdzIG9mIHRoZSBpbnRlcnBvbGF0aW9uLiBGb3Igc2luZ2xlLXZhbHVlLCBjb21wbGV0ZSBiaW5kaW5ncyxcbiAgICogdGhpcyBpcyB1bmRlZmluZWQuXG4gICAqL1xuICByZWFkb25seSBzdHJpbmdzPzogUmVhZG9ubHlBcnJheTxzdHJpbmc+O1xuICAvKiogQGludGVybmFsICovXG4gIF8kY29tbWl0dGVkVmFsdWU6IHVua25vd24gfCBBcnJheTx1bmtub3duPiA9IG5vdGhpbmc7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX19kaXJlY3RpdmVzPzogQXJyYXk8RGlyZWN0aXZlIHwgdW5kZWZpbmVkPjtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHBhcmVudDogRGlzY29ubmVjdGFibGU7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuPzogU2V0PERpc2Nvbm5lY3RhYmxlPiA9IHVuZGVmaW5lZDtcblxuICBwcm90ZWN0ZWQgX3Nhbml0aXplcjogVmFsdWVTYW5pdGl6ZXIgfCB1bmRlZmluZWQ7XG5cbiAgZ2V0IHRhZ05hbWUoKSB7XG4gICAgcmV0dXJuIHRoaXMuZWxlbWVudC50YWdOYW1lO1xuICB9XG5cbiAgLy8gU2VlIGNvbW1lbnQgaW4gRGlzY29ubmVjdGFibGUgaW50ZXJmYWNlIGZvciB3aHkgdGhpcyBpcyBhIGdldHRlclxuICBnZXQgXyRpc0Nvbm5lY3RlZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fJHBhcmVudC5fJGlzQ29ubmVjdGVkO1xuICB9XG5cbiAgY29uc3RydWN0b3IoXG4gICAgZWxlbWVudDogSFRNTEVsZW1lbnQsXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIHN0cmluZ3M6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPixcbiAgICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgdGhpcy5lbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMuXyRwYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICBpZiAoc3RyaW5ncy5sZW5ndGggPiAyIHx8IHN0cmluZ3NbMF0gIT09ICcnIHx8IHN0cmluZ3NbMV0gIT09ICcnKSB7XG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSBuZXcgQXJyYXkoc3RyaW5ncy5sZW5ndGggLSAxKS5maWxsKG5ldyBTdHJpbmcoKSk7XG4gICAgICB0aGlzLnN0cmluZ3MgPSBzdHJpbmdzO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSBub3RoaW5nO1xuICAgIH1cbiAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICB0aGlzLl9zYW5pdGl6ZXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHZhbHVlIG9mIHRoaXMgcGFydCBieSByZXNvbHZpbmcgdGhlIHZhbHVlIGZyb20gcG9zc2libHkgbXVsdGlwbGVcbiAgICogdmFsdWVzIGFuZCBzdGF0aWMgc3RyaW5ncyBhbmQgY29tbWl0dGluZyBpdCB0byB0aGUgRE9NLlxuICAgKiBJZiB0aGlzIHBhcnQgaXMgc2luZ2xlLXZhbHVlZCwgYHRoaXMuX3N0cmluZ3NgIHdpbGwgYmUgdW5kZWZpbmVkLCBhbmQgdGhlXG4gICAqIG1ldGhvZCB3aWxsIGJlIGNhbGxlZCB3aXRoIGEgc2luZ2xlIHZhbHVlIGFyZ3VtZW50LiBJZiB0aGlzIHBhcnQgaXNcbiAgICogbXVsdGktdmFsdWUsIGB0aGlzLl9zdHJpbmdzYCB3aWxsIGJlIGRlZmluZWQsIGFuZCB0aGUgbWV0aG9kIGlzIGNhbGxlZFxuICAgKiB3aXRoIHRoZSB2YWx1ZSBhcnJheSBvZiB0aGUgcGFydCdzIG93bmluZyBUZW1wbGF0ZUluc3RhbmNlLCBhbmQgYW4gb2Zmc2V0XG4gICAqIGludG8gdGhlIHZhbHVlIGFycmF5IGZyb20gd2hpY2ggdGhlIHZhbHVlcyBzaG91bGQgYmUgcmVhZC5cbiAgICogVGhpcyBtZXRob2QgaXMgb3ZlcmxvYWRlZCB0aGlzIHdheSB0byBlbGltaW5hdGUgc2hvcnQtbGl2ZWQgYXJyYXkgc2xpY2VzXG4gICAqIG9mIHRoZSB0ZW1wbGF0ZSBpbnN0YW5jZSB2YWx1ZXMsIGFuZCBhbGxvdyBhIGZhc3QtcGF0aCBmb3Igc2luZ2xlLXZhbHVlZFxuICAgKiBwYXJ0cy5cbiAgICpcbiAgICogQHBhcmFtIHZhbHVlIFRoZSBwYXJ0IHZhbHVlLCBvciBhbiBhcnJheSBvZiB2YWx1ZXMgZm9yIG11bHRpLXZhbHVlZCBwYXJ0c1xuICAgKiBAcGFyYW0gdmFsdWVJbmRleCB0aGUgaW5kZXggdG8gc3RhcnQgcmVhZGluZyB2YWx1ZXMgZnJvbS4gYHVuZGVmaW5lZGAgZm9yXG4gICAqICAgc2luZ2xlLXZhbHVlZCBwYXJ0c1xuICAgKiBAcGFyYW0gbm9Db21taXQgY2F1c2VzIHRoZSBwYXJ0IHRvIG5vdCBjb21taXQgaXRzIHZhbHVlIHRvIHRoZSBET00uIFVzZWRcbiAgICogICBpbiBoeWRyYXRpb24gdG8gcHJpbWUgYXR0cmlidXRlIHBhcnRzIHdpdGggdGhlaXIgZmlyc3QtcmVuZGVyZWQgdmFsdWUsXG4gICAqICAgYnV0IG5vdCBzZXQgdGhlIGF0dHJpYnV0ZSwgYW5kIGluIFNTUiB0byBuby1vcCB0aGUgRE9NIG9wZXJhdGlvbiBhbmRcbiAgICogICBjYXB0dXJlIHRoZSB2YWx1ZSBmb3Igc2VyaWFsaXphdGlvbi5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuICBfJHNldFZhbHVlKFxuICAgIHZhbHVlOiB1bmtub3duIHwgQXJyYXk8dW5rbm93bj4sXG4gICAgZGlyZWN0aXZlUGFyZW50OiBEaXJlY3RpdmVQYXJlbnQgPSB0aGlzLFxuICAgIHZhbHVlSW5kZXg/OiBudW1iZXIsXG4gICAgbm9Db21taXQ/OiBib29sZWFuXG4gICkge1xuICAgIGNvbnN0IHN0cmluZ3MgPSB0aGlzLnN0cmluZ3M7XG5cbiAgICAvLyBXaGV0aGVyIGFueSBvZiB0aGUgdmFsdWVzIGhhcyBjaGFuZ2VkLCBmb3IgZGlydHktY2hlY2tpbmdcbiAgICBsZXQgY2hhbmdlID0gZmFsc2U7XG5cbiAgICBpZiAoc3RyaW5ncyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBTaW5nbGUtdmFsdWUgYmluZGluZyBjYXNlXG4gICAgICB2YWx1ZSA9IHJlc29sdmVEaXJlY3RpdmUodGhpcywgdmFsdWUsIGRpcmVjdGl2ZVBhcmVudCwgMCk7XG4gICAgICBjaGFuZ2UgPVxuICAgICAgICAhaXNQcmltaXRpdmUodmFsdWUpIHx8XG4gICAgICAgICh2YWx1ZSAhPT0gdGhpcy5fJGNvbW1pdHRlZFZhbHVlICYmIHZhbHVlICE9PSBub0NoYW5nZSk7XG4gICAgICBpZiAoY2hhbmdlKSB7XG4gICAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJbnRlcnBvbGF0aW9uIGNhc2VcbiAgICAgIGNvbnN0IHZhbHVlcyA9IHZhbHVlIGFzIEFycmF5PHVua25vd24+O1xuICAgICAgdmFsdWUgPSBzdHJpbmdzWzBdO1xuXG4gICAgICBsZXQgaSwgdjtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBzdHJpbmdzLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICB2ID0gcmVzb2x2ZURpcmVjdGl2ZSh0aGlzLCB2YWx1ZXNbdmFsdWVJbmRleCEgKyBpXSwgZGlyZWN0aXZlUGFyZW50LCBpKTtcblxuICAgICAgICBpZiAodiA9PT0gbm9DaGFuZ2UpIHtcbiAgICAgICAgICAvLyBJZiB0aGUgdXNlci1wcm92aWRlZCB2YWx1ZSBpcyBgbm9DaGFuZ2VgLCB1c2UgdGhlIHByZXZpb3VzIHZhbHVlXG4gICAgICAgICAgdiA9ICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgQXJyYXk8dW5rbm93bj4pW2ldO1xuICAgICAgICB9XG4gICAgICAgIGNoYW5nZSB8fD1cbiAgICAgICAgICAhaXNQcmltaXRpdmUodikgfHwgdiAhPT0gKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBBcnJheTx1bmtub3duPilbaV07XG4gICAgICAgIGlmICh2ID09PSBub3RoaW5nKSB7XG4gICAgICAgICAgdmFsdWUgPSBub3RoaW5nO1xuICAgICAgICB9IGVsc2UgaWYgKHZhbHVlICE9PSBub3RoaW5nKSB7XG4gICAgICAgICAgdmFsdWUgKz0gKHYgPz8gJycpICsgc3RyaW5nc1tpICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgLy8gV2UgYWx3YXlzIHJlY29yZCBlYWNoIHZhbHVlLCBldmVuIGlmIG9uZSBpcyBgbm90aGluZ2AsIGZvciBmdXR1cmVcbiAgICAgICAgLy8gY2hhbmdlIGRldGVjdGlvbi5cbiAgICAgICAgKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBBcnJheTx1bmtub3duPilbaV0gPSB2O1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoY2hhbmdlICYmICFub0NvbW1pdCkge1xuICAgICAgdGhpcy5fY29tbWl0VmFsdWUodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX2NvbW1pdFZhbHVlKHZhbHVlOiB1bmtub3duKSB7XG4gICAgaWYgKHZhbHVlID09PSBub3RoaW5nKSB7XG4gICAgICAod3JhcCh0aGlzLmVsZW1lbnQpIGFzIEVsZW1lbnQpLnJlbW92ZUF0dHJpYnV0ZSh0aGlzLm5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICAgIGlmICh0aGlzLl9zYW5pdGl6ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRoaXMuX3Nhbml0aXplciA9IHNhbml0aXplckZhY3RvcnlJbnRlcm5hbChcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudCxcbiAgICAgICAgICAgIHRoaXMubmFtZSxcbiAgICAgICAgICAgICdhdHRyaWJ1dGUnXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZSA9IHRoaXMuX3Nhbml0aXplcih2YWx1ZSA/PyAnJyk7XG4gICAgICB9XG4gICAgICBkZWJ1Z0xvZ0V2ZW50Py4oe1xuICAgICAgICBraW5kOiAnY29tbWl0IGF0dHJpYnV0ZScsXG4gICAgICAgIGVsZW1lbnQ6IHRoaXMuZWxlbWVudCxcbiAgICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgICB2YWx1ZSxcbiAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgfSk7XG4gICAgICAod3JhcCh0aGlzLmVsZW1lbnQpIGFzIEVsZW1lbnQpLnNldEF0dHJpYnV0ZShcbiAgICAgICAgdGhpcy5uYW1lLFxuICAgICAgICAodmFsdWUgPz8gJycpIGFzIHN0cmluZ1xuICAgICAgKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUge1Byb3BlcnR5UGFydH07XG5jbGFzcyBQcm9wZXJ0eVBhcnQgZXh0ZW5kcyBBdHRyaWJ1dGVQYXJ0IHtcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgdHlwZSA9IFBST1BFUlRZX1BBUlQ7XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBvdmVycmlkZSBfY29tbWl0VmFsdWUodmFsdWU6IHVua25vd24pIHtcbiAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICBpZiAodGhpcy5fc2FuaXRpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fc2FuaXRpemVyID0gc2FuaXRpemVyRmFjdG9yeUludGVybmFsKFxuICAgICAgICAgIHRoaXMuZWxlbWVudCxcbiAgICAgICAgICB0aGlzLm5hbWUsXG4gICAgICAgICAgJ3Byb3BlcnR5J1xuICAgICAgICApO1xuICAgICAgfVxuICAgICAgdmFsdWUgPSB0aGlzLl9zYW5pdGl6ZXIodmFsdWUpO1xuICAgIH1cbiAgICBkZWJ1Z0xvZ0V2ZW50Py4oe1xuICAgICAga2luZDogJ2NvbW1pdCBwcm9wZXJ0eScsXG4gICAgICBlbGVtZW50OiB0aGlzLmVsZW1lbnQsXG4gICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICB2YWx1ZSxcbiAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICB9KTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICh0aGlzLmVsZW1lbnQgYXMgYW55KVt0aGlzLm5hbWVdID0gdmFsdWUgPT09IG5vdGhpbmcgPyB1bmRlZmluZWQgOiB2YWx1ZTtcbiAgfVxufVxuXG4vLyBUZW1wb3Jhcnkgd29ya2Fyb3VuZCBmb3IgaHR0cHM6Ly9jcmJ1Zy5jb20vOTkzMjY4XG4vLyBDdXJyZW50bHksIGFueSBhdHRyaWJ1dGUgc3RhcnRpbmcgd2l0aCBcIm9uXCIgaXMgY29uc2lkZXJlZCB0byBiZSBhXG4vLyBUcnVzdGVkU2NyaXB0IHNvdXJjZS4gU3VjaCBib29sZWFuIGF0dHJpYnV0ZXMgbXVzdCBiZSBzZXQgdG8gdGhlIGVxdWl2YWxlbnRcbi8vIHRydXN0ZWQgZW1wdHlTY3JpcHQgdmFsdWUuXG5jb25zdCBlbXB0eVN0cmluZ0ZvckJvb2xlYW5BdHRyaWJ1dGUgPSB0cnVzdGVkVHlwZXNcbiAgPyAodHJ1c3RlZFR5cGVzLmVtcHR5U2NyaXB0IGFzIHVua25vd24gYXMgJycpXG4gIDogJyc7XG5cbmV4cG9ydCB0eXBlIHtCb29sZWFuQXR0cmlidXRlUGFydH07XG5jbGFzcyBCb29sZWFuQXR0cmlidXRlUGFydCBleHRlbmRzIEF0dHJpYnV0ZVBhcnQge1xuICBvdmVycmlkZSByZWFkb25seSB0eXBlID0gQk9PTEVBTl9BVFRSSUJVVEVfUEFSVDtcblxuICAvKiogQGludGVybmFsICovXG4gIG92ZXJyaWRlIF9jb21taXRWYWx1ZSh2YWx1ZTogdW5rbm93bikge1xuICAgIGRlYnVnTG9nRXZlbnQ/Lih7XG4gICAgICBraW5kOiAnY29tbWl0IGJvb2xlYW4gYXR0cmlidXRlJyxcbiAgICAgIGVsZW1lbnQ6IHRoaXMuZWxlbWVudCxcbiAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgIHZhbHVlOiAhISh2YWx1ZSAmJiB2YWx1ZSAhPT0gbm90aGluZyksXG4gICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgfSk7XG4gICAgaWYgKHZhbHVlICYmIHZhbHVlICE9PSBub3RoaW5nKSB7XG4gICAgICAod3JhcCh0aGlzLmVsZW1lbnQpIGFzIEVsZW1lbnQpLnNldEF0dHJpYnV0ZShcbiAgICAgICAgdGhpcy5uYW1lLFxuICAgICAgICBlbXB0eVN0cmluZ0ZvckJvb2xlYW5BdHRyaWJ1dGVcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgICh3cmFwKHRoaXMuZWxlbWVudCkgYXMgRWxlbWVudCkucmVtb3ZlQXR0cmlidXRlKHRoaXMubmFtZSk7XG4gICAgfVxuICB9XG59XG5cbnR5cGUgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zID0gRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCAmXG4gIFBhcnRpYWw8QWRkRXZlbnRMaXN0ZW5lck9wdGlvbnM+O1xuXG4vKipcbiAqIEFuIEF0dHJpYnV0ZVBhcnQgdGhhdCBtYW5hZ2VzIGFuIGV2ZW50IGxpc3RlbmVyIHZpYSBhZGQvcmVtb3ZlRXZlbnRMaXN0ZW5lci5cbiAqXG4gKiBUaGlzIHBhcnQgd29ya3MgYnkgYWRkaW5nIGl0c2VsZiBhcyB0aGUgZXZlbnQgbGlzdGVuZXIgb24gYW4gZWxlbWVudCwgdGhlblxuICogZGVsZWdhdGluZyB0byB0aGUgdmFsdWUgcGFzc2VkIHRvIGl0LiBUaGlzIHJlZHVjZXMgdGhlIG51bWJlciBvZiBjYWxscyB0b1xuICogYWRkL3JlbW92ZUV2ZW50TGlzdGVuZXIgaWYgdGhlIGxpc3RlbmVyIGNoYW5nZXMgZnJlcXVlbnRseSwgc3VjaCBhcyB3aGVuIGFuXG4gKiBpbmxpbmUgZnVuY3Rpb24gaXMgdXNlZCBhcyBhIGxpc3RlbmVyLlxuICpcbiAqIEJlY2F1c2UgZXZlbnQgb3B0aW9ucyBhcmUgcGFzc2VkIHdoZW4gYWRkaW5nIGxpc3RlbmVycywgd2UgbXVzdCB0YWtlIGNhc2VcbiAqIHRvIGFkZCBhbmQgcmVtb3ZlIHRoZSBwYXJ0IGFzIGEgbGlzdGVuZXIgd2hlbiB0aGUgZXZlbnQgb3B0aW9ucyBjaGFuZ2UuXG4gKi9cbmV4cG9ydCB0eXBlIHtFdmVudFBhcnR9O1xuY2xhc3MgRXZlbnRQYXJ0IGV4dGVuZHMgQXR0cmlidXRlUGFydCB7XG4gIG92ZXJyaWRlIHJlYWRvbmx5IHR5cGUgPSBFVkVOVF9QQVJUO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGVsZW1lbnQ6IEhUTUxFbGVtZW50LFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBzdHJpbmdzOiBSZWFkb25seUFycmF5PHN0cmluZz4sXG4gICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSxcbiAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkXG4gICkge1xuICAgIHN1cGVyKGVsZW1lbnQsIG5hbWUsIHN0cmluZ3MsIHBhcmVudCwgb3B0aW9ucyk7XG5cbiAgICBpZiAoREVWX01PREUgJiYgdGhpcy5zdHJpbmdzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEEgXFxgPCR7ZWxlbWVudC5sb2NhbE5hbWV9PlxcYCBoYXMgYSBcXGBAJHtuYW1lfT0uLi5cXGAgbGlzdGVuZXIgd2l0aCBgICtcbiAgICAgICAgICAnaW52YWxpZCBjb250ZW50LiBFdmVudCBsaXN0ZW5lcnMgaW4gdGVtcGxhdGVzIG11c3QgaGF2ZSBleGFjdGx5ICcgK1xuICAgICAgICAgICdvbmUgZXhwcmVzc2lvbiBhbmQgbm8gc3Vycm91bmRpbmcgdGV4dC4nXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8vIEV2ZW50UGFydCBkb2VzIG5vdCB1c2UgdGhlIGJhc2UgXyRzZXRWYWx1ZS9fcmVzb2x2ZVZhbHVlIGltcGxlbWVudGF0aW9uXG4gIC8vIHNpbmNlIHRoZSBkaXJ0eSBjaGVja2luZyBpcyBtb3JlIGNvbXBsZXhcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBvdmVycmlkZSBfJHNldFZhbHVlKFxuICAgIG5ld0xpc3RlbmVyOiB1bmtub3duLFxuICAgIGRpcmVjdGl2ZVBhcmVudDogRGlyZWN0aXZlUGFyZW50ID0gdGhpc1xuICApIHtcbiAgICBuZXdMaXN0ZW5lciA9XG4gICAgICByZXNvbHZlRGlyZWN0aXZlKHRoaXMsIG5ld0xpc3RlbmVyLCBkaXJlY3RpdmVQYXJlbnQsIDApID8/IG5vdGhpbmc7XG4gICAgaWYgKG5ld0xpc3RlbmVyID09PSBub0NoYW5nZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBvbGRMaXN0ZW5lciA9IHRoaXMuXyRjb21taXR0ZWRWYWx1ZTtcblxuICAgIC8vIElmIHRoZSBuZXcgdmFsdWUgaXMgbm90aGluZyBvciBhbnkgb3B0aW9ucyBjaGFuZ2Ugd2UgaGF2ZSB0byByZW1vdmUgdGhlXG4gICAgLy8gcGFydCBhcyBhIGxpc3RlbmVyLlxuICAgIGNvbnN0IHNob3VsZFJlbW92ZUxpc3RlbmVyID1cbiAgICAgIChuZXdMaXN0ZW5lciA9PT0gbm90aGluZyAmJiBvbGRMaXN0ZW5lciAhPT0gbm90aGluZykgfHxcbiAgICAgIChuZXdMaXN0ZW5lciBhcyBFdmVudExpc3RlbmVyV2l0aE9wdGlvbnMpLmNhcHR1cmUgIT09XG4gICAgICAgIChvbGRMaXN0ZW5lciBhcyBFdmVudExpc3RlbmVyV2l0aE9wdGlvbnMpLmNhcHR1cmUgfHxcbiAgICAgIChuZXdMaXN0ZW5lciBhcyBFdmVudExpc3RlbmVyV2l0aE9wdGlvbnMpLm9uY2UgIT09XG4gICAgICAgIChvbGRMaXN0ZW5lciBhcyBFdmVudExpc3RlbmVyV2l0aE9wdGlvbnMpLm9uY2UgfHxcbiAgICAgIChuZXdMaXN0ZW5lciBhcyBFdmVudExpc3RlbmVyV2l0aE9wdGlvbnMpLnBhc3NpdmUgIT09XG4gICAgICAgIChvbGRMaXN0ZW5lciBhcyBFdmVudExpc3RlbmVyV2l0aE9wdGlvbnMpLnBhc3NpdmU7XG5cbiAgICAvLyBJZiB0aGUgbmV3IHZhbHVlIGlzIG5vdCBub3RoaW5nIGFuZCB3ZSByZW1vdmVkIHRoZSBsaXN0ZW5lciwgd2UgaGF2ZVxuICAgIC8vIHRvIGFkZCB0aGUgcGFydCBhcyBhIGxpc3RlbmVyLlxuICAgIGNvbnN0IHNob3VsZEFkZExpc3RlbmVyID1cbiAgICAgIG5ld0xpc3RlbmVyICE9PSBub3RoaW5nICYmXG4gICAgICAob2xkTGlzdGVuZXIgPT09IG5vdGhpbmcgfHwgc2hvdWxkUmVtb3ZlTGlzdGVuZXIpO1xuXG4gICAgZGVidWdMb2dFdmVudD8uKHtcbiAgICAgIGtpbmQ6ICdjb21taXQgZXZlbnQgbGlzdGVuZXInLFxuICAgICAgZWxlbWVudDogdGhpcy5lbGVtZW50LFxuICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgdmFsdWU6IG5ld0xpc3RlbmVyLFxuICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgcmVtb3ZlTGlzdGVuZXI6IHNob3VsZFJlbW92ZUxpc3RlbmVyLFxuICAgICAgYWRkTGlzdGVuZXI6IHNob3VsZEFkZExpc3RlbmVyLFxuICAgICAgb2xkTGlzdGVuZXIsXG4gICAgfSk7XG4gICAgaWYgKHNob3VsZFJlbW92ZUxpc3RlbmVyKSB7XG4gICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcbiAgICAgICAgdGhpcy5uYW1lLFxuICAgICAgICB0aGlzLFxuICAgICAgICBvbGRMaXN0ZW5lciBhcyBFdmVudExpc3RlbmVyV2l0aE9wdGlvbnNcbiAgICAgICk7XG4gICAgfVxuICAgIGlmIChzaG91bGRBZGRMaXN0ZW5lcikge1xuICAgICAgLy8gQmV3YXJlOiBJRTExIGFuZCBDaHJvbWUgNDEgZG9uJ3QgbGlrZSB1c2luZyB0aGUgbGlzdGVuZXIgYXMgdGhlXG4gICAgICAvLyBvcHRpb25zIG9iamVjdC4gRmlndXJlIG91dCBob3cgdG8gZGVhbCB3LyB0aGlzIGluIElFMTEgLSBtYXliZVxuICAgICAgLy8gcGF0Y2ggYWRkRXZlbnRMaXN0ZW5lcj9cbiAgICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgICB0aGlzLm5hbWUsXG4gICAgICAgIHRoaXMsXG4gICAgICAgIG5ld0xpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9uc1xuICAgICAgKTtcbiAgICB9XG4gICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gbmV3TGlzdGVuZXI7XG4gIH1cblxuICBoYW5kbGVFdmVudChldmVudDogRXZlbnQpIHtcbiAgICBpZiAodHlwZW9mIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlLmNhbGwodGhpcy5vcHRpb25zPy5ob3N0ID8/IHRoaXMuZWxlbWVudCwgZXZlbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIEV2ZW50TGlzdGVuZXJPYmplY3QpLmhhbmRsZUV2ZW50KGV2ZW50KTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUge0VsZW1lbnRQYXJ0fTtcbmNsYXNzIEVsZW1lbnRQYXJ0IGltcGxlbWVudHMgRGlzY29ubmVjdGFibGUge1xuICByZWFkb25seSB0eXBlID0gRUxFTUVOVF9QQVJUO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX19kaXJlY3RpdmU/OiBEaXJlY3RpdmU7XG5cbiAgLy8gVGhpcyBpcyB0byBlbnN1cmUgdGhhdCBldmVyeSBQYXJ0IGhhcyBhIF8kY29tbWl0dGVkVmFsdWVcbiAgXyRjb21taXR0ZWRWYWx1ZTogdW5kZWZpbmVkO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRwYXJlbnQhOiBEaXNjb25uZWN0YWJsZTtcblxuICAvKiogQGludGVybmFsICovXG4gIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT4gPSB1bmRlZmluZWQ7XG5cbiAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgZWxlbWVudDogRWxlbWVudCxcbiAgICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgdGhpcy5fJHBhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICB9XG5cbiAgLy8gU2VlIGNvbW1lbnQgaW4gRGlzY29ubmVjdGFibGUgaW50ZXJmYWNlIGZvciB3aHkgdGhpcyBpcyBhIGdldHRlclxuICBnZXQgXyRpc0Nvbm5lY3RlZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fJHBhcmVudC5fJGlzQ29ubmVjdGVkO1xuICB9XG5cbiAgXyRzZXRWYWx1ZSh2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIGRlYnVnTG9nRXZlbnQ/Lih7XG4gICAgICBraW5kOiAnY29tbWl0IHRvIGVsZW1lbnQgYmluZGluZycsXG4gICAgICBlbGVtZW50OiB0aGlzLmVsZW1lbnQsXG4gICAgICB2YWx1ZSxcbiAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICB9KTtcbiAgICByZXNvbHZlRGlyZWN0aXZlKHRoaXMsIHZhbHVlKTtcbiAgfVxufVxuXG4vKipcbiAqIEVORCBVU0VSUyBTSE9VTEQgTk9UIFJFTFkgT04gVEhJUyBPQkpFQ1QuXG4gKlxuICogUHJpdmF0ZSBleHBvcnRzIGZvciB1c2UgYnkgb3RoZXIgTGl0IHBhY2thZ2VzLCBub3QgaW50ZW5kZWQgZm9yIHVzZSBieVxuICogZXh0ZXJuYWwgdXNlcnMuXG4gKlxuICogV2UgY3VycmVudGx5IGRvIG5vdCBtYWtlIGEgbWFuZ2xlZCByb2xsdXAgYnVpbGQgb2YgdGhlIGxpdC1zc3IgY29kZS4gSW4gb3JkZXJcbiAqIHRvIGtlZXAgYSBudW1iZXIgb2YgKG90aGVyd2lzZSBwcml2YXRlKSB0b3AtbGV2ZWwgZXhwb3J0cyAgbWFuZ2xlZCBpbiB0aGVcbiAqIGNsaWVudCBzaWRlIGNvZGUsIHdlIGV4cG9ydCBhIF8kTEggb2JqZWN0IGNvbnRhaW5pbmcgdGhvc2UgbWVtYmVycyAob3JcbiAqIGhlbHBlciBtZXRob2RzIGZvciBhY2Nlc3NpbmcgcHJpdmF0ZSBmaWVsZHMgb2YgdGhvc2UgbWVtYmVycyksIGFuZCB0aGVuXG4gKiByZS1leHBvcnQgdGhlbSBmb3IgdXNlIGluIGxpdC1zc3IuIFRoaXMga2VlcHMgbGl0LXNzciBhZ25vc3RpYyB0byB3aGV0aGVyIHRoZVxuICogY2xpZW50LXNpZGUgY29kZSBpcyBiZWluZyB1c2VkIGluIGBkZXZgIG1vZGUgb3IgYHByb2RgIG1vZGUuXG4gKlxuICogVGhpcyBoYXMgYSB1bmlxdWUgbmFtZSwgdG8gZGlzYW1iaWd1YXRlIGl0IGZyb20gcHJpdmF0ZSBleHBvcnRzIGluXG4gKiBsaXQtZWxlbWVudCwgd2hpY2ggcmUtZXhwb3J0cyBhbGwgb2YgbGl0LWh0bWwuXG4gKlxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IGNvbnN0IF8kTEggPSB7XG4gIC8vIFVzZWQgaW4gbGl0LXNzclxuICBfYm91bmRBdHRyaWJ1dGVTdWZmaXg6IGJvdW5kQXR0cmlidXRlU3VmZml4LFxuICBfbWFya2VyOiBtYXJrZXIsXG4gIF9tYXJrZXJNYXRjaDogbWFya2VyTWF0Y2gsXG4gIF9IVE1MX1JFU1VMVDogSFRNTF9SRVNVTFQsXG4gIF9nZXRUZW1wbGF0ZUh0bWw6IGdldFRlbXBsYXRlSHRtbCxcbiAgLy8gVXNlZCBpbiB0ZXN0cyBhbmQgcHJpdmF0ZS1zc3Itc3VwcG9ydFxuICBfVGVtcGxhdGVJbnN0YW5jZTogVGVtcGxhdGVJbnN0YW5jZSxcbiAgX2lzSXRlcmFibGU6IGlzSXRlcmFibGUsXG4gIF9yZXNvbHZlRGlyZWN0aXZlOiByZXNvbHZlRGlyZWN0aXZlLFxuICBfQ2hpbGRQYXJ0OiBDaGlsZFBhcnQsXG4gIF9BdHRyaWJ1dGVQYXJ0OiBBdHRyaWJ1dGVQYXJ0LFxuICBfQm9vbGVhbkF0dHJpYnV0ZVBhcnQ6IEJvb2xlYW5BdHRyaWJ1dGVQYXJ0LFxuICBfRXZlbnRQYXJ0OiBFdmVudFBhcnQsXG4gIF9Qcm9wZXJ0eVBhcnQ6IFByb3BlcnR5UGFydCxcbiAgX0VsZW1lbnRQYXJ0OiBFbGVtZW50UGFydCxcbn07XG5cbi8vIEFwcGx5IHBvbHlmaWxscyBpZiBhdmFpbGFibGVcbmNvbnN0IHBvbHlmaWxsU3VwcG9ydCA9IERFVl9NT0RFXG4gID8gZ2xvYmFsLmxpdEh0bWxQb2x5ZmlsbFN1cHBvcnREZXZNb2RlXG4gIDogZ2xvYmFsLmxpdEh0bWxQb2x5ZmlsbFN1cHBvcnQ7XG5wb2x5ZmlsbFN1cHBvcnQ/LihUZW1wbGF0ZSwgQ2hpbGRQYXJ0KTtcblxuLy8gSU1QT1JUQU5UOiBkbyBub3QgY2hhbmdlIHRoZSBwcm9wZXJ0eSBuYW1lIG9yIHRoZSBhc3NpZ25tZW50IGV4cHJlc3Npb24uXG4vLyBUaGlzIGxpbmUgd2lsbCBiZSB1c2VkIGluIHJlZ2V4ZXMgdG8gc2VhcmNoIGZvciBsaXQtaHRtbCB1c2FnZS5cbihnbG9iYWwubGl0SHRtbFZlcnNpb25zID8/PSBbXSkucHVzaCgnMi43LjQnKTtcbmlmIChERVZfTU9ERSAmJiBnbG9iYWwubGl0SHRtbFZlcnNpb25zLmxlbmd0aCA+IDEpIHtcbiAgaXNzdWVXYXJuaW5nIShcbiAgICAnbXVsdGlwbGUtdmVyc2lvbnMnLFxuICAgIGBNdWx0aXBsZSB2ZXJzaW9ucyBvZiBMaXQgbG9hZGVkLiBgICtcbiAgICAgIGBMb2FkaW5nIG11bHRpcGxlIHZlcnNpb25zIGlzIG5vdCByZWNvbW1lbmRlZC5gXG4gICk7XG59XG5cbi8qKlxuICogUmVuZGVycyBhIHZhbHVlLCB1c3VhbGx5IGEgbGl0LWh0bWwgVGVtcGxhdGVSZXN1bHQsIHRvIHRoZSBjb250YWluZXIuXG4gKlxuICogVGhpcyBleGFtcGxlIHJlbmRlcnMgdGhlIHRleHQgXCJIZWxsbywgWm9lIVwiIGluc2lkZSBhIHBhcmFncmFwaCB0YWcsIGFwcGVuZGluZ1xuICogaXQgdG8gdGhlIGNvbnRhaW5lciBgZG9jdW1lbnQuYm9keWAuXG4gKlxuICogYGBganNcbiAqIGltcG9ydCB7aHRtbCwgcmVuZGVyfSBmcm9tICdsaXQnO1xuICpcbiAqIGNvbnN0IG5hbWUgPSBcIlpvZVwiO1xuICogcmVuZGVyKGh0bWxgPHA+SGVsbG8sICR7bmFtZX0hPC9wPmAsIGRvY3VtZW50LmJvZHkpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHZhbHVlIEFueSBbcmVuZGVyYWJsZVxuICogICB2YWx1ZV0oaHR0cHM6Ly9saXQuZGV2L2RvY3MvdGVtcGxhdGVzL2V4cHJlc3Npb25zLyNjaGlsZC1leHByZXNzaW9ucyksXG4gKiAgIHR5cGljYWxseSBhIHtAbGlua2NvZGUgVGVtcGxhdGVSZXN1bHR9IGNyZWF0ZWQgYnkgZXZhbHVhdGluZyBhIHRlbXBsYXRlIHRhZ1xuICogICBsaWtlIHtAbGlua2NvZGUgaHRtbH0gb3Ige0BsaW5rY29kZSBzdmd9LlxuICogQHBhcmFtIGNvbnRhaW5lciBBIERPTSBjb250YWluZXIgdG8gcmVuZGVyIHRvLiBUaGUgZmlyc3QgcmVuZGVyIHdpbGwgYXBwZW5kXG4gKiAgIHRoZSByZW5kZXJlZCB2YWx1ZSB0byB0aGUgY29udGFpbmVyLCBhbmQgc3Vic2VxdWVudCByZW5kZXJzIHdpbGxcbiAqICAgZWZmaWNpZW50bHkgdXBkYXRlIHRoZSByZW5kZXJlZCB2YWx1ZSBpZiB0aGUgc2FtZSByZXN1bHQgdHlwZSB3YXNcbiAqICAgcHJldmlvdXNseSByZW5kZXJlZCB0aGVyZS5cbiAqIEBwYXJhbSBvcHRpb25zIFNlZSB7QGxpbmtjb2RlIFJlbmRlck9wdGlvbnN9IGZvciBvcHRpb25zIGRvY3VtZW50YXRpb24uXG4gKiBAc2VlXG4gKiB7QGxpbmsgaHR0cHM6Ly9saXQuZGV2L2RvY3MvbGlicmFyaWVzL3N0YW5kYWxvbmUtdGVtcGxhdGVzLyNyZW5kZXJpbmctbGl0LWh0bWwtdGVtcGxhdGVzfCBSZW5kZXJpbmcgTGl0IEhUTUwgVGVtcGxhdGVzfVxuICovXG5leHBvcnQgY29uc3QgcmVuZGVyID0gKFxuICB2YWx1ZTogdW5rbm93bixcbiAgY29udGFpbmVyOiBIVE1MRWxlbWVudCB8IERvY3VtZW50RnJhZ21lbnQsXG4gIG9wdGlvbnM/OiBSZW5kZXJPcHRpb25zXG4pOiBSb290UGFydCA9PiB7XG4gIGlmIChERVZfTU9ERSAmJiBjb250YWluZXIgPT0gbnVsbCkge1xuICAgIC8vIEdpdmUgYSBjbGVhcmVyIGVycm9yIG1lc3NhZ2UgdGhhblxuICAgIC8vICAgICBVbmNhdWdodCBUeXBlRXJyb3I6IENhbm5vdCByZWFkIHByb3BlcnRpZXMgb2YgbnVsbCAocmVhZGluZ1xuICAgIC8vICAgICAnXyRsaXRQYXJ0JCcpXG4gICAgLy8gd2hpY2ggcmVhZHMgbGlrZSBhbiBpbnRlcm5hbCBMaXQgZXJyb3IuXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVGhlIGNvbnRhaW5lciB0byByZW5kZXIgaW50byBtYXkgbm90IGJlICR7Y29udGFpbmVyfWApO1xuICB9XG4gIGNvbnN0IHJlbmRlcklkID0gREVWX01PREUgPyBkZWJ1Z0xvZ1JlbmRlcklkKysgOiAwO1xuICBjb25zdCBwYXJ0T3duZXJOb2RlID0gb3B0aW9ucz8ucmVuZGVyQmVmb3JlID8/IGNvbnRhaW5lcjtcbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgbGV0IHBhcnQ6IENoaWxkUGFydCA9IChwYXJ0T3duZXJOb2RlIGFzIGFueSlbJ18kbGl0UGFydCQnXTtcbiAgZGVidWdMb2dFdmVudD8uKHtcbiAgICBraW5kOiAnYmVnaW4gcmVuZGVyJyxcbiAgICBpZDogcmVuZGVySWQsXG4gICAgdmFsdWUsXG4gICAgY29udGFpbmVyLFxuICAgIG9wdGlvbnMsXG4gICAgcGFydCxcbiAgfSk7XG4gIGlmIChwYXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICBjb25zdCBlbmROb2RlID0gb3B0aW9ucz8ucmVuZGVyQmVmb3JlID8/IG51bGw7XG4gICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIChwYXJ0T3duZXJOb2RlIGFzIGFueSlbJ18kbGl0UGFydCQnXSA9IHBhcnQgPSBuZXcgQ2hpbGRQYXJ0KFxuICAgICAgY29udGFpbmVyLmluc2VydEJlZm9yZShjcmVhdGVNYXJrZXIoKSwgZW5kTm9kZSksXG4gICAgICBlbmROb2RlLFxuICAgICAgdW5kZWZpbmVkLFxuICAgICAgb3B0aW9ucyA/PyB7fVxuICAgICk7XG4gIH1cbiAgcGFydC5fJHNldFZhbHVlKHZhbHVlKTtcbiAgZGVidWdMb2dFdmVudD8uKHtcbiAgICBraW5kOiAnZW5kIHJlbmRlcicsXG4gICAgaWQ6IHJlbmRlcklkLFxuICAgIHZhbHVlLFxuICAgIGNvbnRhaW5lcixcbiAgICBvcHRpb25zLFxuICAgIHBhcnQsXG4gIH0pO1xuICByZXR1cm4gcGFydCBhcyBSb290UGFydDtcbn07XG5cbmlmIChFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MpIHtcbiAgcmVuZGVyLnNldFNhbml0aXplciA9IHNldFNhbml0aXplcjtcbiAgcmVuZGVyLmNyZWF0ZVNhbml0aXplciA9IGNyZWF0ZVNhbml0aXplcjtcbiAgaWYgKERFVl9NT0RFKSB7XG4gICAgcmVuZGVyLl90ZXN0T25seUNsZWFyU2FuaXRpemVyRmFjdG9yeURvTm90Q2FsbE9yRWxzZSA9XG4gICAgICBfdGVzdE9ubHlDbGVhclNhbml0aXplckZhY3RvcnlEb05vdENhbGxPckVsc2U7XG4gIH1cbn1cbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0Rpc2Nvbm5lY3RhYmxlLCBQYXJ0fSBmcm9tICcuL2xpdC1odG1sLmpzJztcblxuZXhwb3J0IHtcbiAgQXR0cmlidXRlUGFydCxcbiAgQm9vbGVhbkF0dHJpYnV0ZVBhcnQsXG4gIENoaWxkUGFydCxcbiAgRWxlbWVudFBhcnQsXG4gIEV2ZW50UGFydCxcbiAgUGFydCxcbiAgUHJvcGVydHlQYXJ0LFxufSBmcm9tICcuL2xpdC1odG1sLmpzJztcblxuZXhwb3J0IGludGVyZmFjZSBEaXJlY3RpdmVDbGFzcyB7XG4gIG5ldyAocGFydDogUGFydEluZm8pOiBEaXJlY3RpdmU7XG59XG5cbi8qKlxuICogVGhpcyB1dGlsaXR5IHR5cGUgZXh0cmFjdHMgdGhlIHNpZ25hdHVyZSBvZiBhIGRpcmVjdGl2ZSBjbGFzcydzIHJlbmRlcigpXG4gKiBtZXRob2Qgc28gd2UgY2FuIHVzZSBpdCBmb3IgdGhlIHR5cGUgb2YgdGhlIGdlbmVyYXRlZCBkaXJlY3RpdmUgZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCB0eXBlIERpcmVjdGl2ZVBhcmFtZXRlcnM8QyBleHRlbmRzIERpcmVjdGl2ZT4gPSBQYXJhbWV0ZXJzPENbJ3JlbmRlciddPjtcblxuLyoqXG4gKiBBIGdlbmVyYXRlZCBkaXJlY3RpdmUgZnVuY3Rpb24gZG9lc24ndCBldmFsdWF0ZSB0aGUgZGlyZWN0aXZlLCBidXQganVzdFxuICogcmV0dXJucyBhIERpcmVjdGl2ZVJlc3VsdCBvYmplY3QgdGhhdCBjYXB0dXJlcyB0aGUgYXJndW1lbnRzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIERpcmVjdGl2ZVJlc3VsdDxDIGV4dGVuZHMgRGlyZWN0aXZlQ2xhc3MgPSBEaXJlY3RpdmVDbGFzcz4ge1xuICAvKipcbiAgICogVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICogQGludGVybmFsICovXG4gIFsnXyRsaXREaXJlY3RpdmUkJ106IEM7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgdmFsdWVzOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPEluc3RhbmNlVHlwZTxDPj47XG59XG5cbmV4cG9ydCBjb25zdCBQYXJ0VHlwZSA9IHtcbiAgQVRUUklCVVRFOiAxLFxuICBDSElMRDogMixcbiAgUFJPUEVSVFk6IDMsXG4gIEJPT0xFQU5fQVRUUklCVVRFOiA0LFxuICBFVkVOVDogNSxcbiAgRUxFTUVOVDogNixcbn0gYXMgY29uc3Q7XG5cbmV4cG9ydCB0eXBlIFBhcnRUeXBlID0gKHR5cGVvZiBQYXJ0VHlwZSlba2V5b2YgdHlwZW9mIFBhcnRUeXBlXTtcblxuZXhwb3J0IGludGVyZmFjZSBDaGlsZFBhcnRJbmZvIHtcbiAgcmVhZG9ubHkgdHlwZTogdHlwZW9mIFBhcnRUeXBlLkNISUxEO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEF0dHJpYnV0ZVBhcnRJbmZvIHtcbiAgcmVhZG9ubHkgdHlwZTpcbiAgICB8IHR5cGVvZiBQYXJ0VHlwZS5BVFRSSUJVVEVcbiAgICB8IHR5cGVvZiBQYXJ0VHlwZS5QUk9QRVJUWVxuICAgIHwgdHlwZW9mIFBhcnRUeXBlLkJPT0xFQU5fQVRUUklCVVRFXG4gICAgfCB0eXBlb2YgUGFydFR5cGUuRVZFTlQ7XG4gIHJlYWRvbmx5IHN0cmluZ3M/OiBSZWFkb25seUFycmF5PHN0cmluZz47XG4gIHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgdGFnTmFtZTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEVsZW1lbnRQYXJ0SW5mbyB7XG4gIHJlYWRvbmx5IHR5cGU6IHR5cGVvZiBQYXJ0VHlwZS5FTEVNRU5UO1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IHRoZSBwYXJ0IGEgZGlyZWN0aXZlIGlzIGJvdW5kIHRvLlxuICpcbiAqIFRoaXMgaXMgdXNlZnVsIGZvciBjaGVja2luZyB0aGF0IGEgZGlyZWN0aXZlIGlzIGF0dGFjaGVkIHRvIGEgdmFsaWQgcGFydCxcbiAqIHN1Y2ggYXMgd2l0aCBkaXJlY3RpdmUgdGhhdCBjYW4gb25seSBiZSB1c2VkIG9uIGF0dHJpYnV0ZSBiaW5kaW5ncy5cbiAqL1xuZXhwb3J0IHR5cGUgUGFydEluZm8gPSBDaGlsZFBhcnRJbmZvIHwgQXR0cmlidXRlUGFydEluZm8gfCBFbGVtZW50UGFydEluZm87XG5cbi8qKlxuICogQ3JlYXRlcyBhIHVzZXItZmFjaW5nIGRpcmVjdGl2ZSBmdW5jdGlvbiBmcm9tIGEgRGlyZWN0aXZlIGNsYXNzLiBUaGlzXG4gKiBmdW5jdGlvbiBoYXMgdGhlIHNhbWUgcGFyYW1ldGVycyBhcyB0aGUgZGlyZWN0aXZlJ3MgcmVuZGVyKCkgbWV0aG9kLlxuICovXG5leHBvcnQgY29uc3QgZGlyZWN0aXZlID1cbiAgPEMgZXh0ZW5kcyBEaXJlY3RpdmVDbGFzcz4oYzogQykgPT5cbiAgKC4uLnZhbHVlczogRGlyZWN0aXZlUGFyYW1ldGVyczxJbnN0YW5jZVR5cGU8Qz4+KTogRGlyZWN0aXZlUmVzdWx0PEM+ID0+ICh7XG4gICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICBbJ18kbGl0RGlyZWN0aXZlJCddOiBjLFxuICAgIHZhbHVlcyxcbiAgfSk7XG5cbi8qKlxuICogQmFzZSBjbGFzcyBmb3IgY3JlYXRpbmcgY3VzdG9tIGRpcmVjdGl2ZXMuIFVzZXJzIHNob3VsZCBleHRlbmQgdGhpcyBjbGFzcyxcbiAqIGltcGxlbWVudCBgcmVuZGVyYCBhbmQvb3IgYHVwZGF0ZWAsIGFuZCB0aGVuIHBhc3MgdGhlaXIgc3ViY2xhc3MgdG9cbiAqIGBkaXJlY3RpdmVgLlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRGlyZWN0aXZlIGltcGxlbWVudHMgRGlzY29ubmVjdGFibGUge1xuICAvL0BpbnRlcm5hbFxuICBfX3BhcnQhOiBQYXJ0O1xuICAvL0BpbnRlcm5hbFxuICBfX2F0dHJpYnV0ZUluZGV4OiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gIC8vQGludGVybmFsXG4gIF9fZGlyZWN0aXZlPzogRGlyZWN0aXZlO1xuXG4gIC8vQGludGVybmFsXG4gIF8kcGFyZW50ITogRGlzY29ubmVjdGFibGU7XG5cbiAgLy8gVGhlc2Ugd2lsbCBvbmx5IGV4aXN0IG9uIHRoZSBBc3luY0RpcmVjdGl2ZSBzdWJjbGFzc1xuICAvL0BpbnRlcm5hbFxuICBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4/OiBTZXQ8RGlzY29ubmVjdGFibGU+O1xuICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAvL0BpbnRlcm5hbFxuICBbJ18kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWQnXT8oaXNDb25uZWN0ZWQ6IGJvb2xlYW4pOiB2b2lkO1xuXG4gIGNvbnN0cnVjdG9yKF9wYXJ0SW5mbzogUGFydEluZm8pIHt9XG5cbiAgLy8gU2VlIGNvbW1lbnQgaW4gRGlzY29ubmVjdGFibGUgaW50ZXJmYWNlIGZvciB3aHkgdGhpcyBpcyBhIGdldHRlclxuICBnZXQgXyRpc0Nvbm5lY3RlZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fJHBhcmVudC5fJGlzQ29ubmVjdGVkO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGluaXRpYWxpemUoXG4gICAgcGFydDogUGFydCxcbiAgICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICAgIGF0dHJpYnV0ZUluZGV4OiBudW1iZXIgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgdGhpcy5fX3BhcnQgPSBwYXJ0O1xuICAgIHRoaXMuXyRwYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5fX2F0dHJpYnV0ZUluZGV4ID0gYXR0cmlidXRlSW5kZXg7XG4gIH1cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHJlc29sdmUocGFydDogUGFydCwgcHJvcHM6IEFycmF5PHVua25vd24+KTogdW5rbm93biB7XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKHBhcnQsIHByb3BzKTtcbiAgfVxuXG4gIGFic3RyYWN0IHJlbmRlciguLi5wcm9wczogQXJyYXk8dW5rbm93bj4pOiB1bmtub3duO1xuXG4gIHVwZGF0ZShfcGFydDogUGFydCwgcHJvcHM6IEFycmF5PHVua25vd24+KTogdW5rbm93biB7XG4gICAgcmV0dXJuIHRoaXMucmVuZGVyKC4uLnByb3BzKTtcbiAgfVxufVxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjAgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7XyRMSCwgUGFydCwgRGlyZWN0aXZlUGFyZW50LCBUZW1wbGF0ZVJlc3VsdH0gZnJvbSAnLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBEaXJlY3RpdmVSZXN1bHQsXG4gIERpcmVjdGl2ZUNsYXNzLFxuICBQYXJ0SW5mbyxcbiAgQXR0cmlidXRlUGFydEluZm8sXG59IGZyb20gJy4vZGlyZWN0aXZlLmpzJztcbnR5cGUgUHJpbWl0aXZlID0gbnVsbCB8IHVuZGVmaW5lZCB8IGJvb2xlYW4gfCBudW1iZXIgfCBzdHJpbmcgfCBzeW1ib2wgfCBiaWdpbnQ7XG5cbmNvbnN0IHtfQ2hpbGRQYXJ0OiBDaGlsZFBhcnR9ID0gXyRMSDtcblxudHlwZSBDaGlsZFBhcnQgPSBJbnN0YW5jZVR5cGU8dHlwZW9mIENoaWxkUGFydD47XG5cbmNvbnN0IEVOQUJMRV9TSEFEWURPTV9OT1BBVENIID0gdHJ1ZTtcblxuY29uc3Qgd3JhcCA9XG4gIEVOQUJMRV9TSEFEWURPTV9OT1BBVENIICYmXG4gIHdpbmRvdy5TaGFkeURPTT8uaW5Vc2UgJiZcbiAgd2luZG93LlNoYWR5RE9NPy5ub1BhdGNoID09PSB0cnVlXG4gICAgPyB3aW5kb3cuU2hhZHlET00hLndyYXBcbiAgICA6IChub2RlOiBOb2RlKSA9PiBub2RlO1xuXG4vKipcbiAqIFRlc3RzIGlmIGEgdmFsdWUgaXMgYSBwcmltaXRpdmUgdmFsdWUuXG4gKlxuICogU2VlIGh0dHBzOi8vdGMzOS5naXRodWIuaW8vZWNtYTI2Mi8jc2VjLXR5cGVvZi1vcGVyYXRvclxuICovXG5leHBvcnQgY29uc3QgaXNQcmltaXRpdmUgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBQcmltaXRpdmUgPT5cbiAgdmFsdWUgPT09IG51bGwgfHwgKHR5cGVvZiB2YWx1ZSAhPSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsdWUgIT0gJ2Z1bmN0aW9uJyk7XG5cbmV4cG9ydCBjb25zdCBUZW1wbGF0ZVJlc3VsdFR5cGUgPSB7XG4gIEhUTUw6IDEsXG4gIFNWRzogMixcbn0gYXMgY29uc3Q7XG5cbmV4cG9ydCB0eXBlIFRlbXBsYXRlUmVzdWx0VHlwZSA9XG4gICh0eXBlb2YgVGVtcGxhdGVSZXN1bHRUeXBlKVtrZXlvZiB0eXBlb2YgVGVtcGxhdGVSZXN1bHRUeXBlXTtcblxuLyoqXG4gKiBUZXN0cyBpZiBhIHZhbHVlIGlzIGEgVGVtcGxhdGVSZXN1bHQuXG4gKi9cbmV4cG9ydCBjb25zdCBpc1RlbXBsYXRlUmVzdWx0ID0gKFxuICB2YWx1ZTogdW5rbm93bixcbiAgdHlwZT86IFRlbXBsYXRlUmVzdWx0VHlwZVxuKTogdmFsdWUgaXMgVGVtcGxhdGVSZXN1bHQgPT5cbiAgdHlwZSA9PT0gdW5kZWZpbmVkXG4gICAgPyAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgICAgKHZhbHVlIGFzIFRlbXBsYXRlUmVzdWx0KT8uWydfJGxpdFR5cGUkJ10gIT09IHVuZGVmaW5lZFxuICAgIDogKHZhbHVlIGFzIFRlbXBsYXRlUmVzdWx0KT8uWydfJGxpdFR5cGUkJ10gPT09IHR5cGU7XG5cbi8qKlxuICogVGVzdHMgaWYgYSB2YWx1ZSBpcyBhIERpcmVjdGl2ZVJlc3VsdC5cbiAqL1xuZXhwb3J0IGNvbnN0IGlzRGlyZWN0aXZlUmVzdWx0ID0gKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgRGlyZWN0aXZlUmVzdWx0ID0+XG4gIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICh2YWx1ZSBhcyBEaXJlY3RpdmVSZXN1bHQpPy5bJ18kbGl0RGlyZWN0aXZlJCddICE9PSB1bmRlZmluZWQ7XG5cbi8qKlxuICogUmV0cmlldmVzIHRoZSBEaXJlY3RpdmUgY2xhc3MgZm9yIGEgRGlyZWN0aXZlUmVzdWx0XG4gKi9cbmV4cG9ydCBjb25zdCBnZXREaXJlY3RpdmVDbGFzcyA9ICh2YWx1ZTogdW5rbm93bik6IERpcmVjdGl2ZUNsYXNzIHwgdW5kZWZpbmVkID0+XG4gIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICh2YWx1ZSBhcyBEaXJlY3RpdmVSZXN1bHQpPy5bJ18kbGl0RGlyZWN0aXZlJCddO1xuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgYSBwYXJ0IGhhcyBvbmx5IGEgc2luZ2xlLWV4cHJlc3Npb24gd2l0aCBubyBzdHJpbmdzIHRvXG4gKiBpbnRlcnBvbGF0ZSBiZXR3ZWVuLlxuICpcbiAqIE9ubHkgQXR0cmlidXRlUGFydCBhbmQgUHJvcGVydHlQYXJ0IGNhbiBoYXZlIG11bHRpcGxlIGV4cHJlc3Npb25zLlxuICogTXVsdGktZXhwcmVzc2lvbiBwYXJ0cyBoYXZlIGEgYHN0cmluZ3NgIHByb3BlcnR5IGFuZCBzaW5nbGUtZXhwcmVzc2lvblxuICogcGFydHMgZG8gbm90LlxuICovXG5leHBvcnQgY29uc3QgaXNTaW5nbGVFeHByZXNzaW9uID0gKHBhcnQ6IFBhcnRJbmZvKSA9PlxuICAocGFydCBhcyBBdHRyaWJ1dGVQYXJ0SW5mbykuc3RyaW5ncyA9PT0gdW5kZWZpbmVkO1xuXG5jb25zdCBjcmVhdGVNYXJrZXIgPSAoKSA9PiBkb2N1bWVudC5jcmVhdGVDb21tZW50KCcnKTtcblxuLyoqXG4gKiBJbnNlcnRzIGEgQ2hpbGRQYXJ0IGludG8gdGhlIGdpdmVuIGNvbnRhaW5lciBDaGlsZFBhcnQncyBET00sIGVpdGhlciBhdCB0aGVcbiAqIGVuZCBvZiB0aGUgY29udGFpbmVyIENoaWxkUGFydCwgb3IgYmVmb3JlIHRoZSBvcHRpb25hbCBgcmVmUGFydGAuXG4gKlxuICogVGhpcyBkb2VzIG5vdCBhZGQgdGhlIHBhcnQgdG8gdGhlIGNvbnRhaW5lclBhcnQncyBjb21taXR0ZWQgdmFsdWUuIFRoYXQgbXVzdFxuICogYmUgZG9uZSBieSBjYWxsZXJzLlxuICpcbiAqIEBwYXJhbSBjb250YWluZXJQYXJ0IFBhcnQgd2l0aGluIHdoaWNoIHRvIGFkZCB0aGUgbmV3IENoaWxkUGFydFxuICogQHBhcmFtIHJlZlBhcnQgUGFydCBiZWZvcmUgd2hpY2ggdG8gYWRkIHRoZSBuZXcgQ2hpbGRQYXJ0OyB3aGVuIG9taXR0ZWQgdGhlXG4gKiAgICAgcGFydCBhZGRlZCB0byB0aGUgZW5kIG9mIHRoZSBgY29udGFpbmVyUGFydGBcbiAqIEBwYXJhbSBwYXJ0IFBhcnQgdG8gaW5zZXJ0LCBvciB1bmRlZmluZWQgdG8gY3JlYXRlIGEgbmV3IHBhcnRcbiAqL1xuZXhwb3J0IGNvbnN0IGluc2VydFBhcnQgPSAoXG4gIGNvbnRhaW5lclBhcnQ6IENoaWxkUGFydCxcbiAgcmVmUGFydD86IENoaWxkUGFydCxcbiAgcGFydD86IENoaWxkUGFydFxuKTogQ2hpbGRQYXJ0ID0+IHtcbiAgY29uc3QgY29udGFpbmVyID0gd3JhcChjb250YWluZXJQYXJ0Ll8kc3RhcnROb2RlKS5wYXJlbnROb2RlITtcblxuICBjb25zdCByZWZOb2RlID1cbiAgICByZWZQYXJ0ID09PSB1bmRlZmluZWQgPyBjb250YWluZXJQYXJ0Ll8kZW5kTm9kZSA6IHJlZlBhcnQuXyRzdGFydE5vZGU7XG5cbiAgaWYgKHBhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IHN0YXJ0Tm9kZSA9IHdyYXAoY29udGFpbmVyKS5pbnNlcnRCZWZvcmUoY3JlYXRlTWFya2VyKCksIHJlZk5vZGUpO1xuICAgIGNvbnN0IGVuZE5vZGUgPSB3cmFwKGNvbnRhaW5lcikuaW5zZXJ0QmVmb3JlKGNyZWF0ZU1hcmtlcigpLCByZWZOb2RlKTtcbiAgICBwYXJ0ID0gbmV3IENoaWxkUGFydChcbiAgICAgIHN0YXJ0Tm9kZSxcbiAgICAgIGVuZE5vZGUsXG4gICAgICBjb250YWluZXJQYXJ0LFxuICAgICAgY29udGFpbmVyUGFydC5vcHRpb25zXG4gICAgKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBlbmROb2RlID0gd3JhcChwYXJ0Ll8kZW5kTm9kZSEpLm5leHRTaWJsaW5nO1xuICAgIGNvbnN0IG9sZFBhcmVudCA9IHBhcnQuXyRwYXJlbnQ7XG4gICAgY29uc3QgcGFyZW50Q2hhbmdlZCA9IG9sZFBhcmVudCAhPT0gY29udGFpbmVyUGFydDtcbiAgICBpZiAocGFyZW50Q2hhbmdlZCkge1xuICAgICAgcGFydC5fJHJlcGFyZW50RGlzY29ubmVjdGFibGVzPy4oY29udGFpbmVyUGFydCk7XG4gICAgICAvLyBOb3RlIHRoYXQgYWx0aG91Z2ggYF8kcmVwYXJlbnREaXNjb25uZWN0YWJsZXNgIHVwZGF0ZXMgdGhlIHBhcnQnc1xuICAgICAgLy8gYF8kcGFyZW50YCByZWZlcmVuY2UgYWZ0ZXIgdW5saW5raW5nIGZyb20gaXRzIGN1cnJlbnQgcGFyZW50LCB0aGF0XG4gICAgICAvLyBtZXRob2Qgb25seSBleGlzdHMgaWYgRGlzY29ubmVjdGFibGVzIGFyZSBwcmVzZW50LCBzbyB3ZSBuZWVkIHRvXG4gICAgICAvLyB1bmNvbmRpdGlvbmFsbHkgc2V0IGl0IGhlcmVcbiAgICAgIHBhcnQuXyRwYXJlbnQgPSBjb250YWluZXJQYXJ0O1xuICAgICAgLy8gU2luY2UgdGhlIF8kaXNDb25uZWN0ZWQgZ2V0dGVyIGlzIHNvbWV3aGF0IGNvc3RseSwgb25seVxuICAgICAgLy8gcmVhZCBpdCBvbmNlIHdlIGtub3cgdGhlIHN1YnRyZWUgaGFzIGRpcmVjdGl2ZXMgdGhhdCBuZWVkXG4gICAgICAvLyB0byBiZSBub3RpZmllZFxuICAgICAgbGV0IG5ld0Nvbm5lY3Rpb25TdGF0ZTtcbiAgICAgIGlmIChcbiAgICAgICAgcGFydC5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgKG5ld0Nvbm5lY3Rpb25TdGF0ZSA9IGNvbnRhaW5lclBhcnQuXyRpc0Nvbm5lY3RlZCkgIT09XG4gICAgICAgICAgb2xkUGFyZW50IS5fJGlzQ29ubmVjdGVkXG4gICAgICApIHtcbiAgICAgICAgcGFydC5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkKG5ld0Nvbm5lY3Rpb25TdGF0ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChlbmROb2RlICE9PSByZWZOb2RlIHx8IHBhcmVudENoYW5nZWQpIHtcbiAgICAgIGxldCBzdGFydDogTm9kZSB8IG51bGwgPSBwYXJ0Ll8kc3RhcnROb2RlO1xuICAgICAgd2hpbGUgKHN0YXJ0ICE9PSBlbmROb2RlKSB7XG4gICAgICAgIGNvbnN0IG46IE5vZGUgfCBudWxsID0gd3JhcChzdGFydCEpLm5leHRTaWJsaW5nO1xuICAgICAgICB3cmFwKGNvbnRhaW5lcikuaW5zZXJ0QmVmb3JlKHN0YXJ0ISwgcmVmTm9kZSk7XG4gICAgICAgIHN0YXJ0ID0gbjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGFydDtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgdmFsdWUgb2YgYSBQYXJ0LlxuICpcbiAqIE5vdGUgdGhhdCB0aGlzIHNob3VsZCBvbmx5IGJlIHVzZWQgdG8gc2V0L3VwZGF0ZSB0aGUgdmFsdWUgb2YgdXNlci1jcmVhdGVkXG4gKiBwYXJ0cyAoaS5lLiB0aG9zZSBjcmVhdGVkIHVzaW5nIGBpbnNlcnRQYXJ0YCk7IGl0IHNob3VsZCBub3QgYmUgdXNlZFxuICogYnkgZGlyZWN0aXZlcyB0byBzZXQgdGhlIHZhbHVlIG9mIHRoZSBkaXJlY3RpdmUncyBjb250YWluZXIgcGFydC4gRGlyZWN0aXZlc1xuICogc2hvdWxkIHJldHVybiBhIHZhbHVlIGZyb20gYHVwZGF0ZWAvYHJlbmRlcmAgdG8gdXBkYXRlIHRoZWlyIHBhcnQgc3RhdGUuXG4gKlxuICogRm9yIGRpcmVjdGl2ZXMgdGhhdCByZXF1aXJlIHNldHRpbmcgdGhlaXIgcGFydCB2YWx1ZSBhc3luY2hyb25vdXNseSwgdGhleVxuICogc2hvdWxkIGV4dGVuZCBgQXN5bmNEaXJlY3RpdmVgIGFuZCBjYWxsIGB0aGlzLnNldFZhbHVlKClgLlxuICpcbiAqIEBwYXJhbSBwYXJ0IFBhcnQgdG8gc2V0XG4gKiBAcGFyYW0gdmFsdWUgVmFsdWUgdG8gc2V0XG4gKiBAcGFyYW0gaW5kZXggRm9yIGBBdHRyaWJ1dGVQYXJ0YHMsIHRoZSBpbmRleCB0byBzZXRcbiAqIEBwYXJhbSBkaXJlY3RpdmVQYXJlbnQgVXNlZCBpbnRlcm5hbGx5OyBzaG91bGQgbm90IGJlIHNldCBieSB1c2VyXG4gKi9cbmV4cG9ydCBjb25zdCBzZXRDaGlsZFBhcnRWYWx1ZSA9IDxUIGV4dGVuZHMgQ2hpbGRQYXJ0PihcbiAgcGFydDogVCxcbiAgdmFsdWU6IHVua25vd24sXG4gIGRpcmVjdGl2ZVBhcmVudDogRGlyZWN0aXZlUGFyZW50ID0gcGFydFxuKTogVCA9PiB7XG4gIHBhcnQuXyRzZXRWYWx1ZSh2YWx1ZSwgZGlyZWN0aXZlUGFyZW50KTtcbiAgcmV0dXJuIHBhcnQ7XG59O1xuXG4vLyBBIHNlbnRpbmVsIHZhbHVlIHRoYXQgY2FuIG5ldmVyIGFwcGVhciBhcyBhIHBhcnQgdmFsdWUgZXhjZXB0IHdoZW4gc2V0IGJ5XG4vLyBsaXZlKCkuIFVzZWQgdG8gZm9yY2UgYSBkaXJ0eS1jaGVjayB0byBmYWlsIGFuZCBjYXVzZSBhIHJlLXJlbmRlci5cbmNvbnN0IFJFU0VUX1ZBTFVFID0ge307XG5cbi8qKlxuICogU2V0cyB0aGUgY29tbWl0dGVkIHZhbHVlIG9mIGEgQ2hpbGRQYXJ0IGRpcmVjdGx5IHdpdGhvdXQgdHJpZ2dlcmluZyB0aGVcbiAqIGNvbW1pdCBzdGFnZSBvZiB0aGUgcGFydC5cbiAqXG4gKiBUaGlzIGlzIHVzZWZ1bCBpbiBjYXNlcyB3aGVyZSBhIGRpcmVjdGl2ZSBuZWVkcyB0byB1cGRhdGUgdGhlIHBhcnQgc3VjaFxuICogdGhhdCB0aGUgbmV4dCB1cGRhdGUgZGV0ZWN0cyBhIHZhbHVlIGNoYW5nZSBvciBub3QuIFdoZW4gdmFsdWUgaXMgb21pdHRlZCxcbiAqIHRoZSBuZXh0IHVwZGF0ZSB3aWxsIGJlIGd1YXJhbnRlZWQgdG8gYmUgZGV0ZWN0ZWQgYXMgYSBjaGFuZ2UuXG4gKlxuICogQHBhcmFtIHBhcnRcbiAqIEBwYXJhbSB2YWx1ZVxuICovXG5leHBvcnQgY29uc3Qgc2V0Q29tbWl0dGVkVmFsdWUgPSAocGFydDogUGFydCwgdmFsdWU6IHVua25vd24gPSBSRVNFVF9WQUxVRSkgPT5cbiAgKHBhcnQuXyRjb21taXR0ZWRWYWx1ZSA9IHZhbHVlKTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBjb21taXR0ZWQgdmFsdWUgb2YgYSBDaGlsZFBhcnQuXG4gKlxuICogVGhlIGNvbW1pdHRlZCB2YWx1ZSBpcyB1c2VkIGZvciBjaGFuZ2UgZGV0ZWN0aW9uIGFuZCBlZmZpY2llbnQgdXBkYXRlcyBvZlxuICogdGhlIHBhcnQuIEl0IGNhbiBkaWZmZXIgZnJvbSB0aGUgdmFsdWUgc2V0IGJ5IHRoZSB0ZW1wbGF0ZSBvciBkaXJlY3RpdmUgaW5cbiAqIGNhc2VzIHdoZXJlIHRoZSB0ZW1wbGF0ZSB2YWx1ZSBpcyB0cmFuc2Zvcm1lZCBiZWZvcmUgYmVpbmcgY29tbWl0dGVkLlxuICpcbiAqIC0gYFRlbXBsYXRlUmVzdWx0YHMgYXJlIGNvbW1pdHRlZCBhcyBhIGBUZW1wbGF0ZUluc3RhbmNlYFxuICogLSBJdGVyYWJsZXMgYXJlIGNvbW1pdHRlZCBhcyBgQXJyYXk8Q2hpbGRQYXJ0PmBcbiAqIC0gQWxsIG90aGVyIHR5cGVzIGFyZSBjb21taXR0ZWQgYXMgdGhlIHRlbXBsYXRlIHZhbHVlIG9yIHZhbHVlIHJldHVybmVkIG9yXG4gKiAgIHNldCBieSBhIGRpcmVjdGl2ZS5cbiAqXG4gKiBAcGFyYW0gcGFydFxuICovXG5leHBvcnQgY29uc3QgZ2V0Q29tbWl0dGVkVmFsdWUgPSAocGFydDogQ2hpbGRQYXJ0KSA9PiBwYXJ0Ll8kY29tbWl0dGVkVmFsdWU7XG5cbi8qKlxuICogUmVtb3ZlcyBhIENoaWxkUGFydCBmcm9tIHRoZSBET00sIGluY2x1ZGluZyBhbnkgb2YgaXRzIGNvbnRlbnQuXG4gKlxuICogQHBhcmFtIHBhcnQgVGhlIFBhcnQgdG8gcmVtb3ZlXG4gKi9cbmV4cG9ydCBjb25zdCByZW1vdmVQYXJ0ID0gKHBhcnQ6IENoaWxkUGFydCkgPT4ge1xuICBwYXJ0Ll8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQ/LihmYWxzZSwgdHJ1ZSk7XG4gIGxldCBzdGFydDogQ2hpbGROb2RlIHwgbnVsbCA9IHBhcnQuXyRzdGFydE5vZGU7XG4gIGNvbnN0IGVuZDogQ2hpbGROb2RlIHwgbnVsbCA9IHdyYXAocGFydC5fJGVuZE5vZGUhKS5uZXh0U2libGluZztcbiAgd2hpbGUgKHN0YXJ0ICE9PSBlbmQpIHtcbiAgICBjb25zdCBuOiBDaGlsZE5vZGUgfCBudWxsID0gd3JhcChzdGFydCEpLm5leHRTaWJsaW5nO1xuICAgICh3cmFwKHN0YXJ0ISkgYXMgQ2hpbGROb2RlKS5yZW1vdmUoKTtcbiAgICBzdGFydCA9IG47XG4gIH1cbn07XG5cbmV4cG9ydCBjb25zdCBjbGVhclBhcnQgPSAocGFydDogQ2hpbGRQYXJ0KSA9PiB7XG4gIHBhcnQuXyRjbGVhcigpO1xufTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG4vKipcbiAqIE92ZXJ2aWV3OlxuICpcbiAqIFRoaXMgbW9kdWxlIGlzIGRlc2lnbmVkIHRvIGFkZCBzdXBwb3J0IGZvciBhbiBhc3luYyBgc2V0VmFsdWVgIEFQSSBhbmRcbiAqIGBkaXNjb25uZWN0ZWRgIGNhbGxiYWNrIHRvIGRpcmVjdGl2ZXMgd2l0aCB0aGUgbGVhc3QgaW1wYWN0IG9uIHRoZSBjb3JlXG4gKiBydW50aW1lIG9yIHBheWxvYWQgd2hlbiB0aGF0IGZlYXR1cmUgaXMgbm90IHVzZWQuXG4gKlxuICogVGhlIHN0cmF0ZWd5IGlzIHRvIGludHJvZHVjZSBhIGBBc3luY0RpcmVjdGl2ZWAgc3ViY2xhc3Mgb2ZcbiAqIGBEaXJlY3RpdmVgIHRoYXQgY2xpbWJzIHRoZSBcInBhcmVudFwiIHRyZWUgaW4gaXRzIGNvbnN0cnVjdG9yIHRvIG5vdGUgd2hpY2hcbiAqIGJyYW5jaGVzIG9mIGxpdC1odG1sJ3MgXCJsb2dpY2FsIHRyZWVcIiBvZiBkYXRhIHN0cnVjdHVyZXMgY29udGFpbiBzdWNoXG4gKiBkaXJlY3RpdmVzIGFuZCB0aHVzIG5lZWQgdG8gYmUgY3Jhd2xlZCB3aGVuIGEgc3VidHJlZSBpcyBiZWluZyBjbGVhcmVkIChvclxuICogbWFudWFsbHkgZGlzY29ubmVjdGVkKSBpbiBvcmRlciB0byBydW4gdGhlIGBkaXNjb25uZWN0ZWRgIGNhbGxiYWNrLlxuICpcbiAqIFRoZSBcIm5vZGVzXCIgb2YgdGhlIGxvZ2ljYWwgdHJlZSBpbmNsdWRlIFBhcnRzLCBUZW1wbGF0ZUluc3RhbmNlcyAoZm9yIHdoZW4gYVxuICogVGVtcGxhdGVSZXN1bHQgaXMgY29tbWl0dGVkIHRvIGEgdmFsdWUgb2YgYSBDaGlsZFBhcnQpLCBhbmQgRGlyZWN0aXZlczsgdGhlc2VcbiAqIGFsbCBpbXBsZW1lbnQgYSBjb21tb24gaW50ZXJmYWNlIGNhbGxlZCBgRGlzY29ubmVjdGFibGVDaGlsZGAuIEVhY2ggaGFzIGFcbiAqIGBfJHBhcmVudGAgcmVmZXJlbmNlIHdoaWNoIGlzIHNldCBkdXJpbmcgY29uc3RydWN0aW9uIGluIHRoZSBjb3JlIGNvZGUsIGFuZCBhXG4gKiBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCBmaWVsZCB3aGljaCBpcyBpbml0aWFsbHkgdW5kZWZpbmVkLlxuICpcbiAqIFRoZSBzcGFyc2UgdHJlZSBjcmVhdGVkIGJ5IG1lYW5zIG9mIHRoZSBgQXN5bmNEaXJlY3RpdmVgIGNvbnN0cnVjdG9yXG4gKiBjcmF3bGluZyB1cCB0aGUgYF8kcGFyZW50YCB0cmVlIGFuZCBwbGFjaW5nIGEgYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAgU2V0XG4gKiBvbiBlYWNoIHBhcmVudCB0aGF0IGluY2x1ZGVzIGVhY2ggY2hpbGQgdGhhdCBjb250YWlucyBhXG4gKiBgQXN5bmNEaXJlY3RpdmVgIGRpcmVjdGx5IG9yIHRyYW5zaXRpdmVseSB2aWEgaXRzIGNoaWxkcmVuLiBJbiBvcmRlciB0b1xuICogbm90aWZ5IGNvbm5lY3Rpb24gc3RhdGUgY2hhbmdlcyBhbmQgZGlzY29ubmVjdCAob3IgcmVjb25uZWN0KSBhIHRyZWUsIHRoZVxuICogYF8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWRgIEFQSSBpcyBwYXRjaGVkIG9udG8gQ2hpbGRQYXJ0cyBhcyBhIGRpcmVjdGl2ZVxuICogY2xpbWJzIHRoZSBwYXJlbnQgdHJlZSwgd2hpY2ggaXMgY2FsbGVkIGJ5IHRoZSBjb3JlIHdoZW4gY2xlYXJpbmcgYSBwYXJ0IGlmXG4gKiBpdCBleGlzdHMuIFdoZW4gY2FsbGVkLCB0aGF0IG1ldGhvZCBpdGVyYXRlcyBvdmVyIHRoZSBzcGFyc2UgdHJlZSBvZlxuICogU2V0PERpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4+IGJ1aWx0IHVwIGJ5IEFzeW5jRGlyZWN0aXZlcywgYW5kIGNhbGxzXG4gKiBgXyRub3RpZnlEaXJlY3RpdmVDb25uZWN0aW9uQ2hhbmdlZGAgb24gYW55IGRpcmVjdGl2ZXMgdGhhdCBhcmUgZW5jb3VudGVyZWRcbiAqIGluIHRoYXQgdHJlZSwgcnVubmluZyB0aGUgcmVxdWlyZWQgY2FsbGJhY2tzLlxuICpcbiAqIEEgZ2l2ZW4gXCJsb2dpY2FsIHRyZWVcIiBvZiBsaXQtaHRtbCBkYXRhLXN0cnVjdHVyZXMgbWlnaHQgbG9vayBsaWtlIHRoaXM6XG4gKlxuICogIENoaWxkUGFydChOMSkgXyRkQz1bRDIsVDNdXG4gKiAgIC5fZGlyZWN0aXZlXG4gKiAgICAgQXN5bmNEaXJlY3RpdmUoRDIpXG4gKiAgIC5fdmFsdWUgLy8gdXNlciB2YWx1ZSB3YXMgVGVtcGxhdGVSZXN1bHRcbiAqICAgICBUZW1wbGF0ZUluc3RhbmNlKFQzKSBfJGRDPVtBNCxBNixOMTAsTjEyXVxuICogICAgICAuXyRwYXJ0c1tdXG4gKiAgICAgICAgQXR0cmlidXRlUGFydChBNCkgXyRkQz1bRDVdXG4gKiAgICAgICAgIC5fZGlyZWN0aXZlc1tdXG4gKiAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDUpXG4gKiAgICAgICAgQXR0cmlidXRlUGFydChBNikgXyRkQz1bRDcsRDhdXG4gKiAgICAgICAgIC5fZGlyZWN0aXZlc1tdXG4gKiAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDcpXG4gKiAgICAgICAgICAgRGlyZWN0aXZlKEQ4KSBfJGRDPVtEOV1cbiAqICAgICAgICAgICAgLl9kaXJlY3RpdmVcbiAqICAgICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEOSlcbiAqICAgICAgICBDaGlsZFBhcnQoTjEwKSBfJGRDPVtEMTFdXG4gKiAgICAgICAgIC5fZGlyZWN0aXZlXG4gKiAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDExKVxuICogICAgICAgICAuX3ZhbHVlXG4gKiAgICAgICAgICAgc3RyaW5nXG4gKiAgICAgICAgQ2hpbGRQYXJ0KE4xMikgXyRkQz1bRDEzLE4xNCxOMTZdXG4gKiAgICAgICAgIC5fZGlyZWN0aXZlXG4gKiAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDEzKVxuICogICAgICAgICAuX3ZhbHVlIC8vIHVzZXIgdmFsdWUgd2FzIGl0ZXJhYmxlXG4gKiAgICAgICAgICAgQXJyYXk8Q2hpbGRQYXJ0PlxuICogICAgICAgICAgICAgQ2hpbGRQYXJ0KE4xNCkgXyRkQz1bRDE1XVxuICogICAgICAgICAgICAgIC5fdmFsdWVcbiAqICAgICAgICAgICAgICAgIHN0cmluZ1xuICogICAgICAgICAgICAgQ2hpbGRQYXJ0KE4xNikgXyRkQz1bRDE3LFQxOF1cbiAqICAgICAgICAgICAgICAuX2RpcmVjdGl2ZVxuICogICAgICAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDE3KVxuICogICAgICAgICAgICAgIC5fdmFsdWUgLy8gdXNlciB2YWx1ZSB3YXMgVGVtcGxhdGVSZXN1bHRcbiAqICAgICAgICAgICAgICAgIFRlbXBsYXRlSW5zdGFuY2UoVDE4KSBfJGRDPVtBMTksQTIxLE4yNV1cbiAqICAgICAgICAgICAgICAgICAuXyRwYXJ0c1tdXG4gKiAgICAgICAgICAgICAgICAgICBBdHRyaWJ1dGVQYXJ0KEExOSkgXyRkQz1bRDIwXVxuICogICAgICAgICAgICAgICAgICAgIC5fZGlyZWN0aXZlc1tdXG4gKiAgICAgICAgICAgICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEMjApXG4gKiAgICAgICAgICAgICAgICAgICBBdHRyaWJ1dGVQYXJ0KEEyMSkgXyRkQz1bMjIsMjNdXG4gKiAgICAgICAgICAgICAgICAgICAgLl9kaXJlY3RpdmVzW11cbiAqICAgICAgICAgICAgICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQyMilcbiAqICAgICAgICAgICAgICAgICAgICAgIERpcmVjdGl2ZShEMjMpIF8kZEM9W0QyNF1cbiAqICAgICAgICAgICAgICAgICAgICAgICAuX2RpcmVjdGl2ZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDI0KVxuICogICAgICAgICAgICAgICAgICAgQ2hpbGRQYXJ0KE4yNSkgXyRkQz1bRDI2XVxuICogICAgICAgICAgICAgICAgICAgIC5fZGlyZWN0aXZlXG4gKiAgICAgICAgICAgICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEMjYpXG4gKiAgICAgICAgICAgICAgICAgICAgLl92YWx1ZVxuICogICAgICAgICAgICAgICAgICAgICAgc3RyaW5nXG4gKlxuICogRXhhbXBsZSAxOiBUaGUgZGlyZWN0aXZlIGluIENoaWxkUGFydChOMTIpIHVwZGF0ZXMgYW5kIHJldHVybnMgYG5vdGhpbmdgLiBUaGVcbiAqIENoaWxkUGFydCB3aWxsIF9jbGVhcigpIGl0c2VsZiwgYW5kIHNvIHdlIG5lZWQgdG8gZGlzY29ubmVjdCB0aGUgXCJ2YWx1ZVwiIG9mXG4gKiB0aGUgQ2hpbGRQYXJ0IChidXQgbm90IGl0cyBkaXJlY3RpdmUpLiBJbiB0aGlzIGNhc2UsIHdoZW4gYF9jbGVhcigpYCBjYWxsc1xuICogYF8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQoKWAsIHdlIGRvbid0IGl0ZXJhdGUgYWxsIG9mIHRoZVxuICogXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuLCByYXRoZXIgd2UgZG8gYSB2YWx1ZS1zcGVjaWZpYyBkaXNjb25uZWN0aW9uOiBpLmUuXG4gKiBzaW5jZSB0aGUgX3ZhbHVlIHdhcyBhbiBBcnJheTxDaGlsZFBhcnQ+IChiZWNhdXNlIGFuIGl0ZXJhYmxlIGhhZCBiZWVuXG4gKiBjb21taXR0ZWQpLCB3ZSBpdGVyYXRlIHRoZSBhcnJheSBvZiBDaGlsZFBhcnRzIChOMTQsIE4xNikgYW5kIHJ1blxuICogYHNldENvbm5lY3RlZGAgb24gdGhlbSAod2hpY2ggZG9lcyByZWN1cnNlIGRvd24gdGhlIGZ1bGwgdHJlZSBvZlxuICogYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAgYmVsb3cgaXQsIGFuZCBhbHNvIHJlbW92ZXMgTjE0IGFuZCBOMTYgZnJvbSBOMTInc1xuICogYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmApLiBPbmNlIHRoZSB2YWx1ZXMgaGF2ZSBiZWVuIGRpc2Nvbm5lY3RlZCwgd2UgdGhlblxuICogY2hlY2sgd2hldGhlciB0aGUgQ2hpbGRQYXJ0KE4xMikncyBsaXN0IG9mIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gIGlzIGVtcHR5XG4gKiAoYW5kIHdvdWxkIHJlbW92ZSBpdCBmcm9tIGl0cyBwYXJlbnQgVGVtcGxhdGVJbnN0YW5jZShUMykgaWYgc28pLCBidXQgc2luY2VcbiAqIGl0IHdvdWxkIHN0aWxsIGNvbnRhaW4gaXRzIGRpcmVjdGl2ZSBEMTMsIGl0IHN0YXlzIGluIHRoZSBkaXNjb25uZWN0YWJsZVxuICogdHJlZS5cbiAqXG4gKiBFeGFtcGxlIDI6IEluIHRoZSBjb3Vyc2Ugb2YgRXhhbXBsZSAxLCBgc2V0Q29ubmVjdGVkYCB3aWxsIHJlYWNoXG4gKiBDaGlsZFBhcnQoTjE2KTsgaW4gdGhpcyBjYXNlIHRoZSBlbnRpcmUgcGFydCBpcyBiZWluZyBkaXNjb25uZWN0ZWQsIHNvIHdlXG4gKiBzaW1wbHkgaXRlcmF0ZSBhbGwgb2YgTjE2J3MgYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAgKEQxNyxUMTgpIGFuZFxuICogcmVjdXJzaXZlbHkgcnVuIGBzZXRDb25uZWN0ZWRgIG9uIHRoZW0uIE5vdGUgdGhhdCB3ZSBvbmx5IHJlbW92ZSBjaGlsZHJlblxuICogZnJvbSBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCBmb3IgdGhlIHRvcC1sZXZlbCB2YWx1ZXMgYmVpbmcgZGlzY29ubmVjdGVkXG4gKiBvbiBhIGNsZWFyOyBkb2luZyB0aGlzIGJvb2trZWVwaW5nIGxvd2VyIGluIHRoZSB0cmVlIGlzIHdhc3RlZnVsIHNpbmNlIGl0J3NcbiAqIGFsbCBiZWluZyB0aHJvd24gYXdheS5cbiAqXG4gKiBFeGFtcGxlIDM6IElmIHRoZSBMaXRFbGVtZW50IGNvbnRhaW5pbmcgdGhlIGVudGlyZSB0cmVlIGFib3ZlIGJlY29tZXNcbiAqIGRpc2Nvbm5lY3RlZCwgaXQgd2lsbCBydW4gYGNoaWxkUGFydC5zZXRDb25uZWN0ZWQoKWAgKHdoaWNoIGNhbGxzXG4gKiBgY2hpbGRQYXJ0Ll8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQoKWAgaWYgaXQgZXhpc3RzKTsgaW4gdGhpcyBjYXNlLCB3ZVxuICogcmVjdXJzaXZlbHkgcnVuIGBzZXRDb25uZWN0ZWQoKWAgb3ZlciB0aGUgZW50aXJlIHRyZWUsIHdpdGhvdXQgcmVtb3ZpbmcgYW55XG4gKiBjaGlsZHJlbiBmcm9tIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gLCBzaW5jZSB0aGlzIHRyZWUgaXMgcmVxdWlyZWQgdG9cbiAqIHJlLWNvbm5lY3QgdGhlIHRyZWUsIHdoaWNoIGRvZXMgdGhlIHNhbWUgb3BlcmF0aW9uLCBzaW1wbHkgcGFzc2luZ1xuICogYGlzQ29ubmVjdGVkOiB0cnVlYCBkb3duIHRoZSB0cmVlLCBzaWduYWxpbmcgd2hpY2ggY2FsbGJhY2sgdG8gcnVuLlxuICovXG5cbmltcG9ydCB7QXR0cmlidXRlUGFydCwgQ2hpbGRQYXJ0LCBEaXNjb25uZWN0YWJsZSwgUGFydH0gZnJvbSAnLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2lzU2luZ2xlRXhwcmVzc2lvbn0gZnJvbSAnLi9kaXJlY3RpdmUtaGVscGVycy5qcyc7XG5pbXBvcnQge0RpcmVjdGl2ZSwgUGFydEluZm8sIFBhcnRUeXBlfSBmcm9tICcuL2RpcmVjdGl2ZS5qcyc7XG5leHBvcnQgKiBmcm9tICcuL2RpcmVjdGl2ZS5qcyc7XG5cbmNvbnN0IERFVl9NT0RFID0gdHJ1ZTtcblxuLyoqXG4gKiBSZWN1cnNpdmVseSB3YWxrcyBkb3duIHRoZSB0cmVlIG9mIFBhcnRzL1RlbXBsYXRlSW5zdGFuY2VzL0RpcmVjdGl2ZXMgdG8gc2V0XG4gKiB0aGUgY29ubmVjdGVkIHN0YXRlIG9mIGRpcmVjdGl2ZXMgYW5kIHJ1biBgZGlzY29ubmVjdGVkYC8gYHJlY29ubmVjdGVkYFxuICogY2FsbGJhY2tzLlxuICpcbiAqIEByZXR1cm4gVHJ1ZSBpZiB0aGVyZSB3ZXJlIGNoaWxkcmVuIHRvIGRpc2Nvbm5lY3Q7IGZhbHNlIG90aGVyd2lzZVxuICovXG5jb25zdCBub3RpZnlDaGlsZHJlbkNvbm5lY3RlZENoYW5nZWQgPSAoXG4gIHBhcmVudDogRGlzY29ubmVjdGFibGUsXG4gIGlzQ29ubmVjdGVkOiBib29sZWFuXG4pOiBib29sZWFuID0+IHtcbiAgY29uc3QgY2hpbGRyZW4gPSBwYXJlbnQuXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuO1xuICBpZiAoY2hpbGRyZW4gPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBmb3IgKGNvbnN0IG9iaiBvZiBjaGlsZHJlbikge1xuICAgIC8vIFRoZSBleGlzdGVuY2Ugb2YgYF8kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWRgIGlzIHVzZWQgYXMgYSBcImJyYW5kXCIgdG9cbiAgICAvLyBkaXNhbWJpZ3VhdGUgQXN5bmNEaXJlY3RpdmVzIGZyb20gb3RoZXIgRGlzY29ubmVjdGFibGVDaGlsZHJlblxuICAgIC8vIChhcyBvcHBvc2VkIHRvIHVzaW5nIGFuIGluc3RhbmNlb2YgY2hlY2sgdG8ga25vdyB3aGVuIHRvIGNhbGwgaXQpOyB0aGVcbiAgICAvLyByZWR1bmRhbmN5IG9mIFwiRGlyZWN0aXZlXCIgaW4gdGhlIEFQSSBuYW1lIGlzIHRvIGF2b2lkIGNvbmZsaWN0aW5nIHdpdGhcbiAgICAvLyBgXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZGAsIHdoaWNoIGV4aXN0cyBgQ2hpbGRQYXJ0c2Agd2hpY2ggYXJlIGFsc28gaW5cbiAgICAvLyB0aGlzIGxpc3RcbiAgICAvLyBEaXNjb25uZWN0IERpcmVjdGl2ZSAoYW5kIGFueSBuZXN0ZWQgZGlyZWN0aXZlcyBjb250YWluZWQgd2l0aGluKVxuICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgKG9iaiBhcyBBc3luY0RpcmVjdGl2ZSlbJ18kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWQnXT8uKFxuICAgICAgaXNDb25uZWN0ZWQsXG4gICAgICBmYWxzZVxuICAgICk7XG4gICAgLy8gRGlzY29ubmVjdCBQYXJ0L1RlbXBsYXRlSW5zdGFuY2VcbiAgICBub3RpZnlDaGlsZHJlbkNvbm5lY3RlZENoYW5nZWQob2JqLCBpc0Nvbm5lY3RlZCk7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgdGhlIGdpdmVuIGNoaWxkIGZyb20gaXRzIHBhcmVudCBsaXN0IG9mIGRpc2Nvbm5lY3RhYmxlIGNoaWxkcmVuLCBhbmRcbiAqIGlmIHRoZSBwYXJlbnQgbGlzdCBiZWNvbWVzIGVtcHR5IGFzIGEgcmVzdWx0LCByZW1vdmVzIHRoZSBwYXJlbnQgZnJvbSBpdHNcbiAqIHBhcmVudCwgYW5kIHNvIGZvcnRoIHVwIHRoZSB0cmVlIHdoZW4gdGhhdCBjYXVzZXMgc3Vic2VxdWVudCBwYXJlbnQgbGlzdHMgdG9cbiAqIGJlY29tZSBlbXB0eS5cbiAqL1xuY29uc3QgcmVtb3ZlRGlzY29ubmVjdGFibGVGcm9tUGFyZW50ID0gKG9iajogRGlzY29ubmVjdGFibGUpID0+IHtcbiAgbGV0IHBhcmVudCwgY2hpbGRyZW47XG4gIGRvIHtcbiAgICBpZiAoKHBhcmVudCA9IG9iai5fJHBhcmVudCkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNoaWxkcmVuID0gcGFyZW50Ll8kZGlzY29ubmVjdGFibGVDaGlsZHJlbiE7XG4gICAgY2hpbGRyZW4uZGVsZXRlKG9iaik7XG4gICAgb2JqID0gcGFyZW50O1xuICB9IHdoaWxlIChjaGlsZHJlbj8uc2l6ZSA9PT0gMCk7XG59O1xuXG5jb25zdCBhZGREaXNjb25uZWN0YWJsZVRvUGFyZW50ID0gKG9iajogRGlzY29ubmVjdGFibGUpID0+IHtcbiAgLy8gQ2xpbWIgdGhlIHBhcmVudCB0cmVlLCBjcmVhdGluZyBhIHNwYXJzZSB0cmVlIG9mIGNoaWxkcmVuIG5lZWRpbmdcbiAgLy8gZGlzY29ubmVjdGlvblxuICBmb3IgKGxldCBwYXJlbnQ7IChwYXJlbnQgPSBvYmouXyRwYXJlbnQpOyBvYmogPSBwYXJlbnQpIHtcbiAgICBsZXQgY2hpbGRyZW4gPSBwYXJlbnQuXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuO1xuICAgIGlmIChjaGlsZHJlbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBwYXJlbnQuXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuID0gY2hpbGRyZW4gPSBuZXcgU2V0KCk7XG4gICAgfSBlbHNlIGlmIChjaGlsZHJlbi5oYXMob2JqKSkge1xuICAgICAgLy8gT25jZSB3ZSd2ZSByZWFjaGVkIGEgcGFyZW50IHRoYXQgYWxyZWFkeSBjb250YWlucyB0aGlzIGNoaWxkLCB3ZVxuICAgICAgLy8gY2FuIHNob3J0LWNpcmN1aXRcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjaGlsZHJlbi5hZGQob2JqKTtcbiAgICBpbnN0YWxsRGlzY29ubmVjdEFQSShwYXJlbnQpO1xuICB9XG59O1xuXG4vKipcbiAqIENoYW5nZXMgdGhlIHBhcmVudCByZWZlcmVuY2Ugb2YgdGhlIENoaWxkUGFydCwgYW5kIHVwZGF0ZXMgdGhlIHNwYXJzZSB0cmVlIG9mXG4gKiBEaXNjb25uZWN0YWJsZSBjaGlsZHJlbiBhY2NvcmRpbmdseS5cbiAqXG4gKiBOb3RlLCB0aGlzIG1ldGhvZCB3aWxsIGJlIHBhdGNoZWQgb250byBDaGlsZFBhcnQgaW5zdGFuY2VzIGFuZCBjYWxsZWQgZnJvbVxuICogdGhlIGNvcmUgY29kZSB3aGVuIHBhcnRzIGFyZSBtb3ZlZCBiZXR3ZWVuIGRpZmZlcmVudCBwYXJlbnRzLlxuICovXG5mdW5jdGlvbiByZXBhcmVudERpc2Nvbm5lY3RhYmxlcyh0aGlzOiBDaGlsZFBhcnQsIG5ld1BhcmVudDogRGlzY29ubmVjdGFibGUpIHtcbiAgaWYgKHRoaXMuXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuICE9PSB1bmRlZmluZWQpIHtcbiAgICByZW1vdmVEaXNjb25uZWN0YWJsZUZyb21QYXJlbnQodGhpcyk7XG4gICAgdGhpcy5fJHBhcmVudCA9IG5ld1BhcmVudDtcbiAgICBhZGREaXNjb25uZWN0YWJsZVRvUGFyZW50KHRoaXMpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuXyRwYXJlbnQgPSBuZXdQYXJlbnQ7XG4gIH1cbn1cblxuLyoqXG4gKiBTZXRzIHRoZSBjb25uZWN0ZWQgc3RhdGUgb24gYW55IGRpcmVjdGl2ZXMgY29udGFpbmVkIHdpdGhpbiB0aGUgY29tbWl0dGVkXG4gKiB2YWx1ZSBvZiB0aGlzIHBhcnQgKGkuZS4gd2l0aGluIGEgVGVtcGxhdGVJbnN0YW5jZSBvciBpdGVyYWJsZSBvZlxuICogQ2hpbGRQYXJ0cykgYW5kIHJ1bnMgdGhlaXIgYGRpc2Nvbm5lY3RlZGAvYHJlY29ubmVjdGVkYHMsIGFzIHdlbGwgYXMgd2l0aGluXG4gKiBhbnkgZGlyZWN0aXZlcyBzdG9yZWQgb24gdGhlIENoaWxkUGFydCAod2hlbiBgdmFsdWVPbmx5YCBpcyBmYWxzZSkuXG4gKlxuICogYGlzQ2xlYXJpbmdWYWx1ZWAgc2hvdWxkIGJlIHBhc3NlZCBhcyBgdHJ1ZWAgb24gYSB0b3AtbGV2ZWwgcGFydCB0aGF0IGlzXG4gKiBjbGVhcmluZyBpdHNlbGYsIGFuZCBub3QgYXMgYSByZXN1bHQgb2YgcmVjdXJzaXZlbHkgZGlzY29ubmVjdGluZyBkaXJlY3RpdmVzXG4gKiBhcyBwYXJ0IG9mIGEgYGNsZWFyYCBvcGVyYXRpb24gaGlnaGVyIHVwIHRoZSB0cmVlLiBUaGlzIGJvdGggZW5zdXJlcyB0aGF0IGFueVxuICogZGlyZWN0aXZlIG9uIHRoaXMgQ2hpbGRQYXJ0IHRoYXQgcHJvZHVjZWQgYSB2YWx1ZSB0aGF0IGNhdXNlZCB0aGUgY2xlYXJcbiAqIG9wZXJhdGlvbiBpcyBub3QgZGlzY29ubmVjdGVkLCBhbmQgYWxzbyBzZXJ2ZXMgYXMgYSBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb25cbiAqIHRvIGF2b2lkIG5lZWRsZXNzIGJvb2trZWVwaW5nIHdoZW4gYSBzdWJ0cmVlIGlzIGdvaW5nIGF3YXk7IHdoZW4gY2xlYXJpbmcgYVxuICogc3VidHJlZSwgb25seSB0aGUgdG9wLW1vc3QgcGFydCBuZWVkIHRvIHJlbW92ZSBpdHNlbGYgZnJvbSB0aGUgcGFyZW50LlxuICpcbiAqIGBmcm9tUGFydEluZGV4YCBpcyBwYXNzZWQgb25seSBpbiB0aGUgY2FzZSBvZiBhIHBhcnRpYWwgYF9jbGVhcmAgcnVubmluZyBhcyBhXG4gKiByZXN1bHQgb2YgdHJ1bmNhdGluZyBhbiBpdGVyYWJsZS5cbiAqXG4gKiBOb3RlLCB0aGlzIG1ldGhvZCB3aWxsIGJlIHBhdGNoZWQgb250byBDaGlsZFBhcnQgaW5zdGFuY2VzIGFuZCBjYWxsZWQgZnJvbSB0aGVcbiAqIGNvcmUgY29kZSB3aGVuIHBhcnRzIGFyZSBjbGVhcmVkIG9yIHRoZSBjb25uZWN0aW9uIHN0YXRlIGlzIGNoYW5nZWQgYnkgdGhlXG4gKiB1c2VyLlxuICovXG5mdW5jdGlvbiBub3RpZnlDaGlsZFBhcnRDb25uZWN0ZWRDaGFuZ2VkKFxuICB0aGlzOiBDaGlsZFBhcnQsXG4gIGlzQ29ubmVjdGVkOiBib29sZWFuLFxuICBpc0NsZWFyaW5nVmFsdWUgPSBmYWxzZSxcbiAgZnJvbVBhcnRJbmRleCA9IDBcbikge1xuICBjb25zdCB2YWx1ZSA9IHRoaXMuXyRjb21taXR0ZWRWYWx1ZTtcbiAgY29uc3QgY2hpbGRyZW4gPSB0aGlzLl8kZGlzY29ubmVjdGFibGVDaGlsZHJlbjtcbiAgaWYgKGNoaWxkcmVuID09PSB1bmRlZmluZWQgfHwgY2hpbGRyZW4uc2l6ZSA9PT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoaXNDbGVhcmluZ1ZhbHVlKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAvLyBJdGVyYWJsZSBjYXNlOiBBbnkgQ2hpbGRQYXJ0cyBjcmVhdGVkIGJ5IHRoZSBpdGVyYWJsZSBzaG91bGQgYmVcbiAgICAgIC8vIGRpc2Nvbm5lY3RlZCBhbmQgcmVtb3ZlZCBmcm9tIHRoaXMgQ2hpbGRQYXJ0J3MgZGlzY29ubmVjdGFibGVcbiAgICAgIC8vIGNoaWxkcmVuIChzdGFydGluZyBhdCBgZnJvbVBhcnRJbmRleGAgaW4gdGhlIGNhc2Ugb2YgdHJ1bmNhdGlvbilcbiAgICAgIGZvciAobGV0IGkgPSBmcm9tUGFydEluZGV4OyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbm90aWZ5Q2hpbGRyZW5Db25uZWN0ZWRDaGFuZ2VkKHZhbHVlW2ldLCBmYWxzZSk7XG4gICAgICAgIHJlbW92ZURpc2Nvbm5lY3RhYmxlRnJvbVBhcmVudCh2YWx1ZVtpXSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICAvLyBUZW1wbGF0ZUluc3RhbmNlIGNhc2U6IElmIHRoZSB2YWx1ZSBoYXMgZGlzY29ubmVjdGFibGUgY2hpbGRyZW4gKHdpbGxcbiAgICAgIC8vIG9ubHkgYmUgaW4gdGhlIGNhc2UgdGhhdCBpdCBpcyBhIFRlbXBsYXRlSW5zdGFuY2UpLCB3ZSBkaXNjb25uZWN0IGl0XG4gICAgICAvLyBhbmQgcmVtb3ZlIGl0IGZyb20gdGhpcyBDaGlsZFBhcnQncyBkaXNjb25uZWN0YWJsZSBjaGlsZHJlblxuICAgICAgbm90aWZ5Q2hpbGRyZW5Db25uZWN0ZWRDaGFuZ2VkKHZhbHVlIGFzIERpc2Nvbm5lY3RhYmxlLCBmYWxzZSk7XG4gICAgICByZW1vdmVEaXNjb25uZWN0YWJsZUZyb21QYXJlbnQodmFsdWUgYXMgRGlzY29ubmVjdGFibGUpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBub3RpZnlDaGlsZHJlbkNvbm5lY3RlZENoYW5nZWQodGhpcywgaXNDb25uZWN0ZWQpO1xuICB9XG59XG5cbi8qKlxuICogUGF0Y2hlcyBkaXNjb25uZWN0aW9uIEFQSSBvbnRvIENoaWxkUGFydHMuXG4gKi9cbmNvbnN0IGluc3RhbGxEaXNjb25uZWN0QVBJID0gKG9iajogRGlzY29ubmVjdGFibGUpID0+IHtcbiAgaWYgKChvYmogYXMgQ2hpbGRQYXJ0KS50eXBlID09IFBhcnRUeXBlLkNISUxEKSB7XG4gICAgKG9iaiBhcyBDaGlsZFBhcnQpLl8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQgPz89XG4gICAgICBub3RpZnlDaGlsZFBhcnRDb25uZWN0ZWRDaGFuZ2VkO1xuICAgIChvYmogYXMgQ2hpbGRQYXJ0KS5fJHJlcGFyZW50RGlzY29ubmVjdGFibGVzID8/PSByZXBhcmVudERpc2Nvbm5lY3RhYmxlcztcbiAgfVxufTtcblxuLyoqXG4gKiBBbiBhYnN0cmFjdCBgRGlyZWN0aXZlYCBiYXNlIGNsYXNzIHdob3NlIGBkaXNjb25uZWN0ZWRgIG1ldGhvZCB3aWxsIGJlXG4gKiBjYWxsZWQgd2hlbiB0aGUgcGFydCBjb250YWluaW5nIHRoZSBkaXJlY3RpdmUgaXMgY2xlYXJlZCBhcyBhIHJlc3VsdCBvZlxuICogcmUtcmVuZGVyaW5nLCBvciB3aGVuIHRoZSB1c2VyIGNhbGxzIGBwYXJ0LnNldENvbm5lY3RlZChmYWxzZSlgIG9uXG4gKiBhIHBhcnQgdGhhdCB3YXMgcHJldmlvdXNseSByZW5kZXJlZCBjb250YWluaW5nIHRoZSBkaXJlY3RpdmUgKGFzIGhhcHBlbnNcbiAqIHdoZW4gZS5nLiBhIExpdEVsZW1lbnQgZGlzY29ubmVjdHMgZnJvbSB0aGUgRE9NKS5cbiAqXG4gKiBJZiBgcGFydC5zZXRDb25uZWN0ZWQodHJ1ZSlgIGlzIHN1YnNlcXVlbnRseSBjYWxsZWQgb24gYVxuICogY29udGFpbmluZyBwYXJ0LCB0aGUgZGlyZWN0aXZlJ3MgYHJlY29ubmVjdGVkYCBtZXRob2Qgd2lsbCBiZSBjYWxsZWQgcHJpb3JcbiAqIHRvIGl0cyBuZXh0IGB1cGRhdGVgL2ByZW5kZXJgIGNhbGxiYWNrcy4gV2hlbiBpbXBsZW1lbnRpbmcgYGRpc2Nvbm5lY3RlZGAsXG4gKiBgcmVjb25uZWN0ZWRgIHNob3VsZCBhbHNvIGJlIGltcGxlbWVudGVkIHRvIGJlIGNvbXBhdGlibGUgd2l0aCByZWNvbm5lY3Rpb24uXG4gKlxuICogTm90ZSB0aGF0IHVwZGF0ZXMgbWF5IG9jY3VyIHdoaWxlIHRoZSBkaXJlY3RpdmUgaXMgZGlzY29ubmVjdGVkLiBBcyBzdWNoLFxuICogZGlyZWN0aXZlcyBzaG91bGQgZ2VuZXJhbGx5IGNoZWNrIHRoZSBgdGhpcy5pc0Nvbm5lY3RlZGAgZmxhZyBkdXJpbmdcbiAqIHJlbmRlci91cGRhdGUgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgaXQgaXMgc2FmZSB0byBzdWJzY3JpYmUgdG8gcmVzb3VyY2VzXG4gKiB0aGF0IG1heSBwcmV2ZW50IGdhcmJhZ2UgY29sbGVjdGlvbi5cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFzeW5jRGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgLy8gQXMgb3Bwb3NlZCB0byBvdGhlciBEaXNjb25uZWN0YWJsZXMsIEFzeW5jRGlyZWN0aXZlcyBhbHdheXMgZ2V0IG5vdGlmaWVkXG4gIC8vIHdoZW4gdGhlIFJvb3RQYXJ0IGNvbm5lY3Rpb24gY2hhbmdlcywgc28gdGhlIHB1YmxpYyBgaXNDb25uZWN0ZWRgXG4gIC8vIGlzIGEgbG9jYWxseSBzdG9yZWQgdmFyaWFibGUgaW5pdGlhbGl6ZWQgdmlhIGl0cyBwYXJ0J3MgZ2V0dGVyIGFuZCBzeW5jZWRcbiAgLy8gdmlhIGBfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkYC4gVGhpcyBpcyBjaGVhcGVyIHRoYW4gdXNpbmdcbiAgLy8gdGhlIF8kaXNDb25uZWN0ZWQgZ2V0dGVyLCB3aGljaCBoYXMgdG8gbG9vayBiYWNrIHVwIHRoZSB0cmVlIGVhY2ggdGltZS5cbiAgLyoqXG4gICAqIFRoZSBjb25uZWN0aW9uIHN0YXRlIGZvciB0aGlzIERpcmVjdGl2ZS5cbiAgICovXG4gIGlzQ29ubmVjdGVkITogYm9vbGVhbjtcblxuICAvLyBAaW50ZXJuYWxcbiAgb3ZlcnJpZGUgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuPzogU2V0PERpc2Nvbm5lY3RhYmxlPiA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEluaXRpYWxpemUgdGhlIHBhcnQgd2l0aCBpbnRlcm5hbCBmaWVsZHNcbiAgICogQHBhcmFtIHBhcnRcbiAgICogQHBhcmFtIHBhcmVudFxuICAgKiBAcGFyYW0gYXR0cmlidXRlSW5kZXhcbiAgICovXG4gIG92ZXJyaWRlIF8kaW5pdGlhbGl6ZShcbiAgICBwYXJ0OiBQYXJ0LFxuICAgIHBhcmVudDogRGlzY29ubmVjdGFibGUsXG4gICAgYXR0cmlidXRlSW5kZXg6IG51bWJlciB8IHVuZGVmaW5lZFxuICApIHtcbiAgICBzdXBlci5fJGluaXRpYWxpemUocGFydCwgcGFyZW50LCBhdHRyaWJ1dGVJbmRleCk7XG4gICAgYWRkRGlzY29ubmVjdGFibGVUb1BhcmVudCh0aGlzKTtcbiAgICB0aGlzLmlzQ29ubmVjdGVkID0gcGFydC5fJGlzQ29ubmVjdGVkO1xuICB9XG4gIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gIC8qKlxuICAgKiBDYWxsZWQgZnJvbSB0aGUgY29yZSBjb2RlIHdoZW4gYSBkaXJlY3RpdmUgaXMgZ29pbmcgYXdheSBmcm9tIGEgcGFydCAoaW5cbiAgICogd2hpY2ggY2FzZSBgc2hvdWxkUmVtb3ZlRnJvbVBhcmVudGAgc2hvdWxkIGJlIHRydWUpLCBhbmQgZnJvbSB0aGVcbiAgICogYHNldENoaWxkcmVuQ29ubmVjdGVkYCBoZWxwZXIgZnVuY3Rpb24gd2hlbiByZWN1cnNpdmVseSBjaGFuZ2luZyB0aGVcbiAgICogY29ubmVjdGlvbiBzdGF0ZSBvZiBhIHRyZWUgKGluIHdoaWNoIGNhc2UgYHNob3VsZFJlbW92ZUZyb21QYXJlbnRgIHNob3VsZFxuICAgKiBiZSBmYWxzZSkuXG4gICAqXG4gICAqIEBwYXJhbSBpc0Nvbm5lY3RlZFxuICAgKiBAcGFyYW0gaXNDbGVhcmluZ0RpcmVjdGl2ZSAtIFRydWUgd2hlbiB0aGUgZGlyZWN0aXZlIGl0c2VsZiBpcyBiZWluZ1xuICAgKiAgICAgcmVtb3ZlZDsgZmFsc2Ugd2hlbiB0aGUgdHJlZSBpcyBiZWluZyBkaXNjb25uZWN0ZWRcbiAgICogQGludGVybmFsXG4gICAqL1xuICBvdmVycmlkZSBbJ18kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWQnXShcbiAgICBpc0Nvbm5lY3RlZDogYm9vbGVhbixcbiAgICBpc0NsZWFyaW5nRGlyZWN0aXZlID0gdHJ1ZVxuICApIHtcbiAgICBpZiAoaXNDb25uZWN0ZWQgIT09IHRoaXMuaXNDb25uZWN0ZWQpIHtcbiAgICAgIHRoaXMuaXNDb25uZWN0ZWQgPSBpc0Nvbm5lY3RlZDtcbiAgICAgIGlmIChpc0Nvbm5lY3RlZCkge1xuICAgICAgICB0aGlzLnJlY29ubmVjdGVkPy4oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZGlzY29ubmVjdGVkPy4oKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlzQ2xlYXJpbmdEaXJlY3RpdmUpIHtcbiAgICAgIG5vdGlmeUNoaWxkcmVuQ29ubmVjdGVkQ2hhbmdlZCh0aGlzLCBpc0Nvbm5lY3RlZCk7XG4gICAgICByZW1vdmVEaXNjb25uZWN0YWJsZUZyb21QYXJlbnQodGhpcyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHZhbHVlIG9mIHRoZSBkaXJlY3RpdmUncyBQYXJ0IG91dHNpZGUgdGhlIG5vcm1hbCBgdXBkYXRlYC9gcmVuZGVyYFxuICAgKiBsaWZlY3ljbGUgb2YgYSBkaXJlY3RpdmUuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIHNob3VsZCBub3QgYmUgY2FsbGVkIHN5bmNocm9ub3VzbHkgZnJvbSBhIGRpcmVjdGl2ZSdzIGB1cGRhdGVgXG4gICAqIG9yIGByZW5kZXJgLlxuICAgKlxuICAgKiBAcGFyYW0gZGlyZWN0aXZlIFRoZSBkaXJlY3RpdmUgdG8gdXBkYXRlXG4gICAqIEBwYXJhbSB2YWx1ZSBUaGUgdmFsdWUgdG8gc2V0XG4gICAqL1xuICBzZXRWYWx1ZSh2YWx1ZTogdW5rbm93bikge1xuICAgIGlmIChpc1NpbmdsZUV4cHJlc3Npb24odGhpcy5fX3BhcnQgYXMgdW5rbm93biBhcyBQYXJ0SW5mbykpIHtcbiAgICAgIHRoaXMuX19wYXJ0Ll8kc2V0VmFsdWUodmFsdWUsIHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyB0aGlzLl9fYXR0cmlidXRlSW5kZXggd2lsbCBiZSBkZWZpbmVkIGluIHRoaXMgY2FzZSwgYnV0XG4gICAgICAvLyBhc3NlcnQgaXQgaW4gZGV2IG1vZGVcbiAgICAgIGlmIChERVZfTU9ERSAmJiB0aGlzLl9fYXR0cmlidXRlSW5kZXggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIHRoaXMuX19hdHRyaWJ1dGVJbmRleCB0byBiZSBhIG51bWJlcmApO1xuICAgICAgfVxuICAgICAgY29uc3QgbmV3VmFsdWVzID0gWy4uLih0aGlzLl9fcGFydC5fJGNvbW1pdHRlZFZhbHVlIGFzIEFycmF5PHVua25vd24+KV07XG4gICAgICBuZXdWYWx1ZXNbdGhpcy5fX2F0dHJpYnV0ZUluZGV4IV0gPSB2YWx1ZTtcbiAgICAgICh0aGlzLl9fcGFydCBhcyBBdHRyaWJ1dGVQYXJ0KS5fJHNldFZhbHVlKG5ld1ZhbHVlcywgdGhpcywgMCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFVzZXIgY2FsbGJhY2tzIGZvciBpbXBsZW1lbnRpbmcgbG9naWMgdG8gcmVsZWFzZSBhbnkgcmVzb3VyY2VzL3N1YnNjcmlwdGlvbnNcbiAgICogdGhhdCBtYXkgaGF2ZSBiZWVuIHJldGFpbmVkIGJ5IHRoaXMgZGlyZWN0aXZlLiBTaW5jZSBkaXJlY3RpdmVzIG1heSBhbHNvIGJlXG4gICAqIHJlLWNvbm5lY3RlZCwgYHJlY29ubmVjdGVkYCBzaG91bGQgYWxzbyBiZSBpbXBsZW1lbnRlZCB0byByZXN0b3JlIHRoZVxuICAgKiB3b3JraW5nIHN0YXRlIG9mIHRoZSBkaXJlY3RpdmUgcHJpb3IgdG8gdGhlIG5leHQgcmVuZGVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGRpc2Nvbm5lY3RlZCgpIHt9XG4gIHByb3RlY3RlZCByZWNvbm5lY3RlZCgpIHt9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cbmltcG9ydCB7bm90aGluZywgRWxlbWVudFBhcnR9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7ZGlyZWN0aXZlLCBBc3luY0RpcmVjdGl2ZX0gZnJvbSAnLi4vYXN5bmMtZGlyZWN0aXZlLmpzJztcblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IFJlZiBvYmplY3QsIHdoaWNoIGlzIGNvbnRhaW5lciBmb3IgYSByZWZlcmVuY2UgdG8gYW4gZWxlbWVudC5cbiAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZVJlZiA9IDxUID0gRWxlbWVudD4oKSA9PiBuZXcgUmVmPFQ+KCk7XG5cbi8qKlxuICogQW4gb2JqZWN0IHRoYXQgaG9sZHMgYSByZWYgdmFsdWUuXG4gKi9cbmNsYXNzIFJlZjxUID0gRWxlbWVudD4ge1xuICAvKipcbiAgICogVGhlIGN1cnJlbnQgRWxlbWVudCB2YWx1ZSBvZiB0aGUgcmVmLCBvciBlbHNlIGB1bmRlZmluZWRgIGlmIHRoZSByZWYgaXMgbm9cbiAgICogbG9uZ2VyIHJlbmRlcmVkLlxuICAgKi9cbiAgcmVhZG9ubHkgdmFsdWU/OiBUO1xufVxuXG5leHBvcnQgdHlwZSB7UmVmfTtcblxuaW50ZXJmYWNlIFJlZkludGVybmFsIHtcbiAgdmFsdWU6IEVsZW1lbnQgfCB1bmRlZmluZWQ7XG59XG5cbi8vIFdoZW4gY2FsbGJhY2tzIGFyZSB1c2VkIGZvciByZWZzLCB0aGlzIG1hcCB0cmFja3MgdGhlIGxhc3QgdmFsdWUgdGhlIGNhbGxiYWNrXG4vLyB3YXMgY2FsbGVkIHdpdGgsIGZvciBlbnN1cmluZyBhIGRpcmVjdGl2ZSBkb2Vzbid0IGNsZWFyIHRoZSByZWYgaWYgdGhlIHJlZlxuLy8gaGFzIGFscmVhZHkgYmVlbiByZW5kZXJlZCB0byBhIG5ldyBzcG90LiBJdCBpcyBkb3VibGUta2V5ZWQgb24gYm90aCB0aGVcbi8vIGNvbnRleHQgKGBvcHRpb25zLmhvc3RgKSBhbmQgdGhlIGNhbGxiYWNrLCBzaW5jZSB3ZSBhdXRvLWJpbmQgY2xhc3MgbWV0aG9kc1xuLy8gdG8gYG9wdGlvbnMuaG9zdGAuXG5jb25zdCBsYXN0RWxlbWVudEZvckNvbnRleHRBbmRDYWxsYmFjazogV2Vha01hcDxcbiAgb2JqZWN0LFxuICBXZWFrTWFwPEZ1bmN0aW9uLCBFbGVtZW50IHwgdW5kZWZpbmVkPlxuPiA9IG5ldyBXZWFrTWFwKCk7XG5cbmV4cG9ydCB0eXBlIFJlZk9yQ2FsbGJhY2sgPSBSZWYgfCAoKGVsOiBFbGVtZW50IHwgdW5kZWZpbmVkKSA9PiB2b2lkKTtcblxuY2xhc3MgUmVmRGlyZWN0aXZlIGV4dGVuZHMgQXN5bmNEaXJlY3RpdmUge1xuICBwcml2YXRlIF9lbGVtZW50PzogRWxlbWVudDtcbiAgcHJpdmF0ZSBfcmVmPzogUmVmT3JDYWxsYmFjaztcbiAgcHJpdmF0ZSBfY29udGV4dD86IG9iamVjdDtcblxuICByZW5kZXIoX3JlZjogUmVmT3JDYWxsYmFjaykge1xuICAgIHJldHVybiBub3RoaW5nO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IEVsZW1lbnRQYXJ0LCBbcmVmXTogUGFyYW1ldGVyczx0aGlzWydyZW5kZXInXT4pIHtcbiAgICBjb25zdCByZWZDaGFuZ2VkID0gcmVmICE9PSB0aGlzLl9yZWY7XG4gICAgaWYgKHJlZkNoYW5nZWQgJiYgdGhpcy5fcmVmICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIFRoZSByZWYgcGFzc2VkIHRvIHRoZSBkaXJlY3RpdmUgaGFzIGNoYW5nZWQ7XG4gICAgICAvLyB1bnNldCB0aGUgcHJldmlvdXMgcmVmJ3MgdmFsdWVcbiAgICAgIHRoaXMuX3VwZGF0ZVJlZlZhbHVlKHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIGlmIChyZWZDaGFuZ2VkIHx8IHRoaXMuX2xhc3RFbGVtZW50Rm9yUmVmICE9PSB0aGlzLl9lbGVtZW50KSB7XG4gICAgICAvLyBXZSBlaXRoZXIgZ290IGEgbmV3IHJlZiBvciB0aGlzIGlzIHRoZSBmaXJzdCByZW5kZXI7XG4gICAgICAvLyBzdG9yZSB0aGUgcmVmL2VsZW1lbnQgJiB1cGRhdGUgdGhlIHJlZiB2YWx1ZVxuICAgICAgdGhpcy5fcmVmID0gcmVmO1xuICAgICAgdGhpcy5fY29udGV4dCA9IHBhcnQub3B0aW9ucz8uaG9zdDtcbiAgICAgIHRoaXMuX3VwZGF0ZVJlZlZhbHVlKCh0aGlzLl9lbGVtZW50ID0gcGFydC5lbGVtZW50KSk7XG4gICAgfVxuICAgIHJldHVybiBub3RoaW5nO1xuICB9XG5cbiAgcHJpdmF0ZSBfdXBkYXRlUmVmVmFsdWUoZWxlbWVudDogRWxlbWVudCB8IHVuZGVmaW5lZCkge1xuICAgIGlmICh0eXBlb2YgdGhpcy5fcmVmID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAvLyBJZiB0aGUgY3VycmVudCByZWYgd2FzIGNhbGxlZCB3aXRoIGEgcHJldmlvdXMgdmFsdWUsIGNhbGwgd2l0aFxuICAgICAgLy8gYHVuZGVmaW5lZGA7IFdlIGRvIHRoaXMgdG8gZW5zdXJlIGNhbGxiYWNrcyBhcmUgY2FsbGVkIGluIGEgY29uc2lzdGVudFxuICAgICAgLy8gd2F5IHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciBhIHJlZiBtaWdodCBiZSBtb3ZpbmcgdXAgaW4gdGhlIHRyZWUgKGluXG4gICAgICAvLyB3aGljaCBjYXNlIGl0IHdvdWxkIG90aGVyd2lzZSBiZSBjYWxsZWQgd2l0aCB0aGUgbmV3IHZhbHVlIGJlZm9yZSB0aGVcbiAgICAgIC8vIHByZXZpb3VzIG9uZSB1bnNldHMgaXQpIGFuZCBkb3duIGluIHRoZSB0cmVlICh3aGVyZSBpdCB3b3VsZCBiZSB1bnNldFxuICAgICAgLy8gYmVmb3JlIGJlaW5nIHNldCkuIE5vdGUgdGhhdCBlbGVtZW50IGxvb2t1cCBpcyBrZXllZCBieVxuICAgICAgLy8gYm90aCB0aGUgY29udGV4dCBhbmQgdGhlIGNhbGxiYWNrLCBzaW5jZSB3ZSBhbGxvdyBwYXNzaW5nIHVuYm91bmRcbiAgICAgIC8vIGZ1bmN0aW9ucyB0aGF0IGFyZSBjYWxsZWQgb24gb3B0aW9ucy5ob3N0LCBhbmQgd2Ugd2FudCB0byB0cmVhdFxuICAgICAgLy8gdGhlc2UgYXMgdW5pcXVlIFwiaW5zdGFuY2VzXCIgb2YgYSBmdW5jdGlvbi5cbiAgICAgIGNvbnN0IGNvbnRleHQgPSB0aGlzLl9jb250ZXh0ID8/IGdsb2JhbFRoaXM7XG4gICAgICBsZXQgbGFzdEVsZW1lbnRGb3JDYWxsYmFjayA9XG4gICAgICAgIGxhc3RFbGVtZW50Rm9yQ29udGV4dEFuZENhbGxiYWNrLmdldChjb250ZXh0KTtcbiAgICAgIGlmIChsYXN0RWxlbWVudEZvckNhbGxiYWNrID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbGFzdEVsZW1lbnRGb3JDYWxsYmFjayA9IG5ldyBXZWFrTWFwKCk7XG4gICAgICAgIGxhc3RFbGVtZW50Rm9yQ29udGV4dEFuZENhbGxiYWNrLnNldChjb250ZXh0LCBsYXN0RWxlbWVudEZvckNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIGlmIChsYXN0RWxlbWVudEZvckNhbGxiYWNrLmdldCh0aGlzLl9yZWYpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fcmVmLmNhbGwodGhpcy5fY29udGV4dCwgdW5kZWZpbmVkKTtcbiAgICAgIH1cbiAgICAgIGxhc3RFbGVtZW50Rm9yQ2FsbGJhY2suc2V0KHRoaXMuX3JlZiwgZWxlbWVudCk7XG4gICAgICAvLyBDYWxsIHRoZSByZWYgd2l0aCB0aGUgbmV3IGVsZW1lbnQgdmFsdWVcbiAgICAgIGlmIChlbGVtZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fcmVmLmNhbGwodGhpcy5fY29udGV4dCwgZWxlbWVudCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICh0aGlzLl9yZWYgYXMgUmVmSW50ZXJuYWwpIS52YWx1ZSA9IGVsZW1lbnQ7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXQgX2xhc3RFbGVtZW50Rm9yUmVmKCkge1xuICAgIHJldHVybiB0eXBlb2YgdGhpcy5fcmVmID09PSAnZnVuY3Rpb24nXG4gICAgICA/IGxhc3RFbGVtZW50Rm9yQ29udGV4dEFuZENhbGxiYWNrXG4gICAgICAgICAgLmdldCh0aGlzLl9jb250ZXh0ID8/IGdsb2JhbFRoaXMpXG4gICAgICAgICAgPy5nZXQodGhpcy5fcmVmKVxuICAgICAgOiB0aGlzLl9yZWY/LnZhbHVlO1xuICB9XG5cbiAgb3ZlcnJpZGUgZGlzY29ubmVjdGVkKCkge1xuICAgIC8vIE9ubHkgY2xlYXIgdGhlIGJveCBpZiBvdXIgZWxlbWVudCBpcyBzdGlsbCB0aGUgb25lIGluIGl0IChpLmUuIGFub3RoZXJcbiAgICAvLyBkaXJlY3RpdmUgaW5zdGFuY2UgaGFzbid0IHJlbmRlcmVkIGl0cyBlbGVtZW50IHRvIGl0IGJlZm9yZSB1cyk7IHRoYXRcbiAgICAvLyBvbmx5IGhhcHBlbnMgaW4gdGhlIGV2ZW50IG9mIHRoZSBkaXJlY3RpdmUgYmVpbmcgY2xlYXJlZCAobm90IHZpYSBtYW51YWxcbiAgICAvLyBkaXNjb25uZWN0aW9uKVxuICAgIGlmICh0aGlzLl9sYXN0RWxlbWVudEZvclJlZiA9PT0gdGhpcy5fZWxlbWVudCkge1xuICAgICAgdGhpcy5fdXBkYXRlUmVmVmFsdWUodW5kZWZpbmVkKTtcbiAgICB9XG4gIH1cblxuICBvdmVycmlkZSByZWNvbm5lY3RlZCgpIHtcbiAgICAvLyBJZiB3ZSB3ZXJlIG1hbnVhbGx5IGRpc2Nvbm5lY3RlZCwgd2UgY2FuIHNhZmVseSBwdXQgb3VyIGVsZW1lbnQgYmFjayBpblxuICAgIC8vIHRoZSBib3gsIHNpbmNlIG5vIHJlbmRlcmluZyBjb3VsZCBoYXZlIG9jY3VycmVkIHRvIGNoYW5nZSBpdHMgc3RhdGVcbiAgICB0aGlzLl91cGRhdGVSZWZWYWx1ZSh0aGlzLl9lbGVtZW50KTtcbiAgfVxufVxuXG4vKipcbiAqIFNldHMgdGhlIHZhbHVlIG9mIGEgUmVmIG9iamVjdCBvciBjYWxscyBhIHJlZiBjYWxsYmFjayB3aXRoIHRoZSBlbGVtZW50IGl0J3NcbiAqIGJvdW5kIHRvLlxuICpcbiAqIEEgUmVmIG9iamVjdCBhY3RzIGFzIGEgY29udGFpbmVyIGZvciBhIHJlZmVyZW5jZSB0byBhbiBlbGVtZW50LiBBIHJlZlxuICogY2FsbGJhY2sgaXMgYSBmdW5jdGlvbiB0aGF0IHRha2VzIGFuIGVsZW1lbnQgYXMgaXRzIG9ubHkgYXJndW1lbnQuXG4gKlxuICogVGhlIHJlZiBkaXJlY3RpdmUgc2V0cyB0aGUgdmFsdWUgb2YgdGhlIFJlZiBvYmplY3Qgb3IgY2FsbHMgdGhlIHJlZiBjYWxsYmFja1xuICogZHVyaW5nIHJlbmRlcmluZywgaWYgdGhlIHJlZmVyZW5jZWQgZWxlbWVudCBjaGFuZ2VkLlxuICpcbiAqIE5vdGU6IElmIGEgcmVmIGNhbGxiYWNrIGlzIHJlbmRlcmVkIHRvIGEgZGlmZmVyZW50IGVsZW1lbnQgcG9zaXRpb24gb3IgaXNcbiAqIHJlbW92ZWQgaW4gYSBzdWJzZXF1ZW50IHJlbmRlciwgaXQgd2lsbCBmaXJzdCBiZSBjYWxsZWQgd2l0aCBgdW5kZWZpbmVkYCxcbiAqIGZvbGxvd2VkIGJ5IGFub3RoZXIgY2FsbCB3aXRoIHRoZSBuZXcgZWxlbWVudCBpdCB3YXMgcmVuZGVyZWQgdG8gKGlmIGFueSkuXG4gKlxuICogYGBganNcbiAqIC8vIFVzaW5nIFJlZiBvYmplY3RcbiAqIGNvbnN0IGlucHV0UmVmID0gY3JlYXRlUmVmKCk7XG4gKiByZW5kZXIoaHRtbGA8aW5wdXQgJHtyZWYoaW5wdXRSZWYpfT5gLCBjb250YWluZXIpO1xuICogaW5wdXRSZWYudmFsdWUuZm9jdXMoKTtcbiAqXG4gKiAvLyBVc2luZyBjYWxsYmFja1xuICogY29uc3QgY2FsbGJhY2sgPSAoaW5wdXRFbGVtZW50KSA9PiBpbnB1dEVsZW1lbnQuZm9jdXMoKTtcbiAqIHJlbmRlcihodG1sYDxpbnB1dCAke3JlZihjYWxsYmFjayl9PmAsIGNvbnRhaW5lcik7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHJlZiA9IGRpcmVjdGl2ZShSZWZEaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge1JlZkRpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLy8gTm90ZSwgdGhpcyBtb2R1bGUgaXMgbm90IGluY2x1ZGVkIGluIHBhY2thZ2UgZXhwb3J0cyBzbyB0aGF0IGl0J3MgcHJpdmF0ZSB0b1xuLy8gb3VyIGZpcnN0LXBhcnR5IGRpcmVjdGl2ZXMuIElmIGl0IGVuZHMgdXAgYmVpbmcgdXNlZnVsLCB3ZSBjYW4gb3BlbiBpdCB1cCBhbmRcbi8vIGV4cG9ydCBpdC5cblxuLyoqXG4gKiBIZWxwZXIgdG8gaXRlcmF0ZSBhbiBBc3luY0l0ZXJhYmxlIGluIGl0cyBvd24gY2xvc3VyZS5cbiAqIEBwYXJhbSBpdGVyYWJsZSBUaGUgaXRlcmFibGUgdG8gaXRlcmF0ZVxuICogQHBhcmFtIGNhbGxiYWNrIFRoZSBjYWxsYmFjayB0byBjYWxsIGZvciBlYWNoIHZhbHVlLiBJZiB0aGUgY2FsbGJhY2sgcmV0dXJuc1xuICogYGZhbHNlYCwgdGhlIGxvb3Agd2lsbCBiZSBicm9rZW4uXG4gKi9cbmV4cG9ydCBjb25zdCBmb3JBd2FpdE9mID0gYXN5bmMgPFQ+KFxuICBpdGVyYWJsZTogQXN5bmNJdGVyYWJsZTxUPixcbiAgY2FsbGJhY2s6ICh2YWx1ZTogVCkgPT4gUHJvbWlzZTxib29sZWFuPlxuKSA9PiB7XG4gIGZvciBhd2FpdCAoY29uc3QgdiBvZiBpdGVyYWJsZSkge1xuICAgIGlmICgoYXdhaXQgY2FsbGJhY2sodikpID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBIb2xkcyBhIHJlZmVyZW5jZSB0byBhbiBpbnN0YW5jZSB0aGF0IGNhbiBiZSBkaXNjb25uZWN0ZWQgYW5kIHJlY29ubmVjdGVkLFxuICogc28gdGhhdCBhIGNsb3N1cmUgb3ZlciB0aGUgcmVmIChlLmcuIGluIGEgdGhlbiBmdW5jdGlvbiB0byBhIHByb21pc2UpIGRvZXNcbiAqIG5vdCBzdHJvbmdseSBob2xkIGEgcmVmIHRvIHRoZSBpbnN0YW5jZS4gQXBwcm94aW1hdGVzIGEgV2Vha1JlZiBidXQgbXVzdFxuICogYmUgbWFudWFsbHkgY29ubmVjdGVkICYgZGlzY29ubmVjdGVkIHRvIHRoZSBiYWNraW5nIGluc3RhbmNlLlxuICovXG5leHBvcnQgY2xhc3MgUHNldWRvV2Vha1JlZjxUPiB7XG4gIHByaXZhdGUgX3JlZj86IFQ7XG4gIGNvbnN0cnVjdG9yKHJlZjogVCkge1xuICAgIHRoaXMuX3JlZiA9IHJlZjtcbiAgfVxuICAvKipcbiAgICogRGlzYXNzb2NpYXRlcyB0aGUgcmVmIHdpdGggdGhlIGJhY2tpbmcgaW5zdGFuY2UuXG4gICAqL1xuICBkaXNjb25uZWN0KCkge1xuICAgIHRoaXMuX3JlZiA9IHVuZGVmaW5lZDtcbiAgfVxuICAvKipcbiAgICogUmVhc3NvY2lhdGVzIHRoZSByZWYgd2l0aCB0aGUgYmFja2luZyBpbnN0YW5jZS5cbiAgICovXG4gIHJlY29ubmVjdChyZWY6IFQpIHtcbiAgICB0aGlzLl9yZWYgPSByZWY7XG4gIH1cbiAgLyoqXG4gICAqIFJldHJpZXZlcyB0aGUgYmFja2luZyBpbnN0YW5jZSAod2lsbCBiZSB1bmRlZmluZWQgd2hlbiBkaXNjb25uZWN0ZWQpXG4gICAqL1xuICBkZXJlZigpIHtcbiAgICByZXR1cm4gdGhpcy5fcmVmO1xuICB9XG59XG5cbi8qKlxuICogQSBoZWxwZXIgdG8gcGF1c2UgYW5kIHJlc3VtZSB3YWl0aW5nIG9uIGEgY29uZGl0aW9uIGluIGFuIGFzeW5jIGZ1bmN0aW9uXG4gKi9cbmV4cG9ydCBjbGFzcyBQYXVzZXIge1xuICBwcml2YXRlIF9wcm9taXNlPzogUHJvbWlzZTx2b2lkPiA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfcmVzb2x2ZT86ICgpID0+IHZvaWQgPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBXaGVuIHBhdXNlZCwgcmV0dXJucyBhIHByb21pc2UgdG8gYmUgYXdhaXRlZDsgd2hlbiB1bnBhdXNlZCwgcmV0dXJuc1xuICAgKiB1bmRlZmluZWQuIE5vdGUgdGhhdCBpbiB0aGUgbWljcm90YXNrIGJldHdlZW4gdGhlIHBhdXNlciBiZWluZyByZXN1bWVkXG4gICAqIGFuIGFuIGF3YWl0IG9mIHRoaXMgcHJvbWlzZSByZXNvbHZpbmcsIHRoZSBwYXVzZXIgY291bGQgYmUgcGF1c2VkIGFnYWluLFxuICAgKiBoZW5jZSBjYWxsZXJzIHNob3VsZCBjaGVjayB0aGUgcHJvbWlzZSBpbiBhIGxvb3Agd2hlbiBhd2FpdGluZy5cbiAgICogQHJldHVybnMgQSBwcm9taXNlIHRvIGJlIGF3YWl0ZWQgd2hlbiBwYXVzZWQgb3IgdW5kZWZpbmVkXG4gICAqL1xuICBnZXQoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Byb21pc2U7XG4gIH1cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBwcm9taXNlIHRvIGJlIGF3YWl0ZWRcbiAgICovXG4gIHBhdXNlKCkge1xuICAgIHRoaXMuX3Byb21pc2UgPz89IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiAodGhpcy5fcmVzb2x2ZSA9IHJlc29sdmUpKTtcbiAgfVxuICAvKipcbiAgICogUmVzb2x2ZXMgdGhlIHByb21pc2Ugd2hpY2ggbWF5IGJlIGF3YWl0ZWRcbiAgICovXG4gIHJlc3VtZSgpIHtcbiAgICB0aGlzLl9yZXNvbHZlPy4oKTtcbiAgICB0aGlzLl9wcm9taXNlID0gdGhpcy5fcmVzb2x2ZSA9IHVuZGVmaW5lZDtcbiAgfVxufVxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7Q2hpbGRQYXJ0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgQXN5bmNEaXJlY3RpdmUsXG4gIGRpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbn0gZnJvbSAnLi4vYXN5bmMtZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7UGF1c2VyLCBQc2V1ZG9XZWFrUmVmLCBmb3JBd2FpdE9mfSBmcm9tICcuL3ByaXZhdGUtYXN5bmMtaGVscGVycy5qcyc7XG5cbnR5cGUgTWFwcGVyPFQ+ID0gKHY6IFQsIGluZGV4PzogbnVtYmVyKSA9PiB1bmtub3duO1xuXG5leHBvcnQgY2xhc3MgQXN5bmNSZXBsYWNlRGlyZWN0aXZlIGV4dGVuZHMgQXN5bmNEaXJlY3RpdmUge1xuICBwcml2YXRlIF9fdmFsdWU/OiBBc3luY0l0ZXJhYmxlPHVua25vd24+O1xuICBwcml2YXRlIF9fd2Vha1RoaXMgPSBuZXcgUHNldWRvV2Vha1JlZih0aGlzKTtcbiAgcHJpdmF0ZSBfX3BhdXNlciA9IG5ldyBQYXVzZXIoKTtcblxuICAvLyBAdHMtZXhwZWN0LWVycm9yIHZhbHVlIG5vdCB1c2VkLCBidXQgd2Ugd2FudCBhIG5pY2UgcGFyYW1ldGVyIGZvciBkb2NzXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgcmVuZGVyPFQ+KHZhbHVlOiBBc3luY0l0ZXJhYmxlPFQ+LCBfbWFwcGVyPzogTWFwcGVyPFQ+KSB7XG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKFxuICAgIF9wYXJ0OiBDaGlsZFBhcnQsXG4gICAgW3ZhbHVlLCBtYXBwZXJdOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+XG4gICkge1xuICAgIC8vIElmIG91ciBpbml0aWFsIHJlbmRlciBvY2N1cnMgd2hpbGUgZGlzY29ubmVjdGVkLCBlbnN1cmUgdGhhdCB0aGUgcGF1c2VyXG4gICAgLy8gYW5kIHdlYWtUaGlzIGFyZSBpbiB0aGUgZGlzY29ubmVjdGVkIHN0YXRlXG4gICAgaWYgKCF0aGlzLmlzQ29ubmVjdGVkKSB7XG4gICAgICB0aGlzLmRpc2Nvbm5lY3RlZCgpO1xuICAgIH1cbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IHNldCB1cCB0aGlzIHBhcnRpY3VsYXIgaXRlcmFibGUsIHdlIGRvbid0IG5lZWRcbiAgICAvLyB0byBkbyBhbnl0aGluZy5cbiAgICBpZiAodmFsdWUgPT09IHRoaXMuX192YWx1ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9fdmFsdWUgPSB2YWx1ZTtcbiAgICBsZXQgaSA9IDA7XG4gICAgY29uc3Qge19fd2Vha1RoaXM6IHdlYWtUaGlzLCBfX3BhdXNlcjogcGF1c2VyfSA9IHRoaXM7XG4gICAgLy8gTm90ZSwgdGhlIGNhbGxiYWNrIGF2b2lkcyBjbG9zaW5nIG92ZXIgYHRoaXNgIHNvIHRoYXQgdGhlIGRpcmVjdGl2ZVxuICAgIC8vIGNhbiBiZSBnYydlZCBiZWZvcmUgdGhlIHByb21pc2UgcmVzb2x2ZXM7IGluc3RlYWQgYHRoaXNgIGlzIHJldHJpZXZlZFxuICAgIC8vIGZyb20gYHdlYWtUaGlzYCwgd2hpY2ggY2FuIGJyZWFrIHRoZSBoYXJkIHJlZmVyZW5jZSBpbiB0aGUgY2xvc3VyZSB3aGVuXG4gICAgLy8gdGhlIGRpcmVjdGl2ZSBkaXNjb25uZWN0c1xuICAgIGZvckF3YWl0T2YodmFsdWUsIGFzeW5jICh2OiB1bmtub3duKSA9PiB7XG4gICAgICAvLyBUaGUgd2hpbGUgbG9vcCBoZXJlIGhhbmRsZXMgdGhlIGNhc2UgdGhhdCB0aGUgY29ubmVjdGlvbiBzdGF0ZVxuICAgICAgLy8gdGhyYXNoZXMsIGNhdXNpbmcgdGhlIHBhdXNlciB0byByZXN1bWUgYW5kIHRoZW4gZ2V0IHJlLXBhdXNlZFxuICAgICAgd2hpbGUgKHBhdXNlci5nZXQoKSkge1xuICAgICAgICBhd2FpdCBwYXVzZXIuZ2V0KCk7XG4gICAgICB9XG4gICAgICAvLyBJZiB0aGUgY2FsbGJhY2sgZ2V0cyBoZXJlIGFuZCB0aGVyZSBpcyBubyBgdGhpc2AsIGl0IG1lYW5zIHRoYXQgdGhlXG4gICAgICAvLyBkaXJlY3RpdmUgaGFzIGJlZW4gZGlzY29ubmVjdGVkIGFuZCBnYXJiYWdlIGNvbGxlY3RlZCBhbmQgd2UgZG9uJ3RcbiAgICAgIC8vIG5lZWQgdG8gZG8gYW55dGhpbmcgZWxzZVxuICAgICAgY29uc3QgX3RoaXMgPSB3ZWFrVGhpcy5kZXJlZigpO1xuICAgICAgaWYgKF90aGlzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gQ2hlY2sgdG8gbWFrZSBzdXJlIHRoYXQgdmFsdWUgaXMgdGhlIHN0aWxsIHRoZSBjdXJyZW50IHZhbHVlIG9mXG4gICAgICAgIC8vIHRoZSBwYXJ0LCBhbmQgaWYgbm90IGJhaWwgYmVjYXVzZSBhIG5ldyB2YWx1ZSBvd25zIHRoaXMgcGFydFxuICAgICAgICBpZiAoX3RoaXMuX192YWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBcyBhIGNvbnZlbmllbmNlLCBiZWNhdXNlIGZ1bmN0aW9uYWwtcHJvZ3JhbW1pbmctc3R5bGVcbiAgICAgICAgLy8gdHJhbnNmb3JtcyBvZiBpdGVyYWJsZXMgYW5kIGFzeW5jIGl0ZXJhYmxlcyByZXF1aXJlcyBhIGxpYnJhcnksXG4gICAgICAgIC8vIHdlIGFjY2VwdCBhIG1hcHBlciBmdW5jdGlvbi4gVGhpcyBpcyBlc3BlY2lhbGx5IGNvbnZlbmllbnQgZm9yXG4gICAgICAgIC8vIHJlbmRlcmluZyBhIHRlbXBsYXRlIGZvciBlYWNoIGl0ZW0uXG4gICAgICAgIGlmIChtYXBwZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHYgPSBtYXBwZXIodiwgaSk7XG4gICAgICAgIH1cblxuICAgICAgICBfdGhpcy5jb21taXRWYWx1ZSh2LCBpKTtcbiAgICAgICAgaSsrO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG5cbiAgLy8gT3ZlcnJpZGUgcG9pbnQgZm9yIEFzeW5jQXBwZW5kIHRvIGFwcGVuZCByYXRoZXIgdGhhbiByZXBsYWNlXG4gIHByb3RlY3RlZCBjb21taXRWYWx1ZSh2YWx1ZTogdW5rbm93biwgX2luZGV4OiBudW1iZXIpIHtcbiAgICB0aGlzLnNldFZhbHVlKHZhbHVlKTtcbiAgfVxuXG4gIG92ZXJyaWRlIGRpc2Nvbm5lY3RlZCgpIHtcbiAgICB0aGlzLl9fd2Vha1RoaXMuZGlzY29ubmVjdCgpO1xuICAgIHRoaXMuX19wYXVzZXIucGF1c2UoKTtcbiAgfVxuXG4gIG92ZXJyaWRlIHJlY29ubmVjdGVkKCkge1xuICAgIHRoaXMuX193ZWFrVGhpcy5yZWNvbm5lY3QodGhpcyk7XG4gICAgdGhpcy5fX3BhdXNlci5yZXN1bWUoKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgZGlyZWN0aXZlIHRoYXQgcmVuZGVycyB0aGUgaXRlbXMgb2YgYW4gYXN5bmMgaXRlcmFibGVbMV0sIHJlcGxhY2luZ1xuICogcHJldmlvdXMgdmFsdWVzIHdpdGggbmV3IHZhbHVlcywgc28gdGhhdCBvbmx5IG9uZSB2YWx1ZSBpcyBldmVyIHJlbmRlcmVkXG4gKiBhdCBhIHRpbWUuIFRoaXMgZGlyZWN0aXZlIG1heSBiZSB1c2VkIGluIGFueSBleHByZXNzaW9uIHR5cGUuXG4gKlxuICogQXN5bmMgaXRlcmFibGVzIGFyZSBvYmplY3RzIHdpdGggYSBgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXWAgbWV0aG9kLCB3aGljaFxuICogcmV0dXJucyBhbiBpdGVyYXRvciB3aG8ncyBgbmV4dCgpYCBtZXRob2QgcmV0dXJucyBhIFByb21pc2UuIFdoZW4gYSBuZXdcbiAqIHZhbHVlIGlzIGF2YWlsYWJsZSwgdGhlIFByb21pc2UgcmVzb2x2ZXMgYW5kIHRoZSB2YWx1ZSBpcyByZW5kZXJlZCB0byB0aGVcbiAqIFBhcnQgY29udHJvbGxlZCBieSB0aGUgZGlyZWN0aXZlLiBJZiBhbm90aGVyIHZhbHVlIG90aGVyIHRoYW4gdGhpc1xuICogZGlyZWN0aXZlIGhhcyBiZWVuIHNldCBvbiB0aGUgUGFydCwgdGhlIGl0ZXJhYmxlIHdpbGwgbm8gbG9uZ2VyIGJlIGxpc3RlbmVkXG4gKiB0byBhbmQgbmV3IHZhbHVlcyB3b24ndCBiZSB3cml0dGVuIHRvIHRoZSBQYXJ0LlxuICpcbiAqIFsxXTogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvU3RhdGVtZW50cy9mb3ItYXdhaXQuLi5vZlxuICpcbiAqIEBwYXJhbSB2YWx1ZSBBbiBhc3luYyBpdGVyYWJsZVxuICogQHBhcmFtIG1hcHBlciBBbiBvcHRpb25hbCBmdW5jdGlvbiB0aGF0IG1hcHMgZnJvbSAodmFsdWUsIGluZGV4KSB0byBhbm90aGVyXG4gKiAgICAgdmFsdWUuIFVzZWZ1bCBmb3IgZ2VuZXJhdGluZyB0ZW1wbGF0ZXMgZm9yIGVhY2ggaXRlbSBpbiB0aGUgaXRlcmFibGUuXG4gKi9cbmV4cG9ydCBjb25zdCBhc3luY1JlcGxhY2UgPSBkaXJlY3RpdmUoQXN5bmNSZXBsYWNlRGlyZWN0aXZlKTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0NoaWxkUGFydH0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmVQYXJhbWV0ZXJzLFxuICBQYXJ0SW5mbyxcbiAgUGFydFR5cGUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge0FzeW5jUmVwbGFjZURpcmVjdGl2ZX0gZnJvbSAnLi9hc3luYy1yZXBsYWNlLmpzJztcbmltcG9ydCB7XG4gIGNsZWFyUGFydCxcbiAgaW5zZXJ0UGFydCxcbiAgc2V0Q2hpbGRQYXJ0VmFsdWUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcblxuY2xhc3MgQXN5bmNBcHBlbmREaXJlY3RpdmUgZXh0ZW5kcyBBc3luY1JlcGxhY2VEaXJlY3RpdmUge1xuICBwcml2YXRlIF9fY2hpbGRQYXJ0ITogQ2hpbGRQYXJ0O1xuXG4gIC8vIE92ZXJyaWRlIEFzeW5jUmVwbGFjZSB0byBuYXJyb3cgdGhlIGFsbG93ZWQgcGFydCB0eXBlIHRvIENoaWxkUGFydCBvbmx5XG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAocGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQ0hJTEQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignYXN5bmNBcHBlbmQgY2FuIG9ubHkgYmUgdXNlZCBpbiBjaGlsZCBleHByZXNzaW9ucycpO1xuICAgIH1cbiAgfVxuXG4gIC8vIE92ZXJyaWRlIEFzeW5jUmVwbGFjZSB0byBzYXZlIHRoZSBwYXJ0IHNpbmNlIHdlIG5lZWQgdG8gYXBwZW5kIGludG8gaXRcbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IENoaWxkUGFydCwgcGFyYW1zOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgdGhpcy5fX2NoaWxkUGFydCA9IHBhcnQ7XG4gICAgcmV0dXJuIHN1cGVyLnVwZGF0ZShwYXJ0LCBwYXJhbXMpO1xuICB9XG5cbiAgLy8gT3ZlcnJpZGUgQXN5bmNSZXBsYWNlIHRvIGFwcGVuZCByYXRoZXIgdGhhbiByZXBsYWNlXG4gIHByb3RlY3RlZCBvdmVycmlkZSBjb21taXRWYWx1ZSh2YWx1ZTogdW5rbm93biwgaW5kZXg6IG51bWJlcikge1xuICAgIC8vIFdoZW4gd2UgZ2V0IHRoZSBmaXJzdCB2YWx1ZSwgY2xlYXIgdGhlIHBhcnQuIFRoaXMgbGV0cyB0aGVcbiAgICAvLyBwcmV2aW91cyB2YWx1ZSBkaXNwbGF5IHVudGlsIHdlIGNhbiByZXBsYWNlIGl0LlxuICAgIGlmIChpbmRleCA9PT0gMCkge1xuICAgICAgY2xlYXJQYXJ0KHRoaXMuX19jaGlsZFBhcnQpO1xuICAgIH1cbiAgICAvLyBDcmVhdGUgYW5kIGluc2VydCBhIG5ldyBwYXJ0IGFuZCBzZXQgaXRzIHZhbHVlIHRvIHRoZSBuZXh0IHZhbHVlXG4gICAgY29uc3QgbmV3UGFydCA9IGluc2VydFBhcnQodGhpcy5fX2NoaWxkUGFydCk7XG4gICAgc2V0Q2hpbGRQYXJ0VmFsdWUobmV3UGFydCwgdmFsdWUpO1xuICB9XG59XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCByZW5kZXJzIHRoZSBpdGVtcyBvZiBhbiBhc3luYyBpdGVyYWJsZVsxXSwgYXBwZW5kaW5nIG5ld1xuICogdmFsdWVzIGFmdGVyIHByZXZpb3VzIHZhbHVlcywgc2ltaWxhciB0byB0aGUgYnVpbHQtaW4gc3VwcG9ydCBmb3IgaXRlcmFibGVzLlxuICogVGhpcyBkaXJlY3RpdmUgaXMgdXNhYmxlIG9ubHkgaW4gY2hpbGQgZXhwcmVzc2lvbnMuXG4gKlxuICogQXN5bmMgaXRlcmFibGVzIGFyZSBvYmplY3RzIHdpdGggYSBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdIG1ldGhvZCwgd2hpY2hcbiAqIHJldHVybnMgYW4gaXRlcmF0b3Igd2hvJ3MgYG5leHQoKWAgbWV0aG9kIHJldHVybnMgYSBQcm9taXNlLiBXaGVuIGEgbmV3XG4gKiB2YWx1ZSBpcyBhdmFpbGFibGUsIHRoZSBQcm9taXNlIHJlc29sdmVzIGFuZCB0aGUgdmFsdWUgaXMgYXBwZW5kZWQgdG8gdGhlXG4gKiBQYXJ0IGNvbnRyb2xsZWQgYnkgdGhlIGRpcmVjdGl2ZS4gSWYgYW5vdGhlciB2YWx1ZSBvdGhlciB0aGFuIHRoaXNcbiAqIGRpcmVjdGl2ZSBoYXMgYmVlbiBzZXQgb24gdGhlIFBhcnQsIHRoZSBpdGVyYWJsZSB3aWxsIG5vIGxvbmdlciBiZSBsaXN0ZW5lZFxuICogdG8gYW5kIG5ldyB2YWx1ZXMgd29uJ3QgYmUgd3JpdHRlbiB0byB0aGUgUGFydC5cbiAqXG4gKiBbMV06IGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL1N0YXRlbWVudHMvZm9yLWF3YWl0Li4ub2ZcbiAqXG4gKiBAcGFyYW0gdmFsdWUgQW4gYXN5bmMgaXRlcmFibGVcbiAqIEBwYXJhbSBtYXBwZXIgQW4gb3B0aW9uYWwgZnVuY3Rpb24gdGhhdCBtYXBzIGZyb20gKHZhbHVlLCBpbmRleCkgdG8gYW5vdGhlclxuICogICAgIHZhbHVlLiBVc2VmdWwgZm9yIGdlbmVyYXRpbmcgdGVtcGxhdGVzIGZvciBlYWNoIGl0ZW0gaW4gdGhlIGl0ZXJhYmxlLlxuICovXG5leHBvcnQgY29uc3QgYXN5bmNBcHBlbmQgPSBkaXJlY3RpdmUoQXN5bmNBcHBlbmREaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge0FzeW5jQXBwZW5kRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge1xuICBUZW1wbGF0ZVJlc3VsdCxcbiAgQ2hpbGRQYXJ0LFxuICBSb290UGFydCxcbiAgcmVuZGVyLFxuICBub3RoaW5nLFxufSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBkaXJlY3RpdmUsXG4gIERpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbiAgUGFydEluZm8sXG59IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge1xuICBjbGVhclBhcnQsXG4gIGdldENvbW1pdHRlZFZhbHVlLFxuICBpbnNlcnRQYXJ0LFxuICBpc1RlbXBsYXRlUmVzdWx0LFxuICBzZXRDb21taXR0ZWRWYWx1ZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuXG5jbGFzcyBDYWNoZURpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX3RlbXBsYXRlQ2FjaGUgPSBuZXcgV2Vha01hcDxUZW1wbGF0ZVN0cmluZ3NBcnJheSwgUm9vdFBhcnQ+KCk7XG4gIHByaXZhdGUgX3ZhbHVlPzogVGVtcGxhdGVSZXN1bHQ7XG5cbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICB9XG5cbiAgcmVuZGVyKHY6IHVua25vd24pIHtcbiAgICAvLyBSZXR1cm4gYW4gYXJyYXkgb2YgdGhlIHZhbHVlIHRvIGluZHVjZSBsaXQtaHRtbCB0byBjcmVhdGUgYSBDaGlsZFBhcnRcbiAgICAvLyBmb3IgdGhlIHZhbHVlIHRoYXQgd2UgY2FuIG1vdmUgaW50byB0aGUgY2FjaGUuXG4gICAgcmV0dXJuIFt2XTtcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShjb250YWluZXJQYXJ0OiBDaGlsZFBhcnQsIFt2XTogRGlyZWN0aXZlUGFyYW1ldGVyczx0aGlzPikge1xuICAgIC8vIElmIHRoZSBwcmV2aW91cyB2YWx1ZSBpcyBhIFRlbXBsYXRlUmVzdWx0IGFuZCB0aGUgbmV3IHZhbHVlIGlzIG5vdCxcbiAgICAvLyBvciBpcyBhIGRpZmZlcmVudCBUZW1wbGF0ZSBhcyB0aGUgcHJldmlvdXMgdmFsdWUsIG1vdmUgdGhlIGNoaWxkIHBhcnRcbiAgICAvLyBpbnRvIHRoZSBjYWNoZS5cbiAgICBpZiAoXG4gICAgICBpc1RlbXBsYXRlUmVzdWx0KHRoaXMuX3ZhbHVlKSAmJlxuICAgICAgKCFpc1RlbXBsYXRlUmVzdWx0KHYpIHx8IHRoaXMuX3ZhbHVlLnN0cmluZ3MgIT09IHYuc3RyaW5ncylcbiAgICApIHtcbiAgICAgIC8vIFRoaXMgaXMgYWx3YXlzIGFuIGFycmF5IGJlY2F1c2Ugd2UgcmV0dXJuIFt2XSBpbiByZW5kZXIoKVxuICAgICAgY29uc3QgcGFydFZhbHVlID0gZ2V0Q29tbWl0dGVkVmFsdWUoY29udGFpbmVyUGFydCkgYXMgQXJyYXk8Q2hpbGRQYXJ0PjtcbiAgICAgIGNvbnN0IGNoaWxkUGFydCA9IHBhcnRWYWx1ZS5wb3AoKSE7XG4gICAgICBsZXQgY2FjaGVkQ29udGFpbmVyUGFydCA9IHRoaXMuX3RlbXBsYXRlQ2FjaGUuZ2V0KHRoaXMuX3ZhbHVlLnN0cmluZ3MpO1xuICAgICAgaWYgKGNhY2hlZENvbnRhaW5lclBhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb25zdCBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgY2FjaGVkQ29udGFpbmVyUGFydCA9IHJlbmRlcihub3RoaW5nLCBmcmFnbWVudCk7XG4gICAgICAgIGNhY2hlZENvbnRhaW5lclBhcnQuc2V0Q29ubmVjdGVkKGZhbHNlKTtcbiAgICAgICAgdGhpcy5fdGVtcGxhdGVDYWNoZS5zZXQodGhpcy5fdmFsdWUuc3RyaW5ncywgY2FjaGVkQ29udGFpbmVyUGFydCk7XG4gICAgICB9XG4gICAgICAvLyBNb3ZlIGludG8gY2FjaGVcbiAgICAgIHNldENvbW1pdHRlZFZhbHVlKGNhY2hlZENvbnRhaW5lclBhcnQsIFtjaGlsZFBhcnRdKTtcbiAgICAgIGluc2VydFBhcnQoY2FjaGVkQ29udGFpbmVyUGFydCwgdW5kZWZpbmVkLCBjaGlsZFBhcnQpO1xuICAgIH1cbiAgICAvLyBJZiB0aGUgbmV3IHZhbHVlIGlzIGEgVGVtcGxhdGVSZXN1bHQgYW5kIHRoZSBwcmV2aW91cyB2YWx1ZSBpcyBub3QsXG4gICAgLy8gb3IgaXMgYSBkaWZmZXJlbnQgVGVtcGxhdGUgYXMgdGhlIHByZXZpb3VzIHZhbHVlLCByZXN0b3JlIHRoZSBjaGlsZFxuICAgIC8vIHBhcnQgZnJvbSB0aGUgY2FjaGUuXG4gICAgaWYgKGlzVGVtcGxhdGVSZXN1bHQodikpIHtcbiAgICAgIGlmICghaXNUZW1wbGF0ZVJlc3VsdCh0aGlzLl92YWx1ZSkgfHwgdGhpcy5fdmFsdWUuc3RyaW5ncyAhPT0gdi5zdHJpbmdzKSB7XG4gICAgICAgIGNvbnN0IGNhY2hlZENvbnRhaW5lclBhcnQgPSB0aGlzLl90ZW1wbGF0ZUNhY2hlLmdldCh2LnN0cmluZ3MpO1xuICAgICAgICBpZiAoY2FjaGVkQ29udGFpbmVyUGFydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FjaGVkIHBhcnQgYmFjayBpbnRvIHRoZSBjb250YWluZXIgcGFydCB2YWx1ZVxuICAgICAgICAgIGNvbnN0IHBhcnRWYWx1ZSA9IGdldENvbW1pdHRlZFZhbHVlKFxuICAgICAgICAgICAgY2FjaGVkQ29udGFpbmVyUGFydFxuICAgICAgICAgICkgYXMgQXJyYXk8Q2hpbGRQYXJ0PjtcbiAgICAgICAgICBjb25zdCBjYWNoZWRQYXJ0ID0gcGFydFZhbHVlLnBvcCgpITtcbiAgICAgICAgICAvLyBNb3ZlIGNhY2hlZCBwYXJ0IGJhY2sgaW50byBET01cbiAgICAgICAgICBjbGVhclBhcnQoY29udGFpbmVyUGFydCk7XG4gICAgICAgICAgaW5zZXJ0UGFydChjb250YWluZXJQYXJ0LCB1bmRlZmluZWQsIGNhY2hlZFBhcnQpO1xuICAgICAgICAgIHNldENvbW1pdHRlZFZhbHVlKGNvbnRhaW5lclBhcnQsIFtjYWNoZWRQYXJ0XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuX3ZhbHVlID0gdjtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fdmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlbmRlcih2KTtcbiAgfVxufVxuXG4vKipcbiAqIEVuYWJsZXMgZmFzdCBzd2l0Y2hpbmcgYmV0d2VlbiBtdWx0aXBsZSB0ZW1wbGF0ZXMgYnkgY2FjaGluZyB0aGUgRE9NIG5vZGVzXG4gKiBhbmQgVGVtcGxhdGVJbnN0YW5jZXMgcHJvZHVjZWQgYnkgdGhlIHRlbXBsYXRlcy5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBsZXQgY2hlY2tlZCA9IGZhbHNlO1xuICpcbiAqIGh0bWxgXG4gKiAgICR7Y2FjaGUoY2hlY2tlZCA/IGh0bWxgaW5wdXQgaXMgY2hlY2tlZGAgOiBodG1sYGlucHV0IGlzIG5vdCBjaGVja2VkYCl9XG4gKiBgXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGNhY2hlID0gZGlyZWN0aXZlKENhY2hlRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtDYWNoZURpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLyoqXG4gKiBDaG9vc2VzIGFuZCBldmFsdWF0ZXMgYSB0ZW1wbGF0ZSBmdW5jdGlvbiBmcm9tIGEgbGlzdCBiYXNlZCBvbiBtYXRjaGluZ1xuICogdGhlIGdpdmVuIGB2YWx1ZWAgdG8gYSBjYXNlLlxuICpcbiAqIENhc2VzIGFyZSBzdHJ1Y3R1cmVkIGFzIGBbY2FzZVZhbHVlLCBmdW5jXWAuIGB2YWx1ZWAgaXMgbWF0Y2hlZCB0b1xuICogYGNhc2VWYWx1ZWAgYnkgc3RyaWN0IGVxdWFsaXR5LiBUaGUgZmlyc3QgbWF0Y2ggaXMgc2VsZWN0ZWQuIENhc2UgdmFsdWVzXG4gKiBjYW4gYmUgb2YgYW55IHR5cGUgaW5jbHVkaW5nIHByaW1pdGl2ZXMsIG9iamVjdHMsIGFuZCBzeW1ib2xzLlxuICpcbiAqIFRoaXMgaXMgc2ltaWxhciB0byBhIHN3aXRjaCBzdGF0ZW1lbnQsIGJ1dCBhcyBhbiBleHByZXNzaW9uIGFuZCB3aXRob3V0XG4gKiBmYWxsdGhyb3VnaC5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiByZW5kZXIoKSB7XG4gKiAgIHJldHVybiBodG1sYFxuICogICAgICR7Y2hvb3NlKHRoaXMuc2VjdGlvbiwgW1xuICogICAgICAgWydob21lJywgKCkgPT4gaHRtbGA8aDE+SG9tZTwvaDE+YF0sXG4gKiAgICAgICBbJ2Fib3V0JywgKCkgPT4gaHRtbGA8aDE+QWJvdXQ8L2gxPmBdXG4gKiAgICAgXSxcbiAqICAgICAoKSA9PiBodG1sYDxoMT5FcnJvcjwvaDE+YCl9XG4gKiAgIGA7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGNob29zZSA9IDxULCBWPihcbiAgdmFsdWU6IFQsXG4gIGNhc2VzOiBBcnJheTxbVCwgKCkgPT4gVl0+LFxuICBkZWZhdWx0Q2FzZT86ICgpID0+IFZcbikgPT4ge1xuICBmb3IgKGNvbnN0IGMgb2YgY2FzZXMpIHtcbiAgICBjb25zdCBjYXNlVmFsdWUgPSBjWzBdO1xuICAgIGlmIChjYXNlVmFsdWUgPT09IHZhbHVlKSB7XG4gICAgICBjb25zdCBmbiA9IGNbMV07XG4gICAgICByZXR1cm4gZm4oKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlZmF1bHRDYXNlPy4oKTtcbn07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtBdHRyaWJ1dGVQYXJ0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmUsXG4gIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG4gIFBhcnRJbmZvLFxuICBQYXJ0VHlwZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcblxuLyoqXG4gKiBBIGtleS12YWx1ZSBzZXQgb2YgY2xhc3MgbmFtZXMgdG8gdHJ1dGh5IHZhbHVlcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDbGFzc0luZm8ge1xuICByZWFkb25seSBbbmFtZTogc3RyaW5nXTogc3RyaW5nIHwgYm9vbGVhbiB8IG51bWJlcjtcbn1cblxuY2xhc3MgQ2xhc3NNYXBEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICAvKipcbiAgICogU3RvcmVzIHRoZSBDbGFzc0luZm8gb2JqZWN0IGFwcGxpZWQgdG8gYSBnaXZlbiBBdHRyaWJ1dGVQYXJ0LlxuICAgKiBVc2VkIHRvIHVuc2V0IGV4aXN0aW5nIHZhbHVlcyB3aGVuIGEgbmV3IENsYXNzSW5mbyBvYmplY3QgaXMgYXBwbGllZC5cbiAgICovXG4gIHByaXZhdGUgX3ByZXZpb3VzQ2xhc3Nlcz86IFNldDxzdHJpbmc+O1xuICBwcml2YXRlIF9zdGF0aWNDbGFzc2VzPzogU2V0PHN0cmluZz47XG5cbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICAgIGlmIChcbiAgICAgIHBhcnRJbmZvLnR5cGUgIT09IFBhcnRUeXBlLkFUVFJJQlVURSB8fFxuICAgICAgcGFydEluZm8ubmFtZSAhPT0gJ2NsYXNzJyB8fFxuICAgICAgKHBhcnRJbmZvLnN0cmluZ3M/Lmxlbmd0aCBhcyBudW1iZXIpID4gMlxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnYGNsYXNzTWFwKClgIGNhbiBvbmx5IGJlIHVzZWQgaW4gdGhlIGBjbGFzc2AgYXR0cmlidXRlICcgK1xuICAgICAgICAgICdhbmQgbXVzdCBiZSB0aGUgb25seSBwYXJ0IGluIHRoZSBhdHRyaWJ1dGUuJ1xuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXIoY2xhc3NJbmZvOiBDbGFzc0luZm8pIHtcbiAgICAvLyBBZGQgc3BhY2VzIHRvIGVuc3VyZSBzZXBhcmF0aW9uIGZyb20gc3RhdGljIGNsYXNzZXNcbiAgICByZXR1cm4gKFxuICAgICAgJyAnICtcbiAgICAgIE9iamVjdC5rZXlzKGNsYXNzSW5mbylcbiAgICAgICAgLmZpbHRlcigoa2V5KSA9PiBjbGFzc0luZm9ba2V5XSlcbiAgICAgICAgLmpvaW4oJyAnKSArXG4gICAgICAnICdcbiAgICApO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IEF0dHJpYnV0ZVBhcnQsIFtjbGFzc0luZm9dOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgLy8gUmVtZW1iZXIgZHluYW1pYyBjbGFzc2VzIG9uIHRoZSBmaXJzdCByZW5kZXJcbiAgICBpZiAodGhpcy5fcHJldmlvdXNDbGFzc2VzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX3ByZXZpb3VzQ2xhc3NlcyA9IG5ldyBTZXQoKTtcbiAgICAgIGlmIChwYXJ0LnN0cmluZ3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9zdGF0aWNDbGFzc2VzID0gbmV3IFNldChcbiAgICAgICAgICBwYXJ0LnN0cmluZ3NcbiAgICAgICAgICAgIC5qb2luKCcgJylcbiAgICAgICAgICAgIC5zcGxpdCgvXFxzLylcbiAgICAgICAgICAgIC5maWx0ZXIoKHMpID0+IHMgIT09ICcnKVxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBuYW1lIGluIGNsYXNzSW5mbykge1xuICAgICAgICBpZiAoY2xhc3NJbmZvW25hbWVdICYmICF0aGlzLl9zdGF0aWNDbGFzc2VzPy5oYXMobmFtZSkpIHtcbiAgICAgICAgICB0aGlzLl9wcmV2aW91c0NsYXNzZXMuYWRkKG5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5yZW5kZXIoY2xhc3NJbmZvKTtcbiAgICB9XG5cbiAgICBjb25zdCBjbGFzc0xpc3QgPSBwYXJ0LmVsZW1lbnQuY2xhc3NMaXN0O1xuXG4gICAgLy8gUmVtb3ZlIG9sZCBjbGFzc2VzIHRoYXQgbm8gbG9uZ2VyIGFwcGx5XG4gICAgLy8gV2UgdXNlIGZvckVhY2goKSBpbnN0ZWFkIG9mIGZvci1vZiBzbyB0aGF0IHdlIGRvbid0IHJlcXVpcmUgZG93bi1sZXZlbFxuICAgIC8vIGl0ZXJhdGlvbi5cbiAgICB0aGlzLl9wcmV2aW91c0NsYXNzZXMuZm9yRWFjaCgobmFtZSkgPT4ge1xuICAgICAgaWYgKCEobmFtZSBpbiBjbGFzc0luZm8pKSB7XG4gICAgICAgIGNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgICAgIHRoaXMuX3ByZXZpb3VzQ2xhc3NlcyEuZGVsZXRlKG5hbWUpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQWRkIG9yIHJlbW92ZSBjbGFzc2VzIGJhc2VkIG9uIHRoZWlyIGNsYXNzTWFwIHZhbHVlXG4gICAgZm9yIChjb25zdCBuYW1lIGluIGNsYXNzSW5mbykge1xuICAgICAgLy8gV2UgZXhwbGljaXRseSB3YW50IGEgbG9vc2UgdHJ1dGh5IGNoZWNrIG9mIGB2YWx1ZWAgYmVjYXVzZSBpdCBzZWVtc1xuICAgICAgLy8gbW9yZSBjb252ZW5pZW50IHRoYXQgJycgYW5kIDAgYXJlIHNraXBwZWQuXG4gICAgICBjb25zdCB2YWx1ZSA9ICEhY2xhc3NJbmZvW25hbWVdO1xuICAgICAgaWYgKFxuICAgICAgICB2YWx1ZSAhPT0gdGhpcy5fcHJldmlvdXNDbGFzc2VzLmhhcyhuYW1lKSAmJlxuICAgICAgICAhdGhpcy5fc3RhdGljQ2xhc3Nlcz8uaGFzKG5hbWUpXG4gICAgICApIHtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgY2xhc3NMaXN0LmFkZChuYW1lKTtcbiAgICAgICAgICB0aGlzLl9wcmV2aW91c0NsYXNzZXMuYWRkKG5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgICAgICAgdGhpcy5fcHJldmlvdXNDbGFzc2VzLmRlbGV0ZShuYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGRpcmVjdGl2ZSB0aGF0IGFwcGxpZXMgZHluYW1pYyBDU1MgY2xhc3Nlcy5cbiAqXG4gKiBUaGlzIG11c3QgYmUgdXNlZCBpbiB0aGUgYGNsYXNzYCBhdHRyaWJ1dGUgYW5kIG11c3QgYmUgdGhlIG9ubHkgcGFydCB1c2VkIGluXG4gKiB0aGUgYXR0cmlidXRlLiBJdCB0YWtlcyBlYWNoIHByb3BlcnR5IGluIHRoZSBgY2xhc3NJbmZvYCBhcmd1bWVudCBhbmQgYWRkc1xuICogdGhlIHByb3BlcnR5IG5hbWUgdG8gdGhlIGVsZW1lbnQncyBgY2xhc3NMaXN0YCBpZiB0aGUgcHJvcGVydHkgdmFsdWUgaXNcbiAqIHRydXRoeTsgaWYgdGhlIHByb3BlcnR5IHZhbHVlIGlzIGZhbHNleSwgdGhlIHByb3BlcnR5IG5hbWUgaXMgcmVtb3ZlZCBmcm9tXG4gKiB0aGUgZWxlbWVudCdzIGBjbGFzc2AuXG4gKlxuICogRm9yIGV4YW1wbGUgYHtmb286IGJhcn1gIGFwcGxpZXMgdGhlIGNsYXNzIGBmb29gIGlmIHRoZSB2YWx1ZSBvZiBgYmFyYCBpc1xuICogdHJ1dGh5LlxuICpcbiAqIEBwYXJhbSBjbGFzc0luZm9cbiAqL1xuZXhwb3J0IGNvbnN0IGNsYXNzTWFwID0gZGlyZWN0aXZlKENsYXNzTWFwRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtDbGFzc01hcERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtub0NoYW5nZSwgUGFydH0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIERpcmVjdGl2ZSwgRGlyZWN0aXZlUGFyYW1ldGVyc30gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcblxuLy8gQSBzZW50aW5lbCB0aGF0IGluZGljYXRlcyBndWFyZCgpIGhhc24ndCByZW5kZXJlZCBhbnl0aGluZyB5ZXRcbmNvbnN0IGluaXRpYWxWYWx1ZSA9IHt9O1xuXG5jbGFzcyBHdWFyZERpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX3ByZXZpb3VzVmFsdWU6IHVua25vd24gPSBpbml0aWFsVmFsdWU7XG5cbiAgcmVuZGVyKF92YWx1ZTogdW5rbm93biwgZjogKCkgPT4gdW5rbm93bikge1xuICAgIHJldHVybiBmKCk7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUoX3BhcnQ6IFBhcnQsIFt2YWx1ZSwgZl06IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIC8vIERpcnR5LWNoZWNrIGFycmF5cyBieSBpdGVtXG4gICAgICBpZiAoXG4gICAgICAgIEFycmF5LmlzQXJyYXkodGhpcy5fcHJldmlvdXNWYWx1ZSkgJiZcbiAgICAgICAgdGhpcy5fcHJldmlvdXNWYWx1ZS5sZW5ndGggPT09IHZhbHVlLmxlbmd0aCAmJlxuICAgICAgICB2YWx1ZS5ldmVyeSgodiwgaSkgPT4gdiA9PT0gKHRoaXMuX3ByZXZpb3VzVmFsdWUgYXMgQXJyYXk8dW5rbm93bj4pW2ldKVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRoaXMuX3ByZXZpb3VzVmFsdWUgPT09IHZhbHVlKSB7XG4gICAgICAvLyBEaXJ0eS1jaGVjayBub24tYXJyYXlzIGJ5IGlkZW50aXR5XG4gICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgfVxuXG4gICAgLy8gQ29weSB0aGUgdmFsdWUgaWYgaXQncyBhbiBhcnJheSBzbyB0aGF0IGlmIGl0J3MgbXV0YXRlZCB3ZSBkb24ndCBmb3JnZXRcbiAgICAvLyB3aGF0IHRoZSBwcmV2aW91cyB2YWx1ZXMgd2VyZS5cbiAgICB0aGlzLl9wcmV2aW91c1ZhbHVlID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyBBcnJheS5mcm9tKHZhbHVlKSA6IHZhbHVlO1xuICAgIGNvbnN0IHIgPSB0aGlzLnJlbmRlcih2YWx1ZSwgZik7XG4gICAgcmV0dXJuIHI7XG4gIH1cbn1cblxuLyoqXG4gKiBQcmV2ZW50cyByZS1yZW5kZXIgb2YgYSB0ZW1wbGF0ZSBmdW5jdGlvbiB1bnRpbCBhIHNpbmdsZSB2YWx1ZSBvciBhbiBhcnJheSBvZlxuICogdmFsdWVzIGNoYW5nZXMuXG4gKlxuICogVmFsdWVzIGFyZSBjaGVja2VkIGFnYWluc3QgcHJldmlvdXMgdmFsdWVzIHdpdGggc3RyaWN0IGVxdWFsaXR5IChgPT09YCksIGFuZFxuICogc28gdGhlIGNoZWNrIHdvbid0IGRldGVjdCBuZXN0ZWQgcHJvcGVydHkgY2hhbmdlcyBpbnNpZGUgb2JqZWN0cyBvciBhcnJheXMuXG4gKiBBcnJheXMgdmFsdWVzIGhhdmUgZWFjaCBpdGVtIGNoZWNrZWQgYWdhaW5zdCB0aGUgcHJldmlvdXMgdmFsdWUgYXQgdGhlIHNhbWVcbiAqIGluZGV4IHdpdGggc3RyaWN0IGVxdWFsaXR5LiBOZXN0ZWQgYXJyYXlzIGFyZSBhbHNvIGNoZWNrZWQgb25seSBieSBzdHJpY3RcbiAqIGVxdWFsaXR5LlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogYGBganNcbiAqIGh0bWxgXG4gKiAgIDxkaXY+XG4gKiAgICAgJHtndWFyZChbdXNlci5pZCwgY29tcGFueS5pZF0sICgpID0+IGh0bWxgLi4uYCl9XG4gKiAgIDwvZGl2PlxuICogYFxuICogYGBgXG4gKlxuICogSW4gdGhpcyBjYXNlLCB0aGUgdGVtcGxhdGUgb25seSByZXJlbmRlcnMgaWYgZWl0aGVyIGB1c2VyLmlkYCBvciBgY29tcGFueS5pZGBcbiAqIGNoYW5nZXMuXG4gKlxuICogZ3VhcmQoKSBpcyB1c2VmdWwgd2l0aCBpbW11dGFibGUgZGF0YSBwYXR0ZXJucywgYnkgcHJldmVudGluZyBleHBlbnNpdmUgd29ya1xuICogdW50aWwgZGF0YSB1cGRhdGVzLlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogYGBganNcbiAqIGh0bWxgXG4gKiAgIDxkaXY+XG4gKiAgICAgJHtndWFyZChbaW1tdXRhYmxlSXRlbXNdLCAoKSA9PiBpbW11dGFibGVJdGVtcy5tYXAoaSA9PiBodG1sYCR7aX1gKSl9XG4gKiAgIDwvZGl2PlxuICogYFxuICogYGBgXG4gKlxuICogSW4gdGhpcyBjYXNlLCBpdGVtcyBhcmUgbWFwcGVkIG92ZXIgb25seSB3aGVuIHRoZSBhcnJheSByZWZlcmVuY2UgY2hhbmdlcy5cbiAqXG4gKiBAcGFyYW0gdmFsdWUgdGhlIHZhbHVlIHRvIGNoZWNrIGJlZm9yZSByZS1yZW5kZXJpbmdcbiAqIEBwYXJhbSBmIHRoZSB0ZW1wbGF0ZSBmdW5jdGlvblxuICovXG5leHBvcnQgY29uc3QgZ3VhcmQgPSBkaXJlY3RpdmUoR3VhcmREaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge0d1YXJkRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge25vdGhpbmd9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcblxuLyoqXG4gKiBGb3IgQXR0cmlidXRlUGFydHMsIHNldHMgdGhlIGF0dHJpYnV0ZSBpZiB0aGUgdmFsdWUgaXMgZGVmaW5lZCBhbmQgcmVtb3Zlc1xuICogdGhlIGF0dHJpYnV0ZSBpZiB0aGUgdmFsdWUgaXMgdW5kZWZpbmVkLlxuICpcbiAqIEZvciBvdGhlciBwYXJ0IHR5cGVzLCB0aGlzIGRpcmVjdGl2ZSBpcyBhIG5vLW9wLlxuICovXG5leHBvcnQgY29uc3QgaWZEZWZpbmVkID0gPFQ+KHZhbHVlOiBUKSA9PiB2YWx1ZSA/PyBub3RoaW5nO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjEgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbi8qKlxuICogUmV0dXJucyBhbiBpdGVyYWJsZSBjb250YWluaW5nIHRoZSB2YWx1ZXMgaW4gYGl0ZW1zYCBpbnRlcmxlYXZlZCB3aXRoIHRoZVxuICogYGpvaW5lcmAgdmFsdWUuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogcmVuZGVyKCkge1xuICogICByZXR1cm4gaHRtbGBcbiAqICAgICAke2pvaW4oaXRlbXMsIGh0bWxgPHNwYW4gY2xhc3M9XCJzZXBhcmF0b3JcIj58PC9zcGFuPmApfVxuICogICBgO1xuICogfVxuICovXG5leHBvcnQgZnVuY3Rpb24gam9pbjxJLCBKPihcbiAgaXRlbXM6IEl0ZXJhYmxlPEk+IHwgdW5kZWZpbmVkLFxuICBqb2luZXI6IChpbmRleDogbnVtYmVyKSA9PiBKXG4pOiBJdGVyYWJsZTxJIHwgSj47XG5leHBvcnQgZnVuY3Rpb24gam9pbjxJLCBKPihcbiAgaXRlbXM6IEl0ZXJhYmxlPEk+IHwgdW5kZWZpbmVkLFxuICBqb2luZXI6IEpcbik6IEl0ZXJhYmxlPEkgfCBKPjtcbmV4cG9ydCBmdW5jdGlvbiogam9pbjxJLCBKPihpdGVtczogSXRlcmFibGU8ST4gfCB1bmRlZmluZWQsIGpvaW5lcjogSikge1xuICBjb25zdCBpc0Z1bmN0aW9uID0gdHlwZW9mIGpvaW5lciA9PT0gJ2Z1bmN0aW9uJztcbiAgaWYgKGl0ZW1zICE9PSB1bmRlZmluZWQpIHtcbiAgICBsZXQgaSA9IC0xO1xuICAgIGZvciAoY29uc3QgdmFsdWUgb2YgaXRlbXMpIHtcbiAgICAgIGlmIChpID4gLTEpIHtcbiAgICAgICAgeWllbGQgaXNGdW5jdGlvbiA/IGpvaW5lcihpKSA6IGpvaW5lcjtcbiAgICAgIH1cbiAgICAgIGkrKztcbiAgICAgIHlpZWxkIHZhbHVlO1xuICAgIH1cbiAgfVxufVxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjEgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7bm90aGluZ30gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmUsXG4gIENoaWxkUGFydCxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7c2V0Q29tbWl0dGVkVmFsdWV9IGZyb20gJy4uL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcblxuY2xhc3MgS2V5ZWQgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBrZXk6IHVua25vd24gPSBub3RoaW5nO1xuXG4gIHJlbmRlcihrOiB1bmtub3duLCB2OiB1bmtub3duKSB7XG4gICAgdGhpcy5rZXkgPSBrO1xuICAgIHJldHVybiB2O1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IENoaWxkUGFydCwgW2ssIHZdOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgaWYgKGsgIT09IHRoaXMua2V5KSB7XG4gICAgICAvLyBDbGVhciB0aGUgcGFydCBiZWZvcmUgcmV0dXJuaW5nIGEgdmFsdWUuIFRoZSBvbmUtYXJnIGZvcm0gb2ZcbiAgICAgIC8vIHNldENvbW1pdHRlZFZhbHVlIHNldHMgdGhlIHZhbHVlIHRvIGEgc2VudGluZWwgd2hpY2ggZm9yY2VzIGFcbiAgICAgIC8vIGNvbW1pdCB0aGUgbmV4dCByZW5kZXIuXG4gICAgICBzZXRDb21taXR0ZWRWYWx1ZShwYXJ0KTtcbiAgICAgIHRoaXMua2V5ID0gaztcbiAgICB9XG4gICAgcmV0dXJuIHY7XG4gIH1cbn1cblxuLyoqXG4gKiBBc3NvY2lhdGVzIGEgcmVuZGVyYWJsZSB2YWx1ZSB3aXRoIGEgdW5pcXVlIGtleS4gV2hlbiB0aGUga2V5IGNoYW5nZXMsIHRoZVxuICogcHJldmlvdXMgRE9NIGlzIHJlbW92ZWQgYW5kIGRpc3Bvc2VkIGJlZm9yZSByZW5kZXJpbmcgdGhlIG5leHQgdmFsdWUsIGV2ZW5cbiAqIGlmIHRoZSB2YWx1ZSAtIHN1Y2ggYXMgYSB0ZW1wbGF0ZSAtIGlzIHRoZSBzYW1lLlxuICpcbiAqIFRoaXMgaXMgdXNlZnVsIGZvciBmb3JjaW5nIHJlLXJlbmRlcnMgb2Ygc3RhdGVmdWwgY29tcG9uZW50cywgb3Igd29ya2luZ1xuICogd2l0aCBjb2RlIHRoYXQgZXhwZWN0cyBuZXcgZGF0YSB0byBnZW5lcmF0ZSBuZXcgSFRNTCBlbGVtZW50cywgc3VjaCBhcyBzb21lXG4gKiBhbmltYXRpb24gdGVjaG5pcXVlcy5cbiAqL1xuZXhwb3J0IGNvbnN0IGtleWVkID0gZGlyZWN0aXZlKEtleWVkKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtLZXllZH07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtBdHRyaWJ1dGVQYXJ0LCBub0NoYW5nZSwgbm90aGluZ30gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmUsXG4gIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG4gIFBhcnRJbmZvLFxuICBQYXJ0VHlwZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7aXNTaW5nbGVFeHByZXNzaW9uLCBzZXRDb21taXR0ZWRWYWx1ZX0gZnJvbSAnLi4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuXG5jbGFzcyBMaXZlRGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICAgIGlmIChcbiAgICAgICEoXG4gICAgICAgIHBhcnRJbmZvLnR5cGUgPT09IFBhcnRUeXBlLlBST1BFUlRZIHx8XG4gICAgICAgIHBhcnRJbmZvLnR5cGUgPT09IFBhcnRUeXBlLkFUVFJJQlVURSB8fFxuICAgICAgICBwYXJ0SW5mby50eXBlID09PSBQYXJ0VHlwZS5CT09MRUFOX0FUVFJJQlVURVxuICAgICAgKVxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnVGhlIGBsaXZlYCBkaXJlY3RpdmUgaXMgbm90IGFsbG93ZWQgb24gY2hpbGQgb3IgZXZlbnQgYmluZGluZ3MnXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAoIWlzU2luZ2xlRXhwcmVzc2lvbihwYXJ0SW5mbykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignYGxpdmVgIGJpbmRpbmdzIGNhbiBvbmx5IGNvbnRhaW4gYSBzaW5nbGUgZXhwcmVzc2lvbicpO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlcih2YWx1ZTogdW5rbm93bikge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShwYXJ0OiBBdHRyaWJ1dGVQYXJ0LCBbdmFsdWVdOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgaWYgKHZhbHVlID09PSBub0NoYW5nZSB8fCB2YWx1ZSA9PT0gbm90aGluZykge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBjb25zdCBlbGVtZW50ID0gcGFydC5lbGVtZW50O1xuICAgIGNvbnN0IG5hbWUgPSBwYXJ0Lm5hbWU7XG5cbiAgICBpZiAocGFydC50eXBlID09PSBQYXJ0VHlwZS5QUk9QRVJUWSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgIGlmICh2YWx1ZSA9PT0gKGVsZW1lbnQgYXMgYW55KVtuYW1lXSkge1xuICAgICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChwYXJ0LnR5cGUgPT09IFBhcnRUeXBlLkJPT0xFQU5fQVRUUklCVVRFKSB7XG4gICAgICBpZiAoISF2YWx1ZSA9PT0gZWxlbWVudC5oYXNBdHRyaWJ1dGUobmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIG5vQ2hhbmdlO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocGFydC50eXBlID09PSBQYXJ0VHlwZS5BVFRSSUJVVEUpIHtcbiAgICAgIGlmIChlbGVtZW50LmdldEF0dHJpYnV0ZShuYW1lKSA9PT0gU3RyaW5nKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFJlc2V0cyB0aGUgcGFydCdzIHZhbHVlLCBjYXVzaW5nIGl0cyBkaXJ0eS1jaGVjayB0byBmYWlsIHNvIHRoYXQgaXRcbiAgICAvLyBhbHdheXMgc2V0cyB0aGUgdmFsdWUuXG4gICAgc2V0Q29tbWl0dGVkVmFsdWUocGFydCk7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG59XG5cbi8qKlxuICogQ2hlY2tzIGJpbmRpbmcgdmFsdWVzIGFnYWluc3QgbGl2ZSBET00gdmFsdWVzLCBpbnN0ZWFkIG9mIHByZXZpb3VzbHkgYm91bmRcbiAqIHZhbHVlcywgd2hlbiBkZXRlcm1pbmluZyB3aGV0aGVyIHRvIHVwZGF0ZSB0aGUgdmFsdWUuXG4gKlxuICogVGhpcyBpcyB1c2VmdWwgZm9yIGNhc2VzIHdoZXJlIHRoZSBET00gdmFsdWUgbWF5IGNoYW5nZSBmcm9tIG91dHNpZGUgb2ZcbiAqIGxpdC1odG1sLCBzdWNoIGFzIHdpdGggYSBiaW5kaW5nIHRvIGFuIGA8aW5wdXQ+YCBlbGVtZW50J3MgYHZhbHVlYCBwcm9wZXJ0eSxcbiAqIGEgY29udGVudCBlZGl0YWJsZSBlbGVtZW50cyB0ZXh0LCBvciB0byBhIGN1c3RvbSBlbGVtZW50IHRoYXQgY2hhbmdlcyBpdCdzXG4gKiBvd24gcHJvcGVydGllcyBvciBhdHRyaWJ1dGVzLlxuICpcbiAqIEluIHRoZXNlIGNhc2VzIGlmIHRoZSBET00gdmFsdWUgY2hhbmdlcywgYnV0IHRoZSB2YWx1ZSBzZXQgdGhyb3VnaCBsaXQtaHRtbFxuICogYmluZGluZ3MgaGFzbid0LCBsaXQtaHRtbCB3b24ndCBrbm93IHRvIHVwZGF0ZSB0aGUgRE9NIHZhbHVlIGFuZCB3aWxsIGxlYXZlXG4gKiBpdCBhbG9uZS4gSWYgdGhpcyBpcyBub3Qgd2hhdCB5b3Ugd2FudC0taWYgeW91IHdhbnQgdG8gb3ZlcndyaXRlIHRoZSBET01cbiAqIHZhbHVlIHdpdGggdGhlIGJvdW5kIHZhbHVlIG5vIG1hdHRlciB3aGF0LS11c2UgdGhlIGBsaXZlKClgIGRpcmVjdGl2ZTpcbiAqXG4gKiBgYGBqc1xuICogaHRtbGA8aW5wdXQgLnZhbHVlPSR7bGl2ZSh4KX0+YFxuICogYGBgXG4gKlxuICogYGxpdmUoKWAgcGVyZm9ybXMgYSBzdHJpY3QgZXF1YWxpdHkgY2hlY2sgYWdhaW5zdCB0aGUgbGl2ZSBET00gdmFsdWUsIGFuZCBpZlxuICogdGhlIG5ldyB2YWx1ZSBpcyBlcXVhbCB0byB0aGUgbGl2ZSB2YWx1ZSwgZG9lcyBub3RoaW5nLiBUaGlzIG1lYW5zIHRoYXRcbiAqIGBsaXZlKClgIHNob3VsZCBub3QgYmUgdXNlZCB3aGVuIHRoZSBiaW5kaW5nIHdpbGwgY2F1c2UgYSB0eXBlIGNvbnZlcnNpb24uIElmXG4gKiB5b3UgdXNlIGBsaXZlKClgIHdpdGggYW4gYXR0cmlidXRlIGJpbmRpbmcsIG1ha2Ugc3VyZSB0aGF0IG9ubHkgc3RyaW5ncyBhcmVcbiAqIHBhc3NlZCBpbiwgb3IgdGhlIGJpbmRpbmcgd2lsbCB1cGRhdGUgZXZlcnkgcmVuZGVyLlxuICovXG5leHBvcnQgY29uc3QgbGl2ZSA9IGRpcmVjdGl2ZShMaXZlRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtMaXZlRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIxIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG4vKipcbiAqIFJldHVybnMgYW4gaXRlcmFibGUgY29udGFpbmluZyB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgYGYodmFsdWUpYCBvbiBlYWNoXG4gKiB2YWx1ZSBpbiBgaXRlbXNgLlxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogYGBgdHNcbiAqIHJlbmRlcigpIHtcbiAqICAgcmV0dXJuIGh0bWxgXG4gKiAgICAgPHVsPlxuICogICAgICAgJHttYXAoaXRlbXMsIChpKSA9PiBodG1sYDxsaT4ke2l9PC9saT5gKX1cbiAqICAgICA8L3VsPlxuICogICBgO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiogbWFwPFQ+KFxuICBpdGVtczogSXRlcmFibGU8VD4gfCB1bmRlZmluZWQsXG4gIGY6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlcikgPT4gdW5rbm93blxuKSB7XG4gIGlmIChpdGVtcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgbGV0IGkgPSAwO1xuICAgIGZvciAoY29uc3QgdmFsdWUgb2YgaXRlbXMpIHtcbiAgICAgIHlpZWxkIGYodmFsdWUsIGkrKyk7XG4gICAgfVxuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLyoqXG4gKiBSZXR1cm5zIGFuIGl0ZXJhYmxlIG9mIGludGVnZXJzIGZyb20gYHN0YXJ0YCB0byBgZW5kYCAoZXhjbHVzaXZlKVxuICogaW5jcmVtZW50aW5nIGJ5IGBzdGVwYC5cbiAqXG4gKiBJZiBgc3RhcnRgIGlzIG9taXR0ZWQsIHRoZSByYW5nZSBzdGFydHMgYXQgYDBgLiBgc3RlcGAgZGVmYXVsdHMgdG8gYDFgLlxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogYGBgdHNcbiAqIHJlbmRlcigpIHtcbiAqICAgcmV0dXJuIGh0bWxgXG4gKiAgICAgJHttYXAocmFuZ2UoOCksICgpID0+IGh0bWxgPGRpdiBjbGFzcz1cImNlbGxcIj48L2Rpdj5gKX1cbiAqICAgYDtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmFuZ2UoZW5kOiBudW1iZXIpOiBJdGVyYWJsZTxudW1iZXI+O1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmdlKFxuICBzdGFydDogbnVtYmVyLFxuICBlbmQ6IG51bWJlcixcbiAgc3RlcD86IG51bWJlclxuKTogSXRlcmFibGU8bnVtYmVyPjtcbmV4cG9ydCBmdW5jdGlvbiogcmFuZ2Uoc3RhcnRPckVuZDogbnVtYmVyLCBlbmQ/OiBudW1iZXIsIHN0ZXAgPSAxKSB7XG4gIGNvbnN0IHN0YXJ0ID0gZW5kID09PSB1bmRlZmluZWQgPyAwIDogc3RhcnRPckVuZDtcbiAgZW5kID8/PSBzdGFydE9yRW5kO1xuICBmb3IgKGxldCBpID0gc3RhcnQ7IHN0ZXAgPiAwID8gaSA8IGVuZCA6IGVuZCA8IGk7IGkgKz0gc3RlcCkge1xuICAgIHlpZWxkIGk7XG4gIH1cbn1cbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0NoaWxkUGFydCwgbm9DaGFuZ2V9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7ZGlyZWN0aXZlLCBEaXJlY3RpdmUsIFBhcnRJbmZvLCBQYXJ0VHlwZX0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7XG4gIGluc2VydFBhcnQsXG4gIGdldENvbW1pdHRlZFZhbHVlLFxuICByZW1vdmVQYXJ0LFxuICBzZXRDb21taXR0ZWRWYWx1ZSxcbiAgc2V0Q2hpbGRQYXJ0VmFsdWUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcblxuZXhwb3J0IHR5cGUgS2V5Rm48VD4gPSAoaXRlbTogVCwgaW5kZXg6IG51bWJlcikgPT4gdW5rbm93bjtcbmV4cG9ydCB0eXBlIEl0ZW1UZW1wbGF0ZTxUPiA9IChpdGVtOiBULCBpbmRleDogbnVtYmVyKSA9PiB1bmtub3duO1xuXG4vLyBIZWxwZXIgZm9yIGdlbmVyYXRpbmcgYSBtYXAgb2YgYXJyYXkgaXRlbSB0byBpdHMgaW5kZXggb3ZlciBhIHN1YnNldFxuLy8gb2YgYW4gYXJyYXkgKHVzZWQgdG8gbGF6aWx5IGdlbmVyYXRlIGBuZXdLZXlUb0luZGV4TWFwYCBhbmRcbi8vIGBvbGRLZXlUb0luZGV4TWFwYClcbmNvbnN0IGdlbmVyYXRlTWFwID0gKGxpc3Q6IHVua25vd25bXSwgc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIpID0+IHtcbiAgY29uc3QgbWFwID0gbmV3IE1hcDx1bmtub3duLCBudW1iZXI+KCk7XG4gIGZvciAobGV0IGkgPSBzdGFydDsgaSA8PSBlbmQ7IGkrKykge1xuICAgIG1hcC5zZXQobGlzdFtpXSwgaSk7XG4gIH1cbiAgcmV0dXJuIG1hcDtcbn07XG5cbmNsYXNzIFJlcGVhdERpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX2l0ZW1LZXlzPzogdW5rbm93bltdO1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAocGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQ0hJTEQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncmVwZWF0KCkgY2FuIG9ubHkgYmUgdXNlZCBpbiB0ZXh0IGV4cHJlc3Npb25zJyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfZ2V0VmFsdWVzQW5kS2V5czxUPihcbiAgICBpdGVtczogSXRlcmFibGU8VD4sXG4gICAga2V5Rm5PclRlbXBsYXRlOiBLZXlGbjxUPiB8IEl0ZW1UZW1wbGF0ZTxUPixcbiAgICB0ZW1wbGF0ZT86IEl0ZW1UZW1wbGF0ZTxUPlxuICApIHtcbiAgICBsZXQga2V5Rm46IEtleUZuPFQ+IHwgdW5kZWZpbmVkO1xuICAgIGlmICh0ZW1wbGF0ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0ZW1wbGF0ZSA9IGtleUZuT3JUZW1wbGF0ZTtcbiAgICB9IGVsc2UgaWYgKGtleUZuT3JUZW1wbGF0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBrZXlGbiA9IGtleUZuT3JUZW1wbGF0ZSBhcyBLZXlGbjxUPjtcbiAgICB9XG4gICAgY29uc3Qga2V5cyA9IFtdO1xuICAgIGNvbnN0IHZhbHVlcyA9IFtdO1xuICAgIGxldCBpbmRleCA9IDA7XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgICBrZXlzW2luZGV4XSA9IGtleUZuID8ga2V5Rm4oaXRlbSwgaW5kZXgpIDogaW5kZXg7XG4gICAgICB2YWx1ZXNbaW5kZXhdID0gdGVtcGxhdGUhKGl0ZW0sIGluZGV4KTtcbiAgICAgIGluZGV4Kys7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB2YWx1ZXMsXG4gICAgICBrZXlzLFxuICAgIH07XG4gIH1cblxuICByZW5kZXI8VD4oaXRlbXM6IEl0ZXJhYmxlPFQ+LCB0ZW1wbGF0ZTogSXRlbVRlbXBsYXRlPFQ+KTogQXJyYXk8dW5rbm93bj47XG4gIHJlbmRlcjxUPihcbiAgICBpdGVtczogSXRlcmFibGU8VD4sXG4gICAga2V5Rm46IEtleUZuPFQ+IHwgSXRlbVRlbXBsYXRlPFQ+LFxuICAgIHRlbXBsYXRlOiBJdGVtVGVtcGxhdGU8VD5cbiAgKTogQXJyYXk8dW5rbm93bj47XG4gIHJlbmRlcjxUPihcbiAgICBpdGVtczogSXRlcmFibGU8VD4sXG4gICAga2V5Rm5PclRlbXBsYXRlOiBLZXlGbjxUPiB8IEl0ZW1UZW1wbGF0ZTxUPixcbiAgICB0ZW1wbGF0ZT86IEl0ZW1UZW1wbGF0ZTxUPlxuICApIHtcbiAgICByZXR1cm4gdGhpcy5fZ2V0VmFsdWVzQW5kS2V5cyhpdGVtcywga2V5Rm5PclRlbXBsYXRlLCB0ZW1wbGF0ZSkudmFsdWVzO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlPFQ+KFxuICAgIGNvbnRhaW5lclBhcnQ6IENoaWxkUGFydCxcbiAgICBbaXRlbXMsIGtleUZuT3JUZW1wbGF0ZSwgdGVtcGxhdGVdOiBbXG4gICAgICBJdGVyYWJsZTxUPixcbiAgICAgIEtleUZuPFQ+IHwgSXRlbVRlbXBsYXRlPFQ+LFxuICAgICAgSXRlbVRlbXBsYXRlPFQ+XG4gICAgXVxuICApIHtcbiAgICAvLyBPbGQgcGFydCAmIGtleSBsaXN0cyBhcmUgcmV0cmlldmVkIGZyb20gdGhlIGxhc3QgdXBkYXRlICh3aGljaCBtYXlcbiAgICAvLyBiZSBwcmltZWQgYnkgaHlkcmF0aW9uKVxuICAgIGNvbnN0IG9sZFBhcnRzID0gZ2V0Q29tbWl0dGVkVmFsdWUoXG4gICAgICBjb250YWluZXJQYXJ0XG4gICAgKSBhcyBBcnJheTxDaGlsZFBhcnQgfCBudWxsPjtcbiAgICBjb25zdCB7dmFsdWVzOiBuZXdWYWx1ZXMsIGtleXM6IG5ld0tleXN9ID0gdGhpcy5fZ2V0VmFsdWVzQW5kS2V5cyhcbiAgICAgIGl0ZW1zLFxuICAgICAga2V5Rm5PclRlbXBsYXRlLFxuICAgICAgdGVtcGxhdGVcbiAgICApO1xuXG4gICAgLy8gV2UgY2hlY2sgdGhhdCBvbGRQYXJ0cywgdGhlIGNvbW1pdHRlZCB2YWx1ZSwgaXMgYW4gQXJyYXkgYXMgYW5cbiAgICAvLyBpbmRpY2F0b3IgdGhhdCB0aGUgcHJldmlvdXMgdmFsdWUgY2FtZSBmcm9tIGEgcmVwZWF0KCkgY2FsbC4gSWZcbiAgICAvLyBvbGRQYXJ0cyBpcyBub3QgYW4gQXJyYXkgdGhlbiB0aGlzIGlzIHRoZSBmaXJzdCByZW5kZXIgYW5kIHdlIHJldHVyblxuICAgIC8vIGFuIGFycmF5IGZvciBsaXQtaHRtbCdzIGFycmF5IGhhbmRsaW5nIHRvIHJlbmRlciwgYW5kIHJlbWVtYmVyIHRoZVxuICAgIC8vIGtleXMuXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KG9sZFBhcnRzKSkge1xuICAgICAgdGhpcy5faXRlbUtleXMgPSBuZXdLZXlzO1xuICAgICAgcmV0dXJuIG5ld1ZhbHVlcztcbiAgICB9XG5cbiAgICAvLyBJbiBTU1IgaHlkcmF0aW9uIGl0J3MgcG9zc2libGUgZm9yIG9sZFBhcnRzIHRvIGJlIGFuIGFycmF5IGJ1dCBmb3IgdXNcbiAgICAvLyB0byBub3QgaGF2ZSBpdGVtIGtleXMgYmVjYXVzZSB0aGUgdXBkYXRlKCkgaGFzbid0IHJ1biB5ZXQuIFdlIHNldCB0aGVcbiAgICAvLyBrZXlzIHRvIGFuIGVtcHR5IGFycmF5LiBUaGlzIHdpbGwgY2F1c2UgYWxsIG9sZEtleS9uZXdLZXkgY29tcGFyaXNvbnNcbiAgICAvLyB0byBmYWlsIGFuZCBleGVjdXRpb24gdG8gZmFsbCB0byB0aGUgbGFzdCBuZXN0ZWQgYnJhY2ggYmVsb3cgd2hpY2hcbiAgICAvLyByZXVzZXMgdGhlIG9sZFBhcnQuXG4gICAgY29uc3Qgb2xkS2V5cyA9ICh0aGlzLl9pdGVtS2V5cyA/Pz0gW10pO1xuXG4gICAgLy8gTmV3IHBhcnQgbGlzdCB3aWxsIGJlIGJ1aWx0IHVwIGFzIHdlIGdvIChlaXRoZXIgcmV1c2VkIGZyb21cbiAgICAvLyBvbGQgcGFydHMgb3IgY3JlYXRlZCBmb3IgbmV3IGtleXMgaW4gdGhpcyB1cGRhdGUpLiBUaGlzIGlzXG4gICAgLy8gc2F2ZWQgaW4gdGhlIGFib3ZlIGNhY2hlIGF0IHRoZSBlbmQgb2YgdGhlIHVwZGF0ZS5cbiAgICBjb25zdCBuZXdQYXJ0czogQ2hpbGRQYXJ0W10gPSBbXTtcblxuICAgIC8vIE1hcHMgZnJvbSBrZXkgdG8gaW5kZXggZm9yIGN1cnJlbnQgYW5kIHByZXZpb3VzIHVwZGF0ZTsgdGhlc2VcbiAgICAvLyBhcmUgZ2VuZXJhdGVkIGxhemlseSBvbmx5IHdoZW4gbmVlZGVkIGFzIGEgcGVyZm9ybWFuY2VcbiAgICAvLyBvcHRpbWl6YXRpb24sIHNpbmNlIHRoZXkgYXJlIG9ubHkgcmVxdWlyZWQgZm9yIG11bHRpcGxlXG4gICAgLy8gbm9uLWNvbnRpZ3VvdXMgY2hhbmdlcyBpbiB0aGUgbGlzdCwgd2hpY2ggYXJlIGxlc3MgY29tbW9uLlxuICAgIGxldCBuZXdLZXlUb0luZGV4TWFwITogTWFwPHVua25vd24sIG51bWJlcj47XG4gICAgbGV0IG9sZEtleVRvSW5kZXhNYXAhOiBNYXA8dW5rbm93biwgbnVtYmVyPjtcblxuICAgIC8vIEhlYWQgYW5kIHRhaWwgcG9pbnRlcnMgdG8gb2xkIHBhcnRzIGFuZCBuZXcgdmFsdWVzXG4gICAgbGV0IG9sZEhlYWQgPSAwO1xuICAgIGxldCBvbGRUYWlsID0gb2xkUGFydHMubGVuZ3RoIC0gMTtcbiAgICBsZXQgbmV3SGVhZCA9IDA7XG4gICAgbGV0IG5ld1RhaWwgPSBuZXdWYWx1ZXMubGVuZ3RoIC0gMTtcblxuICAgIC8vIE92ZXJ2aWV3IG9mIE8obikgcmVjb25jaWxpYXRpb24gYWxnb3JpdGhtIChnZW5lcmFsIGFwcHJvYWNoXG4gICAgLy8gYmFzZWQgb24gaWRlYXMgZm91bmQgaW4gaXZpLCB2dWUsIHNuYWJiZG9tLCBldGMuKTpcbiAgICAvL1xuICAgIC8vICogV2Ugc3RhcnQgd2l0aCB0aGUgbGlzdCBvZiBvbGQgcGFydHMgYW5kIG5ldyB2YWx1ZXMgKGFuZFxuICAgIC8vICAgYXJyYXlzIG9mIHRoZWlyIHJlc3BlY3RpdmUga2V5cyksIGhlYWQvdGFpbCBwb2ludGVycyBpbnRvXG4gICAgLy8gICBlYWNoLCBhbmQgd2UgYnVpbGQgdXAgdGhlIG5ldyBsaXN0IG9mIHBhcnRzIGJ5IHVwZGF0aW5nXG4gICAgLy8gICAoYW5kIHdoZW4gbmVlZGVkLCBtb3ZpbmcpIG9sZCBwYXJ0cyBvciBjcmVhdGluZyBuZXcgb25lcy5cbiAgICAvLyAgIFRoZSBpbml0aWFsIHNjZW5hcmlvIG1pZ2h0IGxvb2sgbGlrZSB0aGlzIChmb3IgYnJldml0eSBvZlxuICAgIC8vICAgdGhlIGRpYWdyYW1zLCB0aGUgbnVtYmVycyBpbiB0aGUgYXJyYXkgcmVmbGVjdCBrZXlzXG4gICAgLy8gICBhc3NvY2lhdGVkIHdpdGggdGhlIG9sZCBwYXJ0cyBvciBuZXcgdmFsdWVzLCBhbHRob3VnaCBrZXlzXG4gICAgLy8gICBhbmQgcGFydHMvdmFsdWVzIGFyZSBhY3R1YWxseSBzdG9yZWQgaW4gcGFyYWxsZWwgYXJyYXlzXG4gICAgLy8gICBpbmRleGVkIHVzaW5nIHRoZSBzYW1lIGhlYWQvdGFpbCBwb2ludGVycyk6XG4gICAgLy9cbiAgICAvLyAgICAgIG9sZEhlYWQgdiAgICAgICAgICAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIDIsIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWyAsICAsICAsICAsICAsICAsICBdXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdIDwtIHJlZmxlY3RzIHRoZSB1c2VyJ3MgbmV3XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0gb3JkZXJcbiAgICAvLyAgICAgIG5ld0hlYWQgXiAgICAgICAgICAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIEl0ZXJhdGUgb2xkICYgbmV3IGxpc3RzIGZyb20gYm90aCBzaWRlcywgdXBkYXRpbmcsXG4gICAgLy8gICBzd2FwcGluZywgb3IgcmVtb3ZpbmcgcGFydHMgYXQgdGhlIGhlYWQvdGFpbCBsb2NhdGlvbnNcbiAgICAvLyAgIHVudGlsIG5laXRoZXIgaGVhZCBub3IgdGFpbCBjYW4gbW92ZS5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzoga2V5cyBhdCBoZWFkIHBvaW50ZXJzIG1hdGNoLCBzbyB1cGRhdGUgb2xkXG4gICAgLy8gICBwYXJ0IDAgaW4tcGxhY2UgKG5vIG5lZWQgdG8gbW92ZSBpdCkgYW5kIHJlY29yZCBwYXJ0IDAgaW5cbiAgICAvLyAgIHRoZSBgbmV3UGFydHNgIGxpc3QuIFRoZSBsYXN0IHRoaW5nIHdlIGRvIGlzIGFkdmFuY2UgdGhlXG4gICAgLy8gICBgb2xkSGVhZGAgYW5kIGBuZXdIZWFkYCBwb2ludGVycyAod2lsbCBiZSByZWZsZWN0ZWQgaW4gdGhlXG4gICAgLy8gICBuZXh0IGRpYWdyYW0pLlxuICAgIC8vXG4gICAgLy8gICAgICBvbGRIZWFkIHYgICAgICAgICAgICAgICAgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAyLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFswLCAgLCAgLCAgLCAgLCAgLCAgXSA8LSBoZWFkcyBtYXRjaGVkOiB1cGRhdGUgMFxuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSAgICBhbmQgYWR2YW5jZSBib3RoIG9sZEhlYWRcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJiBuZXdIZWFkXG4gICAgLy8gICAgICBuZXdIZWFkIF4gICAgICAgICAgICAgICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBoZWFkIHBvaW50ZXJzIGRvbid0IG1hdGNoLCBidXQgdGFpbFxuICAgIC8vICAgcG9pbnRlcnMgZG8sIHNvIHVwZGF0ZSBwYXJ0IDYgaW4gcGxhY2UgKG5vIG5lZWQgdG8gbW92ZVxuICAgIC8vICAgaXQpLCBhbmQgcmVjb3JkIHBhcnQgNiBpbiB0aGUgYG5ld1BhcnRzYCBsaXN0LiBMYXN0LFxuICAgIC8vICAgYWR2YW5jZSB0aGUgYG9sZFRhaWxgIGFuZCBgb2xkSGVhZGAgcG9pbnRlcnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgIG9sZEhlYWQgdiAgICAgICAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIDIsIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsICAsICAsICAsICAsICAsIDZdIDwtIHRhaWxzIG1hdGNoZWQ6IHVwZGF0ZSA2XG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIGJvdGggb2xkVGFpbFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmIG5ld1RhaWxcbiAgICAvLyAgICAgICAgIG5ld0hlYWQgXiAgICAgICAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIElmIG5laXRoZXIgaGVhZCBub3IgdGFpbCBtYXRjaDsgbmV4dCBjaGVjayBpZiBvbmUgb2YgdGhlXG4gICAgLy8gICBvbGQgaGVhZC90YWlsIGl0ZW1zIHdhcyByZW1vdmVkLiBXZSBmaXJzdCBuZWVkIHRvIGdlbmVyYXRlXG4gICAgLy8gICB0aGUgcmV2ZXJzZSBtYXAgb2YgbmV3IGtleXMgdG8gaW5kZXggKGBuZXdLZXlUb0luZGV4TWFwYCksXG4gICAgLy8gICB3aGljaCBpcyBkb25lIG9uY2UgbGF6aWx5IGFzIGEgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uLFxuICAgIC8vICAgc2luY2Ugd2Ugb25seSBoaXQgdGhpcyBjYXNlIGlmIG11bHRpcGxlIG5vbi1jb250aWd1b3VzXG4gICAgLy8gICBjaGFuZ2VzIHdlcmUgbWFkZS4gTm90ZSB0aGF0IGZvciBjb250aWd1b3VzIHJlbW92YWxcbiAgICAvLyAgIGFueXdoZXJlIGluIHRoZSBsaXN0LCB0aGUgaGVhZCBhbmQgdGFpbHMgd291bGQgYWR2YW5jZVxuICAgIC8vICAgZnJvbSBlaXRoZXIgZW5kIGFuZCBwYXNzIGVhY2ggb3RoZXIgYmVmb3JlIHdlIGdldCB0byB0aGlzXG4gICAgLy8gICBjYXNlIGFuZCByZW1vdmFscyB3b3VsZCBiZSBoYW5kbGVkIGluIHRoZSBmaW5hbCB3aGlsZSBsb29wXG4gICAgLy8gICB3aXRob3V0IG5lZWRpbmcgdG8gZ2VuZXJhdGUgdGhlIG1hcC5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogVGhlIGtleSBhdCBgb2xkVGFpbGAgd2FzIHJlbW92ZWQgKG5vIGxvbmdlclxuICAgIC8vICAgaW4gdGhlIGBuZXdLZXlUb0luZGV4TWFwYCksIHNvIHJlbW92ZSB0aGF0IHBhcnQgZnJvbSB0aGVcbiAgICAvLyAgIERPTSBhbmQgYWR2YW5jZSBqdXN0IHRoZSBgb2xkVGFpbGAgcG9pbnRlci5cbiAgICAvL1xuICAgIC8vICAgICAgICAgb2xkSGVhZCB2ICAgICAgICAgICB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgMiwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgICwgICwgICwgICwgICwgNl0gPC0gNSBub3QgaW4gbmV3IG1hcDogcmVtb3ZlXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIDUgYW5kIGFkdmFuY2Ugb2xkVGFpbFxuICAgIC8vICAgICAgICAgbmV3SGVhZCBeICAgICAgICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogT25jZSBoZWFkIGFuZCB0YWlsIGNhbm5vdCBtb3ZlLCBhbnkgbWlzbWF0Y2hlcyBhcmUgZHVlIHRvXG4gICAgLy8gICBlaXRoZXIgbmV3IG9yIG1vdmVkIGl0ZW1zOyBpZiBhIG5ldyBrZXkgaXMgaW4gdGhlIHByZXZpb3VzXG4gICAgLy8gICBcIm9sZCBrZXkgdG8gb2xkIGluZGV4XCIgbWFwLCBtb3ZlIHRoZSBvbGQgcGFydCB0byB0aGUgbmV3XG4gICAgLy8gICBsb2NhdGlvbiwgb3RoZXJ3aXNlIGNyZWF0ZSBhbmQgaW5zZXJ0IGEgbmV3IHBhcnQuIE5vdGVcbiAgICAvLyAgIHRoYXQgd2hlbiBtb3ZpbmcgYW4gb2xkIHBhcnQgd2UgbnVsbCBpdHMgcG9zaXRpb24gaW4gdGhlXG4gICAgLy8gICBvbGRQYXJ0cyBhcnJheSBpZiBpdCBsaWVzIGJldHdlZW4gdGhlIGhlYWQgYW5kIHRhaWwgc28gd2VcbiAgICAvLyAgIGtub3cgdG8gc2tpcCBpdCB3aGVuIHRoZSBwb2ludGVycyBnZXQgdGhlcmUuXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IG5laXRoZXIgaGVhZCBub3IgdGFpbCBtYXRjaCwgYW5kIG5laXRoZXJcbiAgICAvLyAgIHdlcmUgcmVtb3ZlZDsgc28gZmluZCB0aGUgYG5ld0hlYWRgIGtleSBpbiB0aGVcbiAgICAvLyAgIGBvbGRLZXlUb0luZGV4TWFwYCwgYW5kIG1vdmUgdGhhdCBvbGQgcGFydCdzIERPTSBpbnRvIHRoZVxuICAgIC8vICAgbmV4dCBoZWFkIHBvc2l0aW9uIChiZWZvcmUgYG9sZFBhcnRzW29sZEhlYWRdYCkuIExhc3QsXG4gICAgLy8gICBudWxsIHRoZSBwYXJ0IGluIHRoZSBgb2xkUGFydGAgYXJyYXkgc2luY2UgaXQgd2FzXG4gICAgLy8gICBzb21ld2hlcmUgaW4gdGhlIHJlbWFpbmluZyBvbGRQYXJ0cyBzdGlsbCB0byBiZSBzY2FubmVkXG4gICAgLy8gICAoYmV0d2VlbiB0aGUgaGVhZCBhbmQgdGFpbCBwb2ludGVycykgc28gdGhhdCB3ZSBrbm93IHRvXG4gICAgLy8gICBza2lwIHRoYXQgb2xkIHBhcnQgb24gZnV0dXJlIGl0ZXJhdGlvbnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgIG9sZEhlYWQgdiAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsICAsICAsICAsICAsIDZdIDwtIHN0dWNrOiB1cGRhdGUgJiBtb3ZlIDJcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICAgaW50byBwbGFjZSBhbmQgYWR2YW5jZVxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdIZWFkXG4gICAgLy8gICAgICAgICBuZXdIZWFkIF4gICAgICAgICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBOb3RlIHRoYXQgZm9yIG1vdmVzL2luc2VydGlvbnMgbGlrZSB0aGUgb25lIGFib3ZlLCBhIHBhcnRcbiAgICAvLyAgIGluc2VydGVkIGF0IHRoZSBoZWFkIHBvaW50ZXIgaXMgaW5zZXJ0ZWQgYmVmb3JlIHRoZVxuICAgIC8vICAgY3VycmVudCBgb2xkUGFydHNbb2xkSGVhZF1gLCBhbmQgYSBwYXJ0IGluc2VydGVkIGF0IHRoZVxuICAgIC8vICAgdGFpbCBwb2ludGVyIGlzIGluc2VydGVkIGJlZm9yZSBgbmV3UGFydHNbbmV3VGFpbCsxXWAuIFRoZVxuICAgIC8vICAgc2VlbWluZyBhc3ltbWV0cnkgbGllcyBpbiB0aGUgZmFjdCB0aGF0IG5ldyBwYXJ0cyBhcmVcbiAgICAvLyAgIG1vdmVkIGludG8gcGxhY2Ugb3V0c2lkZSBpbiwgc28gdG8gdGhlIHJpZ2h0IG9mIHRoZSBoZWFkXG4gICAgLy8gICBwb2ludGVyIGFyZSBvbGQgcGFydHMsIGFuZCB0byB0aGUgcmlnaHQgb2YgdGhlIHRhaWxcbiAgICAvLyAgIHBvaW50ZXIgYXJlIG5ldyBwYXJ0cy5cbiAgICAvL1xuICAgIC8vICogV2UgYWx3YXlzIHJlc3RhcnQgYmFjayBmcm9tIHRoZSB0b3Agb2YgdGhlIGFsZ29yaXRobSxcbiAgICAvLyAgIGFsbG93aW5nIG1hdGNoaW5nIGFuZCBzaW1wbGUgdXBkYXRlcyBpbiBwbGFjZSB0b1xuICAgIC8vICAgY29udGludWUuLi5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogdGhlIGhlYWQgcG9pbnRlcnMgb25jZSBhZ2FpbiBtYXRjaCwgc29cbiAgICAvLyAgIHNpbXBseSB1cGRhdGUgcGFydCAxIGFuZCByZWNvcmQgaXQgaW4gdGhlIGBuZXdQYXJ0c2BcbiAgICAvLyAgIGFycmF5LiAgTGFzdCwgYWR2YW5jZSBib3RoIGhlYWQgcG9pbnRlcnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgIG9sZEhlYWQgdiAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsICAsICAsICAsIDZdIDwtIGhlYWRzIG1hdGNoZWQ6IHVwZGF0ZSAxXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIGJvdGggb2xkSGVhZFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmIG5ld0hlYWRcbiAgICAvLyAgICAgICAgICAgIG5ld0hlYWQgXiAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIEFzIG1lbnRpb25lZCBhYm92ZSwgaXRlbXMgdGhhdCB3ZXJlIG1vdmVkIGFzIGEgcmVzdWx0IG9mXG4gICAgLy8gICBiZWluZyBzdHVjayAodGhlIGZpbmFsIGVsc2UgY2xhdXNlIGluIHRoZSBjb2RlIGJlbG93KSBhcmVcbiAgICAvLyAgIG1hcmtlZCB3aXRoIG51bGwsIHNvIHdlIGFsd2F5cyBhZHZhbmNlIG9sZCBwb2ludGVycyBvdmVyXG4gICAgLy8gICB0aGVzZSBzbyB3ZSdyZSBjb21wYXJpbmcgdGhlIG5leHQgYWN0dWFsIG9sZCB2YWx1ZSBvblxuICAgIC8vICAgZWl0aGVyIGVuZC5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogYG9sZEhlYWRgIGlzIG51bGwgKGFscmVhZHkgcGxhY2VkIGluXG4gICAgLy8gICBuZXdQYXJ0cyksIHNvIGFkdmFuY2UgYG9sZEhlYWRgLlxuICAgIC8vXG4gICAgLy8gICAgICAgICAgICBvbGRIZWFkIHYgICAgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAtLCAzLCA0LCA1LCA2XSA8LSBvbGQgaGVhZCBhbHJlYWR5IHVzZWQ6XG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsICAsICAsICAsIDZdICAgIGFkdmFuY2Ugb2xkSGVhZFxuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XVxuICAgIC8vICAgICAgICAgICAgICAgbmV3SGVhZCBeICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogTm90ZSBpdCdzIG5vdCBjcml0aWNhbCB0byBtYXJrIG9sZCBwYXJ0cyBhcyBudWxsIHdoZW4gdGhleVxuICAgIC8vICAgYXJlIG1vdmVkIGZyb20gaGVhZCB0byB0YWlsIG9yIHRhaWwgdG8gaGVhZCwgc2luY2UgdGhleVxuICAgIC8vICAgd2lsbCBiZSBvdXRzaWRlIHRoZSBwb2ludGVyIHJhbmdlIGFuZCBuZXZlciB2aXNpdGVkIGFnYWluLlxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBIZXJlIHRoZSBvbGQgdGFpbCBrZXkgbWF0Y2hlcyB0aGUgbmV3IGhlYWRcbiAgICAvLyAgIGtleSwgc28gdGhlIHBhcnQgYXQgdGhlIGBvbGRUYWlsYCBwb3NpdGlvbiBhbmQgbW92ZSBpdHNcbiAgICAvLyAgIERPTSB0byB0aGUgbmV3IGhlYWQgcG9zaXRpb24gKGJlZm9yZSBgb2xkUGFydHNbb2xkSGVhZF1gKS5cbiAgICAvLyAgIExhc3QsIGFkdmFuY2UgYG9sZFRhaWxgIGFuZCBgbmV3SGVhZGAgcG9pbnRlcnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgICAgICAgIG9sZEhlYWQgdiAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsIDQsICAsICAsIDZdIDwtIG9sZCB0YWlsIG1hdGNoZXMgbmV3XG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgaGVhZDogdXBkYXRlICYgbW92ZSA0LFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkdmFuY2Ugb2xkVGFpbCAmIG5ld0hlYWRcbiAgICAvLyAgICAgICAgICAgICAgIG5ld0hlYWQgXiAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IE9sZCBhbmQgbmV3IGhlYWQga2V5cyBtYXRjaCwgc28gdXBkYXRlIHRoZVxuICAgIC8vICAgb2xkIGhlYWQgcGFydCBpbiBwbGFjZSwgYW5kIGFkdmFuY2UgdGhlIGBvbGRIZWFkYCBhbmRcbiAgICAvLyAgIGBuZXdIZWFkYCBwb2ludGVycy5cbiAgICAvL1xuICAgIC8vICAgICAgICAgICAgICAgb2xkSGVhZCB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgLSwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgMSwgNCwgMywgICAsNl0gPC0gaGVhZHMgbWF0Y2g6IHVwZGF0ZSAzXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIG9sZEhlYWQgJlxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdIZWFkXG4gICAgLy8gICAgICAgICAgICAgICAgICBuZXdIZWFkIF4gIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBPbmNlIHRoZSBuZXcgb3Igb2xkIHBvaW50ZXJzIG1vdmUgcGFzdCBlYWNoIG90aGVyIHRoZW4gYWxsXG4gICAgLy8gICB3ZSBoYXZlIGxlZnQgaXMgYWRkaXRpb25zIChpZiBvbGQgbGlzdCBleGhhdXN0ZWQpIG9yXG4gICAgLy8gICByZW1vdmFscyAoaWYgbmV3IGxpc3QgZXhoYXVzdGVkKS4gVGhvc2UgYXJlIGhhbmRsZWQgaW4gdGhlXG4gICAgLy8gICBmaW5hbCB3aGlsZSBsb29wcyBhdCB0aGUgZW5kLlxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBgb2xkSGVhZGAgZXhjZWVkZWQgYG9sZFRhaWxgLCBzbyB3ZSdyZSBkb25lXG4gICAgLy8gICB3aXRoIHRoZSBtYWluIGxvb3AuICBDcmVhdGUgdGhlIHJlbWFpbmluZyBwYXJ0IGFuZCBpbnNlcnRcbiAgICAvLyAgIGl0IGF0IHRoZSBuZXcgaGVhZCBwb3NpdGlvbiwgYW5kIHRoZSB1cGRhdGUgaXMgY29tcGxldGUuXG4gICAgLy9cbiAgICAvLyAgICAgICAgICAgICAgICAgICAob2xkSGVhZCA+IG9sZFRhaWwpXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsIDQsIDMsIDcgLDZdIDwtIGNyZWF0ZSBhbmQgaW5zZXJ0IDdcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl1cbiAgICAvLyAgICAgICAgICAgICAgICAgICAgIG5ld0hlYWQgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIE5vdGUgdGhhdCB0aGUgb3JkZXIgb2YgdGhlIGlmL2Vsc2UgY2xhdXNlcyBpcyBub3RcbiAgICAvLyAgIGltcG9ydGFudCB0byB0aGUgYWxnb3JpdGhtLCBhcyBsb25nIGFzIHRoZSBudWxsIGNoZWNrc1xuICAgIC8vICAgY29tZSBmaXJzdCAodG8gZW5zdXJlIHdlJ3JlIGFsd2F5cyB3b3JraW5nIG9uIHZhbGlkIG9sZFxuICAgIC8vICAgcGFydHMpIGFuZCB0aGF0IHRoZSBmaW5hbCBlbHNlIGNsYXVzZSBjb21lcyBsYXN0IChzaW5jZVxuICAgIC8vICAgdGhhdCdzIHdoZXJlIHRoZSBleHBlbnNpdmUgbW92ZXMgb2NjdXIpLiBUaGUgb3JkZXIgb2ZcbiAgICAvLyAgIHJlbWFpbmluZyBjbGF1c2VzIGlzIGlzIGp1c3QgYSBzaW1wbGUgZ3Vlc3MgYXQgd2hpY2ggY2FzZXNcbiAgICAvLyAgIHdpbGwgYmUgbW9zdCBjb21tb24uXG4gICAgLy9cbiAgICAvLyAqIE5vdGUsIHdlIGNvdWxkIGNhbGN1bGF0ZSB0aGUgbG9uZ2VzdFxuICAgIC8vICAgaW5jcmVhc2luZyBzdWJzZXF1ZW5jZSAoTElTKSBvZiBvbGQgaXRlbXMgaW4gbmV3IHBvc2l0aW9uLFxuICAgIC8vICAgYW5kIG9ubHkgbW92ZSB0aG9zZSBub3QgaW4gdGhlIExJUyBzZXQuIEhvd2V2ZXIgdGhhdCBjb3N0c1xuICAgIC8vICAgTyhubG9nbikgdGltZSBhbmQgYWRkcyBhIGJpdCBtb3JlIGNvZGUsIGFuZCBvbmx5IGhlbHBzXG4gICAgLy8gICBtYWtlIHJhcmUgdHlwZXMgb2YgbXV0YXRpb25zIHJlcXVpcmUgZmV3ZXIgbW92ZXMuIFRoZVxuICAgIC8vICAgYWJvdmUgaGFuZGxlcyByZW1vdmVzLCBhZGRzLCByZXZlcnNhbCwgc3dhcHMsIGFuZCBzaW5nbGVcbiAgICAvLyAgIG1vdmVzIG9mIGNvbnRpZ3VvdXMgaXRlbXMgaW4gbGluZWFyIHRpbWUsIGluIHRoZSBtaW5pbXVtXG4gICAgLy8gICBudW1iZXIgb2YgbW92ZXMuIEFzIHRoZSBudW1iZXIgb2YgbXVsdGlwbGUgbW92ZXMgd2hlcmUgTElTXG4gICAgLy8gICBtaWdodCBoZWxwIGFwcHJvYWNoZXMgYSByYW5kb20gc2h1ZmZsZSwgdGhlIExJU1xuICAgIC8vICAgb3B0aW1pemF0aW9uIGJlY29tZXMgbGVzcyBoZWxwZnVsLCBzbyBpdCBzZWVtcyBub3Qgd29ydGhcbiAgICAvLyAgIHRoZSBjb2RlIGF0IHRoaXMgcG9pbnQuIENvdWxkIHJlY29uc2lkZXIgaWYgYSBjb21wZWxsaW5nXG4gICAgLy8gICBjYXNlIGFyaXNlcy5cblxuICAgIHdoaWxlIChvbGRIZWFkIDw9IG9sZFRhaWwgJiYgbmV3SGVhZCA8PSBuZXdUYWlsKSB7XG4gICAgICBpZiAob2xkUGFydHNbb2xkSGVhZF0gPT09IG51bGwpIHtcbiAgICAgICAgLy8gYG51bGxgIG1lYW5zIG9sZCBwYXJ0IGF0IGhlYWQgaGFzIGFscmVhZHkgYmVlbiB1c2VkXG4gICAgICAgIC8vIGJlbG93OyBza2lwXG4gICAgICAgIG9sZEhlYWQrKztcbiAgICAgIH0gZWxzZSBpZiAob2xkUGFydHNbb2xkVGFpbF0gPT09IG51bGwpIHtcbiAgICAgICAgLy8gYG51bGxgIG1lYW5zIG9sZCBwYXJ0IGF0IHRhaWwgaGFzIGFscmVhZHkgYmVlbiB1c2VkXG4gICAgICAgIC8vIGJlbG93OyBza2lwXG4gICAgICAgIG9sZFRhaWwtLTtcbiAgICAgIH0gZWxzZSBpZiAob2xkS2V5c1tvbGRIZWFkXSA9PT0gbmV3S2V5c1tuZXdIZWFkXSkge1xuICAgICAgICAvLyBPbGQgaGVhZCBtYXRjaGVzIG5ldyBoZWFkOyB1cGRhdGUgaW4gcGxhY2VcbiAgICAgICAgbmV3UGFydHNbbmV3SGVhZF0gPSBzZXRDaGlsZFBhcnRWYWx1ZShcbiAgICAgICAgICBvbGRQYXJ0c1tvbGRIZWFkXSEsXG4gICAgICAgICAgbmV3VmFsdWVzW25ld0hlYWRdXG4gICAgICAgICk7XG4gICAgICAgIG9sZEhlYWQrKztcbiAgICAgICAgbmV3SGVhZCsrO1xuICAgICAgfSBlbHNlIGlmIChvbGRLZXlzW29sZFRhaWxdID09PSBuZXdLZXlzW25ld1RhaWxdKSB7XG4gICAgICAgIC8vIE9sZCB0YWlsIG1hdGNoZXMgbmV3IHRhaWw7IHVwZGF0ZSBpbiBwbGFjZVxuICAgICAgICBuZXdQYXJ0c1tuZXdUYWlsXSA9IHNldENoaWxkUGFydFZhbHVlKFxuICAgICAgICAgIG9sZFBhcnRzW29sZFRhaWxdISxcbiAgICAgICAgICBuZXdWYWx1ZXNbbmV3VGFpbF1cbiAgICAgICAgKTtcbiAgICAgICAgb2xkVGFpbC0tO1xuICAgICAgICBuZXdUYWlsLS07XG4gICAgICB9IGVsc2UgaWYgKG9sZEtleXNbb2xkSGVhZF0gPT09IG5ld0tleXNbbmV3VGFpbF0pIHtcbiAgICAgICAgLy8gT2xkIGhlYWQgbWF0Y2hlcyBuZXcgdGFpbDsgdXBkYXRlIGFuZCBtb3ZlIHRvIG5ldyB0YWlsXG4gICAgICAgIG5ld1BhcnRzW25ld1RhaWxdID0gc2V0Q2hpbGRQYXJ0VmFsdWUoXG4gICAgICAgICAgb2xkUGFydHNbb2xkSGVhZF0hLFxuICAgICAgICAgIG5ld1ZhbHVlc1tuZXdUYWlsXVxuICAgICAgICApO1xuICAgICAgICBpbnNlcnRQYXJ0KGNvbnRhaW5lclBhcnQsIG5ld1BhcnRzW25ld1RhaWwgKyAxXSwgb2xkUGFydHNbb2xkSGVhZF0hKTtcbiAgICAgICAgb2xkSGVhZCsrO1xuICAgICAgICBuZXdUYWlsLS07XG4gICAgICB9IGVsc2UgaWYgKG9sZEtleXNbb2xkVGFpbF0gPT09IG5ld0tleXNbbmV3SGVhZF0pIHtcbiAgICAgICAgLy8gT2xkIHRhaWwgbWF0Y2hlcyBuZXcgaGVhZDsgdXBkYXRlIGFuZCBtb3ZlIHRvIG5ldyBoZWFkXG4gICAgICAgIG5ld1BhcnRzW25ld0hlYWRdID0gc2V0Q2hpbGRQYXJ0VmFsdWUoXG4gICAgICAgICAgb2xkUGFydHNbb2xkVGFpbF0hLFxuICAgICAgICAgIG5ld1ZhbHVlc1tuZXdIZWFkXVxuICAgICAgICApO1xuICAgICAgICBpbnNlcnRQYXJ0KGNvbnRhaW5lclBhcnQsIG9sZFBhcnRzW29sZEhlYWRdISwgb2xkUGFydHNbb2xkVGFpbF0hKTtcbiAgICAgICAgb2xkVGFpbC0tO1xuICAgICAgICBuZXdIZWFkKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobmV3S2V5VG9JbmRleE1hcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gTGF6aWx5IGdlbmVyYXRlIGtleS10by1pbmRleCBtYXBzLCB1c2VkIGZvciByZW1vdmFscyAmXG4gICAgICAgICAgLy8gbW92ZXMgYmVsb3dcbiAgICAgICAgICBuZXdLZXlUb0luZGV4TWFwID0gZ2VuZXJhdGVNYXAobmV3S2V5cywgbmV3SGVhZCwgbmV3VGFpbCk7XG4gICAgICAgICAgb2xkS2V5VG9JbmRleE1hcCA9IGdlbmVyYXRlTWFwKG9sZEtleXMsIG9sZEhlYWQsIG9sZFRhaWwpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghbmV3S2V5VG9JbmRleE1hcC5oYXMob2xkS2V5c1tvbGRIZWFkXSkpIHtcbiAgICAgICAgICAvLyBPbGQgaGVhZCBpcyBubyBsb25nZXIgaW4gbmV3IGxpc3Q7IHJlbW92ZVxuICAgICAgICAgIHJlbW92ZVBhcnQob2xkUGFydHNbb2xkSGVhZF0hKTtcbiAgICAgICAgICBvbGRIZWFkKys7XG4gICAgICAgIH0gZWxzZSBpZiAoIW5ld0tleVRvSW5kZXhNYXAuaGFzKG9sZEtleXNbb2xkVGFpbF0pKSB7XG4gICAgICAgICAgLy8gT2xkIHRhaWwgaXMgbm8gbG9uZ2VyIGluIG5ldyBsaXN0OyByZW1vdmVcbiAgICAgICAgICByZW1vdmVQYXJ0KG9sZFBhcnRzW29sZFRhaWxdISk7XG4gICAgICAgICAgb2xkVGFpbC0tO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIEFueSBtaXNtYXRjaGVzIGF0IHRoaXMgcG9pbnQgYXJlIGR1ZSB0byBhZGRpdGlvbnMgb3JcbiAgICAgICAgICAvLyBtb3Zlczsgc2VlIGlmIHdlIGhhdmUgYW4gb2xkIHBhcnQgd2UgY2FuIHJldXNlIGFuZCBtb3ZlXG4gICAgICAgICAgLy8gaW50byBwbGFjZVxuICAgICAgICAgIGNvbnN0IG9sZEluZGV4ID0gb2xkS2V5VG9JbmRleE1hcC5nZXQobmV3S2V5c1tuZXdIZWFkXSk7XG4gICAgICAgICAgY29uc3Qgb2xkUGFydCA9IG9sZEluZGV4ICE9PSB1bmRlZmluZWQgPyBvbGRQYXJ0c1tvbGRJbmRleF0gOiBudWxsO1xuICAgICAgICAgIGlmIChvbGRQYXJ0ID09PSBudWxsKSB7XG4gICAgICAgICAgICAvLyBObyBvbGQgcGFydCBmb3IgdGhpcyB2YWx1ZTsgY3JlYXRlIGEgbmV3IG9uZSBhbmRcbiAgICAgICAgICAgIC8vIGluc2VydCBpdFxuICAgICAgICAgICAgY29uc3QgbmV3UGFydCA9IGluc2VydFBhcnQoY29udGFpbmVyUGFydCwgb2xkUGFydHNbb2xkSGVhZF0hKTtcbiAgICAgICAgICAgIHNldENoaWxkUGFydFZhbHVlKG5ld1BhcnQsIG5ld1ZhbHVlc1tuZXdIZWFkXSk7XG4gICAgICAgICAgICBuZXdQYXJ0c1tuZXdIZWFkXSA9IG5ld1BhcnQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFJldXNlIG9sZCBwYXJ0XG4gICAgICAgICAgICBuZXdQYXJ0c1tuZXdIZWFkXSA9IHNldENoaWxkUGFydFZhbHVlKG9sZFBhcnQsIG5ld1ZhbHVlc1tuZXdIZWFkXSk7XG4gICAgICAgICAgICBpbnNlcnRQYXJ0KGNvbnRhaW5lclBhcnQsIG9sZFBhcnRzW29sZEhlYWRdISwgb2xkUGFydCk7XG4gICAgICAgICAgICAvLyBUaGlzIG1hcmtzIHRoZSBvbGQgcGFydCBhcyBoYXZpbmcgYmVlbiB1c2VkLCBzbyB0aGF0XG4gICAgICAgICAgICAvLyBpdCB3aWxsIGJlIHNraXBwZWQgaW4gdGhlIGZpcnN0IHR3byBjaGVja3MgYWJvdmVcbiAgICAgICAgICAgIG9sZFBhcnRzW29sZEluZGV4IGFzIG51bWJlcl0gPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBuZXdIZWFkKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQWRkIHBhcnRzIGZvciBhbnkgcmVtYWluaW5nIG5ldyB2YWx1ZXNcbiAgICB3aGlsZSAobmV3SGVhZCA8PSBuZXdUYWlsKSB7XG4gICAgICAvLyBGb3IgYWxsIHJlbWFpbmluZyBhZGRpdGlvbnMsIHdlIGluc2VydCBiZWZvcmUgbGFzdCBuZXdcbiAgICAgIC8vIHRhaWwsIHNpbmNlIG9sZCBwb2ludGVycyBhcmUgbm8gbG9uZ2VyIHZhbGlkXG4gICAgICBjb25zdCBuZXdQYXJ0ID0gaW5zZXJ0UGFydChjb250YWluZXJQYXJ0LCBuZXdQYXJ0c1tuZXdUYWlsICsgMV0pO1xuICAgICAgc2V0Q2hpbGRQYXJ0VmFsdWUobmV3UGFydCwgbmV3VmFsdWVzW25ld0hlYWRdKTtcbiAgICAgIG5ld1BhcnRzW25ld0hlYWQrK10gPSBuZXdQYXJ0O1xuICAgIH1cbiAgICAvLyBSZW1vdmUgYW55IHJlbWFpbmluZyB1bnVzZWQgb2xkIHBhcnRzXG4gICAgd2hpbGUgKG9sZEhlYWQgPD0gb2xkVGFpbCkge1xuICAgICAgY29uc3Qgb2xkUGFydCA9IG9sZFBhcnRzW29sZEhlYWQrK107XG4gICAgICBpZiAob2xkUGFydCAhPT0gbnVsbCkge1xuICAgICAgICByZW1vdmVQYXJ0KG9sZFBhcnQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNhdmUgb3JkZXIgb2YgbmV3IHBhcnRzIGZvciBuZXh0IHJvdW5kXG4gICAgdGhpcy5faXRlbUtleXMgPSBuZXdLZXlzO1xuICAgIC8vIERpcmVjdGx5IHNldCBwYXJ0IHZhbHVlLCBieXBhc3NpbmcgaXQncyBkaXJ0eS1jaGVja2luZ1xuICAgIHNldENvbW1pdHRlZFZhbHVlKGNvbnRhaW5lclBhcnQsIG5ld1BhcnRzKTtcbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZXBlYXREaXJlY3RpdmVGbiB7XG4gIDxUPihcbiAgICBpdGVtczogSXRlcmFibGU8VD4sXG4gICAga2V5Rm5PclRlbXBsYXRlOiBLZXlGbjxUPiB8IEl0ZW1UZW1wbGF0ZTxUPixcbiAgICB0ZW1wbGF0ZT86IEl0ZW1UZW1wbGF0ZTxUPlxuICApOiB1bmtub3duO1xuICA8VD4oaXRlbXM6IEl0ZXJhYmxlPFQ+LCB0ZW1wbGF0ZTogSXRlbVRlbXBsYXRlPFQ+KTogdW5rbm93bjtcbiAgPFQ+KFxuICAgIGl0ZW1zOiBJdGVyYWJsZTxUPixcbiAgICBrZXlGbjogS2V5Rm48VD4gfCBJdGVtVGVtcGxhdGU8VD4sXG4gICAgdGVtcGxhdGU6IEl0ZW1UZW1wbGF0ZTxUPlxuICApOiB1bmtub3duO1xufVxuXG4vKipcbiAqIEEgZGlyZWN0aXZlIHRoYXQgcmVwZWF0cyBhIHNlcmllcyBvZiB2YWx1ZXMgKHVzdWFsbHkgYFRlbXBsYXRlUmVzdWx0c2ApXG4gKiBnZW5lcmF0ZWQgZnJvbSBhbiBpdGVyYWJsZSwgYW5kIHVwZGF0ZXMgdGhvc2UgaXRlbXMgZWZmaWNpZW50bHkgd2hlbiB0aGVcbiAqIGl0ZXJhYmxlIGNoYW5nZXMgYmFzZWQgb24gdXNlci1wcm92aWRlZCBga2V5c2AgYXNzb2NpYXRlZCB3aXRoIGVhY2ggaXRlbS5cbiAqXG4gKiBOb3RlIHRoYXQgaWYgYSBga2V5Rm5gIGlzIHByb3ZpZGVkLCBzdHJpY3Qga2V5LXRvLURPTSBtYXBwaW5nIGlzIG1haW50YWluZWQsXG4gKiBtZWFuaW5nIHByZXZpb3VzIERPTSBmb3IgYSBnaXZlbiBrZXkgaXMgbW92ZWQgaW50byB0aGUgbmV3IHBvc2l0aW9uIGlmXG4gKiBuZWVkZWQsIGFuZCBET00gd2lsbCBuZXZlciBiZSByZXVzZWQgd2l0aCB2YWx1ZXMgZm9yIGRpZmZlcmVudCBrZXlzIChuZXcgRE9NXG4gKiB3aWxsIGFsd2F5cyBiZSBjcmVhdGVkIGZvciBuZXcga2V5cykuIFRoaXMgaXMgZ2VuZXJhbGx5IHRoZSBtb3N0IGVmZmljaWVudFxuICogd2F5IHRvIHVzZSBgcmVwZWF0YCBzaW5jZSBpdCBwZXJmb3JtcyBtaW5pbXVtIHVubmVjZXNzYXJ5IHdvcmsgZm9yIGluc2VydGlvbnNcbiAqIGFuZCByZW1vdmFscy5cbiAqXG4gKiBUaGUgYGtleUZuYCB0YWtlcyB0d28gcGFyYW1ldGVycywgdGhlIGl0ZW0gYW5kIGl0cyBpbmRleCwgYW5kIHJldHVybnMgYSB1bmlxdWUga2V5IHZhbHVlLlxuICpcbiAqIGBgYGpzXG4gKiBodG1sYFxuICogICA8b2w+XG4gKiAgICAgJHtyZXBlYXQodGhpcy5pdGVtcywgKGl0ZW0pID0+IGl0ZW0uaWQsIChpdGVtLCBpbmRleCkgPT4ge1xuICogICAgICAgcmV0dXJuIGh0bWxgPGxpPiR7aW5kZXh9OiAke2l0ZW0ubmFtZX08L2xpPmA7XG4gKiAgICAgfSl9XG4gKiAgIDwvb2w+XG4gKiBgXG4gKiBgYGBcbiAqXG4gKiAqKkltcG9ydGFudCoqOiBJZiBwcm92aWRpbmcgYSBga2V5Rm5gLCBrZXlzICptdXN0KiBiZSB1bmlxdWUgZm9yIGFsbCBpdGVtcyBpbiBhXG4gKiBnaXZlbiBjYWxsIHRvIGByZXBlYXRgLiBUaGUgYmVoYXZpb3Igd2hlbiB0d28gb3IgbW9yZSBpdGVtcyBoYXZlIHRoZSBzYW1lIGtleVxuICogaXMgdW5kZWZpbmVkLlxuICpcbiAqIElmIG5vIGBrZXlGbmAgaXMgcHJvdmlkZWQsIHRoaXMgZGlyZWN0aXZlIHdpbGwgcGVyZm9ybSBzaW1pbGFyIHRvIG1hcHBpbmdcbiAqIGl0ZW1zIHRvIHZhbHVlcywgYW5kIERPTSB3aWxsIGJlIHJldXNlZCBhZ2FpbnN0IHBvdGVudGlhbGx5IGRpZmZlcmVudCBpdGVtcy5cbiAqL1xuZXhwb3J0IGNvbnN0IHJlcGVhdCA9IGRpcmVjdGl2ZShSZXBlYXREaXJlY3RpdmUpIGFzIFJlcGVhdERpcmVjdGl2ZUZuO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge1JlcGVhdERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtBdHRyaWJ1dGVQYXJ0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmUsXG4gIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG4gIFBhcnRJbmZvLFxuICBQYXJ0VHlwZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcblxuLyoqXG4gKiBBIGtleS12YWx1ZSBzZXQgb2YgQ1NTIHByb3BlcnRpZXMgYW5kIHZhbHVlcy5cbiAqXG4gKiBUaGUga2V5IHNob3VsZCBiZSBlaXRoZXIgYSB2YWxpZCBDU1MgcHJvcGVydHkgbmFtZSBzdHJpbmcsIGxpa2VcbiAqIGAnYmFja2dyb3VuZC1jb2xvcidgLCBvciBhIHZhbGlkIEphdmFTY3JpcHQgY2FtZWwgY2FzZSBwcm9wZXJ0eSBuYW1lXG4gKiBmb3IgQ1NTU3R5bGVEZWNsYXJhdGlvbiBsaWtlIGBiYWNrZ3JvdW5kQ29sb3JgLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFN0eWxlSW5mbyB7XG4gIFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfCBudW1iZXIgfCB1bmRlZmluZWQgfCBudWxsO1xufVxuXG5jb25zdCBpbXBvcnRhbnQgPSAnaW1wb3J0YW50Jztcbi8vIFRoZSBsZWFkaW5nIHNwYWNlIGlzIGltcG9ydGFudFxuY29uc3QgaW1wb3J0YW50RmxhZyA9ICcgIScgKyBpbXBvcnRhbnQ7XG4vLyBIb3cgbWFueSBjaGFyYWN0ZXJzIHRvIHJlbW92ZSBmcm9tIGEgdmFsdWUsIGFzIGEgbmVnYXRpdmUgbnVtYmVyXG5jb25zdCBmbGFnVHJpbSA9IDAgLSBpbXBvcnRhbnRGbGFnLmxlbmd0aDtcblxuY2xhc3MgU3R5bGVNYXBEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBfcHJldmlvdXNTdHlsZVByb3BlcnRpZXM/OiBTZXQ8c3RyaW5nPjtcblxuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gICAgaWYgKFxuICAgICAgcGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQVRUUklCVVRFIHx8XG4gICAgICBwYXJ0SW5mby5uYW1lICE9PSAnc3R5bGUnIHx8XG4gICAgICAocGFydEluZm8uc3RyaW5ncz8ubGVuZ3RoIGFzIG51bWJlcikgPiAyXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdUaGUgYHN0eWxlTWFwYCBkaXJlY3RpdmUgbXVzdCBiZSB1c2VkIGluIHRoZSBgc3R5bGVgIGF0dHJpYnV0ZSAnICtcbiAgICAgICAgICAnYW5kIG11c3QgYmUgdGhlIG9ubHkgcGFydCBpbiB0aGUgYXR0cmlidXRlLidcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcmVuZGVyKHN0eWxlSW5mbzogUmVhZG9ubHk8U3R5bGVJbmZvPikge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhzdHlsZUluZm8pLnJlZHVjZSgoc3R5bGUsIHByb3ApID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gc3R5bGVJbmZvW3Byb3BdO1xuICAgICAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHN0eWxlO1xuICAgICAgfVxuICAgICAgLy8gQ29udmVydCBwcm9wZXJ0eSBuYW1lcyBmcm9tIGNhbWVsLWNhc2UgdG8gZGFzaC1jYXNlLCBpLmUuOlxuICAgICAgLy8gIGBiYWNrZ3JvdW5kQ29sb3JgIC0+IGBiYWNrZ3JvdW5kLWNvbG9yYFxuICAgICAgLy8gVmVuZG9yLXByZWZpeGVkIG5hbWVzIG5lZWQgYW4gZXh0cmEgYC1gIGFwcGVuZGVkIHRvIGZyb250OlxuICAgICAgLy8gIGB3ZWJraXRBcHBlYXJhbmNlYCAtPiBgLXdlYmtpdC1hcHBlYXJhbmNlYFxuICAgICAgLy8gRXhjZXB0aW9uIGlzIGFueSBwcm9wZXJ0eSBuYW1lIGNvbnRhaW5pbmcgYSBkYXNoLCBpbmNsdWRpbmdcbiAgICAgIC8vIGN1c3RvbSBwcm9wZXJ0aWVzOyB3ZSBhc3N1bWUgdGhlc2UgYXJlIGFscmVhZHkgZGFzaC1jYXNlZCBpLmUuOlxuICAgICAgLy8gIGAtLW15LWJ1dHRvbi1jb2xvcmAgLS0+IGAtLW15LWJ1dHRvbi1jb2xvcmBcbiAgICAgIHByb3AgPSBwcm9wLmluY2x1ZGVzKCctJylcbiAgICAgICAgPyBwcm9wXG4gICAgICAgIDogcHJvcFxuICAgICAgICAgICAgLnJlcGxhY2UoLyg/Ol4od2Via2l0fG1venxtc3xvKXwpKD89W0EtWl0pL2csICctJCYnKVxuICAgICAgICAgICAgLnRvTG93ZXJDYXNlKCk7XG4gICAgICByZXR1cm4gc3R5bGUgKyBgJHtwcm9wfToke3ZhbHVlfTtgO1xuICAgIH0sICcnKTtcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShwYXJ0OiBBdHRyaWJ1dGVQYXJ0LCBbc3R5bGVJbmZvXTogRGlyZWN0aXZlUGFyYW1ldGVyczx0aGlzPikge1xuICAgIGNvbnN0IHtzdHlsZX0gPSBwYXJ0LmVsZW1lbnQgYXMgSFRNTEVsZW1lbnQ7XG5cbiAgICBpZiAodGhpcy5fcHJldmlvdXNTdHlsZVByb3BlcnRpZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fcHJldmlvdXNTdHlsZVByb3BlcnRpZXMgPSBuZXcgU2V0KCk7XG4gICAgICBmb3IgKGNvbnN0IG5hbWUgaW4gc3R5bGVJbmZvKSB7XG4gICAgICAgIHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzLmFkZChuYW1lKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnJlbmRlcihzdHlsZUluZm8pO1xuICAgIH1cblxuICAgIC8vIFJlbW92ZSBvbGQgcHJvcGVydGllcyB0aGF0IG5vIGxvbmdlciBleGlzdCBpbiBzdHlsZUluZm9cbiAgICAvLyBXZSB1c2UgZm9yRWFjaCgpIGluc3RlYWQgb2YgZm9yLW9mIHNvIHRoYXQgcmUgZG9uJ3QgcmVxdWlyZSBkb3duLWxldmVsXG4gICAgLy8gaXRlcmF0aW9uLlxuICAgIHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzIS5mb3JFYWNoKChuYW1lKSA9PiB7XG4gICAgICAvLyBJZiB0aGUgbmFtZSBpc24ndCBpbiBzdHlsZUluZm8gb3IgaXQncyBudWxsL3VuZGVmaW5lZFxuICAgICAgaWYgKHN0eWxlSW5mb1tuYW1lXSA9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzIS5kZWxldGUobmFtZSk7XG4gICAgICAgIGlmIChuYW1lLmluY2x1ZGVzKCctJykpIHtcbiAgICAgICAgICBzdHlsZS5yZW1vdmVQcm9wZXJ0eShuYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBOb3RlIHJlc2V0IHVzaW5nIGVtcHR5IHN0cmluZyAodnMgbnVsbCkgYXMgSUUxMSBkb2VzIG5vdCBhbHdheXNcbiAgICAgICAgICAvLyByZXNldCB2aWEgbnVsbCAoaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0VsZW1lbnRDU1NJbmxpbmVTdHlsZS9zdHlsZSNzZXR0aW5nX3N0eWxlcylcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICAgIChzdHlsZSBhcyBhbnkpW25hbWVdID0gJyc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIEFkZCBvciB1cGRhdGUgcHJvcGVydGllc1xuICAgIGZvciAoY29uc3QgbmFtZSBpbiBzdHlsZUluZm8pIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gc3R5bGVJbmZvW25hbWVdO1xuICAgICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5fcHJldmlvdXNTdHlsZVByb3BlcnRpZXMuYWRkKG5hbWUpO1xuICAgICAgICBjb25zdCBpc0ltcG9ydGFudCA9XG4gICAgICAgICAgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJiB2YWx1ZS5lbmRzV2l0aChpbXBvcnRhbnRGbGFnKTtcbiAgICAgICAgaWYgKG5hbWUuaW5jbHVkZXMoJy0nKSB8fCBpc0ltcG9ydGFudCkge1xuICAgICAgICAgIHN0eWxlLnNldFByb3BlcnR5KFxuICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgIGlzSW1wb3J0YW50XG4gICAgICAgICAgICAgID8gKHZhbHVlIGFzIHN0cmluZykuc2xpY2UoMCwgZmxhZ1RyaW0pXG4gICAgICAgICAgICAgIDogKHZhbHVlIGFzIHN0cmluZyksXG4gICAgICAgICAgICBpc0ltcG9ydGFudCA/IGltcG9ydGFudCA6ICcnXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICAgIChzdHlsZSBhcyBhbnkpW25hbWVdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG59XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCBhcHBsaWVzIENTUyBwcm9wZXJ0aWVzIHRvIGFuIGVsZW1lbnQuXG4gKlxuICogYHN0eWxlTWFwYCBjYW4gb25seSBiZSB1c2VkIGluIHRoZSBgc3R5bGVgIGF0dHJpYnV0ZSBhbmQgbXVzdCBiZSB0aGUgb25seVxuICogZXhwcmVzc2lvbiBpbiB0aGUgYXR0cmlidXRlLiBJdCB0YWtlcyB0aGUgcHJvcGVydHkgbmFtZXMgaW4gdGhlXG4gKiB7QGxpbmsgU3R5bGVJbmZvIHN0eWxlSW5mb30gb2JqZWN0IGFuZCBhZGRzIHRoZSBwcm9wZXJ0aWVzIHRvIHRoZSBpbmxpbmVcbiAqIHN0eWxlIG9mIHRoZSBlbGVtZW50LlxuICpcbiAqIFByb3BlcnR5IG5hbWVzIHdpdGggZGFzaGVzIChgLWApIGFyZSBhc3N1bWVkIHRvIGJlIHZhbGlkIENTU1xuICogcHJvcGVydHkgbmFtZXMgYW5kIHNldCBvbiB0aGUgZWxlbWVudCdzIHN0eWxlIG9iamVjdCB1c2luZyBgc2V0UHJvcGVydHkoKWAuXG4gKiBOYW1lcyB3aXRob3V0IGRhc2hlcyBhcmUgYXNzdW1lZCB0byBiZSBjYW1lbENhc2VkIEphdmFTY3JpcHQgcHJvcGVydHkgbmFtZXNcbiAqIGFuZCBzZXQgb24gdGhlIGVsZW1lbnQncyBzdHlsZSBvYmplY3QgdXNpbmcgcHJvcGVydHkgYXNzaWdubWVudCwgYWxsb3dpbmcgdGhlXG4gKiBzdHlsZSBvYmplY3QgdG8gdHJhbnNsYXRlIEphdmFTY3JpcHQtc3R5bGUgbmFtZXMgdG8gQ1NTIHByb3BlcnR5IG5hbWVzLlxuICpcbiAqIEZvciBleGFtcGxlIGBzdHlsZU1hcCh7YmFja2dyb3VuZENvbG9yOiAncmVkJywgJ2JvcmRlci10b3AnOiAnNXB4JywgJy0tc2l6ZSc6XG4gKiAnMCd9KWAgc2V0cyB0aGUgYGJhY2tncm91bmQtY29sb3JgLCBgYm9yZGVyLXRvcGAgYW5kIGAtLXNpemVgIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHN0eWxlSW5mb1xuICogQHNlZSB7QGxpbmsgaHR0cHM6Ly9saXQuZGV2L2RvY3MvdGVtcGxhdGVzL2RpcmVjdGl2ZXMvI3N0eWxlbWFwIHN0eWxlTWFwIGNvZGUgc2FtcGxlcyBvbiBMaXQuZGV2fVxuICovXG5leHBvcnQgY29uc3Qgc3R5bGVNYXAgPSBkaXJlY3RpdmUoU3R5bGVNYXBEaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge1N0eWxlTWFwRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge25vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgRGlyZWN0aXZlLCBQYXJ0SW5mbywgUGFydFR5cGV9IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5cbmNsYXNzIFRlbXBsYXRlQ29udGVudERpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX3ByZXZpb3VzVGVtcGxhdGU/OiBIVE1MVGVtcGxhdGVFbGVtZW50O1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAocGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQ0hJTEQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigndGVtcGxhdGVDb250ZW50IGNhbiBvbmx5IGJlIHVzZWQgaW4gY2hpbGQgYmluZGluZ3MnKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXIodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQpIHtcbiAgICBpZiAodGhpcy5fcHJldmlvdXNUZW1wbGF0ZSA9PT0gdGVtcGxhdGUpIHtcbiAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICB9XG4gICAgdGhpcy5fcHJldmlvdXNUZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICAgIHJldHVybiBkb2N1bWVudC5pbXBvcnROb2RlKHRlbXBsYXRlLmNvbnRlbnQsIHRydWUpO1xuICB9XG59XG5cbi8qKlxuICogUmVuZGVycyB0aGUgY29udGVudCBvZiBhIHRlbXBsYXRlIGVsZW1lbnQgYXMgSFRNTC5cbiAqXG4gKiBOb3RlLCB0aGUgdGVtcGxhdGUgc2hvdWxkIGJlIGRldmVsb3BlciBjb250cm9sbGVkIGFuZCBub3QgdXNlciBjb250cm9sbGVkLlxuICogUmVuZGVyaW5nIGEgdXNlci1jb250cm9sbGVkIHRlbXBsYXRlIHdpdGggdGhpcyBkaXJlY3RpdmVcbiAqIGNvdWxkIGxlYWQgdG8gY3Jvc3Mtc2l0ZS1zY3JpcHRpbmcgdnVsbmVyYWJpbGl0aWVzLlxuICovXG5leHBvcnQgY29uc3QgdGVtcGxhdGVDb250ZW50ID0gZGlyZWN0aXZlKFRlbXBsYXRlQ29udGVudERpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7VGVtcGxhdGVDb250ZW50RGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge25vdGhpbmcsIFRlbXBsYXRlUmVzdWx0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIERpcmVjdGl2ZSwgUGFydEluZm8sIFBhcnRUeXBlfSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuXG5jb25zdCBIVE1MX1JFU1VMVCA9IDE7XG5cbmV4cG9ydCBjbGFzcyBVbnNhZmVIVE1MRGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgc3RhdGljIGRpcmVjdGl2ZU5hbWUgPSAndW5zYWZlSFRNTCc7XG4gIHN0YXRpYyByZXN1bHRUeXBlID0gSFRNTF9SRVNVTFQ7XG5cbiAgcHJpdmF0ZSBfdmFsdWU6IHVua25vd24gPSBub3RoaW5nO1xuICBwcml2YXRlIF90ZW1wbGF0ZVJlc3VsdD86IFRlbXBsYXRlUmVzdWx0O1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAocGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQ0hJTEQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYCR7XG4gICAgICAgICAgKHRoaXMuY29uc3RydWN0b3IgYXMgdHlwZW9mIFVuc2FmZUhUTUxEaXJlY3RpdmUpLmRpcmVjdGl2ZU5hbWVcbiAgICAgICAgfSgpIGNhbiBvbmx5IGJlIHVzZWQgaW4gY2hpbGQgYmluZGluZ3NgXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlcih2YWx1ZTogc3RyaW5nIHwgdHlwZW9mIG5vdGhpbmcgfCB0eXBlb2Ygbm9DaGFuZ2UgfCB1bmRlZmluZWQgfCBudWxsKSB7XG4gICAgaWYgKHZhbHVlID09PSBub3RoaW5nIHx8IHZhbHVlID09IG51bGwpIHtcbiAgICAgIHRoaXMuX3RlbXBsYXRlUmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgICAgcmV0dXJuICh0aGlzLl92YWx1ZSA9IHZhbHVlKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlID09PSBub0NoYW5nZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHZhbHVlICE9ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGAke1xuICAgICAgICAgICh0aGlzLmNvbnN0cnVjdG9yIGFzIHR5cGVvZiBVbnNhZmVIVE1MRGlyZWN0aXZlKS5kaXJlY3RpdmVOYW1lXG4gICAgICAgIH0oKSBjYWxsZWQgd2l0aCBhIG5vbi1zdHJpbmcgdmFsdWVgXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAodmFsdWUgPT09IHRoaXMuX3ZhbHVlKSB7XG4gICAgICByZXR1cm4gdGhpcy5fdGVtcGxhdGVSZXN1bHQ7XG4gICAgfVxuICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gICAgY29uc3Qgc3RyaW5ncyA9IFt2YWx1ZV0gYXMgdW5rbm93biBhcyBUZW1wbGF0ZVN0cmluZ3NBcnJheTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIChzdHJpbmdzIGFzIGFueSkucmF3ID0gc3RyaW5ncztcbiAgICAvLyBXQVJOSU5HOiBpbXBlcnNvbmF0aW5nIGEgVGVtcGxhdGVSZXN1bHQgbGlrZSB0aGlzIGlzIGV4dHJlbWVseVxuICAgIC8vIGRhbmdlcm91cy4gVGhpcmQtcGFydHkgZGlyZWN0aXZlcyBzaG91bGQgbm90IGRvIHRoaXMuXG4gICAgcmV0dXJuICh0aGlzLl90ZW1wbGF0ZVJlc3VsdCA9IHtcbiAgICAgIC8vIENhc3QgdG8gYSBrbm93biBzZXQgb2YgaW50ZWdlcnMgdGhhdCBzYXRpc2Z5IFJlc3VsdFR5cGUgc28gdGhhdCB3ZVxuICAgICAgLy8gZG9uJ3QgaGF2ZSB0byBleHBvcnQgUmVzdWx0VHlwZSBhbmQgcG9zc2libHkgZW5jb3VyYWdlIHRoaXMgcGF0dGVybi5cbiAgICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgICBbJ18kbGl0VHlwZSQnXTogKHRoaXMuY29uc3RydWN0b3IgYXMgdHlwZW9mIFVuc2FmZUhUTUxEaXJlY3RpdmUpXG4gICAgICAgIC5yZXN1bHRUeXBlIGFzIDEgfCAyLFxuICAgICAgc3RyaW5ncyxcbiAgICAgIHZhbHVlczogW10sXG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW5kZXJzIHRoZSByZXN1bHQgYXMgSFRNTCwgcmF0aGVyIHRoYW4gdGV4dC5cbiAqXG4gKiBUaGUgdmFsdWVzIGB1bmRlZmluZWRgLCBgbnVsbGAsIGFuZCBgbm90aGluZ2AsIHdpbGwgYWxsIHJlc3VsdCBpbiBubyBjb250ZW50XG4gKiAoZW1wdHkgc3RyaW5nKSBiZWluZyByZW5kZXJlZC5cbiAqXG4gKiBOb3RlLCB0aGlzIGlzIHVuc2FmZSB0byB1c2Ugd2l0aCBhbnkgdXNlci1wcm92aWRlZCBpbnB1dCB0aGF0IGhhc24ndCBiZWVuXG4gKiBzYW5pdGl6ZWQgb3IgZXNjYXBlZCwgYXMgaXQgbWF5IGxlYWQgdG8gY3Jvc3Mtc2l0ZS1zY3JpcHRpbmdcbiAqIHZ1bG5lcmFiaWxpdGllcy5cbiAqL1xuZXhwb3J0IGNvbnN0IHVuc2FmZUhUTUwgPSBkaXJlY3RpdmUoVW5zYWZlSFRNTERpcmVjdGl2ZSk7XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtkaXJlY3RpdmV9IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge1Vuc2FmZUhUTUxEaXJlY3RpdmV9IGZyb20gJy4vdW5zYWZlLWh0bWwuanMnO1xuXG5jb25zdCBTVkdfUkVTVUxUID0gMjtcblxuY2xhc3MgVW5zYWZlU1ZHRGlyZWN0aXZlIGV4dGVuZHMgVW5zYWZlSFRNTERpcmVjdGl2ZSB7XG4gIHN0YXRpYyBvdmVycmlkZSBkaXJlY3RpdmVOYW1lID0gJ3Vuc2FmZVNWRyc7XG4gIHN0YXRpYyBvdmVycmlkZSByZXN1bHRUeXBlID0gU1ZHX1JFU1VMVDtcbn1cblxuLyoqXG4gKiBSZW5kZXJzIHRoZSByZXN1bHQgYXMgU1ZHLCByYXRoZXIgdGhhbiB0ZXh0LlxuICpcbiAqIFRoZSB2YWx1ZXMgYHVuZGVmaW5lZGAsIGBudWxsYCwgYW5kIGBub3RoaW5nYCwgd2lsbCBhbGwgcmVzdWx0IGluIG5vIGNvbnRlbnRcbiAqIChlbXB0eSBzdHJpbmcpIGJlaW5nIHJlbmRlcmVkLlxuICpcbiAqIE5vdGUsIHRoaXMgaXMgdW5zYWZlIHRvIHVzZSB3aXRoIGFueSB1c2VyLXByb3ZpZGVkIGlucHV0IHRoYXQgaGFzbid0IGJlZW5cbiAqIHNhbml0aXplZCBvciBlc2NhcGVkLCBhcyBpdCBtYXkgbGVhZCB0byBjcm9zcy1zaXRlLXNjcmlwdGluZ1xuICogdnVsbmVyYWJpbGl0aWVzLlxuICovXG5leHBvcnQgY29uc3QgdW5zYWZlU1ZHID0gZGlyZWN0aXZlKFVuc2FmZVNWR0RpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7VW5zYWZlU1ZHRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge1BhcnQsIG5vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2lzUHJpbWl0aXZlfSBmcm9tICcuLi9kaXJlY3RpdmUtaGVscGVycy5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgQXN5bmNEaXJlY3RpdmV9IGZyb20gJy4uL2FzeW5jLWRpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge1BhdXNlciwgUHNldWRvV2Vha1JlZn0gZnJvbSAnLi9wcml2YXRlLWFzeW5jLWhlbHBlcnMuanMnO1xuXG5jb25zdCBpc1Byb21pc2UgPSAoeDogdW5rbm93bikgPT4ge1xuICByZXR1cm4gIWlzUHJpbWl0aXZlKHgpICYmIHR5cGVvZiAoeCBhcyB7dGhlbj86IHVua25vd259KS50aGVuID09PSAnZnVuY3Rpb24nO1xufTtcbi8vIEVmZmVjdGl2ZWx5IGluZmluaXR5LCBidXQgYSBTTUkuXG5jb25zdCBfaW5maW5pdHkgPSAweDNmZmZmZmZmO1xuXG5leHBvcnQgY2xhc3MgVW50aWxEaXJlY3RpdmUgZXh0ZW5kcyBBc3luY0RpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX19sYXN0UmVuZGVyZWRJbmRleDogbnVtYmVyID0gX2luZmluaXR5O1xuICBwcml2YXRlIF9fdmFsdWVzOiB1bmtub3duW10gPSBbXTtcbiAgcHJpdmF0ZSBfX3dlYWtUaGlzID0gbmV3IFBzZXVkb1dlYWtSZWYodGhpcyk7XG4gIHByaXZhdGUgX19wYXVzZXIgPSBuZXcgUGF1c2VyKCk7XG5cbiAgcmVuZGVyKC4uLmFyZ3M6IEFycmF5PHVua25vd24+KSB7XG4gICAgcmV0dXJuIGFyZ3MuZmluZCgoeCkgPT4gIWlzUHJvbWlzZSh4KSkgPz8gbm9DaGFuZ2U7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUoX3BhcnQ6IFBhcnQsIGFyZ3M6IEFycmF5PHVua25vd24+KSB7XG4gICAgY29uc3QgcHJldmlvdXNWYWx1ZXMgPSB0aGlzLl9fdmFsdWVzO1xuICAgIGxldCBwcmV2aW91c0xlbmd0aCA9IHByZXZpb3VzVmFsdWVzLmxlbmd0aDtcbiAgICB0aGlzLl9fdmFsdWVzID0gYXJncztcblxuICAgIGNvbnN0IHdlYWtUaGlzID0gdGhpcy5fX3dlYWtUaGlzO1xuICAgIGNvbnN0IHBhdXNlciA9IHRoaXMuX19wYXVzZXI7XG5cbiAgICAvLyBJZiBvdXIgaW5pdGlhbCByZW5kZXIgb2NjdXJzIHdoaWxlIGRpc2Nvbm5lY3RlZCwgZW5zdXJlIHRoYXQgdGhlIHBhdXNlclxuICAgIC8vIGFuZCB3ZWFrVGhpcyBhcmUgaW4gdGhlIGRpc2Nvbm5lY3RlZCBzdGF0ZVxuICAgIGlmICghdGhpcy5pc0Nvbm5lY3RlZCkge1xuICAgICAgdGhpcy5kaXNjb25uZWN0ZWQoKTtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIC8vIElmIHdlJ3ZlIHJlbmRlcmVkIGEgaGlnaGVyLXByaW9yaXR5IHZhbHVlIGFscmVhZHksIHN0b3AuXG4gICAgICBpZiAoaSA+IHRoaXMuX19sYXN0UmVuZGVyZWRJbmRleCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgY29uc3QgdmFsdWUgPSBhcmdzW2ldO1xuXG4gICAgICAvLyBSZW5kZXIgbm9uLVByb21pc2UgdmFsdWVzIGltbWVkaWF0ZWx5XG4gICAgICBpZiAoIWlzUHJvbWlzZSh2YWx1ZSkpIHtcbiAgICAgICAgdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4ID0gaTtcbiAgICAgICAgLy8gU2luY2UgYSBsb3dlci1wcmlvcml0eSB2YWx1ZSB3aWxsIG5ldmVyIG92ZXJ3cml0ZSBhIGhpZ2hlci1wcmlvcml0eVxuICAgICAgICAvLyBzeW5jaHJvbm91cyB2YWx1ZSwgd2UgY2FuIHN0b3AgcHJvY2Vzc2luZyBub3cuXG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhpcyBpcyBhIFByb21pc2Ugd2UndmUgYWxyZWFkeSBoYW5kbGVkLCBza2lwIGl0LlxuICAgICAgaWYgKGkgPCBwcmV2aW91c0xlbmd0aCAmJiB2YWx1ZSA9PT0gcHJldmlvdXNWYWx1ZXNbaV0pIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIFdlIGhhdmUgYSBQcm9taXNlIHRoYXQgd2UgaGF2ZW4ndCBzZWVuIGJlZm9yZSwgc28gcHJpb3JpdGllcyBtYXkgaGF2ZVxuICAgICAgLy8gY2hhbmdlZC4gRm9yZ2V0IHdoYXQgd2UgcmVuZGVyZWQgYmVmb3JlLlxuICAgICAgdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4ID0gX2luZmluaXR5O1xuICAgICAgcHJldmlvdXNMZW5ndGggPSAwO1xuXG4gICAgICAvLyBOb3RlLCB0aGUgY2FsbGJhY2sgYXZvaWRzIGNsb3Npbmcgb3ZlciBgdGhpc2Agc28gdGhhdCB0aGUgZGlyZWN0aXZlXG4gICAgICAvLyBjYW4gYmUgZ2MnZWQgYmVmb3JlIHRoZSBwcm9taXNlIHJlc29sdmVzOyBpbnN0ZWFkIGB0aGlzYCBpcyByZXRyaWV2ZWRcbiAgICAgIC8vIGZyb20gYHdlYWtUaGlzYCwgd2hpY2ggY2FuIGJyZWFrIHRoZSBoYXJkIHJlZmVyZW5jZSBpbiB0aGUgY2xvc3VyZSB3aGVuXG4gICAgICAvLyB0aGUgZGlyZWN0aXZlIGRpc2Nvbm5lY3RzXG4gICAgICBQcm9taXNlLnJlc29sdmUodmFsdWUpLnRoZW4oYXN5bmMgKHJlc3VsdDogdW5rbm93bikgPT4ge1xuICAgICAgICAvLyBJZiB3ZSdyZSBkaXNjb25uZWN0ZWQsIHdhaXQgdW50aWwgd2UncmUgKG1heWJlKSByZWNvbm5lY3RlZFxuICAgICAgICAvLyBUaGUgd2hpbGUgbG9vcCBoZXJlIGhhbmRsZXMgdGhlIGNhc2UgdGhhdCB0aGUgY29ubmVjdGlvbiBzdGF0ZVxuICAgICAgICAvLyB0aHJhc2hlcywgY2F1c2luZyB0aGUgcGF1c2VyIHRvIHJlc3VtZSBhbmQgdGhlbiBnZXQgcmUtcGF1c2VkXG4gICAgICAgIHdoaWxlIChwYXVzZXIuZ2V0KCkpIHtcbiAgICAgICAgICBhd2FpdCBwYXVzZXIuZ2V0KCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgdGhlIGNhbGxiYWNrIGdldHMgaGVyZSBhbmQgdGhlcmUgaXMgbm8gYHRoaXNgLCBpdCBtZWFucyB0aGF0IHRoZVxuICAgICAgICAvLyBkaXJlY3RpdmUgaGFzIGJlZW4gZGlzY29ubmVjdGVkIGFuZCBnYXJiYWdlIGNvbGxlY3RlZCBhbmQgd2UgZG9uJ3RcbiAgICAgICAgLy8gbmVlZCB0byBkbyBhbnl0aGluZyBlbHNlXG4gICAgICAgIGNvbnN0IF90aGlzID0gd2Vha1RoaXMuZGVyZWYoKTtcbiAgICAgICAgaWYgKF90aGlzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb25zdCBpbmRleCA9IF90aGlzLl9fdmFsdWVzLmluZGV4T2YodmFsdWUpO1xuICAgICAgICAgIC8vIElmIHN0YXRlLnZhbHVlcyBkb2Vzbid0IGNvbnRhaW4gdGhlIHZhbHVlLCB3ZSd2ZSByZS1yZW5kZXJlZCB3aXRob3V0XG4gICAgICAgICAgLy8gdGhlIHZhbHVlLCBzbyBkb24ndCByZW5kZXIgaXQuIFRoZW4sIG9ubHkgcmVuZGVyIGlmIHRoZSB2YWx1ZSBpc1xuICAgICAgICAgIC8vIGhpZ2hlci1wcmlvcml0eSB0aGFuIHdoYXQncyBhbHJlYWR5IGJlZW4gcmVuZGVyZWQuXG4gICAgICAgICAgaWYgKGluZGV4ID4gLTEgJiYgaW5kZXggPCBfdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4KSB7XG4gICAgICAgICAgICBfdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgICBfdGhpcy5zZXRWYWx1ZShyZXN1bHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG5cbiAgb3ZlcnJpZGUgZGlzY29ubmVjdGVkKCkge1xuICAgIHRoaXMuX193ZWFrVGhpcy5kaXNjb25uZWN0KCk7XG4gICAgdGhpcy5fX3BhdXNlci5wYXVzZSgpO1xuICB9XG5cbiAgb3ZlcnJpZGUgcmVjb25uZWN0ZWQoKSB7XG4gICAgdGhpcy5fX3dlYWtUaGlzLnJlY29ubmVjdCh0aGlzKTtcbiAgICB0aGlzLl9fcGF1c2VyLnJlc3VtZSgpO1xuICB9XG59XG5cbi8qKlxuICogUmVuZGVycyBvbmUgb2YgYSBzZXJpZXMgb2YgdmFsdWVzLCBpbmNsdWRpbmcgUHJvbWlzZXMsIHRvIGEgUGFydC5cbiAqXG4gKiBWYWx1ZXMgYXJlIHJlbmRlcmVkIGluIHByaW9yaXR5IG9yZGVyLCB3aXRoIHRoZSBmaXJzdCBhcmd1bWVudCBoYXZpbmcgdGhlXG4gKiBoaWdoZXN0IHByaW9yaXR5IGFuZCB0aGUgbGFzdCBhcmd1bWVudCBoYXZpbmcgdGhlIGxvd2VzdCBwcmlvcml0eS4gSWYgYVxuICogdmFsdWUgaXMgYSBQcm9taXNlLCBsb3ctcHJpb3JpdHkgdmFsdWVzIHdpbGwgYmUgcmVuZGVyZWQgdW50aWwgaXQgcmVzb2x2ZXMuXG4gKlxuICogVGhlIHByaW9yaXR5IG9mIHZhbHVlcyBjYW4gYmUgdXNlZCB0byBjcmVhdGUgcGxhY2Vob2xkZXIgY29udGVudCBmb3IgYXN5bmNcbiAqIGRhdGEuIEZvciBleGFtcGxlLCBhIFByb21pc2Ugd2l0aCBwZW5kaW5nIGNvbnRlbnQgY2FuIGJlIHRoZSBmaXJzdCxcbiAqIGhpZ2hlc3QtcHJpb3JpdHksIGFyZ3VtZW50LCBhbmQgYSBub25fcHJvbWlzZSBsb2FkaW5nIGluZGljYXRvciB0ZW1wbGF0ZSBjYW5cbiAqIGJlIHVzZWQgYXMgdGhlIHNlY29uZCwgbG93ZXItcHJpb3JpdHksIGFyZ3VtZW50LiBUaGUgbG9hZGluZyBpbmRpY2F0b3Igd2lsbFxuICogcmVuZGVyIGltbWVkaWF0ZWx5LCBhbmQgdGhlIHByaW1hcnkgY29udGVudCB3aWxsIHJlbmRlciB3aGVuIHRoZSBQcm9taXNlXG4gKiByZXNvbHZlcy5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBjb25zdCBjb250ZW50ID0gZmV0Y2goJy4vY29udGVudC50eHQnKS50aGVuKHIgPT4gci50ZXh0KCkpO1xuICogaHRtbGAke3VudGlsKGNvbnRlbnQsIGh0bWxgPHNwYW4+TG9hZGluZy4uLjwvc3Bhbj5gKX1gXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHVudGlsID0gZGlyZWN0aXZlKFVudGlsRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbi8vIGV4cG9ydCB0eXBlIHtVbnRpbERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLyoqXG4gKiBXaGVuIGBjb25kaXRpb25gIGlzIHRydWUsIHJldHVybnMgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIGB0cnVlQ2FzZSgpYCwgZWxzZVxuICogcmV0dXJucyB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgYGZhbHNlQ2FzZSgpYCBpZiBgZmFsc2VDYXNlYCBpcyBkZWZpbmVkLlxuICpcbiAqIFRoaXMgaXMgYSBjb252ZW5pZW5jZSB3cmFwcGVyIGFyb3VuZCBhIHRlcm5hcnkgZXhwcmVzc2lvbiB0aGF0IG1ha2VzIGl0IGFcbiAqIGxpdHRsZSBuaWNlciB0byB3cml0ZSBhbiBpbmxpbmUgY29uZGl0aW9uYWwgd2l0aG91dCBhbiBlbHNlLlxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogYGBgdHNcbiAqIHJlbmRlcigpIHtcbiAqICAgcmV0dXJuIGh0bWxgXG4gKiAgICAgJHt3aGVuKHRoaXMudXNlciwgKCkgPT4gaHRtbGBVc2VyOiAke3RoaXMudXNlci51c2VybmFtZX1gLCAoKSA9PiBodG1sYFNpZ24gSW4uLi5gKX1cbiAqICAgYDtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gd2hlbjxULCBGPihcbiAgY29uZGl0aW9uOiB0cnVlLFxuICB0cnVlQ2FzZTogKCkgPT4gVCxcbiAgZmFsc2VDYXNlPzogKCkgPT4gRlxuKTogVDtcbmV4cG9ydCBmdW5jdGlvbiB3aGVuPFQsIEYgPSB1bmRlZmluZWQ+KFxuICBjb25kaXRpb246IGZhbHNlLFxuICB0cnVlQ2FzZTogKCkgPT4gVCxcbiAgZmFsc2VDYXNlPzogKCkgPT4gRlxuKTogRjtcbmV4cG9ydCBmdW5jdGlvbiB3aGVuPFQsIEYgPSB1bmRlZmluZWQ+KFxuICBjb25kaXRpb246IHVua25vd24sXG4gIHRydWVDYXNlOiAoKSA9PiBULFxuICBmYWxzZUNhc2U/OiAoKSA9PiBGXG4pOiBUIHwgRjtcbmV4cG9ydCBmdW5jdGlvbiB3aGVuKFxuICBjb25kaXRpb246IHVua25vd24sXG4gIHRydWVDYXNlOiAoKSA9PiB1bmtub3duLFxuICBmYWxzZUNhc2U/OiAoKSA9PiB1bmtub3duXG4pOiB1bmtub3duIHtcbiAgcmV0dXJuIGNvbmRpdGlvbiA/IHRydWVDYXNlKCkgOiBmYWxzZUNhc2U/LigpO1xufVxuIiwiZXhwb3J0IHtcbiAgICBUZW1wbGF0ZVJlc3VsdCxcbiAgICBIVE1MVGVtcGxhdGVSZXN1bHQsXG4gICAgU1ZHVGVtcGxhdGVSZXN1bHQsXG4gICAgUmVuZGVyT3B0aW9ucyxcbiAgICBodG1sLFxuICAgIHN2ZyxcbiAgICByZW5kZXIsXG4gICAgbm9DaGFuZ2UsXG4gICAgbm90aGluZyxcbn0gZnJvbSAnbGl0LWh0bWwnO1xuXG5pbXBvcnQge1xuICAgIF8kTEgsXG4gICAgQXR0cmlidXRlUGFydCxcbiAgICBQcm9wZXJ0eVBhcnQsXG4gICAgQm9vbGVhbkF0dHJpYnV0ZVBhcnQsXG4gICAgRXZlbnRQYXJ0LFxuICAgIEVsZW1lbnRQYXJ0LFxufSBmcm9tICdsaXQtaHRtbCc7XG5leHBvcnQgY29uc3QgX86jID0ge1xuICAgIEF0dHJpYnV0ZVBhcnQ6IF8kTEguX0F0dHJpYnV0ZVBhcnQgYXMgdW5rbm93biBhcyBBdHRyaWJ1dGVQYXJ0LFxuICAgIFByb3BlcnR5UGFydDogXyRMSC5fUHJvcGVydHlQYXJ0IGFzIHVua25vd24gYXMgUHJvcGVydHlQYXJ0LFxuICAgIEJvb2xlYW5BdHRyaWJ1dGVQYXJ0OiBfJExILl9Cb29sZWFuQXR0cmlidXRlUGFydCBhcyB1bmtub3duIGFzIEJvb2xlYW5BdHRyaWJ1dGVQYXJ0LFxuICAgIEV2ZW50UGFydDogXyRMSC5fRXZlbnRQYXJ0IGFzIHVua25vd24gYXMgRXZlbnRQYXJ0LFxuICAgIEVsZW1lbnRQYXJ0OiBfJExILl9FbGVtZW50UGFydCBhcyB1bmtub3duIGFzIEVsZW1lbnRQYXJ0LFxufTtcblxuZXhwb3J0IHtcbiAgICBEaXJlY3RpdmUsXG4gICAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbiAgICBQYXJ0LFxuICAgIFBhcnRJbmZvLFxuICAgIFBhcnRUeXBlLFxuICAgIGRpcmVjdGl2ZSxcbn0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlJztcblxuZXhwb3J0IHsgQXN5bmNEaXJlY3RpdmUgfSBmcm9tICdsaXQtaHRtbC9hc3luYy1kaXJlY3RpdmUnO1xuZXhwb3J0IHsgUmVmLCBjcmVhdGVSZWYgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3JlZic7XG5cbmltcG9ydCB7IGFzeW5jQXBwZW5kIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9hc3luYy1hcHBlbmQnO1xuaW1wb3J0IHsgYXN5bmNSZXBsYWNlIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9hc3luYy1yZXBsYWNlJztcbmltcG9ydCB7IGNhY2hlIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9jYWNoZSc7XG5pbXBvcnQgeyBjaG9vc2UgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2Nob29zZSc7XG5pbXBvcnQgeyBjbGFzc01hcCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvY2xhc3MtbWFwJztcbmltcG9ydCB7IGd1YXJkIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9ndWFyZCc7XG5pbXBvcnQgeyBpZkRlZmluZWQgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2lmLWRlZmluZWQnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvam9pbic7XG5pbXBvcnQgeyBrZXllZCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMva2V5ZWQnO1xuaW1wb3J0IHsgbGl2ZSB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvbGl2ZSc7XG5pbXBvcnQgeyBtYXAgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL21hcCc7XG5pbXBvcnQgeyByYW5nZSB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvcmFuZ2UnO1xuaW1wb3J0IHsgcmVmIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9yZWYnO1xuaW1wb3J0IHsgcmVwZWF0IH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9yZXBlYXQnO1xuaW1wb3J0IHsgc3R5bGVNYXAgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3N0eWxlLW1hcCc7XG5pbXBvcnQgeyB0ZW1wbGF0ZUNvbnRlbnQgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3RlbXBsYXRlLWNvbnRlbnQnO1xuaW1wb3J0IHsgdW5zYWZlSFRNTCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvdW5zYWZlLWh0bWwnO1xuaW1wb3J0IHsgdW5zYWZlU1ZHIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy91bnNhZmUtc3ZnJztcbmltcG9ydCB7IHVudGlsIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy91bnRpbCc7XG5pbXBvcnQgeyB3aGVuIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy93aGVuJztcblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbmRlY2xhcmUgbmFtZXNwYWNlIGRpcmVjdGl2ZXMge1xuICAgIGV4cG9ydCB0eXBlIGFzeW5jQXBwZW5kID0gdHlwZW9mIGFzeW5jQXBwZW5kO1xuICAgIGV4cG9ydCB0eXBlIGFzeW5jUmVwbGFjZSA9IHR5cGVvZiBhc3luY1JlcGxhY2U7XG4gICAgZXhwb3J0IHR5cGUgY2FjaGUgPSB0eXBlb2YgY2FjaGU7XG4gICAgZXhwb3J0IHR5cGUgY2hvb3NlID0gdHlwZW9mIGNob29zZTtcbiAgICBleHBvcnQgdHlwZSBjbGFzc01hcCA9IHR5cGVvZiBjbGFzc01hcDtcbiAgICBleHBvcnQgdHlwZSBndWFyZCA9IHR5cGVvZiBndWFyZDtcbiAgICBleHBvcnQgdHlwZSBpZkRlZmluZWQgPSB0eXBlb2YgaWZEZWZpbmVkO1xuICAgIGV4cG9ydCB0eXBlIGpvaW4gPSB0eXBlb2Ygam9pbjtcbiAgICBleHBvcnQgdHlwZSBrZXllZCA9IHR5cGVvZiBrZXllZDtcbiAgICBleHBvcnQgdHlwZSBsaXZlID0gdHlwZW9mIGxpdmU7XG4gICAgZXhwb3J0IHR5cGUgbWFwID0gdHlwZW9mIG1hcDtcbiAgICBleHBvcnQgdHlwZSByYW5nZSA9IHR5cGVvZiByYW5nZTtcbiAgICBleHBvcnQgdHlwZSByZWYgPSB0eXBlb2YgcmVmO1xuICAgIGV4cG9ydCB0eXBlIHJlcGVhdCA9IHR5cGVvZiByZXBlYXQ7XG4gICAgZXhwb3J0IHR5cGUgc3R5bGVNYXAgPSB0eXBlb2Ygc3R5bGVNYXA7XG4gICAgZXhwb3J0IHR5cGUgdGVtcGxhdGVDb250ZW50ID0gdHlwZW9mIHRlbXBsYXRlQ29udGVudDtcbiAgICBleHBvcnQgdHlwZSB1bnNhZmVIVE1MID0gdHlwZW9mIHVuc2FmZUhUTUw7XG4gICAgZXhwb3J0IHR5cGUgdW5zYWZlU1ZHID0gdHlwZW9mIHVuc2FmZVNWRztcbiAgICBleHBvcnQgdHlwZSB1bnRpbCA9IHR5cGVvZiB1bnRpbDtcbiAgICBleHBvcnQgdHlwZSB3aGVuID0gdHlwZW9mIHdoZW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVEaXJlY3RpdmVzIHtcbiAgICBhc3luY0FwcGVuZDogZGlyZWN0aXZlcy5hc3luY0FwcGVuZDtcbiAgICBhc3luY1JlcGxhY2U6IGRpcmVjdGl2ZXMuYXN5bmNSZXBsYWNlO1xuICAgIGNhY2hlOiBkaXJlY3RpdmVzLmNhY2hlO1xuICAgIGNob29zZTogZGlyZWN0aXZlcy5jaG9vc2U7XG4gICAgY2xhc3NNYXA6IGRpcmVjdGl2ZXMuY2xhc3NNYXA7XG4gICAgZ3VhcmQ6IGRpcmVjdGl2ZXMuZ3VhcmQ7XG4gICAgaWZEZWZpbmVkOiBkaXJlY3RpdmVzLmlmRGVmaW5lZDtcbiAgICBqb2luOiBkaXJlY3RpdmVzLmpvaW47XG4gICAga2V5ZWQ6IGRpcmVjdGl2ZXMua2V5ZWQ7XG4gICAgbGl2ZTogZGlyZWN0aXZlcy5saXZlO1xuICAgIG1hcDogZGlyZWN0aXZlcy5tYXA7XG4gICAgcmFuZ2U6IGRpcmVjdGl2ZXMucmFuZ2U7XG4gICAgcmVmOiBkaXJlY3RpdmVzLnJlZjtcbiAgICByZXBlYXQ6IGRpcmVjdGl2ZXMucmVwZWF0O1xuICAgIHN0eWxlTWFwOiBkaXJlY3RpdmVzLnN0eWxlTWFwO1xuICAgIHRlbXBsYXRlQ29udGVudDogZGlyZWN0aXZlcy50ZW1wbGF0ZUNvbnRlbnQ7XG4gICAgdW5zYWZlSFRNTDogZGlyZWN0aXZlcy51bnNhZmVIVE1MO1xuICAgIHVuc2FmZVNWRzogZGlyZWN0aXZlcy51bnNhZmVTVkc7XG4gICAgdW50aWw6IGRpcmVjdGl2ZXMudW50aWw7XG4gICAgd2hlbjogZGlyZWN0aXZlcy53aGVuO1xufVxuXG5leHBvcnQgY29uc3QgZGlyZWN0aXZlczogVGVtcGxhdGVEaXJlY3RpdmVzID0ge1xuICAgIGFzeW5jQXBwZW5kLFxuICAgIGFzeW5jUmVwbGFjZSxcbiAgICBjYWNoZSxcbiAgICBjaG9vc2UsXG4gICAgY2xhc3NNYXAsXG4gICAgZ3VhcmQsXG4gICAgaWZEZWZpbmVkLFxuICAgIGpvaW4sXG4gICAga2V5ZWQsXG4gICAgbGl2ZSxcbiAgICBtYXAsXG4gICAgcmFuZ2UsXG4gICAgcmVmLFxuICAgIHJlcGVhdCxcbiAgICBzdHlsZU1hcCxcbiAgICB0ZW1wbGF0ZUNvbnRlbnQsXG4gICAgdW5zYWZlSFRNTCxcbiAgICB1bnNhZmVTVkcsXG4gICAgdW50aWwsXG4gICAgd2hlbixcbn07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZnJvbSBgc3RyaW5nYCB0byBgVGVtcGxhdGVTdHJpbmdzQXJyYXlgLiA8YnI+XG4gKiAgICAgVGhpcyBtZXRob2QgaXMgaGVscGVyIGJyaWdkZ2UgZm9yIHRoZSB7QGxpbmsgaHRtbH0gb3IgdGhlIHtAbGluayBzdmd9IGFyZSBhYmxlIHRvIHJlY2VpdmVkIHBsYWluIHN0cmluZy5cbiAqIEBqYSBgc3RyaW5nYCDjgpIgYFRlbXBsYXRlU3RyaW5nc0FycmF5YOOBq+WkieaPmy4gPGJyPlxuICogICAgIHtAbGluayBodG1sfSDjgoQge0BsaW5rIHN2Z30g44GM5paH5a2X5YiX44KS5Y+X44GR5LuY44GR44KL44Gf44KB44Gu44OW44Oq44OD44K444Oh44K944OD44OJXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyB0b1RlbXBsYXRlU3RyaW5nc0FycmF5IGFzIGJyaWRnZSB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogY29uc3QgcmF3ID0gJzxwPkhlbGxvIFJhdyBTdHJpbmc8L3A+JztcbiAqIHJlbmRlcihodG1sKGJyaWRnZShyYXcpKSwgZG9jdW1lbnQuYm9keSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHBsYWluIHN0cmluZyAvIHN0cmluZyBhcnJheS4gZXgpIHtAbGluayBKU1R9IHJldHVybmVkIHZhbHVlLlxuICogIC0gYGphYCDjg5fjg6zjg7zjg7PmloflrZfliJcgLyDmloflrZfliJfphY3liJcuIGV4KSB7QGxpbmsgSlNUfSDjga7miLvjgorlgKTjgarjganjgpLmg7PlrppcbiAqL1xuZXhwb3J0IGNvbnN0IHRvVGVtcGxhdGVTdHJpbmdzQXJyYXkgPSAoc3JjOiBzdHJpbmcgfCBzdHJpbmdbXSB8IFRlbXBsYXRlU3RyaW5nc0FycmF5KTogVGVtcGxhdGVTdHJpbmdzQXJyYXkgPT4ge1xuICAgIGNvbnN0IHN0cmluZ3MgPSBBcnJheS5pc0FycmF5KHNyYykgPyBzcmMgOiBbc3JjXTtcbiAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzdHJpbmdzLCAncmF3JykpIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHN0cmluZ3MsICdyYXcnLCB7IHZhbHVlOiBzdHJpbmdzIH0pO1xuICAgIH1cbiAgICByZXR1cm4gc3RyaW5ncyBhcyB1bmtub3duIGFzIFRlbXBsYXRlU3RyaW5nc0FycmF5O1xufTtcbiJdLCJuYW1lcyI6WyJ3cmFwIiwiY3JlYXRlTWFya2VyIiwiaXNQcmltaXRpdmUiLCJIVE1MX1JFU1VMVCIsIlNWR19SRVNVTFQiLCJDaGlsZFBhcnQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7SUFJRzs7SUFTSDtJQUNBLE1BQU0sTUFBTSxHQUE0QixNQUFNLENBQUM7SUE0Ti9DLE1BQU1BLE1BQUksR0FLSixDQUFDLElBQVUsS0FBSyxJQUFJLENBQUM7SUFFM0IsTUFBTSxZQUFZLEdBQUksTUFBcUMsQ0FB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O1FBQ1QsSUFBSTtRQUNKLEtBQUs7UUFDTCxJQUFJO1FBQ0osR0FBRztRQUNILEtBQUs7UUFDTCxHQUFHO1FBQ0gsTUFBTTtRQUNOLFFBQVE7UUFDUixlQUFlO1FBQ2YsVUFBVTtRQUNWLFNBQVM7UUFDVCxLQUFLO1FBQ0wsSUFBSTtNQUNOO0lBRUY7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQWtCRztBQUNVLFVBQUEsc0JBQXNCLEdBQUcsQ0FBQyxHQUE2QyxLQUEwQjtJQUMxRyxJQUFBLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDakQsSUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsRUFBRTtJQUN2RCxRQUFBLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQzdELEtBQUE7SUFDRCxJQUFBLE9BQU8sT0FBMEMsQ0FBQztJQUN0RDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwxLDIsMyw0LDUsNiw3LDgsOSwxMCwxMSwxMiwxMywxNCwxNSwxNiwxNywxOCwxOSwyMCwyMSwyMiwyMywyNF0sInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9leHRlbnNpb24tdGVtcGxhdGUvIn0=