import {
    type FunctionPropertyNames,
    isString,
    CancelToken,
    type Result,
    makeCanceledResult,
    dom as $,
    type ViewEventsHash,
    t,
} from '@cdp/runtime';
import { type ListViewConstructOptions, ListView } from '@cdp/ui-listview';
import { i18nKey } from '../../types';
import { Toast } from '../../utils';
import { type ImageItemInfo, generateImageItems } from '../../model/image-item';
import { ImageListItemView } from './item-view';

export interface SimpleListViewConstructionOptions extends ListViewConstructOptions {
    itemNum?: number;
    itemHeight?: number;
}

export class SortListView extends ListView {

    private _abort?: (reason: Result) => void;

    constructor(options?: SimpleListViewConstructionOptions) {
        const opts = Object.assign({ itemNum: 1000, itemHeight: 100 }, options);
        super(opts);
        void this.fetch(opts.itemNum, opts.itemHeight);
    }

///////////////////////////////////////////////////////////////////////
// implements: ListView

    render(): this {
        return this.update();
    }

    override remove(): this {
        this._abort?.(makeCanceledResult('list removed'));
        this._abort = undefined;
        return super.remove();
    }

///////////////////////////////////////////////////////////////////////
// implements: ListView event handler

    override events(): ViewEventsHash<HTMLElement, FunctionPropertyNames<SortListView>> {
        /* eslint-disable @typescript-eslint/unbound-method */
        return {
            'click .image-listitem': this.onContentSelected,
        };
        /* eslint-enable @typescript-eslint/unbound-method */
    }

    private onContentSelected(ev: UIEvent): void {
        const devId = $(ev.target as HTMLElement).data('dev-id');
        const devIndex = $(ev.target as HTMLElement).data('dev-index');
        if (isString(devId) && null != devIndex) {
            void Toast.show(`[${devIndex as number | string}] ${devId}`);
        }
    }

///////////////////////////////////////////////////////////////////////
// internal:

    private async fetch(itemNum: number, itemHeight: number): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const { cancel, token } = CancelToken.source();
        this._abort = cancel;

        const progress = (images: ImageItemInfo[]): void => {
            for (const image of images) {
                this.addItem(itemHeight, ImageListItemView, {
                    devId: image.item_id,
                    image,
                });
            }
            this.render();
        };

        await generateImageItems(itemNum, { cancel: token, callback: progress, callbackType: 'unit' });
        void Toast.show(t(i18nKey.app.common.message.listview.loadComplete));
    }
}
