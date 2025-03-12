import {
    type PlainObject,
    ensureObject,
    getGlobalNamespace,
} from '@cdp/core-utils';
import type { TemplateDelimiters } from './interfaces';

/**
 * @en Cache location information.
 * @ja キャッシュロケーション情報
 *
 * @internal
 */
export const enum CacheLocation {
    NAMESPACE = 'CDP_DECLARE',
    ROOT      = 'TEMPLATE_CACHE',
}

/**
 * @en Build cache key.
 * @ja キャッシュキーの生成
 *
 * @internal
 */
export function buildCacheKey(template: string, tags: TemplateDelimiters): string {
    return `${template}:${tags.join(':')}`;
}

/**
 * @en Clears all cached templates in cache pool.
 * @ja すべてのテンプレートキャッシュを破棄
 *
 * @internal
 */
export function clearCache(): void {
    const namespace = getGlobalNamespace(CacheLocation.NAMESPACE);
    namespace[CacheLocation.ROOT] = {};
}

/** @internal global cache pool */
export const cache = ensureObject<PlainObject>(null, CacheLocation.NAMESPACE, CacheLocation.ROOT);
