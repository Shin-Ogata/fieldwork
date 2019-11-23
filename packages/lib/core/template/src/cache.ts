import {
    PlainObject,
    ensureObject,
    getGlobalNamespace,
} from '@cdp/core-utils';
import { TemplateTags } from './interfaces';

/**
 * @en Cache location information.
 * @ja キャッシュロケーション情報
 */
export const enum CacheLocation {
    NAMESPACE = 'CDP_DECLARE',
    ROOT      = 'TEMPLATE_CACHE',
}

/**
 * @en Build cache key.
 * @ja キャッシュキーの生成
 */
export function buildCacheKey(template: string, tags: TemplateTags): string {
    return `${template}:${tags.join(':')}`;
}

/**
 * @en Clears all cached templates in cache pool.
 * @ja すべてのテンプレートキャッシュを破棄
 */
export function clearCache(): void {
    const namespace = getGlobalNamespace(CacheLocation.NAMESPACE);
    namespace[CacheLocation.ROOT] = {};
}

/** global cache pool */
export const cache = ensureObject<PlainObject>(null, CacheLocation.NAMESPACE, CacheLocation.ROOT);
