import { document, CustomEvent } from './ssr';

export interface ConnectEventMap {
    'connected': Event;
    'disconnected': Event;
}

/** @internal */
interface ObserverContext {
    targets: Set<Node>;
    observer: MutationObserver;
}

const _observerMap = new Map<Node, ObserverContext>();

const queryObservedNode = (node: Node): Node | undefined => {
    for (const [observedNode, context] of _observerMap) {
        if (context.targets.has(node)) {
            return observedNode;
        }
    }
    return undefined;
};

const dispatchTarget = (node: Node, event: Event, nodeIn: WeakSet<Node>, nodeOut: WeakSet<Node>): void => {
    if (queryObservedNode(node) && !nodeIn.has(node)) {
        nodeOut.delete(node);
        nodeIn.add(node);
        node.dispatchEvent(event);
    }
    for (const child of node.childNodes) {
        dispatchTarget(child, event, nodeIn, nodeOut);
    }
};

const  dispatchAll = (nodes: NodeList, type: string, nodeIn: WeakSet<Node>, nodeOut: WeakSet<Node>): void => {
    for (const node of nodes) {
        Node.ELEMENT_NODE === node.nodeType && dispatchTarget(
            node,
            new CustomEvent(type, { bubbles: true, cancelable: true }),
            nodeIn,
            nodeOut,
        );
    }
};

const start = (observedNode: Node): ObserverContext => {
    const connected = new WeakSet<Node>();
    const disconnected = new WeakSet<Node>();

    const changes = (records: MutationRecord[]): void => {
        for (const record of records) {
            dispatchAll(record.removedNodes, 'disconnected', disconnected, connected);
            dispatchAll(record.addedNodes, 'connected', connected, disconnected);
        }
    };

    const context: ObserverContext = {
        targets: new Set(),
        observer: new MutationObserver(changes),
    };
    _observerMap.set(observedNode, context);
    context.observer.observe(observedNode, { childList: true, subtree: true });

    return context;
};

const stopAll = (): void => {
    for (const [, context] of _observerMap) {
        context.targets.clear();
        context.observer.disconnect();
    }
    _observerMap.clear();
};

/**
 * @en Enabling the node to detect events of DOM connected and disconnected.
 * @ja 要素に対して, DOM への接続, DOM からの切断イベントを検出可能にする
 *
 * @example <br>
 *
 * ```ts
 * import { dom } from '@cdp/runtime';
 * const { detectify, undetectify } = dom.utils;
 *
 * const el = document.createElement('div');
 *
 * // observation start
 * detectify(el);
 * el.addEventListener('connected', () => {
 *     console.log('on connected');
 * });
 * el.addEventListener('disconnected', () => {
 *     console.log('on disconnected');
 * });
 *
 * // observation stop
 * undetectify(el);
 * ```
 *
 * @param node
 *  - `en` target node
 *  - `ja` 対象の要素
 * @param observed
 *  - `en` Specifies the root element to watch. If not specified, `ownerDocument` is evaluated first, followed by global `document`.
 *  - `ja` 監視対象のルート要素を指定. 未指定の場合は `ownerDocument`, グローバル `document` の順に評価される
 */
export const detectify = <T extends Node>(node: T, observed?: Node): T => {
    const observedNode = observed || (node.ownerDocument?.body && node.ownerDocument) || document;
    const context = _observerMap.get(observedNode) || start(observedNode);
    context.targets.add(node);
    return node;
};

/**
 * @en Undetect connected and disconnected from DOM events for an element.
 * @ja 要素に対して, DOM への接続, DOM からの切断イベントを検出を解除する
 *
 * @param node
 *  - `en` target node. If not specified, execute all release.
 *  - `ja` 対象の要素. 指定しない場合は全解除を実行
 */
export const undetectify = <T extends Node>(node?: T): void => {
    if (null == node) {
        stopAll();
    } else {
        const observedNode = queryObservedNode(node);
        if (observedNode) {
            const context = _observerMap.get(observedNode) as ObserverContext;
            context.targets.delete(node);
            if (!context.targets.size) {
                context.observer.disconnect();
                _observerMap.delete(observedNode);
            }
        }
    }
};
