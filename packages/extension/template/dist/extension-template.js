/*!
 * @cdp/extension-template 0.9.9
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
    var _d, _e;
    const wrap$1 = (node) => node;
    const trustedTypes = globalThis.trustedTypes;
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
    const createMarker$1 = (v = '') => d.createComment(v);
    const isPrimitive$1 = (value) => value === null || (typeof value != 'object' && typeof value != 'function');
    const isArray = Array.isArray;
    const isIterable = (value) => {
        var _a;
        return isArray(value) ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            typeof ((_a = value) === null || _a === void 0 ? void 0 : _a[Symbol.iterator]) === 'function';
    };
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
    const rawTextElement = /^(?:script|style|textarea)$/i;
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
     * Interprets a template literal as an SVG template that can efficiently
     * render to and update a container.
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
    /**
     * Renders a value, usually a lit-html TemplateResult, to the container.
     * @param value
     * @param container
     * @param options
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
    const walker = d.createTreeWalker(d, 129 /* NodeFilter.SHOW_{ELEMENT|COMMENT} */, null, false);
    /**
     * Returns an HTML string for the given TemplateStringsArray and result type
     * (HTML or SVG), along with the case-sensitive bound attribute names in
     * template order. The HTML contains comment comment markers denoting the
     * `ChildPart`s and suffixes on bound attributes denoting the `AttributeParts`.
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
            /** @internal */
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
                            // _neccessarily_ the name of the attribute we will create a part
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
            /** @internal */
            this._parts = [];
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
                    this._parts.push(part);
                    templatePart = parts[++partIndex];
                }
                if (nodeIndex !== (templatePart === null || templatePart === void 0 ? void 0 : templatePart.index)) {
                    node = walker.nextNode();
                    nodeIndex++;
                }
            }
            return fragment;
        }
        _update(values) {
            let i = 0;
            for (const part of this._parts) {
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
    class ChildPart$1 {
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
                parentNode.nodeType === 11 /* Node.DOCUMENT_FRAGMENT */) {
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
        _insert(node, ref = this._$endNode) {
            return wrap$1(wrap$1(this._$startNode).parentNode).insertBefore(node, ref);
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
                    itemParts.push((itemPart = new ChildPart$1(this._insert(createMarker$1()), this._insert(createMarker$1()), this, this.options)));
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
    }
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
    class BooleanAttributePart extends AttributePart {
        constructor() {
            super(...arguments);
            this.type = BOOLEAN_ATTRIBUTE_PART;
        }
        /** @internal */
        _commitValue(value) {
            if (value && value !== nothing) {
                wrap$1(this.element).setAttribute(this.name, '');
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
        // Used in hydrate
        _TemplateInstance: TemplateInstance,
        _isIterable: isIterable,
        _resolveDirective: resolveDirective,
        // Used in tests and private-ssr-support
        _ChildPart: ChildPart$1,
        _AttributePart: AttributePart,
        _BooleanAttributePart: BooleanAttributePart,
        _EventPart: EventPart,
        _PropertyPart: PropertyPart,
        _ElementPart: ElementPart,
    };
    // Apply polyfills if available
    (_d = globalThis[`litHtmlPolyfillSupport${``}`]) === null || _d === void 0 ? void 0 : _d.call(globalThis, Template, ChildPart$1);
    // IMPORTANT: do not change the property name or the assignment expression.
    // This line will be used in regexes to search for lit-html usage.
    // TODO(justinfagnani): inject version number at build time
    ((_e = globalThis.litHtmlVersions) !== null && _e !== void 0 ? _e : (globalThis.litHtmlVersions = [])).push('2.0.0');

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
    const isTemplateResult = (value, type) => {
        var _a, _b;
        return type === undefined
            ? // This property needs to remain unminified.
                ((_a = value) === null || _a === void 0 ? void 0 : _a['_$litType$']) !== undefined
            : ((_b = value) === null || _b === void 0 ? void 0 : _b['_$litType$']) === type;
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
    // A sentinal value that can never appear as a part value except when set by
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
     * cases where the template value is transformed before being commited.
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
    // A sentinal that indicates guard() hasn't rendered anything yet
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
     * `live()` performs a strict equality check agains the live DOM value, and if
     * the new value is equal to the live value, does nothing. This means that
     * `live()` should not be used when the binding will cause a type conversion. If
     * you use `live()` with an attribute binding, make sure that only strings are
     * passed in, or the binding will update every render.
     */
    const live = directive(LiveDirective);

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
    // has already been rendered to a new spot
    const lastElementForCallback = new WeakMap();
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
            if (typeof this._ref === 'function') {
                // If the current ref was called with a previous value, call with
                // `undefined`; We do this to ensure callbacks are called in a consistent
                // way regardless of whether a ref might be moving up in the tree (in
                // which case it would otherwise be called with the new value before the
                // previous one unsets it) and down in the tree (where it would be unset
                // before being set)
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
            var _a;
            return typeof this._ref === 'function'
                ? lastElementForCallback.get(this._ref)
                : (_a = this._ref) === null || _a === void 0 ? void 0 : _a.value;
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
            // In SSR hydration it's possible for oldParts to be an arrray but for us
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
                prop = prop
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
                    if (name.includes('-')) {
                        style.setProperty(name, value);
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
     * expression in the attribute. It takes the property names in the `styleInfo`
     * object and adds the property values as CSS properties. Property names with
     * dashes (`-`) are assumed to be valid CSS property names and set on the
     * element's style object using `setProperty()`. Names without dashes are
     * assumed to be camelCased JavaScript property names and set on the element's
     * style object using property assignment, allowing the style object to
     * translate JavaScript-style names to CSS property names.
     *
     * For example `styleMap({backgroundColor: 'red', 'border-top': '5px', '--size':
     * '0'})` sets the `background-color`, `border-top` and `--size` properties.
     *
     * @param styleInfo
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
        classMap,
        guard,
        ifDefined,
        live,
        ref,
        repeat,
        styleMap,
        templateContent,
        unsafeHTML,
        unsafeSVG,
        until,
    };
    /**
     * @en Convert from `string` to `TemplateStringsArray`. <br>
     *     This method is helper brigdge for the [[html]] or the [[svg]] are able to received plain string.
     * @ja `string` を `TemplateStringsArray`に変換. <br>
     *     [[html]] や [[svg]] が文字列を受け付けるためのブリッジメソッド
     *
     * @example <br>
     *
     * ```ts
     * import { toTemplateStringsArray as bridge } from '@cdp/extension-template';
     *
     * const raw = '<p>Hello Raw String</p>';
     * render(html(bridge(raw)), document.body);
     * ```
     *
     * @param src
     *  - `en` plain string. ex) [[JST]] returned value.
     *  - `ja` プレーン文字列. ex) [[JST]] の戻り値などを想定
     */
    const toTemplateStringsArray = (src) => {
        const ta = [src];
        ta.raw = [src];
        return ta;
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

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLmpzIiwic291cmNlcyI6WyJsaXQtaHRtbC9zcmMvbGl0LWh0bWwudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZS1oZWxwZXJzLnRzIiwibGl0LWh0bWwvc3JjL2FzeW5jLWRpcmVjdGl2ZS50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3ByaXZhdGUtYXN5bmMtaGVscGVycy50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2FzeW5jLXJlcGxhY2UudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9hc3luYy1hcHBlbmQudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9jYWNoZS50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2NsYXNzLW1hcC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2d1YXJkLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvaWYtZGVmaW5lZC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2xpdmUudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9yZWYudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9yZXBlYXQudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9zdHlsZS1tYXAudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy90ZW1wbGF0ZS1jb250ZW50LnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvdW5zYWZlLWh0bWwudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy91bnNhZmUtc3ZnLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvdW50aWwudHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLy8gSU1QT1JUQU5UOiB0aGVzZSBpbXBvcnRzIG11c3QgYmUgdHlwZS1vbmx5XG5pbXBvcnQgdHlwZSB7RGlyZWN0aXZlLCBEaXJlY3RpdmVSZXN1bHQsIFBhcnRJbmZvfSBmcm9tICcuL2RpcmVjdGl2ZS5qcyc7XG5cbmNvbnN0IERFVl9NT0RFID0gdHJ1ZTtcbmNvbnN0IEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUyA9IHRydWU7XG5jb25zdCBFTkFCTEVfU0hBRFlET01fTk9QQVRDSCA9IHRydWU7XG5cbi8qKlxuICogYHRydWVgIGlmIHdlJ3JlIGJ1aWxkaW5nIGZvciBnb29nbGUzIHdpdGggdGVtcG9yYXJ5IGJhY2stY29tcGF0IGhlbHBlcnMuXG4gKiBUaGlzIGV4cG9ydCBpcyBub3QgcHJlc2VudCBpbiBwcm9kIGJ1aWxkcy5cbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgY29uc3QgSU5URVJOQUwgPSB0cnVlO1xuXG5sZXQgaXNzdWVXYXJuaW5nOiAoY29kZTogc3RyaW5nLCB3YXJuaW5nOiBzdHJpbmcpID0+IHZvaWQ7XG5cbmlmIChERVZfTU9ERSkge1xuICBnbG9iYWxUaGlzLmxpdElzc3VlZFdhcm5pbmdzID8/PSBuZXcgU2V0KCk7XG5cbiAgLy8gSXNzdWUgYSB3YXJuaW5nLCBpZiB3ZSBoYXZlbid0IGFscmVhZHkuXG4gIGlzc3VlV2FybmluZyA9IChjb2RlOiBzdHJpbmcsIHdhcm5pbmc6IHN0cmluZykgPT4ge1xuICAgIHdhcm5pbmcgKz0gY29kZVxuICAgICAgPyBgIFNlZSBodHRwczovL2xpdC5kZXYvbXNnLyR7Y29kZX0gZm9yIG1vcmUgaW5mb3JtYXRpb24uYFxuICAgICAgOiAnJztcbiAgICBpZiAoIWdsb2JhbFRoaXMubGl0SXNzdWVkV2FybmluZ3MhLmhhcyh3YXJuaW5nKSkge1xuICAgICAgY29uc29sZS53YXJuKHdhcm5pbmcpO1xuICAgICAgZ2xvYmFsVGhpcy5saXRJc3N1ZWRXYXJuaW5ncyEuYWRkKHdhcm5pbmcpO1xuICAgIH1cbiAgfTtcblxuICBpc3N1ZVdhcm5pbmcoXG4gICAgJ2Rldi1tb2RlJyxcbiAgICBgTGl0IGlzIGluIGRldiBtb2RlLiBOb3QgcmVjb21tZW5kZWQgZm9yIHByb2R1Y3Rpb24hYFxuICApO1xufVxuXG5jb25zdCB3cmFwID1cbiAgRU5BQkxFX1NIQURZRE9NX05PUEFUQ0ggJiZcbiAgd2luZG93LlNoYWR5RE9NPy5pblVzZSAmJlxuICB3aW5kb3cuU2hhZHlET00/Lm5vUGF0Y2ggPT09IHRydWVcbiAgICA/IHdpbmRvdy5TaGFkeURPTSEud3JhcFxuICAgIDogKG5vZGU6IE5vZGUpID0+IG5vZGU7XG5cbmNvbnN0IHRydXN0ZWRUeXBlcyA9IChnbG9iYWxUaGlzIGFzIHVua25vd24gYXMgUGFydGlhbDxXaW5kb3c+KS50cnVzdGVkVHlwZXM7XG5cbi8qKlxuICogT3VyIFRydXN0ZWRUeXBlUG9saWN5IGZvciBIVE1MIHdoaWNoIGlzIGRlY2xhcmVkIHVzaW5nIHRoZSBodG1sIHRlbXBsYXRlXG4gKiB0YWcgZnVuY3Rpb24uXG4gKlxuICogVGhhdCBIVE1MIGlzIGEgZGV2ZWxvcGVyLWF1dGhvcmVkIGNvbnN0YW50LCBhbmQgaXMgcGFyc2VkIHdpdGggaW5uZXJIVE1MXG4gKiBiZWZvcmUgYW55IHVudHJ1c3RlZCBleHByZXNzaW9ucyBoYXZlIGJlZW4gbWl4ZWQgaW4uIFRoZXJlZm9yIGl0IGlzXG4gKiBjb25zaWRlcmVkIHNhZmUgYnkgY29uc3RydWN0aW9uLlxuICovXG5jb25zdCBwb2xpY3kgPSB0cnVzdGVkVHlwZXNcbiAgPyB0cnVzdGVkVHlwZXMuY3JlYXRlUG9saWN5KCdsaXQtaHRtbCcsIHtcbiAgICAgIGNyZWF0ZUhUTUw6IChzKSA9PiBzLFxuICAgIH0pXG4gIDogdW5kZWZpbmVkO1xuXG4vKipcbiAqIFVzZWQgdG8gc2FuaXRpemUgYW55IHZhbHVlIGJlZm9yZSBpdCBpcyB3cml0dGVuIGludG8gdGhlIERPTS4gVGhpcyBjYW4gYmVcbiAqIHVzZWQgdG8gaW1wbGVtZW50IGEgc2VjdXJpdHkgcG9saWN5IG9mIGFsbG93ZWQgYW5kIGRpc2FsbG93ZWQgdmFsdWVzIGluXG4gKiBvcmRlciB0byBwcmV2ZW50IFhTUyBhdHRhY2tzLlxuICpcbiAqIE9uZSB3YXkgb2YgdXNpbmcgdGhpcyBjYWxsYmFjayB3b3VsZCBiZSB0byBjaGVjayBhdHRyaWJ1dGVzIGFuZCBwcm9wZXJ0aWVzXG4gKiBhZ2FpbnN0IGEgbGlzdCBvZiBoaWdoIHJpc2sgZmllbGRzLCBhbmQgcmVxdWlyZSB0aGF0IHZhbHVlcyB3cml0dGVuIHRvIHN1Y2hcbiAqIGZpZWxkcyBiZSBpbnN0YW5jZXMgb2YgYSBjbGFzcyB3aGljaCBpcyBzYWZlIGJ5IGNvbnN0cnVjdGlvbi4gQ2xvc3VyZSdzIFNhZmVcbiAqIEhUTUwgVHlwZXMgaXMgb25lIGltcGxlbWVudGF0aW9uIG9mIHRoaXMgdGVjaG5pcXVlIChcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9nb29nbGUvc2FmZS1odG1sLXR5cGVzL2Jsb2IvbWFzdGVyL2RvYy9zYWZlaHRtbC10eXBlcy5tZCkuXG4gKiBUaGUgVHJ1c3RlZFR5cGVzIHBvbHlmaWxsIGluIEFQSS1vbmx5IG1vZGUgY291bGQgYWxzbyBiZSB1c2VkIGFzIGEgYmFzaXNcbiAqIGZvciB0aGlzIHRlY2huaXF1ZSAoaHR0cHM6Ly9naXRodWIuY29tL1dJQ0cvdHJ1c3RlZC10eXBlcykuXG4gKlxuICogQHBhcmFtIG5vZGUgVGhlIEhUTUwgbm9kZSAodXN1YWxseSBlaXRoZXIgYSAjdGV4dCBub2RlIG9yIGFuIEVsZW1lbnQpIHRoYXRcbiAqICAgICBpcyBiZWluZyB3cml0dGVuIHRvLiBOb3RlIHRoYXQgdGhpcyBpcyBqdXN0IGFuIGV4ZW1wbGFyIG5vZGUsIHRoZSB3cml0ZVxuICogICAgIG1heSB0YWtlIHBsYWNlIGFnYWluc3QgYW5vdGhlciBpbnN0YW5jZSBvZiB0aGUgc2FtZSBjbGFzcyBvZiBub2RlLlxuICogQHBhcmFtIG5hbWUgVGhlIG5hbWUgb2YgYW4gYXR0cmlidXRlIG9yIHByb3BlcnR5IChmb3IgZXhhbXBsZSwgJ2hyZWYnKS5cbiAqIEBwYXJhbSB0eXBlIEluZGljYXRlcyB3aGV0aGVyIHRoZSB3cml0ZSB0aGF0J3MgYWJvdXQgdG8gYmUgcGVyZm9ybWVkIHdpbGxcbiAqICAgICBiZSB0byBhIHByb3BlcnR5IG9yIGEgbm9kZS5cbiAqIEByZXR1cm4gQSBmdW5jdGlvbiB0aGF0IHdpbGwgc2FuaXRpemUgdGhpcyBjbGFzcyBvZiB3cml0ZXMuXG4gKi9cbmV4cG9ydCB0eXBlIFNhbml0aXplckZhY3RvcnkgPSAoXG4gIG5vZGU6IE5vZGUsXG4gIG5hbWU6IHN0cmluZyxcbiAgdHlwZTogJ3Byb3BlcnR5JyB8ICdhdHRyaWJ1dGUnXG4pID0+IFZhbHVlU2FuaXRpemVyO1xuXG4vKipcbiAqIEEgZnVuY3Rpb24gd2hpY2ggY2FuIHNhbml0aXplIHZhbHVlcyB0aGF0IHdpbGwgYmUgd3JpdHRlbiB0byBhIHNwZWNpZmljIGtpbmRcbiAqIG9mIERPTSBzaW5rLlxuICpcbiAqIFNlZSBTYW5pdGl6ZXJGYWN0b3J5LlxuICpcbiAqIEBwYXJhbSB2YWx1ZSBUaGUgdmFsdWUgdG8gc2FuaXRpemUuIFdpbGwgYmUgdGhlIGFjdHVhbCB2YWx1ZSBwYXNzZWQgaW50b1xuICogICAgIHRoZSBsaXQtaHRtbCB0ZW1wbGF0ZSBsaXRlcmFsLCBzbyB0aGlzIGNvdWxkIGJlIG9mIGFueSB0eXBlLlxuICogQHJldHVybiBUaGUgdmFsdWUgdG8gd3JpdGUgdG8gdGhlIERPTS4gVXN1YWxseSB0aGUgc2FtZSBhcyB0aGUgaW5wdXQgdmFsdWUsXG4gKiAgICAgdW5sZXNzIHNhbml0aXphdGlvbiBpcyBuZWVkZWQuXG4gKi9cbmV4cG9ydCB0eXBlIFZhbHVlU2FuaXRpemVyID0gKHZhbHVlOiB1bmtub3duKSA9PiB1bmtub3duO1xuXG5jb25zdCBpZGVudGl0eUZ1bmN0aW9uOiBWYWx1ZVNhbml0aXplciA9ICh2YWx1ZTogdW5rbm93bikgPT4gdmFsdWU7XG5jb25zdCBub29wU2FuaXRpemVyOiBTYW5pdGl6ZXJGYWN0b3J5ID0gKFxuICBfbm9kZTogTm9kZSxcbiAgX25hbWU6IHN0cmluZyxcbiAgX3R5cGU6ICdwcm9wZXJ0eScgfCAnYXR0cmlidXRlJ1xuKSA9PiBpZGVudGl0eUZ1bmN0aW9uO1xuXG4vKiogU2V0cyB0aGUgZ2xvYmFsIHNhbml0aXplciBmYWN0b3J5LiAqL1xuY29uc3Qgc2V0U2FuaXRpemVyID0gKG5ld1Nhbml0aXplcjogU2FuaXRpemVyRmFjdG9yeSkgPT4ge1xuICBpZiAoIUVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoc2FuaXRpemVyRmFjdG9yeUludGVybmFsICE9PSBub29wU2FuaXRpemVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYEF0dGVtcHRlZCB0byBvdmVyd3JpdGUgZXhpc3RpbmcgbGl0LWh0bWwgc2VjdXJpdHkgcG9saWN5LmAgK1xuICAgICAgICBgIHNldFNhbml0aXplRE9NVmFsdWVGYWN0b3J5IHNob3VsZCBiZSBjYWxsZWQgYXQgbW9zdCBvbmNlLmBcbiAgICApO1xuICB9XG4gIHNhbml0aXplckZhY3RvcnlJbnRlcm5hbCA9IG5ld1Nhbml0aXplcjtcbn07XG5cbi8qKlxuICogT25seSB1c2VkIGluIGludGVybmFsIHRlc3RzLCBub3QgYSBwYXJ0IG9mIHRoZSBwdWJsaWMgQVBJLlxuICovXG5jb25zdCBfdGVzdE9ubHlDbGVhclNhbml0aXplckZhY3RvcnlEb05vdENhbGxPckVsc2UgPSAoKSA9PiB7XG4gIHNhbml0aXplckZhY3RvcnlJbnRlcm5hbCA9IG5vb3BTYW5pdGl6ZXI7XG59O1xuXG5jb25zdCBjcmVhdGVTYW5pdGl6ZXI6IFNhbml0aXplckZhY3RvcnkgPSAobm9kZSwgbmFtZSwgdHlwZSkgPT4ge1xuICByZXR1cm4gc2FuaXRpemVyRmFjdG9yeUludGVybmFsKG5vZGUsIG5hbWUsIHR5cGUpO1xufTtcblxuLy8gQWRkZWQgdG8gYW4gYXR0cmlidXRlIG5hbWUgdG8gbWFyayB0aGUgYXR0cmlidXRlIGFzIGJvdW5kIHNvIHdlIGNhbiBmaW5kXG4vLyBpdCBlYXNpbHkuXG5jb25zdCBib3VuZEF0dHJpYnV0ZVN1ZmZpeCA9ICckbGl0JCc7XG5cbi8vIFRoaXMgbWFya2VyIGlzIHVzZWQgaW4gbWFueSBzeW50YWN0aWMgcG9zaXRpb25zIGluIEhUTUwsIHNvIGl0IG11c3QgYmVcbi8vIGEgdmFsaWQgZWxlbWVudCBuYW1lIGFuZCBhdHRyaWJ1dGUgbmFtZS4gV2UgZG9uJ3Qgc3VwcG9ydCBkeW5hbWljIG5hbWVzICh5ZXQpXG4vLyBidXQgdGhpcyBhdCBsZWFzdCBlbnN1cmVzIHRoYXQgdGhlIHBhcnNlIHRyZWUgaXMgY2xvc2VyIHRvIHRoZSB0ZW1wbGF0ZVxuLy8gaW50ZW50aW9uLlxuY29uc3QgbWFya2VyID0gYGxpdCQke1N0cmluZyhNYXRoLnJhbmRvbSgpKS5zbGljZSg5KX0kYDtcblxuLy8gU3RyaW5nIHVzZWQgdG8gdGVsbCBpZiBhIGNvbW1lbnQgaXMgYSBtYXJrZXIgY29tbWVudFxuY29uc3QgbWFya2VyTWF0Y2ggPSAnPycgKyBtYXJrZXI7XG5cbi8vIFRleHQgdXNlZCB0byBpbnNlcnQgYSBjb21tZW50IG1hcmtlciBub2RlLiBXZSB1c2UgcHJvY2Vzc2luZyBpbnN0cnVjdGlvblxuLy8gc3ludGF4IGJlY2F1c2UgaXQncyBzbGlnaHRseSBzbWFsbGVyLCBidXQgcGFyc2VzIGFzIGEgY29tbWVudCBub2RlLlxuY29uc3Qgbm9kZU1hcmtlciA9IGA8JHttYXJrZXJNYXRjaH0+YDtcblxuY29uc3QgZCA9IGRvY3VtZW50O1xuXG4vLyBDcmVhdGVzIGEgZHluYW1pYyBtYXJrZXIuIFdlIG5ldmVyIGhhdmUgdG8gc2VhcmNoIGZvciB0aGVzZSBpbiB0aGUgRE9NLlxuY29uc3QgY3JlYXRlTWFya2VyID0gKHYgPSAnJykgPT4gZC5jcmVhdGVDb21tZW50KHYpO1xuXG4vLyBodHRwczovL3RjMzkuZ2l0aHViLmlvL2VjbWEyNjIvI3NlYy10eXBlb2Ytb3BlcmF0b3JcbnR5cGUgUHJpbWl0aXZlID0gbnVsbCB8IHVuZGVmaW5lZCB8IGJvb2xlYW4gfCBudW1iZXIgfCBzdHJpbmcgfCBzeW1ib2wgfCBiaWdpbnQ7XG5jb25zdCBpc1ByaW1pdGl2ZSA9ICh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFByaW1pdGl2ZSA9PlxuICB2YWx1ZSA9PT0gbnVsbCB8fCAodHlwZW9mIHZhbHVlICE9ICdvYmplY3QnICYmIHR5cGVvZiB2YWx1ZSAhPSAnZnVuY3Rpb24nKTtcbmNvbnN0IGlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuY29uc3QgaXNJdGVyYWJsZSA9ICh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIEl0ZXJhYmxlPHVua25vd24+ID0+XG4gIGlzQXJyYXkodmFsdWUpIHx8XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gIHR5cGVvZiAodmFsdWUgYXMgYW55KT8uW1N5bWJvbC5pdGVyYXRvcl0gPT09ICdmdW5jdGlvbic7XG5cbmNvbnN0IFNQQUNFX0NIQVIgPSBgWyBcXHRcXG5cXGZcXHJdYDtcbmNvbnN0IEFUVFJfVkFMVUVfQ0hBUiA9IGBbXiBcXHRcXG5cXGZcXHJcIidcXGA8Pj1dYDtcbmNvbnN0IE5BTUVfQ0hBUiA9IGBbXlxcXFxzXCInPj0vXWA7XG5cbi8vIFRoZXNlIHJlZ2V4ZXMgcmVwcmVzZW50IHRoZSBmaXZlIHBhcnNpbmcgc3RhdGVzIHRoYXQgd2UgY2FyZSBhYm91dCBpbiB0aGVcbi8vIFRlbXBsYXRlJ3MgSFRNTCBzY2FubmVyLiBUaGV5IG1hdGNoIHRoZSAqZW5kKiBvZiB0aGUgc3RhdGUgdGhleSdyZSBuYW1lZFxuLy8gYWZ0ZXIuXG4vLyBEZXBlbmRpbmcgb24gdGhlIG1hdGNoLCB3ZSB0cmFuc2l0aW9uIHRvIGEgbmV3IHN0YXRlLiBJZiB0aGVyZSdzIG5vIG1hdGNoLFxuLy8gd2Ugc3RheSBpbiB0aGUgc2FtZSBzdGF0ZS5cbi8vIE5vdGUgdGhhdCB0aGUgcmVnZXhlcyBhcmUgc3RhdGVmdWwuIFdlIHV0aWxpemUgbGFzdEluZGV4IGFuZCBzeW5jIGl0XG4vLyBhY3Jvc3MgdGhlIG11bHRpcGxlIHJlZ2V4ZXMgdXNlZC4gSW4gYWRkaXRpb24gdG8gdGhlIGZpdmUgcmVnZXhlcyBiZWxvd1xuLy8gd2UgYWxzbyBkeW5hbWljYWxseSBjcmVhdGUgYSByZWdleCB0byBmaW5kIHRoZSBtYXRjaGluZyBlbmQgdGFncyBmb3IgcmF3XG4vLyB0ZXh0IGVsZW1lbnRzLlxuXG4vKipcbiAqIEVuZCBvZiB0ZXh0IGlzOiBgPGAgZm9sbG93ZWQgYnk6XG4gKiAgIChjb21tZW50IHN0YXJ0KSBvciAodGFnKSBvciAoZHluYW1pYyB0YWcgYmluZGluZylcbiAqL1xuY29uc3QgdGV4dEVuZFJlZ2V4ID0gLzwoPzooIS0tfFxcL1teYS16QS1aXSl8KFxcLz9bYS16QS1aXVtePlxcc10qKXwoXFwvPyQpKS9nO1xuY29uc3QgQ09NTUVOVF9TVEFSVCA9IDE7XG5jb25zdCBUQUdfTkFNRSA9IDI7XG5jb25zdCBEWU5BTUlDX1RBR19OQU1FID0gMztcblxuY29uc3QgY29tbWVudEVuZFJlZ2V4ID0gLy0tPi9nO1xuLyoqXG4gKiBDb21tZW50cyBub3Qgc3RhcnRlZCB3aXRoIDwhLS0sIGxpa2UgPC97LCBjYW4gYmUgZW5kZWQgYnkgYSBzaW5nbGUgYD5gXG4gKi9cbmNvbnN0IGNvbW1lbnQyRW5kUmVnZXggPSAvPi9nO1xuXG4vKipcbiAqIFRoZSB0YWdFbmQgcmVnZXggbWF0Y2hlcyB0aGUgZW5kIG9mIHRoZSBcImluc2lkZSBhbiBvcGVuaW5nXCIgdGFnIHN5bnRheFxuICogcG9zaXRpb24uIEl0IGVpdGhlciBtYXRjaGVzIGEgYD5gLCBhbiBhdHRyaWJ1dGUtbGlrZSBzZXF1ZW5jZSwgb3IgdGhlIGVuZFxuICogb2YgdGhlIHN0cmluZyBhZnRlciBhIHNwYWNlIChhdHRyaWJ1dGUtbmFtZSBwb3NpdGlvbiBlbmRpbmcpLlxuICpcbiAqIFNlZSBhdHRyaWJ1dGVzIGluIHRoZSBIVE1MIHNwZWM6XG4gKiBodHRwczovL3d3dy53My5vcmcvVFIvaHRtbDUvc3ludGF4Lmh0bWwjZWxlbWVudHMtYXR0cmlidXRlc1xuICpcbiAqIFwiIFxcdFxcblxcZlxcclwiIGFyZSBIVE1MIHNwYWNlIGNoYXJhY3RlcnM6XG4gKiBodHRwczovL2luZnJhLnNwZWMud2hhdHdnLm9yZy8jYXNjaWktd2hpdGVzcGFjZVxuICpcbiAqIFNvIGFuIGF0dHJpYnV0ZSBpczpcbiAqICAqIFRoZSBuYW1lOiBhbnkgY2hhcmFjdGVyIGV4Y2VwdCBhIHdoaXRlc3BhY2UgY2hhcmFjdGVyLCAoXCIpLCAoJyksIFwiPlwiLFxuICogICAgXCI9XCIsIG9yIFwiL1wiLiBOb3RlOiB0aGlzIGlzIGRpZmZlcmVudCBmcm9tIHRoZSBIVE1MIHNwZWMgd2hpY2ggYWxzbyBleGNsdWRlcyBjb250cm9sIGNoYXJhY3RlcnMuXG4gKiAgKiBGb2xsb3dlZCBieSB6ZXJvIG9yIG1vcmUgc3BhY2UgY2hhcmFjdGVyc1xuICogICogRm9sbG93ZWQgYnkgXCI9XCJcbiAqICAqIEZvbGxvd2VkIGJ5IHplcm8gb3IgbW9yZSBzcGFjZSBjaGFyYWN0ZXJzXG4gKiAgKiBGb2xsb3dlZCBieTpcbiAqICAgICogQW55IGNoYXJhY3RlciBleGNlcHQgc3BhY2UsICgnKSwgKFwiKSwgXCI8XCIsIFwiPlwiLCBcIj1cIiwgKGApLCBvclxuICogICAgKiAoXCIpIHRoZW4gYW55IG5vbi0oXCIpLCBvclxuICogICAgKiAoJykgdGhlbiBhbnkgbm9uLSgnKVxuICovXG5jb25zdCB0YWdFbmRSZWdleCA9IG5ldyBSZWdFeHAoXG4gIGA+fCR7U1BBQ0VfQ0hBUn0oPzooJHtOQU1FX0NIQVJ9KykoJHtTUEFDRV9DSEFSfSo9JHtTUEFDRV9DSEFSfSooPzoke0FUVFJfVkFMVUVfQ0hBUn18KFwifCcpfCkpfCQpYCxcbiAgJ2cnXG4pO1xuY29uc3QgRU5USVJFX01BVENIID0gMDtcbmNvbnN0IEFUVFJJQlVURV9OQU1FID0gMTtcbmNvbnN0IFNQQUNFU19BTkRfRVFVQUxTID0gMjtcbmNvbnN0IFFVT1RFX0NIQVIgPSAzO1xuXG5jb25zdCBzaW5nbGVRdW90ZUF0dHJFbmRSZWdleCA9IC8nL2c7XG5jb25zdCBkb3VibGVRdW90ZUF0dHJFbmRSZWdleCA9IC9cIi9nO1xuLyoqXG4gKiBNYXRjaGVzIHRoZSByYXcgdGV4dCBlbGVtZW50cy5cbiAqXG4gKiBDb21tZW50cyBhcmUgbm90IHBhcnNlZCB3aXRoaW4gcmF3IHRleHQgZWxlbWVudHMsIHNvIHdlIG5lZWQgdG8gc2VhcmNoIHRoZWlyXG4gKiB0ZXh0IGNvbnRlbnQgZm9yIG1hcmtlciBzdHJpbmdzLlxuICovXG5jb25zdCByYXdUZXh0RWxlbWVudCA9IC9eKD86c2NyaXB0fHN0eWxlfHRleHRhcmVhKSQvaTtcblxuLyoqIFRlbXBsYXRlUmVzdWx0IHR5cGVzICovXG5jb25zdCBIVE1MX1JFU1VMVCA9IDE7XG5jb25zdCBTVkdfUkVTVUxUID0gMjtcblxudHlwZSBSZXN1bHRUeXBlID0gdHlwZW9mIEhUTUxfUkVTVUxUIHwgdHlwZW9mIFNWR19SRVNVTFQ7XG5cbi8vIFRlbXBsYXRlUGFydCB0eXBlc1xuLy8gSU1QT1JUQU5UOiB0aGVzZSBtdXN0IG1hdGNoIHRoZSB2YWx1ZXMgaW4gUGFydFR5cGVcbmNvbnN0IEFUVFJJQlVURV9QQVJUID0gMTtcbmNvbnN0IENISUxEX1BBUlQgPSAyO1xuY29uc3QgUFJPUEVSVFlfUEFSVCA9IDM7XG5jb25zdCBCT09MRUFOX0FUVFJJQlVURV9QQVJUID0gNDtcbmNvbnN0IEVWRU5UX1BBUlQgPSA1O1xuY29uc3QgRUxFTUVOVF9QQVJUID0gNjtcbmNvbnN0IENPTU1FTlRfUEFSVCA9IDc7XG5cbi8qKlxuICogVGhlIHJldHVybiB0eXBlIG9mIHRoZSB0ZW1wbGF0ZSB0YWcgZnVuY3Rpb25zLlxuICovXG5leHBvcnQgdHlwZSBUZW1wbGF0ZVJlc3VsdDxUIGV4dGVuZHMgUmVzdWx0VHlwZSA9IFJlc3VsdFR5cGU+ID0ge1xuICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICBbJ18kbGl0VHlwZSQnXTogVDtcbiAgc3RyaW5nczogVGVtcGxhdGVTdHJpbmdzQXJyYXk7XG4gIHZhbHVlczogdW5rbm93bltdO1xufTtcblxuZXhwb3J0IHR5cGUgSFRNTFRlbXBsYXRlUmVzdWx0ID0gVGVtcGxhdGVSZXN1bHQ8dHlwZW9mIEhUTUxfUkVTVUxUPjtcblxuZXhwb3J0IHR5cGUgU1ZHVGVtcGxhdGVSZXN1bHQgPSBUZW1wbGF0ZVJlc3VsdDx0eXBlb2YgU1ZHX1JFU1VMVD47XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdCB7XG4gIC8vIFRoaXMgaXMgYSBmYWN0b3J5IGluIG9yZGVyIHRvIG1ha2UgdGVtcGxhdGUgaW5pdGlhbGl6YXRpb24gbGF6eVxuICAvLyBhbmQgYWxsb3cgU2hhZHlSZW5kZXJPcHRpb25zIHNjb3BlIHRvIGJlIHBhc3NlZCBpbi5cbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgWydfJGxpdFR5cGUkJ106IENvbXBpbGVkVGVtcGxhdGU7XG4gIHZhbHVlczogdW5rbm93bltdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVkVGVtcGxhdGUgZXh0ZW5kcyBPbWl0PFRlbXBsYXRlLCAnZWwnPiB7XG4gIC8vIGVsIGlzIG92ZXJyaWRkZW4gdG8gYmUgb3B0aW9uYWwuIFdlIGluaXRpYWxpemUgaXQgb24gZmlyc3QgcmVuZGVyXG4gIGVsPzogSFRNTFRlbXBsYXRlRWxlbWVudDtcblxuICAvLyBUaGUgcHJlcGFyZWQgSFRNTCBzdHJpbmcgdG8gY3JlYXRlIGEgdGVtcGxhdGUgZWxlbWVudCBmcm9tLlxuICBoOiBUcnVzdGVkSFRNTDtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZXMgYSB0ZW1wbGF0ZSBsaXRlcmFsIHRhZyBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBUZW1wbGF0ZVJlc3VsdCB3aXRoXG4gKiB0aGUgZ2l2ZW4gcmVzdWx0IHR5cGUuXG4gKi9cbmNvbnN0IHRhZyA9XG4gIDxUIGV4dGVuZHMgUmVzdWx0VHlwZT4odHlwZTogVCkgPT5cbiAgKHN0cmluZ3M6IFRlbXBsYXRlU3RyaW5nc0FycmF5LCAuLi52YWx1ZXM6IHVua25vd25bXSk6IFRlbXBsYXRlUmVzdWx0PFQ+ID0+IHtcbiAgICAvLyBXYXJuIGFnYWluc3QgdGVtcGxhdGVzIG9jdGFsIGVzY2FwZSBzZXF1ZW5jZXNcbiAgICAvLyBXZSBkbyB0aGlzIGhlcmUgcmF0aGVyIHRoYW4gaW4gcmVuZGVyIHNvIHRoYXQgdGhlIHdhcm5pbmcgaXMgY2xvc2VyIHRvIHRoZVxuICAgIC8vIHRlbXBsYXRlIGRlZmluaXRpb24uXG4gICAgaWYgKERFVl9NT0RFICYmIHN0cmluZ3Muc29tZSgocykgPT4gcyA9PT0gdW5kZWZpbmVkKSkge1xuICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAnU29tZSB0ZW1wbGF0ZSBzdHJpbmdzIGFyZSB1bmRlZmluZWQuXFxuJyArXG4gICAgICAgICAgJ1RoaXMgaXMgcHJvYmFibHkgY2F1c2VkIGJ5IGlsbGVnYWwgb2N0YWwgZXNjYXBlIHNlcXVlbmNlcy4nXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICAgIFsnXyRsaXRUeXBlJCddOiB0eXBlLFxuICAgICAgc3RyaW5ncyxcbiAgICAgIHZhbHVlcyxcbiAgICB9O1xuICB9O1xuXG4vKipcbiAqIEludGVycHJldHMgYSB0ZW1wbGF0ZSBsaXRlcmFsIGFzIGFuIEhUTUwgdGVtcGxhdGUgdGhhdCBjYW4gZWZmaWNpZW50bHlcbiAqIHJlbmRlciB0byBhbmQgdXBkYXRlIGEgY29udGFpbmVyLlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBoZWFkZXIgPSAodGl0bGU6IHN0cmluZykgPT4gaHRtbGA8aDE+JHt0aXRsZX08L2gxPmA7XG4gKiBgYGBcbiAqXG4gKiBUaGUgYGh0bWxgIHRhZyByZXR1cm5zIGEgZGVzY3JpcHRpb24gb2YgdGhlIERPTSB0byByZW5kZXIgYXMgYSB2YWx1ZS4gSXQgaXNcbiAqIGxhenksIG1lYW5pbmcgbm8gd29yayBpcyBkb25lIHVudGlsIHRoZSB0ZW1wbGF0ZSBpcyByZW5kZXJlZC4gV2hlbiByZW5kZXJpbmcsXG4gKiBpZiBhIHRlbXBsYXRlIGNvbWVzIGZyb20gdGhlIHNhbWUgZXhwcmVzc2lvbiBhcyBhIHByZXZpb3VzbHkgcmVuZGVyZWQgcmVzdWx0LFxuICogaXQncyBlZmZpY2llbnRseSB1cGRhdGVkIGluc3RlYWQgb2YgcmVwbGFjZWQuXG4gKi9cbmV4cG9ydCBjb25zdCBodG1sID0gdGFnKEhUTUxfUkVTVUxUKTtcblxuLyoqXG4gKiBJbnRlcnByZXRzIGEgdGVtcGxhdGUgbGl0ZXJhbCBhcyBhbiBTVkcgdGVtcGxhdGUgdGhhdCBjYW4gZWZmaWNpZW50bHlcbiAqIHJlbmRlciB0byBhbmQgdXBkYXRlIGEgY29udGFpbmVyLlxuICovXG5leHBvcnQgY29uc3Qgc3ZnID0gdGFnKFNWR19SRVNVTFQpO1xuXG4vKipcbiAqIEEgc2VudGluZWwgdmFsdWUgdGhhdCBzaWduYWxzIHRoYXQgYSB2YWx1ZSB3YXMgaGFuZGxlZCBieSBhIGRpcmVjdGl2ZSBhbmRcbiAqIHNob3VsZCBub3QgYmUgd3JpdHRlbiB0byB0aGUgRE9NLlxuICovXG5leHBvcnQgY29uc3Qgbm9DaGFuZ2UgPSBTeW1ib2wuZm9yKCdsaXQtbm9DaGFuZ2UnKTtcblxuLyoqXG4gKiBBIHNlbnRpbmVsIHZhbHVlIHRoYXQgc2lnbmFscyBhIENoaWxkUGFydCB0byBmdWxseSBjbGVhciBpdHMgY29udGVudC5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgYnV0dG9uID0gaHRtbGAke1xuICogIHVzZXIuaXNBZG1pblxuICogICAgPyBodG1sYDxidXR0b24+REVMRVRFPC9idXR0b24+YFxuICogICAgOiBub3RoaW5nXG4gKiB9YDtcbiAqIGBgYFxuICpcbiAqIFByZWZlciB1c2luZyBgbm90aGluZ2Agb3ZlciBvdGhlciBmYWxzeSB2YWx1ZXMgYXMgaXQgcHJvdmlkZXMgYSBjb25zaXN0ZW50XG4gKiBiZWhhdmlvciBiZXR3ZWVuIHZhcmlvdXMgZXhwcmVzc2lvbiBiaW5kaW5nIGNvbnRleHRzLlxuICpcbiAqIEluIGNoaWxkIGV4cHJlc3Npb25zLCBgdW5kZWZpbmVkYCwgYG51bGxgLCBgJydgLCBhbmQgYG5vdGhpbmdgIGFsbCBiZWhhdmUgdGhlXG4gKiBzYW1lIGFuZCByZW5kZXIgbm8gbm9kZXMuIEluIGF0dHJpYnV0ZSBleHByZXNzaW9ucywgYG5vdGhpbmdgIF9yZW1vdmVzXyB0aGVcbiAqIGF0dHJpYnV0ZSwgd2hpbGUgYHVuZGVmaW5lZGAgYW5kIGBudWxsYCB3aWxsIHJlbmRlciBhbiBlbXB0eSBzdHJpbmcuIEluXG4gKiBwcm9wZXJ0eSBleHByZXNzaW9ucyBgbm90aGluZ2AgYmVjb21lcyBgdW5kZWZpbmVkYC5cbiAqL1xuZXhwb3J0IGNvbnN0IG5vdGhpbmcgPSBTeW1ib2wuZm9yKCdsaXQtbm90aGluZycpO1xuXG4vKipcbiAqIFRoZSBjYWNoZSBvZiBwcmVwYXJlZCB0ZW1wbGF0ZXMsIGtleWVkIGJ5IHRoZSB0YWdnZWQgVGVtcGxhdGVTdHJpbmdzQXJyYXlcbiAqIGFuZCBfbm90XyBhY2NvdW50aW5nIGZvciB0aGUgc3BlY2lmaWMgdGVtcGxhdGUgdGFnIHVzZWQuIFRoaXMgbWVhbnMgdGhhdFxuICogdGVtcGxhdGUgdGFncyBjYW5ub3QgYmUgZHluYW1pYyAtIHRoZSBtdXN0IHN0YXRpY2FsbHkgYmUgb25lIG9mIGh0bWwsIHN2ZyxcbiAqIG9yIGF0dHIuIFRoaXMgcmVzdHJpY3Rpb24gc2ltcGxpZmllcyB0aGUgY2FjaGUgbG9va3VwLCB3aGljaCBpcyBvbiB0aGUgaG90XG4gKiBwYXRoIGZvciByZW5kZXJpbmcuXG4gKi9cbmNvbnN0IHRlbXBsYXRlQ2FjaGUgPSBuZXcgV2Vha01hcDxUZW1wbGF0ZVN0cmluZ3NBcnJheSwgVGVtcGxhdGU+KCk7XG5cbi8qKlxuICogT2JqZWN0IHNwZWNpZnlpbmcgb3B0aW9ucyBmb3IgY29udHJvbGxpbmcgbGl0LWh0bWwgcmVuZGVyaW5nLiBOb3RlIHRoYXRcbiAqIHdoaWxlIGByZW5kZXJgIG1heSBiZSBjYWxsZWQgbXVsdGlwbGUgdGltZXMgb24gdGhlIHNhbWUgYGNvbnRhaW5lcmAgKGFuZFxuICogYHJlbmRlckJlZm9yZWAgcmVmZXJlbmNlIG5vZGUpIHRvIGVmZmljaWVudGx5IHVwZGF0ZSB0aGUgcmVuZGVyZWQgY29udGVudCxcbiAqIG9ubHkgdGhlIG9wdGlvbnMgcGFzc2VkIGluIGR1cmluZyB0aGUgZmlyc3QgcmVuZGVyIGFyZSByZXNwZWN0ZWQgZHVyaW5nXG4gKiB0aGUgbGlmZXRpbWUgb2YgcmVuZGVycyB0byB0aGF0IHVuaXF1ZSBgY29udGFpbmVyYCArIGByZW5kZXJCZWZvcmVgXG4gKiBjb21iaW5hdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZW5kZXJPcHRpb25zIHtcbiAgLyoqXG4gICAqIEFuIG9iamVjdCB0byB1c2UgYXMgdGhlIGB0aGlzYCB2YWx1ZSBmb3IgZXZlbnQgbGlzdGVuZXJzLiBJdCdzIG9mdGVuXG4gICAqIHVzZWZ1bCB0byBzZXQgdGhpcyB0byB0aGUgaG9zdCBjb21wb25lbnQgcmVuZGVyaW5nIGEgdGVtcGxhdGUuXG4gICAqL1xuICBob3N0Pzogb2JqZWN0O1xuICAvKipcbiAgICogQSBET00gbm9kZSBiZWZvcmUgd2hpY2ggdG8gcmVuZGVyIGNvbnRlbnQgaW4gdGhlIGNvbnRhaW5lci5cbiAgICovXG4gIHJlbmRlckJlZm9yZT86IENoaWxkTm9kZSB8IG51bGw7XG4gIC8qKlxuICAgKiBOb2RlIHVzZWQgZm9yIGNsb25pbmcgdGhlIHRlbXBsYXRlIChgaW1wb3J0Tm9kZWAgd2lsbCBiZSBjYWxsZWQgb24gdGhpc1xuICAgKiBub2RlKS4gVGhpcyBjb250cm9scyB0aGUgYG93bmVyRG9jdW1lbnRgIG9mIHRoZSByZW5kZXJlZCBET00sIGFsb25nIHdpdGhcbiAgICogYW55IGluaGVyaXRlZCBjb250ZXh0LiBEZWZhdWx0cyB0byB0aGUgZ2xvYmFsIGBkb2N1bWVudGAuXG4gICAqL1xuICBjcmVhdGlvblNjb3BlPzoge2ltcG9ydE5vZGUobm9kZTogTm9kZSwgZGVlcD86IGJvb2xlYW4pOiBOb2RlfTtcbiAgLyoqXG4gICAqIFRoZSBpbml0aWFsIGNvbm5lY3RlZCBzdGF0ZSBmb3IgdGhlIHRvcC1sZXZlbCBwYXJ0IGJlaW5nIHJlbmRlcmVkLiBJZiBub1xuICAgKiBgaXNDb25uZWN0ZWRgIG9wdGlvbiBpcyBzZXQsIGBBc3luY0RpcmVjdGl2ZWBzIHdpbGwgYmUgY29ubmVjdGVkIGJ5XG4gICAqIGRlZmF1bHQuIFNldCB0byBgZmFsc2VgIGlmIHRoZSBpbml0aWFsIHJlbmRlciBvY2N1cnMgaW4gYSBkaXNjb25uZWN0ZWQgdHJlZVxuICAgKiBhbmQgYEFzeW5jRGlyZWN0aXZlYHMgc2hvdWxkIHNlZSBgaXNDb25uZWN0ZWQgPT09IGZhbHNlYCBmb3IgdGhlaXIgaW5pdGlhbFxuICAgKiByZW5kZXIuIFRoZSBgcGFydC5zZXRDb25uZWN0ZWQoKWAgbWV0aG9kIG11c3QgYmUgdXNlZCBzdWJzZXF1ZW50IHRvIGluaXRpYWxcbiAgICogcmVuZGVyIHRvIGNoYW5nZSB0aGUgY29ubmVjdGVkIHN0YXRlIG9mIHRoZSBwYXJ0LlxuICAgKi9cbiAgaXNDb25uZWN0ZWQ/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEludGVybmFsbHkgd2UgY2FuIGV4cG9ydCB0aGlzIGludGVyZmFjZSBhbmQgY2hhbmdlIHRoZSB0eXBlIG9mXG4gKiByZW5kZXIoKSdzIG9wdGlvbnMuXG4gKi9cbmludGVyZmFjZSBJbnRlcm5hbFJlbmRlck9wdGlvbnMgZXh0ZW5kcyBSZW5kZXJPcHRpb25zIHtcbiAgLyoqXG4gICAqIEFuIGludGVybmFsLW9ubHkgbWlncmF0aW9uIGZsYWdcbiAgICogQGludGVybmFsXG4gICAqL1xuICBjbGVhckNvbnRhaW5lckZvckxpdDJNaWdyYXRpb25Pbmx5PzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBSZW5kZXJzIGEgdmFsdWUsIHVzdWFsbHkgYSBsaXQtaHRtbCBUZW1wbGF0ZVJlc3VsdCwgdG8gdGhlIGNvbnRhaW5lci5cbiAqIEBwYXJhbSB2YWx1ZVxuICogQHBhcmFtIGNvbnRhaW5lclxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGNvbnN0IHJlbmRlciA9IChcbiAgdmFsdWU6IHVua25vd24sXG4gIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCBEb2N1bWVudEZyYWdtZW50LFxuICBvcHRpb25zPzogUmVuZGVyT3B0aW9uc1xuKTogUm9vdFBhcnQgPT4ge1xuICBjb25zdCBwYXJ0T3duZXJOb2RlID0gb3B0aW9ucz8ucmVuZGVyQmVmb3JlID8/IGNvbnRhaW5lcjtcbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgbGV0IHBhcnQ6IENoaWxkUGFydCA9IChwYXJ0T3duZXJOb2RlIGFzIGFueSlbJ18kbGl0UGFydCQnXTtcbiAgaWYgKHBhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IGVuZE5vZGUgPSBvcHRpb25zPy5yZW5kZXJCZWZvcmUgPz8gbnVsbDtcbiAgICAvLyBJbnRlcm5hbCBtb2RpZmljYXRpb246IGRvbid0IGNsZWFyIGNvbnRhaW5lciB0byBtYXRjaCBsaXQtaHRtbCAyLjBcbiAgICBpZiAoXG4gICAgICBJTlRFUk5BTCAmJlxuICAgICAgKG9wdGlvbnMgYXMgSW50ZXJuYWxSZW5kZXJPcHRpb25zKT8uY2xlYXJDb250YWluZXJGb3JMaXQyTWlncmF0aW9uT25seSA9PT1cbiAgICAgICAgdHJ1ZVxuICAgICkge1xuICAgICAgbGV0IG4gPSBjb250YWluZXIuZmlyc3RDaGlsZDtcbiAgICAgIC8vIENsZWFyIG9ubHkgdXAgdG8gdGhlIGBlbmROb2RlYCBha2EgYHJlbmRlckJlZm9yZWAgbm9kZS5cbiAgICAgIHdoaWxlIChuICYmIG4gIT09IGVuZE5vZGUpIHtcbiAgICAgICAgY29uc3QgbmV4dCA9IG4ubmV4dFNpYmxpbmc7XG4gICAgICAgIG4ucmVtb3ZlKCk7XG4gICAgICAgIG4gPSBuZXh0O1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgKHBhcnRPd25lck5vZGUgYXMgYW55KVsnXyRsaXRQYXJ0JCddID0gcGFydCA9IG5ldyBDaGlsZFBhcnQoXG4gICAgICBjb250YWluZXIuaW5zZXJ0QmVmb3JlKGNyZWF0ZU1hcmtlcigpLCBlbmROb2RlKSxcbiAgICAgIGVuZE5vZGUsXG4gICAgICB1bmRlZmluZWQsXG4gICAgICBvcHRpb25zID8/IHt9XG4gICAgKTtcbiAgfVxuICBwYXJ0Ll8kc2V0VmFsdWUodmFsdWUpO1xuICByZXR1cm4gcGFydCBhcyBSb290UGFydDtcbn07XG5cbmlmIChFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MpIHtcbiAgcmVuZGVyLnNldFNhbml0aXplciA9IHNldFNhbml0aXplcjtcbiAgcmVuZGVyLmNyZWF0ZVNhbml0aXplciA9IGNyZWF0ZVNhbml0aXplcjtcbiAgaWYgKERFVl9NT0RFKSB7XG4gICAgcmVuZGVyLl90ZXN0T25seUNsZWFyU2FuaXRpemVyRmFjdG9yeURvTm90Q2FsbE9yRWxzZSA9XG4gICAgICBfdGVzdE9ubHlDbGVhclNhbml0aXplckZhY3RvcnlEb05vdENhbGxPckVsc2U7XG4gIH1cbn1cblxuY29uc3Qgd2Fsa2VyID0gZC5jcmVhdGVUcmVlV2Fsa2VyKFxuICBkLFxuICAxMjkgLyogTm9kZUZpbHRlci5TSE9XX3tFTEVNRU5UfENPTU1FTlR9ICovLFxuICBudWxsLFxuICBmYWxzZVxuKTtcblxubGV0IHNhbml0aXplckZhY3RvcnlJbnRlcm5hbDogU2FuaXRpemVyRmFjdG9yeSA9IG5vb3BTYW5pdGl6ZXI7XG5cbi8vXG4vLyBDbGFzc2VzIG9ubHkgYmVsb3cgaGVyZSwgY29uc3QgdmFyaWFibGUgZGVjbGFyYXRpb25zIG9ubHkgYWJvdmUgaGVyZS4uLlxuLy9cbi8vIEtlZXBpbmcgdmFyaWFibGUgZGVjbGFyYXRpb25zIGFuZCBjbGFzc2VzIHRvZ2V0aGVyIGltcHJvdmVzIG1pbmlmaWNhdGlvbi5cbi8vIEludGVyZmFjZXMgYW5kIHR5cGUgYWxpYXNlcyBjYW4gYmUgaW50ZXJsZWF2ZWQgZnJlZWx5LlxuLy9cblxuLy8gVHlwZSBmb3IgY2xhc3NlcyB0aGF0IGhhdmUgYSBgX2RpcmVjdGl2ZWAgb3IgYF9kaXJlY3RpdmVzW11gIGZpZWxkLCB1c2VkIGJ5XG4vLyBgcmVzb2x2ZURpcmVjdGl2ZWBcbmV4cG9ydCBpbnRlcmZhY2UgRGlyZWN0aXZlUGFyZW50IHtcbiAgXyRwYXJlbnQ/OiBEaXJlY3RpdmVQYXJlbnQ7XG4gIF8kaXNDb25uZWN0ZWQ6IGJvb2xlYW47XG4gIF9fZGlyZWN0aXZlPzogRGlyZWN0aXZlO1xuICBfX2RpcmVjdGl2ZXM/OiBBcnJheTxEaXJlY3RpdmUgfCB1bmRlZmluZWQ+O1xufVxuXG4vKipcbiAqIFJldHVybnMgYW4gSFRNTCBzdHJpbmcgZm9yIHRoZSBnaXZlbiBUZW1wbGF0ZVN0cmluZ3NBcnJheSBhbmQgcmVzdWx0IHR5cGVcbiAqIChIVE1MIG9yIFNWRyksIGFsb25nIHdpdGggdGhlIGNhc2Utc2Vuc2l0aXZlIGJvdW5kIGF0dHJpYnV0ZSBuYW1lcyBpblxuICogdGVtcGxhdGUgb3JkZXIuIFRoZSBIVE1MIGNvbnRhaW5zIGNvbW1lbnQgY29tbWVudCBtYXJrZXJzIGRlbm90aW5nIHRoZVxuICogYENoaWxkUGFydGBzIGFuZCBzdWZmaXhlcyBvbiBib3VuZCBhdHRyaWJ1dGVzIGRlbm90aW5nIHRoZSBgQXR0cmlidXRlUGFydHNgLlxuICpcbiAqIEBwYXJhbSBzdHJpbmdzIHRlbXBsYXRlIHN0cmluZ3MgYXJyYXlcbiAqIEBwYXJhbSB0eXBlIEhUTUwgb3IgU1ZHXG4gKiBAcmV0dXJuIEFycmF5IGNvbnRhaW5pbmcgYFtodG1sLCBhdHRyTmFtZXNdYCAoYXJyYXkgcmV0dXJuZWQgZm9yIHRlcnNlbmVzcyxcbiAqICAgICB0byBhdm9pZCBvYmplY3QgZmllbGRzIHNpbmNlIHRoaXMgY29kZSBpcyBzaGFyZWQgd2l0aCBub24tbWluaWZpZWQgU1NSXG4gKiAgICAgY29kZSlcbiAqL1xuY29uc3QgZ2V0VGVtcGxhdGVIdG1sID0gKFxuICBzdHJpbmdzOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSxcbiAgdHlwZTogUmVzdWx0VHlwZVxuKTogW1RydXN0ZWRIVE1MLCBBcnJheTxzdHJpbmcgfCB1bmRlZmluZWQ+XSA9PiB7XG4gIC8vIEluc2VydCBtYWtlcnMgaW50byB0aGUgdGVtcGxhdGUgSFRNTCB0byByZXByZXNlbnQgdGhlIHBvc2l0aW9uIG9mXG4gIC8vIGJpbmRpbmdzLiBUaGUgZm9sbG93aW5nIGNvZGUgc2NhbnMgdGhlIHRlbXBsYXRlIHN0cmluZ3MgdG8gZGV0ZXJtaW5lIHRoZVxuICAvLyBzeW50YWN0aWMgcG9zaXRpb24gb2YgdGhlIGJpbmRpbmdzLiBUaGV5IGNhbiBiZSBpbiB0ZXh0IHBvc2l0aW9uLCB3aGVyZVxuICAvLyB3ZSBpbnNlcnQgYW4gSFRNTCBjb21tZW50LCBhdHRyaWJ1dGUgdmFsdWUgcG9zaXRpb24sIHdoZXJlIHdlIGluc2VydCBhXG4gIC8vIHNlbnRpbmVsIHN0cmluZyBhbmQgcmUtd3JpdGUgdGhlIGF0dHJpYnV0ZSBuYW1lLCBvciBpbnNpZGUgYSB0YWcgd2hlcmVcbiAgLy8gd2UgaW5zZXJ0IHRoZSBzZW50aW5lbCBzdHJpbmcuXG4gIGNvbnN0IGwgPSBzdHJpbmdzLmxlbmd0aCAtIDE7XG4gIC8vIFN0b3JlcyB0aGUgY2FzZS1zZW5zaXRpdmUgYm91bmQgYXR0cmlidXRlIG5hbWVzIGluIHRoZSBvcmRlciBvZiB0aGVpclxuICAvLyBwYXJ0cy4gRWxlbWVudFBhcnRzIGFyZSBhbHNvIHJlZmxlY3RlZCBpbiB0aGlzIGFycmF5IGFzIHVuZGVmaW5lZFxuICAvLyByYXRoZXIgdGhhbiBhIHN0cmluZywgdG8gZGlzYW1iaWd1YXRlIGZyb20gYXR0cmlidXRlIGJpbmRpbmdzLlxuICBjb25zdCBhdHRyTmFtZXM6IEFycmF5PHN0cmluZyB8IHVuZGVmaW5lZD4gPSBbXTtcbiAgbGV0IGh0bWwgPSB0eXBlID09PSBTVkdfUkVTVUxUID8gJzxzdmc+JyA6ICcnO1xuXG4gIC8vIFdoZW4gd2UncmUgaW5zaWRlIGEgcmF3IHRleHQgdGFnIChub3QgaXQncyB0ZXh0IGNvbnRlbnQpLCB0aGUgcmVnZXhcbiAgLy8gd2lsbCBzdGlsbCBiZSB0YWdSZWdleCBzbyB3ZSBjYW4gZmluZCBhdHRyaWJ1dGVzLCBidXQgd2lsbCBzd2l0Y2ggdG9cbiAgLy8gdGhpcyByZWdleCB3aGVuIHRoZSB0YWcgZW5kcy5cbiAgbGV0IHJhd1RleHRFbmRSZWdleDogUmVnRXhwIHwgdW5kZWZpbmVkO1xuXG4gIC8vIFRoZSBjdXJyZW50IHBhcnNpbmcgc3RhdGUsIHJlcHJlc2VudGVkIGFzIGEgcmVmZXJlbmNlIHRvIG9uZSBvZiB0aGVcbiAgLy8gcmVnZXhlc1xuICBsZXQgcmVnZXggPSB0ZXh0RW5kUmVnZXg7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICBjb25zdCBzID0gc3RyaW5nc1tpXTtcbiAgICAvLyBUaGUgaW5kZXggb2YgdGhlIGVuZCBvZiB0aGUgbGFzdCBhdHRyaWJ1dGUgbmFtZS4gV2hlbiB0aGlzIGlzXG4gICAgLy8gcG9zaXRpdmUgYXQgZW5kIG9mIGEgc3RyaW5nLCBpdCBtZWFucyB3ZSdyZSBpbiBhbiBhdHRyaWJ1dGUgdmFsdWVcbiAgICAvLyBwb3NpdGlvbiBhbmQgbmVlZCB0byByZXdyaXRlIHRoZSBhdHRyaWJ1dGUgbmFtZS5cbiAgICAvLyBXZSBhbHNvIHVzZSBhIHNwZWNpYWwgdmFsdWUgb2YgLTIgdG8gaW5kaWNhdGUgdGhhdCB3ZSBlbmNvdW50ZXJlZFxuICAgIC8vIHRoZSBlbmQgb2YgYSBzdHJpbmcgaW4gYXR0cmlidXRlIG5hbWUgcG9zaXRpb24uXG4gICAgbGV0IGF0dHJOYW1lRW5kSW5kZXggPSAtMTtcbiAgICBsZXQgYXR0ck5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBsZXQgbGFzdEluZGV4ID0gMDtcbiAgICBsZXQgbWF0Y2ghOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xuXG4gICAgLy8gVGhlIGNvbmRpdGlvbnMgaW4gdGhpcyBsb29wIGhhbmRsZSB0aGUgY3VycmVudCBwYXJzZSBzdGF0ZSwgYW5kIHRoZVxuICAgIC8vIGFzc2lnbm1lbnRzIHRvIHRoZSBgcmVnZXhgIHZhcmlhYmxlIGFyZSB0aGUgc3RhdGUgdHJhbnNpdGlvbnMuXG4gICAgd2hpbGUgKGxhc3RJbmRleCA8IHMubGVuZ3RoKSB7XG4gICAgICAvLyBNYWtlIHN1cmUgd2Ugc3RhcnQgc2VhcmNoaW5nIGZyb20gd2hlcmUgd2UgcHJldmlvdXNseSBsZWZ0IG9mZlxuICAgICAgcmVnZXgubGFzdEluZGV4ID0gbGFzdEluZGV4O1xuICAgICAgbWF0Y2ggPSByZWdleC5leGVjKHMpO1xuICAgICAgaWYgKG1hdGNoID09PSBudWxsKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgbGFzdEluZGV4ID0gcmVnZXgubGFzdEluZGV4O1xuICAgICAgaWYgKHJlZ2V4ID09PSB0ZXh0RW5kUmVnZXgpIHtcbiAgICAgICAgaWYgKG1hdGNoW0NPTU1FTlRfU1RBUlRdID09PSAnIS0tJykge1xuICAgICAgICAgIHJlZ2V4ID0gY29tbWVudEVuZFJlZ2V4O1xuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoW0NPTU1FTlRfU1RBUlRdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBXZSBzdGFydGVkIGEgd2VpcmQgY29tbWVudCwgbGlrZSA8L3tcbiAgICAgICAgICByZWdleCA9IGNvbW1lbnQyRW5kUmVnZXg7XG4gICAgICAgIH0gZWxzZSBpZiAobWF0Y2hbVEFHX05BTUVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAocmF3VGV4dEVsZW1lbnQudGVzdChtYXRjaFtUQUdfTkFNRV0pKSB7XG4gICAgICAgICAgICAvLyBSZWNvcmQgaWYgd2UgZW5jb3VudGVyIGEgcmF3LXRleHQgZWxlbWVudC4gV2UnbGwgc3dpdGNoIHRvXG4gICAgICAgICAgICAvLyB0aGlzIHJlZ2V4IGF0IHRoZSBlbmQgb2YgdGhlIHRhZy5cbiAgICAgICAgICAgIHJhd1RleHRFbmRSZWdleCA9IG5ldyBSZWdFeHAoYDwvJHttYXRjaFtUQUdfTkFNRV19YCwgJ2cnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVnZXggPSB0YWdFbmRSZWdleDtcbiAgICAgICAgfSBlbHNlIGlmIChtYXRjaFtEWU5BTUlDX1RBR19OQU1FXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKERFVl9NT0RFKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICdCaW5kaW5ncyBpbiB0YWcgbmFtZXMgYXJlIG5vdCBzdXBwb3J0ZWQuIFBsZWFzZSB1c2Ugc3RhdGljIHRlbXBsYXRlcyBpbnN0ZWFkLiAnICtcbiAgICAgICAgICAgICAgICAnU2VlIGh0dHBzOi8vbGl0LmRldi9kb2NzL3RlbXBsYXRlcy9leHByZXNzaW9ucy8jc3RhdGljLWV4cHJlc3Npb25zJ1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVnZXggPSB0YWdFbmRSZWdleDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChyZWdleCA9PT0gdGFnRW5kUmVnZXgpIHtcbiAgICAgICAgaWYgKG1hdGNoW0VOVElSRV9NQVRDSF0gPT09ICc+Jykge1xuICAgICAgICAgIC8vIEVuZCBvZiBhIHRhZy4gSWYgd2UgaGFkIHN0YXJ0ZWQgYSByYXctdGV4dCBlbGVtZW50LCB1c2UgdGhhdFxuICAgICAgICAgIC8vIHJlZ2V4XG4gICAgICAgICAgcmVnZXggPSByYXdUZXh0RW5kUmVnZXggPz8gdGV4dEVuZFJlZ2V4O1xuICAgICAgICAgIC8vIFdlIG1heSBiZSBlbmRpbmcgYW4gdW5xdW90ZWQgYXR0cmlidXRlIHZhbHVlLCBzbyBtYWtlIHN1cmUgd2VcbiAgICAgICAgICAvLyBjbGVhciBhbnkgcGVuZGluZyBhdHRyTmFtZUVuZEluZGV4XG4gICAgICAgICAgYXR0ck5hbWVFbmRJbmRleCA9IC0xO1xuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoW0FUVFJJQlVURV9OQU1FXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gQXR0cmlidXRlIG5hbWUgcG9zaXRpb25cbiAgICAgICAgICBhdHRyTmFtZUVuZEluZGV4ID0gLTI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXR0ck5hbWVFbmRJbmRleCA9IHJlZ2V4Lmxhc3RJbmRleCAtIG1hdGNoW1NQQUNFU19BTkRfRVFVQUxTXS5sZW5ndGg7XG4gICAgICAgICAgYXR0ck5hbWUgPSBtYXRjaFtBVFRSSUJVVEVfTkFNRV07XG4gICAgICAgICAgcmVnZXggPVxuICAgICAgICAgICAgbWF0Y2hbUVVPVEVfQ0hBUl0gPT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICA/IHRhZ0VuZFJlZ2V4XG4gICAgICAgICAgICAgIDogbWF0Y2hbUVVPVEVfQ0hBUl0gPT09ICdcIidcbiAgICAgICAgICAgICAgPyBkb3VibGVRdW90ZUF0dHJFbmRSZWdleFxuICAgICAgICAgICAgICA6IHNpbmdsZVF1b3RlQXR0ckVuZFJlZ2V4O1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKFxuICAgICAgICByZWdleCA9PT0gZG91YmxlUXVvdGVBdHRyRW5kUmVnZXggfHxcbiAgICAgICAgcmVnZXggPT09IHNpbmdsZVF1b3RlQXR0ckVuZFJlZ2V4XG4gICAgICApIHtcbiAgICAgICAgcmVnZXggPSB0YWdFbmRSZWdleDtcbiAgICAgIH0gZWxzZSBpZiAocmVnZXggPT09IGNvbW1lbnRFbmRSZWdleCB8fCByZWdleCA9PT0gY29tbWVudDJFbmRSZWdleCkge1xuICAgICAgICByZWdleCA9IHRleHRFbmRSZWdleDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE5vdCBvbmUgb2YgdGhlIGZpdmUgc3RhdGUgcmVnZXhlcywgc28gaXQgbXVzdCBiZSB0aGUgZHluYW1pY2FsbHlcbiAgICAgICAgLy8gY3JlYXRlZCByYXcgdGV4dCByZWdleCBhbmQgd2UncmUgYXQgdGhlIGNsb3NlIG9mIHRoYXQgZWxlbWVudC5cbiAgICAgICAgcmVnZXggPSB0YWdFbmRSZWdleDtcbiAgICAgICAgcmF3VGV4dEVuZFJlZ2V4ID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChERVZfTU9ERSkge1xuICAgICAgLy8gSWYgd2UgaGF2ZSBhIGF0dHJOYW1lRW5kSW5kZXgsIHdoaWNoIGluZGljYXRlcyB0aGF0IHdlIHNob3VsZFxuICAgICAgLy8gcmV3cml0ZSB0aGUgYXR0cmlidXRlIG5hbWUsIGFzc2VydCB0aGF0IHdlJ3JlIGluIGEgdmFsaWQgYXR0cmlidXRlXG4gICAgICAvLyBwb3NpdGlvbiAtIGVpdGhlciBpbiBhIHRhZywgb3IgYSBxdW90ZWQgYXR0cmlidXRlIHZhbHVlLlxuICAgICAgY29uc29sZS5hc3NlcnQoXG4gICAgICAgIGF0dHJOYW1lRW5kSW5kZXggPT09IC0xIHx8XG4gICAgICAgICAgcmVnZXggPT09IHRhZ0VuZFJlZ2V4IHx8XG4gICAgICAgICAgcmVnZXggPT09IHNpbmdsZVF1b3RlQXR0ckVuZFJlZ2V4IHx8XG4gICAgICAgICAgcmVnZXggPT09IGRvdWJsZVF1b3RlQXR0ckVuZFJlZ2V4LFxuICAgICAgICAndW5leHBlY3RlZCBwYXJzZSBzdGF0ZSBCJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyBXZSBoYXZlIGZvdXIgY2FzZXM6XG4gICAgLy8gIDEuIFdlJ3JlIGluIHRleHQgcG9zaXRpb24sIGFuZCBub3QgaW4gYSByYXcgdGV4dCBlbGVtZW50XG4gICAgLy8gICAgIChyZWdleCA9PT0gdGV4dEVuZFJlZ2V4KTogaW5zZXJ0IGEgY29tbWVudCBtYXJrZXIuXG4gICAgLy8gIDIuIFdlIGhhdmUgYSBub24tbmVnYXRpdmUgYXR0ck5hbWVFbmRJbmRleCB3aGljaCBtZWFucyB3ZSBuZWVkIHRvXG4gICAgLy8gICAgIHJld3JpdGUgdGhlIGF0dHJpYnV0ZSBuYW1lIHRvIGFkZCBhIGJvdW5kIGF0dHJpYnV0ZSBzdWZmaXguXG4gICAgLy8gIDMuIFdlJ3JlIGF0IHRoZSBub24tZmlyc3QgYmluZGluZyBpbiBhIG11bHRpLWJpbmRpbmcgYXR0cmlidXRlLCB1c2UgYVxuICAgIC8vICAgICBwbGFpbiBtYXJrZXIuXG4gICAgLy8gIDQuIFdlJ3JlIHNvbWV3aGVyZSBlbHNlIGluc2lkZSB0aGUgdGFnLiBJZiB3ZSdyZSBpbiBhdHRyaWJ1dGUgbmFtZVxuICAgIC8vICAgICBwb3NpdGlvbiAoYXR0ck5hbWVFbmRJbmRleCA9PT0gLTIpLCBhZGQgYSBzZXF1ZW50aWFsIHN1ZmZpeCB0b1xuICAgIC8vICAgICBnZW5lcmF0ZSBhIHVuaXF1ZSBhdHRyaWJ1dGUgbmFtZS5cblxuICAgIC8vIERldGVjdCBhIGJpbmRpbmcgbmV4dCB0byBzZWxmLWNsb3NpbmcgdGFnIGVuZCBhbmQgaW5zZXJ0IGEgc3BhY2UgdG9cbiAgICAvLyBzZXBhcmF0ZSB0aGUgbWFya2VyIGZyb20gdGhlIHRhZyBlbmQ6XG4gICAgY29uc3QgZW5kID1cbiAgICAgIHJlZ2V4ID09PSB0YWdFbmRSZWdleCAmJiBzdHJpbmdzW2kgKyAxXS5zdGFydHNXaXRoKCcvPicpID8gJyAnIDogJyc7XG4gICAgaHRtbCArPVxuICAgICAgcmVnZXggPT09IHRleHRFbmRSZWdleFxuICAgICAgICA/IHMgKyBub2RlTWFya2VyXG4gICAgICAgIDogYXR0ck5hbWVFbmRJbmRleCA+PSAwXG4gICAgICAgID8gKGF0dHJOYW1lcy5wdXNoKGF0dHJOYW1lISksXG4gICAgICAgICAgcy5zbGljZSgwLCBhdHRyTmFtZUVuZEluZGV4KSArXG4gICAgICAgICAgICBib3VuZEF0dHJpYnV0ZVN1ZmZpeCArXG4gICAgICAgICAgICBzLnNsaWNlKGF0dHJOYW1lRW5kSW5kZXgpKSArXG4gICAgICAgICAgbWFya2VyICtcbiAgICAgICAgICBlbmRcbiAgICAgICAgOiBzICtcbiAgICAgICAgICBtYXJrZXIgK1xuICAgICAgICAgIChhdHRyTmFtZUVuZEluZGV4ID09PSAtMiA/IChhdHRyTmFtZXMucHVzaCh1bmRlZmluZWQpLCBpKSA6IGVuZCk7XG4gIH1cblxuICBjb25zdCBodG1sUmVzdWx0OiBzdHJpbmcgfCBUcnVzdGVkSFRNTCA9XG4gICAgaHRtbCArIChzdHJpbmdzW2xdIHx8ICc8Pz4nKSArICh0eXBlID09PSBTVkdfUkVTVUxUID8gJzwvc3ZnPicgOiAnJyk7XG5cbiAgLy8gUmV0dXJuZWQgYXMgYW4gYXJyYXkgZm9yIHRlcnNlbmVzc1xuICByZXR1cm4gW1xuICAgIHBvbGljeSAhPT0gdW5kZWZpbmVkXG4gICAgICA/IHBvbGljeS5jcmVhdGVIVE1MKGh0bWxSZXN1bHQpXG4gICAgICA6IChodG1sUmVzdWx0IGFzIHVua25vd24gYXMgVHJ1c3RlZEhUTUwpLFxuICAgIGF0dHJOYW1lcyxcbiAgXTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIHtUZW1wbGF0ZX07XG5jbGFzcyBUZW1wbGF0ZSB7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgZWwhOiBIVE1MVGVtcGxhdGVFbGVtZW50O1xuICAvKiogQGludGVybmFsICovXG4gIHBhcnRzOiBBcnJheTxUZW1wbGF0ZVBhcnQ+ID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICB7c3RyaW5ncywgWydfJGxpdFR5cGUkJ106IHR5cGV9OiBUZW1wbGF0ZVJlc3VsdCxcbiAgICBvcHRpb25zPzogUmVuZGVyT3B0aW9uc1xuICApIHtcbiAgICBsZXQgbm9kZTogTm9kZSB8IG51bGw7XG4gICAgbGV0IG5vZGVJbmRleCA9IDA7XG4gICAgbGV0IGF0dHJOYW1lSW5kZXggPSAwO1xuICAgIGNvbnN0IHBhcnRDb3VudCA9IHN0cmluZ3MubGVuZ3RoIC0gMTtcbiAgICBjb25zdCBwYXJ0cyA9IHRoaXMucGFydHM7XG5cbiAgICAvLyBDcmVhdGUgdGVtcGxhdGUgZWxlbWVudFxuICAgIGNvbnN0IFtodG1sLCBhdHRyTmFtZXNdID0gZ2V0VGVtcGxhdGVIdG1sKHN0cmluZ3MsIHR5cGUpO1xuICAgIHRoaXMuZWwgPSBUZW1wbGF0ZS5jcmVhdGVFbGVtZW50KGh0bWwsIG9wdGlvbnMpO1xuICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IHRoaXMuZWwuY29udGVudDtcblxuICAgIC8vIFJlcGFyZW50IFNWRyBub2RlcyBpbnRvIHRlbXBsYXRlIHJvb3RcbiAgICBpZiAodHlwZSA9PT0gU1ZHX1JFU1VMVCkge1xuICAgICAgY29uc3QgY29udGVudCA9IHRoaXMuZWwuY29udGVudDtcbiAgICAgIGNvbnN0IHN2Z0VsZW1lbnQgPSBjb250ZW50LmZpcnN0Q2hpbGQhO1xuICAgICAgc3ZnRWxlbWVudC5yZW1vdmUoKTtcbiAgICAgIGNvbnRlbnQuYXBwZW5kKC4uLnN2Z0VsZW1lbnQuY2hpbGROb2Rlcyk7XG4gICAgfVxuXG4gICAgLy8gV2FsayB0aGUgdGVtcGxhdGUgdG8gZmluZCBiaW5kaW5nIG1hcmtlcnMgYW5kIGNyZWF0ZSBUZW1wbGF0ZVBhcnRzXG4gICAgd2hpbGUgKChub2RlID0gd2Fsa2VyLm5leHROb2RlKCkpICE9PSBudWxsICYmIHBhcnRzLmxlbmd0aCA8IHBhcnRDb3VudCkge1xuICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgaWYgKERFVl9NT0RFKSB7XG4gICAgICAgICAgY29uc3QgdGFnID0gKG5vZGUgYXMgRWxlbWVudCkubG9jYWxOYW1lO1xuICAgICAgICAgIC8vIFdhcm4gaWYgYHRleHRhcmVhYCBpbmNsdWRlcyBhbiBleHByZXNzaW9uIGFuZCB0aHJvdyBpZiBgdGVtcGxhdGVgXG4gICAgICAgICAgLy8gZG9lcyBzaW5jZSB0aGVzZSBhcmUgbm90IHN1cHBvcnRlZC4gV2UgZG8gdGhpcyBieSBjaGVja2luZ1xuICAgICAgICAgIC8vIGlubmVySFRNTCBmb3IgYW55dGhpbmcgdGhhdCBsb29rcyBsaWtlIGEgbWFya2VyLiBUaGlzIGNhdGNoZXNcbiAgICAgICAgICAvLyBjYXNlcyBsaWtlIGJpbmRpbmdzIGluIHRleHRhcmVhIHRoZXJlIG1hcmtlcnMgdHVybiBpbnRvIHRleHQgbm9kZXMuXG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgL14oPzp0ZXh0YXJlYXx0ZW1wbGF0ZSkkL2khLnRlc3QodGFnKSAmJlxuICAgICAgICAgICAgKG5vZGUgYXMgRWxlbWVudCkuaW5uZXJIVE1MLmluY2x1ZGVzKG1hcmtlcilcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIGNvbnN0IG0gPVxuICAgICAgICAgICAgICBgRXhwcmVzc2lvbnMgYXJlIG5vdCBzdXBwb3J0ZWQgaW5zaWRlIFxcYCR7dGFnfVxcYCBgICtcbiAgICAgICAgICAgICAgYGVsZW1lbnRzLiBTZWUgaHR0cHM6Ly9saXQuZGV2L21zZy9leHByZXNzaW9uLWluLSR7dGFnfSBmb3IgbW9yZSBgICtcbiAgICAgICAgICAgICAgYGluZm9ybWF0aW9uLmA7XG4gICAgICAgICAgICBpZiAodGFnID09PSAndGVtcGxhdGUnKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtKTtcbiAgICAgICAgICAgIH0gZWxzZSBpc3N1ZVdhcm5pbmcoJycsIG0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPIChqdXN0aW5mYWduYW5pKTogZm9yIGF0dGVtcHRlZCBkeW5hbWljIHRhZyBuYW1lcywgd2UgZG9uJ3RcbiAgICAgICAgLy8gaW5jcmVtZW50IHRoZSBiaW5kaW5nSW5kZXgsIGFuZCBpdCdsbCBiZSBvZmYgYnkgMSBpbiB0aGUgZWxlbWVudFxuICAgICAgICAvLyBhbmQgb2ZmIGJ5IHR3byBhZnRlciBpdC5cbiAgICAgICAgaWYgKChub2RlIGFzIEVsZW1lbnQpLmhhc0F0dHJpYnV0ZXMoKSkge1xuICAgICAgICAgIC8vIFdlIGRlZmVyIHJlbW92aW5nIGJvdW5kIGF0dHJpYnV0ZXMgYmVjYXVzZSBvbiBJRSB3ZSBtaWdodCBub3QgYmVcbiAgICAgICAgICAvLyBpdGVyYXRpbmcgYXR0cmlidXRlcyBpbiB0aGVpciB0ZW1wbGF0ZSBvcmRlciwgYW5kIHdvdWxkIHNvbWV0aW1lc1xuICAgICAgICAgIC8vIHJlbW92ZSBhbiBhdHRyaWJ1dGUgdGhhdCB3ZSBzdGlsbCBuZWVkIHRvIGNyZWF0ZSBhIHBhcnQgZm9yLlxuICAgICAgICAgIGNvbnN0IGF0dHJzVG9SZW1vdmUgPSBbXTtcbiAgICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgKG5vZGUgYXMgRWxlbWVudCkuZ2V0QXR0cmlidXRlTmFtZXMoKSkge1xuICAgICAgICAgICAgLy8gYG5hbWVgIGlzIHRoZSBuYW1lIG9mIHRoZSBhdHRyaWJ1dGUgd2UncmUgaXRlcmF0aW5nIG92ZXIsIGJ1dCBub3RcbiAgICAgICAgICAgIC8vIF9uZWNjZXNzYXJpbHlfIHRoZSBuYW1lIG9mIHRoZSBhdHRyaWJ1dGUgd2Ugd2lsbCBjcmVhdGUgYSBwYXJ0XG4gICAgICAgICAgICAvLyBmb3IuIFRoZXkgY2FuIGJlIGRpZmZlcmVudCBpbiBicm93c2VycyB0aGF0IGRvbid0IGl0ZXJhdGUgb25cbiAgICAgICAgICAgIC8vIGF0dHJpYnV0ZXMgaW4gc291cmNlIG9yZGVyLiBJbiB0aGF0IGNhc2UgdGhlIGF0dHJOYW1lcyBhcnJheVxuICAgICAgICAgICAgLy8gY29udGFpbnMgdGhlIGF0dHJpYnV0ZSBuYW1lIHdlJ2xsIHByb2Nlc3MgbmV4dC4gV2Ugb25seSBuZWVkIHRoZVxuICAgICAgICAgICAgLy8gYXR0cmlidXRlIG5hbWUgaGVyZSB0byBrbm93IGlmIHdlIHNob3VsZCBwcm9jZXNzIGEgYm91bmQgYXR0cmlidXRlXG4gICAgICAgICAgICAvLyBvbiB0aGlzIGVsZW1lbnQuXG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIG5hbWUuZW5kc1dpdGgoYm91bmRBdHRyaWJ1dGVTdWZmaXgpIHx8XG4gICAgICAgICAgICAgIG5hbWUuc3RhcnRzV2l0aChtYXJrZXIpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgY29uc3QgcmVhbE5hbWUgPSBhdHRyTmFtZXNbYXR0ck5hbWVJbmRleCsrXTtcbiAgICAgICAgICAgICAgYXR0cnNUb1JlbW92ZS5wdXNoKG5hbWUpO1xuICAgICAgICAgICAgICBpZiAocmVhbE5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIC8vIExvd2VyY2FzZSBmb3IgY2FzZS1zZW5zaXRpdmUgU1ZHIGF0dHJpYnV0ZXMgbGlrZSB2aWV3Qm94XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAobm9kZSBhcyBFbGVtZW50KS5nZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgICByZWFsTmFtZS50b0xvd2VyQ2FzZSgpICsgYm91bmRBdHRyaWJ1dGVTdWZmaXhcbiAgICAgICAgICAgICAgICApITtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0aWNzID0gdmFsdWUuc3BsaXQobWFya2VyKTtcbiAgICAgICAgICAgICAgICBjb25zdCBtID0gLyhbLj9AXSk/KC4qKS8uZXhlYyhyZWFsTmFtZSkhO1xuICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgdHlwZTogQVRUUklCVVRFX1BBUlQsXG4gICAgICAgICAgICAgICAgICBpbmRleDogbm9kZUluZGV4LFxuICAgICAgICAgICAgICAgICAgbmFtZTogbVsyXSxcbiAgICAgICAgICAgICAgICAgIHN0cmluZ3M6IHN0YXRpY3MsXG4gICAgICAgICAgICAgICAgICBjdG9yOlxuICAgICAgICAgICAgICAgICAgICBtWzFdID09PSAnLidcbiAgICAgICAgICAgICAgICAgICAgICA/IFByb3BlcnR5UGFydFxuICAgICAgICAgICAgICAgICAgICAgIDogbVsxXSA9PT0gJz8nXG4gICAgICAgICAgICAgICAgICAgICAgPyBCb29sZWFuQXR0cmlidXRlUGFydFxuICAgICAgICAgICAgICAgICAgICAgIDogbVsxXSA9PT0gJ0AnXG4gICAgICAgICAgICAgICAgICAgICAgPyBFdmVudFBhcnRcbiAgICAgICAgICAgICAgICAgICAgICA6IEF0dHJpYnV0ZVBhcnQsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGFydHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICB0eXBlOiBFTEVNRU5UX1BBUlQsXG4gICAgICAgICAgICAgICAgICBpbmRleDogbm9kZUluZGV4LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBhdHRyc1RvUmVtb3ZlKSB7XG4gICAgICAgICAgICAobm9kZSBhcyBFbGVtZW50KS5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE8gKGp1c3RpbmZhZ25hbmkpOiBiZW5jaG1hcmsgdGhlIHJlZ2V4IGFnYWluc3QgdGVzdGluZyBmb3IgZWFjaFxuICAgICAgICAvLyBvZiB0aGUgMyByYXcgdGV4dCBlbGVtZW50IG5hbWVzLlxuICAgICAgICBpZiAocmF3VGV4dEVsZW1lbnQudGVzdCgobm9kZSBhcyBFbGVtZW50KS50YWdOYW1lKSkge1xuICAgICAgICAgIC8vIEZvciByYXcgdGV4dCBlbGVtZW50cyB3ZSBuZWVkIHRvIHNwbGl0IHRoZSB0ZXh0IGNvbnRlbnQgb25cbiAgICAgICAgICAvLyBtYXJrZXJzLCBjcmVhdGUgYSBUZXh0IG5vZGUgZm9yIGVhY2ggc2VnbWVudCwgYW5kIGNyZWF0ZVxuICAgICAgICAgIC8vIGEgVGVtcGxhdGVQYXJ0IGZvciBlYWNoIG1hcmtlci5cbiAgICAgICAgICBjb25zdCBzdHJpbmdzID0gKG5vZGUgYXMgRWxlbWVudCkudGV4dENvbnRlbnQhLnNwbGl0KG1hcmtlcik7XG4gICAgICAgICAgY29uc3QgbGFzdEluZGV4ID0gc3RyaW5ncy5sZW5ndGggLSAxO1xuICAgICAgICAgIGlmIChsYXN0SW5kZXggPiAwKSB7XG4gICAgICAgICAgICAobm9kZSBhcyBFbGVtZW50KS50ZXh0Q29udGVudCA9IHRydXN0ZWRUeXBlc1xuICAgICAgICAgICAgICA/ICh0cnVzdGVkVHlwZXMuZW1wdHlTY3JpcHQgYXMgdW5rbm93biBhcyAnJylcbiAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgICAgIC8vIEdlbmVyYXRlIGEgbmV3IHRleHQgbm9kZSBmb3IgZWFjaCBsaXRlcmFsIHNlY3Rpb25cbiAgICAgICAgICAgIC8vIFRoZXNlIG5vZGVzIGFyZSBhbHNvIHVzZWQgYXMgdGhlIG1hcmtlcnMgZm9yIG5vZGUgcGFydHNcbiAgICAgICAgICAgIC8vIFdlIGNhbid0IHVzZSBlbXB0eSB0ZXh0IG5vZGVzIGFzIG1hcmtlcnMgYmVjYXVzZSB0aGV5J3JlXG4gICAgICAgICAgICAvLyBub3JtYWxpemVkIHdoZW4gY2xvbmluZyBpbiBJRSAoY291bGQgc2ltcGxpZnkgd2hlblxuICAgICAgICAgICAgLy8gSUUgaXMgbm8gbG9uZ2VyIHN1cHBvcnRlZClcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGFzdEluZGV4OyBpKyspIHtcbiAgICAgICAgICAgICAgKG5vZGUgYXMgRWxlbWVudCkuYXBwZW5kKHN0cmluZ3NbaV0sIGNyZWF0ZU1hcmtlcigpKTtcbiAgICAgICAgICAgICAgLy8gV2FsayBwYXN0IHRoZSBtYXJrZXIgbm9kZSB3ZSBqdXN0IGFkZGVkXG4gICAgICAgICAgICAgIHdhbGtlci5uZXh0Tm9kZSgpO1xuICAgICAgICAgICAgICBwYXJ0cy5wdXNoKHt0eXBlOiBDSElMRF9QQVJULCBpbmRleDogKytub2RlSW5kZXh9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE5vdGUgYmVjYXVzZSB0aGlzIG1hcmtlciBpcyBhZGRlZCBhZnRlciB0aGUgd2Fsa2VyJ3MgY3VycmVudFxuICAgICAgICAgICAgLy8gbm9kZSwgaXQgd2lsbCBiZSB3YWxrZWQgdG8gaW4gdGhlIG91dGVyIGxvb3AgKGFuZCBpZ25vcmVkKSwgc29cbiAgICAgICAgICAgIC8vIHdlIGRvbid0IG5lZWQgdG8gYWRqdXN0IG5vZGVJbmRleCBoZXJlXG4gICAgICAgICAgICAobm9kZSBhcyBFbGVtZW50KS5hcHBlbmQoc3RyaW5nc1tsYXN0SW5kZXhdLCBjcmVhdGVNYXJrZXIoKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IDgpIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IChub2RlIGFzIENvbW1lbnQpLmRhdGE7XG4gICAgICAgIGlmIChkYXRhID09PSBtYXJrZXJNYXRjaCkge1xuICAgICAgICAgIHBhcnRzLnB1c2goe3R5cGU6IENISUxEX1BBUlQsIGluZGV4OiBub2RlSW5kZXh9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsZXQgaSA9IC0xO1xuICAgICAgICAgIHdoaWxlICgoaSA9IChub2RlIGFzIENvbW1lbnQpLmRhdGEuaW5kZXhPZihtYXJrZXIsIGkgKyAxKSkgIT09IC0xKSB7XG4gICAgICAgICAgICAvLyBDb21tZW50IG5vZGUgaGFzIGEgYmluZGluZyBtYXJrZXIgaW5zaWRlLCBtYWtlIGFuIGluYWN0aXZlIHBhcnRcbiAgICAgICAgICAgIC8vIFRoZSBiaW5kaW5nIHdvbid0IHdvcmssIGJ1dCBzdWJzZXF1ZW50IGJpbmRpbmdzIHdpbGxcbiAgICAgICAgICAgIHBhcnRzLnB1c2goe3R5cGU6IENPTU1FTlRfUEFSVCwgaW5kZXg6IG5vZGVJbmRleH0pO1xuICAgICAgICAgICAgLy8gTW92ZSB0byB0aGUgZW5kIG9mIHRoZSBtYXRjaFxuICAgICAgICAgICAgaSArPSBtYXJrZXIubGVuZ3RoIC0gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG5vZGVJbmRleCsrO1xuICAgIH1cbiAgfVxuXG4gIC8vIE92ZXJyaWRkZW4gdmlhIGBsaXRIdG1sUG9seWZpbGxTdXBwb3J0YCB0byBwcm92aWRlIHBsYXRmb3JtIHN1cHBvcnQuXG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY3JlYXRlRWxlbWVudChodG1sOiBUcnVzdGVkSFRNTCwgX29wdGlvbnM/OiBSZW5kZXJPcHRpb25zKSB7XG4gICAgY29uc3QgZWwgPSBkLmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgZWwuaW5uZXJIVE1MID0gaHRtbCBhcyB1bmtub3duIGFzIHN0cmluZztcbiAgICByZXR1cm4gZWw7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBEaXNjb25uZWN0YWJsZSB7XG4gIF8kcGFyZW50PzogRGlzY29ubmVjdGFibGU7XG4gIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT47XG4gIC8vIFJhdGhlciB0aGFuIGhvbGQgY29ubmVjdGlvbiBzdGF0ZSBvbiBpbnN0YW5jZXMsIERpc2Nvbm5lY3RhYmxlcyByZWN1cnNpdmVseVxuICAvLyBmZXRjaCB0aGUgY29ubmVjdGlvbiBzdGF0ZSBmcm9tIHRoZSBSb290UGFydCB0aGV5IGFyZSBjb25uZWN0ZWQgaW4gdmlhXG4gIC8vIGdldHRlcnMgdXAgdGhlIERpc2Nvbm5lY3RhYmxlIHRyZWUgdmlhIF8kcGFyZW50IHJlZmVyZW5jZXMuIFRoaXMgcHVzaGVzIHRoZVxuICAvLyBjb3N0IG9mIHRyYWNraW5nIHRoZSBpc0Nvbm5lY3RlZCBzdGF0ZSB0byBgQXN5bmNEaXJlY3RpdmVzYCwgYW5kIGF2b2lkc1xuICAvLyBuZWVkaW5nIHRvIHBhc3MgYWxsIERpc2Nvbm5lY3RhYmxlcyAocGFydHMsIHRlbXBsYXRlIGluc3RhbmNlcywgYW5kXG4gIC8vIGRpcmVjdGl2ZXMpIHRoZWlyIGNvbm5lY3Rpb24gc3RhdGUgZWFjaCB0aW1lIGl0IGNoYW5nZXMsIHdoaWNoIHdvdWxkIGJlXG4gIC8vIGNvc3RseSBmb3IgdHJlZXMgdGhhdCBoYXZlIG5vIEFzeW5jRGlyZWN0aXZlcy5cbiAgXyRpc0Nvbm5lY3RlZDogYm9vbGVhbjtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZURpcmVjdGl2ZShcbiAgcGFydDogQ2hpbGRQYXJ0IHwgQXR0cmlidXRlUGFydCB8IEVsZW1lbnRQYXJ0LFxuICB2YWx1ZTogdW5rbm93bixcbiAgcGFyZW50OiBEaXJlY3RpdmVQYXJlbnQgPSBwYXJ0LFxuICBhdHRyaWJ1dGVJbmRleD86IG51bWJlclxuKTogdW5rbm93biB7XG4gIC8vIEJhaWwgZWFybHkgaWYgdGhlIHZhbHVlIGlzIGV4cGxpY2l0bHkgbm9DaGFuZ2UuIE5vdGUsIHRoaXMgbWVhbnMgYW55XG4gIC8vIG5lc3RlZCBkaXJlY3RpdmUgaXMgc3RpbGwgYXR0YWNoZWQgYW5kIGlzIG5vdCBydW4uXG4gIGlmICh2YWx1ZSA9PT0gbm9DaGFuZ2UpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgbGV0IGN1cnJlbnREaXJlY3RpdmUgPVxuICAgIGF0dHJpYnV0ZUluZGV4ICE9PSB1bmRlZmluZWRcbiAgICAgID8gKHBhcmVudCBhcyBBdHRyaWJ1dGVQYXJ0KS5fX2RpcmVjdGl2ZXM/LlthdHRyaWJ1dGVJbmRleF1cbiAgICAgIDogKHBhcmVudCBhcyBDaGlsZFBhcnQgfCBFbGVtZW50UGFydCB8IERpcmVjdGl2ZSkuX19kaXJlY3RpdmU7XG4gIGNvbnN0IG5leHREaXJlY3RpdmVDb25zdHJ1Y3RvciA9IGlzUHJpbWl0aXZlKHZhbHVlKVxuICAgID8gdW5kZWZpbmVkXG4gICAgOiAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgICAgKHZhbHVlIGFzIERpcmVjdGl2ZVJlc3VsdClbJ18kbGl0RGlyZWN0aXZlJCddO1xuICBpZiAoY3VycmVudERpcmVjdGl2ZT8uY29uc3RydWN0b3IgIT09IG5leHREaXJlY3RpdmVDb25zdHJ1Y3Rvcikge1xuICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgY3VycmVudERpcmVjdGl2ZT8uWydfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkJ10/LihmYWxzZSk7XG4gICAgaWYgKG5leHREaXJlY3RpdmVDb25zdHJ1Y3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjdXJyZW50RGlyZWN0aXZlID0gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBjdXJyZW50RGlyZWN0aXZlID0gbmV3IG5leHREaXJlY3RpdmVDb25zdHJ1Y3RvcihwYXJ0IGFzIFBhcnRJbmZvKTtcbiAgICAgIGN1cnJlbnREaXJlY3RpdmUuXyRpbml0aWFsaXplKHBhcnQsIHBhcmVudCwgYXR0cmlidXRlSW5kZXgpO1xuICAgIH1cbiAgICBpZiAoYXR0cmlidXRlSW5kZXggIT09IHVuZGVmaW5lZCkge1xuICAgICAgKChwYXJlbnQgYXMgQXR0cmlidXRlUGFydCkuX19kaXJlY3RpdmVzID8/PSBbXSlbYXR0cmlidXRlSW5kZXhdID1cbiAgICAgICAgY3VycmVudERpcmVjdGl2ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgKHBhcmVudCBhcyBDaGlsZFBhcnQgfCBEaXJlY3RpdmUpLl9fZGlyZWN0aXZlID0gY3VycmVudERpcmVjdGl2ZTtcbiAgICB9XG4gIH1cbiAgaWYgKGN1cnJlbnREaXJlY3RpdmUgIT09IHVuZGVmaW5lZCkge1xuICAgIHZhbHVlID0gcmVzb2x2ZURpcmVjdGl2ZShcbiAgICAgIHBhcnQsXG4gICAgICBjdXJyZW50RGlyZWN0aXZlLl8kcmVzb2x2ZShwYXJ0LCAodmFsdWUgYXMgRGlyZWN0aXZlUmVzdWx0KS52YWx1ZXMpLFxuICAgICAgY3VycmVudERpcmVjdGl2ZSxcbiAgICAgIGF0dHJpYnV0ZUluZGV4XG4gICAgKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogQW4gdXBkYXRlYWJsZSBpbnN0YW5jZSBvZiBhIFRlbXBsYXRlLiBIb2xkcyByZWZlcmVuY2VzIHRvIHRoZSBQYXJ0cyB1c2VkIHRvXG4gKiB1cGRhdGUgdGhlIHRlbXBsYXRlIGluc3RhbmNlLlxuICovXG5jbGFzcyBUZW1wbGF0ZUluc3RhbmNlIGltcGxlbWVudHMgRGlzY29ubmVjdGFibGUge1xuICAvKiogQGludGVybmFsICovXG4gIF8kdGVtcGxhdGU6IFRlbXBsYXRlO1xuICAvKiogQGludGVybmFsICovXG4gIF9wYXJ0czogQXJyYXk8UGFydCB8IHVuZGVmaW5lZD4gPSBbXTtcblxuICAvKiogQGludGVybmFsICovXG4gIF8kcGFyZW50OiBDaGlsZFBhcnQ7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuPzogU2V0PERpc2Nvbm5lY3RhYmxlPiA9IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3Rvcih0ZW1wbGF0ZTogVGVtcGxhdGUsIHBhcmVudDogQ2hpbGRQYXJ0KSB7XG4gICAgdGhpcy5fJHRlbXBsYXRlID0gdGVtcGxhdGU7XG4gICAgdGhpcy5fJHBhcmVudCA9IHBhcmVudDtcbiAgfVxuXG4gIC8vIENhbGxlZCBieSBDaGlsZFBhcnQgcGFyZW50Tm9kZSBnZXR0ZXJcbiAgZ2V0IHBhcmVudE5vZGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuXyRwYXJlbnQucGFyZW50Tm9kZTtcbiAgfVxuXG4gIC8vIFNlZSBjb21tZW50IGluIERpc2Nvbm5lY3RhYmxlIGludGVyZmFjZSBmb3Igd2h5IHRoaXMgaXMgYSBnZXR0ZXJcbiAgZ2V0IF8kaXNDb25uZWN0ZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuXyRwYXJlbnQuXyRpc0Nvbm5lY3RlZDtcbiAgfVxuXG4gIC8vIFRoaXMgbWV0aG9kIGlzIHNlcGFyYXRlIGZyb20gdGhlIGNvbnN0cnVjdG9yIGJlY2F1c2Ugd2UgbmVlZCB0byByZXR1cm4gYVxuICAvLyBEb2N1bWVudEZyYWdtZW50IGFuZCB3ZSBkb24ndCB3YW50IHRvIGhvbGQgb250byBpdCB3aXRoIGFuIGluc3RhbmNlIGZpZWxkLlxuICBfY2xvbmUob3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IHtcbiAgICAgIGVsOiB7Y29udGVudH0sXG4gICAgICBwYXJ0czogcGFydHMsXG4gICAgfSA9IHRoaXMuXyR0ZW1wbGF0ZTtcbiAgICBjb25zdCBmcmFnbWVudCA9IChvcHRpb25zPy5jcmVhdGlvblNjb3BlID8/IGQpLmltcG9ydE5vZGUoY29udGVudCwgdHJ1ZSk7XG4gICAgd2Fsa2VyLmN1cnJlbnROb2RlID0gZnJhZ21lbnQ7XG5cbiAgICBsZXQgbm9kZSA9IHdhbGtlci5uZXh0Tm9kZSgpITtcbiAgICBsZXQgbm9kZUluZGV4ID0gMDtcbiAgICBsZXQgcGFydEluZGV4ID0gMDtcbiAgICBsZXQgdGVtcGxhdGVQYXJ0ID0gcGFydHNbMF07XG5cbiAgICB3aGlsZSAodGVtcGxhdGVQYXJ0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmIChub2RlSW5kZXggPT09IHRlbXBsYXRlUGFydC5pbmRleCkge1xuICAgICAgICBsZXQgcGFydDogUGFydCB8IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKHRlbXBsYXRlUGFydC50eXBlID09PSBDSElMRF9QQVJUKSB7XG4gICAgICAgICAgcGFydCA9IG5ldyBDaGlsZFBhcnQoXG4gICAgICAgICAgICBub2RlIGFzIEhUTUxFbGVtZW50LFxuICAgICAgICAgICAgbm9kZS5uZXh0U2libGluZyxcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICBvcHRpb25zXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmICh0ZW1wbGF0ZVBhcnQudHlwZSA9PT0gQVRUUklCVVRFX1BBUlQpIHtcbiAgICAgICAgICBwYXJ0ID0gbmV3IHRlbXBsYXRlUGFydC5jdG9yKFxuICAgICAgICAgICAgbm9kZSBhcyBIVE1MRWxlbWVudCxcbiAgICAgICAgICAgIHRlbXBsYXRlUGFydC5uYW1lLFxuICAgICAgICAgICAgdGVtcGxhdGVQYXJ0LnN0cmluZ3MsXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgb3B0aW9uc1xuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAodGVtcGxhdGVQYXJ0LnR5cGUgPT09IEVMRU1FTlRfUEFSVCkge1xuICAgICAgICAgIHBhcnQgPSBuZXcgRWxlbWVudFBhcnQobm9kZSBhcyBIVE1MRWxlbWVudCwgdGhpcywgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcGFydHMucHVzaChwYXJ0KTtcbiAgICAgICAgdGVtcGxhdGVQYXJ0ID0gcGFydHNbKytwYXJ0SW5kZXhdO1xuICAgICAgfVxuICAgICAgaWYgKG5vZGVJbmRleCAhPT0gdGVtcGxhdGVQYXJ0Py5pbmRleCkge1xuICAgICAgICBub2RlID0gd2Fsa2VyLm5leHROb2RlKCkhO1xuICAgICAgICBub2RlSW5kZXgrKztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZyYWdtZW50O1xuICB9XG5cbiAgX3VwZGF0ZSh2YWx1ZXM6IEFycmF5PHVua25vd24+KSB7XG4gICAgbGV0IGkgPSAwO1xuICAgIGZvciAoY29uc3QgcGFydCBvZiB0aGlzLl9wYXJ0cykge1xuICAgICAgaWYgKHBhcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAoKHBhcnQgYXMgQXR0cmlidXRlUGFydCkuc3RyaW5ncyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgKHBhcnQgYXMgQXR0cmlidXRlUGFydCkuXyRzZXRWYWx1ZSh2YWx1ZXMsIHBhcnQgYXMgQXR0cmlidXRlUGFydCwgaSk7XG4gICAgICAgICAgLy8gVGhlIG51bWJlciBvZiB2YWx1ZXMgdGhlIHBhcnQgY29uc3VtZXMgaXMgcGFydC5zdHJpbmdzLmxlbmd0aCAtIDFcbiAgICAgICAgICAvLyBzaW5jZSB2YWx1ZXMgYXJlIGluIGJldHdlZW4gdGVtcGxhdGUgc3BhbnMuIFdlIGluY3JlbWVudCBpIGJ5IDFcbiAgICAgICAgICAvLyBsYXRlciBpbiB0aGUgbG9vcCwgc28gaW5jcmVtZW50IGl0IGJ5IHBhcnQuc3RyaW5ncy5sZW5ndGggLSAyIGhlcmVcbiAgICAgICAgICBpICs9IChwYXJ0IGFzIEF0dHJpYnV0ZVBhcnQpLnN0cmluZ3MhLmxlbmd0aCAtIDI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGFydC5fJHNldFZhbHVlKHZhbHVlc1tpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGkrKztcbiAgICB9XG4gIH1cbn1cblxuLypcbiAqIFBhcnRzXG4gKi9cbnR5cGUgQXR0cmlidXRlVGVtcGxhdGVQYXJ0ID0ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgQVRUUklCVVRFX1BBUlQ7XG4gIHJlYWRvbmx5IGluZGV4OiBudW1iZXI7XG4gIHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICByZWFkb25seSBjdG9yOiB0eXBlb2YgQXR0cmlidXRlUGFydDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICByZWFkb25seSBzdHJpbmdzOiBSZWFkb25seUFycmF5PHN0cmluZz47XG59O1xudHlwZSBOb2RlVGVtcGxhdGVQYXJ0ID0ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgQ0hJTERfUEFSVDtcbiAgcmVhZG9ubHkgaW5kZXg6IG51bWJlcjtcbn07XG50eXBlIEVsZW1lbnRUZW1wbGF0ZVBhcnQgPSB7XG4gIHJlYWRvbmx5IHR5cGU6IHR5cGVvZiBFTEVNRU5UX1BBUlQ7XG4gIHJlYWRvbmx5IGluZGV4OiBudW1iZXI7XG59O1xudHlwZSBDb21tZW50VGVtcGxhdGVQYXJ0ID0ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgQ09NTUVOVF9QQVJUO1xuICByZWFkb25seSBpbmRleDogbnVtYmVyO1xufTtcblxuLyoqXG4gKiBBIFRlbXBsYXRlUGFydCByZXByZXNlbnRzIGEgZHluYW1pYyBwYXJ0IGluIGEgdGVtcGxhdGUsIGJlZm9yZSB0aGUgdGVtcGxhdGVcbiAqIGlzIGluc3RhbnRpYXRlZC4gV2hlbiBhIHRlbXBsYXRlIGlzIGluc3RhbnRpYXRlZCBQYXJ0cyBhcmUgY3JlYXRlZCBmcm9tXG4gKiBUZW1wbGF0ZVBhcnRzLlxuICovXG50eXBlIFRlbXBsYXRlUGFydCA9XG4gIHwgTm9kZVRlbXBsYXRlUGFydFxuICB8IEF0dHJpYnV0ZVRlbXBsYXRlUGFydFxuICB8IEVsZW1lbnRUZW1wbGF0ZVBhcnRcbiAgfCBDb21tZW50VGVtcGxhdGVQYXJ0O1xuXG5leHBvcnQgdHlwZSBQYXJ0ID1cbiAgfCBDaGlsZFBhcnRcbiAgfCBBdHRyaWJ1dGVQYXJ0XG4gIHwgUHJvcGVydHlQYXJ0XG4gIHwgQm9vbGVhbkF0dHJpYnV0ZVBhcnRcbiAgfCBFbGVtZW50UGFydFxuICB8IEV2ZW50UGFydDtcblxuZXhwb3J0IHR5cGUge0NoaWxkUGFydH07XG5jbGFzcyBDaGlsZFBhcnQgaW1wbGVtZW50cyBEaXNjb25uZWN0YWJsZSB7XG4gIHJlYWRvbmx5IHR5cGUgPSBDSElMRF9QQVJUO1xuICByZWFkb25seSBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICBfJGNvbW1pdHRlZFZhbHVlOiB1bmtub3duID0gbm90aGluZztcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfX2RpcmVjdGl2ZT86IERpcmVjdGl2ZTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHN0YXJ0Tm9kZTogQ2hpbGROb2RlO1xuICAvKiogQGludGVybmFsICovXG4gIF8kZW5kTm9kZTogQ2hpbGROb2RlIHwgbnVsbDtcbiAgcHJpdmF0ZSBfdGV4dFNhbml0aXplcjogVmFsdWVTYW5pdGl6ZXIgfCB1bmRlZmluZWQ7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlIHwgdW5kZWZpbmVkO1xuICAvKipcbiAgICogQ29ubmVjdGlvbiBzdGF0ZSBmb3IgUm9vdFBhcnRzIG9ubHkgKGkuZS4gQ2hpbGRQYXJ0IHdpdGhvdXQgXyRwYXJlbnRcbiAgICogcmV0dXJuZWQgZnJvbSB0b3AtbGV2ZWwgYHJlbmRlcmApLiBUaGlzIGZpZWxkIGlzIHVuc2VkIG90aGVyd2lzZS4gVGhlXG4gICAqIGludGVudGlvbiB3b3VsZCBjbGVhcmVyIGlmIHdlIG1hZGUgYFJvb3RQYXJ0YCBhIHN1YmNsYXNzIG9mIGBDaGlsZFBhcnRgXG4gICAqIHdpdGggdGhpcyBmaWVsZCAoYW5kIGEgZGlmZmVyZW50IF8kaXNDb25uZWN0ZWQgZ2V0dGVyKSwgYnV0IHRoZSBzdWJjbGFzc1xuICAgKiBjYXVzZWQgYSBwZXJmIHJlZ3Jlc3Npb24sIHBvc3NpYmx5IGR1ZSB0byBtYWtpbmcgY2FsbCBzaXRlcyBwb2x5bW9ycGhpYy5cbiAgICogQGludGVybmFsXG4gICAqL1xuICBfX2lzQ29ubmVjdGVkOiBib29sZWFuO1xuXG4gIC8vIFNlZSBjb21tZW50IGluIERpc2Nvbm5lY3RhYmxlIGludGVyZmFjZSBmb3Igd2h5IHRoaXMgaXMgYSBnZXR0ZXJcbiAgZ2V0IF8kaXNDb25uZWN0ZWQoKSB7XG4gICAgLy8gQ2hpbGRQYXJ0cyB0aGF0IGFyZSBub3QgYXQgdGhlIHJvb3Qgc2hvdWxkIGFsd2F5cyBiZSBjcmVhdGVkIHdpdGggYVxuICAgIC8vIHBhcmVudDsgb25seSBSb290Q2hpbGROb2RlJ3Mgd29uJ3QsIHNvIHRoZXkgcmV0dXJuIHRoZSBsb2NhbCBpc0Nvbm5lY3RlZFxuICAgIC8vIHN0YXRlXG4gICAgcmV0dXJuIHRoaXMuXyRwYXJlbnQ/Ll8kaXNDb25uZWN0ZWQgPz8gdGhpcy5fX2lzQ29ubmVjdGVkO1xuICB9XG5cbiAgLy8gVGhlIGZvbGxvd2luZyBmaWVsZHMgd2lsbCBiZSBwYXRjaGVkIG9udG8gQ2hpbGRQYXJ0cyB3aGVuIHJlcXVpcmVkIGJ5XG4gIC8vIEFzeW5jRGlyZWN0aXZlXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuPzogU2V0PERpc2Nvbm5lY3RhYmxlPiA9IHVuZGVmaW5lZDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkPyhcbiAgICBpc0Nvbm5lY3RlZDogYm9vbGVhbixcbiAgICByZW1vdmVGcm9tUGFyZW50PzogYm9vbGVhbixcbiAgICBmcm9tPzogbnVtYmVyXG4gICk6IHZvaWQ7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRyZXBhcmVudERpc2Nvbm5lY3RhYmxlcz8ocGFyZW50OiBEaXNjb25uZWN0YWJsZSk6IHZvaWQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgc3RhcnROb2RlOiBDaGlsZE5vZGUsXG4gICAgZW5kTm9kZTogQ2hpbGROb2RlIHwgbnVsbCxcbiAgICBwYXJlbnQ6IFRlbXBsYXRlSW5zdGFuY2UgfCBDaGlsZFBhcnQgfCB1bmRlZmluZWQsXG4gICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZFxuICApIHtcbiAgICB0aGlzLl8kc3RhcnROb2RlID0gc3RhcnROb2RlO1xuICAgIHRoaXMuXyRlbmROb2RlID0gZW5kTm9kZTtcbiAgICB0aGlzLl8kcGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgLy8gTm90ZSBfX2lzQ29ubmVjdGVkIGlzIG9ubHkgZXZlciBhY2Nlc3NlZCBvbiBSb290UGFydHMgKGkuZS4gd2hlbiB0aGVyZSBpc1xuICAgIC8vIG5vIF8kcGFyZW50KTsgdGhlIHZhbHVlIG9uIGEgbm9uLXJvb3QtcGFydCBpcyBcImRvbid0IGNhcmVcIiwgYnV0IGNoZWNraW5nXG4gICAgLy8gZm9yIHBhcmVudCB3b3VsZCBiZSBtb3JlIGNvZGVcbiAgICB0aGlzLl9faXNDb25uZWN0ZWQgPSBvcHRpb25zPy5pc0Nvbm5lY3RlZCA/PyB0cnVlO1xuICAgIGlmIChFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MpIHtcbiAgICAgIC8vIEV4cGxpY2l0bHkgaW5pdGlhbGl6ZSBmb3IgY29uc2lzdGVudCBjbGFzcyBzaGFwZS5cbiAgICAgIHRoaXMuX3RleHRTYW5pdGl6ZXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBwYXJlbnQgbm9kZSBpbnRvIHdoaWNoIHRoZSBwYXJ0IHJlbmRlcnMgaXRzIGNvbnRlbnQuXG4gICAqXG4gICAqIEEgQ2hpbGRQYXJ0J3MgY29udGVudCBjb25zaXN0cyBvZiBhIHJhbmdlIG9mIGFkamFjZW50IGNoaWxkIG5vZGVzIG9mXG4gICAqIGAucGFyZW50Tm9kZWAsIHBvc3NpYmx5IGJvcmRlcmVkIGJ5ICdtYXJrZXIgbm9kZXMnIChgLnN0YXJ0Tm9kZWAgYW5kXG4gICAqIGAuZW5kTm9kZWApLlxuICAgKlxuICAgKiAtIElmIGJvdGggYC5zdGFydE5vZGVgIGFuZCBgLmVuZE5vZGVgIGFyZSBub24tbnVsbCwgdGhlbiB0aGUgcGFydCdzIGNvbnRlbnRcbiAgICogY29uc2lzdHMgb2YgYWxsIHNpYmxpbmdzIGJldHdlZW4gYC5zdGFydE5vZGVgIGFuZCBgLmVuZE5vZGVgLCBleGNsdXNpdmVseS5cbiAgICpcbiAgICogLSBJZiBgLnN0YXJ0Tm9kZWAgaXMgbm9uLW51bGwgYnV0IGAuZW5kTm9kZWAgaXMgbnVsbCwgdGhlbiB0aGUgcGFydCdzXG4gICAqIGNvbnRlbnQgY29uc2lzdHMgb2YgYWxsIHNpYmxpbmdzIGZvbGxvd2luZyBgLnN0YXJ0Tm9kZWAsIHVwIHRvIGFuZFxuICAgKiBpbmNsdWRpbmcgdGhlIGxhc3QgY2hpbGQgb2YgYC5wYXJlbnROb2RlYC4gSWYgYC5lbmROb2RlYCBpcyBub24tbnVsbCwgdGhlblxuICAgKiBgLnN0YXJ0Tm9kZWAgd2lsbCBhbHdheXMgYmUgbm9uLW51bGwuXG4gICAqXG4gICAqIC0gSWYgYm90aCBgLmVuZE5vZGVgIGFuZCBgLnN0YXJ0Tm9kZWAgYXJlIG51bGwsIHRoZW4gdGhlIHBhcnQncyBjb250ZW50XG4gICAqIGNvbnNpc3RzIG9mIGFsbCBjaGlsZCBub2RlcyBvZiBgLnBhcmVudE5vZGVgLlxuICAgKi9cbiAgZ2V0IHBhcmVudE5vZGUoKTogTm9kZSB7XG4gICAgbGV0IHBhcmVudE5vZGU6IE5vZGUgPSB3cmFwKHRoaXMuXyRzdGFydE5vZGUpLnBhcmVudE5vZGUhO1xuICAgIGNvbnN0IHBhcmVudCA9IHRoaXMuXyRwYXJlbnQ7XG4gICAgaWYgKFxuICAgICAgcGFyZW50ICE9PSB1bmRlZmluZWQgJiZcbiAgICAgIHBhcmVudE5vZGUubm9kZVR5cGUgPT09IDExIC8qIE5vZGUuRE9DVU1FTlRfRlJBR01FTlQgKi9cbiAgICApIHtcbiAgICAgIC8vIElmIHRoZSBwYXJlbnROb2RlIGlzIGEgRG9jdW1lbnRGcmFnbWVudCwgaXQgbWF5IGJlIGJlY2F1c2UgdGhlIERPTSBpc1xuICAgICAgLy8gc3RpbGwgaW4gdGhlIGNsb25lZCBmcmFnbWVudCBkdXJpbmcgaW5pdGlhbCByZW5kZXI7IGlmIHNvLCBnZXQgdGhlIHJlYWxcbiAgICAgIC8vIHBhcmVudE5vZGUgdGhlIHBhcnQgd2lsbCBiZSBjb21taXR0ZWQgaW50byBieSBhc2tpbmcgdGhlIHBhcmVudC5cbiAgICAgIHBhcmVudE5vZGUgPSAocGFyZW50IGFzIENoaWxkUGFydCB8IFRlbXBsYXRlSW5zdGFuY2UpLnBhcmVudE5vZGU7XG4gICAgfVxuICAgIHJldHVybiBwYXJlbnROb2RlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBwYXJ0J3MgbGVhZGluZyBtYXJrZXIgbm9kZSwgaWYgYW55LiBTZWUgYC5wYXJlbnROb2RlYCBmb3IgbW9yZVxuICAgKiBpbmZvcm1hdGlvbi5cbiAgICovXG4gIGdldCBzdGFydE5vZGUoKTogTm9kZSB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLl8kc3RhcnROb2RlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBwYXJ0J3MgdHJhaWxpbmcgbWFya2VyIG5vZGUsIGlmIGFueS4gU2VlIGAucGFyZW50Tm9kZWAgZm9yIG1vcmVcbiAgICogaW5mb3JtYXRpb24uXG4gICAqL1xuICBnZXQgZW5kTm9kZSgpOiBOb2RlIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuXyRlbmROb2RlO1xuICB9XG5cbiAgXyRzZXRWYWx1ZSh2YWx1ZTogdW5rbm93biwgZGlyZWN0aXZlUGFyZW50OiBEaXJlY3RpdmVQYXJlbnQgPSB0aGlzKTogdm9pZCB7XG4gICAgaWYgKERFVl9NT0RFICYmIHRoaXMucGFyZW50Tm9kZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgVGhpcyBcXGBDaGlsZFBhcnRcXGAgaGFzIG5vIFxcYHBhcmVudE5vZGVcXGAgYW5kIHRoZXJlZm9yZSBjYW5ub3QgYWNjZXB0IGEgdmFsdWUuIFRoaXMgbGlrZWx5IG1lYW5zIHRoZSBlbGVtZW50IGNvbnRhaW5pbmcgdGhlIHBhcnQgd2FzIG1hbmlwdWxhdGVkIGluIGFuIHVuc3VwcG9ydGVkIHdheSBvdXRzaWRlIG9mIExpdCdzIGNvbnRyb2wgc3VjaCB0aGF0IHRoZSBwYXJ0J3MgbWFya2VyIG5vZGVzIHdlcmUgZWplY3RlZCBmcm9tIERPTS4gRm9yIGV4YW1wbGUsIHNldHRpbmcgdGhlIGVsZW1lbnQncyBcXGBpbm5lckhUTUxcXGAgb3IgXFxgdGV4dENvbnRlbnRcXGAgY2FuIGRvIHRoaXMuYFxuICAgICAgKTtcbiAgICB9XG4gICAgdmFsdWUgPSByZXNvbHZlRGlyZWN0aXZlKHRoaXMsIHZhbHVlLCBkaXJlY3RpdmVQYXJlbnQpO1xuICAgIGlmIChpc1ByaW1pdGl2ZSh2YWx1ZSkpIHtcbiAgICAgIC8vIE5vbi1yZW5kZXJpbmcgY2hpbGQgdmFsdWVzLiBJdCdzIGltcG9ydGFudCB0aGF0IHRoZXNlIGRvIG5vdCByZW5kZXJcbiAgICAgIC8vIGVtcHR5IHRleHQgbm9kZXMgdG8gYXZvaWQgaXNzdWVzIHdpdGggcHJldmVudGluZyBkZWZhdWx0IDxzbG90PlxuICAgICAgLy8gZmFsbGJhY2sgY29udGVudC5cbiAgICAgIGlmICh2YWx1ZSA9PT0gbm90aGluZyB8fCB2YWx1ZSA9PSBudWxsIHx8IHZhbHVlID09PSAnJykge1xuICAgICAgICBpZiAodGhpcy5fJGNvbW1pdHRlZFZhbHVlICE9PSBub3RoaW5nKSB7XG4gICAgICAgICAgdGhpcy5fJGNsZWFyKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gbm90aGluZztcbiAgICAgIH0gZWxzZSBpZiAodmFsdWUgIT09IHRoaXMuXyRjb21taXR0ZWRWYWx1ZSAmJiB2YWx1ZSAhPT0gbm9DaGFuZ2UpIHtcbiAgICAgICAgdGhpcy5fY29tbWl0VGV4dCh2YWx1ZSk7XG4gICAgICB9XG4gICAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIH0gZWxzZSBpZiAoKHZhbHVlIGFzIFRlbXBsYXRlUmVzdWx0KVsnXyRsaXRUeXBlJCddICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX2NvbW1pdFRlbXBsYXRlUmVzdWx0KHZhbHVlIGFzIFRlbXBsYXRlUmVzdWx0KTtcbiAgICB9IGVsc2UgaWYgKCh2YWx1ZSBhcyBOb2RlKS5ub2RlVHlwZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9jb21taXROb2RlKHZhbHVlIGFzIE5vZGUpO1xuICAgIH0gZWxzZSBpZiAoaXNJdGVyYWJsZSh2YWx1ZSkpIHtcbiAgICAgIHRoaXMuX2NvbW1pdEl0ZXJhYmxlKHZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRmFsbGJhY2ssIHdpbGwgcmVuZGVyIHRoZSBzdHJpbmcgcmVwcmVzZW50YXRpb25cbiAgICAgIHRoaXMuX2NvbW1pdFRleHQodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2luc2VydDxUIGV4dGVuZHMgTm9kZT4obm9kZTogVCwgcmVmID0gdGhpcy5fJGVuZE5vZGUpIHtcbiAgICByZXR1cm4gd3JhcCh3cmFwKHRoaXMuXyRzdGFydE5vZGUpLnBhcmVudE5vZGUhKS5pbnNlcnRCZWZvcmUobm9kZSwgcmVmKTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbW1pdE5vZGUodmFsdWU6IE5vZGUpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5fJGNvbW1pdHRlZFZhbHVlICE9PSB2YWx1ZSkge1xuICAgICAgdGhpcy5fJGNsZWFyKCk7XG4gICAgICBpZiAoXG4gICAgICAgIEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUyAmJlxuICAgICAgICBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwgIT09IG5vb3BTYW5pdGl6ZXJcbiAgICAgICkge1xuICAgICAgICBjb25zdCBwYXJlbnROb2RlTmFtZSA9IHRoaXMuXyRzdGFydE5vZGUucGFyZW50Tm9kZT8ubm9kZU5hbWU7XG4gICAgICAgIGlmIChwYXJlbnROb2RlTmFtZSA9PT0gJ1NUWUxFJyB8fCBwYXJlbnROb2RlTmFtZSA9PT0gJ1NDUklQVCcpIHtcbiAgICAgICAgICBsZXQgbWVzc2FnZSA9ICdGb3JiaWRkZW4nO1xuICAgICAgICAgIGlmIChERVZfTU9ERSkge1xuICAgICAgICAgICAgaWYgKHBhcmVudE5vZGVOYW1lID09PSAnU1RZTEUnKSB7XG4gICAgICAgICAgICAgIG1lc3NhZ2UgPVxuICAgICAgICAgICAgICAgIGBMaXQgZG9lcyBub3Qgc3VwcG9ydCBiaW5kaW5nIGluc2lkZSBzdHlsZSBub2Rlcy4gYCArXG4gICAgICAgICAgICAgICAgYFRoaXMgaXMgYSBzZWN1cml0eSByaXNrLCBhcyBzdHlsZSBpbmplY3Rpb24gYXR0YWNrcyBjYW4gYCArXG4gICAgICAgICAgICAgICAgYGV4ZmlsdHJhdGUgZGF0YSBhbmQgc3Bvb2YgVUlzLiBgICtcbiAgICAgICAgICAgICAgICBgQ29uc2lkZXIgaW5zdGVhZCB1c2luZyBjc3NcXGAuLi5cXGAgbGl0ZXJhbHMgYCArXG4gICAgICAgICAgICAgICAgYHRvIGNvbXBvc2Ugc3R5bGVzLCBhbmQgbWFrZSBkbyBkeW5hbWljIHN0eWxpbmcgd2l0aCBgICtcbiAgICAgICAgICAgICAgICBgY3NzIGN1c3RvbSBwcm9wZXJ0aWVzLCA6OnBhcnRzLCA8c2xvdD5zLCBgICtcbiAgICAgICAgICAgICAgICBgYW5kIGJ5IG11dGF0aW5nIHRoZSBET00gcmF0aGVyIHRoYW4gc3R5bGVzaGVldHMuYDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG1lc3NhZ2UgPVxuICAgICAgICAgICAgICAgIGBMaXQgZG9lcyBub3Qgc3VwcG9ydCBiaW5kaW5nIGluc2lkZSBzY3JpcHQgbm9kZXMuIGAgK1xuICAgICAgICAgICAgICAgIGBUaGlzIGlzIGEgc2VjdXJpdHkgcmlzaywgYXMgaXQgY291bGQgYWxsb3cgYXJiaXRyYXJ5IGAgK1xuICAgICAgICAgICAgICAgIGBjb2RlIGV4ZWN1dGlvbi5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IHRoaXMuX2luc2VydCh2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfY29tbWl0VGV4dCh2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIC8vIElmIHRoZSBjb21taXR0ZWQgdmFsdWUgaXMgYSBwcmltaXRpdmUgaXQgbWVhbnMgd2UgY2FsbGVkIF9jb21taXRUZXh0IG9uXG4gICAgLy8gdGhlIHByZXZpb3VzIHJlbmRlciwgYW5kIHdlIGtub3cgdGhhdCB0aGlzLl8kc3RhcnROb2RlLm5leHRTaWJsaW5nIGlzIGFcbiAgICAvLyBUZXh0IG5vZGUuIFdlIGNhbiBub3cganVzdCByZXBsYWNlIHRoZSB0ZXh0IGNvbnRlbnQgKC5kYXRhKSBvZiB0aGUgbm9kZS5cbiAgICBpZiAoXG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgIT09IG5vdGhpbmcgJiZcbiAgICAgIGlzUHJpbWl0aXZlKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSlcbiAgICApIHtcbiAgICAgIGNvbnN0IG5vZGUgPSB3cmFwKHRoaXMuXyRzdGFydE5vZGUpLm5leHRTaWJsaW5nIGFzIFRleHQ7XG4gICAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICAgIGlmICh0aGlzLl90ZXh0U2FuaXRpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aGlzLl90ZXh0U2FuaXRpemVyID0gY3JlYXRlU2FuaXRpemVyKG5vZGUsICdkYXRhJywgJ3Byb3BlcnR5Jyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWUgPSB0aGlzLl90ZXh0U2FuaXRpemVyKHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIChub2RlIGFzIFRleHQpLmRhdGEgPSB2YWx1ZSBhcyBzdHJpbmc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MpIHtcbiAgICAgICAgY29uc3QgdGV4dE5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICAgIHRoaXMuX2NvbW1pdE5vZGUodGV4dE5vZGUpO1xuICAgICAgICAvLyBXaGVuIHNldHRpbmcgdGV4dCBjb250ZW50LCBmb3Igc2VjdXJpdHkgcHVycG9zZXMgaXQgbWF0dGVycyBhIGxvdFxuICAgICAgICAvLyB3aGF0IHRoZSBwYXJlbnQgaXMuIEZvciBleGFtcGxlLCA8c3R5bGU+IGFuZCA8c2NyaXB0PiBuZWVkIHRvIGJlXG4gICAgICAgIC8vIGhhbmRsZWQgd2l0aCBjYXJlLCB3aGlsZSA8c3Bhbj4gZG9lcyBub3QuIFNvIGZpcnN0IHdlIG5lZWQgdG8gcHV0IGFcbiAgICAgICAgLy8gdGV4dCBub2RlIGludG8gdGhlIGRvY3VtZW50LCB0aGVuIHdlIGNhbiBzYW5pdGl6ZSBpdHMgY29udGVudHguXG4gICAgICAgIGlmICh0aGlzLl90ZXh0U2FuaXRpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aGlzLl90ZXh0U2FuaXRpemVyID0gY3JlYXRlU2FuaXRpemVyKHRleHROb2RlLCAnZGF0YScsICdwcm9wZXJ0eScpO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlID0gdGhpcy5fdGV4dFNhbml0aXplcih2YWx1ZSk7XG4gICAgICAgIHRleHROb2RlLmRhdGEgPSB2YWx1ZSBhcyBzdHJpbmc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9jb21taXROb2RlKGQuY3JlYXRlVGV4dE5vZGUodmFsdWUgYXMgc3RyaW5nKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IHZhbHVlO1xuICB9XG5cbiAgcHJpdmF0ZSBfY29tbWl0VGVtcGxhdGVSZXN1bHQoXG4gICAgcmVzdWx0OiBUZW1wbGF0ZVJlc3VsdCB8IENvbXBpbGVkVGVtcGxhdGVSZXN1bHRcbiAgKTogdm9pZCB7XG4gICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICBjb25zdCB7dmFsdWVzLCBbJ18kbGl0VHlwZSQnXTogdHlwZX0gPSByZXN1bHQ7XG4gICAgLy8gSWYgJGxpdFR5cGUkIGlzIGEgbnVtYmVyLCByZXN1bHQgaXMgYSBwbGFpbiBUZW1wbGF0ZVJlc3VsdCBhbmQgd2UgZ2V0XG4gICAgLy8gdGhlIHRlbXBsYXRlIGZyb20gdGhlIHRlbXBsYXRlIGNhY2hlLiBJZiBub3QsIHJlc3VsdCBpcyBhXG4gICAgLy8gQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdCBhbmQgXyRsaXRUeXBlJCBpcyBhIENvbXBpbGVkVGVtcGxhdGUgYW5kIHdlIG5lZWRcbiAgICAvLyB0byBjcmVhdGUgdGhlIDx0ZW1wbGF0ZT4gZWxlbWVudCB0aGUgZmlyc3QgdGltZSB3ZSBzZWUgaXQuXG4gICAgY29uc3QgdGVtcGxhdGU6IFRlbXBsYXRlIHwgQ29tcGlsZWRUZW1wbGF0ZSA9XG4gICAgICB0eXBlb2YgdHlwZSA9PT0gJ251bWJlcidcbiAgICAgICAgPyB0aGlzLl8kZ2V0VGVtcGxhdGUocmVzdWx0IGFzIFRlbXBsYXRlUmVzdWx0KVxuICAgICAgICA6ICh0eXBlLmVsID09PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgICh0eXBlLmVsID0gVGVtcGxhdGUuY3JlYXRlRWxlbWVudCh0eXBlLmgsIHRoaXMub3B0aW9ucykpLFxuICAgICAgICAgIHR5cGUpO1xuXG4gICAgaWYgKCh0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgVGVtcGxhdGVJbnN0YW5jZSk/Ll8kdGVtcGxhdGUgPT09IHRlbXBsYXRlKSB7XG4gICAgICAodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIFRlbXBsYXRlSW5zdGFuY2UpLl91cGRhdGUodmFsdWVzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgaW5zdGFuY2UgPSBuZXcgVGVtcGxhdGVJbnN0YW5jZSh0ZW1wbGF0ZSBhcyBUZW1wbGF0ZSwgdGhpcyk7XG4gICAgICBjb25zdCBmcmFnbWVudCA9IGluc3RhbmNlLl9jbG9uZSh0aGlzLm9wdGlvbnMpO1xuICAgICAgaW5zdGFuY2UuX3VwZGF0ZSh2YWx1ZXMpO1xuICAgICAgdGhpcy5fY29tbWl0Tm9kZShmcmFnbWVudCk7XG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSBpbnN0YW5jZTtcbiAgICB9XG4gIH1cblxuICAvLyBPdmVycmlkZGVuIHZpYSBgbGl0SHRtbFBvbHlmaWxsU3VwcG9ydGAgdG8gcHJvdmlkZSBwbGF0Zm9ybSBzdXBwb3J0LlxuICAvKiogQGludGVybmFsICovXG4gIF8kZ2V0VGVtcGxhdGUocmVzdWx0OiBUZW1wbGF0ZVJlc3VsdCkge1xuICAgIGxldCB0ZW1wbGF0ZSA9IHRlbXBsYXRlQ2FjaGUuZ2V0KHJlc3VsdC5zdHJpbmdzKTtcbiAgICBpZiAodGVtcGxhdGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGVtcGxhdGVDYWNoZS5zZXQocmVzdWx0LnN0cmluZ3MsICh0ZW1wbGF0ZSA9IG5ldyBUZW1wbGF0ZShyZXN1bHQpKSk7XG4gICAgfVxuICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbW1pdEl0ZXJhYmxlKHZhbHVlOiBJdGVyYWJsZTx1bmtub3duPik6IHZvaWQge1xuICAgIC8vIEZvciBhbiBJdGVyYWJsZSwgd2UgY3JlYXRlIGEgbmV3IEluc3RhbmNlUGFydCBwZXIgaXRlbSwgdGhlbiBzZXQgaXRzXG4gICAgLy8gdmFsdWUgdG8gdGhlIGl0ZW0uIFRoaXMgaXMgYSBsaXR0bGUgYml0IG9mIG92ZXJoZWFkIGZvciBldmVyeSBpdGVtIGluXG4gICAgLy8gYW4gSXRlcmFibGUsIGJ1dCBpdCBsZXRzIHVzIHJlY3Vyc2UgZWFzaWx5IGFuZCBlZmZpY2llbnRseSB1cGRhdGUgQXJyYXlzXG4gICAgLy8gb2YgVGVtcGxhdGVSZXN1bHRzIHRoYXQgd2lsbCBiZSBjb21tb25seSByZXR1cm5lZCBmcm9tIGV4cHJlc3Npb25zIGxpa2U6XG4gICAgLy8gYXJyYXkubWFwKChpKSA9PiBodG1sYCR7aX1gKSwgYnkgcmV1c2luZyBleGlzdGluZyBUZW1wbGF0ZUluc3RhbmNlcy5cblxuICAgIC8vIElmIHZhbHVlIGlzIGFuIGFycmF5LCB0aGVuIHRoZSBwcmV2aW91cyByZW5kZXIgd2FzIG9mIGFuXG4gICAgLy8gaXRlcmFibGUgYW5kIHZhbHVlIHdpbGwgY29udGFpbiB0aGUgQ2hpbGRQYXJ0cyBmcm9tIHRoZSBwcmV2aW91c1xuICAgIC8vIHJlbmRlci4gSWYgdmFsdWUgaXMgbm90IGFuIGFycmF5LCBjbGVhciB0aGlzIHBhcnQgYW5kIG1ha2UgYSBuZXdcbiAgICAvLyBhcnJheSBmb3IgQ2hpbGRQYXJ0cy5cbiAgICBpZiAoIWlzQXJyYXkodGhpcy5fJGNvbW1pdHRlZFZhbHVlKSkge1xuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gW107XG4gICAgICB0aGlzLl8kY2xlYXIoKTtcbiAgICB9XG5cbiAgICAvLyBMZXRzIHVzIGtlZXAgdHJhY2sgb2YgaG93IG1hbnkgaXRlbXMgd2Ugc3RhbXBlZCBzbyB3ZSBjYW4gY2xlYXIgbGVmdG92ZXJcbiAgICAvLyBpdGVtcyBmcm9tIGEgcHJldmlvdXMgcmVuZGVyXG4gICAgY29uc3QgaXRlbVBhcnRzID0gdGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIENoaWxkUGFydFtdO1xuICAgIGxldCBwYXJ0SW5kZXggPSAwO1xuICAgIGxldCBpdGVtUGFydDogQ2hpbGRQYXJ0IHwgdW5kZWZpbmVkO1xuXG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHZhbHVlKSB7XG4gICAgICBpZiAocGFydEluZGV4ID09PSBpdGVtUGFydHMubGVuZ3RoKSB7XG4gICAgICAgIC8vIElmIG5vIGV4aXN0aW5nIHBhcnQsIGNyZWF0ZSBhIG5ldyBvbmVcbiAgICAgICAgLy8gVE9ETyAoanVzdGluZmFnbmFuaSk6IHRlc3QgcGVyZiBpbXBhY3Qgb2YgYWx3YXlzIGNyZWF0aW5nIHR3byBwYXJ0c1xuICAgICAgICAvLyBpbnN0ZWFkIG9mIHNoYXJpbmcgcGFydHMgYmV0d2VlbiBub2Rlc1xuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbGl0L2xpdC9pc3N1ZXMvMTI2NlxuICAgICAgICBpdGVtUGFydHMucHVzaChcbiAgICAgICAgICAoaXRlbVBhcnQgPSBuZXcgQ2hpbGRQYXJ0KFxuICAgICAgICAgICAgdGhpcy5faW5zZXJ0KGNyZWF0ZU1hcmtlcigpKSxcbiAgICAgICAgICAgIHRoaXMuX2luc2VydChjcmVhdGVNYXJrZXIoKSksXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgdGhpcy5vcHRpb25zXG4gICAgICAgICAgKSlcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFJldXNlIGFuIGV4aXN0aW5nIHBhcnRcbiAgICAgICAgaXRlbVBhcnQgPSBpdGVtUGFydHNbcGFydEluZGV4XTtcbiAgICAgIH1cbiAgICAgIGl0ZW1QYXJ0Ll8kc2V0VmFsdWUoaXRlbSk7XG4gICAgICBwYXJ0SW5kZXgrKztcbiAgICB9XG5cbiAgICBpZiAocGFydEluZGV4IDwgaXRlbVBhcnRzLmxlbmd0aCkge1xuICAgICAgLy8gaXRlbVBhcnRzIGFsd2F5cyBoYXZlIGVuZCBub2Rlc1xuICAgICAgdGhpcy5fJGNsZWFyKFxuICAgICAgICBpdGVtUGFydCAmJiB3cmFwKGl0ZW1QYXJ0Ll8kZW5kTm9kZSEpLm5leHRTaWJsaW5nLFxuICAgICAgICBwYXJ0SW5kZXhcbiAgICAgICk7XG4gICAgICAvLyBUcnVuY2F0ZSB0aGUgcGFydHMgYXJyYXkgc28gX3ZhbHVlIHJlZmxlY3RzIHRoZSBjdXJyZW50IHN0YXRlXG4gICAgICBpdGVtUGFydHMubGVuZ3RoID0gcGFydEluZGV4O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIHRoZSBub2RlcyBjb250YWluZWQgd2l0aGluIHRoaXMgUGFydCBmcm9tIHRoZSBET00uXG4gICAqXG4gICAqIEBwYXJhbSBzdGFydCBTdGFydCBub2RlIHRvIGNsZWFyIGZyb20sIGZvciBjbGVhcmluZyBhIHN1YnNldCBvZiB0aGUgcGFydCdzXG4gICAqICAgICBET00gKHVzZWQgd2hlbiB0cnVuY2F0aW5nIGl0ZXJhYmxlcylcbiAgICogQHBhcmFtIGZyb20gIFdoZW4gYHN0YXJ0YCBpcyBzcGVjaWZpZWQsIHRoZSBpbmRleCB3aXRoaW4gdGhlIGl0ZXJhYmxlIGZyb21cbiAgICogICAgIHdoaWNoIENoaWxkUGFydHMgYXJlIGJlaW5nIHJlbW92ZWQsIHVzZWQgZm9yIGRpc2Nvbm5lY3RpbmcgZGlyZWN0aXZlcyBpblxuICAgKiAgICAgdGhvc2UgUGFydHMuXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgXyRjbGVhcihcbiAgICBzdGFydDogQ2hpbGROb2RlIHwgbnVsbCA9IHdyYXAodGhpcy5fJHN0YXJ0Tm9kZSkubmV4dFNpYmxpbmcsXG4gICAgZnJvbT86IG51bWJlclxuICApIHtcbiAgICB0aGlzLl8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQ/LihmYWxzZSwgdHJ1ZSwgZnJvbSk7XG4gICAgd2hpbGUgKHN0YXJ0ICYmIHN0YXJ0ICE9PSB0aGlzLl8kZW5kTm9kZSkge1xuICAgICAgY29uc3QgbiA9IHdyYXAoc3RhcnQhKS5uZXh0U2libGluZztcbiAgICAgICh3cmFwKHN0YXJ0ISkgYXMgRWxlbWVudCkucmVtb3ZlKCk7XG4gICAgICBzdGFydCA9IG47XG4gICAgfVxuICB9XG4gIC8qKlxuICAgKiBJbXBsZW1lbnRhdGlvbiBvZiBSb290UGFydCdzIGBpc0Nvbm5lY3RlZGAuIE5vdGUgdGhhdCB0aGlzIG1ldG9kXG4gICAqIHNob3VsZCBvbmx5IGJlIGNhbGxlZCBvbiBgUm9vdFBhcnRgcyAodGhlIGBDaGlsZFBhcnRgIHJldHVybmVkIGZyb20gYVxuICAgKiB0b3AtbGV2ZWwgYHJlbmRlcigpYCBjYWxsKS4gSXQgaGFzIG5vIGVmZmVjdCBvbiBub24tcm9vdCBDaGlsZFBhcnRzLlxuICAgKiBAcGFyYW0gaXNDb25uZWN0ZWQgV2hldGhlciB0byBzZXRcbiAgICogQGludGVybmFsXG4gICAqL1xuICBzZXRDb25uZWN0ZWQoaXNDb25uZWN0ZWQ6IGJvb2xlYW4pIHtcbiAgICBpZiAodGhpcy5fJHBhcmVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9faXNDb25uZWN0ZWQgPSBpc0Nvbm5lY3RlZDtcbiAgICAgIHRoaXMuXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZD8uKGlzQ29ubmVjdGVkKTtcbiAgICB9IGVsc2UgaWYgKERFVl9NT0RFKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdwYXJ0LnNldENvbm5lY3RlZCgpIG1heSBvbmx5IGJlIGNhbGxlZCBvbiBhICcgK1xuICAgICAgICAgICdSb290UGFydCByZXR1cm5lZCBmcm9tIHJlbmRlcigpLidcbiAgICAgICk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQSB0b3AtbGV2ZWwgYENoaWxkUGFydGAgcmV0dXJuZWQgZnJvbSBgcmVuZGVyYCB0aGF0IG1hbmFnZXMgdGhlIGNvbm5lY3RlZFxuICogc3RhdGUgb2YgYEFzeW5jRGlyZWN0aXZlYHMgY3JlYXRlZCB0aHJvdWdob3V0IHRoZSB0cmVlIGJlbG93IGl0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJvb3RQYXJ0IGV4dGVuZHMgQ2hpbGRQYXJ0IHtcbiAgLyoqXG4gICAqIFNldHMgdGhlIGNvbm5lY3Rpb24gc3RhdGUgZm9yIGBBc3luY0RpcmVjdGl2ZWBzIGNvbnRhaW5lZCB3aXRoaW4gdGhpcyByb290XG4gICAqIENoaWxkUGFydC5cbiAgICpcbiAgICogbGl0LWh0bWwgZG9lcyBub3QgYXV0b21hdGljYWxseSBtb25pdG9yIHRoZSBjb25uZWN0ZWRuZXNzIG9mIERPTSByZW5kZXJlZDtcbiAgICogYXMgc3VjaCwgaXQgaXMgdGhlIHJlc3BvbnNpYmlsaXR5IG9mIHRoZSBjYWxsZXIgdG8gYHJlbmRlcmAgdG8gZW5zdXJlIHRoYXRcbiAgICogYHBhcnQuc2V0Q29ubmVjdGVkKGZhbHNlKWAgaXMgY2FsbGVkIGJlZm9yZSB0aGUgcGFydCBvYmplY3QgaXMgcG90ZW50aWFsbHlcbiAgICogZGlzY2FyZGVkLCB0byBlbnN1cmUgdGhhdCBgQXN5bmNEaXJlY3RpdmVgcyBoYXZlIGEgY2hhbmNlIHRvIGRpc3Bvc2Ugb2ZcbiAgICogYW55IHJlc291cmNlcyBiZWluZyBoZWxkLiBJZiBhIGBSb290UGFydGAgdGhhdCB3YXMgcHJldm91c2x5XG4gICAqIGRpc2Nvbm5lY3RlZCBpcyBzdWJzZXF1ZW50bHkgcmUtY29ubmVjdGVkIChhbmQgaXRzIGBBc3luY0RpcmVjdGl2ZWBzIHNob3VsZFxuICAgKiByZS1jb25uZWN0KSwgYHNldENvbm5lY3RlZCh0cnVlKWAgc2hvdWxkIGJlIGNhbGxlZC5cbiAgICpcbiAgICogQHBhcmFtIGlzQ29ubmVjdGVkIFdoZXRoZXIgZGlyZWN0aXZlcyB3aXRoaW4gdGhpcyB0cmVlIHNob3VsZCBiZSBjb25uZWN0ZWRcbiAgICogb3Igbm90XG4gICAqL1xuICBzZXRDb25uZWN0ZWQoaXNDb25uZWN0ZWQ6IGJvb2xlYW4pOiB2b2lkO1xufVxuXG5leHBvcnQgdHlwZSB7QXR0cmlidXRlUGFydH07XG5jbGFzcyBBdHRyaWJ1dGVQYXJ0IGltcGxlbWVudHMgRGlzY29ubmVjdGFibGUge1xuICByZWFkb25seSB0eXBlID0gQVRUUklCVVRFX1BBUlQgYXNcbiAgICB8IHR5cGVvZiBBVFRSSUJVVEVfUEFSVFxuICAgIHwgdHlwZW9mIFBST1BFUlRZX1BBUlRcbiAgICB8IHR5cGVvZiBCT09MRUFOX0FUVFJJQlVURV9QQVJUXG4gICAgfCB0eXBlb2YgRVZFTlRfUEFSVDtcbiAgcmVhZG9ubHkgZWxlbWVudDogSFRNTEVsZW1lbnQ7XG4gIHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogSWYgdGhpcyBhdHRyaWJ1dGUgcGFydCByZXByZXNlbnRzIGFuIGludGVycG9sYXRpb24sIHRoaXMgY29udGFpbnMgdGhlXG4gICAqIHN0YXRpYyBzdHJpbmdzIG9mIHRoZSBpbnRlcnBvbGF0aW9uLiBGb3Igc2luZ2xlLXZhbHVlLCBjb21wbGV0ZSBiaW5kaW5ncyxcbiAgICogdGhpcyBpcyB1bmRlZmluZWQuXG4gICAqL1xuICByZWFkb25seSBzdHJpbmdzPzogUmVhZG9ubHlBcnJheTxzdHJpbmc+O1xuICAvKiogQGludGVybmFsICovXG4gIF8kY29tbWl0dGVkVmFsdWU6IHVua25vd24gfCBBcnJheTx1bmtub3duPiA9IG5vdGhpbmc7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX19kaXJlY3RpdmVzPzogQXJyYXk8RGlyZWN0aXZlIHwgdW5kZWZpbmVkPjtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHBhcmVudDogRGlzY29ubmVjdGFibGU7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuPzogU2V0PERpc2Nvbm5lY3RhYmxlPiA9IHVuZGVmaW5lZDtcblxuICBwcm90ZWN0ZWQgX3Nhbml0aXplcjogVmFsdWVTYW5pdGl6ZXIgfCB1bmRlZmluZWQ7XG5cbiAgZ2V0IHRhZ05hbWUoKSB7XG4gICAgcmV0dXJuIHRoaXMuZWxlbWVudC50YWdOYW1lO1xuICB9XG5cbiAgLy8gU2VlIGNvbW1lbnQgaW4gRGlzY29ubmVjdGFibGUgaW50ZXJmYWNlIGZvciB3aHkgdGhpcyBpcyBhIGdldHRlclxuICBnZXQgXyRpc0Nvbm5lY3RlZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fJHBhcmVudC5fJGlzQ29ubmVjdGVkO1xuICB9XG5cbiAgY29uc3RydWN0b3IoXG4gICAgZWxlbWVudDogSFRNTEVsZW1lbnQsXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIHN0cmluZ3M6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPixcbiAgICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgdGhpcy5lbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMuXyRwYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICBpZiAoc3RyaW5ncy5sZW5ndGggPiAyIHx8IHN0cmluZ3NbMF0gIT09ICcnIHx8IHN0cmluZ3NbMV0gIT09ICcnKSB7XG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSBuZXcgQXJyYXkoc3RyaW5ncy5sZW5ndGggLSAxKS5maWxsKG5ldyBTdHJpbmcoKSk7XG4gICAgICB0aGlzLnN0cmluZ3MgPSBzdHJpbmdzO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSBub3RoaW5nO1xuICAgIH1cbiAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICB0aGlzLl9zYW5pdGl6ZXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHZhbHVlIG9mIHRoaXMgcGFydCBieSByZXNvbHZpbmcgdGhlIHZhbHVlIGZyb20gcG9zc2libHkgbXVsdGlwbGVcbiAgICogdmFsdWVzIGFuZCBzdGF0aWMgc3RyaW5ncyBhbmQgY29tbWl0dGluZyBpdCB0byB0aGUgRE9NLlxuICAgKiBJZiB0aGlzIHBhcnQgaXMgc2luZ2xlLXZhbHVlZCwgYHRoaXMuX3N0cmluZ3NgIHdpbGwgYmUgdW5kZWZpbmVkLCBhbmQgdGhlXG4gICAqIG1ldGhvZCB3aWxsIGJlIGNhbGxlZCB3aXRoIGEgc2luZ2xlIHZhbHVlIGFyZ3VtZW50LiBJZiB0aGlzIHBhcnQgaXNcbiAgICogbXVsdGktdmFsdWUsIGB0aGlzLl9zdHJpbmdzYCB3aWxsIGJlIGRlZmluZWQsIGFuZCB0aGUgbWV0aG9kIGlzIGNhbGxlZFxuICAgKiB3aXRoIHRoZSB2YWx1ZSBhcnJheSBvZiB0aGUgcGFydCdzIG93bmluZyBUZW1wbGF0ZUluc3RhbmNlLCBhbmQgYW4gb2Zmc2V0XG4gICAqIGludG8gdGhlIHZhbHVlIGFycmF5IGZyb20gd2hpY2ggdGhlIHZhbHVlcyBzaG91bGQgYmUgcmVhZC5cbiAgICogVGhpcyBtZXRob2QgaXMgb3ZlcmxvYWRlZCB0aGlzIHdheSB0byBlbGltaW5hdGUgc2hvcnQtbGl2ZWQgYXJyYXkgc2xpY2VzXG4gICAqIG9mIHRoZSB0ZW1wbGF0ZSBpbnN0YW5jZSB2YWx1ZXMsIGFuZCBhbGxvdyBhIGZhc3QtcGF0aCBmb3Igc2luZ2xlLXZhbHVlZFxuICAgKiBwYXJ0cy5cbiAgICpcbiAgICogQHBhcmFtIHZhbHVlIFRoZSBwYXJ0IHZhbHVlLCBvciBhbiBhcnJheSBvZiB2YWx1ZXMgZm9yIG11bHRpLXZhbHVlZCBwYXJ0c1xuICAgKiBAcGFyYW0gdmFsdWVJbmRleCB0aGUgaW5kZXggdG8gc3RhcnQgcmVhZGluZyB2YWx1ZXMgZnJvbS4gYHVuZGVmaW5lZGAgZm9yXG4gICAqICAgc2luZ2xlLXZhbHVlZCBwYXJ0c1xuICAgKiBAcGFyYW0gbm9Db21taXQgY2F1c2VzIHRoZSBwYXJ0IHRvIG5vdCBjb21taXQgaXRzIHZhbHVlIHRvIHRoZSBET00uIFVzZWRcbiAgICogICBpbiBoeWRyYXRpb24gdG8gcHJpbWUgYXR0cmlidXRlIHBhcnRzIHdpdGggdGhlaXIgZmlyc3QtcmVuZGVyZWQgdmFsdWUsXG4gICAqICAgYnV0IG5vdCBzZXQgdGhlIGF0dHJpYnV0ZSwgYW5kIGluIFNTUiB0byBuby1vcCB0aGUgRE9NIG9wZXJhdGlvbiBhbmRcbiAgICogICBjYXB0dXJlIHRoZSB2YWx1ZSBmb3Igc2VyaWFsaXphdGlvbi5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuICBfJHNldFZhbHVlKFxuICAgIHZhbHVlOiB1bmtub3duIHwgQXJyYXk8dW5rbm93bj4sXG4gICAgZGlyZWN0aXZlUGFyZW50OiBEaXJlY3RpdmVQYXJlbnQgPSB0aGlzLFxuICAgIHZhbHVlSW5kZXg/OiBudW1iZXIsXG4gICAgbm9Db21taXQ/OiBib29sZWFuXG4gICkge1xuICAgIGNvbnN0IHN0cmluZ3MgPSB0aGlzLnN0cmluZ3M7XG5cbiAgICAvLyBXaGV0aGVyIGFueSBvZiB0aGUgdmFsdWVzIGhhcyBjaGFuZ2VkLCBmb3IgZGlydHktY2hlY2tpbmdcbiAgICBsZXQgY2hhbmdlID0gZmFsc2U7XG5cbiAgICBpZiAoc3RyaW5ncyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBTaW5nbGUtdmFsdWUgYmluZGluZyBjYXNlXG4gICAgICB2YWx1ZSA9IHJlc29sdmVEaXJlY3RpdmUodGhpcywgdmFsdWUsIGRpcmVjdGl2ZVBhcmVudCwgMCk7XG4gICAgICBjaGFuZ2UgPVxuICAgICAgICAhaXNQcmltaXRpdmUodmFsdWUpIHx8XG4gICAgICAgICh2YWx1ZSAhPT0gdGhpcy5fJGNvbW1pdHRlZFZhbHVlICYmIHZhbHVlICE9PSBub0NoYW5nZSk7XG4gICAgICBpZiAoY2hhbmdlKSB7XG4gICAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJbnRlcnBvbGF0aW9uIGNhc2VcbiAgICAgIGNvbnN0IHZhbHVlcyA9IHZhbHVlIGFzIEFycmF5PHVua25vd24+O1xuICAgICAgdmFsdWUgPSBzdHJpbmdzWzBdO1xuXG4gICAgICBsZXQgaSwgdjtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBzdHJpbmdzLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICB2ID0gcmVzb2x2ZURpcmVjdGl2ZSh0aGlzLCB2YWx1ZXNbdmFsdWVJbmRleCEgKyBpXSwgZGlyZWN0aXZlUGFyZW50LCBpKTtcblxuICAgICAgICBpZiAodiA9PT0gbm9DaGFuZ2UpIHtcbiAgICAgICAgICAvLyBJZiB0aGUgdXNlci1wcm92aWRlZCB2YWx1ZSBpcyBgbm9DaGFuZ2VgLCB1c2UgdGhlIHByZXZpb3VzIHZhbHVlXG4gICAgICAgICAgdiA9ICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgQXJyYXk8dW5rbm93bj4pW2ldO1xuICAgICAgICB9XG4gICAgICAgIGNoYW5nZSB8fD1cbiAgICAgICAgICAhaXNQcmltaXRpdmUodikgfHwgdiAhPT0gKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBBcnJheTx1bmtub3duPilbaV07XG4gICAgICAgIGlmICh2ID09PSBub3RoaW5nKSB7XG4gICAgICAgICAgdmFsdWUgPSBub3RoaW5nO1xuICAgICAgICB9IGVsc2UgaWYgKHZhbHVlICE9PSBub3RoaW5nKSB7XG4gICAgICAgICAgdmFsdWUgKz0gKHYgPz8gJycpICsgc3RyaW5nc1tpICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgLy8gV2UgYWx3YXlzIHJlY29yZCBlYWNoIHZhbHVlLCBldmVuIGlmIG9uZSBpcyBgbm90aGluZ2AsIGZvciBmdXR1cmVcbiAgICAgICAgLy8gY2hhbmdlIGRldGVjdGlvbi5cbiAgICAgICAgKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBBcnJheTx1bmtub3duPilbaV0gPSB2O1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoY2hhbmdlICYmICFub0NvbW1pdCkge1xuICAgICAgdGhpcy5fY29tbWl0VmFsdWUodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX2NvbW1pdFZhbHVlKHZhbHVlOiB1bmtub3duKSB7XG4gICAgaWYgKHZhbHVlID09PSBub3RoaW5nKSB7XG4gICAgICAod3JhcCh0aGlzLmVsZW1lbnQpIGFzIEVsZW1lbnQpLnJlbW92ZUF0dHJpYnV0ZSh0aGlzLm5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICAgIGlmICh0aGlzLl9zYW5pdGl6ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRoaXMuX3Nhbml0aXplciA9IHNhbml0aXplckZhY3RvcnlJbnRlcm5hbChcbiAgICAgICAgICAgIHRoaXMuZWxlbWVudCxcbiAgICAgICAgICAgIHRoaXMubmFtZSxcbiAgICAgICAgICAgICdhdHRyaWJ1dGUnXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZSA9IHRoaXMuX3Nhbml0aXplcih2YWx1ZSA/PyAnJyk7XG4gICAgICB9XG4gICAgICAod3JhcCh0aGlzLmVsZW1lbnQpIGFzIEVsZW1lbnQpLnNldEF0dHJpYnV0ZShcbiAgICAgICAgdGhpcy5uYW1lLFxuICAgICAgICAodmFsdWUgPz8gJycpIGFzIHN0cmluZ1xuICAgICAgKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUge1Byb3BlcnR5UGFydH07XG5jbGFzcyBQcm9wZXJ0eVBhcnQgZXh0ZW5kcyBBdHRyaWJ1dGVQYXJ0IHtcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgdHlwZSA9IFBST1BFUlRZX1BBUlQ7XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBvdmVycmlkZSBfY29tbWl0VmFsdWUodmFsdWU6IHVua25vd24pIHtcbiAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICBpZiAodGhpcy5fc2FuaXRpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fc2FuaXRpemVyID0gc2FuaXRpemVyRmFjdG9yeUludGVybmFsKFxuICAgICAgICAgIHRoaXMuZWxlbWVudCxcbiAgICAgICAgICB0aGlzLm5hbWUsXG4gICAgICAgICAgJ3Byb3BlcnR5J1xuICAgICAgICApO1xuICAgICAgfVxuICAgICAgdmFsdWUgPSB0aGlzLl9zYW5pdGl6ZXIodmFsdWUpO1xuICAgIH1cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICh0aGlzLmVsZW1lbnQgYXMgYW55KVt0aGlzLm5hbWVdID0gdmFsdWUgPT09IG5vdGhpbmcgPyB1bmRlZmluZWQgOiB2YWx1ZTtcbiAgfVxufVxuXG5leHBvcnQgdHlwZSB7Qm9vbGVhbkF0dHJpYnV0ZVBhcnR9O1xuY2xhc3MgQm9vbGVhbkF0dHJpYnV0ZVBhcnQgZXh0ZW5kcyBBdHRyaWJ1dGVQYXJ0IHtcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgdHlwZSA9IEJPT0xFQU5fQVRUUklCVVRFX1BBUlQ7XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBvdmVycmlkZSBfY29tbWl0VmFsdWUodmFsdWU6IHVua25vd24pIHtcbiAgICBpZiAodmFsdWUgJiYgdmFsdWUgIT09IG5vdGhpbmcpIHtcbiAgICAgICh3cmFwKHRoaXMuZWxlbWVudCkgYXMgRWxlbWVudCkuc2V0QXR0cmlidXRlKHRoaXMubmFtZSwgJycpO1xuICAgIH0gZWxzZSB7XG4gICAgICAod3JhcCh0aGlzLmVsZW1lbnQpIGFzIEVsZW1lbnQpLnJlbW92ZUF0dHJpYnV0ZSh0aGlzLm5hbWUpO1xuICAgIH1cbiAgfVxufVxuXG50eXBlIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucyA9IEV2ZW50TGlzdGVuZXJPckV2ZW50TGlzdGVuZXJPYmplY3QgJlxuICBQYXJ0aWFsPEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zPjtcblxuLyoqXG4gKiBBbiBBdHRyaWJ1dGVQYXJ0IHRoYXQgbWFuYWdlcyBhbiBldmVudCBsaXN0ZW5lciB2aWEgYWRkL3JlbW92ZUV2ZW50TGlzdGVuZXIuXG4gKlxuICogVGhpcyBwYXJ0IHdvcmtzIGJ5IGFkZGluZyBpdHNlbGYgYXMgdGhlIGV2ZW50IGxpc3RlbmVyIG9uIGFuIGVsZW1lbnQsIHRoZW5cbiAqIGRlbGVnYXRpbmcgdG8gdGhlIHZhbHVlIHBhc3NlZCB0byBpdC4gVGhpcyByZWR1Y2VzIHRoZSBudW1iZXIgb2YgY2FsbHMgdG9cbiAqIGFkZC9yZW1vdmVFdmVudExpc3RlbmVyIGlmIHRoZSBsaXN0ZW5lciBjaGFuZ2VzIGZyZXF1ZW50bHksIHN1Y2ggYXMgd2hlbiBhblxuICogaW5saW5lIGZ1bmN0aW9uIGlzIHVzZWQgYXMgYSBsaXN0ZW5lci5cbiAqXG4gKiBCZWNhdXNlIGV2ZW50IG9wdGlvbnMgYXJlIHBhc3NlZCB3aGVuIGFkZGluZyBsaXN0ZW5lcnMsIHdlIG11c3QgdGFrZSBjYXNlXG4gKiB0byBhZGQgYW5kIHJlbW92ZSB0aGUgcGFydCBhcyBhIGxpc3RlbmVyIHdoZW4gdGhlIGV2ZW50IG9wdGlvbnMgY2hhbmdlLlxuICovXG5leHBvcnQgdHlwZSB7RXZlbnRQYXJ0fTtcbmNsYXNzIEV2ZW50UGFydCBleHRlbmRzIEF0dHJpYnV0ZVBhcnQge1xuICBvdmVycmlkZSByZWFkb25seSB0eXBlID0gRVZFTlRfUEFSVDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBlbGVtZW50OiBIVE1MRWxlbWVudCxcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgc3RyaW5nczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LFxuICAgIHBhcmVudDogRGlzY29ubmVjdGFibGUsXG4gICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZFxuICApIHtcbiAgICBzdXBlcihlbGVtZW50LCBuYW1lLCBzdHJpbmdzLCBwYXJlbnQsIG9wdGlvbnMpO1xuXG4gICAgaWYgKERFVl9NT0RFICYmIHRoaXMuc3RyaW5ncyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBBIFxcYDwke2VsZW1lbnQubG9jYWxOYW1lfT5cXGAgaGFzIGEgXFxgQCR7bmFtZX09Li4uXFxgIGxpc3RlbmVyIHdpdGggYCArXG4gICAgICAgICAgJ2ludmFsaWQgY29udGVudC4gRXZlbnQgbGlzdGVuZXJzIGluIHRlbXBsYXRlcyBtdXN0IGhhdmUgZXhhY3RseSAnICtcbiAgICAgICAgICAnb25lIGV4cHJlc3Npb24gYW5kIG5vIHN1cnJvdW5kaW5nIHRleHQuJ1xuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICAvLyBFdmVudFBhcnQgZG9lcyBub3QgdXNlIHRoZSBiYXNlIF8kc2V0VmFsdWUvX3Jlc29sdmVWYWx1ZSBpbXBsZW1lbnRhdGlvblxuICAvLyBzaW5jZSB0aGUgZGlydHkgY2hlY2tpbmcgaXMgbW9yZSBjb21wbGV4XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgb3ZlcnJpZGUgXyRzZXRWYWx1ZShcbiAgICBuZXdMaXN0ZW5lcjogdW5rbm93bixcbiAgICBkaXJlY3RpdmVQYXJlbnQ6IERpcmVjdGl2ZVBhcmVudCA9IHRoaXNcbiAgKSB7XG4gICAgbmV3TGlzdGVuZXIgPVxuICAgICAgcmVzb2x2ZURpcmVjdGl2ZSh0aGlzLCBuZXdMaXN0ZW5lciwgZGlyZWN0aXZlUGFyZW50LCAwKSA/PyBub3RoaW5nO1xuICAgIGlmIChuZXdMaXN0ZW5lciA9PT0gbm9DaGFuZ2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgb2xkTGlzdGVuZXIgPSB0aGlzLl8kY29tbWl0dGVkVmFsdWU7XG5cbiAgICAvLyBJZiB0aGUgbmV3IHZhbHVlIGlzIG5vdGhpbmcgb3IgYW55IG9wdGlvbnMgY2hhbmdlIHdlIGhhdmUgdG8gcmVtb3ZlIHRoZVxuICAgIC8vIHBhcnQgYXMgYSBsaXN0ZW5lci5cbiAgICBjb25zdCBzaG91bGRSZW1vdmVMaXN0ZW5lciA9XG4gICAgICAobmV3TGlzdGVuZXIgPT09IG5vdGhpbmcgJiYgb2xkTGlzdGVuZXIgIT09IG5vdGhpbmcpIHx8XG4gICAgICAobmV3TGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5jYXB0dXJlICE9PVxuICAgICAgICAob2xkTGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5jYXB0dXJlIHx8XG4gICAgICAobmV3TGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5vbmNlICE9PVxuICAgICAgICAob2xkTGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5vbmNlIHx8XG4gICAgICAobmV3TGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5wYXNzaXZlICE9PVxuICAgICAgICAob2xkTGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5wYXNzaXZlO1xuXG4gICAgLy8gSWYgdGhlIG5ldyB2YWx1ZSBpcyBub3Qgbm90aGluZyBhbmQgd2UgcmVtb3ZlZCB0aGUgbGlzdGVuZXIsIHdlIGhhdmVcbiAgICAvLyB0byBhZGQgdGhlIHBhcnQgYXMgYSBsaXN0ZW5lci5cbiAgICBjb25zdCBzaG91bGRBZGRMaXN0ZW5lciA9XG4gICAgICBuZXdMaXN0ZW5lciAhPT0gbm90aGluZyAmJlxuICAgICAgKG9sZExpc3RlbmVyID09PSBub3RoaW5nIHx8IHNob3VsZFJlbW92ZUxpc3RlbmVyKTtcblxuICAgIGlmIChzaG91bGRSZW1vdmVMaXN0ZW5lcikge1xuICAgICAgdGhpcy5lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXG4gICAgICAgIHRoaXMubmFtZSxcbiAgICAgICAgdGhpcyxcbiAgICAgICAgb2xkTGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAoc2hvdWxkQWRkTGlzdGVuZXIpIHtcbiAgICAgIC8vIEJld2FyZTogSUUxMSBhbmQgQ2hyb21lIDQxIGRvbid0IGxpa2UgdXNpbmcgdGhlIGxpc3RlbmVyIGFzIHRoZVxuICAgICAgLy8gb3B0aW9ucyBvYmplY3QuIEZpZ3VyZSBvdXQgaG93IHRvIGRlYWwgdy8gdGhpcyBpbiBJRTExIC0gbWF5YmVcbiAgICAgIC8vIHBhdGNoIGFkZEV2ZW50TGlzdGVuZXI/XG4gICAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgICAgdGhpcy5uYW1lLFxuICAgICAgICB0aGlzLFxuICAgICAgICBuZXdMaXN0ZW5lciBhcyBFdmVudExpc3RlbmVyV2l0aE9wdGlvbnNcbiAgICAgICk7XG4gICAgfVxuICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IG5ld0xpc3RlbmVyO1xuICB9XG5cbiAgaGFuZGxlRXZlbnQoZXZlbnQ6IEV2ZW50KSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZS5jYWxsKHRoaXMub3B0aW9ucz8uaG9zdCA/PyB0aGlzLmVsZW1lbnQsIGV2ZW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBFdmVudExpc3RlbmVyT2JqZWN0KS5oYW5kbGVFdmVudChldmVudCk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCB0eXBlIHtFbGVtZW50UGFydH07XG5jbGFzcyBFbGVtZW50UGFydCBpbXBsZW1lbnRzIERpc2Nvbm5lY3RhYmxlIHtcbiAgcmVhZG9ubHkgdHlwZSA9IEVMRU1FTlRfUEFSVDtcblxuICAvKiogQGludGVybmFsICovXG4gIF9fZGlyZWN0aXZlPzogRGlyZWN0aXZlO1xuXG4gIC8vIFRoaXMgaXMgdG8gZW5zdXJlIHRoYXQgZXZlcnkgUGFydCBoYXMgYSBfJGNvbW1pdHRlZFZhbHVlXG4gIF8kY29tbWl0dGVkVmFsdWU6IHVuZGVmaW5lZDtcblxuICAvKiogQGludGVybmFsICovXG4gIF8kcGFyZW50ITogRGlzY29ubmVjdGFibGU7XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4/OiBTZXQ8RGlzY29ubmVjdGFibGU+ID0gdW5kZWZpbmVkO1xuXG4gIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIGVsZW1lbnQ6IEVsZW1lbnQsXG4gICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSxcbiAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkXG4gICkge1xuICAgIHRoaXMuXyRwYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgfVxuXG4gIC8vIFNlZSBjb21tZW50IGluIERpc2Nvbm5lY3RhYmxlIGludGVyZmFjZSBmb3Igd2h5IHRoaXMgaXMgYSBnZXR0ZXJcbiAgZ2V0IF8kaXNDb25uZWN0ZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuXyRwYXJlbnQuXyRpc0Nvbm5lY3RlZDtcbiAgfVxuXG4gIF8kc2V0VmFsdWUodmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICByZXNvbHZlRGlyZWN0aXZlKHRoaXMsIHZhbHVlKTtcbiAgfVxufVxuXG4vKipcbiAqIEVORCBVU0VSUyBTSE9VTEQgTk9UIFJFTFkgT04gVEhJUyBPQkpFQ1QuXG4gKlxuICogUHJpdmF0ZSBleHBvcnRzIGZvciB1c2UgYnkgb3RoZXIgTGl0IHBhY2thZ2VzLCBub3QgaW50ZW5kZWQgZm9yIHVzZSBieVxuICogZXh0ZXJuYWwgdXNlcnMuXG4gKlxuICogV2UgY3VycmVudGx5IGRvIG5vdCBtYWtlIGEgbWFuZ2xlZCByb2xsdXAgYnVpbGQgb2YgdGhlIGxpdC1zc3IgY29kZS4gSW4gb3JkZXJcbiAqIHRvIGtlZXAgYSBudW1iZXIgb2YgKG90aGVyd2lzZSBwcml2YXRlKSB0b3AtbGV2ZWwgZXhwb3J0cyAgbWFuZ2xlZCBpbiB0aGVcbiAqIGNsaWVudCBzaWRlIGNvZGUsIHdlIGV4cG9ydCBhIF8kTEggb2JqZWN0IGNvbnRhaW5pbmcgdGhvc2UgbWVtYmVycyAob3JcbiAqIGhlbHBlciBtZXRob2RzIGZvciBhY2Nlc3NpbmcgcHJpdmF0ZSBmaWVsZHMgb2YgdGhvc2UgbWVtYmVycyksIGFuZCB0aGVuXG4gKiByZS1leHBvcnQgdGhlbSBmb3IgdXNlIGluIGxpdC1zc3IuIFRoaXMga2VlcHMgbGl0LXNzciBhZ25vc3RpYyB0byB3aGV0aGVyIHRoZVxuICogY2xpZW50LXNpZGUgY29kZSBpcyBiZWluZyB1c2VkIGluIGBkZXZgIG1vZGUgb3IgYHByb2RgIG1vZGUuXG4gKlxuICogVGhpcyBoYXMgYSB1bmlxdWUgbmFtZSwgdG8gZGlzYW1iaWd1YXRlIGl0IGZyb20gcHJpdmF0ZSBleHBvcnRzIGluXG4gKiBsaXQtZWxlbWVudCwgd2hpY2ggcmUtZXhwb3J0cyBhbGwgb2YgbGl0LWh0bWwuXG4gKlxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IGNvbnN0IF8kTEggPSB7XG4gIC8vIFVzZWQgaW4gbGl0LXNzclxuICBfYm91bmRBdHRyaWJ1dGVTdWZmaXg6IGJvdW5kQXR0cmlidXRlU3VmZml4LFxuICBfbWFya2VyOiBtYXJrZXIsXG4gIF9tYXJrZXJNYXRjaDogbWFya2VyTWF0Y2gsXG4gIF9IVE1MX1JFU1VMVDogSFRNTF9SRVNVTFQsXG4gIF9nZXRUZW1wbGF0ZUh0bWw6IGdldFRlbXBsYXRlSHRtbCxcbiAgLy8gVXNlZCBpbiBoeWRyYXRlXG4gIF9UZW1wbGF0ZUluc3RhbmNlOiBUZW1wbGF0ZUluc3RhbmNlLFxuICBfaXNJdGVyYWJsZTogaXNJdGVyYWJsZSxcbiAgX3Jlc29sdmVEaXJlY3RpdmU6IHJlc29sdmVEaXJlY3RpdmUsXG4gIC8vIFVzZWQgaW4gdGVzdHMgYW5kIHByaXZhdGUtc3NyLXN1cHBvcnRcbiAgX0NoaWxkUGFydDogQ2hpbGRQYXJ0LFxuICBfQXR0cmlidXRlUGFydDogQXR0cmlidXRlUGFydCxcbiAgX0Jvb2xlYW5BdHRyaWJ1dGVQYXJ0OiBCb29sZWFuQXR0cmlidXRlUGFydCxcbiAgX0V2ZW50UGFydDogRXZlbnRQYXJ0LFxuICBfUHJvcGVydHlQYXJ0OiBQcm9wZXJ0eVBhcnQsXG4gIF9FbGVtZW50UGFydDogRWxlbWVudFBhcnQsXG59O1xuXG4vLyBBcHBseSBwb2x5ZmlsbHMgaWYgYXZhaWxhYmxlXG5nbG9iYWxUaGlzW2BsaXRIdG1sUG9seWZpbGxTdXBwb3J0JHtERVZfTU9ERSA/IGBEZXZNb2RlYCA6IGBgfWBdPy4oXG4gIFRlbXBsYXRlLFxuICBDaGlsZFBhcnRcbik7XG5cbi8vIElNUE9SVEFOVDogZG8gbm90IGNoYW5nZSB0aGUgcHJvcGVydHkgbmFtZSBvciB0aGUgYXNzaWdubWVudCBleHByZXNzaW9uLlxuLy8gVGhpcyBsaW5lIHdpbGwgYmUgdXNlZCBpbiByZWdleGVzIHRvIHNlYXJjaCBmb3IgbGl0LWh0bWwgdXNhZ2UuXG4vLyBUT0RPKGp1c3RpbmZhZ25hbmkpOiBpbmplY3QgdmVyc2lvbiBudW1iZXIgYXQgYnVpbGQgdGltZVxuKGdsb2JhbFRoaXMubGl0SHRtbFZlcnNpb25zID8/PSBbXSkucHVzaCgnMi4wLjAnKTtcbmlmIChERVZfTU9ERSAmJiBnbG9iYWxUaGlzLmxpdEh0bWxWZXJzaW9ucy5sZW5ndGggPiAxKSB7XG4gIGlzc3VlV2FybmluZyEoXG4gICAgJ211bHRpcGxlLXZlcnNpb25zJyxcbiAgICBgTXVsdGlwbGUgdmVyc2lvbnMgb2YgTGl0IGxvYWRlZC4gYCArXG4gICAgICBgTG9hZGluZyBtdWx0aXBsZSB2ZXJzaW9ucyBpcyBub3QgcmVjb21tZW5kZWQuYFxuICApO1xufVxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7RGlzY29ubmVjdGFibGUsIFBhcnR9IGZyb20gJy4vbGl0LWh0bWwnO1xuXG5leHBvcnQge1xuICBBdHRyaWJ1dGVQYXJ0LFxuICBCb29sZWFuQXR0cmlidXRlUGFydCxcbiAgQ2hpbGRQYXJ0LFxuICBFbGVtZW50UGFydCxcbiAgRXZlbnRQYXJ0LFxuICBQYXJ0LFxuICBQcm9wZXJ0eVBhcnQsXG59IGZyb20gJy4vbGl0LWh0bWwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIERpcmVjdGl2ZUNsYXNzIHtcbiAgbmV3IChwYXJ0OiBQYXJ0SW5mbyk6IERpcmVjdGl2ZTtcbn1cblxuLyoqXG4gKiBUaGlzIHV0aWxpdHkgdHlwZSBleHRyYWN0cyB0aGUgc2lnbmF0dXJlIG9mIGEgZGlyZWN0aXZlIGNsYXNzJ3MgcmVuZGVyKClcbiAqIG1ldGhvZCBzbyB3ZSBjYW4gdXNlIGl0IGZvciB0aGUgdHlwZSBvZiB0aGUgZ2VuZXJhdGVkIGRpcmVjdGl2ZSBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IHR5cGUgRGlyZWN0aXZlUGFyYW1ldGVyczxDIGV4dGVuZHMgRGlyZWN0aXZlPiA9IFBhcmFtZXRlcnM8Q1sncmVuZGVyJ10+O1xuXG4vKipcbiAqIEEgZ2VuZXJhdGVkIGRpcmVjdGl2ZSBmdW5jdGlvbiBkb2Vzbid0IGV2YWx1YXRlIHRoZSBkaXJlY3RpdmUsIGJ1dCBqdXN0XG4gKiByZXR1cm5zIGEgRGlyZWN0aXZlUmVzdWx0IG9iamVjdCB0aGF0IGNhcHR1cmVzIHRoZSBhcmd1bWVudHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRGlyZWN0aXZlUmVzdWx0PEMgZXh0ZW5kcyBEaXJlY3RpdmVDbGFzcyA9IERpcmVjdGl2ZUNsYXNzPiB7XG4gIC8qKlxuICAgKiBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgKiBAaW50ZXJuYWwgKi9cbiAgWydfJGxpdERpcmVjdGl2ZSQnXTogQztcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICB2YWx1ZXM6IERpcmVjdGl2ZVBhcmFtZXRlcnM8SW5zdGFuY2VUeXBlPEM+Pjtcbn1cblxuZXhwb3J0IGNvbnN0IFBhcnRUeXBlID0ge1xuICBBVFRSSUJVVEU6IDEsXG4gIENISUxEOiAyLFxuICBQUk9QRVJUWTogMyxcbiAgQk9PTEVBTl9BVFRSSUJVVEU6IDQsXG4gIEVWRU5UOiA1LFxuICBFTEVNRU5UOiA2LFxufSBhcyBjb25zdDtcblxuZXhwb3J0IHR5cGUgUGFydFR5cGUgPSB0eXBlb2YgUGFydFR5cGVba2V5b2YgdHlwZW9mIFBhcnRUeXBlXTtcblxuZXhwb3J0IGludGVyZmFjZSBDaGlsZFBhcnRJbmZvIHtcbiAgcmVhZG9ubHkgdHlwZTogdHlwZW9mIFBhcnRUeXBlLkNISUxEO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEF0dHJpYnV0ZVBhcnRJbmZvIHtcbiAgcmVhZG9ubHkgdHlwZTpcbiAgICB8IHR5cGVvZiBQYXJ0VHlwZS5BVFRSSUJVVEVcbiAgICB8IHR5cGVvZiBQYXJ0VHlwZS5QUk9QRVJUWVxuICAgIHwgdHlwZW9mIFBhcnRUeXBlLkJPT0xFQU5fQVRUUklCVVRFXG4gICAgfCB0eXBlb2YgUGFydFR5cGUuRVZFTlQ7XG4gIHJlYWRvbmx5IHN0cmluZ3M/OiBSZWFkb25seUFycmF5PHN0cmluZz47XG4gIHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgdGFnTmFtZTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEVsZW1lbnRQYXJ0SW5mbyB7XG4gIHJlYWRvbmx5IHR5cGU6IHR5cGVvZiBQYXJ0VHlwZS5FTEVNRU5UO1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IHRoZSBwYXJ0IGEgZGlyZWN0aXZlIGlzIGJvdW5kIHRvLlxuICpcbiAqIFRoaXMgaXMgdXNlZnVsIGZvciBjaGVja2luZyB0aGF0IGEgZGlyZWN0aXZlIGlzIGF0dGFjaGVkIHRvIGEgdmFsaWQgcGFydCxcbiAqIHN1Y2ggYXMgd2l0aCBkaXJlY3RpdmUgdGhhdCBjYW4gb25seSBiZSB1c2VkIG9uIGF0dHJpYnV0ZSBiaW5kaW5ncy5cbiAqL1xuZXhwb3J0IHR5cGUgUGFydEluZm8gPSBDaGlsZFBhcnRJbmZvIHwgQXR0cmlidXRlUGFydEluZm8gfCBFbGVtZW50UGFydEluZm87XG5cbi8qKlxuICogQ3JlYXRlcyBhIHVzZXItZmFjaW5nIGRpcmVjdGl2ZSBmdW5jdGlvbiBmcm9tIGEgRGlyZWN0aXZlIGNsYXNzLiBUaGlzXG4gKiBmdW5jdGlvbiBoYXMgdGhlIHNhbWUgcGFyYW1ldGVycyBhcyB0aGUgZGlyZWN0aXZlJ3MgcmVuZGVyKCkgbWV0aG9kLlxuICovXG5leHBvcnQgY29uc3QgZGlyZWN0aXZlID1cbiAgPEMgZXh0ZW5kcyBEaXJlY3RpdmVDbGFzcz4oYzogQykgPT5cbiAgKC4uLnZhbHVlczogRGlyZWN0aXZlUGFyYW1ldGVyczxJbnN0YW5jZVR5cGU8Qz4+KTogRGlyZWN0aXZlUmVzdWx0PEM+ID0+ICh7XG4gICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICBbJ18kbGl0RGlyZWN0aXZlJCddOiBjLFxuICAgIHZhbHVlcyxcbiAgfSk7XG5cbi8qKlxuICogQmFzZSBjbGFzcyBmb3IgY3JlYXRpbmcgY3VzdG9tIGRpcmVjdGl2ZXMuIFVzZXJzIHNob3VsZCBleHRlbmQgdGhpcyBjbGFzcyxcbiAqIGltcGxlbWVudCBgcmVuZGVyYCBhbmQvb3IgYHVwZGF0ZWAsIGFuZCB0aGVuIHBhc3MgdGhlaXIgc3ViY2xhc3MgdG9cbiAqIGBkaXJlY3RpdmVgLlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRGlyZWN0aXZlIGltcGxlbWVudHMgRGlzY29ubmVjdGFibGUge1xuICAvL0BpbnRlcm5hbFxuICBfX3BhcnQhOiBQYXJ0O1xuICAvL0BpbnRlcm5hbFxuICBfX2F0dHJpYnV0ZUluZGV4OiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gIC8vQGludGVybmFsXG4gIF9fZGlyZWN0aXZlPzogRGlyZWN0aXZlO1xuXG4gIC8vQGludGVybmFsXG4gIF8kcGFyZW50ITogRGlzY29ubmVjdGFibGU7XG5cbiAgLy8gVGhlc2Ugd2lsbCBvbmx5IGV4aXN0IG9uIHRoZSBBc3luY0RpcmVjdGl2ZSBzdWJjbGFzc1xuICAvL0BpbnRlcm5hbFxuICBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4/OiBTZXQ8RGlzY29ubmVjdGFibGU+O1xuICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAvL0BpbnRlcm5hbFxuICBbJ18kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWQnXT8oaXNDb25uZWN0ZWQ6IGJvb2xlYW4pOiB2b2lkO1xuXG4gIGNvbnN0cnVjdG9yKF9wYXJ0SW5mbzogUGFydEluZm8pIHt9XG5cbiAgLy8gU2VlIGNvbW1lbnQgaW4gRGlzY29ubmVjdGFibGUgaW50ZXJmYWNlIGZvciB3aHkgdGhpcyBpcyBhIGdldHRlclxuICBnZXQgXyRpc0Nvbm5lY3RlZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fJHBhcmVudC5fJGlzQ29ubmVjdGVkO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGluaXRpYWxpemUoXG4gICAgcGFydDogUGFydCxcbiAgICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICAgIGF0dHJpYnV0ZUluZGV4OiBudW1iZXIgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgdGhpcy5fX3BhcnQgPSBwYXJ0O1xuICAgIHRoaXMuXyRwYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5fX2F0dHJpYnV0ZUluZGV4ID0gYXR0cmlidXRlSW5kZXg7XG4gIH1cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHJlc29sdmUocGFydDogUGFydCwgcHJvcHM6IEFycmF5PHVua25vd24+KTogdW5rbm93biB7XG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKHBhcnQsIHByb3BzKTtcbiAgfVxuXG4gIGFic3RyYWN0IHJlbmRlciguLi5wcm9wczogQXJyYXk8dW5rbm93bj4pOiB1bmtub3duO1xuXG4gIHVwZGF0ZShfcGFydDogUGFydCwgcHJvcHM6IEFycmF5PHVua25vd24+KTogdW5rbm93biB7XG4gICAgcmV0dXJuIHRoaXMucmVuZGVyKC4uLnByb3BzKTtcbiAgfVxufVxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjAgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7XyRMSCwgUGFydCwgRGlyZWN0aXZlUGFyZW50LCBUZW1wbGF0ZVJlc3VsdH0gZnJvbSAnLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBEaXJlY3RpdmVSZXN1bHQsXG4gIERpcmVjdGl2ZUNsYXNzLFxuICBQYXJ0SW5mbyxcbiAgQXR0cmlidXRlUGFydEluZm8sXG59IGZyb20gJy4vZGlyZWN0aXZlLmpzJztcbnR5cGUgUHJpbWl0aXZlID0gbnVsbCB8IHVuZGVmaW5lZCB8IGJvb2xlYW4gfCBudW1iZXIgfCBzdHJpbmcgfCBzeW1ib2wgfCBiaWdpbnQ7XG5cbmNvbnN0IHtfQ2hpbGRQYXJ0OiBDaGlsZFBhcnR9ID0gXyRMSDtcblxudHlwZSBDaGlsZFBhcnQgPSBJbnN0YW5jZVR5cGU8dHlwZW9mIENoaWxkUGFydD47XG5cbmNvbnN0IEVOQUJMRV9TSEFEWURPTV9OT1BBVENIID0gdHJ1ZTtcblxuY29uc3Qgd3JhcCA9XG4gIEVOQUJMRV9TSEFEWURPTV9OT1BBVENIICYmXG4gIHdpbmRvdy5TaGFkeURPTT8uaW5Vc2UgJiZcbiAgd2luZG93LlNoYWR5RE9NPy5ub1BhdGNoID09PSB0cnVlXG4gICAgPyB3aW5kb3cuU2hhZHlET00hLndyYXBcbiAgICA6IChub2RlOiBOb2RlKSA9PiBub2RlO1xuXG4vKipcbiAqIFRlc3RzIGlmIGEgdmFsdWUgaXMgYSBwcmltaXRpdmUgdmFsdWUuXG4gKlxuICogU2VlIGh0dHBzOi8vdGMzOS5naXRodWIuaW8vZWNtYTI2Mi8jc2VjLXR5cGVvZi1vcGVyYXRvclxuICovXG5leHBvcnQgY29uc3QgaXNQcmltaXRpdmUgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBQcmltaXRpdmUgPT5cbiAgdmFsdWUgPT09IG51bGwgfHwgKHR5cGVvZiB2YWx1ZSAhPSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsdWUgIT0gJ2Z1bmN0aW9uJyk7XG5cbmV4cG9ydCBjb25zdCBUZW1wbGF0ZVJlc3VsdFR5cGUgPSB7XG4gIEhUTUw6IDEsXG4gIFNWRzogMixcbn0gYXMgY29uc3Q7XG5cbmV4cG9ydCB0eXBlIFRlbXBsYXRlUmVzdWx0VHlwZSA9XG4gIHR5cGVvZiBUZW1wbGF0ZVJlc3VsdFR5cGVba2V5b2YgdHlwZW9mIFRlbXBsYXRlUmVzdWx0VHlwZV07XG5cbi8qKlxuICogVGVzdHMgaWYgYSB2YWx1ZSBpcyBhIFRlbXBsYXRlUmVzdWx0LlxuICovXG5leHBvcnQgY29uc3QgaXNUZW1wbGF0ZVJlc3VsdCA9IChcbiAgdmFsdWU6IHVua25vd24sXG4gIHR5cGU/OiBUZW1wbGF0ZVJlc3VsdFR5cGVcbik6IHZhbHVlIGlzIFRlbXBsYXRlUmVzdWx0ID0+XG4gIHR5cGUgPT09IHVuZGVmaW5lZFxuICAgID8gLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICAgICh2YWx1ZSBhcyBUZW1wbGF0ZVJlc3VsdCk/LlsnXyRsaXRUeXBlJCddICE9PSB1bmRlZmluZWRcbiAgICA6ICh2YWx1ZSBhcyBUZW1wbGF0ZVJlc3VsdCk/LlsnXyRsaXRUeXBlJCddID09PSB0eXBlO1xuXG4vKipcbiAqIFRlc3RzIGlmIGEgdmFsdWUgaXMgYSBEaXJlY3RpdmVSZXN1bHQuXG4gKi9cbmV4cG9ydCBjb25zdCBpc0RpcmVjdGl2ZVJlc3VsdCA9ICh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIERpcmVjdGl2ZVJlc3VsdCA9PlxuICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAodmFsdWUgYXMgRGlyZWN0aXZlUmVzdWx0KT8uWydfJGxpdERpcmVjdGl2ZSQnXSAhPT0gdW5kZWZpbmVkO1xuXG4vKipcbiAqIFJldHJpZXZlcyB0aGUgRGlyZWN0aXZlIGNsYXNzIGZvciBhIERpcmVjdGl2ZVJlc3VsdFxuICovXG5leHBvcnQgY29uc3QgZ2V0RGlyZWN0aXZlQ2xhc3MgPSAodmFsdWU6IHVua25vd24pOiBEaXJlY3RpdmVDbGFzcyB8IHVuZGVmaW5lZCA9PlxuICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAodmFsdWUgYXMgRGlyZWN0aXZlUmVzdWx0KT8uWydfJGxpdERpcmVjdGl2ZSQnXTtcblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIGEgcGFydCBoYXMgb25seSBhIHNpbmdsZS1leHByZXNzaW9uIHdpdGggbm8gc3RyaW5ncyB0b1xuICogaW50ZXJwb2xhdGUgYmV0d2Vlbi5cbiAqXG4gKiBPbmx5IEF0dHJpYnV0ZVBhcnQgYW5kIFByb3BlcnR5UGFydCBjYW4gaGF2ZSBtdWx0aXBsZSBleHByZXNzaW9ucy5cbiAqIE11bHRpLWV4cHJlc3Npb24gcGFydHMgaGF2ZSBhIGBzdHJpbmdzYCBwcm9wZXJ0eSBhbmQgc2luZ2xlLWV4cHJlc3Npb25cbiAqIHBhcnRzIGRvIG5vdC5cbiAqL1xuZXhwb3J0IGNvbnN0IGlzU2luZ2xlRXhwcmVzc2lvbiA9IChwYXJ0OiBQYXJ0SW5mbykgPT5cbiAgKHBhcnQgYXMgQXR0cmlidXRlUGFydEluZm8pLnN0cmluZ3MgPT09IHVuZGVmaW5lZDtcblxuY29uc3QgY3JlYXRlTWFya2VyID0gKCkgPT4gZG9jdW1lbnQuY3JlYXRlQ29tbWVudCgnJyk7XG5cbi8qKlxuICogSW5zZXJ0cyBhIENoaWxkUGFydCBpbnRvIHRoZSBnaXZlbiBjb250YWluZXIgQ2hpbGRQYXJ0J3MgRE9NLCBlaXRoZXIgYXQgdGhlXG4gKiBlbmQgb2YgdGhlIGNvbnRhaW5lciBDaGlsZFBhcnQsIG9yIGJlZm9yZSB0aGUgb3B0aW9uYWwgYHJlZlBhcnRgLlxuICpcbiAqIFRoaXMgZG9lcyBub3QgYWRkIHRoZSBwYXJ0IHRvIHRoZSBjb250YWluZXJQYXJ0J3MgY29tbWl0dGVkIHZhbHVlLiBUaGF0IG11c3RcbiAqIGJlIGRvbmUgYnkgY2FsbGVycy5cbiAqXG4gKiBAcGFyYW0gY29udGFpbmVyUGFydCBQYXJ0IHdpdGhpbiB3aGljaCB0byBhZGQgdGhlIG5ldyBDaGlsZFBhcnRcbiAqIEBwYXJhbSByZWZQYXJ0IFBhcnQgYmVmb3JlIHdoaWNoIHRvIGFkZCB0aGUgbmV3IENoaWxkUGFydDsgd2hlbiBvbWl0dGVkIHRoZVxuICogICAgIHBhcnQgYWRkZWQgdG8gdGhlIGVuZCBvZiB0aGUgYGNvbnRhaW5lclBhcnRgXG4gKiBAcGFyYW0gcGFydCBQYXJ0IHRvIGluc2VydCwgb3IgdW5kZWZpbmVkIHRvIGNyZWF0ZSBhIG5ldyBwYXJ0XG4gKi9cbmV4cG9ydCBjb25zdCBpbnNlcnRQYXJ0ID0gKFxuICBjb250YWluZXJQYXJ0OiBDaGlsZFBhcnQsXG4gIHJlZlBhcnQ/OiBDaGlsZFBhcnQsXG4gIHBhcnQ/OiBDaGlsZFBhcnRcbik6IENoaWxkUGFydCA9PiB7XG4gIGNvbnN0IGNvbnRhaW5lciA9IHdyYXAoY29udGFpbmVyUGFydC5fJHN0YXJ0Tm9kZSkucGFyZW50Tm9kZSE7XG5cbiAgY29uc3QgcmVmTm9kZSA9XG4gICAgcmVmUGFydCA9PT0gdW5kZWZpbmVkID8gY29udGFpbmVyUGFydC5fJGVuZE5vZGUgOiByZWZQYXJ0Ll8kc3RhcnROb2RlO1xuXG4gIGlmIChwYXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICBjb25zdCBzdGFydE5vZGUgPSB3cmFwKGNvbnRhaW5lcikuaW5zZXJ0QmVmb3JlKGNyZWF0ZU1hcmtlcigpLCByZWZOb2RlKTtcbiAgICBjb25zdCBlbmROb2RlID0gd3JhcChjb250YWluZXIpLmluc2VydEJlZm9yZShjcmVhdGVNYXJrZXIoKSwgcmVmTm9kZSk7XG4gICAgcGFydCA9IG5ldyBDaGlsZFBhcnQoXG4gICAgICBzdGFydE5vZGUsXG4gICAgICBlbmROb2RlLFxuICAgICAgY29udGFpbmVyUGFydCxcbiAgICAgIGNvbnRhaW5lclBhcnQub3B0aW9uc1xuICAgICk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgZW5kTm9kZSA9IHdyYXAocGFydC5fJGVuZE5vZGUhKS5uZXh0U2libGluZztcbiAgICBjb25zdCBvbGRQYXJlbnQgPSBwYXJ0Ll8kcGFyZW50O1xuICAgIGNvbnN0IHBhcmVudENoYW5nZWQgPSBvbGRQYXJlbnQgIT09IGNvbnRhaW5lclBhcnQ7XG4gICAgaWYgKHBhcmVudENoYW5nZWQpIHtcbiAgICAgIHBhcnQuXyRyZXBhcmVudERpc2Nvbm5lY3RhYmxlcz8uKGNvbnRhaW5lclBhcnQpO1xuICAgICAgLy8gTm90ZSB0aGF0IGFsdGhvdWdoIGBfJHJlcGFyZW50RGlzY29ubmVjdGFibGVzYCB1cGRhdGVzIHRoZSBwYXJ0J3NcbiAgICAgIC8vIGBfJHBhcmVudGAgcmVmZXJlbmNlIGFmdGVyIHVubGlua2luZyBmcm9tIGl0cyBjdXJyZW50IHBhcmVudCwgdGhhdFxuICAgICAgLy8gbWV0aG9kIG9ubHkgZXhpc3RzIGlmIERpc2Nvbm5lY3RhYmxlcyBhcmUgcHJlc2VudCwgc28gd2UgbmVlZCB0b1xuICAgICAgLy8gdW5jb25kaXRpb25hbGx5IHNldCBpdCBoZXJlXG4gICAgICBwYXJ0Ll8kcGFyZW50ID0gY29udGFpbmVyUGFydDtcbiAgICAgIC8vIFNpbmNlIHRoZSBfJGlzQ29ubmVjdGVkIGdldHRlciBpcyBzb21ld2hhdCBjb3N0bHksIG9ubHlcbiAgICAgIC8vIHJlYWQgaXQgb25jZSB3ZSBrbm93IHRoZSBzdWJ0cmVlIGhhcyBkaXJlY3RpdmVzIHRoYXQgbmVlZFxuICAgICAgLy8gdG8gYmUgbm90aWZpZWRcbiAgICAgIGxldCBuZXdDb25uZWN0aW9uU3RhdGU7XG4gICAgICBpZiAoXG4gICAgICAgIHBhcnQuXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgIChuZXdDb25uZWN0aW9uU3RhdGUgPSBjb250YWluZXJQYXJ0Ll8kaXNDb25uZWN0ZWQpICE9PVxuICAgICAgICAgIG9sZFBhcmVudCEuXyRpc0Nvbm5lY3RlZFxuICAgICAgKSB7XG4gICAgICAgIHBhcnQuXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZChuZXdDb25uZWN0aW9uU3RhdGUpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZW5kTm9kZSAhPT0gcmVmTm9kZSB8fCBwYXJlbnRDaGFuZ2VkKSB7XG4gICAgICBsZXQgc3RhcnQ6IE5vZGUgfCBudWxsID0gcGFydC5fJHN0YXJ0Tm9kZTtcbiAgICAgIHdoaWxlIChzdGFydCAhPT0gZW5kTm9kZSkge1xuICAgICAgICBjb25zdCBuOiBOb2RlIHwgbnVsbCA9IHdyYXAoc3RhcnQhKS5uZXh0U2libGluZztcbiAgICAgICAgd3JhcChjb250YWluZXIpLmluc2VydEJlZm9yZShzdGFydCEsIHJlZk5vZGUpO1xuICAgICAgICBzdGFydCA9IG47XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhcnQ7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIHZhbHVlIG9mIGEgUGFydC5cbiAqXG4gKiBOb3RlIHRoYXQgdGhpcyBzaG91bGQgb25seSBiZSB1c2VkIHRvIHNldC91cGRhdGUgdGhlIHZhbHVlIG9mIHVzZXItY3JlYXRlZFxuICogcGFydHMgKGkuZS4gdGhvc2UgY3JlYXRlZCB1c2luZyBgaW5zZXJ0UGFydGApOyBpdCBzaG91bGQgbm90IGJlIHVzZWRcbiAqIGJ5IGRpcmVjdGl2ZXMgdG8gc2V0IHRoZSB2YWx1ZSBvZiB0aGUgZGlyZWN0aXZlJ3MgY29udGFpbmVyIHBhcnQuIERpcmVjdGl2ZXNcbiAqIHNob3VsZCByZXR1cm4gYSB2YWx1ZSBmcm9tIGB1cGRhdGVgL2ByZW5kZXJgIHRvIHVwZGF0ZSB0aGVpciBwYXJ0IHN0YXRlLlxuICpcbiAqIEZvciBkaXJlY3RpdmVzIHRoYXQgcmVxdWlyZSBzZXR0aW5nIHRoZWlyIHBhcnQgdmFsdWUgYXN5bmNocm9ub3VzbHksIHRoZXlcbiAqIHNob3VsZCBleHRlbmQgYEFzeW5jRGlyZWN0aXZlYCBhbmQgY2FsbCBgdGhpcy5zZXRWYWx1ZSgpYC5cbiAqXG4gKiBAcGFyYW0gcGFydCBQYXJ0IHRvIHNldFxuICogQHBhcmFtIHZhbHVlIFZhbHVlIHRvIHNldFxuICogQHBhcmFtIGluZGV4IEZvciBgQXR0cmlidXRlUGFydGBzLCB0aGUgaW5kZXggdG8gc2V0XG4gKiBAcGFyYW0gZGlyZWN0aXZlUGFyZW50IFVzZWQgaW50ZXJuYWxseTsgc2hvdWxkIG5vdCBiZSBzZXQgYnkgdXNlclxuICovXG5leHBvcnQgY29uc3Qgc2V0Q2hpbGRQYXJ0VmFsdWUgPSA8VCBleHRlbmRzIENoaWxkUGFydD4oXG4gIHBhcnQ6IFQsXG4gIHZhbHVlOiB1bmtub3duLFxuICBkaXJlY3RpdmVQYXJlbnQ6IERpcmVjdGl2ZVBhcmVudCA9IHBhcnRcbik6IFQgPT4ge1xuICBwYXJ0Ll8kc2V0VmFsdWUodmFsdWUsIGRpcmVjdGl2ZVBhcmVudCk7XG4gIHJldHVybiBwYXJ0O1xufTtcblxuLy8gQSBzZW50aW5hbCB2YWx1ZSB0aGF0IGNhbiBuZXZlciBhcHBlYXIgYXMgYSBwYXJ0IHZhbHVlIGV4Y2VwdCB3aGVuIHNldCBieVxuLy8gbGl2ZSgpLiBVc2VkIHRvIGZvcmNlIGEgZGlydHktY2hlY2sgdG8gZmFpbCBhbmQgY2F1c2UgYSByZS1yZW5kZXIuXG5jb25zdCBSRVNFVF9WQUxVRSA9IHt9O1xuXG4vKipcbiAqIFNldHMgdGhlIGNvbW1pdHRlZCB2YWx1ZSBvZiBhIENoaWxkUGFydCBkaXJlY3RseSB3aXRob3V0IHRyaWdnZXJpbmcgdGhlXG4gKiBjb21taXQgc3RhZ2Ugb2YgdGhlIHBhcnQuXG4gKlxuICogVGhpcyBpcyB1c2VmdWwgaW4gY2FzZXMgd2hlcmUgYSBkaXJlY3RpdmUgbmVlZHMgdG8gdXBkYXRlIHRoZSBwYXJ0IHN1Y2hcbiAqIHRoYXQgdGhlIG5leHQgdXBkYXRlIGRldGVjdHMgYSB2YWx1ZSBjaGFuZ2Ugb3Igbm90LiBXaGVuIHZhbHVlIGlzIG9taXR0ZWQsXG4gKiB0aGUgbmV4dCB1cGRhdGUgd2lsbCBiZSBndWFyYW50ZWVkIHRvIGJlIGRldGVjdGVkIGFzIGEgY2hhbmdlLlxuICpcbiAqIEBwYXJhbSBwYXJ0XG4gKiBAcGFyYW0gdmFsdWVcbiAqL1xuZXhwb3J0IGNvbnN0IHNldENvbW1pdHRlZFZhbHVlID0gKHBhcnQ6IFBhcnQsIHZhbHVlOiB1bmtub3duID0gUkVTRVRfVkFMVUUpID0+XG4gIChwYXJ0Ll8kY29tbWl0dGVkVmFsdWUgPSB2YWx1ZSk7XG5cbi8qKlxuICogUmV0dXJucyB0aGUgY29tbWl0dGVkIHZhbHVlIG9mIGEgQ2hpbGRQYXJ0LlxuICpcbiAqIFRoZSBjb21taXR0ZWQgdmFsdWUgaXMgdXNlZCBmb3IgY2hhbmdlIGRldGVjdGlvbiBhbmQgZWZmaWNpZW50IHVwZGF0ZXMgb2ZcbiAqIHRoZSBwYXJ0LiBJdCBjYW4gZGlmZmVyIGZyb20gdGhlIHZhbHVlIHNldCBieSB0aGUgdGVtcGxhdGUgb3IgZGlyZWN0aXZlIGluXG4gKiBjYXNlcyB3aGVyZSB0aGUgdGVtcGxhdGUgdmFsdWUgaXMgdHJhbnNmb3JtZWQgYmVmb3JlIGJlaW5nIGNvbW1pdGVkLlxuICpcbiAqIC0gYFRlbXBsYXRlUmVzdWx0YHMgYXJlIGNvbW1pdHRlZCBhcyBhIGBUZW1wbGF0ZUluc3RhbmNlYFxuICogLSBJdGVyYWJsZXMgYXJlIGNvbW1pdHRlZCBhcyBgQXJyYXk8Q2hpbGRQYXJ0PmBcbiAqIC0gQWxsIG90aGVyIHR5cGVzIGFyZSBjb21taXR0ZWQgYXMgdGhlIHRlbXBsYXRlIHZhbHVlIG9yIHZhbHVlIHJldHVybmVkIG9yXG4gKiAgIHNldCBieSBhIGRpcmVjdGl2ZS5cbiAqXG4gKiBAcGFyYW0gcGFydFxuICovXG5leHBvcnQgY29uc3QgZ2V0Q29tbWl0dGVkVmFsdWUgPSAocGFydDogQ2hpbGRQYXJ0KSA9PiBwYXJ0Ll8kY29tbWl0dGVkVmFsdWU7XG5cbi8qKlxuICogUmVtb3ZlcyBhIENoaWxkUGFydCBmcm9tIHRoZSBET00sIGluY2x1ZGluZyBhbnkgb2YgaXRzIGNvbnRlbnQuXG4gKlxuICogQHBhcmFtIHBhcnQgVGhlIFBhcnQgdG8gcmVtb3ZlXG4gKi9cbmV4cG9ydCBjb25zdCByZW1vdmVQYXJ0ID0gKHBhcnQ6IENoaWxkUGFydCkgPT4ge1xuICBwYXJ0Ll8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQ/LihmYWxzZSwgdHJ1ZSk7XG4gIGxldCBzdGFydDogQ2hpbGROb2RlIHwgbnVsbCA9IHBhcnQuXyRzdGFydE5vZGU7XG4gIGNvbnN0IGVuZDogQ2hpbGROb2RlIHwgbnVsbCA9IHdyYXAocGFydC5fJGVuZE5vZGUhKS5uZXh0U2libGluZztcbiAgd2hpbGUgKHN0YXJ0ICE9PSBlbmQpIHtcbiAgICBjb25zdCBuOiBDaGlsZE5vZGUgfCBudWxsID0gd3JhcChzdGFydCEpLm5leHRTaWJsaW5nO1xuICAgICh3cmFwKHN0YXJ0ISkgYXMgQ2hpbGROb2RlKS5yZW1vdmUoKTtcbiAgICBzdGFydCA9IG47XG4gIH1cbn07XG5cbmV4cG9ydCBjb25zdCBjbGVhclBhcnQgPSAocGFydDogQ2hpbGRQYXJ0KSA9PiB7XG4gIHBhcnQuXyRjbGVhcigpO1xufTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG4vKipcbiAqIE92ZXJ2aWV3OlxuICpcbiAqIFRoaXMgbW9kdWxlIGlzIGRlc2lnbmVkIHRvIGFkZCBzdXBwb3J0IGZvciBhbiBhc3luYyBgc2V0VmFsdWVgIEFQSSBhbmRcbiAqIGBkaXNjb25uZWN0ZWRgIGNhbGxiYWNrIHRvIGRpcmVjdGl2ZXMgd2l0aCB0aGUgbGVhc3QgaW1wYWN0IG9uIHRoZSBjb3JlXG4gKiBydW50aW1lIG9yIHBheWxvYWQgd2hlbiB0aGF0IGZlYXR1cmUgaXMgbm90IHVzZWQuXG4gKlxuICogVGhlIHN0cmF0ZWd5IGlzIHRvIGludHJvZHVjZSBhIGBBc3luY0RpcmVjdGl2ZWAgc3ViY2xhc3Mgb2ZcbiAqIGBEaXJlY3RpdmVgIHRoYXQgY2xpbWJzIHRoZSBcInBhcmVudFwiIHRyZWUgaW4gaXRzIGNvbnN0cnVjdG9yIHRvIG5vdGUgd2hpY2hcbiAqIGJyYW5jaGVzIG9mIGxpdC1odG1sJ3MgXCJsb2dpY2FsIHRyZWVcIiBvZiBkYXRhIHN0cnVjdHVyZXMgY29udGFpbiBzdWNoXG4gKiBkaXJlY3RpdmVzIGFuZCB0aHVzIG5lZWQgdG8gYmUgY3Jhd2xlZCB3aGVuIGEgc3VidHJlZSBpcyBiZWluZyBjbGVhcmVkIChvclxuICogbWFudWFsbHkgZGlzY29ubmVjdGVkKSBpbiBvcmRlciB0byBydW4gdGhlIGBkaXNjb25uZWN0ZWRgIGNhbGxiYWNrLlxuICpcbiAqIFRoZSBcIm5vZGVzXCIgb2YgdGhlIGxvZ2ljYWwgdHJlZSBpbmNsdWRlIFBhcnRzLCBUZW1wbGF0ZUluc3RhbmNlcyAoZm9yIHdoZW4gYVxuICogVGVtcGxhdGVSZXN1bHQgaXMgY29tbWl0dGVkIHRvIGEgdmFsdWUgb2YgYSBDaGlsZFBhcnQpLCBhbmQgRGlyZWN0aXZlczsgdGhlc2VcbiAqIGFsbCBpbXBsZW1lbnQgYSBjb21tb24gaW50ZXJmYWNlIGNhbGxlZCBgRGlzY29ubmVjdGFibGVDaGlsZGAuIEVhY2ggaGFzIGFcbiAqIGBfJHBhcmVudGAgcmVmZXJlbmNlIHdoaWNoIGlzIHNldCBkdXJpbmcgY29uc3RydWN0aW9uIGluIHRoZSBjb3JlIGNvZGUsIGFuZCBhXG4gKiBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCBmaWVsZCB3aGljaCBpcyBpbml0aWFsbHkgdW5kZWZpbmVkLlxuICpcbiAqIFRoZSBzcGFyc2UgdHJlZSBjcmVhdGVkIGJ5IG1lYW5zIG9mIHRoZSBgQXN5bmNEaXJlY3RpdmVgIGNvbnN0cnVjdG9yXG4gKiBjcmF3bGluZyB1cCB0aGUgYF8kcGFyZW50YCB0cmVlIGFuZCBwbGFjaW5nIGEgYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAgU2V0XG4gKiBvbiBlYWNoIHBhcmVudCB0aGF0IGluY2x1ZGVzIGVhY2ggY2hpbGQgdGhhdCBjb250YWlucyBhXG4gKiBgQXN5bmNEaXJlY3RpdmVgIGRpcmVjdGx5IG9yIHRyYW5zaXRpdmVseSB2aWEgaXRzIGNoaWxkcmVuLiBJbiBvcmRlciB0b1xuICogbm90aWZ5IGNvbm5lY3Rpb24gc3RhdGUgY2hhbmdlcyBhbmQgZGlzY29ubmVjdCAob3IgcmVjb25uZWN0KSBhIHRyZWUsIHRoZVxuICogYF8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWRgIEFQSSBpcyBwYXRjaGVkIG9udG8gQ2hpbGRQYXJ0cyBhcyBhIGRpcmVjdGl2ZVxuICogY2xpbWJzIHRoZSBwYXJlbnQgdHJlZSwgd2hpY2ggaXMgY2FsbGVkIGJ5IHRoZSBjb3JlIHdoZW4gY2xlYXJpbmcgYSBwYXJ0IGlmXG4gKiBpdCBleGlzdHMuIFdoZW4gY2FsbGVkLCB0aGF0IG1ldGhvZCBpdGVyYXRlcyBvdmVyIHRoZSBzcGFyc2UgdHJlZSBvZlxuICogU2V0PERpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4+IGJ1aWx0IHVwIGJ5IEFzeW5jRGlyZWN0aXZlcywgYW5kIGNhbGxzXG4gKiBgXyRub3RpZnlEaXJlY3RpdmVDb25uZWN0aW9uQ2hhbmdlZGAgb24gYW55IGRpcmVjdGl2ZXMgdGhhdCBhcmUgZW5jb3VudGVyZWRcbiAqIGluIHRoYXQgdHJlZSwgcnVubmluZyB0aGUgcmVxdWlyZWQgY2FsbGJhY2tzLlxuICpcbiAqIEEgZ2l2ZW4gXCJsb2dpY2FsIHRyZWVcIiBvZiBsaXQtaHRtbCBkYXRhLXN0cnVjdHVyZXMgbWlnaHQgbG9vayBsaWtlIHRoaXM6XG4gKlxuICogIENoaWxkUGFydChOMSkgXyRkQz1bRDIsVDNdXG4gKiAgIC5fZGlyZWN0aXZlXG4gKiAgICAgQXN5bmNEaXJlY3RpdmUoRDIpXG4gKiAgIC5fdmFsdWUgLy8gdXNlciB2YWx1ZSB3YXMgVGVtcGxhdGVSZXN1bHRcbiAqICAgICBUZW1wbGF0ZUluc3RhbmNlKFQzKSBfJGRDPVtBNCxBNixOMTAsTjEyXVxuICogICAgICAuX3BhcnRzW11cbiAqICAgICAgICBBdHRyaWJ1dGVQYXJ0KEE0KSBfJGRDPVtENV1cbiAqICAgICAgICAgLl9kaXJlY3RpdmVzW11cbiAqICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShENSlcbiAqICAgICAgICBBdHRyaWJ1dGVQYXJ0KEE2KSBfJGRDPVtENyxEOF1cbiAqICAgICAgICAgLl9kaXJlY3RpdmVzW11cbiAqICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShENylcbiAqICAgICAgICAgICBEaXJlY3RpdmUoRDgpIF8kZEM9W0Q5XVxuICogICAgICAgICAgICAuX2RpcmVjdGl2ZVxuICogICAgICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQ5KVxuICogICAgICAgIENoaWxkUGFydChOMTApIF8kZEM9W0QxMV1cbiAqICAgICAgICAgLl9kaXJlY3RpdmVcbiAqICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEMTEpXG4gKiAgICAgICAgIC5fdmFsdWVcbiAqICAgICAgICAgICBzdHJpbmdcbiAqICAgICAgICBDaGlsZFBhcnQoTjEyKSBfJGRDPVtEMTMsTjE0LE4xNl1cbiAqICAgICAgICAgLl9kaXJlY3RpdmVcbiAqICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEMTMpXG4gKiAgICAgICAgIC5fdmFsdWUgLy8gdXNlciB2YWx1ZSB3YXMgaXRlcmFibGVcbiAqICAgICAgICAgICBBcnJheTxDaGlsZFBhcnQ+XG4gKiAgICAgICAgICAgICBDaGlsZFBhcnQoTjE0KSBfJGRDPVtEMTVdXG4gKiAgICAgICAgICAgICAgLl92YWx1ZVxuICogICAgICAgICAgICAgICAgc3RyaW5nXG4gKiAgICAgICAgICAgICBDaGlsZFBhcnQoTjE2KSBfJGRDPVtEMTcsVDE4XVxuICogICAgICAgICAgICAgIC5fZGlyZWN0aXZlXG4gKiAgICAgICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEMTcpXG4gKiAgICAgICAgICAgICAgLl92YWx1ZSAvLyB1c2VyIHZhbHVlIHdhcyBUZW1wbGF0ZVJlc3VsdFxuICogICAgICAgICAgICAgICAgVGVtcGxhdGVJbnN0YW5jZShUMTgpIF8kZEM9W0ExOSxBMjEsTjI1XVxuICogICAgICAgICAgICAgICAgIC5fcGFydHNbXVxuICogICAgICAgICAgICAgICAgICAgQXR0cmlidXRlUGFydChBMTkpIF8kZEM9W0QyMF1cbiAqICAgICAgICAgICAgICAgICAgICAuX2RpcmVjdGl2ZXNbXVxuICogICAgICAgICAgICAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDIwKVxuICogICAgICAgICAgICAgICAgICAgQXR0cmlidXRlUGFydChBMjEpIF8kZEM9WzIyLDIzXVxuICogICAgICAgICAgICAgICAgICAgIC5fZGlyZWN0aXZlc1tdXG4gKiAgICAgICAgICAgICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEMjIpXG4gKiAgICAgICAgICAgICAgICAgICAgICBEaXJlY3RpdmUoRDIzKSBfJGRDPVtEMjRdXG4gKiAgICAgICAgICAgICAgICAgICAgICAgLl9kaXJlY3RpdmVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQyNClcbiAqICAgICAgICAgICAgICAgICAgIENoaWxkUGFydChOMjUpIF8kZEM9W0QyNl1cbiAqICAgICAgICAgICAgICAgICAgICAuX2RpcmVjdGl2ZVxuICogICAgICAgICAgICAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDI2KVxuICogICAgICAgICAgICAgICAgICAgIC5fdmFsdWVcbiAqICAgICAgICAgICAgICAgICAgICAgIHN0cmluZ1xuICpcbiAqIEV4YW1wbGUgMTogVGhlIGRpcmVjdGl2ZSBpbiBDaGlsZFBhcnQoTjEyKSB1cGRhdGVzIGFuZCByZXR1cm5zIGBub3RoaW5nYC4gVGhlXG4gKiBDaGlsZFBhcnQgd2lsbCBfY2xlYXIoKSBpdHNlbGYsIGFuZCBzbyB3ZSBuZWVkIHRvIGRpc2Nvbm5lY3QgdGhlIFwidmFsdWVcIiBvZlxuICogdGhlIENoaWxkUGFydCAoYnV0IG5vdCBpdHMgZGlyZWN0aXZlKS4gSW4gdGhpcyBjYXNlLCB3aGVuIGBfY2xlYXIoKWAgY2FsbHNcbiAqIGBfJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkKClgLCB3ZSBkb24ndCBpdGVyYXRlIGFsbCBvZiB0aGVcbiAqIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbiwgcmF0aGVyIHdlIGRvIGEgdmFsdWUtc3BlY2lmaWMgZGlzY29ubmVjdGlvbjogaS5lLlxuICogc2luY2UgdGhlIF92YWx1ZSB3YXMgYW4gQXJyYXk8Q2hpbGRQYXJ0PiAoYmVjYXVzZSBhbiBpdGVyYWJsZSBoYWQgYmVlblxuICogY29tbWl0dGVkKSwgd2UgaXRlcmF0ZSB0aGUgYXJyYXkgb2YgQ2hpbGRQYXJ0cyAoTjE0LCBOMTYpIGFuZCBydW5cbiAqIGBzZXRDb25uZWN0ZWRgIG9uIHRoZW0gKHdoaWNoIGRvZXMgcmVjdXJzZSBkb3duIHRoZSBmdWxsIHRyZWUgb2ZcbiAqIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gIGJlbG93IGl0LCBhbmQgYWxzbyByZW1vdmVzIE4xNCBhbmQgTjE2IGZyb20gTjEyJ3NcbiAqIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gKS4gT25jZSB0aGUgdmFsdWVzIGhhdmUgYmVlbiBkaXNjb25uZWN0ZWQsIHdlIHRoZW5cbiAqIGNoZWNrIHdoZXRoZXIgdGhlIENoaWxkUGFydChOMTIpJ3MgbGlzdCBvZiBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCBpcyBlbXB0eVxuICogKGFuZCB3b3VsZCByZW1vdmUgaXQgZnJvbSBpdHMgcGFyZW50IFRlbXBsYXRlSW5zdGFuY2UoVDMpIGlmIHNvKSwgYnV0IHNpbmNlXG4gKiBpdCB3b3VsZCBzdGlsbCBjb250YWluIGl0cyBkaXJlY3RpdmUgRDEzLCBpdCBzdGF5cyBpbiB0aGUgZGlzY29ubmVjdGFibGVcbiAqIHRyZWUuXG4gKlxuICogRXhhbXBsZSAyOiBJbiB0aGUgY291cnNlIG9mIEV4YW1wbGUgMSwgYHNldENvbm5lY3RlZGAgd2lsbCByZWFjaFxuICogQ2hpbGRQYXJ0KE4xNik7IGluIHRoaXMgY2FzZSB0aGUgZW50aXJlIHBhcnQgaXMgYmVpbmcgZGlzY29ubmVjdGVkLCBzbyB3ZVxuICogc2ltcGx5IGl0ZXJhdGUgYWxsIG9mIE4xNidzIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gIChEMTcsVDE4KSBhbmRcbiAqIHJlY3Vyc2l2ZWx5IHJ1biBgc2V0Q29ubmVjdGVkYCBvbiB0aGVtLiBOb3RlIHRoYXQgd2Ugb25seSByZW1vdmUgY2hpbGRyZW5cbiAqIGZyb20gYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAgZm9yIHRoZSB0b3AtbGV2ZWwgdmFsdWVzIGJlaW5nIGRpc2Nvbm5lY3RlZFxuICogb24gYSBjbGVhcjsgZG9pbmcgdGhpcyBib29ra2VlcGluZyBsb3dlciBpbiB0aGUgdHJlZSBpcyB3YXN0ZWZ1bCBzaW5jZSBpdCdzXG4gKiBhbGwgYmVpbmcgdGhyb3duIGF3YXkuXG4gKlxuICogRXhhbXBsZSAzOiBJZiB0aGUgTGl0RWxlbWVudCBjb250YWluaW5nIHRoZSBlbnRpcmUgdHJlZSBhYm92ZSBiZWNvbWVzXG4gKiBkaXNjb25uZWN0ZWQsIGl0IHdpbGwgcnVuIGBjaGlsZFBhcnQuc2V0Q29ubmVjdGVkKClgICh3aGljaCBjYWxsc1xuICogYGNoaWxkUGFydC5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkKClgIGlmIGl0IGV4aXN0cyk7IGluIHRoaXMgY2FzZSwgd2VcbiAqIHJlY3Vyc2l2ZWx5IHJ1biBgc2V0Q29ubmVjdGVkKClgIG92ZXIgdGhlIGVudGlyZSB0cmVlLCB3aXRob3V0IHJlbW92aW5nIGFueVxuICogY2hpbGRyZW4gZnJvbSBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCwgc2luY2UgdGhpcyB0cmVlIGlzIHJlcXVpcmVkIHRvXG4gKiByZS1jb25uZWN0IHRoZSB0cmVlLCB3aGljaCBkb2VzIHRoZSBzYW1lIG9wZXJhdGlvbiwgc2ltcGx5IHBhc3NpbmdcbiAqIGBpc0Nvbm5lY3RkOiB0cnVlYCBkb3duIHRoZSB0cmVlLCBzaWduYWxpbmcgd2hpY2ggY2FsbGJhY2sgdG8gcnVuLlxuICovXG5cbmltcG9ydCB7QXR0cmlidXRlUGFydCwgQ2hpbGRQYXJ0LCBEaXNjb25uZWN0YWJsZSwgUGFydH0gZnJvbSAnLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2lzU2luZ2xlRXhwcmVzc2lvbn0gZnJvbSAnLi9kaXJlY3RpdmUtaGVscGVycy5qcyc7XG5pbXBvcnQge0RpcmVjdGl2ZSwgUGFydEluZm8sIFBhcnRUeXBlfSBmcm9tICcuL2RpcmVjdGl2ZS5qcyc7XG5leHBvcnQge2RpcmVjdGl2ZX0gZnJvbSAnLi9kaXJlY3RpdmUuanMnO1xuXG5jb25zdCBERVZfTU9ERSA9IHRydWU7XG5cbi8qKlxuICogUmVjdXJzaXZlbHkgd2Fsa3MgZG93biB0aGUgdHJlZSBvZiBQYXJ0cy9UZW1wbGF0ZUluc3RhbmNlcy9EaXJlY3RpdmVzIHRvIHNldFxuICogdGhlIGNvbm5lY3RlZCBzdGF0ZSBvZiBkaXJlY3RpdmVzIGFuZCBydW4gYGRpc2Nvbm5lY3RlZGAvIGByZWNvbm5lY3RlZGBcbiAqIGNhbGxiYWNrcy5cbiAqXG4gKiBAcmV0dXJuIFRydWUgaWYgdGhlcmUgd2VyZSBjaGlsZHJlbiB0byBkaXNjb25uZWN0OyBmYWxzZSBvdGhlcndpc2VcbiAqL1xuY29uc3Qgbm90aWZ5Q2hpbGRyZW5Db25uZWN0ZWRDaGFuZ2VkID0gKFxuICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICBpc0Nvbm5lY3RlZDogYm9vbGVhblxuKTogYm9vbGVhbiA9PiB7XG4gIGNvbnN0IGNoaWxkcmVuID0gcGFyZW50Ll8kZGlzY29ubmVjdGFibGVDaGlsZHJlbjtcbiAgaWYgKGNoaWxkcmVuID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgZm9yIChjb25zdCBvYmogb2YgY2hpbGRyZW4pIHtcbiAgICAvLyBUaGUgZXhpc3RlbmNlIG9mIGBfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkYCBpcyB1c2VkIGFzIGEgXCJicmFuZFwiIHRvXG4gICAgLy8gZGlzYW1iaWd1YXRlIEFzeW5jRGlyZWN0aXZlcyBmcm9tIG90aGVyIERpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5cbiAgICAvLyAoYXMgb3Bwb3NlZCB0byB1c2luZyBhbiBpbnN0YW5jZW9mIGNoZWNrIHRvIGtub3cgd2hlbiB0byBjYWxsIGl0KTsgdGhlXG4gICAgLy8gcmVkdW5kYW5jeSBvZiBcIkRpcmVjdGl2ZVwiIGluIHRoZSBBUEkgbmFtZSBpcyB0byBhdm9pZCBjb25mbGljdGluZyB3aXRoXG4gICAgLy8gYF8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWRgLCB3aGljaCBleGlzdHMgYENoaWxkUGFydHNgIHdoaWNoIGFyZSBhbHNvIGluXG4gICAgLy8gdGhpcyBsaXN0XG4gICAgLy8gRGlzY29ubmVjdCBEaXJlY3RpdmUgKGFuZCBhbnkgbmVzdGVkIGRpcmVjdGl2ZXMgY29udGFpbmVkIHdpdGhpbilcbiAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIChvYmogYXMgQXN5bmNEaXJlY3RpdmUpWydfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkJ10/LihcbiAgICAgIGlzQ29ubmVjdGVkLFxuICAgICAgZmFsc2VcbiAgICApO1xuICAgIC8vIERpc2Nvbm5lY3QgUGFydC9UZW1wbGF0ZUluc3RhbmNlXG4gICAgbm90aWZ5Q2hpbGRyZW5Db25uZWN0ZWRDaGFuZ2VkKG9iaiwgaXNDb25uZWN0ZWQpO1xuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIHRoZSBnaXZlbiBjaGlsZCBmcm9tIGl0cyBwYXJlbnQgbGlzdCBvZiBkaXNjb25uZWN0YWJsZSBjaGlsZHJlbiwgYW5kXG4gKiBpZiB0aGUgcGFyZW50IGxpc3QgYmVjb21lcyBlbXB0eSBhcyBhIHJlc3VsdCwgcmVtb3ZlcyB0aGUgcGFyZW50IGZyb20gaXRzXG4gKiBwYXJlbnQsIGFuZCBzbyBmb3J0aCB1cCB0aGUgdHJlZSB3aGVuIHRoYXQgY2F1c2VzIHN1YnNlcXVlbnQgcGFyZW50IGxpc3RzIHRvXG4gKiBiZWNvbWUgZW1wdHkuXG4gKi9cbmNvbnN0IHJlbW92ZURpc2Nvbm5lY3RhYmxlRnJvbVBhcmVudCA9IChvYmo6IERpc2Nvbm5lY3RhYmxlKSA9PiB7XG4gIGxldCBwYXJlbnQsIGNoaWxkcmVuO1xuICBkbyB7XG4gICAgaWYgKChwYXJlbnQgPSBvYmouXyRwYXJlbnQpID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjaGlsZHJlbiA9IHBhcmVudC5fJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4hO1xuICAgIGNoaWxkcmVuLmRlbGV0ZShvYmopO1xuICAgIG9iaiA9IHBhcmVudDtcbiAgfSB3aGlsZSAoY2hpbGRyZW4/LnNpemUgPT09IDApO1xufTtcblxuY29uc3QgYWRkRGlzY29ubmVjdGFibGVUb1BhcmVudCA9IChvYmo6IERpc2Nvbm5lY3RhYmxlKSA9PiB7XG4gIC8vIENsaW1iIHRoZSBwYXJlbnQgdHJlZSwgY3JlYXRpbmcgYSBzcGFyc2UgdHJlZSBvZiBjaGlsZHJlbiBuZWVkaW5nXG4gIC8vIGRpc2Nvbm5lY3Rpb25cbiAgZm9yIChsZXQgcGFyZW50OyAocGFyZW50ID0gb2JqLl8kcGFyZW50KTsgb2JqID0gcGFyZW50KSB7XG4gICAgbGV0IGNoaWxkcmVuID0gcGFyZW50Ll8kZGlzY29ubmVjdGFibGVDaGlsZHJlbjtcbiAgICBpZiAoY2hpbGRyZW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcGFyZW50Ll8kZGlzY29ubmVjdGFibGVDaGlsZHJlbiA9IGNoaWxkcmVuID0gbmV3IFNldCgpO1xuICAgIH0gZWxzZSBpZiAoY2hpbGRyZW4uaGFzKG9iaikpIHtcbiAgICAgIC8vIE9uY2Ugd2UndmUgcmVhY2hlZCBhIHBhcmVudCB0aGF0IGFscmVhZHkgY29udGFpbnMgdGhpcyBjaGlsZCwgd2VcbiAgICAgIC8vIGNhbiBzaG9ydC1jaXJjdWl0XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY2hpbGRyZW4uYWRkKG9iaik7XG4gICAgaW5zdGFsbERpc2Nvbm5lY3RBUEkocGFyZW50KTtcbiAgfVxufTtcblxuLyoqXG4gKiBDaGFuZ2VzIHRoZSBwYXJlbnQgcmVmZXJlbmNlIG9mIHRoZSBDaGlsZFBhcnQsIGFuZCB1cGRhdGVzIHRoZSBzcGFyc2UgdHJlZSBvZlxuICogRGlzY29ubmVjdGFibGUgY2hpbGRyZW4gYWNjb3JkaW5nbHkuXG4gKlxuICogTm90ZSwgdGhpcyBtZXRob2Qgd2lsbCBiZSBwYXRjaGVkIG9udG8gQ2hpbGRQYXJ0IGluc3RhbmNlcyBhbmQgY2FsbGVkIGZyb21cbiAqIHRoZSBjb3JlIGNvZGUgd2hlbiBwYXJ0cyBhcmUgbW92ZWQgYmV0d2VlbiBkaWZmZXJlbnQgcGFyZW50cy5cbiAqL1xuZnVuY3Rpb24gcmVwYXJlbnREaXNjb25uZWN0YWJsZXModGhpczogQ2hpbGRQYXJ0LCBuZXdQYXJlbnQ6IERpc2Nvbm5lY3RhYmxlKSB7XG4gIGlmICh0aGlzLl8kZGlzY29ubmVjdGFibGVDaGlsZHJlbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmVtb3ZlRGlzY29ubmVjdGFibGVGcm9tUGFyZW50KHRoaXMpO1xuICAgIHRoaXMuXyRwYXJlbnQgPSBuZXdQYXJlbnQ7XG4gICAgYWRkRGlzY29ubmVjdGFibGVUb1BhcmVudCh0aGlzKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLl8kcGFyZW50ID0gbmV3UGFyZW50O1xuICB9XG59XG5cbi8qKlxuICogU2V0cyB0aGUgY29ubmVjdGVkIHN0YXRlIG9uIGFueSBkaXJlY3RpdmVzIGNvbnRhaW5lZCB3aXRoaW4gdGhlIGNvbW1pdHRlZFxuICogdmFsdWUgb2YgdGhpcyBwYXJ0IChpLmUuIHdpdGhpbiBhIFRlbXBsYXRlSW5zdGFuY2Ugb3IgaXRlcmFibGUgb2ZcbiAqIENoaWxkUGFydHMpIGFuZCBydW5zIHRoZWlyIGBkaXNjb25uZWN0ZWRgL2ByZWNvbm5lY3RlZGBzLCBhcyB3ZWxsIGFzIHdpdGhpblxuICogYW55IGRpcmVjdGl2ZXMgc3RvcmVkIG9uIHRoZSBDaGlsZFBhcnQgKHdoZW4gYHZhbHVlT25seWAgaXMgZmFsc2UpLlxuICpcbiAqIGBpc0NsZWFyaW5nVmFsdWVgIHNob3VsZCBiZSBwYXNzZWQgYXMgYHRydWVgIG9uIGEgdG9wLWxldmVsIHBhcnQgdGhhdCBpc1xuICogY2xlYXJpbmcgaXRzZWxmLCBhbmQgbm90IGFzIGEgcmVzdWx0IG9mIHJlY3Vyc2l2ZWx5IGRpc2Nvbm5lY3RpbmcgZGlyZWN0aXZlc1xuICogYXMgcGFydCBvZiBhIGBjbGVhcmAgb3BlcmF0aW9uIGhpZ2hlciB1cCB0aGUgdHJlZS4gVGhpcyBib3RoIGVuc3VyZXMgdGhhdCBhbnlcbiAqIGRpcmVjdGl2ZSBvbiB0aGlzIENoaWxkUGFydCB0aGF0IHByb2R1Y2VkIGEgdmFsdWUgdGhhdCBjYXVzZWQgdGhlIGNsZWFyXG4gKiBvcGVyYXRpb24gaXMgbm90IGRpc2Nvbm5lY3RlZCwgYW5kIGFsc28gc2VydmVzIGFzIGEgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uXG4gKiB0byBhdm9pZCBuZWVkbGVzcyBib29ra2VlcGluZyB3aGVuIGEgc3VidHJlZSBpcyBnb2luZyBhd2F5OyB3aGVuIGNsZWFyaW5nIGFcbiAqIHN1YnRyZWUsIG9ubHkgdGhlIHRvcC1tb3N0IHBhcnQgbmVlZCB0byByZW1vdmUgaXRzZWxmIGZyb20gdGhlIHBhcmVudC5cbiAqXG4gKiBgZnJvbVBhcnRJbmRleGAgaXMgcGFzc2VkIG9ubHkgaW4gdGhlIGNhc2Ugb2YgYSBwYXJ0aWFsIGBfY2xlYXJgIHJ1bm5pbmcgYXMgYVxuICogcmVzdWx0IG9mIHRydW5jYXRpbmcgYW4gaXRlcmFibGUuXG4gKlxuICogTm90ZSwgdGhpcyBtZXRob2Qgd2lsbCBiZSBwYXRjaGVkIG9udG8gQ2hpbGRQYXJ0IGluc3RhbmNlcyBhbmQgY2FsbGVkIGZyb20gdGhlXG4gKiBjb3JlIGNvZGUgd2hlbiBwYXJ0cyBhcmUgY2xlYXJlZCBvciB0aGUgY29ubmVjdGlvbiBzdGF0ZSBpcyBjaGFuZ2VkIGJ5IHRoZVxuICogdXNlci5cbiAqL1xuZnVuY3Rpb24gbm90aWZ5Q2hpbGRQYXJ0Q29ubmVjdGVkQ2hhbmdlZChcbiAgdGhpczogQ2hpbGRQYXJ0LFxuICBpc0Nvbm5lY3RlZDogYm9vbGVhbixcbiAgaXNDbGVhcmluZ1ZhbHVlID0gZmFsc2UsXG4gIGZyb21QYXJ0SW5kZXggPSAwXG4pIHtcbiAgY29uc3QgdmFsdWUgPSB0aGlzLl8kY29tbWl0dGVkVmFsdWU7XG4gIGNvbnN0IGNoaWxkcmVuID0gdGhpcy5fJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW47XG4gIGlmIChjaGlsZHJlbiA9PT0gdW5kZWZpbmVkIHx8IGNoaWxkcmVuLnNpemUgPT09IDApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKGlzQ2xlYXJpbmdWYWx1ZSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgLy8gSXRlcmFibGUgY2FzZTogQW55IENoaWxkUGFydHMgY3JlYXRlZCBieSB0aGUgaXRlcmFibGUgc2hvdWxkIGJlXG4gICAgICAvLyBkaXNjb25uZWN0ZWQgYW5kIHJlbW92ZWQgZnJvbSB0aGlzIENoaWxkUGFydCdzIGRpc2Nvbm5lY3RhYmxlXG4gICAgICAvLyBjaGlsZHJlbiAoc3RhcnRpbmcgYXQgYGZyb21QYXJ0SW5kZXhgIGluIHRoZSBjYXNlIG9mIHRydW5jYXRpb24pXG4gICAgICBmb3IgKGxldCBpID0gZnJvbVBhcnRJbmRleDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5vdGlmeUNoaWxkcmVuQ29ubmVjdGVkQ2hhbmdlZCh2YWx1ZVtpXSwgZmFsc2UpO1xuICAgICAgICByZW1vdmVEaXNjb25uZWN0YWJsZUZyb21QYXJlbnQodmFsdWVbaV0pO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgLy8gVGVtcGxhdGVJbnN0YW5jZSBjYXNlOiBJZiB0aGUgdmFsdWUgaGFzIGRpc2Nvbm5lY3RhYmxlIGNoaWxkcmVuICh3aWxsXG4gICAgICAvLyBvbmx5IGJlIGluIHRoZSBjYXNlIHRoYXQgaXQgaXMgYSBUZW1wbGF0ZUluc3RhbmNlKSwgd2UgZGlzY29ubmVjdCBpdFxuICAgICAgLy8gYW5kIHJlbW92ZSBpdCBmcm9tIHRoaXMgQ2hpbGRQYXJ0J3MgZGlzY29ubmVjdGFibGUgY2hpbGRyZW5cbiAgICAgIG5vdGlmeUNoaWxkcmVuQ29ubmVjdGVkQ2hhbmdlZCh2YWx1ZSBhcyBEaXNjb25uZWN0YWJsZSwgZmFsc2UpO1xuICAgICAgcmVtb3ZlRGlzY29ubmVjdGFibGVGcm9tUGFyZW50KHZhbHVlIGFzIERpc2Nvbm5lY3RhYmxlKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbm90aWZ5Q2hpbGRyZW5Db25uZWN0ZWRDaGFuZ2VkKHRoaXMsIGlzQ29ubmVjdGVkKTtcbiAgfVxufVxuXG4vKipcbiAqIFBhdGNoZXMgZGlzY29ubmVjdGlvbiBBUEkgb250byBDaGlsZFBhcnRzLlxuICovXG5jb25zdCBpbnN0YWxsRGlzY29ubmVjdEFQSSA9IChvYmo6IERpc2Nvbm5lY3RhYmxlKSA9PiB7XG4gIGlmICgob2JqIGFzIENoaWxkUGFydCkudHlwZSA9PSBQYXJ0VHlwZS5DSElMRCkge1xuICAgIChvYmogYXMgQ2hpbGRQYXJ0KS5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkID8/PVxuICAgICAgbm90aWZ5Q2hpbGRQYXJ0Q29ubmVjdGVkQ2hhbmdlZDtcbiAgICAob2JqIGFzIENoaWxkUGFydCkuXyRyZXBhcmVudERpc2Nvbm5lY3RhYmxlcyA/Pz0gcmVwYXJlbnREaXNjb25uZWN0YWJsZXM7XG4gIH1cbn07XG5cbi8qKlxuICogQW4gYWJzdHJhY3QgYERpcmVjdGl2ZWAgYmFzZSBjbGFzcyB3aG9zZSBgZGlzY29ubmVjdGVkYCBtZXRob2Qgd2lsbCBiZVxuICogY2FsbGVkIHdoZW4gdGhlIHBhcnQgY29udGFpbmluZyB0aGUgZGlyZWN0aXZlIGlzIGNsZWFyZWQgYXMgYSByZXN1bHQgb2ZcbiAqIHJlLXJlbmRlcmluZywgb3Igd2hlbiB0aGUgdXNlciBjYWxscyBgcGFydC5zZXRDb25uZWN0ZWQoZmFsc2UpYCBvblxuICogYSBwYXJ0IHRoYXQgd2FzIHByZXZpb3VzbHkgcmVuZGVyZWQgY29udGFpbmluZyB0aGUgZGlyZWN0aXZlIChhcyBoYXBwZW5zXG4gKiB3aGVuIGUuZy4gYSBMaXRFbGVtZW50IGRpc2Nvbm5lY3RzIGZyb20gdGhlIERPTSkuXG4gKlxuICogSWYgYHBhcnQuc2V0Q29ubmVjdGVkKHRydWUpYCBpcyBzdWJzZXF1ZW50bHkgY2FsbGVkIG9uIGFcbiAqIGNvbnRhaW5pbmcgcGFydCwgdGhlIGRpcmVjdGl2ZSdzIGByZWNvbm5lY3RlZGAgbWV0aG9kIHdpbGwgYmUgY2FsbGVkIHByaW9yXG4gKiB0byBpdHMgbmV4dCBgdXBkYXRlYC9gcmVuZGVyYCBjYWxsYmFja3MuIFdoZW4gaW1wbGVtZW50aW5nIGBkaXNjb25uZWN0ZWRgLFxuICogYHJlY29ubmVjdGVkYCBzaG91bGQgYWxzbyBiZSBpbXBsZW1lbnRlZCB0byBiZSBjb21wYXRpYmxlIHdpdGggcmVjb25uZWN0aW9uLlxuICpcbiAqIE5vdGUgdGhhdCB1cGRhdGVzIG1heSBvY2N1ciB3aGlsZSB0aGUgZGlyZWN0aXZlIGlzIGRpc2Nvbm5lY3RlZC4gQXMgc3VjaCxcbiAqIGRpcmVjdGl2ZXMgc2hvdWxkIGdlbmVyYWxseSBjaGVjayB0aGUgYHRoaXMuaXNDb25uZWN0ZWRgIGZsYWcgZHVyaW5nXG4gKiByZW5kZXIvdXBkYXRlIHRvIGRldGVybWluZSB3aGV0aGVyIGl0IGlzIHNhZmUgdG8gc3Vic2NyaWJlIHRvIHJlc291cmNlc1xuICogdGhhdCBtYXkgcHJldmVudCBnYXJiYWdlIGNvbGxlY3Rpb24uXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBc3luY0RpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIC8vIEFzIG9wcG9zZWQgdG8gb3RoZXIgRGlzY29ubmVjdGFibGVzLCBBc3luY0RpcmVjdGl2ZXMgYWx3YXlzIGdldCBub3RpZmllZFxuICAvLyB3aGVuIHRoZSBSb290UGFydCBjb25uZWN0aW9uIGNoYW5nZXMsIHNvIHRoZSBwdWJsaWMgYGlzQ29ubmVjdGVkYFxuICAvLyBpcyBhIGxvY2FsbHkgc3RvcmVkIHZhcmlhYmxlIGluaXRpYWxpemVkIHZpYSBpdHMgcGFydCdzIGdldHRlciBhbmQgc3luY2VkXG4gIC8vIHZpYSBgXyRub3RpZnlEaXJlY3RpdmVDb25uZWN0aW9uQ2hhbmdlZGAuIFRoaXMgaXMgY2hlYXBlciB0aGFuIHVzaW5nXG4gIC8vIHRoZSBfJGlzQ29ubmVjdGVkIGdldHRlciwgd2hpY2ggaGFzIHRvIGxvb2sgYmFjayB1cCB0aGUgdHJlZSBlYWNoIHRpbWUuXG4gIC8qKlxuICAgKiBUaGUgY29ubmVjdGlvbiBzdGF0ZSBmb3IgdGhpcyBEaXJlY3RpdmUuXG4gICAqL1xuICBpc0Nvbm5lY3RlZCE6IGJvb2xlYW47XG5cbiAgLy8gQGludGVybmFsXG4gIG92ZXJyaWRlIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT4gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHRoZSBwYXJ0IHdpdGggaW50ZXJuYWwgZmllbGRzXG4gICAqIEBwYXJhbSBwYXJ0XG4gICAqIEBwYXJhbSBwYXJlbnRcbiAgICogQHBhcmFtIGF0dHJpYnV0ZUluZGV4XG4gICAqL1xuICBvdmVycmlkZSBfJGluaXRpYWxpemUoXG4gICAgcGFydDogUGFydCxcbiAgICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICAgIGF0dHJpYnV0ZUluZGV4OiBudW1iZXIgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgc3VwZXIuXyRpbml0aWFsaXplKHBhcnQsIHBhcmVudCwgYXR0cmlidXRlSW5kZXgpO1xuICAgIGFkZERpc2Nvbm5lY3RhYmxlVG9QYXJlbnQodGhpcyk7XG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IHBhcnQuXyRpc0Nvbm5lY3RlZDtcbiAgfVxuICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAvKipcbiAgICogQ2FsbGVkIGZyb20gdGhlIGNvcmUgY29kZSB3aGVuIGEgZGlyZWN0aXZlIGlzIGdvaW5nIGF3YXkgZnJvbSBhIHBhcnQgKGluXG4gICAqIHdoaWNoIGNhc2UgYHNob3VsZFJlbW92ZUZyb21QYXJlbnRgIHNob3VsZCBiZSB0cnVlKSwgYW5kIGZyb20gdGhlXG4gICAqIGBzZXRDaGlsZHJlbkNvbm5lY3RlZGAgaGVscGVyIGZ1bmN0aW9uIHdoZW4gcmVjdXJzaXZlbHkgY2hhbmdpbmcgdGhlXG4gICAqIGNvbm5lY3Rpb24gc3RhdGUgb2YgYSB0cmVlIChpbiB3aGljaCBjYXNlIGBzaG91bGRSZW1vdmVGcm9tUGFyZW50YCBzaG91bGRcbiAgICogYmUgZmFsc2UpLlxuICAgKlxuICAgKiBAcGFyYW0gaXNDb25uZWN0ZWRcbiAgICogQHBhcmFtIGlzQ2xlYXJpbmdEaXJlY3RpdmUgLSBUcnVlIHdoZW4gdGhlIGRpcmVjdGl2ZSBpdHNlbGYgaXMgYmVpbmdcbiAgICogICAgIHJlbW92ZWQ7IGZhbHNlIHdoZW4gdGhlIHRyZWUgaXMgYmVpbmcgZGlzY29ubmVjdGVkXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgb3ZlcnJpZGUgWydfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkJ10oXG4gICAgaXNDb25uZWN0ZWQ6IGJvb2xlYW4sXG4gICAgaXNDbGVhcmluZ0RpcmVjdGl2ZSA9IHRydWVcbiAgKSB7XG4gICAgaWYgKGlzQ29ubmVjdGVkICE9PSB0aGlzLmlzQ29ubmVjdGVkKSB7XG4gICAgICB0aGlzLmlzQ29ubmVjdGVkID0gaXNDb25uZWN0ZWQ7XG4gICAgICBpZiAoaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgdGhpcy5yZWNvbm5lY3RlZD8uKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmRpc2Nvbm5lY3RlZD8uKCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpc0NsZWFyaW5nRGlyZWN0aXZlKSB7XG4gICAgICBub3RpZnlDaGlsZHJlbkNvbm5lY3RlZENoYW5nZWQodGhpcywgaXNDb25uZWN0ZWQpO1xuICAgICAgcmVtb3ZlRGlzY29ubmVjdGFibGVGcm9tUGFyZW50KHRoaXMpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiB0aGUgZGlyZWN0aXZlJ3MgUGFydCBvdXRzaWRlIHRoZSBub3JtYWwgYHVwZGF0ZWAvYHJlbmRlcmBcbiAgICogbGlmZWN5Y2xlIG9mIGEgZGlyZWN0aXZlLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBzaG91bGQgbm90IGJlIGNhbGxlZCBzeW5jaHJvbm91c2x5IGZyb20gYSBkaXJlY3RpdmUncyBgdXBkYXRlYFxuICAgKiBvciBgcmVuZGVyYC5cbiAgICpcbiAgICogQHBhcmFtIGRpcmVjdGl2ZSBUaGUgZGlyZWN0aXZlIHRvIHVwZGF0ZVxuICAgKiBAcGFyYW0gdmFsdWUgVGhlIHZhbHVlIHRvIHNldFxuICAgKi9cbiAgc2V0VmFsdWUodmFsdWU6IHVua25vd24pIHtcbiAgICBpZiAoaXNTaW5nbGVFeHByZXNzaW9uKHRoaXMuX19wYXJ0IGFzIHVua25vd24gYXMgUGFydEluZm8pKSB7XG4gICAgICB0aGlzLl9fcGFydC5fJHNldFZhbHVlKHZhbHVlLCB0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gdGhpcy5fX2F0dHJpYnV0ZUluZGV4IHdpbGwgYmUgZGVmaW5lZCBpbiB0aGlzIGNhc2UsIGJ1dFxuICAgICAgLy8gYXNzZXJ0IGl0IGluIGRldiBtb2RlXG4gICAgICBpZiAoREVWX01PREUgJiYgdGhpcy5fX2F0dHJpYnV0ZUluZGV4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCB0aGlzLl9fYXR0cmlidXRlSW5kZXggdG8gYmUgYSBudW1iZXJgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5ld1ZhbHVlcyA9IFsuLi4odGhpcy5fX3BhcnQuXyRjb21taXR0ZWRWYWx1ZSBhcyBBcnJheTx1bmtub3duPildO1xuICAgICAgbmV3VmFsdWVzW3RoaXMuX19hdHRyaWJ1dGVJbmRleCFdID0gdmFsdWU7XG4gICAgICAodGhpcy5fX3BhcnQgYXMgQXR0cmlidXRlUGFydCkuXyRzZXRWYWx1ZShuZXdWYWx1ZXMsIHRoaXMsIDApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBVc2VyIGNhbGxiYWNrcyBmb3IgaW1wbGVtZW50aW5nIGxvZ2ljIHRvIHJlbGVhc2UgYW55IHJlc291cmNlcy9zdWJzY3JpcHRpb25zXG4gICAqIHRoYXQgbWF5IGhhdmUgYmVlbiByZXRhaW5lZCBieSB0aGlzIGRpcmVjdGl2ZS4gU2luY2UgZGlyZWN0aXZlcyBtYXkgYWxzbyBiZVxuICAgKiByZS1jb25uZWN0ZWQsIGByZWNvbm5lY3RlZGAgc2hvdWxkIGFsc28gYmUgaW1wbGVtZW50ZWQgdG8gcmVzdG9yZSB0aGVcbiAgICogd29ya2luZyBzdGF0ZSBvZiB0aGUgZGlyZWN0aXZlIHByaW9yIHRvIHRoZSBuZXh0IHJlbmRlci5cbiAgICovXG4gIHByb3RlY3RlZCBkaXNjb25uZWN0ZWQoKSB7fVxuICBwcm90ZWN0ZWQgcmVjb25uZWN0ZWQoKSB7fVxufVxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjEgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbi8vIE5vdGUsIHRoaXMgbW9kdWxlIGlzIG5vdCBpbmNsdWRlZCBpbiBwYWNrYWdlIGV4cG9ydHMgc28gdGhhdCBpdCdzIHByaXZhdGUgdG9cbi8vIG91ciBmaXJzdC1wYXJ0eSBkaXJlY3RpdmVzLiBJZiBpdCBlbmRzIHVwIGJlaW5nIHVzZWZ1bCwgd2UgY2FuIG9wZW4gaXQgdXAgYW5kXG4vLyBleHBvcnQgaXQuXG5cbi8qKlxuICogSGVscGVyIHRvIGl0ZXJhdGUgYW4gQXN5bmNJdGVyYWJsZSBpbiBpdHMgb3duIGNsb3N1cmUuXG4gKiBAcGFyYW0gaXRlcmFibGUgVGhlIGl0ZXJhYmxlIHRvIGl0ZXJhdGVcbiAqIEBwYXJhbSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgdG8gY2FsbCBmb3IgZWFjaCB2YWx1ZS4gSWYgdGhlIGNhbGxiYWNrIHJldHVybnNcbiAqIGBmYWxzZWAsIHRoZSBsb29wIHdpbGwgYmUgYnJva2VuLlxuICovXG5leHBvcnQgY29uc3QgZm9yQXdhaXRPZiA9IGFzeW5jIDxUPihcbiAgaXRlcmFibGU6IEFzeW5jSXRlcmFibGU8VD4sXG4gIGNhbGxiYWNrOiAodmFsdWU6IFQpID0+IFByb21pc2U8Ym9vbGVhbj5cbikgPT4ge1xuICBmb3IgYXdhaXQgKGNvbnN0IHYgb2YgaXRlcmFibGUpIHtcbiAgICBpZiAoKGF3YWl0IGNhbGxiYWNrKHYpKSA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogSG9sZHMgYSByZWZlcmVuY2UgdG8gYW4gaW5zdGFuY2UgdGhhdCBjYW4gYmUgZGlzY29ubmVjdGVkIGFuZCByZWNvbm5lY3RlZCxcbiAqIHNvIHRoYXQgYSBjbG9zdXJlIG92ZXIgdGhlIHJlZiAoZS5nLiBpbiBhIHRoZW4gZnVuY3Rpb24gdG8gYSBwcm9taXNlKSBkb2VzXG4gKiBub3Qgc3Ryb25nbHkgaG9sZCBhIHJlZiB0byB0aGUgaW5zdGFuY2UuIEFwcHJveGltYXRlcyBhIFdlYWtSZWYgYnV0IG11c3RcbiAqIGJlIG1hbnVhbGx5IGNvbm5lY3RlZCAmIGRpc2Nvbm5lY3RlZCB0byB0aGUgYmFja2luZyBpbnN0YW5jZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFBzZXVkb1dlYWtSZWY8VD4ge1xuICBwcml2YXRlIF9yZWY/OiBUO1xuICBjb25zdHJ1Y3RvcihyZWY6IFQpIHtcbiAgICB0aGlzLl9yZWYgPSByZWY7XG4gIH1cbiAgLyoqXG4gICAqIERpc2Fzc29jaWF0ZXMgdGhlIHJlZiB3aXRoIHRoZSBiYWNraW5nIGluc3RhbmNlLlxuICAgKi9cbiAgZGlzY29ubmVjdCgpIHtcbiAgICB0aGlzLl9yZWYgPSB1bmRlZmluZWQ7XG4gIH1cbiAgLyoqXG4gICAqIFJlYXNzb2NpYXRlcyB0aGUgcmVmIHdpdGggdGhlIGJhY2tpbmcgaW5zdGFuY2UuXG4gICAqL1xuICByZWNvbm5lY3QocmVmOiBUKSB7XG4gICAgdGhpcy5fcmVmID0gcmVmO1xuICB9XG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgdGhlIGJhY2tpbmcgaW5zdGFuY2UgKHdpbGwgYmUgdW5kZWZpbmVkIHdoZW4gZGlzY29ubmVjdGVkKVxuICAgKi9cbiAgZGVyZWYoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3JlZjtcbiAgfVxufVxuXG4vKipcbiAqIEEgaGVscGVyIHRvIHBhdXNlIGFuZCByZXN1bWUgd2FpdGluZyBvbiBhIGNvbmRpdGlvbiBpbiBhbiBhc3luYyBmdW5jdGlvblxuICovXG5leHBvcnQgY2xhc3MgUGF1c2VyIHtcbiAgcHJpdmF0ZSBfcHJvbWlzZT86IFByb21pc2U8dm9pZD4gPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX3Jlc29sdmU/OiAoKSA9PiB2b2lkID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogV2hlbiBwYXVzZWQsIHJldHVybnMgYSBwcm9taXNlIHRvIGJlIGF3YWl0ZWQ7IHdoZW4gdW5wYXVzZWQsIHJldHVybnNcbiAgICogdW5kZWZpbmVkLiBOb3RlIHRoYXQgaW4gdGhlIG1pY3JvdGFzayBiZXR3ZWVuIHRoZSBwYXVzZXIgYmVpbmcgcmVzdW1lZFxuICAgKiBhbiBhbiBhd2FpdCBvZiB0aGlzIHByb21pc2UgcmVzb2x2aW5nLCB0aGUgcGF1c2VyIGNvdWxkIGJlIHBhdXNlZCBhZ2FpbixcbiAgICogaGVuY2UgY2FsbGVycyBzaG91bGQgY2hlY2sgdGhlIHByb21pc2UgaW4gYSBsb29wIHdoZW4gYXdhaXRpbmcuXG4gICAqIEByZXR1cm5zIEEgcHJvbWlzZSB0byBiZSBhd2FpdGVkIHdoZW4gcGF1c2VkIG9yIHVuZGVmaW5lZFxuICAgKi9cbiAgZ2V0KCkge1xuICAgIHJldHVybiB0aGlzLl9wcm9taXNlO1xuICB9XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgcHJvbWlzZSB0byBiZSBhd2FpdGVkXG4gICAqL1xuICBwYXVzZSgpIHtcbiAgICB0aGlzLl9wcm9taXNlID8/PSBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gKHRoaXMuX3Jlc29sdmUgPSByZXNvbHZlKSk7XG4gIH1cbiAgLyoqXG4gICAqIFJlc29sdmVzIHRoZSBwcm9taXNlIHdoaWNoIG1heSBiZSBhd2FpdGVkXG4gICAqL1xuICByZXN1bWUoKSB7XG4gICAgdGhpcy5fcmVzb2x2ZT8uKCk7XG4gICAgdGhpcy5fcHJvbWlzZSA9IHRoaXMuX3Jlc29sdmUgPSB1bmRlZmluZWQ7XG4gIH1cbn1cbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0NoaWxkUGFydCwgbm9DaGFuZ2V9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7ZGlyZWN0aXZlLCBEaXJlY3RpdmVQYXJhbWV0ZXJzfSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtBc3luY0RpcmVjdGl2ZX0gZnJvbSAnLi4vYXN5bmMtZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7UGF1c2VyLCBQc2V1ZG9XZWFrUmVmLCBmb3JBd2FpdE9mfSBmcm9tICcuL3ByaXZhdGUtYXN5bmMtaGVscGVycy5qcyc7XG5cbnR5cGUgTWFwcGVyPFQ+ID0gKHY6IFQsIGluZGV4PzogbnVtYmVyKSA9PiB1bmtub3duO1xuXG5leHBvcnQgY2xhc3MgQXN5bmNSZXBsYWNlRGlyZWN0aXZlIGV4dGVuZHMgQXN5bmNEaXJlY3RpdmUge1xuICBwcml2YXRlIF9fdmFsdWU/OiBBc3luY0l0ZXJhYmxlPHVua25vd24+O1xuICBwcml2YXRlIF9fd2Vha1RoaXMgPSBuZXcgUHNldWRvV2Vha1JlZih0aGlzKTtcbiAgcHJpdmF0ZSBfX3BhdXNlciA9IG5ldyBQYXVzZXIoKTtcblxuICAvLyBAdHMtZXhwZWN0LWVycm9yIHZhbHVlIG5vdCB1c2VkLCBidXQgd2Ugd2FudCBhIG5pY2UgcGFyYW1ldGVyIGZvciBkb2NzXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgcmVuZGVyPFQ+KHZhbHVlOiBBc3luY0l0ZXJhYmxlPFQ+LCBfbWFwcGVyPzogTWFwcGVyPFQ+KSB7XG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKFxuICAgIF9wYXJ0OiBDaGlsZFBhcnQsXG4gICAgW3ZhbHVlLCBtYXBwZXJdOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+XG4gICkge1xuICAgIC8vIElmIG91ciBpbml0aWFsIHJlbmRlciBvY2N1cnMgd2hpbGUgZGlzY29ubmVjdGVkLCBlbnN1cmUgdGhhdCB0aGUgcGF1c2VyXG4gICAgLy8gYW5kIHdlYWtUaGlzIGFyZSBpbiB0aGUgZGlzY29ubmVjdGVkIHN0YXRlXG4gICAgaWYgKCF0aGlzLmlzQ29ubmVjdGVkKSB7XG4gICAgICB0aGlzLmRpc2Nvbm5lY3RlZCgpO1xuICAgIH1cbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IHNldCB1cCB0aGlzIHBhcnRpY3VsYXIgaXRlcmFibGUsIHdlIGRvbid0IG5lZWRcbiAgICAvLyB0byBkbyBhbnl0aGluZy5cbiAgICBpZiAodmFsdWUgPT09IHRoaXMuX192YWx1ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9fdmFsdWUgPSB2YWx1ZTtcbiAgICBsZXQgaSA9IDA7XG4gICAgY29uc3Qge19fd2Vha1RoaXM6IHdlYWtUaGlzLCBfX3BhdXNlcjogcGF1c2VyfSA9IHRoaXM7XG4gICAgLy8gTm90ZSwgdGhlIGNhbGxiYWNrIGF2b2lkcyBjbG9zaW5nIG92ZXIgYHRoaXNgIHNvIHRoYXQgdGhlIGRpcmVjdGl2ZVxuICAgIC8vIGNhbiBiZSBnYydlZCBiZWZvcmUgdGhlIHByb21pc2UgcmVzb2x2ZXM7IGluc3RlYWQgYHRoaXNgIGlzIHJldHJpZXZlZFxuICAgIC8vIGZyb20gYHdlYWtUaGlzYCwgd2hpY2ggY2FuIGJyZWFrIHRoZSBoYXJkIHJlZmVyZW5jZSBpbiB0aGUgY2xvc3VyZSB3aGVuXG4gICAgLy8gdGhlIGRpcmVjdGl2ZSBkaXNjb25uZWN0c1xuICAgIGZvckF3YWl0T2YodmFsdWUsIGFzeW5jICh2OiB1bmtub3duKSA9PiB7XG4gICAgICAvLyBUaGUgd2hpbGUgbG9vcCBoZXJlIGhhbmRsZXMgdGhlIGNhc2UgdGhhdCB0aGUgY29ubmVjdGlvbiBzdGF0ZVxuICAgICAgLy8gdGhyYXNoZXMsIGNhdXNpbmcgdGhlIHBhdXNlciB0byByZXN1bWUgYW5kIHRoZW4gZ2V0IHJlLXBhdXNlZFxuICAgICAgd2hpbGUgKHBhdXNlci5nZXQoKSkge1xuICAgICAgICBhd2FpdCBwYXVzZXIuZ2V0KCk7XG4gICAgICB9XG4gICAgICAvLyBJZiB0aGUgY2FsbGJhY2sgZ2V0cyBoZXJlIGFuZCB0aGVyZSBpcyBubyBgdGhpc2AsIGl0IG1lYW5zIHRoYXQgdGhlXG4gICAgICAvLyBkaXJlY3RpdmUgaGFzIGJlZW4gZGlzY29ubmVjdGVkIGFuZCBnYXJiYWdlIGNvbGxlY3RlZCBhbmQgd2UgZG9uJ3RcbiAgICAgIC8vIG5lZWQgdG8gZG8gYW55dGhpbmcgZWxzZVxuICAgICAgY29uc3QgX3RoaXMgPSB3ZWFrVGhpcy5kZXJlZigpO1xuICAgICAgaWYgKF90aGlzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gQ2hlY2sgdG8gbWFrZSBzdXJlIHRoYXQgdmFsdWUgaXMgdGhlIHN0aWxsIHRoZSBjdXJyZW50IHZhbHVlIG9mXG4gICAgICAgIC8vIHRoZSBwYXJ0LCBhbmQgaWYgbm90IGJhaWwgYmVjYXVzZSBhIG5ldyB2YWx1ZSBvd25zIHRoaXMgcGFydFxuICAgICAgICBpZiAoX3RoaXMuX192YWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBcyBhIGNvbnZlbmllbmNlLCBiZWNhdXNlIGZ1bmN0aW9uYWwtcHJvZ3JhbW1pbmctc3R5bGVcbiAgICAgICAgLy8gdHJhbnNmb3JtcyBvZiBpdGVyYWJsZXMgYW5kIGFzeW5jIGl0ZXJhYmxlcyByZXF1aXJlcyBhIGxpYnJhcnksXG4gICAgICAgIC8vIHdlIGFjY2VwdCBhIG1hcHBlciBmdW5jdGlvbi4gVGhpcyBpcyBlc3BlY2lhbGx5IGNvbnZlbmllbnQgZm9yXG4gICAgICAgIC8vIHJlbmRlcmluZyBhIHRlbXBsYXRlIGZvciBlYWNoIGl0ZW0uXG4gICAgICAgIGlmIChtYXBwZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHYgPSBtYXBwZXIodiwgaSk7XG4gICAgICAgIH1cblxuICAgICAgICBfdGhpcy5jb21taXRWYWx1ZSh2LCBpKTtcbiAgICAgICAgaSsrO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG5cbiAgLy8gT3ZlcnJpZGUgcG9pbnQgZm9yIEFzeW5jQXBwZW5kIHRvIGFwcGVuZCByYXRoZXIgdGhhbiByZXBsYWNlXG4gIHByb3RlY3RlZCBjb21taXRWYWx1ZSh2YWx1ZTogdW5rbm93biwgX2luZGV4OiBudW1iZXIpIHtcbiAgICB0aGlzLnNldFZhbHVlKHZhbHVlKTtcbiAgfVxuXG4gIG92ZXJyaWRlIGRpc2Nvbm5lY3RlZCgpIHtcbiAgICB0aGlzLl9fd2Vha1RoaXMuZGlzY29ubmVjdCgpO1xuICAgIHRoaXMuX19wYXVzZXIucGF1c2UoKTtcbiAgfVxuXG4gIG92ZXJyaWRlIHJlY29ubmVjdGVkKCkge1xuICAgIHRoaXMuX193ZWFrVGhpcy5yZWNvbm5lY3QodGhpcyk7XG4gICAgdGhpcy5fX3BhdXNlci5yZXN1bWUoKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgZGlyZWN0aXZlIHRoYXQgcmVuZGVycyB0aGUgaXRlbXMgb2YgYW4gYXN5bmMgaXRlcmFibGVbMV0sIHJlcGxhY2luZ1xuICogcHJldmlvdXMgdmFsdWVzIHdpdGggbmV3IHZhbHVlcywgc28gdGhhdCBvbmx5IG9uZSB2YWx1ZSBpcyBldmVyIHJlbmRlcmVkXG4gKiBhdCBhIHRpbWUuIFRoaXMgZGlyZWN0aXZlIG1heSBiZSB1c2VkIGluIGFueSBleHByZXNzaW9uIHR5cGUuXG4gKlxuICogQXN5bmMgaXRlcmFibGVzIGFyZSBvYmplY3RzIHdpdGggYSBgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXWAgbWV0aG9kLCB3aGljaFxuICogcmV0dXJucyBhbiBpdGVyYXRvciB3aG8ncyBgbmV4dCgpYCBtZXRob2QgcmV0dXJucyBhIFByb21pc2UuIFdoZW4gYSBuZXdcbiAqIHZhbHVlIGlzIGF2YWlsYWJsZSwgdGhlIFByb21pc2UgcmVzb2x2ZXMgYW5kIHRoZSB2YWx1ZSBpcyByZW5kZXJlZCB0byB0aGVcbiAqIFBhcnQgY29udHJvbGxlZCBieSB0aGUgZGlyZWN0aXZlLiBJZiBhbm90aGVyIHZhbHVlIG90aGVyIHRoYW4gdGhpc1xuICogZGlyZWN0aXZlIGhhcyBiZWVuIHNldCBvbiB0aGUgUGFydCwgdGhlIGl0ZXJhYmxlIHdpbGwgbm8gbG9uZ2VyIGJlIGxpc3RlbmVkXG4gKiB0byBhbmQgbmV3IHZhbHVlcyB3b24ndCBiZSB3cml0dGVuIHRvIHRoZSBQYXJ0LlxuICpcbiAqIFsxXTogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvU3RhdGVtZW50cy9mb3ItYXdhaXQuLi5vZlxuICpcbiAqIEBwYXJhbSB2YWx1ZSBBbiBhc3luYyBpdGVyYWJsZVxuICogQHBhcmFtIG1hcHBlciBBbiBvcHRpb25hbCBmdW5jdGlvbiB0aGF0IG1hcHMgZnJvbSAodmFsdWUsIGluZGV4KSB0byBhbm90aGVyXG4gKiAgICAgdmFsdWUuIFVzZWZ1bCBmb3IgZ2VuZXJhdGluZyB0ZW1wbGF0ZXMgZm9yIGVhY2ggaXRlbSBpbiB0aGUgaXRlcmFibGUuXG4gKi9cbmV4cG9ydCBjb25zdCBhc3luY1JlcGxhY2UgPSBkaXJlY3RpdmUoQXN5bmNSZXBsYWNlRGlyZWN0aXZlKTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0NoaWxkUGFydH0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmVQYXJhbWV0ZXJzLFxuICBQYXJ0SW5mbyxcbiAgUGFydFR5cGUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge0FzeW5jUmVwbGFjZURpcmVjdGl2ZX0gZnJvbSAnLi9hc3luYy1yZXBsYWNlLmpzJztcbmltcG9ydCB7XG4gIGNsZWFyUGFydCxcbiAgaW5zZXJ0UGFydCxcbiAgc2V0Q2hpbGRQYXJ0VmFsdWUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcblxuY2xhc3MgQXN5bmNBcHBlbmREaXJlY3RpdmUgZXh0ZW5kcyBBc3luY1JlcGxhY2VEaXJlY3RpdmUge1xuICBwcml2YXRlIF9fY2hpbGRQYXJ0ITogQ2hpbGRQYXJ0O1xuXG4gIC8vIE92ZXJyaWRlIEFzeW5jUmVwbGFjZSB0byBuYXJyb3cgdGhlIGFsbG93ZWQgcGFydCB0eXBlIHRvIENoaWxkUGFydCBvbmx5XG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAocGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQ0hJTEQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignYXN5bmNBcHBlbmQgY2FuIG9ubHkgYmUgdXNlZCBpbiBjaGlsZCBleHByZXNzaW9ucycpO1xuICAgIH1cbiAgfVxuXG4gIC8vIE92ZXJyaWRlIEFzeW5jUmVwbGFjZSB0byBzYXZlIHRoZSBwYXJ0IHNpbmNlIHdlIG5lZWQgdG8gYXBwZW5kIGludG8gaXRcbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IENoaWxkUGFydCwgcGFyYW1zOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgdGhpcy5fX2NoaWxkUGFydCA9IHBhcnQ7XG4gICAgcmV0dXJuIHN1cGVyLnVwZGF0ZShwYXJ0LCBwYXJhbXMpO1xuICB9XG5cbiAgLy8gT3ZlcnJpZGUgQXN5bmNSZXBsYWNlIHRvIGFwcGVuZCByYXRoZXIgdGhhbiByZXBsYWNlXG4gIHByb3RlY3RlZCBvdmVycmlkZSBjb21taXRWYWx1ZSh2YWx1ZTogdW5rbm93biwgaW5kZXg6IG51bWJlcikge1xuICAgIC8vIFdoZW4gd2UgZ2V0IHRoZSBmaXJzdCB2YWx1ZSwgY2xlYXIgdGhlIHBhcnQuIFRoaXMgbGV0cyB0aGVcbiAgICAvLyBwcmV2aW91cyB2YWx1ZSBkaXNwbGF5IHVudGlsIHdlIGNhbiByZXBsYWNlIGl0LlxuICAgIGlmIChpbmRleCA9PT0gMCkge1xuICAgICAgY2xlYXJQYXJ0KHRoaXMuX19jaGlsZFBhcnQpO1xuICAgIH1cbiAgICAvLyBDcmVhdGUgYW5kIGluc2VydCBhIG5ldyBwYXJ0IGFuZCBzZXQgaXRzIHZhbHVlIHRvIHRoZSBuZXh0IHZhbHVlXG4gICAgY29uc3QgbmV3UGFydCA9IGluc2VydFBhcnQodGhpcy5fX2NoaWxkUGFydCk7XG4gICAgc2V0Q2hpbGRQYXJ0VmFsdWUobmV3UGFydCwgdmFsdWUpO1xuICB9XG59XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCByZW5kZXJzIHRoZSBpdGVtcyBvZiBhbiBhc3luYyBpdGVyYWJsZVsxXSwgYXBwZW5kaW5nIG5ld1xuICogdmFsdWVzIGFmdGVyIHByZXZpb3VzIHZhbHVlcywgc2ltaWxhciB0byB0aGUgYnVpbHQtaW4gc3VwcG9ydCBmb3IgaXRlcmFibGVzLlxuICogVGhpcyBkaXJlY3RpdmUgaXMgdXNhYmxlIG9ubHkgaW4gY2hpbGQgZXhwcmVzc2lvbnMuXG4gKlxuICogQXN5bmMgaXRlcmFibGVzIGFyZSBvYmplY3RzIHdpdGggYSBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdIG1ldGhvZCwgd2hpY2hcbiAqIHJldHVybnMgYW4gaXRlcmF0b3Igd2hvJ3MgYG5leHQoKWAgbWV0aG9kIHJldHVybnMgYSBQcm9taXNlLiBXaGVuIGEgbmV3XG4gKiB2YWx1ZSBpcyBhdmFpbGFibGUsIHRoZSBQcm9taXNlIHJlc29sdmVzIGFuZCB0aGUgdmFsdWUgaXMgYXBwZW5kZWQgdG8gdGhlXG4gKiBQYXJ0IGNvbnRyb2xsZWQgYnkgdGhlIGRpcmVjdGl2ZS4gSWYgYW5vdGhlciB2YWx1ZSBvdGhlciB0aGFuIHRoaXNcbiAqIGRpcmVjdGl2ZSBoYXMgYmVlbiBzZXQgb24gdGhlIFBhcnQsIHRoZSBpdGVyYWJsZSB3aWxsIG5vIGxvbmdlciBiZSBsaXN0ZW5lZFxuICogdG8gYW5kIG5ldyB2YWx1ZXMgd29uJ3QgYmUgd3JpdHRlbiB0byB0aGUgUGFydC5cbiAqXG4gKiBbMV06IGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL1N0YXRlbWVudHMvZm9yLWF3YWl0Li4ub2ZcbiAqXG4gKiBAcGFyYW0gdmFsdWUgQW4gYXN5bmMgaXRlcmFibGVcbiAqIEBwYXJhbSBtYXBwZXIgQW4gb3B0aW9uYWwgZnVuY3Rpb24gdGhhdCBtYXBzIGZyb20gKHZhbHVlLCBpbmRleCkgdG8gYW5vdGhlclxuICogICAgIHZhbHVlLiBVc2VmdWwgZm9yIGdlbmVyYXRpbmcgdGVtcGxhdGVzIGZvciBlYWNoIGl0ZW0gaW4gdGhlIGl0ZXJhYmxlLlxuICovXG5leHBvcnQgY29uc3QgYXN5bmNBcHBlbmQgPSBkaXJlY3RpdmUoQXN5bmNBcHBlbmREaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge0FzeW5jQXBwZW5kRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge1xuICBUZW1wbGF0ZVJlc3VsdCxcbiAgQ2hpbGRQYXJ0LFxuICBSb290UGFydCxcbiAgcmVuZGVyLFxuICBub3RoaW5nLFxufSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBkaXJlY3RpdmUsXG4gIERpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbiAgUGFydEluZm8sXG59IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge1xuICBjbGVhclBhcnQsXG4gIGdldENvbW1pdHRlZFZhbHVlLFxuICBpbnNlcnRQYXJ0LFxuICBpc1RlbXBsYXRlUmVzdWx0LFxuICBzZXRDb21taXR0ZWRWYWx1ZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuXG5jbGFzcyBDYWNoZURpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX3RlbXBsYXRlQ2FjaGUgPSBuZXcgV2Vha01hcDxUZW1wbGF0ZVN0cmluZ3NBcnJheSwgUm9vdFBhcnQ+KCk7XG4gIHByaXZhdGUgX3ZhbHVlPzogVGVtcGxhdGVSZXN1bHQ7XG5cbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICB9XG5cbiAgcmVuZGVyKHY6IHVua25vd24pIHtcbiAgICAvLyBSZXR1cm4gYW4gYXJyYXkgb2YgdGhlIHZhbHVlIHRvIGluZHVjZSBsaXQtaHRtbCB0byBjcmVhdGUgYSBDaGlsZFBhcnRcbiAgICAvLyBmb3IgdGhlIHZhbHVlIHRoYXQgd2UgY2FuIG1vdmUgaW50byB0aGUgY2FjaGUuXG4gICAgcmV0dXJuIFt2XTtcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShjb250YWluZXJQYXJ0OiBDaGlsZFBhcnQsIFt2XTogRGlyZWN0aXZlUGFyYW1ldGVyczx0aGlzPikge1xuICAgIC8vIElmIHRoZSBwcmV2aW91cyB2YWx1ZSBpcyBhIFRlbXBsYXRlUmVzdWx0IGFuZCB0aGUgbmV3IHZhbHVlIGlzIG5vdCxcbiAgICAvLyBvciBpcyBhIGRpZmZlcmVudCBUZW1wbGF0ZSBhcyB0aGUgcHJldmlvdXMgdmFsdWUsIG1vdmUgdGhlIGNoaWxkIHBhcnRcbiAgICAvLyBpbnRvIHRoZSBjYWNoZS5cbiAgICBpZiAoXG4gICAgICBpc1RlbXBsYXRlUmVzdWx0KHRoaXMuX3ZhbHVlKSAmJlxuICAgICAgKCFpc1RlbXBsYXRlUmVzdWx0KHYpIHx8IHRoaXMuX3ZhbHVlLnN0cmluZ3MgIT09IHYuc3RyaW5ncylcbiAgICApIHtcbiAgICAgIC8vIFRoaXMgaXMgYWx3YXlzIGFuIGFycmF5IGJlY2F1c2Ugd2UgcmV0dXJuIFt2XSBpbiByZW5kZXIoKVxuICAgICAgY29uc3QgcGFydFZhbHVlID0gZ2V0Q29tbWl0dGVkVmFsdWUoY29udGFpbmVyUGFydCkgYXMgQXJyYXk8Q2hpbGRQYXJ0PjtcbiAgICAgIGNvbnN0IGNoaWxkUGFydCA9IHBhcnRWYWx1ZS5wb3AoKSE7XG4gICAgICBsZXQgY2FjaGVkQ29udGFpbmVyUGFydCA9IHRoaXMuX3RlbXBsYXRlQ2FjaGUuZ2V0KHRoaXMuX3ZhbHVlLnN0cmluZ3MpO1xuICAgICAgaWYgKGNhY2hlZENvbnRhaW5lclBhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb25zdCBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgY2FjaGVkQ29udGFpbmVyUGFydCA9IHJlbmRlcihub3RoaW5nLCBmcmFnbWVudCk7XG4gICAgICAgIGNhY2hlZENvbnRhaW5lclBhcnQuc2V0Q29ubmVjdGVkKGZhbHNlKTtcbiAgICAgICAgdGhpcy5fdGVtcGxhdGVDYWNoZS5zZXQodGhpcy5fdmFsdWUuc3RyaW5ncywgY2FjaGVkQ29udGFpbmVyUGFydCk7XG4gICAgICB9XG4gICAgICAvLyBNb3ZlIGludG8gY2FjaGVcbiAgICAgIHNldENvbW1pdHRlZFZhbHVlKGNhY2hlZENvbnRhaW5lclBhcnQsIFtjaGlsZFBhcnRdKTtcbiAgICAgIGluc2VydFBhcnQoY2FjaGVkQ29udGFpbmVyUGFydCwgdW5kZWZpbmVkLCBjaGlsZFBhcnQpO1xuICAgIH1cbiAgICAvLyBJZiB0aGUgbmV3IHZhbHVlIGlzIGEgVGVtcGxhdGVSZXN1bHQgYW5kIHRoZSBwcmV2aW91cyB2YWx1ZSBpcyBub3QsXG4gICAgLy8gb3IgaXMgYSBkaWZmZXJlbnQgVGVtcGxhdGUgYXMgdGhlIHByZXZpb3VzIHZhbHVlLCByZXN0b3JlIHRoZSBjaGlsZFxuICAgIC8vIHBhcnQgZnJvbSB0aGUgY2FjaGUuXG4gICAgaWYgKGlzVGVtcGxhdGVSZXN1bHQodikpIHtcbiAgICAgIGlmICghaXNUZW1wbGF0ZVJlc3VsdCh0aGlzLl92YWx1ZSkgfHwgdGhpcy5fdmFsdWUuc3RyaW5ncyAhPT0gdi5zdHJpbmdzKSB7XG4gICAgICAgIGNvbnN0IGNhY2hlZENvbnRhaW5lclBhcnQgPSB0aGlzLl90ZW1wbGF0ZUNhY2hlLmdldCh2LnN0cmluZ3MpO1xuICAgICAgICBpZiAoY2FjaGVkQ29udGFpbmVyUGFydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FjaGVkIHBhcnQgYmFjayBpbnRvIHRoZSBjb250YWluZXIgcGFydCB2YWx1ZVxuICAgICAgICAgIGNvbnN0IHBhcnRWYWx1ZSA9IGdldENvbW1pdHRlZFZhbHVlKFxuICAgICAgICAgICAgY2FjaGVkQ29udGFpbmVyUGFydFxuICAgICAgICAgICkgYXMgQXJyYXk8Q2hpbGRQYXJ0PjtcbiAgICAgICAgICBjb25zdCBjYWNoZWRQYXJ0ID0gcGFydFZhbHVlLnBvcCgpITtcbiAgICAgICAgICAvLyBNb3ZlIGNhY2hlZCBwYXJ0IGJhY2sgaW50byBET01cbiAgICAgICAgICBjbGVhclBhcnQoY29udGFpbmVyUGFydCk7XG4gICAgICAgICAgaW5zZXJ0UGFydChjb250YWluZXJQYXJ0LCB1bmRlZmluZWQsIGNhY2hlZFBhcnQpO1xuICAgICAgICAgIHNldENvbW1pdHRlZFZhbHVlKGNvbnRhaW5lclBhcnQsIFtjYWNoZWRQYXJ0XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuX3ZhbHVlID0gdjtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fdmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlbmRlcih2KTtcbiAgfVxufVxuXG4vKipcbiAqIEVuYWJsZXMgZmFzdCBzd2l0Y2hpbmcgYmV0d2VlbiBtdWx0aXBsZSB0ZW1wbGF0ZXMgYnkgY2FjaGluZyB0aGUgRE9NIG5vZGVzXG4gKiBhbmQgVGVtcGxhdGVJbnN0YW5jZXMgcHJvZHVjZWQgYnkgdGhlIHRlbXBsYXRlcy5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBsZXQgY2hlY2tlZCA9IGZhbHNlO1xuICpcbiAqIGh0bWxgXG4gKiAgICR7Y2FjaGUoY2hlY2tlZCA/IGh0bWxgaW5wdXQgaXMgY2hlY2tlZGAgOiBodG1sYGlucHV0IGlzIG5vdCBjaGVja2VkYCl9XG4gKiBgXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGNhY2hlID0gZGlyZWN0aXZlKENhY2hlRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtDYWNoZURpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtBdHRyaWJ1dGVQYXJ0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmUsXG4gIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG4gIFBhcnRJbmZvLFxuICBQYXJ0VHlwZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcblxuLyoqXG4gKiBBIGtleS12YWx1ZSBzZXQgb2YgY2xhc3MgbmFtZXMgdG8gdHJ1dGh5IHZhbHVlcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDbGFzc0luZm8ge1xuICByZWFkb25seSBbbmFtZTogc3RyaW5nXTogc3RyaW5nIHwgYm9vbGVhbiB8IG51bWJlcjtcbn1cblxuY2xhc3MgQ2xhc3NNYXBEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICAvKipcbiAgICogU3RvcmVzIHRoZSBDbGFzc0luZm8gb2JqZWN0IGFwcGxpZWQgdG8gYSBnaXZlbiBBdHRyaWJ1dGVQYXJ0LlxuICAgKiBVc2VkIHRvIHVuc2V0IGV4aXN0aW5nIHZhbHVlcyB3aGVuIGEgbmV3IENsYXNzSW5mbyBvYmplY3QgaXMgYXBwbGllZC5cbiAgICovXG4gIHByaXZhdGUgX3ByZXZpb3VzQ2xhc3Nlcz86IFNldDxzdHJpbmc+O1xuICBwcml2YXRlIF9zdGF0aWNDbGFzc2VzPzogU2V0PHN0cmluZz47XG5cbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICAgIGlmIChcbiAgICAgIHBhcnRJbmZvLnR5cGUgIT09IFBhcnRUeXBlLkFUVFJJQlVURSB8fFxuICAgICAgcGFydEluZm8ubmFtZSAhPT0gJ2NsYXNzJyB8fFxuICAgICAgKHBhcnRJbmZvLnN0cmluZ3M/Lmxlbmd0aCBhcyBudW1iZXIpID4gMlxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnYGNsYXNzTWFwKClgIGNhbiBvbmx5IGJlIHVzZWQgaW4gdGhlIGBjbGFzc2AgYXR0cmlidXRlICcgK1xuICAgICAgICAgICdhbmQgbXVzdCBiZSB0aGUgb25seSBwYXJ0IGluIHRoZSBhdHRyaWJ1dGUuJ1xuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXIoY2xhc3NJbmZvOiBDbGFzc0luZm8pIHtcbiAgICAvLyBBZGQgc3BhY2VzIHRvIGVuc3VyZSBzZXBhcmF0aW9uIGZyb20gc3RhdGljIGNsYXNzZXNcbiAgICByZXR1cm4gKFxuICAgICAgJyAnICtcbiAgICAgIE9iamVjdC5rZXlzKGNsYXNzSW5mbylcbiAgICAgICAgLmZpbHRlcigoa2V5KSA9PiBjbGFzc0luZm9ba2V5XSlcbiAgICAgICAgLmpvaW4oJyAnKSArXG4gICAgICAnICdcbiAgICApO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IEF0dHJpYnV0ZVBhcnQsIFtjbGFzc0luZm9dOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgLy8gUmVtZW1iZXIgZHluYW1pYyBjbGFzc2VzIG9uIHRoZSBmaXJzdCByZW5kZXJcbiAgICBpZiAodGhpcy5fcHJldmlvdXNDbGFzc2VzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX3ByZXZpb3VzQ2xhc3NlcyA9IG5ldyBTZXQoKTtcbiAgICAgIGlmIChwYXJ0LnN0cmluZ3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9zdGF0aWNDbGFzc2VzID0gbmV3IFNldChcbiAgICAgICAgICBwYXJ0LnN0cmluZ3NcbiAgICAgICAgICAgIC5qb2luKCcgJylcbiAgICAgICAgICAgIC5zcGxpdCgvXFxzLylcbiAgICAgICAgICAgIC5maWx0ZXIoKHMpID0+IHMgIT09ICcnKVxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBuYW1lIGluIGNsYXNzSW5mbykge1xuICAgICAgICBpZiAoY2xhc3NJbmZvW25hbWVdICYmICF0aGlzLl9zdGF0aWNDbGFzc2VzPy5oYXMobmFtZSkpIHtcbiAgICAgICAgICB0aGlzLl9wcmV2aW91c0NsYXNzZXMuYWRkKG5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5yZW5kZXIoY2xhc3NJbmZvKTtcbiAgICB9XG5cbiAgICBjb25zdCBjbGFzc0xpc3QgPSBwYXJ0LmVsZW1lbnQuY2xhc3NMaXN0O1xuXG4gICAgLy8gUmVtb3ZlIG9sZCBjbGFzc2VzIHRoYXQgbm8gbG9uZ2VyIGFwcGx5XG4gICAgLy8gV2UgdXNlIGZvckVhY2goKSBpbnN0ZWFkIG9mIGZvci1vZiBzbyB0aGF0IHdlIGRvbid0IHJlcXVpcmUgZG93bi1sZXZlbFxuICAgIC8vIGl0ZXJhdGlvbi5cbiAgICB0aGlzLl9wcmV2aW91c0NsYXNzZXMuZm9yRWFjaCgobmFtZSkgPT4ge1xuICAgICAgaWYgKCEobmFtZSBpbiBjbGFzc0luZm8pKSB7XG4gICAgICAgIGNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgICAgIHRoaXMuX3ByZXZpb3VzQ2xhc3NlcyEuZGVsZXRlKG5hbWUpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQWRkIG9yIHJlbW92ZSBjbGFzc2VzIGJhc2VkIG9uIHRoZWlyIGNsYXNzTWFwIHZhbHVlXG4gICAgZm9yIChjb25zdCBuYW1lIGluIGNsYXNzSW5mbykge1xuICAgICAgLy8gV2UgZXhwbGljaXRseSB3YW50IGEgbG9vc2UgdHJ1dGh5IGNoZWNrIG9mIGB2YWx1ZWAgYmVjYXVzZSBpdCBzZWVtc1xuICAgICAgLy8gbW9yZSBjb252ZW5pZW50IHRoYXQgJycgYW5kIDAgYXJlIHNraXBwZWQuXG4gICAgICBjb25zdCB2YWx1ZSA9ICEhY2xhc3NJbmZvW25hbWVdO1xuICAgICAgaWYgKFxuICAgICAgICB2YWx1ZSAhPT0gdGhpcy5fcHJldmlvdXNDbGFzc2VzLmhhcyhuYW1lKSAmJlxuICAgICAgICAhdGhpcy5fc3RhdGljQ2xhc3Nlcz8uaGFzKG5hbWUpXG4gICAgICApIHtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgY2xhc3NMaXN0LmFkZChuYW1lKTtcbiAgICAgICAgICB0aGlzLl9wcmV2aW91c0NsYXNzZXMuYWRkKG5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgICAgICAgdGhpcy5fcHJldmlvdXNDbGFzc2VzLmRlbGV0ZShuYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGRpcmVjdGl2ZSB0aGF0IGFwcGxpZXMgZHluYW1pYyBDU1MgY2xhc3Nlcy5cbiAqXG4gKiBUaGlzIG11c3QgYmUgdXNlZCBpbiB0aGUgYGNsYXNzYCBhdHRyaWJ1dGUgYW5kIG11c3QgYmUgdGhlIG9ubHkgcGFydCB1c2VkIGluXG4gKiB0aGUgYXR0cmlidXRlLiBJdCB0YWtlcyBlYWNoIHByb3BlcnR5IGluIHRoZSBgY2xhc3NJbmZvYCBhcmd1bWVudCBhbmQgYWRkc1xuICogdGhlIHByb3BlcnR5IG5hbWUgdG8gdGhlIGVsZW1lbnQncyBgY2xhc3NMaXN0YCBpZiB0aGUgcHJvcGVydHkgdmFsdWUgaXNcbiAqIHRydXRoeTsgaWYgdGhlIHByb3BlcnR5IHZhbHVlIGlzIGZhbHNleSwgdGhlIHByb3BlcnR5IG5hbWUgaXMgcmVtb3ZlZCBmcm9tXG4gKiB0aGUgZWxlbWVudCdzIGBjbGFzc2AuXG4gKlxuICogRm9yIGV4YW1wbGUgYHtmb286IGJhcn1gIGFwcGxpZXMgdGhlIGNsYXNzIGBmb29gIGlmIHRoZSB2YWx1ZSBvZiBgYmFyYCBpc1xuICogdHJ1dGh5LlxuICpcbiAqIEBwYXJhbSBjbGFzc0luZm9cbiAqL1xuZXhwb3J0IGNvbnN0IGNsYXNzTWFwID0gZGlyZWN0aXZlKENsYXNzTWFwRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtDbGFzc01hcERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtub0NoYW5nZSwgUGFydH0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIERpcmVjdGl2ZSwgRGlyZWN0aXZlUGFyYW1ldGVyc30gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcblxuLy8gQSBzZW50aW5hbCB0aGF0IGluZGljYXRlcyBndWFyZCgpIGhhc24ndCByZW5kZXJlZCBhbnl0aGluZyB5ZXRcbmNvbnN0IGluaXRpYWxWYWx1ZSA9IHt9O1xuXG5jbGFzcyBHdWFyZERpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX3ByZXZpb3VzVmFsdWU6IHVua25vd24gPSBpbml0aWFsVmFsdWU7XG5cbiAgcmVuZGVyKF92YWx1ZTogdW5rbm93biwgZjogKCkgPT4gdW5rbm93bikge1xuICAgIHJldHVybiBmKCk7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUoX3BhcnQ6IFBhcnQsIFt2YWx1ZSwgZl06IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIC8vIERpcnR5LWNoZWNrIGFycmF5cyBieSBpdGVtXG4gICAgICBpZiAoXG4gICAgICAgIEFycmF5LmlzQXJyYXkodGhpcy5fcHJldmlvdXNWYWx1ZSkgJiZcbiAgICAgICAgdGhpcy5fcHJldmlvdXNWYWx1ZS5sZW5ndGggPT09IHZhbHVlLmxlbmd0aCAmJlxuICAgICAgICB2YWx1ZS5ldmVyeSgodiwgaSkgPT4gdiA9PT0gKHRoaXMuX3ByZXZpb3VzVmFsdWUgYXMgQXJyYXk8dW5rbm93bj4pW2ldKVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRoaXMuX3ByZXZpb3VzVmFsdWUgPT09IHZhbHVlKSB7XG4gICAgICAvLyBEaXJ0eS1jaGVjayBub24tYXJyYXlzIGJ5IGlkZW50aXR5XG4gICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgfVxuXG4gICAgLy8gQ29weSB0aGUgdmFsdWUgaWYgaXQncyBhbiBhcnJheSBzbyB0aGF0IGlmIGl0J3MgbXV0YXRlZCB3ZSBkb24ndCBmb3JnZXRcbiAgICAvLyB3aGF0IHRoZSBwcmV2aW91cyB2YWx1ZXMgd2VyZS5cbiAgICB0aGlzLl9wcmV2aW91c1ZhbHVlID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyBBcnJheS5mcm9tKHZhbHVlKSA6IHZhbHVlO1xuICAgIGNvbnN0IHIgPSB0aGlzLnJlbmRlcih2YWx1ZSwgZik7XG4gICAgcmV0dXJuIHI7XG4gIH1cbn1cblxuLyoqXG4gKiBQcmV2ZW50cyByZS1yZW5kZXIgb2YgYSB0ZW1wbGF0ZSBmdW5jdGlvbiB1bnRpbCBhIHNpbmdsZSB2YWx1ZSBvciBhbiBhcnJheSBvZlxuICogdmFsdWVzIGNoYW5nZXMuXG4gKlxuICogVmFsdWVzIGFyZSBjaGVja2VkIGFnYWluc3QgcHJldmlvdXMgdmFsdWVzIHdpdGggc3RyaWN0IGVxdWFsaXR5IChgPT09YCksIGFuZFxuICogc28gdGhlIGNoZWNrIHdvbid0IGRldGVjdCBuZXN0ZWQgcHJvcGVydHkgY2hhbmdlcyBpbnNpZGUgb2JqZWN0cyBvciBhcnJheXMuXG4gKiBBcnJheXMgdmFsdWVzIGhhdmUgZWFjaCBpdGVtIGNoZWNrZWQgYWdhaW5zdCB0aGUgcHJldmlvdXMgdmFsdWUgYXQgdGhlIHNhbWVcbiAqIGluZGV4IHdpdGggc3RyaWN0IGVxdWFsaXR5LiBOZXN0ZWQgYXJyYXlzIGFyZSBhbHNvIGNoZWNrZWQgb25seSBieSBzdHJpY3RcbiAqIGVxdWFsaXR5LlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogYGBganNcbiAqIGh0bWxgXG4gKiAgIDxkaXY+XG4gKiAgICAgJHtndWFyZChbdXNlci5pZCwgY29tcGFueS5pZF0sICgpID0+IGh0bWxgLi4uYCl9XG4gKiAgIDwvZGl2PlxuICogYFxuICogYGBgXG4gKlxuICogSW4gdGhpcyBjYXNlLCB0aGUgdGVtcGxhdGUgb25seSByZXJlbmRlcnMgaWYgZWl0aGVyIGB1c2VyLmlkYCBvciBgY29tcGFueS5pZGBcbiAqIGNoYW5nZXMuXG4gKlxuICogZ3VhcmQoKSBpcyB1c2VmdWwgd2l0aCBpbW11dGFibGUgZGF0YSBwYXR0ZXJucywgYnkgcHJldmVudGluZyBleHBlbnNpdmUgd29ya1xuICogdW50aWwgZGF0YSB1cGRhdGVzLlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogYGBganNcbiAqIGh0bWxgXG4gKiAgIDxkaXY+XG4gKiAgICAgJHtndWFyZChbaW1tdXRhYmxlSXRlbXNdLCAoKSA9PiBpbW11dGFibGVJdGVtcy5tYXAoaSA9PiBodG1sYCR7aX1gKSl9XG4gKiAgIDwvZGl2PlxuICogYFxuICogYGBgXG4gKlxuICogSW4gdGhpcyBjYXNlLCBpdGVtcyBhcmUgbWFwcGVkIG92ZXIgb25seSB3aGVuIHRoZSBhcnJheSByZWZlcmVuY2UgY2hhbmdlcy5cbiAqXG4gKiBAcGFyYW0gdmFsdWUgdGhlIHZhbHVlIHRvIGNoZWNrIGJlZm9yZSByZS1yZW5kZXJpbmdcbiAqIEBwYXJhbSBmIHRoZSB0ZW1wbGF0ZSBmdW5jdGlvblxuICovXG5leHBvcnQgY29uc3QgZ3VhcmQgPSBkaXJlY3RpdmUoR3VhcmREaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge0d1YXJkRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge25vdGhpbmd9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcblxuLyoqXG4gKiBGb3IgQXR0cmlidXRlUGFydHMsIHNldHMgdGhlIGF0dHJpYnV0ZSBpZiB0aGUgdmFsdWUgaXMgZGVmaW5lZCBhbmQgcmVtb3Zlc1xuICogdGhlIGF0dHJpYnV0ZSBpZiB0aGUgdmFsdWUgaXMgdW5kZWZpbmVkLlxuICpcbiAqIEZvciBvdGhlciBwYXJ0IHR5cGVzLCB0aGlzIGRpcmVjdGl2ZSBpcyBhIG5vLW9wLlxuICovXG5leHBvcnQgY29uc3QgaWZEZWZpbmVkID0gPFQ+KHZhbHVlOiBUKSA9PiB2YWx1ZSA/PyBub3RoaW5nO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjAgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7QXR0cmlidXRlUGFydCwgbm9DaGFuZ2UsIG5vdGhpbmd9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7XG4gIGRpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlLFxuICBEaXJlY3RpdmVQYXJhbWV0ZXJzLFxuICBQYXJ0SW5mbyxcbiAgUGFydFR5cGUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge2lzU2luZ2xlRXhwcmVzc2lvbiwgc2V0Q29tbWl0dGVkVmFsdWV9IGZyb20gJy4uL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcblxuY2xhc3MgTGl2ZURpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAoXG4gICAgICAhKFxuICAgICAgICBwYXJ0SW5mby50eXBlID09PSBQYXJ0VHlwZS5QUk9QRVJUWSB8fFxuICAgICAgICBwYXJ0SW5mby50eXBlID09PSBQYXJ0VHlwZS5BVFRSSUJVVEUgfHxcbiAgICAgICAgcGFydEluZm8udHlwZSA9PT0gUGFydFR5cGUuQk9PTEVBTl9BVFRSSUJVVEVcbiAgICAgIClcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1RoZSBgbGl2ZWAgZGlyZWN0aXZlIGlzIG5vdCBhbGxvd2VkIG9uIGNoaWxkIG9yIGV2ZW50IGJpbmRpbmdzJ1xuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKCFpc1NpbmdsZUV4cHJlc3Npb24ocGFydEluZm8pKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2BsaXZlYCBiaW5kaW5ncyBjYW4gb25seSBjb250YWluIGEgc2luZ2xlIGV4cHJlc3Npb24nKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXIodmFsdWU6IHVua25vd24pIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUocGFydDogQXR0cmlidXRlUGFydCwgW3ZhbHVlXTogRGlyZWN0aXZlUGFyYW1ldGVyczx0aGlzPikge1xuICAgIGlmICh2YWx1ZSA9PT0gbm9DaGFuZ2UgfHwgdmFsdWUgPT09IG5vdGhpbmcpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgY29uc3QgZWxlbWVudCA9IHBhcnQuZWxlbWVudDtcbiAgICBjb25zdCBuYW1lID0gcGFydC5uYW1lO1xuXG4gICAgaWYgKHBhcnQudHlwZSA9PT0gUGFydFR5cGUuUFJPUEVSVFkpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICBpZiAodmFsdWUgPT09IChlbGVtZW50IGFzIGFueSlbbmFtZV0pIHtcbiAgICAgICAgcmV0dXJuIG5vQ2hhbmdlO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocGFydC50eXBlID09PSBQYXJ0VHlwZS5CT09MRUFOX0FUVFJJQlVURSkge1xuICAgICAgaWYgKCEhdmFsdWUgPT09IGVsZW1lbnQuaGFzQXR0cmlidXRlKG5hbWUpKSB7XG4gICAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHBhcnQudHlwZSA9PT0gUGFydFR5cGUuQVRUUklCVVRFKSB7XG4gICAgICBpZiAoZWxlbWVudC5nZXRBdHRyaWJ1dGUobmFtZSkgPT09IFN0cmluZyh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIG5vQ2hhbmdlO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBSZXNldHMgdGhlIHBhcnQncyB2YWx1ZSwgY2F1c2luZyBpdHMgZGlydHktY2hlY2sgdG8gZmFpbCBzbyB0aGF0IGl0XG4gICAgLy8gYWx3YXlzIHNldHMgdGhlIHZhbHVlLlxuICAgIHNldENvbW1pdHRlZFZhbHVlKHBhcnQpO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxufVxuXG4vKipcbiAqIENoZWNrcyBiaW5kaW5nIHZhbHVlcyBhZ2FpbnN0IGxpdmUgRE9NIHZhbHVlcywgaW5zdGVhZCBvZiBwcmV2aW91c2x5IGJvdW5kXG4gKiB2YWx1ZXMsIHdoZW4gZGV0ZXJtaW5pbmcgd2hldGhlciB0byB1cGRhdGUgdGhlIHZhbHVlLlxuICpcbiAqIFRoaXMgaXMgdXNlZnVsIGZvciBjYXNlcyB3aGVyZSB0aGUgRE9NIHZhbHVlIG1heSBjaGFuZ2UgZnJvbSBvdXRzaWRlIG9mXG4gKiBsaXQtaHRtbCwgc3VjaCBhcyB3aXRoIGEgYmluZGluZyB0byBhbiBgPGlucHV0PmAgZWxlbWVudCdzIGB2YWx1ZWAgcHJvcGVydHksXG4gKiBhIGNvbnRlbnQgZWRpdGFibGUgZWxlbWVudHMgdGV4dCwgb3IgdG8gYSBjdXN0b20gZWxlbWVudCB0aGF0IGNoYW5nZXMgaXQnc1xuICogb3duIHByb3BlcnRpZXMgb3IgYXR0cmlidXRlcy5cbiAqXG4gKiBJbiB0aGVzZSBjYXNlcyBpZiB0aGUgRE9NIHZhbHVlIGNoYW5nZXMsIGJ1dCB0aGUgdmFsdWUgc2V0IHRocm91Z2ggbGl0LWh0bWxcbiAqIGJpbmRpbmdzIGhhc24ndCwgbGl0LWh0bWwgd29uJ3Qga25vdyB0byB1cGRhdGUgdGhlIERPTSB2YWx1ZSBhbmQgd2lsbCBsZWF2ZVxuICogaXQgYWxvbmUuIElmIHRoaXMgaXMgbm90IHdoYXQgeW91IHdhbnQtLWlmIHlvdSB3YW50IHRvIG92ZXJ3cml0ZSB0aGUgRE9NXG4gKiB2YWx1ZSB3aXRoIHRoZSBib3VuZCB2YWx1ZSBubyBtYXR0ZXIgd2hhdC0tdXNlIHRoZSBgbGl2ZSgpYCBkaXJlY3RpdmU6XG4gKlxuICogYGBganNcbiAqIGh0bWxgPGlucHV0IC52YWx1ZT0ke2xpdmUoeCl9PmBcbiAqIGBgYFxuICpcbiAqIGBsaXZlKClgIHBlcmZvcm1zIGEgc3RyaWN0IGVxdWFsaXR5IGNoZWNrIGFnYWlucyB0aGUgbGl2ZSBET00gdmFsdWUsIGFuZCBpZlxuICogdGhlIG5ldyB2YWx1ZSBpcyBlcXVhbCB0byB0aGUgbGl2ZSB2YWx1ZSwgZG9lcyBub3RoaW5nLiBUaGlzIG1lYW5zIHRoYXRcbiAqIGBsaXZlKClgIHNob3VsZCBub3QgYmUgdXNlZCB3aGVuIHRoZSBiaW5kaW5nIHdpbGwgY2F1c2UgYSB0eXBlIGNvbnZlcnNpb24uIElmXG4gKiB5b3UgdXNlIGBsaXZlKClgIHdpdGggYW4gYXR0cmlidXRlIGJpbmRpbmcsIG1ha2Ugc3VyZSB0aGF0IG9ubHkgc3RyaW5ncyBhcmVcbiAqIHBhc3NlZCBpbiwgb3IgdGhlIGJpbmRpbmcgd2lsbCB1cGRhdGUgZXZlcnkgcmVuZGVyLlxuICovXG5leHBvcnQgY29uc3QgbGl2ZSA9IGRpcmVjdGl2ZShMaXZlRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtMaXZlRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuaW1wb3J0IHtub3RoaW5nLCBFbGVtZW50UGFydH0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIEFzeW5jRGlyZWN0aXZlfSBmcm9tICcuLi9hc3luYy1kaXJlY3RpdmUuanMnO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgUmVmIG9iamVjdCwgd2hpY2ggaXMgY29udGFpbmVyIGZvciBhIHJlZmVyZW5jZSB0byBhbiBlbGVtZW50LlxuICovXG5leHBvcnQgY29uc3QgY3JlYXRlUmVmID0gPFQgPSBFbGVtZW50PigpID0+IG5ldyBSZWY8VD4oKTtcblxuLyoqXG4gKiBBbiBvYmplY3QgdGhhdCBob2xkcyBhIHJlZiB2YWx1ZS5cbiAqL1xuY2xhc3MgUmVmPFQgPSBFbGVtZW50PiB7XG4gIC8qKlxuICAgKiBUaGUgY3VycmVudCBFbGVtZW50IHZhbHVlIG9mIHRoZSByZWYsIG9yIGVsc2UgYHVuZGVmaW5lZGAgaWYgdGhlIHJlZiBpcyBub1xuICAgKiBsb25nZXIgcmVuZGVyZWQuXG4gICAqL1xuICByZWFkb25seSB2YWx1ZT86IFQ7XG59XG5cbmV4cG9ydCB0eXBlIHtSZWZ9O1xuXG5pbnRlcmZhY2UgUmVmSW50ZXJuYWwge1xuICB2YWx1ZTogRWxlbWVudCB8IHVuZGVmaW5lZDtcbn1cblxuLy8gV2hlbiBjYWxsYmFja3MgYXJlIHVzZWQgZm9yIHJlZnMsIHRoaXMgbWFwIHRyYWNrcyB0aGUgbGFzdCB2YWx1ZSB0aGUgY2FsbGJhY2tcbi8vIHdhcyBjYWxsZWQgd2l0aCwgZm9yIGVuc3VyaW5nIGEgZGlyZWN0aXZlIGRvZXNuJ3QgY2xlYXIgdGhlIHJlZiBpZiB0aGUgcmVmXG4vLyBoYXMgYWxyZWFkeSBiZWVuIHJlbmRlcmVkIHRvIGEgbmV3IHNwb3RcbmNvbnN0IGxhc3RFbGVtZW50Rm9yQ2FsbGJhY2s6IFdlYWtNYXA8RnVuY3Rpb24sIEVsZW1lbnQgfCB1bmRlZmluZWQ+ID1cbiAgbmV3IFdlYWtNYXAoKTtcblxuZXhwb3J0IHR5cGUgUmVmT3JDYWxsYmFjayA9IFJlZiB8ICgoZWw6IEVsZW1lbnQgfCB1bmRlZmluZWQpID0+IHZvaWQpO1xuXG5jbGFzcyBSZWZEaXJlY3RpdmUgZXh0ZW5kcyBBc3luY0RpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX2VsZW1lbnQ/OiBFbGVtZW50O1xuICBwcml2YXRlIF9yZWY/OiBSZWZPckNhbGxiYWNrO1xuICBwcml2YXRlIF9jb250ZXh0OiB1bmtub3duO1xuXG4gIHJlbmRlcihfcmVmOiBSZWZPckNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIG5vdGhpbmc7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUocGFydDogRWxlbWVudFBhcnQsIFtyZWZdOiBQYXJhbWV0ZXJzPHRoaXNbJ3JlbmRlciddPikge1xuICAgIGNvbnN0IHJlZkNoYW5nZWQgPSByZWYgIT09IHRoaXMuX3JlZjtcbiAgICBpZiAocmVmQ2hhbmdlZCAmJiB0aGlzLl9yZWYgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gVGhlIHJlZiBwYXNzZWQgdG8gdGhlIGRpcmVjdGl2ZSBoYXMgY2hhbmdlZDtcbiAgICAgIC8vIHVuc2V0IHRoZSBwcmV2aW91cyByZWYncyB2YWx1ZVxuICAgICAgdGhpcy5fdXBkYXRlUmVmVmFsdWUodW5kZWZpbmVkKTtcbiAgICB9XG4gICAgaWYgKHJlZkNoYW5nZWQgfHwgdGhpcy5fbGFzdEVsZW1lbnRGb3JSZWYgIT09IHRoaXMuX2VsZW1lbnQpIHtcbiAgICAgIC8vIFdlIGVpdGhlciBnb3QgYSBuZXcgcmVmIG9yIHRoaXMgaXMgdGhlIGZpcnN0IHJlbmRlcjtcbiAgICAgIC8vIHN0b3JlIHRoZSByZWYvZWxlbWVudCAmIHVwZGF0ZSB0aGUgcmVmIHZhbHVlXG4gICAgICB0aGlzLl9yZWYgPSByZWY7XG4gICAgICB0aGlzLl9jb250ZXh0ID0gcGFydC5vcHRpb25zPy5ob3N0O1xuICAgICAgdGhpcy5fdXBkYXRlUmVmVmFsdWUoKHRoaXMuX2VsZW1lbnQgPSBwYXJ0LmVsZW1lbnQpKTtcbiAgICB9XG4gICAgcmV0dXJuIG5vdGhpbmc7XG4gIH1cblxuICBwcml2YXRlIF91cGRhdGVSZWZWYWx1ZShlbGVtZW50OiBFbGVtZW50IHwgdW5kZWZpbmVkKSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLl9yZWYgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIElmIHRoZSBjdXJyZW50IHJlZiB3YXMgY2FsbGVkIHdpdGggYSBwcmV2aW91cyB2YWx1ZSwgY2FsbCB3aXRoXG4gICAgICAvLyBgdW5kZWZpbmVkYDsgV2UgZG8gdGhpcyB0byBlbnN1cmUgY2FsbGJhY2tzIGFyZSBjYWxsZWQgaW4gYSBjb25zaXN0ZW50XG4gICAgICAvLyB3YXkgcmVnYXJkbGVzcyBvZiB3aGV0aGVyIGEgcmVmIG1pZ2h0IGJlIG1vdmluZyB1cCBpbiB0aGUgdHJlZSAoaW5cbiAgICAgIC8vIHdoaWNoIGNhc2UgaXQgd291bGQgb3RoZXJ3aXNlIGJlIGNhbGxlZCB3aXRoIHRoZSBuZXcgdmFsdWUgYmVmb3JlIHRoZVxuICAgICAgLy8gcHJldmlvdXMgb25lIHVuc2V0cyBpdCkgYW5kIGRvd24gaW4gdGhlIHRyZWUgKHdoZXJlIGl0IHdvdWxkIGJlIHVuc2V0XG4gICAgICAvLyBiZWZvcmUgYmVpbmcgc2V0KVxuICAgICAgaWYgKGxhc3RFbGVtZW50Rm9yQ2FsbGJhY2suZ2V0KHRoaXMuX3JlZikgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9yZWYuY2FsbCh0aGlzLl9jb250ZXh0LCB1bmRlZmluZWQpO1xuICAgICAgfVxuICAgICAgbGFzdEVsZW1lbnRGb3JDYWxsYmFjay5zZXQodGhpcy5fcmVmLCBlbGVtZW50KTtcbiAgICAgIC8vIENhbGwgdGhlIHJlZiB3aXRoIHRoZSBuZXcgZWxlbWVudCB2YWx1ZVxuICAgICAgaWYgKGVsZW1lbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9yZWYuY2FsbCh0aGlzLl9jb250ZXh0LCBlbGVtZW50KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgKHRoaXMuX3JlZiBhcyBSZWZJbnRlcm5hbCkhLnZhbHVlID0gZWxlbWVudDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldCBfbGFzdEVsZW1lbnRGb3JSZWYoKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB0aGlzLl9yZWYgPT09ICdmdW5jdGlvbidcbiAgICAgID8gbGFzdEVsZW1lbnRGb3JDYWxsYmFjay5nZXQodGhpcy5fcmVmKVxuICAgICAgOiB0aGlzLl9yZWY/LnZhbHVlO1xuICB9XG5cbiAgb3ZlcnJpZGUgZGlzY29ubmVjdGVkKCkge1xuICAgIC8vIE9ubHkgY2xlYXIgdGhlIGJveCBpZiBvdXIgZWxlbWVudCBpcyBzdGlsbCB0aGUgb25lIGluIGl0IChpLmUuIGFub3RoZXJcbiAgICAvLyBkaXJlY3RpdmUgaW5zdGFuY2UgaGFzbid0IHJlbmRlcmVkIGl0cyBlbGVtZW50IHRvIGl0IGJlZm9yZSB1cyk7IHRoYXRcbiAgICAvLyBvbmx5IGhhcHBlbnMgaW4gdGhlIGV2ZW50IG9mIHRoZSBkaXJlY3RpdmUgYmVpbmcgY2xlYXJlZCAobm90IHZpYSBtYW51YWxcbiAgICAvLyBkaXNjb25uZWN0aW9uKVxuICAgIGlmICh0aGlzLl9sYXN0RWxlbWVudEZvclJlZiA9PT0gdGhpcy5fZWxlbWVudCkge1xuICAgICAgdGhpcy5fdXBkYXRlUmVmVmFsdWUodW5kZWZpbmVkKTtcbiAgICB9XG4gIH1cblxuICBvdmVycmlkZSByZWNvbm5lY3RlZCgpIHtcbiAgICAvLyBJZiB3ZSB3ZXJlIG1hbnVhbGx5IGRpc2Nvbm5lY3RlZCwgd2UgY2FuIHNhZmVseSBwdXQgb3VyIGVsZW1lbnQgYmFjayBpblxuICAgIC8vIHRoZSBib3gsIHNpbmNlIG5vIHJlbmRlcmluZyBjb3VsZCBoYXZlIG9jY3VycmVkIHRvIGNoYW5nZSBpdHMgc3RhdGVcbiAgICB0aGlzLl91cGRhdGVSZWZWYWx1ZSh0aGlzLl9lbGVtZW50KTtcbiAgfVxufVxuXG4vKipcbiAqIFNldHMgdGhlIHZhbHVlIG9mIGEgUmVmIG9iamVjdCBvciBjYWxscyBhIHJlZiBjYWxsYmFjayB3aXRoIHRoZSBlbGVtZW50IGl0J3NcbiAqIGJvdW5kIHRvLlxuICpcbiAqIEEgUmVmIG9iamVjdCBhY3RzIGFzIGEgY29udGFpbmVyIGZvciBhIHJlZmVyZW5jZSB0byBhbiBlbGVtZW50LiBBIHJlZlxuICogY2FsbGJhY2sgaXMgYSBmdW5jdGlvbiB0aGF0IHRha2VzIGFuIGVsZW1lbnQgYXMgaXRzIG9ubHkgYXJndW1lbnQuXG4gKlxuICogVGhlIHJlZiBkaXJlY3RpdmUgc2V0cyB0aGUgdmFsdWUgb2YgdGhlIFJlZiBvYmplY3Qgb3IgY2FsbHMgdGhlIHJlZiBjYWxsYmFja1xuICogZHVyaW5nIHJlbmRlcmluZywgaWYgdGhlIHJlZmVyZW5jZWQgZWxlbWVudCBjaGFuZ2VkLlxuICpcbiAqIE5vdGU6IElmIGEgcmVmIGNhbGxiYWNrIGlzIHJlbmRlcmVkIHRvIGEgZGlmZmVyZW50IGVsZW1lbnQgcG9zaXRpb24gb3IgaXNcbiAqIHJlbW92ZWQgaW4gYSBzdWJzZXF1ZW50IHJlbmRlciwgaXQgd2lsbCBmaXJzdCBiZSBjYWxsZWQgd2l0aCBgdW5kZWZpbmVkYCxcbiAqIGZvbGxvd2VkIGJ5IGFub3RoZXIgY2FsbCB3aXRoIHRoZSBuZXcgZWxlbWVudCBpdCB3YXMgcmVuZGVyZWQgdG8gKGlmIGFueSkuXG4gKlxuICogYGBganNcbiAqIC8vIFVzaW5nIFJlZiBvYmplY3RcbiAqIGNvbnN0IGlucHV0UmVmID0gY3JlYXRlUmVmKCk7XG4gKiByZW5kZXIoaHRtbGA8aW5wdXQgJHtyZWYoaW5wdXRSZWYpfT5gLCBjb250YWluZXIpO1xuICogaW5wdXRSZWYudmFsdWUuZm9jdXMoKTtcbiAqXG4gKiAvLyBVc2luZyBjYWxsYmFja1xuICogY29uc3QgY2FsbGJhY2sgPSAoaW5wdXRFbGVtZW50KSA9PiBpbnB1dEVsZW1lbnQuZm9jdXMoKTtcbiAqIHJlbmRlcihodG1sYDxpbnB1dCAke3JlZihjYWxsYmFjayl9PmAsIGNvbnRhaW5lcik7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHJlZiA9IGRpcmVjdGl2ZShSZWZEaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge1JlZkRpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtDaGlsZFBhcnQsIG5vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgRGlyZWN0aXZlLCBQYXJ0SW5mbywgUGFydFR5cGV9IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge1xuICBpbnNlcnRQYXJ0LFxuICBnZXRDb21taXR0ZWRWYWx1ZSxcbiAgcmVtb3ZlUGFydCxcbiAgc2V0Q29tbWl0dGVkVmFsdWUsXG4gIHNldENoaWxkUGFydFZhbHVlLFxufSBmcm9tICcuLi9kaXJlY3RpdmUtaGVscGVycy5qcyc7XG5cbmV4cG9ydCB0eXBlIEtleUZuPFQ+ID0gKGl0ZW06IFQsIGluZGV4OiBudW1iZXIpID0+IHVua25vd247XG5leHBvcnQgdHlwZSBJdGVtVGVtcGxhdGU8VD4gPSAoaXRlbTogVCwgaW5kZXg6IG51bWJlcikgPT4gdW5rbm93bjtcblxuLy8gSGVscGVyIGZvciBnZW5lcmF0aW5nIGEgbWFwIG9mIGFycmF5IGl0ZW0gdG8gaXRzIGluZGV4IG92ZXIgYSBzdWJzZXRcbi8vIG9mIGFuIGFycmF5ICh1c2VkIHRvIGxhemlseSBnZW5lcmF0ZSBgbmV3S2V5VG9JbmRleE1hcGAgYW5kXG4vLyBgb2xkS2V5VG9JbmRleE1hcGApXG5jb25zdCBnZW5lcmF0ZU1hcCA9IChsaXN0OiB1bmtub3duW10sIHN0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyKSA9PiB7XG4gIGNvbnN0IG1hcCA9IG5ldyBNYXA8dW5rbm93biwgbnVtYmVyPigpO1xuICBmb3IgKGxldCBpID0gc3RhcnQ7IGkgPD0gZW5kOyBpKyspIHtcbiAgICBtYXAuc2V0KGxpc3RbaV0sIGkpO1xuICB9XG4gIHJldHVybiBtYXA7XG59O1xuXG5jbGFzcyBSZXBlYXREaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBwcml2YXRlIF9pdGVtS2V5cz86IHVua25vd25bXTtcblxuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gICAgaWYgKHBhcnRJbmZvLnR5cGUgIT09IFBhcnRUeXBlLkNISUxEKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlcGVhdCgpIGNhbiBvbmx5IGJlIHVzZWQgaW4gdGV4dCBleHByZXNzaW9ucycpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2dldFZhbHVlc0FuZEtleXM8VD4oXG4gICAgaXRlbXM6IEl0ZXJhYmxlPFQ+LFxuICAgIGtleUZuT3JUZW1wbGF0ZTogS2V5Rm48VD4gfCBJdGVtVGVtcGxhdGU8VD4sXG4gICAgdGVtcGxhdGU/OiBJdGVtVGVtcGxhdGU8VD5cbiAgKSB7XG4gICAgbGV0IGtleUZuOiBLZXlGbjxUPiB8IHVuZGVmaW5lZDtcbiAgICBpZiAodGVtcGxhdGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGVtcGxhdGUgPSBrZXlGbk9yVGVtcGxhdGU7XG4gICAgfSBlbHNlIGlmIChrZXlGbk9yVGVtcGxhdGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAga2V5Rm4gPSBrZXlGbk9yVGVtcGxhdGUgYXMgS2V5Rm48VD47XG4gICAgfVxuICAgIGNvbnN0IGtleXMgPSBbXTtcbiAgICBjb25zdCB2YWx1ZXMgPSBbXTtcbiAgICBsZXQgaW5kZXggPSAwO1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgICAga2V5c1tpbmRleF0gPSBrZXlGbiA/IGtleUZuKGl0ZW0sIGluZGV4KSA6IGluZGV4O1xuICAgICAgdmFsdWVzW2luZGV4XSA9IHRlbXBsYXRlIShpdGVtLCBpbmRleCk7XG4gICAgICBpbmRleCsrO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdmFsdWVzLFxuICAgICAga2V5cyxcbiAgICB9O1xuICB9XG5cbiAgcmVuZGVyPFQ+KGl0ZW1zOiBJdGVyYWJsZTxUPiwgdGVtcGxhdGU6IEl0ZW1UZW1wbGF0ZTxUPik6IEFycmF5PHVua25vd24+O1xuICByZW5kZXI8VD4oXG4gICAgaXRlbXM6IEl0ZXJhYmxlPFQ+LFxuICAgIGtleUZuOiBLZXlGbjxUPiB8IEl0ZW1UZW1wbGF0ZTxUPixcbiAgICB0ZW1wbGF0ZTogSXRlbVRlbXBsYXRlPFQ+XG4gICk6IEFycmF5PHVua25vd24+O1xuICByZW5kZXI8VD4oXG4gICAgaXRlbXM6IEl0ZXJhYmxlPFQ+LFxuICAgIGtleUZuT3JUZW1wbGF0ZTogS2V5Rm48VD4gfCBJdGVtVGVtcGxhdGU8VD4sXG4gICAgdGVtcGxhdGU/OiBJdGVtVGVtcGxhdGU8VD5cbiAgKSB7XG4gICAgcmV0dXJuIHRoaXMuX2dldFZhbHVlc0FuZEtleXMoaXRlbXMsIGtleUZuT3JUZW1wbGF0ZSwgdGVtcGxhdGUpLnZhbHVlcztcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZTxUPihcbiAgICBjb250YWluZXJQYXJ0OiBDaGlsZFBhcnQsXG4gICAgW2l0ZW1zLCBrZXlGbk9yVGVtcGxhdGUsIHRlbXBsYXRlXTogW1xuICAgICAgSXRlcmFibGU8VD4sXG4gICAgICBLZXlGbjxUPiB8IEl0ZW1UZW1wbGF0ZTxUPixcbiAgICAgIEl0ZW1UZW1wbGF0ZTxUPlxuICAgIF1cbiAgKSB7XG4gICAgLy8gT2xkIHBhcnQgJiBrZXkgbGlzdHMgYXJlIHJldHJpZXZlZCBmcm9tIHRoZSBsYXN0IHVwZGF0ZSAod2hpY2ggbWF5XG4gICAgLy8gYmUgcHJpbWVkIGJ5IGh5ZHJhdGlvbilcbiAgICBjb25zdCBvbGRQYXJ0cyA9IGdldENvbW1pdHRlZFZhbHVlKFxuICAgICAgY29udGFpbmVyUGFydFxuICAgICkgYXMgQXJyYXk8Q2hpbGRQYXJ0IHwgbnVsbD47XG4gICAgY29uc3Qge3ZhbHVlczogbmV3VmFsdWVzLCBrZXlzOiBuZXdLZXlzfSA9IHRoaXMuX2dldFZhbHVlc0FuZEtleXMoXG4gICAgICBpdGVtcyxcbiAgICAgIGtleUZuT3JUZW1wbGF0ZSxcbiAgICAgIHRlbXBsYXRlXG4gICAgKTtcblxuICAgIC8vIFdlIGNoZWNrIHRoYXQgb2xkUGFydHMsIHRoZSBjb21taXR0ZWQgdmFsdWUsIGlzIGFuIEFycmF5IGFzIGFuXG4gICAgLy8gaW5kaWNhdG9yIHRoYXQgdGhlIHByZXZpb3VzIHZhbHVlIGNhbWUgZnJvbSBhIHJlcGVhdCgpIGNhbGwuIElmXG4gICAgLy8gb2xkUGFydHMgaXMgbm90IGFuIEFycmF5IHRoZW4gdGhpcyBpcyB0aGUgZmlyc3QgcmVuZGVyIGFuZCB3ZSByZXR1cm5cbiAgICAvLyBhbiBhcnJheSBmb3IgbGl0LWh0bWwncyBhcnJheSBoYW5kbGluZyB0byByZW5kZXIsIGFuZCByZW1lbWJlciB0aGVcbiAgICAvLyBrZXlzLlxuICAgIGlmICghQXJyYXkuaXNBcnJheShvbGRQYXJ0cykpIHtcbiAgICAgIHRoaXMuX2l0ZW1LZXlzID0gbmV3S2V5cztcbiAgICAgIHJldHVybiBuZXdWYWx1ZXM7XG4gICAgfVxuXG4gICAgLy8gSW4gU1NSIGh5ZHJhdGlvbiBpdCdzIHBvc3NpYmxlIGZvciBvbGRQYXJ0cyB0byBiZSBhbiBhcnJyYXkgYnV0IGZvciB1c1xuICAgIC8vIHRvIG5vdCBoYXZlIGl0ZW0ga2V5cyBiZWNhdXNlIHRoZSB1cGRhdGUoKSBoYXNuJ3QgcnVuIHlldC4gV2Ugc2V0IHRoZVxuICAgIC8vIGtleXMgdG8gYW4gZW1wdHkgYXJyYXkuIFRoaXMgd2lsbCBjYXVzZSBhbGwgb2xkS2V5L25ld0tleSBjb21wYXJpc29uc1xuICAgIC8vIHRvIGZhaWwgYW5kIGV4ZWN1dGlvbiB0byBmYWxsIHRvIHRoZSBsYXN0IG5lc3RlZCBicmFjaCBiZWxvdyB3aGljaFxuICAgIC8vIHJldXNlcyB0aGUgb2xkUGFydC5cbiAgICBjb25zdCBvbGRLZXlzID0gKHRoaXMuX2l0ZW1LZXlzID8/PSBbXSk7XG5cbiAgICAvLyBOZXcgcGFydCBsaXN0IHdpbGwgYmUgYnVpbHQgdXAgYXMgd2UgZ28gKGVpdGhlciByZXVzZWQgZnJvbVxuICAgIC8vIG9sZCBwYXJ0cyBvciBjcmVhdGVkIGZvciBuZXcga2V5cyBpbiB0aGlzIHVwZGF0ZSkuIFRoaXMgaXNcbiAgICAvLyBzYXZlZCBpbiB0aGUgYWJvdmUgY2FjaGUgYXQgdGhlIGVuZCBvZiB0aGUgdXBkYXRlLlxuICAgIGNvbnN0IG5ld1BhcnRzOiBDaGlsZFBhcnRbXSA9IFtdO1xuXG4gICAgLy8gTWFwcyBmcm9tIGtleSB0byBpbmRleCBmb3IgY3VycmVudCBhbmQgcHJldmlvdXMgdXBkYXRlOyB0aGVzZVxuICAgIC8vIGFyZSBnZW5lcmF0ZWQgbGF6aWx5IG9ubHkgd2hlbiBuZWVkZWQgYXMgYSBwZXJmb3JtYW5jZVxuICAgIC8vIG9wdGltaXphdGlvbiwgc2luY2UgdGhleSBhcmUgb25seSByZXF1aXJlZCBmb3IgbXVsdGlwbGVcbiAgICAvLyBub24tY29udGlndW91cyBjaGFuZ2VzIGluIHRoZSBsaXN0LCB3aGljaCBhcmUgbGVzcyBjb21tb24uXG4gICAgbGV0IG5ld0tleVRvSW5kZXhNYXAhOiBNYXA8dW5rbm93biwgbnVtYmVyPjtcbiAgICBsZXQgb2xkS2V5VG9JbmRleE1hcCE6IE1hcDx1bmtub3duLCBudW1iZXI+O1xuXG4gICAgLy8gSGVhZCBhbmQgdGFpbCBwb2ludGVycyB0byBvbGQgcGFydHMgYW5kIG5ldyB2YWx1ZXNcbiAgICBsZXQgb2xkSGVhZCA9IDA7XG4gICAgbGV0IG9sZFRhaWwgPSBvbGRQYXJ0cy5sZW5ndGggLSAxO1xuICAgIGxldCBuZXdIZWFkID0gMDtcbiAgICBsZXQgbmV3VGFpbCA9IG5ld1ZhbHVlcy5sZW5ndGggLSAxO1xuXG4gICAgLy8gT3ZlcnZpZXcgb2YgTyhuKSByZWNvbmNpbGlhdGlvbiBhbGdvcml0aG0gKGdlbmVyYWwgYXBwcm9hY2hcbiAgICAvLyBiYXNlZCBvbiBpZGVhcyBmb3VuZCBpbiBpdmksIHZ1ZSwgc25hYmJkb20sIGV0Yy4pOlxuICAgIC8vXG4gICAgLy8gKiBXZSBzdGFydCB3aXRoIHRoZSBsaXN0IG9mIG9sZCBwYXJ0cyBhbmQgbmV3IHZhbHVlcyAoYW5kXG4gICAgLy8gICBhcnJheXMgb2YgdGhlaXIgcmVzcGVjdGl2ZSBrZXlzKSwgaGVhZC90YWlsIHBvaW50ZXJzIGludG9cbiAgICAvLyAgIGVhY2gsIGFuZCB3ZSBidWlsZCB1cCB0aGUgbmV3IGxpc3Qgb2YgcGFydHMgYnkgdXBkYXRpbmdcbiAgICAvLyAgIChhbmQgd2hlbiBuZWVkZWQsIG1vdmluZykgb2xkIHBhcnRzIG9yIGNyZWF0aW5nIG5ldyBvbmVzLlxuICAgIC8vICAgVGhlIGluaXRpYWwgc2NlbmFyaW8gbWlnaHQgbG9vayBsaWtlIHRoaXMgKGZvciBicmV2aXR5IG9mXG4gICAgLy8gICB0aGUgZGlhZ3JhbXMsIHRoZSBudW1iZXJzIGluIHRoZSBhcnJheSByZWZsZWN0IGtleXNcbiAgICAvLyAgIGFzc29jaWF0ZWQgd2l0aCB0aGUgb2xkIHBhcnRzIG9yIG5ldyB2YWx1ZXMsIGFsdGhvdWdoIGtleXNcbiAgICAvLyAgIGFuZCBwYXJ0cy92YWx1ZXMgYXJlIGFjdHVhbGx5IHN0b3JlZCBpbiBwYXJhbGxlbCBhcnJheXNcbiAgICAvLyAgIGluZGV4ZWQgdXNpbmcgdGhlIHNhbWUgaGVhZC90YWlsIHBvaW50ZXJzKTpcbiAgICAvL1xuICAgIC8vICAgICAgb2xkSGVhZCB2ICAgICAgICAgICAgICAgICB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgMiwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbICwgICwgICwgICwgICwgICwgIF1cbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gPC0gcmVmbGVjdHMgdGhlIHVzZXIncyBuZXdcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSBvcmRlclxuICAgIC8vICAgICAgbmV3SGVhZCBeICAgICAgICAgICAgICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogSXRlcmF0ZSBvbGQgJiBuZXcgbGlzdHMgZnJvbSBib3RoIHNpZGVzLCB1cGRhdGluZyxcbiAgICAvLyAgIHN3YXBwaW5nLCBvciByZW1vdmluZyBwYXJ0cyBhdCB0aGUgaGVhZC90YWlsIGxvY2F0aW9uc1xuICAgIC8vICAgdW50aWwgbmVpdGhlciBoZWFkIG5vciB0YWlsIGNhbiBtb3ZlLlxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBrZXlzIGF0IGhlYWQgcG9pbnRlcnMgbWF0Y2gsIHNvIHVwZGF0ZSBvbGRcbiAgICAvLyAgIHBhcnQgMCBpbi1wbGFjZSAobm8gbmVlZCB0byBtb3ZlIGl0KSBhbmQgcmVjb3JkIHBhcnQgMCBpblxuICAgIC8vICAgdGhlIGBuZXdQYXJ0c2AgbGlzdC4gVGhlIGxhc3QgdGhpbmcgd2UgZG8gaXMgYWR2YW5jZSB0aGVcbiAgICAvLyAgIGBvbGRIZWFkYCBhbmQgYG5ld0hlYWRgIHBvaW50ZXJzICh3aWxsIGJlIHJlZmxlY3RlZCBpbiB0aGVcbiAgICAvLyAgIG5leHQgZGlhZ3JhbSkuXG4gICAgLy9cbiAgICAvLyAgICAgIG9sZEhlYWQgdiAgICAgICAgICAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIDIsIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsICAsICAsICAsICAsICAsICBdIDwtIGhlYWRzIG1hdGNoZWQ6IHVwZGF0ZSAwXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIGJvdGggb2xkSGVhZFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmIG5ld0hlYWRcbiAgICAvLyAgICAgIG5ld0hlYWQgXiAgICAgICAgICAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IGhlYWQgcG9pbnRlcnMgZG9uJ3QgbWF0Y2gsIGJ1dCB0YWlsXG4gICAgLy8gICBwb2ludGVycyBkbywgc28gdXBkYXRlIHBhcnQgNiBpbiBwbGFjZSAobm8gbmVlZCB0byBtb3ZlXG4gICAgLy8gICBpdCksIGFuZCByZWNvcmQgcGFydCA2IGluIHRoZSBgbmV3UGFydHNgIGxpc3QuIExhc3QsXG4gICAgLy8gICBhZHZhbmNlIHRoZSBgb2xkVGFpbGAgYW5kIGBvbGRIZWFkYCBwb2ludGVycy5cbiAgICAvL1xuICAgIC8vICAgICAgICAgb2xkSGVhZCB2ICAgICAgICAgICAgICB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgMiwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgICwgICwgICwgICwgICwgNl0gPC0gdGFpbHMgbWF0Y2hlZDogdXBkYXRlIDZcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICAgYW5kIGFkdmFuY2UgYm90aCBvbGRUYWlsXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICYgbmV3VGFpbFxuICAgIC8vICAgICAgICAgbmV3SGVhZCBeICAgICAgICAgICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogSWYgbmVpdGhlciBoZWFkIG5vciB0YWlsIG1hdGNoOyBuZXh0IGNoZWNrIGlmIG9uZSBvZiB0aGVcbiAgICAvLyAgIG9sZCBoZWFkL3RhaWwgaXRlbXMgd2FzIHJlbW92ZWQuIFdlIGZpcnN0IG5lZWQgdG8gZ2VuZXJhdGVcbiAgICAvLyAgIHRoZSByZXZlcnNlIG1hcCBvZiBuZXcga2V5cyB0byBpbmRleCAoYG5ld0tleVRvSW5kZXhNYXBgKSxcbiAgICAvLyAgIHdoaWNoIGlzIGRvbmUgb25jZSBsYXppbHkgYXMgYSBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb24sXG4gICAgLy8gICBzaW5jZSB3ZSBvbmx5IGhpdCB0aGlzIGNhc2UgaWYgbXVsdGlwbGUgbm9uLWNvbnRpZ3VvdXNcbiAgICAvLyAgIGNoYW5nZXMgd2VyZSBtYWRlLiBOb3RlIHRoYXQgZm9yIGNvbnRpZ3VvdXMgcmVtb3ZhbFxuICAgIC8vICAgYW55d2hlcmUgaW4gdGhlIGxpc3QsIHRoZSBoZWFkIGFuZCB0YWlscyB3b3VsZCBhZHZhbmNlXG4gICAgLy8gICBmcm9tIGVpdGhlciBlbmQgYW5kIHBhc3MgZWFjaCBvdGhlciBiZWZvcmUgd2UgZ2V0IHRvIHRoaXNcbiAgICAvLyAgIGNhc2UgYW5kIHJlbW92YWxzIHdvdWxkIGJlIGhhbmRsZWQgaW4gdGhlIGZpbmFsIHdoaWxlIGxvb3BcbiAgICAvLyAgIHdpdGhvdXQgbmVlZGluZyB0byBnZW5lcmF0ZSB0aGUgbWFwLlxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBUaGUga2V5IGF0IGBvbGRUYWlsYCB3YXMgcmVtb3ZlZCAobm8gbG9uZ2VyXG4gICAgLy8gICBpbiB0aGUgYG5ld0tleVRvSW5kZXhNYXBgKSwgc28gcmVtb3ZlIHRoYXQgcGFydCBmcm9tIHRoZVxuICAgIC8vICAgRE9NIGFuZCBhZHZhbmNlIGp1c3QgdGhlIGBvbGRUYWlsYCBwb2ludGVyLlxuICAgIC8vXG4gICAgLy8gICAgICAgICBvbGRIZWFkIHYgICAgICAgICAgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAyLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFswLCAgLCAgLCAgLCAgLCAgLCA2XSA8LSA1IG5vdCBpbiBuZXcgbWFwOiByZW1vdmVcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICAgNSBhbmQgYWR2YW5jZSBvbGRUYWlsXG4gICAgLy8gICAgICAgICBuZXdIZWFkIF4gICAgICAgICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBPbmNlIGhlYWQgYW5kIHRhaWwgY2Fubm90IG1vdmUsIGFueSBtaXNtYXRjaGVzIGFyZSBkdWUgdG9cbiAgICAvLyAgIGVpdGhlciBuZXcgb3IgbW92ZWQgaXRlbXM7IGlmIGEgbmV3IGtleSBpcyBpbiB0aGUgcHJldmlvdXNcbiAgICAvLyAgIFwib2xkIGtleSB0byBvbGQgaW5kZXhcIiBtYXAsIG1vdmUgdGhlIG9sZCBwYXJ0IHRvIHRoZSBuZXdcbiAgICAvLyAgIGxvY2F0aW9uLCBvdGhlcndpc2UgY3JlYXRlIGFuZCBpbnNlcnQgYSBuZXcgcGFydC4gTm90ZVxuICAgIC8vICAgdGhhdCB3aGVuIG1vdmluZyBhbiBvbGQgcGFydCB3ZSBudWxsIGl0cyBwb3NpdGlvbiBpbiB0aGVcbiAgICAvLyAgIG9sZFBhcnRzIGFycmF5IGlmIGl0IGxpZXMgYmV0d2VlbiB0aGUgaGVhZCBhbmQgdGFpbCBzbyB3ZVxuICAgIC8vICAga25vdyB0byBza2lwIGl0IHdoZW4gdGhlIHBvaW50ZXJzIGdldCB0aGVyZS5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogbmVpdGhlciBoZWFkIG5vciB0YWlsIG1hdGNoLCBhbmQgbmVpdGhlclxuICAgIC8vICAgd2VyZSByZW1vdmVkOyBzbyBmaW5kIHRoZSBgbmV3SGVhZGAga2V5IGluIHRoZVxuICAgIC8vICAgYG9sZEtleVRvSW5kZXhNYXBgLCBhbmQgbW92ZSB0aGF0IG9sZCBwYXJ0J3MgRE9NIGludG8gdGhlXG4gICAgLy8gICBuZXh0IGhlYWQgcG9zaXRpb24gKGJlZm9yZSBgb2xkUGFydHNbb2xkSGVhZF1gKS4gTGFzdCxcbiAgICAvLyAgIG51bGwgdGhlIHBhcnQgaW4gdGhlIGBvbGRQYXJ0YCBhcnJheSBzaW5jZSBpdCB3YXNcbiAgICAvLyAgIHNvbWV3aGVyZSBpbiB0aGUgcmVtYWluaW5nIG9sZFBhcnRzIHN0aWxsIHRvIGJlIHNjYW5uZWRcbiAgICAvLyAgIChiZXR3ZWVuIHRoZSBoZWFkIGFuZCB0YWlsIHBvaW50ZXJzKSBzbyB0aGF0IHdlIGtub3cgdG9cbiAgICAvLyAgIHNraXAgdGhhdCBvbGQgcGFydCBvbiBmdXR1cmUgaXRlcmF0aW9ucy5cbiAgICAvL1xuICAgIC8vICAgICAgICAgb2xkSGVhZCB2ICAgICAgICB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgLSwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgICwgICwgICwgICwgNl0gPC0gc3R1Y2s6IHVwZGF0ZSAmIG1vdmUgMlxuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSAgICBpbnRvIHBsYWNlIGFuZCBhZHZhbmNlXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0hlYWRcbiAgICAvLyAgICAgICAgIG5ld0hlYWQgXiAgICAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIE5vdGUgdGhhdCBmb3IgbW92ZXMvaW5zZXJ0aW9ucyBsaWtlIHRoZSBvbmUgYWJvdmUsIGEgcGFydFxuICAgIC8vICAgaW5zZXJ0ZWQgYXQgdGhlIGhlYWQgcG9pbnRlciBpcyBpbnNlcnRlZCBiZWZvcmUgdGhlXG4gICAgLy8gICBjdXJyZW50IGBvbGRQYXJ0c1tvbGRIZWFkXWAsIGFuZCBhIHBhcnQgaW5zZXJ0ZWQgYXQgdGhlXG4gICAgLy8gICB0YWlsIHBvaW50ZXIgaXMgaW5zZXJ0ZWQgYmVmb3JlIGBuZXdQYXJ0c1tuZXdUYWlsKzFdYC4gVGhlXG4gICAgLy8gICBzZWVtaW5nIGFzeW1tZXRyeSBsaWVzIGluIHRoZSBmYWN0IHRoYXQgbmV3IHBhcnRzIGFyZVxuICAgIC8vICAgbW92ZWQgaW50byBwbGFjZSBvdXRzaWRlIGluLCBzbyB0byB0aGUgcmlnaHQgb2YgdGhlIGhlYWRcbiAgICAvLyAgIHBvaW50ZXIgYXJlIG9sZCBwYXJ0cywgYW5kIHRvIHRoZSByaWdodCBvZiB0aGUgdGFpbFxuICAgIC8vICAgcG9pbnRlciBhcmUgbmV3IHBhcnRzLlxuICAgIC8vXG4gICAgLy8gKiBXZSBhbHdheXMgcmVzdGFydCBiYWNrIGZyb20gdGhlIHRvcCBvZiB0aGUgYWxnb3JpdGhtLFxuICAgIC8vICAgYWxsb3dpbmcgbWF0Y2hpbmcgYW5kIHNpbXBsZSB1cGRhdGVzIGluIHBsYWNlIHRvXG4gICAgLy8gICBjb250aW51ZS4uLlxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiB0aGUgaGVhZCBwb2ludGVycyBvbmNlIGFnYWluIG1hdGNoLCBzb1xuICAgIC8vICAgc2ltcGx5IHVwZGF0ZSBwYXJ0IDEgYW5kIHJlY29yZCBpdCBpbiB0aGUgYG5ld1BhcnRzYFxuICAgIC8vICAgYXJyYXkuICBMYXN0LCBhZHZhbmNlIGJvdGggaGVhZCBwb2ludGVycy5cbiAgICAvL1xuICAgIC8vICAgICAgICAgb2xkSGVhZCB2ICAgICAgICB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgLSwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgMSwgICwgICwgICwgNl0gPC0gaGVhZHMgbWF0Y2hlZDogdXBkYXRlIDFcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICAgYW5kIGFkdmFuY2UgYm90aCBvbGRIZWFkXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICYgbmV3SGVhZFxuICAgIC8vICAgICAgICAgICAgbmV3SGVhZCBeICAgICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogQXMgbWVudGlvbmVkIGFib3ZlLCBpdGVtcyB0aGF0IHdlcmUgbW92ZWQgYXMgYSByZXN1bHQgb2ZcbiAgICAvLyAgIGJlaW5nIHN0dWNrICh0aGUgZmluYWwgZWxzZSBjbGF1c2UgaW4gdGhlIGNvZGUgYmVsb3cpIGFyZVxuICAgIC8vICAgbWFya2VkIHdpdGggbnVsbCwgc28gd2UgYWx3YXlzIGFkdmFuY2Ugb2xkIHBvaW50ZXJzIG92ZXJcbiAgICAvLyAgIHRoZXNlIHNvIHdlJ3JlIGNvbXBhcmluZyB0aGUgbmV4dCBhY3R1YWwgb2xkIHZhbHVlIG9uXG4gICAgLy8gICBlaXRoZXIgZW5kLlxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBgb2xkSGVhZGAgaXMgbnVsbCAoYWxyZWFkeSBwbGFjZWQgaW5cbiAgICAvLyAgIG5ld1BhcnRzKSwgc28gYWR2YW5jZSBgb2xkSGVhZGAuXG4gICAgLy9cbiAgICAvLyAgICAgICAgICAgIG9sZEhlYWQgdiAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdIDwtIG9sZCBoZWFkIGFscmVhZHkgdXNlZDpcbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgMSwgICwgICwgICwgNl0gICAgYWR2YW5jZSBvbGRIZWFkXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdXG4gICAgLy8gICAgICAgICAgICAgICBuZXdIZWFkIF4gICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBOb3RlIGl0J3Mgbm90IGNyaXRpY2FsIHRvIG1hcmsgb2xkIHBhcnRzIGFzIG51bGwgd2hlbiB0aGV5XG4gICAgLy8gICBhcmUgbW92ZWQgZnJvbSBoZWFkIHRvIHRhaWwgb3IgdGFpbCB0byBoZWFkLCBzaW5jZSB0aGV5XG4gICAgLy8gICB3aWxsIGJlIG91dHNpZGUgdGhlIHBvaW50ZXIgcmFuZ2UgYW5kIG5ldmVyIHZpc2l0ZWQgYWdhaW4uXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IEhlcmUgdGhlIG9sZCB0YWlsIGtleSBtYXRjaGVzIHRoZSBuZXcgaGVhZFxuICAgIC8vICAga2V5LCBzbyB0aGUgcGFydCBhdCB0aGUgYG9sZFRhaWxgIHBvc2l0aW9uIGFuZCBtb3ZlIGl0c1xuICAgIC8vICAgRE9NIHRvIHRoZSBuZXcgaGVhZCBwb3NpdGlvbiAoYmVmb3JlIGBvbGRQYXJ0c1tvbGRIZWFkXWApLlxuICAgIC8vICAgTGFzdCwgYWR2YW5jZSBgb2xkVGFpbGAgYW5kIGBuZXdIZWFkYCBwb2ludGVycy5cbiAgICAvL1xuICAgIC8vICAgICAgICAgICAgICAgb2xkSGVhZCB2ICB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgLSwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgMSwgNCwgICwgICwgNl0gPC0gb2xkIHRhaWwgbWF0Y2hlcyBuZXdcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICBoZWFkOiB1cGRhdGUgJiBtb3ZlIDQsXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWR2YW5jZSBvbGRUYWlsICYgbmV3SGVhZFxuICAgIC8vICAgICAgICAgICAgICAgbmV3SGVhZCBeICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogT2xkIGFuZCBuZXcgaGVhZCBrZXlzIG1hdGNoLCBzbyB1cGRhdGUgdGhlXG4gICAgLy8gICBvbGQgaGVhZCBwYXJ0IGluIHBsYWNlLCBhbmQgYWR2YW5jZSB0aGUgYG9sZEhlYWRgIGFuZFxuICAgIC8vICAgYG5ld0hlYWRgIHBvaW50ZXJzLlxuICAgIC8vXG4gICAgLy8gICAgICAgICAgICAgICBvbGRIZWFkIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAtLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFswLCAyLCAxLCA0LCAzLCAgICw2XSA8LSBoZWFkcyBtYXRjaDogdXBkYXRlIDNcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICAgYW5kIGFkdmFuY2Ugb2xkSGVhZCAmXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0hlYWRcbiAgICAvLyAgICAgICAgICAgICAgICAgIG5ld0hlYWQgXiAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIE9uY2UgdGhlIG5ldyBvciBvbGQgcG9pbnRlcnMgbW92ZSBwYXN0IGVhY2ggb3RoZXIgdGhlbiBhbGxcbiAgICAvLyAgIHdlIGhhdmUgbGVmdCBpcyBhZGRpdGlvbnMgKGlmIG9sZCBsaXN0IGV4aGF1c3RlZCkgb3JcbiAgICAvLyAgIHJlbW92YWxzIChpZiBuZXcgbGlzdCBleGhhdXN0ZWQpLiBUaG9zZSBhcmUgaGFuZGxlZCBpbiB0aGVcbiAgICAvLyAgIGZpbmFsIHdoaWxlIGxvb3BzIGF0IHRoZSBlbmQuXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IGBvbGRIZWFkYCBleGNlZWRlZCBgb2xkVGFpbGAsIHNvIHdlJ3JlIGRvbmVcbiAgICAvLyAgIHdpdGggdGhlIG1haW4gbG9vcC4gIENyZWF0ZSB0aGUgcmVtYWluaW5nIHBhcnQgYW5kIGluc2VydFxuICAgIC8vICAgaXQgYXQgdGhlIG5ldyBoZWFkIHBvc2l0aW9uLCBhbmQgdGhlIHVwZGF0ZSBpcyBjb21wbGV0ZS5cbiAgICAvL1xuICAgIC8vICAgICAgICAgICAgICAgICAgIChvbGRIZWFkID4gb2xkVGFpbClcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgLSwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgMSwgNCwgMywgNyAsNl0gPC0gY3JlYXRlIGFuZCBpbnNlcnQgN1xuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XVxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgbmV3SGVhZCBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogTm90ZSB0aGF0IHRoZSBvcmRlciBvZiB0aGUgaWYvZWxzZSBjbGF1c2VzIGlzIG5vdFxuICAgIC8vICAgaW1wb3J0YW50IHRvIHRoZSBhbGdvcml0aG0sIGFzIGxvbmcgYXMgdGhlIG51bGwgY2hlY2tzXG4gICAgLy8gICBjb21lIGZpcnN0ICh0byBlbnN1cmUgd2UncmUgYWx3YXlzIHdvcmtpbmcgb24gdmFsaWQgb2xkXG4gICAgLy8gICBwYXJ0cykgYW5kIHRoYXQgdGhlIGZpbmFsIGVsc2UgY2xhdXNlIGNvbWVzIGxhc3QgKHNpbmNlXG4gICAgLy8gICB0aGF0J3Mgd2hlcmUgdGhlIGV4cGVuc2l2ZSBtb3ZlcyBvY2N1cikuIFRoZSBvcmRlciBvZlxuICAgIC8vICAgcmVtYWluaW5nIGNsYXVzZXMgaXMgaXMganVzdCBhIHNpbXBsZSBndWVzcyBhdCB3aGljaCBjYXNlc1xuICAgIC8vICAgd2lsbCBiZSBtb3N0IGNvbW1vbi5cbiAgICAvL1xuICAgIC8vICogTm90ZSwgd2UgY291bGQgY2FsY3VsYXRlIHRoZSBsb25nZXN0XG4gICAgLy8gICBpbmNyZWFzaW5nIHN1YnNlcXVlbmNlIChMSVMpIG9mIG9sZCBpdGVtcyBpbiBuZXcgcG9zaXRpb24sXG4gICAgLy8gICBhbmQgb25seSBtb3ZlIHRob3NlIG5vdCBpbiB0aGUgTElTIHNldC4gSG93ZXZlciB0aGF0IGNvc3RzXG4gICAgLy8gICBPKG5sb2duKSB0aW1lIGFuZCBhZGRzIGEgYml0IG1vcmUgY29kZSwgYW5kIG9ubHkgaGVscHNcbiAgICAvLyAgIG1ha2UgcmFyZSB0eXBlcyBvZiBtdXRhdGlvbnMgcmVxdWlyZSBmZXdlciBtb3Zlcy4gVGhlXG4gICAgLy8gICBhYm92ZSBoYW5kbGVzIHJlbW92ZXMsIGFkZHMsIHJldmVyc2FsLCBzd2FwcywgYW5kIHNpbmdsZVxuICAgIC8vICAgbW92ZXMgb2YgY29udGlndW91cyBpdGVtcyBpbiBsaW5lYXIgdGltZSwgaW4gdGhlIG1pbmltdW1cbiAgICAvLyAgIG51bWJlciBvZiBtb3Zlcy4gQXMgdGhlIG51bWJlciBvZiBtdWx0aXBsZSBtb3ZlcyB3aGVyZSBMSVNcbiAgICAvLyAgIG1pZ2h0IGhlbHAgYXBwcm9hY2hlcyBhIHJhbmRvbSBzaHVmZmxlLCB0aGUgTElTXG4gICAgLy8gICBvcHRpbWl6YXRpb24gYmVjb21lcyBsZXNzIGhlbHBmdWwsIHNvIGl0IHNlZW1zIG5vdCB3b3J0aFxuICAgIC8vICAgdGhlIGNvZGUgYXQgdGhpcyBwb2ludC4gQ291bGQgcmVjb25zaWRlciBpZiBhIGNvbXBlbGxpbmdcbiAgICAvLyAgIGNhc2UgYXJpc2VzLlxuXG4gICAgd2hpbGUgKG9sZEhlYWQgPD0gb2xkVGFpbCAmJiBuZXdIZWFkIDw9IG5ld1RhaWwpIHtcbiAgICAgIGlmIChvbGRQYXJ0c1tvbGRIZWFkXSA9PT0gbnVsbCkge1xuICAgICAgICAvLyBgbnVsbGAgbWVhbnMgb2xkIHBhcnQgYXQgaGVhZCBoYXMgYWxyZWFkeSBiZWVuIHVzZWRcbiAgICAgICAgLy8gYmVsb3c7IHNraXBcbiAgICAgICAgb2xkSGVhZCsrO1xuICAgICAgfSBlbHNlIGlmIChvbGRQYXJ0c1tvbGRUYWlsXSA9PT0gbnVsbCkge1xuICAgICAgICAvLyBgbnVsbGAgbWVhbnMgb2xkIHBhcnQgYXQgdGFpbCBoYXMgYWxyZWFkeSBiZWVuIHVzZWRcbiAgICAgICAgLy8gYmVsb3c7IHNraXBcbiAgICAgICAgb2xkVGFpbC0tO1xuICAgICAgfSBlbHNlIGlmIChvbGRLZXlzW29sZEhlYWRdID09PSBuZXdLZXlzW25ld0hlYWRdKSB7XG4gICAgICAgIC8vIE9sZCBoZWFkIG1hdGNoZXMgbmV3IGhlYWQ7IHVwZGF0ZSBpbiBwbGFjZVxuICAgICAgICBuZXdQYXJ0c1tuZXdIZWFkXSA9IHNldENoaWxkUGFydFZhbHVlKFxuICAgICAgICAgIG9sZFBhcnRzW29sZEhlYWRdISxcbiAgICAgICAgICBuZXdWYWx1ZXNbbmV3SGVhZF1cbiAgICAgICAgKTtcbiAgICAgICAgb2xkSGVhZCsrO1xuICAgICAgICBuZXdIZWFkKys7XG4gICAgICB9IGVsc2UgaWYgKG9sZEtleXNbb2xkVGFpbF0gPT09IG5ld0tleXNbbmV3VGFpbF0pIHtcbiAgICAgICAgLy8gT2xkIHRhaWwgbWF0Y2hlcyBuZXcgdGFpbDsgdXBkYXRlIGluIHBsYWNlXG4gICAgICAgIG5ld1BhcnRzW25ld1RhaWxdID0gc2V0Q2hpbGRQYXJ0VmFsdWUoXG4gICAgICAgICAgb2xkUGFydHNbb2xkVGFpbF0hLFxuICAgICAgICAgIG5ld1ZhbHVlc1tuZXdUYWlsXVxuICAgICAgICApO1xuICAgICAgICBvbGRUYWlsLS07XG4gICAgICAgIG5ld1RhaWwtLTtcbiAgICAgIH0gZWxzZSBpZiAob2xkS2V5c1tvbGRIZWFkXSA9PT0gbmV3S2V5c1tuZXdUYWlsXSkge1xuICAgICAgICAvLyBPbGQgaGVhZCBtYXRjaGVzIG5ldyB0YWlsOyB1cGRhdGUgYW5kIG1vdmUgdG8gbmV3IHRhaWxcbiAgICAgICAgbmV3UGFydHNbbmV3VGFpbF0gPSBzZXRDaGlsZFBhcnRWYWx1ZShcbiAgICAgICAgICBvbGRQYXJ0c1tvbGRIZWFkXSEsXG4gICAgICAgICAgbmV3VmFsdWVzW25ld1RhaWxdXG4gICAgICAgICk7XG4gICAgICAgIGluc2VydFBhcnQoY29udGFpbmVyUGFydCwgbmV3UGFydHNbbmV3VGFpbCArIDFdLCBvbGRQYXJ0c1tvbGRIZWFkXSEpO1xuICAgICAgICBvbGRIZWFkKys7XG4gICAgICAgIG5ld1RhaWwtLTtcbiAgICAgIH0gZWxzZSBpZiAob2xkS2V5c1tvbGRUYWlsXSA9PT0gbmV3S2V5c1tuZXdIZWFkXSkge1xuICAgICAgICAvLyBPbGQgdGFpbCBtYXRjaGVzIG5ldyBoZWFkOyB1cGRhdGUgYW5kIG1vdmUgdG8gbmV3IGhlYWRcbiAgICAgICAgbmV3UGFydHNbbmV3SGVhZF0gPSBzZXRDaGlsZFBhcnRWYWx1ZShcbiAgICAgICAgICBvbGRQYXJ0c1tvbGRUYWlsXSEsXG4gICAgICAgICAgbmV3VmFsdWVzW25ld0hlYWRdXG4gICAgICAgICk7XG4gICAgICAgIGluc2VydFBhcnQoY29udGFpbmVyUGFydCwgb2xkUGFydHNbb2xkSGVhZF0hLCBvbGRQYXJ0c1tvbGRUYWlsXSEpO1xuICAgICAgICBvbGRUYWlsLS07XG4gICAgICAgIG5ld0hlYWQrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChuZXdLZXlUb0luZGV4TWFwID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBMYXppbHkgZ2VuZXJhdGUga2V5LXRvLWluZGV4IG1hcHMsIHVzZWQgZm9yIHJlbW92YWxzICZcbiAgICAgICAgICAvLyBtb3ZlcyBiZWxvd1xuICAgICAgICAgIG5ld0tleVRvSW5kZXhNYXAgPSBnZW5lcmF0ZU1hcChuZXdLZXlzLCBuZXdIZWFkLCBuZXdUYWlsKTtcbiAgICAgICAgICBvbGRLZXlUb0luZGV4TWFwID0gZ2VuZXJhdGVNYXAob2xkS2V5cywgb2xkSGVhZCwgb2xkVGFpbCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFuZXdLZXlUb0luZGV4TWFwLmhhcyhvbGRLZXlzW29sZEhlYWRdKSkge1xuICAgICAgICAgIC8vIE9sZCBoZWFkIGlzIG5vIGxvbmdlciBpbiBuZXcgbGlzdDsgcmVtb3ZlXG4gICAgICAgICAgcmVtb3ZlUGFydChvbGRQYXJ0c1tvbGRIZWFkXSEpO1xuICAgICAgICAgIG9sZEhlYWQrKztcbiAgICAgICAgfSBlbHNlIGlmICghbmV3S2V5VG9JbmRleE1hcC5oYXMob2xkS2V5c1tvbGRUYWlsXSkpIHtcbiAgICAgICAgICAvLyBPbGQgdGFpbCBpcyBubyBsb25nZXIgaW4gbmV3IGxpc3Q7IHJlbW92ZVxuICAgICAgICAgIHJlbW92ZVBhcnQob2xkUGFydHNbb2xkVGFpbF0hKTtcbiAgICAgICAgICBvbGRUYWlsLS07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gQW55IG1pc21hdGNoZXMgYXQgdGhpcyBwb2ludCBhcmUgZHVlIHRvIGFkZGl0aW9ucyBvclxuICAgICAgICAgIC8vIG1vdmVzOyBzZWUgaWYgd2UgaGF2ZSBhbiBvbGQgcGFydCB3ZSBjYW4gcmV1c2UgYW5kIG1vdmVcbiAgICAgICAgICAvLyBpbnRvIHBsYWNlXG4gICAgICAgICAgY29uc3Qgb2xkSW5kZXggPSBvbGRLZXlUb0luZGV4TWFwLmdldChuZXdLZXlzW25ld0hlYWRdKTtcbiAgICAgICAgICBjb25zdCBvbGRQYXJ0ID0gb2xkSW5kZXggIT09IHVuZGVmaW5lZCA/IG9sZFBhcnRzW29sZEluZGV4XSA6IG51bGw7XG4gICAgICAgICAgaWYgKG9sZFBhcnQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIC8vIE5vIG9sZCBwYXJ0IGZvciB0aGlzIHZhbHVlOyBjcmVhdGUgYSBuZXcgb25lIGFuZFxuICAgICAgICAgICAgLy8gaW5zZXJ0IGl0XG4gICAgICAgICAgICBjb25zdCBuZXdQYXJ0ID0gaW5zZXJ0UGFydChjb250YWluZXJQYXJ0LCBvbGRQYXJ0c1tvbGRIZWFkXSEpO1xuICAgICAgICAgICAgc2V0Q2hpbGRQYXJ0VmFsdWUobmV3UGFydCwgbmV3VmFsdWVzW25ld0hlYWRdKTtcbiAgICAgICAgICAgIG5ld1BhcnRzW25ld0hlYWRdID0gbmV3UGFydDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUmV1c2Ugb2xkIHBhcnRcbiAgICAgICAgICAgIG5ld1BhcnRzW25ld0hlYWRdID0gc2V0Q2hpbGRQYXJ0VmFsdWUob2xkUGFydCwgbmV3VmFsdWVzW25ld0hlYWRdKTtcbiAgICAgICAgICAgIGluc2VydFBhcnQoY29udGFpbmVyUGFydCwgb2xkUGFydHNbb2xkSGVhZF0hLCBvbGRQYXJ0KTtcbiAgICAgICAgICAgIC8vIFRoaXMgbWFya3MgdGhlIG9sZCBwYXJ0IGFzIGhhdmluZyBiZWVuIHVzZWQsIHNvIHRoYXRcbiAgICAgICAgICAgIC8vIGl0IHdpbGwgYmUgc2tpcHBlZCBpbiB0aGUgZmlyc3QgdHdvIGNoZWNrcyBhYm92ZVxuICAgICAgICAgICAgb2xkUGFydHNbb2xkSW5kZXggYXMgbnVtYmVyXSA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIG5ld0hlYWQrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBBZGQgcGFydHMgZm9yIGFueSByZW1haW5pbmcgbmV3IHZhbHVlc1xuICAgIHdoaWxlIChuZXdIZWFkIDw9IG5ld1RhaWwpIHtcbiAgICAgIC8vIEZvciBhbGwgcmVtYWluaW5nIGFkZGl0aW9ucywgd2UgaW5zZXJ0IGJlZm9yZSBsYXN0IG5ld1xuICAgICAgLy8gdGFpbCwgc2luY2Ugb2xkIHBvaW50ZXJzIGFyZSBubyBsb25nZXIgdmFsaWRcbiAgICAgIGNvbnN0IG5ld1BhcnQgPSBpbnNlcnRQYXJ0KGNvbnRhaW5lclBhcnQsIG5ld1BhcnRzW25ld1RhaWwgKyAxXSk7XG4gICAgICBzZXRDaGlsZFBhcnRWYWx1ZShuZXdQYXJ0LCBuZXdWYWx1ZXNbbmV3SGVhZF0pO1xuICAgICAgbmV3UGFydHNbbmV3SGVhZCsrXSA9IG5ld1BhcnQ7XG4gICAgfVxuICAgIC8vIFJlbW92ZSBhbnkgcmVtYWluaW5nIHVudXNlZCBvbGQgcGFydHNcbiAgICB3aGlsZSAob2xkSGVhZCA8PSBvbGRUYWlsKSB7XG4gICAgICBjb25zdCBvbGRQYXJ0ID0gb2xkUGFydHNbb2xkSGVhZCsrXTtcbiAgICAgIGlmIChvbGRQYXJ0ICE9PSBudWxsKSB7XG4gICAgICAgIHJlbW92ZVBhcnQob2xkUGFydCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gU2F2ZSBvcmRlciBvZiBuZXcgcGFydHMgZm9yIG5leHQgcm91bmRcbiAgICB0aGlzLl9pdGVtS2V5cyA9IG5ld0tleXM7XG4gICAgLy8gRGlyZWN0bHkgc2V0IHBhcnQgdmFsdWUsIGJ5cGFzc2luZyBpdCdzIGRpcnR5LWNoZWNraW5nXG4gICAgc2V0Q29tbWl0dGVkVmFsdWUoY29udGFpbmVyUGFydCwgbmV3UGFydHMpO1xuICAgIHJldHVybiBub0NoYW5nZTtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlcGVhdERpcmVjdGl2ZUZuIHtcbiAgPFQ+KFxuICAgIGl0ZW1zOiBJdGVyYWJsZTxUPixcbiAgICBrZXlGbk9yVGVtcGxhdGU6IEtleUZuPFQ+IHwgSXRlbVRlbXBsYXRlPFQ+LFxuICAgIHRlbXBsYXRlPzogSXRlbVRlbXBsYXRlPFQ+XG4gICk6IHVua25vd247XG4gIDxUPihpdGVtczogSXRlcmFibGU8VD4sIHRlbXBsYXRlOiBJdGVtVGVtcGxhdGU8VD4pOiB1bmtub3duO1xuICA8VD4oXG4gICAgaXRlbXM6IEl0ZXJhYmxlPFQ+LFxuICAgIGtleUZuOiBLZXlGbjxUPiB8IEl0ZW1UZW1wbGF0ZTxUPixcbiAgICB0ZW1wbGF0ZTogSXRlbVRlbXBsYXRlPFQ+XG4gICk6IHVua25vd247XG59XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCByZXBlYXRzIGEgc2VyaWVzIG9mIHZhbHVlcyAodXN1YWxseSBgVGVtcGxhdGVSZXN1bHRzYClcbiAqIGdlbmVyYXRlZCBmcm9tIGFuIGl0ZXJhYmxlLCBhbmQgdXBkYXRlcyB0aG9zZSBpdGVtcyBlZmZpY2llbnRseSB3aGVuIHRoZVxuICogaXRlcmFibGUgY2hhbmdlcyBiYXNlZCBvbiB1c2VyLXByb3ZpZGVkIGBrZXlzYCBhc3NvY2lhdGVkIHdpdGggZWFjaCBpdGVtLlxuICpcbiAqIE5vdGUgdGhhdCBpZiBhIGBrZXlGbmAgaXMgcHJvdmlkZWQsIHN0cmljdCBrZXktdG8tRE9NIG1hcHBpbmcgaXMgbWFpbnRhaW5lZCxcbiAqIG1lYW5pbmcgcHJldmlvdXMgRE9NIGZvciBhIGdpdmVuIGtleSBpcyBtb3ZlZCBpbnRvIHRoZSBuZXcgcG9zaXRpb24gaWZcbiAqIG5lZWRlZCwgYW5kIERPTSB3aWxsIG5ldmVyIGJlIHJldXNlZCB3aXRoIHZhbHVlcyBmb3IgZGlmZmVyZW50IGtleXMgKG5ldyBET01cbiAqIHdpbGwgYWx3YXlzIGJlIGNyZWF0ZWQgZm9yIG5ldyBrZXlzKS4gVGhpcyBpcyBnZW5lcmFsbHkgdGhlIG1vc3QgZWZmaWNpZW50XG4gKiB3YXkgdG8gdXNlIGByZXBlYXRgIHNpbmNlIGl0IHBlcmZvcm1zIG1pbmltdW0gdW5uZWNlc3Nhcnkgd29yayBmb3IgaW5zZXJ0aW9uc1xuICogYW5kIHJlbW92YWxzLlxuICpcbiAqIFRoZSBga2V5Rm5gIHRha2VzIHR3byBwYXJhbWV0ZXJzLCB0aGUgaXRlbSBhbmQgaXRzIGluZGV4LCBhbmQgcmV0dXJucyBhIHVuaXF1ZSBrZXkgdmFsdWUuXG4gKlxuICogYGBganNcbiAqIGh0bWxgXG4gKiAgIDxvbD5cbiAqICAgICAke3JlcGVhdCh0aGlzLml0ZW1zLCAoaXRlbSkgPT4gaXRlbS5pZCwgKGl0ZW0sIGluZGV4KSA9PiB7XG4gKiAgICAgICByZXR1cm4gaHRtbGA8bGk+JHtpbmRleH06ICR7aXRlbS5uYW1lfTwvbGk+YDtcbiAqICAgICB9KX1cbiAqICAgPC9vbD5cbiAqIGBcbiAqIGBgYFxuICpcbiAqICoqSW1wb3J0YW50Kio6IElmIHByb3ZpZGluZyBhIGBrZXlGbmAsIGtleXMgKm11c3QqIGJlIHVuaXF1ZSBmb3IgYWxsIGl0ZW1zIGluIGFcbiAqIGdpdmVuIGNhbGwgdG8gYHJlcGVhdGAuIFRoZSBiZWhhdmlvciB3aGVuIHR3byBvciBtb3JlIGl0ZW1zIGhhdmUgdGhlIHNhbWUga2V5XG4gKiBpcyB1bmRlZmluZWQuXG4gKlxuICogSWYgbm8gYGtleUZuYCBpcyBwcm92aWRlZCwgdGhpcyBkaXJlY3RpdmUgd2lsbCBwZXJmb3JtIHNpbWlsYXIgdG8gbWFwcGluZ1xuICogaXRlbXMgdG8gdmFsdWVzLCBhbmQgRE9NIHdpbGwgYmUgcmV1c2VkIGFnYWluc3QgcG90ZW50aWFsbHkgZGlmZmVyZW50IGl0ZW1zLlxuICovXG5leHBvcnQgY29uc3QgcmVwZWF0ID0gZGlyZWN0aXZlKFJlcGVhdERpcmVjdGl2ZSkgYXMgUmVwZWF0RGlyZWN0aXZlRm47XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7UmVwZWF0RGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0F0dHJpYnV0ZVBhcnQsIG5vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBkaXJlY3RpdmUsXG4gIERpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbiAgUGFydEluZm8sXG4gIFBhcnRUeXBlLFxufSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuXG4vKipcbiAqIEEga2V5LXZhbHVlIHNldCBvZiBDU1MgcHJvcGVydGllcyBhbmQgdmFsdWVzLlxuICpcbiAqIFRoZSBrZXkgc2hvdWxkIGJlIGVpdGhlciBhIHZhbGlkIENTUyBwcm9wZXJ0eSBuYW1lIHN0cmluZywgbGlrZVxuICogYCdiYWNrZ3JvdW5kLWNvbG9yJ2AsIG9yIGEgdmFsaWQgSmF2YVNjcmlwdCBjYW1lbCBjYXNlIHByb3BlcnR5IG5hbWVcbiAqIGZvciBDU1NTdHlsZURlY2xhcmF0aW9uIGxpa2UgYGJhY2tncm91bmRDb2xvcmAuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3R5bGVJbmZvIHtcbiAgcmVhZG9ubHkgW25hbWU6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZCB8IG51bGw7XG59XG5cbmNsYXNzIFN0eWxlTWFwRGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzPzogU2V0PHN0cmluZz47XG5cbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICAgIGlmIChcbiAgICAgIHBhcnRJbmZvLnR5cGUgIT09IFBhcnRUeXBlLkFUVFJJQlVURSB8fFxuICAgICAgcGFydEluZm8ubmFtZSAhPT0gJ3N0eWxlJyB8fFxuICAgICAgKHBhcnRJbmZvLnN0cmluZ3M/Lmxlbmd0aCBhcyBudW1iZXIpID4gMlxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnVGhlIGBzdHlsZU1hcGAgZGlyZWN0aXZlIG11c3QgYmUgdXNlZCBpbiB0aGUgYHN0eWxlYCBhdHRyaWJ1dGUgJyArXG4gICAgICAgICAgJ2FuZCBtdXN0IGJlIHRoZSBvbmx5IHBhcnQgaW4gdGhlIGF0dHJpYnV0ZS4nXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlcihzdHlsZUluZm86IFN0eWxlSW5mbykge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhzdHlsZUluZm8pLnJlZHVjZSgoc3R5bGUsIHByb3ApID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gc3R5bGVJbmZvW3Byb3BdO1xuICAgICAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHN0eWxlO1xuICAgICAgfVxuICAgICAgLy8gQ29udmVydCBwcm9wZXJ0eSBuYW1lcyBmcm9tIGNhbWVsLWNhc2UgdG8gZGFzaC1jYXNlLCBpLmUuOlxuICAgICAgLy8gIGBiYWNrZ3JvdW5kQ29sb3JgIC0+IGBiYWNrZ3JvdW5kLWNvbG9yYFxuICAgICAgLy8gVmVuZG9yLXByZWZpeGVkIG5hbWVzIG5lZWQgYW4gZXh0cmEgYC1gIGFwcGVuZGVkIHRvIGZyb250OlxuICAgICAgLy8gIGB3ZWJraXRBcHBlYXJhbmNlYCAtPiBgLXdlYmtpdC1hcHBlYXJhbmNlYFxuICAgICAgLy8gRXhjZXB0aW9uIGlzIGFueSBwcm9wZXJ0eSBuYW1lIGNvbnRhaW5pbmcgYSBkYXNoLCBpbmNsdWRpbmdcbiAgICAgIC8vIGN1c3RvbSBwcm9wZXJ0aWVzOyB3ZSBhc3N1bWUgdGhlc2UgYXJlIGFscmVhZHkgZGFzaC1jYXNlZCBpLmUuOlxuICAgICAgLy8gIGAtLW15LWJ1dHRvbi1jb2xvcmAgLS0+IGAtLW15LWJ1dHRvbi1jb2xvcmBcbiAgICAgIHByb3AgPSBwcm9wXG4gICAgICAgIC5yZXBsYWNlKC8oPzpeKHdlYmtpdHxtb3p8bXN8byl8KSg/PVtBLVpdKS9nLCAnLSQmJylcbiAgICAgICAgLnRvTG93ZXJDYXNlKCk7XG4gICAgICByZXR1cm4gc3R5bGUgKyBgJHtwcm9wfToke3ZhbHVlfTtgO1xuICAgIH0sICcnKTtcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShwYXJ0OiBBdHRyaWJ1dGVQYXJ0LCBbc3R5bGVJbmZvXTogRGlyZWN0aXZlUGFyYW1ldGVyczx0aGlzPikge1xuICAgIGNvbnN0IHtzdHlsZX0gPSBwYXJ0LmVsZW1lbnQgYXMgSFRNTEVsZW1lbnQ7XG5cbiAgICBpZiAodGhpcy5fcHJldmlvdXNTdHlsZVByb3BlcnRpZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fcHJldmlvdXNTdHlsZVByb3BlcnRpZXMgPSBuZXcgU2V0KCk7XG4gICAgICBmb3IgKGNvbnN0IG5hbWUgaW4gc3R5bGVJbmZvKSB7XG4gICAgICAgIHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzLmFkZChuYW1lKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnJlbmRlcihzdHlsZUluZm8pO1xuICAgIH1cblxuICAgIC8vIFJlbW92ZSBvbGQgcHJvcGVydGllcyB0aGF0IG5vIGxvbmdlciBleGlzdCBpbiBzdHlsZUluZm9cbiAgICAvLyBXZSB1c2UgZm9yRWFjaCgpIGluc3RlYWQgb2YgZm9yLW9mIHNvIHRoYXQgcmUgZG9uJ3QgcmVxdWlyZSBkb3duLWxldmVsXG4gICAgLy8gaXRlcmF0aW9uLlxuICAgIHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzIS5mb3JFYWNoKChuYW1lKSA9PiB7XG4gICAgICAvLyBJZiB0aGUgbmFtZSBpc24ndCBpbiBzdHlsZUluZm8gb3IgaXQncyBudWxsL3VuZGVmaW5lZFxuICAgICAgaWYgKHN0eWxlSW5mb1tuYW1lXSA9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzIS5kZWxldGUobmFtZSk7XG4gICAgICAgIGlmIChuYW1lLmluY2x1ZGVzKCctJykpIHtcbiAgICAgICAgICBzdHlsZS5yZW1vdmVQcm9wZXJ0eShuYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBOb3RlIHJlc2V0IHVzaW5nIGVtcHR5IHN0cmluZyAodnMgbnVsbCkgYXMgSUUxMSBkb2VzIG5vdCBhbHdheXNcbiAgICAgICAgICAvLyByZXNldCB2aWEgbnVsbCAoaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0VsZW1lbnRDU1NJbmxpbmVTdHlsZS9zdHlsZSNzZXR0aW5nX3N0eWxlcylcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICAgIChzdHlsZSBhcyBhbnkpW25hbWVdID0gJyc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIEFkZCBvciB1cGRhdGUgcHJvcGVydGllc1xuICAgIGZvciAoY29uc3QgbmFtZSBpbiBzdHlsZUluZm8pIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gc3R5bGVJbmZvW25hbWVdO1xuICAgICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5fcHJldmlvdXNTdHlsZVByb3BlcnRpZXMuYWRkKG5hbWUpO1xuICAgICAgICBpZiAobmFtZS5pbmNsdWRlcygnLScpKSB7XG4gICAgICAgICAgc3R5bGUuc2V0UHJvcGVydHkobmFtZSwgdmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICAgICAgKHN0eWxlIGFzIGFueSlbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGRpcmVjdGl2ZSB0aGF0IGFwcGxpZXMgQ1NTIHByb3BlcnRpZXMgdG8gYW4gZWxlbWVudC5cbiAqXG4gKiBgc3R5bGVNYXBgIGNhbiBvbmx5IGJlIHVzZWQgaW4gdGhlIGBzdHlsZWAgYXR0cmlidXRlIGFuZCBtdXN0IGJlIHRoZSBvbmx5XG4gKiBleHByZXNzaW9uIGluIHRoZSBhdHRyaWJ1dGUuIEl0IHRha2VzIHRoZSBwcm9wZXJ0eSBuYW1lcyBpbiB0aGUgYHN0eWxlSW5mb2BcbiAqIG9iamVjdCBhbmQgYWRkcyB0aGUgcHJvcGVydHkgdmFsdWVzIGFzIENTUyBwcm9wZXJ0aWVzLiBQcm9wZXJ0eSBuYW1lcyB3aXRoXG4gKiBkYXNoZXMgKGAtYCkgYXJlIGFzc3VtZWQgdG8gYmUgdmFsaWQgQ1NTIHByb3BlcnR5IG5hbWVzIGFuZCBzZXQgb24gdGhlXG4gKiBlbGVtZW50J3Mgc3R5bGUgb2JqZWN0IHVzaW5nIGBzZXRQcm9wZXJ0eSgpYC4gTmFtZXMgd2l0aG91dCBkYXNoZXMgYXJlXG4gKiBhc3N1bWVkIHRvIGJlIGNhbWVsQ2FzZWQgSmF2YVNjcmlwdCBwcm9wZXJ0eSBuYW1lcyBhbmQgc2V0IG9uIHRoZSBlbGVtZW50J3NcbiAqIHN0eWxlIG9iamVjdCB1c2luZyBwcm9wZXJ0eSBhc3NpZ25tZW50LCBhbGxvd2luZyB0aGUgc3R5bGUgb2JqZWN0IHRvXG4gKiB0cmFuc2xhdGUgSmF2YVNjcmlwdC1zdHlsZSBuYW1lcyB0byBDU1MgcHJvcGVydHkgbmFtZXMuXG4gKlxuICogRm9yIGV4YW1wbGUgYHN0eWxlTWFwKHtiYWNrZ3JvdW5kQ29sb3I6ICdyZWQnLCAnYm9yZGVyLXRvcCc6ICc1cHgnLCAnLS1zaXplJzpcbiAqICcwJ30pYCBzZXRzIHRoZSBgYmFja2dyb3VuZC1jb2xvcmAsIGBib3JkZXItdG9wYCBhbmQgYC0tc2l6ZWAgcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0gc3R5bGVJbmZvXG4gKi9cbmV4cG9ydCBjb25zdCBzdHlsZU1hcCA9IGRpcmVjdGl2ZShTdHlsZU1hcERpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7U3R5bGVNYXBEaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjAgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7bm9DaGFuZ2V9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7ZGlyZWN0aXZlLCBEaXJlY3RpdmUsIFBhcnRJbmZvLCBQYXJ0VHlwZX0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcblxuY2xhc3MgVGVtcGxhdGVDb250ZW50RGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgcHJpdmF0ZSBfcHJldmlvdXNUZW1wbGF0ZT86IEhUTUxUZW1wbGF0ZUVsZW1lbnQ7XG5cbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICAgIGlmIChwYXJ0SW5mby50eXBlICE9PSBQYXJ0VHlwZS5DSElMRCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCd0ZW1wbGF0ZUNvbnRlbnQgY2FuIG9ubHkgYmUgdXNlZCBpbiBjaGlsZCBiaW5kaW5ncycpO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlcih0ZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudCkge1xuICAgIGlmICh0aGlzLl9wcmV2aW91c1RlbXBsYXRlID09PSB0ZW1wbGF0ZSkge1xuICAgICAgcmV0dXJuIG5vQ2hhbmdlO1xuICAgIH1cbiAgICB0aGlzLl9wcmV2aW91c1RlbXBsYXRlID0gdGVtcGxhdGU7XG4gICAgcmV0dXJuIGRvY3VtZW50LmltcG9ydE5vZGUodGVtcGxhdGUuY29udGVudCwgdHJ1ZSk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW5kZXJzIHRoZSBjb250ZW50IG9mIGEgdGVtcGxhdGUgZWxlbWVudCBhcyBIVE1MLlxuICpcbiAqIE5vdGUsIHRoZSB0ZW1wbGF0ZSBzaG91bGQgYmUgZGV2ZWxvcGVyIGNvbnRyb2xsZWQgYW5kIG5vdCB1c2VyIGNvbnRyb2xsZWQuXG4gKiBSZW5kZXJpbmcgYSB1c2VyLWNvbnRyb2xsZWQgdGVtcGxhdGUgd2l0aCB0aGlzIGRpcmVjdGl2ZVxuICogY291bGQgbGVhZCB0byBjcm9zcy1zaXRlLXNjcmlwdGluZyB2dWxuZXJhYmlsaXRpZXMuXG4gKi9cbmV4cG9ydCBjb25zdCB0ZW1wbGF0ZUNvbnRlbnQgPSBkaXJlY3RpdmUoVGVtcGxhdGVDb250ZW50RGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtUZW1wbGF0ZUNvbnRlbnREaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7bm90aGluZywgVGVtcGxhdGVSZXN1bHQsIG5vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgRGlyZWN0aXZlLCBQYXJ0SW5mbywgUGFydFR5cGV9IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5cbmNvbnN0IEhUTUxfUkVTVUxUID0gMTtcblxuZXhwb3J0IGNsYXNzIFVuc2FmZUhUTUxEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBzdGF0aWMgZGlyZWN0aXZlTmFtZSA9ICd1bnNhZmVIVE1MJztcbiAgc3RhdGljIHJlc3VsdFR5cGUgPSBIVE1MX1JFU1VMVDtcblxuICBwcml2YXRlIF92YWx1ZTogdW5rbm93biA9IG5vdGhpbmc7XG4gIHByaXZhdGUgX3RlbXBsYXRlUmVzdWx0PzogVGVtcGxhdGVSZXN1bHQ7XG5cbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICAgIGlmIChwYXJ0SW5mby50eXBlICE9PSBQYXJ0VHlwZS5DSElMRCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgJHtcbiAgICAgICAgICAodGhpcy5jb25zdHJ1Y3RvciBhcyB0eXBlb2YgVW5zYWZlSFRNTERpcmVjdGl2ZSkuZGlyZWN0aXZlTmFtZVxuICAgICAgICB9KCkgY2FuIG9ubHkgYmUgdXNlZCBpbiBjaGlsZCBiaW5kaW5nc2BcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcmVuZGVyKHZhbHVlOiBzdHJpbmcgfCB0eXBlb2Ygbm90aGluZyB8IHR5cGVvZiBub0NoYW5nZSB8IHVuZGVmaW5lZCB8IG51bGwpIHtcbiAgICBpZiAodmFsdWUgPT09IG5vdGhpbmcgfHwgdmFsdWUgPT0gbnVsbCkge1xuICAgICAgdGhpcy5fdGVtcGxhdGVSZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICByZXR1cm4gKHRoaXMuX3ZhbHVlID0gdmFsdWUpO1xuICAgIH1cbiAgICBpZiAodmFsdWUgPT09IG5vQ2hhbmdlKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgdmFsdWUgIT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYCR7XG4gICAgICAgICAgKHRoaXMuY29uc3RydWN0b3IgYXMgdHlwZW9mIFVuc2FmZUhUTUxEaXJlY3RpdmUpLmRpcmVjdGl2ZU5hbWVcbiAgICAgICAgfSgpIGNhbGxlZCB3aXRoIGEgbm9uLXN0cmluZyB2YWx1ZWBcbiAgICAgICk7XG4gICAgfVxuICAgIGlmICh2YWx1ZSA9PT0gdGhpcy5fdmFsdWUpIHtcbiAgICAgIHJldHVybiB0aGlzLl90ZW1wbGF0ZVJlc3VsdDtcbiAgICB9XG4gICAgdGhpcy5fdmFsdWUgPSB2YWx1ZTtcbiAgICBjb25zdCBzdHJpbmdzID0gW3ZhbHVlXSBhcyB1bmtub3duIGFzIFRlbXBsYXRlU3RyaW5nc0FycmF5O1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgKHN0cmluZ3MgYXMgYW55KS5yYXcgPSBzdHJpbmdzO1xuICAgIC8vIFdBUk5JTkc6IGltcGVyc29uYXRpbmcgYSBUZW1wbGF0ZVJlc3VsdCBsaWtlIHRoaXMgaXMgZXh0cmVtZWx5XG4gICAgLy8gZGFuZ2Vyb3VzLiBUaGlyZC1wYXJ0eSBkaXJlY3RpdmVzIHNob3VsZCBub3QgZG8gdGhpcy5cbiAgICByZXR1cm4gKHRoaXMuX3RlbXBsYXRlUmVzdWx0ID0ge1xuICAgICAgLy8gQ2FzdCB0byBhIGtub3duIHNldCBvZiBpbnRlZ2VycyB0aGF0IHNhdGlzZnkgUmVzdWx0VHlwZSBzbyB0aGF0IHdlXG4gICAgICAvLyBkb24ndCBoYXZlIHRvIGV4cG9ydCBSZXN1bHRUeXBlIGFuZCBwb3NzaWJseSBlbmNvdXJhZ2UgdGhpcyBwYXR0ZXJuLlxuICAgICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICAgIFsnXyRsaXRUeXBlJCddOiAodGhpcy5jb25zdHJ1Y3RvciBhcyB0eXBlb2YgVW5zYWZlSFRNTERpcmVjdGl2ZSlcbiAgICAgICAgLnJlc3VsdFR5cGUgYXMgMSB8IDIsXG4gICAgICBzdHJpbmdzLFxuICAgICAgdmFsdWVzOiBbXSxcbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbmRlcnMgdGhlIHJlc3VsdCBhcyBIVE1MLCByYXRoZXIgdGhhbiB0ZXh0LlxuICpcbiAqIFRoZSB2YWx1ZXMgYHVuZGVmaW5lZGAsIGBudWxsYCwgYW5kIGBub3RoaW5nYCwgd2lsbCBhbGwgcmVzdWx0IGluIG5vIGNvbnRlbnRcbiAqIChlbXB0eSBzdHJpbmcpIGJlaW5nIHJlbmRlcmVkLlxuICpcbiAqIE5vdGUsIHRoaXMgaXMgdW5zYWZlIHRvIHVzZSB3aXRoIGFueSB1c2VyLXByb3ZpZGVkIGlucHV0IHRoYXQgaGFzbid0IGJlZW5cbiAqIHNhbml0aXplZCBvciBlc2NhcGVkLCBhcyBpdCBtYXkgbGVhZCB0byBjcm9zcy1zaXRlLXNjcmlwdGluZ1xuICogdnVsbmVyYWJpbGl0aWVzLlxuICovXG5leHBvcnQgY29uc3QgdW5zYWZlSFRNTCA9IGRpcmVjdGl2ZShVbnNhZmVIVE1MRGlyZWN0aXZlKTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge2RpcmVjdGl2ZX0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7VW5zYWZlSFRNTERpcmVjdGl2ZX0gZnJvbSAnLi91bnNhZmUtaHRtbC5qcyc7XG5cbmNvbnN0IFNWR19SRVNVTFQgPSAyO1xuXG5jbGFzcyBVbnNhZmVTVkdEaXJlY3RpdmUgZXh0ZW5kcyBVbnNhZmVIVE1MRGlyZWN0aXZlIHtcbiAgc3RhdGljIG92ZXJyaWRlIGRpcmVjdGl2ZU5hbWUgPSAndW5zYWZlU1ZHJztcbiAgc3RhdGljIG92ZXJyaWRlIHJlc3VsdFR5cGUgPSBTVkdfUkVTVUxUO1xufVxuXG4vKipcbiAqIFJlbmRlcnMgdGhlIHJlc3VsdCBhcyBTVkcsIHJhdGhlciB0aGFuIHRleHQuXG4gKlxuICogVGhlIHZhbHVlcyBgdW5kZWZpbmVkYCwgYG51bGxgLCBhbmQgYG5vdGhpbmdgLCB3aWxsIGFsbCByZXN1bHQgaW4gbm8gY29udGVudFxuICogKGVtcHR5IHN0cmluZykgYmVpbmcgcmVuZGVyZWQuXG4gKlxuICogTm90ZSwgdGhpcyBpcyB1bnNhZmUgdG8gdXNlIHdpdGggYW55IHVzZXItcHJvdmlkZWQgaW5wdXQgdGhhdCBoYXNuJ3QgYmVlblxuICogc2FuaXRpemVkIG9yIGVzY2FwZWQsIGFzIGl0IG1heSBsZWFkIHRvIGNyb3NzLXNpdGUtc2NyaXB0aW5nXG4gKiB2dWxuZXJhYmlsaXRpZXMuXG4gKi9cbmV4cG9ydCBjb25zdCB1bnNhZmVTVkcgPSBkaXJlY3RpdmUoVW5zYWZlU1ZHRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtVbnNhZmVTVkdEaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7UGFydCwgbm9DaGFuZ2V9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7ZGlyZWN0aXZlfSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtpc1ByaW1pdGl2ZX0gZnJvbSAnLi4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuaW1wb3J0IHtBc3luY0RpcmVjdGl2ZX0gZnJvbSAnLi4vYXN5bmMtZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7UGF1c2VyLCBQc2V1ZG9XZWFrUmVmfSBmcm9tICcuL3ByaXZhdGUtYXN5bmMtaGVscGVycy5qcyc7XG5cbmNvbnN0IGlzUHJvbWlzZSA9ICh4OiB1bmtub3duKSA9PiB7XG4gIHJldHVybiAhaXNQcmltaXRpdmUoeCkgJiYgdHlwZW9mICh4IGFzIHt0aGVuPzogdW5rbm93bn0pLnRoZW4gPT09ICdmdW5jdGlvbic7XG59O1xuLy8gRWZmZWN0aXZlbHkgaW5maW5pdHksIGJ1dCBhIFNNSS5cbmNvbnN0IF9pbmZpbml0eSA9IDB4M2ZmZmZmZmY7XG5cbmV4cG9ydCBjbGFzcyBVbnRpbERpcmVjdGl2ZSBleHRlbmRzIEFzeW5jRGlyZWN0aXZlIHtcbiAgcHJpdmF0ZSBfX2xhc3RSZW5kZXJlZEluZGV4OiBudW1iZXIgPSBfaW5maW5pdHk7XG4gIHByaXZhdGUgX192YWx1ZXM6IHVua25vd25bXSA9IFtdO1xuICBwcml2YXRlIF9fd2Vha1RoaXMgPSBuZXcgUHNldWRvV2Vha1JlZih0aGlzKTtcbiAgcHJpdmF0ZSBfX3BhdXNlciA9IG5ldyBQYXVzZXIoKTtcblxuICByZW5kZXIoLi4uYXJnczogQXJyYXk8dW5rbm93bj4pIHtcbiAgICByZXR1cm4gYXJncy5maW5kKCh4KSA9PiAhaXNQcm9taXNlKHgpKSA/PyBub0NoYW5nZTtcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShfcGFydDogUGFydCwgYXJnczogQXJyYXk8dW5rbm93bj4pIHtcbiAgICBjb25zdCBwcmV2aW91c1ZhbHVlcyA9IHRoaXMuX192YWx1ZXM7XG4gICAgbGV0IHByZXZpb3VzTGVuZ3RoID0gcHJldmlvdXNWYWx1ZXMubGVuZ3RoO1xuICAgIHRoaXMuX192YWx1ZXMgPSBhcmdzO1xuXG4gICAgY29uc3Qgd2Vha1RoaXMgPSB0aGlzLl9fd2Vha1RoaXM7XG4gICAgY29uc3QgcGF1c2VyID0gdGhpcy5fX3BhdXNlcjtcblxuICAgIC8vIElmIG91ciBpbml0aWFsIHJlbmRlciBvY2N1cnMgd2hpbGUgZGlzY29ubmVjdGVkLCBlbnN1cmUgdGhhdCB0aGUgcGF1c2VyXG4gICAgLy8gYW5kIHdlYWtUaGlzIGFyZSBpbiB0aGUgZGlzY29ubmVjdGVkIHN0YXRlXG4gICAgaWYgKCF0aGlzLmlzQ29ubmVjdGVkKSB7XG4gICAgICB0aGlzLmRpc2Nvbm5lY3RlZCgpO1xuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gSWYgd2UndmUgcmVuZGVyZWQgYSBoaWdoZXItcHJpb3JpdHkgdmFsdWUgYWxyZWFkeSwgc3RvcC5cbiAgICAgIGlmIChpID4gdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4KSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB2YWx1ZSA9IGFyZ3NbaV07XG5cbiAgICAgIC8vIFJlbmRlciBub24tUHJvbWlzZSB2YWx1ZXMgaW1tZWRpYXRlbHlcbiAgICAgIGlmICghaXNQcm9taXNlKHZhbHVlKSkge1xuICAgICAgICB0aGlzLl9fbGFzdFJlbmRlcmVkSW5kZXggPSBpO1xuICAgICAgICAvLyBTaW5jZSBhIGxvd2VyLXByaW9yaXR5IHZhbHVlIHdpbGwgbmV2ZXIgb3ZlcndyaXRlIGEgaGlnaGVyLXByaW9yaXR5XG4gICAgICAgIC8vIHN5bmNocm9ub3VzIHZhbHVlLCB3ZSBjYW4gc3RvcCBwcm9jZXNzaW5nIG5vdy5cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGlzIGlzIGEgUHJvbWlzZSB3ZSd2ZSBhbHJlYWR5IGhhbmRsZWQsIHNraXAgaXQuXG4gICAgICBpZiAoaSA8IHByZXZpb3VzTGVuZ3RoICYmIHZhbHVlID09PSBwcmV2aW91c1ZhbHVlc1tpXSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gV2UgaGF2ZSBhIFByb21pc2UgdGhhdCB3ZSBoYXZlbid0IHNlZW4gYmVmb3JlLCBzbyBwcmlvcml0aWVzIG1heSBoYXZlXG4gICAgICAvLyBjaGFuZ2VkLiBGb3JnZXQgd2hhdCB3ZSByZW5kZXJlZCBiZWZvcmUuXG4gICAgICB0aGlzLl9fbGFzdFJlbmRlcmVkSW5kZXggPSBfaW5maW5pdHk7XG4gICAgICBwcmV2aW91c0xlbmd0aCA9IDA7XG5cbiAgICAgIC8vIE5vdGUsIHRoZSBjYWxsYmFjayBhdm9pZHMgY2xvc2luZyBvdmVyIGB0aGlzYCBzbyB0aGF0IHRoZSBkaXJlY3RpdmVcbiAgICAgIC8vIGNhbiBiZSBnYydlZCBiZWZvcmUgdGhlIHByb21pc2UgcmVzb2x2ZXM7IGluc3RlYWQgYHRoaXNgIGlzIHJldHJpZXZlZFxuICAgICAgLy8gZnJvbSBgd2Vha1RoaXNgLCB3aGljaCBjYW4gYnJlYWsgdGhlIGhhcmQgcmVmZXJlbmNlIGluIHRoZSBjbG9zdXJlIHdoZW5cbiAgICAgIC8vIHRoZSBkaXJlY3RpdmUgZGlzY29ubmVjdHNcbiAgICAgIFByb21pc2UucmVzb2x2ZSh2YWx1ZSkudGhlbihhc3luYyAocmVzdWx0OiB1bmtub3duKSA9PiB7XG4gICAgICAgIC8vIElmIHdlJ3JlIGRpc2Nvbm5lY3RlZCwgd2FpdCB1bnRpbCB3ZSdyZSAobWF5YmUpIHJlY29ubmVjdGVkXG4gICAgICAgIC8vIFRoZSB3aGlsZSBsb29wIGhlcmUgaGFuZGxlcyB0aGUgY2FzZSB0aGF0IHRoZSBjb25uZWN0aW9uIHN0YXRlXG4gICAgICAgIC8vIHRocmFzaGVzLCBjYXVzaW5nIHRoZSBwYXVzZXIgdG8gcmVzdW1lIGFuZCB0aGVuIGdldCByZS1wYXVzZWRcbiAgICAgICAgd2hpbGUgKHBhdXNlci5nZXQoKSkge1xuICAgICAgICAgIGF3YWl0IHBhdXNlci5nZXQoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBJZiB0aGUgY2FsbGJhY2sgZ2V0cyBoZXJlIGFuZCB0aGVyZSBpcyBubyBgdGhpc2AsIGl0IG1lYW5zIHRoYXQgdGhlXG4gICAgICAgIC8vIGRpcmVjdGl2ZSBoYXMgYmVlbiBkaXNjb25uZWN0ZWQgYW5kIGdhcmJhZ2UgY29sbGVjdGVkIGFuZCB3ZSBkb24ndFxuICAgICAgICAvLyBuZWVkIHRvIGRvIGFueXRoaW5nIGVsc2VcbiAgICAgICAgY29uc3QgX3RoaXMgPSB3ZWFrVGhpcy5kZXJlZigpO1xuICAgICAgICBpZiAoX3RoaXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvbnN0IGluZGV4ID0gX3RoaXMuX192YWx1ZXMuaW5kZXhPZih2YWx1ZSk7XG4gICAgICAgICAgLy8gSWYgc3RhdGUudmFsdWVzIGRvZXNuJ3QgY29udGFpbiB0aGUgdmFsdWUsIHdlJ3ZlIHJlLXJlbmRlcmVkIHdpdGhvdXRcbiAgICAgICAgICAvLyB0aGUgdmFsdWUsIHNvIGRvbid0IHJlbmRlciBpdC4gVGhlbiwgb25seSByZW5kZXIgaWYgdGhlIHZhbHVlIGlzXG4gICAgICAgICAgLy8gaGlnaGVyLXByaW9yaXR5IHRoYW4gd2hhdCdzIGFscmVhZHkgYmVlbiByZW5kZXJlZC5cbiAgICAgICAgICBpZiAoaW5kZXggPiAtMSAmJiBpbmRleCA8IF90aGlzLl9fbGFzdFJlbmRlcmVkSW5kZXgpIHtcbiAgICAgICAgICAgIF90aGlzLl9fbGFzdFJlbmRlcmVkSW5kZXggPSBpbmRleDtcbiAgICAgICAgICAgIF90aGlzLnNldFZhbHVlKHJlc3VsdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cblxuICBvdmVycmlkZSBkaXNjb25uZWN0ZWQoKSB7XG4gICAgdGhpcy5fX3dlYWtUaGlzLmRpc2Nvbm5lY3QoKTtcbiAgICB0aGlzLl9fcGF1c2VyLnBhdXNlKCk7XG4gIH1cblxuICBvdmVycmlkZSByZWNvbm5lY3RlZCgpIHtcbiAgICB0aGlzLl9fd2Vha1RoaXMucmVjb25uZWN0KHRoaXMpO1xuICAgIHRoaXMuX19wYXVzZXIucmVzdW1lKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW5kZXJzIG9uZSBvZiBhIHNlcmllcyBvZiB2YWx1ZXMsIGluY2x1ZGluZyBQcm9taXNlcywgdG8gYSBQYXJ0LlxuICpcbiAqIFZhbHVlcyBhcmUgcmVuZGVyZWQgaW4gcHJpb3JpdHkgb3JkZXIsIHdpdGggdGhlIGZpcnN0IGFyZ3VtZW50IGhhdmluZyB0aGVcbiAqIGhpZ2hlc3QgcHJpb3JpdHkgYW5kIHRoZSBsYXN0IGFyZ3VtZW50IGhhdmluZyB0aGUgbG93ZXN0IHByaW9yaXR5LiBJZiBhXG4gKiB2YWx1ZSBpcyBhIFByb21pc2UsIGxvdy1wcmlvcml0eSB2YWx1ZXMgd2lsbCBiZSByZW5kZXJlZCB1bnRpbCBpdCByZXNvbHZlcy5cbiAqXG4gKiBUaGUgcHJpb3JpdHkgb2YgdmFsdWVzIGNhbiBiZSB1c2VkIHRvIGNyZWF0ZSBwbGFjZWhvbGRlciBjb250ZW50IGZvciBhc3luY1xuICogZGF0YS4gRm9yIGV4YW1wbGUsIGEgUHJvbWlzZSB3aXRoIHBlbmRpbmcgY29udGVudCBjYW4gYmUgdGhlIGZpcnN0LFxuICogaGlnaGVzdC1wcmlvcml0eSwgYXJndW1lbnQsIGFuZCBhIG5vbl9wcm9taXNlIGxvYWRpbmcgaW5kaWNhdG9yIHRlbXBsYXRlIGNhblxuICogYmUgdXNlZCBhcyB0aGUgc2Vjb25kLCBsb3dlci1wcmlvcml0eSwgYXJndW1lbnQuIFRoZSBsb2FkaW5nIGluZGljYXRvciB3aWxsXG4gKiByZW5kZXIgaW1tZWRpYXRlbHksIGFuZCB0aGUgcHJpbWFyeSBjb250ZW50IHdpbGwgcmVuZGVyIHdoZW4gdGhlIFByb21pc2VcbiAqIHJlc29sdmVzLlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogYGBganNcbiAqIGNvbnN0IGNvbnRlbnQgPSBmZXRjaCgnLi9jb250ZW50LnR4dCcpLnRoZW4ociA9PiByLnRleHQoKSk7XG4gKiBodG1sYCR7dW50aWwoY29udGVudCwgaHRtbGA8c3Bhbj5Mb2FkaW5nLi4uPC9zcGFuPmApfWBcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgdW50aWwgPSBkaXJlY3RpdmUoVW50aWxEaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuLy8gZXhwb3J0IHR5cGUge1VudGlsRGlyZWN0aXZlfTtcbiIsImV4cG9ydCB7XG4gICAgVGVtcGxhdGVSZXN1bHQsXG4gICAgSFRNTFRlbXBsYXRlUmVzdWx0LFxuICAgIFNWR1RlbXBsYXRlUmVzdWx0LFxuICAgIFJlbmRlck9wdGlvbnMsXG4gICAgaHRtbCxcbiAgICBzdmcsXG4gICAgcmVuZGVyLFxuICAgIG5vQ2hhbmdlLFxuICAgIG5vdGhpbmcsXG59IGZyb20gJ2xpdC1odG1sJztcblxuaW1wb3J0IHtcbiAgICBfJExILFxuICAgIEF0dHJpYnV0ZVBhcnQsXG4gICAgUHJvcGVydHlQYXJ0LFxuICAgIEJvb2xlYW5BdHRyaWJ1dGVQYXJ0LFxuICAgIEV2ZW50UGFydCxcbiAgICBFbGVtZW50UGFydCxcbn0gZnJvbSAnbGl0LWh0bWwnO1xuZXhwb3J0IGNvbnN0IF/OoyA9IHtcbiAgICBBdHRyaWJ1dGVQYXJ0OiBfJExILl9BdHRyaWJ1dGVQYXJ0IGFzIHVua25vd24gYXMgQXR0cmlidXRlUGFydCxcbiAgICBQcm9wZXJ0eVBhcnQ6IF8kTEguX1Byb3BlcnR5UGFydCBhcyB1bmtub3duIGFzIFByb3BlcnR5UGFydCxcbiAgICBCb29sZWFuQXR0cmlidXRlUGFydDogXyRMSC5fQm9vbGVhbkF0dHJpYnV0ZVBhcnQgYXMgdW5rbm93biBhcyBCb29sZWFuQXR0cmlidXRlUGFydCxcbiAgICBFdmVudFBhcnQ6IF8kTEguX0V2ZW50UGFydCBhcyB1bmtub3duIGFzIEV2ZW50UGFydCxcbiAgICBFbGVtZW50UGFydDogXyRMSC5fRWxlbWVudFBhcnQgYXMgdW5rbm93biBhcyBFbGVtZW50UGFydCxcbn07XG5cbmV4cG9ydCB7XG4gICAgRGlyZWN0aXZlLFxuICAgIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG4gICAgUGFydCxcbiAgICBQYXJ0SW5mbyxcbiAgICBQYXJ0VHlwZSxcbiAgICBkaXJlY3RpdmUsXG59IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZSc7XG5leHBvcnQgeyBBc3luY0RpcmVjdGl2ZSB9IGZyb20gJ2xpdC1odG1sL2FzeW5jLWRpcmVjdGl2ZSc7XG5cbmltcG9ydCB7IGFzeW5jQXBwZW5kIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9hc3luYy1hcHBlbmQnO1xuaW1wb3J0IHsgYXN5bmNSZXBsYWNlIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9hc3luYy1yZXBsYWNlJztcbmltcG9ydCB7IGNhY2hlIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9jYWNoZSc7XG5pbXBvcnQgeyBjbGFzc01hcCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvY2xhc3MtbWFwJztcbmltcG9ydCB7IGd1YXJkIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9ndWFyZCc7XG5pbXBvcnQgeyBpZkRlZmluZWQgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2lmLWRlZmluZWQnO1xuaW1wb3J0IHsgbGl2ZSB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvbGl2ZSc7XG5pbXBvcnQgeyByZWYgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3JlZic7XG5leHBvcnQgeyBSZWYsIGNyZWF0ZVJlZiB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvcmVmJztcbmltcG9ydCB7IHJlcGVhdCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvcmVwZWF0JztcbmltcG9ydCB7IHN0eWxlTWFwIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9zdHlsZS1tYXAnO1xuaW1wb3J0IHsgdGVtcGxhdGVDb250ZW50IH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy90ZW1wbGF0ZS1jb250ZW50JztcbmltcG9ydCB7IHVuc2FmZUhUTUwgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3Vuc2FmZS1odG1sJztcbmltcG9ydCB7IHVuc2FmZVNWRyB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvdW5zYWZlLXN2Zyc7XG5pbXBvcnQgeyB1bnRpbCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvdW50aWwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlRGlyZWN0aXZlcyB7XG4gICAgYXN5bmNBcHBlbmQ6IHR5cGVvZiBhc3luY0FwcGVuZDtcbiAgICBhc3luY1JlcGxhY2U6IHR5cGVvZiBhc3luY1JlcGxhY2U7XG4gICAgY2FjaGU6IHR5cGVvZiBjYWNoZTtcbiAgICBjbGFzc01hcDogdHlwZW9mIGNsYXNzTWFwO1xuICAgIGd1YXJkOiB0eXBlb2YgZ3VhcmQ7XG4gICAgaWZEZWZpbmVkOiB0eXBlb2YgaWZEZWZpbmVkO1xuICAgIGxpdmU6IHR5cGVvZiBsaXZlO1xuICAgIHJlZjogdHlwZW9mIHJlZjtcbiAgICByZXBlYXQ6IHR5cGVvZiByZXBlYXQ7XG4gICAgc3R5bGVNYXA6IHR5cGVvZiBzdHlsZU1hcDtcbiAgICB0ZW1wbGF0ZUNvbnRlbnQ6IHR5cGVvZiB0ZW1wbGF0ZUNvbnRlbnQ7XG4gICAgdW5zYWZlSFRNTDogdHlwZW9mIHVuc2FmZUhUTUw7XG4gICAgdW5zYWZlU1ZHOiB0eXBlb2YgdW5zYWZlU1ZHO1xuICAgIHVudGlsOiB0eXBlb2YgdW50aWw7XG59XG5cbmV4cG9ydCBjb25zdCBkaXJlY3RpdmVzOiBUZW1wbGF0ZURpcmVjdGl2ZXMgPSB7XG4gICAgYXN5bmNBcHBlbmQsXG4gICAgYXN5bmNSZXBsYWNlLFxuICAgIGNhY2hlLFxuICAgIGNsYXNzTWFwLFxuICAgIGd1YXJkLFxuICAgIGlmRGVmaW5lZCxcbiAgICBsaXZlLFxuICAgIHJlZixcbiAgICByZXBlYXQsXG4gICAgc3R5bGVNYXAsXG4gICAgdGVtcGxhdGVDb250ZW50LFxuICAgIHVuc2FmZUhUTUwsXG4gICAgdW5zYWZlU1ZHLFxuICAgIHVudGlsLFxufTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCBmcm9tIGBzdHJpbmdgIHRvIGBUZW1wbGF0ZVN0cmluZ3NBcnJheWAuIDxicj5cbiAqICAgICBUaGlzIG1ldGhvZCBpcyBoZWxwZXIgYnJpZ2RnZSBmb3IgdGhlIFtbaHRtbF1dIG9yIHRoZSBbW3N2Z11dIGFyZSBhYmxlIHRvIHJlY2VpdmVkIHBsYWluIHN0cmluZy5cbiAqIEBqYSBgc3RyaW5nYCDjgpIgYFRlbXBsYXRlU3RyaW5nc0FycmF5YOOBq+WkieaPmy4gPGJyPlxuICogICAgIFtbaHRtbF1dIOOChCBbW3N2Z11dIOOBjOaWh+Wtl+WIl+OCkuWPl+OBkeS7mOOBkeOCi+OBn+OCgeOBruODluODquODg+OCuOODoeOCveODg+ODiVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgdG9UZW1wbGF0ZVN0cmluZ3NBcnJheSBhcyBicmlkZ2UgfSBmcm9tICdAY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZSc7XG4gKlxuICogY29uc3QgcmF3ID0gJzxwPkhlbGxvIFJhdyBTdHJpbmc8L3A+JztcbiAqIHJlbmRlcihodG1sKGJyaWRnZShyYXcpKSwgZG9jdW1lbnQuYm9keSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHBsYWluIHN0cmluZy4gZXgpIFtbSlNUXV0gcmV0dXJuZWQgdmFsdWUuXG4gKiAgLSBgamFgIOODl+ODrOODvOODs+aWh+Wtl+WIly4gZXgpIFtbSlNUXV0g44Gu5oi744KK5YCk44Gq44Gp44KS5oOz5a6aXG4gKi9cbmV4cG9ydCBjb25zdCB0b1RlbXBsYXRlU3RyaW5nc0FycmF5ID0gKHNyYzogc3RyaW5nKTogVGVtcGxhdGVTdHJpbmdzQXJyYXkgPT4ge1xuICAgIGNvbnN0IHRhID0gW3NyY10gYXMgeyByYXc/OiBzdHJpbmdbXTsgfTtcbiAgICB0YS5yYXcgPSBbc3JjXTtcbiAgICByZXR1cm4gdGEgYXMgdW5rbm93biBhcyBUZW1wbGF0ZVN0cmluZ3NBcnJheTtcbn07XG4iXSwibmFtZXMiOlsid3JhcCIsImNyZWF0ZU1hcmtlciIs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R0FBRyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQy9CLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRTt3QkFDdkIsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7Ozs7d0JBSTVDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsbUJBQW1CLEVBQUU7NEJBQ25ELEtBQUssQ0FBQyxtQkFBbUIsR0FBRyxLQUFLLENBQUM7NEJBQ2xDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7eUJBQ3hCO3FCQUNGO2lCQUNGLENBQUMsQ0FBQzthQUNKO1lBRUQsT0FBTyxRQUFRLENBQUM7U0FDakI7UUFFUSxZQUFZO1lBQ25CLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztTQUN2QjtRQUVRLFdBQVc7WUFDbEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztTQUN4QjtLQUNGO0lBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQXFCTyxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7SUFFL0M7Ozs7SUFJQTs7VUNySGEsRUFBRSxHQUFHO1FBQ2QsYUFBYSxFQUFFLElBQUksQ0FBQyxjQUEwQztRQUM5RCxZQUFZLEVBQUUsSUFBSSxDQUFDLGFBQXdDO1FBQzNELG9CQUFvQixFQUFFLElBQUksQ0FBQyxxQkFBd0Q7UUFDbkYsU0FBUyxFQUFFLElBQUksQ0FBQyxVQUFrQztRQUNsRCxXQUFXLEVBQUUsSUFBSSxDQUFDLFlBQXNDO01BQzFEO1VBNkNXLFVBQVUsR0FBdUI7UUFDMUMsV0FBVztRQUNYLFlBQVk7UUFDWixLQUFLO1FBQ0wsUUFBUTtRQUNSLEtBQUs7UUFDTCxTQUFTO1FBQ1QsSUFBSTtRQUNKLEdBQUc7UUFDSCxNQUFNO1FBQ04sUUFBUTtRQUNSLGVBQWU7UUFDZixVQUFVO1FBQ1YsU0FBUztRQUNULEtBQUs7TUFDUDtJQUVGOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O1VBbUJhLHNCQUFzQixHQUFHLENBQUMsR0FBVztRQUM5QyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBd0IsQ0FBQztRQUN4QyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDZixPQUFPLEVBQXFDLENBQUM7SUFDakQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZS8ifQ==
