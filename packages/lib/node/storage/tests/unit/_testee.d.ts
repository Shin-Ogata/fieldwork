/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference types="jasmine" />
/// <reference path="./_module.d.ts" />

/*
 * [jasmine-node] 特別対応
 * - Spy には SpyAnd I/F がないため, 個別に型を解決する
 *   - https://github.com/mhevery/jasmine-node/issues/376
 *   - https://stackoverflow.com/questions/30560195/how-to-spy-on-a-class-method-in-node-jasmine/30561820#30561820
 */
declare namespace jasmine {
    interface Spy<Fn extends Func = Func> {
        andCallThrough(): Spy<Fn>;
    }
}
