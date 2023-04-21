import type { FunctionPropertyNames } from '@cdp/core-utils';
import { t } from '@cdp/i18n';
import type { ViewEventsHash } from '@cdp/view';
import type {
    Route,
    RouteSubFlowParams,
    PageTransitionParams,
} from '@cdp/router';
import { PageView, registerPage } from '@cdp/app';
import { i18nKey } from '../../types';
import { entry } from '../signature';

entry('PAGE_CONTEXT_SUBFLOW_PAGE_B');

class PageSubFlowB extends PageView {
    private _mode: 'normal' | 'subflow' = 'normal';

    events(): ViewEventsHash<HTMLElement, FunctionPropertyNames<PageSubFlowB>> {
        /* eslint-disable @typescript-eslint/unbound-method */
        return {
            'click #page-subflow-b-btn-1': this.onButton1,
            'click #page-subflow-b-btn-2': this.onButton2,
            'click #page-subflow-b-btn-3': this.onButton3,
        };
        /* eslint-enable @typescript-eslint/unbound-method */
    }

    render(): this {
        const btn1label = (): string => {
            return t('normal' === this._mode ? i18nKey.app.subflow.button.beginSubFlowDestA : i18nKey.app.subflow.button.endSubFlow);
        };

        this.$el.data('theme', this._mode);
        this.$el.find('#page-subflow-b-title').text(t(i18nKey.app.subflow.title[`pageB-${this._mode}`]) as string);             // eslint-disable-line
        this.$el.find('#page-subflow-b-desctiption').text(t(i18nKey.app.subflow.description[`pageB-${this._mode}`]) as string); // eslint-disable-line
        this.$el.find('#page-subflow-b-btn-1').text(btn1label());
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
        this._mode = (thisPage.params['mode'] || 'normal') as 'normal' | 'subflow';
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
        if ('subflow' === this._mode) {
            this._router?.commitSubFlow(this.commitOptions);
        } else {
            this._router?.beginSubFlow('/subflow-a/subflow', { base: '/subflow-a' }, { transition: 'slide-up' });
        }
    }

    private onButton2(event: UIEvent): void {
        console.log(`onButton2(${event.type})`);
        this._router?.beginSubFlow('/subflow-a/subflow', {}, { transition: 'slide-up' });
    }

    private onButton3(event: UIEvent): void {
        console.log(`onButton3(${event.type})`);
        this._router?.beginSubFlow(
            '/subflow-a/subflow',
            {
                base: '/view',
                additinalStacks: [
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

///////////////////////////////////////////////////////////////////////
// internal methods

    private querySubFlowDestination(): string | undefined {
        // eslint-disable-next-line
        const { params } = (this._router as any)?.findSubFlowParams(false) as { params: RouteSubFlowParams; };
        if (params?.additinalStacks) {
            return params.additinalStacks[params.additinalStacks.length - 1].url;
        } else if (params?.base) {
            return params.base;
        } else {
            return undefined;
        }
    }

    private get commitOptions(): PageTransitionParams {
        switch (this.querySubFlowDestination()) {
            case '/subflow-c': {
                const { default: transition } = this._router?.transitionSettings() || {};
                return { transition, reverse: true };
            }
            default:
                return {};
        }
    }
}

registerPage({
    path: '/subflow-b/:mode?',
    component: PageSubFlowB,
    content: {
        selector: '#subflow-b',
        url: '/tpl/subflow.tpl',
    },
});
