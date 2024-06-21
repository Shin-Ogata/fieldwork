import {
    deepMerge,
    type SyncContext,
    type CollectionItemQueryOptions,
    type CollectionItemQueryResult,
    Collection,
} from '@cdp/runtime';
import type { ImageItemInfo } from './image-item';
import { ImageModel } from './image-model';
import { type ImageSyncOptions, ImageSync } from './image-sync';

export interface ImageCollectionConstructionOptions extends ImageSyncOptions {
    parse?: true;
    queryOptions?: CollectionItemQueryOptions<ImageModel>;
}

export class ImageCollection extends Collection<ImageModel> {
    static readonly model = ImageModel;
    private readonly _imageSync: ImageSync;

    constructor(options?: ImageCollectionConstructionOptions) {
        super(undefined, deepMerge({ parse: true, queryOptions: { limit: 200, auto: true }, itemNum: 1000 }, options));
        this._imageSync = new ImageSync();
    }

    protected parse(response: ImageItemInfo[]): ImageModel[] {
        return response.map(seed => new ImageModel(seed));
    }

    protected async sync(options?: CollectionItemQueryOptions<ImageModel>): Promise<CollectionItemQueryResult<ImageItemInfo>> {
        const opts = Object.assign({}, this._options, options);
        const items = await this._imageSync.sync('read', this as SyncContext, opts) as ImageItemInfo[];
        return {
            total: items.length,
            items,
            options: opts,
        } as CollectionItemQueryResult<ImageItemInfo>;
    }
}
