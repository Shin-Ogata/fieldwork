/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */

import {
    UnknownObject,
    Constructor,
    GroupByReturnValue,
    sleep,
    groupBy,
    computeDate,
    setMixClassAttribute,
} from '@cdp/core-utils';
import { Silenceable, EventSource } from '@cdp/events';
import {
    Result,
    RESULT_CODE,
    makeResult,
} from '@cdp/result';
import { CancelToken } from '@cdp/promise';
import {
    SyncContext,
    IDataSyncOptions,
    defaultSync,
    dataSyncSTORAGE,
    dataSyncNULL,
} from '@cdp/data-sync';
import {
    Model,
    ModelConstructor,
    ModelAttributeInput,
    ModelValidateAttributeOptions,
} from '@cdp/model';
import {
    SortOrder,
    DynamicOperator,
    CollectionItemProvider,
    CollectionItemQueryOptions,
    CollectionItemQueryResult,
    CollectionFetchProgress,
    Collection,
    CollectionSeed,
    CollectionConstructionOptions,
    CollectionSetOptions,
    CollectionReSortOptions,
    CollectionAfterFilterOptions,
    CollectionQueryOptions,
    searchItems,
    convertSortKeys,
} from '@cdp/collection';

describe('collection/base spec', () => {

    interface Track {
        title: string;
        albumArtist: string;
        albumTitle: string;
        size: number;
        duration: number;
        releaseDate: Date;
        compilation: boolean;
    }

    const tracks = [
        { title: '001', albumArtist: 'aaa', albumTitle: 'AAA', duration: 6000, size: 512000, releaseDate: new Date('2009/01/01'), compilation: false, },
        { title: '002', albumArtist: 'aaa', albumTitle: 'BBB', duration: 6000, size: 512000, releaseDate: computeDate(new Date(), -2, 'month'), compilation: true, },
        { title: '003', albumArtist: 'aaa', albumTitle: 'CCC', duration: 7000, size: 512000, releaseDate: new Date(), compilation: false, },
        { title: '004', albumArtist: 'aaa', albumTitle: 'AAA', duration: 4000, size: 128000, releaseDate: computeDate(new Date(), -2, 'month'), compilation: false, },
        { title: '005', albumArtist: 'aaa', albumTitle: 'BBB', duration: 4000, size: 128000, releaseDate: new Date('2010/01/01'), compilation: true, },
        { title: '006', albumArtist: 'aaa', albumTitle: 'CCC', duration: 4000, size: 128000, releaseDate: new Date(), compilation: false, },
        { title: '007', albumArtist: 'bbb', albumTitle: 'AAA', duration: 6000, size: 512000, releaseDate: new Date('2009/01/01'), compilation: false, },
        { title: '008', albumArtist: 'bbb', albumTitle: 'BBB', duration: 6000, size: 512000, releaseDate: computeDate(new Date(), -2, 'month'), compilation: true, },
        { title: '009', albumArtist: 'bbb', albumTitle: 'CCC', duration: 6000, size: 512000, releaseDate: new Date(), compilation: false, },
        { title: '010', albumArtist: 'bbb', albumTitle: 'AAA', duration: 4000, size: 128000, releaseDate: computeDate(new Date(), -2, 'month'), compilation: false, },
        { title: '011', albumArtist: 'bbb', albumTitle: 'BBB', duration: 4000, size: 128000, releaseDate: new Date('2010/01/01'), compilation: true, },
        { title: '012', albumArtist: 'bbb', albumTitle: 'CCC', duration: 4000, size: 128000, releaseDate: new Date(), compilation: false, },
        { title: '013', albumArtist: 'ccc', albumTitle: 'AAA', duration: 6000, size: 512000, releaseDate: new Date('2009/01/01'), compilation: false, },
        { title: '014', albumArtist: 'ccc', albumTitle: 'BBB', duration: 8500, size: 512000, releaseDate: computeDate(new Date(), -2, 'month'), compilation: true, },
        { title: '015', albumArtist: 'ccc', albumTitle: 'CCC', duration: 6000, size: 512000, releaseDate: new Date(), compilation: false, },
        { title: '016', albumArtist: 'ccc', albumTitle: 'AAA', duration: 4000, size: 128000, releaseDate: computeDate(new Date(), -2, 'month'), compilation: false, },
        { title: '017', albumArtist: 'ccc', albumTitle: 'BBB', duration: 4000, size: 128000, releaseDate: new Date('2010/01/01'), compilation: true, },
        { title: '018', albumArtist: 'ccc', albumTitle: 'CCC', duration: 4000, size: 128000, releaseDate: new Date(), compilation: false, },
    ] as Track[];

    class TrackList extends Collection<Track> { }

    const ContentBase = Model as ModelConstructor<Model<Track>, Track>;
    class Content extends ContentBase {
        static idAttribute = 'title';
    }

    class Playlist extends Collection<Content> {
        static readonly model = Content;
        // eslint-disable-next-line
        constructor(items?: Track[], options?: CollectionConstructionOptions<Content>) {
            super(items, options);
        }
    }

    let count: number;

    beforeEach(() => {
        count = 0;
    });

    // eslint-disable-next-line
    const onCallback = (...args: any[]): void => {
        count++;
    };

    const oddPassFilter = (content: Content | Track): boolean => {
        return !!(parseInt(content.title, 10) % 2);
    };

    const cancelSource = CancelToken.source();
    const { token } = cancelSource;
    cancelSource.cancel(new Error('aborted'));

    describe('construction/destruction', () => {
        it('check construction', (): void => {
            const playlist = new TrackList(tracks);
            expect(playlist).toBeDefined();
            expect(playlist.id).toBeDefined();
            expect(playlist.length).toBe(18);
            expect(playlist.models).toEqual(tracks);

            const playlist2 = new Playlist();
            expect(playlist2).toBeDefined();
            expect(playlist2.id).toBeDefined();
            expect(playlist2.length).toBe(0);
            expect(playlist2.models).toEqual([]);

            const playlist3 = new Playlist(tracks);
            expect(playlist3).toBeDefined();
            expect(playlist3.id).toBeDefined();
            expect(playlist3.length).toBe(18);
            expect(playlist3.models[0].id).toBe('001');
            expect(playlist3.models[17].id).toBe('018');
        });

        it('check Collection#release()', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 5));
            playlist.on(['@add', '@remove', '@update', '@reset'], stub.onCallback);

            const previous = playlist.models.slice();

            playlist.release();

            expect(playlist.length).toBe(0);

            await sleep(0);

            expect(stub.onCallback).not.toHaveBeenCalled();

            playlist.reset(previous.slice(), { silent: true });
            playlist.release({ silent: false }); // no effect

            expect(playlist.length).toBe(0);

            await sleep(0);

            expect(stub.onCallback).not.toHaveBeenCalled();
            expect(count).toBe(0);
        });
    });

    describe('accessor: attributes', () => {
        it('check Collection#id', (): void => {
            const p1 = new Playlist();
            const p2 = new Playlist();

            expect(p1.id).toBeDefined();
            expect(p2.id).toBeDefined();
            expect(p1.id === p2.id).toBe(false);
        });
    });

    describe('operations: utils', () => {
        it('check Collection#get()', (): void => {
            const playlist = new Playlist(tracks);

            let seed: string | object | undefined;
            let content = playlist.get(seed);
            expect(content).toBeUndefined();

            seed = '008';
            content = playlist.get(seed);
            expect(content).toBeDefined();
            expect(content?.title).toBe('008');

            seed = { _cid: (content as any)._cid };
            content = playlist.get(seed);
            expect(content).toBeDefined();
            expect(content?.title).toBe('008');

            seed = content?.clone();
            content = playlist.get(seed);
            expect(content).toBeDefined();
            expect(content?.title).toBe('008');
        });

        it('check Collection#get() w/ filter', (): void => {
            const playlist = new Playlist(tracks);

            // get is not affected by after-filter
            playlist.filter(oddPassFilter);

            let seed: string | object | undefined;
            let content = playlist.get(seed);
            expect(content).toBeUndefined();

            seed = '008';
            content = playlist.get(seed);
            expect(content).toBeDefined();
            expect(content?.title).toBe('008');

            seed = { _cid: (content as any)._cid };
            content = playlist.get(seed);
            expect(content).toBeDefined();
            expect(content?.title).toBe('008');

            seed = content?.clone();
            content = playlist.get(seed);
            expect(content).toBeDefined();
            expect(content?.title).toBe('008');
        });

        it('check Collection#has()', (): void => {
            const playlist = new Playlist(tracks);

            let seed: string | object | undefined;
            let result = playlist.has(seed);
            expect(result).toBe(false);

            seed = '008';
            result = playlist.has(seed);
            expect(result).toBe(true);

            seed = { _cid: (playlist.models[7] as any)._cid };
            result = playlist.has(seed);
            expect(result).toBe(true);
        });

        it('check Collection#has() w/ filter', (): void => {
            const playlist = new Playlist(tracks);

            // get is not affected by after-filter
            playlist.filter(oddPassFilter);

            let seed: string | object | undefined;
            let result = playlist.has(seed);
            expect(result).toBe(false);

            seed = '008';
            result = playlist.has(seed);
            expect(result).toBe(true);

            seed = { _cid: (playlist.models[7] as any)._cid };
            result = playlist.has(seed);
            expect(result).toBe(true);
        });

        it('check Collection#toJSON() w/Model ', () => {
            const playlist = new Playlist(tracks.slice(3, 6));
            const dateInfo = playlist.models.map(m => m.releaseDate);

            const json1 = playlist.toJSON();

            expect(json1).toEqual([
                { title: '004', albumArtist: 'aaa', albumTitle: 'AAA', duration: 4000, size: 128000, releaseDate: dateInfo[0], compilation: false, },
                { title: '005', albumArtist: 'aaa', albumTitle: 'BBB', duration: 4000, size: 128000, releaseDate: dateInfo[1], compilation: true, },
                { title: '006', albumArtist: 'aaa', albumTitle: 'CCC', duration: 4000, size: 128000, releaseDate: dateInfo[2], compilation: false, },
            ]);

            // filtered
            const json2 = playlist.filter({ filter: oddPassFilter }).toJSON();
            expect(json2).toEqual([
                { title: '005', albumArtist: 'aaa', albumTitle: 'BBB', duration: 4000, size: 128000, releaseDate: dateInfo[1], compilation: true, },
            ]);
        });

        it('check Collection#toJSON() w/object ', () => {
            const playlist = new TrackList(tracks.slice(3, 6));
            const dateInfo = playlist.models.map(m => m.releaseDate);

            const json1 = playlist.toJSON();

            expect(json1).toEqual([
                { title: '004', albumArtist: 'aaa', albumTitle: 'AAA', duration: 4000, size: 128000, releaseDate: dateInfo[0], compilation: false, },
                { title: '005', albumArtist: 'aaa', albumTitle: 'BBB', duration: 4000, size: 128000, releaseDate: dateInfo[1], compilation: true, },
                { title: '006', albumArtist: 'aaa', albumTitle: 'CCC', duration: 4000, size: 128000, releaseDate: dateInfo[2], compilation: false, },
            ]);
        });

        it('check Collection#clone() ', () => {
            const playlist1 = new TrackList(tracks.slice(3, 6));
            const playlist2 = playlist1.clone();
            expect(playlist1).not.toBe(playlist2);
            expect(playlist1.toJSON()).toEqual(playlist2.toJSON());
        });

        it('check Collection#sort() w/ callback', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks);
            playlist.on('@sort', stub.onCallback);

            const opts: CollectionReSortOptions<Track> = {
                sortKeys: [
                    { name: 'title', order: SortOrder.DESC, type: 'string' },
                ],
            };

            const self = playlist.sort(opts);

            expect(self).toBe(playlist);
            expect(playlist.models[0].id).toBe('018');
            expect(playlist.models[1].id).toBe('017');
            expect(playlist.models[16].id).toBe('002');
            expect(playlist.models[17].id).toBe('001');

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, opts); // @sort
            expect(count).toBe(1);
        });

        it('check Collection#sort() error case', () => {
            const playlist = new Playlist(tracks);
            expect(() => {
                playlist.sort();
            }).toThrow(makeResult(RESULT_CODE.ERROR_MVC_INVALID_COMPARATORS, 'Cannot sort a set without a comparator.'));
        });

        it('check Collection#sort() error case w/ noThrow', () => {
            const playlist = new Playlist(tracks);
            expect(() => {
                playlist.sort({ noThrow: true });
            }).not.toThrow();
        });

        it('check Collection#filter() w/ callback', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks);
            playlist.on('@filter', stub.onCallback);

            const opts: CollectionAfterFilterOptions<Content> = {
                filter: oddPassFilter,
                silent: true,
            };

            expect(playlist.filtered).toBe(false);

            const models = playlist.filter(opts).models;

            expect(playlist.filtered).toBe(true);
            expect(models.length).toBe(9);
            expect(models[0].id).toBe('001');
            expect(models[8].id).toBe('017');

            await sleep(0);

            expect(stub.onCallback).not.toHaveBeenCalled();
            expect(count).toBe(0);

            // same filter
            const models2 = playlist.filter(oddPassFilter, { silent: false }).models;

            expect(playlist.filtered).toBe(true);
            expect(models2.length).toBe(9);
            expect(models2[0].id).toBe('001');
            expect(models2[8].id).toBe('017');

            await sleep(0);

            expect(stub.onCallback).not.toHaveBeenCalled();
            expect(count).toBe(0);

            // release after-filter
            const models3 = playlist.filter(undefined).models;

            expect(playlist.filtered).toBe(false);
            expect(models3.length).toBe(18);
            expect(models3[0].id).toBe('001');
            expect(models3[8].id).toBe('009');

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, {}); // @filter
            expect(count).toBe(1);
        });

        it('check Collection#at()', () => {
            const playlist = new Playlist(tracks);
            let track = playlist.at(0);
            expect(track.title).toBe('001');
            track = playlist.at(1.7);
            expect(track.title).toBe('002');
            track = playlist.at(-1);
            expect(track.title).toBe('018');
            track = playlist.at(-2.9);
            expect(track.title).toBe('017');

            expect(() => playlist.at(19)).toThrow(new RangeError('invalid array index. [length: 18, given: 19]'));
            expect(() => playlist.at(-19)).toThrow(new RangeError('invalid array index. [length: 18, given: -19]'));
        });

        it('check Collection#at() w/ filter', () => {
            const playlist = new Playlist(tracks);
            playlist.filter(oddPassFilter);
            let track = playlist.at(0);
            expect(track.title).toBe('001');
            track = playlist.at(1.7);
            expect(track.title).toBe('003');
            track = playlist.at(-1);
            expect(track.title).toBe('017');
            track = playlist.at(-2.9);
            expect(track.title).toBe('015');

            expect(() => playlist.at(10)).toThrow(new RangeError('invalid array index. [length: 9, given: 10]'));
            expect(() => playlist.at(-10)).toThrow(new RangeError('invalid array index. [length: 9, given: -10]'));
        });

        it('check Collection#first()', () => {
            const playlist = new Playlist(tracks);
            const track = playlist.first();
            expect(track?.title).toBe('001');
            const list = playlist.first(3);
            expect(list[0].title).toBe('001');
            expect(list[1].title).toBe('002');
            expect(list[2].title).toBe('003');
        });

        it('check Collection#first() w/ filter', () => {
            const playlist = new Playlist(tracks);
            playlist.filter(oddPassFilter);
            const track = playlist.first();
            expect(track?.title).toBe('001');
            const list = playlist.first(3);
            expect(list[0].title).toBe('001');
            expect(list[1].title).toBe('003');
            expect(list[2].title).toBe('005');
        });

        it('check Collection#last()', () => {
            const playlist = new Playlist(tracks);
            const track = playlist.last();
            expect(track?.title).toBe('018');
            const list = playlist.last(3);
            expect(list[0].title).toBe('016');
            expect(list[1].title).toBe('017');
            expect(list[2].title).toBe('018');
        });

        it('check Collection#last() w/ filter', () => {
            const playlist = new Playlist(tracks);
            playlist.filter(oddPassFilter);
            const track = playlist.last();
            expect(track?.title).toBe('017');
            const list = playlist.last(3);
            expect(list[0].title).toBe('013');
            expect(list[1].title).toBe('015');
            expect(list[2].title).toBe('017');
        });
    });

    describe('operations: sync', () => {
        class SyncPlaylist extends Playlist {
            // eslint-disable-next-line
            constructor(items?: Track[], options?: CollectionConstructionOptions<Content>) {
                super(items, options);
            }
            get url(): string {
                return 'test';
            }
            protected parse(response: CollectionSeed[]): Track[] {
                return response.map(seed => {
                    const date = seed.releaseDate;
                    seed.releaseDate = new Date(date);
                    return seed;
                }) as Track[];
            }
        }

        const prepareRegistry = (): void => {
            // The schema is similar to Backbone.LocalStorage, but id-list is not csv, and sepalator is '::'.
            const ids = tracks.map(t => t.title);
            localStorage.setItem('test', JSON.stringify(ids));
            for (const t of tracks) {
                localStorage.setItem(`test::${t.title}`, JSON.stringify(t));
            }
        };

        const _dummyContext = new SyncPlaylist();

        const customProvider = async (options: CollectionQueryOptions<Track>): Promise<CollectionItemQueryResult<Track>> => {
            const opts = Object.assign({}, options, { noSearch: true }/* sort, filter を provider 側で行うため */);

            const { index, limit, filter, sortKeys: keys, comparators: comps } = opts;
            const comparators = comps || convertSortKeys(keys || []);

            const items = await dataSyncSTORAGE.sync('read', _dummyContext as SyncContext, options as IDataSyncOptions) as Track[];
            const targets = searchItems(items, filter, ...comparators);
            const results = targets.slice(index, limit && (index! + limit!)); // eslint-disable-line

            return {
                total: items.length,
                items: results,
                options: opts,
            };
        };

        class RichPlaylist extends SyncPlaylist {
            constructor(items?: Track[], options?: CollectionConstructionOptions<Content>) {
                super(items, Object.assign({ parse: true }, options));
            }
            protected sync(options?: CollectionItemQueryOptions<Content>): Promise<CollectionItemQueryResult<object>> {
                return customProvider((options || {}) as CollectionQueryOptions<Track>) as any;
            }
        }

        beforeEach(() => {
            prepareRegistry();
            defaultSync(dataSyncSTORAGE);
        });

        afterEach(() => {
            localStorage.clear();
            defaultSync(dataSyncNULL);
        });

        it('check Collection#fetch({ parse: true }) simple version', async () => {
            { // prepare simple registry
                localStorage.clear();
                localStorage.setItem('test', JSON.stringify(tracks));
            }

            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new SyncPlaylist();
            playlist.on(['@sync', '@error'], stub.onCallback);

            const resp = await playlist.fetch({ parse: true });

            expect(resp).toBeDefined();
            expect(resp.length).toBe(18);
            expect(playlist.models.length).toBe(18);

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, resp, { parse: true, progress: jasmine.anything() }); // @sync
            expect(count).toBe(1);
        });

        it('check Collection#fetch({ parse: true }) standard (Backbone.LocalStorage scheme)', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new SyncPlaylist();
            playlist.on(['@sync', '@error'], stub.onCallback);

            const resp = await playlist.fetch({ parse: true });

            expect(resp).toBeDefined();
            expect(resp.length).toBe(18);
            expect(playlist.models.length).toBe(18);

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, resp, { parse: true, progress: jasmine.anything() }); // @sync
            expect(count).toBe(1);
        });

        it('check Collection#fetch() w/ progress', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new SyncPlaylist(undefined, { provider: customProvider as CollectionItemProvider<Content> });
            playlist.on(['@sync', '@error'], stub.onCallback);

            let progressCount = 0;
            const store: Track[] = [];
            const onProgress = (info: CollectionItemQueryResult<Track>): void => {
                progressCount++;
                store.push(...info.items);
                expect(info.total).toBe(18);
            };

            const resp1 = await playlist.fetch({
                parse: true,
                index: 0,
                limit: 3,
                auto: true,
                progress: onProgress as CollectionFetchProgress<Content>,
            });

            expect(resp1).toBeDefined();
            expect(resp1.length).toBe(18);
            expect(playlist.models.length).toBe(18);
            expect(progressCount).toBe(6);
            expect(store.length).toBe(18);

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, resp1, jasmine.anything()); // @sync
            expect(count).toBe(1);

            progressCount = 0;
            store.length = 0;

            const resp2 = await playlist.fetch({
                parse: true,
                index: 10,
                limit: 6,
                auto: true,
                reset: true,
                progress: onProgress as CollectionFetchProgress<Content>,
            });

            expect(resp2).toBeDefined();
            expect(resp2.length).toBe(8);
            expect(playlist.models.length).toBe(8);
            expect(progressCount).toBe(2);
            expect(store.length).toBe(8);

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, resp2, jasmine.anything()); // @sync
            expect(count).toBe(2);
        });

        it('check Collection#fetch({ reset, noCache })', async () => {
            const playlist = new RichPlaylist();
            const resp1 = await playlist.fetch({
                index: 10,
                limit: 3,
            });

            expect(resp1.length).toBe(3);
            expect(playlist.models.length).toBe(3);
            expect(playlist.models[0].id).toBe('011');
            expect(playlist.models[1].id).toBe('012');
            expect(playlist.models[2].id).toBe('013');

            const resp2 = await playlist.fetch({
                index: 3,
                limit: 3,
                reset: false,
                noCache: true,
            });

            expect(resp2.length).toBe(3);
            expect(playlist.models.length).toBe(6);
            expect(playlist.models[0].id).toBe('011');
            expect(playlist.models[1].id).toBe('012');
            expect(playlist.models[2].id).toBe('013');
            expect(playlist.models[3].id).toBe('004');
            expect(playlist.models[4].id).toBe('005');
            expect(playlist.models[5].id).toBe('006');

            const resp3 = await playlist.fetch({
                index: 6,
                limit: 3,
                reset: true,
            });

            expect(resp3.length).toBe(3);
            expect(playlist.models.length).toBe(3);
            expect(playlist.models[0].id).toBe('007');
            expect(playlist.models[1].id).toBe('008');
            expect(playlist.models[2].id).toBe('009');

            const resp4 = await playlist.fetch({
                reset: true,
            });

            expect(resp4.length).toBe(18);
            expect(playlist.models.length).toBe(18);
            expect(playlist.models[0].id).toBe('001');
            expect(playlist.models[17].id).toBe('018');
        });

        it('check Collection#requery()', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new RichPlaylist();
            playlist.on(['@sync', '@error'], stub.onCallback);

            let resp = await playlist.fetch({
                sortKeys: [{ name: 'title', order: SortOrder.DESC, type: 'string' }],
                filter: oddPassFilter,
            });

            expect(playlist.models.length).toBe(9);

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, resp, jasmine.anything()); // @sync
            expect(count).toBe(1);

            playlist.reset();
            expect(playlist.models.length).toBe(0);

            resp = await playlist.requery();

            expect(playlist.models.length).toBe(9);

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, resp, jasmine.anything()); // @sync
            expect(count).toBe(2);
        });

        it('check Collection#fetch() w/ error case', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new RichPlaylist();
            playlist.on(['@sync', '@error'], stub.onCallback);

            try {
                await playlist.fetch({ cancel: token });
            } catch (e) {
                expect(e.message).toBe('aborted');
            }

            expect(stub.onCallback).toHaveBeenCalledWith(undefined, playlist, jasmine.any(Error), jasmine.anything()); // @error
            expect(count).toBe(1);
        });
    });

    describe('operations: collection setup', () => {
        it('check Collection#add(object) single', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist();
            playlist.on(['@add', '@update'], stub.onCallback);

            const seed = tracks[4] as { title: string; }; // cast single object to avoid interface type.
            const added = playlist.add(seed);

            expect(added).toBeDefined();
            expect(added.id).toBe('005');
            expect(playlist.length).toBe(1);

            await sleep(0);

            const receiveOpts = {
                add: true,
                remove: false,
                merge: false,
                parse: undefined,
                changes: {
                    added: playlist.models,
                    removed: [],
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(playlist.models[0], playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);                     // @update
            expect(count).toBe(2);

            playlist.off();
        });

        it('check Collection#add(object[]) multiple', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist();
            playlist.on(['@add', '@update'], stub.onCallback);

            const seeds = tracks.slice(3, 5);
            const added = playlist.add(seeds);

            expect(added).toBeDefined();
            expect(added.length).toBe(2);
            expect(added[0].id).toBe('004');
            expect(added[1].id).toBe('005');
            expect(playlist.length).toBe(2);

            await sleep(0);

            const receiveOpts = {
                add: true,
                remove: false,
                merge: false,
                parse: undefined,
                changes: {
                    added: playlist.models,
                    removed: [],
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(playlist.models[0], playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(playlist.models[1], playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);                     // @update
            expect(count).toBe(3);

            playlist.off();
        });

        it('check Collection#add(Model) single', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist();
            playlist.on(['@add', '@update'], stub.onCallback);

            const seed = new Content(tracks[2]);
            const added = playlist.add(seed);

            expect(added).toBeDefined();
            expect(added.id).toBe('003');
            expect(playlist.length).toBe(1);

            await sleep(0);

            const receiveOpts = {
                add: true,
                remove: false,
                merge: false,
                parse: undefined,
                changes: {
                    added: [seed],
                    removed: [],
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(seed, playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);       // @update
            expect(count).toBe(2);

            playlist.off();
        });

        it('check Collection#add(Model[]) multiple', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist();
            playlist.on(['@add', '@update'], stub.onCallback);

            const seeds = tracks.slice(3, 5).map(t => new Content(t));
            const added = playlist.add(seeds);

            expect(added).toBeDefined();
            expect(added.length).toBe(2);
            expect(added[0].id).toBe('004');
            expect(added[1].id).toBe('005');
            expect(playlist.length).toBe(2);

            await sleep(0);

            const receiveOpts = {
                add: true,
                remove: false,
                merge: false,
                parse: undefined,
                changes: {
                    added: seeds,
                    removed: [],
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(seeds[0], playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(seeds[1], playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);           // @update
            expect(count).toBe(3);

            playlist.off();
        });

        it('check Collection#add([], { at: positive }) multiple', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 8));
            playlist.on(['@add', '@update'], stub.onCallback);

            const seeds = tracks.slice(0, 2);
            const added = playlist.add(seeds, { at: 2 });

            expect(added).toBeDefined();
            expect(added.length).toBe(2);
            expect(added[0].id).toBe('001');
            expect(added[1].id).toBe('002');
            expect(playlist.length).toBe(7);
            expect(playlist.models[0].id).toBe('004');
            expect(playlist.models[1].id).toBe('005');
            expect(playlist.models[2].id).toBe('001');
            expect(playlist.models[3].id).toBe('002');
            expect(playlist.models[4].id).toBe('006');
            expect(playlist.models[5].id).toBe('007');
            expect(playlist.models[6].id).toBe('008');

            await sleep(0);

            const receiveOpts = {
                at: 2,
                index: 3,
                add: true,
                remove: false,
                merge: false,
                parse: undefined,
                changes: {
                    added,
                    removed: [],
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(added[0], playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(added[1], playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);           // @update
            expect(count).toBe(3);
        });

        it('check Collection#add([], { at: negative }) multiple', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 8));
            playlist.on(['@add', '@update'], stub.onCallback);

            const seeds = tracks.slice(0, 2);
            const added = playlist.add(seeds, { at: -2 });

            expect(added).toBeDefined();
            expect(added.length).toBe(2);
            expect(added[0].id).toBe('001');
            expect(added[1].id).toBe('002');
            expect(playlist.length).toBe(7);
            expect(playlist.models[0].id).toBe('004');
            expect(playlist.models[1].id).toBe('005');
            expect(playlist.models[2].id).toBe('006');
            expect(playlist.models[3].id).toBe('001');
            expect(playlist.models[4].id).toBe('002');
            expect(playlist.models[5].id).toBe('007');
            expect(playlist.models[6].id).toBe('008');

            await sleep(0);

            const receiveOpts = {
                at: -2,
                index: 4,
                add: true,
                remove: false,
                merge: false,
                parse: undefined,
                changes: {
                    added,
                    removed: [],
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(added[0], playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(added[1], playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);           // @update
            expect(count).toBe(3);
        });

        it('check Collection#add([], { at: over border }) multiple', (): void => {
            const partial = tracks.slice(3, 8);
            const seeds = tracks.slice(0, 2);

            const playlist = new Playlist(partial, { silent: true });
            playlist.add(seeds, { at: 5 });

            expect(playlist.models[0].id).toBe('004');
            expect(playlist.models[1].id).toBe('005');
            expect(playlist.models[2].id).toBe('006');
            expect(playlist.models[3].id).toBe('007');
            expect(playlist.models[4].id).toBe('008');
            expect(playlist.models[5].id).toBe('001');
            expect(playlist.models[6].id).toBe('002');

            playlist.reset(partial, { silent: true });
            playlist.add(seeds, { at: 6, silent: true });

            expect(playlist.models[0].id).toBe('004');
            expect(playlist.models[1].id).toBe('005');
            expect(playlist.models[2].id).toBe('006');
            expect(playlist.models[3].id).toBe('007');
            expect(playlist.models[4].id).toBe('008');
            expect(playlist.models[5].id).toBe('001');
            expect(playlist.models[6].id).toBe('002');

            playlist.reset(partial, { silent: true });
            playlist.add(seeds, { at: -5, silent: true });

            expect(playlist.models[0].id).toBe('001');
            expect(playlist.models[1].id).toBe('002');
            expect(playlist.models[2].id).toBe('004');
            expect(playlist.models[3].id).toBe('005');
            expect(playlist.models[4].id).toBe('006');
            expect(playlist.models[5].id).toBe('007');
            expect(playlist.models[6].id).toBe('008');

            playlist.reset(partial, { silent: true });
            playlist.add(seeds, { at: -6, silent: true });

            expect(playlist.models[0].id).toBe('001');
            expect(playlist.models[1].id).toBe('002');
            expect(playlist.models[2].id).toBe('004');
            expect(playlist.models[3].id).toBe('005');
            expect(playlist.models[4].id).toBe('006');
            expect(playlist.models[5].id).toBe('007');
            expect(playlist.models[6].id).toBe('008');
        });

        it('check Collection#add([], { merge: false }) default', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 8));
            playlist.on(['@add', '@update'], stub.onCallback);

            const refs = playlist.models.slice();

            const seeds = [
                { title: '004', albumArtist: 'mmm' },
                { title: '005', albumArtist: 'nnn' },
            ];
            const added = playlist.add(seeds, { merge: false });

            expect(added).toBeDefined();
            expect(added.length).toBe(2);
            expect(playlist.length).toBe(5);
            expect(playlist.models[0].id).toBe('004');
            expect(playlist.models[1].id).toBe('005');
            expect(playlist.models[2].id).toBe('006');
            expect(playlist.models[3].id).toBe('007');
            expect(playlist.models[4].id).toBe('008');
            expect(added[0] === refs[0]).toBe(true);
            expect(added[1] === refs[1]).toBe(true);

            await sleep(0);
            expect(stub.onCallback).not.toHaveBeenCalled();
            playlist.off();
        });

        it('check Collection#add(object[], { merge: true })', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 8));
            playlist.on(['@add', '@update'], stub.onCallback);

            const refs = playlist.models.map(m => m.toJSON());

            const seeds = [
                { title: '004', albumArtist: 'mmm' },
                { title: '005', albumArtist: 'nnn' },
            ];
            const added = playlist.add(seeds, { merge: true });

            expect(added).toBeDefined();
            expect(added.length).toBe(2);
            expect(playlist.length).toBe(5);
            expect(playlist.models[0].id).toBe('004');
            expect(playlist.models[1].id).toBe('005');
            expect(playlist.models[2].id).toBe('006');
            expect(playlist.models[3].id).toBe('007');
            expect(playlist.models[4].id).toBe('008');
            expect(added[0].albumArtist).toBe('mmm');
            expect(added[0].albumTitle).toBe(refs[0].albumTitle);
            expect(added[0].size).toBe(refs[0].size);
            expect(added[0].duration).toBe(refs[0].duration);
            expect(added[0].releaseDate).toEqual(refs[0].releaseDate);
            expect(added[0].compilation).toBe(refs[0].compilation);
            expect(added[1].albumArtist).toBe('nnn');
            expect(added[1].albumTitle).toBe(refs[1].albumTitle);
            expect(added[1].size).toBe(refs[1].size);
            expect(added[1].duration).toBe(refs[1].duration);
            expect(added[1].releaseDate).toEqual(refs[1].releaseDate);
            expect(added[1].compilation).toBe(refs[1].compilation);

            await sleep(0);

            const receiveOpts = {
                add: true,
                remove: false,
                merge: true,
                parse: undefined,
                changes: {
                    added: [],
                    removed: [],
                    merged: added,
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts); // @update
            expect(count).toBe(1);
        });

        it('check Collection#add(Model[], { merge: true, parse: true })', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 8));
            playlist.on(['@add', '@update'], stub.onCallback);

            const refs = playlist.models.map(m => m.toJSON());

            const seeds = [
                { title: '004', albumArtist: 'mmm' },
                { title: '005', albumArtist: 'nnn' },
            ].map(t => new Content(t));
            const added = playlist.add(seeds, { merge: true, parse: true });

            expect(added).toBeDefined();
            expect(added.length).toBe(2);
            expect(playlist.length).toBe(5);
            expect(playlist.models[0].id).toBe('004');
            expect(playlist.models[1].id).toBe('005');
            expect(playlist.models[2].id).toBe('006');
            expect(playlist.models[3].id).toBe('007');
            expect(playlist.models[4].id).toBe('008');
            expect(added[0].albumArtist).toBe('mmm');
            expect(added[0].albumTitle).toBe(refs[0].albumTitle);
            expect(added[0].size).toBe(refs[0].size);
            expect(added[0].duration).toBe(refs[0].duration);
            expect(added[0].releaseDate).toEqual(refs[0].releaseDate);
            expect(added[0].compilation).toBe(refs[0].compilation);
            expect(added[1].albumArtist).toBe('nnn');
            expect(added[1].albumTitle).toBe(refs[1].albumTitle);
            expect(added[1].size).toBe(refs[1].size);
            expect(added[1].duration).toBe(refs[1].duration);
            expect(added[1].releaseDate).toEqual(refs[1].releaseDate);
            expect(added[1].compilation).toBe(refs[1].compilation);

            await sleep(0);

            const receiveOpts = {
                add: true,
                remove: false,
                merge: true,
                parse: true,
                changes: {
                    added: [],
                    removed: [],
                    merged: added,
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts); // @update
            expect(count).toBe(1);
        });

        it('check Collection#add([], { sort: false }) default', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 8), {
                queryOptions: {
                    sortKeys: [
                        { name: 'title', order: SortOrder.DESC, type: 'string' },
                    ],
                }
            });
            playlist.on(['@add', '@update', '@sort'], stub.onCallback);

            const seeds = tracks.slice(0, 2);
            const added = playlist.add(seeds, { sort: false });

            expect(playlist.models[0].id).toBe('008');
            expect(playlist.models[1].id).toBe('007');
            expect(playlist.models[2].id).toBe('006');
            expect(playlist.models[3].id).toBe('005');
            expect(playlist.models[4].id).toBe('004');
            expect(playlist.models[5].id).toBe('001');
            expect(playlist.models[6].id).toBe('002');

            await sleep(0);

            const receiveOpts = {
                add: true,
                remove: false,
                merge: false,
                sort: false,
                parse: undefined,
                changes: {
                    added,
                    removed: [],
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(added[0], playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(added[1], playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);           // @update
            expect(count).toBe(3);
        });

        it('check Collection#add([], { sort: true })', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 8), {
                queryOptions: {
                    sortKeys: [
                        { name: 'title', order: SortOrder.DESC, type: 'string' },
                    ],
                }
            });
            playlist.on(['@add', '@update', '@sort'], stub.onCallback);

            const seeds = tracks.slice(0, 2);
            const added = playlist.add(seeds, { sort: true });

            expect(playlist.models[0].id).toBe('008');
            expect(playlist.models[1].id).toBe('007');
            expect(playlist.models[2].id).toBe('006');
            expect(playlist.models[3].id).toBe('005');
            expect(playlist.models[4].id).toBe('004');
            expect(playlist.models[5].id).toBe('002');
            expect(playlist.models[6].id).toBe('001');

            await sleep(0);

            const receiveOpts = {
                add: true,
                remove: false,
                merge: false,
                sort: true,
                parse: undefined,
                changes: {
                    added,
                    removed: [],
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(added[0], playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(added[1], playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);           // @update/@sort
            expect(count).toBe(4);
        });

        it('check Collection#remove(object) single', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks);
            playlist.on(['@remove', '@update'], stub.onCallback);

            const seed = tracks[4] as { title: string; }; // cast single object to avoid interface type.
            const removed = playlist.remove(seed);

            expect(removed).toBeDefined();
            expect(removed.id).toBe('005');
            expect(playlist.length).toBe(17);

            await sleep(0);

            const receiveOpts = {
                changes: {
                    added: [],
                    removed: [removed],
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(removed, playlist, { index: 4 }); // @remove
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);            // @update
            expect(count).toBe(2);

            playlist.off();
        });

        it('check Collection#remove(object[]) multiple', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks);
            playlist.on(['@remove', '@update'], stub.onCallback);

            const seeds = tracks.slice(3, 5);
            const removed = playlist.remove(seeds);

            expect(removed).toBeDefined();
            expect(removed.length).toBe(2);
            expect(removed[0].id).toBe('004');
            expect(removed[1].id).toBe('005');
            expect(playlist.length).toBe(16);

            await sleep(0);

            const receiveOpts = {
                changes: {
                    added: [],
                    removed,
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(removed[0], playlist, { index: 3 }); // @remove
            expect(stub.onCallback).toHaveBeenCalledWith(removed[1], playlist, { index: 3 }); // @remove
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);              // @update
            expect(count).toBe(3);

            playlist.off();
        });

        it('check Collection#remove(Model) single', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks);
            playlist.on(['@remove', '@update'], stub.onCallback);

            const seed = new Content(tracks[2]);
            const removed = playlist.remove(seed);

            expect(removed).toBeDefined();
            expect(removed.id).toBe('003');
            expect(playlist.length).toBe(17);

            await sleep(0);

            const receiveOpts = {
                changes: {
                    added: [],
                    removed: [removed],
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(removed, playlist, { index: 2 });  // @remove
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);            // @update
            expect(count).toBe(2);

            playlist.off();
        });

        it('check Collection#remove(Model[]) multiple', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks);
            playlist.on(['@remove', '@update'], stub.onCallback);

            const seeds = tracks.slice(3, 5).map(t => new Content(t));
            const removed = playlist.remove(seeds);

            expect(removed).toBeDefined();
            expect(removed.length).toBe(2);
            expect(removed[0].id).toBe('004');
            expect(removed[1].id).toBe('005');
            expect(playlist.length).toBe(16);

            await sleep(0);

            const receiveOpts = {
                changes: {
                    added: [],
                    removed,
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(removed[0], playlist, { index: 3 }); // @remove
            expect(stub.onCallback).toHaveBeenCalledWith(removed[1], playlist, { index: 3 }); // @remove
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);              // @update
            expect(count).toBe(3);

            playlist.off();
        });

        it('check Collection#remove(object[]) no regist', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks);
            playlist.on(['@remove', '@update'], stub.onCallback);

            const seeds = [
                { title: '111', albumArtist: 'bbb', albumTitle: 'BBB', duration: 4000, size: 128000, releaseDate: new Date('2010/01/01'), compilation: true, },
                { title: '112', albumArtist: 'bbb', albumTitle: 'CCC', duration: 4000, size: 128000, releaseDate: new Date(), compilation: false, },
            ];
            const removed = playlist.remove(seeds);

            expect(removed).toBeDefined();
            expect(removed.length).toBe(0);
            expect(playlist.length).toBe(18);

            await sleep(0);
            expect(stub.onCallback).not.toHaveBeenCalled();
            playlist.off();
        });

        it('check Collection#reset(object[])', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 5));
            playlist.on(['@add', '@remove', '@update', '@reset'], stub.onCallback);

            const previous = playlist.models.slice();

            const seeds = tracks.slice(3, 8);
            const added = playlist.reset(seeds);

            expect(added).toBeDefined();
            expect(added.length).toBe(5);
            expect(playlist.length).toBe(5);

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, { previous });  // @update
            expect(count).toBe(1);
        });

        it('check Collection#reset(Model[])', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 5));
            playlist.on(['@add', '@remove', '@update', '@reset'], stub.onCallback);

            const previous = playlist.models.slice();

            const seeds = tracks.slice(3, 8).map(t => new Content(t));
            const added = playlist.reset(seeds, { silent: false });

            expect(added).toBeDefined();
            expect(added.length).toBe(5);
            expect(playlist.length).toBe(5);

            await sleep(0);

            const receiveOpts = {
                silent: false,
                add: true,
                remove: false,
                merge: false,
                previous,
                parse: undefined,
                changes: {
                    added,
                    removed: [],
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(seeds[0], playlist, receiveOpts);  // @add
            expect(stub.onCallback).toHaveBeenCalledWith(seeds[1], playlist, receiveOpts);  // @add
            expect(stub.onCallback).toHaveBeenCalledWith(seeds[2], playlist, receiveOpts);  // @add
            expect(stub.onCallback).toHaveBeenCalledWith(seeds[3], playlist, receiveOpts);  // @add
            expect(stub.onCallback).toHaveBeenCalledWith(seeds[4], playlist, receiveOpts);  // @add
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);            // @update, @reset
            expect(count).toBe(7);
        });

        it('check Collection#reset()', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 5));
            playlist.on(['@add', '@remove', '@update', '@reset'], stub.onCallback);

            const previous = playlist.models.slice();

            const added = playlist.reset();

            expect(added).toBeDefined();
            expect(added.length).toBe(0);
            expect(playlist.length).toBe(0);

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, { previous });  // @update
            expect(count).toBe(1);
        });

        it('check Collection#set(undefined)', (): void => {
            const playlist = new Playlist(tracks.slice(3, 8));
            const seeds = undefined;
            expect(() => {
                expect(playlist.set(seeds)).toBeUndefined();
            }).not.toThrow();
        });

        it('check Collection#set(object[])', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            // ['004', '006', '008']
            const src = tracks.slice(3, 8).filter(t => !(parseInt(t.title, 10) % 2)).map(t => new Content(t));
            const seeds = [
                tracks[1],
                { title: '006', albumArtist: 'mmm', },
                tracks[16],
            ];

            const playlist = new Playlist(src);
            playlist.on(['@add', '@remove', '@update'], stub.onCallback);

            const added = playlist.set(seeds);

            expect(added).toBeDefined();
            expect(added.length).toBe(3);
            expect(added[0].id).toBe('002');
            expect(added[1].id).toBe('006');
            expect(added[2].id).toBe('017');
            expect(playlist.models[0].id).toBe('002');
            expect(playlist.models[1].id).toBe('006');
            expect(playlist.models[2].id).toBe('017');

            await sleep(0);

            const receiveOpts = {
                add: true,
                remove: true,
                merge: true,
                parse: undefined,
                changes: {
                    added: [added[0], added[2]],
                    removed: [src[0], src[2]],
                    merged: [src[1]],
                },
            };

            const removeOpts = {
                index: 1,
                add: true,
                remove: true,
                merge: true,
                parse: undefined,
            };

            expect(stub.onCallback).toHaveBeenCalledWith(added[0], playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(added[2], playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(src[0], playlist, removeOpts);    // @remove
            expect(stub.onCallback).toHaveBeenCalledWith(src[2], playlist, removeOpts);    // @remove
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);           // @update
            expect(count).toBe(5);
        });

        it('check Collection handle Model#destroy()', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 5));
            playlist.on(['@remove', '@destroy'], stub.onCallback);

            expect(playlist.length).toBe(2);

            const model = playlist.models[0];
            model.destroy();

            await sleep(0);

            expect(playlist.length).toBe(1);
            expect(stub.onCallback).toHaveBeenCalledWith(model, playlist, { wait: true, syncMethod: 'delete', index: 0 }); // @remove
            expect(stub.onCallback).toHaveBeenCalledWith(model, playlist, { wait: true, syncMethod: 'delete' });           // @destroy
            expect(count).toBe(2);
        });

        it('check Collection#push()', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 5));
            playlist.on(['@add', '@update'], stub.onCallback);

            const added = playlist.push(tracks[0]);

            expect(playlist.models.length).toBe(3);
            expect(playlist.models[0].title).toBe('004');
            expect(playlist.models[1].title).toBe('005');
            expect(playlist.models[2].title).toBe('001');

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(added, playlist, jasmine.anything());  // @add
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, jasmine.anything());         // @update
            expect(count).toBe(2);
        });

        it('check Collection#push() w/ filter', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 5));
            playlist.on(['@add', '@update'], stub.onCallback);
            playlist.filter(oddPassFilter);

            const added = playlist.push(tracks[1]);

            expect(playlist.models.length).toBe(1);
            expect(playlist.models[0].title).toBe('005');

            playlist.filter(undefined);

            expect(playlist.models.length).toBe(3);
            expect(playlist.models[0].title).toBe('004');
            expect(playlist.models[1].title).toBe('005');
            expect(playlist.models[2].title).toBe('002');

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(added, playlist, jasmine.anything()); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, jasmine.anything());        // @update
            expect(count).toBe(2);
        });

        it('check Collection#pop()', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 5));
            playlist.on(['@remove', '@update'], stub.onCallback);

            const removed = playlist.pop();

            expect(playlist.models.length).toBe(1);
            expect(playlist.models[0].title).toBe('004');
            expect(removed?.title).toBe('005');

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(removed, playlist, jasmine.anything()); // @remove
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, jasmine.anything());          // @update
            expect(count).toBe(2);

            const removed2 = playlist.pop();
            expect(removed2?.title).toBe('004');

            const removed3 = playlist.pop();
            expect(removed3).toBeUndefined();
        });

        it('check Collection#pop() w/ filter', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks);
            playlist.on(['@remove', '@update'], stub.onCallback);
            playlist.filter(oddPassFilter);

            const removed = playlist.pop();

            expect(playlist.models.length).toBe(9);
            expect(removed?.title).toBe('018');

            playlist.filter(undefined);

            expect(playlist.models.length).toBe(17);

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(removed, playlist, jasmine.anything()); // @remove
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, jasmine.anything());          // @update
            expect(count).toBe(2);
        });

        it('check Collection#unshift()', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 5));
            playlist.on(['@add', '@update'], stub.onCallback);

            const added = playlist.unshift(tracks[0]);

            expect(playlist.models.length).toBe(3);
            expect(playlist.models[0].title).toBe('001');
            expect(playlist.models[1].title).toBe('004');
            expect(playlist.models[2].title).toBe('005');

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(added, playlist, jasmine.anything());  // @add
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, jasmine.anything());         // @update
            expect(count).toBe(2);
        });

        it('check Collection#unshift() w/ filter', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 5));
            playlist.on(['@add', '@update'], stub.onCallback);
            playlist.filter(oddPassFilter);

            const added = playlist.unshift(tracks[1]);

            expect(playlist.models.length).toBe(1);
            expect(playlist.models[0].title).toBe('005');

            playlist.filter(undefined);

            expect(playlist.models.length).toBe(3);
            expect(playlist.models[0].title).toBe('002');
            expect(playlist.models[1].title).toBe('004');
            expect(playlist.models[2].title).toBe('005');

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(added, playlist, jasmine.anything()); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, jasmine.anything());        // @update
            expect(count).toBe(2);
        });

        it('check Collection#shift()', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 5));
            playlist.on(['@remove', '@update'], stub.onCallback);

            const removed = playlist.shift();

            expect(playlist.models.length).toBe(1);
            expect(playlist.models[0].title).toBe('005');
            expect(removed?.title).toBe('004');

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(removed, playlist, jasmine.anything()); // @remove
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, jasmine.anything());          // @update
            expect(count).toBe(2);

            const removed2 = playlist.shift();
            expect(removed2?.title).toBe('005');

            const removed3 = playlist.shift();
            expect(removed3).toBeUndefined();
        });

        it('check Collection#shift() w/ filter', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks);
            playlist.on(['@remove', '@update'], stub.onCallback);
            playlist.filter(oddPassFilter);

            const removed = playlist.shift();

            expect(playlist.models.length).toBe(8);
            expect(removed?.title).toBe('001');

            playlist.filter(undefined);

            expect(playlist.models.length).toBe(17);

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(removed, playlist, jasmine.anything()); // @remove
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, jasmine.anything());          // @update
            expect(count).toBe(2);
        });

        it('check Collection#create(object)', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new TrackList();
            playlist.on(['@add', '@update', '@error'], stub.onCallback);

            const result = playlist.create(tracks[0]);
            expect(result).toBeDefined();

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(result, playlist, jasmine.anything()); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, jasmine.anything());         // @update
        });

        it('check Collection#create(object, { wait: true })', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new TrackList();
            playlist.on(['@add', '@update', '@error'], stub.onCallback);

            const result = playlist.create(tracks[0], { wait: true });
            expect(result).toBeDefined();

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(result, playlist, jasmine.anything()); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, jasmine.anything());         // @update
        });

        it('check Collection#create(Model)', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist();
            playlist.on(['@add', '@update', '@error'], stub.onCallback);

            const result = playlist.create(tracks[0]);
            expect(result).toBeDefined();

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(result, playlist, jasmine.anything()); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, jasmine.anything());         // @update
        });

        it('check Collection#create(Model, { wait: true })', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist();
            playlist.on(['@add', '@update', '@error'], stub.onCallback);

            const result = playlist.create(tracks[0], { wait: true });
            expect(result).toBeDefined();

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(result, playlist, jasmine.anything()); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, jasmine.anything());         // @update
        });

        it('check Collection#create(Model) w/ error', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist();
            playlist.on(['@add', '@update', '@error'], stub.onCallback);

            const result = playlist.create(tracks[0], { wait: true, cancel: token });
            expect(result).toBeDefined();
            expect(playlist.length).toBe(0);

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(result, playlist, jasmine.any(Error), jasmine.anything()); // @error
        });
    });

    describe('operations: model edit', () => {
        it('check model attribute edited', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks);
            playlist.on('@change', stub.onCallback);

            const target1 = playlist.models[5];
            const target2 = playlist.models[3];

            target1.albumTitle  = 'hoge';
            target2.albumArtist = 'fuga';

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(target1, playlist, {}); // @change
            expect(stub.onCallback).toHaveBeenCalledWith(target2, playlist, {}); // @change
            expect(count).toBe(2);
        });

        it('check model attribute edited w/ partial listening', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks);
            playlist.on('@change:albumTitle', stub.onCallback);

            const target1 = playlist.models[5];
            const target2 = playlist.models[3];

            target1.albumTitle  = 'hoge';
            target2.albumArtist = 'fuga';

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(target1, playlist, {}); // @change:albumTitle
            expect(count).toBe(1);
        });
    });

    describe('implements: Iterable<T>', () => {
        it('check [Symbol.iterator]', (): void => {
            const playlist = new TrackList(tracks);
            let count = 0;
            for (const t of playlist) {
                expect(t).toEqual(tracks[count]);
                count++;
            }
        });

        it('check entries()', (): void => {
            const playlist = new TrackList(tracks);
            let count = 0;
            for (const [key, value] of playlist.entries()) {
                expect(key).toBe(String(count));
                expect(value).toEqual(tracks[count]);
                count++;
            }
        });

        it('check key()', (): void => {
            const playlist = new TrackList(tracks);
            let count = 0;
            for (const key of playlist.keys()) {
                expect(key).toBe(String(count));
                count++;
            }
        });

        it('check values()', (): void => {
            const playlist = new Playlist(tracks);
            let count = 0;
            for (const value of playlist.values()) {
                count++;
                expect(value.id).toBe(String(count).padStart(3, '0'));
            }
        });

        it('check [Symbol.iterator] w/ after-filter', (): void => {
            const playlist = new TrackList(tracks);
            playlist.filter({ filter: oddPassFilter });
            let position = 0;
            for (const t of playlist) {
                expect(t).toEqual(tracks[position]);
                position += 2;
            }
        });

        it('check entries() w/ after-filter', (): void => {
            const playlist = new TrackList(tracks);
            playlist.filter(oddPassFilter);
            let count = 0;
            let position = 0;
            for (const [key, value] of playlist.entries()) {
                expect(key).toBe(String(count));
                expect(value).toEqual(tracks[position]);
                count++;
                position += 2;
            }
        });
    });

    describe('example: music library', () => {
        type AlbumSeed = GroupByReturnValue<Track, keyof Track, 'duration' | 'size'>;

        class Album extends Collection<Content> {
            static readonly model = Content;

            constructor(seed: AlbumSeed, options: CollectionConstructionOptions<Content>) {
                super(undefined, Album.defaultOptions(seed, options));
                this._queryResult = seed;
                if (seed.items) {
                    this.reset(seed.items, Object.assign({ silent: true }, options));
                }
            }

            private static defaultOptions(seed: AlbumSeed, options: CollectionConstructionOptions<Content>): CollectionConstructionOptions<Content> {
                const { albumArtist, albumTitle } = seed;
                const base: CollectionConstructionOptions<Content> = {
                    queryOptions: {
                        condition: {
                            operators: [
                                {
                                    operator: DynamicOperator.EQUAL,
                                    prop: 'albumArtist',
                                    value: albumArtist as string,
                                },
                                {
                                    operator: DynamicOperator.EQUAL,
                                    prop: 'albumTitle',
                                    value: albumTitle as string,
                                },
                            ],
                            sortKeys: [
                                { name: 'title', order: SortOrder.ASC, type: 'string' },
                            ],
                            sumKeys: [
                                'duration',
                                'size',
                            ],
                        },
                        sortKeys: [
                            { name: 'title', order: SortOrder.ASC, type: 'string' },
                        ],
                    }
                };
                return Object.assign({}, base, options);
            }

            private get _queryResult(): AlbumSeed | undefined {
                return this._queryInfo.cache as unknown as AlbumSeed;
            }

            private set _queryResult(seed: AlbumSeed | undefined) {
                this._queryInfo.cache = { ...seed } as unknown as CollectionItemQueryResult<Content>;
            }

            /** アルバムアーティスト*/
            get artist(): string {
                return this._queryResult?.albumArtist as string || '';
            }

            /** アルバムタイトル*/
            get title(): string {
                return this._queryResult?.albumTitle as string || '';
            }

            /** アルバム内の曲数 */
            get totalTracks(): number {
                return this._queryResult?.items.length || 0;
            }

            /** 総演奏時間を取得 [msec] */
            get totalDuration(): number {
                return this._queryResult?.duration as number || 0;
            }

            /** 総ファイルサイズ [byte] */
            get totalSize(): number {
                return this._queryResult?.size as number || 0;
            }

            get tracks(): readonly Content[] {
                return this.models;
            }

            // @override clone()
            clone(): this {
                const { constructor, _options, _queryResult } = this;
                return new (constructor as Constructor<this>)(_queryResult, _options);
            }

            protected sync(options?: CollectionItemQueryOptions<Content>): Promise<CollectionItemQueryResult<object>> {
                return Promise.resolve({
                    total: tracks.length,
                    items: tracks.slice(),                                                                  // return all tracks
                    options: Object.assign({ condition: this._options.queryOptions?.condition }, options),  // call conditionalFix() signature
                } as CollectionItemQueryResult<object>);
            }
        }

        class AlbumList extends Collection<Album> {
            static readonly model = Album;

            constructor() {
                super(undefined, {
                    queryOptions: {
                        sortKeys: [
                            { name: 'artist', order: SortOrder.DESC, type: 'string' },
                        ],
                    },
                });
            }

            get albums(): readonly Album[] {
                return this.models;
            }

            protected sync(options?: CollectionItemQueryOptions<Album>): Promise<CollectionItemQueryResult<object>> {
                const seeds = groupBy(tracks, { keys: ['albumTitle', 'albumArtist'], sumKeys: ['duration', 'size'] });
                return Promise.resolve({
                    total: seeds.length,
                    items: seeds.slice(),
                    options,
                } as CollectionItemQueryResult<object>);
            }
        }

        it('example music library traversing', async () => {
            const identify = (album: Album): string => {
                const { artist, title, totalTracks, totalDuration, totalSize } = album;
                return `${artist}-${title}-${totalTracks}:${totalDuration}:${totalSize}`;
            };

            const list = new AlbumList();
            const resp1 = await list.requery();

            expect(resp1).toBeDefined();
            expect(resp1.length).toBe(9);
            expect(list.models.length).toBe(9);

            expect(identify(list.albums[0])).toBe('ccc-AAA-2:10000:640000');
            expect(identify(list.albums[1])).toBe('ccc-BBB-2:12500:640000');
            expect(identify(list.albums[2])).toBe('ccc-CCC-2:10000:640000');
            expect(identify(list.albums[3])).toBe('bbb-AAA-2:10000:640000');
            expect(identify(list.albums[4])).toBe('bbb-BBB-2:10000:640000');
            expect(identify(list.albums[5])).toBe('bbb-CCC-2:10000:640000');
            expect(identify(list.albums[6])).toBe('aaa-AAA-2:10000:640000');
            expect(identify(list.albums[7])).toBe('aaa-BBB-2:10000:640000');
            expect(identify(list.albums[8])).toBe('aaa-CCC-2:11000:640000');

            const album = list.albums[4];

            expect(album.tracks[0].title).toBe('008');
            expect(album.tracks[1].title).toBe('011');

            const resp2 = await album.requery();

            expect(resp2).toBeDefined();
            expect(resp2.length).toBe(2);
            expect(album.models.length).toBe(2);

            expect(album.tracks[0].title).toBe('008');
            expect(album.tracks[1].title).toBe('011');
        });
    });

    describe('advanced', () => {
        interface CustomTrackEvent {
            '@add': [CustomTrack, unknown, Silenceable];
            '@remove': [CustomTrack, unknown, Silenceable];
            '@change': CustomTrack;
        }

        class CustomTrack extends EventSource<CustomTrackEvent> {
            protected _track: Track;
            constructor(t: Track) {
                super();
                this._track = { ...t };
            }
            get title(): string {
                return this._track.title;
            }
            get id(): string | undefined {
                return (this._track as any).id;
            }
            get context(): any {
                return this._track;
            }
        }
        // ほかの EventSource 派生クラスへの誤判定抑止
        setMixClassAttribute(CustomTrack, 'instanceOf');

        class CustomTrackList extends Collection<CustomTrack> {
            static readonly model = CustomTrack;
        }

        class CustomTrack2 extends CustomTrack {
            get _cid(): string {
                return this._track.title;
            }
            setAttributes(attributes: any, options?: Silenceable): this {
                Object.assign(this._track, attributes);
                const { silent } = options || {};
                if (!silent) {
                    this.trigger('@change', this);
                }
                return this;
            }
        }

        class CustomTrackList2 extends CustomTrackList {
            static readonly model = CustomTrack2;
        }

        class CustomTrack3 extends CustomTrack2 {
            private _prev: Track & UnknownObject;
            constructor(t: Track) {
                super(t);
                this._prev = { ...this._track };
            }
            get _cid(): string {
                return this._track.title;
            }
            setAttributes(attributes: any, options?: Silenceable): this {
                this._prev = { ...this._track };
                return super.setAttributes(attributes, options);
            }
            previous(attr: string): any {
                return this._prev[attr];
            }
        }

        class CustomTrackList3 extends CustomTrackList2 {
            static readonly model = CustomTrack3;
        }

        const errorInvalidData = makeResult(RESULT_CODE.ERROR_MVC_INVALID_DATA, 'size is readonly.');

        class InvalidClass extends Content {
            protected validateAttributes<A extends Track>(attrs: ModelAttributeInput<A>, options?: ModelValidateAttributeOptions): Result {
                if (null == attrs.size || attrs.size <= 0) {
                    return errorInvalidData;
                }
                return super.validateAttributes(attrs, options);
            }
        }

        class InvalidPlaylist extends Collection<InvalidClass> {
            static readonly model = InvalidClass;
            parse(response: CollectionSeed | void, options?: CollectionSetOptions): undefined { // eslint-disable-line
                return undefined;
            }
        }

        const addId = (t: any): Track => {
            const ex = { ...t };
            ex.id = t.title;
            return ex;
        };

        const addCid = (t: any): Track => {
            const ex = { ...t };
            ex._cid = t.title;
            return ex;
        };

        it('check Collection#add(CustomModel[]) multiple', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new CustomTrackList();
            playlist.on(['@add', '@update'], stub.onCallback);

            const seeds = tracks.slice(3, 5).map(t => new CustomTrack(t));
            const added = playlist.add(seeds);

            expect(added).toBeDefined();
            expect(added.length).toBe(2);
            expect(added[0].title).toBe('004');
            expect(added[1].title).toBe('005');
            expect(playlist.length).toBe(2);

            await sleep(0);

            const receiveOpts = {
                add: true,
                remove: false,
                merge: false,
                parse: undefined,
                changes: {
                    added: seeds,
                    removed: [],
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(seeds[0], playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(seeds[1], playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);           // @update
            expect(count).toBe(3);

            playlist.off();
        });

        it('check Collection#remove(CustomModel[]) multiple', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new CustomTrackList(tracks.map(addId));
            playlist.on(['@remove', '@update'], stub.onCallback);

            const seeds = tracks.slice(3, 5).map(addId).map(t => new CustomTrack(t));
            const removed = playlist.remove(seeds);

            expect(removed).toBeDefined();
            expect(removed.length).toBe(2);
            expect(removed[0].title).toBe('004');
            expect(removed[1].title).toBe('005');
            expect(playlist.length).toBe(16);

            await sleep(0);

            const receiveOpts = {
                changes: {
                    added: [],
                    removed,
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(removed[0], playlist, { index: 3 }); // @remove
            expect(stub.onCallback).toHaveBeenCalledWith(removed[1], playlist, { index: 3 }); // @remove
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);              // @update
            expect(count).toBe(3);

            playlist.off();
        });

        it('check Collection#set/reset(plain[])', () => {
            let playlist = new TrackList(tracks);
            playlist.reset();
            expect(playlist.length).toBe(0);

            playlist = new TrackList(tracks.map(addCid));
            playlist.set([], { remove: true });
            expect(playlist.length).toBe(0);

            playlist = new TrackList(tracks.map(addCid));
            playlist.set([], { remove: true, silent: true });
            expect(playlist.length).toBe(0);
        });

        it('check Collection received notify w/ CustomModel', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const seed = { ...tracks[3] } as unknown as { id: string; };
            seed.id = tracks[3].title;
            const playlist = new TrackList();
            playlist.on(['@add', '@remove', '@update'], stub.onCallback);

            const added = playlist.add(seed);
            expect(playlist.length).toBe(1);
            const removed = playlist.remove(seed);
            expect(playlist.length).toBe(0);

            await sleep(0);

            const optsAdd = {
                add: true,
                remove: false,
                merge: false,
                parse: undefined,
                changes: {
                    added: [added],
                    removed: [],
                    merged: [],
                }
            };

            const optsRemove = {
                changes: {
                    added: [],
                    removed: [removed],
                    merged: [],
                }
            };

            expect(stub.onCallback).toHaveBeenCalledWith(added, playlist, optsAdd);        // @add
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, optsAdd);               // @update
            expect(stub.onCallback).toHaveBeenCalledWith(removed, playlist, { index: 0 }); // @remove
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, optsRemove);            // @update
            expect(count).toBe(4);
        });

        it('check Collection#set({ merge: true }) w/ plain object', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const seed = { ...tracks[3] } as unknown as { id: string; };
            seed.id = tracks[3].title;
            const playlist = new TrackList([seed]);
            playlist.on(['@update'], stub.onCallback);

            const added = playlist.set([seed, { ...seed, _cid: 'cid' }, seed], { add: false, merge: true, remove: false });
            expect(playlist.length).toBe(1);
            expect(added.length).toBe(3);
            expect((playlist.models[0] as any)._cid).toBe('cid');

            await sleep(0);

            const opts = {
                add: false,
                remove: false,
                merge: true,
                parse: undefined,
                changes: {
                    added: [],
                    removed: [],
                    merged: [added[1]],
                }
            };
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, opts); // @update
            expect(count).toBe(1);
        });

        it('check Collection#set({ merge: true }) w/ CustomModel error case', () => {
            const list = new CustomTrackList(tracks.slice(3, 5).map(addId));

            expect(() => {
                list.set([
                    { title: '004', albumArtist: 'mmm' },
                    { title: '005', albumArtist: 'nnn' },
                ].map(addId), { merge: true });
            }).toThrowError();
        });

        it('check Collection#set() w/ InvalidModel', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const seed = { title: '001', albumArtist: 'aaa', albumTitle: 'AAA', duration: 0, size: 0, releaseDate: new Date('2009/01/01'), compilation: false, };
            const playlist = new InvalidPlaylist();
            playlist.on('@invalid', stub.onCallback);

            const added = playlist.add([seed]);
            expect(added).toBeUndefined();

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(seed, playlist, errorInvalidData, jasmine.anything()); // @invalid
            expect(count).toBe(1);
        });

        it('check Collection#set() coverage', () => {
            let playlist = new Playlist();

            let ret = playlist.set([]);
            expect(ret).toBeUndefined();

            ret = playlist.set(tracks.slice(3, 5), { add: false });
            expect(ret.length).toBe(2);
            expect(playlist.length).toBe(0);

            playlist.set(tracks.slice(3, 5));
            playlist.set([tracks[4], tracks[3]], { merge: false });
            expect(playlist.length).toBe(2);
            expect(playlist.models[0].id).toBe('005');
            expect(playlist.models[1].id).toBe('004');

            playlist = new Playlist(tracks.slice(3, 5), {
                queryOptions: {
                    sortKeys: [
                        { name: 'title', order: SortOrder.DESC, type: 'string' },
                    ],
                }
            });

            playlist.set([
                { title: '004', albumArtist: 'mmm' },
                { title: '005', albumArtist: 'nnn' },
            ], { merge: true, sort: true });
            expect(playlist.length).toBe(2);
            expect(playlist.models[0].id).toBe('005');
            expect(playlist.models[1].id).toBe('004');

            const list = new TrackList(tracks.slice(3, 5).map(addCid), {
                queryOptions: {
                    sortKeys: [
                        { name: 'title', order: SortOrder.DESC, type: 'string' },
                    ],
                }
            });

            list.set([
                { title: '004', albumArtist: 'mmm' },
                { title: '005', albumArtist: 'nnn' },
            ].map(addCid), { merge: true, sort: true });
            expect(list.length).toBe(2);
            expect(list.models[0].title).toBe('005');
            expect(list.models[1].title).toBe('004');

            const invalidList = new InvalidPlaylist();
            ret = invalidList.set(tracks.slice(3, 5), { parse: true });
            expect(ret).toBeUndefined();
            expect(invalidList.length).toBe(0);
        });

        it('check Collection#create() w/ InvalidModel', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const seed = { title: '001', albumArtist: 'aaa', albumTitle: 'AAA', duration: 0, size: 0, releaseDate: new Date('2009/01/01'), compilation: false, };
            const playlist = new InvalidPlaylist();
            playlist.on('@invalid', stub.onCallback);

            const added = playlist.create(seed);
            expect(added).toBeUndefined();

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(seed, playlist, errorInvalidData, jasmine.anything()); // @invalid
            expect(count).toBe(1);
        });

        it('check Collection#[_onModelEvent(@change)] coverage', () => {
            let list = new CustomTrackList2(tracks.slice(3, 5));
            list.set([
                { title: '004', albumArtist: 'mmm', _cid: '004' },
                { title: '005', albumArtist: 'nnn', _cid: '005' },
            ], { merge: true });
            expect(list.models[0].context.albumArtist).toBe('mmm');
            expect(list.models[1].context.albumArtist).toBe('nnn');

            list = new CustomTrackList2(tracks.slice(3, 5).map(addId));
            list.set([
                { title: 'mmm', _cid: '004' },
                { title: 'nnn', _cid: '005' },
            ].map(addId), { merge: true });
            expect(list.models[0].title).toBe('mmm');
            expect(list.models[1].title).toBe('nnn');

            list = new CustomTrackList3(tracks.slice(3, 5).map(addId));
            list.set([
                { title: 'mmm', _cid: '004' },
                { title: 'nnn', _cid: '005' },
            ].map(addId), { merge: true });
            expect(list.models[0].title).toBe('mmm');
            expect(list.models[1].title).toBe('nnn');
        });

        it('check Collection#[_onModelEvent(@add | @remove)] coverage', async () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 5));
            playlist.on(['@add', '@remove'], stub.onCallback);

            const other = new Playlist(tracks.slice(5, 7));
            const added = other.set(playlist.models as Content[]);

            expect(playlist.length).toBe(2);
            expect(other.length).toBe(2);
            expect(added[0]).toBe(playlist.models[0]);
            expect(added[1]).toBe(playlist.models[1]);

            await sleep(0);

            expect(stub.onCallback).not.toHaveBeenCalled();
            expect(count).toBe(0);
        });
    });

});
