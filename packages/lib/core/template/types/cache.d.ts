import { PlainObject } from '@cdp/core-utils';
import { TemplateTags } from './interfaces';
/**
 * @en Cache location information.
 * @ja キャッシュロケーション情報
 */
export declare const enum CacheLocation {
    NAMESPACE = "CDP_DECLARE",
    ROOT = "TEMPLATE_CACHE"
}
/**
 * @en Build cache key.
 * @ja キャッシュキーの生成
 */
export declare function buildCacheKey(template: string, tags: TemplateTags): string;
/**
 * @en Clears all cached templates in cache pool.
 * @ja すべてのテンプレートキャッシュを破棄
 */
export declare function clearCache(): void;
/** global cache pool */
export declare const cache: PlainObject<any>;
