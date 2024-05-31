import { FunctionPropertyNames } from '@cdp/core-utils';
import { t } from '@cdp/i18n';
import { ViewEventsHash } from '@cdp/view';
import { Route } from '@cdp/router';
import { PageView, registerPage } from '@cdp/app';
import { i18nKey } from '../../types';
import { entry } from '../signature';

entry('PAGE_CONTEXT_SUBFLOW_PAGE_A');

class PageSubFlowA extends PageView {
    private _mode: 'normal' | 'subflow' = 'normal';

    events(): ViewEventsHash<HTMLElement, FunctionPropertyNames<PageSubFlowA>> {
        /* eslint-disable @typescript-eslint/unbound-method */
        return {
            'click #page-subflow-a-btn-1': this.onButton1,
            'click #page-subflow-a-btn-2': this.onButton2,
            'click #page-subflow-a-btn-3': this.onButton3,
            'click #page-subflow-a-btn-4': this.onButton4,
        };
        /* eslint-enable @typescript-eslint/unbound-method */
    }

    render(): this {
        this.$el.data('theme', this._mode);
        this.$el.find('#page-subflow-a-title').text(t(i18nKey.app.subflow.title[`pageA-${this._mode}`]) as string);             // eslint-disable-line
        this.$el.find('#page-subflow-a-desctiption').text(t(i18nKey.app.subflow.description[`pageA-${this._mode}`]) as string); // eslint-disable-line
        this.$el.find('#page-subflow-a-btn-1').text(t(i18nKey.app.subflow.button[`toPageB-${this._mode}`]) as string);          // eslint-disable-line
        return this;
    }

    protected onPageInit(thisPage: Route): void {
        console.log(`${thisPage.url}: init`);
    }

    protected onPageMounted(thisPage: Route): void {
        console.log(`${thisPage.url}: mounted`);
    }

    protected onPageCloned(thisPage: Route): void {
        console.log(`${thisPage.url}: cloned`);
    }

    protected onPageBeforeEnter(thisPage: Route): void {
        console.log(`${thisPage.url}: before-enter`);
        this._mode = (thisPage.params['mode'] ?? 'normal') as 'normal' | 'subflow';
        this.render();
    }

    protected onPageAfterEnter(thisPage: Route): void {
        console.log(`${thisPage.url}: after-enter`);
    }

    protected onPageBeforeLeave(thisPage: Route): void {
        console.log(`${thisPage.url}: before-leave`);
    }

    protected onPageAfterLeave(thisPage: Route): void {
        console.log(`${thisPage.url}: after-leave`);
    }

    protected onPageUnmounted(thisPage: Route): void {
        console.log(`${thisPage.url}: unmounted`);
    }

    protected onPageRemoved(thisPage: Route): void {
        console.log(`${thisPage.url}: removed`);
    }

///////////////////////////////////////////////////////////////////////
// Event Handler

    private onButton1(event: UIEvent): void {
        console.log(`onButton1(${event.type})`);
        const additional = 'subflow' === this._mode ? '/subflow' : '';
        void this._router?.navigate(`/subflow-b${additional}`);
    }

    private onButton2(event: UIEvent): void {
        console.log(`onButton2(${event.type})`);
        void this._router?.beginSubFlow('/subflow-a/subflow', {}, { transition: 'slide-up' });
    }

    private onButton3(event: UIEvent): void {
        console.log(`onButton3(${event.type})`);
        void this._router?.beginSubFlow(
            '/subflow-a/subflow',
            {
                base: '/subflow-a',
                additionalStacks: [
                    {
                        url: '/subflow-b',
                    }
                ],
            },
            {
                transition: 'slide-up',
            }
        );
    }

    private onButton4(event: UIEvent): void {
        console.log(`onButton4(${event.type})`);
        void this._router?.beginSubFlow(
            '/subflow-a/subflow',
            {
                base: '/view',
                additionalStacks: [
                    {
                        url: '/subflow-c',
                    }
                ],
            },
            {
                transition: 'slide-up',
            },
        );
    }
}

registerPage({
    path: '/subflow-a/:mode?',
    component: PageSubFlowA,
    content: {
        selector: '#subflow-a',
        url: '/tpl/subflow.tpl',
    },
});
