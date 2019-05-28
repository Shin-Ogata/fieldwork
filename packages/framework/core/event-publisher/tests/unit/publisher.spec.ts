import { EventPublisher } from '@cdp/event-publisher';

interface TestEvent {
    error: [Error];
    message: [string];
    multi: [number, string, boolean];
    void: [void];
    empty: void;
    simple: number;
}

class TestPublisher extends EventPublisher<TestEvent> {
    public triggerTest(): void {
        this.publish('error', new TypeError('error'));
        this.publish('void');
        this.publish('empty');
        this.publish('message', '100');
        this.publish('multi', 100, '1');
        this.publish('multi', 100);
        this.publish('multi', 10, 'str', true);
        this.publish('simple', 1);
    }
}

const test = new TestPublisher();
test.off();
test.off('error', () => { });
test.off('error', (str) => { });
test.on('error', () => { });
test.on('error', (str) => { });
test.on(['error', 'message', 'multi'], () => { });
test.on(['error', 'message'], (hoge) => { });

describe('event-publisher/publisher spec', () => {
    it(`check template`, () => {
        expect(test).toBeDefined();
    });
});
