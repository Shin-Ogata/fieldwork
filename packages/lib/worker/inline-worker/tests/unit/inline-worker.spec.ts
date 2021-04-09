/* eslint-disable
    @typescript-eslint/no-explicit-any
 */

import { InlineWorker, thread } from '@cdp/inline-worker';
import { sleep } from '@cdp/core-utils';
import { CancelToken } from '@cdp/promise';

describe('inline-worker spec', () => {

    describe('inline-worker/inline-worker spec', () => {
        it('basic', done => {
            const worker = new InlineWorker((self: Worker) => {
                self.addEventListener('message', ({ data }) => {
                    console.log(data);
                    self.postMessage('from_thread');
                });
            });

            worker.addEventListener('message', ({ data }) => {
                expect(data).toBe('from_thread');
                worker.terminate();
                done();
            });

            worker.postMessage('from_main');
        });

        it('from string', done => {
            const func = (self: Worker): void => {
                self.addEventListener('message', ({ data }) => {
                    console.log(data);
                    self.postMessage('from_thread');
                });
            };
            const worker = new InlineWorker(`(${func.toString()})(self);`);

            worker.addEventListener('message', ({ data }) => {
                expect(data).toBe('from_thread');
                worker.terminate();
                done();
            });

            worker.postMessage('from_main');
        });

        it('type error', done => {
            try {
                new InlineWorker(100 as any); // eslint-disable-line
            } catch (e) {
                expect(e instanceof TypeError).toBe(true);
                expect(e.message).toBe('Number is not a function or string.');
            }
            done();
        });
    });

    describe('inline-worker/thread spec', () => {
        const cancelSource = CancelToken.source();
        const { token: canceled } = cancelSource;
        cancelSource.cancel(new Error('aborted'));

        const execSync = (): string => {
            return 'this is sync exec!';
        };

        const execAsync = (): Promise<string> => {
            return Promise.resolve('this is async exec!');
        };

        const execArgs = (arg1: number, arg2: string, arg3: boolean): Promise<{ arg1?: number; arg2?: string; arg3?: boolean; }> => {
            return Promise.resolve({ arg1, arg2, arg3 });
        };

        it('check thread() w/ sync execute', async () => {
            const data = await thread(execSync);
            expect(data).toBe('this is sync exec!');
        });

        it('check thread() w/ async execute', async () => {
            const data = await thread(execAsync);
            expect(data).toBe('this is async exec!');
        });

        it('check thread() w/ arguments', async () => {
            const data = await thread(execArgs, { args: [100, 'test', true] });
            expect(data).toEqual({ arg1: 100, arg2: 'test', arg3: true });
        });

        it('check thread() w/ already canceled', async () => {
            try {
                void await thread(execAsync, { cancel: canceled });
                expect('UNEXPECTED FLOW').toBeNull();
            } catch (e) {
                expect(e.message).toBe('aborted');
            }
        });

        it('check thread() w/ after canceled', async () => {
            try {
                const cancelSource = CancelToken.source();
                const { token } = cancelSource;
                const promise = thread(async () => {
                    function workerSleep(elapse: number): Promise<void> {
                        return new Promise(resolve => setTimeout(resolve, elapse));
                    }
                    await workerSleep(500);
                    return 'this is delay async exec!';
                }, { cancel: token });

                cancelSource.cancel(new Error('cancel'));

                void await promise;
                expect('UNEXPECTED FLOW').toBeNull();
            } catch (e) {
                expect(e.message).toBe('cancel');
            }
        });

        it('check thread() w/ error', async () => {
            try {
                void await thread(async () => {
                    await sleep(500);
                    return 'this is delay async exec!';
                });
                expect('UNEXPECTED FLOW').toBeNull();
            } catch (e) {
                expect(e instanceof ErrorEvent).toBe(true);
                expect(e.message.startsWith('Uncaught ReferenceError:')).toBe(true);
                expect(e.message.includes('is not defined')).toBe(true);
            }
        });
    });
});
