/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */

import {
    FunctionPropertyNames,
    className,
    sleep,
} from '@cdp/core-utils';
import { dom as $ } from '@cdp/dom';
import {
    View,
    ViewEventsHash,
    ViewConstructionOptions,
} from '@cdp/view';
import { cleanupTestElements, prepareTestElements } from './tools';

describe('view spec', () => {
    let count: number;
    const onCallback = (...args: any[]): void => { // eslint-disable-line
        count++;
    };

    interface ViewEvent {
        fire: string;
    }

    class BaseView extends View<HTMLElement, ViewEvent> {
        render(): this {
            count++;
            if (this.$el.has('p').length) {
                this.$el.find('p').replaceWith($(`<p>${className(this)}: ${count}</p>`));
            } else {
                this.$el.append(`<p>${className(this)}</p>`);
            }
            return this;
        }
    }

    beforeEach(() => {
        count = 0;
    });

    afterEach(() => {
        cleanupTestElements();
    });

    describe('construction/destruction', () => {
        it('check construction from empty', () => {
            const testView = new BaseView();
            expect(testView).toBeDefined();
            expect(testView.el).toBeDefined();
            expect(testView.el instanceof HTMLElement).toBe(true);
            expect(testView.$el).toBeDefined();
        });

        it('check construction from element', () => {
            const el = prepareTestElements()[0];
            const testView = new BaseView({ el });
            expect(testView).toBeDefined();
            expect(testView.el).toBeDefined();
            expect(testView.el).toBe(el);
            expect(testView.$el).toBeDefined();
        });

        it('check construction from text', () => {
            const el = prepareTestElements()[0];
            const testView = new BaseView({ el: '#d1' });
            expect(testView).toBeDefined();
            expect(testView.el).toBeDefined();
            expect(testView.el).toBe(el);
            expect(testView.$el).toBeDefined();
        });

        it('check View#release() w/ callback', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            prepareTestElements();
            const testView = new BaseView({ el: '#d1' });
            const broker = new BaseView();

            testView.on('fire', stub.onCallback);
            testView.listenTo(broker, 'fire', stub.onCallback);
            testView.delegate('click', stub.onCallback);

            testView.trigger('fire', 'myself');
            broker.trigger('fire', 'broker');
            testView.$el.trigger('click', 'dom');

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith('myself');
            expect(stub.onCallback).toHaveBeenCalledWith('broker');
            expect(stub.onCallback).toHaveBeenCalledWith(jasmine.any(Event), 'dom');
            expect(count).toBe(3);

            testView.release();

            testView.trigger('fire', 'myself');
            broker.trigger('fire', 'broker');
            testView.$el.trigger('click', 'dom');

            await sleep(0);

            expect(count).toBe(3);
            expect($('#d1').length).toBe(1);
        });

        it('check View#remove() w/ callback', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            prepareTestElements();
            const testView = new BaseView({ el: '#d1' });
            const broker = new BaseView();

            testView.on('fire', stub.onCallback);
            testView.listenTo(broker, 'fire', stub.onCallback);
            testView.delegate('click', stub.onCallback);

            testView.trigger('fire', 'myself');
            broker.trigger('fire', 'broker');
            testView.$el.trigger('click', 'dom');

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith('myself');
            expect(stub.onCallback).toHaveBeenCalledWith('broker');
            expect(stub.onCallback).toHaveBeenCalledWith(jasmine.any(Event), 'dom');
            expect(count).toBe(3);

            testView.remove();

            testView.trigger('fire', 'myself');
            broker.trigger('fire', 'broker');
            testView.$el.trigger('click', 'dom');

            await sleep(0);

            expect(count).toBe(3);
            expect($('#d1').length).toBe(0);
        });
    });

    describe('events', () => {
        class EventView extends BaseView {
            // 厳密化のみは '@typescript-eslint/no-useless-constructor' が指摘される
            constructor(options: ViewConstructionOptions<HTMLElement, FunctionPropertyNames<EventView>>) { // eslint-disable-line
                super(options);
            }

            // private/protected は keyof で列挙できないため, 厳密化 <-> カプセル化 にトレードオフが存在する
            // https://stackoverflow.com/questions/57066049/list-private-property-names-of-the-class
            /*private*/ countUp(): void {
                count++;
            }
            events(): ViewEventsHash<HTMLElement, FunctionPropertyNames<EventView>> {
                return {
                    // '@typescript-eslint/unbound-method' が指摘される. bind しても内部で行われるため限定 off 推奨
                    'click .render': this.render, // eslint-disable-line
                    'click .count-up': 'countUp',
//                  'dblclick .count-up': 'typo', // compile error
                };
            }
        }

        it('check options events', async () => {
            const testView = new BaseView({
                events: {
                    click: 'render',
                    dblclick: 'typo',
                },
            });

            testView.$el.trigger('click');
            await sleep(0);
            expect(testView.$el.find('p').text()).toBe('BaseView');

            testView.$el.trigger('click');
            await sleep(0);
            expect(testView.$el.find('p').text()).toBe('BaseView: 2');
        });

        it('check member events', async () => {
            prepareTestElements($.utils.elementify(`
<div id="d1" class="test-dom" tabindex="-1">
    <div class="count-up"></div>
    <div class="render"></div>
</div>`
            ));
            const testView = new EventView({ el: '#d1' });

            testView.$el.find('.count-up').trigger('click');
            await sleep(0);
            expect(testView.$el.find('p').text()).toBe('');
            expect(count).toBe(1);

            testView.$el.find('.render').trigger('click');
            await sleep(0);
            expect(testView.$el.find('p').text()).toBe('EventView');
            expect(count).toBe(2);
        });

        it('check View#delegate() & undelegate()', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            prepareTestElements();
            const testView = new BaseView({ el: '#d1' });

            testView.delegate('click', '#d1', stub.onCallback);

            testView.$el.trigger('click', 'dom');

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(jasmine.any(Event), 'dom');
            expect(count).toBe(1);

            testView.undelegate('click', '#d1');

            testView.$el.trigger('click', 'dom');

            await sleep(0);

            expect(count).toBe(1);
        });
    });

    describe('etc', () => {
        it('check View#id from given', () => {
            const testView = new BaseView({ id: 'test' });
            expect(testView.id).toBe('test');
        });

        it('check View#id from cid', () => {
            const testView = new BaseView();
            expect(testView.id.startsWith('view:')).toBe(true);
        });

        it('check View#$()', () => {
            prepareTestElements($.utils.elementify(`
<div id="d1" class="test-dom" tabindex="-1">
    <p class="test-dom-child">Bingo</p>
</div>`
            ));

            const testView = new BaseView({ el: '#d1' });
            const $child = testView.$('.test-dom-child');
            expect($child.text()).toBe('Bingo');
        });
    });
});
