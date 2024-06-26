import {
    getTransformMatrixValues,
    setTransformTransition,
    clearTransition,
} from '@cdp/ui-utils';
import { dom as $ } from '@cdp/runtime';
import { prepareTestElements, cleanupTestElements } from './tools';

describe('ui-utils/css spec', () => {

    afterEach(() => {
        cleanupTestElements();
    });

    it('check getTransformMatrixValues', () => {
        prepareTestElements();
        const el = $('#d1')[0];
        const style = document.createElement('style');
        style.textContent = `
#d1 {
    position: relative;
    width: 20px;
    height: 20px;
    transform: translate3d(10px, 20px, 30px) scale3d(0.5, 0.25, 0.75);
}
        `;
        el.append(style);

        const { translateX, translateY, translateZ, scaleX, scaleY, scaleZ } = getTransformMatrixValues(el);
        expect(translateX).toBe(10);
        expect(translateY).toBe(20);
        expect(translateZ).toBe(30);
        expect(scaleX).toBe(0.5);
        expect(scaleY).toBe(0.25);
        expect(scaleZ).toBe(0.75);
    });

    it('check setTransformTransition & clearTransition', async () => {
        prepareTestElements();
        const $el = $('#d1');
        $el.css('height', '10px').reflow();

        const promise = new Promise(resolve => {
            $el.transitionEnd(() => {
                clearTransition($el[0]);
                resolve('called');
            });
        });
        setTransformTransition($el[0], 'height', 100);

        $el.css('height', '100px');

        const status = await promise;
        expect(status).toBe('called');
    });
});
