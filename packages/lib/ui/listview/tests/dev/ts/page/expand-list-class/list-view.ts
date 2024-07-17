import {
    type FunctionPropertyNames,
    isString,
    CancelToken,
    checkCanceled as cc,
    PromiseManager,
    makeCanceledResult,
    dom as $,
    type ViewEventsHash,
    t,
} from '@cdp/runtime';
import {
    GroupProfile,
    type ListViewConstructOptions,
    ExpandableListView,
} from '@cdp/ui-listview';
import { i18nKey } from '../../types';
import { Toast } from '../../utils';
import {
    type ImageItemInfo,
    generateImageItems,
    type ImageItemInfoGroup,
    generateImageItemGroupList,
} from '../../model/image-item';
import {
    GroupViewParent,
    GroupViewChildPreview,
    GroupViewChildExtra,
} from './group-view';

const enum Const {
    PREVIEW_BASE     = 5,
    EXTRA_MAX        = 40,
    UNIT_COUNT       = 5,   // eslint-disable-line @typescript-eslint/no-duplicate-enum-values
    BASE_HEIGHT      = 80,
    GROUPS_OPERATION = 'operation:groupAll',
}

export interface ExpandListViewConstructionOptions extends ListViewConstructOptions {
    itemNum?: number;
    itemHeight?: number;
}

export class ExpandListView extends ExpandableListView {

    private readonly _prmsManager: PromiseManager;

    constructor(options?: ExpandListViewConstructionOptions) {
        const opts = Object.assign({ itemNum: 1000, itemHeight: 100 }, options);
        super(opts);
        this._prmsManager = new PromiseManager();

        const source = CancelToken.source();
        void this._prmsManager.add(this.fetchParentGroups(opts.itemNum, opts.itemHeight, source.token), source);
    }

///////////////////////////////////////////////////////////////////////
// implements: ExpandableListView

    render(): this {
        return this.update();
    }

    override remove(): this {
        void this._prmsManager.abort(makeCanceledResult('list removed'));
        return super.remove();
    }

    /** すべてのグループを展開 (1階層) 実験実装. topGroup の子要素の準備(時間がかかる) */
    override async expandAll(): Promise<void> {
        if (!this.isStatusIn(Const.GROUPS_OPERATION)) {
            this. statusAddRef(Const.GROUPS_OPERATION);
            const t0 = performance.now();

            try {
                const source = CancelToken.source();
                const prepareTopGroups = async (): Promise<void> => {
                    const topGroups = this.getTopGroups();
                    let group: GroupProfile | undefined;

                    let devIndex = 0;
                    while (group = topGroups.shift()) { // eslint-disable-line no-cond-assign
                        await cc(source.token);
                        if (!group.hasChildren) {
                            const children = await this._prmsManager.add(
                                this.fetchChildGroups(group.id, devIndex, Const.BASE_HEIGHT, source.token),
                                source,
                            );
                            group.addChildren(children);
                        }
                        devIndex++;
                    }
                };

                await this._prmsManager.add(prepareTopGroups(), source);
                await super.expandAll();
            } finally {
                this.statusRelease(Const.GROUPS_OPERATION);

                const tb = performance.now() - t0;
                void Toast.show(`expandAll time: ${tb.toFixed(3)} msec.`);
                console.log(`Time spent expandAll: ${tb} milliseconds.`);
            }
        }
    }

    /** すべてのグループを収束 */
    override async collapseAll(): Promise<void> {
        if (!this.isStatusIn(Const.GROUPS_OPERATION)) {
            this. statusAddRef(Const.GROUPS_OPERATION);
            const t0 = performance.now();

            try {
                await super.collapseAll();
            } finally {
                this.statusRelease(Const.GROUPS_OPERATION);

                const tb = performance.now() - t0;
                void Toast.show(`collapseAll time: ${tb.toFixed(3)} msec.`);
                console.log(`Time spent collapseAll: ${tb} milliseconds.`);
            }
        }
    }

///////////////////////////////////////////////////////////////////////
// implements: ListView event handler

    override events(): ViewEventsHash<HTMLElement, FunctionPropertyNames<ExpandListView>> {
        /* eslint-disable @typescript-eslint/unbound-method */
        return {
            'click .simple-listitem': this.onParentGroupClick,
            'click nav.expand-button.to-expand.enable': this.onExpand,
            'click nav.expand-button.to-collapse.enable': this.onCollapse,
            'click .expandable-listitem': this.onContentSelected,
        };
        /* eslint-enable @typescript-eslint/unbound-method */
    }

    private onParentGroupClick(ev: UIEvent): void {
        ev.preventDefault();
        const $target  = $(ev.target as HTMLElement);
        const devId    = $target.data('dev-id') as string;
        const devIndex = this.getItemInfo(ev).devIndex as number;
        const status   = `operation:${devId}`;
        const source = CancelToken.source();

        if (!this.isStatusIn(status)) {
            void this.statusScope(status, async () => {
                const group = this.getGroup(devId);
                if (!group) {
                    return;
                }
                if (group.hasChildren) {
                    await group.toggle();
                    if (group.isExpanded) {
                        await group.ensureVisible({ setTop: true });
                    }
                } else {
                    const $spinner = $target.find('.spinner');
                    $spinner.addClass('show');
                    this.statusAddRef(status);
                    try {
                        const groups = await this._prmsManager.add(
                            this.fetchChildGroups(devId, devIndex, Const.BASE_HEIGHT, source.token),
                            source,
                        );
                        group.addChildren(groups);
                        await group.expand();
                        await group.ensureVisible({ setTop: true });
                    } finally {
                        this.statusRelease(status);
                        $spinner.removeClass('show');
                    }
                }
            });
        }
    }

    private async onExpand(ev: UIEvent): Promise<void> {
        ev.preventDefault();
        const $target = $(ev.target as HTMLElement);
        const devId   = $target.data('dev-id') as string;
        const status  = `operation:${devId}`;

        if (!this.isStatusIn(status)) {
            await this.statusScope(status, async () => {
                const group = this.getGroup(devId);
                await group?.expand();
                $target.removeClass('to-expand').addClass('to-collapse');
            });
        }
    }

    private async onCollapse(ev: UIEvent): Promise<void> {
        ev.preventDefault();
        const $target = $(ev.target as HTMLElement);
        const devId   = $target.data('dev-id') as string;
        const status  = `operation:${devId}`;

        if (!this.isStatusIn(status)) {
            await this.statusScope(status, async () => {
                const group = this.getGroup(devId);
                await group?.collapse();
                $target.removeClass('to-collapse').addClass('to-expand');
            });
        }
    }

    private onContentSelected(ev: UIEvent): void {
        const devId = $(ev.target as HTMLElement).data('dev-id');
        const devIndex = $(ev.target as HTMLElement).data('dev-index');
        if (isString(devId) && isString(devIndex)) {
            void Toast.show(`[${devIndex}]\n${devId}`);
        }
    }

///////////////////////////////////////////////////////////////////////
// internal:

    /** 親グループを取得 */
    private async fetchParentGroups(itemNum: number, itemHeight: number, cancel: CancelToken): Promise<void> {
        let index = 0;
        const progress = (images: ImageItemInfo[]): void => {
            for (const image of images) {
                const devId = image.item_id;
                const group = this.newGroup(devId);
                group.addItem(itemHeight, GroupViewParent, {
                    devId,
                    images,
                    devIndex: index,
                    /*
                     * Stacking context 対応
                     * https://developer.mozilla.org/ja/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index/Stacking_context
                     * https://ics.media/entry/200609/
                     */
                    zIndex: '10',
                });
                this.registerTopGroup(group);
                index++;
            }
            this.render();
        };

        await generateImageItems(itemNum, { cancel, callback: progress, callbackType: 'unit' });
        void Toast.show(t(i18nKey.app.common.message.listview.loadComplete));
    }

    /** 子グループを取得 */
    private async fetchChildGroups(devId: string, parentIndex: number, baseHeight: number, cancel?: CancelToken): Promise<GroupProfile[]> {
        const profiles: GroupProfile[] = [];

        const data = await generateImageItemGroupList(Const.PREVIEW_BASE, Const.EXTRA_MAX, Const.UNIT_COUNT, { cancel });
        let previewIndex = 0;

        let info: ImageItemInfoGroup | undefined;
        while (info = data.shift()) { // eslint-disable-line no-cond-assign
            await cc(cancel);
            const previewId = `${devId}-preview-${info.preview[0].item_id}`;
            const previewFormatIndex = `${String(parentIndex).padStart(3, '0')}:${previewIndex}`;
            previewIndex++;
            const preview = this.newGroup(previewId);
            preview.addItem(baseHeight, GroupViewChildPreview, {
                devId: previewId,
                images: info.preview,
                parentIndex,
                devIndex: `${previewFormatIndex}-00`,
            });

            const extras: GroupProfile[] = [];
            let extraIndex = 1;
            while (0 < info.extra.length) {
                const images = info.extra.splice(0, Const.UNIT_COUNT);
                const extraId = `${previewId}-extra-${images[0].item_id}`;
                const extraFormatIndex = `${previewFormatIndex}-${String(extraIndex).padStart(2, '0')}`;
                const extra = this.newGroup(extraId);
                extra.addItem(baseHeight, GroupViewChildExtra, {
                    devId: extraId,
                    images,
                    parentIndex,
                    devIndex: extraFormatIndex,
                });
                extras.push(extra);
                extraIndex++;
            }

            preview.addChildren(extras);
            profiles.push(preview);
        }

        return profiles;
    }
}
