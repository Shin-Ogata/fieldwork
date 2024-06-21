import {
    type IDataSync,
    type SyncContext,
    type SyncResult,
} from '@cdp/runtime';
import {
    type ImageItemInfo,
    type GenerateImageItemsOptions,
    generateImageItems,
} from './image-item';

export interface ImageSyncOptions extends GenerateImageItemsOptions {
    itemNum?: number;
}

export class ImageSync implements IDataSync<ImageItemInfo[]> {

///////////////////////////////////////////////////////////////////////
// implements: IDataSync

    get kind(): string {
        return 'test-image';
    }

    sync(method: 'read', context: SyncContext, options?: GenerateImageItemsOptions): Promise<SyncResult<ImageItemInfo[]>> {
        const opts = Object.assign({ itemNum: 1000 }, options);
        const response = generateImageItems(opts.itemNum, opts);
        context.trigger('@request', context, response);
        return response;
    }
}
