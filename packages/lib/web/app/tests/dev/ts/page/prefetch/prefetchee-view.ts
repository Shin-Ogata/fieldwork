import type { Route } from '@cdp/router';
import { PageView } from '@cdp/app';

export class PrefetcheePageView extends PageView {
    protected onPageInit(thisPage: Route): void {
        console.log(`${thisPage.url}: init`);
    }

    protected onPageMounted(thisPage: Route): void {
        console.log(`${thisPage.url}: mounted`);
    }

    protected onPageBeforeEnter(thisPage: Route): void {
        console.log(`${thisPage.url}: before-enter`);
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
}
