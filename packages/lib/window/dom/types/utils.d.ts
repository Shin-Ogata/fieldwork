import { Nil } from '@cdp/core-utils';
export declare type ElementBase = Node | Window;
export declare type ElementResult<T> = T extends ElementBase ? T : Element;
export declare type SelectorBase = Node | Window | string | Nil;
export declare type ElementifySeed<T extends SelectorBase = Element> = T | (T extends ElementBase ? T[] : never) | NodeListOf<T extends Node ? T : never>;
export declare type QueryContext = ParentNode & Partial<NonElementParentNode>;
/**
 * @en Create Element array from seed arg.
 * @ja 指定された Seed から Element 配列を作成
 *
 * @param seed
 *  - `en` Object(s) or the selector string which becomes origin of Element array.
 *  - `ja` Element 配列のもとになるオブジェクト(群)またはセレクタ文字列
 * @param context
 *  - `en` Set using `Document` context. When being un-designating, a fixed value of the environment is used.
 *  - `ja` 使用する `Document` コンテキストを指定. 未指定の場合は環境の既定値が使用される.
 * @returns Element[] based Node or Window object.
 */
export declare function elementify<T extends SelectorBase>(seed?: ElementifySeed<T>, context?: QueryContext): ElementResult<T>[];
