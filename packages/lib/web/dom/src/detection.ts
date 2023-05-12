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

/** @internal */
export const detectify = <T extends Node>(node: T, observed?: Node): T => {
    const observedNode = observed || (node.ownerDocument?.body && node.ownerDocument) || document;
    const context = _observerMap.get(observedNode) || start(observedNode);
    context.targets.add(node);
    return node;
};

/** @internal */
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
