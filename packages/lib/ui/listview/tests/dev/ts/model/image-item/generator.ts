/* eslint-disable
    camelcase,
 */

import {
    noop,
    deepCopy,
    luid,
    type Cancelable,
    checkCanceled as cc,
    request,
    toUrl,
} from '@cdp/runtime';
import type {
    ImageItemInfo,
    MetadataInfo,
    ThumbnailInfo,
} from './interfaces';

interface ImageSource {
    readonly id: string;
    readonly mimeType: string;
    readonly width: number;
    readonly height: number;
}

interface Resource {
    images: ImageSource[];
    item: ImageItemInfo;
    metadata: MetadataInfo;
    thumbnail: ThumbnailInfo[];
}

const _resource = {
    images: undefined,
    item: undefined,
    metadata: undefined,
    thumbnail: undefined,
} as unknown as Resource;

const ensureResources = async (): Promise<void> => {
    if (!_resource.images) {
        _resource.images = await request.json(toUrl('/res/images/images.json'));
    }
    if (!_resource.item) {
        _resource.item = await request.json(toUrl('/res/images/item.json'));
    }
    if (!_resource.metadata) {
        _resource.metadata = await request.json(toUrl('/res/images/metadata.json'));
    }
    if (!_resource.thumbnail) {
        _resource.thumbnail = await request.json(toUrl('/res/images/thumbnail.json'));
    }
};

/** ダミーイメージアイテム生成 */
export const createImageItem = async (): Promise<ImageItemInfo> => {
    await ensureResources();

    // 0 - 99 のランダム値
    const random = Math.floor(Math.random() * 100);
    const source = _resource.images[random];
    const dateTime = new Date().toISOString();

    const item = deepCopy(_resource.item);
    item.metadata = deepCopy(_resource.metadata);
    item.thumbnail = deepCopy(_resource.thumbnail);

    item.item_id = luid('dev-item-id:', 8);

    item.mime_type = source.mimeType;
    item.file_name = `${source.id}.jpg`;
    item.width = source.width * 2;
    item.height = source.height * 2;

    item.score = random / 100;

    item.recorded_date
        = item.modified_date
        = item.meta_modified_date
        = item.content_modified_date
        = item.uploaded_date
        = item.metadata.recorded_date
        = dateTime;

    item.thumbnail[0].width = source.width;
    item.thumbnail[0].height = source.height;
    item.thumbnail[0].location = toUrl(`/res/images/org/${source.id}.jpg`);
    item.thumbnail[1].location = toUrl(`/res/images/thumb/${source.id}.jpg.jpg`);

    return item;
};

/** generateImageItems() のオプション */
export interface GenerateImageItemsOptions extends Cancelable {
    /** 進捗単位 */
    unit?: number;
    /** プロパティコールバック */
    callback?: (item: ImageItemInfo | ImageItemInfo[], index: number) => void;
    /** プロパティコールバックの発火条件 [default: both] */
    callbackType?: 'item' | 'unit' | 'both';
}

/**
 * 指定した数だけ ImageItemInfo を生成
 *
 * @param   num     生成数
 * @param   options 生成オプション
 * @returns ImageItemInfo[]
 */
export const generateImageItems = async (num: number, options?: GenerateImageItemsOptions): Promise<ImageItemInfo[]> => {
    const itemsAll: ImageItemInfo[] = [];
    const { unit, callback, cancel, callbackType } = Object.assign({ unit: 100, callback: noop }, options);

    const [fireItem, fireUnit] = (() => {
        switch (callbackType) {
            case 'item':
                return [true, false];
            case 'unit':
                return [false, true];
            default:
                return [true, true];
        }
    })();

    let index = 0, unitIndex = 0;
    while (0 < num) {
        await cc(cancel);

        const size = (unit <= num) ? unit : num;
        num -= size;

        const itemsUnit: ImageItemInfo[] = [];

        for (let i = 0; i < size; i++) {
            const item = await createImageItem();
            fireItem && callback(item, index);
            index++;
            itemsUnit.push(item);
            itemsAll.push(item);
        }

        fireUnit && callback(itemsUnit, unitIndex);
        unitIndex++;
    }

    return itemsAll;
};
