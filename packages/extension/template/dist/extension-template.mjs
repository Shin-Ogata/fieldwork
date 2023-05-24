/*!
 * @cdp/extension-template 0.9.17
 *   extension for template engine
 */

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

export { AsyncDirective, Directive, PartType, _Σ, createRef, directive, directives, html, noChange, nothing, render, svg, toTemplateStringsArray };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLm1qcyIsInNvdXJjZXMiOlsibGl0LWh0bWwvc3JjL2xpdC1odG1sLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZS50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmUtaGVscGVycy50cyIsImxpdC1odG1sL3NyYy9hc3luYy1kaXJlY3RpdmUudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9yZWYudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9wcml2YXRlLWFzeW5jLWhlbHBlcnMudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9hc3luYy1yZXBsYWNlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvYXN5bmMtYXBwZW5kLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvY2FjaGUudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9jaG9vc2UudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9jbGFzcy1tYXAudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9ndWFyZC50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2lmLWRlZmluZWQudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9qb2luLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMva2V5ZWQudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9saXZlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvbWFwLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvcmFuZ2UudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9yZXBlYXQudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9zdHlsZS1tYXAudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy90ZW1wbGF0ZS1jb250ZW50LnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvdW5zYWZlLWh0bWwudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy91bnNhZmUtc3ZnLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvdW50aWwudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy93aGVuLnRzIiwiaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbi8vIElNUE9SVEFOVDogdGhlc2UgaW1wb3J0cyBtdXN0IGJlIHR5cGUtb25seVxuaW1wb3J0IHR5cGUge0RpcmVjdGl2ZSwgRGlyZWN0aXZlUmVzdWx0LCBQYXJ0SW5mb30gZnJvbSAnLi9kaXJlY3RpdmUuanMnO1xuXG5jb25zdCBERVZfTU9ERSA9IHRydWU7XG5jb25zdCBFTkFCTEVfRVhUUkFfU0VDVVJJVFlfSE9PS1MgPSB0cnVlO1xuY29uc3QgRU5BQkxFX1NIQURZRE9NX05PUEFUQ0ggPSB0cnVlO1xuY29uc3QgTk9ERV9NT0RFID0gZmFsc2U7XG4vLyBVc2Ugd2luZG93IGZvciBicm93c2VyIGJ1aWxkcyBiZWNhdXNlIElFMTEgZG9lc24ndCBoYXZlIGdsb2JhbFRoaXMuXG5jb25zdCBnbG9iYWwgPSBOT0RFX01PREUgPyBnbG9iYWxUaGlzIDogd2luZG93O1xuXG4vKipcbiAqIENvbnRhaW5zIHR5cGVzIHRoYXQgYXJlIHBhcnQgb2YgdGhlIHVuc3RhYmxlIGRlYnVnIEFQSS5cbiAqXG4gKiBFdmVyeXRoaW5nIGluIHRoaXMgQVBJIGlzIG5vdCBzdGFibGUgYW5kIG1heSBjaGFuZ2Ugb3IgYmUgcmVtb3ZlZCBpbiB0aGUgZnV0dXJlLFxuICogZXZlbiBvbiBwYXRjaCByZWxlYXNlcy5cbiAqL1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbmV4cG9ydCBuYW1lc3BhY2UgTGl0VW5zdGFibGUge1xuICAvKipcbiAgICogV2hlbiBMaXQgaXMgcnVubmluZyBpbiBkZXYgbW9kZSBhbmQgYHdpbmRvdy5lbWl0TGl0RGVidWdMb2dFdmVudHNgIGlzIHRydWUsXG4gICAqIHdlIHdpbGwgZW1pdCAnbGl0LWRlYnVnJyBldmVudHMgdG8gd2luZG93LCB3aXRoIGxpdmUgZGV0YWlscyBhYm91dCB0aGUgdXBkYXRlIGFuZCByZW5kZXJcbiAgICogbGlmZWN5Y2xlLiBUaGVzZSBjYW4gYmUgdXNlZnVsIGZvciB3cml0aW5nIGRlYnVnIHRvb2xpbmcgYW5kIHZpc3VhbGl6YXRpb25zLlxuICAgKlxuICAgKiBQbGVhc2UgYmUgYXdhcmUgdGhhdCBydW5uaW5nIHdpdGggd2luZG93LmVtaXRMaXREZWJ1Z0xvZ0V2ZW50cyBoYXMgcGVyZm9ybWFuY2Ugb3ZlcmhlYWQsXG4gICAqIG1ha2luZyBjZXJ0YWluIG9wZXJhdGlvbnMgdGhhdCBhcmUgbm9ybWFsbHkgdmVyeSBjaGVhcCAobGlrZSBhIG5vLW9wIHJlbmRlcikgbXVjaCBzbG93ZXIsXG4gICAqIGJlY2F1c2Ugd2UgbXVzdCBjb3B5IGRhdGEgYW5kIGRpc3BhdGNoIGV2ZW50cy5cbiAgICovXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlXG4gIGV4cG9ydCBuYW1lc3BhY2UgRGVidWdMb2cge1xuICAgIGV4cG9ydCB0eXBlIEVudHJ5ID1cbiAgICAgIHwgVGVtcGxhdGVQcmVwXG4gICAgICB8IFRlbXBsYXRlSW5zdGFudGlhdGVkXG4gICAgICB8IFRlbXBsYXRlSW5zdGFudGlhdGVkQW5kVXBkYXRlZFxuICAgICAgfCBUZW1wbGF0ZVVwZGF0aW5nXG4gICAgICB8IEJlZ2luUmVuZGVyXG4gICAgICB8IEVuZFJlbmRlclxuICAgICAgfCBDb21taXRQYXJ0RW50cnlcbiAgICAgIHwgU2V0UGFydFZhbHVlO1xuICAgIGV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVQcmVwIHtcbiAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSBwcmVwJztcbiAgICAgIHRlbXBsYXRlOiBUZW1wbGF0ZTtcbiAgICAgIHN0cmluZ3M6IFRlbXBsYXRlU3RyaW5nc0FycmF5O1xuICAgICAgY2xvbmFibGVUZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudDtcbiAgICAgIHBhcnRzOiBUZW1wbGF0ZVBhcnRbXTtcbiAgICB9XG4gICAgZXhwb3J0IGludGVyZmFjZSBCZWdpblJlbmRlciB7XG4gICAgICBraW5kOiAnYmVnaW4gcmVuZGVyJztcbiAgICAgIGlkOiBudW1iZXI7XG4gICAgICB2YWx1ZTogdW5rbm93bjtcbiAgICAgIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCBEb2N1bWVudEZyYWdtZW50O1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICAgIHBhcnQ6IENoaWxkUGFydCB8IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZXhwb3J0IGludGVyZmFjZSBFbmRSZW5kZXIge1xuICAgICAga2luZDogJ2VuZCByZW5kZXInO1xuICAgICAgaWQ6IG51bWJlcjtcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgY29udGFpbmVyOiBIVE1MRWxlbWVudCB8IERvY3VtZW50RnJhZ21lbnQ7XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgICAgcGFydDogQ2hpbGRQYXJ0O1xuICAgIH1cbiAgICBleHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlSW5zdGFudGlhdGVkIHtcbiAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSBpbnN0YW50aWF0ZWQnO1xuICAgICAgdGVtcGxhdGU6IFRlbXBsYXRlIHwgQ29tcGlsZWRUZW1wbGF0ZTtcbiAgICAgIGluc3RhbmNlOiBUZW1wbGF0ZUluc3RhbmNlO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICAgIGZyYWdtZW50OiBOb2RlO1xuICAgICAgcGFydHM6IEFycmF5PFBhcnQgfCB1bmRlZmluZWQ+O1xuICAgICAgdmFsdWVzOiB1bmtub3duW107XG4gICAgfVxuICAgIGV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVJbnN0YW50aWF0ZWRBbmRVcGRhdGVkIHtcbiAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSBpbnN0YW50aWF0ZWQgYW5kIHVwZGF0ZWQnO1xuICAgICAgdGVtcGxhdGU6IFRlbXBsYXRlIHwgQ29tcGlsZWRUZW1wbGF0ZTtcbiAgICAgIGluc3RhbmNlOiBUZW1wbGF0ZUluc3RhbmNlO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICAgIGZyYWdtZW50OiBOb2RlO1xuICAgICAgcGFydHM6IEFycmF5PFBhcnQgfCB1bmRlZmluZWQ+O1xuICAgICAgdmFsdWVzOiB1bmtub3duW107XG4gICAgfVxuICAgIGV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVVcGRhdGluZyB7XG4gICAgICBraW5kOiAndGVtcGxhdGUgdXBkYXRpbmcnO1xuICAgICAgdGVtcGxhdGU6IFRlbXBsYXRlIHwgQ29tcGlsZWRUZW1wbGF0ZTtcbiAgICAgIGluc3RhbmNlOiBUZW1wbGF0ZUluc3RhbmNlO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICAgIHBhcnRzOiBBcnJheTxQYXJ0IHwgdW5kZWZpbmVkPjtcbiAgICAgIHZhbHVlczogdW5rbm93bltdO1xuICAgIH1cbiAgICBleHBvcnQgaW50ZXJmYWNlIFNldFBhcnRWYWx1ZSB7XG4gICAgICBraW5kOiAnc2V0IHBhcnQnO1xuICAgICAgcGFydDogUGFydDtcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgdmFsdWVJbmRleDogbnVtYmVyO1xuICAgICAgdmFsdWVzOiB1bmtub3duW107XG4gICAgICB0ZW1wbGF0ZUluc3RhbmNlOiBUZW1wbGF0ZUluc3RhbmNlO1xuICAgIH1cblxuICAgIGV4cG9ydCB0eXBlIENvbW1pdFBhcnRFbnRyeSA9XG4gICAgICB8IENvbW1pdE5vdGhpbmdUb0NoaWxkRW50cnlcbiAgICAgIHwgQ29tbWl0VGV4dFxuICAgICAgfCBDb21taXROb2RlXG4gICAgICB8IENvbW1pdEF0dHJpYnV0ZVxuICAgICAgfCBDb21taXRQcm9wZXJ0eVxuICAgICAgfCBDb21taXRCb29sZWFuQXR0cmlidXRlXG4gICAgICB8IENvbW1pdEV2ZW50TGlzdGVuZXJcbiAgICAgIHwgQ29tbWl0VG9FbGVtZW50QmluZGluZztcblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0Tm90aGluZ1RvQ2hpbGRFbnRyeSB7XG4gICAgICBraW5kOiAnY29tbWl0IG5vdGhpbmcgdG8gY2hpbGQnO1xuICAgICAgc3RhcnQ6IENoaWxkTm9kZTtcbiAgICAgIGVuZDogQ2hpbGROb2RlIHwgbnVsbDtcbiAgICAgIHBhcmVudDogRGlzY29ubmVjdGFibGUgfCB1bmRlZmluZWQ7XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0VGV4dCB7XG4gICAgICBraW5kOiAnY29tbWl0IHRleHQnO1xuICAgICAgbm9kZTogVGV4dDtcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBleHBvcnQgaW50ZXJmYWNlIENvbW1pdE5vZGUge1xuICAgICAga2luZDogJ2NvbW1pdCBub2RlJztcbiAgICAgIHN0YXJ0OiBOb2RlO1xuICAgICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSB8IHVuZGVmaW5lZDtcbiAgICAgIHZhbHVlOiBOb2RlO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBleHBvcnQgaW50ZXJmYWNlIENvbW1pdEF0dHJpYnV0ZSB7XG4gICAgICBraW5kOiAnY29tbWl0IGF0dHJpYnV0ZSc7XG4gICAgICBlbGVtZW50OiBFbGVtZW50O1xuICAgICAgbmFtZTogc3RyaW5nO1xuICAgICAgdmFsdWU6IHVua25vd247XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0UHJvcGVydHkge1xuICAgICAga2luZDogJ2NvbW1pdCBwcm9wZXJ0eSc7XG4gICAgICBlbGVtZW50OiBFbGVtZW50O1xuICAgICAgbmFtZTogc3RyaW5nO1xuICAgICAgdmFsdWU6IHVua25vd247XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGV4cG9ydCBpbnRlcmZhY2UgQ29tbWl0Qm9vbGVhbkF0dHJpYnV0ZSB7XG4gICAgICBraW5kOiAnY29tbWl0IGJvb2xlYW4gYXR0cmlidXRlJztcbiAgICAgIGVsZW1lbnQ6IEVsZW1lbnQ7XG4gICAgICBuYW1lOiBzdHJpbmc7XG4gICAgICB2YWx1ZTogYm9vbGVhbjtcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZXhwb3J0IGludGVyZmFjZSBDb21taXRFdmVudExpc3RlbmVyIHtcbiAgICAgIGtpbmQ6ICdjb21taXQgZXZlbnQgbGlzdGVuZXInO1xuICAgICAgZWxlbWVudDogRWxlbWVudDtcbiAgICAgIG5hbWU6IHN0cmluZztcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgb2xkTGlzdGVuZXI6IHVua25vd247XG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkO1xuICAgICAgLy8gVHJ1ZSBpZiB3ZSdyZSByZW1vdmluZyB0aGUgb2xkIGV2ZW50IGxpc3RlbmVyIChlLmcuIGJlY2F1c2Ugc2V0dGluZ3MgY2hhbmdlZCwgb3IgdmFsdWUgaXMgbm90aGluZylcbiAgICAgIHJlbW92ZUxpc3RlbmVyOiBib29sZWFuO1xuICAgICAgLy8gVHJ1ZSBpZiB3ZSdyZSBhZGRpbmcgYSBuZXcgZXZlbnQgbGlzdGVuZXIgKGUuZy4gYmVjYXVzZSBmaXJzdCByZW5kZXIsIG9yIHNldHRpbmdzIGNoYW5nZWQpXG4gICAgICBhZGRMaXN0ZW5lcjogYm9vbGVhbjtcbiAgICB9XG5cbiAgICBleHBvcnQgaW50ZXJmYWNlIENvbW1pdFRvRWxlbWVudEJpbmRpbmcge1xuICAgICAga2luZDogJ2NvbW1pdCB0byBlbGVtZW50IGJpbmRpbmcnO1xuICAgICAgZWxlbWVudDogRWxlbWVudDtcbiAgICAgIHZhbHVlOiB1bmtub3duO1xuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cbn1cblxuaW50ZXJmYWNlIERlYnVnTG9nZ2luZ1dpbmRvdyB7XG4gIC8vIEV2ZW4gaW4gZGV2IG1vZGUsIHdlIGdlbmVyYWxseSBkb24ndCB3YW50IHRvIGVtaXQgdGhlc2UgZXZlbnRzLCBhcyB0aGF0J3NcbiAgLy8gYW5vdGhlciBsZXZlbCBvZiBjb3N0LCBzbyBvbmx5IGVtaXQgdGhlbSB3aGVuIERFVl9NT0RFIGlzIHRydWUgX2FuZF8gd2hlblxuICAvLyB3aW5kb3cuZW1pdExpdERlYnVnRXZlbnRzIGlzIHRydWUuXG4gIGVtaXRMaXREZWJ1Z0xvZ0V2ZW50cz86IGJvb2xlYW47XG59XG5cbi8qKlxuICogVXNlZnVsIGZvciB2aXN1YWxpemluZyBhbmQgbG9nZ2luZyBpbnNpZ2h0cyBpbnRvIHdoYXQgdGhlIExpdCB0ZW1wbGF0ZSBzeXN0ZW0gaXMgZG9pbmcuXG4gKlxuICogQ29tcGlsZWQgb3V0IG9mIHByb2QgbW9kZSBidWlsZHMuXG4gKi9cbmNvbnN0IGRlYnVnTG9nRXZlbnQgPSBERVZfTU9ERVxuICA/IChldmVudDogTGl0VW5zdGFibGUuRGVidWdMb2cuRW50cnkpID0+IHtcbiAgICAgIGNvbnN0IHNob3VsZEVtaXQgPSAoZ2xvYmFsIGFzIHVua25vd24gYXMgRGVidWdMb2dnaW5nV2luZG93KVxuICAgICAgICAuZW1pdExpdERlYnVnTG9nRXZlbnRzO1xuICAgICAgaWYgKCFzaG91bGRFbWl0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGdsb2JhbC5kaXNwYXRjaEV2ZW50KFxuICAgICAgICBuZXcgQ3VzdG9tRXZlbnQ8TGl0VW5zdGFibGUuRGVidWdMb2cuRW50cnk+KCdsaXQtZGVidWcnLCB7XG4gICAgICAgICAgZGV0YWlsOiBldmVudCxcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICA6IHVuZGVmaW5lZDtcbi8vIFVzZWQgZm9yIGNvbm5lY3RpbmcgYmVnaW5SZW5kZXIgYW5kIGVuZFJlbmRlciBldmVudHMgd2hlbiB0aGVyZSBhcmUgbmVzdGVkXG4vLyByZW5kZXJzIHdoZW4gZXJyb3JzIGFyZSB0aHJvd24gcHJldmVudGluZyBhbiBlbmRSZW5kZXIgZXZlbnQgZnJvbSBiZWluZ1xuLy8gY2FsbGVkLlxubGV0IGRlYnVnTG9nUmVuZGVySWQgPSAwO1xuXG5sZXQgaXNzdWVXYXJuaW5nOiAoY29kZTogc3RyaW5nLCB3YXJuaW5nOiBzdHJpbmcpID0+IHZvaWQ7XG5cbmlmIChERVZfTU9ERSkge1xuICBnbG9iYWwubGl0SXNzdWVkV2FybmluZ3MgPz89IG5ldyBTZXQoKTtcblxuICAvLyBJc3N1ZSBhIHdhcm5pbmcsIGlmIHdlIGhhdmVuJ3QgYWxyZWFkeS5cbiAgaXNzdWVXYXJuaW5nID0gKGNvZGU6IHN0cmluZywgd2FybmluZzogc3RyaW5nKSA9PiB7XG4gICAgd2FybmluZyArPSBjb2RlXG4gICAgICA/IGAgU2VlIGh0dHBzOi8vbGl0LmRldi9tc2cvJHtjb2RlfSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5gXG4gICAgICA6ICcnO1xuICAgIGlmICghZ2xvYmFsLmxpdElzc3VlZFdhcm5pbmdzIS5oYXMod2FybmluZykpIHtcbiAgICAgIGNvbnNvbGUud2Fybih3YXJuaW5nKTtcbiAgICAgIGdsb2JhbC5saXRJc3N1ZWRXYXJuaW5ncyEuYWRkKHdhcm5pbmcpO1xuICAgIH1cbiAgfTtcblxuICBpc3N1ZVdhcm5pbmcoXG4gICAgJ2Rldi1tb2RlJyxcbiAgICBgTGl0IGlzIGluIGRldiBtb2RlLiBOb3QgcmVjb21tZW5kZWQgZm9yIHByb2R1Y3Rpb24hYFxuICApO1xufVxuXG5jb25zdCB3cmFwID1cbiAgRU5BQkxFX1NIQURZRE9NX05PUEFUQ0ggJiZcbiAgZ2xvYmFsLlNoYWR5RE9NPy5pblVzZSAmJlxuICBnbG9iYWwuU2hhZHlET00/Lm5vUGF0Y2ggPT09IHRydWVcbiAgICA/IGdsb2JhbC5TaGFkeURPTSEud3JhcFxuICAgIDogKG5vZGU6IE5vZGUpID0+IG5vZGU7XG5cbmNvbnN0IHRydXN0ZWRUeXBlcyA9IChnbG9iYWwgYXMgdW5rbm93biBhcyBQYXJ0aWFsPFdpbmRvdz4pLnRydXN0ZWRUeXBlcztcblxuLyoqXG4gKiBPdXIgVHJ1c3RlZFR5cGVQb2xpY3kgZm9yIEhUTUwgd2hpY2ggaXMgZGVjbGFyZWQgdXNpbmcgdGhlIGh0bWwgdGVtcGxhdGVcbiAqIHRhZyBmdW5jdGlvbi5cbiAqXG4gKiBUaGF0IEhUTUwgaXMgYSBkZXZlbG9wZXItYXV0aG9yZWQgY29uc3RhbnQsIGFuZCBpcyBwYXJzZWQgd2l0aCBpbm5lckhUTUxcbiAqIGJlZm9yZSBhbnkgdW50cnVzdGVkIGV4cHJlc3Npb25zIGhhdmUgYmVlbiBtaXhlZCBpbi4gVGhlcmVmb3IgaXQgaXNcbiAqIGNvbnNpZGVyZWQgc2FmZSBieSBjb25zdHJ1Y3Rpb24uXG4gKi9cbmNvbnN0IHBvbGljeSA9IHRydXN0ZWRUeXBlc1xuICA/IHRydXN0ZWRUeXBlcy5jcmVhdGVQb2xpY3koJ2xpdC1odG1sJywge1xuICAgICAgY3JlYXRlSFRNTDogKHMpID0+IHMsXG4gICAgfSlcbiAgOiB1bmRlZmluZWQ7XG5cbi8qKlxuICogVXNlZCB0byBzYW5pdGl6ZSBhbnkgdmFsdWUgYmVmb3JlIGl0IGlzIHdyaXR0ZW4gaW50byB0aGUgRE9NLiBUaGlzIGNhbiBiZVxuICogdXNlZCB0byBpbXBsZW1lbnQgYSBzZWN1cml0eSBwb2xpY3kgb2YgYWxsb3dlZCBhbmQgZGlzYWxsb3dlZCB2YWx1ZXMgaW5cbiAqIG9yZGVyIHRvIHByZXZlbnQgWFNTIGF0dGFja3MuXG4gKlxuICogT25lIHdheSBvZiB1c2luZyB0aGlzIGNhbGxiYWNrIHdvdWxkIGJlIHRvIGNoZWNrIGF0dHJpYnV0ZXMgYW5kIHByb3BlcnRpZXNcbiAqIGFnYWluc3QgYSBsaXN0IG9mIGhpZ2ggcmlzayBmaWVsZHMsIGFuZCByZXF1aXJlIHRoYXQgdmFsdWVzIHdyaXR0ZW4gdG8gc3VjaFxuICogZmllbGRzIGJlIGluc3RhbmNlcyBvZiBhIGNsYXNzIHdoaWNoIGlzIHNhZmUgYnkgY29uc3RydWN0aW9uLiBDbG9zdXJlJ3MgU2FmZVxuICogSFRNTCBUeXBlcyBpcyBvbmUgaW1wbGVtZW50YXRpb24gb2YgdGhpcyB0ZWNobmlxdWUgKFxuICogaHR0cHM6Ly9naXRodWIuY29tL2dvb2dsZS9zYWZlLWh0bWwtdHlwZXMvYmxvYi9tYXN0ZXIvZG9jL3NhZmVodG1sLXR5cGVzLm1kKS5cbiAqIFRoZSBUcnVzdGVkVHlwZXMgcG9seWZpbGwgaW4gQVBJLW9ubHkgbW9kZSBjb3VsZCBhbHNvIGJlIHVzZWQgYXMgYSBiYXNpc1xuICogZm9yIHRoaXMgdGVjaG5pcXVlIChodHRwczovL2dpdGh1Yi5jb20vV0lDRy90cnVzdGVkLXR5cGVzKS5cbiAqXG4gKiBAcGFyYW0gbm9kZSBUaGUgSFRNTCBub2RlICh1c3VhbGx5IGVpdGhlciBhICN0ZXh0IG5vZGUgb3IgYW4gRWxlbWVudCkgdGhhdFxuICogICAgIGlzIGJlaW5nIHdyaXR0ZW4gdG8uIE5vdGUgdGhhdCB0aGlzIGlzIGp1c3QgYW4gZXhlbXBsYXIgbm9kZSwgdGhlIHdyaXRlXG4gKiAgICAgbWF5IHRha2UgcGxhY2UgYWdhaW5zdCBhbm90aGVyIGluc3RhbmNlIG9mIHRoZSBzYW1lIGNsYXNzIG9mIG5vZGUuXG4gKiBAcGFyYW0gbmFtZSBUaGUgbmFtZSBvZiBhbiBhdHRyaWJ1dGUgb3IgcHJvcGVydHkgKGZvciBleGFtcGxlLCAnaHJlZicpLlxuICogQHBhcmFtIHR5cGUgSW5kaWNhdGVzIHdoZXRoZXIgdGhlIHdyaXRlIHRoYXQncyBhYm91dCB0byBiZSBwZXJmb3JtZWQgd2lsbFxuICogICAgIGJlIHRvIGEgcHJvcGVydHkgb3IgYSBub2RlLlxuICogQHJldHVybiBBIGZ1bmN0aW9uIHRoYXQgd2lsbCBzYW5pdGl6ZSB0aGlzIGNsYXNzIG9mIHdyaXRlcy5cbiAqL1xuZXhwb3J0IHR5cGUgU2FuaXRpemVyRmFjdG9yeSA9IChcbiAgbm9kZTogTm9kZSxcbiAgbmFtZTogc3RyaW5nLFxuICB0eXBlOiAncHJvcGVydHknIHwgJ2F0dHJpYnV0ZSdcbikgPT4gVmFsdWVTYW5pdGl6ZXI7XG5cbi8qKlxuICogQSBmdW5jdGlvbiB3aGljaCBjYW4gc2FuaXRpemUgdmFsdWVzIHRoYXQgd2lsbCBiZSB3cml0dGVuIHRvIGEgc3BlY2lmaWMga2luZFxuICogb2YgRE9NIHNpbmsuXG4gKlxuICogU2VlIFNhbml0aXplckZhY3RvcnkuXG4gKlxuICogQHBhcmFtIHZhbHVlIFRoZSB2YWx1ZSB0byBzYW5pdGl6ZS4gV2lsbCBiZSB0aGUgYWN0dWFsIHZhbHVlIHBhc3NlZCBpbnRvXG4gKiAgICAgdGhlIGxpdC1odG1sIHRlbXBsYXRlIGxpdGVyYWwsIHNvIHRoaXMgY291bGQgYmUgb2YgYW55IHR5cGUuXG4gKiBAcmV0dXJuIFRoZSB2YWx1ZSB0byB3cml0ZSB0byB0aGUgRE9NLiBVc3VhbGx5IHRoZSBzYW1lIGFzIHRoZSBpbnB1dCB2YWx1ZSxcbiAqICAgICB1bmxlc3Mgc2FuaXRpemF0aW9uIGlzIG5lZWRlZC5cbiAqL1xuZXhwb3J0IHR5cGUgVmFsdWVTYW5pdGl6ZXIgPSAodmFsdWU6IHVua25vd24pID0+IHVua25vd247XG5cbmNvbnN0IGlkZW50aXR5RnVuY3Rpb246IFZhbHVlU2FuaXRpemVyID0gKHZhbHVlOiB1bmtub3duKSA9PiB2YWx1ZTtcbmNvbnN0IG5vb3BTYW5pdGl6ZXI6IFNhbml0aXplckZhY3RvcnkgPSAoXG4gIF9ub2RlOiBOb2RlLFxuICBfbmFtZTogc3RyaW5nLFxuICBfdHlwZTogJ3Byb3BlcnR5JyB8ICdhdHRyaWJ1dGUnXG4pID0+IGlkZW50aXR5RnVuY3Rpb247XG5cbi8qKiBTZXRzIHRoZSBnbG9iYWwgc2FuaXRpemVyIGZhY3RvcnkuICovXG5jb25zdCBzZXRTYW5pdGl6ZXIgPSAobmV3U2FuaXRpemVyOiBTYW5pdGl6ZXJGYWN0b3J5KSA9PiB7XG4gIGlmICghRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwgIT09IG5vb3BTYW5pdGl6ZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgQXR0ZW1wdGVkIHRvIG92ZXJ3cml0ZSBleGlzdGluZyBsaXQtaHRtbCBzZWN1cml0eSBwb2xpY3kuYCArXG4gICAgICAgIGAgc2V0U2FuaXRpemVET01WYWx1ZUZhY3Rvcnkgc2hvdWxkIGJlIGNhbGxlZCBhdCBtb3N0IG9uY2UuYFxuICAgICk7XG4gIH1cbiAgc2FuaXRpemVyRmFjdG9yeUludGVybmFsID0gbmV3U2FuaXRpemVyO1xufTtcblxuLyoqXG4gKiBPbmx5IHVzZWQgaW4gaW50ZXJuYWwgdGVzdHMsIG5vdCBhIHBhcnQgb2YgdGhlIHB1YmxpYyBBUEkuXG4gKi9cbmNvbnN0IF90ZXN0T25seUNsZWFyU2FuaXRpemVyRmFjdG9yeURvTm90Q2FsbE9yRWxzZSA9ICgpID0+IHtcbiAgc2FuaXRpemVyRmFjdG9yeUludGVybmFsID0gbm9vcFNhbml0aXplcjtcbn07XG5cbmNvbnN0IGNyZWF0ZVNhbml0aXplcjogU2FuaXRpemVyRmFjdG9yeSA9IChub2RlLCBuYW1lLCB0eXBlKSA9PiB7XG4gIHJldHVybiBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwobm9kZSwgbmFtZSwgdHlwZSk7XG59O1xuXG4vLyBBZGRlZCB0byBhbiBhdHRyaWJ1dGUgbmFtZSB0byBtYXJrIHRoZSBhdHRyaWJ1dGUgYXMgYm91bmQgc28gd2UgY2FuIGZpbmRcbi8vIGl0IGVhc2lseS5cbmNvbnN0IGJvdW5kQXR0cmlidXRlU3VmZml4ID0gJyRsaXQkJztcblxuLy8gVGhpcyBtYXJrZXIgaXMgdXNlZCBpbiBtYW55IHN5bnRhY3RpYyBwb3NpdGlvbnMgaW4gSFRNTCwgc28gaXQgbXVzdCBiZVxuLy8gYSB2YWxpZCBlbGVtZW50IG5hbWUgYW5kIGF0dHJpYnV0ZSBuYW1lLiBXZSBkb24ndCBzdXBwb3J0IGR5bmFtaWMgbmFtZXMgKHlldClcbi8vIGJ1dCB0aGlzIGF0IGxlYXN0IGVuc3VyZXMgdGhhdCB0aGUgcGFyc2UgdHJlZSBpcyBjbG9zZXIgdG8gdGhlIHRlbXBsYXRlXG4vLyBpbnRlbnRpb24uXG5jb25zdCBtYXJrZXIgPSBgbGl0JCR7U3RyaW5nKE1hdGgucmFuZG9tKCkpLnNsaWNlKDkpfSRgO1xuXG4vLyBTdHJpbmcgdXNlZCB0byB0ZWxsIGlmIGEgY29tbWVudCBpcyBhIG1hcmtlciBjb21tZW50XG5jb25zdCBtYXJrZXJNYXRjaCA9ICc/JyArIG1hcmtlcjtcblxuLy8gVGV4dCB1c2VkIHRvIGluc2VydCBhIGNvbW1lbnQgbWFya2VyIG5vZGUuIFdlIHVzZSBwcm9jZXNzaW5nIGluc3RydWN0aW9uXG4vLyBzeW50YXggYmVjYXVzZSBpdCdzIHNsaWdodGx5IHNtYWxsZXIsIGJ1dCBwYXJzZXMgYXMgYSBjb21tZW50IG5vZGUuXG5jb25zdCBub2RlTWFya2VyID0gYDwke21hcmtlck1hdGNofT5gO1xuXG5jb25zdCBkID1cbiAgTk9ERV9NT0RFICYmIGdsb2JhbC5kb2N1bWVudCA9PT0gdW5kZWZpbmVkXG4gICAgPyAoe1xuICAgICAgICBjcmVhdGVUcmVlV2Fsa2VyKCkge1xuICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfSxcbiAgICAgIH0gYXMgdW5rbm93biBhcyBEb2N1bWVudClcbiAgICA6IGRvY3VtZW50O1xuXG4vLyBDcmVhdGVzIGEgZHluYW1pYyBtYXJrZXIuIFdlIG5ldmVyIGhhdmUgdG8gc2VhcmNoIGZvciB0aGVzZSBpbiB0aGUgRE9NLlxuY29uc3QgY3JlYXRlTWFya2VyID0gKCkgPT4gZC5jcmVhdGVDb21tZW50KCcnKTtcblxuLy8gaHR0cHM6Ly90YzM5LmdpdGh1Yi5pby9lY21hMjYyLyNzZWMtdHlwZW9mLW9wZXJhdG9yXG50eXBlIFByaW1pdGl2ZSA9IG51bGwgfCB1bmRlZmluZWQgfCBib29sZWFuIHwgbnVtYmVyIHwgc3RyaW5nIHwgc3ltYm9sIHwgYmlnaW50O1xuY29uc3QgaXNQcmltaXRpdmUgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBQcmltaXRpdmUgPT5cbiAgdmFsdWUgPT09IG51bGwgfHwgKHR5cGVvZiB2YWx1ZSAhPSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsdWUgIT0gJ2Z1bmN0aW9uJyk7XG5jb25zdCBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcbmNvbnN0IGlzSXRlcmFibGUgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBJdGVyYWJsZTx1bmtub3duPiA9PlxuICBpc0FycmF5KHZhbHVlKSB8fFxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICB0eXBlb2YgKHZhbHVlIGFzIGFueSk/LltTeW1ib2wuaXRlcmF0b3JdID09PSAnZnVuY3Rpb24nO1xuXG5jb25zdCBTUEFDRV9DSEFSID0gYFsgXFx0XFxuXFxmXFxyXWA7XG5jb25zdCBBVFRSX1ZBTFVFX0NIQVIgPSBgW14gXFx0XFxuXFxmXFxyXCInXFxgPD49XWA7XG5jb25zdCBOQU1FX0NIQVIgPSBgW15cXFxcc1wiJz49L11gO1xuXG4vLyBUaGVzZSByZWdleGVzIHJlcHJlc2VudCB0aGUgZml2ZSBwYXJzaW5nIHN0YXRlcyB0aGF0IHdlIGNhcmUgYWJvdXQgaW4gdGhlXG4vLyBUZW1wbGF0ZSdzIEhUTUwgc2Nhbm5lci4gVGhleSBtYXRjaCB0aGUgKmVuZCogb2YgdGhlIHN0YXRlIHRoZXkncmUgbmFtZWRcbi8vIGFmdGVyLlxuLy8gRGVwZW5kaW5nIG9uIHRoZSBtYXRjaCwgd2UgdHJhbnNpdGlvbiB0byBhIG5ldyBzdGF0ZS4gSWYgdGhlcmUncyBubyBtYXRjaCxcbi8vIHdlIHN0YXkgaW4gdGhlIHNhbWUgc3RhdGUuXG4vLyBOb3RlIHRoYXQgdGhlIHJlZ2V4ZXMgYXJlIHN0YXRlZnVsLiBXZSB1dGlsaXplIGxhc3RJbmRleCBhbmQgc3luYyBpdFxuLy8gYWNyb3NzIHRoZSBtdWx0aXBsZSByZWdleGVzIHVzZWQuIEluIGFkZGl0aW9uIHRvIHRoZSBmaXZlIHJlZ2V4ZXMgYmVsb3dcbi8vIHdlIGFsc28gZHluYW1pY2FsbHkgY3JlYXRlIGEgcmVnZXggdG8gZmluZCB0aGUgbWF0Y2hpbmcgZW5kIHRhZ3MgZm9yIHJhd1xuLy8gdGV4dCBlbGVtZW50cy5cblxuLyoqXG4gKiBFbmQgb2YgdGV4dCBpczogYDxgIGZvbGxvd2VkIGJ5OlxuICogICAoY29tbWVudCBzdGFydCkgb3IgKHRhZykgb3IgKGR5bmFtaWMgdGFnIGJpbmRpbmcpXG4gKi9cbmNvbnN0IHRleHRFbmRSZWdleCA9IC88KD86KCEtLXxcXC9bXmEtekEtWl0pfChcXC8/W2EtekEtWl1bXj5cXHNdKil8KFxcLz8kKSkvZztcbmNvbnN0IENPTU1FTlRfU1RBUlQgPSAxO1xuY29uc3QgVEFHX05BTUUgPSAyO1xuY29uc3QgRFlOQU1JQ19UQUdfTkFNRSA9IDM7XG5cbmNvbnN0IGNvbW1lbnRFbmRSZWdleCA9IC8tLT4vZztcbi8qKlxuICogQ29tbWVudHMgbm90IHN0YXJ0ZWQgd2l0aCA8IS0tLCBsaWtlIDwveywgY2FuIGJlIGVuZGVkIGJ5IGEgc2luZ2xlIGA+YFxuICovXG5jb25zdCBjb21tZW50MkVuZFJlZ2V4ID0gLz4vZztcblxuLyoqXG4gKiBUaGUgdGFnRW5kIHJlZ2V4IG1hdGNoZXMgdGhlIGVuZCBvZiB0aGUgXCJpbnNpZGUgYW4gb3BlbmluZ1wiIHRhZyBzeW50YXhcbiAqIHBvc2l0aW9uLiBJdCBlaXRoZXIgbWF0Y2hlcyBhIGA+YCwgYW4gYXR0cmlidXRlLWxpa2Ugc2VxdWVuY2UsIG9yIHRoZSBlbmRcbiAqIG9mIHRoZSBzdHJpbmcgYWZ0ZXIgYSBzcGFjZSAoYXR0cmlidXRlLW5hbWUgcG9zaXRpb24gZW5kaW5nKS5cbiAqXG4gKiBTZWUgYXR0cmlidXRlcyBpbiB0aGUgSFRNTCBzcGVjOlxuICogaHR0cHM6Ly93d3cudzMub3JnL1RSL2h0bWw1L3N5bnRheC5odG1sI2VsZW1lbnRzLWF0dHJpYnV0ZXNcbiAqXG4gKiBcIiBcXHRcXG5cXGZcXHJcIiBhcmUgSFRNTCBzcGFjZSBjaGFyYWN0ZXJzOlxuICogaHR0cHM6Ly9pbmZyYS5zcGVjLndoYXR3Zy5vcmcvI2FzY2lpLXdoaXRlc3BhY2VcbiAqXG4gKiBTbyBhbiBhdHRyaWJ1dGUgaXM6XG4gKiAgKiBUaGUgbmFtZTogYW55IGNoYXJhY3RlciBleGNlcHQgYSB3aGl0ZXNwYWNlIGNoYXJhY3RlciwgKFwiKSwgKCcpLCBcIj5cIixcbiAqICAgIFwiPVwiLCBvciBcIi9cIi4gTm90ZTogdGhpcyBpcyBkaWZmZXJlbnQgZnJvbSB0aGUgSFRNTCBzcGVjIHdoaWNoIGFsc28gZXhjbHVkZXMgY29udHJvbCBjaGFyYWN0ZXJzLlxuICogICogRm9sbG93ZWQgYnkgemVybyBvciBtb3JlIHNwYWNlIGNoYXJhY3RlcnNcbiAqICAqIEZvbGxvd2VkIGJ5IFwiPVwiXG4gKiAgKiBGb2xsb3dlZCBieSB6ZXJvIG9yIG1vcmUgc3BhY2UgY2hhcmFjdGVyc1xuICogICogRm9sbG93ZWQgYnk6XG4gKiAgICAqIEFueSBjaGFyYWN0ZXIgZXhjZXB0IHNwYWNlLCAoJyksIChcIiksIFwiPFwiLCBcIj5cIiwgXCI9XCIsIChgKSwgb3JcbiAqICAgICogKFwiKSB0aGVuIGFueSBub24tKFwiKSwgb3JcbiAqICAgICogKCcpIHRoZW4gYW55IG5vbi0oJylcbiAqL1xuY29uc3QgdGFnRW5kUmVnZXggPSBuZXcgUmVnRXhwKFxuICBgPnwke1NQQUNFX0NIQVJ9KD86KCR7TkFNRV9DSEFSfSspKCR7U1BBQ0VfQ0hBUn0qPSR7U1BBQ0VfQ0hBUn0qKD86JHtBVFRSX1ZBTFVFX0NIQVJ9fChcInwnKXwpKXwkKWAsXG4gICdnJ1xuKTtcbmNvbnN0IEVOVElSRV9NQVRDSCA9IDA7XG5jb25zdCBBVFRSSUJVVEVfTkFNRSA9IDE7XG5jb25zdCBTUEFDRVNfQU5EX0VRVUFMUyA9IDI7XG5jb25zdCBRVU9URV9DSEFSID0gMztcblxuY29uc3Qgc2luZ2xlUXVvdGVBdHRyRW5kUmVnZXggPSAvJy9nO1xuY29uc3QgZG91YmxlUXVvdGVBdHRyRW5kUmVnZXggPSAvXCIvZztcbi8qKlxuICogTWF0Y2hlcyB0aGUgcmF3IHRleHQgZWxlbWVudHMuXG4gKlxuICogQ29tbWVudHMgYXJlIG5vdCBwYXJzZWQgd2l0aGluIHJhdyB0ZXh0IGVsZW1lbnRzLCBzbyB3ZSBuZWVkIHRvIHNlYXJjaCB0aGVpclxuICogdGV4dCBjb250ZW50IGZvciBtYXJrZXIgc3RyaW5ncy5cbiAqL1xuY29uc3QgcmF3VGV4dEVsZW1lbnQgPSAvXig/OnNjcmlwdHxzdHlsZXx0ZXh0YXJlYXx0aXRsZSkkL2k7XG5cbi8qKiBUZW1wbGF0ZVJlc3VsdCB0eXBlcyAqL1xuY29uc3QgSFRNTF9SRVNVTFQgPSAxO1xuY29uc3QgU1ZHX1JFU1VMVCA9IDI7XG5cbnR5cGUgUmVzdWx0VHlwZSA9IHR5cGVvZiBIVE1MX1JFU1VMVCB8IHR5cGVvZiBTVkdfUkVTVUxUO1xuXG4vLyBUZW1wbGF0ZVBhcnQgdHlwZXNcbi8vIElNUE9SVEFOVDogdGhlc2UgbXVzdCBtYXRjaCB0aGUgdmFsdWVzIGluIFBhcnRUeXBlXG5jb25zdCBBVFRSSUJVVEVfUEFSVCA9IDE7XG5jb25zdCBDSElMRF9QQVJUID0gMjtcbmNvbnN0IFBST1BFUlRZX1BBUlQgPSAzO1xuY29uc3QgQk9PTEVBTl9BVFRSSUJVVEVfUEFSVCA9IDQ7XG5jb25zdCBFVkVOVF9QQVJUID0gNTtcbmNvbnN0IEVMRU1FTlRfUEFSVCA9IDY7XG5jb25zdCBDT01NRU5UX1BBUlQgPSA3O1xuXG4vKipcbiAqIFRoZSByZXR1cm4gdHlwZSBvZiB0aGUgdGVtcGxhdGUgdGFnIGZ1bmN0aW9ucywge0BsaW5rY29kZSBodG1sfSBhbmRcbiAqIHtAbGlua2NvZGUgc3ZnfS5cbiAqXG4gKiBBIGBUZW1wbGF0ZVJlc3VsdGAgb2JqZWN0IGhvbGRzIGFsbCB0aGUgaW5mb3JtYXRpb24gYWJvdXQgYSB0ZW1wbGF0ZVxuICogZXhwcmVzc2lvbiByZXF1aXJlZCB0byByZW5kZXIgaXQ6IHRoZSB0ZW1wbGF0ZSBzdHJpbmdzLCBleHByZXNzaW9uIHZhbHVlcyxcbiAqIGFuZCB0eXBlIG9mIHRlbXBsYXRlIChodG1sIG9yIHN2ZykuXG4gKlxuICogYFRlbXBsYXRlUmVzdWx0YCBvYmplY3RzIGRvIG5vdCBjcmVhdGUgYW55IERPTSBvbiB0aGVpciBvd24uIFRvIGNyZWF0ZSBvclxuICogdXBkYXRlIERPTSB5b3UgbmVlZCB0byByZW5kZXIgdGhlIGBUZW1wbGF0ZVJlc3VsdGAuIFNlZVxuICogW1JlbmRlcmluZ10oaHR0cHM6Ly9saXQuZGV2L2RvY3MvY29tcG9uZW50cy9yZW5kZXJpbmcpIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICpcbiAqL1xuZXhwb3J0IHR5cGUgVGVtcGxhdGVSZXN1bHQ8VCBleHRlbmRzIFJlc3VsdFR5cGUgPSBSZXN1bHRUeXBlPiA9IHtcbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgWydfJGxpdFR5cGUkJ106IFQ7XG4gIHN0cmluZ3M6IFRlbXBsYXRlU3RyaW5nc0FycmF5O1xuICB2YWx1ZXM6IHVua25vd25bXTtcbn07XG5cbmV4cG9ydCB0eXBlIEhUTUxUZW1wbGF0ZVJlc3VsdCA9IFRlbXBsYXRlUmVzdWx0PHR5cGVvZiBIVE1MX1JFU1VMVD47XG5cbmV4cG9ydCB0eXBlIFNWR1RlbXBsYXRlUmVzdWx0ID0gVGVtcGxhdGVSZXN1bHQ8dHlwZW9mIFNWR19SRVNVTFQ+O1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVkVGVtcGxhdGVSZXN1bHQge1xuICAvLyBUaGlzIGlzIGEgZmFjdG9yeSBpbiBvcmRlciB0byBtYWtlIHRlbXBsYXRlIGluaXRpYWxpemF0aW9uIGxhenlcbiAgLy8gYW5kIGFsbG93IFNoYWR5UmVuZGVyT3B0aW9ucyBzY29wZSB0byBiZSBwYXNzZWQgaW4uXG4gIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gIFsnXyRsaXRUeXBlJCddOiBDb21waWxlZFRlbXBsYXRlO1xuICB2YWx1ZXM6IHVua25vd25bXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21waWxlZFRlbXBsYXRlIGV4dGVuZHMgT21pdDxUZW1wbGF0ZSwgJ2VsJz4ge1xuICAvLyBlbCBpcyBvdmVycmlkZGVuIHRvIGJlIG9wdGlvbmFsLiBXZSBpbml0aWFsaXplIGl0IG9uIGZpcnN0IHJlbmRlclxuICBlbD86IEhUTUxUZW1wbGF0ZUVsZW1lbnQ7XG5cbiAgLy8gVGhlIHByZXBhcmVkIEhUTUwgc3RyaW5nIHRvIGNyZWF0ZSBhIHRlbXBsYXRlIGVsZW1lbnQgZnJvbS5cbiAgaDogVHJ1c3RlZEhUTUw7XG59XG5cbi8qKlxuICogR2VuZXJhdGVzIGEgdGVtcGxhdGUgbGl0ZXJhbCB0YWcgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgVGVtcGxhdGVSZXN1bHQgd2l0aFxuICogdGhlIGdpdmVuIHJlc3VsdCB0eXBlLlxuICovXG5jb25zdCB0YWcgPVxuICA8VCBleHRlbmRzIFJlc3VsdFR5cGU+KHR5cGU6IFQpID0+XG4gIChzdHJpbmdzOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSwgLi4udmFsdWVzOiB1bmtub3duW10pOiBUZW1wbGF0ZVJlc3VsdDxUPiA9PiB7XG4gICAgLy8gV2FybiBhZ2FpbnN0IHRlbXBsYXRlcyBvY3RhbCBlc2NhcGUgc2VxdWVuY2VzXG4gICAgLy8gV2UgZG8gdGhpcyBoZXJlIHJhdGhlciB0aGFuIGluIHJlbmRlciBzbyB0aGF0IHRoZSB3YXJuaW5nIGlzIGNsb3NlciB0byB0aGVcbiAgICAvLyB0ZW1wbGF0ZSBkZWZpbml0aW9uLlxuICAgIGlmIChERVZfTU9ERSAmJiBzdHJpbmdzLnNvbWUoKHMpID0+IHMgPT09IHVuZGVmaW5lZCkpIHtcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgJ1NvbWUgdGVtcGxhdGUgc3RyaW5ncyBhcmUgdW5kZWZpbmVkLlxcbicgK1xuICAgICAgICAgICdUaGlzIGlzIHByb2JhYmx5IGNhdXNlZCBieSBpbGxlZ2FsIG9jdGFsIGVzY2FwZSBzZXF1ZW5jZXMuJ1xuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgICBbJ18kbGl0VHlwZSQnXTogdHlwZSxcbiAgICAgIHN0cmluZ3MsXG4gICAgICB2YWx1ZXMsXG4gICAgfTtcbiAgfTtcblxuLyoqXG4gKiBJbnRlcnByZXRzIGEgdGVtcGxhdGUgbGl0ZXJhbCBhcyBhbiBIVE1MIHRlbXBsYXRlIHRoYXQgY2FuIGVmZmljaWVudGx5XG4gKiByZW5kZXIgdG8gYW5kIHVwZGF0ZSBhIGNvbnRhaW5lci5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgaGVhZGVyID0gKHRpdGxlOiBzdHJpbmcpID0+IGh0bWxgPGgxPiR7dGl0bGV9PC9oMT5gO1xuICogYGBgXG4gKlxuICogVGhlIGBodG1sYCB0YWcgcmV0dXJucyBhIGRlc2NyaXB0aW9uIG9mIHRoZSBET00gdG8gcmVuZGVyIGFzIGEgdmFsdWUuIEl0IGlzXG4gKiBsYXp5LCBtZWFuaW5nIG5vIHdvcmsgaXMgZG9uZSB1bnRpbCB0aGUgdGVtcGxhdGUgaXMgcmVuZGVyZWQuIFdoZW4gcmVuZGVyaW5nLFxuICogaWYgYSB0ZW1wbGF0ZSBjb21lcyBmcm9tIHRoZSBzYW1lIGV4cHJlc3Npb24gYXMgYSBwcmV2aW91c2x5IHJlbmRlcmVkIHJlc3VsdCxcbiAqIGl0J3MgZWZmaWNpZW50bHkgdXBkYXRlZCBpbnN0ZWFkIG9mIHJlcGxhY2VkLlxuICovXG5leHBvcnQgY29uc3QgaHRtbCA9IHRhZyhIVE1MX1JFU1VMVCk7XG5cbi8qKlxuICogSW50ZXJwcmV0cyBhIHRlbXBsYXRlIGxpdGVyYWwgYXMgYW4gU1ZHIGZyYWdtZW50IHRoYXQgY2FuIGVmZmljaWVudGx5XG4gKiByZW5kZXIgdG8gYW5kIHVwZGF0ZSBhIGNvbnRhaW5lci5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgcmVjdCA9IHN2Z2A8cmVjdCB3aWR0aD1cIjEwXCIgaGVpZ2h0PVwiMTBcIj48L3JlY3Q+YDtcbiAqXG4gKiBjb25zdCBteUltYWdlID0gaHRtbGBcbiAqICAgPHN2ZyB2aWV3Qm94PVwiMCAwIDEwIDEwXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPlxuICogICAgICR7cmVjdH1cbiAqICAgPC9zdmc+YDtcbiAqIGBgYFxuICpcbiAqIFRoZSBgc3ZnYCAqdGFnIGZ1bmN0aW9uKiBzaG91bGQgb25seSBiZSB1c2VkIGZvciBTVkcgZnJhZ21lbnRzLCBvciBlbGVtZW50c1xuICogdGhhdCB3b3VsZCBiZSBjb250YWluZWQgKippbnNpZGUqKiBhbiBgPHN2Zz5gIEhUTUwgZWxlbWVudC4gQSBjb21tb24gZXJyb3IgaXNcbiAqIHBsYWNpbmcgYW4gYDxzdmc+YCAqZWxlbWVudCogaW4gYSB0ZW1wbGF0ZSB0YWdnZWQgd2l0aCB0aGUgYHN2Z2AgdGFnXG4gKiBmdW5jdGlvbi4gVGhlIGA8c3ZnPmAgZWxlbWVudCBpcyBhbiBIVE1MIGVsZW1lbnQgYW5kIHNob3VsZCBiZSB1c2VkIHdpdGhpbiBhXG4gKiB0ZW1wbGF0ZSB0YWdnZWQgd2l0aCB0aGUge0BsaW5rY29kZSBodG1sfSB0YWcgZnVuY3Rpb24uXG4gKlxuICogSW4gTGl0RWxlbWVudCB1c2FnZSwgaXQncyBpbnZhbGlkIHRvIHJldHVybiBhbiBTVkcgZnJhZ21lbnQgZnJvbSB0aGVcbiAqIGByZW5kZXIoKWAgbWV0aG9kLCBhcyB0aGUgU1ZHIGZyYWdtZW50IHdpbGwgYmUgY29udGFpbmVkIHdpdGhpbiB0aGUgZWxlbWVudCdzXG4gKiBzaGFkb3cgcm9vdCBhbmQgdGh1cyBjYW5ub3QgYmUgdXNlZCB3aXRoaW4gYW4gYDxzdmc+YCBIVE1MIGVsZW1lbnQuXG4gKi9cbmV4cG9ydCBjb25zdCBzdmcgPSB0YWcoU1ZHX1JFU1VMVCk7XG5cbi8qKlxuICogQSBzZW50aW5lbCB2YWx1ZSB0aGF0IHNpZ25hbHMgdGhhdCBhIHZhbHVlIHdhcyBoYW5kbGVkIGJ5IGEgZGlyZWN0aXZlIGFuZFxuICogc2hvdWxkIG5vdCBiZSB3cml0dGVuIHRvIHRoZSBET00uXG4gKi9cbmV4cG9ydCBjb25zdCBub0NoYW5nZSA9IFN5bWJvbC5mb3IoJ2xpdC1ub0NoYW5nZScpO1xuXG4vKipcbiAqIEEgc2VudGluZWwgdmFsdWUgdGhhdCBzaWduYWxzIGEgQ2hpbGRQYXJ0IHRvIGZ1bGx5IGNsZWFyIGl0cyBjb250ZW50LlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBidXR0b24gPSBodG1sYCR7XG4gKiAgdXNlci5pc0FkbWluXG4gKiAgICA/IGh0bWxgPGJ1dHRvbj5ERUxFVEU8L2J1dHRvbj5gXG4gKiAgICA6IG5vdGhpbmdcbiAqIH1gO1xuICogYGBgXG4gKlxuICogUHJlZmVyIHVzaW5nIGBub3RoaW5nYCBvdmVyIG90aGVyIGZhbHN5IHZhbHVlcyBhcyBpdCBwcm92aWRlcyBhIGNvbnNpc3RlbnRcbiAqIGJlaGF2aW9yIGJldHdlZW4gdmFyaW91cyBleHByZXNzaW9uIGJpbmRpbmcgY29udGV4dHMuXG4gKlxuICogSW4gY2hpbGQgZXhwcmVzc2lvbnMsIGB1bmRlZmluZWRgLCBgbnVsbGAsIGAnJ2AsIGFuZCBgbm90aGluZ2AgYWxsIGJlaGF2ZSB0aGVcbiAqIHNhbWUgYW5kIHJlbmRlciBubyBub2Rlcy4gSW4gYXR0cmlidXRlIGV4cHJlc3Npb25zLCBgbm90aGluZ2AgX3JlbW92ZXNfIHRoZVxuICogYXR0cmlidXRlLCB3aGlsZSBgdW5kZWZpbmVkYCBhbmQgYG51bGxgIHdpbGwgcmVuZGVyIGFuIGVtcHR5IHN0cmluZy4gSW5cbiAqIHByb3BlcnR5IGV4cHJlc3Npb25zIGBub3RoaW5nYCBiZWNvbWVzIGB1bmRlZmluZWRgLlxuICovXG5leHBvcnQgY29uc3Qgbm90aGluZyA9IFN5bWJvbC5mb3IoJ2xpdC1ub3RoaW5nJyk7XG5cbi8qKlxuICogVGhlIGNhY2hlIG9mIHByZXBhcmVkIHRlbXBsYXRlcywga2V5ZWQgYnkgdGhlIHRhZ2dlZCBUZW1wbGF0ZVN0cmluZ3NBcnJheVxuICogYW5kIF9ub3RfIGFjY291bnRpbmcgZm9yIHRoZSBzcGVjaWZpYyB0ZW1wbGF0ZSB0YWcgdXNlZC4gVGhpcyBtZWFucyB0aGF0XG4gKiB0ZW1wbGF0ZSB0YWdzIGNhbm5vdCBiZSBkeW5hbWljIC0gdGhlIG11c3Qgc3RhdGljYWxseSBiZSBvbmUgb2YgaHRtbCwgc3ZnLFxuICogb3IgYXR0ci4gVGhpcyByZXN0cmljdGlvbiBzaW1wbGlmaWVzIHRoZSBjYWNoZSBsb29rdXAsIHdoaWNoIGlzIG9uIHRoZSBob3RcbiAqIHBhdGggZm9yIHJlbmRlcmluZy5cbiAqL1xuY29uc3QgdGVtcGxhdGVDYWNoZSA9IG5ldyBXZWFrTWFwPFRlbXBsYXRlU3RyaW5nc0FycmF5LCBUZW1wbGF0ZT4oKTtcblxuLyoqXG4gKiBPYmplY3Qgc3BlY2lmeWluZyBvcHRpb25zIGZvciBjb250cm9sbGluZyBsaXQtaHRtbCByZW5kZXJpbmcuIE5vdGUgdGhhdFxuICogd2hpbGUgYHJlbmRlcmAgbWF5IGJlIGNhbGxlZCBtdWx0aXBsZSB0aW1lcyBvbiB0aGUgc2FtZSBgY29udGFpbmVyYCAoYW5kXG4gKiBgcmVuZGVyQmVmb3JlYCByZWZlcmVuY2Ugbm9kZSkgdG8gZWZmaWNpZW50bHkgdXBkYXRlIHRoZSByZW5kZXJlZCBjb250ZW50LFxuICogb25seSB0aGUgb3B0aW9ucyBwYXNzZWQgaW4gZHVyaW5nIHRoZSBmaXJzdCByZW5kZXIgYXJlIHJlc3BlY3RlZCBkdXJpbmdcbiAqIHRoZSBsaWZldGltZSBvZiByZW5kZXJzIHRvIHRoYXQgdW5pcXVlIGBjb250YWluZXJgICsgYHJlbmRlckJlZm9yZWBcbiAqIGNvbWJpbmF0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlbmRlck9wdGlvbnMge1xuICAvKipcbiAgICogQW4gb2JqZWN0IHRvIHVzZSBhcyB0aGUgYHRoaXNgIHZhbHVlIGZvciBldmVudCBsaXN0ZW5lcnMuIEl0J3Mgb2Z0ZW5cbiAgICogdXNlZnVsIHRvIHNldCB0aGlzIHRvIHRoZSBob3N0IGNvbXBvbmVudCByZW5kZXJpbmcgYSB0ZW1wbGF0ZS5cbiAgICovXG4gIGhvc3Q/OiBvYmplY3Q7XG4gIC8qKlxuICAgKiBBIERPTSBub2RlIGJlZm9yZSB3aGljaCB0byByZW5kZXIgY29udGVudCBpbiB0aGUgY29udGFpbmVyLlxuICAgKi9cbiAgcmVuZGVyQmVmb3JlPzogQ2hpbGROb2RlIHwgbnVsbDtcbiAgLyoqXG4gICAqIE5vZGUgdXNlZCBmb3IgY2xvbmluZyB0aGUgdGVtcGxhdGUgKGBpbXBvcnROb2RlYCB3aWxsIGJlIGNhbGxlZCBvbiB0aGlzXG4gICAqIG5vZGUpLiBUaGlzIGNvbnRyb2xzIHRoZSBgb3duZXJEb2N1bWVudGAgb2YgdGhlIHJlbmRlcmVkIERPTSwgYWxvbmcgd2l0aFxuICAgKiBhbnkgaW5oZXJpdGVkIGNvbnRleHQuIERlZmF1bHRzIHRvIHRoZSBnbG9iYWwgYGRvY3VtZW50YC5cbiAgICovXG4gIGNyZWF0aW9uU2NvcGU/OiB7aW1wb3J0Tm9kZShub2RlOiBOb2RlLCBkZWVwPzogYm9vbGVhbik6IE5vZGV9O1xuICAvKipcbiAgICogVGhlIGluaXRpYWwgY29ubmVjdGVkIHN0YXRlIGZvciB0aGUgdG9wLWxldmVsIHBhcnQgYmVpbmcgcmVuZGVyZWQuIElmIG5vXG4gICAqIGBpc0Nvbm5lY3RlZGAgb3B0aW9uIGlzIHNldCwgYEFzeW5jRGlyZWN0aXZlYHMgd2lsbCBiZSBjb25uZWN0ZWQgYnlcbiAgICogZGVmYXVsdC4gU2V0IHRvIGBmYWxzZWAgaWYgdGhlIGluaXRpYWwgcmVuZGVyIG9jY3VycyBpbiBhIGRpc2Nvbm5lY3RlZCB0cmVlXG4gICAqIGFuZCBgQXN5bmNEaXJlY3RpdmVgcyBzaG91bGQgc2VlIGBpc0Nvbm5lY3RlZCA9PT0gZmFsc2VgIGZvciB0aGVpciBpbml0aWFsXG4gICAqIHJlbmRlci4gVGhlIGBwYXJ0LnNldENvbm5lY3RlZCgpYCBtZXRob2QgbXVzdCBiZSB1c2VkIHN1YnNlcXVlbnQgdG8gaW5pdGlhbFxuICAgKiByZW5kZXIgdG8gY2hhbmdlIHRoZSBjb25uZWN0ZWQgc3RhdGUgb2YgdGhlIHBhcnQuXG4gICAqL1xuICBpc0Nvbm5lY3RlZD86IGJvb2xlYW47XG59XG5cbmNvbnN0IHdhbGtlciA9IGQuY3JlYXRlVHJlZVdhbGtlcihcbiAgZCxcbiAgMTI5IC8qIE5vZGVGaWx0ZXIuU0hPV197RUxFTUVOVHxDT01NRU5UfSAqLyxcbiAgbnVsbCxcbiAgZmFsc2Vcbik7XG5cbmxldCBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWw6IFNhbml0aXplckZhY3RvcnkgPSBub29wU2FuaXRpemVyO1xuXG4vL1xuLy8gQ2xhc3NlcyBvbmx5IGJlbG93IGhlcmUsIGNvbnN0IHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBvbmx5IGFib3ZlIGhlcmUuLi5cbi8vXG4vLyBLZWVwaW5nIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBhbmQgY2xhc3NlcyB0b2dldGhlciBpbXByb3ZlcyBtaW5pZmljYXRpb24uXG4vLyBJbnRlcmZhY2VzIGFuZCB0eXBlIGFsaWFzZXMgY2FuIGJlIGludGVybGVhdmVkIGZyZWVseS5cbi8vXG5cbi8vIFR5cGUgZm9yIGNsYXNzZXMgdGhhdCBoYXZlIGEgYF9kaXJlY3RpdmVgIG9yIGBfZGlyZWN0aXZlc1tdYCBmaWVsZCwgdXNlZCBieVxuLy8gYHJlc29sdmVEaXJlY3RpdmVgXG5leHBvcnQgaW50ZXJmYWNlIERpcmVjdGl2ZVBhcmVudCB7XG4gIF8kcGFyZW50PzogRGlyZWN0aXZlUGFyZW50O1xuICBfJGlzQ29ubmVjdGVkOiBib29sZWFuO1xuICBfX2RpcmVjdGl2ZT86IERpcmVjdGl2ZTtcbiAgX19kaXJlY3RpdmVzPzogQXJyYXk8RGlyZWN0aXZlIHwgdW5kZWZpbmVkPjtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIEhUTUwgc3RyaW5nIGZvciB0aGUgZ2l2ZW4gVGVtcGxhdGVTdHJpbmdzQXJyYXkgYW5kIHJlc3VsdCB0eXBlXG4gKiAoSFRNTCBvciBTVkcpLCBhbG9uZyB3aXRoIHRoZSBjYXNlLXNlbnNpdGl2ZSBib3VuZCBhdHRyaWJ1dGUgbmFtZXMgaW5cbiAqIHRlbXBsYXRlIG9yZGVyLiBUaGUgSFRNTCBjb250YWlucyBjb21tZW50IG1hcmtlcnMgZGVub3RpbmcgdGhlIGBDaGlsZFBhcnRgc1xuICogYW5kIHN1ZmZpeGVzIG9uIGJvdW5kIGF0dHJpYnV0ZXMgZGVub3RpbmcgdGhlIGBBdHRyaWJ1dGVQYXJ0c2AuXG4gKlxuICogQHBhcmFtIHN0cmluZ3MgdGVtcGxhdGUgc3RyaW5ncyBhcnJheVxuICogQHBhcmFtIHR5cGUgSFRNTCBvciBTVkdcbiAqIEByZXR1cm4gQXJyYXkgY29udGFpbmluZyBgW2h0bWwsIGF0dHJOYW1lc11gIChhcnJheSByZXR1cm5lZCBmb3IgdGVyc2VuZXNzLFxuICogICAgIHRvIGF2b2lkIG9iamVjdCBmaWVsZHMgc2luY2UgdGhpcyBjb2RlIGlzIHNoYXJlZCB3aXRoIG5vbi1taW5pZmllZCBTU1JcbiAqICAgICBjb2RlKVxuICovXG5jb25zdCBnZXRUZW1wbGF0ZUh0bWwgPSAoXG4gIHN0cmluZ3M6IFRlbXBsYXRlU3RyaW5nc0FycmF5LFxuICB0eXBlOiBSZXN1bHRUeXBlXG4pOiBbVHJ1c3RlZEhUTUwsIEFycmF5PHN0cmluZyB8IHVuZGVmaW5lZD5dID0+IHtcbiAgLy8gSW5zZXJ0IG1ha2VycyBpbnRvIHRoZSB0ZW1wbGF0ZSBIVE1MIHRvIHJlcHJlc2VudCB0aGUgcG9zaXRpb24gb2ZcbiAgLy8gYmluZGluZ3MuIFRoZSBmb2xsb3dpbmcgY29kZSBzY2FucyB0aGUgdGVtcGxhdGUgc3RyaW5ncyB0byBkZXRlcm1pbmUgdGhlXG4gIC8vIHN5bnRhY3RpYyBwb3NpdGlvbiBvZiB0aGUgYmluZGluZ3MuIFRoZXkgY2FuIGJlIGluIHRleHQgcG9zaXRpb24sIHdoZXJlXG4gIC8vIHdlIGluc2VydCBhbiBIVE1MIGNvbW1lbnQsIGF0dHJpYnV0ZSB2YWx1ZSBwb3NpdGlvbiwgd2hlcmUgd2UgaW5zZXJ0IGFcbiAgLy8gc2VudGluZWwgc3RyaW5nIGFuZCByZS13cml0ZSB0aGUgYXR0cmlidXRlIG5hbWUsIG9yIGluc2lkZSBhIHRhZyB3aGVyZVxuICAvLyB3ZSBpbnNlcnQgdGhlIHNlbnRpbmVsIHN0cmluZy5cbiAgY29uc3QgbCA9IHN0cmluZ3MubGVuZ3RoIC0gMTtcbiAgLy8gU3RvcmVzIHRoZSBjYXNlLXNlbnNpdGl2ZSBib3VuZCBhdHRyaWJ1dGUgbmFtZXMgaW4gdGhlIG9yZGVyIG9mIHRoZWlyXG4gIC8vIHBhcnRzLiBFbGVtZW50UGFydHMgYXJlIGFsc28gcmVmbGVjdGVkIGluIHRoaXMgYXJyYXkgYXMgdW5kZWZpbmVkXG4gIC8vIHJhdGhlciB0aGFuIGEgc3RyaW5nLCB0byBkaXNhbWJpZ3VhdGUgZnJvbSBhdHRyaWJ1dGUgYmluZGluZ3MuXG4gIGNvbnN0IGF0dHJOYW1lczogQXJyYXk8c3RyaW5nIHwgdW5kZWZpbmVkPiA9IFtdO1xuICBsZXQgaHRtbCA9IHR5cGUgPT09IFNWR19SRVNVTFQgPyAnPHN2Zz4nIDogJyc7XG5cbiAgLy8gV2hlbiB3ZSdyZSBpbnNpZGUgYSByYXcgdGV4dCB0YWcgKG5vdCBpdCdzIHRleHQgY29udGVudCksIHRoZSByZWdleFxuICAvLyB3aWxsIHN0aWxsIGJlIHRhZ1JlZ2V4IHNvIHdlIGNhbiBmaW5kIGF0dHJpYnV0ZXMsIGJ1dCB3aWxsIHN3aXRjaCB0b1xuICAvLyB0aGlzIHJlZ2V4IHdoZW4gdGhlIHRhZyBlbmRzLlxuICBsZXQgcmF3VGV4dEVuZFJlZ2V4OiBSZWdFeHAgfCB1bmRlZmluZWQ7XG5cbiAgLy8gVGhlIGN1cnJlbnQgcGFyc2luZyBzdGF0ZSwgcmVwcmVzZW50ZWQgYXMgYSByZWZlcmVuY2UgdG8gb25lIG9mIHRoZVxuICAvLyByZWdleGVzXG4gIGxldCByZWdleCA9IHRleHRFbmRSZWdleDtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgIGNvbnN0IHMgPSBzdHJpbmdzW2ldO1xuICAgIC8vIFRoZSBpbmRleCBvZiB0aGUgZW5kIG9mIHRoZSBsYXN0IGF0dHJpYnV0ZSBuYW1lLiBXaGVuIHRoaXMgaXNcbiAgICAvLyBwb3NpdGl2ZSBhdCBlbmQgb2YgYSBzdHJpbmcsIGl0IG1lYW5zIHdlJ3JlIGluIGFuIGF0dHJpYnV0ZSB2YWx1ZVxuICAgIC8vIHBvc2l0aW9uIGFuZCBuZWVkIHRvIHJld3JpdGUgdGhlIGF0dHJpYnV0ZSBuYW1lLlxuICAgIC8vIFdlIGFsc28gdXNlIGEgc3BlY2lhbCB2YWx1ZSBvZiAtMiB0byBpbmRpY2F0ZSB0aGF0IHdlIGVuY291bnRlcmVkXG4gICAgLy8gdGhlIGVuZCBvZiBhIHN0cmluZyBpbiBhdHRyaWJ1dGUgbmFtZSBwb3NpdGlvbi5cbiAgICBsZXQgYXR0ck5hbWVFbmRJbmRleCA9IC0xO1xuICAgIGxldCBhdHRyTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIGxldCBsYXN0SW5kZXggPSAwO1xuICAgIGxldCBtYXRjaCE6IFJlZ0V4cEV4ZWNBcnJheSB8IG51bGw7XG5cbiAgICAvLyBUaGUgY29uZGl0aW9ucyBpbiB0aGlzIGxvb3AgaGFuZGxlIHRoZSBjdXJyZW50IHBhcnNlIHN0YXRlLCBhbmQgdGhlXG4gICAgLy8gYXNzaWdubWVudHMgdG8gdGhlIGByZWdleGAgdmFyaWFibGUgYXJlIHRoZSBzdGF0ZSB0cmFuc2l0aW9ucy5cbiAgICB3aGlsZSAobGFzdEluZGV4IDwgcy5sZW5ndGgpIHtcbiAgICAgIC8vIE1ha2Ugc3VyZSB3ZSBzdGFydCBzZWFyY2hpbmcgZnJvbSB3aGVyZSB3ZSBwcmV2aW91c2x5IGxlZnQgb2ZmXG4gICAgICByZWdleC5sYXN0SW5kZXggPSBsYXN0SW5kZXg7XG4gICAgICBtYXRjaCA9IHJlZ2V4LmV4ZWMocyk7XG4gICAgICBpZiAobWF0Y2ggPT09IG51bGwpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBsYXN0SW5kZXggPSByZWdleC5sYXN0SW5kZXg7XG4gICAgICBpZiAocmVnZXggPT09IHRleHRFbmRSZWdleCkge1xuICAgICAgICBpZiAobWF0Y2hbQ09NTUVOVF9TVEFSVF0gPT09ICchLS0nKSB7XG4gICAgICAgICAgcmVnZXggPSBjb21tZW50RW5kUmVnZXg7XG4gICAgICAgIH0gZWxzZSBpZiAobWF0Y2hbQ09NTUVOVF9TVEFSVF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIFdlIHN0YXJ0ZWQgYSB3ZWlyZCBjb21tZW50LCBsaWtlIDwve1xuICAgICAgICAgIHJlZ2V4ID0gY29tbWVudDJFbmRSZWdleDtcbiAgICAgICAgfSBlbHNlIGlmIChtYXRjaFtUQUdfTkFNRV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmIChyYXdUZXh0RWxlbWVudC50ZXN0KG1hdGNoW1RBR19OQU1FXSkpIHtcbiAgICAgICAgICAgIC8vIFJlY29yZCBpZiB3ZSBlbmNvdW50ZXIgYSByYXctdGV4dCBlbGVtZW50LiBXZSdsbCBzd2l0Y2ggdG9cbiAgICAgICAgICAgIC8vIHRoaXMgcmVnZXggYXQgdGhlIGVuZCBvZiB0aGUgdGFnLlxuICAgICAgICAgICAgcmF3VGV4dEVuZFJlZ2V4ID0gbmV3IFJlZ0V4cChgPC8ke21hdGNoW1RBR19OQU1FXX1gLCAnZycpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZWdleCA9IHRhZ0VuZFJlZ2V4O1xuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoW0RZTkFNSUNfVEFHX05BTUVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAoREVWX01PREUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgJ0JpbmRpbmdzIGluIHRhZyBuYW1lcyBhcmUgbm90IHN1cHBvcnRlZC4gUGxlYXNlIHVzZSBzdGF0aWMgdGVtcGxhdGVzIGluc3RlYWQuICcgK1xuICAgICAgICAgICAgICAgICdTZWUgaHR0cHM6Ly9saXQuZGV2L2RvY3MvdGVtcGxhdGVzL2V4cHJlc3Npb25zLyNzdGF0aWMtZXhwcmVzc2lvbnMnXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZWdleCA9IHRhZ0VuZFJlZ2V4O1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHJlZ2V4ID09PSB0YWdFbmRSZWdleCkge1xuICAgICAgICBpZiAobWF0Y2hbRU5USVJFX01BVENIXSA9PT0gJz4nKSB7XG4gICAgICAgICAgLy8gRW5kIG9mIGEgdGFnLiBJZiB3ZSBoYWQgc3RhcnRlZCBhIHJhdy10ZXh0IGVsZW1lbnQsIHVzZSB0aGF0XG4gICAgICAgICAgLy8gcmVnZXhcbiAgICAgICAgICByZWdleCA9IHJhd1RleHRFbmRSZWdleCA/PyB0ZXh0RW5kUmVnZXg7XG4gICAgICAgICAgLy8gV2UgbWF5IGJlIGVuZGluZyBhbiB1bnF1b3RlZCBhdHRyaWJ1dGUgdmFsdWUsIHNvIG1ha2Ugc3VyZSB3ZVxuICAgICAgICAgIC8vIGNsZWFyIGFueSBwZW5kaW5nIGF0dHJOYW1lRW5kSW5kZXhcbiAgICAgICAgICBhdHRyTmFtZUVuZEluZGV4ID0gLTE7XG4gICAgICAgIH0gZWxzZSBpZiAobWF0Y2hbQVRUUklCVVRFX05BTUVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBBdHRyaWJ1dGUgbmFtZSBwb3NpdGlvblxuICAgICAgICAgIGF0dHJOYW1lRW5kSW5kZXggPSAtMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhdHRyTmFtZUVuZEluZGV4ID0gcmVnZXgubGFzdEluZGV4IC0gbWF0Y2hbU1BBQ0VTX0FORF9FUVVBTFNdLmxlbmd0aDtcbiAgICAgICAgICBhdHRyTmFtZSA9IG1hdGNoW0FUVFJJQlVURV9OQU1FXTtcbiAgICAgICAgICByZWdleCA9XG4gICAgICAgICAgICBtYXRjaFtRVU9URV9DSEFSXSA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgID8gdGFnRW5kUmVnZXhcbiAgICAgICAgICAgICAgOiBtYXRjaFtRVU9URV9DSEFSXSA9PT0gJ1wiJ1xuICAgICAgICAgICAgICA/IGRvdWJsZVF1b3RlQXR0ckVuZFJlZ2V4XG4gICAgICAgICAgICAgIDogc2luZ2xlUXVvdGVBdHRyRW5kUmVnZXg7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHJlZ2V4ID09PSBkb3VibGVRdW90ZUF0dHJFbmRSZWdleCB8fFxuICAgICAgICByZWdleCA9PT0gc2luZ2xlUXVvdGVBdHRyRW5kUmVnZXhcbiAgICAgICkge1xuICAgICAgICByZWdleCA9IHRhZ0VuZFJlZ2V4O1xuICAgICAgfSBlbHNlIGlmIChyZWdleCA9PT0gY29tbWVudEVuZFJlZ2V4IHx8IHJlZ2V4ID09PSBjb21tZW50MkVuZFJlZ2V4KSB7XG4gICAgICAgIHJlZ2V4ID0gdGV4dEVuZFJlZ2V4O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gTm90IG9uZSBvZiB0aGUgZml2ZSBzdGF0ZSByZWdleGVzLCBzbyBpdCBtdXN0IGJlIHRoZSBkeW5hbWljYWxseVxuICAgICAgICAvLyBjcmVhdGVkIHJhdyB0ZXh0IHJlZ2V4IGFuZCB3ZSdyZSBhdCB0aGUgY2xvc2Ugb2YgdGhhdCBlbGVtZW50LlxuICAgICAgICByZWdleCA9IHRhZ0VuZFJlZ2V4O1xuICAgICAgICByYXdUZXh0RW5kUmVnZXggPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKERFVl9NT0RFKSB7XG4gICAgICAvLyBJZiB3ZSBoYXZlIGEgYXR0ck5hbWVFbmRJbmRleCwgd2hpY2ggaW5kaWNhdGVzIHRoYXQgd2Ugc2hvdWxkXG4gICAgICAvLyByZXdyaXRlIHRoZSBhdHRyaWJ1dGUgbmFtZSwgYXNzZXJ0IHRoYXQgd2UncmUgaW4gYSB2YWxpZCBhdHRyaWJ1dGVcbiAgICAgIC8vIHBvc2l0aW9uIC0gZWl0aGVyIGluIGEgdGFnLCBvciBhIHF1b3RlZCBhdHRyaWJ1dGUgdmFsdWUuXG4gICAgICBjb25zb2xlLmFzc2VydChcbiAgICAgICAgYXR0ck5hbWVFbmRJbmRleCA9PT0gLTEgfHxcbiAgICAgICAgICByZWdleCA9PT0gdGFnRW5kUmVnZXggfHxcbiAgICAgICAgICByZWdleCA9PT0gc2luZ2xlUXVvdGVBdHRyRW5kUmVnZXggfHxcbiAgICAgICAgICByZWdleCA9PT0gZG91YmxlUXVvdGVBdHRyRW5kUmVnZXgsXG4gICAgICAgICd1bmV4cGVjdGVkIHBhcnNlIHN0YXRlIEInXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIFdlIGhhdmUgZm91ciBjYXNlczpcbiAgICAvLyAgMS4gV2UncmUgaW4gdGV4dCBwb3NpdGlvbiwgYW5kIG5vdCBpbiBhIHJhdyB0ZXh0IGVsZW1lbnRcbiAgICAvLyAgICAgKHJlZ2V4ID09PSB0ZXh0RW5kUmVnZXgpOiBpbnNlcnQgYSBjb21tZW50IG1hcmtlci5cbiAgICAvLyAgMi4gV2UgaGF2ZSBhIG5vbi1uZWdhdGl2ZSBhdHRyTmFtZUVuZEluZGV4IHdoaWNoIG1lYW5zIHdlIG5lZWQgdG9cbiAgICAvLyAgICAgcmV3cml0ZSB0aGUgYXR0cmlidXRlIG5hbWUgdG8gYWRkIGEgYm91bmQgYXR0cmlidXRlIHN1ZmZpeC5cbiAgICAvLyAgMy4gV2UncmUgYXQgdGhlIG5vbi1maXJzdCBiaW5kaW5nIGluIGEgbXVsdGktYmluZGluZyBhdHRyaWJ1dGUsIHVzZSBhXG4gICAgLy8gICAgIHBsYWluIG1hcmtlci5cbiAgICAvLyAgNC4gV2UncmUgc29tZXdoZXJlIGVsc2UgaW5zaWRlIHRoZSB0YWcuIElmIHdlJ3JlIGluIGF0dHJpYnV0ZSBuYW1lXG4gICAgLy8gICAgIHBvc2l0aW9uIChhdHRyTmFtZUVuZEluZGV4ID09PSAtMiksIGFkZCBhIHNlcXVlbnRpYWwgc3VmZml4IHRvXG4gICAgLy8gICAgIGdlbmVyYXRlIGEgdW5pcXVlIGF0dHJpYnV0ZSBuYW1lLlxuXG4gICAgLy8gRGV0ZWN0IGEgYmluZGluZyBuZXh0IHRvIHNlbGYtY2xvc2luZyB0YWcgZW5kIGFuZCBpbnNlcnQgYSBzcGFjZSB0b1xuICAgIC8vIHNlcGFyYXRlIHRoZSBtYXJrZXIgZnJvbSB0aGUgdGFnIGVuZDpcbiAgICBjb25zdCBlbmQgPVxuICAgICAgcmVnZXggPT09IHRhZ0VuZFJlZ2V4ICYmIHN0cmluZ3NbaSArIDFdLnN0YXJ0c1dpdGgoJy8+JykgPyAnICcgOiAnJztcbiAgICBodG1sICs9XG4gICAgICByZWdleCA9PT0gdGV4dEVuZFJlZ2V4XG4gICAgICAgID8gcyArIG5vZGVNYXJrZXJcbiAgICAgICAgOiBhdHRyTmFtZUVuZEluZGV4ID49IDBcbiAgICAgICAgPyAoYXR0ck5hbWVzLnB1c2goYXR0ck5hbWUhKSxcbiAgICAgICAgICBzLnNsaWNlKDAsIGF0dHJOYW1lRW5kSW5kZXgpICtcbiAgICAgICAgICAgIGJvdW5kQXR0cmlidXRlU3VmZml4ICtcbiAgICAgICAgICAgIHMuc2xpY2UoYXR0ck5hbWVFbmRJbmRleCkpICtcbiAgICAgICAgICBtYXJrZXIgK1xuICAgICAgICAgIGVuZFxuICAgICAgICA6IHMgK1xuICAgICAgICAgIG1hcmtlciArXG4gICAgICAgICAgKGF0dHJOYW1lRW5kSW5kZXggPT09IC0yID8gKGF0dHJOYW1lcy5wdXNoKHVuZGVmaW5lZCksIGkpIDogZW5kKTtcbiAgfVxuXG4gIGNvbnN0IGh0bWxSZXN1bHQ6IHN0cmluZyB8IFRydXN0ZWRIVE1MID1cbiAgICBodG1sICsgKHN0cmluZ3NbbF0gfHwgJzw/PicpICsgKHR5cGUgPT09IFNWR19SRVNVTFQgPyAnPC9zdmc+JyA6ICcnKTtcblxuICAvLyBBIHNlY3VyaXR5IGNoZWNrIHRvIHByZXZlbnQgc3Bvb2Zpbmcgb2YgTGl0IHRlbXBsYXRlIHJlc3VsdHMuXG4gIC8vIEluIHRoZSBmdXR1cmUsIHdlIG1heSBiZSBhYmxlIHRvIHJlcGxhY2UgdGhpcyB3aXRoIEFycmF5LmlzVGVtcGxhdGVPYmplY3QsXG4gIC8vIHRob3VnaCB3ZSBtaWdodCBuZWVkIHRvIG1ha2UgdGhhdCBjaGVjayBpbnNpZGUgb2YgdGhlIGh0bWwgYW5kIHN2Z1xuICAvLyBmdW5jdGlvbnMsIGJlY2F1c2UgcHJlY29tcGlsZWQgdGVtcGxhdGVzIGRvbid0IGNvbWUgaW4gYXNcbiAgLy8gVGVtcGxhdGVTdHJpbmdBcnJheSBvYmplY3RzLlxuICBpZiAoIUFycmF5LmlzQXJyYXkoc3RyaW5ncykgfHwgIXN0cmluZ3MuaGFzT3duUHJvcGVydHkoJ3JhdycpKSB7XG4gICAgbGV0IG1lc3NhZ2UgPSAnaW52YWxpZCB0ZW1wbGF0ZSBzdHJpbmdzIGFycmF5JztcbiAgICBpZiAoREVWX01PREUpIHtcbiAgICAgIG1lc3NhZ2UgPSBgXG4gICAgICAgICAgSW50ZXJuYWwgRXJyb3I6IGV4cGVjdGVkIHRlbXBsYXRlIHN0cmluZ3MgdG8gYmUgYW4gYXJyYXlcbiAgICAgICAgICB3aXRoIGEgJ3JhdycgZmllbGQuIEZha2luZyBhIHRlbXBsYXRlIHN0cmluZ3MgYXJyYXkgYnlcbiAgICAgICAgICBjYWxsaW5nIGh0bWwgb3Igc3ZnIGxpa2UgYW4gb3JkaW5hcnkgZnVuY3Rpb24gaXMgZWZmZWN0aXZlbHlcbiAgICAgICAgICB0aGUgc2FtZSBhcyBjYWxsaW5nIHVuc2FmZUh0bWwgYW5kIGNhbiBsZWFkIHRvIG1ham9yIHNlY3VyaXR5XG4gICAgICAgICAgaXNzdWVzLCBlLmcuIG9wZW5pbmcgeW91ciBjb2RlIHVwIHRvIFhTUyBhdHRhY2tzLlxuXG4gICAgICAgICAgSWYgeW91J3JlIHVzaW5nIHRoZSBodG1sIG9yIHN2ZyB0YWdnZWQgdGVtcGxhdGUgZnVuY3Rpb25zIG5vcm1hbGx5XG4gICAgICAgICAgYW5kIHN0aWxsIHNlZWluZyB0aGlzIGVycm9yLCBwbGVhc2UgZmlsZSBhIGJ1ZyBhdFxuICAgICAgICAgIGh0dHBzOi8vZ2l0aHViLmNvbS9saXQvbGl0L2lzc3Vlcy9uZXc/dGVtcGxhdGU9YnVnX3JlcG9ydC5tZFxuICAgICAgICAgIGFuZCBpbmNsdWRlIGluZm9ybWF0aW9uIGFib3V0IHlvdXIgYnVpbGQgdG9vbGluZywgaWYgYW55LlxuICAgICAgICBgXG4gICAgICAgIC50cmltKClcbiAgICAgICAgLnJlcGxhY2UoL1xcbiAqL2csICdcXG4nKTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICB9XG4gIC8vIFJldHVybmVkIGFzIGFuIGFycmF5IGZvciB0ZXJzZW5lc3NcbiAgcmV0dXJuIFtcbiAgICBwb2xpY3kgIT09IHVuZGVmaW5lZFxuICAgICAgPyBwb2xpY3kuY3JlYXRlSFRNTChodG1sUmVzdWx0KVxuICAgICAgOiAoaHRtbFJlc3VsdCBhcyB1bmtub3duIGFzIFRydXN0ZWRIVE1MKSxcbiAgICBhdHRyTmFtZXMsXG4gIF07XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSB7VGVtcGxhdGV9O1xuY2xhc3MgVGVtcGxhdGUge1xuICAvKiogQGludGVybmFsICovXG4gIGVsITogSFRNTFRlbXBsYXRlRWxlbWVudDtcblxuICBwYXJ0czogQXJyYXk8VGVtcGxhdGVQYXJ0PiA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAge3N0cmluZ3MsIFsnXyRsaXRUeXBlJCddOiB0eXBlfTogVGVtcGxhdGVSZXN1bHQsXG4gICAgb3B0aW9ucz86IFJlbmRlck9wdGlvbnNcbiAgKSB7XG4gICAgbGV0IG5vZGU6IE5vZGUgfCBudWxsO1xuICAgIGxldCBub2RlSW5kZXggPSAwO1xuICAgIGxldCBhdHRyTmFtZUluZGV4ID0gMDtcbiAgICBjb25zdCBwYXJ0Q291bnQgPSBzdHJpbmdzLmxlbmd0aCAtIDE7XG4gICAgY29uc3QgcGFydHMgPSB0aGlzLnBhcnRzO1xuXG4gICAgLy8gQ3JlYXRlIHRlbXBsYXRlIGVsZW1lbnRcbiAgICBjb25zdCBbaHRtbCwgYXR0ck5hbWVzXSA9IGdldFRlbXBsYXRlSHRtbChzdHJpbmdzLCB0eXBlKTtcbiAgICB0aGlzLmVsID0gVGVtcGxhdGUuY3JlYXRlRWxlbWVudChodG1sLCBvcHRpb25zKTtcbiAgICB3YWxrZXIuY3VycmVudE5vZGUgPSB0aGlzLmVsLmNvbnRlbnQ7XG5cbiAgICAvLyBSZXBhcmVudCBTVkcgbm9kZXMgaW50byB0ZW1wbGF0ZSByb290XG4gICAgaWYgKHR5cGUgPT09IFNWR19SRVNVTFQpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSB0aGlzLmVsLmNvbnRlbnQ7XG4gICAgICBjb25zdCBzdmdFbGVtZW50ID0gY29udGVudC5maXJzdENoaWxkITtcbiAgICAgIHN2Z0VsZW1lbnQucmVtb3ZlKCk7XG4gICAgICBjb250ZW50LmFwcGVuZCguLi5zdmdFbGVtZW50LmNoaWxkTm9kZXMpO1xuICAgIH1cblxuICAgIC8vIFdhbGsgdGhlIHRlbXBsYXRlIHRvIGZpbmQgYmluZGluZyBtYXJrZXJzIGFuZCBjcmVhdGUgVGVtcGxhdGVQYXJ0c1xuICAgIHdoaWxlICgobm9kZSA9IHdhbGtlci5uZXh0Tm9kZSgpKSAhPT0gbnVsbCAmJiBwYXJ0cy5sZW5ndGggPCBwYXJ0Q291bnQpIHtcbiAgICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgIGlmIChERVZfTU9ERSkge1xuICAgICAgICAgIGNvbnN0IHRhZyA9IChub2RlIGFzIEVsZW1lbnQpLmxvY2FsTmFtZTtcbiAgICAgICAgICAvLyBXYXJuIGlmIGB0ZXh0YXJlYWAgaW5jbHVkZXMgYW4gZXhwcmVzc2lvbiBhbmQgdGhyb3cgaWYgYHRlbXBsYXRlYFxuICAgICAgICAgIC8vIGRvZXMgc2luY2UgdGhlc2UgYXJlIG5vdCBzdXBwb3J0ZWQuIFdlIGRvIHRoaXMgYnkgY2hlY2tpbmdcbiAgICAgICAgICAvLyBpbm5lckhUTUwgZm9yIGFueXRoaW5nIHRoYXQgbG9va3MgbGlrZSBhIG1hcmtlci4gVGhpcyBjYXRjaGVzXG4gICAgICAgICAgLy8gY2FzZXMgbGlrZSBiaW5kaW5ncyBpbiB0ZXh0YXJlYSB0aGVyZSBtYXJrZXJzIHR1cm4gaW50byB0ZXh0IG5vZGVzLlxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIC9eKD86dGV4dGFyZWF8dGVtcGxhdGUpJC9pIS50ZXN0KHRhZykgJiZcbiAgICAgICAgICAgIChub2RlIGFzIEVsZW1lbnQpLmlubmVySFRNTC5pbmNsdWRlcyhtYXJrZXIpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBjb25zdCBtID1cbiAgICAgICAgICAgICAgYEV4cHJlc3Npb25zIGFyZSBub3Qgc3VwcG9ydGVkIGluc2lkZSBcXGAke3RhZ31cXGAgYCArXG4gICAgICAgICAgICAgIGBlbGVtZW50cy4gU2VlIGh0dHBzOi8vbGl0LmRldi9tc2cvZXhwcmVzc2lvbi1pbi0ke3RhZ30gZm9yIG1vcmUgYCArXG4gICAgICAgICAgICAgIGBpbmZvcm1hdGlvbi5gO1xuICAgICAgICAgICAgaWYgKHRhZyA9PT0gJ3RlbXBsYXRlJykge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobSk7XG4gICAgICAgICAgICB9IGVsc2UgaXNzdWVXYXJuaW5nKCcnLCBtKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gVE9ETyAoanVzdGluZmFnbmFuaSk6IGZvciBhdHRlbXB0ZWQgZHluYW1pYyB0YWcgbmFtZXMsIHdlIGRvbid0XG4gICAgICAgIC8vIGluY3JlbWVudCB0aGUgYmluZGluZ0luZGV4LCBhbmQgaXQnbGwgYmUgb2ZmIGJ5IDEgaW4gdGhlIGVsZW1lbnRcbiAgICAgICAgLy8gYW5kIG9mZiBieSB0d28gYWZ0ZXIgaXQuXG4gICAgICAgIGlmICgobm9kZSBhcyBFbGVtZW50KS5oYXNBdHRyaWJ1dGVzKCkpIHtcbiAgICAgICAgICAvLyBXZSBkZWZlciByZW1vdmluZyBib3VuZCBhdHRyaWJ1dGVzIGJlY2F1c2Ugb24gSUUgd2UgbWlnaHQgbm90IGJlXG4gICAgICAgICAgLy8gaXRlcmF0aW5nIGF0dHJpYnV0ZXMgaW4gdGhlaXIgdGVtcGxhdGUgb3JkZXIsIGFuZCB3b3VsZCBzb21ldGltZXNcbiAgICAgICAgICAvLyByZW1vdmUgYW4gYXR0cmlidXRlIHRoYXQgd2Ugc3RpbGwgbmVlZCB0byBjcmVhdGUgYSBwYXJ0IGZvci5cbiAgICAgICAgICBjb25zdCBhdHRyc1RvUmVtb3ZlID0gW107XG4gICAgICAgICAgZm9yIChjb25zdCBuYW1lIG9mIChub2RlIGFzIEVsZW1lbnQpLmdldEF0dHJpYnV0ZU5hbWVzKCkpIHtcbiAgICAgICAgICAgIC8vIGBuYW1lYCBpcyB0aGUgbmFtZSBvZiB0aGUgYXR0cmlidXRlIHdlJ3JlIGl0ZXJhdGluZyBvdmVyLCBidXQgbm90XG4gICAgICAgICAgICAvLyBfbmVjZXNzYXJpbHlfIHRoZSBuYW1lIG9mIHRoZSBhdHRyaWJ1dGUgd2Ugd2lsbCBjcmVhdGUgYSBwYXJ0XG4gICAgICAgICAgICAvLyBmb3IuIFRoZXkgY2FuIGJlIGRpZmZlcmVudCBpbiBicm93c2VycyB0aGF0IGRvbid0IGl0ZXJhdGUgb25cbiAgICAgICAgICAgIC8vIGF0dHJpYnV0ZXMgaW4gc291cmNlIG9yZGVyLiBJbiB0aGF0IGNhc2UgdGhlIGF0dHJOYW1lcyBhcnJheVxuICAgICAgICAgICAgLy8gY29udGFpbnMgdGhlIGF0dHJpYnV0ZSBuYW1lIHdlJ2xsIHByb2Nlc3MgbmV4dC4gV2Ugb25seSBuZWVkIHRoZVxuICAgICAgICAgICAgLy8gYXR0cmlidXRlIG5hbWUgaGVyZSB0byBrbm93IGlmIHdlIHNob3VsZCBwcm9jZXNzIGEgYm91bmQgYXR0cmlidXRlXG4gICAgICAgICAgICAvLyBvbiB0aGlzIGVsZW1lbnQuXG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIG5hbWUuZW5kc1dpdGgoYm91bmRBdHRyaWJ1dGVTdWZmaXgpIHx8XG4gICAgICAgICAgICAgIG5hbWUuc3RhcnRzV2l0aChtYXJrZXIpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgY29uc3QgcmVhbE5hbWUgPSBhdHRyTmFtZXNbYXR0ck5hbWVJbmRleCsrXTtcbiAgICAgICAgICAgICAgYXR0cnNUb1JlbW92ZS5wdXNoKG5hbWUpO1xuICAgICAgICAgICAgICBpZiAocmVhbE5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIC8vIExvd2VyY2FzZSBmb3IgY2FzZS1zZW5zaXRpdmUgU1ZHIGF0dHJpYnV0ZXMgbGlrZSB2aWV3Qm94XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAobm9kZSBhcyBFbGVtZW50KS5nZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgICByZWFsTmFtZS50b0xvd2VyQ2FzZSgpICsgYm91bmRBdHRyaWJ1dGVTdWZmaXhcbiAgICAgICAgICAgICAgICApITtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0aWNzID0gdmFsdWUuc3BsaXQobWFya2VyKTtcbiAgICAgICAgICAgICAgICBjb25zdCBtID0gLyhbLj9AXSk/KC4qKS8uZXhlYyhyZWFsTmFtZSkhO1xuICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgdHlwZTogQVRUUklCVVRFX1BBUlQsXG4gICAgICAgICAgICAgICAgICBpbmRleDogbm9kZUluZGV4LFxuICAgICAgICAgICAgICAgICAgbmFtZTogbVsyXSxcbiAgICAgICAgICAgICAgICAgIHN0cmluZ3M6IHN0YXRpY3MsXG4gICAgICAgICAgICAgICAgICBjdG9yOlxuICAgICAgICAgICAgICAgICAgICBtWzFdID09PSAnLidcbiAgICAgICAgICAgICAgICAgICAgICA/IFByb3BlcnR5UGFydFxuICAgICAgICAgICAgICAgICAgICAgIDogbVsxXSA9PT0gJz8nXG4gICAgICAgICAgICAgICAgICAgICAgPyBCb29sZWFuQXR0cmlidXRlUGFydFxuICAgICAgICAgICAgICAgICAgICAgIDogbVsxXSA9PT0gJ0AnXG4gICAgICAgICAgICAgICAgICAgICAgPyBFdmVudFBhcnRcbiAgICAgICAgICAgICAgICAgICAgICA6IEF0dHJpYnV0ZVBhcnQsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGFydHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICB0eXBlOiBFTEVNRU5UX1BBUlQsXG4gICAgICAgICAgICAgICAgICBpbmRleDogbm9kZUluZGV4LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGZvciAoY29uc3QgbmFtZSBvZiBhdHRyc1RvUmVtb3ZlKSB7XG4gICAgICAgICAgICAobm9kZSBhcyBFbGVtZW50KS5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE8gKGp1c3RpbmZhZ25hbmkpOiBiZW5jaG1hcmsgdGhlIHJlZ2V4IGFnYWluc3QgdGVzdGluZyBmb3IgZWFjaFxuICAgICAgICAvLyBvZiB0aGUgMyByYXcgdGV4dCBlbGVtZW50IG5hbWVzLlxuICAgICAgICBpZiAocmF3VGV4dEVsZW1lbnQudGVzdCgobm9kZSBhcyBFbGVtZW50KS50YWdOYW1lKSkge1xuICAgICAgICAgIC8vIEZvciByYXcgdGV4dCBlbGVtZW50cyB3ZSBuZWVkIHRvIHNwbGl0IHRoZSB0ZXh0IGNvbnRlbnQgb25cbiAgICAgICAgICAvLyBtYXJrZXJzLCBjcmVhdGUgYSBUZXh0IG5vZGUgZm9yIGVhY2ggc2VnbWVudCwgYW5kIGNyZWF0ZVxuICAgICAgICAgIC8vIGEgVGVtcGxhdGVQYXJ0IGZvciBlYWNoIG1hcmtlci5cbiAgICAgICAgICBjb25zdCBzdHJpbmdzID0gKG5vZGUgYXMgRWxlbWVudCkudGV4dENvbnRlbnQhLnNwbGl0KG1hcmtlcik7XG4gICAgICAgICAgY29uc3QgbGFzdEluZGV4ID0gc3RyaW5ncy5sZW5ndGggLSAxO1xuICAgICAgICAgIGlmIChsYXN0SW5kZXggPiAwKSB7XG4gICAgICAgICAgICAobm9kZSBhcyBFbGVtZW50KS50ZXh0Q29udGVudCA9IHRydXN0ZWRUeXBlc1xuICAgICAgICAgICAgICA/ICh0cnVzdGVkVHlwZXMuZW1wdHlTY3JpcHQgYXMgdW5rbm93biBhcyAnJylcbiAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgICAgIC8vIEdlbmVyYXRlIGEgbmV3IHRleHQgbm9kZSBmb3IgZWFjaCBsaXRlcmFsIHNlY3Rpb25cbiAgICAgICAgICAgIC8vIFRoZXNlIG5vZGVzIGFyZSBhbHNvIHVzZWQgYXMgdGhlIG1hcmtlcnMgZm9yIG5vZGUgcGFydHNcbiAgICAgICAgICAgIC8vIFdlIGNhbid0IHVzZSBlbXB0eSB0ZXh0IG5vZGVzIGFzIG1hcmtlcnMgYmVjYXVzZSB0aGV5J3JlXG4gICAgICAgICAgICAvLyBub3JtYWxpemVkIHdoZW4gY2xvbmluZyBpbiBJRSAoY291bGQgc2ltcGxpZnkgd2hlblxuICAgICAgICAgICAgLy8gSUUgaXMgbm8gbG9uZ2VyIHN1cHBvcnRlZClcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGFzdEluZGV4OyBpKyspIHtcbiAgICAgICAgICAgICAgKG5vZGUgYXMgRWxlbWVudCkuYXBwZW5kKHN0cmluZ3NbaV0sIGNyZWF0ZU1hcmtlcigpKTtcbiAgICAgICAgICAgICAgLy8gV2FsayBwYXN0IHRoZSBtYXJrZXIgbm9kZSB3ZSBqdXN0IGFkZGVkXG4gICAgICAgICAgICAgIHdhbGtlci5uZXh0Tm9kZSgpO1xuICAgICAgICAgICAgICBwYXJ0cy5wdXNoKHt0eXBlOiBDSElMRF9QQVJULCBpbmRleDogKytub2RlSW5kZXh9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE5vdGUgYmVjYXVzZSB0aGlzIG1hcmtlciBpcyBhZGRlZCBhZnRlciB0aGUgd2Fsa2VyJ3MgY3VycmVudFxuICAgICAgICAgICAgLy8gbm9kZSwgaXQgd2lsbCBiZSB3YWxrZWQgdG8gaW4gdGhlIG91dGVyIGxvb3AgKGFuZCBpZ25vcmVkKSwgc29cbiAgICAgICAgICAgIC8vIHdlIGRvbid0IG5lZWQgdG8gYWRqdXN0IG5vZGVJbmRleCBoZXJlXG4gICAgICAgICAgICAobm9kZSBhcyBFbGVtZW50KS5hcHBlbmQoc3RyaW5nc1tsYXN0SW5kZXhdLCBjcmVhdGVNYXJrZXIoKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IDgpIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IChub2RlIGFzIENvbW1lbnQpLmRhdGE7XG4gICAgICAgIGlmIChkYXRhID09PSBtYXJrZXJNYXRjaCkge1xuICAgICAgICAgIHBhcnRzLnB1c2goe3R5cGU6IENISUxEX1BBUlQsIGluZGV4OiBub2RlSW5kZXh9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsZXQgaSA9IC0xO1xuICAgICAgICAgIHdoaWxlICgoaSA9IChub2RlIGFzIENvbW1lbnQpLmRhdGEuaW5kZXhPZihtYXJrZXIsIGkgKyAxKSkgIT09IC0xKSB7XG4gICAgICAgICAgICAvLyBDb21tZW50IG5vZGUgaGFzIGEgYmluZGluZyBtYXJrZXIgaW5zaWRlLCBtYWtlIGFuIGluYWN0aXZlIHBhcnRcbiAgICAgICAgICAgIC8vIFRoZSBiaW5kaW5nIHdvbid0IHdvcmssIGJ1dCBzdWJzZXF1ZW50IGJpbmRpbmdzIHdpbGxcbiAgICAgICAgICAgIHBhcnRzLnB1c2goe3R5cGU6IENPTU1FTlRfUEFSVCwgaW5kZXg6IG5vZGVJbmRleH0pO1xuICAgICAgICAgICAgLy8gTW92ZSB0byB0aGUgZW5kIG9mIHRoZSBtYXRjaFxuICAgICAgICAgICAgaSArPSBtYXJrZXIubGVuZ3RoIC0gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG5vZGVJbmRleCsrO1xuICAgIH1cbiAgICAvLyBXZSBjb3VsZCBzZXQgd2Fsa2VyLmN1cnJlbnROb2RlIHRvIGFub3RoZXIgbm9kZSBoZXJlIHRvIHByZXZlbnQgYSBtZW1vcnlcbiAgICAvLyBsZWFrLCBidXQgZXZlcnkgdGltZSB3ZSBwcmVwYXJlIGEgdGVtcGxhdGUsIHdlIGltbWVkaWF0ZWx5IHJlbmRlciBpdFxuICAgIC8vIGFuZCByZS11c2UgdGhlIHdhbGtlciBpbiBuZXcgVGVtcGxhdGVJbnN0YW5jZS5fY2xvbmUoKS5cbiAgICBkZWJ1Z0xvZ0V2ZW50Py4oe1xuICAgICAga2luZDogJ3RlbXBsYXRlIHByZXAnLFxuICAgICAgdGVtcGxhdGU6IHRoaXMsXG4gICAgICBjbG9uYWJsZVRlbXBsYXRlOiB0aGlzLmVsLFxuICAgICAgcGFydHM6IHRoaXMucGFydHMsXG4gICAgICBzdHJpbmdzLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gT3ZlcnJpZGRlbiB2aWEgYGxpdEh0bWxQb2x5ZmlsbFN1cHBvcnRgIHRvIHByb3ZpZGUgcGxhdGZvcm0gc3VwcG9ydC5cbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBjcmVhdGVFbGVtZW50KGh0bWw6IFRydXN0ZWRIVE1MLCBfb3B0aW9ucz86IFJlbmRlck9wdGlvbnMpIHtcbiAgICBjb25zdCBlbCA9IGQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICBlbC5pbm5lckhUTUwgPSBodG1sIGFzIHVua25vd24gYXMgc3RyaW5nO1xuICAgIHJldHVybiBlbDtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIERpc2Nvbm5lY3RhYmxlIHtcbiAgXyRwYXJlbnQ/OiBEaXNjb25uZWN0YWJsZTtcbiAgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuPzogU2V0PERpc2Nvbm5lY3RhYmxlPjtcbiAgLy8gUmF0aGVyIHRoYW4gaG9sZCBjb25uZWN0aW9uIHN0YXRlIG9uIGluc3RhbmNlcywgRGlzY29ubmVjdGFibGVzIHJlY3Vyc2l2ZWx5XG4gIC8vIGZldGNoIHRoZSBjb25uZWN0aW9uIHN0YXRlIGZyb20gdGhlIFJvb3RQYXJ0IHRoZXkgYXJlIGNvbm5lY3RlZCBpbiB2aWFcbiAgLy8gZ2V0dGVycyB1cCB0aGUgRGlzY29ubmVjdGFibGUgdHJlZSB2aWEgXyRwYXJlbnQgcmVmZXJlbmNlcy4gVGhpcyBwdXNoZXMgdGhlXG4gIC8vIGNvc3Qgb2YgdHJhY2tpbmcgdGhlIGlzQ29ubmVjdGVkIHN0YXRlIHRvIGBBc3luY0RpcmVjdGl2ZXNgLCBhbmQgYXZvaWRzXG4gIC8vIG5lZWRpbmcgdG8gcGFzcyBhbGwgRGlzY29ubmVjdGFibGVzIChwYXJ0cywgdGVtcGxhdGUgaW5zdGFuY2VzLCBhbmRcbiAgLy8gZGlyZWN0aXZlcykgdGhlaXIgY29ubmVjdGlvbiBzdGF0ZSBlYWNoIHRpbWUgaXQgY2hhbmdlcywgd2hpY2ggd291bGQgYmVcbiAgLy8gY29zdGx5IGZvciB0cmVlcyB0aGF0IGhhdmUgbm8gQXN5bmNEaXJlY3RpdmVzLlxuICBfJGlzQ29ubmVjdGVkOiBib29sZWFuO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlRGlyZWN0aXZlKFxuICBwYXJ0OiBDaGlsZFBhcnQgfCBBdHRyaWJ1dGVQYXJ0IHwgRWxlbWVudFBhcnQsXG4gIHZhbHVlOiB1bmtub3duLFxuICBwYXJlbnQ6IERpcmVjdGl2ZVBhcmVudCA9IHBhcnQsXG4gIGF0dHJpYnV0ZUluZGV4PzogbnVtYmVyXG4pOiB1bmtub3duIHtcbiAgLy8gQmFpbCBlYXJseSBpZiB0aGUgdmFsdWUgaXMgZXhwbGljaXRseSBub0NoYW5nZS4gTm90ZSwgdGhpcyBtZWFucyBhbnlcbiAgLy8gbmVzdGVkIGRpcmVjdGl2ZSBpcyBzdGlsbCBhdHRhY2hlZCBhbmQgaXMgbm90IHJ1bi5cbiAgaWYgKHZhbHVlID09PSBub0NoYW5nZSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBsZXQgY3VycmVudERpcmVjdGl2ZSA9XG4gICAgYXR0cmlidXRlSW5kZXggIT09IHVuZGVmaW5lZFxuICAgICAgPyAocGFyZW50IGFzIEF0dHJpYnV0ZVBhcnQpLl9fZGlyZWN0aXZlcz8uW2F0dHJpYnV0ZUluZGV4XVxuICAgICAgOiAocGFyZW50IGFzIENoaWxkUGFydCB8IEVsZW1lbnRQYXJ0IHwgRGlyZWN0aXZlKS5fX2RpcmVjdGl2ZTtcbiAgY29uc3QgbmV4dERpcmVjdGl2ZUNvbnN0cnVjdG9yID0gaXNQcmltaXRpdmUodmFsdWUpXG4gICAgPyB1bmRlZmluZWRcbiAgICA6IC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgICAodmFsdWUgYXMgRGlyZWN0aXZlUmVzdWx0KVsnXyRsaXREaXJlY3RpdmUkJ107XG4gIGlmIChjdXJyZW50RGlyZWN0aXZlPy5jb25zdHJ1Y3RvciAhPT0gbmV4dERpcmVjdGl2ZUNvbnN0cnVjdG9yKSB7XG4gICAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICBjdXJyZW50RGlyZWN0aXZlPy5bJ18kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWQnXT8uKGZhbHNlKTtcbiAgICBpZiAobmV4dERpcmVjdGl2ZUNvbnN0cnVjdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGN1cnJlbnREaXJlY3RpdmUgPSB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGN1cnJlbnREaXJlY3RpdmUgPSBuZXcgbmV4dERpcmVjdGl2ZUNvbnN0cnVjdG9yKHBhcnQgYXMgUGFydEluZm8pO1xuICAgICAgY3VycmVudERpcmVjdGl2ZS5fJGluaXRpYWxpemUocGFydCwgcGFyZW50LCBhdHRyaWJ1dGVJbmRleCk7XG4gICAgfVxuICAgIGlmIChhdHRyaWJ1dGVJbmRleCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAoKHBhcmVudCBhcyBBdHRyaWJ1dGVQYXJ0KS5fX2RpcmVjdGl2ZXMgPz89IFtdKVthdHRyaWJ1dGVJbmRleF0gPVxuICAgICAgICBjdXJyZW50RGlyZWN0aXZlO1xuICAgIH0gZWxzZSB7XG4gICAgICAocGFyZW50IGFzIENoaWxkUGFydCB8IERpcmVjdGl2ZSkuX19kaXJlY3RpdmUgPSBjdXJyZW50RGlyZWN0aXZlO1xuICAgIH1cbiAgfVxuICBpZiAoY3VycmVudERpcmVjdGl2ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdmFsdWUgPSByZXNvbHZlRGlyZWN0aXZlKFxuICAgICAgcGFydCxcbiAgICAgIGN1cnJlbnREaXJlY3RpdmUuXyRyZXNvbHZlKHBhcnQsICh2YWx1ZSBhcyBEaXJlY3RpdmVSZXN1bHQpLnZhbHVlcyksXG4gICAgICBjdXJyZW50RGlyZWN0aXZlLFxuICAgICAgYXR0cmlidXRlSW5kZXhcbiAgICApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZXhwb3J0IHR5cGUge1RlbXBsYXRlSW5zdGFuY2V9O1xuLyoqXG4gKiBBbiB1cGRhdGVhYmxlIGluc3RhbmNlIG9mIGEgVGVtcGxhdGUuIEhvbGRzIHJlZmVyZW5jZXMgdG8gdGhlIFBhcnRzIHVzZWQgdG9cbiAqIHVwZGF0ZSB0aGUgdGVtcGxhdGUgaW5zdGFuY2UuXG4gKi9cbmNsYXNzIFRlbXBsYXRlSW5zdGFuY2UgaW1wbGVtZW50cyBEaXNjb25uZWN0YWJsZSB7XG4gIF8kdGVtcGxhdGU6IFRlbXBsYXRlO1xuICBfJHBhcnRzOiBBcnJheTxQYXJ0IHwgdW5kZWZpbmVkPiA9IFtdO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRwYXJlbnQ6IENoaWxkUGFydDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4/OiBTZXQ8RGlzY29ubmVjdGFibGU+ID0gdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKHRlbXBsYXRlOiBUZW1wbGF0ZSwgcGFyZW50OiBDaGlsZFBhcnQpIHtcbiAgICB0aGlzLl8kdGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgICB0aGlzLl8kcGFyZW50ID0gcGFyZW50O1xuICB9XG5cbiAgLy8gQ2FsbGVkIGJ5IENoaWxkUGFydCBwYXJlbnROb2RlIGdldHRlclxuICBnZXQgcGFyZW50Tm9kZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fJHBhcmVudC5wYXJlbnROb2RlO1xuICB9XG5cbiAgLy8gU2VlIGNvbW1lbnQgaW4gRGlzY29ubmVjdGFibGUgaW50ZXJmYWNlIGZvciB3aHkgdGhpcyBpcyBhIGdldHRlclxuICBnZXQgXyRpc0Nvbm5lY3RlZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fJHBhcmVudC5fJGlzQ29ubmVjdGVkO1xuICB9XG5cbiAgLy8gVGhpcyBtZXRob2QgaXMgc2VwYXJhdGUgZnJvbSB0aGUgY29uc3RydWN0b3IgYmVjYXVzZSB3ZSBuZWVkIHRvIHJldHVybiBhXG4gIC8vIERvY3VtZW50RnJhZ21lbnQgYW5kIHdlIGRvbid0IHdhbnQgdG8gaG9sZCBvbnRvIGl0IHdpdGggYW4gaW5zdGFuY2UgZmllbGQuXG4gIF9jbG9uZShvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkKSB7XG4gICAgY29uc3Qge1xuICAgICAgZWw6IHtjb250ZW50fSxcbiAgICAgIHBhcnRzOiBwYXJ0cyxcbiAgICB9ID0gdGhpcy5fJHRlbXBsYXRlO1xuICAgIGNvbnN0IGZyYWdtZW50ID0gKG9wdGlvbnM/LmNyZWF0aW9uU2NvcGUgPz8gZCkuaW1wb3J0Tm9kZShjb250ZW50LCB0cnVlKTtcbiAgICB3YWxrZXIuY3VycmVudE5vZGUgPSBmcmFnbWVudDtcblxuICAgIGxldCBub2RlID0gd2Fsa2VyLm5leHROb2RlKCkhO1xuICAgIGxldCBub2RlSW5kZXggPSAwO1xuICAgIGxldCBwYXJ0SW5kZXggPSAwO1xuICAgIGxldCB0ZW1wbGF0ZVBhcnQgPSBwYXJ0c1swXTtcblxuICAgIHdoaWxlICh0ZW1wbGF0ZVBhcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKG5vZGVJbmRleCA9PT0gdGVtcGxhdGVQYXJ0LmluZGV4KSB7XG4gICAgICAgIGxldCBwYXJ0OiBQYXJ0IHwgdW5kZWZpbmVkO1xuICAgICAgICBpZiAodGVtcGxhdGVQYXJ0LnR5cGUgPT09IENISUxEX1BBUlQpIHtcbiAgICAgICAgICBwYXJ0ID0gbmV3IENoaWxkUGFydChcbiAgICAgICAgICAgIG5vZGUgYXMgSFRNTEVsZW1lbnQsXG4gICAgICAgICAgICBub2RlLm5leHRTaWJsaW5nLFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgIG9wdGlvbnNcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKHRlbXBsYXRlUGFydC50eXBlID09PSBBVFRSSUJVVEVfUEFSVCkge1xuICAgICAgICAgIHBhcnQgPSBuZXcgdGVtcGxhdGVQYXJ0LmN0b3IoXG4gICAgICAgICAgICBub2RlIGFzIEhUTUxFbGVtZW50LFxuICAgICAgICAgICAgdGVtcGxhdGVQYXJ0Lm5hbWUsXG4gICAgICAgICAgICB0ZW1wbGF0ZVBhcnQuc3RyaW5ncyxcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICBvcHRpb25zXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmICh0ZW1wbGF0ZVBhcnQudHlwZSA9PT0gRUxFTUVOVF9QQVJUKSB7XG4gICAgICAgICAgcGFydCA9IG5ldyBFbGVtZW50UGFydChub2RlIGFzIEhUTUxFbGVtZW50LCB0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl8kcGFydHMucHVzaChwYXJ0KTtcbiAgICAgICAgdGVtcGxhdGVQYXJ0ID0gcGFydHNbKytwYXJ0SW5kZXhdO1xuICAgICAgfVxuICAgICAgaWYgKG5vZGVJbmRleCAhPT0gdGVtcGxhdGVQYXJ0Py5pbmRleCkge1xuICAgICAgICBub2RlID0gd2Fsa2VyLm5leHROb2RlKCkhO1xuICAgICAgICBub2RlSW5kZXgrKztcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gV2UgbmVlZCB0byBzZXQgdGhlIGN1cnJlbnROb2RlIGF3YXkgZnJvbSB0aGUgY2xvbmVkIHRyZWUgc28gdGhhdCB3ZVxuICAgIC8vIGRvbid0IGhvbGQgb250byB0aGUgdHJlZSBldmVuIGlmIHRoZSB0cmVlIGlzIGRldGFjaGVkIGFuZCBzaG91bGQgYmVcbiAgICAvLyBmcmVlZC5cbiAgICB3YWxrZXIuY3VycmVudE5vZGUgPSBkO1xuICAgIHJldHVybiBmcmFnbWVudDtcbiAgfVxuXG4gIF91cGRhdGUodmFsdWVzOiBBcnJheTx1bmtub3duPikge1xuICAgIGxldCBpID0gMDtcbiAgICBmb3IgKGNvbnN0IHBhcnQgb2YgdGhpcy5fJHBhcnRzKSB7XG4gICAgICBpZiAocGFydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGRlYnVnTG9nRXZlbnQ/Lih7XG4gICAgICAgICAga2luZDogJ3NldCBwYXJ0JyxcbiAgICAgICAgICBwYXJ0LFxuICAgICAgICAgIHZhbHVlOiB2YWx1ZXNbaV0sXG4gICAgICAgICAgdmFsdWVJbmRleDogaSxcbiAgICAgICAgICB2YWx1ZXMsXG4gICAgICAgICAgdGVtcGxhdGVJbnN0YW5jZTogdGhpcyxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICgocGFydCBhcyBBdHRyaWJ1dGVQYXJ0KS5zdHJpbmdzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAocGFydCBhcyBBdHRyaWJ1dGVQYXJ0KS5fJHNldFZhbHVlKHZhbHVlcywgcGFydCBhcyBBdHRyaWJ1dGVQYXJ0LCBpKTtcbiAgICAgICAgICAvLyBUaGUgbnVtYmVyIG9mIHZhbHVlcyB0aGUgcGFydCBjb25zdW1lcyBpcyBwYXJ0LnN0cmluZ3MubGVuZ3RoIC0gMVxuICAgICAgICAgIC8vIHNpbmNlIHZhbHVlcyBhcmUgaW4gYmV0d2VlbiB0ZW1wbGF0ZSBzcGFucy4gV2UgaW5jcmVtZW50IGkgYnkgMVxuICAgICAgICAgIC8vIGxhdGVyIGluIHRoZSBsb29wLCBzbyBpbmNyZW1lbnQgaXQgYnkgcGFydC5zdHJpbmdzLmxlbmd0aCAtIDIgaGVyZVxuICAgICAgICAgIGkgKz0gKHBhcnQgYXMgQXR0cmlidXRlUGFydCkuc3RyaW5ncyEubGVuZ3RoIC0gMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwYXJ0Ll8kc2V0VmFsdWUodmFsdWVzW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaSsrO1xuICAgIH1cbiAgfVxufVxuXG4vKlxuICogUGFydHNcbiAqL1xudHlwZSBBdHRyaWJ1dGVUZW1wbGF0ZVBhcnQgPSB7XG4gIHJlYWRvbmx5IHR5cGU6IHR5cGVvZiBBVFRSSUJVVEVfUEFSVDtcbiAgcmVhZG9ubHkgaW5kZXg6IG51bWJlcjtcbiAgcmVhZG9ubHkgbmFtZTogc3RyaW5nO1xuICByZWFkb25seSBjdG9yOiB0eXBlb2YgQXR0cmlidXRlUGFydDtcbiAgcmVhZG9ubHkgc3RyaW5nczogUmVhZG9ubHlBcnJheTxzdHJpbmc+O1xufTtcbnR5cGUgTm9kZVRlbXBsYXRlUGFydCA9IHtcbiAgcmVhZG9ubHkgdHlwZTogdHlwZW9mIENISUxEX1BBUlQ7XG4gIHJlYWRvbmx5IGluZGV4OiBudW1iZXI7XG59O1xudHlwZSBFbGVtZW50VGVtcGxhdGVQYXJ0ID0ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgRUxFTUVOVF9QQVJUO1xuICByZWFkb25seSBpbmRleDogbnVtYmVyO1xufTtcbnR5cGUgQ29tbWVudFRlbXBsYXRlUGFydCA9IHtcbiAgcmVhZG9ubHkgdHlwZTogdHlwZW9mIENPTU1FTlRfUEFSVDtcbiAgcmVhZG9ubHkgaW5kZXg6IG51bWJlcjtcbn07XG5cbi8qKlxuICogQSBUZW1wbGF0ZVBhcnQgcmVwcmVzZW50cyBhIGR5bmFtaWMgcGFydCBpbiBhIHRlbXBsYXRlLCBiZWZvcmUgdGhlIHRlbXBsYXRlXG4gKiBpcyBpbnN0YW50aWF0ZWQuIFdoZW4gYSB0ZW1wbGF0ZSBpcyBpbnN0YW50aWF0ZWQgUGFydHMgYXJlIGNyZWF0ZWQgZnJvbVxuICogVGVtcGxhdGVQYXJ0cy5cbiAqL1xudHlwZSBUZW1wbGF0ZVBhcnQgPVxuICB8IE5vZGVUZW1wbGF0ZVBhcnRcbiAgfCBBdHRyaWJ1dGVUZW1wbGF0ZVBhcnRcbiAgfCBFbGVtZW50VGVtcGxhdGVQYXJ0XG4gIHwgQ29tbWVudFRlbXBsYXRlUGFydDtcblxuZXhwb3J0IHR5cGUgUGFydCA9XG4gIHwgQ2hpbGRQYXJ0XG4gIHwgQXR0cmlidXRlUGFydFxuICB8IFByb3BlcnR5UGFydFxuICB8IEJvb2xlYW5BdHRyaWJ1dGVQYXJ0XG4gIHwgRWxlbWVudFBhcnRcbiAgfCBFdmVudFBhcnQ7XG5cbmV4cG9ydCB0eXBlIHtDaGlsZFBhcnR9O1xuY2xhc3MgQ2hpbGRQYXJ0IGltcGxlbWVudHMgRGlzY29ubmVjdGFibGUge1xuICByZWFkb25seSB0eXBlID0gQ0hJTERfUEFSVDtcbiAgcmVhZG9ubHkgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZDtcbiAgXyRjb21taXR0ZWRWYWx1ZTogdW5rbm93biA9IG5vdGhpbmc7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX19kaXJlY3RpdmU/OiBEaXJlY3RpdmU7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRzdGFydE5vZGU6IENoaWxkTm9kZTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGVuZE5vZGU6IENoaWxkTm9kZSB8IG51bGw7XG4gIHByaXZhdGUgX3RleHRTYW5pdGl6ZXI6IFZhbHVlU2FuaXRpemVyIHwgdW5kZWZpbmVkO1xuICAvKiogQGludGVybmFsICovXG4gIF8kcGFyZW50OiBEaXNjb25uZWN0YWJsZSB8IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIENvbm5lY3Rpb24gc3RhdGUgZm9yIFJvb3RQYXJ0cyBvbmx5IChpLmUuIENoaWxkUGFydCB3aXRob3V0IF8kcGFyZW50XG4gICAqIHJldHVybmVkIGZyb20gdG9wLWxldmVsIGByZW5kZXJgKS4gVGhpcyBmaWVsZCBpcyB1bnNlZCBvdGhlcndpc2UuIFRoZVxuICAgKiBpbnRlbnRpb24gd291bGQgY2xlYXJlciBpZiB3ZSBtYWRlIGBSb290UGFydGAgYSBzdWJjbGFzcyBvZiBgQ2hpbGRQYXJ0YFxuICAgKiB3aXRoIHRoaXMgZmllbGQgKGFuZCBhIGRpZmZlcmVudCBfJGlzQ29ubmVjdGVkIGdldHRlciksIGJ1dCB0aGUgc3ViY2xhc3NcbiAgICogY2F1c2VkIGEgcGVyZiByZWdyZXNzaW9uLCBwb3NzaWJseSBkdWUgdG8gbWFraW5nIGNhbGwgc2l0ZXMgcG9seW1vcnBoaWMuXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgX19pc0Nvbm5lY3RlZDogYm9vbGVhbjtcblxuICAvLyBTZWUgY29tbWVudCBpbiBEaXNjb25uZWN0YWJsZSBpbnRlcmZhY2UgZm9yIHdoeSB0aGlzIGlzIGEgZ2V0dGVyXG4gIGdldCBfJGlzQ29ubmVjdGVkKCkge1xuICAgIC8vIENoaWxkUGFydHMgdGhhdCBhcmUgbm90IGF0IHRoZSByb290IHNob3VsZCBhbHdheXMgYmUgY3JlYXRlZCB3aXRoIGFcbiAgICAvLyBwYXJlbnQ7IG9ubHkgUm9vdENoaWxkTm9kZSdzIHdvbid0LCBzbyB0aGV5IHJldHVybiB0aGUgbG9jYWwgaXNDb25uZWN0ZWRcbiAgICAvLyBzdGF0ZVxuICAgIHJldHVybiB0aGlzLl8kcGFyZW50Py5fJGlzQ29ubmVjdGVkID8/IHRoaXMuX19pc0Nvbm5lY3RlZDtcbiAgfVxuXG4gIC8vIFRoZSBmb2xsb3dpbmcgZmllbGRzIHdpbGwgYmUgcGF0Y2hlZCBvbnRvIENoaWxkUGFydHMgd2hlbiByZXF1aXJlZCBieVxuICAvLyBBc3luY0RpcmVjdGl2ZVxuICAvKiogQGludGVybmFsICovXG4gIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT4gPSB1bmRlZmluZWQ7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZD8oXG4gICAgaXNDb25uZWN0ZWQ6IGJvb2xlYW4sXG4gICAgcmVtb3ZlRnJvbVBhcmVudD86IGJvb2xlYW4sXG4gICAgZnJvbT86IG51bWJlclxuICApOiB2b2lkO1xuICAvKiogQGludGVybmFsICovXG4gIF8kcmVwYXJlbnREaXNjb25uZWN0YWJsZXM/KHBhcmVudDogRGlzY29ubmVjdGFibGUpOiB2b2lkO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHN0YXJ0Tm9kZTogQ2hpbGROb2RlLFxuICAgIGVuZE5vZGU6IENoaWxkTm9kZSB8IG51bGwsXG4gICAgcGFyZW50OiBUZW1wbGF0ZUluc3RhbmNlIHwgQ2hpbGRQYXJ0IHwgdW5kZWZpbmVkLFxuICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgdGhpcy5fJHN0YXJ0Tm9kZSA9IHN0YXJ0Tm9kZTtcbiAgICB0aGlzLl8kZW5kTm9kZSA9IGVuZE5vZGU7XG4gICAgdGhpcy5fJHBhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIC8vIE5vdGUgX19pc0Nvbm5lY3RlZCBpcyBvbmx5IGV2ZXIgYWNjZXNzZWQgb24gUm9vdFBhcnRzIChpLmUuIHdoZW4gdGhlcmUgaXNcbiAgICAvLyBubyBfJHBhcmVudCk7IHRoZSB2YWx1ZSBvbiBhIG5vbi1yb290LXBhcnQgaXMgXCJkb24ndCBjYXJlXCIsIGJ1dCBjaGVja2luZ1xuICAgIC8vIGZvciBwYXJlbnQgd291bGQgYmUgbW9yZSBjb2RlXG4gICAgdGhpcy5fX2lzQ29ubmVjdGVkID0gb3B0aW9ucz8uaXNDb25uZWN0ZWQgPz8gdHJ1ZTtcbiAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICAvLyBFeHBsaWNpdGx5IGluaXRpYWxpemUgZm9yIGNvbnNpc3RlbnQgY2xhc3Mgc2hhcGUuXG4gICAgICB0aGlzLl90ZXh0U2FuaXRpemVyID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgcGFyZW50IG5vZGUgaW50byB3aGljaCB0aGUgcGFydCByZW5kZXJzIGl0cyBjb250ZW50LlxuICAgKlxuICAgKiBBIENoaWxkUGFydCdzIGNvbnRlbnQgY29uc2lzdHMgb2YgYSByYW5nZSBvZiBhZGphY2VudCBjaGlsZCBub2RlcyBvZlxuICAgKiBgLnBhcmVudE5vZGVgLCBwb3NzaWJseSBib3JkZXJlZCBieSAnbWFya2VyIG5vZGVzJyAoYC5zdGFydE5vZGVgIGFuZFxuICAgKiBgLmVuZE5vZGVgKS5cbiAgICpcbiAgICogLSBJZiBib3RoIGAuc3RhcnROb2RlYCBhbmQgYC5lbmROb2RlYCBhcmUgbm9uLW51bGwsIHRoZW4gdGhlIHBhcnQncyBjb250ZW50XG4gICAqIGNvbnNpc3RzIG9mIGFsbCBzaWJsaW5ncyBiZXR3ZWVuIGAuc3RhcnROb2RlYCBhbmQgYC5lbmROb2RlYCwgZXhjbHVzaXZlbHkuXG4gICAqXG4gICAqIC0gSWYgYC5zdGFydE5vZGVgIGlzIG5vbi1udWxsIGJ1dCBgLmVuZE5vZGVgIGlzIG51bGwsIHRoZW4gdGhlIHBhcnQnc1xuICAgKiBjb250ZW50IGNvbnNpc3RzIG9mIGFsbCBzaWJsaW5ncyBmb2xsb3dpbmcgYC5zdGFydE5vZGVgLCB1cCB0byBhbmRcbiAgICogaW5jbHVkaW5nIHRoZSBsYXN0IGNoaWxkIG9mIGAucGFyZW50Tm9kZWAuIElmIGAuZW5kTm9kZWAgaXMgbm9uLW51bGwsIHRoZW5cbiAgICogYC5zdGFydE5vZGVgIHdpbGwgYWx3YXlzIGJlIG5vbi1udWxsLlxuICAgKlxuICAgKiAtIElmIGJvdGggYC5lbmROb2RlYCBhbmQgYC5zdGFydE5vZGVgIGFyZSBudWxsLCB0aGVuIHRoZSBwYXJ0J3MgY29udGVudFxuICAgKiBjb25zaXN0cyBvZiBhbGwgY2hpbGQgbm9kZXMgb2YgYC5wYXJlbnROb2RlYC5cbiAgICovXG4gIGdldCBwYXJlbnROb2RlKCk6IE5vZGUge1xuICAgIGxldCBwYXJlbnROb2RlOiBOb2RlID0gd3JhcCh0aGlzLl8kc3RhcnROb2RlKS5wYXJlbnROb2RlITtcbiAgICBjb25zdCBwYXJlbnQgPSB0aGlzLl8kcGFyZW50O1xuICAgIGlmIChcbiAgICAgIHBhcmVudCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICBwYXJlbnROb2RlPy5ub2RlVHlwZSA9PT0gMTEgLyogTm9kZS5ET0NVTUVOVF9GUkFHTUVOVCAqL1xuICAgICkge1xuICAgICAgLy8gSWYgdGhlIHBhcmVudE5vZGUgaXMgYSBEb2N1bWVudEZyYWdtZW50LCBpdCBtYXkgYmUgYmVjYXVzZSB0aGUgRE9NIGlzXG4gICAgICAvLyBzdGlsbCBpbiB0aGUgY2xvbmVkIGZyYWdtZW50IGR1cmluZyBpbml0aWFsIHJlbmRlcjsgaWYgc28sIGdldCB0aGUgcmVhbFxuICAgICAgLy8gcGFyZW50Tm9kZSB0aGUgcGFydCB3aWxsIGJlIGNvbW1pdHRlZCBpbnRvIGJ5IGFza2luZyB0aGUgcGFyZW50LlxuICAgICAgcGFyZW50Tm9kZSA9IChwYXJlbnQgYXMgQ2hpbGRQYXJ0IHwgVGVtcGxhdGVJbnN0YW5jZSkucGFyZW50Tm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcmVudE5vZGU7XG4gIH1cblxuICAvKipcbiAgICogVGhlIHBhcnQncyBsZWFkaW5nIG1hcmtlciBub2RlLCBpZiBhbnkuIFNlZSBgLnBhcmVudE5vZGVgIGZvciBtb3JlXG4gICAqIGluZm9ybWF0aW9uLlxuICAgKi9cbiAgZ2V0IHN0YXJ0Tm9kZSgpOiBOb2RlIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuXyRzdGFydE5vZGU7XG4gIH1cblxuICAvKipcbiAgICogVGhlIHBhcnQncyB0cmFpbGluZyBtYXJrZXIgbm9kZSwgaWYgYW55LiBTZWUgYC5wYXJlbnROb2RlYCBmb3IgbW9yZVxuICAgKiBpbmZvcm1hdGlvbi5cbiAgICovXG4gIGdldCBlbmROb2RlKCk6IE5vZGUgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5fJGVuZE5vZGU7XG4gIH1cblxuICBfJHNldFZhbHVlKHZhbHVlOiB1bmtub3duLCBkaXJlY3RpdmVQYXJlbnQ6IERpcmVjdGl2ZVBhcmVudCA9IHRoaXMpOiB2b2lkIHtcbiAgICBpZiAoREVWX01PREUgJiYgdGhpcy5wYXJlbnROb2RlID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBUaGlzIFxcYENoaWxkUGFydFxcYCBoYXMgbm8gXFxgcGFyZW50Tm9kZVxcYCBhbmQgdGhlcmVmb3JlIGNhbm5vdCBhY2NlcHQgYSB2YWx1ZS4gVGhpcyBsaWtlbHkgbWVhbnMgdGhlIGVsZW1lbnQgY29udGFpbmluZyB0aGUgcGFydCB3YXMgbWFuaXB1bGF0ZWQgaW4gYW4gdW5zdXBwb3J0ZWQgd2F5IG91dHNpZGUgb2YgTGl0J3MgY29udHJvbCBzdWNoIHRoYXQgdGhlIHBhcnQncyBtYXJrZXIgbm9kZXMgd2VyZSBlamVjdGVkIGZyb20gRE9NLiBGb3IgZXhhbXBsZSwgc2V0dGluZyB0aGUgZWxlbWVudCdzIFxcYGlubmVySFRNTFxcYCBvciBcXGB0ZXh0Q29udGVudFxcYCBjYW4gZG8gdGhpcy5gXG4gICAgICApO1xuICAgIH1cbiAgICB2YWx1ZSA9IHJlc29sdmVEaXJlY3RpdmUodGhpcywgdmFsdWUsIGRpcmVjdGl2ZVBhcmVudCk7XG4gICAgaWYgKGlzUHJpbWl0aXZlKHZhbHVlKSkge1xuICAgICAgLy8gTm9uLXJlbmRlcmluZyBjaGlsZCB2YWx1ZXMuIEl0J3MgaW1wb3J0YW50IHRoYXQgdGhlc2UgZG8gbm90IHJlbmRlclxuICAgICAgLy8gZW1wdHkgdGV4dCBub2RlcyB0byBhdm9pZCBpc3N1ZXMgd2l0aCBwcmV2ZW50aW5nIGRlZmF1bHQgPHNsb3Q+XG4gICAgICAvLyBmYWxsYmFjayBjb250ZW50LlxuICAgICAgaWYgKHZhbHVlID09PSBub3RoaW5nIHx8IHZhbHVlID09IG51bGwgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgICAgIGlmICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgIT09IG5vdGhpbmcpIHtcbiAgICAgICAgICBkZWJ1Z0xvZ0V2ZW50Py4oe1xuICAgICAgICAgICAga2luZDogJ2NvbW1pdCBub3RoaW5nIHRvIGNoaWxkJyxcbiAgICAgICAgICAgIHN0YXJ0OiB0aGlzLl8kc3RhcnROb2RlLFxuICAgICAgICAgICAgZW5kOiB0aGlzLl8kZW5kTm9kZSxcbiAgICAgICAgICAgIHBhcmVudDogdGhpcy5fJHBhcmVudCxcbiAgICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB0aGlzLl8kY2xlYXIoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSBub3RoaW5nO1xuICAgICAgfSBlbHNlIGlmICh2YWx1ZSAhPT0gdGhpcy5fJGNvbW1pdHRlZFZhbHVlICYmIHZhbHVlICE9PSBub0NoYW5nZSkge1xuICAgICAgICB0aGlzLl9jb21taXRUZXh0KHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgfSBlbHNlIGlmICgodmFsdWUgYXMgVGVtcGxhdGVSZXN1bHQpWydfJGxpdFR5cGUkJ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fY29tbWl0VGVtcGxhdGVSZXN1bHQodmFsdWUgYXMgVGVtcGxhdGVSZXN1bHQpO1xuICAgIH0gZWxzZSBpZiAoKHZhbHVlIGFzIE5vZGUpLm5vZGVUeXBlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmIChERVZfTU9ERSAmJiB0aGlzLm9wdGlvbnM/Lmhvc3QgPT09IHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2NvbW1pdFRleHQoXG4gICAgICAgICAgYFtwcm9iYWJsZSBtaXN0YWtlOiByZW5kZXJlZCBhIHRlbXBsYXRlJ3MgaG9zdCBpbiBpdHNlbGYgYCArXG4gICAgICAgICAgICBgKGNvbW1vbmx5IGNhdXNlZCBieSB3cml0aW5nIFxcJHt0aGlzfSBpbiBhIHRlbXBsYXRlXWBcbiAgICAgICAgKTtcbiAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgIGBBdHRlbXB0ZWQgdG8gcmVuZGVyIHRoZSB0ZW1wbGF0ZSBob3N0YCxcbiAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICBgaW5zaWRlIGl0c2VsZi4gVGhpcyBpcyBhbG1vc3QgYWx3YXlzIGEgbWlzdGFrZSwgYW5kIGluIGRldiBtb2RlIGAsXG4gICAgICAgICAgYHdlIHJlbmRlciBzb21lIHdhcm5pbmcgdGV4dC4gSW4gcHJvZHVjdGlvbiBob3dldmVyLCB3ZSdsbCBgLFxuICAgICAgICAgIGByZW5kZXIgaXQsIHdoaWNoIHdpbGwgdXN1YWxseSByZXN1bHQgaW4gYW4gZXJyb3IsIGFuZCBzb21ldGltZXMgYCxcbiAgICAgICAgICBgaW4gdGhlIGVsZW1lbnQgZGlzYXBwZWFyaW5nIGZyb20gdGhlIERPTS5gXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2NvbW1pdE5vZGUodmFsdWUgYXMgTm9kZSk7XG4gICAgfSBlbHNlIGlmIChpc0l0ZXJhYmxlKHZhbHVlKSkge1xuICAgICAgdGhpcy5fY29tbWl0SXRlcmFibGUodmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGYWxsYmFjaywgd2lsbCByZW5kZXIgdGhlIHN0cmluZyByZXByZXNlbnRhdGlvblxuICAgICAgdGhpcy5fY29tbWl0VGV4dCh2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfaW5zZXJ0PFQgZXh0ZW5kcyBOb2RlPihub2RlOiBUKSB7XG4gICAgcmV0dXJuIHdyYXAod3JhcCh0aGlzLl8kc3RhcnROb2RlKS5wYXJlbnROb2RlISkuaW5zZXJ0QmVmb3JlKFxuICAgICAgbm9kZSxcbiAgICAgIHRoaXMuXyRlbmROb2RlXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbW1pdE5vZGUodmFsdWU6IE5vZGUpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5fJGNvbW1pdHRlZFZhbHVlICE9PSB2YWx1ZSkge1xuICAgICAgdGhpcy5fJGNsZWFyKCk7XG4gICAgICBpZiAoXG4gICAgICAgIEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUyAmJlxuICAgICAgICBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwgIT09IG5vb3BTYW5pdGl6ZXJcbiAgICAgICkge1xuICAgICAgICBjb25zdCBwYXJlbnROb2RlTmFtZSA9IHRoaXMuXyRzdGFydE5vZGUucGFyZW50Tm9kZT8ubm9kZU5hbWU7XG4gICAgICAgIGlmIChwYXJlbnROb2RlTmFtZSA9PT0gJ1NUWUxFJyB8fCBwYXJlbnROb2RlTmFtZSA9PT0gJ1NDUklQVCcpIHtcbiAgICAgICAgICBsZXQgbWVzc2FnZSA9ICdGb3JiaWRkZW4nO1xuICAgICAgICAgIGlmIChERVZfTU9ERSkge1xuICAgICAgICAgICAgaWYgKHBhcmVudE5vZGVOYW1lID09PSAnU1RZTEUnKSB7XG4gICAgICAgICAgICAgIG1lc3NhZ2UgPVxuICAgICAgICAgICAgICAgIGBMaXQgZG9lcyBub3Qgc3VwcG9ydCBiaW5kaW5nIGluc2lkZSBzdHlsZSBub2Rlcy4gYCArXG4gICAgICAgICAgICAgICAgYFRoaXMgaXMgYSBzZWN1cml0eSByaXNrLCBhcyBzdHlsZSBpbmplY3Rpb24gYXR0YWNrcyBjYW4gYCArXG4gICAgICAgICAgICAgICAgYGV4ZmlsdHJhdGUgZGF0YSBhbmQgc3Bvb2YgVUlzLiBgICtcbiAgICAgICAgICAgICAgICBgQ29uc2lkZXIgaW5zdGVhZCB1c2luZyBjc3NcXGAuLi5cXGAgbGl0ZXJhbHMgYCArXG4gICAgICAgICAgICAgICAgYHRvIGNvbXBvc2Ugc3R5bGVzLCBhbmQgbWFrZSBkbyBkeW5hbWljIHN0eWxpbmcgd2l0aCBgICtcbiAgICAgICAgICAgICAgICBgY3NzIGN1c3RvbSBwcm9wZXJ0aWVzLCA6OnBhcnRzLCA8c2xvdD5zLCBgICtcbiAgICAgICAgICAgICAgICBgYW5kIGJ5IG11dGF0aW5nIHRoZSBET00gcmF0aGVyIHRoYW4gc3R5bGVzaGVldHMuYDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG1lc3NhZ2UgPVxuICAgICAgICAgICAgICAgIGBMaXQgZG9lcyBub3Qgc3VwcG9ydCBiaW5kaW5nIGluc2lkZSBzY3JpcHQgbm9kZXMuIGAgK1xuICAgICAgICAgICAgICAgIGBUaGlzIGlzIGEgc2VjdXJpdHkgcmlzaywgYXMgaXQgY291bGQgYWxsb3cgYXJiaXRyYXJ5IGAgK1xuICAgICAgICAgICAgICAgIGBjb2RlIGV4ZWN1dGlvbi5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGRlYnVnTG9nRXZlbnQ/Lih7XG4gICAgICAgIGtpbmQ6ICdjb21taXQgbm9kZScsXG4gICAgICAgIHN0YXJ0OiB0aGlzLl8kc3RhcnROb2RlLFxuICAgICAgICBwYXJlbnQ6IHRoaXMuXyRwYXJlbnQsXG4gICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgfSk7XG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSB0aGlzLl9pbnNlcnQodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2NvbW1pdFRleHQodmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICAvLyBJZiB0aGUgY29tbWl0dGVkIHZhbHVlIGlzIGEgcHJpbWl0aXZlIGl0IG1lYW5zIHdlIGNhbGxlZCBfY29tbWl0VGV4dCBvblxuICAgIC8vIHRoZSBwcmV2aW91cyByZW5kZXIsIGFuZCB3ZSBrbm93IHRoYXQgdGhpcy5fJHN0YXJ0Tm9kZS5uZXh0U2libGluZyBpcyBhXG4gICAgLy8gVGV4dCBub2RlLiBXZSBjYW4gbm93IGp1c3QgcmVwbGFjZSB0aGUgdGV4dCBjb250ZW50ICguZGF0YSkgb2YgdGhlIG5vZGUuXG4gICAgaWYgKFxuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlICE9PSBub3RoaW5nICYmXG4gICAgICBpc1ByaW1pdGl2ZSh0aGlzLl8kY29tbWl0dGVkVmFsdWUpXG4gICAgKSB7XG4gICAgICBjb25zdCBub2RlID0gd3JhcCh0aGlzLl8kc3RhcnROb2RlKS5uZXh0U2libGluZyBhcyBUZXh0O1xuICAgICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgICBpZiAodGhpcy5fdGV4dFNhbml0aXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhpcy5fdGV4dFNhbml0aXplciA9IGNyZWF0ZVNhbml0aXplcihub2RlLCAnZGF0YScsICdwcm9wZXJ0eScpO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlID0gdGhpcy5fdGV4dFNhbml0aXplcih2YWx1ZSk7XG4gICAgICB9XG4gICAgICBkZWJ1Z0xvZ0V2ZW50Py4oe1xuICAgICAgICBraW5kOiAnY29tbWl0IHRleHQnLFxuICAgICAgICBub2RlLFxuICAgICAgICB2YWx1ZSxcbiAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgfSk7XG4gICAgICAobm9kZSBhcyBUZXh0KS5kYXRhID0gdmFsdWUgYXMgc3RyaW5nO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gICAgICAgIGNvbnN0IHRleHROb2RlID0gZC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICAgIHRoaXMuX2NvbW1pdE5vZGUodGV4dE5vZGUpO1xuICAgICAgICAvLyBXaGVuIHNldHRpbmcgdGV4dCBjb250ZW50LCBmb3Igc2VjdXJpdHkgcHVycG9zZXMgaXQgbWF0dGVycyBhIGxvdFxuICAgICAgICAvLyB3aGF0IHRoZSBwYXJlbnQgaXMuIEZvciBleGFtcGxlLCA8c3R5bGU+IGFuZCA8c2NyaXB0PiBuZWVkIHRvIGJlXG4gICAgICAgIC8vIGhhbmRsZWQgd2l0aCBjYXJlLCB3aGlsZSA8c3Bhbj4gZG9lcyBub3QuIFNvIGZpcnN0IHdlIG5lZWQgdG8gcHV0IGFcbiAgICAgICAgLy8gdGV4dCBub2RlIGludG8gdGhlIGRvY3VtZW50LCB0aGVuIHdlIGNhbiBzYW5pdGl6ZSBpdHMgY29udGVudC5cbiAgICAgICAgaWYgKHRoaXMuX3RleHRTYW5pdGl6ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRoaXMuX3RleHRTYW5pdGl6ZXIgPSBjcmVhdGVTYW5pdGl6ZXIodGV4dE5vZGUsICdkYXRhJywgJ3Byb3BlcnR5Jyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWUgPSB0aGlzLl90ZXh0U2FuaXRpemVyKHZhbHVlKTtcbiAgICAgICAgZGVidWdMb2dFdmVudD8uKHtcbiAgICAgICAgICBraW5kOiAnY29tbWl0IHRleHQnLFxuICAgICAgICAgIG5vZGU6IHRleHROb2RlLFxuICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgfSk7XG4gICAgICAgIHRleHROb2RlLmRhdGEgPSB2YWx1ZSBhcyBzdHJpbmc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9jb21taXROb2RlKGQuY3JlYXRlVGV4dE5vZGUodmFsdWUgYXMgc3RyaW5nKSk7XG4gICAgICAgIGRlYnVnTG9nRXZlbnQ/Lih7XG4gICAgICAgICAga2luZDogJ2NvbW1pdCB0ZXh0JyxcbiAgICAgICAgICBub2RlOiB3cmFwKHRoaXMuXyRzdGFydE5vZGUpLm5leHRTaWJsaW5nIGFzIFRleHQsXG4gICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gdmFsdWU7XG4gIH1cblxuICBwcml2YXRlIF9jb21taXRUZW1wbGF0ZVJlc3VsdChcbiAgICByZXN1bHQ6IFRlbXBsYXRlUmVzdWx0IHwgQ29tcGlsZWRUZW1wbGF0ZVJlc3VsdFxuICApOiB2b2lkIHtcbiAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIGNvbnN0IHt2YWx1ZXMsIFsnXyRsaXRUeXBlJCddOiB0eXBlfSA9IHJlc3VsdDtcbiAgICAvLyBJZiAkbGl0VHlwZSQgaXMgYSBudW1iZXIsIHJlc3VsdCBpcyBhIHBsYWluIFRlbXBsYXRlUmVzdWx0IGFuZCB3ZSBnZXRcbiAgICAvLyB0aGUgdGVtcGxhdGUgZnJvbSB0aGUgdGVtcGxhdGUgY2FjaGUuIElmIG5vdCwgcmVzdWx0IGlzIGFcbiAgICAvLyBDb21waWxlZFRlbXBsYXRlUmVzdWx0IGFuZCBfJGxpdFR5cGUkIGlzIGEgQ29tcGlsZWRUZW1wbGF0ZSBhbmQgd2UgbmVlZFxuICAgIC8vIHRvIGNyZWF0ZSB0aGUgPHRlbXBsYXRlPiBlbGVtZW50IHRoZSBmaXJzdCB0aW1lIHdlIHNlZSBpdC5cbiAgICBjb25zdCB0ZW1wbGF0ZTogVGVtcGxhdGUgfCBDb21waWxlZFRlbXBsYXRlID1cbiAgICAgIHR5cGVvZiB0eXBlID09PSAnbnVtYmVyJ1xuICAgICAgICA/IHRoaXMuXyRnZXRUZW1wbGF0ZShyZXN1bHQgYXMgVGVtcGxhdGVSZXN1bHQpXG4gICAgICAgIDogKHR5cGUuZWwgPT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgKHR5cGUuZWwgPSBUZW1wbGF0ZS5jcmVhdGVFbGVtZW50KHR5cGUuaCwgdGhpcy5vcHRpb25zKSksXG4gICAgICAgICAgdHlwZSk7XG5cbiAgICBpZiAoKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBUZW1wbGF0ZUluc3RhbmNlKT8uXyR0ZW1wbGF0ZSA9PT0gdGVtcGxhdGUpIHtcbiAgICAgIGRlYnVnTG9nRXZlbnQ/Lih7XG4gICAgICAgIGtpbmQ6ICd0ZW1wbGF0ZSB1cGRhdGluZycsXG4gICAgICAgIHRlbXBsYXRlLFxuICAgICAgICBpbnN0YW5jZTogdGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIFRlbXBsYXRlSW5zdGFuY2UsXG4gICAgICAgIHBhcnRzOiAodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIFRlbXBsYXRlSW5zdGFuY2UpLl8kcGFydHMsXG4gICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgdmFsdWVzLFxuICAgICAgfSk7XG4gICAgICAodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIFRlbXBsYXRlSW5zdGFuY2UpLl91cGRhdGUodmFsdWVzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgaW5zdGFuY2UgPSBuZXcgVGVtcGxhdGVJbnN0YW5jZSh0ZW1wbGF0ZSBhcyBUZW1wbGF0ZSwgdGhpcyk7XG4gICAgICBjb25zdCBmcmFnbWVudCA9IGluc3RhbmNlLl9jbG9uZSh0aGlzLm9wdGlvbnMpO1xuICAgICAgZGVidWdMb2dFdmVudD8uKHtcbiAgICAgICAga2luZDogJ3RlbXBsYXRlIGluc3RhbnRpYXRlZCcsXG4gICAgICAgIHRlbXBsYXRlLFxuICAgICAgICBpbnN0YW5jZSxcbiAgICAgICAgcGFydHM6IGluc3RhbmNlLl8kcGFydHMsXG4gICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgZnJhZ21lbnQsXG4gICAgICAgIHZhbHVlcyxcbiAgICAgIH0pO1xuICAgICAgaW5zdGFuY2UuX3VwZGF0ZSh2YWx1ZXMpO1xuICAgICAgZGVidWdMb2dFdmVudD8uKHtcbiAgICAgICAga2luZDogJ3RlbXBsYXRlIGluc3RhbnRpYXRlZCBhbmQgdXBkYXRlZCcsXG4gICAgICAgIHRlbXBsYXRlLFxuICAgICAgICBpbnN0YW5jZSxcbiAgICAgICAgcGFydHM6IGluc3RhbmNlLl8kcGFydHMsXG4gICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgZnJhZ21lbnQsXG4gICAgICAgIHZhbHVlcyxcbiAgICAgIH0pO1xuICAgICAgdGhpcy5fY29tbWl0Tm9kZShmcmFnbWVudCk7XG4gICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSBpbnN0YW5jZTtcbiAgICB9XG4gIH1cblxuICAvLyBPdmVycmlkZGVuIHZpYSBgbGl0SHRtbFBvbHlmaWxsU3VwcG9ydGAgdG8gcHJvdmlkZSBwbGF0Zm9ybSBzdXBwb3J0LlxuICAvKiogQGludGVybmFsICovXG4gIF8kZ2V0VGVtcGxhdGUocmVzdWx0OiBUZW1wbGF0ZVJlc3VsdCkge1xuICAgIGxldCB0ZW1wbGF0ZSA9IHRlbXBsYXRlQ2FjaGUuZ2V0KHJlc3VsdC5zdHJpbmdzKTtcbiAgICBpZiAodGVtcGxhdGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGVtcGxhdGVDYWNoZS5zZXQocmVzdWx0LnN0cmluZ3MsICh0ZW1wbGF0ZSA9IG5ldyBUZW1wbGF0ZShyZXN1bHQpKSk7XG4gICAgfVxuICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbW1pdEl0ZXJhYmxlKHZhbHVlOiBJdGVyYWJsZTx1bmtub3duPik6IHZvaWQge1xuICAgIC8vIEZvciBhbiBJdGVyYWJsZSwgd2UgY3JlYXRlIGEgbmV3IEluc3RhbmNlUGFydCBwZXIgaXRlbSwgdGhlbiBzZXQgaXRzXG4gICAgLy8gdmFsdWUgdG8gdGhlIGl0ZW0uIFRoaXMgaXMgYSBsaXR0bGUgYml0IG9mIG92ZXJoZWFkIGZvciBldmVyeSBpdGVtIGluXG4gICAgLy8gYW4gSXRlcmFibGUsIGJ1dCBpdCBsZXRzIHVzIHJlY3Vyc2UgZWFzaWx5IGFuZCBlZmZpY2llbnRseSB1cGRhdGUgQXJyYXlzXG4gICAgLy8gb2YgVGVtcGxhdGVSZXN1bHRzIHRoYXQgd2lsbCBiZSBjb21tb25seSByZXR1cm5lZCBmcm9tIGV4cHJlc3Npb25zIGxpa2U6XG4gICAgLy8gYXJyYXkubWFwKChpKSA9PiBodG1sYCR7aX1gKSwgYnkgcmV1c2luZyBleGlzdGluZyBUZW1wbGF0ZUluc3RhbmNlcy5cblxuICAgIC8vIElmIHZhbHVlIGlzIGFuIGFycmF5LCB0aGVuIHRoZSBwcmV2aW91cyByZW5kZXIgd2FzIG9mIGFuXG4gICAgLy8gaXRlcmFibGUgYW5kIHZhbHVlIHdpbGwgY29udGFpbiB0aGUgQ2hpbGRQYXJ0cyBmcm9tIHRoZSBwcmV2aW91c1xuICAgIC8vIHJlbmRlci4gSWYgdmFsdWUgaXMgbm90IGFuIGFycmF5LCBjbGVhciB0aGlzIHBhcnQgYW5kIG1ha2UgYSBuZXdcbiAgICAvLyBhcnJheSBmb3IgQ2hpbGRQYXJ0cy5cbiAgICBpZiAoIWlzQXJyYXkodGhpcy5fJGNvbW1pdHRlZFZhbHVlKSkge1xuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gW107XG4gICAgICB0aGlzLl8kY2xlYXIoKTtcbiAgICB9XG5cbiAgICAvLyBMZXRzIHVzIGtlZXAgdHJhY2sgb2YgaG93IG1hbnkgaXRlbXMgd2Ugc3RhbXBlZCBzbyB3ZSBjYW4gY2xlYXIgbGVmdG92ZXJcbiAgICAvLyBpdGVtcyBmcm9tIGEgcHJldmlvdXMgcmVuZGVyXG4gICAgY29uc3QgaXRlbVBhcnRzID0gdGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIENoaWxkUGFydFtdO1xuICAgIGxldCBwYXJ0SW5kZXggPSAwO1xuICAgIGxldCBpdGVtUGFydDogQ2hpbGRQYXJ0IHwgdW5kZWZpbmVkO1xuXG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHZhbHVlKSB7XG4gICAgICBpZiAocGFydEluZGV4ID09PSBpdGVtUGFydHMubGVuZ3RoKSB7XG4gICAgICAgIC8vIElmIG5vIGV4aXN0aW5nIHBhcnQsIGNyZWF0ZSBhIG5ldyBvbmVcbiAgICAgICAgLy8gVE9ETyAoanVzdGluZmFnbmFuaSk6IHRlc3QgcGVyZiBpbXBhY3Qgb2YgYWx3YXlzIGNyZWF0aW5nIHR3byBwYXJ0c1xuICAgICAgICAvLyBpbnN0ZWFkIG9mIHNoYXJpbmcgcGFydHMgYmV0d2VlbiBub2Rlc1xuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbGl0L2xpdC9pc3N1ZXMvMTI2NlxuICAgICAgICBpdGVtUGFydHMucHVzaChcbiAgICAgICAgICAoaXRlbVBhcnQgPSBuZXcgQ2hpbGRQYXJ0KFxuICAgICAgICAgICAgdGhpcy5faW5zZXJ0KGNyZWF0ZU1hcmtlcigpKSxcbiAgICAgICAgICAgIHRoaXMuX2luc2VydChjcmVhdGVNYXJrZXIoKSksXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgdGhpcy5vcHRpb25zXG4gICAgICAgICAgKSlcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFJldXNlIGFuIGV4aXN0aW5nIHBhcnRcbiAgICAgICAgaXRlbVBhcnQgPSBpdGVtUGFydHNbcGFydEluZGV4XTtcbiAgICAgIH1cbiAgICAgIGl0ZW1QYXJ0Ll8kc2V0VmFsdWUoaXRlbSk7XG4gICAgICBwYXJ0SW5kZXgrKztcbiAgICB9XG5cbiAgICBpZiAocGFydEluZGV4IDwgaXRlbVBhcnRzLmxlbmd0aCkge1xuICAgICAgLy8gaXRlbVBhcnRzIGFsd2F5cyBoYXZlIGVuZCBub2Rlc1xuICAgICAgdGhpcy5fJGNsZWFyKFxuICAgICAgICBpdGVtUGFydCAmJiB3cmFwKGl0ZW1QYXJ0Ll8kZW5kTm9kZSEpLm5leHRTaWJsaW5nLFxuICAgICAgICBwYXJ0SW5kZXhcbiAgICAgICk7XG4gICAgICAvLyBUcnVuY2F0ZSB0aGUgcGFydHMgYXJyYXkgc28gX3ZhbHVlIHJlZmxlY3RzIHRoZSBjdXJyZW50IHN0YXRlXG4gICAgICBpdGVtUGFydHMubGVuZ3RoID0gcGFydEluZGV4O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIHRoZSBub2RlcyBjb250YWluZWQgd2l0aGluIHRoaXMgUGFydCBmcm9tIHRoZSBET00uXG4gICAqXG4gICAqIEBwYXJhbSBzdGFydCBTdGFydCBub2RlIHRvIGNsZWFyIGZyb20sIGZvciBjbGVhcmluZyBhIHN1YnNldCBvZiB0aGUgcGFydCdzXG4gICAqICAgICBET00gKHVzZWQgd2hlbiB0cnVuY2F0aW5nIGl0ZXJhYmxlcylcbiAgICogQHBhcmFtIGZyb20gIFdoZW4gYHN0YXJ0YCBpcyBzcGVjaWZpZWQsIHRoZSBpbmRleCB3aXRoaW4gdGhlIGl0ZXJhYmxlIGZyb21cbiAgICogICAgIHdoaWNoIENoaWxkUGFydHMgYXJlIGJlaW5nIHJlbW92ZWQsIHVzZWQgZm9yIGRpc2Nvbm5lY3RpbmcgZGlyZWN0aXZlcyBpblxuICAgKiAgICAgdGhvc2UgUGFydHMuXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgXyRjbGVhcihcbiAgICBzdGFydDogQ2hpbGROb2RlIHwgbnVsbCA9IHdyYXAodGhpcy5fJHN0YXJ0Tm9kZSkubmV4dFNpYmxpbmcsXG4gICAgZnJvbT86IG51bWJlclxuICApIHtcbiAgICB0aGlzLl8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWQ/LihmYWxzZSwgdHJ1ZSwgZnJvbSk7XG4gICAgd2hpbGUgKHN0YXJ0ICYmIHN0YXJ0ICE9PSB0aGlzLl8kZW5kTm9kZSkge1xuICAgICAgY29uc3QgbiA9IHdyYXAoc3RhcnQhKS5uZXh0U2libGluZztcbiAgICAgICh3cmFwKHN0YXJ0ISkgYXMgRWxlbWVudCkucmVtb3ZlKCk7XG4gICAgICBzdGFydCA9IG47XG4gICAgfVxuICB9XG4gIC8qKlxuICAgKiBJbXBsZW1lbnRhdGlvbiBvZiBSb290UGFydCdzIGBpc0Nvbm5lY3RlZGAuIE5vdGUgdGhhdCB0aGlzIG1ldG9kXG4gICAqIHNob3VsZCBvbmx5IGJlIGNhbGxlZCBvbiBgUm9vdFBhcnRgcyAodGhlIGBDaGlsZFBhcnRgIHJldHVybmVkIGZyb20gYVxuICAgKiB0b3AtbGV2ZWwgYHJlbmRlcigpYCBjYWxsKS4gSXQgaGFzIG5vIGVmZmVjdCBvbiBub24tcm9vdCBDaGlsZFBhcnRzLlxuICAgKiBAcGFyYW0gaXNDb25uZWN0ZWQgV2hldGhlciB0byBzZXRcbiAgICogQGludGVybmFsXG4gICAqL1xuICBzZXRDb25uZWN0ZWQoaXNDb25uZWN0ZWQ6IGJvb2xlYW4pIHtcbiAgICBpZiAodGhpcy5fJHBhcmVudCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9faXNDb25uZWN0ZWQgPSBpc0Nvbm5lY3RlZDtcbiAgICAgIHRoaXMuXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZD8uKGlzQ29ubmVjdGVkKTtcbiAgICB9IGVsc2UgaWYgKERFVl9NT0RFKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdwYXJ0LnNldENvbm5lY3RlZCgpIG1heSBvbmx5IGJlIGNhbGxlZCBvbiBhICcgK1xuICAgICAgICAgICdSb290UGFydCByZXR1cm5lZCBmcm9tIHJlbmRlcigpLidcbiAgICAgICk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQSB0b3AtbGV2ZWwgYENoaWxkUGFydGAgcmV0dXJuZWQgZnJvbSBgcmVuZGVyYCB0aGF0IG1hbmFnZXMgdGhlIGNvbm5lY3RlZFxuICogc3RhdGUgb2YgYEFzeW5jRGlyZWN0aXZlYHMgY3JlYXRlZCB0aHJvdWdob3V0IHRoZSB0cmVlIGJlbG93IGl0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJvb3RQYXJ0IGV4dGVuZHMgQ2hpbGRQYXJ0IHtcbiAgLyoqXG4gICAqIFNldHMgdGhlIGNvbm5lY3Rpb24gc3RhdGUgZm9yIGBBc3luY0RpcmVjdGl2ZWBzIGNvbnRhaW5lZCB3aXRoaW4gdGhpcyByb290XG4gICAqIENoaWxkUGFydC5cbiAgICpcbiAgICogbGl0LWh0bWwgZG9lcyBub3QgYXV0b21hdGljYWxseSBtb25pdG9yIHRoZSBjb25uZWN0ZWRuZXNzIG9mIERPTSByZW5kZXJlZDtcbiAgICogYXMgc3VjaCwgaXQgaXMgdGhlIHJlc3BvbnNpYmlsaXR5IG9mIHRoZSBjYWxsZXIgdG8gYHJlbmRlcmAgdG8gZW5zdXJlIHRoYXRcbiAgICogYHBhcnQuc2V0Q29ubmVjdGVkKGZhbHNlKWAgaXMgY2FsbGVkIGJlZm9yZSB0aGUgcGFydCBvYmplY3QgaXMgcG90ZW50aWFsbHlcbiAgICogZGlzY2FyZGVkLCB0byBlbnN1cmUgdGhhdCBgQXN5bmNEaXJlY3RpdmVgcyBoYXZlIGEgY2hhbmNlIHRvIGRpc3Bvc2Ugb2ZcbiAgICogYW55IHJlc291cmNlcyBiZWluZyBoZWxkLiBJZiBhIGBSb290UGFydGAgdGhhdCB3YXMgcHJldmlvdXNseVxuICAgKiBkaXNjb25uZWN0ZWQgaXMgc3Vic2VxdWVudGx5IHJlLWNvbm5lY3RlZCAoYW5kIGl0cyBgQXN5bmNEaXJlY3RpdmVgcyBzaG91bGRcbiAgICogcmUtY29ubmVjdCksIGBzZXRDb25uZWN0ZWQodHJ1ZSlgIHNob3VsZCBiZSBjYWxsZWQuXG4gICAqXG4gICAqIEBwYXJhbSBpc0Nvbm5lY3RlZCBXaGV0aGVyIGRpcmVjdGl2ZXMgd2l0aGluIHRoaXMgdHJlZSBzaG91bGQgYmUgY29ubmVjdGVkXG4gICAqIG9yIG5vdFxuICAgKi9cbiAgc2V0Q29ubmVjdGVkKGlzQ29ubmVjdGVkOiBib29sZWFuKTogdm9pZDtcbn1cblxuZXhwb3J0IHR5cGUge0F0dHJpYnV0ZVBhcnR9O1xuY2xhc3MgQXR0cmlidXRlUGFydCBpbXBsZW1lbnRzIERpc2Nvbm5lY3RhYmxlIHtcbiAgcmVhZG9ubHkgdHlwZSA9IEFUVFJJQlVURV9QQVJUIGFzXG4gICAgfCB0eXBlb2YgQVRUUklCVVRFX1BBUlRcbiAgICB8IHR5cGVvZiBQUk9QRVJUWV9QQVJUXG4gICAgfCB0eXBlb2YgQk9PTEVBTl9BVFRSSUJVVEVfUEFSVFxuICAgIHwgdHlwZW9mIEVWRU5UX1BBUlQ7XG4gIHJlYWRvbmx5IGVsZW1lbnQ6IEhUTUxFbGVtZW50O1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIElmIHRoaXMgYXR0cmlidXRlIHBhcnQgcmVwcmVzZW50cyBhbiBpbnRlcnBvbGF0aW9uLCB0aGlzIGNvbnRhaW5zIHRoZVxuICAgKiBzdGF0aWMgc3RyaW5ncyBvZiB0aGUgaW50ZXJwb2xhdGlvbi4gRm9yIHNpbmdsZS12YWx1ZSwgY29tcGxldGUgYmluZGluZ3MsXG4gICAqIHRoaXMgaXMgdW5kZWZpbmVkLlxuICAgKi9cbiAgcmVhZG9ubHkgc3RyaW5ncz86IFJlYWRvbmx5QXJyYXk8c3RyaW5nPjtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGNvbW1pdHRlZFZhbHVlOiB1bmtub3duIHwgQXJyYXk8dW5rbm93bj4gPSBub3RoaW5nO1xuICAvKiogQGludGVybmFsICovXG4gIF9fZGlyZWN0aXZlcz86IEFycmF5PERpcmVjdGl2ZSB8IHVuZGVmaW5lZD47XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlO1xuICAvKiogQGludGVybmFsICovXG4gIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT4gPSB1bmRlZmluZWQ7XG5cbiAgcHJvdGVjdGVkIF9zYW5pdGl6ZXI6IFZhbHVlU2FuaXRpemVyIHwgdW5kZWZpbmVkO1xuXG4gIGdldCB0YWdOYW1lKCkge1xuICAgIHJldHVybiB0aGlzLmVsZW1lbnQudGFnTmFtZTtcbiAgfVxuXG4gIC8vIFNlZSBjb21tZW50IGluIERpc2Nvbm5lY3RhYmxlIGludGVyZmFjZSBmb3Igd2h5IHRoaXMgaXMgYSBnZXR0ZXJcbiAgZ2V0IF8kaXNDb25uZWN0ZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuXyRwYXJlbnQuXyRpc0Nvbm5lY3RlZDtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGVsZW1lbnQ6IEhUTUxFbGVtZW50LFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBzdHJpbmdzOiBSZWFkb25seUFycmF5PHN0cmluZz4sXG4gICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSxcbiAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkXG4gICkge1xuICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLl8kcGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgaWYgKHN0cmluZ3MubGVuZ3RoID4gMiB8fCBzdHJpbmdzWzBdICE9PSAnJyB8fCBzdHJpbmdzWzFdICE9PSAnJykge1xuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gbmV3IEFycmF5KHN0cmluZ3MubGVuZ3RoIC0gMSkuZmlsbChuZXcgU3RyaW5nKCkpO1xuICAgICAgdGhpcy5zdHJpbmdzID0gc3RyaW5ncztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fJGNvbW1pdHRlZFZhbHVlID0gbm90aGluZztcbiAgICB9XG4gICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgdGhpcy5fc2FuaXRpemVyID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiB0aGlzIHBhcnQgYnkgcmVzb2x2aW5nIHRoZSB2YWx1ZSBmcm9tIHBvc3NpYmx5IG11bHRpcGxlXG4gICAqIHZhbHVlcyBhbmQgc3RhdGljIHN0cmluZ3MgYW5kIGNvbW1pdHRpbmcgaXQgdG8gdGhlIERPTS5cbiAgICogSWYgdGhpcyBwYXJ0IGlzIHNpbmdsZS12YWx1ZWQsIGB0aGlzLl9zdHJpbmdzYCB3aWxsIGJlIHVuZGVmaW5lZCwgYW5kIHRoZVxuICAgKiBtZXRob2Qgd2lsbCBiZSBjYWxsZWQgd2l0aCBhIHNpbmdsZSB2YWx1ZSBhcmd1bWVudC4gSWYgdGhpcyBwYXJ0IGlzXG4gICAqIG11bHRpLXZhbHVlLCBgdGhpcy5fc3RyaW5nc2Agd2lsbCBiZSBkZWZpbmVkLCBhbmQgdGhlIG1ldGhvZCBpcyBjYWxsZWRcbiAgICogd2l0aCB0aGUgdmFsdWUgYXJyYXkgb2YgdGhlIHBhcnQncyBvd25pbmcgVGVtcGxhdGVJbnN0YW5jZSwgYW5kIGFuIG9mZnNldFxuICAgKiBpbnRvIHRoZSB2YWx1ZSBhcnJheSBmcm9tIHdoaWNoIHRoZSB2YWx1ZXMgc2hvdWxkIGJlIHJlYWQuXG4gICAqIFRoaXMgbWV0aG9kIGlzIG92ZXJsb2FkZWQgdGhpcyB3YXkgdG8gZWxpbWluYXRlIHNob3J0LWxpdmVkIGFycmF5IHNsaWNlc1xuICAgKiBvZiB0aGUgdGVtcGxhdGUgaW5zdGFuY2UgdmFsdWVzLCBhbmQgYWxsb3cgYSBmYXN0LXBhdGggZm9yIHNpbmdsZS12YWx1ZWRcbiAgICogcGFydHMuXG4gICAqXG4gICAqIEBwYXJhbSB2YWx1ZSBUaGUgcGFydCB2YWx1ZSwgb3IgYW4gYXJyYXkgb2YgdmFsdWVzIGZvciBtdWx0aS12YWx1ZWQgcGFydHNcbiAgICogQHBhcmFtIHZhbHVlSW5kZXggdGhlIGluZGV4IHRvIHN0YXJ0IHJlYWRpbmcgdmFsdWVzIGZyb20uIGB1bmRlZmluZWRgIGZvclxuICAgKiAgIHNpbmdsZS12YWx1ZWQgcGFydHNcbiAgICogQHBhcmFtIG5vQ29tbWl0IGNhdXNlcyB0aGUgcGFydCB0byBub3QgY29tbWl0IGl0cyB2YWx1ZSB0byB0aGUgRE9NLiBVc2VkXG4gICAqICAgaW4gaHlkcmF0aW9uIHRvIHByaW1lIGF0dHJpYnV0ZSBwYXJ0cyB3aXRoIHRoZWlyIGZpcnN0LXJlbmRlcmVkIHZhbHVlLFxuICAgKiAgIGJ1dCBub3Qgc2V0IHRoZSBhdHRyaWJ1dGUsIGFuZCBpbiBTU1IgdG8gbm8tb3AgdGhlIERPTSBvcGVyYXRpb24gYW5kXG4gICAqICAgY2FwdHVyZSB0aGUgdmFsdWUgZm9yIHNlcmlhbGl6YXRpb24uXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgXyRzZXRWYWx1ZShcbiAgICB2YWx1ZTogdW5rbm93biB8IEFycmF5PHVua25vd24+LFxuICAgIGRpcmVjdGl2ZVBhcmVudDogRGlyZWN0aXZlUGFyZW50ID0gdGhpcyxcbiAgICB2YWx1ZUluZGV4PzogbnVtYmVyLFxuICAgIG5vQ29tbWl0PzogYm9vbGVhblxuICApIHtcbiAgICBjb25zdCBzdHJpbmdzID0gdGhpcy5zdHJpbmdzO1xuXG4gICAgLy8gV2hldGhlciBhbnkgb2YgdGhlIHZhbHVlcyBoYXMgY2hhbmdlZCwgZm9yIGRpcnR5LWNoZWNraW5nXG4gICAgbGV0IGNoYW5nZSA9IGZhbHNlO1xuXG4gICAgaWYgKHN0cmluZ3MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gU2luZ2xlLXZhbHVlIGJpbmRpbmcgY2FzZVxuICAgICAgdmFsdWUgPSByZXNvbHZlRGlyZWN0aXZlKHRoaXMsIHZhbHVlLCBkaXJlY3RpdmVQYXJlbnQsIDApO1xuICAgICAgY2hhbmdlID1cbiAgICAgICAgIWlzUHJpbWl0aXZlKHZhbHVlKSB8fFxuICAgICAgICAodmFsdWUgIT09IHRoaXMuXyRjb21taXR0ZWRWYWx1ZSAmJiB2YWx1ZSAhPT0gbm9DaGFuZ2UpO1xuICAgICAgaWYgKGNoYW5nZSkge1xuICAgICAgICB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSW50ZXJwb2xhdGlvbiBjYXNlXG4gICAgICBjb25zdCB2YWx1ZXMgPSB2YWx1ZSBhcyBBcnJheTx1bmtub3duPjtcbiAgICAgIHZhbHVlID0gc3RyaW5nc1swXTtcblxuICAgICAgbGV0IGksIHY7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgc3RyaW5ncy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgdiA9IHJlc29sdmVEaXJlY3RpdmUodGhpcywgdmFsdWVzW3ZhbHVlSW5kZXghICsgaV0sIGRpcmVjdGl2ZVBhcmVudCwgaSk7XG5cbiAgICAgICAgaWYgKHYgPT09IG5vQ2hhbmdlKSB7XG4gICAgICAgICAgLy8gSWYgdGhlIHVzZXItcHJvdmlkZWQgdmFsdWUgaXMgYG5vQ2hhbmdlYCwgdXNlIHRoZSBwcmV2aW91cyB2YWx1ZVxuICAgICAgICAgIHYgPSAodGhpcy5fJGNvbW1pdHRlZFZhbHVlIGFzIEFycmF5PHVua25vd24+KVtpXTtcbiAgICAgICAgfVxuICAgICAgICBjaGFuZ2UgfHw9XG4gICAgICAgICAgIWlzUHJpbWl0aXZlKHYpIHx8IHYgIT09ICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgQXJyYXk8dW5rbm93bj4pW2ldO1xuICAgICAgICBpZiAodiA9PT0gbm90aGluZykge1xuICAgICAgICAgIHZhbHVlID0gbm90aGluZztcbiAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSAhPT0gbm90aGluZykge1xuICAgICAgICAgIHZhbHVlICs9ICh2ID8/ICcnKSArIHN0cmluZ3NbaSArIDFdO1xuICAgICAgICB9XG4gICAgICAgIC8vIFdlIGFsd2F5cyByZWNvcmQgZWFjaCB2YWx1ZSwgZXZlbiBpZiBvbmUgaXMgYG5vdGhpbmdgLCBmb3IgZnV0dXJlXG4gICAgICAgIC8vIGNoYW5nZSBkZXRlY3Rpb24uXG4gICAgICAgICh0aGlzLl8kY29tbWl0dGVkVmFsdWUgYXMgQXJyYXk8dW5rbm93bj4pW2ldID0gdjtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGNoYW5nZSAmJiAhbm9Db21taXQpIHtcbiAgICAgIHRoaXMuX2NvbW1pdFZhbHVlKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIF9jb21taXRWYWx1ZSh2YWx1ZTogdW5rbm93bikge1xuICAgIGlmICh2YWx1ZSA9PT0gbm90aGluZykge1xuICAgICAgKHdyYXAodGhpcy5lbGVtZW50KSBhcyBFbGVtZW50KS5yZW1vdmVBdHRyaWJ1dGUodGhpcy5uYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgICBpZiAodGhpcy5fc2FuaXRpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aGlzLl9zYW5pdGl6ZXIgPSBzYW5pdGl6ZXJGYWN0b3J5SW50ZXJuYWwoXG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQsXG4gICAgICAgICAgICB0aGlzLm5hbWUsXG4gICAgICAgICAgICAnYXR0cmlidXRlJ1xuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWUgPSB0aGlzLl9zYW5pdGl6ZXIodmFsdWUgPz8gJycpO1xuICAgICAgfVxuICAgICAgZGVidWdMb2dFdmVudD8uKHtcbiAgICAgICAga2luZDogJ2NvbW1pdCBhdHRyaWJ1dGUnLFxuICAgICAgICBlbGVtZW50OiB0aGlzLmVsZW1lbnQsXG4gICAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgICAgdmFsdWUsXG4gICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgIH0pO1xuICAgICAgKHdyYXAodGhpcy5lbGVtZW50KSBhcyBFbGVtZW50KS5zZXRBdHRyaWJ1dGUoXG4gICAgICAgIHRoaXMubmFtZSxcbiAgICAgICAgKHZhbHVlID8/ICcnKSBhcyBzdHJpbmdcbiAgICAgICk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCB0eXBlIHtQcm9wZXJ0eVBhcnR9O1xuY2xhc3MgUHJvcGVydHlQYXJ0IGV4dGVuZHMgQXR0cmlidXRlUGFydCB7XG4gIG92ZXJyaWRlIHJlYWRvbmx5IHR5cGUgPSBQUk9QRVJUWV9QQVJUO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgb3ZlcnJpZGUgX2NvbW1pdFZhbHVlKHZhbHVlOiB1bmtub3duKSB7XG4gICAgaWYgKEVOQUJMRV9FWFRSQV9TRUNVUklUWV9IT09LUykge1xuICAgICAgaWYgKHRoaXMuX3Nhbml0aXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX3Nhbml0aXplciA9IHNhbml0aXplckZhY3RvcnlJbnRlcm5hbChcbiAgICAgICAgICB0aGlzLmVsZW1lbnQsXG4gICAgICAgICAgdGhpcy5uYW1lLFxuICAgICAgICAgICdwcm9wZXJ0eSdcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHZhbHVlID0gdGhpcy5fc2FuaXRpemVyKHZhbHVlKTtcbiAgICB9XG4gICAgZGVidWdMb2dFdmVudD8uKHtcbiAgICAgIGtpbmQ6ICdjb21taXQgcHJvcGVydHknLFxuICAgICAgZWxlbWVudDogdGhpcy5lbGVtZW50LFxuICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgdmFsdWUsXG4gICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgfSk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAodGhpcy5lbGVtZW50IGFzIGFueSlbdGhpcy5uYW1lXSA9IHZhbHVlID09PSBub3RoaW5nID8gdW5kZWZpbmVkIDogdmFsdWU7XG4gIH1cbn1cblxuLy8gVGVtcG9yYXJ5IHdvcmthcm91bmQgZm9yIGh0dHBzOi8vY3JidWcuY29tLzk5MzI2OFxuLy8gQ3VycmVudGx5LCBhbnkgYXR0cmlidXRlIHN0YXJ0aW5nIHdpdGggXCJvblwiIGlzIGNvbnNpZGVyZWQgdG8gYmUgYVxuLy8gVHJ1c3RlZFNjcmlwdCBzb3VyY2UuIFN1Y2ggYm9vbGVhbiBhdHRyaWJ1dGVzIG11c3QgYmUgc2V0IHRvIHRoZSBlcXVpdmFsZW50XG4vLyB0cnVzdGVkIGVtcHR5U2NyaXB0IHZhbHVlLlxuY29uc3QgZW1wdHlTdHJpbmdGb3JCb29sZWFuQXR0cmlidXRlID0gdHJ1c3RlZFR5cGVzXG4gID8gKHRydXN0ZWRUeXBlcy5lbXB0eVNjcmlwdCBhcyB1bmtub3duIGFzICcnKVxuICA6ICcnO1xuXG5leHBvcnQgdHlwZSB7Qm9vbGVhbkF0dHJpYnV0ZVBhcnR9O1xuY2xhc3MgQm9vbGVhbkF0dHJpYnV0ZVBhcnQgZXh0ZW5kcyBBdHRyaWJ1dGVQYXJ0IHtcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgdHlwZSA9IEJPT0xFQU5fQVRUUklCVVRFX1BBUlQ7XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBvdmVycmlkZSBfY29tbWl0VmFsdWUodmFsdWU6IHVua25vd24pIHtcbiAgICBkZWJ1Z0xvZ0V2ZW50Py4oe1xuICAgICAga2luZDogJ2NvbW1pdCBib29sZWFuIGF0dHJpYnV0ZScsXG4gICAgICBlbGVtZW50OiB0aGlzLmVsZW1lbnQsXG4gICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICB2YWx1ZTogISEodmFsdWUgJiYgdmFsdWUgIT09IG5vdGhpbmcpLFxuICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgIH0pO1xuICAgIGlmICh2YWx1ZSAmJiB2YWx1ZSAhPT0gbm90aGluZykge1xuICAgICAgKHdyYXAodGhpcy5lbGVtZW50KSBhcyBFbGVtZW50KS5zZXRBdHRyaWJ1dGUoXG4gICAgICAgIHRoaXMubmFtZSxcbiAgICAgICAgZW1wdHlTdHJpbmdGb3JCb29sZWFuQXR0cmlidXRlXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAod3JhcCh0aGlzLmVsZW1lbnQpIGFzIEVsZW1lbnQpLnJlbW92ZUF0dHJpYnV0ZSh0aGlzLm5hbWUpO1xuICAgIH1cbiAgfVxufVxuXG50eXBlIEV2ZW50TGlzdGVuZXJXaXRoT3B0aW9ucyA9IEV2ZW50TGlzdGVuZXJPckV2ZW50TGlzdGVuZXJPYmplY3QgJlxuICBQYXJ0aWFsPEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zPjtcblxuLyoqXG4gKiBBbiBBdHRyaWJ1dGVQYXJ0IHRoYXQgbWFuYWdlcyBhbiBldmVudCBsaXN0ZW5lciB2aWEgYWRkL3JlbW92ZUV2ZW50TGlzdGVuZXIuXG4gKlxuICogVGhpcyBwYXJ0IHdvcmtzIGJ5IGFkZGluZyBpdHNlbGYgYXMgdGhlIGV2ZW50IGxpc3RlbmVyIG9uIGFuIGVsZW1lbnQsIHRoZW5cbiAqIGRlbGVnYXRpbmcgdG8gdGhlIHZhbHVlIHBhc3NlZCB0byBpdC4gVGhpcyByZWR1Y2VzIHRoZSBudW1iZXIgb2YgY2FsbHMgdG9cbiAqIGFkZC9yZW1vdmVFdmVudExpc3RlbmVyIGlmIHRoZSBsaXN0ZW5lciBjaGFuZ2VzIGZyZXF1ZW50bHksIHN1Y2ggYXMgd2hlbiBhblxuICogaW5saW5lIGZ1bmN0aW9uIGlzIHVzZWQgYXMgYSBsaXN0ZW5lci5cbiAqXG4gKiBCZWNhdXNlIGV2ZW50IG9wdGlvbnMgYXJlIHBhc3NlZCB3aGVuIGFkZGluZyBsaXN0ZW5lcnMsIHdlIG11c3QgdGFrZSBjYXNlXG4gKiB0byBhZGQgYW5kIHJlbW92ZSB0aGUgcGFydCBhcyBhIGxpc3RlbmVyIHdoZW4gdGhlIGV2ZW50IG9wdGlvbnMgY2hhbmdlLlxuICovXG5leHBvcnQgdHlwZSB7RXZlbnRQYXJ0fTtcbmNsYXNzIEV2ZW50UGFydCBleHRlbmRzIEF0dHJpYnV0ZVBhcnQge1xuICBvdmVycmlkZSByZWFkb25seSB0eXBlID0gRVZFTlRfUEFSVDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBlbGVtZW50OiBIVE1MRWxlbWVudCxcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgc3RyaW5nczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LFxuICAgIHBhcmVudDogRGlzY29ubmVjdGFibGUsXG4gICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyB8IHVuZGVmaW5lZFxuICApIHtcbiAgICBzdXBlcihlbGVtZW50LCBuYW1lLCBzdHJpbmdzLCBwYXJlbnQsIG9wdGlvbnMpO1xuXG4gICAgaWYgKERFVl9NT0RFICYmIHRoaXMuc3RyaW5ncyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBBIFxcYDwke2VsZW1lbnQubG9jYWxOYW1lfT5cXGAgaGFzIGEgXFxgQCR7bmFtZX09Li4uXFxgIGxpc3RlbmVyIHdpdGggYCArXG4gICAgICAgICAgJ2ludmFsaWQgY29udGVudC4gRXZlbnQgbGlzdGVuZXJzIGluIHRlbXBsYXRlcyBtdXN0IGhhdmUgZXhhY3RseSAnICtcbiAgICAgICAgICAnb25lIGV4cHJlc3Npb24gYW5kIG5vIHN1cnJvdW5kaW5nIHRleHQuJ1xuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICAvLyBFdmVudFBhcnQgZG9lcyBub3QgdXNlIHRoZSBiYXNlIF8kc2V0VmFsdWUvX3Jlc29sdmVWYWx1ZSBpbXBsZW1lbnRhdGlvblxuICAvLyBzaW5jZSB0aGUgZGlydHkgY2hlY2tpbmcgaXMgbW9yZSBjb21wbGV4XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgb3ZlcnJpZGUgXyRzZXRWYWx1ZShcbiAgICBuZXdMaXN0ZW5lcjogdW5rbm93bixcbiAgICBkaXJlY3RpdmVQYXJlbnQ6IERpcmVjdGl2ZVBhcmVudCA9IHRoaXNcbiAgKSB7XG4gICAgbmV3TGlzdGVuZXIgPVxuICAgICAgcmVzb2x2ZURpcmVjdGl2ZSh0aGlzLCBuZXdMaXN0ZW5lciwgZGlyZWN0aXZlUGFyZW50LCAwKSA/PyBub3RoaW5nO1xuICAgIGlmIChuZXdMaXN0ZW5lciA9PT0gbm9DaGFuZ2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgb2xkTGlzdGVuZXIgPSB0aGlzLl8kY29tbWl0dGVkVmFsdWU7XG5cbiAgICAvLyBJZiB0aGUgbmV3IHZhbHVlIGlzIG5vdGhpbmcgb3IgYW55IG9wdGlvbnMgY2hhbmdlIHdlIGhhdmUgdG8gcmVtb3ZlIHRoZVxuICAgIC8vIHBhcnQgYXMgYSBsaXN0ZW5lci5cbiAgICBjb25zdCBzaG91bGRSZW1vdmVMaXN0ZW5lciA9XG4gICAgICAobmV3TGlzdGVuZXIgPT09IG5vdGhpbmcgJiYgb2xkTGlzdGVuZXIgIT09IG5vdGhpbmcpIHx8XG4gICAgICAobmV3TGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5jYXB0dXJlICE9PVxuICAgICAgICAob2xkTGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5jYXB0dXJlIHx8XG4gICAgICAobmV3TGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5vbmNlICE9PVxuICAgICAgICAob2xkTGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5vbmNlIHx8XG4gICAgICAobmV3TGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5wYXNzaXZlICE9PVxuICAgICAgICAob2xkTGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zKS5wYXNzaXZlO1xuXG4gICAgLy8gSWYgdGhlIG5ldyB2YWx1ZSBpcyBub3Qgbm90aGluZyBhbmQgd2UgcmVtb3ZlZCB0aGUgbGlzdGVuZXIsIHdlIGhhdmVcbiAgICAvLyB0byBhZGQgdGhlIHBhcnQgYXMgYSBsaXN0ZW5lci5cbiAgICBjb25zdCBzaG91bGRBZGRMaXN0ZW5lciA9XG4gICAgICBuZXdMaXN0ZW5lciAhPT0gbm90aGluZyAmJlxuICAgICAgKG9sZExpc3RlbmVyID09PSBub3RoaW5nIHx8IHNob3VsZFJlbW92ZUxpc3RlbmVyKTtcblxuICAgIGRlYnVnTG9nRXZlbnQ/Lih7XG4gICAgICBraW5kOiAnY29tbWl0IGV2ZW50IGxpc3RlbmVyJyxcbiAgICAgIGVsZW1lbnQ6IHRoaXMuZWxlbWVudCxcbiAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgIHZhbHVlOiBuZXdMaXN0ZW5lcixcbiAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgIHJlbW92ZUxpc3RlbmVyOiBzaG91bGRSZW1vdmVMaXN0ZW5lcixcbiAgICAgIGFkZExpc3RlbmVyOiBzaG91bGRBZGRMaXN0ZW5lcixcbiAgICAgIG9sZExpc3RlbmVyLFxuICAgIH0pO1xuICAgIGlmIChzaG91bGRSZW1vdmVMaXN0ZW5lcikge1xuICAgICAgdGhpcy5lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXG4gICAgICAgIHRoaXMubmFtZSxcbiAgICAgICAgdGhpcyxcbiAgICAgICAgb2xkTGlzdGVuZXIgYXMgRXZlbnRMaXN0ZW5lcldpdGhPcHRpb25zXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAoc2hvdWxkQWRkTGlzdGVuZXIpIHtcbiAgICAgIC8vIEJld2FyZTogSUUxMSBhbmQgQ2hyb21lIDQxIGRvbid0IGxpa2UgdXNpbmcgdGhlIGxpc3RlbmVyIGFzIHRoZVxuICAgICAgLy8gb3B0aW9ucyBvYmplY3QuIEZpZ3VyZSBvdXQgaG93IHRvIGRlYWwgdy8gdGhpcyBpbiBJRTExIC0gbWF5YmVcbiAgICAgIC8vIHBhdGNoIGFkZEV2ZW50TGlzdGVuZXI/XG4gICAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgICAgdGhpcy5uYW1lLFxuICAgICAgICB0aGlzLFxuICAgICAgICBuZXdMaXN0ZW5lciBhcyBFdmVudExpc3RlbmVyV2l0aE9wdGlvbnNcbiAgICAgICk7XG4gICAgfVxuICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZSA9IG5ld0xpc3RlbmVyO1xuICB9XG5cbiAgaGFuZGxlRXZlbnQoZXZlbnQ6IEV2ZW50KSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLl8kY29tbWl0dGVkVmFsdWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuXyRjb21taXR0ZWRWYWx1ZS5jYWxsKHRoaXMub3B0aW9ucz8uaG9zdCA/PyB0aGlzLmVsZW1lbnQsIGV2ZW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgKHRoaXMuXyRjb21taXR0ZWRWYWx1ZSBhcyBFdmVudExpc3RlbmVyT2JqZWN0KS5oYW5kbGVFdmVudChldmVudCk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCB0eXBlIHtFbGVtZW50UGFydH07XG5jbGFzcyBFbGVtZW50UGFydCBpbXBsZW1lbnRzIERpc2Nvbm5lY3RhYmxlIHtcbiAgcmVhZG9ubHkgdHlwZSA9IEVMRU1FTlRfUEFSVDtcblxuICAvKiogQGludGVybmFsICovXG4gIF9fZGlyZWN0aXZlPzogRGlyZWN0aXZlO1xuXG4gIC8vIFRoaXMgaXMgdG8gZW5zdXJlIHRoYXQgZXZlcnkgUGFydCBoYXMgYSBfJGNvbW1pdHRlZFZhbHVlXG4gIF8kY29tbWl0dGVkVmFsdWU6IHVuZGVmaW5lZDtcblxuICAvKiogQGludGVybmFsICovXG4gIF8kcGFyZW50ITogRGlzY29ubmVjdGFibGU7XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4/OiBTZXQ8RGlzY29ubmVjdGFibGU+ID0gdW5kZWZpbmVkO1xuXG4gIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMgfCB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIGVsZW1lbnQ6IEVsZW1lbnQsXG4gICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSxcbiAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zIHwgdW5kZWZpbmVkXG4gICkge1xuICAgIHRoaXMuXyRwYXJlbnQgPSBwYXJlbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgfVxuXG4gIC8vIFNlZSBjb21tZW50IGluIERpc2Nvbm5lY3RhYmxlIGludGVyZmFjZSBmb3Igd2h5IHRoaXMgaXMgYSBnZXR0ZXJcbiAgZ2V0IF8kaXNDb25uZWN0ZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuXyRwYXJlbnQuXyRpc0Nvbm5lY3RlZDtcbiAgfVxuXG4gIF8kc2V0VmFsdWUodmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICBkZWJ1Z0xvZ0V2ZW50Py4oe1xuICAgICAga2luZDogJ2NvbW1pdCB0byBlbGVtZW50IGJpbmRpbmcnLFxuICAgICAgZWxlbWVudDogdGhpcy5lbGVtZW50LFxuICAgICAgdmFsdWUsXG4gICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgfSk7XG4gICAgcmVzb2x2ZURpcmVjdGl2ZSh0aGlzLCB2YWx1ZSk7XG4gIH1cbn1cblxuLyoqXG4gKiBFTkQgVVNFUlMgU0hPVUxEIE5PVCBSRUxZIE9OIFRISVMgT0JKRUNULlxuICpcbiAqIFByaXZhdGUgZXhwb3J0cyBmb3IgdXNlIGJ5IG90aGVyIExpdCBwYWNrYWdlcywgbm90IGludGVuZGVkIGZvciB1c2UgYnlcbiAqIGV4dGVybmFsIHVzZXJzLlxuICpcbiAqIFdlIGN1cnJlbnRseSBkbyBub3QgbWFrZSBhIG1hbmdsZWQgcm9sbHVwIGJ1aWxkIG9mIHRoZSBsaXQtc3NyIGNvZGUuIEluIG9yZGVyXG4gKiB0byBrZWVwIGEgbnVtYmVyIG9mIChvdGhlcndpc2UgcHJpdmF0ZSkgdG9wLWxldmVsIGV4cG9ydHMgIG1hbmdsZWQgaW4gdGhlXG4gKiBjbGllbnQgc2lkZSBjb2RlLCB3ZSBleHBvcnQgYSBfJExIIG9iamVjdCBjb250YWluaW5nIHRob3NlIG1lbWJlcnMgKG9yXG4gKiBoZWxwZXIgbWV0aG9kcyBmb3IgYWNjZXNzaW5nIHByaXZhdGUgZmllbGRzIG9mIHRob3NlIG1lbWJlcnMpLCBhbmQgdGhlblxuICogcmUtZXhwb3J0IHRoZW0gZm9yIHVzZSBpbiBsaXQtc3NyLiBUaGlzIGtlZXBzIGxpdC1zc3IgYWdub3N0aWMgdG8gd2hldGhlciB0aGVcbiAqIGNsaWVudC1zaWRlIGNvZGUgaXMgYmVpbmcgdXNlZCBpbiBgZGV2YCBtb2RlIG9yIGBwcm9kYCBtb2RlLlxuICpcbiAqIFRoaXMgaGFzIGEgdW5pcXVlIG5hbWUsIHRvIGRpc2FtYmlndWF0ZSBpdCBmcm9tIHByaXZhdGUgZXhwb3J0cyBpblxuICogbGl0LWVsZW1lbnQsIHdoaWNoIHJlLWV4cG9ydHMgYWxsIG9mIGxpdC1odG1sLlxuICpcbiAqIEBwcml2YXRlXG4gKi9cbmV4cG9ydCBjb25zdCBfJExIID0ge1xuICAvLyBVc2VkIGluIGxpdC1zc3JcbiAgX2JvdW5kQXR0cmlidXRlU3VmZml4OiBib3VuZEF0dHJpYnV0ZVN1ZmZpeCxcbiAgX21hcmtlcjogbWFya2VyLFxuICBfbWFya2VyTWF0Y2g6IG1hcmtlck1hdGNoLFxuICBfSFRNTF9SRVNVTFQ6IEhUTUxfUkVTVUxULFxuICBfZ2V0VGVtcGxhdGVIdG1sOiBnZXRUZW1wbGF0ZUh0bWwsXG4gIC8vIFVzZWQgaW4gdGVzdHMgYW5kIHByaXZhdGUtc3NyLXN1cHBvcnRcbiAgX1RlbXBsYXRlSW5zdGFuY2U6IFRlbXBsYXRlSW5zdGFuY2UsXG4gIF9pc0l0ZXJhYmxlOiBpc0l0ZXJhYmxlLFxuICBfcmVzb2x2ZURpcmVjdGl2ZTogcmVzb2x2ZURpcmVjdGl2ZSxcbiAgX0NoaWxkUGFydDogQ2hpbGRQYXJ0LFxuICBfQXR0cmlidXRlUGFydDogQXR0cmlidXRlUGFydCxcbiAgX0Jvb2xlYW5BdHRyaWJ1dGVQYXJ0OiBCb29sZWFuQXR0cmlidXRlUGFydCxcbiAgX0V2ZW50UGFydDogRXZlbnRQYXJ0LFxuICBfUHJvcGVydHlQYXJ0OiBQcm9wZXJ0eVBhcnQsXG4gIF9FbGVtZW50UGFydDogRWxlbWVudFBhcnQsXG59O1xuXG4vLyBBcHBseSBwb2x5ZmlsbHMgaWYgYXZhaWxhYmxlXG5jb25zdCBwb2x5ZmlsbFN1cHBvcnQgPSBERVZfTU9ERVxuICA/IGdsb2JhbC5saXRIdG1sUG9seWZpbGxTdXBwb3J0RGV2TW9kZVxuICA6IGdsb2JhbC5saXRIdG1sUG9seWZpbGxTdXBwb3J0O1xucG9seWZpbGxTdXBwb3J0Py4oVGVtcGxhdGUsIENoaWxkUGFydCk7XG5cbi8vIElNUE9SVEFOVDogZG8gbm90IGNoYW5nZSB0aGUgcHJvcGVydHkgbmFtZSBvciB0aGUgYXNzaWdubWVudCBleHByZXNzaW9uLlxuLy8gVGhpcyBsaW5lIHdpbGwgYmUgdXNlZCBpbiByZWdleGVzIHRvIHNlYXJjaCBmb3IgbGl0LWh0bWwgdXNhZ2UuXG4oZ2xvYmFsLmxpdEh0bWxWZXJzaW9ucyA/Pz0gW10pLnB1c2goJzIuNy40Jyk7XG5pZiAoREVWX01PREUgJiYgZ2xvYmFsLmxpdEh0bWxWZXJzaW9ucy5sZW5ndGggPiAxKSB7XG4gIGlzc3VlV2FybmluZyEoXG4gICAgJ211bHRpcGxlLXZlcnNpb25zJyxcbiAgICBgTXVsdGlwbGUgdmVyc2lvbnMgb2YgTGl0IGxvYWRlZC4gYCArXG4gICAgICBgTG9hZGluZyBtdWx0aXBsZSB2ZXJzaW9ucyBpcyBub3QgcmVjb21tZW5kZWQuYFxuICApO1xufVxuXG4vKipcbiAqIFJlbmRlcnMgYSB2YWx1ZSwgdXN1YWxseSBhIGxpdC1odG1sIFRlbXBsYXRlUmVzdWx0LCB0byB0aGUgY29udGFpbmVyLlxuICpcbiAqIFRoaXMgZXhhbXBsZSByZW5kZXJzIHRoZSB0ZXh0IFwiSGVsbG8sIFpvZSFcIiBpbnNpZGUgYSBwYXJhZ3JhcGggdGFnLCBhcHBlbmRpbmdcbiAqIGl0IHRvIHRoZSBjb250YWluZXIgYGRvY3VtZW50LmJvZHlgLlxuICpcbiAqIGBgYGpzXG4gKiBpbXBvcnQge2h0bWwsIHJlbmRlcn0gZnJvbSAnbGl0JztcbiAqXG4gKiBjb25zdCBuYW1lID0gXCJab2VcIjtcbiAqIHJlbmRlcihodG1sYDxwPkhlbGxvLCAke25hbWV9ITwvcD5gLCBkb2N1bWVudC5ib2R5KTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB2YWx1ZSBBbnkgW3JlbmRlcmFibGVcbiAqICAgdmFsdWVdKGh0dHBzOi8vbGl0LmRldi9kb2NzL3RlbXBsYXRlcy9leHByZXNzaW9ucy8jY2hpbGQtZXhwcmVzc2lvbnMpLFxuICogICB0eXBpY2FsbHkgYSB7QGxpbmtjb2RlIFRlbXBsYXRlUmVzdWx0fSBjcmVhdGVkIGJ5IGV2YWx1YXRpbmcgYSB0ZW1wbGF0ZSB0YWdcbiAqICAgbGlrZSB7QGxpbmtjb2RlIGh0bWx9IG9yIHtAbGlua2NvZGUgc3ZnfS5cbiAqIEBwYXJhbSBjb250YWluZXIgQSBET00gY29udGFpbmVyIHRvIHJlbmRlciB0by4gVGhlIGZpcnN0IHJlbmRlciB3aWxsIGFwcGVuZFxuICogICB0aGUgcmVuZGVyZWQgdmFsdWUgdG8gdGhlIGNvbnRhaW5lciwgYW5kIHN1YnNlcXVlbnQgcmVuZGVycyB3aWxsXG4gKiAgIGVmZmljaWVudGx5IHVwZGF0ZSB0aGUgcmVuZGVyZWQgdmFsdWUgaWYgdGhlIHNhbWUgcmVzdWx0IHR5cGUgd2FzXG4gKiAgIHByZXZpb3VzbHkgcmVuZGVyZWQgdGhlcmUuXG4gKiBAcGFyYW0gb3B0aW9ucyBTZWUge0BsaW5rY29kZSBSZW5kZXJPcHRpb25zfSBmb3Igb3B0aW9ucyBkb2N1bWVudGF0aW9uLlxuICogQHNlZVxuICoge0BsaW5rIGh0dHBzOi8vbGl0LmRldi9kb2NzL2xpYnJhcmllcy9zdGFuZGFsb25lLXRlbXBsYXRlcy8jcmVuZGVyaW5nLWxpdC1odG1sLXRlbXBsYXRlc3wgUmVuZGVyaW5nIExpdCBIVE1MIFRlbXBsYXRlc31cbiAqL1xuZXhwb3J0IGNvbnN0IHJlbmRlciA9IChcbiAgdmFsdWU6IHVua25vd24sXG4gIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCBEb2N1bWVudEZyYWdtZW50LFxuICBvcHRpb25zPzogUmVuZGVyT3B0aW9uc1xuKTogUm9vdFBhcnQgPT4ge1xuICBpZiAoREVWX01PREUgJiYgY29udGFpbmVyID09IG51bGwpIHtcbiAgICAvLyBHaXZlIGEgY2xlYXJlciBlcnJvciBtZXNzYWdlIHRoYW5cbiAgICAvLyAgICAgVW5jYXVnaHQgVHlwZUVycm9yOiBDYW5ub3QgcmVhZCBwcm9wZXJ0aWVzIG9mIG51bGwgKHJlYWRpbmdcbiAgICAvLyAgICAgJ18kbGl0UGFydCQnKVxuICAgIC8vIHdoaWNoIHJlYWRzIGxpa2UgYW4gaW50ZXJuYWwgTGl0IGVycm9yLlxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFRoZSBjb250YWluZXIgdG8gcmVuZGVyIGludG8gbWF5IG5vdCBiZSAke2NvbnRhaW5lcn1gKTtcbiAgfVxuICBjb25zdCByZW5kZXJJZCA9IERFVl9NT0RFID8gZGVidWdMb2dSZW5kZXJJZCsrIDogMDtcbiAgY29uc3QgcGFydE93bmVyTm9kZSA9IG9wdGlvbnM/LnJlbmRlckJlZm9yZSA/PyBjb250YWluZXI7XG4gIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gIGxldCBwYXJ0OiBDaGlsZFBhcnQgPSAocGFydE93bmVyTm9kZSBhcyBhbnkpWydfJGxpdFBhcnQkJ107XG4gIGRlYnVnTG9nRXZlbnQ/Lih7XG4gICAga2luZDogJ2JlZ2luIHJlbmRlcicsXG4gICAgaWQ6IHJlbmRlcklkLFxuICAgIHZhbHVlLFxuICAgIGNvbnRhaW5lcixcbiAgICBvcHRpb25zLFxuICAgIHBhcnQsXG4gIH0pO1xuICBpZiAocGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgZW5kTm9kZSA9IG9wdGlvbnM/LnJlbmRlckJlZm9yZSA/PyBudWxsO1xuICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAocGFydE93bmVyTm9kZSBhcyBhbnkpWydfJGxpdFBhcnQkJ10gPSBwYXJ0ID0gbmV3IENoaWxkUGFydChcbiAgICAgIGNvbnRhaW5lci5pbnNlcnRCZWZvcmUoY3JlYXRlTWFya2VyKCksIGVuZE5vZGUpLFxuICAgICAgZW5kTm9kZSxcbiAgICAgIHVuZGVmaW5lZCxcbiAgICAgIG9wdGlvbnMgPz8ge31cbiAgICApO1xuICB9XG4gIHBhcnQuXyRzZXRWYWx1ZSh2YWx1ZSk7XG4gIGRlYnVnTG9nRXZlbnQ/Lih7XG4gICAga2luZDogJ2VuZCByZW5kZXInLFxuICAgIGlkOiByZW5kZXJJZCxcbiAgICB2YWx1ZSxcbiAgICBjb250YWluZXIsXG4gICAgb3B0aW9ucyxcbiAgICBwYXJ0LFxuICB9KTtcbiAgcmV0dXJuIHBhcnQgYXMgUm9vdFBhcnQ7XG59O1xuXG5pZiAoRU5BQkxFX0VYVFJBX1NFQ1VSSVRZX0hPT0tTKSB7XG4gIHJlbmRlci5zZXRTYW5pdGl6ZXIgPSBzZXRTYW5pdGl6ZXI7XG4gIHJlbmRlci5jcmVhdGVTYW5pdGl6ZXIgPSBjcmVhdGVTYW5pdGl6ZXI7XG4gIGlmIChERVZfTU9ERSkge1xuICAgIHJlbmRlci5fdGVzdE9ubHlDbGVhclNhbml0aXplckZhY3RvcnlEb05vdENhbGxPckVsc2UgPVxuICAgICAgX3Rlc3RPbmx5Q2xlYXJTYW5pdGl6ZXJGYWN0b3J5RG9Ob3RDYWxsT3JFbHNlO1xuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtEaXNjb25uZWN0YWJsZSwgUGFydH0gZnJvbSAnLi9saXQtaHRtbC5qcyc7XG5cbmV4cG9ydCB7XG4gIEF0dHJpYnV0ZVBhcnQsXG4gIEJvb2xlYW5BdHRyaWJ1dGVQYXJ0LFxuICBDaGlsZFBhcnQsXG4gIEVsZW1lbnRQYXJ0LFxuICBFdmVudFBhcnQsXG4gIFBhcnQsXG4gIFByb3BlcnR5UGFydCxcbn0gZnJvbSAnLi9saXQtaHRtbC5qcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGlyZWN0aXZlQ2xhc3Mge1xuICBuZXcgKHBhcnQ6IFBhcnRJbmZvKTogRGlyZWN0aXZlO1xufVxuXG4vKipcbiAqIFRoaXMgdXRpbGl0eSB0eXBlIGV4dHJhY3RzIHRoZSBzaWduYXR1cmUgb2YgYSBkaXJlY3RpdmUgY2xhc3MncyByZW5kZXIoKVxuICogbWV0aG9kIHNvIHdlIGNhbiB1c2UgaXQgZm9yIHRoZSB0eXBlIG9mIHRoZSBnZW5lcmF0ZWQgZGlyZWN0aXZlIGZ1bmN0aW9uLlxuICovXG5leHBvcnQgdHlwZSBEaXJlY3RpdmVQYXJhbWV0ZXJzPEMgZXh0ZW5kcyBEaXJlY3RpdmU+ID0gUGFyYW1ldGVyczxDWydyZW5kZXInXT47XG5cbi8qKlxuICogQSBnZW5lcmF0ZWQgZGlyZWN0aXZlIGZ1bmN0aW9uIGRvZXNuJ3QgZXZhbHVhdGUgdGhlIGRpcmVjdGl2ZSwgYnV0IGp1c3RcbiAqIHJldHVybnMgYSBEaXJlY3RpdmVSZXN1bHQgb2JqZWN0IHRoYXQgY2FwdHVyZXMgdGhlIGFyZ3VtZW50cy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEaXJlY3RpdmVSZXN1bHQ8QyBleHRlbmRzIERpcmVjdGl2ZUNsYXNzID0gRGlyZWN0aXZlQ2xhc3M+IHtcbiAgLyoqXG4gICAqIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAqIEBpbnRlcm5hbCAqL1xuICBbJ18kbGl0RGlyZWN0aXZlJCddOiBDO1xuICAvKiogQGludGVybmFsICovXG4gIHZhbHVlczogRGlyZWN0aXZlUGFyYW1ldGVyczxJbnN0YW5jZVR5cGU8Qz4+O1xufVxuXG5leHBvcnQgY29uc3QgUGFydFR5cGUgPSB7XG4gIEFUVFJJQlVURTogMSxcbiAgQ0hJTEQ6IDIsXG4gIFBST1BFUlRZOiAzLFxuICBCT09MRUFOX0FUVFJJQlVURTogNCxcbiAgRVZFTlQ6IDUsXG4gIEVMRU1FTlQ6IDYsXG59IGFzIGNvbnN0O1xuXG5leHBvcnQgdHlwZSBQYXJ0VHlwZSA9ICh0eXBlb2YgUGFydFR5cGUpW2tleW9mIHR5cGVvZiBQYXJ0VHlwZV07XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2hpbGRQYXJ0SW5mbyB7XG4gIHJlYWRvbmx5IHR5cGU6IHR5cGVvZiBQYXJ0VHlwZS5DSElMRDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBdHRyaWJ1dGVQYXJ0SW5mbyB7XG4gIHJlYWRvbmx5IHR5cGU6XG4gICAgfCB0eXBlb2YgUGFydFR5cGUuQVRUUklCVVRFXG4gICAgfCB0eXBlb2YgUGFydFR5cGUuUFJPUEVSVFlcbiAgICB8IHR5cGVvZiBQYXJ0VHlwZS5CT09MRUFOX0FUVFJJQlVURVxuICAgIHwgdHlwZW9mIFBhcnRUeXBlLkVWRU5UO1xuICByZWFkb25seSBzdHJpbmdzPzogUmVhZG9ubHlBcnJheTxzdHJpbmc+O1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IHRhZ05hbWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFbGVtZW50UGFydEluZm8ge1xuICByZWFkb25seSB0eXBlOiB0eXBlb2YgUGFydFR5cGUuRUxFTUVOVDtcbn1cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgcGFydCBhIGRpcmVjdGl2ZSBpcyBib3VuZCB0by5cbiAqXG4gKiBUaGlzIGlzIHVzZWZ1bCBmb3IgY2hlY2tpbmcgdGhhdCBhIGRpcmVjdGl2ZSBpcyBhdHRhY2hlZCB0byBhIHZhbGlkIHBhcnQsXG4gKiBzdWNoIGFzIHdpdGggZGlyZWN0aXZlIHRoYXQgY2FuIG9ubHkgYmUgdXNlZCBvbiBhdHRyaWJ1dGUgYmluZGluZ3MuXG4gKi9cbmV4cG9ydCB0eXBlIFBhcnRJbmZvID0gQ2hpbGRQYXJ0SW5mbyB8IEF0dHJpYnV0ZVBhcnRJbmZvIHwgRWxlbWVudFBhcnRJbmZvO1xuXG4vKipcbiAqIENyZWF0ZXMgYSB1c2VyLWZhY2luZyBkaXJlY3RpdmUgZnVuY3Rpb24gZnJvbSBhIERpcmVjdGl2ZSBjbGFzcy4gVGhpc1xuICogZnVuY3Rpb24gaGFzIHRoZSBzYW1lIHBhcmFtZXRlcnMgYXMgdGhlIGRpcmVjdGl2ZSdzIHJlbmRlcigpIG1ldGhvZC5cbiAqL1xuZXhwb3J0IGNvbnN0IGRpcmVjdGl2ZSA9XG4gIDxDIGV4dGVuZHMgRGlyZWN0aXZlQ2xhc3M+KGM6IEMpID0+XG4gICguLi52YWx1ZXM6IERpcmVjdGl2ZVBhcmFtZXRlcnM8SW5zdGFuY2VUeXBlPEM+Pik6IERpcmVjdGl2ZVJlc3VsdDxDPiA9PiAoe1xuICAgIC8vIFRoaXMgcHJvcGVydHkgbmVlZHMgdG8gcmVtYWluIHVubWluaWZpZWQuXG4gICAgWydfJGxpdERpcmVjdGl2ZSQnXTogYyxcbiAgICB2YWx1ZXMsXG4gIH0pO1xuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIGNyZWF0aW5nIGN1c3RvbSBkaXJlY3RpdmVzLiBVc2VycyBzaG91bGQgZXh0ZW5kIHRoaXMgY2xhc3MsXG4gKiBpbXBsZW1lbnQgYHJlbmRlcmAgYW5kL29yIGB1cGRhdGVgLCBhbmQgdGhlbiBwYXNzIHRoZWlyIHN1YmNsYXNzIHRvXG4gKiBgZGlyZWN0aXZlYC5cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIERpcmVjdGl2ZSBpbXBsZW1lbnRzIERpc2Nvbm5lY3RhYmxlIHtcbiAgLy9AaW50ZXJuYWxcbiAgX19wYXJ0ITogUGFydDtcbiAgLy9AaW50ZXJuYWxcbiAgX19hdHRyaWJ1dGVJbmRleDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICAvL0BpbnRlcm5hbFxuICBfX2RpcmVjdGl2ZT86IERpcmVjdGl2ZTtcblxuICAvL0BpbnRlcm5hbFxuICBfJHBhcmVudCE6IERpc2Nvbm5lY3RhYmxlO1xuXG4gIC8vIFRoZXNlIHdpbGwgb25seSBleGlzdCBvbiB0aGUgQXN5bmNEaXJlY3RpdmUgc3ViY2xhc3NcbiAgLy9AaW50ZXJuYWxcbiAgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuPzogU2V0PERpc2Nvbm5lY3RhYmxlPjtcbiAgLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgLy9AaW50ZXJuYWxcbiAgWydfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkJ10/KGlzQ29ubmVjdGVkOiBib29sZWFuKTogdm9pZDtcblxuICBjb25zdHJ1Y3RvcihfcGFydEluZm86IFBhcnRJbmZvKSB7fVxuXG4gIC8vIFNlZSBjb21tZW50IGluIERpc2Nvbm5lY3RhYmxlIGludGVyZmFjZSBmb3Igd2h5IHRoaXMgaXMgYSBnZXR0ZXJcbiAgZ2V0IF8kaXNDb25uZWN0ZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuXyRwYXJlbnQuXyRpc0Nvbm5lY3RlZDtcbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRpbml0aWFsaXplKFxuICAgIHBhcnQ6IFBhcnQsXG4gICAgcGFyZW50OiBEaXNjb25uZWN0YWJsZSxcbiAgICBhdHRyaWJ1dGVJbmRleDogbnVtYmVyIHwgdW5kZWZpbmVkXG4gICkge1xuICAgIHRoaXMuX19wYXJ0ID0gcGFydDtcbiAgICB0aGlzLl8kcGFyZW50ID0gcGFyZW50O1xuICAgIHRoaXMuX19hdHRyaWJ1dGVJbmRleCA9IGF0dHJpYnV0ZUluZGV4O1xuICB9XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgXyRyZXNvbHZlKHBhcnQ6IFBhcnQsIHByb3BzOiBBcnJheTx1bmtub3duPik6IHVua25vd24ge1xuICAgIHJldHVybiB0aGlzLnVwZGF0ZShwYXJ0LCBwcm9wcyk7XG4gIH1cblxuICBhYnN0cmFjdCByZW5kZXIoLi4ucHJvcHM6IEFycmF5PHVua25vd24+KTogdW5rbm93bjtcblxuICB1cGRhdGUoX3BhcnQ6IFBhcnQsIHByb3BzOiBBcnJheTx1bmtub3duPik6IHVua25vd24ge1xuICAgIHJldHVybiB0aGlzLnJlbmRlciguLi5wcm9wcyk7XG4gIH1cbn1cbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge18kTEgsIFBhcnQsIERpcmVjdGl2ZVBhcmVudCwgVGVtcGxhdGVSZXN1bHR9IGZyb20gJy4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgRGlyZWN0aXZlUmVzdWx0LFxuICBEaXJlY3RpdmVDbGFzcyxcbiAgUGFydEluZm8sXG4gIEF0dHJpYnV0ZVBhcnRJbmZvLFxufSBmcm9tICcuL2RpcmVjdGl2ZS5qcyc7XG50eXBlIFByaW1pdGl2ZSA9IG51bGwgfCB1bmRlZmluZWQgfCBib29sZWFuIHwgbnVtYmVyIHwgc3RyaW5nIHwgc3ltYm9sIHwgYmlnaW50O1xuXG5jb25zdCB7X0NoaWxkUGFydDogQ2hpbGRQYXJ0fSA9IF8kTEg7XG5cbnR5cGUgQ2hpbGRQYXJ0ID0gSW5zdGFuY2VUeXBlPHR5cGVvZiBDaGlsZFBhcnQ+O1xuXG5jb25zdCBFTkFCTEVfU0hBRFlET01fTk9QQVRDSCA9IHRydWU7XG5cbmNvbnN0IHdyYXAgPVxuICBFTkFCTEVfU0hBRFlET01fTk9QQVRDSCAmJlxuICB3aW5kb3cuU2hhZHlET00/LmluVXNlICYmXG4gIHdpbmRvdy5TaGFkeURPTT8ubm9QYXRjaCA9PT0gdHJ1ZVxuICAgID8gd2luZG93LlNoYWR5RE9NIS53cmFwXG4gICAgOiAobm9kZTogTm9kZSkgPT4gbm9kZTtcblxuLyoqXG4gKiBUZXN0cyBpZiBhIHZhbHVlIGlzIGEgcHJpbWl0aXZlIHZhbHVlLlxuICpcbiAqIFNlZSBodHRwczovL3RjMzkuZ2l0aHViLmlvL2VjbWEyNjIvI3NlYy10eXBlb2Ytb3BlcmF0b3JcbiAqL1xuZXhwb3J0IGNvbnN0IGlzUHJpbWl0aXZlID0gKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgUHJpbWl0aXZlID0+XG4gIHZhbHVlID09PSBudWxsIHx8ICh0eXBlb2YgdmFsdWUgIT0gJ29iamVjdCcgJiYgdHlwZW9mIHZhbHVlICE9ICdmdW5jdGlvbicpO1xuXG5leHBvcnQgY29uc3QgVGVtcGxhdGVSZXN1bHRUeXBlID0ge1xuICBIVE1MOiAxLFxuICBTVkc6IDIsXG59IGFzIGNvbnN0O1xuXG5leHBvcnQgdHlwZSBUZW1wbGF0ZVJlc3VsdFR5cGUgPVxuICAodHlwZW9mIFRlbXBsYXRlUmVzdWx0VHlwZSlba2V5b2YgdHlwZW9mIFRlbXBsYXRlUmVzdWx0VHlwZV07XG5cbi8qKlxuICogVGVzdHMgaWYgYSB2YWx1ZSBpcyBhIFRlbXBsYXRlUmVzdWx0LlxuICovXG5leHBvcnQgY29uc3QgaXNUZW1wbGF0ZVJlc3VsdCA9IChcbiAgdmFsdWU6IHVua25vd24sXG4gIHR5cGU/OiBUZW1wbGF0ZVJlc3VsdFR5cGVcbik6IHZhbHVlIGlzIFRlbXBsYXRlUmVzdWx0ID0+XG4gIHR5cGUgPT09IHVuZGVmaW5lZFxuICAgID8gLy8gVGhpcyBwcm9wZXJ0eSBuZWVkcyB0byByZW1haW4gdW5taW5pZmllZC5cbiAgICAgICh2YWx1ZSBhcyBUZW1wbGF0ZVJlc3VsdCk/LlsnXyRsaXRUeXBlJCddICE9PSB1bmRlZmluZWRcbiAgICA6ICh2YWx1ZSBhcyBUZW1wbGF0ZVJlc3VsdCk/LlsnXyRsaXRUeXBlJCddID09PSB0eXBlO1xuXG4vKipcbiAqIFRlc3RzIGlmIGEgdmFsdWUgaXMgYSBEaXJlY3RpdmVSZXN1bHQuXG4gKi9cbmV4cG9ydCBjb25zdCBpc0RpcmVjdGl2ZVJlc3VsdCA9ICh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIERpcmVjdGl2ZVJlc3VsdCA9PlxuICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAodmFsdWUgYXMgRGlyZWN0aXZlUmVzdWx0KT8uWydfJGxpdERpcmVjdGl2ZSQnXSAhPT0gdW5kZWZpbmVkO1xuXG4vKipcbiAqIFJldHJpZXZlcyB0aGUgRGlyZWN0aXZlIGNsYXNzIGZvciBhIERpcmVjdGl2ZVJlc3VsdFxuICovXG5leHBvcnQgY29uc3QgZ2V0RGlyZWN0aXZlQ2xhc3MgPSAodmFsdWU6IHVua25vd24pOiBEaXJlY3RpdmVDbGFzcyB8IHVuZGVmaW5lZCA9PlxuICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAodmFsdWUgYXMgRGlyZWN0aXZlUmVzdWx0KT8uWydfJGxpdERpcmVjdGl2ZSQnXTtcblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIGEgcGFydCBoYXMgb25seSBhIHNpbmdsZS1leHByZXNzaW9uIHdpdGggbm8gc3RyaW5ncyB0b1xuICogaW50ZXJwb2xhdGUgYmV0d2Vlbi5cbiAqXG4gKiBPbmx5IEF0dHJpYnV0ZVBhcnQgYW5kIFByb3BlcnR5UGFydCBjYW4gaGF2ZSBtdWx0aXBsZSBleHByZXNzaW9ucy5cbiAqIE11bHRpLWV4cHJlc3Npb24gcGFydHMgaGF2ZSBhIGBzdHJpbmdzYCBwcm9wZXJ0eSBhbmQgc2luZ2xlLWV4cHJlc3Npb25cbiAqIHBhcnRzIGRvIG5vdC5cbiAqL1xuZXhwb3J0IGNvbnN0IGlzU2luZ2xlRXhwcmVzc2lvbiA9IChwYXJ0OiBQYXJ0SW5mbykgPT5cbiAgKHBhcnQgYXMgQXR0cmlidXRlUGFydEluZm8pLnN0cmluZ3MgPT09IHVuZGVmaW5lZDtcblxuY29uc3QgY3JlYXRlTWFya2VyID0gKCkgPT4gZG9jdW1lbnQuY3JlYXRlQ29tbWVudCgnJyk7XG5cbi8qKlxuICogSW5zZXJ0cyBhIENoaWxkUGFydCBpbnRvIHRoZSBnaXZlbiBjb250YWluZXIgQ2hpbGRQYXJ0J3MgRE9NLCBlaXRoZXIgYXQgdGhlXG4gKiBlbmQgb2YgdGhlIGNvbnRhaW5lciBDaGlsZFBhcnQsIG9yIGJlZm9yZSB0aGUgb3B0aW9uYWwgYHJlZlBhcnRgLlxuICpcbiAqIFRoaXMgZG9lcyBub3QgYWRkIHRoZSBwYXJ0IHRvIHRoZSBjb250YWluZXJQYXJ0J3MgY29tbWl0dGVkIHZhbHVlLiBUaGF0IG11c3RcbiAqIGJlIGRvbmUgYnkgY2FsbGVycy5cbiAqXG4gKiBAcGFyYW0gY29udGFpbmVyUGFydCBQYXJ0IHdpdGhpbiB3aGljaCB0byBhZGQgdGhlIG5ldyBDaGlsZFBhcnRcbiAqIEBwYXJhbSByZWZQYXJ0IFBhcnQgYmVmb3JlIHdoaWNoIHRvIGFkZCB0aGUgbmV3IENoaWxkUGFydDsgd2hlbiBvbWl0dGVkIHRoZVxuICogICAgIHBhcnQgYWRkZWQgdG8gdGhlIGVuZCBvZiB0aGUgYGNvbnRhaW5lclBhcnRgXG4gKiBAcGFyYW0gcGFydCBQYXJ0IHRvIGluc2VydCwgb3IgdW5kZWZpbmVkIHRvIGNyZWF0ZSBhIG5ldyBwYXJ0XG4gKi9cbmV4cG9ydCBjb25zdCBpbnNlcnRQYXJ0ID0gKFxuICBjb250YWluZXJQYXJ0OiBDaGlsZFBhcnQsXG4gIHJlZlBhcnQ/OiBDaGlsZFBhcnQsXG4gIHBhcnQ/OiBDaGlsZFBhcnRcbik6IENoaWxkUGFydCA9PiB7XG4gIGNvbnN0IGNvbnRhaW5lciA9IHdyYXAoY29udGFpbmVyUGFydC5fJHN0YXJ0Tm9kZSkucGFyZW50Tm9kZSE7XG5cbiAgY29uc3QgcmVmTm9kZSA9XG4gICAgcmVmUGFydCA9PT0gdW5kZWZpbmVkID8gY29udGFpbmVyUGFydC5fJGVuZE5vZGUgOiByZWZQYXJ0Ll8kc3RhcnROb2RlO1xuXG4gIGlmIChwYXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICBjb25zdCBzdGFydE5vZGUgPSB3cmFwKGNvbnRhaW5lcikuaW5zZXJ0QmVmb3JlKGNyZWF0ZU1hcmtlcigpLCByZWZOb2RlKTtcbiAgICBjb25zdCBlbmROb2RlID0gd3JhcChjb250YWluZXIpLmluc2VydEJlZm9yZShjcmVhdGVNYXJrZXIoKSwgcmVmTm9kZSk7XG4gICAgcGFydCA9IG5ldyBDaGlsZFBhcnQoXG4gICAgICBzdGFydE5vZGUsXG4gICAgICBlbmROb2RlLFxuICAgICAgY29udGFpbmVyUGFydCxcbiAgICAgIGNvbnRhaW5lclBhcnQub3B0aW9uc1xuICAgICk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgZW5kTm9kZSA9IHdyYXAocGFydC5fJGVuZE5vZGUhKS5uZXh0U2libGluZztcbiAgICBjb25zdCBvbGRQYXJlbnQgPSBwYXJ0Ll8kcGFyZW50O1xuICAgIGNvbnN0IHBhcmVudENoYW5nZWQgPSBvbGRQYXJlbnQgIT09IGNvbnRhaW5lclBhcnQ7XG4gICAgaWYgKHBhcmVudENoYW5nZWQpIHtcbiAgICAgIHBhcnQuXyRyZXBhcmVudERpc2Nvbm5lY3RhYmxlcz8uKGNvbnRhaW5lclBhcnQpO1xuICAgICAgLy8gTm90ZSB0aGF0IGFsdGhvdWdoIGBfJHJlcGFyZW50RGlzY29ubmVjdGFibGVzYCB1cGRhdGVzIHRoZSBwYXJ0J3NcbiAgICAgIC8vIGBfJHBhcmVudGAgcmVmZXJlbmNlIGFmdGVyIHVubGlua2luZyBmcm9tIGl0cyBjdXJyZW50IHBhcmVudCwgdGhhdFxuICAgICAgLy8gbWV0aG9kIG9ubHkgZXhpc3RzIGlmIERpc2Nvbm5lY3RhYmxlcyBhcmUgcHJlc2VudCwgc28gd2UgbmVlZCB0b1xuICAgICAgLy8gdW5jb25kaXRpb25hbGx5IHNldCBpdCBoZXJlXG4gICAgICBwYXJ0Ll8kcGFyZW50ID0gY29udGFpbmVyUGFydDtcbiAgICAgIC8vIFNpbmNlIHRoZSBfJGlzQ29ubmVjdGVkIGdldHRlciBpcyBzb21ld2hhdCBjb3N0bHksIG9ubHlcbiAgICAgIC8vIHJlYWQgaXQgb25jZSB3ZSBrbm93IHRoZSBzdWJ0cmVlIGhhcyBkaXJlY3RpdmVzIHRoYXQgbmVlZFxuICAgICAgLy8gdG8gYmUgbm90aWZpZWRcbiAgICAgIGxldCBuZXdDb25uZWN0aW9uU3RhdGU7XG4gICAgICBpZiAoXG4gICAgICAgIHBhcnQuXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgIChuZXdDb25uZWN0aW9uU3RhdGUgPSBjb250YWluZXJQYXJ0Ll8kaXNDb25uZWN0ZWQpICE9PVxuICAgICAgICAgIG9sZFBhcmVudCEuXyRpc0Nvbm5lY3RlZFxuICAgICAgKSB7XG4gICAgICAgIHBhcnQuXyRub3RpZnlDb25uZWN0aW9uQ2hhbmdlZChuZXdDb25uZWN0aW9uU3RhdGUpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZW5kTm9kZSAhPT0gcmVmTm9kZSB8fCBwYXJlbnRDaGFuZ2VkKSB7XG4gICAgICBsZXQgc3RhcnQ6IE5vZGUgfCBudWxsID0gcGFydC5fJHN0YXJ0Tm9kZTtcbiAgICAgIHdoaWxlIChzdGFydCAhPT0gZW5kTm9kZSkge1xuICAgICAgICBjb25zdCBuOiBOb2RlIHwgbnVsbCA9IHdyYXAoc3RhcnQhKS5uZXh0U2libGluZztcbiAgICAgICAgd3JhcChjb250YWluZXIpLmluc2VydEJlZm9yZShzdGFydCEsIHJlZk5vZGUpO1xuICAgICAgICBzdGFydCA9IG47XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhcnQ7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIHZhbHVlIG9mIGEgUGFydC5cbiAqXG4gKiBOb3RlIHRoYXQgdGhpcyBzaG91bGQgb25seSBiZSB1c2VkIHRvIHNldC91cGRhdGUgdGhlIHZhbHVlIG9mIHVzZXItY3JlYXRlZFxuICogcGFydHMgKGkuZS4gdGhvc2UgY3JlYXRlZCB1c2luZyBgaW5zZXJ0UGFydGApOyBpdCBzaG91bGQgbm90IGJlIHVzZWRcbiAqIGJ5IGRpcmVjdGl2ZXMgdG8gc2V0IHRoZSB2YWx1ZSBvZiB0aGUgZGlyZWN0aXZlJ3MgY29udGFpbmVyIHBhcnQuIERpcmVjdGl2ZXNcbiAqIHNob3VsZCByZXR1cm4gYSB2YWx1ZSBmcm9tIGB1cGRhdGVgL2ByZW5kZXJgIHRvIHVwZGF0ZSB0aGVpciBwYXJ0IHN0YXRlLlxuICpcbiAqIEZvciBkaXJlY3RpdmVzIHRoYXQgcmVxdWlyZSBzZXR0aW5nIHRoZWlyIHBhcnQgdmFsdWUgYXN5bmNocm9ub3VzbHksIHRoZXlcbiAqIHNob3VsZCBleHRlbmQgYEFzeW5jRGlyZWN0aXZlYCBhbmQgY2FsbCBgdGhpcy5zZXRWYWx1ZSgpYC5cbiAqXG4gKiBAcGFyYW0gcGFydCBQYXJ0IHRvIHNldFxuICogQHBhcmFtIHZhbHVlIFZhbHVlIHRvIHNldFxuICogQHBhcmFtIGluZGV4IEZvciBgQXR0cmlidXRlUGFydGBzLCB0aGUgaW5kZXggdG8gc2V0XG4gKiBAcGFyYW0gZGlyZWN0aXZlUGFyZW50IFVzZWQgaW50ZXJuYWxseTsgc2hvdWxkIG5vdCBiZSBzZXQgYnkgdXNlclxuICovXG5leHBvcnQgY29uc3Qgc2V0Q2hpbGRQYXJ0VmFsdWUgPSA8VCBleHRlbmRzIENoaWxkUGFydD4oXG4gIHBhcnQ6IFQsXG4gIHZhbHVlOiB1bmtub3duLFxuICBkaXJlY3RpdmVQYXJlbnQ6IERpcmVjdGl2ZVBhcmVudCA9IHBhcnRcbik6IFQgPT4ge1xuICBwYXJ0Ll8kc2V0VmFsdWUodmFsdWUsIGRpcmVjdGl2ZVBhcmVudCk7XG4gIHJldHVybiBwYXJ0O1xufTtcblxuLy8gQSBzZW50aW5lbCB2YWx1ZSB0aGF0IGNhbiBuZXZlciBhcHBlYXIgYXMgYSBwYXJ0IHZhbHVlIGV4Y2VwdCB3aGVuIHNldCBieVxuLy8gbGl2ZSgpLiBVc2VkIHRvIGZvcmNlIGEgZGlydHktY2hlY2sgdG8gZmFpbCBhbmQgY2F1c2UgYSByZS1yZW5kZXIuXG5jb25zdCBSRVNFVF9WQUxVRSA9IHt9O1xuXG4vKipcbiAqIFNldHMgdGhlIGNvbW1pdHRlZCB2YWx1ZSBvZiBhIENoaWxkUGFydCBkaXJlY3RseSB3aXRob3V0IHRyaWdnZXJpbmcgdGhlXG4gKiBjb21taXQgc3RhZ2Ugb2YgdGhlIHBhcnQuXG4gKlxuICogVGhpcyBpcyB1c2VmdWwgaW4gY2FzZXMgd2hlcmUgYSBkaXJlY3RpdmUgbmVlZHMgdG8gdXBkYXRlIHRoZSBwYXJ0IHN1Y2hcbiAqIHRoYXQgdGhlIG5leHQgdXBkYXRlIGRldGVjdHMgYSB2YWx1ZSBjaGFuZ2Ugb3Igbm90LiBXaGVuIHZhbHVlIGlzIG9taXR0ZWQsXG4gKiB0aGUgbmV4dCB1cGRhdGUgd2lsbCBiZSBndWFyYW50ZWVkIHRvIGJlIGRldGVjdGVkIGFzIGEgY2hhbmdlLlxuICpcbiAqIEBwYXJhbSBwYXJ0XG4gKiBAcGFyYW0gdmFsdWVcbiAqL1xuZXhwb3J0IGNvbnN0IHNldENvbW1pdHRlZFZhbHVlID0gKHBhcnQ6IFBhcnQsIHZhbHVlOiB1bmtub3duID0gUkVTRVRfVkFMVUUpID0+XG4gIChwYXJ0Ll8kY29tbWl0dGVkVmFsdWUgPSB2YWx1ZSk7XG5cbi8qKlxuICogUmV0dXJucyB0aGUgY29tbWl0dGVkIHZhbHVlIG9mIGEgQ2hpbGRQYXJ0LlxuICpcbiAqIFRoZSBjb21taXR0ZWQgdmFsdWUgaXMgdXNlZCBmb3IgY2hhbmdlIGRldGVjdGlvbiBhbmQgZWZmaWNpZW50IHVwZGF0ZXMgb2ZcbiAqIHRoZSBwYXJ0LiBJdCBjYW4gZGlmZmVyIGZyb20gdGhlIHZhbHVlIHNldCBieSB0aGUgdGVtcGxhdGUgb3IgZGlyZWN0aXZlIGluXG4gKiBjYXNlcyB3aGVyZSB0aGUgdGVtcGxhdGUgdmFsdWUgaXMgdHJhbnNmb3JtZWQgYmVmb3JlIGJlaW5nIGNvbW1pdHRlZC5cbiAqXG4gKiAtIGBUZW1wbGF0ZVJlc3VsdGBzIGFyZSBjb21taXR0ZWQgYXMgYSBgVGVtcGxhdGVJbnN0YW5jZWBcbiAqIC0gSXRlcmFibGVzIGFyZSBjb21taXR0ZWQgYXMgYEFycmF5PENoaWxkUGFydD5gXG4gKiAtIEFsbCBvdGhlciB0eXBlcyBhcmUgY29tbWl0dGVkIGFzIHRoZSB0ZW1wbGF0ZSB2YWx1ZSBvciB2YWx1ZSByZXR1cm5lZCBvclxuICogICBzZXQgYnkgYSBkaXJlY3RpdmUuXG4gKlxuICogQHBhcmFtIHBhcnRcbiAqL1xuZXhwb3J0IGNvbnN0IGdldENvbW1pdHRlZFZhbHVlID0gKHBhcnQ6IENoaWxkUGFydCkgPT4gcGFydC5fJGNvbW1pdHRlZFZhbHVlO1xuXG4vKipcbiAqIFJlbW92ZXMgYSBDaGlsZFBhcnQgZnJvbSB0aGUgRE9NLCBpbmNsdWRpbmcgYW55IG9mIGl0cyBjb250ZW50LlxuICpcbiAqIEBwYXJhbSBwYXJ0IFRoZSBQYXJ0IHRvIHJlbW92ZVxuICovXG5leHBvcnQgY29uc3QgcmVtb3ZlUGFydCA9IChwYXJ0OiBDaGlsZFBhcnQpID0+IHtcbiAgcGFydC5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkPy4oZmFsc2UsIHRydWUpO1xuICBsZXQgc3RhcnQ6IENoaWxkTm9kZSB8IG51bGwgPSBwYXJ0Ll8kc3RhcnROb2RlO1xuICBjb25zdCBlbmQ6IENoaWxkTm9kZSB8IG51bGwgPSB3cmFwKHBhcnQuXyRlbmROb2RlISkubmV4dFNpYmxpbmc7XG4gIHdoaWxlIChzdGFydCAhPT0gZW5kKSB7XG4gICAgY29uc3QgbjogQ2hpbGROb2RlIHwgbnVsbCA9IHdyYXAoc3RhcnQhKS5uZXh0U2libGluZztcbiAgICAod3JhcChzdGFydCEpIGFzIENoaWxkTm9kZSkucmVtb3ZlKCk7XG4gICAgc3RhcnQgPSBuO1xuICB9XG59O1xuXG5leHBvcnQgY29uc3QgY2xlYXJQYXJ0ID0gKHBhcnQ6IENoaWxkUGFydCkgPT4ge1xuICBwYXJ0Ll8kY2xlYXIoKTtcbn07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLyoqXG4gKiBPdmVydmlldzpcbiAqXG4gKiBUaGlzIG1vZHVsZSBpcyBkZXNpZ25lZCB0byBhZGQgc3VwcG9ydCBmb3IgYW4gYXN5bmMgYHNldFZhbHVlYCBBUEkgYW5kXG4gKiBgZGlzY29ubmVjdGVkYCBjYWxsYmFjayB0byBkaXJlY3RpdmVzIHdpdGggdGhlIGxlYXN0IGltcGFjdCBvbiB0aGUgY29yZVxuICogcnVudGltZSBvciBwYXlsb2FkIHdoZW4gdGhhdCBmZWF0dXJlIGlzIG5vdCB1c2VkLlxuICpcbiAqIFRoZSBzdHJhdGVneSBpcyB0byBpbnRyb2R1Y2UgYSBgQXN5bmNEaXJlY3RpdmVgIHN1YmNsYXNzIG9mXG4gKiBgRGlyZWN0aXZlYCB0aGF0IGNsaW1icyB0aGUgXCJwYXJlbnRcIiB0cmVlIGluIGl0cyBjb25zdHJ1Y3RvciB0byBub3RlIHdoaWNoXG4gKiBicmFuY2hlcyBvZiBsaXQtaHRtbCdzIFwibG9naWNhbCB0cmVlXCIgb2YgZGF0YSBzdHJ1Y3R1cmVzIGNvbnRhaW4gc3VjaFxuICogZGlyZWN0aXZlcyBhbmQgdGh1cyBuZWVkIHRvIGJlIGNyYXdsZWQgd2hlbiBhIHN1YnRyZWUgaXMgYmVpbmcgY2xlYXJlZCAob3JcbiAqIG1hbnVhbGx5IGRpc2Nvbm5lY3RlZCkgaW4gb3JkZXIgdG8gcnVuIHRoZSBgZGlzY29ubmVjdGVkYCBjYWxsYmFjay5cbiAqXG4gKiBUaGUgXCJub2Rlc1wiIG9mIHRoZSBsb2dpY2FsIHRyZWUgaW5jbHVkZSBQYXJ0cywgVGVtcGxhdGVJbnN0YW5jZXMgKGZvciB3aGVuIGFcbiAqIFRlbXBsYXRlUmVzdWx0IGlzIGNvbW1pdHRlZCB0byBhIHZhbHVlIG9mIGEgQ2hpbGRQYXJ0KSwgYW5kIERpcmVjdGl2ZXM7IHRoZXNlXG4gKiBhbGwgaW1wbGVtZW50IGEgY29tbW9uIGludGVyZmFjZSBjYWxsZWQgYERpc2Nvbm5lY3RhYmxlQ2hpbGRgLiBFYWNoIGhhcyBhXG4gKiBgXyRwYXJlbnRgIHJlZmVyZW5jZSB3aGljaCBpcyBzZXQgZHVyaW5nIGNvbnN0cnVjdGlvbiBpbiB0aGUgY29yZSBjb2RlLCBhbmQgYVxuICogYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAgZmllbGQgd2hpY2ggaXMgaW5pdGlhbGx5IHVuZGVmaW5lZC5cbiAqXG4gKiBUaGUgc3BhcnNlIHRyZWUgY3JlYXRlZCBieSBtZWFucyBvZiB0aGUgYEFzeW5jRGlyZWN0aXZlYCBjb25zdHJ1Y3RvclxuICogY3Jhd2xpbmcgdXAgdGhlIGBfJHBhcmVudGAgdHJlZSBhbmQgcGxhY2luZyBhIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gIFNldFxuICogb24gZWFjaCBwYXJlbnQgdGhhdCBpbmNsdWRlcyBlYWNoIGNoaWxkIHRoYXQgY29udGFpbnMgYVxuICogYEFzeW5jRGlyZWN0aXZlYCBkaXJlY3RseSBvciB0cmFuc2l0aXZlbHkgdmlhIGl0cyBjaGlsZHJlbi4gSW4gb3JkZXIgdG9cbiAqIG5vdGlmeSBjb25uZWN0aW9uIHN0YXRlIGNoYW5nZXMgYW5kIGRpc2Nvbm5lY3QgKG9yIHJlY29ubmVjdCkgYSB0cmVlLCB0aGVcbiAqIGBfJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkYCBBUEkgaXMgcGF0Y2hlZCBvbnRvIENoaWxkUGFydHMgYXMgYSBkaXJlY3RpdmVcbiAqIGNsaW1icyB0aGUgcGFyZW50IHRyZWUsIHdoaWNoIGlzIGNhbGxlZCBieSB0aGUgY29yZSB3aGVuIGNsZWFyaW5nIGEgcGFydCBpZlxuICogaXQgZXhpc3RzLiBXaGVuIGNhbGxlZCwgdGhhdCBtZXRob2QgaXRlcmF0ZXMgb3ZlciB0aGUgc3BhcnNlIHRyZWUgb2ZcbiAqIFNldDxEaXNjb25uZWN0YWJsZUNoaWxkcmVuPiBidWlsdCB1cCBieSBBc3luY0RpcmVjdGl2ZXMsIGFuZCBjYWxsc1xuICogYF8kbm90aWZ5RGlyZWN0aXZlQ29ubmVjdGlvbkNoYW5nZWRgIG9uIGFueSBkaXJlY3RpdmVzIHRoYXQgYXJlIGVuY291bnRlcmVkXG4gKiBpbiB0aGF0IHRyZWUsIHJ1bm5pbmcgdGhlIHJlcXVpcmVkIGNhbGxiYWNrcy5cbiAqXG4gKiBBIGdpdmVuIFwibG9naWNhbCB0cmVlXCIgb2YgbGl0LWh0bWwgZGF0YS1zdHJ1Y3R1cmVzIG1pZ2h0IGxvb2sgbGlrZSB0aGlzOlxuICpcbiAqICBDaGlsZFBhcnQoTjEpIF8kZEM9W0QyLFQzXVxuICogICAuX2RpcmVjdGl2ZVxuICogICAgIEFzeW5jRGlyZWN0aXZlKEQyKVxuICogICAuX3ZhbHVlIC8vIHVzZXIgdmFsdWUgd2FzIFRlbXBsYXRlUmVzdWx0XG4gKiAgICAgVGVtcGxhdGVJbnN0YW5jZShUMykgXyRkQz1bQTQsQTYsTjEwLE4xMl1cbiAqICAgICAgLl8kcGFydHNbXVxuICogICAgICAgIEF0dHJpYnV0ZVBhcnQoQTQpIF8kZEM9W0Q1XVxuICogICAgICAgICAuX2RpcmVjdGl2ZXNbXVxuICogICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQ1KVxuICogICAgICAgIEF0dHJpYnV0ZVBhcnQoQTYpIF8kZEM9W0Q3LEQ4XVxuICogICAgICAgICAuX2RpcmVjdGl2ZXNbXVxuICogICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQ3KVxuICogICAgICAgICAgIERpcmVjdGl2ZShEOCkgXyRkQz1bRDldXG4gKiAgICAgICAgICAgIC5fZGlyZWN0aXZlXG4gKiAgICAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDkpXG4gKiAgICAgICAgQ2hpbGRQYXJ0KE4xMCkgXyRkQz1bRDExXVxuICogICAgICAgICAuX2RpcmVjdGl2ZVxuICogICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQxMSlcbiAqICAgICAgICAgLl92YWx1ZVxuICogICAgICAgICAgIHN0cmluZ1xuICogICAgICAgIENoaWxkUGFydChOMTIpIF8kZEM9W0QxMyxOMTQsTjE2XVxuICogICAgICAgICAuX2RpcmVjdGl2ZVxuICogICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQxMylcbiAqICAgICAgICAgLl92YWx1ZSAvLyB1c2VyIHZhbHVlIHdhcyBpdGVyYWJsZVxuICogICAgICAgICAgIEFycmF5PENoaWxkUGFydD5cbiAqICAgICAgICAgICAgIENoaWxkUGFydChOMTQpIF8kZEM9W0QxNV1cbiAqICAgICAgICAgICAgICAuX3ZhbHVlXG4gKiAgICAgICAgICAgICAgICBzdHJpbmdcbiAqICAgICAgICAgICAgIENoaWxkUGFydChOMTYpIF8kZEM9W0QxNyxUMThdXG4gKiAgICAgICAgICAgICAgLl9kaXJlY3RpdmVcbiAqICAgICAgICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQxNylcbiAqICAgICAgICAgICAgICAuX3ZhbHVlIC8vIHVzZXIgdmFsdWUgd2FzIFRlbXBsYXRlUmVzdWx0XG4gKiAgICAgICAgICAgICAgICBUZW1wbGF0ZUluc3RhbmNlKFQxOCkgXyRkQz1bQTE5LEEyMSxOMjVdXG4gKiAgICAgICAgICAgICAgICAgLl8kcGFydHNbXVxuICogICAgICAgICAgICAgICAgICAgQXR0cmlidXRlUGFydChBMTkpIF8kZEM9W0QyMF1cbiAqICAgICAgICAgICAgICAgICAgICAuX2RpcmVjdGl2ZXNbXVxuICogICAgICAgICAgICAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDIwKVxuICogICAgICAgICAgICAgICAgICAgQXR0cmlidXRlUGFydChBMjEpIF8kZEM9WzIyLDIzXVxuICogICAgICAgICAgICAgICAgICAgIC5fZGlyZWN0aXZlc1tdXG4gKiAgICAgICAgICAgICAgICAgICAgICBBc3luY0RpcmVjdGl2ZShEMjIpXG4gKiAgICAgICAgICAgICAgICAgICAgICBEaXJlY3RpdmUoRDIzKSBfJGRDPVtEMjRdXG4gKiAgICAgICAgICAgICAgICAgICAgICAgLl9kaXJlY3RpdmVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgIEFzeW5jRGlyZWN0aXZlKEQyNClcbiAqICAgICAgICAgICAgICAgICAgIENoaWxkUGFydChOMjUpIF8kZEM9W0QyNl1cbiAqICAgICAgICAgICAgICAgICAgICAuX2RpcmVjdGl2ZVxuICogICAgICAgICAgICAgICAgICAgICAgQXN5bmNEaXJlY3RpdmUoRDI2KVxuICogICAgICAgICAgICAgICAgICAgIC5fdmFsdWVcbiAqICAgICAgICAgICAgICAgICAgICAgIHN0cmluZ1xuICpcbiAqIEV4YW1wbGUgMTogVGhlIGRpcmVjdGl2ZSBpbiBDaGlsZFBhcnQoTjEyKSB1cGRhdGVzIGFuZCByZXR1cm5zIGBub3RoaW5nYC4gVGhlXG4gKiBDaGlsZFBhcnQgd2lsbCBfY2xlYXIoKSBpdHNlbGYsIGFuZCBzbyB3ZSBuZWVkIHRvIGRpc2Nvbm5lY3QgdGhlIFwidmFsdWVcIiBvZlxuICogdGhlIENoaWxkUGFydCAoYnV0IG5vdCBpdHMgZGlyZWN0aXZlKS4gSW4gdGhpcyBjYXNlLCB3aGVuIGBfY2xlYXIoKWAgY2FsbHNcbiAqIGBfJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkKClgLCB3ZSBkb24ndCBpdGVyYXRlIGFsbCBvZiB0aGVcbiAqIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbiwgcmF0aGVyIHdlIGRvIGEgdmFsdWUtc3BlY2lmaWMgZGlzY29ubmVjdGlvbjogaS5lLlxuICogc2luY2UgdGhlIF92YWx1ZSB3YXMgYW4gQXJyYXk8Q2hpbGRQYXJ0PiAoYmVjYXVzZSBhbiBpdGVyYWJsZSBoYWQgYmVlblxuICogY29tbWl0dGVkKSwgd2UgaXRlcmF0ZSB0aGUgYXJyYXkgb2YgQ2hpbGRQYXJ0cyAoTjE0LCBOMTYpIGFuZCBydW5cbiAqIGBzZXRDb25uZWN0ZWRgIG9uIHRoZW0gKHdoaWNoIGRvZXMgcmVjdXJzZSBkb3duIHRoZSBmdWxsIHRyZWUgb2ZcbiAqIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gIGJlbG93IGl0LCBhbmQgYWxzbyByZW1vdmVzIE4xNCBhbmQgTjE2IGZyb20gTjEyJ3NcbiAqIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gKS4gT25jZSB0aGUgdmFsdWVzIGhhdmUgYmVlbiBkaXNjb25uZWN0ZWQsIHdlIHRoZW5cbiAqIGNoZWNrIHdoZXRoZXIgdGhlIENoaWxkUGFydChOMTIpJ3MgbGlzdCBvZiBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCBpcyBlbXB0eVxuICogKGFuZCB3b3VsZCByZW1vdmUgaXQgZnJvbSBpdHMgcGFyZW50IFRlbXBsYXRlSW5zdGFuY2UoVDMpIGlmIHNvKSwgYnV0IHNpbmNlXG4gKiBpdCB3b3VsZCBzdGlsbCBjb250YWluIGl0cyBkaXJlY3RpdmUgRDEzLCBpdCBzdGF5cyBpbiB0aGUgZGlzY29ubmVjdGFibGVcbiAqIHRyZWUuXG4gKlxuICogRXhhbXBsZSAyOiBJbiB0aGUgY291cnNlIG9mIEV4YW1wbGUgMSwgYHNldENvbm5lY3RlZGAgd2lsbCByZWFjaFxuICogQ2hpbGRQYXJ0KE4xNik7IGluIHRoaXMgY2FzZSB0aGUgZW50aXJlIHBhcnQgaXMgYmVpbmcgZGlzY29ubmVjdGVkLCBzbyB3ZVxuICogc2ltcGx5IGl0ZXJhdGUgYWxsIG9mIE4xNidzIGBfJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5gIChEMTcsVDE4KSBhbmRcbiAqIHJlY3Vyc2l2ZWx5IHJ1biBgc2V0Q29ubmVjdGVkYCBvbiB0aGVtLiBOb3RlIHRoYXQgd2Ugb25seSByZW1vdmUgY2hpbGRyZW5cbiAqIGZyb20gYF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbmAgZm9yIHRoZSB0b3AtbGV2ZWwgdmFsdWVzIGJlaW5nIGRpc2Nvbm5lY3RlZFxuICogb24gYSBjbGVhcjsgZG9pbmcgdGhpcyBib29ra2VlcGluZyBsb3dlciBpbiB0aGUgdHJlZSBpcyB3YXN0ZWZ1bCBzaW5jZSBpdCdzXG4gKiBhbGwgYmVpbmcgdGhyb3duIGF3YXkuXG4gKlxuICogRXhhbXBsZSAzOiBJZiB0aGUgTGl0RWxlbWVudCBjb250YWluaW5nIHRoZSBlbnRpcmUgdHJlZSBhYm92ZSBiZWNvbWVzXG4gKiBkaXNjb25uZWN0ZWQsIGl0IHdpbGwgcnVuIGBjaGlsZFBhcnQuc2V0Q29ubmVjdGVkKClgICh3aGljaCBjYWxsc1xuICogYGNoaWxkUGFydC5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkKClgIGlmIGl0IGV4aXN0cyk7IGluIHRoaXMgY2FzZSwgd2VcbiAqIHJlY3Vyc2l2ZWx5IHJ1biBgc2V0Q29ubmVjdGVkKClgIG92ZXIgdGhlIGVudGlyZSB0cmVlLCB3aXRob3V0IHJlbW92aW5nIGFueVxuICogY2hpbGRyZW4gZnJvbSBgXyRkaXNjb25uZWN0YWJsZUNoaWxkcmVuYCwgc2luY2UgdGhpcyB0cmVlIGlzIHJlcXVpcmVkIHRvXG4gKiByZS1jb25uZWN0IHRoZSB0cmVlLCB3aGljaCBkb2VzIHRoZSBzYW1lIG9wZXJhdGlvbiwgc2ltcGx5IHBhc3NpbmdcbiAqIGBpc0Nvbm5lY3RlZDogdHJ1ZWAgZG93biB0aGUgdHJlZSwgc2lnbmFsaW5nIHdoaWNoIGNhbGxiYWNrIHRvIHJ1bi5cbiAqL1xuXG5pbXBvcnQge0F0dHJpYnV0ZVBhcnQsIENoaWxkUGFydCwgRGlzY29ubmVjdGFibGUsIFBhcnR9IGZyb20gJy4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtpc1NpbmdsZUV4cHJlc3Npb259IGZyb20gJy4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuaW1wb3J0IHtEaXJlY3RpdmUsIFBhcnRJbmZvLCBQYXJ0VHlwZX0gZnJvbSAnLi9kaXJlY3RpdmUuanMnO1xuZXhwb3J0ICogZnJvbSAnLi9kaXJlY3RpdmUuanMnO1xuXG5jb25zdCBERVZfTU9ERSA9IHRydWU7XG5cbi8qKlxuICogUmVjdXJzaXZlbHkgd2Fsa3MgZG93biB0aGUgdHJlZSBvZiBQYXJ0cy9UZW1wbGF0ZUluc3RhbmNlcy9EaXJlY3RpdmVzIHRvIHNldFxuICogdGhlIGNvbm5lY3RlZCBzdGF0ZSBvZiBkaXJlY3RpdmVzIGFuZCBydW4gYGRpc2Nvbm5lY3RlZGAvIGByZWNvbm5lY3RlZGBcbiAqIGNhbGxiYWNrcy5cbiAqXG4gKiBAcmV0dXJuIFRydWUgaWYgdGhlcmUgd2VyZSBjaGlsZHJlbiB0byBkaXNjb25uZWN0OyBmYWxzZSBvdGhlcndpc2VcbiAqL1xuY29uc3Qgbm90aWZ5Q2hpbGRyZW5Db25uZWN0ZWRDaGFuZ2VkID0gKFxuICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICBpc0Nvbm5lY3RlZDogYm9vbGVhblxuKTogYm9vbGVhbiA9PiB7XG4gIGNvbnN0IGNoaWxkcmVuID0gcGFyZW50Ll8kZGlzY29ubmVjdGFibGVDaGlsZHJlbjtcbiAgaWYgKGNoaWxkcmVuID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgZm9yIChjb25zdCBvYmogb2YgY2hpbGRyZW4pIHtcbiAgICAvLyBUaGUgZXhpc3RlbmNlIG9mIGBfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkYCBpcyB1c2VkIGFzIGEgXCJicmFuZFwiIHRvXG4gICAgLy8gZGlzYW1iaWd1YXRlIEFzeW5jRGlyZWN0aXZlcyBmcm9tIG90aGVyIERpc2Nvbm5lY3RhYmxlQ2hpbGRyZW5cbiAgICAvLyAoYXMgb3Bwb3NlZCB0byB1c2luZyBhbiBpbnN0YW5jZW9mIGNoZWNrIHRvIGtub3cgd2hlbiB0byBjYWxsIGl0KTsgdGhlXG4gICAgLy8gcmVkdW5kYW5jeSBvZiBcIkRpcmVjdGl2ZVwiIGluIHRoZSBBUEkgbmFtZSBpcyB0byBhdm9pZCBjb25mbGljdGluZyB3aXRoXG4gICAgLy8gYF8kbm90aWZ5Q29ubmVjdGlvbkNoYW5nZWRgLCB3aGljaCBleGlzdHMgYENoaWxkUGFydHNgIHdoaWNoIGFyZSBhbHNvIGluXG4gICAgLy8gdGhpcyBsaXN0XG4gICAgLy8gRGlzY29ubmVjdCBEaXJlY3RpdmUgKGFuZCBhbnkgbmVzdGVkIGRpcmVjdGl2ZXMgY29udGFpbmVkIHdpdGhpbilcbiAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgIChvYmogYXMgQXN5bmNEaXJlY3RpdmUpWydfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkJ10/LihcbiAgICAgIGlzQ29ubmVjdGVkLFxuICAgICAgZmFsc2VcbiAgICApO1xuICAgIC8vIERpc2Nvbm5lY3QgUGFydC9UZW1wbGF0ZUluc3RhbmNlXG4gICAgbm90aWZ5Q2hpbGRyZW5Db25uZWN0ZWRDaGFuZ2VkKG9iaiwgaXNDb25uZWN0ZWQpO1xuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIHRoZSBnaXZlbiBjaGlsZCBmcm9tIGl0cyBwYXJlbnQgbGlzdCBvZiBkaXNjb25uZWN0YWJsZSBjaGlsZHJlbiwgYW5kXG4gKiBpZiB0aGUgcGFyZW50IGxpc3QgYmVjb21lcyBlbXB0eSBhcyBhIHJlc3VsdCwgcmVtb3ZlcyB0aGUgcGFyZW50IGZyb20gaXRzXG4gKiBwYXJlbnQsIGFuZCBzbyBmb3J0aCB1cCB0aGUgdHJlZSB3aGVuIHRoYXQgY2F1c2VzIHN1YnNlcXVlbnQgcGFyZW50IGxpc3RzIHRvXG4gKiBiZWNvbWUgZW1wdHkuXG4gKi9cbmNvbnN0IHJlbW92ZURpc2Nvbm5lY3RhYmxlRnJvbVBhcmVudCA9IChvYmo6IERpc2Nvbm5lY3RhYmxlKSA9PiB7XG4gIGxldCBwYXJlbnQsIGNoaWxkcmVuO1xuICBkbyB7XG4gICAgaWYgKChwYXJlbnQgPSBvYmouXyRwYXJlbnQpID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjaGlsZHJlbiA9IHBhcmVudC5fJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW4hO1xuICAgIGNoaWxkcmVuLmRlbGV0ZShvYmopO1xuICAgIG9iaiA9IHBhcmVudDtcbiAgfSB3aGlsZSAoY2hpbGRyZW4/LnNpemUgPT09IDApO1xufTtcblxuY29uc3QgYWRkRGlzY29ubmVjdGFibGVUb1BhcmVudCA9IChvYmo6IERpc2Nvbm5lY3RhYmxlKSA9PiB7XG4gIC8vIENsaW1iIHRoZSBwYXJlbnQgdHJlZSwgY3JlYXRpbmcgYSBzcGFyc2UgdHJlZSBvZiBjaGlsZHJlbiBuZWVkaW5nXG4gIC8vIGRpc2Nvbm5lY3Rpb25cbiAgZm9yIChsZXQgcGFyZW50OyAocGFyZW50ID0gb2JqLl8kcGFyZW50KTsgb2JqID0gcGFyZW50KSB7XG4gICAgbGV0IGNoaWxkcmVuID0gcGFyZW50Ll8kZGlzY29ubmVjdGFibGVDaGlsZHJlbjtcbiAgICBpZiAoY2hpbGRyZW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcGFyZW50Ll8kZGlzY29ubmVjdGFibGVDaGlsZHJlbiA9IGNoaWxkcmVuID0gbmV3IFNldCgpO1xuICAgIH0gZWxzZSBpZiAoY2hpbGRyZW4uaGFzKG9iaikpIHtcbiAgICAgIC8vIE9uY2Ugd2UndmUgcmVhY2hlZCBhIHBhcmVudCB0aGF0IGFscmVhZHkgY29udGFpbnMgdGhpcyBjaGlsZCwgd2VcbiAgICAgIC8vIGNhbiBzaG9ydC1jaXJjdWl0XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY2hpbGRyZW4uYWRkKG9iaik7XG4gICAgaW5zdGFsbERpc2Nvbm5lY3RBUEkocGFyZW50KTtcbiAgfVxufTtcblxuLyoqXG4gKiBDaGFuZ2VzIHRoZSBwYXJlbnQgcmVmZXJlbmNlIG9mIHRoZSBDaGlsZFBhcnQsIGFuZCB1cGRhdGVzIHRoZSBzcGFyc2UgdHJlZSBvZlxuICogRGlzY29ubmVjdGFibGUgY2hpbGRyZW4gYWNjb3JkaW5nbHkuXG4gKlxuICogTm90ZSwgdGhpcyBtZXRob2Qgd2lsbCBiZSBwYXRjaGVkIG9udG8gQ2hpbGRQYXJ0IGluc3RhbmNlcyBhbmQgY2FsbGVkIGZyb21cbiAqIHRoZSBjb3JlIGNvZGUgd2hlbiBwYXJ0cyBhcmUgbW92ZWQgYmV0d2VlbiBkaWZmZXJlbnQgcGFyZW50cy5cbiAqL1xuZnVuY3Rpb24gcmVwYXJlbnREaXNjb25uZWN0YWJsZXModGhpczogQ2hpbGRQYXJ0LCBuZXdQYXJlbnQ6IERpc2Nvbm5lY3RhYmxlKSB7XG4gIGlmICh0aGlzLl8kZGlzY29ubmVjdGFibGVDaGlsZHJlbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmVtb3ZlRGlzY29ubmVjdGFibGVGcm9tUGFyZW50KHRoaXMpO1xuICAgIHRoaXMuXyRwYXJlbnQgPSBuZXdQYXJlbnQ7XG4gICAgYWRkRGlzY29ubmVjdGFibGVUb1BhcmVudCh0aGlzKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLl8kcGFyZW50ID0gbmV3UGFyZW50O1xuICB9XG59XG5cbi8qKlxuICogU2V0cyB0aGUgY29ubmVjdGVkIHN0YXRlIG9uIGFueSBkaXJlY3RpdmVzIGNvbnRhaW5lZCB3aXRoaW4gdGhlIGNvbW1pdHRlZFxuICogdmFsdWUgb2YgdGhpcyBwYXJ0IChpLmUuIHdpdGhpbiBhIFRlbXBsYXRlSW5zdGFuY2Ugb3IgaXRlcmFibGUgb2ZcbiAqIENoaWxkUGFydHMpIGFuZCBydW5zIHRoZWlyIGBkaXNjb25uZWN0ZWRgL2ByZWNvbm5lY3RlZGBzLCBhcyB3ZWxsIGFzIHdpdGhpblxuICogYW55IGRpcmVjdGl2ZXMgc3RvcmVkIG9uIHRoZSBDaGlsZFBhcnQgKHdoZW4gYHZhbHVlT25seWAgaXMgZmFsc2UpLlxuICpcbiAqIGBpc0NsZWFyaW5nVmFsdWVgIHNob3VsZCBiZSBwYXNzZWQgYXMgYHRydWVgIG9uIGEgdG9wLWxldmVsIHBhcnQgdGhhdCBpc1xuICogY2xlYXJpbmcgaXRzZWxmLCBhbmQgbm90IGFzIGEgcmVzdWx0IG9mIHJlY3Vyc2l2ZWx5IGRpc2Nvbm5lY3RpbmcgZGlyZWN0aXZlc1xuICogYXMgcGFydCBvZiBhIGBjbGVhcmAgb3BlcmF0aW9uIGhpZ2hlciB1cCB0aGUgdHJlZS4gVGhpcyBib3RoIGVuc3VyZXMgdGhhdCBhbnlcbiAqIGRpcmVjdGl2ZSBvbiB0aGlzIENoaWxkUGFydCB0aGF0IHByb2R1Y2VkIGEgdmFsdWUgdGhhdCBjYXVzZWQgdGhlIGNsZWFyXG4gKiBvcGVyYXRpb24gaXMgbm90IGRpc2Nvbm5lY3RlZCwgYW5kIGFsc28gc2VydmVzIGFzIGEgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uXG4gKiB0byBhdm9pZCBuZWVkbGVzcyBib29ra2VlcGluZyB3aGVuIGEgc3VidHJlZSBpcyBnb2luZyBhd2F5OyB3aGVuIGNsZWFyaW5nIGFcbiAqIHN1YnRyZWUsIG9ubHkgdGhlIHRvcC1tb3N0IHBhcnQgbmVlZCB0byByZW1vdmUgaXRzZWxmIGZyb20gdGhlIHBhcmVudC5cbiAqXG4gKiBgZnJvbVBhcnRJbmRleGAgaXMgcGFzc2VkIG9ubHkgaW4gdGhlIGNhc2Ugb2YgYSBwYXJ0aWFsIGBfY2xlYXJgIHJ1bm5pbmcgYXMgYVxuICogcmVzdWx0IG9mIHRydW5jYXRpbmcgYW4gaXRlcmFibGUuXG4gKlxuICogTm90ZSwgdGhpcyBtZXRob2Qgd2lsbCBiZSBwYXRjaGVkIG9udG8gQ2hpbGRQYXJ0IGluc3RhbmNlcyBhbmQgY2FsbGVkIGZyb20gdGhlXG4gKiBjb3JlIGNvZGUgd2hlbiBwYXJ0cyBhcmUgY2xlYXJlZCBvciB0aGUgY29ubmVjdGlvbiBzdGF0ZSBpcyBjaGFuZ2VkIGJ5IHRoZVxuICogdXNlci5cbiAqL1xuZnVuY3Rpb24gbm90aWZ5Q2hpbGRQYXJ0Q29ubmVjdGVkQ2hhbmdlZChcbiAgdGhpczogQ2hpbGRQYXJ0LFxuICBpc0Nvbm5lY3RlZDogYm9vbGVhbixcbiAgaXNDbGVhcmluZ1ZhbHVlID0gZmFsc2UsXG4gIGZyb21QYXJ0SW5kZXggPSAwXG4pIHtcbiAgY29uc3QgdmFsdWUgPSB0aGlzLl8kY29tbWl0dGVkVmFsdWU7XG4gIGNvbnN0IGNoaWxkcmVuID0gdGhpcy5fJGRpc2Nvbm5lY3RhYmxlQ2hpbGRyZW47XG4gIGlmIChjaGlsZHJlbiA9PT0gdW5kZWZpbmVkIHx8IGNoaWxkcmVuLnNpemUgPT09IDApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKGlzQ2xlYXJpbmdWYWx1ZSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgLy8gSXRlcmFibGUgY2FzZTogQW55IENoaWxkUGFydHMgY3JlYXRlZCBieSB0aGUgaXRlcmFibGUgc2hvdWxkIGJlXG4gICAgICAvLyBkaXNjb25uZWN0ZWQgYW5kIHJlbW92ZWQgZnJvbSB0aGlzIENoaWxkUGFydCdzIGRpc2Nvbm5lY3RhYmxlXG4gICAgICAvLyBjaGlsZHJlbiAoc3RhcnRpbmcgYXQgYGZyb21QYXJ0SW5kZXhgIGluIHRoZSBjYXNlIG9mIHRydW5jYXRpb24pXG4gICAgICBmb3IgKGxldCBpID0gZnJvbVBhcnRJbmRleDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5vdGlmeUNoaWxkcmVuQ29ubmVjdGVkQ2hhbmdlZCh2YWx1ZVtpXSwgZmFsc2UpO1xuICAgICAgICByZW1vdmVEaXNjb25uZWN0YWJsZUZyb21QYXJlbnQodmFsdWVbaV0pO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgLy8gVGVtcGxhdGVJbnN0YW5jZSBjYXNlOiBJZiB0aGUgdmFsdWUgaGFzIGRpc2Nvbm5lY3RhYmxlIGNoaWxkcmVuICh3aWxsXG4gICAgICAvLyBvbmx5IGJlIGluIHRoZSBjYXNlIHRoYXQgaXQgaXMgYSBUZW1wbGF0ZUluc3RhbmNlKSwgd2UgZGlzY29ubmVjdCBpdFxuICAgICAgLy8gYW5kIHJlbW92ZSBpdCBmcm9tIHRoaXMgQ2hpbGRQYXJ0J3MgZGlzY29ubmVjdGFibGUgY2hpbGRyZW5cbiAgICAgIG5vdGlmeUNoaWxkcmVuQ29ubmVjdGVkQ2hhbmdlZCh2YWx1ZSBhcyBEaXNjb25uZWN0YWJsZSwgZmFsc2UpO1xuICAgICAgcmVtb3ZlRGlzY29ubmVjdGFibGVGcm9tUGFyZW50KHZhbHVlIGFzIERpc2Nvbm5lY3RhYmxlKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbm90aWZ5Q2hpbGRyZW5Db25uZWN0ZWRDaGFuZ2VkKHRoaXMsIGlzQ29ubmVjdGVkKTtcbiAgfVxufVxuXG4vKipcbiAqIFBhdGNoZXMgZGlzY29ubmVjdGlvbiBBUEkgb250byBDaGlsZFBhcnRzLlxuICovXG5jb25zdCBpbnN0YWxsRGlzY29ubmVjdEFQSSA9IChvYmo6IERpc2Nvbm5lY3RhYmxlKSA9PiB7XG4gIGlmICgob2JqIGFzIENoaWxkUGFydCkudHlwZSA9PSBQYXJ0VHlwZS5DSElMRCkge1xuICAgIChvYmogYXMgQ2hpbGRQYXJ0KS5fJG5vdGlmeUNvbm5lY3Rpb25DaGFuZ2VkID8/PVxuICAgICAgbm90aWZ5Q2hpbGRQYXJ0Q29ubmVjdGVkQ2hhbmdlZDtcbiAgICAob2JqIGFzIENoaWxkUGFydCkuXyRyZXBhcmVudERpc2Nvbm5lY3RhYmxlcyA/Pz0gcmVwYXJlbnREaXNjb25uZWN0YWJsZXM7XG4gIH1cbn07XG5cbi8qKlxuICogQW4gYWJzdHJhY3QgYERpcmVjdGl2ZWAgYmFzZSBjbGFzcyB3aG9zZSBgZGlzY29ubmVjdGVkYCBtZXRob2Qgd2lsbCBiZVxuICogY2FsbGVkIHdoZW4gdGhlIHBhcnQgY29udGFpbmluZyB0aGUgZGlyZWN0aXZlIGlzIGNsZWFyZWQgYXMgYSByZXN1bHQgb2ZcbiAqIHJlLXJlbmRlcmluZywgb3Igd2hlbiB0aGUgdXNlciBjYWxscyBgcGFydC5zZXRDb25uZWN0ZWQoZmFsc2UpYCBvblxuICogYSBwYXJ0IHRoYXQgd2FzIHByZXZpb3VzbHkgcmVuZGVyZWQgY29udGFpbmluZyB0aGUgZGlyZWN0aXZlIChhcyBoYXBwZW5zXG4gKiB3aGVuIGUuZy4gYSBMaXRFbGVtZW50IGRpc2Nvbm5lY3RzIGZyb20gdGhlIERPTSkuXG4gKlxuICogSWYgYHBhcnQuc2V0Q29ubmVjdGVkKHRydWUpYCBpcyBzdWJzZXF1ZW50bHkgY2FsbGVkIG9uIGFcbiAqIGNvbnRhaW5pbmcgcGFydCwgdGhlIGRpcmVjdGl2ZSdzIGByZWNvbm5lY3RlZGAgbWV0aG9kIHdpbGwgYmUgY2FsbGVkIHByaW9yXG4gKiB0byBpdHMgbmV4dCBgdXBkYXRlYC9gcmVuZGVyYCBjYWxsYmFja3MuIFdoZW4gaW1wbGVtZW50aW5nIGBkaXNjb25uZWN0ZWRgLFxuICogYHJlY29ubmVjdGVkYCBzaG91bGQgYWxzbyBiZSBpbXBsZW1lbnRlZCB0byBiZSBjb21wYXRpYmxlIHdpdGggcmVjb25uZWN0aW9uLlxuICpcbiAqIE5vdGUgdGhhdCB1cGRhdGVzIG1heSBvY2N1ciB3aGlsZSB0aGUgZGlyZWN0aXZlIGlzIGRpc2Nvbm5lY3RlZC4gQXMgc3VjaCxcbiAqIGRpcmVjdGl2ZXMgc2hvdWxkIGdlbmVyYWxseSBjaGVjayB0aGUgYHRoaXMuaXNDb25uZWN0ZWRgIGZsYWcgZHVyaW5nXG4gKiByZW5kZXIvdXBkYXRlIHRvIGRldGVybWluZSB3aGV0aGVyIGl0IGlzIHNhZmUgdG8gc3Vic2NyaWJlIHRvIHJlc291cmNlc1xuICogdGhhdCBtYXkgcHJldmVudCBnYXJiYWdlIGNvbGxlY3Rpb24uXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBc3luY0RpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIC8vIEFzIG9wcG9zZWQgdG8gb3RoZXIgRGlzY29ubmVjdGFibGVzLCBBc3luY0RpcmVjdGl2ZXMgYWx3YXlzIGdldCBub3RpZmllZFxuICAvLyB3aGVuIHRoZSBSb290UGFydCBjb25uZWN0aW9uIGNoYW5nZXMsIHNvIHRoZSBwdWJsaWMgYGlzQ29ubmVjdGVkYFxuICAvLyBpcyBhIGxvY2FsbHkgc3RvcmVkIHZhcmlhYmxlIGluaXRpYWxpemVkIHZpYSBpdHMgcGFydCdzIGdldHRlciBhbmQgc3luY2VkXG4gIC8vIHZpYSBgXyRub3RpZnlEaXJlY3RpdmVDb25uZWN0aW9uQ2hhbmdlZGAuIFRoaXMgaXMgY2hlYXBlciB0aGFuIHVzaW5nXG4gIC8vIHRoZSBfJGlzQ29ubmVjdGVkIGdldHRlciwgd2hpY2ggaGFzIHRvIGxvb2sgYmFjayB1cCB0aGUgdHJlZSBlYWNoIHRpbWUuXG4gIC8qKlxuICAgKiBUaGUgY29ubmVjdGlvbiBzdGF0ZSBmb3IgdGhpcyBEaXJlY3RpdmUuXG4gICAqL1xuICBpc0Nvbm5lY3RlZCE6IGJvb2xlYW47XG5cbiAgLy8gQGludGVybmFsXG4gIG92ZXJyaWRlIF8kZGlzY29ubmVjdGFibGVDaGlsZHJlbj86IFNldDxEaXNjb25uZWN0YWJsZT4gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHRoZSBwYXJ0IHdpdGggaW50ZXJuYWwgZmllbGRzXG4gICAqIEBwYXJhbSBwYXJ0XG4gICAqIEBwYXJhbSBwYXJlbnRcbiAgICogQHBhcmFtIGF0dHJpYnV0ZUluZGV4XG4gICAqL1xuICBvdmVycmlkZSBfJGluaXRpYWxpemUoXG4gICAgcGFydDogUGFydCxcbiAgICBwYXJlbnQ6IERpc2Nvbm5lY3RhYmxlLFxuICAgIGF0dHJpYnV0ZUluZGV4OiBudW1iZXIgfCB1bmRlZmluZWRcbiAgKSB7XG4gICAgc3VwZXIuXyRpbml0aWFsaXplKHBhcnQsIHBhcmVudCwgYXR0cmlidXRlSW5kZXgpO1xuICAgIGFkZERpc2Nvbm5lY3RhYmxlVG9QYXJlbnQodGhpcyk7XG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IHBhcnQuXyRpc0Nvbm5lY3RlZDtcbiAgfVxuICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAvKipcbiAgICogQ2FsbGVkIGZyb20gdGhlIGNvcmUgY29kZSB3aGVuIGEgZGlyZWN0aXZlIGlzIGdvaW5nIGF3YXkgZnJvbSBhIHBhcnQgKGluXG4gICAqIHdoaWNoIGNhc2UgYHNob3VsZFJlbW92ZUZyb21QYXJlbnRgIHNob3VsZCBiZSB0cnVlKSwgYW5kIGZyb20gdGhlXG4gICAqIGBzZXRDaGlsZHJlbkNvbm5lY3RlZGAgaGVscGVyIGZ1bmN0aW9uIHdoZW4gcmVjdXJzaXZlbHkgY2hhbmdpbmcgdGhlXG4gICAqIGNvbm5lY3Rpb24gc3RhdGUgb2YgYSB0cmVlIChpbiB3aGljaCBjYXNlIGBzaG91bGRSZW1vdmVGcm9tUGFyZW50YCBzaG91bGRcbiAgICogYmUgZmFsc2UpLlxuICAgKlxuICAgKiBAcGFyYW0gaXNDb25uZWN0ZWRcbiAgICogQHBhcmFtIGlzQ2xlYXJpbmdEaXJlY3RpdmUgLSBUcnVlIHdoZW4gdGhlIGRpcmVjdGl2ZSBpdHNlbGYgaXMgYmVpbmdcbiAgICogICAgIHJlbW92ZWQ7IGZhbHNlIHdoZW4gdGhlIHRyZWUgaXMgYmVpbmcgZGlzY29ubmVjdGVkXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgb3ZlcnJpZGUgWydfJG5vdGlmeURpcmVjdGl2ZUNvbm5lY3Rpb25DaGFuZ2VkJ10oXG4gICAgaXNDb25uZWN0ZWQ6IGJvb2xlYW4sXG4gICAgaXNDbGVhcmluZ0RpcmVjdGl2ZSA9IHRydWVcbiAgKSB7XG4gICAgaWYgKGlzQ29ubmVjdGVkICE9PSB0aGlzLmlzQ29ubmVjdGVkKSB7XG4gICAgICB0aGlzLmlzQ29ubmVjdGVkID0gaXNDb25uZWN0ZWQ7XG4gICAgICBpZiAoaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgdGhpcy5yZWNvbm5lY3RlZD8uKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmRpc2Nvbm5lY3RlZD8uKCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpc0NsZWFyaW5nRGlyZWN0aXZlKSB7XG4gICAgICBub3RpZnlDaGlsZHJlbkNvbm5lY3RlZENoYW5nZWQodGhpcywgaXNDb25uZWN0ZWQpO1xuICAgICAgcmVtb3ZlRGlzY29ubmVjdGFibGVGcm9tUGFyZW50KHRoaXMpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiB0aGUgZGlyZWN0aXZlJ3MgUGFydCBvdXRzaWRlIHRoZSBub3JtYWwgYHVwZGF0ZWAvYHJlbmRlcmBcbiAgICogbGlmZWN5Y2xlIG9mIGEgZGlyZWN0aXZlLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBzaG91bGQgbm90IGJlIGNhbGxlZCBzeW5jaHJvbm91c2x5IGZyb20gYSBkaXJlY3RpdmUncyBgdXBkYXRlYFxuICAgKiBvciBgcmVuZGVyYC5cbiAgICpcbiAgICogQHBhcmFtIGRpcmVjdGl2ZSBUaGUgZGlyZWN0aXZlIHRvIHVwZGF0ZVxuICAgKiBAcGFyYW0gdmFsdWUgVGhlIHZhbHVlIHRvIHNldFxuICAgKi9cbiAgc2V0VmFsdWUodmFsdWU6IHVua25vd24pIHtcbiAgICBpZiAoaXNTaW5nbGVFeHByZXNzaW9uKHRoaXMuX19wYXJ0IGFzIHVua25vd24gYXMgUGFydEluZm8pKSB7XG4gICAgICB0aGlzLl9fcGFydC5fJHNldFZhbHVlKHZhbHVlLCB0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gdGhpcy5fX2F0dHJpYnV0ZUluZGV4IHdpbGwgYmUgZGVmaW5lZCBpbiB0aGlzIGNhc2UsIGJ1dFxuICAgICAgLy8gYXNzZXJ0IGl0IGluIGRldiBtb2RlXG4gICAgICBpZiAoREVWX01PREUgJiYgdGhpcy5fX2F0dHJpYnV0ZUluZGV4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCB0aGlzLl9fYXR0cmlidXRlSW5kZXggdG8gYmUgYSBudW1iZXJgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5ld1ZhbHVlcyA9IFsuLi4odGhpcy5fX3BhcnQuXyRjb21taXR0ZWRWYWx1ZSBhcyBBcnJheTx1bmtub3duPildO1xuICAgICAgbmV3VmFsdWVzW3RoaXMuX19hdHRyaWJ1dGVJbmRleCFdID0gdmFsdWU7XG4gICAgICAodGhpcy5fX3BhcnQgYXMgQXR0cmlidXRlUGFydCkuXyRzZXRWYWx1ZShuZXdWYWx1ZXMsIHRoaXMsIDApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBVc2VyIGNhbGxiYWNrcyBmb3IgaW1wbGVtZW50aW5nIGxvZ2ljIHRvIHJlbGVhc2UgYW55IHJlc291cmNlcy9zdWJzY3JpcHRpb25zXG4gICAqIHRoYXQgbWF5IGhhdmUgYmVlbiByZXRhaW5lZCBieSB0aGlzIGRpcmVjdGl2ZS4gU2luY2UgZGlyZWN0aXZlcyBtYXkgYWxzbyBiZVxuICAgKiByZS1jb25uZWN0ZWQsIGByZWNvbm5lY3RlZGAgc2hvdWxkIGFsc28gYmUgaW1wbGVtZW50ZWQgdG8gcmVzdG9yZSB0aGVcbiAgICogd29ya2luZyBzdGF0ZSBvZiB0aGUgZGlyZWN0aXZlIHByaW9yIHRvIHRoZSBuZXh0IHJlbmRlci5cbiAgICovXG4gIHByb3RlY3RlZCBkaXNjb25uZWN0ZWQoKSB7fVxuICBwcm90ZWN0ZWQgcmVjb25uZWN0ZWQoKSB7fVxufVxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjAgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5pbXBvcnQge25vdGhpbmcsIEVsZW1lbnRQYXJ0fSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgQXN5bmNEaXJlY3RpdmV9IGZyb20gJy4uL2FzeW5jLWRpcmVjdGl2ZS5qcyc7XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBSZWYgb2JqZWN0LCB3aGljaCBpcyBjb250YWluZXIgZm9yIGEgcmVmZXJlbmNlIHRvIGFuIGVsZW1lbnQuXG4gKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVSZWYgPSA8VCA9IEVsZW1lbnQ+KCkgPT4gbmV3IFJlZjxUPigpO1xuXG4vKipcbiAqIEFuIG9iamVjdCB0aGF0IGhvbGRzIGEgcmVmIHZhbHVlLlxuICovXG5jbGFzcyBSZWY8VCA9IEVsZW1lbnQ+IHtcbiAgLyoqXG4gICAqIFRoZSBjdXJyZW50IEVsZW1lbnQgdmFsdWUgb2YgdGhlIHJlZiwgb3IgZWxzZSBgdW5kZWZpbmVkYCBpZiB0aGUgcmVmIGlzIG5vXG4gICAqIGxvbmdlciByZW5kZXJlZC5cbiAgICovXG4gIHJlYWRvbmx5IHZhbHVlPzogVDtcbn1cblxuZXhwb3J0IHR5cGUge1JlZn07XG5cbmludGVyZmFjZSBSZWZJbnRlcm5hbCB7XG4gIHZhbHVlOiBFbGVtZW50IHwgdW5kZWZpbmVkO1xufVxuXG4vLyBXaGVuIGNhbGxiYWNrcyBhcmUgdXNlZCBmb3IgcmVmcywgdGhpcyBtYXAgdHJhY2tzIHRoZSBsYXN0IHZhbHVlIHRoZSBjYWxsYmFja1xuLy8gd2FzIGNhbGxlZCB3aXRoLCBmb3IgZW5zdXJpbmcgYSBkaXJlY3RpdmUgZG9lc24ndCBjbGVhciB0aGUgcmVmIGlmIHRoZSByZWZcbi8vIGhhcyBhbHJlYWR5IGJlZW4gcmVuZGVyZWQgdG8gYSBuZXcgc3BvdC4gSXQgaXMgZG91YmxlLWtleWVkIG9uIGJvdGggdGhlXG4vLyBjb250ZXh0IChgb3B0aW9ucy5ob3N0YCkgYW5kIHRoZSBjYWxsYmFjaywgc2luY2Ugd2UgYXV0by1iaW5kIGNsYXNzIG1ldGhvZHNcbi8vIHRvIGBvcHRpb25zLmhvc3RgLlxuY29uc3QgbGFzdEVsZW1lbnRGb3JDb250ZXh0QW5kQ2FsbGJhY2s6IFdlYWtNYXA8XG4gIG9iamVjdCxcbiAgV2Vha01hcDxGdW5jdGlvbiwgRWxlbWVudCB8IHVuZGVmaW5lZD5cbj4gPSBuZXcgV2Vha01hcCgpO1xuXG5leHBvcnQgdHlwZSBSZWZPckNhbGxiYWNrID0gUmVmIHwgKChlbDogRWxlbWVudCB8IHVuZGVmaW5lZCkgPT4gdm9pZCk7XG5cbmNsYXNzIFJlZkRpcmVjdGl2ZSBleHRlbmRzIEFzeW5jRGlyZWN0aXZlIHtcbiAgcHJpdmF0ZSBfZWxlbWVudD86IEVsZW1lbnQ7XG4gIHByaXZhdGUgX3JlZj86IFJlZk9yQ2FsbGJhY2s7XG4gIHByaXZhdGUgX2NvbnRleHQ/OiBvYmplY3Q7XG5cbiAgcmVuZGVyKF9yZWY6IFJlZk9yQ2FsbGJhY2spIHtcbiAgICByZXR1cm4gbm90aGluZztcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShwYXJ0OiBFbGVtZW50UGFydCwgW3JlZl06IFBhcmFtZXRlcnM8dGhpc1sncmVuZGVyJ10+KSB7XG4gICAgY29uc3QgcmVmQ2hhbmdlZCA9IHJlZiAhPT0gdGhpcy5fcmVmO1xuICAgIGlmIChyZWZDaGFuZ2VkICYmIHRoaXMuX3JlZiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBUaGUgcmVmIHBhc3NlZCB0byB0aGUgZGlyZWN0aXZlIGhhcyBjaGFuZ2VkO1xuICAgICAgLy8gdW5zZXQgdGhlIHByZXZpb3VzIHJlZidzIHZhbHVlXG4gICAgICB0aGlzLl91cGRhdGVSZWZWYWx1ZSh1bmRlZmluZWQpO1xuICAgIH1cbiAgICBpZiAocmVmQ2hhbmdlZCB8fCB0aGlzLl9sYXN0RWxlbWVudEZvclJlZiAhPT0gdGhpcy5fZWxlbWVudCkge1xuICAgICAgLy8gV2UgZWl0aGVyIGdvdCBhIG5ldyByZWYgb3IgdGhpcyBpcyB0aGUgZmlyc3QgcmVuZGVyO1xuICAgICAgLy8gc3RvcmUgdGhlIHJlZi9lbGVtZW50ICYgdXBkYXRlIHRoZSByZWYgdmFsdWVcbiAgICAgIHRoaXMuX3JlZiA9IHJlZjtcbiAgICAgIHRoaXMuX2NvbnRleHQgPSBwYXJ0Lm9wdGlvbnM/Lmhvc3Q7XG4gICAgICB0aGlzLl91cGRhdGVSZWZWYWx1ZSgodGhpcy5fZWxlbWVudCA9IHBhcnQuZWxlbWVudCkpO1xuICAgIH1cbiAgICByZXR1cm4gbm90aGluZztcbiAgfVxuXG4gIHByaXZhdGUgX3VwZGF0ZVJlZlZhbHVlKGVsZW1lbnQ6IEVsZW1lbnQgfCB1bmRlZmluZWQpIHtcbiAgICBpZiAodHlwZW9mIHRoaXMuX3JlZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgLy8gSWYgdGhlIGN1cnJlbnQgcmVmIHdhcyBjYWxsZWQgd2l0aCBhIHByZXZpb3VzIHZhbHVlLCBjYWxsIHdpdGhcbiAgICAgIC8vIGB1bmRlZmluZWRgOyBXZSBkbyB0aGlzIHRvIGVuc3VyZSBjYWxsYmFja3MgYXJlIGNhbGxlZCBpbiBhIGNvbnNpc3RlbnRcbiAgICAgIC8vIHdheSByZWdhcmRsZXNzIG9mIHdoZXRoZXIgYSByZWYgbWlnaHQgYmUgbW92aW5nIHVwIGluIHRoZSB0cmVlIChpblxuICAgICAgLy8gd2hpY2ggY2FzZSBpdCB3b3VsZCBvdGhlcndpc2UgYmUgY2FsbGVkIHdpdGggdGhlIG5ldyB2YWx1ZSBiZWZvcmUgdGhlXG4gICAgICAvLyBwcmV2aW91cyBvbmUgdW5zZXRzIGl0KSBhbmQgZG93biBpbiB0aGUgdHJlZSAod2hlcmUgaXQgd291bGQgYmUgdW5zZXRcbiAgICAgIC8vIGJlZm9yZSBiZWluZyBzZXQpLiBOb3RlIHRoYXQgZWxlbWVudCBsb29rdXAgaXMga2V5ZWQgYnlcbiAgICAgIC8vIGJvdGggdGhlIGNvbnRleHQgYW5kIHRoZSBjYWxsYmFjaywgc2luY2Ugd2UgYWxsb3cgcGFzc2luZyB1bmJvdW5kXG4gICAgICAvLyBmdW5jdGlvbnMgdGhhdCBhcmUgY2FsbGVkIG9uIG9wdGlvbnMuaG9zdCwgYW5kIHdlIHdhbnQgdG8gdHJlYXRcbiAgICAgIC8vIHRoZXNlIGFzIHVuaXF1ZSBcImluc3RhbmNlc1wiIG9mIGEgZnVuY3Rpb24uXG4gICAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5fY29udGV4dCA/PyBnbG9iYWxUaGlzO1xuICAgICAgbGV0IGxhc3RFbGVtZW50Rm9yQ2FsbGJhY2sgPVxuICAgICAgICBsYXN0RWxlbWVudEZvckNvbnRleHRBbmRDYWxsYmFjay5nZXQoY29udGV4dCk7XG4gICAgICBpZiAobGFzdEVsZW1lbnRGb3JDYWxsYmFjayA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGxhc3RFbGVtZW50Rm9yQ2FsbGJhY2sgPSBuZXcgV2Vha01hcCgpO1xuICAgICAgICBsYXN0RWxlbWVudEZvckNvbnRleHRBbmRDYWxsYmFjay5zZXQoY29udGV4dCwgbGFzdEVsZW1lbnRGb3JDYWxsYmFjayk7XG4gICAgICB9XG4gICAgICBpZiAobGFzdEVsZW1lbnRGb3JDYWxsYmFjay5nZXQodGhpcy5fcmVmKSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX3JlZi5jYWxsKHRoaXMuX2NvbnRleHQsIHVuZGVmaW5lZCk7XG4gICAgICB9XG4gICAgICBsYXN0RWxlbWVudEZvckNhbGxiYWNrLnNldCh0aGlzLl9yZWYsIGVsZW1lbnQpO1xuICAgICAgLy8gQ2FsbCB0aGUgcmVmIHdpdGggdGhlIG5ldyBlbGVtZW50IHZhbHVlXG4gICAgICBpZiAoZWxlbWVudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX3JlZi5jYWxsKHRoaXMuX2NvbnRleHQsIGVsZW1lbnQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAodGhpcy5fcmVmIGFzIFJlZkludGVybmFsKSEudmFsdWUgPSBlbGVtZW50O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0IF9sYXN0RWxlbWVudEZvclJlZigpIHtcbiAgICByZXR1cm4gdHlwZW9mIHRoaXMuX3JlZiA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgPyBsYXN0RWxlbWVudEZvckNvbnRleHRBbmRDYWxsYmFja1xuICAgICAgICAgIC5nZXQodGhpcy5fY29udGV4dCA/PyBnbG9iYWxUaGlzKVxuICAgICAgICAgID8uZ2V0KHRoaXMuX3JlZilcbiAgICAgIDogdGhpcy5fcmVmPy52YWx1ZTtcbiAgfVxuXG4gIG92ZXJyaWRlIGRpc2Nvbm5lY3RlZCgpIHtcbiAgICAvLyBPbmx5IGNsZWFyIHRoZSBib3ggaWYgb3VyIGVsZW1lbnQgaXMgc3RpbGwgdGhlIG9uZSBpbiBpdCAoaS5lLiBhbm90aGVyXG4gICAgLy8gZGlyZWN0aXZlIGluc3RhbmNlIGhhc24ndCByZW5kZXJlZCBpdHMgZWxlbWVudCB0byBpdCBiZWZvcmUgdXMpOyB0aGF0XG4gICAgLy8gb25seSBoYXBwZW5zIGluIHRoZSBldmVudCBvZiB0aGUgZGlyZWN0aXZlIGJlaW5nIGNsZWFyZWQgKG5vdCB2aWEgbWFudWFsXG4gICAgLy8gZGlzY29ubmVjdGlvbilcbiAgICBpZiAodGhpcy5fbGFzdEVsZW1lbnRGb3JSZWYgPT09IHRoaXMuX2VsZW1lbnQpIHtcbiAgICAgIHRoaXMuX3VwZGF0ZVJlZlZhbHVlKHVuZGVmaW5lZCk7XG4gICAgfVxuICB9XG5cbiAgb3ZlcnJpZGUgcmVjb25uZWN0ZWQoKSB7XG4gICAgLy8gSWYgd2Ugd2VyZSBtYW51YWxseSBkaXNjb25uZWN0ZWQsIHdlIGNhbiBzYWZlbHkgcHV0IG91ciBlbGVtZW50IGJhY2sgaW5cbiAgICAvLyB0aGUgYm94LCBzaW5jZSBubyByZW5kZXJpbmcgY291bGQgaGF2ZSBvY2N1cnJlZCB0byBjaGFuZ2UgaXRzIHN0YXRlXG4gICAgdGhpcy5fdXBkYXRlUmVmVmFsdWUodGhpcy5fZWxlbWVudCk7XG4gIH1cbn1cblxuLyoqXG4gKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIFJlZiBvYmplY3Qgb3IgY2FsbHMgYSByZWYgY2FsbGJhY2sgd2l0aCB0aGUgZWxlbWVudCBpdCdzXG4gKiBib3VuZCB0by5cbiAqXG4gKiBBIFJlZiBvYmplY3QgYWN0cyBhcyBhIGNvbnRhaW5lciBmb3IgYSByZWZlcmVuY2UgdG8gYW4gZWxlbWVudC4gQSByZWZcbiAqIGNhbGxiYWNrIGlzIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhbiBlbGVtZW50IGFzIGl0cyBvbmx5IGFyZ3VtZW50LlxuICpcbiAqIFRoZSByZWYgZGlyZWN0aXZlIHNldHMgdGhlIHZhbHVlIG9mIHRoZSBSZWYgb2JqZWN0IG9yIGNhbGxzIHRoZSByZWYgY2FsbGJhY2tcbiAqIGR1cmluZyByZW5kZXJpbmcsIGlmIHRoZSByZWZlcmVuY2VkIGVsZW1lbnQgY2hhbmdlZC5cbiAqXG4gKiBOb3RlOiBJZiBhIHJlZiBjYWxsYmFjayBpcyByZW5kZXJlZCB0byBhIGRpZmZlcmVudCBlbGVtZW50IHBvc2l0aW9uIG9yIGlzXG4gKiByZW1vdmVkIGluIGEgc3Vic2VxdWVudCByZW5kZXIsIGl0IHdpbGwgZmlyc3QgYmUgY2FsbGVkIHdpdGggYHVuZGVmaW5lZGAsXG4gKiBmb2xsb3dlZCBieSBhbm90aGVyIGNhbGwgd2l0aCB0aGUgbmV3IGVsZW1lbnQgaXQgd2FzIHJlbmRlcmVkIHRvIChpZiBhbnkpLlxuICpcbiAqIGBgYGpzXG4gKiAvLyBVc2luZyBSZWYgb2JqZWN0XG4gKiBjb25zdCBpbnB1dFJlZiA9IGNyZWF0ZVJlZigpO1xuICogcmVuZGVyKGh0bWxgPGlucHV0ICR7cmVmKGlucHV0UmVmKX0+YCwgY29udGFpbmVyKTtcbiAqIGlucHV0UmVmLnZhbHVlLmZvY3VzKCk7XG4gKlxuICogLy8gVXNpbmcgY2FsbGJhY2tcbiAqIGNvbnN0IGNhbGxiYWNrID0gKGlucHV0RWxlbWVudCkgPT4gaW5wdXRFbGVtZW50LmZvY3VzKCk7XG4gKiByZW5kZXIoaHRtbGA8aW5wdXQgJHtyZWYoY2FsbGJhY2spfT5gLCBjb250YWluZXIpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCByZWYgPSBkaXJlY3RpdmUoUmVmRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtSZWZEaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjEgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbi8vIE5vdGUsIHRoaXMgbW9kdWxlIGlzIG5vdCBpbmNsdWRlZCBpbiBwYWNrYWdlIGV4cG9ydHMgc28gdGhhdCBpdCdzIHByaXZhdGUgdG9cbi8vIG91ciBmaXJzdC1wYXJ0eSBkaXJlY3RpdmVzLiBJZiBpdCBlbmRzIHVwIGJlaW5nIHVzZWZ1bCwgd2UgY2FuIG9wZW4gaXQgdXAgYW5kXG4vLyBleHBvcnQgaXQuXG5cbi8qKlxuICogSGVscGVyIHRvIGl0ZXJhdGUgYW4gQXN5bmNJdGVyYWJsZSBpbiBpdHMgb3duIGNsb3N1cmUuXG4gKiBAcGFyYW0gaXRlcmFibGUgVGhlIGl0ZXJhYmxlIHRvIGl0ZXJhdGVcbiAqIEBwYXJhbSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgdG8gY2FsbCBmb3IgZWFjaCB2YWx1ZS4gSWYgdGhlIGNhbGxiYWNrIHJldHVybnNcbiAqIGBmYWxzZWAsIHRoZSBsb29wIHdpbGwgYmUgYnJva2VuLlxuICovXG5leHBvcnQgY29uc3QgZm9yQXdhaXRPZiA9IGFzeW5jIDxUPihcbiAgaXRlcmFibGU6IEFzeW5jSXRlcmFibGU8VD4sXG4gIGNhbGxiYWNrOiAodmFsdWU6IFQpID0+IFByb21pc2U8Ym9vbGVhbj5cbikgPT4ge1xuICBmb3IgYXdhaXQgKGNvbnN0IHYgb2YgaXRlcmFibGUpIHtcbiAgICBpZiAoKGF3YWl0IGNhbGxiYWNrKHYpKSA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogSG9sZHMgYSByZWZlcmVuY2UgdG8gYW4gaW5zdGFuY2UgdGhhdCBjYW4gYmUgZGlzY29ubmVjdGVkIGFuZCByZWNvbm5lY3RlZCxcbiAqIHNvIHRoYXQgYSBjbG9zdXJlIG92ZXIgdGhlIHJlZiAoZS5nLiBpbiBhIHRoZW4gZnVuY3Rpb24gdG8gYSBwcm9taXNlKSBkb2VzXG4gKiBub3Qgc3Ryb25nbHkgaG9sZCBhIHJlZiB0byB0aGUgaW5zdGFuY2UuIEFwcHJveGltYXRlcyBhIFdlYWtSZWYgYnV0IG11c3RcbiAqIGJlIG1hbnVhbGx5IGNvbm5lY3RlZCAmIGRpc2Nvbm5lY3RlZCB0byB0aGUgYmFja2luZyBpbnN0YW5jZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFBzZXVkb1dlYWtSZWY8VD4ge1xuICBwcml2YXRlIF9yZWY/OiBUO1xuICBjb25zdHJ1Y3RvcihyZWY6IFQpIHtcbiAgICB0aGlzLl9yZWYgPSByZWY7XG4gIH1cbiAgLyoqXG4gICAqIERpc2Fzc29jaWF0ZXMgdGhlIHJlZiB3aXRoIHRoZSBiYWNraW5nIGluc3RhbmNlLlxuICAgKi9cbiAgZGlzY29ubmVjdCgpIHtcbiAgICB0aGlzLl9yZWYgPSB1bmRlZmluZWQ7XG4gIH1cbiAgLyoqXG4gICAqIFJlYXNzb2NpYXRlcyB0aGUgcmVmIHdpdGggdGhlIGJhY2tpbmcgaW5zdGFuY2UuXG4gICAqL1xuICByZWNvbm5lY3QocmVmOiBUKSB7XG4gICAgdGhpcy5fcmVmID0gcmVmO1xuICB9XG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgdGhlIGJhY2tpbmcgaW5zdGFuY2UgKHdpbGwgYmUgdW5kZWZpbmVkIHdoZW4gZGlzY29ubmVjdGVkKVxuICAgKi9cbiAgZGVyZWYoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3JlZjtcbiAgfVxufVxuXG4vKipcbiAqIEEgaGVscGVyIHRvIHBhdXNlIGFuZCByZXN1bWUgd2FpdGluZyBvbiBhIGNvbmRpdGlvbiBpbiBhbiBhc3luYyBmdW5jdGlvblxuICovXG5leHBvcnQgY2xhc3MgUGF1c2VyIHtcbiAgcHJpdmF0ZSBfcHJvbWlzZT86IFByb21pc2U8dm9pZD4gPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX3Jlc29sdmU/OiAoKSA9PiB2b2lkID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogV2hlbiBwYXVzZWQsIHJldHVybnMgYSBwcm9taXNlIHRvIGJlIGF3YWl0ZWQ7IHdoZW4gdW5wYXVzZWQsIHJldHVybnNcbiAgICogdW5kZWZpbmVkLiBOb3RlIHRoYXQgaW4gdGhlIG1pY3JvdGFzayBiZXR3ZWVuIHRoZSBwYXVzZXIgYmVpbmcgcmVzdW1lZFxuICAgKiBhbiBhbiBhd2FpdCBvZiB0aGlzIHByb21pc2UgcmVzb2x2aW5nLCB0aGUgcGF1c2VyIGNvdWxkIGJlIHBhdXNlZCBhZ2FpbixcbiAgICogaGVuY2UgY2FsbGVycyBzaG91bGQgY2hlY2sgdGhlIHByb21pc2UgaW4gYSBsb29wIHdoZW4gYXdhaXRpbmcuXG4gICAqIEByZXR1cm5zIEEgcHJvbWlzZSB0byBiZSBhd2FpdGVkIHdoZW4gcGF1c2VkIG9yIHVuZGVmaW5lZFxuICAgKi9cbiAgZ2V0KCkge1xuICAgIHJldHVybiB0aGlzLl9wcm9taXNlO1xuICB9XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgcHJvbWlzZSB0byBiZSBhd2FpdGVkXG4gICAqL1xuICBwYXVzZSgpIHtcbiAgICB0aGlzLl9wcm9taXNlID8/PSBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gKHRoaXMuX3Jlc29sdmUgPSByZXNvbHZlKSk7XG4gIH1cbiAgLyoqXG4gICAqIFJlc29sdmVzIHRoZSBwcm9taXNlIHdoaWNoIG1heSBiZSBhd2FpdGVkXG4gICAqL1xuICByZXN1bWUoKSB7XG4gICAgdGhpcy5fcmVzb2x2ZT8uKCk7XG4gICAgdGhpcy5fcHJvbWlzZSA9IHRoaXMuX3Jlc29sdmUgPSB1bmRlZmluZWQ7XG4gIH1cbn1cbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge0NoaWxkUGFydCwgbm9DaGFuZ2V9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7XG4gIEFzeW5jRGlyZWN0aXZlLFxuICBkaXJlY3RpdmUsXG4gIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG59IGZyb20gJy4uL2FzeW5jLWRpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge1BhdXNlciwgUHNldWRvV2Vha1JlZiwgZm9yQXdhaXRPZn0gZnJvbSAnLi9wcml2YXRlLWFzeW5jLWhlbHBlcnMuanMnO1xuXG50eXBlIE1hcHBlcjxUPiA9ICh2OiBULCBpbmRleD86IG51bWJlcikgPT4gdW5rbm93bjtcblxuZXhwb3J0IGNsYXNzIEFzeW5jUmVwbGFjZURpcmVjdGl2ZSBleHRlbmRzIEFzeW5jRGlyZWN0aXZlIHtcbiAgcHJpdmF0ZSBfX3ZhbHVlPzogQXN5bmNJdGVyYWJsZTx1bmtub3duPjtcbiAgcHJpdmF0ZSBfX3dlYWtUaGlzID0gbmV3IFBzZXVkb1dlYWtSZWYodGhpcyk7XG4gIHByaXZhdGUgX19wYXVzZXIgPSBuZXcgUGF1c2VyKCk7XG5cbiAgLy8gQHRzLWV4cGVjdC1lcnJvciB2YWx1ZSBub3QgdXNlZCwgYnV0IHdlIHdhbnQgYSBuaWNlIHBhcmFtZXRlciBmb3IgZG9jc1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gIHJlbmRlcjxUPih2YWx1ZTogQXN5bmNJdGVyYWJsZTxUPiwgX21hcHBlcj86IE1hcHBlcjxUPikge1xuICAgIHJldHVybiBub0NoYW5nZTtcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShcbiAgICBfcGFydDogQ2hpbGRQYXJ0LFxuICAgIFt2YWx1ZSwgbWFwcGVyXTogRGlyZWN0aXZlUGFyYW1ldGVyczx0aGlzPlxuICApIHtcbiAgICAvLyBJZiBvdXIgaW5pdGlhbCByZW5kZXIgb2NjdXJzIHdoaWxlIGRpc2Nvbm5lY3RlZCwgZW5zdXJlIHRoYXQgdGhlIHBhdXNlclxuICAgIC8vIGFuZCB3ZWFrVGhpcyBhcmUgaW4gdGhlIGRpc2Nvbm5lY3RlZCBzdGF0ZVxuICAgIGlmICghdGhpcy5pc0Nvbm5lY3RlZCkge1xuICAgICAgdGhpcy5kaXNjb25uZWN0ZWQoKTtcbiAgICB9XG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBzZXQgdXAgdGhpcyBwYXJ0aWN1bGFyIGl0ZXJhYmxlLCB3ZSBkb24ndCBuZWVkXG4gICAgLy8gdG8gZG8gYW55dGhpbmcuXG4gICAgaWYgKHZhbHVlID09PSB0aGlzLl9fdmFsdWUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fX3ZhbHVlID0gdmFsdWU7XG4gICAgbGV0IGkgPSAwO1xuICAgIGNvbnN0IHtfX3dlYWtUaGlzOiB3ZWFrVGhpcywgX19wYXVzZXI6IHBhdXNlcn0gPSB0aGlzO1xuICAgIC8vIE5vdGUsIHRoZSBjYWxsYmFjayBhdm9pZHMgY2xvc2luZyBvdmVyIGB0aGlzYCBzbyB0aGF0IHRoZSBkaXJlY3RpdmVcbiAgICAvLyBjYW4gYmUgZ2MnZWQgYmVmb3JlIHRoZSBwcm9taXNlIHJlc29sdmVzOyBpbnN0ZWFkIGB0aGlzYCBpcyByZXRyaWV2ZWRcbiAgICAvLyBmcm9tIGB3ZWFrVGhpc2AsIHdoaWNoIGNhbiBicmVhayB0aGUgaGFyZCByZWZlcmVuY2UgaW4gdGhlIGNsb3N1cmUgd2hlblxuICAgIC8vIHRoZSBkaXJlY3RpdmUgZGlzY29ubmVjdHNcbiAgICBmb3JBd2FpdE9mKHZhbHVlLCBhc3luYyAodjogdW5rbm93bikgPT4ge1xuICAgICAgLy8gVGhlIHdoaWxlIGxvb3AgaGVyZSBoYW5kbGVzIHRoZSBjYXNlIHRoYXQgdGhlIGNvbm5lY3Rpb24gc3RhdGVcbiAgICAgIC8vIHRocmFzaGVzLCBjYXVzaW5nIHRoZSBwYXVzZXIgdG8gcmVzdW1lIGFuZCB0aGVuIGdldCByZS1wYXVzZWRcbiAgICAgIHdoaWxlIChwYXVzZXIuZ2V0KCkpIHtcbiAgICAgICAgYXdhaXQgcGF1c2VyLmdldCgpO1xuICAgICAgfVxuICAgICAgLy8gSWYgdGhlIGNhbGxiYWNrIGdldHMgaGVyZSBhbmQgdGhlcmUgaXMgbm8gYHRoaXNgLCBpdCBtZWFucyB0aGF0IHRoZVxuICAgICAgLy8gZGlyZWN0aXZlIGhhcyBiZWVuIGRpc2Nvbm5lY3RlZCBhbmQgZ2FyYmFnZSBjb2xsZWN0ZWQgYW5kIHdlIGRvbid0XG4gICAgICAvLyBuZWVkIHRvIGRvIGFueXRoaW5nIGVsc2VcbiAgICAgIGNvbnN0IF90aGlzID0gd2Vha1RoaXMuZGVyZWYoKTtcbiAgICAgIGlmIChfdGhpcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIENoZWNrIHRvIG1ha2Ugc3VyZSB0aGF0IHZhbHVlIGlzIHRoZSBzdGlsbCB0aGUgY3VycmVudCB2YWx1ZSBvZlxuICAgICAgICAvLyB0aGUgcGFydCwgYW5kIGlmIG5vdCBiYWlsIGJlY2F1c2UgYSBuZXcgdmFsdWUgb3ducyB0aGlzIHBhcnRcbiAgICAgICAgaWYgKF90aGlzLl9fdmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXMgYSBjb252ZW5pZW5jZSwgYmVjYXVzZSBmdW5jdGlvbmFsLXByb2dyYW1taW5nLXN0eWxlXG4gICAgICAgIC8vIHRyYW5zZm9ybXMgb2YgaXRlcmFibGVzIGFuZCBhc3luYyBpdGVyYWJsZXMgcmVxdWlyZXMgYSBsaWJyYXJ5LFxuICAgICAgICAvLyB3ZSBhY2NlcHQgYSBtYXBwZXIgZnVuY3Rpb24uIFRoaXMgaXMgZXNwZWNpYWxseSBjb252ZW5pZW50IGZvclxuICAgICAgICAvLyByZW5kZXJpbmcgYSB0ZW1wbGF0ZSBmb3IgZWFjaCBpdGVtLlxuICAgICAgICBpZiAobWFwcGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB2ID0gbWFwcGVyKHYsIGkpO1xuICAgICAgICB9XG5cbiAgICAgICAgX3RoaXMuY29tbWl0VmFsdWUodiwgaSk7XG4gICAgICAgIGkrKztcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIHJldHVybiBub0NoYW5nZTtcbiAgfVxuXG4gIC8vIE92ZXJyaWRlIHBvaW50IGZvciBBc3luY0FwcGVuZCB0byBhcHBlbmQgcmF0aGVyIHRoYW4gcmVwbGFjZVxuICBwcm90ZWN0ZWQgY29tbWl0VmFsdWUodmFsdWU6IHVua25vd24sIF9pbmRleDogbnVtYmVyKSB7XG4gICAgdGhpcy5zZXRWYWx1ZSh2YWx1ZSk7XG4gIH1cblxuICBvdmVycmlkZSBkaXNjb25uZWN0ZWQoKSB7XG4gICAgdGhpcy5fX3dlYWtUaGlzLmRpc2Nvbm5lY3QoKTtcbiAgICB0aGlzLl9fcGF1c2VyLnBhdXNlKCk7XG4gIH1cblxuICBvdmVycmlkZSByZWNvbm5lY3RlZCgpIHtcbiAgICB0aGlzLl9fd2Vha1RoaXMucmVjb25uZWN0KHRoaXMpO1xuICAgIHRoaXMuX19wYXVzZXIucmVzdW1lKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGRpcmVjdGl2ZSB0aGF0IHJlbmRlcnMgdGhlIGl0ZW1zIG9mIGFuIGFzeW5jIGl0ZXJhYmxlWzFdLCByZXBsYWNpbmdcbiAqIHByZXZpb3VzIHZhbHVlcyB3aXRoIG5ldyB2YWx1ZXMsIHNvIHRoYXQgb25seSBvbmUgdmFsdWUgaXMgZXZlciByZW5kZXJlZFxuICogYXQgYSB0aW1lLiBUaGlzIGRpcmVjdGl2ZSBtYXkgYmUgdXNlZCBpbiBhbnkgZXhwcmVzc2lvbiB0eXBlLlxuICpcbiAqIEFzeW5jIGl0ZXJhYmxlcyBhcmUgb2JqZWN0cyB3aXRoIGEgYFtTeW1ib2wuYXN5bmNJdGVyYXRvcl1gIG1ldGhvZCwgd2hpY2hcbiAqIHJldHVybnMgYW4gaXRlcmF0b3Igd2hvJ3MgYG5leHQoKWAgbWV0aG9kIHJldHVybnMgYSBQcm9taXNlLiBXaGVuIGEgbmV3XG4gKiB2YWx1ZSBpcyBhdmFpbGFibGUsIHRoZSBQcm9taXNlIHJlc29sdmVzIGFuZCB0aGUgdmFsdWUgaXMgcmVuZGVyZWQgdG8gdGhlXG4gKiBQYXJ0IGNvbnRyb2xsZWQgYnkgdGhlIGRpcmVjdGl2ZS4gSWYgYW5vdGhlciB2YWx1ZSBvdGhlciB0aGFuIHRoaXNcbiAqIGRpcmVjdGl2ZSBoYXMgYmVlbiBzZXQgb24gdGhlIFBhcnQsIHRoZSBpdGVyYWJsZSB3aWxsIG5vIGxvbmdlciBiZSBsaXN0ZW5lZFxuICogdG8gYW5kIG5ldyB2YWx1ZXMgd29uJ3QgYmUgd3JpdHRlbiB0byB0aGUgUGFydC5cbiAqXG4gKiBbMV06IGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL1N0YXRlbWVudHMvZm9yLWF3YWl0Li4ub2ZcbiAqXG4gKiBAcGFyYW0gdmFsdWUgQW4gYXN5bmMgaXRlcmFibGVcbiAqIEBwYXJhbSBtYXBwZXIgQW4gb3B0aW9uYWwgZnVuY3Rpb24gdGhhdCBtYXBzIGZyb20gKHZhbHVlLCBpbmRleCkgdG8gYW5vdGhlclxuICogICAgIHZhbHVlLiBVc2VmdWwgZm9yIGdlbmVyYXRpbmcgdGVtcGxhdGVzIGZvciBlYWNoIGl0ZW0gaW4gdGhlIGl0ZXJhYmxlLlxuICovXG5leHBvcnQgY29uc3QgYXN5bmNSZXBsYWNlID0gZGlyZWN0aXZlKEFzeW5jUmVwbGFjZURpcmVjdGl2ZSk7XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtDaGlsZFBhcnR9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7XG4gIGRpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlUGFyYW1ldGVycyxcbiAgUGFydEluZm8sXG4gIFBhcnRUeXBlLFxufSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtBc3luY1JlcGxhY2VEaXJlY3RpdmV9IGZyb20gJy4vYXN5bmMtcmVwbGFjZS5qcyc7XG5pbXBvcnQge1xuICBjbGVhclBhcnQsXG4gIGluc2VydFBhcnQsXG4gIHNldENoaWxkUGFydFZhbHVlLFxufSBmcm9tICcuLi9kaXJlY3RpdmUtaGVscGVycy5qcyc7XG5cbmNsYXNzIEFzeW5jQXBwZW5kRGlyZWN0aXZlIGV4dGVuZHMgQXN5bmNSZXBsYWNlRGlyZWN0aXZlIHtcbiAgcHJpdmF0ZSBfX2NoaWxkUGFydCE6IENoaWxkUGFydDtcblxuICAvLyBPdmVycmlkZSBBc3luY1JlcGxhY2UgdG8gbmFycm93IHRoZSBhbGxvd2VkIHBhcnQgdHlwZSB0byBDaGlsZFBhcnQgb25seVxuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gICAgaWYgKHBhcnRJbmZvLnR5cGUgIT09IFBhcnRUeXBlLkNISUxEKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FzeW5jQXBwZW5kIGNhbiBvbmx5IGJlIHVzZWQgaW4gY2hpbGQgZXhwcmVzc2lvbnMnKTtcbiAgICB9XG4gIH1cblxuICAvLyBPdmVycmlkZSBBc3luY1JlcGxhY2UgdG8gc2F2ZSB0aGUgcGFydCBzaW5jZSB3ZSBuZWVkIHRvIGFwcGVuZCBpbnRvIGl0XG4gIG92ZXJyaWRlIHVwZGF0ZShwYXJ0OiBDaGlsZFBhcnQsIHBhcmFtczogRGlyZWN0aXZlUGFyYW1ldGVyczx0aGlzPikge1xuICAgIHRoaXMuX19jaGlsZFBhcnQgPSBwYXJ0O1xuICAgIHJldHVybiBzdXBlci51cGRhdGUocGFydCwgcGFyYW1zKTtcbiAgfVxuXG4gIC8vIE92ZXJyaWRlIEFzeW5jUmVwbGFjZSB0byBhcHBlbmQgcmF0aGVyIHRoYW4gcmVwbGFjZVxuICBwcm90ZWN0ZWQgb3ZlcnJpZGUgY29tbWl0VmFsdWUodmFsdWU6IHVua25vd24sIGluZGV4OiBudW1iZXIpIHtcbiAgICAvLyBXaGVuIHdlIGdldCB0aGUgZmlyc3QgdmFsdWUsIGNsZWFyIHRoZSBwYXJ0LiBUaGlzIGxldHMgdGhlXG4gICAgLy8gcHJldmlvdXMgdmFsdWUgZGlzcGxheSB1bnRpbCB3ZSBjYW4gcmVwbGFjZSBpdC5cbiAgICBpZiAoaW5kZXggPT09IDApIHtcbiAgICAgIGNsZWFyUGFydCh0aGlzLl9fY2hpbGRQYXJ0KTtcbiAgICB9XG4gICAgLy8gQ3JlYXRlIGFuZCBpbnNlcnQgYSBuZXcgcGFydCBhbmQgc2V0IGl0cyB2YWx1ZSB0byB0aGUgbmV4dCB2YWx1ZVxuICAgIGNvbnN0IG5ld1BhcnQgPSBpbnNlcnRQYXJ0KHRoaXMuX19jaGlsZFBhcnQpO1xuICAgIHNldENoaWxkUGFydFZhbHVlKG5ld1BhcnQsIHZhbHVlKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgZGlyZWN0aXZlIHRoYXQgcmVuZGVycyB0aGUgaXRlbXMgb2YgYW4gYXN5bmMgaXRlcmFibGVbMV0sIGFwcGVuZGluZyBuZXdcbiAqIHZhbHVlcyBhZnRlciBwcmV2aW91cyB2YWx1ZXMsIHNpbWlsYXIgdG8gdGhlIGJ1aWx0LWluIHN1cHBvcnQgZm9yIGl0ZXJhYmxlcy5cbiAqIFRoaXMgZGlyZWN0aXZlIGlzIHVzYWJsZSBvbmx5IGluIGNoaWxkIGV4cHJlc3Npb25zLlxuICpcbiAqIEFzeW5jIGl0ZXJhYmxlcyBhcmUgb2JqZWN0cyB3aXRoIGEgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSBtZXRob2QsIHdoaWNoXG4gKiByZXR1cm5zIGFuIGl0ZXJhdG9yIHdobydzIGBuZXh0KClgIG1ldGhvZCByZXR1cm5zIGEgUHJvbWlzZS4gV2hlbiBhIG5ld1xuICogdmFsdWUgaXMgYXZhaWxhYmxlLCB0aGUgUHJvbWlzZSByZXNvbHZlcyBhbmQgdGhlIHZhbHVlIGlzIGFwcGVuZGVkIHRvIHRoZVxuICogUGFydCBjb250cm9sbGVkIGJ5IHRoZSBkaXJlY3RpdmUuIElmIGFub3RoZXIgdmFsdWUgb3RoZXIgdGhhbiB0aGlzXG4gKiBkaXJlY3RpdmUgaGFzIGJlZW4gc2V0IG9uIHRoZSBQYXJ0LCB0aGUgaXRlcmFibGUgd2lsbCBubyBsb25nZXIgYmUgbGlzdGVuZWRcbiAqIHRvIGFuZCBuZXcgdmFsdWVzIHdvbid0IGJlIHdyaXR0ZW4gdG8gdGhlIFBhcnQuXG4gKlxuICogWzFdOiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9TdGF0ZW1lbnRzL2Zvci1hd2FpdC4uLm9mXG4gKlxuICogQHBhcmFtIHZhbHVlIEFuIGFzeW5jIGl0ZXJhYmxlXG4gKiBAcGFyYW0gbWFwcGVyIEFuIG9wdGlvbmFsIGZ1bmN0aW9uIHRoYXQgbWFwcyBmcm9tICh2YWx1ZSwgaW5kZXgpIHRvIGFub3RoZXJcbiAqICAgICB2YWx1ZS4gVXNlZnVsIGZvciBnZW5lcmF0aW5nIHRlbXBsYXRlcyBmb3IgZWFjaCBpdGVtIGluIHRoZSBpdGVyYWJsZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGFzeW5jQXBwZW5kID0gZGlyZWN0aXZlKEFzeW5jQXBwZW5kRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtBc3luY0FwcGVuZERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtcbiAgVGVtcGxhdGVSZXN1bHQsXG4gIENoaWxkUGFydCxcbiAgUm9vdFBhcnQsXG4gIHJlbmRlcixcbiAgbm90aGluZyxcbn0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtcbiAgZGlyZWN0aXZlLFxuICBEaXJlY3RpdmUsXG4gIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG4gIFBhcnRJbmZvLFxufSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtcbiAgY2xlYXJQYXJ0LFxuICBnZXRDb21taXR0ZWRWYWx1ZSxcbiAgaW5zZXJ0UGFydCxcbiAgaXNUZW1wbGF0ZVJlc3VsdCxcbiAgc2V0Q29tbWl0dGVkVmFsdWUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcblxuY2xhc3MgQ2FjaGVEaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBwcml2YXRlIF90ZW1wbGF0ZUNhY2hlID0gbmV3IFdlYWtNYXA8VGVtcGxhdGVTdHJpbmdzQXJyYXksIFJvb3RQYXJ0PigpO1xuICBwcml2YXRlIF92YWx1ZT86IFRlbXBsYXRlUmVzdWx0O1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgfVxuXG4gIHJlbmRlcih2OiB1bmtub3duKSB7XG4gICAgLy8gUmV0dXJuIGFuIGFycmF5IG9mIHRoZSB2YWx1ZSB0byBpbmR1Y2UgbGl0LWh0bWwgdG8gY3JlYXRlIGEgQ2hpbGRQYXJ0XG4gICAgLy8gZm9yIHRoZSB2YWx1ZSB0aGF0IHdlIGNhbiBtb3ZlIGludG8gdGhlIGNhY2hlLlxuICAgIHJldHVybiBbdl07XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUoY29udGFpbmVyUGFydDogQ2hpbGRQYXJ0LCBbdl06IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICAvLyBJZiB0aGUgcHJldmlvdXMgdmFsdWUgaXMgYSBUZW1wbGF0ZVJlc3VsdCBhbmQgdGhlIG5ldyB2YWx1ZSBpcyBub3QsXG4gICAgLy8gb3IgaXMgYSBkaWZmZXJlbnQgVGVtcGxhdGUgYXMgdGhlIHByZXZpb3VzIHZhbHVlLCBtb3ZlIHRoZSBjaGlsZCBwYXJ0XG4gICAgLy8gaW50byB0aGUgY2FjaGUuXG4gICAgaWYgKFxuICAgICAgaXNUZW1wbGF0ZVJlc3VsdCh0aGlzLl92YWx1ZSkgJiZcbiAgICAgICghaXNUZW1wbGF0ZVJlc3VsdCh2KSB8fCB0aGlzLl92YWx1ZS5zdHJpbmdzICE9PSB2LnN0cmluZ3MpXG4gICAgKSB7XG4gICAgICAvLyBUaGlzIGlzIGFsd2F5cyBhbiBhcnJheSBiZWNhdXNlIHdlIHJldHVybiBbdl0gaW4gcmVuZGVyKClcbiAgICAgIGNvbnN0IHBhcnRWYWx1ZSA9IGdldENvbW1pdHRlZFZhbHVlKGNvbnRhaW5lclBhcnQpIGFzIEFycmF5PENoaWxkUGFydD47XG4gICAgICBjb25zdCBjaGlsZFBhcnQgPSBwYXJ0VmFsdWUucG9wKCkhO1xuICAgICAgbGV0IGNhY2hlZENvbnRhaW5lclBhcnQgPSB0aGlzLl90ZW1wbGF0ZUNhY2hlLmdldCh0aGlzLl92YWx1ZS5zdHJpbmdzKTtcbiAgICAgIGlmIChjYWNoZWRDb250YWluZXJQYXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3QgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIGNhY2hlZENvbnRhaW5lclBhcnQgPSByZW5kZXIobm90aGluZywgZnJhZ21lbnQpO1xuICAgICAgICBjYWNoZWRDb250YWluZXJQYXJ0LnNldENvbm5lY3RlZChmYWxzZSk7XG4gICAgICAgIHRoaXMuX3RlbXBsYXRlQ2FjaGUuc2V0KHRoaXMuX3ZhbHVlLnN0cmluZ3MsIGNhY2hlZENvbnRhaW5lclBhcnQpO1xuICAgICAgfVxuICAgICAgLy8gTW92ZSBpbnRvIGNhY2hlXG4gICAgICBzZXRDb21taXR0ZWRWYWx1ZShjYWNoZWRDb250YWluZXJQYXJ0LCBbY2hpbGRQYXJ0XSk7XG4gICAgICBpbnNlcnRQYXJ0KGNhY2hlZENvbnRhaW5lclBhcnQsIHVuZGVmaW5lZCwgY2hpbGRQYXJ0KTtcbiAgICB9XG4gICAgLy8gSWYgdGhlIG5ldyB2YWx1ZSBpcyBhIFRlbXBsYXRlUmVzdWx0IGFuZCB0aGUgcHJldmlvdXMgdmFsdWUgaXMgbm90LFxuICAgIC8vIG9yIGlzIGEgZGlmZmVyZW50IFRlbXBsYXRlIGFzIHRoZSBwcmV2aW91cyB2YWx1ZSwgcmVzdG9yZSB0aGUgY2hpbGRcbiAgICAvLyBwYXJ0IGZyb20gdGhlIGNhY2hlLlxuICAgIGlmIChpc1RlbXBsYXRlUmVzdWx0KHYpKSB7XG4gICAgICBpZiAoIWlzVGVtcGxhdGVSZXN1bHQodGhpcy5fdmFsdWUpIHx8IHRoaXMuX3ZhbHVlLnN0cmluZ3MgIT09IHYuc3RyaW5ncykge1xuICAgICAgICBjb25zdCBjYWNoZWRDb250YWluZXJQYXJ0ID0gdGhpcy5fdGVtcGxhdGVDYWNoZS5nZXQodi5zdHJpbmdzKTtcbiAgICAgICAgaWYgKGNhY2hlZENvbnRhaW5lclBhcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIE1vdmUgdGhlIGNhY2hlZCBwYXJ0IGJhY2sgaW50byB0aGUgY29udGFpbmVyIHBhcnQgdmFsdWVcbiAgICAgICAgICBjb25zdCBwYXJ0VmFsdWUgPSBnZXRDb21taXR0ZWRWYWx1ZShcbiAgICAgICAgICAgIGNhY2hlZENvbnRhaW5lclBhcnRcbiAgICAgICAgICApIGFzIEFycmF5PENoaWxkUGFydD47XG4gICAgICAgICAgY29uc3QgY2FjaGVkUGFydCA9IHBhcnRWYWx1ZS5wb3AoKSE7XG4gICAgICAgICAgLy8gTW92ZSBjYWNoZWQgcGFydCBiYWNrIGludG8gRE9NXG4gICAgICAgICAgY2xlYXJQYXJ0KGNvbnRhaW5lclBhcnQpO1xuICAgICAgICAgIGluc2VydFBhcnQoY29udGFpbmVyUGFydCwgdW5kZWZpbmVkLCBjYWNoZWRQYXJ0KTtcbiAgICAgICAgICBzZXRDb21taXR0ZWRWYWx1ZShjb250YWluZXJQYXJ0LCBbY2FjaGVkUGFydF0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLl92YWx1ZSA9IHY7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3ZhbHVlID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZW5kZXIodik7XG4gIH1cbn1cblxuLyoqXG4gKiBFbmFibGVzIGZhc3Qgc3dpdGNoaW5nIGJldHdlZW4gbXVsdGlwbGUgdGVtcGxhdGVzIGJ5IGNhY2hpbmcgdGhlIERPTSBub2Rlc1xuICogYW5kIFRlbXBsYXRlSW5zdGFuY2VzIHByb2R1Y2VkIGJ5IHRoZSB0ZW1wbGF0ZXMuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogbGV0IGNoZWNrZWQgPSBmYWxzZTtcbiAqXG4gKiBodG1sYFxuICogICAke2NhY2hlKGNoZWNrZWQgPyBodG1sYGlucHV0IGlzIGNoZWNrZWRgIDogaHRtbGBpbnB1dCBpcyBub3QgY2hlY2tlZGApfVxuICogYFxuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBjYWNoZSA9IGRpcmVjdGl2ZShDYWNoZURpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7Q2FjaGVEaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjEgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbi8qKlxuICogQ2hvb3NlcyBhbmQgZXZhbHVhdGVzIGEgdGVtcGxhdGUgZnVuY3Rpb24gZnJvbSBhIGxpc3QgYmFzZWQgb24gbWF0Y2hpbmdcbiAqIHRoZSBnaXZlbiBgdmFsdWVgIHRvIGEgY2FzZS5cbiAqXG4gKiBDYXNlcyBhcmUgc3RydWN0dXJlZCBhcyBgW2Nhc2VWYWx1ZSwgZnVuY11gLiBgdmFsdWVgIGlzIG1hdGNoZWQgdG9cbiAqIGBjYXNlVmFsdWVgIGJ5IHN0cmljdCBlcXVhbGl0eS4gVGhlIGZpcnN0IG1hdGNoIGlzIHNlbGVjdGVkLiBDYXNlIHZhbHVlc1xuICogY2FuIGJlIG9mIGFueSB0eXBlIGluY2x1ZGluZyBwcmltaXRpdmVzLCBvYmplY3RzLCBhbmQgc3ltYm9scy5cbiAqXG4gKiBUaGlzIGlzIHNpbWlsYXIgdG8gYSBzd2l0Y2ggc3RhdGVtZW50LCBidXQgYXMgYW4gZXhwcmVzc2lvbiBhbmQgd2l0aG91dFxuICogZmFsbHRocm91Z2guXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogcmVuZGVyKCkge1xuICogICByZXR1cm4gaHRtbGBcbiAqICAgICAke2Nob29zZSh0aGlzLnNlY3Rpb24sIFtcbiAqICAgICAgIFsnaG9tZScsICgpID0+IGh0bWxgPGgxPkhvbWU8L2gxPmBdLFxuICogICAgICAgWydhYm91dCcsICgpID0+IGh0bWxgPGgxPkFib3V0PC9oMT5gXVxuICogICAgIF0sXG4gKiAgICAgKCkgPT4gaHRtbGA8aDE+RXJyb3I8L2gxPmApfVxuICogICBgO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBjaG9vc2UgPSA8VCwgVj4oXG4gIHZhbHVlOiBULFxuICBjYXNlczogQXJyYXk8W1QsICgpID0+IFZdPixcbiAgZGVmYXVsdENhc2U/OiAoKSA9PiBWXG4pID0+IHtcbiAgZm9yIChjb25zdCBjIG9mIGNhc2VzKSB7XG4gICAgY29uc3QgY2FzZVZhbHVlID0gY1swXTtcbiAgICBpZiAoY2FzZVZhbHVlID09PSB2YWx1ZSkge1xuICAgICAgY29uc3QgZm4gPSBjWzFdO1xuICAgICAgcmV0dXJuIGZuKCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWZhdWx0Q2FzZT8uKCk7XG59O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTggR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7QXR0cmlidXRlUGFydCwgbm9DaGFuZ2V9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7XG4gIGRpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlLFxuICBEaXJlY3RpdmVQYXJhbWV0ZXJzLFxuICBQYXJ0SW5mbyxcbiAgUGFydFR5cGUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5cbi8qKlxuICogQSBrZXktdmFsdWUgc2V0IG9mIGNsYXNzIG5hbWVzIHRvIHRydXRoeSB2YWx1ZXMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2xhc3NJbmZvIHtcbiAgcmVhZG9ubHkgW25hbWU6IHN0cmluZ106IHN0cmluZyB8IGJvb2xlYW4gfCBudW1iZXI7XG59XG5cbmNsYXNzIENsYXNzTWFwRGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgLyoqXG4gICAqIFN0b3JlcyB0aGUgQ2xhc3NJbmZvIG9iamVjdCBhcHBsaWVkIHRvIGEgZ2l2ZW4gQXR0cmlidXRlUGFydC5cbiAgICogVXNlZCB0byB1bnNldCBleGlzdGluZyB2YWx1ZXMgd2hlbiBhIG5ldyBDbGFzc0luZm8gb2JqZWN0IGlzIGFwcGxpZWQuXG4gICAqL1xuICBwcml2YXRlIF9wcmV2aW91c0NsYXNzZXM/OiBTZXQ8c3RyaW5nPjtcbiAgcHJpdmF0ZSBfc3RhdGljQ2xhc3Nlcz86IFNldDxzdHJpbmc+O1xuXG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAoXG4gICAgICBwYXJ0SW5mby50eXBlICE9PSBQYXJ0VHlwZS5BVFRSSUJVVEUgfHxcbiAgICAgIHBhcnRJbmZvLm5hbWUgIT09ICdjbGFzcycgfHxcbiAgICAgIChwYXJ0SW5mby5zdHJpbmdzPy5sZW5ndGggYXMgbnVtYmVyKSA+IDJcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ2BjbGFzc01hcCgpYCBjYW4gb25seSBiZSB1c2VkIGluIHRoZSBgY2xhc3NgIGF0dHJpYnV0ZSAnICtcbiAgICAgICAgICAnYW5kIG11c3QgYmUgdGhlIG9ubHkgcGFydCBpbiB0aGUgYXR0cmlidXRlLidcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcmVuZGVyKGNsYXNzSW5mbzogQ2xhc3NJbmZvKSB7XG4gICAgLy8gQWRkIHNwYWNlcyB0byBlbnN1cmUgc2VwYXJhdGlvbiBmcm9tIHN0YXRpYyBjbGFzc2VzXG4gICAgcmV0dXJuIChcbiAgICAgICcgJyArXG4gICAgICBPYmplY3Qua2V5cyhjbGFzc0luZm8pXG4gICAgICAgIC5maWx0ZXIoKGtleSkgPT4gY2xhc3NJbmZvW2tleV0pXG4gICAgICAgIC5qb2luKCcgJykgK1xuICAgICAgJyAnXG4gICAgKTtcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShwYXJ0OiBBdHRyaWJ1dGVQYXJ0LCBbY2xhc3NJbmZvXTogRGlyZWN0aXZlUGFyYW1ldGVyczx0aGlzPikge1xuICAgIC8vIFJlbWVtYmVyIGR5bmFtaWMgY2xhc3NlcyBvbiB0aGUgZmlyc3QgcmVuZGVyXG4gICAgaWYgKHRoaXMuX3ByZXZpb3VzQ2xhc3NlcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9wcmV2aW91c0NsYXNzZXMgPSBuZXcgU2V0KCk7XG4gICAgICBpZiAocGFydC5zdHJpbmdzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fc3RhdGljQ2xhc3NlcyA9IG5ldyBTZXQoXG4gICAgICAgICAgcGFydC5zdHJpbmdzXG4gICAgICAgICAgICAuam9pbignICcpXG4gICAgICAgICAgICAuc3BsaXQoL1xccy8pXG4gICAgICAgICAgICAuZmlsdGVyKChzKSA9PiBzICE9PSAnJylcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgbmFtZSBpbiBjbGFzc0luZm8pIHtcbiAgICAgICAgaWYgKGNsYXNzSW5mb1tuYW1lXSAmJiAhdGhpcy5fc3RhdGljQ2xhc3Nlcz8uaGFzKG5hbWUpKSB7XG4gICAgICAgICAgdGhpcy5fcHJldmlvdXNDbGFzc2VzLmFkZChuYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMucmVuZGVyKGNsYXNzSW5mbyk7XG4gICAgfVxuXG4gICAgY29uc3QgY2xhc3NMaXN0ID0gcGFydC5lbGVtZW50LmNsYXNzTGlzdDtcblxuICAgIC8vIFJlbW92ZSBvbGQgY2xhc3NlcyB0aGF0IG5vIGxvbmdlciBhcHBseVxuICAgIC8vIFdlIHVzZSBmb3JFYWNoKCkgaW5zdGVhZCBvZiBmb3Itb2Ygc28gdGhhdCB3ZSBkb24ndCByZXF1aXJlIGRvd24tbGV2ZWxcbiAgICAvLyBpdGVyYXRpb24uXG4gICAgdGhpcy5fcHJldmlvdXNDbGFzc2VzLmZvckVhY2goKG5hbWUpID0+IHtcbiAgICAgIGlmICghKG5hbWUgaW4gY2xhc3NJbmZvKSkge1xuICAgICAgICBjbGFzc0xpc3QucmVtb3ZlKG5hbWUpO1xuICAgICAgICB0aGlzLl9wcmV2aW91c0NsYXNzZXMhLmRlbGV0ZShuYW1lKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIEFkZCBvciByZW1vdmUgY2xhc3NlcyBiYXNlZCBvbiB0aGVpciBjbGFzc01hcCB2YWx1ZVxuICAgIGZvciAoY29uc3QgbmFtZSBpbiBjbGFzc0luZm8pIHtcbiAgICAgIC8vIFdlIGV4cGxpY2l0bHkgd2FudCBhIGxvb3NlIHRydXRoeSBjaGVjayBvZiBgdmFsdWVgIGJlY2F1c2UgaXQgc2VlbXNcbiAgICAgIC8vIG1vcmUgY29udmVuaWVudCB0aGF0ICcnIGFuZCAwIGFyZSBza2lwcGVkLlxuICAgICAgY29uc3QgdmFsdWUgPSAhIWNsYXNzSW5mb1tuYW1lXTtcbiAgICAgIGlmIChcbiAgICAgICAgdmFsdWUgIT09IHRoaXMuX3ByZXZpb3VzQ2xhc3Nlcy5oYXMobmFtZSkgJiZcbiAgICAgICAgIXRoaXMuX3N0YXRpY0NsYXNzZXM/LmhhcyhuYW1lKVxuICAgICAgKSB7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgIGNsYXNzTGlzdC5hZGQobmFtZSk7XG4gICAgICAgICAgdGhpcy5fcHJldmlvdXNDbGFzc2VzLmFkZChuYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjbGFzc0xpc3QucmVtb3ZlKG5hbWUpO1xuICAgICAgICAgIHRoaXMuX3ByZXZpb3VzQ2xhc3Nlcy5kZWxldGUobmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG59XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCBhcHBsaWVzIGR5bmFtaWMgQ1NTIGNsYXNzZXMuXG4gKlxuICogVGhpcyBtdXN0IGJlIHVzZWQgaW4gdGhlIGBjbGFzc2AgYXR0cmlidXRlIGFuZCBtdXN0IGJlIHRoZSBvbmx5IHBhcnQgdXNlZCBpblxuICogdGhlIGF0dHJpYnV0ZS4gSXQgdGFrZXMgZWFjaCBwcm9wZXJ0eSBpbiB0aGUgYGNsYXNzSW5mb2AgYXJndW1lbnQgYW5kIGFkZHNcbiAqIHRoZSBwcm9wZXJ0eSBuYW1lIHRvIHRoZSBlbGVtZW50J3MgYGNsYXNzTGlzdGAgaWYgdGhlIHByb3BlcnR5IHZhbHVlIGlzXG4gKiB0cnV0aHk7IGlmIHRoZSBwcm9wZXJ0eSB2YWx1ZSBpcyBmYWxzZXksIHRoZSBwcm9wZXJ0eSBuYW1lIGlzIHJlbW92ZWQgZnJvbVxuICogdGhlIGVsZW1lbnQncyBgY2xhc3NgLlxuICpcbiAqIEZvciBleGFtcGxlIGB7Zm9vOiBiYXJ9YCBhcHBsaWVzIHRoZSBjbGFzcyBgZm9vYCBpZiB0aGUgdmFsdWUgb2YgYGJhcmAgaXNcbiAqIHRydXRoeS5cbiAqXG4gKiBAcGFyYW0gY2xhc3NJbmZvXG4gKi9cbmV4cG9ydCBjb25zdCBjbGFzc01hcCA9IGRpcmVjdGl2ZShDbGFzc01hcERpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7Q2xhc3NNYXBEaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTggR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7bm9DaGFuZ2UsIFBhcnR9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7ZGlyZWN0aXZlLCBEaXJlY3RpdmUsIERpcmVjdGl2ZVBhcmFtZXRlcnN9IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5cbi8vIEEgc2VudGluZWwgdGhhdCBpbmRpY2F0ZXMgZ3VhcmQoKSBoYXNuJ3QgcmVuZGVyZWQgYW55dGhpbmcgeWV0XG5jb25zdCBpbml0aWFsVmFsdWUgPSB7fTtcblxuY2xhc3MgR3VhcmREaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBwcml2YXRlIF9wcmV2aW91c1ZhbHVlOiB1bmtub3duID0gaW5pdGlhbFZhbHVlO1xuXG4gIHJlbmRlcihfdmFsdWU6IHVua25vd24sIGY6ICgpID0+IHVua25vd24pIHtcbiAgICByZXR1cm4gZigpO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKF9wYXJ0OiBQYXJ0LCBbdmFsdWUsIGZdOiBEaXJlY3RpdmVQYXJhbWV0ZXJzPHRoaXM+KSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAvLyBEaXJ0eS1jaGVjayBhcnJheXMgYnkgaXRlbVxuICAgICAgaWYgKFxuICAgICAgICBBcnJheS5pc0FycmF5KHRoaXMuX3ByZXZpb3VzVmFsdWUpICYmXG4gICAgICAgIHRoaXMuX3ByZXZpb3VzVmFsdWUubGVuZ3RoID09PSB2YWx1ZS5sZW5ndGggJiZcbiAgICAgICAgdmFsdWUuZXZlcnkoKHYsIGkpID0+IHYgPT09ICh0aGlzLl9wcmV2aW91c1ZhbHVlIGFzIEFycmF5PHVua25vd24+KVtpXSlcbiAgICAgICkge1xuICAgICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLl9wcmV2aW91c1ZhbHVlID09PSB2YWx1ZSkge1xuICAgICAgLy8gRGlydHktY2hlY2sgbm9uLWFycmF5cyBieSBpZGVudGl0eVxuICAgICAgcmV0dXJuIG5vQ2hhbmdlO1xuICAgIH1cblxuICAgIC8vIENvcHkgdGhlIHZhbHVlIGlmIGl0J3MgYW4gYXJyYXkgc28gdGhhdCBpZiBpdCdzIG11dGF0ZWQgd2UgZG9uJ3QgZm9yZ2V0XG4gICAgLy8gd2hhdCB0aGUgcHJldmlvdXMgdmFsdWVzIHdlcmUuXG4gICAgdGhpcy5fcHJldmlvdXNWYWx1ZSA9IEFycmF5LmlzQXJyYXkodmFsdWUpID8gQXJyYXkuZnJvbSh2YWx1ZSkgOiB2YWx1ZTtcbiAgICBjb25zdCByID0gdGhpcy5yZW5kZXIodmFsdWUsIGYpO1xuICAgIHJldHVybiByO1xuICB9XG59XG5cbi8qKlxuICogUHJldmVudHMgcmUtcmVuZGVyIG9mIGEgdGVtcGxhdGUgZnVuY3Rpb24gdW50aWwgYSBzaW5nbGUgdmFsdWUgb3IgYW4gYXJyYXkgb2ZcbiAqIHZhbHVlcyBjaGFuZ2VzLlxuICpcbiAqIFZhbHVlcyBhcmUgY2hlY2tlZCBhZ2FpbnN0IHByZXZpb3VzIHZhbHVlcyB3aXRoIHN0cmljdCBlcXVhbGl0eSAoYD09PWApLCBhbmRcbiAqIHNvIHRoZSBjaGVjayB3b24ndCBkZXRlY3QgbmVzdGVkIHByb3BlcnR5IGNoYW5nZXMgaW5zaWRlIG9iamVjdHMgb3IgYXJyYXlzLlxuICogQXJyYXlzIHZhbHVlcyBoYXZlIGVhY2ggaXRlbSBjaGVja2VkIGFnYWluc3QgdGhlIHByZXZpb3VzIHZhbHVlIGF0IHRoZSBzYW1lXG4gKiBpbmRleCB3aXRoIHN0cmljdCBlcXVhbGl0eS4gTmVzdGVkIGFycmF5cyBhcmUgYWxzbyBjaGVja2VkIG9ubHkgYnkgc3RyaWN0XG4gKiBlcXVhbGl0eS5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBodG1sYFxuICogICA8ZGl2PlxuICogICAgICR7Z3VhcmQoW3VzZXIuaWQsIGNvbXBhbnkuaWRdLCAoKSA9PiBodG1sYC4uLmApfVxuICogICA8L2Rpdj5cbiAqIGBcbiAqIGBgYFxuICpcbiAqIEluIHRoaXMgY2FzZSwgdGhlIHRlbXBsYXRlIG9ubHkgcmVyZW5kZXJzIGlmIGVpdGhlciBgdXNlci5pZGAgb3IgYGNvbXBhbnkuaWRgXG4gKiBjaGFuZ2VzLlxuICpcbiAqIGd1YXJkKCkgaXMgdXNlZnVsIHdpdGggaW1tdXRhYmxlIGRhdGEgcGF0dGVybnMsIGJ5IHByZXZlbnRpbmcgZXhwZW5zaXZlIHdvcmtcbiAqIHVudGlsIGRhdGEgdXBkYXRlcy5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBodG1sYFxuICogICA8ZGl2PlxuICogICAgICR7Z3VhcmQoW2ltbXV0YWJsZUl0ZW1zXSwgKCkgPT4gaW1tdXRhYmxlSXRlbXMubWFwKGkgPT4gaHRtbGAke2l9YCkpfVxuICogICA8L2Rpdj5cbiAqIGBcbiAqIGBgYFxuICpcbiAqIEluIHRoaXMgY2FzZSwgaXRlbXMgYXJlIG1hcHBlZCBvdmVyIG9ubHkgd2hlbiB0aGUgYXJyYXkgcmVmZXJlbmNlIGNoYW5nZXMuXG4gKlxuICogQHBhcmFtIHZhbHVlIHRoZSB2YWx1ZSB0byBjaGVjayBiZWZvcmUgcmUtcmVuZGVyaW5nXG4gKiBAcGFyYW0gZiB0aGUgdGVtcGxhdGUgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IGNvbnN0IGd1YXJkID0gZGlyZWN0aXZlKEd1YXJkRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtHdWFyZERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtub3RoaW5nfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5cbi8qKlxuICogRm9yIEF0dHJpYnV0ZVBhcnRzLCBzZXRzIHRoZSBhdHRyaWJ1dGUgaWYgdGhlIHZhbHVlIGlzIGRlZmluZWQgYW5kIHJlbW92ZXNcbiAqIHRoZSBhdHRyaWJ1dGUgaWYgdGhlIHZhbHVlIGlzIHVuZGVmaW5lZC5cbiAqXG4gKiBGb3Igb3RoZXIgcGFydCB0eXBlcywgdGhpcyBkaXJlY3RpdmUgaXMgYSBuby1vcC5cbiAqL1xuZXhwb3J0IGNvbnN0IGlmRGVmaW5lZCA9IDxUPih2YWx1ZTogVCkgPT4gdmFsdWUgPz8gbm90aGluZztcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIxIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG4vKipcbiAqIFJldHVybnMgYW4gaXRlcmFibGUgY29udGFpbmluZyB0aGUgdmFsdWVzIGluIGBpdGVtc2AgaW50ZXJsZWF2ZWQgd2l0aCB0aGVcbiAqIGBqb2luZXJgIHZhbHVlLlxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogYGBgdHNcbiAqIHJlbmRlcigpIHtcbiAqICAgcmV0dXJuIGh0bWxgXG4gKiAgICAgJHtqb2luKGl0ZW1zLCBodG1sYDxzcGFuIGNsYXNzPVwic2VwYXJhdG9yXCI+fDwvc3Bhbj5gKX1cbiAqICAgYDtcbiAqIH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGpvaW48SSwgSj4oXG4gIGl0ZW1zOiBJdGVyYWJsZTxJPiB8IHVuZGVmaW5lZCxcbiAgam9pbmVyOiAoaW5kZXg6IG51bWJlcikgPT4gSlxuKTogSXRlcmFibGU8SSB8IEo+O1xuZXhwb3J0IGZ1bmN0aW9uIGpvaW48SSwgSj4oXG4gIGl0ZW1zOiBJdGVyYWJsZTxJPiB8IHVuZGVmaW5lZCxcbiAgam9pbmVyOiBKXG4pOiBJdGVyYWJsZTxJIHwgSj47XG5leHBvcnQgZnVuY3Rpb24qIGpvaW48SSwgSj4oaXRlbXM6IEl0ZXJhYmxlPEk+IHwgdW5kZWZpbmVkLCBqb2luZXI6IEopIHtcbiAgY29uc3QgaXNGdW5jdGlvbiA9IHR5cGVvZiBqb2luZXIgPT09ICdmdW5jdGlvbic7XG4gIGlmIChpdGVtcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgbGV0IGkgPSAtMTtcbiAgICBmb3IgKGNvbnN0IHZhbHVlIG9mIGl0ZW1zKSB7XG4gICAgICBpZiAoaSA+IC0xKSB7XG4gICAgICAgIHlpZWxkIGlzRnVuY3Rpb24gPyBqb2luZXIoaSkgOiBqb2luZXI7XG4gICAgICB9XG4gICAgICBpKys7XG4gICAgICB5aWVsZCB2YWx1ZTtcbiAgICB9XG4gIH1cbn1cbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIxIEdvb2dsZSBMTENcbiAqIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBCU0QtMy1DbGF1c2VcbiAqL1xuXG5pbXBvcnQge25vdGhpbmd9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7XG4gIGRpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlLFxuICBDaGlsZFBhcnQsXG4gIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge3NldENvbW1pdHRlZFZhbHVlfSBmcm9tICcuLi9kaXJlY3RpdmUtaGVscGVycy5qcyc7XG5cbmNsYXNzIEtleWVkIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAga2V5OiB1bmtub3duID0gbm90aGluZztcblxuICByZW5kZXIoazogdW5rbm93biwgdjogdW5rbm93bikge1xuICAgIHRoaXMua2V5ID0gaztcbiAgICByZXR1cm4gdjtcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZShwYXJ0OiBDaGlsZFBhcnQsIFtrLCB2XTogRGlyZWN0aXZlUGFyYW1ldGVyczx0aGlzPikge1xuICAgIGlmIChrICE9PSB0aGlzLmtleSkge1xuICAgICAgLy8gQ2xlYXIgdGhlIHBhcnQgYmVmb3JlIHJldHVybmluZyBhIHZhbHVlLiBUaGUgb25lLWFyZyBmb3JtIG9mXG4gICAgICAvLyBzZXRDb21taXR0ZWRWYWx1ZSBzZXRzIHRoZSB2YWx1ZSB0byBhIHNlbnRpbmVsIHdoaWNoIGZvcmNlcyBhXG4gICAgICAvLyBjb21taXQgdGhlIG5leHQgcmVuZGVyLlxuICAgICAgc2V0Q29tbWl0dGVkVmFsdWUocGFydCk7XG4gICAgICB0aGlzLmtleSA9IGs7XG4gICAgfVxuICAgIHJldHVybiB2O1xuICB9XG59XG5cbi8qKlxuICogQXNzb2NpYXRlcyBhIHJlbmRlcmFibGUgdmFsdWUgd2l0aCBhIHVuaXF1ZSBrZXkuIFdoZW4gdGhlIGtleSBjaGFuZ2VzLCB0aGVcbiAqIHByZXZpb3VzIERPTSBpcyByZW1vdmVkIGFuZCBkaXNwb3NlZCBiZWZvcmUgcmVuZGVyaW5nIHRoZSBuZXh0IHZhbHVlLCBldmVuXG4gKiBpZiB0aGUgdmFsdWUgLSBzdWNoIGFzIGEgdGVtcGxhdGUgLSBpcyB0aGUgc2FtZS5cbiAqXG4gKiBUaGlzIGlzIHVzZWZ1bCBmb3IgZm9yY2luZyByZS1yZW5kZXJzIG9mIHN0YXRlZnVsIGNvbXBvbmVudHMsIG9yIHdvcmtpbmdcbiAqIHdpdGggY29kZSB0aGF0IGV4cGVjdHMgbmV3IGRhdGEgdG8gZ2VuZXJhdGUgbmV3IEhUTUwgZWxlbWVudHMsIHN1Y2ggYXMgc29tZVxuICogYW5pbWF0aW9uIHRlY2huaXF1ZXMuXG4gKi9cbmV4cG9ydCBjb25zdCBrZXllZCA9IGRpcmVjdGl2ZShLZXllZCk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7S2V5ZWR9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjAgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7QXR0cmlidXRlUGFydCwgbm9DaGFuZ2UsIG5vdGhpbmd9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7XG4gIGRpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlLFxuICBEaXJlY3RpdmVQYXJhbWV0ZXJzLFxuICBQYXJ0SW5mbyxcbiAgUGFydFR5cGUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge2lzU2luZ2xlRXhwcmVzc2lvbiwgc2V0Q29tbWl0dGVkVmFsdWV9IGZyb20gJy4uL2RpcmVjdGl2ZS1oZWxwZXJzLmpzJztcblxuY2xhc3MgTGl2ZURpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIGNvbnN0cnVjdG9yKHBhcnRJbmZvOiBQYXJ0SW5mbykge1xuICAgIHN1cGVyKHBhcnRJbmZvKTtcbiAgICBpZiAoXG4gICAgICAhKFxuICAgICAgICBwYXJ0SW5mby50eXBlID09PSBQYXJ0VHlwZS5QUk9QRVJUWSB8fFxuICAgICAgICBwYXJ0SW5mby50eXBlID09PSBQYXJ0VHlwZS5BVFRSSUJVVEUgfHxcbiAgICAgICAgcGFydEluZm8udHlwZSA9PT0gUGFydFR5cGUuQk9PTEVBTl9BVFRSSUJVVEVcbiAgICAgIClcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1RoZSBgbGl2ZWAgZGlyZWN0aXZlIGlzIG5vdCBhbGxvd2VkIG9uIGNoaWxkIG9yIGV2ZW50IGJpbmRpbmdzJ1xuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKCFpc1NpbmdsZUV4cHJlc3Npb24ocGFydEluZm8pKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2BsaXZlYCBiaW5kaW5ncyBjYW4gb25seSBjb250YWluIGEgc2luZ2xlIGV4cHJlc3Npb24nKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXIodmFsdWU6IHVua25vd24pIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUocGFydDogQXR0cmlidXRlUGFydCwgW3ZhbHVlXTogRGlyZWN0aXZlUGFyYW1ldGVyczx0aGlzPikge1xuICAgIGlmICh2YWx1ZSA9PT0gbm9DaGFuZ2UgfHwgdmFsdWUgPT09IG5vdGhpbmcpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgY29uc3QgZWxlbWVudCA9IHBhcnQuZWxlbWVudDtcbiAgICBjb25zdCBuYW1lID0gcGFydC5uYW1lO1xuXG4gICAgaWYgKHBhcnQudHlwZSA9PT0gUGFydFR5cGUuUFJPUEVSVFkpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICBpZiAodmFsdWUgPT09IChlbGVtZW50IGFzIGFueSlbbmFtZV0pIHtcbiAgICAgICAgcmV0dXJuIG5vQ2hhbmdlO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocGFydC50eXBlID09PSBQYXJ0VHlwZS5CT09MRUFOX0FUVFJJQlVURSkge1xuICAgICAgaWYgKCEhdmFsdWUgPT09IGVsZW1lbnQuaGFzQXR0cmlidXRlKG5hbWUpKSB7XG4gICAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHBhcnQudHlwZSA9PT0gUGFydFR5cGUuQVRUUklCVVRFKSB7XG4gICAgICBpZiAoZWxlbWVudC5nZXRBdHRyaWJ1dGUobmFtZSkgPT09IFN0cmluZyh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIG5vQ2hhbmdlO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBSZXNldHMgdGhlIHBhcnQncyB2YWx1ZSwgY2F1c2luZyBpdHMgZGlydHktY2hlY2sgdG8gZmFpbCBzbyB0aGF0IGl0XG4gICAgLy8gYWx3YXlzIHNldHMgdGhlIHZhbHVlLlxuICAgIHNldENvbW1pdHRlZFZhbHVlKHBhcnQpO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxufVxuXG4vKipcbiAqIENoZWNrcyBiaW5kaW5nIHZhbHVlcyBhZ2FpbnN0IGxpdmUgRE9NIHZhbHVlcywgaW5zdGVhZCBvZiBwcmV2aW91c2x5IGJvdW5kXG4gKiB2YWx1ZXMsIHdoZW4gZGV0ZXJtaW5pbmcgd2hldGhlciB0byB1cGRhdGUgdGhlIHZhbHVlLlxuICpcbiAqIFRoaXMgaXMgdXNlZnVsIGZvciBjYXNlcyB3aGVyZSB0aGUgRE9NIHZhbHVlIG1heSBjaGFuZ2UgZnJvbSBvdXRzaWRlIG9mXG4gKiBsaXQtaHRtbCwgc3VjaCBhcyB3aXRoIGEgYmluZGluZyB0byBhbiBgPGlucHV0PmAgZWxlbWVudCdzIGB2YWx1ZWAgcHJvcGVydHksXG4gKiBhIGNvbnRlbnQgZWRpdGFibGUgZWxlbWVudHMgdGV4dCwgb3IgdG8gYSBjdXN0b20gZWxlbWVudCB0aGF0IGNoYW5nZXMgaXQnc1xuICogb3duIHByb3BlcnRpZXMgb3IgYXR0cmlidXRlcy5cbiAqXG4gKiBJbiB0aGVzZSBjYXNlcyBpZiB0aGUgRE9NIHZhbHVlIGNoYW5nZXMsIGJ1dCB0aGUgdmFsdWUgc2V0IHRocm91Z2ggbGl0LWh0bWxcbiAqIGJpbmRpbmdzIGhhc24ndCwgbGl0LWh0bWwgd29uJ3Qga25vdyB0byB1cGRhdGUgdGhlIERPTSB2YWx1ZSBhbmQgd2lsbCBsZWF2ZVxuICogaXQgYWxvbmUuIElmIHRoaXMgaXMgbm90IHdoYXQgeW91IHdhbnQtLWlmIHlvdSB3YW50IHRvIG92ZXJ3cml0ZSB0aGUgRE9NXG4gKiB2YWx1ZSB3aXRoIHRoZSBib3VuZCB2YWx1ZSBubyBtYXR0ZXIgd2hhdC0tdXNlIHRoZSBgbGl2ZSgpYCBkaXJlY3RpdmU6XG4gKlxuICogYGBganNcbiAqIGh0bWxgPGlucHV0IC52YWx1ZT0ke2xpdmUoeCl9PmBcbiAqIGBgYFxuICpcbiAqIGBsaXZlKClgIHBlcmZvcm1zIGEgc3RyaWN0IGVxdWFsaXR5IGNoZWNrIGFnYWluc3QgdGhlIGxpdmUgRE9NIHZhbHVlLCBhbmQgaWZcbiAqIHRoZSBuZXcgdmFsdWUgaXMgZXF1YWwgdG8gdGhlIGxpdmUgdmFsdWUsIGRvZXMgbm90aGluZy4gVGhpcyBtZWFucyB0aGF0XG4gKiBgbGl2ZSgpYCBzaG91bGQgbm90IGJlIHVzZWQgd2hlbiB0aGUgYmluZGluZyB3aWxsIGNhdXNlIGEgdHlwZSBjb252ZXJzaW9uLiBJZlxuICogeW91IHVzZSBgbGl2ZSgpYCB3aXRoIGFuIGF0dHJpYnV0ZSBiaW5kaW5nLCBtYWtlIHN1cmUgdGhhdCBvbmx5IHN0cmluZ3MgYXJlXG4gKiBwYXNzZWQgaW4sIG9yIHRoZSBiaW5kaW5nIHdpbGwgdXBkYXRlIGV2ZXJ5IHJlbmRlci5cbiAqL1xuZXhwb3J0IGNvbnN0IGxpdmUgPSBkaXJlY3RpdmUoTGl2ZURpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG5leHBvcnQgdHlwZSB7TGl2ZURpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMSBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuLyoqXG4gKiBSZXR1cm5zIGFuIGl0ZXJhYmxlIGNvbnRhaW5pbmcgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIGBmKHZhbHVlKWAgb24gZWFjaFxuICogdmFsdWUgaW4gYGl0ZW1zYC5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiByZW5kZXIoKSB7XG4gKiAgIHJldHVybiBodG1sYFxuICogICAgIDx1bD5cbiAqICAgICAgICR7bWFwKGl0ZW1zLCAoaSkgPT4gaHRtbGA8bGk+JHtpfTwvbGk+YCl9XG4gKiAgICAgPC91bD5cbiAqICAgYDtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24qIG1hcDxUPihcbiAgaXRlbXM6IEl0ZXJhYmxlPFQ+IHwgdW5kZWZpbmVkLFxuICBmOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIpID0+IHVua25vd25cbikge1xuICBpZiAoaXRlbXMgIT09IHVuZGVmaW5lZCkge1xuICAgIGxldCBpID0gMDtcbiAgICBmb3IgKGNvbnN0IHZhbHVlIG9mIGl0ZW1zKSB7XG4gICAgICB5aWVsZCBmKHZhbHVlLCBpKyspO1xuICAgIH1cbiAgfVxufVxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjEgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbi8qKlxuICogUmV0dXJucyBhbiBpdGVyYWJsZSBvZiBpbnRlZ2VycyBmcm9tIGBzdGFydGAgdG8gYGVuZGAgKGV4Y2x1c2l2ZSlcbiAqIGluY3JlbWVudGluZyBieSBgc3RlcGAuXG4gKlxuICogSWYgYHN0YXJ0YCBpcyBvbWl0dGVkLCB0aGUgcmFuZ2Ugc3RhcnRzIGF0IGAwYC4gYHN0ZXBgIGRlZmF1bHRzIHRvIGAxYC5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiByZW5kZXIoKSB7XG4gKiAgIHJldHVybiBodG1sYFxuICogICAgICR7bWFwKHJhbmdlKDgpLCAoKSA9PiBodG1sYDxkaXYgY2xhc3M9XCJjZWxsXCI+PC9kaXY+YCl9XG4gKiAgIGA7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmdlKGVuZDogbnVtYmVyKTogSXRlcmFibGU8bnVtYmVyPjtcbmV4cG9ydCBmdW5jdGlvbiByYW5nZShcbiAgc3RhcnQ6IG51bWJlcixcbiAgZW5kOiBudW1iZXIsXG4gIHN0ZXA/OiBudW1iZXJcbik6IEl0ZXJhYmxlPG51bWJlcj47XG5leHBvcnQgZnVuY3Rpb24qIHJhbmdlKHN0YXJ0T3JFbmQ6IG51bWJlciwgZW5kPzogbnVtYmVyLCBzdGVwID0gMSkge1xuICBjb25zdCBzdGFydCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gMCA6IHN0YXJ0T3JFbmQ7XG4gIGVuZCA/Pz0gc3RhcnRPckVuZDtcbiAgZm9yIChsZXQgaSA9IHN0YXJ0OyBzdGVwID4gMCA/IGkgPCBlbmQgOiBlbmQgPCBpOyBpICs9IHN0ZXApIHtcbiAgICB5aWVsZCBpO1xuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtDaGlsZFBhcnQsIG5vQ2hhbmdlfSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgRGlyZWN0aXZlLCBQYXJ0SW5mbywgUGFydFR5cGV9IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge1xuICBpbnNlcnRQYXJ0LFxuICBnZXRDb21taXR0ZWRWYWx1ZSxcbiAgcmVtb3ZlUGFydCxcbiAgc2V0Q29tbWl0dGVkVmFsdWUsXG4gIHNldENoaWxkUGFydFZhbHVlLFxufSBmcm9tICcuLi9kaXJlY3RpdmUtaGVscGVycy5qcyc7XG5cbmV4cG9ydCB0eXBlIEtleUZuPFQ+ID0gKGl0ZW06IFQsIGluZGV4OiBudW1iZXIpID0+IHVua25vd247XG5leHBvcnQgdHlwZSBJdGVtVGVtcGxhdGU8VD4gPSAoaXRlbTogVCwgaW5kZXg6IG51bWJlcikgPT4gdW5rbm93bjtcblxuLy8gSGVscGVyIGZvciBnZW5lcmF0aW5nIGEgbWFwIG9mIGFycmF5IGl0ZW0gdG8gaXRzIGluZGV4IG92ZXIgYSBzdWJzZXRcbi8vIG9mIGFuIGFycmF5ICh1c2VkIHRvIGxhemlseSBnZW5lcmF0ZSBgbmV3S2V5VG9JbmRleE1hcGAgYW5kXG4vLyBgb2xkS2V5VG9JbmRleE1hcGApXG5jb25zdCBnZW5lcmF0ZU1hcCA9IChsaXN0OiB1bmtub3duW10sIHN0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyKSA9PiB7XG4gIGNvbnN0IG1hcCA9IG5ldyBNYXA8dW5rbm93biwgbnVtYmVyPigpO1xuICBmb3IgKGxldCBpID0gc3RhcnQ7IGkgPD0gZW5kOyBpKyspIHtcbiAgICBtYXAuc2V0KGxpc3RbaV0sIGkpO1xuICB9XG4gIHJldHVybiBtYXA7XG59O1xuXG5jbGFzcyBSZXBlYXREaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBwcml2YXRlIF9pdGVtS2V5cz86IHVua25vd25bXTtcblxuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gICAgaWYgKHBhcnRJbmZvLnR5cGUgIT09IFBhcnRUeXBlLkNISUxEKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlcGVhdCgpIGNhbiBvbmx5IGJlIHVzZWQgaW4gdGV4dCBleHByZXNzaW9ucycpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2dldFZhbHVlc0FuZEtleXM8VD4oXG4gICAgaXRlbXM6IEl0ZXJhYmxlPFQ+LFxuICAgIGtleUZuT3JUZW1wbGF0ZTogS2V5Rm48VD4gfCBJdGVtVGVtcGxhdGU8VD4sXG4gICAgdGVtcGxhdGU/OiBJdGVtVGVtcGxhdGU8VD5cbiAgKSB7XG4gICAgbGV0IGtleUZuOiBLZXlGbjxUPiB8IHVuZGVmaW5lZDtcbiAgICBpZiAodGVtcGxhdGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGVtcGxhdGUgPSBrZXlGbk9yVGVtcGxhdGU7XG4gICAgfSBlbHNlIGlmIChrZXlGbk9yVGVtcGxhdGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAga2V5Rm4gPSBrZXlGbk9yVGVtcGxhdGUgYXMgS2V5Rm48VD47XG4gICAgfVxuICAgIGNvbnN0IGtleXMgPSBbXTtcbiAgICBjb25zdCB2YWx1ZXMgPSBbXTtcbiAgICBsZXQgaW5kZXggPSAwO1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgICAga2V5c1tpbmRleF0gPSBrZXlGbiA/IGtleUZuKGl0ZW0sIGluZGV4KSA6IGluZGV4O1xuICAgICAgdmFsdWVzW2luZGV4XSA9IHRlbXBsYXRlIShpdGVtLCBpbmRleCk7XG4gICAgICBpbmRleCsrO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdmFsdWVzLFxuICAgICAga2V5cyxcbiAgICB9O1xuICB9XG5cbiAgcmVuZGVyPFQ+KGl0ZW1zOiBJdGVyYWJsZTxUPiwgdGVtcGxhdGU6IEl0ZW1UZW1wbGF0ZTxUPik6IEFycmF5PHVua25vd24+O1xuICByZW5kZXI8VD4oXG4gICAgaXRlbXM6IEl0ZXJhYmxlPFQ+LFxuICAgIGtleUZuOiBLZXlGbjxUPiB8IEl0ZW1UZW1wbGF0ZTxUPixcbiAgICB0ZW1wbGF0ZTogSXRlbVRlbXBsYXRlPFQ+XG4gICk6IEFycmF5PHVua25vd24+O1xuICByZW5kZXI8VD4oXG4gICAgaXRlbXM6IEl0ZXJhYmxlPFQ+LFxuICAgIGtleUZuT3JUZW1wbGF0ZTogS2V5Rm48VD4gfCBJdGVtVGVtcGxhdGU8VD4sXG4gICAgdGVtcGxhdGU/OiBJdGVtVGVtcGxhdGU8VD5cbiAgKSB7XG4gICAgcmV0dXJuIHRoaXMuX2dldFZhbHVlc0FuZEtleXMoaXRlbXMsIGtleUZuT3JUZW1wbGF0ZSwgdGVtcGxhdGUpLnZhbHVlcztcbiAgfVxuXG4gIG92ZXJyaWRlIHVwZGF0ZTxUPihcbiAgICBjb250YWluZXJQYXJ0OiBDaGlsZFBhcnQsXG4gICAgW2l0ZW1zLCBrZXlGbk9yVGVtcGxhdGUsIHRlbXBsYXRlXTogW1xuICAgICAgSXRlcmFibGU8VD4sXG4gICAgICBLZXlGbjxUPiB8IEl0ZW1UZW1wbGF0ZTxUPixcbiAgICAgIEl0ZW1UZW1wbGF0ZTxUPlxuICAgIF1cbiAgKSB7XG4gICAgLy8gT2xkIHBhcnQgJiBrZXkgbGlzdHMgYXJlIHJldHJpZXZlZCBmcm9tIHRoZSBsYXN0IHVwZGF0ZSAod2hpY2ggbWF5XG4gICAgLy8gYmUgcHJpbWVkIGJ5IGh5ZHJhdGlvbilcbiAgICBjb25zdCBvbGRQYXJ0cyA9IGdldENvbW1pdHRlZFZhbHVlKFxuICAgICAgY29udGFpbmVyUGFydFxuICAgICkgYXMgQXJyYXk8Q2hpbGRQYXJ0IHwgbnVsbD47XG4gICAgY29uc3Qge3ZhbHVlczogbmV3VmFsdWVzLCBrZXlzOiBuZXdLZXlzfSA9IHRoaXMuX2dldFZhbHVlc0FuZEtleXMoXG4gICAgICBpdGVtcyxcbiAgICAgIGtleUZuT3JUZW1wbGF0ZSxcbiAgICAgIHRlbXBsYXRlXG4gICAgKTtcblxuICAgIC8vIFdlIGNoZWNrIHRoYXQgb2xkUGFydHMsIHRoZSBjb21taXR0ZWQgdmFsdWUsIGlzIGFuIEFycmF5IGFzIGFuXG4gICAgLy8gaW5kaWNhdG9yIHRoYXQgdGhlIHByZXZpb3VzIHZhbHVlIGNhbWUgZnJvbSBhIHJlcGVhdCgpIGNhbGwuIElmXG4gICAgLy8gb2xkUGFydHMgaXMgbm90IGFuIEFycmF5IHRoZW4gdGhpcyBpcyB0aGUgZmlyc3QgcmVuZGVyIGFuZCB3ZSByZXR1cm5cbiAgICAvLyBhbiBhcnJheSBmb3IgbGl0LWh0bWwncyBhcnJheSBoYW5kbGluZyB0byByZW5kZXIsIGFuZCByZW1lbWJlciB0aGVcbiAgICAvLyBrZXlzLlxuICAgIGlmICghQXJyYXkuaXNBcnJheShvbGRQYXJ0cykpIHtcbiAgICAgIHRoaXMuX2l0ZW1LZXlzID0gbmV3S2V5cztcbiAgICAgIHJldHVybiBuZXdWYWx1ZXM7XG4gICAgfVxuXG4gICAgLy8gSW4gU1NSIGh5ZHJhdGlvbiBpdCdzIHBvc3NpYmxlIGZvciBvbGRQYXJ0cyB0byBiZSBhbiBhcnJheSBidXQgZm9yIHVzXG4gICAgLy8gdG8gbm90IGhhdmUgaXRlbSBrZXlzIGJlY2F1c2UgdGhlIHVwZGF0ZSgpIGhhc24ndCBydW4geWV0LiBXZSBzZXQgdGhlXG4gICAgLy8ga2V5cyB0byBhbiBlbXB0eSBhcnJheS4gVGhpcyB3aWxsIGNhdXNlIGFsbCBvbGRLZXkvbmV3S2V5IGNvbXBhcmlzb25zXG4gICAgLy8gdG8gZmFpbCBhbmQgZXhlY3V0aW9uIHRvIGZhbGwgdG8gdGhlIGxhc3QgbmVzdGVkIGJyYWNoIGJlbG93IHdoaWNoXG4gICAgLy8gcmV1c2VzIHRoZSBvbGRQYXJ0LlxuICAgIGNvbnN0IG9sZEtleXMgPSAodGhpcy5faXRlbUtleXMgPz89IFtdKTtcblxuICAgIC8vIE5ldyBwYXJ0IGxpc3Qgd2lsbCBiZSBidWlsdCB1cCBhcyB3ZSBnbyAoZWl0aGVyIHJldXNlZCBmcm9tXG4gICAgLy8gb2xkIHBhcnRzIG9yIGNyZWF0ZWQgZm9yIG5ldyBrZXlzIGluIHRoaXMgdXBkYXRlKS4gVGhpcyBpc1xuICAgIC8vIHNhdmVkIGluIHRoZSBhYm92ZSBjYWNoZSBhdCB0aGUgZW5kIG9mIHRoZSB1cGRhdGUuXG4gICAgY29uc3QgbmV3UGFydHM6IENoaWxkUGFydFtdID0gW107XG5cbiAgICAvLyBNYXBzIGZyb20ga2V5IHRvIGluZGV4IGZvciBjdXJyZW50IGFuZCBwcmV2aW91cyB1cGRhdGU7IHRoZXNlXG4gICAgLy8gYXJlIGdlbmVyYXRlZCBsYXppbHkgb25seSB3aGVuIG5lZWRlZCBhcyBhIHBlcmZvcm1hbmNlXG4gICAgLy8gb3B0aW1pemF0aW9uLCBzaW5jZSB0aGV5IGFyZSBvbmx5IHJlcXVpcmVkIGZvciBtdWx0aXBsZVxuICAgIC8vIG5vbi1jb250aWd1b3VzIGNoYW5nZXMgaW4gdGhlIGxpc3QsIHdoaWNoIGFyZSBsZXNzIGNvbW1vbi5cbiAgICBsZXQgbmV3S2V5VG9JbmRleE1hcCE6IE1hcDx1bmtub3duLCBudW1iZXI+O1xuICAgIGxldCBvbGRLZXlUb0luZGV4TWFwITogTWFwPHVua25vd24sIG51bWJlcj47XG5cbiAgICAvLyBIZWFkIGFuZCB0YWlsIHBvaW50ZXJzIHRvIG9sZCBwYXJ0cyBhbmQgbmV3IHZhbHVlc1xuICAgIGxldCBvbGRIZWFkID0gMDtcbiAgICBsZXQgb2xkVGFpbCA9IG9sZFBhcnRzLmxlbmd0aCAtIDE7XG4gICAgbGV0IG5ld0hlYWQgPSAwO1xuICAgIGxldCBuZXdUYWlsID0gbmV3VmFsdWVzLmxlbmd0aCAtIDE7XG5cbiAgICAvLyBPdmVydmlldyBvZiBPKG4pIHJlY29uY2lsaWF0aW9uIGFsZ29yaXRobSAoZ2VuZXJhbCBhcHByb2FjaFxuICAgIC8vIGJhc2VkIG9uIGlkZWFzIGZvdW5kIGluIGl2aSwgdnVlLCBzbmFiYmRvbSwgZXRjLik6XG4gICAgLy9cbiAgICAvLyAqIFdlIHN0YXJ0IHdpdGggdGhlIGxpc3Qgb2Ygb2xkIHBhcnRzIGFuZCBuZXcgdmFsdWVzIChhbmRcbiAgICAvLyAgIGFycmF5cyBvZiB0aGVpciByZXNwZWN0aXZlIGtleXMpLCBoZWFkL3RhaWwgcG9pbnRlcnMgaW50b1xuICAgIC8vICAgZWFjaCwgYW5kIHdlIGJ1aWxkIHVwIHRoZSBuZXcgbGlzdCBvZiBwYXJ0cyBieSB1cGRhdGluZ1xuICAgIC8vICAgKGFuZCB3aGVuIG5lZWRlZCwgbW92aW5nKSBvbGQgcGFydHMgb3IgY3JlYXRpbmcgbmV3IG9uZXMuXG4gICAgLy8gICBUaGUgaW5pdGlhbCBzY2VuYXJpbyBtaWdodCBsb29rIGxpa2UgdGhpcyAoZm9yIGJyZXZpdHkgb2ZcbiAgICAvLyAgIHRoZSBkaWFncmFtcywgdGhlIG51bWJlcnMgaW4gdGhlIGFycmF5IHJlZmxlY3Qga2V5c1xuICAgIC8vICAgYXNzb2NpYXRlZCB3aXRoIHRoZSBvbGQgcGFydHMgb3IgbmV3IHZhbHVlcywgYWx0aG91Z2gga2V5c1xuICAgIC8vICAgYW5kIHBhcnRzL3ZhbHVlcyBhcmUgYWN0dWFsbHkgc3RvcmVkIGluIHBhcmFsbGVsIGFycmF5c1xuICAgIC8vICAgaW5kZXhlZCB1c2luZyB0aGUgc2FtZSBoZWFkL3RhaWwgcG9pbnRlcnMpOlxuICAgIC8vXG4gICAgLy8gICAgICBvbGRIZWFkIHYgICAgICAgICAgICAgICAgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAyLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFsgLCAgLCAgLCAgLCAgLCAgLCAgXVxuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSA8LSByZWZsZWN0cyB0aGUgdXNlcidzIG5ld1xuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtIG9yZGVyXG4gICAgLy8gICAgICBuZXdIZWFkIF4gICAgICAgICAgICAgICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBJdGVyYXRlIG9sZCAmIG5ldyBsaXN0cyBmcm9tIGJvdGggc2lkZXMsIHVwZGF0aW5nLFxuICAgIC8vICAgc3dhcHBpbmcsIG9yIHJlbW92aW5nIHBhcnRzIGF0IHRoZSBoZWFkL3RhaWwgbG9jYXRpb25zXG4gICAgLy8gICB1bnRpbCBuZWl0aGVyIGhlYWQgbm9yIHRhaWwgY2FuIG1vdmUuXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IGtleXMgYXQgaGVhZCBwb2ludGVycyBtYXRjaCwgc28gdXBkYXRlIG9sZFxuICAgIC8vICAgcGFydCAwIGluLXBsYWNlIChubyBuZWVkIHRvIG1vdmUgaXQpIGFuZCByZWNvcmQgcGFydCAwIGluXG4gICAgLy8gICB0aGUgYG5ld1BhcnRzYCBsaXN0LiBUaGUgbGFzdCB0aGluZyB3ZSBkbyBpcyBhZHZhbmNlIHRoZVxuICAgIC8vICAgYG9sZEhlYWRgIGFuZCBgbmV3SGVhZGAgcG9pbnRlcnMgKHdpbGwgYmUgcmVmbGVjdGVkIGluIHRoZVxuICAgIC8vICAgbmV4dCBkaWFncmFtKS5cbiAgICAvL1xuICAgIC8vICAgICAgb2xkSGVhZCB2ICAgICAgICAgICAgICAgICB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgMiwgMywgNCwgNSwgNl1cbiAgICAvLyAgIG5ld1BhcnRzOiBbMCwgICwgICwgICwgICwgICwgIF0gPC0gaGVhZHMgbWF0Y2hlZDogdXBkYXRlIDBcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICAgYW5kIGFkdmFuY2UgYm90aCBvbGRIZWFkXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICYgbmV3SGVhZFxuICAgIC8vICAgICAgbmV3SGVhZCBeICAgICAgICAgICAgICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogaGVhZCBwb2ludGVycyBkb24ndCBtYXRjaCwgYnV0IHRhaWxcbiAgICAvLyAgIHBvaW50ZXJzIGRvLCBzbyB1cGRhdGUgcGFydCA2IGluIHBsYWNlIChubyBuZWVkIHRvIG1vdmVcbiAgICAvLyAgIGl0KSwgYW5kIHJlY29yZCBwYXJ0IDYgaW4gdGhlIGBuZXdQYXJ0c2AgbGlzdC4gTGFzdCxcbiAgICAvLyAgIGFkdmFuY2UgdGhlIGBvbGRUYWlsYCBhbmQgYG9sZEhlYWRgIHBvaW50ZXJzLlxuICAgIC8vXG4gICAgLy8gICAgICAgICBvbGRIZWFkIHYgICAgICAgICAgICAgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAyLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFswLCAgLCAgLCAgLCAgLCAgLCA2XSA8LSB0YWlscyBtYXRjaGVkOiB1cGRhdGUgNlxuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSAgICBhbmQgYWR2YW5jZSBib3RoIG9sZFRhaWxcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJiBuZXdUYWlsXG4gICAgLy8gICAgICAgICBuZXdIZWFkIF4gICAgICAgICAgICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBJZiBuZWl0aGVyIGhlYWQgbm9yIHRhaWwgbWF0Y2g7IG5leHQgY2hlY2sgaWYgb25lIG9mIHRoZVxuICAgIC8vICAgb2xkIGhlYWQvdGFpbCBpdGVtcyB3YXMgcmVtb3ZlZC4gV2UgZmlyc3QgbmVlZCB0byBnZW5lcmF0ZVxuICAgIC8vICAgdGhlIHJldmVyc2UgbWFwIG9mIG5ldyBrZXlzIHRvIGluZGV4IChgbmV3S2V5VG9JbmRleE1hcGApLFxuICAgIC8vICAgd2hpY2ggaXMgZG9uZSBvbmNlIGxhemlseSBhcyBhIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvbixcbiAgICAvLyAgIHNpbmNlIHdlIG9ubHkgaGl0IHRoaXMgY2FzZSBpZiBtdWx0aXBsZSBub24tY29udGlndW91c1xuICAgIC8vICAgY2hhbmdlcyB3ZXJlIG1hZGUuIE5vdGUgdGhhdCBmb3IgY29udGlndW91cyByZW1vdmFsXG4gICAgLy8gICBhbnl3aGVyZSBpbiB0aGUgbGlzdCwgdGhlIGhlYWQgYW5kIHRhaWxzIHdvdWxkIGFkdmFuY2VcbiAgICAvLyAgIGZyb20gZWl0aGVyIGVuZCBhbmQgcGFzcyBlYWNoIG90aGVyIGJlZm9yZSB3ZSBnZXQgdG8gdGhpc1xuICAgIC8vICAgY2FzZSBhbmQgcmVtb3ZhbHMgd291bGQgYmUgaGFuZGxlZCBpbiB0aGUgZmluYWwgd2hpbGUgbG9vcFxuICAgIC8vICAgd2l0aG91dCBuZWVkaW5nIHRvIGdlbmVyYXRlIHRoZSBtYXAuXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IFRoZSBrZXkgYXQgYG9sZFRhaWxgIHdhcyByZW1vdmVkIChubyBsb25nZXJcbiAgICAvLyAgIGluIHRoZSBgbmV3S2V5VG9JbmRleE1hcGApLCBzbyByZW1vdmUgdGhhdCBwYXJ0IGZyb20gdGhlXG4gICAgLy8gICBET00gYW5kIGFkdmFuY2UganVzdCB0aGUgYG9sZFRhaWxgIHBvaW50ZXIuXG4gICAgLy9cbiAgICAvLyAgICAgICAgIG9sZEhlYWQgdiAgICAgICAgICAgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIDIsIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsICAsICAsICAsICAsICAsIDZdIDwtIDUgbm90IGluIG5ldyBtYXA6IHJlbW92ZVxuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSAgICA1IGFuZCBhZHZhbmNlIG9sZFRhaWxcbiAgICAvLyAgICAgICAgIG5ld0hlYWQgXiAgICAgICAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIE9uY2UgaGVhZCBhbmQgdGFpbCBjYW5ub3QgbW92ZSwgYW55IG1pc21hdGNoZXMgYXJlIGR1ZSB0b1xuICAgIC8vICAgZWl0aGVyIG5ldyBvciBtb3ZlZCBpdGVtczsgaWYgYSBuZXcga2V5IGlzIGluIHRoZSBwcmV2aW91c1xuICAgIC8vICAgXCJvbGQga2V5IHRvIG9sZCBpbmRleFwiIG1hcCwgbW92ZSB0aGUgb2xkIHBhcnQgdG8gdGhlIG5ld1xuICAgIC8vICAgbG9jYXRpb24sIG90aGVyd2lzZSBjcmVhdGUgYW5kIGluc2VydCBhIG5ldyBwYXJ0LiBOb3RlXG4gICAgLy8gICB0aGF0IHdoZW4gbW92aW5nIGFuIG9sZCBwYXJ0IHdlIG51bGwgaXRzIHBvc2l0aW9uIGluIHRoZVxuICAgIC8vICAgb2xkUGFydHMgYXJyYXkgaWYgaXQgbGllcyBiZXR3ZWVuIHRoZSBoZWFkIGFuZCB0YWlsIHNvIHdlXG4gICAgLy8gICBrbm93IHRvIHNraXAgaXQgd2hlbiB0aGUgcG9pbnRlcnMgZ2V0IHRoZXJlLlxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBuZWl0aGVyIGhlYWQgbm9yIHRhaWwgbWF0Y2gsIGFuZCBuZWl0aGVyXG4gICAgLy8gICB3ZXJlIHJlbW92ZWQ7IHNvIGZpbmQgdGhlIGBuZXdIZWFkYCBrZXkgaW4gdGhlXG4gICAgLy8gICBgb2xkS2V5VG9JbmRleE1hcGAsIGFuZCBtb3ZlIHRoYXQgb2xkIHBhcnQncyBET00gaW50byB0aGVcbiAgICAvLyAgIG5leHQgaGVhZCBwb3NpdGlvbiAoYmVmb3JlIGBvbGRQYXJ0c1tvbGRIZWFkXWApLiBMYXN0LFxuICAgIC8vICAgbnVsbCB0aGUgcGFydCBpbiB0aGUgYG9sZFBhcnRgIGFycmF5IHNpbmNlIGl0IHdhc1xuICAgIC8vICAgc29tZXdoZXJlIGluIHRoZSByZW1haW5pbmcgb2xkUGFydHMgc3RpbGwgdG8gYmUgc2Nhbm5lZFxuICAgIC8vICAgKGJldHdlZW4gdGhlIGhlYWQgYW5kIHRhaWwgcG9pbnRlcnMpIHNvIHRoYXQgd2Uga25vdyB0b1xuICAgIC8vICAgc2tpcCB0aGF0IG9sZCBwYXJ0IG9uIGZ1dHVyZSBpdGVyYXRpb25zLlxuICAgIC8vXG4gICAgLy8gICAgICAgICBvbGRIZWFkIHYgICAgICAgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAtLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFswLCAyLCAgLCAgLCAgLCAgLCA2XSA8LSBzdHVjazogdXBkYXRlICYgbW92ZSAyXG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGludG8gcGxhY2UgYW5kIGFkdmFuY2VcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3SGVhZFxuICAgIC8vICAgICAgICAgbmV3SGVhZCBeICAgICAgICAgICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogTm90ZSB0aGF0IGZvciBtb3Zlcy9pbnNlcnRpb25zIGxpa2UgdGhlIG9uZSBhYm92ZSwgYSBwYXJ0XG4gICAgLy8gICBpbnNlcnRlZCBhdCB0aGUgaGVhZCBwb2ludGVyIGlzIGluc2VydGVkIGJlZm9yZSB0aGVcbiAgICAvLyAgIGN1cnJlbnQgYG9sZFBhcnRzW29sZEhlYWRdYCwgYW5kIGEgcGFydCBpbnNlcnRlZCBhdCB0aGVcbiAgICAvLyAgIHRhaWwgcG9pbnRlciBpcyBpbnNlcnRlZCBiZWZvcmUgYG5ld1BhcnRzW25ld1RhaWwrMV1gLiBUaGVcbiAgICAvLyAgIHNlZW1pbmcgYXN5bW1ldHJ5IGxpZXMgaW4gdGhlIGZhY3QgdGhhdCBuZXcgcGFydHMgYXJlXG4gICAgLy8gICBtb3ZlZCBpbnRvIHBsYWNlIG91dHNpZGUgaW4sIHNvIHRvIHRoZSByaWdodCBvZiB0aGUgaGVhZFxuICAgIC8vICAgcG9pbnRlciBhcmUgb2xkIHBhcnRzLCBhbmQgdG8gdGhlIHJpZ2h0IG9mIHRoZSB0YWlsXG4gICAgLy8gICBwb2ludGVyIGFyZSBuZXcgcGFydHMuXG4gICAgLy9cbiAgICAvLyAqIFdlIGFsd2F5cyByZXN0YXJ0IGJhY2sgZnJvbSB0aGUgdG9wIG9mIHRoZSBhbGdvcml0aG0sXG4gICAgLy8gICBhbGxvd2luZyBtYXRjaGluZyBhbmQgc2ltcGxlIHVwZGF0ZXMgaW4gcGxhY2UgdG9cbiAgICAvLyAgIGNvbnRpbnVlLi4uXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IHRoZSBoZWFkIHBvaW50ZXJzIG9uY2UgYWdhaW4gbWF0Y2gsIHNvXG4gICAgLy8gICBzaW1wbHkgdXBkYXRlIHBhcnQgMSBhbmQgcmVjb3JkIGl0IGluIHRoZSBgbmV3UGFydHNgXG4gICAgLy8gICBhcnJheS4gIExhc3QsIGFkdmFuY2UgYm90aCBoZWFkIHBvaW50ZXJzLlxuICAgIC8vXG4gICAgLy8gICAgICAgICBvbGRIZWFkIHYgICAgICAgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAtLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFswLCAyLCAxLCAgLCAgLCAgLCA2XSA8LSBoZWFkcyBtYXRjaGVkOiB1cGRhdGUgMVxuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSAgICBhbmQgYWR2YW5jZSBib3RoIG9sZEhlYWRcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJiBuZXdIZWFkXG4gICAgLy8gICAgICAgICAgICBuZXdIZWFkIF4gICAgICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBBcyBtZW50aW9uZWQgYWJvdmUsIGl0ZW1zIHRoYXQgd2VyZSBtb3ZlZCBhcyBhIHJlc3VsdCBvZlxuICAgIC8vICAgYmVpbmcgc3R1Y2sgKHRoZSBmaW5hbCBlbHNlIGNsYXVzZSBpbiB0aGUgY29kZSBiZWxvdykgYXJlXG4gICAgLy8gICBtYXJrZWQgd2l0aCBudWxsLCBzbyB3ZSBhbHdheXMgYWR2YW5jZSBvbGQgcG9pbnRlcnMgb3ZlclxuICAgIC8vICAgdGhlc2Ugc28gd2UncmUgY29tcGFyaW5nIHRoZSBuZXh0IGFjdHVhbCBvbGQgdmFsdWUgb25cbiAgICAvLyAgIGVpdGhlciBlbmQuXG4gICAgLy9cbiAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IGBvbGRIZWFkYCBpcyBudWxsIChhbHJlYWR5IHBsYWNlZCBpblxuICAgIC8vICAgbmV3UGFydHMpLCBzbyBhZHZhbmNlIGBvbGRIZWFkYC5cbiAgICAvL1xuICAgIC8vICAgICAgICAgICAgb2xkSGVhZCB2ICAgICB2IG9sZFRhaWxcbiAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgLSwgMywgNCwgNSwgNl0gPC0gb2xkIGhlYWQgYWxyZWFkeSB1c2VkOlxuICAgIC8vICAgbmV3UGFydHM6IFswLCAyLCAxLCAgLCAgLCAgLCA2XSAgICBhZHZhbmNlIG9sZEhlYWRcbiAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl1cbiAgICAvLyAgICAgICAgICAgICAgIG5ld0hlYWQgXiAgICAgXiBuZXdUYWlsXG4gICAgLy9cbiAgICAvLyAqIE5vdGUgaXQncyBub3QgY3JpdGljYWwgdG8gbWFyayBvbGQgcGFydHMgYXMgbnVsbCB3aGVuIHRoZXlcbiAgICAvLyAgIGFyZSBtb3ZlZCBmcm9tIGhlYWQgdG8gdGFpbCBvciB0YWlsIHRvIGhlYWQsIHNpbmNlIHRoZXlcbiAgICAvLyAgIHdpbGwgYmUgb3V0c2lkZSB0aGUgcG9pbnRlciByYW5nZSBhbmQgbmV2ZXIgdmlzaXRlZCBhZ2Fpbi5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogSGVyZSB0aGUgb2xkIHRhaWwga2V5IG1hdGNoZXMgdGhlIG5ldyBoZWFkXG4gICAgLy8gICBrZXksIHNvIHRoZSBwYXJ0IGF0IHRoZSBgb2xkVGFpbGAgcG9zaXRpb24gYW5kIG1vdmUgaXRzXG4gICAgLy8gICBET00gdG8gdGhlIG5ldyBoZWFkIHBvc2l0aW9uIChiZWZvcmUgYG9sZFBhcnRzW29sZEhlYWRdYCkuXG4gICAgLy8gICBMYXN0LCBhZHZhbmNlIGBvbGRUYWlsYCBhbmQgYG5ld0hlYWRgIHBvaW50ZXJzLlxuICAgIC8vXG4gICAgLy8gICAgICAgICAgICAgICBvbGRIZWFkIHYgIHYgb2xkVGFpbFxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAtLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFswLCAyLCAxLCA0LCAgLCAgLCA2XSA8LSBvbGQgdGFpbCBtYXRjaGVzIG5ld1xuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSAgIGhlYWQ6IHVwZGF0ZSAmIG1vdmUgNCxcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZHZhbmNlIG9sZFRhaWwgJiBuZXdIZWFkXG4gICAgLy8gICAgICAgICAgICAgICBuZXdIZWFkIF4gICAgIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBFeGFtcGxlIGJlbG93OiBPbGQgYW5kIG5ldyBoZWFkIGtleXMgbWF0Y2gsIHNvIHVwZGF0ZSB0aGVcbiAgICAvLyAgIG9sZCBoZWFkIHBhcnQgaW4gcGxhY2UsIGFuZCBhZHZhbmNlIHRoZSBgb2xkSGVhZGAgYW5kXG4gICAgLy8gICBgbmV3SGVhZGAgcG9pbnRlcnMuXG4gICAgLy9cbiAgICAvLyAgICAgICAgICAgICAgIG9sZEhlYWQgdiBvbGRUYWlsXG4gICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsIDQsIDMsICAgLDZdIDwtIGhlYWRzIG1hdGNoOiB1cGRhdGUgM1xuICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSAgICBhbmQgYWR2YW5jZSBvbGRIZWFkICZcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3SGVhZFxuICAgIC8vICAgICAgICAgICAgICAgICAgbmV3SGVhZCBeICBeIG5ld1RhaWxcbiAgICAvL1xuICAgIC8vICogT25jZSB0aGUgbmV3IG9yIG9sZCBwb2ludGVycyBtb3ZlIHBhc3QgZWFjaCBvdGhlciB0aGVuIGFsbFxuICAgIC8vICAgd2UgaGF2ZSBsZWZ0IGlzIGFkZGl0aW9ucyAoaWYgb2xkIGxpc3QgZXhoYXVzdGVkKSBvclxuICAgIC8vICAgcmVtb3ZhbHMgKGlmIG5ldyBsaXN0IGV4aGF1c3RlZCkuIFRob3NlIGFyZSBoYW5kbGVkIGluIHRoZVxuICAgIC8vICAgZmluYWwgd2hpbGUgbG9vcHMgYXQgdGhlIGVuZC5cbiAgICAvL1xuICAgIC8vICogRXhhbXBsZSBiZWxvdzogYG9sZEhlYWRgIGV4Y2VlZGVkIGBvbGRUYWlsYCwgc28gd2UncmUgZG9uZVxuICAgIC8vICAgd2l0aCB0aGUgbWFpbiBsb29wLiAgQ3JlYXRlIHRoZSByZW1haW5pbmcgcGFydCBhbmQgaW5zZXJ0XG4gICAgLy8gICBpdCBhdCB0aGUgbmV3IGhlYWQgcG9zaXRpb24sIGFuZCB0aGUgdXBkYXRlIGlzIGNvbXBsZXRlLlxuICAgIC8vXG4gICAgLy8gICAgICAgICAgICAgICAgICAgKG9sZEhlYWQgPiBvbGRUYWlsKVxuICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAtLCAzLCA0LCA1LCA2XVxuICAgIC8vICAgbmV3UGFydHM6IFswLCAyLCAxLCA0LCAzLCA3ICw2XSA8LSBjcmVhdGUgYW5kIGluc2VydCA3XG4gICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICBuZXdIZWFkIF4gbmV3VGFpbFxuICAgIC8vXG4gICAgLy8gKiBOb3RlIHRoYXQgdGhlIG9yZGVyIG9mIHRoZSBpZi9lbHNlIGNsYXVzZXMgaXMgbm90XG4gICAgLy8gICBpbXBvcnRhbnQgdG8gdGhlIGFsZ29yaXRobSwgYXMgbG9uZyBhcyB0aGUgbnVsbCBjaGVja3NcbiAgICAvLyAgIGNvbWUgZmlyc3QgKHRvIGVuc3VyZSB3ZSdyZSBhbHdheXMgd29ya2luZyBvbiB2YWxpZCBvbGRcbiAgICAvLyAgIHBhcnRzKSBhbmQgdGhhdCB0aGUgZmluYWwgZWxzZSBjbGF1c2UgY29tZXMgbGFzdCAoc2luY2VcbiAgICAvLyAgIHRoYXQncyB3aGVyZSB0aGUgZXhwZW5zaXZlIG1vdmVzIG9jY3VyKS4gVGhlIG9yZGVyIG9mXG4gICAgLy8gICByZW1haW5pbmcgY2xhdXNlcyBpcyBpcyBqdXN0IGEgc2ltcGxlIGd1ZXNzIGF0IHdoaWNoIGNhc2VzXG4gICAgLy8gICB3aWxsIGJlIG1vc3QgY29tbW9uLlxuICAgIC8vXG4gICAgLy8gKiBOb3RlLCB3ZSBjb3VsZCBjYWxjdWxhdGUgdGhlIGxvbmdlc3RcbiAgICAvLyAgIGluY3JlYXNpbmcgc3Vic2VxdWVuY2UgKExJUykgb2Ygb2xkIGl0ZW1zIGluIG5ldyBwb3NpdGlvbixcbiAgICAvLyAgIGFuZCBvbmx5IG1vdmUgdGhvc2Ugbm90IGluIHRoZSBMSVMgc2V0LiBIb3dldmVyIHRoYXQgY29zdHNcbiAgICAvLyAgIE8obmxvZ24pIHRpbWUgYW5kIGFkZHMgYSBiaXQgbW9yZSBjb2RlLCBhbmQgb25seSBoZWxwc1xuICAgIC8vICAgbWFrZSByYXJlIHR5cGVzIG9mIG11dGF0aW9ucyByZXF1aXJlIGZld2VyIG1vdmVzLiBUaGVcbiAgICAvLyAgIGFib3ZlIGhhbmRsZXMgcmVtb3ZlcywgYWRkcywgcmV2ZXJzYWwsIHN3YXBzLCBhbmQgc2luZ2xlXG4gICAgLy8gICBtb3ZlcyBvZiBjb250aWd1b3VzIGl0ZW1zIGluIGxpbmVhciB0aW1lLCBpbiB0aGUgbWluaW11bVxuICAgIC8vICAgbnVtYmVyIG9mIG1vdmVzLiBBcyB0aGUgbnVtYmVyIG9mIG11bHRpcGxlIG1vdmVzIHdoZXJlIExJU1xuICAgIC8vICAgbWlnaHQgaGVscCBhcHByb2FjaGVzIGEgcmFuZG9tIHNodWZmbGUsIHRoZSBMSVNcbiAgICAvLyAgIG9wdGltaXphdGlvbiBiZWNvbWVzIGxlc3MgaGVscGZ1bCwgc28gaXQgc2VlbXMgbm90IHdvcnRoXG4gICAgLy8gICB0aGUgY29kZSBhdCB0aGlzIHBvaW50LiBDb3VsZCByZWNvbnNpZGVyIGlmIGEgY29tcGVsbGluZ1xuICAgIC8vICAgY2FzZSBhcmlzZXMuXG5cbiAgICB3aGlsZSAob2xkSGVhZCA8PSBvbGRUYWlsICYmIG5ld0hlYWQgPD0gbmV3VGFpbCkge1xuICAgICAgaWYgKG9sZFBhcnRzW29sZEhlYWRdID09PSBudWxsKSB7XG4gICAgICAgIC8vIGBudWxsYCBtZWFucyBvbGQgcGFydCBhdCBoZWFkIGhhcyBhbHJlYWR5IGJlZW4gdXNlZFxuICAgICAgICAvLyBiZWxvdzsgc2tpcFxuICAgICAgICBvbGRIZWFkKys7XG4gICAgICB9IGVsc2UgaWYgKG9sZFBhcnRzW29sZFRhaWxdID09PSBudWxsKSB7XG4gICAgICAgIC8vIGBudWxsYCBtZWFucyBvbGQgcGFydCBhdCB0YWlsIGhhcyBhbHJlYWR5IGJlZW4gdXNlZFxuICAgICAgICAvLyBiZWxvdzsgc2tpcFxuICAgICAgICBvbGRUYWlsLS07XG4gICAgICB9IGVsc2UgaWYgKG9sZEtleXNbb2xkSGVhZF0gPT09IG5ld0tleXNbbmV3SGVhZF0pIHtcbiAgICAgICAgLy8gT2xkIGhlYWQgbWF0Y2hlcyBuZXcgaGVhZDsgdXBkYXRlIGluIHBsYWNlXG4gICAgICAgIG5ld1BhcnRzW25ld0hlYWRdID0gc2V0Q2hpbGRQYXJ0VmFsdWUoXG4gICAgICAgICAgb2xkUGFydHNbb2xkSGVhZF0hLFxuICAgICAgICAgIG5ld1ZhbHVlc1tuZXdIZWFkXVxuICAgICAgICApO1xuICAgICAgICBvbGRIZWFkKys7XG4gICAgICAgIG5ld0hlYWQrKztcbiAgICAgIH0gZWxzZSBpZiAob2xkS2V5c1tvbGRUYWlsXSA9PT0gbmV3S2V5c1tuZXdUYWlsXSkge1xuICAgICAgICAvLyBPbGQgdGFpbCBtYXRjaGVzIG5ldyB0YWlsOyB1cGRhdGUgaW4gcGxhY2VcbiAgICAgICAgbmV3UGFydHNbbmV3VGFpbF0gPSBzZXRDaGlsZFBhcnRWYWx1ZShcbiAgICAgICAgICBvbGRQYXJ0c1tvbGRUYWlsXSEsXG4gICAgICAgICAgbmV3VmFsdWVzW25ld1RhaWxdXG4gICAgICAgICk7XG4gICAgICAgIG9sZFRhaWwtLTtcbiAgICAgICAgbmV3VGFpbC0tO1xuICAgICAgfSBlbHNlIGlmIChvbGRLZXlzW29sZEhlYWRdID09PSBuZXdLZXlzW25ld1RhaWxdKSB7XG4gICAgICAgIC8vIE9sZCBoZWFkIG1hdGNoZXMgbmV3IHRhaWw7IHVwZGF0ZSBhbmQgbW92ZSB0byBuZXcgdGFpbFxuICAgICAgICBuZXdQYXJ0c1tuZXdUYWlsXSA9IHNldENoaWxkUGFydFZhbHVlKFxuICAgICAgICAgIG9sZFBhcnRzW29sZEhlYWRdISxcbiAgICAgICAgICBuZXdWYWx1ZXNbbmV3VGFpbF1cbiAgICAgICAgKTtcbiAgICAgICAgaW5zZXJ0UGFydChjb250YWluZXJQYXJ0LCBuZXdQYXJ0c1tuZXdUYWlsICsgMV0sIG9sZFBhcnRzW29sZEhlYWRdISk7XG4gICAgICAgIG9sZEhlYWQrKztcbiAgICAgICAgbmV3VGFpbC0tO1xuICAgICAgfSBlbHNlIGlmIChvbGRLZXlzW29sZFRhaWxdID09PSBuZXdLZXlzW25ld0hlYWRdKSB7XG4gICAgICAgIC8vIE9sZCB0YWlsIG1hdGNoZXMgbmV3IGhlYWQ7IHVwZGF0ZSBhbmQgbW92ZSB0byBuZXcgaGVhZFxuICAgICAgICBuZXdQYXJ0c1tuZXdIZWFkXSA9IHNldENoaWxkUGFydFZhbHVlKFxuICAgICAgICAgIG9sZFBhcnRzW29sZFRhaWxdISxcbiAgICAgICAgICBuZXdWYWx1ZXNbbmV3SGVhZF1cbiAgICAgICAgKTtcbiAgICAgICAgaW5zZXJ0UGFydChjb250YWluZXJQYXJ0LCBvbGRQYXJ0c1tvbGRIZWFkXSEsIG9sZFBhcnRzW29sZFRhaWxdISk7XG4gICAgICAgIG9sZFRhaWwtLTtcbiAgICAgICAgbmV3SGVhZCsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKG5ld0tleVRvSW5kZXhNYXAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIExhemlseSBnZW5lcmF0ZSBrZXktdG8taW5kZXggbWFwcywgdXNlZCBmb3IgcmVtb3ZhbHMgJlxuICAgICAgICAgIC8vIG1vdmVzIGJlbG93XG4gICAgICAgICAgbmV3S2V5VG9JbmRleE1hcCA9IGdlbmVyYXRlTWFwKG5ld0tleXMsIG5ld0hlYWQsIG5ld1RhaWwpO1xuICAgICAgICAgIG9sZEtleVRvSW5kZXhNYXAgPSBnZW5lcmF0ZU1hcChvbGRLZXlzLCBvbGRIZWFkLCBvbGRUYWlsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW5ld0tleVRvSW5kZXhNYXAuaGFzKG9sZEtleXNbb2xkSGVhZF0pKSB7XG4gICAgICAgICAgLy8gT2xkIGhlYWQgaXMgbm8gbG9uZ2VyIGluIG5ldyBsaXN0OyByZW1vdmVcbiAgICAgICAgICByZW1vdmVQYXJ0KG9sZFBhcnRzW29sZEhlYWRdISk7XG4gICAgICAgICAgb2xkSGVhZCsrO1xuICAgICAgICB9IGVsc2UgaWYgKCFuZXdLZXlUb0luZGV4TWFwLmhhcyhvbGRLZXlzW29sZFRhaWxdKSkge1xuICAgICAgICAgIC8vIE9sZCB0YWlsIGlzIG5vIGxvbmdlciBpbiBuZXcgbGlzdDsgcmVtb3ZlXG4gICAgICAgICAgcmVtb3ZlUGFydChvbGRQYXJ0c1tvbGRUYWlsXSEpO1xuICAgICAgICAgIG9sZFRhaWwtLTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBBbnkgbWlzbWF0Y2hlcyBhdCB0aGlzIHBvaW50IGFyZSBkdWUgdG8gYWRkaXRpb25zIG9yXG4gICAgICAgICAgLy8gbW92ZXM7IHNlZSBpZiB3ZSBoYXZlIGFuIG9sZCBwYXJ0IHdlIGNhbiByZXVzZSBhbmQgbW92ZVxuICAgICAgICAgIC8vIGludG8gcGxhY2VcbiAgICAgICAgICBjb25zdCBvbGRJbmRleCA9IG9sZEtleVRvSW5kZXhNYXAuZ2V0KG5ld0tleXNbbmV3SGVhZF0pO1xuICAgICAgICAgIGNvbnN0IG9sZFBhcnQgPSBvbGRJbmRleCAhPT0gdW5kZWZpbmVkID8gb2xkUGFydHNbb2xkSW5kZXhdIDogbnVsbDtcbiAgICAgICAgICBpZiAob2xkUGFydCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgLy8gTm8gb2xkIHBhcnQgZm9yIHRoaXMgdmFsdWU7IGNyZWF0ZSBhIG5ldyBvbmUgYW5kXG4gICAgICAgICAgICAvLyBpbnNlcnQgaXRcbiAgICAgICAgICAgIGNvbnN0IG5ld1BhcnQgPSBpbnNlcnRQYXJ0KGNvbnRhaW5lclBhcnQsIG9sZFBhcnRzW29sZEhlYWRdISk7XG4gICAgICAgICAgICBzZXRDaGlsZFBhcnRWYWx1ZShuZXdQYXJ0LCBuZXdWYWx1ZXNbbmV3SGVhZF0pO1xuICAgICAgICAgICAgbmV3UGFydHNbbmV3SGVhZF0gPSBuZXdQYXJ0O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBSZXVzZSBvbGQgcGFydFxuICAgICAgICAgICAgbmV3UGFydHNbbmV3SGVhZF0gPSBzZXRDaGlsZFBhcnRWYWx1ZShvbGRQYXJ0LCBuZXdWYWx1ZXNbbmV3SGVhZF0pO1xuICAgICAgICAgICAgaW5zZXJ0UGFydChjb250YWluZXJQYXJ0LCBvbGRQYXJ0c1tvbGRIZWFkXSEsIG9sZFBhcnQpO1xuICAgICAgICAgICAgLy8gVGhpcyBtYXJrcyB0aGUgb2xkIHBhcnQgYXMgaGF2aW5nIGJlZW4gdXNlZCwgc28gdGhhdFxuICAgICAgICAgICAgLy8gaXQgd2lsbCBiZSBza2lwcGVkIGluIHRoZSBmaXJzdCB0d28gY2hlY2tzIGFib3ZlXG4gICAgICAgICAgICBvbGRQYXJ0c1tvbGRJbmRleCBhcyBudW1iZXJdID0gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgbmV3SGVhZCsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEFkZCBwYXJ0cyBmb3IgYW55IHJlbWFpbmluZyBuZXcgdmFsdWVzXG4gICAgd2hpbGUgKG5ld0hlYWQgPD0gbmV3VGFpbCkge1xuICAgICAgLy8gRm9yIGFsbCByZW1haW5pbmcgYWRkaXRpb25zLCB3ZSBpbnNlcnQgYmVmb3JlIGxhc3QgbmV3XG4gICAgICAvLyB0YWlsLCBzaW5jZSBvbGQgcG9pbnRlcnMgYXJlIG5vIGxvbmdlciB2YWxpZFxuICAgICAgY29uc3QgbmV3UGFydCA9IGluc2VydFBhcnQoY29udGFpbmVyUGFydCwgbmV3UGFydHNbbmV3VGFpbCArIDFdKTtcbiAgICAgIHNldENoaWxkUGFydFZhbHVlKG5ld1BhcnQsIG5ld1ZhbHVlc1tuZXdIZWFkXSk7XG4gICAgICBuZXdQYXJ0c1tuZXdIZWFkKytdID0gbmV3UGFydDtcbiAgICB9XG4gICAgLy8gUmVtb3ZlIGFueSByZW1haW5pbmcgdW51c2VkIG9sZCBwYXJ0c1xuICAgIHdoaWxlIChvbGRIZWFkIDw9IG9sZFRhaWwpIHtcbiAgICAgIGNvbnN0IG9sZFBhcnQgPSBvbGRQYXJ0c1tvbGRIZWFkKytdO1xuICAgICAgaWYgKG9sZFBhcnQgIT09IG51bGwpIHtcbiAgICAgICAgcmVtb3ZlUGFydChvbGRQYXJ0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTYXZlIG9yZGVyIG9mIG5ldyBwYXJ0cyBmb3IgbmV4dCByb3VuZFxuICAgIHRoaXMuX2l0ZW1LZXlzID0gbmV3S2V5cztcbiAgICAvLyBEaXJlY3RseSBzZXQgcGFydCB2YWx1ZSwgYnlwYXNzaW5nIGl0J3MgZGlydHktY2hlY2tpbmdcbiAgICBzZXRDb21taXR0ZWRWYWx1ZShjb250YWluZXJQYXJ0LCBuZXdQYXJ0cyk7XG4gICAgcmV0dXJuIG5vQ2hhbmdlO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVwZWF0RGlyZWN0aXZlRm4ge1xuICA8VD4oXG4gICAgaXRlbXM6IEl0ZXJhYmxlPFQ+LFxuICAgIGtleUZuT3JUZW1wbGF0ZTogS2V5Rm48VD4gfCBJdGVtVGVtcGxhdGU8VD4sXG4gICAgdGVtcGxhdGU/OiBJdGVtVGVtcGxhdGU8VD5cbiAgKTogdW5rbm93bjtcbiAgPFQ+KGl0ZW1zOiBJdGVyYWJsZTxUPiwgdGVtcGxhdGU6IEl0ZW1UZW1wbGF0ZTxUPik6IHVua25vd247XG4gIDxUPihcbiAgICBpdGVtczogSXRlcmFibGU8VD4sXG4gICAga2V5Rm46IEtleUZuPFQ+IHwgSXRlbVRlbXBsYXRlPFQ+LFxuICAgIHRlbXBsYXRlOiBJdGVtVGVtcGxhdGU8VD5cbiAgKTogdW5rbm93bjtcbn1cblxuLyoqXG4gKiBBIGRpcmVjdGl2ZSB0aGF0IHJlcGVhdHMgYSBzZXJpZXMgb2YgdmFsdWVzICh1c3VhbGx5IGBUZW1wbGF0ZVJlc3VsdHNgKVxuICogZ2VuZXJhdGVkIGZyb20gYW4gaXRlcmFibGUsIGFuZCB1cGRhdGVzIHRob3NlIGl0ZW1zIGVmZmljaWVudGx5IHdoZW4gdGhlXG4gKiBpdGVyYWJsZSBjaGFuZ2VzIGJhc2VkIG9uIHVzZXItcHJvdmlkZWQgYGtleXNgIGFzc29jaWF0ZWQgd2l0aCBlYWNoIGl0ZW0uXG4gKlxuICogTm90ZSB0aGF0IGlmIGEgYGtleUZuYCBpcyBwcm92aWRlZCwgc3RyaWN0IGtleS10by1ET00gbWFwcGluZyBpcyBtYWludGFpbmVkLFxuICogbWVhbmluZyBwcmV2aW91cyBET00gZm9yIGEgZ2l2ZW4ga2V5IGlzIG1vdmVkIGludG8gdGhlIG5ldyBwb3NpdGlvbiBpZlxuICogbmVlZGVkLCBhbmQgRE9NIHdpbGwgbmV2ZXIgYmUgcmV1c2VkIHdpdGggdmFsdWVzIGZvciBkaWZmZXJlbnQga2V5cyAobmV3IERPTVxuICogd2lsbCBhbHdheXMgYmUgY3JlYXRlZCBmb3IgbmV3IGtleXMpLiBUaGlzIGlzIGdlbmVyYWxseSB0aGUgbW9zdCBlZmZpY2llbnRcbiAqIHdheSB0byB1c2UgYHJlcGVhdGAgc2luY2UgaXQgcGVyZm9ybXMgbWluaW11bSB1bm5lY2Vzc2FyeSB3b3JrIGZvciBpbnNlcnRpb25zXG4gKiBhbmQgcmVtb3ZhbHMuXG4gKlxuICogVGhlIGBrZXlGbmAgdGFrZXMgdHdvIHBhcmFtZXRlcnMsIHRoZSBpdGVtIGFuZCBpdHMgaW5kZXgsIGFuZCByZXR1cm5zIGEgdW5pcXVlIGtleSB2YWx1ZS5cbiAqXG4gKiBgYGBqc1xuICogaHRtbGBcbiAqICAgPG9sPlxuICogICAgICR7cmVwZWF0KHRoaXMuaXRlbXMsIChpdGVtKSA9PiBpdGVtLmlkLCAoaXRlbSwgaW5kZXgpID0+IHtcbiAqICAgICAgIHJldHVybiBodG1sYDxsaT4ke2luZGV4fTogJHtpdGVtLm5hbWV9PC9saT5gO1xuICogICAgIH0pfVxuICogICA8L29sPlxuICogYFxuICogYGBgXG4gKlxuICogKipJbXBvcnRhbnQqKjogSWYgcHJvdmlkaW5nIGEgYGtleUZuYCwga2V5cyAqbXVzdCogYmUgdW5pcXVlIGZvciBhbGwgaXRlbXMgaW4gYVxuICogZ2l2ZW4gY2FsbCB0byBgcmVwZWF0YC4gVGhlIGJlaGF2aW9yIHdoZW4gdHdvIG9yIG1vcmUgaXRlbXMgaGF2ZSB0aGUgc2FtZSBrZXlcbiAqIGlzIHVuZGVmaW5lZC5cbiAqXG4gKiBJZiBubyBga2V5Rm5gIGlzIHByb3ZpZGVkLCB0aGlzIGRpcmVjdGl2ZSB3aWxsIHBlcmZvcm0gc2ltaWxhciB0byBtYXBwaW5nXG4gKiBpdGVtcyB0byB2YWx1ZXMsIGFuZCBET00gd2lsbCBiZSByZXVzZWQgYWdhaW5zdCBwb3RlbnRpYWxseSBkaWZmZXJlbnQgaXRlbXMuXG4gKi9cbmV4cG9ydCBjb25zdCByZXBlYXQgPSBkaXJlY3RpdmUoUmVwZWF0RGlyZWN0aXZlKSBhcyBSZXBlYXREaXJlY3RpdmVGbjtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtSZXBlYXREaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTggR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7QXR0cmlidXRlUGFydCwgbm9DaGFuZ2V9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7XG4gIGRpcmVjdGl2ZSxcbiAgRGlyZWN0aXZlLFxuICBEaXJlY3RpdmVQYXJhbWV0ZXJzLFxuICBQYXJ0SW5mbyxcbiAgUGFydFR5cGUsXG59IGZyb20gJy4uL2RpcmVjdGl2ZS5qcyc7XG5cbi8qKlxuICogQSBrZXktdmFsdWUgc2V0IG9mIENTUyBwcm9wZXJ0aWVzIGFuZCB2YWx1ZXMuXG4gKlxuICogVGhlIGtleSBzaG91bGQgYmUgZWl0aGVyIGEgdmFsaWQgQ1NTIHByb3BlcnR5IG5hbWUgc3RyaW5nLCBsaWtlXG4gKiBgJ2JhY2tncm91bmQtY29sb3InYCwgb3IgYSB2YWxpZCBKYXZhU2NyaXB0IGNhbWVsIGNhc2UgcHJvcGVydHkgbmFtZVxuICogZm9yIENTU1N0eWxlRGVjbGFyYXRpb24gbGlrZSBgYmFja2dyb3VuZENvbG9yYC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTdHlsZUluZm8ge1xuICBbbmFtZTogc3RyaW5nXTogc3RyaW5nIHwgbnVtYmVyIHwgdW5kZWZpbmVkIHwgbnVsbDtcbn1cblxuY29uc3QgaW1wb3J0YW50ID0gJ2ltcG9ydGFudCc7XG4vLyBUaGUgbGVhZGluZyBzcGFjZSBpcyBpbXBvcnRhbnRcbmNvbnN0IGltcG9ydGFudEZsYWcgPSAnICEnICsgaW1wb3J0YW50O1xuLy8gSG93IG1hbnkgY2hhcmFjdGVycyB0byByZW1vdmUgZnJvbSBhIHZhbHVlLCBhcyBhIG5lZ2F0aXZlIG51bWJlclxuY29uc3QgZmxhZ1RyaW0gPSAwIC0gaW1wb3J0YW50RmxhZy5sZW5ndGg7XG5cbmNsYXNzIFN0eWxlTWFwRGlyZWN0aXZlIGV4dGVuZHMgRGlyZWN0aXZlIHtcbiAgX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzPzogU2V0PHN0cmluZz47XG5cbiAgY29uc3RydWN0b3IocGFydEluZm86IFBhcnRJbmZvKSB7XG4gICAgc3VwZXIocGFydEluZm8pO1xuICAgIGlmIChcbiAgICAgIHBhcnRJbmZvLnR5cGUgIT09IFBhcnRUeXBlLkFUVFJJQlVURSB8fFxuICAgICAgcGFydEluZm8ubmFtZSAhPT0gJ3N0eWxlJyB8fFxuICAgICAgKHBhcnRJbmZvLnN0cmluZ3M/Lmxlbmd0aCBhcyBudW1iZXIpID4gMlxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnVGhlIGBzdHlsZU1hcGAgZGlyZWN0aXZlIG11c3QgYmUgdXNlZCBpbiB0aGUgYHN0eWxlYCBhdHRyaWJ1dGUgJyArXG4gICAgICAgICAgJ2FuZCBtdXN0IGJlIHRoZSBvbmx5IHBhcnQgaW4gdGhlIGF0dHJpYnV0ZS4nXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlcihzdHlsZUluZm86IFJlYWRvbmx5PFN0eWxlSW5mbz4pIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc3R5bGVJbmZvKS5yZWR1Y2UoKHN0eWxlLCBwcm9wKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHN0eWxlSW5mb1twcm9wXTtcbiAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBzdHlsZTtcbiAgICAgIH1cbiAgICAgIC8vIENvbnZlcnQgcHJvcGVydHkgbmFtZXMgZnJvbSBjYW1lbC1jYXNlIHRvIGRhc2gtY2FzZSwgaS5lLjpcbiAgICAgIC8vICBgYmFja2dyb3VuZENvbG9yYCAtPiBgYmFja2dyb3VuZC1jb2xvcmBcbiAgICAgIC8vIFZlbmRvci1wcmVmaXhlZCBuYW1lcyBuZWVkIGFuIGV4dHJhIGAtYCBhcHBlbmRlZCB0byBmcm9udDpcbiAgICAgIC8vICBgd2Via2l0QXBwZWFyYW5jZWAgLT4gYC13ZWJraXQtYXBwZWFyYW5jZWBcbiAgICAgIC8vIEV4Y2VwdGlvbiBpcyBhbnkgcHJvcGVydHkgbmFtZSBjb250YWluaW5nIGEgZGFzaCwgaW5jbHVkaW5nXG4gICAgICAvLyBjdXN0b20gcHJvcGVydGllczsgd2UgYXNzdW1lIHRoZXNlIGFyZSBhbHJlYWR5IGRhc2gtY2FzZWQgaS5lLjpcbiAgICAgIC8vICBgLS1teS1idXR0b24tY29sb3JgIC0tPiBgLS1teS1idXR0b24tY29sb3JgXG4gICAgICBwcm9wID0gcHJvcC5pbmNsdWRlcygnLScpXG4gICAgICAgID8gcHJvcFxuICAgICAgICA6IHByb3BcbiAgICAgICAgICAgIC5yZXBsYWNlKC8oPzpeKHdlYmtpdHxtb3p8bXN8byl8KSg/PVtBLVpdKS9nLCAnLSQmJylcbiAgICAgICAgICAgIC50b0xvd2VyQ2FzZSgpO1xuICAgICAgcmV0dXJuIHN0eWxlICsgYCR7cHJvcH06JHt2YWx1ZX07YDtcbiAgICB9LCAnJyk7XG4gIH1cblxuICBvdmVycmlkZSB1cGRhdGUocGFydDogQXR0cmlidXRlUGFydCwgW3N0eWxlSW5mb106IERpcmVjdGl2ZVBhcmFtZXRlcnM8dGhpcz4pIHtcbiAgICBjb25zdCB7c3R5bGV9ID0gcGFydC5lbGVtZW50IGFzIEhUTUxFbGVtZW50O1xuXG4gICAgaWYgKHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzID0gbmV3IFNldCgpO1xuICAgICAgZm9yIChjb25zdCBuYW1lIGluIHN0eWxlSW5mbykge1xuICAgICAgICB0aGlzLl9wcmV2aW91c1N0eWxlUHJvcGVydGllcy5hZGQobmFtZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5yZW5kZXIoc3R5bGVJbmZvKTtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgb2xkIHByb3BlcnRpZXMgdGhhdCBubyBsb25nZXIgZXhpc3QgaW4gc3R5bGVJbmZvXG4gICAgLy8gV2UgdXNlIGZvckVhY2goKSBpbnN0ZWFkIG9mIGZvci1vZiBzbyB0aGF0IHJlIGRvbid0IHJlcXVpcmUgZG93bi1sZXZlbFxuICAgIC8vIGl0ZXJhdGlvbi5cbiAgICB0aGlzLl9wcmV2aW91c1N0eWxlUHJvcGVydGllcyEuZm9yRWFjaCgobmFtZSkgPT4ge1xuICAgICAgLy8gSWYgdGhlIG5hbWUgaXNuJ3QgaW4gc3R5bGVJbmZvIG9yIGl0J3MgbnVsbC91bmRlZmluZWRcbiAgICAgIGlmIChzdHlsZUluZm9bbmFtZV0gPT0gbnVsbCkge1xuICAgICAgICB0aGlzLl9wcmV2aW91c1N0eWxlUHJvcGVydGllcyEuZGVsZXRlKG5hbWUpO1xuICAgICAgICBpZiAobmFtZS5pbmNsdWRlcygnLScpKSB7XG4gICAgICAgICAgc3R5bGUucmVtb3ZlUHJvcGVydHkobmFtZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gTm90ZSByZXNldCB1c2luZyBlbXB0eSBzdHJpbmcgKHZzIG51bGwpIGFzIElFMTEgZG9lcyBub3QgYWx3YXlzXG4gICAgICAgICAgLy8gcmVzZXQgdmlhIG51bGwgKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9FbGVtZW50Q1NTSW5saW5lU3R5bGUvc3R5bGUjc2V0dGluZ19zdHlsZXMpXG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgICAgICAoc3R5bGUgYXMgYW55KVtuYW1lXSA9ICcnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBBZGQgb3IgdXBkYXRlIHByb3BlcnRpZXNcbiAgICBmb3IgKGNvbnN0IG5hbWUgaW4gc3R5bGVJbmZvKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHN0eWxlSW5mb1tuYW1lXTtcbiAgICAgIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMuX3ByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzLmFkZChuYW1lKTtcbiAgICAgICAgY29uc3QgaXNJbXBvcnRhbnQgPVxuICAgICAgICAgIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgJiYgdmFsdWUuZW5kc1dpdGgoaW1wb3J0YW50RmxhZyk7XG4gICAgICAgIGlmIChuYW1lLmluY2x1ZGVzKCctJykgfHwgaXNJbXBvcnRhbnQpIHtcbiAgICAgICAgICBzdHlsZS5zZXRQcm9wZXJ0eShcbiAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICBpc0ltcG9ydGFudFxuICAgICAgICAgICAgICA/ICh2YWx1ZSBhcyBzdHJpbmcpLnNsaWNlKDAsIGZsYWdUcmltKVxuICAgICAgICAgICAgICA6ICh2YWx1ZSBhcyBzdHJpbmcpLFxuICAgICAgICAgICAgaXNJbXBvcnRhbnQgPyBpbXBvcnRhbnQgOiAnJ1xuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgICAgICAoc3R5bGUgYXMgYW55KVtuYW1lXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBub0NoYW5nZTtcbiAgfVxufVxuXG4vKipcbiAqIEEgZGlyZWN0aXZlIHRoYXQgYXBwbGllcyBDU1MgcHJvcGVydGllcyB0byBhbiBlbGVtZW50LlxuICpcbiAqIGBzdHlsZU1hcGAgY2FuIG9ubHkgYmUgdXNlZCBpbiB0aGUgYHN0eWxlYCBhdHRyaWJ1dGUgYW5kIG11c3QgYmUgdGhlIG9ubHlcbiAqIGV4cHJlc3Npb24gaW4gdGhlIGF0dHJpYnV0ZS4gSXQgdGFrZXMgdGhlIHByb3BlcnR5IG5hbWVzIGluIHRoZVxuICoge0BsaW5rIFN0eWxlSW5mbyBzdHlsZUluZm99IG9iamVjdCBhbmQgYWRkcyB0aGUgcHJvcGVydGllcyB0byB0aGUgaW5saW5lXG4gKiBzdHlsZSBvZiB0aGUgZWxlbWVudC5cbiAqXG4gKiBQcm9wZXJ0eSBuYW1lcyB3aXRoIGRhc2hlcyAoYC1gKSBhcmUgYXNzdW1lZCB0byBiZSB2YWxpZCBDU1NcbiAqIHByb3BlcnR5IG5hbWVzIGFuZCBzZXQgb24gdGhlIGVsZW1lbnQncyBzdHlsZSBvYmplY3QgdXNpbmcgYHNldFByb3BlcnR5KClgLlxuICogTmFtZXMgd2l0aG91dCBkYXNoZXMgYXJlIGFzc3VtZWQgdG8gYmUgY2FtZWxDYXNlZCBKYXZhU2NyaXB0IHByb3BlcnR5IG5hbWVzXG4gKiBhbmQgc2V0IG9uIHRoZSBlbGVtZW50J3Mgc3R5bGUgb2JqZWN0IHVzaW5nIHByb3BlcnR5IGFzc2lnbm1lbnQsIGFsbG93aW5nIHRoZVxuICogc3R5bGUgb2JqZWN0IHRvIHRyYW5zbGF0ZSBKYXZhU2NyaXB0LXN0eWxlIG5hbWVzIHRvIENTUyBwcm9wZXJ0eSBuYW1lcy5cbiAqXG4gKiBGb3IgZXhhbXBsZSBgc3R5bGVNYXAoe2JhY2tncm91bmRDb2xvcjogJ3JlZCcsICdib3JkZXItdG9wJzogJzVweCcsICctLXNpemUnOlxuICogJzAnfSlgIHNldHMgdGhlIGBiYWNrZ3JvdW5kLWNvbG9yYCwgYGJvcmRlci10b3BgIGFuZCBgLS1zaXplYCBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSBzdHlsZUluZm9cbiAqIEBzZWUge0BsaW5rIGh0dHBzOi8vbGl0LmRldi9kb2NzL3RlbXBsYXRlcy9kaXJlY3RpdmVzLyNzdHlsZW1hcCBzdHlsZU1hcCBjb2RlIHNhbXBsZXMgb24gTGl0LmRldn1cbiAqL1xuZXhwb3J0IGNvbnN0IHN0eWxlTWFwID0gZGlyZWN0aXZlKFN0eWxlTWFwRGlyZWN0aXZlKTtcblxuLyoqXG4gKiBUaGUgdHlwZSBvZiB0aGUgY2xhc3MgdGhhdCBwb3dlcnMgdGhpcyBkaXJlY3RpdmUuIE5lY2Vzc2FyeSBmb3IgbmFtaW5nIHRoZVxuICogZGlyZWN0aXZlJ3MgcmV0dXJuIHR5cGUuXG4gKi9cbmV4cG9ydCB0eXBlIHtTdHlsZU1hcERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMCBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIERpcmVjdGl2ZSwgUGFydEluZm8sIFBhcnRUeXBlfSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuXG5jbGFzcyBUZW1wbGF0ZUNvbnRlbnREaXJlY3RpdmUgZXh0ZW5kcyBEaXJlY3RpdmUge1xuICBwcml2YXRlIF9wcmV2aW91c1RlbXBsYXRlPzogSFRNTFRlbXBsYXRlRWxlbWVudDtcblxuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gICAgaWYgKHBhcnRJbmZvLnR5cGUgIT09IFBhcnRUeXBlLkNISUxEKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3RlbXBsYXRlQ29udGVudCBjYW4gb25seSBiZSB1c2VkIGluIGNoaWxkIGJpbmRpbmdzJyk7XG4gICAgfVxuICB9XG5cbiAgcmVuZGVyKHRlbXBsYXRlOiBIVE1MVGVtcGxhdGVFbGVtZW50KSB7XG4gICAgaWYgKHRoaXMuX3ByZXZpb3VzVGVtcGxhdGUgPT09IHRlbXBsYXRlKSB7XG4gICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgfVxuICAgIHRoaXMuX3ByZXZpb3VzVGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgICByZXR1cm4gZG9jdW1lbnQuaW1wb3J0Tm9kZSh0ZW1wbGF0ZS5jb250ZW50LCB0cnVlKTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbmRlcnMgdGhlIGNvbnRlbnQgb2YgYSB0ZW1wbGF0ZSBlbGVtZW50IGFzIEhUTUwuXG4gKlxuICogTm90ZSwgdGhlIHRlbXBsYXRlIHNob3VsZCBiZSBkZXZlbG9wZXIgY29udHJvbGxlZCBhbmQgbm90IHVzZXIgY29udHJvbGxlZC5cbiAqIFJlbmRlcmluZyBhIHVzZXItY29udHJvbGxlZCB0ZW1wbGF0ZSB3aXRoIHRoaXMgZGlyZWN0aXZlXG4gKiBjb3VsZCBsZWFkIHRvIGNyb3NzLXNpdGUtc2NyaXB0aW5nIHZ1bG5lcmFiaWxpdGllcy5cbiAqL1xuZXhwb3J0IGNvbnN0IHRlbXBsYXRlQ29udGVudCA9IGRpcmVjdGl2ZShUZW1wbGF0ZUNvbnRlbnREaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge1RlbXBsYXRlQ29udGVudERpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtub3RoaW5nLCBUZW1wbGF0ZVJlc3VsdCwgbm9DaGFuZ2V9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcbmltcG9ydCB7ZGlyZWN0aXZlLCBEaXJlY3RpdmUsIFBhcnRJbmZvLCBQYXJ0VHlwZX0gZnJvbSAnLi4vZGlyZWN0aXZlLmpzJztcblxuY29uc3QgSFRNTF9SRVNVTFQgPSAxO1xuXG5leHBvcnQgY2xhc3MgVW5zYWZlSFRNTERpcmVjdGl2ZSBleHRlbmRzIERpcmVjdGl2ZSB7XG4gIHN0YXRpYyBkaXJlY3RpdmVOYW1lID0gJ3Vuc2FmZUhUTUwnO1xuICBzdGF0aWMgcmVzdWx0VHlwZSA9IEhUTUxfUkVTVUxUO1xuXG4gIHByaXZhdGUgX3ZhbHVlOiB1bmtub3duID0gbm90aGluZztcbiAgcHJpdmF0ZSBfdGVtcGxhdGVSZXN1bHQ/OiBUZW1wbGF0ZVJlc3VsdDtcblxuICBjb25zdHJ1Y3RvcihwYXJ0SW5mbzogUGFydEluZm8pIHtcbiAgICBzdXBlcihwYXJ0SW5mbyk7XG4gICAgaWYgKHBhcnRJbmZvLnR5cGUgIT09IFBhcnRUeXBlLkNISUxEKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGAke1xuICAgICAgICAgICh0aGlzLmNvbnN0cnVjdG9yIGFzIHR5cGVvZiBVbnNhZmVIVE1MRGlyZWN0aXZlKS5kaXJlY3RpdmVOYW1lXG4gICAgICAgIH0oKSBjYW4gb25seSBiZSB1c2VkIGluIGNoaWxkIGJpbmRpbmdzYFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXIodmFsdWU6IHN0cmluZyB8IHR5cGVvZiBub3RoaW5nIHwgdHlwZW9mIG5vQ2hhbmdlIHwgdW5kZWZpbmVkIHwgbnVsbCkge1xuICAgIGlmICh2YWx1ZSA9PT0gbm90aGluZyB8fCB2YWx1ZSA9PSBudWxsKSB7XG4gICAgICB0aGlzLl90ZW1wbGF0ZVJlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICAgIHJldHVybiAodGhpcy5fdmFsdWUgPSB2YWx1ZSk7XG4gICAgfVxuICAgIGlmICh2YWx1ZSA9PT0gbm9DaGFuZ2UpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgJHtcbiAgICAgICAgICAodGhpcy5jb25zdHJ1Y3RvciBhcyB0eXBlb2YgVW5zYWZlSFRNTERpcmVjdGl2ZSkuZGlyZWN0aXZlTmFtZVxuICAgICAgICB9KCkgY2FsbGVkIHdpdGggYSBub24tc3RyaW5nIHZhbHVlYFxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlID09PSB0aGlzLl92YWx1ZSkge1xuICAgICAgcmV0dXJuIHRoaXMuX3RlbXBsYXRlUmVzdWx0O1xuICAgIH1cbiAgICB0aGlzLl92YWx1ZSA9IHZhbHVlO1xuICAgIGNvbnN0IHN0cmluZ3MgPSBbdmFsdWVdIGFzIHVua25vd24gYXMgVGVtcGxhdGVTdHJpbmdzQXJyYXk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAoc3RyaW5ncyBhcyBhbnkpLnJhdyA9IHN0cmluZ3M7XG4gICAgLy8gV0FSTklORzogaW1wZXJzb25hdGluZyBhIFRlbXBsYXRlUmVzdWx0IGxpa2UgdGhpcyBpcyBleHRyZW1lbHlcbiAgICAvLyBkYW5nZXJvdXMuIFRoaXJkLXBhcnR5IGRpcmVjdGl2ZXMgc2hvdWxkIG5vdCBkbyB0aGlzLlxuICAgIHJldHVybiAodGhpcy5fdGVtcGxhdGVSZXN1bHQgPSB7XG4gICAgICAvLyBDYXN0IHRvIGEga25vd24gc2V0IG9mIGludGVnZXJzIHRoYXQgc2F0aXNmeSBSZXN1bHRUeXBlIHNvIHRoYXQgd2VcbiAgICAgIC8vIGRvbid0IGhhdmUgdG8gZXhwb3J0IFJlc3VsdFR5cGUgYW5kIHBvc3NpYmx5IGVuY291cmFnZSB0aGlzIHBhdHRlcm4uXG4gICAgICAvLyBUaGlzIHByb3BlcnR5IG5lZWRzIHRvIHJlbWFpbiB1bm1pbmlmaWVkLlxuICAgICAgWydfJGxpdFR5cGUkJ106ICh0aGlzLmNvbnN0cnVjdG9yIGFzIHR5cGVvZiBVbnNhZmVIVE1MRGlyZWN0aXZlKVxuICAgICAgICAucmVzdWx0VHlwZSBhcyAxIHwgMixcbiAgICAgIHN0cmluZ3MsXG4gICAgICB2YWx1ZXM6IFtdLFxuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogUmVuZGVycyB0aGUgcmVzdWx0IGFzIEhUTUwsIHJhdGhlciB0aGFuIHRleHQuXG4gKlxuICogVGhlIHZhbHVlcyBgdW5kZWZpbmVkYCwgYG51bGxgLCBhbmQgYG5vdGhpbmdgLCB3aWxsIGFsbCByZXN1bHQgaW4gbm8gY29udGVudFxuICogKGVtcHR5IHN0cmluZykgYmVpbmcgcmVuZGVyZWQuXG4gKlxuICogTm90ZSwgdGhpcyBpcyB1bnNhZmUgdG8gdXNlIHdpdGggYW55IHVzZXItcHJvdmlkZWQgaW5wdXQgdGhhdCBoYXNuJ3QgYmVlblxuICogc2FuaXRpemVkIG9yIGVzY2FwZWQsIGFzIGl0IG1heSBsZWFkIHRvIGNyb3NzLXNpdGUtc2NyaXB0aW5nXG4gKiB2dWxuZXJhYmlsaXRpZXMuXG4gKi9cbmV4cG9ydCBjb25zdCB1bnNhZmVIVE1MID0gZGlyZWN0aXZlKFVuc2FmZUhUTUxEaXJlY3RpdmUpO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbmltcG9ydCB7ZGlyZWN0aXZlfSBmcm9tICcuLi9kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtVbnNhZmVIVE1MRGlyZWN0aXZlfSBmcm9tICcuL3Vuc2FmZS1odG1sLmpzJztcblxuY29uc3QgU1ZHX1JFU1VMVCA9IDI7XG5cbmNsYXNzIFVuc2FmZVNWR0RpcmVjdGl2ZSBleHRlbmRzIFVuc2FmZUhUTUxEaXJlY3RpdmUge1xuICBzdGF0aWMgb3ZlcnJpZGUgZGlyZWN0aXZlTmFtZSA9ICd1bnNhZmVTVkcnO1xuICBzdGF0aWMgb3ZlcnJpZGUgcmVzdWx0VHlwZSA9IFNWR19SRVNVTFQ7XG59XG5cbi8qKlxuICogUmVuZGVycyB0aGUgcmVzdWx0IGFzIFNWRywgcmF0aGVyIHRoYW4gdGV4dC5cbiAqXG4gKiBUaGUgdmFsdWVzIGB1bmRlZmluZWRgLCBgbnVsbGAsIGFuZCBgbm90aGluZ2AsIHdpbGwgYWxsIHJlc3VsdCBpbiBubyBjb250ZW50XG4gKiAoZW1wdHkgc3RyaW5nKSBiZWluZyByZW5kZXJlZC5cbiAqXG4gKiBOb3RlLCB0aGlzIGlzIHVuc2FmZSB0byB1c2Ugd2l0aCBhbnkgdXNlci1wcm92aWRlZCBpbnB1dCB0aGF0IGhhc24ndCBiZWVuXG4gKiBzYW5pdGl6ZWQgb3IgZXNjYXBlZCwgYXMgaXQgbWF5IGxlYWQgdG8gY3Jvc3Mtc2l0ZS1zY3JpcHRpbmdcbiAqIHZ1bG5lcmFiaWxpdGllcy5cbiAqL1xuZXhwb3J0IGNvbnN0IHVuc2FmZVNWRyA9IGRpcmVjdGl2ZShVbnNhZmVTVkdEaXJlY3RpdmUpO1xuXG4vKipcbiAqIFRoZSB0eXBlIG9mIHRoZSBjbGFzcyB0aGF0IHBvd2VycyB0aGlzIGRpcmVjdGl2ZS4gTmVjZXNzYXJ5IGZvciBuYW1pbmcgdGhlXG4gKiBkaXJlY3RpdmUncyByZXR1cm4gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUge1Vuc2FmZVNWR0RpcmVjdGl2ZX07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDXG4gKiBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQlNELTMtQ2xhdXNlXG4gKi9cblxuaW1wb3J0IHtQYXJ0LCBub0NoYW5nZX0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuaW1wb3J0IHtpc1ByaW1pdGl2ZX0gZnJvbSAnLi4vZGlyZWN0aXZlLWhlbHBlcnMuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIEFzeW5jRGlyZWN0aXZlfSBmcm9tICcuLi9hc3luYy1kaXJlY3RpdmUuanMnO1xuaW1wb3J0IHtQYXVzZXIsIFBzZXVkb1dlYWtSZWZ9IGZyb20gJy4vcHJpdmF0ZS1hc3luYy1oZWxwZXJzLmpzJztcblxuY29uc3QgaXNQcm9taXNlID0gKHg6IHVua25vd24pID0+IHtcbiAgcmV0dXJuICFpc1ByaW1pdGl2ZSh4KSAmJiB0eXBlb2YgKHggYXMge3RoZW4/OiB1bmtub3dufSkudGhlbiA9PT0gJ2Z1bmN0aW9uJztcbn07XG4vLyBFZmZlY3RpdmVseSBpbmZpbml0eSwgYnV0IGEgU01JLlxuY29uc3QgX2luZmluaXR5ID0gMHgzZmZmZmZmZjtcblxuZXhwb3J0IGNsYXNzIFVudGlsRGlyZWN0aXZlIGV4dGVuZHMgQXN5bmNEaXJlY3RpdmUge1xuICBwcml2YXRlIF9fbGFzdFJlbmRlcmVkSW5kZXg6IG51bWJlciA9IF9pbmZpbml0eTtcbiAgcHJpdmF0ZSBfX3ZhbHVlczogdW5rbm93bltdID0gW107XG4gIHByaXZhdGUgX193ZWFrVGhpcyA9IG5ldyBQc2V1ZG9XZWFrUmVmKHRoaXMpO1xuICBwcml2YXRlIF9fcGF1c2VyID0gbmV3IFBhdXNlcigpO1xuXG4gIHJlbmRlciguLi5hcmdzOiBBcnJheTx1bmtub3duPikge1xuICAgIHJldHVybiBhcmdzLmZpbmQoKHgpID0+ICFpc1Byb21pc2UoeCkpID8/IG5vQ2hhbmdlO1xuICB9XG5cbiAgb3ZlcnJpZGUgdXBkYXRlKF9wYXJ0OiBQYXJ0LCBhcmdzOiBBcnJheTx1bmtub3duPikge1xuICAgIGNvbnN0IHByZXZpb3VzVmFsdWVzID0gdGhpcy5fX3ZhbHVlcztcbiAgICBsZXQgcHJldmlvdXNMZW5ndGggPSBwcmV2aW91c1ZhbHVlcy5sZW5ndGg7XG4gICAgdGhpcy5fX3ZhbHVlcyA9IGFyZ3M7XG5cbiAgICBjb25zdCB3ZWFrVGhpcyA9IHRoaXMuX193ZWFrVGhpcztcbiAgICBjb25zdCBwYXVzZXIgPSB0aGlzLl9fcGF1c2VyO1xuXG4gICAgLy8gSWYgb3VyIGluaXRpYWwgcmVuZGVyIG9jY3VycyB3aGlsZSBkaXNjb25uZWN0ZWQsIGVuc3VyZSB0aGF0IHRoZSBwYXVzZXJcbiAgICAvLyBhbmQgd2Vha1RoaXMgYXJlIGluIHRoZSBkaXNjb25uZWN0ZWQgc3RhdGVcbiAgICBpZiAoIXRoaXMuaXNDb25uZWN0ZWQpIHtcbiAgICAgIHRoaXMuZGlzY29ubmVjdGVkKCk7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAvLyBJZiB3ZSd2ZSByZW5kZXJlZCBhIGhpZ2hlci1wcmlvcml0eSB2YWx1ZSBhbHJlYWR5LCBzdG9wLlxuICAgICAgaWYgKGkgPiB0aGlzLl9fbGFzdFJlbmRlcmVkSW5kZXgpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHZhbHVlID0gYXJnc1tpXTtcblxuICAgICAgLy8gUmVuZGVyIG5vbi1Qcm9taXNlIHZhbHVlcyBpbW1lZGlhdGVseVxuICAgICAgaWYgKCFpc1Byb21pc2UodmFsdWUpKSB7XG4gICAgICAgIHRoaXMuX19sYXN0UmVuZGVyZWRJbmRleCA9IGk7XG4gICAgICAgIC8vIFNpbmNlIGEgbG93ZXItcHJpb3JpdHkgdmFsdWUgd2lsbCBuZXZlciBvdmVyd3JpdGUgYSBoaWdoZXItcHJpb3JpdHlcbiAgICAgICAgLy8gc3luY2hyb25vdXMgdmFsdWUsIHdlIGNhbiBzdG9wIHByb2Nlc3Npbmcgbm93LlxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoaXMgaXMgYSBQcm9taXNlIHdlJ3ZlIGFscmVhZHkgaGFuZGxlZCwgc2tpcCBpdC5cbiAgICAgIGlmIChpIDwgcHJldmlvdXNMZW5ndGggJiYgdmFsdWUgPT09IHByZXZpb3VzVmFsdWVzW2ldKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBXZSBoYXZlIGEgUHJvbWlzZSB0aGF0IHdlIGhhdmVuJ3Qgc2VlbiBiZWZvcmUsIHNvIHByaW9yaXRpZXMgbWF5IGhhdmVcbiAgICAgIC8vIGNoYW5nZWQuIEZvcmdldCB3aGF0IHdlIHJlbmRlcmVkIGJlZm9yZS5cbiAgICAgIHRoaXMuX19sYXN0UmVuZGVyZWRJbmRleCA9IF9pbmZpbml0eTtcbiAgICAgIHByZXZpb3VzTGVuZ3RoID0gMDtcblxuICAgICAgLy8gTm90ZSwgdGhlIGNhbGxiYWNrIGF2b2lkcyBjbG9zaW5nIG92ZXIgYHRoaXNgIHNvIHRoYXQgdGhlIGRpcmVjdGl2ZVxuICAgICAgLy8gY2FuIGJlIGdjJ2VkIGJlZm9yZSB0aGUgcHJvbWlzZSByZXNvbHZlczsgaW5zdGVhZCBgdGhpc2AgaXMgcmV0cmlldmVkXG4gICAgICAvLyBmcm9tIGB3ZWFrVGhpc2AsIHdoaWNoIGNhbiBicmVhayB0aGUgaGFyZCByZWZlcmVuY2UgaW4gdGhlIGNsb3N1cmUgd2hlblxuICAgICAgLy8gdGhlIGRpcmVjdGl2ZSBkaXNjb25uZWN0c1xuICAgICAgUHJvbWlzZS5yZXNvbHZlKHZhbHVlKS50aGVuKGFzeW5jIChyZXN1bHQ6IHVua25vd24pID0+IHtcbiAgICAgICAgLy8gSWYgd2UncmUgZGlzY29ubmVjdGVkLCB3YWl0IHVudGlsIHdlJ3JlIChtYXliZSkgcmVjb25uZWN0ZWRcbiAgICAgICAgLy8gVGhlIHdoaWxlIGxvb3AgaGVyZSBoYW5kbGVzIHRoZSBjYXNlIHRoYXQgdGhlIGNvbm5lY3Rpb24gc3RhdGVcbiAgICAgICAgLy8gdGhyYXNoZXMsIGNhdXNpbmcgdGhlIHBhdXNlciB0byByZXN1bWUgYW5kIHRoZW4gZ2V0IHJlLXBhdXNlZFxuICAgICAgICB3aGlsZSAocGF1c2VyLmdldCgpKSB7XG4gICAgICAgICAgYXdhaXQgcGF1c2VyLmdldCgpO1xuICAgICAgICB9XG4gICAgICAgIC8vIElmIHRoZSBjYWxsYmFjayBnZXRzIGhlcmUgYW5kIHRoZXJlIGlzIG5vIGB0aGlzYCwgaXQgbWVhbnMgdGhhdCB0aGVcbiAgICAgICAgLy8gZGlyZWN0aXZlIGhhcyBiZWVuIGRpc2Nvbm5lY3RlZCBhbmQgZ2FyYmFnZSBjb2xsZWN0ZWQgYW5kIHdlIGRvbid0XG4gICAgICAgIC8vIG5lZWQgdG8gZG8gYW55dGhpbmcgZWxzZVxuICAgICAgICBjb25zdCBfdGhpcyA9IHdlYWtUaGlzLmRlcmVmKCk7XG4gICAgICAgIGlmIChfdGhpcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY29uc3QgaW5kZXggPSBfdGhpcy5fX3ZhbHVlcy5pbmRleE9mKHZhbHVlKTtcbiAgICAgICAgICAvLyBJZiBzdGF0ZS52YWx1ZXMgZG9lc24ndCBjb250YWluIHRoZSB2YWx1ZSwgd2UndmUgcmUtcmVuZGVyZWQgd2l0aG91dFxuICAgICAgICAgIC8vIHRoZSB2YWx1ZSwgc28gZG9uJ3QgcmVuZGVyIGl0LiBUaGVuLCBvbmx5IHJlbmRlciBpZiB0aGUgdmFsdWUgaXNcbiAgICAgICAgICAvLyBoaWdoZXItcHJpb3JpdHkgdGhhbiB3aGF0J3MgYWxyZWFkeSBiZWVuIHJlbmRlcmVkLlxuICAgICAgICAgIGlmIChpbmRleCA+IC0xICYmIGluZGV4IDwgX3RoaXMuX19sYXN0UmVuZGVyZWRJbmRleCkge1xuICAgICAgICAgICAgX3RoaXMuX19sYXN0UmVuZGVyZWRJbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgX3RoaXMuc2V0VmFsdWUocmVzdWx0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBub0NoYW5nZTtcbiAgfVxuXG4gIG92ZXJyaWRlIGRpc2Nvbm5lY3RlZCgpIHtcbiAgICB0aGlzLl9fd2Vha1RoaXMuZGlzY29ubmVjdCgpO1xuICAgIHRoaXMuX19wYXVzZXIucGF1c2UoKTtcbiAgfVxuXG4gIG92ZXJyaWRlIHJlY29ubmVjdGVkKCkge1xuICAgIHRoaXMuX193ZWFrVGhpcy5yZWNvbm5lY3QodGhpcyk7XG4gICAgdGhpcy5fX3BhdXNlci5yZXN1bWUoKTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbmRlcnMgb25lIG9mIGEgc2VyaWVzIG9mIHZhbHVlcywgaW5jbHVkaW5nIFByb21pc2VzLCB0byBhIFBhcnQuXG4gKlxuICogVmFsdWVzIGFyZSByZW5kZXJlZCBpbiBwcmlvcml0eSBvcmRlciwgd2l0aCB0aGUgZmlyc3QgYXJndW1lbnQgaGF2aW5nIHRoZVxuICogaGlnaGVzdCBwcmlvcml0eSBhbmQgdGhlIGxhc3QgYXJndW1lbnQgaGF2aW5nIHRoZSBsb3dlc3QgcHJpb3JpdHkuIElmIGFcbiAqIHZhbHVlIGlzIGEgUHJvbWlzZSwgbG93LXByaW9yaXR5IHZhbHVlcyB3aWxsIGJlIHJlbmRlcmVkIHVudGlsIGl0IHJlc29sdmVzLlxuICpcbiAqIFRoZSBwcmlvcml0eSBvZiB2YWx1ZXMgY2FuIGJlIHVzZWQgdG8gY3JlYXRlIHBsYWNlaG9sZGVyIGNvbnRlbnQgZm9yIGFzeW5jXG4gKiBkYXRhLiBGb3IgZXhhbXBsZSwgYSBQcm9taXNlIHdpdGggcGVuZGluZyBjb250ZW50IGNhbiBiZSB0aGUgZmlyc3QsXG4gKiBoaWdoZXN0LXByaW9yaXR5LCBhcmd1bWVudCwgYW5kIGEgbm9uX3Byb21pc2UgbG9hZGluZyBpbmRpY2F0b3IgdGVtcGxhdGUgY2FuXG4gKiBiZSB1c2VkIGFzIHRoZSBzZWNvbmQsIGxvd2VyLXByaW9yaXR5LCBhcmd1bWVudC4gVGhlIGxvYWRpbmcgaW5kaWNhdG9yIHdpbGxcbiAqIHJlbmRlciBpbW1lZGlhdGVseSwgYW5kIHRoZSBwcmltYXJ5IGNvbnRlbnQgd2lsbCByZW5kZXIgd2hlbiB0aGUgUHJvbWlzZVxuICogcmVzb2x2ZXMuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogY29uc3QgY29udGVudCA9IGZldGNoKCcuL2NvbnRlbnQudHh0JykudGhlbihyID0+IHIudGV4dCgpKTtcbiAqIGh0bWxgJHt1bnRpbChjb250ZW50LCBodG1sYDxzcGFuPkxvYWRpbmcuLi48L3NwYW4+YCl9YFxuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB1bnRpbCA9IGRpcmVjdGl2ZShVbnRpbERpcmVjdGl2ZSk7XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgdGhlIGNsYXNzIHRoYXQgcG93ZXJzIHRoaXMgZGlyZWN0aXZlLiBOZWNlc3NhcnkgZm9yIG5hbWluZyB0aGVcbiAqIGRpcmVjdGl2ZSdzIHJldHVybiB0eXBlLlxuICovXG4vLyBleHBvcnQgdHlwZSB7VW50aWxEaXJlY3RpdmV9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjEgR29vZ2xlIExMQ1xuICogU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEJTRC0zLUNsYXVzZVxuICovXG5cbi8qKlxuICogV2hlbiBgY29uZGl0aW9uYCBpcyB0cnVlLCByZXR1cm5zIHRoZSByZXN1bHQgb2YgY2FsbGluZyBgdHJ1ZUNhc2UoKWAsIGVsc2VcbiAqIHJldHVybnMgdGhlIHJlc3VsdCBvZiBjYWxsaW5nIGBmYWxzZUNhc2UoKWAgaWYgYGZhbHNlQ2FzZWAgaXMgZGVmaW5lZC5cbiAqXG4gKiBUaGlzIGlzIGEgY29udmVuaWVuY2Ugd3JhcHBlciBhcm91bmQgYSB0ZXJuYXJ5IGV4cHJlc3Npb24gdGhhdCBtYWtlcyBpdCBhXG4gKiBsaXR0bGUgbmljZXIgdG8gd3JpdGUgYW4gaW5saW5lIGNvbmRpdGlvbmFsIHdpdGhvdXQgYW4gZWxzZS5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiByZW5kZXIoKSB7XG4gKiAgIHJldHVybiBodG1sYFxuICogICAgICR7d2hlbih0aGlzLnVzZXIsICgpID0+IGh0bWxgVXNlcjogJHt0aGlzLnVzZXIudXNlcm5hbWV9YCwgKCkgPT4gaHRtbGBTaWduIEluLi4uYCl9XG4gKiAgIGA7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdoZW48VCwgRj4oXG4gIGNvbmRpdGlvbjogdHJ1ZSxcbiAgdHJ1ZUNhc2U6ICgpID0+IFQsXG4gIGZhbHNlQ2FzZT86ICgpID0+IEZcbik6IFQ7XG5leHBvcnQgZnVuY3Rpb24gd2hlbjxULCBGID0gdW5kZWZpbmVkPihcbiAgY29uZGl0aW9uOiBmYWxzZSxcbiAgdHJ1ZUNhc2U6ICgpID0+IFQsXG4gIGZhbHNlQ2FzZT86ICgpID0+IEZcbik6IEY7XG5leHBvcnQgZnVuY3Rpb24gd2hlbjxULCBGID0gdW5kZWZpbmVkPihcbiAgY29uZGl0aW9uOiB1bmtub3duLFxuICB0cnVlQ2FzZTogKCkgPT4gVCxcbiAgZmFsc2VDYXNlPzogKCkgPT4gRlxuKTogVCB8IEY7XG5leHBvcnQgZnVuY3Rpb24gd2hlbihcbiAgY29uZGl0aW9uOiB1bmtub3duLFxuICB0cnVlQ2FzZTogKCkgPT4gdW5rbm93bixcbiAgZmFsc2VDYXNlPzogKCkgPT4gdW5rbm93blxuKTogdW5rbm93biB7XG4gIHJldHVybiBjb25kaXRpb24gPyB0cnVlQ2FzZSgpIDogZmFsc2VDYXNlPy4oKTtcbn1cbiIsImV4cG9ydCB7XG4gICAgVGVtcGxhdGVSZXN1bHQsXG4gICAgSFRNTFRlbXBsYXRlUmVzdWx0LFxuICAgIFNWR1RlbXBsYXRlUmVzdWx0LFxuICAgIFJlbmRlck9wdGlvbnMsXG4gICAgaHRtbCxcbiAgICBzdmcsXG4gICAgcmVuZGVyLFxuICAgIG5vQ2hhbmdlLFxuICAgIG5vdGhpbmcsXG59IGZyb20gJ2xpdC1odG1sJztcblxuaW1wb3J0IHtcbiAgICBfJExILFxuICAgIEF0dHJpYnV0ZVBhcnQsXG4gICAgUHJvcGVydHlQYXJ0LFxuICAgIEJvb2xlYW5BdHRyaWJ1dGVQYXJ0LFxuICAgIEV2ZW50UGFydCxcbiAgICBFbGVtZW50UGFydCxcbn0gZnJvbSAnbGl0LWh0bWwnO1xuZXhwb3J0IGNvbnN0IF/OoyA9IHtcbiAgICBBdHRyaWJ1dGVQYXJ0OiBfJExILl9BdHRyaWJ1dGVQYXJ0IGFzIHVua25vd24gYXMgQXR0cmlidXRlUGFydCxcbiAgICBQcm9wZXJ0eVBhcnQ6IF8kTEguX1Byb3BlcnR5UGFydCBhcyB1bmtub3duIGFzIFByb3BlcnR5UGFydCxcbiAgICBCb29sZWFuQXR0cmlidXRlUGFydDogXyRMSC5fQm9vbGVhbkF0dHJpYnV0ZVBhcnQgYXMgdW5rbm93biBhcyBCb29sZWFuQXR0cmlidXRlUGFydCxcbiAgICBFdmVudFBhcnQ6IF8kTEguX0V2ZW50UGFydCBhcyB1bmtub3duIGFzIEV2ZW50UGFydCxcbiAgICBFbGVtZW50UGFydDogXyRMSC5fRWxlbWVudFBhcnQgYXMgdW5rbm93biBhcyBFbGVtZW50UGFydCxcbn07XG5cbmV4cG9ydCB7XG4gICAgRGlyZWN0aXZlLFxuICAgIERpcmVjdGl2ZVBhcmFtZXRlcnMsXG4gICAgUGFydCxcbiAgICBQYXJ0SW5mbyxcbiAgICBQYXJ0VHlwZSxcbiAgICBkaXJlY3RpdmUsXG59IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZSc7XG5cbmV4cG9ydCB7IEFzeW5jRGlyZWN0aXZlIH0gZnJvbSAnbGl0LWh0bWwvYXN5bmMtZGlyZWN0aXZlJztcbmV4cG9ydCB7IFJlZiwgY3JlYXRlUmVmIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9yZWYnO1xuXG5pbXBvcnQgeyBhc3luY0FwcGVuZCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvYXN5bmMtYXBwZW5kJztcbmltcG9ydCB7IGFzeW5jUmVwbGFjZSB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvYXN5bmMtcmVwbGFjZSc7XG5pbXBvcnQgeyBjYWNoZSB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvY2FjaGUnO1xuaW1wb3J0IHsgY2hvb3NlIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9jaG9vc2UnO1xuaW1wb3J0IHsgY2xhc3NNYXAgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2NsYXNzLW1hcCc7XG5pbXBvcnQgeyBndWFyZCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvZ3VhcmQnO1xuaW1wb3J0IHsgaWZEZWZpbmVkIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9pZi1kZWZpbmVkJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2pvaW4nO1xuaW1wb3J0IHsga2V5ZWQgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2tleWVkJztcbmltcG9ydCB7IGxpdmUgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2xpdmUnO1xuaW1wb3J0IHsgbWFwIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9tYXAnO1xuaW1wb3J0IHsgcmFuZ2UgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3JhbmdlJztcbmltcG9ydCB7IHJlZiB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvcmVmJztcbmltcG9ydCB7IHJlcGVhdCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvcmVwZWF0JztcbmltcG9ydCB7IHN0eWxlTWFwIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9zdHlsZS1tYXAnO1xuaW1wb3J0IHsgdGVtcGxhdGVDb250ZW50IH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy90ZW1wbGF0ZS1jb250ZW50JztcbmltcG9ydCB7IHVuc2FmZUhUTUwgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3Vuc2FmZS1odG1sJztcbmltcG9ydCB7IHVuc2FmZVNWRyB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvdW5zYWZlLXN2Zyc7XG5pbXBvcnQgeyB1bnRpbCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvdW50aWwnO1xuaW1wb3J0IHsgd2hlbiB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvd2hlbic7XG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlXG5kZWNsYXJlIG5hbWVzcGFjZSBkaXJlY3RpdmVzIHtcbiAgICBleHBvcnQgdHlwZSBhc3luY0FwcGVuZCA9IHR5cGVvZiBhc3luY0FwcGVuZDtcbiAgICBleHBvcnQgdHlwZSBhc3luY1JlcGxhY2UgPSB0eXBlb2YgYXN5bmNSZXBsYWNlO1xuICAgIGV4cG9ydCB0eXBlIGNhY2hlID0gdHlwZW9mIGNhY2hlO1xuICAgIGV4cG9ydCB0eXBlIGNob29zZSA9IHR5cGVvZiBjaG9vc2U7XG4gICAgZXhwb3J0IHR5cGUgY2xhc3NNYXAgPSB0eXBlb2YgY2xhc3NNYXA7XG4gICAgZXhwb3J0IHR5cGUgZ3VhcmQgPSB0eXBlb2YgZ3VhcmQ7XG4gICAgZXhwb3J0IHR5cGUgaWZEZWZpbmVkID0gdHlwZW9mIGlmRGVmaW5lZDtcbiAgICBleHBvcnQgdHlwZSBqb2luID0gdHlwZW9mIGpvaW47XG4gICAgZXhwb3J0IHR5cGUga2V5ZWQgPSB0eXBlb2Yga2V5ZWQ7XG4gICAgZXhwb3J0IHR5cGUgbGl2ZSA9IHR5cGVvZiBsaXZlO1xuICAgIGV4cG9ydCB0eXBlIG1hcCA9IHR5cGVvZiBtYXA7XG4gICAgZXhwb3J0IHR5cGUgcmFuZ2UgPSB0eXBlb2YgcmFuZ2U7XG4gICAgZXhwb3J0IHR5cGUgcmVmID0gdHlwZW9mIHJlZjtcbiAgICBleHBvcnQgdHlwZSByZXBlYXQgPSB0eXBlb2YgcmVwZWF0O1xuICAgIGV4cG9ydCB0eXBlIHN0eWxlTWFwID0gdHlwZW9mIHN0eWxlTWFwO1xuICAgIGV4cG9ydCB0eXBlIHRlbXBsYXRlQ29udGVudCA9IHR5cGVvZiB0ZW1wbGF0ZUNvbnRlbnQ7XG4gICAgZXhwb3J0IHR5cGUgdW5zYWZlSFRNTCA9IHR5cGVvZiB1bnNhZmVIVE1MO1xuICAgIGV4cG9ydCB0eXBlIHVuc2FmZVNWRyA9IHR5cGVvZiB1bnNhZmVTVkc7XG4gICAgZXhwb3J0IHR5cGUgdW50aWwgPSB0eXBlb2YgdW50aWw7XG4gICAgZXhwb3J0IHR5cGUgd2hlbiA9IHR5cGVvZiB3aGVuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlRGlyZWN0aXZlcyB7XG4gICAgYXN5bmNBcHBlbmQ6IGRpcmVjdGl2ZXMuYXN5bmNBcHBlbmQ7XG4gICAgYXN5bmNSZXBsYWNlOiBkaXJlY3RpdmVzLmFzeW5jUmVwbGFjZTtcbiAgICBjYWNoZTogZGlyZWN0aXZlcy5jYWNoZTtcbiAgICBjaG9vc2U6IGRpcmVjdGl2ZXMuY2hvb3NlO1xuICAgIGNsYXNzTWFwOiBkaXJlY3RpdmVzLmNsYXNzTWFwO1xuICAgIGd1YXJkOiBkaXJlY3RpdmVzLmd1YXJkO1xuICAgIGlmRGVmaW5lZDogZGlyZWN0aXZlcy5pZkRlZmluZWQ7XG4gICAgam9pbjogZGlyZWN0aXZlcy5qb2luO1xuICAgIGtleWVkOiBkaXJlY3RpdmVzLmtleWVkO1xuICAgIGxpdmU6IGRpcmVjdGl2ZXMubGl2ZTtcbiAgICBtYXA6IGRpcmVjdGl2ZXMubWFwO1xuICAgIHJhbmdlOiBkaXJlY3RpdmVzLnJhbmdlO1xuICAgIHJlZjogZGlyZWN0aXZlcy5yZWY7XG4gICAgcmVwZWF0OiBkaXJlY3RpdmVzLnJlcGVhdDtcbiAgICBzdHlsZU1hcDogZGlyZWN0aXZlcy5zdHlsZU1hcDtcbiAgICB0ZW1wbGF0ZUNvbnRlbnQ6IGRpcmVjdGl2ZXMudGVtcGxhdGVDb250ZW50O1xuICAgIHVuc2FmZUhUTUw6IGRpcmVjdGl2ZXMudW5zYWZlSFRNTDtcbiAgICB1bnNhZmVTVkc6IGRpcmVjdGl2ZXMudW5zYWZlU1ZHO1xuICAgIHVudGlsOiBkaXJlY3RpdmVzLnVudGlsO1xuICAgIHdoZW46IGRpcmVjdGl2ZXMud2hlbjtcbn1cblxuZXhwb3J0IGNvbnN0IGRpcmVjdGl2ZXM6IFRlbXBsYXRlRGlyZWN0aXZlcyA9IHtcbiAgICBhc3luY0FwcGVuZCxcbiAgICBhc3luY1JlcGxhY2UsXG4gICAgY2FjaGUsXG4gICAgY2hvb3NlLFxuICAgIGNsYXNzTWFwLFxuICAgIGd1YXJkLFxuICAgIGlmRGVmaW5lZCxcbiAgICBqb2luLFxuICAgIGtleWVkLFxuICAgIGxpdmUsXG4gICAgbWFwLFxuICAgIHJhbmdlLFxuICAgIHJlZixcbiAgICByZXBlYXQsXG4gICAgc3R5bGVNYXAsXG4gICAgdGVtcGxhdGVDb250ZW50LFxuICAgIHVuc2FmZUhUTUwsXG4gICAgdW5zYWZlU1ZHLFxuICAgIHVudGlsLFxuICAgIHdoZW4sXG59O1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGZyb20gYHN0cmluZ2AgdG8gYFRlbXBsYXRlU3RyaW5nc0FycmF5YC4gPGJyPlxuICogICAgIFRoaXMgbWV0aG9kIGlzIGhlbHBlciBicmlnZGdlIGZvciB0aGUge0BsaW5rIGh0bWx9IG9yIHRoZSB7QGxpbmsgc3ZnfSBhcmUgYWJsZSB0byByZWNlaXZlZCBwbGFpbiBzdHJpbmcuXG4gKiBAamEgYHN0cmluZ2Ag44KSIGBUZW1wbGF0ZVN0cmluZ3NBcnJheWDjgavlpInmj5suIDxicj5cbiAqICAgICB7QGxpbmsgaHRtbH0g44KEIHtAbGluayBzdmd9IOOBjOaWh+Wtl+WIl+OCkuWPl+OBkeS7mOOBkeOCi+OBn+OCgeOBruODluODquODg+OCuOODoeOCveODg+ODiVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgdG9UZW1wbGF0ZVN0cmluZ3NBcnJheSBhcyBicmlkZ2UgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIGNvbnN0IHJhdyA9ICc8cD5IZWxsbyBSYXcgU3RyaW5nPC9wPic7XG4gKiByZW5kZXIoaHRtbChicmlkZ2UocmF3KSksIGRvY3VtZW50LmJvZHkpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBwbGFpbiBzdHJpbmcgLyBzdHJpbmcgYXJyYXkuIGV4KSB7QGxpbmsgSlNUfSByZXR1cm5lZCB2YWx1ZS5cbiAqICAtIGBqYWAg44OX44Os44O844Oz5paH5a2X5YiXIC8g5paH5a2X5YiX6YWN5YiXLiBleCkge0BsaW5rIEpTVH0g44Gu5oi744KK5YCk44Gq44Gp44KS5oOz5a6aXG4gKi9cbmV4cG9ydCBjb25zdCB0b1RlbXBsYXRlU3RyaW5nc0FycmF5ID0gKHNyYzogc3RyaW5nIHwgc3RyaW5nW10gfCBUZW1wbGF0ZVN0cmluZ3NBcnJheSk6IFRlbXBsYXRlU3RyaW5nc0FycmF5ID0+IHtcbiAgICBjb25zdCBzdHJpbmdzID0gQXJyYXkuaXNBcnJheShzcmMpID8gc3JjIDogW3NyY107XG4gICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc3RyaW5ncywgJ3JhdycpKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzdHJpbmdzLCAncmF3JywgeyB2YWx1ZTogc3RyaW5ncyB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHN0cmluZ3MgYXMgdW5rbm93biBhcyBUZW1wbGF0ZVN0cmluZ3NBcnJheTtcbn07XG4iXSwibmFtZXMiOlsid3JhcCIsImNyZWF0ZU1hcmtlciIsImlzUHJpbWl0aXZlIiwiSFRNTF9SRVNVTFQiLCJTVkdfUkVTVUxUIiwiQ2hpbGRQYXJ0Il0sIm1hcHBpbmdzIjoiOzs7OztBQUFBOzs7O0FBSUc7O0FBU0g7QUFDQSxNQUFNLE1BQU0sR0FBNEIsTUFBTSxDQUFDO0FBNE4vQyxNQUFNQSxNQUFJLEdBS0osQ0FBQyxJQUFVLEtBQUssSUFBSSxDQUFDO0FBRTNCLE1BQU0sWUFBWSxHQUFJLE1BQXFDLENBQUMsWUFB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Q1IsZUFBZTtJQUNmLFVBQVU7SUFDVixTQUFTO0lBQ1QsS0FBSztJQUNMLElBQUk7RUFDTjtBQUVGOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQkc7QUFDVSxNQUFBLHNCQUFzQixHQUFHLENBQUMsR0FBNkMsS0FBMEI7QUFDMUcsSUFBQSxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2pELElBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUU7QUFDdkQsUUFBQSxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztBQUM3RCxLQUFBO0FBQ0QsSUFBQSxPQUFPLE9BQTBDLENBQUM7QUFDdEQ7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzAsMSwyLDMsNCw1LDYsNyw4LDksMTAsMTEsMTIsMTMsMTQsMTUsMTYsMTcsMTgsMTksMjAsMjEsMjIsMjMsMjRdLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlLyJ9