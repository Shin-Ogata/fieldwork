/*!
 * @cdp/extension-template 0.9.0
 *   extension for template engine
 */

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const directives = new WeakMap();
/**
 * Brands a function as a directive factory function so that lit-html will call
 * the function during template rendering, rather than passing as a value.
 *
 * A _directive_ is a function that takes a Part as an argument. It has the
 * signature: `(part: Part) => void`.
 *
 * A directive _factory_ is a function that takes arguments for data and
 * configuration and returns a directive. Users of directive usually refer to
 * the directive factory as the directive. For example, "The repeat directive".
 *
 * Usually a template author will invoke a directive factory in their template
 * with relevant arguments, which will then return a directive function.
 *
 * Here's an example of using the `repeat()` directive factory that takes an
 * array and a function to render an item:
 *
 * ```js
 * html`<ul><${repeat(items, (item) => html`<li>${item}</li>`)}</ul>`
 * ```
 *
 * When `repeat` is invoked, it returns a directive function that closes over
 * `items` and the template function. When the outer template is rendered, the
 * return directive function is called with the Part for the expression.
 * `repeat` then performs it's custom logic to render multiple items.
 *
 * @param f The directive factory function. Must be a function that returns a
 * function of the signature `(part: Part) => void`. The returned function will
 * be called with the part object.
 *
 * @example
 *
 * import {directive, html} from 'lit-html';
 *
 * const immutable = directive((v) => (part) => {
 *   if (part.value !== v) {
 *     part.setValue(v)
 *   }
 * });
 */
const directive = (f) => ((...args) => {
    const d = f(...args);
    directives.set(d, true);
    return d;
});
const isDirective = (o) => {
    return typeof o === 'function' && directives.has(o);
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * True if the custom elements polyfill is in use.
 */
const isCEPolyfill = typeof window !== 'undefined' &&
    window.customElements != null &&
    window.customElements.polyfillWrapFlushCallback !==
        undefined;
/**
 * Reparents nodes, starting from `start` (inclusive) to `end` (exclusive),
 * into another container (could be the same container), before `before`. If
 * `before` is null, it appends the nodes to the container.
 */
const reparentNodes = (container, start, end = null, before = null) => {
    while (start !== end) {
        const n = start.nextSibling;
        container.insertBefore(start, before);
        start = n;
    }
};
/**
 * Removes nodes, starting from `start` (inclusive) to `end` (exclusive), from
 * `container`.
 */
const removeNodes = (container, start, end = null) => {
    while (start !== end) {
        const n = start.nextSibling;
        container.removeChild(start);
        start = n;
    }
};

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * A sentinel value that signals that a value was handled by a directive and
 * should not be written to the DOM.
 */
const noChange = {};
/**
 * A sentinel value that signals a NodePart to fully clear its content.
 */
const nothing = {};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * An expression marker with embedded unique key to avoid collision with
 * possible text in templates.
 */
const marker = `{{lit-${String(Math.random()).slice(2)}}}`;
/**
 * An expression marker used text-positions, multi-binding attributes, and
 * attributes with markup-like text values.
 */
const nodeMarker = `<!--${marker}-->`;
const markerRegex = new RegExp(`${marker}|${nodeMarker}`);
/**
 * Suffix appended to all bound attribute names.
 */
const boundAttributeSuffix = '$lit$';
/**
 * An updatable Template that tracks the location of dynamic parts.
 */
class Template {
    constructor(result, element) {
        this.parts = [];
        this.element = element;
        const nodesToRemove = [];
        const stack = [];
        // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be null
        const walker = document.createTreeWalker(element.content, 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */, null, false);
        // Keeps track of the last index associated with a part. We try to delete
        // unnecessary nodes, but we never want to associate two different parts
        // to the same index. They must have a constant node between.
        let lastPartIndex = 0;
        let index = -1;
        let partIndex = 0;
        const { strings, values: { length } } = result;
        while (partIndex < length) {
            const node = walker.nextNode();
            if (node === null) {
                // We've exhausted the content inside a nested template element.
                // Because we still have parts (the outer for-loop), we know:
                // - There is a template in the stack
                // - The walker will find a nextNode outside the template
                walker.currentNode = stack.pop();
                continue;
            }
            index++;
            if (node.nodeType === 1 /* Node.ELEMENT_NODE */) {
                if (node.hasAttributes()) {
                    const attributes = node.attributes;
                    const { length } = attributes;
                    // Per
                    // https://developer.mozilla.org/en-US/docs/Web/API/NamedNodeMap,
                    // attributes are not guaranteed to be returned in document order.
                    // In particular, Edge/IE can return them out of order, so we cannot
                    // assume a correspondence between part index and attribute index.
                    let count = 0;
                    for (let i = 0; i < length; i++) {
                        if (endsWith(attributes[i].name, boundAttributeSuffix)) {
                            count++;
                        }
                    }
                    while (count-- > 0) {
                        // Get the template literal section leading up to the first
                        // expression in this attribute
                        const stringForPart = strings[partIndex];
                        // Find the attribute name
                        const name = lastAttributeNameRegex.exec(stringForPart)[2];
                        // Find the corresponding attribute
                        // All bound attributes have had a suffix added in
                        // TemplateResult#getHTML to opt out of special attribute
                        // handling. To look up the attribute value we also need to add
                        // the suffix.
                        const attributeLookupName = name.toLowerCase() + boundAttributeSuffix;
                        const attributeValue = node.getAttribute(attributeLookupName);
                        node.removeAttribute(attributeLookupName);
                        const statics = attributeValue.split(markerRegex);
                        this.parts.push({ type: 'attribute', index, name, strings: statics });
                        partIndex += statics.length - 1;
                    }
                }
                if (node.tagName === 'TEMPLATE') {
                    stack.push(node);
                    walker.currentNode = node.content;
                }
            }
            else if (node.nodeType === 3 /* Node.TEXT_NODE */) {
                const data = node.data;
                if (data.indexOf(marker) >= 0) {
                    const parent = node.parentNode;
                    const strings = data.split(markerRegex);
                    const lastIndex = strings.length - 1;
                    // Generate a new text node for each literal section
                    // These nodes are also used as the markers for node parts
                    for (let i = 0; i < lastIndex; i++) {
                        let insert;
                        let s = strings[i];
                        if (s === '') {
                            insert = createMarker();
                        }
                        else {
                            const match = lastAttributeNameRegex.exec(s);
                            if (match !== null && endsWith(match[2], boundAttributeSuffix)) {
                                s = s.slice(0, match.index) + match[1] +
                                    match[2].slice(0, -boundAttributeSuffix.length) + match[3];
                            }
                            insert = document.createTextNode(s);
                        }
                        parent.insertBefore(insert, node);
                        this.parts.push({ type: 'node', index: ++index });
                    }
                    // If there's no text, we must insert a comment to mark our place.
                    // Else, we can trust it will stick around after cloning.
                    if (strings[lastIndex] === '') {
                        parent.insertBefore(createMarker(), node);
                        nodesToRemove.push(node);
                    }
                    else {
                        node.data = strings[lastIndex];
                    }
                    // We have a part for each match found
                    partIndex += lastIndex;
                }
            }
            else if (node.nodeType === 8 /* Node.COMMENT_NODE */) {
                if (node.data === marker) {
                    const parent = node.parentNode;
                    // Add a new marker node to be the startNode of the Part if any of
                    // the following are true:
                    //  * We don't have a previousSibling
                    //  * The previousSibling is already the start of a previous part
                    if (node.previousSibling === null || index === lastPartIndex) {
                        index++;
                        parent.insertBefore(createMarker(), node);
                    }
                    lastPartIndex = index;
                    this.parts.push({ type: 'node', index });
                    // If we don't have a nextSibling, keep this node so we have an end.
                    // Else, we can remove it to save future costs.
                    if (node.nextSibling === null) {
                        node.data = '';
                    }
                    else {
                        nodesToRemove.push(node);
                        index--;
                    }
                    partIndex++;
                }
                else {
                    let i = -1;
                    while ((i = node.data.indexOf(marker, i + 1)) !== -1) {
                        // Comment node has a binding marker inside, make an inactive part
                        // The binding won't work, but subsequent bindings will
                        // TODO (justinfagnani): consider whether it's even worth it to
                        // make bindings in comments work
                        this.parts.push({ type: 'node', index: -1 });
                        partIndex++;
                    }
                }
            }
        }
        // Remove text binding nodes after the walk to not disturb the TreeWalker
        for (const n of nodesToRemove) {
            n.parentNode.removeChild(n);
        }
    }
}
const endsWith = (str, suffix) => {
    const index = str.length - suffix.length;
    return index >= 0 && str.slice(index) === suffix;
};
const isTemplatePartActive = (part) => part.index !== -1;
// Allows `document.createComment('')` to be renamed for a
// small manual size-savings.
const createMarker = () => document.createComment('');
/**
 * This regex extracts the attribute name preceding an attribute-position
 * expression. It does this by matching the syntax allowed for attributes
 * against the string literal directly preceding the expression, assuming that
 * the expression is in an attribute-value position.
 *
 * See attributes in the HTML spec:
 * https://www.w3.org/TR/html5/syntax.html#elements-attributes
 *
 * " \x09\x0a\x0c\x0d" are HTML space characters:
 * https://www.w3.org/TR/html5/infrastructure.html#space-characters
 *
 * "\0-\x1F\x7F-\x9F" are Unicode control characters, which includes every
 * space character except " ".
 *
 * So an attribute is:
 *  * The name: any character except a control character, space character, ('),
 *    ("), ">", "=", or "/"
 *  * Followed by zero or more space characters
 *  * Followed by "="
 *  * Followed by zero or more space characters
 *  * Followed by:
 *    * Any character except space, ('), ("), "<", ">", "=", (`), or
 *    * (") then any non-("), or
 *    * (') then any non-(')
 */
const lastAttributeNameRegex = 
// eslint-disable-next-line no-control-regex
/([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F "'>=/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * An instance of a `Template` that can be attached to the DOM and updated
 * with new values.
 */
class TemplateInstance {
    constructor(template, processor, options) {
        this.__parts = [];
        this.template = template;
        this.processor = processor;
        this.options = options;
    }
    update(values) {
        let i = 0;
        for (const part of this.__parts) {
            if (part !== undefined) {
                part.setValue(values[i]);
            }
            i++;
        }
        for (const part of this.__parts) {
            if (part !== undefined) {
                part.commit();
            }
        }
    }
    _clone() {
        // There are a number of steps in the lifecycle of a template instance's
        // DOM fragment:
        //  1. Clone - create the instance fragment
        //  2. Adopt - adopt into the main document
        //  3. Process - find part markers and create parts
        //  4. Upgrade - upgrade custom elements
        //  5. Update - set node, attribute, property, etc., values
        //  6. Connect - connect to the document. Optional and outside of this
        //     method.
        //
        // We have a few constraints on the ordering of these steps:
        //  * We need to upgrade before updating, so that property values will pass
        //    through any property setters.
        //  * We would like to process before upgrading so that we're sure that the
        //    cloned fragment is inert and not disturbed by self-modifying DOM.
        //  * We want custom elements to upgrade even in disconnected fragments.
        //
        // Given these constraints, with full custom elements support we would
        // prefer the order: Clone, Process, Adopt, Upgrade, Update, Connect
        //
        // But Safari does not implement CustomElementRegistry#upgrade, so we
        // can not implement that order and still have upgrade-before-update and
        // upgrade disconnected fragments. So we instead sacrifice the
        // process-before-upgrade constraint, since in Custom Elements v1 elements
        // must not modify their light DOM in the constructor. We still have issues
        // when co-existing with CEv0 elements like Polymer 1, and with polyfills
        // that don't strictly adhere to the no-modification rule because shadow
        // DOM, which may be created in the constructor, is emulated by being placed
        // in the light DOM.
        //
        // The resulting order is on native is: Clone, Adopt, Upgrade, Process,
        // Update, Connect. document.importNode() performs Clone, Adopt, and Upgrade
        // in one step.
        //
        // The Custom Elements v1 polyfill supports upgrade(), so the order when
        // polyfilled is the more ideal: Clone, Process, Adopt, Upgrade, Update,
        // Connect.
        const fragment = isCEPolyfill ?
            this.template.element.content.cloneNode(true) :
            document.importNode(this.template.element.content, true);
        const stack = [];
        const parts = this.template.parts;
        // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be null
        const walker = document.createTreeWalker(fragment, 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */, null, false);
        let partIndex = 0;
        let nodeIndex = 0;
        let part;
        let node = walker.nextNode();
        // Loop through all the nodes and parts of a template
        while (partIndex < parts.length) {
            part = parts[partIndex];
            if (!isTemplatePartActive(part)) {
                this.__parts.push(undefined);
                partIndex++;
                continue;
            }
            // Progress the tree walker until we find our next part's node.
            // Note that multiple parts may share the same node (attribute parts
            // on a single element), so this loop may not run at all.
            while (nodeIndex < part.index) {
                nodeIndex++;
                if (node.nodeName === 'TEMPLATE') {
                    stack.push(node);
                    walker.currentNode = node.content;
                }
                if ((node = walker.nextNode()) === null) {
                    // We've exhausted the content inside a nested template element.
                    // Because we still have parts (the outer for-loop), we know:
                    // - There is a template in the stack
                    // - The walker will find a nextNode outside the template
                    walker.currentNode = stack.pop();
                    node = walker.nextNode();
                }
            }
            // We've arrived at our part's node.
            if (part.type === 'node') {
                const part = this.processor.handleTextExpression(this.options);
                part.insertAfterNode(node.previousSibling);
                this.__parts.push(part);
            }
            else {
                this.__parts.push(...this.processor.handleAttributeExpressions(node, part.name, part.strings, this.options));
            }
            partIndex++;
        }
        if (isCEPolyfill) {
            document.adoptNode(fragment);
            customElements.upgrade(fragment);
        }
        return fragment;
    }
}

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const commentMarker = ` ${marker} `;
/**
 * The return type of `html`, which holds a Template and the values from
 * interpolated expressions.
 */
class TemplateResult {
    constructor(strings, values, type, processor) {
        this.strings = strings;
        this.values = values;
        this.type = type;
        this.processor = processor;
    }
    /**
     * Returns a string of HTML used to create a `<template>` element.
     */
    getHTML() {
        const l = this.strings.length - 1;
        let html = '';
        let isCommentBinding = false;
        for (let i = 0; i < l; i++) {
            const s = this.strings[i];
            // For each binding we want to determine the kind of marker to insert
            // into the template source before it's parsed by the browser's HTML
            // parser. The marker type is based on whether the expression is in an
            // attribute, text, or comment position.
            //   * For node-position bindings we insert a comment with the marker
            //     sentinel as its text content, like <!--{{lit-guid}}-->.
            //   * For attribute bindings we insert just the marker sentinel for the
            //     first binding, so that we support unquoted attribute bindings.
            //     Subsequent bindings can use a comment marker because multi-binding
            //     attributes must be quoted.
            //   * For comment bindings we insert just the marker sentinel so we don't
            //     close the comment.
            //
            // The following code scans the template source, but is *not* an HTML
            // parser. We don't need to track the tree structure of the HTML, only
            // whether a binding is inside a comment, and if not, if it appears to be
            // the first binding in an attribute.
            const commentOpen = s.lastIndexOf('<!--');
            // We're in comment position if we have a comment open with no following
            // comment close. Because <-- can appear in an attribute value there can
            // be false positives.
            isCommentBinding = (commentOpen > -1 || isCommentBinding) &&
                s.indexOf('-->', commentOpen + 1) === -1;
            // Check to see if we have an attribute-like sequence preceding the
            // expression. This can match "name=value" like structures in text,
            // comments, and attribute values, so there can be false-positives.
            const attributeMatch = lastAttributeNameRegex.exec(s);
            if (attributeMatch === null) {
                // We're only in this branch if we don't have a attribute-like
                // preceding sequence. For comments, this guards against unusual
                // attribute values like <div foo="<!--${'bar'}">. Cases like
                // <!-- foo=${'bar'}--> are handled correctly in the attribute branch
                // below.
                html += s + (isCommentBinding ? commentMarker : nodeMarker);
            }
            else {
                // For attributes we use just a marker sentinel, and also append a
                // $lit$ suffix to the name to opt-out of attribute-specific parsing
                // that IE and Edge do for style and certain SVG attributes.
                html += s.substr(0, attributeMatch.index) + attributeMatch[1] +
                    attributeMatch[2] + boundAttributeSuffix + attributeMatch[3] +
                    marker;
            }
        }
        html += this.strings[l];
        return html;
    }
    getTemplateElement() {
        const template = document.createElement('template');
        template.innerHTML = this.getHTML();
        return template;
    }
}
/**
 * A TemplateResult for SVG fragments.
 *
 * This class wraps HTML in an `<svg>` tag in order to parse its contents in the
 * SVG namespace, then modifies the template to remove the `<svg>` tag so that
 * clones only container the original fragment.
 */
class SVGTemplateResult extends TemplateResult {
    getHTML() {
        return `<svg>${super.getHTML()}</svg>`;
    }
    getTemplateElement() {
        const template = super.getTemplateElement();
        const content = template.content;
        const svgElement = content.firstChild;
        content.removeChild(svgElement);
        reparentNodes(content, svgElement.firstChild);
        return template;
    }
}

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const isPrimitive = (value) => {
    return (value === null ||
        !(typeof value === 'object' || typeof value === 'function'));
};
const isIterable = (value) => {
    return Array.isArray(value) ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        !!(value && value[Symbol.iterator]);
};
/**
 * Writes attribute values to the DOM for a group of AttributeParts bound to a
 * single attribute. The value is only set once even if there are multiple parts
 * for an attribute.
 */
class AttributeCommitter {
    constructor(element, name, strings) {
        this.dirty = true;
        this.element = element;
        this.name = name;
        this.strings = strings;
        this.parts = [];
        for (let i = 0; i < strings.length - 1; i++) {
            this.parts[i] = this._createPart();
        }
    }
    /**
     * Creates a single part. Override this to create a differnt type of part.
     */
    _createPart() {
        return new AttributePart(this);
    }
    _getValue() {
        const strings = this.strings;
        const l = strings.length - 1;
        let text = '';
        for (let i = 0; i < l; i++) {
            text += strings[i];
            const part = this.parts[i];
            if (part !== undefined) {
                const v = part.value;
                if (isPrimitive(v) || !isIterable(v)) {
                    text += typeof v === 'string' ? v : String(v);
                }
                else {
                    for (const t of v) {
                        text += typeof t === 'string' ? t : String(t);
                    }
                }
            }
        }
        text += strings[l];
        return text;
    }
    commit() {
        if (this.dirty) {
            this.dirty = false;
            this.element.setAttribute(this.name, this._getValue());
        }
    }
}
/**
 * A Part that controls all or part of an attribute value.
 */
class AttributePart {
    constructor(committer) {
        this.value = undefined;
        this.committer = committer;
    }
    setValue(value) {
        if (value !== noChange && (!isPrimitive(value) || value !== this.value)) {
            this.value = value;
            // If the value is a not a directive, dirty the committer so that it'll
            // call setAttribute. If the value is a directive, it'll dirty the
            // committer if it calls setValue().
            if (!isDirective(value)) {
                this.committer.dirty = true;
            }
        }
    }
    commit() {
        while (isDirective(this.value)) {
            const directive = this.value;
            this.value = noChange;
            directive(this);
        }
        if (this.value === noChange) {
            return;
        }
        this.committer.commit();
    }
}
/**
 * A Part that controls a location within a Node tree. Like a Range, NodePart
 * has start and end locations and can set and update the Nodes between those
 * locations.
 *
 * NodeParts support several value types: primitives, Nodes, TemplateResults,
 * as well as arrays and iterables of those types.
 */
class NodePart {
    constructor(options) {
        this.value = undefined;
        this.__pendingValue = undefined;
        this.options = options;
    }
    /**
     * Appends this part into a container.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    appendInto(container) {
        this.startNode = container.appendChild(createMarker());
        this.endNode = container.appendChild(createMarker());
    }
    /**
     * Inserts this part after the `ref` node (between `ref` and `ref`'s next
     * sibling). Both `ref` and its next sibling must be static, unchanging nodes
     * such as those that appear in a literal section of a template.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    insertAfterNode(ref) {
        this.startNode = ref;
        this.endNode = ref.nextSibling;
    }
    /**
     * Appends this part into a parent part.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    appendIntoPart(part) {
        part.__insert(this.startNode = createMarker());
        part.__insert(this.endNode = createMarker());
    }
    /**
     * Inserts this part after the `ref` part.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    insertAfterPart(ref) {
        ref.__insert(this.startNode = createMarker());
        this.endNode = ref.endNode;
        ref.endNode = this.startNode;
    }
    setValue(value) {
        this.__pendingValue = value;
    }
    commit() {
        if (this.startNode.parentNode === null) {
            return;
        }
        while (isDirective(this.__pendingValue)) {
            const directive = this.__pendingValue;
            this.__pendingValue = noChange;
            directive(this);
        }
        const value = this.__pendingValue;
        if (value === noChange) {
            return;
        }
        if (isPrimitive(value)) {
            if (value !== this.value) {
                this.__commitText(value);
            }
        }
        else if (value instanceof TemplateResult) {
            this.__commitTemplateResult(value);
        }
        else if (value instanceof Node) {
            this.__commitNode(value);
        }
        else if (isIterable(value)) {
            this.__commitIterable(value);
        }
        else if (value === nothing) {
            this.value = nothing;
            this.clear();
        }
        else {
            // Fallback, will render the string representation
            this.__commitText(value);
        }
    }
    __insert(node) {
        this.endNode.parentNode.insertBefore(node, this.endNode);
    }
    __commitNode(value) {
        if (this.value === value) {
            return;
        }
        this.clear();
        this.__insert(value);
        this.value = value;
    }
    __commitText(value) {
        const node = this.startNode.nextSibling;
        value = value == null ? '' : value;
        // If `value` isn't already a string, we explicitly convert it here in case
        // it can't be implicitly converted - i.e. it's a symbol.
        const valueAsString = typeof value === 'string' ? value : String(value);
        if (node === this.endNode.previousSibling &&
            node.nodeType === 3 /* Node.TEXT_NODE */) {
            // If we only have a single text node between the markers, we can just
            // set its value, rather than replacing it.
            // TODO(justinfagnani): Can we just check if this.value is primitive?
            node.data = valueAsString;
        }
        else {
            this.__commitNode(document.createTextNode(valueAsString));
        }
        this.value = value;
    }
    __commitTemplateResult(value) {
        const template = this.options.templateFactory(value);
        if (this.value instanceof TemplateInstance &&
            this.value.template === template) {
            this.value.update(value.values);
        }
        else {
            // Make sure we propagate the template processor from the TemplateResult
            // so that we use its syntax extension, etc. The template factory comes
            // from the render function options so that it can control template
            // caching and preprocessing.
            const instance = new TemplateInstance(template, value.processor, this.options);
            const fragment = instance._clone();
            instance.update(value.values);
            this.__commitNode(fragment);
            this.value = instance;
        }
    }
    __commitIterable(value) {
        // For an Iterable, we create a new InstancePart per item, then set its
        // value to the item. This is a little bit of overhead for every item in
        // an Iterable, but it lets us recurse easily and efficiently update Arrays
        // of TemplateResults that will be commonly returned from expressions like:
        // array.map((i) => html`${i}`), by reusing existing TemplateInstances.
        // If _value is an array, then the previous render was of an
        // iterable and _value will contain the NodeParts from the previous
        // render. If _value is not an array, clear this part and make a new
        // array for NodeParts.
        if (!Array.isArray(this.value)) {
            this.value = [];
            this.clear();
        }
        // Lets us keep track of how many items we stamped so we can clear leftover
        // items from a previous render
        const itemParts = this.value;
        let partIndex = 0;
        let itemPart;
        for (const item of value) {
            // Try to reuse an existing part
            itemPart = itemParts[partIndex];
            // If no existing part, create a new one
            if (itemPart === undefined) {
                itemPart = new NodePart(this.options);
                itemParts.push(itemPart);
                if (partIndex === 0) {
                    itemPart.appendIntoPart(this);
                }
                else {
                    itemPart.insertAfterPart(itemParts[partIndex - 1]);
                }
            }
            itemPart.setValue(item);
            itemPart.commit();
            partIndex++;
        }
        if (partIndex < itemParts.length) {
            // Truncate the parts array so _value reflects the current state
            itemParts.length = partIndex;
            this.clear(itemPart && itemPart.endNode);
        }
    }
    clear(startNode = this.startNode) {
        removeNodes(this.startNode.parentNode, startNode.nextSibling, this.endNode);
    }
}
/**
 * Implements a boolean attribute, roughly as defined in the HTML
 * specification.
 *
 * If the value is truthy, then the attribute is present with a value of
 * ''. If the value is falsey, the attribute is removed.
 */
class BooleanAttributePart {
    constructor(element, name, strings) {
        this.value = undefined;
        this.__pendingValue = undefined;
        if (strings.length !== 2 || strings[0] !== '' || strings[1] !== '') {
            throw new Error('Boolean attributes can only contain a single expression');
        }
        this.element = element;
        this.name = name;
        this.strings = strings;
    }
    setValue(value) {
        this.__pendingValue = value;
    }
    commit() {
        while (isDirective(this.__pendingValue)) {
            const directive = this.__pendingValue;
            this.__pendingValue = noChange;
            directive(this);
        }
        if (this.__pendingValue === noChange) {
            return;
        }
        const value = !!this.__pendingValue;
        if (this.value !== value) {
            if (value) {
                this.element.setAttribute(this.name, '');
            }
            else {
                this.element.removeAttribute(this.name);
            }
            this.value = value;
        }
        this.__pendingValue = noChange;
    }
}
/**
 * Sets attribute values for PropertyParts, so that the value is only set once
 * even if there are multiple parts for a property.
 *
 * If an expression controls the whole property value, then the value is simply
 * assigned to the property under control. If there are string literals or
 * multiple expressions, then the strings are expressions are interpolated into
 * a string first.
 */
class PropertyCommitter extends AttributeCommitter {
    constructor(element, name, strings) {
        super(element, name, strings);
        this.single =
            (strings.length === 2 && strings[0] === '' && strings[1] === '');
    }
    _createPart() {
        return new PropertyPart(this);
    }
    _getValue() {
        if (this.single) {
            return this.parts[0].value;
        }
        return super._getValue();
    }
    commit() {
        if (this.dirty) {
            this.dirty = false;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.element[this.name] = this._getValue();
        }
    }
}
class PropertyPart extends AttributePart {
}
// Detect event listener options support. If the `capture` property is read
// from the options object, then options are supported. If not, then the third
// argument to add/removeEventListener is interpreted as the boolean capture
// value so we should only pass the `capture` property.
let eventOptionsSupported = false;
// Wrap into an IIFE because MS Edge <= v41 does not support having try/catch
// blocks right into the body of a module
(() => {
    try {
        const options = {
            get capture() {
                eventOptionsSupported = true;
                return false;
            }
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.addEventListener('test', options, options);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.removeEventListener('test', options, options);
    }
    catch (_e) {
        // event options not supported
    }
})();
class EventPart {
    constructor(element, eventName, eventContext) {
        this.value = undefined;
        this.__pendingValue = undefined;
        this.element = element;
        this.eventName = eventName;
        this.eventContext = eventContext;
        this.__boundHandleEvent = (e) => this.handleEvent(e);
    }
    setValue(value) {
        this.__pendingValue = value;
    }
    commit() {
        while (isDirective(this.__pendingValue)) {
            const directive = this.__pendingValue;
            this.__pendingValue = noChange;
            directive(this);
        }
        if (this.__pendingValue === noChange) {
            return;
        }
        const newListener = this.__pendingValue;
        const oldListener = this.value;
        const shouldRemoveListener = newListener == null ||
            oldListener != null &&
                (newListener.capture !== oldListener.capture ||
                    newListener.once !== oldListener.once ||
                    newListener.passive !== oldListener.passive);
        const shouldAddListener = newListener != null && (oldListener == null || shouldRemoveListener);
        if (shouldRemoveListener) {
            this.element.removeEventListener(this.eventName, this.__boundHandleEvent, this.__options);
        }
        if (shouldAddListener) {
            this.__options = getOptions(newListener);
            this.element.addEventListener(this.eventName, this.__boundHandleEvent, this.__options);
        }
        this.value = newListener;
        this.__pendingValue = noChange;
    }
    handleEvent(event) {
        if (typeof this.value === 'function') {
            this.value.call(this.eventContext || this.element, event);
        }
        else {
            this.value.handleEvent(event);
        }
    }
}
// We copy options because of the inconsistent behavior of browsers when reading
// the third argument of add/removeEventListener. IE11 doesn't support options
// at all. Chrome 41 only reads `capture` if the argument is an object.
const getOptions = (o) => o &&
    (eventOptionsSupported ?
        { capture: o.capture, passive: o.passive, once: o.once } :
        o.capture);

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * Creates Parts when a template is instantiated.
 */
class DefaultTemplateProcessor {
    /**
     * Create parts for an attribute-position binding, given the event, attribute
     * name, and string literals.
     *
     * @param element The element containing the binding
     * @param name  The attribute name
     * @param strings The string literals. There are always at least two strings,
     *   event for fully-controlled bindings with a single expression.
     */
    handleAttributeExpressions(element, name, strings, options) {
        const prefix = name[0];
        if (prefix === '.') {
            const committer = new PropertyCommitter(element, name.slice(1), strings);
            return committer.parts;
        }
        if (prefix === '@') {
            return [new EventPart(element, name.slice(1), options.eventContext)];
        }
        if (prefix === '?') {
            return [new BooleanAttributePart(element, name.slice(1), strings)];
        }
        const committer = new AttributeCommitter(element, name, strings);
        return committer.parts;
    }
    /**
     * Create parts for a text-position binding.
     * @param templateFactory
     */
    handleTextExpression(options) {
        return new NodePart(options);
    }
}
const defaultTemplateProcessor = new DefaultTemplateProcessor();

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * The default TemplateFactory which caches Templates keyed on
 * result.type and result.strings.
 */
function templateFactory(result) {
    let templateCache = templateCaches.get(result.type);
    if (templateCache === undefined) {
        templateCache = {
            stringsArray: new WeakMap(),
            keyString: new Map()
        };
        templateCaches.set(result.type, templateCache);
    }
    let template = templateCache.stringsArray.get(result.strings);
    if (template !== undefined) {
        return template;
    }
    // If the TemplateStringsArray is new, generate a key from the strings
    // This key is shared between all templates with identical content
    const key = result.strings.join(marker);
    // Check if we already have a Template for this key
    template = templateCache.keyString.get(key);
    if (template === undefined) {
        // If we have not seen this key before, create a new Template
        template = new Template(result, result.getTemplateElement());
        // Cache the Template for this key
        templateCache.keyString.set(key, template);
    }
    // Cache all future queries for this TemplateStringsArray
    templateCache.stringsArray.set(result.strings, template);
    return template;
}
const templateCaches = new Map();

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const parts = new WeakMap();
/**
 * Renders a template result or other value to a container.
 *
 * To update a container with new values, reevaluate the template literal and
 * call `render` with the new result.
 *
 * @param result Any value renderable by NodePart - typically a TemplateResult
 *     created by evaluating a template tag like `html` or `svg`.
 * @param container A DOM parent to render to. The entire contents are either
 *     replaced, or efficiently updated if the same result type was previous
 *     rendered there.
 * @param options RenderOptions for the entire render tree rendered to this
 *     container. Render options must *not* change between renders to the same
 *     container, as those changes will not effect previously rendered DOM.
 */
const render = (result, container, options) => {
    let part = parts.get(container);
    if (part === undefined) {
        removeNodes(container, container.firstChild);
        parts.set(container, part = new NodePart(Object.assign({ templateFactory }, options)));
        part.appendInto(container);
    }
    part.setValue(result);
    part.commit();
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// IMPORTANT: do not change the property name or the assignment expression.
// This line will be used in regexes to search for lit-html usage.
// TODO(justinfagnani): inject version number at build time
if (typeof window !== 'undefined') {
    (window['litHtmlVersions'] || (window['litHtmlVersions'] = [])).push('1.2.0');
}
/**
 * Interprets a template literal as an HTML template that can efficiently
 * render to and update a container.
 */
const html = (strings, ...values) => new TemplateResult(strings, values, 'html', defaultTemplateProcessor);
/**
 * Interprets a template literal as an SVG template that can efficiently
 * render to and update a container.
 */
const svg = (strings, ...values) => new SVGTemplateResult(strings, values, 'svg', defaultTemplateProcessor);

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
var __asyncValues = (undefined && undefined.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
/**
 * A directive that renders the items of an async iterable[1], appending new
 * values after previous values, similar to the built-in support for iterables.
 *
 * Async iterables are objects with a [Symbol.asyncIterator] method, which
 * returns an iterator who's `next()` method returns a Promise. When a new
 * value is available, the Promise resolves and the value is appended to the
 * Part controlled by the directive. If another value other than this
 * directive has been set on the Part, the iterable will no longer be listened
 * to and new values won't be written to the Part.
 *
 * [1]: https://github.com/tc39/proposal-async-iteration
 *
 * @param value An async iterable
 * @param mapper An optional function that maps from (value, index) to another
 *     value. Useful for generating templates for each item in the iterable.
 */
const asyncAppend = directive((value, mapper) => async (part) => {
    var e_1, _a;
    if (!(part instanceof NodePart)) {
        throw new Error('asyncAppend can only be used in text bindings');
    }
    // If we've already set up this particular iterable, we don't need
    // to do anything.
    if (value === part.value) {
        return;
    }
    part.value = value;
    // We keep track of item Parts across iterations, so that we can
    // share marker nodes between consecutive Parts.
    let itemPart;
    let i = 0;
    try {
        for (var value_1 = __asyncValues(value), value_1_1; value_1_1 = await value_1.next(), !value_1_1.done;) {
            let v = value_1_1.value;
            // Check to make sure that value is the still the current value of
            // the part, and if not bail because a new value owns this part
            if (part.value !== value) {
                break;
            }
            // When we get the first value, clear the part. This lets the
            // previous value display until we can replace it.
            if (i === 0) {
                part.clear();
            }
            // As a convenience, because functional-programming-style
            // transforms of iterables and async iterables requires a library,
            // we accept a mapper function. This is especially convenient for
            // rendering a template for each item.
            if (mapper !== undefined) {
                // This is safe because T must otherwise be treated as unknown by
                // the rest of the system.
                v = mapper(v, i);
            }
            // Like with sync iterables, each item induces a Part, so we need
            // to keep track of start and end nodes for the Part.
            // Note: Because these Parts are not updatable like with a sync
            // iterable (if we render a new value, we always clear), it may
            // be possible to optimize away the Parts and just re-use the
            // Part.setValue() logic.
            let itemStartNode = part.startNode;
            // Check to see if we have a previous item and Part
            if (itemPart !== undefined) {
                // Create a new node to separate the previous and next Parts
                itemStartNode = createMarker();
                // itemPart is currently the Part for the previous item. Set
                // it's endNode to the node we'll use for the next Part's
                // startNode.
                itemPart.endNode = itemStartNode;
                part.endNode.parentNode.insertBefore(itemStartNode, part.endNode);
            }
            itemPart = new NodePart(part.options);
            itemPart.insertAfterNode(itemStartNode);
            itemPart.setValue(v);
            itemPart.commit();
            i++;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (value_1_1 && !value_1_1.done && (_a = value_1.return)) await _a.call(value_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
});

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
var __asyncValues$1 = (undefined && undefined.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
/**
 * A directive that renders the items of an async iterable[1], replacing
 * previous values with new values, so that only one value is ever rendered
 * at a time.
 *
 * Async iterables are objects with a [Symbol.asyncIterator] method, which
 * returns an iterator who's `next()` method returns a Promise. When a new
 * value is available, the Promise resolves and the value is rendered to the
 * Part controlled by the directive. If another value other than this
 * directive has been set on the Part, the iterable will no longer be listened
 * to and new values won't be written to the Part.
 *
 * [1]: https://github.com/tc39/proposal-async-iteration
 *
 * @param value An async iterable
 * @param mapper An optional function that maps from (value, index) to another
 *     value. Useful for generating templates for each item in the iterable.
 */
const asyncReplace = directive((value, mapper) => async (part) => {
    var e_1, _a;
    if (!(part instanceof NodePart)) {
        throw new Error('asyncReplace can only be used in text bindings');
    }
    // If we've already set up this particular iterable, we don't need
    // to do anything.
    if (value === part.value) {
        return;
    }
    // We nest a new part to keep track of previous item values separately
    // of the iterable as a value itself.
    const itemPart = new NodePart(part.options);
    part.value = value;
    let i = 0;
    try {
        for (var value_1 = __asyncValues$1(value), value_1_1; value_1_1 = await value_1.next(), !value_1_1.done;) {
            let v = value_1_1.value;
            // Check to make sure that value is the still the current value of
            // the part, and if not bail because a new value owns this part
            if (part.value !== value) {
                break;
            }
            // When we get the first value, clear the part. This let's the
            // previous value display until we can replace it.
            if (i === 0) {
                part.clear();
                itemPart.appendIntoPart(part);
            }
            // As a convenience, because functional-programming-style
            // transforms of iterables and async iterables requires a library,
            // we accept a mapper function. This is especially convenient for
            // rendering a template for each item.
            if (mapper !== undefined) {
                // This is safe because T must otherwise be treated as unknown by
                // the rest of the system.
                v = mapper(v, i);
            }
            itemPart.setValue(v);
            itemPart.commit();
            i++;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (value_1_1 && !value_1_1.done && (_a = value_1.return)) await _a.call(value_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
});

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const templateCaches$1 = new WeakMap();
/**
 * Enables fast switching between multiple templates by caching the DOM nodes
 * and TemplateInstances produced by the templates.
 *
 * Example:
 *
 * ```
 * let checked = false;
 *
 * html`
 *   ${cache(checked ? html`input is checked` : html`input is not checked`)}
 * `
 * ```
 */
const cache = directive((value) => (part) => {
    if (!(part instanceof NodePart)) {
        throw new Error('cache can only be used in text bindings');
    }
    let templateCache = templateCaches$1.get(part);
    if (templateCache === undefined) {
        templateCache = new WeakMap();
        templateCaches$1.set(part, templateCache);
    }
    const previousValue = part.value;
    // First, can we update the current TemplateInstance, or do we need to move
    // the current nodes into the cache?
    if (previousValue instanceof TemplateInstance) {
        if (value instanceof TemplateResult &&
            previousValue.template === part.options.templateFactory(value)) {
            // Same Template, just trigger an update of the TemplateInstance
            part.setValue(value);
            return;
        }
        else {
            // Not the same Template, move the nodes from the DOM into the cache.
            let cachedTemplate = templateCache.get(previousValue.template);
            if (cachedTemplate === undefined) {
                cachedTemplate = {
                    instance: previousValue,
                    nodes: document.createDocumentFragment(),
                };
                templateCache.set(previousValue.template, cachedTemplate);
            }
            reparentNodes(cachedTemplate.nodes, part.startNode.nextSibling, part.endNode);
        }
    }
    // Next, can we reuse nodes from the cache?
    if (value instanceof TemplateResult) {
        const template = part.options.templateFactory(value);
        const cachedTemplate = templateCache.get(template);
        if (cachedTemplate !== undefined) {
            // Move nodes out of cache
            part.setValue(cachedTemplate.nodes);
            part.commit();
            // Set the Part value to the TemplateInstance so it'll update it.
            part.value = cachedTemplate.instance;
        }
    }
    part.setValue(value);
});

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// IE11 doesn't support classList on SVG elements, so we emulate it with a Set
class ClassList {
    constructor(element) {
        this.classes = new Set();
        this.changed = false;
        this.element = element;
        const classList = (element.getAttribute('class') || '').split(/\s+/);
        for (const cls of classList) {
            this.classes.add(cls);
        }
    }
    add(cls) {
        this.classes.add(cls);
        this.changed = true;
    }
    remove(cls) {
        this.classes.delete(cls);
        this.changed = true;
    }
    commit() {
        if (this.changed) {
            let classString = '';
            this.classes.forEach((cls) => classString += cls + ' ');
            this.element.setAttribute('class', classString);
        }
    }
}
/**
 * Stores the ClassInfo object applied to a given AttributePart.
 * Used to unset existing values when a new ClassInfo object is applied.
 */
const previousClassesCache = new WeakMap();
/**
 * A directive that applies CSS classes. This must be used in the `class`
 * attribute and must be the only part used in the attribute. It takes each
 * property in the `classInfo` argument and adds the property name to the
 * element's `class` if the property value is truthy; if the property value is
 * falsey, the property name is removed from the element's `class`. For example
 * `{foo: bar}` applies the class `foo` if the value of `bar` is truthy.
 * @param classInfo {ClassInfo}
 */
const classMap = directive((classInfo) => (part) => {
    if (!(part instanceof AttributePart) || (part instanceof PropertyPart) ||
        part.committer.name !== 'class' || part.committer.parts.length > 1) {
        throw new Error('The `classMap` directive must be used in the `class` attribute ' +
            'and must be the only part in the attribute.');
    }
    const { committer } = part;
    const { element } = committer;
    let previousClasses = previousClassesCache.get(part);
    if (previousClasses === undefined) {
        // Write static classes once
        // Use setAttribute() because className isn't a string on SVG elements
        element.setAttribute('class', committer.strings.join(' '));
        previousClassesCache.set(part, previousClasses = new Set());
    }
    const classList = (element.classList || new ClassList(element));
    // Remove old classes that no longer apply
    // We use forEach() instead of for-of so that re don't require down-level
    // iteration.
    previousClasses.forEach((name) => {
        if (!(name in classInfo)) {
            classList.remove(name);
            previousClasses.delete(name);
        }
    });
    // Add or remove classes based on their classMap value
    for (const name in classInfo) {
        const value = classInfo[name];
        if (value != previousClasses.has(name)) {
            // We explicitly want a loose truthy check of `value` because it seems
            // more convenient that '' and 0 are skipped.
            if (value) {
                classList.add(name);
                previousClasses.add(name);
            }
            else {
                classList.remove(name);
                previousClasses.delete(name);
            }
        }
    }
    if (typeof classList.commit === 'function') {
        classList.commit();
    }
});

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const previousValues = new WeakMap();
/**
 * Prevents re-render of a template function until a single value or an array of
 * values changes.
 *
 * Example:
 *
 * ```js
 * html`
 *   <div>
 *     ${guard([user.id, company.id], () => html`...`)}
 *   </div>
 * ```
 *
 * In this case, the template only renders if either `user.id` or `company.id`
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
 * ```
 *
 * In this case, items are mapped over only when the array reference changes.
 *
 * @param value the value to check before re-rendering
 * @param f the template function
 */
const guard = directive((value, f) => (part) => {
    const previousValue = previousValues.get(part);
    if (Array.isArray(value)) {
        // Dirty-check arrays by item
        if (Array.isArray(previousValue) &&
            previousValue.length === value.length &&
            value.every((v, i) => v === previousValue[i])) {
            return;
        }
    }
    else if (previousValue === value &&
        (value !== undefined || previousValues.has(part))) {
        // Dirty-check non-arrays by identity
        return;
    }
    part.setValue(f());
    // Copy the value if it's an array so that if it's mutated we don't forget
    // what the previous values were.
    previousValues.set(part, Array.isArray(value) ? Array.from(value) : value);
});

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const previousValues$1 = new WeakMap();
/**
 * For AttributeParts, sets the attribute if the value is defined and removes
 * the attribute if the value is undefined.
 *
 * For other part types, this directive is a no-op.
 */
const ifDefined = directive((value) => (part) => {
    const previousValue = previousValues$1.get(part);
    if (value === undefined && part instanceof AttributePart) {
        // If the value is undefined, remove the attribute, but only if the value
        // was previously defined.
        if (previousValue !== undefined || !previousValues$1.has(part)) {
            const name = part.committer.name;
            part.committer.element.removeAttribute(name);
        }
    }
    else if (value !== previousValue) {
        part.setValue(value);
    }
    previousValues$1.set(part, value);
});

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// Helper functions for manipulating parts
// TODO(kschaaf): Refactor into Part API?
const createAndInsertPart = (containerPart, beforePart) => {
    const container = containerPart.startNode.parentNode;
    const beforeNode = beforePart === undefined ? containerPart.endNode :
        beforePart.startNode;
    const startNode = container.insertBefore(createMarker(), beforeNode);
    container.insertBefore(createMarker(), beforeNode);
    const newPart = new NodePart(containerPart.options);
    newPart.insertAfterNode(startNode);
    return newPart;
};
const updatePart = (part, value) => {
    part.setValue(value);
    part.commit();
    return part;
};
const insertPartBefore = (containerPart, part, ref) => {
    const container = containerPart.startNode.parentNode;
    const beforeNode = ref ? ref.startNode : containerPart.endNode;
    const endNode = part.endNode.nextSibling;
    if (endNode !== beforeNode) {
        reparentNodes(container, part.startNode, endNode, beforeNode);
    }
};
const removePart = (part) => {
    removeNodes(part.startNode.parentNode, part.startNode, part.endNode.nextSibling);
};
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
// Stores previous ordered list of parts and map of key to index
const partListCache = new WeakMap();
const keyListCache = new WeakMap();
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
 * IMPORTANT: If providing a `keyFn`, keys *must* be unique for all items in a
 * given call to `repeat`. The behavior when two or more items have the same key
 * is undefined.
 *
 * If no `keyFn` is provided, this directive will perform similar to mapping
 * items to values, and DOM will be reused against potentially different items.
 */
const repeat = directive((items, keyFnOrTemplate, template) => {
    let keyFn;
    if (template === undefined) {
        template = keyFnOrTemplate;
    }
    else if (keyFnOrTemplate !== undefined) {
        keyFn = keyFnOrTemplate;
    }
    return (containerPart) => {
        if (!(containerPart instanceof NodePart)) {
            throw new Error('repeat can only be used in text bindings');
        }
        // Old part & key lists are retrieved from the last update
        // (associated with the part for this instance of the directive)
        const oldParts = partListCache.get(containerPart) || [];
        const oldKeys = keyListCache.get(containerPart) || [];
        // New part list will be built up as we go (either reused from
        // old parts or created for new keys in this update). This is
        // saved in the above cache at the end of the update.
        const newParts = [];
        // New value list is eagerly generated from items along with a
        // parallel array indicating its key.
        const newValues = [];
        const newKeys = [];
        let index = 0;
        for (const item of items) {
            newKeys[index] = keyFn ? keyFn(item, index) : index;
            newValues[index] = template(item, index);
            index++;
        }
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
        // * TODO(kschaaf) Note, we could calculate the longest
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
                newParts[newHead] =
                    updatePart(oldParts[oldHead], newValues[newHead]);
                oldHead++;
                newHead++;
            }
            else if (oldKeys[oldTail] === newKeys[newTail]) {
                // Old tail matches new tail; update in place
                newParts[newTail] =
                    updatePart(oldParts[oldTail], newValues[newTail]);
                oldTail--;
                newTail--;
            }
            else if (oldKeys[oldHead] === newKeys[newTail]) {
                // Old head matches new tail; update and move to new tail
                newParts[newTail] =
                    updatePart(oldParts[oldHead], newValues[newTail]);
                insertPartBefore(containerPart, oldParts[oldHead], newParts[newTail + 1]);
                oldHead++;
                newTail--;
            }
            else if (oldKeys[oldTail] === newKeys[newHead]) {
                // Old tail matches new head; update and move to new head
                newParts[newHead] =
                    updatePart(oldParts[oldTail], newValues[newHead]);
                insertPartBefore(containerPart, oldParts[oldTail], oldParts[oldHead]);
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
                        const newPart = createAndInsertPart(containerPart, oldParts[oldHead]);
                        updatePart(newPart, newValues[newHead]);
                        newParts[newHead] = newPart;
                    }
                    else {
                        // Reuse old part
                        newParts[newHead] =
                            updatePart(oldPart, newValues[newHead]);
                        insertPartBefore(containerPart, oldPart, oldParts[oldHead]);
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
            const newPart = createAndInsertPart(containerPart, newParts[newTail + 1]);
            updatePart(newPart, newValues[newHead]);
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
        partListCache.set(containerPart, newParts);
        keyListCache.set(containerPart, newKeys);
    };
});

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * Stores the StyleInfo object applied to a given AttributePart.
 * Used to unset existing values when a new StyleInfo object is applied.
 */
const previousStylePropertyCache = new WeakMap();
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
 * @param styleInfo {StyleInfo}
 */
const styleMap = directive((styleInfo) => (part) => {
    if (!(part instanceof AttributePart) || (part instanceof PropertyPart) ||
        part.committer.name !== 'style' || part.committer.parts.length > 1) {
        throw new Error('The `styleMap` directive must be used in the style attribute ' +
            'and must be the only part in the attribute.');
    }
    const { committer } = part;
    const { style } = committer.element;
    let previousStyleProperties = previousStylePropertyCache.get(part);
    if (previousStyleProperties === undefined) {
        // Write static styles once
        style.cssText = committer.strings.join(' ');
        previousStylePropertyCache.set(part, previousStyleProperties = new Set());
    }
    // Remove old properties that no longer exist in styleInfo
    // We use forEach() instead of for-of so that re don't require down-level
    // iteration.
    previousStyleProperties.forEach((name) => {
        if (!(name in styleInfo)) {
            previousStyleProperties.delete(name);
            if (name.indexOf('-') === -1) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                style[name] = null;
            }
            else {
                style.removeProperty(name);
            }
        }
    });
    // Add or update properties
    for (const name in styleInfo) {
        previousStyleProperties.add(name);
        if (name.indexOf('-') === -1) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            style[name] = styleInfo[name];
        }
        else {
            style.setProperty(name, styleInfo[name]);
        }
    }
});

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// For each part, remember the value that was last rendered to the part by the
// unsafeHTML directive, and the DocumentFragment that was last set as a value.
// The DocumentFragment is used as a unique key to check if the last value
// rendered to the part was with unsafeHTML. If not, we'll always re-render the
// value passed to unsafeHTML.
const previousValues$2 = new WeakMap();
/**
 * Renders the result as HTML, rather than text.
 *
 * Note, this is unsafe to use with any user-provided input that hasn't been
 * sanitized or escaped, as it may lead to cross-site-scripting
 * vulnerabilities.
 */
const unsafeHTML = directive((value) => (part) => {
    if (!(part instanceof NodePart)) {
        throw new Error('unsafeHTML can only be used in text bindings');
    }
    const previousValue = previousValues$2.get(part);
    if (previousValue !== undefined && isPrimitive(value) &&
        value === previousValue.value && part.value === previousValue.fragment) {
        return;
    }
    const template = document.createElement('template');
    template.innerHTML = value; // innerHTML casts to string internally
    const fragment = document.importNode(template.content, true);
    part.setValue(fragment);
    previousValues$2.set(part, { value, fragment });
});

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const _state = new WeakMap();
// Effectively infinity, but a SMI.
const _infinity = 0x7fffffff;
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
 *     const content = fetch('./content.txt').then(r => r.text());
 *     html`${until(content, html`<span>Loading...</span>`)}`
 */
const until = directive((...args) => (part) => {
    let state = _state.get(part);
    if (state === undefined) {
        state = {
            lastRenderedIndex: _infinity,
            values: [],
        };
        _state.set(part, state);
    }
    const previousValues = state.values;
    let previousLength = previousValues.length;
    state.values = args;
    for (let i = 0; i < args.length; i++) {
        // If we've rendered a higher-priority value already, stop.
        if (i > state.lastRenderedIndex) {
            break;
        }
        const value = args[i];
        // Render non-Promise values immediately
        if (isPrimitive(value) ||
            typeof value.then !== 'function') {
            part.setValue(value);
            state.lastRenderedIndex = i;
            // Since a lower-priority value will never overwrite a higher-priority
            // synchronous value, we can stop processing now.
            break;
        }
        // If this is a Promise we've already handled, skip it.
        if (i < previousLength && value === previousValues[i]) {
            continue;
        }
        // We have a Promise that we haven't seen before, so priorities may have
        // changed. Forget what we rendered before.
        state.lastRenderedIndex = _infinity;
        previousLength = 0;
        Promise.resolve(value).then((resolvedValue) => {
            const index = state.values.indexOf(value);
            // If state.values doesn't contain the value, we've re-rendered without
            // the value, so don't render it. Then, only render if the value is
            // higher-priority than what's already been rendered.
            if (index > -1 && index < state.lastRenderedIndex) {
                state.lastRenderedIndex = index;
                part.setValue(resolvedValue);
                part.commit();
            }
        });
    }
});

const directives$1 = {
    asyncAppend,
    asyncReplace,
    cache,
    classMap,
    guard,
    ifDefined,
    repeat,
    styleMap,
    unsafeHTML,
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
    const ta = [src]; // eslint-disable-line @typescript-eslint/no-explicit-any
    ta.raw = [src];
    return ta;
};

export { SVGTemplateResult, TemplateResult, directive, directives$1 as directives, html, parts, render, svg, toTemplateStringsArray };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLm1qcyIsInNvdXJjZXMiOlsibGl0LWh0bWwvc3JjL2xpYi9kaXJlY3RpdmUudHMiLCJsaXQtaHRtbC9zcmMvbGliL2RvbS50cyIsImxpdC1odG1sL3NyYy9saWIvcGFydC50cyIsImxpdC1odG1sL3NyYy9saWIvdGVtcGxhdGUudHMiLCJsaXQtaHRtbC9zcmMvbGliL3RlbXBsYXRlLWluc3RhbmNlLnRzIiwibGl0LWh0bWwvc3JjL2xpYi90ZW1wbGF0ZS1yZXN1bHQudHMiLCJsaXQtaHRtbC9zcmMvbGliL3BhcnRzLnRzIiwibGl0LWh0bWwvc3JjL2xpYi9kZWZhdWx0LXRlbXBsYXRlLXByb2Nlc3Nvci50cyIsImxpdC1odG1sL3NyYy9saWIvdGVtcGxhdGUtZmFjdG9yeS50cyIsImxpdC1odG1sL3NyYy9saWIvcmVuZGVyLnRzIiwibGl0LWh0bWwvc3JjL2xpdC1odG1sLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvYXN5bmMtYXBwZW5kLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvYXN5bmMtcmVwbGFjZS50cyIsImxpdC1odG1sL3NyYy9kaXJlY3RpdmVzL2NhY2hlLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvY2xhc3MtbWFwLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvZ3VhcmQudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9pZi1kZWZpbmVkLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvcmVwZWF0LnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvc3R5bGUtbWFwLnRzIiwibGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvdW5zYWZlLWh0bWwudHMiLCJsaXQtaHRtbC9zcmMvZGlyZWN0aXZlcy91bnRpbC50cyIsImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cblxuLyoqXG4gKiBAbW9kdWxlIGxpdC1odG1sXG4gKi9cblxuaW1wb3J0IHtQYXJ0fSBmcm9tICcuL3BhcnQuanMnO1xuXG5jb25zdCBkaXJlY3RpdmVzID0gbmV3IFdlYWtNYXA8b2JqZWN0LCB0cnVlPigpO1xuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuZXhwb3J0IHR5cGUgRGlyZWN0aXZlRmFjdG9yeSA9ICguLi5hcmdzOiBhbnlbXSkgPT4gb2JqZWN0O1xuXG5leHBvcnQgdHlwZSBEaXJlY3RpdmVGbiA9IChwYXJ0OiBQYXJ0KSA9PiB2b2lkO1xuXG4vKipcbiAqIEJyYW5kcyBhIGZ1bmN0aW9uIGFzIGEgZGlyZWN0aXZlIGZhY3RvcnkgZnVuY3Rpb24gc28gdGhhdCBsaXQtaHRtbCB3aWxsIGNhbGxcbiAqIHRoZSBmdW5jdGlvbiBkdXJpbmcgdGVtcGxhdGUgcmVuZGVyaW5nLCByYXRoZXIgdGhhbiBwYXNzaW5nIGFzIGEgdmFsdWUuXG4gKlxuICogQSBfZGlyZWN0aXZlXyBpcyBhIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYSBQYXJ0IGFzIGFuIGFyZ3VtZW50LiBJdCBoYXMgdGhlXG4gKiBzaWduYXR1cmU6IGAocGFydDogUGFydCkgPT4gdm9pZGAuXG4gKlxuICogQSBkaXJlY3RpdmUgX2ZhY3RvcnlfIGlzIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhcmd1bWVudHMgZm9yIGRhdGEgYW5kXG4gKiBjb25maWd1cmF0aW9uIGFuZCByZXR1cm5zIGEgZGlyZWN0aXZlLiBVc2VycyBvZiBkaXJlY3RpdmUgdXN1YWxseSByZWZlciB0b1xuICogdGhlIGRpcmVjdGl2ZSBmYWN0b3J5IGFzIHRoZSBkaXJlY3RpdmUuIEZvciBleGFtcGxlLCBcIlRoZSByZXBlYXQgZGlyZWN0aXZlXCIuXG4gKlxuICogVXN1YWxseSBhIHRlbXBsYXRlIGF1dGhvciB3aWxsIGludm9rZSBhIGRpcmVjdGl2ZSBmYWN0b3J5IGluIHRoZWlyIHRlbXBsYXRlXG4gKiB3aXRoIHJlbGV2YW50IGFyZ3VtZW50cywgd2hpY2ggd2lsbCB0aGVuIHJldHVybiBhIGRpcmVjdGl2ZSBmdW5jdGlvbi5cbiAqXG4gKiBIZXJlJ3MgYW4gZXhhbXBsZSBvZiB1c2luZyB0aGUgYHJlcGVhdCgpYCBkaXJlY3RpdmUgZmFjdG9yeSB0aGF0IHRha2VzIGFuXG4gKiBhcnJheSBhbmQgYSBmdW5jdGlvbiB0byByZW5kZXIgYW4gaXRlbTpcbiAqXG4gKiBgYGBqc1xuICogaHRtbGA8dWw+PCR7cmVwZWF0KGl0ZW1zLCAoaXRlbSkgPT4gaHRtbGA8bGk+JHtpdGVtfTwvbGk+YCl9PC91bD5gXG4gKiBgYGBcbiAqXG4gKiBXaGVuIGByZXBlYXRgIGlzIGludm9rZWQsIGl0IHJldHVybnMgYSBkaXJlY3RpdmUgZnVuY3Rpb24gdGhhdCBjbG9zZXMgb3ZlclxuICogYGl0ZW1zYCBhbmQgdGhlIHRlbXBsYXRlIGZ1bmN0aW9uLiBXaGVuIHRoZSBvdXRlciB0ZW1wbGF0ZSBpcyByZW5kZXJlZCwgdGhlXG4gKiByZXR1cm4gZGlyZWN0aXZlIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIHRoZSBQYXJ0IGZvciB0aGUgZXhwcmVzc2lvbi5cbiAqIGByZXBlYXRgIHRoZW4gcGVyZm9ybXMgaXQncyBjdXN0b20gbG9naWMgdG8gcmVuZGVyIG11bHRpcGxlIGl0ZW1zLlxuICpcbiAqIEBwYXJhbSBmIFRoZSBkaXJlY3RpdmUgZmFjdG9yeSBmdW5jdGlvbi4gTXVzdCBiZSBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhXG4gKiBmdW5jdGlvbiBvZiB0aGUgc2lnbmF0dXJlIGAocGFydDogUGFydCkgPT4gdm9pZGAuIFRoZSByZXR1cm5lZCBmdW5jdGlvbiB3aWxsXG4gKiBiZSBjYWxsZWQgd2l0aCB0aGUgcGFydCBvYmplY3QuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBpbXBvcnQge2RpcmVjdGl2ZSwgaHRtbH0gZnJvbSAnbGl0LWh0bWwnO1xuICpcbiAqIGNvbnN0IGltbXV0YWJsZSA9IGRpcmVjdGl2ZSgodikgPT4gKHBhcnQpID0+IHtcbiAqICAgaWYgKHBhcnQudmFsdWUgIT09IHYpIHtcbiAqICAgICBwYXJ0LnNldFZhbHVlKHYpXG4gKiAgIH1cbiAqIH0pO1xuICovXG5leHBvcnQgY29uc3QgZGlyZWN0aXZlID0gPEYgZXh0ZW5kcyBEaXJlY3RpdmVGYWN0b3J5PihmOiBGKTogRiA9PlxuICAgICgoLi4uYXJnczogdW5rbm93bltdKSA9PiB7XG4gICAgICBjb25zdCBkID0gZiguLi5hcmdzKTtcbiAgICAgIGRpcmVjdGl2ZXMuc2V0KGQsIHRydWUpO1xuICAgICAgcmV0dXJuIGQ7XG4gICAgfSkgYXMgRjtcblxuZXhwb3J0IGNvbnN0IGlzRGlyZWN0aXZlID0gKG86IHVua25vd24pOiBvIGlzIERpcmVjdGl2ZUZuID0+IHtcbiAgcmV0dXJuIHR5cGVvZiBvID09PSAnZnVuY3Rpb24nICYmIGRpcmVjdGl2ZXMuaGFzKG8pO1xufTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cblxuLyoqXG4gKiBAbW9kdWxlIGxpdC1odG1sXG4gKi9cblxuaW50ZXJmYWNlIE1heWJlUG9seWZpbGxlZENlIGV4dGVuZHMgQ3VzdG9tRWxlbWVudFJlZ2lzdHJ5IHtcbiAgcmVhZG9ubHkgcG9seWZpbGxXcmFwRmx1c2hDYWxsYmFjaz86IG9iamVjdDtcbn1cblxuLyoqXG4gKiBUcnVlIGlmIHRoZSBjdXN0b20gZWxlbWVudHMgcG9seWZpbGwgaXMgaW4gdXNlLlxuICovXG5leHBvcnQgY29uc3QgaXNDRVBvbHlmaWxsID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICB3aW5kb3cuY3VzdG9tRWxlbWVudHMgIT0gbnVsbCAmJlxuICAgICh3aW5kb3cuY3VzdG9tRWxlbWVudHMgYXMgTWF5YmVQb2x5ZmlsbGVkQ2UpLnBvbHlmaWxsV3JhcEZsdXNoQ2FsbGJhY2sgIT09XG4gICAgICAgIHVuZGVmaW5lZDtcblxuLyoqXG4gKiBSZXBhcmVudHMgbm9kZXMsIHN0YXJ0aW5nIGZyb20gYHN0YXJ0YCAoaW5jbHVzaXZlKSB0byBgZW5kYCAoZXhjbHVzaXZlKSxcbiAqIGludG8gYW5vdGhlciBjb250YWluZXIgKGNvdWxkIGJlIHRoZSBzYW1lIGNvbnRhaW5lciksIGJlZm9yZSBgYmVmb3JlYC4gSWZcbiAqIGBiZWZvcmVgIGlzIG51bGwsIGl0IGFwcGVuZHMgdGhlIG5vZGVzIHRvIHRoZSBjb250YWluZXIuXG4gKi9cbmV4cG9ydCBjb25zdCByZXBhcmVudE5vZGVzID1cbiAgICAoY29udGFpbmVyOiBOb2RlLFxuICAgICBzdGFydDogTm9kZXxudWxsLFxuICAgICBlbmQ6IE5vZGV8bnVsbCA9IG51bGwsXG4gICAgIGJlZm9yZTogTm9kZXxudWxsID0gbnVsbCk6IHZvaWQgPT4ge1xuICAgICAgd2hpbGUgKHN0YXJ0ICE9PSBlbmQpIHtcbiAgICAgICAgY29uc3QgbiA9IHN0YXJ0IS5uZXh0U2libGluZztcbiAgICAgICAgY29udGFpbmVyLmluc2VydEJlZm9yZShzdGFydCEsIGJlZm9yZSk7XG4gICAgICAgIHN0YXJ0ID0gbjtcbiAgICAgIH1cbiAgICB9O1xuXG4vKipcbiAqIFJlbW92ZXMgbm9kZXMsIHN0YXJ0aW5nIGZyb20gYHN0YXJ0YCAoaW5jbHVzaXZlKSB0byBgZW5kYCAoZXhjbHVzaXZlKSwgZnJvbVxuICogYGNvbnRhaW5lcmAuXG4gKi9cbmV4cG9ydCBjb25zdCByZW1vdmVOb2RlcyA9XG4gICAgKGNvbnRhaW5lcjogTm9kZSwgc3RhcnQ6IE5vZGV8bnVsbCwgZW5kOiBOb2RlfG51bGwgPSBudWxsKTogdm9pZCA9PiB7XG4gICAgICB3aGlsZSAoc3RhcnQgIT09IGVuZCkge1xuICAgICAgICBjb25zdCBuID0gc3RhcnQhLm5leHRTaWJsaW5nO1xuICAgICAgICBjb250YWluZXIucmVtb3ZlQ2hpbGQoc3RhcnQhKTtcbiAgICAgICAgc3RhcnQgPSBuO1xuICAgICAgfVxuICAgIH07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTggVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG5cbi8qKlxuICogQG1vZHVsZSBsaXQtaHRtbFxuICovXG5cbi8qKlxuICogVGhlIFBhcnQgaW50ZXJmYWNlIHJlcHJlc2VudHMgYSBkeW5hbWljIHBhcnQgb2YgYSB0ZW1wbGF0ZSBpbnN0YW5jZSByZW5kZXJlZFxuICogYnkgbGl0LWh0bWwuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFydCB7XG4gIHJlYWRvbmx5IHZhbHVlOiB1bmtub3duO1xuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBjdXJyZW50IHBhcnQgdmFsdWUsIGJ1dCBkb2VzIG5vdCB3cml0ZSBpdCB0byB0aGUgRE9NLlxuICAgKiBAcGFyYW0gdmFsdWUgVGhlIHZhbHVlIHRoYXQgd2lsbCBiZSBjb21taXR0ZWQuXG4gICAqL1xuICBzZXRWYWx1ZSh2YWx1ZTogdW5rbm93bik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIENvbW1pdHMgdGhlIGN1cnJlbnQgcGFydCB2YWx1ZSwgY2F1c2luZyBpdCB0byBhY3R1YWxseSBiZSB3cml0dGVuIHRvIHRoZVxuICAgKiBET00uXG4gICAqXG4gICAqIERpcmVjdGl2ZXMgYXJlIHJ1biBhdCB0aGUgc3RhcnQgb2YgYGNvbW1pdGAsIHNvIHRoYXQgaWYgdGhleSBjYWxsXG4gICAqIGBwYXJ0LnNldFZhbHVlKC4uLilgIHN5bmNocm9ub3VzbHkgdGhhdCB2YWx1ZSB3aWxsIGJlIHVzZWQgaW4gdGhlIGN1cnJlbnRcbiAgICogY29tbWl0LCBhbmQgdGhlcmUncyBubyBuZWVkIHRvIGNhbGwgYHBhcnQuY29tbWl0KClgIHdpdGhpbiB0aGUgZGlyZWN0aXZlLlxuICAgKiBJZiBkaXJlY3RpdmVzIHNldCBhIHBhcnQgdmFsdWUgYXN5bmNocm9ub3VzbHksIHRoZW4gdGhleSBtdXN0IGNhbGxcbiAgICogYHBhcnQuY29tbWl0KClgIG1hbnVhbGx5LlxuICAgKi9cbiAgY29tbWl0KCk6IHZvaWQ7XG59XG5cbi8qKlxuICogQSBzZW50aW5lbCB2YWx1ZSB0aGF0IHNpZ25hbHMgdGhhdCBhIHZhbHVlIHdhcyBoYW5kbGVkIGJ5IGEgZGlyZWN0aXZlIGFuZFxuICogc2hvdWxkIG5vdCBiZSB3cml0dGVuIHRvIHRoZSBET00uXG4gKi9cbmV4cG9ydCBjb25zdCBub0NoYW5nZSA9IHt9O1xuXG4vKipcbiAqIEEgc2VudGluZWwgdmFsdWUgdGhhdCBzaWduYWxzIGEgTm9kZVBhcnQgdG8gZnVsbHkgY2xlYXIgaXRzIGNvbnRlbnQuXG4gKi9cbmV4cG9ydCBjb25zdCBub3RoaW5nID0ge307XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG5cbi8qKlxuICogQG1vZHVsZSBsaXQtaHRtbFxuICovXG5cbmltcG9ydCB7VGVtcGxhdGVSZXN1bHR9IGZyb20gJy4vdGVtcGxhdGUtcmVzdWx0LmpzJztcblxuLyoqXG4gKiBBbiBleHByZXNzaW9uIG1hcmtlciB3aXRoIGVtYmVkZGVkIHVuaXF1ZSBrZXkgdG8gYXZvaWQgY29sbGlzaW9uIHdpdGhcbiAqIHBvc3NpYmxlIHRleHQgaW4gdGVtcGxhdGVzLlxuICovXG5leHBvcnQgY29uc3QgbWFya2VyID0gYHt7bGl0LSR7U3RyaW5nKE1hdGgucmFuZG9tKCkpLnNsaWNlKDIpfX19YDtcblxuLyoqXG4gKiBBbiBleHByZXNzaW9uIG1hcmtlciB1c2VkIHRleHQtcG9zaXRpb25zLCBtdWx0aS1iaW5kaW5nIGF0dHJpYnV0ZXMsIGFuZFxuICogYXR0cmlidXRlcyB3aXRoIG1hcmt1cC1saWtlIHRleHQgdmFsdWVzLlxuICovXG5leHBvcnQgY29uc3Qgbm9kZU1hcmtlciA9IGA8IS0tJHttYXJrZXJ9LS0+YDtcblxuZXhwb3J0IGNvbnN0IG1hcmtlclJlZ2V4ID0gbmV3IFJlZ0V4cChgJHttYXJrZXJ9fCR7bm9kZU1hcmtlcn1gKTtcblxuLyoqXG4gKiBTdWZmaXggYXBwZW5kZWQgdG8gYWxsIGJvdW5kIGF0dHJpYnV0ZSBuYW1lcy5cbiAqL1xuZXhwb3J0IGNvbnN0IGJvdW5kQXR0cmlidXRlU3VmZml4ID0gJyRsaXQkJztcblxuLyoqXG4gKiBBbiB1cGRhdGFibGUgVGVtcGxhdGUgdGhhdCB0cmFja3MgdGhlIGxvY2F0aW9uIG9mIGR5bmFtaWMgcGFydHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZSB7XG4gIHJlYWRvbmx5IHBhcnRzOiBUZW1wbGF0ZVBhcnRbXSA9IFtdO1xuICByZWFkb25seSBlbGVtZW50OiBIVE1MVGVtcGxhdGVFbGVtZW50O1xuXG4gIGNvbnN0cnVjdG9yKHJlc3VsdDogVGVtcGxhdGVSZXN1bHQsIGVsZW1lbnQ6IEhUTUxUZW1wbGF0ZUVsZW1lbnQpIHtcbiAgICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG4gICAgY29uc3Qgbm9kZXNUb1JlbW92ZTogTm9kZVtdID0gW107XG4gICAgY29uc3Qgc3RhY2s6IE5vZGVbXSA9IFtdO1xuICAgIC8vIEVkZ2UgbmVlZHMgYWxsIDQgcGFyYW1ldGVycyBwcmVzZW50OyBJRTExIG5lZWRzIDNyZCBwYXJhbWV0ZXIgdG8gYmUgbnVsbFxuICAgIGNvbnN0IHdhbGtlciA9IGRvY3VtZW50LmNyZWF0ZVRyZWVXYWxrZXIoXG4gICAgICAgIGVsZW1lbnQuY29udGVudCxcbiAgICAgICAgMTMzIC8qIE5vZGVGaWx0ZXIuU0hPV197RUxFTUVOVHxDT01NRU5UfFRFWFR9ICovLFxuICAgICAgICBudWxsLFxuICAgICAgICBmYWxzZSk7XG4gICAgLy8gS2VlcHMgdHJhY2sgb2YgdGhlIGxhc3QgaW5kZXggYXNzb2NpYXRlZCB3aXRoIGEgcGFydC4gV2UgdHJ5IHRvIGRlbGV0ZVxuICAgIC8vIHVubmVjZXNzYXJ5IG5vZGVzLCBidXQgd2UgbmV2ZXIgd2FudCB0byBhc3NvY2lhdGUgdHdvIGRpZmZlcmVudCBwYXJ0c1xuICAgIC8vIHRvIHRoZSBzYW1lIGluZGV4LiBUaGV5IG11c3QgaGF2ZSBhIGNvbnN0YW50IG5vZGUgYmV0d2Vlbi5cbiAgICBsZXQgbGFzdFBhcnRJbmRleCA9IDA7XG4gICAgbGV0IGluZGV4ID0gLTE7XG4gICAgbGV0IHBhcnRJbmRleCA9IDA7XG4gICAgY29uc3Qge3N0cmluZ3MsIHZhbHVlczoge2xlbmd0aH19ID0gcmVzdWx0O1xuICAgIHdoaWxlIChwYXJ0SW5kZXggPCBsZW5ndGgpIHtcbiAgICAgIGNvbnN0IG5vZGUgPSB3YWxrZXIubmV4dE5vZGUoKSBhcyBFbGVtZW50IHwgQ29tbWVudCB8IFRleHQgfCBudWxsO1xuICAgICAgaWYgKG5vZGUgPT09IG51bGwpIHtcbiAgICAgICAgLy8gV2UndmUgZXhoYXVzdGVkIHRoZSBjb250ZW50IGluc2lkZSBhIG5lc3RlZCB0ZW1wbGF0ZSBlbGVtZW50LlxuICAgICAgICAvLyBCZWNhdXNlIHdlIHN0aWxsIGhhdmUgcGFydHMgKHRoZSBvdXRlciBmb3ItbG9vcCksIHdlIGtub3c6XG4gICAgICAgIC8vIC0gVGhlcmUgaXMgYSB0ZW1wbGF0ZSBpbiB0aGUgc3RhY2tcbiAgICAgICAgLy8gLSBUaGUgd2Fsa2VyIHdpbGwgZmluZCBhIG5leHROb2RlIG91dHNpZGUgdGhlIHRlbXBsYXRlXG4gICAgICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IHN0YWNrLnBvcCgpITtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpbmRleCsrO1xuXG4gICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMSAvKiBOb2RlLkVMRU1FTlRfTk9ERSAqLykge1xuICAgICAgICBpZiAoKG5vZGUgYXMgRWxlbWVudCkuaGFzQXR0cmlidXRlcygpKSB7XG4gICAgICAgICAgY29uc3QgYXR0cmlidXRlcyA9IChub2RlIGFzIEVsZW1lbnQpLmF0dHJpYnV0ZXM7XG4gICAgICAgICAgY29uc3Qge2xlbmd0aH0gPSBhdHRyaWJ1dGVzO1xuICAgICAgICAgIC8vIFBlclxuICAgICAgICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9OYW1lZE5vZGVNYXAsXG4gICAgICAgICAgLy8gYXR0cmlidXRlcyBhcmUgbm90IGd1YXJhbnRlZWQgdG8gYmUgcmV0dXJuZWQgaW4gZG9jdW1lbnQgb3JkZXIuXG4gICAgICAgICAgLy8gSW4gcGFydGljdWxhciwgRWRnZS9JRSBjYW4gcmV0dXJuIHRoZW0gb3V0IG9mIG9yZGVyLCBzbyB3ZSBjYW5ub3RcbiAgICAgICAgICAvLyBhc3N1bWUgYSBjb3JyZXNwb25kZW5jZSBiZXR3ZWVuIHBhcnQgaW5kZXggYW5kIGF0dHJpYnV0ZSBpbmRleC5cbiAgICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChlbmRzV2l0aChhdHRyaWJ1dGVzW2ldLm5hbWUsIGJvdW5kQXR0cmlidXRlU3VmZml4KSkge1xuICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB3aGlsZSAoY291bnQtLSA+IDApIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgdGVtcGxhdGUgbGl0ZXJhbCBzZWN0aW9uIGxlYWRpbmcgdXAgdG8gdGhlIGZpcnN0XG4gICAgICAgICAgICAvLyBleHByZXNzaW9uIGluIHRoaXMgYXR0cmlidXRlXG4gICAgICAgICAgICBjb25zdCBzdHJpbmdGb3JQYXJ0ID0gc3RyaW5nc1twYXJ0SW5kZXhdO1xuICAgICAgICAgICAgLy8gRmluZCB0aGUgYXR0cmlidXRlIG5hbWVcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBsYXN0QXR0cmlidXRlTmFtZVJlZ2V4LmV4ZWMoc3RyaW5nRm9yUGFydCkhWzJdO1xuICAgICAgICAgICAgLy8gRmluZCB0aGUgY29ycmVzcG9uZGluZyBhdHRyaWJ1dGVcbiAgICAgICAgICAgIC8vIEFsbCBib3VuZCBhdHRyaWJ1dGVzIGhhdmUgaGFkIGEgc3VmZml4IGFkZGVkIGluXG4gICAgICAgICAgICAvLyBUZW1wbGF0ZVJlc3VsdCNnZXRIVE1MIHRvIG9wdCBvdXQgb2Ygc3BlY2lhbCBhdHRyaWJ1dGVcbiAgICAgICAgICAgIC8vIGhhbmRsaW5nLiBUbyBsb29rIHVwIHRoZSBhdHRyaWJ1dGUgdmFsdWUgd2UgYWxzbyBuZWVkIHRvIGFkZFxuICAgICAgICAgICAgLy8gdGhlIHN1ZmZpeC5cbiAgICAgICAgICAgIGNvbnN0IGF0dHJpYnV0ZUxvb2t1cE5hbWUgPVxuICAgICAgICAgICAgICAgIG5hbWUudG9Mb3dlckNhc2UoKSArIGJvdW5kQXR0cmlidXRlU3VmZml4O1xuICAgICAgICAgICAgY29uc3QgYXR0cmlidXRlVmFsdWUgPVxuICAgICAgICAgICAgICAgIChub2RlIGFzIEVsZW1lbnQpLmdldEF0dHJpYnV0ZShhdHRyaWJ1dGVMb29rdXBOYW1lKSE7XG4gICAgICAgICAgICAobm9kZSBhcyBFbGVtZW50KS5yZW1vdmVBdHRyaWJ1dGUoYXR0cmlidXRlTG9va3VwTmFtZSk7XG4gICAgICAgICAgICBjb25zdCBzdGF0aWNzID0gYXR0cmlidXRlVmFsdWUuc3BsaXQobWFya2VyUmVnZXgpO1xuICAgICAgICAgICAgdGhpcy5wYXJ0cy5wdXNoKHt0eXBlOiAnYXR0cmlidXRlJywgaW5kZXgsIG5hbWUsIHN0cmluZ3M6IHN0YXRpY3N9KTtcbiAgICAgICAgICAgIHBhcnRJbmRleCArPSBzdGF0aWNzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICgobm9kZSBhcyBFbGVtZW50KS50YWdOYW1lID09PSAnVEVNUExBVEUnKSB7XG4gICAgICAgICAgc3RhY2sucHVzaChub2RlKTtcbiAgICAgICAgICB3YWxrZXIuY3VycmVudE5vZGUgPSAobm9kZSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50KS5jb250ZW50O1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IDMgLyogTm9kZS5URVhUX05PREUgKi8pIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IChub2RlIGFzIFRleHQpLmRhdGE7XG4gICAgICAgIGlmIChkYXRhLmluZGV4T2YobWFya2VyKSA+PSAwKSB7XG4gICAgICAgICAgY29uc3QgcGFyZW50ID0gbm9kZS5wYXJlbnROb2RlITtcbiAgICAgICAgICBjb25zdCBzdHJpbmdzID0gZGF0YS5zcGxpdChtYXJrZXJSZWdleCk7XG4gICAgICAgICAgY29uc3QgbGFzdEluZGV4ID0gc3RyaW5ncy5sZW5ndGggLSAxO1xuICAgICAgICAgIC8vIEdlbmVyYXRlIGEgbmV3IHRleHQgbm9kZSBmb3IgZWFjaCBsaXRlcmFsIHNlY3Rpb25cbiAgICAgICAgICAvLyBUaGVzZSBub2RlcyBhcmUgYWxzbyB1c2VkIGFzIHRoZSBtYXJrZXJzIGZvciBub2RlIHBhcnRzXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsYXN0SW5kZXg7IGkrKykge1xuICAgICAgICAgICAgbGV0IGluc2VydDogTm9kZTtcbiAgICAgICAgICAgIGxldCBzID0gc3RyaW5nc1tpXTtcbiAgICAgICAgICAgIGlmIChzID09PSAnJykge1xuICAgICAgICAgICAgICBpbnNlcnQgPSBjcmVhdGVNYXJrZXIoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gbGFzdEF0dHJpYnV0ZU5hbWVSZWdleC5leGVjKHMpO1xuICAgICAgICAgICAgICBpZiAobWF0Y2ggIT09IG51bGwgJiYgZW5kc1dpdGgobWF0Y2hbMl0sIGJvdW5kQXR0cmlidXRlU3VmZml4KSkge1xuICAgICAgICAgICAgICAgIHMgPSBzLnNsaWNlKDAsIG1hdGNoLmluZGV4KSArIG1hdGNoWzFdICtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hbMl0uc2xpY2UoMCwgLWJvdW5kQXR0cmlidXRlU3VmZml4Lmxlbmd0aCkgKyBtYXRjaFszXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpbnNlcnQgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUoaW5zZXJ0LCBub2RlKTtcbiAgICAgICAgICAgIHRoaXMucGFydHMucHVzaCh7dHlwZTogJ25vZGUnLCBpbmRleDogKytpbmRleH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBJZiB0aGVyZSdzIG5vIHRleHQsIHdlIG11c3QgaW5zZXJ0IGEgY29tbWVudCB0byBtYXJrIG91ciBwbGFjZS5cbiAgICAgICAgICAvLyBFbHNlLCB3ZSBjYW4gdHJ1c3QgaXQgd2lsbCBzdGljayBhcm91bmQgYWZ0ZXIgY2xvbmluZy5cbiAgICAgICAgICBpZiAoc3RyaW5nc1tsYXN0SW5kZXhdID09PSAnJykge1xuICAgICAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShjcmVhdGVNYXJrZXIoKSwgbm9kZSk7XG4gICAgICAgICAgICBub2Rlc1RvUmVtb3ZlLnB1c2gobm9kZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIChub2RlIGFzIFRleHQpLmRhdGEgPSBzdHJpbmdzW2xhc3RJbmRleF07XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFdlIGhhdmUgYSBwYXJ0IGZvciBlYWNoIG1hdGNoIGZvdW5kXG4gICAgICAgICAgcGFydEluZGV4ICs9IGxhc3RJbmRleDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChub2RlLm5vZGVUeXBlID09PSA4IC8qIE5vZGUuQ09NTUVOVF9OT0RFICovKSB7XG4gICAgICAgIGlmICgobm9kZSBhcyBDb21tZW50KS5kYXRhID09PSBtYXJrZXIpIHtcbiAgICAgICAgICBjb25zdCBwYXJlbnQgPSBub2RlLnBhcmVudE5vZGUhO1xuICAgICAgICAgIC8vIEFkZCBhIG5ldyBtYXJrZXIgbm9kZSB0byBiZSB0aGUgc3RhcnROb2RlIG9mIHRoZSBQYXJ0IGlmIGFueSBvZlxuICAgICAgICAgIC8vIHRoZSBmb2xsb3dpbmcgYXJlIHRydWU6XG4gICAgICAgICAgLy8gICogV2UgZG9uJ3QgaGF2ZSBhIHByZXZpb3VzU2libGluZ1xuICAgICAgICAgIC8vICAqIFRoZSBwcmV2aW91c1NpYmxpbmcgaXMgYWxyZWFkeSB0aGUgc3RhcnQgb2YgYSBwcmV2aW91cyBwYXJ0XG4gICAgICAgICAgaWYgKG5vZGUucHJldmlvdXNTaWJsaW5nID09PSBudWxsIHx8IGluZGV4ID09PSBsYXN0UGFydEluZGV4KSB7XG4gICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShjcmVhdGVNYXJrZXIoKSwgbm9kZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxhc3RQYXJ0SW5kZXggPSBpbmRleDtcbiAgICAgICAgICB0aGlzLnBhcnRzLnB1c2goe3R5cGU6ICdub2RlJywgaW5kZXh9KTtcbiAgICAgICAgICAvLyBJZiB3ZSBkb24ndCBoYXZlIGEgbmV4dFNpYmxpbmcsIGtlZXAgdGhpcyBub2RlIHNvIHdlIGhhdmUgYW4gZW5kLlxuICAgICAgICAgIC8vIEVsc2UsIHdlIGNhbiByZW1vdmUgaXQgdG8gc2F2ZSBmdXR1cmUgY29zdHMuXG4gICAgICAgICAgaWYgKG5vZGUubmV4dFNpYmxpbmcgPT09IG51bGwpIHtcbiAgICAgICAgICAgIChub2RlIGFzIENvbW1lbnQpLmRhdGEgPSAnJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbm9kZXNUb1JlbW92ZS5wdXNoKG5vZGUpO1xuICAgICAgICAgICAgaW5kZXgtLTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcGFydEluZGV4Kys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0IGkgPSAtMTtcbiAgICAgICAgICB3aGlsZSAoKGkgPSAobm9kZSBhcyBDb21tZW50KS5kYXRhLmluZGV4T2YobWFya2VyLCBpICsgMSkpICE9PSAtMSkge1xuICAgICAgICAgICAgLy8gQ29tbWVudCBub2RlIGhhcyBhIGJpbmRpbmcgbWFya2VyIGluc2lkZSwgbWFrZSBhbiBpbmFjdGl2ZSBwYXJ0XG4gICAgICAgICAgICAvLyBUaGUgYmluZGluZyB3b24ndCB3b3JrLCBidXQgc3Vic2VxdWVudCBiaW5kaW5ncyB3aWxsXG4gICAgICAgICAgICAvLyBUT0RPIChqdXN0aW5mYWduYW5pKTogY29uc2lkZXIgd2hldGhlciBpdCdzIGV2ZW4gd29ydGggaXQgdG9cbiAgICAgICAgICAgIC8vIG1ha2UgYmluZGluZ3MgaW4gY29tbWVudHMgd29ya1xuICAgICAgICAgICAgdGhpcy5wYXJ0cy5wdXNoKHt0eXBlOiAnbm9kZScsIGluZGV4OiAtMX0pO1xuICAgICAgICAgICAgcGFydEluZGV4Kys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIHRleHQgYmluZGluZyBub2RlcyBhZnRlciB0aGUgd2FsayB0byBub3QgZGlzdHVyYiB0aGUgVHJlZVdhbGtlclxuICAgIGZvciAoY29uc3QgbiBvZiBub2Rlc1RvUmVtb3ZlKSB7XG4gICAgICBuLnBhcmVudE5vZGUhLnJlbW92ZUNoaWxkKG4pO1xuICAgIH1cbiAgfVxufVxuXG5jb25zdCBlbmRzV2l0aCA9IChzdHI6IHN0cmluZywgc3VmZml4OiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgY29uc3QgaW5kZXggPSBzdHIubGVuZ3RoIC0gc3VmZml4Lmxlbmd0aDtcbiAgcmV0dXJuIGluZGV4ID49IDAgJiYgc3RyLnNsaWNlKGluZGV4KSA9PT0gc3VmZml4O1xufTtcblxuLyoqXG4gKiBBIHBsYWNlaG9sZGVyIGZvciBhIGR5bmFtaWMgZXhwcmVzc2lvbiBpbiBhbiBIVE1MIHRlbXBsYXRlLlxuICpcbiAqIFRoZXJlIGFyZSB0d28gYnVpbHQtaW4gcGFydCB0eXBlczogQXR0cmlidXRlUGFydCBhbmQgTm9kZVBhcnQuIE5vZGVQYXJ0c1xuICogYWx3YXlzIHJlcHJlc2VudCBhIHNpbmdsZSBkeW5hbWljIGV4cHJlc3Npb24sIHdoaWxlIEF0dHJpYnV0ZVBhcnRzIG1heVxuICogcmVwcmVzZW50IGFzIG1hbnkgZXhwcmVzc2lvbnMgYXJlIGNvbnRhaW5lZCBpbiB0aGUgYXR0cmlidXRlLlxuICpcbiAqIEEgVGVtcGxhdGUncyBwYXJ0cyBhcmUgbXV0YWJsZSwgc28gcGFydHMgY2FuIGJlIHJlcGxhY2VkIG9yIG1vZGlmaWVkXG4gKiAocG9zc2libHkgdG8gaW1wbGVtZW50IGRpZmZlcmVudCB0ZW1wbGF0ZSBzZW1hbnRpY3MpLiBUaGUgY29udHJhY3QgaXMgdGhhdFxuICogcGFydHMgY2FuIG9ubHkgYmUgcmVwbGFjZWQsIG5vdCByZW1vdmVkLCBhZGRlZCBvciByZW9yZGVyZWQsIGFuZCBwYXJ0cyBtdXN0XG4gKiBhbHdheXMgY29uc3VtZSB0aGUgY29ycmVjdCBudW1iZXIgb2YgdmFsdWVzIGluIHRoZWlyIGB1cGRhdGUoKWAgbWV0aG9kLlxuICpcbiAqIFRPRE8oanVzdGluZmFnbmFuaSk6IFRoYXQgcmVxdWlyZW1lbnQgaXMgYSBsaXR0bGUgZnJhZ2lsZS4gQVxuICogVGVtcGxhdGVJbnN0YW5jZSBjb3VsZCBpbnN0ZWFkIGJlIG1vcmUgY2FyZWZ1bCBhYm91dCB3aGljaCB2YWx1ZXMgaXQgZ2l2ZXNcbiAqIHRvIFBhcnQudXBkYXRlKCkuXG4gKi9cbmV4cG9ydCB0eXBlIFRlbXBsYXRlUGFydCA9IHtcbiAgcmVhZG9ubHkgdHlwZTogJ25vZGUnOyBpbmRleDogbnVtYmVyO1xufXx7XG4gIHJlYWRvbmx5IHR5cGU6ICdhdHRyaWJ1dGUnO1xuICBpbmRleDogbnVtYmVyO1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IHN0cmluZ3M6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPjtcbn07XG5cbmV4cG9ydCBjb25zdCBpc1RlbXBsYXRlUGFydEFjdGl2ZSA9IChwYXJ0OiBUZW1wbGF0ZVBhcnQpID0+IHBhcnQuaW5kZXggIT09IC0xO1xuXG4vLyBBbGxvd3MgYGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJycpYCB0byBiZSByZW5hbWVkIGZvciBhXG4vLyBzbWFsbCBtYW51YWwgc2l6ZS1zYXZpbmdzLlxuZXhwb3J0IGNvbnN0IGNyZWF0ZU1hcmtlciA9ICgpID0+IGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQoJycpO1xuXG4vKipcbiAqIFRoaXMgcmVnZXggZXh0cmFjdHMgdGhlIGF0dHJpYnV0ZSBuYW1lIHByZWNlZGluZyBhbiBhdHRyaWJ1dGUtcG9zaXRpb25cbiAqIGV4cHJlc3Npb24uIEl0IGRvZXMgdGhpcyBieSBtYXRjaGluZyB0aGUgc3ludGF4IGFsbG93ZWQgZm9yIGF0dHJpYnV0ZXNcbiAqIGFnYWluc3QgdGhlIHN0cmluZyBsaXRlcmFsIGRpcmVjdGx5IHByZWNlZGluZyB0aGUgZXhwcmVzc2lvbiwgYXNzdW1pbmcgdGhhdFxuICogdGhlIGV4cHJlc3Npb24gaXMgaW4gYW4gYXR0cmlidXRlLXZhbHVlIHBvc2l0aW9uLlxuICpcbiAqIFNlZSBhdHRyaWJ1dGVzIGluIHRoZSBIVE1MIHNwZWM6XG4gKiBodHRwczovL3d3dy53My5vcmcvVFIvaHRtbDUvc3ludGF4Lmh0bWwjZWxlbWVudHMtYXR0cmlidXRlc1xuICpcbiAqIFwiIFxceDA5XFx4MGFcXHgwY1xceDBkXCIgYXJlIEhUTUwgc3BhY2UgY2hhcmFjdGVyczpcbiAqIGh0dHBzOi8vd3d3LnczLm9yZy9UUi9odG1sNS9pbmZyYXN0cnVjdHVyZS5odG1sI3NwYWNlLWNoYXJhY3RlcnNcbiAqXG4gKiBcIlxcMC1cXHgxRlxceDdGLVxceDlGXCIgYXJlIFVuaWNvZGUgY29udHJvbCBjaGFyYWN0ZXJzLCB3aGljaCBpbmNsdWRlcyBldmVyeVxuICogc3BhY2UgY2hhcmFjdGVyIGV4Y2VwdCBcIiBcIi5cbiAqXG4gKiBTbyBhbiBhdHRyaWJ1dGUgaXM6XG4gKiAgKiBUaGUgbmFtZTogYW55IGNoYXJhY3RlciBleGNlcHQgYSBjb250cm9sIGNoYXJhY3Rlciwgc3BhY2UgY2hhcmFjdGVyLCAoJyksXG4gKiAgICAoXCIpLCBcIj5cIiwgXCI9XCIsIG9yIFwiL1wiXG4gKiAgKiBGb2xsb3dlZCBieSB6ZXJvIG9yIG1vcmUgc3BhY2UgY2hhcmFjdGVyc1xuICogICogRm9sbG93ZWQgYnkgXCI9XCJcbiAqICAqIEZvbGxvd2VkIGJ5IHplcm8gb3IgbW9yZSBzcGFjZSBjaGFyYWN0ZXJzXG4gKiAgKiBGb2xsb3dlZCBieTpcbiAqICAgICogQW55IGNoYXJhY3RlciBleGNlcHQgc3BhY2UsICgnKSwgKFwiKSwgXCI8XCIsIFwiPlwiLCBcIj1cIiwgKGApLCBvclxuICogICAgKiAoXCIpIHRoZW4gYW55IG5vbi0oXCIpLCBvclxuICogICAgKiAoJykgdGhlbiBhbnkgbm9uLSgnKVxuICovXG5leHBvcnQgY29uc3QgbGFzdEF0dHJpYnV0ZU5hbWVSZWdleCA9XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnRyb2wtcmVnZXhcbiAgICAvKFsgXFx4MDlcXHgwYVxceDBjXFx4MGRdKShbXlxcMC1cXHgxRlxceDdGLVxceDlGIFwiJz49L10rKShbIFxceDA5XFx4MGFcXHgwY1xceDBkXSo9WyBcXHgwOVxceDBhXFx4MGNcXHgwZF0qKD86W14gXFx4MDlcXHgwYVxceDBjXFx4MGRcIidgPD49XSp8XCJbXlwiXSp8J1teJ10qKSkkLztcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cblxuLyoqXG4gKiBAbW9kdWxlIGxpdC1odG1sXG4gKi9cblxuaW1wb3J0IHtpc0NFUG9seWZpbGx9IGZyb20gJy4vZG9tLmpzJztcbmltcG9ydCB7UGFydH0gZnJvbSAnLi9wYXJ0LmpzJztcbmltcG9ydCB7UmVuZGVyT3B0aW9uc30gZnJvbSAnLi9yZW5kZXItb3B0aW9ucy5qcyc7XG5pbXBvcnQge1RlbXBsYXRlUHJvY2Vzc29yfSBmcm9tICcuL3RlbXBsYXRlLXByb2Nlc3Nvci5qcyc7XG5pbXBvcnQge2lzVGVtcGxhdGVQYXJ0QWN0aXZlLCBUZW1wbGF0ZSwgVGVtcGxhdGVQYXJ0fSBmcm9tICcuL3RlbXBsYXRlLmpzJztcblxuLyoqXG4gKiBBbiBpbnN0YW5jZSBvZiBhIGBUZW1wbGF0ZWAgdGhhdCBjYW4gYmUgYXR0YWNoZWQgdG8gdGhlIERPTSBhbmQgdXBkYXRlZFxuICogd2l0aCBuZXcgdmFsdWVzLlxuICovXG5leHBvcnQgY2xhc3MgVGVtcGxhdGVJbnN0YW5jZSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgX19wYXJ0czogQXJyYXk8UGFydHx1bmRlZmluZWQ+ID0gW107XG4gIHJlYWRvbmx5IHByb2Nlc3NvcjogVGVtcGxhdGVQcm9jZXNzb3I7XG4gIHJlYWRvbmx5IG9wdGlvbnM6IFJlbmRlck9wdGlvbnM7XG4gIHJlYWRvbmx5IHRlbXBsYXRlOiBUZW1wbGF0ZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHRlbXBsYXRlOiBUZW1wbGF0ZSwgcHJvY2Vzc29yOiBUZW1wbGF0ZVByb2Nlc3NvcixcbiAgICAgIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMpIHtcbiAgICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGU7XG4gICAgdGhpcy5wcm9jZXNzb3IgPSBwcm9jZXNzb3I7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgfVxuXG4gIHVwZGF0ZSh2YWx1ZXM6IHJlYWRvbmx5IHVua25vd25bXSkge1xuICAgIGxldCBpID0gMDtcbiAgICBmb3IgKGNvbnN0IHBhcnQgb2YgdGhpcy5fX3BhcnRzKSB7XG4gICAgICBpZiAocGFydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHBhcnQuc2V0VmFsdWUodmFsdWVzW2ldKTtcbiAgICAgIH1cbiAgICAgIGkrKztcbiAgICB9XG4gICAgZm9yIChjb25zdCBwYXJ0IG9mIHRoaXMuX19wYXJ0cykge1xuICAgICAgaWYgKHBhcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBwYXJ0LmNvbW1pdCgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIF9jbG9uZSgpOiBEb2N1bWVudEZyYWdtZW50IHtcbiAgICAvLyBUaGVyZSBhcmUgYSBudW1iZXIgb2Ygc3RlcHMgaW4gdGhlIGxpZmVjeWNsZSBvZiBhIHRlbXBsYXRlIGluc3RhbmNlJ3NcbiAgICAvLyBET00gZnJhZ21lbnQ6XG4gICAgLy8gIDEuIENsb25lIC0gY3JlYXRlIHRoZSBpbnN0YW5jZSBmcmFnbWVudFxuICAgIC8vICAyLiBBZG9wdCAtIGFkb3B0IGludG8gdGhlIG1haW4gZG9jdW1lbnRcbiAgICAvLyAgMy4gUHJvY2VzcyAtIGZpbmQgcGFydCBtYXJrZXJzIGFuZCBjcmVhdGUgcGFydHNcbiAgICAvLyAgNC4gVXBncmFkZSAtIHVwZ3JhZGUgY3VzdG9tIGVsZW1lbnRzXG4gICAgLy8gIDUuIFVwZGF0ZSAtIHNldCBub2RlLCBhdHRyaWJ1dGUsIHByb3BlcnR5LCBldGMuLCB2YWx1ZXNcbiAgICAvLyAgNi4gQ29ubmVjdCAtIGNvbm5lY3QgdG8gdGhlIGRvY3VtZW50LiBPcHRpb25hbCBhbmQgb3V0c2lkZSBvZiB0aGlzXG4gICAgLy8gICAgIG1ldGhvZC5cbiAgICAvL1xuICAgIC8vIFdlIGhhdmUgYSBmZXcgY29uc3RyYWludHMgb24gdGhlIG9yZGVyaW5nIG9mIHRoZXNlIHN0ZXBzOlxuICAgIC8vICAqIFdlIG5lZWQgdG8gdXBncmFkZSBiZWZvcmUgdXBkYXRpbmcsIHNvIHRoYXQgcHJvcGVydHkgdmFsdWVzIHdpbGwgcGFzc1xuICAgIC8vICAgIHRocm91Z2ggYW55IHByb3BlcnR5IHNldHRlcnMuXG4gICAgLy8gICogV2Ugd291bGQgbGlrZSB0byBwcm9jZXNzIGJlZm9yZSB1cGdyYWRpbmcgc28gdGhhdCB3ZSdyZSBzdXJlIHRoYXQgdGhlXG4gICAgLy8gICAgY2xvbmVkIGZyYWdtZW50IGlzIGluZXJ0IGFuZCBub3QgZGlzdHVyYmVkIGJ5IHNlbGYtbW9kaWZ5aW5nIERPTS5cbiAgICAvLyAgKiBXZSB3YW50IGN1c3RvbSBlbGVtZW50cyB0byB1cGdyYWRlIGV2ZW4gaW4gZGlzY29ubmVjdGVkIGZyYWdtZW50cy5cbiAgICAvL1xuICAgIC8vIEdpdmVuIHRoZXNlIGNvbnN0cmFpbnRzLCB3aXRoIGZ1bGwgY3VzdG9tIGVsZW1lbnRzIHN1cHBvcnQgd2Ugd291bGRcbiAgICAvLyBwcmVmZXIgdGhlIG9yZGVyOiBDbG9uZSwgUHJvY2VzcywgQWRvcHQsIFVwZ3JhZGUsIFVwZGF0ZSwgQ29ubmVjdFxuICAgIC8vXG4gICAgLy8gQnV0IFNhZmFyaSBkb2VzIG5vdCBpbXBsZW1lbnQgQ3VzdG9tRWxlbWVudFJlZ2lzdHJ5I3VwZ3JhZGUsIHNvIHdlXG4gICAgLy8gY2FuIG5vdCBpbXBsZW1lbnQgdGhhdCBvcmRlciBhbmQgc3RpbGwgaGF2ZSB1cGdyYWRlLWJlZm9yZS11cGRhdGUgYW5kXG4gICAgLy8gdXBncmFkZSBkaXNjb25uZWN0ZWQgZnJhZ21lbnRzLiBTbyB3ZSBpbnN0ZWFkIHNhY3JpZmljZSB0aGVcbiAgICAvLyBwcm9jZXNzLWJlZm9yZS11cGdyYWRlIGNvbnN0cmFpbnQsIHNpbmNlIGluIEN1c3RvbSBFbGVtZW50cyB2MSBlbGVtZW50c1xuICAgIC8vIG11c3Qgbm90IG1vZGlmeSB0aGVpciBsaWdodCBET00gaW4gdGhlIGNvbnN0cnVjdG9yLiBXZSBzdGlsbCBoYXZlIGlzc3Vlc1xuICAgIC8vIHdoZW4gY28tZXhpc3Rpbmcgd2l0aCBDRXYwIGVsZW1lbnRzIGxpa2UgUG9seW1lciAxLCBhbmQgd2l0aCBwb2x5ZmlsbHNcbiAgICAvLyB0aGF0IGRvbid0IHN0cmljdGx5IGFkaGVyZSB0byB0aGUgbm8tbW9kaWZpY2F0aW9uIHJ1bGUgYmVjYXVzZSBzaGFkb3dcbiAgICAvLyBET00sIHdoaWNoIG1heSBiZSBjcmVhdGVkIGluIHRoZSBjb25zdHJ1Y3RvciwgaXMgZW11bGF0ZWQgYnkgYmVpbmcgcGxhY2VkXG4gICAgLy8gaW4gdGhlIGxpZ2h0IERPTS5cbiAgICAvL1xuICAgIC8vIFRoZSByZXN1bHRpbmcgb3JkZXIgaXMgb24gbmF0aXZlIGlzOiBDbG9uZSwgQWRvcHQsIFVwZ3JhZGUsIFByb2Nlc3MsXG4gICAgLy8gVXBkYXRlLCBDb25uZWN0LiBkb2N1bWVudC5pbXBvcnROb2RlKCkgcGVyZm9ybXMgQ2xvbmUsIEFkb3B0LCBhbmQgVXBncmFkZVxuICAgIC8vIGluIG9uZSBzdGVwLlxuICAgIC8vXG4gICAgLy8gVGhlIEN1c3RvbSBFbGVtZW50cyB2MSBwb2x5ZmlsbCBzdXBwb3J0cyB1cGdyYWRlKCksIHNvIHRoZSBvcmRlciB3aGVuXG4gICAgLy8gcG9seWZpbGxlZCBpcyB0aGUgbW9yZSBpZGVhbDogQ2xvbmUsIFByb2Nlc3MsIEFkb3B0LCBVcGdyYWRlLCBVcGRhdGUsXG4gICAgLy8gQ29ubmVjdC5cblxuICAgIGNvbnN0IGZyYWdtZW50ID0gaXNDRVBvbHlmaWxsID9cbiAgICAgICAgdGhpcy50ZW1wbGF0ZS5lbGVtZW50LmNvbnRlbnQuY2xvbmVOb2RlKHRydWUpIGFzIERvY3VtZW50RnJhZ21lbnQgOlxuICAgICAgICBkb2N1bWVudC5pbXBvcnROb2RlKHRoaXMudGVtcGxhdGUuZWxlbWVudC5jb250ZW50LCB0cnVlKTtcblxuICAgIGNvbnN0IHN0YWNrOiBOb2RlW10gPSBbXTtcbiAgICBjb25zdCBwYXJ0cyA9IHRoaXMudGVtcGxhdGUucGFydHM7XG4gICAgLy8gRWRnZSBuZWVkcyBhbGwgNCBwYXJhbWV0ZXJzIHByZXNlbnQ7IElFMTEgbmVlZHMgM3JkIHBhcmFtZXRlciB0byBiZSBudWxsXG4gICAgY29uc3Qgd2Fsa2VyID0gZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcihcbiAgICAgICAgZnJhZ21lbnQsXG4gICAgICAgIDEzMyAvKiBOb2RlRmlsdGVyLlNIT1dfe0VMRU1FTlR8Q09NTUVOVHxURVhUfSAqLyxcbiAgICAgICAgbnVsbCxcbiAgICAgICAgZmFsc2UpO1xuICAgIGxldCBwYXJ0SW5kZXggPSAwO1xuICAgIGxldCBub2RlSW5kZXggPSAwO1xuICAgIGxldCBwYXJ0OiBUZW1wbGF0ZVBhcnQ7XG4gICAgbGV0IG5vZGUgPSB3YWxrZXIubmV4dE5vZGUoKTtcbiAgICAvLyBMb29wIHRocm91Z2ggYWxsIHRoZSBub2RlcyBhbmQgcGFydHMgb2YgYSB0ZW1wbGF0ZVxuICAgIHdoaWxlIChwYXJ0SW5kZXggPCBwYXJ0cy5sZW5ndGgpIHtcbiAgICAgIHBhcnQgPSBwYXJ0c1twYXJ0SW5kZXhdO1xuICAgICAgaWYgKCFpc1RlbXBsYXRlUGFydEFjdGl2ZShwYXJ0KSkge1xuICAgICAgICB0aGlzLl9fcGFydHMucHVzaCh1bmRlZmluZWQpO1xuICAgICAgICBwYXJ0SW5kZXgrKztcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIFByb2dyZXNzIHRoZSB0cmVlIHdhbGtlciB1bnRpbCB3ZSBmaW5kIG91ciBuZXh0IHBhcnQncyBub2RlLlxuICAgICAgLy8gTm90ZSB0aGF0IG11bHRpcGxlIHBhcnRzIG1heSBzaGFyZSB0aGUgc2FtZSBub2RlIChhdHRyaWJ1dGUgcGFydHNcbiAgICAgIC8vIG9uIGEgc2luZ2xlIGVsZW1lbnQpLCBzbyB0aGlzIGxvb3AgbWF5IG5vdCBydW4gYXQgYWxsLlxuICAgICAgd2hpbGUgKG5vZGVJbmRleCA8IHBhcnQuaW5kZXgpIHtcbiAgICAgICAgbm9kZUluZGV4Kys7XG4gICAgICAgIGlmIChub2RlIS5ub2RlTmFtZSA9PT0gJ1RFTVBMQVRFJykge1xuICAgICAgICAgIHN0YWNrLnB1c2gobm9kZSEpO1xuICAgICAgICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IChub2RlIGFzIEhUTUxUZW1wbGF0ZUVsZW1lbnQpLmNvbnRlbnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKChub2RlID0gd2Fsa2VyLm5leHROb2RlKCkpID09PSBudWxsKSB7XG4gICAgICAgICAgLy8gV2UndmUgZXhoYXVzdGVkIHRoZSBjb250ZW50IGluc2lkZSBhIG5lc3RlZCB0ZW1wbGF0ZSBlbGVtZW50LlxuICAgICAgICAgIC8vIEJlY2F1c2Ugd2Ugc3RpbGwgaGF2ZSBwYXJ0cyAodGhlIG91dGVyIGZvci1sb29wKSwgd2Uga25vdzpcbiAgICAgICAgICAvLyAtIFRoZXJlIGlzIGEgdGVtcGxhdGUgaW4gdGhlIHN0YWNrXG4gICAgICAgICAgLy8gLSBUaGUgd2Fsa2VyIHdpbGwgZmluZCBhIG5leHROb2RlIG91dHNpZGUgdGhlIHRlbXBsYXRlXG4gICAgICAgICAgd2Fsa2VyLmN1cnJlbnROb2RlID0gc3RhY2sucG9wKCkhO1xuICAgICAgICAgIG5vZGUgPSB3YWxrZXIubmV4dE5vZGUoKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBXZSd2ZSBhcnJpdmVkIGF0IG91ciBwYXJ0J3Mgbm9kZS5cbiAgICAgIGlmIChwYXJ0LnR5cGUgPT09ICdub2RlJykge1xuICAgICAgICBjb25zdCBwYXJ0ID0gdGhpcy5wcm9jZXNzb3IuaGFuZGxlVGV4dEV4cHJlc3Npb24odGhpcy5vcHRpb25zKTtcbiAgICAgICAgcGFydC5pbnNlcnRBZnRlck5vZGUobm9kZSEucHJldmlvdXNTaWJsaW5nISk7XG4gICAgICAgIHRoaXMuX19wYXJ0cy5wdXNoKHBhcnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fX3BhcnRzLnB1c2goLi4udGhpcy5wcm9jZXNzb3IuaGFuZGxlQXR0cmlidXRlRXhwcmVzc2lvbnMoXG4gICAgICAgICAgICBub2RlIGFzIEVsZW1lbnQsIHBhcnQubmFtZSwgcGFydC5zdHJpbmdzLCB0aGlzLm9wdGlvbnMpKTtcbiAgICAgIH1cbiAgICAgIHBhcnRJbmRleCsrO1xuICAgIH1cblxuICAgIGlmIChpc0NFUG9seWZpbGwpIHtcbiAgICAgIGRvY3VtZW50LmFkb3B0Tm9kZShmcmFnbWVudCk7XG4gICAgICBjdXN0b21FbGVtZW50cy51cGdyYWRlKGZyYWdtZW50KTtcbiAgICB9XG4gICAgcmV0dXJuIGZyYWdtZW50O1xuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG5cbi8qKlxuICogQG1vZHVsZSBsaXQtaHRtbFxuICovXG5cbmltcG9ydCB7cmVwYXJlbnROb2Rlc30gZnJvbSAnLi9kb20uanMnO1xuaW1wb3J0IHtUZW1wbGF0ZVByb2Nlc3Nvcn0gZnJvbSAnLi90ZW1wbGF0ZS1wcm9jZXNzb3IuanMnO1xuaW1wb3J0IHtib3VuZEF0dHJpYnV0ZVN1ZmZpeCwgbGFzdEF0dHJpYnV0ZU5hbWVSZWdleCwgbWFya2VyLCBub2RlTWFya2VyfSBmcm9tICcuL3RlbXBsYXRlLmpzJztcblxuY29uc3QgY29tbWVudE1hcmtlciA9IGAgJHttYXJrZXJ9IGA7XG5cbi8qKlxuICogVGhlIHJldHVybiB0eXBlIG9mIGBodG1sYCwgd2hpY2ggaG9sZHMgYSBUZW1wbGF0ZSBhbmQgdGhlIHZhbHVlcyBmcm9tXG4gKiBpbnRlcnBvbGF0ZWQgZXhwcmVzc2lvbnMuXG4gKi9cbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZVJlc3VsdCB7XG4gIHJlYWRvbmx5IHN0cmluZ3M6IFRlbXBsYXRlU3RyaW5nc0FycmF5O1xuICByZWFkb25seSB2YWx1ZXM6IHJlYWRvbmx5IHVua25vd25bXTtcbiAgcmVhZG9ubHkgdHlwZTogc3RyaW5nO1xuICByZWFkb25seSBwcm9jZXNzb3I6IFRlbXBsYXRlUHJvY2Vzc29yO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgc3RyaW5nczogVGVtcGxhdGVTdHJpbmdzQXJyYXksIHZhbHVlczogcmVhZG9ubHkgdW5rbm93bltdLCB0eXBlOiBzdHJpbmcsXG4gICAgICBwcm9jZXNzb3I6IFRlbXBsYXRlUHJvY2Vzc29yKSB7XG4gICAgdGhpcy5zdHJpbmdzID0gc3RyaW5ncztcbiAgICB0aGlzLnZhbHVlcyA9IHZhbHVlcztcbiAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIHRoaXMucHJvY2Vzc29yID0gcHJvY2Vzc29yO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBzdHJpbmcgb2YgSFRNTCB1c2VkIHRvIGNyZWF0ZSBhIGA8dGVtcGxhdGU+YCBlbGVtZW50LlxuICAgKi9cbiAgZ2V0SFRNTCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IGwgPSB0aGlzLnN0cmluZ3MubGVuZ3RoIC0gMTtcbiAgICBsZXQgaHRtbCA9ICcnO1xuICAgIGxldCBpc0NvbW1lbnRCaW5kaW5nID0gZmFsc2U7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgY29uc3QgcyA9IHRoaXMuc3RyaW5nc1tpXTtcbiAgICAgIC8vIEZvciBlYWNoIGJpbmRpbmcgd2Ugd2FudCB0byBkZXRlcm1pbmUgdGhlIGtpbmQgb2YgbWFya2VyIHRvIGluc2VydFxuICAgICAgLy8gaW50byB0aGUgdGVtcGxhdGUgc291cmNlIGJlZm9yZSBpdCdzIHBhcnNlZCBieSB0aGUgYnJvd3NlcidzIEhUTUxcbiAgICAgIC8vIHBhcnNlci4gVGhlIG1hcmtlciB0eXBlIGlzIGJhc2VkIG9uIHdoZXRoZXIgdGhlIGV4cHJlc3Npb24gaXMgaW4gYW5cbiAgICAgIC8vIGF0dHJpYnV0ZSwgdGV4dCwgb3IgY29tbWVudCBwb3NpdGlvbi5cbiAgICAgIC8vICAgKiBGb3Igbm9kZS1wb3NpdGlvbiBiaW5kaW5ncyB3ZSBpbnNlcnQgYSBjb21tZW50IHdpdGggdGhlIG1hcmtlclxuICAgICAgLy8gICAgIHNlbnRpbmVsIGFzIGl0cyB0ZXh0IGNvbnRlbnQsIGxpa2UgPCEtLXt7bGl0LWd1aWR9fS0tPi5cbiAgICAgIC8vICAgKiBGb3IgYXR0cmlidXRlIGJpbmRpbmdzIHdlIGluc2VydCBqdXN0IHRoZSBtYXJrZXIgc2VudGluZWwgZm9yIHRoZVxuICAgICAgLy8gICAgIGZpcnN0IGJpbmRpbmcsIHNvIHRoYXQgd2Ugc3VwcG9ydCB1bnF1b3RlZCBhdHRyaWJ1dGUgYmluZGluZ3MuXG4gICAgICAvLyAgICAgU3Vic2VxdWVudCBiaW5kaW5ncyBjYW4gdXNlIGEgY29tbWVudCBtYXJrZXIgYmVjYXVzZSBtdWx0aS1iaW5kaW5nXG4gICAgICAvLyAgICAgYXR0cmlidXRlcyBtdXN0IGJlIHF1b3RlZC5cbiAgICAgIC8vICAgKiBGb3IgY29tbWVudCBiaW5kaW5ncyB3ZSBpbnNlcnQganVzdCB0aGUgbWFya2VyIHNlbnRpbmVsIHNvIHdlIGRvbid0XG4gICAgICAvLyAgICAgY2xvc2UgdGhlIGNvbW1lbnQuXG4gICAgICAvL1xuICAgICAgLy8gVGhlIGZvbGxvd2luZyBjb2RlIHNjYW5zIHRoZSB0ZW1wbGF0ZSBzb3VyY2UsIGJ1dCBpcyAqbm90KiBhbiBIVE1MXG4gICAgICAvLyBwYXJzZXIuIFdlIGRvbid0IG5lZWQgdG8gdHJhY2sgdGhlIHRyZWUgc3RydWN0dXJlIG9mIHRoZSBIVE1MLCBvbmx5XG4gICAgICAvLyB3aGV0aGVyIGEgYmluZGluZyBpcyBpbnNpZGUgYSBjb21tZW50LCBhbmQgaWYgbm90LCBpZiBpdCBhcHBlYXJzIHRvIGJlXG4gICAgICAvLyB0aGUgZmlyc3QgYmluZGluZyBpbiBhbiBhdHRyaWJ1dGUuXG4gICAgICBjb25zdCBjb21tZW50T3BlbiA9IHMubGFzdEluZGV4T2YoJzwhLS0nKTtcbiAgICAgIC8vIFdlJ3JlIGluIGNvbW1lbnQgcG9zaXRpb24gaWYgd2UgaGF2ZSBhIGNvbW1lbnQgb3BlbiB3aXRoIG5vIGZvbGxvd2luZ1xuICAgICAgLy8gY29tbWVudCBjbG9zZS4gQmVjYXVzZSA8LS0gY2FuIGFwcGVhciBpbiBhbiBhdHRyaWJ1dGUgdmFsdWUgdGhlcmUgY2FuXG4gICAgICAvLyBiZSBmYWxzZSBwb3NpdGl2ZXMuXG4gICAgICBpc0NvbW1lbnRCaW5kaW5nID0gKGNvbW1lbnRPcGVuID4gLTEgfHwgaXNDb21tZW50QmluZGluZykgJiZcbiAgICAgICAgICBzLmluZGV4T2YoJy0tPicsIGNvbW1lbnRPcGVuICsgMSkgPT09IC0xO1xuICAgICAgLy8gQ2hlY2sgdG8gc2VlIGlmIHdlIGhhdmUgYW4gYXR0cmlidXRlLWxpa2Ugc2VxdWVuY2UgcHJlY2VkaW5nIHRoZVxuICAgICAgLy8gZXhwcmVzc2lvbi4gVGhpcyBjYW4gbWF0Y2ggXCJuYW1lPXZhbHVlXCIgbGlrZSBzdHJ1Y3R1cmVzIGluIHRleHQsXG4gICAgICAvLyBjb21tZW50cywgYW5kIGF0dHJpYnV0ZSB2YWx1ZXMsIHNvIHRoZXJlIGNhbiBiZSBmYWxzZS1wb3NpdGl2ZXMuXG4gICAgICBjb25zdCBhdHRyaWJ1dGVNYXRjaCA9IGxhc3RBdHRyaWJ1dGVOYW1lUmVnZXguZXhlYyhzKTtcbiAgICAgIGlmIChhdHRyaWJ1dGVNYXRjaCA9PT0gbnVsbCkge1xuICAgICAgICAvLyBXZSdyZSBvbmx5IGluIHRoaXMgYnJhbmNoIGlmIHdlIGRvbid0IGhhdmUgYSBhdHRyaWJ1dGUtbGlrZVxuICAgICAgICAvLyBwcmVjZWRpbmcgc2VxdWVuY2UuIEZvciBjb21tZW50cywgdGhpcyBndWFyZHMgYWdhaW5zdCB1bnVzdWFsXG4gICAgICAgIC8vIGF0dHJpYnV0ZSB2YWx1ZXMgbGlrZSA8ZGl2IGZvbz1cIjwhLS0keydiYXInfVwiPi4gQ2FzZXMgbGlrZVxuICAgICAgICAvLyA8IS0tIGZvbz0keydiYXInfS0tPiBhcmUgaGFuZGxlZCBjb3JyZWN0bHkgaW4gdGhlIGF0dHJpYnV0ZSBicmFuY2hcbiAgICAgICAgLy8gYmVsb3cuXG4gICAgICAgIGh0bWwgKz0gcyArIChpc0NvbW1lbnRCaW5kaW5nID8gY29tbWVudE1hcmtlciA6IG5vZGVNYXJrZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRm9yIGF0dHJpYnV0ZXMgd2UgdXNlIGp1c3QgYSBtYXJrZXIgc2VudGluZWwsIGFuZCBhbHNvIGFwcGVuZCBhXG4gICAgICAgIC8vICRsaXQkIHN1ZmZpeCB0byB0aGUgbmFtZSB0byBvcHQtb3V0IG9mIGF0dHJpYnV0ZS1zcGVjaWZpYyBwYXJzaW5nXG4gICAgICAgIC8vIHRoYXQgSUUgYW5kIEVkZ2UgZG8gZm9yIHN0eWxlIGFuZCBjZXJ0YWluIFNWRyBhdHRyaWJ1dGVzLlxuICAgICAgICBodG1sICs9IHMuc3Vic3RyKDAsIGF0dHJpYnV0ZU1hdGNoLmluZGV4KSArIGF0dHJpYnV0ZU1hdGNoWzFdICtcbiAgICAgICAgICAgIGF0dHJpYnV0ZU1hdGNoWzJdICsgYm91bmRBdHRyaWJ1dGVTdWZmaXggKyBhdHRyaWJ1dGVNYXRjaFszXSArXG4gICAgICAgICAgICBtYXJrZXI7XG4gICAgICB9XG4gICAgfVxuICAgIGh0bWwgKz0gdGhpcy5zdHJpbmdzW2xdO1xuICAgIHJldHVybiBodG1sO1xuICB9XG5cbiAgZ2V0VGVtcGxhdGVFbGVtZW50KCk6IEhUTUxUZW1wbGF0ZUVsZW1lbnQge1xuICAgIGNvbnN0IHRlbXBsYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSB0aGlzLmdldEhUTUwoKTtcbiAgICByZXR1cm4gdGVtcGxhdGU7XG4gIH1cbn1cblxuLyoqXG4gKiBBIFRlbXBsYXRlUmVzdWx0IGZvciBTVkcgZnJhZ21lbnRzLlxuICpcbiAqIFRoaXMgY2xhc3Mgd3JhcHMgSFRNTCBpbiBhbiBgPHN2Zz5gIHRhZyBpbiBvcmRlciB0byBwYXJzZSBpdHMgY29udGVudHMgaW4gdGhlXG4gKiBTVkcgbmFtZXNwYWNlLCB0aGVuIG1vZGlmaWVzIHRoZSB0ZW1wbGF0ZSB0byByZW1vdmUgdGhlIGA8c3ZnPmAgdGFnIHNvIHRoYXRcbiAqIGNsb25lcyBvbmx5IGNvbnRhaW5lciB0aGUgb3JpZ2luYWwgZnJhZ21lbnQuXG4gKi9cbmV4cG9ydCBjbGFzcyBTVkdUZW1wbGF0ZVJlc3VsdCBleHRlbmRzIFRlbXBsYXRlUmVzdWx0IHtcbiAgZ2V0SFRNTCgpOiBzdHJpbmcge1xuICAgIHJldHVybiBgPHN2Zz4ke3N1cGVyLmdldEhUTUwoKX08L3N2Zz5gO1xuICB9XG5cbiAgZ2V0VGVtcGxhdGVFbGVtZW50KCk6IEhUTUxUZW1wbGF0ZUVsZW1lbnQge1xuICAgIGNvbnN0IHRlbXBsYXRlID0gc3VwZXIuZ2V0VGVtcGxhdGVFbGVtZW50KCk7XG4gICAgY29uc3QgY29udGVudCA9IHRlbXBsYXRlLmNvbnRlbnQ7XG4gICAgY29uc3Qgc3ZnRWxlbWVudCA9IGNvbnRlbnQuZmlyc3RDaGlsZCE7XG4gICAgY29udGVudC5yZW1vdmVDaGlsZChzdmdFbGVtZW50KTtcbiAgICByZXBhcmVudE5vZGVzKGNvbnRlbnQsIHN2Z0VsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgcmV0dXJuIHRlbXBsYXRlO1xuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG5cbi8qKlxuICogQG1vZHVsZSBsaXQtaHRtbFxuICovXG5cbmltcG9ydCB7aXNEaXJlY3RpdmV9IGZyb20gJy4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7cmVtb3ZlTm9kZXN9IGZyb20gJy4vZG9tLmpzJztcbmltcG9ydCB7bm9DaGFuZ2UsIG5vdGhpbmcsIFBhcnR9IGZyb20gJy4vcGFydC5qcyc7XG5pbXBvcnQge1JlbmRlck9wdGlvbnN9IGZyb20gJy4vcmVuZGVyLW9wdGlvbnMuanMnO1xuaW1wb3J0IHtUZW1wbGF0ZUluc3RhbmNlfSBmcm9tICcuL3RlbXBsYXRlLWluc3RhbmNlLmpzJztcbmltcG9ydCB7VGVtcGxhdGVSZXN1bHR9IGZyb20gJy4vdGVtcGxhdGUtcmVzdWx0LmpzJztcbmltcG9ydCB7Y3JlYXRlTWFya2VyfSBmcm9tICcuL3RlbXBsYXRlLmpzJztcblxuLy8gaHR0cHM6Ly90YzM5LmdpdGh1Yi5pby9lY21hMjYyLyNzZWMtdHlwZW9mLW9wZXJhdG9yXG5leHBvcnQgdHlwZSBQcmltaXRpdmUgPSBudWxsfHVuZGVmaW5lZHxib29sZWFufG51bWJlcnxzdHJpbmd8c3ltYm9sfGJpZ2ludDtcbmV4cG9ydCBjb25zdCBpc1ByaW1pdGl2ZSA9ICh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFByaW1pdGl2ZSA9PiB7XG4gIHJldHVybiAoXG4gICAgICB2YWx1ZSA9PT0gbnVsbCB8fFxuICAgICAgISh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykpO1xufTtcbmV4cG9ydCBjb25zdCBpc0l0ZXJhYmxlID0gKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgSXRlcmFibGU8dW5rbm93bj4gPT4ge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHxcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICAhISh2YWx1ZSAmJiAodmFsdWUgYXMgYW55KVtTeW1ib2wuaXRlcmF0b3JdKTtcbn07XG5cbi8qKlxuICogV3JpdGVzIGF0dHJpYnV0ZSB2YWx1ZXMgdG8gdGhlIERPTSBmb3IgYSBncm91cCBvZiBBdHRyaWJ1dGVQYXJ0cyBib3VuZCB0byBhXG4gKiBzaW5nbGUgYXR0cmlidXRlLiBUaGUgdmFsdWUgaXMgb25seSBzZXQgb25jZSBldmVuIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBwYXJ0c1xuICogZm9yIGFuIGF0dHJpYnV0ZS5cbiAqL1xuZXhwb3J0IGNsYXNzIEF0dHJpYnV0ZUNvbW1pdHRlciB7XG4gIHJlYWRvbmx5IGVsZW1lbnQ6IEVsZW1lbnQ7XG4gIHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgc3RyaW5nczogUmVhZG9ubHlBcnJheTxzdHJpbmc+O1xuICByZWFkb25seSBwYXJ0czogUmVhZG9ubHlBcnJheTxBdHRyaWJ1dGVQYXJ0PjtcbiAgZGlydHkgPSB0cnVlO1xuXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQ6IEVsZW1lbnQsIG5hbWU6IHN0cmluZywgc3RyaW5nczogUmVhZG9ubHlBcnJheTxzdHJpbmc+KSB7XG4gICAgdGhpcy5lbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMuc3RyaW5ncyA9IHN0cmluZ3M7XG4gICAgdGhpcy5wYXJ0cyA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RyaW5ncy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICh0aGlzLnBhcnRzIGFzIEF0dHJpYnV0ZVBhcnRbXSlbaV0gPSB0aGlzLl9jcmVhdGVQYXJ0KCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBzaW5nbGUgcGFydC4gT3ZlcnJpZGUgdGhpcyB0byBjcmVhdGUgYSBkaWZmZXJudCB0eXBlIG9mIHBhcnQuXG4gICAqL1xuICBwcm90ZWN0ZWQgX2NyZWF0ZVBhcnQoKTogQXR0cmlidXRlUGFydCB7XG4gICAgcmV0dXJuIG5ldyBBdHRyaWJ1dGVQYXJ0KHRoaXMpO1xuICB9XG5cbiAgcHJvdGVjdGVkIF9nZXRWYWx1ZSgpOiB1bmtub3duIHtcbiAgICBjb25zdCBzdHJpbmdzID0gdGhpcy5zdHJpbmdzO1xuICAgIGNvbnN0IGwgPSBzdHJpbmdzLmxlbmd0aCAtIDE7XG4gICAgbGV0IHRleHQgPSAnJztcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICB0ZXh0ICs9IHN0cmluZ3NbaV07XG4gICAgICBjb25zdCBwYXJ0ID0gdGhpcy5wYXJ0c1tpXTtcbiAgICAgIGlmIChwYXJ0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3QgdiA9IHBhcnQudmFsdWU7XG4gICAgICAgIGlmIChpc1ByaW1pdGl2ZSh2KSB8fCAhaXNJdGVyYWJsZSh2KSkge1xuICAgICAgICAgIHRleHQgKz0gdHlwZW9mIHYgPT09ICdzdHJpbmcnID8gdiA6IFN0cmluZyh2KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IHQgb2Ygdikge1xuICAgICAgICAgICAgdGV4dCArPSB0eXBlb2YgdCA9PT0gJ3N0cmluZycgPyB0IDogU3RyaW5nKHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHRleHQgKz0gc3RyaW5nc1tsXTtcbiAgICByZXR1cm4gdGV4dDtcbiAgfVxuXG4gIGNvbW1pdCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5kaXJ0eSkge1xuICAgICAgdGhpcy5kaXJ0eSA9IGZhbHNlO1xuICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZSh0aGlzLm5hbWUsIHRoaXMuX2dldFZhbHVlKCkgYXMgc3RyaW5nKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBIFBhcnQgdGhhdCBjb250cm9scyBhbGwgb3IgcGFydCBvZiBhbiBhdHRyaWJ1dGUgdmFsdWUuXG4gKi9cbmV4cG9ydCBjbGFzcyBBdHRyaWJ1dGVQYXJ0IGltcGxlbWVudHMgUGFydCB7XG4gIHJlYWRvbmx5IGNvbW1pdHRlcjogQXR0cmlidXRlQ29tbWl0dGVyO1xuICB2YWx1ZTogdW5rbm93biA9IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3Rvcihjb21taXR0ZXI6IEF0dHJpYnV0ZUNvbW1pdHRlcikge1xuICAgIHRoaXMuY29tbWl0dGVyID0gY29tbWl0dGVyO1xuICB9XG5cbiAgc2V0VmFsdWUodmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICBpZiAodmFsdWUgIT09IG5vQ2hhbmdlICYmICghaXNQcmltaXRpdmUodmFsdWUpIHx8IHZhbHVlICE9PSB0aGlzLnZhbHVlKSkge1xuICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgICAgLy8gSWYgdGhlIHZhbHVlIGlzIGEgbm90IGEgZGlyZWN0aXZlLCBkaXJ0eSB0aGUgY29tbWl0dGVyIHNvIHRoYXQgaXQnbGxcbiAgICAgIC8vIGNhbGwgc2V0QXR0cmlidXRlLiBJZiB0aGUgdmFsdWUgaXMgYSBkaXJlY3RpdmUsIGl0J2xsIGRpcnR5IHRoZVxuICAgICAgLy8gY29tbWl0dGVyIGlmIGl0IGNhbGxzIHNldFZhbHVlKCkuXG4gICAgICBpZiAoIWlzRGlyZWN0aXZlKHZhbHVlKSkge1xuICAgICAgICB0aGlzLmNvbW1pdHRlci5kaXJ0eSA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29tbWl0KCkge1xuICAgIHdoaWxlIChpc0RpcmVjdGl2ZSh0aGlzLnZhbHVlKSkge1xuICAgICAgY29uc3QgZGlyZWN0aXZlID0gdGhpcy52YWx1ZTtcbiAgICAgIHRoaXMudmFsdWUgPSBub0NoYW5nZTtcbiAgICAgIGRpcmVjdGl2ZSh0aGlzKTtcbiAgICB9XG4gICAgaWYgKHRoaXMudmFsdWUgPT09IG5vQ2hhbmdlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuY29tbWl0dGVyLmNvbW1pdCgpO1xuICB9XG59XG5cbi8qKlxuICogQSBQYXJ0IHRoYXQgY29udHJvbHMgYSBsb2NhdGlvbiB3aXRoaW4gYSBOb2RlIHRyZWUuIExpa2UgYSBSYW5nZSwgTm9kZVBhcnRcbiAqIGhhcyBzdGFydCBhbmQgZW5kIGxvY2F0aW9ucyBhbmQgY2FuIHNldCBhbmQgdXBkYXRlIHRoZSBOb2RlcyBiZXR3ZWVuIHRob3NlXG4gKiBsb2NhdGlvbnMuXG4gKlxuICogTm9kZVBhcnRzIHN1cHBvcnQgc2V2ZXJhbCB2YWx1ZSB0eXBlczogcHJpbWl0aXZlcywgTm9kZXMsIFRlbXBsYXRlUmVzdWx0cyxcbiAqIGFzIHdlbGwgYXMgYXJyYXlzIGFuZCBpdGVyYWJsZXMgb2YgdGhvc2UgdHlwZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBOb2RlUGFydCBpbXBsZW1lbnRzIFBhcnQge1xuICByZWFkb25seSBvcHRpb25zOiBSZW5kZXJPcHRpb25zO1xuICBzdGFydE5vZGUhOiBOb2RlO1xuICBlbmROb2RlITogTm9kZTtcbiAgdmFsdWU6IHVua25vd24gPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX19wZW5kaW5nVmFsdWU6IHVua25vd24gPSB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3Iob3B0aW9uczogUmVuZGVyT3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gIH1cblxuICAvKipcbiAgICogQXBwZW5kcyB0aGlzIHBhcnQgaW50byBhIGNvbnRhaW5lci5cbiAgICpcbiAgICogVGhpcyBwYXJ0IG11c3QgYmUgZW1wdHksIGFzIGl0cyBjb250ZW50cyBhcmUgbm90IGF1dG9tYXRpY2FsbHkgbW92ZWQuXG4gICAqL1xuICBhcHBlbmRJbnRvKGNvbnRhaW5lcjogTm9kZSkge1xuICAgIHRoaXMuc3RhcnROb2RlID0gY29udGFpbmVyLmFwcGVuZENoaWxkKGNyZWF0ZU1hcmtlcigpKTtcbiAgICB0aGlzLmVuZE5vZGUgPSBjb250YWluZXIuYXBwZW5kQ2hpbGQoY3JlYXRlTWFya2VyKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluc2VydHMgdGhpcyBwYXJ0IGFmdGVyIHRoZSBgcmVmYCBub2RlIChiZXR3ZWVuIGByZWZgIGFuZCBgcmVmYCdzIG5leHRcbiAgICogc2libGluZykuIEJvdGggYHJlZmAgYW5kIGl0cyBuZXh0IHNpYmxpbmcgbXVzdCBiZSBzdGF0aWMsIHVuY2hhbmdpbmcgbm9kZXNcbiAgICogc3VjaCBhcyB0aG9zZSB0aGF0IGFwcGVhciBpbiBhIGxpdGVyYWwgc2VjdGlvbiBvZiBhIHRlbXBsYXRlLlxuICAgKlxuICAgKiBUaGlzIHBhcnQgbXVzdCBiZSBlbXB0eSwgYXMgaXRzIGNvbnRlbnRzIGFyZSBub3QgYXV0b21hdGljYWxseSBtb3ZlZC5cbiAgICovXG4gIGluc2VydEFmdGVyTm9kZShyZWY6IE5vZGUpIHtcbiAgICB0aGlzLnN0YXJ0Tm9kZSA9IHJlZjtcbiAgICB0aGlzLmVuZE5vZGUgPSByZWYubmV4dFNpYmxpbmchO1xuICB9XG5cbiAgLyoqXG4gICAqIEFwcGVuZHMgdGhpcyBwYXJ0IGludG8gYSBwYXJlbnQgcGFydC5cbiAgICpcbiAgICogVGhpcyBwYXJ0IG11c3QgYmUgZW1wdHksIGFzIGl0cyBjb250ZW50cyBhcmUgbm90IGF1dG9tYXRpY2FsbHkgbW92ZWQuXG4gICAqL1xuICBhcHBlbmRJbnRvUGFydChwYXJ0OiBOb2RlUGFydCkge1xuICAgIHBhcnQuX19pbnNlcnQodGhpcy5zdGFydE5vZGUgPSBjcmVhdGVNYXJrZXIoKSk7XG4gICAgcGFydC5fX2luc2VydCh0aGlzLmVuZE5vZGUgPSBjcmVhdGVNYXJrZXIoKSk7XG4gIH1cblxuICAvKipcbiAgICogSW5zZXJ0cyB0aGlzIHBhcnQgYWZ0ZXIgdGhlIGByZWZgIHBhcnQuXG4gICAqXG4gICAqIFRoaXMgcGFydCBtdXN0IGJlIGVtcHR5LCBhcyBpdHMgY29udGVudHMgYXJlIG5vdCBhdXRvbWF0aWNhbGx5IG1vdmVkLlxuICAgKi9cbiAgaW5zZXJ0QWZ0ZXJQYXJ0KHJlZjogTm9kZVBhcnQpIHtcbiAgICByZWYuX19pbnNlcnQodGhpcy5zdGFydE5vZGUgPSBjcmVhdGVNYXJrZXIoKSk7XG4gICAgdGhpcy5lbmROb2RlID0gcmVmLmVuZE5vZGU7XG4gICAgcmVmLmVuZE5vZGUgPSB0aGlzLnN0YXJ0Tm9kZTtcbiAgfVxuXG4gIHNldFZhbHVlKHZhbHVlOiB1bmtub3duKTogdm9pZCB7XG4gICAgdGhpcy5fX3BlbmRpbmdWYWx1ZSA9IHZhbHVlO1xuICB9XG5cbiAgY29tbWl0KCkge1xuICAgIGlmICh0aGlzLnN0YXJ0Tm9kZS5wYXJlbnROb2RlID09PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHdoaWxlIChpc0RpcmVjdGl2ZSh0aGlzLl9fcGVuZGluZ1ZhbHVlKSkge1xuICAgICAgY29uc3QgZGlyZWN0aXZlID0gdGhpcy5fX3BlbmRpbmdWYWx1ZTtcbiAgICAgIHRoaXMuX19wZW5kaW5nVmFsdWUgPSBub0NoYW5nZTtcbiAgICAgIGRpcmVjdGl2ZSh0aGlzKTtcbiAgICB9XG4gICAgY29uc3QgdmFsdWUgPSB0aGlzLl9fcGVuZGluZ1ZhbHVlO1xuICAgIGlmICh2YWx1ZSA9PT0gbm9DaGFuZ2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGlzUHJpbWl0aXZlKHZhbHVlKSkge1xuICAgICAgaWYgKHZhbHVlICE9PSB0aGlzLnZhbHVlKSB7XG4gICAgICAgIHRoaXMuX19jb21taXRUZXh0KHZhbHVlKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgVGVtcGxhdGVSZXN1bHQpIHtcbiAgICAgIHRoaXMuX19jb21taXRUZW1wbGF0ZVJlc3VsdCh2YWx1ZSk7XG4gICAgfSBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIE5vZGUpIHtcbiAgICAgIHRoaXMuX19jb21taXROb2RlKHZhbHVlKTtcbiAgICB9IGVsc2UgaWYgKGlzSXRlcmFibGUodmFsdWUpKSB7XG4gICAgICB0aGlzLl9fY29tbWl0SXRlcmFibGUodmFsdWUpO1xuICAgIH0gZWxzZSBpZiAodmFsdWUgPT09IG5vdGhpbmcpIHtcbiAgICAgIHRoaXMudmFsdWUgPSBub3RoaW5nO1xuICAgICAgdGhpcy5jbGVhcigpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGYWxsYmFjaywgd2lsbCByZW5kZXIgdGhlIHN0cmluZyByZXByZXNlbnRhdGlvblxuICAgICAgdGhpcy5fX2NvbW1pdFRleHQodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX19pbnNlcnQobm9kZTogTm9kZSkge1xuICAgIHRoaXMuZW5kTm9kZS5wYXJlbnROb2RlIS5pbnNlcnRCZWZvcmUobm9kZSwgdGhpcy5lbmROb2RlKTtcbiAgfVxuXG4gIHByaXZhdGUgX19jb21taXROb2RlKHZhbHVlOiBOb2RlKTogdm9pZCB7XG4gICAgaWYgKHRoaXMudmFsdWUgPT09IHZhbHVlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuY2xlYXIoKTtcbiAgICB0aGlzLl9faW5zZXJ0KHZhbHVlKTtcbiAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gIH1cblxuICBwcml2YXRlIF9fY29tbWl0VGV4dCh2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIGNvbnN0IG5vZGUgPSB0aGlzLnN0YXJ0Tm9kZS5uZXh0U2libGluZyE7XG4gICAgdmFsdWUgPSB2YWx1ZSA9PSBudWxsID8gJycgOiB2YWx1ZTtcbiAgICAvLyBJZiBgdmFsdWVgIGlzbid0IGFscmVhZHkgYSBzdHJpbmcsIHdlIGV4cGxpY2l0bHkgY29udmVydCBpdCBoZXJlIGluIGNhc2VcbiAgICAvLyBpdCBjYW4ndCBiZSBpbXBsaWNpdGx5IGNvbnZlcnRlZCAtIGkuZS4gaXQncyBhIHN5bWJvbC5cbiAgICBjb25zdCB2YWx1ZUFzU3RyaW5nOiBzdHJpbmcgPVxuICAgICAgICB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gdmFsdWUgOiBTdHJpbmcodmFsdWUpO1xuICAgIGlmIChub2RlID09PSB0aGlzLmVuZE5vZGUucHJldmlvdXNTaWJsaW5nICYmXG4gICAgICAgIG5vZGUubm9kZVR5cGUgPT09IDMgLyogTm9kZS5URVhUX05PREUgKi8pIHtcbiAgICAgIC8vIElmIHdlIG9ubHkgaGF2ZSBhIHNpbmdsZSB0ZXh0IG5vZGUgYmV0d2VlbiB0aGUgbWFya2Vycywgd2UgY2FuIGp1c3RcbiAgICAgIC8vIHNldCBpdHMgdmFsdWUsIHJhdGhlciB0aGFuIHJlcGxhY2luZyBpdC5cbiAgICAgIC8vIFRPRE8oanVzdGluZmFnbmFuaSk6IENhbiB3ZSBqdXN0IGNoZWNrIGlmIHRoaXMudmFsdWUgaXMgcHJpbWl0aXZlP1xuICAgICAgKG5vZGUgYXMgVGV4dCkuZGF0YSA9IHZhbHVlQXNTdHJpbmc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX19jb21taXROb2RlKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHZhbHVlQXNTdHJpbmcpKTtcbiAgICB9XG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICB9XG5cbiAgcHJpdmF0ZSBfX2NvbW1pdFRlbXBsYXRlUmVzdWx0KHZhbHVlOiBUZW1wbGF0ZVJlc3VsdCk6IHZvaWQge1xuICAgIGNvbnN0IHRlbXBsYXRlID0gdGhpcy5vcHRpb25zLnRlbXBsYXRlRmFjdG9yeSh2YWx1ZSk7XG4gICAgaWYgKHRoaXMudmFsdWUgaW5zdGFuY2VvZiBUZW1wbGF0ZUluc3RhbmNlICYmXG4gICAgICAgIHRoaXMudmFsdWUudGVtcGxhdGUgPT09IHRlbXBsYXRlKSB7XG4gICAgICB0aGlzLnZhbHVlLnVwZGF0ZSh2YWx1ZS52YWx1ZXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBNYWtlIHN1cmUgd2UgcHJvcGFnYXRlIHRoZSB0ZW1wbGF0ZSBwcm9jZXNzb3IgZnJvbSB0aGUgVGVtcGxhdGVSZXN1bHRcbiAgICAgIC8vIHNvIHRoYXQgd2UgdXNlIGl0cyBzeW50YXggZXh0ZW5zaW9uLCBldGMuIFRoZSB0ZW1wbGF0ZSBmYWN0b3J5IGNvbWVzXG4gICAgICAvLyBmcm9tIHRoZSByZW5kZXIgZnVuY3Rpb24gb3B0aW9ucyBzbyB0aGF0IGl0IGNhbiBjb250cm9sIHRlbXBsYXRlXG4gICAgICAvLyBjYWNoaW5nIGFuZCBwcmVwcm9jZXNzaW5nLlxuICAgICAgY29uc3QgaW5zdGFuY2UgPVxuICAgICAgICAgIG5ldyBUZW1wbGF0ZUluc3RhbmNlKHRlbXBsYXRlLCB2YWx1ZS5wcm9jZXNzb3IsIHRoaXMub3B0aW9ucyk7XG4gICAgICBjb25zdCBmcmFnbWVudCA9IGluc3RhbmNlLl9jbG9uZSgpO1xuICAgICAgaW5zdGFuY2UudXBkYXRlKHZhbHVlLnZhbHVlcyk7XG4gICAgICB0aGlzLl9fY29tbWl0Tm9kZShmcmFnbWVudCk7XG4gICAgICB0aGlzLnZhbHVlID0gaW5zdGFuY2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfX2NvbW1pdEl0ZXJhYmxlKHZhbHVlOiBJdGVyYWJsZTx1bmtub3duPik6IHZvaWQge1xuICAgIC8vIEZvciBhbiBJdGVyYWJsZSwgd2UgY3JlYXRlIGEgbmV3IEluc3RhbmNlUGFydCBwZXIgaXRlbSwgdGhlbiBzZXQgaXRzXG4gICAgLy8gdmFsdWUgdG8gdGhlIGl0ZW0uIFRoaXMgaXMgYSBsaXR0bGUgYml0IG9mIG92ZXJoZWFkIGZvciBldmVyeSBpdGVtIGluXG4gICAgLy8gYW4gSXRlcmFibGUsIGJ1dCBpdCBsZXRzIHVzIHJlY3Vyc2UgZWFzaWx5IGFuZCBlZmZpY2llbnRseSB1cGRhdGUgQXJyYXlzXG4gICAgLy8gb2YgVGVtcGxhdGVSZXN1bHRzIHRoYXQgd2lsbCBiZSBjb21tb25seSByZXR1cm5lZCBmcm9tIGV4cHJlc3Npb25zIGxpa2U6XG4gICAgLy8gYXJyYXkubWFwKChpKSA9PiBodG1sYCR7aX1gKSwgYnkgcmV1c2luZyBleGlzdGluZyBUZW1wbGF0ZUluc3RhbmNlcy5cblxuICAgIC8vIElmIF92YWx1ZSBpcyBhbiBhcnJheSwgdGhlbiB0aGUgcHJldmlvdXMgcmVuZGVyIHdhcyBvZiBhblxuICAgIC8vIGl0ZXJhYmxlIGFuZCBfdmFsdWUgd2lsbCBjb250YWluIHRoZSBOb2RlUGFydHMgZnJvbSB0aGUgcHJldmlvdXNcbiAgICAvLyByZW5kZXIuIElmIF92YWx1ZSBpcyBub3QgYW4gYXJyYXksIGNsZWFyIHRoaXMgcGFydCBhbmQgbWFrZSBhIG5ld1xuICAgIC8vIGFycmF5IGZvciBOb2RlUGFydHMuXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHRoaXMudmFsdWUpKSB7XG4gICAgICB0aGlzLnZhbHVlID0gW107XG4gICAgICB0aGlzLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgLy8gTGV0cyB1cyBrZWVwIHRyYWNrIG9mIGhvdyBtYW55IGl0ZW1zIHdlIHN0YW1wZWQgc28gd2UgY2FuIGNsZWFyIGxlZnRvdmVyXG4gICAgLy8gaXRlbXMgZnJvbSBhIHByZXZpb3VzIHJlbmRlclxuICAgIGNvbnN0IGl0ZW1QYXJ0cyA9IHRoaXMudmFsdWUgYXMgTm9kZVBhcnRbXTtcbiAgICBsZXQgcGFydEluZGV4ID0gMDtcbiAgICBsZXQgaXRlbVBhcnQ6IE5vZGVQYXJ0fHVuZGVmaW5lZDtcblxuICAgIGZvciAoY29uc3QgaXRlbSBvZiB2YWx1ZSkge1xuICAgICAgLy8gVHJ5IHRvIHJldXNlIGFuIGV4aXN0aW5nIHBhcnRcbiAgICAgIGl0ZW1QYXJ0ID0gaXRlbVBhcnRzW3BhcnRJbmRleF07XG5cbiAgICAgIC8vIElmIG5vIGV4aXN0aW5nIHBhcnQsIGNyZWF0ZSBhIG5ldyBvbmVcbiAgICAgIGlmIChpdGVtUGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGl0ZW1QYXJ0ID0gbmV3IE5vZGVQYXJ0KHRoaXMub3B0aW9ucyk7XG4gICAgICAgIGl0ZW1QYXJ0cy5wdXNoKGl0ZW1QYXJ0KTtcbiAgICAgICAgaWYgKHBhcnRJbmRleCA9PT0gMCkge1xuICAgICAgICAgIGl0ZW1QYXJ0LmFwcGVuZEludG9QYXJ0KHRoaXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZW1QYXJ0Lmluc2VydEFmdGVyUGFydChpdGVtUGFydHNbcGFydEluZGV4IC0gMV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpdGVtUGFydC5zZXRWYWx1ZShpdGVtKTtcbiAgICAgIGl0ZW1QYXJ0LmNvbW1pdCgpO1xuICAgICAgcGFydEluZGV4Kys7XG4gICAgfVxuXG4gICAgaWYgKHBhcnRJbmRleCA8IGl0ZW1QYXJ0cy5sZW5ndGgpIHtcbiAgICAgIC8vIFRydW5jYXRlIHRoZSBwYXJ0cyBhcnJheSBzbyBfdmFsdWUgcmVmbGVjdHMgdGhlIGN1cnJlbnQgc3RhdGVcbiAgICAgIGl0ZW1QYXJ0cy5sZW5ndGggPSBwYXJ0SW5kZXg7XG4gICAgICB0aGlzLmNsZWFyKGl0ZW1QYXJ0ICYmIGl0ZW1QYXJ0LmVuZE5vZGUpO1xuICAgIH1cbiAgfVxuXG4gIGNsZWFyKHN0YXJ0Tm9kZTogTm9kZSA9IHRoaXMuc3RhcnROb2RlKSB7XG4gICAgcmVtb3ZlTm9kZXMoXG4gICAgICAgIHRoaXMuc3RhcnROb2RlLnBhcmVudE5vZGUhLCBzdGFydE5vZGUubmV4dFNpYmxpbmchLCB0aGlzLmVuZE5vZGUpO1xuICB9XG59XG5cbi8qKlxuICogSW1wbGVtZW50cyBhIGJvb2xlYW4gYXR0cmlidXRlLCByb3VnaGx5IGFzIGRlZmluZWQgaW4gdGhlIEhUTUxcbiAqIHNwZWNpZmljYXRpb24uXG4gKlxuICogSWYgdGhlIHZhbHVlIGlzIHRydXRoeSwgdGhlbiB0aGUgYXR0cmlidXRlIGlzIHByZXNlbnQgd2l0aCBhIHZhbHVlIG9mXG4gKiAnJy4gSWYgdGhlIHZhbHVlIGlzIGZhbHNleSwgdGhlIGF0dHJpYnV0ZSBpcyByZW1vdmVkLlxuICovXG5leHBvcnQgY2xhc3MgQm9vbGVhbkF0dHJpYnV0ZVBhcnQgaW1wbGVtZW50cyBQYXJ0IHtcbiAgcmVhZG9ubHkgZWxlbWVudDogRWxlbWVudDtcbiAgcmVhZG9ubHkgbmFtZTogc3RyaW5nO1xuICByZWFkb25seSBzdHJpbmdzOiByZWFkb25seSBzdHJpbmdbXTtcbiAgdmFsdWU6IHVua25vd24gPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX19wZW5kaW5nVmFsdWU6IHVua25vd24gPSB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IoZWxlbWVudDogRWxlbWVudCwgbmFtZTogc3RyaW5nLCBzdHJpbmdzOiByZWFkb25seSBzdHJpbmdbXSkge1xuICAgIGlmIChzdHJpbmdzLmxlbmd0aCAhPT0gMiB8fCBzdHJpbmdzWzBdICE9PSAnJyB8fCBzdHJpbmdzWzFdICE9PSAnJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdCb29sZWFuIGF0dHJpYnV0ZXMgY2FuIG9ubHkgY29udGFpbiBhIHNpbmdsZSBleHByZXNzaW9uJyk7XG4gICAgfVxuICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLnN0cmluZ3MgPSBzdHJpbmdzO1xuICB9XG5cbiAgc2V0VmFsdWUodmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICB0aGlzLl9fcGVuZGluZ1ZhbHVlID0gdmFsdWU7XG4gIH1cblxuICBjb21taXQoKSB7XG4gICAgd2hpbGUgKGlzRGlyZWN0aXZlKHRoaXMuX19wZW5kaW5nVmFsdWUpKSB7XG4gICAgICBjb25zdCBkaXJlY3RpdmUgPSB0aGlzLl9fcGVuZGluZ1ZhbHVlO1xuICAgICAgdGhpcy5fX3BlbmRpbmdWYWx1ZSA9IG5vQ2hhbmdlO1xuICAgICAgZGlyZWN0aXZlKHRoaXMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5fX3BlbmRpbmdWYWx1ZSA9PT0gbm9DaGFuZ2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdmFsdWUgPSAhIXRoaXMuX19wZW5kaW5nVmFsdWU7XG4gICAgaWYgKHRoaXMudmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZSh0aGlzLm5hbWUsICcnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUodGhpcy5uYW1lKTtcbiAgICAgIH1cbiAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICB9XG4gICAgdGhpcy5fX3BlbmRpbmdWYWx1ZSA9IG5vQ2hhbmdlO1xuICB9XG59XG5cbi8qKlxuICogU2V0cyBhdHRyaWJ1dGUgdmFsdWVzIGZvciBQcm9wZXJ0eVBhcnRzLCBzbyB0aGF0IHRoZSB2YWx1ZSBpcyBvbmx5IHNldCBvbmNlXG4gKiBldmVuIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBwYXJ0cyBmb3IgYSBwcm9wZXJ0eS5cbiAqXG4gKiBJZiBhbiBleHByZXNzaW9uIGNvbnRyb2xzIHRoZSB3aG9sZSBwcm9wZXJ0eSB2YWx1ZSwgdGhlbiB0aGUgdmFsdWUgaXMgc2ltcGx5XG4gKiBhc3NpZ25lZCB0byB0aGUgcHJvcGVydHkgdW5kZXIgY29udHJvbC4gSWYgdGhlcmUgYXJlIHN0cmluZyBsaXRlcmFscyBvclxuICogbXVsdGlwbGUgZXhwcmVzc2lvbnMsIHRoZW4gdGhlIHN0cmluZ3MgYXJlIGV4cHJlc3Npb25zIGFyZSBpbnRlcnBvbGF0ZWQgaW50b1xuICogYSBzdHJpbmcgZmlyc3QuXG4gKi9cbmV4cG9ydCBjbGFzcyBQcm9wZXJ0eUNvbW1pdHRlciBleHRlbmRzIEF0dHJpYnV0ZUNvbW1pdHRlciB7XG4gIHJlYWRvbmx5IHNpbmdsZTogYm9vbGVhbjtcblxuICBjb25zdHJ1Y3RvcihlbGVtZW50OiBFbGVtZW50LCBuYW1lOiBzdHJpbmcsIHN0cmluZ3M6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPikge1xuICAgIHN1cGVyKGVsZW1lbnQsIG5hbWUsIHN0cmluZ3MpO1xuICAgIHRoaXMuc2luZ2xlID1cbiAgICAgICAgKHN0cmluZ3MubGVuZ3RoID09PSAyICYmIHN0cmluZ3NbMF0gPT09ICcnICYmIHN0cmluZ3NbMV0gPT09ICcnKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBfY3JlYXRlUGFydCgpOiBQcm9wZXJ0eVBhcnQge1xuICAgIHJldHVybiBuZXcgUHJvcGVydHlQYXJ0KHRoaXMpO1xuICB9XG5cbiAgcHJvdGVjdGVkIF9nZXRWYWx1ZSgpIHtcbiAgICBpZiAodGhpcy5zaW5nbGUpIHtcbiAgICAgIHJldHVybiB0aGlzLnBhcnRzWzBdLnZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gc3VwZXIuX2dldFZhbHVlKCk7XG4gIH1cblxuICBjb21taXQoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZGlydHkpIHtcbiAgICAgIHRoaXMuZGlydHkgPSBmYWxzZTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICAodGhpcy5lbGVtZW50IGFzIGFueSlbdGhpcy5uYW1lXSA9IHRoaXMuX2dldFZhbHVlKCk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBQcm9wZXJ0eVBhcnQgZXh0ZW5kcyBBdHRyaWJ1dGVQYXJ0IHt9XG5cbi8vIERldGVjdCBldmVudCBsaXN0ZW5lciBvcHRpb25zIHN1cHBvcnQuIElmIHRoZSBgY2FwdHVyZWAgcHJvcGVydHkgaXMgcmVhZFxuLy8gZnJvbSB0aGUgb3B0aW9ucyBvYmplY3QsIHRoZW4gb3B0aW9ucyBhcmUgc3VwcG9ydGVkLiBJZiBub3QsIHRoZW4gdGhlIHRoaXJkXG4vLyBhcmd1bWVudCB0byBhZGQvcmVtb3ZlRXZlbnRMaXN0ZW5lciBpcyBpbnRlcnByZXRlZCBhcyB0aGUgYm9vbGVhbiBjYXB0dXJlXG4vLyB2YWx1ZSBzbyB3ZSBzaG91bGQgb25seSBwYXNzIHRoZSBgY2FwdHVyZWAgcHJvcGVydHkuXG5sZXQgZXZlbnRPcHRpb25zU3VwcG9ydGVkID0gZmFsc2U7XG5cbi8vIFdyYXAgaW50byBhbiBJSUZFIGJlY2F1c2UgTVMgRWRnZSA8PSB2NDEgZG9lcyBub3Qgc3VwcG9ydCBoYXZpbmcgdHJ5L2NhdGNoXG4vLyBibG9ja3MgcmlnaHQgaW50byB0aGUgYm9keSBvZiBhIG1vZHVsZVxuKCgpID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgZ2V0IGNhcHR1cmUoKSB7XG4gICAgICAgIGV2ZW50T3B0aW9uc1N1cHBvcnRlZCA9IHRydWU7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9O1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Rlc3QnLCBvcHRpb25zIGFzIGFueSwgb3B0aW9ucyk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGVzdCcsIG9wdGlvbnMgYXMgYW55LCBvcHRpb25zKTtcbiAgfSBjYXRjaCAoX2UpIHtcbiAgICAvLyBldmVudCBvcHRpb25zIG5vdCBzdXBwb3J0ZWRcbiAgfVxufSkoKTtcblxudHlwZSBFdmVudEhhbmRsZXJXaXRoT3B0aW9ucyA9XG4gICAgRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCZQYXJ0aWFsPEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zPjtcbmV4cG9ydCBjbGFzcyBFdmVudFBhcnQgaW1wbGVtZW50cyBQYXJ0IHtcbiAgcmVhZG9ubHkgZWxlbWVudDogRWxlbWVudDtcbiAgcmVhZG9ubHkgZXZlbnROYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGV2ZW50Q29udGV4dD86IEV2ZW50VGFyZ2V0O1xuICB2YWx1ZTogdW5kZWZpbmVkfEV2ZW50SGFuZGxlcldpdGhPcHRpb25zID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIF9fb3B0aW9ucz86IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zO1xuICBwcml2YXRlIF9fcGVuZGluZ1ZhbHVlOiB1bmRlZmluZWR8RXZlbnRIYW5kbGVyV2l0aE9wdGlvbnMgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgcmVhZG9ubHkgX19ib3VuZEhhbmRsZUV2ZW50OiAoZXZlbnQ6IEV2ZW50KSA9PiB2b2lkO1xuXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQ6IEVsZW1lbnQsIGV2ZW50TmFtZTogc3RyaW5nLCBldmVudENvbnRleHQ/OiBFdmVudFRhcmdldCkge1xuICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5ldmVudE5hbWUgPSBldmVudE5hbWU7XG4gICAgdGhpcy5ldmVudENvbnRleHQgPSBldmVudENvbnRleHQ7XG4gICAgdGhpcy5fX2JvdW5kSGFuZGxlRXZlbnQgPSAoZSkgPT4gdGhpcy5oYW5kbGVFdmVudChlKTtcbiAgfVxuXG4gIHNldFZhbHVlKHZhbHVlOiB1bmRlZmluZWR8RXZlbnRIYW5kbGVyV2l0aE9wdGlvbnMpOiB2b2lkIHtcbiAgICB0aGlzLl9fcGVuZGluZ1ZhbHVlID0gdmFsdWU7XG4gIH1cblxuICBjb21taXQoKSB7XG4gICAgd2hpbGUgKGlzRGlyZWN0aXZlKHRoaXMuX19wZW5kaW5nVmFsdWUpKSB7XG4gICAgICBjb25zdCBkaXJlY3RpdmUgPSB0aGlzLl9fcGVuZGluZ1ZhbHVlO1xuICAgICAgdGhpcy5fX3BlbmRpbmdWYWx1ZSA9IG5vQ2hhbmdlIGFzIEV2ZW50SGFuZGxlcldpdGhPcHRpb25zO1xuICAgICAgZGlyZWN0aXZlKHRoaXMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5fX3BlbmRpbmdWYWx1ZSA9PT0gbm9DaGFuZ2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBuZXdMaXN0ZW5lciA9IHRoaXMuX19wZW5kaW5nVmFsdWU7XG4gICAgY29uc3Qgb2xkTGlzdGVuZXIgPSB0aGlzLnZhbHVlO1xuICAgIGNvbnN0IHNob3VsZFJlbW92ZUxpc3RlbmVyID0gbmV3TGlzdGVuZXIgPT0gbnVsbCB8fFxuICAgICAgICBvbGRMaXN0ZW5lciAhPSBudWxsICYmXG4gICAgICAgICAgICAobmV3TGlzdGVuZXIuY2FwdHVyZSAhPT0gb2xkTGlzdGVuZXIuY2FwdHVyZSB8fFxuICAgICAgICAgICAgIG5ld0xpc3RlbmVyLm9uY2UgIT09IG9sZExpc3RlbmVyLm9uY2UgfHxcbiAgICAgICAgICAgICBuZXdMaXN0ZW5lci5wYXNzaXZlICE9PSBvbGRMaXN0ZW5lci5wYXNzaXZlKTtcbiAgICBjb25zdCBzaG91bGRBZGRMaXN0ZW5lciA9XG4gICAgICAgIG5ld0xpc3RlbmVyICE9IG51bGwgJiYgKG9sZExpc3RlbmVyID09IG51bGwgfHwgc2hvdWxkUmVtb3ZlTGlzdGVuZXIpO1xuXG4gICAgaWYgKHNob3VsZFJlbW92ZUxpc3RlbmVyKSB7XG4gICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcbiAgICAgICAgICB0aGlzLmV2ZW50TmFtZSwgdGhpcy5fX2JvdW5kSGFuZGxlRXZlbnQsIHRoaXMuX19vcHRpb25zKTtcbiAgICB9XG4gICAgaWYgKHNob3VsZEFkZExpc3RlbmVyKSB7XG4gICAgICB0aGlzLl9fb3B0aW9ucyA9IGdldE9wdGlvbnMobmV3TGlzdGVuZXIpO1xuICAgICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAgICAgdGhpcy5ldmVudE5hbWUsIHRoaXMuX19ib3VuZEhhbmRsZUV2ZW50LCB0aGlzLl9fb3B0aW9ucyk7XG4gICAgfVxuICAgIHRoaXMudmFsdWUgPSBuZXdMaXN0ZW5lcjtcbiAgICB0aGlzLl9fcGVuZGluZ1ZhbHVlID0gbm9DaGFuZ2UgYXMgRXZlbnRIYW5kbGVyV2l0aE9wdGlvbnM7XG4gIH1cblxuICBoYW5kbGVFdmVudChldmVudDogRXZlbnQpIHtcbiAgICBpZiAodHlwZW9mIHRoaXMudmFsdWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMudmFsdWUuY2FsbCh0aGlzLmV2ZW50Q29udGV4dCB8fCB0aGlzLmVsZW1lbnQsIGV2ZW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgKHRoaXMudmFsdWUgYXMgRXZlbnRMaXN0ZW5lck9iamVjdCkuaGFuZGxlRXZlbnQoZXZlbnQpO1xuICAgIH1cbiAgfVxufVxuXG4vLyBXZSBjb3B5IG9wdGlvbnMgYmVjYXVzZSBvZiB0aGUgaW5jb25zaXN0ZW50IGJlaGF2aW9yIG9mIGJyb3dzZXJzIHdoZW4gcmVhZGluZ1xuLy8gdGhlIHRoaXJkIGFyZ3VtZW50IG9mIGFkZC9yZW1vdmVFdmVudExpc3RlbmVyLiBJRTExIGRvZXNuJ3Qgc3VwcG9ydCBvcHRpb25zXG4vLyBhdCBhbGwuIENocm9tZSA0MSBvbmx5IHJlYWRzIGBjYXB0dXJlYCBpZiB0aGUgYXJndW1lbnQgaXMgYW4gb2JqZWN0LlxuY29uc3QgZ2V0T3B0aW9ucyA9IChvOiBBZGRFdmVudExpc3RlbmVyT3B0aW9uc3x1bmRlZmluZWQpID0+IG8gJiZcbiAgICAoZXZlbnRPcHRpb25zU3VwcG9ydGVkID9cbiAgICAgICAgIHtjYXB0dXJlOiBvLmNhcHR1cmUsIHBhc3NpdmU6IG8ucGFzc2l2ZSwgb25jZTogby5vbmNlfSA6XG4gICAgICAgICBvLmNhcHR1cmUgYXMgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMpO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuXG4vKipcbiAqIEBtb2R1bGUgbGl0LWh0bWxcbiAqL1xuXG5pbXBvcnQge1BhcnR9IGZyb20gJy4vcGFydC5qcyc7XG5pbXBvcnQge0F0dHJpYnV0ZUNvbW1pdHRlciwgQm9vbGVhbkF0dHJpYnV0ZVBhcnQsIEV2ZW50UGFydCwgTm9kZVBhcnQsIFByb3BlcnR5Q29tbWl0dGVyfSBmcm9tICcuL3BhcnRzLmpzJztcbmltcG9ydCB7UmVuZGVyT3B0aW9uc30gZnJvbSAnLi9yZW5kZXItb3B0aW9ucy5qcyc7XG5pbXBvcnQge1RlbXBsYXRlUHJvY2Vzc29yfSBmcm9tICcuL3RlbXBsYXRlLXByb2Nlc3Nvci5qcyc7XG5cbi8qKlxuICogQ3JlYXRlcyBQYXJ0cyB3aGVuIGEgdGVtcGxhdGUgaXMgaW5zdGFudGlhdGVkLlxuICovXG5leHBvcnQgY2xhc3MgRGVmYXVsdFRlbXBsYXRlUHJvY2Vzc29yIGltcGxlbWVudHMgVGVtcGxhdGVQcm9jZXNzb3Ige1xuICAvKipcbiAgICogQ3JlYXRlIHBhcnRzIGZvciBhbiBhdHRyaWJ1dGUtcG9zaXRpb24gYmluZGluZywgZ2l2ZW4gdGhlIGV2ZW50LCBhdHRyaWJ1dGVcbiAgICogbmFtZSwgYW5kIHN0cmluZyBsaXRlcmFscy5cbiAgICpcbiAgICogQHBhcmFtIGVsZW1lbnQgVGhlIGVsZW1lbnQgY29udGFpbmluZyB0aGUgYmluZGluZ1xuICAgKiBAcGFyYW0gbmFtZSAgVGhlIGF0dHJpYnV0ZSBuYW1lXG4gICAqIEBwYXJhbSBzdHJpbmdzIFRoZSBzdHJpbmcgbGl0ZXJhbHMuIFRoZXJlIGFyZSBhbHdheXMgYXQgbGVhc3QgdHdvIHN0cmluZ3MsXG4gICAqICAgZXZlbnQgZm9yIGZ1bGx5LWNvbnRyb2xsZWQgYmluZGluZ3Mgd2l0aCBhIHNpbmdsZSBleHByZXNzaW9uLlxuICAgKi9cbiAgaGFuZGxlQXR0cmlidXRlRXhwcmVzc2lvbnMoXG4gICAgICBlbGVtZW50OiBFbGVtZW50LCBuYW1lOiBzdHJpbmcsIHN0cmluZ3M6IHN0cmluZ1tdLFxuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucyk6IFJlYWRvbmx5QXJyYXk8UGFydD4ge1xuICAgIGNvbnN0IHByZWZpeCA9IG5hbWVbMF07XG4gICAgaWYgKHByZWZpeCA9PT0gJy4nKSB7XG4gICAgICBjb25zdCBjb21taXR0ZXIgPSBuZXcgUHJvcGVydHlDb21taXR0ZXIoZWxlbWVudCwgbmFtZS5zbGljZSgxKSwgc3RyaW5ncyk7XG4gICAgICByZXR1cm4gY29tbWl0dGVyLnBhcnRzO1xuICAgIH1cbiAgICBpZiAocHJlZml4ID09PSAnQCcpIHtcbiAgICAgIHJldHVybiBbbmV3IEV2ZW50UGFydChlbGVtZW50LCBuYW1lLnNsaWNlKDEpLCBvcHRpb25zLmV2ZW50Q29udGV4dCldO1xuICAgIH1cbiAgICBpZiAocHJlZml4ID09PSAnPycpIHtcbiAgICAgIHJldHVybiBbbmV3IEJvb2xlYW5BdHRyaWJ1dGVQYXJ0KGVsZW1lbnQsIG5hbWUuc2xpY2UoMSksIHN0cmluZ3MpXTtcbiAgICB9XG4gICAgY29uc3QgY29tbWl0dGVyID0gbmV3IEF0dHJpYnV0ZUNvbW1pdHRlcihlbGVtZW50LCBuYW1lLCBzdHJpbmdzKTtcbiAgICByZXR1cm4gY29tbWl0dGVyLnBhcnRzO1xuICB9XG4gIC8qKlxuICAgKiBDcmVhdGUgcGFydHMgZm9yIGEgdGV4dC1wb3NpdGlvbiBiaW5kaW5nLlxuICAgKiBAcGFyYW0gdGVtcGxhdGVGYWN0b3J5XG4gICAqL1xuICBoYW5kbGVUZXh0RXhwcmVzc2lvbihvcHRpb25zOiBSZW5kZXJPcHRpb25zKSB7XG4gICAgcmV0dXJuIG5ldyBOb2RlUGFydChvcHRpb25zKTtcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgZGVmYXVsdFRlbXBsYXRlUHJvY2Vzc29yID0gbmV3IERlZmF1bHRUZW1wbGF0ZVByb2Nlc3NvcigpO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuXG4vKipcbiAqIEBtb2R1bGUgbGl0LWh0bWxcbiAqL1xuXG5pbXBvcnQge1RlbXBsYXRlUmVzdWx0fSBmcm9tICcuL3RlbXBsYXRlLXJlc3VsdC5qcyc7XG5pbXBvcnQge21hcmtlciwgVGVtcGxhdGV9IGZyb20gJy4vdGVtcGxhdGUuanMnO1xuXG4vKipcbiAqIEEgZnVuY3Rpb24gdHlwZSB0aGF0IGNyZWF0ZXMgYSBUZW1wbGF0ZSBmcm9tIGEgVGVtcGxhdGVSZXN1bHQuXG4gKlxuICogVGhpcyBpcyBhIGhvb2sgaW50byB0aGUgdGVtcGxhdGUtY3JlYXRpb24gcHJvY2VzcyBmb3IgcmVuZGVyaW5nIHRoYXRcbiAqIHJlcXVpcmVzIHNvbWUgbW9kaWZpY2F0aW9uIG9mIHRlbXBsYXRlcyBiZWZvcmUgdGhleSdyZSB1c2VkLCBsaWtlIFNoYWR5Q1NTLFxuICogd2hpY2ggbXVzdCBhZGQgY2xhc3NlcyB0byBlbGVtZW50cyBhbmQgcmVtb3ZlIHN0eWxlcy5cbiAqXG4gKiBUZW1wbGF0ZXMgc2hvdWxkIGJlIGNhY2hlZCBhcyBhZ2dyZXNzaXZlbHkgYXMgcG9zc2libGUsIHNvIHRoYXQgbWFueVxuICogVGVtcGxhdGVSZXN1bHRzIHByb2R1Y2VkIGZyb20gdGhlIHNhbWUgZXhwcmVzc2lvbiBvbmx5IGRvIHRoZSB3b3JrIG9mXG4gKiBjcmVhdGluZyB0aGUgVGVtcGxhdGUgdGhlIGZpcnN0IHRpbWUuXG4gKlxuICogVGVtcGxhdGVzIGFyZSB1c3VhbGx5IGNhY2hlZCBieSBUZW1wbGF0ZVJlc3VsdC5zdHJpbmdzIGFuZFxuICogVGVtcGxhdGVSZXN1bHQudHlwZSwgYnV0IG1heSBiZSBjYWNoZWQgYnkgb3RoZXIga2V5cyBpZiB0aGlzIGZ1bmN0aW9uXG4gKiBtb2RpZmllcyB0aGUgdGVtcGxhdGUuXG4gKlxuICogTm90ZSB0aGF0IGN1cnJlbnRseSBUZW1wbGF0ZUZhY3RvcmllcyBtdXN0IG5vdCBhZGQsIHJlbW92ZSwgb3IgcmVvcmRlclxuICogZXhwcmVzc2lvbnMsIGJlY2F1c2UgdGhlcmUgaXMgbm8gd2F5IHRvIGRlc2NyaWJlIHN1Y2ggYSBtb2RpZmljYXRpb25cbiAqIHRvIHJlbmRlcigpIHNvIHRoYXQgdmFsdWVzIGFyZSBpbnRlcnBvbGF0ZWQgdG8gdGhlIGNvcnJlY3QgcGxhY2UgaW4gdGhlXG4gKiB0ZW1wbGF0ZSBpbnN0YW5jZXMuXG4gKi9cbmV4cG9ydCB0eXBlIFRlbXBsYXRlRmFjdG9yeSA9IChyZXN1bHQ6IFRlbXBsYXRlUmVzdWx0KSA9PiBUZW1wbGF0ZTtcblxuLyoqXG4gKiBUaGUgZGVmYXVsdCBUZW1wbGF0ZUZhY3Rvcnkgd2hpY2ggY2FjaGVzIFRlbXBsYXRlcyBrZXllZCBvblxuICogcmVzdWx0LnR5cGUgYW5kIHJlc3VsdC5zdHJpbmdzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdGVtcGxhdGVGYWN0b3J5KHJlc3VsdDogVGVtcGxhdGVSZXN1bHQpIHtcbiAgbGV0IHRlbXBsYXRlQ2FjaGUgPSB0ZW1wbGF0ZUNhY2hlcy5nZXQocmVzdWx0LnR5cGUpO1xuICBpZiAodGVtcGxhdGVDYWNoZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGVtcGxhdGVDYWNoZSA9IHtcbiAgICAgIHN0cmluZ3NBcnJheTogbmV3IFdlYWtNYXA8VGVtcGxhdGVTdHJpbmdzQXJyYXksIFRlbXBsYXRlPigpLFxuICAgICAga2V5U3RyaW5nOiBuZXcgTWFwPHN0cmluZywgVGVtcGxhdGU+KClcbiAgICB9O1xuICAgIHRlbXBsYXRlQ2FjaGVzLnNldChyZXN1bHQudHlwZSwgdGVtcGxhdGVDYWNoZSk7XG4gIH1cblxuICBsZXQgdGVtcGxhdGUgPSB0ZW1wbGF0ZUNhY2hlLnN0cmluZ3NBcnJheS5nZXQocmVzdWx0LnN0cmluZ3MpO1xuICBpZiAodGVtcGxhdGUgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgfVxuXG4gIC8vIElmIHRoZSBUZW1wbGF0ZVN0cmluZ3NBcnJheSBpcyBuZXcsIGdlbmVyYXRlIGEga2V5IGZyb20gdGhlIHN0cmluZ3NcbiAgLy8gVGhpcyBrZXkgaXMgc2hhcmVkIGJldHdlZW4gYWxsIHRlbXBsYXRlcyB3aXRoIGlkZW50aWNhbCBjb250ZW50XG4gIGNvbnN0IGtleSA9IHJlc3VsdC5zdHJpbmdzLmpvaW4obWFya2VyKTtcblxuICAvLyBDaGVjayBpZiB3ZSBhbHJlYWR5IGhhdmUgYSBUZW1wbGF0ZSBmb3IgdGhpcyBrZXlcbiAgdGVtcGxhdGUgPSB0ZW1wbGF0ZUNhY2hlLmtleVN0cmluZy5nZXQoa2V5KTtcbiAgaWYgKHRlbXBsYXRlID09PSB1bmRlZmluZWQpIHtcbiAgICAvLyBJZiB3ZSBoYXZlIG5vdCBzZWVuIHRoaXMga2V5IGJlZm9yZSwgY3JlYXRlIGEgbmV3IFRlbXBsYXRlXG4gICAgdGVtcGxhdGUgPSBuZXcgVGVtcGxhdGUocmVzdWx0LCByZXN1bHQuZ2V0VGVtcGxhdGVFbGVtZW50KCkpO1xuICAgIC8vIENhY2hlIHRoZSBUZW1wbGF0ZSBmb3IgdGhpcyBrZXlcbiAgICB0ZW1wbGF0ZUNhY2hlLmtleVN0cmluZy5zZXQoa2V5LCB0ZW1wbGF0ZSk7XG4gIH1cblxuICAvLyBDYWNoZSBhbGwgZnV0dXJlIHF1ZXJpZXMgZm9yIHRoaXMgVGVtcGxhdGVTdHJpbmdzQXJyYXlcbiAgdGVtcGxhdGVDYWNoZS5zdHJpbmdzQXJyYXkuc2V0KHJlc3VsdC5zdHJpbmdzLCB0ZW1wbGF0ZSk7XG4gIHJldHVybiB0ZW1wbGF0ZTtcbn1cblxuLyoqXG4gKiBUaGUgZmlyc3QgYXJndW1lbnQgdG8gSlMgdGVtcGxhdGUgdGFncyByZXRhaW4gaWRlbnRpdHkgYWNyb3NzIG11bHRpcGxlXG4gKiBjYWxscyB0byBhIHRhZyBmb3IgdGhlIHNhbWUgbGl0ZXJhbCwgc28gd2UgY2FuIGNhY2hlIHdvcmsgZG9uZSBwZXIgbGl0ZXJhbFxuICogaW4gYSBNYXAuXG4gKlxuICogU2FmYXJpIGN1cnJlbnRseSBoYXMgYSBidWcgd2hpY2ggb2NjYXNpb25hbGx5IGJyZWFrcyB0aGlzIGJlaGF2aW9yLCBzbyB3ZVxuICogbmVlZCB0byBjYWNoZSB0aGUgVGVtcGxhdGUgYXQgdHdvIGxldmVscy4gV2UgZmlyc3QgY2FjaGUgdGhlXG4gKiBUZW1wbGF0ZVN0cmluZ3NBcnJheSwgYW5kIGlmIHRoYXQgZmFpbHMsIHdlIGNhY2hlIGEga2V5IGNvbnN0cnVjdGVkIGJ5XG4gKiBqb2luaW5nIHRoZSBzdHJpbmdzIGFycmF5LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlQ2FjaGUge1xuICByZWFkb25seSBzdHJpbmdzQXJyYXk6IFdlYWtNYXA8VGVtcGxhdGVTdHJpbmdzQXJyYXksIFRlbXBsYXRlPjtcbiAgcmVhZG9ubHkga2V5U3RyaW5nOiBNYXA8c3RyaW5nLCBUZW1wbGF0ZT47XG59XG5cbmV4cG9ydCBjb25zdCB0ZW1wbGF0ZUNhY2hlcyA9IG5ldyBNYXA8c3RyaW5nLCBUZW1wbGF0ZUNhY2hlPigpO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuXG4vKipcbiAqIEBtb2R1bGUgbGl0LWh0bWxcbiAqL1xuXG5pbXBvcnQge3JlbW92ZU5vZGVzfSBmcm9tICcuL2RvbS5qcyc7XG5pbXBvcnQge05vZGVQYXJ0fSBmcm9tICcuL3BhcnRzLmpzJztcbmltcG9ydCB7UmVuZGVyT3B0aW9uc30gZnJvbSAnLi9yZW5kZXItb3B0aW9ucy5qcyc7XG5pbXBvcnQge3RlbXBsYXRlRmFjdG9yeX0gZnJvbSAnLi90ZW1wbGF0ZS1mYWN0b3J5LmpzJztcblxuZXhwb3J0IGNvbnN0IHBhcnRzID0gbmV3IFdlYWtNYXA8Tm9kZSwgTm9kZVBhcnQ+KCk7XG5cbi8qKlxuICogUmVuZGVycyBhIHRlbXBsYXRlIHJlc3VsdCBvciBvdGhlciB2YWx1ZSB0byBhIGNvbnRhaW5lci5cbiAqXG4gKiBUbyB1cGRhdGUgYSBjb250YWluZXIgd2l0aCBuZXcgdmFsdWVzLCByZWV2YWx1YXRlIHRoZSB0ZW1wbGF0ZSBsaXRlcmFsIGFuZFxuICogY2FsbCBgcmVuZGVyYCB3aXRoIHRoZSBuZXcgcmVzdWx0LlxuICpcbiAqIEBwYXJhbSByZXN1bHQgQW55IHZhbHVlIHJlbmRlcmFibGUgYnkgTm9kZVBhcnQgLSB0eXBpY2FsbHkgYSBUZW1wbGF0ZVJlc3VsdFxuICogICAgIGNyZWF0ZWQgYnkgZXZhbHVhdGluZyBhIHRlbXBsYXRlIHRhZyBsaWtlIGBodG1sYCBvciBgc3ZnYC5cbiAqIEBwYXJhbSBjb250YWluZXIgQSBET00gcGFyZW50IHRvIHJlbmRlciB0by4gVGhlIGVudGlyZSBjb250ZW50cyBhcmUgZWl0aGVyXG4gKiAgICAgcmVwbGFjZWQsIG9yIGVmZmljaWVudGx5IHVwZGF0ZWQgaWYgdGhlIHNhbWUgcmVzdWx0IHR5cGUgd2FzIHByZXZpb3VzXG4gKiAgICAgcmVuZGVyZWQgdGhlcmUuXG4gKiBAcGFyYW0gb3B0aW9ucyBSZW5kZXJPcHRpb25zIGZvciB0aGUgZW50aXJlIHJlbmRlciB0cmVlIHJlbmRlcmVkIHRvIHRoaXNcbiAqICAgICBjb250YWluZXIuIFJlbmRlciBvcHRpb25zIG11c3QgKm5vdCogY2hhbmdlIGJldHdlZW4gcmVuZGVycyB0byB0aGUgc2FtZVxuICogICAgIGNvbnRhaW5lciwgYXMgdGhvc2UgY2hhbmdlcyB3aWxsIG5vdCBlZmZlY3QgcHJldmlvdXNseSByZW5kZXJlZCBET00uXG4gKi9cbmV4cG9ydCBjb25zdCByZW5kZXIgPVxuICAgIChyZXN1bHQ6IHVua25vd24sXG4gICAgIGNvbnRhaW5lcjogRWxlbWVudHxEb2N1bWVudEZyYWdtZW50LFxuICAgICBvcHRpb25zPzogUGFydGlhbDxSZW5kZXJPcHRpb25zPikgPT4ge1xuICAgICAgbGV0IHBhcnQgPSBwYXJ0cy5nZXQoY29udGFpbmVyKTtcbiAgICAgIGlmIChwYXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVtb3ZlTm9kZXMoY29udGFpbmVyLCBjb250YWluZXIuZmlyc3RDaGlsZCk7XG4gICAgICAgIHBhcnRzLnNldChjb250YWluZXIsIHBhcnQgPSBuZXcgTm9kZVBhcnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlRmFjdG9yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgIHBhcnQuYXBwZW5kSW50byhjb250YWluZXIpO1xuICAgICAgfVxuICAgICAgcGFydC5zZXRWYWx1ZShyZXN1bHQpO1xuICAgICAgcGFydC5jb21taXQoKTtcbiAgICB9O1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuXG4vKipcbiAqXG4gKiBNYWluIGxpdC1odG1sIG1vZHVsZS5cbiAqXG4gKiBNYWluIGV4cG9ydHM6XG4gKlxuICogLSAgW1todG1sXV1cbiAqIC0gIFtbc3ZnXV1cbiAqIC0gIFtbcmVuZGVyXV1cbiAqXG4gKiBAbW9kdWxlIGxpdC1odG1sXG4gKiBAcHJlZmVycmVkXG4gKi9cblxuLyoqXG4gKiBEbyBub3QgcmVtb3ZlIHRoaXMgY29tbWVudDsgaXQga2VlcHMgdHlwZWRvYyBmcm9tIG1pc3BsYWNpbmcgdGhlIG1vZHVsZVxuICogZG9jcy5cbiAqL1xuaW1wb3J0IHtkZWZhdWx0VGVtcGxhdGVQcm9jZXNzb3J9IGZyb20gJy4vbGliL2RlZmF1bHQtdGVtcGxhdGUtcHJvY2Vzc29yLmpzJztcbmltcG9ydCB7U1ZHVGVtcGxhdGVSZXN1bHQsIFRlbXBsYXRlUmVzdWx0fSBmcm9tICcuL2xpYi90ZW1wbGF0ZS1yZXN1bHQuanMnO1xuXG5leHBvcnQge0RlZmF1bHRUZW1wbGF0ZVByb2Nlc3NvciwgZGVmYXVsdFRlbXBsYXRlUHJvY2Vzc29yfSBmcm9tICcuL2xpYi9kZWZhdWx0LXRlbXBsYXRlLXByb2Nlc3Nvci5qcyc7XG5leHBvcnQge2RpcmVjdGl2ZSwgRGlyZWN0aXZlRm4sIGlzRGlyZWN0aXZlfSBmcm9tICcuL2xpYi9kaXJlY3RpdmUuanMnO1xuLy8gVE9ETyhqdXN0aW5mYWduYW5pKTogcmVtb3ZlIGxpbmUgd2hlbiB3ZSBnZXQgTm9kZVBhcnQgbW92aW5nIG1ldGhvZHNcbmV4cG9ydCB7cmVtb3ZlTm9kZXMsIHJlcGFyZW50Tm9kZXN9IGZyb20gJy4vbGliL2RvbS5qcyc7XG5leHBvcnQge25vQ2hhbmdlLCBub3RoaW5nLCBQYXJ0fSBmcm9tICcuL2xpYi9wYXJ0LmpzJztcbmV4cG9ydCB7QXR0cmlidXRlQ29tbWl0dGVyLCBBdHRyaWJ1dGVQYXJ0LCBCb29sZWFuQXR0cmlidXRlUGFydCwgRXZlbnRQYXJ0LCBpc0l0ZXJhYmxlLCBpc1ByaW1pdGl2ZSwgTm9kZVBhcnQsIFByb3BlcnR5Q29tbWl0dGVyLCBQcm9wZXJ0eVBhcnR9IGZyb20gJy4vbGliL3BhcnRzLmpzJztcbmV4cG9ydCB7UmVuZGVyT3B0aW9uc30gZnJvbSAnLi9saWIvcmVuZGVyLW9wdGlvbnMuanMnO1xuZXhwb3J0IHtwYXJ0cywgcmVuZGVyfSBmcm9tICcuL2xpYi9yZW5kZXIuanMnO1xuZXhwb3J0IHt0ZW1wbGF0ZUNhY2hlcywgdGVtcGxhdGVGYWN0b3J5fSBmcm9tICcuL2xpYi90ZW1wbGF0ZS1mYWN0b3J5LmpzJztcbmV4cG9ydCB7VGVtcGxhdGVJbnN0YW5jZX0gZnJvbSAnLi9saWIvdGVtcGxhdGUtaW5zdGFuY2UuanMnO1xuZXhwb3J0IHtUZW1wbGF0ZVByb2Nlc3Nvcn0gZnJvbSAnLi9saWIvdGVtcGxhdGUtcHJvY2Vzc29yLmpzJztcbmV4cG9ydCB7U1ZHVGVtcGxhdGVSZXN1bHQsIFRlbXBsYXRlUmVzdWx0fSBmcm9tICcuL2xpYi90ZW1wbGF0ZS1yZXN1bHQuanMnO1xuZXhwb3J0IHtjcmVhdGVNYXJrZXIsIGlzVGVtcGxhdGVQYXJ0QWN0aXZlLCBUZW1wbGF0ZX0gZnJvbSAnLi9saWIvdGVtcGxhdGUuanMnO1xuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIGludGVyZmFjZSBXaW5kb3cge1xuICAgIGxpdEh0bWxWZXJzaW9uczogc3RyaW5nW107XG4gIH1cbn1cblxuLy8gSU1QT1JUQU5UOiBkbyBub3QgY2hhbmdlIHRoZSBwcm9wZXJ0eSBuYW1lIG9yIHRoZSBhc3NpZ25tZW50IGV4cHJlc3Npb24uXG4vLyBUaGlzIGxpbmUgd2lsbCBiZSB1c2VkIGluIHJlZ2V4ZXMgdG8gc2VhcmNoIGZvciBsaXQtaHRtbCB1c2FnZS5cbi8vIFRPRE8oanVzdGluZmFnbmFuaSk6IGluamVjdCB2ZXJzaW9uIG51bWJlciBhdCBidWlsZCB0aW1lXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgKHdpbmRvd1snbGl0SHRtbFZlcnNpb25zJ10gfHwgKHdpbmRvd1snbGl0SHRtbFZlcnNpb25zJ10gPSBbXSkpLnB1c2goJzEuMi4wJyk7XG59XG5cbi8qKlxuICogSW50ZXJwcmV0cyBhIHRlbXBsYXRlIGxpdGVyYWwgYXMgYW4gSFRNTCB0ZW1wbGF0ZSB0aGF0IGNhbiBlZmZpY2llbnRseVxuICogcmVuZGVyIHRvIGFuZCB1cGRhdGUgYSBjb250YWluZXIuXG4gKi9cbmV4cG9ydCBjb25zdCBodG1sID0gKHN0cmluZ3M6IFRlbXBsYXRlU3RyaW5nc0FycmF5LCAuLi52YWx1ZXM6IHVua25vd25bXSkgPT5cbiAgICBuZXcgVGVtcGxhdGVSZXN1bHQoc3RyaW5ncywgdmFsdWVzLCAnaHRtbCcsIGRlZmF1bHRUZW1wbGF0ZVByb2Nlc3Nvcik7XG5cbi8qKlxuICogSW50ZXJwcmV0cyBhIHRlbXBsYXRlIGxpdGVyYWwgYXMgYW4gU1ZHIHRlbXBsYXRlIHRoYXQgY2FuIGVmZmljaWVudGx5XG4gKiByZW5kZXIgdG8gYW5kIHVwZGF0ZSBhIGNvbnRhaW5lci5cbiAqL1xuZXhwb3J0IGNvbnN0IHN2ZyA9IChzdHJpbmdzOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSwgLi4udmFsdWVzOiB1bmtub3duW10pID0+XG4gICAgbmV3IFNWR1RlbXBsYXRlUmVzdWx0KHN0cmluZ3MsIHZhbHVlcywgJ3N2ZycsIGRlZmF1bHRUZW1wbGF0ZVByb2Nlc3Nvcik7XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG5cbmltcG9ydCB7Y3JlYXRlTWFya2VyLCBkaXJlY3RpdmUsIE5vZGVQYXJ0LCBQYXJ0fSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCByZW5kZXJzIHRoZSBpdGVtcyBvZiBhbiBhc3luYyBpdGVyYWJsZVsxXSwgYXBwZW5kaW5nIG5ld1xuICogdmFsdWVzIGFmdGVyIHByZXZpb3VzIHZhbHVlcywgc2ltaWxhciB0byB0aGUgYnVpbHQtaW4gc3VwcG9ydCBmb3IgaXRlcmFibGVzLlxuICpcbiAqIEFzeW5jIGl0ZXJhYmxlcyBhcmUgb2JqZWN0cyB3aXRoIGEgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSBtZXRob2QsIHdoaWNoXG4gKiByZXR1cm5zIGFuIGl0ZXJhdG9yIHdobydzIGBuZXh0KClgIG1ldGhvZCByZXR1cm5zIGEgUHJvbWlzZS4gV2hlbiBhIG5ld1xuICogdmFsdWUgaXMgYXZhaWxhYmxlLCB0aGUgUHJvbWlzZSByZXNvbHZlcyBhbmQgdGhlIHZhbHVlIGlzIGFwcGVuZGVkIHRvIHRoZVxuICogUGFydCBjb250cm9sbGVkIGJ5IHRoZSBkaXJlY3RpdmUuIElmIGFub3RoZXIgdmFsdWUgb3RoZXIgdGhhbiB0aGlzXG4gKiBkaXJlY3RpdmUgaGFzIGJlZW4gc2V0IG9uIHRoZSBQYXJ0LCB0aGUgaXRlcmFibGUgd2lsbCBubyBsb25nZXIgYmUgbGlzdGVuZWRcbiAqIHRvIGFuZCBuZXcgdmFsdWVzIHdvbid0IGJlIHdyaXR0ZW4gdG8gdGhlIFBhcnQuXG4gKlxuICogWzFdOiBodHRwczovL2dpdGh1Yi5jb20vdGMzOS9wcm9wb3NhbC1hc3luYy1pdGVyYXRpb25cbiAqXG4gKiBAcGFyYW0gdmFsdWUgQW4gYXN5bmMgaXRlcmFibGVcbiAqIEBwYXJhbSBtYXBwZXIgQW4gb3B0aW9uYWwgZnVuY3Rpb24gdGhhdCBtYXBzIGZyb20gKHZhbHVlLCBpbmRleCkgdG8gYW5vdGhlclxuICogICAgIHZhbHVlLiBVc2VmdWwgZm9yIGdlbmVyYXRpbmcgdGVtcGxhdGVzIGZvciBlYWNoIGl0ZW0gaW4gdGhlIGl0ZXJhYmxlLlxuICovXG5leHBvcnQgY29uc3QgYXN5bmNBcHBlbmQgPSBkaXJlY3RpdmUoXG4gICAgPFQ+KHZhbHVlOiBBc3luY0l0ZXJhYmxlPFQ+LFxuICAgICAgICBtYXBwZXI/OiAodjogVCwgaW5kZXg/OiBudW1iZXIpID0+IHVua25vd24pID0+IGFzeW5jIChwYXJ0OiBQYXJ0KSA9PiB7XG4gICAgICBpZiAoIShwYXJ0IGluc3RhbmNlb2YgTm9kZVBhcnQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYXN5bmNBcHBlbmQgY2FuIG9ubHkgYmUgdXNlZCBpbiB0ZXh0IGJpbmRpbmdzJyk7XG4gICAgICB9XG4gICAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IHNldCB1cCB0aGlzIHBhcnRpY3VsYXIgaXRlcmFibGUsIHdlIGRvbid0IG5lZWRcbiAgICAgIC8vIHRvIGRvIGFueXRoaW5nLlxuICAgICAgaWYgKHZhbHVlID09PSBwYXJ0LnZhbHVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHBhcnQudmFsdWUgPSB2YWx1ZTtcblxuICAgICAgLy8gV2Uga2VlcCB0cmFjayBvZiBpdGVtIFBhcnRzIGFjcm9zcyBpdGVyYXRpb25zLCBzbyB0aGF0IHdlIGNhblxuICAgICAgLy8gc2hhcmUgbWFya2VyIG5vZGVzIGJldHdlZW4gY29uc2VjdXRpdmUgUGFydHMuXG4gICAgICBsZXQgaXRlbVBhcnQ7XG4gICAgICBsZXQgaSA9IDA7XG5cbiAgICAgIGZvciBhd2FpdCAobGV0IHYgb2YgdmFsdWUpIHtcbiAgICAgICAgLy8gQ2hlY2sgdG8gbWFrZSBzdXJlIHRoYXQgdmFsdWUgaXMgdGhlIHN0aWxsIHRoZSBjdXJyZW50IHZhbHVlIG9mXG4gICAgICAgIC8vIHRoZSBwYXJ0LCBhbmQgaWYgbm90IGJhaWwgYmVjYXVzZSBhIG5ldyB2YWx1ZSBvd25zIHRoaXMgcGFydFxuICAgICAgICBpZiAocGFydC52YWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdoZW4gd2UgZ2V0IHRoZSBmaXJzdCB2YWx1ZSwgY2xlYXIgdGhlIHBhcnQuIFRoaXMgbGV0cyB0aGVcbiAgICAgICAgLy8gcHJldmlvdXMgdmFsdWUgZGlzcGxheSB1bnRpbCB3ZSBjYW4gcmVwbGFjZSBpdC5cbiAgICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICBwYXJ0LmNsZWFyKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBcyBhIGNvbnZlbmllbmNlLCBiZWNhdXNlIGZ1bmN0aW9uYWwtcHJvZ3JhbW1pbmctc3R5bGVcbiAgICAgICAgLy8gdHJhbnNmb3JtcyBvZiBpdGVyYWJsZXMgYW5kIGFzeW5jIGl0ZXJhYmxlcyByZXF1aXJlcyBhIGxpYnJhcnksXG4gICAgICAgIC8vIHdlIGFjY2VwdCBhIG1hcHBlciBmdW5jdGlvbi4gVGhpcyBpcyBlc3BlY2lhbGx5IGNvbnZlbmllbnQgZm9yXG4gICAgICAgIC8vIHJlbmRlcmluZyBhIHRlbXBsYXRlIGZvciBlYWNoIGl0ZW0uXG4gICAgICAgIGlmIChtYXBwZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIFRoaXMgaXMgc2FmZSBiZWNhdXNlIFQgbXVzdCBvdGhlcndpc2UgYmUgdHJlYXRlZCBhcyB1bmtub3duIGJ5XG4gICAgICAgICAgLy8gdGhlIHJlc3Qgb2YgdGhlIHN5c3RlbS5cbiAgICAgICAgICB2ID0gbWFwcGVyKHYsIGkpIGFzIFQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBMaWtlIHdpdGggc3luYyBpdGVyYWJsZXMsIGVhY2ggaXRlbSBpbmR1Y2VzIGEgUGFydCwgc28gd2UgbmVlZFxuICAgICAgICAvLyB0byBrZWVwIHRyYWNrIG9mIHN0YXJ0IGFuZCBlbmQgbm9kZXMgZm9yIHRoZSBQYXJ0LlxuICAgICAgICAvLyBOb3RlOiBCZWNhdXNlIHRoZXNlIFBhcnRzIGFyZSBub3QgdXBkYXRhYmxlIGxpa2Ugd2l0aCBhIHN5bmNcbiAgICAgICAgLy8gaXRlcmFibGUgKGlmIHdlIHJlbmRlciBhIG5ldyB2YWx1ZSwgd2UgYWx3YXlzIGNsZWFyKSwgaXQgbWF5XG4gICAgICAgIC8vIGJlIHBvc3NpYmxlIHRvIG9wdGltaXplIGF3YXkgdGhlIFBhcnRzIGFuZCBqdXN0IHJlLXVzZSB0aGVcbiAgICAgICAgLy8gUGFydC5zZXRWYWx1ZSgpIGxvZ2ljLlxuXG4gICAgICAgIGxldCBpdGVtU3RhcnROb2RlID0gcGFydC5zdGFydE5vZGU7XG5cbiAgICAgICAgLy8gQ2hlY2sgdG8gc2VlIGlmIHdlIGhhdmUgYSBwcmV2aW91cyBpdGVtIGFuZCBQYXJ0XG4gICAgICAgIGlmIChpdGVtUGFydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gQ3JlYXRlIGEgbmV3IG5vZGUgdG8gc2VwYXJhdGUgdGhlIHByZXZpb3VzIGFuZCBuZXh0IFBhcnRzXG4gICAgICAgICAgaXRlbVN0YXJ0Tm9kZSA9IGNyZWF0ZU1hcmtlcigpO1xuICAgICAgICAgIC8vIGl0ZW1QYXJ0IGlzIGN1cnJlbnRseSB0aGUgUGFydCBmb3IgdGhlIHByZXZpb3VzIGl0ZW0uIFNldFxuICAgICAgICAgIC8vIGl0J3MgZW5kTm9kZSB0byB0aGUgbm9kZSB3ZSdsbCB1c2UgZm9yIHRoZSBuZXh0IFBhcnQnc1xuICAgICAgICAgIC8vIHN0YXJ0Tm9kZS5cbiAgICAgICAgICBpdGVtUGFydC5lbmROb2RlID0gaXRlbVN0YXJ0Tm9kZTtcbiAgICAgICAgICBwYXJ0LmVuZE5vZGUucGFyZW50Tm9kZSEuaW5zZXJ0QmVmb3JlKGl0ZW1TdGFydE5vZGUsIHBhcnQuZW5kTm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgaXRlbVBhcnQgPSBuZXcgTm9kZVBhcnQocGFydC5vcHRpb25zKTtcbiAgICAgICAgaXRlbVBhcnQuaW5zZXJ0QWZ0ZXJOb2RlKGl0ZW1TdGFydE5vZGUpO1xuICAgICAgICBpdGVtUGFydC5zZXRWYWx1ZSh2KTtcbiAgICAgICAgaXRlbVBhcnQuY29tbWl0KCk7XG4gICAgICAgIGkrKztcbiAgICAgIH1cbiAgICB9KTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cblxuaW1wb3J0IHtkaXJlY3RpdmUsIE5vZGVQYXJ0LCBQYXJ0fSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCByZW5kZXJzIHRoZSBpdGVtcyBvZiBhbiBhc3luYyBpdGVyYWJsZVsxXSwgcmVwbGFjaW5nXG4gKiBwcmV2aW91cyB2YWx1ZXMgd2l0aCBuZXcgdmFsdWVzLCBzbyB0aGF0IG9ubHkgb25lIHZhbHVlIGlzIGV2ZXIgcmVuZGVyZWRcbiAqIGF0IGEgdGltZS5cbiAqXG4gKiBBc3luYyBpdGVyYWJsZXMgYXJlIG9iamVjdHMgd2l0aCBhIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gbWV0aG9kLCB3aGljaFxuICogcmV0dXJucyBhbiBpdGVyYXRvciB3aG8ncyBgbmV4dCgpYCBtZXRob2QgcmV0dXJucyBhIFByb21pc2UuIFdoZW4gYSBuZXdcbiAqIHZhbHVlIGlzIGF2YWlsYWJsZSwgdGhlIFByb21pc2UgcmVzb2x2ZXMgYW5kIHRoZSB2YWx1ZSBpcyByZW5kZXJlZCB0byB0aGVcbiAqIFBhcnQgY29udHJvbGxlZCBieSB0aGUgZGlyZWN0aXZlLiBJZiBhbm90aGVyIHZhbHVlIG90aGVyIHRoYW4gdGhpc1xuICogZGlyZWN0aXZlIGhhcyBiZWVuIHNldCBvbiB0aGUgUGFydCwgdGhlIGl0ZXJhYmxlIHdpbGwgbm8gbG9uZ2VyIGJlIGxpc3RlbmVkXG4gKiB0byBhbmQgbmV3IHZhbHVlcyB3b24ndCBiZSB3cml0dGVuIHRvIHRoZSBQYXJ0LlxuICpcbiAqIFsxXTogaHR0cHM6Ly9naXRodWIuY29tL3RjMzkvcHJvcG9zYWwtYXN5bmMtaXRlcmF0aW9uXG4gKlxuICogQHBhcmFtIHZhbHVlIEFuIGFzeW5jIGl0ZXJhYmxlXG4gKiBAcGFyYW0gbWFwcGVyIEFuIG9wdGlvbmFsIGZ1bmN0aW9uIHRoYXQgbWFwcyBmcm9tICh2YWx1ZSwgaW5kZXgpIHRvIGFub3RoZXJcbiAqICAgICB2YWx1ZS4gVXNlZnVsIGZvciBnZW5lcmF0aW5nIHRlbXBsYXRlcyBmb3IgZWFjaCBpdGVtIGluIHRoZSBpdGVyYWJsZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGFzeW5jUmVwbGFjZSA9IGRpcmVjdGl2ZShcbiAgICA8VD4odmFsdWU6IEFzeW5jSXRlcmFibGU8VD4sIG1hcHBlcj86ICh2OiBULCBpbmRleD86IG51bWJlcikgPT4gdW5rbm93bikgPT5cbiAgICAgICAgYXN5bmMgKHBhcnQ6IFBhcnQpID0+IHtcbiAgICAgICAgICBpZiAoIShwYXJ0IGluc3RhbmNlb2YgTm9kZVBhcnQpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FzeW5jUmVwbGFjZSBjYW4gb25seSBiZSB1c2VkIGluIHRleHQgYmluZGluZ3MnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gSWYgd2UndmUgYWxyZWFkeSBzZXQgdXAgdGhpcyBwYXJ0aWN1bGFyIGl0ZXJhYmxlLCB3ZSBkb24ndCBuZWVkXG4gICAgICAgICAgLy8gdG8gZG8gYW55dGhpbmcuXG4gICAgICAgICAgaWYgKHZhbHVlID09PSBwYXJ0LnZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gV2UgbmVzdCBhIG5ldyBwYXJ0IHRvIGtlZXAgdHJhY2sgb2YgcHJldmlvdXMgaXRlbSB2YWx1ZXMgc2VwYXJhdGVseVxuICAgICAgICAgIC8vIG9mIHRoZSBpdGVyYWJsZSBhcyBhIHZhbHVlIGl0c2VsZi5cbiAgICAgICAgICBjb25zdCBpdGVtUGFydCA9IG5ldyBOb2RlUGFydChwYXJ0Lm9wdGlvbnMpO1xuICAgICAgICAgIHBhcnQudmFsdWUgPSB2YWx1ZTtcblxuICAgICAgICAgIGxldCBpID0gMDtcblxuICAgICAgICAgIGZvciBhd2FpdCAobGV0IHYgb2YgdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIHRvIG1ha2Ugc3VyZSB0aGF0IHZhbHVlIGlzIHRoZSBzdGlsbCB0aGUgY3VycmVudCB2YWx1ZSBvZlxuICAgICAgICAgICAgLy8gdGhlIHBhcnQsIGFuZCBpZiBub3QgYmFpbCBiZWNhdXNlIGEgbmV3IHZhbHVlIG93bnMgdGhpcyBwYXJ0XG4gICAgICAgICAgICBpZiAocGFydC52YWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFdoZW4gd2UgZ2V0IHRoZSBmaXJzdCB2YWx1ZSwgY2xlYXIgdGhlIHBhcnQuIFRoaXMgbGV0J3MgdGhlXG4gICAgICAgICAgICAvLyBwcmV2aW91cyB2YWx1ZSBkaXNwbGF5IHVudGlsIHdlIGNhbiByZXBsYWNlIGl0LlxuICAgICAgICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICAgICAgcGFydC5jbGVhcigpO1xuICAgICAgICAgICAgICBpdGVtUGFydC5hcHBlbmRJbnRvUGFydChwYXJ0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQXMgYSBjb252ZW5pZW5jZSwgYmVjYXVzZSBmdW5jdGlvbmFsLXByb2dyYW1taW5nLXN0eWxlXG4gICAgICAgICAgICAvLyB0cmFuc2Zvcm1zIG9mIGl0ZXJhYmxlcyBhbmQgYXN5bmMgaXRlcmFibGVzIHJlcXVpcmVzIGEgbGlicmFyeSxcbiAgICAgICAgICAgIC8vIHdlIGFjY2VwdCBhIG1hcHBlciBmdW5jdGlvbi4gVGhpcyBpcyBlc3BlY2lhbGx5IGNvbnZlbmllbnQgZm9yXG4gICAgICAgICAgICAvLyByZW5kZXJpbmcgYSB0ZW1wbGF0ZSBmb3IgZWFjaCBpdGVtLlxuICAgICAgICAgICAgaWYgKG1hcHBlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIC8vIFRoaXMgaXMgc2FmZSBiZWNhdXNlIFQgbXVzdCBvdGhlcndpc2UgYmUgdHJlYXRlZCBhcyB1bmtub3duIGJ5XG4gICAgICAgICAgICAgIC8vIHRoZSByZXN0IG9mIHRoZSBzeXN0ZW0uXG4gICAgICAgICAgICAgIHYgPSBtYXBwZXIodiwgaSkgYXMgVDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaXRlbVBhcnQuc2V0VmFsdWUodik7XG4gICAgICAgICAgICBpdGVtUGFydC5jb21taXQoKTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE4IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuXG5pbXBvcnQge1RlbXBsYXRlSW5zdGFuY2V9IGZyb20gJy4uL2xpYi90ZW1wbGF0ZS1pbnN0YW5jZS5qcyc7XG5pbXBvcnQge1RlbXBsYXRlfSBmcm9tICcuLi9saWIvdGVtcGxhdGUuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIE5vZGVQYXJ0LCBQYXJ0LCByZXBhcmVudE5vZGVzLCBUZW1wbGF0ZVJlc3VsdH0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuXG5pbnRlcmZhY2UgQ2FjaGVkVGVtcGxhdGUge1xuICByZWFkb25seSBpbnN0YW5jZTogVGVtcGxhdGVJbnN0YW5jZTtcbiAgcmVhZG9ubHkgbm9kZXM6IERvY3VtZW50RnJhZ21lbnQ7XG59XG5jb25zdCB0ZW1wbGF0ZUNhY2hlcyA9XG4gICAgbmV3IFdlYWtNYXA8Tm9kZVBhcnQsIFdlYWtNYXA8VGVtcGxhdGUsIENhY2hlZFRlbXBsYXRlPj4oKTtcblxuLyoqXG4gKiBFbmFibGVzIGZhc3Qgc3dpdGNoaW5nIGJldHdlZW4gbXVsdGlwbGUgdGVtcGxhdGVzIGJ5IGNhY2hpbmcgdGhlIERPTSBub2Rlc1xuICogYW5kIFRlbXBsYXRlSW5zdGFuY2VzIHByb2R1Y2VkIGJ5IHRoZSB0ZW1wbGF0ZXMuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIGxldCBjaGVja2VkID0gZmFsc2U7XG4gKlxuICogaHRtbGBcbiAqICAgJHtjYWNoZShjaGVja2VkID8gaHRtbGBpbnB1dCBpcyBjaGVja2VkYCA6IGh0bWxgaW5wdXQgaXMgbm90IGNoZWNrZWRgKX1cbiAqIGBcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgY2FjaGUgPSBkaXJlY3RpdmUoKHZhbHVlOiB1bmtub3duKSA9PiAocGFydDogUGFydCkgPT4ge1xuICBpZiAoIShwYXJ0IGluc3RhbmNlb2YgTm9kZVBhcnQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjYWNoZSBjYW4gb25seSBiZSB1c2VkIGluIHRleHQgYmluZGluZ3MnKTtcbiAgfVxuXG4gIGxldCB0ZW1wbGF0ZUNhY2hlID0gdGVtcGxhdGVDYWNoZXMuZ2V0KHBhcnQpO1xuXG4gIGlmICh0ZW1wbGF0ZUNhY2hlID09PSB1bmRlZmluZWQpIHtcbiAgICB0ZW1wbGF0ZUNhY2hlID0gbmV3IFdlYWtNYXAoKTtcbiAgICB0ZW1wbGF0ZUNhY2hlcy5zZXQocGFydCwgdGVtcGxhdGVDYWNoZSk7XG4gIH1cblxuICBjb25zdCBwcmV2aW91c1ZhbHVlID0gcGFydC52YWx1ZTtcblxuICAvLyBGaXJzdCwgY2FuIHdlIHVwZGF0ZSB0aGUgY3VycmVudCBUZW1wbGF0ZUluc3RhbmNlLCBvciBkbyB3ZSBuZWVkIHRvIG1vdmVcbiAgLy8gdGhlIGN1cnJlbnQgbm9kZXMgaW50byB0aGUgY2FjaGU/XG4gIGlmIChwcmV2aW91c1ZhbHVlIGluc3RhbmNlb2YgVGVtcGxhdGVJbnN0YW5jZSkge1xuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFRlbXBsYXRlUmVzdWx0ICYmXG4gICAgICAgIHByZXZpb3VzVmFsdWUudGVtcGxhdGUgPT09IHBhcnQub3B0aW9ucy50ZW1wbGF0ZUZhY3RvcnkodmFsdWUpKSB7XG4gICAgICAvLyBTYW1lIFRlbXBsYXRlLCBqdXN0IHRyaWdnZXIgYW4gdXBkYXRlIG9mIHRoZSBUZW1wbGF0ZUluc3RhbmNlXG4gICAgICBwYXJ0LnNldFZhbHVlKHZhbHVlKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTm90IHRoZSBzYW1lIFRlbXBsYXRlLCBtb3ZlIHRoZSBub2RlcyBmcm9tIHRoZSBET00gaW50byB0aGUgY2FjaGUuXG4gICAgICBsZXQgY2FjaGVkVGVtcGxhdGUgPSB0ZW1wbGF0ZUNhY2hlLmdldChwcmV2aW91c1ZhbHVlLnRlbXBsYXRlKTtcbiAgICAgIGlmIChjYWNoZWRUZW1wbGF0ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNhY2hlZFRlbXBsYXRlID0ge1xuICAgICAgICAgIGluc3RhbmNlOiBwcmV2aW91c1ZhbHVlLFxuICAgICAgICAgIG5vZGVzOiBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCksXG4gICAgICAgIH07XG4gICAgICAgIHRlbXBsYXRlQ2FjaGUuc2V0KHByZXZpb3VzVmFsdWUudGVtcGxhdGUsIGNhY2hlZFRlbXBsYXRlKTtcbiAgICAgIH1cbiAgICAgIHJlcGFyZW50Tm9kZXMoXG4gICAgICAgICAgY2FjaGVkVGVtcGxhdGUubm9kZXMsIHBhcnQuc3RhcnROb2RlLm5leHRTaWJsaW5nLCBwYXJ0LmVuZE5vZGUpO1xuICAgIH1cbiAgfVxuXG4gIC8vIE5leHQsIGNhbiB3ZSByZXVzZSBub2RlcyBmcm9tIHRoZSBjYWNoZT9cbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgVGVtcGxhdGVSZXN1bHQpIHtcbiAgICBjb25zdCB0ZW1wbGF0ZSA9IHBhcnQub3B0aW9ucy50ZW1wbGF0ZUZhY3RvcnkodmFsdWUpO1xuICAgIGNvbnN0IGNhY2hlZFRlbXBsYXRlID0gdGVtcGxhdGVDYWNoZS5nZXQodGVtcGxhdGUpO1xuICAgIGlmIChjYWNoZWRUZW1wbGF0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBNb3ZlIG5vZGVzIG91dCBvZiBjYWNoZVxuICAgICAgcGFydC5zZXRWYWx1ZShjYWNoZWRUZW1wbGF0ZS5ub2Rlcyk7XG4gICAgICBwYXJ0LmNvbW1pdCgpO1xuICAgICAgLy8gU2V0IHRoZSBQYXJ0IHZhbHVlIHRvIHRoZSBUZW1wbGF0ZUluc3RhbmNlIHNvIGl0J2xsIHVwZGF0ZSBpdC5cbiAgICAgIHBhcnQudmFsdWUgPSBjYWNoZWRUZW1wbGF0ZS5pbnN0YW5jZTtcbiAgICB9XG4gIH1cbiAgcGFydC5zZXRWYWx1ZSh2YWx1ZSk7XG59KTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxOCBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cblxuaW1wb3J0IHtBdHRyaWJ1dGVQYXJ0LCBkaXJlY3RpdmUsIFBhcnQsIFByb3BlcnR5UGFydH0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuXG4vLyBJRTExIGRvZXNuJ3Qgc3VwcG9ydCBjbGFzc0xpc3Qgb24gU1ZHIGVsZW1lbnRzLCBzbyB3ZSBlbXVsYXRlIGl0IHdpdGggYSBTZXRcbmNsYXNzIENsYXNzTGlzdCB7XG4gIGVsZW1lbnQ6IEVsZW1lbnQ7XG4gIGNsYXNzZXM6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpO1xuICBjaGFuZ2VkID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IoZWxlbWVudDogRWxlbWVudCkge1xuICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgY29uc3QgY2xhc3NMaXN0ID0gKGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdjbGFzcycpIHx8ICcnKS5zcGxpdCgvXFxzKy8pO1xuICAgIGZvciAoY29uc3QgY2xzIG9mIGNsYXNzTGlzdCkge1xuICAgICAgdGhpcy5jbGFzc2VzLmFkZChjbHMpO1xuICAgIH1cbiAgfVxuICBhZGQoY2xzOiBzdHJpbmcpIHtcbiAgICB0aGlzLmNsYXNzZXMuYWRkKGNscyk7XG4gICAgdGhpcy5jaGFuZ2VkID0gdHJ1ZTtcbiAgfVxuXG4gIHJlbW92ZShjbHM6IHN0cmluZykge1xuICAgIHRoaXMuY2xhc3Nlcy5kZWxldGUoY2xzKTtcbiAgICB0aGlzLmNoYW5nZWQgPSB0cnVlO1xuICB9XG5cbiAgY29tbWl0KCkge1xuICAgIGlmICh0aGlzLmNoYW5nZWQpIHtcbiAgICAgIGxldCBjbGFzc1N0cmluZyA9ICcnO1xuICAgICAgdGhpcy5jbGFzc2VzLmZvckVhY2goKGNscykgPT4gY2xhc3NTdHJpbmcgKz0gY2xzICsgJyAnKTtcbiAgICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgY2xhc3NTdHJpbmcpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIENsYXNzSW5mbyB7XG4gIHJlYWRvbmx5IFtuYW1lOiBzdHJpbmddOiBzdHJpbmd8Ym9vbGVhbnxudW1iZXI7XG59XG5cbi8qKlxuICogU3RvcmVzIHRoZSBDbGFzc0luZm8gb2JqZWN0IGFwcGxpZWQgdG8gYSBnaXZlbiBBdHRyaWJ1dGVQYXJ0LlxuICogVXNlZCB0byB1bnNldCBleGlzdGluZyB2YWx1ZXMgd2hlbiBhIG5ldyBDbGFzc0luZm8gb2JqZWN0IGlzIGFwcGxpZWQuXG4gKi9cbmNvbnN0IHByZXZpb3VzQ2xhc3Nlc0NhY2hlID0gbmV3IFdlYWtNYXA8UGFydCwgU2V0PHN0cmluZz4+KCk7XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCBhcHBsaWVzIENTUyBjbGFzc2VzLiBUaGlzIG11c3QgYmUgdXNlZCBpbiB0aGUgYGNsYXNzYFxuICogYXR0cmlidXRlIGFuZCBtdXN0IGJlIHRoZSBvbmx5IHBhcnQgdXNlZCBpbiB0aGUgYXR0cmlidXRlLiBJdCB0YWtlcyBlYWNoXG4gKiBwcm9wZXJ0eSBpbiB0aGUgYGNsYXNzSW5mb2AgYXJndW1lbnQgYW5kIGFkZHMgdGhlIHByb3BlcnR5IG5hbWUgdG8gdGhlXG4gKiBlbGVtZW50J3MgYGNsYXNzYCBpZiB0aGUgcHJvcGVydHkgdmFsdWUgaXMgdHJ1dGh5OyBpZiB0aGUgcHJvcGVydHkgdmFsdWUgaXNcbiAqIGZhbHNleSwgdGhlIHByb3BlcnR5IG5hbWUgaXMgcmVtb3ZlZCBmcm9tIHRoZSBlbGVtZW50J3MgYGNsYXNzYC4gRm9yIGV4YW1wbGVcbiAqIGB7Zm9vOiBiYXJ9YCBhcHBsaWVzIHRoZSBjbGFzcyBgZm9vYCBpZiB0aGUgdmFsdWUgb2YgYGJhcmAgaXMgdHJ1dGh5LlxuICogQHBhcmFtIGNsYXNzSW5mbyB7Q2xhc3NJbmZvfVxuICovXG5leHBvcnQgY29uc3QgY2xhc3NNYXAgPSBkaXJlY3RpdmUoKGNsYXNzSW5mbzogQ2xhc3NJbmZvKSA9PiAocGFydDogUGFydCkgPT4ge1xuICBpZiAoIShwYXJ0IGluc3RhbmNlb2YgQXR0cmlidXRlUGFydCkgfHwgKHBhcnQgaW5zdGFuY2VvZiBQcm9wZXJ0eVBhcnQpIHx8XG4gICAgICBwYXJ0LmNvbW1pdHRlci5uYW1lICE9PSAnY2xhc3MnIHx8IHBhcnQuY29tbWl0dGVyLnBhcnRzLmxlbmd0aCA+IDEpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdUaGUgYGNsYXNzTWFwYCBkaXJlY3RpdmUgbXVzdCBiZSB1c2VkIGluIHRoZSBgY2xhc3NgIGF0dHJpYnV0ZSAnICtcbiAgICAgICAgJ2FuZCBtdXN0IGJlIHRoZSBvbmx5IHBhcnQgaW4gdGhlIGF0dHJpYnV0ZS4nKTtcbiAgfVxuXG4gIGNvbnN0IHtjb21taXR0ZXJ9ID0gcGFydDtcbiAgY29uc3Qge2VsZW1lbnR9ID0gY29tbWl0dGVyO1xuXG4gIGxldCBwcmV2aW91c0NsYXNzZXMgPSBwcmV2aW91c0NsYXNzZXNDYWNoZS5nZXQocGFydCk7XG4gIGlmIChwcmV2aW91c0NsYXNzZXMgPT09IHVuZGVmaW5lZCkge1xuICAgIC8vIFdyaXRlIHN0YXRpYyBjbGFzc2VzIG9uY2VcbiAgICAvLyBVc2Ugc2V0QXR0cmlidXRlKCkgYmVjYXVzZSBjbGFzc05hbWUgaXNuJ3QgYSBzdHJpbmcgb24gU1ZHIGVsZW1lbnRzXG4gICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgY29tbWl0dGVyLnN0cmluZ3Muam9pbignICcpKTtcbiAgICBwcmV2aW91c0NsYXNzZXNDYWNoZS5zZXQocGFydCwgcHJldmlvdXNDbGFzc2VzID0gbmV3IFNldCgpKTtcbiAgfVxuXG4gIGNvbnN0IGNsYXNzTGlzdCA9XG4gICAgICAoZWxlbWVudC5jbGFzc0xpc3QgfHwgbmV3IENsYXNzTGlzdChlbGVtZW50KSkgYXMgRE9NVG9rZW5MaXN0IHwgQ2xhc3NMaXN0O1xuXG4gIC8vIFJlbW92ZSBvbGQgY2xhc3NlcyB0aGF0IG5vIGxvbmdlciBhcHBseVxuICAvLyBXZSB1c2UgZm9yRWFjaCgpIGluc3RlYWQgb2YgZm9yLW9mIHNvIHRoYXQgcmUgZG9uJ3QgcmVxdWlyZSBkb3duLWxldmVsXG4gIC8vIGl0ZXJhdGlvbi5cbiAgcHJldmlvdXNDbGFzc2VzLmZvckVhY2goKG5hbWUpID0+IHtcbiAgICBpZiAoIShuYW1lIGluIGNsYXNzSW5mbykpIHtcbiAgICAgIGNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgICBwcmV2aW91c0NsYXNzZXMhLmRlbGV0ZShuYW1lKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEFkZCBvciByZW1vdmUgY2xhc3NlcyBiYXNlZCBvbiB0aGVpciBjbGFzc01hcCB2YWx1ZVxuICBmb3IgKGNvbnN0IG5hbWUgaW4gY2xhc3NJbmZvKSB7XG4gICAgY29uc3QgdmFsdWUgPSBjbGFzc0luZm9bbmFtZV07XG4gICAgaWYgKHZhbHVlICE9IHByZXZpb3VzQ2xhc3Nlcy5oYXMobmFtZSkpIHtcbiAgICAgIC8vIFdlIGV4cGxpY2l0bHkgd2FudCBhIGxvb3NlIHRydXRoeSBjaGVjayBvZiBgdmFsdWVgIGJlY2F1c2UgaXQgc2VlbXNcbiAgICAgIC8vIG1vcmUgY29udmVuaWVudCB0aGF0ICcnIGFuZCAwIGFyZSBza2lwcGVkLlxuICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgIGNsYXNzTGlzdC5hZGQobmFtZSk7XG4gICAgICAgIHByZXZpb3VzQ2xhc3Nlcy5hZGQobmFtZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjbGFzc0xpc3QucmVtb3ZlKG5hbWUpO1xuICAgICAgICBwcmV2aW91c0NsYXNzZXMuZGVsZXRlKG5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAodHlwZW9mIChjbGFzc0xpc3QgYXMgQ2xhc3NMaXN0KS5jb21taXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAoY2xhc3NMaXN0IGFzIENsYXNzTGlzdCkuY29tbWl0KCk7XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE4IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuXG5pbXBvcnQge2RpcmVjdGl2ZSwgUGFydH0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuXG5jb25zdCBwcmV2aW91c1ZhbHVlcyA9IG5ldyBXZWFrTWFwPFBhcnQsIHVua25vd24+KCk7XG5cbi8qKlxuICogUHJldmVudHMgcmUtcmVuZGVyIG9mIGEgdGVtcGxhdGUgZnVuY3Rpb24gdW50aWwgYSBzaW5nbGUgdmFsdWUgb3IgYW4gYXJyYXkgb2ZcbiAqIHZhbHVlcyBjaGFuZ2VzLlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogYGBganNcbiAqIGh0bWxgXG4gKiAgIDxkaXY+XG4gKiAgICAgJHtndWFyZChbdXNlci5pZCwgY29tcGFueS5pZF0sICgpID0+IGh0bWxgLi4uYCl9XG4gKiAgIDwvZGl2PlxuICogYGBgXG4gKlxuICogSW4gdGhpcyBjYXNlLCB0aGUgdGVtcGxhdGUgb25seSByZW5kZXJzIGlmIGVpdGhlciBgdXNlci5pZGAgb3IgYGNvbXBhbnkuaWRgXG4gKiBjaGFuZ2VzLlxuICpcbiAqIGd1YXJkKCkgaXMgdXNlZnVsIHdpdGggaW1tdXRhYmxlIGRhdGEgcGF0dGVybnMsIGJ5IHByZXZlbnRpbmcgZXhwZW5zaXZlIHdvcmtcbiAqIHVudGlsIGRhdGEgdXBkYXRlcy5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBodG1sYFxuICogICA8ZGl2PlxuICogICAgICR7Z3VhcmQoW2ltbXV0YWJsZUl0ZW1zXSwgKCkgPT4gaW1tdXRhYmxlSXRlbXMubWFwKGkgPT4gaHRtbGAke2l9YCkpfVxuICogICA8L2Rpdj5cbiAqIGBgYFxuICpcbiAqIEluIHRoaXMgY2FzZSwgaXRlbXMgYXJlIG1hcHBlZCBvdmVyIG9ubHkgd2hlbiB0aGUgYXJyYXkgcmVmZXJlbmNlIGNoYW5nZXMuXG4gKlxuICogQHBhcmFtIHZhbHVlIHRoZSB2YWx1ZSB0byBjaGVjayBiZWZvcmUgcmUtcmVuZGVyaW5nXG4gKiBAcGFyYW0gZiB0aGUgdGVtcGxhdGUgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IGNvbnN0IGd1YXJkID1cbiAgICBkaXJlY3RpdmUoKHZhbHVlOiB1bmtub3duLCBmOiAoKSA9PiB1bmtub3duKSA9PiAocGFydDogUGFydCk6IHZvaWQgPT4ge1xuICAgICAgY29uc3QgcHJldmlvdXNWYWx1ZSA9IHByZXZpb3VzVmFsdWVzLmdldChwYXJ0KTtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAvLyBEaXJ0eS1jaGVjayBhcnJheXMgYnkgaXRlbVxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShwcmV2aW91c1ZhbHVlKSAmJlxuICAgICAgICAgICAgcHJldmlvdXNWYWx1ZS5sZW5ndGggPT09IHZhbHVlLmxlbmd0aCAmJlxuICAgICAgICAgICAgdmFsdWUuZXZlcnkoKHYsIGkpID0+IHYgPT09IHByZXZpb3VzVmFsdWVbaV0pKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgIHByZXZpb3VzVmFsdWUgPT09IHZhbHVlICYmXG4gICAgICAgICAgKHZhbHVlICE9PSB1bmRlZmluZWQgfHwgcHJldmlvdXNWYWx1ZXMuaGFzKHBhcnQpKSkge1xuICAgICAgICAvLyBEaXJ0eS1jaGVjayBub24tYXJyYXlzIGJ5IGlkZW50aXR5XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgcGFydC5zZXRWYWx1ZShmKCkpO1xuICAgICAgLy8gQ29weSB0aGUgdmFsdWUgaWYgaXQncyBhbiBhcnJheSBzbyB0aGF0IGlmIGl0J3MgbXV0YXRlZCB3ZSBkb24ndCBmb3JnZXRcbiAgICAgIC8vIHdoYXQgdGhlIHByZXZpb3VzIHZhbHVlcyB3ZXJlLlxuICAgICAgcHJldmlvdXNWYWx1ZXMuc2V0KFxuICAgICAgICAgIHBhcnQsIEFycmF5LmlzQXJyYXkodmFsdWUpID8gQXJyYXkuZnJvbSh2YWx1ZSkgOiB2YWx1ZSk7XG4gICAgfSk7XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTggVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG5cbmltcG9ydCB7QXR0cmlidXRlUGFydCwgZGlyZWN0aXZlLCBQYXJ0fSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5cbmNvbnN0IHByZXZpb3VzVmFsdWVzID0gbmV3IFdlYWtNYXA8UGFydCwgdW5rbm93bj4oKTtcblxuLyoqXG4gKiBGb3IgQXR0cmlidXRlUGFydHMsIHNldHMgdGhlIGF0dHJpYnV0ZSBpZiB0aGUgdmFsdWUgaXMgZGVmaW5lZCBhbmQgcmVtb3Zlc1xuICogdGhlIGF0dHJpYnV0ZSBpZiB0aGUgdmFsdWUgaXMgdW5kZWZpbmVkLlxuICpcbiAqIEZvciBvdGhlciBwYXJ0IHR5cGVzLCB0aGlzIGRpcmVjdGl2ZSBpcyBhIG5vLW9wLlxuICovXG5leHBvcnQgY29uc3QgaWZEZWZpbmVkID0gZGlyZWN0aXZlKCh2YWx1ZTogdW5rbm93bikgPT4gKHBhcnQ6IFBhcnQpID0+IHtcbiAgY29uc3QgcHJldmlvdXNWYWx1ZSA9IHByZXZpb3VzVmFsdWVzLmdldChwYXJ0KTtcblxuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCAmJiBwYXJ0IGluc3RhbmNlb2YgQXR0cmlidXRlUGFydCkge1xuICAgIC8vIElmIHRoZSB2YWx1ZSBpcyB1bmRlZmluZWQsIHJlbW92ZSB0aGUgYXR0cmlidXRlLCBidXQgb25seSBpZiB0aGUgdmFsdWVcbiAgICAvLyB3YXMgcHJldmlvdXNseSBkZWZpbmVkLlxuICAgIGlmIChwcmV2aW91c1ZhbHVlICE9PSB1bmRlZmluZWQgfHwgIXByZXZpb3VzVmFsdWVzLmhhcyhwYXJ0KSkge1xuICAgICAgY29uc3QgbmFtZSA9IHBhcnQuY29tbWl0dGVyLm5hbWU7XG4gICAgICBwYXJ0LmNvbW1pdHRlci5lbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAodmFsdWUgIT09IHByZXZpb3VzVmFsdWUpIHtcbiAgICBwYXJ0LnNldFZhbHVlKHZhbHVlKTtcbiAgfVxuXG4gIHByZXZpb3VzVmFsdWVzLnNldChwYXJ0LCB2YWx1ZSk7XG59KTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cblxuaW1wb3J0IHtEaXJlY3RpdmVGbn0gZnJvbSAnLi4vbGliL2RpcmVjdGl2ZS5qcyc7XG5pbXBvcnQge2NyZWF0ZU1hcmtlciwgZGlyZWN0aXZlLCBOb2RlUGFydCwgUGFydCwgcmVtb3ZlTm9kZXMsIHJlcGFyZW50Tm9kZXN9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcblxuZXhwb3J0IHR5cGUgS2V5Rm48VD4gPSAoaXRlbTogVCwgaW5kZXg6IG51bWJlcikgPT4gdW5rbm93bjtcbmV4cG9ydCB0eXBlIEl0ZW1UZW1wbGF0ZTxUPiA9IChpdGVtOiBULCBpbmRleDogbnVtYmVyKSA9PiB1bmtub3duO1xuXG4vLyBIZWxwZXIgZnVuY3Rpb25zIGZvciBtYW5pcHVsYXRpbmcgcGFydHNcbi8vIFRPRE8oa3NjaGFhZik6IFJlZmFjdG9yIGludG8gUGFydCBBUEk/XG5jb25zdCBjcmVhdGVBbmRJbnNlcnRQYXJ0ID1cbiAgICAoY29udGFpbmVyUGFydDogTm9kZVBhcnQsIGJlZm9yZVBhcnQ/OiBOb2RlUGFydCk6IE5vZGVQYXJ0ID0+IHtcbiAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGNvbnRhaW5lclBhcnQuc3RhcnROb2RlLnBhcmVudE5vZGUgYXMgTm9kZTtcbiAgICAgIGNvbnN0IGJlZm9yZU5vZGUgPSBiZWZvcmVQYXJ0ID09PSB1bmRlZmluZWQgPyBjb250YWluZXJQYXJ0LmVuZE5vZGUgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlZm9yZVBhcnQuc3RhcnROb2RlO1xuICAgICAgY29uc3Qgc3RhcnROb2RlID0gY29udGFpbmVyLmluc2VydEJlZm9yZShjcmVhdGVNYXJrZXIoKSwgYmVmb3JlTm9kZSk7XG4gICAgICBjb250YWluZXIuaW5zZXJ0QmVmb3JlKGNyZWF0ZU1hcmtlcigpLCBiZWZvcmVOb2RlKTtcbiAgICAgIGNvbnN0IG5ld1BhcnQgPSBuZXcgTm9kZVBhcnQoY29udGFpbmVyUGFydC5vcHRpb25zKTtcbiAgICAgIG5ld1BhcnQuaW5zZXJ0QWZ0ZXJOb2RlKHN0YXJ0Tm9kZSk7XG4gICAgICByZXR1cm4gbmV3UGFydDtcbiAgICB9O1xuXG5jb25zdCB1cGRhdGVQYXJ0ID0gKHBhcnQ6IE5vZGVQYXJ0LCB2YWx1ZTogdW5rbm93bikgPT4ge1xuICBwYXJ0LnNldFZhbHVlKHZhbHVlKTtcbiAgcGFydC5jb21taXQoKTtcbiAgcmV0dXJuIHBhcnQ7XG59O1xuXG5jb25zdCBpbnNlcnRQYXJ0QmVmb3JlID1cbiAgICAoY29udGFpbmVyUGFydDogTm9kZVBhcnQsIHBhcnQ6IE5vZGVQYXJ0LCByZWY/OiBOb2RlUGFydCkgPT4ge1xuICAgICAgY29uc3QgY29udGFpbmVyID0gY29udGFpbmVyUGFydC5zdGFydE5vZGUucGFyZW50Tm9kZSBhcyBOb2RlO1xuICAgICAgY29uc3QgYmVmb3JlTm9kZSA9IHJlZiA/IHJlZi5zdGFydE5vZGUgOiBjb250YWluZXJQYXJ0LmVuZE5vZGU7XG4gICAgICBjb25zdCBlbmROb2RlID0gcGFydC5lbmROb2RlLm5leHRTaWJsaW5nO1xuICAgICAgaWYgKGVuZE5vZGUgIT09IGJlZm9yZU5vZGUpIHtcbiAgICAgICAgcmVwYXJlbnROb2Rlcyhjb250YWluZXIsIHBhcnQuc3RhcnROb2RlLCBlbmROb2RlLCBiZWZvcmVOb2RlKTtcbiAgICAgIH1cbiAgICB9O1xuXG5jb25zdCByZW1vdmVQYXJ0ID0gKHBhcnQ6IE5vZGVQYXJ0KSA9PiB7XG4gIHJlbW92ZU5vZGVzKFxuICAgICAgcGFydC5zdGFydE5vZGUucGFyZW50Tm9kZSEsIHBhcnQuc3RhcnROb2RlLCBwYXJ0LmVuZE5vZGUubmV4dFNpYmxpbmcpO1xufTtcblxuLy8gSGVscGVyIGZvciBnZW5lcmF0aW5nIGEgbWFwIG9mIGFycmF5IGl0ZW0gdG8gaXRzIGluZGV4IG92ZXIgYSBzdWJzZXRcbi8vIG9mIGFuIGFycmF5ICh1c2VkIHRvIGxhemlseSBnZW5lcmF0ZSBgbmV3S2V5VG9JbmRleE1hcGAgYW5kXG4vLyBgb2xkS2V5VG9JbmRleE1hcGApXG5jb25zdCBnZW5lcmF0ZU1hcCA9IChsaXN0OiB1bmtub3duW10sIHN0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyKSA9PiB7XG4gIGNvbnN0IG1hcCA9IG5ldyBNYXAoKTtcbiAgZm9yIChsZXQgaSA9IHN0YXJ0OyBpIDw9IGVuZDsgaSsrKSB7XG4gICAgbWFwLnNldChsaXN0W2ldLCBpKTtcbiAgfVxuICByZXR1cm4gbWFwO1xufTtcblxuLy8gU3RvcmVzIHByZXZpb3VzIG9yZGVyZWQgbGlzdCBvZiBwYXJ0cyBhbmQgbWFwIG9mIGtleSB0byBpbmRleFxuY29uc3QgcGFydExpc3RDYWNoZSA9IG5ldyBXZWFrTWFwPE5vZGVQYXJ0LCAoTm9kZVBhcnQgfCBudWxsKVtdPigpO1xuY29uc3Qga2V5TGlzdENhY2hlID0gbmV3IFdlYWtNYXA8Tm9kZVBhcnQsIHVua25vd25bXT4oKTtcblxuLyoqXG4gKiBBIGRpcmVjdGl2ZSB0aGF0IHJlcGVhdHMgYSBzZXJpZXMgb2YgdmFsdWVzICh1c3VhbGx5IGBUZW1wbGF0ZVJlc3VsdHNgKVxuICogZ2VuZXJhdGVkIGZyb20gYW4gaXRlcmFibGUsIGFuZCB1cGRhdGVzIHRob3NlIGl0ZW1zIGVmZmljaWVudGx5IHdoZW4gdGhlXG4gKiBpdGVyYWJsZSBjaGFuZ2VzIGJhc2VkIG9uIHVzZXItcHJvdmlkZWQgYGtleXNgIGFzc29jaWF0ZWQgd2l0aCBlYWNoIGl0ZW0uXG4gKlxuICogTm90ZSB0aGF0IGlmIGEgYGtleUZuYCBpcyBwcm92aWRlZCwgc3RyaWN0IGtleS10by1ET00gbWFwcGluZyBpcyBtYWludGFpbmVkLFxuICogbWVhbmluZyBwcmV2aW91cyBET00gZm9yIGEgZ2l2ZW4ga2V5IGlzIG1vdmVkIGludG8gdGhlIG5ldyBwb3NpdGlvbiBpZlxuICogbmVlZGVkLCBhbmQgRE9NIHdpbGwgbmV2ZXIgYmUgcmV1c2VkIHdpdGggdmFsdWVzIGZvciBkaWZmZXJlbnQga2V5cyAobmV3IERPTVxuICogd2lsbCBhbHdheXMgYmUgY3JlYXRlZCBmb3IgbmV3IGtleXMpLiBUaGlzIGlzIGdlbmVyYWxseSB0aGUgbW9zdCBlZmZpY2llbnRcbiAqIHdheSB0byB1c2UgYHJlcGVhdGAgc2luY2UgaXQgcGVyZm9ybXMgbWluaW11bSB1bm5lY2Vzc2FyeSB3b3JrIGZvciBpbnNlcnRpb25zXG4gKiBhbmQgcmVtb3ZhbHMuXG4gKlxuICogSU1QT1JUQU5UOiBJZiBwcm92aWRpbmcgYSBga2V5Rm5gLCBrZXlzICptdXN0KiBiZSB1bmlxdWUgZm9yIGFsbCBpdGVtcyBpbiBhXG4gKiBnaXZlbiBjYWxsIHRvIGByZXBlYXRgLiBUaGUgYmVoYXZpb3Igd2hlbiB0d28gb3IgbW9yZSBpdGVtcyBoYXZlIHRoZSBzYW1lIGtleVxuICogaXMgdW5kZWZpbmVkLlxuICpcbiAqIElmIG5vIGBrZXlGbmAgaXMgcHJvdmlkZWQsIHRoaXMgZGlyZWN0aXZlIHdpbGwgcGVyZm9ybSBzaW1pbGFyIHRvIG1hcHBpbmdcbiAqIGl0ZW1zIHRvIHZhbHVlcywgYW5kIERPTSB3aWxsIGJlIHJldXNlZCBhZ2FpbnN0IHBvdGVudGlhbGx5IGRpZmZlcmVudCBpdGVtcy5cbiAqL1xuZXhwb3J0IGNvbnN0IHJlcGVhdCA9XG4gICAgZGlyZWN0aXZlKFxuICAgICAgICA8VD4oaXRlbXM6IEl0ZXJhYmxlPFQ+LFxuICAgICAgICAgICAga2V5Rm5PclRlbXBsYXRlOiBLZXlGbjxUPnxJdGVtVGVtcGxhdGU8VD4sXG4gICAgICAgICAgICB0ZW1wbGF0ZT86IEl0ZW1UZW1wbGF0ZTxUPik6XG4gICAgICAgICAgICBEaXJlY3RpdmVGbiA9PiB7XG4gICAgICAgICAgICAgIGxldCBrZXlGbjogS2V5Rm48VD47XG4gICAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGVtcGxhdGUgPSBrZXlGbk9yVGVtcGxhdGU7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5Rm5PclRlbXBsYXRlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBrZXlGbiA9IGtleUZuT3JUZW1wbGF0ZSBhcyBLZXlGbjxUPjtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHJldHVybiAoY29udGFpbmVyUGFydDogUGFydCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghKGNvbnRhaW5lclBhcnQgaW5zdGFuY2VvZiBOb2RlUGFydCkpIHtcbiAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncmVwZWF0IGNhbiBvbmx5IGJlIHVzZWQgaW4gdGV4dCBiaW5kaW5ncycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBPbGQgcGFydCAmIGtleSBsaXN0cyBhcmUgcmV0cmlldmVkIGZyb20gdGhlIGxhc3QgdXBkYXRlXG4gICAgICAgICAgICAgICAgLy8gKGFzc29jaWF0ZWQgd2l0aCB0aGUgcGFydCBmb3IgdGhpcyBpbnN0YW5jZSBvZiB0aGUgZGlyZWN0aXZlKVxuICAgICAgICAgICAgICAgIGNvbnN0IG9sZFBhcnRzID0gcGFydExpc3RDYWNoZS5nZXQoY29udGFpbmVyUGFydCkgfHwgW107XG4gICAgICAgICAgICAgICAgY29uc3Qgb2xkS2V5cyA9IGtleUxpc3RDYWNoZS5nZXQoY29udGFpbmVyUGFydCkgfHwgW107XG5cbiAgICAgICAgICAgICAgICAvLyBOZXcgcGFydCBsaXN0IHdpbGwgYmUgYnVpbHQgdXAgYXMgd2UgZ28gKGVpdGhlciByZXVzZWQgZnJvbVxuICAgICAgICAgICAgICAgIC8vIG9sZCBwYXJ0cyBvciBjcmVhdGVkIGZvciBuZXcga2V5cyBpbiB0aGlzIHVwZGF0ZSkuIFRoaXMgaXNcbiAgICAgICAgICAgICAgICAvLyBzYXZlZCBpbiB0aGUgYWJvdmUgY2FjaGUgYXQgdGhlIGVuZCBvZiB0aGUgdXBkYXRlLlxuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1BhcnRzOiBOb2RlUGFydFtdID0gW107XG5cbiAgICAgICAgICAgICAgICAvLyBOZXcgdmFsdWUgbGlzdCBpcyBlYWdlcmx5IGdlbmVyYXRlZCBmcm9tIGl0ZW1zIGFsb25nIHdpdGggYVxuICAgICAgICAgICAgICAgIC8vIHBhcmFsbGVsIGFycmF5IGluZGljYXRpbmcgaXRzIGtleS5cbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWYWx1ZXM6IHVua25vd25bXSA9IFtdO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld0tleXM6IHVua25vd25bXSA9IFtdO1xuICAgICAgICAgICAgICAgIGxldCBpbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgICAgICAgICAgICAgICBuZXdLZXlzW2luZGV4XSA9IGtleUZuID8ga2V5Rm4oaXRlbSwgaW5kZXgpIDogaW5kZXg7XG4gICAgICAgICAgICAgICAgICBuZXdWYWx1ZXNbaW5kZXhdID0gdGVtcGxhdGUgIShpdGVtLCBpbmRleCk7XG4gICAgICAgICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIE1hcHMgZnJvbSBrZXkgdG8gaW5kZXggZm9yIGN1cnJlbnQgYW5kIHByZXZpb3VzIHVwZGF0ZTsgdGhlc2VcbiAgICAgICAgICAgICAgICAvLyBhcmUgZ2VuZXJhdGVkIGxhemlseSBvbmx5IHdoZW4gbmVlZGVkIGFzIGEgcGVyZm9ybWFuY2VcbiAgICAgICAgICAgICAgICAvLyBvcHRpbWl6YXRpb24sIHNpbmNlIHRoZXkgYXJlIG9ubHkgcmVxdWlyZWQgZm9yIG11bHRpcGxlXG4gICAgICAgICAgICAgICAgLy8gbm9uLWNvbnRpZ3VvdXMgY2hhbmdlcyBpbiB0aGUgbGlzdCwgd2hpY2ggYXJlIGxlc3MgY29tbW9uLlxuICAgICAgICAgICAgICAgIGxldCBuZXdLZXlUb0luZGV4TWFwITogTWFwPHVua25vd24sIG51bWJlcj47XG4gICAgICAgICAgICAgICAgbGV0IG9sZEtleVRvSW5kZXhNYXAhOiBNYXA8dW5rbm93biwgbnVtYmVyPjtcblxuICAgICAgICAgICAgICAgIC8vIEhlYWQgYW5kIHRhaWwgcG9pbnRlcnMgdG8gb2xkIHBhcnRzIGFuZCBuZXcgdmFsdWVzXG4gICAgICAgICAgICAgICAgbGV0IG9sZEhlYWQgPSAwO1xuICAgICAgICAgICAgICAgIGxldCBvbGRUYWlsID0gb2xkUGFydHMubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgICAgICBsZXQgbmV3SGVhZCA9IDA7XG4gICAgICAgICAgICAgICAgbGV0IG5ld1RhaWwgPSBuZXdWYWx1ZXMubGVuZ3RoIC0gMTtcblxuICAgICAgICAgICAgICAgIC8vIE92ZXJ2aWV3IG9mIE8obikgcmVjb25jaWxpYXRpb24gYWxnb3JpdGhtIChnZW5lcmFsIGFwcHJvYWNoXG4gICAgICAgICAgICAgICAgLy8gYmFzZWQgb24gaWRlYXMgZm91bmQgaW4gaXZpLCB2dWUsIHNuYWJiZG9tLCBldGMuKTpcbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICogV2Ugc3RhcnQgd2l0aCB0aGUgbGlzdCBvZiBvbGQgcGFydHMgYW5kIG5ldyB2YWx1ZXMgKGFuZFxuICAgICAgICAgICAgICAgIC8vICAgYXJyYXlzIG9mIHRoZWlyIHJlc3BlY3RpdmUga2V5cyksIGhlYWQvdGFpbCBwb2ludGVycyBpbnRvXG4gICAgICAgICAgICAgICAgLy8gICBlYWNoLCBhbmQgd2UgYnVpbGQgdXAgdGhlIG5ldyBsaXN0IG9mIHBhcnRzIGJ5IHVwZGF0aW5nXG4gICAgICAgICAgICAgICAgLy8gICAoYW5kIHdoZW4gbmVlZGVkLCBtb3ZpbmcpIG9sZCBwYXJ0cyBvciBjcmVhdGluZyBuZXcgb25lcy5cbiAgICAgICAgICAgICAgICAvLyAgIFRoZSBpbml0aWFsIHNjZW5hcmlvIG1pZ2h0IGxvb2sgbGlrZSB0aGlzIChmb3IgYnJldml0eSBvZlxuICAgICAgICAgICAgICAgIC8vICAgdGhlIGRpYWdyYW1zLCB0aGUgbnVtYmVycyBpbiB0aGUgYXJyYXkgcmVmbGVjdCBrZXlzXG4gICAgICAgICAgICAgICAgLy8gICBhc3NvY2lhdGVkIHdpdGggdGhlIG9sZCBwYXJ0cyBvciBuZXcgdmFsdWVzLCBhbHRob3VnaCBrZXlzXG4gICAgICAgICAgICAgICAgLy8gICBhbmQgcGFydHMvdmFsdWVzIGFyZSBhY3R1YWxseSBzdG9yZWQgaW4gcGFyYWxsZWwgYXJyYXlzXG4gICAgICAgICAgICAgICAgLy8gICBpbmRleGVkIHVzaW5nIHRoZSBzYW1lIGhlYWQvdGFpbCBwb2ludGVycyk6XG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAgICAgIG9sZEhlYWQgdiAgICAgICAgICAgICAgICAgdiBvbGRUYWlsXG4gICAgICAgICAgICAgICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIDIsIDMsIDQsIDUsIDZdXG4gICAgICAgICAgICAgICAgLy8gICBuZXdQYXJ0czogWyAsICAsICAsICAsICAsICAsICBdXG4gICAgICAgICAgICAgICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdIDwtIHJlZmxlY3RzIHRoZSB1c2VyJ3MgbmV3XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0gb3JkZXJcbiAgICAgICAgICAgICAgICAvLyAgICAgIG5ld0hlYWQgXiAgICAgICAgICAgICAgICAgXiBuZXdUYWlsXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAqIEl0ZXJhdGUgb2xkICYgbmV3IGxpc3RzIGZyb20gYm90aCBzaWRlcywgdXBkYXRpbmcsXG4gICAgICAgICAgICAgICAgLy8gICBzd2FwcGluZywgb3IgcmVtb3ZpbmcgcGFydHMgYXQgdGhlIGhlYWQvdGFpbCBsb2NhdGlvbnNcbiAgICAgICAgICAgICAgICAvLyAgIHVudGlsIG5laXRoZXIgaGVhZCBub3IgdGFpbCBjYW4gbW92ZS5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICogRXhhbXBsZSBiZWxvdzoga2V5cyBhdCBoZWFkIHBvaW50ZXJzIG1hdGNoLCBzbyB1cGRhdGUgb2xkXG4gICAgICAgICAgICAgICAgLy8gICBwYXJ0IDAgaW4tcGxhY2UgKG5vIG5lZWQgdG8gbW92ZSBpdCkgYW5kIHJlY29yZCBwYXJ0IDAgaW5cbiAgICAgICAgICAgICAgICAvLyAgIHRoZSBgbmV3UGFydHNgIGxpc3QuIFRoZSBsYXN0IHRoaW5nIHdlIGRvIGlzIGFkdmFuY2UgdGhlXG4gICAgICAgICAgICAgICAgLy8gICBgb2xkSGVhZGAgYW5kIGBuZXdIZWFkYCBwb2ludGVycyAod2lsbCBiZSByZWZsZWN0ZWQgaW4gdGhlXG4gICAgICAgICAgICAgICAgLy8gICBuZXh0IGRpYWdyYW0pLlxuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gICAgICBvbGRIZWFkIHYgICAgICAgICAgICAgICAgIHYgb2xkVGFpbFxuICAgICAgICAgICAgICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAyLCAzLCA0LCA1LCA2XVxuICAgICAgICAgICAgICAgIC8vICAgbmV3UGFydHM6IFswLCAgLCAgLCAgLCAgLCAgLCAgXSA8LSBoZWFkcyBtYXRjaGVkOiB1cGRhdGUgMFxuICAgICAgICAgICAgICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSAgICBhbmQgYWR2YW5jZSBib3RoIG9sZEhlYWRcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJiBuZXdIZWFkXG4gICAgICAgICAgICAgICAgLy8gICAgICBuZXdIZWFkIF4gICAgICAgICAgICAgICAgIF4gbmV3VGFpbFxuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gKiBFeGFtcGxlIGJlbG93OiBoZWFkIHBvaW50ZXJzIGRvbid0IG1hdGNoLCBidXQgdGFpbFxuICAgICAgICAgICAgICAgIC8vICAgcG9pbnRlcnMgZG8sIHNvIHVwZGF0ZSBwYXJ0IDYgaW4gcGxhY2UgKG5vIG5lZWQgdG8gbW92ZVxuICAgICAgICAgICAgICAgIC8vICAgaXQpLCBhbmQgcmVjb3JkIHBhcnQgNiBpbiB0aGUgYG5ld1BhcnRzYCBsaXN0LiBMYXN0LFxuICAgICAgICAgICAgICAgIC8vICAgYWR2YW5jZSB0aGUgYG9sZFRhaWxgIGFuZCBgb2xkSGVhZGAgcG9pbnRlcnMuXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIG9sZEhlYWQgdiAgICAgICAgICAgICAgdiBvbGRUYWlsXG4gICAgICAgICAgICAgICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIDIsIDMsIDQsIDUsIDZdXG4gICAgICAgICAgICAgICAgLy8gICBuZXdQYXJ0czogWzAsICAsICAsICAsICAsICAsIDZdIDwtIHRhaWxzIG1hdGNoZWQ6IHVwZGF0ZSA2XG4gICAgICAgICAgICAgICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIGJvdGggb2xkVGFpbFxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmIG5ld1RhaWxcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIG5ld0hlYWQgXiAgICAgICAgICAgICAgXiBuZXdUYWlsXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAqIElmIG5laXRoZXIgaGVhZCBub3IgdGFpbCBtYXRjaDsgbmV4dCBjaGVjayBpZiBvbmUgb2YgdGhlXG4gICAgICAgICAgICAgICAgLy8gICBvbGQgaGVhZC90YWlsIGl0ZW1zIHdhcyByZW1vdmVkLiBXZSBmaXJzdCBuZWVkIHRvIGdlbmVyYXRlXG4gICAgICAgICAgICAgICAgLy8gICB0aGUgcmV2ZXJzZSBtYXAgb2YgbmV3IGtleXMgdG8gaW5kZXggKGBuZXdLZXlUb0luZGV4TWFwYCksXG4gICAgICAgICAgICAgICAgLy8gICB3aGljaCBpcyBkb25lIG9uY2UgbGF6aWx5IGFzIGEgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uLFxuICAgICAgICAgICAgICAgIC8vICAgc2luY2Ugd2Ugb25seSBoaXQgdGhpcyBjYXNlIGlmIG11bHRpcGxlIG5vbi1jb250aWd1b3VzXG4gICAgICAgICAgICAgICAgLy8gICBjaGFuZ2VzIHdlcmUgbWFkZS4gTm90ZSB0aGF0IGZvciBjb250aWd1b3VzIHJlbW92YWxcbiAgICAgICAgICAgICAgICAvLyAgIGFueXdoZXJlIGluIHRoZSBsaXN0LCB0aGUgaGVhZCBhbmQgdGFpbHMgd291bGQgYWR2YW5jZVxuICAgICAgICAgICAgICAgIC8vICAgZnJvbSBlaXRoZXIgZW5kIGFuZCBwYXNzIGVhY2ggb3RoZXIgYmVmb3JlIHdlIGdldCB0byB0aGlzXG4gICAgICAgICAgICAgICAgLy8gICBjYXNlIGFuZCByZW1vdmFscyB3b3VsZCBiZSBoYW5kbGVkIGluIHRoZSBmaW5hbCB3aGlsZSBsb29wXG4gICAgICAgICAgICAgICAgLy8gICB3aXRob3V0IG5lZWRpbmcgdG8gZ2VuZXJhdGUgdGhlIG1hcC5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICogRXhhbXBsZSBiZWxvdzogVGhlIGtleSBhdCBgb2xkVGFpbGAgd2FzIHJlbW92ZWQgKG5vIGxvbmdlclxuICAgICAgICAgICAgICAgIC8vICAgaW4gdGhlIGBuZXdLZXlUb0luZGV4TWFwYCksIHNvIHJlbW92ZSB0aGF0IHBhcnQgZnJvbSB0aGVcbiAgICAgICAgICAgICAgICAvLyAgIERPTSBhbmQgYWR2YW5jZSBqdXN0IHRoZSBgb2xkVGFpbGAgcG9pbnRlci5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgb2xkSGVhZCB2ICAgICAgICAgICB2IG9sZFRhaWxcbiAgICAgICAgICAgICAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgMiwgMywgNCwgNSwgNl1cbiAgICAgICAgICAgICAgICAvLyAgIG5ld1BhcnRzOiBbMCwgICwgICwgICwgICwgICwgNl0gPC0gNSBub3QgaW4gbmV3IG1hcDogcmVtb3ZlXG4gICAgICAgICAgICAgICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIDUgYW5kIGFkdmFuY2Ugb2xkVGFpbFxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgbmV3SGVhZCBeICAgICAgICAgICBeIG5ld1RhaWxcbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICogT25jZSBoZWFkIGFuZCB0YWlsIGNhbm5vdCBtb3ZlLCBhbnkgbWlzbWF0Y2hlcyBhcmUgZHVlIHRvXG4gICAgICAgICAgICAgICAgLy8gICBlaXRoZXIgbmV3IG9yIG1vdmVkIGl0ZW1zOyBpZiBhIG5ldyBrZXkgaXMgaW4gdGhlIHByZXZpb3VzXG4gICAgICAgICAgICAgICAgLy8gICBcIm9sZCBrZXkgdG8gb2xkIGluZGV4XCIgbWFwLCBtb3ZlIHRoZSBvbGQgcGFydCB0byB0aGUgbmV3XG4gICAgICAgICAgICAgICAgLy8gICBsb2NhdGlvbiwgb3RoZXJ3aXNlIGNyZWF0ZSBhbmQgaW5zZXJ0IGEgbmV3IHBhcnQuIE5vdGVcbiAgICAgICAgICAgICAgICAvLyAgIHRoYXQgd2hlbiBtb3ZpbmcgYW4gb2xkIHBhcnQgd2UgbnVsbCBpdHMgcG9zaXRpb24gaW4gdGhlXG4gICAgICAgICAgICAgICAgLy8gICBvbGRQYXJ0cyBhcnJheSBpZiBpdCBsaWVzIGJldHdlZW4gdGhlIGhlYWQgYW5kIHRhaWwgc28gd2VcbiAgICAgICAgICAgICAgICAvLyAgIGtub3cgdG8gc2tpcCBpdCB3aGVuIHRoZSBwb2ludGVycyBnZXQgdGhlcmUuXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IG5laXRoZXIgaGVhZCBub3IgdGFpbCBtYXRjaCwgYW5kIG5laXRoZXJcbiAgICAgICAgICAgICAgICAvLyAgIHdlcmUgcmVtb3ZlZDsgc28gZmluZCB0aGUgYG5ld0hlYWRgIGtleSBpbiB0aGVcbiAgICAgICAgICAgICAgICAvLyAgIGBvbGRLZXlUb0luZGV4TWFwYCwgYW5kIG1vdmUgdGhhdCBvbGQgcGFydCdzIERPTSBpbnRvIHRoZVxuICAgICAgICAgICAgICAgIC8vICAgbmV4dCBoZWFkIHBvc2l0aW9uIChiZWZvcmUgYG9sZFBhcnRzW29sZEhlYWRdYCkuIExhc3QsXG4gICAgICAgICAgICAgICAgLy8gICBudWxsIHRoZSBwYXJ0IGluIHRoZSBgb2xkUGFydGAgYXJyYXkgc2luY2UgaXQgd2FzXG4gICAgICAgICAgICAgICAgLy8gICBzb21ld2hlcmUgaW4gdGhlIHJlbWFpbmluZyBvbGRQYXJ0cyBzdGlsbCB0byBiZSBzY2FubmVkXG4gICAgICAgICAgICAgICAgLy8gICAoYmV0d2VlbiB0aGUgaGVhZCBhbmQgdGFpbCBwb2ludGVycykgc28gdGhhdCB3ZSBrbm93IHRvXG4gICAgICAgICAgICAgICAgLy8gICBza2lwIHRoYXQgb2xkIHBhcnQgb24gZnV0dXJlIGl0ZXJhdGlvbnMuXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIG9sZEhlYWQgdiAgICAgICAgdiBvbGRUYWlsXG4gICAgICAgICAgICAgICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgICAgICAgICAgICAgLy8gICBuZXdQYXJ0czogWzAsIDIsICAsICAsICAsICAsIDZdIDwtIHN0dWNrOiB1cGRhdGUgJiBtb3ZlIDJcbiAgICAgICAgICAgICAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICAgaW50byBwbGFjZSBhbmQgYWR2YW5jZVxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdIZWFkXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBuZXdIZWFkIF4gICAgICAgICAgIF4gbmV3VGFpbFxuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gKiBOb3RlIHRoYXQgZm9yIG1vdmVzL2luc2VydGlvbnMgbGlrZSB0aGUgb25lIGFib3ZlLCBhIHBhcnRcbiAgICAgICAgICAgICAgICAvLyAgIGluc2VydGVkIGF0IHRoZSBoZWFkIHBvaW50ZXIgaXMgaW5zZXJ0ZWQgYmVmb3JlIHRoZVxuICAgICAgICAgICAgICAgIC8vICAgY3VycmVudCBgb2xkUGFydHNbb2xkSGVhZF1gLCBhbmQgYSBwYXJ0IGluc2VydGVkIGF0IHRoZVxuICAgICAgICAgICAgICAgIC8vICAgdGFpbCBwb2ludGVyIGlzIGluc2VydGVkIGJlZm9yZSBgbmV3UGFydHNbbmV3VGFpbCsxXWAuIFRoZVxuICAgICAgICAgICAgICAgIC8vICAgc2VlbWluZyBhc3ltbWV0cnkgbGllcyBpbiB0aGUgZmFjdCB0aGF0IG5ldyBwYXJ0cyBhcmVcbiAgICAgICAgICAgICAgICAvLyAgIG1vdmVkIGludG8gcGxhY2Ugb3V0c2lkZSBpbiwgc28gdG8gdGhlIHJpZ2h0IG9mIHRoZSBoZWFkXG4gICAgICAgICAgICAgICAgLy8gICBwb2ludGVyIGFyZSBvbGQgcGFydHMsIGFuZCB0byB0aGUgcmlnaHQgb2YgdGhlIHRhaWxcbiAgICAgICAgICAgICAgICAvLyAgIHBvaW50ZXIgYXJlIG5ldyBwYXJ0cy5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICogV2UgYWx3YXlzIHJlc3RhcnQgYmFjayBmcm9tIHRoZSB0b3Agb2YgdGhlIGFsZ29yaXRobSxcbiAgICAgICAgICAgICAgICAvLyAgIGFsbG93aW5nIG1hdGNoaW5nIGFuZCBzaW1wbGUgdXBkYXRlcyBpbiBwbGFjZSB0b1xuICAgICAgICAgICAgICAgIC8vICAgY29udGludWUuLi5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICogRXhhbXBsZSBiZWxvdzogdGhlIGhlYWQgcG9pbnRlcnMgb25jZSBhZ2FpbiBtYXRjaCwgc29cbiAgICAgICAgICAgICAgICAvLyAgIHNpbXBseSB1cGRhdGUgcGFydCAxIGFuZCByZWNvcmQgaXQgaW4gdGhlIGBuZXdQYXJ0c2BcbiAgICAgICAgICAgICAgICAvLyAgIGFycmF5LiAgTGFzdCwgYWR2YW5jZSBib3RoIGhlYWQgcG9pbnRlcnMuXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIG9sZEhlYWQgdiAgICAgICAgdiBvbGRUYWlsXG4gICAgICAgICAgICAgICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgICAgICAgICAgICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsICAsICAsICAsIDZdIDwtIGhlYWRzIG1hdGNoZWQ6IHVwZGF0ZSAxXG4gICAgICAgICAgICAgICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIGJvdGggb2xkSGVhZFxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmIG5ld0hlYWRcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgIG5ld0hlYWQgXiAgICAgICAgXiBuZXdUYWlsXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAqIEFzIG1lbnRpb25lZCBhYm92ZSwgaXRlbXMgdGhhdCB3ZXJlIG1vdmVkIGFzIGEgcmVzdWx0IG9mXG4gICAgICAgICAgICAgICAgLy8gICBiZWluZyBzdHVjayAodGhlIGZpbmFsIGVsc2UgY2xhdXNlIGluIHRoZSBjb2RlIGJlbG93KSBhcmVcbiAgICAgICAgICAgICAgICAvLyAgIG1hcmtlZCB3aXRoIG51bGwsIHNvIHdlIGFsd2F5cyBhZHZhbmNlIG9sZCBwb2ludGVycyBvdmVyXG4gICAgICAgICAgICAgICAgLy8gICB0aGVzZSBzbyB3ZSdyZSBjb21wYXJpbmcgdGhlIG5leHQgYWN0dWFsIG9sZCB2YWx1ZSBvblxuICAgICAgICAgICAgICAgIC8vICAgZWl0aGVyIGVuZC5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICogRXhhbXBsZSBiZWxvdzogYG9sZEhlYWRgIGlzIG51bGwgKGFscmVhZHkgcGxhY2VkIGluXG4gICAgICAgICAgICAgICAgLy8gICBuZXdQYXJ0cyksIHNvIGFkdmFuY2UgYG9sZEhlYWRgLlxuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgICBvbGRIZWFkIHYgICAgIHYgb2xkVGFpbFxuICAgICAgICAgICAgICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAtLCAzLCA0LCA1LCA2XSA8LSBvbGQgaGVhZCBhbHJlYWR5IHVzZWQ6XG4gICAgICAgICAgICAgICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsICAsICAsICAsIDZdICAgIGFkdmFuY2Ugb2xkSGVhZFxuICAgICAgICAgICAgICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XVxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgbmV3SGVhZCBeICAgICBeIG5ld1RhaWxcbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICogTm90ZSBpdCdzIG5vdCBjcml0aWNhbCB0byBtYXJrIG9sZCBwYXJ0cyBhcyBudWxsIHdoZW4gdGhleVxuICAgICAgICAgICAgICAgIC8vICAgYXJlIG1vdmVkIGZyb20gaGVhZCB0byB0YWlsIG9yIHRhaWwgdG8gaGVhZCwgc2luY2UgdGhleVxuICAgICAgICAgICAgICAgIC8vICAgd2lsbCBiZSBvdXRzaWRlIHRoZSBwb2ludGVyIHJhbmdlIGFuZCBuZXZlciB2aXNpdGVkIGFnYWluLlxuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gKiBFeGFtcGxlIGJlbG93OiBIZXJlIHRoZSBvbGQgdGFpbCBrZXkgbWF0Y2hlcyB0aGUgbmV3IGhlYWRcbiAgICAgICAgICAgICAgICAvLyAgIGtleSwgc28gdGhlIHBhcnQgYXQgdGhlIGBvbGRUYWlsYCBwb3NpdGlvbiBhbmQgbW92ZSBpdHNcbiAgICAgICAgICAgICAgICAvLyAgIERPTSB0byB0aGUgbmV3IGhlYWQgcG9zaXRpb24gKGJlZm9yZSBgb2xkUGFydHNbb2xkSGVhZF1gKS5cbiAgICAgICAgICAgICAgICAvLyAgIExhc3QsIGFkdmFuY2UgYG9sZFRhaWxgIGFuZCBgbmV3SGVhZGAgcG9pbnRlcnMuXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgIG9sZEhlYWQgdiAgdiBvbGRUYWlsXG4gICAgICAgICAgICAgICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgICAgICAgICAgICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsIDQsICAsICAsIDZdIDwtIG9sZCB0YWlsIG1hdGNoZXMgbmV3XG4gICAgICAgICAgICAgICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgaGVhZDogdXBkYXRlICYgbW92ZSA0LFxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkdmFuY2Ugb2xkVGFpbCAmIG5ld0hlYWRcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgIG5ld0hlYWQgXiAgICAgXiBuZXdUYWlsXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IE9sZCBhbmQgbmV3IGhlYWQga2V5cyBtYXRjaCwgc28gdXBkYXRlIHRoZVxuICAgICAgICAgICAgICAgIC8vICAgb2xkIGhlYWQgcGFydCBpbiBwbGFjZSwgYW5kIGFkdmFuY2UgdGhlIGBvbGRIZWFkYCBhbmRcbiAgICAgICAgICAgICAgICAvLyAgIGBuZXdIZWFkYCBwb2ludGVycy5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgb2xkSGVhZCB2IG9sZFRhaWxcbiAgICAgICAgICAgICAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgLSwgMywgNCwgNSwgNl1cbiAgICAgICAgICAgICAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgMSwgNCwgMywgICAsNl0gPC0gaGVhZHMgbWF0Y2g6IHVwZGF0ZSAzXG4gICAgICAgICAgICAgICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIG9sZEhlYWQgJlxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdIZWFkXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICBuZXdIZWFkIF4gIF4gbmV3VGFpbFxuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gKiBPbmNlIHRoZSBuZXcgb3Igb2xkIHBvaW50ZXJzIG1vdmUgcGFzdCBlYWNoIG90aGVyIHRoZW4gYWxsXG4gICAgICAgICAgICAgICAgLy8gICB3ZSBoYXZlIGxlZnQgaXMgYWRkaXRpb25zIChpZiBvbGQgbGlzdCBleGhhdXN0ZWQpIG9yXG4gICAgICAgICAgICAgICAgLy8gICByZW1vdmFscyAoaWYgbmV3IGxpc3QgZXhoYXVzdGVkKS4gVGhvc2UgYXJlIGhhbmRsZWQgaW4gdGhlXG4gICAgICAgICAgICAgICAgLy8gICBmaW5hbCB3aGlsZSBsb29wcyBhdCB0aGUgZW5kLlxuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gKiBFeGFtcGxlIGJlbG93OiBgb2xkSGVhZGAgZXhjZWVkZWQgYG9sZFRhaWxgLCBzbyB3ZSdyZSBkb25lXG4gICAgICAgICAgICAgICAgLy8gICB3aXRoIHRoZSBtYWluIGxvb3AuICBDcmVhdGUgdGhlIHJlbWFpbmluZyBwYXJ0IGFuZCBpbnNlcnRcbiAgICAgICAgICAgICAgICAvLyAgIGl0IGF0IHRoZSBuZXcgaGVhZCBwb3NpdGlvbiwgYW5kIHRoZSB1cGRhdGUgaXMgY29tcGxldGUuXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAob2xkSGVhZCA+IG9sZFRhaWwpXG4gICAgICAgICAgICAgICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdXG4gICAgICAgICAgICAgICAgLy8gICBuZXdQYXJ0czogWzAsIDIsIDEsIDQsIDMsIDcgLDZdIDwtIGNyZWF0ZSBhbmQgaW5zZXJ0IDdcbiAgICAgICAgICAgICAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl1cbiAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgIG5ld0hlYWQgXiBuZXdUYWlsXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAqIE5vdGUgdGhhdCB0aGUgb3JkZXIgb2YgdGhlIGlmL2Vsc2UgY2xhdXNlcyBpcyBub3RcbiAgICAgICAgICAgICAgICAvLyAgIGltcG9ydGFudCB0byB0aGUgYWxnb3JpdGhtLCBhcyBsb25nIGFzIHRoZSBudWxsIGNoZWNrc1xuICAgICAgICAgICAgICAgIC8vICAgY29tZSBmaXJzdCAodG8gZW5zdXJlIHdlJ3JlIGFsd2F5cyB3b3JraW5nIG9uIHZhbGlkIG9sZFxuICAgICAgICAgICAgICAgIC8vICAgcGFydHMpIGFuZCB0aGF0IHRoZSBmaW5hbCBlbHNlIGNsYXVzZSBjb21lcyBsYXN0IChzaW5jZVxuICAgICAgICAgICAgICAgIC8vICAgdGhhdCdzIHdoZXJlIHRoZSBleHBlbnNpdmUgbW92ZXMgb2NjdXIpLiBUaGUgb3JkZXIgb2ZcbiAgICAgICAgICAgICAgICAvLyAgIHJlbWFpbmluZyBjbGF1c2VzIGlzIGlzIGp1c3QgYSBzaW1wbGUgZ3Vlc3MgYXQgd2hpY2ggY2FzZXNcbiAgICAgICAgICAgICAgICAvLyAgIHdpbGwgYmUgbW9zdCBjb21tb24uXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAqIFRPRE8oa3NjaGFhZikgTm90ZSwgd2UgY291bGQgY2FsY3VsYXRlIHRoZSBsb25nZXN0XG4gICAgICAgICAgICAgICAgLy8gICBpbmNyZWFzaW5nIHN1YnNlcXVlbmNlIChMSVMpIG9mIG9sZCBpdGVtcyBpbiBuZXcgcG9zaXRpb24sXG4gICAgICAgICAgICAgICAgLy8gICBhbmQgb25seSBtb3ZlIHRob3NlIG5vdCBpbiB0aGUgTElTIHNldC4gSG93ZXZlciB0aGF0IGNvc3RzXG4gICAgICAgICAgICAgICAgLy8gICBPKG5sb2duKSB0aW1lIGFuZCBhZGRzIGEgYml0IG1vcmUgY29kZSwgYW5kIG9ubHkgaGVscHNcbiAgICAgICAgICAgICAgICAvLyAgIG1ha2UgcmFyZSB0eXBlcyBvZiBtdXRhdGlvbnMgcmVxdWlyZSBmZXdlciBtb3Zlcy4gVGhlXG4gICAgICAgICAgICAgICAgLy8gICBhYm92ZSBoYW5kbGVzIHJlbW92ZXMsIGFkZHMsIHJldmVyc2FsLCBzd2FwcywgYW5kIHNpbmdsZVxuICAgICAgICAgICAgICAgIC8vICAgbW92ZXMgb2YgY29udGlndW91cyBpdGVtcyBpbiBsaW5lYXIgdGltZSwgaW4gdGhlIG1pbmltdW1cbiAgICAgICAgICAgICAgICAvLyAgIG51bWJlciBvZiBtb3Zlcy4gQXMgdGhlIG51bWJlciBvZiBtdWx0aXBsZSBtb3ZlcyB3aGVyZSBMSVNcbiAgICAgICAgICAgICAgICAvLyAgIG1pZ2h0IGhlbHAgYXBwcm9hY2hlcyBhIHJhbmRvbSBzaHVmZmxlLCB0aGUgTElTXG4gICAgICAgICAgICAgICAgLy8gICBvcHRpbWl6YXRpb24gYmVjb21lcyBsZXNzIGhlbHBmdWwsIHNvIGl0IHNlZW1zIG5vdCB3b3J0aFxuICAgICAgICAgICAgICAgIC8vICAgdGhlIGNvZGUgYXQgdGhpcyBwb2ludC4gQ291bGQgcmVjb25zaWRlciBpZiBhIGNvbXBlbGxpbmdcbiAgICAgICAgICAgICAgICAvLyAgIGNhc2UgYXJpc2VzLlxuXG4gICAgICAgICAgICAgICAgd2hpbGUgKG9sZEhlYWQgPD0gb2xkVGFpbCAmJiBuZXdIZWFkIDw9IG5ld1RhaWwpIHtcbiAgICAgICAgICAgICAgICAgIGlmIChvbGRQYXJ0c1tvbGRIZWFkXSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBgbnVsbGAgbWVhbnMgb2xkIHBhcnQgYXQgaGVhZCBoYXMgYWxyZWFkeSBiZWVuIHVzZWRcbiAgICAgICAgICAgICAgICAgICAgLy8gYmVsb3c7IHNraXBcbiAgICAgICAgICAgICAgICAgICAgb2xkSGVhZCsrO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvbGRQYXJ0c1tvbGRUYWlsXSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBgbnVsbGAgbWVhbnMgb2xkIHBhcnQgYXQgdGFpbCBoYXMgYWxyZWFkeSBiZWVuIHVzZWRcbiAgICAgICAgICAgICAgICAgICAgLy8gYmVsb3c7IHNraXBcbiAgICAgICAgICAgICAgICAgICAgb2xkVGFpbC0tO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvbGRLZXlzW29sZEhlYWRdID09PSBuZXdLZXlzW25ld0hlYWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9sZCBoZWFkIG1hdGNoZXMgbmV3IGhlYWQ7IHVwZGF0ZSBpbiBwbGFjZVxuICAgICAgICAgICAgICAgICAgICBuZXdQYXJ0c1tuZXdIZWFkXSA9XG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVQYXJ0KG9sZFBhcnRzW29sZEhlYWRdISwgbmV3VmFsdWVzW25ld0hlYWRdKTtcbiAgICAgICAgICAgICAgICAgICAgb2xkSGVhZCsrO1xuICAgICAgICAgICAgICAgICAgICBuZXdIZWFkKys7XG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9sZEtleXNbb2xkVGFpbF0gPT09IG5ld0tleXNbbmV3VGFpbF0pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gT2xkIHRhaWwgbWF0Y2hlcyBuZXcgdGFpbDsgdXBkYXRlIGluIHBsYWNlXG4gICAgICAgICAgICAgICAgICAgIG5ld1BhcnRzW25ld1RhaWxdID1cbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVBhcnQob2xkUGFydHNbb2xkVGFpbF0hLCBuZXdWYWx1ZXNbbmV3VGFpbF0pO1xuICAgICAgICAgICAgICAgICAgICBvbGRUYWlsLS07XG4gICAgICAgICAgICAgICAgICAgIG5ld1RhaWwtLTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob2xkS2V5c1tvbGRIZWFkXSA9PT0gbmV3S2V5c1tuZXdUYWlsXSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBPbGQgaGVhZCBtYXRjaGVzIG5ldyB0YWlsOyB1cGRhdGUgYW5kIG1vdmUgdG8gbmV3IHRhaWxcbiAgICAgICAgICAgICAgICAgICAgbmV3UGFydHNbbmV3VGFpbF0gPVxuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlUGFydChvbGRQYXJ0c1tvbGRIZWFkXSEsIG5ld1ZhbHVlc1tuZXdUYWlsXSk7XG4gICAgICAgICAgICAgICAgICAgIGluc2VydFBhcnRCZWZvcmUoXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJQYXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgb2xkUGFydHNbb2xkSGVhZF0hLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3UGFydHNbbmV3VGFpbCArIDFdKTtcbiAgICAgICAgICAgICAgICAgICAgb2xkSGVhZCsrO1xuICAgICAgICAgICAgICAgICAgICBuZXdUYWlsLS07XG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9sZEtleXNbb2xkVGFpbF0gPT09IG5ld0tleXNbbmV3SGVhZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gT2xkIHRhaWwgbWF0Y2hlcyBuZXcgaGVhZDsgdXBkYXRlIGFuZCBtb3ZlIHRvIG5ldyBoZWFkXG4gICAgICAgICAgICAgICAgICAgIG5ld1BhcnRzW25ld0hlYWRdID1cbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVBhcnQob2xkUGFydHNbb2xkVGFpbF0hLCBuZXdWYWx1ZXNbbmV3SGVhZF0pO1xuICAgICAgICAgICAgICAgICAgICBpbnNlcnRQYXJ0QmVmb3JlKFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyUGFydCwgb2xkUGFydHNbb2xkVGFpbF0hLCBvbGRQYXJ0c1tvbGRIZWFkXSEpO1xuICAgICAgICAgICAgICAgICAgICBvbGRUYWlsLS07XG4gICAgICAgICAgICAgICAgICAgIG5ld0hlYWQrKztcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXdLZXlUb0luZGV4TWFwID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBMYXppbHkgZ2VuZXJhdGUga2V5LXRvLWluZGV4IG1hcHMsIHVzZWQgZm9yIHJlbW92YWxzICZcbiAgICAgICAgICAgICAgICAgICAgICAvLyBtb3ZlcyBiZWxvd1xuICAgICAgICAgICAgICAgICAgICAgIG5ld0tleVRvSW5kZXhNYXAgPSBnZW5lcmF0ZU1hcChuZXdLZXlzLCBuZXdIZWFkLCBuZXdUYWlsKTtcbiAgICAgICAgICAgICAgICAgICAgICBvbGRLZXlUb0luZGV4TWFwID0gZ2VuZXJhdGVNYXAob2xkS2V5cywgb2xkSGVhZCwgb2xkVGFpbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFuZXdLZXlUb0luZGV4TWFwLmhhcyhvbGRLZXlzW29sZEhlYWRdKSkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIE9sZCBoZWFkIGlzIG5vIGxvbmdlciBpbiBuZXcgbGlzdDsgcmVtb3ZlXG4gICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlUGFydChvbGRQYXJ0c1tvbGRIZWFkXSEpO1xuICAgICAgICAgICAgICAgICAgICAgIG9sZEhlYWQrKztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICghbmV3S2V5VG9JbmRleE1hcC5oYXMob2xkS2V5c1tvbGRUYWlsXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBPbGQgdGFpbCBpcyBubyBsb25nZXIgaW4gbmV3IGxpc3Q7IHJlbW92ZVxuICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZVBhcnQob2xkUGFydHNbb2xkVGFpbF0hKTtcbiAgICAgICAgICAgICAgICAgICAgICBvbGRUYWlsLS07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gQW55IG1pc21hdGNoZXMgYXQgdGhpcyBwb2ludCBhcmUgZHVlIHRvIGFkZGl0aW9ucyBvclxuICAgICAgICAgICAgICAgICAgICAgIC8vIG1vdmVzOyBzZWUgaWYgd2UgaGF2ZSBhbiBvbGQgcGFydCB3ZSBjYW4gcmV1c2UgYW5kIG1vdmVcbiAgICAgICAgICAgICAgICAgICAgICAvLyBpbnRvIHBsYWNlXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3Qgb2xkSW5kZXggPSBvbGRLZXlUb0luZGV4TWFwLmdldChuZXdLZXlzW25ld0hlYWRdKTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvbGRQYXJ0ID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb2xkSW5kZXggIT09IHVuZGVmaW5lZCA/IG9sZFBhcnRzW29sZEluZGV4XSA6IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKG9sZFBhcnQgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5vIG9sZCBwYXJ0IGZvciB0aGlzIHZhbHVlOyBjcmVhdGUgYSBuZXcgb25lIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW5zZXJ0IGl0XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdQYXJ0ID0gY3JlYXRlQW5kSW5zZXJ0UGFydChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJQYXJ0LCBvbGRQYXJ0c1tvbGRIZWFkXSEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlUGFydChuZXdQYXJ0LCBuZXdWYWx1ZXNbbmV3SGVhZF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3UGFydHNbbmV3SGVhZF0gPSBuZXdQYXJ0O1xuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXVzZSBvbGQgcGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3UGFydHNbbmV3SGVhZF0gPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVBhcnQob2xkUGFydCwgbmV3VmFsdWVzW25ld0hlYWRdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc2VydFBhcnRCZWZvcmUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyUGFydCwgb2xkUGFydCwgb2xkUGFydHNbb2xkSGVhZF0hKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgbWFya3MgdGhlIG9sZCBwYXJ0IGFzIGhhdmluZyBiZWVuIHVzZWQsIHNvIHRoYXRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGl0IHdpbGwgYmUgc2tpcHBlZCBpbiB0aGUgZmlyc3QgdHdvIGNoZWNrcyBhYm92ZVxuICAgICAgICAgICAgICAgICAgICAgICAgb2xkUGFydHNbb2xkSW5kZXggYXMgbnVtYmVyXSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIG5ld0hlYWQrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBBZGQgcGFydHMgZm9yIGFueSByZW1haW5pbmcgbmV3IHZhbHVlc1xuICAgICAgICAgICAgICAgIHdoaWxlIChuZXdIZWFkIDw9IG5ld1RhaWwpIHtcbiAgICAgICAgICAgICAgICAgIC8vIEZvciBhbGwgcmVtYWluaW5nIGFkZGl0aW9ucywgd2UgaW5zZXJ0IGJlZm9yZSBsYXN0IG5ld1xuICAgICAgICAgICAgICAgICAgLy8gdGFpbCwgc2luY2Ugb2xkIHBvaW50ZXJzIGFyZSBubyBsb25nZXIgdmFsaWRcbiAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1BhcnQgPVxuICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZUFuZEluc2VydFBhcnQoY29udGFpbmVyUGFydCwgbmV3UGFydHNbbmV3VGFpbCArIDFdKTtcbiAgICAgICAgICAgICAgICAgIHVwZGF0ZVBhcnQobmV3UGFydCwgbmV3VmFsdWVzW25ld0hlYWRdKTtcbiAgICAgICAgICAgICAgICAgIG5ld1BhcnRzW25ld0hlYWQrK10gPSBuZXdQYXJ0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgYW55IHJlbWFpbmluZyB1bnVzZWQgb2xkIHBhcnRzXG4gICAgICAgICAgICAgICAgd2hpbGUgKG9sZEhlYWQgPD0gb2xkVGFpbCkge1xuICAgICAgICAgICAgICAgICAgY29uc3Qgb2xkUGFydCA9IG9sZFBhcnRzW29sZEhlYWQrK107XG4gICAgICAgICAgICAgICAgICBpZiAob2xkUGFydCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICByZW1vdmVQYXJ0KG9sZFBhcnQpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBTYXZlIG9yZGVyIG9mIG5ldyBwYXJ0cyBmb3IgbmV4dCByb3VuZFxuICAgICAgICAgICAgICAgIHBhcnRMaXN0Q2FjaGUuc2V0KGNvbnRhaW5lclBhcnQsIG5ld1BhcnRzKTtcbiAgICAgICAgICAgICAgICBrZXlMaXN0Q2FjaGUuc2V0KGNvbnRhaW5lclBhcnQsIG5ld0tleXMpO1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSkgYXNcbiAgICA8VD4oaXRlbXM6IEl0ZXJhYmxlPFQ+LFxuICAgICAgICBrZXlGbk9yVGVtcGxhdGU6IEtleUZuPFQ+fEl0ZW1UZW1wbGF0ZTxUPixcbiAgICAgICAgdGVtcGxhdGU/OiBJdGVtVGVtcGxhdGU8VD4pID0+IERpcmVjdGl2ZUZuO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE4IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuXG5pbXBvcnQge0F0dHJpYnV0ZVBhcnQsIGRpcmVjdGl2ZSwgUGFydCwgUHJvcGVydHlQYXJ0fSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3R5bGVJbmZvIHtcbiAgcmVhZG9ubHkgW25hbWU6IHN0cmluZ106IHN0cmluZztcbn1cblxuLyoqXG4gKiBTdG9yZXMgdGhlIFN0eWxlSW5mbyBvYmplY3QgYXBwbGllZCB0byBhIGdpdmVuIEF0dHJpYnV0ZVBhcnQuXG4gKiBVc2VkIHRvIHVuc2V0IGV4aXN0aW5nIHZhbHVlcyB3aGVuIGEgbmV3IFN0eWxlSW5mbyBvYmplY3QgaXMgYXBwbGllZC5cbiAqL1xuY29uc3QgcHJldmlvdXNTdHlsZVByb3BlcnR5Q2FjaGUgPSBuZXcgV2Vha01hcDxBdHRyaWJ1dGVQYXJ0LCBTZXQ8c3RyaW5nPj4oKTtcblxuLyoqXG4gKiBBIGRpcmVjdGl2ZSB0aGF0IGFwcGxpZXMgQ1NTIHByb3BlcnRpZXMgdG8gYW4gZWxlbWVudC5cbiAqXG4gKiBgc3R5bGVNYXBgIGNhbiBvbmx5IGJlIHVzZWQgaW4gdGhlIGBzdHlsZWAgYXR0cmlidXRlIGFuZCBtdXN0IGJlIHRoZSBvbmx5XG4gKiBleHByZXNzaW9uIGluIHRoZSBhdHRyaWJ1dGUuIEl0IHRha2VzIHRoZSBwcm9wZXJ0eSBuYW1lcyBpbiB0aGUgYHN0eWxlSW5mb2BcbiAqIG9iamVjdCBhbmQgYWRkcyB0aGUgcHJvcGVydHkgdmFsdWVzIGFzIENTUyBwcm9wZXJ0aWVzLiBQcm9wZXJ0eSBuYW1lcyB3aXRoXG4gKiBkYXNoZXMgKGAtYCkgYXJlIGFzc3VtZWQgdG8gYmUgdmFsaWQgQ1NTIHByb3BlcnR5IG5hbWVzIGFuZCBzZXQgb24gdGhlXG4gKiBlbGVtZW50J3Mgc3R5bGUgb2JqZWN0IHVzaW5nIGBzZXRQcm9wZXJ0eSgpYC4gTmFtZXMgd2l0aG91dCBkYXNoZXMgYXJlXG4gKiBhc3N1bWVkIHRvIGJlIGNhbWVsQ2FzZWQgSmF2YVNjcmlwdCBwcm9wZXJ0eSBuYW1lcyBhbmQgc2V0IG9uIHRoZSBlbGVtZW50J3NcbiAqIHN0eWxlIG9iamVjdCB1c2luZyBwcm9wZXJ0eSBhc3NpZ25tZW50LCBhbGxvd2luZyB0aGUgc3R5bGUgb2JqZWN0IHRvXG4gKiB0cmFuc2xhdGUgSmF2YVNjcmlwdC1zdHlsZSBuYW1lcyB0byBDU1MgcHJvcGVydHkgbmFtZXMuXG4gKlxuICogRm9yIGV4YW1wbGUgYHN0eWxlTWFwKHtiYWNrZ3JvdW5kQ29sb3I6ICdyZWQnLCAnYm9yZGVyLXRvcCc6ICc1cHgnLCAnLS1zaXplJzpcbiAqICcwJ30pYCBzZXRzIHRoZSBgYmFja2dyb3VuZC1jb2xvcmAsIGBib3JkZXItdG9wYCBhbmQgYC0tc2l6ZWAgcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0gc3R5bGVJbmZvIHtTdHlsZUluZm99XG4gKi9cbmV4cG9ydCBjb25zdCBzdHlsZU1hcCA9IGRpcmVjdGl2ZSgoc3R5bGVJbmZvOiBTdHlsZUluZm8pID0+IChwYXJ0OiBQYXJ0KSA9PiB7XG4gIGlmICghKHBhcnQgaW5zdGFuY2VvZiBBdHRyaWJ1dGVQYXJ0KSB8fCAocGFydCBpbnN0YW5jZW9mIFByb3BlcnR5UGFydCkgfHxcbiAgICAgIHBhcnQuY29tbWl0dGVyLm5hbWUgIT09ICdzdHlsZScgfHwgcGFydC5jb21taXR0ZXIucGFydHMubGVuZ3RoID4gMSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1RoZSBgc3R5bGVNYXBgIGRpcmVjdGl2ZSBtdXN0IGJlIHVzZWQgaW4gdGhlIHN0eWxlIGF0dHJpYnV0ZSAnICtcbiAgICAgICAgJ2FuZCBtdXN0IGJlIHRoZSBvbmx5IHBhcnQgaW4gdGhlIGF0dHJpYnV0ZS4nKTtcbiAgfVxuXG4gIGNvbnN0IHtjb21taXR0ZXJ9ID0gcGFydDtcbiAgY29uc3Qge3N0eWxlfSA9IGNvbW1pdHRlci5lbGVtZW50IGFzIEhUTUxFbGVtZW50O1xuXG4gIGxldCBwcmV2aW91c1N0eWxlUHJvcGVydGllcyA9IHByZXZpb3VzU3R5bGVQcm9wZXJ0eUNhY2hlLmdldChwYXJ0KTtcblxuICBpZiAocHJldmlvdXNTdHlsZVByb3BlcnRpZXMgPT09IHVuZGVmaW5lZCkge1xuICAgIC8vIFdyaXRlIHN0YXRpYyBzdHlsZXMgb25jZVxuICAgIHN0eWxlLmNzc1RleHQgPSBjb21taXR0ZXIuc3RyaW5ncy5qb2luKCcgJyk7XG4gICAgcHJldmlvdXNTdHlsZVByb3BlcnR5Q2FjaGUuc2V0KHBhcnQsIHByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzID0gbmV3IFNldCgpKTtcbiAgfVxuXG4gIC8vIFJlbW92ZSBvbGQgcHJvcGVydGllcyB0aGF0IG5vIGxvbmdlciBleGlzdCBpbiBzdHlsZUluZm9cbiAgLy8gV2UgdXNlIGZvckVhY2goKSBpbnN0ZWFkIG9mIGZvci1vZiBzbyB0aGF0IHJlIGRvbid0IHJlcXVpcmUgZG93bi1sZXZlbFxuICAvLyBpdGVyYXRpb24uXG4gIHByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzLmZvckVhY2goKG5hbWUpID0+IHtcbiAgICBpZiAoIShuYW1lIGluIHN0eWxlSW5mbykpIHtcbiAgICAgIHByZXZpb3VzU3R5bGVQcm9wZXJ0aWVzIS5kZWxldGUobmFtZSk7XG4gICAgICBpZiAobmFtZS5pbmRleE9mKCctJykgPT09IC0xKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgICAgIChzdHlsZSBhcyBhbnkpW25hbWVdID0gbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0eWxlLnJlbW92ZVByb3BlcnR5KG5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgLy8gQWRkIG9yIHVwZGF0ZSBwcm9wZXJ0aWVzXG4gIGZvciAoY29uc3QgbmFtZSBpbiBzdHlsZUluZm8pIHtcbiAgICBwcmV2aW91c1N0eWxlUHJvcGVydGllcy5hZGQobmFtZSk7XG4gICAgaWYgKG5hbWUuaW5kZXhPZignLScpID09PSAtMSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgIChzdHlsZSBhcyBhbnkpW25hbWVdID0gc3R5bGVJbmZvW25hbWVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHlsZS5zZXRQcm9wZXJ0eShuYW1lLCBzdHlsZUluZm9bbmFtZV0pO1xuICAgIH1cbiAgfVxufSk7XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG5cbmltcG9ydCB7aXNQcmltaXRpdmV9IGZyb20gJy4uL2xpYi9wYXJ0cy5qcyc7XG5pbXBvcnQge2RpcmVjdGl2ZSwgTm9kZVBhcnQsIFBhcnR9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcblxuaW50ZXJmYWNlIFByZXZpb3VzVmFsdWUge1xuICByZWFkb25seSB2YWx1ZTogdW5rbm93bjtcbiAgcmVhZG9ubHkgZnJhZ21lbnQ6IERvY3VtZW50RnJhZ21lbnQ7XG59XG5cbi8vIEZvciBlYWNoIHBhcnQsIHJlbWVtYmVyIHRoZSB2YWx1ZSB0aGF0IHdhcyBsYXN0IHJlbmRlcmVkIHRvIHRoZSBwYXJ0IGJ5IHRoZVxuLy8gdW5zYWZlSFRNTCBkaXJlY3RpdmUsIGFuZCB0aGUgRG9jdW1lbnRGcmFnbWVudCB0aGF0IHdhcyBsYXN0IHNldCBhcyBhIHZhbHVlLlxuLy8gVGhlIERvY3VtZW50RnJhZ21lbnQgaXMgdXNlZCBhcyBhIHVuaXF1ZSBrZXkgdG8gY2hlY2sgaWYgdGhlIGxhc3QgdmFsdWVcbi8vIHJlbmRlcmVkIHRvIHRoZSBwYXJ0IHdhcyB3aXRoIHVuc2FmZUhUTUwuIElmIG5vdCwgd2UnbGwgYWx3YXlzIHJlLXJlbmRlciB0aGVcbi8vIHZhbHVlIHBhc3NlZCB0byB1bnNhZmVIVE1MLlxuY29uc3QgcHJldmlvdXNWYWx1ZXMgPSBuZXcgV2Vha01hcDxOb2RlUGFydCwgUHJldmlvdXNWYWx1ZT4oKTtcblxuLyoqXG4gKiBSZW5kZXJzIHRoZSByZXN1bHQgYXMgSFRNTCwgcmF0aGVyIHRoYW4gdGV4dC5cbiAqXG4gKiBOb3RlLCB0aGlzIGlzIHVuc2FmZSB0byB1c2Ugd2l0aCBhbnkgdXNlci1wcm92aWRlZCBpbnB1dCB0aGF0IGhhc24ndCBiZWVuXG4gKiBzYW5pdGl6ZWQgb3IgZXNjYXBlZCwgYXMgaXQgbWF5IGxlYWQgdG8gY3Jvc3Mtc2l0ZS1zY3JpcHRpbmdcbiAqIHZ1bG5lcmFiaWxpdGllcy5cbiAqL1xuZXhwb3J0IGNvbnN0IHVuc2FmZUhUTUwgPSBkaXJlY3RpdmUoKHZhbHVlOiB1bmtub3duKSA9PiAocGFydDogUGFydCk6IHZvaWQgPT4ge1xuICBpZiAoIShwYXJ0IGluc3RhbmNlb2YgTm9kZVBhcnQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd1bnNhZmVIVE1MIGNhbiBvbmx5IGJlIHVzZWQgaW4gdGV4dCBiaW5kaW5ncycpO1xuICB9XG5cbiAgY29uc3QgcHJldmlvdXNWYWx1ZSA9IHByZXZpb3VzVmFsdWVzLmdldChwYXJ0KTtcblxuICBpZiAocHJldmlvdXNWYWx1ZSAhPT0gdW5kZWZpbmVkICYmIGlzUHJpbWl0aXZlKHZhbHVlKSAmJlxuICAgICAgdmFsdWUgPT09IHByZXZpb3VzVmFsdWUudmFsdWUgJiYgcGFydC52YWx1ZSA9PT0gcHJldmlvdXNWYWx1ZS5mcmFnbWVudCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHRlbXBsYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgdGVtcGxhdGUuaW5uZXJIVE1MID0gdmFsdWUgYXMgc3RyaW5nOyAgLy8gaW5uZXJIVE1MIGNhc3RzIHRvIHN0cmluZyBpbnRlcm5hbGx5XG4gIGNvbnN0IGZyYWdtZW50ID0gZG9jdW1lbnQuaW1wb3J0Tm9kZSh0ZW1wbGF0ZS5jb250ZW50LCB0cnVlKTtcbiAgcGFydC5zZXRWYWx1ZShmcmFnbWVudCk7XG4gIHByZXZpb3VzVmFsdWVzLnNldChwYXJ0LCB7dmFsdWUsIGZyYWdtZW50fSk7XG59KTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cblxuaW1wb3J0IHtpc1ByaW1pdGl2ZX0gZnJvbSAnLi4vbGliL3BhcnRzLmpzJztcbmltcG9ydCB7ZGlyZWN0aXZlLCBQYXJ0fSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5cbmludGVyZmFjZSBBc3luY1N0YXRlIHtcbiAgLyoqXG4gICAqIFRoZSBsYXN0IHJlbmRlcmVkIGluZGV4IG9mIGEgY2FsbCB0byB1bnRpbCgpLiBBIHZhbHVlIG9ubHkgcmVuZGVycyBpZiBpdHNcbiAgICogaW5kZXggaXMgbGVzcyB0aGFuIHRoZSBgbGFzdFJlbmRlcmVkSW5kZXhgLlxuICAgKi9cbiAgbGFzdFJlbmRlcmVkSW5kZXg6IG51bWJlcjtcblxuICB2YWx1ZXM6IHVua25vd25bXTtcbn1cblxuY29uc3QgX3N0YXRlID0gbmV3IFdlYWtNYXA8UGFydCwgQXN5bmNTdGF0ZT4oKTtcbi8vIEVmZmVjdGl2ZWx5IGluZmluaXR5LCBidXQgYSBTTUkuXG5jb25zdCBfaW5maW5pdHkgPSAweDdmZmZmZmZmO1xuXG4vKipcbiAqIFJlbmRlcnMgb25lIG9mIGEgc2VyaWVzIG9mIHZhbHVlcywgaW5jbHVkaW5nIFByb21pc2VzLCB0byBhIFBhcnQuXG4gKlxuICogVmFsdWVzIGFyZSByZW5kZXJlZCBpbiBwcmlvcml0eSBvcmRlciwgd2l0aCB0aGUgZmlyc3QgYXJndW1lbnQgaGF2aW5nIHRoZVxuICogaGlnaGVzdCBwcmlvcml0eSBhbmQgdGhlIGxhc3QgYXJndW1lbnQgaGF2aW5nIHRoZSBsb3dlc3QgcHJpb3JpdHkuIElmIGFcbiAqIHZhbHVlIGlzIGEgUHJvbWlzZSwgbG93LXByaW9yaXR5IHZhbHVlcyB3aWxsIGJlIHJlbmRlcmVkIHVudGlsIGl0IHJlc29sdmVzLlxuICpcbiAqIFRoZSBwcmlvcml0eSBvZiB2YWx1ZXMgY2FuIGJlIHVzZWQgdG8gY3JlYXRlIHBsYWNlaG9sZGVyIGNvbnRlbnQgZm9yIGFzeW5jXG4gKiBkYXRhLiBGb3IgZXhhbXBsZSwgYSBQcm9taXNlIHdpdGggcGVuZGluZyBjb250ZW50IGNhbiBiZSB0aGUgZmlyc3QsXG4gKiBoaWdoZXN0LXByaW9yaXR5LCBhcmd1bWVudCwgYW5kIGEgbm9uX3Byb21pc2UgbG9hZGluZyBpbmRpY2F0b3IgdGVtcGxhdGUgY2FuXG4gKiBiZSB1c2VkIGFzIHRoZSBzZWNvbmQsIGxvd2VyLXByaW9yaXR5LCBhcmd1bWVudC4gVGhlIGxvYWRpbmcgaW5kaWNhdG9yIHdpbGxcbiAqIHJlbmRlciBpbW1lZGlhdGVseSwgYW5kIHRoZSBwcmltYXJ5IGNvbnRlbnQgd2lsbCByZW5kZXIgd2hlbiB0aGUgUHJvbWlzZVxuICogcmVzb2x2ZXMuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiAgICAgY29uc3QgY29udGVudCA9IGZldGNoKCcuL2NvbnRlbnQudHh0JykudGhlbihyID0+IHIudGV4dCgpKTtcbiAqICAgICBodG1sYCR7dW50aWwoY29udGVudCwgaHRtbGA8c3Bhbj5Mb2FkaW5nLi4uPC9zcGFuPmApfWBcbiAqL1xuZXhwb3J0IGNvbnN0IHVudGlsID0gZGlyZWN0aXZlKCguLi5hcmdzOiB1bmtub3duW10pID0+IChwYXJ0OiBQYXJ0KSA9PiB7XG4gIGxldCBzdGF0ZSA9IF9zdGF0ZS5nZXQocGFydCkhO1xuICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZCkge1xuICAgIHN0YXRlID0ge1xuICAgICAgbGFzdFJlbmRlcmVkSW5kZXg6IF9pbmZpbml0eSxcbiAgICAgIHZhbHVlczogW10sXG4gICAgfTtcbiAgICBfc3RhdGUuc2V0KHBhcnQsIHN0YXRlKTtcbiAgfVxuICBjb25zdCBwcmV2aW91c1ZhbHVlcyA9IHN0YXRlLnZhbHVlcztcbiAgbGV0IHByZXZpb3VzTGVuZ3RoID0gcHJldmlvdXNWYWx1ZXMubGVuZ3RoO1xuICBzdGF0ZS52YWx1ZXMgPSBhcmdzO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgIC8vIElmIHdlJ3ZlIHJlbmRlcmVkIGEgaGlnaGVyLXByaW9yaXR5IHZhbHVlIGFscmVhZHksIHN0b3AuXG4gICAgaWYgKGkgPiBzdGF0ZS5sYXN0UmVuZGVyZWRJbmRleCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWUgPSBhcmdzW2ldO1xuXG4gICAgLy8gUmVuZGVyIG5vbi1Qcm9taXNlIHZhbHVlcyBpbW1lZGlhdGVseVxuICAgIGlmIChpc1ByaW1pdGl2ZSh2YWx1ZSkgfHxcbiAgICAgICAgdHlwZW9mICh2YWx1ZSBhcyB7dGhlbj86IHVua25vd259KS50aGVuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBwYXJ0LnNldFZhbHVlKHZhbHVlKTtcbiAgICAgIHN0YXRlLmxhc3RSZW5kZXJlZEluZGV4ID0gaTtcbiAgICAgIC8vIFNpbmNlIGEgbG93ZXItcHJpb3JpdHkgdmFsdWUgd2lsbCBuZXZlciBvdmVyd3JpdGUgYSBoaWdoZXItcHJpb3JpdHlcbiAgICAgIC8vIHN5bmNocm9ub3VzIHZhbHVlLCB3ZSBjYW4gc3RvcCBwcm9jZXNzaW5nIG5vdy5cbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIElmIHRoaXMgaXMgYSBQcm9taXNlIHdlJ3ZlIGFscmVhZHkgaGFuZGxlZCwgc2tpcCBpdC5cbiAgICBpZiAoaSA8IHByZXZpb3VzTGVuZ3RoICYmIHZhbHVlID09PSBwcmV2aW91c1ZhbHVlc1tpXSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gV2UgaGF2ZSBhIFByb21pc2UgdGhhdCB3ZSBoYXZlbid0IHNlZW4gYmVmb3JlLCBzbyBwcmlvcml0aWVzIG1heSBoYXZlXG4gICAgLy8gY2hhbmdlZC4gRm9yZ2V0IHdoYXQgd2UgcmVuZGVyZWQgYmVmb3JlLlxuICAgIHN0YXRlLmxhc3RSZW5kZXJlZEluZGV4ID0gX2luZmluaXR5O1xuICAgIHByZXZpb3VzTGVuZ3RoID0gMDtcblxuICAgIFByb21pc2UucmVzb2x2ZSh2YWx1ZSkudGhlbigocmVzb2x2ZWRWYWx1ZTogdW5rbm93bikgPT4ge1xuICAgICAgY29uc3QgaW5kZXggPSBzdGF0ZS52YWx1ZXMuaW5kZXhPZih2YWx1ZSk7XG4gICAgICAvLyBJZiBzdGF0ZS52YWx1ZXMgZG9lc24ndCBjb250YWluIHRoZSB2YWx1ZSwgd2UndmUgcmUtcmVuZGVyZWQgd2l0aG91dFxuICAgICAgLy8gdGhlIHZhbHVlLCBzbyBkb24ndCByZW5kZXIgaXQuIFRoZW4sIG9ubHkgcmVuZGVyIGlmIHRoZSB2YWx1ZSBpc1xuICAgICAgLy8gaGlnaGVyLXByaW9yaXR5IHRoYW4gd2hhdCdzIGFscmVhZHkgYmVlbiByZW5kZXJlZC5cbiAgICAgIGlmIChpbmRleCA+IC0xICYmIGluZGV4IDwgc3RhdGUubGFzdFJlbmRlcmVkSW5kZXgpIHtcbiAgICAgICAgc3RhdGUubGFzdFJlbmRlcmVkSW5kZXggPSBpbmRleDtcbiAgICAgICAgcGFydC5zZXRWYWx1ZShyZXNvbHZlZFZhbHVlKTtcbiAgICAgICAgcGFydC5jb21taXQoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufSk7XG4iLCJleHBvcnQge1xuICAgIFRlbXBsYXRlUmVzdWx0LFxuICAgIFNWR1RlbXBsYXRlUmVzdWx0LFxuICAgIFJlbmRlck9wdGlvbnMsXG4gICAgUGFydCxcbiAgICBodG1sLFxuICAgIHN2ZyxcbiAgICByZW5kZXIsXG4gICAgcGFydHMsXG4gICAgZGlyZWN0aXZlLFxufSBmcm9tICdsaXQtaHRtbCc7XG5cbmltcG9ydCB7IFBhcnQsIERpcmVjdGl2ZUZuIH0gZnJvbSAnbGl0LWh0bWwnO1xuaW1wb3J0IHsgYXN5bmNBcHBlbmQgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2FzeW5jLWFwcGVuZCc7XG5pbXBvcnQgeyBhc3luY1JlcGxhY2UgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2FzeW5jLXJlcGxhY2UnO1xuaW1wb3J0IHsgY2FjaGUgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2NhY2hlJztcbmltcG9ydCB7IENsYXNzSW5mbywgY2xhc3NNYXAgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2NsYXNzLW1hcCc7XG5pbXBvcnQgeyBndWFyZCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvZ3VhcmQnO1xuaW1wb3J0IHsgaWZEZWZpbmVkIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9pZi1kZWZpbmVkJztcbmltcG9ydCB7IEtleUZuLCBJdGVtVGVtcGxhdGUsIHJlcGVhdCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvcmVwZWF0JztcbmltcG9ydCB7IFN0eWxlSW5mbywgc3R5bGVNYXAgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL3N0eWxlLW1hcCc7XG5pbXBvcnQgeyB1bnNhZmVIVE1MIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy91bnNhZmUtaHRtbCc7XG5pbXBvcnQgeyB1bnRpbCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvdW50aWwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlRGlyZWN0aXZlcyB7XG4gICAgYXN5bmNBcHBlbmQ6ICh2YWx1ZTogQXN5bmNJdGVyYWJsZTx1bmtub3duPiwgbWFwcGVyPzogKCh2OiB1bmtub3duLCBpbmRleD86IG51bWJlciB8IHVuZGVmaW5lZCkgPT4gdW5rbm93bikgfCB1bmRlZmluZWQpID0+IChwYXJ0OiBQYXJ0KSA9PiBQcm9taXNlPHZvaWQ+O1xuICAgIGFzeW5jUmVwbGFjZTogKHZhbHVlOiBBc3luY0l0ZXJhYmxlPHVua25vd24+LCBtYXBwZXI/OiAoKHY6IHVua25vd24sIGluZGV4PzogbnVtYmVyIHwgdW5kZWZpbmVkKSA9PiB1bmtub3duKSB8IHVuZGVmaW5lZCkgPT4gKHBhcnQ6IFBhcnQpID0+IFByb21pc2U8dm9pZD47XG4gICAgY2FjaGU6ICh2YWx1ZTogdW5rbm93bikgPT4gKHBhcnQ6IFBhcnQpID0+IHZvaWQ7XG4gICAgY2xhc3NNYXA6IChjbGFzc0luZm86IENsYXNzSW5mbykgPT4gKHBhcnQ6IFBhcnQpID0+IHZvaWQ7XG4gICAgZ3VhcmQ6ICh2YWx1ZTogdW5rbm93biwgZjogKCkgPT4gdW5rbm93bikgPT4gKHBhcnQ6IFBhcnQpID0+IHZvaWQ7XG4gICAgaWZEZWZpbmVkOiAodmFsdWU6IHVua25vd24pID0+IChwYXJ0OiBQYXJ0KSA9PiB2b2lkO1xuICAgIHJlcGVhdDogPFQ+KGl0ZW1zOiBJdGVyYWJsZTxUPiwga2V5Rm5PclRlbXBsYXRlOiBLZXlGbjxUPiB8IEl0ZW1UZW1wbGF0ZTxUPiwgdGVtcGxhdGU/OiBJdGVtVGVtcGxhdGU8VD4gfCB1bmRlZmluZWQpID0+IERpcmVjdGl2ZUZuO1xuICAgIHN0eWxlTWFwOiAoc3R5bGVJbmZvOiBTdHlsZUluZm8pID0+IChwYXJ0OiBQYXJ0KSA9PiB2b2lkO1xuICAgIHVuc2FmZUhUTUw6ICh2YWx1ZTogdW5rbm93bikgPT4gKHBhcnQ6IFBhcnQpID0+IHZvaWQ7XG4gICAgdW50aWw6ICguLi5hcmdzOiB1bmtub3duW10pID0+IChwYXJ0OiBQYXJ0KSA9PiB2b2lkO1xufVxuXG5leHBvcnQgY29uc3QgZGlyZWN0aXZlczogVGVtcGxhdGVEaXJlY3RpdmVzID0ge1xuICAgIGFzeW5jQXBwZW5kLFxuICAgIGFzeW5jUmVwbGFjZSxcbiAgICBjYWNoZSxcbiAgICBjbGFzc01hcCxcbiAgICBndWFyZCxcbiAgICBpZkRlZmluZWQsXG4gICAgcmVwZWF0LFxuICAgIHN0eWxlTWFwLFxuICAgIHVuc2FmZUhUTUwsXG4gICAgdW50aWwsXG59O1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGZyb20gYHN0cmluZ2AgdG8gYFRlbXBsYXRlU3RyaW5nc0FycmF5YC4gPGJyPlxuICogICAgIFRoaXMgbWV0aG9kIGlzIGhlbHBlciBicmlnZGdlIGZvciB0aGUgW1todG1sXV0gb3IgdGhlIFtbc3ZnXV0gYXJlIGFibGUgdG8gcmVjZWl2ZWQgcGxhaW4gc3RyaW5nLlxuICogQGphIGBzdHJpbmdgIOOCkiBgVGVtcGxhdGVTdHJpbmdzQXJyYXlg44Gr5aSJ5o+bLiA8YnI+XG4gKiAgICAgW1todG1sXV0g44KEIFtbc3ZnXV0g44GM5paH5a2X5YiX44KS5Y+X44GR5LuY44GR44KL44Gf44KB44Gu44OW44Oq44OD44K444Oh44K944OD44OJXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyB0b1RlbXBsYXRlU3RyaW5nc0FycmF5IGFzIGJyaWRnZSB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlJztcbiAqXG4gKiBjb25zdCByYXcgPSAnPHA+SGVsbG8gUmF3IFN0cmluZzwvcD4nO1xuICogcmVuZGVyKGh0bWwoYnJpZGdlKHJhdykpLCBkb2N1bWVudC5ib2R5KTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgcGxhaW4gc3RyaW5nLiBleCkgW1tKU1RdXSByZXR1cm5lZCB2YWx1ZS5cbiAqICAtIGBqYWAg44OX44Os44O844Oz5paH5a2X5YiXLiBleCkgW1tKU1RdXSDjga7miLvjgorlgKTjgarjganjgpLmg7PlrppcbiAqL1xuZXhwb3J0IGNvbnN0IHRvVGVtcGxhdGVTdHJpbmdzQXJyYXkgPSAoc3JjOiBzdHJpbmcpOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSA9PiB7XG4gICAgY29uc3QgdGE6IGFueSA9IFtzcmNdOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICB0YS5yYXcgPSBbc3JjXTtcbiAgICByZXR1cm4gdGE7XG59O1xuIl0sIm5hbWVzIjpbIl9fYXN5bmNWYWx1ZXMiLCJ0ZW1wbGF0ZUNhY2hlcyIsInByZXZpb3VzVmFsdWVzIiwiZGlyZWN0aXZlcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQTs7Ozs7Ozs7Ozs7OztBQW9CQSxNQUFNLFVBQVUsR0FBRyxJQUFJLE9BQU8sRUFBZ0IsQ0FBQztBQU8vQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztNQXdDYSxTQUFTLEdBQUcsQ0FBNkIsQ0FBSSxNQUNyRCxDQUFDLEdBQUcsSUFBZTtJQUNsQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUNyQixVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN4QixPQUFPLENBQUMsQ0FBQztBQUNYLENBQUMsRUFBTztBQUVMLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBVTtJQUNwQyxPQUFPLE9BQU8sQ0FBQyxLQUFLLFVBQVUsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RELENBQUM7O0FDNUVEOzs7Ozs7Ozs7Ozs7O0FBc0JBOzs7QUFHTyxNQUFNLFlBQVksR0FBRyxPQUFPLE1BQU0sS0FBSyxXQUFXO0lBQ3JELE1BQU0sQ0FBQyxjQUFjLElBQUksSUFBSTtJQUM1QixNQUFNLENBQUMsY0FBb0MsQ0FBQyx5QkFBeUI7UUFDbEUsU0FBUyxDQUFDO0FBRWxCOzs7OztBQUtPLE1BQU0sYUFBYSxHQUN0QixDQUFDLFNBQWUsRUFDZixLQUFnQixFQUNoQixNQUFpQixJQUFJLEVBQ3JCLFNBQW9CLElBQUk7SUFDdkIsT0FBTyxLQUFLLEtBQUssR0FBRyxFQUFFO1FBQ3BCLE1BQU0sQ0FBQyxHQUFHLEtBQU0sQ0FBQyxXQUFXLENBQUM7UUFDN0IsU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdkMsS0FBSyxHQUFHLENBQUMsQ0FBQztLQUNYO0FBQ0gsQ0FBQyxDQUFDO0FBRU47Ozs7QUFJTyxNQUFNLFdBQVcsR0FDcEIsQ0FBQyxTQUFlLEVBQUUsS0FBZ0IsRUFBRSxNQUFpQixJQUFJO0lBQ3ZELE9BQU8sS0FBSyxLQUFLLEdBQUcsRUFBRTtRQUNwQixNQUFNLENBQUMsR0FBRyxLQUFNLENBQUMsV0FBVyxDQUFDO1FBQzdCLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBTSxDQUFDLENBQUM7UUFDOUIsS0FBSyxHQUFHLENBQUMsQ0FBQztLQUNYO0FBQ0gsQ0FBQzs7QUMxREw7Ozs7Ozs7Ozs7Ozs7QUE0Q0E7Ozs7QUFJTyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUM7QUFFM0I7OztBQUdPLE1BQU0sT0FBTyxHQUFHLEVBQUU7O0FDckR6Qjs7Ozs7Ozs7Ozs7OztBQW9CQTs7OztBQUlPLE1BQU0sTUFBTSxHQUFHLFNBQVMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBRWxFOzs7O0FBSU8sTUFBTSxVQUFVLEdBQUcsT0FBTyxNQUFNLEtBQUssQ0FBQztBQUV0QyxNQUFNLFdBQVcsR0FBRyxJQUFJLE1BQU0sQ0FBQyxHQUFHLE1BQU0sSUFBSSxVQUFVLEVBQUUsQ0FBQyxDQUFDO0FBRWpFOzs7QUFHTyxNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQztBQUU1Qzs7O01BR2EsUUFBUTtJQUluQixZQUFZLE1BQXNCLEVBQUUsT0FBNEI7UUFIdkQsVUFBSyxHQUFtQixFQUFFLENBQUM7UUFJbEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFFdkIsTUFBTSxhQUFhLEdBQVcsRUFBRSxDQUFDO1FBQ2pDLE1BQU0sS0FBSyxHQUFXLEVBQUUsQ0FBQzs7UUFFekIsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUNwQyxPQUFPLENBQUMsT0FBTyxFQUNmLEdBQUcsK0NBQ0gsSUFBSSxFQUNKLEtBQUssQ0FBQyxDQUFDOzs7O1FBSVgsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2YsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sRUFBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUMsTUFBTSxFQUFDLEVBQUMsR0FBRyxNQUFNLENBQUM7UUFDM0MsT0FBTyxTQUFTLEdBQUcsTUFBTSxFQUFFO1lBQ3pCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQXFDLENBQUM7WUFDbEUsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFOzs7OztnQkFLakIsTUFBTSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFHLENBQUM7Z0JBQ2xDLFNBQVM7YUFDVjtZQUNELEtBQUssRUFBRSxDQUFDO1lBRVIsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLENBQUMsMEJBQTBCO2dCQUMvQyxJQUFLLElBQWdCLENBQUMsYUFBYSxFQUFFLEVBQUU7b0JBQ3JDLE1BQU0sVUFBVSxHQUFJLElBQWdCLENBQUMsVUFBVSxDQUFDO29CQUNoRCxNQUFNLEVBQUMsTUFBTSxFQUFDLEdBQUcsVUFBVSxDQUFDOzs7Ozs7b0JBTTVCLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztvQkFDZCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO3dCQUMvQixJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLEVBQUU7NEJBQ3RELEtBQUssRUFBRSxDQUFDO3lCQUNUO3FCQUNGO29CQUNELE9BQU8sS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUFFOzs7d0JBR2xCLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQzs7d0JBRXpDLE1BQU0sSUFBSSxHQUFHLHNCQUFzQixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7Ozs7O3dCQU01RCxNQUFNLG1CQUFtQixHQUNyQixJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsb0JBQW9CLENBQUM7d0JBQzlDLE1BQU0sY0FBYyxHQUNmLElBQWdCLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFFLENBQUM7d0JBQ3hELElBQWdCLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLENBQUM7d0JBQ3ZELE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7d0JBQ2xELElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUMsQ0FBQyxDQUFDO3dCQUNwRSxTQUFTLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7cUJBQ2pDO2lCQUNGO2dCQUNELElBQUssSUFBZ0IsQ0FBQyxPQUFPLEtBQUssVUFBVSxFQUFFO29CQUM1QyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNqQixNQUFNLENBQUMsV0FBVyxHQUFJLElBQTRCLENBQUMsT0FBTyxDQUFDO2lCQUM1RDthQUNGO2lCQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxDQUFDLHVCQUF1QjtnQkFDbkQsTUFBTSxJQUFJLEdBQUksSUFBYSxDQUFDLElBQUksQ0FBQztnQkFDakMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDN0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVcsQ0FBQztvQkFDaEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFDeEMsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7OztvQkFHckMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRTt3QkFDbEMsSUFBSSxNQUFZLENBQUM7d0JBQ2pCLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDbkIsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFOzRCQUNaLE1BQU0sR0FBRyxZQUFZLEVBQUUsQ0FBQzt5QkFDekI7NkJBQU07NEJBQ0wsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUM3QyxJQUFJLEtBQUssS0FBSyxJQUFJLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxFQUFFO2dDQUM5RCxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7b0NBQ2xDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDOzZCQUNoRTs0QkFDRCxNQUFNLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt5QkFDckM7d0JBQ0QsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ2xDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO3FCQUNqRDs7O29CQUdELElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsRUFBRTt3QkFDN0IsTUFBTSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQzt3QkFDMUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDMUI7eUJBQU07d0JBQ0osSUFBYSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7cUJBQzFDOztvQkFFRCxTQUFTLElBQUksU0FBUyxDQUFDO2lCQUN4QjthQUNGO2lCQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxDQUFDLDBCQUEwQjtnQkFDdEQsSUFBSyxJQUFnQixDQUFDLElBQUksS0FBSyxNQUFNLEVBQUU7b0JBQ3JDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFXLENBQUM7Ozs7O29CQUtoQyxJQUFJLElBQUksQ0FBQyxlQUFlLEtBQUssSUFBSSxJQUFJLEtBQUssS0FBSyxhQUFhLEVBQUU7d0JBQzVELEtBQUssRUFBRSxDQUFDO3dCQUNSLE1BQU0sQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7cUJBQzNDO29CQUNELGFBQWEsR0FBRyxLQUFLLENBQUM7b0JBQ3RCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDOzs7b0JBR3ZDLElBQUksSUFBSSxDQUFDLFdBQVcsS0FBSyxJQUFJLEVBQUU7d0JBQzVCLElBQWdCLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztxQkFDN0I7eUJBQU07d0JBQ0wsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDekIsS0FBSyxFQUFFLENBQUM7cUJBQ1Q7b0JBQ0QsU0FBUyxFQUFFLENBQUM7aUJBQ2I7cUJBQU07b0JBQ0wsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQ1gsT0FBTyxDQUFDLENBQUMsR0FBSSxJQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRTs7Ozs7d0JBS2pFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO3dCQUMzQyxTQUFTLEVBQUUsQ0FBQztxQkFDYjtpQkFDRjthQUNGO1NBQ0Y7O1FBR0QsS0FBSyxNQUFNLENBQUMsSUFBSSxhQUFhLEVBQUU7WUFDN0IsQ0FBQyxDQUFDLFVBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDOUI7S0FDRjtDQUNGO0FBRUQsTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUFXLEVBQUUsTUFBYztJQUMzQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDekMsT0FBTyxLQUFLLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssTUFBTSxDQUFDO0FBQ25ELENBQUMsQ0FBQztBQTJCSyxNQUFNLG9CQUFvQixHQUFHLENBQUMsSUFBa0IsS0FBSyxJQUFJLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBRTlFO0FBQ0E7QUFDTyxNQUFNLFlBQVksR0FBRyxNQUFNLFFBQVEsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUM7QUFFN0Q7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBMEJPLE1BQU0sc0JBQXNCO0FBQy9CO0FBQ0EsNElBQTRJOztBQ2xRaEo7Ozs7Ozs7Ozs7Ozs7QUF3QkE7Ozs7TUFJYSxnQkFBZ0I7SUFNM0IsWUFDSSxRQUFrQixFQUFFLFNBQTRCLEVBQ2hELE9BQXNCO1FBUFQsWUFBTyxHQUEwQixFQUFFLENBQUM7UUFRbkQsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7S0FDeEI7SUFFRCxNQUFNLENBQUMsTUFBMEI7UUFDL0IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ1YsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQy9CLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtnQkFDdEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUMxQjtZQUNELENBQUMsRUFBRSxDQUFDO1NBQ0w7UUFDRCxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDL0IsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFO2dCQUN0QixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDZjtTQUNGO0tBQ0Y7SUFFRCxNQUFNOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztRQXVDSixNQUFNLFFBQVEsR0FBRyxZQUFZO1lBQ3pCLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFxQjtZQUNqRSxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUU3RCxNQUFNLEtBQUssR0FBVyxFQUFFLENBQUM7UUFDekIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7O1FBRWxDLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FDcEMsUUFBUSxFQUNSLEdBQUcsK0NBQ0gsSUFBSSxFQUNKLEtBQUssQ0FBQyxDQUFDO1FBQ1gsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO1FBQ2xCLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztRQUNsQixJQUFJLElBQWtCLENBQUM7UUFDdkIsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDOztRQUU3QixPQUFPLFNBQVMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFO1lBQy9CLElBQUksR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDeEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUMvQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDN0IsU0FBUyxFQUFFLENBQUM7Z0JBQ1osU0FBUzthQUNWOzs7O1lBS0QsT0FBTyxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRTtnQkFDN0IsU0FBUyxFQUFFLENBQUM7Z0JBQ1osSUFBSSxJQUFLLENBQUMsUUFBUSxLQUFLLFVBQVUsRUFBRTtvQkFDakMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFLLENBQUMsQ0FBQztvQkFDbEIsTUFBTSxDQUFDLFdBQVcsR0FBSSxJQUE0QixDQUFDLE9BQU8sQ0FBQztpQkFDNUQ7Z0JBQ0QsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLE1BQU0sSUFBSSxFQUFFOzs7OztvQkFLdkMsTUFBTSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFHLENBQUM7b0JBQ2xDLElBQUksR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7aUJBQzFCO2FBQ0Y7O1lBR0QsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtnQkFDeEIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQy9ELElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSyxDQUFDLGVBQWdCLENBQUMsQ0FBQztnQkFDN0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDekI7aUJBQU07Z0JBQ0wsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUMxRCxJQUFlLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQzlEO1lBQ0QsU0FBUyxFQUFFLENBQUM7U0FDYjtRQUVELElBQUksWUFBWSxFQUFFO1lBQ2hCLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDN0IsY0FBYyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUNsQztRQUNELE9BQU8sUUFBUSxDQUFDO0tBQ2pCOzs7QUM3Skg7Ozs7Ozs7Ozs7Ozs7QUFzQkEsTUFBTSxhQUFhLEdBQUcsSUFBSSxNQUFNLEdBQUcsQ0FBQztBQUVwQzs7OztNQUlhLGNBQWM7SUFNekIsWUFDSSxPQUE2QixFQUFFLE1BQTBCLEVBQUUsSUFBWSxFQUN2RSxTQUE0QjtRQUM5QixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztLQUM1Qjs7OztJQUtELE9BQU87UUFDTCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDbEMsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2QsSUFBSSxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7UUFFN0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMxQixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7WUFrQjFCLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7Ozs7WUFJMUMsZ0JBQWdCLEdBQUcsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLElBQUksZ0JBQWdCO2dCQUNwRCxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxXQUFXLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Ozs7WUFJN0MsTUFBTSxjQUFjLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RELElBQUksY0FBYyxLQUFLLElBQUksRUFBRTs7Ozs7O2dCQU0zQixJQUFJLElBQUksQ0FBQyxJQUFJLGdCQUFnQixHQUFHLGFBQWEsR0FBRyxVQUFVLENBQUMsQ0FBQzthQUM3RDtpQkFBTTs7OztnQkFJTCxJQUFJLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLEtBQUssQ0FBQyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUM7b0JBQ3pELGNBQWMsQ0FBQyxDQUFDLENBQUMsR0FBRyxvQkFBb0IsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDO29CQUM1RCxNQUFNLENBQUM7YUFDWjtTQUNGO1FBQ0QsSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUVELGtCQUFrQjtRQUNoQixNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3BELFFBQVEsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BDLE9BQU8sUUFBUSxDQUFDO0tBQ2pCO0NBQ0Y7QUFFRDs7Ozs7OztNQU9hLGlCQUFrQixTQUFRLGNBQWM7SUFDbkQsT0FBTztRQUNMLE9BQU8sUUFBUSxLQUFLLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQztLQUN4QztJQUVELGtCQUFrQjtRQUNoQixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUM1QyxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO1FBQ2pDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxVQUFXLENBQUM7UUFDdkMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNoQyxhQUFhLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM5QyxPQUFPLFFBQVEsQ0FBQztLQUNqQjs7O0FDOUhIOzs7Ozs7Ozs7Ozs7O0FBNEJPLE1BQU0sV0FBVyxHQUFHLENBQUMsS0FBYztJQUN4QyxRQUNJLEtBQUssS0FBSyxJQUFJO1FBQ2QsRUFBRSxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUksT0FBTyxLQUFLLEtBQUssVUFBVSxDQUFDLEVBQUU7QUFDbkUsQ0FBQyxDQUFDO0FBQ0ssTUFBTSxVQUFVLEdBQUcsQ0FBQyxLQUFjO0lBQ3ZDLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7O1FBRXZCLENBQUMsRUFBRSxLQUFLLElBQUssS0FBYSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0FBQ25ELENBQUMsQ0FBQztBQUVGOzs7OztNQUthLGtCQUFrQjtJQU83QixZQUFZLE9BQWdCLEVBQUUsSUFBWSxFQUFFLE9BQThCO1FBRjFFLFVBQUssR0FBRyxJQUFJLENBQUM7UUFHWCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNoQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDMUMsSUFBSSxDQUFDLEtBQXlCLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1NBQ3pEO0tBQ0Y7Ozs7SUFLUyxXQUFXO1FBQ25CLE9BQU8sSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDaEM7SUFFUyxTQUFTO1FBQ2pCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDN0IsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDN0IsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBRWQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMxQixJQUFJLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25CLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0IsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFO2dCQUN0QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO2dCQUNyQixJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRTtvQkFDcEMsSUFBSSxJQUFJLE9BQU8sQ0FBQyxLQUFLLFFBQVEsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUMvQztxQkFBTTtvQkFDTCxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTt3QkFDakIsSUFBSSxJQUFJLE9BQU8sQ0FBQyxLQUFLLFFBQVEsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO3FCQUMvQztpQkFDRjthQUNGO1NBQ0Y7UUFFRCxJQUFJLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25CLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFFRCxNQUFNO1FBQ0osSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ2QsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7WUFDbkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFZLENBQUMsQ0FBQztTQUNsRTtLQUNGO0NBQ0Y7QUFFRDs7O01BR2EsYUFBYTtJQUl4QixZQUFZLFNBQTZCO1FBRnpDLFVBQUssR0FBWSxTQUFTLENBQUM7UUFHekIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7S0FDNUI7SUFFRCxRQUFRLENBQUMsS0FBYztRQUNyQixJQUFJLEtBQUssS0FBSyxRQUFRLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUN2RSxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQzs7OztZQUluQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUN2QixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7YUFDN0I7U0FDRjtLQUNGO0lBRUQsTUFBTTtRQUNKLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUM5QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQzdCLElBQUksQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDO1lBQ3RCLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNqQjtRQUNELElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUU7WUFDM0IsT0FBTztTQUNSO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztLQUN6QjtDQUNGO0FBRUQ7Ozs7Ozs7O01BUWEsUUFBUTtJQU9uQixZQUFZLE9BQXNCO1FBSGxDLFVBQUssR0FBWSxTQUFTLENBQUM7UUFDbkIsbUJBQWMsR0FBWSxTQUFTLENBQUM7UUFHMUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7S0FDeEI7Ozs7OztJQU9ELFVBQVUsQ0FBQyxTQUFlO1FBQ3hCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO0tBQ3REOzs7Ozs7OztJQVNELGVBQWUsQ0FBQyxHQUFTO1FBQ3ZCLElBQUksQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDO1FBQ3JCLElBQUksQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLFdBQVksQ0FBQztLQUNqQzs7Ozs7O0lBT0QsY0FBYyxDQUFDLElBQWM7UUFDM0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDL0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLFlBQVksRUFBRSxDQUFDLENBQUM7S0FDOUM7Ozs7OztJQU9ELGVBQWUsQ0FBQyxHQUFhO1FBQzNCLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBQzlDLElBQUksQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQztRQUMzQixHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7S0FDOUI7SUFFRCxRQUFRLENBQUMsS0FBYztRQUNyQixJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQztLQUM3QjtJQUVELE1BQU07UUFDSixJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxLQUFLLElBQUksRUFBRTtZQUN0QyxPQUFPO1NBQ1I7UUFDRCxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUU7WUFDdkMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztZQUN0QyxJQUFJLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQztZQUMvQixTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDakI7UUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDO1FBQ2xDLElBQUksS0FBSyxLQUFLLFFBQVEsRUFBRTtZQUN0QixPQUFPO1NBQ1I7UUFDRCxJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUN0QixJQUFJLEtBQUssS0FBSyxJQUFJLENBQUMsS0FBSyxFQUFFO2dCQUN4QixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQzFCO1NBQ0Y7YUFBTSxJQUFJLEtBQUssWUFBWSxjQUFjLEVBQUU7WUFDMUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ3BDO2FBQU0sSUFBSSxLQUFLLFlBQVksSUFBSSxFQUFFO1lBQ2hDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDMUI7YUFBTSxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUM1QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDOUI7YUFBTSxJQUFJLEtBQUssS0FBSyxPQUFPLEVBQUU7WUFDNUIsSUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUM7WUFDckIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1NBQ2Q7YUFBTTs7WUFFTCxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQzFCO0tBQ0Y7SUFFTyxRQUFRLENBQUMsSUFBVTtRQUN6QixJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVcsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUMzRDtJQUVPLFlBQVksQ0FBQyxLQUFXO1FBQzlCLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxLQUFLLEVBQUU7WUFDeEIsT0FBTztTQUNSO1FBQ0QsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyQixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztLQUNwQjtJQUVPLFlBQVksQ0FBQyxLQUFjO1FBQ2pDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBWSxDQUFDO1FBQ3pDLEtBQUssR0FBRyxLQUFLLElBQUksSUFBSSxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUM7OztRQUduQyxNQUFNLGFBQWEsR0FDZixPQUFPLEtBQUssS0FBSyxRQUFRLEdBQUcsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN0RCxJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWU7WUFDckMsSUFBSSxDQUFDLFFBQVEsS0FBSyxDQUFDLHVCQUF1Qjs7OztZQUkzQyxJQUFhLENBQUMsSUFBSSxHQUFHLGFBQWEsQ0FBQztTQUNyQzthQUFNO1lBQ0wsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7U0FDM0Q7UUFDRCxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztLQUNwQjtJQUVPLHNCQUFzQixDQUFDLEtBQXFCO1FBQ2xELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JELElBQUksSUFBSSxDQUFDLEtBQUssWUFBWSxnQkFBZ0I7WUFDdEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEtBQUssUUFBUSxFQUFFO1lBQ3BDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNqQzthQUFNOzs7OztZQUtMLE1BQU0sUUFBUSxHQUNWLElBQUksZ0JBQWdCLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2xFLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNuQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM5QixJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzVCLElBQUksQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDO1NBQ3ZCO0tBQ0Y7SUFFTyxnQkFBZ0IsQ0FBQyxLQUF3Qjs7Ozs7Ozs7OztRQVcvQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDOUIsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1NBQ2Q7OztRQUlELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFtQixDQUFDO1FBQzNDLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztRQUNsQixJQUFJLFFBQTRCLENBQUM7UUFFakMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7O1lBRXhCLFFBQVEsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7O1lBR2hDLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRTtnQkFDMUIsUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDdEMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDekIsSUFBSSxTQUFTLEtBQUssQ0FBQyxFQUFFO29CQUNuQixRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUMvQjtxQkFBTTtvQkFDTCxRQUFRLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDcEQ7YUFDRjtZQUNELFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEIsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLFNBQVMsRUFBRSxDQUFDO1NBQ2I7UUFFRCxJQUFJLFNBQVMsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFOztZQUVoQyxTQUFTLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQztZQUM3QixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDMUM7S0FDRjtJQUVELEtBQUssQ0FBQyxZQUFrQixJQUFJLENBQUMsU0FBUztRQUNwQyxXQUFXLENBQ1AsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFXLEVBQUUsU0FBUyxDQUFDLFdBQVksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDdkU7Q0FDRjtBQUVEOzs7Ozs7O01BT2Esb0JBQW9CO0lBTy9CLFlBQVksT0FBZ0IsRUFBRSxJQUFZLEVBQUUsT0FBMEI7UUFIdEUsVUFBSyxHQUFZLFNBQVMsQ0FBQztRQUNuQixtQkFBYyxHQUFZLFNBQVMsQ0FBQztRQUcxQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNsRSxNQUFNLElBQUksS0FBSyxDQUNYLHlEQUF5RCxDQUFDLENBQUM7U0FDaEU7UUFDRCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztLQUN4QjtJQUVELFFBQVEsQ0FBQyxLQUFjO1FBQ3JCLElBQUksQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDO0tBQzdCO0lBRUQsTUFBTTtRQUNKLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRTtZQUN2QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDO1lBQ3RDLElBQUksQ0FBQyxjQUFjLEdBQUcsUUFBUSxDQUFDO1lBQy9CLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNqQjtRQUNELElBQUksSUFBSSxDQUFDLGNBQWMsS0FBSyxRQUFRLEVBQUU7WUFDcEMsT0FBTztTQUNSO1FBQ0QsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUM7UUFDcEMsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLEtBQUssRUFBRTtZQUN4QixJQUFJLEtBQUssRUFBRTtnQkFDVCxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQzFDO2lCQUFNO2dCQUNMLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUN6QztZQUNELElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1NBQ3BCO1FBQ0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxRQUFRLENBQUM7S0FDaEM7Q0FDRjtBQUVEOzs7Ozs7Ozs7TUFTYSxpQkFBa0IsU0FBUSxrQkFBa0I7SUFHdkQsWUFBWSxPQUFnQixFQUFFLElBQVksRUFBRSxPQUE4QjtRQUN4RSxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsTUFBTTthQUNOLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0tBQ3RFO0lBRVMsV0FBVztRQUNuQixPQUFPLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQy9CO0lBRVMsU0FBUztRQUNqQixJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDZixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1NBQzVCO1FBQ0QsT0FBTyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7S0FDMUI7SUFFRCxNQUFNO1FBQ0osSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ2QsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7O1lBRWxCLElBQUksQ0FBQyxPQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztTQUNyRDtLQUNGO0NBQ0Y7TUFFWSxZQUFhLFNBQVEsYUFBYTtDQUFHO0FBRWxEO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSSxxQkFBcUIsR0FBRyxLQUFLLENBQUM7QUFFbEM7QUFDQTtBQUNBLENBQUM7SUFDQyxJQUFJO1FBQ0YsTUFBTSxPQUFPLEdBQUc7WUFDZCxJQUFJLE9BQU87Z0JBQ1QscUJBQXFCLEdBQUcsSUFBSSxDQUFDO2dCQUM3QixPQUFPLEtBQUssQ0FBQzthQUNkO1NBQ0YsQ0FBQzs7UUFFRixNQUFNLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLE9BQWMsRUFBRSxPQUFPLENBQUMsQ0FBQzs7UUFFekQsTUFBTSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxPQUFjLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FDN0Q7SUFBQyxPQUFPLEVBQUUsRUFBRTs7S0FFWjtBQUNILENBQUMsR0FBRyxDQUFDO01BSVEsU0FBUztJQVNwQixZQUFZLE9BQWdCLEVBQUUsU0FBaUIsRUFBRSxZQUEwQjtRQUwzRSxVQUFLLEdBQXNDLFNBQVMsQ0FBQztRQUU3QyxtQkFBYyxHQUFzQyxTQUFTLENBQUM7UUFJcEUsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDdkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7UUFDakMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDdEQ7SUFFRCxRQUFRLENBQUMsS0FBd0M7UUFDL0MsSUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7S0FDN0I7SUFFRCxNQUFNO1FBQ0osT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFO1lBQ3ZDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUM7WUFDdEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxRQUFtQyxDQUFDO1lBQzFELFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNqQjtRQUNELElBQUksSUFBSSxDQUFDLGNBQWMsS0FBSyxRQUFRLEVBQUU7WUFDcEMsT0FBTztTQUNSO1FBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUN4QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQy9CLE1BQU0sb0JBQW9CLEdBQUcsV0FBVyxJQUFJLElBQUk7WUFDNUMsV0FBVyxJQUFJLElBQUk7aUJBQ2QsV0FBVyxDQUFDLE9BQU8sS0FBSyxXQUFXLENBQUMsT0FBTztvQkFDM0MsV0FBVyxDQUFDLElBQUksS0FBSyxXQUFXLENBQUMsSUFBSTtvQkFDckMsV0FBVyxDQUFDLE9BQU8sS0FBSyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdEQsTUFBTSxpQkFBaUIsR0FDbkIsV0FBVyxJQUFJLElBQUksS0FBSyxXQUFXLElBQUksSUFBSSxJQUFJLG9CQUFvQixDQUFDLENBQUM7UUFFekUsSUFBSSxvQkFBb0IsRUFBRTtZQUN4QixJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUM1QixJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDOUQ7UUFDRCxJQUFJLGlCQUFpQixFQUFFO1lBQ3JCLElBQUksQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3pDLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQ3pCLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUM5RDtRQUNELElBQUksQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxjQUFjLEdBQUcsUUFBbUMsQ0FBQztLQUMzRDtJQUVELFdBQVcsQ0FBQyxLQUFZO1FBQ3RCLElBQUksT0FBTyxJQUFJLENBQUMsS0FBSyxLQUFLLFVBQVUsRUFBRTtZQUNwQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDM0Q7YUFBTTtZQUNKLElBQUksQ0FBQyxLQUE2QixDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUN4RDtLQUNGO0NBQ0Y7QUFFRDtBQUNBO0FBQ0E7QUFDQSxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQW9DLEtBQUssQ0FBQztLQUN6RCxxQkFBcUI7UUFDakIsRUFBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBQztRQUN0RCxDQUFDLENBQUMsT0FBa0MsQ0FBQzs7QUM1Z0I5Qzs7Ozs7Ozs7Ozs7OztBQXVCQTs7O01BR2Esd0JBQXdCOzs7Ozs7Ozs7O0lBVW5DLDBCQUEwQixDQUN0QixPQUFnQixFQUFFLElBQVksRUFBRSxPQUFpQixFQUNqRCxPQUFzQjtRQUN4QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkIsSUFBSSxNQUFNLEtBQUssR0FBRyxFQUFFO1lBQ2xCLE1BQU0sU0FBUyxHQUFHLElBQUksaUJBQWlCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDekUsT0FBTyxTQUFTLENBQUMsS0FBSyxDQUFDO1NBQ3hCO1FBQ0QsSUFBSSxNQUFNLEtBQUssR0FBRyxFQUFFO1lBQ2xCLE9BQU8sQ0FBQyxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztTQUN0RTtRQUNELElBQUksTUFBTSxLQUFLLEdBQUcsRUFBRTtZQUNsQixPQUFPLENBQUMsSUFBSSxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQ3BFO1FBQ0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2pFLE9BQU8sU0FBUyxDQUFDLEtBQUssQ0FBQztLQUN4Qjs7Ozs7SUFLRCxvQkFBb0IsQ0FBQyxPQUFzQjtRQUN6QyxPQUFPLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQzlCO0NBQ0Y7QUFFTSxNQUFNLHdCQUF3QixHQUFHLElBQUksd0JBQXdCLEVBQUU7O0FDOUR0RTs7Ozs7Ozs7Ozs7OztBQTJDQTs7OztTQUlnQixlQUFlLENBQUMsTUFBc0I7SUFDcEQsSUFBSSxhQUFhLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEQsSUFBSSxhQUFhLEtBQUssU0FBUyxFQUFFO1FBQy9CLGFBQWEsR0FBRztZQUNkLFlBQVksRUFBRSxJQUFJLE9BQU8sRUFBa0M7WUFDM0QsU0FBUyxFQUFFLElBQUksR0FBRyxFQUFvQjtTQUN2QyxDQUFDO1FBQ0YsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0tBQ2hEO0lBRUQsSUFBSSxRQUFRLEdBQUcsYUFBYSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzlELElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRTtRQUMxQixPQUFPLFFBQVEsQ0FBQztLQUNqQjs7O0lBSUQsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7O0lBR3hDLFFBQVEsR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM1QyxJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUU7O1FBRTFCLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQzs7UUFFN0QsYUFBYSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0tBQzVDOztJQUdELGFBQWEsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDekQsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQztBQWlCTSxNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsRUFBeUI7O0FDL0Y5RDs7Ozs7Ozs7Ozs7OztNQXVCYSxLQUFLLEdBQUcsSUFBSSxPQUFPLEdBQW1CO0FBRW5EOzs7Ozs7Ozs7Ozs7Ozs7TUFlYSxNQUFNLEdBQ2YsQ0FBQyxNQUFlLEVBQ2YsU0FBbUMsRUFDbkMsT0FBZ0M7SUFDL0IsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNoQyxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7UUFDdEIsV0FBVyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDN0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxHQUFHLElBQUksUUFBUSxpQkFDakIsZUFBZSxJQUNaLE9BQU8sRUFDVixDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUM1QjtJQUNELElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdEIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ2hCOztBQ3ZESjs7Ozs7Ozs7Ozs7OztBQXVEQTtBQUNBO0FBQ0E7QUFDQSxJQUFJLE9BQU8sTUFBTSxLQUFLLFdBQVcsRUFBRTtJQUNqQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztDQUMvRTtBQUVEOzs7O01BSWEsSUFBSSxHQUFHLENBQUMsT0FBNkIsRUFBRSxHQUFHLE1BQWlCLEtBQ3BFLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLHdCQUF3QixFQUFFO0FBRTFFOzs7O01BSWEsR0FBRyxHQUFHLENBQUMsT0FBNkIsRUFBRSxHQUFHLE1BQWlCLEtBQ25FLElBQUksaUJBQWlCLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsd0JBQXdCOztBQzFFMUU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBZ0JBOzs7Ozs7Ozs7Ozs7Ozs7OztBQWlCTyxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQ2hDLENBQUksS0FBdUIsRUFDdkIsTUFBMEMsS0FBSyxPQUFPLElBQVU7O0lBQ2xFLElBQUksRUFBRSxJQUFJLFlBQVksUUFBUSxDQUFDLEVBQUU7UUFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO0tBQ2xFOzs7SUFHRCxJQUFJLEtBQUssS0FBSyxJQUFJLENBQUMsS0FBSyxFQUFFO1FBQ3hCLE9BQU87S0FDUjtJQUNELElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDOzs7SUFJbkIsSUFBSSxRQUFRLENBQUM7SUFDYixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7O1FBRVYsS0FBb0IsSUFBQSxVQUFBLGNBQUEsS0FBSyxDQUFBLFdBQUE7WUFBZCxJQUFJLENBQUMsa0JBQUEsQ0FBQTs7O1lBR2QsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLEtBQUssRUFBRTtnQkFDeEIsTUFBTTthQUNQOzs7WUFJRCxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ1gsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2FBQ2Q7Ozs7O1lBTUQsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFOzs7Z0JBR3hCLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBTSxDQUFDO2FBQ3ZCOzs7Ozs7O1lBU0QsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQzs7WUFHbkMsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFOztnQkFFMUIsYUFBYSxHQUFHLFlBQVksRUFBRSxDQUFDOzs7O2dCQUkvQixRQUFRLENBQUMsT0FBTyxHQUFHLGFBQWEsQ0FBQztnQkFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFXLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDcEU7WUFDRCxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3RDLFFBQVEsQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDeEMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyQixRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEIsQ0FBQyxFQUFFLENBQUM7U0FDTDs7Ozs7Ozs7O0FBQ0gsQ0FBQyxDQUFDOztBQ25HTjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFnQkE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCTyxNQUFNLFlBQVksR0FBRyxTQUFTLENBQ2pDLENBQUksS0FBdUIsRUFBRSxNQUEwQyxLQUNuRSxPQUFPLElBQVU7O0lBQ2YsSUFBSSxFQUFFLElBQUksWUFBWSxRQUFRLENBQUMsRUFBRTtRQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLGdEQUFnRCxDQUFDLENBQUM7S0FDbkU7OztJQUdELElBQUksS0FBSyxLQUFLLElBQUksQ0FBQyxLQUFLLEVBQUU7UUFDeEIsT0FBTztLQUNSOzs7SUFJRCxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDNUMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFFbkIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDOztRQUVWLEtBQW9CLElBQUEsVUFBQUEsZ0JBQUEsS0FBSyxDQUFBLFdBQUE7WUFBZCxJQUFJLENBQUMsa0JBQUEsQ0FBQTs7O1lBR2QsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLEtBQUssRUFBRTtnQkFDeEIsTUFBTTthQUNQOzs7WUFJRCxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ1gsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNiLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDL0I7Ozs7O1lBTUQsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFOzs7Z0JBR3hCLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBTSxDQUFDO2FBQ3ZCO1lBRUQsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyQixRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEIsQ0FBQyxFQUFFLENBQUM7U0FDTDs7Ozs7Ozs7O0FBQ0gsQ0FBQyxDQUFDOztBQ2pGVjs7Ozs7Ozs7Ozs7OztBQXNCQSxNQUFNQyxnQkFBYyxHQUNoQixJQUFJLE9BQU8sRUFBK0MsQ0FBQztBQUUvRDs7Ozs7Ozs7Ozs7Ozs7QUFjTyxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsQ0FBQyxLQUFjLEtBQUssQ0FBQyxJQUFVO0lBQzVELElBQUksRUFBRSxJQUFJLFlBQVksUUFBUSxDQUFDLEVBQUU7UUFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO0tBQzVEO0lBRUQsSUFBSSxhQUFhLEdBQUdBLGdCQUFjLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRTdDLElBQUksYUFBYSxLQUFLLFNBQVMsRUFBRTtRQUMvQixhQUFhLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUM5QkEsZ0JBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0tBQ3pDO0lBRUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQzs7O0lBSWpDLElBQUksYUFBYSxZQUFZLGdCQUFnQixFQUFFO1FBQzdDLElBQUksS0FBSyxZQUFZLGNBQWM7WUFDL0IsYUFBYSxDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsRUFBRTs7WUFFbEUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNyQixPQUFPO1NBQ1I7YUFBTTs7WUFFTCxJQUFJLGNBQWMsR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMvRCxJQUFJLGNBQWMsS0FBSyxTQUFTLEVBQUU7Z0JBQ2hDLGNBQWMsR0FBRztvQkFDZixRQUFRLEVBQUUsYUFBYTtvQkFDdkIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRTtpQkFDekMsQ0FBQztnQkFDRixhQUFhLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsY0FBYyxDQUFDLENBQUM7YUFDM0Q7WUFDRCxhQUFhLENBQ1QsY0FBYyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDckU7S0FDRjs7SUFHRCxJQUFJLEtBQUssWUFBWSxjQUFjLEVBQUU7UUFDbkMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckQsTUFBTSxjQUFjLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRCxJQUFJLGNBQWMsS0FBSyxTQUFTLEVBQUU7O1lBRWhDLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3BDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQzs7WUFFZCxJQUFJLENBQUMsS0FBSyxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUM7U0FDdEM7S0FDRjtJQUNELElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDOztBQ3pGRjs7Ozs7Ozs7Ozs7OztBQWdCQTtBQUNBLE1BQU0sU0FBUztJQUtiLFlBQVksT0FBZ0I7UUFINUIsWUFBTyxHQUFnQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2pDLFlBQU8sR0FBRyxLQUFLLENBQUM7UUFHZCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixNQUFNLFNBQVMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyRSxLQUFLLE1BQU0sR0FBRyxJQUFJLFNBQVMsRUFBRTtZQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN2QjtLQUNGO0lBQ0QsR0FBRyxDQUFDLEdBQVc7UUFDYixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN0QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztLQUNyQjtJQUVELE1BQU0sQ0FBQyxHQUFXO1FBQ2hCLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO0tBQ3JCO0lBRUQsTUFBTTtRQUNKLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNoQixJQUFJLFdBQVcsR0FBRyxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEtBQUssV0FBVyxJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztZQUN4RCxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7U0FDakQ7S0FDRjtDQUNGO0FBTUQ7Ozs7QUFJQSxNQUFNLG9CQUFvQixHQUFHLElBQUksT0FBTyxFQUFxQixDQUFDO0FBRTlEOzs7Ozs7Ozs7QUFTTyxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsQ0FBQyxTQUFvQixLQUFLLENBQUMsSUFBVTtJQUNyRSxJQUFJLEVBQUUsSUFBSSxZQUFZLGFBQWEsQ0FBQyxLQUFLLElBQUksWUFBWSxZQUFZLENBQUM7UUFDbEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEtBQUssT0FBTyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDdEUsTUFBTSxJQUFJLEtBQUssQ0FDWCxpRUFBaUU7WUFDakUsNkNBQTZDLENBQUMsQ0FBQztLQUNwRDtJQUVELE1BQU0sRUFBQyxTQUFTLEVBQUMsR0FBRyxJQUFJLENBQUM7SUFDekIsTUFBTSxFQUFDLE9BQU8sRUFBQyxHQUFHLFNBQVMsQ0FBQztJQUU1QixJQUFJLGVBQWUsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDckQsSUFBSSxlQUFlLEtBQUssU0FBUyxFQUFFOzs7UUFHakMsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMzRCxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGVBQWUsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7S0FDN0Q7SUFFRCxNQUFNLFNBQVMsSUFDVixPQUFPLENBQUMsU0FBUyxJQUFJLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUE2QixDQUFDOzs7O0lBSzlFLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJO1FBQzNCLElBQUksRUFBRSxJQUFJLElBQUksU0FBUyxDQUFDLEVBQUU7WUFDeEIsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2QixlQUFnQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMvQjtLQUNGLENBQUMsQ0FBQzs7SUFHSCxLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsRUFBRTtRQUM1QixNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDOUIsSUFBSSxLQUFLLElBQUksZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTs7O1lBR3RDLElBQUksS0FBSyxFQUFFO2dCQUNULFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3BCLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDM0I7aUJBQU07Z0JBQ0wsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdkIsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUM5QjtTQUNGO0tBQ0Y7SUFDRCxJQUFJLE9BQVEsU0FBdUIsQ0FBQyxNQUFNLEtBQUssVUFBVSxFQUFFO1FBQ3hELFNBQXVCLENBQUMsTUFBTSxFQUFFLENBQUM7S0FDbkM7QUFDSCxDQUFDLENBQUM7O0FDckhGOzs7Ozs7Ozs7Ozs7O0FBZ0JBLE1BQU0sY0FBYyxHQUFHLElBQUksT0FBTyxFQUFpQixDQUFDO0FBRXBEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFpQ08sTUFBTSxLQUFLLEdBQ2QsU0FBUyxDQUFDLENBQUMsS0FBYyxFQUFFLENBQWdCLEtBQUssQ0FBQyxJQUFVO0lBQ3pELE1BQU0sYUFBYSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0MsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFOztRQUV4QixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO1lBQzVCLGFBQWEsQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLE1BQU07WUFDckMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2pELE9BQU87U0FDUjtLQUNGO1NBQU0sSUFDSCxhQUFhLEtBQUssS0FBSztTQUN0QixLQUFLLEtBQUssU0FBUyxJQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRTs7UUFFckQsT0FBTztLQUNSO0lBRUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDOzs7SUFHbkIsY0FBYyxDQUFDLEdBQUcsQ0FDZCxJQUFJLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDO0FBQzlELENBQUMsQ0FBQzs7QUN6RU47Ozs7Ozs7Ozs7Ozs7QUFnQkEsTUFBTUMsZ0JBQWMsR0FBRyxJQUFJLE9BQU8sRUFBaUIsQ0FBQztBQUVwRDs7Ozs7O0FBTU8sTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLENBQUMsS0FBYyxLQUFLLENBQUMsSUFBVTtJQUNoRSxNQUFNLGFBQWEsR0FBR0EsZ0JBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFL0MsSUFBSSxLQUFLLEtBQUssU0FBUyxJQUFJLElBQUksWUFBWSxhQUFhLEVBQUU7OztRQUd4RCxJQUFJLGFBQWEsS0FBSyxTQUFTLElBQUksQ0FBQ0EsZ0JBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDNUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7WUFDakMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzlDO0tBQ0Y7U0FBTSxJQUFJLEtBQUssS0FBSyxhQUFhLEVBQUU7UUFDbEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUN0QjtJQUVEQSxnQkFBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDbEMsQ0FBQyxDQUFDOztBQ3ZDRjs7Ozs7Ozs7Ozs7OztBQW9CQTtBQUNBO0FBQ0EsTUFBTSxtQkFBbUIsR0FDckIsQ0FBQyxhQUF1QixFQUFFLFVBQXFCO0lBQzdDLE1BQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUMsVUFBa0IsQ0FBQztJQUM3RCxNQUFNLFVBQVUsR0FBRyxVQUFVLEtBQUssU0FBUyxHQUFHLGFBQWEsQ0FBQyxPQUFPO1FBQ3JCLFVBQVUsQ0FBQyxTQUFTLENBQUM7SUFDbkUsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUNyRSxTQUFTLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ25ELE1BQU0sT0FBTyxHQUFHLElBQUksUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNwRCxPQUFPLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ25DLE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUMsQ0FBQztBQUVOLE1BQU0sVUFBVSxHQUFHLENBQUMsSUFBYyxFQUFFLEtBQWM7SUFDaEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNyQixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDZCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUMsQ0FBQztBQUVGLE1BQU0sZ0JBQWdCLEdBQ2xCLENBQUMsYUFBdUIsRUFBRSxJQUFjLEVBQUUsR0FBYztJQUN0RCxNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDLFVBQWtCLENBQUM7SUFDN0QsTUFBTSxVQUFVLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQztJQUMvRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQztJQUN6QyxJQUFJLE9BQU8sS0FBSyxVQUFVLEVBQUU7UUFDMUIsYUFBYSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztLQUMvRDtBQUNILENBQUMsQ0FBQztBQUVOLE1BQU0sVUFBVSxHQUFHLENBQUMsSUFBYztJQUNoQyxXQUFXLENBQ1AsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFXLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzVFLENBQUMsQ0FBQztBQUVGO0FBQ0E7QUFDQTtBQUNBLE1BQU0sV0FBVyxHQUFHLENBQUMsSUFBZSxFQUFFLEtBQWEsRUFBRSxHQUFXO0lBQzlELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7SUFDdEIsS0FBSyxJQUFJLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUNqQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUNyQjtJQUNELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyxDQUFDO0FBRUY7QUFDQSxNQUFNLGFBQWEsR0FBRyxJQUFJLE9BQU8sRUFBaUMsQ0FBQztBQUNuRSxNQUFNLFlBQVksR0FBRyxJQUFJLE9BQU8sRUFBdUIsQ0FBQztBQUV4RDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW1CTyxNQUFNLE1BQU0sR0FDZixTQUFTLENBQ0wsQ0FBSSxLQUFrQixFQUNsQixlQUF5QyxFQUN6QyxRQUEwQjtJQUV4QixJQUFJLEtBQWUsQ0FBQztJQUNwQixJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUU7UUFDMUIsUUFBUSxHQUFHLGVBQWUsQ0FBQztLQUM1QjtTQUFNLElBQUksZUFBZSxLQUFLLFNBQVMsRUFBRTtRQUN4QyxLQUFLLEdBQUcsZUFBMkIsQ0FBQztLQUNyQztJQUVELE9BQU8sQ0FBQyxhQUFtQjtRQUN6QixJQUFJLEVBQUUsYUFBYSxZQUFZLFFBQVEsQ0FBQyxFQUFFO1lBQ3hDLE1BQU0sSUFBSSxLQUFLLENBQUMsMENBQTBDLENBQUMsQ0FBQztTQUM3RDs7O1FBR0QsTUFBTSxRQUFRLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDeEQsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUM7Ozs7UUFLdEQsTUFBTSxRQUFRLEdBQWUsRUFBRSxDQUFDOzs7UUFJaEMsTUFBTSxTQUFTLEdBQWMsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sT0FBTyxHQUFjLEVBQUUsQ0FBQztRQUM5QixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDZCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtZQUN4QixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDO1lBQ3BELFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxRQUFVLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzNDLEtBQUssRUFBRSxDQUFDO1NBQ1Q7Ozs7O1FBTUQsSUFBSSxnQkFBdUMsQ0FBQztRQUM1QyxJQUFJLGdCQUF1QyxDQUFDOztRQUc1QyxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFDaEIsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDbEMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQ2hCLElBQUksT0FBTyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O1FBc01uQyxPQUFPLE9BQU8sSUFBSSxPQUFPLElBQUksT0FBTyxJQUFJLE9BQU8sRUFBRTtZQUMvQyxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLEVBQUU7OztnQkFHOUIsT0FBTyxFQUFFLENBQUM7YUFDWDtpQkFBTSxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLEVBQUU7OztnQkFHckMsT0FBTyxFQUFFLENBQUM7YUFDWDtpQkFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7O2dCQUVoRCxRQUFRLENBQUMsT0FBTyxDQUFDO29CQUNiLFVBQVUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFFLEVBQUUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZELE9BQU8sRUFBRSxDQUFDO2dCQUNWLE9BQU8sRUFBRSxDQUFDO2FBQ1g7aUJBQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFOztnQkFFaEQsUUFBUSxDQUFDLE9BQU8sQ0FBQztvQkFDYixVQUFVLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBRSxFQUFFLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUN2RCxPQUFPLEVBQUUsQ0FBQztnQkFDVixPQUFPLEVBQUUsQ0FBQzthQUNYO2lCQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTs7Z0JBRWhELFFBQVEsQ0FBQyxPQUFPLENBQUM7b0JBQ2IsVUFBVSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUUsRUFBRSxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDdkQsZ0JBQWdCLENBQ1osYUFBYSxFQUNiLFFBQVEsQ0FBQyxPQUFPLENBQUUsRUFDbEIsUUFBUSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMzQixPQUFPLEVBQUUsQ0FBQztnQkFDVixPQUFPLEVBQUUsQ0FBQzthQUNYO2lCQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTs7Z0JBRWhELFFBQVEsQ0FBQyxPQUFPLENBQUM7b0JBQ2IsVUFBVSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUUsRUFBRSxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDdkQsZ0JBQWdCLENBQ1osYUFBYSxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUUsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFFLENBQUMsQ0FBQztnQkFDM0QsT0FBTyxFQUFFLENBQUM7Z0JBQ1YsT0FBTyxFQUFFLENBQUM7YUFDWDtpQkFBTTtnQkFDTCxJQUFJLGdCQUFnQixLQUFLLFNBQVMsRUFBRTs7O29CQUdsQyxnQkFBZ0IsR0FBRyxXQUFXLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDMUQsZ0JBQWdCLEdBQUcsV0FBVyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7aUJBQzNEO2dCQUNELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUU7O29CQUUzQyxVQUFVLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBRSxDQUFDLENBQUM7b0JBQy9CLE9BQU8sRUFBRSxDQUFDO2lCQUNYO3FCQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUU7O29CQUVsRCxVQUFVLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBRSxDQUFDLENBQUM7b0JBQy9CLE9BQU8sRUFBRSxDQUFDO2lCQUNYO3FCQUFNOzs7O29CQUlMLE1BQU0sUUFBUSxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDeEQsTUFBTSxPQUFPLEdBQ1QsUUFBUSxLQUFLLFNBQVMsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDO29CQUN2RCxJQUFJLE9BQU8sS0FBSyxJQUFJLEVBQUU7Ozt3QkFHcEIsTUFBTSxPQUFPLEdBQUcsbUJBQW1CLENBQy9CLGFBQWEsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFFLENBQUMsQ0FBQzt3QkFDdkMsVUFBVSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQzt3QkFDeEMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLE9BQU8sQ0FBQztxQkFDN0I7eUJBQU07O3dCQUVMLFFBQVEsQ0FBQyxPQUFPLENBQUM7NEJBQ2IsVUFBVSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQzt3QkFDNUMsZ0JBQWdCLENBQ1osYUFBYSxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFFLENBQUMsQ0FBQzs7O3dCQUdoRCxRQUFRLENBQUMsUUFBa0IsQ0FBQyxHQUFHLElBQUksQ0FBQztxQkFDckM7b0JBQ0QsT0FBTyxFQUFFLENBQUM7aUJBQ1g7YUFDRjtTQUNGOztRQUVELE9BQU8sT0FBTyxJQUFJLE9BQU8sRUFBRTs7O1lBR3pCLE1BQU0sT0FBTyxHQUNULG1CQUFtQixDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUQsVUFBVSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUN4QyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUM7U0FDL0I7O1FBRUQsT0FBTyxPQUFPLElBQUksT0FBTyxFQUFFO1lBQ3pCLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ3BDLElBQUksT0FBTyxLQUFLLElBQUksRUFBRTtnQkFDcEIsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ3JCO1NBQ0Y7O1FBRUQsYUFBYSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDM0MsWUFBWSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FDMUMsQ0FBQztBQUNKLENBQUMsQ0FHcUM7O0FDemJsRDs7Ozs7Ozs7Ozs7OztBQW9CQTs7OztBQUlBLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxPQUFPLEVBQThCLENBQUM7QUFFN0U7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBaUJPLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxDQUFDLFNBQW9CLEtBQUssQ0FBQyxJQUFVO0lBQ3JFLElBQUksRUFBRSxJQUFJLFlBQVksYUFBYSxDQUFDLEtBQUssSUFBSSxZQUFZLFlBQVksQ0FBQztRQUNsRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksS0FBSyxPQUFPLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUN0RSxNQUFNLElBQUksS0FBSyxDQUNYLCtEQUErRDtZQUMvRCw2Q0FBNkMsQ0FBQyxDQUFDO0tBQ3BEO0lBRUQsTUFBTSxFQUFDLFNBQVMsRUFBQyxHQUFHLElBQUksQ0FBQztJQUN6QixNQUFNLEVBQUMsS0FBSyxFQUFDLEdBQUcsU0FBUyxDQUFDLE9BQXNCLENBQUM7SUFFakQsSUFBSSx1QkFBdUIsR0FBRywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFbkUsSUFBSSx1QkFBdUIsS0FBSyxTQUFTLEVBQUU7O1FBRXpDLEtBQUssQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDNUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSx1QkFBdUIsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7S0FDM0U7Ozs7SUFLRCx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJO1FBQ25DLElBQUksRUFBRSxJQUFJLElBQUksU0FBUyxDQUFDLEVBQUU7WUFDeEIsdUJBQXdCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3RDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTs7Z0JBRTNCLEtBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7YUFDN0I7aUJBQU07Z0JBQ0wsS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUM1QjtTQUNGO0tBQ0YsQ0FBQyxDQUFDOztJQUdILEtBQUssTUFBTSxJQUFJLElBQUksU0FBUyxFQUFFO1FBQzVCLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUU7O1lBRTNCLEtBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDeEM7YUFBTTtZQUNMLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQzFDO0tBQ0Y7QUFDSCxDQUFDLENBQUM7O0FDdkZGOzs7Ozs7Ozs7Ozs7O0FBc0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNQSxnQkFBYyxHQUFHLElBQUksT0FBTyxFQUEyQixDQUFDO0FBRTlEOzs7Ozs7O0FBT08sTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLENBQUMsS0FBYyxLQUFLLENBQUMsSUFBVTtJQUNqRSxJQUFJLEVBQUUsSUFBSSxZQUFZLFFBQVEsQ0FBQyxFQUFFO1FBQy9CLE1BQU0sSUFBSSxLQUFLLENBQUMsOENBQThDLENBQUMsQ0FBQztLQUNqRTtJQUVELE1BQU0sYUFBYSxHQUFHQSxnQkFBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUUvQyxJQUFJLGFBQWEsS0FBSyxTQUFTLElBQUksV0FBVyxDQUFDLEtBQUssQ0FBQztRQUNqRCxLQUFLLEtBQUssYUFBYSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLGFBQWEsQ0FBQyxRQUFRLEVBQUU7UUFDMUUsT0FBTztLQUNSO0lBRUQsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNwRCxRQUFRLENBQUMsU0FBUyxHQUFHLEtBQWUsQ0FBQztJQUNyQyxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN4QkEsZ0JBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUMsS0FBSyxFQUFFLFFBQVEsRUFBQyxDQUFDLENBQUM7QUFDOUMsQ0FBQyxDQUFDOztBQ3JERjs7Ozs7Ozs7Ozs7OztBQTJCQSxNQUFNLE1BQU0sR0FBRyxJQUFJLE9BQU8sRUFBb0IsQ0FBQztBQUMvQztBQUNBLE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQztBQUU3Qjs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW1CTyxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsQ0FBQyxHQUFHLElBQWUsS0FBSyxDQUFDLElBQVU7SUFDaEUsSUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQztJQUM5QixJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUU7UUFDdkIsS0FBSyxHQUFHO1lBQ04saUJBQWlCLEVBQUUsU0FBUztZQUM1QixNQUFNLEVBQUUsRUFBRTtTQUNYLENBQUM7UUFDRixNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztLQUN6QjtJQUNELE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDcEMsSUFBSSxjQUFjLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQztJQUMzQyxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztJQUVwQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTs7UUFFcEMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixFQUFFO1lBQy9CLE1BQU07U0FDUDtRQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzs7UUFHdEIsSUFBSSxXQUFXLENBQUMsS0FBSyxDQUFDO1lBQ2xCLE9BQVEsS0FBMEIsQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFO1lBQzFELElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDckIsS0FBSyxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQzs7O1lBRzVCLE1BQU07U0FDUDs7UUFHRCxJQUFJLENBQUMsR0FBRyxjQUFjLElBQUksS0FBSyxLQUFLLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNyRCxTQUFTO1NBQ1Y7OztRQUlELEtBQUssQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLENBQUM7UUFDcEMsY0FBYyxHQUFHLENBQUMsQ0FBQztRQUVuQixPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQXNCO1lBQ2pELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDOzs7O1lBSTFDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsaUJBQWlCLEVBQUU7Z0JBQ2pELEtBQUssQ0FBQyxpQkFBaUIsR0FBRyxLQUFLLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUNmO1NBQ0YsQ0FBQyxDQUFDO0tBQ0o7QUFDSCxDQUFDLENBQUM7O01DbEVXQyxZQUFVLEdBQXVCO0lBQzFDLFdBQVc7SUFDWCxZQUFZO0lBQ1osS0FBSztJQUNMLFFBQVE7SUFDUixLQUFLO0lBQ0wsU0FBUztJQUNULE1BQU07SUFDTixRQUFRO0lBQ1IsVUFBVTtJQUNWLEtBQUs7RUFDUDtBQUVGOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O01BbUJhLHNCQUFzQixHQUFHLENBQUMsR0FBVztJQUM5QyxNQUFNLEVBQUUsR0FBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3RCLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNmLE9BQU8sRUFBRSxDQUFDO0FBQ2Q7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZS8ifQ==
