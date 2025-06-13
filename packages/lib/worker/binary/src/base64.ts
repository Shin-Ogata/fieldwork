import {
    TextEncoder,
    atob,
    btoa,
} from './ssr';

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
        const utf8Bytes = new TextEncoder().encode(src);
        const binaryString = Array.from(utf8Bytes)
            .map(byte => String.fromCharCode(byte))
            .join('');
        return btoa(binaryString);
    }

    /**
     * @en Decodes a string of data which has been encoded using base-64 encoding.
     * @ja base64 形式でエンコードされたデータの文字列をデコード
     */
    public static decode(encoded: string): string {
        const binaryString = atob(encoded);
        const utf8Bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
        return new TextDecoder().decode(utf8Bytes);
    }
}
