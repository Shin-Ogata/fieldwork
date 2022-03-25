/*!
 * @cdp/extension-template 0.9.10
 *   extension for template engine
 */

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
var _d;
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
const polyfillSupport = window.litHtmlPolyfillSupport;
polyfillSupport === null || polyfillSupport === void 0 ? void 0 : polyfillSupport(Template, ChildPart$1);
// IMPORTANT: do not change the property name or the assignment expression.
// This line will be used in regexes to search for lit-html usage.
((_d = globalThis.litHtmlVersions) !== null && _d !== void 0 ? _d : (globalThis.litHtmlVersions = [])).push('2.2.1');

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
 * `live()` performs a strict equality check agains the live DOM value, and if
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
 *  - `en` plain string / string array. ex) [[JST]] returned value.
 *  - `ja` プレーン文字列 / 文字列配列. ex) [[JST]] の戻り値などを想定
 */
const toTemplateStringsArray = (src) => {
    const strings = Array.isArray(src) ? src : [src];
    if (!Object.prototype.hasOwnProperty.call(strings, 'raw')) {
        Object.defineProperty(strings, 'raw', { value: strings });
    }
    return strings;
};

export { AsyncDirective, Directive, PartType, _Σ, createRef, directive, directives, html, noChange, nothing, render, svg, toTemplateStringsArray };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLm1qcyIsInNvdXJjZXMiOlsibGl0LWh0bWwvc3JjL2xpdC1odG1sLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZS50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmUtaGVscGVycy50cyIsImxpdC1odG1sL3NyYy9hc3luYy1kaXJlY3RpdmUudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9yZWYudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9wcml2YXRlLWFzeW5jLWhlbHBlcnMudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9hc3luYy1yZXBsYWNlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvYXN5bmMtYXBwZW5kLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvY2FjaGUudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9jaG9vc2UudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9jbGFzcy1tYXAudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9ndWFyZC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2lmLWRlZmluZWQudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9qb2luLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMva2V5ZWQudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9saXZlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvbWFwLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvcmFuZ2UudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9yZXBlYXQudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9zdHlsZS1tYXAudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy90ZW1wbGF0ZS1jb250ZW50LnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvdW5zYWZlLWh0bWwudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy91bnNhZmUtc3ZnLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvdW50aWwudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy93aGVuLnRzIiwiaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbi8vIElNUE9SVEFOVDogdGhlc2UgaW1wb3J0cyBtdXN0IGJlIHR5cGUtb25seVxuaW1wb3J0IHR5cGUge0RpcmVjdGl2ZSwgRGlyZWN0aXZlUmVzdWx0LCBQYXJ0SW5mb30gZnJvbSAnLi9kaXJlY3RpdmUuanMnO1xuXG5jb25zdCBERVZfTU9ERSA9IHRydWU7XG5jb25zdCBFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MgPSB0cnVlO1xuY29uc3QgRU5BQkxFX1NIQURZRE9NX05PUEFUQ0ggPSB0cnVlO1xuXG4vKipcbiAqIENvbnRhaW5zIHR5cGVzIHRoYXQgYXJlIHBhcnQgb2YgdGhlIHVuc3RhYmxlIGRlYnVnIEFQSS5cbiAqXG4gKiBFdmVyeXRoaW5nIGluIHRoaXMgQVBJIGlzIG5vdCBzdGFibGUgYW5kIG1heSBjaGFuZ2Ugb3IgYmUgcmVtb3ZlZCBpbiB0aGUgZnV0dXJlLFxuICogZXZlbiBvbiBwYXRjaCByZWxlYXNlcy5cbiAqL1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbmV4cG9ydCBuYW1lc3BhY2UgTGl0VW5zdGFibGUge1xuICAvKipcbiAgICogV2hlbiBMaXQgaXMgcnVubmluZyBpbiBkZXYgbW9kZSBhbmQgYHdpbmRvdy5lbWl0TGl0RGVidWdMb2dFdmVudHNgIGlzIHRydWUsXG4gICAqIHdlIHdpbGwgZW1pdCAnbGl0LWRlYnVnJyBldmVudHMgdG8gd2luZG93LCB3aXRoIGxpdmUgZGV0YWlscyBhYm91dCB0aGUgdXBkYXRlIGFuZCByZW5kZXJcbiAgICogbGlmZWN5Y2xlLiBUaGVzZSBjYW4gYmUgdXNlZnVsIGZvciB3cml0aW5nIGRlYnVnIHRvb2xpbmcgYW5kIHZpc3VhbGl6YXRpb25zLlxuICAgKlxuICAgKiBQbGVhc2UgYmUgYXdhcmUgdGhhdCBydW5uaW5nIHdpdGggd2luZG93LmVtaXRMaXREZWJ1Z0xvZ0V2ZW50cyBoYXMgcGVyZm9ybWFuY2Ugb3ZlcmhlYWQsXG4gICAqIG1ha2luZyBjZXJ0YWluIG9wZXJhdGlvbnMgdGhhdCBhcmUgbm9ybWFsbHkgdmVyeSBjaGVhcCAobGlrZSBhIG5vLW9wIHJlbmRlcikgbXVjaCBzbG93ZXIsXG4gICAqIGJlY2F1c2Ugd2UgbXVzdCBjb3B5IGRhdGEgYW5kIGRpc3BhdGNoIGV2ZW50cy5cbiAgICovXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlXG4gIGV4cG9ydCBuYW1lc3BhY2UgRGVidWdMb2cge1xuICAgIGV4cG9ydCB0eXBlIEVudHJ5ID1cbiAgICAgIHwgVGVtcGxhdGVQcmVwXG4gICAgICB8IFRlbXBsYXRlSW5zdGFudGlhdGVkXG4gICAgICB8IFRlbXBsYXRlSW5zdGFudGlhdGVkQW5kVXBkYXRlZFxuICAgICAgfCBUZW1wbGF0ZVVwZGF0aW5nXG4gICAgICB8IEJlZ2luUmVuZGVyXG4gICAgICB8IEVuZFJlbmRlclxuICAgICAgfCBDb21taXRQYXJ0RW50cnlcbiAgICAgIHwgU2V0UGFydFZhbHVlO1xuICAgIGV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVQcmVwIHtcbiAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSBwcmVwJztcbiAgICAgIHRlbXBsYXRlOiBUZW1wbGF0ZTtcbiAgICAgIHN0cmluZ3M6IFRlbXBsYXRlU3RyaW5nc0FycmF5O1xuICAgICAgY2xvbmFibGVUZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudDtcbiAgICAgIHBhcnRzOiBUZW1wbGF0ZVBhcnRbXTtcbiAgICB9XG4gICAgZXhwb3J0IGludGVyZmFjZSBCZWdpblJlbmRlciB7XG4gICAgICBraW5kOiAnYmVnaW4gcmVuZGVyJztcbiAgICAgIGlkOiBudW1iZXI7XG4gICAgICB2YWx1ZTogdW5rbm93bjtcbiAgICAgIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCBEb2N1bWVudEZyYWdtZW50O1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICAgIHBhcnQ6IENoaWxkUGFydCB8IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZXhwb3J0IGludGVyZmFjZSBFbmRSZW5kZXIge1xuICAgICAga2luZDogJ2VuZCByZW5kZXInO1xuICAgICAgaWQ6IG51bWJlcjtcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgY29udGFpbmVyOiBIVE1MRWxlbWVudCB8IERvY3VtZW50RnJhZ21lbnQ7XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgICAgcGFydDogQ2hpbGRQYXJ0O1xuICAgIH1cbiAgICBleHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlSW5zdGFudGlhdGVkIHtcbiAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSBpbnN0YW50aWF0ZWQnO1xuICAgICAgdGVtcGxhdGU6IFRlbXBsYXRlIHwgQ29tcGlsZWRUZW1wbGF0ZTtcbiAgICAgIGluc3RhbmNlOiBUZW1wbGF0ZUluc3RhbmNlO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICAgIGZyYWdtZW50OiBOb2RlO1xuICAgICAgcGFydHM6IEFycmF5PFBhcnQgfCB1bmRlZmluZWQ+O1xuICAgICAgdmFsdWVzOiB1bmtub3duW107XG4gICAgfVxuICAgIGV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVJbnN0YW50aWF0ZWRBbmRVcGRhdGVkIHtcbiAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSBpbnN0YW50aWF0ZWQgYW5kIHVwZGF0ZWQnO1xuICAgICAgdGVtcGxhdGU6IFRlbXBsYXRlIHwgQ29tcGlsZWRUZW1wbGF0ZTtcbiAgICAgIGluc3RhbmNlOiBUZW1wbGF0ZUluc3RhbmNlO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICAgIGZyYWdtZW50OiBOb2RlO1xuICAgICAgcGFydHM6IEFycmF5PFBhcnQgfCB1bmRlZmluZWQ+O1xuICAgICAgdmFsdWVzOiB1bmtub3duW107XG4gICAgfVxuICAgIGV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVVcGRhdGluZyB7XG4gICAgICBraW5kOiAndGVtcGxhdGUgdXBkYXRpbmcnO1xuICAgICAgdGVtcGxhdGU6IFRlbXBsYXRlIHwgQ29tcGlsZWRUZW1wbGF0ZTtcbiAgICAgIGluc3RhbmNlOiBUZW1wbGF0ZUluc3RhbmNlO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICAgIHBhcnRzOiBBcnJheTxQYXJ0IHwgdW5kZWZpbmVkPjtcbiAgICAgIHZhbHVlczogdW5rbm93bltdO1xuICAgIH1cbiAgICBleHBvcnQgaW50ZXJmYWNlIFNldFBhcnRWYWx1ZSB7XG4gICAgICBraW5kOiAnc2V0IHBhcnQnO1xuICAgICAgcGFydDogUGFydDtcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgdmFsdWVJbmRleDogbnVtYmVyO1xuICAgICAgdmFsdWVzOiB1bmtub3duW107XG4gICAgICB0ZW1wbGF0ZUluc3RhbmNlOiBUZW1wbGF0ZUluc3RhbmNlO1xuICAgIH1cblxuICAgIGV4cG9ydCB0eXBlIENvbW1pdFBhcnRFbnRyeSA9XG4gICAgICB8IENvbW1pdE5vdGhpbmdUb0NoaWxkRW50cnlcbiAgICAgIHwgQ29tbWl0VGV4dFxuICAgICAgfCBDb21taXROb2RlXG4gICAgICB8IENvbW1pdEF0dHJpYnV0ZVxuICAgICAgfCBDb21taXRQcm9wZXJ0eVxuICAgICAgfCBDb21taXRCb29sZWFuQXR0cmlidXRlXG4gICAgICB8IENvbW1pdEV2ZW50TGlzdGVuZXJcbiAgICAgIHwgQ29tbWl0VG9FbGVtZW50QmluZGluZztcblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0Tm90aGluZ1RvQ2hpbGRFbnRyeSB7XG4gICAgICBraW5kOiAnY29tbWl0IG5vdGhpbmcgdG8gY2hpbGQnO1xuICAgICAgc3RhcnQ6IENoaWxkTm9kZTtcbiAgICAgIGVuZDogQ2hpbGROb2RlIHwgbnVsbDtcbiAgICAgIHBhcmVudDogRGlzY29ubmVjdGFibGUgfCB1bmRlZmluZWQ7XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0VGV4dCB7XG4gICAgICBraW5kOiAnY29tbWl0IHRleHQnO1xuICAgICAgbm9kZTogVGV4dDtcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBleHBvcnQgaW50ZXJmYWNlIENvbW1pdE5vZGUge1xuICAgICAga2luZDogJ2NvbW1pdCBub2RlJztcbiAgICAgIHN0YXJ0OiBOb2RlO1xuICAgICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSB8IHVuZGVmaW5lZDtcbiAgICAgIHZhbHVlOiBOb2RlO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBleHBvcnQgaW50ZXJmYWNlIENvbW1pdEF0dHJpYnV0ZSB7XG4gICAgICBraW5kOiAnY29tbWl0IGF0dHJpYnV0ZSc7XG4gICAgICBlbGVtZW50OiBFbGVtZW50O1xuICAgICAgbmFtZTogc3RyaW5nO1xuICAgICAgdmFsdWU6IHVua25vd247XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0UHJvcGVydHkge1xuICAgICAga2luZDogJ2NvbW1pdCBwcm9wZXJ0eSc7XG4gICAgICBlbGVtZW50OiBFbGVtZW50O1xuICAgICAgbmFtZTogc3RyaW5nO1xuICAgICAgdmFsdWU6IHVua25vd247XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0Qm9vbGVhbkF0dHJpYnV0ZSB7XG4gICAgICBraW5kOiAnY29tbWl0IGJvb2xlYW4gYXR0cmlidXRlJztcbiAgICAgIGVsZW1lbnQ6IEVsZW1lbnQ7XG4gICAgICBuYW1lOiBzdHJpbmc7XG4gICAgICB2YWx1ZTogYm9vbGVhbjtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZXhwb3J0IGludGVyZmFjZSBDb21taXRFdmVudExpc3RlbmVyIHtcbiAgICAgIGtpbmQ6ICdjb21taXQgZXZlbnQgbGlzdGVuZXInO1xuICAgICAgZWxlbWVudDogRWxlbWVudDtcbiAgICAgIG5hbWU6IHN0cmluZztcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgb2xkTGlzdGVuZXI6IHVua25vd247XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgICAgLy8gVHJ1ZSBpZiB3ZSdyZSByZW1vdmluZyB0aGUgb2xkIGV2ZW50IGxpc3RlbmVyIChlLmcuIGJlY2F1c2Ugc2V0dGluZ3MgY2hhbmdlZCwgb3IgdmFsdWUgaXMgbm90aGluZylcbiAgICAgIHJlbW92ZUxpc3RlbmVyOiBib29sZWFuO1xuICAgICAgLy8gVHJ1ZSBpZiB3ZSdyZSBhZGRpbmcgYSBuZXcgZXZlbnQgbGlzdGVuZXIgKGUuZy4gYmVjYXVzZSBmaXJzdCByZW5kZXIsIG9yIHNldHRpbmdzIGNoYW5nZWQpXG4gICAgICBhZGRMaXN0ZW5lcjogYm9vbGVhbjtcbiAgICB9XG5cbiAgICBleHBvcnQgaW50ZXJmYWNlIENvbW1pdFRvRWxlbWVudEJpbmRpbmcge1xuICAgICAga2luZDogJ2NvbW1pdCB0byBlbGVtZW50IGJpbmRpbmcnO1xuICAgICAgZWxlbWVudDogRWxlbWVudDtcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cbn1cblxuaW50ZXJmYWNlIERlYnVnTG9nZ2luZ1dpbmRvdyB7XG4gIC8vIEV2ZW4gaW4gZGV2IG1vZGUsIHdlIGdlbmVyYWxseSBkb24ndCB3YW50IHRvIGVtaXQgdGhlc2UgZXZlbnRzLCBhcyB0aGF0J3NcbiAgLy8gYW5vdGhlciBsZXZlbCBvZiBjb3N0LCBzbyBvbmx5IGVtaXQgdGhlbSB3aGVuIERFVl9NT0RFIGlzIHRydWUgX2FuZF8gd2hlblxuICAvLyB3aW5kb3cuZW1pdExpdERlYnVnRXZlbnRzIGlzIHRydWUuXG4gIGVtaXRMaXREZWJ1Z0xvZ0V2ZW50cz86IGJvb2xlYW47XG59XG5cbi8qKlxuICogVXNlZnVsIGZvciB2aXN1YWxpemluZyBhbmQgbG9nZ2luZyBpbnNpZ2h0cyBpbnRvIHdoYXQgdGhlIExpdCB0ZW1wbGF0ZSBzeXN0ZW0gaXMgZG9pbmcuXG4gKlxuICogQ29tcGlsZWQgb3V0IG9mIHByb2QgbW9kZSBidWlsZHMuXG4gKi9cbmNvbnN0IGRlYnVnTG9nRXZlbnQgPSBERVZfTU9ERVxuICA/IChldmVudDogTGl0VW5zdGFibGUuRGVidWdMb2cuRW50cnkpID0+IHtcbiAgICAgIGNvbnN0IHNob3VsZEVtaXQgPSAod2luZG93IGFzIHVua25vd24gYXMgRGVidWdMb2dnaW5nV2luZG93KVxuICAgICAgICAuZW1pdExpdERlYnVnTG9nRXZlbnRzO1xuICAgICAgaWYgKCFzaG91bGRFbWl0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KFxuICAgICAgICBuZXcgQ3VzdG9tRXZlbnQ8TGl0VW5zdGFibGUuRGVidWdMb2cuRW50cnk+KCdsaXQtZGVidWcnLCB7XG4gICAgICAgICAgZGV0YWlsOiBldmVudCxcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICA6IHVuZGVmaW5lZDtcbi8vIFVzZWQgZm9yIGNvbm5lY3RpbmcgYmVnaW5SZW5kZXIgYW5kIGVuZFJlbmRlciBldmVudHMgd2hlbiB0aGVyZSBhcmUgbmVzdGVkXG4vLyByZW5kZXJzIHdoZW4gZXJyb3JzIGFyZSB0aHJvd24gcHJldmVudGluZyBhbiBlbmRSZW5kZXIgZXZlbnQgZnJvbSBiZWluZ1xuLy8gY2FsbGVkLlxubGV0IGRlYnVnTG9nUmVuZGVySWQgPSAwO1xuXG4vKipcbiAqIGB0cnVlYCBpZiB3ZSdyZSBidWlsZGluZyBmb3IgZ29vZ2xlMyB3aXRoIHRlbXBvcmFyeSBiYWNrLWNvbXBhdCBoZWxwZXJzLlxuICogVGhpcyBleHBvcnQgaXMgbm90IHByZXNlbnQgaW4gcHJvZCBidWlsZHMuXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGNvbnN0IElOVEVSTkFMID0gdHJ1ZTtcblxubGV0IGlzc3VlV2FybmluZzogKGNvZGU6IHN0cmluZywgd2FybmluZzogc3RyaW5nKSA9PiB2b2lkO1xuXG5pZiAoREVWX01PREUpIHtcbiAgZ2xvYmFsVGhpcy5saXRJc3N1ZWRXYXJuaW5ncyA/Pz0gbmV3IFNldCgpO1xuXG4gIC8vIElzc3VlIGEgd2FybmluZywgaWYgd2UgaGF2ZW4ndCBhbHJlYWR5LlxuICBpc3N1ZVdhcm5pbmcgPSAoY29kZTogc3RyaW5nLCB3YXJuaW5nOiBzdHJpbmcpID0+IHtcbiAgICB3YXJuaW5nICs9IGNvZGVcbiAgICAgID8gYCBTZWUgaHR0cHM6Ly9saXQuZGV2L21zZy8ke2NvZGV9IGZvciBtb3JlIGluZm9ybWF0aW9uLmBcbiAgICAgIDogJyc7XG4gICAgaWYgKCFnbG9iYWxUaGlzLmxpdElzc3VlZFdhcm5pbmdzIS5oYXMod2FybmluZykpIHtcbiAgICAgIGNvbnNvbGUud2Fybih3YXJuaW5nKTtcbiAgICAgIGdsb2JhbFRoaXMubGl0SXNzdWVkV2FybmluZ3MhLmFkZCh3YXJuaW5nKTtcbiAgICB9XG4gIH07XG5cbiAgaXNzdWVXYXJuaW5nKFxuICAgICdkZXYtbW9kZScsXG4gICAgYExpdCBpcyBpbiBkZXYgbW9kZS4gTm90IHJlY29tbWVuZGVkIGZvciBwcm9kdWN0aW9uIWBcbiAgKTtcbn1cblxuY29uc3Qgd3JhcCA9XG4gIEVOQUJMRV9TSEFEWURPTV9OT1BBVENIICYmXG4gIHdpbmRvdy5TaGFkeURPTT8uaW5Vc2UgJiZcbiAgd2luZG93LlNoYWR5RE9NPy5ub1BhdGNoID09PSB0cnVlXG4gICAgPyB3aW5kb3cuU2hhZHlET00hLndyYXBcbiAgICA6IChub2RlOiBOb2RlKSA9PiBub2RlO1xuXG5jb25zdCB0cnVzdGVkVHlwZXMgPSAoZ2xvYmFsVGhpcyBhcyB1bmtub3duIGFzIFBhcnRpYWw8V2luZG93PikudHJ1c3RlZFR5cGVzO1xuXG4vKipcbiAqIE91ciBUcnVzdGVkVHlwZVBvbGljeSBmb3IgSFRNTCB3aGljaCBpcyBkZWNsYXJlZCB1c2luZyB0aGUgaHRtbCB0ZW1wbGF0ZVxuICogdGFnIGZ1bmN0aW9uLlxuICpcbiAqIFRoYXQgSFRNTCBpcyBhIGRldmVsb3Blci1hdXRob3JlZCBjb25zdGFudCwgYW5kIGlzIHBhcnNlZCB3aXRoIGlubmVySFRNTFxuICogYmVmb3JlIGFueSB1bnRydXN0ZWQgZXhwcmVzc2lvbnMgaGF2ZSBiZWVuIG1peGVkIGluLiBUaGVyZWZvciBpdCBpc1xuICogY29uc2lkZXJlZCBzYWZlIGJ5IGNvbnN0cnVjdGlvbi5cbiAqL1xuY29uc3QgcG9saWN5ID0gdHJ1c3RlZFR5cGVzXG4gID8gdHJ1c3RlZFR5cGVzLmNyZWF0ZVBvbGljeSgnbGl0LWh0bWwnLCB7XG4gICAgICBjcmVhdGVIVE1MOiAocykgPT4gcyxcbiAgICB9KVxuICA6IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBVc2VkIHRvIHNhbml0aXplIGFueSB2YWx1ZSBiZWZvcmUgaXQgaXMgd3JpdHRlbiBpbnRvIHRoZSBET00uIFRoaXMgY2FuIGJlXG4gKiB1c2VkIHRvIGltcGxlbWVudCBhIHNlY3VyaXR5IHBvbGljeSBvZiBhbGxvd2VkIGFuZCBkaXNhbGxvd2VkIHZhbHVlcyBpblxuICogb3JkZXIgdG8gcHJldmVudCBYU1MgYXR0YWNrcy5cbiAqXG4gKiBPbmUgd2F5IG9mIHVzaW5nIHRoaXMgY2FsbGJhY2sgd291bGQgYmUgdG8gY2hlY2sgYXR0cmlidXRlcyBhbmQgcHJvcGVydGllc1xuICogYWdhaW5zdCBhIGxpc3Qgb2YgaGlnaCByaXNrIGZpZWxkcywgYW5kIHJlcXVpcmUgdGhhdCB2YWx1ZXMgd3JpdHRlbiB0byBzdWNoXG4gKiBmaWVsZHMgYmUgaW5zdGFuY2VzIG9mIGEgY2xhc3Mgd2hpY2ggaXMgc2FmZSBieSBjb25zdHJ1Y3Rpb24uIENsb3N1cmUncyBTYWZlXG4gKiBIVE1MIFR5cGVzIGlzIG9uZSBpbXBsZW1lbnRhdGlvbiBvZiB0aGlzIHRlY2huaXF1ZSAoXG4gKiBodHRwczovL2dpdGh1Yi5jb20vZ29vZ2xlL3NhZmUtaHRtbC10eXBlcy9ibG9iL21hc3Rlci9kb2Mvc2FmZWh0bWwtdHlwZXMubWQpLlxuICogVGhlIFRydXN0ZWRUeXBlcyBwb2x5ZmlsbCBpbiBBUEktb25seSBtb2RlIGNvdWxkIGFsc28gYmUgdXNlZCBhcyBhIGJhc2lzXG4gKiBmb3IgdGhpcyB0ZWNobmlxdWUgKGh0dHBzOi8vZ2l0aHViLmNvbS9XSUNHL3RydXN0ZWQtdHlwZXMpLlxuICpcbiAqIEBwYXJhbSBub2RlIFRoZSBIVE1MIG5vZGUgKHVzdWFsbHkgZWl0aGVyIGEgI3RleHQgbm9kZSBvciBhbiBFbGVtZW50KSB0aGF0XG4gKiAgICAgaXMgYmVpbmcgd3JpdHRlbiB0by4gTm90ZSB0aGF0IHRoaXMgaXMganVzdCBhbiBleGVtcGxhciBub2RlLCB0aGUgd3JpdGVcbiAqICAgICBtYXkgdGFrZSBwbGFjZSBhZ2FpbnN0IGFub3RoZXIgaW5zdGFuY2Ugb2YgdGhlIHNhbWUgY2xhc3Mgb2Ygbm9kZS5cbiAqIEBwYXJhbSBuYW1lIFRoZSBuYW1lIG9mIGFuIGF0dHJpYnV0ZSBvciBwcm9wZXJ0eSAoZm9yIGV4YW1wbGUsICdocmVmJykuXG4gKiBAcGFyYW0gdHlwZSBJbmRpY2F0ZXMgd2hldGhlciB0aGUgd3JpdGUgdGhhdCdzIGFib3V0IHRvIGJlIHBlcmZvcm1lZCB3aWxsXG4gKiAgICAgYmUgdG8gYSBwcm9wZXJ0eSBvciBhIG5vZGUuXG4gKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCB3aWxsIHNhbml0aXplIHRoaXMgY2xhc3Mgb2Ygd3JpdGVzLlxuICovXG5leHBvcnQgdHlwZSBTYW5pdGl6ZXJGYWN0b3J5ID0gKFxuICBub2RlOiBOb2RlLFxuICBuYW1lOiBzdHJpbmcsXG4gIHR5cGU6ICdwcm9wZXJ0eScgfCAnYXR0cmlidXRlJ1xuKSA9PiBWYWx1ZVNhbml0aXplcjtcblxuLyoqXG4gKiBBIGZ1bmN0aW9uIHdoaWNoIGNhbiBzYW5pdGl6ZSB2YWx1ZXMgdGhhdCB3aWxsIGJlIHdyaXR0ZW4gdG8gYSBzcGVjaWZpYyBraW5kXG4gKiBvZiBET00gc2luay5cbiAqXG4gKiBTZWUgU2FuaXRpemVyRmFjdG9yeS5cbiAqXG4gKiBAcGFyYW0gdmFsdWUgVGhlIHZhbHVlIHRvIHNhbml0aXplLiBXaWxsIGJlIHRoZSBhY3R1YWwgdmFsdWUgcGFzc2VkIGludG9cbiAqICAgICB0aGUgbGl0LWh0bWwgdGVtcGxhdGUgbGl0ZXJhbCwgc28gdGhpcyBjb3VsZCBiZSBvZiBhbnkgdHlwZS5cbiAqIEByZXR1cm4gVGhlIHZhbHVlIHRvIHdyaXRlIHRvIHRoZSBET00uIFVzdWFsbHkgdGhlIHNhbWUgYXMgdGhlIGlucHV0IHZhbHVlLFxuICogICAgIHVubGVzcyBzYW5pdGl6YXRpb24gaXMgbmVlZGVkLlxuICovXG5leHBvcnQgdHlwZSBWYWx1ZVNhbml0aXplciA9ICh2YWx1ZTogdW5rbm93bikgPT4gdW5rbm93bjtcblxuY29uc3QgaWRlbnRpdHlGdW5jdGlvbjogVmFsdWVTYW5pdGl6ZXIgPSAodmFsdWU6IHVua25vd24pID0+IHZhbHVlO1xuY29uc3Qgbm9vcFNhbml0aXplcjogU2FuaXRpemVyRmFjdG9yeSA9IChcbiAgX25vZGU6IE5vZGUsXG4gIF9uYW1lOiBzdHJpbmcsXG4gIF90eXBlOiAncHJvcGVydHknIHwgJ2F0dHJpYnV0ZSdcbikgPT4gaWRlbnRpdHlGdW5jdGlvbjtcblxuLyoqIFNldHMgdGhlIGdsb2JhbCBzYW5pdGl6ZXIgZmFjdG9yeS4gKi9cbmNvbnN0IHNldFNhbml0aXplciA9IChuZXdTYW5pdGl6ZXI6IFNhbml0aXplckZhY3RvcnkpID0+IHtcbiAgaWYgKCFFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKHNhbml0aXplckZhY3RvcnlJbnRlcm5hbCAhPT0gbm9vcFNhbml0aXplcikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBBdHRlbXB0ZWQgdG8gb3ZlcndyaXRlIGV4aXN0aW5nIGxpdC1odG1sIHNlY3VyaXR5IHBvbGljeS5gICtcbiAgICAgICAgYCBzZXRTYW5pdGl6ZURPTVZhbHVlRmFjdG9yeSBzaG91bGQgYmUgY2FsbGVkIGF0IG1vc3Qgb25jZS5gXG4gICAgKTtcbiAgfVxuICBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwgPSBuZXdTYW5pdGl6ZXI7XG59O1xuXG4vKipcbiAqIE9ubHkgdXNlZCBpbiBpbnRlcm5hbCB0ZXN0cywgbm90IGEgcGFydCBvZiB0aGUgcHVibGljIEFQSS5cbiAqL1xuY29uc3QgX3Rlc3RPbmx5Q2xlYXJTYW5pdGl6ZXJGYWN0b3J5RG9Ob3RDYWxsT3JFbHNlID0gKCkgPT4ge1xuICBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwgPSBub29wU2FuaXRpemVyO1xufTtcblxuY29uc3QgY3JlYXRlU2FuaXRpemVyOiBTYW5pdGl6ZXJGYWN0b3J5ID0gKG5vZGUsIG5hbWUsIHR5cGUpID0+IHtcbiAgcmV0dXJuIHNhbml0aXplckZhY3RvcnlJbnRlcm5hbChub2RlLCBuYW1lLCB0eXBlKTtcbn07XG5cbi8vIEFkZGVkIHRvIGFuIGF0dHJpYnV0ZSBuYW1lIHRvIG1hcmsgdGhlIGF0dHJpYnV0ZSBhcyBib3VuZCBzbyB3ZSBjYW4gZmluZFxuLy8gaXQgZWFzaWx5LlxuY29uc3QgYm91bmRBdHRyaWJ1dGVTdWZmaXggPSAnJGxpdCQnO1xuXG4vLyBUaGlzIG1hcmtlciBpcyB1c2VkIGluIG1hbnkgc3ludGFjdGljIHBvc2l0aW9ucyBpbiBIVE1MLCBzbyBpdCBtdXN0IGJlXG4vLyBhIHZhbGlkIGVsZW1lbnQgbmFtZSBhbmQgYXR0cmlidXRlIG5hbWUuIFdlIGRvbid0IHN1cHBvcnQgZHluYW1pYyBuYW1lcyAoeWV0KVxuLy8gYnV0IHRoaXMgYXQgbGVhc3QgZW5zdXJlcyB0aGF0IHRoZSBwYXJzZSB0cmVlIGlzIGNsb3NlciB0byB0aGUgdGVtcGxhdGVcbi8vIGludGVudGlvbi5cbmNvbnN0IG1hcmtlciA9IGBsaXQkJHtTdHJpbmcoTWF0aC5yYW5kb20oKSkuc2xpY2UoOSl9JGA7XG5cbi8vIFN0cmluZyB1c2VkIHRvIHRlbGwgaWYgYSBjb21tZW50IGlzIGEgbWFya2VyIGNvbW1lbnRcbmNvbnN0IG1hcmtlck1hdGNoID0gJz8nICsgbWFya2VyO1xuXG4vLyBUZXh0IHVzZWQgdG8gaW5zZXJ0IGEgY29tbWVudCBtYXJrZXIgbm9kZS4gV2UgdXNlIHByb2Nlc3NpbmcgaW5zdHJ1Y3Rpb25cbi8vIHN5bnRheCBiZWNhdXNlIGl0J3Mgc2xpZ2h0bHkgc21hbGxlciwgYnV0IHBhcnNlcyBhcyBhIGNvbW1lbnQgbm9kZS5cbmNvbnN0IG5vZGVNYXJrZXIgPSBgPCR7bWFya2VyTWF0Y2h9PmA7XG5cbmNvbnN0IGQgPSBkb2N1bWVudDtcblxuLy8gQ3JlYXRlcyBhIGR5bmFtaWMgbWFya2VyLiBXZSBuZXZlciBoYXZlIHRvIHNlYXJjaCBmb3IgdGhlc2UgaW4gdGhlIERPTS5cbmNvbnN0IGNyZWF0ZU1hcmtlciA9ICh2ID0gJycpID0+IGQuY3JlYXRlQ29tbWVudCh2KTtcblxuLy8gaHR0cHM6Ly90YzM5LmdpdGh1Yi5pby9lY21hMjYyLyNzZWMtdHlwZW9mLW9wZXJhdG9yXG50eXBlIFByaW1pdGl2ZSA9IG51bGwgfCB1bmRlZmluZWQgfCBib29sZWFuIHwgbnVtYmVyIHwgc3RyaW5nIHwgc3ltYm9sIHwgYmlnaW50O1xuY29uc3QgaXNQcmltaXRpdmUgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBQcmltaXRpdmUgPT5cbiAgdmFsdWUgPT09IG51bGwgfHwgKHR5cGVvZiB2YWx1ZSAhPSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsdWUgIT0gJ2Z1bmN0aW9uJyk7XG5jb25zdCBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcbmNvbnN0IGlzSXRlcmFibGUgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBJdGVyYWJsZTx1bmtub3duPiA9PlxuICBpc0FycmF5KHZhbHVlKSB8fFxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICB0eXBlb2YgKHZhbHVlIGFzIGFueSk/LltTeW1ib2wuaXRlcmF0b3JdID09PSAnZnVuY3Rpb24nO1xuXG5jb25zdCBTUEFDRV9DSEFSID0gYFsgXFx0XFxuXFxmXFxyXWA7XG5jb25zdCBBVFRSX1ZBTFVFX0NIQVIgPSBgW14gXFx0XFxuXFxmXFxyXCInXFxgPD49XWA7XG5jb25zdCBOQU1FX0NIQVIgPSBgW15cXFxcc1wiJz49L11gO1xuXG4vLyBUaGVzZSByZWdleGVzIHJlcHJlc2VudCB0aGUgZml2ZSBwYXJzaW5nIHN0YXRlcyB0aGF0IHdlIGNhcmUgYWJvdXQgaW4gdGhlXG4vLyBUZW1wbGF0ZSdzIEhUTUwgc2Nhbm5lci4gVGhleSBtYXRjaCB0aGUgKmVuZCogb2YgdGhlIHN0YXRlIHRoZXkncmUgbmFtZWRcbi8vIGFmdGVyLlxuLy8gRGVwZW5kaW5nIG9uIHRoZSBtYXRjaCwgd2UgdHJhbnNpdGlvbiB0byBhIG5ldyBzdGF0ZS4gSWYgdGhlcmUncyBubyBtYXRjaCxcbi8vIHdlIHN0YXkgaW4gdGhlIHNhbWUgc3RhdGUuXG4vLyBOb3RlIHRoYXQgdGhlIHJlZ2V4ZXMgYXJlIHN0YXRlZnVsLiBXZSB1dGlsaXplIGxhc3RJbmRleCBhbmQgc3luYyBpdFxuLy8gYWNyb3NzIHRoZSBtdWx0aXBsZSByZWdleGVzIHVzZWQuIEluIGFkZGl0aW9uIHRvIHRoZSBmaXZlIHJlZ2V4ZXMgYmVsb3dcbi8vIHdlIGFsc28gZHluYW1pY2FsbHkgY3JlYXRlIGEgcmVnZXggdG8gZmluZCB0aGUgbWF0Y2hpbmcgZW5kIHRhZ3MgZm9yIHJhd1xuLy8gdGV4dCBlbGVtZW50cy5cblxuLyoqXG4gKiBFbmQgb2YgdGV4dCBpczogYDxgIGZvbGxvd2VkIGJ5OlxuICogICAoY29tbWVudCBzdGFydCkgb3IgKHRhZykgb3IgKGR5bmFtaWMgdGFnIGJpbmRpbmcpXG4gKi9cbmNvbnN0IHRleHRFbmRSZWdleCA9IC88KD86KCEtLXxcXC9bXmEtekEtWl0pfChcXC8/W2EtekEtWl1bXj5cXHNdKil8KFxcLz8kKSkvZztcbmNvbnN0IENPTU1FTlRfU1RBUlQgPSAxO1xuY29uc3QgVEFHX05BTUUgPSAyO1xuY29uc3QgRFlOQU1JQ19UQUdfTkFNRSA9IDM7XG5cbmNvbnN0IGNvbW1lbnRFbmRSZWdleCA9IC8tLT4vZztcbi8qKlxuICogQ29tbWVudHMgbm90IHN0YXJ0ZWQgd2l0aCA8IS0tLCBsaWtlIDwveywgY2FuIGJlIGVuZGVkIGJ5IGEgc2luZ2xlIGA+YFxuICovXG5jb25zdCBjb21tZW50MkVuZFJlZ2V4ID0gLz4vZztcblxuLyoqXG4gKiBUaGUgdGFnRW5kIHJlZ2V4IG1hdGNoZXMgdGhlIGVuZCBvZiB0aGUgXCJpbnNpZGUgYW4gb3BlbmluZ1wiIHRhZyBzeW50YXhcbiAqIHBvc2l0aW9uLiBJdCBlaXRoZXIgbWF0Y2hlcyBhIGA+YCwgYW4gYXR0cmlidXRlLWxpa2Ugc2VxdWVuY2UsIG9yIHRoZSBlbmRcbiAqIG9mIHRoZSBzdHJpbmcgYWZ0ZXIgYSBzcGFjZSAoYXR0cmlidXRlLW5hbWUgcG9zaXRpb24gZW5kaW5nKS5cbiAqXG4gKiBTZWUgYXR0cmlidXRlcyBpbiB0aGUgSFRNTCBzcGVjOlxuICogaHR0cHM6Ly93d3cudzMub3JnL1RSL2h0bWw1L3N5bnRheC5odG1sI2VsZW1lbnRzLWF0dHJpYnV0ZXNcbiAqXG4gKiBcIiBcXHRcXG5cXGZcXHJcIiBhcmUgSFRNTCBzcGFjZSBjaGFyYWN0ZXJzOlxuICogaHR0cHM6Ly9pbmZyYS5zcGVjLndoYXR3Zy5vcmcvI2FzY2lpLXdoaXRlc3BhY2VcbiAqXG4gKiBTbyBhbiBhdHRyaWJ1dGUgaXM6XG4gKiAgKiBUaGUgbmFtZTogYW55IGNoYXJhY3RlciBleGNlcHQgYSB3aGl0ZXNwYWNlIGNoYXJhY3RlciwgKFwiKSwgKCcpLCBcIj5cIixcbiAqICAgIFwiPVwiLCBvciBcIi9cIi4gTm90ZTogdGhpcyBpcyBkaWZmZXJlbnQgZnJvbSB0aGUgSFRNTCBzcGVjIHdoaWNoIGFsc28gZXhjbHVkZXMgY29udHJvbCBjaGFyYWN0ZXJzLlxuICogICogRm9sbG93ZWQgYnkgemVybyBvciBtb3JlIHNwYWNlIGNoYXJhY3RlcnNcbiAqICAqIEZvbGxvd2VkIGJ5IFwiPVwiXG4gKiAgKiBGb2xsb3dlZCBieSB6ZXJvIG9yIG1vcmUgc3BhY2UgY2hhcmFjdGVyc1xuICogICogRm9sbG93ZWQgYnk6XG4gKiAgICAqIEFueSBjaGFyYWN0ZXIgZXhjZXB0IHNwYWNlLCAoJyksIChcIiksIFwiPFwiLCBcIj5cIiwgXCI9XCIsIChgKSwgb3JcbiAqICAgICogKFwiKSB0aGVuIGFueSBub24tKFwiKSwgb3JcbiAqICAgICogKCcpIHRoZW4gYW55IG5vbi0oJylcbiAqL1xuY29uc3QgdGFnRW5kUmVnZXggPSBuZXcgUmVnRXhwKFxuICBgPnwke1NQQUNFX0NIQVJ9KD86KCR7TkFNRV9DSEFSfSspKCR7U1BBQ0VfQ0hBUn0qPSR7U1BBQ0VfQ0hBUn0qKD86JHtBVFRSX1ZBTFVFX0NIQVJ9fChcInwnKXwpKXwkKWAsXG4gICdnJ1xuKTtcbmNvbnN0IEVOVElSRV9NQVRDSCA9IDA7XG5jb25zdCBBVFRSSUJVVEVfTkFNRSA9IDE7XG5jb25zdCBTUEFDRVNfQU5EX0VRVUFMUyA9IDI7XG5jb25zdCBRVU9URV9DSEFSID0gMztcblxuY29uc3Qgc2luZ2xlUXVvdGVBdHRyRW5kUmVnZXggPSAvJy9nO1xuY29uc3QgZG91YmxlUXVvdGVBdHRyRW5kUmVnZXggPSAvXCIvZztcbi8qKlxuICogTWF0Y2hlcyB0aGUgcmF3IHRleHQgZWxlbWVudHMuXG4gKlxuICogQ29tbWVudHMgYXJlIG5vdCBwYXJzZWQgd2l0aGluIHJhdyB0ZXh0IGVsZW1lbnRzLCBzbyB3ZSBuZWVkIHRvIHNlYXJjaCB0aGVpclxuICogdGV4dCBjb250ZW50IGZvciBtYXJrZXIgc3RyaW5ncy5cbiAqL1xuY29uc3QgcmF3VGV4dEVsZW1lbnQgPSAvXig/OnNjcmlwdHxzdHlsZXx0ZXh0YXJlYXx0aXRsZSkkL2k7XG5cbi8qKiBUZW1wbGF0ZVJlc3VsdCB0eXBlcyAqL1xuY29uc3QgSFRNTF9SRVNVTFQgPSAxO1xuY29uc3QgU1ZHX1JFU1VMVCA9IDI7XG5cbnR5cGUgUmVzdWx0VHlwZSA9IHR5cGVvZiBIVE1MX1JFU1VMVCB8IHR5cGVvZiBTVkdfUkVTVUxUO1xuXG4vLyBUZW1wbGF0ZVBhcnQgdHlwZXNcbi8vIElNUE9SVEFOVDogdGhlc2UgbXVzdCBtYXRjaCB0aGUgdmFsdWVzIGluIFBhcnRUeXBlXG5jb25zdCBBVFRSSUJVVEVfUEFSVCA9IDE7XG5jb25zdCBDSElMRF9QQVJUID0gMjtcbmNvbnN0IFBST1BFUlRZX1BBUlQgPSAzO1xuY29uc3QgQk9PTEVBTl9BVFRSSUJVVEVfUEFSVCA9IDQ7XG5jb25zdCBFVkVOVF9QQVJUID0gNTtcbmNvbnN0IEVMRU1FTlRfUEFSVCA9IDY7XG5jb25zdCBDT01NRU5UX1BBUlQgPSA3O1xuXG4vKipcbiAqIFRoZSByZXR1cm4gdHlwZSBvZiB0aGUgdGVtcGxhdGUgdGFnIGZ1bmN0aW9ucy5cbiAqL1xuZXhwb3J0IHR5cGUgVGVtcGxhdGVSZXN1bHQ8VCBleHRlbmRzIFJlc3VsdFR5cGUgPSBSZXN1bHRUeXBlPiA9IHtcbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgWydfJGxpdFR5cGUkJ106IFQ7XG4gIHN0cmluZ3M6IFRlbXBsYXRlU3RyaW5nc0FycmF5O1xuICB2YWx1ZXM6IHVua25vd25bXTtcbn07XG5cbmV4cG9ydCB0eXBlIEhUTUxUZW1wbGF0ZVJlc3VsdCA9IFRlbXBsYXRlUmVzdWx0PHR5cGVvZiBIVE1MX1JFU1VMVD47XG5cbmV4cG9ydCB0eXBlIFNWR1RlbXBsYXRlUmVzdWx0ID0gVGVtcGxhdGVSZXN1bHQ8dHlwZW9mIFNWR19SRVNVTFQ+O1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVkVGVtcGxhdGVSZXN1bHQge1xuICAvLyBUaGlzIGlzIGEgZmFjdG9yeSBpbiBvcmRlciB0byBtYWtlIHRlbXBsYXRlIGluaXRpYWxpemF0aW9uIGxhenlcbiAgLy8gYW5kIGFsbG93IFNoYWR5UmVuZGVyT3B0aW9ucyBzY29wZSB0byBiZSBwYXNzZWQgaW4uXG4gIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gIFsnXyRsaXRUeXBlJCddOiBDb21waWxlZFRlbXBsYXRlO1xuICB2YWx1ZXM6IHVua25vd25bXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21waWxlZFRlbXBsYXRlIGV4dGVuZHMgT21pdDxUZW1wbGF0ZSwgJ2VsJz4ge1xuICAvLyBlbCBpcyBvdmVycmlkZGVuIHRvIGJlIG9wdGlvbmFsLiBXZSBpbml0aWFsaXplIGl0IG9uIGZpcnN0IHJlbmRlclxuICBlbD86IEhUTUxUZW1wbGF0ZUVsZW1lbnQ7XG5cbiAgLy8gVGhlIHByZXBhcmVkIEhUTUwgc3RyaW5nIHRvIGNyZWF0ZSBhIHRlbXBsYXRlIGVsZW1lbnQgZnJvbS5cbiAgaDogVHJ1c3RlZEhUTUw7XG59XG5cbi8qKlxuICogR2VuZXJhdGVzIGEgdGVtcGxhdGUgbGl0ZXJhbCB0YWcgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgVGVtcGxhdGVSZXN1bHQgd2l0aFxuICogdGhlIGdpdmVuIHJlc3VsdCB0eXBlLlxuICovXG5jb25zdCB0YWcgPVxuICA8VCBleHRlbmRzIFJlc3VsdFR5cGU+KHR5cGU6IFQpID0+XG4gIChzdHJpbmdzOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSwgLi4udmFsdWVzOiB1bmtub3duW10pOiBUZW1wbGF0ZVJlc3VsdDxUPiA9PiB7XG4gICAgLy8gV2FybiBhZ2FpbnN0IHRlbXBsYXRlcyBvY3RhbCBlc2NhcGUgc2VxdWVuY2VzXG4gICAgLy8gV2UgZG8gdGhpcyBoZXJlIHJhdGhlciB0aGFuIGluIHJlbmRlciBzbyB0aGF0IHRoZSB3YXJuaW5nIGlzIGNsb3NlciB0byB0aGVcbiAgICAvLyB0ZW1wbGF0ZSBkZWZpbml0aW9uLlxuICAgIGlmIChERVZfTU9ERSAmJiBzdHJpbmdzLnNvbWUoKHMpID0+IHMgPT09IHVuZGVmaW5lZCkpIHtcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgJ1NvbWUgdGVtcGxhdGUgc3RyaW5ncyBhcmUgdW5kZWZpbmVkLlxcbicgK1xuICAgICAgICAgICdUaGlzIGlzIHByb2JhYmx5IGNhdXNlZCBieSBpbGxlZ2FsIG9jdGFsIGVzY2FwZSBzZXF1ZW5jZXMuJ1xuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgICBbJ18kbGl0VHlwZSQnXTogdHlwZSxcbiAgICAgIHN0cmluZ3MsXG4gICAgICB2YWx1ZXMsXG4gICAgfTtcbiAgfTtcblxuLyoqXG4gKiBJbnRlcnByZXRzIGEgdGVtcGxhdGUgbGl0ZXJhbCBhcyBhbiBIVE1MIHRlbXBsYXRlIHRoYXQgY2FuIGVmZmljaWVudGx5XG4gKiByZW5kZXIgdG8gYW5kIHVwZGF0ZSBhIGNvbnRhaW5lci5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgaGVhZGVyID0gKHRpdGxlOiBzdHJpbmcpID0+IGh0bWxgPGgxPiR7dGl0bGV9PC9oMT5gO1xuICogYGBgXG4gKlxuICogVGhlIGBodG1sYCB0YWcgcmV0dXJucyBhIGRlc2NyaXB0aW9uIG9mIHRoZSBET00gdG8gcmVuZGVyIGFzIGEgdmFsdWUuIEl0IGlzXG4gKiBsYXp5LCBtZWFuaW5nIG5vIHdvcmsgaXMgZG9uZSB1bnRpbCB0aGUgdGVtcGxhdGUgaXMgcmVuZGVyZWQuIFdoZW4gcmVuZGVyaW5nLFxuICogaWYgYSB0ZW1wbGF0ZSBjb21lcyBmcm9tIHRoZSBzYW1lIGV4cHJlc3Npb24gYXMgYSBwcmV2aW91c2x5IHJlbmRlcmVkIHJlc3VsdCxcbiAqIGl0J3MgZWZmaWNpZW50bHkgdXBkYXRlZCBpbnN0ZWFkIG9mIHJlcGxhY2VkLlxuICovXG5leHBvcnQgY29uc3QgaHRtbCA9IHRhZyhIVE1MX1JFU1VMVCk7XG5cbi8qKlxuICogSW50ZXJwcmV0cyBhIHRlbXBsYXRlIGxpdGVyYWwgYXMgYW4gU1ZHIGZyYWdtZW50IHRoYXQgY2FuIGVmZmljaWVudGx5XG4gKiByZW5kZXIgdG8gYW5kIHVwZGF0ZSBhIGNvbnRhaW5lci5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgcmVjdCA9IHN2Z2A8cmVjdCB3aWR0aD1cIjEwXCIgaGVpZ2h0PVwiMTBcIj48L3JlY3Q+YDtcbiAqXG4gKiBjb25zdCBteUltYWdlID0gaHRtbGBcbiAqICAgPHN2ZyB2aWV3Qm94PVwiMCAwIDEwIDEwXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPlxuICogICAgICR7cmVjdH1cbiAqICAgPC9zdmc+YDtcbiAqIGBgYFxuICpcbiAqIFRoZSBgc3ZnYCAqdGFnIGZ1bmN0aW9uKiBzaG91bGQgb25seSBiZSB1c2VkIGZvciBTVkcgZnJhZ21lbnRzLCBvciBlbGVtZW50c1xuICogdGhhdCB3b3VsZCBiZSBjb250YWluZWQgKippbnNpZGUqKiBhbiBgPHN2Zz5gIEhUTUwgZWxlbWVudC4gQSBjb21tb24gZXJyb3IgaXNcbiAqIHBsYWNpbmcgYW4gYDxzdmc+YCAqZWxlbWVudCogaW4gYSB0ZW1wbGF0ZSB0YWdnZWQgd2l0aCB0aGUgYHN2Z2AgdGFnXG4gKiBmdW5jdGlvbi4gVGhlIGA8c3ZnPmAgZWxlbWVudCBpcyBhbiBIVE1MIGVsZW1lbnQgYW5kIHNob3VsZCBiZSB1c2VkIHdpdGhpbiBhXG4gKiB0ZW1wbGF0ZSB0YWdnZWQgd2l0aCB0aGUge0BsaW5rY29kZSBodG1sfSB0YWcgZnVuY3Rpb24uXG4gKlxuICogSW4gTGl0RWxlbWVudCB1c2FnZSwgaXQncyBpbnZhbGlkIHRvIHJldHVybiBhbiBTVkcgZnJhZ21lbnQgZnJvbSB0aGVcbiAqIGByZW5kZXIoKWAgbWV0aG9kLCBhcyB0aGUgU1ZHIGZyYWdtZW50IHdpbGwgYmUgY29udGFpbmVkIHdpdGhpbiB0aGUgZWxlbWVudCdzXG4gKiBzaGFkb3cgcm9vdCBhbmQgdGh1cyBjYW5ub3QgYmUgdXNlZCB3aXRoaW4gYW4gYDxzdmc+YCBIVE1MIGVsZW1lbnQuXG4gKi9cbmV4cG9ydCBjb25zdCBzdmcgPSB0YWcoU1ZHX1JFU1VMVCk7XG5cbi8qKlxuICogQSBzZW50aW5lbCB2YWx1ZSB0aGF0IHNpZ25hbHMgdGhhdCBhIHZhbHVlIHdhcyBoYW5kbGVkIGJ5IGEgZGlyZWN0aXZlIGFuZFxuICogc2hvdWxkIG5vdCBiZSB3cml0dGVuIHRvIHRoZSBET00uXG4gKi9cbmV4cG9ydCBjb25zdCBub0NoYW5nZSA9IFN5bWJvbC5mb3IoJ2xpdC1ub0NoYW5nZScpO1xuXG4vKipcbiAqIEEgc2VudGluZWwgdmFsdWUgdGhhdCBzaWduYWxzIGEgQ2hpbGRQYXJ0IHRvIGZ1bGx5IGNsZWFyIGl0cyBjb250ZW50LlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBidXR0b24gPSBodG1sYCR7XG4gKiAgdXNlci5pc0FkbWluXG4gKiAgICA/IGh0bWxgPGJ1dHRvbj5ERUxFVEU8L2J1dHRvbj5gXG4gKiAgICA6IG5vdGhpbmdcbiAqIH1gO1xuICogYGBgXG4gKlxuICogUHJlZmVyIHVzaW5nIGBub3RoaW5nYCBvdmVyIG90aGVyIGZhbHN5IHZhbHVlcyBhcyBpdCBwcm92aWRlcyBhIGNvbnNpc3RlbnRcbiAqIGJlaGF2aW9yIGJldHdlZW4gdmFyaW91cyBleHByZXNzaW9uIGJpbmRpbmcgY29udGV4dHMuXG4gKlxuICogSW4gY2hpbGQgZXhwcmVzc2lvbnMsIGB1bmRlZmluZWRgLCBgbnVsbGAsIGAnJ2AsIGFuZCBgbm90aGluZ2AgYWxsIGJlaGF2ZSB0aGVcbiAqIHNhbWUgYW5kIHJlbmRlciBubyBub2Rlcy4gSW4gYXR0cmlidXRlIGV4cHJlc3Npb25zLCBgbm90aGluZ2AgX3JlbW92ZXNfIHRoZVxuICogYXR0cmlidXRlLCB3aGlsZSBgdW5kZWZpbmVkYCBhbmQgYG51bGxgIHdpbGwgcmVuZGVyIGFuIGVtcHR5IHN0cmluZy4gSW5cbiAqIHByb3BlcnR5IGV4cHJlc3Npb25zIGBub3RoaW5nYCBiZWNvbWVzIGB1bmRlZmluZWRgLlxuICovXG5leHBvcnQgY29uc3Qgbm90aGluZyA9IFN5bWJvbC5mb3IoJ2xpdC1ub3RoaW5nJyk7XG5cbi8qKlxuICogVGhlIGNhY2hlIG9mIHByZXBhcmVkIHRlbXBsYXRlcywga2V5ZWQgYnkgdGhlIHRhZ2dlZCBUZW1wbGF0ZVN0cmluZ3NBcnJheVxuICogYW5kIF9ub3RfIGFjY291bnRpbmcgZm9yIHRoZSBzcGVjaWZpYyB0ZW1wbGF0ZSB0YWcgdXNlZC4gVGhpcyBtZWFucyB0aGF0XG4gKiB0ZW1wbGF0ZSB0YWdzIGNhbm5vdCBiZSBkeW5hbWljIC0gdGhlIG11c3Qgc3RhdGljYWxseSBiZSBvbmUgb2YgaHRtbCwgc3ZnLFxuICogb3IgYXR0ci4gVGhpcyByZXN0cmljdGlvbiBzaW1wbGlmaWVzIHRoZSBjYWNoZSBsb29rdXAsIHdoaWNoIGlzIG9uIHRoZSBob3RcbiAqIHBhdGggZm9yIHJlbmRlcmluZy5cbiAqL1xuY29uc3QgdGVtcGxhdGVDYWNoZSA9IG5ldyBXZWFrTWFwPFRlbXBsYXRlU3RyaW5nc0FycmF5LCBUZW1wbGF0ZT4oKTtcblxuLyoqXG4gKiBPYmplY3Qgc3BlY2lmeWluZyBvcHRpb25zIGZvciBjb250cm9sbGluZyBsaXQtaHRtbCByZW5kZXJpbmcuIE5vdGUgdGhhdFxuICogd2hpbGUgYHJlbmRlcmAgbWF5IGJlIGNhbGxlZCBtdWx0aXBsZSB0aW1lcyBvbiB0aGUgc2FtZSBgY29udGFpbmVyYCAoYW5kXG4gKiBgcmVuZGVyQmVmb3JlYCByZWZlcmVuY2Ugbm9kZSkgdG8gZWZmaWNpZW50bHkgdXBkYXRlIHRoZSByZW5kZXJlZCBjb250ZW50LFxuICogb25seSB0aGUgb3B0aW9ucyBwYXNzZWQgaW4gZHVyaW5nIHRoZSBmaXJzdCByZW5kZXIgYXJlIHJlc3BlY3RlZCBkdXJpbmdcbiAqIHRoZSBsaWZldGltZSBvZiByZW5kZXJzIHRvIHRoYXQgdW5pcXVlIGBjb250YWluZXJgICsgYHJlbmRlckJlZm9yZWBcbiAqIGNvbWJpbmF0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlbmRlck9wdGlvbnMge1xuICAvKipcbiAgICogQW4gb2JqZWN0IHRvIHVzZSBhcyB0aGUgYHRoaXNgIHZhbHVlIGZvciBldmVudCBsaXN0ZW5lcnMuIEl0J3Mgb2Z0ZW5cbiAgICogdXNlZnVsIHRvIHNldCB0aGlzIHRvIHRoZSBob3N0IGNvbXBvbmVudCByZW5kZXJpbmcgYSB0ZW1wbGF0ZS5cbiAgICovXG4gIGhvc3Q/OiBvYmplY3Q7XG4gIC8qKlxuICAgKiBBIERPTSBub2RlIGJlZm9yZSB3aGljaCB0byByZW5kZXIgY29udGVudCBpbiB0aGUgY29udGFpbmVyLlxuICAgKi9cbiAgcmVuZGVyQmVmb3JlPzogQ2hpbGROb2RlIHwgbnVsbDtcbiAgLyoqXG4gICAqIE5vZGUgdXNlZCBmb3IgY2xvbmluZyB0aGUgdGVtcGxhdGUgKGBpbXBvcnROb2RlYCB3aWxsIGJlIGNhbGxlZCBvbiB0aGlzXG4gICAqIG5vZGUpLiBUaGlzIGNvbnRyb2xzIHRoZSBgb3duZXJEb2N1bWVudGAgb2YgdGhlIHJlbmRlcmVkIERPTSwgYWxvbmcgd2l0aFxuICAgKiBhbnkgaW5oZXJpdGVkIGNvbnRleHQuIERlZmF1bHRzIHRvIHRoZSBnbG9iYWwgYGRvY3VtZW50YC5cbiAgICovXG4gIGNyZWF0aW9uU2NvcGU/OiB7aW1wb3J0Tm9kZShub2RlOiBOb2RlLCBkZWVwPzogYm9vbGVhbik6IE5vZGV9O1xuICAvKipcbiAgICogVGhlIGluaXRpYWwgY29ubmVjdGVkIHN0YXRlIGZvciB0aGUgdG9wLWxldmVsIHBhcnQgYmVpbmcgcmVuZGVyZWQuIElmIG5vXG4gICAqIGBpc0Nvbm5lY3RlZGAgb3B0aW9uIGlzIHNldCwgYEFzeW5jRGlyZWN0aXZlYHMgd2lsbCBiZSBjb25uZWN0ZWQgYnlcbiAgICogZGVmYXVsdC4gU2V0IHRvIGBmYWxzZWAgaWYgdGhlIGluaXRpYWwgcmVuZGVyIG9jY3VycyBpbiBhIGRpc2Nvbm5lY3RlZCB0cmVlXG4gICAqIGFuZCBgQXN5bmNEaXJlY3RpdmVgcyBzaG91bGQgc2VlIGBpc0Nvbm5lY3RlZCA9PT0gZmFsc2VgIGZvciB0aGVpciBpbml0aWFsXG4gICAqIHJlbmRlci4gVGhlIGBwYXJ0LnNldENvbm5lY3RlZCgpYCBtZXRob2QgbXVzdCBiZSB1c2VkIHN1YnNlcXVlbnQgdG8gaW5pdGlhbFxuICAgKiByZW5kZXIgdG8gY2hhbmdlIHRoZSBjb25uZWN0ZWQgc3RhdGUgb2YgdGhlIHBhcnQuXG4gICAqL1xuICBpc0Nvbm5lY3RlZD86IGJvb2xlYW47XG59XG5cbi8qKlxuICogSW50ZXJuYWxseSB3ZSBjYW4gZXhwb3J0IHRoaXMgaW50ZXJmYWNlIGFuZCBjaGFuZ2UgdGhlIHR5cGUgb2ZcbiAqIHJlbmRlcigpJ3Mgb3B0aW9ucy5cbiAqL1xuaW50ZXJmYWNlIEludGVybmFsUmVuZGVyT3B0aW9ucyBleHRlbmRzIFJlbmRlck9wdGlvbnMge1xuICAvKipcbiAgICogQW4gaW50ZXJuYWwtb25seSBtaWdyYXRpb24gZmxhZ1xuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGNsZWFyQ29udGFpbmVyRm9yTGl0Mk1pZ3JhdGlvbk9ubHk/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIFJlbmRlcnMgYSB2YWx1ZSwgdXN1YWxseSBhIGxpdC1odG1sIFRlbXBsYXRlUmVzdWx0LCB0byB0aGUgY29udGFpbmVyLlxuICogQHBhcmFtIHZhbHVlXG4gKiBAcGFyYW0gY29udGFpbmVyXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgY29uc3QgcmVuZGVyID0gKFxuICB2YWx1ZTogdW5rbm93bixcbiAgY29udGFpbmVyOiBIVE1MRWxlbWVudCB8IERvY3VtZW50RnJhZ21lbnQsXG4gIG9wdGlvbnM/OiBSZW5kZXJPcHRpb25zXG4pOiBSb290UGFydCA9PiB7XG4gIGNvbnN0IHJlbmRlcklkID0gREVWX01PREUgPyBkZWJ1Z0xvZ1JlbmRlcklkKysgOiAwO1xuICBjb25zdCBwYXJ0T3duZXJOb2RlID0gb3B0aW9ucz8ucmVuZGVyQmVmb3JlID8/IGNvbnRhaW5lcjtcbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgbGV0IHBhcnQ6IENoaWxkUGFydCA9IChwYXJ0T3duZXJOb2RlIGFzIGFueSlbJ18kbGl0UGFydCQnXTtcbiAgZGVidWdMb2dFdmVudD8uKHtcbiAgICBraW5kOiAnYmVnaW4gcmVuZGVyJyxcbiAgICBpZDogcmVuZGVySWQsXG4gICAgdmFsdWUsXG4gICAgY29udGFpbmVyLFxuICAgIG9wdGlvbnMsXG4gICAgcGFydCxcbiAgfSk7XG4gIGlmIChwYXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICBjb25zdCBlbmROb2RlID0gb3B0aW9ucz8ucmVuZGVyQmVmb3JlID8/IG51bGw7XG4gICAgLy8gSW50ZXJuYWwgbW9kaWZpY2F0aW9uOiBkb24ndCBjbGVhciBjb250YWluZXIgdG8gbWF0Y2ggbGl0LWh0bWwgMi4wXG4gICAgaWYgKFxuICAgICAgSU5URVJOQUwgJiZcbiAgICAgIChvcHRpb25zIGFzIEludGVybmFsUmVuZGVyT3B0aW9ucyk/LmNsZWFyQ29udGFpbmVyRm9yTGl0Mk1pZ3JhdGlvbk9ubHkgPT09XG4gICAgICAgIHRydWVcbiAgICApIHtcbiAgICAgIGxldCBuID0gY29udGFpbmVyLmZpcnN0Q2hpbGQ7XG4gICAgICAvLyBDbGVhciBvbmx5IHVwIHRvIHRoZSBgZW5kTm9kZWAgYWthIGByZW5kZXJCZWZvcmVgIG5vZGUuXG4gICAgICB3aGlsZSAobiAmJiBuICE9PSBlbmROb2RlKSB7XG4gICAgICAgIGNvbnN0IG5leHQgPSBuLm5leHRTaWJsaW5nO1xuICAgICAgICBuLnJlbW92ZSgpO1xuICAgICAgICBuID0gbmV4dDtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIChwYXJ0T3duZXJOb2RlIGFzIGFueSlbJ18kbGl0UGFydCQnXSA9IHBhcnQgPSBuZXcgQ2hpbGRQYXJ0KFxuICAgICAgY29udGFpbmVyLmluc2VydEJlZm9yZShjcmVhdGVNYXJrZXIoKSwgZW5kTm9kZSksXG4gICAgICBlbmROb2RlLFxuICAgICAgdW5kZWZpbmVkLFxuICAgICAgb3B0aW9ucyA/PyB7fVxuICAgICk7XG4gIH1cbiAgcGFydC5fJHNldFZhbHVlKHZhbHVlKTtcbiAgZGVidWdMb2dFdmVudD8uKHtcbiAgICBraW5kOiAnZW5kIHJlbmRlcicsXG4gICAgaWQ6IHJlbmRlcklkLFxuICAgIHZhbHVlLFxuICAgIGNvbnRhaW5lcixcbiAgICBvcHRpb25zLFxuICAgIHBhcnQsXG4gIH0pO1xuICByZXR1cm4gcGFydCBhcyBSb290UGFydDtcbn07XG5cbmlmIChFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MpIHtcbiAgcmVuZGVyLnNldFNhbml0aXplciA9IHNldFNhbml0aXplcjtcbiAgcmVuZGVyLmNyZWF0ZVNhbml0aXplciA9IGNyZWF0ZVNhbml0aXplcjtcbiAgaWYgKERFVl9NT0RFKSB7XG4gICAgcmVuZGVyLl90ZXN0T25seUNsZWFyU2FuaXRpemVyRmFjdG9yeURvTm90Q2FsbE9yRWxzZSA9XG4gICAgICBfdGVzdE9ubHlDbGVhclNhbml0aXplckZhY3RvcnlEb05vdENhbGxPckVsc2U7XG4gIH1cbn1cblxuY29uc3Qgd2Fsa2VyID0gZC5jcmVhdGVUcmVlV2Fsa2VyKFxuICBkLFxuICAxMjkgLyogTm9kZUZpbHRlci5TSE9XX3tFTEVNRU5UfENPTU1FTlR9ICovLFxuICBudWxsLFxuICBmYWxzZVxuKTtcblxubGV0IHNhbml0aXplckZhY3RvcnlJbnRlcm5hbDogU2FuaXRpemVyRmFjdG9yeSA9IG5vb3BTYW5pdGl6ZXI7XG5cbi8vXG4vLyBDbGFzc2VzIG9ubHkgYmVsb3cgaGVyZSwgY29uc3QgdmFyaWFibGUgZGVjbGFyYXRpb25zIG9ubHkgYWJvdmUgaGVyZS4uLlxuLy9cbi8vIEtlZXBpbmcgdmFyaWFibGUgZGVjbGFyYXRpb25zIGFuZCBjbGFzc2VzIHRvZ2V0aGVyIGltcHJvdmVzIG1pbmlmaWNhdGlvbi5cbi8vIEludGVyZmFjZXMgYW5kIHR5cGUgYWxpYXNlcyBjYW4gYmUgaW50ZXJsZWF2ZWQgZnJlZWx5LlxuLy9cblxuLy8gVHlwZSBmb3IgY2xhc3NlcyB0aGF0IGhhdmUgYSBgX2RpcmVjdGl2ZWAgb3IgYF9kaXJlY3RpdmVzW11gIGZpZWxkLCB1c2VkIGJ5XG4vLyBgcmVzb2x2ZURpcmVjdGl2ZWBcbmV4cG9ydCBpbnRlcmZhY2UgRGlyZWN0aXZlUGFyZW50IHtcbiAgXyRwYXJlbnQ/OiBEaXJlY3RpdmVQYXJlbnQ7XG4gIF8kaXNDb25uZWN0ZWQ6IGJvb2xlYW47XG4gIF9fZGlyZWN0aXZlPzogRGlyZWN0aXZlO1xuICBfX2RpcmVjdGl2ZXM/OiBBcnJheTxEaXJlY3RpdmUgfCB1bmRlZmluZWQ+O1xufVxuXG4vKipcbiAqIFJldHVybnMgYW4gSFRNTCBzdHJpbmcgZm9yIHRoZSBnaXZlbiBUZW1wbGF0ZVN0cmluZ3NBcnJheSBhbmQgcmVzdWx0IHR5cGVcbiAqIChIVE1MIG9yIFNWRyksIGFsb25nIHdpdGggdGhlIGNhc2Utc2Vuc2l0aXZlIGJvdW5kIGF0dHJpYnV0ZSBuYW1lcyBpblxuICogdGVtcGxhdGUgb3JkZXIuIFRoZSBIVE1MIGNvbnRhaW5zIGNvbW1lbnQgY29tbWVudCBtYXJrZXJzIGRlbm90aW5nIHRoZVxuICogYENoaWxkUGFydGBzIGFuZCBzdWZmaXhlcyBvbiBib3VuZCBhdHRyaWJ1dGVzIGRlbm90aW5nIHRoZSBgQXR0cmlidXRlUGFydHNgLlxuICpcbiAqIEBwYXJhbSBzdHJpbmdzIHRlbXBsYXRlIHN0cmluZ3MgYXJyYXlcbiAqIEBwYXJhbSB0eXBlIEhUTUwgb3IgU1ZHXG4gKiBAcmV0dXJuIEFycmF5IGNvbnRhaW5pbmcgYFtodG1sLCBhdHRyTmFtZXNdYCAoYXJyYXkgcmV0dXJuZWQgZm9yIHRlcnNlbmVzcyxcbiAqICAgICB0byBhdm9pZCBvYmplY3QgZmllbGRzIHNpbmNlIHRoaXMgY29kZSBpcyBzaGFyZWQgd2l0aCBub24tbWluaWZpZWQgU1NSXG4gKiAgICAgY29kZSlcbiAqL1xuY29uc3QgZ2V0VGVtcGxhdGVIdG1sID0gKFxuICBzdHJpbmdzOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSxcbiAgdHlwZTogUmVzdWx0VHlwZVxuKTogW1RydXN0ZWRIVE1MLCBBcnJheTxzdHJpbmcgfCB1bmRlZmluZWQ+XSA9PiB7XG4gIC8vIEluc2VydCBtYWtlcnMgaW50byB0aGUgdGVtcGxhdGUgSFRNTCB0byByZXByZXNlbnQgdGhlIHBvc2l0aW9uIG9mXG4gIC8vIGJpbmRpbmdzLiBUaGUgZm9sbG93aW5nIGNvZGUgc2NhbnMgdGhlIHRlbXBsYXRlIHN0cmluZ3MgdG8gZGV0ZXJtaW5lIHRoZVxuICAvLyBzeW50YWN0aWMgcG9zaXRpb24gb2YgdGhlIGJpbmRpbmdzLiBUaGV5IGNhbiBiZSBpbiB0ZXh0IHBvc2l0aW9uLCB3aGVyZVxuICAvLyB3ZSBpbnNlcnQgYW4gSFRNTCBjb21tZW50LCBhdHRyaWJ1dGUgdmFsdWUgcG9zaXRpb24sIHdoZXJlIHdlIGluc2VydCBhXG4gIC8vIHNlbnRpbmVsIHN0cmluZyBhbmQgcmUtd3JpdGUgdGhlIGF0dHJpYnV0ZSBuYW1lLCBvciBpbnNpZGUgYSB0YWcgd2hlcmVcbiAgLy8gd2UgaW5zZXJ0IHRoZSBzZW50aW5lbCBzdHJpbmcuXG4gIGNvbnN0IGwgPSBzdHJpbmdzLmxlbmd0aCAtIDE7XG4gIC8vIFN0b3JlcyB0aGUgY2FzZS1zZW5zaXRpdmUgYm91bmQgYXR0cmlidXRlIG5hbWVzIGluIHRoZSBvcmRlciBvZiB0aGVpclxuICAvLyBwYXJ0cy4gRWxlbWVudFBhcnRzIGFyZSBhbHNvIHJlZmxlY3RlZCBpbiB0aGlzIGFycmF5IGFzIHVuZGVmaW5lZFxuICAvLyByYXRoZXIgdGhhbiBhIHN0cmluZywgdG8gZGlzYW1iaWd1YXRlIGZyb20gYXR0cmlidXRlIGJpbmRpbmdzLlxuICBjb25zdCBhdHRyTmFtZXM6IEFycmF5PHN0cmluZyB8IHVuZGVmaW5lZD4gPSBbXTtcbiAgbGV0IGh0bWwgPSB0eXBlID09PSBTVkdfUkVTVUxUID8gJzxzdmc+JyA6ICcnO1xuXG4gIC8vIFdoZW4gd2UncmUgaW5zaWRlIGEgcmF3IHRleHQgdGFnIChub3QgaXQncyB0ZXh0IGNvbnRlbnQpLCB0aGUgcmVnZXhcbiAgLy8gd2lsbCBzdGlsbCBiZSB0YWdSZWdleCBzbyB3ZSBjYW4gZmluZCBhdHRyaWJ1dGVzLCBidXQgd2lsbCBzd2l0Y2ggdG9cbiAgLy8gdGhpcyByZWdleCB3aGVuIHRoZSB0YWcgZW5kcy5cbiAgbGV0IHJhd1RleHRFbmRSZWdleDogUmVnRXhwIHwgdW5kZWZpbmVkO1xuXG4gIC8vIFRoZSBjdXJyZW50IHBhcnNpbmcgc3RhdGUsIHJlcHJlc2VudGVkIGFzIGEgcmVmZXJlbmNlIHRvIG9uZSBvZiB0aGVcbiAgLy8gcmVnZXhlc1xuICBsZXQgcmVnZXggPSB0ZXh0RW5kUmVnZXg7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICBjb25zdCBzID0gc3RyaW5nc1tpXTtcbiAgICAvLyBUaGUgaW5kZXggb2YgdGhlIGVuZCBvZiB0aGUgbGFzdCBhdHRyaWJ1dGUgbmFtZS4gV2hlbiB0aGlzIGlzXG4gICAgLy8gcG9zaXRpdmUgYXQgZW5kIG9mIGEgc3RyaW5nLCBpdCBtZWFucyB3ZSdyZSBpbiBhbiBhdHRyaWJ1dGUgdmFsdWVcbiAgICAvLyBwb3NpdGlvbiBhbmQgbmVlZCB0byByZXdyaXRlIHRoZSBhdHRyaWJ1dGUgbmFtZS5cbiAgICAvLyBXZSBhbHNvIHVzZSBhIHNwZWNpYWwgdmFsdWUgb2YgLTIgdG8gaW5kaWNhdGUgdGhhdCB3ZSBlbmNvdW50ZXJlZFxuICAgIC8vIHRoZSBlbmQgb2YgYSBzdHJpbmcgaW4gYXR0cmlidXRlIG5hbWUgcG9zaXRpb24uXG4gICAgbGV0IGF0dHJOYW1lRW5kSW5kZXggPSAtMTtcbiAgICBsZXQgYXR0ck5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBsZXQgbGFzdEluZGV4ID0gMDtcbiAgICBsZXQgbWF0Y2ghOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xuXG4gICAgLy8gVGhlIGNvbmRpdGlvbnMgaW4gdGhpcyBsb29wIGhhbmRsZSB0aGUgY3VycmVudCBwYXJzZSBzdGF0ZSwgYW5kIHRoZVxuICAgIC8vIGFzc2lnbm1lbnRzIHRvIHRoZSBgcmVnZXhgIHZhcmlhYmxlIGFyZSB0aGUgc3RhdGUgdHJhbnNpdGlvbnMuXG4gICAgd2hpbGUgKGxhc3RJbmRleCA8IHMubGVuZ3RoKSB7XG4gICAgICAvLyBNYWtlIHN1cmUgd2Ugc3RhcnQgc2VhcmNoaW5nIGZyb20gd2hlcmUgd2UgcHJldmlvdXNseSBsZWZ0IG9mZlxuICAgICAgcmVnZXgubGFzdEluZGV4ID0gbGFzdEluZGV4O1xuICAgICAgbWF0Y2ggPSByZWdleC5leGVjKHMpO1xuICAgICAgaWYgKG1hdGNoID09PSBudWxsKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgbGFzdEluZGV4ID0gcmVnZXgubGFzdEluZGV4O1xuICAgICAgaWYgKHJlZ2V4ID09PSB0ZXh0RW5kUmVnZXgpIHtcbiAgICAgICAgaWYgKG1hdGNoW0NPTU1FTlRfU1RBUlRdID09PSAnIS0tJykge1xuICAgICAgICAgIHJlZ2V4ID0gY29tbWVudEVuZFJlZ2V4O1xuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoW0NPTU1FTlRfU1RBUlRdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBXZSBzdGFydGVkIGEgd2VpcmQgY29tbWVudCwgbGlrZSA8L3tcbiAgICAgICAgICByZWdleCA9IGNvbW1lbnQyRW5kUmVnZXg7XG4gICAgICAgIH0gZWxzZSBpZiAobWF0Y2hbVEFHX05BTUVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAocmF3VGV4dEVsZW1lbnQudGVzdChtYXRjaFtUQUdfTkFNRV0pKSB7XG4gICAgICAgICAgICAvLyBSZWNvcmQgaWYgd2UgZW5jb3VudGVyIGEgcmF3LXRleHQgZWxlbWVudC4gV2UnbGwgc3dpdGNoIHRvXG4gICAgICAgICAgICAvLyB0aGlzIHJlZ2V4IGF0IHRoZSBlbmQgb2YgdGhlIHRhZy5cbiAgICAgICAgICAgIHJhd1RleHRFbmRSZWdleCA9IG5ldyBSZWdFeHAoYDwvJHttYXRjaFtUQUdfTkFNRV19YCwgJ2cnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVnZXggPSB0YWdFbmRSZWdleDtcbiAgICAgICAgfSBlbHNlIGlmIChtYXRjaFtEWU5BTUlDX1RBR19OQU1FXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKERFVl9NT0RFKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICdCaW5kaW5ncyBpbiB0YWcgbmFtZXMgYXJlIG5vdCBzdXBwb3J0ZWQuIFBsZWFzZSB1c2Ugc3RhdGljIHRlbXBsYXRlcyBpbnN0ZWFkLiAnICtcbiAgICAgICAgICAgICAgICAnU2VlIGh0dHBzOi8vbGl0LmRldi9kb2NzL3RlbXBsYXRlcy9leHByZXNzaW9ucy8jc3RhdGljLWV4cHJlc3Npb25zJ1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVnZXggPSB0YWdFbmRSZWdleDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChyZWdleCA9PT0gdGFnRW5kUmVnZXgpIHtcbiAgICAgICAgaWYgKG1hdGNoW0VOVElSRV9NQVRDSF0gPT09ICc+Jykge1xuICAgICAgICAgIC8vIEVuZCBvZiBhIHRhZy4gSWYgd2UgaGFkIHN0YXJ0ZWQgYSByYXctdGV4dCBlbGVtZW50LCB1c2UgdGhhdFxuICAgICAgICAgIC8vIHJlZ2V4XG4gICAgICAgICAgcmVnZXggPSByYXdUZXh0RW5kUmVnZXggPz8gdGV4dEVuZFJlZ2V4O1xuICAgICAgICAgIC8vIFdlIG1heSBiZSBlbmRpbmcgYW4gdW5xdW90ZWQgYXR0cmlidXRlIHZhbHVlLCBzbyBtYWtlIHN1cmUgd2VcbiAgICAgICAgICAvLyBjbGVhciBhbnkgcGVuZGluZyBhdHRyTmFtZUVuZEluZGV4XG4gICAgICAgICAgYXR0ck5hbWVFbmRJbmRleCA9IC0xO1xuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoW0FUVFJJQlVURV9OQU1FXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gQXR0cmlidXRlIG5hbWUgcG9zaXRpb25cbiAgICAgICAgICBhdHRyTmFtZUVuZEluZGV4ID0gLTI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXR0ck5hbWVFbmRJbmRleCA9IHJlZ2V4Lmxhc3RJbmRleCAtIG1hdGNoW1NQQUNFU19BTkRfRVFVQUxTXS5sZW5ndGg7XG4gICAgICAgICAgYXR0ck5hbWUgPSBtYXRjaFtBVFRSSUJVVEVfTkFNRV07XG4gICAgICAgICAgcmVnZXggPVxuICAgICAgICAgICAgbWF0Y2hbUVVPVEVfQ0hBUl0gPT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICA/IHRhZ0VuZFJlZ2V4XG4gICAgICAgICAgICAgIDogbWF0Y2hbUVVPVEVfQ0hBUl0gPT09ICdcIidcbiAgICAgICAgICAgICAgPyBkb3VibGVRdW90ZUF0dHJFbmRSZWdleFxuICAgICAgICAgICAgICA6IHNpbmdsZVF1b3RlQXR0ckVuZFJlZ2V4O1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKFxuICAgICAgICByZWdleCA9PT0gZG91YmxlUXVvdGVBdHRyRW5kUmVnZXggfHxcbiAgICAgICAgcmVnZXggPT09IHNpbmdsZVF1b3RlQXR0ckVuZFJlZ2V4XG4gICAgICApIHtcbiAgICAgICAgcmVnZXggPSB0YWdFbmRSZWdleDtcbiAgICAgIH0gZWxzZSBpZiAocmVnZXggPT09IGNvbW1lbnRFbmRSZWdleCB8fCByZWdleCA9PT0gY29tbWVudDJFbmRSZWdleCkge1xuICAgICAgICByZWdleCA9IHRleHRFbmRSZWdleDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE5vdCBvbmUgb2YgdGhlIGZpdmUgc3RhdGUgcmVnZXhlcywgc28gaXQgbXVzdCBiZSB0aGUgZHluYW1pY2FsbHlcbiAgICAgICAgLy8gY3JlYXRlZCByYXcgdGV4dCByZWdleCBhbmQgd2UncmUgYXQgdGhlIGNsb3NlIG9mIHRoYXQgZWxlbWVudC5cbiAgICAgICAgcmVnZXggPSB0YWdFbmRSZWdleDtcbiAgICAgICAgcmF3VGV4dEVuZFJlZ2V4ID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChERVZfTU9ERSkge1xuICAgICAgLy8gSWYgd2UgaGF2ZSBhIGF0dHJOYW1lRW5kSW5kZXgsIHdoaWNoIGluZGljYXRlcyB0aGF0IHdlIHNob3VsZFxuICAgICAgLy8gcmV3cml0ZSB0aGUgYXR0cmlidXRlIG5hbWUsIGFzc2VydCB0aGF0IHdlJ3JlIGluIGEgdmFsaWQgYXR0cmlidXRlXG4gICAgICAvLyBwb3NpdGlvbiAtIGVpdGhlciBpbiBhIHRhZywgb3IgYSBxdW90ZWQgYXR0cmlidXRlIHZhbHVlLlxuICAgICAgY29uc29sZS5hc3NlcnQoXG4gICAgICAgIGF0dHJOYW1lRW5kSW5kZXggPT09IC0xIHx8XG4gICAgICAgICAgcmVnZXggPT09IHRhZ0VuZFJlZ2V4IHx8XG4gICAgICAgICAgcmVnZXggPT09IHNpbmdsZVF1b3RlQXR0ckVuZFJlZ2V4IHx8XG4gICAgICAgICAgcmVnZXggPT09IGRvdWJsZVF1b3RlQXR0ckVuZFJlZ2V4LFxuICAgICAgICAndW5leHBlY3RlZCBwYXJzZSBzdGF0ZSBCJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyBXZSBoYXZlIGZvdXIgY2FzZXM6XG4gICAgLy8gIDEuIFdlJ3JlIGluIHRleHQgcG9zaXRpb24sIGFuZCBub3QgaW4gYSByYXcgdGV4dCBlbGVtZW50XG4gICAgLy8gICAgIChyZWdleCA9PT0gdGV4dEVuZFJlZ2V4KTogaW5zZXJ0IGEgY29tbWVudCBtYXJrZXIuXG4gICAgLy8gIDIuIFdlIGhhdmUgYSBub24tbmVnYXRpdmUgYXR0ck5hbWVFbmRJbmRleCB3aGljaCBtZWFucyB3ZSBuZWVkIHRvXG4gICAgLy8gICAgIHJld3JpdGUgdGhlIGF0dHJpYnV0ZSBuYW1lIHRvIGFkZCBhIGJvdW5kIGF0dHJpYnV0ZSBzdWZmaXguXG4gICAgLy8gIDMuIFdlJ3JlIGF0IHRoZSBub24tZmlyc3QgYmluZGluZyBpbiBhIG11bHRpLWJpbmRpbmcgYXR0cmlidXRlLCB1c2UgYVxuICAgIC8vICAgICBwbGFpbiBtYXJrZXIuXG4gICAgLy8gIDQuIFdlJ3JlIHNvbWV3aGVyZSBlbHNlIGluc2lkZSB0aGUgdGFnLiBJZiB3ZSdyZSBpbiBhdHRyaWJ1dGUgbmFtZVxuICAgIC8vICAgICBwb3NpdGlvbiAoYXR0ck5hbWVFbmRJbmRleCA9PT0gLTIpLCBhZGQgYSBzZXF1ZW50aWFsIHN1ZmZpeCB0b1xuICAgIC8vICAgICBnZW5lcmF0ZSBhIHVuaXF1ZSBhdHRyaWJ1dGUgbmFtZS5cblxuICAgIC8vIERldGVjdCBhIGJpbmRpbmcgbmV4dCB0byBzZWxmLWNsb3NpbmcgdGFnIGVuZCBhbmQgaW5zZXJ0IGEgc3BhY2UgdG9cbiAgICAvLyBzZXBhcmF0ZSB0aGUgbWFya2VyIGZyb20gdGhlIHRhZyBlbmQ6XG4gICAgY29uc3QgZW5kID1cbiAgICAgIHJlZ2V4ID09PSB0YWdFbmRSZWdleCAmJiBzdHJpbmdzW2kgKyAxXS5zdGFydHNXaXRoKCcvPicpID8gJyAnIDogJyc7XG4gICAgaHRtbCArPVxuICAgICAgcmVnZXggPT09IHRleHRFbmRSZWdleFxuICAgICAgICA/IHMgKyBub2RlTWFya2VyXG4gICAgICAgIDogYXR0ck5hbWVFbmRJbmRleCA+PSAwXG4gICAgICAgID8gKGF0dHJOYW1lcy5wdXNoKGF0dHJOYW1lISksXG4gICAgICAgICAgcy5zbGljZSgwLCBhdHRyTmFtZUVuZEluZGV4KSArXG4gICAgICAgICAgICBib3VuZEF0dHJpYnV0ZVN1ZmZpeCArXG4gICAgICAgICAgICBzLnNsaWNlKGF0dHJOYW1lRW5kSW5kZXgpKSArXG4gICAgICAgICAgbWFya2VyICtcbiAgICAgICAgICBlbmRcbiAgICAgICAgOiBzICtcbiAgICAgICAgICBtYXJrZXIgK1xuICAgICAgICAgIChhdHRyTmFtZUVuZEluZGV4ID09PSAtMiA/IChhdHRyTmFtZXMucHVzaCh1bmRlZmluZWQpLCBpKSA6IGVuZCk7XG4gIH1cblxuICBjb25zdCBodG1sUmVzdWx0OiBzdHJpbmcgfCBUcnVzdGVkSFRNTCA9XG4gICAgaHRtbCArIChzdHJpbmdzW2xdIHx8ICc8Pz4nKSArICh0eXBlID09PSBTVkdfUkVTVUxUID8gJzwvc3ZnPicgOiAnJyk7XG5cbiAgLy8gQSBzZWN1cml0eSBjaGVjayB0byBwcmV2ZW50IHNwb29maW5nIG9mIExpdCB0ZW1wbGF0ZSByZXN1bHRzLlxuICAvLyBJbiB0aGUgZnV0dXJlLCB3ZSBtYXkgYmUgYWJsZSB0byByZXBsYWNlIHRoaXMgd2l0aCBBcnJheS5pc1RlbXBsYXRlT2JqZWN0LFxuICAvLyB0aG91Z2ggd2UgbWlnaHQgbmVlZCB0byBtYWtlIHRoYXQgY2hlY2sgaW5zaWRlIG9mIHRoZSBodG1sIGFuZCBzdmdcbiAgLy8gZnVuY3Rpb25zLCBiZWNhdXNlIHByZWNvbXBpbGVkIHRlbXBsYXRlcyBkb24ndCBjb21lIGluIGFzXG4gIC8vIFRlbXBsYXRlU3RyaW5nQXJyYXkgb2JqZWN0cy5cbiAgaWYgKCFBcnJheS5pc0FycmF5KHN0cmluZ3MpIHx8ICFzdHJpbmdzLmhhc093blByb3BlcnR5KCdyYXcnKSkge1xuICAgIGxldCBtZXNzYWdlID0gJ2ludmFsaWQgdGVtcGxhdGUgc3RyaW5ncyBhcnJheSc7XG4gICAgaWYgKERFVl9NT0RFKSB7XG4gICAgICBtZXNzYWdlID1cbiAgICAgICAgYEludGVybmFsIEVycm9yOiBleHBlY3RlZCB0ZW1wbGF0ZSBzdHJpbmdzIHRvIGJlIGFuIGFycmF5IGAgK1xuICAgICAgICBgd2l0aCBhICdyYXcnIGZpZWxkLiBQbGVhc2UgZmlsZSBhIGJ1ZyBhdCBgICtcbiAgICAgICAgYGh0dHBzOi8vZ2l0aHViLmNvbS9saXQvbGl0L2lzc3Vlcy9uZXc/dGVtcGxhdGU9YnVnX3JlcG9ydC5tZCBgICtcbiAgICAgICAgYGFuZCBpbmNsdWRlIGluZm9ybWF0aW9uIGFib3V0IHlvdXIgYnVpbGQgdG9vbGluZywgaWYgYW55LmA7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgfVxuICAvLyBSZXR1cm5lZCBhcyBhbiBhcnJheSBmb3IgdGVyc2VuZXNzXG4gIHJldHVybiBbXG4gICAgcG9saWN5ICE9PSB1bmRlZmluZWRcbiAgICAgID8gcG9saWN5LmNyZWF0ZUhUTUwoaHRtbFJlc3VsdClcbiAgICAgIDogKGh0bWxSZXN1bHQgYXMgdW5rbm93biBhcyBUcnVzdGVkSFRNTCksXG4gICAgYXR0ck5hbWVzLFxuICBdO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUge1RlbXBsYXRlfTtcbmNsYXNzIFRlbXBsYXRlIHtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBlbCE6IEhUTUxUZW1wbGF0ZUVsZW1lbnQ7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcGFydHM6IEFycmF5PFRlbXBsYXRlUGFydD4gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIHtzdHJpbmdzLCBbJ18kbGl0VHlwZSQnXTogdHlwZX06IFRlbXBsYXRlUmVzdWx0LFxuICAgIG9wdGlvbnM/OiBSZW5kZXJPcHRpb25zXG4gICkge1xuICAgIGxldCBub2RlOiBOb2RlIHwgbnVsbDtcbiAgICBsZXQgbm9kZUluZGV4ID0gMDtcbiAgICBsZXQgYXR0ck5hbWVJbmRleCA9IDA7XG4gICAgY29uc3QgcGFydENvdW50ID0gc3RyaW5ncy5sZW5ndGggLSAxO1xuICAgIGNvbnN0IHBhcnRzID0gdGhpcy5wYXJ0cztcblxuICAgIC8vIENyZWF0ZSB0ZW1wbGF0ZSBlbGVtZW50XG4gICAgY29uc3QgW2h0bWwsIGF0dHJOYW1lc10gPSBnZXRUZW1wbGF0ZUh0bWwoc3RyaW5ncywgdHlwZSk7XG4gICAgdGhpcy5lbCA9IFRlbXBsYXRlLmNyZWF0ZUVsZW1lbnQoaHRtbCwgb3B0aW9ucyk7XG4gICAgd2Fsa2VyLmN1cnJlbnROb2RlID0gdGhpcy5lbC5jb250ZW50O1xuXG4gICAgLy8gUmVwYXJlbnQgU1ZHIG5vZGVzIGludG8gdGVtcGxhdGUgcm9vdFxuICAgIGlmICh0eXBlID09PSBTVkdfUkVTVUxUKSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gdGhpcy5lbC5jb250ZW50O1xuICAgICAgY29uc3Qgc3ZnRWxlbWVudCA9IGNvbnRlbnQuZmlyc3RDaGlsZCE7XG4gICAgICBzdmdFbGVtZW50LnJlbW92ZSgpO1xuICAgICAgY29udGVudC5hcHBlbmQoLi4uc3ZnRWxlbWVudC5jaGlsZE5vZGVzKTtcbiAgICB9XG5cbiAgICAvLyBXYWxrIHRoZSB0ZW1wbGF0ZSB0byBmaW5kIGJpbmRpbmcgbWFya2VycyBhbmQgY3JlYXRlIFRlbXBsYXRlUGFydHNcbiAgICB3aGlsZSAoKG5vZGUgPSB3YWxrZXIubmV4dE5vZGUoKSkgIT09IG51bGwgJiYgcGFydHMubGVuZ3RoIDwgcGFydENvdW50KSB7XG4gICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICBpZiAoREVWX01PREUpIHtcbiAgICAgICAgICBjb25zdCB0YWcgPSAobm9kZSBhcyBFbGVtZW50KS5sb2NhbE5hbWU7XG4gICAgICAgICAgLy8gV2FybiBpZiBgdGV4dGFyZWFgIGluY2x1ZGVzIGFuIGV4cHJlc3Npb24gYW5kIHRocm93IGlmIGB0ZW1wbGF0ZWBcbiAgICAgICAgICAvLyBkb2VzIHNpbmNlIHRoZXNlIGFyZSBub3Qgc3VwcG9ydGVkLiBXZSBkbyB0aGlzIGJ5IGNoZWNraW5nXG4gICAgICAgICAgLy8gaW5uZXJIVE1MIGZvciBhbnl0aGluZyB0aGF0IGxvb2tzIGxpa2UgYSBtYXJrZXIuIFRoaXMgY2F0Y2hlc1xuICAgICAgICAgIC8vIGNhc2VzIGxpa2UgYmluZGluZ3MgaW4gdGV4dGFyZWEgdGhlcmUgbWFya2VycyB0dXJuIGludG8gdGV4dCBub2Rlcy5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAvXig/OnRleHRhcmVhfHRlbXBsYXRlKSQvaSEudGVzdCh0YWcpICYmXG4gICAgICAgICAgICAobm9kZSBhcyBFbGVtZW50KS5pbm5lckhUTUwuaW5jbHVkZXMobWFya2VyKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgY29uc3QgbSA9XG4gICAgICAgICAgICAgIGBFeHByZXNzaW9ucyBhcmUgbm90IHN1cHBvcnRlZCBpbnNpZGUgXFxgJHt0YWd9XFxgIGAgK1xuICAgICAgICAgICAgICBgZWxlbWVudHMuIFNlZSBodHRwczovL2xpdC5kZXYvbXNnL2V4cHJlc3Npb24taW4tJHt0YWd9IGZvciBtb3JlIGAgK1xuICAgICAgICAgICAgICBgaW5mb3JtYXRpb24uYDtcbiAgICAgICAgICAgIGlmICh0YWcgPT09ICd0ZW1wbGF0ZScpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG0pO1xuICAgICAgICAgICAgfSBlbHNlIGlzc3VlV2FybmluZygnJywgbSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE8gKGp1c3RpbmZhZ25hbmkpOiBmb3IgYXR0ZW1wdGVkIGR5bmFtaWMgdGFnIG5hbWVzLCB3ZSBkb24ndFxuICAgICAgICAvLyBpbmNyZW1lbnQgdGhlIGJpbmRpbmdJbmRleCwgYW5kIGl0J2xsIGJlIG9mZiBieSAxIGluIHRoZSBlbGVtZW50XG4gICAgICAgIC8vIGFuZCBvZmYgYnkgdHdvIGFmdGVyIGl0LlxuICAgICAgICBpZiAoKG5vZGUgYXMgRWxlbWVudCkuaGFzQXR0cmlidXRlcygpKSB7XG4gICAgICAgICAgLy8gV2UgZGVmZXIgcmVtb3ZpbmcgYm91bmQgYXR0cmlidXRlcyBiZWNhdXNlIG9uIElFIHdlIG1pZ2h0IG5vdCBiZVxuICAgICAgICAgIC8vIGl0ZXJhdGluZyBhdHRyaWJ1dGVzIGluIHRoZWlyIHRlbXBsYXRlIG9yZGVyLCBhbmQgd291bGQgc29tZXRpbWVzXG4gICAgICAgICAgLy8gcmVtb3ZlIGFuIGF0dHJpYnV0ZSB0aGF0IHdlIHN0aWxsIG5lZWQgdG8gY3JlYXRlIGEgcGFydCBmb3IuXG4gICAgICAgICAgY29uc3QgYXR0cnNUb1JlbW92ZSA9IFtdO1xuICAgICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiAobm9kZSBhcyBFbGVtZW50KS5nZXRBdHRyaWJ1dGVOYW1lcygpKSB7XG4gICAgICAgICAgICAvLyBgbmFtZWAgaXMgdGhlIG5hbWUgb2YgdGhlIGF0dHJpYnV0ZSB3ZSdyZSBpdGVyYXRpbmcgb3ZlciwgYnV0IG5vdFxuICAgICAgICAgICAgLy8gX25lY2Nlc3NhcmlseV8gdGhlIG5hbWUgb2YgdGhlIGF0dHJpYnV0ZSB3ZSB3aWxsIGNyZWF0ZSBhIHBhcnRcbiAgICAgICAgICAgIC8vIGZvci4gVGhleSBjYW4gYmUgZGlmZmVyZW50IGluIGJyb3dzZXJzIHRoYXQgZG9uJ3QgaXRlcmF0ZSBvblxuICAgICAgICAgICAgLy8gYXR0cmlidXRlcyBpbiBzb3VyY2Ugb3JkZXIuIEluIHRoYXQgY2FzZSB0aGUgYXR0ck5hbWVzIGFycmF5XG4gICAgICAgICAgICAvLyBjb250YWlucyB0aGUgYXR0cmlidXRlIG5hbWUgd2UnbGwgcHJvY2VzcyBuZXh0LiBXZSBvbmx5IG5lZWQgdGhlXG4gICAgICAgICAgICAvLyBhdHRyaWJ1dGUgbmFtZSBoZXJlIHRvIGtub3cgaWYgd2Ugc2hvdWxkIHByb2Nlc3MgYSBib3VuZCBhdHRyaWJ1dGVcbiAgICAgICAgICAgIC8vIG9uIHRoaXMgZWxlbWVudC5cbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgbmFtZS5lbmRzV2l0aChib3VuZEF0dHJpYnV0ZVN1ZmZpeCkgfHxcbiAgICAgICAgICAgICAgbmFtZS5zdGFydHNXaXRoKG1hcmtlcilcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICBjb25zdCByZWFsTmFtZSA9IGF0dHJOYW1lc1thdHRyTmFtZUluZGV4KytdO1xuICAgICAgICAgICAgICBhdHRyc1RvUmVtb3ZlLnB1c2gobmFtZSk7XG4gICAgICAgICAgICAgIGlmIChyZWFsTmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgLy8gTG93ZXJjYXNlIGZvciBjYXNlLXNlbnNpdGl2ZSBTVkcgYXR0cmlidXRlcyBsaWtlIHZpZXdCb3hcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IChub2RlIGFzIEVsZW1lbnQpLmdldEF0dHJpYnV0ZShcbiAgICAgICAgICAgICAgICAgIHJlYWxOYW1lLnRvTG93ZXJDYXNlKCkgKyBib3VuZEF0dHJpYnV0ZVN1ZmZpeFxuICAgICAgICAgICAgICAgICkhO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRpY3MgPSB2YWx1ZS5zcGxpdChtYXJrZXIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG0gPSAvKFsuP0BdKT8oLiopLy5leGVjKHJlYWxOYW1lKSE7XG4gICAgICAgICAgICAgICAgcGFydHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICB0eXBlOiBBVFRSSUJVVEVfUEFSVCxcbiAgICAgICAgICAgICAgICAgIGluZGV4OiBub2RlSW5kZXgsXG4gICAgICAgICAgICAgICAgICBuYW1lOiBtWzJdLFxuICAgICAgICAgICAgICAgICAgc3RyaW5nczogc3RhdGljcyxcbiAgICAgICAgICAgICAgICAgIGN0b3I6XG4gICAgICAgICAgICAgICAgICAgIG1bMV0gPT09ICcuJ1xuICAgICAgICAgICAgICAgICAgICAgID8gUHJvcGVydHlQYXJ0XG4gICAgICAgICAgICAgICAgICAgICAgOiBtWzFdID09PSAnPydcbiAgICAgICAgICAgICAgICAgICAgICA/IEJvb2xlYW5BdHRyaWJ1dGVQYXJ0XG4gICAgICAgICAgICAgICAgICAgICAgOiBtWzFdID09PSAnQCdcbiAgICAgICAgICAgICAgICAgICAgICA/IEV2ZW50UGFydFxuICAgICAgICAgICAgICAgICAgICAgIDogQXR0cmlidXRlUGFydCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6IEVMRU1FTlRfUEFSVCxcbiAgICAgICAgICAgICAgICAgIGluZGV4OiBub2RlSW5kZXgsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIGF0dHJzVG9SZW1vdmUpIHtcbiAgICAgICAgICAgIChub2RlIGFzIEVsZW1lbnQpLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETyAoanVzdGluZmFnbmFuaSk6IGJlbmNobWFyayB0aGUgcmVnZXggYWdhaW5zdCB0ZXN0aW5nIGZvciBlYWNoXG4gICAgICAgIC8vIG9mIHRoZSAzIHJhdyB0ZXh0IGVsZW1lbnQgbmFtZXMuXG4gICAgICAgIGlmIChyYXdUZXh0RWxlbWVudC50ZXN0KChub2RlIGFzIEVsZW1lbnQpLnRhZ05hbWUpKSB7XG4gICAgICAgICAgLy8gRm9yIHJhdyB0ZXh0IGVsZW1lbnRzIHdlIG5lZWQgdG8gc3BsaXQgdGhlIHRleHQgY29udGVudCBvblxuICAgICAgICAgIC8vIG1hcmtlcnMsIGNyZWF0ZSBhIFRleHQgbm9kZSBmb3IgZWFjaCBzZWdtZW50LCBhbmQgY3JlYXRlXG4gICAgICAgICAgLy8gYSBUZW1wbGF0ZVBhcnQgZm9yIGVhY2ggbWFya2VyLlxuICAgICAgICAgIGNvbnN0IHN0cmluZ3MgPSAobm9kZSBhcyBFbGVtZW50KS50ZXh0Q29udGVudCEuc3BsaXQobWFya2VyKTtcbiAgICAgICAgICBjb25zdCBsYXN0SW5kZXggPSBzdHJpbmdzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgaWYgKGxhc3RJbmRleCA+IDApIHtcbiAgICAgICAgICAgIChub2RlIGFzIEVsZW1lbnQpLnRleHRDb250ZW50ID0gdHJ1c3RlZFR5cGVzXG4gICAgICAgICAgICAgID8gKHRydXN0ZWRUeXBlcy5lbXB0eVNjcmlwdCBhcyB1bmtub3duIGFzICcnKVxuICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgLy8gR2VuZXJhdGUgYSBuZXcgdGV4dCBub2RlIGZvciBlYWNoIGxpdGVyYWwgc2VjdGlvblxuICAgICAgICAgICAgLy8gVGhlc2Ugbm9kZXMgYXJlIGFsc28gdXNlZCBhcyB0aGUgbWFya2VycyBmb3Igbm9kZSBwYXJ0c1xuICAgICAgICAgICAgLy8gV2UgY2FuJ3QgdXNlIGVtcHR5IHRleHQgbm9kZXMgYXMgbWFya2VycyBiZWNhdXNlIHRoZXkncmVcbiAgICAgICAgICAgIC8vIG5vcm1hbGl6ZWQgd2hlbiBjbG9uaW5nIGluIElFIChjb3VsZCBzaW1wbGlmeSB3aGVuXG4gICAgICAgICAgICAvLyBJRSBpcyBubyBsb25nZXIgc3VwcG9ydGVkKVxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsYXN0SW5kZXg7IGkrKykge1xuICAgICAgICAgICAgICAobm9kZSBhcyBFbGVtZW50KS5hcHBlbmQoc3RyaW5nc1tpXSwgY3JlYXRlTWFya2VyKCkpO1xuICAgICAgICAgICAgICAvLyBXYWxrIHBhc3QgdGhlIG1hcmtlciBub2RlIHdlIGp1c3QgYWRkZWRcbiAgICAgICAgICAgICAgd2Fsa2VyLm5leHROb2RlKCk7XG4gICAgICAgICAgICAgIHBhcnRzLnB1c2goe3R5cGU6IENISUxEX1BBUlQsIGluZGV4OiArK25vZGVJbmRleH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTm90ZSBiZWNhdXNlIHRoaXMgbWFya2VyIGlzIGFkZGVkIGFmdGVyIHRoZSB3YWxrZXIncyBjdXJyZW50XG4gICAgICAgICAgICAvLyBub2RlLCBpdCB3aWxsIGJlIHdhbGtlZCB0byBpbiB0aGUgb3V0ZXIgbG9vcCAoYW5kIGlnbm9yZWQpLCBzb1xuICAgICAgICAgICAgLy8gd2UgZG9uJ3QgbmVlZCB0byBhZGp1c3Qgbm9kZUluZGV4IGhlcmVcbiAgICAgICAgICAgIChub2RlIGFzIEVsZW1lbnQpLmFwcGVuZChzdHJpbmdzW2xhc3RJbmRleF0sIGNyZWF0ZU1hcmtlcigpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAobm9kZS5ub2RlVHlwZSA9PT0gOCkge1xuICAgICAgICBjb25zdCBkYXRhID0gKG5vZGUgYXMgQ29tbWVudCkuZGF0YTtcbiAgICAgICAgaWYgKGRhdGEgPT09IG1hcmtlck1hdGNoKSB7XG4gICAgICAgICAgcGFydHMucHVzaCh7dHlwZTogQ0hJTERfUEFSVCwgaW5kZXg6IG5vZGVJbmRleH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxldCBpID0gLTE7XG4gICAgICAgICAgd2hpbGUgKChpID0gKG5vZGUgYXMgQ29tbWVudCkuZGF0YS5pbmRleE9mKG1hcmtlciwgaSArIDEpKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIC8vIENvbW1lbnQgbm9kZSBoYXMgYSBiaW5kaW5nIG1hcmtlciBpbnNpZGUsIG1ha2UgYW4gaW5hY3RpdmUgcGFydFxuICAgICAgICAgICAgLy8gVGhlIGJpbmRpbmcgd29uJ3Qgd29yaywgYnV0IHN1YnNlcXVlbnQgYmluZGluZ3Mgd2lsbFxuICAgICAgICAgICAgcGFydHMucHVzaCh7dHlwZTogQ09NTUVOVF9QQVJULCBpbmRleDogbm9kZUluZGV4fSk7XG4gICAgICAgICAgICAvLyBNb3ZlIHRvIHRoZSBlbmQgb2YgdGhlIG1hdGNoXG4gICAgICAgICAgICBpICs9IG1hcmtlci5sZW5ndGggLSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbm9kZUluZGV4Kys7XG4gICAgfVxuICAgIGRlYnVnTG9nRXZlbnQ/Lih7XG4gICAgICBraW5kOiAndGVtcGxhdGUgcHJlcCcsXG4gICAgICB0ZW1wbGF0ZTogdGhpcyxcbiAgICAgIGNsb25hYmxlVGVtcGxhdGU6IHRoaXMuZWwsXG4gICAgICBwYXJ0czogdGhpcy5wYXJ0cyxcbiAgICAgIHN0cmluZ3MsXG4gICAgfSk7XG4gIH1cblxuICAvLyBPdmVycmlkZGVuIHZpYSBgbGl0SHRtbFBvbHlmaWxsU3VwcG9ydGAgdG8gcHJvdmlkZSBwbGF0Zm9ybSBzdXBwb3J0LlxuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGNyZWF0ZUVsZW1lbnQoaHRtbDogVHJ1c3RlZEhUTUwsIF9vcHRpb25zPzogUmVuZGVyT3B0aW9ucykge1xuICAgIGNvbnN0IGVsID0gZC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICAgIGVsLmlubmVySFRNTCA9IGh0bWwgYXMgdW5rbm93biBhcyBzdHJpbmc7XG4gICAgcmV0dXJuIGVsO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGlzY29ubmVjdGFibGUge1xuICBfJHBhcmVudD86IERpc2Nvbm5lY3RhYmxlO1xuICBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4/OiBTZXQ8RGlzY29ubmVjdGFibGU+O1xuICAvLyBSYXRoZXIgdGhhbiBob2xkIGNvbm5lY3Rpb24gc3RhdGUgb24gaW5zdGFuY2VzLCBEaXNjb25uZWN0YWJsZXMgcmVjdXJzaXZlbHlcbiAgLy8gZmV0Y2ggdGhlIGNvbm5lY3Rpb24gc3RhdGUgZnJvbSB0aGUgUm9vdFBhcnQgdGhleSBhcmUgY29ubmVjdGVkIGluIHZpYVxuICAvLyBnZXR0ZXJzIHVwIHRoZSBEaXNjb25uZWN0YWJsZSB0cmVlIHZpYSBfJHBhcmVudCByZWZlcmVuY2VzLiBUaGlzIHB1c2hlcyB0aGVcbiAgLy8gY29zdCBvZiB0cmFja2luZyB0aGUgaXNDb25uZWN0ZWQgc3RhdGUgdG8gYEFzeW5jRGlyZWN0aXZlc2AsIGFuZCBhdm9pZHNcbiAgLy8gbmVlZGluZyB0byBwYXNzIGFsbCBEaXNjb25uZWN0YWJsZXMgKHBhcnRzLCB0ZW1wbGF0ZSBpbnN0YW5jZXMsIGFuZFxuICAvLyBkaXJlY3RpdmVzKSB0aGVpciBjb25uZWN0aW9uIHN0YXRlIGVhY2ggdGltZSBpdCBjaGFuZ2VzLCB3aGljaCB3b3VsZCBiZVxuICAvLyBjb3N0bHkgZm9yIHRyZWVzIHRoYXQgaGF2ZSBubyBBc3luY0RpcmVjdGl2ZXMuXG4gIF8kaXNDb25uZWN0ZWQ6IGJvb2xlYW47XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVEaXJlY3RpdmUoXG4gIHBhcnQ6IENoaWxkUGFydCB8IEF0dHJpYnV0ZVBhcnQgfCBFbGVtZW50UGFydCxcbiAgdmFsdWU6IHVua25vd24sXG4gIHBhcmVudDogRGlyZWN0aXZlUGFyZW50ID0gcGFydCxcbiAgYXR0cmlidXRlSW5kZXg/OiBudW1iZXJcbik6IHVua25vd24ge1xuICAvLyBCYWlsIGVhcmx5IGlmIHRoZSB2YWx1ZSBpcyBleHBsaWNpdGx5IG5vQ2hhbmdlLiBOb3RlLCB0aGlzIG1lYW5zIGFueVxuICAvLyBuZXN0ZWQgZGlyZWN0aXZlIGlzIHN0aWxsIGF0dGFjaGVkIGFuZCBpcyBub3QgcnVuLlxuICBpZiAodmFsdWUgPT09IG5vQ2hhbmdlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIGxldCBjdXJyZW50RGlyZWN0aXZlID1cbiAgICBhdHRyaWJ1dGVJbmRleCAhPT0gdW5kZWZpbmVkXG4gICAgICA/IChwYXJlbnQgYXMgQXR0cmlidXRlUGFydCkuX19kaXJlY3RpdmVzPy5bYXR0cmlidXRlSW5kZXhdXG4gICAgICA6IChwYXJlbnQgYXMgQ2hpbGRQYXJ0IHwgRWxlbWVudFBhcnQgfCBEaXJlY3RpdmUpLl9fZGlyZWN0aXZlO1xuICBjb25zdCBuZXh0RGlyZWN0aXZlQ29uc3RydWN0b3IgPSBpc1ByaW1pdGl2ZSh2YWx1ZSlcbiAgICA/IHVuZGVmaW5lZFxuICAgIDogLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICAgICh2YWx1ZSBhcyBEaXJlY3RpdmVSZXN1bHQpWydfJGxpdERpcmVjdGl2ZSQnXTtcbiAgaWYgKGN1cnJlbnREaXJlY3RpdmU/LmNvbnN0cnVjdG9yICE9PSBuZXh0RGlyZWN0aXZlQ29uc3RydWN0b3IpIHtcbiAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIGN1cnJlbnREaXJlY3RpdmU/LlsnXyRub3RpZnlEaXJlY3RpdmVDb25uZWN0aW9uQ2hhbmdlZCddPy4oZmFsc2UpO1xuICAgIGlmIChuZXh0RGlyZWN0aXZlQ29uc3RydWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY3VycmVudERpcmVjdGl2ZSA9IHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgY3VycmVudERpcmVjdGl2ZSA9IG5ldyBuZXh0RGlyZWN0aXZlQ29uc3RydWN0b3IocGFydCBhcyBQYXJ0SW5mbyk7XG4gICAgICBjdXJyZW50RGlyZWN0aXZlLl8kaW5pdGlhbGl6ZShwYXJ0LCBwYXJlbnQsIGF0dHJpYnV0ZUluZGV4KTtcbiAgICB9XG4gICAgaWYgKGF0dHJpYnV0ZUluZGV4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICgocGFyZW50IGFzIEF0dHJpYnV0ZVBhcnQpLl9fZGlyZWN0aXZlcyA/Pz0gW10pW2F0dHJpYnV0ZUluZGV4XSA9XG4gICAgICAgIGN1cnJlbnREaXJlY3RpdmU7XG4gICAgfSBlbHNlIHtcbiAgICAgIChwYXJlbnQgYXMgQ2hpbGRQYXJ0IHwgRGlyZWN0aXZlKS5fX2RpcmVjdGl2ZSA9IGN1cnJlbnREaXJlY3RpdmU7XG4gICAgfVxuICB9XG4gIGlmIChjdXJyZW50RGlyZWN0aXZlICE9PSB1bmRlZmluZWQpIHtcbiAgICB2YWx1ZSA9IHJlc29sdmVEaXJlY3RpdmUoXG4gICAgICBwYXJ0LFxuICAgICAgY3VycmVudERpcmVjdGl2ZS5fJHJlc29sdmUocGFydCwgKHZhbHVlIGFzIERpcmVjdGl2ZVJlc3VsdCkudmFsdWVzKSxcbiAgICAgIGN1cnJlbnREaXJlY3RpdmUsXG4gICAgICBhdHRyaWJ1dGVJbmRleFxuICAgICk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIEFuIHVwZGF0ZWFibGUgaW5zdGFuY2Ugb2YgYSBUZW1wbGF0ZS4gSG9sZHMgcmVmZXJlbmNlcyB0byB0aGUgUGFydHMgdXNlZCB0b1xuICogdXBkYXRlIHRoZSB0ZW1wbGF0ZSBpbnN0YW5jZS5cbiAqL1xuY2xhc3MgVGVtcGxhdGVJbnN0YW5jZSBpbXBsZW1lbnRzIERpc2Nvbm5lY3RhYmxlIHtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHRlbXBsYXRlOiBUZW1wbGF0ZTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfcGFydHM6IEFycmF5PFBhcnQgfCB1bmRlZmluZWQ+ID0gW107XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHBhcmVudDogQ2hpbGRQYXJ0O1xuICAvKiogQGludGVybmFsICovXG4gIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT4gPSB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IodGVtcGxhdGU6IFRlbXBsYXRlLCBwYXJlbnQ6IENoaWxkUGFydCkge1xuICAgIHRoaXMuXyR0ZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICAgIHRoaXMuXyRwYXJlbnQgPSBwYXJlbnQ7XG4gIH1cblxuICAvLyBDYWxsZWQgYnkgQ2hpbGRQYXJ0IHBhcmVudE5vZGUgZ2V0dGVyXG4gIGdldCBwYXJlbnROb2RlKCkge1xuICAgIHJldHVybiB0aGlzLl8kcGFyZW50LnBhcmVudE5vZGU7XG4gIH1cblxuICAvLyBTZWUgY29tbWVudCBpbiBEaXNjb25uZWN0YWJsZSBpbnRlcmZhY2UgZm9yIHdoeSB0aGlzIGlzIGEgZ2V0dGVyXG4gIGdldCBfJGlzQ29ubmVjdGVkKCkge1xuICAgIHJldHVybiB0aGlzLl8kcGFyZW50Ll8kaXNDb25uZWN0ZWQ7XG4gIH1cblxuICAvLyBUaGlzIG1ldGhvZCBpcyBzZXBhcmF0ZSBmcm9tIHRoZSBjb25zdHJ1Y3RvciBiZWNhdXNlIHdlIG5lZWQgdG8gcmV0dXJuIGFcbiAgLy8gRG9jdW1lbnRGcmFnbWVudCBhbmQgd2UgZG9uJ3Qgd2FudCB0byBob2xkIG9udG8gaXQgd2l0aCBhbiBpbnN0YW5jZSBmaWVsZC5cbiAgX2Nsb25lKG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQpIHtcbiAgICBjb25zdCB7XG4gICAgICBlbDoge2NvbnRlbnR9LFxuICAgICAgcGFydHM6IHBhcnRzLFxuICAgIH0gPSB0aGlzLl8kdGVtcGxhdGU7XG4gICAgY29uc3QgZnJhZ21lbnQgPSAob3B0aW9ucz8uY3JlYXRpb25TY29wZSA/PyBkKS5pbXBvcnROb2RlKGNvbnRlbnQsIHRydWUpO1xuICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IGZyYWdtZW50O1xuXG4gICAgbGV0IG5vZGUgPSB3YWxrZXIubmV4dE5vZGUoKSE7XG4gICAgbGV0IG5vZGVJbmRleCA9IDA7XG4gICAgbGV0IHBhcnRJbmRleCA9IDA7XG4gICAgbGV0IHRlbXBsYXRlUGFydCA9IHBhcnRzWzBdO1xuXG4gICAgd2hpbGUgKHRlbXBsYXRlUGFydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAobm9kZUluZGV4ID09PSB0ZW1wbGF0ZVBhcnQuaW5kZXgpIHtcbiAgICAgICAgbGV0IHBhcnQ6IFBhcnQgfCB1bmRlZmluZWQ7XG4gICAgICAgIGlmICh0ZW1wbGF0ZVBhcnQudHlwZSA9PT0gQ0hJTERfUEFSVCkge1xuICAgICAgICAgIHBhcnQgPSBuZXcgQ2hpbGRQYXJ0KFxuICAgICAgICAgICAgbm9kZSBhcyBIVE1MRWxlbWVudCxcbiAgICAgICAgICAgIG5vZGUubmV4dFNpYmxpbmcsXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgb3B0aW9uc1xuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAodGVtcGxhdGVQYXJ0LnR5cGUgPT09IEFUVFJJQlVURV9QQVJUKSB7XG4gICAgICAgICAgcGFydCA9IG5ldyB0ZW1wbGF0ZVBhcnQuY3RvcihcbiAgICAgICAgICAgIG5vZGUgYXMgSFRNTEVsZW1lbnQsXG4gICAgICAgICAgICB0ZW1wbGF0ZVBhcnQubmFtZSxcbiAgICAgICAgICAgIHRlbXBsYXRlUGFydC5zdHJpbmdzLFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgIG9wdGlvbnNcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlUGFydC50eXBlID09PSBFTEVNRU5UX1BBUlQpIHtcbiAgICAgICAgICBwYXJ0ID0gbmV3IEVsZW1lbnRQYXJ0KG5vZGUgYXMgSFRNTEVsZW1lbnQsIHRoaXMsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3BhcnRzLnB1c2gocGFydCk7XG4gICAgICAgIHRlbXBsYXRlUGFydCA9IHBhcnRzWysrcGFydEluZGV4XTtcbiAgICAgIH1cbiAgICAgIGlmIChub2RlSW5kZXggIT09IHRlbXBsYXRlUGFydD8uaW5kZXgpIHtcbiAgICAgICAgbm9kZSA9IHdhbGtlci5uZXh0Tm9kZSgpITtcbiAgICAgICAgbm9kZUluZGV4Kys7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmcmFnbWVudDtcbiAgfVxuXG4gIF91cGRhdGUodmFsdWVzOiBBcnJheTx1bmtub3duPikge1xuICAgIGxldCBpID0gMDtcbiAgICBmb3IgKGNvbnN0IHBhcnQgb2YgdGhpcy5fcGFydHMpIHtcbiAgICAgIGlmIChwYXJ0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZGVidWdMb2dFdmVudD8uKHtcbiAgICAgICAgICBraW5kOiAnc2V0IHBhcnQnLFxuICAgICAgICAgIHBhcnQsXG4gICAgICAgICAgdmFsdWU6IHZhbHVlc1tpXSxcbiAgICAgICAgICB2YWx1ZUluZGV4OiBpLFxuICAgICAgICAgIHZhbHVlcyxcbiAgICAgICAgICB0ZW1wbGF0ZUluc3RhbmNlOiB0aGlzLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKChwYXJ0IGFzIEF0dHJpYnV0ZVBhcnQpLnN0cmluZ3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIChwYXJ0IGFzIEF0dHJpYnV0ZVBhcnQpLl8kc2V0VmFsdWUodmFsdWVzLCBwYXJ0IGFzIEF0dHJpYnV0ZVBhcnQsIGkpO1xuICAgICAgICAgIC8vIFRoZSBudW1iZXIgb2YgdmFsdWVzIHRoZSBwYXJ0IGNvbnN1bWVzIGlzIHBhcnQuc3RyaW5ncy5sZW5ndGggLSAxXG4gICAgICAgICAgLy8gc2luY2UgdmFsdWVzIGFyZSBpbiBiZXR3ZWVuIHRlbXBsYXRlIHNwYW5zLiBXZSBpbmNyZW1lbnQgaSBieSAxXG4gICAgICAgICAgLy8gbGF0ZXIgaW4gdGhlIGxvb3AsIHNvIGluY3JlbWVudCBpdCBieSBwYXJ0LnN0cmluZ3MubGVuZ3RoIC0gMiBoZXJlXG4gICAgICAgICAgaSArPSAocGFydCBhcyBBdHRyaWJ1dGVQYXJ0KS5zdHJpbmdzIS5sZW5ndGggLSAyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhcnQuXyRzZXRWYWx1ZSh2YWx1ZXNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpKys7XG4gICAgfVxuICB9XG59XG5cbi8qXG4gKiBQYXJ0c1xuICovXG50eXBlIEF0dHJpYnV0ZVRlbXBsYXRlUGFydCA9IHtcbiAgcmVhZG9ubHkgdHlwZTogdHlwZW9mIEFUVFJJQlVURV9QQVJUO1xuICByZWFkb25seSBpbmRleDogbnVtYmVyO1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcmVhZG9ubHkgY3RvcjogdHlwZW9mIEF0dHJpYnV0ZVBhcnQ7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcmVhZG9ubHkgc3RyaW5nczogUmVhZG9ubHlBcnJheTxzdHJpbmc+O1xufTtcbnR5cGUgTm9kZVRlbXBsYXRlUGFydCA9IHtcbiAgcmVhZG9ubHkgdHlwZTogdHlwZW9mIENISUxEX1BBUlQ7XG4gIHJlYWRvbmx5IGluZGV4OiBudW1iZXI7XG59O1xudHlwZSBFbGVtZW50VGVtcGxhdGVQYXJ0ID0ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgRUxFTUVOVF9QQVJUO1xuICByZWFkb25seSBpbmRleDogbnVtYmVyO1xufTtcbnR5cGUgQ29tbWVudFRlbXBsYXRlUGFydCA9IHtcbiAgcmVhZG9ubHkgdHlwZTogdHlwZW9mIENPTU1FTlRfUEFSVDtcbiAgcmVhZG9ubHkgaW5kZXg6IG51bWJlcjtcbn07XG5cbi8qKlxuICogQSBUZW1wbGF0ZVBhcnQgcmVwcmVzZW50cyBhIGR5bmFtaWMgcGFydCBpbiBhIHRlbXBsYXRlLCBiZWZvcmUgdGhlIHRlbXBsYXRlXG4gKiBpcyBpbnN0YW50aWF0ZWQuIFdoZW4gYSB0ZW1wbGF0ZSBpcyBpbnN0YW50aWF0ZWQgUGFydHMgYXJlIGNyZWF0ZWQgZnJvbVxuICogVGVtcGxhdGVQYXJ0cy5cbiAqL1xudHlwZSBUZW1wbGF0ZVBhcnQgPVxuICB8IE5vZGVUZW1wbGF0ZVBhcnRcbiAgfCBBdHRyaWJ1dGVUZW1wbGF0ZVBhcnRcbiAgfCBFbGVtZW50VGVtcGxhdGVQYXJ0XG4gIHwgQ29tbWVudFRlbXBsYXRlUGFydDtcblxuZXhwb3J0IHR5cGUgUGFydCA9XG4gIHwgQ2hpbGRQYXJ0XG4gIHwgQXR0cmlidXRlUGFydFxuICB8IFByb3BlcnR5UGFydFxuICB8IEJvb2xlYW5BdHRyaWJ1dGVQYXJ0XG4gIHwgRWxlbWVudFBhcnRcbiAgfCBFdmVudFBhcnQ7XG5cbmV4cG9ydCB0eXBlIHtDaGlsZFBhcnR9O1xuY2xhc3MgQ2hpbGRQYXJ0IGltcGxlbWVudHMgRGlzY29ubmVjdGFibGUge1xuICByZWFkb25seSB0eXBlID0gQ0hJTERfUEFSVDtcbiAgcmVhZG9ubHkgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgXyRjb21taXR0ZWRWYWx1ZTogdW5rbm93biA9IG5vdGhpbmc7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX19kaXJlY3RpdmU/OiBEaXJlY3RpdmU7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRzdGFydE5vZGU6IENoaWxkTm9kZTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGVuZE5vZGU6IENoaWxkTm9kZSB8IG51bGw7XG4gIHByaXZhdGUgX3RleHRTYW5pdGl6ZXI6IFZhbHVlU2FuaXRpemVyIHwgdW5kZWZpbmVkO1xuICAvKiogQGludGVybmFsICovXG4gIF8kcGFyZW50OiBEaXNjb25uZWN0YWJsZSB8IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIENvbm5lY3Rpb24gc3RhdGUgZm9yIFJvb3RQYXJ0cyBvbmx5IChpLmUuIENoaWxkUGFydCB3aXRob3V0IF8kcGFyZW50XG4gICAqIHJldHVybmVkIGZyb20gdG9wLWxldmVsIGByZW5kZXJgKS4gVGhpcyBmaWVsZCBpcyB1bnNlZCBvdGhlcndpc2UuIFRoZVxuICAgKiBpbnRlbnRpb24gd291bGQgY2xlYXJlciBpZiB3ZSBtYWRlIGBSb290UGFydGAgYSBzdWJjbGFzcyBvZiBgQ2hpbGRQYXJ0YFxuICAgKiB3aXRoIHRoaXMgZmllbGQgKGFuZCBhIGRpZmZlcmVudCBfJGlzQ29ubmVjdGVkIGdldHRlciksIGJ1dCB0aGUgc3ViY2xhc3NcbiAgICogY2F1c2VkIGEgcGVyZiByZWdyZXNzaW9uLCBwb3NzaWJseSBkdWUgdG8gbWFraW5nIGNhbGwgc2l0ZXMgcG9seW1vcnBoaWMuXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgX19pc0Nvbm5lY3RlZDogYm9vbGVhbjtcblxuICAvLyBTZWUgY29tbWVudCBpbiBEaXNjb25uZWN0YWJsZSBpbnRlcmZhY2UgZm9yIHdoeSB0aGlzIGlzIGEgZ2V0dGVyXG4gIGdldCBfJGlzQ29ubmVjdGVkKCkge1xuICAgIC8vIENoaWxkUGFydHMgdGhhdCBhcmUgbm90IGF0IHRoZSByb290IHNob3VsZCBhbHdheXMgYmUgY3JlYXRlZCB3aXRoIGFcbiAgICAvLyBwYXJlbnQ7IG9ubHkgUm9vdENoaWxkTm9kZSdzIHdvbid0LCBzbyB0aGV5IHJldHVybiB0aGUgbG9jYWwgaXNDb25uZWN0ZWRcbiAgICAvLyBzdGF0ZVxuICAgIHJldHVybiB0aGlzLl8kcGFyZW50Py5fJGlzQ29ubmVjdGVkID8/IHRoaXMuX19pc0Nvbm5lY3RlZDtcbiAgfVxuXG4gIC8vIFRoZSBmb2xsb3dpbmcgZmllbGRzIHdpbGwgYmUgcGF0Y2hlZCBvbnRvIENoaWxkUGFydHMgd2hlbiByZXF1aXJlZCBieVxuICAvLyBBc3luY0RpcmVjdGl2ZVxuICAvKiogQGludGVybmFsICovXG4gIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT4gPSB1bmRlZmluZWQ7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZD8oXG4gICAgaXNDb25uZWN0ZWQ6IGJvb2xlYW4sXG4gICAgcmVtb3ZlRnJvbVBhcmVudD86IGJvb2xlYW4sXG4gICAgZnJvbT86IG51bWJlclxuICApOiB2b2lkO1xuICAvKiogQGludGVybmFsICovXG4gIF8kcmVwYXJlbnREaXNjb25uZWN0YWJsZXM/KHBhcmVudDogRGlzY29ubmVjdGFibGUpOiB2b2lkO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHN0YXJ0Tm9kZTogQ2hpbGROb2RlLFxuICAgIGVuZE5vZGU6IENoaWxkTm9kZSB8IG51bGwsXG4gICAgcGFyZW50OiBUZW1wbGF0ZUluc3RhbmNlIHwgQ2hpbGRQYXJ0IHwgdW5kZWZpbmVkLFxuICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgdGhpcy5fJHN0YXJ0Tm9kZSA9IHN0YXJ0Tm9kZTtcbiAgICB0aGlzLl8kZW5kTm9kZSA9IGVuZE5vZGU7XG4gICAgdGhpcy5fJHBhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIC8vIE5vdGUgX19pc0Nvbm5lY3RlZCBpcyBvbmx5IGV2ZXIgYWNjZXNzZWQgb24gUm9vdFBhcnRzIChpLmUuIHdoZW4gdGhlcmUgaXNcbiAgICAvLyBubyBfJHBhcmVudCk7IHRoZSB2YWx1ZSBvbiBhIG5vbi1yb290LXBhcnQgaXMgXCJkb24ndCBjYXJlXCIsIGJ1dCBjaGVja2luZ1xuICAgIC8vIGZvciBwYXJlbnQgd291bGQgYmUgbW9yZSBjb2RlXG4gICAgdGhpcy5fX2lzQ29ubmVjdGVkID0gb3B0aW9ucz8uaXNDb25uZWN0ZWQgPz8gdHJ1ZTtcbiAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICAvLyBFeHBsaWNpdGx5IGluaXRpYWxpemUgZm9yIGNvbnNpc3RlbnQgY2xhc3Mgc2hhcGUuXG4gICAgICB0aGlzLl90ZXh0U2FuaXRpemVyID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgcGFyZW50IG5vZGUgaW50byB3aGljaCB0aGUgcGFydCByZW5kZXJzIGl0cyBjb250ZW50LlxuICAgKlxuICAgKiBBIENoaWxkUGFydCdzIGNvbnRlbnQgY29uc2lzdHMgb2YgYSByYW5nZSBvZiBhZGphY2VudCBjaGlsZCBub2RlcyBvZlxuICAgKiBgLnBhcmVudE5vZGVgLCBwb3NzaWJseSBib3JkZXJlZCBieSAnbWFya2VyIG5vZGVzJyAoYC5zdGFydE5vZGVgIGFuZFxuICAgKiBgLmVuZE5vZGVgKS5cbiAgICpcbiAgICogLSBJZiBib3RoIGAuc3RhcnROb2RlYCBhbmQgYC5lbmROb2RlYCBhcmUgbm9uLW51bGwsIHRoZW4gdGhlIHBhcnQncyBjb250ZW50XG4gICAqIGNvbnNpc3RzIG9mIGFsbCBzaWJsaW5ncyBiZXR3ZWVuIGAuc3RhcnROb2RlYCBhbmQgYC5lbmROb2RlYCwgZXhjbHVzaXZlbHkuXG4gICAqXG4gICAqIC0gSWYgYC5zdGFydE5vZGVgIGlzIG5vbi1udWxsIGJ1dCBgLmVuZE5vZGVgIGlzIG51bGwsIHRoZW4gdGhlIHBhcnQnc1xuICAgKiBjb250ZW50IGNvbnNpc3RzIG9mIGFsbCBzaWJsaW5ncyBmb2xsb3dpbmcgYC5zdGFydE5vZGVgLCB1cCB0byBhbmRcbiAgICogaW5jbHVkaW5nIHRoZSBsYXN0IGNoaWxkIG9mIGAucGFyZW50Tm9kZWAuIElmIGAuZW5kTm9kZWAgaXMgbm9uLW51bGwsIHRoZW5cbiAgICogYC5zdGFydE5vZGVgIHdpbGwgYWx3YXlzIGJlIG5vbi1udWxsLlxuICAgKlxuICAgKiAtIElmIGJvdGggYC5lbmROb2RlYCBhbmQgYC5zdGFydE5vZGVgIGFyZSBudWxsLCB0aGVuIHRoZSBwYXJ0J3MgY29udGVudFxuICAgKiBjb25zaXN0cyBvZiBhbGwgY2hpbGQgbm9kZXMgb2YgYC5wYXJlbnROb2RlYC5cbiAgICovXG4gIGdldCBwYXJlbnROb2RlKCk6IE5vZGUge1xuICAgIGxldCBwYXJlbnROb2RlOiBOb2RlID0gd3JhcCh0aGlzLl8kc3RhcnROb2RlKS5wYXJlbnROb2RlITtcbiAgICBjb25zdCBwYXJlbnQgPSB0aGlzLl8kcGFyZW50O1xuICAgIGlmIChcbiAgICAgIHBhcmVudCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICBwYXJlbnROb2RlLm5vZGVUeXBlID09PSAxMSAvKiBOb2RlLkRPQ1VNRU5UX0ZSQUdNRU5UICovXG4gICAgKSB7XG4gICAgICAvLyBJZiB0aGUgcGFyZW50Tm9kZSBpcyBhIERvY3VtZW50RnJhZ21lbnQsIGl0IG1heSBiZSBiZWNhdXNlIHRoZSBET00gaXNcbiAgICAgIC8vIHN0aWxsIGluIHRoZSBjbG9uZWQgZnJhZ21lbnQgZHVyaW5nIGluaXRpYWwgcmVuZGVyOyBpZiBzbywgZ2V0IHRoZSByZWFsXG4gICAgICAvLyBwYXJlbnROb2RlIHRoZSBwYXJ0IHdpbGwgYmUgY29tbWl0dGVkIGludG8gYnkgYXNraW5nIHRoZSBwYXJlbnQuXG4gICAgICBwYXJlbnROb2RlID0gKHBhcmVudCBhcyBDaGlsZFBhcnQgfCBUZW1wbGF0ZUluc3RhbmNlKS5wYXJlbnROb2RlO1xuICAgIH1cbiAgICByZXR1cm4gcGFyZW50Tm9kZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgcGFydCdzIGxlYWRpbmcgbWFya2VyIG5vZGUsIGlmIGFueS4gU2VlIGAucGFyZW50Tm9kZWAgZm9yIG1vcmVcbiAgICogaW5mb3JtYXRpb24uXG4gICAqL1xuICBnZXQgc3RhcnROb2RlKCk6IE5vZGUgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5fJHN0YXJ0Tm9kZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgcGFydCdzIHRyYWlsaW5nIG1hcmtlciBub2RlLCBpZiBhbnkuIFNlZSBgLnBhcmVudE5vZGVgIGZvciBtb3JlXG4gICAqIGluZm9ybWF0aW9uLlxuICAgKi9cbiAgZ2V0IGVuZE5vZGUoKTogTm9kZSB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLl8kZW5kTm9kZTtcbiAgfVxuXG4gIF8kc2V0VmFsdWUodmFsdWU6IHVua25vd24sIGRpcmVjdGl2ZVBhcmVudDogRGlyZWN0aXZlUGFyZW50ID0gdGhpcyk6IHZvaWQge1xuICAgIGlmIChERVZfTU9ERSAmJiB0aGlzLnBhcmVudE5vZGUgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFRoaXMgXFxgQ2hpbGRQYXJ0XFxgIGhhcyBubyBcXGBwYXJlbnROb2RlXFxgIGFuZCB0aGVyZWZvcmUgY2Fubm90IGFjY2VwdCBhIHZhbHVlLiBUaGlzIGxpa2VseSBtZWFucyB0aGUgZWxlbWVudCBjb250YWluaW5nIHRoZSBwYXJ0IHdhcyBtYW5pcHVsYXRlZCBpbiBhbiB1bnN1cHBvcnRlZCB3YXkgb3V0c2lkZSBvZiBMaXQncyBjb250cm9sIHN1Y2ggdGhhdCB0aGUgcGFydCdzIG1hcmtlciBub2RlcyB3ZXJlIGVqZWN0ZWQgZnJvbSBET00uIEZvciBleGFtcGxlLCBzZXR0aW5nIHRoZSBlbGVtZW50J3MgXFxgaW5uZXJIVE1MXFxgIG9yIFxcYHRleHRDb250ZW50XFxgIGNhbiBkbyB0aGlzLmBcbiAgICAgICk7XG4gICAgfVxuICAgIHZhbHVlID0gcmVzb2x2ZURpcmVjdGl2ZSh0aGlzLCB2YWx1ZSwgZGlyZWN0aXZlUGFyZW50KTtcbiAgICBpZiAoaXNQcmltaXRpdmUodmFsdWUpKSB7XG4gICAgICAvLyBOb24tcmVuZGVyaW5nIGNoaWxkIHZhbHVlcy4gSXQncyBpbXBvcnRhbnQgdGhhdCB0aGVzZSBkbyBub3QgcmVuZGVyXG4gICAgICAvLyBlbXB0eSB0ZXh0IG5vZGVzIHRvIGF2b2lkIGlzc3VlcyB3aXRoIHByZXZlbnRpbmcgZGVmYXVsdCA8c2xvdD5cbiAgICAgIC8vIGZhbGxiYWNrIGNvbnRlbnQuXG4gICAgICBpZiAodmFsdWUgPT09IG5vdGhpbmcgfHwgdmFsdWUgPT0gbnVsbCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICAgICAgaWYgKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSAhPT0gbm90aGluZykge1xuICAgICAgICAgIGRlYnVnTG9nRXZlbnQ/Lih7XG4gICAgICAgICAgICBraW5kOiAnY29tbWl0IG5vdGhpbmcgdG8gY2hpbGQnLFxuICAgICAgICAgICAgc3RhcnQ6IHRoaXMuXyRzdGFydE5vZGUsXG4gICAgICAgICAgICBlbmQ6IHRoaXMuXyRlbmROb2RlLFxuICAgICAgICAgICAgcGFyZW50OiB0aGlzLl8kcGFyZW50LFxuICAgICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHRoaXMuXyRjbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IG5vdGhpbmc7XG4gICAgICB9IGVsc2UgaWYgKHZhbHVlICE9PSB0aGlzLl8kY29tbWl0dGVkVmFsdWUgJiYgdmFsdWUgIT09IG5vQ2hhbmdlKSB7XG4gICAgICAgIHRoaXMuX2NvbW1pdFRleHQodmFsdWUpO1xuICAgICAgfVxuICAgICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICB9IGVsc2UgaWYgKCh2YWx1ZSBhcyBUZW1wbGF0ZVJlc3VsdClbJ18kbGl0VHlwZSQnXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9jb21taXRUZW1wbGF0ZVJlc3VsdCh2YWx1ZSBhcyBUZW1wbGF0ZVJlc3VsdCk7XG4gICAgfSBlbHNlIGlmICgodmFsdWUgYXMgTm9kZSkubm9kZVR5cGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fY29tbWl0Tm9kZSh2YWx1ZSBhcyBOb2RlKTtcbiAgICB9IGVsc2UgaWYgKGlzSXRlcmFibGUodmFsdWUpKSB7XG4gICAgICB0aGlzLl9jb21taXRJdGVyYWJsZSh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEZhbGxiYWNrLCB3aWxsIHJlbmRlciB0aGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAgICB0aGlzLl9jb21taXRUZXh0KHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9pbnNlcnQ8VCBleHRlbmRzIE5vZGU+KG5vZGU6IFQsIHJlZiA9IHRoaXMuXyRlbmROb2RlKSB7XG4gICAgcmV0dXJuIHdyYXAod3JhcCh0aGlzLl8kc3RhcnROb2RlKS5wYXJlbnROb2RlISkuaW5zZXJ0QmVmb3JlKG5vZGUsIHJlZik7XG4gIH1cblxuICBwcml2YXRlIF9jb21taXROb2RlKHZhbHVlOiBOb2RlKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgIHRoaXMuXyRjbGVhcigpO1xuICAgICAgaWYgKFxuICAgICAgICBFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MgJiZcbiAgICAgICAgc2FuaXRpemVyRmFjdG9yeUludGVybmFsICE9PSBub29wU2FuaXRpemVyXG4gICAgICApIHtcbiAgICAgICAgY29uc3QgcGFyZW50Tm9kZU5hbWUgPSB0aGlzLl8kc3RhcnROb2RlLnBhcmVudE5vZGU/Lm5vZGVOYW1lO1xuICAgICAgICBpZiAocGFyZW50Tm9kZU5hbWUgPT09ICdTVFlMRScgfHwgcGFyZW50Tm9kZU5hbWUgPT09ICdTQ1JJUFQnKSB7XG4gICAgICAgICAgbGV0IG1lc3NhZ2UgPSAnRm9yYmlkZGVuJztcbiAgICAgICAgICBpZiAoREVWX01PREUpIHtcbiAgICAgICAgICAgIGlmIChwYXJlbnROb2RlTmFtZSA9PT0gJ1NUWUxFJykge1xuICAgICAgICAgICAgICBtZXNzYWdlID1cbiAgICAgICAgICAgICAgICBgTGl0IGRvZXMgbm90IHN1cHBvcnQgYmluZGluZyBpbnNpZGUgc3R5bGUgbm9kZXMuIGAgK1xuICAgICAgICAgICAgICAgIGBUaGlzIGlzIGEgc2VjdXJpdHkgcmlzaywgYXMgc3R5bGUgaW5qZWN0aW9uIGF0dGFja3MgY2FuIGAgK1xuICAgICAgICAgICAgICAgIGBleGZpbHRyYXRlIGRhdGEgYW5kIHNwb29mIFVJcy4gYCArXG4gICAgICAgICAgICAgICAgYENvbnNpZGVyIGluc3RlYWQgdXNpbmcgY3NzXFxgLi4uXFxgIGxpdGVyYWxzIGAgK1xuICAgICAgICAgICAgICAgIGB0byBjb21wb3NlIHN0eWxlcywgYW5kIG1ha2UgZG8gZHluYW1pYyBzdHlsaW5nIHdpdGggYCArXG4gICAgICAgICAgICAgICAgYGNzcyBjdXN0b20gcHJvcGVydGllcywgOjpwYXJ0cywgPHNsb3Q+cywgYCArXG4gICAgICAgICAgICAgICAgYGFuZCBieSBtdXRhdGluZyB0aGUgRE9NIHJhdGhlciB0aGFuIHN0eWxlc2hlZXRzLmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBtZXNzYWdlID1cbiAgICAgICAgICAgICAgICBgTGl0IGRvZXMgbm90IHN1cHBvcnQgYmluZGluZyBpbnNpZGUgc2NyaXB0IG5vZGVzLiBgICtcbiAgICAgICAgICAgICAgICBgVGhpcyBpcyBhIHNlY3VyaXR5IHJpc2ssIGFzIGl0IGNvdWxkIGFsbG93IGFyYml0cmFyeSBgICtcbiAgICAgICAgICAgICAgICBgY29kZSBleGVjdXRpb24uYDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBkZWJ1Z0xvZ0V2ZW50Py4oe1xuICAgICAgICBraW5kOiAnY29tbWl0IG5vZGUnLFxuICAgICAgICBzdGFydDogdGhpcy5fJHN0YXJ0Tm9kZSxcbiAgICAgICAgcGFyZW50OiB0aGlzLl8kcGFyZW50LFxuICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgIH0pO1xuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gdGhpcy5faW5zZXJ0KHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9jb21taXRUZXh0KHZhbHVlOiB1bmtub3duKTogdm9pZCB7XG4gICAgLy8gSWYgdGhlIGNvbW1pdHRlZCB2YWx1ZSBpcyBhIHByaW1pdGl2ZSBpdCBtZWFucyB3ZSBjYWxsZWQgX2NvbW1pdFRleHQgb25cbiAgICAvLyB0aGUgcHJldmlvdXMgcmVuZGVyLCBhbmQgd2Uga25vdyB0aGF0IHRoaXMuXyRzdGFydE5vZGUubmV4dFNpYmxpbmcgaXMgYVxuICAgIC8vIFRleHQgbm9kZS4gV2UgY2FuIG5vdyBqdXN0IHJlcGxhY2UgdGhlIHRleHQgY29udGVudCAoLmRhdGEpIG9mIHRoZSBub2RlLlxuICAgIGlmIChcbiAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSAhPT0gbm90aGluZyAmJlxuICAgICAgaXNQcmltaXRpdmUodGhpcy5fJGNvbW1pdHRlZFZhbHVlKVxuICAgICkge1xuICAgICAgY29uc3Qgbm9kZSA9IHdyYXAodGhpcy5fJHN0YXJ0Tm9kZSkubmV4dFNpYmxpbmcgYXMgVGV4dDtcbiAgICAgIGlmIChFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MpIHtcbiAgICAgICAgaWYgKHRoaXMuX3RleHRTYW5pdGl6ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRoaXMuX3RleHRTYW5pdGl6ZXIgPSBjcmVhdGVTYW5pdGl6ZXIobm9kZSwgJ2RhdGEnLCAncHJvcGVydHknKTtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZSA9IHRoaXMuX3RleHRTYW5pdGl6ZXIodmFsdWUpO1xuICAgICAgfVxuICAgICAgZGVidWdMb2dFdmVudD8uKHtcbiAgICAgICAga2luZDogJ2NvbW1pdCB0ZXh0JyxcbiAgICAgICAgbm9kZSxcbiAgICAgICAgdmFsdWUsXG4gICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgIH0pO1xuICAgICAgKG5vZGUgYXMgVGV4dCkuZGF0YSA9IHZhbHVlIGFzIHN0cmluZztcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgICBjb25zdCB0ZXh0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgICAgdGhpcy5fY29tbWl0Tm9kZSh0ZXh0Tm9kZSk7XG4gICAgICAgIC8vIFdoZW4gc2V0dGluZyB0ZXh0IGNvbnRlbnQsIGZvciBzZWN1cml0eSBwdXJwb3NlcyBpdCBtYXR0ZXJzIGEgbG90XG4gICAgICAgIC8vIHdoYXQgdGhlIHBhcmVudCBpcy4gRm9yIGV4YW1wbGUsIDxzdHlsZT4gYW5kIDxzY3JpcHQ+IG5lZWQgdG8gYmVcbiAgICAgICAgLy8gaGFuZGxlZCB3aXRoIGNhcmUsIHdoaWxlIDxzcGFuPiBkb2VzIG5vdC4gU28gZmlyc3Qgd2UgbmVlZCB0byBwdXQgYVxuICAgICAgICAvLyB0ZXh0IG5vZGUgaW50byB0aGUgZG9jdW1lbnQsIHRoZW4gd2UgY2FuIHNhbml0aXplIGl0cyBjb250ZW50LlxuICAgICAgICBpZiAodGhpcy5fdGV4dFNhbml0aXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhpcy5fdGV4dFNhbml0aXplciA9IGNyZWF0ZVNhbml0aXplcih0ZXh0Tm9kZSwgJ2RhdGEnLCAncHJvcGVydHknKTtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZSA9IHRoaXMuX3RleHRTYW5pdGl6ZXIodmFsdWUpO1xuICAgICAgICBkZWJ1Z0xvZ0V2ZW50Py4oe1xuICAgICAgICAgIGtpbmQ6ICdjb21taXQgdGV4dCcsXG4gICAgICAgICAgbm9kZTogdGV4dE5vZGUsXG4gICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICB9KTtcbiAgICAgICAgdGV4dE5vZGUuZGF0YSA9IHZhbHVlIGFzIHN0cmluZztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2NvbW1pdE5vZGUoZC5jcmVhdGVUZXh0Tm9kZSh2YWx1ZSBhcyBzdHJpbmcpKTtcbiAgICAgICAgZGVidWdMb2dFdmVudD8uKHtcbiAgICAgICAgICBraW5kOiAnY29tbWl0IHRleHQnLFxuICAgICAgICAgIG5vZGU6IHdyYXAodGhpcy5fJHN0YXJ0Tm9kZSkubmV4dFNpYmxpbmcgYXMgVGV4dCxcbiAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSB2YWx1ZTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbW1pdFRlbXBsYXRlUmVzdWx0KFxuICAgIHJlc3VsdDogVGVtcGxhdGVSZXN1bHQgfCBDb21waWxlZFRlbXBsYXRlUmVzdWx0XG4gICk6IHZvaWQge1xuICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgY29uc3Qge3ZhbHVlcywgWydfJGxpdFR5cGUkJ106IHR5cGV9ID0gcmVzdWx0O1xuICAgIC8vIElmICRsaXRUeXBlJCBpcyBhIG51bWJlciwgcmVzdWx0IGlzIGEgcGxhaW4gVGVtcGxhdGVSZXN1bHQgYW5kIHdlIGdldFxuICAgIC8vIHRoZSB0ZW1wbGF0ZSBmcm9tIHRoZSB0ZW1wbGF0ZSBjYWNoZS4gSWYgbm90LCByZXN1bHQgaXMgYVxuICAgIC8vIENvbXBpbGVkVGVtcGxhdGVSZXN1bHQgYW5kIF8kbGl0VHlwZSQgaXMgYSBDb21waWxlZFRlbXBsYXRlIGFuZCB3ZSBuZWVkXG4gICAgLy8gdG8gY3JlYXRlIHRoZSA8dGVtcGxhdGU+IGVsZW1lbnQgdGhlIGZpcnN0IHRpbWUgd2Ugc2VlIGl0LlxuICAgIGNvbnN0IHRlbXBsYXRlOiBUZW1wbGF0ZSB8IENvbXBpbGVkVGVtcGxhdGUgPVxuICAgICAgdHlwZW9mIHR5cGUgPT09ICdudW1iZXInXG4gICAgICAgID8gdGhpcy5fJGdldFRlbXBsYXRlKHJlc3VsdCBhcyBUZW1wbGF0ZVJlc3VsdClcbiAgICAgICAgOiAodHlwZS5lbCA9PT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAodHlwZS5lbCA9IFRlbXBsYXRlLmNyZWF0ZUVsZW1lbnQodHlwZS5oLCB0aGlzLm9wdGlvbnMpKSxcbiAgICAgICAgICB0eXBlKTtcblxuICAgIGlmICgodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIFRlbXBsYXRlSW5zdGFuY2UpPy5fJHRlbXBsYXRlID09PSB0ZW1wbGF0ZSkge1xuICAgICAgZGVidWdMb2dFdmVudD8uKHtcbiAgICAgICAga2luZDogJ3RlbXBsYXRlIHVwZGF0aW5nJyxcbiAgICAgICAgdGVtcGxhdGUsXG4gICAgICAgIGluc3RhbmNlOiB0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgVGVtcGxhdGVJbnN0YW5jZSxcbiAgICAgICAgcGFydHM6ICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgVGVtcGxhdGVJbnN0YW5jZSkuX3BhcnRzLFxuICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgIHZhbHVlcyxcbiAgICAgIH0pO1xuICAgICAgKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBUZW1wbGF0ZUluc3RhbmNlKS5fdXBkYXRlKHZhbHVlcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGluc3RhbmNlID0gbmV3IFRlbXBsYXRlSW5zdGFuY2UodGVtcGxhdGUgYXMgVGVtcGxhdGUsIHRoaXMpO1xuICAgICAgY29uc3QgZnJhZ21lbnQgPSBpbnN0YW5jZS5fY2xvbmUodGhpcy5vcHRpb25zKTtcbiAgICAgIGRlYnVnTG9nRXZlbnQ/Lih7XG4gICAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSBpbnN0YW50aWF0ZWQnLFxuICAgICAgICB0ZW1wbGF0ZSxcbiAgICAgICAgaW5zdGFuY2UsXG4gICAgICAgIHBhcnRzOiBpbnN0YW5jZS5fcGFydHMsXG4gICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgZnJhZ21lbnQsXG4gICAgICAgIHZhbHVlcyxcbiAgICAgIH0pO1xuICAgICAgaW5zdGFuY2UuX3VwZGF0ZSh2YWx1ZXMpO1xuICAgICAgZGVidWdMb2dFdmVudD8uKHtcbiAgICAgICAga2luZDogJ3RlbXBsYXRlIGluc3RhbnRpYXRlZCBhbmQgdXBkYXRlZCcsXG4gICAgICAgIHRlbXBsYXRlLFxuICAgICAgICBpbnN0YW5jZSxcbiAgICAgICAgcGFydHM6IGluc3RhbmNlLl9wYXJ0cyxcbiAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICBmcmFnbWVudCxcbiAgICAgICAgdmFsdWVzLFxuICAgICAgfSk7XG4gICAgICB0aGlzLl9jb21taXROb2RlKGZyYWdtZW50KTtcbiAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IGluc3RhbmNlO1xuICAgIH1cbiAgfVxuXG4gIC8vIE92ZXJyaWRkZW4gdmlhIGBsaXRIdG1sUG9seWZpbGxTdXBwb3J0YCB0byBwcm92aWRlIHBsYXRmb3JtIHN1cHBvcnQuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRnZXRUZW1wbGF0ZShyZXN1bHQ6IFRlbXBsYXRlUmVzdWx0KSB7XG4gICAgbGV0IHRlbXBsYXRlID0gdGVtcGxhdGVDYWNoZS5nZXQocmVzdWx0LnN0cmluZ3MpO1xuICAgIGlmICh0ZW1wbGF0ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0ZW1wbGF0ZUNhY2hlLnNldChyZXN1bHQuc3RyaW5ncywgKHRlbXBsYXRlID0gbmV3IFRlbXBsYXRlKHJlc3VsdCkpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRlbXBsYXRlO1xuICB9XG5cbiAgcHJpdmF0ZSBfY29tbWl0SXRlcmFibGUodmFsdWU6IEl0ZXJhYmxlPHVua25vd24+KTogdm9pZCB7XG4gICAgLy8gRm9yIGFuIEl0ZXJhYmxlLCB3ZSBjcmVhdGUgYSBuZXcgSW5zdGFuY2VQYXJ0IHBlciBpdGVtLCB0aGVuIHNldCBpdHNcbiAgICAvLyB2YWx1ZSB0byB0aGUgaXRlbS4gVGhpcyBpcyBhIGxpdHRsZSBiaXQgb2Ygb3ZlcmhlYWQgZm9yIGV2ZXJ5IGl0ZW0gaW5cbiAgICAvLyBhbiBJdGVyYWJsZSwgYnV0IGl0IGxldHMgdXMgcmVjdXJzZSBlYXNpbHkgYW5kIGVmZmljaWVudGx5IHVwZGF0ZSBBcnJheXNcbiAgICAvLyBvZiBUZW1wbGF0ZVJlc3VsdHMgdGhhdCB3aWxsIGJlIGNvbW1vbmx5IHJldHVybmVkIGZyb20gZXhwcmVzc2lvbnMgbGlrZTpcbiAgICAvLyBhcnJheS5tYXAoKGkpID0+IGh0bWxgJHtpfWApLCBieSByZXVzaW5nIGV4aXN0aW5nIFRlbXBsYXRlSW5zdGFuY2VzLlxuXG4gICAgLy8gSWYgdmFsdWUgaXMgYW4gYXJyYXksIHRoZW4gdGhlIHByZXZpb3VzIHJlbmRlciB3YXMgb2YgYW5cbiAgICAvLyBpdGVyYWJsZSBhbmQgdmFsdWUgd2lsbCBjb250YWluIHRoZSBDaGlsZFBhcnRzIGZyb20gdGhlIHByZXZpb3VzXG4gICAgLy8gcmVuZGVyLiBJZiB2YWx1ZSBpcyBub3QgYW4gYXJyYXksIGNsZWFyIHRoaXMgcGFydCBhbmQgbWFrZSBhIG5ld1xuICAgIC8vIGFycmF5IGZvciBDaGlsZFBhcnRzLlxuICAgIGlmICghaXNBcnJheSh0aGlzLl8kY29tbWl0dGVkVmFsdWUpKSB7XG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSBbXTtcbiAgICAgIHRoaXMuXyRjbGVhcigpO1xuICAgIH1cblxuICAgIC8vIExldHMgdXMga2VlcCB0cmFjayBvZiBob3cgbWFueSBpdGVtcyB3ZSBzdGFtcGVkIHNvIHdlIGNhbiBjbGVhciBsZWZ0b3ZlclxuICAgIC8vIGl0ZW1zIGZyb20gYSBwcmV2aW91cyByZW5kZXJcbiAgICBjb25zdCBpdGVtUGFydHMgPSB0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgQ2hpbGRQYXJ0W107XG4gICAgbGV0IHBhcnRJbmRleCA9IDA7XG4gICAgbGV0IGl0ZW1QYXJ0OiBDaGlsZFBhcnQgfCB1bmRlZmluZWQ7XG5cbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdmFsdWUpIHtcbiAgICAgIGlmIChwYXJ0SW5kZXggPT09IGl0ZW1QYXJ0cy5sZW5ndGgpIHtcbiAgICAgICAgLy8gSWYgbm8gZXhpc3RpbmcgcGFydCwgY3JlYXRlIGEgbmV3IG9uZVxuICAgICAgICAvLyBUT0RPIChqdXN0aW5mYWduYW5pKTogdGVzdCBwZXJmIGltcGFjdCBvZiBhbHdheXMgY3JlYXRpbmcgdHdvIHBhcnRzXG4gICAgICAgIC8vIGluc3RlYWQgb2Ygc2hhcmluZyBwYXJ0cyBiZXR3ZWVuIG5vZGVzXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9saXQvbGl0L2lzc3Vlcy8xMjY2XG4gICAgICAgIGl0ZW1QYXJ0cy5wdXNoKFxuICAgICAgICAgIChpdGVtUGFydCA9IG5ldyBDaGlsZFBhcnQoXG4gICAgICAgICAgICB0aGlzLl9pbnNlcnQoY3JlYXRlTWFya2VyKCkpLFxuICAgICAgICAgICAgdGhpcy5faW5zZXJ0KGNyZWF0ZU1hcmtlcigpKSxcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICB0aGlzLm9wdGlvbnNcbiAgICAgICAgICApKVxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gUmV1c2UgYW4gZXhpc3RpbmcgcGFydFxuICAgICAgICBpdGVtUGFydCA9IGl0ZW1QYXJ0c1twYXJ0SW5kZXhdO1xuICAgICAgfVxuICAgICAgaXRlbVBhcnQuXyRzZXRWYWx1ZShpdGVtKTtcbiAgICAgIHBhcnRJbmRleCsrO1xuICAgIH1cblxuICAgIGlmIChwYXJ0SW5kZXggPCBpdGVtUGFydHMubGVuZ3RoKSB7XG4gICAgICAvLyBpdGVtUGFydHMgYWx3YXlzIGhhdmUgZW5kIG5vZGVzXG4gICAgICB0aGlzLl8kY2xlYXIoXG4gICAgICAgIGl0ZW1QYXJ0ICYmIHdyYXAoaXRlbVBhcnQuXyRlbmROb2RlISkubmV4dFNpYmxpbmcsXG4gICAgICAgIHBhcnRJbmRleFxuICAgICAgKTtcbiAgICAgIC8vIFRydW5jYXRlIHRoZSBwYXJ0cyBhcnJheSBzbyBfdmFsdWUgcmVmbGVjdHMgdGhlIGN1cnJlbnQgc3RhdGVcbiAgICAgIGl0ZW1QYXJ0cy5sZW5ndGggPSBwYXJ0SW5kZXg7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgdGhlIG5vZGVzIGNvbnRhaW5lZCB3aXRoaW4gdGhpcyBQYXJ0IGZyb20gdGhlIERPTS5cbiAgICpcbiAgICogQHBhcmFtIHN0YXJ0IFN0YXJ0IG5vZGUgdG8gY2xlYXIgZnJvbSwgZm9yIGNsZWFyaW5nIGEgc3Vic2V0IG9mIHRoZSBwYXJ0J3NcbiAgICogICAgIERPTSAodXNlZCB3aGVuIHRydW5jYXRpbmcgaXRlcmFibGVzKVxuICAgKiBAcGFyYW0gZnJvbSAgV2hlbiBgc3RhcnRgIGlzIHNwZWNpZmllZCwgdGhlIGluZGV4IHdpdGhpbiB0aGUgaXRlcmFibGUgZnJvbVxuICAgKiAgICAgd2hpY2ggQ2hpbGRQYXJ0cyBhcmUgYmVpbmcgcmVtb3ZlZCwgdXNlZCBmb3IgZGlzY29ubmVjdGluZyBkaXJlY3RpdmVzIGluXG4gICAqICAgICB0aG9zZSBQYXJ0cy5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuICBfJGNsZWFyKFxuICAgIHN0YXJ0OiBDaGlsZE5vZGUgfCBudWxsID0gd3JhcCh0aGlzLl8kc3RhcnROb2RlKS5uZXh0U2libGluZyxcbiAgICBmcm9tPzogbnVtYmVyXG4gICkge1xuICAgIHRoaXMuXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZD8uKGZhbHNlLCB0cnVlLCBmcm9tKTtcbiAgICB3aGlsZSAoc3RhcnQgJiYgc3RhcnQgIT09IHRoaXMuXyRlbmROb2RlKSB7XG4gICAgICBjb25zdCBuID0gd3JhcChzdGFydCEpLm5leHRTaWJsaW5nO1xuICAgICAgKHdyYXAoc3RhcnQhKSBhcyBFbGVtZW50KS5yZW1vdmUoKTtcbiAgICAgIHN0YXJ0ID0gbjtcbiAgICB9XG4gIH1cbiAgLyoqXG4gICAqIEltcGxlbWVudGF0aW9uIG9mIFJvb3RQYXJ0J3MgYGlzQ29ubmVjdGVkYC4gTm90ZSB0aGF0IHRoaXMgbWV0b2RcbiAgICogc2hvdWxkIG9ubHkgYmUgY2FsbGVkIG9uIGBSb290UGFydGBzICh0aGUgYENoaWxkUGFydGAgcmV0dXJuZWQgZnJvbSBhXG4gICAqIHRvcC1sZXZlbCBgcmVuZGVyKClgIGNhbGwpLiBJdCBoYXMgbm8gZWZmZWN0IG9uIG5vbi1yb290IENoaWxkUGFydHMuXG4gICAqIEBwYXJhbSBpc0Nvbm5lY3RlZCBXaGV0aGVyIHRvIHNldFxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHNldENvbm5lY3RlZChpc0Nvbm5lY3RlZDogYm9vbGVhbikge1xuICAgIGlmICh0aGlzLl8kcGFyZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX19pc0Nvbm5lY3RlZCA9IGlzQ29ubmVjdGVkO1xuICAgICAgdGhpcy5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkPy4oaXNDb25uZWN0ZWQpO1xuICAgIH0gZWxzZSBpZiAoREVWX01PREUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ3BhcnQuc2V0Q29ubmVjdGVkKCkgbWF5IG9ubHkgYmUgY2FsbGVkIG9uIGEgJyArXG4gICAgICAgICAgJ1Jvb3RQYXJ0IHJldHVybmVkIGZyb20gcmVuZGVyKCkuJ1xuICAgICAgKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBIHRvcC1sZXZlbCBgQ2hpbGRQYXJ0YCByZXR1cm5lZCBmcm9tIGByZW5kZXJgIHRoYXQgbWFuYWdlcyB0aGUgY29ubmVjdGVkXG4gKiBzdGF0ZSBvZiBgQXN5bmNEaXJlY3RpdmVgcyBjcmVhdGVkIHRocm91Z2hvdXQgdGhlIHRyZWUgYmVsb3cgaXQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUm9vdFBhcnQgZXh0ZW5kcyBDaGlsZFBhcnQge1xuICAvKipcbiAgICogU2V0cyB0aGUgY29ubmVjdGlvbiBzdGF0ZSBmb3IgYEFzeW5jRGlyZWN0aXZlYHMgY29udGFpbmVkIHdpdGhpbiB0aGlzIHJvb3RcbiAgICogQ2hpbGRQYXJ0LlxuICAgKlxuICAgKiBsaXQtaHRtbCBkb2VzIG5vdCBhdXRvbWF0aWNhbGx5IG1vbml0b3IgdGhlIGNvbm5lY3RlZG5lc3Mgb2YgRE9NIHJlbmRlcmVkO1xuICAgKiBhcyBzdWNoLCBpdCBpcyB0aGUgcmVzcG9uc2liaWxpdHkgb2YgdGhlIGNhbGxlciB0byBgcmVuZGVyYCB0byBlbnN1cmUgdGhhdFxuICAgKiBgcGFydC5zZXRDb25uZWN0ZWQoZmFsc2UpYCBpcyBjYWxsZWQgYmVmb3JlIHRoZSBwYXJ0IG9iamVjdCBpcyBwb3RlbnRpYWxseVxuICAgKiBkaXNjYXJkZWQsIHRvIGVuc3VyZSB0aGF0IGBBc3luY0RpcmVjdGl2ZWBzIGhhdmUgYSBjaGFuY2UgdG8gZGlzcG9zZSBvZlxuICAgKiBhbnkgcmVzb3VyY2VzIGJlaW5nIGhlbGQuIElmIGEgYFJvb3RQYXJ0YCB0aGF0IHdhcyBwcmV2b3VzbHlcbiAgICogZGlzY29ubmVjdGVkIGlzIHN1YnNlcXVlbnRseSByZS1jb25uZWN0ZWQgKGFuZCBpdHMgYEFzeW5jRGlyZWN0aXZlYHMgc2hvdWxkXG4gICAqIHJlLWNvbm5lY3QpLCBgc2V0Q29ubmVjdGVkKHRydWUpYCBzaG91bGQgYmUgY2FsbGVkLlxuICAgKlxuICAgKiBAcGFyYW0gaXNDb25uZWN0ZWQgV2hldGhlciBkaXJlY3RpdmVzIHdpdGhpbiB0aGlzIHRyZWUgc2hvdWxkIGJlIGNvbm5lY3RlZFxuICAgKiBvciBub3RcbiAgICovXG4gIHNldENvbm5lY3RlZChpc0Nvbm5lY3RlZDogYm9vbGVhbik6IHZvaWQ7XG59XG5cbmV4cG9ydCB0eXBlIHtBdHRyaWJ1dGVQYXJ0fTtcbmNsYXNzIEF0dHJpYnV0ZVBhcnQgaW1wbGVtZW50cyBEaXNjb25uZWN0YWJsZSB7XG4gIHJlYWRvbmx5IHR5cGUgPSBBVFRSSUJVVEVfUEFSVCBhc1xuICAgIHwgdHlwZW9mIEFUVFJJQlVURV9QQVJUXG4gICAgfCB0eXBlb2YgUFJPUEVSVFlfUEFSVFxuICAgIHwgdHlwZW9mIEJPT0xFQU5fQVRUUklCVVRFX1BBUlRcbiAgICB8IHR5cGVvZiBFVkVOVF9QQVJUO1xuICByZWFkb25seSBlbGVtZW50OiBIVE1MRWxlbWVudDtcbiAgcmVhZG9ubHkgbmFtZTogc3RyaW5nO1xuICByZWFkb25seSBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBJZiB0aGlzIGF0dHJpYnV0ZSBwYXJ0IHJlcHJlc2VudHMgYW4gaW50ZXJwb2xhdGlvbiwgdGhpcyBjb250YWlucyB0aGVcbiAgICogc3RhdGljIHN0cmluZ3Mgb2YgdGhlIGludGVycG9sYXRpb24uIEZvciBzaW5nbGUtdmFsdWUsIGNvbXBsZXRlIGJpbmRpbmdzLFxuICAgKiB0aGlzIGlzIHVuZGVmaW5lZC5cbiAgICovXG4gIHJlYWRvbmx5IHN0cmluZ3M/OiBSZWFkb25seUFycmF5PHN0cmluZz47XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRjb21taXR0ZWRWYWx1ZTogdW5rbm93biB8IEFycmF5PHVua25vd24+ID0gbm90aGluZztcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfX2RpcmVjdGl2ZXM/OiBBcnJheTxEaXJlY3RpdmUgfCB1bmRlZmluZWQ+O1xuICAvKiogQGludGVybmFsICovXG4gIF8kcGFyZW50OiBEaXNjb25uZWN0YWJsZTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4/OiBTZXQ8RGlzY29ubmVjdGFibGU+ID0gdW5kZWZpbmVkO1xuXG4gIHByb3RlY3RlZCBfc2FuaXRpemVyOiBWYWx1ZVNhbml0aXplciB8IHVuZGVmaW5lZDtcblxuICBnZXQgdGFnTmFtZSgpIHtcbiAgICByZXR1cm4gdGhpcy5lbGVtZW50LnRhZ05hbWU7XG4gIH1cblxuICAvLyBTZWUgY29tbWVudCBpbiBEaXNjb25uZWN0YWJsZSBpbnRlcmZhY2UgZm9yIHdoeSB0aGlzIGlzIGEgZ2V0dGVyXG4gIGdldCBfJGlzQ29ubmVjdGVkKCkge1xuICAgIHJldHVybiB0aGlzLl8kcGFyZW50Ll8kaXNDb25uZWN0ZWQ7XG4gIH1cblxuICBjb25zdHJ1Y3RvcihcbiAgICBlbGVtZW50OiBIVE1MRWxlbWVudCxcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgc3RyaW5nczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LFxuICAgIHBhcmVudDogRGlzY29ubmVjdGFibGUsXG4gICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZFxuICApIHtcbiAgICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5fJHBhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIGlmIChzdHJpbmdzLmxlbmd0aCA+IDIgfHwgc3RyaW5nc1swXSAhPT0gJycgfHwgc3RyaW5nc1sxXSAhPT0gJycpIHtcbiAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IG5ldyBBcnJheShzdHJpbmdzLmxlbmd0aCAtIDEpLmZpbGwobmV3IFN0cmluZygpKTtcbiAgICAgIHRoaXMuc3RyaW5ncyA9IHN0cmluZ3M7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IG5vdGhpbmc7XG4gICAgfVxuICAgIGlmIChFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MpIHtcbiAgICAgIHRoaXMuX3Nhbml0aXplciA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgdmFsdWUgb2YgdGhpcyBwYXJ0IGJ5IHJlc29sdmluZyB0aGUgdmFsdWUgZnJvbSBwb3NzaWJseSBtdWx0aXBsZVxuICAgKiB2YWx1ZXMgYW5kIHN0YXRpYyBzdHJpbmdzIGFuZCBjb21taXR0aW5nIGl0IHRvIHRoZSBET00uXG4gICAqIElmIHRoaXMgcGFydCBpcyBzaW5nbGUtdmFsdWVkLCBgdGhpcy5fc3RyaW5nc2Agd2lsbCBiZSB1bmRlZmluZWQsIGFuZCB0aGVcbiAgICogbWV0aG9kIHdpbGwgYmUgY2FsbGVkIHdpdGggYSBzaW5nbGUgdmFsdWUgYXJndW1lbnQuIElmIHRoaXMgcGFydCBpc1xuICAgKiBtdWx0aS12YWx1ZSwgYHRoaXMuX3N0cmluZ3NgIHdpbGwgYmUgZGVmaW5lZCwgYW5kIHRoZSBtZXRob2QgaXMgY2FsbGVkXG4gICAqIHdpdGggdGhlIHZhbHVlIGFycmF5IG9mIHRoZSBwYXJ0J3Mgb3duaW5nIFRlbXBsYXRlSW5zdGFuY2UsIGFuZCBhbiBvZmZzZXRcbiAgICogaW50byB0aGUgdmFsdWUgYXJyYXkgZnJvbSB3aGljaCB0aGUgdmFsdWVzIHNob3VsZCBiZSByZWFkLlxuICAgKiBUaGlzIG1ldGhvZCBpcyBvdmVybG9hZGVkIHRoaXMgd2F5IHRvIGVsaW1pbmF0ZSBzaG9ydC1saXZlZCBhcnJheSBzbGljZXNcbiAgICogb2YgdGhlIHRlbXBsYXRlIGluc3RhbmNlIHZhbHVlcywgYW5kIGFsbG93IGEgZmFzdC1wYXRoIGZvciBzaW5nbGUtdmFsdWVkXG4gICAqIHBhcnRzLlxuICAgKlxuICAgKiBAcGFyYW0gdmFsdWUgVGhlIHBhcnQgdmFsdWUsIG9yIGFuIGFycmF5IG9mIHZhbHVlcyBmb3IgbXVsdGktdmFsdWVkIHBhcnRzXG4gICAqIEBwYXJhbSB2YWx1ZUluZGV4IHRoZSBpbmRleCB0byBzdGFydCByZWFkaW5nIHZhbHVlcyBmcm9tLiBgdW5kZWZpbmVkYCBmb3JcbiAgICogICBzaW5nbGUtdmFsdWVkIHBhcnRzXG4gICAqIEBwYXJhbSBub0NvbW1pdCBjYXVzZXMgdGhlIHBhcnQgdG8gbm90IGNvbW1pdCBpdHMgdmFsdWUgdG8gdGhlIERPTS4gVXNlZFxuICAgKiAgIGluIGh5ZHJhdGlvbiB0byBwcmltZSBhdHRyaWJ1dGUgcGFydHMgd2l0aCB0aGVpciBmaXJzdC1yZW5kZXJlZCB2YWx1ZSxcbiAgICogICBidXQgbm90IHNldCB0aGUgYXR0cmlidXRlLCBhbmQgaW4gU1NSIHRvIG5vLW9wIHRoZSBET00gb3BlcmF0aW9uIGFuZFxuICAgKiAgIGNhcHR1cmUgdGhlIHZhbHVlIGZvciBzZXJpYWxpemF0aW9uLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIF8kc2V0VmFsdWUoXG4gICAgdmFsdWU6IHVua25vd24gfCBBcnJheTx1bmtub3duPixcbiAgICBkaXJlY3RpdmVQYXJlbnQ6IERpcmVjdGl2ZVBhcmVudCA9IHRoaXMsXG4gICAgdmFsdWVJbmRleD86IG51bWJlcixcbiAgICBub0NvbW1pdD86IGJvb2xlYW5cbiAgKSB7XG4gICAgY29uc3Qgc3RyaW5ncyA9IHRoaXMuc3RyaW5ncztcblxuICAgIC8vIFdoZXRoZXIgYW55IG9mIHRoZSB2YWx1ZXMgaGFzIGNoYW5nZWQsIGZvciBkaXJ0eS1jaGVja2luZ1xuICAgIGxldCBjaGFuZ2UgPSBmYWxzZTtcblxuICAgIGlmIChzdHJpbmdzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIFNpbmdsZS12YWx1ZSBiaW5kaW5nIGNhc2VcbiAgICAgIHZhbHVlID0gcmVzb2x2ZURpcmVjdGl2ZSh0aGlzLCB2YWx1ZSwgZGlyZWN0aXZlUGFyZW50LCAwKTtcbiAgICAgIGNoYW5nZSA9XG4gICAgICAgICFpc1ByaW1pdGl2ZSh2YWx1ZSkgfHxcbiAgICAgICAgKHZhbHVlICE9PSB0aGlzLl8kY29tbWl0dGVkVmFsdWUgJiYgdmFsdWUgIT09IG5vQ2hhbmdlKTtcbiAgICAgIGlmIChjaGFuZ2UpIHtcbiAgICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gdmFsdWU7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEludGVycG9sYXRpb24gY2FzZVxuICAgICAgY29uc3QgdmFsdWVzID0gdmFsdWUgYXMgQXJyYXk8dW5rbm93bj47XG4gICAgICB2YWx1ZSA9IHN0cmluZ3NbMF07XG5cbiAgICAgIGxldCBpLCB2O1xuICAgICAgZm9yIChpID0gMDsgaSA8IHN0cmluZ3MubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgIHYgPSByZXNvbHZlRGlyZWN0aXZlKHRoaXMsIHZhbHVlc1t2YWx1ZUluZGV4ISArIGldLCBkaXJlY3RpdmVQYXJlbnQsIGkpO1xuXG4gICAgICAgIGlmICh2ID09PSBub0NoYW5nZSkge1xuICAgICAgICAgIC8vIElmIHRoZSB1c2VyLXByb3ZpZGVkIHZhbHVlIGlzIGBub0NoYW5nZWAsIHVzZSB0aGUgcHJldmlvdXMgdmFsdWVcbiAgICAgICAgICB2ID0gKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBBcnJheTx1bmtub3duPilbaV07XG4gICAgICAgIH1cbiAgICAgICAgY2hhbmdlIHx8PVxuICAgICAgICAgICFpc1ByaW1pdGl2ZSh2KSB8fCB2ICE9PSAodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIEFycmF5PHVua25vd24+KVtpXTtcbiAgICAgICAgaWYgKHYgPT09IG5vdGhpbmcpIHtcbiAgICAgICAgICB2YWx1ZSA9IG5vdGhpbmc7XG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWUgIT09IG5vdGhpbmcpIHtcbiAgICAgICAgICB2YWx1ZSArPSAodiA/PyAnJykgKyBzdHJpbmdzW2kgKyAxXTtcbiAgICAgICAgfVxuICAgICAgICAvLyBXZSBhbHdheXMgcmVjb3JkIGVhY2ggdmFsdWUsIGV2ZW4gaWYgb25lIGlzIGBub3RoaW5nYCwgZm9yIGZ1dHVyZVxuICAgICAgICAvLyBjaGFuZ2UgZGV0ZWN0aW9uLlxuICAgICAgICAodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIEFycmF5PHVua25vd24+KVtpXSA9IHY7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChjaGFuZ2UgJiYgIW5vQ29tbWl0KSB7XG4gICAgICB0aGlzLl9jb21taXRWYWx1ZSh2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfY29tbWl0VmFsdWUodmFsdWU6IHVua25vd24pIHtcbiAgICBpZiAodmFsdWUgPT09IG5vdGhpbmcpIHtcbiAgICAgICh3cmFwKHRoaXMuZWxlbWVudCkgYXMgRWxlbWVudCkucmVtb3ZlQXR0cmlidXRlKHRoaXMubmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MpIHtcbiAgICAgICAgaWYgKHRoaXMuX3Nhbml0aXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhpcy5fc2FuaXRpemVyID0gc2FuaXRpemVyRmFjdG9yeUludGVybmFsKFxuICAgICAgICAgICAgdGhpcy5lbGVtZW50LFxuICAgICAgICAgICAgdGhpcy5uYW1lLFxuICAgICAgICAgICAgJ2F0dHJpYnV0ZSdcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlID0gdGhpcy5fc2FuaXRpemVyKHZhbHVlID8/ICcnKTtcbiAgICAgIH1cbiAgICAgIGRlYnVnTG9nRXZlbnQ/Lih7XG4gICAgICAgIGtpbmQ6ICdjb21taXQgYXR0cmlidXRlJyxcbiAgICAgICAgZWxlbWVudDogdGhpcy5lbGVtZW50LFxuICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgIHZhbHVlLFxuICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICB9KTtcbiAgICAgICh3cmFwKHRoaXMuZWxlbWVudCkgYXMgRWxlbWVudCkuc2V0QXR0cmlidXRlKFxuICAgICAgICB0aGlzLm5hbWUsXG4gICAgICAgICh2YWx1ZSA/PyAnJykgYXMgc3RyaW5nXG4gICAgICApO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgdHlwZSB7UHJvcGVydHlQYXJ0fTtcbmNsYXNzIFByb3BlcnR5UGFydCBleHRlbmRzIEF0dHJpYnV0ZVBhcnQge1xuICBvdmVycmlkZSByZWFkb25seSB0eXBlID0gUFJPUEVSVFlfUEFSVDtcblxuICAvKiogQGludGVybmFsICovXG4gIG92ZXJyaWRlIF9jb21taXRWYWx1ZSh2YWx1ZTogdW5rbm93bikge1xuICAgIGlmIChFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MpIHtcbiAgICAgIGlmICh0aGlzLl9zYW5pdGl6ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9zYW5pdGl6ZXIgPSBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwoXG4gICAgICAgICAgdGhpcy5lbGVtZW50LFxuICAgICAgICAgIHRoaXMubmFtZSxcbiAgICAgICAgICAncHJvcGVydHknXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICB2YWx1ZSA9IHRoaXMuX3Nhbml0aXplcih2YWx1ZSk7XG4gICAgfVxuICAgIGRlYnVnTG9nRXZlbnQ/Lih7XG4gICAgICBraW5kOiAnY29tbWl0IHByb3BlcnR5JyxcbiAgICAgIGVsZW1lbnQ6IHRoaXMuZWxlbWVudCxcbiAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgIHZhbHVlLFxuICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgIH0pO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgKHRoaXMuZWxlbWVudCBhcyBhbnkpW3RoaXMubmFtZV0gPSB2YWx1ZSA9PT0gbm90aGluZyA/IHVuZGVmaW5lZCA6IHZhbHVlO1xuICB9XG59XG5cbi8vIFRlbXBvcmFyeSB3b3JrYXJvdW5kIGZvciBodHRwczovL2NyYnVnLmNvbS85OTMyNjhcbi8vIEN1cnJlbnRseSwgYW55IGF0dHJpYnV0ZSBzdGFydGluZyB3aXRoIFwib25cIiBpcyBjb25zaWRlcmVkIHRvIGJlIGFcbi8vIFRydXN0ZWRTY3JpcHQgc291cmNlLiBTdWNoIGJvb2xlYW4gYXR0cmlidXRlcyBtdXN0IGJlIHNldCB0byB0aGUgZXF1aXZhbGVudFxuLy8gdHJ1c3RlZCBlbXB0eVNjcmlwdCB2YWx1ZS5cbmNvbnN0IGVtcHR5U3RyaW5nRm9yQm9vbGVhbkF0dHJpYnV0ZSA9IHRydXN0ZWRUeXBlc1xuICA/ICh0cnVzdGVkVHlwZXMuZW1wdHlTY3JpcHQgYXMgdW5rbm93biBhcyAnJylcbiAgOiAnJztcblxuZXhwb3J0IHR5cGUge0Jvb2xlYW5BdHRyaWJ1dGVQYXJ0fTtcbmNsYXNzIEJvb2xlYW5BdHRyaWJ1dGVQYXJ0IGV4dGVuZHMgQXR0cmlidXRlUGFydCB7XG4gIG92ZXJyaWRlIHJlYWRvbmx5IHR5cGUgPSBCT09MRUFOX0FUVFJJQlVURV9QQVJUO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgb3ZlcnJpZGUgX2NvbW1pdFZhbHVlKHZhbHVlOiB1bmtub3duKSB7XG4gICAgZGVidWdMb2dFdmVudD8uKHtcbiAgICAgIGtpbmQ6ICdjb21taXQgYm9vbGVhbiBhdHRyaWJ1dGUnLFxuICAgICAgZWxlbWVudDogdGhpcy5lbGVtZW50LFxuICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgdmFsdWU6ICEhKHZhbHVlICYmIHZhbHVlICE9PSBub3RoaW5nKSxcbiAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICB9KTtcbiAgICBpZiAodmFsdWUgJiYgdmFsdWUgIT09IG5vdGhpbmcpIHtcbiAgICAgICh3cmFwKHRoaXMuZWxlbWVudCkgYXMgRWxlbWVudCkuc2V0QXR0cmlidXRlKFxuICAgICAgICB0aGlzLm5hbWUsXG4gICAgICAgIGVtcHR5U3RyaW5nRm9yQm9vbGVhbkF0dHJpYnV0ZVxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgKHdyYXAodGhpcy5lbGVtZW50KSBhcyBFbGVtZW50KS5yZW1vdmVBdHRyaWJ1dGUodGhpcy5uYW1lKTtcbiAgICB9XG4gIH1cbn1cblxudHlwZSBFdmVudExpc3RlbmVyV2l0aE9wdGlvbnMgPSBFdmVudExpc3RlbmVyT3JFdmVudExpc3RlbmVyT2JqZWN0ICZcbiAgUGFydGlhbDxBZGRFdmVudExpc3RlbmVyT3B0aW9ucz47XG5cbi8qKlxuICogQW4gQXR0cmlidXRlUGFydCB0aGF0IG1hbmFnZXMgYW4gZXZlbnQgbGlzdGVuZXIgdmlhIGFkZC9yZW1vdmVFdmVudExpc3RlbmVyLlxuICpcbiAqIFRoaXMgcGFydCB3b3JrcyBieSBhZGRpbmcgaXRzZWxmIGFzIHRoZSBldmVudCBsaXN0ZW5lciBvbiBhbiBlbGVtZW50LCB0aGVuXG4gKiBkZWxlZ2F0aW5nIHRvIHRoZSB2YWx1ZSBwYXNzZWQgdG8gaXQuIFRoaXMgcmVkdWNlcyB0aGUgbnVtYmVyIG9mIGNhbGxzIHRvXG4gKiBhZGQvcmVtb3ZlRXZlbnRMaXN0ZW5lciBpZiB0aGUgbGlzdGVuZXIgY2hhbmdlcyBmcmVxdWVudGx5LCBzdWNoIGFzIHdoZW4gYW5cbiAqIGlubGluZSBmdW5jdGlvbiBpcyB1c2VkIGFzIGEgbGlzdGVuZXIuXG4gKlxuICogQmVjYXVzZSBldmVudCBvcHRpb25zIGFyZSBwYXNzZWQgd2hlbiBhZGRpbmcgbGlzdGVuZXJzLCB3ZSBtdXN0IHRha2UgY2FzZVxuICogdG8gYWRkIGFuZCByZW1vdmUgdGhlIHBhcnQgYXMgYSBsaXN0ZW5lciB3aGVuIHRoZSBldmVudCBvcHRpb25zIGNoYW5nZS5cbiAqL1xuZXhwb3J0IHR5cGUge0V2ZW50UGFydH07XG5jbGFzcyBFdmVudFBhcnQgZXh0ZW5kcyBBdHRyaWJ1dGVQYXJ0IHtcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgdHlwZSA9IEVWRU5UX1BBUlQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgZWxlbWVudDogSFRNTEVsZW1lbnQsXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIHN0cmluZ3M6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPixcbiAgICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgc3VwZXIoZWxlbWVudCwgbmFtZSwgc3RyaW5ncywgcGFyZW50LCBvcHRpb25zKTtcblxuICAgIGlmIChERVZfTU9ERSAmJiB0aGlzLnN0cmluZ3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgQSBcXGA8JHtlbGVtZW50LmxvY2FsTmFtZX0+XFxgIGhhcyBhIFxcYEAke25hbWV9PS4uLlxcYCBsaXN0ZW5lciB3aXRoIGAgK1xuICAgICAgICAgICdpbnZhbGlkIGNvbnRlbnQuIEV2ZW50IGxpc3RlbmVycyBpbiB0ZW1wbGF0ZXMgbXVzdCBoYXZlIGV4YWN0bHkgJyArXG4gICAgICAgICAgJ29uZSBleHByZXNzaW9uIGFuZCBubyBzdXJyb3VuZGluZyB0ZXh0LidcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgLy8gRXZlbnRQYXJ0IGRvZXMgbm90IHVzZSB0aGUgYmFzZSBfJHNldFZhbHVlL19yZXNvbHZlVmFsdWUgaW1wbGVtZW50YXRpb25cbiAgLy8gc2luY2UgdGhlIGRpcnR5IGNoZWNraW5nIGlzIG1vcmUgY29tcGxleFxuICAvKiogQGludGVybmFsICovXG4gIG92ZXJyaWRlIF8kc2V0VmFsdWUoXG4gICAgbmV3TGlzdGVuZXI6IHVua25vd24sXG4gICAgZGlyZWN0aXZlUGFyZW50OiBEaXJlY3RpdmVQYXJlbnQgPSB0aGlzXG4gICkge1xuICAgIG5ld0xpc3RlbmVyID1cbiAgICAgIHJlc29sdmVEaXJlY3RpdmUodGhpcywgbmV3TGlzdGVuZXIsIGRpcmVjdGl2ZVBhcmVudCwgMCkgPz8gbm90aGluZztcbiAgICBpZiAobmV3TGlzdGVuZXIgPT09IG5vQ2hhbmdlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG9sZExpc3RlbmVyID0gdGhpcy5fJGNvbW1pdHRlZFZhbHVlO1xuXG4gICAgLy8gSWYgdGhlIG5ldyB2YWx1ZSBpcyBub3RoaW5nIG9yIGFueSBvcHRpb25zIGNoYW5nZSB3ZSBoYXZlIHRvIHJlbW92ZSB0aGVcbiAgICAvLyBwYXJ0IGFzIGEgbGlzdGVuZXIuXG4gICAgY29uc3Qgc2hvdWxkUmVtb3ZlTGlzdGVuZXIgPVxuICAgICAgKG5ld0xpc3RlbmVyID09PSBub3RoaW5nICYmIG9sZExpc3RlbmVyICE9PSBub3RoaW5nKSB8fFxuICAgICAgKG5ld0xpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykuY2FwdHVyZSAhPT1cbiAgICAgICAgKG9sZExpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykuY2FwdHVyZSB8fFxuICAgICAgKG5ld0xpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykub25jZSAhPT1cbiAgICAgICAgKG9sZExpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykub25jZSB8fFxuICAgICAgKG5ld0xpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykucGFzc2l2ZSAhPT1cbiAgICAgICAgKG9sZExpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucykucGFzc2l2ZTtcblxuICAgIC8vIElmIHRoZSBuZXcgdmFsdWUgaXMgbm90IG5vdGhpbmcgYW5kIHdlIHJlbW92ZWQgdGhlIGxpc3RlbmVyLCB3ZSBoYXZlXG4gICAgLy8gdG8gYWRkIHRoZSBwYXJ0IGFzIGEgbGlzdGVuZXIuXG4gICAgY29uc3Qgc2hvdWxkQWRkTGlzdGVuZXIgPVxuICAgICAgbmV3TGlzdGVuZXIgIT09IG5vdGhpbmcgJiZcbiAgICAgIChvbGRMaXN0ZW5lciA9PT0gbm90aGluZyB8fCBzaG91bGRSZW1vdmVMaXN0ZW5lcik7XG5cbiAgICBkZWJ1Z0xvZ0V2ZW50Py4oe1xuICAgICAga2luZDogJ2NvbW1pdCBldmVudCBsaXN0ZW5lcicsXG4gICAgICBlbGVtZW50OiB0aGlzLmVsZW1lbnQsXG4gICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICB2YWx1ZTogbmV3TGlzdGVuZXIsXG4gICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICByZW1vdmVMaXN0ZW5lcjogc2hvdWxkUmVtb3ZlTGlzdGVuZXIsXG4gICAgICBhZGRMaXN0ZW5lcjogc2hvdWxkQWRkTGlzdGVuZXIsXG4gICAgICBvbGRMaXN0ZW5lcixcbiAgICB9KTtcbiAgICBpZiAoc2hvdWxkUmVtb3ZlTGlzdGVuZXIpIHtcbiAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFxuICAgICAgICB0aGlzLm5hbWUsXG4gICAgICAgIHRoaXMsXG4gICAgICAgIG9sZExpc3RlbmVyIGFzIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9uc1xuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKHNob3VsZEFkZExpc3RlbmVyKSB7XG4gICAgICAvLyBCZXdhcmU6IElFMTEgYW5kIENocm9tZSA0MSBkb24ndCBsaWtlIHVzaW5nIHRoZSBsaXN0ZW5lciBhcyB0aGVcbiAgICAgIC8vIG9wdGlvbnMgb2JqZWN0LiBGaWd1cmUgb3V0IGhvdyB0byBkZWFsIHcvIHRoaXMgaW4gSUUxMSAtIG1heWJlXG4gICAgICAvLyBwYXRjaCBhZGRFdmVudExpc3RlbmVyP1xuICAgICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAgIHRoaXMubmFtZSxcbiAgICAgICAgdGhpcyxcbiAgICAgICAgbmV3TGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zXG4gICAgICApO1xuICAgIH1cbiAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSBuZXdMaXN0ZW5lcjtcbiAgfVxuXG4gIGhhbmRsZUV2ZW50KGV2ZW50OiBFdmVudCkge1xuICAgIGlmICh0eXBlb2YgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUuY2FsbCh0aGlzLm9wdGlvbnM/Lmhvc3QgPz8gdGhpcy5lbGVtZW50LCBldmVudCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgRXZlbnRMaXN0ZW5lck9iamVjdCkuaGFuZGxlRXZlbnQoZXZlbnQpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgdHlwZSB7RWxlbWVudFBhcnR9O1xuY2xhc3MgRWxlbWVudFBhcnQgaW1wbGVtZW50cyBEaXNjb25uZWN0YWJsZSB7XG4gIHJlYWRvbmx5IHR5cGUgPSBFTEVNRU5UX1BBUlQ7XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfX2RpcmVjdGl2ZT86IERpcmVjdGl2ZTtcblxuICAvLyBUaGlzIGlzIHRvIGVuc3VyZSB0aGF0IGV2ZXJ5IFBhcnQgaGFzIGEgXyRjb21taXR0ZWRWYWx1ZVxuICBfJGNvbW1pdHRlZFZhbHVlOiB1bmRlZmluZWQ7XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJHBhcmVudCE6IERpc2Nvbm5lY3RhYmxlO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuPzogU2V0PERpc2Nvbm5lY3RhYmxlPiA9IHVuZGVmaW5lZDtcblxuICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyBlbGVtZW50OiBFbGVtZW50LFxuICAgIHBhcmVudDogRGlzY29ubmVjdGFibGUsXG4gICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZFxuICApIHtcbiAgICB0aGlzLl8kcGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gIH1cblxuICAvLyBTZWUgY29tbWVudCBpbiBEaXNjb25uZWN0YWJsZSBpbnRlcmZhY2UgZm9yIHdoeSB0aGlzIGlzIGEgZ2V0dGVyXG4gIGdldCBfJGlzQ29ubmVjdGVkKCkge1xuICAgIHJldHVybiB0aGlzLl8kcGFyZW50Ll8kaXNDb25uZWN0ZWQ7XG4gIH1cblxuICBfJHNldFZhbHVlKHZhbHVlOiB1bmtub3duKTogdm9pZCB7XG4gICAgZGVidWdMb2dFdmVudD8uKHtcbiAgICAgIGtpbmQ6ICdjb21taXQgdG8gZWxlbWVudCBiaW5kaW5nJyxcbiAgICAgIGVsZW1lbnQ6IHRoaXMuZWxlbWVudCxcbiAgICAgIHZhbHVlLFxuICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgIH0pO1xuICAgIHJlc29sdmVEaXJlY3RpdmUodGhpcywgdmFsdWUpO1xuICB9XG59XG5cbi8qKlxuICogRU5EIFVTRVJTIFNIT1VMRCBOT1QgUkVMWSBPTiBUSElTIE9CSkVDVC5cbiAqXG4gKiBQcml2YXRlIGV4cG9ydHMgZm9yIHVzZSBieSBvdGhlciBMaXQgcGFja2FnZXMsIG5vdCBpbnRlbmRlZCBmb3IgdXNlIGJ5XG4gKiBleHRlcm5hbCB1c2Vycy5cbiAqXG4gKiBXZSBjdXJyZW50bHkgZG8gbm90IG1ha2UgYSBtYW5nbGVkIHJvbGx1cCBidWlsZCBvZiB0aGUgbGl0LXNzciBjb2RlLiBJbiBvcmRlclxuICogdG8ga2VlcCBhIG51bWJlciBvZiAob3RoZXJ3aXNlIHByaXZhdGUpIHRvcC1sZXZlbCBleHBvcnRzICBtYW5nbGVkIGluIHRoZVxuICogY2xpZW50IHNpZGUgY29kZSwgd2UgZXhwb3J0IGEgXyRMSCBvYmplY3QgY29udGFpbmluZyB0aG9zZSBtZW1iZXJzIChvclxuICogaGVscGVyIG1ldGhvZHMgZm9yIGFjY2Vzc2luZyBwcml2YXRlIGZpZWxkcyBvZiB0aG9zZSBtZW1iZXJzKSwgYW5kIHRoZW5cbiAqIHJlLWV4cG9ydCB0aGVtIGZvciB1c2UgaW4gbGl0LXNzci4gVGhpcyBrZWVwcyBsaXQtc3NyIGFnbm9zdGljIHRvIHdoZXRoZXIgdGhlXG4gKiBjbGllbnQtc2lkZSBjb2RlIGlzIGJlaW5nIHVzZWQgaW4gYGRldmAgbW9kZSBvciBgcHJvZGAgbW9kZS5cbiAqXG4gKiBUaGlzIGhhcyBhIHVuaXF1ZSBuYW1lLCB0byBkaXNhbWJpZ3VhdGUgaXQgZnJvbSBwcml2YXRlIGV4cG9ydHMgaW5cbiAqIGxpdC1lbGVtZW50LCB3aGljaCByZS1leHBvcnRzIGFsbCBvZiBsaXQtaHRtbC5cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5leHBvcnQgY29uc3QgXyRMSCA9IHtcbiAgLy8gVXNlZCBpbiBsaXQtc3NyXG4gIF9ib3VuZEF0dHJpYnV0ZVN1ZmZpeDogYm91bmRBdHRyaWJ1dGVTdWZmaXgsXG4gIF9tYXJrZXI6IG1hcmtlcixcbiAgX21hcmtlck1hdGNoOiBtYXJrZXJNYXRjaCxcbiAgX0hUTUxfUkVTVUxUOiBIVE1MX1JFU1VMVCxcbiAgX2dldFRlbXBsYXRlSHRtbDogZ2V0VGVtcGxhdGVIdG1sLFxuICAvLyBVc2VkIGluIGh5ZHJhdGVcbiAgX1RlbXBsYXRlSW5zdGFuY2U6IFRlbXBsYXRlSW5zdGFuY2UsXG4gIF9pc0l0ZXJhYmxlOiBpc0l0ZXJhYmxlLFxuICBfcmVzb2x2ZURpcmVjdGl2ZTogcmVzb2x2ZURpcmVjdGl2ZSxcbiAgLy8gVXNlZCBpbiB0ZXN0cyBhbmQgcHJpdmF0ZS1zc3Itc3VwcG9ydFxuICBfQ2hpbGRQYXJ0OiBDaGlsZFBhcnQsXG4gIF9BdHRyaWJ1dGVQYXJ0OiBBdHRyaWJ1dGVQYXJ0LFxuICBfQm9vbGVhbkF0dHJpYnV0ZVBhcnQ6IEJvb2xlYW5BdHRyaWJ1dGVQYXJ0LFxuICBfRXZlbnRQYXJ0OiBFdmVudFBhcnQsXG4gIF9Qcm9wZXJ0eVBhcnQ6IFByb3BlcnR5UGFydCxcbiAgX0VsZW1lbnRQYXJ0OiBFbGVtZW50UGFydCxcbn07XG5cbi8vIEFwcGx5IHBvbHlmaWxscyBpZiBhdmFpbGFibGVcbmNvbnN0IHBvbHlmaWxsU3VwcG9ydCA9IERFVl9NT0RFXG4gID8gd2luZG93LmxpdEh0bWxQb2x5ZmlsbFN1cHBvcnREZXZNb2RlXG4gIDogd2luZG93LmxpdEh0bWxQb2x5ZmlsbFN1cHBvcnQ7XG5wb2x5ZmlsbFN1cHBvcnQ/LihUZW1wbGF0ZSwgQ2hpbGRQYXJ0KTtcblxuLy8gSU1QT1JUQU5UOiBkbyBub3QgY2hhbmdlIHRoZSBwcm9wZXJ0eSBuYW1lIG9yIHRoZSBhc3NpZ25tZW50IGV4cHJlc3Npb24uXG4vLyBUaGlzIGxpbmUgd2lsbCBiZSB1c2VkIGluIHJlZ2V4ZXMgdG8gc2VhcmNoIGZvciBsaXQtaHRtbCB1c2FnZS5cbihnbG9iYWxUaGlzLmxpdEh0bWxWZXJzaW9ucyA/Pz0gW10pLnB1c2goJzIuMi4xJyk7XG5pZiAoREVWX01PREUgJiYgZ2xvYmFsVGhpcy5saXRIdG1sVmVyc2lvbnMubGVuZ3RoID4gMSkge1xuICBpc3N1ZVdhcm5pbmchKFxuICAgICdtdWx0aXBsZS12ZXJzaW9ucycsXG4gICAgYE11bHRpcGxlIHZlcnNpb25zIG9mIExpdCBsb2FkZWQuIGAgK1xuICAgICAgYExvYWRpbmcgbXVsdGlwbGUgdmVyc2lvbnMgaXMgbm90IHJlY29tbWVuZGVkLmBcbiAgKTtcbn1cbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0Rpc2Nvbm5lY3RhYmxlLCBQYXJ0fSBmcm9tICcuL2xpdC1odG1sJztcblxuZXhwb3J0IHtcbiAgQXR0cmlidXRlUGFydCxcbiAgQm9vbGVhbkF0dHJpYnV0ZVBhcnQsXG4gIENoaWxkUGFydCxcbiAgRWxlbWVudFBhcnQsXG4gIEV2ZW50UGFydCxcbiAgUGFydCxcbiAgUHJvcGVydHlQYXJ0LFxufSBmcm9tICcuL2xpdC1odG1sJztcblxuZXhwb3J0IGludGVyZmFjZSBEaXJlY3RpdmVDbGFzcyB7XG4gIG5ldyAocGFydDogUGFydEluZm8pOiBEaXJlY3RpdmU7XG59XG5cbi8qKlxuICogVGhpcyB1dGlsaXR5IHR5cGUgZXh0cmFjdHMgdGhlIHNpZ25hdHVyZSBvZiBhIGRpcmVjdGl2ZSBjbGFzcydzIHJlbmRlcigpXG4gKiBtZXRob2Qgc28gd2UgY2FuIHVzZSBpdCBmb3IgdGhlIHR5cGUgb2YgdGhlIGdlbmVyYXRlZCBkaXJlY3RpdmUgZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCB0eXBlIERpcmVjdGl2ZVBhcmFtZXRlcnM8QyBleHRlbmRzIERpcmVjdGl2ZT4gPSBQYXJhbWV0ZXJzPENbJ3JlbmRlciddPjtcblxuLyoqXG4gKiBBIGdlbmVyYXRlZCBkaXJlY3RpdmUgZnVuY3Rpb24gZG9lc24ndCBldmFsdWF0ZSB0aGUgZGlyZWN0aXZlLCBidXQganVzdFxuICogcmV0dXJucyBhIERpcmVjdGl2ZVJlc3VsdCBvYmplY3QgdGhhdCBjYXB0dXJlcyB0aGUgYXJndW1lbnRzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIERpcmVjdGl2ZVJlc3VsdDxDIGV4dGVuZHMgRGlyZWN0aXZlQ2xhc3MgPSBEaXJlY3RpdmVDbGFzcz4ge1xuICAvKipcbiAgICogVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICogQGludGVybmFsICovXG4gIFsnXyRsaXREaXJlY3RpdmUkJ106IEM7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgdmFsdWVzOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPEluc3RhbmNlVHlwZTxDPj47XG59XG5cbmV4cG9ydCBjb25zdCBQYXJ0VHlwZSA9IHtcbiAgQVRUUklCVVRFOiAxLFxuICBDSElMRDogMixcbiAgUFJPUEVSVFk6IDMsXG4gIEJPT0xFQU5fQVRUUklCVVRFOiA0LFxuICBFVkVOVDogNSxcbiAgRUxFTUVOVDogNixcbn0gYXMgY29uc3Q7XG5cbmV4cG9ydCB0eXBlIFBhcnRUeXBlID0gdHlwZW9mIFBhcnRUeXBlW2tleW9mIHR5cGVvZiBQYXJ0VHlwZV07XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2hpbGRQYXJ0SW5mbyB7XG4gIHJlYWRvbmx5IHR5cGU6IHR5cGVvZiBQYXJ0VHlwZS5DSElMRDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBdHRyaWJ1dGVQYXJ0SW5mbyB7XG4gIHJlYWRvbmx5IHR5cGU6XG4gICAgfCB0eXBlb2YgUGFydFR5cGUuQVRUUklCVVRFXG4gICAgfCB0eXBlb2YgUGFydFR5cGUuUFJPUEVSVFlcbiAgICB8IHR5cGVvZiBQYXJ0VHlwZS5CT09MRUFOX0FUVFJJQlVURVxuICAgIHwgdHlwZW9mIFBhcnRUeXBlLkVWRU5UO1xuICByZWFkb25seSBzdHJpbmdzPzogUmVhZG9ubHlBcnJheTxzdHJpbmc+O1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IHRhZ05hbWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFbGVtZW50UGFydEluZm8ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgUGFydFR5cGUuRUxFTUVOVDtcbn1cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgcGFydCBhIGRpcmVjdGl2ZSBpcyBib3VuZCB0by5cbiAqXG4gKiBUaGlzIGlzIHVzZWZ1bCBmb3IgY2hlY2tpbmcgdGhhdCBhIGRpcmVjdGl2ZSBpcyBhdHRhY2hlZCB0byBhIHZhbGlkIHBhcnQsXG4gKiBzdWNoIGFzIHdpdGggZGlyZWN0aXZlIHRoYXQgY2FuIG9ubHkgYmUgdXNlZCBvbiBhdHRyaWJ1dGUgYmluZGluZ3MuXG4gKi9cbmV4cG9ydCB0eXBlIFBhcnRJbmZvID0gQ2hpbGRQYXJ0SW5mbyB8IEF0dHJpYnV0ZVBhcnRJbmZvIHwgRWxlbWVudFBhcnRJbmZvO1xuXG4vKipcbiAqIENyZWF0ZXMgYSB1c2VyLWZhY2luZyBkaXJlY3RpdmUgZnVuY3Rpb24gZnJvbSBhIERpcmVjdGl2ZSBjbGFzcy4gVGhpc1xuICogZnVuY3Rpb24gaGFzIHRoZSBzYW1lIHBhcmFtZXRlcnMgYXMgdGhlIGRpcmVjdGl2ZSdzIHJlbmRlcigpIG1ldGhvZC5cbiAqL1xuZXhwb3J0IGNvbnN0IGRpcmVjdGl2ZSA9XG4gIDxDIGV4dGVuZHMgRGlyZWN0aXZlQ2xhc3M+KGM6IEMpID0+XG4gICguLi52YWx1ZXM6IERpcmVjdGl2ZVBhcmFtZXRlcnM8SW5zdGFuY2VUeXBlPEM+Pik6IERpcmVjdGl2ZVJlc3VsdDxDPiA9PiAoe1xuICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgWydfJGxpdERpcmVjdGl2ZSQnXTogYyxcbiAgICB2YWx1ZXMsXG4gIH0pO1xuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIGNyZWF0aW5nIGN1c3RvbSBkaXJlY3RpdmVzLiBVc2VycyBzaG91bGQgZXh0ZW5kIHRoaXMgY2xhc3MsXG4gKiBpbXBsZW1lbnQgYHJlbmRlcmAgYW5kL29yIGB1cGRhdGVgLCBhbmQgdGhlbiBwYXNzIHRoZWlyIHN1YmNsYXNzIHRvXG4gKiBgZGlyZWN0aXZlYC5cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIERpcmVjdGl2ZSBpbXBsZW1lbnRzIERpc2Nvbm5lY3RhYmxlIHtcbiAgLy9AaW50ZXJuYWxcbiAgX19wYXJ0ITogUGFydDtcbiAgLy9AaW50ZXJuYWxcbiAgX19hdHRyaWJ1dGVJbmRleDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICAvL0BpbnRlcm5hbFxuICBfX2RpcmVjdGl2ZT86IERpcmVjdGl2ZTtcblxuICAvL0BpbnRlcm5hbFxuICBfJHBhcmVudCE6IERpc2Nvbm5lY3RhYmxlO1xuXG4gIC8vIFRoZXNlIHdpbGwgb25seSBleGlzdCBvbiB0aGUgQXN5bmNEaXJlY3RpdmUgc3ViY2xhc3NcbiAgLy9AaW50ZXJuYWxcbiAgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuPzogU2V0PERpc2Nvbm5lY3RhYmxlPjtcbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgLy9AaW50ZXJuYWxcbiAgWydfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkJ10/KGlzQ29ubmVjdGVkOiBib29sZWFuKTogdm9pZDtcblxuICBjb25zdHJ1Y3RvcihfcGFydEluZm86IFBhcnRJbmZvKSB7fVxuXG4gIC8vIFNlZSBjb21tZW50IGluIERpc2Nvbm5lY3RhYmxlIGludGVyZmFjZSBmb3Igd2h5IHRoaXMgaXMgYSBnZXR0ZXJcbiAgZ2V0IF8kaXNDb25uZWN0ZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuXyRwYXJlbnQuXyRpc0Nvbm5lY3RlZDtcbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRpbml0aWFsaXplKFxuICAgIHBhcnQ6IFBhcnQsXG4gICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSxcbiAgICBhdHRyaWJ1dGVJbmRleDogbnVtYmVyIHwgdW5kZWZpbmVkXG4gICkge1xuICAgIHRoaXMuX19wYXJ0ID0gcGFydDtcbiAgICB0aGlzLl8kcGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMuX19hdHRyaWJ1dGVJbmRleCA9IGF0dHJpYnV0ZUluZGV4O1xuICB9XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRyZXNvbHZlKHBhcnQ6IFBhcnQsIHByb3BzOiBBcnJheTx1bmtub3duPik6IHVua25vd24ge1xuICAgIHJldHVybiB0aGlzLnVwZGF0ZShwYXJ0LCBwcm9wcyk7XG4gIH1cblxuICBhYnN0cmFjdCByZW5kZXIoLi4ucHJvcHM6IEFycmF5PHVua25vd24+KTogdW5rbm93bjtcblxuICB1cGRhdGUoX3BhcnQ6IFBhcnQsIHByb3BzOiBBcnJheTx1bmtub3duPik6IHVua25vd24ge1xuICAgIHJldHVybiB0aGlzLnJlbmRlciguLi5wcm9wcyk7XG4gIH1cbn1cbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge18kTEgsIFBhcnQsIERpcmVjdGl2ZVBhcmVudCwgVGVtcGxhdGVSZXN1bHR9IGZyb20gJy4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgRGlyZWN0aXZlUmVzdWx0LFxuICBEaXJlY3RpdmVDbGFzcyxcbiAgUGFydEluZm8sXG4gIEF0dHJpYnV0ZVBhcnRJbmZvLFxufSBmcm9tICcuL2RpcmVjdGl2ZS5qcyc7XG50eXBlIFByaW1pdGl2ZSA9IG51bGwgfCB1bmRlZmluZWQgfCBib29sZWFuIHwgbnVtYmVyIHwgc3RyaW5nIHwgc3ltYm9sIHwgYmlnaW50O1xuXG5jb25zdCB7X0NoaWxkUGFydDogQ2hpbGRQYXJ0fSA9IF8kTEg7XG5cbnR5cGUgQ2hpbGRQYXJ0ID0gSW5zdGFuY2VUeXBlPHR5cGVvZiBDaGlsZFBhcnQ+O1xuXG5jb25zdCBFTkFCTEVfU0hBRFlET01fTk9QQVRDSCA9IHRydWU7XG5cbmNvbnN0IHdyYXAgPVxuICBFTkFCTEVfU0hBRFlET01fTk9QQVRDSCAmJlxuICB3aW5kb3cuU2hhZHlET00/LmluVXNlICYmXG4gIHdpbmRvdy5TaGFkeURPTT8ubm9QYXRjaCA9PT0gdHJ1ZVxuICAgID8gd2luZG93LlNoYWR5RE9NIS53cmFwXG4gICAgOiAobm9kZTogTm9kZSkgPT4gbm9kZTtcblxuLyoqXG4gKiBUZXN0cyBpZiBhIHZhbHVlIGlzIGEgcHJpbWl0aXZlIHZhbHVlLlxuICpcbiAqIFNlZSBodHRwczovL3RjMzkuZ2l0aHViLmlvL2VjbWEyNjIvI3NlYy10eXBlb2Ytb3BlcmF0b3JcbiAqL1xuZXhwb3J0IGNvbnN0IGlzUHJpbWl0aXZlID0gKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgUHJpbWl0aXZlID0+XG4gIHZhbHVlID09PSBudWxsIHx8ICh0eXBlb2YgdmFsdWUgIT0gJ29iamVjdCcgJiYgdHlwZW9mIHZhbHVlICE9ICdmdW5jdGlvbicpO1xuXG5leHBvcnQgY29uc3QgVGVtcGxhdGVSZXN1bHRUeXBlID0ge1xuICBIVE1MOiAxLFxuICBTVkc6IDIsXG59IGFzIGNvbnN0O1xuXG5leHBvcnQgdHlwZSBUZW1wbGF0ZVJlc3VsdFR5cGUgPVxuICB0eXBlb2YgVGVtcGxhdGVSZXN1bHRUeXBlW2tleW9mIHR5cGVvZiBUZW1wbGF0ZVJlc3VsdFR5cGVdO1xuXG4vKipcbiAqIFRlc3RzIGlmIGEgdmFsdWUgaXMgYSBUZW1wbGF0ZVJlc3VsdC5cbiAqL1xuZXhwb3J0IGNvbnN0IGlzVGVtcGxhdGVSZXN1bHQgPSAoXG4gIHZhbHVlOiB1bmtub3duLFxuICB0eXBlPzogVGVtcGxhdGVSZXN1bHRUeXBlXG4pOiB2YWx1ZSBpcyBUZW1wbGF0ZVJlc3VsdCA9PlxuICB0eXBlID09PSB1bmRlZmluZWRcbiAgICA/IC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgICAodmFsdWUgYXMgVGVtcGxhdGVSZXN1bHQpPy5bJ18kbGl0VHlwZSQnXSAhPT0gdW5kZWZpbmVkXG4gICAgOiAodmFsdWUgYXMgVGVtcGxhdGVSZXN1bHQpPy5bJ18kbGl0VHlwZSQnXSA9PT0gdHlwZTtcblxuLyoqXG4gKiBUZXN0cyBpZiBhIHZhbHVlIGlzIGEgRGlyZWN0aXZlUmVzdWx0LlxuICovXG5leHBvcnQgY29uc3QgaXNEaXJlY3RpdmVSZXN1bHQgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBEaXJlY3RpdmVSZXN1bHQgPT5cbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgKHZhbHVlIGFzIERpcmVjdGl2ZVJlc3VsdCk/LlsnXyRsaXREaXJlY3RpdmUkJ10gIT09IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBSZXRyaWV2ZXMgdGhlIERpcmVjdGl2ZSBjbGFzcyBmb3IgYSBEaXJlY3RpdmVSZXN1bHRcbiAqL1xuZXhwb3J0IGNvbnN0IGdldERpcmVjdGl2ZUNsYXNzID0gKHZhbHVlOiB1bmtub3duKTogRGlyZWN0aXZlQ2xhc3MgfCB1bmRlZmluZWQgPT5cbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgKHZhbHVlIGFzIERpcmVjdGl2ZVJlc3VsdCk/LlsnXyRsaXREaXJlY3RpdmUkJ107XG5cbi8qKlxuICogVGVzdHMgd2hldGhlciBhIHBhcnQgaGFzIG9ubHkgYSBzaW5nbGUtZXhwcmVzc2lvbiB3aXRoIG5vIHN0cmluZ3MgdG9cbiAqIGludGVycG9sYXRlIGJldHdlZW4uXG4gKlxuICogT25seSBBdHRyaWJ1dGVQYXJ0IGFuZCBQcm9wZXJ0eVBhcnQgY2FuIGhhdmUgbXVsdGlwbGUgZXhwcmVzc2lvbnMuXG4gKiBNdWx0aS1leHByZXNzaW9uIHBhcnRzIGhhdmUgYSBgc3RyaW5nc2AgcHJvcGVydHkgYW5kIHNpbmdsZS1leHByZXNzaW9uXG4gKiBwYXJ0cyBkbyBub3QuXG4gKi9cbmV4cG9ydCBjb25zdCBpc1NpbmdsZUV4cHJlc3Npb24gPSAocGFydDogUGFydEluZm8pID0+XG4gIChwYXJ0IGFzIEF0dHJpYnV0ZVBhcnRJbmZvKS5zdHJpbmdzID09PSB1bmRlZmluZWQ7XG5cbmNvbnN0IGNyZWF0ZU1hcmtlciA9ICgpID0+IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJycpO1xuXG4vKipcbiAqIEluc2VydHMgYSBDaGlsZFBhcnQgaW50byB0aGUgZ2l2ZW4gY29udGFpbmVyIENoaWxkUGFydCdzIERPTSwgZWl0aGVyIGF0IHRoZVxuICogZW5kIG9mIHRoZSBjb250YWluZXIgQ2hpbGRQYXJ0LCBvciBiZWZvcmUgdGhlIG9wdGlvbmFsIGByZWZQYXJ0YC5cbiAqXG4gKiBUaGlzIGRvZXMgbm90IGFkZCB0aGUgcGFydCB0byB0aGUgY29udGFpbmVyUGFydCdzIGNvbW1pdHRlZCB2YWx1ZS4gVGhhdCBtdXN0XG4gKiBiZSBkb25lIGJ5IGNhbGxlcnMuXG4gKlxuICogQHBhcmFtIGNvbnRhaW5lclBhcnQgUGFydCB3aXRoaW4gd2hpY2ggdG8gYWRkIHRoZSBuZXcgQ2hpbGRQYXJ0XG4gKiBAcGFyYW0gcmVmUGFydCBQYXJ0IGJlZm9yZSB3aGljaCB0byBhZGQgdGhlIG5ldyBDaGlsZFBhcnQ7IHdoZW4gb21pdHRlZCB0aGVcbiAqICAgICBwYXJ0IGFkZGVkIHRvIHRoZSBlbmQgb2YgdGhlIGBjb250YWluZXJQYXJ0YFxuICogQHBhcmFtIHBhcnQgUGFydCB0byBpbnNlcnQsIG9yIHVuZGVmaW5lZCB0byBjcmVhdGUgYSBuZXcgcGFydFxuICovXG5leHBvcnQgY29uc3QgaW5zZXJ0UGFydCA9IChcbiAgY29udGFpbmVyUGFydDogQ2hpbGRQYXJ0LFxuICByZWZQYXJ0PzogQ2hpbGRQYXJ0LFxuICBwYXJ0PzogQ2hpbGRQYXJ0XG4pOiBDaGlsZFBhcnQgPT4ge1xuICBjb25zdCBjb250YWluZXIgPSB3cmFwKGNvbnRhaW5lclBhcnQuXyRzdGFydE5vZGUpLnBhcmVudE5vZGUhO1xuXG4gIGNvbnN0IHJlZk5vZGUgPVxuICAgIHJlZlBhcnQgPT09IHVuZGVmaW5lZCA/IGNvbnRhaW5lclBhcnQuXyRlbmROb2RlIDogcmVmUGFydC5fJHN0YXJ0Tm9kZTtcblxuICBpZiAocGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3Qgc3RhcnROb2RlID0gd3JhcChjb250YWluZXIpLmluc2VydEJlZm9yZShjcmVhdGVNYXJrZXIoKSwgcmVmTm9kZSk7XG4gICAgY29uc3QgZW5kTm9kZSA9IHdyYXAoY29udGFpbmVyKS5pbnNlcnRCZWZvcmUoY3JlYXRlTWFya2VyKCksIHJlZk5vZGUpO1xuICAgIHBhcnQgPSBuZXcgQ2hpbGRQYXJ0KFxuICAgICAgc3RhcnROb2RlLFxuICAgICAgZW5kTm9kZSxcbiAgICAgIGNvbnRhaW5lclBhcnQsXG4gICAgICBjb250YWluZXJQYXJ0Lm9wdGlvbnNcbiAgICApO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGVuZE5vZGUgPSB3cmFwKHBhcnQuXyRlbmROb2RlISkubmV4dFNpYmxpbmc7XG4gICAgY29uc3Qgb2xkUGFyZW50ID0gcGFydC5fJHBhcmVudDtcbiAgICBjb25zdCBwYXJlbnRDaGFuZ2VkID0gb2xkUGFyZW50ICE9PSBjb250YWluZXJQYXJ0O1xuICAgIGlmIChwYXJlbnRDaGFuZ2VkKSB7XG4gICAgICBwYXJ0Ll8kcmVwYXJlbnREaXNjb25uZWN0YWJsZXM/Lihjb250YWluZXJQYXJ0KTtcbiAgICAgIC8vIE5vdGUgdGhhdCBhbHRob3VnaCBgXyRyZXBhcmVudERpc2Nvbm5lY3RhYmxlc2AgdXBkYXRlcyB0aGUgcGFydCdzXG4gICAgICAvLyBgXyRwYXJlbnRgIHJlZmVyZW5jZSBhZnRlciB1bmxpbmtpbmcgZnJvbSBpdHMgY3VycmVudCBwYXJlbnQsIHRoYXRcbiAgICAgIC8vIG1ldGhvZCBvbmx5IGV4aXN0cyBpZiBEaXNjb25uZWN0YWJsZXMgYXJlIHByZXNlbnQsIHNvIHdlIG5lZWQgdG9cbiAgICAgIC8vIHVuY29uZGl0aW9uYWxseSBzZXQgaXQgaGVyZVxuICAgICAgcGFydC5fJHBhcmVudCA9IGNvbnRhaW5lclBhcnQ7XG4gICAgICAvLyBTaW5jZSB0aGUgXyRpc0Nvbm5lY3RlZCBnZXR0ZXIgaXMgc29tZXdoYXQgY29zdGx5LCBvbmx5XG4gICAgICAvLyByZWFkIGl0IG9uY2Ugd2Uga25vdyB0aGUgc3VidHJlZSBoYXMgZGlyZWN0aXZlcyB0aGF0IG5lZWRcbiAgICAgIC8vIHRvIGJlIG5vdGlmaWVkXG4gICAgICBsZXQgbmV3Q29ubmVjdGlvblN0YXRlO1xuICAgICAgaWYgKFxuICAgICAgICBwYXJ0Ll8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAobmV3Q29ubmVjdGlvblN0YXRlID0gY29udGFpbmVyUGFydC5fJGlzQ29ubmVjdGVkKSAhPT1cbiAgICAgICAgICBvbGRQYXJlbnQhLl8kaXNDb25uZWN0ZWRcbiAgICAgICkge1xuICAgICAgICBwYXJ0Ll8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQobmV3Q29ubmVjdGlvblN0YXRlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGVuZE5vZGUgIT09IHJlZk5vZGUgfHwgcGFyZW50Q2hhbmdlZCkge1xuICAgICAgbGV0IHN0YXJ0OiBOb2RlIHwgbnVsbCA9IHBhcnQuXyRzdGFydE5vZGU7XG4gICAgICB3aGlsZSAoc3RhcnQgIT09IGVuZE5vZGUpIHtcbiAgICAgICAgY29uc3QgbjogTm9kZSB8IG51bGwgPSB3cmFwKHN0YXJ0ISkubmV4dFNpYmxpbmc7XG4gICAgICAgIHdyYXAoY29udGFpbmVyKS5pbnNlcnRCZWZvcmUoc3RhcnQhLCByZWZOb2RlKTtcbiAgICAgICAgc3RhcnQgPSBuO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwYXJ0O1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIFBhcnQuXG4gKlxuICogTm90ZSB0aGF0IHRoaXMgc2hvdWxkIG9ubHkgYmUgdXNlZCB0byBzZXQvdXBkYXRlIHRoZSB2YWx1ZSBvZiB1c2VyLWNyZWF0ZWRcbiAqIHBhcnRzIChpLmUuIHRob3NlIGNyZWF0ZWQgdXNpbmcgYGluc2VydFBhcnRgKTsgaXQgc2hvdWxkIG5vdCBiZSB1c2VkXG4gKiBieSBkaXJlY3RpdmVzIHRvIHNldCB0aGUgdmFsdWUgb2YgdGhlIGRpcmVjdGl2ZSdzIGNvbnRhaW5lciBwYXJ0LiBEaXJlY3RpdmVzXG4gKiBzaG91bGQgcmV0dXJuIGEgdmFsdWUgZnJvbSBgdXBkYXRlYC9gcmVuZGVyYCB0byB1cGRhdGUgdGhlaXIgcGFydCBzdGF0ZS5cbiAqXG4gKiBGb3IgZGlyZWN0aXZlcyB0aGF0IHJlcXVpcmUgc2V0dGluZyB0aGVpciBwYXJ0IHZhbHVlIGFzeW5jaHJvbm91c2x5LCB0aGV5XG4gKiBzaG91bGQgZXh0ZW5kIGBBc3luY0RpcmVjdGl2ZWAgYW5kIGNhbGwgYHRoaXMuc2V0VmFsdWUoKWAuXG4gKlxuICogQHBhcmFtIHBhcnQgUGFydCB0byBzZXRcbiAqIEBwYXJhbSB2YWx1ZSBWYWx1ZSB0byBzZXRcbiAqIEBwYXJhbSBpbmRleCBGb3IgYEF0dHJpYnV0ZVBhcnRgcywgdGhlIGluZGV4IHRvIHNldFxuICogQHBhcmFtIGRpcmVjdGl2ZVBhcmVudCBVc2VkIGludGVybmFsbHk7IHNob3VsZCBub3QgYmUgc2V0IGJ5IHVzZXJcbiAqL1xuZXhwb3J0IGNvbnN0IHNldENoaWxkUGFydFZhbHVlID0gPFQgZXh0ZW5kcyBDaGlsZFBhcnQ+KFxuICBwYXJ0OiBULFxuICB2YWx1ZTogdW5rbm93bixcbiAgZGlyZWN0aXZlUGFyZW50OiBEaXJlY3RpdmVQYXJlbnQgPSBwYXJ0XG4pOiBUID0+IHtcbiAgcGFydC5fJHNldFZhbHVlKHZhbHVlLCBkaXJlY3RpdmVQYXJlbnQpO1xuICByZXR1cm4gcGFydDtcbn07XG5cbi8vIEEgc2VudGluYWwgdmFsdWUgdGhhdCBjYW4gbmV2ZXIgYXBwZWFyIGFzIGEgcGFydCB2YWx1ZSBleGNlcHQgd2hlbiBzZXQgYnlcbi8vIGxpdmUoKS4gVXNlZCB0byBmb3JjZSBhIGRpcnR5LWNoZWNrIHRvIGZhaWwgYW5kIGNhdXNlIGEgcmUtcmVuZGVyLlxuY29uc3QgUkVTRVRfVkFMVUUgPSB7fTtcblxuLyoqXG4gKiBTZXRzIHRoZSBjb21taXR0ZWQgdmFsdWUgb2YgYSBDaGlsZFBhcnQgZGlyZWN0bHkgd2l0aG91dCB0cmlnZ2VyaW5nIHRoZVxuICogY29tbWl0IHN0YWdlIG9mIHRoZSBwYXJ0LlxuICpcbiAqIFRoaXMgaXMgdXNlZnVsIGluIGNhc2VzIHdoZXJlIGEgZGlyZWN0aXZlIG5lZWRzIHRvIHVwZGF0ZSB0aGUgcGFydCBzdWNoXG4gKiB0aGF0IHRoZSBuZXh0IHVwZGF0ZSBkZXRlY3RzIGEgdmFsdWUgY2hhbmdlIG9yIG5vdC4gV2hlbiB2YWx1ZSBpcyBvbWl0dGVkLFxuICogdGhlIG5leHQgdXBkYXRlIHdpbGwgYmUgZ3VhcmFudGVlZCB0byBiZSBkZXRlY3RlZCBhcyBhIGNoYW5nZS5cbiAqXG4gKiBAcGFyYW0gcGFydFxuICogQHBhcmFtIHZhbHVlXG4gKi9cbmV4cG9ydCBjb25zdCBzZXRDb21taXR0ZWRWYWx1ZSA9IChwYXJ0OiBQYXJ0LCB2YWx1ZTogdW5rbm93biA9IFJFU0VUX1ZBTFVFKSA9PlxuICAocGFydC5fJGNvbW1pdHRlZFZhbHVlID0gdmFsdWUpO1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGNvbW1pdHRlZCB2YWx1ZSBvZiBhIENoaWxkUGFydC5cbiAqXG4gKiBUaGUgY29tbWl0dGVkIHZhbHVlIGlzIHVzZWQgZm9yIGNoYW5nZSBkZXRlY3Rpb24gYW5kIGVmZmljaWVudCB1cGRhdGVzIG9mXG4gKiB0aGUgcGFydC4gSXQgY2FuIGRpZmZlciBmcm9tIHRoZSB2YWx1ZSBzZXQgYnkgdGhlIHRlbXBsYXRlIG9yIGRpcmVjdGl2ZSBpblxuICogY2FzZXMgd2hlcmUgdGhlIHRlbXBsYXRlIHZhbHVlIGlzIHRyYW5zZm9ybWVkIGJlZm9yZSBiZWluZyBjb21taXRlZC5cbiAqXG4gKiAtIGBUZW1wbGF0ZVJlc3VsdGBzIGFyZSBjb21taXR0ZWQgYXMgYSBgVGVtcGxhdGVJbnN0YW5jZWBcbiAqIC0gSXRlcmFibGVzIGFyZSBjb21taXR0ZWQgYXMgYEFycmF5PENoaWxkUGFydD5gXG4gKiAtIEFsbCBvdGhlciB0eXBlcyBhcmUgY29tbWl0dGVkIGFzIHRoZSB0ZW1wbGF0ZSB2YWx1ZSBvciB2YWx1ZSByZXR1cm5lZCBvclxuICogICBzZXQgYnkgYSBkaXJlY3RpdmUuXG4gKlxuICogQHBhcmFtIHBhcnRcbiAqL1xuZXhwb3J0IGNvbnN0IGdldENvbW1pdHRlZFZhbHVlID0gKHBhcnQ6IENoaWxkUGFydCkgPT4gcGFydC5fJGNvbW1pdHRlZFZhbHVlO1xuXG4vKipcbiAqIFJlbW92ZXMgYSBDaGlsZFBhcnQgZnJvbSB0aGUgRE9NLCBpbmNsdWRpbmcgYW55IG9mIGl0cyBjb250ZW50LlxuICpcbiAqIEBwYXJhbSBwYXJ0IFRoZSBQYXJ0IHRvIHJlbW92ZVxuICovXG5leHBvcnQgY29uc3QgcmVtb3ZlUGFydCA9IChwYXJ0OiBDaGlsZFBhcnQpID0+IHtcbiAgcGFydC5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkPy4oZmFsc2UsIHRydWUpO1xuICBsZXQgc3RhcnQ6IENoaWxkTm9kZSB8IG51bGwgPSBwYXJ0Ll8kc3RhcnROb2RlO1xuICBjb25zdCBlbmQ6IENoaWxkTm9kZSB8IG51bGwgPSB3cmFwKHBhcnQuXyRlbmROb2RlISkubmV4dFNpYmxpbmc7XG4gIHdoaWxlIChzdGFydCAhPT0gZW5kKSB7XG4gICAgY29uc3QgbjogQ2hpbGROb2RlIHwgbnVsbCA9IHdyYXAoc3RhcnQhKS5uZXh0U2libGluZztcbiAgICAod3JhcChzdGFydCEpIGFzIENoaWxkTm9kZSkucmVtb3ZlKCk7XG4gICAgc3RhcnQgPSBuO1xuICB9XG59O1xuXG5leHBvcnQgY29uc3QgY2xlYXJQYXJ0ID0gKHBhcnQ6IENoaWxkUGFydCkgPT4ge1xuICBwYXJ0Ll8kY2xlYXIoKTtcbn07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLyoqXG4gKiBPdmVydmlldzpcbiAqXG4gKiBUaGlzIG1vZHVsZSBpcyBkZXNpZ25lZCB0byBhZGQgc3VwcG9ydCBmb3IgYW4gYXN5bmMgYHNldFZhbHVlYCBBUEkgYW5kXG4gKiBgZGlzY29ubmVjdGVkYCBjYWxsYmFjayB0byBkaXJlY3RpdmVzIHdpdGggdGhlIGxlYXN0IGltcGFjdCBvbiB0aGUgY29yZVxuICogcnVudGltZSBvciBwYXlsb2FkIHdoZW4gdGhhdCBmZWF0dXJlIGlzIG5vdCB1c2VkLlxuICpcbiAqIFRoZSBzdHJhdGVneSBpcyB0byBpbnRyb2R1Y2UgYSBgQXN5bmNEaXJlY3RpdmVgIHN1YmNsYXNzIG9mXG4gKiBgRGlyZWN0aXZlYCB0aGF0IGNsaW1icyB0aGUgXCJwYXJlbnRcIiB0cmVlIGluIGl0cyBjb25zdHJ1Y3RvciB0byBub3RlIHdoaWNoXG4gKiBicmFuY2hlcyBvZiBsaXQtaHRtbCdzIFwibG9naWNhbCB0cmVlXCIgb2YgZGF0YSBzdHJ1Y3R1cmVzIGNvbnRhaW4gc3VjaFxuICogZGlyZWN0aXZlcyBhbmQgdGh1cyBuZWVkIHRvIGJlIGNyYXdsZWQgd2hlbiBhIHN1YnRyZWUgaXMgYmVpbmcgY2xlYXJlZCAob3JcbiAqIG1hbnVhbGx5IGRpc2Nvbm5lY3RlZCkgaW4gb3JkZXIgdG8gcnVuIHRoZSBgZGlzY29ubmVjdGVkYCBjYWxsYmFjay5cbiAqXG4gKiBUaGUgXCJub2Rlc1wiIG9mIHRoZSBsb2dpY2FsIHRyZWUgaW5jbHVkZSBQYXJ0cywgVGVtcGxhdGVJbnN0YW5jZXMgKGZvciB3aGVuIGFcbiAqIFRlbXBsYXRlUmVzdWx0IGlzIGNvbW1pdHRlZCB0byBhIHZhbHVlIG9mIGEgQ2hpbGRQYXJ0KSwgYW5kIERpcmVjdGl2ZXM7IHRoZXNlXG4gKiBhbGwgaW1wbGVtZW50IGEgY29tbW9uIGludGVyZmFjZSBjYWxsZWQgYERpc2Nvbm5lY3RhYmxlQ2hpbGRgLiBFYWNoIGhhcyBhXG4gKiBgXyRwYXJlbnRgIHJlZmVyZW5jZSB3aGljaCBpcyBzZXQgZHVyaW5nIGNvbnN0cnVjdGlvbiBpbiB0aGUgY29yZSBjb2RlLCBhbmQgYVxuICogYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAgZmllbGQgd2hpY2ggaXMgaW5pdGlhbGx5IHVuZGVmaW5lZC5cbiAqXG4gKiBUaGUgc3BhcnNlIHRyZWUgY3JlYXRlZCBieSBtZWFucyBvZiB0aGUgYEFzeW5jRGlyZWN0aXZlYCBjb25zdHJ1Y3RvclxuICogY3Jhd2xpbmcgdXAgdGhlIGBfJHBhcmVudGAgdHJlZSBhbmQgcGxhY2luZyBhIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gIFNldFxuICogb24gZWFjaCBwYXJlbnQgdGhhdCBpbmNsdWRlcyBlYWNoIGNoaWxkIHRoYXQgY29udGFpbnMgYVxuICogYEFzeW5jRGlyZWN0aXZlYCBkaXJlY3RseSBvciB0cmFuc2l0aXZlbHkgdmlhIGl0cyBjaGlsZHJlbi4gSW4gb3JkZXIgdG9cbiAqIG5vdGlmeSBjb25uZWN0aW9uIHN0YXRlIGNoYW5nZXMgYW5kIGRpc2Nvbm5lY3QgKG9yIHJlY29ubmVjdCkgYSB0cmVlLCB0aGVcbiAqIGBfJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkYCBBUEkgaXMgcGF0Y2hlZCBvbnRvIENoaWxkUGFydHMgYXMgYSBkaXJlY3RpdmVcbiAqIGNsaW1icyB0aGUgcGFyZW50IHRyZWUsIHdoaWNoIGlzIGNhbGxlZCBieSB0aGUgY29yZSB3aGVuIGNsZWFyaW5nIGEgcGFydCBpZlxuICogaXQgZXhpc3RzLiBXaGVuIGNhbGxlZCwgdGhhdCBtZXRob2QgaXRlcmF0ZXMgb3ZlciB0aGUgc3BhcnNlIHRyZWUgb2ZcbiAqIFNldDxEaXNjb25uZWN0YWJsZUNoaWxkcmVuPiBidWlsdCB1cCBieSBBc3luY0RpcmVjdGl2ZXMsIGFuZCBjYWxsc1xuICogYF8kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWRgIG9uIGFueSBkaXJlY3RpdmVzIHRoYXQgYXJlIGVuY291bnRlcmVkXG4gKiBpbiB0aGF0IHRyZWUsIHJ1bm5pbmcgdGhlIHJlcXVpcmVkIGNhbGxiYWNrcy5cbiAqXG4gKiBBIGdpdmVuIFwibG9naWNhbCB0cmVlXCIgb2YgbGl0LWh0bWwgZGF0YS1zdHJ1Y3R1cmVzIG1pZ2h0IGxvb2sgbGlrZSB0aGlzOlxuICpcbiAqICBDaGlsZFBhcnQoTjEpIF8kZEM9W0QyLFQzXVxuICogICAuX2RpcmVjdGl2ZVxuICogICAgIEFzeW5jRGlyZWN0aXZlKEQyKVxuICogICAuX3ZhbHVlIC8vIHVzZXIgdmFsdWUgd2FzIFRlbXBsYXRlUmVzdWx0XG4gKiAgICAgVGVtcGxhdGVJbnN0YW5jZShUMykgXyRkQz1bQTQsQTYsTjEwLE4xMl1cbiAqICAgICAgLl9wYXJ0c1tdXG4gKiAgICAgICAgQXR0cmlidXRlUGFydChBNCkgXyRkQz1bRDVdXG4gKiAgICAgICAgIC5fZGlyZWN0aXZlc1tdXG4gKiAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDUpXG4gKiAgICAgICAgQXR0cmlidXRlUGFydChBNikgXyRkQz1bRDcsRDhdXG4gKiAgICAgICAgIC5fZGlyZWN0aXZlc1tdXG4gKiAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDcpXG4gKiAgICAgICAgICAgRGlyZWN0aXZlKEQ4KSBfJGRDPVtEOV1cbiAqICAgICAgICAgICAgLl9kaXJlY3RpdmVcbiAqICAgICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEOSlcbiAqICAgICAgICBDaGlsZFBhcnQoTjEwKSBfJGRDPVtEMTFdXG4gKiAgICAgICAgIC5fZGlyZWN0aXZlXG4gKiAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDExKVxuICogICAgICAgICAuX3ZhbHVlXG4gKiAgICAgICAgICAgc3RyaW5nXG4gKiAgICAgICAgQ2hpbGRQYXJ0KE4xMikgXyRkQz1bRDEzLE4xNCxOMTZdXG4gKiAgICAgICAgIC5fZGlyZWN0aXZlXG4gKiAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDEzKVxuICogICAgICAgICAuX3ZhbHVlIC8vIHVzZXIgdmFsdWUgd2FzIGl0ZXJhYmxlXG4gKiAgICAgICAgICAgQXJyYXk8Q2hpbGRQYXJ0PlxuICogICAgICAgICAgICAgQ2hpbGRQYXJ0KE4xNCkgXyRkQz1bRDE1XVxuICogICAgICAgICAgICAgIC5fdmFsdWVcbiAqICAgICAgICAgICAgICAgIHN0cmluZ1xuICogICAgICAgICAgICAgQ2hpbGRQYXJ0KE4xNikgXyRkQz1bRDE3LFQxOF1cbiAqICAgICAgICAgICAgICAuX2RpcmVjdGl2ZVxuICogICAgICAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDE3KVxuICogICAgICAgICAgICAgIC5fdmFsdWUgLy8gdXNlciB2YWx1ZSB3YXMgVGVtcGxhdGVSZXN1bHRcbiAqICAgICAgICAgICAgICAgIFRlbXBsYXRlSW5zdGFuY2UoVDE4KSBfJGRDPVtBMTksQTIxLE4yNV1cbiAqICAgICAgICAgICAgICAgICAuX3BhcnRzW11cbiAqICAgICAgICAgICAgICAgICAgIEF0dHJpYnV0ZVBhcnQoQTE5KSBfJGRDPVtEMjBdXG4gKiAgICAgICAgICAgICAgICAgICAgLl9kaXJlY3RpdmVzW11cbiAqICAgICAgICAgICAgICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQyMClcbiAqICAgICAgICAgICAgICAgICAgIEF0dHJpYnV0ZVBhcnQoQTIxKSBfJGRDPVsyMiwyM11cbiAqICAgICAgICAgICAgICAgICAgICAuX2RpcmVjdGl2ZXNbXVxuICogICAgICAgICAgICAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDIyKVxuICogICAgICAgICAgICAgICAgICAgICAgRGlyZWN0aXZlKEQyMykgXyRkQz1bRDI0XVxuICogICAgICAgICAgICAgICAgICAgICAgIC5fZGlyZWN0aXZlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEMjQpXG4gKiAgICAgICAgICAgICAgICAgICBDaGlsZFBhcnQoTjI1KSBfJGRDPVtEMjZdXG4gKiAgICAgICAgICAgICAgICAgICAgLl9kaXJlY3RpdmVcbiAqICAgICAgICAgICAgICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQyNilcbiAqICAgICAgICAgICAgICAgICAgICAuX3ZhbHVlXG4gKiAgICAgICAgICAgICAgICAgICAgICBzdHJpbmdcbiAqXG4gKiBFeGFtcGxlIDE6IFRoZSBkaXJlY3RpdmUgaW4gQ2hpbGRQYXJ0KE4xMikgdXBkYXRlcyBhbmQgcmV0dXJucyBgbm90aGluZ2AuIFRoZVxuICogQ2hpbGRQYXJ0IHdpbGwgX2NsZWFyKCkgaXRzZWxmLCBhbmQgc28gd2UgbmVlZCB0byBkaXNjb25uZWN0IHRoZSBcInZhbHVlXCIgb2ZcbiAqIHRoZSBDaGlsZFBhcnQgKGJ1dCBub3QgaXRzIGRpcmVjdGl2ZSkuIEluIHRoaXMgY2FzZSwgd2hlbiBgX2NsZWFyKClgIGNhbGxzXG4gKiBgXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZCgpYCwgd2UgZG9uJ3QgaXRlcmF0ZSBhbGwgb2YgdGhlXG4gKiBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4sIHJhdGhlciB3ZSBkbyBhIHZhbHVlLXNwZWNpZmljIGRpc2Nvbm5lY3Rpb246IGkuZS5cbiAqIHNpbmNlIHRoZSBfdmFsdWUgd2FzIGFuIEFycmF5PENoaWxkUGFydD4gKGJlY2F1c2UgYW4gaXRlcmFibGUgaGFkIGJlZW5cbiAqIGNvbW1pdHRlZCksIHdlIGl0ZXJhdGUgdGhlIGFycmF5IG9mIENoaWxkUGFydHMgKE4xNCwgTjE2KSBhbmQgcnVuXG4gKiBgc2V0Q29ubmVjdGVkYCBvbiB0aGVtICh3aGljaCBkb2VzIHJlY3Vyc2UgZG93biB0aGUgZnVsbCB0cmVlIG9mXG4gKiBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCBiZWxvdyBpdCwgYW5kIGFsc28gcmVtb3ZlcyBOMTQgYW5kIE4xNiBmcm9tIE4xMidzXG4gKiBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCkuIE9uY2UgdGhlIHZhbHVlcyBoYXZlIGJlZW4gZGlzY29ubmVjdGVkLCB3ZSB0aGVuXG4gKiBjaGVjayB3aGV0aGVyIHRoZSBDaGlsZFBhcnQoTjEyKSdzIGxpc3Qgb2YgYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAgaXMgZW1wdHlcbiAqIChhbmQgd291bGQgcmVtb3ZlIGl0IGZyb20gaXRzIHBhcmVudCBUZW1wbGF0ZUluc3RhbmNlKFQzKSBpZiBzbyksIGJ1dCBzaW5jZVxuICogaXQgd291bGQgc3RpbGwgY29udGFpbiBpdHMgZGlyZWN0aXZlIEQxMywgaXQgc3RheXMgaW4gdGhlIGRpc2Nvbm5lY3RhYmxlXG4gKiB0cmVlLlxuICpcbiAqIEV4YW1wbGUgMjogSW4gdGhlIGNvdXJzZSBvZiBFeGFtcGxlIDEsIGBzZXRDb25uZWN0ZWRgIHdpbGwgcmVhY2hcbiAqIENoaWxkUGFydChOMTYpOyBpbiB0aGlzIGNhc2UgdGhlIGVudGlyZSBwYXJ0IGlzIGJlaW5nIGRpc2Nvbm5lY3RlZCwgc28gd2VcbiAqIHNpbXBseSBpdGVyYXRlIGFsbCBvZiBOMTYncyBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCAoRDE3LFQxOCkgYW5kXG4gKiByZWN1cnNpdmVseSBydW4gYHNldENvbm5lY3RlZGAgb24gdGhlbS4gTm90ZSB0aGF0IHdlIG9ubHkgcmVtb3ZlIGNoaWxkcmVuXG4gKiBmcm9tIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gIGZvciB0aGUgdG9wLWxldmVsIHZhbHVlcyBiZWluZyBkaXNjb25uZWN0ZWRcbiAqIG9uIGEgY2xlYXI7IGRvaW5nIHRoaXMgYm9va2tlZXBpbmcgbG93ZXIgaW4gdGhlIHRyZWUgaXMgd2FzdGVmdWwgc2luY2UgaXQnc1xuICogYWxsIGJlaW5nIHRocm93biBhd2F5LlxuICpcbiAqIEV4YW1wbGUgMzogSWYgdGhlIExpdEVsZW1lbnQgY29udGFpbmluZyB0aGUgZW50aXJlIHRyZWUgYWJvdmUgYmVjb21lc1xuICogZGlzY29ubmVjdGVkLCBpdCB3aWxsIHJ1biBgY2hpbGRQYXJ0LnNldENvbm5lY3RlZCgpYCAod2hpY2ggY2FsbHNcbiAqIGBjaGlsZFBhcnQuXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZCgpYCBpZiBpdCBleGlzdHMpOyBpbiB0aGlzIGNhc2UsIHdlXG4gKiByZWN1cnNpdmVseSBydW4gYHNldENvbm5lY3RlZCgpYCBvdmVyIHRoZSBlbnRpcmUgdHJlZSwgd2l0aG91dCByZW1vdmluZyBhbnlcbiAqIGNoaWxkcmVuIGZyb20gYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAsIHNpbmNlIHRoaXMgdHJlZSBpcyByZXF1aXJlZCB0b1xuICogcmUtY29ubmVjdCB0aGUgdHJlZSwgd2hpY2ggZG9lcyB0aGUgc2FtZSBvcGVyYXRpb24sIHNpbXBseSBwYXNzaW5nXG4gKiBgaXNDb25uZWN0ZWQ6IHRydWVgIGRvd24gdGhlIHRyZWUsIHNpZ25hbGluZyB3aGljaCBjYWxsYmFjayB0byBydW4uXG4gKi9cblxuaW1wb3J0IHtBdHRyaWJ1dGVQYXJ0LCBDaGlsZFBhcnQsIERpc2Nvbm5lY3RhYmxlLCBQYXJ0fSBmcm9tICcuL2xpdC1odG1sLmpzJztcbmltcG9ydCB7aXNTaW5nbGVFeHByZXNzaW9ufSBmcm9tICcuL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcbmltcG9ydCB7RGlyZWN0aXZlLCBQYXJ0SW5mbywgUGFydFR5cGV9IGZyb20gJy4vZGlyZWN0aXZlLmpzJztcbmV4cG9ydCB7ZGlyZWN0aXZlfSBmcm9tICcuL2RpcmVjdGl2ZS5qcyc7XG5cbmNvbnN0IERFVl9NT0RFID0gdHJ1ZTtcblxuLyoqXG4gKiBSZWN1cnNpdmVseSB3YWxrcyBkb3duIHRoZSB0cmVlIG9mIFBhcnRzL1RlbXBsYXRlSW5zdGFuY2VzL0RpcmVjdGl2ZXMgdG8gc2V0XG4gKiB0aGUgY29ubmVjdGVkIHN0YXRlIG9mIGRpcmVjdGl2ZXMgYW5kIHJ1biBgZGlzY29ubmVjdGVkYC8gYHJlY29ubmVjdGVkYFxuICogY2FsbGJhY2tzLlxuICpcbiAqIEByZXR1cm4gVHJ1ZSBpZiB0aGVyZSB3ZXJlIGNoaWxkcmVuIHRvIGRpc2Nvbm5lY3Q7IGZhbHNlIG90aGVyd2lzZVxuICovXG5jb25zdCBub3RpZnlDaGlsZHJlbkNvbm5lY3RlZENoYW5nZWQgPSAoXG4gIHBhcmVudDogRGlzY29ubmVjdGFibGUsXG4gIGlzQ29ubmVjdGVkOiBib29sZWFuXG4pOiBib29sZWFuID0+IHtcbiAgY29uc3QgY2hpbGRyZW4gPSBwYXJlbnQuXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuO1xuICBpZiAoY2hpbGRyZW4gPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBmb3IgKGNvbnN0IG9iaiBvZiBjaGlsZHJlbikge1xuICAgIC8vIFRoZSBleGlzdGVuY2Ugb2YgYF8kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWRgIGlzIHVzZWQgYXMgYSBcImJyYW5kXCIgdG9cbiAgICAvLyBkaXNhbWJpZ3VhdGUgQXN5bmNEaXJlY3RpdmVzIGZyb20gb3RoZXIgRGlzY29ubmVjdGFibGVDaGlsZHJlblxuICAgIC8vIChhcyBvcHBvc2VkIHRvIHVzaW5nIGFuIGluc3RhbmNlb2YgY2hlY2sgdG8ga25vdyB3aGVuIHRvIGNhbGwgaXQpOyB0aGVcbiAgICAvLyByZWR1bmRhbmN5IG9mIFwiRGlyZWN0aXZlXCIgaW4gdGhlIEFQSSBuYW1lIGlzIHRvIGF2b2lkIGNvbmZsaWN0aW5nIHdpdGhcbiAgICAvLyBgXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZGAsIHdoaWNoIGV4aXN0cyBgQ2hpbGRQYXJ0c2Agd2hpY2ggYXJlIGFsc28gaW5cbiAgICAvLyB0aGlzIGxpc3RcbiAgICAvLyBEaXNjb25uZWN0IERpcmVjdGl2ZSAoYW5kIGFueSBuZXN0ZWQgZGlyZWN0aXZlcyBjb250YWluZWQgd2l0aGluKVxuICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgKG9iaiBhcyBBc3luY0RpcmVjdGl2ZSlbJ18kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWQnXT8uKFxuICAgICAgaXNDb25uZWN0ZWQsXG4gICAgICBmYWxzZVxuICAgICk7XG4gICAgLy8gRGlzY29ubmVjdCBQYXJ0L1RlbXBsYXRlSW5zdGFuY2VcbiAgICBub3RpZnlDaGlsZHJlbkNvbm5lY3RlZENoYW5nZWQob2JqLCBpc0Nvbm5lY3RlZCk7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgdGhlIGdpdmVuIGNoaWxkIGZyb20gaXRzIHBhcmVudCBsaXN0IG9mIGRpc2Nvbm5lY3RhYmxlIGNoaWxkcmVuLCBhbmRcbiAqIGlmIHRoZSBwYXJlbnQgbGlzdCBiZWNvbWVzIGVtcHR5IGFzIGEgcmVzdWx0LCByZW1vdmVzIHRoZSBwYXJlbnQgZnJvbSBpdHNcbiAqIHBhcmVudCwgYW5kIHNvIGZvcnRoIHVwIHRoZSB0cmVlIHdoZW4gdGhhdCBjYXVzZXMgc3Vic2VxdWVudCBwYXJlbnQgbGlzdHMgdG9cbiAqIGJlY29tZSBlbXB0eS5cbiAqL1xuY29uc3QgcmVtb3ZlRGlzY29ubmVjdGFibGVGcm9tUGFyZW50ID0gKG9iajogRGlzY29ubmVjdGFibGUpID0+IHtcbiAgbGV0IHBhcmVudCwgY2hpbGRyZW47XG4gIGRvIHtcbiAgICBpZiAoKHBhcmVudCA9IG9iai5fJHBhcmVudCkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNoaWxkcmVuID0gcGFyZW50Ll8kZGlzY29ubmVjdGFibGVDaGlsZHJlbiE7XG4gICAgY2hpbGRyZW4uZGVsZXRlKG9iaik7XG4gICAgb2JqID0gcGFyZW50O1xuICB9IHdoaWxlIChjaGlsZHJlbj8uc2l6ZSA9PT0gMCk7XG59O1xuXG5jb25zdCBhZGREaXNjb25uZWN0YWJsZVRvUGFyZW50ID0gKG9iajogRGlzY29ubmVjdGFibGUpID0+IHtcbiAgLy8gQ2xpbWIgdGhlIHBhcmVudCB0cmVlLCBjcmVhdGluZyBhIHNwYXJzZSB0cmVlIG9mIGNoaWxkcmVuIG5lZWRpbmdcbiAgLy8gZGlzY29ubmVjdGlvblxuICBmb3IgKGxldCBwYXJlbnQ7IChwYXJlbnQgPSBvYmouXyRwYXJlbnQpOyBvYmogPSBwYXJlbnQpIHtcbiAgICBsZXQgY2hpbGRyZW4gPSBwYXJlbnQuXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuO1xuICAgIGlmIChjaGlsZHJlbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBwYXJlbnQuXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuID0gY2hpbGRyZW4gPSBuZXcgU2V0KCk7XG4gICAgfSBlbHNlIGlmIChjaGlsZHJlbi5oYXMob2JqKSkge1xuICAgICAgLy8gT25jZSB3ZSd2ZSByZWFjaGVkIGEgcGFyZW50IHRoYXQgYWxyZWFkeSBjb250YWlucyB0aGlzIGNoaWxkLCB3ZVxuICAgICAgLy8gY2FuIHNob3J0LWNpcmN1aXRcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjaGlsZHJlbi5hZGQob2JqKTtcbiAgICBpbnN0YWxsRGlzY29ubmVjdEFQSShwYXJlbnQpO1xuICB9XG59O1xuXG4vKipcbiAqIENoYW5nZXMgdGhlIHBhcmVudCByZWZlcmVuY2Ugb2YgdGhlIENoaWxkUGFydCwgYW5kIHVwZGF0ZXMgdGhlIHNwYXJzZSB0cmVlIG9mXG4gKiBEaXNjb25uZWN0YWJsZSBjaGlsZHJlbiBhY2NvcmRpbmdseS5cbiAqXG4gKiBOb3RlLCB0aGlzIG1ldGhvZCB3aWxsIGJlIHBhdGNoZWQgb250byBDaGlsZFBhcnQgaW5zdGFuY2VzIGFuZCBjYWxsZWQgZnJvbVxuICogdGhlIGNvcmUgY29kZSB3aGVuIHBhcnRzIGFyZSBtb3ZlZCBiZXR3ZWVuIGRpZmZlcmVudCBwYXJlbnRzLlxuICovXG5mdW5jdGlvbiByZXBhcmVudERpc2Nvbm5lY3RhYmxlcyh0aGlzOiBDaGlsZFBhcnQsIG5ld1BhcmVudDogRGlzY29ubmVjdGFibGUpIHtcbiAgaWYgKHRoaXMuXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuICE9PSB1bmRlZmluZWQpIHtcbiAgICByZW1vdmVEaXNjb25uZWN0YWJsZUZyb21QYXJlbnQodGhpcyk7XG4gICAgdGhpcy5fJHBhcmVudCA9IG5ld1BhcmVudDtcbiAgICBhZGREaXNjb25uZWN0YWJsZVRvUGFyZW50KHRoaXMpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuXyRwYXJlbnQgPSBuZXdQYXJlbnQ7XG4gIH1cbn1cblxuLyoqXG4gKiBTZXRzIHRoZSBjb25uZWN0ZWQgc3RhdGUgb24gYW55IGRpcmVjdGl2ZXMgY29udGFpbmVkIHdpdGhpbiB0aGUgY29tbWl0dGVkXG4gKiB2YWx1ZSBvZiB0aGlzIHBhcnQgKGkuZS4gd2l0aGluIGEgVGVtcGxhdGVJbnN0YW5jZSBvciBpdGVyYWJsZSBvZlxuICogQ2hpbGRQYXJ0cykgYW5kIHJ1bnMgdGhlaXIgYGRpc2Nvbm5lY3RlZGAvYHJlY29ubmVjdGVkYHMsIGFzIHdlbGwgYXMgd2l0aGluXG4gKiBhbnkgZGlyZWN0aXZlcyBzdG9yZWQgb24gdGhlIENoaWxkUGFydCAod2hlbiBgdmFsdWVPbmx5YCBpcyBmYWxzZSkuXG4gKlxuICogYGlzQ2xlYXJpbmdWYWx1ZWAgc2hvdWxkIGJlIHBhc3NlZCBhcyBgdHJ1ZWAgb24gYSB0b3AtbGV2ZWwgcGFydCB0aGF0IGlzXG4gKiBjbGVhcmluZyBpdHNlbGYsIGFuZCBub3QgYXMgYSByZXN1bHQgb2YgcmVjdXJzaXZlbHkgZGlzY29ubmVjdGluZyBkaXJlY3RpdmVzXG4gKiBhcyBwYXJ0IG9mIGEgYGNsZWFyYCBvcGVyYXRpb24gaGlnaGVyIHVwIHRoZSB0cmVlLiBUaGlzIGJvdGggZW5zdXJlcyB0aGF0IGFueVxuICogZGlyZWN0aXZlIG9uIHRoaXMgQ2hpbGRQYXJ0IHRoYXQgcHJvZHVjZWQgYSB2YWx1ZSB0aGF0IGNhdXNlZCB0aGUgY2xlYXJcbiAqIG9wZXJhdGlvbiBpcyBub3QgZGlzY29ubmVjdGVkLCBhbmQgYWxzbyBzZXJ2ZXMgYXMgYSBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb25cbiAqIHRvIGF2b2lkIG5lZWRsZXNzIGJvb2trZWVwaW5nIHdoZW4gYSBzdWJ0cmVlIGlzIGdvaW5nIGF3YXk7IHdoZW4gY2xlYXJpbmcgYVxuICogc3VidHJlZSwgb25seSB0aGUgdG9wLW1vc3QgcGFydCBuZWVkIHRvIHJlbW92ZSBpdHNlbGYgZnJvbSB0aGUgcGFyZW50LlxuICpcbiAqIGBmcm9tUGFydEluZGV4YCBpcyBwYXNzZWQgb25seSBpbiB0aGUgY2FzZSBvZiBhIHBhcnRpYWwgYF9jbGVhcmAgcnVubmluZyBhcyBhXG4gKiByZXN1bHQgb2YgdHJ1bmNhdGluZyBhbiBpdGVyYWJsZS5cbiAqXG4gKiBOb3RlLCB0aGlzIG1ldGhvZCB3aWxsIGJlIHBhdGNoZWQgb250byBDaGlsZFBhcnQgaW5zdGFuY2VzIGFuZCBjYWxsZWQgZnJvbSB0aGVcbiAqIGNvcmUgY29kZSB3aGVuIHBhcnRzIGFyZSBjbGVhcmVkIG9yIHRoZSBjb25uZWN0aW9uIHN0YXRlIGlzIGNoYW5nZWQgYnkgdGhlXG4gKiB1c2VyLlxuICovXG5mdW5jdGlvbiBub3RpZnlDaGlsZFBhcnRDb25uZWN0ZWRDaGFuZ2VkKFxuICB0aGlzOiBDaGlsZFBhcnQsXG4gIGlzQ29ubmVjdGVkOiBib29sZWFuLFxuICBpc0NsZWFyaW5nVmFsdWUgPSBmYWxzZSxcbiAgZnJvbVBhcnRJbmRleCA9IDBcbikge1xuICBjb25zdCB2YWx1ZSA9IHRoaXMuXyRjb21taXR0ZWRWYWx1ZTtcbiAgY29uc3QgY2hpbGRyZW4gPSB0aGlzLl8kZGlzY29ubmVjdGFibGVDaGlsZHJlbjtcbiAgaWYgKGNoaWxkcmVuID09PSB1bmRlZmluZWQgfHwgY2hpbGRyZW4uc2l6ZSA9PT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoaXNDbGVhcmluZ1ZhbHVlKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAvLyBJdGVyYWJsZSBjYXNlOiBBbnkgQ2hpbGRQYXJ0cyBjcmVhdGVkIGJ5IHRoZSBpdGVyYWJsZSBzaG91bGQgYmVcbiAgICAgIC8vIGRpc2Nvbm5lY3RlZCBhbmQgcmVtb3ZlZCBmcm9tIHRoaXMgQ2hpbGRQYXJ0J3MgZGlzY29ubmVjdGFibGVcbiAgICAgIC8vIGNoaWxkcmVuIChzdGFydGluZyBhdCBgZnJvbVBhcnRJbmRleGAgaW4gdGhlIGNhc2Ugb2YgdHJ1bmNhdGlvbilcbiAgICAgIGZvciAobGV0IGkgPSBmcm9tUGFydEluZGV4OyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbm90aWZ5Q2hpbGRyZW5Db25uZWN0ZWRDaGFuZ2VkKHZhbHVlW2ldLCBmYWxzZSk7XG4gICAgICAgIHJlbW92ZURpc2Nvbm5lY3RhYmxlRnJvbVBhcmVudCh2YWx1ZVtpXSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICAvLyBUZW1wbGF0ZUluc3RhbmNlIGNhc2U6IElmIHRoZSB2YWx1ZSBoYXMgZGlzY29ubmVjdGFibGUgY2hpbGRyZW4gKHdpbGxcbiAgICAgIC8vIG9ubHkgYmUgaW4gdGhlIGNhc2UgdGhhdCBpdCBpcyBhIFRlbXBsYXRlSW5zdGFuY2UpLCB3ZSBkaXNjb25uZWN0IGl0XG4gICAgICAvLyBhbmQgcmVtb3ZlIGl0IGZyb20gdGhpcyBDaGlsZFBhcnQncyBkaXNjb25uZWN0YWJsZSBjaGlsZHJlblxuICAgICAgbm90aWZ5Q2hpbGRyZW5Db25uZWN0ZWRDaGFuZ2VkKHZhbHVlIGFzIERpc2Nvbm5lY3RhYmxlLCBmYWxzZSk7XG4gICAgICByZW1vdmVEaXNjb25uZWN0YWJsZUZyb21QYXJlbnQodmFsdWUgYXMgRGlzY29ubmVjdGFibGUpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBub3RpZnlDaGlsZHJlbkNvbm5lY3RlZENoYW5nZWQodGhpcywgaXNDb25uZWN0ZWQpO1xuICB9XG59XG5cbi8qKlxuICogUGF0Y2hlcyBkaXNjb25uZWN0aW9uIEFQSSBvbnRvIENoaWxkUGFydHMuXG4gKi9cbmNvbnN0IGluc3RhbGxEaXNjb25uZWN0QVBJID0gKG9iajogRGlzY29ubmVjdGFibGUpID0+IHtcbiAgaWYgKChvYmogYXMgQ2hpbGRQYXJ0KS50eXBlID09IFBhcnRUeXBlLkNISUxEKSB7XG4gICAgKG9iaiBhcyBDaGlsZFBhcnQpLl8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQgPz89XG4gICAgICBub3RpZnlDaGlsZFBhcnRDb25uZWN0ZWRDaGFuZ2VkO1xuICAgIChvYmogYXMgQ2hpbGRQYXJ0KS5fJHJlcGFyZW50RGlzY29ubmVjdGFibGVzID8/PSByZXBhcmVudERpc2Nvbm5lY3RhYmxlcztcbiAgfVxufTtcblxuLyoqXG4gKiBBbiBhYnN0cmFjdCBgRGlyZWN0aXZlYCBiYXNlIGNsYXNzIHdob3NlIGBkaXNjb25uZWN0ZWRgIG1ldGhvZCB3aWxsIGJlXG4gKiBjYWxsZWQgd2hlbiB0aGUgcGFydCBjb250YWluaW5nIHRoZSBkaXJlY3RpdmUgaXMgY2xlYXJlZCBhcyBhIHJlc3VsdCBvZlxuICogcmUtcmVuZGVyaW5nLCBvciB3aGVuIHRoZSB1c2VyIGNhbGxzIGBwYXJ0LnNldENvbm5lY3RlZChmYWxzZSlgIG9uXG4gKiBhIHBhcnQgdGhhdCB3YXMgcHJldmlvdXNseSByZW5kZXJlZCBjb250YWluaW5nIHRoZSBkaXJlY3RpdmUgKGFzIGhhcHBlbnNcbiAqIHdoZW4gZS5nLiBhIExpdEVsZW1lbnQgZGlzY29ubmVjdHMgZnJvbSB0aGUgRE9NKS5cbiAqXG4gKiBJZiBgcGFydC5zZXRDb25uZWN0ZWQodHJ1ZSlgIGlzIHN1YnNlcXVlbnRseSBjYWxsZWQgb24gYVxuICogY29udGFpbmluZyBwYXJ0LCB0aGUgZGlyZWN0aXZlJ3MgYHJlY29ubmVjdGVkYCBtZXRob2Qgd2lsbCBiZSBjYWxsZWQgcHJpb3JcbiAqIHRvIGl0cyBuZXh0IGB1cGRhdGVgL2ByZW5kZXJgIGNhbGxiYWNrcy4gV2hlbiBpbXBsZW1lbnRpbmcgYGRpc2Nvbm5lY3RlZGAsXG4gKiBgcmVjb25uZWN0ZWRgIHNob3VsZCBhbHNvIGJlIGltcGxlbWVudGVkIHRvIGJlIGNvbXBhdGlibGUgd2l0aCByZWNvbm5lY3Rpb24uXG4gKlxuICogTm90ZSB0aGF0IHVwZGF0ZXMgbWF5IG9jY3VyIHdoaWxlIHRoZSBkaXJlY3RpdmUgaXMgZGlzY29ubmVjdGVkLiBBcyBzdWNoLFxuICogZGlyZWN0aXZlcyBzaG91bGQgZ2VuZXJhbGx5IGNoZWNrIHRoZSBgdGhpcy5pc0Nvbm5lY3RlZGAgZmxhZyBkdXJpbmdcbiAqIHJlbmRlci91cGRhdGUgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgaXQgaXMgc2FmZSB0byBzdWJzY3JpYmUgdG8gcmVzb3VyY2VzXG4gKiB0aGF0IG1heSBwcmV2ZW50IGdhcmJhZ2UgY29sbGVjdGlvbi5cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFzeW5jRGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgLy8gQXMgb3Bwb3NlZCB0byBvdGhlciBEaXNjb25uZWN0YWJsZXMsIEFzeW5jRGlyZWN0aXZlcyBhbHdheXMgZ2V0IG5vdGlmaWVkXG4gIC8vIHdoZW4gdGhlIFJvb3RQYXJ0IGNvbm5lY3Rpb24gY2hhbmdlcywgc28gdGhlIHB1YmxpYyBgaXNDb25uZWN0ZWRgXG4gIC8vIGlzIGEgbG9jYWxseSBzdG9yZWQgdmFyaWFibGUgaW5pdGlhbGl6ZWQgdmlhIGl0cyBwYXJ0J3MgZ2V0dGVyIGFuZCBzeW5jZWRcbiAgLy8gdmlhIGBfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkYC4gVGhpcyBpcyBjaGVhcGVyIHRoYW4gdXNpbmdcbiAgLy8gdGhlIF8kaXNDb25uZWN0ZWQgZ2V0dGVyLCB3aGljaCBoYXMgdG8gbG9vayBiYWNrIHVwIHRoZSB0cmVlIGVhY2ggdGltZS5cbiAgLyoqXG4gICAqIFRoZSBjb25uZWN0aW9uIHN0YXRlIGZvciB0aGlzIERpcmVjdGl2ZS5cbiAgICovXG4gIGlzQ29ubmVjdGVkITogYm9vbGVhbjtcblxuICAvLyBAaW50ZXJuYWxcbiAgb3ZlcnJpZGUgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuPzogU2V0PERpc2Nvbm5lY3RhYmxlPiA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEluaXRpYWxpemUgdGhlIHBhcnQgd2l0aCBpbnRlcm5hbCBmaWVsZHNcbiAgICogQHBhcmFtIHBhcnRcbiAgICogQHBhcmFtIHBhcmVudFxuICAgKiBAcGFyYW0gYXR0cmlidXRlSW5kZXhcbiAgICovXG4gIG92ZXJyaWRlIF8kaW5pdGlhbGl6ZShcbiAgICBwYXJ0OiBQYXJ0LFxuICAgIHBhcmVudDogRGlzY29ubmVjdGFibGUsXG4gICAgYXR0cmlidXRlSW5kZXg6IG51bWJlciB8IHVuZGVmaW5lZFxuICApIHtcbiAgICBzdXBlci5fJGluaXRpYWxpemUocGFydCwgcGFyZW50LCBhdHRyaWJ1dGVJbmRleCk7XG4gICAgYWRkRGlzY29ubmVjdGFibGVUb1BhcmVudCh0aGlzKTtcbiAgICB0aGlzLmlzQ29ubmVjdGVkID0gcGFydC5fJGlzQ29ubmVjdGVkO1xuICB9XG4gIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gIC8qKlxuICAgKiBDYWxsZWQgZnJvbSB0aGUgY29yZSBjb2RlIHdoZW4gYSBkaXJlY3RpdmUgaXMgZ29pbmcgYXdheSBmcm9tIGEgcGFydCAoaW5cbiAgICogd2hpY2ggY2FzZSBgc2hvdWxkUmVtb3ZlRnJvbVBhcmVudGAgc2hvdWxkIGJlIHRydWUpLCBhbmQgZnJvbSB0aGVcbiAgICogYHNldENoaWxkcmVuQ29ubmVjdGVkYCBoZWxwZXIgZnVuY3Rpb24gd2hlbiByZWN1cnNpdmVseSBjaGFuZ2luZyB0aGVcbiAgICogY29ubmVjdGlvbiBzdGF0ZSBvZiBhIHRyZWUgKGluIHdoaWNoIGNhc2UgYHNob3VsZFJlbW92ZUZyb21QYXJlbnRgIHNob3VsZFxuICAgKiBiZSBmYWxzZSkuXG4gICAqXG4gICAqIEBwYXJhbSBpc0Nvbm5lY3RlZFxuICAgKiBAcGFyYW0gaXNDbGVhcmluZ0RpcmVjdGl2ZSAtIFRydWUgd2hlbiB0aGUgZGlyZWN0aXZlIGl0c2VsZiBpcyBiZWluZ1xuICAgKiAgICAgcmVtb3ZlZDsgZmFsc2Ugd2hlbiB0aGUgdHJlZSBpcyBiZWluZyBkaXNjb25uZWN0ZWRcbiAgICogQGludGVybmFsXG4gICAqL1xuICBvdmVycmlkZSBbJ18kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWQnXShcbiAgICBpc0Nvbm5lY3RlZDogYm9vbGVhbixcbiAgICBpc0NsZWFyaW5nRGlyZWN0aXZlID0gdHJ1ZVxuICApIHtcbiAgICBpZiAoaXNDb25uZWN0ZWQgIT09IHRoaXMuaXNDb25uZWN0ZWQpIHtcbiAgICAgIHRoaXMuaXNDb25uZWN0ZWQgPSBpc0Nvbm5lY3RlZDtcbiAgICAgIGlmIChpc0Nvbm5lY3RlZCkge1xuICAgICAgICB0aGlzLnJlY29ubmVjdGVkPy4oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZGlzY29ubmVjdGVkPy4oKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlzQ2xlYXJpbmdEaXJlY3RpdmUpIHtcbiAgICAgIG5vdGlmeUNoaWxkcmVuQ29ubmVjdGVkQ2hhbmdlZCh0aGlzLCBpc0Nvbm5lY3RlZCk7XG4gICAgICByZW1vdmVEaXNjb25uZWN0YWJsZUZyb21QYXJlbnQodGhpcyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHZhbHVlIG9mIHRoZSBkaXJlY3RpdmUncyBQYXJ0IG91dHNpZGUgdGhlIG5vcm1hbCBgdXBkYXRlYC9gcmVuZGVyYFxuICAgKiBsaWZlY3ljbGUgb2YgYSBkaXJlY3RpdmUuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIHNob3VsZCBub3QgYmUgY2FsbGVkIHN5bmNocm9ub3VzbHkgZnJvbSBhIGRpcmVjdGl2ZSdzIGB1cGRhdGVgXG4gICAqIG9yIGByZW5kZXJgLlxuICAgKlxuICAgKiBAcGFyYW0gZGlyZWN0aXZlIFRoZSBkaXJlY3RpdmUgdG8gdXBkYXRlXG4gICAqIEBwYXJhbSB2YWx1ZSBUaGUgdmFsdWUgdG8gc2V0XG4gICAqL1xuICBzZXRWYWx1ZSh2YWx1ZTogdW5rbm93bikge1xuICAgIGlmIChpc1NpbmdsZUV4cHJlc3Npb24odGhpcy5fX3BhcnQgYXMgdW5rbm93biBhcyBQYXJ0SW5mbykpIHtcbiAgICAgIHRoaXMuX19wYXJ0Ll8kc2V0VmFsdWUodmFsdWUsIHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyB0aGlzLl9fYXR0cmlidXRlSW5kZXggd2lsbCBiZSBkZWZpbmVkIGluIHRoaXMgY2FzZSwgYnV0XG4gICAgICAvLyBhc3NlcnQgaXQgaW4gZGV2IG1vZGVcbiAgICAgIGlmIChERVZfTU9ERSAmJiB0aGlzLl9fYXR0cmlidXRlSW5kZXggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIHRoaXMuX19hdHRyaWJ1dGVJbmRleCB0byBiZSBhIG51bWJlcmApO1xuICAgICAgfVxuICAgICAgY29uc3QgbmV3VmFsdWVzID0gWy4uLih0aGlzLl9fcGFydC5fJGNvbW1pdHRlZFZhbHVlIGFzIEFycmF5PHVua25vd24+KV07XG4gICAgICBuZXdWYWx1ZXNbdGhpcy5fX2F0dHJpYnV0ZUluZGV4IV0gPSB2YWx1ZTtcbiAgICAgICh0aGlzLl9fcGFydCBhcyBBdHRyaWJ1dGVQYXJ0KS5fJHNldFZhbHVlKG5ld1ZhbHVlcywgdGhpcywgMCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFVzZXIgY2FsbGJhY2tzIGZvciBpbXBsZW1lbnRpbmcgbG9naWMgdG8gcmVsZWFzZSBhbnkgcmVzb3VyY2VzL3N1YnNjcmlwdGlvbnNcbiAgICogdGhhdCBtYXkgaGF2ZSBiZWVuIHJldGFpbmVkIGJ5IHRoaXMgZGlyZWN0aXZlLiBTaW5jZSBkaXJlY3RpdmVzIG1heSBhbHNvIGJlXG4gICAqIHJlLWNvbm5lY3RlZCwgYHJlY29ubmVjdGVkYCBzaG91bGQgYWxzbyBiZSBpbXBsZW1lbnRlZCB0byByZXN0b3JlIHRoZVxuICAgKiB3b3JraW5nIHN0YXRlIG9mIHRoZSBkaXJlY3RpdmUgcHJpb3IgdG8gdGhlIG5leHQgcmVuZGVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGRpc2Nvbm5lY3RlZCgpIHt9XG4gIHByb3RlY3RlZCByZWNvbm5lY3RlZCgpIHt9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cbmltcG9ydCB7bm90aGluZywgRWxlbWVudFBhcnR9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7ZGlyZWN0aXZlLCBBc3luY0RpcmVjdGl2ZX0gZnJvbSAnLi4vYXN5bmMtZGlyZWN0aXZlLmpzJztcblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IFJlZiBvYmplY3QsIHdoaWNoIGlzIGNvbnRhaW5lciBmb3IgYSByZWZlcmVuY2UgdG8gYW4gZWxlbWVudC5cbiAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZVJlZiA9IDxUID0gRWxlbWVudD4oKSA9PiBuZXcgUmVmPFQ+KCk7XG5cbi8qKlxuICogQW4gb2JqZWN0IHRoYXQgaG9sZHMgYSByZWYgdmFsdWUuXG4gKi9cbmNsYXNzIFJlZjxUID0gRWxlbWVudD4ge1xuICAvKipcbiAgICogVGhlIGN1cnJlbnQgRWxlbWVudCB2YWx1ZSBvZiB0aGUgcmVmLCBvciBlbHNlIGB1bmRlZmluZWRgIGlmIHRoZSByZWYgaXMgbm9cbiAgICogbG9uZ2VyIHJlbmRlcmVkLlxuICAgKi9cbiAgcmVhZG9ubHkgdmFsdWU/OiBUO1xufVxuXG5leHBvcnQgdHlwZSB7UmVmfTtcblxuaW50ZXJmYWNlIFJlZkludGVybmFsIHtcbiAgdmFsdWU6IEVsZW1lbnQgfCB1bmRlZmluZWQ7XG59XG5cbi8vIFdoZW4gY2FsbGJhY2tzIGFyZSB1c2VkIGZvciByZWZzLCB0aGlzIG1hcCB0cmFja3MgdGhlIGxhc3QgdmFsdWUgdGhlIGNhbGxiYWNrXG4vLyB3YXMgY2FsbGVkIHdpdGgsIGZvciBlbnN1cmluZyBhIGRpcmVjdGl2ZSBkb2Vzbid0IGNsZWFyIHRoZSByZWYgaWYgdGhlIHJlZlxuLy8gaGFzIGFscmVhZHkgYmVlbiByZW5kZXJlZCB0byBhIG5ldyBzcG90XG5jb25zdCBsYXN0RWxlbWVudEZvckNhbGxiYWNrOiBXZWFrTWFwPEZ1bmN0aW9uLCBFbGVtZW50IHwgdW5kZWZpbmVkPiA9XG4gIG5ldyBXZWFrTWFwKCk7XG5cbmV4cG9ydCB0eXBlIFJlZk9yQ2FsbGJhY2sgPSBSZWYgfCAoKGVsOiBFbGVtZW50IHwgdW5kZWZpbmVkKSA9PiB2b2lkKTtcblxuY2xhc3MgUmVmRGlyZWN0aXZlIGV4dGVuZHMgQXN5bmNEaXJlY3RpdmUge1xuICBwcml2YXRlIF9lbGVtZW50PzogRWxlbWVudDtcbiAgcHJpdmF0ZSBfcmVmPzogUmVmT3JDYWxsYmFjaztcbiAgcHJpdmF0ZSBfY29udGV4dDogdW5rbm93bjtcblxuICByZW5kZXIoX3JlZjogUmVmT3JDYWxsYmFjaykge1xuICAgIHJldHVybiBub3RoaW5nO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IEVsZW1lbnRQYXJ0LCBbcmVmXTogUGFyYW1ldGVyczx0aGlzWydyZW5kZXInXT4pIHtcbiAgICBjb25zdCByZWZDaGFuZ2VkID0gcmVmICE9PSB0aGlzLl9yZWY7XG4gICAgaWYgKHJlZkNoYW5nZWQgJiYgdGhpcy5fcmVmICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIFRoZSByZWYgcGFzc2VkIHRvIHRoZSBkaXJlY3RpdmUgaGFzIGNoYW5nZWQ7XG4gICAgICAvLyB1bnNldCB0aGUgcHJldmlvdXMgcmVmJ3MgdmFsdWVcbiAgICAgIHRoaXMuX3VwZGF0ZVJlZlZhbHVlKHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIGlmIChyZWZDaGFuZ2VkIHx8IHRoaXMuX2xhc3RFbGVtZW50Rm9yUmVmICE9PSB0aGlzLl9lbGVtZW50KSB7XG4gICAgICAvLyBXZSBlaXRoZXIgZ290IGEgbmV3IHJlZiBvciB0aGlzIGlzIHRoZSBmaXJzdCByZW5kZXI7XG4gICAgICAvLyBzdG9yZSB0aGUgcmVmL2VsZW1lbnQgJiB1cGRhdGUgdGhlIHJlZiB2YWx1ZVxuICAgICAgdGhpcy5fcmVmID0gcmVmO1xuICAgICAgdGhpcy5fY29udGV4dCA9IHBhcnQub3B0aW9ucz8uaG9zdDtcbiAgICAgIHRoaXMuX3VwZGF0ZVJlZlZhbHVlKCh0aGlzLl9lbGVtZW50ID0gcGFydC5lbGVtZW50KSk7XG4gICAgfVxuICAgIHJldHVybiBub3RoaW5nO1xuICB9XG5cbiAgcHJpdmF0ZSBfdXBkYXRlUmVmVmFsdWUoZWxlbWVudDogRWxlbWVudCB8IHVuZGVmaW5lZCkge1xuICAgIGlmICh0eXBlb2YgdGhpcy5fcmVmID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAvLyBJZiB0aGUgY3VycmVudCByZWYgd2FzIGNhbGxlZCB3aXRoIGEgcHJldmlvdXMgdmFsdWUsIGNhbGwgd2l0aFxuICAgICAgLy8gYHVuZGVmaW5lZGA7IFdlIGRvIHRoaXMgdG8gZW5zdXJlIGNhbGxiYWNrcyBhcmUgY2FsbGVkIGluIGEgY29uc2lzdGVudFxuICAgICAgLy8gd2F5IHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciBhIHJlZiBtaWdodCBiZSBtb3ZpbmcgdXAgaW4gdGhlIHRyZWUgKGluXG4gICAgICAvLyB3aGljaCBjYXNlIGl0IHdvdWxkIG90aGVyd2lzZSBiZSBjYWxsZWQgd2l0aCB0aGUgbmV3IHZhbHVlIGJlZm9yZSB0aGVcbiAgICAgIC8vIHByZXZpb3VzIG9uZSB1bnNldHMgaXQpIGFuZCBkb3duIGluIHRoZSB0cmVlICh3aGVyZSBpdCB3b3VsZCBiZSB1bnNldFxuICAgICAgLy8gYmVmb3JlIGJlaW5nIHNldClcbiAgICAgIGlmIChsYXN0RWxlbWVudEZvckNhbGxiYWNrLmdldCh0aGlzLl9yZWYpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fcmVmLmNhbGwodGhpcy5fY29udGV4dCwgdW5kZWZpbmVkKTtcbiAgICAgIH1cbiAgICAgIGxhc3RFbGVtZW50Rm9yQ2FsbGJhY2suc2V0KHRoaXMuX3JlZiwgZWxlbWVudCk7XG4gICAgICAvLyBDYWxsIHRoZSByZWYgd2l0aCB0aGUgbmV3IGVsZW1lbnQgdmFsdWVcbiAgICAgIGlmIChlbGVtZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fcmVmLmNhbGwodGhpcy5fY29udGV4dCwgZWxlbWVudCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICh0aGlzLl9yZWYgYXMgUmVmSW50ZXJuYWwpIS52YWx1ZSA9IGVsZW1lbnQ7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXQgX2xhc3RFbGVtZW50Rm9yUmVmKCkge1xuICAgIHJldHVybiB0eXBlb2YgdGhpcy5fcmVmID09PSAnZnVuY3Rpb24nXG4gICAgICA/IGxhc3RFbGVtZW50Rm9yQ2FsbGJhY2suZ2V0KHRoaXMuX3JlZilcbiAgICAgIDogdGhpcy5fcmVmPy52YWx1ZTtcbiAgfVxuXG4gIG92ZXJyaWRlIGRpc2Nvbm5lY3RlZCgpIHtcbiAgICAvLyBPbmx5IGNsZWFyIHRoZSBib3ggaWYgb3VyIGVsZW1lbnQgaXMgc3RpbGwgdGhlIG9uZSBpbiBpdCAoaS5lLiBhbm90aGVyXG4gICAgLy8gZGlyZWN0aXZlIGluc3RhbmNlIGhhc24ndCByZW5kZXJlZCBpdHMgZWxlbWVudCB0byBpdCBiZWZvcmUgdXMpOyB0aGF0XG4gICAgLy8gb25seSBoYXBwZW5zIGluIHRoZSBldmVudCBvZiB0aGUgZGlyZWN0aXZlIGJlaW5nIGNsZWFyZWQgKG5vdCB2aWEgbWFudWFsXG4gICAgLy8gZGlzY29ubmVjdGlvbilcbiAgICBpZiAodGhpcy5fbGFzdEVsZW1lbnRGb3JSZWYgPT09IHRoaXMuX2VsZW1lbnQpIHtcbiAgICAgIHRoaXMuX3VwZGF0ZVJlZlZhbHVlKHVuZGVmaW5lZCk7XG4gICAgfVxuICB9XG5cbiAgb3ZlcnJpZGUgcmVjb25uZWN0ZWQoKSB7XG4gICAgLy8gSWYgd2Ugd2VyZSBtYW51YWxseSBkaXNjb25uZWN0ZWQsIHdlIGNhbiBzYWZlbHkgcHV0IG91ciBlbGVtZW50IGJhY2sgaW5cbiAgICAvLyB0aGUgYm94LCBzaW5jZSBubyByZW5kZXJpbmcgY291bGQgaGF2ZSBvY2N1cnJlZCB0byBjaGFuZ2UgaXRzIHN0YXRlXG4gICAgdGhpcy5fdXBkYXRlUmVmVmFsdWUodGhpcy5fZWxlbWVudCk7XG4gIH1cbn1cblxuLyoqXG4gKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIFJlZiBvYmplY3Qgb3IgY2FsbHMgYSByZWYgY2FsbGJhY2sgd2l0aCB0aGUgZWxlbWVudCBpdCdzXG4gKiBib3VuZCB0by5cbiAqXG4gKiBBIFJlZiBvYmplY3QgYWN0cyBhcyBhIGNvbnRhaW5lciBmb3IgYSByZWZlcmVuY2UgdG8gYW4gZWxlbWVudC4gQSByZWZcbiAqIGNhbGxiYWNrIGlzIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhbiBlbGVtZW50IGFzIGl0cyBvbmx5IGFyZ3VtZW50LlxuICpcbiAqIFRoZSByZWYgZGlyZWN0aXZlIHNldHMgdGhlIHZhbHVlIG9mIHRoZSBSZWYgb2JqZWN0IG9yIGNhbGxzIHRoZSByZWYgY2FsbGJhY2tcbiAqIGR1cmluZyByZW5kZXJpbmcsIGlmIHRoZSByZWZlcmVuY2VkIGVsZW1lbnQgY2hhbmdlZC5cbiAqXG4gKiBOb3RlOiBJZiBhIHJlZiBjYWxsYmFjayBpcyByZW5kZXJlZCB0byBhIGRpZmZlcmVudCBlbGVtZW50IHBvc2l0aW9uIG9yIGlzXG4gKiByZW1vdmVkIGluIGEgc3Vic2VxdWVudCByZW5kZXIsIGl0IHdpbGwgZmlyc3QgYmUgY2FsbGVkIHdpdGggYHVuZGVmaW5lZGAsXG4gKiBmb2xsb3dlZCBieSBhbm90aGVyIGNhbGwgd2l0aCB0aGUgbmV3IGVsZW1lbnQgaXQgd2FzIHJlbmRlcmVkIHRvIChpZiBhbnkpLlxuICpcbiAqIGBgYGpzXG4gKiAvLyBVc2luZyBSZWYgb2JqZWN0XG4gKiBjb25zdCBpbnB1dFJlZiA9IGNyZWF0ZVJlZigpO1xuICogcmVuZGVyKGh0bWxgPGlucHV0ICR7cmVmKGlucHV0UmVmKX0+YCwgY29udGFpbmVyKTtcbiAqIGlucHV0UmVmLnZhbHVlLmZvY3VzKCk7XG4gKlxuICogLy8gVXNpbmcgY2FsbGJhY2tcbiAqIGNvbnN0IGNhbGxiYWNrID0gKGlucHV0RWxlbWVudCkgPT4gaW5wdXRFbGVtZW50LmZvY3VzKCk7XG4gKiByZW5kZXIoaHRtbGA8aW5wdXQgJHtyZWYoY2FsbGJhY2spfT5gLCBjb250YWluZXIpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCByZWYgPSBkaXJlY3RpdmUoUmVmRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtSZWZEaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjEgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbi8vIE5vdGUsIHRoaXMgbW9kdWxlIGlzIG5vdCBpbmNsdWRlZCBpbiBwYWNrYWdlIGV4cG9ydHMgc28gdGhhdCBpdCdzIHByaXZhdGUgdG9cbi8vIG91ciBmaXJzdC1wYXJ0eSBkaXJlY3RpdmVzLiBJZiBpdCBlbmRzIHVwIGJlaW5nIHVzZWZ1bCwgd2UgY2FuIG9wZW4gaXQgdXAgYW5kXG4vLyBleHBvcnQgaXQuXG5cbi8qKlxuICogSGVscGVyIHRvIGl0ZXJhdGUgYW4gQXN5bmNJdGVyYWJsZSBpbiBpdHMgb3duIGNsb3N1cmUuXG4gKiBAcGFyYW0gaXRlcmFibGUgVGhlIGl0ZXJhYmxlIHRvIGl0ZXJhdGVcbiAqIEBwYXJhbSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgdG8gY2FsbCBmb3IgZWFjaCB2YWx1ZS4gSWYgdGhlIGNhbGxiYWNrIHJldHVybnNcbiAqIGBmYWxzZWAsIHRoZSBsb29wIHdpbGwgYmUgYnJva2VuLlxuICovXG5leHBvcnQgY29uc3QgZm9yQXdhaXRPZiA9IGFzeW5jIDxUPihcbiAgaXRlcmFibGU6IEFzeW5jSXRlcmFibGU8VD4sXG4gIGNhbGxiYWNrOiAodmFsdWU6IFQpID0+IFByb21pc2U8Ym9vbGVhbj5cbikgPT4ge1xuICBmb3IgYXdhaXQgKGNvbnN0IHYgb2YgaXRlcmFibGUpIHtcbiAgICBpZiAoKGF3YWl0IGNhbGxiYWNrKHYpKSA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogSG9sZHMgYSByZWZlcmVuY2UgdG8gYW4gaW5zdGFuY2UgdGhhdCBjYW4gYmUgZGlzY29ubmVjdGVkIGFuZCByZWNvbm5lY3RlZCxcbiAqIHNvIHRoYXQgYSBjbG9zdXJlIG92ZXIgdGhlIHJlZiAoZS5nLiBpbiBhIHRoZW4gZnVuY3Rpb24gdG8gYSBwcm9taXNlKSBkb2VzXG4gKiBub3Qgc3Ryb25nbHkgaG9sZCBhIHJlZiB0byB0aGUgaW5zdGFuY2UuIEFwcHJveGltYXRlcyBhIFdlYWtSZWYgYnV0IG11c3RcbiAqIGJlIG1hbnVhbGx5IGNvbm5lY3RlZCAmIGRpc2Nvbm5lY3RlZCB0byB0aGUgYmFja2luZyBpbnN0YW5jZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFBzZXVkb1dlYWtSZWY8VD4ge1xuICBwcml2YXRlIF9yZWY/OiBUO1xuICBjb25zdHJ1Y3RvcihyZWY6IFQpIHtcbiAgICB0aGlzLl9yZWYgPSByZWY7XG4gIH1cbiAgLyoqXG4gICAqIERpc2Fzc29jaWF0ZXMgdGhlIHJlZiB3aXRoIHRoZSBiYWNraW5nIGluc3RhbmNlLlxuICAgKi9cbiAgZGlzY29ubmVjdCgpIHtcbiAgICB0aGlzLl9yZWYgPSB1bmRlZmluZWQ7XG4gIH1cbiAgLyoqXG4gICAqIFJlYXNzb2NpYXRlcyB0aGUgcmVmIHdpdGggdGhlIGJhY2tpbmcgaW5zdGFuY2UuXG4gICAqL1xuICByZWNvbm5lY3QocmVmOiBUKSB7XG4gICAgdGhpcy5fcmVmID0gcmVmO1xuICB9XG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgdGhlIGJhY2tpbmcgaW5zdGFuY2UgKHdpbGwgYmUgdW5kZWZpbmVkIHdoZW4gZGlzY29ubmVjdGVkKVxuICAgKi9cbiAgZGVyZWYoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3JlZjtcbiAgfVxufVxuXG4vKipcbiAqIEEgaGVscGVyIHRvIHBhdXNlIGFuZCByZXN1bWUgd2FpdGluZyBvbiBhIGNvbmRpdGlvbiBpbiBhbiBhc3luYyBmdW5jdGlvblxuICovXG5leHBvcnQgY2xhc3MgUGF1c2VyIHtcbiAgcHJpdmF0ZSBfcHJvbWlzZT86IFByb21pc2U8dm9pZD4gPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX3Jlc29sdmU/OiAoKSA9PiB2b2lkID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogV2hlbiBwYXVzZWQsIHJldHVybnMgYSBwcm9taXNlIHRvIGJlIGF3YWl0ZWQ7IHdoZW4gdW5wYXVzZWQsIHJldHVybnNcbiAgICogdW5kZWZpbmVkLiBOb3RlIHRoYXQgaW4gdGhlIG1pY3JvdGFzayBiZXR3ZWVuIHRoZSBwYXVzZXIgYmVpbmcgcmVzdW1lZFxuICAgKiBhbiBhbiBhd2FpdCBvZiB0aGlzIHByb21pc2UgcmVzb2x2aW5nLCB0aGUgcGF1c2VyIGNvdWxkIGJlIHBhdXNlZCBhZ2FpbixcbiAgICogaGVuY2UgY2FsbGVycyBzaG91bGQgY2hlY2sgdGhlIHByb21pc2UgaW4gYSBsb29wIHdoZW4gYXdhaXRpbmcuXG4gICAqIEByZXR1cm5zIEEgcHJvbWlzZSB0byBiZSBhd2FpdGVkIHdoZW4gcGF1c2VkIG9yIHVuZGVmaW5lZFxuICAgKi9cbiAgZ2V0KCkge1xuICAgIHJldHVybiB0aGlzLl9wcm9taXNlO1xuICB9XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgcHJvbWlzZSB0byBiZSBhd2FpdGVkXG4gICAqL1xuICBwYXVzZSgpIHtcbiAgICB0aGlzLl9wcm9taXNlID8/PSBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gKHRoaXMuX3Jlc29sdmUgPSByZXNvbHZlKSk7XG4gIH1cbiAgLyoqXG4gICAqIFJlc29sdmVzIHRoZSBwcm9taXNlIHdoaWNoIG1heSBiZSBhd2FpdGVkXG4gICAqL1xuICByZXN1bWUoKSB7XG4gICAgdGhpcy5fcmVzb2x2ZT8uKCk7XG4gICAgdGhpcy5fcHJvbWlzZSA9IHRoaXMuX3Jlc29sdmUgPSB1bmRlZmluZWQ7XG4gIH1cbn1cbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0NoaWxkUGFydCwgbm9DaGFuZ2V9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7ZGlyZWN0aXZlLCBEaXJlY3RpdmVQYXJhbWV0ZXJzfSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtBc3luY0RpcmVjdGl2ZX0gZnJvbSAnLi4vYXN5bmMtZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7UGF1c2VyLCBQc2V1ZG9XZWFrUmVmLCBmb3JBd2FpdE9mfSBmcm9tICcuL3ByaXZhdGUtYXN5bmMtaGVscGVycy5qcyc7XG5cbnR5cGUgTWFwcGVyPFQ+ID0gKHY6IFQsIGluZGV4PzogbnVtYmVyKSA9PiB1bmtub3duO1xuXG5leHBvcnQgY2xhc3MgQXN5bmNSZXBsYWNlRGlyZWN0aXZlIGV4dGVuZHMgQXN5bmNEaXJlY3RpdmUge1xuICBwcml2YXRlIF9fdmFsdWU/OiBBc3luY0l0ZXJhYmxlPHVua25vd24+O1xuICBwcml2YXRlIF9fd2Vha1RoaXMgPSBuZXcgUHNldWRvV2Vha1JlZih0aGlzKTtcbiAgcHJpdmF0ZSBfX3BhdXNlciA9IG5ldyBQYXVzZXIoKTtcblxuICAvLyBAdHMtZXhwZWN0LWVycm9yIHZhbHVlIG5vdCB1c2VkLCBidXQgd2Ugd2FudCBhIG5pY2UgcGFyYW1ldGVyIGZvciBkb2NzXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgcmVuZGVyPFQ+KHZhbHVlOiBBc3luY0l0ZXJhYmxlPFQ+LCBfbWFwcGVyPzogTWFwcGVyPFQ+KSB7XG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKFxuICAgIF9wYXJ0OiBDaGlsZFBhcnQsXG4gICAgW3ZhbHVlLCBtYXBwZXJdOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+XG4gICkge1xuICAgIC8vIElmIG91ciBpbml0aWFsIHJlbmRlciBvY2N1cnMgd2hpbGUgZGlzY29ubmVjdGVkLCBlbnN1cmUgdGhhdCB0aGUgcGF1c2VyXG4gICAgLy8gYW5kIHdlYWtUaGlzIGFyZSBpbiB0aGUgZGlzY29ubmVjdGVkIHN0YXRlXG4gICAgaWYgKCF0aGlzLmlzQ29ubmVjdGVkKSB7XG4gICAgICB0aGlzLmRpc2Nvbm5lY3RlZCgpO1xuICAgIH1cbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IHNldCB1cCB0aGlzIHBhcnRpY3VsYXIgaXRlcmFibGUsIHdlIGRvbid0IG5lZWRcbiAgICAvLyB0byBkbyBhbnl0aGluZy5cbiAgICBpZiAodmFsdWUgPT09IHRoaXMuX192YWx1ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9fdmFsdWUgPSB2YWx1ZTtcbiAgICBsZXQgaSA9IDA7XG4gICAgY29uc3Qge19fd2Vha1RoaXM6IHdlYWtUaGlzLCBfX3BhdXNlcjogcGF1c2VyfSA9IHRoaXM7XG4gICAgLy8gTm90ZSwgdGhlIGNhbGxiYWNrIGF2b2lkcyBjbG9zaW5nIG92ZXIgYHRoaXNgIHNvIHRoYXQgdGhlIGRpcmVjdGl2ZVxuICAgIC8vIGNhbiBiZSBnYydlZCBiZWZvcmUgdGhlIHByb21pc2UgcmVzb2x2ZXM7IGluc3RlYWQgYHRoaXNgIGlzIHJldHJpZXZlZFxuICAgIC8vIGZyb20gYHdlYWtUaGlzYCwgd2hpY2ggY2FuIGJyZWFrIHRoZSBoYXJkIHJlZmVyZW5jZSBpbiB0aGUgY2xvc3VyZSB3aGVuXG4gICAgLy8gdGhlIGRpcmVjdGl2ZSBkaXNjb25uZWN0c1xuICAgIGZvckF3YWl0T2YodmFsdWUsIGFzeW5jICh2OiB1bmtub3duKSA9PiB7XG4gICAgICAvLyBUaGUgd2hpbGUgbG9vcCBoZXJlIGhhbmRsZXMgdGhlIGNhc2UgdGhhdCB0aGUgY29ubmVjdGlvbiBzdGF0ZVxuICAgICAgLy8gdGhyYXNoZXMsIGNhdXNpbmcgdGhlIHBhdXNlciB0byByZXN1bWUgYW5kIHRoZW4gZ2V0IHJlLXBhdXNlZFxuICAgICAgd2hpbGUgKHBhdXNlci5nZXQoKSkge1xuICAgICAgICBhd2FpdCBwYXVzZXIuZ2V0KCk7XG4gICAgICB9XG4gICAgICAvLyBJZiB0aGUgY2FsbGJhY2sgZ2V0cyBoZXJlIGFuZCB0aGVyZSBpcyBubyBgdGhpc2AsIGl0IG1lYW5zIHRoYXQgdGhlXG4gICAgICAvLyBkaXJlY3RpdmUgaGFzIGJlZW4gZGlzY29ubmVjdGVkIGFuZCBnYXJiYWdlIGNvbGxlY3RlZCBhbmQgd2UgZG9uJ3RcbiAgICAgIC8vIG5lZWQgdG8gZG8gYW55dGhpbmcgZWxzZVxuICAgICAgY29uc3QgX3RoaXMgPSB3ZWFrVGhpcy5kZXJlZigpO1xuICAgICAgaWYgKF90aGlzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gQ2hlY2sgdG8gbWFrZSBzdXJlIHRoYXQgdmFsdWUgaXMgdGhlIHN0aWxsIHRoZSBjdXJyZW50IHZhbHVlIG9mXG4gICAgICAgIC8vIHRoZSBwYXJ0LCBhbmQgaWYgbm90IGJhaWwgYmVjYXVzZSBhIG5ldyB2YWx1ZSBvd25zIHRoaXMgcGFydFxuICAgICAgICBpZiAoX3RoaXMuX192YWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBcyBhIGNvbnZlbmllbmNlLCBiZWNhdXNlIGZ1bmN0aW9uYWwtcHJvZ3JhbW1pbmctc3R5bGVcbiAgICAgICAgLy8gdHJhbnNmb3JtcyBvZiBpdGVyYWJsZXMgYW5kIGFzeW5jIGl0ZXJhYmxlcyByZXF1aXJlcyBhIGxpYnJhcnksXG4gICAgICAgIC8vIHdlIGFjY2VwdCBhIG1hcHBlciBmdW5jdGlvbi4gVGhpcyBpcyBlc3BlY2lhbGx5IGNvbnZlbmllbnQgZm9yXG4gICAgICAgIC8vIHJlbmRlcmluZyBhIHRlbXBsYXRlIGZvciBlYWNoIGl0ZW0uXG4gICAgICAgIGlmIChtYXBwZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHYgPSBtYXBwZXIodiwgaSk7XG4gICAgICAgIH1cblxuICAgICAgICBfdGhpcy5jb21taXRWYWx1ZSh2LCBpKTtcbiAgICAgICAgaSsrO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG5cbiAgLy8gT3ZlcnJpZGUgcG9pbnQgZm9yIEFzeW5jQXBwZW5kIHRvIGFwcGVuZCByYXRoZXIgdGhhbiByZXBsYWNlXG4gIHByb3RlY3RlZCBjb21taXRWYWx1ZSh2YWx1ZTogdW5rbm93biwgX2luZGV4OiBudW1iZXIpIHtcbiAgICB0aGlzLnNldFZhbHVlKHZhbHVlKTtcbiAgfVxuXG4gIG92ZXJyaWRlIGRpc2Nvbm5lY3RlZCgpIHtcbiAgICB0aGlzLl9fd2Vha1RoaXMuZGlzY29ubmVjdCgpO1xuICAgIHRoaXMuX19wYXVzZXIucGF1c2UoKTtcbiAgfVxuXG4gIG92ZXJyaWRlIHJlY29ubmVjdGVkKCkge1xuICAgIHRoaXMuX193ZWFrVGhpcy5yZWNvbm5lY3QodGhpcyk7XG4gICAgdGhpcy5fX3BhdXNlci5yZXN1bWUoKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgZGlyZWN0aXZlIHRoYXQgcmVuZGVycyB0aGUgaXRlbXMgb2YgYW4gYXN5bmMgaXRlcmFibGVbMV0sIHJlcGxhY2luZ1xuICogcHJldmlvdXMgdmFsdWVzIHdpdGggbmV3IHZhbHVlcywgc28gdGhhdCBvbmx5IG9uZSB2YWx1ZSBpcyBldmVyIHJlbmRlcmVkXG4gKiBhdCBhIHRpbWUuIFRoaXMgZGlyZWN0aXZlIG1heSBiZSB1c2VkIGluIGFueSBleHByZXNzaW9uIHR5cGUuXG4gKlxuICogQXN5bmMgaXRlcmFibGVzIGFyZSBvYmplY3RzIHdpdGggYSBgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXWAgbWV0aG9kLCB3aGljaFxuICogcmV0dXJucyBhbiBpdGVyYXRvciB3aG8ncyBgbmV4dCgpYCBtZXRob2QgcmV0dXJucyBhIFByb21pc2UuIFdoZW4gYSBuZXdcbiAqIHZhbHVlIGlzIGF2YWlsYWJsZSwgdGhlIFByb21pc2UgcmVzb2x2ZXMgYW5kIHRoZSB2YWx1ZSBpcyByZW5kZXJlZCB0byB0aGVcbiAqIFBhcnQgY29udHJvbGxlZCBieSB0aGUgZGlyZWN0aXZlLiBJZiBhbm90aGVyIHZhbHVlIG90aGVyIHRoYW4gdGhpc1xuICogZGlyZWN0aXZlIGhhcyBiZWVuIHNldCBvbiB0aGUgUGFydCwgdGhlIGl0ZXJhYmxlIHdpbGwgbm8gbG9uZ2VyIGJlIGxpc3RlbmVkXG4gKiB0byBhbmQgbmV3IHZhbHVlcyB3b24ndCBiZSB3cml0dGVuIHRvIHRoZSBQYXJ0LlxuICpcbiAqIFsxXTogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvU3RhdGVtZW50cy9mb3ItYXdhaXQuLi5vZlxuICpcbiAqIEBwYXJhbSB2YWx1ZSBBbiBhc3luYyBpdGVyYWJsZVxuICogQHBhcmFtIG1hcHBlciBBbiBvcHRpb25hbCBmdW5jdGlvbiB0aGF0IG1hcHMgZnJvbSAodmFsdWUsIGluZGV4KSB0byBhbm90aGVyXG4gKiAgICAgdmFsdWUuIFVzZWZ1bCBmb3IgZ2VuZXJhdGluZyB0ZW1wbGF0ZXMgZm9yIGVhY2ggaXRlbSBpbiB0aGUgaXRlcmFibGUuXG4gKi9cbmV4cG9ydCBjb25zdCBhc3luY1JlcGxhY2UgPSBkaXJlY3RpdmUoQXN5bmNSZXBsYWNlRGlyZWN0aXZlKTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0NoaWxkUGFydH0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmVQYXJhbWV0ZXJzLFxuICBQYXJ0SW5mbyxcbiAgUGFydFR5cGUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge0FzeW5jUmVwbGFjZURpcmVjdGl2ZX0gZnJvbSAnLi9hc3luYy1yZXBsYWNlLmpzJztcbmltcG9ydCB7XG4gIGNsZWFyUGFydCxcbiAgaW5zZXJ0UGFydCxcbiAgc2V0Q2hpbGRQYXJ0VmFsdWUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcblxuY2xhc3MgQXN5bmNBcHBlbmREaXJlY3RpdmUgZXh0ZW5kcyBBc3luY1JlcGxhY2VEaXJlY3RpdmUge1xuICBwcml2YXRlIF9fY2hpbGRQYXJ0ITogQ2hpbGRQYXJ0O1xuXG4gIC8vIE92ZXJyaWRlIEFzeW5jUmVwbGFjZSB0byBuYXJyb3cgdGhlIGFsbG93ZWQgcGFydCB0eXBlIHRvIENoaWxkUGFydCBvbmx5XG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAocGFydEluZm8udHlwZSAhPT0gUGFydFR5cGUuQ0hJTEQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignYXN5bmNBcHBlbmQgY2FuIG9ubHkgYmUgdXNlZCBpbiBjaGlsZCBleHByZXNzaW9ucycpO1xuICAgIH1cbiAgfVxuXG4gIC8vIE92ZXJyaWRlIEFzeW5jUmVwbGFjZSB0byBzYXZlIHRoZSBwYXJ0IHNpbmNlIHdlIG5lZWQgdG8gYXBwZW5kIGludG8gaXRcbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IENoaWxkUGFydCwgcGFyYW1zOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgdGhpcy5fX2NoaWxkUGFydCA9IHBhcnQ7XG4gICAgcmV0dXJuIHN1cGVyLnVwZGF0ZShwYXJ0LCBwYXJhbXMpO1xuICB9XG5cbiAgLy8gT3ZlcnJpZGUgQXN5bmNSZXBsYWNlIHRvIGFwcGVuZCByYXRoZXIgdGhhbiByZXBsYWNlXG4gIHByb3RlY3RlZCBvdmVycmlkZSBjb21taXRWYWx1ZSh2YWx1ZTogdW5rbm93biwgaW5kZXg6IG51bWJlcikge1xuICAgIC8vIFdoZW4gd2UgZ2V0IHRoZSBmaXJzdCB2YWx1ZSwgY2xlYXIgdGhlIHBhcnQuIFRoaXMgbGV0cyB0aGVcbiAgICAvLyBwcmV2aW91cyB2YWx1ZSBkaXNwbGF5IHVudGlsIHdlIGNhbiByZXBsYWNlIGl0LlxuICAgIGlmIChpbmRleCA9PT0gMCkge1xuICAgICAgY2xlYXJQYXJ0KHRoaXMuX19jaGlsZFBhcnQpO1xuICAgIH1cbiAgICAvLyBDcmVhdGUgYW5kIGluc2VydCBhIG5ldyBwYXJ0IGFuZCBzZXQgaXRzIHZhbHVlIHRvIHRoZSBuZXh0IHZhbHVlXG4gICAgY29uc3QgbmV3UGFydCA9IGluc2VydFBhcnQodGhpcy5fX2NoaWxkUGFydCk7XG4gICAgc2V0Q2hpbGRQYXJ0VmFsdWUobmV3UGFydCwgdmFsdWUpO1xuICB9XG59XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCByZW5kZXJzIHRoZSBpdGVtcyBvZiBhbiBhc3luYyBpdGVyYWJsZVsxXSwgYXBwZW5kaW5nIG5ld1xuICogdmFsdWVzIGFmdGVyIHByZXZpb3VzIHZhbHVlcywgc2ltaWxhciB0byB0aGUgYnVpbHQtaW4gc3VwcG9ydCBmb3IgaXRlcmFibGVzLlxuICogVGhpcyBkaXJlY3RpdmUgaXMgdXNhYmxlIG9ubHkgaW4gY2hpbGQgZXhwcmVzc2lvbnMuXG4gKlxuICogQXN5bmMgaXRlcmFibGVzIGFyZSBvYmplY3RzIHdpdGggYSBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdIG1ldGhvZCwgd2hpY2hcbiAqIHJldHVybnMgYW4gaXRlcmF0b3Igd2hvJ3MgYG5leHQoKWAgbWV0aG9kIHJldHVybnMgYSBQcm9taXNlLiBXaGVuIGEgbmV3XG4gKiB2YWx1ZSBpcyBhdmFpbGFibGUsIHRoZSBQcm9taXNlIHJlc29sdmVzIGFuZCB0aGUgdmFsdWUgaXMgYXBwZW5kZWQgdG8gdGhlXG4gKiBQYXJ0IGNvbnRyb2xsZWQgYnkgdGhlIGRpcmVjdGl2ZS4gSWYgYW5vdGhlciB2YWx1ZSBvdGhlciB0aGFuIHRoaXNcbiAqIGRpcmVjdGl2ZSBoYXMgYmVlbiBzZXQgb24gdGhlIFBhcnQsIHRoZSBpdGVyYWJsZSB3aWxsIG5vIGxvbmdlciBiZSBsaXN0ZW5lZFxuICogdG8gYW5kIG5ldyB2YWx1ZXMgd29uJ3QgYmUgd3JpdHRlbiB0byB0aGUgUGFydC5cbiAqXG4gKiBbMV06IGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL1N0YXRlbWVudHMvZm9yLWF3YWl0Li4ub2ZcbiAqXG4gKiBAcGFyYW0gdmFsdWUgQW4gYXN5bmMgaXRlcmFibGVcbiAqIEBwYXJhbSBtYXBwZXIgQW4gb3B0aW9uYWwgZnVuY3Rpb24gdGhhdCBtYXBzIGZyb20gKHZhbHVlLCBpbmRleCkgdG8gYW5vdGhlclxuICogICAgIHZhbHVlLiBVc2VmdWwgZm9yIGdlbmVyYXRpbmcgdGVtcGxhdGVzIGZvciBlYWNoIGl0ZW0gaW4gdGhlIGl0ZXJhYmxlLlxuICovXG5leHBvcnQgY29uc3QgYXN5bmNBcHBlbmQgPSBkaXJlY3RpdmUoQXN5bmNBcHBlbmREaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge0FzeW5jQXBwZW5kRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge1xuICBUZW1wbGF0ZVJlc3VsdCxcbiAgQ2hpbGRQYXJ0LFxuICBSb290UGFydCxcbiAgcmVuZGVyLFxuICBub3RoaW5nLFxufSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBkaXJlY3RpdmUsXG4gIERpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbiAgUGFydEluZm8sXG59IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge1xuICBjbGVhclBhcnQsXG4gIGdldENvbW1pdHRlZFZhbHVlLFxuICBpbnNlcnRQYXJ0LFxuICBpc1RlbXBsYXRlUmVzdWx0LFxuICBzZXRDb21taXR0ZWRWYWx1ZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuXG5jbGFzcyBDYWNoZURpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX3RlbXBsYXRlQ2FjaGUgPSBuZXcgV2Vha01hcDxUZW1wbGF0ZVN0cmluZ3NBcnJheSwgUm9vdFBhcnQ+KCk7XG4gIHByaXZhdGUgX3ZhbHVlPzogVGVtcGxhdGVSZXN1bHQ7XG5cbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICB9XG5cbiAgcmVuZGVyKHY6IHVua25vd24pIHtcbiAgICAvLyBSZXR1cm4gYW4gYXJyYXkgb2YgdGhlIHZhbHVlIHRvIGluZHVjZSBsaXQtaHRtbCB0byBjcmVhdGUgYSBDaGlsZFBhcnRcbiAgICAvLyBmb3IgdGhlIHZhbHVlIHRoYXQgd2UgY2FuIG1vdmUgaW50byB0aGUgY2FjaGUuXG4gICAgcmV0dXJuIFt2XTtcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShjb250YWluZXJQYXJ0OiBDaGlsZFBhcnQsIFt2XTogRGlyZWN0aXZlUGFyYW1ldGVyczx0aGlzPikge1xuICAgIC8vIElmIHRoZSBwcmV2aW91cyB2YWx1ZSBpcyBhIFRlbXBsYXRlUmVzdWx0IGFuZCB0aGUgbmV3IHZhbHVlIGlzIG5vdCxcbiAgICAvLyBvciBpcyBhIGRpZmZlcmVudCBUZW1wbGF0ZSBhcyB0aGUgcHJldmlvdXMgdmFsdWUsIG1vdmUgdGhlIGNoaWxkIHBhcnRcbiAgICAvLyBpbnRvIHRoZSBjYWNoZS5cbiAgICBpZiAoXG4gICAgICBpc1RlbXBsYXRlUmVzdWx0KHRoaXMuX3ZhbHVlKSAmJlxuICAgICAgKCFpc1RlbXBsYXRlUmVzdWx0KHYpIHx8IHRoaXMuX3ZhbHVlLnN0cmluZ3MgIT09IHYuc3RyaW5ncylcbiAgICApIHtcbiAgICAgIC8vIFRoaXMgaXMgYWx3YXlzIGFuIGFycmF5IGJlY2F1c2Ugd2UgcmV0dXJuIFt2XSBpbiByZW5kZXIoKVxuICAgICAgY29uc3QgcGFydFZhbHVlID0gZ2V0Q29tbWl0dGVkVmFsdWUoY29udGFpbmVyUGFydCkgYXMgQXJyYXk8Q2hpbGRQYXJ0PjtcbiAgICAgIGNvbnN0IGNoaWxkUGFydCA9IHBhcnRWYWx1ZS5wb3AoKSE7XG4gICAgICBsZXQgY2FjaGVkQ29udGFpbmVyUGFydCA9IHRoaXMuX3RlbXBsYXRlQ2FjaGUuZ2V0KHRoaXMuX3ZhbHVlLnN0cmluZ3MpO1xuICAgICAgaWYgKGNhY2hlZENvbnRhaW5lclBhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb25zdCBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgY2FjaGVkQ29udGFpbmVyUGFydCA9IHJlbmRlcihub3RoaW5nLCBmcmFnbWVudCk7XG4gICAgICAgIGNhY2hlZENvbnRhaW5lclBhcnQuc2V0Q29ubmVjdGVkKGZhbHNlKTtcbiAgICAgICAgdGhpcy5fdGVtcGxhdGVDYWNoZS5zZXQodGhpcy5fdmFsdWUuc3RyaW5ncywgY2FjaGVkQ29udGFpbmVyUGFydCk7XG4gICAgICB9XG4gICAgICAvLyBNb3ZlIGludG8gY2FjaGVcbiAgICAgIHNldENvbW1pdHRlZFZhbHVlKGNhY2hlZENvbnRhaW5lclBhcnQsIFtjaGlsZFBhcnRdKTtcbiAgICAgIGluc2VydFBhcnQoY2FjaGVkQ29udGFpbmVyUGFydCwgdW5kZWZpbmVkLCBjaGlsZFBhcnQpO1xuICAgIH1cbiAgICAvLyBJZiB0aGUgbmV3IHZhbHVlIGlzIGEgVGVtcGxhdGVSZXN1bHQgYW5kIHRoZSBwcmV2aW91cyB2YWx1ZSBpcyBub3QsXG4gICAgLy8gb3IgaXMgYSBkaWZmZXJlbnQgVGVtcGxhdGUgYXMgdGhlIHByZXZpb3VzIHZhbHVlLCByZXN0b3JlIHRoZSBjaGlsZFxuICAgIC8vIHBhcnQgZnJvbSB0aGUgY2FjaGUuXG4gICAgaWYgKGlzVGVtcGxhdGVSZXN1bHQodikpIHtcbiAgICAgIGlmICghaXNUZW1wbGF0ZVJlc3VsdCh0aGlzLl92YWx1ZSkgfHwgdGhpcy5fdmFsdWUuc3RyaW5ncyAhPT0gdi5zdHJpbmdzKSB7XG4gICAgICAgIGNvbnN0IGNhY2hlZENvbnRhaW5lclBhcnQgPSB0aGlzLl90ZW1wbGF0ZUNhY2hlLmdldCh2LnN0cmluZ3MpO1xuICAgICAgICBpZiAoY2FjaGVkQ29udGFpbmVyUGFydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gTW92ZSB0aGUgY2FjaGVkIHBhcnQgYmFjayBpbnRvIHRoZSBjb250YWluZXIgcGFydCB2YWx1ZVxuICAgICAgICAgIGNvbnN0IHBhcnRWYWx1ZSA9IGdldENvbW1pdHRlZFZhbHVlKFxuICAgICAgICAgICAgY2FjaGVkQ29udGFpbmVyUGFydFxuICAgICAgICAgICkgYXMgQXJyYXk8Q2hpbGRQYXJ0PjtcbiAgICAgICAgICBjb25zdCBjYWNoZWRQYXJ0ID0gcGFydFZhbHVlLnBvcCgpITtcbiAgICAgICAgICAvLyBNb3ZlIGNhY2hlZCBwYXJ0IGJhY2sgaW50byBET01cbiAgICAgICAgICBjbGVhclBhcnQoY29udGFpbmVyUGFydCk7XG4gICAgICAgICAgaW5zZXJ0UGFydChjb250YWluZXJQYXJ0LCB1bmRlZmluZWQsIGNhY2hlZFBhcnQpO1xuICAgICAgICAgIHNldENvbW1pdHRlZFZhbHVlKGNvbnRhaW5lclBhcnQsIFtjYWNoZWRQYXJ0XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuX3ZhbHVlID0gdjtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fdmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlbmRlcih2KTtcbiAgfVxufVxuXG4vKipcbiAqIEVuYWJsZXMgZmFzdCBzd2l0Y2hpbmcgYmV0d2VlbiBtdWx0aXBsZSB0ZW1wbGF0ZXMgYnkgY2FjaGluZyB0aGUgRE9NIG5vZGVzXG4gKiBhbmQgVGVtcGxhdGVJbnN0YW5jZXMgcHJvZHVjZWQgYnkgdGhlIHRlbXBsYXRlcy5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBsZXQgY2hlY2tlZCA9IGZhbHNlO1xuICpcbiAqIGh0bWxgXG4gKiAgICR7Y2FjaGUoY2hlY2tlZCA/IGh0bWxgaW5wdXQgaXMgY2hlY2tlZGAgOiBodG1sYGlucHV0IGlzIG5vdCBjaGVja2VkYCl9XG4gKiBgXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGNhY2hlID0gZGlyZWN0aXZlKENhY2hlRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtDYWNoZURpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLyoqXG4gKiBDaG9vc2VzIGFuZCBldmFsdWF0ZXMgYSB0ZW1wbGF0ZSBmdW5jdGlvbiBmcm9tIGEgbGlzdCBiYXNlZCBvbiBtYXRjaGluZ1xuICogdGhlIGdpdmVuIGB2YWx1ZWAgdG8gYSBjYXNlLlxuICpcbiAqIENhc2VzIGFyZSBzdHJ1Y3R1cmVkIGFzIGBbY2FzZVZhbHVlLCBmdW5jXWAuIGB2YWx1ZWAgaXMgbWF0Y2hlZCB0b1xuICogYGNhc2VWYWx1ZWAgYnkgc3RyaWN0IGVxdWFsaXR5LiBUaGUgZmlyc3QgbWF0Y2ggaXMgc2VsZWN0ZWQuIENhc2UgdmFsdWVzXG4gKiBjYW4gYmUgb2YgYW55IHR5cGUgaW5jbHVkaW5nIHByaW1pdGl2ZXMsIG9iamVjdHMsIGFuZCBzeW1ib2xzLlxuICpcbiAqIFRoaXMgaXMgc2ltaWxhciB0byBhIHN3aXRjaCBzdGF0ZW1lbnQsIGJ1dCBhcyBhbiBleHByZXNzaW9uIGFuZCB3aXRob3V0XG4gKiBmYWxsdGhyb3VnaC5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiByZW5kZXIoKSB7XG4gKiAgIHJldHVybiBodG1sYFxuICogICAgICR7Y2hvb3NlKHRoaXMuc2VjdGlvbiwgW1xuICogICAgICAgWydob21lJywgKCkgPT4gaHRtbGA8aDE+SG9tZTwvaDE+YF0sXG4gKiAgICAgICBbJ2Fib3V0JywgKCkgPT4gaHRtbGA8aDE+QWJvdXQ8L2gxPmBdXG4gKiAgICAgXSxcbiAqICAgICAoKSA9PiBodG1sYDxoMT5FcnJvcjwvaDE+YCl9XG4gKiAgIGA7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGNob29zZSA9IDxULCBWPihcbiAgdmFsdWU6IFQsXG4gIGNhc2VzOiBBcnJheTxbVCwgKCkgPT4gVl0+LFxuICBkZWZhdWx0Q2FzZT86ICgpID0+IFZcbikgPT4ge1xuICBmb3IgKGNvbnN0IGMgb2YgY2FzZXMpIHtcbiAgICBjb25zdCBjYXNlVmFsdWUgPSBjWzBdO1xuICAgIGlmIChjYXNlVmFsdWUgPT09IHZhbHVlKSB7XG4gICAgICBjb25zdCBmbiA9IGNbMV07XG4gICAgICByZXR1cm4gZm4oKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlZmF1bHRDYXNlPy4oKTtcbn07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtBdHRyaWJ1dGVQYXJ0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmUsXG4gIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG4gIFBhcnRJbmZvLFxuICBQYXJ0VHlwZSxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcblxuLyoqXG4gKiBBIGtleS12YWx1ZSBzZXQgb2YgY2xhc3MgbmFtZXMgdG8gdHJ1dGh5IHZhbHVlcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDbGFzc0luZm8ge1xuICByZWFkb25seSBbbmFtZTogc3RyaW5nXTogc3RyaW5nIHwgYm9vbGVhbiB8IG51bWJlcjtcbn1cblxuY2xhc3MgQ2xhc3NNYXBEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICAvKipcbiAgICogU3RvcmVzIHRoZSBDbGFzc0luZm8gb2JqZWN0IGFwcGxpZWQgdG8gYSBnaXZlbiBBdHRyaWJ1dGVQYXJ0LlxuICAgKiBVc2VkIHRvIHVuc2V0IGV4aXN0aW5nIHZhbHVlcyB3aGVuIGEgbmV3IENsYXNzSW5mbyBvYmplY3QgaXMgYXBwbGllZC5cbiAgICovXG4gIHByaXZhdGUgX3ByZXZpb3VzQ2xhc3Nlcz86IFNldDxzdHJpbmc+O1xuICBwcml2YXRlIF9zdGF0aWNDbGFzc2VzPzogU2V0PHN0cmluZz47XG5cbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICAgIGlmIChcbiAgICAgIHBhcnRJbmZvLnR5cGUgIT09IFBhcnRUeXBlLkFUVFJJQlVURSB8fFxuICAgICAgcGFydEluZm8ubmFtZSAhPT0gJ2NsYXNzJyB8fFxuICAgICAgKHBhcnRJbmZvLnN0cmluZ3M/Lmxlbmd0aCBhcyBudW1iZXIpID4gMlxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnYGNsYXNzTWFwKClgIGNhbiBvbmx5IGJlIHVzZWQgaW4gdGhlIGBjbGFzc2AgYXR0cmlidXRlICcgK1xuICAgICAgICAgICdhbmQgbXVzdCBiZSB0aGUgb25seSBwYXJ0IGluIHRoZSBhdHRyaWJ1dGUuJ1xuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXIoY2xhc3NJbmZvOiBDbGFzc0luZm8pIHtcbiAgICAvLyBBZGQgc3BhY2VzIHRvIGVuc3VyZSBzZXBhcmF0aW9uIGZyb20gc3RhdGljIGNsYXNzZXNcbiAgICByZXR1cm4gKFxuICAgICAgJyAnICtcbiAgICAgIE9iamVjdC5rZXlzKGNsYXNzSW5mbylcbiAgICAgICAgLmZpbHRlcigoa2V5KSA9PiBjbGFzc0luZm9ba2V5XSlcbiAgICAgICAgLmpvaW4oJyAnKSArXG4gICAgICAnICdcbiAgICApO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IEF0dHJpYnV0ZVBhcnQsIFtjbGFzc0luZm9dOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgLy8gUmVtZW1iZXIgZHluYW1pYyBjbGFzc2VzIG9uIHRoZSBmaXJzdCByZW5kZXJcbiAgICBpZiAodGhpcy5fcHJldmlvdXNDbGFzc2VzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX3ByZXZpb3VzQ2xhc3NlcyA9IG5ldyBTZXQoKTtcbiAgICAgIGlmIChwYXJ0LnN0cmluZ3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9zdGF0aWNDbGFzc2VzID0gbmV3IFNldChcbiAgICAgICAgICBwYXJ0LnN0cmluZ3NcbiAgICAgICAgICAgIC5qb2luKCcgJylcbiAgICAgICAgICAgIC5zcGxpdCgvXFxzLylcbiAgICAgICAgICAgIC5maWx0ZXIoKHMpID0+IHMgIT09ICcnKVxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBuYW1lIGluIGNsYXNzSW5mbykge1xuICAgICAgICBpZiAoY2xhc3NJbmZvW25hbWVdICYmICF0aGlzLl9zdGF0aWNDbGFzc2VzPy5oYXMobmFtZSkpIHtcbiAgICAgICAgICB0aGlzLl9wcmV2aW91c0NsYXNzZXMuYWRkKG5hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5yZW5kZXIoY2xhc3NJbmZvKTtcbiAgICB9XG5cbiAgICBjb25zdCBjbGFzc0xpc3QgPSBwYXJ0LmVsZW1lbnQuY2xhc3NMaXN0O1xuXG4gICAgLy8gUmVtb3ZlIG9sZCBjbGFzc2VzIHRoYXQgbm8gbG9uZ2VyIGFwcGx5XG4gICAgLy8gV2UgdXNlIGZvckVhY2goKSBpbnN0ZWFkIG9mIGZvci1vZiBzbyB0aGF0IHdlIGRvbid0IHJlcXVpcmUgZG93bi1sZXZlbFxuICAgIC8vIGl0ZXJhdGlvbi5cbiAgICB0aGlzLl9wcmV2aW91c0NsYXNzZXMuZm9yRWFjaCgobmFtZSkgPT4ge1xuICAgICAgaWYgKCEobmFtZSBpbiBjbGFzc0luZm8pKSB7XG4gICAgICAgIGNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgICAgIHRoaXMuX3ByZXZpb3VzQ2xhc3NlcyEuZGVsZXRlKG5hbWUpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQWRkIG9yIHJlbW92ZSBjbGFzc2VzIGJhc2VkIG9uIHRoZWlyIGNsYXNzTWFwIHZhbHVlXG4gICAgZm9yIChjb25zdCBuYW1lIGluIGNsYXNzSW5mbykge1xuICAgICAgLy8gV2UgZXhwbGljaXRseSB3YW50IGEgbG9vc2UgdHJ1dGh5IGNoZWNrIG9mIGB2YWx1ZWAgYmVjYXVzZSBpdCBzZWVtc1xuICAgICAgLy8gbW9yZSBjb252ZW5pZW50IHRoYXQgJycgYW5kIDAgYXJlIHNraXBwZWQuXG4gICAgICBjb25zdCB2YWx1ZSA9ICEhY2xhc3NJbmZvW25hbWVdO1xuICAgICAgaWYgKFxuICAgICAgICB2YWx1ZSAhPT0gdGhpcy5fcHJldmlvdXNDbGFzc2VzLmhhcyhuYW1lKSAmJlxuICAgICAgICAhdGhpcy5fc3RhdGljQ2xhc3Nlcz8uaGFzKG5hbWUpXG4gICAgICApIHtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgY2xhc3NMaXN0LmFkZChuYW1lKTtcbiAgICAgICAgICB0aGlzLl9wcmV2aW91c0NsYXNzZXMuYWRkKG5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgICAgICAgdGhpcy5fcHJldmlvdXNDbGFzc2VzLmRlbGV0ZShuYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGRpcmVjdGl2ZSB0aGF0IGFwcGxpZXMgZHluYW1pYyBDU1MgY2xhc3Nlcy5cbiAqXG4gKiBUaGlzIG11c3QgYmUgdXNlZCBpbiB0aGUgYGNsYXNzYCBhdHRyaWJ1dGUgYW5kIG11c3QgYmUgdGhlIG9ubHkgcGFydCB1c2VkIGluXG4gKiB0aGUgYXR0cmlidXRlLiBJdCB0YWtlcyBlYWNoIHByb3BlcnR5IGluIHRoZSBgY2xhc3NJbmZvYCBhcmd1bWVudCBhbmQgYWRkc1xuICogdGhlIHByb3BlcnR5IG5hbWUgdG8gdGhlIGVsZW1lbnQncyBgY2xhc3NMaXN0YCBpZiB0aGUgcHJvcGVydHkgdmFsdWUgaXNcbiAqIHRydXRoeTsgaWYgdGhlIHByb3BlcnR5IHZhbHVlIGlzIGZhbHNleSwgdGhlIHByb3BlcnR5IG5hbWUgaXMgcmVtb3ZlZCBmcm9tXG4gKiB0aGUgZWxlbWVudCdzIGBjbGFzc2AuXG4gKlxuICogRm9yIGV4YW1wbGUgYHtmb286IGJhcn1gIGFwcGxpZXMgdGhlIGNsYXNzIGBmb29gIGlmIHRoZSB2YWx1ZSBvZiBgYmFyYCBpc1xuICogdHJ1dGh5LlxuICpcbiAqIEBwYXJhbSBjbGFzc0luZm9cbiAqL1xuZXhwb3J0IGNvbnN0IGNsYXNzTWFwID0gZGlyZWN0aXZlKENsYXNzTWFwRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtDbGFzc01hcERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtub0NoYW5nZSwgUGFydH0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIERpcmVjdGl2ZSwgRGlyZWN0aXZlUGFyYW1ldGVyc30gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcblxuLy8gQSBzZW50aW5hbCB0aGF0IGluZGljYXRlcyBndWFyZCgpIGhhc24ndCByZW5kZXJlZCBhbnl0aGluZyB5ZXRcbmNvbnN0IGluaXRpYWxWYWx1ZSA9IHt9O1xuXG5jbGFzcyBHdWFyZERpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIHByaXZhdGUgX3ByZXZpb3VzVmFsdWU6IHVua25vd24gPSBpbml0aWFsVmFsdWU7XG5cbiAgcmVuZGVyKF92YWx1ZTogdW5rbm93biwgZjogKCkgPT4gdW5rbm93bikge1xuICAgIHJldHVybiBmKCk7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUoX3BhcnQ6IFBhcnQsIFt2YWx1ZSwgZl06IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIC8vIERpcnR5LWNoZWNrIGFycmF5cyBieSBpdGVtXG4gICAgICBpZiAoXG4gICAgICAgIEFycmF5LmlzQXJyYXkodGhpcy5fcHJldmlvdXNWYWx1ZSkgJiZcbiAgICAgICAgdGhpcy5fcHJldmlvdXNWYWx1ZS5sZW5ndGggPT09IHZhbHVlLmxlbmd0aCAmJlxuICAgICAgICB2YWx1ZS5ldmVyeSgodiwgaSkgPT4gdiA9PT0gKHRoaXMuX3ByZXZpb3VzVmFsdWUgYXMgQXJyYXk8dW5rbm93bj4pW2ldKVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRoaXMuX3ByZXZpb3VzVmFsdWUgPT09IHZhbHVlKSB7XG4gICAgICAvLyBEaXJ0eS1jaGVjayBub24tYXJyYXlzIGJ5IGlkZW50aXR5XG4gICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgfVxuXG4gICAgLy8gQ29weSB0aGUgdmFsdWUgaWYgaXQncyBhbiBhcnJheSBzbyB0aGF0IGlmIGl0J3MgbXV0YXRlZCB3ZSBkb24ndCBmb3JnZXRcbiAgICAvLyB3aGF0IHRoZSBwcmV2aW91cyB2YWx1ZXMgd2VyZS5cbiAgICB0aGlzLl9wcmV2aW91c1ZhbHVlID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyBBcnJheS5mcm9tKHZhbHVlKSA6IHZhbHVlO1xuICAgIGNvbnN0IHIgPSB0aGlzLnJlbmRlcih2YWx1ZSwgZik7XG4gICAgcmV0dXJuIHI7XG4gIH1cbn1cblxuLyoqXG4gKiBQcmV2ZW50cyByZS1yZW5kZXIgb2YgYSB0ZW1wbGF0ZSBmdW5jdGlvbiB1bnRpbCBhIHNpbmdsZSB2YWx1ZSBvciBhbiBhcnJheSBvZlxuICogdmFsdWVzIGNoYW5nZXMuXG4gKlxuICogVmFsdWVzIGFyZSBjaGVja2VkIGFnYWluc3QgcHJldmlvdXMgdmFsdWVzIHdpdGggc3RyaWN0IGVxdWFsaXR5IChgPT09YCksIGFuZFxuICogc28gdGhlIGNoZWNrIHdvbid0IGRldGVjdCBuZXN0ZWQgcHJvcGVydHkgY2hhbmdlcyBpbnNpZGUgb2JqZWN0cyBvciBhcnJheXMuXG4gKiBBcnJheXMgdmFsdWVzIGhhdmUgZWFjaCBpdGVtIGNoZWNrZWQgYWdhaW5zdCB0aGUgcHJldmlvdXMgdmFsdWUgYXQgdGhlIHNhbWVcbiAqIGluZGV4IHdpdGggc3RyaWN0IGVxdWFsaXR5LiBOZXN0ZWQgYXJyYXlzIGFyZSBhbHNvIGNoZWNrZWQgb25seSBieSBzdHJpY3RcbiAqIGVxdWFsaXR5LlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogYGBganNcbiAqIGh0bWxgXG4gKiAgIDxkaXY+XG4gKiAgICAgJHtndWFyZChbdXNlci5pZCwgY29tcGFueS5pZF0sICgpID0+IGh0bWxgLi4uYCl9XG4gKiAgIDwvZGl2PlxuICogYFxuICogYGBgXG4gKlxuICogSW4gdGhpcyBjYXNlLCB0aGUgdGVtcGxhdGUgb25seSByZXJlbmRlcnMgaWYgZWl0aGVyIGB1c2VyLmlkYCBvciBgY29tcGFueS5pZGBcbiAqIGNoYW5nZXMuXG4gKlxuICogZ3VhcmQoKSBpcyB1c2VmdWwgd2l0aCBpbW11dGFibGUgZGF0YSBwYXR0ZXJucywgYnkgcHJldmVudGluZyBleHBlbnNpdmUgd29ya1xuICogdW50aWwgZGF0YSB1cGRhdGVzLlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogYGBganNcbiAqIGh0bWxgXG4gKiAgIDxkaXY+XG4gKiAgICAgJHtndWFyZChbaW1tdXRhYmxlSXRlbXNdLCAoKSA9PiBpbW11dGFibGVJdGVtcy5tYXAoaSA9PiBodG1sYCR7aX1gKSl9XG4gKiAgIDwvZGl2PlxuICogYFxuICogYGBgXG4gKlxuICogSW4gdGhpcyBjYXNlLCBpdGVtcyBhcmUgbWFwcGVkIG92ZXIgb25seSB3aGVuIHRoZSBhcnJheSByZWZlcmVuY2UgY2hhbmdlcy5cbiAqXG4gKiBAcGFyYW0gdmFsdWUgdGhlIHZhbHVlIHRvIGNoZWNrIGJlZm9yZSByZS1yZW5kZXJpbmdcbiAqIEBwYXJhbSBmIHRoZSB0ZW1wbGF0ZSBmdW5jdGlvblxuICovXG5leHBvcnQgY29uc3QgZ3VhcmQgPSBkaXJlY3RpdmUoR3VhcmREaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge0d1YXJkRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge25vdGhpbmd9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcblxuLyoqXG4gKiBGb3IgQXR0cmlidXRlUGFydHMsIHNldHMgdGhlIGF0dHJpYnV0ZSBpZiB0aGUgdmFsdWUgaXMgZGVmaW5lZCBhbmQgcmVtb3Zlc1xuICogdGhlIGF0dHJpYnV0ZSBpZiB0aGUgdmFsdWUgaXMgdW5kZWZpbmVkLlxuICpcbiAqIEZvciBvdGhlciBwYXJ0IHR5cGVzLCB0aGlzIGRpcmVjdGl2ZSBpcyBhIG5vLW9wLlxuICovXG5leHBvcnQgY29uc3QgaWZEZWZpbmVkID0gPFQ+KHZhbHVlOiBUKSA9PiB2YWx1ZSA/PyBub3RoaW5nO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjEgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbi8qKlxuICogUmV0dXJucyBhbiBpdGVyYWJsZSBjb250YWluaW5nIHRoZSB2YWx1ZXMgaW4gYGl0ZW1zYCBpbnRlcmxlYXZlZCB3aXRoIHRoZVxuICogYGpvaW5lcmAgdmFsdWUuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogcmVuZGVyKCkge1xuICogICByZXR1cm4gaHRtbGBcbiAqICAgICAke2pvaW4oaXRlbXMsIGh0bWxgPHNwYW4gY2xhc3M9XCJzZXBhcmF0b3JcIj58PC9zcGFuPmApfVxuICogICBgO1xuICogfVxuICovXG5leHBvcnQgZnVuY3Rpb24gam9pbjxJLCBKPihcbiAgaXRlbXM6IEl0ZXJhYmxlPEk+IHwgdW5kZWZpbmVkLFxuICBqb2luZXI6IChpbmRleDogbnVtYmVyKSA9PiBKXG4pOiBJdGVyYWJsZTxJIHwgSj47XG5leHBvcnQgZnVuY3Rpb24gam9pbjxJLCBKPihcbiAgaXRlbXM6IEl0ZXJhYmxlPEk+IHwgdW5kZWZpbmVkLFxuICBqb2luZXI6IEpcbik6IEl0ZXJhYmxlPEkgfCBKPjtcbmV4cG9ydCBmdW5jdGlvbiogam9pbjxJLCBKPihpdGVtczogSXRlcmFibGU8ST4gfCB1bmRlZmluZWQsIGpvaW5lcjogSikge1xuICBjb25zdCBpc0Z1bmN0aW9uID0gdHlwZW9mIGpvaW5lciA9PT0gJ2Z1bmN0aW9uJztcbiAgaWYgKGl0ZW1zICE9PSB1bmRlZmluZWQpIHtcbiAgICBsZXQgaSA9IC0xO1xuICAgIGZvciAoY29uc3QgdmFsdWUgb2YgaXRlbXMpIHtcbiAgICAgIGlmIChpID4gLTEpIHtcbiAgICAgICAgeWllbGQgaXNGdW5jdGlvbiA/IGpvaW5lcihpKSA6IGpvaW5lcjtcbiAgICAgIH1cbiAgICAgIGkrKztcbiAgICAgIHlpZWxkIHZhbHVlO1xuICAgIH1cbiAgfVxufVxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjEgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7bm90aGluZ30gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmUsXG4gIENoaWxkUGFydCxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbn0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7c2V0Q29tbWl0dGVkVmFsdWV9IGZyb20gJy4uL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcblxuY2xhc3MgS2V5ZWQgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBrZXk6IHVua25vd24gPSBub3RoaW5nO1xuXG4gIHJlbmRlcihrOiB1bmtub3duLCB2OiB1bmtub3duKSB7XG4gICAgdGhpcy5rZXkgPSBrO1xuICAgIHJldHVybiB2O1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IENoaWxkUGFydCwgW2ssIHZdOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgaWYgKGsgIT09IHRoaXMua2V5KSB7XG4gICAgICAvLyBDbGVhciB0aGUgcGFydCBiZWZvcmUgcmV0dXJuaW5nIGEgdmFsdWUuIFRoZSBvbmUtYXJnIGZvcm0gb2ZcbiAgICAgIC8vIHNldENvbW1pdHRlZFZhbHVlIHNldHMgdGhlIHZhbHVlIHRvIGEgc2VudGluZWwgd2hpY2ggZm9yY2VzIGFcbiAgICAgIC8vIGNvbW1pdCB0aGUgbmV4dCByZW5kZXIuXG4gICAgICBzZXRDb21taXR0ZWRWYWx1ZShwYXJ0KTtcbiAgICAgIHRoaXMua2V5ID0gaztcbiAgICB9XG4gICAgcmV0dXJuIHY7XG4gIH1cbn1cblxuLyoqXG4gKiBBc3NvY2lhdGVzIGEgcmVuZGVyYWJsZSB2YWx1ZSB3aXRoIGEgdW5pcXVlIGtleS4gV2hlbiB0aGUga2V5IGNoYW5nZXMsIHRoZVxuICogcHJldmlvdXMgRE9NIGlzIHJlbW92ZWQgYW5kIGRpc3Bvc2VkIGJlZm9yZSByZW5kZXJpbmcgdGhlIG5leHQgdmFsdWUsIGV2ZW5cbiAqIGlmIHRoZSB2YWx1ZSAtIHN1Y2ggYXMgYSB0ZW1wbGF0ZSAtIGlzIHRoZSBzYW1lLlxuICpcbiAqIFRoaXMgaXMgdXNlZnVsIGZvciBmb3JjaW5nIHJlLXJlbmRlcnMgb2Ygc3RhdGVmdWwgY29tcG9uZW50cywgb3Igd29ya2luZ1xuICogd2l0aCBjb2RlIHRoYXQgZXhwZWN0cyBuZXcgZGF0YSB0byBnZW5lcmF0ZSBuZXcgSFRNTCBlbGVtZW50cywgc3VjaCBhcyBzb21lXG4gKiBhbmltYXRpb24gdGVjaG5pcXVlcy5cbiAqL1xuZXhwb3J0IGNvbnN0IGtleWVkID0gZGlyZWN0aXZlKEtleWVkKTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0F0dHJpYnV0ZVBhcnQsIG5vQ2hhbmdlLCBub3RoaW5nfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBkaXJlY3RpdmUsXG4gIERpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbiAgUGFydEluZm8sXG4gIFBhcnRUeXBlLFxufSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtpc1NpbmdsZUV4cHJlc3Npb24sIHNldENvbW1pdHRlZFZhbHVlfSBmcm9tICcuLi9kaXJlY3RpdmUtaGVscGVycy5qcyc7XG5cbmNsYXNzIExpdmVEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gICAgaWYgKFxuICAgICAgIShcbiAgICAgICAgcGFydEluZm8udHlwZSA9PT0gUGFydFR5cGUuUFJPUEVSVFkgfHxcbiAgICAgICAgcGFydEluZm8udHlwZSA9PT0gUGFydFR5cGUuQVRUUklCVVRFIHx8XG4gICAgICAgIHBhcnRJbmZvLnR5cGUgPT09IFBhcnRUeXBlLkJPT0xFQU5fQVRUUklCVVRFXG4gICAgICApXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdUaGUgYGxpdmVgIGRpcmVjdGl2ZSBpcyBub3QgYWxsb3dlZCBvbiBjaGlsZCBvciBldmVudCBiaW5kaW5ncydcbiAgICAgICk7XG4gICAgfVxuICAgIGlmICghaXNTaW5nbGVFeHByZXNzaW9uKHBhcnRJbmZvKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdgbGl2ZWAgYmluZGluZ3MgY2FuIG9ubHkgY29udGFpbiBhIHNpbmdsZSBleHByZXNzaW9uJyk7XG4gICAgfVxuICB9XG5cbiAgcmVuZGVyKHZhbHVlOiB1bmtub3duKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKHBhcnQ6IEF0dHJpYnV0ZVBhcnQsIFt2YWx1ZV06IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICBpZiAodmFsdWUgPT09IG5vQ2hhbmdlIHx8IHZhbHVlID09PSBub3RoaW5nKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIGNvbnN0IGVsZW1lbnQgPSBwYXJ0LmVsZW1lbnQ7XG4gICAgY29uc3QgbmFtZSA9IHBhcnQubmFtZTtcblxuICAgIGlmIChwYXJ0LnR5cGUgPT09IFBhcnRUeXBlLlBST1BFUlRZKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgaWYgKHZhbHVlID09PSAoZWxlbWVudCBhcyBhbnkpW25hbWVdKSB7XG4gICAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHBhcnQudHlwZSA9PT0gUGFydFR5cGUuQk9PTEVBTl9BVFRSSUJVVEUpIHtcbiAgICAgIGlmICghIXZhbHVlID09PSBlbGVtZW50Lmhhc0F0dHJpYnV0ZShuYW1lKSkge1xuICAgICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChwYXJ0LnR5cGUgPT09IFBhcnRUeXBlLkFUVFJJQlVURSkge1xuICAgICAgaWYgKGVsZW1lbnQuZ2V0QXR0cmlidXRlKG5hbWUpID09PSBTdHJpbmcodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gUmVzZXRzIHRoZSBwYXJ0J3MgdmFsdWUsIGNhdXNpbmcgaXRzIGRpcnR5LWNoZWNrIHRvIGZhaWwgc28gdGhhdCBpdFxuICAgIC8vIGFsd2F5cyBzZXRzIHRoZSB2YWx1ZS5cbiAgICBzZXRDb21taXR0ZWRWYWx1ZShwYXJ0KTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn1cblxuLyoqXG4gKiBDaGVja3MgYmluZGluZyB2YWx1ZXMgYWdhaW5zdCBsaXZlIERPTSB2YWx1ZXMsIGluc3RlYWQgb2YgcHJldmlvdXNseSBib3VuZFxuICogdmFsdWVzLCB3aGVuIGRldGVybWluaW5nIHdoZXRoZXIgdG8gdXBkYXRlIHRoZSB2YWx1ZS5cbiAqXG4gKiBUaGlzIGlzIHVzZWZ1bCBmb3IgY2FzZXMgd2hlcmUgdGhlIERPTSB2YWx1ZSBtYXkgY2hhbmdlIGZyb20gb3V0c2lkZSBvZlxuICogbGl0LWh0bWwsIHN1Y2ggYXMgd2l0aCBhIGJpbmRpbmcgdG8gYW4gYDxpbnB1dD5gIGVsZW1lbnQncyBgdmFsdWVgIHByb3BlcnR5LFxuICogYSBjb250ZW50IGVkaXRhYmxlIGVsZW1lbnRzIHRleHQsIG9yIHRvIGEgY3VzdG9tIGVsZW1lbnQgdGhhdCBjaGFuZ2VzIGl0J3NcbiAqIG93biBwcm9wZXJ0aWVzIG9yIGF0dHJpYnV0ZXMuXG4gKlxuICogSW4gdGhlc2UgY2FzZXMgaWYgdGhlIERPTSB2YWx1ZSBjaGFuZ2VzLCBidXQgdGhlIHZhbHVlIHNldCB0aHJvdWdoIGxpdC1odG1sXG4gKiBiaW5kaW5ncyBoYXNuJ3QsIGxpdC1odG1sIHdvbid0IGtub3cgdG8gdXBkYXRlIHRoZSBET00gdmFsdWUgYW5kIHdpbGwgbGVhdmVcbiAqIGl0IGFsb25lLiBJZiB0aGlzIGlzIG5vdCB3aGF0IHlvdSB3YW50LS1pZiB5b3Ugd2FudCB0byBvdmVyd3JpdGUgdGhlIERPTVxuICogdmFsdWUgd2l0aCB0aGUgYm91bmQgdmFsdWUgbm8gbWF0dGVyIHdoYXQtLXVzZSB0aGUgYGxpdmUoKWAgZGlyZWN0aXZlOlxuICpcbiAqIGBgYGpzXG4gKiBodG1sYDxpbnB1dCAudmFsdWU9JHtsaXZlKHgpfT5gXG4gKiBgYGBcbiAqXG4gKiBgbGl2ZSgpYCBwZXJmb3JtcyBhIHN0cmljdCBlcXVhbGl0eSBjaGVjayBhZ2FpbnMgdGhlIGxpdmUgRE9NIHZhbHVlLCBhbmQgaWZcbiAqIHRoZSBuZXcgdmFsdWUgaXMgZXF1YWwgdG8gdGhlIGxpdmUgdmFsdWUsIGRvZXMgbm90aGluZy4gVGhpcyBtZWFucyB0aGF0XG4gKiBgbGl2ZSgpYCBzaG91bGQgbm90IGJlIHVzZWQgd2hlbiB0aGUgYmluZGluZyB3aWxsIGNhdXNlIGEgdHlwZSBjb252ZXJzaW9uLiBJZlxuICogeW91IHVzZSBgbGl2ZSgpYCB3aXRoIGFuIGF0dHJpYnV0ZSBiaW5kaW5nLCBtYWtlIHN1cmUgdGhhdCBvbmx5IHN0cmluZ3MgYXJlXG4gKiBwYXNzZWQgaW4sIG9yIHRoZSBiaW5kaW5nIHdpbGwgdXBkYXRlIGV2ZXJ5IHJlbmRlci5cbiAqL1xuZXhwb3J0IGNvbnN0IGxpdmUgPSBkaXJlY3RpdmUoTGl2ZURpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7TGl2ZURpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLyoqXG4gKiBSZXR1cm5zIGFuIGl0ZXJhYmxlIGNvbnRhaW5pbmcgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIGBmKHZhbHVlKWAgb24gZWFjaFxuICogdmFsdWUgaW4gYGl0ZW1zYC5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiByZW5kZXIoKSB7XG4gKiAgIHJldHVybiBodG1sYFxuICogICAgIDx1bD5cbiAqICAgICAgICR7bWFwKGl0ZW1zLCAoaSkgPT4gaHRtbGA8bGk+JHtpfTwvbGk+YCl9XG4gKiAgICAgPC91bD5cbiAqICAgYDtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24qIG1hcDxUPihcbiAgaXRlbXM6IEl0ZXJhYmxlPFQ+IHwgdW5kZWZpbmVkLFxuICBmOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIpID0+IHVua25vd25cbikge1xuICBpZiAoaXRlbXMgIT09IHVuZGVmaW5lZCkge1xuICAgIGxldCBpID0gMDtcbiAgICBmb3IgKGNvbnN0IHZhbHVlIG9mIGl0ZW1zKSB7XG4gICAgICB5aWVsZCBmKHZhbHVlLCBpKyspO1xuICAgIH1cbiAgfVxufVxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjEgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbi8qKlxuICogUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBpbnRlZ2VycyBmcm9tIGBzdGFydGAgdG8gYGVuZGAgKGV4Y2x1c2l2ZSlcbiAqIGluY3JlbWVudGluZyBieSBgc3RlcGAuXG4gKlxuICogSWYgYHN0YXJ0YCBpcyBvbWl0dGVkLCB0aGUgcmFuZ2Ugc3RhcnRzIGF0IGAwYC4gYHN0ZXBgIGRlZmF1bHRzIHRvIGAxYC5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiByZW5kZXIoKSB7XG4gKiAgIHJldHVybiBodG1sYFxuICogICAgICR7bWFwKHJhbmdlKDgpLCAoKSA9PiBodG1sYDxkaXYgY2xhc3M9XCJjZWxsXCI+PC9kaXY+YCl9XG4gKiAgIGA7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmdlKGVuZDogbnVtYmVyKTogSXRlcmFibGU8bnVtYmVyPjtcbmV4cG9ydCBmdW5jdGlvbiByYW5nZShcbiAgc3RhcnQ6IG51bWJlcixcbiAgZW5kOiBudW1iZXIsXG4gIHN0ZXA/OiBudW1iZXJcbik6IEl0ZXJhYmxlPG51bWJlcj47XG5leHBvcnQgZnVuY3Rpb24qIHJhbmdlKHN0YXJ0T3JFbmQ6IG51bWJlciwgZW5kPzogbnVtYmVyLCBzdGVwID0gMSkge1xuICBjb25zdCBzdGFydCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gMCA6IHN0YXJ0T3JFbmQ7XG4gIGVuZCA/Pz0gc3RhcnRPckVuZDtcbiAgZm9yIChsZXQgaSA9IHN0YXJ0OyBzdGVwID4gMCA/IGkgPCBlbmQgOiBlbmQgPCBpOyBpICs9IHN0ZXApIHtcbiAgICB5aWVsZCBpO1xuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtDaGlsZFBhcnQsIG5vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgRGlyZWN0aXZlLCBQYXJ0SW5mbywgUGFydFR5cGV9IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge1xuICBpbnNlcnRQYXJ0LFxuICBnZXRDb21taXR0ZWRWYWx1ZSxcbiAgcmVtb3ZlUGFydCxcbiAgc2V0Q29tbWl0dGVkVmFsdWUsXG4gIHNldENoaWxkUGFydFZhbHVlLFxufSBmcm9tICcuLi9kaXJlY3RpdmUtaGVscGVycy5qcyc7XG5cbmV4cG9ydCB0eXBlIEtleUZuPFQ+ID0gKGl0ZW06IFQsIGluZGV4OiBudW1iZXIpID0+IHVua25vd247XG5leHBvcnQgdHlwZSBJdGVtVGVtcGxhdGU8VD4gPSAoaXRlbTogVCwgaW5kZXg6IG51bWJlcikgPT4gdW5rbm93bjtcblxuLy8gSGVscGVyIGZvciBnZW5lcmF0aW5nIGEgbWFwIG9mIGFycmF5IGl0ZW0gdG8gaXRzIGluZGV4IG92ZXIgYSBzdWJzZXRcbi8vIG9mIGFuIGFycmF5ICh1c2VkIHRvIGxhemlseSBnZW5lcmF0ZSBgbmV3S2V5VG9JbmRleE1hcGAgYW5kXG4vLyBgb2xkS2V5VG9JbmRleE1hcGApXG5jb25zdCBnZW5lcmF0ZU1hcCA9IChsaXN0OiB1bmtub3duW10sIHN0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyKSA9PiB7XG4gIGNvbnN0IG1hcCA9IG5ldyBNYXA8dW5rbm93biwgbnVtYmVyPigpO1xuICBmb3IgKGxldCBpID0gc3RhcnQ7IGkgPD0gZW5kOyBpKyspIHtcbiAgICBtYXAuc2V0KGxpc3RbaV0sIGkpO1xuICB9XG4gIHJldHVybiBtYXA7XG59O1xuXG5jbGFzcyBSZXBlYXREaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBwcml2YXRlIF9pdGVtS2V5cz86IHVua25vd25bXTtcblxuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gICAgaWYgKHBhcnRJbmZvLnR5cGUgIT09IFBhcnRUeXBlLkNISUxEKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlcGVhdCgpIGNhbiBvbmx5IGJlIHVzZWQgaW4gdGV4dCBleHByZXNzaW9ucycpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2dldFZhbHVlc0FuZEtleXM8VD4oXG4gICAgaXRlbXM6IEl0ZXJhYmxlPFQ+LFxuICAgIGtleUZuT3JUZW1wbGF0ZTogS2V5Rm48VD4gfCBJdGVtVGVtcGxhdGU8VD4sXG4gICAgdGVtcGxhdGU/OiBJdGVtVGVtcGxhdGU8VD5cbiAgKSB7XG4gICAgbGV0IGtleUZuOiBLZXlGbjxUPiB8IHVuZGVmaW5lZDtcbiAgICBpZiAodGVtcGxhdGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGVtcGxhdGUgPSBrZXlGbk9yVGVtcGxhdGU7XG4gICAgfSBlbHNlIGlmIChrZXlGbk9yVGVtcGxhdGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAga2V5Rm4gPSBrZXlGbk9yVGVtcGxhdGUgYXMgS2V5Rm48VD47XG4gICAgfVxuICAgIGNvbnN0IGtleXMgPSBbXTtcbiAgICBjb25zdCB2YWx1ZXMgPSBbXTtcbiAgICBsZXQgaW5kZXggPSAwO1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgICAga2V5c1tpbmRleF0gPSBrZXlGbiA/IGtleUZuKGl0ZW0sIGluZGV4KSA6IGluZGV4O1xuICAgICAgdmFsdWVzW2luZGV4XSA9IHRlbXBsYXRlIShpdGVtLCBpbmRleCk7XG4gICAgICBpbmRleCsrO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdmFsdWVzLFxuICAgICAga2V5cyxcbiAgICB9O1xuICB9XG5cbiAgcmVuZGVyPFQ+KGl0ZW1zOiBJdGVyYWJsZTxUPiwgdGVtcGxhdGU6IEl0ZW1UZW1wbGF0ZTxUPik6IEFycmF5PHVua25vd24+O1xuICByZW5kZXI8VD4oXG4gICAgaXRlbXM6IEl0ZXJhYmxlPFQ+LFxuICAgIGtleUZuOiBLZXlGbjxUPiB8IEl0ZW1UZW1wbGF0ZTxUPixcbiAgICB0ZW1wbGF0ZTogSXRlbVRlbXBsYXRlPFQ+XG4gICk6IEFycmF5PHVua25vd24+O1xuICByZW5kZXI8VD4oXG4gICAgaXRlbXM6IEl0ZXJhYmxlPFQ+LFxuICAgIGtleUZuT3JUZW1wbGF0ZTogS2V5Rm48VD4gfCBJdGVtVGVtcGxhdGU8VD4sXG4gICAgdGVtcGxhdGU/OiBJdGVtVGVtcGxhdGU8VD5cbiAgKSB7XG4gICAgcmV0dXJuIHRoaXMuX2dldFZhbHVlc0FuZEtleXMoaXRlbXMsIGtleUZuT3JUZW1wbGF0ZSwgdGVtcGxhdGUpLnZhbHVlcztcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZTxUPihcbiAgICBjb250YWluZXJQYXJ0OiBDaGlsZFBhcnQsXG4gICAgW2l0ZW1zLCBrZXlGbk9yVGVtcGxhdGUsIHRlbXBsYXRlXTogW1xuICAgICAgSXRlcmFibGU8VD4sXG4gICAgICBLZXlGbjxUPiB8IEl0ZW1UZW1wbGF0ZTxUPixcbiAgICAgIEl0ZW1UZW1wbGF0ZTxUPlxuICAgIF1cbiAgKSB7XG4gICAgLy8gT2xkIHBhcnQgJiBrZXkgbGlzdHMgYXJlIHJldHJpZXZlZCBmcm9tIHRoZSBsYXN0IHVwZGF0ZSAod2hpY2ggbWF5XG4gICAgLy8gYmUgcHJpbWVkIGJ5IGh5ZHJhdGlvbilcbiAgICBjb25zdCBvbGRQYXJ0cyA9IGdldENvbW1pdHRlZFZhbHVlKFxuICAgICAgY29udGFpbmVyUGFydFxuICAgICkgYXMgQXJyYXk8Q2hpbGRQYXJ0IHwgbnVsbD47XG4gICAgY29uc3Qge3ZhbHVlczogbmV3VmFsdWVzLCBrZXlzOiBuZXdLZXlzfSA9IHRoaXMuX2dldFZhbHVlc0FuZEtleXMoXG4gICAgICBpdGVtcyxcbiAgICAgIGtleUZuT3JUZW1wbGF0ZSxcbiAgICAgIHRlbXBsYXRlXG4gICAgKTtcblxuICAgIC8vIFdlIGNoZWNrIHRoYXQgb2xkUGFydHMsIHRoZSBjb21taXR0ZWQgdmFsdWUsIGlzIGFuIEFycmF5IGFzIGFuXG4gICAgLy8gaW5kaWNhdG9yIHRoYXQgdGhlIHByZXZpb3VzIHZhbHVlIGNhbWUgZnJvbSBhIHJlcGVhdCgpIGNhbGwuIElmXG4gICAgLy8gb2xkUGFydHMgaXMgbm90IGFuIEFycmF5IHRoZW4gdGhpcyBpcyB0aGUgZmlyc3QgcmVuZGVyIGFuZCB3ZSByZXR1cm5cbiAgICAvLyBhbiBhcnJheSBmb3IgbGl0LWh0bWwncyBhcnJheSBoYW5kbGluZyB0byByZW5kZXIsIGFuZCByZW1lbWJlciB0aGVcbiAgICAvLyBrZXlzLlxuICAgIGlmICghQXJyYXkuaXNBcnJheShvbGRQYXJ0cykpIHtcbiAgICAgIHRoaXMuX2l0ZW1LZXlzID0gbmV3S2V5cztcbiAgICAgIHJldHVybiBuZXdWYWx1ZXM7XG4gICAgfVxuXG4gICAgLy8gSW4gU1NSIGh5ZHJhdGlvbiBpdCdzIHBvc3NpYmxlIGZvciBvbGRQYXJ0cyB0byBiZSBhbiBhcnJyYXkgYnV0IGZvciB1c1xuICAgIC8vIHRvIG5vdCBoYXZlIGl0ZW0ga2V5cyBiZWNhdXNlIHRoZSB1cGRhdGUoKSBoYXNuJ3QgcnVuIHlldC4gV2Ugc2V0IHRoZVxuICAgIC8vIGtleXMgdG8gYW4gZW1wdHkgYXJyYXkuIFRoaXMgd2lsbCBjYXVzZSBhbGwgb2xkS2V5L25ld0tleSBjb21wYXJpc29uc1xuICAgIC8vIHRvIGZhaWwgYW5kIGV4ZWN1dGlvbiB0byBmYWxsIHRvIHRoZSBsYXN0IG5lc3RlZCBicmFjaCBiZWxvdyB3aGljaFxuICAgIC8vIHJldXNlcyB0aGUgb2xkUGFydC5cbiAgICBjb25zdCBvbGRLZXlzID0gKHRoaXMuX2l0ZW1LZXlzID8/PSBbXSk7XG5cbiAgICAvLyBOZXcgcGFydCBsaXN0IHdpbGwgYmUgYnVpbHQgdXAgYXMgd2UgZ28gKGVpdGhlciByZXVzZWQgZnJvbVxuICAgIC8vIG9sZCBwYXJ0cyBvciBjcmVhdGVkIGZvciBuZXcga2V5cyBpbiB0aGlzIHVwZGF0ZSkuIFRoaXMgaXNcbiAgICAvLyBzYXZlZCBpbiB0aGUgYWJvdmUgY2FjaGUgYXQgdGhlIGVuZCBvZiB0aGUgdXBkYXRlLlxuICAgIGNvbnN0IG5ld1BhcnRzOiBDaGlsZFBhcnRbXSA9IFtdO1xuXG4gICAgLy8gTWFwcyBmcm9tIGtleSB0byBpbmRleCBmb3IgY3VycmVudCBhbmQgcHJldmlvdXMgdXBkYXRlOyB0aGVzZVxuICAgIC8vIGFyZSBnZW5lcmF0ZWQgbGF6aWx5IG9ubHkgd2hlbiBuZWVkZWQgYXMgYSBwZXJmb3JtYW5jZVxuICAgIC8vIG9wdGltaXphdGlvbiwgc2luY2UgdGhleSBhcmUgb25seSByZXF1aXJlZCBmb3IgbXVsdGlwbGVcbiAgICAvLyBub24tY29udGlndW91cyBjaGFuZ2VzIGluIHRoZSBsaXN0LCB3aGljaCBhcmUgbGVzcyBjb21tb24uXG4gICAgbGV0IG5ld0tleVRvSW5kZXhNYXAhOiBNYXA8dW5rbm93biwgbnVtYmVyPjtcbiAgICBsZXQgb2xkS2V5VG9JbmRleE1hcCE6IE1hcDx1bmtub3duLCBudW1iZXI+O1xuXG4gICAgLy8gSGVhZCBhbmQgdGFpbCBwb2ludGVycyB0byBvbGQgcGFydHMgYW5kIG5ldyB2YWx1ZXNcbiAgICBsZXQgb2xkSGVhZCA9IDA7XG4gICAgbGV0IG9sZFRhaWwgPSBvbGRQYXJ0cy5sZW5ndGggLSAxO1xuICAgIGxldCBuZXdIZWFkID0gMDtcbiAgICBsZXQgbmV3VGFpbCA9IG5ld1ZhbHVlcy5sZW5ndGggLSAxO1xuXG4gICAgLy8gT3ZlcnZpZXcgb2YgTyhuKSByZWNvbmNpbGlhdGlvbiBhbGdvcml0aG0gKGdlbmVyYWwgYXBwcm9hY2hcbiAgICAvLyBiYXNlZCBvbiBpZGVhcyBmb3VuZCBpbiBpdmksIHZ1ZSwgc25hYmJkb20sIGV0Yy4pOlxuICAgIC8vXG4gICAgLy8gKiBXZSBzdGFydCB3aXRoIHRoZSBsaXN0IG9mIG9sZCBwYXJ0cyBhbmQgbmV3IHZhbHVlcyAoYW5kXG4gICAgLy8gICBhcnJheXMgb2YgdGhlaXIgcmVzcGVjdGl2ZSBrZXlzKSwgaGVhZC90YWlsIHBvaW50ZXJzIGludG9cbiAgICAvLyAgIGVhY2gsIGFuZCB3ZSBidWlsZCB1cCB0aGUgbmV3IGxpc3Qgb2YgcGFydHMgYnkgdXBkYXRpbmdcbiAgICAvLyAgIChhbmQgd2hlbiBuZWVkZWQsIG1vdmluZykgb2xkIHBhcnRzIG9yIGNyZWF0aW5nIG5ldyBvbmVzLlxuICAgIC8vICAgVGhlIGluaXRpYWwgc2NlbmFyaW8gbWlnaHQgbG9vayBsaWtlIHRoaXMgKGZvciBicmV2aXR5IG9mXG4gICAgLy8gICB0aGUgZGlhZ3JhbXMsIHRoZSBudW1iZXJzIGluIHRoZSBhcnJheSByZWZsZWN0IGtleXNcbiAgICAvLyAgIGFzc29jaWF0ZWQgd2l0aCB0aGUgb2xkIHBhcnRzIG9yIG5ldyB2YWx1ZXMsIGFsdGhvdWdoIGtleXNcbiAgICAvLyAgIGFuZCBwYXJ0cy92YWx1ZXMgYXJlIGFjdHVhbGx5IHN0b3JlZCBpbiBwYXJhbGxlbCBhcnJheXNcbiAgICAvLyAgIGluZGV4ZWQgdXNpbmcgdGhlIHNhbWUgaGVhZC90YWlsIHBvaW50ZXJzKTpcbiAgICAvL1xuICAgIC8vICAgICAgb2xkSGVhZCB2ICAgICAgICAgICAgICAgICB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgMiwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbICwgICwgICwgICwgICwgICwgIF1cbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gPC0gcmVmbGVjdHMgdGhlIHVzZXIncyBuZXdcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSBvcmRlclxuICAgIC8vICAgICAgbmV3SGVhZCBeICAgICAgICAgICAgICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogSXRlcmF0ZSBvbGQgJiBuZXcgbGlzdHMgZnJvbSBib3RoIHNpZGVzLCB1cGRhdGluZyxcbiAgICAvLyAgIHN3YXBwaW5nLCBvciByZW1vdmluZyBwYXJ0cyBhdCB0aGUgaGVhZC90YWlsIGxvY2F0aW9uc1xuICAgIC8vICAgdW50aWwgbmVpdGhlciBoZWFkIG5vciB0YWlsIGNhbiBtb3ZlLlxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBrZXlzIGF0IGhlYWQgcG9pbnRlcnMgbWF0Y2gsIHNvIHVwZGF0ZSBvbGRcbiAgICAvLyAgIHBhcnQgMCBpbi1wbGFjZSAobm8gbmVlZCB0byBtb3ZlIGl0KSBhbmQgcmVjb3JkIHBhcnQgMCBpblxuICAgIC8vICAgdGhlIGBuZXdQYXJ0c2AgbGlzdC4gVGhlIGxhc3QgdGhpbmcgd2UgZG8gaXMgYWR2YW5jZSB0aGVcbiAgICAvLyAgIGBvbGRIZWFkYCBhbmQgYG5ld0hlYWRgIHBvaW50ZXJzICh3aWxsIGJlIHJlZmxlY3RlZCBpbiB0aGVcbiAgICAvLyAgIG5leHQgZGlhZ3JhbSkuXG4gICAgLy9cbiAgICAvLyAgICAgIG9sZEhlYWQgdiAgICAgICAgICAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIDIsIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsICAsICAsICAsICAsICAsICBdIDwtIGhlYWRzIG1hdGNoZWQ6IHVwZGF0ZSAwXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIGJvdGggb2xkSGVhZFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmIG5ld0hlYWRcbiAgICAvLyAgICAgIG5ld0hlYWQgXiAgICAgICAgICAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IGhlYWQgcG9pbnRlcnMgZG9uJ3QgbWF0Y2gsIGJ1dCB0YWlsXG4gICAgLy8gICBwb2ludGVycyBkbywgc28gdXBkYXRlIHBhcnQgNiBpbiBwbGFjZSAobm8gbmVlZCB0byBtb3ZlXG4gICAgLy8gICBpdCksIGFuZCByZWNvcmQgcGFydCA2IGluIHRoZSBgbmV3UGFydHNgIGxpc3QuIExhc3QsXG4gICAgLy8gICBhZHZhbmNlIHRoZSBgb2xkVGFpbGAgYW5kIGBvbGRIZWFkYCBwb2ludGVycy5cbiAgICAvL1xuICAgIC8vICAgICAgICAgb2xkSGVhZCB2ICAgICAgICAgICAgICB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgMiwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgICwgICwgICwgICwgICwgNl0gPC0gdGFpbHMgbWF0Y2hlZDogdXBkYXRlIDZcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICAgYW5kIGFkdmFuY2UgYm90aCBvbGRUYWlsXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICYgbmV3VGFpbFxuICAgIC8vICAgICAgICAgbmV3SGVhZCBeICAgICAgICAgICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogSWYgbmVpdGhlciBoZWFkIG5vciB0YWlsIG1hdGNoOyBuZXh0IGNoZWNrIGlmIG9uZSBvZiB0aGVcbiAgICAvLyAgIG9sZCBoZWFkL3RhaWwgaXRlbXMgd2FzIHJlbW92ZWQuIFdlIGZpcnN0IG5lZWQgdG8gZ2VuZXJhdGVcbiAgICAvLyAgIHRoZSByZXZlcnNlIG1hcCBvZiBuZXcga2V5cyB0byBpbmRleCAoYG5ld0tleVRvSW5kZXhNYXBgKSxcbiAgICAvLyAgIHdoaWNoIGlzIGRvbmUgb25jZSBsYXppbHkgYXMgYSBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb24sXG4gICAgLy8gICBzaW5jZSB3ZSBvbmx5IGhpdCB0aGlzIGNhc2UgaWYgbXVsdGlwbGUgbm9uLWNvbnRpZ3VvdXNcbiAgICAvLyAgIGNoYW5nZXMgd2VyZSBtYWRlLiBOb3RlIHRoYXQgZm9yIGNvbnRpZ3VvdXMgcmVtb3ZhbFxuICAgIC8vICAgYW55d2hlcmUgaW4gdGhlIGxpc3QsIHRoZSBoZWFkIGFuZCB0YWlscyB3b3VsZCBhZHZhbmNlXG4gICAgLy8gICBmcm9tIGVpdGhlciBlbmQgYW5kIHBhc3MgZWFjaCBvdGhlciBiZWZvcmUgd2UgZ2V0IHRvIHRoaXNcbiAgICAvLyAgIGNhc2UgYW5kIHJlbW92YWxzIHdvdWxkIGJlIGhhbmRsZWQgaW4gdGhlIGZpbmFsIHdoaWxlIGxvb3BcbiAgICAvLyAgIHdpdGhvdXQgbmVlZGluZyB0byBnZW5lcmF0ZSB0aGUgbWFwLlxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBUaGUga2V5IGF0IGBvbGRUYWlsYCB3YXMgcmVtb3ZlZCAobm8gbG9uZ2VyXG4gICAgLy8gICBpbiB0aGUgYG5ld0tleVRvSW5kZXhNYXBgKSwgc28gcmVtb3ZlIHRoYXQgcGFydCBmcm9tIHRoZVxuICAgIC8vICAgRE9NIGFuZCBhZHZhbmNlIGp1c3QgdGhlIGBvbGRUYWlsYCBwb2ludGVyLlxuICAgIC8vXG4gICAgLy8gICAgICAgICBvbGRIZWFkIHYgICAgICAgICAgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAyLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFswLCAgLCAgLCAgLCAgLCAgLCA2XSA8LSA1IG5vdCBpbiBuZXcgbWFwOiByZW1vdmVcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICAgNSBhbmQgYWR2YW5jZSBvbGRUYWlsXG4gICAgLy8gICAgICAgICBuZXdIZWFkIF4gICAgICAgICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBPbmNlIGhlYWQgYW5kIHRhaWwgY2Fubm90IG1vdmUsIGFueSBtaXNtYXRjaGVzIGFyZSBkdWUgdG9cbiAgICAvLyAgIGVpdGhlciBuZXcgb3IgbW92ZWQgaXRlbXM7IGlmIGEgbmV3IGtleSBpcyBpbiB0aGUgcHJldmlvdXNcbiAgICAvLyAgIFwib2xkIGtleSB0byBvbGQgaW5kZXhcIiBtYXAsIG1vdmUgdGhlIG9sZCBwYXJ0IHRvIHRoZSBuZXdcbiAgICAvLyAgIGxvY2F0aW9uLCBvdGhlcndpc2UgY3JlYXRlIGFuZCBpbnNlcnQgYSBuZXcgcGFydC4gTm90ZVxuICAgIC8vICAgdGhhdCB3aGVuIG1vdmluZyBhbiBvbGQgcGFydCB3ZSBudWxsIGl0cyBwb3NpdGlvbiBpbiB0aGVcbiAgICAvLyAgIG9sZFBhcnRzIGFycmF5IGlmIGl0IGxpZXMgYmV0d2VlbiB0aGUgaGVhZCBhbmQgdGFpbCBzbyB3ZVxuICAgIC8vICAga25vdyB0byBza2lwIGl0IHdoZW4gdGhlIHBvaW50ZXJzIGdldCB0aGVyZS5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogbmVpdGhlciBoZWFkIG5vciB0YWlsIG1hdGNoLCBhbmQgbmVpdGhlclxuICAgIC8vICAgd2VyZSByZW1vdmVkOyBzbyBmaW5kIHRoZSBgbmV3SGVhZGAga2V5IGluIHRoZVxuICAgIC8vICAgYG9sZEtleVRvSW5kZXhNYXBgLCBhbmQgbW92ZSB0aGF0IG9sZCBwYXJ0J3MgRE9NIGludG8gdGhlXG4gICAgLy8gICBuZXh0IGhlYWQgcG9zaXRpb24gKGJlZm9yZSBgb2xkUGFydHNbb2xkSGVhZF1gKS4gTGFzdCxcbiAgICAvLyAgIG51bGwgdGhlIHBhcnQgaW4gdGhlIGBvbGRQYXJ0YCBhcnJheSBzaW5jZSBpdCB3YXNcbiAgICAvLyAgIHNvbWV3aGVyZSBpbiB0aGUgcmVtYWluaW5nIG9sZFBhcnRzIHN0aWxsIHRvIGJlIHNjYW5uZWRcbiAgICAvLyAgIChiZXR3ZWVuIHRoZSBoZWFkIGFuZCB0YWlsIHBvaW50ZXJzKSBzbyB0aGF0IHdlIGtub3cgdG9cbiAgICAvLyAgIHNraXAgdGhhdCBvbGQgcGFydCBvbiBmdXR1cmUgaXRlcmF0aW9ucy5cbiAgICAvL1xuICAgIC8vICAgICAgICAgb2xkSGVhZCB2ICAgICAgICB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgLSwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgICwgICwgICwgICwgNl0gPC0gc3R1Y2s6IHVwZGF0ZSAmIG1vdmUgMlxuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSAgICBpbnRvIHBsYWNlIGFuZCBhZHZhbmNlXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0hlYWRcbiAgICAvLyAgICAgICAgIG5ld0hlYWQgXiAgICAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIE5vdGUgdGhhdCBmb3IgbW92ZXMvaW5zZXJ0aW9ucyBsaWtlIHRoZSBvbmUgYWJvdmUsIGEgcGFydFxuICAgIC8vICAgaW5zZXJ0ZWQgYXQgdGhlIGhlYWQgcG9pbnRlciBpcyBpbnNlcnRlZCBiZWZvcmUgdGhlXG4gICAgLy8gICBjdXJyZW50IGBvbGRQYXJ0c1tvbGRIZWFkXWAsIGFuZCBhIHBhcnQgaW5zZXJ0ZWQgYXQgdGhlXG4gICAgLy8gICB0YWlsIHBvaW50ZXIgaXMgaW5zZXJ0ZWQgYmVmb3JlIGBuZXdQYXJ0c1tuZXdUYWlsKzFdYC4gVGhlXG4gICAgLy8gICBzZWVtaW5nIGFzeW1tZXRyeSBsaWVzIGluIHRoZSBmYWN0IHRoYXQgbmV3IHBhcnRzIGFyZVxuICAgIC8vICAgbW92ZWQgaW50byBwbGFjZSBvdXRzaWRlIGluLCBzbyB0byB0aGUgcmlnaHQgb2YgdGhlIGhlYWRcbiAgICAvLyAgIHBvaW50ZXIgYXJlIG9sZCBwYXJ0cywgYW5kIHRvIHRoZSByaWdodCBvZiB0aGUgdGFpbFxuICAgIC8vICAgcG9pbnRlciBhcmUgbmV3IHBhcnRzLlxuICAgIC8vXG4gICAgLy8gKiBXZSBhbHdheXMgcmVzdGFydCBiYWNrIGZyb20gdGhlIHRvcCBvZiB0aGUgYWxnb3JpdGhtLFxuICAgIC8vICAgYWxsb3dpbmcgbWF0Y2hpbmcgYW5kIHNpbXBsZSB1cGRhdGVzIGluIHBsYWNlIHRvXG4gICAgLy8gICBjb250aW51ZS4uLlxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiB0aGUgaGVhZCBwb2ludGVycyBvbmNlIGFnYWluIG1hdGNoLCBzb1xuICAgIC8vICAgc2ltcGx5IHVwZGF0ZSBwYXJ0IDEgYW5kIHJlY29yZCBpdCBpbiB0aGUgYG5ld1BhcnRzYFxuICAgIC8vICAgYXJyYXkuICBMYXN0LCBhZHZhbmNlIGJvdGggaGVhZCBwb2ludGVycy5cbiAgICAvL1xuICAgIC8vICAgICAgICAgb2xkSGVhZCB2ICAgICAgICB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgLSwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgMSwgICwgICwgICwgNl0gPC0gaGVhZHMgbWF0Y2hlZDogdXBkYXRlIDFcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICAgYW5kIGFkdmFuY2UgYm90aCBvbGRIZWFkXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICYgbmV3SGVhZFxuICAgIC8vICAgICAgICAgICAgbmV3SGVhZCBeICAgICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogQXMgbWVudGlvbmVkIGFib3ZlLCBpdGVtcyB0aGF0IHdlcmUgbW92ZWQgYXMgYSByZXN1bHQgb2ZcbiAgICAvLyAgIGJlaW5nIHN0dWNrICh0aGUgZmluYWwgZWxzZSBjbGF1c2UgaW4gdGhlIGNvZGUgYmVsb3cpIGFyZVxuICAgIC8vICAgbWFya2VkIHdpdGggbnVsbCwgc28gd2UgYWx3YXlzIGFkdmFuY2Ugb2xkIHBvaW50ZXJzIG92ZXJcbiAgICAvLyAgIHRoZXNlIHNvIHdlJ3JlIGNvbXBhcmluZyB0aGUgbmV4dCBhY3R1YWwgb2xkIHZhbHVlIG9uXG4gICAgLy8gICBlaXRoZXIgZW5kLlxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBgb2xkSGVhZGAgaXMgbnVsbCAoYWxyZWFkeSBwbGFjZWQgaW5cbiAgICAvLyAgIG5ld1BhcnRzKSwgc28gYWR2YW5jZSBgb2xkSGVhZGAuXG4gICAgLy9cbiAgICAvLyAgICAgICAgICAgIG9sZEhlYWQgdiAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdIDwtIG9sZCBoZWFkIGFscmVhZHkgdXNlZDpcbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgMSwgICwgICwgICwgNl0gICAgYWR2YW5jZSBvbGRIZWFkXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdXG4gICAgLy8gICAgICAgICAgICAgICBuZXdIZWFkIF4gICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBOb3RlIGl0J3Mgbm90IGNyaXRpY2FsIHRvIG1hcmsgb2xkIHBhcnRzIGFzIG51bGwgd2hlbiB0aGV5XG4gICAgLy8gICBhcmUgbW92ZWQgZnJvbSBoZWFkIHRvIHRhaWwgb3IgdGFpbCB0byBoZWFkLCBzaW5jZSB0aGV5XG4gICAgLy8gICB3aWxsIGJlIG91dHNpZGUgdGhlIHBvaW50ZXIgcmFuZ2UgYW5kIG5ldmVyIHZpc2l0ZWQgYWdhaW4uXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IEhlcmUgdGhlIG9sZCB0YWlsIGtleSBtYXRjaGVzIHRoZSBuZXcgaGVhZFxuICAgIC8vICAga2V5LCBzbyB0aGUgcGFydCBhdCB0aGUgYG9sZFRhaWxgIHBvc2l0aW9uIGFuZCBtb3ZlIGl0c1xuICAgIC8vICAgRE9NIHRvIHRoZSBuZXcgaGVhZCBwb3NpdGlvbiAoYmVmb3JlIGBvbGRQYXJ0c1tvbGRIZWFkXWApLlxuICAgIC8vICAgTGFzdCwgYWR2YW5jZSBgb2xkVGFpbGAgYW5kIGBuZXdIZWFkYCBwb2ludGVycy5cbiAgICAvL1xuICAgIC8vICAgICAgICAgICAgICAgb2xkSGVhZCB2ICB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgLSwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgMSwgNCwgICwgICwgNl0gPC0gb2xkIHRhaWwgbWF0Y2hlcyBuZXdcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICBoZWFkOiB1cGRhdGUgJiBtb3ZlIDQsXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWR2YW5jZSBvbGRUYWlsICYgbmV3SGVhZFxuICAgIC8vICAgICAgICAgICAgICAgbmV3SGVhZCBeICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogT2xkIGFuZCBuZXcgaGVhZCBrZXlzIG1hdGNoLCBzbyB1cGRhdGUgdGhlXG4gICAgLy8gICBvbGQgaGVhZCBwYXJ0IGluIHBsYWNlLCBhbmQgYWR2YW5jZSB0aGUgYG9sZEhlYWRgIGFuZFxuICAgIC8vICAgYG5ld0hlYWRgIHBvaW50ZXJzLlxuICAgIC8vXG4gICAgLy8gICAgICAgICAgICAgICBvbGRIZWFkIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAtLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFswLCAyLCAxLCA0LCAzLCAgICw2XSA8LSBoZWFkcyBtYXRjaDogdXBkYXRlIDNcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICAgYW5kIGFkdmFuY2Ugb2xkSGVhZCAmXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0hlYWRcbiAgICAvLyAgICAgICAgICAgICAgICAgIG5ld0hlYWQgXiAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIE9uY2UgdGhlIG5ldyBvciBvbGQgcG9pbnRlcnMgbW92ZSBwYXN0IGVhY2ggb3RoZXIgdGhlbiBhbGxcbiAgICAvLyAgIHdlIGhhdmUgbGVmdCBpcyBhZGRpdGlvbnMgKGlmIG9sZCBsaXN0IGV4aGF1c3RlZCkgb3JcbiAgICAvLyAgIHJlbW92YWxzIChpZiBuZXcgbGlzdCBleGhhdXN0ZWQpLiBUaG9zZSBhcmUgaGFuZGxlZCBpbiB0aGVcbiAgICAvLyAgIGZpbmFsIHdoaWxlIGxvb3BzIGF0IHRoZSBlbmQuXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IGBvbGRIZWFkYCBleGNlZWRlZCBgb2xkVGFpbGAsIHNvIHdlJ3JlIGRvbmVcbiAgICAvLyAgIHdpdGggdGhlIG1haW4gbG9vcC4gIENyZWF0ZSB0aGUgcmVtYWluaW5nIHBhcnQgYW5kIGluc2VydFxuICAgIC8vICAgaXQgYXQgdGhlIG5ldyBoZWFkIHBvc2l0aW9uLCBhbmQgdGhlIHVwZGF0ZSBpcyBjb21wbGV0ZS5cbiAgICAvL1xuICAgIC8vICAgICAgICAgICAgICAgICAgIChvbGRIZWFkID4gb2xkVGFpbClcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgLSwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgMSwgNCwgMywgNyAsNl0gPC0gY3JlYXRlIGFuZCBpbnNlcnQgN1xuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XVxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgbmV3SGVhZCBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogTm90ZSB0aGF0IHRoZSBvcmRlciBvZiB0aGUgaWYvZWxzZSBjbGF1c2VzIGlzIG5vdFxuICAgIC8vICAgaW1wb3J0YW50IHRvIHRoZSBhbGdvcml0aG0sIGFzIGxvbmcgYXMgdGhlIG51bGwgY2hlY2tzXG4gICAgLy8gICBjb21lIGZpcnN0ICh0byBlbnN1cmUgd2UncmUgYWx3YXlzIHdvcmtpbmcgb24gdmFsaWQgb2xkXG4gICAgLy8gICBwYXJ0cykgYW5kIHRoYXQgdGhlIGZpbmFsIGVsc2UgY2xhdXNlIGNvbWVzIGxhc3QgKHNpbmNlXG4gICAgLy8gICB0aGF0J3Mgd2hlcmUgdGhlIGV4cGVuc2l2ZSBtb3ZlcyBvY2N1cikuIFRoZSBvcmRlciBvZlxuICAgIC8vICAgcmVtYWluaW5nIGNsYXVzZXMgaXMgaXMganVzdCBhIHNpbXBsZSBndWVzcyBhdCB3aGljaCBjYXNlc1xuICAgIC8vICAgd2lsbCBiZSBtb3N0IGNvbW1vbi5cbiAgICAvL1xuICAgIC8vICogTm90ZSwgd2UgY291bGQgY2FsY3VsYXRlIHRoZSBsb25nZXN0XG4gICAgLy8gICBpbmNyZWFzaW5nIHN1YnNlcXVlbmNlIChMSVMpIG9mIG9sZCBpdGVtcyBpbiBuZXcgcG9zaXRpb24sXG4gICAgLy8gICBhbmQgb25seSBtb3ZlIHRob3NlIG5vdCBpbiB0aGUgTElTIHNldC4gSG93ZXZlciB0aGF0IGNvc3RzXG4gICAgLy8gICBPKG5sb2duKSB0aW1lIGFuZCBhZGRzIGEgYml0IG1vcmUgY29kZSwgYW5kIG9ubHkgaGVscHNcbiAgICAvLyAgIG1ha2UgcmFyZSB0eXBlcyBvZiBtdXRhdGlvbnMgcmVxdWlyZSBmZXdlciBtb3Zlcy4gVGhlXG4gICAgLy8gICBhYm92ZSBoYW5kbGVzIHJlbW92ZXMsIGFkZHMsIHJldmVyc2FsLCBzd2FwcywgYW5kIHNpbmdsZVxuICAgIC8vICAgbW92ZXMgb2YgY29udGlndW91cyBpdGVtcyBpbiBsaW5lYXIgdGltZSwgaW4gdGhlIG1pbmltdW1cbiAgICAvLyAgIG51bWJlciBvZiBtb3Zlcy4gQXMgdGhlIG51bWJlciBvZiBtdWx0aXBsZSBtb3ZlcyB3aGVyZSBMSVNcbiAgICAvLyAgIG1pZ2h0IGhlbHAgYXBwcm9hY2hlcyBhIHJhbmRvbSBzaHVmZmxlLCB0aGUgTElTXG4gICAgLy8gICBvcHRpbWl6YXRpb24gYmVjb21lcyBsZXNzIGhlbHBmdWwsIHNvIGl0IHNlZW1zIG5vdCB3b3J0aFxuICAgIC8vICAgdGhlIGNvZGUgYXQgdGhpcyBwb2ludC4gQ291bGQgcmVjb25zaWRlciBpZiBhIGNvbXBlbGxpbmdcbiAgICAvLyAgIGNhc2UgYXJpc2VzLlxuXG4gICAgd2hpbGUgKG9sZEhlYWQgPD0gb2xkVGFpbCAmJiBuZXdIZWFkIDw9IG5ld1RhaWwpIHtcbiAgICAgIGlmIChvbGRQYXJ0c1tvbGRIZWFkXSA9PT0gbnVsbCkge1xuICAgICAgICAvLyBgbnVsbGAgbWVhbnMgb2xkIHBhcnQgYXQgaGVhZCBoYXMgYWxyZWFkeSBiZWVuIHVzZWRcbiAgICAgICAgLy8gYmVsb3c7IHNraXBcbiAgICAgICAgb2xkSGVhZCsrO1xuICAgICAgfSBlbHNlIGlmIChvbGRQYXJ0c1tvbGRUYWlsXSA9PT0gbnVsbCkge1xuICAgICAgICAvLyBgbnVsbGAgbWVhbnMgb2xkIHBhcnQgYXQgdGFpbCBoYXMgYWxyZWFkeSBiZWVuIHVzZWRcbiAgICAgICAgLy8gYmVsb3c7IHNraXBcbiAgICAgICAgb2xkVGFpbC0tO1xuICAgICAgfSBlbHNlIGlmIChvbGRLZXlzW29sZEhlYWRdID09PSBuZXdLZXlzW25ld0hlYWRdKSB7XG4gICAgICAgIC8vIE9sZCBoZWFkIG1hdGNoZXMgbmV3IGhlYWQ7IHVwZGF0ZSBpbiBwbGFjZVxuICAgICAgICBuZXdQYXJ0c1tuZXdIZWFkXSA9IHNldENoaWxkUGFydFZhbHVlKFxuICAgICAgICAgIG9sZFBhcnRzW29sZEhlYWRdISxcbiAgICAgICAgICBuZXdWYWx1ZXNbbmV3SGVhZF1cbiAgICAgICAgKTtcbiAgICAgICAgb2xkSGVhZCsrO1xuICAgICAgICBuZXdIZWFkKys7XG4gICAgICB9IGVsc2UgaWYgKG9sZEtleXNbb2xkVGFpbF0gPT09IG5ld0tleXNbbmV3VGFpbF0pIHtcbiAgICAgICAgLy8gT2xkIHRhaWwgbWF0Y2hlcyBuZXcgdGFpbDsgdXBkYXRlIGluIHBsYWNlXG4gICAgICAgIG5ld1BhcnRzW25ld1RhaWxdID0gc2V0Q2hpbGRQYXJ0VmFsdWUoXG4gICAgICAgICAgb2xkUGFydHNbb2xkVGFpbF0hLFxuICAgICAgICAgIG5ld1ZhbHVlc1tuZXdUYWlsXVxuICAgICAgICApO1xuICAgICAgICBvbGRUYWlsLS07XG4gICAgICAgIG5ld1RhaWwtLTtcbiAgICAgIH0gZWxzZSBpZiAob2xkS2V5c1tvbGRIZWFkXSA9PT0gbmV3S2V5c1tuZXdUYWlsXSkge1xuICAgICAgICAvLyBPbGQgaGVhZCBtYXRjaGVzIG5ldyB0YWlsOyB1cGRhdGUgYW5kIG1vdmUgdG8gbmV3IHRhaWxcbiAgICAgICAgbmV3UGFydHNbbmV3VGFpbF0gPSBzZXRDaGlsZFBhcnRWYWx1ZShcbiAgICAgICAgICBvbGRQYXJ0c1tvbGRIZWFkXSEsXG4gICAgICAgICAgbmV3VmFsdWVzW25ld1RhaWxdXG4gICAgICAgICk7XG4gICAgICAgIGluc2VydFBhcnQoY29udGFpbmVyUGFydCwgbmV3UGFydHNbbmV3VGFpbCArIDFdLCBvbGRQYXJ0c1tvbGRIZWFkXSEpO1xuICAgICAgICBvbGRIZWFkKys7XG4gICAgICAgIG5ld1RhaWwtLTtcbiAgICAgIH0gZWxzZSBpZiAob2xkS2V5c1tvbGRUYWlsXSA9PT0gbmV3S2V5c1tuZXdIZWFkXSkge1xuICAgICAgICAvLyBPbGQgdGFpbCBtYXRjaGVzIG5ldyBoZWFkOyB1cGRhdGUgYW5kIG1vdmUgdG8gbmV3IGhlYWRcbiAgICAgICAgbmV3UGFydHNbbmV3SGVhZF0gPSBzZXRDaGlsZFBhcnRWYWx1ZShcbiAgICAgICAgICBvbGRQYXJ0c1tvbGRUYWlsXSEsXG4gICAgICAgICAgbmV3VmFsdWVzW25ld0hlYWRdXG4gICAgICAgICk7XG4gICAgICAgIGluc2VydFBhcnQoY29udGFpbmVyUGFydCwgb2xkUGFydHNbb2xkSGVhZF0hLCBvbGRQYXJ0c1tvbGRUYWlsXSEpO1xuICAgICAgICBvbGRUYWlsLS07XG4gICAgICAgIG5ld0hlYWQrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChuZXdLZXlUb0luZGV4TWFwID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBMYXppbHkgZ2VuZXJhdGUga2V5LXRvLWluZGV4IG1hcHMsIHVzZWQgZm9yIHJlbW92YWxzICZcbiAgICAgICAgICAvLyBtb3ZlcyBiZWxvd1xuICAgICAgICAgIG5ld0tleVRvSW5kZXhNYXAgPSBnZW5lcmF0ZU1hcChuZXdLZXlzLCBuZXdIZWFkLCBuZXdUYWlsKTtcbiAgICAgICAgICBvbGRLZXlUb0luZGV4TWFwID0gZ2VuZXJhdGVNYXAob2xkS2V5cywgb2xkSGVhZCwgb2xkVGFpbCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFuZXdLZXlUb0luZGV4TWFwLmhhcyhvbGRLZXlzW29sZEhlYWRdKSkge1xuICAgICAgICAgIC8vIE9sZCBoZWFkIGlzIG5vIGxvbmdlciBpbiBuZXcgbGlzdDsgcmVtb3ZlXG4gICAgICAgICAgcmVtb3ZlUGFydChvbGRQYXJ0c1tvbGRIZWFkXSEpO1xuICAgICAgICAgIG9sZEhlYWQrKztcbiAgICAgICAgfSBlbHNlIGlmICghbmV3S2V5VG9JbmRleE1hcC5oYXMob2xkS2V5c1tvbGRUYWlsXSkpIHtcbiAgICAgICAgICAvLyBPbGQgdGFpbCBpcyBubyBsb25nZXIgaW4gbmV3IGxpc3Q7IHJlbW92ZVxuICAgICAgICAgIHJlbW92ZVBhcnQob2xkUGFydHNbb2xkVGFpbF0hKTtcbiAgICAgICAgICBvbGRUYWlsLS07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gQW55IG1pc21hdGNoZXMgYXQgdGhpcyBwb2ludCBhcmUgZHVlIHRvIGFkZGl0aW9ucyBvclxuICAgICAgICAgIC8vIG1vdmVzOyBzZWUgaWYgd2UgaGF2ZSBhbiBvbGQgcGFydCB3ZSBjYW4gcmV1c2UgYW5kIG1vdmVcbiAgICAgICAgICAvLyBpbnRvIHBsYWNlXG4gICAgICAgICAgY29uc3Qgb2xkSW5kZXggPSBvbGRLZXlUb0luZGV4TWFwLmdldChuZXdLZXlzW25ld0hlYWRdKTtcbiAgICAgICAgICBjb25zdCBvbGRQYXJ0ID0gb2xkSW5kZXggIT09IHVuZGVmaW5lZCA/IG9sZFBhcnRzW29sZEluZGV4XSA6IG51bGw7XG4gICAgICAgICAgaWYgKG9sZFBhcnQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIC8vIE5vIG9sZCBwYXJ0IGZvciB0aGlzIHZhbHVlOyBjcmVhdGUgYSBuZXcgb25lIGFuZFxuICAgICAgICAgICAgLy8gaW5zZXJ0IGl0XG4gICAgICAgICAgICBjb25zdCBuZXdQYXJ0ID0gaW5zZXJ0UGFydChjb250YWluZXJQYXJ0LCBvbGRQYXJ0c1tvbGRIZWFkXSEpO1xuICAgICAgICAgICAgc2V0Q2hpbGRQYXJ0VmFsdWUobmV3UGFydCwgbmV3VmFsdWVzW25ld0hlYWRdKTtcbiAgICAgICAgICAgIG5ld1BhcnRzW25ld0hlYWRdID0gbmV3UGFydDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUmV1c2Ugb2xkIHBhcnRcbiAgICAgICAgICAgIG5ld1BhcnRzW25ld0hlYWRdID0gc2V0Q2hpbGRQYXJ0VmFsdWUob2xkUGFydCwgbmV3VmFsdWVzW25ld0hlYWRdKTtcbiAgICAgICAgICAgIGluc2VydFBhcnQoY29udGFpbmVyUGFydCwgb2xkUGFydHNbb2xkSGVhZF0hLCBvbGRQYXJ0KTtcbiAgICAgICAgICAgIC8vIFRoaXMgbWFya3MgdGhlIG9sZCBwYXJ0IGFzIGhhdmluZyBiZWVuIHVzZWQsIHNvIHRoYXRcbiAgICAgICAgICAgIC8vIGl0IHdpbGwgYmUgc2tpcHBlZCBpbiB0aGUgZmlyc3QgdHdvIGNoZWNrcyBhYm92ZVxuICAgICAgICAgICAgb2xkUGFydHNbb2xkSW5kZXggYXMgbnVtYmVyXSA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIG5ld0hlYWQrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBBZGQgcGFydHMgZm9yIGFueSByZW1haW5pbmcgbmV3IHZhbHVlc1xuICAgIHdoaWxlIChuZXdIZWFkIDw9IG5ld1RhaWwpIHtcbiAgICAgIC8vIEZvciBhbGwgcmVtYWluaW5nIGFkZGl0aW9ucywgd2UgaW5zZXJ0IGJlZm9yZSBsYXN0IG5ld1xuICAgICAgLy8gdGFpbCwgc2luY2Ugb2xkIHBvaW50ZXJzIGFyZSBubyBsb25nZXIgdmFsaWRcbiAgICAgIGNvbnN0IG5ld1BhcnQgPSBpbnNlcnRQYXJ0KGNvbnRhaW5lclBhcnQsIG5ld1BhcnRzW25ld1RhaWwgKyAxXSk7XG4gICAgICBzZXRDaGlsZFBhcnRWYWx1ZShuZXdQYXJ0LCBuZXdWYWx1ZXNbbmV3SGVhZF0pO1xuICAgICAgbmV3UGFydHNbbmV3SGVhZCsrXSA9IG5ld1BhcnQ7XG4gICAgfVxuICAgIC8vIFJlbW92ZSBhbnkgcmVtYWluaW5nIHVudXNlZCBvbGQgcGFydHNcbiAgICB3aGlsZSAob2xkSGVhZCA8PSBvbGRUYWlsKSB7XG4gICAgICBjb25zdCBvbGRQYXJ0ID0gb2xkUGFydHNbb2xkSGVhZCsrXTtcbiAgICAgIGlmIChvbGRQYXJ0ICE9PSBudWxsKSB7XG4gICAgICAgIHJlbW92ZVBhcnQob2xkUGFydCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gU2F2ZSBvcmRlciBvZiBuZXcgcGFydHMgZm9yIG5leHQgcm91bmRcbiAgICB0aGlzLl9pdGVtS2V5cyA9IG5ld0tleXM7XG4gICAgLy8gRGlyZWN0bHkgc2V0IHBhcnQgdmFsdWUsIGJ5cGFzc2luZyBpdCdzIGRpcnR5LWNoZWNraW5nXG4gICAgc2V0Q29tbWl0dGVkVmFsdWUoY29udGFpbmVyUGFydCwgbmV3UGFydHMpO1xuICAgIHJldHVybiBub0NoYW5nZTtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlcGVhdERpcmVjdGl2ZUZuIHtcbiAgPFQ+KFxuICAgIGl0ZW1zOiBJdGVyYWJsZTxUPixcbiAgICBrZXlGbk9yVGVtcGxhdGU6IEtleUZuPFQ+IHwgSXRlbVRlbXBsYXRlPFQ+LFxuICAgIHRlbXBsYXRlPzogSXRlbVRlbXBsYXRlPFQ+XG4gICk6IHVua25vd247XG4gIDxUPihpdGVtczogSXRlcmFibGU8VD4sIHRlbXBsYXRlOiBJdGVtVGVtcGxhdGU8VD4pOiB1bmtub3duO1xuICA8VD4oXG4gICAgaXRlbXM6IEl0ZXJhYmxlPFQ+LFxuICAgIGtleUZuOiBLZXlGbjxUPiB8IEl0ZW1UZW1wbGF0ZTxUPixcbiAgICB0ZW1wbGF0ZTogSXRlbVRlbXBsYXRlPFQ+XG4gICk6IHVua25vd247XG59XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCByZXBlYXRzIGEgc2VyaWVzIG9mIHZhbHVlcyAodXN1YWxseSBgVGVtcGxhdGVSZXN1bHRzYClcbiAqIGdlbmVyYXRlZCBmcm9tIGFuIGl0ZXJhYmxlLCBhbmQgdXBkYXRlcyB0aG9zZSBpdGVtcyBlZmZpY2llbnRseSB3aGVuIHRoZVxuICogaXRlcmFibGUgY2hhbmdlcyBiYXNlZCBvbiB1c2VyLXByb3ZpZGVkIGBrZXlzYCBhc3NvY2lhdGVkIHdpdGggZWFjaCBpdGVtLlxuICpcbiAqIE5vdGUgdGhhdCBpZiBhIGBrZXlGbmAgaXMgcHJvdmlkZWQsIHN0cmljdCBrZXktdG8tRE9NIG1hcHBpbmcgaXMgbWFpbnRhaW5lZCxcbiAqIG1lYW5pbmcgcHJldmlvdXMgRE9NIGZvciBhIGdpdmVuIGtleSBpcyBtb3ZlZCBpbnRvIHRoZSBuZXcgcG9zaXRpb24gaWZcbiAqIG5lZWRlZCwgYW5kIERPTSB3aWxsIG5ldmVyIGJlIHJldXNlZCB3aXRoIHZhbHVlcyBmb3IgZGlmZmVyZW50IGtleXMgKG5ldyBET01cbiAqIHdpbGwgYWx3YXlzIGJlIGNyZWF0ZWQgZm9yIG5ldyBrZXlzKS4gVGhpcyBpcyBnZW5lcmFsbHkgdGhlIG1vc3QgZWZmaWNpZW50XG4gKiB3YXkgdG8gdXNlIGByZXBlYXRgIHNpbmNlIGl0IHBlcmZvcm1zIG1pbmltdW0gdW5uZWNlc3Nhcnkgd29yayBmb3IgaW5zZXJ0aW9uc1xuICogYW5kIHJlbW92YWxzLlxuICpcbiAqIFRoZSBga2V5Rm5gIHRha2VzIHR3byBwYXJhbWV0ZXJzLCB0aGUgaXRlbSBhbmQgaXRzIGluZGV4LCBhbmQgcmV0dXJucyBhIHVuaXF1ZSBrZXkgdmFsdWUuXG4gKlxuICogYGBganNcbiAqIGh0bWxgXG4gKiAgIDxvbD5cbiAqICAgICAke3JlcGVhdCh0aGlzLml0ZW1zLCAoaXRlbSkgPT4gaXRlbS5pZCwgKGl0ZW0sIGluZGV4KSA9PiB7XG4gKiAgICAgICByZXR1cm4gaHRtbGA8bGk+JHtpbmRleH06ICR7aXRlbS5uYW1lfTwvbGk+YDtcbiAqICAgICB9KX1cbiAqICAgPC9vbD5cbiAqIGBcbiAqIGBgYFxuICpcbiAqICoqSW1wb3J0YW50Kio6IElmIHByb3ZpZGluZyBhIGBrZXlGbmAsIGtleXMgKm11c3QqIGJlIHVuaXF1ZSBmb3IgYWxsIGl0ZW1zIGluIGFcbiAqIGdpdmVuIGNhbGwgdG8gYHJlcGVhdGAuIFRoZSBiZWhhdmlvciB3aGVuIHR3byBvciBtb3JlIGl0ZW1zIGhhdmUgdGhlIHNhbWUga2V5XG4gKiBpcyB1bmRlZmluZWQuXG4gKlxuICogSWYgbm8gYGtleUZuYCBpcyBwcm92aWRlZCwgdGhpcyBkaXJlY3RpdmUgd2lsbCBwZXJmb3JtIHNpbWlsYXIgdG8gbWFwcGluZ1xuICogaXRlbXMgdG8gdmFsdWVzLCBhbmQgRE9NIHdpbGwgYmUgcmV1c2VkIGFnYWluc3QgcG90ZW50aWFsbHkgZGlmZmVyZW50IGl0ZW1zLlxuICovXG5leHBvcnQgY29uc3QgcmVwZWF0ID0gZGlyZWN0aXZlKFJlcGVhdERpcmVjdGl2ZSkgYXMgUmVwZWF0RGlyZWN0aXZlRm47XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7UmVwZWF0RGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0F0dHJpYnV0ZVBhcnQsIG5vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge1xuICBkaXJlY3RpdmUsXG4gIERpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbiAgUGFydEluZm8sXG4gIFBhcnRUeXBlLFxufSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuXG4vKipcbiAqIEEga2V5LXZhbHVlIHNldCBvZiBDU1MgcHJvcGVydGllcyBhbmQgdmFsdWVzLlxuICpcbiAqIFRoZSBrZXkgc2hvdWxkIGJlIGVpdGhlciBhIHZhbGlkIENTUyBwcm9wZXJ0eSBuYW1lIHN0cmluZywgbGlrZVxuICogYCdiYWNrZ3JvdW5kLWNvbG9yJ2AsIG9yIGEgdmFsaWQgSmF2YVNjcmlwdCBjYW1lbCBjYXNlIHByb3BlcnR5IG5hbWVcbiAqIGZvciBDU1NTdHlsZURlY2xhcmF0aW9uIGxpa2UgYGJhY2tncm91bmRDb2xvcmAuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3R5bGVJbmZvIHtcbiAgcmVhZG9ubHkgW25hbWU6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZCB8IG51bGw7XG59XG5cbmNsYXNzIFN0eWxlTWFwRGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzPzogU2V0PHN0cmluZz47XG5cbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICAgIGlmIChcbiAgICAgIHBhcnRJbmZvLnR5cGUgIT09IFBhcnRUeXBlLkFUVFJJQlVURSB8fFxuICAgICAgcGFydEluZm8ubmFtZSAhPT0gJ3N0eWxlJyB8fFxuICAgICAgKHBhcnRJbmZvLnN0cmluZ3M/Lmxlbmd0aCBhcyBudW1iZXIpID4gMlxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnVGhlIGBzdHlsZU1hcGAgZGlyZWN0aXZlIG11c3QgYmUgdXNlZCBpbiB0aGUgYHN0eWxlYCBhdHRyaWJ1dGUgJyArXG4gICAgICAgICAgJ2FuZCBtdXN0IGJlIHRoZSBvbmx5IHBhcnQgaW4gdGhlIGF0dHJpYnV0ZS4nXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlcihzdHlsZUluZm86IFN0eWxlSW5mbykge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhzdHlsZUluZm8pLnJlZHVjZSgoc3R5bGUsIHByb3ApID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gc3R5bGVJbmZvW3Byb3BdO1xuICAgICAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHN0eWxlO1xuICAgICAgfVxuICAgICAgLy8gQ29udmVydCBwcm9wZXJ0eSBuYW1lcyBmcm9tIGNhbWVsLWNhc2UgdG8gZGFzaC1jYXNlLCBpLmUuOlxuICAgICAgLy8gIGBiYWNrZ3JvdW5kQ29sb3JgIC0+IGBiYWNrZ3JvdW5kLWNvbG9yYFxuICAgICAgLy8gVmVuZG9yLXByZWZpeGVkIG5hbWVzIG5lZWQgYW4gZXh0cmEgYC1gIGFwcGVuZGVkIHRvIGZyb250OlxuICAgICAgLy8gIGB3ZWJraXRBcHBlYXJhbmNlYCAtPiBgLXdlYmtpdC1hcHBlYXJhbmNlYFxuICAgICAgLy8gRXhjZXB0aW9uIGlzIGFueSBwcm9wZXJ0eSBuYW1lIGNvbnRhaW5pbmcgYSBkYXNoLCBpbmNsdWRpbmdcbiAgICAgIC8vIGN1c3RvbSBwcm9wZXJ0aWVzOyB3ZSBhc3N1bWUgdGhlc2UgYXJlIGFscmVhZHkgZGFzaC1jYXNlZCBpLmUuOlxuICAgICAgLy8gIGAtLW15LWJ1dHRvbi1jb2xvcmAgLS0+IGAtLW15LWJ1dHRvbi1jb2xvcmBcbiAgICAgIHByb3AgPSBwcm9wXG4gICAgICAgIC5yZXBsYWNlKC8oPzpeKHdlYmtpdHxtb3p8bXN8byl8KSg/PVtBLVpdKS9nLCAnLSQmJylcbiAgICAgICAgLnRvTG93ZXJDYXNlKCk7XG4gICAgICByZXR1cm4gc3R5bGUgKyBgJHtwcm9wfToke3ZhbHVlfTtgO1xuICAgIH0sICcnKTtcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShwYXJ0OiBBdHRyaWJ1dGVQYXJ0LCBbc3R5bGVJbmZvXTogRGlyZWN0aXZlUGFyYW1ldGVyczx0aGlzPikge1xuICAgIGNvbnN0IHtzdHlsZX0gPSBwYXJ0LmVsZW1lbnQgYXMgSFRNTEVsZW1lbnQ7XG5cbiAgICBpZiAodGhpcy5fcHJldmlvdXNTdHlsZVByb3BlcnRpZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fcHJldmlvdXNTdHlsZVByb3BlcnRpZXMgPSBuZXcgU2V0KCk7XG4gICAgICBmb3IgKGNvbnN0IG5hbWUgaW4gc3R5bGVJbmZvKSB7XG4gICAgICAgIHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzLmFkZChuYW1lKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnJlbmRlcihzdHlsZUluZm8pO1xuICAgIH1cblxuICAgIC8vIFJlbW92ZSBvbGQgcHJvcGVydGllcyB0aGF0IG5vIGxvbmdlciBleGlzdCBpbiBzdHlsZUluZm9cbiAgICAvLyBXZSB1c2UgZm9yRWFjaCgpIGluc3RlYWQgb2YgZm9yLW9mIHNvIHRoYXQgcmUgZG9uJ3QgcmVxdWlyZSBkb3duLWxldmVsXG4gICAgLy8gaXRlcmF0aW9uLlxuICAgIHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzIS5mb3JFYWNoKChuYW1lKSA9PiB7XG4gICAgICAvLyBJZiB0aGUgbmFtZSBpc24ndCBpbiBzdHlsZUluZm8gb3IgaXQncyBudWxsL3VuZGVmaW5lZFxuICAgICAgaWYgKHN0eWxlSW5mb1tuYW1lXSA9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzIS5kZWxldGUobmFtZSk7XG4gICAgICAgIGlmIChuYW1lLmluY2x1ZGVzKCctJykpIHtcbiAgICAgICAgICBzdHlsZS5yZW1vdmVQcm9wZXJ0eShuYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBOb3RlIHJlc2V0IHVzaW5nIGVtcHR5IHN0cmluZyAodnMgbnVsbCkgYXMgSUUxMSBkb2VzIG5vdCBhbHdheXNcbiAgICAgICAgICAvLyByZXNldCB2aWEgbnVsbCAoaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0VsZW1lbnRDU1NJbmxpbmVTdHlsZS9zdHlsZSNzZXR0aW5nX3N0eWxlcylcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICAgIChzdHlsZSBhcyBhbnkpW25hbWVdID0gJyc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIEFkZCBvciB1cGRhdGUgcHJvcGVydGllc1xuICAgIGZvciAoY29uc3QgbmFtZSBpbiBzdHlsZUluZm8pIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gc3R5bGVJbmZvW25hbWVdO1xuICAgICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgdGhpcy5fcHJldmlvdXNTdHlsZVByb3BlcnRpZXMuYWRkKG5hbWUpO1xuICAgICAgICBpZiAobmFtZS5pbmNsdWRlcygnLScpKSB7XG4gICAgICAgICAgc3R5bGUuc2V0UHJvcGVydHkobmFtZSwgdmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICAgICAgKHN0eWxlIGFzIGFueSlbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGRpcmVjdGl2ZSB0aGF0IGFwcGxpZXMgQ1NTIHByb3BlcnRpZXMgdG8gYW4gZWxlbWVudC5cbiAqXG4gKiBgc3R5bGVNYXBgIGNhbiBvbmx5IGJlIHVzZWQgaW4gdGhlIGBzdHlsZWAgYXR0cmlidXRlIGFuZCBtdXN0IGJlIHRoZSBvbmx5XG4gKiBleHByZXNzaW9uIGluIHRoZSBhdHRyaWJ1dGUuIEl0IHRha2VzIHRoZSBwcm9wZXJ0eSBuYW1lcyBpbiB0aGUgYHN0eWxlSW5mb2BcbiAqIG9iamVjdCBhbmQgYWRkcyB0aGUgcHJvcGVydHkgdmFsdWVzIGFzIENTUyBwcm9wZXJ0aWVzLiBQcm9wZXJ0eSBuYW1lcyB3aXRoXG4gKiBkYXNoZXMgKGAtYCkgYXJlIGFzc3VtZWQgdG8gYmUgdmFsaWQgQ1NTIHByb3BlcnR5IG5hbWVzIGFuZCBzZXQgb24gdGhlXG4gKiBlbGVtZW50J3Mgc3R5bGUgb2JqZWN0IHVzaW5nIGBzZXRQcm9wZXJ0eSgpYC4gTmFtZXMgd2l0aG91dCBkYXNoZXMgYXJlXG4gKiBhc3N1bWVkIHRvIGJlIGNhbWVsQ2FzZWQgSmF2YVNjcmlwdCBwcm9wZXJ0eSBuYW1lcyBhbmQgc2V0IG9uIHRoZSBlbGVtZW50J3NcbiAqIHN0eWxlIG9iamVjdCB1c2luZyBwcm9wZXJ0eSBhc3NpZ25tZW50LCBhbGxvd2luZyB0aGUgc3R5bGUgb2JqZWN0IHRvXG4gKiB0cmFuc2xhdGUgSmF2YVNjcmlwdC1zdHlsZSBuYW1lcyB0byBDU1MgcHJvcGVydHkgbmFtZXMuXG4gKlxuICogRm9yIGV4YW1wbGUgYHN0eWxlTWFwKHtiYWNrZ3JvdW5kQ29sb3I6ICdyZWQnLCAnYm9yZGVyLXRvcCc6ICc1cHgnLCAnLS1zaXplJzpcbiAqICcwJ30pYCBzZXRzIHRoZSBgYmFja2dyb3VuZC1jb2xvcmAsIGBib3JkZXItdG9wYCBhbmQgYC0tc2l6ZWAgcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0gc3R5bGVJbmZvXG4gKi9cbmV4cG9ydCBjb25zdCBzdHlsZU1hcCA9IGRpcmVjdGl2ZShTdHlsZU1hcERpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7U3R5bGVNYXBEaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjAgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7bm9DaGFuZ2V9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7ZGlyZWN0aXZlLCBEaXJlY3RpdmUsIFBhcnRJbmZvLCBQYXJ0VHlwZX0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcblxuY2xhc3MgVGVtcGxhdGVDb250ZW50RGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgcHJpdmF0ZSBfcHJldmlvdXNUZW1wbGF0ZT86IEhUTUxUZW1wbGF0ZUVsZW1lbnQ7XG5cbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICAgIGlmIChwYXJ0SW5mby50eXBlICE9PSBQYXJ0VHlwZS5DSElMRCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCd0ZW1wbGF0ZUNvbnRlbnQgY2FuIG9ubHkgYmUgdXNlZCBpbiBjaGlsZCBiaW5kaW5ncycpO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlcih0ZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudCkge1xuICAgIGlmICh0aGlzLl9wcmV2aW91c1RlbXBsYXRlID09PSB0ZW1wbGF0ZSkge1xuICAgICAgcmV0dXJuIG5vQ2hhbmdlO1xuICAgIH1cbiAgICB0aGlzLl9wcmV2aW91c1RlbXBsYXRlID0gdGVtcGxhdGU7XG4gICAgcmV0dXJuIGRvY3VtZW50LmltcG9ydE5vZGUodGVtcGxhdGUuY29udGVudCwgdHJ1ZSk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW5kZXJzIHRoZSBjb250ZW50IG9mIGEgdGVtcGxhdGUgZWxlbWVudCBhcyBIVE1MLlxuICpcbiAqIE5vdGUsIHRoZSB0ZW1wbGF0ZSBzaG91bGQgYmUgZGV2ZWxvcGVyIGNvbnRyb2xsZWQgYW5kIG5vdCB1c2VyIGNvbnRyb2xsZWQuXG4gKiBSZW5kZXJpbmcgYSB1c2VyLWNvbnRyb2xsZWQgdGVtcGxhdGUgd2l0aCB0aGlzIGRpcmVjdGl2ZVxuICogY291bGQgbGVhZCB0byBjcm9zcy1zaXRlLXNjcmlwdGluZyB2dWxuZXJhYmlsaXRpZXMuXG4gKi9cbmV4cG9ydCBjb25zdCB0ZW1wbGF0ZUNvbnRlbnQgPSBkaXJlY3RpdmUoVGVtcGxhdGVDb250ZW50RGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtUZW1wbGF0ZUNvbnRlbnREaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7bm90aGluZywgVGVtcGxhdGVSZXN1bHQsIG5vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgRGlyZWN0aXZlLCBQYXJ0SW5mbywgUGFydFR5cGV9IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5cbmNvbnN0IEhUTUxfUkVTVUxUID0gMTtcblxuZXhwb3J0IGNsYXNzIFVuc2FmZUhUTUxEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBzdGF0aWMgZGlyZWN0aXZlTmFtZSA9ICd1bnNhZmVIVE1MJztcbiAgc3RhdGljIHJlc3VsdFR5cGUgPSBIVE1MX1JFU1VMVDtcblxuICBwcml2YXRlIF92YWx1ZTogdW5rbm93biA9IG5vdGhpbmc7XG4gIHByaXZhdGUgX3RlbXBsYXRlUmVzdWx0PzogVGVtcGxhdGVSZXN1bHQ7XG5cbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICAgIGlmIChwYXJ0SW5mby50eXBlICE9PSBQYXJ0VHlwZS5DSElMRCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgJHtcbiAgICAgICAgICAodGhpcy5jb25zdHJ1Y3RvciBhcyB0eXBlb2YgVW5zYWZlSFRNTERpcmVjdGl2ZSkuZGlyZWN0aXZlTmFtZVxuICAgICAgICB9KCkgY2FuIG9ubHkgYmUgdXNlZCBpbiBjaGlsZCBiaW5kaW5nc2BcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcmVuZGVyKHZhbHVlOiBzdHJpbmcgfCB0eXBlb2Ygbm90aGluZyB8IHR5cGVvZiBub0NoYW5nZSB8IHVuZGVmaW5lZCB8IG51bGwpIHtcbiAgICBpZiAodmFsdWUgPT09IG5vdGhpbmcgfHwgdmFsdWUgPT0gbnVsbCkge1xuICAgICAgdGhpcy5fdGVtcGxhdGVSZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICByZXR1cm4gKHRoaXMuX3ZhbHVlID0gdmFsdWUpO1xuICAgIH1cbiAgICBpZiAodmFsdWUgPT09IG5vQ2hhbmdlKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgdmFsdWUgIT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYCR7XG4gICAgICAgICAgKHRoaXMuY29uc3RydWN0b3IgYXMgdHlwZW9mIFVuc2FmZUhUTUxEaXJlY3RpdmUpLmRpcmVjdGl2ZU5hbWVcbiAgICAgICAgfSgpIGNhbGxlZCB3aXRoIGEgbm9uLXN0cmluZyB2YWx1ZWBcbiAgICAgICk7XG4gICAgfVxuICAgIGlmICh2YWx1ZSA9PT0gdGhpcy5fdmFsdWUpIHtcbiAgICAgIHJldHVybiB0aGlzLl90ZW1wbGF0ZVJlc3VsdDtcbiAgICB9XG4gICAgdGhpcy5fdmFsdWUgPSB2YWx1ZTtcbiAgICBjb25zdCBzdHJpbmdzID0gW3ZhbHVlXSBhcyB1bmtub3duIGFzIFRlbXBsYXRlU3RyaW5nc0FycmF5O1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgKHN0cmluZ3MgYXMgYW55KS5yYXcgPSBzdHJpbmdzO1xuICAgIC8vIFdBUk5JTkc6IGltcGVyc29uYXRpbmcgYSBUZW1wbGF0ZVJlc3VsdCBsaWtlIHRoaXMgaXMgZXh0cmVtZWx5XG4gICAgLy8gZGFuZ2Vyb3VzLiBUaGlyZC1wYXJ0eSBkaXJlY3RpdmVzIHNob3VsZCBub3QgZG8gdGhpcy5cbiAgICByZXR1cm4gKHRoaXMuX3RlbXBsYXRlUmVzdWx0ID0ge1xuICAgICAgLy8gQ2FzdCB0byBhIGtub3duIHNldCBvZiBpbnRlZ2VycyB0aGF0IHNhdGlzZnkgUmVzdWx0VHlwZSBzbyB0aGF0IHdlXG4gICAgICAvLyBkb24ndCBoYXZlIHRvIGV4cG9ydCBSZXN1bHRUeXBlIGFuZCBwb3NzaWJseSBlbmNvdXJhZ2UgdGhpcyBwYXR0ZXJuLlxuICAgICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICAgIFsnXyRsaXRUeXBlJCddOiAodGhpcy5jb25zdHJ1Y3RvciBhcyB0eXBlb2YgVW5zYWZlSFRNTERpcmVjdGl2ZSlcbiAgICAgICAgLnJlc3VsdFR5cGUgYXMgMSB8IDIsXG4gICAgICBzdHJpbmdzLFxuICAgICAgdmFsdWVzOiBbXSxcbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbmRlcnMgdGhlIHJlc3VsdCBhcyBIVE1MLCByYXRoZXIgdGhhbiB0ZXh0LlxuICpcbiAqIFRoZSB2YWx1ZXMgYHVuZGVmaW5lZGAsIGBudWxsYCwgYW5kIGBub3RoaW5nYCwgd2lsbCBhbGwgcmVzdWx0IGluIG5vIGNvbnRlbnRcbiAqIChlbXB0eSBzdHJpbmcpIGJlaW5nIHJlbmRlcmVkLlxuICpcbiAqIE5vdGUsIHRoaXMgaXMgdW5zYWZlIHRvIHVzZSB3aXRoIGFueSB1c2VyLXByb3ZpZGVkIGlucHV0IHRoYXQgaGFzbid0IGJlZW5cbiAqIHNhbml0aXplZCBvciBlc2NhcGVkLCBhcyBpdCBtYXkgbGVhZCB0byBjcm9zcy1zaXRlLXNjcmlwdGluZ1xuICogdnVsbmVyYWJpbGl0aWVzLlxuICovXG5leHBvcnQgY29uc3QgdW5zYWZlSFRNTCA9IGRpcmVjdGl2ZShVbnNhZmVIVE1MRGlyZWN0aXZlKTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge2RpcmVjdGl2ZX0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7VW5zYWZlSFRNTERpcmVjdGl2ZX0gZnJvbSAnLi91bnNhZmUtaHRtbC5qcyc7XG5cbmNvbnN0IFNWR19SRVNVTFQgPSAyO1xuXG5jbGFzcyBVbnNhZmVTVkdEaXJlY3RpdmUgZXh0ZW5kcyBVbnNhZmVIVE1MRGlyZWN0aXZlIHtcbiAgc3RhdGljIG92ZXJyaWRlIGRpcmVjdGl2ZU5hbWUgPSAndW5zYWZlU1ZHJztcbiAgc3RhdGljIG92ZXJyaWRlIHJlc3VsdFR5cGUgPSBTVkdfUkVTVUxUO1xufVxuXG4vKipcbiAqIFJlbmRlcnMgdGhlIHJlc3VsdCBhcyBTVkcsIHJhdGhlciB0aGFuIHRleHQuXG4gKlxuICogVGhlIHZhbHVlcyBgdW5kZWZpbmVkYCwgYG51bGxgLCBhbmQgYG5vdGhpbmdgLCB3aWxsIGFsbCByZXN1bHQgaW4gbm8gY29udGVudFxuICogKGVtcHR5IHN0cmluZykgYmVpbmcgcmVuZGVyZWQuXG4gKlxuICogTm90ZSwgdGhpcyBpcyB1bnNhZmUgdG8gdXNlIHdpdGggYW55IHVzZXItcHJvdmlkZWQgaW5wdXQgdGhhdCBoYXNuJ3QgYmVlblxuICogc2FuaXRpemVkIG9yIGVzY2FwZWQsIGFzIGl0IG1heSBsZWFkIHRvIGNyb3NzLXNpdGUtc2NyaXB0aW5nXG4gKiB2dWxuZXJhYmlsaXRpZXMuXG4gKi9cbmV4cG9ydCBjb25zdCB1bnNhZmVTVkcgPSBkaXJlY3RpdmUoVW5zYWZlU1ZHRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtVbnNhZmVTVkdEaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7UGFydCwgbm9DaGFuZ2V9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7ZGlyZWN0aXZlfSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtpc1ByaW1pdGl2ZX0gZnJvbSAnLi4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuaW1wb3J0IHtBc3luY0RpcmVjdGl2ZX0gZnJvbSAnLi4vYXN5bmMtZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7UGF1c2VyLCBQc2V1ZG9XZWFrUmVmfSBmcm9tICcuL3ByaXZhdGUtYXN5bmMtaGVscGVycy5qcyc7XG5cbmNvbnN0IGlzUHJvbWlzZSA9ICh4OiB1bmtub3duKSA9PiB7XG4gIHJldHVybiAhaXNQcmltaXRpdmUoeCkgJiYgdHlwZW9mICh4IGFzIHt0aGVuPzogdW5rbm93bn0pLnRoZW4gPT09ICdmdW5jdGlvbic7XG59O1xuLy8gRWZmZWN0aXZlbHkgaW5maW5pdHksIGJ1dCBhIFNNSS5cbmNvbnN0IF9pbmZpbml0eSA9IDB4M2ZmZmZmZmY7XG5cbmV4cG9ydCBjbGFzcyBVbnRpbERpcmVjdGl2ZSBleHRlbmRzIEFzeW5jRGlyZWN0aXZlIHtcbiAgcHJpdmF0ZSBfX2xhc3RSZW5kZXJlZEluZGV4OiBudW1iZXIgPSBfaW5maW5pdHk7XG4gIHByaXZhdGUgX192YWx1ZXM6IHVua25vd25bXSA9IFtdO1xuICBwcml2YXRlIF9fd2Vha1RoaXMgPSBuZXcgUHNldWRvV2Vha1JlZih0aGlzKTtcbiAgcHJpdmF0ZSBfX3BhdXNlciA9IG5ldyBQYXVzZXIoKTtcblxuICByZW5kZXIoLi4uYXJnczogQXJyYXk8dW5rbm93bj4pIHtcbiAgICByZXR1cm4gYXJncy5maW5kKCh4KSA9PiAhaXNQcm9taXNlKHgpKSA/PyBub0NoYW5nZTtcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShfcGFydDogUGFydCwgYXJnczogQXJyYXk8dW5rbm93bj4pIHtcbiAgICBjb25zdCBwcmV2aW91c1ZhbHVlcyA9IHRoaXMuX192YWx1ZXM7XG4gICAgbGV0IHByZXZpb3VzTGVuZ3RoID0gcHJldmlvdXNWYWx1ZXMubGVuZ3RoO1xuICAgIHRoaXMuX192YWx1ZXMgPSBhcmdzO1xuXG4gICAgY29uc3Qgd2Vha1RoaXMgPSB0aGlzLl9fd2Vha1RoaXM7XG4gICAgY29uc3QgcGF1c2VyID0gdGhpcy5fX3BhdXNlcjtcblxuICAgIC8vIElmIG91ciBpbml0aWFsIHJlbmRlciBvY2N1cnMgd2hpbGUgZGlzY29ubmVjdGVkLCBlbnN1cmUgdGhhdCB0aGUgcGF1c2VyXG4gICAgLy8gYW5kIHdlYWtUaGlzIGFyZSBpbiB0aGUgZGlzY29ubmVjdGVkIHN0YXRlXG4gICAgaWYgKCF0aGlzLmlzQ29ubmVjdGVkKSB7XG4gICAgICB0aGlzLmRpc2Nvbm5lY3RlZCgpO1xuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gSWYgd2UndmUgcmVuZGVyZWQgYSBoaWdoZXItcHJpb3JpdHkgdmFsdWUgYWxyZWFkeSwgc3RvcC5cbiAgICAgIGlmIChpID4gdGhpcy5fX2xhc3RSZW5kZXJlZEluZGV4KSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB2YWx1ZSA9IGFyZ3NbaV07XG5cbiAgICAgIC8vIFJlbmRlciBub24tUHJvbWlzZSB2YWx1ZXMgaW1tZWRpYXRlbHlcbiAgICAgIGlmICghaXNQcm9taXNlKHZhbHVlKSkge1xuICAgICAgICB0aGlzLl9fbGFzdFJlbmRlcmVkSW5kZXggPSBpO1xuICAgICAgICAvLyBTaW5jZSBhIGxvd2VyLXByaW9yaXR5IHZhbHVlIHdpbGwgbmV2ZXIgb3ZlcndyaXRlIGEgaGlnaGVyLXByaW9yaXR5XG4gICAgICAgIC8vIHN5bmNocm9ub3VzIHZhbHVlLCB3ZSBjYW4gc3RvcCBwcm9jZXNzaW5nIG5vdy5cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGlzIGlzIGEgUHJvbWlzZSB3ZSd2ZSBhbHJlYWR5IGhhbmRsZWQsIHNraXAgaXQuXG4gICAgICBpZiAoaSA8IHByZXZpb3VzTGVuZ3RoICYmIHZhbHVlID09PSBwcmV2aW91c1ZhbHVlc1tpXSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gV2UgaGF2ZSBhIFByb21pc2UgdGhhdCB3ZSBoYXZlbid0IHNlZW4gYmVmb3JlLCBzbyBwcmlvcml0aWVzIG1heSBoYXZlXG4gICAgICAvLyBjaGFuZ2VkLiBGb3JnZXQgd2hhdCB3ZSByZW5kZXJlZCBiZWZvcmUuXG4gICAgICB0aGlzLl9fbGFzdFJlbmRlcmVkSW5kZXggPSBfaW5maW5pdHk7XG4gICAgICBwcmV2aW91c0xlbmd0aCA9IDA7XG5cbiAgICAgIC8vIE5vdGUsIHRoZSBjYWxsYmFjayBhdm9pZHMgY2xvc2luZyBvdmVyIGB0aGlzYCBzbyB0aGF0IHRoZSBkaXJlY3RpdmVcbiAgICAgIC8vIGNhbiBiZSBnYydlZCBiZWZvcmUgdGhlIHByb21pc2UgcmVzb2x2ZXM7IGluc3RlYWQgYHRoaXNgIGlzIHJldHJpZXZlZFxuICAgICAgLy8gZnJvbSBgd2Vha1RoaXNgLCB3aGljaCBjYW4gYnJlYWsgdGhlIGhhcmQgcmVmZXJlbmNlIGluIHRoZSBjbG9zdXJlIHdoZW5cbiAgICAgIC8vIHRoZSBkaXJlY3RpdmUgZGlzY29ubmVjdHNcbiAgICAgIFByb21pc2UucmVzb2x2ZSh2YWx1ZSkudGhlbihhc3luYyAocmVzdWx0OiB1bmtub3duKSA9PiB7XG4gICAgICAgIC8vIElmIHdlJ3JlIGRpc2Nvbm5lY3RlZCwgd2FpdCB1bnRpbCB3ZSdyZSAobWF5YmUpIHJlY29ubmVjdGVkXG4gICAgICAgIC8vIFRoZSB3aGlsZSBsb29wIGhlcmUgaGFuZGxlcyB0aGUgY2FzZSB0aGF0IHRoZSBjb25uZWN0aW9uIHN0YXRlXG4gICAgICAgIC8vIHRocmFzaGVzLCBjYXVzaW5nIHRoZSBwYXVzZXIgdG8gcmVzdW1lIGFuZCB0aGVuIGdldCByZS1wYXVzZWRcbiAgICAgICAgd2hpbGUgKHBhdXNlci5nZXQoKSkge1xuICAgICAgICAgIGF3YWl0IHBhdXNlci5nZXQoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBJZiB0aGUgY2FsbGJhY2sgZ2V0cyBoZXJlIGFuZCB0aGVyZSBpcyBubyBgdGhpc2AsIGl0IG1lYW5zIHRoYXQgdGhlXG4gICAgICAgIC8vIGRpcmVjdGl2ZSBoYXMgYmVlbiBkaXNjb25uZWN0ZWQgYW5kIGdhcmJhZ2UgY29sbGVjdGVkIGFuZCB3ZSBkb24ndFxuICAgICAgICAvLyBuZWVkIHRvIGRvIGFueXRoaW5nIGVsc2VcbiAgICAgICAgY29uc3QgX3RoaXMgPSB3ZWFrVGhpcy5kZXJlZigpO1xuICAgICAgICBpZiAoX3RoaXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvbnN0IGluZGV4ID0gX3RoaXMuX192YWx1ZXMuaW5kZXhPZih2YWx1ZSk7XG4gICAgICAgICAgLy8gSWYgc3RhdGUudmFsdWVzIGRvZXNuJ3QgY29udGFpbiB0aGUgdmFsdWUsIHdlJ3ZlIHJlLXJlbmRlcmVkIHdpdGhvdXRcbiAgICAgICAgICAvLyB0aGUgdmFsdWUsIHNvIGRvbid0IHJlbmRlciBpdC4gVGhlbiwgb25seSByZW5kZXIgaWYgdGhlIHZhbHVlIGlzXG4gICAgICAgICAgLy8gaGlnaGVyLXByaW9yaXR5IHRoYW4gd2hhdCdzIGFscmVhZHkgYmVlbiByZW5kZXJlZC5cbiAgICAgICAgICBpZiAoaW5kZXggPiAtMSAmJiBpbmRleCA8IF90aGlzLl9fbGFzdFJlbmRlcmVkSW5kZXgpIHtcbiAgICAgICAgICAgIF90aGlzLl9fbGFzdFJlbmRlcmVkSW5kZXggPSBpbmRleDtcbiAgICAgICAgICAgIF90aGlzLnNldFZhbHVlKHJlc3VsdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbm9DaGFuZ2U7XG4gIH1cblxuICBvdmVycmlkZSBkaXNjb25uZWN0ZWQoKSB7XG4gICAgdGhpcy5fX3dlYWtUaGlzLmRpc2Nvbm5lY3QoKTtcbiAgICB0aGlzLl9fcGF1c2VyLnBhdXNlKCk7XG4gIH1cblxuICBvdmVycmlkZSByZWNvbm5lY3RlZCgpIHtcbiAgICB0aGlzLl9fd2Vha1RoaXMucmVjb25uZWN0KHRoaXMpO1xuICAgIHRoaXMuX19wYXVzZXIucmVzdW1lKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW5kZXJzIG9uZSBvZiBhIHNlcmllcyBvZiB2YWx1ZXMsIGluY2x1ZGluZyBQcm9taXNlcywgdG8gYSBQYXJ0LlxuICpcbiAqIFZhbHVlcyBhcmUgcmVuZGVyZWQgaW4gcHJpb3JpdHkgb3JkZXIsIHdpdGggdGhlIGZpcnN0IGFyZ3VtZW50IGhhdmluZyB0aGVcbiAqIGhpZ2hlc3QgcHJpb3JpdHkgYW5kIHRoZSBsYXN0IGFyZ3VtZW50IGhhdmluZyB0aGUgbG93ZXN0IHByaW9yaXR5LiBJZiBhXG4gKiB2YWx1ZSBpcyBhIFByb21pc2UsIGxvdy1wcmlvcml0eSB2YWx1ZXMgd2lsbCBiZSByZW5kZXJlZCB1bnRpbCBpdCByZXNvbHZlcy5cbiAqXG4gKiBUaGUgcHJpb3JpdHkgb2YgdmFsdWVzIGNhbiBiZSB1c2VkIHRvIGNyZWF0ZSBwbGFjZWhvbGRlciBjb250ZW50IGZvciBhc3luY1xuICogZGF0YS4gRm9yIGV4YW1wbGUsIGEgUHJvbWlzZSB3aXRoIHBlbmRpbmcgY29udGVudCBjYW4gYmUgdGhlIGZpcnN0LFxuICogaGlnaGVzdC1wcmlvcml0eSwgYXJndW1lbnQsIGFuZCBhIG5vbl9wcm9taXNlIGxvYWRpbmcgaW5kaWNhdG9yIHRlbXBsYXRlIGNhblxuICogYmUgdXNlZCBhcyB0aGUgc2Vjb25kLCBsb3dlci1wcmlvcml0eSwgYXJndW1lbnQuIFRoZSBsb2FkaW5nIGluZGljYXRvciB3aWxsXG4gKiByZW5kZXIgaW1tZWRpYXRlbHksIGFuZCB0aGUgcHJpbWFyeSBjb250ZW50IHdpbGwgcmVuZGVyIHdoZW4gdGhlIFByb21pc2VcbiAqIHJlc29sdmVzLlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogYGBganNcbiAqIGNvbnN0IGNvbnRlbnQgPSBmZXRjaCgnLi9jb250ZW50LnR4dCcpLnRoZW4ociA9PiByLnRleHQoKSk7XG4gKiBodG1sYCR7dW50aWwoY29udGVudCwgaHRtbGA8c3Bhbj5Mb2FkaW5nLi4uPC9zcGFuPmApfWBcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgdW50aWwgPSBkaXJlY3RpdmUoVW50aWxEaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuLy8gZXhwb3J0IHR5cGUge1VudGlsRGlyZWN0aXZlfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIxIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG4vKipcbiAqIFdoZW4gYGNvbmRpdGlvbmAgaXMgdHJ1ZSwgcmV0dXJucyB0aGUgcmVzdWx0IG9mIGNhbGxpbmcgYHRydWVDYXNlKClgLCBlbHNlXG4gKiByZXR1cm5zIHRoZSByZXN1bHQgb2YgY2FsbGluZyBgZmFsc2VDYXNlKClgIGlmIGBmYWxzZUNhc2VgIGlzIGRlZmluZWQuXG4gKlxuICogVGhpcyBpcyBhIGNvbnZlbmllbmNlIHdyYXBwZXIgYXJvdW5kIGEgdGVybmFyeSBleHByZXNzaW9uIHRoYXQgbWFrZXMgaXQgYVxuICogbGl0dGxlIG5pY2VyIHRvIHdyaXRlIGFuIGlubGluZSBjb25kaXRpb25hbCB3aXRob3V0IGFuIGVsc2UuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogcmVuZGVyKCkge1xuICogICByZXR1cm4gaHRtbGBcbiAqICAgICAke3doZW4odGhpcy51c2VyLCAoKSA9PiBodG1sYFVzZXI6ICR7dGhpcy51c2VyLnVzZXJuYW1lfWAsICgpID0+IGh0bWxgU2lnbiBJbi4uLmApfVxuICogICBgO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aGVuPFQsIEY+KFxuICBjb25kaXRpb246IHRydWUsXG4gIHRydWVDYXNlOiAoKSA9PiBULFxuICBmYWxzZUNhc2U/OiAoKSA9PiBGXG4pOiBUO1xuZXhwb3J0IGZ1bmN0aW9uIHdoZW48VCwgRiA9IHVuZGVmaW5lZD4oXG4gIGNvbmRpdGlvbjogZmFsc2UsXG4gIHRydWVDYXNlOiAoKSA9PiBULFxuICBmYWxzZUNhc2U/OiAoKSA9PiBGXG4pOiBGO1xuZXhwb3J0IGZ1bmN0aW9uIHdoZW48VCwgRiA9IHVuZGVmaW5lZD4oXG4gIGNvbmRpdGlvbjogdW5rbm93bixcbiAgdHJ1ZUNhc2U6ICgpID0+IFQsXG4gIGZhbHNlQ2FzZT86ICgpID0+IEZcbik6IFQgfCBGO1xuZXhwb3J0IGZ1bmN0aW9uIHdoZW4oXG4gIGNvbmRpdGlvbjogdW5rbm93bixcbiAgdHJ1ZUNhc2U6ICgpID0+IHVua25vd24sXG4gIGZhbHNlQ2FzZT86ICgpID0+IHVua25vd25cbik6IHVua25vd24ge1xuICByZXR1cm4gY29uZGl0aW9uID8gdHJ1ZUNhc2UoKSA6IGZhbHNlQ2FzZT8uKCk7XG59XG4iLCJleHBvcnQge1xuICAgIFRlbXBsYXRlUmVzdWx0LFxuICAgIEhUTUxUZW1wbGF0ZVJlc3VsdCxcbiAgICBTVkdUZW1wbGF0ZVJlc3VsdCxcbiAgICBSZW5kZXJPcHRpb25zLFxuICAgIGh0bWwsXG4gICAgc3ZnLFxuICAgIHJlbmRlcixcbiAgICBub0NoYW5nZSxcbiAgICBub3RoaW5nLFxufSBmcm9tICdsaXQtaHRtbCc7XG5cbmltcG9ydCB7XG4gICAgXyRMSCxcbiAgICBBdHRyaWJ1dGVQYXJ0LFxuICAgIFByb3BlcnR5UGFydCxcbiAgICBCb29sZWFuQXR0cmlidXRlUGFydCxcbiAgICBFdmVudFBhcnQsXG4gICAgRWxlbWVudFBhcnQsXG59IGZyb20gJ2xpdC1odG1sJztcbmV4cG9ydCBjb25zdCBfzqMgPSB7XG4gICAgQXR0cmlidXRlUGFydDogXyRMSC5fQXR0cmlidXRlUGFydCBhcyB1bmtub3duIGFzIEF0dHJpYnV0ZVBhcnQsXG4gICAgUHJvcGVydHlQYXJ0OiBfJExILl9Qcm9wZXJ0eVBhcnQgYXMgdW5rbm93biBhcyBQcm9wZXJ0eVBhcnQsXG4gICAgQm9vbGVhbkF0dHJpYnV0ZVBhcnQ6IF8kTEguX0Jvb2xlYW5BdHRyaWJ1dGVQYXJ0IGFzIHVua25vd24gYXMgQm9vbGVhbkF0dHJpYnV0ZVBhcnQsXG4gICAgRXZlbnRQYXJ0OiBfJExILl9FdmVudFBhcnQgYXMgdW5rbm93biBhcyBFdmVudFBhcnQsXG4gICAgRWxlbWVudFBhcnQ6IF8kTEguX0VsZW1lbnRQYXJ0IGFzIHVua25vd24gYXMgRWxlbWVudFBhcnQsXG59O1xuXG5leHBvcnQge1xuICAgIERpcmVjdGl2ZSxcbiAgICBEaXJlY3RpdmVQYXJhbWV0ZXJzLFxuICAgIFBhcnQsXG4gICAgUGFydEluZm8sXG4gICAgUGFydFR5cGUsXG4gICAgZGlyZWN0aXZlLFxufSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmUnO1xuXG5leHBvcnQgeyBBc3luY0RpcmVjdGl2ZSB9IGZyb20gJ2xpdC1odG1sL2FzeW5jLWRpcmVjdGl2ZSc7XG5leHBvcnQgeyBSZWYsIGNyZWF0ZVJlZiB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvcmVmJztcblxuaW1wb3J0IHsgYXN5bmNBcHBlbmQgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2FzeW5jLWFwcGVuZCc7XG5pbXBvcnQgeyBhc3luY1JlcGxhY2UgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2FzeW5jLXJlcGxhY2UnO1xuaW1wb3J0IHsgY2FjaGUgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2NhY2hlJztcbmltcG9ydCB7IGNob29zZSB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvY2hvb3NlJztcbmltcG9ydCB7IGNsYXNzTWFwIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9jbGFzcy1tYXAnO1xuaW1wb3J0IHsgZ3VhcmQgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2d1YXJkJztcbmltcG9ydCB7IGlmRGVmaW5lZCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvaWYtZGVmaW5lZCc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9qb2luJztcbmltcG9ydCB7IGtleWVkIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9rZXllZCc7XG5pbXBvcnQgeyBsaXZlIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9saXZlJztcbmltcG9ydCB7IG1hcCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvbWFwJztcbmltcG9ydCB7IHJhbmdlIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9yYW5nZSc7XG5pbXBvcnQgeyByZWYgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3JlZic7XG5pbXBvcnQgeyByZXBlYXQgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3JlcGVhdCc7XG5pbXBvcnQgeyBzdHlsZU1hcCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvc3R5bGUtbWFwJztcbmltcG9ydCB7IHRlbXBsYXRlQ29udGVudCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvdGVtcGxhdGUtY29udGVudCc7XG5pbXBvcnQgeyB1bnNhZmVIVE1MIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy91bnNhZmUtaHRtbCc7XG5pbXBvcnQgeyB1bnNhZmVTVkcgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3Vuc2FmZS1zdmcnO1xuaW1wb3J0IHsgdW50aWwgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3VudGlsJztcbmltcG9ydCB7IHdoZW4gfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3doZW4nO1xuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZVxuZGVjbGFyZSBuYW1lc3BhY2UgZGlyZWN0aXZlcyB7XG4gICAgZXhwb3J0IHR5cGUgYXN5bmNBcHBlbmQgPSB0eXBlb2YgYXN5bmNBcHBlbmQ7XG4gICAgZXhwb3J0IHR5cGUgYXN5bmNSZXBsYWNlID0gdHlwZW9mIGFzeW5jUmVwbGFjZTtcbiAgICBleHBvcnQgdHlwZSBjYWNoZSA9IHR5cGVvZiBjYWNoZTtcbiAgICBleHBvcnQgdHlwZSBjaG9vc2UgPSB0eXBlb2YgY2hvb3NlO1xuICAgIGV4cG9ydCB0eXBlIGNsYXNzTWFwID0gdHlwZW9mIGNsYXNzTWFwO1xuICAgIGV4cG9ydCB0eXBlIGd1YXJkID0gdHlwZW9mIGd1YXJkO1xuICAgIGV4cG9ydCB0eXBlIGlmRGVmaW5lZCA9IHR5cGVvZiBpZkRlZmluZWQ7XG4gICAgZXhwb3J0IHR5cGUgam9pbiA9IHR5cGVvZiBqb2luO1xuICAgIGV4cG9ydCB0eXBlIGtleWVkID0gdHlwZW9mIGtleWVkO1xuICAgIGV4cG9ydCB0eXBlIGxpdmUgPSB0eXBlb2YgbGl2ZTtcbiAgICBleHBvcnQgdHlwZSBtYXAgPSB0eXBlb2YgbWFwO1xuICAgIGV4cG9ydCB0eXBlIHJhbmdlID0gdHlwZW9mIHJhbmdlO1xuICAgIGV4cG9ydCB0eXBlIHJlZiA9IHR5cGVvZiByZWY7XG4gICAgZXhwb3J0IHR5cGUgcmVwZWF0ID0gdHlwZW9mIHJlcGVhdDtcbiAgICBleHBvcnQgdHlwZSBzdHlsZU1hcCA9IHR5cGVvZiBzdHlsZU1hcDtcbiAgICBleHBvcnQgdHlwZSB0ZW1wbGF0ZUNvbnRlbnQgPSB0eXBlb2YgdGVtcGxhdGVDb250ZW50O1xuICAgIGV4cG9ydCB0eXBlIHVuc2FmZUhUTUwgPSB0eXBlb2YgdW5zYWZlSFRNTDtcbiAgICBleHBvcnQgdHlwZSB1bnNhZmVTVkcgPSB0eXBlb2YgdW5zYWZlU1ZHO1xuICAgIGV4cG9ydCB0eXBlIHVudGlsID0gdHlwZW9mIHVudGlsO1xuICAgIGV4cG9ydCB0eXBlIHdoZW4gPSB0eXBlb2Ygd2hlbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZURpcmVjdGl2ZXMge1xuICAgIGFzeW5jQXBwZW5kOiBkaXJlY3RpdmVzLmFzeW5jQXBwZW5kO1xuICAgIGFzeW5jUmVwbGFjZTogZGlyZWN0aXZlcy5hc3luY1JlcGxhY2U7XG4gICAgY2FjaGU6IGRpcmVjdGl2ZXMuY2FjaGU7XG4gICAgY2hvb3NlOiBkaXJlY3RpdmVzLmNob29zZTtcbiAgICBjbGFzc01hcDogZGlyZWN0aXZlcy5jbGFzc01hcDtcbiAgICBndWFyZDogZGlyZWN0aXZlcy5ndWFyZDtcbiAgICBpZkRlZmluZWQ6IGRpcmVjdGl2ZXMuaWZEZWZpbmVkO1xuICAgIGpvaW46IGRpcmVjdGl2ZXMuam9pbjtcbiAgICBrZXllZDogZGlyZWN0aXZlcy5rZXllZDtcbiAgICBsaXZlOiBkaXJlY3RpdmVzLmxpdmU7XG4gICAgbWFwOiBkaXJlY3RpdmVzLm1hcDtcbiAgICByYW5nZTogZGlyZWN0aXZlcy5yYW5nZTtcbiAgICByZWY6IGRpcmVjdGl2ZXMucmVmO1xuICAgIHJlcGVhdDogZGlyZWN0aXZlcy5yZXBlYXQ7XG4gICAgc3R5bGVNYXA6IGRpcmVjdGl2ZXMuc3R5bGVNYXA7XG4gICAgdGVtcGxhdGVDb250ZW50OiBkaXJlY3RpdmVzLnRlbXBsYXRlQ29udGVudDtcbiAgICB1bnNhZmVIVE1MOiBkaXJlY3RpdmVzLnVuc2FmZUhUTUw7XG4gICAgdW5zYWZlU1ZHOiBkaXJlY3RpdmVzLnVuc2FmZVNWRztcbiAgICB1bnRpbDogZGlyZWN0aXZlcy51bnRpbDtcbiAgICB3aGVuOiBkaXJlY3RpdmVzLndoZW47XG59XG5cbmV4cG9ydCBjb25zdCBkaXJlY3RpdmVzOiBUZW1wbGF0ZURpcmVjdGl2ZXMgPSB7XG4gICAgYXN5bmNBcHBlbmQsXG4gICAgYXN5bmNSZXBsYWNlLFxuICAgIGNhY2hlLFxuICAgIGNob29zZSxcbiAgICBjbGFzc01hcCxcbiAgICBndWFyZCxcbiAgICBpZkRlZmluZWQsXG4gICAgam9pbixcbiAgICBrZXllZCxcbiAgICBsaXZlLFxuICAgIG1hcCxcbiAgICByYW5nZSxcbiAgICByZWYsXG4gICAgcmVwZWF0LFxuICAgIHN0eWxlTWFwLFxuICAgIHRlbXBsYXRlQ29udGVudCxcbiAgICB1bnNhZmVIVE1MLFxuICAgIHVuc2FmZVNWRyxcbiAgICB1bnRpbCxcbiAgICB3aGVuLFxufTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCBmcm9tIGBzdHJpbmdgIHRvIGBUZW1wbGF0ZVN0cmluZ3NBcnJheWAuIDxicj5cbiAqICAgICBUaGlzIG1ldGhvZCBpcyBoZWxwZXIgYnJpZ2RnZSBmb3IgdGhlIFtbaHRtbF1dIG9yIHRoZSBbW3N2Z11dIGFyZSBhYmxlIHRvIHJlY2VpdmVkIHBsYWluIHN0cmluZy5cbiAqIEBqYSBgc3RyaW5nYCDjgpIgYFRlbXBsYXRlU3RyaW5nc0FycmF5YOOBq+WkieaPmy4gPGJyPlxuICogICAgIFtbaHRtbF1dIOOChCBbW3N2Z11dIOOBjOaWh+Wtl+WIl+OCkuWPl+OBkeS7mOOBkeOCi+OBn+OCgeOBruODluODquODg+OCuOODoeOCveODg+ODiVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgdG9UZW1wbGF0ZVN0cmluZ3NBcnJheSBhcyBicmlkZ2UgfSBmcm9tICdAY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZSc7XG4gKlxuICogY29uc3QgcmF3ID0gJzxwPkhlbGxvIFJhdyBTdHJpbmc8L3A+JztcbiAqIHJlbmRlcihodG1sKGJyaWRnZShyYXcpKSwgZG9jdW1lbnQuYm9keSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIHBsYWluIHN0cmluZyAvIHN0cmluZyBhcnJheS4gZXgpIFtbSlNUXV0gcmV0dXJuZWQgdmFsdWUuXG4gKiAgLSBgamFgIOODl+ODrOODvOODs+aWh+Wtl+WIlyAvIOaWh+Wtl+WIl+mFjeWIly4gZXgpIFtbSlNUXV0g44Gu5oi744KK5YCk44Gq44Gp44KS5oOz5a6aXG4gKi9cbmV4cG9ydCBjb25zdCB0b1RlbXBsYXRlU3RyaW5nc0FycmF5ID0gKHNyYzogc3RyaW5nIHwgc3RyaW5nW10gfCBUZW1wbGF0ZVN0cmluZ3NBcnJheSk6IFRlbXBsYXRlU3RyaW5nc0FycmF5ID0+IHtcbiAgICBjb25zdCBzdHJpbmdzID0gQXJyYXkuaXNBcnJheShzcmMpID8gc3JjIDogW3NyY107XG4gICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc3RyaW5ncywgJ3JhdycpKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzdHJpbmdzLCAncmF3JywgeyB2YWx1ZTogc3RyaW5ncyB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHN0cmluZ3MgYXMgdW5rbm93biBhcyBUZW1wbGF0ZVN0cmluZ3NBcnJheTtcbn07XG4iXSwibmFtZXMiOlsid3JhcCIsImNyZWF0ZU1hcmtlciIsImlzUHJpbWl0aXZlIiwiSFRNTF9SRVNVTFQiLCJTVkdfUkVTVUxUIiwiQ2hpbGRQYXJ0Il0sIm1hcHBpbmdzIjoiOzs7OztBQUFBOzs7O0FBSUc7O0FBME9ILE1BQU1BLE1BQUksR0FLSixDQUFDLElBQVUsS0FBSyxJQUFJLENBQUM7QUFFM0IsTUFBTSxZQUFZLEdBQUksVUFBeUMsQ0FBQyxZQUFZLENBQUM7QUFFN0U7Ozs7Ozs7QUFPRztBQUNILE1BQU0sTUFBTSxHQUFHLFlBQVk7QUFDekIsTUFBRSxZQUFZLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRTtBQUNwQyxRQUFBLFVBQVUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDO0tBQ3JCLENBQUM7TUFDRixTQUFTLENBQUM7QUEwRWQ7QUFDQTtBQUNBLE1BQU0sb0JBQW9CLEdBQUcsT0FBTyxDQUFDO0FBRXJDO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTSxNQUFNLEdBQUcsQ0FBQSxJQUFBLEVBQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBRXhEO0FBQ0EsTUFBTSxXQUFXLEdBQUcsR0FBRyxHQUFHLE1BQU0sQ0FBQztBQUVqQztBQUNBO0FBQ0EsTUFBTSxVQUFVLEdBQUcsQ0FBSSxDQUFBLEVBQUEsV0FBVyxHQUFHLENBQUM7QUFFdEMsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDO0FBRW5CO0FBQ0EsTUFBTUMsY0FBWSxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBSXBELE1BQU1DLGFBQVcsR0FBRyxDQUFDLEtBQWMsS0FDakMsS0FBSyxLQUFLLElBQUksS0FBSyxPQUFPLEtBQUssSUFBSSxRQUFRLElBQUksT0FBTyxLQUFLLElBQUksVUFBVSxDQUFDLENBQUM7QUFDN0UsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQztBQUM5QixNQUFNLFVBQVUsR0FBRyxDQUFDLEtBQWMsS0FBZ0M7O0lBQ2hFLE9BQUEsT0FBTyxDQUFDLEtBQUssQ0FBQzs7UUFFZCxRQUFPLENBQUMsRUFBQSxHQUFBLEtBQWEsTUFBRyxJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUEsS0FBSyxVQUFVLENBQUE7Q0FBQSxDQUFDO0FBRTFELE1BQU0sVUFBVSxHQUFHLENBQUEsV0FBQSxDQUFhLENBQUM7QUFDakMsTUFBTSxlQUFlLEdBQUcsQ0FBQSxtQkFBQSxDQUFxQixDQUFDO0FBQzlDLE1BQU0sU0FBUyxHQUFHLENBQUEsV0FBQSxDQUFhLENBQUM7QUFFaEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7OztBQUdHO0FBQ0gsTUFBTSxZQUFZLEdBQUcscURBQXFELENBQUM7QUFDM0UsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFDO0FBQ3hCLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQztBQUNuQixNQUFNLGdCQUFnQixHQUFHLENBQUMsQ0FBQztBQUUzQixNQUFNLGVBQWUsR0FBRyxNQUFNLENBQUM7QUFDL0I7O0FBRUc7QUFDSCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQztBQUU5Qjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBcUJHO0FBQ0gsTUFBTSxXQUFXLEdBQUcsSUFBSSxNQUFNLENBQzVCLENBQUEsRUFBQSxFQUFLLFVBQVUsQ0FBTyxJQUFBLEVBQUEsU0FBUyxNQUFNLFVBQVUsQ0FBQSxFQUFBLEVBQUssVUFBVSxDQUFPLElBQUEsRUFBQSxlQUFlLGNBQWMsRUFDbEcsR0FBRyxDQUNKLENBQUM7QUFDRixNQUFNLFlBQVksR0FBRyxDQUFDLENBQUM7QUFDdkIsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFDO0FBQ3pCLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxDQUFDO0FBQzVCLE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBQztBQUVyQixNQUFNLHVCQUF1QixHQUFHLElBQUksQ0FBQztBQUNyQyxNQUFNLHVCQUF1QixHQUFHLElBQUksQ0FBQztBQUNyQzs7Ozs7QUFLRztBQUNILE1BQU0sY0FBYyxHQUFHLG9DQUFvQyxDQUFDO0FBRTVEO0FBQ0EsTUFBTUMsYUFBVyxHQUFHLENBQUMsQ0FBQztBQUN0QixNQUFNQyxZQUFVLEdBQUcsQ0FBQyxDQUFDO0FBSXJCO0FBQ0E7QUFDQSxNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUM7QUFDekIsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDO0FBQ3JCLE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBQztBQUN4QixNQUFNLHNCQUFzQixHQUFHLENBQUMsQ0FBQztBQUNqQyxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUM7QUFDckIsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZCLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQztBQWdDdkI7OztBQUdHO0FBQ0gsTUFBTSxHQUFHLEdBQ1AsQ0FBdUIsSUFBTyxLQUM5QixDQUFDLE9BQTZCLEVBQUUsR0FBRyxNQUFpQixLQUF1QjtJQVV6RSxPQUFPOztRQUVMLENBQUMsWUFBWSxHQUFHLElBQUk7UUFDcEIsT0FBTztRQUNQLE1BQU07S0FDUCxDQUFDO0FBQ0osQ0FBQyxDQUFDO0FBRUo7Ozs7Ozs7Ozs7OztBQVlHO01BQ1UsSUFBSSxHQUFHLEdBQUcsQ0FBQ0QsYUFBVyxFQUFFO0FBRXJDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBc0JHO01BQ1UsR0FBRyxHQUFHLEdBQUcsQ0FBQ0MsWUFBVSxFQUFFO0FBRW5DOzs7QUFHRztBQUNVLE1BQUEsUUFBUSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFO0FBRW5EOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQkc7QUFDVSxNQUFBLE9BQU8sR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRTtBQUVqRDs7Ozs7O0FBTUc7QUFDSCxNQUFNLGFBQWEsR0FBRyxJQUFJLE9BQU8sRUFBa0MsQ0FBQztBQWlEcEU7Ozs7O0FBS0c7QUFDVSxNQUFBLE1BQU0sR0FBRyxDQUNwQixLQUFjLEVBQ2QsU0FBeUMsRUFDekMsT0FBdUIsS0FDWDs7QUFFWixJQUFBLE1BQU0sYUFBYSxHQUFHLENBQUEsRUFBQSxHQUFBLE9BQU8sS0FBUCxJQUFBLElBQUEsT0FBTyxLQUFQLEtBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxHQUFBLE9BQU8sQ0FBRSxZQUFZLE1BQUksSUFBQSxJQUFBLEVBQUEsS0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLEdBQUEsU0FBUyxDQUFDOzs7QUFHekQsSUFBQSxJQUFJLElBQUksR0FBZSxhQUFxQixDQUFDLFlBQVksQ0FBQyxDQUFDO0lBUzNELElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtBQUN0QixRQUFBLE1BQU0sT0FBTyxHQUFHLENBQUEsRUFBQSxHQUFBLE9BQU8sS0FBUCxJQUFBLElBQUEsT0FBTyxLQUFQLEtBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxHQUFBLE9BQU8sQ0FBRSxZQUFZLE1BQUksSUFBQSxJQUFBLEVBQUEsS0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLEdBQUEsSUFBSSxDQUFDOzs7QUFpQjdDLFFBQUEsYUFBcUIsQ0FBQyxZQUFZLENBQUMsR0FBRyxJQUFJLEdBQUcsSUFBSUMsV0FBUyxDQUN6RCxTQUFTLENBQUMsWUFBWSxDQUFDSixjQUFZLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFDL0MsT0FBTyxFQUNQLFNBQVMsRUFDVCxPQUFPLEtBQVAsSUFBQSxJQUFBLE9BQU8sS0FBUCxLQUFBLENBQUEsR0FBQSxPQUFPLEdBQUksRUFBRSxDQUNkLENBQUM7QUFDSCxLQUFBO0FBQ0QsSUFBQSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBU3ZCLElBQUEsT0FBTyxJQUFnQixDQUFDO0FBQzFCLEVBQUU7QUFXRixNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsZ0JBQWdCLENBQy9CLENBQUMsRUFDRCxHQUFHLDBDQUNILElBQUksRUFDSixLQUFLLENBQ04sQ0FBQztBQW9CRjs7Ozs7Ozs7Ozs7QUFXRztBQUNILE1BQU0sZUFBZSxHQUFHLENBQ3RCLE9BQTZCLEVBQzdCLElBQWdCLEtBQzRCOzs7Ozs7O0FBTzVDLElBQUEsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7Ozs7SUFJN0IsTUFBTSxTQUFTLEdBQThCLEVBQUUsQ0FBQztBQUNoRCxJQUFBLElBQUksSUFBSSxHQUFHLElBQUksS0FBS0csWUFBVSxHQUFHLE9BQU8sR0FBRyxFQUFFLENBQUM7Ozs7QUFLOUMsSUFBQSxJQUFJLGVBQW1DLENBQUM7OztJQUl4QyxJQUFJLEtBQUssR0FBRyxZQUFZLENBQUM7SUFFekIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUMxQixRQUFBLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQzs7Ozs7O0FBTXJCLFFBQUEsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUMxQixRQUFBLElBQUksUUFBNEIsQ0FBQztRQUNqQyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7QUFDbEIsUUFBQSxJQUFJLEtBQThCLENBQUM7OztBQUluQyxRQUFBLE9BQU8sU0FBUyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUU7O0FBRTNCLFlBQUEsS0FBSyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7QUFDNUIsWUFBQSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QixJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7Z0JBQ2xCLE1BQU07QUFDUCxhQUFBO0FBQ0QsWUFBQSxTQUFTLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQztZQUM1QixJQUFJLEtBQUssS0FBSyxZQUFZLEVBQUU7QUFDMUIsZ0JBQUEsSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQUssS0FBSyxFQUFFO29CQUNsQyxLQUFLLEdBQUcsZUFBZSxDQUFDO0FBQ3pCLGlCQUFBO0FBQU0scUJBQUEsSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQUssU0FBUyxFQUFFOztvQkFFN0MsS0FBSyxHQUFHLGdCQUFnQixDQUFDO0FBQzFCLGlCQUFBO0FBQU0scUJBQUEsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssU0FBUyxFQUFFO29CQUN4QyxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUU7OztBQUd4Qyx3QkFBQSxlQUFlLEdBQUcsSUFBSSxNQUFNLENBQUMsQ0FBSyxFQUFBLEVBQUEsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBLENBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUMzRCxxQkFBQTtvQkFDRCxLQUFLLEdBQUcsV0FBVyxDQUFDO0FBQ3JCLGlCQUFBO0FBQU0scUJBQUEsSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxTQUFTLEVBQUU7b0JBT2hELEtBQUssR0FBRyxXQUFXLENBQUM7QUFDckIsaUJBQUE7QUFDRixhQUFBO2lCQUFNLElBQUksS0FBSyxLQUFLLFdBQVcsRUFBRTtBQUNoQyxnQkFBQSxJQUFJLEtBQUssQ0FBQyxZQUFZLENBQUMsS0FBSyxHQUFHLEVBQUU7OztvQkFHL0IsS0FBSyxHQUFHLGVBQWUsS0FBZixJQUFBLElBQUEsZUFBZSxjQUFmLGVBQWUsR0FBSSxZQUFZLENBQUM7OztvQkFHeEMsZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDdkIsaUJBQUE7QUFBTSxxQkFBQSxJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBSyxTQUFTLEVBQUU7O29CQUU5QyxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN2QixpQkFBQTtBQUFNLHFCQUFBO29CQUNMLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ3JFLG9CQUFBLFFBQVEsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7b0JBQ2pDLEtBQUs7QUFDSCx3QkFBQSxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssU0FBUztBQUM3Qiw4QkFBRSxXQUFXO0FBQ2IsOEJBQUUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEdBQUc7QUFDM0Isa0NBQUUsdUJBQXVCO2tDQUN2Qix1QkFBdUIsQ0FBQztBQUMvQixpQkFBQTtBQUNGLGFBQUE7aUJBQU0sSUFDTCxLQUFLLEtBQUssdUJBQXVCO2dCQUNqQyxLQUFLLEtBQUssdUJBQXVCLEVBQ2pDO2dCQUNBLEtBQUssR0FBRyxXQUFXLENBQUM7QUFDckIsYUFBQTtBQUFNLGlCQUFBLElBQUksS0FBSyxLQUFLLGVBQWUsSUFBSSxLQUFLLEtBQUssZ0JBQWdCLEVBQUU7Z0JBQ2xFLEtBQUssR0FBRyxZQUFZLENBQUM7QUFDdEIsYUFBQTtBQUFNLGlCQUFBOzs7Z0JBR0wsS0FBSyxHQUFHLFdBQVcsQ0FBQztnQkFDcEIsZUFBZSxHQUFHLFNBQVMsQ0FBQztBQUM3QixhQUFBO0FBQ0YsU0FBQTs7Ozs7Ozs7Ozs7OztRQTRCRCxNQUFNLEdBQUcsR0FDUCxLQUFLLEtBQUssV0FBVyxJQUFJLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDdEUsSUFBSTtBQUNGLFlBQUEsS0FBSyxLQUFLLFlBQVk7a0JBQ2xCLENBQUMsR0FBRyxVQUFVO2tCQUNkLGdCQUFnQixJQUFJLENBQUM7QUFDdkIsc0JBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVMsQ0FBQztBQUMxQix3QkFBQSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQzs0QkFDMUIsb0JBQW9CO0FBQ3BCLDRCQUFBLENBQUMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUM7d0JBQzNCLE1BQU07d0JBQ04sR0FBRztBQUNMLHNCQUFFLENBQUM7d0JBQ0QsTUFBTTt5QkFDTCxnQkFBZ0IsS0FBSyxDQUFDLENBQUMsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztBQUN4RSxLQUFBO0lBRUQsTUFBTSxVQUFVLEdBQ2QsSUFBSSxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLEtBQUtBLFlBQVUsR0FBRyxRQUFRLEdBQUcsRUFBRSxDQUFDLENBQUM7Ozs7OztBQU92RSxJQUFBLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUM3RCxJQUFJLE9BQU8sR0FBRyxnQ0FBZ0MsQ0FBQztBQVEvQyxRQUFBLE1BQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDMUIsS0FBQTs7SUFFRCxPQUFPO0FBQ0wsUUFBQSxNQUFNLEtBQUssU0FBUztBQUNsQixjQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO0FBQy9CLGNBQUcsVUFBcUM7UUFDMUMsU0FBUztLQUNWLENBQUM7QUFDSixDQUFDLENBQUM7QUFJRixNQUFNLFFBQVEsQ0FBQTtBQU1aLElBQUEsV0FBQTs7SUFFRSxFQUFDLE9BQU8sRUFBRSxDQUFDLFlBQVksR0FBRyxJQUFJLEVBQWlCLEVBQy9DLE9BQXVCLEVBQUE7O1FBTHpCLElBQUssQ0FBQSxLQUFBLEdBQXdCLEVBQUUsQ0FBQztBQU85QixRQUFBLElBQUksSUFBaUIsQ0FBQztRQUN0QixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7UUFDbEIsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFDO0FBQ3RCLFFBQUEsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7QUFDckMsUUFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDOztBQUd6QixRQUFBLE1BQU0sQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEdBQUcsZUFBZSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN6RCxJQUFJLENBQUMsRUFBRSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUM7O1FBR3JDLElBQUksSUFBSSxLQUFLQSxZQUFVLEVBQUU7QUFDdkIsWUFBQSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQztBQUNoQyxZQUFBLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxVQUFXLENBQUM7WUFDdkMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BCLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDMUMsU0FBQTs7QUFHRCxRQUFBLE9BQU8sQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxNQUFNLElBQUksSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLFNBQVMsRUFBRTtBQUN0RSxZQUFBLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxDQUFDLEVBQUU7Ozs7QUF1QnZCLGdCQUFBLElBQUssSUFBZ0IsQ0FBQyxhQUFhLEVBQUUsRUFBRTs7OztvQkFJckMsTUFBTSxhQUFhLEdBQUcsRUFBRSxDQUFDO0FBQ3pCLG9CQUFBLEtBQUssTUFBTSxJQUFJLElBQUssSUFBZ0IsQ0FBQyxpQkFBaUIsRUFBRSxFQUFFOzs7Ozs7OztBQVF4RCx3QkFBQSxJQUNFLElBQUksQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUM7QUFDbkMsNEJBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFDdkI7QUFDQSw0QkFBQSxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQztBQUM1Qyw0QkFBQSxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOzRCQUN6QixJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUU7O0FBRTFCLGdDQUFBLE1BQU0sS0FBSyxHQUFJLElBQWdCLENBQUMsWUFBWSxDQUMxQyxRQUFRLENBQUMsV0FBVyxFQUFFLEdBQUcsb0JBQW9CLENBQzdDLENBQUM7Z0NBQ0gsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztnQ0FDcEMsTUFBTSxDQUFDLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUUsQ0FBQztnQ0FDekMsS0FBSyxDQUFDLElBQUksQ0FBQztBQUNULG9DQUFBLElBQUksRUFBRSxjQUFjO0FBQ3BCLG9DQUFBLEtBQUssRUFBRSxTQUFTO0FBQ2hCLG9DQUFBLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1Ysb0NBQUEsT0FBTyxFQUFFLE9BQU87QUFDaEIsb0NBQUEsSUFBSSxFQUNGLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHO0FBQ1YsMENBQUUsWUFBWTtBQUNkLDBDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHO0FBQ2QsOENBQUUsb0JBQW9CO0FBQ3RCLDhDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHO0FBQ2Qsa0RBQUUsU0FBUztBQUNYLGtEQUFFLGFBQWE7QUFDcEIsaUNBQUEsQ0FBQyxDQUFDO0FBQ0osNkJBQUE7QUFBTSxpQ0FBQTtnQ0FDTCxLQUFLLENBQUMsSUFBSSxDQUFDO0FBQ1Qsb0NBQUEsSUFBSSxFQUFFLFlBQVk7QUFDbEIsb0NBQUEsS0FBSyxFQUFFLFNBQVM7QUFDakIsaUNBQUEsQ0FBQyxDQUFDO0FBQ0osNkJBQUE7QUFDRix5QkFBQTtBQUNGLHFCQUFBO0FBQ0Qsb0JBQUEsS0FBSyxNQUFNLElBQUksSUFBSSxhQUFhLEVBQUU7QUFDL0Isd0JBQUEsSUFBZ0IsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDekMscUJBQUE7QUFDRixpQkFBQTs7O2dCQUdELElBQUksY0FBYyxDQUFDLElBQUksQ0FBRSxJQUFnQixDQUFDLE9BQU8sQ0FBQyxFQUFFOzs7O29CQUlsRCxNQUFNLE9BQU8sR0FBSSxJQUFnQixDQUFDLFdBQVksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0Qsb0JBQUEsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7b0JBQ3JDLElBQUksU0FBUyxHQUFHLENBQUMsRUFBRTt3QkFDaEIsSUFBZ0IsQ0FBQyxXQUFXLEdBQUcsWUFBWTs4QkFDdkMsWUFBWSxDQUFDLFdBQTZCOzhCQUMzQyxFQUFFLENBQUM7Ozs7Ozt3QkFNUCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFOzRCQUNqQyxJQUFnQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUVILGNBQVksRUFBRSxDQUFDLENBQUM7OzRCQUVyRCxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDbEIsNEJBQUEsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsU0FBUyxFQUFDLENBQUMsQ0FBQztBQUNwRCx5QkFBQTs7Ozt3QkFJQSxJQUFnQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUVBLGNBQVksRUFBRSxDQUFDLENBQUM7QUFDOUQscUJBQUE7QUFDRixpQkFBQTtBQUNGLGFBQUE7QUFBTSxpQkFBQSxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssQ0FBQyxFQUFFO0FBQzlCLGdCQUFBLE1BQU0sSUFBSSxHQUFJLElBQWdCLENBQUMsSUFBSSxDQUFDO2dCQUNwQyxJQUFJLElBQUksS0FBSyxXQUFXLEVBQUU7QUFDeEIsb0JBQUEsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBQyxDQUFDLENBQUM7QUFDbEQsaUJBQUE7QUFBTSxxQkFBQTtBQUNMLG9CQUFBLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ1gsb0JBQUEsT0FBTyxDQUFDLENBQUMsR0FBSSxJQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRTs7O0FBR2pFLHdCQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUMsQ0FBQyxDQUFDOztBQUVuRCx3QkFBQSxDQUFDLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7QUFDeEIscUJBQUE7QUFDRixpQkFBQTtBQUNGLGFBQUE7QUFDRCxZQUFBLFNBQVMsRUFBRSxDQUFDO0FBQ2IsU0FBQTtLQVFGOzs7QUFJRCxJQUFBLE9BQU8sYUFBYSxDQUFDLElBQWlCLEVBQUUsUUFBd0IsRUFBQTtRQUM5RCxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3ZDLFFBQUEsRUFBRSxDQUFDLFNBQVMsR0FBRyxJQUF5QixDQUFDO0FBQ3pDLFFBQUEsT0FBTyxFQUFFLENBQUM7S0FDWDtBQUNGLENBQUE7QUFlRCxTQUFTLGdCQUFnQixDQUN2QixJQUE2QyxFQUM3QyxLQUFjLEVBQ2QsTUFBQSxHQUEwQixJQUFJLEVBQzlCLGNBQXVCLEVBQUE7Ozs7O0lBSXZCLElBQUksS0FBSyxLQUFLLFFBQVEsRUFBRTtBQUN0QixRQUFBLE9BQU8sS0FBSyxDQUFDO0FBQ2QsS0FBQTtBQUNELElBQUEsSUFBSSxnQkFBZ0IsR0FDbEIsY0FBYyxLQUFLLFNBQVM7QUFDMUIsVUFBRSxDQUFDLEVBQUEsR0FBQSxNQUF3QixDQUFDLFlBQVksTUFBQSxJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBRyxjQUFjLENBQUM7QUFDMUQsVUFBRyxNQUE4QyxDQUFDLFdBQVcsQ0FBQztBQUNsRSxJQUFBLE1BQU0sd0JBQXdCLEdBQUdDLGFBQVcsQ0FBQyxLQUFLLENBQUM7QUFDakQsVUFBRSxTQUFTO0FBQ1g7WUFDRyxLQUF5QixDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDbEQsSUFBSSxDQUFBLGdCQUFnQixLQUFBLElBQUEsSUFBaEIsZ0JBQWdCLEtBQUEsS0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLEdBQWhCLGdCQUFnQixDQUFFLFdBQVcsTUFBSyx3QkFBd0IsRUFBRTs7QUFFOUQsUUFBQSxDQUFBLEVBQUEsR0FBQSxnQkFBZ0IsS0FBQSxJQUFBLElBQWhCLGdCQUFnQixLQUFBLEtBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxHQUFoQixnQkFBZ0IsQ0FBRyxvQ0FBb0MsQ0FBQyxNQUF4RCxJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsZ0JBQWdCLEVBQTJDLEtBQUssQ0FBQyxDQUFDO1FBQ2xFLElBQUksd0JBQXdCLEtBQUssU0FBUyxFQUFFO1lBQzFDLGdCQUFnQixHQUFHLFNBQVMsQ0FBQztBQUM5QixTQUFBO0FBQU0sYUFBQTtBQUNMLFlBQUEsZ0JBQWdCLEdBQUcsSUFBSSx3QkFBd0IsQ0FBQyxJQUFnQixDQUFDLENBQUM7WUFDbEUsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7QUFDN0QsU0FBQTtRQUNELElBQUksY0FBYyxLQUFLLFNBQVMsRUFBRTtZQUNoQyxDQUFFLENBQUEsRUFBQSxHQUFBLENBQUEsRUFBQSxHQUFBLE1BQXdCLEVBQUMsWUFBWSxNQUFaLElBQUEsSUFBQSxFQUFBLEtBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxJQUFBLEVBQUEsQ0FBQSxZQUFZLEdBQUssRUFBRSxDQUFBLEVBQUUsY0FBYyxDQUFDO0FBQzdELGdCQUFBLGdCQUFnQixDQUFDO0FBQ3BCLFNBQUE7QUFBTSxhQUFBO0FBQ0osWUFBQSxNQUFnQyxDQUFDLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQztBQUNsRSxTQUFBO0FBQ0YsS0FBQTtJQUNELElBQUksZ0JBQWdCLEtBQUssU0FBUyxFQUFFO1FBQ2xDLEtBQUssR0FBRyxnQkFBZ0IsQ0FDdEIsSUFBSSxFQUNKLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUcsS0FBeUIsQ0FBQyxNQUFNLENBQUMsRUFDbkUsZ0JBQWdCLEVBQ2hCLGNBQWMsQ0FDZixDQUFDO0FBQ0gsS0FBQTtBQUNELElBQUEsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDO0FBRUQ7OztBQUdHO0FBQ0gsTUFBTSxnQkFBZ0IsQ0FBQTtJQVdwQixXQUFZLENBQUEsUUFBa0IsRUFBRSxNQUFpQixFQUFBOztRQVBqRCxJQUFNLENBQUEsTUFBQSxHQUE0QixFQUFFLENBQUM7O1FBS3JDLElBQXdCLENBQUEsd0JBQUEsR0FBeUIsU0FBUyxDQUFDO0FBR3pELFFBQUEsSUFBSSxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUM7QUFDM0IsUUFBQSxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQztLQUN4Qjs7QUFHRCxJQUFBLElBQUksVUFBVSxHQUFBO0FBQ1osUUFBQSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDO0tBQ2pDOztBQUdELElBQUEsSUFBSSxhQUFhLEdBQUE7QUFDZixRQUFBLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUM7S0FDcEM7OztBQUlELElBQUEsTUFBTSxDQUFDLE9BQWtDLEVBQUE7O0FBQ3ZDLFFBQUEsTUFBTSxFQUNKLEVBQUUsRUFBRSxFQUFDLE9BQU8sRUFBQyxFQUNiLEtBQUssRUFBRSxLQUFLLEdBQ2IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ3BCLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQSxFQUFBLEdBQUEsT0FBTyxLQUFQLElBQUEsSUFBQSxPQUFPLHVCQUFQLE9BQU8sQ0FBRSxhQUFhLE1BQUksSUFBQSxJQUFBLEVBQUEsS0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLEdBQUEsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDekUsUUFBQSxNQUFNLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQztBQUU5QixRQUFBLElBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQztRQUM5QixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7UUFDbEIsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO0FBQ2xCLFFBQUEsSUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTVCLE9BQU8sWUFBWSxLQUFLLFNBQVMsRUFBRTtBQUNqQyxZQUFBLElBQUksU0FBUyxLQUFLLFlBQVksQ0FBQyxLQUFLLEVBQUU7QUFDcEMsZ0JBQUEsSUFBSSxJQUFzQixDQUFDO0FBQzNCLGdCQUFBLElBQUksWUFBWSxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUU7QUFDcEMsb0JBQUEsSUFBSSxHQUFHLElBQUlHLFdBQVMsQ0FDbEIsSUFBbUIsRUFDbkIsSUFBSSxDQUFDLFdBQVcsRUFDaEIsSUFBSSxFQUNKLE9BQU8sQ0FDUixDQUFDO0FBQ0gsaUJBQUE7QUFBTSxxQkFBQSxJQUFJLFlBQVksQ0FBQyxJQUFJLEtBQUssY0FBYyxFQUFFO29CQUMvQyxJQUFJLEdBQUcsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUMxQixJQUFtQixFQUNuQixZQUFZLENBQUMsSUFBSSxFQUNqQixZQUFZLENBQUMsT0FBTyxFQUNwQixJQUFJLEVBQ0osT0FBTyxDQUNSLENBQUM7QUFDSCxpQkFBQTtBQUFNLHFCQUFBLElBQUksWUFBWSxDQUFDLElBQUksS0FBSyxZQUFZLEVBQUU7b0JBQzdDLElBQUksR0FBRyxJQUFJLFdBQVcsQ0FBQyxJQUFtQixFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM1RCxpQkFBQTtBQUNELGdCQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3ZCLGdCQUFBLFlBQVksR0FBRyxLQUFLLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztBQUNuQyxhQUFBO1lBQ0QsSUFBSSxTQUFTLE1BQUssWUFBWSxLQUFaLElBQUEsSUFBQSxZQUFZLHVCQUFaLFlBQVksQ0FBRSxLQUFLLENBQUEsRUFBRTtBQUNyQyxnQkFBQSxJQUFJLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFDO0FBQzFCLGdCQUFBLFNBQVMsRUFBRSxDQUFDO0FBQ2IsYUFBQTtBQUNGLFNBQUE7QUFDRCxRQUFBLE9BQU8sUUFBUSxDQUFDO0tBQ2pCO0FBRUQsSUFBQSxPQUFPLENBQUMsTUFBc0IsRUFBQTtRQUM1QixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDVixRQUFBLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUM5QixJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7QUFTdEIsZ0JBQUEsSUFBSyxJQUFzQixDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUU7b0JBQ2hELElBQXNCLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxJQUFxQixFQUFFLENBQUMsQ0FBQyxDQUFDOzs7O29CQUlyRSxDQUFDLElBQUssSUFBc0IsQ0FBQyxPQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztBQUNsRCxpQkFBQTtBQUFNLHFCQUFBO29CQUNMLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUIsaUJBQUE7QUFDRixhQUFBO0FBQ0QsWUFBQSxDQUFDLEVBQUUsQ0FBQztBQUNMLFNBQUE7S0FDRjtBQUNGLENBQUE7QUErQ0QsTUFBTUEsV0FBUyxDQUFBO0FBNENiLElBQUEsV0FBQSxDQUNFLFNBQW9CLEVBQ3BCLE9BQXlCLEVBQ3pCLE1BQWdELEVBQ2hELE9BQWtDLEVBQUE7O1FBL0MzQixJQUFJLENBQUEsSUFBQSxHQUFHLFVBQVUsQ0FBQztRQUUzQixJQUFnQixDQUFBLGdCQUFBLEdBQVksT0FBTyxDQUFDOzs7O1FBK0JwQyxJQUF3QixDQUFBLHdCQUFBLEdBQXlCLFNBQVMsQ0FBQztBQWdCekQsUUFBQSxJQUFJLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQztBQUM3QixRQUFBLElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDO0FBQ3pCLFFBQUEsSUFBSSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUM7QUFDdkIsUUFBQSxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQzs7OztBQUl2QixRQUFBLElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQSxFQUFBLEdBQUEsT0FBTyxLQUFBLElBQUEsSUFBUCxPQUFPLEtBQUEsS0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLEdBQVAsT0FBTyxDQUFFLFdBQVcsTUFBQSxJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsR0FBSSxJQUFJLENBQUM7S0FLbkQ7O0FBdENELElBQUEsSUFBSSxhQUFhLEdBQUE7Ozs7O1FBSWYsT0FBTyxDQUFBLEVBQUEsR0FBQSxDQUFBLEVBQUEsR0FBQSxJQUFJLENBQUMsUUFBUSxNQUFFLElBQUEsSUFBQSxFQUFBLEtBQUEsS0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLGFBQWEsTUFBSSxJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsR0FBQSxJQUFJLENBQUMsYUFBYSxDQUFDO0tBQzNEO0FBbUNEOzs7Ozs7Ozs7Ozs7Ozs7OztBQWlCRztBQUNILElBQUEsSUFBSSxVQUFVLEdBQUE7UUFDWixJQUFJLFVBQVUsR0FBU0wsTUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxVQUFXLENBQUM7QUFDMUQsUUFBQSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQzdCLElBQ0UsTUFBTSxLQUFLLFNBQVM7QUFDcEIsWUFBQSxVQUFVLENBQUMsUUFBUSxLQUFLLEVBQUUsK0JBQzFCOzs7O0FBSUEsWUFBQSxVQUFVLEdBQUksTUFBdUMsQ0FBQyxVQUFVLENBQUM7QUFDbEUsU0FBQTtBQUNELFFBQUEsT0FBTyxVQUFVLENBQUM7S0FDbkI7QUFFRDs7O0FBR0c7QUFDSCxJQUFBLElBQUksU0FBUyxHQUFBO1FBQ1gsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0tBQ3pCO0FBRUQ7OztBQUdHO0FBQ0gsSUFBQSxJQUFJLE9BQU8sR0FBQTtRQUNULE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztLQUN2QjtBQUVELElBQUEsVUFBVSxDQUFDLEtBQWMsRUFBRSxlQUFBLEdBQW1DLElBQUksRUFBQTtRQU1oRSxLQUFLLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQztBQUN2RCxRQUFBLElBQUlFLGFBQVcsQ0FBQyxLQUFLLENBQUMsRUFBRTs7OztZQUl0QixJQUFJLEtBQUssS0FBSyxPQUFPLElBQUksS0FBSyxJQUFJLElBQUksSUFBSSxLQUFLLEtBQUssRUFBRSxFQUFFO0FBQ3RELGdCQUFBLElBQUksSUFBSSxDQUFDLGdCQUFnQixLQUFLLE9BQU8sRUFBRTtvQkFRckMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ2hCLGlCQUFBO0FBQ0QsZ0JBQUEsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE9BQU8sQ0FBQztBQUNqQyxhQUFBO2lCQUFNLElBQUksS0FBSyxLQUFLLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxLQUFLLEtBQUssUUFBUSxFQUFFO0FBQ2hFLGdCQUFBLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDekIsYUFBQTs7QUFFRixTQUFBO0FBQU0sYUFBQSxJQUFLLEtBQXdCLENBQUMsWUFBWSxDQUFDLEtBQUssU0FBUyxFQUFFO0FBQ2hFLFlBQUEsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQXVCLENBQUMsQ0FBQztBQUNyRCxTQUFBO0FBQU0sYUFBQSxJQUFLLEtBQWMsQ0FBQyxRQUFRLEtBQUssU0FBUyxFQUFFO0FBQ2pELFlBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFhLENBQUMsQ0FBQztBQUNqQyxTQUFBO0FBQU0sYUFBQSxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRTtBQUM1QixZQUFBLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDN0IsU0FBQTtBQUFNLGFBQUE7O0FBRUwsWUFBQSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3pCLFNBQUE7S0FDRjtBQUVPLElBQUEsT0FBTyxDQUFpQixJQUFPLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUE7QUFDM0QsUUFBQSxPQUFPRixNQUFJLENBQUNBLE1BQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsVUFBVyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztLQUN6RTtBQUVPLElBQUEsV0FBVyxDQUFDLEtBQVcsRUFBQTtBQUM3QixRQUFBLElBQUksSUFBSSxDQUFDLGdCQUFnQixLQUFLLEtBQUssRUFBRTtZQUNuQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFtQ2YsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDN0MsU0FBQTtLQUNGO0FBRU8sSUFBQSxXQUFXLENBQUMsS0FBYyxFQUFBOzs7O0FBSWhDLFFBQUEsSUFDRSxJQUFJLENBQUMsZ0JBQWdCLEtBQUssT0FBTztBQUNqQyxZQUFBRSxhQUFXLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQ2xDO1lBQ0EsTUFBTSxJQUFJLEdBQUdGLE1BQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsV0FBbUIsQ0FBQztBQWF2RCxZQUFBLElBQWEsQ0FBQyxJQUFJLEdBQUcsS0FBZSxDQUFDO0FBQ3ZDLFNBQUE7QUFBTSxhQUFBO0FBQ0wsWUFrQk87Z0JBQ0wsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLEtBQWUsQ0FBQyxDQUFDLENBQUM7QUFPckQsYUFBQTtBQUNGLFNBQUE7QUFDRCxRQUFBLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7S0FDL0I7QUFFTyxJQUFBLHFCQUFxQixDQUMzQixNQUErQyxFQUFBOzs7UUFHL0MsTUFBTSxFQUFDLE1BQU0sRUFBRSxDQUFDLFlBQVksR0FBRyxJQUFJLEVBQUMsR0FBRyxNQUFNLENBQUM7Ozs7O0FBSzlDLFFBQUEsTUFBTSxRQUFRLEdBQ1osT0FBTyxJQUFJLEtBQUssUUFBUTtBQUN0QixjQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBd0IsQ0FBQztBQUM5QyxlQUFHLElBQUksQ0FBQyxFQUFFLEtBQUssU0FBUztBQUNwQixpQkFBQyxJQUFJLENBQUMsRUFBRSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDMUQsZ0JBQUEsSUFBSSxDQUFDLENBQUM7UUFFWixJQUFJLENBQUEsTUFBQyxJQUFJLENBQUMsZ0JBQXFDLE1BQUUsSUFBQSxJQUFBLEVBQUEsS0FBQSxLQUFBLENBQUEsR0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsVUFBVSxNQUFLLFFBQVEsRUFBRTtBQVN2RSxZQUFBLElBQUksQ0FBQyxnQkFBcUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0QsU0FBQTtBQUFNLGFBQUE7WUFDTCxNQUFNLFFBQVEsR0FBRyxJQUFJLGdCQUFnQixDQUFDLFFBQW9CLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDbEUsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7QUFVL0MsWUFBQSxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBVXpCLFlBQUEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMzQixZQUFBLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxRQUFRLENBQUM7QUFDbEMsU0FBQTtLQUNGOzs7QUFJRCxJQUFBLGFBQWEsQ0FBQyxNQUFzQixFQUFBO1FBQ2xDLElBQUksUUFBUSxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRTtBQUMxQixZQUFBLGFBQWEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztBQUN0RSxTQUFBO0FBQ0QsUUFBQSxPQUFPLFFBQVEsQ0FBQztLQUNqQjtBQUVPLElBQUEsZUFBZSxDQUFDLEtBQXdCLEVBQUE7Ozs7Ozs7Ozs7QUFXOUMsUUFBQSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO0FBQ25DLFlBQUEsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDaEIsU0FBQTs7O0FBSUQsUUFBQSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsZ0JBQStCLENBQUM7UUFDdkQsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO0FBQ2xCLFFBQUEsSUFBSSxRQUErQixDQUFDO0FBRXBDLFFBQUEsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7QUFDeEIsWUFBQSxJQUFJLFNBQVMsS0FBSyxTQUFTLENBQUMsTUFBTSxFQUFFOzs7OztBQUtsQyxnQkFBQSxTQUFTLENBQUMsSUFBSSxFQUNYLFFBQVEsR0FBRyxJQUFJSyxXQUFTLENBQ3ZCLElBQUksQ0FBQyxPQUFPLENBQUNKLGNBQVksRUFBRSxDQUFDLEVBQzVCLElBQUksQ0FBQyxPQUFPLENBQUNBLGNBQVksRUFBRSxDQUFDLEVBQzVCLElBQUksRUFDSixJQUFJLENBQUMsT0FBTyxDQUNiLEVBQ0YsQ0FBQztBQUNILGFBQUE7QUFBTSxpQkFBQTs7QUFFTCxnQkFBQSxRQUFRLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2pDLGFBQUE7QUFDRCxZQUFBLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDMUIsWUFBQSxTQUFTLEVBQUUsQ0FBQztBQUNiLFNBQUE7QUFFRCxRQUFBLElBQUksU0FBUyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUU7O0FBRWhDLFlBQUEsSUFBSSxDQUFDLE9BQU8sQ0FDVixRQUFRLElBQUlELE1BQUksQ0FBQyxRQUFRLENBQUMsU0FBVSxDQUFDLENBQUMsV0FBVyxFQUNqRCxTQUFTLENBQ1YsQ0FBQzs7QUFFRixZQUFBLFNBQVMsQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO0FBQzlCLFNBQUE7S0FDRjtBQUVEOzs7Ozs7Ozs7O0FBVUc7SUFDSCxPQUFPLENBQ0wsS0FBMEIsR0FBQUEsTUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxXQUFXLEVBQzVELElBQWEsRUFBQTs7QUFFYixRQUFBLENBQUEsRUFBQSxHQUFBLElBQUksQ0FBQyx5QkFBeUIsTUFBQSxJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxJQUFBLENBQTlCLElBQUksRUFBNkIsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUNwRCxRQUFBLE9BQU8sS0FBSyxJQUFJLEtBQUssS0FBSyxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ3hDLE1BQU0sQ0FBQyxHQUFHQSxNQUFJLENBQUMsS0FBTSxDQUFDLENBQUMsV0FBVyxDQUFDO0FBQ2xDLFlBQUFBLE1BQUksQ0FBQyxLQUFNLENBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNuQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0FBQ1gsU0FBQTtLQUNGO0FBQ0Q7Ozs7OztBQU1HO0FBQ0gsSUFBQSxZQUFZLENBQUMsV0FBb0IsRUFBQTs7QUFDL0IsUUFBQSxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssU0FBUyxFQUFFO0FBQy9CLFlBQUEsSUFBSSxDQUFDLGFBQWEsR0FBRyxXQUFXLENBQUM7WUFDakMsQ0FBQSxFQUFBLEdBQUEsSUFBSSxDQUFDLHlCQUF5QixNQUFBLElBQUEsSUFBQSxFQUFBLEtBQUEsS0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLElBQUEsQ0FBOUIsSUFBSSxFQUE2QixXQUFXLENBQUMsQ0FBQztBQUMvQyxTQUtBO0tBQ0Y7QUFDRixDQUFBO0FBMEJELE1BQU0sYUFBYSxDQUFBO0lBb0NqQixXQUNFLENBQUEsT0FBb0IsRUFDcEIsSUFBWSxFQUNaLE9BQThCLEVBQzlCLE1BQXNCLEVBQ3RCLE9BQWtDLEVBQUE7UUF4QzNCLElBQUksQ0FBQSxJQUFBLEdBQUcsY0FJSyxDQUFDOztRQVl0QixJQUFnQixDQUFBLGdCQUFBLEdBQTZCLE9BQU8sQ0FBQzs7UUFNckQsSUFBd0IsQ0FBQSx3QkFBQSxHQUF5QixTQUFTLENBQUM7QUFvQnpELFFBQUEsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7QUFDdkIsUUFBQSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztBQUNqQixRQUFBLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDO0FBQ3ZCLFFBQUEsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7QUFDdkIsUUFBQSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtBQUNoRSxZQUFBLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDekUsWUFBQSxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztBQUN4QixTQUFBO0FBQU0sYUFBQTtBQUNMLFlBQUEsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE9BQU8sQ0FBQztBQUNqQyxTQUFBO0tBSUY7QUE3QkQsSUFBQSxJQUFJLE9BQU8sR0FBQTtBQUNULFFBQUEsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztLQUM3Qjs7QUFHRCxJQUFBLElBQUksYUFBYSxHQUFBO0FBQ2YsUUFBQSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDO0tBQ3BDO0FBd0JEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFxQkc7SUFDSCxVQUFVLENBQ1IsS0FBK0IsRUFDL0IsZUFBQSxHQUFtQyxJQUFJLEVBQ3ZDLFVBQW1CLEVBQ25CLFFBQWtCLEVBQUE7QUFFbEIsUUFBQSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDOztRQUc3QixJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFFbkIsSUFBSSxPQUFPLEtBQUssU0FBUyxFQUFFOztZQUV6QixLQUFLLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDMUQsTUFBTTtnQkFDSixDQUFDRSxhQUFXLENBQUMsS0FBSyxDQUFDO3FCQUNsQixLQUFLLEtBQUssSUFBSSxDQUFDLGdCQUFnQixJQUFJLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQztBQUMxRCxZQUFBLElBQUksTUFBTSxFQUFFO0FBQ1YsZ0JBQUEsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQztBQUMvQixhQUFBO0FBQ0YsU0FBQTtBQUFNLGFBQUE7O1lBRUwsTUFBTSxNQUFNLEdBQUcsS0FBdUIsQ0FBQztBQUN2QyxZQUFBLEtBQUssR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFbkIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ1QsWUFBQSxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3ZDLGdCQUFBLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLFVBQVcsR0FBRyxDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRXhFLElBQUksQ0FBQyxLQUFLLFFBQVEsRUFBRTs7QUFFbEIsb0JBQUEsQ0FBQyxHQUFJLElBQUksQ0FBQyxnQkFBbUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRCxpQkFBQTtBQUNELGdCQUFBLE1BQU0sS0FBTixNQUFNLEdBQ0osQ0FBQ0EsYUFBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBTSxJQUFJLENBQUMsZ0JBQW1DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDeEUsSUFBSSxDQUFDLEtBQUssT0FBTyxFQUFFO29CQUNqQixLQUFLLEdBQUcsT0FBTyxDQUFDO0FBQ2pCLGlCQUFBO3FCQUFNLElBQUksS0FBSyxLQUFLLE9BQU8sRUFBRTtBQUM1QixvQkFBQSxLQUFLLElBQUksQ0FBQyxDQUFDLEtBQUQsSUFBQSxJQUFBLENBQUMsY0FBRCxDQUFDLEdBQUksRUFBRSxJQUFJLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDckMsaUJBQUE7OztBQUdBLGdCQUFBLElBQUksQ0FBQyxnQkFBbUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbEQsYUFBQTtBQUNGLFNBQUE7QUFDRCxRQUFBLElBQUksTUFBTSxJQUFJLENBQUMsUUFBUSxFQUFFO0FBQ3ZCLFlBQUEsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMxQixTQUFBO0tBQ0Y7O0FBR0QsSUFBQSxZQUFZLENBQUMsS0FBYyxFQUFBO1FBQ3pCLElBQUksS0FBSyxLQUFLLE9BQU8sRUFBRTtBQUNwQixZQUFBRixNQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBYSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDNUQsU0FBQTtBQUFNLGFBQUE7WUFrQkpBLE1BQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFhLENBQUMsWUFBWSxDQUMxQyxJQUFJLENBQUMsSUFBSSxHQUNSLEtBQUssYUFBTCxLQUFLLEtBQUEsS0FBQSxDQUFBLEdBQUwsS0FBSyxHQUFJLEVBQUUsRUFDYixDQUFDO0FBQ0gsU0FBQTtLQUNGO0FBQ0YsQ0FBQTtBQUdELE1BQU0sWUFBYSxTQUFRLGFBQWEsQ0FBQTtBQUF4QyxJQUFBLFdBQUEsR0FBQTs7UUFDb0IsSUFBSSxDQUFBLElBQUEsR0FBRyxhQUFhLENBQUM7S0F3QnhDOztBQXJCVSxJQUFBLFlBQVksQ0FBQyxLQUFjLEVBQUE7O0FBbUJqQyxRQUFBLElBQUksQ0FBQyxPQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssS0FBSyxPQUFPLEdBQUcsU0FBUyxHQUFHLEtBQUssQ0FBQztLQUMxRTtBQUNGLENBQUE7QUFFRDtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU0sOEJBQThCLEdBQUcsWUFBWTtNQUM5QyxZQUFZLENBQUMsV0FBNkI7TUFDM0MsRUFBRSxDQUFDO0FBR1AsTUFBTSxvQkFBcUIsU0FBUSxhQUFhLENBQUE7QUFBaEQsSUFBQSxXQUFBLEdBQUE7O1FBQ29CLElBQUksQ0FBQSxJQUFBLEdBQUcsc0JBQXNCLENBQUM7S0FvQmpEOztBQWpCVSxJQUFBLFlBQVksQ0FBQyxLQUFjLEVBQUE7QUFRbEMsUUFBQSxJQUFJLEtBQUssSUFBSSxLQUFLLEtBQUssT0FBTyxFQUFFO0FBQzdCLFlBQUFBLE1BQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFhLENBQUMsWUFBWSxDQUMxQyxJQUFJLENBQUMsSUFBSSxFQUNULDhCQUE4QixDQUMvQixDQUFDO0FBQ0gsU0FBQTtBQUFNLGFBQUE7QUFDSixZQUFBQSxNQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBYSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDNUQsU0FBQTtLQUNGO0FBQ0YsQ0FBQTtBQWlCRCxNQUFNLFNBQVUsU0FBUSxhQUFhLENBQUE7SUFHbkMsV0FDRSxDQUFBLE9BQW9CLEVBQ3BCLElBQVksRUFDWixPQUE4QixFQUM5QixNQUFzQixFQUN0QixPQUFrQyxFQUFBO1FBRWxDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFUL0IsSUFBSSxDQUFBLElBQUEsR0FBRyxVQUFVLENBQUM7S0FrQm5DOzs7O0FBS1EsSUFBQSxVQUFVLENBQ2pCLFdBQW9CLEVBQ3BCLGVBQUEsR0FBbUMsSUFBSSxFQUFBOztRQUV2QyxXQUFXO0FBQ1QsWUFBQSxDQUFBLEVBQUEsR0FBQSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUMsTUFBSSxJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsR0FBQSxPQUFPLENBQUM7UUFDckUsSUFBSSxXQUFXLEtBQUssUUFBUSxFQUFFO1lBQzVCLE9BQU87QUFDUixTQUFBO0FBQ0QsUUFBQSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7OztRQUkxQyxNQUFNLG9CQUFvQixHQUN4QixDQUFDLFdBQVcsS0FBSyxPQUFPLElBQUksV0FBVyxLQUFLLE9BQU87QUFDbEQsWUFBQSxXQUF3QyxDQUFDLE9BQU87QUFDOUMsZ0JBQUEsV0FBd0MsQ0FBQyxPQUFPO0FBQ2xELFlBQUEsV0FBd0MsQ0FBQyxJQUFJO0FBQzNDLGdCQUFBLFdBQXdDLENBQUMsSUFBSTtBQUMvQyxZQUFBLFdBQXdDLENBQUMsT0FBTztnQkFDOUMsV0FBd0MsQ0FBQyxPQUFPLENBQUM7OztBQUl0RCxRQUFBLE1BQU0saUJBQWlCLEdBQ3JCLFdBQVcsS0FBSyxPQUFPO0FBQ3ZCLGFBQUMsV0FBVyxLQUFLLE9BQU8sSUFBSSxvQkFBb0IsQ0FBQyxDQUFDO0FBWXBELFFBQUEsSUFBSSxvQkFBb0IsRUFBRTtBQUN4QixZQUFBLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQzlCLElBQUksQ0FBQyxJQUFJLEVBQ1QsSUFBSSxFQUNKLFdBQXVDLENBQ3hDLENBQUM7QUFDSCxTQUFBO0FBQ0QsUUFBQSxJQUFJLGlCQUFpQixFQUFFOzs7O0FBSXJCLFlBQUEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FDM0IsSUFBSSxDQUFDLElBQUksRUFDVCxJQUFJLEVBQ0osV0FBdUMsQ0FDeEMsQ0FBQztBQUNILFNBQUE7QUFDRCxRQUFBLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxXQUFXLENBQUM7S0FDckM7QUFFRCxJQUFBLFdBQVcsQ0FBQyxLQUFZLEVBQUE7O0FBQ3RCLFFBQUEsSUFBSSxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsS0FBSyxVQUFVLEVBQUU7QUFDL0MsWUFBQSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUEsRUFBQSxHQUFBLE1BQUEsSUFBSSxDQUFDLE9BQU8sTUFBRSxJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxJQUFJLG1DQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDdkUsU0FBQTtBQUFNLGFBQUE7QUFDSixZQUFBLElBQUksQ0FBQyxnQkFBd0MsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbkUsU0FBQTtLQUNGO0FBQ0YsQ0FBQTtBQUdELE1BQU0sV0FBVyxDQUFBO0FBaUJmLElBQUEsV0FBQSxDQUNTLE9BQWdCLEVBQ3ZCLE1BQXNCLEVBQ3RCLE9BQWtDLEVBQUE7UUFGM0IsSUFBTyxDQUFBLE9BQUEsR0FBUCxPQUFPLENBQVM7UUFqQmhCLElBQUksQ0FBQSxJQUFBLEdBQUcsWUFBWSxDQUFDOztRQVk3QixJQUF3QixDQUFBLHdCQUFBLEdBQXlCLFNBQVMsQ0FBQztBQVN6RCxRQUFBLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDO0FBQ3ZCLFFBQUEsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7S0FDeEI7O0FBR0QsSUFBQSxJQUFJLGFBQWEsR0FBQTtBQUNmLFFBQUEsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQztLQUNwQztBQUVELElBQUEsVUFBVSxDQUFDLEtBQWMsRUFBQTtBQU92QixRQUFBLGdCQUFnQixDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztLQUMvQjtBQUNGLENBQUE7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFpQkc7QUFDSSxNQUFNLElBQUksR0FBRzs7QUFFbEIsSUFBQSxxQkFBcUIsRUFBRSxvQkFBb0I7QUFDM0MsSUFBQSxPQUFPLEVBQUUsTUFBTTtBQUNmLElBQUEsWUFBWSxFQUFFLFdBQVc7QUFDekIsSUFBQSxZQUFZLEVBQUVHLGFBQVc7QUFDekIsSUFBQSxnQkFBZ0IsRUFBRSxlQUFlOztBQUVqQyxJQUFBLGlCQUFpQixFQUFFLGdCQUFnQjtBQUNuQyxJQUFBLFdBQVcsRUFBRSxVQUFVO0FBQ3ZCLElBQUEsaUJBQWlCLEVBQUUsZ0JBQWdCOztBQUVuQyxJQUFBLFVBQVUsRUFBRUUsV0FBUztBQUNyQixJQUFBLGNBQWMsRUFBRSxhQUFhO0FBQzdCLElBQUEscUJBQXFCLEVBQUUsb0JBQW9CO0FBQzNDLElBQUEsVUFBVSxFQUFFLFNBQVM7QUFDckIsSUFBQSxhQUFhLEVBQUUsWUFBWTtBQUMzQixJQUFBLFlBQVksRUFBRSxXQUFXO0NBQzFCLENBQUM7QUFFRjtBQUNBLE1BQU0sZUFBZSxHQUVqQixNQUFNLENBQUMsc0JBQXNCLENBQUM7QUFDbEMsZUFBZSxLQUFBLElBQUEsSUFBZixlQUFlLEtBQWYsS0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLEdBQUEsZUFBZSxDQUFHLFFBQVEsRUFBRUEsV0FBUyxDQUFDLENBQUM7QUFFdkM7QUFDQTtBQUNBLENBQUEsQ0FBQSxFQUFBLEdBQUMsVUFBVSxDQUFDLGVBQWUsTUFBQSxJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsSUFBMUIsVUFBVSxDQUFDLGVBQWUsR0FBSyxFQUFFLEdBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQzs7QUMvbEVqRDs7OztBQUlHO0FBcUNVLE1BQUEsUUFBUSxHQUFHO0FBQ3RCLElBQUEsU0FBUyxFQUFFLENBQUM7QUFDWixJQUFBLEtBQUssRUFBRSxDQUFDO0FBQ1IsSUFBQSxRQUFRLEVBQUUsQ0FBQztBQUNYLElBQUEsaUJBQWlCLEVBQUUsQ0FBQztBQUNwQixJQUFBLEtBQUssRUFBRSxDQUFDO0FBQ1IsSUFBQSxPQUFPLEVBQUUsQ0FBQztFQUNEO0FBK0JYOzs7QUFHRztBQUNJLE1BQU0sU0FBUyxHQUNwQixDQUEyQixDQUFJLEtBQy9CLENBQUMsR0FBRyxNQUE0QyxNQUEwQjs7SUFFeEUsQ0FBQyxpQkFBaUIsR0FBRyxDQUFDO0lBQ3RCLE1BQU07QUFDUCxDQUFBLEVBQUU7QUFFTDs7OztBQUlHO01BQ21CLFNBQVMsQ0FBQTtJQWtCN0IsV0FBWSxDQUFBLFNBQW1CLEtBQUk7O0FBR25DLElBQUEsSUFBSSxhQUFhLEdBQUE7QUFDZixRQUFBLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUM7S0FDcEM7O0FBR0QsSUFBQSxZQUFZLENBQ1YsSUFBVSxFQUNWLE1BQXNCLEVBQ3RCLGNBQWtDLEVBQUE7QUFFbEMsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztBQUNuQixRQUFBLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDO0FBQ3ZCLFFBQUEsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGNBQWMsQ0FBQztLQUN4Qzs7SUFFRCxTQUFTLENBQUMsSUFBVSxFQUFFLEtBQXFCLEVBQUE7UUFDekMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztLQUNqQztJQUlELE1BQU0sQ0FBQyxLQUFXLEVBQUUsS0FBcUIsRUFBQTtBQUN2QyxRQUFBLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDO0tBQzlCO0FBQ0Y7O0FDN0lEOzs7O0FBSUc7QUFXSCxNQUFNLEVBQUMsVUFBVSxFQUFFLFNBQVMsRUFBQyxHQUFHLElBQUksQ0FBQztBQU1yQyxNQUFNLElBQUksR0FLSixDQUFDLElBQVUsS0FBSyxJQUFJLENBQUM7QUFFM0I7Ozs7QUFJRztBQUNJLE1BQU0sV0FBVyxHQUFHLENBQUMsS0FBYyxLQUN4QyxLQUFLLEtBQUssSUFBSSxLQUFLLE9BQU8sS0FBSyxJQUFJLFFBQVEsSUFBSSxPQUFPLEtBQUssSUFBSSxVQUFVLENBQUMsQ0FBQztBQVU3RTs7QUFFRztBQUNJLE1BQU0sZ0JBQWdCLEdBQUcsQ0FDOUIsS0FBYyxFQUNkLElBQXlCLEtBQ0U7O0lBQzNCLE9BQUEsSUFBSSxLQUFLLFNBQVM7QUFDaEI7QUFDRSxZQUFBLENBQUEsTUFBQyxLQUF3QixNQUFBLElBQUEsSUFBQSxFQUFBLEtBQUEsS0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFHLFlBQVksQ0FBQyxNQUFLLFNBQVM7VUFDdkQsQ0FBQSxDQUFDLEVBQUEsR0FBQSxLQUF3QiwwQ0FBRyxZQUFZLENBQUMsTUFBSyxJQUFJLENBQUE7Q0FBQSxDQUFDO0FBZ0J6RDs7Ozs7OztBQU9HO0FBQ0ksTUFBTSxrQkFBa0IsR0FBRyxDQUFDLElBQWMsS0FDOUMsSUFBMEIsQ0FBQyxPQUFPLEtBQUssU0FBUyxDQUFDO0FBRXBELE1BQU0sWUFBWSxHQUFHLE1BQU0sUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUV0RDs7Ozs7Ozs7Ozs7QUFXRztBQUNJLE1BQU0sVUFBVSxHQUFHLENBQ3hCLGFBQXdCLEVBQ3hCLE9BQW1CLEVBQ25CLElBQWdCLEtBQ0g7O0lBQ2IsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxVQUFXLENBQUM7QUFFOUQsSUFBQSxNQUFNLE9BQU8sR0FDWCxPQUFPLEtBQUssU0FBUyxHQUFHLGFBQWEsQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQztJQUV4RSxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7QUFDdEIsUUFBQSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ3hFLFFBQUEsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUN0RSxRQUFBLElBQUksR0FBRyxJQUFJLFNBQVMsQ0FDbEIsU0FBUyxFQUNULE9BQU8sRUFDUCxhQUFhLEVBQ2IsYUFBYSxDQUFDLE9BQU8sQ0FDdEIsQ0FBQztBQUNILEtBQUE7QUFBTSxTQUFBO1FBQ0wsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFVLENBQUMsQ0FBQyxXQUFXLENBQUM7QUFDbEQsUUFBQSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO0FBQ2hDLFFBQUEsTUFBTSxhQUFhLEdBQUcsU0FBUyxLQUFLLGFBQWEsQ0FBQztBQUNsRCxRQUFBLElBQUksYUFBYSxFQUFFO1lBQ2pCLENBQUEsRUFBQSxHQUFBLElBQUksQ0FBQyx5QkFBeUIsTUFBQSxJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxJQUFBLENBQTlCLElBQUksRUFBNkIsYUFBYSxDQUFDLENBQUM7Ozs7O0FBS2hELFlBQUEsSUFBSSxDQUFDLFFBQVEsR0FBRyxhQUFhLENBQUM7Ozs7QUFJOUIsWUFBQSxJQUFJLGtCQUFrQixDQUFDO0FBQ3ZCLFlBQUEsSUFDRSxJQUFJLENBQUMseUJBQXlCLEtBQUssU0FBUztBQUM1QyxnQkFBQSxDQUFDLGtCQUFrQixHQUFHLGFBQWEsQ0FBQyxhQUFhO29CQUMvQyxTQUFVLENBQUMsYUFBYSxFQUMxQjtBQUNBLGdCQUFBLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ3BELGFBQUE7QUFDRixTQUFBO0FBQ0QsUUFBQSxJQUFJLE9BQU8sS0FBSyxPQUFPLElBQUksYUFBYSxFQUFFO0FBQ3hDLFlBQUEsSUFBSSxLQUFLLEdBQWdCLElBQUksQ0FBQyxXQUFXLENBQUM7WUFDMUMsT0FBTyxLQUFLLEtBQUssT0FBTyxFQUFFO2dCQUN4QixNQUFNLENBQUMsR0FBZ0IsSUFBSSxDQUFDLEtBQU0sQ0FBQyxDQUFDLFdBQVcsQ0FBQztnQkFDaEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQzlDLEtBQUssR0FBRyxDQUFDLENBQUM7QUFDWCxhQUFBO0FBQ0YsU0FBQTtBQUNGLEtBQUE7QUFFRCxJQUFBLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyxDQUFDO0FBRUY7Ozs7Ozs7Ozs7Ozs7OztBQWVHO0FBQ0ksTUFBTSxpQkFBaUIsR0FBRyxDQUMvQixJQUFPLEVBQ1AsS0FBYyxFQUNkLGVBQUEsR0FBbUMsSUFBSSxLQUNsQztBQUNMLElBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUM7QUFDeEMsSUFBQSxPQUFPLElBQUksQ0FBQztBQUNkLENBQUMsQ0FBQztBQUVGO0FBQ0E7QUFDQSxNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUM7QUFFdkI7Ozs7Ozs7Ozs7QUFVRztBQUNJLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxJQUFVLEVBQUUsS0FBaUIsR0FBQSxXQUFXLE1BQ3ZFLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsQ0FBQztBQUVsQzs7Ozs7Ozs7Ozs7OztBQWFHO0FBQ0ksTUFBTSxpQkFBaUIsR0FBRyxDQUFDLElBQWUsS0FBSyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7QUFFNUU7Ozs7QUFJRztBQUNJLE1BQU0sVUFBVSxHQUFHLENBQUMsSUFBZSxLQUFJOztJQUM1QyxDQUFBLEVBQUEsR0FBQSxJQUFJLENBQUMseUJBQXlCLE1BQTlCLElBQUEsSUFBQSxFQUFBLEtBQUEsS0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxJQUFJLEVBQTZCLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM5QyxJQUFBLElBQUksS0FBSyxHQUFxQixJQUFJLENBQUMsV0FBVyxDQUFDO0lBQy9DLE1BQU0sR0FBRyxHQUFxQixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVUsQ0FBQyxDQUFDLFdBQVcsQ0FBQztJQUNoRSxPQUFPLEtBQUssS0FBSyxHQUFHLEVBQUU7UUFDcEIsTUFBTSxDQUFDLEdBQXFCLElBQUksQ0FBQyxLQUFNLENBQUMsQ0FBQyxXQUFXLENBQUM7QUFDcEQsUUFBQSxJQUFJLENBQUMsS0FBTSxDQUFlLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDckMsS0FBSyxHQUFHLENBQUMsQ0FBQztBQUNYLEtBQUE7QUFDSCxDQUFDLENBQUM7QUFFSyxNQUFNLFNBQVMsR0FBRyxDQUFDLElBQWUsS0FBSTtJQUMzQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDakIsQ0FBQzs7QUNuT0Q7Ozs7QUFJRztBQTJISDs7Ozs7O0FBTUc7QUFDSCxNQUFNLDhCQUE4QixHQUFHLENBQ3JDLE1BQXNCLEVBQ3RCLFdBQW9CLEtBQ1Q7O0FBQ1gsSUFBQSxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsd0JBQXdCLENBQUM7SUFDakQsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFO0FBQzFCLFFBQUEsT0FBTyxLQUFLLENBQUM7QUFDZCxLQUFBO0FBQ0QsSUFBQSxLQUFLLE1BQU0sR0FBRyxJQUFJLFFBQVEsRUFBRTs7Ozs7Ozs7O1FBUzFCLENBQUEsRUFBQSxHQUFBLENBQUEsRUFBQSxHQUFDLEdBQXNCLEVBQUMsb0NBQW9DLENBQUMsbURBQzNELFdBQVcsRUFDWCxLQUFLLENBQ04sQ0FBQzs7QUFFRixRQUFBLDhCQUE4QixDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQztBQUNsRCxLQUFBO0FBQ0QsSUFBQSxPQUFPLElBQUksQ0FBQztBQUNkLENBQUMsQ0FBQztBQUVGOzs7OztBQUtHO0FBQ0gsTUFBTSw4QkFBOEIsR0FBRyxDQUFDLEdBQW1CLEtBQUk7SUFDN0QsSUFBSSxNQUFNLEVBQUUsUUFBUSxDQUFDO0lBQ3JCLEdBQUc7UUFDRCxJQUFJLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxRQUFRLE1BQU0sU0FBUyxFQUFFO1lBQ3pDLE1BQU07QUFDUCxTQUFBO0FBQ0QsUUFBQSxRQUFRLEdBQUcsTUFBTSxDQUFDLHdCQUF5QixDQUFDO0FBQzVDLFFBQUEsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyQixHQUFHLEdBQUcsTUFBTSxDQUFDO0tBQ2QsUUFBUSxDQUFBLFFBQVEsS0FBQSxJQUFBLElBQVIsUUFBUSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxHQUFSLFFBQVEsQ0FBRSxJQUFJLE1BQUssQ0FBQyxFQUFFO0FBQ2pDLENBQUMsQ0FBQztBQUVGLE1BQU0seUJBQXlCLEdBQUcsQ0FBQyxHQUFtQixLQUFJOzs7QUFHeEQsSUFBQSxLQUFLLElBQUksTUFBTSxHQUFHLE1BQU0sR0FBRyxHQUFHLENBQUMsUUFBUSxHQUFHLEdBQUcsR0FBRyxNQUFNLEVBQUU7QUFDdEQsUUFBQSxJQUFJLFFBQVEsR0FBRyxNQUFNLENBQUMsd0JBQXdCLENBQUM7UUFDL0MsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFO1lBQzFCLE1BQU0sQ0FBQyx3QkFBd0IsR0FBRyxRQUFRLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUN4RCxTQUFBO0FBQU0sYUFBQSxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7OztZQUc1QixNQUFNO0FBQ1AsU0FBQTtBQUNELFFBQUEsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQixvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM5QixLQUFBO0FBQ0gsQ0FBQyxDQUFDO0FBRUY7Ozs7OztBQU1HO0FBQ0gsU0FBUyx1QkFBdUIsQ0FBa0IsU0FBeUIsRUFBQTtBQUN6RSxJQUFBLElBQUksSUFBSSxDQUFDLHdCQUF3QixLQUFLLFNBQVMsRUFBRTtRQUMvQyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNyQyxRQUFBLElBQUksQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDO1FBQzFCLHlCQUF5QixDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2pDLEtBQUE7QUFBTSxTQUFBO0FBQ0wsUUFBQSxJQUFJLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQztBQUMzQixLQUFBO0FBQ0gsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW9CRztBQUNILFNBQVMsK0JBQStCLENBRXRDLFdBQW9CLEVBQ3BCLGVBQWUsR0FBRyxLQUFLLEVBQ3ZCLGFBQWEsR0FBRyxDQUFDLEVBQUE7QUFFakIsSUFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7QUFDcEMsSUFBQSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUM7SUFDL0MsSUFBSSxRQUFRLEtBQUssU0FBUyxJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFO1FBQ2pELE9BQU87QUFDUixLQUFBO0FBQ0QsSUFBQSxJQUFJLGVBQWUsRUFBRTtBQUNuQixRQUFBLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTs7OztBQUl4QixZQUFBLEtBQUssSUFBSSxDQUFDLEdBQUcsYUFBYSxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUNqRCw4QkFBOEIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDaEQsZ0JBQUEsOEJBQThCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUMsYUFBQTtBQUNGLFNBQUE7YUFBTSxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7Ozs7QUFJeEIsWUFBQSw4QkFBOEIsQ0FBQyxLQUF1QixFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQy9ELDhCQUE4QixDQUFDLEtBQXVCLENBQUMsQ0FBQztBQUN6RCxTQUFBO0FBQ0YsS0FBQTtBQUFNLFNBQUE7QUFDTCxRQUFBLDhCQUE4QixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztBQUNuRCxLQUFBO0FBQ0gsQ0FBQztBQUVEOztBQUVHO0FBQ0gsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLEdBQW1CLEtBQUk7OztBQUNuRCxJQUFBLElBQUssR0FBaUIsQ0FBQyxJQUFJLElBQUksUUFBUSxDQUFDLEtBQUssRUFBRTtBQUM3QyxRQUFBLENBQUEsRUFBQSxHQUFBLENBQUEsRUFBQSxHQUFDLEdBQWlCLEVBQUMseUJBQXlCLHVDQUF6Qix5QkFBeUIsR0FDMUMsK0JBQStCLENBQUMsQ0FBQTtBQUNsQyxRQUFBLENBQUEsRUFBQSxHQUFBLENBQUEsRUFBQSxHQUFDLEdBQWlCLEVBQUMseUJBQXlCLHVDQUF6Qix5QkFBeUIsR0FBSyx1QkFBdUIsQ0FBQyxDQUFBO0FBQzFFLEtBQUE7QUFDSCxDQUFDLENBQUM7QUFFRjs7Ozs7Ozs7Ozs7Ozs7OztBQWdCRztBQUNHLE1BQWdCLGNBQWUsU0FBUSxTQUFTLENBQUE7QUFBdEQsSUFBQSxXQUFBLEdBQUE7OztRQVlXLElBQXdCLENBQUEsd0JBQUEsR0FBeUIsU0FBUyxDQUFDO0tBZ0ZyRTtBQS9FQzs7Ozs7QUFLRztBQUNNLElBQUEsWUFBWSxDQUNuQixJQUFVLEVBQ1YsTUFBc0IsRUFDdEIsY0FBa0MsRUFBQTtRQUVsQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDakQseUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDaEMsUUFBQSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7S0FDdkM7O0FBRUQ7Ozs7Ozs7Ozs7O0FBV0c7QUFDTSxJQUFBLENBQUMsb0NBQW9DLENBQUMsQ0FDN0MsV0FBb0IsRUFDcEIsbUJBQW1CLEdBQUcsSUFBSSxFQUFBOztBQUUxQixRQUFBLElBQUksV0FBVyxLQUFLLElBQUksQ0FBQyxXQUFXLEVBQUU7QUFDcEMsWUFBQSxJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztBQUMvQixZQUFBLElBQUksV0FBVyxFQUFFO0FBQ2YsZ0JBQUEsQ0FBQSxFQUFBLEdBQUEsSUFBSSxDQUFDLFdBQVcsTUFBaEIsSUFBQSxJQUFBLEVBQUEsS0FBQSxLQUFBLENBQUEsR0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsSUFBQSxDQUFBLElBQUksQ0FBZ0IsQ0FBQztBQUN0QixhQUFBO0FBQU0saUJBQUE7QUFDTCxnQkFBQSxDQUFBLEVBQUEsR0FBQSxJQUFJLENBQUMsWUFBWSxNQUFqQixJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxJQUFBLENBQUEsSUFBSSxDQUFpQixDQUFDO0FBQ3ZCLGFBQUE7QUFDRixTQUFBO0FBQ0QsUUFBQSxJQUFJLG1CQUFtQixFQUFFO0FBQ3ZCLFlBQUEsOEJBQThCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ2xELDhCQUE4QixDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3RDLFNBQUE7S0FDRjtBQUVEOzs7Ozs7Ozs7QUFTRztBQUNILElBQUEsUUFBUSxDQUFDLEtBQWMsRUFBQTtBQUNyQixRQUFBLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLE1BQTZCLENBQUMsRUFBRTtZQUMxRCxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDckMsU0FBQTtBQUFNLGFBQUE7WUFNTCxNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBbUMsQ0FBQyxDQUFDO0FBQ3hFLFlBQUEsU0FBUyxDQUFDLElBQUksQ0FBQyxnQkFBaUIsQ0FBQyxHQUFHLEtBQUssQ0FBQztZQUN6QyxJQUFJLENBQUMsTUFBd0IsQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztBQUMvRCxTQUFBO0tBQ0Y7QUFFRDs7Ozs7QUFLRztBQUNPLElBQUEsWUFBWSxNQUFLO0FBQ2pCLElBQUEsV0FBVyxNQUFLO0FBQzNCOztBQ2xZRDs7OztBQUlHO0FBSUg7O0FBRUc7QUFDVSxNQUFBLFNBQVMsR0FBRyxNQUFtQixJQUFJLEdBQUcsR0FBTTtBQUV6RDs7QUFFRztBQUNILE1BQU0sR0FBRyxDQUFBO0FBTVIsQ0FBQTtBQVFEO0FBQ0E7QUFDQTtBQUNBLE1BQU0sc0JBQXNCLEdBQzFCLElBQUksT0FBTyxFQUFFLENBQUM7QUFJaEIsTUFBTSxZQUFhLFNBQVEsY0FBYyxDQUFBO0FBS3ZDLElBQUEsTUFBTSxDQUFDLElBQW1CLEVBQUE7QUFDeEIsUUFBQSxPQUFPLE9BQU8sQ0FBQztLQUNoQjtBQUVRLElBQUEsTUFBTSxDQUFDLElBQWlCLEVBQUUsQ0FBQyxHQUFHLENBQTZCLEVBQUE7O0FBQ2xFLFFBQUEsTUFBTSxVQUFVLEdBQUcsR0FBRyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUM7QUFDckMsUUFBQSxJQUFJLFVBQVUsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTs7O0FBR3pDLFlBQUEsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNqQyxTQUFBO1FBQ0QsSUFBSSxVQUFVLElBQUksSUFBSSxDQUFDLGtCQUFrQixLQUFLLElBQUksQ0FBQyxRQUFRLEVBQUU7OztBQUczRCxZQUFBLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDO1lBQ2hCLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQSxFQUFBLEdBQUEsSUFBSSxDQUFDLE9BQU8sTUFBRSxJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxJQUFJLENBQUM7QUFDbkMsWUFBQSxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3RELFNBQUE7QUFDRCxRQUFBLE9BQU8sT0FBTyxDQUFDO0tBQ2hCO0FBRU8sSUFBQSxlQUFlLENBQUMsT0FBNEIsRUFBQTtBQUNsRCxRQUFBLElBQUksT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRTs7Ozs7OztZQU9uQyxJQUFJLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssU0FBUyxFQUFFO2dCQUN2RCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQzFDLGFBQUE7WUFDRCxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQzs7WUFFL0MsSUFBSSxPQUFPLEtBQUssU0FBUyxFQUFFO2dCQUN6QixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ3hDLGFBQUE7QUFDRixTQUFBO0FBQU0sYUFBQTtBQUNKLFlBQUEsSUFBSSxDQUFDLElBQXFCLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQztBQUM3QyxTQUFBO0tBQ0Y7QUFFRCxJQUFBLElBQVksa0JBQWtCLEdBQUE7O0FBQzVCLFFBQUEsT0FBTyxPQUFPLElBQUksQ0FBQyxJQUFJLEtBQUssVUFBVTtjQUNsQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztBQUN2QyxjQUFFLENBQUEsRUFBQSxHQUFBLElBQUksQ0FBQyxJQUFJLE1BQUEsSUFBQSxJQUFBLEVBQUEsS0FBQSxLQUFBLENBQUEsR0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLENBQUUsS0FBSyxDQUFDO0tBQ3RCO0lBRVEsWUFBWSxHQUFBOzs7OztBQUtuQixRQUFBLElBQUksSUFBSSxDQUFDLGtCQUFrQixLQUFLLElBQUksQ0FBQyxRQUFRLEVBQUU7QUFDN0MsWUFBQSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2pDLFNBQUE7S0FDRjtJQUVRLFdBQVcsR0FBQTs7O0FBR2xCLFFBQUEsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDckM7QUFDRixDQUFBO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXdCRztBQUNJLE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUM7O0FDckkxQzs7OztBQUlHO0FBRUg7QUFDQTtBQUNBO0FBRUE7Ozs7O0FBS0c7QUFDSSxNQUFNLFVBQVUsR0FBRyxPQUN4QixRQUEwQixFQUMxQixRQUF3QyxLQUN0QztBQUNGLElBQUEsV0FBVyxNQUFNLENBQUMsSUFBSSxRQUFRLEVBQUU7UUFDOUIsSUFBSSxDQUFDLE1BQU0sUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssRUFBRTtZQUNqQyxPQUFPO0FBQ1IsU0FBQTtBQUNGLEtBQUE7QUFDSCxDQUFDLENBQUM7QUFFRjs7Ozs7QUFLRztNQUNVLGFBQWEsQ0FBQTtBQUV4QixJQUFBLFdBQUEsQ0FBWSxHQUFNLEVBQUE7QUFDaEIsUUFBQSxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQztLQUNqQjtBQUNEOztBQUVHO0lBQ0gsVUFBVSxHQUFBO0FBQ1IsUUFBQSxJQUFJLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQztLQUN2QjtBQUNEOztBQUVHO0FBQ0gsSUFBQSxTQUFTLENBQUMsR0FBTSxFQUFBO0FBQ2QsUUFBQSxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQztLQUNqQjtBQUNEOztBQUVHO0lBQ0gsS0FBSyxHQUFBO1FBQ0gsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0tBQ2xCO0FBQ0YsQ0FBQTtBQUVEOztBQUVHO01BQ1UsTUFBTSxDQUFBO0FBQW5CLElBQUEsV0FBQSxHQUFBO1FBQ1UsSUFBUSxDQUFBLFFBQUEsR0FBbUIsU0FBUyxDQUFDO1FBQ3JDLElBQVEsQ0FBQSxRQUFBLEdBQWdCLFNBQVMsQ0FBQztLQXdCM0M7QUF2QkM7Ozs7OztBQU1HO0lBQ0gsR0FBRyxHQUFBO1FBQ0QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0tBQ3RCO0FBQ0Q7O0FBRUc7SUFDSCxLQUFLLEdBQUE7O1FBQ0gsQ0FBQSxFQUFBLEdBQUEsSUFBSSxDQUFDLFFBQVEsTUFBYixJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsSUFBQSxJQUFJLENBQUMsUUFBUSxHQUFLLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxNQUFNLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQ3ZFO0FBQ0Q7O0FBRUc7SUFDSCxNQUFNLEdBQUE7O0FBQ0osUUFBQSxDQUFBLEVBQUEsR0FBQSxJQUFJLENBQUMsUUFBUSxNQUFiLElBQUEsSUFBQSxFQUFBLEtBQUEsS0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLElBQUEsQ0FBQSxJQUFJLENBQWEsQ0FBQztRQUNsQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDO0tBQzNDO0FBQ0Y7O0FDdkZEOzs7O0FBSUc7QUFTRyxNQUFPLHFCQUFzQixTQUFRLGNBQWMsQ0FBQTtBQUF6RCxJQUFBLFdBQUEsR0FBQTs7QUFFVSxRQUFBLElBQUEsQ0FBQSxVQUFVLEdBQUcsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDckMsUUFBQSxJQUFBLENBQUEsUUFBUSxHQUFHLElBQUksTUFBTSxFQUFFLENBQUM7S0E0RWpDOzs7SUF4RUMsTUFBTSxDQUFJLEtBQXVCLEVBQUUsT0FBbUIsRUFBQTtBQUNwRCxRQUFBLE9BQU8sUUFBUSxDQUFDO0tBQ2pCO0FBRVEsSUFBQSxNQUFNLENBQ2IsS0FBZ0IsRUFDaEIsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUE0QixFQUFBOzs7QUFJMUMsUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUNyQixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7QUFDckIsU0FBQTs7O0FBR0QsUUFBQSxJQUFJLEtBQUssS0FBSyxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQzFCLE9BQU87QUFDUixTQUFBO0FBQ0QsUUFBQSxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztRQUNyQixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDVixNQUFNLEVBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFDLEdBQUcsSUFBSSxDQUFDOzs7OztBQUt0RCxRQUFBLFVBQVUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFVLEtBQUk7OztBQUdyQyxZQUFBLE9BQU8sTUFBTSxDQUFDLEdBQUcsRUFBRSxFQUFFO0FBQ25CLGdCQUFBLE1BQU0sTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ3BCLGFBQUE7Ozs7QUFJRCxZQUFBLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUMvQixJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUU7OztBQUd2QixnQkFBQSxJQUFJLEtBQUssQ0FBQyxPQUFPLEtBQUssS0FBSyxFQUFFO0FBQzNCLG9CQUFBLE9BQU8sS0FBSyxDQUFDO0FBQ2QsaUJBQUE7Ozs7O2dCQU1ELElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRTtBQUN4QixvQkFBQSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNsQixpQkFBQTtBQUVELGdCQUFBLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3hCLGdCQUFBLENBQUMsRUFBRSxDQUFDO0FBQ0wsYUFBQTtBQUNELFlBQUEsT0FBTyxJQUFJLENBQUM7QUFDZCxTQUFDLENBQUMsQ0FBQztBQUNILFFBQUEsT0FBTyxRQUFRLENBQUM7S0FDakI7O0lBR1MsV0FBVyxDQUFDLEtBQWMsRUFBRSxNQUFjLEVBQUE7QUFDbEQsUUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ3RCO0lBRVEsWUFBWSxHQUFBO0FBQ25CLFFBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztBQUM3QixRQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7S0FDdkI7SUFFUSxXQUFXLEdBQUE7QUFDbEIsUUFBQSxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNoQyxRQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7S0FDeEI7QUFDRixDQUFBO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBaUJHO0FBQ0ksTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLHFCQUFxQixDQUFDOztBQ2hINUQ7Ozs7QUFJRztBQWdCSCxNQUFNLG9CQUFxQixTQUFRLHFCQUFxQixDQUFBOztBQUl0RCxJQUFBLFdBQUEsQ0FBWSxRQUFrQixFQUFBO1FBQzVCLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNoQixRQUFBLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsS0FBSyxFQUFFO0FBQ3BDLFlBQUEsTUFBTSxJQUFJLEtBQUssQ0FBQyxtREFBbUQsQ0FBQyxDQUFDO0FBQ3RFLFNBQUE7S0FDRjs7SUFHUSxNQUFNLENBQUMsSUFBZSxFQUFFLE1BQWlDLEVBQUE7QUFDaEUsUUFBQSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUN4QixPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0tBQ25DOztJQUdrQixXQUFXLENBQUMsS0FBYyxFQUFFLEtBQWEsRUFBQTs7O1FBRzFELElBQUksS0FBSyxLQUFLLENBQUMsRUFBRTtBQUNmLFlBQUEsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUM3QixTQUFBOztRQUVELE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDN0MsUUFBQSxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDbkM7QUFDRixDQUFBO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBaUJHO0FBQ0ksTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDLG9CQUFvQixDQUFDOztBQ3BFMUQ7Ozs7QUFJRztBQXVCSCxNQUFNLGNBQWUsU0FBUSxTQUFTLENBQUE7QUFJcEMsSUFBQSxXQUFBLENBQVksUUFBa0IsRUFBQTtRQUM1QixLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7QUFKVixRQUFBLElBQUEsQ0FBQSxjQUFjLEdBQUcsSUFBSSxPQUFPLEVBQWtDLENBQUM7S0FLdEU7QUFFRCxJQUFBLE1BQU0sQ0FBQyxDQUFVLEVBQUE7OztRQUdmLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNaO0FBRVEsSUFBQSxNQUFNLENBQUMsYUFBd0IsRUFBRSxDQUFDLENBQUMsQ0FBNEIsRUFBQTs7OztBQUl0RSxRQUFBLElBQ0UsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztBQUM3QixhQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUMzRDs7QUFFQSxZQUFBLE1BQU0sU0FBUyxHQUFHLGlCQUFpQixDQUFDLGFBQWEsQ0FBcUIsQ0FBQztBQUN2RSxZQUFBLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxHQUFHLEVBQUcsQ0FBQztBQUNuQyxZQUFBLElBQUksbUJBQW1CLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN2RSxJQUFJLG1CQUFtQixLQUFLLFNBQVMsRUFBRTtBQUNyQyxnQkFBQSxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztBQUNuRCxnQkFBQSxtQkFBbUIsR0FBRyxNQUFNLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQ2hELGdCQUFBLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN4QyxnQkFBQSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0FBQ25FLGFBQUE7O0FBRUQsWUFBQSxpQkFBaUIsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7QUFDcEQsWUFBQSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ3ZELFNBQUE7Ozs7QUFJRCxRQUFBLElBQUksZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDdkIsWUFBQSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxLQUFLLENBQUMsQ0FBQyxPQUFPLEVBQUU7QUFDdkUsZ0JBQUEsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQy9ELElBQUksbUJBQW1CLEtBQUssU0FBUyxFQUFFOztBQUVyQyxvQkFBQSxNQUFNLFNBQVMsR0FBRyxpQkFBaUIsQ0FDakMsbUJBQW1CLENBQ0EsQ0FBQztBQUN0QixvQkFBQSxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFHLENBQUM7O29CQUVwQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDekIsb0JBQUEsVUFBVSxDQUFDLGFBQWEsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDakQsb0JBQUEsaUJBQWlCLENBQUMsYUFBYSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztBQUNoRCxpQkFBQTtBQUNGLGFBQUE7QUFDRCxZQUFBLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0FBQ2pCLFNBQUE7QUFBTSxhQUFBO0FBQ0wsWUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQztBQUN6QixTQUFBO0FBQ0QsUUFBQSxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDdkI7QUFDRixDQUFBO0FBRUQ7Ozs7Ozs7Ozs7Ozs7QUFhRztBQUNJLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxjQUFjLENBQUM7O0FDdkc5Qzs7OztBQUlHO0FBRUg7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXdCRztBQUNJLE1BQU0sTUFBTSxHQUFHLENBQ3BCLEtBQVEsRUFDUixLQUEwQixFQUMxQixXQUFxQixLQUNuQjtBQUNGLElBQUEsS0FBSyxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUU7QUFDckIsUUFBQSxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkIsSUFBSSxTQUFTLEtBQUssS0FBSyxFQUFFO0FBQ3ZCLFlBQUEsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLE9BQU8sRUFBRSxFQUFFLENBQUM7QUFDYixTQUFBO0FBQ0YsS0FBQTtBQUNELElBQUEsT0FBTyxXQUFXLEtBQVgsSUFBQSxJQUFBLFdBQVcsS0FBWCxLQUFBLENBQUEsR0FBQSxLQUFBLENBQUEsR0FBQSxXQUFXLEVBQUksQ0FBQztBQUN6QixDQUFDOztBQzVDRDs7OztBQUlHO0FBa0JILE1BQU0saUJBQWtCLFNBQVEsU0FBUyxDQUFBO0FBUXZDLElBQUEsV0FBQSxDQUFZLFFBQWtCLEVBQUE7O1FBQzVCLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNoQixRQUFBLElBQ0UsUUFBUSxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsU0FBUztZQUNwQyxRQUFRLENBQUMsSUFBSSxLQUFLLE9BQU87WUFDekIsQ0FBQyxDQUFBLEVBQUEsR0FBQSxRQUFRLENBQUMsT0FBTywwQ0FBRSxNQUFpQixJQUFHLENBQUMsRUFDeEM7WUFDQSxNQUFNLElBQUksS0FBSyxDQUNiLHlEQUF5RDtBQUN2RCxnQkFBQSw2Q0FBNkMsQ0FDaEQsQ0FBQztBQUNILFNBQUE7S0FDRjtBQUVELElBQUEsTUFBTSxDQUFDLFNBQW9CLEVBQUE7O0FBRXpCLFFBQUEsUUFDRSxHQUFHO0FBQ0gsWUFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztpQkFDbkIsTUFBTSxDQUFDLENBQUMsR0FBRyxLQUFLLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDL0IsSUFBSSxDQUFDLEdBQUcsQ0FBQztBQUNaLFlBQUEsR0FBRyxFQUNIO0tBQ0g7QUFFUSxJQUFBLE1BQU0sQ0FBQyxJQUFtQixFQUFFLENBQUMsU0FBUyxDQUE0QixFQUFBOzs7QUFFekUsUUFBQSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsS0FBSyxTQUFTLEVBQUU7QUFDdkMsWUFBQSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUNsQyxZQUFBLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUU7Z0JBQzlCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxHQUFHLENBQzNCLElBQUksQ0FBQyxPQUFPO3FCQUNULElBQUksQ0FBQyxHQUFHLENBQUM7cUJBQ1QsS0FBSyxDQUFDLElBQUksQ0FBQztxQkFDWCxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUMzQixDQUFDO0FBQ0gsYUFBQTtBQUNELFlBQUEsS0FBSyxNQUFNLElBQUksSUFBSSxTQUFTLEVBQUU7QUFDNUIsZ0JBQUEsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQyxDQUFBLEVBQUEsR0FBQSxJQUFJLENBQUMsY0FBYyxNQUFFLElBQUEsSUFBQSxFQUFBLEtBQUEsS0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQSxFQUFFO0FBQ3RELG9CQUFBLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDakMsaUJBQUE7QUFDRixhQUFBO0FBQ0QsWUFBQSxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDL0IsU0FBQTtBQUVELFFBQUEsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7Ozs7UUFLekMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksS0FBSTtBQUNyQyxZQUFBLElBQUksRUFBRSxJQUFJLElBQUksU0FBUyxDQUFDLEVBQUU7QUFDeEIsZ0JBQUEsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN2QixnQkFBQSxJQUFJLENBQUMsZ0JBQWlCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3JDLGFBQUE7QUFDSCxTQUFDLENBQUMsQ0FBQzs7QUFHSCxRQUFBLEtBQUssTUFBTSxJQUFJLElBQUksU0FBUyxFQUFFOzs7WUFHNUIsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoQyxJQUNFLEtBQUssS0FBSyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztnQkFDekMsRUFBQyxDQUFBLEVBQUEsR0FBQSxJQUFJLENBQUMsY0FBYyxNQUFFLElBQUEsSUFBQSxFQUFBLEtBQUEsS0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQSxFQUMvQjtBQUNBLGdCQUFBLElBQUksS0FBSyxFQUFFO0FBQ1Qsb0JBQUEsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNwQixvQkFBQSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2pDLGlCQUFBO0FBQU0scUJBQUE7QUFDTCxvQkFBQSxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3ZCLG9CQUFBLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDcEMsaUJBQUE7QUFDRixhQUFBO0FBQ0YsU0FBQTtBQUNELFFBQUEsT0FBTyxRQUFRLENBQUM7S0FDakI7QUFDRixDQUFBO0FBRUQ7Ozs7Ozs7Ozs7Ozs7QUFhRztBQUNJLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQzs7QUMzSHBEOzs7O0FBSUc7QUFLSDtBQUNBLE1BQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQztBQUV4QixNQUFNLGNBQWUsU0FBUSxTQUFTLENBQUE7QUFBdEMsSUFBQSxXQUFBLEdBQUE7O1FBQ1UsSUFBYyxDQUFBLGNBQUEsR0FBWSxZQUFZLENBQUM7S0EyQmhEO0lBekJDLE1BQU0sQ0FBQyxNQUFlLEVBQUUsQ0FBZ0IsRUFBQTtRQUN0QyxPQUFPLENBQUMsRUFBRSxDQUFDO0tBQ1o7QUFFUSxJQUFBLE1BQU0sQ0FBQyxLQUFXLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUE0QixFQUFBO0FBQ2hFLFFBQUEsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFOztBQUV4QixZQUFBLElBQ0UsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDO0FBQ2xDLGdCQUFBLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxNQUFNO0FBQzNDLGdCQUFBLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBTSxJQUFJLENBQUMsY0FBaUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUN2RTtBQUNBLGdCQUFBLE9BQU8sUUFBUSxDQUFDO0FBQ2pCLGFBQUE7QUFDRixTQUFBO0FBQU0sYUFBQSxJQUFJLElBQUksQ0FBQyxjQUFjLEtBQUssS0FBSyxFQUFFOztBQUV4QyxZQUFBLE9BQU8sUUFBUSxDQUFDO0FBQ2pCLFNBQUE7OztRQUlELElBQUksQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQztRQUN2RSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNoQyxRQUFBLE9BQU8sQ0FBQyxDQUFDO0tBQ1Y7QUFDRixDQUFBO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUF3Q0c7QUFDSSxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsY0FBYyxDQUFDOztBQ25GOUM7Ozs7QUFJRztBQUlIOzs7OztBQUtHO0FBQ0ksTUFBTSxTQUFTLEdBQUcsQ0FBSSxLQUFRLEtBQUssS0FBSyxhQUFMLEtBQUssS0FBQSxLQUFBLENBQUEsR0FBTCxLQUFLLEdBQUksT0FBTzs7QUNkMUQ7Ozs7QUFJRztVQXVCYyxJQUFJLENBQU8sS0FBOEIsRUFBRSxNQUFTLEVBQUE7QUFDbkUsSUFBQSxNQUFNLFVBQVUsR0FBRyxPQUFPLE1BQU0sS0FBSyxVQUFVLENBQUM7SUFDaEQsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFO0FBQ3ZCLFFBQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDWCxRQUFBLEtBQUssTUFBTSxLQUFLLElBQUksS0FBSyxFQUFFO0FBQ3pCLFlBQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7QUFDVixnQkFBQSxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDO0FBQ3ZDLGFBQUE7QUFDRCxZQUFBLENBQUMsRUFBRSxDQUFDO0FBQ0osWUFBQSxNQUFNLEtBQUssQ0FBQztBQUNiLFNBQUE7QUFDRixLQUFBO0FBQ0g7O0FDdkNBOzs7O0FBSUc7QUFXSCxNQUFNLEtBQU0sU0FBUSxTQUFTLENBQUE7QUFBN0IsSUFBQSxXQUFBLEdBQUE7O1FBQ0UsSUFBRyxDQUFBLEdBQUEsR0FBWSxPQUFPLENBQUM7S0FpQnhCO0lBZkMsTUFBTSxDQUFDLENBQVUsRUFBRSxDQUFVLEVBQUE7QUFDM0IsUUFBQSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztBQUNiLFFBQUEsT0FBTyxDQUFDLENBQUM7S0FDVjtBQUVRLElBQUEsTUFBTSxDQUFDLElBQWUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQTRCLEVBQUE7QUFDaEUsUUFBQSxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxFQUFFOzs7O1lBSWxCLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3hCLFlBQUEsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7QUFDZCxTQUFBO0FBQ0QsUUFBQSxPQUFPLENBQUMsQ0FBQztLQUNWO0FBQ0YsQ0FBQTtBQUVEOzs7Ozs7OztBQVFHO0FBQ0ksTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQzs7QUM1Q3JDOzs7O0FBSUc7QUFZSCxNQUFNLGFBQWMsU0FBUSxTQUFTLENBQUE7QUFDbkMsSUFBQSxXQUFBLENBQVksUUFBa0IsRUFBQTtRQUM1QixLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDaEIsSUFDRSxFQUNFLFFBQVEsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLFFBQVE7QUFDbkMsWUFBQSxRQUFRLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxTQUFTO0FBQ3BDLFlBQUEsUUFBUSxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsaUJBQWlCLENBQzdDLEVBQ0Q7QUFDQSxZQUFBLE1BQU0sSUFBSSxLQUFLLENBQ2IsZ0VBQWdFLENBQ2pFLENBQUM7QUFDSCxTQUFBO0FBQ0QsUUFBQSxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLEVBQUU7QUFDakMsWUFBQSxNQUFNLElBQUksS0FBSyxDQUFDLHNEQUFzRCxDQUFDLENBQUM7QUFDekUsU0FBQTtLQUNGO0FBRUQsSUFBQSxNQUFNLENBQUMsS0FBYyxFQUFBO0FBQ25CLFFBQUEsT0FBTyxLQUFLLENBQUM7S0FDZDtBQUVRLElBQUEsTUFBTSxDQUFDLElBQW1CLEVBQUUsQ0FBQyxLQUFLLENBQTRCLEVBQUE7QUFDckUsUUFBQSxJQUFJLEtBQUssS0FBSyxRQUFRLElBQUksS0FBSyxLQUFLLE9BQU8sRUFBRTtBQUMzQyxZQUFBLE9BQU8sS0FBSyxDQUFDO0FBQ2QsU0FBQTtBQUNELFFBQUEsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUM3QixRQUFBLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7QUFFdkIsUUFBQSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLFFBQVEsRUFBRTs7QUFFbkMsWUFBQSxJQUFJLEtBQUssS0FBTSxPQUFlLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDcEMsZ0JBQUEsT0FBTyxRQUFRLENBQUM7QUFDakIsYUFBQTtBQUNGLFNBQUE7QUFBTSxhQUFBLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsaUJBQWlCLEVBQUU7WUFDbkQsSUFBSSxDQUFDLENBQUMsS0FBSyxLQUFLLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDMUMsZ0JBQUEsT0FBTyxRQUFRLENBQUM7QUFDakIsYUFBQTtBQUNGLFNBQUE7QUFBTSxhQUFBLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsU0FBUyxFQUFFO1lBQzNDLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUU7QUFDaEQsZ0JBQUEsT0FBTyxRQUFRLENBQUM7QUFDakIsYUFBQTtBQUNGLFNBQUE7OztRQUdELGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3hCLFFBQUEsT0FBTyxLQUFLLENBQUM7S0FDZDtBQUNGLENBQUE7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUF1Qkc7QUFDSSxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDOztBQzNGNUM7Ozs7QUFJRztBQUVIOzs7Ozs7Ozs7Ozs7Ozs7QUFlRztVQUNjLEdBQUcsQ0FDbEIsS0FBOEIsRUFDOUIsQ0FBdUMsRUFBQTtJQUV2QyxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUU7UUFDdkIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ1YsUUFBQSxLQUFLLE1BQU0sS0FBSyxJQUFJLEtBQUssRUFBRTtBQUN6QixZQUFBLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3JCLFNBQUE7QUFDRixLQUFBO0FBQ0g7O0FDaENBOzs7O0FBSUc7QUF3QkcsVUFBVyxLQUFLLENBQUMsVUFBa0IsRUFBRSxHQUFZLEVBQUUsSUFBSSxHQUFHLENBQUMsRUFBQTtBQUMvRCxJQUFBLE1BQU0sS0FBSyxHQUFHLEdBQUcsS0FBSyxTQUFTLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQztJQUNqRCxHQUFHLEtBQUEsSUFBQSxJQUFILEdBQUcsS0FBSCxLQUFBLENBQUEsR0FBQSxHQUFHLElBQUgsR0FBRyxHQUFLLFVBQVUsQ0FBQyxDQUFBO0lBQ25CLEtBQUssSUFBSSxDQUFDLEdBQUcsS0FBSyxFQUFFLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLEVBQUU7QUFDM0QsUUFBQSxNQUFNLENBQUMsQ0FBQztBQUNULEtBQUE7QUFDSDs7QUNsQ0E7Ozs7QUFJRztBQWVIO0FBQ0E7QUFDQTtBQUNBLE1BQU0sV0FBVyxHQUFHLENBQUMsSUFBZSxFQUFFLEtBQWEsRUFBRSxHQUFXLEtBQUk7QUFDbEUsSUFBQSxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBbUIsQ0FBQztJQUN2QyxLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ2pDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3JCLEtBQUE7QUFDRCxJQUFBLE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyxDQUFDO0FBRUYsTUFBTSxlQUFnQixTQUFRLFNBQVMsQ0FBQTtBQUdyQyxJQUFBLFdBQUEsQ0FBWSxRQUFrQixFQUFBO1FBQzVCLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNoQixRQUFBLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsS0FBSyxFQUFFO0FBQ3BDLFlBQUEsTUFBTSxJQUFJLEtBQUssQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO0FBQ2xFLFNBQUE7S0FDRjtBQUVPLElBQUEsaUJBQWlCLENBQ3ZCLEtBQWtCLEVBQ2xCLGVBQTJDLEVBQzNDLFFBQTBCLEVBQUE7QUFFMUIsUUFBQSxJQUFJLEtBQTJCLENBQUM7UUFDaEMsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFO1lBQzFCLFFBQVEsR0FBRyxlQUFlLENBQUM7QUFDNUIsU0FBQTthQUFNLElBQUksZUFBZSxLQUFLLFNBQVMsRUFBRTtZQUN4QyxLQUFLLEdBQUcsZUFBMkIsQ0FBQztBQUNyQyxTQUFBO1FBQ0QsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2hCLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUNsQixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7QUFDZCxRQUFBLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO0FBQ3hCLFlBQUEsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQztZQUNqRCxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsUUFBUyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztBQUN2QyxZQUFBLEtBQUssRUFBRSxDQUFDO0FBQ1QsU0FBQTtRQUNELE9BQU87WUFDTCxNQUFNO1lBQ04sSUFBSTtTQUNMLENBQUM7S0FDSDtBQVFELElBQUEsTUFBTSxDQUNKLEtBQWtCLEVBQ2xCLGVBQTJDLEVBQzNDLFFBQTBCLEVBQUE7QUFFMUIsUUFBQSxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQztLQUN4RTtJQUVRLE1BQU0sQ0FDYixhQUF3QixFQUN4QixDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsUUFBUSxDQUloQyxFQUFBOzs7O0FBSUQsUUFBQSxNQUFNLFFBQVEsR0FBRyxpQkFBaUIsQ0FDaEMsYUFBYSxDQUNhLENBQUM7UUFDN0IsTUFBTSxFQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBQyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FDL0QsS0FBSyxFQUNMLGVBQWUsRUFDZixRQUFRLENBQ1QsQ0FBQzs7Ozs7O0FBT0YsUUFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRTtBQUM1QixZQUFBLElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDO0FBQ3pCLFlBQUEsT0FBTyxTQUFTLENBQUM7QUFDbEIsU0FBQTs7Ozs7O0FBT0QsUUFBQSxNQUFNLE9BQU8sSUFBSSxDQUFBLEVBQUEsR0FBQSxJQUFJLENBQUMsU0FBUyxNQUFkLElBQUEsSUFBQSxFQUFBLEtBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxJQUFBLElBQUksQ0FBQyxTQUFTLEdBQUssRUFBRSxFQUFDLENBQUM7Ozs7UUFLeEMsTUFBTSxRQUFRLEdBQWdCLEVBQUUsQ0FBQzs7Ozs7QUFNakMsUUFBQSxJQUFJLGdCQUF1QyxDQUFDO0FBQzVDLFFBQUEsSUFBSSxnQkFBdUMsQ0FBQzs7UUFHNUMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDO0FBQ2hCLFFBQUEsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDbEMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDO0FBQ2hCLFFBQUEsSUFBSSxPQUFPLEdBQUcsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFzTW5DLFFBQUEsT0FBTyxPQUFPLElBQUksT0FBTyxJQUFJLE9BQU8sSUFBSSxPQUFPLEVBQUU7QUFDL0MsWUFBQSxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLEVBQUU7OztBQUc5QixnQkFBQSxPQUFPLEVBQUUsQ0FBQztBQUNYLGFBQUE7QUFBTSxpQkFBQSxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLEVBQUU7OztBQUdyQyxnQkFBQSxPQUFPLEVBQUUsQ0FBQztBQUNYLGFBQUE7aUJBQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFOztBQUVoRCxnQkFBQSxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsaUJBQWlCLENBQ25DLFFBQVEsQ0FBQyxPQUFPLENBQUUsRUFDbEIsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUNuQixDQUFDO0FBQ0YsZ0JBQUEsT0FBTyxFQUFFLENBQUM7QUFDVixnQkFBQSxPQUFPLEVBQUUsQ0FBQztBQUNYLGFBQUE7aUJBQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFOztBQUVoRCxnQkFBQSxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsaUJBQWlCLENBQ25DLFFBQVEsQ0FBQyxPQUFPLENBQUUsRUFDbEIsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUNuQixDQUFDO0FBQ0YsZ0JBQUEsT0FBTyxFQUFFLENBQUM7QUFDVixnQkFBQSxPQUFPLEVBQUUsQ0FBQztBQUNYLGFBQUE7aUJBQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFOztBQUVoRCxnQkFBQSxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsaUJBQWlCLENBQ25DLFFBQVEsQ0FBQyxPQUFPLENBQUUsRUFDbEIsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUNuQixDQUFDO0FBQ0YsZ0JBQUEsVUFBVSxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUUsQ0FBQyxDQUFDO0FBQ3JFLGdCQUFBLE9BQU8sRUFBRSxDQUFDO0FBQ1YsZ0JBQUEsT0FBTyxFQUFFLENBQUM7QUFDWCxhQUFBO2lCQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTs7QUFFaEQsZ0JBQUEsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLGlCQUFpQixDQUNuQyxRQUFRLENBQUMsT0FBTyxDQUFFLEVBQ2xCLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FDbkIsQ0FBQztBQUNGLGdCQUFBLFVBQVUsQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBRSxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUUsQ0FBQyxDQUFDO0FBQ2xFLGdCQUFBLE9BQU8sRUFBRSxDQUFDO0FBQ1YsZ0JBQUEsT0FBTyxFQUFFLENBQUM7QUFDWCxhQUFBO0FBQU0saUJBQUE7Z0JBQ0wsSUFBSSxnQkFBZ0IsS0FBSyxTQUFTLEVBQUU7OztvQkFHbEMsZ0JBQWdCLEdBQUcsV0FBVyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQzFELGdCQUFnQixHQUFHLFdBQVcsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQzNELGlCQUFBO2dCQUNELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUU7O0FBRTNDLG9CQUFBLFVBQVUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFFLENBQUMsQ0FBQztBQUMvQixvQkFBQSxPQUFPLEVBQUUsQ0FBQztBQUNYLGlCQUFBO3FCQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUU7O0FBRWxELG9CQUFBLFVBQVUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFFLENBQUMsQ0FBQztBQUMvQixvQkFBQSxPQUFPLEVBQUUsQ0FBQztBQUNYLGlCQUFBO0FBQU0scUJBQUE7Ozs7b0JBSUwsTUFBTSxRQUFRLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ3hELG9CQUFBLE1BQU0sT0FBTyxHQUFHLFFBQVEsS0FBSyxTQUFTLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksQ0FBQztvQkFDbkUsSUFBSSxPQUFPLEtBQUssSUFBSSxFQUFFOzs7d0JBR3BCLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBRSxDQUFDLENBQUM7d0JBQzlELGlCQUFpQixDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUMvQyx3QkFBQSxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDO0FBQzdCLHFCQUFBO0FBQU0seUJBQUE7O0FBRUwsd0JBQUEsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQzt3QkFDbkUsVUFBVSxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7OztBQUd2RCx3QkFBQSxRQUFRLENBQUMsUUFBa0IsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUNyQyxxQkFBQTtBQUNELG9CQUFBLE9BQU8sRUFBRSxDQUFDO0FBQ1gsaUJBQUE7QUFDRixhQUFBO0FBQ0YsU0FBQTs7UUFFRCxPQUFPLE9BQU8sSUFBSSxPQUFPLEVBQUU7OztBQUd6QixZQUFBLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pFLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUMvQyxZQUFBLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQztBQUMvQixTQUFBOztRQUVELE9BQU8sT0FBTyxJQUFJLE9BQU8sRUFBRTtBQUN6QixZQUFBLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ3BDLElBQUksT0FBTyxLQUFLLElBQUksRUFBRTtnQkFDcEIsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3JCLGFBQUE7QUFDRixTQUFBOztBQUdELFFBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUM7O0FBRXpCLFFBQUEsaUJBQWlCLENBQUMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQzNDLFFBQUEsT0FBTyxRQUFRLENBQUM7S0FDakI7QUFDRixDQUFBO0FBZ0JEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUE4Qkc7QUFDSSxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsZUFBZSxDQUFzQjs7QUNoZXJFOzs7O0FBSUc7QUFzQkgsTUFBTSxpQkFBa0IsU0FBUSxTQUFTLENBQUE7QUFHdkMsSUFBQSxXQUFBLENBQVksUUFBa0IsRUFBQTs7UUFDNUIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2hCLFFBQUEsSUFDRSxRQUFRLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxTQUFTO1lBQ3BDLFFBQVEsQ0FBQyxJQUFJLEtBQUssT0FBTztZQUN6QixDQUFDLENBQUEsRUFBQSxHQUFBLFFBQVEsQ0FBQyxPQUFPLDBDQUFFLE1BQWlCLElBQUcsQ0FBQyxFQUN4QztZQUNBLE1BQU0sSUFBSSxLQUFLLENBQ2IsaUVBQWlFO0FBQy9ELGdCQUFBLDZDQUE2QyxDQUNoRCxDQUFDO0FBQ0gsU0FBQTtLQUNGO0FBRUQsSUFBQSxNQUFNLENBQUMsU0FBb0IsRUFBQTtBQUN6QixRQUFBLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxLQUFJO0FBQ25ELFlBQUEsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlCLElBQUksS0FBSyxJQUFJLElBQUksRUFBRTtBQUNqQixnQkFBQSxPQUFPLEtBQUssQ0FBQztBQUNkLGFBQUE7Ozs7Ozs7O0FBUUQsWUFBQSxJQUFJLEdBQUcsSUFBSTtBQUNSLGlCQUFBLE9BQU8sQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLENBQUM7QUFDbkQsaUJBQUEsV0FBVyxFQUFFLENBQUM7QUFDakIsWUFBQSxPQUFPLEtBQUssR0FBRyxDQUFBLEVBQUcsSUFBSSxDQUFJLENBQUEsRUFBQSxLQUFLLEdBQUcsQ0FBQztTQUNwQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ1I7QUFFUSxJQUFBLE1BQU0sQ0FBQyxJQUFtQixFQUFFLENBQUMsU0FBUyxDQUE0QixFQUFBO0FBQ3pFLFFBQUEsTUFBTSxFQUFDLEtBQUssRUFBQyxHQUFHLElBQUksQ0FBQyxPQUFzQixDQUFDO0FBRTVDLFFBQUEsSUFBSSxJQUFJLENBQUMsd0JBQXdCLEtBQUssU0FBUyxFQUFFO0FBQy9DLFlBQUEsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7QUFDMUMsWUFBQSxLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsRUFBRTtBQUM1QixnQkFBQSxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3pDLGFBQUE7QUFDRCxZQUFBLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUMvQixTQUFBOzs7O1FBS0QsSUFBSSxDQUFDLHdCQUF5QixDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksS0FBSTs7QUFFOUMsWUFBQSxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUU7QUFDM0IsZ0JBQUEsSUFBSSxDQUFDLHdCQUF5QixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM1QyxnQkFBQSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7QUFDdEIsb0JBQUEsS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM1QixpQkFBQTtBQUFNLHFCQUFBOzs7O0FBSUosb0JBQUEsS0FBYSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUMzQixpQkFBQTtBQUNGLGFBQUE7QUFDSCxTQUFDLENBQUMsQ0FBQzs7QUFHSCxRQUFBLEtBQUssTUFBTSxJQUFJLElBQUksU0FBUyxFQUFFO0FBQzVCLFlBQUEsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlCLElBQUksS0FBSyxJQUFJLElBQUksRUFBRTtBQUNqQixnQkFBQSxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3hDLGdCQUFBLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtBQUN0QixvQkFBQSxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztBQUNoQyxpQkFBQTtBQUFNLHFCQUFBOztBQUVKLG9CQUFBLEtBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUM7QUFDOUIsaUJBQUE7QUFDRixhQUFBO0FBQ0YsU0FBQTtBQUNELFFBQUEsT0FBTyxRQUFRLENBQUM7S0FDakI7QUFDRixDQUFBO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7QUFnQkc7QUFDSSxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsaUJBQWlCLENBQUM7O0FDOUhwRDs7OztBQUlHO0FBS0gsTUFBTSx3QkFBeUIsU0FBUSxTQUFTLENBQUE7QUFHOUMsSUFBQSxXQUFBLENBQVksUUFBa0IsRUFBQTtRQUM1QixLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDaEIsUUFBQSxJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLEtBQUssRUFBRTtBQUNwQyxZQUFBLE1BQU0sSUFBSSxLQUFLLENBQUMsb0RBQW9ELENBQUMsQ0FBQztBQUN2RSxTQUFBO0tBQ0Y7QUFFRCxJQUFBLE1BQU0sQ0FBQyxRQUE2QixFQUFBO0FBQ2xDLFFBQUEsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssUUFBUSxFQUFFO0FBQ3ZDLFlBQUEsT0FBTyxRQUFRLENBQUM7QUFDakIsU0FBQTtBQUNELFFBQUEsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFFBQVEsQ0FBQztRQUNsQyxPQUFPLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztLQUNwRDtBQUNGLENBQUE7QUFFRDs7Ozs7O0FBTUc7QUFDSSxNQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsd0JBQXdCLENBQUM7O0FDbkNsRTs7OztBQUlHO0FBS0gsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDO0FBRWhCLE1BQU8sbUJBQW9CLFNBQVEsU0FBUyxDQUFBO0FBT2hELElBQUEsV0FBQSxDQUFZLFFBQWtCLEVBQUE7UUFDNUIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBSlYsSUFBTSxDQUFBLE1BQUEsR0FBWSxPQUFPLENBQUM7QUFLaEMsUUFBQSxJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLEtBQUssRUFBRTtZQUNwQyxNQUFNLElBQUksS0FBSyxDQUNiLENBQ0csRUFBQSxJQUFJLENBQUMsV0FBMEMsQ0FBQyxhQUNuRCxDQUF1QyxxQ0FBQSxDQUFBLENBQ3hDLENBQUM7QUFDSCxTQUFBO0tBQ0Y7QUFFRCxJQUFBLE1BQU0sQ0FBQyxLQUFtRSxFQUFBO0FBQ3hFLFFBQUEsSUFBSSxLQUFLLEtBQUssT0FBTyxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7QUFDdEMsWUFBQSxJQUFJLENBQUMsZUFBZSxHQUFHLFNBQVMsQ0FBQztBQUNqQyxZQUFBLFFBQVEsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLEVBQUU7QUFDOUIsU0FBQTtRQUNELElBQUksS0FBSyxLQUFLLFFBQVEsRUFBRTtBQUN0QixZQUFBLE9BQU8sS0FBSyxDQUFDO0FBQ2QsU0FBQTtBQUNELFFBQUEsSUFBSSxPQUFPLEtBQUssSUFBSSxRQUFRLEVBQUU7WUFDNUIsTUFBTSxJQUFJLEtBQUssQ0FDYixDQUNHLEVBQUEsSUFBSSxDQUFDLFdBQTBDLENBQUMsYUFDbkQsQ0FBbUMsaUNBQUEsQ0FBQSxDQUNwQyxDQUFDO0FBQ0gsU0FBQTtBQUNELFFBQUEsSUFBSSxLQUFLLEtBQUssSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUN6QixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUM7QUFDN0IsU0FBQTtBQUNELFFBQUEsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7QUFDcEIsUUFBQSxNQUFNLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBb0MsQ0FBQzs7QUFFMUQsUUFBQSxPQUFlLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQzs7O0FBRy9CLFFBQUEsUUFBUSxJQUFJLENBQUMsZUFBZSxHQUFHOzs7O0FBSTdCLFlBQUEsQ0FBQyxZQUFZLEdBQUksSUFBSSxDQUFDLFdBQTBDO2lCQUM3RCxVQUFtQjtZQUN0QixPQUFPO0FBQ1AsWUFBQSxNQUFNLEVBQUUsRUFBRTtBQUNYLFNBQUEsRUFBRTtLQUNKOztBQWxETSxtQkFBYSxDQUFBLGFBQUEsR0FBRyxZQUFZLENBQUM7QUFDN0IsbUJBQVUsQ0FBQSxVQUFBLEdBQUcsV0FBVyxDQUFDO0FBb0RsQzs7Ozs7Ozs7O0FBU0c7QUFDSSxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsbUJBQW1CLENBQUM7O0FDM0V4RDs7OztBQUlHO0FBS0gsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDO0FBRXJCLE1BQU0sa0JBQW1CLFNBQVEsbUJBQW1CLENBQUE7O0FBQ2xDLGtCQUFhLENBQUEsYUFBQSxHQUFHLFdBQVcsQ0FBQztBQUM1QixrQkFBVSxDQUFBLFVBQUEsR0FBRyxVQUFVLENBQUM7QUFHMUM7Ozs7Ozs7OztBQVNHO0FBQ0ksTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLGtCQUFrQixDQUFDOztBQzFCdEQ7Ozs7QUFJRztBQVFILE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBVSxLQUFJO0FBQy9CLElBQUEsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxPQUFRLENBQXNCLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQztBQUMvRSxDQUFDLENBQUM7QUFDRjtBQUNBLE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQztBQUV2QixNQUFPLGNBQWUsU0FBUSxjQUFjLENBQUE7QUFBbEQsSUFBQSxXQUFBLEdBQUE7O1FBQ1UsSUFBbUIsQ0FBQSxtQkFBQSxHQUFXLFNBQVMsQ0FBQztRQUN4QyxJQUFRLENBQUEsUUFBQSxHQUFjLEVBQUUsQ0FBQztBQUN6QixRQUFBLElBQUEsQ0FBQSxVQUFVLEdBQUcsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDckMsUUFBQSxJQUFBLENBQUEsUUFBUSxHQUFHLElBQUksTUFBTSxFQUFFLENBQUM7S0FzRmpDO0lBcEZDLE1BQU0sQ0FBQyxHQUFHLElBQW9CLEVBQUE7O0FBQzVCLFFBQUEsT0FBTyxNQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBQSxJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsR0FBSSxRQUFRLENBQUM7S0FDcEQ7SUFFUSxNQUFNLENBQUMsS0FBVyxFQUFFLElBQW9CLEVBQUE7QUFDL0MsUUFBQSxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO0FBQ3JDLFFBQUEsSUFBSSxjQUFjLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQztBQUMzQyxRQUFBLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO0FBRXJCLFFBQUEsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztBQUNqQyxRQUFBLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7OztBQUk3QixRQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ3JCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztBQUNyQixTQUFBO0FBRUQsUUFBQSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTs7QUFFcEMsWUFBQSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLEVBQUU7Z0JBQ2hDLE1BQU07QUFDUCxhQUFBO0FBRUQsWUFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBR3RCLFlBQUEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRTtBQUNyQixnQkFBQSxJQUFJLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxDQUFDOzs7QUFHN0IsZ0JBQUEsT0FBTyxLQUFLLENBQUM7QUFDZCxhQUFBOztZQUdELElBQUksQ0FBQyxHQUFHLGNBQWMsSUFBSSxLQUFLLEtBQUssY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNyRCxTQUFTO0FBQ1YsYUFBQTs7O0FBSUQsWUFBQSxJQUFJLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFDO1lBQ3JDLGNBQWMsR0FBRyxDQUFDLENBQUM7Ozs7O0FBTW5CLFlBQUEsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxNQUFlLEtBQUk7Ozs7QUFJcEQsZ0JBQUEsT0FBTyxNQUFNLENBQUMsR0FBRyxFQUFFLEVBQUU7QUFDbkIsb0JBQUEsTUFBTSxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDcEIsaUJBQUE7Ozs7QUFJRCxnQkFBQSxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQy9CLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRTtvQkFDdkIsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7Ozs7b0JBSTVDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsbUJBQW1CLEVBQUU7QUFDbkQsd0JBQUEsS0FBSyxDQUFDLG1CQUFtQixHQUFHLEtBQUssQ0FBQztBQUNsQyx3QkFBQSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3hCLHFCQUFBO0FBQ0YsaUJBQUE7QUFDSCxhQUFDLENBQUMsQ0FBQztBQUNKLFNBQUE7QUFFRCxRQUFBLE9BQU8sUUFBUSxDQUFDO0tBQ2pCO0lBRVEsWUFBWSxHQUFBO0FBQ25CLFFBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztBQUM3QixRQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7S0FDdkI7SUFFUSxXQUFXLEdBQUE7QUFDbEIsUUFBQSxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNoQyxRQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7S0FDeEI7QUFDRixDQUFBO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBb0JHO0FBQ0ksTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBRS9DOzs7QUFHRztBQUNIOztBQ3pJQTs7OztBQUlHO1NBa0NhLElBQUksQ0FDbEIsU0FBa0IsRUFDbEIsUUFBdUIsRUFDdkIsU0FBeUIsRUFBQTtBQUV6QixJQUFBLE9BQU8sU0FBUyxHQUFHLFFBQVEsRUFBRSxHQUFHLFNBQVMsS0FBVCxJQUFBLElBQUEsU0FBUyxLQUFULEtBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxHQUFBLFNBQVMsRUFBSSxDQUFDO0FBQ2hEOztBQ3hCYSxNQUFBLEVBQUUsR0FBRztJQUNkLGFBQWEsRUFBRSxJQUFJLENBQUMsY0FBMEM7SUFDOUQsWUFBWSxFQUFFLElBQUksQ0FBQyxhQUF3QztJQUMzRCxvQkFBb0IsRUFBRSxJQUFJLENBQUMscUJBQXdEO0lBQ25GLFNBQVMsRUFBRSxJQUFJLENBQUMsVUFBa0M7SUFDbEQsV0FBVyxFQUFFLElBQUksQ0FBQyxZQUFzQztFQUMxRDtBQWtGVyxNQUFBLFVBQVUsR0FBdUI7SUFDMUMsV0FBVztJQUNYLFlBQVk7SUFDWixLQUFLO0lBQ0wsTUFBTTtJQUNOLFFBQVE7SUFDUixLQUFLO0lBQ0wsU0FBUztJQUNULElBQUk7SUFDSixLQUFLO0lBQ0wsSUFBSTtJQUNKLEdBQUc7SUFDSCxLQUFLO0lBQ0wsR0FBRztJQUNILE1BQU07SUFDTixRQUFRO0lBQ1IsZUFBZTtJQUNmLFVBQVU7SUFDVixTQUFTO0lBQ1QsS0FBSztJQUNMLElBQUk7RUFDTjtBQUVGOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQkc7QUFDVSxNQUFBLHNCQUFzQixHQUFHLENBQUMsR0FBNkMsS0FBMEI7QUFDMUcsSUFBQSxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2pELElBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUU7QUFDdkQsUUFBQSxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztBQUM3RCxLQUFBO0FBQ0QsSUFBQSxPQUFPLE9BQTBDLENBQUM7QUFDdEQ7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZS8ifQ==
