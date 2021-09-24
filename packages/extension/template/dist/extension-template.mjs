/*!
 * @cdp/extension-template 0.9.9
 *   extension for template engine
 */

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

export { AsyncDirective, Directive, PartType, _Σ, createRef, directive, directives, html, noChange, nothing, render, svg, toTemplateStringsArray };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLm1qcyIsInNvdXJjZXMiOlsibGl0LWh0bWwvc3JjL2xpdC1odG1sLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZS50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmUtaGVscGVycy50cyIsImxpdC1odG1sL3NyYy9hc3luYy1kaXJlY3RpdmUudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9wcml2YXRlLWFzeW5jLWhlbHBlcnMudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9hc3luYy1yZXBsYWNlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvYXN5bmMtYXBwZW5kLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvY2FjaGUudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9jbGFzcy1tYXAudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9ndWFyZC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2lmLWRlZmluZWQudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9saXZlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvcmVmLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvcmVwZWF0LnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvc3R5bGUtbWFwLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvdGVtcGxhdGUtY29udGVudC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3Vuc2FmZS1odG1sLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvdW5zYWZlLXN2Zy50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3VudGlsLnRzIiwiaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbi8vIElNUE9SVEFOVDogdGhlc2UgaW1wb3J0cyBtdXN0IGJlIHR5cGUtb25seVxuaW1wb3J0IHR5cGUge0RpcmVjdGl2ZSwgRGlyZWN0aXZlUmVzdWx0LCBQYXJ0SW5mb30gZnJvbSAnLi9kaXJlY3RpdmUuanMnO1xuXG5jb25zdCBERVZfTU9ERSA9IHRydWU7XG5jb25zdCBFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MgPSB0cnVlO1xuY29uc3QgRU5BQkxFX1NIQURZRE9NX05PUEFUQ0ggPSB0cnVlO1xuXG4vKipcbiAqIGB0cnVlYCBpZiB3ZSdyZSBidWlsZGluZyBmb3IgZ29vZ2xlMyB3aXRoIHRlbXBvcmFyeSBiYWNrLWNvbXBhdCBoZWxwZXJzLlxuICogVGhpcyBleHBvcnQgaXMgbm90IHByZXNlbnQgaW4gcHJvZCBidWlsZHMuXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGNvbnN0IElOVEVSTkFMID0gdHJ1ZTtcblxubGV0IGlzc3VlV2FybmluZzogKGNvZGU6IHN0cmluZywgd2FybmluZzogc3RyaW5nKSA9PiB2b2lkO1xuXG5pZiAoREVWX01PREUpIHtcbiAgZ2xvYmFsVGhpcy5saXRJc3N1ZWRXYXJuaW5ncyA/Pz0gbmV3IFNldCgpO1xuXG4gIC8vIElzc3VlIGEgd2FybmluZywgaWYgd2UgaGF2ZW4ndCBhbHJlYWR5LlxuICBpc3N1ZVdhcm5pbmcgPSAoY29kZTogc3RyaW5nLCB3YXJuaW5nOiBzdHJpbmcpID0+IHtcbiAgICB3YXJuaW5nICs9IGNvZGVcbiAgICAgID8gYCBTZWUgaHR0cHM6Ly9saXQuZGV2L21zZy8ke2NvZGV9IGZvciBtb3JlIGluZm9ybWF0aW9uLmBcbiAgICAgIDogJyc7XG4gICAgaWYgKCFnbG9iYWxUaGlzLmxpdElzc3VlZFdhcm5pbmdzIS5oYXMod2FybmluZykpIHtcbiAgICAgIGNvbnNvbGUud2Fybih3YXJuaW5nKTtcbiAgICAgIGdsb2JhbFRoaXMubGl0SXNzdWVkV2FybmluZ3MhLmFkZCh3YXJuaW5nKTtcbiAgICB9XG4gIH07XG5cbiAgaXNzdWVXYXJuaW5nKFxuICAgICdkZXYtbW9kZScsXG4gICAgYExpdCBpcyBpbiBkZXYgbW9kZS4gTm90IHJlY29tbWVuZGVkIGZvciBwcm9kdWN0aW9uIWBcbiAgKTtcbn1cblxuY29uc3Qgd3JhcCA9XG4gIEVOQUJMRV9TSEFEWURPTV9OT1BBVENIICYmXG4gIHdpbmRvdy5TaGFkeURPTT8uaW5Vc2UgJiZcbiAgd2luZG93LlNoYWR5RE9NPy5ub1BhdGNoID09PSB0cnVlXG4gICAgPyB3aW5kb3cuU2hhZHlET00hLndyYXBcbiAgICA6IChub2RlOiBOb2RlKSA9PiBub2RlO1xuXG5jb25zdCB0cnVzdGVkVHlwZXMgPSAoZ2xvYmFsVGhpcyBhcyB1bmtub3duIGFzIFBhcnRpYWw8V2luZG93PikudHJ1c3RlZFR5cGVzO1xuXG4vKipcbiAqIE91ciBUcnVzdGVkVHlwZVBvbGljeSBmb3IgSFRNTCB3aGljaCBpcyBkZWNsYXJlZCB1c2luZyB0aGUgaHRtbCB0ZW1wbGF0ZVxuICogdGFnIGZ1bmN0aW9uLlxuICpcbiAqIFRoYXQgSFRNTCBpcyBhIGRldmVsb3Blci1hdXRob3JlZCBjb25zdGFudCwgYW5kIGlzIHBhcnNlZCB3aXRoIGlubmVySFRNTFxuICogYmVmb3JlIGFueSB1bnRydXN0ZWQgZXhwcmVzc2lvbnMgaGF2ZSBiZWVuIG1peGVkIGluLiBUaGVyZWZvciBpdCBpc1xuICogY29uc2lkZXJlZCBzYWZlIGJ5IGNvbnN0cnVjdGlvbi5cbiAqL1xuY29uc3QgcG9saWN5ID0gdHJ1c3RlZFR5cGVzXG4gID8gdHJ1c3RlZFR5cGVzLmNyZWF0ZVBvbGljeSgnbGl0LWh0bWwnLCB7XG4gICAgICBjcmVhdGVIVE1MOiAocykgPT4gcyxcbiAgICB9KVxuICA6IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBVc2VkIHRvIHNhbml0aXplIGFueSB2YWx1ZSBiZWZvcmUgaXQgaXMgd3JpdHRlbiBpbnRvIHRoZSBET00uIFRoaXMgY2FuIGJlXG4gKiB1c2VkIHRvIGltcGxlbWVudCBhIHNlY3VyaXR5IHBvbGljeSBvZiBhbGxvd2VkIGFuZCBkaXNhbGxvd2VkIHZhbHVlcyBpblxuICogb3JkZXIgdG8gcHJldmVudCBYU1MgYXR0YWNrcy5cbiAqXG4gKiBPbmUgd2F5IG9mIHVzaW5nIHRoaXMgY2FsbGJhY2sgd291bGQgYmUgdG8gY2hlY2sgYXR0cmlidXRlcyBhbmQgcHJvcGVydGllc1xuICogYWdhaW5zdCBhIGxpc3Qgb2YgaGlnaCByaXNrIGZpZWxkcywgYW5kIHJlcXVpcmUgdGhhdCB2YWx1ZXMgd3JpdHRlbiB0byBzdWNoXG4gKiBmaWVsZHMgYmUgaW5zdGFuY2VzIG9mIGEgY2xhc3Mgd2hpY2ggaXMgc2FmZSBieSBjb25zdHJ1Y3Rpb24uIENsb3N1cmUncyBTYWZlXG4gKiBIVE1MIFR5cGVzIGlzIG9uZSBpbXBsZW1lbnRhdGlvbiBvZiB0aGlzIHRlY2huaXF1ZSAoXG4gKiBodHRwczovL2dpdGh1Yi5jb20vZ29vZ2xlL3NhZmUtaHRtbC10eXBlcy9ibG9iL21hc3Rlci9kb2Mvc2FmZWh0bWwtdHlwZXMubWQpLlxuICogVGhlIFRydXN0ZWRUeXBlcyBwb2x5ZmlsbCBpbiBBUEktb25seSBtb2RlIGNvdWxkIGFsc28gYmUgdXNlZCBhcyBhIGJhc2lzXG4gKiBmb3IgdGhpcyB0ZWNobmlxdWUgKGh0dHBzOi8vZ2l0aHViLmNvbS9XSUNHL3RydXN0ZWQtdHlwZXMpLlxuICpcbiAqIEBwYXJhbSBub2RlIFRoZSBIVE1MIG5vZGUgKHVzdWFsbHkgZWl0aGVyIGEgI3RleHQgbm9kZSBvciBhbiBFbGVtZW50KSB0aGF0XG4gKiAgICAgaXMgYmVpbmcgd3JpdHRlbiB0by4gTm90ZSB0aGF0IHRoaXMgaXMganVzdCBhbiBleGVtcGxhciBub2RlLCB0aGUgd3JpdGVcbiAqICAgICBtYXkgdGFrZSBwbGFjZSBhZ2FpbnN0IGFub3RoZXIgaW5zdGFuY2Ugb2YgdGhlIHNhbWUgY2xhc3Mgb2Ygbm9kZS5cbiAqIEBwYXJhbSBuYW1lIFRoZSBuYW1lIG9mIGFuIGF0dHJpYnV0ZSBvciBwcm9wZXJ0eSAoZm9yIGV4YW1wbGUsICdocmVmJykuXG4gKiBAcGFyYW0gdHlwZSBJbmRpY2F0ZXMgd2hldGhlciB0aGUgd3JpdGUgdGhhdCdzIGFib3V0IHRvIGJlIHBlcmZvcm1lZCB3aWxsXG4gKiAgICAgYmUgdG8gYSBwcm9wZXJ0eSBvciBhIG5vZGUuXG4gKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCB3aWxsIHNhbml0aXplIHRoaXMgY2xhc3Mgb2Ygd3JpdGVzLlxuICovXG5leHBvcnQgdHlwZSBTYW5pdGl6ZXJGYWN0b3J5ID0gKFxuICBub2RlOiBOb2RlLFxuICBuYW1lOiBzdHJpbmcsXG4gIHR5cGU6ICdwcm9wZXJ0eScgfCAnYXR0cmlidXRlJ1xuKSA9PiBWYWx1ZVNhbml0aXplcjtcblxuLyoqXG4gKiBBIGZ1bmN0aW9uIHdoaWNoIGNhbiBzYW5pdGl6ZSB2YWx1ZXMgdGhhdCB3aWxsIGJlIHdyaXR0ZW4gdG8gYSBzcGVjaWZpYyBraW5kXG4gKiBvZiBET00gc2luay5cbiAqXG4gKiBTZWUgU2FuaXRpemVyRmFjdG9yeS5cbiAqXG4gKiBAcGFyYW0gdmFsdWUgVGhlIHZhbHVlIHRvIHNhbml0aXplLiBXaWxsIGJlIHRoZSBhY3R1YWwgdmFsdWUgcGFzc2VkIGludG9cbiAqICAgICB0aGUgbGl0LWh0bWwgdGVtcGxhdGUgbGl0ZXJhbCwgc28gdGhpcyBjb3VsZCBiZSBvZiBhbnkgdHlwZS5cbiAqIEByZXR1cm4gVGhlIHZhbHVlIHRvIHdyaXRlIHRvIHRoZSBET00uIFVzdWFsbHkgdGhlIHNhbWUgYXMgdGhlIGlucHV0IHZhbHVlLFxuICogICAgIHVubGVzcyBzYW5pdGl6YXRpb24gaXMgbmVlZGVkLlxuICovXG5leHBvcnQgdHlwZSBWYWx1ZVNhbml0aXplciA9ICh2YWx1ZTogdW5rbm93bikgPT4gdW5rbm93bjtcblxuY29uc3QgaWRlbnRpdHlGdW5jdGlvbjogVmFsdWVTYW5pdGl6ZXIgPSAodmFsdWU6IHVua25vd24pID0+IHZhbHVlO1xuY29uc3Qgbm9vcFNhbml0aXplcjogU2FuaXRpemVyRmFjdG9yeSA9IChcbiAgX25vZGU6IE5vZGUsXG4gIF9uYW1lOiBzdHJpbmcsXG4gIF90eXBlOiAncHJvcGVydHknIHwgJ2F0dHJpYnV0ZSdcbikgPT4gaWRlbnRpdHlGdW5jdGlvbjtcblxuLyoqIFNldHMgdGhlIGdsb2JhbCBzYW5pdGl6ZXIgZmFjdG9yeS4gKi9cbmNvbnN0IHNldFNhbml0aXplciA9IChuZXdTYW5pdGl6ZXI6IFNhbml0aXplckZhY3RvcnkpID0+IHtcbiAgaWYgKCFFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKHNhbml0aXplckZhY3RvcnlJbnRlcm5hbCAhPT0gbm9vcFNhbml0aXplcikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBBdHRlbXB0ZWQgdG8gb3ZlcndyaXRlIGV4aXN0aW5nIGxpdC1odG1sIHNlY3VyaXR5IHBvbGljeS5gICtcbiAgICAgICAgYCBzZXRTYW5pdGl6ZURPTVZhbHVlRmFjdG9yeSBzaG91bGQgYmUgY2FsbGVkIGF0IG1vc3Qgb25jZS5gXG4gICAgKTtcbiAgfVxuICBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwgPSBuZXdTYW5pdGl6ZXI7XG59O1xuXG4vKipcbiAqIE9ubHkgdXNlZCBpbiBpbnRlcm5hbCB0ZXN0cywgbm90IGEgcGFydCBvZiB0aGUgcHVibGljIEFQSS5cbiAqL1xuY29uc3QgX3Rlc3RPbmx5Q2xlYXJTYW5pdGl6ZXJGYWN0b3J5RG9Ob3RDYWxsT3JFbHNlID0gKCkgPT4ge1xuICBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwgPSBub29wU2FuaXRpemVyO1xufTtcblxuY29uc3QgY3JlYXRlU2FuaXRpemVyOiBTYW5pdGl6ZXJGYWN0b3J5ID0gKG5vZGUsIG5hbWUsIHR5cGUpID0+IHtcbiAgcmV0dXJuIHNhbml0aXplckZhY3RvcnlJbnRlcm5hbChub2RlLCBuYW1lLCB0eXBlKTtcbn07XG5cbi8vIEFkZGVkIHRvIGFuIGF0dHJpYnV0ZSBuYW1lIHRvIG1hcmsgdGhlIGF0dHJpYnV0ZSBhcyBib3VuZCBzbyB3ZSBjYW4gZmluZFxuLy8gaXQgZWFzaWx5LlxuY29uc3QgYm91bmRBdHRyaWJ1dGVTdWZmaXggPSAnJGxpdCQnO1xuXG4vLyBUaGlzIG1hcmtlciBpcyB1c2VkIGluIG1hbnkgc3ludGFjdGljIHBvc2l0aW9ucyBpbiBIVE1MLCBzbyBpdCBtdXN0IGJlXG4vLyBhIHZhbGlkIGVsZW1lbnQgbmFtZSBhbmQgYXR0cmlidXRlIG5hbWUuIFdlIGRvbid0IHN1cHBvcnQgZHluYW1pYyBuYW1lcyAoeWV0KVxuLy8gYnV0IHRoaXMgYXQgbGVhc3QgZW5zdXJlcyB0aGF0IHRoZSBwYXJzZSB0cmVlIGlzIGNsb3NlciB0byB0aGUgdGVtcGxhdGVcbi8vIGludGVudGlvbi5cbmNvbnN0IG1hcmtlciA9IGBsaXQkJHtTdHJpbmcoTWF0aC5yYW5kb20oKSkuc2xpY2UoOSl9JGA7XG5cbi8vIFN0cmluZyB1c2VkIHRvIHRlbGwgaWYgYSBjb21tZW50IGlzIGEgbWFya2VyIGNvbW1lbnRcbmNvbnN0IG1hcmtlck1hdGNoID0gJz8nICsgbWFya2VyO1xuXG4vLyBUZXh0IHVzZWQgdG8gaW5zZXJ0IGEgY29tbWVudCBtYXJrZXIgbm9kZS4gV2UgdXNlIHByb2Nlc3NpbmcgaW5zdHJ1Y3Rpb25cbi8vIHN5bnRheCBiZWNhdXNlIGl0J3Mgc2xpZ2h0bHkgc21hbGxlciwgYnV0IHBhcnNlcyBhcyBhIGNvbW1lbnQgbm9kZS5cbmNvbnN0IG5vZGVNYXJrZXIgPSBgPCR7bWFya2VyTWF0Y2h9PmA7XG5cbmNvbnN0IGQgPSBkb2N1bWVudDtcblxuLy8gQ3JlYXRlcyBhIGR5bmFtaWMgbWFya2VyLiBXZSBuZXZlciBoYXZlIHRvIHNlYXJjaCBmb3IgdGhlc2UgaW4gdGhlIERPTS5cbmNvbnN0IGNyZWF0ZU1hcmtlciA9ICh2ID0gJycpID0+IGQuY3JlYXRlQ29tbWVudCh2KTtcblxuLy8gaHR0cHM6Ly90YzM5LmdpdGh1Yi5pby9lY21hMjYyLyNzZWMtdHlwZW9mLW9wZXJhdG9yXG50eXBlIFByaW1pdGl2ZSA9IG51bGwgfCB1bmRlZmluZWQgfCBib29sZWFuIHwgbnVtYmVyIHwgc3RyaW5nIHwgc3ltYm9sIHwgYmlnaW50O1xuY29uc3QgaXNQcmltaXRpdmUgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBQcmltaXRpdmUgPT5cbiAgdmFsdWUgPT09IG51bGwgfHwgKHR5cGVvZiB2YWx1ZSAhPSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsdWUgIT0gJ2Z1bmN0aW9uJyk7XG5jb25zdCBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcbmNvbnN0IGlzSXRlcmFibGUgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBJdGVyYWJsZTx1bmtub3duPiA9PlxuICBpc0FycmF5KHZhbHVlKSB8fFxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICB0eXBlb2YgKHZhbHVlIGFzIGFueSk/LltTeW1ib2wuaXRlcmF0b3JdID09PSAnZnVuY3Rpb24nO1xuXG5jb25zdCBTUEFDRV9DSEFSID0gYFsgXFx0XFxuXFxmXFxyXWA7XG5jb25zdCBBVFRSX1ZBTFVFX0NIQVIgPSBgW14gXFx0XFxuXFxmXFxyXCInXFxgPD49XWA7XG5jb25zdCBOQU1FX0NIQVIgPSBgW15cXFxcc1wiJz49L11gO1xuXG4vLyBUaGVzZSByZWdleGVzIHJlcHJlc2VudCB0aGUgZml2ZSBwYXJzaW5nIHN0YXRlcyB0aGF0IHdlIGNhcmUgYWJvdXQgaW4gdGhlXG4vLyBUZW1wbGF0ZSdzIEhUTUwgc2Nhbm5lci4gVGhleSBtYXRjaCB0aGUgKmVuZCogb2YgdGhlIHN0YXRlIHRoZXkncmUgbmFtZWRcbi8vIGFmdGVyLlxuLy8gRGVwZW5kaW5nIG9uIHRoZSBtYXRjaCwgd2UgdHJhbnNpdGlvbiB0byBhIG5ldyBzdGF0ZS4gSWYgdGhlcmUncyBubyBtYXRjaCxcbi8vIHdlIHN0YXkgaW4gdGhlIHNhbWUgc3RhdGUuXG4vLyBOb3RlIHRoYXQgdGhlIHJlZ2V4ZXMgYXJlIHN0YXRlZnVsLiBXZSB1dGlsaXplIGxhc3RJbmRleCBhbmQgc3luYyBpdFxuLy8gYWNyb3NzIHRoZSBtdWx0aXBsZSByZWdleGVzIHVzZWQuIEluIGFkZGl0aW9uIHRvIHRoZSBmaXZlIHJlZ2V4ZXMgYmVsb3dcbi8vIHdlIGFsc28gZHluYW1pY2FsbHkgY3JlYXRlIGEgcmVnZXggdG8gZmluZCB0aGUgbWF0Y2hpbmcgZW5kIHRhZ3MgZm9yIHJhd1xuLy8gdGV4dCBlbGVtZW50cy5cblxuLyoqXG4gKiBFbmQgb2YgdGV4dCBpczogYDxgIGZvbGxvd2VkIGJ5OlxuICogICAoY29tbWVudCBzdGFydCkgb3IgKHRhZykgb3IgKGR5bmFtaWMgdGFnIGJpbmRpbmcpXG4gKi9cbmNvbnN0IHRleHRFbmRSZWdleCA9IC88KD86KCEtLXxcXC9bXmEtekEtWl0pfChcXC8/W2EtekEtWl1bXj5cXHNdKil8KFxcLz8kKSkvZztcbmNvbnN0IENPTU1FTlRfU1RBUlQgPSAxO1xuY29uc3QgVEFHX05BTUUgPSAyO1xuY29uc3QgRFlOQU1JQ19UQUdfTkFNRSA9IDM7XG5cbmNvbnN0IGNvbW1lbnRFbmRSZWdleCA9IC8tLT4vZztcbi8qKlxuICogQ29tbWVudHMgbm90IHN0YXJ0ZWQgd2l0aCA8IS0tLCBsaWtlIDwveywgY2FuIGJlIGVuZGVkIGJ5IGEgc2luZ2xlIGA+YFxuICovXG5jb25zdCBjb21tZW50MkVuZFJlZ2V4ID0gLz4vZztcblxuLyoqXG4gKiBUaGUgdGFnRW5kIHJlZ2V4IG1hdGNoZXMgdGhlIGVuZCBvZiB0aGUgXCJpbnNpZGUgYW4gb3BlbmluZ1wiIHRhZyBzeW50YXhcbiAqIHBvc2l0aW9uLiBJdCBlaXRoZXIgbWF0Y2hlcyBhIGA+YCwgYW4gYXR0cmlidXRlLWxpa2Ugc2VxdWVuY2UsIG9yIHRoZSBlbmRcbiAqIG9mIHRoZSBzdHJpbmcgYWZ0ZXIgYSBzcGFjZSAoYXR0cmlidXRlLW5hbWUgcG9zaXRpb24gZW5kaW5nKS5cbiAqXG4gKiBTZWUgYXR0cmlidXRlcyBpbiB0aGUgSFRNTCBzcGVjOlxuICogaHR0cHM6Ly93d3cudzMub3JnL1RSL2h0bWw1L3N5bnRheC5odG1sI2VsZW1lbnRzLWF0dHJpYnV0ZXNcbiAqXG4gKiBcIiBcXHRcXG5cXGZcXHJcIiBhcmUgSFRNTCBzcGFjZSBjaGFyYWN0ZXJzOlxuICogaHR0cHM6Ly9pbmZyYS5zcGVjLndoYXR3Zy5vcmcvI2FzY2lpLXdoaXRlc3BhY2VcbiAqXG4gKiBTbyBhbiBhdHRyaWJ1dGUgaXM6XG4gKiAgKiBUaGUgbmFtZTogYW55IGNoYXJhY3RlciBleGNlcHQgYSB3aGl0ZXNwYWNlIGNoYXJhY3RlciwgKFwiKSwgKCcpLCBcIj5cIixcbiAqICAgIFwiPVwiLCBvciBcIi9cIi4gTm90ZTogdGhpcyBpcyBkaWZmZXJlbnQgZnJvbSB0aGUgSFRNTCBzcGVjIHdoaWNoIGFsc28gZXhjbHVkZXMgY29udHJvbCBjaGFyYWN0ZXJzLlxuICogICogRm9sbG93ZWQgYnkgemVybyBvciBtb3JlIHNwYWNlIGNoYXJhY3RlcnNcbiAqICAqIEZvbGxvd2VkIGJ5IFwiPVwiXG4gKiAgKiBGb2xsb3dlZCBieSB6ZXJvIG9yIG1vcmUgc3BhY2UgY2hhcmFjdGVyc1xuICogICogRm9sbG93ZWQgYnk6XG4gKiAgICAqIEFueSBjaGFyYWN0ZXIgZXhjZXB0IHNwYWNlLCAoJyksIChcIiksIFwiPFwiLCBcIj5cIiwgXCI9XCIsIChgKSwgb3JcbiAqICAgICogKFwiKSB0aGVuIGFueSBub24tKFwiKSwgb3JcbiAqICAgICogKCcpIHRoZW4gYW55IG5vbi0oJylcbiAqL1xuY29uc3QgdGFnRW5kUmVnZXggPSBuZXcgUmVnRXhwKFxuICBgPnwke1NQQUNFX0NIQVJ9KD86KCR7TkFNRV9DSEFSfSspKCR7U1BBQ0VfQ0hBUn0qPSR7U1BBQ0VfQ0hBUn0qKD86JHtBVFRSX1ZBTFVFX0NIQVJ9fChcInwnKXwpKXwkKWAsXG4gICdnJ1xuKTtcbmNvbnN0IEVOVElSRV9NQVRDSCA9IDA7XG5jb25zdCBBVFRSSUJVVEVfTkFNRSA9IDE7XG5jb25zdCBTUEFDRVNfQU5EX0VRVUFMUyA9IDI7XG5jb25zdCBRVU9URV9DSEFSID0gMztcblxuY29uc3Qgc2luZ2xlUXVvdGVBdHRyRW5kUmVnZXggPSAvJy9nO1xuY29uc3QgZG91YmxlUXVvdGVBdHRyRW5kUmVnZXggPSAvXCIvZztcbi8qKlxuICogTWF0Y2hlcyB0aGUgcmF3IHRleHQgZWxlbWVudHMuXG4gKlxuICogQ29tbWVudHMgYXJlIG5vdCBwYXJzZWQgd2l0aGluIHJhdyB0ZXh0IGVsZW1lbnRzLCBzbyB3ZSBuZWVkIHRvIHNlYXJjaCB0aGVpclxuICogdGV4dCBjb250ZW50IGZvciBtYXJrZXIgc3RyaW5ncy5cbiAqL1xuY29uc3QgcmF3VGV4dEVsZW1lbnQgPSAvXig/OnNjcmlwdHxzdHlsZXx0ZXh0YXJlYSkkL2k7XG5cbi8qKiBUZW1wbGF0ZVJlc3VsdCB0eXBlcyAqL1xuY29uc3QgSFRNTF9SRVNVTFQgPSAxO1xuY29uc3QgU1ZHX1JFU1VMVCA9IDI7XG5cbnR5cGUgUmVzdWx0VHlwZSA9IHR5cGVvZiBIVE1MX1JFU1VMVCB8IHR5cGVvZiBTVkdfUkVTVUxUO1xuXG4vLyBUZW1wbGF0ZVBhcnQgdHlwZXNcbi8vIElNUE9SVEFOVDogdGhlc2UgbXVzdCBtYXRjaCB0aGUgdmFsdWVzIGluIFBhcnRUeXBlXG5jb25zdCBBVFRSSUJVVEVfUEFSVCA9IDE7XG5jb25zdCBDSElMRF9QQVJUID0gMjtcbmNvbnN0IFBST1BFUlRZX1BBUlQgPSAzO1xuY29uc3QgQk9PTEVBTl9BVFRSSUJVVEVfUEFSVCA9IDQ7XG5jb25zdCBFVkVOVF9QQVJUID0gNTtcbmNvbnN0IEVMRU1FTlRfUEFSVCA9IDY7XG5jb25zdCBDT01NRU5UX1BBUlQgPSA3O1xuXG4vKipcbiAqIFRoZSByZXR1cm4gdHlwZSBvZiB0aGUgdGVtcGxhdGUgdGFnIGZ1bmN0aW9ucy5cbiAqL1xuZXhwb3J0IHR5cGUgVGVtcGxhdGVSZXN1bHQ8VCBleHRlbmRzIFJlc3VsdFR5cGUgPSBSZXN1bHRUeXBlPiA9IHtcbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgWydfJGxpdFR5cGUkJ106IFQ7XG4gIHN0cmluZ3M6IFRlbXBsYXRlU3RyaW5nc0FycmF5O1xuICB2YWx1ZXM6IHVua25vd25bXTtcbn07XG5cbmV4cG9ydCB0eXBlIEhUTUxUZW1wbGF0ZVJlc3VsdCA9IFRlbXBsYXRlUmVzdWx0PHR5cGVvZiBIVE1MX1JFU1VMVD47XG5cbmV4cG9ydCB0eXBlIFNWR1RlbXBsYXRlUmVzdWx0ID0gVGVtcGxhdGVSZXN1bHQ8dHlwZW9mIFNWR19SRVNVTFQ+O1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVkVGVtcGxhdGVSZXN1bHQge1xuICAvLyBUaGlzIGlzIGEgZmFjdG9yeSBpbiBvcmRlciB0byBtYWtlIHRlbXBsYXRlIGluaXRpYWxpemF0aW9uIGxhenlcbiAgLy8gYW5kIGFsbG93IFNoYWR5UmVuZGVyT3B0aW9ucyBzY29wZSB0byBiZSBwYXNzZWQgaW4uXG4gIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gIFsnXyRsaXRUeXBlJCddOiBDb21waWxlZFRlbXBsYXRlO1xuICB2YWx1ZXM6IHVua25vd25bXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21waWxlZFRlbXBsYXRlIGV4dGVuZHMgT21pdDxUZW1wbGF0ZSwgJ2VsJz4ge1xuICAvLyBlbCBpcyBvdmVycmlkZGVuIHRvIGJlIG9wdGlvbmFsLiBXZSBpbml0aWFsaXplIGl0IG9uIGZpcnN0IHJlbmRlclxuICBlbD86IEhUTUxUZW1wbGF0ZUVsZW1lbnQ7XG5cbiAgLy8gVGhlIHByZXBhcmVkIEhUTUwgc3RyaW5nIHRvIGNyZWF0ZSBhIHRlbXBsYXRlIGVsZW1lbnQgZnJvbS5cbiAgaDogVHJ1c3RlZEhUTUw7XG59XG5cbi8qKlxuICogR2VuZXJhdGVzIGEgdGVtcGxhdGUgbGl0ZXJhbCB0YWcgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgVGVtcGxhdGVSZXN1bHQgd2l0aFxuICogdGhlIGdpdmVuIHJlc3VsdCB0eXBlLlxuICovXG5jb25zdCB0YWcgPVxuICA8VCBleHRlbmRzIFJlc3VsdFR5cGU+KHR5cGU6IFQpID0+XG4gIChzdHJpbmdzOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSwgLi4udmFsdWVzOiB1bmtub3duW10pOiBUZW1wbGF0ZVJlc3VsdDxUPiA9PiB7XG4gICAgLy8gV2FybiBhZ2FpbnN0IHRlbXBsYXRlcyBvY3RhbCBlc2NhcGUgc2VxdWVuY2VzXG4gICAgLy8gV2UgZG8gdGhpcyBoZXJlIHJhdGhlciB0aGFuIGluIHJlbmRlciBzbyB0aGF0IHRoZSB3YXJuaW5nIGlzIGNsb3NlciB0byB0aGVcbiAgICAvLyB0ZW1wbGF0ZSBkZWZpbml0aW9uLlxuICAgIGlmIChERVZfTU9ERSAmJiBzdHJpbmdzLnNvbWUoKHMpID0+IHMgPT09IHVuZGVmaW5lZCkpIHtcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgJ1NvbWUgdGVtcGxhdGUgc3RyaW5ncyBhcmUgdW5kZWZpbmVkLlxcbicgK1xuICAgICAgICAgICdUaGlzIGlzIHByb2JhYmx5IGNhdXNlZCBieSBpbGxlZ2FsIG9jdGFsIGVzY2FwZSBzZXF1ZW5jZXMuJ1xuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgICBbJ18kbGl0VHlwZSQnXTogdHlwZSxcbiAgICAgIHN0cmluZ3MsXG4gICAgICB2YWx1ZXMsXG4gICAgfTtcbiAgfTtcblxuLyoqXG4gKiBJbnRlcnByZXRzIGEgdGVtcGxhdGUgbGl0ZXJhbCBhcyBhbiBIVE1MIHRlbXBsYXRlIHRoYXQgY2FuIGVmZmljaWVudGx5XG4gKiByZW5kZXIgdG8gYW5kIHVwZGF0ZSBhIGNvbnRhaW5lci5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgaGVhZGVyID0gKHRpdGxlOiBzdHJpbmcpID0+IGh0bWxgPGgxPiR7dGl0bGV9PC9oMT5gO1xuICogYGBgXG4gKlxuICogVGhlIGBodG1sYCB0YWcgcmV0dXJucyBhIGRlc2NyaXB0aW9uIG9mIHRoZSBET00gdG8gcmVuZGVyIGFzIGEgdmFsdWUuIEl0IGlzXG4gKiBsYXp5LCBtZWFuaW5nIG5vIHdvcmsgaXMgZG9uZSB1bnRpbCB0aGUgdGVtcGxhdGUgaXMgcmVuZGVyZWQuIFdoZW4gcmVuZGVyaW5nLFxuICogaWYgYSB0ZW1wbGF0ZSBjb21lcyBmcm9tIHRoZSBzYW1lIGV4cHJlc3Npb24gYXMgYSBwcmV2aW91c2x5IHJlbmRlcmVkIHJlc3VsdCxcbiAqIGl0J3MgZWZmaWNpZW50bHkgdXBkYXRlZCBpbnN0ZWFkIG9mIHJlcGxhY2VkLlxuICovXG5leHBvcnQgY29uc3QgaHRtbCA9IHRhZyhIVE1MX1JFU1VMVCk7XG5cbi8qKlxuICogSW50ZXJwcmV0cyBhIHRlbXBsYXRlIGxpdGVyYWwgYXMgYW4gU1ZHIHRlbXBsYXRlIHRoYXQgY2FuIGVmZmljaWVudGx5XG4gKiByZW5kZXIgdG8gYW5kIHVwZGF0ZSBhIGNvbnRhaW5lci5cbiAqL1xuZXhwb3J0IGNvbnN0IHN2ZyA9IHRhZyhTVkdfUkVTVUxUKTtcblxuLyoqXG4gKiBBIHNlbnRpbmVsIHZhbHVlIHRoYXQgc2lnbmFscyB0aGF0IGEgdmFsdWUgd2FzIGhhbmRsZWQgYnkgYSBkaXJlY3RpdmUgYW5kXG4gKiBzaG91bGQgbm90IGJlIHdyaXR0ZW4gdG8gdGhlIERPTS5cbiAqL1xuZXhwb3J0IGNvbnN0IG5vQ2hhbmdlID0gU3ltYm9sLmZvcignbGl0LW5vQ2hhbmdlJyk7XG5cbi8qKlxuICogQSBzZW50aW5lbCB2YWx1ZSB0aGF0IHNpZ25hbHMgYSBDaGlsZFBhcnQgdG8gZnVsbHkgY2xlYXIgaXRzIGNvbnRlbnQuXG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGJ1dHRvbiA9IGh0bWxgJHtcbiAqICB1c2VyLmlzQWRtaW5cbiAqICAgID8gaHRtbGA8YnV0dG9uPkRFTEVURTwvYnV0dG9uPmBcbiAqICAgIDogbm90aGluZ1xuICogfWA7XG4gKiBgYGBcbiAqXG4gKiBQcmVmZXIgdXNpbmcgYG5vdGhpbmdgIG92ZXIgb3RoZXIgZmFsc3kgdmFsdWVzIGFzIGl0IHByb3ZpZGVzIGEgY29uc2lzdGVudFxuICogYmVoYXZpb3IgYmV0d2VlbiB2YXJpb3VzIGV4cHJlc3Npb24gYmluZGluZyBjb250ZXh0cy5cbiAqXG4gKiBJbiBjaGlsZCBleHByZXNzaW9ucywgYHVuZGVmaW5lZGAsIGBudWxsYCwgYCcnYCwgYW5kIGBub3RoaW5nYCBhbGwgYmVoYXZlIHRoZVxuICogc2FtZSBhbmQgcmVuZGVyIG5vIG5vZGVzLiBJbiBhdHRyaWJ1dGUgZXhwcmVzc2lvbnMsIGBub3RoaW5nYCBfcmVtb3Zlc18gdGhlXG4gKiBhdHRyaWJ1dGUsIHdoaWxlIGB1bmRlZmluZWRgIGFuZCBgbnVsbGAgd2lsbCByZW5kZXIgYW4gZW1wdHkgc3RyaW5nLiBJblxuICogcHJvcGVydHkgZXhwcmVzc2lvbnMgYG5vdGhpbmdgIGJlY29tZXMgYHVuZGVmaW5lZGAuXG4gKi9cbmV4cG9ydCBjb25zdCBub3RoaW5nID0gU3ltYm9sLmZvcignbGl0LW5vdGhpbmcnKTtcblxuLyoqXG4gKiBUaGUgY2FjaGUgb2YgcHJlcGFyZWQgdGVtcGxhdGVzLCBrZXllZCBieSB0aGUgdGFnZ2VkIFRlbXBsYXRlU3RyaW5nc0FycmF5XG4gKiBhbmQgX25vdF8gYWNjb3VudGluZyBmb3IgdGhlIHNwZWNpZmljIHRlbXBsYXRlIHRhZyB1c2VkLiBUaGlzIG1lYW5zIHRoYXRcbiAqIHRlbXBsYXRlIHRhZ3MgY2Fubm90IGJlIGR5bmFtaWMgLSB0aGUgbXVzdCBzdGF0aWNhbGx5IGJlIG9uZSBvZiBodG1sLCBzdmcsXG4gKiBvciBhdHRyLiBUaGlzIHJlc3RyaWN0aW9uIHNpbXBsaWZpZXMgdGhlIGNhY2hlIGxvb2t1cCwgd2hpY2ggaXMgb24gdGhlIGhvdFxuICogcGF0aCBmb3IgcmVuZGVyaW5nLlxuICovXG5jb25zdCB0ZW1wbGF0ZUNhY2hlID0gbmV3IFdlYWtNYXA8VGVtcGxhdGVTdHJpbmdzQXJyYXksIFRlbXBsYXRlPigpO1xuXG4vKipcbiAqIE9iamVjdCBzcGVjaWZ5aW5nIG9wdGlvbnMgZm9yIGNvbnRyb2xsaW5nIGxpdC1odG1sIHJlbmRlcmluZy4gTm90ZSB0aGF0XG4gKiB3aGlsZSBgcmVuZGVyYCBtYXkgYmUgY2FsbGVkIG11bHRpcGxlIHRpbWVzIG9uIHRoZSBzYW1lIGBjb250YWluZXJgIChhbmRcbiAqIGByZW5kZXJCZWZvcmVgIHJlZmVyZW5jZSBub2RlKSB0byBlZmZpY2llbnRseSB1cGRhdGUgdGhlIHJlbmRlcmVkIGNvbnRlbnQsXG4gKiBvbmx5IHRoZSBvcHRpb25zIHBhc3NlZCBpbiBkdXJpbmcgdGhlIGZpcnN0IHJlbmRlciBhcmUgcmVzcGVjdGVkIGR1cmluZ1xuICogdGhlIGxpZmV0aW1lIG9mIHJlbmRlcnMgdG8gdGhhdCB1bmlxdWUgYGNvbnRhaW5lcmAgKyBgcmVuZGVyQmVmb3JlYFxuICogY29tYmluYXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVuZGVyT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBBbiBvYmplY3QgdG8gdXNlIGFzIHRoZSBgdGhpc2AgdmFsdWUgZm9yIGV2ZW50IGxpc3RlbmVycy4gSXQncyBvZnRlblxuICAgKiB1c2VmdWwgdG8gc2V0IHRoaXMgdG8gdGhlIGhvc3QgY29tcG9uZW50IHJlbmRlcmluZyBhIHRlbXBsYXRlLlxuICAgKi9cbiAgaG9zdD86IG9iamVjdDtcbiAgLyoqXG4gICAqIEEgRE9NIG5vZGUgYmVmb3JlIHdoaWNoIHRvIHJlbmRlciBjb250ZW50IGluIHRoZSBjb250YWluZXIuXG4gICAqL1xuICByZW5kZXJCZWZvcmU/OiBDaGlsZE5vZGUgfCBudWxsO1xuICAvKipcbiAgICogTm9kZSB1c2VkIGZvciBjbG9uaW5nIHRoZSB0ZW1wbGF0ZSAoYGltcG9ydE5vZGVgIHdpbGwgYmUgY2FsbGVkIG9uIHRoaXNcbiAgICogbm9kZSkuIFRoaXMgY29udHJvbHMgdGhlIGBvd25lckRvY3VtZW50YCBvZiB0aGUgcmVuZGVyZWQgRE9NLCBhbG9uZyB3aXRoXG4gICAqIGFueSBpbmhlcml0ZWQgY29udGV4dC4gRGVmYXVsdHMgdG8gdGhlIGdsb2JhbCBgZG9jdW1lbnRgLlxuICAgKi9cbiAgY3JlYXRpb25TY29wZT86IHtpbXBvcnROb2RlKG5vZGU6IE5vZGUsIGRlZXA/OiBib29sZWFuKTogTm9kZX07XG4gIC8qKlxuICAgKiBUaGUgaW5pdGlhbCBjb25uZWN0ZWQgc3RhdGUgZm9yIHRoZSB0b3AtbGV2ZWwgcGFydCBiZWluZyByZW5kZXJlZC4gSWYgbm9cbiAgICogYGlzQ29ubmVjdGVkYCBvcHRpb24gaXMgc2V0LCBgQXN5bmNEaXJlY3RpdmVgcyB3aWxsIGJlIGNvbm5lY3RlZCBieVxuICAgKiBkZWZhdWx0LiBTZXQgdG8gYGZhbHNlYCBpZiB0aGUgaW5pdGlhbCByZW5kZXIgb2NjdXJzIGluIGEgZGlzY29ubmVjdGVkIHRyZWVcbiAgICogYW5kIGBBc3luY0RpcmVjdGl2ZWBzIHNob3VsZCBzZWUgYGlzQ29ubmVjdGVkID09PSBmYWxzZWAgZm9yIHRoZWlyIGluaXRpYWxcbiAgICogcmVuZGVyLiBUaGUgYHBhcnQuc2V0Q29ubmVjdGVkKClgIG1ldGhvZCBtdXN0IGJlIHVzZWQgc3Vic2VxdWVudCB0byBpbml0aWFsXG4gICAqIHJlbmRlciB0byBjaGFuZ2UgdGhlIGNvbm5lY3RlZCBzdGF0ZSBvZiB0aGUgcGFydC5cbiAgICovXG4gIGlzQ29ubmVjdGVkPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBJbnRlcm5hbGx5IHdlIGNhbiBleHBvcnQgdGhpcyBpbnRlcmZhY2UgYW5kIGNoYW5nZSB0aGUgdHlwZSBvZlxuICogcmVuZGVyKCkncyBvcHRpb25zLlxuICovXG5pbnRlcmZhY2UgSW50ZXJuYWxSZW5kZXJPcHRpb25zIGV4dGVuZHMgUmVuZGVyT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBBbiBpbnRlcm5hbC1vbmx5IG1pZ3JhdGlvbiBmbGFnXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgY2xlYXJDb250YWluZXJGb3JMaXQyTWlncmF0aW9uT25seT86IGJvb2xlYW47XG59XG5cbi8qKlxuICogUmVuZGVycyBhIHZhbHVlLCB1c3VhbGx5IGEgbGl0LWh0bWwgVGVtcGxhdGVSZXN1bHQsIHRvIHRoZSBjb250YWluZXIuXG4gKiBAcGFyYW0gdmFsdWVcbiAqIEBwYXJhbSBjb250YWluZXJcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBjb25zdCByZW5kZXIgPSAoXG4gIHZhbHVlOiB1bmtub3duLFxuICBjb250YWluZXI6IEhUTUxFbGVtZW50IHwgRG9jdW1lbnRGcmFnbWVudCxcbiAgb3B0aW9ucz86IFJlbmRlck9wdGlvbnNcbik6IFJvb3RQYXJ0ID0+IHtcbiAgY29uc3QgcGFydE93bmVyTm9kZSA9IG9wdGlvbnM/LnJlbmRlckJlZm9yZSA/PyBjb250YWluZXI7XG4gIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gIGxldCBwYXJ0OiBDaGlsZFBhcnQgPSAocGFydE93bmVyTm9kZSBhcyBhbnkpWydfJGxpdFBhcnQkJ107XG4gIGlmIChwYXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICBjb25zdCBlbmROb2RlID0gb3B0aW9ucz8ucmVuZGVyQmVmb3JlID8/IG51bGw7XG4gICAgLy8gSW50ZXJuYWwgbW9kaWZpY2F0aW9uOiBkb24ndCBjbGVhciBjb250YWluZXIgdG8gbWF0Y2ggbGl0LWh0bWwgMi4wXG4gICAgaWYgKFxuICAgICAgSU5URVJOQUwgJiZcbiAgICAgIChvcHRpb25zIGFzIEludGVybmFsUmVuZGVyT3B0aW9ucyk/LmNsZWFyQ29udGFpbmVyRm9yTGl0Mk1pZ3JhdGlvbk9ubHkgPT09XG4gICAgICAgIHRydWVcbiAgICApIHtcbiAgICAgIGxldCBuID0gY29udGFpbmVyLmZpcnN0Q2hpbGQ7XG4gICAgICAvLyBDbGVhciBvbmx5IHVwIHRvIHRoZSBgZW5kTm9kZWAgYWthIGByZW5kZXJCZWZvcmVgIG5vZGUuXG4gICAgICB3aGlsZSAobiAmJiBuICE9PSBlbmROb2RlKSB7XG4gICAgICAgIGNvbnN0IG5leHQgPSBuLm5leHRTaWJsaW5nO1xuICAgICAgICBuLnJlbW92ZSgpO1xuICAgICAgICBuID0gbmV4dDtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIChwYXJ0T3duZXJOb2RlIGFzIGFueSlbJ18kbGl0UGFydCQnXSA9IHBhcnQgPSBuZXcgQ2hpbGRQYXJ0KFxuICAgICAgY29udGFpbmVyLmluc2VydEJlZm9yZShjcmVhdGVNYXJrZXIoKSwgZW5kTm9kZSksXG4gICAgICBlbmROb2RlLFxuICAgICAgdW5kZWZpbmVkLFxuICAgICAgb3B0aW9ucyA/PyB7fVxuICAgICk7XG4gIH1cbiAgcGFydC5fJHNldFZhbHVlKHZhbHVlKTtcbiAgcmV0dXJuIHBhcnQgYXMgUm9vdFBhcnQ7XG59O1xuXG5pZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gIHJlbmRlci5zZXRTYW5pdGl6ZXIgPSBzZXRTYW5pdGl6ZXI7XG4gIHJlbmRlci5jcmVhdGVTYW5pdGl6ZXIgPSBjcmVhdGVTYW5pdGl6ZXI7XG4gIGlmIChERVZfTU9ERSkge1xuICAgIHJlbmRlci5fdGVzdE9ubHlDbGVhclNhbml0aXplckZhY3RvcnlEb05vdENhbGxPckVsc2UgPVxuICAgICAgX3Rlc3RPbmx5Q2xlYXJTYW5pdGl6ZXJGYWN0b3J5RG9Ob3RDYWxsT3JFbHNlO1xuICB9XG59XG5cbmNvbnN0IHdhbGtlciA9IGQuY3JlYXRlVHJlZVdhbGtlcihcbiAgZCxcbiAgMTI5IC8qIE5vZGVGaWx0ZXIuU0hPV197RUxFTUVOVHxDT01NRU5UfSAqLyxcbiAgbnVsbCxcbiAgZmFsc2Vcbik7XG5cbmxldCBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWw6IFNhbml0aXplckZhY3RvcnkgPSBub29wU2FuaXRpemVyO1xuXG4vL1xuLy8gQ2xhc3NlcyBvbmx5IGJlbG93IGhlcmUsIGNvbnN0IHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBvbmx5IGFib3ZlIGhlcmUuLi5cbi8vXG4vLyBLZWVwaW5nIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBhbmQgY2xhc3NlcyB0b2dldGhlciBpbXByb3ZlcyBtaW5pZmljYXRpb24uXG4vLyBJbnRlcmZhY2VzIGFuZCB0eXBlIGFsaWFzZXMgY2FuIGJlIGludGVybGVhdmVkIGZyZWVseS5cbi8vXG5cbi8vIFR5cGUgZm9yIGNsYXNzZXMgdGhhdCBoYXZlIGEgYF9kaXJlY3RpdmVgIG9yIGBfZGlyZWN0aXZlc1tdYCBmaWVsZCwgdXNlZCBieVxuLy8gYHJlc29sdmVEaXJlY3RpdmVgXG5leHBvcnQgaW50ZXJmYWNlIERpcmVjdGl2ZVBhcmVudCB7XG4gIF8kcGFyZW50PzogRGlyZWN0aXZlUGFyZW50O1xuICBfJGlzQ29ubmVjdGVkOiBib29sZWFuO1xuICBfX2RpcmVjdGl2ZT86IERpcmVjdGl2ZTtcbiAgX19kaXJlY3RpdmVzPzogQXJyYXk8RGlyZWN0aXZlIHwgdW5kZWZpbmVkPjtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIEhUTUwgc3RyaW5nIGZvciB0aGUgZ2l2ZW4gVGVtcGxhdGVTdHJpbmdzQXJyYXkgYW5kIHJlc3VsdCB0eXBlXG4gKiAoSFRNTCBvciBTVkcpLCBhbG9uZyB3aXRoIHRoZSBjYXNlLXNlbnNpdGl2ZSBib3VuZCBhdHRyaWJ1dGUgbmFtZXMgaW5cbiAqIHRlbXBsYXRlIG9yZGVyLiBUaGUgSFRNTCBjb250YWlucyBjb21tZW50IGNvbW1lbnQgbWFya2VycyBkZW5vdGluZyB0aGVcbiAqIGBDaGlsZFBhcnRgcyBhbmQgc3VmZml4ZXMgb24gYm91bmQgYXR0cmlidXRlcyBkZW5vdGluZyB0aGUgYEF0dHJpYnV0ZVBhcnRzYC5cbiAqXG4gKiBAcGFyYW0gc3RyaW5ncyB0ZW1wbGF0ZSBzdHJpbmdzIGFycmF5XG4gKiBAcGFyYW0gdHlwZSBIVE1MIG9yIFNWR1xuICogQHJldHVybiBBcnJheSBjb250YWluaW5nIGBbaHRtbCwgYXR0ck5hbWVzXWAgKGFycmF5IHJldHVybmVkIGZvciB0ZXJzZW5lc3MsXG4gKiAgICAgdG8gYXZvaWQgb2JqZWN0IGZpZWxkcyBzaW5jZSB0aGlzIGNvZGUgaXMgc2hhcmVkIHdpdGggbm9uLW1pbmlmaWVkIFNTUlxuICogICAgIGNvZGUpXG4gKi9cbmNvbnN0IGdldFRlbXBsYXRlSHRtbCA9IChcbiAgc3RyaW5nczogVGVtcGxhdGVTdHJpbmdzQXJyYXksXG4gIHR5cGU6IFJlc3VsdFR5cGVcbik6IFtUcnVzdGVkSFRNTCwgQXJyYXk8c3RyaW5nIHwgdW5kZWZpbmVkPl0gPT4ge1xuICAvLyBJbnNlcnQgbWFrZXJzIGludG8gdGhlIHRlbXBsYXRlIEhUTUwgdG8gcmVwcmVzZW50IHRoZSBwb3NpdGlvbiBvZlxuICAvLyBiaW5kaW5ncy4gVGhlIGZvbGxvd2luZyBjb2RlIHNjYW5zIHRoZSB0ZW1wbGF0ZSBzdHJpbmdzIHRvIGRldGVybWluZSB0aGVcbiAgLy8gc3ludGFjdGljIHBvc2l0aW9uIG9mIHRoZSBiaW5kaW5ncy4gVGhleSBjYW4gYmUgaW4gdGV4dCBwb3NpdGlvbiwgd2hlcmVcbiAgLy8gd2UgaW5zZXJ0IGFuIEhUTUwgY29tbWVudCwgYXR0cmlidXRlIHZhbHVlIHBvc2l0aW9uLCB3aGVyZSB3ZSBpbnNlcnQgYVxuICAvLyBzZW50aW5lbCBzdHJpbmcgYW5kIHJlLXdyaXRlIHRoZSBhdHRyaWJ1dGUgbmFtZSwgb3IgaW5zaWRlIGEgdGFnIHdoZXJlXG4gIC8vIHdlIGluc2VydCB0aGUgc2VudGluZWwgc3RyaW5nLlxuICBjb25zdCBsID0gc3RyaW5ncy5sZW5ndGggLSAxO1xuICAvLyBTdG9yZXMgdGhlIGNhc2Utc2Vuc2l0aXZlIGJvdW5kIGF0dHJpYnV0ZSBuYW1lcyBpbiB0aGUgb3JkZXIgb2YgdGhlaXJcbiAgLy8gcGFydHMuIEVsZW1lbnRQYXJ0cyBhcmUgYWxzbyByZWZsZWN0ZWQgaW4gdGhpcyBhcnJheSBhcyB1bmRlZmluZWRcbiAgLy8gcmF0aGVyIHRoYW4gYSBzdHJpbmcsIHRvIGRpc2FtYmlndWF0ZSBmcm9tIGF0dHJpYnV0ZSBiaW5kaW5ncy5cbiAgY29uc3QgYXR0ck5hbWVzOiBBcnJheTxzdHJpbmcgfCB1bmRlZmluZWQ+ID0gW107XG4gIGxldCBodG1sID0gdHlwZSA9PT0gU1ZHX1JFU1VMVCA/ICc8c3ZnPicgOiAnJztcblxuICAvLyBXaGVuIHdlJ3JlIGluc2lkZSBhIHJhdyB0ZXh0IHRhZyAobm90IGl0J3MgdGV4dCBjb250ZW50KSwgdGhlIHJlZ2V4XG4gIC8vIHdpbGwgc3RpbGwgYmUgdGFnUmVnZXggc28gd2UgY2FuIGZpbmQgYXR0cmlidXRlcywgYnV0IHdpbGwgc3dpdGNoIHRvXG4gIC8vIHRoaXMgcmVnZXggd2hlbiB0aGUgdGFnIGVuZHMuXG4gIGxldCByYXdUZXh0RW5kUmVnZXg6IFJlZ0V4cCB8IHVuZGVmaW5lZDtcblxuICAvLyBUaGUgY3VycmVudCBwYXJzaW5nIHN0YXRlLCByZXByZXNlbnRlZCBhcyBhIHJlZmVyZW5jZSB0byBvbmUgb2YgdGhlXG4gIC8vIHJlZ2V4ZXNcbiAgbGV0IHJlZ2V4ID0gdGV4dEVuZFJlZ2V4O1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgY29uc3QgcyA9IHN0cmluZ3NbaV07XG4gICAgLy8gVGhlIGluZGV4IG9mIHRoZSBlbmQgb2YgdGhlIGxhc3QgYXR0cmlidXRlIG5hbWUuIFdoZW4gdGhpcyBpc1xuICAgIC8vIHBvc2l0aXZlIGF0IGVuZCBvZiBhIHN0cmluZywgaXQgbWVhbnMgd2UncmUgaW4gYW4gYXR0cmlidXRlIHZhbHVlXG4gICAgLy8gcG9zaXRpb24gYW5kIG5lZWQgdG8gcmV3cml0ZSB0aGUgYXR0cmlidXRlIG5hbWUuXG4gICAgLy8gV2UgYWxzbyB1c2UgYSBzcGVjaWFsIHZhbHVlIG9mIC0yIHRvIGluZGljYXRlIHRoYXQgd2UgZW5jb3VudGVyZWRcbiAgICAvLyB0aGUgZW5kIG9mIGEgc3RyaW5nIGluIGF0dHJpYnV0ZSBuYW1lIHBvc2l0aW9uLlxuICAgIGxldCBhdHRyTmFtZUVuZEluZGV4ID0gLTE7XG4gICAgbGV0IGF0dHJOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgbGV0IGxhc3RJbmRleCA9IDA7XG4gICAgbGV0IG1hdGNoITogUmVnRXhwRXhlY0FycmF5IHwgbnVsbDtcblxuICAgIC8vIFRoZSBjb25kaXRpb25zIGluIHRoaXMgbG9vcCBoYW5kbGUgdGhlIGN1cnJlbnQgcGFyc2Ugc3RhdGUsIGFuZCB0aGVcbiAgICAvLyBhc3NpZ25tZW50cyB0byB0aGUgYHJlZ2V4YCB2YXJpYWJsZSBhcmUgdGhlIHN0YXRlIHRyYW5zaXRpb25zLlxuICAgIHdoaWxlIChsYXN0SW5kZXggPCBzLmxlbmd0aCkge1xuICAgICAgLy8gTWFrZSBzdXJlIHdlIHN0YXJ0IHNlYXJjaGluZyBmcm9tIHdoZXJlIHdlIHByZXZpb3VzbHkgbGVmdCBvZmZcbiAgICAgIHJlZ2V4Lmxhc3RJbmRleCA9IGxhc3RJbmRleDtcbiAgICAgIG1hdGNoID0gcmVnZXguZXhlYyhzKTtcbiAgICAgIGlmIChtYXRjaCA9PT0gbnVsbCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGxhc3RJbmRleCA9IHJlZ2V4Lmxhc3RJbmRleDtcbiAgICAgIGlmIChyZWdleCA9PT0gdGV4dEVuZFJlZ2V4KSB7XG4gICAgICAgIGlmIChtYXRjaFtDT01NRU5UX1NUQVJUXSA9PT0gJyEtLScpIHtcbiAgICAgICAgICByZWdleCA9IGNvbW1lbnRFbmRSZWdleDtcbiAgICAgICAgfSBlbHNlIGlmIChtYXRjaFtDT01NRU5UX1NUQVJUXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gV2Ugc3RhcnRlZCBhIHdlaXJkIGNvbW1lbnQsIGxpa2UgPC97XG4gICAgICAgICAgcmVnZXggPSBjb21tZW50MkVuZFJlZ2V4O1xuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoW1RBR19OQU1FXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKHJhd1RleHRFbGVtZW50LnRlc3QobWF0Y2hbVEFHX05BTUVdKSkge1xuICAgICAgICAgICAgLy8gUmVjb3JkIGlmIHdlIGVuY291bnRlciBhIHJhdy10ZXh0IGVsZW1lbnQuIFdlJ2xsIHN3aXRjaCB0b1xuICAgICAgICAgICAgLy8gdGhpcyByZWdleCBhdCB0aGUgZW5kIG9mIHRoZSB0YWcuXG4gICAgICAgICAgICByYXdUZXh0RW5kUmVnZXggPSBuZXcgUmVnRXhwKGA8LyR7bWF0Y2hbVEFHX05BTUVdfWAsICdnJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlZ2V4ID0gdGFnRW5kUmVnZXg7XG4gICAgICAgIH0gZWxzZSBpZiAobWF0Y2hbRFlOQU1JQ19UQUdfTkFNRV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmIChERVZfTU9ERSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAnQmluZGluZ3MgaW4gdGFnIG5hbWVzIGFyZSBub3Qgc3VwcG9ydGVkLiBQbGVhc2UgdXNlIHN0YXRpYyB0ZW1wbGF0ZXMgaW5zdGVhZC4gJyArXG4gICAgICAgICAgICAgICAgJ1NlZSBodHRwczovL2xpdC5kZXYvZG9jcy90ZW1wbGF0ZXMvZXhwcmVzc2lvbnMvI3N0YXRpYy1leHByZXNzaW9ucydcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlZ2V4ID0gdGFnRW5kUmVnZXg7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocmVnZXggPT09IHRhZ0VuZFJlZ2V4KSB7XG4gICAgICAgIGlmIChtYXRjaFtFTlRJUkVfTUFUQ0hdID09PSAnPicpIHtcbiAgICAgICAgICAvLyBFbmQgb2YgYSB0YWcuIElmIHdlIGhhZCBzdGFydGVkIGEgcmF3LXRleHQgZWxlbWVudCwgdXNlIHRoYXRcbiAgICAgICAgICAvLyByZWdleFxuICAgICAgICAgIHJlZ2V4ID0gcmF3VGV4dEVuZFJlZ2V4ID8/IHRleHRFbmRSZWdleDtcbiAgICAgICAgICAvLyBXZSBtYXkgYmUgZW5kaW5nIGFuIHVucXVvdGVkIGF0dHJpYnV0ZSB2YWx1ZSwgc28gbWFrZSBzdXJlIHdlXG4gICAgICAgICAgLy8gY2xlYXIgYW55IHBlbmRpbmcgYXR0ck5hbWVFbmRJbmRleFxuICAgICAgICAgIGF0dHJOYW1lRW5kSW5kZXggPSAtMTtcbiAgICAgICAgfSBlbHNlIGlmIChtYXRjaFtBVFRSSUJVVEVfTkFNRV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIEF0dHJpYnV0ZSBuYW1lIHBvc2l0aW9uXG4gICAgICAgICAgYXR0ck5hbWVFbmRJbmRleCA9IC0yO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF0dHJOYW1lRW5kSW5kZXggPSByZWdleC5sYXN0SW5kZXggLSBtYXRjaFtTUEFDRVNfQU5EX0VRVUFMU10ubGVuZ3RoO1xuICAgICAgICAgIGF0dHJOYW1lID0gbWF0Y2hbQVRUUklCVVRFX05BTUVdO1xuICAgICAgICAgIHJlZ2V4ID1cbiAgICAgICAgICAgIG1hdGNoW1FVT1RFX0NIQVJdID09PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgPyB0YWdFbmRSZWdleFxuICAgICAgICAgICAgICA6IG1hdGNoW1FVT1RFX0NIQVJdID09PSAnXCInXG4gICAgICAgICAgICAgID8gZG91YmxlUXVvdGVBdHRyRW5kUmVnZXhcbiAgICAgICAgICAgICAgOiBzaW5nbGVRdW90ZUF0dHJFbmRSZWdleDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgcmVnZXggPT09IGRvdWJsZVF1b3RlQXR0ckVuZFJlZ2V4IHx8XG4gICAgICAgIHJlZ2V4ID09PSBzaW5nbGVRdW90ZUF0dHJFbmRSZWdleFxuICAgICAgKSB7XG4gICAgICAgIHJlZ2V4ID0gdGFnRW5kUmVnZXg7XG4gICAgICB9IGVsc2UgaWYgKHJlZ2V4ID09PSBjb21tZW50RW5kUmVnZXggfHwgcmVnZXggPT09IGNvbW1lbnQyRW5kUmVnZXgpIHtcbiAgICAgICAgcmVnZXggPSB0ZXh0RW5kUmVnZXg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBOb3Qgb25lIG9mIHRoZSBmaXZlIHN0YXRlIHJlZ2V4ZXMsIHNvIGl0IG11c3QgYmUgdGhlIGR5bmFtaWNhbGx5XG4gICAgICAgIC8vIGNyZWF0ZWQgcmF3IHRleHQgcmVnZXggYW5kIHdlJ3JlIGF0IHRoZSBjbG9zZSBvZiB0aGF0IGVsZW1lbnQuXG4gICAgICAgIHJlZ2V4ID0gdGFnRW5kUmVnZXg7XG4gICAgICAgIHJhd1RleHRFbmRSZWdleCA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoREVWX01PREUpIHtcbiAgICAgIC8vIElmIHdlIGhhdmUgYSBhdHRyTmFtZUVuZEluZGV4LCB3aGljaCBpbmRpY2F0ZXMgdGhhdCB3ZSBzaG91bGRcbiAgICAgIC8vIHJld3JpdGUgdGhlIGF0dHJpYnV0ZSBuYW1lLCBhc3NlcnQgdGhhdCB3ZSdyZSBpbiBhIHZhbGlkIGF0dHJpYnV0ZVxuICAgICAgLy8gcG9zaXRpb24gLSBlaXRoZXIgaW4gYSB0YWcsIG9yIGEgcXVvdGVkIGF0dHJpYnV0ZSB2YWx1ZS5cbiAgICAgIGNvbnNvbGUuYXNzZXJ0KFxuICAgICAgICBhdHRyTmFtZUVuZEluZGV4ID09PSAtMSB8fFxuICAgICAgICAgIHJlZ2V4ID09PSB0YWdFbmRSZWdleCB8fFxuICAgICAgICAgIHJlZ2V4ID09PSBzaW5nbGVRdW90ZUF0dHJFbmRSZWdleCB8fFxuICAgICAgICAgIHJlZ2V4ID09PSBkb3VibGVRdW90ZUF0dHJFbmRSZWdleCxcbiAgICAgICAgJ3VuZXhwZWN0ZWQgcGFyc2Ugc3RhdGUgQidcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gV2UgaGF2ZSBmb3VyIGNhc2VzOlxuICAgIC8vICAxLiBXZSdyZSBpbiB0ZXh0IHBvc2l0aW9uLCBhbmQgbm90IGluIGEgcmF3IHRleHQgZWxlbWVudFxuICAgIC8vICAgICAocmVnZXggPT09IHRleHRFbmRSZWdleCk6IGluc2VydCBhIGNvbW1lbnQgbWFya2VyLlxuICAgIC8vICAyLiBXZSBoYXZlIGEgbm9uLW5lZ2F0aXZlIGF0dHJOYW1lRW5kSW5kZXggd2hpY2ggbWVhbnMgd2UgbmVlZCB0b1xuICAgIC8vICAgICByZXdyaXRlIHRoZSBhdHRyaWJ1dGUgbmFtZSB0byBhZGQgYSBib3VuZCBhdHRyaWJ1dGUgc3VmZml4LlxuICAgIC8vICAzLiBXZSdyZSBhdCB0aGUgbm9uLWZpcnN0IGJpbmRpbmcgaW4gYSBtdWx0aS1iaW5kaW5nIGF0dHJpYnV0ZSwgdXNlIGFcbiAgICAvLyAgICAgcGxhaW4gbWFya2VyLlxuICAgIC8vICA0LiBXZSdyZSBzb21ld2hlcmUgZWxzZSBpbnNpZGUgdGhlIHRhZy4gSWYgd2UncmUgaW4gYXR0cmlidXRlIG5hbWVcbiAgICAvLyAgICAgcG9zaXRpb24gKGF0dHJOYW1lRW5kSW5kZXggPT09IC0yKSwgYWRkIGEgc2VxdWVudGlhbCBzdWZmaXggdG9cbiAgICAvLyAgICAgZ2VuZXJhdGUgYSB1bmlxdWUgYXR0cmlidXRlIG5hbWUuXG5cbiAgICAvLyBEZXRlY3QgYSBiaW5kaW5nIG5leHQgdG8gc2VsZi1jbG9zaW5nIHRhZyBlbmQgYW5kIGluc2VydCBhIHNwYWNlIHRvXG4gICAgLy8gc2VwYXJhdGUgdGhlIG1hcmtlciBmcm9tIHRoZSB0YWcgZW5kOlxuICAgIGNvbnN0IGVuZCA9XG4gICAgICByZWdleCA9PT0gdGFnRW5kUmVnZXggJiYgc3RyaW5nc1tpICsgMV0uc3RhcnRzV2l0aCgnLz4nKSA/ICcgJyA6ICcnO1xuICAgIGh0bWwgKz1cbiAgICAgIHJlZ2V4ID09PSB0ZXh0RW5kUmVnZXhcbiAgICAgICAgPyBzICsgbm9kZU1hcmtlclxuICAgICAgICA6IGF0dHJOYW1lRW5kSW5kZXggPj0gMFxuICAgICAgICA/IChhdHRyTmFtZXMucHVzaChhdHRyTmFtZSEpLFxuICAgICAgICAgIHMuc2xpY2UoMCwgYXR0ck5hbWVFbmRJbmRleCkgK1xuICAgICAgICAgICAgYm91bmRBdHRyaWJ1dGVTdWZmaXggK1xuICAgICAgICAgICAgcy5zbGljZShhdHRyTmFtZUVuZEluZGV4KSkgK1xuICAgICAgICAgIG1hcmtlciArXG4gICAgICAgICAgZW5kXG4gICAgICAgIDogcyArXG4gICAgICAgICAgbWFya2VyICtcbiAgICAgICAgICAoYXR0ck5hbWVFbmRJbmRleCA9PT0gLTIgPyAoYXR0ck5hbWVzLnB1c2godW5kZWZpbmVkKSwgaSkgOiBlbmQpO1xuICB9XG5cbiAgY29uc3QgaHRtbFJlc3VsdDogc3RyaW5nIHwgVHJ1c3RlZEhUTUwgPVxuICAgIGh0bWwgKyAoc3RyaW5nc1tsXSB8fCAnPD8+JykgKyAodHlwZSA9PT0gU1ZHX1JFU1VMVCA/ICc8L3N2Zz4nIDogJycpO1xuXG4gIC8vIFJldHVybmVkIGFzIGFuIGFycmF5IGZvciB0ZXJzZW5lc3NcbiAgcmV0dXJuIFtcbiAgICBwb2xpY3kgIT09IHVuZGVmaW5lZFxuICAgICAgPyBwb2xpY3kuY3JlYXRlSFRNTChodG1sUmVzdWx0KVxuICAgICAgOiAoaHRtbFJlc3VsdCBhcyB1bmtub3duIGFzIFRydXN0ZWRIVE1MKSxcbiAgICBhdHRyTmFtZXMsXG4gIF07XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSB7VGVtcGxhdGV9O1xuY2xhc3MgVGVtcGxhdGUge1xuICAvKiogQGludGVybmFsICovXG4gIGVsITogSFRNTFRlbXBsYXRlRWxlbWVudDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwYXJ0czogQXJyYXk8VGVtcGxhdGVQYXJ0PiA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAge3N0cmluZ3MsIFsnXyRsaXRUeXBlJCddOiB0eXBlfTogVGVtcGxhdGVSZXN1bHQsXG4gICAgb3B0aW9ucz86IFJlbmRlck9wdGlvbnNcbiAgKSB7XG4gICAgbGV0IG5vZGU6IE5vZGUgfCBudWxsO1xuICAgIGxldCBub2RlSW5kZXggPSAwO1xuICAgIGxldCBhdHRyTmFtZUluZGV4ID0gMDtcbiAgICBjb25zdCBwYXJ0Q291bnQgPSBzdHJpbmdzLmxlbmd0aCAtIDE7XG4gICAgY29uc3QgcGFydHMgPSB0aGlzLnBhcnRzO1xuXG4gICAgLy8gQ3JlYXRlIHRlbXBsYXRlIGVsZW1lbnRcbiAgICBjb25zdCBbaHRtbCwgYXR0ck5hbWVzXSA9IGdldFRlbXBsYXRlSHRtbChzdHJpbmdzLCB0eXBlKTtcbiAgICB0aGlzLmVsID0gVGVtcGxhdGUuY3JlYXRlRWxlbWVudChodG1sLCBvcHRpb25zKTtcbiAgICB3YWxrZXIuY3VycmVudE5vZGUgPSB0aGlzLmVsLmNvbnRlbnQ7XG5cbiAgICAvLyBSZXBhcmVudCBTVkcgbm9kZXMgaW50byB0ZW1wbGF0ZSByb290XG4gICAgaWYgKHR5cGUgPT09IFNWR19SRVNVTFQpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSB0aGlzLmVsLmNvbnRlbnQ7XG4gICAgICBjb25zdCBzdmdFbGVtZW50ID0gY29udGVudC5maXJzdENoaWxkITtcbiAgICAgIHN2Z0VsZW1lbnQucmVtb3ZlKCk7XG4gICAgICBjb250ZW50LmFwcGVuZCguLi5zdmdFbGVtZW50LmNoaWxkTm9kZXMpO1xuICAgIH1cblxuICAgIC8vIFdhbGsgdGhlIHRlbXBsYXRlIHRvIGZpbmQgYmluZGluZyBtYXJrZXJzIGFuZCBjcmVhdGUgVGVtcGxhdGVQYXJ0c1xuICAgIHdoaWxlICgobm9kZSA9IHdhbGtlci5uZXh0Tm9kZSgpKSAhPT0gbnVsbCAmJiBwYXJ0cy5sZW5ndGggPCBwYXJ0Q291bnQpIHtcbiAgICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIGlmIChERVZfTU9ERSkge1xuICAgICAgICAgIGNvbnN0IHRhZyA9IChub2RlIGFzIEVsZW1lbnQpLmxvY2FsTmFtZTtcbiAgICAgICAgICAvLyBXYXJuIGlmIGB0ZXh0YXJlYWAgaW5jbHVkZXMgYW4gZXhwcmVzc2lvbiBhbmQgdGhyb3cgaWYgYHRlbXBsYXRlYFxuICAgICAgICAgIC8vIGRvZXMgc2luY2UgdGhlc2UgYXJlIG5vdCBzdXBwb3J0ZWQuIFdlIGRvIHRoaXMgYnkgY2hlY2tpbmdcbiAgICAgICAgICAvLyBpbm5lckhUTUwgZm9yIGFueXRoaW5nIHRoYXQgbG9va3MgbGlrZSBhIG1hcmtlci4gVGhpcyBjYXRjaGVzXG4gICAgICAgICAgLy8gY2FzZXMgbGlrZSBiaW5kaW5ncyBpbiB0ZXh0YXJlYSB0aGVyZSBtYXJrZXJzIHR1cm4gaW50byB0ZXh0IG5vZGVzLlxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIC9eKD86dGV4dGFyZWF8dGVtcGxhdGUpJC9pIS50ZXN0KHRhZykgJiZcbiAgICAgICAgICAgIChub2RlIGFzIEVsZW1lbnQpLmlubmVySFRNTC5pbmNsdWRlcyhtYXJrZXIpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBjb25zdCBtID1cbiAgICAgICAgICAgICAgYEV4cHJlc3Npb25zIGFyZSBub3Qgc3VwcG9ydGVkIGluc2lkZSBcXGAke3RhZ31cXGAgYCArXG4gICAgICAgICAgICAgIGBlbGVtZW50cy4gU2VlIGh0dHBzOi8vbGl0LmRldi9tc2cvZXhwcmVzc2lvbi1pbi0ke3RhZ30gZm9yIG1vcmUgYCArXG4gICAgICAgICAgICAgIGBpbmZvcm1hdGlvbi5gO1xuICAgICAgICAgICAgaWYgKHRhZyA9PT0gJ3RlbXBsYXRlJykge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobSk7XG4gICAgICAgICAgICB9IGVsc2UgaXNzdWVXYXJuaW5nKCcnLCBtKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETyAoanVzdGluZmFnbmFuaSk6IGZvciBhdHRlbXB0ZWQgZHluYW1pYyB0YWcgbmFtZXMsIHdlIGRvbid0XG4gICAgICAgIC8vIGluY3JlbWVudCB0aGUgYmluZGluZ0luZGV4LCBhbmQgaXQnbGwgYmUgb2ZmIGJ5IDEgaW4gdGhlIGVsZW1lbnRcbiAgICAgICAgLy8gYW5kIG9mZiBieSB0d28gYWZ0ZXIgaXQuXG4gICAgICAgIGlmICgobm9kZSBhcyBFbGVtZW50KS5oYXNBdHRyaWJ1dGVzKCkpIHtcbiAgICAgICAgICAvLyBXZSBkZWZlciByZW1vdmluZyBib3VuZCBhdHRyaWJ1dGVzIGJlY2F1c2Ugb24gSUUgd2UgbWlnaHQgbm90IGJlXG4gICAgICAgICAgLy8gaXRlcmF0aW5nIGF0dHJpYnV0ZXMgaW4gdGhlaXIgdGVtcGxhdGUgb3JkZXIsIGFuZCB3b3VsZCBzb21ldGltZXNcbiAgICAgICAgICAvLyByZW1vdmUgYW4gYXR0cmlidXRlIHRoYXQgd2Ugc3RpbGwgbmVlZCB0byBjcmVhdGUgYSBwYXJ0IGZvci5cbiAgICAgICAgICBjb25zdCBhdHRyc1RvUmVtb3ZlID0gW107XG4gICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIChub2RlIGFzIEVsZW1lbnQpLmdldEF0dHJpYnV0ZU5hbWVzKCkpIHtcbiAgICAgICAgICAgIC8vIGBuYW1lYCBpcyB0aGUgbmFtZSBvZiB0aGUgYXR0cmlidXRlIHdlJ3JlIGl0ZXJhdGluZyBvdmVyLCBidXQgbm90XG4gICAgICAgICAgICAvLyBfbmVjY2Vzc2FyaWx5XyB0aGUgbmFtZSBvZiB0aGUgYXR0cmlidXRlIHdlIHdpbGwgY3JlYXRlIGEgcGFydFxuICAgICAgICAgICAgLy8gZm9yLiBUaGV5IGNhbiBiZSBkaWZmZXJlbnQgaW4gYnJvd3NlcnMgdGhhdCBkb24ndCBpdGVyYXRlIG9uXG4gICAgICAgICAgICAvLyBhdHRyaWJ1dGVzIGluIHNvdXJjZSBvcmRlci4gSW4gdGhhdCBjYXNlIHRoZSBhdHRyTmFtZXMgYXJyYXlcbiAgICAgICAgICAgIC8vIGNvbnRhaW5zIHRoZSBhdHRyaWJ1dGUgbmFtZSB3ZSdsbCBwcm9jZXNzIG5leHQuIFdlIG9ubHkgbmVlZCB0aGVcbiAgICAgICAgICAgIC8vIGF0dHJpYnV0ZSBuYW1lIGhlcmUgdG8ga25vdyBpZiB3ZSBzaG91bGQgcHJvY2VzcyBhIGJvdW5kIGF0dHJpYnV0ZVxuICAgICAgICAgICAgLy8gb24gdGhpcyBlbGVtZW50LlxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICBuYW1lLmVuZHNXaXRoKGJvdW5kQXR0cmlidXRlU3VmZml4KSB8fFxuICAgICAgICAgICAgICBuYW1lLnN0YXJ0c1dpdGgobWFya2VyKVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHJlYWxOYW1lID0gYXR0ck5hbWVzW2F0dHJOYW1lSW5kZXgrK107XG4gICAgICAgICAgICAgIGF0dHJzVG9SZW1vdmUucHVzaChuYW1lKTtcbiAgICAgICAgICAgICAgaWYgKHJlYWxOYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBMb3dlcmNhc2UgZm9yIGNhc2Utc2Vuc2l0aXZlIFNWRyBhdHRyaWJ1dGVzIGxpa2Ugdmlld0JveFxuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gKG5vZGUgYXMgRWxlbWVudCkuZ2V0QXR0cmlidXRlKFxuICAgICAgICAgICAgICAgICAgcmVhbE5hbWUudG9Mb3dlckNhc2UoKSArIGJvdW5kQXR0cmlidXRlU3VmZml4XG4gICAgICAgICAgICAgICAgKSE7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdGljcyA9IHZhbHVlLnNwbGl0KG1hcmtlcik7XG4gICAgICAgICAgICAgICAgY29uc3QgbSA9IC8oWy4/QF0pPyguKikvLmV4ZWMocmVhbE5hbWUpITtcbiAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6IEFUVFJJQlVURV9QQVJULFxuICAgICAgICAgICAgICAgICAgaW5kZXg6IG5vZGVJbmRleCxcbiAgICAgICAgICAgICAgICAgIG5hbWU6IG1bMl0sXG4gICAgICAgICAgICAgICAgICBzdHJpbmdzOiBzdGF0aWNzLFxuICAgICAgICAgICAgICAgICAgY3RvcjpcbiAgICAgICAgICAgICAgICAgICAgbVsxXSA9PT0gJy4nXG4gICAgICAgICAgICAgICAgICAgICAgPyBQcm9wZXJ0eVBhcnRcbiAgICAgICAgICAgICAgICAgICAgICA6IG1bMV0gPT09ICc/J1xuICAgICAgICAgICAgICAgICAgICAgID8gQm9vbGVhbkF0dHJpYnV0ZVBhcnRcbiAgICAgICAgICAgICAgICAgICAgICA6IG1bMV0gPT09ICdAJ1xuICAgICAgICAgICAgICAgICAgICAgID8gRXZlbnRQYXJ0XG4gICAgICAgICAgICAgICAgICAgICAgOiBBdHRyaWJ1dGVQYXJ0LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgdHlwZTogRUxFTUVOVF9QQVJULFxuICAgICAgICAgICAgICAgICAgaW5kZXg6IG5vZGVJbmRleCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBmb3IgKGNvbnN0IG5hbWUgb2YgYXR0cnNUb1JlbW92ZSkge1xuICAgICAgICAgICAgKG5vZGUgYXMgRWxlbWVudCkucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBUT0RPIChqdXN0aW5mYWduYW5pKTogYmVuY2htYXJrIHRoZSByZWdleCBhZ2FpbnN0IHRlc3RpbmcgZm9yIGVhY2hcbiAgICAgICAgLy8gb2YgdGhlIDMgcmF3IHRleHQgZWxlbWVudCBuYW1lcy5cbiAgICAgICAgaWYgKHJhd1RleHRFbGVtZW50LnRlc3QoKG5vZGUgYXMgRWxlbWVudCkudGFnTmFtZSkpIHtcbiAgICAgICAgICAvLyBGb3IgcmF3IHRleHQgZWxlbWVudHMgd2UgbmVlZCB0byBzcGxpdCB0aGUgdGV4dCBjb250ZW50IG9uXG4gICAgICAgICAgLy8gbWFya2VycywgY3JlYXRlIGEgVGV4dCBub2RlIGZvciBlYWNoIHNlZ21lbnQsIGFuZCBjcmVhdGVcbiAgICAgICAgICAvLyBhIFRlbXBsYXRlUGFydCBmb3IgZWFjaCBtYXJrZXIuXG4gICAgICAgICAgY29uc3Qgc3RyaW5ncyA9IChub2RlIGFzIEVsZW1lbnQpLnRleHRDb250ZW50IS5zcGxpdChtYXJrZXIpO1xuICAgICAgICAgIGNvbnN0IGxhc3RJbmRleCA9IHN0cmluZ3MubGVuZ3RoIC0gMTtcbiAgICAgICAgICBpZiAobGFzdEluZGV4ID4gMCkge1xuICAgICAgICAgICAgKG5vZGUgYXMgRWxlbWVudCkudGV4dENvbnRlbnQgPSB0cnVzdGVkVHlwZXNcbiAgICAgICAgICAgICAgPyAodHJ1c3RlZFR5cGVzLmVtcHR5U2NyaXB0IGFzIHVua25vd24gYXMgJycpXG4gICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICAvLyBHZW5lcmF0ZSBhIG5ldyB0ZXh0IG5vZGUgZm9yIGVhY2ggbGl0ZXJhbCBzZWN0aW9uXG4gICAgICAgICAgICAvLyBUaGVzZSBub2RlcyBhcmUgYWxzbyB1c2VkIGFzIHRoZSBtYXJrZXJzIGZvciBub2RlIHBhcnRzXG4gICAgICAgICAgICAvLyBXZSBjYW4ndCB1c2UgZW1wdHkgdGV4dCBub2RlcyBhcyBtYXJrZXJzIGJlY2F1c2UgdGhleSdyZVxuICAgICAgICAgICAgLy8gbm9ybWFsaXplZCB3aGVuIGNsb25pbmcgaW4gSUUgKGNvdWxkIHNpbXBsaWZ5IHdoZW5cbiAgICAgICAgICAgIC8vIElFIGlzIG5vIGxvbmdlciBzdXBwb3J0ZWQpXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxhc3RJbmRleDsgaSsrKSB7XG4gICAgICAgICAgICAgIChub2RlIGFzIEVsZW1lbnQpLmFwcGVuZChzdHJpbmdzW2ldLCBjcmVhdGVNYXJrZXIoKSk7XG4gICAgICAgICAgICAgIC8vIFdhbGsgcGFzdCB0aGUgbWFya2VyIG5vZGUgd2UganVzdCBhZGRlZFxuICAgICAgICAgICAgICB3YWxrZXIubmV4dE5vZGUoKTtcbiAgICAgICAgICAgICAgcGFydHMucHVzaCh7dHlwZTogQ0hJTERfUEFSVCwgaW5kZXg6ICsrbm9kZUluZGV4fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBOb3RlIGJlY2F1c2UgdGhpcyBtYXJrZXIgaXMgYWRkZWQgYWZ0ZXIgdGhlIHdhbGtlcidzIGN1cnJlbnRcbiAgICAgICAgICAgIC8vIG5vZGUsIGl0IHdpbGwgYmUgd2Fsa2VkIHRvIGluIHRoZSBvdXRlciBsb29wIChhbmQgaWdub3JlZCksIHNvXG4gICAgICAgICAgICAvLyB3ZSBkb24ndCBuZWVkIHRvIGFkanVzdCBub2RlSW5kZXggaGVyZVxuICAgICAgICAgICAgKG5vZGUgYXMgRWxlbWVudCkuYXBwZW5kKHN0cmluZ3NbbGFzdEluZGV4XSwgY3JlYXRlTWFya2VyKCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChub2RlLm5vZGVUeXBlID09PSA4KSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSAobm9kZSBhcyBDb21tZW50KS5kYXRhO1xuICAgICAgICBpZiAoZGF0YSA9PT0gbWFya2VyTWF0Y2gpIHtcbiAgICAgICAgICBwYXJ0cy5wdXNoKHt0eXBlOiBDSElMRF9QQVJULCBpbmRleDogbm9kZUluZGV4fSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0IGkgPSAtMTtcbiAgICAgICAgICB3aGlsZSAoKGkgPSAobm9kZSBhcyBDb21tZW50KS5kYXRhLmluZGV4T2YobWFya2VyLCBpICsgMSkpICE9PSAtMSkge1xuICAgICAgICAgICAgLy8gQ29tbWVudCBub2RlIGhhcyBhIGJpbmRpbmcgbWFya2VyIGluc2lkZSwgbWFrZSBhbiBpbmFjdGl2ZSBwYXJ0XG4gICAgICAgICAgICAvLyBUaGUgYmluZGluZyB3b24ndCB3b3JrLCBidXQgc3Vic2VxdWVudCBiaW5kaW5ncyB3aWxsXG4gICAgICAgICAgICBwYXJ0cy5wdXNoKHt0eXBlOiBDT01NRU5UX1BBUlQsIGluZGV4OiBub2RlSW5kZXh9KTtcbiAgICAgICAgICAgIC8vIE1vdmUgdG8gdGhlIGVuZCBvZiB0aGUgbWF0Y2hcbiAgICAgICAgICAgIGkgKz0gbWFya2VyLmxlbmd0aCAtIDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBub2RlSW5kZXgrKztcbiAgICB9XG4gIH1cblxuICAvLyBPdmVycmlkZGVuIHZpYSBgbGl0SHRtbFBvbHlmaWxsU3VwcG9ydGAgdG8gcHJvdmlkZSBwbGF0Zm9ybSBzdXBwb3J0LlxuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGNyZWF0ZUVsZW1lbnQoaHRtbDogVHJ1c3RlZEhUTUwsIF9vcHRpb25zPzogUmVuZGVyT3B0aW9ucykge1xuICAgIGNvbnN0IGVsID0gZC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICAgIGVsLmlubmVySFRNTCA9IGh0bWwgYXMgdW5rbm93biBhcyBzdHJpbmc7XG4gICAgcmV0dXJuIGVsO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGlzY29ubmVjdGFibGUge1xuICBfJHBhcmVudD86IERpc2Nvbm5lY3RhYmxlO1xuICBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4/OiBTZXQ8RGlzY29ubmVjdGFibGU+O1xuICAvLyBSYXRoZXIgdGhhbiBob2xkIGNvbm5lY3Rpb24gc3RhdGUgb24gaW5zdGFuY2VzLCBEaXNjb25uZWN0YWJsZXMgcmVjdXJzaXZlbHlcbiAgLy8gZmV0Y2ggdGhlIGNvbm5lY3Rpb24gc3RhdGUgZnJvbSB0aGUgUm9vdFBhcnQgdGhleSBhcmUgY29ubmVjdGVkIGluIHZpYVxuICAvLyBnZXR0ZXJzIHVwIHRoZSBEaXNjb25uZWN0YWJsZSB0cmVlIHZpYSBfJHBhcmVudCByZWZlcmVuY2VzLiBUaGlzIHB1c2hlcyB0aGVcbiAgLy8gY29zdCBvZiB0cmFja2luZyB0aGUgaXNDb25uZWN0ZWQgc3RhdGUgdG8gYEFzeW5jRGlyZWN0aXZlc2AsIGFuZCBhdm9pZHNcbiAgLy8gbmVlZGluZyB0byBwYXNzIGFsbCBEaXNjb25uZWN0YWJsZXMgKHBhcnRzLCB0ZW1wbGF0ZSBpbnN0YW5jZXMsIGFuZFxuICAvLyBkaXJlY3RpdmVzKSB0aGVpciBjb25uZWN0aW9uIHN0YXRlIGVhY2ggdGltZSBpdCBjaGFuZ2VzLCB3aGljaCB3b3VsZCBiZVxuICAvLyBjb3N0bHkgZm9yIHRyZWVzIHRoYXQgaGF2ZSBubyBBc3luY0RpcmVjdGl2ZXMuXG4gIF8kaXNDb25uZWN0ZWQ6IGJvb2xlYW47XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVEaXJlY3RpdmUoXG4gIHBhcnQ6IENoaWxkUGFydCB8IEF0dHJpYnV0ZVBhcnQgfCBFbGVtZW50UGFydCxcbiAgdmFsdWU6IHVua25vd24sXG4gIHBhcmVudDogRGlyZWN0aXZlUGFyZW50ID0gcGFydCxcbiAgYXR0cmlidXRlSW5kZXg/OiBudW1iZXJcbik6IHVua25vd24ge1xuICAvLyBCYWlsIGVhcmx5IGlmIHRoZSB2YWx1ZSBpcyBleHBsaWNpdGx5IG5vQ2hhbmdlLiBOb3RlLCB0aGlzIG1lYW5zIGFueVxuICAvLyBuZXN0ZWQgZGlyZWN0aXZlIGlzIHN0aWxsIGF0dGFjaGVkIGFuZCBpcyBub3QgcnVuLlxuICBpZiAodmFsdWUgPT09IG5vQ2hhbmdlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIGxldCBjdXJyZW50RGlyZWN0aXZlID1cbiAgICBhdHRyaWJ1dGVJbmRleCAhPT0gdW5kZWZpbmVkXG4gICAgICA/IChwYXJlbnQgYXMgQXR0cmlidXRlUGFydCkuX19kaXJlY3RpdmVzPy5bYXR0cmlidXRlSW5kZXhdXG4gICAgICA6IChwYXJlbnQgYXMgQ2hpbGRQYXJ0IHwgRWxlbWVudFBhcnQgfCBEaXJlY3RpdmUpLl9fZGlyZWN0aXZlO1xuICBjb25zdCBuZXh0RGlyZWN0aXZlQ29uc3RydWN0b3IgPSBpc1ByaW1pdGl2ZSh2YWx1ZSlcbiAgICA/IHVuZGVmaW5lZFxuICAgIDogLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICAgICh2YWx1ZSBhcyBEaXJlY3RpdmVSZXN1bHQpWydfJGxpdERpcmVjdGl2ZSQnXTtcbiAgaWYgKGN1cnJlbnREaXJlY3RpdmU/LmNvbnN0cnVjdG9yICE9PSBuZXh0RGlyZWN0aXZlQ29uc3RydWN0b3IpIHtcbiAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIGN1cnJlbnREaXJlY3RpdmU/LlsnXyRub3RpZnlEaXJlY3RpdmVDb25uZWN0aW9uQ2hhbmdlZCddPy4oZmFsc2UpO1xuICAgIGlmIChuZXh0RGlyZWN0aXZlQ29uc3RydWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY3VycmVudERpcmVjdGl2ZSA9IHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgY3VycmVudERpcmVjdGl2ZSA9IG5ldyBuZXh0RGlyZWN0aXZlQ29uc3RydWN0b3IocGFydCBhcyBQYXJ0SW5mbyk7XG4gICAgICBjdXJyZW50RGlyZWN0aXZlLl8kaW5pdGlhbGl6ZShwYXJ0LCBwYXJlbnQsIGF0dHJpYnV0ZUluZGV4KTtcbiAgICB9XG4gICAgaWYgKGF0dHJpYnV0ZUluZGV4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICgocGFyZW50IGFzIEF0dHJpYnV0ZVBhcnQpLl9fZGlyZWN0aXZlcyA/Pz0gW10pW2F0dHJpYnV0ZUluZGV4XSA9XG4gICAgICAgIGN1cnJlbnREaXJlY3RpdmU7XG4gICAgfSBlbHNlIHtcbiAgICAgIChwYXJlbnQgYXMgQ2hpbGRQYXJ0IHwgRGlyZWN0aXZlKS5fX2RpcmVjdGl2ZSA9IGN1cnJlbnREaXJlY3RpdmU7XG4gICAgfVxuICB9XG4gIGlmIChjdXJyZW50RGlyZWN0aXZlICE9PSB1bmRlZmluZWQpIHtcbiAgICB2YWx1ZSA9IHJlc29sdmVEaXJlY3RpdmUoXG4gICAgICBwYXJ0LFxuICAgICAgY3VycmVudERpcmVjdGl2ZS5fJHJlc29sdmUocGFydCwgKHZhbHVlIGFzIERpcmVjdGl2ZVJlc3VsdCkudmFsdWVzKSxcbiAgICAgIGN1cnJlbnREaXJlY3RpdmUsXG4gICAgICBhdHRyaWJ1dGVJbmRleFxuICAgICk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIEFuIHVwZGF0ZWFibGUgaW5zdGFuY2Ugb2YgYSBUZW1wbGF0ZS4gSG9sZHMgcmVmZXJlbmNlcyB0byB0aGUgUGFydHMgdXNlZCB0b1xuICogdXBkYXRlIHRoZSB0ZW1wbGF0ZSBpbnN0YW5jZS5cbiAqL1xuY2xhc3MgVGVtcGxhdGVJbnN0YW5jZSBpbXBsZW1lbnRzIERpc2Nvbm5lY3RhYmxlIHtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHRlbXBsYXRlOiBUZW1wbGF0ZTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfcGFydHM6IEFycmF5PFBhcnQgfCB1bmRlZmluZWQ+ID0gW107XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHBhcmVudDogQ2hpbGRQYXJ0O1xuICAvKiogQGludGVybmFsICovXG4gIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT4gPSB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IodGVtcGxhdGU6IFRlbXBsYXRlLCBwYXJlbnQ6IENoaWxkUGFydCkge1xuICAgIHRoaXMuXyR0ZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICAgIHRoaXMuXyRwYXJlbnQgPSBwYXJlbnQ7XG4gIH1cblxuICAvLyBDYWxsZWQgYnkgQ2hpbGRQYXJ0IHBhcmVudE5vZGUgZ2V0dGVyXG4gIGdldCBwYXJlbnROb2RlKCkge1xuICAgIHJldHVybiB0aGlzLl8kcGFyZW50LnBhcmVudE5vZGU7XG4gIH1cblxuICAvLyBTZWUgY29tbWVudCBpbiBEaXNjb25uZWN0YWJsZSBpbnRlcmZhY2UgZm9yIHdoeSB0aGlzIGlzIGEgZ2V0dGVyXG4gIGdldCBfJGlzQ29ubmVjdGVkKCkge1xuICAgIHJldHVybiB0aGlzLl8kcGFyZW50Ll8kaXNDb25uZWN0ZWQ7XG4gIH1cblxuICAvLyBUaGlzIG1ldGhvZCBpcyBzZXBhcmF0ZSBmcm9tIHRoZSBjb25zdHJ1Y3RvciBiZWNhdXNlIHdlIG5lZWQgdG8gcmV0dXJuIGFcbiAgLy8gRG9jdW1lbnRGcmFnbWVudCBhbmQgd2UgZG9uJ3Qgd2FudCB0byBob2xkIG9udG8gaXQgd2l0aCBhbiBpbnN0YW5jZSBmaWVsZC5cbiAgX2Nsb25lKG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQpIHtcbiAgICBjb25zdCB7XG4gICAgICBlbDoge2NvbnRlbnR9LFxuICAgICAgcGFydHM6IHBhcnRzLFxuICAgIH0gPSB0aGlzLl8kdGVtcGxhdGU7XG4gICAgY29uc3QgZnJhZ21lbnQgPSAob3B0aW9ucz8uY3JlYXRpb25TY29wZSA/PyBkKS5pbXBvcnROb2RlKGNvbnRlbnQsIHRydWUpO1xuICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IGZyYWdtZW50O1xuXG4gICAgbGV0IG5vZGUgPSB3YWxrZXIubmV4dE5vZGUoKSE7XG4gICAgbGV0IG5vZGVJbmRleCA9IDA7XG4gICAgbGV0IHBhcnRJbmRleCA9IDA7XG4gICAgbGV0IHRlbXBsYXRlUGFydCA9IHBhcnRzWzBdO1xuXG4gICAgd2hpbGUgKHRlbXBsYXRlUGFydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAobm9kZUluZGV4ID09PSB0ZW1wbGF0ZVBhcnQuaW5kZXgpIHtcbiAgICAgICAgbGV0IHBhcnQ6IFBhcnQgfCB1bmRlZmluZWQ7XG4gICAgICAgIGlmICh0ZW1wbGF0ZVBhcnQudHlwZSA9PT0gQ0hJTERfUEFSVCkge1xuICAgICAgICAgIHBhcnQgPSBuZXcgQ2hpbGRQYXJ0KFxuICAgICAgICAgICAgbm9kZSBhcyBIVE1MRWxlbWVudCxcbiAgICAgICAgICAgIG5vZGUubmV4dFNpYmxpbmcsXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgb3B0aW9uc1xuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAodGVtcGxhdGVQYXJ0LnR5cGUgPT09IEFUVFJJQlVURV9QQVJUKSB7XG4gICAgICAgICAgcGFydCA9IG5ldyB0ZW1wbGF0ZVBhcnQuY3RvcihcbiAgICAgICAgICAgIG5vZGUgYXMgSFRNTEVsZW1lbnQsXG4gICAgICAgICAgICB0ZW1wbGF0ZVBhcnQubmFtZSxcbiAgICAgICAgICAgIHRlbXBsYXRlUGFydC5zdHJpbmdzLFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgIG9wdGlvbnNcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlUGFydC50eXBlID09PSBFTEVNRU5UX1BBUlQpIHtcbiAgICAgICAgICBwYXJ0ID0gbmV3IEVsZW1lbnRQYXJ0KG5vZGUgYXMgSFRNTEVsZW1lbnQsIHRoaXMsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3BhcnRzLnB1c2gocGFydCk7XG4gICAgICAgIHRlbXBsYXRlUGFydCA9IHBhcnRzWysrcGFydEluZGV4XTtcbiAgICAgIH1cbiAgICAgIGlmIChub2RlSW5kZXggIT09IHRlbXBsYXRlUGFydD8uaW5kZXgpIHtcbiAgICAgICAgbm9kZSA9IHdhbGtlci5uZXh0Tm9kZSgpITtcbiAgICAgICAgbm9kZUluZGV4Kys7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmcmFnbWVudDtcbiAgfVxuXG4gIF91cGRhdGUodmFsdWVzOiBBcnJheTx1bmtub3duPikge1xuICAgIGxldCBpID0gMDtcbiAgICBmb3IgKGNvbnN0IHBhcnQgb2YgdGhpcy5fcGFydHMpIHtcbiAgICAgIGlmIChwYXJ0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKChwYXJ0IGFzIEF0dHJpYnV0ZVBhcnQpLnN0cmluZ3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIChwYXJ0IGFzIEF0dHJpYnV0ZVBhcnQpLl8kc2V0VmFsdWUodmFsdWVzLCBwYXJ0IGFzIEF0dHJpYnV0ZVBhcnQsIGkpO1xuICAgICAgICAgIC8vIFRoZSBudW1iZXIgb2YgdmFsdWVzIHRoZSBwYXJ0IGNvbnN1bWVzIGlzIHBhcnQuc3RyaW5ncy5sZW5ndGggLSAxXG4gICAgICAgICAgLy8gc2luY2UgdmFsdWVzIGFyZSBpbiBiZXR3ZWVuIHRlbXBsYXRlIHNwYW5zLiBXZSBpbmNyZW1lbnQgaSBieSAxXG4gICAgICAgICAgLy8gbGF0ZXIgaW4gdGhlIGxvb3AsIHNvIGluY3JlbWVudCBpdCBieSBwYXJ0LnN0cmluZ3MubGVuZ3RoIC0gMiBoZXJlXG4gICAgICAgICAgaSArPSAocGFydCBhcyBBdHRyaWJ1dGVQYXJ0KS5zdHJpbmdzIS5sZW5ndGggLSAyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhcnQuXyRzZXRWYWx1ZSh2YWx1ZXNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpKys7XG4gICAgfVxuICB9XG59XG5cbi8qXG4gKiBQYXJ0c1xuICovXG50eXBlIEF0dHJpYnV0ZVRlbXBsYXRlUGFydCA9IHtcbiAgcmVhZG9ubHkgdHlwZTogdHlwZW9mIEFUVFJJQlVURV9QQVJUO1xuICByZWFkb25seSBpbmRleDogbnVtYmVyO1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcmVhZG9ubHkgY3RvcjogdHlwZW9mIEF0dHJpYnV0ZVBhcnQ7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcmVhZG9ubHkgc3RyaW5nczogUmVhZG9ubHlBcnJheTxzdHJpbmc+O1xufTtcbnR5cGUgTm9kZVRlbXBsYXRlUGFydCA9IHtcbiAgcmVhZG9ubHkgdHlwZTogdHlwZW9mIENISUxEX1BBUlQ7XG4gIHJlYWRvbmx5IGluZGV4OiBudW1iZXI7XG59O1xudHlwZSBFbGVtZW50VGVtcGxhdGVQYXJ0ID0ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgRUxFTUVOVF9QQVJUO1xuICByZWFkb25seSBpbmRleDogbnVtYmVyO1xufTtcbnR5cGUgQ29tbWVudFRlbXBsYXRlUGFydCA9IHtcbiAgcmVhZG9ubHkgdHlwZTogdHlwZW9mIENPTU1FTlRfUEFSVDtcbiAgcmVhZG9ubHkgaW5kZXg6IG51bWJlcjtcbn07XG5cbi8qKlxuICogQSBUZW1wbGF0ZVBhcnQgcmVwcmVzZW50cyBhIGR5bmFtaWMgcGFydCBpbiBhIHRlbXBsYXRlLCBiZWZvcmUgdGhlIHRlbXBsYXRlXG4gKiBpcyBpbnN0YW50aWF0ZWQuIFdoZW4gYSB0ZW1wbGF0ZSBpcyBpbnN0YW50aWF0ZWQgUGFydHMgYXJlIGNyZWF0ZWQgZnJvbVxuICogVGVtcGxhdGVQYXJ0cy5cbiAqL1xudHlwZSBUZW1wbGF0ZVBhcnQgPVxuICB8IE5vZGVUZW1wbGF0ZVBhcnRcbiAgfCBBdHRyaWJ1dGVUZW1wbGF0ZVBhcnRcbiAgfCBFbGVtZW50VGVtcGxhdGVQYXJ0XG4gIHwgQ29tbWVudFRlbXBsYXRlUGFydDtcblxuZXhwb3J0IHR5cGUgUGFydCA9XG4gIHwgQ2hpbGRQYXJ0XG4gIHwgQXR0cmlidXRlUGFydFxuICB8IFByb3BlcnR5UGFydFxuICB8IEJvb2xlYW5BdHRyaWJ1dGVQYXJ0XG4gIHwgRWxlbWVudFBhcnRcbiAgfCBFdmVudFBhcnQ7XG5cbmV4cG9ydCB0eXBlIHtDaGlsZFBhcnR9O1xuY2xhc3MgQ2hpbGRQYXJ0IGltcGxlbWVudHMgRGlzY29ubmVjdGFibGUge1xuICByZWFkb25seSB0eXBlID0gQ0hJTERfUEFSVDtcbiAgcmVhZG9ubHkgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgXyRjb21taXR0ZWRWYWx1ZTogdW5rbm93biA9IG5vdGhpbmc7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX19kaXJlY3RpdmU/OiBEaXJlY3RpdmU7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRzdGFydE5vZGU6IENoaWxkTm9kZTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGVuZE5vZGU6IENoaWxkTm9kZSB8IG51bGw7XG4gIHByaXZhdGUgX3RleHRTYW5pdGl6ZXI6IFZhbHVlU2FuaXRpemVyIHwgdW5kZWZpbmVkO1xuICAvKiogQGludGVybmFsICovXG4gIF8kcGFyZW50OiBEaXNjb25uZWN0YWJsZSB8IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIENvbm5lY3Rpb24gc3RhdGUgZm9yIFJvb3RQYXJ0cyBvbmx5IChpLmUuIENoaWxkUGFydCB3aXRob3V0IF8kcGFyZW50XG4gICAqIHJldHVybmVkIGZyb20gdG9wLWxldmVsIGByZW5kZXJgKS4gVGhpcyBmaWVsZCBpcyB1bnNlZCBvdGhlcndpc2UuIFRoZVxuICAgKiBpbnRlbnRpb24gd291bGQgY2xlYXJlciBpZiB3ZSBtYWRlIGBSb290UGFydGAgYSBzdWJjbGFzcyBvZiBgQ2hpbGRQYXJ0YFxuICAgKiB3aXRoIHRoaXMgZmllbGQgKGFuZCBhIGRpZmZlcmVudCBfJGlzQ29ubmVjdGVkIGdldHRlciksIGJ1dCB0aGUgc3ViY2xhc3NcbiAgICogY2F1c2VkIGEgcGVyZiByZWdyZXNzaW9uLCBwb3NzaWJseSBkdWUgdG8gbWFraW5nIGNhbGwgc2l0ZXMgcG9seW1vcnBoaWMuXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgX19pc0Nvbm5lY3RlZDogYm9vbGVhbjtcblxuICAvLyBTZWUgY29tbWVudCBpbiBEaXNjb25uZWN0YWJsZSBpbnRlcmZhY2UgZm9yIHdoeSB0aGlzIGlzIGEgZ2V0dGVyXG4gIGdldCBfJGlzQ29ubmVjdGVkKCkge1xuICAgIC8vIENoaWxkUGFydHMgdGhhdCBhcmUgbm90IGF0IHRoZSByb290IHNob3VsZCBhbHdheXMgYmUgY3JlYXRlZCB3aXRoIGFcbiAgICAvLyBwYXJlbnQ7IG9ubHkgUm9vdENoaWxkTm9kZSdzIHdvbid0LCBzbyB0aGV5IHJldHVybiB0aGUgbG9jYWwgaXNDb25uZWN0ZWRcbiAgICAvLyBzdGF0ZVxuICAgIHJldHVybiB0aGlzLl8kcGFyZW50Py5fJGlzQ29ubmVjdGVkID8/IHRoaXMuX19pc0Nvbm5lY3RlZDtcbiAgfVxuXG4gIC8vIFRoZSBmb2xsb3dpbmcgZmllbGRzIHdpbGwgYmUgcGF0Y2hlZCBvbnRvIENoaWxkUGFydHMgd2hlbiByZXF1aXJlZCBieVxuICAvLyBBc3luY0RpcmVjdGl2ZVxuICAvKiogQGludGVybmFsICovXG4gIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT4gPSB1bmRlZmluZWQ7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZD8oXG4gICAgaXNDb25uZWN0ZWQ6IGJvb2xlYW4sXG4gICAgcmVtb3ZlRnJvbVBhcmVudD86IGJvb2xlYW4sXG4gICAgZnJvbT86IG51bWJlclxuICApOiB2b2lkO1xuICAvKiogQGludGVybmFsICovXG4gIF8kcmVwYXJlbnREaXNjb25uZWN0YWJsZXM/KHBhcmVudDogRGlzY29ubmVjdGFibGUpOiB2b2lkO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHN0YXJ0Tm9kZTogQ2hpbGROb2RlLFxuICAgIGVuZE5vZGU6IENoaWxkTm9kZSB8IG51bGwsXG4gICAgcGFyZW50OiBUZW1wbGF0ZUluc3RhbmNlIHwgQ2hpbGRQYXJ0IHwgdW5kZWZpbmVkLFxuICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgdGhpcy5fJHN0YXJ0Tm9kZSA9IHN0YXJ0Tm9kZTtcbiAgICB0aGlzLl8kZW5kTm9kZSA9IGVuZE5vZGU7XG4gICAgdGhpcy5fJHBhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIC8vIE5vdGUgX19pc0Nvbm5lY3RlZCBpcyBvbmx5IGV2ZXIgYWNjZXNzZWQgb24gUm9vdFBhcnRzIChpLmUuIHdoZW4gdGhlcmUgaXNcbiAgICAvLyBubyBfJHBhcmVudCk7IHRoZSB2YWx1ZSBvbiBhIG5vbi1yb290LXBhcnQgaXMgXCJkb24ndCBjYXJlXCIsIGJ1dCBjaGVja2luZ1xuICAgIC8vIGZvciBwYXJlbnQgd291bGQgYmUgbW9yZSBjb2RlXG4gICAgdGhpcy5fX2lzQ29ubmVjdGVkID0gb3B0aW9ucz8uaXNDb25uZWN0ZWQgPz8gdHJ1ZTtcbiAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICAvLyBFeHBsaWNpdGx5IGluaXRpYWxpemUgZm9yIGNvbnNpc3RlbnQgY2xhc3Mgc2hhcGUuXG4gICAgICB0aGlzLl90ZXh0U2FuaXRpemVyID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgcGFyZW50IG5vZGUgaW50byB3aGljaCB0aGUgcGFydCByZW5kZXJzIGl0cyBjb250ZW50LlxuICAgKlxuICAgKiBBIENoaWxkUGFydCdzIGNvbnRlbnQgY29uc2lzdHMgb2YgYSByYW5nZSBvZiBhZGphY2VudCBjaGlsZCBub2RlcyBvZlxuICAgKiBgLnBhcmVudE5vZGVgLCBwb3NzaWJseSBib3JkZXJlZCBieSAnbWFya2VyIG5vZGVzJyAoYC5zdGFydE5vZGVgIGFuZFxuICAgKiBgLmVuZE5vZGVgKS5cbiAgICpcbiAgICogLSBJZiBib3RoIGAuc3RhcnROb2RlYCBhbmQgYC5lbmROb2RlYCBhcmUgbm9uLW51bGwsIHRoZW4gdGhlIHBhcnQncyBjb250ZW50XG4gICAqIGNvbnNpc3RzIG9mIGFsbCBzaWJsaW5ncyBiZXR3ZWVuIGAuc3RhcnROb2RlYCBhbmQgYC5lbmROb2RlYCwgZXhjbHVzaXZlbHkuXG4gICAqXG4gICAqIC0gSWYgYC5zdGFydE5vZGVgIGlzIG5vbi1udWxsIGJ1dCBgLmVuZE5vZGVgIGlzIG51bGwsIHRoZW4gdGhlIHBhcnQnc1xuICAgKiBjb250ZW50IGNvbnNpc3RzIG9mIGFsbCBzaWJsaW5ncyBmb2xsb3dpbmcgYC5zdGFydE5vZGVgLCB1cCB0byBhbmRcbiAgICogaW5jbHVkaW5nIHRoZSBsYXN0IGNoaWxkIG9mIGAucGFyZW50Tm9kZWAuIElmIGAuZW5kTm9kZWAgaXMgbm9uLW51bGwsIHRoZW5cbiAgICogYC5zdGFydE5vZGVgIHdpbGwgYWx3YXlzIGJlIG5vbi1udWxsLlxuICAgKlxuICAgKiAtIElmIGJvdGggYC5lbmROb2RlYCBhbmQgYC5zdGFydE5vZGVgIGFyZSBudWxsLCB0aGVuIHRoZSBwYXJ0J3MgY29udGVudFxuICAgKiBjb25zaXN0cyBvZiBhbGwgY2hpbGQgbm9kZXMgb2YgYC5wYXJlbnROb2RlYC5cbiAgICovXG4gIGdldCBwYXJlbnROb2RlKCk6IE5vZGUge1xuICAgIGxldCBwYXJlbnROb2RlOiBOb2RlID0gd3JhcCh0aGlzLl8kc3RhcnROb2RlKS5wYXJlbnROb2RlITtcbiAgICBjb25zdCBwYXJlbnQgPSB0aGlzLl8kcGFyZW50O1xuICAgIGlmIChcbiAgICAgIHBhcmVudCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICBwYXJlbnROb2RlLm5vZGVUeXBlID09PSAxMSAvKiBOb2RlLkRPQ1VNRU5UX0ZSQUdNRU5UICovXG4gICAgKSB7XG4gICAgICAvLyBJZiB0aGUgcGFyZW50Tm9kZSBpcyBhIERvY3VtZW50RnJhZ21lbnQsIGl0IG1heSBiZSBiZWNhdXNlIHRoZSBET00gaXNcbiAgICAgIC8vIHN0aWxsIGluIHRoZSBjbG9uZWQgZnJhZ21lbnQgZHVyaW5nIGluaXRpYWwgcmVuZGVyOyBpZiBzbywgZ2V0IHRoZSByZWFsXG4gICAgICAvLyBwYXJlbnROb2RlIHRoZSBwYXJ0IHdpbGwgYmUgY29tbWl0dGVkIGludG8gYnkgYXNraW5nIHRoZSBwYXJlbnQuXG4gICAgICBwYXJlbnROb2RlID0gKHBhcmVudCBhcyBDaGlsZFBhcnQgfCBUZW1wbGF0ZUluc3RhbmNlKS5wYXJlbnROb2RlO1xuICAgIH1cbiAgICByZXR1cm4gcGFyZW50Tm9kZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgcGFydCdzIGxlYWRpbmcgbWFya2VyIG5vZGUsIGlmIGFueS4gU2VlIGAucGFyZW50Tm9kZWAgZm9yIG1vcmVcbiAgICogaW5mb3JtYXRpb24uXG4gICAqL1xuICBnZXQgc3RhcnROb2RlKCk6IE5vZGUgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5fJHN0YXJ0Tm9kZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgcGFydCdzIHRyYWlsaW5nIG1hcmtlciBub2RlLCBpZiBhbnkuIFNlZSBgLnBhcmVudE5vZGVgIGZvciBtb3JlXG4gICAqIGluZm9ybWF0aW9uLlxuICAgKi9cbiAgZ2V0IGVuZE5vZGUoKTogTm9kZSB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLl8kZW5kTm9kZTtcbiAgfVxuXG4gIF8kc2V0VmFsdWUodmFsdWU6IHVua25vd24sIGRpcmVjdGl2ZVBhcmVudDogRGlyZWN0aXZlUGFyZW50ID0gdGhpcyk6IHZvaWQge1xuICAgIGlmIChERVZfTU9ERSAmJiB0aGlzLnBhcmVudE5vZGUgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFRoaXMgXFxgQ2hpbGRQYXJ0XFxgIGhhcyBubyBcXGBwYXJlbnROb2RlXFxgIGFuZCB0aGVyZWZvcmUgY2Fubm90IGFjY2VwdCBhIHZhbHVlLiBUaGlzIGxpa2VseSBtZWFucyB0aGUgZWxlbWVudCBjb250YWluaW5nIHRoZSBwYXJ0IHdhcyBtYW5pcHVsYXRlZCBpbiBhbiB1bnN1cHBvcnRlZCB3YXkgb3V0c2lkZSBvZiBMaXQncyBjb250cm9sIHN1Y2ggdGhhdCB0aGUgcGFydCdzIG1hcmtlciBub2RlcyB3ZXJlIGVqZWN0ZWQgZnJvbSBET00uIEZvciBleGFtcGxlLCBzZXR0aW5nIHRoZSBlbGVtZW50J3MgXFxgaW5uZXJIVE1MXFxgIG9yIFxcYHRleHRDb250ZW50XFxgIGNhbiBkbyB0aGlzLmBcbiAgICAgICk7XG4gICAgfVxuICAgIHZhbHVlID0gcmVzb2x2ZURpcmVjdGl2ZSh0aGlzLCB2YWx1ZSwgZGlyZWN0aXZlUGFyZW50KTtcbiAgICBpZiAoaXNQcmltaXRpdmUodmFsdWUpKSB7XG4gICAgICAvLyBOb24tcmVuZGVyaW5nIGNoaWxkIHZhbHVlcy4gSXQncyBpbXBvcnRhbnQgdGhhdCB0aGVzZSBkbyBub3QgcmVuZGVyXG4gICAgICAvLyBlbXB0eSB0ZXh0IG5vZGVzIHRvIGF2b2lkIGlzc3VlcyB3aXRoIHByZXZlbnRpbmcgZGVmYXVsdCA8c2xvdD5cbiAgICAgIC8vIGZhbGxiYWNrIGNvbnRlbnQuXG4gICAgICBpZiAodmFsdWUgPT09IG5vdGhpbmcgfHwgdmFsdWUgPT0gbnVsbCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICAgICAgaWYgKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSAhPT0gbm90aGluZykge1xuICAgICAgICAgIHRoaXMuXyRjbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IG5vdGhpbmc7XG4gICAgICB9IGVsc2UgaWYgKHZhbHVlICE9PSB0aGlzLl8kY29tbWl0dGVkVmFsdWUgJiYgdmFsdWUgIT09IG5vQ2hhbmdlKSB7XG4gICAgICAgIHRoaXMuX2NvbW1pdFRleHQodmFsdWUpO1xuICAgICAgfVxuICAgICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICB9IGVsc2UgaWYgKCh2YWx1ZSBhcyBUZW1wbGF0ZVJlc3VsdClbJ18kbGl0VHlwZSQnXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9jb21taXRUZW1wbGF0ZVJlc3VsdCh2YWx1ZSBhcyBUZW1wbGF0ZVJlc3VsdCk7XG4gICAgfSBlbHNlIGlmICgodmFsdWUgYXMgTm9kZSkubm9kZVR5cGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fY29tbWl0Tm9kZSh2YWx1ZSBhcyBOb2RlKTtcbiAgICB9IGVsc2UgaWYgKGlzSXRlcmFibGUodmFsdWUpKSB7XG4gICAgICB0aGlzLl9jb21taXRJdGVyYWJsZSh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEZhbGxiYWNrLCB3aWxsIHJlbmRlciB0aGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAgICB0aGlzLl9jb21taXRUZXh0KHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9pbnNlcnQ8VCBleHRlbmRzIE5vZGU+KG5vZGU6IFQsIHJlZiA9IHRoaXMuXyRlbmROb2RlKSB7XG4gICAgcmV0dXJuIHdyYXAod3JhcCh0aGlzLl8kc3RhcnROb2RlKS5wYXJlbnROb2RlISkuaW5zZXJ0QmVmb3JlKG5vZGUsIHJlZik7XG4gIH1cblxuICBwcml2YXRlIF9jb21taXROb2RlKHZhbHVlOiBOb2RlKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgIHRoaXMuXyRjbGVhcigpO1xuICAgICAgaWYgKFxuICAgICAgICBFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MgJiZcbiAgICAgICAgc2FuaXRpemVyRmFjdG9yeUludGVybmFsICE9PSBub29wU2FuaXRpemVyXG4gICAgICApIHtcbiAgICAgICAgY29uc3QgcGFyZW50Tm9kZU5hbWUgPSB0aGlzLl8kc3RhcnROb2RlLnBhcmVudE5vZGU/Lm5vZGVOYW1lO1xuICAgICAgICBpZiAocGFyZW50Tm9kZU5hbWUgPT09ICdTVFlMRScgfHwgcGFyZW50Tm9kZU5hbWUgPT09ICdTQ1JJUFQnKSB7XG4gICAgICAgICAgbGV0IG1lc3NhZ2UgPSAnRm9yYmlkZGVuJztcbiAgICAgICAgICBpZiAoREVWX01PREUpIHtcbiAgICAgICAgICAgIGlmIChwYXJlbnROb2RlTmFtZSA9PT0gJ1NUWUxFJykge1xuICAgICAgICAgICAgICBtZXNzYWdlID1cbiAgICAgICAgICAgICAgICBgTGl0IGRvZXMgbm90IHN1cHBvcnQgYmluZGluZyBpbnNpZGUgc3R5bGUgbm9kZXMuIGAgK1xuICAgICAgICAgICAgICAgIGBUaGlzIGlzIGEgc2VjdXJpdHkgcmlzaywgYXMgc3R5bGUgaW5qZWN0aW9uIGF0dGFja3MgY2FuIGAgK1xuICAgICAgICAgICAgICAgIGBleGZpbHRyYXRlIGRhdGEgYW5kIHNwb29mIFVJcy4gYCArXG4gICAgICAgICAgICAgICAgYENvbnNpZGVyIGluc3RlYWQgdXNpbmcgY3NzXFxgLi4uXFxgIGxpdGVyYWxzIGAgK1xuICAgICAgICAgICAgICAgIGB0byBjb21wb3NlIHN0eWxlcywgYW5kIG1ha2UgZG8gZHluYW1pYyBzdHlsaW5nIHdpdGggYCArXG4gICAgICAgICAgICAgICAgYGNzcyBjdXN0b20gcHJvcGVydGllcywgOjpwYXJ0cywgPHNsb3Q+cywgYCArXG4gICAgICAgICAgICAgICAgYGFuZCBieSBtdXRhdGluZyB0aGUgRE9NIHJhdGhlciB0aGFuIHN0eWxlc2hlZXRzLmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBtZXNzYWdlID1cbiAgICAgICAgICAgICAgICBgTGl0IGRvZXMgbm90IHN1cHBvcnQgYmluZGluZyBpbnNpZGUgc2NyaXB0IG5vZGVzLiBgICtcbiAgICAgICAgICAgICAgICBgVGhpcyBpcyBhIHNlY3VyaXR5IHJpc2ssIGFzIGl0IGNvdWxkIGFsbG93IGFyYml0cmFyeSBgICtcbiAgICAgICAgICAgICAgICBgY29kZSBleGVjdXRpb24uYDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSB0aGlzLl9pbnNlcnQodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2NvbW1pdFRleHQodmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICAvLyBJZiB0aGUgY29tbWl0dGVkIHZhbHVlIGlzIGEgcHJpbWl0aXZlIGl0IG1lYW5zIHdlIGNhbGxlZCBfY29tbWl0VGV4dCBvblxuICAgIC8vIHRoZSBwcmV2aW91cyByZW5kZXIsIGFuZCB3ZSBrbm93IHRoYXQgdGhpcy5fJHN0YXJ0Tm9kZS5uZXh0U2libGluZyBpcyBhXG4gICAgLy8gVGV4dCBub2RlLiBXZSBjYW4gbm93IGp1c3QgcmVwbGFjZSB0aGUgdGV4dCBjb250ZW50ICguZGF0YSkgb2YgdGhlIG5vZGUuXG4gICAgaWYgKFxuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlICE9PSBub3RoaW5nICYmXG4gICAgICBpc1ByaW1pdGl2ZSh0aGlzLl8kY29tbWl0dGVkVmFsdWUpXG4gICAgKSB7XG4gICAgICBjb25zdCBub2RlID0gd3JhcCh0aGlzLl8kc3RhcnROb2RlKS5uZXh0U2libGluZyBhcyBUZXh0O1xuICAgICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgICBpZiAodGhpcy5fdGV4dFNhbml0aXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhpcy5fdGV4dFNhbml0aXplciA9IGNyZWF0ZVNhbml0aXplcihub2RlLCAnZGF0YScsICdwcm9wZXJ0eScpO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlID0gdGhpcy5fdGV4dFNhbml0aXplcih2YWx1ZSk7XG4gICAgICB9XG4gICAgICAobm9kZSBhcyBUZXh0KS5kYXRhID0gdmFsdWUgYXMgc3RyaW5nO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICAgIGNvbnN0IHRleHROb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgICB0aGlzLl9jb21taXROb2RlKHRleHROb2RlKTtcbiAgICAgICAgLy8gV2hlbiBzZXR0aW5nIHRleHQgY29udGVudCwgZm9yIHNlY3VyaXR5IHB1cnBvc2VzIGl0IG1hdHRlcnMgYSBsb3RcbiAgICAgICAgLy8gd2hhdCB0aGUgcGFyZW50IGlzLiBGb3IgZXhhbXBsZSwgPHN0eWxlPiBhbmQgPHNjcmlwdD4gbmVlZCB0byBiZVxuICAgICAgICAvLyBoYW5kbGVkIHdpdGggY2FyZSwgd2hpbGUgPHNwYW4+IGRvZXMgbm90LiBTbyBmaXJzdCB3ZSBuZWVkIHRvIHB1dCBhXG4gICAgICAgIC8vIHRleHQgbm9kZSBpbnRvIHRoZSBkb2N1bWVudCwgdGhlbiB3ZSBjYW4gc2FuaXRpemUgaXRzIGNvbnRlbnR4LlxuICAgICAgICBpZiAodGhpcy5fdGV4dFNhbml0aXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhpcy5fdGV4dFNhbml0aXplciA9IGNyZWF0ZVNhbml0aXplcih0ZXh0Tm9kZSwgJ2RhdGEnLCAncHJvcGVydHknKTtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZSA9IHRoaXMuX3RleHRTYW5pdGl6ZXIodmFsdWUpO1xuICAgICAgICB0ZXh0Tm9kZS5kYXRhID0gdmFsdWUgYXMgc3RyaW5nO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fY29tbWl0Tm9kZShkLmNyZWF0ZVRleHROb2RlKHZhbHVlIGFzIHN0cmluZykpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSB2YWx1ZTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbW1pdFRlbXBsYXRlUmVzdWx0KFxuICAgIHJlc3VsdDogVGVtcGxhdGVSZXN1bHQgfCBDb21waWxlZFRlbXBsYXRlUmVzdWx0XG4gICk6IHZvaWQge1xuICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgY29uc3Qge3ZhbHVlcywgWydfJGxpdFR5cGUkJ106IHR5cGV9ID0gcmVzdWx0O1xuICAgIC8vIElmICRsaXRUeXBlJCBpcyBhIG51bWJlciwgcmVzdWx0IGlzIGEgcGxhaW4gVGVtcGxhdGVSZXN1bHQgYW5kIHdlIGdldFxuICAgIC8vIHRoZSB0ZW1wbGF0ZSBmcm9tIHRoZSB0ZW1wbGF0ZSBjYWNoZS4gSWYgbm90LCByZXN1bHQgaXMgYVxuICAgIC8vIENvbXBpbGVkVGVtcGxhdGVSZXN1bHQgYW5kIF8kbGl0VHlwZSQgaXMgYSBDb21waWxlZFRlbXBsYXRlIGFuZCB3ZSBuZWVkXG4gICAgLy8gdG8gY3JlYXRlIHRoZSA8dGVtcGxhdGU+IGVsZW1lbnQgdGhlIGZpcnN0IHRpbWUgd2Ugc2VlIGl0LlxuICAgIGNvbnN0IHRlbXBsYXRlOiBUZW1wbGF0ZSB8IENvbXBpbGVkVGVtcGxhdGUgPVxuICAgICAgdHlwZW9mIHR5cGUgPT09ICdudW1iZXInXG4gICAgICAgID8gdGhpcy5fJGdldFRlbXBsYXRlKHJlc3VsdCBhcyBUZW1wbGF0ZVJlc3VsdClcbiAgICAgICAgOiAodHlwZS5lbCA9PT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAodHlwZS5lbCA9IFRlbXBsYXRlLmNyZWF0ZUVsZW1lbnQodHlwZS5oLCB0aGlzLm9wdGlvbnMpKSxcbiAgICAgICAgICB0eXBlKTtcblxuICAgIGlmICgodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIFRlbXBsYXRlSW5zdGFuY2UpPy5fJHRlbXBsYXRlID09PSB0ZW1wbGF0ZSkge1xuICAgICAgKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBUZW1wbGF0ZUluc3RhbmNlKS5fdXBkYXRlKHZhbHVlcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGluc3RhbmNlID0gbmV3IFRlbXBsYXRlSW5zdGFuY2UodGVtcGxhdGUgYXMgVGVtcGxhdGUsIHRoaXMpO1xuICAgICAgY29uc3QgZnJhZ21lbnQgPSBpbnN0YW5jZS5fY2xvbmUodGhpcy5vcHRpb25zKTtcbiAgICAgIGluc3RhbmNlLl91cGRhdGUodmFsdWVzKTtcbiAgICAgIHRoaXMuX2NvbW1pdE5vZGUoZnJhZ21lbnQpO1xuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gaW5zdGFuY2U7XG4gICAgfVxuICB9XG5cbiAgLy8gT3ZlcnJpZGRlbiB2aWEgYGxpdEh0bWxQb2x5ZmlsbFN1cHBvcnRgIHRvIHByb3ZpZGUgcGxhdGZvcm0gc3VwcG9ydC5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGdldFRlbXBsYXRlKHJlc3VsdDogVGVtcGxhdGVSZXN1bHQpIHtcbiAgICBsZXQgdGVtcGxhdGUgPSB0ZW1wbGF0ZUNhY2hlLmdldChyZXN1bHQuc3RyaW5ncyk7XG4gICAgaWYgKHRlbXBsYXRlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRlbXBsYXRlQ2FjaGUuc2V0KHJlc3VsdC5zdHJpbmdzLCAodGVtcGxhdGUgPSBuZXcgVGVtcGxhdGUocmVzdWx0KSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGVtcGxhdGU7XG4gIH1cblxuICBwcml2YXRlIF9jb21taXRJdGVyYWJsZSh2YWx1ZTogSXRlcmFibGU8dW5rbm93bj4pOiB2b2lkIHtcbiAgICAvLyBGb3IgYW4gSXRlcmFibGUsIHdlIGNyZWF0ZSBhIG5ldyBJbnN0YW5jZVBhcnQgcGVyIGl0ZW0sIHRoZW4gc2V0IGl0c1xuICAgIC8vIHZhbHVlIHRvIHRoZSBpdGVtLiBUaGlzIGlzIGEgbGl0dGxlIGJpdCBvZiBvdmVyaGVhZCBmb3IgZXZlcnkgaXRlbSBpblxuICAgIC8vIGFuIEl0ZXJhYmxlLCBidXQgaXQgbGV0cyB1cyByZWN1cnNlIGVhc2lseSBhbmQgZWZmaWNpZW50bHkgdXBkYXRlIEFycmF5c1xuICAgIC8vIG9mIFRlbXBsYXRlUmVzdWx0cyB0aGF0IHdpbGwgYmUgY29tbW9ubHkgcmV0dXJuZWQgZnJvbSBleHByZXNzaW9ucyBsaWtlOlxuICAgIC8vIGFycmF5Lm1hcCgoaSkgPT4gaHRtbGAke2l9YCksIGJ5IHJldXNpbmcgZXhpc3RpbmcgVGVtcGxhdGVJbnN0YW5jZXMuXG5cbiAgICAvLyBJZiB2YWx1ZSBpcyBhbiBhcnJheSwgdGhlbiB0aGUgcHJldmlvdXMgcmVuZGVyIHdhcyBvZiBhblxuICAgIC8vIGl0ZXJhYmxlIGFuZCB2YWx1ZSB3aWxsIGNvbnRhaW4gdGhlIENoaWxkUGFydHMgZnJvbSB0aGUgcHJldmlvdXNcbiAgICAvLyByZW5kZXIuIElmIHZhbHVlIGlzIG5vdCBhbiBhcnJheSwgY2xlYXIgdGhpcyBwYXJ0IGFuZCBtYWtlIGEgbmV3XG4gICAgLy8gYXJyYXkgZm9yIENoaWxkUGFydHMuXG4gICAgaWYgKCFpc0FycmF5KHRoaXMuXyRjb21taXR0ZWRWYWx1ZSkpIHtcbiAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IFtdO1xuICAgICAgdGhpcy5fJGNsZWFyKCk7XG4gICAgfVxuXG4gICAgLy8gTGV0cyB1cyBrZWVwIHRyYWNrIG9mIGhvdyBtYW55IGl0ZW1zIHdlIHN0YW1wZWQgc28gd2UgY2FuIGNsZWFyIGxlZnRvdmVyXG4gICAgLy8gaXRlbXMgZnJvbSBhIHByZXZpb3VzIHJlbmRlclxuICAgIGNvbnN0IGl0ZW1QYXJ0cyA9IHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBDaGlsZFBhcnRbXTtcbiAgICBsZXQgcGFydEluZGV4ID0gMDtcbiAgICBsZXQgaXRlbVBhcnQ6IENoaWxkUGFydCB8IHVuZGVmaW5lZDtcblxuICAgIGZvciAoY29uc3QgaXRlbSBvZiB2YWx1ZSkge1xuICAgICAgaWYgKHBhcnRJbmRleCA9PT0gaXRlbVBhcnRzLmxlbmd0aCkge1xuICAgICAgICAvLyBJZiBubyBleGlzdGluZyBwYXJ0LCBjcmVhdGUgYSBuZXcgb25lXG4gICAgICAgIC8vIFRPRE8gKGp1c3RpbmZhZ25hbmkpOiB0ZXN0IHBlcmYgaW1wYWN0IG9mIGFsd2F5cyBjcmVhdGluZyB0d28gcGFydHNcbiAgICAgICAgLy8gaW5zdGVhZCBvZiBzaGFyaW5nIHBhcnRzIGJldHdlZW4gbm9kZXNcbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2xpdC9saXQvaXNzdWVzLzEyNjZcbiAgICAgICAgaXRlbVBhcnRzLnB1c2goXG4gICAgICAgICAgKGl0ZW1QYXJ0ID0gbmV3IENoaWxkUGFydChcbiAgICAgICAgICAgIHRoaXMuX2luc2VydChjcmVhdGVNYXJrZXIoKSksXG4gICAgICAgICAgICB0aGlzLl9pbnNlcnQoY3JlYXRlTWFya2VyKCkpLFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgIHRoaXMub3B0aW9uc1xuICAgICAgICAgICkpXG4gICAgICAgICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBSZXVzZSBhbiBleGlzdGluZyBwYXJ0XG4gICAgICAgIGl0ZW1QYXJ0ID0gaXRlbVBhcnRzW3BhcnRJbmRleF07XG4gICAgICB9XG4gICAgICBpdGVtUGFydC5fJHNldFZhbHVlKGl0ZW0pO1xuICAgICAgcGFydEluZGV4Kys7XG4gICAgfVxuXG4gICAgaWYgKHBhcnRJbmRleCA8IGl0ZW1QYXJ0cy5sZW5ndGgpIHtcbiAgICAgIC8vIGl0ZW1QYXJ0cyBhbHdheXMgaGF2ZSBlbmQgbm9kZXNcbiAgICAgIHRoaXMuXyRjbGVhcihcbiAgICAgICAgaXRlbVBhcnQgJiYgd3JhcChpdGVtUGFydC5fJGVuZE5vZGUhKS5uZXh0U2libGluZyxcbiAgICAgICAgcGFydEluZGV4XG4gICAgICApO1xuICAgICAgLy8gVHJ1bmNhdGUgdGhlIHBhcnRzIGFycmF5IHNvIF92YWx1ZSByZWZsZWN0cyB0aGUgY3VycmVudCBzdGF0ZVxuICAgICAgaXRlbVBhcnRzLmxlbmd0aCA9IHBhcnRJbmRleDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyB0aGUgbm9kZXMgY29udGFpbmVkIHdpdGhpbiB0aGlzIFBhcnQgZnJvbSB0aGUgRE9NLlxuICAgKlxuICAgKiBAcGFyYW0gc3RhcnQgU3RhcnQgbm9kZSB0byBjbGVhciBmcm9tLCBmb3IgY2xlYXJpbmcgYSBzdWJzZXQgb2YgdGhlIHBhcnQnc1xuICAgKiAgICAgRE9NICh1c2VkIHdoZW4gdHJ1bmNhdGluZyBpdGVyYWJsZXMpXG4gICAqIEBwYXJhbSBmcm9tICBXaGVuIGBzdGFydGAgaXMgc3BlY2lmaWVkLCB0aGUgaW5kZXggd2l0aGluIHRoZSBpdGVyYWJsZSBmcm9tXG4gICAqICAgICB3aGljaCBDaGlsZFBhcnRzIGFyZSBiZWluZyByZW1vdmVkLCB1c2VkIGZvciBkaXNjb25uZWN0aW5nIGRpcmVjdGl2ZXMgaW5cbiAgICogICAgIHRob3NlIFBhcnRzLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIF8kY2xlYXIoXG4gICAgc3RhcnQ6IENoaWxkTm9kZSB8IG51bGwgPSB3cmFwKHRoaXMuXyRzdGFydE5vZGUpLm5leHRTaWJsaW5nLFxuICAgIGZyb20/OiBudW1iZXJcbiAgKSB7XG4gICAgdGhpcy5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkPy4oZmFsc2UsIHRydWUsIGZyb20pO1xuICAgIHdoaWxlIChzdGFydCAmJiBzdGFydCAhPT0gdGhpcy5fJGVuZE5vZGUpIHtcbiAgICAgIGNvbnN0IG4gPSB3cmFwKHN0YXJ0ISkubmV4dFNpYmxpbmc7XG4gICAgICAod3JhcChzdGFydCEpIGFzIEVsZW1lbnQpLnJlbW92ZSgpO1xuICAgICAgc3RhcnQgPSBuO1xuICAgIH1cbiAgfVxuICAvKipcbiAgICogSW1wbGVtZW50YXRpb24gb2YgUm9vdFBhcnQncyBgaXNDb25uZWN0ZWRgLiBOb3RlIHRoYXQgdGhpcyBtZXRvZFxuICAgKiBzaG91bGQgb25seSBiZSBjYWxsZWQgb24gYFJvb3RQYXJ0YHMgKHRoZSBgQ2hpbGRQYXJ0YCByZXR1cm5lZCBmcm9tIGFcbiAgICogdG9wLWxldmVsIGByZW5kZXIoKWAgY2FsbCkuIEl0IGhhcyBubyBlZmZlY3Qgb24gbm9uLXJvb3QgQ2hpbGRQYXJ0cy5cbiAgICogQHBhcmFtIGlzQ29ubmVjdGVkIFdoZXRoZXIgdG8gc2V0XG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgc2V0Q29ubmVjdGVkKGlzQ29ubmVjdGVkOiBib29sZWFuKSB7XG4gICAgaWYgKHRoaXMuXyRwYXJlbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fX2lzQ29ubmVjdGVkID0gaXNDb25uZWN0ZWQ7XG4gICAgICB0aGlzLl8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQ/Lihpc0Nvbm5lY3RlZCk7XG4gICAgfSBlbHNlIGlmIChERVZfTU9ERSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAncGFydC5zZXRDb25uZWN0ZWQoKSBtYXkgb25seSBiZSBjYWxsZWQgb24gYSAnICtcbiAgICAgICAgICAnUm9vdFBhcnQgcmV0dXJuZWQgZnJvbSByZW5kZXIoKS4nXG4gICAgICApO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEEgdG9wLWxldmVsIGBDaGlsZFBhcnRgIHJldHVybmVkIGZyb20gYHJlbmRlcmAgdGhhdCBtYW5hZ2VzIHRoZSBjb25uZWN0ZWRcbiAqIHN0YXRlIG9mIGBBc3luY0RpcmVjdGl2ZWBzIGNyZWF0ZWQgdGhyb3VnaG91dCB0aGUgdHJlZSBiZWxvdyBpdC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSb290UGFydCBleHRlbmRzIENoaWxkUGFydCB7XG4gIC8qKlxuICAgKiBTZXRzIHRoZSBjb25uZWN0aW9uIHN0YXRlIGZvciBgQXN5bmNEaXJlY3RpdmVgcyBjb250YWluZWQgd2l0aGluIHRoaXMgcm9vdFxuICAgKiBDaGlsZFBhcnQuXG4gICAqXG4gICAqIGxpdC1odG1sIGRvZXMgbm90IGF1dG9tYXRpY2FsbHkgbW9uaXRvciB0aGUgY29ubmVjdGVkbmVzcyBvZiBET00gcmVuZGVyZWQ7XG4gICAqIGFzIHN1Y2gsIGl0IGlzIHRoZSByZXNwb25zaWJpbGl0eSBvZiB0aGUgY2FsbGVyIHRvIGByZW5kZXJgIHRvIGVuc3VyZSB0aGF0XG4gICAqIGBwYXJ0LnNldENvbm5lY3RlZChmYWxzZSlgIGlzIGNhbGxlZCBiZWZvcmUgdGhlIHBhcnQgb2JqZWN0IGlzIHBvdGVudGlhbGx5XG4gICAqIGRpc2NhcmRlZCwgdG8gZW5zdXJlIHRoYXQgYEFzeW5jRGlyZWN0aXZlYHMgaGF2ZSBhIGNoYW5jZSB0byBkaXNwb3NlIG9mXG4gICAqIGFueSByZXNvdXJjZXMgYmVpbmcgaGVsZC4gSWYgYSBgUm9vdFBhcnRgIHRoYXQgd2FzIHByZXZvdXNseVxuICAgKiBkaXNjb25uZWN0ZWQgaXMgc3Vic2VxdWVudGx5IHJlLWNvbm5lY3RlZCAoYW5kIGl0cyBgQXN5bmNEaXJlY3RpdmVgcyBzaG91bGRcbiAgICogcmUtY29ubmVjdCksIGBzZXRDb25uZWN0ZWQodHJ1ZSlgIHNob3VsZCBiZSBjYWxsZWQuXG4gICAqXG4gICAqIEBwYXJhbSBpc0Nvbm5lY3RlZCBXaGV0aGVyIGRpcmVjdGl2ZXMgd2l0aGluIHRoaXMgdHJlZSBzaG91bGQgYmUgY29ubmVjdGVkXG4gICAqIG9yIG5vdFxuICAgKi9cbiAgc2V0Q29ubmVjdGVkKGlzQ29ubmVjdGVkOiBib29sZWFuKTogdm9pZDtcbn1cblxuZXhwb3J0IHR5cGUge0F0dHJpYnV0ZVBhcnR9O1xuY2xhc3MgQXR0cmlidXRlUGFydCBpbXBsZW1lbnRzIERpc2Nvbm5lY3RhYmxlIHtcbiAgcmVhZG9ubHkgdHlwZSA9IEFUVFJJQlVURV9QQVJUIGFzXG4gICAgfCB0eXBlb2YgQVRUUklCVVRFX1BBUlRcbiAgICB8IHR5cGVvZiBQUk9QRVJUWV9QQVJUXG4gICAgfCB0eXBlb2YgQk9PTEVBTl9BVFRSSUJVVEVfUEFSVFxuICAgIHwgdHlwZW9mIEVWRU5UX1BBUlQ7XG4gIHJlYWRvbmx5IGVsZW1lbnQ6IEhUTUxFbGVtZW50O1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIElmIHRoaXMgYXR0cmlidXRlIHBhcnQgcmVwcmVzZW50cyBhbiBpbnRlcnBvbGF0aW9uLCB0aGlzIGNvbnRhaW5zIHRoZVxuICAgKiBzdGF0aWMgc3RyaW5ncyBvZiB0aGUgaW50ZXJwb2xhdGlvbi4gRm9yIHNpbmdsZS12YWx1ZSwgY29tcGxldGUgYmluZGluZ3MsXG4gICAqIHRoaXMgaXMgdW5kZWZpbmVkLlxuICAgKi9cbiAgcmVhZG9ubHkgc3RyaW5ncz86IFJlYWRvbmx5QXJyYXk8c3RyaW5nPjtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGNvbW1pdHRlZFZhbHVlOiB1bmtub3duIHwgQXJyYXk8dW5rbm93bj4gPSBub3RoaW5nO1xuICAvKiogQGludGVybmFsICovXG4gIF9fZGlyZWN0aXZlcz86IEFycmF5PERpcmVjdGl2ZSB8IHVuZGVmaW5lZD47XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlO1xuICAvKiogQGludGVybmFsICovXG4gIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT4gPSB1bmRlZmluZWQ7XG5cbiAgcHJvdGVjdGVkIF9zYW5pdGl6ZXI6IFZhbHVlU2FuaXRpemVyIHwgdW5kZWZpbmVkO1xuXG4gIGdldCB0YWdOYW1lKCkge1xuICAgIHJldHVybiB0aGlzLmVsZW1lbnQudGFnTmFtZTtcbiAgfVxuXG4gIC8vIFNlZSBjb21tZW50IGluIERpc2Nvbm5lY3RhYmxlIGludGVyZmFjZSBmb3Igd2h5IHRoaXMgaXMgYSBnZXR0ZXJcbiAgZ2V0IF8kaXNDb25uZWN0ZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuXyRwYXJlbnQuXyRpc0Nvbm5lY3RlZDtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGVsZW1lbnQ6IEhUTUxFbGVtZW50LFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBzdHJpbmdzOiBSZWFkb25seUFycmF5PHN0cmluZz4sXG4gICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSxcbiAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkXG4gICkge1xuICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLl8kcGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgaWYgKHN0cmluZ3MubGVuZ3RoID4gMiB8fCBzdHJpbmdzWzBdICE9PSAnJyB8fCBzdHJpbmdzWzFdICE9PSAnJykge1xuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gbmV3IEFycmF5KHN0cmluZ3MubGVuZ3RoIC0gMSkuZmlsbChuZXcgU3RyaW5nKCkpO1xuICAgICAgdGhpcy5zdHJpbmdzID0gc3RyaW5ncztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gbm90aGluZztcbiAgICB9XG4gICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgdGhpcy5fc2FuaXRpemVyID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiB0aGlzIHBhcnQgYnkgcmVzb2x2aW5nIHRoZSB2YWx1ZSBmcm9tIHBvc3NpYmx5IG11bHRpcGxlXG4gICAqIHZhbHVlcyBhbmQgc3RhdGljIHN0cmluZ3MgYW5kIGNvbW1pdHRpbmcgaXQgdG8gdGhlIERPTS5cbiAgICogSWYgdGhpcyBwYXJ0IGlzIHNpbmdsZS12YWx1ZWQsIGB0aGlzLl9zdHJpbmdzYCB3aWxsIGJlIHVuZGVmaW5lZCwgYW5kIHRoZVxuICAgKiBtZXRob2Qgd2lsbCBiZSBjYWxsZWQgd2l0aCBhIHNpbmdsZSB2YWx1ZSBhcmd1bWVudC4gSWYgdGhpcyBwYXJ0IGlzXG4gICAqIG11bHRpLXZhbHVlLCBgdGhpcy5fc3RyaW5nc2Agd2lsbCBiZSBkZWZpbmVkLCBhbmQgdGhlIG1ldGhvZCBpcyBjYWxsZWRcbiAgICogd2l0aCB0aGUgdmFsdWUgYXJyYXkgb2YgdGhlIHBhcnQncyBvd25pbmcgVGVtcGxhdGVJbnN0YW5jZSwgYW5kIGFuIG9mZnNldFxuICAgKiBpbnRvIHRoZSB2YWx1ZSBhcnJheSBmcm9tIHdoaWNoIHRoZSB2YWx1ZXMgc2hvdWxkIGJlIHJlYWQuXG4gICAqIFRoaXMgbWV0aG9kIGlzIG92ZXJsb2FkZWQgdGhpcyB3YXkgdG8gZWxpbWluYXRlIHNob3J0LWxpdmVkIGFycmF5IHNsaWNlc1xuICAgKiBvZiB0aGUgdGVtcGxhdGUgaW5zdGFuY2UgdmFsdWVzLCBhbmQgYWxsb3cgYSBmYXN0LXBhdGggZm9yIHNpbmdsZS12YWx1ZWRcbiAgICogcGFydHMuXG4gICAqXG4gICAqIEBwYXJhbSB2YWx1ZSBUaGUgcGFydCB2YWx1ZSwgb3IgYW4gYXJyYXkgb2YgdmFsdWVzIGZvciBtdWx0aS12YWx1ZWQgcGFydHNcbiAgICogQHBhcmFtIHZhbHVlSW5kZXggdGhlIGluZGV4IHRvIHN0YXJ0IHJlYWRpbmcgdmFsdWVzIGZyb20uIGB1bmRlZmluZWRgIGZvclxuICAgKiAgIHNpbmdsZS12YWx1ZWQgcGFydHNcbiAgICogQHBhcmFtIG5vQ29tbWl0IGNhdXNlcyB0aGUgcGFydCB0byBub3QgY29tbWl0IGl0cyB2YWx1ZSB0byB0aGUgRE9NLiBVc2VkXG4gICAqICAgaW4gaHlkcmF0aW9uIHRvIHByaW1lIGF0dHJpYnV0ZSBwYXJ0cyB3aXRoIHRoZWlyIGZpcnN0LXJlbmRlcmVkIHZhbHVlLFxuICAgKiAgIGJ1dCBub3Qgc2V0IHRoZSBhdHRyaWJ1dGUsIGFuZCBpbiBTU1IgdG8gbm8tb3AgdGhlIERPTSBvcGVyYXRpb24gYW5kXG4gICAqICAgY2FwdHVyZSB0aGUgdmFsdWUgZm9yIHNlcmlhbGl6YXRpb24uXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgXyRzZXRWYWx1ZShcbiAgICB2YWx1ZTogdW5rbm93biB8IEFycmF5PHVua25vd24+LFxuICAgIGRpcmVjdGl2ZVBhcmVudDogRGlyZWN0aXZlUGFyZW50ID0gdGhpcyxcbiAgICB2YWx1ZUluZGV4PzogbnVtYmVyLFxuICAgIG5vQ29tbWl0PzogYm9vbGVhblxuICApIHtcbiAgICBjb25zdCBzdHJpbmdzID0gdGhpcy5zdHJpbmdzO1xuXG4gICAgLy8gV2hldGhlciBhbnkgb2YgdGhlIHZhbHVlcyBoYXMgY2hhbmdlZCwgZm9yIGRpcnR5LWNoZWNraW5nXG4gICAgbGV0IGNoYW5nZSA9IGZhbHNlO1xuXG4gICAgaWYgKHN0cmluZ3MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gU2luZ2xlLXZhbHVlIGJpbmRpbmcgY2FzZVxuICAgICAgdmFsdWUgPSByZXNvbHZlRGlyZWN0aXZlKHRoaXMsIHZhbHVlLCBkaXJlY3RpdmVQYXJlbnQsIDApO1xuICAgICAgY2hhbmdlID1cbiAgICAgICAgIWlzUHJpbWl0aXZlKHZhbHVlKSB8fFxuICAgICAgICAodmFsdWUgIT09IHRoaXMuXyRjb21taXR0ZWRWYWx1ZSAmJiB2YWx1ZSAhPT0gbm9DaGFuZ2UpO1xuICAgICAgaWYgKGNoYW5nZSkge1xuICAgICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSW50ZXJwb2xhdGlvbiBjYXNlXG4gICAgICBjb25zdCB2YWx1ZXMgPSB2YWx1ZSBhcyBBcnJheTx1bmtub3duPjtcbiAgICAgIHZhbHVlID0gc3RyaW5nc1swXTtcblxuICAgICAgbGV0IGksIHY7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgc3RyaW5ncy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgdiA9IHJlc29sdmVEaXJlY3RpdmUodGhpcywgdmFsdWVzW3ZhbHVlSW5kZXghICsgaV0sIGRpcmVjdGl2ZVBhcmVudCwgaSk7XG5cbiAgICAgICAgaWYgKHYgPT09IG5vQ2hhbmdlKSB7XG4gICAgICAgICAgLy8gSWYgdGhlIHVzZXItcHJvdmlkZWQgdmFsdWUgaXMgYG5vQ2hhbmdlYCwgdXNlIHRoZSBwcmV2aW91cyB2YWx1ZVxuICAgICAgICAgIHYgPSAodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIEFycmF5PHVua25vd24+KVtpXTtcbiAgICAgICAgfVxuICAgICAgICBjaGFuZ2UgfHw9XG4gICAgICAgICAgIWlzUHJpbWl0aXZlKHYpIHx8IHYgIT09ICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgQXJyYXk8dW5rbm93bj4pW2ldO1xuICAgICAgICBpZiAodiA9PT0gbm90aGluZykge1xuICAgICAgICAgIHZhbHVlID0gbm90aGluZztcbiAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSAhPT0gbm90aGluZykge1xuICAgICAgICAgIHZhbHVlICs9ICh2ID8/ICcnKSArIHN0cmluZ3NbaSArIDFdO1xuICAgICAgICB9XG4gICAgICAgIC8vIFdlIGFsd2F5cyByZWNvcmQgZWFjaCB2YWx1ZSwgZXZlbiBpZiBvbmUgaXMgYG5vdGhpbmdgLCBmb3IgZnV0dXJlXG4gICAgICAgIC8vIGNoYW5nZSBkZXRlY3Rpb24uXG4gICAgICAgICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgQXJyYXk8dW5rbm93bj4pW2ldID0gdjtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGNoYW5nZSAmJiAhbm9Db21taXQpIHtcbiAgICAgIHRoaXMuX2NvbW1pdFZhbHVlKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIF9jb21taXRWYWx1ZSh2YWx1ZTogdW5rbm93bikge1xuICAgIGlmICh2YWx1ZSA9PT0gbm90aGluZykge1xuICAgICAgKHdyYXAodGhpcy5lbGVtZW50KSBhcyBFbGVtZW50KS5yZW1vdmVBdHRyaWJ1dGUodGhpcy5uYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgICBpZiAodGhpcy5fc2FuaXRpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aGlzLl9zYW5pdGl6ZXIgPSBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwoXG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQsXG4gICAgICAgICAgICB0aGlzLm5hbWUsXG4gICAgICAgICAgICAnYXR0cmlidXRlJ1xuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWUgPSB0aGlzLl9zYW5pdGl6ZXIodmFsdWUgPz8gJycpO1xuICAgICAgfVxuICAgICAgKHdyYXAodGhpcy5lbGVtZW50KSBhcyBFbGVtZW50KS5zZXRBdHRyaWJ1dGUoXG4gICAgICAgIHRoaXMubmFtZSxcbiAgICAgICAgKHZhbHVlID8/ICcnKSBhcyBzdHJpbmdcbiAgICAgICk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCB0eXBlIHtQcm9wZXJ0eVBhcnR9O1xuY2xhc3MgUHJvcGVydHlQYXJ0IGV4dGVuZHMgQXR0cmlidXRlUGFydCB7XG4gIG92ZXJyaWRlIHJlYWRvbmx5IHR5cGUgPSBQUk9QRVJUWV9QQVJUO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgb3ZlcnJpZGUgX2NvbW1pdFZhbHVlKHZhbHVlOiB1bmtub3duKSB7XG4gICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgaWYgKHRoaXMuX3Nhbml0aXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX3Nhbml0aXplciA9IHNhbml0aXplckZhY3RvcnlJbnRlcm5hbChcbiAgICAgICAgICB0aGlzLmVsZW1lbnQsXG4gICAgICAgICAgdGhpcy5uYW1lLFxuICAgICAgICAgICdwcm9wZXJ0eSdcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHZhbHVlID0gdGhpcy5fc2FuaXRpemVyKHZhbHVlKTtcbiAgICB9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAodGhpcy5lbGVtZW50IGFzIGFueSlbdGhpcy5uYW1lXSA9IHZhbHVlID09PSBub3RoaW5nID8gdW5kZWZpbmVkIDogdmFsdWU7XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUge0Jvb2xlYW5BdHRyaWJ1dGVQYXJ0fTtcbmNsYXNzIEJvb2xlYW5BdHRyaWJ1dGVQYXJ0IGV4dGVuZHMgQXR0cmlidXRlUGFydCB7XG4gIG92ZXJyaWRlIHJlYWRvbmx5IHR5cGUgPSBCT09MRUFOX0FUVFJJQlVURV9QQVJUO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgb3ZlcnJpZGUgX2NvbW1pdFZhbHVlKHZhbHVlOiB1bmtub3duKSB7XG4gICAgaWYgKHZhbHVlICYmIHZhbHVlICE9PSBub3RoaW5nKSB7XG4gICAgICAod3JhcCh0aGlzLmVsZW1lbnQpIGFzIEVsZW1lbnQpLnNldEF0dHJpYnV0ZSh0aGlzLm5hbWUsICcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgKHdyYXAodGhpcy5lbGVtZW50KSBhcyBFbGVtZW50KS5yZW1vdmVBdHRyaWJ1dGUodGhpcy5uYW1lKTtcbiAgICB9XG4gIH1cbn1cblxudHlwZSBFdmVudExpc3RlbmVyV2l0aE9wdGlvbnMgPSBFdmVudExpc3RlbmVyT3JFdmVudExpc3RlbmVyT2JqZWN0ICZcbiAgUGFydGlhbDxBZGRFdmVudExpc3RlbmVyT3B0aW9ucz47XG5cbi8qKlxuICogQW4gQXR0cmlidXRlUGFydCB0aGF0IG1hbmFnZXMgYW4gZXZlbnQgbGlzdGVuZXIgdmlhIGFkZC9yZW1vdmVFdmVudExpc3RlbmVyLlxuICpcbiAqIFRoaXMgcGFydCB3b3JrcyBieSBhZGRpbmcgaXRzZWxmIGFzIHRoZSBldmVudCBsaXN0ZW5lciBvbiBhbiBlbGVtZW50LCB0aGVuXG4gKiBkZWxlZ2F0aW5nIHRvIHRoZSB2YWx1ZSBwYXNzZWQgdG8gaXQuIFRoaXMgcmVkdWNlcyB0aGUgbnVtYmVyIG9mIGNhbGxzIHRvXG4gKiBhZGQvcmVtb3ZlRXZlbnRMaXN0ZW5lciBpZiB0aGUgbGlzdGVuZXIgY2hhbmdlcyBmcmVxdWVudGx5LCBzdWNoIGFzIHdoZW4gYW5cbiAqIGlubGluZSBmdW5jdGlvbiBpcyB1c2VkIGFzIGEgbGlzdGVuZXIuXG4gKlxuICogQmVjYXVzZSBldmVudCBvcHRpb25zIGFyZSBwYXNzZWQgd2hlbiBhZGRpbmcgbGlzdGVuZXJzLCB3ZSBtdXN0IHRha2UgY2FzZVxuICogdG8gYWRkIGFuZCByZW1vdmUgdGhlIHBhcnQgYXMgYSBsaXN0ZW5lciB3aGVuIHRoZSBldmVudCBvcHRpb25zIGNoYW5nZS5cbiAqL1xuZXhwb3J0IHR5cGUge0V2ZW50UGFydH07XG5jbGFzcyBFdmVudFBhcnQgZXh0ZW5kcyBBdHRyaWJ1dGVQYXJ0IHtcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgdHlwZSA9IEVWRU5UX1BBUlQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgZWxlbWVudDogSFRNTEVsZW1lbnQsXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIHN0cmluZ3M6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPixcbiAgICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgc3VwZXIoZWxlbWVudCwgbmFtZSwgc3RyaW5ncywgcGFyZW50LCBvcHRpb25zKTtcblxuICAgIGlmIChERVZfTU9ERSAmJiB0aGlzLnN0cmluZ3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgQSBcXGA8JHtlbGVtZW50LmxvY2FsTmFtZX0+XFxgIGhhcyBhIFxcYEAke25hbWV9PS4uLlxcYCBsaXN0ZW5lciB3aXRoIGAgK1xuICAgICAgICAgICdpbnZhbGlkIGNvbnRlbnQuIEV2ZW50IGxpc3RlbmVycyBpbiB0ZW1wbGF0ZXMgbXVzdCBoYXZlIGV4YWN0bHkgJyArXG4gICAgICAgICAgJ29uZSBleHByZXNzaW9uIGFuZCBubyBzdXJyb3VuZGluZyB0ZXh0LidcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgLy8gRXZlbnRQYXJ0IGRvZXMgbm90IHVzZSB0aGUgYmFzZSBfJHNldFZhbHVlL19yZXNvbHZlVmFsdWUgaW1wbGVtZW50YXRpb25cbiAgLy8gc2luY2UgdGhlIGRpcnR5IGNoZWNraW5nIGlzIG1vcmUgY29tcGxleFxuICAvKiogQGludGVybmFsICovXG4gIG92ZXJyaWRlIF8kc2V0VmFsdWUoXG4gICAgbmV3TGlzdGVuZXI6IHVua25vd24sXG4gICAgZGlyZWN0aXZlUGFyZW50OiBEaXJlY3RpdmVQYXJlbnQgPSB0aGlzXG4gICkge1xuICAgIG5ld0xpc3RlbmVyID1cbiAgICAgIHJlc29sdmVEaXJlY3RpdmUodGhpcywgbmV3TGlzdGVuZXIsIGRpcmVjdGl2ZVBhcmVudCwgMCkgPz8gbm90aGluZztcbiAgICBpZiAobmV3TGlzdGVuZXIgPT09IG5vQ2hhbmdlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG9sZExpc3RlbmVyID0gdGhpcy5fJGNvbW1pdHRlZFZhbHVlO1xuXG4gICAgLy8gSWYgdGhlIG5ldyB2YWx1ZSBpcyBub3RoaW5nIG9yIGFueSBvcHRpb25zIGNoYW5nZSB3ZSBoYXZlIHRvIHJlbW92ZSB0aGVcbiAgICAvLyBwYXJ0IGFzIGEgbGlzdGVuZXIuXG4gICAgY29uc3Qgc2hvdWxkUmVtb3ZlTGlzdGVuZXIgPVxuICAgICAgKG5ld0xpc3RlbmVyID09PSBub3RoaW5nICYmIG9sZExpc3RlbmVyICE9PSBub3RoaW5nKSB8fFxuICAgICAgKG5ld0xpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykuY2FwdHVyZSAhPT1cbiAgICAgICAgKG9sZExpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykuY2FwdHVyZSB8fFxuICAgICAgKG5ld0xpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykub25jZSAhPT1cbiAgICAgICAgKG9sZExpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykub25jZSB8fFxuICAgICAgKG5ld0xpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykucGFzc2l2ZSAhPT1cbiAgICAgICAgKG9sZExpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykucGFzc2l2ZTtcblxuICAgIC8vIElmIHRoZSBuZXcgdmFsdWUgaXMgbm90IG5vdGhpbmcgYW5kIHdlIHJlbW92ZWQgdGhlIGxpc3RlbmVyLCB3ZSBoYXZlXG4gICAgLy8gdG8gYWRkIHRoZSBwYXJ0IGFzIGEgbGlzdGVuZXIuXG4gICAgY29uc3Qgc2hvdWxkQWRkTGlzdGVuZXIgPVxuICAgICAgbmV3TGlzdGVuZXIgIT09IG5vdGhpbmcgJiZcbiAgICAgIChvbGRMaXN0ZW5lciA9PT0gbm90aGluZyB8fCBzaG91bGRSZW1vdmVMaXN0ZW5lcik7XG5cbiAgICBpZiAoc2hvdWxkUmVtb3ZlTGlzdGVuZXIpIHtcbiAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFxuICAgICAgICB0aGlzLm5hbWUsXG4gICAgICAgIHRoaXMsXG4gICAgICAgIG9sZExpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9uc1xuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKHNob3VsZEFkZExpc3RlbmVyKSB7XG4gICAgICAvLyBCZXdhcmU6IElFMTEgYW5kIENocm9tZSA0MSBkb24ndCBsaWtlIHVzaW5nIHRoZSBsaXN0ZW5lciBhcyB0aGVcbiAgICAgIC8vIG9wdGlvbnMgb2JqZWN0LiBGaWd1cmUgb3V0IGhvdyB0byBkZWFsIHcvIHRoaXMgaW4gSUUxMSAtIG1heWJlXG4gICAgICAvLyBwYXRjaCBhZGRFdmVudExpc3RlbmVyP1xuICAgICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAgIHRoaXMubmFtZSxcbiAgICAgICAgdGhpcyxcbiAgICAgICAgbmV3TGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zXG4gICAgICApO1xuICAgIH1cbiAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSBuZXdMaXN0ZW5lcjtcbiAgfVxuXG4gIGhhbmRsZUV2ZW50KGV2ZW50OiBFdmVudCkge1xuICAgIGlmICh0eXBlb2YgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUuY2FsbCh0aGlzLm9wdGlvbnM/Lmhvc3QgPz8gdGhpcy5lbGVtZW50LCBldmVudCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgRXZlbnRMaXN0ZW5lck9iamVjdCkuaGFuZGxlRXZlbnQoZXZlbnQpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgdHlwZSB7RWxlbWVudFBhcnR9O1xuY2xhc3MgRWxlbWVudFBhcnQgaW1wbGVtZW50cyBEaXNjb25uZWN0YWJsZSB7XG4gIHJlYWRvbmx5IHR5cGUgPSBFTEVNRU5UX1BBUlQ7XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfX2RpcmVjdGl2ZT86IERpcmVjdGl2ZTtcblxuICAvLyBUaGlzIGlzIHRvIGVuc3VyZSB0aGF0IGV2ZXJ5IFBhcnQgaGFzIGEgXyRjb21taXR0ZWRWYWx1ZVxuICBfJGNvbW1pdHRlZFZhbHVlOiB1bmRlZmluZWQ7XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHBhcmVudCE6IERpc2Nvbm5lY3RhYmxlO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuPzogU2V0PERpc2Nvbm5lY3RhYmxlPiA9IHVuZGVmaW5lZDtcblxuICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyBlbGVtZW50OiBFbGVtZW50LFxuICAgIHBhcmVudDogRGlzY29ubmVjdGFibGUsXG4gICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZFxuICApIHtcbiAgICB0aGlzLl8kcGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gIH1cblxuICAvLyBTZWUgY29tbWVudCBpbiBEaXNjb25uZWN0YWJsZSBpbnRlcmZhY2UgZm9yIHdoeSB0aGlzIGlzIGEgZ2V0dGVyXG4gIGdldCBfJGlzQ29ubmVjdGVkKCkge1xuICAgIHJldHVybiB0aGlzLl8kcGFyZW50Ll8kaXNDb25uZWN0ZWQ7XG4gIH1cblxuICBfJHNldFZhbHVlKHZhbHVlOiB1bmtub3duKTogdm9pZCB7XG4gICAgcmVzb2x2ZURpcmVjdGl2ZSh0aGlzLCB2YWx1ZSk7XG4gIH1cbn1cblxuLyoqXG4gKiBFTkQgVVNFUlMgU0hPVUxEIE5PVCBSRUxZIE9OIFRISVMgT0JKRUNULlxuICpcbiAqIFByaXZhdGUgZXhwb3J0cyBmb3IgdXNlIGJ5IG90aGVyIExpdCBwYWNrYWdlcywgbm90IGludGVuZGVkIGZvciB1c2UgYnlcbiAqIGV4dGVybmFsIHVzZXJzLlxuICpcbiAqIFdlIGN1cnJlbnRseSBkbyBub3QgbWFrZSBhIG1hbmdsZWQgcm9sbHVwIGJ1aWxkIG9mIHRoZSBsaXQtc3NyIGNvZGUuIEluIG9yZGVyXG4gKiB0byBrZWVwIGEgbnVtYmVyIG9mIChvdGhlcndpc2UgcHJpdmF0ZSkgdG9wLWxldmVsIGV4cG9ydHMgIG1hbmdsZWQgaW4gdGhlXG4gKiBjbGllbnQgc2lkZSBjb2RlLCB3ZSBleHBvcnQgYSBfJExIIG9iamVjdCBjb250YWluaW5nIHRob3NlIG1lbWJlcnMgKG9yXG4gKiBoZWxwZXIgbWV0aG9kcyBmb3IgYWNjZXNzaW5nIHByaXZhdGUgZmllbGRzIG9mIHRob3NlIG1lbWJlcnMpLCBhbmQgdGhlblxuICogcmUtZXhwb3J0IHRoZW0gZm9yIHVzZSBpbiBsaXQtc3NyLiBUaGlzIGtlZXBzIGxpdC1zc3IgYWdub3N0aWMgdG8gd2hldGhlciB0aGVcbiAqIGNsaWVudC1zaWRlIGNvZGUgaXMgYmVpbmcgdXNlZCBpbiBgZGV2YCBtb2RlIG9yIGBwcm9kYCBtb2RlLlxuICpcbiAqIFRoaXMgaGFzIGEgdW5pcXVlIG5hbWUsIHRvIGRpc2FtYmlndWF0ZSBpdCBmcm9tIHByaXZhdGUgZXhwb3J0cyBpblxuICogbGl0LWVsZW1lbnQsIHdoaWNoIHJlLWV4cG9ydHMgYWxsIG9mIGxpdC1odG1sLlxuICpcbiAqIEBwcml2YXRlXG4gKi9cbmV4cG9ydCBjb25zdCBfJExIID0ge1xuICAvLyBVc2VkIGluIGxpdC1zc3JcbiAgX2JvdW5kQXR0cmlidXRlU3VmZml4OiBib3VuZEF0dHJpYnV0ZVN1ZmZpeCxcbiAgX21hcmtlcjogbWFya2VyLFxuICBfbWFya2VyTWF0Y2g6IG1hcmtlck1hdGNoLFxuICBfSFRNTF9SRVNVTFQ6IEhUTUxfUkVTVUxULFxuICBfZ2V0VGVtcGxhdGVIdG1sOiBnZXRUZW1wbGF0ZUh0bWwsXG4gIC8vIFVzZWQgaW4gaHlkcmF0ZVxuICBfVGVtcGxhdGVJbnN0YW5jZTogVGVtcGxhdGVJbnN0YW5jZSxcbiAgX2lzSXRlcmFibGU6IGlzSXRlcmFibGUsXG4gIF9yZXNvbHZlRGlyZWN0aXZlOiByZXNvbHZlRGlyZWN0aXZlLFxuICAvLyBVc2VkIGluIHRlc3RzIGFuZCBwcml2YXRlLXNzci1zdXBwb3J0XG4gIF9DaGlsZFBhcnQ6IENoaWxkUGFydCxcbiAgX0F0dHJpYnV0ZVBhcnQ6IEF0dHJpYnV0ZVBhcnQsXG4gIF9Cb29sZWFuQXR0cmlidXRlUGFydDogQm9vbGVhbkF0dHJpYnV0ZVBhcnQsXG4gIF9FdmVudFBhcnQ6IEV2ZW50UGFydCxcbiAgX1Byb3BlcnR5UGFydDogUHJvcGVydHlQYXJ0LFxuICBfRWxlbWVudFBhcnQ6IEVsZW1lbnRQYXJ0LFxufTtcblxuLy8gQXBwbHkgcG9seWZpbGxzIGlmIGF2YWlsYWJsZVxuZ2xvYmFsVGhpc1tgbGl0SHRtbFBvbHlmaWxsU3VwcG9ydCR7REVWX01PREUgPyBgRGV2TW9kZWAgOiBgYH1gXT8uKFxuICBUZW1wbGF0ZSxcbiAgQ2hpbGRQYXJ0XG4pO1xuXG4vLyBJTVBPUlRBTlQ6IGRvIG5vdCBjaGFuZ2UgdGhlIHByb3BlcnR5IG5hbWUgb3IgdGhlIGFzc2lnbm1lbnQgZXhwcmVzc2lvbi5cbi8vIFRoaXMgbGluZSB3aWxsIGJlIHVzZWQgaW4gcmVnZXhlcyB0byBzZWFyY2ggZm9yIGxpdC1odG1sIHVzYWdlLlxuLy8gVE9ETyhqdXN0aW5mYWduYW5pKTogaW5qZWN0IHZlcnNpb24gbnVtYmVyIGF0IGJ1aWxkIHRpbWVcbihnbG9iYWxUaGlzLmxpdEh0bWxWZXJzaW9ucyA/Pz0gW10pLnB1c2goJzIuMC4wJyk7XG5pZiAoREVWX01PREUgJiYgZ2xvYmFsVGhpcy5saXRIdG1sVmVyc2lvbnMubGVuZ3RoID4gMSkge1xuICBpc3N1ZVdhcm5pbmchKFxuICAgICdtdWx0aXBsZS12ZXJzaW9ucycsXG4gICAgYE11bHRpcGxlIHZlcnNpb25zIG9mIExpdCBsb2FkZWQuIGAgK1xuICAgICAgYExvYWRpbmcgbXVsdGlwbGUgdmVyc2lvbnMgaXMgbm90IHJlY29tbWVuZGVkLmBcbiAgKTtcbn1cbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0Rpc2Nvbm5lY3RhYmxlLCBQYXJ0fSBmcm9tICcuL2xpdC1odG1sJztcblxuZXhwb3J0IHtcbiAgQXR0cmlidXRlUGFydCxcbiAgQm9vbGVhbkF0dHJpYnV0ZVBhcnQsXG4gIENoaWxkUGFydCxcbiAgRWxlbWVudFBhcnQsXG4gIEV2ZW50UGFydCxcbiAgUGFydCxcbiAgUHJvcGVydHlQYXJ0LFxufSBmcm9tICcuL2xpdC1odG1sJztcblxuZXhwb3J0IGludGVyZmFjZSBEaXJlY3RpdmVDbGFzcyB7XG4gIG5ldyAocGFydDogUGFydEluZm8pOiBEaXJlY3RpdmU7XG59XG5cbi8qKlxuICogVGhpcyB1dGlsaXR5IHR5cGUgZXh0cmFjdHMgdGhlIHNpZ25hdHVyZSBvZiBhIGRpcmVjdGl2ZSBjbGFzcydzIHJlbmRlcigpXG4gKiBtZXRob2Qgc28gd2UgY2FuIHVzZSBpdCBmb3IgdGhlIHR5cGUgb2YgdGhlIGdlbmVyYXRlZCBkaXJlY3RpdmUgZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCB0eXBlIERpcmVjdGl2ZVBhcmFtZXRlcnM8QyBleHRlbmRzIERpcmVjdGl2ZT4gPSBQYXJhbWV0ZXJzPENbJ3JlbmRlciddPjtcblxuLyoqXG4gKiBBIGdlbmVyYXRlZCBkaXJlY3RpdmUgZnVuY3Rpb24gZG9lc24ndCBldmFsdWF0ZSB0aGUgZGlyZWN0aXZlLCBidXQganVzdFxuICogcmV0dXJucyBhIERpcmVjdGl2ZVJlc3VsdCBvYmplY3QgdGhhdCBjYXB0dXJlcyB0aGUgYXJndW1lbnRzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIERpcmVjdGl2ZVJlc3VsdDxDIGV4dGVuZHMgRGlyZWN0aXZlQ2xhc3MgPSBEaXJlY3RpdmVDbGFzcz4ge1xuICAvKipcbiAgICogVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICogQGludGVybmFsICovXG4gIFsnXyRsaXREaXJlY3RpdmUkJ106IEM7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgdmFsdWVzOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPEluc3RhbmNlVHlwZTxDPj47XG59XG5cbmV4cG9ydCBjb25zdCBQYXJ0VHlwZSA9IHtcbiAgQVRUUklCVVRFOiAxLFxuICBDSElMRDogMixcbiAgUFJPUEVSVFk6IDMsXG4gIEJPT0xFQU5fQVRUUklCVVRFOiA0LFxuICBFVkVOVDogNSxcbiAgRUxFTUVOVDogNixcbn0gYXMgY29uc3Q7XG5cbmV4cG9ydCB0eXBlIFBhcnRUeXBlID0gdHlwZW9mIFBhcnRUeXBlW2tleW9mIHR5cGVvZiBQYXJ0VHlwZV07XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2hpbGRQYXJ0SW5mbyB7XG4gIHJlYWRvbmx5IHR5cGU6IHR5cGVvZiBQYXJ0VHlwZS5DSElMRDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBdHRyaWJ1dGVQYXJ0SW5mbyB7XG4gIHJlYWRvbmx5IHR5cGU6XG4gICAgfCB0eXBlb2YgUGFydFR5cGUuQVRUUklCVVRFXG4gICAgfCB0eXBlb2YgUGFydFR5cGUuUFJPUEVSVFlcbiAgICB8IHR5cGVvZiBQYXJ0VHlwZS5CT09MRUFOX0FUVFJJQlVURVxuICAgIHwgdHlwZW9mIFBhcnRUeXBlLkVWRU5UO1xuICByZWFkb25seSBzdHJpbmdzPzogUmVhZG9ubHlBcnJheTxzdHJpbmc+O1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IHRhZ05hbWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFbGVtZW50UGFydEluZm8ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgUGFydFR5cGUuRUxFTUVOVDtcbn1cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgcGFydCBhIGRpcmVjdGl2ZSBpcyBib3VuZCB0by5cbiAqXG4gKiBUaGlzIGlzIHVzZWZ1bCBmb3IgY2hlY2tpbmcgdGhhdCBhIGRpcmVjdGl2ZSBpcyBhdHRhY2hlZCB0byBhIHZhbGlkIHBhcnQsXG4gKiBzdWNoIGFzIHdpdGggZGlyZWN0aXZlIHRoYXQgY2FuIG9ubHkgYmUgdXNlZCBvbiBhdHRyaWJ1dGUgYmluZGluZ3MuXG4gKi9cbmV4cG9ydCB0eXBlIFBhcnRJbmZvID0gQ2hpbGRQYXJ0SW5mbyB8IEF0dHJpYnV0ZVBhcnRJbmZvIHwgRWxlbWVudFBhcnRJbmZvO1xuXG4vKipcbiAqIENyZWF0ZXMgYSB1c2VyLWZhY2luZyBkaXJlY3RpdmUgZnVuY3Rpb24gZnJvbSBhIERpcmVjdGl2ZSBjbGFzcy4gVGhpc1xuICogZnVuY3Rpb24gaGFzIHRoZSBzYW1lIHBhcmFtZXRlcnMgYXMgdGhlIGRpcmVjdGl2ZSdzIHJlbmRlcigpIG1ldGhvZC5cbiAqL1xuZXhwb3J0IGNvbnN0IGRpcmVjdGl2ZSA9XG4gIDxDIGV4dGVuZHMgRGlyZWN0aXZlQ2xhc3M+KGM6IEMpID0+XG4gICguLi52YWx1ZXM6IERpcmVjdGl2ZVBhcmFtZXRlcnM8SW5zdGFuY2VUeXBlPEM+Pik6IERpcmVjdGl2ZVJlc3VsdDxDPiA9PiAoe1xuICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgWydfJGxpdERpcmVjdGl2ZSQnXTogYyxcbiAgICB2YWx1ZXMsXG4gIH0pO1xuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIGNyZWF0aW5nIGN1c3RvbSBkaXJlY3RpdmVzLiBVc2VycyBzaG91bGQgZXh0ZW5kIHRoaXMgY2xhc3MsXG4gKiBpbXBsZW1lbnQgYHJlbmRlcmAgYW5kL29yIGB1cGRhdGVgLCBhbmQgdGhlbiBwYXNzIHRoZWlyIHN1YmNsYXNzIHRvXG4gKiBgZGlyZWN0aXZlYC5cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIERpcmVjdGl2ZSBpbXBsZW1lbnRzIERpc2Nvbm5lY3RhYmxlIHtcbiAgLy9AaW50ZXJuYWxcbiAgX19wYXJ0ITogUGFydDtcbiAgLy9AaW50ZXJuYWxcbiAgX19hdHRyaWJ1dGVJbmRleDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICAvL0BpbnRlcm5hbFxuICBfX2RpcmVjdGl2ZT86IERpcmVjdGl2ZTtcblxuICAvL0BpbnRlcm5hbFxuICBfJHBhcmVudCE6IERpc2Nvbm5lY3RhYmxlO1xuXG4gIC8vIFRoZXNlIHdpbGwgb25seSBleGlzdCBvbiB0aGUgQXN5bmNEaXJlY3RpdmUgc3ViY2xhc3NcbiAgLy9AaW50ZXJuYWxcbiAgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuPzogU2V0PERpc2Nvbm5lY3RhYmxlPjtcbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgLy9AaW50ZXJuYWxcbiAgWydfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkJ10/KGlzQ29ubmVjdGVkOiBib29sZWFuKTogdm9pZDtcblxuICBjb25zdHJ1Y3RvcihfcGFydEluZm86IFBhcnRJbmZvKSB7fVxuXG4gIC8vIFNlZSBjb21tZW50IGluIERpc2Nvbm5lY3RhYmxlIGludGVyZmFjZSBmb3Igd2h5IHRoaXMgaXMgYSBnZXR0ZXJcbiAgZ2V0IF8kaXNDb25uZWN0ZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuXyRwYXJlbnQuXyRpc0Nvbm5lY3RlZDtcbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRpbml0aWFsaXplKFxuICAgIHBhcnQ6IFBhcnQsXG4gICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSxcbiAgICBhdHRyaWJ1dGVJbmRleDogbnVtYmVyIHwgdW5kZWZpbmVkXG4gICkge1xuICAgIHRoaXMuX19wYXJ0ID0gcGFydDtcbiAgICB0aGlzLl8kcGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMuX19hdHRyaWJ1dGVJbmRleCA9IGF0dHJpYnV0ZUluZGV4O1xuICB9XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRyZXNvbHZlKHBhcnQ6IFBhcnQsIHByb3BzOiBBcnJheTx1bmtub3duPik6IHVua25vd24ge1xuICAgIHJldHVybiB0aGlzLnVwZGF0ZShwYXJ0LCBwcm9wcyk7XG4gIH1cblxuICBhYnN0cmFjdCByZW5kZXIoLi4ucHJvcHM6IEFycmF5PHVua25vd24+KTogdW5rbm93bjtcblxuICB1cGRhdGUoX3BhcnQ6IFBhcnQsIHByb3BzOiBBcnJheTx1bmtub3duPik6IHVua25vd24ge1xuICAgIHJldHVybiB0aGlzLnJlbmRlciguLi5wcm9wcyk7XG4gIH1cbn1cbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge18kTEgsIFBhcnQsIERpcmVjdGl2ZVBhcmVudCwgVGVtcGxhdGVSZXN1bHR9IGZyb20gJy4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgRGlyZWN0aXZlUmVzdWx0LFxuICBEaXJlY3RpdmVDbGFzcyxcbiAgUGFydEluZm8sXG4gIEF0dHJpYnV0ZVBhcnRJbmZvLFxufSBmcm9tICcuL2RpcmVjdGl2ZS5qcyc7XG50eXBlIFByaW1pdGl2ZSA9IG51bGwgfCB1bmRlZmluZWQgfCBib29sZWFuIHwgbnVtYmVyIHwgc3RyaW5nIHwgc3ltYm9sIHwgYmlnaW50O1xuXG5jb25zdCB7X0NoaWxkUGFydDogQ2hpbGRQYXJ0fSA9IF8kTEg7XG5cbnR5cGUgQ2hpbGRQYXJ0ID0gSW5zdGFuY2VUeXBlPHR5cGVvZiBDaGlsZFBhcnQ+O1xuXG5jb25zdCBFTkFCTEVfU0hBRFlET01fTk9QQVRDSCA9IHRydWU7XG5cbmNvbnN0IHdyYXAgPVxuICBFTkFCTEVfU0hBRFlET01fTk9QQVRDSCAmJlxuICB3aW5kb3cuU2hhZHlET00/LmluVXNlICYmXG4gIHdpbmRvdy5TaGFkeURPTT8ubm9QYXRjaCA9PT0gdHJ1ZVxuICAgID8gd2luZG93LlNoYWR5RE9NIS53cmFwXG4gICAgOiAobm9kZTogTm9kZSkgPT4gbm9kZTtcblxuLyoqXG4gKiBUZXN0cyBpZiBhIHZhbHVlIGlzIGEgcHJpbWl0aXZlIHZhbHVlLlxuICpcbiAqIFNlZSBodHRwczovL3RjMzkuZ2l0aHViLmlvL2VjbWEyNjIvI3NlYy10eXBlb2Ytb3BlcmF0b3JcbiAqL1xuZXhwb3J0IGNvbnN0IGlzUHJpbWl0aXZlID0gKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgUHJpbWl0aXZlID0+XG4gIHZhbHVlID09PSBudWxsIHx8ICh0eXBlb2YgdmFsdWUgIT0gJ29iamVjdCcgJiYgdHlwZW9mIHZhbHVlICE9ICdmdW5jdGlvbicpO1xuXG5leHBvcnQgY29uc3QgVGVtcGxhdGVSZXN1bHRUeXBlID0ge1xuICBIVE1MOiAxLFxuICBTVkc6IDIsXG59IGFzIGNvbnN0O1xuXG5leHBvcnQgdHlwZSBUZW1wbGF0ZVJlc3VsdFR5cGUgPVxuICB0eXBlb2YgVGVtcGxhdGVSZXN1bHRUeXBlW2tleW9mIHR5cGVvZiBUZW1wbGF0ZVJlc3VsdFR5cGVdO1xuXG4vKipcbiAqIFRlc3RzIGlmIGEgdmFsdWUgaXMgYSBUZW1wbGF0ZVJlc3VsdC5cbiAqL1xuZXhwb3J0IGNvbnN0IGlzVGVtcGxhdGVSZXN1bHQgPSAoXG4gIHZhbHVlOiB1bmtub3duLFxuICB0eXBlPzogVGVtcGxhdGVSZXN1bHRUeXBlXG4pOiB2YWx1ZSBpcyBUZW1wbGF0ZVJlc3VsdCA9PlxuICB0eXBlID09PSB1bmRlZmluZWRcbiAgICA/IC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgICAodmFsdWUgYXMgVGVtcGxhdGVSZXN1bHQpPy5bJ18kbGl0VHlwZSQnXSAhPT0gdW5kZWZpbmVkXG4gICAgOiAodmFsdWUgYXMgVGVtcGxhdGVSZXN1bHQpPy5bJ18kbGl0VHlwZSQnXSA9PT0gdHlwZTtcblxuLyoqXG4gKiBUZXN0cyBpZiBhIHZhbHVlIGlzIGEgRGlyZWN0aXZlUmVzdWx0LlxuICovXG5leHBvcnQgY29uc3QgaXNEaXJlY3RpdmVSZXN1bHQgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBEaXJlY3RpdmVSZXN1bHQgPT5cbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgKHZhbHVlIGFzIERpcmVjdGl2ZVJlc3VsdCk/LlsnXyRsaXREaXJlY3RpdmUkJ10gIT09IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBSZXRyaWV2ZXMgdGhlIERpcmVjdGl2ZSBjbGFzcyBmb3IgYSBEaXJlY3RpdmVSZXN1bHRcbiAqL1xuZXhwb3J0IGNvbnN0IGdldERpcmVjdGl2ZUNsYXNzID0gKHZhbHVlOiB1bmtub3duKTogRGlyZWN0aXZlQ2xhc3MgfCB1bmRlZmluZWQgPT5cbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgKHZhbHVlIGFzIERpcmVjdGl2ZVJlc3VsdCk/LlsnXyRsaXREaXJlY3RpdmUkJ107XG5cbi8qKlxuICogVGVzdHMgd2hldGhlciBhIHBhcnQgaGFzIG9ubHkgYSBzaW5nbGUtZXhwcmVzc2lvbiB3aXRoIG5vIHN0cmluZ3MgdG9cbiAqIGludGVycG9sYXRlIGJldHdlZW4uXG4gKlxuICogT25seSBBdHRyaWJ1dGVQYXJ0IGFuZCBQcm9wZXJ0eVBhcnQgY2FuIGhhdmUgbXVsdGlwbGUgZXhwcmVzc2lvbnMuXG4gKiBNdWx0aS1leHByZXNzaW9uIHBhcnRzIGhhdmUgYSBgc3RyaW5nc2AgcHJvcGVydHkgYW5kIHNpbmdsZS1leHByZXNzaW9uXG4gKiBwYXJ0cyBkbyBub3QuXG4gKi9cbmV4cG9ydCBjb25zdCBpc1NpbmdsZUV4cHJlc3Npb24gPSAocGFydDogUGFydEluZm8pID0+XG4gIChwYXJ0IGFzIEF0dHJpYnV0ZVBhcnRJbmZvKS5zdHJpbmdzID09PSB1bmRlZmluZWQ7XG5cbmNvbnN0IGNyZWF0ZU1hcmtlciA9ICgpID0+IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJycpO1xuXG4vKipcbiAqIEluc2VydHMgYSBDaGlsZFBhcnQgaW50byB0aGUgZ2l2ZW4gY29udGFpbmVyIENoaWxkUGFydCdzIERPTSwgZWl0aGVyIGF0IHRoZVxuICogZW5kIG9mIHRoZSBjb250YWluZXIgQ2hpbGRQYXJ0LCBvciBiZWZvcmUgdGhlIG9wdGlvbmFsIGByZWZQYXJ0YC5cbiAqXG4gKiBUaGlzIGRvZXMgbm90IGFkZCB0aGUgcGFydCB0byB0aGUgY29udGFpbmVyUGFydCdzIGNvbW1pdHRlZCB2YWx1ZS4gVGhhdCBtdXN0XG4gKiBiZSBkb25lIGJ5IGNhbGxlcnMuXG4gKlxuICogQHBhcmFtIGNvbnRhaW5lclBhcnQgUGFydCB3aXRoaW4gd2hpY2ggdG8gYWRkIHRoZSBuZXcgQ2hpbGRQYXJ0XG4gKiBAcGFyYW0gcmVmUGFydCBQYXJ0IGJlZm9yZSB3aGljaCB0byBhZGQgdGhlIG5ldyBDaGlsZFBhcnQ7IHdoZW4gb21pdHRlZCB0aGVcbiAqICAgICBwYXJ0IGFkZGVkIHRvIHRoZSBlbmQgb2YgdGhlIGBjb250YWluZXJQYXJ0YFxuICogQHBhcmFtIHBhcnQgUGFydCB0byBpbnNlcnQsIG9yIHVuZGVmaW5lZCB0byBjcmVhdGUgYSBuZXcgcGFydFxuICovXG5leHBvcnQgY29uc3QgaW5zZXJ0UGFydCA9IChcbiAgY29udGFpbmVyUGFydDogQ2hpbGRQYXJ0LFxuICByZWZQYXJ0PzogQ2hpbGRQYXJ0LFxuICBwYXJ0PzogQ2hpbGRQYXJ0XG4pOiBDaGlsZFBhcnQgPT4ge1xuICBjb25zdCBjb250YWluZXIgPSB3cmFwKGNvbnRhaW5lclBhcnQuXyRzdGFydE5vZGUpLnBhcmVudE5vZGUhO1xuXG4gIGNvbnN0IHJlZk5vZGUgPVxuICAgIHJlZlBhcnQgPT09IHVuZGVmaW5lZCA/IGNvbnRhaW5lclBhcnQuXyRlbmROb2RlIDogcmVmUGFydC5fJHN0YXJ0Tm9kZTtcblxuICBpZiAocGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3Qgc3RhcnROb2RlID0gd3JhcChjb250YWluZXIpLmluc2VydEJlZm9yZShjcmVhdGVNYXJrZXIoKSwgcmVmTm9kZSk7XG4gICAgY29uc3QgZW5kTm9kZSA9IHdyYXAoY29udGFpbmVyKS5pbnNlcnRCZWZvcmUoY3JlYXRlTWFya2VyKCksIHJlZk5vZGUpO1xuICAgIHBhcnQgPSBuZXcgQ2hpbGRQYXJ0KFxuICAgICAgc3RhcnROb2RlLFxuICAgICAgZW5kTm9kZSxcbiAgICAgIGNvbnRhaW5lclBhcnQsXG4gICAgICBjb250YWluZXJQYXJ0Lm9wdGlvbnNcbiAgICApO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGVuZE5vZGUgPSB3cmFwKHBhcnQuXyRlbmROb2RlISkubmV4dFNpYmxpbmc7XG4gICAgY29uc3Qgb2xkUGFyZW50ID0gcGFydC5fJHBhcmVudDtcbiAgICBjb25zdCBwYXJlbnRDaGFuZ2VkID0gb2xkUGFyZW50ICE9PSBjb250YWluZXJQYXJ0O1xuICAgIGlmIChwYXJlbnRDaGFuZ2VkKSB7XG4gICAgICBwYXJ0Ll8kcmVwYXJlbnREaXNjb25uZWN0YWJsZXM/Lihjb250YWluZXJQYXJ0KTtcbiAgICAgIC8vIE5vdGUgdGhhdCBhbHRob3VnaCBgXyRyZXBhcmVudERpc2Nvbm5lY3RhYmxlc2AgdXBkYXRlcyB0aGUgcGFydCdzXG4gICAgICAvLyBgXyRwYXJlbnRgIHJlZmVyZW5jZSBhZnRlciB1bmxpbmtpbmcgZnJvbSBpdHMgY3VycmVudCBwYXJlbnQsIHRoYXRcbiAgICAgIC8vIG1ldGhvZCBvbmx5IGV4aXN0cyBpZiBEaXNjb25uZWN0YWJsZXMgYXJlIHByZXNlbnQsIHNvIHdlIG5lZWQgdG9cbiAgICAgIC8vIHVuY29uZGl0aW9uYWxseSBzZXQgaXQgaGVyZVxuICAgICAgcGFydC5fJHBhcmVudCA9IGNvbnRhaW5lclBhcnQ7XG4gICAgICAvLyBTaW5jZSB0aGUgXyRpc0Nvbm5lY3RlZCBnZXR0ZXIgaXMgc29tZXdoYXQgY29zdGx5LCBvbmx5XG4gICAgICAvLyByZWFkIGl0IG9uY2Ugd2Uga25vdyB0aGUgc3VidHJlZSBoYXMgZGlyZWN0aXZlcyB0aGF0IG5lZWRcbiAgICAgIC8vIHRvIGJlIG5vdGlmaWVkXG4gICAgICBsZXQgbmV3Q29ubmVjdGlvblN0YXRlO1xuICAgICAgaWYgKFxuICAgICAgICBwYXJ0Ll8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAobmV3Q29ubmVjdGlvblN0YXRlID0gY29udGFpbmVyUGFydC5fJGlzQ29ubmVjdGVkKSAhPT1cbiAgICAgICAgICBvbGRQYXJlbnQhLl8kaXNDb25uZWN0ZWRcbiAgICAgICkge1xuICAgICAgICBwYXJ0Ll8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQobmV3Q29ubmVjdGlvblN0YXRlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGVuZE5vZGUgIT09IHJlZk5vZGUgfHwgcGFyZW50Q2hhbmdlZCkge1xuICAgICAgbGV0IHN0YXJ0OiBOb2RlIHwgbnVsbCA9IHBhcnQuXyRzdGFydE5vZGU7XG4gICAgICB3aGlsZSAoc3RhcnQgIT09IGVuZE5vZGUpIHtcbiAgICAgICAgY29uc3QgbjogTm9kZSB8IG51bGwgPSB3cmFwKHN0YXJ0ISkubmV4dFNpYmxpbmc7XG4gICAgICAgIHdyYXAoY29udGFpbmVyKS5pbnNlcnRCZWZvcmUoc3RhcnQhLCByZWZOb2RlKTtcbiAgICAgICAgc3RhcnQgPSBuO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwYXJ0O1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIFBhcnQuXG4gKlxuICogTm90ZSB0aGF0IHRoaXMgc2hvdWxkIG9ubHkgYmUgdXNlZCB0byBzZXQvdXBkYXRlIHRoZSB2YWx1ZSBvZiB1c2VyLWNyZWF0ZWRcbiAqIHBhcnRzIChpLmUuIHRob3NlIGNyZWF0ZWQgdXNpbmcgYGluc2VydFBhcnRgKTsgaXQgc2hvdWxkIG5vdCBiZSB1c2VkXG4gKiBieSBkaXJlY3RpdmVzIHRvIHNldCB0aGUgdmFsdWUgb2YgdGhlIGRpcmVjdGl2ZSdzIGNvbnRhaW5lciBwYXJ0LiBEaXJlY3RpdmVzXG4gKiBzaG91bGQgcmV0dXJuIGEgdmFsdWUgZnJvbSBgdXBkYXRlYC9gcmVuZGVyYCB0byB1cGRhdGUgdGhlaXIgcGFydCBzdGF0ZS5cbiAqXG4gKiBGb3IgZGlyZWN0aXZlcyB0aGF0IHJlcXVpcmUgc2V0dGluZyB0aGVpciBwYXJ0IHZhbHVlIGFzeW5jaHJvbm91c2x5LCB0aGV5XG4gKiBzaG91bGQgZXh0ZW5kIGBBc3luY0RpcmVjdGl2ZWAgYW5kIGNhbGwgYHRoaXMuc2V0VmFsdWUoKWAuXG4gKlxuICogQHBhcmFtIHBhcnQgUGFydCB0byBzZXRcbiAqIEBwYXJhbSB2YWx1ZSBWYWx1ZSB0byBzZXRcbiAqIEBwYXJhbSBpbmRleCBGb3IgYEF0dHJpYnV0ZVBhcnRgcywgdGhlIGluZGV4IHRvIHNldFxuICogQHBhcmFtIGRpcmVjdGl2ZVBhcmVudCBVc2VkIGludGVybmFsbHk7IHNob3VsZCBub3QgYmUgc2V0IGJ5IHVzZXJcbiAqL1xuZXhwb3J0IGNvbnN0IHNldENoaWxkUGFydFZhbHVlID0gPFQgZXh0ZW5kcyBDaGlsZFBhcnQ+KFxuICBwYXJ0OiBULFxuICB2YWx1ZTogdW5rbm93bixcbiAgZGlyZWN0aXZlUGFyZW50OiBEaXJlY3RpdmVQYXJlbnQgPSBwYXJ0XG4pOiBUID0+IHtcbiAgcGFydC5fJHNldFZhbHVlKHZhbHVlLCBkaXJlY3RpdmVQYXJlbnQpO1xuICByZXR1cm4gcGFydDtcbn07XG5cbi8vIEEgc2VudGluYWwgdmFsdWUgdGhhdCBjYW4gbmV2ZXIgYXBwZWFyIGFzIGEgcGFydCB2YWx1ZSBleGNlcHQgd2hlbiBzZXQgYnlcbi8vIGxpdmUoKS4gVXNlZCB0byBmb3JjZSBhIGRpcnR5LWNoZWNrIHRvIGZhaWwgYW5kIGNhdXNlIGEgcmUtcmVuZGVyLlxuY29uc3QgUkVTRVRfVkFMVUUgPSB7fTtcblxuLyoqXG4gKiBTZXRzIHRoZSBjb21taXR0ZWQgdmFsdWUgb2YgYSBDaGlsZFBhcnQgZGlyZWN0bHkgd2l0aG91dCB0cmlnZ2VyaW5nIHRoZVxuICogY29tbWl0IHN0YWdlIG9mIHRoZSBwYXJ0LlxuICpcbiAqIFRoaXMgaXMgdXNlZnVsIGluIGNhc2VzIHdoZXJlIGEgZGlyZWN0aXZlIG5lZWRzIHRvIHVwZGF0ZSB0aGUgcGFydCBzdWNoXG4gKiB0aGF0IHRoZSBuZXh0IHVwZGF0ZSBkZXRlY3RzIGEgdmFsdWUgY2hhbmdlIG9yIG5vdC4gV2hlbiB2YWx1ZSBpcyBvbWl0dGVkLFxuICogdGhlIG5leHQgdXBkYXRlIHdpbGwgYmUgZ3VhcmFudGVlZCB0byBiZSBkZXRlY3RlZCBhcyBhIGNoYW5nZS5cbiAqXG4gKiBAcGFyYW0gcGFydFxuICogQHBhcmFtIHZhbHVlXG4gKi9cbmV4cG9ydCBjb25zdCBzZXRDb21taXR0ZWRWYWx1ZSA9IChwYXJ0OiBQYXJ0LCB2YWx1ZTogdW5rbm93biA9IFJFU0VUX1ZBTFVFKSA9PlxuICAocGFydC5fJGNvbW1pdHRlZFZhbHVlID0gdmFsdWUpO1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGNvbW1pdHRlZCB2YWx1ZSBvZiBhIENoaWxkUGFydC5cbiAqXG4gKiBUaGUgY29tbWl0dGVkIHZhbHVlIGlzIHVzZWQgZm9yIGNoYW5nZSBkZXRlY3Rpb24gYW5kIGVmZmljaWVudCB1cGRhdGVzIG9mXG4gKiB0aGUgcGFydC4gSXQgY2FuIGRpZmZlciBmcm9tIHRoZSB2YWx1ZSBzZXQgYnkgdGhlIHRlbXBsYXRlIG9yIGRpcmVjdGl2ZSBpblxuICogY2FzZXMgd2hlcmUgdGhlIHRlbXBsYXRlIHZhbHVlIGlzIHRyYW5zZm9ybWVkIGJlZm9yZSBiZWluZyBjb21taXRlZC5cbiAqXG4gKiAtIGBUZW1wbGF0ZVJlc3VsdGBzIGFyZSBjb21taXR0ZWQgYXMgYSBgVGVtcGxhdGVJbnN0YW5jZWBcbiAqIC0gSXRlcmFibGVzIGFyZSBjb21taXR0ZWQgYXMgYEFycmF5PENoaWxkUGFydD5gXG4gKiAtIEFsbCBvdGhlciB0eXBlcyBhcmUgY29tbWl0dGVkIGFzIHRoZSB0ZW1wbGF0ZSB2YWx1ZSBvciB2YWx1ZSByZXR1cm5lZCBvclxuICogICBzZXQgYnkgYSBkaXJlY3RpdmUuXG4gKlxuICogQHBhcmFtIHBhcnRcbiAqL1xuZXhwb3J0IGNvbnN0IGdldENvbW1pdHRlZFZhbHVlID0gKHBhcnQ6IENoaWxkUGFydCkgPT4gcGFydC5fJGNvbW1pdHRlZFZhbHVlO1xuXG4vKipcbiAqIFJlbW92ZXMgYSBDaGlsZFBhcnQgZnJvbSB0aGUgRE9NLCBpbmNsdWRpbmcgYW55IG9mIGl0cyBjb250ZW50LlxuICpcbiAqIEBwYXJhbSBwYXJ0IFRoZSBQYXJ0IHRvIHJlbW92ZVxuICovXG5leHBvcnQgY29uc3QgcmVtb3ZlUGFydCA9IChwYXJ0OiBDaGlsZFBhcnQpID0+IHtcbiAgcGFydC5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkPy4oZmFsc2UsIHRydWUpO1xuICBsZXQgc3RhcnQ6IENoaWxkTm9kZSB8IG51bGwgPSBwYXJ0Ll8kc3RhcnROb2RlO1xuICBjb25zdCBlbmQ6IENoaWxkTm9kZSB8IG51bGwgPSB3cmFwKHBhcnQuXyRlbmROb2RlISkubmV4dFNpYmxpbmc7XG4gIHdoaWxlIChzdGFydCAhPT0gZW5kKSB7XG4gICAgY29uc3QgbjogQ2hpbGROb2RlIHwgbnVsbCA9IHdyYXAoc3RhcnQhKS5uZXh0U2libGluZztcbiAgICAod3JhcChzdGFydCEpIGFzIENoaWxkTm9kZSkucmVtb3ZlKCk7XG4gICAgc3RhcnQgPSBuO1xuICB9XG59O1xuXG5leHBvcnQgY29uc3QgY2xlYXJQYXJ0ID0gKHBhcnQ6IENoaWxkUGFydCkgPT4ge1xuICBwYXJ0Ll8kY2xlYXIoKTtcbn07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLyoqXG4gKiBPdmVydmlldzpcbiAqXG4gKiBUaGlzIG1vZHVsZSBpcyBkZXNpZ25lZCB0byBhZGQgc3VwcG9ydCBmb3IgYW4gYXN5bmMgYHNldFZhbHVlYCBBUEkgYW5kXG4gKiBgZGlzY29ubmVjdGVkYCBjYWxsYmFjayB0byBkaXJlY3RpdmVzIHdpdGggdGhlIGxlYXN0IGltcGFjdCBvbiB0aGUgY29yZVxuICogcnVudGltZSBvciBwYXlsb2FkIHdoZW4gdGhhdCBmZWF0dXJlIGlzIG5vdCB1c2VkLlxuICpcbiAqIFRoZSBzdHJhdGVneSBpcyB0byBpbnRyb2R1Y2UgYSBgQXN5bmNEaXJlY3RpdmVgIHN1YmNsYXNzIG9mXG4gKiBgRGlyZWN0aXZlYCB0aGF0IGNsaW1icyB0aGUgXCJwYXJlbnRcIiB0cmVlIGluIGl0cyBjb25zdHJ1Y3RvciB0byBub3RlIHdoaWNoXG4gKiBicmFuY2hlcyBvZiBsaXQtaHRtbCdzIFwibG9naWNhbCB0cmVlXCIgb2YgZGF0YSBzdHJ1Y3R1cmVzIGNvbnRhaW4gc3VjaFxuICogZGlyZWN0aXZlcyBhbmQgdGh1cyBuZWVkIHRvIGJlIGNyYXdsZWQgd2hlbiBhIHN1YnRyZWUgaXMgYmVpbmcgY2xlYXJlZCAob3JcbiAqIG1hbnVhbGx5IGRpc2Nvbm5lY3RlZCkgaW4gb3JkZXIgdG8gcnVuIHRoZSBgZGlzY29ubmVjdGVkYCBjYWxsYmFjay5cbiAqXG4gKiBUaGUgXCJub2Rlc1wiIG9mIHRoZSBsb2dpY2FsIHRyZWUgaW5jbHVkZSBQYXJ0cywgVGVtcGxhdGVJbnN0YW5jZXMgKGZvciB3aGVuIGFcbiAqIFRlbXBsYXRlUmVzdWx0IGlzIGNvbW1pdHRlZCB0byBhIHZhbHVlIG9mIGEgQ2hpbGRQYXJ0KSwgYW5kIERpcmVjdGl2ZXM7IHRoZXNlXG4gKiBhbGwgaW1wbGVtZW50IGEgY29tbW9uIGludGVyZmFjZSBjYWxsZWQgYERpc2Nvbm5lY3RhYmxlQ2hpbGRgLiBFYWNoIGhhcyBhXG4gKiBgXyRwYXJlbnRgIHJlZmVyZW5jZSB3aGljaCBpcyBzZXQgZHVyaW5nIGNvbnN0cnVjdGlvbiBpbiB0aGUgY29yZSBjb2RlLCBhbmQgYVxuICogYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAgZmllbGQgd2hpY2ggaXMgaW5pdGlhbGx5IHVuZGVmaW5lZC5cbiAqXG4gKiBUaGUgc3BhcnNlIHRyZWUgY3JlYXRlZCBieSBtZWFucyBvZiB0aGUgYEFzeW5jRGlyZWN0aXZlYCBjb25zdHJ1Y3RvclxuICogY3Jhd2xpbmcgdXAgdGhlIGBfJHBhcmVudGAgdHJlZSBhbmQgcGxhY2luZyBhIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gIFNldFxuICogb24gZWFjaCBwYXJlbnQgdGhhdCBpbmNsdWRlcyBlYWNoIGNoaWxkIHRoYXQgY29udGFpbnMgYVxuICogYEFzeW5jRGlyZWN0aXZlYCBkaXJlY3RseSBvciB0cmFuc2l0aXZlbHkgdmlhIGl0cyBjaGlsZHJlbi4gSW4gb3JkZXIgdG9cbiAqIG5vdGlmeSBjb25uZWN0aW9uIHN0YXRlIGNoYW5nZXMgYW5kIGRpc2Nvbm5lY3QgKG9yIHJlY29ubmVjdCkgYSB0cmVlLCB0aGVcbiAqIGBfJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkYCBBUEkgaXMgcGF0Y2hlZCBvbnRvIENoaWxkUGFydHMgYXMgYSBkaXJlY3RpdmVcbiAqIGNsaW1icyB0aGUgcGFyZW50IHRyZWUsIHdoaWNoIGlzIGNhbGxlZCBieSB0aGUgY29yZSB3aGVuIGNsZWFyaW5nIGEgcGFydCBpZlxuICogaXQgZXhpc3RzLiBXaGVuIGNhbGxlZCwgdGhhdCBtZXRob2QgaXRlcmF0ZXMgb3ZlciB0aGUgc3BhcnNlIHRyZWUgb2ZcbiAqIFNldDxEaXNjb25uZWN0YWJsZUNoaWxkcmVuPiBidWlsdCB1cCBieSBBc3luY0RpcmVjdGl2ZXMsIGFuZCBjYWxsc1xuICogYF8kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWRgIG9uIGFueSBkaXJlY3RpdmVzIHRoYXQgYXJlIGVuY291bnRlcmVkXG4gKiBpbiB0aGF0IHRyZWUsIHJ1bm5pbmcgdGhlIHJlcXVpcmVkIGNhbGxiYWNrcy5cbiAqXG4gKiBBIGdpdmVuIFwibG9naWNhbCB0cmVlXCIgb2YgbGl0LWh0bWwgZGF0YS1zdHJ1Y3R1cmVzIG1pZ2h0IGxvb2sgbGlrZSB0aGlzOlxuICpcbiAqICBDaGlsZFBhcnQoTjEpIF8kZEM9W0QyLFQzXVxuICogICAuX2RpcmVjdGl2ZVxuICogICAgIEFzeW5jRGlyZWN0aXZlKEQyKVxuICogICAuX3ZhbHVlIC8vIHVzZXIgdmFsdWUgd2FzIFRlbXBsYXRlUmVzdWx0XG4gKiAgICAgVGVtcGxhdGVJbnN0YW5jZShUMykgXyRkQz1bQTQsQTYsTjEwLE4xMl1cbiAqICAgICAgLl9wYXJ0c1tdXG4gKiAgICAgICAgQXR0cmlidXRlUGFydChBNCkgXyRkQz1bRDVdXG4gKiAgICAgICAgIC5fZGlyZWN0aXZlc1tdXG4gKiAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDUpXG4gKiAgICAgICAgQXR0cmlidXRlUGFydChBNikgXyRkQz1bRDcsRDhdXG4gKiAgICAgICAgIC5fZGlyZWN0aXZlc1tdXG4gKiAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDcpXG4gKiAgICAgICAgICAgRGlyZWN0aXZlKEQ4KSBfJGRDPVtEOV1cbiAqICAgICAgICAgICAgLl9kaXJlY3RpdmVcbiAqICAgICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEOSlcbiAqICAgICAgICBDaGlsZFBhcnQoTjEwKSBfJGRDPVtEMTFdXG4gKiAgICAgICAgIC5fZGlyZWN0aXZlXG4gKiAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDExKVxuICogICAgICAgICAuX3ZhbHVlXG4gKiAgICAgICAgICAgc3RyaW5nXG4gKiAgICAgICAgQ2hpbGRQYXJ0KE4xMikgXyRkQz1bRDEzLE4xNCxOMTZdXG4gKiAgICAgICAgIC5fZGlyZWN0aXZlXG4gKiAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDEzKVxuICogICAgICAgICAuX3ZhbHVlIC8vIHVzZXIgdmFsdWUgd2FzIGl0ZXJhYmxlXG4gKiAgICAgICAgICAgQXJyYXk8Q2hpbGRQYXJ0PlxuICogICAgICAgICAgICAgQ2hpbGRQYXJ0KE4xNCkgXyRkQz1bRDE1XVxuICogICAgICAgICAgICAgIC5fdmFsdWVcbiAqICAgICAgICAgICAgICAgIHN0cmluZ1xuICogICAgICAgICAgICAgQ2hpbGRQYXJ0KE4xNikgXyRkQz1bRDE3LFQxOF1cbiAqICAgICAgICAgICAgICAuX2RpcmVjdGl2ZVxuICogICAgICAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDE3KVxuICogICAgICAgICAgICAgIC5fdmFsdWUgLy8gdXNlciB2YWx1ZSB3YXMgVGVtcGxhdGVSZXN1bHRcbiAqICAgICAgICAgICAgICAgIFRlbXBsYXRlSW5zdGFuY2UoVDE4KSBfJGRDPVtBMTksQTIxLE4yNV1cbiAqICAgICAgICAgICAgICAgICAuX3BhcnRzW11cbiAqICAgICAgICAgICAgICAgICAgIEF0dHJpYnV0ZVBhcnQoQTE5KSBfJGRDPVtEMjBdXG4gKiAgICAgICAgICAgICAgICAgICAgLl9kaXJlY3RpdmVzW11cbiAqICAgICAgICAgICAgICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQyMClcbiAqICAgICAgICAgICAgICAgICAgIEF0dHJpYnV0ZVBhcnQoQTIxKSBfJGRDPVsyMiwyM11cbiAqICAgICAgICAgICAgICAgICAgICAuX2RpcmVjdGl2ZXNbXVxuICogICAgICAgICAgICAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDIyKVxuICogICAgICAgICAgICAgICAgICAgICAgRGlyZWN0aXZlKEQyMykgXyRkQz1bRDI0XVxuICogICAgICAgICAgICAgICAgICAgICAgIC5fZGlyZWN0aXZlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEMjQpXG4gKiAgICAgICAgICAgICAgICAgICBDaGlsZFBhcnQoTjI1KSBfJGRDPVtEMjZdXG4gKiAgICAgICAgICAgICAgICAgICAgLl9kaXJlY3RpdmVcbiAqICAgICAgICAgICAgICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQyNilcbiAqICAgICAgICAgICAgICAgICAgICAuX3ZhbHVlXG4gKiAgICAgICAgICAgICAgICAgICAgICBzdHJpbmdcbiAqXG4gKiBFeGFtcGxlIDE6IFRoZSBkaXJlY3RpdmUgaW4gQ2hpbGRQYXJ0KE4xMikgdXBkYXRlcyBhbmQgcmV0dXJucyBgbm90aGluZ2AuIFRoZVxuICogQ2hpbGRQYXJ0IHdpbGwgX2NsZWFyKCkgaXRzZWxmLCBhbmQgc28gd2UgbmVlZCB0byBkaXNjb25uZWN0IHRoZSBcInZhbHVlXCIgb2ZcbiAqIHRoZSBDaGlsZFBhcnQgKGJ1dCBub3QgaXRzIGRpcmVjdGl2ZSkuIEluIHRoaXMgY2FzZSwgd2hlbiBgX2NsZWFyKClgIGNhbGxzXG4gKiBgXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZCgpYCwgd2UgZG9uJ3QgaXRlcmF0ZSBhbGwgb2YgdGhlXG4gKiBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4sIHJhdGhlciB3ZSBkbyBhIHZhbHVlLXNwZWNpZmljIGRpc2Nvbm5lY3Rpb246IGkuZS5cbiAqIHNpbmNlIHRoZSBfdmFsdWUgd2FzIGFuIEFycmF5PENoaWxkUGFydD4gKGJlY2F1c2UgYW4gaXRlcmFibGUgaGFkIGJlZW5cbiAqIGNvbW1pdHRlZCksIHdlIGl0ZXJhdGUgdGhlIGFycmF5IG9mIENoaWxkUGFydHMgKE4xNCwgTjE2KSBhbmQgcnVuXG4gKiBgc2V0Q29ubmVjdGVkYCBvbiB0aGVtICh3aGljaCBkb2VzIHJlY3Vyc2UgZG93biB0aGUgZnVsbCB0cmVlIG9mXG4gKiBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCBiZWxvdyBpdCwgYW5kIGFsc28gcmVtb3ZlcyBOMTQgYW5kIE4xNiBmcm9tIE4xMidzXG4gKiBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCkuIE9uY2UgdGhlIHZhbHVlcyBoYXZlIGJlZW4gZGlzY29ubmVjdGVkLCB3ZSB0aGVuXG4gKiBjaGVjayB3aGV0aGVyIHRoZSBDaGlsZFBhcnQoTjEyKSdzIGxpc3Qgb2YgYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAgaXMgZW1wdHlcbiAqIChhbmQgd291bGQgcmVtb3ZlIGl0IGZyb20gaXRzIHBhcmVudCBUZW1wbGF0ZUluc3RhbmNlKFQzKSBpZiBzbyksIGJ1dCBzaW5jZVxuICogaXQgd291bGQgc3RpbGwgY29udGFpbiBpdHMgZGlyZWN0aXZlIEQxMywgaXQgc3RheXMgaW4gdGhlIGRpc2Nvbm5lY3RhYmxlXG4gKiB0cmVlLlxuICpcbiAqIEV4YW1wbGUgMjogSW4gdGhlIGNvdXJzZSBvZiBFeGFtcGxlIDEsIGBzZXRDb25uZWN0ZWRgIHdpbGwgcmVhY2hcbiAqIENoaWxkUGFydChOMTYpOyBpbiB0aGlzIGNhc2UgdGhlIGVudGlyZSBwYXJ0IGlzIGJlaW5nIGRpc2Nvbm5lY3RlZCwgc28gd2VcbiAqIHNpbXBseSBpdGVyYXRlIGFsbCBvZiBOMTYncyBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCAoRDE3LFQxOCkgYW5kXG4gKiByZWN1cnNpdmVseSBydW4gYHNldENvbm5lY3RlZGAgb24gdGhlbS4gTm90ZSB0aGF0IHdlIG9ubHkgcmVtb3ZlIGNoaWxkcmVuXG4gKiBmcm9tIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gIGZvciB0aGUgdG9wLWxldmVsIHZhbHVlcyBiZWluZyBkaXNjb25uZWN0ZWRcbiAqIG9uIGEgY2xlYXI7IGRvaW5nIHRoaXMgYm9va2tlZXBpbmcgbG93ZXIgaW4gdGhlIHRyZWUgaXMgd2FzdGVmdWwgc2luY2UgaXQnc1xuICogYWxsIGJlaW5nIHRocm93biBhd2F5LlxuICpcbiAqIEV4YW1wbGUgMzogSWYgdGhlIExpdEVsZW1lbnQgY29udGFpbmluZyB0aGUgZW50aXJlIHRyZWUgYWJvdmUgYmVjb21lc1xuICogZGlzY29ubmVjdGVkLCBpdCB3aWxsIHJ1biBgY2hpbGRQYXJ0LnNldENvbm5lY3RlZCgpYCAod2hpY2ggY2FsbHNcbiAqIGBjaGlsZFBhcnQuXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZCgpYCBpZiBpdCBleGlzdHMpOyBpbiB0aGlzIGNhc2UsIHdlXG4gKiByZWN1cnNpdmVseSBydW4gYHNldENvbm5lY3RlZCgpYCBvdmVyIHRoZSBlbnRpcmUgdHJlZSwgd2l0aG91dCByZW1vdmluZyBhbnlcbiAqIGNoaWxkcmVuIGZyb20gYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAsIHNpbmNlIHRoaXMgdHJlZSBpcyByZXF1aXJlZCB0b1xuICogcmUtY29ubmVjdCB0aGUgdHJlZSwgd2hpY2ggZG9lcyB0aGUgc2FtZSBvcGVyYXRpb24sIHNpbXBseSBwYXNzaW5nXG4gKiBgaXNDb25uZWN0ZDogdHJ1ZWAgZG93biB0aGUgdHJlZSwgc2lnbmFsaW5nIHdoaWNoIGNhbGxiYWNrIHRvIHJ1bi5cbiAqL1xuXG5pbXBvcnQge0F0dHJpYnV0ZVBhcnQsIENoaWxkUGFydCwgRGlzY29ubmVjdGFibGUsIFBhcnR9IGZyb20gJy4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtpc1NpbmdsZUV4cHJlc3Npb259IGZyb20gJy4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuaW1wb3J0IHtEaXJlY3RpdmUsIFBhcnRJbmZvLCBQYXJ0VHlwZX0gZnJvbSAnLi9kaXJlY3RpdmUuanMnO1xuZXhwb3J0IHtkaXJlY3RpdmV9IGZyb20gJy4vZGlyZWN0aXZlLmpzJztcblxuY29uc3QgREVWX01PREUgPSB0cnVlO1xuXG4vKipcbiAqIFJlY3Vyc2l2ZWx5IHdhbGtzIGRvd24gdGhlIHRyZWUgb2YgUGFydHMvVGVtcGxhdGVJbnN0YW5jZXMvRGlyZWN0aXZlcyB0byBzZXRcbiAqIHRoZSBjb25uZWN0ZWQgc3RhdGUgb2YgZGlyZWN0aXZlcyBhbmQgcnVuIGBkaXNjb25uZWN0ZWRgLyBgcmVjb25uZWN0ZWRgXG4gKiBjYWxsYmFja3MuXG4gKlxuICogQHJldHVybiBUcnVlIGlmIHRoZXJlIHdlcmUgY2hpbGRyZW4gdG8gZGlzY29ubmVjdDsgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbmNvbnN0IG5vdGlmeUNoaWxkcmVuQ29ubmVjdGVkQ2hhbmdlZCA9IChcbiAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSxcbiAgaXNDb25uZWN0ZWQ6IGJvb2xlYW5cbik6IGJvb2xlYW4gPT4ge1xuICBjb25zdCBjaGlsZHJlbiA9IHBhcmVudC5fJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW47XG4gIGlmIChjaGlsZHJlbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGZvciAoY29uc3Qgb2JqIG9mIGNoaWxkcmVuKSB7XG4gICAgLy8gVGhlIGV4aXN0ZW5jZSBvZiBgXyRub3RpZnlEaXJlY3RpdmVDb25uZWN0aW9uQ2hhbmdlZGAgaXMgdXNlZCBhcyBhIFwiYnJhbmRcIiB0b1xuICAgIC8vIGRpc2FtYmlndWF0ZSBBc3luY0RpcmVjdGl2ZXMgZnJvbSBvdGhlciBEaXNjb25uZWN0YWJsZUNoaWxkcmVuXG4gICAgLy8gKGFzIG9wcG9zZWQgdG8gdXNpbmcgYW4gaW5zdGFuY2VvZiBjaGVjayB0byBrbm93IHdoZW4gdG8gY2FsbCBpdCk7IHRoZVxuICAgIC8vIHJlZHVuZGFuY3kgb2YgXCJEaXJlY3RpdmVcIiBpbiB0aGUgQVBJIG5hbWUgaXMgdG8gYXZvaWQgY29uZmxpY3Rpbmcgd2l0aFxuICAgIC8vIGBfJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkYCwgd2hpY2ggZXhpc3RzIGBDaGlsZFBhcnRzYCB3aGljaCBhcmUgYWxzbyBpblxuICAgIC8vIHRoaXMgbGlzdFxuICAgIC8vIERpc2Nvbm5lY3QgRGlyZWN0aXZlIChhbmQgYW55IG5lc3RlZCBkaXJlY3RpdmVzIGNvbnRhaW5lZCB3aXRoaW4pXG4gICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICAob2JqIGFzIEFzeW5jRGlyZWN0aXZlKVsnXyRub3RpZnlEaXJlY3RpdmVDb25uZWN0aW9uQ2hhbmdlZCddPy4oXG4gICAgICBpc0Nvbm5lY3RlZCxcbiAgICAgIGZhbHNlXG4gICAgKTtcbiAgICAvLyBEaXNjb25uZWN0IFBhcnQvVGVtcGxhdGVJbnN0YW5jZVxuICAgIG5vdGlmeUNoaWxkcmVuQ29ubmVjdGVkQ2hhbmdlZChvYmosIGlzQ29ubmVjdGVkKTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyB0aGUgZ2l2ZW4gY2hpbGQgZnJvbSBpdHMgcGFyZW50IGxpc3Qgb2YgZGlzY29ubmVjdGFibGUgY2hpbGRyZW4sIGFuZFxuICogaWYgdGhlIHBhcmVudCBsaXN0IGJlY29tZXMgZW1wdHkgYXMgYSByZXN1bHQsIHJlbW92ZXMgdGhlIHBhcmVudCBmcm9tIGl0c1xuICogcGFyZW50LCBhbmQgc28gZm9ydGggdXAgdGhlIHRyZWUgd2hlbiB0aGF0IGNhdXNlcyBzdWJzZXF1ZW50IHBhcmVudCBsaXN0cyB0b1xuICogYmVjb21lIGVtcHR5LlxuICovXG5jb25zdCByZW1vdmVEaXNjb25uZWN0YWJsZUZyb21QYXJlbnQgPSAob2JqOiBEaXNjb25uZWN0YWJsZSkgPT4ge1xuICBsZXQgcGFyZW50LCBjaGlsZHJlbjtcbiAgZG8ge1xuICAgIGlmICgocGFyZW50ID0gb2JqLl8kcGFyZW50KSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY2hpbGRyZW4gPSBwYXJlbnQuXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuITtcbiAgICBjaGlsZHJlbi5kZWxldGUob2JqKTtcbiAgICBvYmogPSBwYXJlbnQ7XG4gIH0gd2hpbGUgKGNoaWxkcmVuPy5zaXplID09PSAwKTtcbn07XG5cbmNvbnN0IGFkZERpc2Nvbm5lY3RhYmxlVG9QYXJlbnQgPSAob2JqOiBEaXNjb25uZWN0YWJsZSkgPT4ge1xuICAvLyBDbGltYiB0aGUgcGFyZW50IHRyZWUsIGNyZWF0aW5nIGEgc3BhcnNlIHRyZWUgb2YgY2hpbGRyZW4gbmVlZGluZ1xuICAvLyBkaXNjb25uZWN0aW9uXG4gIGZvciAobGV0IHBhcmVudDsgKHBhcmVudCA9IG9iai5fJHBhcmVudCk7IG9iaiA9IHBhcmVudCkge1xuICAgIGxldCBjaGlsZHJlbiA9IHBhcmVudC5fJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW47XG4gICAgaWYgKGNoaWxkcmVuID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHBhcmVudC5fJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4gPSBjaGlsZHJlbiA9IG5ldyBTZXQoKTtcbiAgICB9IGVsc2UgaWYgKGNoaWxkcmVuLmhhcyhvYmopKSB7XG4gICAgICAvLyBPbmNlIHdlJ3ZlIHJlYWNoZWQgYSBwYXJlbnQgdGhhdCBhbHJlYWR5IGNvbnRhaW5zIHRoaXMgY2hpbGQsIHdlXG4gICAgICAvLyBjYW4gc2hvcnQtY2lyY3VpdFxuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNoaWxkcmVuLmFkZChvYmopO1xuICAgIGluc3RhbGxEaXNjb25uZWN0QVBJKHBhcmVudCk7XG4gIH1cbn07XG5cbi8qKlxuICogQ2hhbmdlcyB0aGUgcGFyZW50IHJlZmVyZW5jZSBvZiB0aGUgQ2hpbGRQYXJ0LCBhbmQgdXBkYXRlcyB0aGUgc3BhcnNlIHRyZWUgb2ZcbiAqIERpc2Nvbm5lY3RhYmxlIGNoaWxkcmVuIGFjY29yZGluZ2x5LlxuICpcbiAqIE5vdGUsIHRoaXMgbWV0aG9kIHdpbGwgYmUgcGF0Y2hlZCBvbnRvIENoaWxkUGFydCBpbnN0YW5jZXMgYW5kIGNhbGxlZCBmcm9tXG4gKiB0aGUgY29yZSBjb2RlIHdoZW4gcGFydHMgYXJlIG1vdmVkIGJldHdlZW4gZGlmZmVyZW50IHBhcmVudHMuXG4gKi9cbmZ1bmN0aW9uIHJlcGFyZW50RGlzY29ubmVjdGFibGVzKHRoaXM6IENoaWxkUGFydCwgbmV3UGFyZW50OiBEaXNjb25uZWN0YWJsZSkge1xuICBpZiAodGhpcy5fJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4gIT09IHVuZGVmaW5lZCkge1xuICAgIHJlbW92ZURpc2Nvbm5lY3RhYmxlRnJvbVBhcmVudCh0aGlzKTtcbiAgICB0aGlzLl8kcGFyZW50ID0gbmV3UGFyZW50O1xuICAgIGFkZERpc2Nvbm5lY3RhYmxlVG9QYXJlbnQodGhpcyk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fJHBhcmVudCA9IG5ld1BhcmVudDtcbiAgfVxufVxuXG4vKipcbiAqIFNldHMgdGhlIGNvbm5lY3RlZCBzdGF0ZSBvbiBhbnkgZGlyZWN0aXZlcyBjb250YWluZWQgd2l0aGluIHRoZSBjb21taXR0ZWRcbiAqIHZhbHVlIG9mIHRoaXMgcGFydCAoaS5lLiB3aXRoaW4gYSBUZW1wbGF0ZUluc3RhbmNlIG9yIGl0ZXJhYmxlIG9mXG4gKiBDaGlsZFBhcnRzKSBhbmQgcnVucyB0aGVpciBgZGlzY29ubmVjdGVkYC9gcmVjb25uZWN0ZWRgcywgYXMgd2VsbCBhcyB3aXRoaW5cbiAqIGFueSBkaXJlY3RpdmVzIHN0b3JlZCBvbiB0aGUgQ2hpbGRQYXJ0ICh3aGVuIGB2YWx1ZU9ubHlgIGlzIGZhbHNlKS5cbiAqXG4gKiBgaXNDbGVhcmluZ1ZhbHVlYCBzaG91bGQgYmUgcGFzc2VkIGFzIGB0cnVlYCBvbiBhIHRvcC1sZXZlbCBwYXJ0IHRoYXQgaXNcbiAqIGNsZWFyaW5nIGl0c2VsZiwgYW5kIG5vdCBhcyBhIHJlc3VsdCBvZiByZWN1cnNpdmVseSBkaXNjb25uZWN0aW5nIGRpcmVjdGl2ZXNcbiAqIGFzIHBhcnQgb2YgYSBgY2xlYXJgIG9wZXJhdGlvbiBoaWdoZXIgdXAgdGhlIHRyZWUuIFRoaXMgYm90aCBlbnN1cmVzIHRoYXQgYW55XG4gKiBkaXJlY3RpdmUgb24gdGhpcyBDaGlsZFBhcnQgdGhhdCBwcm9kdWNlZCBhIHZhbHVlIHRoYXQgY2F1c2VkIHRoZSBjbGVhclxuICogb3BlcmF0aW9uIGlzIG5vdCBkaXNjb25uZWN0ZWQsIGFuZCBhbHNvIHNlcnZlcyBhcyBhIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvblxuICogdG8gYXZvaWQgbmVlZGxlc3MgYm9va2tlZXBpbmcgd2hlbiBhIHN1YnRyZWUgaXMgZ29pbmcgYXdheTsgd2hlbiBjbGVhcmluZyBhXG4gKiBzdWJ0cmVlLCBvbmx5IHRoZSB0b3AtbW9zdCBwYXJ0IG5lZWQgdG8gcmVtb3ZlIGl0c2VsZiBmcm9tIHRoZSBwYXJlbnQuXG4gKlxuICogYGZyb21QYXJ0SW5kZXhgIGlzIHBhc3NlZCBvbmx5IGluIHRoZSBjYXNlIG9mIGEgcGFydGlhbCBgX2NsZWFyYCBydW5uaW5nIGFzIGFcbiAqIHJlc3VsdCBvZiB0cnVuY2F0aW5nIGFuIGl0ZXJhYmxlLlxuICpcbiAqIE5vdGUsIHRoaXMgbWV0aG9kIHdpbGwgYmUgcGF0Y2hlZCBvbnRvIENoaWxkUGFydCBpbnN0YW5jZXMgYW5kIGNhbGxlZCBmcm9tIHRoZVxuICogY29yZSBjb2RlIHdoZW4gcGFydHMgYXJlIGNsZWFyZWQgb3IgdGhlIGNvbm5lY3Rpb24gc3RhdGUgaXMgY2hhbmdlZCBieSB0aGVcbiAqIHVzZXIuXG4gKi9cbmZ1bmN0aW9uIG5vdGlmeUNoaWxkUGFydENvbm5lY3RlZENoYW5nZWQoXG4gIHRoaXM6IENoaWxkUGFydCxcbiAgaXNDb25uZWN0ZWQ6IGJvb2xlYW4sXG4gIGlzQ2xlYXJpbmdWYWx1ZSA9IGZhbHNlLFxuICBmcm9tUGFydEluZGV4ID0gMFxuKSB7XG4gIGNvbnN0IHZhbHVlID0gdGhpcy5fJGNvbW1pdHRlZFZhbHVlO1xuICBjb25zdCBjaGlsZHJlbiA9IHRoaXMuXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuO1xuICBpZiAoY2hpbGRyZW4gPT09IHVuZGVmaW5lZCB8fCBjaGlsZHJlbi5zaXplID09PSAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChpc0NsZWFyaW5nVmFsdWUpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIC8vIEl0ZXJhYmxlIGNhc2U6IEFueSBDaGlsZFBhcnRzIGNyZWF0ZWQgYnkgdGhlIGl0ZXJhYmxlIHNob3VsZCBiZVxuICAgICAgLy8gZGlzY29ubmVjdGVkIGFuZCByZW1vdmVkIGZyb20gdGhpcyBDaGlsZFBhcnQncyBkaXNjb25uZWN0YWJsZVxuICAgICAgLy8gY2hpbGRyZW4gKHN0YXJ0aW5nIGF0IGBmcm9tUGFydEluZGV4YCBpbiB0aGUgY2FzZSBvZiB0cnVuY2F0aW9uKVxuICAgICAgZm9yIChsZXQgaSA9IGZyb21QYXJ0SW5kZXg7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICBub3RpZnlDaGlsZHJlbkNvbm5lY3RlZENoYW5nZWQodmFsdWVbaV0sIGZhbHNlKTtcbiAgICAgICAgcmVtb3ZlRGlzY29ubmVjdGFibGVGcm9tUGFyZW50KHZhbHVlW2ldKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgIC8vIFRlbXBsYXRlSW5zdGFuY2UgY2FzZTogSWYgdGhlIHZhbHVlIGhhcyBkaXNjb25uZWN0YWJsZSBjaGlsZHJlbiAod2lsbFxuICAgICAgLy8gb25seSBiZSBpbiB0aGUgY2FzZSB0aGF0IGl0IGlzIGEgVGVtcGxhdGVJbnN0YW5jZSksIHdlIGRpc2Nvbm5lY3QgaXRcbiAgICAgIC8vIGFuZCByZW1vdmUgaXQgZnJvbSB0aGlzIENoaWxkUGFydCdzIGRpc2Nvbm5lY3RhYmxlIGNoaWxkcmVuXG4gICAgICBub3RpZnlDaGlsZHJlbkNvbm5lY3RlZENoYW5nZWQodmFsdWUgYXMgRGlzY29ubmVjdGFibGUsIGZhbHNlKTtcbiAgICAgIHJlbW92ZURpc2Nvbm5lY3RhYmxlRnJvbVBhcmVudCh2YWx1ZSBhcyBEaXNjb25uZWN0YWJsZSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG5vdGlmeUNoaWxkcmVuQ29ubmVjdGVkQ2hhbmdlZCh0aGlzLCBpc0Nvbm5lY3RlZCk7XG4gIH1cbn1cblxuLyoqXG4gKiBQYXRjaGVzIGRpc2Nvbm5lY3Rpb24gQVBJIG9udG8gQ2hpbGRQYXJ0cy5cbiAqL1xuY29uc3QgaW5zdGFsbERpc2Nvbm5lY3RBUEkgPSAob2JqOiBEaXNjb25uZWN0YWJsZSkgPT4ge1xuICBpZiAoKG9iaiBhcyBDaGlsZFBhcnQpLnR5cGUgPT0gUGFydFR5cGUuQ0hJTEQpIHtcbiAgICAob2JqIGFzIENoaWxkUGFydCkuXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZCA/Pz1cbiAgICAgIG5vdGlmeUNoaWxkUGFydENvbm5lY3RlZENoYW5nZWQ7XG4gICAgKG9iaiBhcyBDaGlsZFBhcnQpLl8kcmVwYXJlbnREaXNjb25uZWN0YWJsZXMgPz89IHJlcGFyZW50RGlzY29ubmVjdGFibGVzO1xuICB9XG59O1xuXG4vKipcbiAqIEFuIGFic3RyYWN0IGBEaXJlY3RpdmVgIGJhc2UgY2xhc3Mgd2hvc2UgYGRpc2Nvbm5lY3RlZGAgbWV0aG9kIHdpbGwgYmVcbiAqIGNhbGxlZCB3aGVuIHRoZSBwYXJ0IGNvbnRhaW5pbmcgdGhlIGRpcmVjdGl2ZSBpcyBjbGVhcmVkIGFzIGEgcmVzdWx0IG9mXG4gKiByZS1yZW5kZXJpbmcsIG9yIHdoZW4gdGhlIHVzZXIgY2FsbHMgYHBhcnQuc2V0Q29ubmVjdGVkKGZhbHNlKWAgb25cbiAqIGEgcGFydCB0aGF0IHdhcyBwcmV2aW91c2x5IHJlbmRlcmVkIGNvbnRhaW5pbmcgdGhlIGRpcmVjdGl2ZSAoYXMgaGFwcGVuc1xuICogd2hlbiBlLmcuIGEgTGl0RWxlbWVudCBkaXNjb25uZWN0cyBmcm9tIHRoZSBET00pLlxuICpcbiAqIElmIGBwYXJ0LnNldENvbm5lY3RlZCh0cnVlKWAgaXMgc3Vic2VxdWVudGx5IGNhbGxlZCBvbiBhXG4gKiBjb250YWluaW5nIHBhcnQsIHRoZSBkaXJlY3RpdmUncyBgcmVjb25uZWN0ZWRgIG1ldGhvZCB3aWxsIGJlIGNhbGxlZCBwcmlvclxuICogdG8gaXRzIG5leHQgYHVwZGF0ZWAvYHJlbmRlcmAgY2FsbGJhY2tzLiBXaGVuIGltcGxlbWVudGluZyBgZGlzY29ubmVjdGVkYCxcbiAqIGByZWNvbm5lY3RlZGAgc2hvdWxkIGFsc28gYmUgaW1wbGVtZW50ZWQgdG8gYmUgY29tcGF0aWJsZSB3aXRoIHJlY29ubmVjdGlvbi5cbiAqXG4gKiBOb3RlIHRoYXQgdXBkYXRlcyBtYXkgb2NjdXIgd2hpbGUgdGhlIGRpcmVjdGl2ZSBpcyBkaXNjb25uZWN0ZWQuIEFzIHN1Y2gsXG4gKiBkaXJlY3RpdmVzIHNob3VsZCBnZW5lcmFsbHkgY2hlY2sgdGhlIGB0aGlzLmlzQ29ubmVjdGVkYCBmbGFnIGR1cmluZ1xuICogcmVuZGVyL3VwZGF0ZSB0byBkZXRlcm1pbmUgd2hldGhlciBpdCBpcyBzYWZlIHRvIHN1YnNjcmliZSB0byByZXNvdXJjZXNcbiAqIHRoYXQgbWF5IHByZXZlbnQgZ2FyYmFnZSBjb2xsZWN0aW9uLlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQXN5bmNEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICAvLyBBcyBvcHBvc2VkIHRvIG90aGVyIERpc2Nvbm5lY3RhYmxlcywgQXN5bmNEaXJlY3RpdmVzIGFsd2F5cyBnZXQgbm90aWZpZWRcbiAgLy8gd2hlbiB0aGUgUm9vdFBhcnQgY29ubmVjdGlvbiBjaGFuZ2VzLCBzbyB0aGUgcHVibGljIGBpc0Nvbm5lY3RlZGBcbiAgLy8gaXMgYSBsb2NhbGx5IHN0b3JlZCB2YXJpYWJsZSBpbml0aWFsaXplZCB2aWEgaXRzIHBhcnQncyBnZXR0ZXIgYW5kIHN5bmNlZFxuICAvLyB2aWEgYF8kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWRgLiBUaGlzIGlzIGNoZWFwZXIgdGhhbiB1c2luZ1xuICAvLyB0aGUgXyRpc0Nvbm5lY3RlZCBnZXR0ZXIsIHdoaWNoIGhhcyB0byBsb29rIGJhY2sgdXAgdGhlIHRyZWUgZWFjaCB0aW1lLlxuICAvKipcbiAgICogVGhlIGNvbm5lY3Rpb24gc3RhdGUgZm9yIHRoaXMgRGlyZWN0aXZlLlxuICAgKi9cbiAgaXNDb25uZWN0ZWQhOiBib29sZWFuO1xuXG4gIC8vIEBpbnRlcm5hbFxuICBvdmVycmlkZSBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4/OiBTZXQ8RGlzY29ubmVjdGFibGU+ID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogSW5pdGlhbGl6ZSB0aGUgcGFydCB3aXRoIGludGVybmFsIGZpZWxkc1xuICAgKiBAcGFyYW0gcGFydFxuICAgKiBAcGFyYW0gcGFyZW50XG4gICAqIEBwYXJhbSBhdHRyaWJ1dGVJbmRleFxuICAgKi9cbiAgb3ZlcnJpZGUgXyRpbml0aWFsaXplKFxuICAgIHBhcnQ6IFBhcnQsXG4gICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSxcbiAgICBhdHRyaWJ1dGVJbmRleDogbnVtYmVyIHwgdW5kZWZpbmVkXG4gICkge1xuICAgIHN1cGVyLl8kaW5pdGlhbGl6ZShwYXJ0LCBwYXJlbnQsIGF0dHJpYnV0ZUluZGV4KTtcbiAgICBhZGREaXNjb25uZWN0YWJsZVRvUGFyZW50KHRoaXMpO1xuICAgIHRoaXMuaXNDb25uZWN0ZWQgPSBwYXJ0Ll8kaXNDb25uZWN0ZWQ7XG4gIH1cbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgLyoqXG4gICAqIENhbGxlZCBmcm9tIHRoZSBjb3JlIGNvZGUgd2hlbiBhIGRpcmVjdGl2ZSBpcyBnb2luZyBhd2F5IGZyb20gYSBwYXJ0IChpblxuICAgKiB3aGljaCBjYXNlIGBzaG91bGRSZW1vdmVGcm9tUGFyZW50YCBzaG91bGQgYmUgdHJ1ZSksIGFuZCBmcm9tIHRoZVxuICAgKiBgc2V0Q2hpbGRyZW5Db25uZWN0ZWRgIGhlbHBlciBmdW5jdGlvbiB3aGVuIHJlY3Vyc2l2ZWx5IGNoYW5naW5nIHRoZVxuICAgKiBjb25uZWN0aW9uIHN0YXRlIG9mIGEgdHJlZSAoaW4gd2hpY2ggY2FzZSBgc2hvdWxkUmVtb3ZlRnJvbVBhcmVudGAgc2hvdWxkXG4gICAqIGJlIGZhbHNlKS5cbiAgICpcbiAgICogQHBhcmFtIGlzQ29ubmVjdGVkXG4gICAqIEBwYXJhbSBpc0NsZWFyaW5nRGlyZWN0aXZlIC0gVHJ1ZSB3aGVuIHRoZSBkaXJlY3RpdmUgaXRzZWxmIGlzIGJlaW5nXG4gICAqICAgICByZW1vdmVkOyBmYWxzZSB3aGVuIHRoZSB0cmVlIGlzIGJlaW5nIGRpc2Nvbm5lY3RlZFxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIG92ZXJyaWRlIFsnXyRub3RpZnlEaXJlY3RpdmVDb25uZWN0aW9uQ2hhbmdlZCddKFxuICAgIGlzQ29ubmVjdGVkOiBib29sZWFuLFxuICAgIGlzQ2xlYXJpbmdEaXJlY3RpdmUgPSB0cnVlXG4gICkge1xuICAgIGlmIChpc0Nvbm5lY3RlZCAhPT0gdGhpcy5pc0Nvbm5lY3RlZCkge1xuICAgICAgdGhpcy5pc0Nvbm5lY3RlZCA9IGlzQ29ubmVjdGVkO1xuICAgICAgaWYgKGlzQ29ubmVjdGVkKSB7XG4gICAgICAgIHRoaXMucmVjb25uZWN0ZWQ/LigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5kaXNjb25uZWN0ZWQ/LigpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXNDbGVhcmluZ0RpcmVjdGl2ZSkge1xuICAgICAgbm90aWZ5Q2hpbGRyZW5Db25uZWN0ZWRDaGFuZ2VkKHRoaXMsIGlzQ29ubmVjdGVkKTtcbiAgICAgIHJlbW92ZURpc2Nvbm5lY3RhYmxlRnJvbVBhcmVudCh0aGlzKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgdmFsdWUgb2YgdGhlIGRpcmVjdGl2ZSdzIFBhcnQgb3V0c2lkZSB0aGUgbm9ybWFsIGB1cGRhdGVgL2ByZW5kZXJgXG4gICAqIGxpZmVjeWNsZSBvZiBhIGRpcmVjdGl2ZS5cbiAgICpcbiAgICogVGhpcyBtZXRob2Qgc2hvdWxkIG5vdCBiZSBjYWxsZWQgc3luY2hyb25vdXNseSBmcm9tIGEgZGlyZWN0aXZlJ3MgYHVwZGF0ZWBcbiAgICogb3IgYHJlbmRlcmAuXG4gICAqXG4gICAqIEBwYXJhbSBkaXJlY3RpdmUgVGhlIGRpcmVjdGl2ZSB0byB1cGRhdGVcbiAgICogQHBhcmFtIHZhbHVlIFRoZSB2YWx1ZSB0byBzZXRcbiAgICovXG4gIHNldFZhbHVlKHZhbHVlOiB1bmtub3duKSB7XG4gICAgaWYgKGlzU2luZ2xlRXhwcmVzc2lvbih0aGlzLl9fcGFydCBhcyB1bmtub3duIGFzIFBhcnRJbmZvKSkge1xuICAgICAgdGhpcy5fX3BhcnQuXyRzZXRWYWx1ZSh2YWx1ZSwgdGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHRoaXMuX19hdHRyaWJ1dGVJbmRleCB3aWxsIGJlIGRlZmluZWQgaW4gdGhpcyBjYXNlLCBidXRcbiAgICAgIC8vIGFzc2VydCBpdCBpbiBkZXYgbW9kZVxuICAgICAgaWYgKERFVl9NT0RFICYmIHRoaXMuX19hdHRyaWJ1dGVJbmRleCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgdGhpcy5fX2F0dHJpYnV0ZUluZGV4IHRvIGJlIGEgbnVtYmVyYCk7XG4gICAgICB9XG4gICAgICBjb25zdCBuZXdWYWx1ZXMgPSBbLi4uKHRoaXMuX19wYXJ0Ll8kY29tbWl0dGVkVmFsdWUgYXMgQXJyYXk8dW5rbm93bj4pXTtcbiAgICAgIG5ld1ZhbHVlc1t0aGlzLl9fYXR0cmlidXRlSW5kZXghXSA9IHZhbHVlO1xuICAgICAgKHRoaXMuX19wYXJ0IGFzIEF0dHJpYnV0ZVBhcnQpLl8kc2V0VmFsdWUobmV3VmFsdWVzLCB0aGlzLCAwKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVXNlciBjYWxsYmFja3MgZm9yIGltcGxlbWVudGluZyBsb2dpYyB0byByZWxlYXNlIGFueSByZXNvdXJjZXMvc3Vic2NyaXB0aW9uc1xuICAgKiB0aGF0IG1heSBoYXZlIGJlZW4gcmV0YWluZWQgYnkgdGhpcyBkaXJlY3RpdmUuIFNpbmNlIGRpcmVjdGl2ZXMgbWF5IGFsc28gYmVcbiAgICogcmUtY29ubmVjdGVkLCBgcmVjb25uZWN0ZWRgIHNob3VsZCBhbHNvIGJlIGltcGxlbWVudGVkIHRvIHJlc3RvcmUgdGhlXG4gICAqIHdvcmtpbmcgc3RhdGUgb2YgdGhlIGRpcmVjdGl2ZSBwcmlvciB0byB0aGUgbmV4dCByZW5kZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgZGlzY29ubmVjdGVkKCkge31cbiAgcHJvdGVjdGVkIHJlY29ubmVjdGVkKCkge31cbn1cbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIxIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG4vLyBOb3RlLCB0aGlzIG1vZHVsZSBpcyBub3QgaW5jbHVkZWQgaW4gcGFja2FnZSBleHBvcnRzIHNvIHRoYXQgaXQncyBwcml2YXRlIHRvXG4vLyBvdXIgZmlyc3QtcGFydHkgZGlyZWN0aXZlcy4gSWYgaXQgZW5kcyB1cCBiZWluZyB1c2VmdWwsIHdlIGNhbiBvcGVuIGl0IHVwIGFuZFxuLy8gZXhwb3J0IGl0LlxuXG4vKipcbiAqIEhlbHBlciB0byBpdGVyYXRlIGFuIEFzeW5jSXRlcmFibGUgaW4gaXRzIG93biBjbG9zdXJlLlxuICogQHBhcmFtIGl0ZXJhYmxlIFRoZSBpdGVyYWJsZSB0byBpdGVyYXRlXG4gKiBAcGFyYW0gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIHRvIGNhbGwgZm9yIGVhY2ggdmFsdWUuIElmIHRoZSBjYWxsYmFjayByZXR1cm5zXG4gKiBgZmFsc2VgLCB0aGUgbG9vcCB3aWxsIGJlIGJyb2tlbi5cbiAqL1xuZXhwb3J0IGNvbnN0IGZvckF3YWl0T2YgPSBhc3luYyA8VD4oXG4gIGl0ZXJhYmxlOiBBc3luY0l0ZXJhYmxlPFQ+LFxuICBjYWxsYmFjazogKHZhbHVlOiBUKSA9PiBQcm9taXNlPGJvb2xlYW4+XG4pID0+IHtcbiAgZm9yIGF3YWl0IChjb25zdCB2IG9mIGl0ZXJhYmxlKSB7XG4gICAgaWYgKChhd2FpdCBjYWxsYmFjayh2KSkgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIEhvbGRzIGEgcmVmZXJlbmNlIHRvIGFuIGluc3RhbmNlIHRoYXQgY2FuIGJlIGRpc2Nvbm5lY3RlZCBhbmQgcmVjb25uZWN0ZWQsXG4gKiBzbyB0aGF0IGEgY2xvc3VyZSBvdmVyIHRoZSByZWYgKGUuZy4gaW4gYSB0aGVuIGZ1bmN0aW9uIHRvIGEgcHJvbWlzZSkgZG9lc1xuICogbm90IHN0cm9uZ2x5IGhvbGQgYSByZWYgdG8gdGhlIGluc3RhbmNlLiBBcHByb3hpbWF0ZXMgYSBXZWFrUmVmIGJ1dCBtdXN0XG4gKiBiZSBtYW51YWxseSBjb25uZWN0ZWQgJiBkaXNjb25uZWN0ZWQgdG8gdGhlIGJhY2tpbmcgaW5zdGFuY2UuXG4gKi9cbmV4cG9ydCBjbGFzcyBQc2V1ZG9XZWFrUmVmPFQ+IHtcbiAgcHJpdmF0ZSBfcmVmPzogVDtcbiAgY29uc3RydWN0b3IocmVmOiBUKSB7XG4gICAgdGhpcy5fcmVmID0gcmVmO1xuICB9XG4gIC8qKlxuICAgKiBEaXNhc3NvY2lhdGVzIHRoZSByZWYgd2l0aCB0aGUgYmFja2luZyBpbnN0YW5jZS5cbiAgICovXG4gIGRpc2Nvbm5lY3QoKSB7XG4gICAgdGhpcy5fcmVmID0gdW5kZWZpbmVkO1xuICB9XG4gIC8qKlxuICAgKiBSZWFzc29jaWF0ZXMgdGhlIHJlZiB3aXRoIHRoZSBiYWNraW5nIGluc3RhbmNlLlxuICAgKi9cbiAgcmVjb25uZWN0KHJlZjogVCkge1xuICAgIHRoaXMuX3JlZiA9IHJlZjtcbiAgfVxuICAvKipcbiAgICogUmV0cmlldmVzIHRoZSBiYWNraW5nIGluc3RhbmNlICh3aWxsIGJlIHVuZGVmaW5lZCB3aGVuIGRpc2Nvbm5lY3RlZClcbiAgICovXG4gIGRlcmVmKCkge1xuICAgIHJldHVybiB0aGlzLl9yZWY7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGhlbHBlciB0byBwYXVzZSBhbmQgcmVzdW1lIHdhaXRpbmcgb24gYSBjb25kaXRpb24gaW4gYW4gYXN5bmMgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IGNsYXNzIFBhdXNlciB7XG4gIHByaXZhdGUgX3Byb21pc2U/OiBQcm9taXNlPHZvaWQ+ID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIF9yZXNvbHZlPzogKCkgPT4gdm9pZCA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIFdoZW4gcGF1c2VkLCByZXR1cm5zIGEgcHJvbWlzZSB0byBiZSBhd2FpdGVkOyB3aGVuIHVucGF1c2VkLCByZXR1cm5zXG4gICAqIHVuZGVmaW5lZC4gTm90ZSB0aGF0IGluIHRoZSBtaWNyb3Rhc2sgYmV0d2VlbiB0aGUgcGF1c2VyIGJlaW5nIHJlc3VtZWRcbiAgICogYW4gYW4gYXdhaXQgb2YgdGhpcyBwcm9taXNlIHJlc29sdmluZywgdGhlIHBhdXNlciBjb3VsZCBiZSBwYXVzZWQgYWdhaW4sXG4gICAqIGhlbmNlIGNhbGxlcnMgc2hvdWxkIGNoZWNrIHRoZSBwcm9taXNlIGluIGEgbG9vcCB3aGVuIGF3YWl0aW5nLlxuICAgKiBAcmV0dXJucyBBIHByb21pc2UgdG8gYmUgYXdhaXRlZCB3aGVuIHBhdXNlZCBvciB1bmRlZmluZWRcbiAgICovXG4gIGdldCgpIHtcbiAgICByZXR1cm4gdGhpcy5fcHJvbWlzZTtcbiAgfVxuICAvKipcbiAgICogQ3JlYXRlcyBhIHByb21pc2UgdG8gYmUgYXdhaXRlZFxuICAgKi9cbiAgcGF1c2UoKSB7XG4gICAgdGhpcy5fcHJvbWlzZSA/Pz0gbmV3IFByb21pc2UoKHJlc29sdmUpID0+ICh0aGlzLl9yZXNvbHZlID0gcmVzb2x2ZSkpO1xuICB9XG4gIC8qKlxuICAgKiBSZXNvbHZlcyB0aGUgcHJvbWlzZSB3aGljaCBtYXkgYmUgYXdhaXRlZFxuICAgKi9cbiAgcmVzdW1lKCkge1xuICAgIHRoaXMuX3Jlc29sdmU/LigpO1xuICAgIHRoaXMuX3Byb21pc2UgPSB0aGlzLl9yZXNvbHZlID0gdW5kZWZpbmVkO1xuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtDaGlsZFBhcnQsIG5vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgRGlyZWN0aXZlUGFyYW1ldGVyc30gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7QXN5bmNEaXJlY3RpdmV9IGZyb20gJy4uL2FzeW5jLWRpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge1BhdXNlciwgUHNldWRvV2Vha1JlZiwgZm9yQXdhaXRPZn0gZnJvbSAnLi9wcml2YXRlLWFzeW5jLWhlbHBlcnMuanMnO1xuXG50eXBlIE1hcHBlcjxUPiA9ICh2OiBULCBpbmRleD86IG51bWJlcikgPT4gdW5rbm93bjtcblxuZXhwb3J0IGNsYXNzIEFzeW5jUmVwbGFjZURpcmVjdGl2ZSBleHRlbmRzIEFzeW5jRGlyZWN0aXZlIHtcbiAgcHJpdmF0ZSBfX3ZhbHVlPzogQXN5bmNJdGVyYWJsZTx1bmtub3duPjtcbiAgcHJpdmF0ZSBfX3dlYWtUaGlzID0gbmV3IFBzZXVkb1dlYWtSZWYodGhpcyk7XG4gIHByaXZhdGUgX19wYXVzZXIgPSBuZXcgUGF1c2VyKCk7XG5cbiAgLy8gQHRzLWV4cGVjdC1lcnJvciB2YWx1ZSBub3QgdXNlZCwgYnV0IHdlIHdhbnQgYSBuaWNlIHBhcmFtZXRlciBmb3IgZG9jc1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gIHJlbmRlcjxUPih2YWx1ZTogQXN5bmNJdGVyYWJsZTxUPiwgX21hcHBlcj86IE1hcHBlcjxUPikge1xuICAgIHJldHVybiBub0NoYW5nZTtcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShcbiAgICBfcGFydDogQ2hpbGRQYXJ0LFxuICAgIFt2YWx1ZSwgbWFwcGVyXTogRGlyZWN0aXZlUGFyYW1ldGVyczx0aGlzPlxuICApIHtcbiAgICAvLyBJZiBvdXIgaW5pdGlhbCByZW5kZXIgb2NjdXJzIHdoaWxlIGRpc2Nvbm5lY3RlZCwgZW5zdXJlIHRoYXQgdGhlIHBhdXNlclxuICAgIC8vIGFuZCB3ZWFrVGhpcyBhcmUgaW4gdGhlIGRpc2Nvbm5lY3RlZCBzdGF0ZVxuICAgIGlmICghdGhpcy5pc0Nvbm5lY3RlZCkge1xuICAgICAgdGhpcy5kaXNjb25uZWN0ZWQoKTtcbiAgICB9XG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBzZXQgdXAgdGhpcyBwYXJ0aWN1bGFyIGl0ZXJhYmxlLCB3ZSBkb24ndCBuZWVkXG4gICAgLy8gdG8gZG8gYW55dGhpbmcuXG4gICAgaWYgKHZhbHVlID09PSB0aGlzLl9fdmFsdWUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fX3ZhbHVlID0gdmFsdWU7XG4gICAgbGV0IGkgPSAwO1xuICAgIGNvbnN0IHtfX3dlYWtUaGlzOiB3ZWFrVGhpcywgX19wYXVzZXI6IHBhdXNlcn0gPSB0aGlzO1xuICAgIC8vIE5vdGUsIHRoZSBjYWxsYmFjayBhdm9pZHMgY2xvc2luZyBvdmVyIGB0aGlzYCBzbyB0aGF0IHRoZSBkaXJlY3RpdmVcbiAgICAvLyBjYW4gYmUgZ2MnZWQgYmVmb3JlIHRoZSBwcm9taXNlIHJlc29sdmVzOyBpbnN0ZWFkIGB0aGlzYCBpcyByZXRyaWV2ZWRcbiAgICAvLyBmcm9tIGB3ZWFrVGhpc2AsIHdoaWNoIGNhbiBicmVhayB0aGUgaGFyZCByZWZlcmVuY2UgaW4gdGhlIGNsb3N1cmUgd2hlblxuICAgIC8vIHRoZSBkaXJlY3RpdmUgZGlzY29ubmVjdHNcbiAgICBmb3JBd2FpdE9mKHZhbHVlLCBhc3luYyAodjogdW5rbm93bikgPT4ge1xuICAgICAgLy8gVGhlIHdoaWxlIGxvb3AgaGVyZSBoYW5kbGVzIHRoZSBjYXNlIHRoYXQgdGhlIGNvbm5lY3Rpb24gc3RhdGVcbiAgICAgIC8vIHRocmFzaGVzLCBjYXVzaW5nIHRoZSBwYXVzZXIgdG8gcmVzdW1lIGFuZCB0aGVuIGdldCByZS1wYXVzZWRcbiAgICAgIHdoaWxlIChwYXVzZXIuZ2V0KCkpIHtcbiAgICAgICAgYXdhaXQgcGF1c2VyLmdldCgpO1xuICAgICAgfVxuICAgICAgLy8gSWYgdGhlIGNhbGxiYWNrIGdldHMgaGVyZSBhbmQgdGhlcmUgaXMgbm8gYHRoaXNgLCBpdCBtZWFucyB0aGF0IHRoZVxuICAgICAgLy8gZGlyZWN0aXZlIGhhcyBiZWVuIGRpc2Nvbm5lY3RlZCBhbmQgZ2FyYmFnZSBjb2xsZWN0ZWQgYW5kIHdlIGRvbid0XG4gICAgICAvLyBuZWVkIHRvIGRvIGFueXRoaW5nIGVsc2VcbiAgICAgIGNvbnN0IF90aGlzID0gd2Vha1RoaXMuZGVyZWYoKTtcbiAgICAgIGlmIChfdGhpcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIENoZWNrIHRvIG1ha2Ugc3VyZSB0aGF0IHZhbHVlIGlzIHRoZSBzdGlsbCB0aGUgY3VycmVudCB2YWx1ZSBvZlxuICAgICAgICAvLyB0aGUgcGFydCwgYW5kIGlmIG5vdCBiYWlsIGJlY2F1c2UgYSBuZXcgdmFsdWUgb3ducyB0aGlzIHBhcnRcbiAgICAgICAgaWYgKF90aGlzLl9fdmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXMgYSBjb252ZW5pZW5jZSwgYmVjYXVzZSBmdW5jdGlvbmFsLXByb2dyYW1taW5nLXN0eWxlXG4gICAgICAgIC8vIHRyYW5zZm9ybXMgb2YgaXRlcmFibGVzIGFuZCBhc3luYyBpdGVyYWJsZXMgcmVxdWlyZXMgYSBsaWJyYXJ5LFxuICAgICAgICAvLyB3ZSBhY2NlcHQgYSBtYXBwZXIgZnVuY3Rpb24uIFRoaXMgaXMgZXNwZWNpYWxseSBjb252ZW5pZW50IGZvclxuICAgICAgICAvLyByZW5kZXJpbmcgYSB0ZW1wbGF0ZSBmb3IgZWFjaCBpdGVtLlxuICAgICAgICBpZiAobWFwcGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB2ID0gbWFwcGVyKHYsIGkpO1xuICAgICAgICB9XG5cbiAgICAgICAgX3RoaXMuY29tbWl0VmFsdWUodiwgaSk7XG4gICAgICAgIGkrKztcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIHJldHVybiBub0NoYW5nZTtcbiAgfVxuXG4gIC8vIE92ZXJyaWRlIHBvaW50IGZvciBBc3luY0FwcGVuZCB0byBhcHBlbmQgcmF0aGVyIHRoYW4gcmVwbGFjZVxuICBwcm90ZWN0ZWQgY29tbWl0VmFsdWUodmFsdWU6IHVua25vd24sIF9pbmRleDogbnVtYmVyKSB7XG4gICAgdGhpcy5zZXRWYWx1ZSh2YWx1ZSk7XG4gIH1cblxuICBvdmVycmlkZSBkaXNjb25uZWN0ZWQoKSB7XG4gICAgdGhpcy5fX3dlYWtUaGlzLmRpc2Nvbm5lY3QoKTtcbiAgICB0aGlzLl9fcGF1c2VyLnBhdXNlKCk7XG4gIH1cblxuICBvdmVycmlkZSByZWNvbm5lY3RlZCgpIHtcbiAgICB0aGlzLl9fd2Vha1RoaXMucmVjb25uZWN0KHRoaXMpO1xuICAgIHRoaXMuX19wYXVzZXIucmVzdW1lKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGRpcmVjdGl2ZSB0aGF0IHJlbmRlcnMgdGhlIGl0ZW1zIG9mIGFuIGFzeW5jIGl0ZXJhYmxlWzFdLCByZXBsYWNpbmdcbiAqIHByZXZpb3VzIHZhbHVlcyB3aXRoIG5ldyB2YWx1ZXMsIHNvIHRoYXQgb25seSBvbmUgdmFsdWUgaXMgZXZlciByZW5kZXJlZFxuICogYXQgYSB0aW1lLiBUaGlzIGRpcmVjdGl2ZSBtYXkgYmUgdXNlZCBpbiBhbnkgZXhwcmVzc2lvbiB0eXBlLlxuICpcbiAqIEFzeW5jIGl0ZXJhYmxlcyBhcmUgb2JqZWN0cyB3aXRoIGEgYFtTeW1ib2wuYXN5bmNJdGVyYXRvcl1gIG1ldGhvZCwgd2hpY2hcbiAqIHJldHVybnMgYW4gaXRlcmF0b3Igd2hvJ3MgYG5leHQoKWAgbWV0aG9kIHJldHVybnMgYSBQcm9taXNlLiBXaGVuIGEgbmV3XG4gKiB2YWx1ZSBpcyBhdmFpbGFibGUsIHRoZSBQcm9taXNlIHJlc29sdmVzIGFuZCB0aGUgdmFsdWUgaXMgcmVuZGVyZWQgdG8gdGhlXG4gKiBQYXJ0IGNvbnRyb2xsZWQgYnkgdGhlIGRpcmVjdGl2ZS4gSWYgYW5vdGhlciB2YWx1ZSBvdGhlciB0aGFuIHRoaXNcbiAqIGRpcmVjdGl2ZSBoYXMgYmVlbiBzZXQgb24gdGhlIFBhcnQsIHRoZSBpdGVyYWJsZSB3aWxsIG5vIGxvbmdlciBiZSBsaXN0ZW5lZFxuICogdG8gYW5kIG5ldyB2YWx1ZXMgd29uJ3QgYmUgd3JpdHRlbiB0byB0aGUgUGFydC5cbiAqXG4gKiBbMV06IGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL1N0YXRlbWVudHMvZm9yLWF3YWl0Li4ub2ZcbiAqXG4gKiBAcGFyYW0gdmFsdWUgQW4gYXN5bmMgaXRlcmFibGVcbiAqIEBwYXJhbSBtYXBwZXIgQW4gb3B0aW9uYWwgZnVuY3Rpb24gdGhhdCBtYXBzIGZyb20gKHZhbHVlLCBpbmRleCkgdG8gYW5vdGhlclxuICogICAgIHZhbHVlLiBVc2VmdWwgZm9yIGdlbmVyYXRpbmcgdGVtcGxhdGVzIGZvciBlYWNoIGl0ZW0gaW4gdGhlIGl0ZXJhYmxlLlxuICovXG5leHBvcnQgY29uc3QgYXN5bmNSZXBsYWNlID0gZGlyZWN0aXZlKEFzeW5jUmVwbGFjZURpcmVjdGl2ZSk7XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtDaGlsZFBhcnR9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7XG4gIGRpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbiAgUGFydEluZm8sXG4gIFBhcnRUeXBlLFxufSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtBc3luY1JlcGxhY2VEaXJlY3RpdmV9IGZyb20gJy4vYXN5bmMtcmVwbGFjZS5qcyc7XG5pbXBvcnQge1xuICBjbGVhclBhcnQsXG4gIGluc2VydFBhcnQsXG4gIHNldENoaWxkUGFydFZhbHVlLFxufSBmcm9tICcuLi9kaXJlY3RpdmUtaGVscGVycy5qcyc7XG5cbmNsYXNzIEFzeW5jQXBwZW5kRGlyZWN0aXZlIGV4dGVuZHMgQXN5bmNSZXBsYWNlRGlyZWN0aXZlIHtcbiAgcHJpdmF0ZSBfX2NoaWxkUGFydCE6IENoaWxkUGFydDtcblxuICAvLyBPdmVycmlkZSBBc3luY1JlcGxhY2UgdG8gbmFycm93IHRoZSBhbGxvd2VkIHBhcnQgdHlwZSB0byBDaGlsZFBhcnQgb25seVxuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gICAgaWYgKHBhcnRJbmZvLnR5cGUgIT09IFBhcnRUeXBlLkNISUxEKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FzeW5jQXBwZW5kIGNhbiBvbmx5IGJlIHVzZWQgaW4gY2hpbGQgZXhwcmVzc2lvbnMnKTtcbiAgICB9XG4gIH1cblxuICAvLyBPdmVycmlkZSBBc3luY1JlcGxhY2UgdG8gc2F2ZSB0aGUgcGFydCBzaW5jZSB3ZSBuZWVkIHRvIGFwcGVuZCBpbnRvIGl0XG4gIG92ZXJyaWRlIHVwZGF0ZShwYXJ0OiBDaGlsZFBhcnQsIHBhcmFtczogRGlyZWN0aXZlUGFyYW1ldGVyczx0aGlzPikge1xuICAgIHRoaXMuX19jaGlsZFBhcnQgPSBwYXJ0O1xuICAgIHJldHVybiBzdXBlci51cGRhdGUocGFydCwgcGFyYW1zKTtcbiAgfVxuXG4gIC8vIE92ZXJyaWRlIEFzeW5jUmVwbGFjZSB0byBhcHBlbmQgcmF0aGVyIHRoYW4gcmVwbGFjZVxuICBwcm90ZWN0ZWQgb3ZlcnJpZGUgY29tbWl0VmFsdWUodmFsdWU6IHVua25vd24sIGluZGV4OiBudW1iZXIpIHtcbiAgICAvLyBXaGVuIHdlIGdldCB0aGUgZmlyc3QgdmFsdWUsIGNsZWFyIHRoZSBwYXJ0LiBUaGlzIGxldHMgdGhlXG4gICAgLy8gcHJldmlvdXMgdmFsdWUgZGlzcGxheSB1bnRpbCB3ZSBjYW4gcmVwbGFjZSBpdC5cbiAgICBpZiAoaW5kZXggPT09IDApIHtcbiAgICAgIGNsZWFyUGFydCh0aGlzLl9fY2hpbGRQYXJ0KTtcbiAgICB9XG4gICAgLy8gQ3JlYXRlIGFuZCBpbnNlcnQgYSBuZXcgcGFydCBhbmQgc2V0IGl0cyB2YWx1ZSB0byB0aGUgbmV4dCB2YWx1ZVxuICAgIGNvbnN0IG5ld1BhcnQgPSBpbnNlcnRQYXJ0KHRoaXMuX19jaGlsZFBhcnQpO1xuICAgIHNldENoaWxkUGFydFZhbHVlKG5ld1BhcnQsIHZhbHVlKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgZGlyZWN0aXZlIHRoYXQgcmVuZGVycyB0aGUgaXRlbXMgb2YgYW4gYXN5bmMgaXRlcmFibGVbMV0sIGFwcGVuZGluZyBuZXdcbiAqIHZhbHVlcyBhZnRlciBwcmV2aW91cyB2YWx1ZXMsIHNpbWlsYXIgdG8gdGhlIGJ1aWx0LWluIHN1cHBvcnQgZm9yIGl0ZXJhYmxlcy5cbiAqIFRoaXMgZGlyZWN0aXZlIGlzIHVzYWJsZSBvbmx5IGluIGNoaWxkIGV4cHJlc3Npb25zLlxuICpcbiAqIEFzeW5jIGl0ZXJhYmxlcyBhcmUgb2JqZWN0cyB3aXRoIGEgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSBtZXRob2QsIHdoaWNoXG4gKiByZXR1cm5zIGFuIGl0ZXJhdG9yIHdobydzIGBuZXh0KClgIG1ldGhvZCByZXR1cm5zIGEgUHJvbWlzZS4gV2hlbiBhIG5ld1xuICogdmFsdWUgaXMgYXZhaWxhYmxlLCB0aGUgUHJvbWlzZSByZXNvbHZlcyBhbmQgdGhlIHZhbHVlIGlzIGFwcGVuZGVkIHRvIHRoZVxuICogUGFydCBjb250cm9sbGVkIGJ5IHRoZSBkaXJlY3RpdmUuIElmIGFub3RoZXIgdmFsdWUgb3RoZXIgdGhhbiB0aGlzXG4gKiBkaXJlY3RpdmUgaGFzIGJlZW4gc2V0IG9uIHRoZSBQYXJ0LCB0aGUgaXRlcmFibGUgd2lsbCBubyBsb25nZXIgYmUgbGlzdGVuZWRcbiAqIHRvIGFuZCBuZXcgdmFsdWVzIHdvbid0IGJlIHdyaXR0ZW4gdG8gdGhlIFBhcnQuXG4gKlxuICogWzFdOiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9TdGF0ZW1lbnRzL2Zvci1hd2FpdC4uLm9mXG4gKlxuICogQHBhcmFtIHZhbHVlIEFuIGFzeW5jIGl0ZXJhYmxlXG4gKiBAcGFyYW0gbWFwcGVyIEFuIG9wdGlvbmFsIGZ1bmN0aW9uIHRoYXQgbWFwcyBmcm9tICh2YWx1ZSwgaW5kZXgpIHRvIGFub3RoZXJcbiAqICAgICB2YWx1ZS4gVXNlZnVsIGZvciBnZW5lcmF0aW5nIHRlbXBsYXRlcyBmb3IgZWFjaCBpdGVtIGluIHRoZSBpdGVyYWJsZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGFzeW5jQXBwZW5kID0gZGlyZWN0aXZlKEFzeW5jQXBwZW5kRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtBc3luY0FwcGVuZERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtcbiAgVGVtcGxhdGVSZXN1bHQsXG4gIENoaWxkUGFydCxcbiAgUm9vdFBhcnQsXG4gIHJlbmRlcixcbiAgbm90aGluZyxcbn0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmUsXG4gIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG4gIFBhcnRJbmZvLFxufSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtcbiAgY2xlYXJQYXJ0LFxuICBnZXRDb21taXR0ZWRWYWx1ZSxcbiAgaW5zZXJ0UGFydCxcbiAgaXNUZW1wbGF0ZVJlc3VsdCxcbiAgc2V0Q29tbWl0dGVkVmFsdWUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcblxuY2xhc3MgQ2FjaGVEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBwcml2YXRlIF90ZW1wbGF0ZUNhY2hlID0gbmV3IFdlYWtNYXA8VGVtcGxhdGVTdHJpbmdzQXJyYXksIFJvb3RQYXJ0PigpO1xuICBwcml2YXRlIF92YWx1ZT86IFRlbXBsYXRlUmVzdWx0O1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgfVxuXG4gIHJlbmRlcih2OiB1bmtub3duKSB7XG4gICAgLy8gUmV0dXJuIGFuIGFycmF5IG9mIHRoZSB2YWx1ZSB0byBpbmR1Y2UgbGl0LWh0bWwgdG8gY3JlYXRlIGEgQ2hpbGRQYXJ0XG4gICAgLy8gZm9yIHRoZSB2YWx1ZSB0aGF0IHdlIGNhbiBtb3ZlIGludG8gdGhlIGNhY2hlLlxuICAgIHJldHVybiBbdl07XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUoY29udGFpbmVyUGFydDogQ2hpbGRQYXJ0LCBbdl06IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICAvLyBJZiB0aGUgcHJldmlvdXMgdmFsdWUgaXMgYSBUZW1wbGF0ZVJlc3VsdCBhbmQgdGhlIG5ldyB2YWx1ZSBpcyBub3QsXG4gICAgLy8gb3IgaXMgYSBkaWZmZXJlbnQgVGVtcGxhdGUgYXMgdGhlIHByZXZpb3VzIHZhbHVlLCBtb3ZlIHRoZSBjaGlsZCBwYXJ0XG4gICAgLy8gaW50byB0aGUgY2FjaGUuXG4gICAgaWYgKFxuICAgICAgaXNUZW1wbGF0ZVJlc3VsdCh0aGlzLl92YWx1ZSkgJiZcbiAgICAgICghaXNUZW1wbGF0ZVJlc3VsdCh2KSB8fCB0aGlzLl92YWx1ZS5zdHJpbmdzICE9PSB2LnN0cmluZ3MpXG4gICAgKSB7XG4gICAgICAvLyBUaGlzIGlzIGFsd2F5cyBhbiBhcnJheSBiZWNhdXNlIHdlIHJldHVybiBbdl0gaW4gcmVuZGVyKClcbiAgICAgIGNvbnN0IHBhcnRWYWx1ZSA9IGdldENvbW1pdHRlZFZhbHVlKGNvbnRhaW5lclBhcnQpIGFzIEFycmF5PENoaWxkUGFydD47XG4gICAgICBjb25zdCBjaGlsZFBhcnQgPSBwYXJ0VmFsdWUucG9wKCkhO1xuICAgICAgbGV0IGNhY2hlZENvbnRhaW5lclBhcnQgPSB0aGlzLl90ZW1wbGF0ZUNhY2hlLmdldCh0aGlzLl92YWx1ZS5zdHJpbmdzKTtcbiAgICAgIGlmIChjYWNoZWRDb250YWluZXJQYXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3QgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIGNhY2hlZENvbnRhaW5lclBhcnQgPSByZW5kZXIobm90aGluZywgZnJhZ21lbnQpO1xuICAgICAgICBjYWNoZWRDb250YWluZXJQYXJ0LnNldENvbm5lY3RlZChmYWxzZSk7XG4gICAgICAgIHRoaXMuX3RlbXBsYXRlQ2FjaGUuc2V0KHRoaXMuX3ZhbHVlLnN0cmluZ3MsIGNhY2hlZENvbnRhaW5lclBhcnQpO1xuICAgICAgfVxuICAgICAgLy8gTW92ZSBpbnRvIGNhY2hlXG4gICAgICBzZXRDb21taXR0ZWRWYWx1ZShjYWNoZWRDb250YWluZXJQYXJ0LCBbY2hpbGRQYXJ0XSk7XG4gICAgICBpbnNlcnRQYXJ0KGNhY2hlZENvbnRhaW5lclBhcnQsIHVuZGVmaW5lZCwgY2hpbGRQYXJ0KTtcbiAgICB9XG4gICAgLy8gSWYgdGhlIG5ldyB2YWx1ZSBpcyBhIFRlbXBsYXRlUmVzdWx0IGFuZCB0aGUgcHJldmlvdXMgdmFsdWUgaXMgbm90LFxuICAgIC8vIG9yIGlzIGEgZGlmZmVyZW50IFRlbXBsYXRlIGFzIHRoZSBwcmV2aW91cyB2YWx1ZSwgcmVzdG9yZSB0aGUgY2hpbGRcbiAgICAvLyBwYXJ0IGZyb20gdGhlIGNhY2hlLlxuICAgIGlmIChpc1RlbXBsYXRlUmVzdWx0KHYpKSB7XG4gICAgICBpZiAoIWlzVGVtcGxhdGVSZXN1bHQodGhpcy5fdmFsdWUpIHx8IHRoaXMuX3ZhbHVlLnN0cmluZ3MgIT09IHYuc3RyaW5ncykge1xuICAgICAgICBjb25zdCBjYWNoZWRDb250YWluZXJQYXJ0ID0gdGhpcy5fdGVtcGxhdGVDYWNoZS5nZXQodi5zdHJpbmdzKTtcbiAgICAgICAgaWYgKGNhY2hlZENvbnRhaW5lclBhcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhY2hlZCBwYXJ0IGJhY2sgaW50byB0aGUgY29udGFpbmVyIHBhcnQgdmFsdWVcbiAgICAgICAgICBjb25zdCBwYXJ0VmFsdWUgPSBnZXRDb21taXR0ZWRWYWx1ZShcbiAgICAgICAgICAgIGNhY2hlZENvbnRhaW5lclBhcnRcbiAgICAgICAgICApIGFzIEFycmF5PENoaWxkUGFydD47XG4gICAgICAgICAgY29uc3QgY2FjaGVkUGFydCA9IHBhcnRWYWx1ZS5wb3AoKSE7XG4gICAgICAgICAgLy8gTW92ZSBjYWNoZWQgcGFydCBiYWNrIGludG8gRE9NXG4gICAgICAgICAgY2xlYXJQYXJ0KGNvbnRhaW5lclBhcnQpO1xuICAgICAgICAgIGluc2VydFBhcnQoY29udGFpbmVyUGFydCwgdW5kZWZpbmVkLCBjYWNoZWRQYXJ0KTtcbiAgICAgICAgICBzZXRDb21taXR0ZWRWYWx1ZShjb250YWluZXJQYXJ0LCBbY2FjaGVkUGFydF0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLl92YWx1ZSA9IHY7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3ZhbHVlID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZW5kZXIodik7XG4gIH1cbn1cblxuLyoqXG4gKiBFbmFibGVzIGZhc3Qgc3dpdGNoaW5nIGJldHdlZW4gbXVsdGlwbGUgdGVtcGxhdGVzIGJ5IGNhY2hpbmcgdGhlIERPTSBub2Rlc1xuICogYW5kIFRlbXBsYXRlSW5zdGFuY2VzIHByb2R1Y2VkIGJ5IHRoZSB0ZW1wbGF0ZXMuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogbGV0IGNoZWNrZWQgPSBmYWxzZTtcbiAqXG4gKiBodG1sYFxuICogICAke2NhY2hlKGNoZWNrZWQgPyBodG1sYGlucHV0IGlzIGNoZWNrZWRgIDogaHRtbGBpbnB1dCBpcyBub3QgY2hlY2tlZGApfVxuICogYFxuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBjYWNoZSA9IGRpcmVjdGl2ZShDYWNoZURpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7Q2FjaGVEaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTggR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7QXR0cmlidXRlUGFydCwgbm9DaGFuZ2V9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7XG4gIGRpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlLFxuICBEaXJlY3RpdmVQYXJhbWV0ZXJzLFxuICBQYXJ0SW5mbyxcbiAgUGFydFR5cGUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5cbi8qKlxuICogQSBrZXktdmFsdWUgc2V0IG9mIGNsYXNzIG5hbWVzIHRvIHRydXRoeSB2YWx1ZXMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2xhc3NJbmZvIHtcbiAgcmVhZG9ubHkgW25hbWU6IHN0cmluZ106IHN0cmluZyB8IGJvb2xlYW4gfCBudW1iZXI7XG59XG5cbmNsYXNzIENsYXNzTWFwRGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgLyoqXG4gICAqIFN0b3JlcyB0aGUgQ2xhc3NJbmZvIG9iamVjdCBhcHBsaWVkIHRvIGEgZ2l2ZW4gQXR0cmlidXRlUGFydC5cbiAgICogVXNlZCB0byB1bnNldCBleGlzdGluZyB2YWx1ZXMgd2hlbiBhIG5ldyBDbGFzc0luZm8gb2JqZWN0IGlzIGFwcGxpZWQuXG4gICAqL1xuICBwcml2YXRlIF9wcmV2aW91c0NsYXNzZXM/OiBTZXQ8c3RyaW5nPjtcbiAgcHJpdmF0ZSBfc3RhdGljQ2xhc3Nlcz86IFNldDxzdHJpbmc+O1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAoXG4gICAgICBwYXJ0SW5mby50eXBlICE9PSBQYXJ0VHlwZS5BVFRSSUJVVEUgfHxcbiAgICAgIHBhcnRJbmZvLm5hbWUgIT09ICdjbGFzcycgfHxcbiAgICAgIChwYXJ0SW5mby5zdHJpbmdzPy5sZW5ndGggYXMgbnVtYmVyKSA+IDJcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ2BjbGFzc01hcCgpYCBjYW4gb25seSBiZSB1c2VkIGluIHRoZSBgY2xhc3NgIGF0dHJpYnV0ZSAnICtcbiAgICAgICAgICAnYW5kIG11c3QgYmUgdGhlIG9ubHkgcGFydCBpbiB0aGUgYXR0cmlidXRlLidcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcmVuZGVyKGNsYXNzSW5mbzogQ2xhc3NJbmZvKSB7XG4gICAgLy8gQWRkIHNwYWNlcyB0byBlbnN1cmUgc2VwYXJhdGlvbiBmcm9tIHN0YXRpYyBjbGFzc2VzXG4gICAgcmV0dXJuIChcbiAgICAgICcgJyArXG4gICAgICBPYmplY3Qua2V5cyhjbGFzc0luZm8pXG4gICAgICAgIC5maWx0ZXIoKGtleSkgPT4gY2xhc3NJbmZvW2tleV0pXG4gICAgICAgIC5qb2luKCcgJykgK1xuICAgICAgJyAnXG4gICAgKTtcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShwYXJ0OiBBdHRyaWJ1dGVQYXJ0LCBbY2xhc3NJbmZvXTogRGlyZWN0aXZlUGFyYW1ldGVyczx0aGlzPikge1xuICAgIC8vIFJlbWVtYmVyIGR5bmFtaWMgY2xhc3NlcyBvbiB0aGUgZmlyc3QgcmVuZGVyXG4gICAgaWYgKHRoaXMuX3ByZXZpb3VzQ2xhc3NlcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9wcmV2aW91c0NsYXNzZXMgPSBuZXcgU2V0KCk7XG4gICAgICBpZiAocGFydC5zdHJpbmdzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fc3RhdGljQ2xhc3NlcyA9IG5ldyBTZXQoXG4gICAgICAgICAgcGFydC5zdHJpbmdzXG4gICAgICAgICAgICAuam9pbignICcpXG4gICAgICAgICAgICAuc3BsaXQoL1xccy8pXG4gICAgICAgICAgICAuZmlsdGVyKChzKSA9PiBzICE9PSAnJylcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgbmFtZSBpbiBjbGFzc0luZm8pIHtcbiAgICAgICAgaWYgKGNsYXNzSW5mb1tuYW1lXSAmJiAhdGhpcy5fc3RhdGljQ2xhc3Nlcz8uaGFzKG5hbWUpKSB7XG4gICAgICAgICAgdGhpcy5fcHJldmlvdXNDbGFzc2VzLmFkZChuYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMucmVuZGVyKGNsYXNzSW5mbyk7XG4gICAgfVxuXG4gICAgY29uc3QgY2xhc3NMaXN0ID0gcGFydC5lbGVtZW50LmNsYXNzTGlzdDtcblxuICAgIC8vIFJlbW92ZSBvbGQgY2xhc3NlcyB0aGF0IG5vIGxvbmdlciBhcHBseVxuICAgIC8vIFdlIHVzZSBmb3JFYWNoKCkgaW5zdGVhZCBvZiBmb3Itb2Ygc28gdGhhdCB3ZSBkb24ndCByZXF1aXJlIGRvd24tbGV2ZWxcbiAgICAvLyBpdGVyYXRpb24uXG4gICAgdGhpcy5fcHJldmlvdXNDbGFzc2VzLmZvckVhY2goKG5hbWUpID0+IHtcbiAgICAgIGlmICghKG5hbWUgaW4gY2xhc3NJbmZvKSkge1xuICAgICAgICBjbGFzc0xpc3QucmVtb3ZlKG5hbWUpO1xuICAgICAgICB0aGlzLl9wcmV2aW91c0NsYXNzZXMhLmRlbGV0ZShuYW1lKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIEFkZCBvciByZW1vdmUgY2xhc3NlcyBiYXNlZCBvbiB0aGVpciBjbGFzc01hcCB2YWx1ZVxuICAgIGZvciAoY29uc3QgbmFtZSBpbiBjbGFzc0luZm8pIHtcbiAgICAgIC8vIFdlIGV4cGxpY2l0bHkgd2FudCBhIGxvb3NlIHRydXRoeSBjaGVjayBvZiBgdmFsdWVgIGJlY2F1c2UgaXQgc2VlbXNcbiAgICAgIC8vIG1vcmUgY29udmVuaWVudCB0aGF0ICcnIGFuZCAwIGFyZSBza2lwcGVkLlxuICAgICAgY29uc3QgdmFsdWUgPSAhIWNsYXNzSW5mb1tuYW1lXTtcbiAgICAgIGlmIChcbiAgICAgICAgdmFsdWUgIT09IHRoaXMuX3ByZXZpb3VzQ2xhc3Nlcy5oYXMobmFtZSkgJiZcbiAgICAgICAgIXRoaXMuX3N0YXRpY0NsYXNzZXM/LmhhcyhuYW1lKVxuICAgICAgKSB7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgIGNsYXNzTGlzdC5hZGQobmFtZSk7XG4gICAgICAgICAgdGhpcy5fcHJldmlvdXNDbGFzc2VzLmFkZChuYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjbGFzc0xpc3QucmVtb3ZlKG5hbWUpO1xuICAgICAgICAgIHRoaXMuX3ByZXZpb3VzQ2xhc3Nlcy5kZWxldGUobmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG59XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCBhcHBsaWVzIGR5bmFtaWMgQ1NTIGNsYXNzZXMuXG4gKlxuICogVGhpcyBtdXN0IGJlIHVzZWQgaW4gdGhlIGBjbGFzc2AgYXR0cmlidXRlIGFuZCBtdXN0IGJlIHRoZSBvbmx5IHBhcnQgdXNlZCBpblxuICogdGhlIGF0dHJpYnV0ZS4gSXQgdGFrZXMgZWFjaCBwcm9wZXJ0eSBpbiB0aGUgYGNsYXNzSW5mb2AgYXJndW1lbnQgYW5kIGFkZHNcbiAqIHRoZSBwcm9wZXJ0eSBuYW1lIHRvIHRoZSBlbGVtZW50J3MgYGNsYXNzTGlzdGAgaWYgdGhlIHByb3BlcnR5IHZhbHVlIGlzXG4gKiB0cnV0aHk7IGlmIHRoZSBwcm9wZXJ0eSB2YWx1ZSBpcyBmYWxzZXksIHRoZSBwcm9wZXJ0eSBuYW1lIGlzIHJlbW92ZWQgZnJvbVxuICogdGhlIGVsZW1lbnQncyBgY2xhc3NgLlxuICpcbiAqIEZvciBleGFtcGxlIGB7Zm9vOiBiYXJ9YCBhcHBsaWVzIHRoZSBjbGFzcyBgZm9vYCBpZiB0aGUgdmFsdWUgb2YgYGJhcmAgaXNcbiAqIHRydXRoeS5cbiAqXG4gKiBAcGFyYW0gY2xhc3NJbmZvXG4gKi9cbmV4cG9ydCBjb25zdCBjbGFzc01hcCA9IGRpcmVjdGl2ZShDbGFzc01hcERpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7Q2xhc3NNYXBEaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTggR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7bm9DaGFuZ2UsIFBhcnR9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7ZGlyZWN0aXZlLCBEaXJlY3RpdmUsIERpcmVjdGl2ZVBhcmFtZXRlcnN9IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5cbi8vIEEgc2VudGluYWwgdGhhdCBpbmRpY2F0ZXMgZ3VhcmQoKSBoYXNuJ3QgcmVuZGVyZWQgYW55dGhpbmcgeWV0XG5jb25zdCBpbml0aWFsVmFsdWUgPSB7fTtcblxuY2xhc3MgR3VhcmREaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBwcml2YXRlIF9wcmV2aW91c1ZhbHVlOiB1bmtub3duID0gaW5pdGlhbFZhbHVlO1xuXG4gIHJlbmRlcihfdmFsdWU6IHVua25vd24sIGY6ICgpID0+IHVua25vd24pIHtcbiAgICByZXR1cm4gZigpO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKF9wYXJ0OiBQYXJ0LCBbdmFsdWUsIGZdOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAvLyBEaXJ0eS1jaGVjayBhcnJheXMgYnkgaXRlbVxuICAgICAgaWYgKFxuICAgICAgICBBcnJheS5pc0FycmF5KHRoaXMuX3ByZXZpb3VzVmFsdWUpICYmXG4gICAgICAgIHRoaXMuX3ByZXZpb3VzVmFsdWUubGVuZ3RoID09PSB2YWx1ZS5sZW5ndGggJiZcbiAgICAgICAgdmFsdWUuZXZlcnkoKHYsIGkpID0+IHYgPT09ICh0aGlzLl9wcmV2aW91c1ZhbHVlIGFzIEFycmF5PHVua25vd24+KVtpXSlcbiAgICAgICkge1xuICAgICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLl9wcmV2aW91c1ZhbHVlID09PSB2YWx1ZSkge1xuICAgICAgLy8gRGlydHktY2hlY2sgbm9uLWFycmF5cyBieSBpZGVudGl0eVxuICAgICAgcmV0dXJuIG5vQ2hhbmdlO1xuICAgIH1cblxuICAgIC8vIENvcHkgdGhlIHZhbHVlIGlmIGl0J3MgYW4gYXJyYXkgc28gdGhhdCBpZiBpdCdzIG11dGF0ZWQgd2UgZG9uJ3QgZm9yZ2V0XG4gICAgLy8gd2hhdCB0aGUgcHJldmlvdXMgdmFsdWVzIHdlcmUuXG4gICAgdGhpcy5fcHJldmlvdXNWYWx1ZSA9IEFycmF5LmlzQXJyYXkodmFsdWUpID8gQXJyYXkuZnJvbSh2YWx1ZSkgOiB2YWx1ZTtcbiAgICBjb25zdCByID0gdGhpcy5yZW5kZXIodmFsdWUsIGYpO1xuICAgIHJldHVybiByO1xuICB9XG59XG5cbi8qKlxuICogUHJldmVudHMgcmUtcmVuZGVyIG9mIGEgdGVtcGxhdGUgZnVuY3Rpb24gdW50aWwgYSBzaW5nbGUgdmFsdWUgb3IgYW4gYXJyYXkgb2ZcbiAqIHZhbHVlcyBjaGFuZ2VzLlxuICpcbiAqIFZhbHVlcyBhcmUgY2hlY2tlZCBhZ2FpbnN0IHByZXZpb3VzIHZhbHVlcyB3aXRoIHN0cmljdCBlcXVhbGl0eSAoYD09PWApLCBhbmRcbiAqIHNvIHRoZSBjaGVjayB3b24ndCBkZXRlY3QgbmVzdGVkIHByb3BlcnR5IGNoYW5nZXMgaW5zaWRlIG9iamVjdHMgb3IgYXJyYXlzLlxuICogQXJyYXlzIHZhbHVlcyBoYXZlIGVhY2ggaXRlbSBjaGVja2VkIGFnYWluc3QgdGhlIHByZXZpb3VzIHZhbHVlIGF0IHRoZSBzYW1lXG4gKiBpbmRleCB3aXRoIHN0cmljdCBlcXVhbGl0eS4gTmVzdGVkIGFycmF5cyBhcmUgYWxzbyBjaGVja2VkIG9ubHkgYnkgc3RyaWN0XG4gKiBlcXVhbGl0eS5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBodG1sYFxuICogICA8ZGl2PlxuICogICAgICR7Z3VhcmQoW3VzZXIuaWQsIGNvbXBhbnkuaWRdLCAoKSA9PiBodG1sYC4uLmApfVxuICogICA8L2Rpdj5cbiAqIGBcbiAqIGBgYFxuICpcbiAqIEluIHRoaXMgY2FzZSwgdGhlIHRlbXBsYXRlIG9ubHkgcmVyZW5kZXJzIGlmIGVpdGhlciBgdXNlci5pZGAgb3IgYGNvbXBhbnkuaWRgXG4gKiBjaGFuZ2VzLlxuICpcbiAqIGd1YXJkKCkgaXMgdXNlZnVsIHdpdGggaW1tdXRhYmxlIGRhdGEgcGF0dGVybnMsIGJ5IHByZXZlbnRpbmcgZXhwZW5zaXZlIHdvcmtcbiAqIHVudGlsIGRhdGEgdXBkYXRlcy5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBodG1sYFxuICogICA8ZGl2PlxuICogICAgICR7Z3VhcmQoW2ltbXV0YWJsZUl0ZW1zXSwgKCkgPT4gaW1tdXRhYmxlSXRlbXMubWFwKGkgPT4gaHRtbGAke2l9YCkpfVxuICogICA8L2Rpdj5cbiAqIGBcbiAqIGBgYFxuICpcbiAqIEluIHRoaXMgY2FzZSwgaXRlbXMgYXJlIG1hcHBlZCBvdmVyIG9ubHkgd2hlbiB0aGUgYXJyYXkgcmVmZXJlbmNlIGNoYW5nZXMuXG4gKlxuICogQHBhcmFtIHZhbHVlIHRoZSB2YWx1ZSB0byBjaGVjayBiZWZvcmUgcmUtcmVuZGVyaW5nXG4gKiBAcGFyYW0gZiB0aGUgdGVtcGxhdGUgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IGNvbnN0IGd1YXJkID0gZGlyZWN0aXZlKEd1YXJkRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtHdWFyZERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtub3RoaW5nfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5cbi8qKlxuICogRm9yIEF0dHJpYnV0ZVBhcnRzLCBzZXRzIHRoZSBhdHRyaWJ1dGUgaWYgdGhlIHZhbHVlIGlzIGRlZmluZWQgYW5kIHJlbW92ZXNcbiAqIHRoZSBhdHRyaWJ1dGUgaWYgdGhlIHZhbHVlIGlzIHVuZGVmaW5lZC5cbiAqXG4gKiBGb3Igb3RoZXIgcGFydCB0eXBlcywgdGhpcyBkaXJlY3RpdmUgaXMgYSBuby1vcC5cbiAqL1xuZXhwb3J0IGNvbnN0IGlmRGVmaW5lZCA9IDxUPih2YWx1ZTogVCkgPT4gdmFsdWUgPz8gbm90aGluZztcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0F0dHJpYnV0ZVBhcnQsIG5vQ2hhbmdlLCBub3RoaW5nfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBkaXJlY3RpdmUsXG4gIERpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbiAgUGFydEluZm8sXG4gIFBhcnRUeXBlLFxufSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtpc1NpbmdsZUV4cHJlc3Npb24sIHNldENvbW1pdHRlZFZhbHVlfSBmcm9tICcuLi9kaXJlY3RpdmUtaGVscGVycy5qcyc7XG5cbmNsYXNzIExpdmVEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gICAgaWYgKFxuICAgICAgIShcbiAgICAgICAgcGFydEluZm8udHlwZSA9PT0gUGFydFR5cGUuUFJPUEVSVFkgfHxcbiAgICAgICAgcGFydEluZm8udHlwZSA9PT0gUGFydFR5cGUuQVRUUklCVVRFIHx8XG4gICAgICAgIHBhcnRJbmZvLnR5cGUgPT09IFBhcnRUeXBlLkJPT0xFQU5fQVRUUklCVVRFXG4gICAgICApXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdUaGUgYGxpdmVgIGRpcmVjdGl2ZSBpcyBub3QgYWxsb3dlZCBvbiBjaGlsZCBvciBldmVudCBiaW5kaW5ncydcbiAgICAgICk7XG4gICAgfVxuICAgIGlmICghaXNTaW5nbGVFeHByZXNzaW9uKHBhcnRJbmZvKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdgbGl2ZWAgYmluZGluZ3MgY2FuIG9ubHkgY29udGFpbiBhIHNpbmdsZSBleHByZXNzaW9uJyk7XG4gICAgfVxuICB9XG5cbiAgcmVuZGVyKHZhbHVlOiB1bmtub3duKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IEF0dHJpYnV0ZVBhcnQsIFt2YWx1ZV06IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICBpZiAodmFsdWUgPT09IG5vQ2hhbmdlIHx8IHZhbHVlID09PSBub3RoaW5nKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIGNvbnN0IGVsZW1lbnQgPSBwYXJ0LmVsZW1lbnQ7XG4gICAgY29uc3QgbmFtZSA9IHBhcnQubmFtZTtcblxuICAgIGlmIChwYXJ0LnR5cGUgPT09IFBhcnRUeXBlLlBST1BFUlRZKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgaWYgKHZhbHVlID09PSAoZWxlbWVudCBhcyBhbnkpW25hbWVdKSB7XG4gICAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHBhcnQudHlwZSA9PT0gUGFydFR5cGUuQk9PTEVBTl9BVFRSSUJVVEUpIHtcbiAgICAgIGlmICghIXZhbHVlID09PSBlbGVtZW50Lmhhc0F0dHJpYnV0ZShuYW1lKSkge1xuICAgICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChwYXJ0LnR5cGUgPT09IFBhcnRUeXBlLkFUVFJJQlVURSkge1xuICAgICAgaWYgKGVsZW1lbnQuZ2V0QXR0cmlidXRlKG5hbWUpID09PSBTdHJpbmcodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gUmVzZXRzIHRoZSBwYXJ0J3MgdmFsdWUsIGNhdXNpbmcgaXRzIGRpcnR5LWNoZWNrIHRvIGZhaWwgc28gdGhhdCBpdFxuICAgIC8vIGFsd2F5cyBzZXRzIHRoZSB2YWx1ZS5cbiAgICBzZXRDb21taXR0ZWRWYWx1ZShwYXJ0KTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn1cblxuLyoqXG4gKiBDaGVja3MgYmluZGluZyB2YWx1ZXMgYWdhaW5zdCBsaXZlIERPTSB2YWx1ZXMsIGluc3RlYWQgb2YgcHJldmlvdXNseSBib3VuZFxuICogdmFsdWVzLCB3aGVuIGRldGVybWluaW5nIHdoZXRoZXIgdG8gdXBkYXRlIHRoZSB2YWx1ZS5cbiAqXG4gKiBUaGlzIGlzIHVzZWZ1bCBmb3IgY2FzZXMgd2hlcmUgdGhlIERPTSB2YWx1ZSBtYXkgY2hhbmdlIGZyb20gb3V0c2lkZSBvZlxuICogbGl0LWh0bWwsIHN1Y2ggYXMgd2l0aCBhIGJpbmRpbmcgdG8gYW4gYDxpbnB1dD5gIGVsZW1lbnQncyBgdmFsdWVgIHByb3BlcnR5LFxuICogYSBjb250ZW50IGVkaXRhYmxlIGVsZW1lbnRzIHRleHQsIG9yIHRvIGEgY3VzdG9tIGVsZW1lbnQgdGhhdCBjaGFuZ2VzIGl0J3NcbiAqIG93biBwcm9wZXJ0aWVzIG9yIGF0dHJpYnV0ZXMuXG4gKlxuICogSW4gdGhlc2UgY2FzZXMgaWYgdGhlIERPTSB2YWx1ZSBjaGFuZ2VzLCBidXQgdGhlIHZhbHVlIHNldCB0aHJvdWdoIGxpdC1odG1sXG4gKiBiaW5kaW5ncyBoYXNuJ3QsIGxpdC1odG1sIHdvbid0IGtub3cgdG8gdXBkYXRlIHRoZSBET00gdmFsdWUgYW5kIHdpbGwgbGVhdmVcbiAqIGl0IGFsb25lLiBJZiB0aGlzIGlzIG5vdCB3aGF0IHlvdSB3YW50LS1pZiB5b3Ugd2FudCB0byBvdmVyd3JpdGUgdGhlIERPTVxuICogdmFsdWUgd2l0aCB0aGUgYm91bmQgdmFsdWUgbm8gbWF0dGVyIHdoYXQtLXVzZSB0aGUgYGxpdmUoKWAgZGlyZWN0aXZlOlxuICpcbiAqIGBgYGpzXG4gKiBodG1sYDxpbnB1dCAudmFsdWU9JHtsaXZlKHgpfT5gXG4gKiBgYGBcbiAqXG4gKiBgbGl2ZSgpYCBwZXJmb3JtcyBhIHN0cmljdCBlcXVhbGl0eSBjaGVjayBhZ2FpbnMgdGhlIGxpdmUgRE9NIHZhbHVlLCBhbmQgaWZcbiAqIHRoZSBuZXcgdmFsdWUgaXMgZXF1YWwgdG8gdGhlIGxpdmUgdmFsdWUsIGRvZXMgbm90aGluZy4gVGhpcyBtZWFucyB0aGF0XG4gKiBgbGl2ZSgpYCBzaG91bGQgbm90IGJlIHVzZWQgd2hlbiB0aGUgYmluZGluZyB3aWxsIGNhdXNlIGEgdHlwZSBjb252ZXJzaW9uLiBJZlxuICogeW91IHVzZSBgbGl2ZSgpYCB3aXRoIGFuIGF0dHJpYnV0ZSBiaW5kaW5nLCBtYWtlIHN1cmUgdGhhdCBvbmx5IHN0cmluZ3MgYXJlXG4gKiBwYXNzZWQgaW4sIG9yIHRoZSBiaW5kaW5nIHdpbGwgdXBkYXRlIGV2ZXJ5IHJlbmRlci5cbiAqL1xuZXhwb3J0IGNvbnN0IGxpdmUgPSBkaXJlY3RpdmUoTGl2ZURpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7TGl2ZURpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cbmltcG9ydCB7bm90aGluZywgRWxlbWVudFBhcnR9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7ZGlyZWN0aXZlLCBBc3luY0RpcmVjdGl2ZX0gZnJvbSAnLi4vYXN5bmMtZGlyZWN0aXZlLmpzJztcblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IFJlZiBvYmplY3QsIHdoaWNoIGlzIGNvbnRhaW5lciBmb3IgYSByZWZlcmVuY2UgdG8gYW4gZWxlbWVudC5cbiAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZVJlZiA9IDxUID0gRWxlbWVudD4oKSA9PiBuZXcgUmVmPFQ+KCk7XG5cbi8qKlxuICogQW4gb2JqZWN0IHRoYXQgaG9sZHMgYSByZWYgdmFsdWUuXG4gKi9cbmNsYXNzIFJlZjxUID0gRWxlbWVudD4ge1xuICAvKipcbiAgICogVGhlIGN1cnJlbnQgRWxlbWVudCB2YWx1ZSBvZiB0aGUgcmVmLCBvciBlbHNlIGB1bmRlZmluZWRgIGlmIHRoZSByZWYgaXMgbm9cbiAgICogbG9uZ2VyIHJlbmRlcmVkLlxuICAgKi9cbiAgcmVhZG9ubHkgdmFsdWU/OiBUO1xufVxuXG5leHBvcnQgdHlwZSB7UmVmfTtcblxuaW50ZXJmYWNlIFJlZkludGVybmFsIHtcbiAgdmFsdWU6IEVsZW1lbnQgfCB1bmRlZmluZWQ7XG59XG5cbi8vIFdoZW4gY2FsbGJhY2tzIGFyZSB1c2VkIGZvciByZWZzLCB0aGlzIG1hcCB0cmFja3MgdGhlIGxhc3QgdmFsdWUgdGhlIGNhbGxiYWNrXG4vLyB3YXMgY2FsbGVkIHdpdGgsIGZvciBlbnN1cmluZyBhIGRpcmVjdGl2ZSBkb2Vzbid0IGNsZWFyIHRoZSByZWYgaWYgdGhlIHJlZlxuLy8gaGFzIGFscmVhZHkgYmVlbiByZW5kZXJlZCB0byBhIG5ldyBzcG90XG5jb25zdCBsYXN0RWxlbWVudEZvckNhbGxiYWNrOiBXZWFrTWFwPEZ1bmN0aW9uLCBFbGVtZW50IHwgdW5kZWZpbmVkPiA9XG4gIG5ldyBXZWFrTWFwKCk7XG5cbmV4cG9ydCB0eXBlIFJlZk9yQ2FsbGJhY2sgPSBSZWYgfCAoKGVsOiBFbGVtZW50IHwgdW5kZWZpbmVkKSA9PiB2b2lkKTtcblxuY2xhc3MgUmVmRGlyZWN0aXZlIGV4dGVuZHMgQXN5bmNEaXJlY3RpdmUge1xuICBwcml2YXRlIF9lbGVtZW50PzogRWxlbWVudDtcbiAgcHJpdmF0ZSBfcmVmPzogUmVmT3JDYWxsYmFjaztcbiAgcHJpdmF0ZSBfY29udGV4dDogdW5rbm93bjtcblxuICByZW5kZXIoX3JlZjogUmVmT3JDYWxsYmFjaykge1xuICAgIHJldHVybiBub3RoaW5nO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IEVsZW1lbnRQYXJ0LCBbcmVmXTogUGFyYW1ldGVyczx0aGlzWydyZW5kZXInXT4pIHtcbiAgICBjb25zdCByZWZDaGFuZ2VkID0gcmVmICE9PSB0aGlzLl9yZWY7XG4gICAgaWYgKHJlZkNoYW5nZWQgJiYgdGhpcy5fcmVmICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIFRoZSByZWYgcGFzc2VkIHRvIHRoZSBkaXJlY3RpdmUgaGFzIGNoYW5nZWQ7XG4gICAgICAvLyB1bnNldCB0aGUgcHJldmlvdXMgcmVmJ3MgdmFsdWVcbiAgICAgIHRoaXMuX3VwZGF0ZVJlZlZhbHVlKHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIGlmIChyZWZDaGFuZ2VkIHx8IHRoaXMuX2xhc3RFbGVtZW50Rm9yUmVmICE9PSB0aGlzLl9lbGVtZW50KSB7XG4gICAgICAvLyBXZSBlaXRoZXIgZ290IGEgbmV3IHJlZiBvciB0aGlzIGlzIHRoZSBmaXJzdCByZW5kZXI7XG4gICAgICAvLyBzdG9yZSB0aGUgcmVmL2VsZW1lbnQgJiB1cGRhdGUgdGhlIHJlZiB2YWx1ZVxuICAgICAgdGhpcy5fcmVmID0gcmVmO1xuICAgICAgdGhpcy5fY29udGV4dCA9IHBhcnQub3B0aW9ucz8uaG9zdDtcbiAgICAgIHRoaXMuX3VwZGF0ZVJlZlZhbHVlKCh0aGlzLl9lbGVtZW50ID0gcGFydC5lbGVtZW50KSk7XG4gICAgfVxuICAgIHJldHVybiBub3RoaW5nO1xuICB9XG5cbiAgcHJpdmF0ZSBfdXBkYXRlUmVmVmFsdWUoZWxlbWVudDogRWxlbWVudCB8IHVuZGVmaW5lZCkge1xuICAgIGlmICh0eXBlb2YgdGhpcy5fcmVmID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAvLyBJZiB0aGUgY3VycmVudCByZWYgd2FzIGNhbGxlZCB3aXRoIGEgcHJldmlvdXMgdmFsdWUsIGNhbGwgd2l0aFxuICAgICAgLy8gYHVuZGVmaW5lZGA7IFdlIGRvIHRoaXMgdG8gZW5zdXJlIGNhbGxiYWNrcyBhcmUgY2FsbGVkIGluIGEgY29uc2lzdGVudFxuICAgICAgLy8gd2F5IHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciBhIHJlZiBtaWdodCBiZSBtb3ZpbmcgdXAgaW4gdGhlIHRyZWUgKGluXG4gICAgICAvLyB3aGljaCBjYXNlIGl0IHdvdWxkIG90aGVyd2lzZSBiZSBjYWxsZWQgd2l0aCB0aGUgbmV3IHZhbHVlIGJlZm9yZSB0aGVcbiAgICAgIC8vIHByZXZpb3VzIG9uZSB1bnNldHMgaXQpIGFuZCBkb3duIGluIHRoZSB0cmVlICh3aGVyZSBpdCB3b3VsZCBiZSB1bnNldFxuICAgICAgLy8gYmVmb3JlIGJlaW5nIHNldClcbiAgICAgIGlmIChsYXN0RWxlbWVudEZvckNhbGxiYWNrLmdldCh0aGlzLl9yZWYpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fcmVmLmNhbGwodGhpcy5fY29udGV4dCwgdW5kZWZpbmVkKTtcbiAgICAgIH1cbiAgICAgIGxhc3RFbGVtZW50Rm9yQ2FsbGJhY2suc2V0KHRoaXMuX3JlZiwgZWxlbWVudCk7XG4gICAgICAvLyBDYWxsIHRoZSByZWYgd2l0aCB0aGUgbmV3IGVsZW1lbnQgdmFsdWVcbiAgICAgIGlmIChlbGVtZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fcmVmLmNhbGwodGhpcy5fY29udGV4dCwgZWxlbWVudCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICh0aGlzLl9yZWYgYXMgUmVmSW50ZXJuYWwpIS52YWx1ZSA9IGVsZW1lbnQ7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXQgX2xhc3RFbGVtZW50Rm9yUmVmKCkge1xuICAgIHJldHVybiB0eXBlb2YgdGhpcy5fcmVmID09PSAnZnVuY3Rpb24nXG4gICAgICA/IGxhc3RFbGVtZW50Rm9yQ2FsbGJhY2suZ2V0KHRoaXMuX3JlZilcbiAgICAgIDogdGhpcy5fcmVmPy52YWx1ZTtcbiAgfVxuXG4gIG92ZXJyaWRlIGRpc2Nvbm5lY3RlZCgpIHtcbiAgICAvLyBPbmx5IGNsZWFyIHRoZSBib3ggaWYgb3VyIGVsZW1lbnQgaXMgc3RpbGwgdGhlIG9uZSBpbiBpdCAoaS5lLiBhbm90aGVyXG4gICAgLy8gZGlyZWN0aXZlIGluc3RhbmNlIGhhc24ndCByZW5kZXJlZCBpdHMgZWxlbWVudCB0byBpdCBiZWZvcmUgdXMpOyB0aGF0XG4gICAgLy8gb25seSBoYXBwZW5zIGluIHRoZSBldmVudCBvZiB0aGUgZGlyZWN0aXZlIGJlaW5nIGNsZWFyZWQgKG5vdCB2aWEgbWFudWFsXG4gICAgLy8gZGlzY29ubmVjdGlvbilcbiAgICBpZiAodGhpcy5fbGFzdEVsZW1lbnRGb3JSZWYgPT09IHRoaXMuX2VsZW1lbnQpIHtcbiAgICAgIHRoaXMuX3VwZGF0ZVJlZlZhbHVlKHVuZGVmaW5lZCk7XG4gICAgfVxuICB9XG5cbiAgb3ZlcnJpZGUgcmVjb25uZWN0ZWQoKSB7XG4gICAgLy8gSWYgd2Ugd2VyZSBtYW51YWxseSBkaXNjb25uZWN0ZWQsIHdlIGNhbiBzYWZlbHkgcHV0IG91ciBlbGVtZW50IGJhY2sgaW5cbiAgICAvLyB0aGUgYm94LCBzaW5jZSBubyByZW5kZXJpbmcgY291bGQgaGF2ZSBvY2N1cnJlZCB0byBjaGFuZ2UgaXRzIHN0YXRlXG4gICAgdGhpcy5fdXBkYXRlUmVmVmFsdWUodGhpcy5fZWxlbWVudCk7XG4gIH1cbn1cblxuLyoqXG4gKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIFJlZiBvYmplY3Qgb3IgY2FsbHMgYSByZWYgY2FsbGJhY2sgd2l0aCB0aGUgZWxlbWVudCBpdCdzXG4gKiBib3VuZCB0by5cbiAqXG4gKiBBIFJlZiBvYmplY3QgYWN0cyBhcyBhIGNvbnRhaW5lciBmb3IgYSByZWZlcmVuY2UgdG8gYW4gZWxlbWVudC4gQSByZWZcbiAqIGNhbGxiYWNrIGlzIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhbiBlbGVtZW50IGFzIGl0cyBvbmx5IGFyZ3VtZW50LlxuICpcbiAqIFRoZSByZWYgZGlyZWN0aXZlIHNldHMgdGhlIHZhbHVlIG9mIHRoZSBSZWYgb2JqZWN0IG9yIGNhbGxzIHRoZSByZWYgY2FsbGJhY2tcbiAqIGR1cmluZyByZW5kZXJpbmcsIGlmIHRoZSByZWZlcmVuY2VkIGVsZW1lbnQgY2hhbmdlZC5cbiAqXG4gKiBOb3RlOiBJZiBhIHJlZiBjYWxsYmFjayBpcyByZW5kZXJlZCB0byBhIGRpZmZlcmVudCBlbGVtZW50IHBvc2l0aW9uIG9yIGlzXG4gKiByZW1vdmVkIGluIGEgc3Vic2VxdWVudCByZW5kZXIsIGl0IHdpbGwgZmlyc3QgYmUgY2FsbGVkIHdpdGggYHVuZGVmaW5lZGAsXG4gKiBmb2xsb3dlZCBieSBhbm90aGVyIGNhbGwgd2l0aCB0aGUgbmV3IGVsZW1lbnQgaXQgd2FzIHJlbmRlcmVkIHRvIChpZiBhbnkpLlxuICpcbiAqIGBgYGpzXG4gKiAvLyBVc2luZyBSZWYgb2JqZWN0XG4gKiBjb25zdCBpbnB1dFJlZiA9IGNyZWF0ZVJlZigpO1xuICogcmVuZGVyKGh0bWxgPGlucHV0ICR7cmVmKGlucHV0UmVmKX0+YCwgY29udGFpbmVyKTtcbiAqIGlucHV0UmVmLnZhbHVlLmZvY3VzKCk7XG4gKlxuICogLy8gVXNpbmcgY2FsbGJhY2tcbiAqIGNvbnN0IGNhbGxiYWNrID0gKGlucHV0RWxlbWVudCkgPT4gaW5wdXRFbGVtZW50LmZvY3VzKCk7XG4gKiByZW5kZXIoaHRtbGA8aW5wdXQgJHtyZWYoY2FsbGJhY2spfT5gLCBjb250YWluZXIpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCByZWYgPSBkaXJlY3RpdmUoUmVmRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtSZWZEaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7Q2hpbGRQYXJ0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIERpcmVjdGl2ZSwgUGFydEluZm8sIFBhcnRUeXBlfSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtcbiAgaW5zZXJ0UGFydCxcbiAgZ2V0Q29tbWl0dGVkVmFsdWUsXG4gIHJlbW92ZVBhcnQsXG4gIHNldENvbW1pdHRlZFZhbHVlLFxuICBzZXRDaGlsZFBhcnRWYWx1ZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuXG5leHBvcnQgdHlwZSBLZXlGbjxUPiA9IChpdGVtOiBULCBpbmRleDogbnVtYmVyKSA9PiB1bmtub3duO1xuZXhwb3J0IHR5cGUgSXRlbVRlbXBsYXRlPFQ+ID0gKGl0ZW06IFQsIGluZGV4OiBudW1iZXIpID0+IHVua25vd247XG5cbi8vIEhlbHBlciBmb3IgZ2VuZXJhdGluZyBhIG1hcCBvZiBhcnJheSBpdGVtIHRvIGl0cyBpbmRleCBvdmVyIGEgc3Vic2V0XG4vLyBvZiBhbiBhcnJheSAodXNlZCB0byBsYXppbHkgZ2VuZXJhdGUgYG5ld0tleVRvSW5kZXhNYXBgIGFuZFxuLy8gYG9sZEtleVRvSW5kZXhNYXBgKVxuY29uc3QgZ2VuZXJhdGVNYXAgPSAobGlzdDogdW5rbm93bltdLCBzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlcikgPT4ge1xuICBjb25zdCBtYXAgPSBuZXcgTWFwPHVua25vd24sIG51bWJlcj4oKTtcbiAgZm9yIChsZXQgaSA9IHN0YXJ0OyBpIDw9IGVuZDsgaSsrKSB7XG4gICAgbWFwLnNldChsaXN0W2ldLCBpKTtcbiAgfVxuICByZXR1cm4gbWFwO1xufTtcblxuY2xhc3MgUmVwZWF0RGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgcHJpdmF0ZSBfaXRlbUtleXM/OiB1bmtub3duW107XG5cbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICAgIGlmIChwYXJ0SW5mby50eXBlICE9PSBQYXJ0VHlwZS5DSElMRCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdyZXBlYXQoKSBjYW4gb25seSBiZSB1c2VkIGluIHRleHQgZXhwcmVzc2lvbnMnKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9nZXRWYWx1ZXNBbmRLZXlzPFQ+KFxuICAgIGl0ZW1zOiBJdGVyYWJsZTxUPixcbiAgICBrZXlGbk9yVGVtcGxhdGU6IEtleUZuPFQ+IHwgSXRlbVRlbXBsYXRlPFQ+LFxuICAgIHRlbXBsYXRlPzogSXRlbVRlbXBsYXRlPFQ+XG4gICkge1xuICAgIGxldCBrZXlGbjogS2V5Rm48VD4gfCB1bmRlZmluZWQ7XG4gICAgaWYgKHRlbXBsYXRlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRlbXBsYXRlID0ga2V5Rm5PclRlbXBsYXRlO1xuICAgIH0gZWxzZSBpZiAoa2V5Rm5PclRlbXBsYXRlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGtleUZuID0ga2V5Rm5PclRlbXBsYXRlIGFzIEtleUZuPFQ+O1xuICAgIH1cbiAgICBjb25zdCBrZXlzID0gW107XG4gICAgY29uc3QgdmFsdWVzID0gW107XG4gICAgbGV0IGluZGV4ID0gMDtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgIGtleXNbaW5kZXhdID0ga2V5Rm4gPyBrZXlGbihpdGVtLCBpbmRleCkgOiBpbmRleDtcbiAgICAgIHZhbHVlc1tpbmRleF0gPSB0ZW1wbGF0ZSEoaXRlbSwgaW5kZXgpO1xuICAgICAgaW5kZXgrKztcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbHVlcyxcbiAgICAgIGtleXMsXG4gICAgfTtcbiAgfVxuXG4gIHJlbmRlcjxUPihpdGVtczogSXRlcmFibGU8VD4sIHRlbXBsYXRlOiBJdGVtVGVtcGxhdGU8VD4pOiBBcnJheTx1bmtub3duPjtcbiAgcmVuZGVyPFQ+KFxuICAgIGl0ZW1zOiBJdGVyYWJsZTxUPixcbiAgICBrZXlGbjogS2V5Rm48VD4gfCBJdGVtVGVtcGxhdGU8VD4sXG4gICAgdGVtcGxhdGU6IEl0ZW1UZW1wbGF0ZTxUPlxuICApOiBBcnJheTx1bmtub3duPjtcbiAgcmVuZGVyPFQ+KFxuICAgIGl0ZW1zOiBJdGVyYWJsZTxUPixcbiAgICBrZXlGbk9yVGVtcGxhdGU6IEtleUZuPFQ+IHwgSXRlbVRlbXBsYXRlPFQ+LFxuICAgIHRlbXBsYXRlPzogSXRlbVRlbXBsYXRlPFQ+XG4gICkge1xuICAgIHJldHVybiB0aGlzLl9nZXRWYWx1ZXNBbmRLZXlzKGl0ZW1zLCBrZXlGbk9yVGVtcGxhdGUsIHRlbXBsYXRlKS52YWx1ZXM7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGU8VD4oXG4gICAgY29udGFpbmVyUGFydDogQ2hpbGRQYXJ0LFxuICAgIFtpdGVtcywga2V5Rm5PclRlbXBsYXRlLCB0ZW1wbGF0ZV06IFtcbiAgICAgIEl0ZXJhYmxlPFQ+LFxuICAgICAgS2V5Rm48VD4gfCBJdGVtVGVtcGxhdGU8VD4sXG4gICAgICBJdGVtVGVtcGxhdGU8VD5cbiAgICBdXG4gICkge1xuICAgIC8vIE9sZCBwYXJ0ICYga2V5IGxpc3RzIGFyZSByZXRyaWV2ZWQgZnJvbSB0aGUgbGFzdCB1cGRhdGUgKHdoaWNoIG1heVxuICAgIC8vIGJlIHByaW1lZCBieSBoeWRyYXRpb24pXG4gICAgY29uc3Qgb2xkUGFydHMgPSBnZXRDb21taXR0ZWRWYWx1ZShcbiAgICAgIGNvbnRhaW5lclBhcnRcbiAgICApIGFzIEFycmF5PENoaWxkUGFydCB8IG51bGw+O1xuICAgIGNvbnN0IHt2YWx1ZXM6IG5ld1ZhbHVlcywga2V5czogbmV3S2V5c30gPSB0aGlzLl9nZXRWYWx1ZXNBbmRLZXlzKFxuICAgICAgaXRlbXMsXG4gICAgICBrZXlGbk9yVGVtcGxhdGUsXG4gICAgICB0ZW1wbGF0ZVxuICAgICk7XG5cbiAgICAvLyBXZSBjaGVjayB0aGF0IG9sZFBhcnRzLCB0aGUgY29tbWl0dGVkIHZhbHVlLCBpcyBhbiBBcnJheSBhcyBhblxuICAgIC8vIGluZGljYXRvciB0aGF0IHRoZSBwcmV2aW91cyB2YWx1ZSBjYW1lIGZyb20gYSByZXBlYXQoKSBjYWxsLiBJZlxuICAgIC8vIG9sZFBhcnRzIGlzIG5vdCBhbiBBcnJheSB0aGVuIHRoaXMgaXMgdGhlIGZpcnN0IHJlbmRlciBhbmQgd2UgcmV0dXJuXG4gICAgLy8gYW4gYXJyYXkgZm9yIGxpdC1odG1sJ3MgYXJyYXkgaGFuZGxpbmcgdG8gcmVuZGVyLCBhbmQgcmVtZW1iZXIgdGhlXG4gICAgLy8ga2V5cy5cbiAgICBpZiAoIUFycmF5LmlzQXJyYXkob2xkUGFydHMpKSB7XG4gICAgICB0aGlzLl9pdGVtS2V5cyA9IG5ld0tleXM7XG4gICAgICByZXR1cm4gbmV3VmFsdWVzO1xuICAgIH1cblxuICAgIC8vIEluIFNTUiBoeWRyYXRpb24gaXQncyBwb3NzaWJsZSBmb3Igb2xkUGFydHMgdG8gYmUgYW4gYXJycmF5IGJ1dCBmb3IgdXNcbiAgICAvLyB0byBub3QgaGF2ZSBpdGVtIGtleXMgYmVjYXVzZSB0aGUgdXBkYXRlKCkgaGFzbid0IHJ1biB5ZXQuIFdlIHNldCB0aGVcbiAgICAvLyBrZXlzIHRvIGFuIGVtcHR5IGFycmF5LiBUaGlzIHdpbGwgY2F1c2UgYWxsIG9sZEtleS9uZXdLZXkgY29tcGFyaXNvbnNcbiAgICAvLyB0byBmYWlsIGFuZCBleGVjdXRpb24gdG8gZmFsbCB0byB0aGUgbGFzdCBuZXN0ZWQgYnJhY2ggYmVsb3cgd2hpY2hcbiAgICAvLyByZXVzZXMgdGhlIG9sZFBhcnQuXG4gICAgY29uc3Qgb2xkS2V5cyA9ICh0aGlzLl9pdGVtS2V5cyA/Pz0gW10pO1xuXG4gICAgLy8gTmV3IHBhcnQgbGlzdCB3aWxsIGJlIGJ1aWx0IHVwIGFzIHdlIGdvIChlaXRoZXIgcmV1c2VkIGZyb21cbiAgICAvLyBvbGQgcGFydHMgb3IgY3JlYXRlZCBmb3IgbmV3IGtleXMgaW4gdGhpcyB1cGRhdGUpLiBUaGlzIGlzXG4gICAgLy8gc2F2ZWQgaW4gdGhlIGFib3ZlIGNhY2hlIGF0IHRoZSBlbmQgb2YgdGhlIHVwZGF0ZS5cbiAgICBjb25zdCBuZXdQYXJ0czogQ2hpbGRQYXJ0W10gPSBbXTtcblxuICAgIC8vIE1hcHMgZnJvbSBrZXkgdG8gaW5kZXggZm9yIGN1cnJlbnQgYW5kIHByZXZpb3VzIHVwZGF0ZTsgdGhlc2VcbiAgICAvLyBhcmUgZ2VuZXJhdGVkIGxhemlseSBvbmx5IHdoZW4gbmVlZGVkIGFzIGEgcGVyZm9ybWFuY2VcbiAgICAvLyBvcHRpbWl6YXRpb24sIHNpbmNlIHRoZXkgYXJlIG9ubHkgcmVxdWlyZWQgZm9yIG11bHRpcGxlXG4gICAgLy8gbm9uLWNvbnRpZ3VvdXMgY2hhbmdlcyBpbiB0aGUgbGlzdCwgd2hpY2ggYXJlIGxlc3MgY29tbW9uLlxuICAgIGxldCBuZXdLZXlUb0luZGV4TWFwITogTWFwPHVua25vd24sIG51bWJlcj47XG4gICAgbGV0IG9sZEtleVRvSW5kZXhNYXAhOiBNYXA8dW5rbm93biwgbnVtYmVyPjtcblxuICAgIC8vIEhlYWQgYW5kIHRhaWwgcG9pbnRlcnMgdG8gb2xkIHBhcnRzIGFuZCBuZXcgdmFsdWVzXG4gICAgbGV0IG9sZEhlYWQgPSAwO1xuICAgIGxldCBvbGRUYWlsID0gb2xkUGFydHMubGVuZ3RoIC0gMTtcbiAgICBsZXQgbmV3SGVhZCA9IDA7XG4gICAgbGV0IG5ld1RhaWwgPSBuZXdWYWx1ZXMubGVuZ3RoIC0gMTtcblxuICAgIC8vIE92ZXJ2aWV3IG9mIE8obikgcmVjb25jaWxpYXRpb24gYWxnb3JpdGhtIChnZW5lcmFsIGFwcHJvYWNoXG4gICAgLy8gYmFzZWQgb24gaWRlYXMgZm91bmQgaW4gaXZpLCB2dWUsIHNuYWJiZG9tLCBldGMuKTpcbiAgICAvL1xuICAgIC8vICogV2Ugc3RhcnQgd2l0aCB0aGUgbGlzdCBvZiBvbGQgcGFydHMgYW5kIG5ldyB2YWx1ZXMgKGFuZFxuICAgIC8vICAgYXJyYXlzIG9mIHRoZWlyIHJlc3BlY3RpdmUga2V5cyksIGhlYWQvdGFpbCBwb2ludGVycyBpbnRvXG4gICAgLy8gICBlYWNoLCBhbmQgd2UgYnVpbGQgdXAgdGhlIG5ldyBsaXN0IG9mIHBhcnRzIGJ5IHVwZGF0aW5nXG4gICAgLy8gICAoYW5kIHdoZW4gbmVlZGVkLCBtb3ZpbmcpIG9sZCBwYXJ0cyBvciBjcmVhdGluZyBuZXcgb25lcy5cbiAgICAvLyAgIFRoZSBpbml0aWFsIHNjZW5hcmlvIG1pZ2h0IGxvb2sgbGlrZSB0aGlzIChmb3IgYnJldml0eSBvZlxuICAgIC8vICAgdGhlIGRpYWdyYW1zLCB0aGUgbnVtYmVycyBpbiB0aGUgYXJyYXkgcmVmbGVjdCBrZXlzXG4gICAgLy8gICBhc3NvY2lhdGVkIHdpdGggdGhlIG9sZCBwYXJ0cyBvciBuZXcgdmFsdWVzLCBhbHRob3VnaCBrZXlzXG4gICAgLy8gICBhbmQgcGFydHMvdmFsdWVzIGFyZSBhY3R1YWxseSBzdG9yZWQgaW4gcGFyYWxsZWwgYXJyYXlzXG4gICAgLy8gICBpbmRleGVkIHVzaW5nIHRoZSBzYW1lIGhlYWQvdGFpbCBwb2ludGVycyk6XG4gICAgLy9cbiAgICAvLyAgICAgIG9sZEhlYWQgdiAgICAgICAgICAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIDIsIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWyAsICAsICAsICAsICAsICAsICBdXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdIDwtIHJlZmxlY3RzIHRoZSB1c2VyJ3MgbmV3XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0gb3JkZXJcbiAgICAvLyAgICAgIG5ld0hlYWQgXiAgICAgICAgICAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIEl0ZXJhdGUgb2xkICYgbmV3IGxpc3RzIGZyb20gYm90aCBzaWRlcywgdXBkYXRpbmcsXG4gICAgLy8gICBzd2FwcGluZywgb3IgcmVtb3ZpbmcgcGFydHMgYXQgdGhlIGhlYWQvdGFpbCBsb2NhdGlvbnNcbiAgICAvLyAgIHVudGlsIG5laXRoZXIgaGVhZCBub3IgdGFpbCBjYW4gbW92ZS5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzoga2V5cyBhdCBoZWFkIHBvaW50ZXJzIG1hdGNoLCBzbyB1cGRhdGUgb2xkXG4gICAgLy8gICBwYXJ0IDAgaW4tcGxhY2UgKG5vIG5lZWQgdG8gbW92ZSBpdCkgYW5kIHJlY29yZCBwYXJ0IDAgaW5cbiAgICAvLyAgIHRoZSBgbmV3UGFydHNgIGxpc3QuIFRoZSBsYXN0IHRoaW5nIHdlIGRvIGlzIGFkdmFuY2UgdGhlXG4gICAgLy8gICBgb2xkSGVhZGAgYW5kIGBuZXdIZWFkYCBwb2ludGVycyAod2lsbCBiZSByZWZsZWN0ZWQgaW4gdGhlXG4gICAgLy8gICBuZXh0IGRpYWdyYW0pLlxuICAgIC8vXG4gICAgLy8gICAgICBvbGRIZWFkIHYgICAgICAgICAgICAgICAgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAyLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFswLCAgLCAgLCAgLCAgLCAgLCAgXSA8LSBoZWFkcyBtYXRjaGVkOiB1cGRhdGUgMFxuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSAgICBhbmQgYWR2YW5jZSBib3RoIG9sZEhlYWRcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJiBuZXdIZWFkXG4gICAgLy8gICAgICBuZXdIZWFkIF4gICAgICAgICAgICAgICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBoZWFkIHBvaW50ZXJzIGRvbid0IG1hdGNoLCBidXQgdGFpbFxuICAgIC8vICAgcG9pbnRlcnMgZG8sIHNvIHVwZGF0ZSBwYXJ0IDYgaW4gcGxhY2UgKG5vIG5lZWQgdG8gbW92ZVxuICAgIC8vICAgaXQpLCBhbmQgcmVjb3JkIHBhcnQgNiBpbiB0aGUgYG5ld1BhcnRzYCBsaXN0LiBMYXN0LFxuICAgIC8vICAgYWR2YW5jZSB0aGUgYG9sZFRhaWxgIGFuZCBgb2xkSGVhZGAgcG9pbnRlcnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgIG9sZEhlYWQgdiAgICAgICAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIDIsIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsICAsICAsICAsICAsICAsIDZdIDwtIHRhaWxzIG1hdGNoZWQ6IHVwZGF0ZSA2XG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIGJvdGggb2xkVGFpbFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmIG5ld1RhaWxcbiAgICAvLyAgICAgICAgIG5ld0hlYWQgXiAgICAgICAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIElmIG5laXRoZXIgaGVhZCBub3IgdGFpbCBtYXRjaDsgbmV4dCBjaGVjayBpZiBvbmUgb2YgdGhlXG4gICAgLy8gICBvbGQgaGVhZC90YWlsIGl0ZW1zIHdhcyByZW1vdmVkLiBXZSBmaXJzdCBuZWVkIHRvIGdlbmVyYXRlXG4gICAgLy8gICB0aGUgcmV2ZXJzZSBtYXAgb2YgbmV3IGtleXMgdG8gaW5kZXggKGBuZXdLZXlUb0luZGV4TWFwYCksXG4gICAgLy8gICB3aGljaCBpcyBkb25lIG9uY2UgbGF6aWx5IGFzIGEgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uLFxuICAgIC8vICAgc2luY2Ugd2Ugb25seSBoaXQgdGhpcyBjYXNlIGlmIG11bHRpcGxlIG5vbi1jb250aWd1b3VzXG4gICAgLy8gICBjaGFuZ2VzIHdlcmUgbWFkZS4gTm90ZSB0aGF0IGZvciBjb250aWd1b3VzIHJlbW92YWxcbiAgICAvLyAgIGFueXdoZXJlIGluIHRoZSBsaXN0LCB0aGUgaGVhZCBhbmQgdGFpbHMgd291bGQgYWR2YW5jZVxuICAgIC8vICAgZnJvbSBlaXRoZXIgZW5kIGFuZCBwYXNzIGVhY2ggb3RoZXIgYmVmb3JlIHdlIGdldCB0byB0aGlzXG4gICAgLy8gICBjYXNlIGFuZCByZW1vdmFscyB3b3VsZCBiZSBoYW5kbGVkIGluIHRoZSBmaW5hbCB3aGlsZSBsb29wXG4gICAgLy8gICB3aXRob3V0IG5lZWRpbmcgdG8gZ2VuZXJhdGUgdGhlIG1hcC5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogVGhlIGtleSBhdCBgb2xkVGFpbGAgd2FzIHJlbW92ZWQgKG5vIGxvbmdlclxuICAgIC8vICAgaW4gdGhlIGBuZXdLZXlUb0luZGV4TWFwYCksIHNvIHJlbW92ZSB0aGF0IHBhcnQgZnJvbSB0aGVcbiAgICAvLyAgIERPTSBhbmQgYWR2YW5jZSBqdXN0IHRoZSBgb2xkVGFpbGAgcG9pbnRlci5cbiAgICAvL1xuICAgIC8vICAgICAgICAgb2xkSGVhZCB2ICAgICAgICAgICB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgMiwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgICwgICwgICwgICwgICwgNl0gPC0gNSBub3QgaW4gbmV3IG1hcDogcmVtb3ZlXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIDUgYW5kIGFkdmFuY2Ugb2xkVGFpbFxuICAgIC8vICAgICAgICAgbmV3SGVhZCBeICAgICAgICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogT25jZSBoZWFkIGFuZCB0YWlsIGNhbm5vdCBtb3ZlLCBhbnkgbWlzbWF0Y2hlcyBhcmUgZHVlIHRvXG4gICAgLy8gICBlaXRoZXIgbmV3IG9yIG1vdmVkIGl0ZW1zOyBpZiBhIG5ldyBrZXkgaXMgaW4gdGhlIHByZXZpb3VzXG4gICAgLy8gICBcIm9sZCBrZXkgdG8gb2xkIGluZGV4XCIgbWFwLCBtb3ZlIHRoZSBvbGQgcGFydCB0byB0aGUgbmV3XG4gICAgLy8gICBsb2NhdGlvbiwgb3RoZXJ3aXNlIGNyZWF0ZSBhbmQgaW5zZXJ0IGEgbmV3IHBhcnQuIE5vdGVcbiAgICAvLyAgIHRoYXQgd2hlbiBtb3ZpbmcgYW4gb2xkIHBhcnQgd2UgbnVsbCBpdHMgcG9zaXRpb24gaW4gdGhlXG4gICAgLy8gICBvbGRQYXJ0cyBhcnJheSBpZiBpdCBsaWVzIGJldHdlZW4gdGhlIGhlYWQgYW5kIHRhaWwgc28gd2VcbiAgICAvLyAgIGtub3cgdG8gc2tpcCBpdCB3aGVuIHRoZSBwb2ludGVycyBnZXQgdGhlcmUuXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IG5laXRoZXIgaGVhZCBub3IgdGFpbCBtYXRjaCwgYW5kIG5laXRoZXJcbiAgICAvLyAgIHdlcmUgcmVtb3ZlZDsgc28gZmluZCB0aGUgYG5ld0hlYWRgIGtleSBpbiB0aGVcbiAgICAvLyAgIGBvbGRLZXlUb0luZGV4TWFwYCwgYW5kIG1vdmUgdGhhdCBvbGQgcGFydCdzIERPTSBpbnRvIHRoZVxuICAgIC8vICAgbmV4dCBoZWFkIHBvc2l0aW9uIChiZWZvcmUgYG9sZFBhcnRzW29sZEhlYWRdYCkuIExhc3QsXG4gICAgLy8gICBudWxsIHRoZSBwYXJ0IGluIHRoZSBgb2xkUGFydGAgYXJyYXkgc2luY2UgaXQgd2FzXG4gICAgLy8gICBzb21ld2hlcmUgaW4gdGhlIHJlbWFpbmluZyBvbGRQYXJ0cyBzdGlsbCB0byBiZSBzY2FubmVkXG4gICAgLy8gICAoYmV0d2VlbiB0aGUgaGVhZCBhbmQgdGFpbCBwb2ludGVycykgc28gdGhhdCB3ZSBrbm93IHRvXG4gICAgLy8gICBza2lwIHRoYXQgb2xkIHBhcnQgb24gZnV0dXJlIGl0ZXJhdGlvbnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgIG9sZEhlYWQgdiAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsICAsICAsICAsICAsIDZdIDwtIHN0dWNrOiB1cGRhdGUgJiBtb3ZlIDJcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICAgaW50byBwbGFjZSBhbmQgYWR2YW5jZVxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdIZWFkXG4gICAgLy8gICAgICAgICBuZXdIZWFkIF4gICAgICAgICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBOb3RlIHRoYXQgZm9yIG1vdmVzL2luc2VydGlvbnMgbGlrZSB0aGUgb25lIGFib3ZlLCBhIHBhcnRcbiAgICAvLyAgIGluc2VydGVkIGF0IHRoZSBoZWFkIHBvaW50ZXIgaXMgaW5zZXJ0ZWQgYmVmb3JlIHRoZVxuICAgIC8vICAgY3VycmVudCBgb2xkUGFydHNbb2xkSGVhZF1gLCBhbmQgYSBwYXJ0IGluc2VydGVkIGF0IHRoZVxuICAgIC8vICAgdGFpbCBwb2ludGVyIGlzIGluc2VydGVkIGJlZm9yZSBgbmV3UGFydHNbbmV3VGFpbCsxXWAuIFRoZVxuICAgIC8vICAgc2VlbWluZyBhc3ltbWV0cnkgbGllcyBpbiB0aGUgZmFjdCB0aGF0IG5ldyBwYXJ0cyBhcmVcbiAgICAvLyAgIG1vdmVkIGludG8gcGxhY2Ugb3V0c2lkZSBpbiwgc28gdG8gdGhlIHJpZ2h0IG9mIHRoZSBoZWFkXG4gICAgLy8gICBwb2ludGVyIGFyZSBvbGQgcGFydHMsIGFuZCB0byB0aGUgcmlnaHQgb2YgdGhlIHRhaWxcbiAgICAvLyAgIHBvaW50ZXIgYXJlIG5ldyBwYXJ0cy5cbiAgICAvL1xuICAgIC8vICogV2UgYWx3YXlzIHJlc3RhcnQgYmFjayBmcm9tIHRoZSB0b3Agb2YgdGhlIGFsZ29yaXRobSxcbiAgICAvLyAgIGFsbG93aW5nIG1hdGNoaW5nIGFuZCBzaW1wbGUgdXBkYXRlcyBpbiBwbGFjZSB0b1xuICAgIC8vICAgY29udGludWUuLi5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogdGhlIGhlYWQgcG9pbnRlcnMgb25jZSBhZ2FpbiBtYXRjaCwgc29cbiAgICAvLyAgIHNpbXBseSB1cGRhdGUgcGFydCAxIGFuZCByZWNvcmQgaXQgaW4gdGhlIGBuZXdQYXJ0c2BcbiAgICAvLyAgIGFycmF5LiAgTGFzdCwgYWR2YW5jZSBib3RoIGhlYWQgcG9pbnRlcnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgIG9sZEhlYWQgdiAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsICAsICAsICAsIDZdIDwtIGhlYWRzIG1hdGNoZWQ6IHVwZGF0ZSAxXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIGJvdGggb2xkSGVhZFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmIG5ld0hlYWRcbiAgICAvLyAgICAgICAgICAgIG5ld0hlYWQgXiAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIEFzIG1lbnRpb25lZCBhYm92ZSwgaXRlbXMgdGhhdCB3ZXJlIG1vdmVkIGFzIGEgcmVzdWx0IG9mXG4gICAgLy8gICBiZWluZyBzdHVjayAodGhlIGZpbmFsIGVsc2UgY2xhdXNlIGluIHRoZSBjb2RlIGJlbG93KSBhcmVcbiAgICAvLyAgIG1hcmtlZCB3aXRoIG51bGwsIHNvIHdlIGFsd2F5cyBhZHZhbmNlIG9sZCBwb2ludGVycyBvdmVyXG4gICAgLy8gICB0aGVzZSBzbyB3ZSdyZSBjb21wYXJpbmcgdGhlIG5leHQgYWN0dWFsIG9sZCB2YWx1ZSBvblxuICAgIC8vICAgZWl0aGVyIGVuZC5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogYG9sZEhlYWRgIGlzIG51bGwgKGFscmVhZHkgcGxhY2VkIGluXG4gICAgLy8gICBuZXdQYXJ0cyksIHNvIGFkdmFuY2UgYG9sZEhlYWRgLlxuICAgIC8vXG4gICAgLy8gICAgICAgICAgICBvbGRIZWFkIHYgICAgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAtLCAzLCA0LCA1LCA2XSA8LSBvbGQgaGVhZCBhbHJlYWR5IHVzZWQ6XG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsICAsICAsICAsIDZdICAgIGFkdmFuY2Ugb2xkSGVhZFxuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XVxuICAgIC8vICAgICAgICAgICAgICAgbmV3SGVhZCBeICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogTm90ZSBpdCdzIG5vdCBjcml0aWNhbCB0byBtYXJrIG9sZCBwYXJ0cyBhcyBudWxsIHdoZW4gdGhleVxuICAgIC8vICAgYXJlIG1vdmVkIGZyb20gaGVhZCB0byB0YWlsIG9yIHRhaWwgdG8gaGVhZCwgc2luY2UgdGhleVxuICAgIC8vICAgd2lsbCBiZSBvdXRzaWRlIHRoZSBwb2ludGVyIHJhbmdlIGFuZCBuZXZlciB2aXNpdGVkIGFnYWluLlxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBIZXJlIHRoZSBvbGQgdGFpbCBrZXkgbWF0Y2hlcyB0aGUgbmV3IGhlYWRcbiAgICAvLyAgIGtleSwgc28gdGhlIHBhcnQgYXQgdGhlIGBvbGRUYWlsYCBwb3NpdGlvbiBhbmQgbW92ZSBpdHNcbiAgICAvLyAgIERPTSB0byB0aGUgbmV3IGhlYWQgcG9zaXRpb24gKGJlZm9yZSBgb2xkUGFydHNbb2xkSGVhZF1gKS5cbiAgICAvLyAgIExhc3QsIGFkdmFuY2UgYG9sZFRhaWxgIGFuZCBgbmV3SGVhZGAgcG9pbnRlcnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgICAgICAgIG9sZEhlYWQgdiAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsIDQsICAsICAsIDZdIDwtIG9sZCB0YWlsIG1hdGNoZXMgbmV3XG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgaGVhZDogdXBkYXRlICYgbW92ZSA0LFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkdmFuY2Ugb2xkVGFpbCAmIG5ld0hlYWRcbiAgICAvLyAgICAgICAgICAgICAgIG5ld0hlYWQgXiAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IE9sZCBhbmQgbmV3IGhlYWQga2V5cyBtYXRjaCwgc28gdXBkYXRlIHRoZVxuICAgIC8vICAgb2xkIGhlYWQgcGFydCBpbiBwbGFjZSwgYW5kIGFkdmFuY2UgdGhlIGBvbGRIZWFkYCBhbmRcbiAgICAvLyAgIGBuZXdIZWFkYCBwb2ludGVycy5cbiAgICAvL1xuICAgIC8vICAgICAgICAgICAgICAgb2xkSGVhZCB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgLSwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgMSwgNCwgMywgICAsNl0gPC0gaGVhZHMgbWF0Y2g6IHVwZGF0ZSAzXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIG9sZEhlYWQgJlxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdIZWFkXG4gICAgLy8gICAgICAgICAgICAgICAgICBuZXdIZWFkIF4gIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBPbmNlIHRoZSBuZXcgb3Igb2xkIHBvaW50ZXJzIG1vdmUgcGFzdCBlYWNoIG90aGVyIHRoZW4gYWxsXG4gICAgLy8gICB3ZSBoYXZlIGxlZnQgaXMgYWRkaXRpb25zIChpZiBvbGQgbGlzdCBleGhhdXN0ZWQpIG9yXG4gICAgLy8gICByZW1vdmFscyAoaWYgbmV3IGxpc3QgZXhoYXVzdGVkKS4gVGhvc2UgYXJlIGhhbmRsZWQgaW4gdGhlXG4gICAgLy8gICBmaW5hbCB3aGlsZSBsb29wcyBhdCB0aGUgZW5kLlxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBgb2xkSGVhZGAgZXhjZWVkZWQgYG9sZFRhaWxgLCBzbyB3ZSdyZSBkb25lXG4gICAgLy8gICB3aXRoIHRoZSBtYWluIGxvb3AuICBDcmVhdGUgdGhlIHJlbWFpbmluZyBwYXJ0IGFuZCBpbnNlcnRcbiAgICAvLyAgIGl0IGF0IHRoZSBuZXcgaGVhZCBwb3NpdGlvbiwgYW5kIHRoZSB1cGRhdGUgaXMgY29tcGxldGUuXG4gICAgLy9cbiAgICAvLyAgICAgICAgICAgICAgICAgICAob2xkSGVhZCA+IG9sZFRhaWwpXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsIDQsIDMsIDcgLDZdIDwtIGNyZWF0ZSBhbmQgaW5zZXJ0IDdcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl1cbiAgICAvLyAgICAgICAgICAgICAgICAgICAgIG5ld0hlYWQgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIE5vdGUgdGhhdCB0aGUgb3JkZXIgb2YgdGhlIGlmL2Vsc2UgY2xhdXNlcyBpcyBub3RcbiAgICAvLyAgIGltcG9ydGFudCB0byB0aGUgYWxnb3JpdGhtLCBhcyBsb25nIGFzIHRoZSBudWxsIGNoZWNrc1xuICAgIC8vICAgY29tZSBmaXJzdCAodG8gZW5zdXJlIHdlJ3JlIGFsd2F5cyB3b3JraW5nIG9uIHZhbGlkIG9sZFxuICAgIC8vICAgcGFydHMpIGFuZCB0aGF0IHRoZSBmaW5hbCBlbHNlIGNsYXVzZSBjb21lcyBsYXN0IChzaW5jZVxuICAgIC8vICAgdGhhdCdzIHdoZXJlIHRoZSBleHBlbnNpdmUgbW92ZXMgb2NjdXIpLiBUaGUgb3JkZXIgb2ZcbiAgICAvLyAgIHJlbWFpbmluZyBjbGF1c2VzIGlzIGlzIGp1c3QgYSBzaW1wbGUgZ3Vlc3MgYXQgd2hpY2ggY2FzZXNcbiAgICAvLyAgIHdpbGwgYmUgbW9zdCBjb21tb24uXG4gICAgLy9cbiAgICAvLyAqIE5vdGUsIHdlIGNvdWxkIGNhbGN1bGF0ZSB0aGUgbG9uZ2VzdFxuICAgIC8vICAgaW5jcmVhc2luZyBzdWJzZXF1ZW5jZSAoTElTKSBvZiBvbGQgaXRlbXMgaW4gbmV3IHBvc2l0aW9uLFxuICAgIC8vICAgYW5kIG9ubHkgbW92ZSB0aG9zZSBub3QgaW4gdGhlIExJUyBzZXQuIEhvd2V2ZXIgdGhhdCBjb3N0c1xuICAgIC8vICAgTyhubG9nbikgdGltZSBhbmQgYWRkcyBhIGJpdCBtb3JlIGNvZGUsIGFuZCBvbmx5IGhlbHBzXG4gICAgLy8gICBtYWtlIHJhcmUgdHlwZXMgb2YgbXV0YXRpb25zIHJlcXVpcmUgZmV3ZXIgbW92ZXMuIFRoZVxuICAgIC8vICAgYWJvdmUgaGFuZGxlcyByZW1vdmVzLCBhZGRzLCByZXZlcnNhbCwgc3dhcHMsIGFuZCBzaW5nbGVcbiAgICAvLyAgIG1vdmVzIG9mIGNvbnRpZ3VvdXMgaXRlbXMgaW4gbGluZWFyIHRpbWUsIGluIHRoZSBtaW5pbXVtXG4gICAgLy8gICBudW1iZXIgb2YgbW92ZXMuIEFzIHRoZSBudW1iZXIgb2YgbXVsdGlwbGUgbW92ZXMgd2hlcmUgTElTXG4gICAgLy8gICBtaWdodCBoZWxwIGFwcHJvYWNoZXMgYSByYW5kb20gc2h1ZmZsZSwgdGhlIExJU1xuICAgIC8vICAgb3B0aW1pemF0aW9uIGJlY29tZXMgbGVzcyBoZWxwZnVsLCBzbyBpdCBzZWVtcyBub3Qgd29ydGhcbiAgICAvLyAgIHRoZSBjb2RlIGF0IHRoaXMgcG9pbnQuIENvdWxkIHJlY29uc2lkZXIgaWYgYSBjb21wZWxsaW5nXG4gICAgLy8gICBjYXNlIGFyaXNlcy5cblxuICAgIHdoaWxlIChvbGRIZWFkIDw9IG9sZFRhaWwgJiYgbmV3SGVhZCA8PSBuZXdUYWlsKSB7XG4gICAgICBpZiAob2xkUGFydHNbb2xkSGVhZF0gPT09IG51bGwpIHtcbiAgICAgICAgLy8gYG51bGxgIG1lYW5zIG9sZCBwYXJ0IGF0IGhlYWQgaGFzIGFscmVhZHkgYmVlbiB1c2VkXG4gICAgICAgIC8vIGJlbG93OyBza2lwXG4gICAgICAgIG9sZEhlYWQrKztcbiAgICAgIH0gZWxzZSBpZiAob2xkUGFydHNbb2xkVGFpbF0gPT09IG51bGwpIHtcbiAgICAgICAgLy8gYG51bGxgIG1lYW5zIG9sZCBwYXJ0IGF0IHRhaWwgaGFzIGFscmVhZHkgYmVlbiB1c2VkXG4gICAgICAgIC8vIGJlbG93OyBza2lwXG4gICAgICAgIG9sZFRhaWwtLTtcbiAgICAgIH0gZWxzZSBpZiAob2xkS2V5c1tvbGRIZWFkXSA9PT0gbmV3S2V5c1tuZXdIZWFkXSkge1xuICAgICAgICAvLyBPbGQgaGVhZCBtYXRjaGVzIG5ldyBoZWFkOyB1cGRhdGUgaW4gcGxhY2VcbiAgICAgICAgbmV3UGFydHNbbmV3SGVhZF0gPSBzZXRDaGlsZFBhcnRWYWx1ZShcbiAgICAgICAgICBvbGRQYXJ0c1tvbGRIZWFkXSEsXG4gICAgICAgICAgbmV3VmFsdWVzW25ld0hlYWRdXG4gICAgICAgICk7XG4gICAgICAgIG9sZEhlYWQrKztcbiAgICAgICAgbmV3SGVhZCsrO1xuICAgICAgfSBlbHNlIGlmIChvbGRLZXlzW29sZFRhaWxdID09PSBuZXdLZXlzW25ld1RhaWxdKSB7XG4gICAgICAgIC8vIE9sZCB0YWlsIG1hdGNoZXMgbmV3IHRhaWw7IHVwZGF0ZSBpbiBwbGFjZVxuICAgICAgICBuZXdQYXJ0c1tuZXdUYWlsXSA9IHNldENoaWxkUGFydFZhbHVlKFxuICAgICAgICAgIG9sZFBhcnRzW29sZFRhaWxdISxcbiAgICAgICAgICBuZXdWYWx1ZXNbbmV3VGFpbF1cbiAgICAgICAgKTtcbiAgICAgICAgb2xkVGFpbC0tO1xuICAgICAgICBuZXdUYWlsLS07XG4gICAgICB9IGVsc2UgaWYgKG9sZEtleXNbb2xkSGVhZF0gPT09IG5ld0tleXNbbmV3VGFpbF0pIHtcbiAgICAgICAgLy8gT2xkIGhlYWQgbWF0Y2hlcyBuZXcgdGFpbDsgdXBkYXRlIGFuZCBtb3ZlIHRvIG5ldyB0YWlsXG4gICAgICAgIG5ld1BhcnRzW25ld1RhaWxdID0gc2V0Q2hpbGRQYXJ0VmFsdWUoXG4gICAgICAgICAgb2xkUGFydHNbb2xkSGVhZF0hLFxuICAgICAgICAgIG5ld1ZhbHVlc1tuZXdUYWlsXVxuICAgICAgICApO1xuICAgICAgICBpbnNlcnRQYXJ0KGNvbnRhaW5lclBhcnQsIG5ld1BhcnRzW25ld1RhaWwgKyAxXSwgb2xkUGFydHNbb2xkSGVhZF0hKTtcbiAgICAgICAgb2xkSGVhZCsrO1xuICAgICAgICBuZXdUYWlsLS07XG4gICAgICB9IGVsc2UgaWYgKG9sZEtleXNbb2xkVGFpbF0gPT09IG5ld0tleXNbbmV3SGVhZF0pIHtcbiAgICAgICAgLy8gT2xkIHRhaWwgbWF0Y2hlcyBuZXcgaGVhZDsgdXBkYXRlIGFuZCBtb3ZlIHRvIG5ldyBoZWFkXG4gICAgICAgIG5ld1BhcnRzW25ld0hlYWRdID0gc2V0Q2hpbGRQYXJ0VmFsdWUoXG4gICAgICAgICAgb2xkUGFydHNbb2xkVGFpbF0hLFxuICAgICAgICAgIG5ld1ZhbHVlc1tuZXdIZWFkXVxuICAgICAgICApO1xuICAgICAgICBpbnNlcnRQYXJ0KGNvbnRhaW5lclBhcnQsIG9sZFBhcnRzW29sZEhlYWRdISwgb2xkUGFydHNbb2xkVGFpbF0hKTtcbiAgICAgICAgb2xkVGFpbC0tO1xuICAgICAgICBuZXdIZWFkKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobmV3S2V5VG9JbmRleE1hcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gTGF6aWx5IGdlbmVyYXRlIGtleS10by1pbmRleCBtYXBzLCB1c2VkIGZvciByZW1vdmFscyAmXG4gICAgICAgICAgLy8gbW92ZXMgYmVsb3dcbiAgICAgICAgICBuZXdLZXlUb0luZGV4TWFwID0gZ2VuZXJhdGVNYXAobmV3S2V5cywgbmV3SGVhZCwgbmV3VGFpbCk7XG4gICAgICAgICAgb2xkS2V5VG9JbmRleE1hcCA9IGdlbmVyYXRlTWFwKG9sZEtleXMsIG9sZEhlYWQsIG9sZFRhaWwpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghbmV3S2V5VG9JbmRleE1hcC5oYXMob2xkS2V5c1tvbGRIZWFkXSkpIHtcbiAgICAgICAgICAvLyBPbGQgaGVhZCBpcyBubyBsb25nZXIgaW4gbmV3IGxpc3Q7IHJlbW92ZVxuICAgICAgICAgIHJlbW92ZVBhcnQob2xkUGFydHNbb2xkSGVhZF0hKTtcbiAgICAgICAgICBvbGRIZWFkKys7XG4gICAgICAgIH0gZWxzZSBpZiAoIW5ld0tleVRvSW5kZXhNYXAuaGFzKG9sZEtleXNbb2xkVGFpbF0pKSB7XG4gICAgICAgICAgLy8gT2xkIHRhaWwgaXMgbm8gbG9uZ2VyIGluIG5ldyBsaXN0OyByZW1vdmVcbiAgICAgICAgICByZW1vdmVQYXJ0KG9sZFBhcnRzW29sZFRhaWxdISk7XG4gICAgICAgICAgb2xkVGFpbC0tO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIEFueSBtaXNtYXRjaGVzIGF0IHRoaXMgcG9pbnQgYXJlIGR1ZSB0byBhZGRpdGlvbnMgb3JcbiAgICAgICAgICAvLyBtb3Zlczsgc2VlIGlmIHdlIGhhdmUgYW4gb2xkIHBhcnQgd2UgY2FuIHJldXNlIGFuZCBtb3ZlXG4gICAgICAgICAgLy8gaW50byBwbGFjZVxuICAgICAgICAgIGNvbnN0IG9sZEluZGV4ID0gb2xkS2V5VG9JbmRleE1hcC5nZXQobmV3S2V5c1tuZXdIZWFkXSk7XG4gICAgICAgICAgY29uc3Qgb2xkUGFydCA9IG9sZEluZGV4ICE9PSB1bmRlZmluZWQgPyBvbGRQYXJ0c1tvbGRJbmRleF0gOiBudWxsO1xuICAgICAgICAgIGlmIChvbGRQYXJ0ID09PSBudWxsKSB7XG4gICAgICAgICAgICAvLyBObyBvbGQgcGFydCBmb3IgdGhpcyB2YWx1ZTsgY3JlYXRlIGEgbmV3IG9uZSBhbmRcbiAgICAgICAgICAgIC8vIGluc2VydCBpdFxuICAgICAgICAgICAgY29uc3QgbmV3UGFydCA9IGluc2VydFBhcnQoY29udGFpbmVyUGFydCwgb2xkUGFydHNbb2xkSGVhZF0hKTtcbiAgICAgICAgICAgIHNldENoaWxkUGFydFZhbHVlKG5ld1BhcnQsIG5ld1ZhbHVlc1tuZXdIZWFkXSk7XG4gICAgICAgICAgICBuZXdQYXJ0c1tuZXdIZWFkXSA9IG5ld1BhcnQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFJldXNlIG9sZCBwYXJ0XG4gICAgICAgICAgICBuZXdQYXJ0c1tuZXdIZWFkXSA9IHNldENoaWxkUGFydFZhbHVlKG9sZFBhcnQsIG5ld1ZhbHVlc1tuZXdIZWFkXSk7XG4gICAgICAgICAgICBpbnNlcnRQYXJ0KGNvbnRhaW5lclBhcnQsIG9sZFBhcnRzW29sZEhlYWRdISwgb2xkUGFydCk7XG4gICAgICAgICAgICAvLyBUaGlzIG1hcmtzIHRoZSBvbGQgcGFydCBhcyBoYXZpbmcgYmVlbiB1c2VkLCBzbyB0aGF0XG4gICAgICAgICAgICAvLyBpdCB3aWxsIGJlIHNraXBwZWQgaW4gdGhlIGZpcnN0IHR3byBjaGVja3MgYWJvdmVcbiAgICAgICAgICAgIG9sZFBhcnRzW29sZEluZGV4IGFzIG51bWJlcl0gPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBuZXdIZWFkKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQWRkIHBhcnRzIGZvciBhbnkgcmVtYWluaW5nIG5ldyB2YWx1ZXNcbiAgICB3aGlsZSAobmV3SGVhZCA8PSBuZXdUYWlsKSB7XG4gICAgICAvLyBGb3IgYWxsIHJlbWFpbmluZyBhZGRpdGlvbnMsIHdlIGluc2VydCBiZWZvcmUgbGFzdCBuZXdcbiAgICAgIC8vIHRhaWwsIHNpbmNlIG9sZCBwb2ludGVycyBhcmUgbm8gbG9uZ2VyIHZhbGlkXG4gICAgICBjb25zdCBuZXdQYXJ0ID0gaW5zZXJ0UGFydChjb250YWluZXJQYXJ0LCBuZXdQYXJ0c1tuZXdUYWlsICsgMV0pO1xuICAgICAgc2V0Q2hpbGRQYXJ0VmFsdWUobmV3UGFydCwgbmV3VmFsdWVzW25ld0hlYWRdKTtcbiAgICAgIG5ld1BhcnRzW25ld0hlYWQrK10gPSBuZXdQYXJ0O1xuICAgIH1cbiAgICAvLyBSZW1vdmUgYW55IHJlbWFpbmluZyB1bnVzZWQgb2xkIHBhcnRzXG4gICAgd2hpbGUgKG9sZEhlYWQgPD0gb2xkVGFpbCkge1xuICAgICAgY29uc3Qgb2xkUGFydCA9IG9sZFBhcnRzW29sZEhlYWQrK107XG4gICAgICBpZiAob2xkUGFydCAhPT0gbnVsbCkge1xuICAgICAgICByZW1vdmVQYXJ0KG9sZFBhcnQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNhdmUgb3JkZXIgb2YgbmV3IHBhcnRzIGZvciBuZXh0IHJvdW5kXG4gICAgdGhpcy5faXRlbUtleXMgPSBuZXdLZXlzO1xuICAgIC8vIERpcmVjdGx5IHNldCBwYXJ0IHZhbHVlLCBieXBhc3NpbmcgaXQncyBkaXJ0eS1jaGVja2luZ1xuICAgIHNldENvbW1pdHRlZFZhbHVlKGNvbnRhaW5lclBhcnQsIG5ld1BhcnRzKTtcbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZXBlYXREaXJlY3RpdmVGbiB7XG4gIDxUPihcbiAgICBpdGVtczogSXRlcmFibGU8VD4sXG4gICAga2V5Rm5PclRlbXBsYXRlOiBLZXlGbjxUPiB8IEl0ZW1UZW1wbGF0ZTxUPixcbiAgICB0ZW1wbGF0ZT86IEl0ZW1UZW1wbGF0ZTxUPlxuICApOiB1bmtub3duO1xuICA8VD4oaXRlbXM6IEl0ZXJhYmxlPFQ+LCB0ZW1wbGF0ZTogSXRlbVRlbXBsYXRlPFQ+KTogdW5rbm93bjtcbiAgPFQ+KFxuICAgIGl0ZW1zOiBJdGVyYWJsZTxUPixcbiAgICBrZXlGbjogS2V5Rm48VD4gfCBJdGVtVGVtcGxhdGU8VD4sXG4gICAgdGVtcGxhdGU6IEl0ZW1UZW1wbGF0ZTxUPlxuICApOiB1bmtub3duO1xufVxuXG4vKipcbiAqIEEgZGlyZWN0aXZlIHRoYXQgcmVwZWF0cyBhIHNlcmllcyBvZiB2YWx1ZXMgKHVzdWFsbHkgYFRlbXBsYXRlUmVzdWx0c2ApXG4gKiBnZW5lcmF0ZWQgZnJvbSBhbiBpdGVyYWJsZSwgYW5kIHVwZGF0ZXMgdGhvc2UgaXRlbXMgZWZmaWNpZW50bHkgd2hlbiB0aGVcbiAqIGl0ZXJhYmxlIGNoYW5nZXMgYmFzZWQgb24gdXNlci1wcm92aWRlZCBga2V5c2AgYXNzb2NpYXRlZCB3aXRoIGVhY2ggaXRlbS5cbiAqXG4gKiBOb3RlIHRoYXQgaWYgYSBga2V5Rm5gIGlzIHByb3ZpZGVkLCBzdHJpY3Qga2V5LXRvLURPTSBtYXBwaW5nIGlzIG1haW50YWluZWQsXG4gKiBtZWFuaW5nIHByZXZpb3VzIERPTSBmb3IgYSBnaXZlbiBrZXkgaXMgbW92ZWQgaW50byB0aGUgbmV3IHBvc2l0aW9uIGlmXG4gKiBuZWVkZWQsIGFuZCBET00gd2lsbCBuZXZlciBiZSByZXVzZWQgd2l0aCB2YWx1ZXMgZm9yIGRpZmZlcmVudCBrZXlzIChuZXcgRE9NXG4gKiB3aWxsIGFsd2F5cyBiZSBjcmVhdGVkIGZvciBuZXcga2V5cykuIFRoaXMgaXMgZ2VuZXJhbGx5IHRoZSBtb3N0IGVmZmljaWVudFxuICogd2F5IHRvIHVzZSBgcmVwZWF0YCBzaW5jZSBpdCBwZXJmb3JtcyBtaW5pbXVtIHVubmVjZXNzYXJ5IHdvcmsgZm9yIGluc2VydGlvbnNcbiAqIGFuZCByZW1vdmFscy5cbiAqXG4gKiBUaGUgYGtleUZuYCB0YWtlcyB0d28gcGFyYW1ldGVycywgdGhlIGl0ZW0gYW5kIGl0cyBpbmRleCwgYW5kIHJldHVybnMgYSB1bmlxdWUga2V5IHZhbHVlLlxuICpcbiAqIGBgYGpzXG4gKiBodG1sYFxuICogICA8b2w+XG4gKiAgICAgJHtyZXBlYXQodGhpcy5pdGVtcywgKGl0ZW0pID0+IGl0ZW0uaWQsIChpdGVtLCBpbmRleCkgPT4ge1xuICogICAgICAgcmV0dXJuIGh0bWxgPGxpPiR7aW5kZXh9OiAke2l0ZW0ubmFtZX08L2xpPmA7XG4gKiAgICAgfSl9XG4gKiAgIDwvb2w+XG4gKiBgXG4gKiBgYGBcbiAqXG4gKiAqKkltcG9ydGFudCoqOiBJZiBwcm92aWRpbmcgYSBga2V5Rm5gLCBrZXlzICptdXN0KiBiZSB1bmlxdWUgZm9yIGFsbCBpdGVtcyBpbiBhXG4gKiBnaXZlbiBjYWxsIHRvIGByZXBlYXRgLiBUaGUgYmVoYXZpb3Igd2hlbiB0d28gb3IgbW9yZSBpdGVtcyBoYXZlIHRoZSBzYW1lIGtleVxuICogaXMgdW5kZWZpbmVkLlxuICpcbiAqIElmIG5vIGBrZXlGbmAgaXMgcHJvdmlkZWQsIHRoaXMgZGlyZWN0aXZlIHdpbGwgcGVyZm9ybSBzaW1pbGFyIHRvIG1hcHBpbmdcbiAqIGl0ZW1zIHRvIHZhbHVlcywgYW5kIERPTSB3aWxsIGJlIHJldXNlZCBhZ2FpbnN0IHBvdGVudGlhbGx5IGRpZmZlcmVudCBpdGVtcy5cbiAqL1xuZXhwb3J0IGNvbnN0IHJlcGVhdCA9IGRpcmVjdGl2ZShSZXBlYXREaXJlY3RpdmUpIGFzIFJlcGVhdERpcmVjdGl2ZUZuO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge1JlcGVhdERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtBdHRyaWJ1dGVQYXJ0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmUsXG4gIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG4gIFBhcnRJbmZvLFxuICBQYXJ0VHlwZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcblxuLyoqXG4gKiBBIGtleS12YWx1ZSBzZXQgb2YgQ1NTIHByb3BlcnRpZXMgYW5kIHZhbHVlcy5cbiAqXG4gKiBUaGUga2V5IHNob3VsZCBiZSBlaXRoZXIgYSB2YWxpZCBDU1MgcHJvcGVydHkgbmFtZSBzdHJpbmcsIGxpa2VcbiAqIGAnYmFja2dyb3VuZC1jb2xvcidgLCBvciBhIHZhbGlkIEphdmFTY3JpcHQgY2FtZWwgY2FzZSBwcm9wZXJ0eSBuYW1lXG4gKiBmb3IgQ1NTU3R5bGVEZWNsYXJhdGlvbiBsaWtlIGBiYWNrZ3JvdW5kQ29sb3JgLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFN0eWxlSW5mbyB7XG4gIHJlYWRvbmx5IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfCB1bmRlZmluZWQgfCBudWxsO1xufVxuXG5jbGFzcyBTdHlsZU1hcERpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIF9wcmV2aW91c1N0eWxlUHJvcGVydGllcz86IFNldDxzdHJpbmc+O1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAoXG4gICAgICBwYXJ0SW5mby50eXBlICE9PSBQYXJ0VHlwZS5BVFRSSUJVVEUgfHxcbiAgICAgIHBhcnRJbmZvLm5hbWUgIT09ICdzdHlsZScgfHxcbiAgICAgIChwYXJ0SW5mby5zdHJpbmdzPy5sZW5ndGggYXMgbnVtYmVyKSA+IDJcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1RoZSBgc3R5bGVNYXBgIGRpcmVjdGl2ZSBtdXN0IGJlIHVzZWQgaW4gdGhlIGBzdHlsZWAgYXR0cmlidXRlICcgK1xuICAgICAgICAgICdhbmQgbXVzdCBiZSB0aGUgb25seSBwYXJ0IGluIHRoZSBhdHRyaWJ1dGUuJ1xuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXIoc3R5bGVJbmZvOiBTdHlsZUluZm8pIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc3R5bGVJbmZvKS5yZWR1Y2UoKHN0eWxlLCBwcm9wKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHN0eWxlSW5mb1twcm9wXTtcbiAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBzdHlsZTtcbiAgICAgIH1cbiAgICAgIC8vIENvbnZlcnQgcHJvcGVydHkgbmFtZXMgZnJvbSBjYW1lbC1jYXNlIHRvIGRhc2gtY2FzZSwgaS5lLjpcbiAgICAgIC8vICBgYmFja2dyb3VuZENvbG9yYCAtPiBgYmFja2dyb3VuZC1jb2xvcmBcbiAgICAgIC8vIFZlbmRvci1wcmVmaXhlZCBuYW1lcyBuZWVkIGFuIGV4dHJhIGAtYCBhcHBlbmRlZCB0byBmcm9udDpcbiAgICAgIC8vICBgd2Via2l0QXBwZWFyYW5jZWAgLT4gYC13ZWJraXQtYXBwZWFyYW5jZWBcbiAgICAgIC8vIEV4Y2VwdGlvbiBpcyBhbnkgcHJvcGVydHkgbmFtZSBjb250YWluaW5nIGEgZGFzaCwgaW5jbHVkaW5nXG4gICAgICAvLyBjdXN0b20gcHJvcGVydGllczsgd2UgYXNzdW1lIHRoZXNlIGFyZSBhbHJlYWR5IGRhc2gtY2FzZWQgaS5lLjpcbiAgICAgIC8vICBgLS1teS1idXR0b24tY29sb3JgIC0tPiBgLS1teS1idXR0b24tY29sb3JgXG4gICAgICBwcm9wID0gcHJvcFxuICAgICAgICAucmVwbGFjZSgvKD86Xih3ZWJraXR8bW96fG1zfG8pfCkoPz1bQS1aXSkvZywgJy0kJicpXG4gICAgICAgIC50b0xvd2VyQ2FzZSgpO1xuICAgICAgcmV0dXJuIHN0eWxlICsgYCR7cHJvcH06JHt2YWx1ZX07YDtcbiAgICB9LCAnJyk7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUocGFydDogQXR0cmlidXRlUGFydCwgW3N0eWxlSW5mb106IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICBjb25zdCB7c3R5bGV9ID0gcGFydC5lbGVtZW50IGFzIEhUTUxFbGVtZW50O1xuXG4gICAgaWYgKHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzID0gbmV3IFNldCgpO1xuICAgICAgZm9yIChjb25zdCBuYW1lIGluIHN0eWxlSW5mbykge1xuICAgICAgICB0aGlzLl9wcmV2aW91c1N0eWxlUHJvcGVydGllcy5hZGQobmFtZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5yZW5kZXIoc3R5bGVJbmZvKTtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgb2xkIHByb3BlcnRpZXMgdGhhdCBubyBsb25nZXIgZXhpc3QgaW4gc3R5bGVJbmZvXG4gICAgLy8gV2UgdXNlIGZvckVhY2goKSBpbnN0ZWFkIG9mIGZvci1vZiBzbyB0aGF0IHJlIGRvbid0IHJlcXVpcmUgZG93bi1sZXZlbFxuICAgIC8vIGl0ZXJhdGlvbi5cbiAgICB0aGlzLl9wcmV2aW91c1N0eWxlUHJvcGVydGllcyEuZm9yRWFjaCgobmFtZSkgPT4ge1xuICAgICAgLy8gSWYgdGhlIG5hbWUgaXNuJ3QgaW4gc3R5bGVJbmZvIG9yIGl0J3MgbnVsbC91bmRlZmluZWRcbiAgICAgIGlmIChzdHlsZUluZm9bbmFtZV0gPT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9wcmV2aW91c1N0eWxlUHJvcGVydGllcyEuZGVsZXRlKG5hbWUpO1xuICAgICAgICBpZiAobmFtZS5pbmNsdWRlcygnLScpKSB7XG4gICAgICAgICAgc3R5bGUucmVtb3ZlUHJvcGVydHkobmFtZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gTm90ZSByZXNldCB1c2luZyBlbXB0eSBzdHJpbmcgKHZzIG51bGwpIGFzIElFMTEgZG9lcyBub3QgYWx3YXlzXG4gICAgICAgICAgLy8gcmVzZXQgdmlhIG51bGwgKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9FbGVtZW50Q1NTSW5saW5lU3R5bGUvc3R5bGUjc2V0dGluZ19zdHlsZXMpXG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgICAgICAoc3R5bGUgYXMgYW55KVtuYW1lXSA9ICcnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBBZGQgb3IgdXBkYXRlIHByb3BlcnRpZXNcbiAgICBmb3IgKGNvbnN0IG5hbWUgaW4gc3R5bGVJbmZvKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHN0eWxlSW5mb1tuYW1lXTtcbiAgICAgIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzLmFkZChuYW1lKTtcbiAgICAgICAgaWYgKG5hbWUuaW5jbHVkZXMoJy0nKSkge1xuICAgICAgICAgIHN0eWxlLnNldFByb3BlcnR5KG5hbWUsIHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICAgIChzdHlsZSBhcyBhbnkpW25hbWVdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG59XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCBhcHBsaWVzIENTUyBwcm9wZXJ0aWVzIHRvIGFuIGVsZW1lbnQuXG4gKlxuICogYHN0eWxlTWFwYCBjYW4gb25seSBiZSB1c2VkIGluIHRoZSBgc3R5bGVgIGF0dHJpYnV0ZSBhbmQgbXVzdCBiZSB0aGUgb25seVxuICogZXhwcmVzc2lvbiBpbiB0aGUgYXR0cmlidXRlLiBJdCB0YWtlcyB0aGUgcHJvcGVydHkgbmFtZXMgaW4gdGhlIGBzdHlsZUluZm9gXG4gKiBvYmplY3QgYW5kIGFkZHMgdGhlIHByb3BlcnR5IHZhbHVlcyBhcyBDU1MgcHJvcGVydGllcy4gUHJvcGVydHkgbmFtZXMgd2l0aFxuICogZGFzaGVzIChgLWApIGFyZSBhc3N1bWVkIHRvIGJlIHZhbGlkIENTUyBwcm9wZXJ0eSBuYW1lcyBhbmQgc2V0IG9uIHRoZVxuICogZWxlbWVudCdzIHN0eWxlIG9iamVjdCB1c2luZyBgc2V0UHJvcGVydHkoKWAuIE5hbWVzIHdpdGhvdXQgZGFzaGVzIGFyZVxuICogYXNzdW1lZCB0byBiZSBjYW1lbENhc2VkIEphdmFTY3JpcHQgcHJvcGVydHkgbmFtZXMgYW5kIHNldCBvbiB0aGUgZWxlbWVudCdzXG4gKiBzdHlsZSBvYmplY3QgdXNpbmcgcHJvcGVydHkgYXNzaWdubWVudCwgYWxsb3dpbmcgdGhlIHN0eWxlIG9iamVjdCB0b1xuICogdHJhbnNsYXRlIEphdmFTY3JpcHQtc3R5bGUgbmFtZXMgdG8gQ1NTIHByb3BlcnR5IG5hbWVzLlxuICpcbiAqIEZvciBleGFtcGxlIGBzdHlsZU1hcCh7YmFja2dyb3VuZENvbG9yOiAncmVkJywgJ2JvcmRlci10b3AnOiAnNXB4JywgJy0tc2l6ZSc6XG4gKiAnMCd9KWAgc2V0cyB0aGUgYGJhY2tncm91bmQtY29sb3JgLCBgYm9yZGVyLXRvcGAgYW5kIGAtLXNpemVgIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHN0eWxlSW5mb1xuICovXG5leHBvcnQgY29uc3Qgc3R5bGVNYXAgPSBkaXJlY3RpdmUoU3R5bGVNYXBEaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge1N0eWxlTWFwRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge25vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgRGlyZWN0aXZlLCBQYXJ0SW5mbywgUGFydFR5cGV9IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5cbmNsYXNzIFRlbXBsYXRlQ29udGVudERpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX3ByZXZpb3VzVGVtcGxhdGU/OiBIVE1MVGVtcGxhdGVFbGVtZW50O1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAocGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQ0hJTEQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigndGVtcGxhdGVDb250ZW50IGNhbiBvbmx5IGJlIHVzZWQgaW4gY2hpbGQgYmluZGluZ3MnKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXIodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQpIHtcbiAgICBpZiAodGhpcy5fcHJldmlvdXNUZW1wbGF0ZSA9PT0gdGVtcGxhdGUpIHtcbiAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICB9XG4gICAgdGhpcy5fcHJldmlvdXNUZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICAgIHJldHVybiBkb2N1bWVudC5pbXBvcnROb2RlKHRlbXBsYXRlLmNvbnRlbnQsIHRydWUpO1xuICB9XG59XG5cbi8qKlxuICogUmVuZGVycyB0aGUgY29udGVudCBvZiBhIHRlbXBsYXRlIGVsZW1lbnQgYXMgSFRNTC5cbiAqXG4gKiBOb3RlLCB0aGUgdGVtcGxhdGUgc2hvdWxkIGJlIGRldmVsb3BlciBjb250cm9sbGVkIGFuZCBub3QgdXNlciBjb250cm9sbGVkLlxuICogUmVuZGVyaW5nIGEgdXNlci1jb250cm9sbGVkIHRlbXBsYXRlIHdpdGggdGhpcyBkaXJlY3RpdmVcbiAqIGNvdWxkIGxlYWQgdG8gY3Jvc3Mtc2l0ZS1zY3JpcHRpbmcgdnVsbmVyYWJpbGl0aWVzLlxuICovXG5leHBvcnQgY29uc3QgdGVtcGxhdGVDb250ZW50ID0gZGlyZWN0aXZlKFRlbXBsYXRlQ29udGVudERpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7VGVtcGxhdGVDb250ZW50RGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge25vdGhpbmcsIFRlbXBsYXRlUmVzdWx0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIERpcmVjdGl2ZSwgUGFydEluZm8sIFBhcnRUeXBlfSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuXG5jb25zdCBIVE1MX1JFU1VMVCA9IDE7XG5cbmV4cG9ydCBjbGFzcyBVbnNhZmVIVE1MRGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgc3RhdGljIGRpcmVjdGl2ZU5hbWUgPSAndW5zYWZlSFRNTCc7XG4gIHN0YXRpYyByZXN1bHRUeXBlID0gSFRNTF9SRVNVTFQ7XG5cbiAgcHJpdmF0ZSBfdmFsdWU6IHVua25vd24gPSBub3RoaW5nO1xuICBwcml2YXRlIF90ZW1wbGF0ZVJlc3VsdD86IFRlbXBsYXRlUmVzdWx0O1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAocGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQ0hJTEQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYCR7XG4gICAgICAgICAgKHRoaXMuY29uc3RydWN0b3IgYXMgdHlwZW9mIFVuc2FmZUhUTUxEaXJlY3RpdmUpLmRpcmVjdGl2ZU5hbWVcbiAgICAgICAgfSgpIGNhbiBvbmx5IGJlIHVzZWQgaW4gY2hpbGQgYmluZGluZ3NgXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlcih2YWx1ZTogc3RyaW5nIHwgdHlwZW9mIG5vdGhpbmcgfCB0eXBlb2Ygbm9DaGFuZ2UgfCB1bmRlZmluZWQgfCBudWxsKSB7XG4gICAgaWYgKHZhbHVlID09PSBub3RoaW5nIHx8IHZhbHVlID09IG51bGwpIHtcbiAgICAgIHRoaXMuX3RlbXBsYXRlUmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgICAgcmV0dXJuICh0aGlzLl92YWx1ZSA9IHZhbHVlKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlID09PSBub0NoYW5nZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHZhbHVlICE9ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGAke1xuICAgICAgICAgICh0aGlzLmNvbnN0cnVjdG9yIGFzIHR5cGVvZiBVbnNhZmVIVE1MRGlyZWN0aXZlKS5kaXJlY3RpdmVOYW1lXG4gICAgICAgIH0oKSBjYWxsZWQgd2l0aCBhIG5vbi1zdHJpbmcgdmFsdWVgXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAodmFsdWUgPT09IHRoaXMuX3ZhbHVlKSB7XG4gICAgICByZXR1cm4gdGhpcy5fdGVtcGxhdGVSZXN1bHQ7XG4gICAgfVxuICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gICAgY29uc3Qgc3RyaW5ncyA9IFt2YWx1ZV0gYXMgdW5rbm93biBhcyBUZW1wbGF0ZVN0cmluZ3NBcnJheTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIChzdHJpbmdzIGFzIGFueSkucmF3ID0gc3RyaW5ncztcbiAgICAvLyBXQVJOSU5HOiBpbXBlcnNvbmF0aW5nIGEgVGVtcGxhdGVSZXN1bHQgbGlrZSB0aGlzIGlzIGV4dHJlbWVseVxuICAgIC8vIGRhbmdlcm91cy4gVGhpcmQtcGFydHkgZGlyZWN0aXZlcyBzaG91bGQgbm90IGRvIHRoaXMuXG4gICAgcmV0dXJuICh0aGlzLl90ZW1wbGF0ZVJlc3VsdCA9IHtcbiAgICAgIC8vIENhc3QgdG8gYSBrbm93biBzZXQgb2YgaW50ZWdlcnMgdGhhdCBzYXRpc2Z5IFJlc3VsdFR5cGUgc28gdGhhdCB3ZVxuICAgICAgLy8gZG9uJ3QgaGF2ZSB0byBleHBvcnQgUmVzdWx0VHlwZSBhbmQgcG9zc2libHkgZW5jb3VyYWdlIHRoaXMgcGF0dGVybi5cbiAgICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgICBbJ18kbGl0VHlwZSQnXTogKHRoaXMuY29uc3RydWN0b3IgYXMgdHlwZW9mIFVuc2FmZUhUTUxEaXJlY3RpdmUpXG4gICAgICAgIC5yZXN1bHRUeXBlIGFzIDEgfCAyLFxuICAgICAgc3RyaW5ncyxcbiAgICAgIHZhbHVlczogW10sXG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW5kZXJzIHRoZSByZXN1bHQgYXMgSFRNTCwgcmF0aGVyIHRoYW4gdGV4dC5cbiAqXG4gKiBUaGUgdmFsdWVzIGB1bmRlZmluZWRgLCBgbnVsbGAsIGFuZCBgbm90aGluZ2AsIHdpbGwgYWxsIHJlc3VsdCBpbiBubyBjb250ZW50XG4gKiAoZW1wdHkgc3RyaW5nKSBiZWluZyByZW5kZXJlZC5cbiAqXG4gKiBOb3RlLCB0aGlzIGlzIHVuc2FmZSB0byB1c2Ugd2l0aCBhbnkgdXNlci1wcm92aWRlZCBpbnB1dCB0aGF0IGhhc24ndCBiZWVuXG4gKiBzYW5pdGl6ZWQgb3IgZXNjYXBlZCwgYXMgaXQgbWF5IGxlYWQgdG8gY3Jvc3Mtc2l0ZS1zY3JpcHRpbmdcbiAqIHZ1bG5lcmFiaWxpdGllcy5cbiAqL1xuZXhwb3J0IGNvbnN0IHVuc2FmZUhUTUwgPSBkaXJlY3RpdmUoVW5zYWZlSFRNTERpcmVjdGl2ZSk7XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtkaXJlY3RpdmV9IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge1Vuc2FmZUhUTUxEaXJlY3RpdmV9IGZyb20gJy4vdW5zYWZlLWh0bWwuanMnO1xuXG5jb25zdCBTVkdfUkVTVUxUID0gMjtcblxuY2xhc3MgVW5zYWZlU1ZHRGlyZWN0aXZlIGV4dGVuZHMgVW5zYWZlSFRNTERpcmVjdGl2ZSB7XG4gIHN0YXRpYyBvdmVycmlkZSBkaXJlY3RpdmVOYW1lID0gJ3Vuc2FmZVNWRyc7XG4gIHN0YXRpYyBvdmVycmlkZSByZXN1bHRUeXBlID0gU1ZHX1JFU1VMVDtcbn1cblxuLyoqXG4gKiBSZW5kZXJzIHRoZSByZXN1bHQgYXMgU1ZHLCByYXRoZXIgdGhhbiB0ZXh0LlxuICpcbiAqIFRoZSB2YWx1ZXMgYHVuZGVmaW5lZGAsIGBudWxsYCwgYW5kIGBub3RoaW5nYCwgd2lsbCBhbGwgcmVzdWx0IGluIG5vIGNvbnRlbnRcbiAqIChlbXB0eSBzdHJpbmcpIGJlaW5nIHJlbmRlcmVkLlxuICpcbiAqIE5vdGUsIHRoaXMgaXMgdW5zYWZlIHRvIHVzZSB3aXRoIGFueSB1c2VyLXByb3ZpZGVkIGlucHV0IHRoYXQgaGFzbid0IGJlZW5cbiAqIHNhbml0aXplZCBvciBlc2NhcGVkLCBhcyBpdCBtYXkgbGVhZCB0byBjcm9zcy1zaXRlLXNjcmlwdGluZ1xuICogdnVsbmVyYWJpbGl0aWVzLlxuICovXG5leHBvcnQgY29uc3QgdW5zYWZlU1ZHID0gZGlyZWN0aXZlKFVuc2FmZVNWR0RpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7VW5zYWZlU1ZHRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge1BhcnQsIG5vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZX0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7aXNQcmltaXRpdmV9IGZyb20gJy4uL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcbmltcG9ydCB7QXN5bmNEaXJlY3RpdmV9IGZyb20gJy4uL2FzeW5jLWRpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge1BhdXNlciwgUHNldWRvV2Vha1JlZn0gZnJvbSAnLi9wcml2YXRlLWFzeW5jLWhlbHBlcnMuanMnO1xuXG5jb25zdCBpc1Byb21pc2UgPSAoeDogdW5rbm93bikgPT4ge1xuICByZXR1cm4gIWlzUHJpbWl0aXZlKHgpICYmIHR5cGVvZiAoeCBhcyB7dGhlbj86IHVua25vd259KS50aGVuID09PSAnZnVuY3Rpb24nO1xufTtcbi8vIEVmZmVjdGl2ZWx5IGluZmluaXR5LCBidXQgYSBTTUkuXG5jb25zdCBfaW5maW5pdHkgPSAweDNmZmZmZmZmO1xuXG5leHBvcnQgY2xhc3MgVW50aWxEaXJlY3RpdmUgZXh0ZW5kcyBBc3luY0RpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX19sYXN0UmVuZGVyZWRJbmRleDogbnVtYmVyID0gX2luZmluaXR5O1xuICBwcml2YXRlIF9fdmFsdWVzOiB1bmtub3duW10gPSBbXTtcbiAgcHJpdmF0ZSBfX3dlYWtUaGlzID0gbmV3IFBzZXVkb1dlYWtSZWYodGhpcyk7XG4gIHByaXZhdGUgX19wYXVzZXIgPSBuZXcgUGF1c2VyKCk7XG5cbiAgcmVuZGVyKC4uLmFyZ3M6IEFycmF5PHVua25vd24+KSB7XG4gICAgcmV0dXJuIGFyZ3MuZmluZCgoeCkgPT4gIWlzUHJvbWlzZSh4KSkgPz8gbm9DaGFuZ2U7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUoX3BhcnQ6IFBhcnQsIGFyZ3M6IEFycmF5PHVua25vd24+KSB7XG4gICAgY29uc3QgcHJldmlvdXNWYWx1ZXMgPSB0aGlzLl9fdmFsdWVzO1xuICAgIGxldCBwcmV2aW91c0xlbmd0aCA9IHByZXZpb3VzVmFsdWVzLmxlbmd0aDtcbiAgICB0aGlzLl9fdmFsdWVzID0gYXJncztcblxuICAgIGNvbnN0IHdlYWtUaGlzID0gdGhpcy5fX3dlYWtUaGlzO1xuICAgIGNvbnN0IHBhdXNlciA9IHRoaXMuX19wYXVzZXI7XG5cbiAgICAvLyBJZiBvdXIgaW5pdGlhbCByZW5kZXIgb2NjdXJzIHdoaWxlIGRpc2Nvbm5lY3RlZCwgZW5zdXJlIHRoYXQgdGhlIHBhdXNlclxuICAgIC8vIGFuZCB3ZWFrVGhpcyBhcmUgaW4gdGhlIGRpc2Nvbm5lY3RlZCBzdGF0ZVxuICAgIGlmICghdGhpcy5pc0Nvbm5lY3RlZCkge1xuICAgICAgdGhpcy5kaXNjb25uZWN0ZWQoKTtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIC8vIElmIHdlJ3ZlIHJlbmRlcmVkIGEgaGlnaGVyLXByaW9yaXR5IHZhbHVlIGFscmVhZHksIHN0b3AuXG4gICAgICBpZiAoaSA+IHRoaXMuX19sYXN0UmVuZGVyZWRJbmRleCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgY29uc3QgdmFsdWUgPSBhcmdzW2ldO1xuXG4gICAgICAvLyBSZW5kZXIgbm9uLVByb21pc2UgdmFsdWVzIGltbWVkaWF0ZWx5XG4gICAgICBpZiAoIWlzUHJvbWlzZSh2YWx1ZSkpIHtcbiAgICAgICAgdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4ID0gaTtcbiAgICAgICAgLy8gU2luY2UgYSBsb3dlci1wcmlvcml0eSB2YWx1ZSB3aWxsIG5ldmVyIG92ZXJ3cml0ZSBhIGhpZ2hlci1wcmlvcml0eVxuICAgICAgICAvLyBzeW5jaHJvbm91cyB2YWx1ZSwgd2UgY2FuIHN0b3AgcHJvY2Vzc2luZyBub3cuXG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhpcyBpcyBhIFByb21pc2Ugd2UndmUgYWxyZWFkeSBoYW5kbGVkLCBza2lwIGl0LlxuICAgICAgaWYgKGkgPCBwcmV2aW91c0xlbmd0aCAmJiB2YWx1ZSA9PT0gcHJldmlvdXNWYWx1ZXNbaV0pIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIFdlIGhhdmUgYSBQcm9taXNlIHRoYXQgd2UgaGF2ZW4ndCBzZWVuIGJlZm9yZSwgc28gcHJpb3JpdGllcyBtYXkgaGF2ZVxuICAgICAgLy8gY2hhbmdlZC4gRm9yZ2V0IHdoYXQgd2UgcmVuZGVyZWQgYmVmb3JlLlxuICAgICAgdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4ID0gX2luZmluaXR5O1xuICAgICAgcHJldmlvdXNMZW5ndGggPSAwO1xuXG4gICAgICAvLyBOb3RlLCB0aGUgY2FsbGJhY2sgYXZvaWRzIGNsb3Npbmcgb3ZlciBgdGhpc2Agc28gdGhhdCB0aGUgZGlyZWN0aXZlXG4gICAgICAvLyBjYW4gYmUgZ2MnZWQgYmVmb3JlIHRoZSBwcm9taXNlIHJlc29sdmVzOyBpbnN0ZWFkIGB0aGlzYCBpcyByZXRyaWV2ZWRcbiAgICAgIC8vIGZyb20gYHdlYWtUaGlzYCwgd2hpY2ggY2FuIGJyZWFrIHRoZSBoYXJkIHJlZmVyZW5jZSBpbiB0aGUgY2xvc3VyZSB3aGVuXG4gICAgICAvLyB0aGUgZGlyZWN0aXZlIGRpc2Nvbm5lY3RzXG4gICAgICBQcm9taXNlLnJlc29sdmUodmFsdWUpLnRoZW4oYXN5bmMgKHJlc3VsdDogdW5rbm93bikgPT4ge1xuICAgICAgICAvLyBJZiB3ZSdyZSBkaXNjb25uZWN0ZWQsIHdhaXQgdW50aWwgd2UncmUgKG1heWJlKSByZWNvbm5lY3RlZFxuICAgICAgICAvLyBUaGUgd2hpbGUgbG9vcCBoZXJlIGhhbmRsZXMgdGhlIGNhc2UgdGhhdCB0aGUgY29ubmVjdGlvbiBzdGF0ZVxuICAgICAgICAvLyB0aHJhc2hlcywgY2F1c2luZyB0aGUgcGF1c2VyIHRvIHJlc3VtZSBhbmQgdGhlbiBnZXQgcmUtcGF1c2VkXG4gICAgICAgIHdoaWxlIChwYXVzZXIuZ2V0KCkpIHtcbiAgICAgICAgICBhd2FpdCBwYXVzZXIuZ2V0KCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgdGhlIGNhbGxiYWNrIGdldHMgaGVyZSBhbmQgdGhlcmUgaXMgbm8gYHRoaXNgLCBpdCBtZWFucyB0aGF0IHRoZVxuICAgICAgICAvLyBkaXJlY3RpdmUgaGFzIGJlZW4gZGlzY29ubmVjdGVkIGFuZCBnYXJiYWdlIGNvbGxlY3RlZCBhbmQgd2UgZG9uJ3RcbiAgICAgICAgLy8gbmVlZCB0byBkbyBhbnl0aGluZyBlbHNlXG4gICAgICAgIGNvbnN0IF90aGlzID0gd2Vha1RoaXMuZGVyZWYoKTtcbiAgICAgICAgaWYgKF90aGlzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb25zdCBpbmRleCA9IF90aGlzLl9fdmFsdWVzLmluZGV4T2YodmFsdWUpO1xuICAgICAgICAgIC8vIElmIHN0YXRlLnZhbHVlcyBkb2Vzbid0IGNvbnRhaW4gdGhlIHZhbHVlLCB3ZSd2ZSByZS1yZW5kZXJlZCB3aXRob3V0XG4gICAgICAgICAgLy8gdGhlIHZhbHVlLCBzbyBkb24ndCByZW5kZXIgaXQuIFRoZW4sIG9ubHkgcmVuZGVyIGlmIHRoZSB2YWx1ZSBpc1xuICAgICAgICAgIC8vIGhpZ2hlci1wcmlvcml0eSB0aGFuIHdoYXQncyBhbHJlYWR5IGJlZW4gcmVuZGVyZWQuXG4gICAgICAgICAgaWYgKGluZGV4ID4gLTEgJiYgaW5kZXggPCBfdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4KSB7XG4gICAgICAgICAgICBfdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgICBfdGhpcy5zZXRWYWx1ZShyZXN1bHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG5cbiAgb3ZlcnJpZGUgZGlzY29ubmVjdGVkKCkge1xuICAgIHRoaXMuX193ZWFrVGhpcy5kaXNjb25uZWN0KCk7XG4gICAgdGhpcy5fX3BhdXNlci5wYXVzZSgpO1xuICB9XG5cbiAgb3ZlcnJpZGUgcmVjb25uZWN0ZWQoKSB7XG4gICAgdGhpcy5fX3dlYWtUaGlzLnJlY29ubmVjdCh0aGlzKTtcbiAgICB0aGlzLl9fcGF1c2VyLnJlc3VtZSgpO1xuICB9XG59XG5cbi8qKlxuICogUmVuZGVycyBvbmUgb2YgYSBzZXJpZXMgb2YgdmFsdWVzLCBpbmNsdWRpbmcgUHJvbWlzZXMsIHRvIGEgUGFydC5cbiAqXG4gKiBWYWx1ZXMgYXJlIHJlbmRlcmVkIGluIHByaW9yaXR5IG9yZGVyLCB3aXRoIHRoZSBmaXJzdCBhcmd1bWVudCBoYXZpbmcgdGhlXG4gKiBoaWdoZXN0IHByaW9yaXR5IGFuZCB0aGUgbGFzdCBhcmd1bWVudCBoYXZpbmcgdGhlIGxvd2VzdCBwcmlvcml0eS4gSWYgYVxuICogdmFsdWUgaXMgYSBQcm9taXNlLCBsb3ctcHJpb3JpdHkgdmFsdWVzIHdpbGwgYmUgcmVuZGVyZWQgdW50aWwgaXQgcmVzb2x2ZXMuXG4gKlxuICogVGhlIHByaW9yaXR5IG9mIHZhbHVlcyBjYW4gYmUgdXNlZCB0byBjcmVhdGUgcGxhY2Vob2xkZXIgY29udGVudCBmb3IgYXN5bmNcbiAqIGRhdGEuIEZvciBleGFtcGxlLCBhIFByb21pc2Ugd2l0aCBwZW5kaW5nIGNvbnRlbnQgY2FuIGJlIHRoZSBmaXJzdCxcbiAqIGhpZ2hlc3QtcHJpb3JpdHksIGFyZ3VtZW50LCBhbmQgYSBub25fcHJvbWlzZSBsb2FkaW5nIGluZGljYXRvciB0ZW1wbGF0ZSBjYW5cbiAqIGJlIHVzZWQgYXMgdGhlIHNlY29uZCwgbG93ZXItcHJpb3JpdHksIGFyZ3VtZW50LiBUaGUgbG9hZGluZyBpbmRpY2F0b3Igd2lsbFxuICogcmVuZGVyIGltbWVkaWF0ZWx5LCBhbmQgdGhlIHByaW1hcnkgY29udGVudCB3aWxsIHJlbmRlciB3aGVuIHRoZSBQcm9taXNlXG4gKiByZXNvbHZlcy5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBjb25zdCBjb250ZW50ID0gZmV0Y2goJy4vY29udGVudC50eHQnKS50aGVuKHIgPT4gci50ZXh0KCkpO1xuICogaHRtbGAke3VudGlsKGNvbnRlbnQsIGh0bWxgPHNwYW4+TG9hZGluZy4uLjwvc3Bhbj5gKX1gXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHVudGlsID0gZGlyZWN0aXZlKFVudGlsRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbi8vIGV4cG9ydCB0eXBlIHtVbnRpbERpcmVjdGl2ZX07XG4iLCJleHBvcnQge1xuICAgIFRlbXBsYXRlUmVzdWx0LFxuICAgIEhUTUxUZW1wbGF0ZVJlc3VsdCxcbiAgICBTVkdUZW1wbGF0ZVJlc3VsdCxcbiAgICBSZW5kZXJPcHRpb25zLFxuICAgIGh0bWwsXG4gICAgc3ZnLFxuICAgIHJlbmRlcixcbiAgICBub0NoYW5nZSxcbiAgICBub3RoaW5nLFxufSBmcm9tICdsaXQtaHRtbCc7XG5cbmltcG9ydCB7XG4gICAgXyRMSCxcbiAgICBBdHRyaWJ1dGVQYXJ0LFxuICAgIFByb3BlcnR5UGFydCxcbiAgICBCb29sZWFuQXR0cmlidXRlUGFydCxcbiAgICBFdmVudFBhcnQsXG4gICAgRWxlbWVudFBhcnQsXG59IGZyb20gJ2xpdC1odG1sJztcbmV4cG9ydCBjb25zdCBfzqMgPSB7XG4gICAgQXR0cmlidXRlUGFydDogXyRMSC5fQXR0cmlidXRlUGFydCBhcyB1bmtub3duIGFzIEF0dHJpYnV0ZVBhcnQsXG4gICAgUHJvcGVydHlQYXJ0OiBfJExILl9Qcm9wZXJ0eVBhcnQgYXMgdW5rbm93biBhcyBQcm9wZXJ0eVBhcnQsXG4gICAgQm9vbGVhbkF0dHJpYnV0ZVBhcnQ6IF8kTEguX0Jvb2xlYW5BdHRyaWJ1dGVQYXJ0IGFzIHVua25vd24gYXMgQm9vbGVhbkF0dHJpYnV0ZVBhcnQsXG4gICAgRXZlbnRQYXJ0OiBfJExILl9FdmVudFBhcnQgYXMgdW5rbm93biBhcyBFdmVudFBhcnQsXG4gICAgRWxlbWVudFBhcnQ6IF8kTEguX0VsZW1lbnRQYXJ0IGFzIHVua25vd24gYXMgRWxlbWVudFBhcnQsXG59O1xuXG5leHBvcnQge1xuICAgIERpcmVjdGl2ZSxcbiAgICBEaXJlY3RpdmVQYXJhbWV0ZXJzLFxuICAgIFBhcnQsXG4gICAgUGFydEluZm8sXG4gICAgUGFydFR5cGUsXG4gICAgZGlyZWN0aXZlLFxufSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmUnO1xuZXhwb3J0IHsgQXN5bmNEaXJlY3RpdmUgfSBmcm9tICdsaXQtaHRtbC9hc3luYy1kaXJlY3RpdmUnO1xuXG5pbXBvcnQgeyBhc3luY0FwcGVuZCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvYXN5bmMtYXBwZW5kJztcbmltcG9ydCB7IGFzeW5jUmVwbGFjZSB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvYXN5bmMtcmVwbGFjZSc7XG5pbXBvcnQgeyBjYWNoZSB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvY2FjaGUnO1xuaW1wb3J0IHsgY2xhc3NNYXAgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2NsYXNzLW1hcCc7XG5pbXBvcnQgeyBndWFyZCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvZ3VhcmQnO1xuaW1wb3J0IHsgaWZEZWZpbmVkIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9pZi1kZWZpbmVkJztcbmltcG9ydCB7IGxpdmUgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2xpdmUnO1xuaW1wb3J0IHsgcmVmIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9yZWYnO1xuZXhwb3J0IHsgUmVmLCBjcmVhdGVSZWYgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3JlZic7XG5pbXBvcnQgeyByZXBlYXQgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3JlcGVhdCc7XG5pbXBvcnQgeyBzdHlsZU1hcCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvc3R5bGUtbWFwJztcbmltcG9ydCB7IHRlbXBsYXRlQ29udGVudCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvdGVtcGxhdGUtY29udGVudCc7XG5pbXBvcnQgeyB1bnNhZmVIVE1MIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy91bnNhZmUtaHRtbCc7XG5pbXBvcnQgeyB1bnNhZmVTVkcgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3Vuc2FmZS1zdmcnO1xuaW1wb3J0IHsgdW50aWwgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3VudGlsJztcblxuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZURpcmVjdGl2ZXMge1xuICAgIGFzeW5jQXBwZW5kOiB0eXBlb2YgYXN5bmNBcHBlbmQ7XG4gICAgYXN5bmNSZXBsYWNlOiB0eXBlb2YgYXN5bmNSZXBsYWNlO1xuICAgIGNhY2hlOiB0eXBlb2YgY2FjaGU7XG4gICAgY2xhc3NNYXA6IHR5cGVvZiBjbGFzc01hcDtcbiAgICBndWFyZDogdHlwZW9mIGd1YXJkO1xuICAgIGlmRGVmaW5lZDogdHlwZW9mIGlmRGVmaW5lZDtcbiAgICBsaXZlOiB0eXBlb2YgbGl2ZTtcbiAgICByZWY6IHR5cGVvZiByZWY7XG4gICAgcmVwZWF0OiB0eXBlb2YgcmVwZWF0O1xuICAgIHN0eWxlTWFwOiB0eXBlb2Ygc3R5bGVNYXA7XG4gICAgdGVtcGxhdGVDb250ZW50OiB0eXBlb2YgdGVtcGxhdGVDb250ZW50O1xuICAgIHVuc2FmZUhUTUw6IHR5cGVvZiB1bnNhZmVIVE1MO1xuICAgIHVuc2FmZVNWRzogdHlwZW9mIHVuc2FmZVNWRztcbiAgICB1bnRpbDogdHlwZW9mIHVudGlsO1xufVxuXG5leHBvcnQgY29uc3QgZGlyZWN0aXZlczogVGVtcGxhdGVEaXJlY3RpdmVzID0ge1xuICAgIGFzeW5jQXBwZW5kLFxuICAgIGFzeW5jUmVwbGFjZSxcbiAgICBjYWNoZSxcbiAgICBjbGFzc01hcCxcbiAgICBndWFyZCxcbiAgICBpZkRlZmluZWQsXG4gICAgbGl2ZSxcbiAgICByZWYsXG4gICAgcmVwZWF0LFxuICAgIHN0eWxlTWFwLFxuICAgIHRlbXBsYXRlQ29udGVudCxcbiAgICB1bnNhZmVIVE1MLFxuICAgIHVuc2FmZVNWRyxcbiAgICB1bnRpbCxcbn07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZnJvbSBgc3RyaW5nYCB0byBgVGVtcGxhdGVTdHJpbmdzQXJyYXlgLiA8YnI+XG4gKiAgICAgVGhpcyBtZXRob2QgaXMgaGVscGVyIGJyaWdkZ2UgZm9yIHRoZSBbW2h0bWxdXSBvciB0aGUgW1tzdmddXSBhcmUgYWJsZSB0byByZWNlaXZlZCBwbGFpbiBzdHJpbmcuXG4gKiBAamEgYHN0cmluZ2Ag44KSIGBUZW1wbGF0ZVN0cmluZ3NBcnJheWDjgavlpInmj5suIDxicj5cbiAqICAgICBbW2h0bWxdXSDjgoQgW1tzdmddXSDjgYzmloflrZfliJfjgpLlj5fjgZHku5jjgZHjgovjgZ/jgoHjga7jg5bjg6rjg4Pjgrjjg6Hjgr3jg4Pjg4lcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IHRvVGVtcGxhdGVTdHJpbmdzQXJyYXkgYXMgYnJpZGdlIH0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuICpcbiAqIGNvbnN0IHJhdyA9ICc8cD5IZWxsbyBSYXcgU3RyaW5nPC9wPic7XG4gKiByZW5kZXIoaHRtbChicmlkZ2UocmF3KSksIGRvY3VtZW50LmJvZHkpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBwbGFpbiBzdHJpbmcuIGV4KSBbW0pTVF1dIHJldHVybmVkIHZhbHVlLlxuICogIC0gYGphYCDjg5fjg6zjg7zjg7PmloflrZfliJcuIGV4KSBbW0pTVF1dIOOBruaIu+OCiuWApOOBquOBqeOCkuaDs+WumlxuICovXG5leHBvcnQgY29uc3QgdG9UZW1wbGF0ZVN0cmluZ3NBcnJheSA9IChzcmM6IHN0cmluZyk6IFRlbXBsYXRlU3RyaW5nc0FycmF5ID0+IHtcbiAgICBjb25zdCB0YSA9IFtzcmNdIGFzIHsgcmF3Pzogc3RyaW5nW107IH07XG4gICAgdGEucmF3ID0gW3NyY107XG4gICAgcmV0dXJuIHRhIGFzIHVua25vd24gYXMgVGVtcGxhdGVTdHJpbmdzQXJyYXk7XG59O1xuIl0sIm5hbWVzIjpbIndyYXAiLCJjcmVhdGVNYXJrZXIi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
