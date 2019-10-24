/**
 * @en `Blob URL` utility for automatic memory manegement.
 * @ja メモリ自動管理を行う `Blob URL` ユーティリティ
 */
export declare class BlobURL {
    /**
     * @en Create `Blob URL` from instances.
     * @ja インスタンスを指定して `Blob URL` の構築
     */
    static create(...blobs: Blob[]): void;
    /**
     * @en Clear all `Blob URL` cache.
     * @ja すべての `Blob URL` キャッシュを破棄
     */
    static clear(): void;
    /**
     * @en Get `Blob URL` from instance.
     * @ja インスタンスを指定して `Blob URL` の取得
     */
    static get(blob: Blob): string;
    /**
     * @en Check `Blob URL` is available from instance.
     * @ja インスタンスを指定して `Blob URL` が有効化判定
     */
    static has(blob: Blob): boolean;
    /**
     * @en Revoke `Blob URL` from instances.
     * @ja インスタンスを指定して `Blob URL` を無効化
     */
    static revoke(...blobs: Blob[]): void;
}
