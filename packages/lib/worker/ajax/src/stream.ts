import {
    UnknownFunction,
    Accessible,
    Keys,
    isFunction,
} from '@cdp/core-utils';
import { Subscribable, EventSource } from '@cdp/events';
import type { AjaxDataStreamEvent, AjaxDataStream } from './interfaces';

/** @internal ProxyHandler helper */
const _execGetDefault = (target: any, prop: string | symbol): any => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (prop in target) {
        if (isFunction(target[prop])) {
            return target[prop].bind(target);
        } else {
            return target[prop];
        }
    }
};

/** @internal */
const _subscribableMethods: Keys<Subscribable>[] = [
    'hasListener',
    'channels',
    'on',
    'off',
    'once',
];

export const toAjaxDataStream = (seed: Blob | ReadableStream<Uint8Array>, length?: number): AjaxDataStream => {
    let loaded = 0;
    const [stream, total] = (() => {
        if (seed instanceof Blob) {
            return [seed.stream(), seed.size];
        } else {
            return [seed, length != null ? Math.trunc(length) : NaN];
        }
    })();

    const _eventSource = new EventSource<AjaxDataStreamEvent>() as Accessible<EventSource<AjaxDataStreamEvent>, UnknownFunction>;

    const _proxyReaderHandler: ProxyHandler<ReadableStreamDefaultReader<Uint8Array>> = {
        get: (target: ReadableStreamDefaultReader<Uint8Array>, prop: string) => {
            if ('read' === prop) {
                const promise = target.read();
                void (async () => {
                    const { done, value: chunk } = await promise;
                    chunk && (loaded += chunk.length);
                    _eventSource.trigger('progress', Object.freeze({
                        computable: !Number.isNaN(total),
                        loaded,
                        total,
                        done,
                        chunk,
                    }));
                })();
                return () => promise;
            } else {
                return _execGetDefault(target, prop);
            }
        },
    };

    return new Proxy(stream, {
        get: (target: ReadableStream<Uint8Array>, prop: string) => {
            if ('getReader' === prop) {
                return () => new Proxy(target.getReader(), _proxyReaderHandler);
            } else if ('length' === prop) {
                return total;
            } else if (_subscribableMethods.includes(prop as Keys<Subscribable>)) {
                return (...args: unknown[]) => _eventSource[prop](...args);
            } else {
                return _execGetDefault(target, prop);
            }
        },
    }) as AjaxDataStream;
};
