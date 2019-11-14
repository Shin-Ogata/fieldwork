/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="./_export.d.ts" />

/*
 * NOTE: テスト用モジュール宣言
 *       `export =` を使用しているため, クライアント側で `export * from '@cdp/core-utils';` は使用不可.
 */
declare module '@cdp/core-utils' {
    export = _Exports;
}
