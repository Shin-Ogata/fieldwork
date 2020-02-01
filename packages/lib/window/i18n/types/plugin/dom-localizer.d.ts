import { i18n } from '@cdp/extension-i18n';
import { DOMSelector, DOMResult } from '@cdp/dom';
import './module-extends';
/**
 * @en DOM localizer method.
 * @ja DOM ローカライズ
 *
 * @param selector
 *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
 *  - `ja` [[DOM]] のもとになるオブジェクト(群)またはセレクタ文字列
 * @param options
 *  - `en` translation options.
 *  - `ja` 翻訳オプション
 */
export declare function localize<T extends string | Node>(selector: DOMSelector<T>, options?: i18n.TOptions): DOMResult<T>;
