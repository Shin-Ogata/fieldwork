import type { UnknownFunction } from '@cdp/core-utils';
/**
 * @en Get the timing that does not block the rendering process etc.
 * @ja レンダリング処理等をブロックしないタイミングを取得
 *
 * @example <br>
 *
 * ```ts
 *  await waitFrame();
 * ```
 *
 * @param frameCount
 *  - `en` wait frame count.
 *  - `ja` 処理待ちを行うフレーム数
 * @param executor
 *  - `en` wait frame executor.
 *  - `ja` 処理待ちを行う実行関数
 */
export declare function waitFrame(frameCount?: number, executor?: UnknownFunction): Promise<void>;
/**
 * @en Wait until the current thread is idle.
 * @ja 現在のスレッドがアイドル状態になるまで待機
 *
 * @example <br>
 *
 * ```ts
 *  await waitIdle();
 * ```
 *
 */
export declare function waitIdle(options?: IdleRequestOptions): Promise<void>;
