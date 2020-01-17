/*!
 * @cdp/extension-template 0.9.0
 *   extension for template engine
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.CDP = global.CDP || {}));
}(this, (function (exports) { 'use strict';

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
    const isCEPolyfill = window.customElements !== undefined &&
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
     * An updateable Template that tracks the location of dynamic parts.
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
    const lastAttributeNameRegex = /([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F "'>=/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;

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
            // But Safari dooes not implement CustomElementRegistry#upgrade, so we
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
                // attribute, text, or comment poisition.
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
                // Check to see if we have an attribute-like sequence preceeding the
                // expression. This can match "name=value" like structures in text,
                // comments, and attribute values, so there can be false-positives.
                const attributeMatch = lastAttributeNameRegex.exec(s);
                if (attributeMatch === null) {
                    // We're only in this branch if we don't have a attribute-like
                    // preceeding sequence. For comments, this guards against unusual
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
            // tslint:disable-next-line:no-any
            !!(value && value[Symbol.iterator]);
    };
    /**
     * Writes attribute values to the DOM for a group of AttributeParts bound to a
     * single attibute. The value is only set once even if there are multiple parts
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
                // tslint:disable-next-line:no-any
                this.element[this.name] = this._getValue();
            }
        }
    }
    class PropertyPart extends AttributePart {
    }
    // Detect event listener options support. If the `capture` property is read
    // from the options object, then options are supported. If not, then the thrid
    // argument to add/removeEventListener is interpreted as the boolean capture
    // value so we should only pass the `capture` property.
    let eventOptionsSupported = false;
    try {
        const options = {
            get capture() {
                eventOptionsSupported = true;
                return false;
            }
        };
        // tslint:disable-next-line:no-any
        window.addEventListener('test', options, options);
        // tslint:disable-next-line:no-any
        window.removeEventListener('test', options, options);
    }
    catch (_e) {
    }
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
    (window['litHtmlVersions'] || (window['litHtmlVersions'] = [])).push('1.1.2');
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
    /**
     * Stores the ClassInfo object applied to a given AttributePart.
     * Used to unset existing values when a new ClassInfo object is applied.
     */
    const classMapCache = new WeakMap();
    /**
     * A directive that applies CSS classes. This must be used in the `class`
     * attribute and must be the only part used in the attribute. It takes each
     * property in the `classInfo` argument and adds the property name to the
     * element's `classList` if the property value is truthy; if the property value
     * is falsey, the property name is removed from the element's `classList`. For
     * example
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
        // handle static classes
        if (!classMapCache.has(part)) {
            element.className = committer.strings.join(' ');
        }
        const { classList } = element;
        // remove old classes that no longer apply
        const oldInfo = classMapCache.get(part);
        for (const name in oldInfo) {
            if (!(name in classInfo)) {
                classList.remove(name);
            }
        }
        // add new classes
        for (const name in classInfo) {
            const value = classInfo[name];
            if (!oldInfo || value !== oldInfo[name]) {
                // We explicitly want a loose truthy check here because
                // it seems more convenient that '' and 0 are skipped.
                const method = value ? 'add' : 'remove';
                classList[method](name);
            }
        }
        classMapCache.set(part, classInfo);
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
    /**
     * For AttributeParts, sets the attribute if the value is defined and removes
     * the attribute if the value is undefined.
     *
     * For other part types, this directive is a no-op.
     */
    const ifDefined = directive((value) => (part) => {
        if (value === undefined && part instanceof AttributePart) {
            if (value !== part.value) {
                const name = part.committer.name;
                part.committer.element.removeAttribute(name);
            }
        }
        else {
            part.setValue(value);
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
     * amd removals.
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
    const styleMapCache = new WeakMap();
    /**
     * A directive that applies CSS properties to an element.
     *
     * `styleMap` can only be used in the `style` attribute and must be the only
     * expression in the attribute. It takes the property names in the `styleInfo`
     * object and adds the property values as CSS propertes. Property names with
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
        // Handle static styles the first time we see a Part
        if (!styleMapCache.has(part)) {
            style.cssText = committer.strings.join(' ');
        }
        // Remove old properties that no longer exist in styleInfo
        const oldInfo = styleMapCache.get(part);
        for (const name in oldInfo) {
            if (!(name in styleInfo)) {
                if (name.indexOf('-') === -1) {
                    // tslint:disable-next-line:no-any
                    style[name] = null;
                }
                else {
                    style.removeProperty(name);
                }
            }
        }
        // Add or update properties
        for (const name in styleInfo) {
            if (name.indexOf('-') === -1) {
                // tslint:disable-next-line:no-any
                style[name] = styleInfo[name];
            }
            else {
                style.setProperty(name, styleInfo[name]);
            }
        }
        styleMapCache.set(part, styleInfo);
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
    const previousValues$1 = new WeakMap();
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
        const previousValue = previousValues$1.get(part);
        if (previousValue !== undefined && isPrimitive(value) &&
            value === previousValue.value && part.value === previousValue.fragment) {
            return;
        }
        const template = document.createElement('template');
        template.innerHTML = value; // innerHTML casts to string internally
        const fragment = document.importNode(template.content, true);
        part.setValue(fragment);
        previousValues$1.set(part, { value, fragment });
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
    };

    exports.SVGTemplateResult = SVGTemplateResult;
    exports.TemplateResult = TemplateResult;
    exports.directive = directive;
    exports.directives = directives$1;
    exports.html = html;
    exports.isDirective = isDirective;
    exports.parts = parts;
    exports.render = render;
    exports.svg = svg;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLmpzIiwic291cmNlcyI6WyIuLi9ub2RlX21vZHVsZXMvbGl0LWh0bWwvc3JjL2xpYi9kaXJlY3RpdmUudHMiLCIuLi9ub2RlX21vZHVsZXMvbGl0LWh0bWwvc3JjL2xpYi9kb20udHMiLCIuLi9ub2RlX21vZHVsZXMvbGl0LWh0bWwvc3JjL2xpYi9wYXJ0LnRzIiwiLi4vbm9kZV9tb2R1bGVzL2xpdC1odG1sL3NyYy9saWIvdGVtcGxhdGUudHMiLCIuLi9ub2RlX21vZHVsZXMvbGl0LWh0bWwvc3JjL2xpYi90ZW1wbGF0ZS1pbnN0YW5jZS50cyIsIi4uL25vZGVfbW9kdWxlcy9saXQtaHRtbC9zcmMvbGliL3RlbXBsYXRlLXJlc3VsdC50cyIsIi4uL25vZGVfbW9kdWxlcy9saXQtaHRtbC9zcmMvbGliL3BhcnRzLnRzIiwiLi4vbm9kZV9tb2R1bGVzL2xpdC1odG1sL3NyYy9saWIvZGVmYXVsdC10ZW1wbGF0ZS1wcm9jZXNzb3IudHMiLCIuLi9ub2RlX21vZHVsZXMvbGl0LWh0bWwvc3JjL2xpYi90ZW1wbGF0ZS1mYWN0b3J5LnRzIiwiLi4vbm9kZV9tb2R1bGVzL2xpdC1odG1sL3NyYy9saWIvcmVuZGVyLnRzIiwiLi4vbm9kZV9tb2R1bGVzL2xpdC1odG1sL3NyYy9saXQtaHRtbC50cyIsIi4uL25vZGVfbW9kdWxlcy9saXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9hc3luYy1hcHBlbmQudHMiLCIuLi9ub2RlX21vZHVsZXMvbGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvYXN5bmMtcmVwbGFjZS50cyIsIi4uL25vZGVfbW9kdWxlcy9saXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9jYWNoZS50cyIsIi4uL25vZGVfbW9kdWxlcy9saXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9jbGFzcy1tYXAudHMiLCIuLi9ub2RlX21vZHVsZXMvbGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvZ3VhcmQudHMiLCIuLi9ub2RlX21vZHVsZXMvbGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvaWYtZGVmaW5lZC50cyIsIi4uL25vZGVfbW9kdWxlcy9saXQtaHRtbC9zcmMvZGlyZWN0aXZlcy9yZXBlYXQudHMiLCIuLi9ub2RlX21vZHVsZXMvbGl0LWh0bWwvc3JjL2RpcmVjdGl2ZXMvc3R5bGUtbWFwLnRzIiwiLi4vbm9kZV9tb2R1bGVzL2xpdC1odG1sL3NyYy9kaXJlY3RpdmVzL3Vuc2FmZS1odG1sLnRzIiwiaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuXG4vKipcbiAqIEBtb2R1bGUgbGl0LWh0bWxcbiAqL1xuXG5pbXBvcnQge1BhcnR9IGZyb20gJy4vcGFydC5qcyc7XG5cbmNvbnN0IGRpcmVjdGl2ZXMgPSBuZXcgV2Vha01hcDxvYmplY3QsIHRydWU+KCk7XG5cbi8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbmV4cG9ydCB0eXBlIERpcmVjdGl2ZUZhY3RvcnkgPSAoLi4uYXJnczogYW55W10pID0+IG9iamVjdDtcblxuZXhwb3J0IHR5cGUgRGlyZWN0aXZlRm4gPSAocGFydDogUGFydCkgPT4gdm9pZDtcblxuLyoqXG4gKiBCcmFuZHMgYSBmdW5jdGlvbiBhcyBhIGRpcmVjdGl2ZSBmYWN0b3J5IGZ1bmN0aW9uIHNvIHRoYXQgbGl0LWh0bWwgd2lsbCBjYWxsXG4gKiB0aGUgZnVuY3Rpb24gZHVyaW5nIHRlbXBsYXRlIHJlbmRlcmluZywgcmF0aGVyIHRoYW4gcGFzc2luZyBhcyBhIHZhbHVlLlxuICpcbiAqIEEgX2RpcmVjdGl2ZV8gaXMgYSBmdW5jdGlvbiB0aGF0IHRha2VzIGEgUGFydCBhcyBhbiBhcmd1bWVudC4gSXQgaGFzIHRoZVxuICogc2lnbmF0dXJlOiBgKHBhcnQ6IFBhcnQpID0+IHZvaWRgLlxuICpcbiAqIEEgZGlyZWN0aXZlIF9mYWN0b3J5XyBpcyBhIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYXJndW1lbnRzIGZvciBkYXRhIGFuZFxuICogY29uZmlndXJhdGlvbiBhbmQgcmV0dXJucyBhIGRpcmVjdGl2ZS4gVXNlcnMgb2YgZGlyZWN0aXZlIHVzdWFsbHkgcmVmZXIgdG9cbiAqIHRoZSBkaXJlY3RpdmUgZmFjdG9yeSBhcyB0aGUgZGlyZWN0aXZlLiBGb3IgZXhhbXBsZSwgXCJUaGUgcmVwZWF0IGRpcmVjdGl2ZVwiLlxuICpcbiAqIFVzdWFsbHkgYSB0ZW1wbGF0ZSBhdXRob3Igd2lsbCBpbnZva2UgYSBkaXJlY3RpdmUgZmFjdG9yeSBpbiB0aGVpciB0ZW1wbGF0ZVxuICogd2l0aCByZWxldmFudCBhcmd1bWVudHMsIHdoaWNoIHdpbGwgdGhlbiByZXR1cm4gYSBkaXJlY3RpdmUgZnVuY3Rpb24uXG4gKlxuICogSGVyZSdzIGFuIGV4YW1wbGUgb2YgdXNpbmcgdGhlIGByZXBlYXQoKWAgZGlyZWN0aXZlIGZhY3RvcnkgdGhhdCB0YWtlcyBhblxuICogYXJyYXkgYW5kIGEgZnVuY3Rpb24gdG8gcmVuZGVyIGFuIGl0ZW06XG4gKlxuICogYGBganNcbiAqIGh0bWxgPHVsPjwke3JlcGVhdChpdGVtcywgKGl0ZW0pID0+IGh0bWxgPGxpPiR7aXRlbX08L2xpPmApfTwvdWw+YFxuICogYGBgXG4gKlxuICogV2hlbiBgcmVwZWF0YCBpcyBpbnZva2VkLCBpdCByZXR1cm5zIGEgZGlyZWN0aXZlIGZ1bmN0aW9uIHRoYXQgY2xvc2VzIG92ZXJcbiAqIGBpdGVtc2AgYW5kIHRoZSB0ZW1wbGF0ZSBmdW5jdGlvbi4gV2hlbiB0aGUgb3V0ZXIgdGVtcGxhdGUgaXMgcmVuZGVyZWQsIHRoZVxuICogcmV0dXJuIGRpcmVjdGl2ZSBmdW5jdGlvbiBpcyBjYWxsZWQgd2l0aCB0aGUgUGFydCBmb3IgdGhlIGV4cHJlc3Npb24uXG4gKiBgcmVwZWF0YCB0aGVuIHBlcmZvcm1zIGl0J3MgY3VzdG9tIGxvZ2ljIHRvIHJlbmRlciBtdWx0aXBsZSBpdGVtcy5cbiAqXG4gKiBAcGFyYW0gZiBUaGUgZGlyZWN0aXZlIGZhY3RvcnkgZnVuY3Rpb24uIE11c3QgYmUgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYVxuICogZnVuY3Rpb24gb2YgdGhlIHNpZ25hdHVyZSBgKHBhcnQ6IFBhcnQpID0+IHZvaWRgLiBUaGUgcmV0dXJuZWQgZnVuY3Rpb24gd2lsbFxuICogYmUgY2FsbGVkIHdpdGggdGhlIHBhcnQgb2JqZWN0LlxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogaW1wb3J0IHtkaXJlY3RpdmUsIGh0bWx9IGZyb20gJ2xpdC1odG1sJztcbiAqXG4gKiBjb25zdCBpbW11dGFibGUgPSBkaXJlY3RpdmUoKHYpID0+IChwYXJ0KSA9PiB7XG4gKiAgIGlmIChwYXJ0LnZhbHVlICE9PSB2KSB7XG4gKiAgICAgcGFydC5zZXRWYWx1ZSh2KVxuICogICB9XG4gKiB9KTtcbiAqL1xuZXhwb3J0IGNvbnN0IGRpcmVjdGl2ZSA9IDxGIGV4dGVuZHMgRGlyZWN0aXZlRmFjdG9yeT4oZjogRik6IEYgPT5cbiAgICAoKC4uLmFyZ3M6IHVua25vd25bXSkgPT4ge1xuICAgICAgY29uc3QgZCA9IGYoLi4uYXJncyk7XG4gICAgICBkaXJlY3RpdmVzLnNldChkLCB0cnVlKTtcbiAgICAgIHJldHVybiBkO1xuICAgIH0pIGFzIEY7XG5cbmV4cG9ydCBjb25zdCBpc0RpcmVjdGl2ZSA9IChvOiB1bmtub3duKTogbyBpcyBEaXJlY3RpdmVGbiA9PiB7XG4gIHJldHVybiB0eXBlb2YgbyA9PT0gJ2Z1bmN0aW9uJyAmJiBkaXJlY3RpdmVzLmhhcyhvKTtcbn07XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG5cbi8qKlxuICogQG1vZHVsZSBsaXQtaHRtbFxuICovXG5cbmludGVyZmFjZSBNYXliZVBvbHlmaWxsZWRDZSBleHRlbmRzIEN1c3RvbUVsZW1lbnRSZWdpc3RyeSB7XG4gIHJlYWRvbmx5IHBvbHlmaWxsV3JhcEZsdXNoQ2FsbGJhY2s/OiBvYmplY3Q7XG59XG5cbi8qKlxuICogVHJ1ZSBpZiB0aGUgY3VzdG9tIGVsZW1lbnRzIHBvbHlmaWxsIGlzIGluIHVzZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGlzQ0VQb2x5ZmlsbCA9IHdpbmRvdy5jdXN0b21FbGVtZW50cyAhPT0gdW5kZWZpbmVkICYmXG4gICAgKHdpbmRvdy5jdXN0b21FbGVtZW50cyBhcyBNYXliZVBvbHlmaWxsZWRDZSkucG9seWZpbGxXcmFwRmx1c2hDYWxsYmFjayAhPT1cbiAgICAgICAgdW5kZWZpbmVkO1xuXG4vKipcbiAqIFJlcGFyZW50cyBub2Rlcywgc3RhcnRpbmcgZnJvbSBgc3RhcnRgIChpbmNsdXNpdmUpIHRvIGBlbmRgIChleGNsdXNpdmUpLFxuICogaW50byBhbm90aGVyIGNvbnRhaW5lciAoY291bGQgYmUgdGhlIHNhbWUgY29udGFpbmVyKSwgYmVmb3JlIGBiZWZvcmVgLiBJZlxuICogYGJlZm9yZWAgaXMgbnVsbCwgaXQgYXBwZW5kcyB0aGUgbm9kZXMgdG8gdGhlIGNvbnRhaW5lci5cbiAqL1xuZXhwb3J0IGNvbnN0IHJlcGFyZW50Tm9kZXMgPVxuICAgIChjb250YWluZXI6IE5vZGUsXG4gICAgIHN0YXJ0OiBOb2RlfG51bGwsXG4gICAgIGVuZDogTm9kZXxudWxsID0gbnVsbCxcbiAgICAgYmVmb3JlOiBOb2RlfG51bGwgPSBudWxsKTogdm9pZCA9PiB7XG4gICAgICB3aGlsZSAoc3RhcnQgIT09IGVuZCkge1xuICAgICAgICBjb25zdCBuID0gc3RhcnQhLm5leHRTaWJsaW5nO1xuICAgICAgICBjb250YWluZXIuaW5zZXJ0QmVmb3JlKHN0YXJ0ISwgYmVmb3JlKTtcbiAgICAgICAgc3RhcnQgPSBuO1xuICAgICAgfVxuICAgIH07XG5cbi8qKlxuICogUmVtb3ZlcyBub2Rlcywgc3RhcnRpbmcgZnJvbSBgc3RhcnRgIChpbmNsdXNpdmUpIHRvIGBlbmRgIChleGNsdXNpdmUpLCBmcm9tXG4gKiBgY29udGFpbmVyYC5cbiAqL1xuZXhwb3J0IGNvbnN0IHJlbW92ZU5vZGVzID1cbiAgICAoY29udGFpbmVyOiBOb2RlLCBzdGFydDogTm9kZXxudWxsLCBlbmQ6IE5vZGV8bnVsbCA9IG51bGwpOiB2b2lkID0+IHtcbiAgICAgIHdoaWxlIChzdGFydCAhPT0gZW5kKSB7XG4gICAgICAgIGNvbnN0IG4gPSBzdGFydCEubmV4dFNpYmxpbmc7XG4gICAgICAgIGNvbnRhaW5lci5yZW1vdmVDaGlsZChzdGFydCEpO1xuICAgICAgICBzdGFydCA9IG47XG4gICAgICB9XG4gICAgfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxOCBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cblxuLyoqXG4gKiBAbW9kdWxlIGxpdC1odG1sXG4gKi9cblxuLyoqXG4gKiBUaGUgUGFydCBpbnRlcmZhY2UgcmVwcmVzZW50cyBhIGR5bmFtaWMgcGFydCBvZiBhIHRlbXBsYXRlIGluc3RhbmNlIHJlbmRlcmVkXG4gKiBieSBsaXQtaHRtbC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYXJ0IHtcbiAgcmVhZG9ubHkgdmFsdWU6IHVua25vd247XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGN1cnJlbnQgcGFydCB2YWx1ZSwgYnV0IGRvZXMgbm90IHdyaXRlIGl0IHRvIHRoZSBET00uXG4gICAqIEBwYXJhbSB2YWx1ZSBUaGUgdmFsdWUgdGhhdCB3aWxsIGJlIGNvbW1pdHRlZC5cbiAgICovXG4gIHNldFZhbHVlKHZhbHVlOiB1bmtub3duKTogdm9pZDtcblxuICAvKipcbiAgICogQ29tbWl0cyB0aGUgY3VycmVudCBwYXJ0IHZhbHVlLCBjYXVzaW5nIGl0IHRvIGFjdHVhbGx5IGJlIHdyaXR0ZW4gdG8gdGhlXG4gICAqIERPTS5cbiAgICpcbiAgICogRGlyZWN0aXZlcyBhcmUgcnVuIGF0IHRoZSBzdGFydCBvZiBgY29tbWl0YCwgc28gdGhhdCBpZiB0aGV5IGNhbGxcbiAgICogYHBhcnQuc2V0VmFsdWUoLi4uKWAgc3luY2hyb25vdXNseSB0aGF0IHZhbHVlIHdpbGwgYmUgdXNlZCBpbiB0aGUgY3VycmVudFxuICAgKiBjb21taXQsIGFuZCB0aGVyZSdzIG5vIG5lZWQgdG8gY2FsbCBgcGFydC5jb21taXQoKWAgd2l0aGluIHRoZSBkaXJlY3RpdmUuXG4gICAqIElmIGRpcmVjdGl2ZXMgc2V0IGEgcGFydCB2YWx1ZSBhc3luY2hyb25vdXNseSwgdGhlbiB0aGV5IG11c3QgY2FsbFxuICAgKiBgcGFydC5jb21taXQoKWAgbWFudWFsbHkuXG4gICAqL1xuICBjb21taXQoKTogdm9pZDtcbn1cblxuLyoqXG4gKiBBIHNlbnRpbmVsIHZhbHVlIHRoYXQgc2lnbmFscyB0aGF0IGEgdmFsdWUgd2FzIGhhbmRsZWQgYnkgYSBkaXJlY3RpdmUgYW5kXG4gKiBzaG91bGQgbm90IGJlIHdyaXR0ZW4gdG8gdGhlIERPTS5cbiAqL1xuZXhwb3J0IGNvbnN0IG5vQ2hhbmdlID0ge307XG5cbi8qKlxuICogQSBzZW50aW5lbCB2YWx1ZSB0aGF0IHNpZ25hbHMgYSBOb2RlUGFydCB0byBmdWxseSBjbGVhciBpdHMgY29udGVudC5cbiAqL1xuZXhwb3J0IGNvbnN0IG5vdGhpbmcgPSB7fTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cblxuLyoqXG4gKiBAbW9kdWxlIGxpdC1odG1sXG4gKi9cblxuaW1wb3J0IHtUZW1wbGF0ZVJlc3VsdH0gZnJvbSAnLi90ZW1wbGF0ZS1yZXN1bHQuanMnO1xuXG4vKipcbiAqIEFuIGV4cHJlc3Npb24gbWFya2VyIHdpdGggZW1iZWRkZWQgdW5pcXVlIGtleSB0byBhdm9pZCBjb2xsaXNpb24gd2l0aFxuICogcG9zc2libGUgdGV4dCBpbiB0ZW1wbGF0ZXMuXG4gKi9cbmV4cG9ydCBjb25zdCBtYXJrZXIgPSBge3tsaXQtJHtTdHJpbmcoTWF0aC5yYW5kb20oKSkuc2xpY2UoMil9fX1gO1xuXG4vKipcbiAqIEFuIGV4cHJlc3Npb24gbWFya2VyIHVzZWQgdGV4dC1wb3NpdGlvbnMsIG11bHRpLWJpbmRpbmcgYXR0cmlidXRlcywgYW5kXG4gKiBhdHRyaWJ1dGVzIHdpdGggbWFya3VwLWxpa2UgdGV4dCB2YWx1ZXMuXG4gKi9cbmV4cG9ydCBjb25zdCBub2RlTWFya2VyID0gYDwhLS0ke21hcmtlcn0tLT5gO1xuXG5leHBvcnQgY29uc3QgbWFya2VyUmVnZXggPSBuZXcgUmVnRXhwKGAke21hcmtlcn18JHtub2RlTWFya2VyfWApO1xuXG4vKipcbiAqIFN1ZmZpeCBhcHBlbmRlZCB0byBhbGwgYm91bmQgYXR0cmlidXRlIG5hbWVzLlxuICovXG5leHBvcnQgY29uc3QgYm91bmRBdHRyaWJ1dGVTdWZmaXggPSAnJGxpdCQnO1xuXG4vKipcbiAqIEFuIHVwZGF0ZWFibGUgVGVtcGxhdGUgdGhhdCB0cmFja3MgdGhlIGxvY2F0aW9uIG9mIGR5bmFtaWMgcGFydHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZSB7XG4gIHJlYWRvbmx5IHBhcnRzOiBUZW1wbGF0ZVBhcnRbXSA9IFtdO1xuICByZWFkb25seSBlbGVtZW50OiBIVE1MVGVtcGxhdGVFbGVtZW50O1xuXG4gIGNvbnN0cnVjdG9yKHJlc3VsdDogVGVtcGxhdGVSZXN1bHQsIGVsZW1lbnQ6IEhUTUxUZW1wbGF0ZUVsZW1lbnQpIHtcbiAgICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG4gICAgY29uc3Qgbm9kZXNUb1JlbW92ZTogTm9kZVtdID0gW107XG4gICAgY29uc3Qgc3RhY2s6IE5vZGVbXSA9IFtdO1xuICAgIC8vIEVkZ2UgbmVlZHMgYWxsIDQgcGFyYW1ldGVycyBwcmVzZW50OyBJRTExIG5lZWRzIDNyZCBwYXJhbWV0ZXIgdG8gYmUgbnVsbFxuICAgIGNvbnN0IHdhbGtlciA9IGRvY3VtZW50LmNyZWF0ZVRyZWVXYWxrZXIoXG4gICAgICAgIGVsZW1lbnQuY29udGVudCxcbiAgICAgICAgMTMzIC8qIE5vZGVGaWx0ZXIuU0hPV197RUxFTUVOVHxDT01NRU5UfFRFWFR9ICovLFxuICAgICAgICBudWxsLFxuICAgICAgICBmYWxzZSk7XG4gICAgLy8gS2VlcHMgdHJhY2sgb2YgdGhlIGxhc3QgaW5kZXggYXNzb2NpYXRlZCB3aXRoIGEgcGFydC4gV2UgdHJ5IHRvIGRlbGV0ZVxuICAgIC8vIHVubmVjZXNzYXJ5IG5vZGVzLCBidXQgd2UgbmV2ZXIgd2FudCB0byBhc3NvY2lhdGUgdHdvIGRpZmZlcmVudCBwYXJ0c1xuICAgIC8vIHRvIHRoZSBzYW1lIGluZGV4LiBUaGV5IG11c3QgaGF2ZSBhIGNvbnN0YW50IG5vZGUgYmV0d2Vlbi5cbiAgICBsZXQgbGFzdFBhcnRJbmRleCA9IDA7XG4gICAgbGV0IGluZGV4ID0gLTE7XG4gICAgbGV0IHBhcnRJbmRleCA9IDA7XG4gICAgY29uc3Qge3N0cmluZ3MsIHZhbHVlczoge2xlbmd0aH19ID0gcmVzdWx0O1xuICAgIHdoaWxlIChwYXJ0SW5kZXggPCBsZW5ndGgpIHtcbiAgICAgIGNvbnN0IG5vZGUgPSB3YWxrZXIubmV4dE5vZGUoKSBhcyBFbGVtZW50IHwgQ29tbWVudCB8IFRleHQgfCBudWxsO1xuICAgICAgaWYgKG5vZGUgPT09IG51bGwpIHtcbiAgICAgICAgLy8gV2UndmUgZXhoYXVzdGVkIHRoZSBjb250ZW50IGluc2lkZSBhIG5lc3RlZCB0ZW1wbGF0ZSBlbGVtZW50LlxuICAgICAgICAvLyBCZWNhdXNlIHdlIHN0aWxsIGhhdmUgcGFydHMgKHRoZSBvdXRlciBmb3ItbG9vcCksIHdlIGtub3c6XG4gICAgICAgIC8vIC0gVGhlcmUgaXMgYSB0ZW1wbGF0ZSBpbiB0aGUgc3RhY2tcbiAgICAgICAgLy8gLSBUaGUgd2Fsa2VyIHdpbGwgZmluZCBhIG5leHROb2RlIG91dHNpZGUgdGhlIHRlbXBsYXRlXG4gICAgICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IHN0YWNrLnBvcCgpITtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpbmRleCsrO1xuXG4gICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMSAvKiBOb2RlLkVMRU1FTlRfTk9ERSAqLykge1xuICAgICAgICBpZiAoKG5vZGUgYXMgRWxlbWVudCkuaGFzQXR0cmlidXRlcygpKSB7XG4gICAgICAgICAgY29uc3QgYXR0cmlidXRlcyA9IChub2RlIGFzIEVsZW1lbnQpLmF0dHJpYnV0ZXM7XG4gICAgICAgICAgY29uc3Qge2xlbmd0aH0gPSBhdHRyaWJ1dGVzO1xuICAgICAgICAgIC8vIFBlclxuICAgICAgICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9OYW1lZE5vZGVNYXAsXG4gICAgICAgICAgLy8gYXR0cmlidXRlcyBhcmUgbm90IGd1YXJhbnRlZWQgdG8gYmUgcmV0dXJuZWQgaW4gZG9jdW1lbnQgb3JkZXIuXG4gICAgICAgICAgLy8gSW4gcGFydGljdWxhciwgRWRnZS9JRSBjYW4gcmV0dXJuIHRoZW0gb3V0IG9mIG9yZGVyLCBzbyB3ZSBjYW5ub3RcbiAgICAgICAgICAvLyBhc3N1bWUgYSBjb3JyZXNwb25kZW5jZSBiZXR3ZWVuIHBhcnQgaW5kZXggYW5kIGF0dHJpYnV0ZSBpbmRleC5cbiAgICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChlbmRzV2l0aChhdHRyaWJ1dGVzW2ldLm5hbWUsIGJvdW5kQXR0cmlidXRlU3VmZml4KSkge1xuICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB3aGlsZSAoY291bnQtLSA+IDApIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgdGVtcGxhdGUgbGl0ZXJhbCBzZWN0aW9uIGxlYWRpbmcgdXAgdG8gdGhlIGZpcnN0XG4gICAgICAgICAgICAvLyBleHByZXNzaW9uIGluIHRoaXMgYXR0cmlidXRlXG4gICAgICAgICAgICBjb25zdCBzdHJpbmdGb3JQYXJ0ID0gc3RyaW5nc1twYXJ0SW5kZXhdO1xuICAgICAgICAgICAgLy8gRmluZCB0aGUgYXR0cmlidXRlIG5hbWVcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBsYXN0QXR0cmlidXRlTmFtZVJlZ2V4LmV4ZWMoc3RyaW5nRm9yUGFydCkhWzJdO1xuICAgICAgICAgICAgLy8gRmluZCB0aGUgY29ycmVzcG9uZGluZyBhdHRyaWJ1dGVcbiAgICAgICAgICAgIC8vIEFsbCBib3VuZCBhdHRyaWJ1dGVzIGhhdmUgaGFkIGEgc3VmZml4IGFkZGVkIGluXG4gICAgICAgICAgICAvLyBUZW1wbGF0ZVJlc3VsdCNnZXRIVE1MIHRvIG9wdCBvdXQgb2Ygc3BlY2lhbCBhdHRyaWJ1dGVcbiAgICAgICAgICAgIC8vIGhhbmRsaW5nLiBUbyBsb29rIHVwIHRoZSBhdHRyaWJ1dGUgdmFsdWUgd2UgYWxzbyBuZWVkIHRvIGFkZFxuICAgICAgICAgICAgLy8gdGhlIHN1ZmZpeC5cbiAgICAgICAgICAgIGNvbnN0IGF0dHJpYnV0ZUxvb2t1cE5hbWUgPVxuICAgICAgICAgICAgICAgIG5hbWUudG9Mb3dlckNhc2UoKSArIGJvdW5kQXR0cmlidXRlU3VmZml4O1xuICAgICAgICAgICAgY29uc3QgYXR0cmlidXRlVmFsdWUgPVxuICAgICAgICAgICAgICAgIChub2RlIGFzIEVsZW1lbnQpLmdldEF0dHJpYnV0ZShhdHRyaWJ1dGVMb29rdXBOYW1lKSE7XG4gICAgICAgICAgICAobm9kZSBhcyBFbGVtZW50KS5yZW1vdmVBdHRyaWJ1dGUoYXR0cmlidXRlTG9va3VwTmFtZSk7XG4gICAgICAgICAgICBjb25zdCBzdGF0aWNzID0gYXR0cmlidXRlVmFsdWUuc3BsaXQobWFya2VyUmVnZXgpO1xuICAgICAgICAgICAgdGhpcy5wYXJ0cy5wdXNoKHt0eXBlOiAnYXR0cmlidXRlJywgaW5kZXgsIG5hbWUsIHN0cmluZ3M6IHN0YXRpY3N9KTtcbiAgICAgICAgICAgIHBhcnRJbmRleCArPSBzdGF0aWNzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICgobm9kZSBhcyBFbGVtZW50KS50YWdOYW1lID09PSAnVEVNUExBVEUnKSB7XG4gICAgICAgICAgc3RhY2sucHVzaChub2RlKTtcbiAgICAgICAgICB3YWxrZXIuY3VycmVudE5vZGUgPSAobm9kZSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50KS5jb250ZW50O1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IDMgLyogTm9kZS5URVhUX05PREUgKi8pIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IChub2RlIGFzIFRleHQpLmRhdGE7XG4gICAgICAgIGlmIChkYXRhLmluZGV4T2YobWFya2VyKSA+PSAwKSB7XG4gICAgICAgICAgY29uc3QgcGFyZW50ID0gbm9kZS5wYXJlbnROb2RlITtcbiAgICAgICAgICBjb25zdCBzdHJpbmdzID0gZGF0YS5zcGxpdChtYXJrZXJSZWdleCk7XG4gICAgICAgICAgY29uc3QgbGFzdEluZGV4ID0gc3RyaW5ncy5sZW5ndGggLSAxO1xuICAgICAgICAgIC8vIEdlbmVyYXRlIGEgbmV3IHRleHQgbm9kZSBmb3IgZWFjaCBsaXRlcmFsIHNlY3Rpb25cbiAgICAgICAgICAvLyBUaGVzZSBub2RlcyBhcmUgYWxzbyB1c2VkIGFzIHRoZSBtYXJrZXJzIGZvciBub2RlIHBhcnRzXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsYXN0SW5kZXg7IGkrKykge1xuICAgICAgICAgICAgbGV0IGluc2VydDogTm9kZTtcbiAgICAgICAgICAgIGxldCBzID0gc3RyaW5nc1tpXTtcbiAgICAgICAgICAgIGlmIChzID09PSAnJykge1xuICAgICAgICAgICAgICBpbnNlcnQgPSBjcmVhdGVNYXJrZXIoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gbGFzdEF0dHJpYnV0ZU5hbWVSZWdleC5leGVjKHMpO1xuICAgICAgICAgICAgICBpZiAobWF0Y2ggIT09IG51bGwgJiYgZW5kc1dpdGgobWF0Y2hbMl0sIGJvdW5kQXR0cmlidXRlU3VmZml4KSkge1xuICAgICAgICAgICAgICAgIHMgPSBzLnNsaWNlKDAsIG1hdGNoLmluZGV4KSArIG1hdGNoWzFdICtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hbMl0uc2xpY2UoMCwgLWJvdW5kQXR0cmlidXRlU3VmZml4Lmxlbmd0aCkgKyBtYXRjaFszXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpbnNlcnQgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUoaW5zZXJ0LCBub2RlKTtcbiAgICAgICAgICAgIHRoaXMucGFydHMucHVzaCh7dHlwZTogJ25vZGUnLCBpbmRleDogKytpbmRleH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBJZiB0aGVyZSdzIG5vIHRleHQsIHdlIG11c3QgaW5zZXJ0IGEgY29tbWVudCB0byBtYXJrIG91ciBwbGFjZS5cbiAgICAgICAgICAvLyBFbHNlLCB3ZSBjYW4gdHJ1c3QgaXQgd2lsbCBzdGljayBhcm91bmQgYWZ0ZXIgY2xvbmluZy5cbiAgICAgICAgICBpZiAoc3RyaW5nc1tsYXN0SW5kZXhdID09PSAnJykge1xuICAgICAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShjcmVhdGVNYXJrZXIoKSwgbm9kZSk7XG4gICAgICAgICAgICBub2Rlc1RvUmVtb3ZlLnB1c2gobm9kZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIChub2RlIGFzIFRleHQpLmRhdGEgPSBzdHJpbmdzW2xhc3RJbmRleF07XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFdlIGhhdmUgYSBwYXJ0IGZvciBlYWNoIG1hdGNoIGZvdW5kXG4gICAgICAgICAgcGFydEluZGV4ICs9IGxhc3RJbmRleDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChub2RlLm5vZGVUeXBlID09PSA4IC8qIE5vZGUuQ09NTUVOVF9OT0RFICovKSB7XG4gICAgICAgIGlmICgobm9kZSBhcyBDb21tZW50KS5kYXRhID09PSBtYXJrZXIpIHtcbiAgICAgICAgICBjb25zdCBwYXJlbnQgPSBub2RlLnBhcmVudE5vZGUhO1xuICAgICAgICAgIC8vIEFkZCBhIG5ldyBtYXJrZXIgbm9kZSB0byBiZSB0aGUgc3RhcnROb2RlIG9mIHRoZSBQYXJ0IGlmIGFueSBvZlxuICAgICAgICAgIC8vIHRoZSBmb2xsb3dpbmcgYXJlIHRydWU6XG4gICAgICAgICAgLy8gICogV2UgZG9uJ3QgaGF2ZSBhIHByZXZpb3VzU2libGluZ1xuICAgICAgICAgIC8vICAqIFRoZSBwcmV2aW91c1NpYmxpbmcgaXMgYWxyZWFkeSB0aGUgc3RhcnQgb2YgYSBwcmV2aW91cyBwYXJ0XG4gICAgICAgICAgaWYgKG5vZGUucHJldmlvdXNTaWJsaW5nID09PSBudWxsIHx8IGluZGV4ID09PSBsYXN0UGFydEluZGV4KSB7XG4gICAgICAgICAgICBpbmRleCsrO1xuICAgICAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShjcmVhdGVNYXJrZXIoKSwgbm9kZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxhc3RQYXJ0SW5kZXggPSBpbmRleDtcbiAgICAgICAgICB0aGlzLnBhcnRzLnB1c2goe3R5cGU6ICdub2RlJywgaW5kZXh9KTtcbiAgICAgICAgICAvLyBJZiB3ZSBkb24ndCBoYXZlIGEgbmV4dFNpYmxpbmcsIGtlZXAgdGhpcyBub2RlIHNvIHdlIGhhdmUgYW4gZW5kLlxuICAgICAgICAgIC8vIEVsc2UsIHdlIGNhbiByZW1vdmUgaXQgdG8gc2F2ZSBmdXR1cmUgY29zdHMuXG4gICAgICAgICAgaWYgKG5vZGUubmV4dFNpYmxpbmcgPT09IG51bGwpIHtcbiAgICAgICAgICAgIChub2RlIGFzIENvbW1lbnQpLmRhdGEgPSAnJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbm9kZXNUb1JlbW92ZS5wdXNoKG5vZGUpO1xuICAgICAgICAgICAgaW5kZXgtLTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcGFydEluZGV4Kys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0IGkgPSAtMTtcbiAgICAgICAgICB3aGlsZSAoKGkgPSAobm9kZSBhcyBDb21tZW50KS5kYXRhLmluZGV4T2YobWFya2VyLCBpICsgMSkpICE9PSAtMSkge1xuICAgICAgICAgICAgLy8gQ29tbWVudCBub2RlIGhhcyBhIGJpbmRpbmcgbWFya2VyIGluc2lkZSwgbWFrZSBhbiBpbmFjdGl2ZSBwYXJ0XG4gICAgICAgICAgICAvLyBUaGUgYmluZGluZyB3b24ndCB3b3JrLCBidXQgc3Vic2VxdWVudCBiaW5kaW5ncyB3aWxsXG4gICAgICAgICAgICAvLyBUT0RPIChqdXN0aW5mYWduYW5pKTogY29uc2lkZXIgd2hldGhlciBpdCdzIGV2ZW4gd29ydGggaXQgdG9cbiAgICAgICAgICAgIC8vIG1ha2UgYmluZGluZ3MgaW4gY29tbWVudHMgd29ya1xuICAgICAgICAgICAgdGhpcy5wYXJ0cy5wdXNoKHt0eXBlOiAnbm9kZScsIGluZGV4OiAtMX0pO1xuICAgICAgICAgICAgcGFydEluZGV4Kys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIHRleHQgYmluZGluZyBub2RlcyBhZnRlciB0aGUgd2FsayB0byBub3QgZGlzdHVyYiB0aGUgVHJlZVdhbGtlclxuICAgIGZvciAoY29uc3QgbiBvZiBub2Rlc1RvUmVtb3ZlKSB7XG4gICAgICBuLnBhcmVudE5vZGUhLnJlbW92ZUNoaWxkKG4pO1xuICAgIH1cbiAgfVxufVxuXG5jb25zdCBlbmRzV2l0aCA9IChzdHI6IHN0cmluZywgc3VmZml4OiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgY29uc3QgaW5kZXggPSBzdHIubGVuZ3RoIC0gc3VmZml4Lmxlbmd0aDtcbiAgcmV0dXJuIGluZGV4ID49IDAgJiYgc3RyLnNsaWNlKGluZGV4KSA9PT0gc3VmZml4O1xufTtcblxuLyoqXG4gKiBBIHBsYWNlaG9sZGVyIGZvciBhIGR5bmFtaWMgZXhwcmVzc2lvbiBpbiBhbiBIVE1MIHRlbXBsYXRlLlxuICpcbiAqIFRoZXJlIGFyZSB0d28gYnVpbHQtaW4gcGFydCB0eXBlczogQXR0cmlidXRlUGFydCBhbmQgTm9kZVBhcnQuIE5vZGVQYXJ0c1xuICogYWx3YXlzIHJlcHJlc2VudCBhIHNpbmdsZSBkeW5hbWljIGV4cHJlc3Npb24sIHdoaWxlIEF0dHJpYnV0ZVBhcnRzIG1heVxuICogcmVwcmVzZW50IGFzIG1hbnkgZXhwcmVzc2lvbnMgYXJlIGNvbnRhaW5lZCBpbiB0aGUgYXR0cmlidXRlLlxuICpcbiAqIEEgVGVtcGxhdGUncyBwYXJ0cyBhcmUgbXV0YWJsZSwgc28gcGFydHMgY2FuIGJlIHJlcGxhY2VkIG9yIG1vZGlmaWVkXG4gKiAocG9zc2libHkgdG8gaW1wbGVtZW50IGRpZmZlcmVudCB0ZW1wbGF0ZSBzZW1hbnRpY3MpLiBUaGUgY29udHJhY3QgaXMgdGhhdFxuICogcGFydHMgY2FuIG9ubHkgYmUgcmVwbGFjZWQsIG5vdCByZW1vdmVkLCBhZGRlZCBvciByZW9yZGVyZWQsIGFuZCBwYXJ0cyBtdXN0XG4gKiBhbHdheXMgY29uc3VtZSB0aGUgY29ycmVjdCBudW1iZXIgb2YgdmFsdWVzIGluIHRoZWlyIGB1cGRhdGUoKWAgbWV0aG9kLlxuICpcbiAqIFRPRE8oanVzdGluZmFnbmFuaSk6IFRoYXQgcmVxdWlyZW1lbnQgaXMgYSBsaXR0bGUgZnJhZ2lsZS4gQVxuICogVGVtcGxhdGVJbnN0YW5jZSBjb3VsZCBpbnN0ZWFkIGJlIG1vcmUgY2FyZWZ1bCBhYm91dCB3aGljaCB2YWx1ZXMgaXQgZ2l2ZXNcbiAqIHRvIFBhcnQudXBkYXRlKCkuXG4gKi9cbmV4cG9ydCB0eXBlIFRlbXBsYXRlUGFydCA9IHtcbiAgcmVhZG9ubHkgdHlwZTogJ25vZGUnLFxuICBpbmRleDogbnVtYmVyXG59fHtyZWFkb25seSB0eXBlOiAnYXR0cmlidXRlJywgaW5kZXg6IG51bWJlciwgcmVhZG9ubHkgbmFtZTogc3RyaW5nLCByZWFkb25seSBzdHJpbmdzOiBSZWFkb25seUFycmF5PHN0cmluZz59O1xuXG5leHBvcnQgY29uc3QgaXNUZW1wbGF0ZVBhcnRBY3RpdmUgPSAocGFydDogVGVtcGxhdGVQYXJ0KSA9PiBwYXJ0LmluZGV4ICE9PSAtMTtcblxuLy8gQWxsb3dzIGBkb2N1bWVudC5jcmVhdGVDb21tZW50KCcnKWAgdG8gYmUgcmVuYW1lZCBmb3IgYVxuLy8gc21hbGwgbWFudWFsIHNpemUtc2F2aW5ncy5cbmV4cG9ydCBjb25zdCBjcmVhdGVNYXJrZXIgPSAoKSA9PiBkb2N1bWVudC5jcmVhdGVDb21tZW50KCcnKTtcblxuLyoqXG4gKiBUaGlzIHJlZ2V4IGV4dHJhY3RzIHRoZSBhdHRyaWJ1dGUgbmFtZSBwcmVjZWRpbmcgYW4gYXR0cmlidXRlLXBvc2l0aW9uXG4gKiBleHByZXNzaW9uLiBJdCBkb2VzIHRoaXMgYnkgbWF0Y2hpbmcgdGhlIHN5bnRheCBhbGxvd2VkIGZvciBhdHRyaWJ1dGVzXG4gKiBhZ2FpbnN0IHRoZSBzdHJpbmcgbGl0ZXJhbCBkaXJlY3RseSBwcmVjZWRpbmcgdGhlIGV4cHJlc3Npb24sIGFzc3VtaW5nIHRoYXRcbiAqIHRoZSBleHByZXNzaW9uIGlzIGluIGFuIGF0dHJpYnV0ZS12YWx1ZSBwb3NpdGlvbi5cbiAqXG4gKiBTZWUgYXR0cmlidXRlcyBpbiB0aGUgSFRNTCBzcGVjOlxuICogaHR0cHM6Ly93d3cudzMub3JnL1RSL2h0bWw1L3N5bnRheC5odG1sI2VsZW1lbnRzLWF0dHJpYnV0ZXNcbiAqXG4gKiBcIiBcXHgwOVxceDBhXFx4MGNcXHgwZFwiIGFyZSBIVE1MIHNwYWNlIGNoYXJhY3RlcnM6XG4gKiBodHRwczovL3d3dy53My5vcmcvVFIvaHRtbDUvaW5mcmFzdHJ1Y3R1cmUuaHRtbCNzcGFjZS1jaGFyYWN0ZXJzXG4gKlxuICogXCJcXDAtXFx4MUZcXHg3Ri1cXHg5RlwiIGFyZSBVbmljb2RlIGNvbnRyb2wgY2hhcmFjdGVycywgd2hpY2ggaW5jbHVkZXMgZXZlcnlcbiAqIHNwYWNlIGNoYXJhY3RlciBleGNlcHQgXCIgXCIuXG4gKlxuICogU28gYW4gYXR0cmlidXRlIGlzOlxuICogICogVGhlIG5hbWU6IGFueSBjaGFyYWN0ZXIgZXhjZXB0IGEgY29udHJvbCBjaGFyYWN0ZXIsIHNwYWNlIGNoYXJhY3RlciwgKCcpLFxuICogICAgKFwiKSwgXCI+XCIsIFwiPVwiLCBvciBcIi9cIlxuICogICogRm9sbG93ZWQgYnkgemVybyBvciBtb3JlIHNwYWNlIGNoYXJhY3RlcnNcbiAqICAqIEZvbGxvd2VkIGJ5IFwiPVwiXG4gKiAgKiBGb2xsb3dlZCBieSB6ZXJvIG9yIG1vcmUgc3BhY2UgY2hhcmFjdGVyc1xuICogICogRm9sbG93ZWQgYnk6XG4gKiAgICAqIEFueSBjaGFyYWN0ZXIgZXhjZXB0IHNwYWNlLCAoJyksIChcIiksIFwiPFwiLCBcIj5cIiwgXCI9XCIsIChgKSwgb3JcbiAqICAgICogKFwiKSB0aGVuIGFueSBub24tKFwiKSwgb3JcbiAqICAgICogKCcpIHRoZW4gYW55IG5vbi0oJylcbiAqL1xuZXhwb3J0IGNvbnN0IGxhc3RBdHRyaWJ1dGVOYW1lUmVnZXggPVxuICAgIC8oWyBcXHgwOVxceDBhXFx4MGNcXHgwZF0pKFteXFwwLVxceDFGXFx4N0YtXFx4OUYgXCInPj0vXSspKFsgXFx4MDlcXHgwYVxceDBjXFx4MGRdKj1bIFxceDA5XFx4MGFcXHgwY1xceDBkXSooPzpbXiBcXHgwOVxceDBhXFx4MGNcXHgwZFwiJ2A8Pj1dKnxcIlteXCJdKnwnW14nXSopKSQvO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuXG4vKipcbiAqIEBtb2R1bGUgbGl0LWh0bWxcbiAqL1xuXG5pbXBvcnQge2lzQ0VQb2x5ZmlsbH0gZnJvbSAnLi9kb20uanMnO1xuaW1wb3J0IHtQYXJ0fSBmcm9tICcuL3BhcnQuanMnO1xuaW1wb3J0IHtSZW5kZXJPcHRpb25zfSBmcm9tICcuL3JlbmRlci1vcHRpb25zLmpzJztcbmltcG9ydCB7VGVtcGxhdGVQcm9jZXNzb3J9IGZyb20gJy4vdGVtcGxhdGUtcHJvY2Vzc29yLmpzJztcbmltcG9ydCB7aXNUZW1wbGF0ZVBhcnRBY3RpdmUsIFRlbXBsYXRlLCBUZW1wbGF0ZVBhcnR9IGZyb20gJy4vdGVtcGxhdGUuanMnO1xuXG4vKipcbiAqIEFuIGluc3RhbmNlIG9mIGEgYFRlbXBsYXRlYCB0aGF0IGNhbiBiZSBhdHRhY2hlZCB0byB0aGUgRE9NIGFuZCB1cGRhdGVkXG4gKiB3aXRoIG5ldyB2YWx1ZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZUluc3RhbmNlIHtcbiAgcHJpdmF0ZSByZWFkb25seSBfX3BhcnRzOiBBcnJheTxQYXJ0fHVuZGVmaW5lZD4gPSBbXTtcbiAgcmVhZG9ubHkgcHJvY2Vzc29yOiBUZW1wbGF0ZVByb2Nlc3NvcjtcbiAgcmVhZG9ubHkgb3B0aW9uczogUmVuZGVyT3B0aW9ucztcbiAgcmVhZG9ubHkgdGVtcGxhdGU6IFRlbXBsYXRlO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgdGVtcGxhdGU6IFRlbXBsYXRlLCBwcm9jZXNzb3I6IFRlbXBsYXRlUHJvY2Vzc29yLFxuICAgICAgb3B0aW9uczogUmVuZGVyT3B0aW9ucykge1xuICAgIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgICB0aGlzLnByb2Nlc3NvciA9IHByb2Nlc3NvcjtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICB9XG5cbiAgdXBkYXRlKHZhbHVlczogUmVhZG9ubHlBcnJheTx1bmtub3duPikge1xuICAgIGxldCBpID0gMDtcbiAgICBmb3IgKGNvbnN0IHBhcnQgb2YgdGhpcy5fX3BhcnRzKSB7XG4gICAgICBpZiAocGFydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHBhcnQuc2V0VmFsdWUodmFsdWVzW2ldKTtcbiAgICAgIH1cbiAgICAgIGkrKztcbiAgICB9XG4gICAgZm9yIChjb25zdCBwYXJ0IG9mIHRoaXMuX19wYXJ0cykge1xuICAgICAgaWYgKHBhcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBwYXJ0LmNvbW1pdCgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIF9jbG9uZSgpOiBEb2N1bWVudEZyYWdtZW50IHtcbiAgICAvLyBUaGVyZSBhcmUgYSBudW1iZXIgb2Ygc3RlcHMgaW4gdGhlIGxpZmVjeWNsZSBvZiBhIHRlbXBsYXRlIGluc3RhbmNlJ3NcbiAgICAvLyBET00gZnJhZ21lbnQ6XG4gICAgLy8gIDEuIENsb25lIC0gY3JlYXRlIHRoZSBpbnN0YW5jZSBmcmFnbWVudFxuICAgIC8vICAyLiBBZG9wdCAtIGFkb3B0IGludG8gdGhlIG1haW4gZG9jdW1lbnRcbiAgICAvLyAgMy4gUHJvY2VzcyAtIGZpbmQgcGFydCBtYXJrZXJzIGFuZCBjcmVhdGUgcGFydHNcbiAgICAvLyAgNC4gVXBncmFkZSAtIHVwZ3JhZGUgY3VzdG9tIGVsZW1lbnRzXG4gICAgLy8gIDUuIFVwZGF0ZSAtIHNldCBub2RlLCBhdHRyaWJ1dGUsIHByb3BlcnR5LCBldGMuLCB2YWx1ZXNcbiAgICAvLyAgNi4gQ29ubmVjdCAtIGNvbm5lY3QgdG8gdGhlIGRvY3VtZW50LiBPcHRpb25hbCBhbmQgb3V0c2lkZSBvZiB0aGlzXG4gICAgLy8gICAgIG1ldGhvZC5cbiAgICAvL1xuICAgIC8vIFdlIGhhdmUgYSBmZXcgY29uc3RyYWludHMgb24gdGhlIG9yZGVyaW5nIG9mIHRoZXNlIHN0ZXBzOlxuICAgIC8vICAqIFdlIG5lZWQgdG8gdXBncmFkZSBiZWZvcmUgdXBkYXRpbmcsIHNvIHRoYXQgcHJvcGVydHkgdmFsdWVzIHdpbGwgcGFzc1xuICAgIC8vICAgIHRocm91Z2ggYW55IHByb3BlcnR5IHNldHRlcnMuXG4gICAgLy8gICogV2Ugd291bGQgbGlrZSB0byBwcm9jZXNzIGJlZm9yZSB1cGdyYWRpbmcgc28gdGhhdCB3ZSdyZSBzdXJlIHRoYXQgdGhlXG4gICAgLy8gICAgY2xvbmVkIGZyYWdtZW50IGlzIGluZXJ0IGFuZCBub3QgZGlzdHVyYmVkIGJ5IHNlbGYtbW9kaWZ5aW5nIERPTS5cbiAgICAvLyAgKiBXZSB3YW50IGN1c3RvbSBlbGVtZW50cyB0byB1cGdyYWRlIGV2ZW4gaW4gZGlzY29ubmVjdGVkIGZyYWdtZW50cy5cbiAgICAvL1xuICAgIC8vIEdpdmVuIHRoZXNlIGNvbnN0cmFpbnRzLCB3aXRoIGZ1bGwgY3VzdG9tIGVsZW1lbnRzIHN1cHBvcnQgd2Ugd291bGRcbiAgICAvLyBwcmVmZXIgdGhlIG9yZGVyOiBDbG9uZSwgUHJvY2VzcywgQWRvcHQsIFVwZ3JhZGUsIFVwZGF0ZSwgQ29ubmVjdFxuICAgIC8vXG4gICAgLy8gQnV0IFNhZmFyaSBkb29lcyBub3QgaW1wbGVtZW50IEN1c3RvbUVsZW1lbnRSZWdpc3RyeSN1cGdyYWRlLCBzbyB3ZVxuICAgIC8vIGNhbiBub3QgaW1wbGVtZW50IHRoYXQgb3JkZXIgYW5kIHN0aWxsIGhhdmUgdXBncmFkZS1iZWZvcmUtdXBkYXRlIGFuZFxuICAgIC8vIHVwZ3JhZGUgZGlzY29ubmVjdGVkIGZyYWdtZW50cy4gU28gd2UgaW5zdGVhZCBzYWNyaWZpY2UgdGhlXG4gICAgLy8gcHJvY2Vzcy1iZWZvcmUtdXBncmFkZSBjb25zdHJhaW50LCBzaW5jZSBpbiBDdXN0b20gRWxlbWVudHMgdjEgZWxlbWVudHNcbiAgICAvLyBtdXN0IG5vdCBtb2RpZnkgdGhlaXIgbGlnaHQgRE9NIGluIHRoZSBjb25zdHJ1Y3Rvci4gV2Ugc3RpbGwgaGF2ZSBpc3N1ZXNcbiAgICAvLyB3aGVuIGNvLWV4aXN0aW5nIHdpdGggQ0V2MCBlbGVtZW50cyBsaWtlIFBvbHltZXIgMSwgYW5kIHdpdGggcG9seWZpbGxzXG4gICAgLy8gdGhhdCBkb24ndCBzdHJpY3RseSBhZGhlcmUgdG8gdGhlIG5vLW1vZGlmaWNhdGlvbiBydWxlIGJlY2F1c2Ugc2hhZG93XG4gICAgLy8gRE9NLCB3aGljaCBtYXkgYmUgY3JlYXRlZCBpbiB0aGUgY29uc3RydWN0b3IsIGlzIGVtdWxhdGVkIGJ5IGJlaW5nIHBsYWNlZFxuICAgIC8vIGluIHRoZSBsaWdodCBET00uXG4gICAgLy9cbiAgICAvLyBUaGUgcmVzdWx0aW5nIG9yZGVyIGlzIG9uIG5hdGl2ZSBpczogQ2xvbmUsIEFkb3B0LCBVcGdyYWRlLCBQcm9jZXNzLFxuICAgIC8vIFVwZGF0ZSwgQ29ubmVjdC4gZG9jdW1lbnQuaW1wb3J0Tm9kZSgpIHBlcmZvcm1zIENsb25lLCBBZG9wdCwgYW5kIFVwZ3JhZGVcbiAgICAvLyBpbiBvbmUgc3RlcC5cbiAgICAvL1xuICAgIC8vIFRoZSBDdXN0b20gRWxlbWVudHMgdjEgcG9seWZpbGwgc3VwcG9ydHMgdXBncmFkZSgpLCBzbyB0aGUgb3JkZXIgd2hlblxuICAgIC8vIHBvbHlmaWxsZWQgaXMgdGhlIG1vcmUgaWRlYWw6IENsb25lLCBQcm9jZXNzLCBBZG9wdCwgVXBncmFkZSwgVXBkYXRlLFxuICAgIC8vIENvbm5lY3QuXG5cbiAgICBjb25zdCBmcmFnbWVudCA9IGlzQ0VQb2x5ZmlsbCA/XG4gICAgICAgIHRoaXMudGVtcGxhdGUuZWxlbWVudC5jb250ZW50LmNsb25lTm9kZSh0cnVlKSBhcyBEb2N1bWVudEZyYWdtZW50IDpcbiAgICAgICAgZG9jdW1lbnQuaW1wb3J0Tm9kZSh0aGlzLnRlbXBsYXRlLmVsZW1lbnQuY29udGVudCwgdHJ1ZSk7XG5cbiAgICBjb25zdCBzdGFjazogTm9kZVtdID0gW107XG4gICAgY29uc3QgcGFydHMgPSB0aGlzLnRlbXBsYXRlLnBhcnRzO1xuICAgIC8vIEVkZ2UgbmVlZHMgYWxsIDQgcGFyYW1ldGVycyBwcmVzZW50OyBJRTExIG5lZWRzIDNyZCBwYXJhbWV0ZXIgdG8gYmUgbnVsbFxuICAgIGNvbnN0IHdhbGtlciA9IGRvY3VtZW50LmNyZWF0ZVRyZWVXYWxrZXIoXG4gICAgICAgIGZyYWdtZW50LFxuICAgICAgICAxMzMgLyogTm9kZUZpbHRlci5TSE9XX3tFTEVNRU5UfENPTU1FTlR8VEVYVH0gKi8sXG4gICAgICAgIG51bGwsXG4gICAgICAgIGZhbHNlKTtcbiAgICBsZXQgcGFydEluZGV4ID0gMDtcbiAgICBsZXQgbm9kZUluZGV4ID0gMDtcbiAgICBsZXQgcGFydDogVGVtcGxhdGVQYXJ0O1xuICAgIGxldCBub2RlID0gd2Fsa2VyLm5leHROb2RlKCk7XG4gICAgLy8gTG9vcCB0aHJvdWdoIGFsbCB0aGUgbm9kZXMgYW5kIHBhcnRzIG9mIGEgdGVtcGxhdGVcbiAgICB3aGlsZSAocGFydEluZGV4IDwgcGFydHMubGVuZ3RoKSB7XG4gICAgICBwYXJ0ID0gcGFydHNbcGFydEluZGV4XTtcbiAgICAgIGlmICghaXNUZW1wbGF0ZVBhcnRBY3RpdmUocGFydCkpIHtcbiAgICAgICAgdGhpcy5fX3BhcnRzLnB1c2godW5kZWZpbmVkKTtcbiAgICAgICAgcGFydEluZGV4Kys7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBQcm9ncmVzcyB0aGUgdHJlZSB3YWxrZXIgdW50aWwgd2UgZmluZCBvdXIgbmV4dCBwYXJ0J3Mgbm9kZS5cbiAgICAgIC8vIE5vdGUgdGhhdCBtdWx0aXBsZSBwYXJ0cyBtYXkgc2hhcmUgdGhlIHNhbWUgbm9kZSAoYXR0cmlidXRlIHBhcnRzXG4gICAgICAvLyBvbiBhIHNpbmdsZSBlbGVtZW50KSwgc28gdGhpcyBsb29wIG1heSBub3QgcnVuIGF0IGFsbC5cbiAgICAgIHdoaWxlIChub2RlSW5kZXggPCBwYXJ0LmluZGV4KSB7XG4gICAgICAgIG5vZGVJbmRleCsrO1xuICAgICAgICBpZiAobm9kZSEubm9kZU5hbWUgPT09ICdURU1QTEFURScpIHtcbiAgICAgICAgICBzdGFjay5wdXNoKG5vZGUhKTtcbiAgICAgICAgICB3YWxrZXIuY3VycmVudE5vZGUgPSAobm9kZSBhcyBIVE1MVGVtcGxhdGVFbGVtZW50KS5jb250ZW50O1xuICAgICAgICB9XG4gICAgICAgIGlmICgobm9kZSA9IHdhbGtlci5uZXh0Tm9kZSgpKSA9PT0gbnVsbCkge1xuICAgICAgICAgIC8vIFdlJ3ZlIGV4aGF1c3RlZCB0aGUgY29udGVudCBpbnNpZGUgYSBuZXN0ZWQgdGVtcGxhdGUgZWxlbWVudC5cbiAgICAgICAgICAvLyBCZWNhdXNlIHdlIHN0aWxsIGhhdmUgcGFydHMgKHRoZSBvdXRlciBmb3ItbG9vcCksIHdlIGtub3c6XG4gICAgICAgICAgLy8gLSBUaGVyZSBpcyBhIHRlbXBsYXRlIGluIHRoZSBzdGFja1xuICAgICAgICAgIC8vIC0gVGhlIHdhbGtlciB3aWxsIGZpbmQgYSBuZXh0Tm9kZSBvdXRzaWRlIHRoZSB0ZW1wbGF0ZVxuICAgICAgICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IHN0YWNrLnBvcCgpITtcbiAgICAgICAgICBub2RlID0gd2Fsa2VyLm5leHROb2RlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gV2UndmUgYXJyaXZlZCBhdCBvdXIgcGFydCdzIG5vZGUuXG4gICAgICBpZiAocGFydC50eXBlID09PSAnbm9kZScpIHtcbiAgICAgICAgY29uc3QgcGFydCA9IHRoaXMucHJvY2Vzc29yLmhhbmRsZVRleHRFeHByZXNzaW9uKHRoaXMub3B0aW9ucyk7XG4gICAgICAgIHBhcnQuaW5zZXJ0QWZ0ZXJOb2RlKG5vZGUhLnByZXZpb3VzU2libGluZyEpO1xuICAgICAgICB0aGlzLl9fcGFydHMucHVzaChwYXJ0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX19wYXJ0cy5wdXNoKC4uLnRoaXMucHJvY2Vzc29yLmhhbmRsZUF0dHJpYnV0ZUV4cHJlc3Npb25zKFxuICAgICAgICAgICAgbm9kZSBhcyBFbGVtZW50LCBwYXJ0Lm5hbWUsIHBhcnQuc3RyaW5ncywgdGhpcy5vcHRpb25zKSk7XG4gICAgICB9XG4gICAgICBwYXJ0SW5kZXgrKztcbiAgICB9XG5cbiAgICBpZiAoaXNDRVBvbHlmaWxsKSB7XG4gICAgICBkb2N1bWVudC5hZG9wdE5vZGUoZnJhZ21lbnQpO1xuICAgICAgY3VzdG9tRWxlbWVudHMudXBncmFkZShmcmFnbWVudCk7XG4gICAgfVxuICAgIHJldHVybiBmcmFnbWVudDtcbiAgfVxufVxuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuXG4vKipcbiAqIEBtb2R1bGUgbGl0LWh0bWxcbiAqL1xuXG5pbXBvcnQge3JlcGFyZW50Tm9kZXN9IGZyb20gJy4vZG9tLmpzJztcbmltcG9ydCB7VGVtcGxhdGVQcm9jZXNzb3J9IGZyb20gJy4vdGVtcGxhdGUtcHJvY2Vzc29yLmpzJztcbmltcG9ydCB7Ym91bmRBdHRyaWJ1dGVTdWZmaXgsIGxhc3RBdHRyaWJ1dGVOYW1lUmVnZXgsIG1hcmtlciwgbm9kZU1hcmtlcn0gZnJvbSAnLi90ZW1wbGF0ZS5qcyc7XG5cbmNvbnN0IGNvbW1lbnRNYXJrZXIgPSBgICR7bWFya2VyfSBgO1xuXG4vKipcbiAqIFRoZSByZXR1cm4gdHlwZSBvZiBgaHRtbGAsIHdoaWNoIGhvbGRzIGEgVGVtcGxhdGUgYW5kIHRoZSB2YWx1ZXMgZnJvbVxuICogaW50ZXJwb2xhdGVkIGV4cHJlc3Npb25zLlxuICovXG5leHBvcnQgY2xhc3MgVGVtcGxhdGVSZXN1bHQge1xuICByZWFkb25seSBzdHJpbmdzOiBUZW1wbGF0ZVN0cmluZ3NBcnJheTtcbiAgcmVhZG9ubHkgdmFsdWVzOiBSZWFkb25seUFycmF5PHVua25vd24+O1xuICByZWFkb25seSB0eXBlOiBzdHJpbmc7XG4gIHJlYWRvbmx5IHByb2Nlc3NvcjogVGVtcGxhdGVQcm9jZXNzb3I7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBzdHJpbmdzOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSwgdmFsdWVzOiBSZWFkb25seUFycmF5PHVua25vd24+LFxuICAgICAgdHlwZTogc3RyaW5nLCBwcm9jZXNzb3I6IFRlbXBsYXRlUHJvY2Vzc29yKSB7XG4gICAgdGhpcy5zdHJpbmdzID0gc3RyaW5ncztcbiAgICB0aGlzLnZhbHVlcyA9IHZhbHVlcztcbiAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIHRoaXMucHJvY2Vzc29yID0gcHJvY2Vzc29yO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBzdHJpbmcgb2YgSFRNTCB1c2VkIHRvIGNyZWF0ZSBhIGA8dGVtcGxhdGU+YCBlbGVtZW50LlxuICAgKi9cbiAgZ2V0SFRNTCgpOiBzdHJpbmcge1xuICAgIGNvbnN0IGwgPSB0aGlzLnN0cmluZ3MubGVuZ3RoIC0gMTtcbiAgICBsZXQgaHRtbCA9ICcnO1xuICAgIGxldCBpc0NvbW1lbnRCaW5kaW5nID0gZmFsc2U7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgY29uc3QgcyA9IHRoaXMuc3RyaW5nc1tpXTtcbiAgICAgIC8vIEZvciBlYWNoIGJpbmRpbmcgd2Ugd2FudCB0byBkZXRlcm1pbmUgdGhlIGtpbmQgb2YgbWFya2VyIHRvIGluc2VydFxuICAgICAgLy8gaW50byB0aGUgdGVtcGxhdGUgc291cmNlIGJlZm9yZSBpdCdzIHBhcnNlZCBieSB0aGUgYnJvd3NlcidzIEhUTUxcbiAgICAgIC8vIHBhcnNlci4gVGhlIG1hcmtlciB0eXBlIGlzIGJhc2VkIG9uIHdoZXRoZXIgdGhlIGV4cHJlc3Npb24gaXMgaW4gYW5cbiAgICAgIC8vIGF0dHJpYnV0ZSwgdGV4dCwgb3IgY29tbWVudCBwb2lzaXRpb24uXG4gICAgICAvLyAgICogRm9yIG5vZGUtcG9zaXRpb24gYmluZGluZ3Mgd2UgaW5zZXJ0IGEgY29tbWVudCB3aXRoIHRoZSBtYXJrZXJcbiAgICAgIC8vICAgICBzZW50aW5lbCBhcyBpdHMgdGV4dCBjb250ZW50LCBsaWtlIDwhLS17e2xpdC1ndWlkfX0tLT4uXG4gICAgICAvLyAgICogRm9yIGF0dHJpYnV0ZSBiaW5kaW5ncyB3ZSBpbnNlcnQganVzdCB0aGUgbWFya2VyIHNlbnRpbmVsIGZvciB0aGVcbiAgICAgIC8vICAgICBmaXJzdCBiaW5kaW5nLCBzbyB0aGF0IHdlIHN1cHBvcnQgdW5xdW90ZWQgYXR0cmlidXRlIGJpbmRpbmdzLlxuICAgICAgLy8gICAgIFN1YnNlcXVlbnQgYmluZGluZ3MgY2FuIHVzZSBhIGNvbW1lbnQgbWFya2VyIGJlY2F1c2UgbXVsdGktYmluZGluZ1xuICAgICAgLy8gICAgIGF0dHJpYnV0ZXMgbXVzdCBiZSBxdW90ZWQuXG4gICAgICAvLyAgICogRm9yIGNvbW1lbnQgYmluZGluZ3Mgd2UgaW5zZXJ0IGp1c3QgdGhlIG1hcmtlciBzZW50aW5lbCBzbyB3ZSBkb24ndFxuICAgICAgLy8gICAgIGNsb3NlIHRoZSBjb21tZW50LlxuICAgICAgLy9cbiAgICAgIC8vIFRoZSBmb2xsb3dpbmcgY29kZSBzY2FucyB0aGUgdGVtcGxhdGUgc291cmNlLCBidXQgaXMgKm5vdCogYW4gSFRNTFxuICAgICAgLy8gcGFyc2VyLiBXZSBkb24ndCBuZWVkIHRvIHRyYWNrIHRoZSB0cmVlIHN0cnVjdHVyZSBvZiB0aGUgSFRNTCwgb25seVxuICAgICAgLy8gd2hldGhlciBhIGJpbmRpbmcgaXMgaW5zaWRlIGEgY29tbWVudCwgYW5kIGlmIG5vdCwgaWYgaXQgYXBwZWFycyB0byBiZVxuICAgICAgLy8gdGhlIGZpcnN0IGJpbmRpbmcgaW4gYW4gYXR0cmlidXRlLlxuICAgICAgY29uc3QgY29tbWVudE9wZW4gPSBzLmxhc3RJbmRleE9mKCc8IS0tJyk7XG4gICAgICAvLyBXZSdyZSBpbiBjb21tZW50IHBvc2l0aW9uIGlmIHdlIGhhdmUgYSBjb21tZW50IG9wZW4gd2l0aCBubyBmb2xsb3dpbmdcbiAgICAgIC8vIGNvbW1lbnQgY2xvc2UuIEJlY2F1c2UgPC0tIGNhbiBhcHBlYXIgaW4gYW4gYXR0cmlidXRlIHZhbHVlIHRoZXJlIGNhblxuICAgICAgLy8gYmUgZmFsc2UgcG9zaXRpdmVzLlxuICAgICAgaXNDb21tZW50QmluZGluZyA9IChjb21tZW50T3BlbiA+IC0xIHx8IGlzQ29tbWVudEJpbmRpbmcpICYmXG4gICAgICAgICAgcy5pbmRleE9mKCctLT4nLCBjb21tZW50T3BlbiArIDEpID09PSAtMTtcbiAgICAgIC8vIENoZWNrIHRvIHNlZSBpZiB3ZSBoYXZlIGFuIGF0dHJpYnV0ZS1saWtlIHNlcXVlbmNlIHByZWNlZWRpbmcgdGhlXG4gICAgICAvLyBleHByZXNzaW9uLiBUaGlzIGNhbiBtYXRjaCBcIm5hbWU9dmFsdWVcIiBsaWtlIHN0cnVjdHVyZXMgaW4gdGV4dCxcbiAgICAgIC8vIGNvbW1lbnRzLCBhbmQgYXR0cmlidXRlIHZhbHVlcywgc28gdGhlcmUgY2FuIGJlIGZhbHNlLXBvc2l0aXZlcy5cbiAgICAgIGNvbnN0IGF0dHJpYnV0ZU1hdGNoID0gbGFzdEF0dHJpYnV0ZU5hbWVSZWdleC5leGVjKHMpO1xuICAgICAgaWYgKGF0dHJpYnV0ZU1hdGNoID09PSBudWxsKSB7XG4gICAgICAgIC8vIFdlJ3JlIG9ubHkgaW4gdGhpcyBicmFuY2ggaWYgd2UgZG9uJ3QgaGF2ZSBhIGF0dHJpYnV0ZS1saWtlXG4gICAgICAgIC8vIHByZWNlZWRpbmcgc2VxdWVuY2UuIEZvciBjb21tZW50cywgdGhpcyBndWFyZHMgYWdhaW5zdCB1bnVzdWFsXG4gICAgICAgIC8vIGF0dHJpYnV0ZSB2YWx1ZXMgbGlrZSA8ZGl2IGZvbz1cIjwhLS0keydiYXInfVwiPi4gQ2FzZXMgbGlrZVxuICAgICAgICAvLyA8IS0tIGZvbz0keydiYXInfS0tPiBhcmUgaGFuZGxlZCBjb3JyZWN0bHkgaW4gdGhlIGF0dHJpYnV0ZSBicmFuY2hcbiAgICAgICAgLy8gYmVsb3cuXG4gICAgICAgIGh0bWwgKz0gcyArIChpc0NvbW1lbnRCaW5kaW5nID8gY29tbWVudE1hcmtlciA6IG5vZGVNYXJrZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRm9yIGF0dHJpYnV0ZXMgd2UgdXNlIGp1c3QgYSBtYXJrZXIgc2VudGluZWwsIGFuZCBhbHNvIGFwcGVuZCBhXG4gICAgICAgIC8vICRsaXQkIHN1ZmZpeCB0byB0aGUgbmFtZSB0byBvcHQtb3V0IG9mIGF0dHJpYnV0ZS1zcGVjaWZpYyBwYXJzaW5nXG4gICAgICAgIC8vIHRoYXQgSUUgYW5kIEVkZ2UgZG8gZm9yIHN0eWxlIGFuZCBjZXJ0YWluIFNWRyBhdHRyaWJ1dGVzLlxuICAgICAgICBodG1sICs9IHMuc3Vic3RyKDAsIGF0dHJpYnV0ZU1hdGNoLmluZGV4KSArIGF0dHJpYnV0ZU1hdGNoWzFdICtcbiAgICAgICAgICAgIGF0dHJpYnV0ZU1hdGNoWzJdICsgYm91bmRBdHRyaWJ1dGVTdWZmaXggKyBhdHRyaWJ1dGVNYXRjaFszXSArXG4gICAgICAgICAgICBtYXJrZXI7XG4gICAgICB9XG4gICAgfVxuICAgIGh0bWwgKz0gdGhpcy5zdHJpbmdzW2xdO1xuICAgIHJldHVybiBodG1sO1xuICB9XG5cbiAgZ2V0VGVtcGxhdGVFbGVtZW50KCk6IEhUTUxUZW1wbGF0ZUVsZW1lbnQge1xuICAgIGNvbnN0IHRlbXBsYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSB0aGlzLmdldEhUTUwoKTtcbiAgICByZXR1cm4gdGVtcGxhdGU7XG4gIH1cbn1cblxuLyoqXG4gKiBBIFRlbXBsYXRlUmVzdWx0IGZvciBTVkcgZnJhZ21lbnRzLlxuICpcbiAqIFRoaXMgY2xhc3Mgd3JhcHMgSFRNTCBpbiBhbiBgPHN2Zz5gIHRhZyBpbiBvcmRlciB0byBwYXJzZSBpdHMgY29udGVudHMgaW4gdGhlXG4gKiBTVkcgbmFtZXNwYWNlLCB0aGVuIG1vZGlmaWVzIHRoZSB0ZW1wbGF0ZSB0byByZW1vdmUgdGhlIGA8c3ZnPmAgdGFnIHNvIHRoYXRcbiAqIGNsb25lcyBvbmx5IGNvbnRhaW5lciB0aGUgb3JpZ2luYWwgZnJhZ21lbnQuXG4gKi9cbmV4cG9ydCBjbGFzcyBTVkdUZW1wbGF0ZVJlc3VsdCBleHRlbmRzIFRlbXBsYXRlUmVzdWx0IHtcbiAgZ2V0SFRNTCgpOiBzdHJpbmcge1xuICAgIHJldHVybiBgPHN2Zz4ke3N1cGVyLmdldEhUTUwoKX08L3N2Zz5gO1xuICB9XG5cbiAgZ2V0VGVtcGxhdGVFbGVtZW50KCk6IEhUTUxUZW1wbGF0ZUVsZW1lbnQge1xuICAgIGNvbnN0IHRlbXBsYXRlID0gc3VwZXIuZ2V0VGVtcGxhdGVFbGVtZW50KCk7XG4gICAgY29uc3QgY29udGVudCA9IHRlbXBsYXRlLmNvbnRlbnQ7XG4gICAgY29uc3Qgc3ZnRWxlbWVudCA9IGNvbnRlbnQuZmlyc3RDaGlsZCE7XG4gICAgY29udGVudC5yZW1vdmVDaGlsZChzdmdFbGVtZW50KTtcbiAgICByZXBhcmVudE5vZGVzKGNvbnRlbnQsIHN2Z0VsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgcmV0dXJuIHRlbXBsYXRlO1xuICB9XG59XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG5cbi8qKlxuICogQG1vZHVsZSBsaXQtaHRtbFxuICovXG5cbmltcG9ydCB7aXNEaXJlY3RpdmV9IGZyb20gJy4vZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7cmVtb3ZlTm9kZXN9IGZyb20gJy4vZG9tLmpzJztcbmltcG9ydCB7bm9DaGFuZ2UsIG5vdGhpbmcsIFBhcnR9IGZyb20gJy4vcGFydC5qcyc7XG5pbXBvcnQge1JlbmRlck9wdGlvbnN9IGZyb20gJy4vcmVuZGVyLW9wdGlvbnMuanMnO1xuaW1wb3J0IHtUZW1wbGF0ZUluc3RhbmNlfSBmcm9tICcuL3RlbXBsYXRlLWluc3RhbmNlLmpzJztcbmltcG9ydCB7VGVtcGxhdGVSZXN1bHR9IGZyb20gJy4vdGVtcGxhdGUtcmVzdWx0LmpzJztcbmltcG9ydCB7Y3JlYXRlTWFya2VyfSBmcm9tICcuL3RlbXBsYXRlLmpzJztcblxuLy8gaHR0cHM6Ly90YzM5LmdpdGh1Yi5pby9lY21hMjYyLyNzZWMtdHlwZW9mLW9wZXJhdG9yXG5leHBvcnQgdHlwZSBQcmltaXRpdmUgPSBudWxsfHVuZGVmaW5lZHxib29sZWFufG51bWJlcnxzdHJpbmd8U3ltYm9sfGJpZ2ludDtcbmV4cG9ydCBjb25zdCBpc1ByaW1pdGl2ZSA9ICh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFByaW1pdGl2ZSA9PiB7XG4gIHJldHVybiAoXG4gICAgICB2YWx1ZSA9PT0gbnVsbCB8fFxuICAgICAgISh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykpO1xufTtcbmV4cG9ydCBjb25zdCBpc0l0ZXJhYmxlID0gKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgSXRlcmFibGU8dW5rbm93bj4gPT4ge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHxcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgICEhKHZhbHVlICYmICh2YWx1ZSBhcyBhbnkpW1N5bWJvbC5pdGVyYXRvcl0pO1xufTtcblxuLyoqXG4gKiBXcml0ZXMgYXR0cmlidXRlIHZhbHVlcyB0byB0aGUgRE9NIGZvciBhIGdyb3VwIG9mIEF0dHJpYnV0ZVBhcnRzIGJvdW5kIHRvIGFcbiAqIHNpbmdsZSBhdHRpYnV0ZS4gVGhlIHZhbHVlIGlzIG9ubHkgc2V0IG9uY2UgZXZlbiBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgcGFydHNcbiAqIGZvciBhbiBhdHRyaWJ1dGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBBdHRyaWJ1dGVDb21taXR0ZXIge1xuICByZWFkb25seSBlbGVtZW50OiBFbGVtZW50O1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IHN0cmluZ3M6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPjtcbiAgcmVhZG9ubHkgcGFydHM6IFJlYWRvbmx5QXJyYXk8QXR0cmlidXRlUGFydD47XG4gIGRpcnR5ID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3RvcihlbGVtZW50OiBFbGVtZW50LCBuYW1lOiBzdHJpbmcsIHN0cmluZ3M6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPikge1xuICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLnN0cmluZ3MgPSBzdHJpbmdzO1xuICAgIHRoaXMucGFydHMgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN0cmluZ3MubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAodGhpcy5wYXJ0cyBhcyBBdHRyaWJ1dGVQYXJ0W10pW2ldID0gdGhpcy5fY3JlYXRlUGFydCgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgc2luZ2xlIHBhcnQuIE92ZXJyaWRlIHRoaXMgdG8gY3JlYXRlIGEgZGlmZmVybnQgdHlwZSBvZiBwYXJ0LlxuICAgKi9cbiAgcHJvdGVjdGVkIF9jcmVhdGVQYXJ0KCk6IEF0dHJpYnV0ZVBhcnQge1xuICAgIHJldHVybiBuZXcgQXR0cmlidXRlUGFydCh0aGlzKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBfZ2V0VmFsdWUoKTogdW5rbm93biB7XG4gICAgY29uc3Qgc3RyaW5ncyA9IHRoaXMuc3RyaW5ncztcbiAgICBjb25zdCBsID0gc3RyaW5ncy5sZW5ndGggLSAxO1xuICAgIGxldCB0ZXh0ID0gJyc7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgdGV4dCArPSBzdHJpbmdzW2ldO1xuICAgICAgY29uc3QgcGFydCA9IHRoaXMucGFydHNbaV07XG4gICAgICBpZiAocGFydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnN0IHYgPSBwYXJ0LnZhbHVlO1xuICAgICAgICBpZiAoaXNQcmltaXRpdmUodikgfHwgIWlzSXRlcmFibGUodikpIHtcbiAgICAgICAgICB0ZXh0ICs9IHR5cGVvZiB2ID09PSAnc3RyaW5nJyA/IHYgOiBTdHJpbmcodik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm9yIChjb25zdCB0IG9mIHYpIHtcbiAgICAgICAgICAgIHRleHQgKz0gdHlwZW9mIHQgPT09ICdzdHJpbmcnID8gdCA6IFN0cmluZyh0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0ZXh0ICs9IHN0cmluZ3NbbF07XG4gICAgcmV0dXJuIHRleHQ7XG4gIH1cblxuICBjb21taXQoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZGlydHkpIHtcbiAgICAgIHRoaXMuZGlydHkgPSBmYWxzZTtcbiAgICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGUodGhpcy5uYW1lLCB0aGlzLl9nZXRWYWx1ZSgpIGFzIHN0cmluZyk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQSBQYXJ0IHRoYXQgY29udHJvbHMgYWxsIG9yIHBhcnQgb2YgYW4gYXR0cmlidXRlIHZhbHVlLlxuICovXG5leHBvcnQgY2xhc3MgQXR0cmlidXRlUGFydCBpbXBsZW1lbnRzIFBhcnQge1xuICByZWFkb25seSBjb21taXR0ZXI6IEF0dHJpYnV0ZUNvbW1pdHRlcjtcbiAgdmFsdWU6IHVua25vd24gPSB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IoY29tbWl0dGVyOiBBdHRyaWJ1dGVDb21taXR0ZXIpIHtcbiAgICB0aGlzLmNvbW1pdHRlciA9IGNvbW1pdHRlcjtcbiAgfVxuXG4gIHNldFZhbHVlKHZhbHVlOiB1bmtub3duKTogdm9pZCB7XG4gICAgaWYgKHZhbHVlICE9PSBub0NoYW5nZSAmJiAoIWlzUHJpbWl0aXZlKHZhbHVlKSB8fCB2YWx1ZSAhPT0gdGhpcy52YWx1ZSkpIHtcbiAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICAgIC8vIElmIHRoZSB2YWx1ZSBpcyBhIG5vdCBhIGRpcmVjdGl2ZSwgZGlydHkgdGhlIGNvbW1pdHRlciBzbyB0aGF0IGl0J2xsXG4gICAgICAvLyBjYWxsIHNldEF0dHJpYnV0ZS4gSWYgdGhlIHZhbHVlIGlzIGEgZGlyZWN0aXZlLCBpdCdsbCBkaXJ0eSB0aGVcbiAgICAgIC8vIGNvbW1pdHRlciBpZiBpdCBjYWxscyBzZXRWYWx1ZSgpLlxuICAgICAgaWYgKCFpc0RpcmVjdGl2ZSh2YWx1ZSkpIHtcbiAgICAgICAgdGhpcy5jb21taXR0ZXIuZGlydHkgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbW1pdCgpIHtcbiAgICB3aGlsZSAoaXNEaXJlY3RpdmUodGhpcy52YWx1ZSkpIHtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IHRoaXMudmFsdWU7XG4gICAgICB0aGlzLnZhbHVlID0gbm9DaGFuZ2U7XG4gICAgICBkaXJlY3RpdmUodGhpcyk7XG4gICAgfVxuICAgIGlmICh0aGlzLnZhbHVlID09PSBub0NoYW5nZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmNvbW1pdHRlci5jb21taXQoKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgUGFydCB0aGF0IGNvbnRyb2xzIGEgbG9jYXRpb24gd2l0aGluIGEgTm9kZSB0cmVlLiBMaWtlIGEgUmFuZ2UsIE5vZGVQYXJ0XG4gKiBoYXMgc3RhcnQgYW5kIGVuZCBsb2NhdGlvbnMgYW5kIGNhbiBzZXQgYW5kIHVwZGF0ZSB0aGUgTm9kZXMgYmV0d2VlbiB0aG9zZVxuICogbG9jYXRpb25zLlxuICpcbiAqIE5vZGVQYXJ0cyBzdXBwb3J0IHNldmVyYWwgdmFsdWUgdHlwZXM6IHByaW1pdGl2ZXMsIE5vZGVzLCBUZW1wbGF0ZVJlc3VsdHMsXG4gKiBhcyB3ZWxsIGFzIGFycmF5cyBhbmQgaXRlcmFibGVzIG9mIHRob3NlIHR5cGVzLlxuICovXG5leHBvcnQgY2xhc3MgTm9kZVBhcnQgaW1wbGVtZW50cyBQYXJ0IHtcbiAgcmVhZG9ubHkgb3B0aW9uczogUmVuZGVyT3B0aW9ucztcbiAgc3RhcnROb2RlITogTm9kZTtcbiAgZW5kTm9kZSE6IE5vZGU7XG4gIHZhbHVlOiB1bmtub3duID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIF9fcGVuZGluZ1ZhbHVlOiB1bmtub3duID0gdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFJlbmRlck9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICB9XG5cbiAgLyoqXG4gICAqIEFwcGVuZHMgdGhpcyBwYXJ0IGludG8gYSBjb250YWluZXIuXG4gICAqXG4gICAqIFRoaXMgcGFydCBtdXN0IGJlIGVtcHR5LCBhcyBpdHMgY29udGVudHMgYXJlIG5vdCBhdXRvbWF0aWNhbGx5IG1vdmVkLlxuICAgKi9cbiAgYXBwZW5kSW50byhjb250YWluZXI6IE5vZGUpIHtcbiAgICB0aGlzLnN0YXJ0Tm9kZSA9IGNvbnRhaW5lci5hcHBlbmRDaGlsZChjcmVhdGVNYXJrZXIoKSk7XG4gICAgdGhpcy5lbmROb2RlID0gY29udGFpbmVyLmFwcGVuZENoaWxkKGNyZWF0ZU1hcmtlcigpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbnNlcnRzIHRoaXMgcGFydCBhZnRlciB0aGUgYHJlZmAgbm9kZSAoYmV0d2VlbiBgcmVmYCBhbmQgYHJlZmAncyBuZXh0XG4gICAqIHNpYmxpbmcpLiBCb3RoIGByZWZgIGFuZCBpdHMgbmV4dCBzaWJsaW5nIG11c3QgYmUgc3RhdGljLCB1bmNoYW5naW5nIG5vZGVzXG4gICAqIHN1Y2ggYXMgdGhvc2UgdGhhdCBhcHBlYXIgaW4gYSBsaXRlcmFsIHNlY3Rpb24gb2YgYSB0ZW1wbGF0ZS5cbiAgICpcbiAgICogVGhpcyBwYXJ0IG11c3QgYmUgZW1wdHksIGFzIGl0cyBjb250ZW50cyBhcmUgbm90IGF1dG9tYXRpY2FsbHkgbW92ZWQuXG4gICAqL1xuICBpbnNlcnRBZnRlck5vZGUocmVmOiBOb2RlKSB7XG4gICAgdGhpcy5zdGFydE5vZGUgPSByZWY7XG4gICAgdGhpcy5lbmROb2RlID0gcmVmLm5leHRTaWJsaW5nITtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBlbmRzIHRoaXMgcGFydCBpbnRvIGEgcGFyZW50IHBhcnQuXG4gICAqXG4gICAqIFRoaXMgcGFydCBtdXN0IGJlIGVtcHR5LCBhcyBpdHMgY29udGVudHMgYXJlIG5vdCBhdXRvbWF0aWNhbGx5IG1vdmVkLlxuICAgKi9cbiAgYXBwZW5kSW50b1BhcnQocGFydDogTm9kZVBhcnQpIHtcbiAgICBwYXJ0Ll9faW5zZXJ0KHRoaXMuc3RhcnROb2RlID0gY3JlYXRlTWFya2VyKCkpO1xuICAgIHBhcnQuX19pbnNlcnQodGhpcy5lbmROb2RlID0gY3JlYXRlTWFya2VyKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluc2VydHMgdGhpcyBwYXJ0IGFmdGVyIHRoZSBgcmVmYCBwYXJ0LlxuICAgKlxuICAgKiBUaGlzIHBhcnQgbXVzdCBiZSBlbXB0eSwgYXMgaXRzIGNvbnRlbnRzIGFyZSBub3QgYXV0b21hdGljYWxseSBtb3ZlZC5cbiAgICovXG4gIGluc2VydEFmdGVyUGFydChyZWY6IE5vZGVQYXJ0KSB7XG4gICAgcmVmLl9faW5zZXJ0KHRoaXMuc3RhcnROb2RlID0gY3JlYXRlTWFya2VyKCkpO1xuICAgIHRoaXMuZW5kTm9kZSA9IHJlZi5lbmROb2RlO1xuICAgIHJlZi5lbmROb2RlID0gdGhpcy5zdGFydE5vZGU7XG4gIH1cblxuICBzZXRWYWx1ZSh2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIHRoaXMuX19wZW5kaW5nVmFsdWUgPSB2YWx1ZTtcbiAgfVxuXG4gIGNvbW1pdCgpIHtcbiAgICB3aGlsZSAoaXNEaXJlY3RpdmUodGhpcy5fX3BlbmRpbmdWYWx1ZSkpIHtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IHRoaXMuX19wZW5kaW5nVmFsdWU7XG4gICAgICB0aGlzLl9fcGVuZGluZ1ZhbHVlID0gbm9DaGFuZ2U7XG4gICAgICBkaXJlY3RpdmUodGhpcyk7XG4gICAgfVxuICAgIGNvbnN0IHZhbHVlID0gdGhpcy5fX3BlbmRpbmdWYWx1ZTtcbiAgICBpZiAodmFsdWUgPT09IG5vQ2hhbmdlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChpc1ByaW1pdGl2ZSh2YWx1ZSkpIHtcbiAgICAgIGlmICh2YWx1ZSAhPT0gdGhpcy52YWx1ZSkge1xuICAgICAgICB0aGlzLl9fY29tbWl0VGV4dCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFRlbXBsYXRlUmVzdWx0KSB7XG4gICAgICB0aGlzLl9fY29tbWl0VGVtcGxhdGVSZXN1bHQodmFsdWUpO1xuICAgIH0gZWxzZSBpZiAodmFsdWUgaW5zdGFuY2VvZiBOb2RlKSB7XG4gICAgICB0aGlzLl9fY29tbWl0Tm9kZSh2YWx1ZSk7XG4gICAgfSBlbHNlIGlmIChpc0l0ZXJhYmxlKHZhbHVlKSkge1xuICAgICAgdGhpcy5fX2NvbW1pdEl0ZXJhYmxlKHZhbHVlKTtcbiAgICB9IGVsc2UgaWYgKHZhbHVlID09PSBub3RoaW5nKSB7XG4gICAgICB0aGlzLnZhbHVlID0gbm90aGluZztcbiAgICAgIHRoaXMuY2xlYXIoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRmFsbGJhY2ssIHdpbGwgcmVuZGVyIHRoZSBzdHJpbmcgcmVwcmVzZW50YXRpb25cbiAgICAgIHRoaXMuX19jb21taXRUZXh0KHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9faW5zZXJ0KG5vZGU6IE5vZGUpIHtcbiAgICB0aGlzLmVuZE5vZGUucGFyZW50Tm9kZSEuaW5zZXJ0QmVmb3JlKG5vZGUsIHRoaXMuZW5kTm9kZSk7XG4gIH1cblxuICBwcml2YXRlIF9fY29tbWl0Tm9kZSh2YWx1ZTogTm9kZSk6IHZvaWQge1xuICAgIGlmICh0aGlzLnZhbHVlID09PSB2YWx1ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmNsZWFyKCk7XG4gICAgdGhpcy5fX2luc2VydCh2YWx1ZSk7XG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICB9XG5cbiAgcHJpdmF0ZSBfX2NvbW1pdFRleHQodmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICBjb25zdCBub2RlID0gdGhpcy5zdGFydE5vZGUubmV4dFNpYmxpbmchO1xuICAgIHZhbHVlID0gdmFsdWUgPT0gbnVsbCA/ICcnIDogdmFsdWU7XG4gICAgLy8gSWYgYHZhbHVlYCBpc24ndCBhbHJlYWR5IGEgc3RyaW5nLCB3ZSBleHBsaWNpdGx5IGNvbnZlcnQgaXQgaGVyZSBpbiBjYXNlXG4gICAgLy8gaXQgY2FuJ3QgYmUgaW1wbGljaXRseSBjb252ZXJ0ZWQgLSBpLmUuIGl0J3MgYSBzeW1ib2wuXG4gICAgY29uc3QgdmFsdWVBc1N0cmluZzogc3RyaW5nID1cbiAgICAgICAgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyA/IHZhbHVlIDogU3RyaW5nKHZhbHVlKTtcbiAgICBpZiAobm9kZSA9PT0gdGhpcy5lbmROb2RlLnByZXZpb3VzU2libGluZyAmJlxuICAgICAgICBub2RlLm5vZGVUeXBlID09PSAzIC8qIE5vZGUuVEVYVF9OT0RFICovKSB7XG4gICAgICAvLyBJZiB3ZSBvbmx5IGhhdmUgYSBzaW5nbGUgdGV4dCBub2RlIGJldHdlZW4gdGhlIG1hcmtlcnMsIHdlIGNhbiBqdXN0XG4gICAgICAvLyBzZXQgaXRzIHZhbHVlLCByYXRoZXIgdGhhbiByZXBsYWNpbmcgaXQuXG4gICAgICAvLyBUT0RPKGp1c3RpbmZhZ25hbmkpOiBDYW4gd2UganVzdCBjaGVjayBpZiB0aGlzLnZhbHVlIGlzIHByaW1pdGl2ZT9cbiAgICAgIChub2RlIGFzIFRleHQpLmRhdGEgPSB2YWx1ZUFzU3RyaW5nO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9fY29tbWl0Tm9kZShkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh2YWx1ZUFzU3RyaW5nKSk7XG4gICAgfVxuICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgfVxuXG4gIHByaXZhdGUgX19jb21taXRUZW1wbGF0ZVJlc3VsdCh2YWx1ZTogVGVtcGxhdGVSZXN1bHQpOiB2b2lkIHtcbiAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMub3B0aW9ucy50ZW1wbGF0ZUZhY3RvcnkodmFsdWUpO1xuICAgIGlmICh0aGlzLnZhbHVlIGluc3RhbmNlb2YgVGVtcGxhdGVJbnN0YW5jZSAmJlxuICAgICAgICB0aGlzLnZhbHVlLnRlbXBsYXRlID09PSB0ZW1wbGF0ZSkge1xuICAgICAgdGhpcy52YWx1ZS51cGRhdGUodmFsdWUudmFsdWVzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTWFrZSBzdXJlIHdlIHByb3BhZ2F0ZSB0aGUgdGVtcGxhdGUgcHJvY2Vzc29yIGZyb20gdGhlIFRlbXBsYXRlUmVzdWx0XG4gICAgICAvLyBzbyB0aGF0IHdlIHVzZSBpdHMgc3ludGF4IGV4dGVuc2lvbiwgZXRjLiBUaGUgdGVtcGxhdGUgZmFjdG9yeSBjb21lc1xuICAgICAgLy8gZnJvbSB0aGUgcmVuZGVyIGZ1bmN0aW9uIG9wdGlvbnMgc28gdGhhdCBpdCBjYW4gY29udHJvbCB0ZW1wbGF0ZVxuICAgICAgLy8gY2FjaGluZyBhbmQgcHJlcHJvY2Vzc2luZy5cbiAgICAgIGNvbnN0IGluc3RhbmNlID1cbiAgICAgICAgICBuZXcgVGVtcGxhdGVJbnN0YW5jZSh0ZW1wbGF0ZSwgdmFsdWUucHJvY2Vzc29yLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgY29uc3QgZnJhZ21lbnQgPSBpbnN0YW5jZS5fY2xvbmUoKTtcbiAgICAgIGluc3RhbmNlLnVwZGF0ZSh2YWx1ZS52YWx1ZXMpO1xuICAgICAgdGhpcy5fX2NvbW1pdE5vZGUoZnJhZ21lbnQpO1xuICAgICAgdGhpcy52YWx1ZSA9IGluc3RhbmNlO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX19jb21taXRJdGVyYWJsZSh2YWx1ZTogSXRlcmFibGU8dW5rbm93bj4pOiB2b2lkIHtcbiAgICAvLyBGb3IgYW4gSXRlcmFibGUsIHdlIGNyZWF0ZSBhIG5ldyBJbnN0YW5jZVBhcnQgcGVyIGl0ZW0sIHRoZW4gc2V0IGl0c1xuICAgIC8vIHZhbHVlIHRvIHRoZSBpdGVtLiBUaGlzIGlzIGEgbGl0dGxlIGJpdCBvZiBvdmVyaGVhZCBmb3IgZXZlcnkgaXRlbSBpblxuICAgIC8vIGFuIEl0ZXJhYmxlLCBidXQgaXQgbGV0cyB1cyByZWN1cnNlIGVhc2lseSBhbmQgZWZmaWNpZW50bHkgdXBkYXRlIEFycmF5c1xuICAgIC8vIG9mIFRlbXBsYXRlUmVzdWx0cyB0aGF0IHdpbGwgYmUgY29tbW9ubHkgcmV0dXJuZWQgZnJvbSBleHByZXNzaW9ucyBsaWtlOlxuICAgIC8vIGFycmF5Lm1hcCgoaSkgPT4gaHRtbGAke2l9YCksIGJ5IHJldXNpbmcgZXhpc3RpbmcgVGVtcGxhdGVJbnN0YW5jZXMuXG5cbiAgICAvLyBJZiBfdmFsdWUgaXMgYW4gYXJyYXksIHRoZW4gdGhlIHByZXZpb3VzIHJlbmRlciB3YXMgb2YgYW5cbiAgICAvLyBpdGVyYWJsZSBhbmQgX3ZhbHVlIHdpbGwgY29udGFpbiB0aGUgTm9kZVBhcnRzIGZyb20gdGhlIHByZXZpb3VzXG4gICAgLy8gcmVuZGVyLiBJZiBfdmFsdWUgaXMgbm90IGFuIGFycmF5LCBjbGVhciB0aGlzIHBhcnQgYW5kIG1ha2UgYSBuZXdcbiAgICAvLyBhcnJheSBmb3IgTm9kZVBhcnRzLlxuICAgIGlmICghQXJyYXkuaXNBcnJheSh0aGlzLnZhbHVlKSkge1xuICAgICAgdGhpcy52YWx1ZSA9IFtdO1xuICAgICAgdGhpcy5jbGVhcigpO1xuICAgIH1cblxuICAgIC8vIExldHMgdXMga2VlcCB0cmFjayBvZiBob3cgbWFueSBpdGVtcyB3ZSBzdGFtcGVkIHNvIHdlIGNhbiBjbGVhciBsZWZ0b3ZlclxuICAgIC8vIGl0ZW1zIGZyb20gYSBwcmV2aW91cyByZW5kZXJcbiAgICBjb25zdCBpdGVtUGFydHMgPSB0aGlzLnZhbHVlIGFzIE5vZGVQYXJ0W107XG4gICAgbGV0IHBhcnRJbmRleCA9IDA7XG4gICAgbGV0IGl0ZW1QYXJ0OiBOb2RlUGFydHx1bmRlZmluZWQ7XG5cbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdmFsdWUpIHtcbiAgICAgIC8vIFRyeSB0byByZXVzZSBhbiBleGlzdGluZyBwYXJ0XG4gICAgICBpdGVtUGFydCA9IGl0ZW1QYXJ0c1twYXJ0SW5kZXhdO1xuXG4gICAgICAvLyBJZiBubyBleGlzdGluZyBwYXJ0LCBjcmVhdGUgYSBuZXcgb25lXG4gICAgICBpZiAoaXRlbVBhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpdGVtUGFydCA9IG5ldyBOb2RlUGFydCh0aGlzLm9wdGlvbnMpO1xuICAgICAgICBpdGVtUGFydHMucHVzaChpdGVtUGFydCk7XG4gICAgICAgIGlmIChwYXJ0SW5kZXggPT09IDApIHtcbiAgICAgICAgICBpdGVtUGFydC5hcHBlbmRJbnRvUGFydCh0aGlzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVtUGFydC5pbnNlcnRBZnRlclBhcnQoaXRlbVBhcnRzW3BhcnRJbmRleCAtIDFdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaXRlbVBhcnQuc2V0VmFsdWUoaXRlbSk7XG4gICAgICBpdGVtUGFydC5jb21taXQoKTtcbiAgICAgIHBhcnRJbmRleCsrO1xuICAgIH1cblxuICAgIGlmIChwYXJ0SW5kZXggPCBpdGVtUGFydHMubGVuZ3RoKSB7XG4gICAgICAvLyBUcnVuY2F0ZSB0aGUgcGFydHMgYXJyYXkgc28gX3ZhbHVlIHJlZmxlY3RzIHRoZSBjdXJyZW50IHN0YXRlXG4gICAgICBpdGVtUGFydHMubGVuZ3RoID0gcGFydEluZGV4O1xuICAgICAgdGhpcy5jbGVhcihpdGVtUGFydCAmJiBpdGVtUGFydC5lbmROb2RlKTtcbiAgICB9XG4gIH1cblxuICBjbGVhcihzdGFydE5vZGU6IE5vZGUgPSB0aGlzLnN0YXJ0Tm9kZSkge1xuICAgIHJlbW92ZU5vZGVzKFxuICAgICAgICB0aGlzLnN0YXJ0Tm9kZS5wYXJlbnROb2RlISwgc3RhcnROb2RlLm5leHRTaWJsaW5nISwgdGhpcy5lbmROb2RlKTtcbiAgfVxufVxuXG4vKipcbiAqIEltcGxlbWVudHMgYSBib29sZWFuIGF0dHJpYnV0ZSwgcm91Z2hseSBhcyBkZWZpbmVkIGluIHRoZSBIVE1MXG4gKiBzcGVjaWZpY2F0aW9uLlxuICpcbiAqIElmIHRoZSB2YWx1ZSBpcyB0cnV0aHksIHRoZW4gdGhlIGF0dHJpYnV0ZSBpcyBwcmVzZW50IHdpdGggYSB2YWx1ZSBvZlxuICogJycuIElmIHRoZSB2YWx1ZSBpcyBmYWxzZXksIHRoZSBhdHRyaWJ1dGUgaXMgcmVtb3ZlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIEJvb2xlYW5BdHRyaWJ1dGVQYXJ0IGltcGxlbWVudHMgUGFydCB7XG4gIHJlYWRvbmx5IGVsZW1lbnQ6IEVsZW1lbnQ7XG4gIHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgc3RyaW5nczogUmVhZG9ubHlBcnJheTxzdHJpbmc+O1xuICB2YWx1ZTogdW5rbm93biA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfX3BlbmRpbmdWYWx1ZTogdW5rbm93biA9IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihlbGVtZW50OiBFbGVtZW50LCBuYW1lOiBzdHJpbmcsIHN0cmluZ3M6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPikge1xuICAgIGlmIChzdHJpbmdzLmxlbmd0aCAhPT0gMiB8fCBzdHJpbmdzWzBdICE9PSAnJyB8fCBzdHJpbmdzWzFdICE9PSAnJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdCb29sZWFuIGF0dHJpYnV0ZXMgY2FuIG9ubHkgY29udGFpbiBhIHNpbmdsZSBleHByZXNzaW9uJyk7XG4gICAgfVxuICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLnN0cmluZ3MgPSBzdHJpbmdzO1xuICB9XG5cbiAgc2V0VmFsdWUodmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICB0aGlzLl9fcGVuZGluZ1ZhbHVlID0gdmFsdWU7XG4gIH1cblxuICBjb21taXQoKSB7XG4gICAgd2hpbGUgKGlzRGlyZWN0aXZlKHRoaXMuX19wZW5kaW5nVmFsdWUpKSB7XG4gICAgICBjb25zdCBkaXJlY3RpdmUgPSB0aGlzLl9fcGVuZGluZ1ZhbHVlO1xuICAgICAgdGhpcy5fX3BlbmRpbmdWYWx1ZSA9IG5vQ2hhbmdlO1xuICAgICAgZGlyZWN0aXZlKHRoaXMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5fX3BlbmRpbmdWYWx1ZSA9PT0gbm9DaGFuZ2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdmFsdWUgPSAhIXRoaXMuX19wZW5kaW5nVmFsdWU7XG4gICAgaWYgKHRoaXMudmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZSh0aGlzLm5hbWUsICcnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUodGhpcy5uYW1lKTtcbiAgICAgIH1cbiAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICB9XG4gICAgdGhpcy5fX3BlbmRpbmdWYWx1ZSA9IG5vQ2hhbmdlO1xuICB9XG59XG5cbi8qKlxuICogU2V0cyBhdHRyaWJ1dGUgdmFsdWVzIGZvciBQcm9wZXJ0eVBhcnRzLCBzbyB0aGF0IHRoZSB2YWx1ZSBpcyBvbmx5IHNldCBvbmNlXG4gKiBldmVuIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBwYXJ0cyBmb3IgYSBwcm9wZXJ0eS5cbiAqXG4gKiBJZiBhbiBleHByZXNzaW9uIGNvbnRyb2xzIHRoZSB3aG9sZSBwcm9wZXJ0eSB2YWx1ZSwgdGhlbiB0aGUgdmFsdWUgaXMgc2ltcGx5XG4gKiBhc3NpZ25lZCB0byB0aGUgcHJvcGVydHkgdW5kZXIgY29udHJvbC4gSWYgdGhlcmUgYXJlIHN0cmluZyBsaXRlcmFscyBvclxuICogbXVsdGlwbGUgZXhwcmVzc2lvbnMsIHRoZW4gdGhlIHN0cmluZ3MgYXJlIGV4cHJlc3Npb25zIGFyZSBpbnRlcnBvbGF0ZWQgaW50b1xuICogYSBzdHJpbmcgZmlyc3QuXG4gKi9cbmV4cG9ydCBjbGFzcyBQcm9wZXJ0eUNvbW1pdHRlciBleHRlbmRzIEF0dHJpYnV0ZUNvbW1pdHRlciB7XG4gIHJlYWRvbmx5IHNpbmdsZTogYm9vbGVhbjtcblxuICBjb25zdHJ1Y3RvcihlbGVtZW50OiBFbGVtZW50LCBuYW1lOiBzdHJpbmcsIHN0cmluZ3M6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPikge1xuICAgIHN1cGVyKGVsZW1lbnQsIG5hbWUsIHN0cmluZ3MpO1xuICAgIHRoaXMuc2luZ2xlID1cbiAgICAgICAgKHN0cmluZ3MubGVuZ3RoID09PSAyICYmIHN0cmluZ3NbMF0gPT09ICcnICYmIHN0cmluZ3NbMV0gPT09ICcnKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBfY3JlYXRlUGFydCgpOiBQcm9wZXJ0eVBhcnQge1xuICAgIHJldHVybiBuZXcgUHJvcGVydHlQYXJ0KHRoaXMpO1xuICB9XG5cbiAgcHJvdGVjdGVkIF9nZXRWYWx1ZSgpIHtcbiAgICBpZiAodGhpcy5zaW5nbGUpIHtcbiAgICAgIHJldHVybiB0aGlzLnBhcnRzWzBdLnZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gc3VwZXIuX2dldFZhbHVlKCk7XG4gIH1cblxuICBjb21taXQoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZGlydHkpIHtcbiAgICAgIHRoaXMuZGlydHkgPSBmYWxzZTtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgICh0aGlzLmVsZW1lbnQgYXMgYW55KVt0aGlzLm5hbWVdID0gdGhpcy5fZ2V0VmFsdWUoKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFByb3BlcnR5UGFydCBleHRlbmRzIEF0dHJpYnV0ZVBhcnQge31cblxuLy8gRGV0ZWN0IGV2ZW50IGxpc3RlbmVyIG9wdGlvbnMgc3VwcG9ydC4gSWYgdGhlIGBjYXB0dXJlYCBwcm9wZXJ0eSBpcyByZWFkXG4vLyBmcm9tIHRoZSBvcHRpb25zIG9iamVjdCwgdGhlbiBvcHRpb25zIGFyZSBzdXBwb3J0ZWQuIElmIG5vdCwgdGhlbiB0aGUgdGhyaWRcbi8vIGFyZ3VtZW50IHRvIGFkZC9yZW1vdmVFdmVudExpc3RlbmVyIGlzIGludGVycHJldGVkIGFzIHRoZSBib29sZWFuIGNhcHR1cmVcbi8vIHZhbHVlIHNvIHdlIHNob3VsZCBvbmx5IHBhc3MgdGhlIGBjYXB0dXJlYCBwcm9wZXJ0eS5cbmxldCBldmVudE9wdGlvbnNTdXBwb3J0ZWQgPSBmYWxzZTtcblxudHJ5IHtcbiAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICBnZXQgY2FwdHVyZSgpIHtcbiAgICAgIGV2ZW50T3B0aW9uc1N1cHBvcnRlZCA9IHRydWU7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0ZXN0Jywgb3B0aW9ucyBhcyBhbnksIG9wdGlvbnMpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCd0ZXN0Jywgb3B0aW9ucyBhcyBhbnksIG9wdGlvbnMpO1xufSBjYXRjaCAoX2UpIHtcbn1cblxuXG50eXBlIEV2ZW50SGFuZGxlcldpdGhPcHRpb25zID1cbiAgICBFdmVudExpc3RlbmVyT3JFdmVudExpc3RlbmVyT2JqZWN0JlBhcnRpYWw8QWRkRXZlbnRMaXN0ZW5lck9wdGlvbnM+O1xuZXhwb3J0IGNsYXNzIEV2ZW50UGFydCBpbXBsZW1lbnRzIFBhcnQge1xuICByZWFkb25seSBlbGVtZW50OiBFbGVtZW50O1xuICByZWFkb25seSBldmVudE5hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgZXZlbnRDb250ZXh0PzogRXZlbnRUYXJnZXQ7XG4gIHZhbHVlOiB1bmRlZmluZWR8RXZlbnRIYW5kbGVyV2l0aE9wdGlvbnMgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX19vcHRpb25zPzogQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnM7XG4gIHByaXZhdGUgX19wZW5kaW5nVmFsdWU6IHVuZGVmaW5lZHxFdmVudEhhbmRsZXJXaXRoT3B0aW9ucyA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSByZWFkb25seSBfX2JvdW5kSGFuZGxlRXZlbnQ6IChldmVudDogRXZlbnQpID0+IHZvaWQ7XG5cbiAgY29uc3RydWN0b3IoZWxlbWVudDogRWxlbWVudCwgZXZlbnROYW1lOiBzdHJpbmcsIGV2ZW50Q29udGV4dD86IEV2ZW50VGFyZ2V0KSB7XG4gICAgdGhpcy5lbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLmV2ZW50TmFtZSA9IGV2ZW50TmFtZTtcbiAgICB0aGlzLmV2ZW50Q29udGV4dCA9IGV2ZW50Q29udGV4dDtcbiAgICB0aGlzLl9fYm91bmRIYW5kbGVFdmVudCA9IChlKSA9PiB0aGlzLmhhbmRsZUV2ZW50KGUpO1xuICB9XG5cbiAgc2V0VmFsdWUodmFsdWU6IHVuZGVmaW5lZHxFdmVudEhhbmRsZXJXaXRoT3B0aW9ucyk6IHZvaWQge1xuICAgIHRoaXMuX19wZW5kaW5nVmFsdWUgPSB2YWx1ZTtcbiAgfVxuXG4gIGNvbW1pdCgpIHtcbiAgICB3aGlsZSAoaXNEaXJlY3RpdmUodGhpcy5fX3BlbmRpbmdWYWx1ZSkpIHtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IHRoaXMuX19wZW5kaW5nVmFsdWU7XG4gICAgICB0aGlzLl9fcGVuZGluZ1ZhbHVlID0gbm9DaGFuZ2UgYXMgRXZlbnRIYW5kbGVyV2l0aE9wdGlvbnM7XG4gICAgICBkaXJlY3RpdmUodGhpcyk7XG4gICAgfVxuICAgIGlmICh0aGlzLl9fcGVuZGluZ1ZhbHVlID09PSBub0NoYW5nZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IG5ld0xpc3RlbmVyID0gdGhpcy5fX3BlbmRpbmdWYWx1ZTtcbiAgICBjb25zdCBvbGRMaXN0ZW5lciA9IHRoaXMudmFsdWU7XG4gICAgY29uc3Qgc2hvdWxkUmVtb3ZlTGlzdGVuZXIgPSBuZXdMaXN0ZW5lciA9PSBudWxsIHx8XG4gICAgICAgIG9sZExpc3RlbmVyICE9IG51bGwgJiZcbiAgICAgICAgICAgIChuZXdMaXN0ZW5lci5jYXB0dXJlICE9PSBvbGRMaXN0ZW5lci5jYXB0dXJlIHx8XG4gICAgICAgICAgICAgbmV3TGlzdGVuZXIub25jZSAhPT0gb2xkTGlzdGVuZXIub25jZSB8fFxuICAgICAgICAgICAgIG5ld0xpc3RlbmVyLnBhc3NpdmUgIT09IG9sZExpc3RlbmVyLnBhc3NpdmUpO1xuICAgIGNvbnN0IHNob3VsZEFkZExpc3RlbmVyID1cbiAgICAgICAgbmV3TGlzdGVuZXIgIT0gbnVsbCAmJiAob2xkTGlzdGVuZXIgPT0gbnVsbCB8fCBzaG91bGRSZW1vdmVMaXN0ZW5lcik7XG5cbiAgICBpZiAoc2hvdWxkUmVtb3ZlTGlzdGVuZXIpIHtcbiAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFxuICAgICAgICAgIHRoaXMuZXZlbnROYW1lLCB0aGlzLl9fYm91bmRIYW5kbGVFdmVudCwgdGhpcy5fX29wdGlvbnMpO1xuICAgIH1cbiAgICBpZiAoc2hvdWxkQWRkTGlzdGVuZXIpIHtcbiAgICAgIHRoaXMuX19vcHRpb25zID0gZ2V0T3B0aW9ucyhuZXdMaXN0ZW5lcik7XG4gICAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgICAgICB0aGlzLmV2ZW50TmFtZSwgdGhpcy5fX2JvdW5kSGFuZGxlRXZlbnQsIHRoaXMuX19vcHRpb25zKTtcbiAgICB9XG4gICAgdGhpcy52YWx1ZSA9IG5ld0xpc3RlbmVyO1xuICAgIHRoaXMuX19wZW5kaW5nVmFsdWUgPSBub0NoYW5nZSBhcyBFdmVudEhhbmRsZXJXaXRoT3B0aW9ucztcbiAgfVxuXG4gIGhhbmRsZUV2ZW50KGV2ZW50OiBFdmVudCkge1xuICAgIGlmICh0eXBlb2YgdGhpcy52YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy52YWx1ZS5jYWxsKHRoaXMuZXZlbnRDb250ZXh0IHx8IHRoaXMuZWxlbWVudCwgZXZlbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAodGhpcy52YWx1ZSBhcyBFdmVudExpc3RlbmVyT2JqZWN0KS5oYW5kbGVFdmVudChldmVudCk7XG4gICAgfVxuICB9XG59XG5cbi8vIFdlIGNvcHkgb3B0aW9ucyBiZWNhdXNlIG9mIHRoZSBpbmNvbnNpc3RlbnQgYmVoYXZpb3Igb2YgYnJvd3NlcnMgd2hlbiByZWFkaW5nXG4vLyB0aGUgdGhpcmQgYXJndW1lbnQgb2YgYWRkL3JlbW92ZUV2ZW50TGlzdGVuZXIuIElFMTEgZG9lc24ndCBzdXBwb3J0IG9wdGlvbnNcbi8vIGF0IGFsbC4gQ2hyb21lIDQxIG9ubHkgcmVhZHMgYGNhcHR1cmVgIGlmIHRoZSBhcmd1bWVudCBpcyBhbiBvYmplY3QuXG5jb25zdCBnZXRPcHRpb25zID0gKG86IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zfHVuZGVmaW5lZCkgPT4gbyAmJlxuICAgIChldmVudE9wdGlvbnNTdXBwb3J0ZWQgP1xuICAgICAgICAge2NhcHR1cmU6IG8uY2FwdHVyZSwgcGFzc2l2ZTogby5wYXNzaXZlLCBvbmNlOiBvLm9uY2V9IDpcbiAgICAgICAgIG8uY2FwdHVyZSBhcyBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyk7XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG5cbi8qKlxuICogQG1vZHVsZSBsaXQtaHRtbFxuICovXG5cbmltcG9ydCB7UGFydH0gZnJvbSAnLi9wYXJ0LmpzJztcbmltcG9ydCB7QXR0cmlidXRlQ29tbWl0dGVyLCBCb29sZWFuQXR0cmlidXRlUGFydCwgRXZlbnRQYXJ0LCBOb2RlUGFydCwgUHJvcGVydHlDb21taXR0ZXJ9IGZyb20gJy4vcGFydHMuanMnO1xuaW1wb3J0IHtSZW5kZXJPcHRpb25zfSBmcm9tICcuL3JlbmRlci1vcHRpb25zLmpzJztcbmltcG9ydCB7VGVtcGxhdGVQcm9jZXNzb3J9IGZyb20gJy4vdGVtcGxhdGUtcHJvY2Vzc29yLmpzJztcblxuLyoqXG4gKiBDcmVhdGVzIFBhcnRzIHdoZW4gYSB0ZW1wbGF0ZSBpcyBpbnN0YW50aWF0ZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBEZWZhdWx0VGVtcGxhdGVQcm9jZXNzb3IgaW1wbGVtZW50cyBUZW1wbGF0ZVByb2Nlc3NvciB7XG4gIC8qKlxuICAgKiBDcmVhdGUgcGFydHMgZm9yIGFuIGF0dHJpYnV0ZS1wb3NpdGlvbiBiaW5kaW5nLCBnaXZlbiB0aGUgZXZlbnQsIGF0dHJpYnV0ZVxuICAgKiBuYW1lLCBhbmQgc3RyaW5nIGxpdGVyYWxzLlxuICAgKlxuICAgKiBAcGFyYW0gZWxlbWVudCBUaGUgZWxlbWVudCBjb250YWluaW5nIHRoZSBiaW5kaW5nXG4gICAqIEBwYXJhbSBuYW1lICBUaGUgYXR0cmlidXRlIG5hbWVcbiAgICogQHBhcmFtIHN0cmluZ3MgVGhlIHN0cmluZyBsaXRlcmFscy4gVGhlcmUgYXJlIGFsd2F5cyBhdCBsZWFzdCB0d28gc3RyaW5ncyxcbiAgICogICBldmVudCBmb3IgZnVsbHktY29udHJvbGxlZCBiaW5kaW5ncyB3aXRoIGEgc2luZ2xlIGV4cHJlc3Npb24uXG4gICAqL1xuICBoYW5kbGVBdHRyaWJ1dGVFeHByZXNzaW9ucyhcbiAgICAgIGVsZW1lbnQ6IEVsZW1lbnQsIG5hbWU6IHN0cmluZywgc3RyaW5nczogc3RyaW5nW10sXG4gICAgICBvcHRpb25zOiBSZW5kZXJPcHRpb25zKTogUmVhZG9ubHlBcnJheTxQYXJ0PiB7XG4gICAgY29uc3QgcHJlZml4ID0gbmFtZVswXTtcbiAgICBpZiAocHJlZml4ID09PSAnLicpIHtcbiAgICAgIGNvbnN0IGNvbW1pdHRlciA9IG5ldyBQcm9wZXJ0eUNvbW1pdHRlcihlbGVtZW50LCBuYW1lLnNsaWNlKDEpLCBzdHJpbmdzKTtcbiAgICAgIHJldHVybiBjb21taXR0ZXIucGFydHM7XG4gICAgfVxuICAgIGlmIChwcmVmaXggPT09ICdAJykge1xuICAgICAgcmV0dXJuIFtuZXcgRXZlbnRQYXJ0KGVsZW1lbnQsIG5hbWUuc2xpY2UoMSksIG9wdGlvbnMuZXZlbnRDb250ZXh0KV07XG4gICAgfVxuICAgIGlmIChwcmVmaXggPT09ICc/Jykge1xuICAgICAgcmV0dXJuIFtuZXcgQm9vbGVhbkF0dHJpYnV0ZVBhcnQoZWxlbWVudCwgbmFtZS5zbGljZSgxKSwgc3RyaW5ncyldO1xuICAgIH1cbiAgICBjb25zdCBjb21taXR0ZXIgPSBuZXcgQXR0cmlidXRlQ29tbWl0dGVyKGVsZW1lbnQsIG5hbWUsIHN0cmluZ3MpO1xuICAgIHJldHVybiBjb21taXR0ZXIucGFydHM7XG4gIH1cbiAgLyoqXG4gICAqIENyZWF0ZSBwYXJ0cyBmb3IgYSB0ZXh0LXBvc2l0aW9uIGJpbmRpbmcuXG4gICAqIEBwYXJhbSB0ZW1wbGF0ZUZhY3RvcnlcbiAgICovXG4gIGhhbmRsZVRleHRFeHByZXNzaW9uKG9wdGlvbnM6IFJlbmRlck9wdGlvbnMpIHtcbiAgICByZXR1cm4gbmV3IE5vZGVQYXJ0KG9wdGlvbnMpO1xuICB9XG59XG5cbmV4cG9ydCBjb25zdCBkZWZhdWx0VGVtcGxhdGVQcm9jZXNzb3IgPSBuZXcgRGVmYXVsdFRlbXBsYXRlUHJvY2Vzc29yKCk7XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG5cbi8qKlxuICogQG1vZHVsZSBsaXQtaHRtbFxuICovXG5cbmltcG9ydCB7VGVtcGxhdGVSZXN1bHR9IGZyb20gJy4vdGVtcGxhdGUtcmVzdWx0LmpzJztcbmltcG9ydCB7bWFya2VyLCBUZW1wbGF0ZX0gZnJvbSAnLi90ZW1wbGF0ZS5qcyc7XG5cbi8qKlxuICogQSBmdW5jdGlvbiB0eXBlIHRoYXQgY3JlYXRlcyBhIFRlbXBsYXRlIGZyb20gYSBUZW1wbGF0ZVJlc3VsdC5cbiAqXG4gKiBUaGlzIGlzIGEgaG9vayBpbnRvIHRoZSB0ZW1wbGF0ZS1jcmVhdGlvbiBwcm9jZXNzIGZvciByZW5kZXJpbmcgdGhhdFxuICogcmVxdWlyZXMgc29tZSBtb2RpZmljYXRpb24gb2YgdGVtcGxhdGVzIGJlZm9yZSB0aGV5J3JlIHVzZWQsIGxpa2UgU2hhZHlDU1MsXG4gKiB3aGljaCBtdXN0IGFkZCBjbGFzc2VzIHRvIGVsZW1lbnRzIGFuZCByZW1vdmUgc3R5bGVzLlxuICpcbiAqIFRlbXBsYXRlcyBzaG91bGQgYmUgY2FjaGVkIGFzIGFnZ3Jlc3NpdmVseSBhcyBwb3NzaWJsZSwgc28gdGhhdCBtYW55XG4gKiBUZW1wbGF0ZVJlc3VsdHMgcHJvZHVjZWQgZnJvbSB0aGUgc2FtZSBleHByZXNzaW9uIG9ubHkgZG8gdGhlIHdvcmsgb2ZcbiAqIGNyZWF0aW5nIHRoZSBUZW1wbGF0ZSB0aGUgZmlyc3QgdGltZS5cbiAqXG4gKiBUZW1wbGF0ZXMgYXJlIHVzdWFsbHkgY2FjaGVkIGJ5IFRlbXBsYXRlUmVzdWx0LnN0cmluZ3MgYW5kXG4gKiBUZW1wbGF0ZVJlc3VsdC50eXBlLCBidXQgbWF5IGJlIGNhY2hlZCBieSBvdGhlciBrZXlzIGlmIHRoaXMgZnVuY3Rpb25cbiAqIG1vZGlmaWVzIHRoZSB0ZW1wbGF0ZS5cbiAqXG4gKiBOb3RlIHRoYXQgY3VycmVudGx5IFRlbXBsYXRlRmFjdG9yaWVzIG11c3Qgbm90IGFkZCwgcmVtb3ZlLCBvciByZW9yZGVyXG4gKiBleHByZXNzaW9ucywgYmVjYXVzZSB0aGVyZSBpcyBubyB3YXkgdG8gZGVzY3JpYmUgc3VjaCBhIG1vZGlmaWNhdGlvblxuICogdG8gcmVuZGVyKCkgc28gdGhhdCB2YWx1ZXMgYXJlIGludGVycG9sYXRlZCB0byB0aGUgY29ycmVjdCBwbGFjZSBpbiB0aGVcbiAqIHRlbXBsYXRlIGluc3RhbmNlcy5cbiAqL1xuZXhwb3J0IHR5cGUgVGVtcGxhdGVGYWN0b3J5ID0gKHJlc3VsdDogVGVtcGxhdGVSZXN1bHQpID0+IFRlbXBsYXRlO1xuXG4vKipcbiAqIFRoZSBkZWZhdWx0IFRlbXBsYXRlRmFjdG9yeSB3aGljaCBjYWNoZXMgVGVtcGxhdGVzIGtleWVkIG9uXG4gKiByZXN1bHQudHlwZSBhbmQgcmVzdWx0LnN0cmluZ3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZW1wbGF0ZUZhY3RvcnkocmVzdWx0OiBUZW1wbGF0ZVJlc3VsdCkge1xuICBsZXQgdGVtcGxhdGVDYWNoZSA9IHRlbXBsYXRlQ2FjaGVzLmdldChyZXN1bHQudHlwZSk7XG4gIGlmICh0ZW1wbGF0ZUNhY2hlID09PSB1bmRlZmluZWQpIHtcbiAgICB0ZW1wbGF0ZUNhY2hlID0ge1xuICAgICAgc3RyaW5nc0FycmF5OiBuZXcgV2Vha01hcDxUZW1wbGF0ZVN0cmluZ3NBcnJheSwgVGVtcGxhdGU+KCksXG4gICAgICBrZXlTdHJpbmc6IG5ldyBNYXA8c3RyaW5nLCBUZW1wbGF0ZT4oKVxuICAgIH07XG4gICAgdGVtcGxhdGVDYWNoZXMuc2V0KHJlc3VsdC50eXBlLCB0ZW1wbGF0ZUNhY2hlKTtcbiAgfVxuXG4gIGxldCB0ZW1wbGF0ZSA9IHRlbXBsYXRlQ2FjaGUuc3RyaW5nc0FycmF5LmdldChyZXN1bHQuc3RyaW5ncyk7XG4gIGlmICh0ZW1wbGF0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHRlbXBsYXRlO1xuICB9XG5cbiAgLy8gSWYgdGhlIFRlbXBsYXRlU3RyaW5nc0FycmF5IGlzIG5ldywgZ2VuZXJhdGUgYSBrZXkgZnJvbSB0aGUgc3RyaW5nc1xuICAvLyBUaGlzIGtleSBpcyBzaGFyZWQgYmV0d2VlbiBhbGwgdGVtcGxhdGVzIHdpdGggaWRlbnRpY2FsIGNvbnRlbnRcbiAgY29uc3Qga2V5ID0gcmVzdWx0LnN0cmluZ3Muam9pbihtYXJrZXIpO1xuXG4gIC8vIENoZWNrIGlmIHdlIGFscmVhZHkgaGF2ZSBhIFRlbXBsYXRlIGZvciB0aGlzIGtleVxuICB0ZW1wbGF0ZSA9IHRlbXBsYXRlQ2FjaGUua2V5U3RyaW5nLmdldChrZXkpO1xuICBpZiAodGVtcGxhdGUgPT09IHVuZGVmaW5lZCkge1xuICAgIC8vIElmIHdlIGhhdmUgbm90IHNlZW4gdGhpcyBrZXkgYmVmb3JlLCBjcmVhdGUgYSBuZXcgVGVtcGxhdGVcbiAgICB0ZW1wbGF0ZSA9IG5ldyBUZW1wbGF0ZShyZXN1bHQsIHJlc3VsdC5nZXRUZW1wbGF0ZUVsZW1lbnQoKSk7XG4gICAgLy8gQ2FjaGUgdGhlIFRlbXBsYXRlIGZvciB0aGlzIGtleVxuICAgIHRlbXBsYXRlQ2FjaGUua2V5U3RyaW5nLnNldChrZXksIHRlbXBsYXRlKTtcbiAgfVxuXG4gIC8vIENhY2hlIGFsbCBmdXR1cmUgcXVlcmllcyBmb3IgdGhpcyBUZW1wbGF0ZVN0cmluZ3NBcnJheVxuICB0ZW1wbGF0ZUNhY2hlLnN0cmluZ3NBcnJheS5zZXQocmVzdWx0LnN0cmluZ3MsIHRlbXBsYXRlKTtcbiAgcmV0dXJuIHRlbXBsYXRlO1xufVxuXG4vKipcbiAqIFRoZSBmaXJzdCBhcmd1bWVudCB0byBKUyB0ZW1wbGF0ZSB0YWdzIHJldGFpbiBpZGVudGl0eSBhY3Jvc3MgbXVsdGlwbGVcbiAqIGNhbGxzIHRvIGEgdGFnIGZvciB0aGUgc2FtZSBsaXRlcmFsLCBzbyB3ZSBjYW4gY2FjaGUgd29yayBkb25lIHBlciBsaXRlcmFsXG4gKiBpbiBhIE1hcC5cbiAqXG4gKiBTYWZhcmkgY3VycmVudGx5IGhhcyBhIGJ1ZyB3aGljaCBvY2Nhc2lvbmFsbHkgYnJlYWtzIHRoaXMgYmVoYXZpb3VyLCBzbyB3ZVxuICogbmVlZCB0byBjYWNoZSB0aGUgVGVtcGxhdGUgYXQgdHdvIGxldmVscy4gV2UgZmlyc3QgY2FjaGUgdGhlXG4gKiBUZW1wbGF0ZVN0cmluZ3NBcnJheSwgYW5kIGlmIHRoYXQgZmFpbHMsIHdlIGNhY2hlIGEga2V5IGNvbnN0cnVjdGVkIGJ5XG4gKiBqb2luaW5nIHRoZSBzdHJpbmdzIGFycmF5LlxuICovXG5leHBvcnQgdHlwZSB0ZW1wbGF0ZUNhY2hlID0ge1xuICByZWFkb25seSBzdHJpbmdzQXJyYXk6IFdlYWtNYXA8VGVtcGxhdGVTdHJpbmdzQXJyYXksIFRlbXBsYXRlPjsgLy9cbiAgcmVhZG9ubHkga2V5U3RyaW5nOiBNYXA8c3RyaW5nLCBUZW1wbGF0ZT47XG59O1xuXG5leHBvcnQgY29uc3QgdGVtcGxhdGVDYWNoZXMgPSBuZXcgTWFwPHN0cmluZywgdGVtcGxhdGVDYWNoZT4oKTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cblxuLyoqXG4gKiBAbW9kdWxlIGxpdC1odG1sXG4gKi9cblxuaW1wb3J0IHtyZW1vdmVOb2Rlc30gZnJvbSAnLi9kb20uanMnO1xuaW1wb3J0IHtOb2RlUGFydH0gZnJvbSAnLi9wYXJ0cy5qcyc7XG5pbXBvcnQge1JlbmRlck9wdGlvbnN9IGZyb20gJy4vcmVuZGVyLW9wdGlvbnMuanMnO1xuaW1wb3J0IHt0ZW1wbGF0ZUZhY3Rvcnl9IGZyb20gJy4vdGVtcGxhdGUtZmFjdG9yeS5qcyc7XG5cbmV4cG9ydCBjb25zdCBwYXJ0cyA9IG5ldyBXZWFrTWFwPE5vZGUsIE5vZGVQYXJ0PigpO1xuXG4vKipcbiAqIFJlbmRlcnMgYSB0ZW1wbGF0ZSByZXN1bHQgb3Igb3RoZXIgdmFsdWUgdG8gYSBjb250YWluZXIuXG4gKlxuICogVG8gdXBkYXRlIGEgY29udGFpbmVyIHdpdGggbmV3IHZhbHVlcywgcmVldmFsdWF0ZSB0aGUgdGVtcGxhdGUgbGl0ZXJhbCBhbmRcbiAqIGNhbGwgYHJlbmRlcmAgd2l0aCB0aGUgbmV3IHJlc3VsdC5cbiAqXG4gKiBAcGFyYW0gcmVzdWx0IEFueSB2YWx1ZSByZW5kZXJhYmxlIGJ5IE5vZGVQYXJ0IC0gdHlwaWNhbGx5IGEgVGVtcGxhdGVSZXN1bHRcbiAqICAgICBjcmVhdGVkIGJ5IGV2YWx1YXRpbmcgYSB0ZW1wbGF0ZSB0YWcgbGlrZSBgaHRtbGAgb3IgYHN2Z2AuXG4gKiBAcGFyYW0gY29udGFpbmVyIEEgRE9NIHBhcmVudCB0byByZW5kZXIgdG8uIFRoZSBlbnRpcmUgY29udGVudHMgYXJlIGVpdGhlclxuICogICAgIHJlcGxhY2VkLCBvciBlZmZpY2llbnRseSB1cGRhdGVkIGlmIHRoZSBzYW1lIHJlc3VsdCB0eXBlIHdhcyBwcmV2aW91c1xuICogICAgIHJlbmRlcmVkIHRoZXJlLlxuICogQHBhcmFtIG9wdGlvbnMgUmVuZGVyT3B0aW9ucyBmb3IgdGhlIGVudGlyZSByZW5kZXIgdHJlZSByZW5kZXJlZCB0byB0aGlzXG4gKiAgICAgY29udGFpbmVyLiBSZW5kZXIgb3B0aW9ucyBtdXN0ICpub3QqIGNoYW5nZSBiZXR3ZWVuIHJlbmRlcnMgdG8gdGhlIHNhbWVcbiAqICAgICBjb250YWluZXIsIGFzIHRob3NlIGNoYW5nZXMgd2lsbCBub3QgZWZmZWN0IHByZXZpb3VzbHkgcmVuZGVyZWQgRE9NLlxuICovXG5leHBvcnQgY29uc3QgcmVuZGVyID1cbiAgICAocmVzdWx0OiB1bmtub3duLFxuICAgICBjb250YWluZXI6IEVsZW1lbnR8RG9jdW1lbnRGcmFnbWVudCxcbiAgICAgb3B0aW9ucz86IFBhcnRpYWw8UmVuZGVyT3B0aW9ucz4pID0+IHtcbiAgICAgIGxldCBwYXJ0ID0gcGFydHMuZ2V0KGNvbnRhaW5lcik7XG4gICAgICBpZiAocGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlbW92ZU5vZGVzKGNvbnRhaW5lciwgY29udGFpbmVyLmZpcnN0Q2hpbGQpO1xuICAgICAgICBwYXJ0cy5zZXQoY29udGFpbmVyLCBwYXJ0ID0gbmV3IE5vZGVQYXJ0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZUZhY3RvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICBwYXJ0LmFwcGVuZEludG8oY29udGFpbmVyKTtcbiAgICAgIH1cbiAgICAgIHBhcnQuc2V0VmFsdWUocmVzdWx0KTtcbiAgICAgIHBhcnQuY29tbWl0KCk7XG4gICAgfTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cblxuLyoqXG4gKlxuICogTWFpbiBsaXQtaHRtbCBtb2R1bGUuXG4gKlxuICogTWFpbiBleHBvcnRzOlxuICpcbiAqIC0gIFtbaHRtbF1dXG4gKiAtICBbW3N2Z11dXG4gKiAtICBbW3JlbmRlcl1dXG4gKlxuICogQG1vZHVsZSBsaXQtaHRtbFxuICogQHByZWZlcnJlZFxuICovXG5cbi8qKlxuICogRG8gbm90IHJlbW92ZSB0aGlzIGNvbW1lbnQ7IGl0IGtlZXBzIHR5cGVkb2MgZnJvbSBtaXNwbGFjaW5nIHRoZSBtb2R1bGVcbiAqIGRvY3MuXG4gKi9cbmltcG9ydCB7ZGVmYXVsdFRlbXBsYXRlUHJvY2Vzc29yfSBmcm9tICcuL2xpYi9kZWZhdWx0LXRlbXBsYXRlLXByb2Nlc3Nvci5qcyc7XG5pbXBvcnQge1NWR1RlbXBsYXRlUmVzdWx0LCBUZW1wbGF0ZVJlc3VsdH0gZnJvbSAnLi9saWIvdGVtcGxhdGUtcmVzdWx0LmpzJztcblxuZXhwb3J0IHtEZWZhdWx0VGVtcGxhdGVQcm9jZXNzb3IsIGRlZmF1bHRUZW1wbGF0ZVByb2Nlc3Nvcn0gZnJvbSAnLi9saWIvZGVmYXVsdC10ZW1wbGF0ZS1wcm9jZXNzb3IuanMnO1xuZXhwb3J0IHtkaXJlY3RpdmUsIERpcmVjdGl2ZUZuLCBpc0RpcmVjdGl2ZX0gZnJvbSAnLi9saWIvZGlyZWN0aXZlLmpzJztcbi8vIFRPRE8oanVzdGluZmFnbmFuaSk6IHJlbW92ZSBsaW5lIHdoZW4gd2UgZ2V0IE5vZGVQYXJ0IG1vdmluZyBtZXRob2RzXG5leHBvcnQge3JlbW92ZU5vZGVzLCByZXBhcmVudE5vZGVzfSBmcm9tICcuL2xpYi9kb20uanMnO1xuZXhwb3J0IHtub0NoYW5nZSwgbm90aGluZywgUGFydH0gZnJvbSAnLi9saWIvcGFydC5qcyc7XG5leHBvcnQge0F0dHJpYnV0ZUNvbW1pdHRlciwgQXR0cmlidXRlUGFydCwgQm9vbGVhbkF0dHJpYnV0ZVBhcnQsIEV2ZW50UGFydCwgaXNJdGVyYWJsZSwgaXNQcmltaXRpdmUsIE5vZGVQYXJ0LCBQcm9wZXJ0eUNvbW1pdHRlciwgUHJvcGVydHlQYXJ0fSBmcm9tICcuL2xpYi9wYXJ0cy5qcyc7XG5leHBvcnQge1JlbmRlck9wdGlvbnN9IGZyb20gJy4vbGliL3JlbmRlci1vcHRpb25zLmpzJztcbmV4cG9ydCB7cGFydHMsIHJlbmRlcn0gZnJvbSAnLi9saWIvcmVuZGVyLmpzJztcbmV4cG9ydCB7dGVtcGxhdGVDYWNoZXMsIHRlbXBsYXRlRmFjdG9yeX0gZnJvbSAnLi9saWIvdGVtcGxhdGUtZmFjdG9yeS5qcyc7XG5leHBvcnQge1RlbXBsYXRlSW5zdGFuY2V9IGZyb20gJy4vbGliL3RlbXBsYXRlLWluc3RhbmNlLmpzJztcbmV4cG9ydCB7VGVtcGxhdGVQcm9jZXNzb3J9IGZyb20gJy4vbGliL3RlbXBsYXRlLXByb2Nlc3Nvci5qcyc7XG5leHBvcnQge1NWR1RlbXBsYXRlUmVzdWx0LCBUZW1wbGF0ZVJlc3VsdH0gZnJvbSAnLi9saWIvdGVtcGxhdGUtcmVzdWx0LmpzJztcbmV4cG9ydCB7Y3JlYXRlTWFya2VyLCBpc1RlbXBsYXRlUGFydEFjdGl2ZSwgVGVtcGxhdGV9IGZyb20gJy4vbGliL3RlbXBsYXRlLmpzJztcblxuZGVjbGFyZSBnbG9iYWwge1xuICBpbnRlcmZhY2UgV2luZG93IHtcbiAgICBsaXRIdG1sVmVyc2lvbnM6IHN0cmluZ1tdO1xuICB9XG59XG5cbi8vIElNUE9SVEFOVDogZG8gbm90IGNoYW5nZSB0aGUgcHJvcGVydHkgbmFtZSBvciB0aGUgYXNzaWdubWVudCBleHByZXNzaW9uLlxuLy8gVGhpcyBsaW5lIHdpbGwgYmUgdXNlZCBpbiByZWdleGVzIHRvIHNlYXJjaCBmb3IgbGl0LWh0bWwgdXNhZ2UuXG4vLyBUT0RPKGp1c3RpbmZhZ25hbmkpOiBpbmplY3QgdmVyc2lvbiBudW1iZXIgYXQgYnVpbGQgdGltZVxuKHdpbmRvd1snbGl0SHRtbFZlcnNpb25zJ10gfHwgKHdpbmRvd1snbGl0SHRtbFZlcnNpb25zJ10gPSBbXSkpLnB1c2goJzEuMS4yJyk7XG5cbi8qKlxuICogSW50ZXJwcmV0cyBhIHRlbXBsYXRlIGxpdGVyYWwgYXMgYW4gSFRNTCB0ZW1wbGF0ZSB0aGF0IGNhbiBlZmZpY2llbnRseVxuICogcmVuZGVyIHRvIGFuZCB1cGRhdGUgYSBjb250YWluZXIuXG4gKi9cbmV4cG9ydCBjb25zdCBodG1sID0gKHN0cmluZ3M6IFRlbXBsYXRlU3RyaW5nc0FycmF5LCAuLi52YWx1ZXM6IHVua25vd25bXSkgPT5cbiAgICBuZXcgVGVtcGxhdGVSZXN1bHQoc3RyaW5ncywgdmFsdWVzLCAnaHRtbCcsIGRlZmF1bHRUZW1wbGF0ZVByb2Nlc3Nvcik7XG5cbi8qKlxuICogSW50ZXJwcmV0cyBhIHRlbXBsYXRlIGxpdGVyYWwgYXMgYW4gU1ZHIHRlbXBsYXRlIHRoYXQgY2FuIGVmZmljaWVudGx5XG4gKiByZW5kZXIgdG8gYW5kIHVwZGF0ZSBhIGNvbnRhaW5lci5cbiAqL1xuZXhwb3J0IGNvbnN0IHN2ZyA9IChzdHJpbmdzOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSwgLi4udmFsdWVzOiB1bmtub3duW10pID0+XG4gICAgbmV3IFNWR1RlbXBsYXRlUmVzdWx0KHN0cmluZ3MsIHZhbHVlcywgJ3N2ZycsIGRlZmF1bHRUZW1wbGF0ZVByb2Nlc3Nvcik7XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTcgVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG5cbmltcG9ydCB7Y3JlYXRlTWFya2VyLCBkaXJlY3RpdmUsIE5vZGVQYXJ0LCBQYXJ0fSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCByZW5kZXJzIHRoZSBpdGVtcyBvZiBhbiBhc3luYyBpdGVyYWJsZVsxXSwgYXBwZW5kaW5nIG5ld1xuICogdmFsdWVzIGFmdGVyIHByZXZpb3VzIHZhbHVlcywgc2ltaWxhciB0byB0aGUgYnVpbHQtaW4gc3VwcG9ydCBmb3IgaXRlcmFibGVzLlxuICpcbiAqIEFzeW5jIGl0ZXJhYmxlcyBhcmUgb2JqZWN0cyB3aXRoIGEgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSBtZXRob2QsIHdoaWNoXG4gKiByZXR1cm5zIGFuIGl0ZXJhdG9yIHdobydzIGBuZXh0KClgIG1ldGhvZCByZXR1cm5zIGEgUHJvbWlzZS4gV2hlbiBhIG5ld1xuICogdmFsdWUgaXMgYXZhaWxhYmxlLCB0aGUgUHJvbWlzZSByZXNvbHZlcyBhbmQgdGhlIHZhbHVlIGlzIGFwcGVuZGVkIHRvIHRoZVxuICogUGFydCBjb250cm9sbGVkIGJ5IHRoZSBkaXJlY3RpdmUuIElmIGFub3RoZXIgdmFsdWUgb3RoZXIgdGhhbiB0aGlzXG4gKiBkaXJlY3RpdmUgaGFzIGJlZW4gc2V0IG9uIHRoZSBQYXJ0LCB0aGUgaXRlcmFibGUgd2lsbCBubyBsb25nZXIgYmUgbGlzdGVuZWRcbiAqIHRvIGFuZCBuZXcgdmFsdWVzIHdvbid0IGJlIHdyaXR0ZW4gdG8gdGhlIFBhcnQuXG4gKlxuICogWzFdOiBodHRwczovL2dpdGh1Yi5jb20vdGMzOS9wcm9wb3NhbC1hc3luYy1pdGVyYXRpb25cbiAqXG4gKiBAcGFyYW0gdmFsdWUgQW4gYXN5bmMgaXRlcmFibGVcbiAqIEBwYXJhbSBtYXBwZXIgQW4gb3B0aW9uYWwgZnVuY3Rpb24gdGhhdCBtYXBzIGZyb20gKHZhbHVlLCBpbmRleCkgdG8gYW5vdGhlclxuICogICAgIHZhbHVlLiBVc2VmdWwgZm9yIGdlbmVyYXRpbmcgdGVtcGxhdGVzIGZvciBlYWNoIGl0ZW0gaW4gdGhlIGl0ZXJhYmxlLlxuICovXG5leHBvcnQgY29uc3QgYXN5bmNBcHBlbmQgPSBkaXJlY3RpdmUoXG4gICAgPFQ+KHZhbHVlOiBBc3luY0l0ZXJhYmxlPFQ+LFxuICAgICAgICBtYXBwZXI/OiAodjogVCwgaW5kZXg/OiBudW1iZXIpID0+IHVua25vd24pID0+IGFzeW5jIChwYXJ0OiBQYXJ0KSA9PiB7XG4gICAgICBpZiAoIShwYXJ0IGluc3RhbmNlb2YgTm9kZVBhcnQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYXN5bmNBcHBlbmQgY2FuIG9ubHkgYmUgdXNlZCBpbiB0ZXh0IGJpbmRpbmdzJyk7XG4gICAgICB9XG4gICAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IHNldCB1cCB0aGlzIHBhcnRpY3VsYXIgaXRlcmFibGUsIHdlIGRvbid0IG5lZWRcbiAgICAgIC8vIHRvIGRvIGFueXRoaW5nLlxuICAgICAgaWYgKHZhbHVlID09PSBwYXJ0LnZhbHVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHBhcnQudmFsdWUgPSB2YWx1ZTtcblxuICAgICAgLy8gV2Uga2VlcCB0cmFjayBvZiBpdGVtIFBhcnRzIGFjcm9zcyBpdGVyYXRpb25zLCBzbyB0aGF0IHdlIGNhblxuICAgICAgLy8gc2hhcmUgbWFya2VyIG5vZGVzIGJldHdlZW4gY29uc2VjdXRpdmUgUGFydHMuXG4gICAgICBsZXQgaXRlbVBhcnQ7XG4gICAgICBsZXQgaSA9IDA7XG5cbiAgICAgIGZvciBhd2FpdCAobGV0IHYgb2YgdmFsdWUpIHtcbiAgICAgICAgLy8gQ2hlY2sgdG8gbWFrZSBzdXJlIHRoYXQgdmFsdWUgaXMgdGhlIHN0aWxsIHRoZSBjdXJyZW50IHZhbHVlIG9mXG4gICAgICAgIC8vIHRoZSBwYXJ0LCBhbmQgaWYgbm90IGJhaWwgYmVjYXVzZSBhIG5ldyB2YWx1ZSBvd25zIHRoaXMgcGFydFxuICAgICAgICBpZiAocGFydC52YWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdoZW4gd2UgZ2V0IHRoZSBmaXJzdCB2YWx1ZSwgY2xlYXIgdGhlIHBhcnQuIFRoaXMgbGV0cyB0aGVcbiAgICAgICAgLy8gcHJldmlvdXMgdmFsdWUgZGlzcGxheSB1bnRpbCB3ZSBjYW4gcmVwbGFjZSBpdC5cbiAgICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICBwYXJ0LmNsZWFyKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBcyBhIGNvbnZlbmllbmNlLCBiZWNhdXNlIGZ1bmN0aW9uYWwtcHJvZ3JhbW1pbmctc3R5bGVcbiAgICAgICAgLy8gdHJhbnNmb3JtcyBvZiBpdGVyYWJsZXMgYW5kIGFzeW5jIGl0ZXJhYmxlcyByZXF1aXJlcyBhIGxpYnJhcnksXG4gICAgICAgIC8vIHdlIGFjY2VwdCBhIG1hcHBlciBmdW5jdGlvbi4gVGhpcyBpcyBlc3BlY2lhbGx5IGNvbnZlbmllbnQgZm9yXG4gICAgICAgIC8vIHJlbmRlcmluZyBhIHRlbXBsYXRlIGZvciBlYWNoIGl0ZW0uXG4gICAgICAgIGlmIChtYXBwZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIFRoaXMgaXMgc2FmZSBiZWNhdXNlIFQgbXVzdCBvdGhlcndpc2UgYmUgdHJlYXRlZCBhcyB1bmtub3duIGJ5XG4gICAgICAgICAgLy8gdGhlIHJlc3Qgb2YgdGhlIHN5c3RlbS5cbiAgICAgICAgICB2ID0gbWFwcGVyKHYsIGkpIGFzIFQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBMaWtlIHdpdGggc3luYyBpdGVyYWJsZXMsIGVhY2ggaXRlbSBpbmR1Y2VzIGEgUGFydCwgc28gd2UgbmVlZFxuICAgICAgICAvLyB0byBrZWVwIHRyYWNrIG9mIHN0YXJ0IGFuZCBlbmQgbm9kZXMgZm9yIHRoZSBQYXJ0LlxuICAgICAgICAvLyBOb3RlOiBCZWNhdXNlIHRoZXNlIFBhcnRzIGFyZSBub3QgdXBkYXRhYmxlIGxpa2Ugd2l0aCBhIHN5bmNcbiAgICAgICAgLy8gaXRlcmFibGUgKGlmIHdlIHJlbmRlciBhIG5ldyB2YWx1ZSwgd2UgYWx3YXlzIGNsZWFyKSwgaXQgbWF5XG4gICAgICAgIC8vIGJlIHBvc3NpYmxlIHRvIG9wdGltaXplIGF3YXkgdGhlIFBhcnRzIGFuZCBqdXN0IHJlLXVzZSB0aGVcbiAgICAgICAgLy8gUGFydC5zZXRWYWx1ZSgpIGxvZ2ljLlxuXG4gICAgICAgIGxldCBpdGVtU3RhcnROb2RlID0gcGFydC5zdGFydE5vZGU7XG5cbiAgICAgICAgLy8gQ2hlY2sgdG8gc2VlIGlmIHdlIGhhdmUgYSBwcmV2aW91cyBpdGVtIGFuZCBQYXJ0XG4gICAgICAgIGlmIChpdGVtUGFydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gQ3JlYXRlIGEgbmV3IG5vZGUgdG8gc2VwYXJhdGUgdGhlIHByZXZpb3VzIGFuZCBuZXh0IFBhcnRzXG4gICAgICAgICAgaXRlbVN0YXJ0Tm9kZSA9IGNyZWF0ZU1hcmtlcigpO1xuICAgICAgICAgIC8vIGl0ZW1QYXJ0IGlzIGN1cnJlbnRseSB0aGUgUGFydCBmb3IgdGhlIHByZXZpb3VzIGl0ZW0uIFNldFxuICAgICAgICAgIC8vIGl0J3MgZW5kTm9kZSB0byB0aGUgbm9kZSB3ZSdsbCB1c2UgZm9yIHRoZSBuZXh0IFBhcnQnc1xuICAgICAgICAgIC8vIHN0YXJ0Tm9kZS5cbiAgICAgICAgICBpdGVtUGFydC5lbmROb2RlID0gaXRlbVN0YXJ0Tm9kZTtcbiAgICAgICAgICBwYXJ0LmVuZE5vZGUucGFyZW50Tm9kZSEuaW5zZXJ0QmVmb3JlKGl0ZW1TdGFydE5vZGUsIHBhcnQuZW5kTm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgaXRlbVBhcnQgPSBuZXcgTm9kZVBhcnQocGFydC5vcHRpb25zKTtcbiAgICAgICAgaXRlbVBhcnQuaW5zZXJ0QWZ0ZXJOb2RlKGl0ZW1TdGFydE5vZGUpO1xuICAgICAgICBpdGVtUGFydC5zZXRWYWx1ZSh2KTtcbiAgICAgICAgaXRlbVBhcnQuY29tbWl0KCk7XG4gICAgICAgIGkrKztcbiAgICAgIH1cbiAgICB9KTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxNyBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cblxuaW1wb3J0IHtkaXJlY3RpdmUsIE5vZGVQYXJ0LCBQYXJ0fSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCByZW5kZXJzIHRoZSBpdGVtcyBvZiBhbiBhc3luYyBpdGVyYWJsZVsxXSwgcmVwbGFjaW5nXG4gKiBwcmV2aW91cyB2YWx1ZXMgd2l0aCBuZXcgdmFsdWVzLCBzbyB0aGF0IG9ubHkgb25lIHZhbHVlIGlzIGV2ZXIgcmVuZGVyZWRcbiAqIGF0IGEgdGltZS5cbiAqXG4gKiBBc3luYyBpdGVyYWJsZXMgYXJlIG9iamVjdHMgd2l0aCBhIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gbWV0aG9kLCB3aGljaFxuICogcmV0dXJucyBhbiBpdGVyYXRvciB3aG8ncyBgbmV4dCgpYCBtZXRob2QgcmV0dXJucyBhIFByb21pc2UuIFdoZW4gYSBuZXdcbiAqIHZhbHVlIGlzIGF2YWlsYWJsZSwgdGhlIFByb21pc2UgcmVzb2x2ZXMgYW5kIHRoZSB2YWx1ZSBpcyByZW5kZXJlZCB0byB0aGVcbiAqIFBhcnQgY29udHJvbGxlZCBieSB0aGUgZGlyZWN0aXZlLiBJZiBhbm90aGVyIHZhbHVlIG90aGVyIHRoYW4gdGhpc1xuICogZGlyZWN0aXZlIGhhcyBiZWVuIHNldCBvbiB0aGUgUGFydCwgdGhlIGl0ZXJhYmxlIHdpbGwgbm8gbG9uZ2VyIGJlIGxpc3RlbmVkXG4gKiB0byBhbmQgbmV3IHZhbHVlcyB3b24ndCBiZSB3cml0dGVuIHRvIHRoZSBQYXJ0LlxuICpcbiAqIFsxXTogaHR0cHM6Ly9naXRodWIuY29tL3RjMzkvcHJvcG9zYWwtYXN5bmMtaXRlcmF0aW9uXG4gKlxuICogQHBhcmFtIHZhbHVlIEFuIGFzeW5jIGl0ZXJhYmxlXG4gKiBAcGFyYW0gbWFwcGVyIEFuIG9wdGlvbmFsIGZ1bmN0aW9uIHRoYXQgbWFwcyBmcm9tICh2YWx1ZSwgaW5kZXgpIHRvIGFub3RoZXJcbiAqICAgICB2YWx1ZS4gVXNlZnVsIGZvciBnZW5lcmF0aW5nIHRlbXBsYXRlcyBmb3IgZWFjaCBpdGVtIGluIHRoZSBpdGVyYWJsZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGFzeW5jUmVwbGFjZSA9IGRpcmVjdGl2ZShcbiAgICA8VD4odmFsdWU6IEFzeW5jSXRlcmFibGU8VD4sIG1hcHBlcj86ICh2OiBULCBpbmRleD86IG51bWJlcikgPT4gdW5rbm93bikgPT5cbiAgICAgICAgYXN5bmMgKHBhcnQ6IFBhcnQpID0+IHtcbiAgICAgICAgICBpZiAoIShwYXJ0IGluc3RhbmNlb2YgTm9kZVBhcnQpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FzeW5jUmVwbGFjZSBjYW4gb25seSBiZSB1c2VkIGluIHRleHQgYmluZGluZ3MnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gSWYgd2UndmUgYWxyZWFkeSBzZXQgdXAgdGhpcyBwYXJ0aWN1bGFyIGl0ZXJhYmxlLCB3ZSBkb24ndCBuZWVkXG4gICAgICAgICAgLy8gdG8gZG8gYW55dGhpbmcuXG4gICAgICAgICAgaWYgKHZhbHVlID09PSBwYXJ0LnZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gV2UgbmVzdCBhIG5ldyBwYXJ0IHRvIGtlZXAgdHJhY2sgb2YgcHJldmlvdXMgaXRlbSB2YWx1ZXMgc2VwYXJhdGVseVxuICAgICAgICAgIC8vIG9mIHRoZSBpdGVyYWJsZSBhcyBhIHZhbHVlIGl0c2VsZi5cbiAgICAgICAgICBjb25zdCBpdGVtUGFydCA9IG5ldyBOb2RlUGFydChwYXJ0Lm9wdGlvbnMpO1xuICAgICAgICAgIHBhcnQudmFsdWUgPSB2YWx1ZTtcblxuICAgICAgICAgIGxldCBpID0gMDtcblxuICAgICAgICAgIGZvciBhd2FpdCAobGV0IHYgb2YgdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIHRvIG1ha2Ugc3VyZSB0aGF0IHZhbHVlIGlzIHRoZSBzdGlsbCB0aGUgY3VycmVudCB2YWx1ZSBvZlxuICAgICAgICAgICAgLy8gdGhlIHBhcnQsIGFuZCBpZiBub3QgYmFpbCBiZWNhdXNlIGEgbmV3IHZhbHVlIG93bnMgdGhpcyBwYXJ0XG4gICAgICAgICAgICBpZiAocGFydC52YWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFdoZW4gd2UgZ2V0IHRoZSBmaXJzdCB2YWx1ZSwgY2xlYXIgdGhlIHBhcnQuIFRoaXMgbGV0J3MgdGhlXG4gICAgICAgICAgICAvLyBwcmV2aW91cyB2YWx1ZSBkaXNwbGF5IHVudGlsIHdlIGNhbiByZXBsYWNlIGl0LlxuICAgICAgICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICAgICAgcGFydC5jbGVhcigpO1xuICAgICAgICAgICAgICBpdGVtUGFydC5hcHBlbmRJbnRvUGFydChwYXJ0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQXMgYSBjb252ZW5pZW5jZSwgYmVjYXVzZSBmdW5jdGlvbmFsLXByb2dyYW1taW5nLXN0eWxlXG4gICAgICAgICAgICAvLyB0cmFuc2Zvcm1zIG9mIGl0ZXJhYmxlcyBhbmQgYXN5bmMgaXRlcmFibGVzIHJlcXVpcmVzIGEgbGlicmFyeSxcbiAgICAgICAgICAgIC8vIHdlIGFjY2VwdCBhIG1hcHBlciBmdW5jdGlvbi4gVGhpcyBpcyBlc3BlY2lhbGx5IGNvbnZlbmllbnQgZm9yXG4gICAgICAgICAgICAvLyByZW5kZXJpbmcgYSB0ZW1wbGF0ZSBmb3IgZWFjaCBpdGVtLlxuICAgICAgICAgICAgaWYgKG1hcHBlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIC8vIFRoaXMgaXMgc2FmZSBiZWNhdXNlIFQgbXVzdCBvdGhlcndpc2UgYmUgdHJlYXRlZCBhcyB1bmtub3duIGJ5XG4gICAgICAgICAgICAgIC8vIHRoZSByZXN0IG9mIHRoZSBzeXN0ZW0uXG4gICAgICAgICAgICAgIHYgPSBtYXBwZXIodiwgaSkgYXMgVDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaXRlbVBhcnQuc2V0VmFsdWUodik7XG4gICAgICAgICAgICBpdGVtUGFydC5jb21taXQoKTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE4IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuXG5pbXBvcnQge1RlbXBsYXRlSW5zdGFuY2V9IGZyb20gJy4uL2xpYi90ZW1wbGF0ZS1pbnN0YW5jZS5qcyc7XG5pbXBvcnQge1RlbXBsYXRlfSBmcm9tICcuLi9saWIvdGVtcGxhdGUuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIE5vZGVQYXJ0LCBQYXJ0LCByZXBhcmVudE5vZGVzLCBUZW1wbGF0ZVJlc3VsdH0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuXG50eXBlIENhY2hlZFRlbXBsYXRlID0ge1xuICByZWFkb25seSBpbnN0YW5jZTogVGVtcGxhdGVJbnN0YW5jZSxcbiAgcmVhZG9ubHkgbm9kZXM6IERvY3VtZW50RnJhZ21lbnRcbn07XG5jb25zdCB0ZW1wbGF0ZUNhY2hlcyA9XG4gICAgbmV3IFdlYWtNYXA8Tm9kZVBhcnQsIFdlYWtNYXA8VGVtcGxhdGUsIENhY2hlZFRlbXBsYXRlPj4oKTtcblxuLyoqXG4gKiBFbmFibGVzIGZhc3Qgc3dpdGNoaW5nIGJldHdlZW4gbXVsdGlwbGUgdGVtcGxhdGVzIGJ5IGNhY2hpbmcgdGhlIERPTSBub2Rlc1xuICogYW5kIFRlbXBsYXRlSW5zdGFuY2VzIHByb2R1Y2VkIGJ5IHRoZSB0ZW1wbGF0ZXMuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIGxldCBjaGVja2VkID0gZmFsc2U7XG4gKlxuICogaHRtbGBcbiAqICAgJHtjYWNoZShjaGVja2VkID8gaHRtbGBpbnB1dCBpcyBjaGVja2VkYCA6IGh0bWxgaW5wdXQgaXMgbm90IGNoZWNrZWRgKX1cbiAqIGBcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgY2FjaGUgPSBkaXJlY3RpdmUoKHZhbHVlOiB1bmtub3duKSA9PiAocGFydDogUGFydCkgPT4ge1xuICBpZiAoIShwYXJ0IGluc3RhbmNlb2YgTm9kZVBhcnQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjYWNoZSBjYW4gb25seSBiZSB1c2VkIGluIHRleHQgYmluZGluZ3MnKTtcbiAgfVxuXG4gIGxldCB0ZW1wbGF0ZUNhY2hlID0gdGVtcGxhdGVDYWNoZXMuZ2V0KHBhcnQpO1xuXG4gIGlmICh0ZW1wbGF0ZUNhY2hlID09PSB1bmRlZmluZWQpIHtcbiAgICB0ZW1wbGF0ZUNhY2hlID0gbmV3IFdlYWtNYXAoKTtcbiAgICB0ZW1wbGF0ZUNhY2hlcy5zZXQocGFydCwgdGVtcGxhdGVDYWNoZSk7XG4gIH1cblxuICBjb25zdCBwcmV2aW91c1ZhbHVlID0gcGFydC52YWx1ZTtcblxuICAvLyBGaXJzdCwgY2FuIHdlIHVwZGF0ZSB0aGUgY3VycmVudCBUZW1wbGF0ZUluc3RhbmNlLCBvciBkbyB3ZSBuZWVkIHRvIG1vdmVcbiAgLy8gdGhlIGN1cnJlbnQgbm9kZXMgaW50byB0aGUgY2FjaGU/XG4gIGlmIChwcmV2aW91c1ZhbHVlIGluc3RhbmNlb2YgVGVtcGxhdGVJbnN0YW5jZSkge1xuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFRlbXBsYXRlUmVzdWx0ICYmXG4gICAgICAgIHByZXZpb3VzVmFsdWUudGVtcGxhdGUgPT09IHBhcnQub3B0aW9ucy50ZW1wbGF0ZUZhY3RvcnkodmFsdWUpKSB7XG4gICAgICAvLyBTYW1lIFRlbXBsYXRlLCBqdXN0IHRyaWdnZXIgYW4gdXBkYXRlIG9mIHRoZSBUZW1wbGF0ZUluc3RhbmNlXG4gICAgICBwYXJ0LnNldFZhbHVlKHZhbHVlKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTm90IHRoZSBzYW1lIFRlbXBsYXRlLCBtb3ZlIHRoZSBub2RlcyBmcm9tIHRoZSBET00gaW50byB0aGUgY2FjaGUuXG4gICAgICBsZXQgY2FjaGVkVGVtcGxhdGUgPSB0ZW1wbGF0ZUNhY2hlLmdldChwcmV2aW91c1ZhbHVlLnRlbXBsYXRlKTtcbiAgICAgIGlmIChjYWNoZWRUZW1wbGF0ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNhY2hlZFRlbXBsYXRlID0ge1xuICAgICAgICAgIGluc3RhbmNlOiBwcmV2aW91c1ZhbHVlLFxuICAgICAgICAgIG5vZGVzOiBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCksXG4gICAgICAgIH07XG4gICAgICAgIHRlbXBsYXRlQ2FjaGUuc2V0KHByZXZpb3VzVmFsdWUudGVtcGxhdGUsIGNhY2hlZFRlbXBsYXRlKTtcbiAgICAgIH1cbiAgICAgIHJlcGFyZW50Tm9kZXMoXG4gICAgICAgICAgY2FjaGVkVGVtcGxhdGUubm9kZXMsIHBhcnQuc3RhcnROb2RlLm5leHRTaWJsaW5nLCBwYXJ0LmVuZE5vZGUpO1xuICAgIH1cbiAgfVxuXG4gIC8vIE5leHQsIGNhbiB3ZSByZXVzZSBub2RlcyBmcm9tIHRoZSBjYWNoZT9cbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgVGVtcGxhdGVSZXN1bHQpIHtcbiAgICBjb25zdCB0ZW1wbGF0ZSA9IHBhcnQub3B0aW9ucy50ZW1wbGF0ZUZhY3RvcnkodmFsdWUpO1xuICAgIGNvbnN0IGNhY2hlZFRlbXBsYXRlID0gdGVtcGxhdGVDYWNoZS5nZXQodGVtcGxhdGUpO1xuICAgIGlmIChjYWNoZWRUZW1wbGF0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBNb3ZlIG5vZGVzIG91dCBvZiBjYWNoZVxuICAgICAgcGFydC5zZXRWYWx1ZShjYWNoZWRUZW1wbGF0ZS5ub2Rlcyk7XG4gICAgICBwYXJ0LmNvbW1pdCgpO1xuICAgICAgLy8gU2V0IHRoZSBQYXJ0IHZhbHVlIHRvIHRoZSBUZW1wbGF0ZUluc3RhbmNlIHNvIGl0J2xsIHVwZGF0ZSBpdC5cbiAgICAgIHBhcnQudmFsdWUgPSBjYWNoZWRUZW1wbGF0ZS5pbnN0YW5jZTtcbiAgICB9XG4gIH1cbiAgcGFydC5zZXRWYWx1ZSh2YWx1ZSk7XG59KTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxOCBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cblxuaW1wb3J0IHtBdHRyaWJ1dGVQYXJ0LCBkaXJlY3RpdmUsIFBhcnQsIFByb3BlcnR5UGFydH0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xhc3NJbmZvIHtcbiAgcmVhZG9ubHkgW25hbWU6IHN0cmluZ106IHN0cmluZ3xib29sZWFufG51bWJlcjtcbn1cblxuLyoqXG4gKiBTdG9yZXMgdGhlIENsYXNzSW5mbyBvYmplY3QgYXBwbGllZCB0byBhIGdpdmVuIEF0dHJpYnV0ZVBhcnQuXG4gKiBVc2VkIHRvIHVuc2V0IGV4aXN0aW5nIHZhbHVlcyB3aGVuIGEgbmV3IENsYXNzSW5mbyBvYmplY3QgaXMgYXBwbGllZC5cbiAqL1xuY29uc3QgY2xhc3NNYXBDYWNoZSA9IG5ldyBXZWFrTWFwKCk7XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgdGhhdCBhcHBsaWVzIENTUyBjbGFzc2VzLiBUaGlzIG11c3QgYmUgdXNlZCBpbiB0aGUgYGNsYXNzYFxuICogYXR0cmlidXRlIGFuZCBtdXN0IGJlIHRoZSBvbmx5IHBhcnQgdXNlZCBpbiB0aGUgYXR0cmlidXRlLiBJdCB0YWtlcyBlYWNoXG4gKiBwcm9wZXJ0eSBpbiB0aGUgYGNsYXNzSW5mb2AgYXJndW1lbnQgYW5kIGFkZHMgdGhlIHByb3BlcnR5IG5hbWUgdG8gdGhlXG4gKiBlbGVtZW50J3MgYGNsYXNzTGlzdGAgaWYgdGhlIHByb3BlcnR5IHZhbHVlIGlzIHRydXRoeTsgaWYgdGhlIHByb3BlcnR5IHZhbHVlXG4gKiBpcyBmYWxzZXksIHRoZSBwcm9wZXJ0eSBuYW1lIGlzIHJlbW92ZWQgZnJvbSB0aGUgZWxlbWVudCdzIGBjbGFzc0xpc3RgLiBGb3JcbiAqIGV4YW1wbGVcbiAqIGB7Zm9vOiBiYXJ9YCBhcHBsaWVzIHRoZSBjbGFzcyBgZm9vYCBpZiB0aGUgdmFsdWUgb2YgYGJhcmAgaXMgdHJ1dGh5LlxuICogQHBhcmFtIGNsYXNzSW5mbyB7Q2xhc3NJbmZvfVxuICovXG5leHBvcnQgY29uc3QgY2xhc3NNYXAgPSBkaXJlY3RpdmUoKGNsYXNzSW5mbzogQ2xhc3NJbmZvKSA9PiAocGFydDogUGFydCkgPT4ge1xuICBpZiAoIShwYXJ0IGluc3RhbmNlb2YgQXR0cmlidXRlUGFydCkgfHwgKHBhcnQgaW5zdGFuY2VvZiBQcm9wZXJ0eVBhcnQpIHx8XG4gICAgICBwYXJ0LmNvbW1pdHRlci5uYW1lICE9PSAnY2xhc3MnIHx8IHBhcnQuY29tbWl0dGVyLnBhcnRzLmxlbmd0aCA+IDEpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdUaGUgYGNsYXNzTWFwYCBkaXJlY3RpdmUgbXVzdCBiZSB1c2VkIGluIHRoZSBgY2xhc3NgIGF0dHJpYnV0ZSAnICtcbiAgICAgICAgJ2FuZCBtdXN0IGJlIHRoZSBvbmx5IHBhcnQgaW4gdGhlIGF0dHJpYnV0ZS4nKTtcbiAgfVxuXG4gIGNvbnN0IHtjb21taXR0ZXJ9ID0gcGFydDtcbiAgY29uc3Qge2VsZW1lbnR9ID0gY29tbWl0dGVyO1xuXG4gIC8vIGhhbmRsZSBzdGF0aWMgY2xhc3Nlc1xuICBpZiAoIWNsYXNzTWFwQ2FjaGUuaGFzKHBhcnQpKSB7XG4gICAgZWxlbWVudC5jbGFzc05hbWUgPSBjb21taXR0ZXIuc3RyaW5ncy5qb2luKCcgJyk7XG4gIH1cblxuICBjb25zdCB7Y2xhc3NMaXN0fSA9IGVsZW1lbnQ7XG5cbiAgLy8gcmVtb3ZlIG9sZCBjbGFzc2VzIHRoYXQgbm8gbG9uZ2VyIGFwcGx5XG4gIGNvbnN0IG9sZEluZm8gPSBjbGFzc01hcENhY2hlLmdldChwYXJ0KTtcbiAgZm9yIChjb25zdCBuYW1lIGluIG9sZEluZm8pIHtcbiAgICBpZiAoIShuYW1lIGluIGNsYXNzSW5mbykpIHtcbiAgICAgIGNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gYWRkIG5ldyBjbGFzc2VzXG4gIGZvciAoY29uc3QgbmFtZSBpbiBjbGFzc0luZm8pIHtcbiAgICBjb25zdCB2YWx1ZSA9IGNsYXNzSW5mb1tuYW1lXTtcbiAgICBpZiAoIW9sZEluZm8gfHwgdmFsdWUgIT09IG9sZEluZm9bbmFtZV0pIHtcbiAgICAgIC8vIFdlIGV4cGxpY2l0bHkgd2FudCBhIGxvb3NlIHRydXRoeSBjaGVjayBoZXJlIGJlY2F1c2VcbiAgICAgIC8vIGl0IHNlZW1zIG1vcmUgY29udmVuaWVudCB0aGF0ICcnIGFuZCAwIGFyZSBza2lwcGVkLlxuICAgICAgY29uc3QgbWV0aG9kID0gdmFsdWUgPyAnYWRkJyA6ICdyZW1vdmUnO1xuICAgICAgY2xhc3NMaXN0W21ldGhvZF0obmFtZSk7XG4gICAgfVxuICB9XG4gIGNsYXNzTWFwQ2FjaGUuc2V0KHBhcnQsIGNsYXNzSW5mbyk7XG59KTtcbiIsIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxOCBUaGUgUG9seW1lciBQcm9qZWN0IEF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIGNvZGUgbWF5IG9ubHkgYmUgdXNlZCB1bmRlciB0aGUgQlNEIHN0eWxlIGxpY2Vuc2UgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9MSUNFTlNFLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBhdXRob3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0FVVEhPUlMudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGNvbnRyaWJ1dG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9DT05UUklCVVRPUlMudHh0XG4gKiBDb2RlIGRpc3RyaWJ1dGVkIGJ5IEdvb2dsZSBhcyBwYXJ0IG9mIHRoZSBwb2x5bWVyIHByb2plY3QgaXMgYWxzb1xuICogc3ViamVjdCB0byBhbiBhZGRpdGlvbmFsIElQIHJpZ2h0cyBncmFudCBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL1BBVEVOVFMudHh0XG4gKi9cblxuaW1wb3J0IHtkaXJlY3RpdmUsIFBhcnR9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcblxuY29uc3QgcHJldmlvdXNWYWx1ZXMgPSBuZXcgV2Vha01hcDxQYXJ0LCB1bmtub3duPigpO1xuXG4vKipcbiAqIFByZXZlbnRzIHJlLXJlbmRlciBvZiBhIHRlbXBsYXRlIGZ1bmN0aW9uIHVudGlsIGEgc2luZ2xlIHZhbHVlIG9yIGFuIGFycmF5IG9mXG4gKiB2YWx1ZXMgY2hhbmdlcy5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBodG1sYFxuICogICA8ZGl2PlxuICogICAgICR7Z3VhcmQoW3VzZXIuaWQsIGNvbXBhbnkuaWRdLCAoKSA9PiBodG1sYC4uLmApfVxuICogICA8L2Rpdj5cbiAqIGBgYFxuICpcbiAqIEluIHRoaXMgY2FzZSwgdGhlIHRlbXBsYXRlIG9ubHkgcmVuZGVycyBpZiBlaXRoZXIgYHVzZXIuaWRgIG9yIGBjb21wYW55LmlkYFxuICogY2hhbmdlcy5cbiAqXG4gKiBndWFyZCgpIGlzIHVzZWZ1bCB3aXRoIGltbXV0YWJsZSBkYXRhIHBhdHRlcm5zLCBieSBwcmV2ZW50aW5nIGV4cGVuc2l2ZSB3b3JrXG4gKiB1bnRpbCBkYXRhIHVwZGF0ZXMuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogaHRtbGBcbiAqICAgPGRpdj5cbiAqICAgICAke2d1YXJkKFtpbW11dGFibGVJdGVtc10sICgpID0+IGltbXV0YWJsZUl0ZW1zLm1hcChpID0+IGh0bWxgJHtpfWApKX1cbiAqICAgPC9kaXY+XG4gKiBgYGBcbiAqXG4gKiBJbiB0aGlzIGNhc2UsIGl0ZW1zIGFyZSBtYXBwZWQgb3ZlciBvbmx5IHdoZW4gdGhlIGFycmF5IHJlZmVyZW5jZSBjaGFuZ2VzLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSB0aGUgdmFsdWUgdG8gY2hlY2sgYmVmb3JlIHJlLXJlbmRlcmluZ1xuICogQHBhcmFtIGYgdGhlIHRlbXBsYXRlIGZ1bmN0aW9uXG4gKi9cbmV4cG9ydCBjb25zdCBndWFyZCA9XG4gICAgZGlyZWN0aXZlKCh2YWx1ZTogdW5rbm93biwgZjogKCkgPT4gdW5rbm93bikgPT4gKHBhcnQ6IFBhcnQpOiB2b2lkID0+IHtcbiAgICAgIGNvbnN0IHByZXZpb3VzVmFsdWUgPSBwcmV2aW91c1ZhbHVlcy5nZXQocGFydCk7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgLy8gRGlydHktY2hlY2sgYXJyYXlzIGJ5IGl0ZW1cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocHJldmlvdXNWYWx1ZSkgJiZcbiAgICAgICAgICAgIHByZXZpb3VzVmFsdWUubGVuZ3RoID09PSB2YWx1ZS5sZW5ndGggJiZcbiAgICAgICAgICAgIHZhbHVlLmV2ZXJ5KCh2LCBpKSA9PiB2ID09PSBwcmV2aW91c1ZhbHVlW2ldKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICBwcmV2aW91c1ZhbHVlID09PSB2YWx1ZSAmJlxuICAgICAgICAgICh2YWx1ZSAhPT0gdW5kZWZpbmVkIHx8IHByZXZpb3VzVmFsdWVzLmhhcyhwYXJ0KSkpIHtcbiAgICAgICAgLy8gRGlydHktY2hlY2sgbm9uLWFycmF5cyBieSBpZGVudGl0eVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHBhcnQuc2V0VmFsdWUoZigpKTtcbiAgICAgIC8vIENvcHkgdGhlIHZhbHVlIGlmIGl0J3MgYW4gYXJyYXkgc28gdGhhdCBpZiBpdCdzIG11dGF0ZWQgd2UgZG9uJ3QgZm9yZ2V0XG4gICAgICAvLyB3aGF0IHRoZSBwcmV2aW91cyB2YWx1ZXMgd2VyZS5cbiAgICAgIHByZXZpb3VzVmFsdWVzLnNldChcbiAgICAgICAgICBwYXJ0LCBBcnJheS5pc0FycmF5KHZhbHVlKSA/IEFycmF5LmZyb20odmFsdWUpIDogdmFsdWUpO1xuICAgIH0pO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE4IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuXG5pbXBvcnQge0F0dHJpYnV0ZVBhcnQsIGRpcmVjdGl2ZSwgUGFydH0gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuXG4vKipcbiAqIEZvciBBdHRyaWJ1dGVQYXJ0cywgc2V0cyB0aGUgYXR0cmlidXRlIGlmIHRoZSB2YWx1ZSBpcyBkZWZpbmVkIGFuZCByZW1vdmVzXG4gKiB0aGUgYXR0cmlidXRlIGlmIHRoZSB2YWx1ZSBpcyB1bmRlZmluZWQuXG4gKlxuICogRm9yIG90aGVyIHBhcnQgdHlwZXMsIHRoaXMgZGlyZWN0aXZlIGlzIGEgbm8tb3AuXG4gKi9cbmV4cG9ydCBjb25zdCBpZkRlZmluZWQgPSBkaXJlY3RpdmUoKHZhbHVlOiB1bmtub3duKSA9PiAocGFydDogUGFydCkgPT4ge1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCAmJiBwYXJ0IGluc3RhbmNlb2YgQXR0cmlidXRlUGFydCkge1xuICAgIGlmICh2YWx1ZSAhPT0gcGFydC52YWx1ZSkge1xuICAgICAgY29uc3QgbmFtZSA9IHBhcnQuY29tbWl0dGVyLm5hbWU7XG4gICAgICBwYXJ0LmNvbW1pdHRlci5lbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcGFydC5zZXRWYWx1ZSh2YWx1ZSk7XG4gIH1cbn0pO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuXG5pbXBvcnQge0RpcmVjdGl2ZUZufSBmcm9tICcuLi9saWIvZGlyZWN0aXZlLmpzJztcbmltcG9ydCB7Y3JlYXRlTWFya2VyLCBkaXJlY3RpdmUsIE5vZGVQYXJ0LCBQYXJ0LCByZW1vdmVOb2RlcywgcmVwYXJlbnROb2Rlc30gZnJvbSAnLi4vbGl0LWh0bWwuanMnO1xuXG5leHBvcnQgdHlwZSBLZXlGbjxUPiA9IChpdGVtOiBULCBpbmRleDogbnVtYmVyKSA9PiB1bmtub3duO1xuZXhwb3J0IHR5cGUgSXRlbVRlbXBsYXRlPFQ+ID0gKGl0ZW06IFQsIGluZGV4OiBudW1iZXIpID0+IHVua25vd247XG5cbi8vIEhlbHBlciBmdW5jdGlvbnMgZm9yIG1hbmlwdWxhdGluZyBwYXJ0c1xuLy8gVE9ETyhrc2NoYWFmKTogUmVmYWN0b3IgaW50byBQYXJ0IEFQST9cbmNvbnN0IGNyZWF0ZUFuZEluc2VydFBhcnQgPVxuICAgIChjb250YWluZXJQYXJ0OiBOb2RlUGFydCwgYmVmb3JlUGFydD86IE5vZGVQYXJ0KTogTm9kZVBhcnQgPT4ge1xuICAgICAgY29uc3QgY29udGFpbmVyID0gY29udGFpbmVyUGFydC5zdGFydE5vZGUucGFyZW50Tm9kZSBhcyBOb2RlO1xuICAgICAgY29uc3QgYmVmb3JlTm9kZSA9IGJlZm9yZVBhcnQgPT09IHVuZGVmaW5lZCA/IGNvbnRhaW5lclBhcnQuZW5kTm9kZSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVmb3JlUGFydC5zdGFydE5vZGU7XG4gICAgICBjb25zdCBzdGFydE5vZGUgPSBjb250YWluZXIuaW5zZXJ0QmVmb3JlKGNyZWF0ZU1hcmtlcigpLCBiZWZvcmVOb2RlKTtcbiAgICAgIGNvbnRhaW5lci5pbnNlcnRCZWZvcmUoY3JlYXRlTWFya2VyKCksIGJlZm9yZU5vZGUpO1xuICAgICAgY29uc3QgbmV3UGFydCA9IG5ldyBOb2RlUGFydChjb250YWluZXJQYXJ0Lm9wdGlvbnMpO1xuICAgICAgbmV3UGFydC5pbnNlcnRBZnRlck5vZGUoc3RhcnROb2RlKTtcbiAgICAgIHJldHVybiBuZXdQYXJ0O1xuICAgIH07XG5cbmNvbnN0IHVwZGF0ZVBhcnQgPSAocGFydDogTm9kZVBhcnQsIHZhbHVlOiB1bmtub3duKSA9PiB7XG4gIHBhcnQuc2V0VmFsdWUodmFsdWUpO1xuICBwYXJ0LmNvbW1pdCgpO1xuICByZXR1cm4gcGFydDtcbn07XG5cbmNvbnN0IGluc2VydFBhcnRCZWZvcmUgPVxuICAgIChjb250YWluZXJQYXJ0OiBOb2RlUGFydCwgcGFydDogTm9kZVBhcnQsIHJlZj86IE5vZGVQYXJ0KSA9PiB7XG4gICAgICBjb25zdCBjb250YWluZXIgPSBjb250YWluZXJQYXJ0LnN0YXJ0Tm9kZS5wYXJlbnROb2RlIGFzIE5vZGU7XG4gICAgICBjb25zdCBiZWZvcmVOb2RlID0gcmVmID8gcmVmLnN0YXJ0Tm9kZSA6IGNvbnRhaW5lclBhcnQuZW5kTm9kZTtcbiAgICAgIGNvbnN0IGVuZE5vZGUgPSBwYXJ0LmVuZE5vZGUubmV4dFNpYmxpbmc7XG4gICAgICBpZiAoZW5kTm9kZSAhPT0gYmVmb3JlTm9kZSkge1xuICAgICAgICByZXBhcmVudE5vZGVzKGNvbnRhaW5lciwgcGFydC5zdGFydE5vZGUsIGVuZE5vZGUsIGJlZm9yZU5vZGUpO1xuICAgICAgfVxuICAgIH07XG5cbmNvbnN0IHJlbW92ZVBhcnQgPSAocGFydDogTm9kZVBhcnQpID0+IHtcbiAgcmVtb3ZlTm9kZXMoXG4gICAgICBwYXJ0LnN0YXJ0Tm9kZS5wYXJlbnROb2RlISwgcGFydC5zdGFydE5vZGUsIHBhcnQuZW5kTm9kZS5uZXh0U2libGluZyk7XG59O1xuXG4vLyBIZWxwZXIgZm9yIGdlbmVyYXRpbmcgYSBtYXAgb2YgYXJyYXkgaXRlbSB0byBpdHMgaW5kZXggb3ZlciBhIHN1YnNldFxuLy8gb2YgYW4gYXJyYXkgKHVzZWQgdG8gbGF6aWx5IGdlbmVyYXRlIGBuZXdLZXlUb0luZGV4TWFwYCBhbmRcbi8vIGBvbGRLZXlUb0luZGV4TWFwYClcbmNvbnN0IGdlbmVyYXRlTWFwID0gKGxpc3Q6IHVua25vd25bXSwgc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIpID0+IHtcbiAgY29uc3QgbWFwID0gbmV3IE1hcCgpO1xuICBmb3IgKGxldCBpID0gc3RhcnQ7IGkgPD0gZW5kOyBpKyspIHtcbiAgICBtYXAuc2V0KGxpc3RbaV0sIGkpO1xuICB9XG4gIHJldHVybiBtYXA7XG59O1xuXG4vLyBTdG9yZXMgcHJldmlvdXMgb3JkZXJlZCBsaXN0IG9mIHBhcnRzIGFuZCBtYXAgb2Yga2V5IHRvIGluZGV4XG5jb25zdCBwYXJ0TGlzdENhY2hlID0gbmV3IFdlYWtNYXA8Tm9kZVBhcnQsIChOb2RlUGFydCB8IG51bGwpW10+KCk7XG5jb25zdCBrZXlMaXN0Q2FjaGUgPSBuZXcgV2Vha01hcDxOb2RlUGFydCwgdW5rbm93bltdPigpO1xuXG4vKipcbiAqIEEgZGlyZWN0aXZlIHRoYXQgcmVwZWF0cyBhIHNlcmllcyBvZiB2YWx1ZXMgKHVzdWFsbHkgYFRlbXBsYXRlUmVzdWx0c2ApXG4gKiBnZW5lcmF0ZWQgZnJvbSBhbiBpdGVyYWJsZSwgYW5kIHVwZGF0ZXMgdGhvc2UgaXRlbXMgZWZmaWNpZW50bHkgd2hlbiB0aGVcbiAqIGl0ZXJhYmxlIGNoYW5nZXMgYmFzZWQgb24gdXNlci1wcm92aWRlZCBga2V5c2AgYXNzb2NpYXRlZCB3aXRoIGVhY2ggaXRlbS5cbiAqXG4gKiBOb3RlIHRoYXQgaWYgYSBga2V5Rm5gIGlzIHByb3ZpZGVkLCBzdHJpY3Qga2V5LXRvLURPTSBtYXBwaW5nIGlzIG1haW50YWluZWQsXG4gKiBtZWFuaW5nIHByZXZpb3VzIERPTSBmb3IgYSBnaXZlbiBrZXkgaXMgbW92ZWQgaW50byB0aGUgbmV3IHBvc2l0aW9uIGlmXG4gKiBuZWVkZWQsIGFuZCBET00gd2lsbCBuZXZlciBiZSByZXVzZWQgd2l0aCB2YWx1ZXMgZm9yIGRpZmZlcmVudCBrZXlzIChuZXcgRE9NXG4gKiB3aWxsIGFsd2F5cyBiZSBjcmVhdGVkIGZvciBuZXcga2V5cykuIFRoaXMgaXMgZ2VuZXJhbGx5IHRoZSBtb3N0IGVmZmljaWVudFxuICogd2F5IHRvIHVzZSBgcmVwZWF0YCBzaW5jZSBpdCBwZXJmb3JtcyBtaW5pbXVtIHVubmVjZXNzYXJ5IHdvcmsgZm9yIGluc2VydGlvbnNcbiAqIGFtZCByZW1vdmFscy5cbiAqXG4gKiBJTVBPUlRBTlQ6IElmIHByb3ZpZGluZyBhIGBrZXlGbmAsIGtleXMgKm11c3QqIGJlIHVuaXF1ZSBmb3IgYWxsIGl0ZW1zIGluIGFcbiAqIGdpdmVuIGNhbGwgdG8gYHJlcGVhdGAuIFRoZSBiZWhhdmlvciB3aGVuIHR3byBvciBtb3JlIGl0ZW1zIGhhdmUgdGhlIHNhbWUga2V5XG4gKiBpcyB1bmRlZmluZWQuXG4gKlxuICogSWYgbm8gYGtleUZuYCBpcyBwcm92aWRlZCwgdGhpcyBkaXJlY3RpdmUgd2lsbCBwZXJmb3JtIHNpbWlsYXIgdG8gbWFwcGluZ1xuICogaXRlbXMgdG8gdmFsdWVzLCBhbmQgRE9NIHdpbGwgYmUgcmV1c2VkIGFnYWluc3QgcG90ZW50aWFsbHkgZGlmZmVyZW50IGl0ZW1zLlxuICovXG5leHBvcnQgY29uc3QgcmVwZWF0ID1cbiAgICBkaXJlY3RpdmUoXG4gICAgICAgIDxUPihpdGVtczogSXRlcmFibGU8VD4sXG4gICAgICAgICAgICBrZXlGbk9yVGVtcGxhdGU6IEtleUZuPFQ+fEl0ZW1UZW1wbGF0ZTxUPixcbiAgICAgICAgICAgIHRlbXBsYXRlPzogSXRlbVRlbXBsYXRlPFQ+KTpcbiAgICAgICAgICAgIERpcmVjdGl2ZUZuID0+IHtcbiAgICAgICAgICAgICAgbGV0IGtleUZuOiBLZXlGbjxUPjtcbiAgICAgICAgICAgICAgaWYgKHRlbXBsYXRlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZSA9IGtleUZuT3JUZW1wbGF0ZTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXlGbk9yVGVtcGxhdGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGtleUZuID0ga2V5Rm5PclRlbXBsYXRlIGFzIEtleUZuPFQ+O1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgcmV0dXJuIChjb250YWluZXJQYXJ0OiBQYXJ0KTogdm9pZCA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCEoY29udGFpbmVyUGFydCBpbnN0YW5jZW9mIE5vZGVQYXJ0KSkge1xuICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdyZXBlYXQgY2FuIG9ubHkgYmUgdXNlZCBpbiB0ZXh0IGJpbmRpbmdzJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIE9sZCBwYXJ0ICYga2V5IGxpc3RzIGFyZSByZXRyaWV2ZWQgZnJvbSB0aGUgbGFzdCB1cGRhdGVcbiAgICAgICAgICAgICAgICAvLyAoYXNzb2NpYXRlZCB3aXRoIHRoZSBwYXJ0IGZvciB0aGlzIGluc3RhbmNlIG9mIHRoZSBkaXJlY3RpdmUpXG4gICAgICAgICAgICAgICAgY29uc3Qgb2xkUGFydHMgPSBwYXJ0TGlzdENhY2hlLmdldChjb250YWluZXJQYXJ0KSB8fCBbXTtcbiAgICAgICAgICAgICAgICBjb25zdCBvbGRLZXlzID0ga2V5TGlzdENhY2hlLmdldChjb250YWluZXJQYXJ0KSB8fCBbXTtcblxuICAgICAgICAgICAgICAgIC8vIE5ldyBwYXJ0IGxpc3Qgd2lsbCBiZSBidWlsdCB1cCBhcyB3ZSBnbyAoZWl0aGVyIHJldXNlZCBmcm9tXG4gICAgICAgICAgICAgICAgLy8gb2xkIHBhcnRzIG9yIGNyZWF0ZWQgZm9yIG5ldyBrZXlzIGluIHRoaXMgdXBkYXRlKS4gVGhpcyBpc1xuICAgICAgICAgICAgICAgIC8vIHNhdmVkIGluIHRoZSBhYm92ZSBjYWNoZSBhdCB0aGUgZW5kIG9mIHRoZSB1cGRhdGUuXG4gICAgICAgICAgICAgICAgY29uc3QgbmV3UGFydHM6IE5vZGVQYXJ0W10gPSBbXTtcblxuICAgICAgICAgICAgICAgIC8vIE5ldyB2YWx1ZSBsaXN0IGlzIGVhZ2VybHkgZ2VuZXJhdGVkIGZyb20gaXRlbXMgYWxvbmcgd2l0aCBhXG4gICAgICAgICAgICAgICAgLy8gcGFyYWxsZWwgYXJyYXkgaW5kaWNhdGluZyBpdHMga2V5LlxuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlczogdW5rbm93bltdID0gW107XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3S2V5czogdW5rbm93bltdID0gW107XG4gICAgICAgICAgICAgICAgbGV0IGluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgICAgICAgICAgICAgIG5ld0tleXNbaW5kZXhdID0ga2V5Rm4gPyBrZXlGbihpdGVtLCBpbmRleCkgOiBpbmRleDtcbiAgICAgICAgICAgICAgICAgIG5ld1ZhbHVlc1tpbmRleF0gPSB0ZW1wbGF0ZSAhKGl0ZW0sIGluZGV4KTtcbiAgICAgICAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gTWFwcyBmcm9tIGtleSB0byBpbmRleCBmb3IgY3VycmVudCBhbmQgcHJldmlvdXMgdXBkYXRlOyB0aGVzZVxuICAgICAgICAgICAgICAgIC8vIGFyZSBnZW5lcmF0ZWQgbGF6aWx5IG9ubHkgd2hlbiBuZWVkZWQgYXMgYSBwZXJmb3JtYW5jZVxuICAgICAgICAgICAgICAgIC8vIG9wdGltaXphdGlvbiwgc2luY2UgdGhleSBhcmUgb25seSByZXF1aXJlZCBmb3IgbXVsdGlwbGVcbiAgICAgICAgICAgICAgICAvLyBub24tY29udGlndW91cyBjaGFuZ2VzIGluIHRoZSBsaXN0LCB3aGljaCBhcmUgbGVzcyBjb21tb24uXG4gICAgICAgICAgICAgICAgbGV0IG5ld0tleVRvSW5kZXhNYXAhOiBNYXA8dW5rbm93biwgbnVtYmVyPjtcbiAgICAgICAgICAgICAgICBsZXQgb2xkS2V5VG9JbmRleE1hcCE6IE1hcDx1bmtub3duLCBudW1iZXI+O1xuXG4gICAgICAgICAgICAgICAgLy8gSGVhZCBhbmQgdGFpbCBwb2ludGVycyB0byBvbGQgcGFydHMgYW5kIG5ldyB2YWx1ZXNcbiAgICAgICAgICAgICAgICBsZXQgb2xkSGVhZCA9IDA7XG4gICAgICAgICAgICAgICAgbGV0IG9sZFRhaWwgPSBvbGRQYXJ0cy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgIGxldCBuZXdIZWFkID0gMDtcbiAgICAgICAgICAgICAgICBsZXQgbmV3VGFpbCA9IG5ld1ZhbHVlcy5sZW5ndGggLSAxO1xuXG4gICAgICAgICAgICAgICAgLy8gT3ZlcnZpZXcgb2YgTyhuKSByZWNvbmNpbGlhdGlvbiBhbGdvcml0aG0gKGdlbmVyYWwgYXBwcm9hY2hcbiAgICAgICAgICAgICAgICAvLyBiYXNlZCBvbiBpZGVhcyBmb3VuZCBpbiBpdmksIHZ1ZSwgc25hYmJkb20sIGV0Yy4pOlxuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gKiBXZSBzdGFydCB3aXRoIHRoZSBsaXN0IG9mIG9sZCBwYXJ0cyBhbmQgbmV3IHZhbHVlcyAoYW5kXG4gICAgICAgICAgICAgICAgLy8gICBhcnJheXMgb2YgdGhlaXIgcmVzcGVjdGl2ZSBrZXlzKSwgaGVhZC90YWlsIHBvaW50ZXJzIGludG9cbiAgICAgICAgICAgICAgICAvLyAgIGVhY2gsIGFuZCB3ZSBidWlsZCB1cCB0aGUgbmV3IGxpc3Qgb2YgcGFydHMgYnkgdXBkYXRpbmdcbiAgICAgICAgICAgICAgICAvLyAgIChhbmQgd2hlbiBuZWVkZWQsIG1vdmluZykgb2xkIHBhcnRzIG9yIGNyZWF0aW5nIG5ldyBvbmVzLlxuICAgICAgICAgICAgICAgIC8vICAgVGhlIGluaXRpYWwgc2NlbmFyaW8gbWlnaHQgbG9vayBsaWtlIHRoaXMgKGZvciBicmV2aXR5IG9mXG4gICAgICAgICAgICAgICAgLy8gICB0aGUgZGlhZ3JhbXMsIHRoZSBudW1iZXJzIGluIHRoZSBhcnJheSByZWZsZWN0IGtleXNcbiAgICAgICAgICAgICAgICAvLyAgIGFzc29jaWF0ZWQgd2l0aCB0aGUgb2xkIHBhcnRzIG9yIG5ldyB2YWx1ZXMsIGFsdGhvdWdoIGtleXNcbiAgICAgICAgICAgICAgICAvLyAgIGFuZCBwYXJ0cy92YWx1ZXMgYXJlIGFjdHVhbGx5IHN0b3JlZCBpbiBwYXJhbGxlbCBhcnJheXNcbiAgICAgICAgICAgICAgICAvLyAgIGluZGV4ZWQgdXNpbmcgdGhlIHNhbWUgaGVhZC90YWlsIHBvaW50ZXJzKTpcbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICAgICAgb2xkSGVhZCB2ICAgICAgICAgICAgICAgICB2IG9sZFRhaWxcbiAgICAgICAgICAgICAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgMiwgMywgNCwgNSwgNl1cbiAgICAgICAgICAgICAgICAvLyAgIG5ld1BhcnRzOiBbICwgICwgICwgICwgICwgICwgIF1cbiAgICAgICAgICAgICAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gPC0gcmVmbGVjdHMgdGhlIHVzZXIncyBuZXdcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSBvcmRlclxuICAgICAgICAgICAgICAgIC8vICAgICAgbmV3SGVhZCBeICAgICAgICAgICAgICAgICBeIG5ld1RhaWxcbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICogSXRlcmF0ZSBvbGQgJiBuZXcgbGlzdHMgZnJvbSBib3RoIHNpZGVzLCB1cGRhdGluZyxcbiAgICAgICAgICAgICAgICAvLyAgIHN3YXBwaW5nLCBvciByZW1vdmluZyBwYXJ0cyBhdCB0aGUgaGVhZC90YWlsIGxvY2F0aW9uc1xuICAgICAgICAgICAgICAgIC8vICAgdW50aWwgbmVpdGhlciBoZWFkIG5vciB0YWlsIGNhbiBtb3ZlLlxuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gKiBFeGFtcGxlIGJlbG93OiBrZXlzIGF0IGhlYWQgcG9pbnRlcnMgbWF0Y2gsIHNvIHVwZGF0ZSBvbGRcbiAgICAgICAgICAgICAgICAvLyAgIHBhcnQgMCBpbi1wbGFjZSAobm8gbmVlZCB0byBtb3ZlIGl0KSBhbmQgcmVjb3JkIHBhcnQgMCBpblxuICAgICAgICAgICAgICAgIC8vICAgdGhlIGBuZXdQYXJ0c2AgbGlzdC4gVGhlIGxhc3QgdGhpbmcgd2UgZG8gaXMgYWR2YW5jZSB0aGVcbiAgICAgICAgICAgICAgICAvLyAgIGBvbGRIZWFkYCBhbmQgYG5ld0hlYWRgIHBvaW50ZXJzICh3aWxsIGJlIHJlZmxlY3RlZCBpbiB0aGVcbiAgICAgICAgICAgICAgICAvLyAgIG5leHQgZGlhZ3JhbSkuXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAgICAgIG9sZEhlYWQgdiAgICAgICAgICAgICAgICAgdiBvbGRUYWlsXG4gICAgICAgICAgICAgICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIDIsIDMsIDQsIDUsIDZdXG4gICAgICAgICAgICAgICAgLy8gICBuZXdQYXJ0czogWzAsICAsICAsICAsICAsICAsICBdIDwtIGhlYWRzIG1hdGNoZWQ6IHVwZGF0ZSAwXG4gICAgICAgICAgICAgICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdICAgIGFuZCBhZHZhbmNlIGJvdGggb2xkSGVhZFxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmIG5ld0hlYWRcbiAgICAgICAgICAgICAgICAvLyAgICAgIG5ld0hlYWQgXiAgICAgICAgICAgICAgICAgXiBuZXdUYWlsXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IGhlYWQgcG9pbnRlcnMgZG9uJ3QgbWF0Y2gsIGJ1dCB0YWlsXG4gICAgICAgICAgICAgICAgLy8gICBwb2ludGVycyBkbywgc28gdXBkYXRlIHBhcnQgNiBpbiBwbGFjZSAobm8gbmVlZCB0byBtb3ZlXG4gICAgICAgICAgICAgICAgLy8gICBpdCksIGFuZCByZWNvcmQgcGFydCA2IGluIHRoZSBgbmV3UGFydHNgIGxpc3QuIExhc3QsXG4gICAgICAgICAgICAgICAgLy8gICBhZHZhbmNlIHRoZSBgb2xkVGFpbGAgYW5kIGBvbGRIZWFkYCBwb2ludGVycy5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgb2xkSGVhZCB2ICAgICAgICAgICAgICB2IG9sZFRhaWxcbiAgICAgICAgICAgICAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgMiwgMywgNCwgNSwgNl1cbiAgICAgICAgICAgICAgICAvLyAgIG5ld1BhcnRzOiBbMCwgICwgICwgICwgICwgICwgNl0gPC0gdGFpbHMgbWF0Y2hlZDogdXBkYXRlIDZcbiAgICAgICAgICAgICAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICAgYW5kIGFkdmFuY2UgYm90aCBvbGRUYWlsXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICYgbmV3VGFpbFxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgbmV3SGVhZCBeICAgICAgICAgICAgICBeIG5ld1RhaWxcbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICogSWYgbmVpdGhlciBoZWFkIG5vciB0YWlsIG1hdGNoOyBuZXh0IGNoZWNrIGlmIG9uZSBvZiB0aGVcbiAgICAgICAgICAgICAgICAvLyAgIG9sZCBoZWFkL3RhaWwgaXRlbXMgd2FzIHJlbW92ZWQuIFdlIGZpcnN0IG5lZWQgdG8gZ2VuZXJhdGVcbiAgICAgICAgICAgICAgICAvLyAgIHRoZSByZXZlcnNlIG1hcCBvZiBuZXcga2V5cyB0byBpbmRleCAoYG5ld0tleVRvSW5kZXhNYXBgKSxcbiAgICAgICAgICAgICAgICAvLyAgIHdoaWNoIGlzIGRvbmUgb25jZSBsYXppbHkgYXMgYSBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb24sXG4gICAgICAgICAgICAgICAgLy8gICBzaW5jZSB3ZSBvbmx5IGhpdCB0aGlzIGNhc2UgaWYgbXVsdGlwbGUgbm9uLWNvbnRpZ3VvdXNcbiAgICAgICAgICAgICAgICAvLyAgIGNoYW5nZXMgd2VyZSBtYWRlLiBOb3RlIHRoYXQgZm9yIGNvbnRpZ3VvdXMgcmVtb3ZhbFxuICAgICAgICAgICAgICAgIC8vICAgYW55d2hlcmUgaW4gdGhlIGxpc3QsIHRoZSBoZWFkIGFuZCB0YWlscyB3b3VsZCBhZHZhbmNlXG4gICAgICAgICAgICAgICAgLy8gICBmcm9tIGVpdGhlciBlbmQgYW5kIHBhc3MgZWFjaCBvdGhlciBiZWZvcmUgd2UgZ2V0IHRvIHRoaXNcbiAgICAgICAgICAgICAgICAvLyAgIGNhc2UgYW5kIHJlbW92YWxzIHdvdWxkIGJlIGhhbmRsZWQgaW4gdGhlIGZpbmFsIHdoaWxlIGxvb3BcbiAgICAgICAgICAgICAgICAvLyAgIHdpdGhvdXQgbmVlZGluZyB0byBnZW5lcmF0ZSB0aGUgbWFwLlxuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gKiBFeGFtcGxlIGJlbG93OiBUaGUga2V5IGF0IGBvbGRUYWlsYCB3YXMgcmVtb3ZlZCAobm8gbG9uZ2VyXG4gICAgICAgICAgICAgICAgLy8gICBpbiB0aGUgYG5ld0tleVRvSW5kZXhNYXBgKSwgc28gcmVtb3ZlIHRoYXQgcGFydCBmcm9tIHRoZVxuICAgICAgICAgICAgICAgIC8vICAgRE9NIGFuZCBhZHZhbmNlIGp1c3QgdGhlIGBvbGRUYWlsYCBwb2ludGVyLlxuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBvbGRIZWFkIHYgICAgICAgICAgIHYgb2xkVGFpbFxuICAgICAgICAgICAgICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAyLCAzLCA0LCA1LCA2XVxuICAgICAgICAgICAgICAgIC8vICAgbmV3UGFydHM6IFswLCAgLCAgLCAgLCAgLCAgLCA2XSA8LSA1IG5vdCBpbiBuZXcgbWFwOiByZW1vdmVcbiAgICAgICAgICAgICAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICAgNSBhbmQgYWR2YW5jZSBvbGRUYWlsXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICBuZXdIZWFkIF4gICAgICAgICAgIF4gbmV3VGFpbFxuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gKiBPbmNlIGhlYWQgYW5kIHRhaWwgY2Fubm90IG1vdmUsIGFueSBtaXNtYXRjaGVzIGFyZSBkdWUgdG9cbiAgICAgICAgICAgICAgICAvLyAgIGVpdGhlciBuZXcgb3IgbW92ZWQgaXRlbXM7IGlmIGEgbmV3IGtleSBpcyBpbiB0aGUgcHJldmlvdXNcbiAgICAgICAgICAgICAgICAvLyAgIFwib2xkIGtleSB0byBvbGQgaW5kZXhcIiBtYXAsIG1vdmUgdGhlIG9sZCBwYXJ0IHRvIHRoZSBuZXdcbiAgICAgICAgICAgICAgICAvLyAgIGxvY2F0aW9uLCBvdGhlcndpc2UgY3JlYXRlIGFuZCBpbnNlcnQgYSBuZXcgcGFydC4gTm90ZVxuICAgICAgICAgICAgICAgIC8vICAgdGhhdCB3aGVuIG1vdmluZyBhbiBvbGQgcGFydCB3ZSBudWxsIGl0cyBwb3NpdGlvbiBpbiB0aGVcbiAgICAgICAgICAgICAgICAvLyAgIG9sZFBhcnRzIGFycmF5IGlmIGl0IGxpZXMgYmV0d2VlbiB0aGUgaGVhZCBhbmQgdGFpbCBzbyB3ZVxuICAgICAgICAgICAgICAgIC8vICAga25vdyB0byBza2lwIGl0IHdoZW4gdGhlIHBvaW50ZXJzIGdldCB0aGVyZS5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICogRXhhbXBsZSBiZWxvdzogbmVpdGhlciBoZWFkIG5vciB0YWlsIG1hdGNoLCBhbmQgbmVpdGhlclxuICAgICAgICAgICAgICAgIC8vICAgd2VyZSByZW1vdmVkOyBzbyBmaW5kIHRoZSBgbmV3SGVhZGAga2V5IGluIHRoZVxuICAgICAgICAgICAgICAgIC8vICAgYG9sZEtleVRvSW5kZXhNYXBgLCBhbmQgbW92ZSB0aGF0IG9sZCBwYXJ0J3MgRE9NIGludG8gdGhlXG4gICAgICAgICAgICAgICAgLy8gICBuZXh0IGhlYWQgcG9zaXRpb24gKGJlZm9yZSBgb2xkUGFydHNbb2xkSGVhZF1gKS4gTGFzdCxcbiAgICAgICAgICAgICAgICAvLyAgIG51bGwgdGhlIHBhcnQgaW4gdGhlIGBvbGRQYXJ0YCBhcnJheSBzaW5jZSBpdCB3YXNcbiAgICAgICAgICAgICAgICAvLyAgIHNvbWV3aGVyZSBpbiB0aGUgcmVtYWluaW5nIG9sZFBhcnRzIHN0aWxsIHRvIGJlIHNjYW5uZWRcbiAgICAgICAgICAgICAgICAvLyAgIChiZXR3ZWVuIHRoZSBoZWFkIGFuZCB0YWlsIHBvaW50ZXJzKSBzbyB0aGF0IHdlIGtub3cgdG9cbiAgICAgICAgICAgICAgICAvLyAgIHNraXAgdGhhdCBvbGQgcGFydCBvbiBmdXR1cmUgaXRlcmF0aW9ucy5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgb2xkSGVhZCB2ICAgICAgICB2IG9sZFRhaWxcbiAgICAgICAgICAgICAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgLSwgMywgNCwgNSwgNl1cbiAgICAgICAgICAgICAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgICwgICwgICwgICwgNl0gPC0gc3R1Y2s6IHVwZGF0ZSAmIG1vdmUgMlxuICAgICAgICAgICAgICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XSAgICBpbnRvIHBsYWNlIGFuZCBhZHZhbmNlXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0hlYWRcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgIG5ld0hlYWQgXiAgICAgICAgICAgXiBuZXdUYWlsXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAqIE5vdGUgdGhhdCBmb3IgbW92ZXMvaW5zZXJ0aW9ucyBsaWtlIHRoZSBvbmUgYWJvdmUsIGEgcGFydFxuICAgICAgICAgICAgICAgIC8vICAgaW5zZXJ0ZWQgYXQgdGhlIGhlYWQgcG9pbnRlciBpcyBpbnNlcnRlZCBiZWZvcmUgdGhlXG4gICAgICAgICAgICAgICAgLy8gICBjdXJyZW50IGBvbGRQYXJ0c1tvbGRIZWFkXWAsIGFuZCBhIHBhcnQgaW5zZXJ0ZWQgYXQgdGhlXG4gICAgICAgICAgICAgICAgLy8gICB0YWlsIHBvaW50ZXIgaXMgaW5zZXJ0ZWQgYmVmb3JlIGBuZXdQYXJ0c1tuZXdUYWlsKzFdYC4gVGhlXG4gICAgICAgICAgICAgICAgLy8gICBzZWVtaW5nIGFzeW1tZXRyeSBsaWVzIGluIHRoZSBmYWN0IHRoYXQgbmV3IHBhcnRzIGFyZVxuICAgICAgICAgICAgICAgIC8vICAgbW92ZWQgaW50byBwbGFjZSBvdXRzaWRlIGluLCBzbyB0byB0aGUgcmlnaHQgb2YgdGhlIGhlYWRcbiAgICAgICAgICAgICAgICAvLyAgIHBvaW50ZXIgYXJlIG9sZCBwYXJ0cywgYW5kIHRvIHRoZSByaWdodCBvZiB0aGUgdGFpbFxuICAgICAgICAgICAgICAgIC8vICAgcG9pbnRlciBhcmUgbmV3IHBhcnRzLlxuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gKiBXZSBhbHdheXMgcmVzdGFydCBiYWNrIGZyb20gdGhlIHRvcCBvZiB0aGUgYWxnb3JpdGhtLFxuICAgICAgICAgICAgICAgIC8vICAgYWxsb3dpbmcgbWF0Y2hpbmcgYW5kIHNpbXBsZSB1cGRhdGVzIGluIHBsYWNlIHRvXG4gICAgICAgICAgICAgICAgLy8gICBjb250aW51ZS4uLlxuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gKiBFeGFtcGxlIGJlbG93OiB0aGUgaGVhZCBwb2ludGVycyBvbmNlIGFnYWluIG1hdGNoLCBzb1xuICAgICAgICAgICAgICAgIC8vICAgc2ltcGx5IHVwZGF0ZSBwYXJ0IDEgYW5kIHJlY29yZCBpdCBpbiB0aGUgYG5ld1BhcnRzYFxuICAgICAgICAgICAgICAgIC8vICAgYXJyYXkuICBMYXN0LCBhZHZhbmNlIGJvdGggaGVhZCBwb2ludGVycy5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgb2xkSGVhZCB2ICAgICAgICB2IG9sZFRhaWxcbiAgICAgICAgICAgICAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgLSwgMywgNCwgNSwgNl1cbiAgICAgICAgICAgICAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgMSwgICwgICwgICwgNl0gPC0gaGVhZHMgbWF0Y2hlZDogdXBkYXRlIDFcbiAgICAgICAgICAgICAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICAgYW5kIGFkdmFuY2UgYm90aCBvbGRIZWFkXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICYgbmV3SGVhZFxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgbmV3SGVhZCBeICAgICAgICBeIG5ld1RhaWxcbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICogQXMgbWVudGlvbmVkIGFib3ZlLCBpdGVtcyB0aGF0IHdlcmUgbW92ZWQgYXMgYSByZXN1bHQgb2ZcbiAgICAgICAgICAgICAgICAvLyAgIGJlaW5nIHN0dWNrICh0aGUgZmluYWwgZWxzZSBjbGF1c2UgaW4gdGhlIGNvZGUgYmVsb3cpIGFyZVxuICAgICAgICAgICAgICAgIC8vICAgbWFya2VkIHdpdGggbnVsbCwgc28gd2UgYWx3YXlzIGFkdmFuY2Ugb2xkIHBvaW50ZXJzIG92ZXJcbiAgICAgICAgICAgICAgICAvLyAgIHRoZXNlIHNvIHdlJ3JlIGNvbXBhcmluZyB0aGUgbmV4dCBhY3R1YWwgb2xkIHZhbHVlIG9uXG4gICAgICAgICAgICAgICAgLy8gICBlaXRoZXIgZW5kLlxuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gKiBFeGFtcGxlIGJlbG93OiBgb2xkSGVhZGAgaXMgbnVsbCAoYWxyZWFkeSBwbGFjZWQgaW5cbiAgICAgICAgICAgICAgICAvLyAgIG5ld1BhcnRzKSwgc28gYWR2YW5jZSBgb2xkSGVhZGAuXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgIG9sZEhlYWQgdiAgICAgdiBvbGRUYWlsXG4gICAgICAgICAgICAgICAgLy8gICBvbGRLZXlzOiAgWzAsIDEsIC0sIDMsIDQsIDUsIDZdIDwtIG9sZCBoZWFkIGFscmVhZHkgdXNlZDpcbiAgICAgICAgICAgICAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgMSwgICwgICwgICwgNl0gICAgYWR2YW5jZSBvbGRIZWFkXG4gICAgICAgICAgICAgICAgLy8gICBuZXdLZXlzOiAgWzAsIDIsIDEsIDQsIDMsIDcsIDZdXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgICBuZXdIZWFkIF4gICAgIF4gbmV3VGFpbFxuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gKiBOb3RlIGl0J3Mgbm90IGNyaXRpY2FsIHRvIG1hcmsgb2xkIHBhcnRzIGFzIG51bGwgd2hlbiB0aGV5XG4gICAgICAgICAgICAgICAgLy8gICBhcmUgbW92ZWQgZnJvbSBoZWFkIHRvIHRhaWwgb3IgdGFpbCB0byBoZWFkLCBzaW5jZSB0aGV5XG4gICAgICAgICAgICAgICAgLy8gICB3aWxsIGJlIG91dHNpZGUgdGhlIHBvaW50ZXIgcmFuZ2UgYW5kIG5ldmVyIHZpc2l0ZWQgYWdhaW4uXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IEhlcmUgdGhlIG9sZCB0YWlsIGtleSBtYXRjaGVzIHRoZSBuZXcgaGVhZFxuICAgICAgICAgICAgICAgIC8vICAga2V5LCBzbyB0aGUgcGFydCBhdCB0aGUgYG9sZFRhaWxgIHBvc2l0aW9uIGFuZCBtb3ZlIGl0c1xuICAgICAgICAgICAgICAgIC8vICAgRE9NIHRvIHRoZSBuZXcgaGVhZCBwb3NpdGlvbiAoYmVmb3JlIGBvbGRQYXJ0c1tvbGRIZWFkXWApLlxuICAgICAgICAgICAgICAgIC8vICAgTGFzdCwgYWR2YW5jZSBgb2xkVGFpbGAgYW5kIGBuZXdIZWFkYCBwb2ludGVycy5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgb2xkSGVhZCB2ICB2IG9sZFRhaWxcbiAgICAgICAgICAgICAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgLSwgMywgNCwgNSwgNl1cbiAgICAgICAgICAgICAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgMSwgNCwgICwgICwgNl0gPC0gb2xkIHRhaWwgbWF0Y2hlcyBuZXdcbiAgICAgICAgICAgICAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICBoZWFkOiB1cGRhdGUgJiBtb3ZlIDQsXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWR2YW5jZSBvbGRUYWlsICYgbmV3SGVhZFxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgbmV3SGVhZCBeICAgICBeIG5ld1RhaWxcbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICogRXhhbXBsZSBiZWxvdzogT2xkIGFuZCBuZXcgaGVhZCBrZXlzIG1hdGNoLCBzbyB1cGRhdGUgdGhlXG4gICAgICAgICAgICAgICAgLy8gICBvbGQgaGVhZCBwYXJ0IGluIHBsYWNlLCBhbmQgYWR2YW5jZSB0aGUgYG9sZEhlYWRgIGFuZFxuICAgICAgICAgICAgICAgIC8vICAgYG5ld0hlYWRgIHBvaW50ZXJzLlxuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgICBvbGRIZWFkIHYgb2xkVGFpbFxuICAgICAgICAgICAgICAgIC8vICAgb2xkS2V5czogIFswLCAxLCAtLCAzLCA0LCA1LCA2XVxuICAgICAgICAgICAgICAgIC8vICAgbmV3UGFydHM6IFswLCAyLCAxLCA0LCAzLCAgICw2XSA8LSBoZWFkcyBtYXRjaDogdXBkYXRlIDNcbiAgICAgICAgICAgICAgICAvLyAgIG5ld0tleXM6ICBbMCwgMiwgMSwgNCwgMywgNywgNl0gICAgYW5kIGFkdmFuY2Ugb2xkSGVhZCAmXG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0hlYWRcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgIG5ld0hlYWQgXiAgXiBuZXdUYWlsXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAqIE9uY2UgdGhlIG5ldyBvciBvbGQgcG9pbnRlcnMgbW92ZSBwYXN0IGVhY2ggb3RoZXIgdGhlbiBhbGxcbiAgICAgICAgICAgICAgICAvLyAgIHdlIGhhdmUgbGVmdCBpcyBhZGRpdGlvbnMgKGlmIG9sZCBsaXN0IGV4aGF1c3RlZCkgb3JcbiAgICAgICAgICAgICAgICAvLyAgIHJlbW92YWxzIChpZiBuZXcgbGlzdCBleGhhdXN0ZWQpLiBUaG9zZSBhcmUgaGFuZGxlZCBpbiB0aGVcbiAgICAgICAgICAgICAgICAvLyAgIGZpbmFsIHdoaWxlIGxvb3BzIGF0IHRoZSBlbmQuXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAqIEV4YW1wbGUgYmVsb3c6IGBvbGRIZWFkYCBleGNlZWRlZCBgb2xkVGFpbGAsIHNvIHdlJ3JlIGRvbmVcbiAgICAgICAgICAgICAgICAvLyAgIHdpdGggdGhlIG1haW4gbG9vcC4gIENyZWF0ZSB0aGUgcmVtYWluaW5nIHBhcnQgYW5kIGluc2VydFxuICAgICAgICAgICAgICAgIC8vICAgaXQgYXQgdGhlIG5ldyBoZWFkIHBvc2l0aW9uLCBhbmQgdGhlIHVwZGF0ZSBpcyBjb21wbGV0ZS5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgIChvbGRIZWFkID4gb2xkVGFpbClcbiAgICAgICAgICAgICAgICAvLyAgIG9sZEtleXM6ICBbMCwgMSwgLSwgMywgNCwgNSwgNl1cbiAgICAgICAgICAgICAgICAvLyAgIG5ld1BhcnRzOiBbMCwgMiwgMSwgNCwgMywgNyAsNl0gPC0gY3JlYXRlIGFuZCBpbnNlcnQgN1xuICAgICAgICAgICAgICAgIC8vICAgbmV3S2V5czogIFswLCAyLCAxLCA0LCAzLCA3LCA2XVxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgbmV3SGVhZCBeIG5ld1RhaWxcbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICogTm90ZSB0aGF0IHRoZSBvcmRlciBvZiB0aGUgaWYvZWxzZSBjbGF1c2VzIGlzIG5vdFxuICAgICAgICAgICAgICAgIC8vICAgaW1wb3J0YW50IHRvIHRoZSBhbGdvcml0aG0sIGFzIGxvbmcgYXMgdGhlIG51bGwgY2hlY2tzXG4gICAgICAgICAgICAgICAgLy8gICBjb21lIGZpcnN0ICh0byBlbnN1cmUgd2UncmUgYWx3YXlzIHdvcmtpbmcgb24gdmFsaWQgb2xkXG4gICAgICAgICAgICAgICAgLy8gICBwYXJ0cykgYW5kIHRoYXQgdGhlIGZpbmFsIGVsc2UgY2xhdXNlIGNvbWVzIGxhc3QgKHNpbmNlXG4gICAgICAgICAgICAgICAgLy8gICB0aGF0J3Mgd2hlcmUgdGhlIGV4cGVuc2l2ZSBtb3ZlcyBvY2N1cikuIFRoZSBvcmRlciBvZlxuICAgICAgICAgICAgICAgIC8vICAgcmVtYWluaW5nIGNsYXVzZXMgaXMgaXMganVzdCBhIHNpbXBsZSBndWVzcyBhdCB3aGljaCBjYXNlc1xuICAgICAgICAgICAgICAgIC8vICAgd2lsbCBiZSBtb3N0IGNvbW1vbi5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vICogVE9ETyhrc2NoYWFmKSBOb3RlLCB3ZSBjb3VsZCBjYWxjdWxhdGUgdGhlIGxvbmdlc3RcbiAgICAgICAgICAgICAgICAvLyAgIGluY3JlYXNpbmcgc3Vic2VxdWVuY2UgKExJUykgb2Ygb2xkIGl0ZW1zIGluIG5ldyBwb3NpdGlvbixcbiAgICAgICAgICAgICAgICAvLyAgIGFuZCBvbmx5IG1vdmUgdGhvc2Ugbm90IGluIHRoZSBMSVMgc2V0LiBIb3dldmVyIHRoYXQgY29zdHNcbiAgICAgICAgICAgICAgICAvLyAgIE8obmxvZ24pIHRpbWUgYW5kIGFkZHMgYSBiaXQgbW9yZSBjb2RlLCBhbmQgb25seSBoZWxwc1xuICAgICAgICAgICAgICAgIC8vICAgbWFrZSByYXJlIHR5cGVzIG9mIG11dGF0aW9ucyByZXF1aXJlIGZld2VyIG1vdmVzLiBUaGVcbiAgICAgICAgICAgICAgICAvLyAgIGFib3ZlIGhhbmRsZXMgcmVtb3ZlcywgYWRkcywgcmV2ZXJzYWwsIHN3YXBzLCBhbmQgc2luZ2xlXG4gICAgICAgICAgICAgICAgLy8gICBtb3ZlcyBvZiBjb250aWd1b3VzIGl0ZW1zIGluIGxpbmVhciB0aW1lLCBpbiB0aGUgbWluaW11bVxuICAgICAgICAgICAgICAgIC8vICAgbnVtYmVyIG9mIG1vdmVzLiBBcyB0aGUgbnVtYmVyIG9mIG11bHRpcGxlIG1vdmVzIHdoZXJlIExJU1xuICAgICAgICAgICAgICAgIC8vICAgbWlnaHQgaGVscCBhcHByb2FjaGVzIGEgcmFuZG9tIHNodWZmbGUsIHRoZSBMSVNcbiAgICAgICAgICAgICAgICAvLyAgIG9wdGltaXphdGlvbiBiZWNvbWVzIGxlc3MgaGVscGZ1bCwgc28gaXQgc2VlbXMgbm90IHdvcnRoXG4gICAgICAgICAgICAgICAgLy8gICB0aGUgY29kZSBhdCB0aGlzIHBvaW50LiBDb3VsZCByZWNvbnNpZGVyIGlmIGEgY29tcGVsbGluZ1xuICAgICAgICAgICAgICAgIC8vICAgY2FzZSBhcmlzZXMuXG5cbiAgICAgICAgICAgICAgICB3aGlsZSAob2xkSGVhZCA8PSBvbGRUYWlsICYmIG5ld0hlYWQgPD0gbmV3VGFpbCkge1xuICAgICAgICAgICAgICAgICAgaWYgKG9sZFBhcnRzW29sZEhlYWRdID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGBudWxsYCBtZWFucyBvbGQgcGFydCBhdCBoZWFkIGhhcyBhbHJlYWR5IGJlZW4gdXNlZFxuICAgICAgICAgICAgICAgICAgICAvLyBiZWxvdzsgc2tpcFxuICAgICAgICAgICAgICAgICAgICBvbGRIZWFkKys7XG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9sZFBhcnRzW29sZFRhaWxdID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGBudWxsYCBtZWFucyBvbGQgcGFydCBhdCB0YWlsIGhhcyBhbHJlYWR5IGJlZW4gdXNlZFxuICAgICAgICAgICAgICAgICAgICAvLyBiZWxvdzsgc2tpcFxuICAgICAgICAgICAgICAgICAgICBvbGRUYWlsLS07XG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG9sZEtleXNbb2xkSGVhZF0gPT09IG5ld0tleXNbbmV3SGVhZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gT2xkIGhlYWQgbWF0Y2hlcyBuZXcgaGVhZDsgdXBkYXRlIGluIHBsYWNlXG4gICAgICAgICAgICAgICAgICAgIG5ld1BhcnRzW25ld0hlYWRdID1cbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVBhcnQob2xkUGFydHNbb2xkSGVhZF0hLCBuZXdWYWx1ZXNbbmV3SGVhZF0pO1xuICAgICAgICAgICAgICAgICAgICBvbGRIZWFkKys7XG4gICAgICAgICAgICAgICAgICAgIG5ld0hlYWQrKztcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob2xkS2V5c1tvbGRUYWlsXSA9PT0gbmV3S2V5c1tuZXdUYWlsXSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBPbGQgdGFpbCBtYXRjaGVzIG5ldyB0YWlsOyB1cGRhdGUgaW4gcGxhY2VcbiAgICAgICAgICAgICAgICAgICAgbmV3UGFydHNbbmV3VGFpbF0gPVxuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlUGFydChvbGRQYXJ0c1tvbGRUYWlsXSEsIG5ld1ZhbHVlc1tuZXdUYWlsXSk7XG4gICAgICAgICAgICAgICAgICAgIG9sZFRhaWwtLTtcbiAgICAgICAgICAgICAgICAgICAgbmV3VGFpbC0tO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvbGRLZXlzW29sZEhlYWRdID09PSBuZXdLZXlzW25ld1RhaWxdKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9sZCBoZWFkIG1hdGNoZXMgbmV3IHRhaWw7IHVwZGF0ZSBhbmQgbW92ZSB0byBuZXcgdGFpbFxuICAgICAgICAgICAgICAgICAgICBuZXdQYXJ0c1tuZXdUYWlsXSA9XG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVQYXJ0KG9sZFBhcnRzW29sZEhlYWRdISwgbmV3VmFsdWVzW25ld1RhaWxdKTtcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0UGFydEJlZm9yZShcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclBhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICBvbGRQYXJ0c1tvbGRIZWFkXSEsXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdQYXJ0c1tuZXdUYWlsICsgMV0pO1xuICAgICAgICAgICAgICAgICAgICBvbGRIZWFkKys7XG4gICAgICAgICAgICAgICAgICAgIG5ld1RhaWwtLTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob2xkS2V5c1tvbGRUYWlsXSA9PT0gbmV3S2V5c1tuZXdIZWFkXSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBPbGQgdGFpbCBtYXRjaGVzIG5ldyBoZWFkOyB1cGRhdGUgYW5kIG1vdmUgdG8gbmV3IGhlYWRcbiAgICAgICAgICAgICAgICAgICAgbmV3UGFydHNbbmV3SGVhZF0gPVxuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlUGFydChvbGRQYXJ0c1tvbGRUYWlsXSEsIG5ld1ZhbHVlc1tuZXdIZWFkXSk7XG4gICAgICAgICAgICAgICAgICAgIGluc2VydFBhcnRCZWZvcmUoXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJQYXJ0LCBvbGRQYXJ0c1tvbGRUYWlsXSEsIG9sZFBhcnRzW29sZEhlYWRdISk7XG4gICAgICAgICAgICAgICAgICAgIG9sZFRhaWwtLTtcbiAgICAgICAgICAgICAgICAgICAgbmV3SGVhZCsrO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0tleVRvSW5kZXhNYXAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIExhemlseSBnZW5lcmF0ZSBrZXktdG8taW5kZXggbWFwcywgdXNlZCBmb3IgcmVtb3ZhbHMgJlxuICAgICAgICAgICAgICAgICAgICAgIC8vIG1vdmVzIGJlbG93XG4gICAgICAgICAgICAgICAgICAgICAgbmV3S2V5VG9JbmRleE1hcCA9IGdlbmVyYXRlTWFwKG5ld0tleXMsIG5ld0hlYWQsIG5ld1RhaWwpO1xuICAgICAgICAgICAgICAgICAgICAgIG9sZEtleVRvSW5kZXhNYXAgPSBnZW5lcmF0ZU1hcChvbGRLZXlzLCBvbGRIZWFkLCBvbGRUYWlsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoIW5ld0tleVRvSW5kZXhNYXAuaGFzKG9sZEtleXNbb2xkSGVhZF0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gT2xkIGhlYWQgaXMgbm8gbG9uZ2VyIGluIG5ldyBsaXN0OyByZW1vdmVcbiAgICAgICAgICAgICAgICAgICAgICByZW1vdmVQYXJ0KG9sZFBhcnRzW29sZEhlYWRdISk7XG4gICAgICAgICAgICAgICAgICAgICAgb2xkSGVhZCsrO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFuZXdLZXlUb0luZGV4TWFwLmhhcyhvbGRLZXlzW29sZFRhaWxdKSkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIE9sZCB0YWlsIGlzIG5vIGxvbmdlciBpbiBuZXcgbGlzdDsgcmVtb3ZlXG4gICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlUGFydChvbGRQYXJ0c1tvbGRUYWlsXSEpO1xuICAgICAgICAgICAgICAgICAgICAgIG9sZFRhaWwtLTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBBbnkgbWlzbWF0Y2hlcyBhdCB0aGlzIHBvaW50IGFyZSBkdWUgdG8gYWRkaXRpb25zIG9yXG4gICAgICAgICAgICAgICAgICAgICAgLy8gbW92ZXM7IHNlZSBpZiB3ZSBoYXZlIGFuIG9sZCBwYXJ0IHdlIGNhbiByZXVzZSBhbmQgbW92ZVxuICAgICAgICAgICAgICAgICAgICAgIC8vIGludG8gcGxhY2VcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvbGRJbmRleCA9IG9sZEtleVRvSW5kZXhNYXAuZ2V0KG5ld0tleXNbbmV3SGVhZF0pO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG9sZFBhcnQgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRJbmRleCAhPT0gdW5kZWZpbmVkID8gb2xkUGFydHNbb2xkSW5kZXhdIDogbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAob2xkUGFydCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm8gb2xkIHBhcnQgZm9yIHRoaXMgdmFsdWU7IGNyZWF0ZSBhIG5ldyBvbmUgYW5kXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpbnNlcnQgaXRcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1BhcnQgPSBjcmVhdGVBbmRJbnNlcnRQYXJ0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lclBhcnQsIG9sZFBhcnRzW29sZEhlYWRdISk7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVQYXJ0KG5ld1BhcnQsIG5ld1ZhbHVlc1tuZXdIZWFkXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdQYXJ0c1tuZXdIZWFkXSA9IG5ld1BhcnQ7XG4gICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJldXNlIG9sZCBwYXJ0XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdQYXJ0c1tuZXdIZWFkXSA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlUGFydChvbGRQYXJ0LCBuZXdWYWx1ZXNbbmV3SGVhZF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5zZXJ0UGFydEJlZm9yZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJQYXJ0LCBvbGRQYXJ0LCBvbGRQYXJ0c1tvbGRIZWFkXSEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBtYXJrcyB0aGUgb2xkIHBhcnQgYXMgaGF2aW5nIGJlZW4gdXNlZCwgc28gdGhhdFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaXQgd2lsbCBiZSBza2lwcGVkIGluIHRoZSBmaXJzdCB0d28gY2hlY2tzIGFib3ZlXG4gICAgICAgICAgICAgICAgICAgICAgICBvbGRQYXJ0c1tvbGRJbmRleCBhcyBudW1iZXJdID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgbmV3SGVhZCsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIEFkZCBwYXJ0cyBmb3IgYW55IHJlbWFpbmluZyBuZXcgdmFsdWVzXG4gICAgICAgICAgICAgICAgd2hpbGUgKG5ld0hlYWQgPD0gbmV3VGFpbCkge1xuICAgICAgICAgICAgICAgICAgLy8gRm9yIGFsbCByZW1haW5pbmcgYWRkaXRpb25zLCB3ZSBpbnNlcnQgYmVmb3JlIGxhc3QgbmV3XG4gICAgICAgICAgICAgICAgICAvLyB0YWlsLCBzaW5jZSBvbGQgcG9pbnRlcnMgYXJlIG5vIGxvbmdlciB2YWxpZFxuICAgICAgICAgICAgICAgICAgY29uc3QgbmV3UGFydCA9XG4gICAgICAgICAgICAgICAgICAgICAgY3JlYXRlQW5kSW5zZXJ0UGFydChjb250YWluZXJQYXJ0LCBuZXdQYXJ0c1tuZXdUYWlsICsgMV0pO1xuICAgICAgICAgICAgICAgICAgdXBkYXRlUGFydChuZXdQYXJ0LCBuZXdWYWx1ZXNbbmV3SGVhZF0pO1xuICAgICAgICAgICAgICAgICAgbmV3UGFydHNbbmV3SGVhZCsrXSA9IG5ld1BhcnQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgcmVtYWluaW5nIHVudXNlZCBvbGQgcGFydHNcbiAgICAgICAgICAgICAgICB3aGlsZSAob2xkSGVhZCA8PSBvbGRUYWlsKSB7XG4gICAgICAgICAgICAgICAgICBjb25zdCBvbGRQYXJ0ID0gb2xkUGFydHNbb2xkSGVhZCsrXTtcbiAgICAgICAgICAgICAgICAgIGlmIChvbGRQYXJ0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlbW92ZVBhcnQob2xkUGFydCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFNhdmUgb3JkZXIgb2YgbmV3IHBhcnRzIGZvciBuZXh0IHJvdW5kXG4gICAgICAgICAgICAgICAgcGFydExpc3RDYWNoZS5zZXQoY29udGFpbmVyUGFydCwgbmV3UGFydHMpO1xuICAgICAgICAgICAgICAgIGtleUxpc3RDYWNoZS5zZXQoY29udGFpbmVyUGFydCwgbmV3S2V5cyk7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KSBhc1xuICAgIDxUPihpdGVtczogSXRlcmFibGU8VD4sXG4gICAgICAgIGtleUZuT3JUZW1wbGF0ZTogS2V5Rm48VD58SXRlbVRlbXBsYXRlPFQ+LFxuICAgICAgICB0ZW1wbGF0ZT86IEl0ZW1UZW1wbGF0ZTxUPikgPT4gRGlyZWN0aXZlRm47XG4iLCIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTggVGhlIFBvbHltZXIgUHJvamVjdCBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogVGhpcyBjb2RlIG1heSBvbmx5IGJlIHVzZWQgdW5kZXIgdGhlIEJTRCBzdHlsZSBsaWNlbnNlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vTElDRU5TRS50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgYXV0aG9ycyBtYXkgYmUgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9BVVRIT1JTLnR4dFxuICogVGhlIGNvbXBsZXRlIHNldCBvZiBjb250cmlidXRvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQ09OVFJJQlVUT1JTLnR4dFxuICogQ29kZSBkaXN0cmlidXRlZCBieSBHb29nbGUgYXMgcGFydCBvZiB0aGUgcG9seW1lciBwcm9qZWN0IGlzIGFsc29cbiAqIHN1YmplY3QgdG8gYW4gYWRkaXRpb25hbCBJUCByaWdodHMgZ3JhbnQgZm91bmQgYXRcbiAqIGh0dHA6Ly9wb2x5bWVyLmdpdGh1Yi5pby9QQVRFTlRTLnR4dFxuICovXG5cbmltcG9ydCB7QXR0cmlidXRlUGFydCwgZGlyZWN0aXZlLCBQYXJ0LCBQcm9wZXJ0eVBhcnR9IGZyb20gJy4uL2xpdC1odG1sLmpzJztcblxuZXhwb3J0IGludGVyZmFjZSBTdHlsZUluZm8ge1xuICByZWFkb25seSBbbmFtZTogc3RyaW5nXTogc3RyaW5nO1xufVxuXG4vKipcbiAqIFN0b3JlcyB0aGUgU3R5bGVJbmZvIG9iamVjdCBhcHBsaWVkIHRvIGEgZ2l2ZW4gQXR0cmlidXRlUGFydC5cbiAqIFVzZWQgdG8gdW5zZXQgZXhpc3RpbmcgdmFsdWVzIHdoZW4gYSBuZXcgU3R5bGVJbmZvIG9iamVjdCBpcyBhcHBsaWVkLlxuICovXG5jb25zdCBzdHlsZU1hcENhY2hlID0gbmV3IFdlYWtNYXA8QXR0cmlidXRlUGFydCwgU3R5bGVJbmZvPigpO1xuXG4vKipcbiAqIEEgZGlyZWN0aXZlIHRoYXQgYXBwbGllcyBDU1MgcHJvcGVydGllcyB0byBhbiBlbGVtZW50LlxuICpcbiAqIGBzdHlsZU1hcGAgY2FuIG9ubHkgYmUgdXNlZCBpbiB0aGUgYHN0eWxlYCBhdHRyaWJ1dGUgYW5kIG11c3QgYmUgdGhlIG9ubHlcbiAqIGV4cHJlc3Npb24gaW4gdGhlIGF0dHJpYnV0ZS4gSXQgdGFrZXMgdGhlIHByb3BlcnR5IG5hbWVzIGluIHRoZSBgc3R5bGVJbmZvYFxuICogb2JqZWN0IGFuZCBhZGRzIHRoZSBwcm9wZXJ0eSB2YWx1ZXMgYXMgQ1NTIHByb3BlcnRlcy4gUHJvcGVydHkgbmFtZXMgd2l0aFxuICogZGFzaGVzIChgLWApIGFyZSBhc3N1bWVkIHRvIGJlIHZhbGlkIENTUyBwcm9wZXJ0eSBuYW1lcyBhbmQgc2V0IG9uIHRoZVxuICogZWxlbWVudCdzIHN0eWxlIG9iamVjdCB1c2luZyBgc2V0UHJvcGVydHkoKWAuIE5hbWVzIHdpdGhvdXQgZGFzaGVzIGFyZVxuICogYXNzdW1lZCB0byBiZSBjYW1lbENhc2VkIEphdmFTY3JpcHQgcHJvcGVydHkgbmFtZXMgYW5kIHNldCBvbiB0aGUgZWxlbWVudCdzXG4gKiBzdHlsZSBvYmplY3QgdXNpbmcgcHJvcGVydHkgYXNzaWdubWVudCwgYWxsb3dpbmcgdGhlIHN0eWxlIG9iamVjdCB0b1xuICogdHJhbnNsYXRlIEphdmFTY3JpcHQtc3R5bGUgbmFtZXMgdG8gQ1NTIHByb3BlcnR5IG5hbWVzLlxuICpcbiAqIEZvciBleGFtcGxlIGBzdHlsZU1hcCh7YmFja2dyb3VuZENvbG9yOiAncmVkJywgJ2JvcmRlci10b3AnOiAnNXB4JywgJy0tc2l6ZSc6XG4gKiAnMCd9KWAgc2V0cyB0aGUgYGJhY2tncm91bmQtY29sb3JgLCBgYm9yZGVyLXRvcGAgYW5kIGAtLXNpemVgIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHN0eWxlSW5mbyB7U3R5bGVJbmZvfVxuICovXG5leHBvcnQgY29uc3Qgc3R5bGVNYXAgPSBkaXJlY3RpdmUoKHN0eWxlSW5mbzogU3R5bGVJbmZvKSA9PiAocGFydDogUGFydCkgPT4ge1xuICBpZiAoIShwYXJ0IGluc3RhbmNlb2YgQXR0cmlidXRlUGFydCkgfHwgKHBhcnQgaW5zdGFuY2VvZiBQcm9wZXJ0eVBhcnQpIHx8XG4gICAgICBwYXJ0LmNvbW1pdHRlci5uYW1lICE9PSAnc3R5bGUnIHx8IHBhcnQuY29tbWl0dGVyLnBhcnRzLmxlbmd0aCA+IDEpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdUaGUgYHN0eWxlTWFwYCBkaXJlY3RpdmUgbXVzdCBiZSB1c2VkIGluIHRoZSBzdHlsZSBhdHRyaWJ1dGUgJyArXG4gICAgICAgICdhbmQgbXVzdCBiZSB0aGUgb25seSBwYXJ0IGluIHRoZSBhdHRyaWJ1dGUuJyk7XG4gIH1cblxuICBjb25zdCB7Y29tbWl0dGVyfSA9IHBhcnQ7XG4gIGNvbnN0IHtzdHlsZX0gPSBjb21taXR0ZXIuZWxlbWVudCBhcyBIVE1MRWxlbWVudDtcblxuICAvLyBIYW5kbGUgc3RhdGljIHN0eWxlcyB0aGUgZmlyc3QgdGltZSB3ZSBzZWUgYSBQYXJ0XG4gIGlmICghc3R5bGVNYXBDYWNoZS5oYXMocGFydCkpIHtcbiAgICBzdHlsZS5jc3NUZXh0ID0gY29tbWl0dGVyLnN0cmluZ3Muam9pbignICcpO1xuICB9XG5cbiAgLy8gUmVtb3ZlIG9sZCBwcm9wZXJ0aWVzIHRoYXQgbm8gbG9uZ2VyIGV4aXN0IGluIHN0eWxlSW5mb1xuICBjb25zdCBvbGRJbmZvID0gc3R5bGVNYXBDYWNoZS5nZXQocGFydCk7XG4gIGZvciAoY29uc3QgbmFtZSBpbiBvbGRJbmZvKSB7XG4gICAgaWYgKCEobmFtZSBpbiBzdHlsZUluZm8pKSB7XG4gICAgICBpZiAobmFtZS5pbmRleE9mKCctJykgPT09IC0xKSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgICAgKHN0eWxlIGFzIGFueSlbbmFtZV0gPSBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3R5bGUucmVtb3ZlUHJvcGVydHkobmFtZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQWRkIG9yIHVwZGF0ZSBwcm9wZXJ0aWVzXG4gIGZvciAoY29uc3QgbmFtZSBpbiBzdHlsZUluZm8pIHtcbiAgICBpZiAobmFtZS5pbmRleE9mKCctJykgPT09IC0xKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICAoc3R5bGUgYXMgYW55KVtuYW1lXSA9IHN0eWxlSW5mb1tuYW1lXTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3R5bGUuc2V0UHJvcGVydHkobmFtZSwgc3R5bGVJbmZvW25hbWVdKTtcbiAgICB9XG4gIH1cbiAgc3R5bGVNYXBDYWNoZS5zZXQocGFydCwgc3R5bGVJbmZvKTtcbn0pO1xuIiwiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE3IFRoZSBQb2x5bWVyIFByb2plY3QgQXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqIFRoaXMgY29kZSBtYXkgb25seSBiZSB1c2VkIHVuZGVyIHRoZSBCU0Qgc3R5bGUgbGljZW5zZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0xJQ0VOU0UudHh0XG4gKiBUaGUgY29tcGxldGUgc2V0IG9mIGF1dGhvcnMgbWF5IGJlIGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vQVVUSE9SUy50eHRcbiAqIFRoZSBjb21wbGV0ZSBzZXQgb2YgY29udHJpYnV0b3JzIG1heSBiZSBmb3VuZCBhdFxuICogaHR0cDovL3BvbHltZXIuZ2l0aHViLmlvL0NPTlRSSUJVVE9SUy50eHRcbiAqIENvZGUgZGlzdHJpYnV0ZWQgYnkgR29vZ2xlIGFzIHBhcnQgb2YgdGhlIHBvbHltZXIgcHJvamVjdCBpcyBhbHNvXG4gKiBzdWJqZWN0IHRvIGFuIGFkZGl0aW9uYWwgSVAgcmlnaHRzIGdyYW50IGZvdW5kIGF0XG4gKiBodHRwOi8vcG9seW1lci5naXRodWIuaW8vUEFURU5UUy50eHRcbiAqL1xuXG5pbXBvcnQge2lzUHJpbWl0aXZlfSBmcm9tICcuLi9saWIvcGFydHMuanMnO1xuaW1wb3J0IHtkaXJlY3RpdmUsIE5vZGVQYXJ0LCBQYXJ0fSBmcm9tICcuLi9saXQtaHRtbC5qcyc7XG5cbmludGVyZmFjZSBQcmV2aW91c1ZhbHVlIHtcbiAgcmVhZG9ubHkgdmFsdWU6IHVua25vd247XG4gIHJlYWRvbmx5IGZyYWdtZW50OiBEb2N1bWVudEZyYWdtZW50O1xufVxuXG4vLyBGb3IgZWFjaCBwYXJ0LCByZW1lbWJlciB0aGUgdmFsdWUgdGhhdCB3YXMgbGFzdCByZW5kZXJlZCB0byB0aGUgcGFydCBieSB0aGVcbi8vIHVuc2FmZUhUTUwgZGlyZWN0aXZlLCBhbmQgdGhlIERvY3VtZW50RnJhZ21lbnQgdGhhdCB3YXMgbGFzdCBzZXQgYXMgYSB2YWx1ZS5cbi8vIFRoZSBEb2N1bWVudEZyYWdtZW50IGlzIHVzZWQgYXMgYSB1bmlxdWUga2V5IHRvIGNoZWNrIGlmIHRoZSBsYXN0IHZhbHVlXG4vLyByZW5kZXJlZCB0byB0aGUgcGFydCB3YXMgd2l0aCB1bnNhZmVIVE1MLiBJZiBub3QsIHdlJ2xsIGFsd2F5cyByZS1yZW5kZXIgdGhlXG4vLyB2YWx1ZSBwYXNzZWQgdG8gdW5zYWZlSFRNTC5cbmNvbnN0IHByZXZpb3VzVmFsdWVzID0gbmV3IFdlYWtNYXA8Tm9kZVBhcnQsIFByZXZpb3VzVmFsdWU+KCk7XG5cbi8qKlxuICogUmVuZGVycyB0aGUgcmVzdWx0IGFzIEhUTUwsIHJhdGhlciB0aGFuIHRleHQuXG4gKlxuICogTm90ZSwgdGhpcyBpcyB1bnNhZmUgdG8gdXNlIHdpdGggYW55IHVzZXItcHJvdmlkZWQgaW5wdXQgdGhhdCBoYXNuJ3QgYmVlblxuICogc2FuaXRpemVkIG9yIGVzY2FwZWQsIGFzIGl0IG1heSBsZWFkIHRvIGNyb3NzLXNpdGUtc2NyaXB0aW5nXG4gKiB2dWxuZXJhYmlsaXRpZXMuXG4gKi9cbmV4cG9ydCBjb25zdCB1bnNhZmVIVE1MID0gZGlyZWN0aXZlKCh2YWx1ZTogdW5rbm93bikgPT4gKHBhcnQ6IFBhcnQpOiB2b2lkID0+IHtcbiAgaWYgKCEocGFydCBpbnN0YW5jZW9mIE5vZGVQYXJ0KSkge1xuICAgIHRocm93IG5ldyBFcnJvcigndW5zYWZlSFRNTCBjYW4gb25seSBiZSB1c2VkIGluIHRleHQgYmluZGluZ3MnKTtcbiAgfVxuXG4gIGNvbnN0IHByZXZpb3VzVmFsdWUgPSBwcmV2aW91c1ZhbHVlcy5nZXQocGFydCk7XG5cbiAgaWYgKHByZXZpb3VzVmFsdWUgIT09IHVuZGVmaW5lZCAmJiBpc1ByaW1pdGl2ZSh2YWx1ZSkgJiZcbiAgICAgIHZhbHVlID09PSBwcmV2aW91c1ZhbHVlLnZhbHVlICYmIHBhcnQudmFsdWUgPT09IHByZXZpb3VzVmFsdWUuZnJhZ21lbnQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCB0ZW1wbGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gIHRlbXBsYXRlLmlubmVySFRNTCA9IHZhbHVlIGFzIHN0cmluZzsgIC8vIGlubmVySFRNTCBjYXN0cyB0byBzdHJpbmcgaW50ZXJuYWxseVxuICBjb25zdCBmcmFnbWVudCA9IGRvY3VtZW50LmltcG9ydE5vZGUodGVtcGxhdGUuY29udGVudCwgdHJ1ZSk7XG4gIHBhcnQuc2V0VmFsdWUoZnJhZ21lbnQpO1xuICBwcmV2aW91c1ZhbHVlcy5zZXQocGFydCwge3ZhbHVlLCBmcmFnbWVudH0pO1xufSk7XG4iLCJleHBvcnQge1xuICAgIFRlbXBsYXRlUmVzdWx0LFxuICAgIFNWR1RlbXBsYXRlUmVzdWx0LFxuICAgIFJlbmRlck9wdGlvbnMsXG4gICAgaHRtbCxcbiAgICBzdmcsXG4gICAgcmVuZGVyLFxuICAgIHBhcnRzLFxuICAgIGRpcmVjdGl2ZSxcbiAgICBpc0RpcmVjdGl2ZSxcbn0gZnJvbSAnbGl0LWh0bWwnO1xuXG5pbXBvcnQgeyBhc3luY0FwcGVuZCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvYXN5bmMtYXBwZW5kJztcbmltcG9ydCB7IGFzeW5jUmVwbGFjZSB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvYXN5bmMtcmVwbGFjZSc7XG5pbXBvcnQgeyBjYWNoZSB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvY2FjaGUnO1xuaW1wb3J0IHsgY2xhc3NNYXAgfSBmcm9tICdsaXQtaHRtbC9kaXJlY3RpdmVzL2NsYXNzLW1hcCc7XG5pbXBvcnQgeyBndWFyZCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvZ3VhcmQnO1xuaW1wb3J0IHsgaWZEZWZpbmVkIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9pZi1kZWZpbmVkJztcbmltcG9ydCB7IHJlcGVhdCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvcmVwZWF0JztcbmltcG9ydCB7IHN0eWxlTWFwIH0gZnJvbSAnbGl0LWh0bWwvZGlyZWN0aXZlcy9zdHlsZS1tYXAnO1xuaW1wb3J0IHsgdW5zYWZlSFRNTCB9IGZyb20gJ2xpdC1odG1sL2RpcmVjdGl2ZXMvdW5zYWZlLWh0bWwnO1xuXG5leHBvcnQgY29uc3QgZGlyZWN0aXZlcyA9IHtcbiAgICBhc3luY0FwcGVuZCxcbiAgICBhc3luY1JlcGxhY2UsXG4gICAgY2FjaGUsXG4gICAgY2xhc3NNYXAsXG4gICAgZ3VhcmQsXG4gICAgaWZEZWZpbmVkLFxuICAgIHJlcGVhdCxcbiAgICBzdHlsZU1hcCxcbiAgICB1bnNhZmVIVE1MLFxufTtcbiJdLCJuYW1lcyI6WyJfX2FzeW5jVmFsdWVzIiwidGVtcGxhdGVDYWNoZXMiLCJwcmV2aW91c1ZhbHVlcyIsImRpcmVjdGl2ZXMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7Ozs7Ozs7Ozs7SUFvQkEsTUFBTSxVQUFVLEdBQUcsSUFBSSxPQUFPLEVBQWdCLENBQUM7SUFPL0M7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7VUF3Q2EsU0FBUyxHQUFHLENBQTZCLENBQUksTUFDckQsQ0FBQyxHQUFHLElBQWU7UUFDbEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDckIsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDeEIsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDLEVBQU87VUFFQyxXQUFXLEdBQUcsQ0FBQyxDQUFVO1FBQ3BDLE9BQU8sT0FBTyxDQUFDLEtBQUssVUFBVSxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEQ7O0lDNUVBOzs7Ozs7Ozs7Ozs7O0lBc0JBOzs7QUFHQSxJQUFPLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FB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UjtRQUVELE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDcEQsUUFBUSxDQUFDLFNBQVMsR0FBRyxLQUFlLENBQUM7UUFDckMsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzdELElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDeEJBLGdCQUFjLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFDLEtBQUssRUFBRSxRQUFRLEVBQUMsQ0FBQyxDQUFDO0lBQzlDLENBQUMsQ0FBQyxDQUFDOztVQy9CVUMsWUFBVSxHQUFHO1FBQ3RCLFdBQVc7UUFDWCxZQUFZO1FBQ1osS0FBSztRQUNMLFFBQVE7UUFDUixLQUFLO1FBQ0wsU0FBUztRQUNULE1BQU07UUFDTixRQUFRO1FBQ1IsVUFBVTtLQUNiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlLyJ9
