export interface ConnectEventMap {
    'connected': Event;
    'disconnected': Event;
}
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
export declare const detectify: <T extends Node>(node: T, observed?: Node) => T;
/**
 * @en Undetect connected and disconnected from DOM events for an element.
 * @ja 要素に対して, DOM への接続, DOM からの切断イベントを検出を解除する
 *
 * @param node
 *  - `en` target node. If not specified, execute all release.
 *  - `ja` 対象の要素. 指定しない場合は全解除を実行
 */
export declare const undetectify: <T extends Node>(node?: T | undefined) => void;
