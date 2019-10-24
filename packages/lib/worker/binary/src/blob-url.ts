import { URL } from './ssr';

const _blobMap = new WeakMap<Blob, string>();
const _urlSet  = new Set<string>();

/**
 * @en `Blob URL` utility for automatic memory manegement.
 * @ja メモリ自動管理を行う `Blob URL` ユーティリティ
 */
export class BlobURL {
    /**
     * @en Create `Blob URL` from instances.
     * @ja インスタンスを指定して `Blob URL` の構築
     */
    public static create(...blobs: Blob[]): void {
        for (const b of blobs) {
            const cache = _blobMap.get(b);
            if (cache) {
                continue;
            }
            const url = URL.createObjectURL(b);
            _blobMap.set(b, url);
            _urlSet.add(url);
        }
    }

    /**
     * @en Clear all `Blob URL` cache.
     * @ja すべての `Blob URL` キャッシュを破棄
     */
    public static clear(): void {
        for (const url of _urlSet) {
            URL.revokeObjectURL(url);
        }
        _urlSet.clear();
    }

    /**
     * @en Get `Blob URL` from instance.
     * @ja インスタンスを指定して `Blob URL` の取得
     */
    public static get(blob: Blob): string {
        const cache = _blobMap.get(blob);
        if (cache) {
            return cache;
        }
        const url = URL.createObjectURL(blob);
        _blobMap.set(blob, url);
        _urlSet.add(url);
        return url;
    }

    /**
     * @en Check `Blob URL` is available from instance.
     * @ja インスタンスを指定して `Blob URL` が有効化判定
     */
    public static has(blob: Blob): boolean {
        return _blobMap.has(blob);
    }

    /**
     * @en Revoke `Blob URL` from instances.
     * @ja インスタンスを指定して `Blob URL` を無効化
     */
    public static revoke(...blobs: Blob[]): void {
        for (const b of blobs) {
            const url = _blobMap.get(b);
            if (url) {
                URL.revokeObjectURL(url);
                _blobMap.delete(b);
                _urlSet.delete(url);
            }
        }
    }
}
