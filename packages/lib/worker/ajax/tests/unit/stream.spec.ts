/* eslint-disable
    @typescript-eslint/unbound-method,
 */

import { sleep } from '@cdp/core-utils';
import {
    AjaxDataStreamEventProgresArg,
    toAjaxDataStream,
    ajax,
} from '@cdp/ajax';

describe('ajax/stream spec', () => {
    it('check toAjaxDataStream(Blob)', async () => {
        const blob = await ajax('../../.temp/res/ajax/image.jpg', { dataType: 'blob' });
        const stream = toAjaxDataStream(blob);
        expect(stream instanceof ReadableStream).toBeTrue();
        expect(stream).toBeDefined();
        expect(stream.length).toBe(10980);
    });

    it('check toAjaxDataStream(ReadableStream, lenght)', async () => {
        const blob = await ajax('../../.temp/res/ajax/image.jpg', { dataType: 'blob' });
        const rawStream = blob.stream();
        const length = blob.size;
        const stream = toAjaxDataStream(rawStream, length);
        expect(stream instanceof ReadableStream).toBeTrue();
        expect(stream).toBeDefined();
        expect(stream.length).toBe(10980);
    });

    it('check toAjaxDataStream(ReadableStream)', async () => {
        const blob = await ajax('../../.temp/res/ajax/image.jpg', { dataType: 'blob' });
        const rawStream = blob.stream();
        const stream = toAjaxDataStream(rawStream);
        expect(stream instanceof ReadableStream).toBeTrue();
        expect(stream).toBeDefined();
        expect(stream.length).toBeNaN();
    });

    it('check reader', async () => {
        const blob = await ajax('../../.temp/res/ajax/image.jpg', { dataType: 'blob' });
        const stream = toAjaxDataStream(blob);
        const reader = stream.getReader();
        expect(reader instanceof ReadableStreamDefaultReader).toBe(true);
        expect(reader.read).toBeDefined();
        expect(reader.cancel).toBeDefined();
        expect(reader.closed).toBeDefined();
        expect(reader.releaseLock).toBeDefined();
    });

    it('check progress events', async () => {
        const stream = await ajax('../../.temp/res/ajax/image.jpg', { dataType: 'stream' });
        expect(stream).toBeDefined();
        expect(stream.length).toBe(10980);

        let called = 0;
        let event!: AjaxDataStreamEventProgresArg;
        const onCallback = (progress: AjaxDataStreamEventProgresArg): void => {
            called++;
            event = progress;
        };

        stream.on('progress', onCallback);

        const reader = stream.getReader();

        // progress example
        let result: ReadableStreamReadResult<Uint8Array> | undefined;
        while (!result?.done) {
            result = await reader.read();
        }

        await sleep(100);

        expect(event).toBeDefined();
        expect(2 <= called).toBe(true);
        expect(event.computable).toBe(true);
    });
});
