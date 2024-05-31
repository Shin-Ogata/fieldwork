import { webRoot } from '@cdp/web-utils';
import { URL } from './ssr';
import { normalizeId } from './history/internal';

/** re-export */
export * from '@cdp/extension-path2regexp';

/**
 * @en Generates an ID to be used by the stack inside the router.
 * @ja ルーター内部の stack が使用する ID を生成
 *
 * @param src
 *  - `en` specifies where the path string is created from [ex: `location.hash`, `location.href`, `#path`, `path`, `/path`]
 *  - `ja` path 文字列の作成元を指定 [ex: `location.hash`, `location.href`, `#path`, `path`, `/path`]
 */
export const toRouterStackId = (src: string): string => {
    if (URL.canParse(src)) {
        const { hash } = new URL(src);
        return hash ? normalizeId(hash) : normalizeId(src.substring(webRoot.length));
    } else {
        return normalizeId(src);
    }
};

/**
 * @en Get the normalized `/<id>` string from the url / path.
 * @ja url / path を指定して, 正規化した `/<stack id>` 文字列を取得
 *
 * @param src
 *  - `en` specifies where the path string is created from [ex: `location.hash`, `location.href`, `#path`, `path`, `/path`]
 *  - `ja` path 文字列の作成元を指定 [ex: `location.hash`, `location.href`, `#path`, `path`, `/path`]
 */
export const toRouterPath = (src: string): string => {
    return `/${toRouterStackId(src)}`;
};
