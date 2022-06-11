import type { UnknownFunction } from '@cdp/core-utils';
import { requestAnimationFrame, requestIdleCallback } from './ssr';

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
export async function waitFrame(frameCount = 1, executor: UnknownFunction = requestAnimationFrame): Promise<void> {
    while (frameCount-- > 0) {
        await new Promise<void>(executor);
    }
}

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
export function waitIdle(options?: IdleRequestOptions): Promise<void> {
    return new Promise<void>(resolve => requestIdleCallback(() => resolve(), options));
}
