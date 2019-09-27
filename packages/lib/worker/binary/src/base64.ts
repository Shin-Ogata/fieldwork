import { atob, btoa } from './ssr';

/**
 * @en `base64` utility for independent charactor code.
 * @ja 文字コードに依存しない `base64` ユーティリティ
 */
export class Base64 {
    /**
     * @en Encode a base-64 encoded string from a binary string.
     * @ja 文字列を base64 形式でエンコード
     */
    public static encode(src: string): string {
        return btoa(unescape(encodeURIComponent(src)));
    }

    /**
     * @en Decodes a string of data which has been encoded using base-64 encoding.
     * @ja base64 形式でエンコードされたデータの文字列をデコード
     */
    public static decode(encoded: string): string {
        return decodeURIComponent(escape(atob(encoded)));
    }
}
