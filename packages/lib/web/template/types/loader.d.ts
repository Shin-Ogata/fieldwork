import { JST, TemplateCompileOptions } from '@cdp/core-template';
import { LoadTemplateOptions } from '@cdp/web-utils';
export { clearTemplateCache } from '@cdp/web-utils';
import { CompiledTemplate, TemplateBridgeCompileOptions } from './bridge';
/**
 * @en Template query type list.
 * @ja テンプレート取得時に指定可能な型一覧
 */
export interface TemplateQueryTypeList {
    engine: JST;
    bridge: CompiledTemplate;
}
/**
 * @en Template query type definitions.
 * @ja テンプレート取得時に指定可能な型指定子
 */
export declare type TemplateQueryTypes = keyof TemplateQueryTypeList;
/**
 * @en Template query options.
 * @ja テンプレート取得オプション
 */
export interface TemplateQueryOptions<T extends TemplateQueryTypes> extends LoadTemplateOptions, TemplateCompileOptions, TemplateBridgeCompileOptions {
    type?: T;
}
/**
 * @en Get compiled JavaScript template.
 * @ja コンパイル済み JavaScript テンプレート取得
 *
 * @param selector
 *  - `en` The selector string of DOM.
 *  - `ja` DOM セレクタ文字列
 * @param options
 *  - `en` query options
 *  - `ja` クエリオプション
 */
export declare function getTemplate<T extends TemplateQueryTypes = 'engine'>(selector: string, options?: TemplateQueryOptions<T>): Promise<TemplateQueryTypeList[T]>;
