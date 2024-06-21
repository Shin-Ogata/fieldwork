import { type ModelConstructor, Model } from '@cdp/runtime';
import type { ImageItemInfo } from './image-item';

const ModelBase = Model as ModelConstructor<Model<ImageItemInfo>, ImageItemInfo>;
export class ImageModel extends ModelBase {
    static idAttribute = 'item_id';
}
