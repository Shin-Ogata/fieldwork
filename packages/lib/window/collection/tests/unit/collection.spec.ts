/* eslint-disable
    @typescript-eslint/no-explicit-any
 */

import {
    PlainObject,
    computeDate,
    sleep,
    setMixClassAttribute,
} from '@cdp/core-utils';
import { Silenceable, EventSource } from '@cdp/events';
import {
    Result,
    RESULT_CODE,
    makeResult,
} from '@cdp/result';
import {
    Model,
    ModelConstructor,
    ModelAttributeInput,
    ModelValidateAttributeOptions,
} from '@cdp/model';
import {
    SortOrder,
    Collection,
    CollectionConstructionOptions,
    CollectionSetOptions,
    CollectionReSortOptions,
} from '@cdp/collection';

describe('collection/base spec', () => {

    interface Track {
        title: string;
        trackArtist: string;
        albumTitle: string;
        size: number;
        duration: number;
        releaseDate: Date;
        compilation: boolean;
    }

    const tracks = [
        { title: '001', trackArtist: 'aaa', albumTitle: 'AAA', duration: 6000, size: 512000, releaseDate: new Date('2009/01/01'), compilation: false, },
        { title: '002', trackArtist: 'aaa', albumTitle: 'BBB', duration: 6000, size: 512000, releaseDate: computeDate(new Date(), -2, 'month'), compilation: true, },
        { title: '003', trackArtist: 'aaa', albumTitle: 'CCC', duration: 7000, size: 512000, releaseDate: new Date(), compilation: false, },
        { title: '004', trackArtist: 'aaa', albumTitle: 'AAA', duration: 4000, size: 128000, releaseDate: computeDate(new Date(), -2, 'month'), compilation: false, },
        { title: '005', trackArtist: 'aaa', albumTitle: 'BBB', duration: 4000, size: 128000, releaseDate: new Date('2010/01/01'), compilation: true, },
        { title: '006', trackArtist: 'aaa', albumTitle: 'CCC', duration: 4000, size: 128000, releaseDate: new Date(), compilation: false, },
        { title: '007', trackArtist: 'bbb', albumTitle: 'AAA', duration: 6000, size: 512000, releaseDate: new Date('2009/01/01'), compilation: false, },
        { title: '008', trackArtist: 'bbb', albumTitle: 'BBB', duration: 6000, size: 512000, releaseDate: computeDate(new Date(), -2, 'month'), compilation: true, },
        { title: '009', trackArtist: 'bbb', albumTitle: 'CCC', duration: 6000, size: 512000, releaseDate: new Date(), compilation: false, },
        { title: '010', trackArtist: 'bbb', albumTitle: 'AAA', duration: 4000, size: 128000, releaseDate: computeDate(new Date(), -2, 'month'), compilation: false, },
        { title: '011', trackArtist: 'bbb', albumTitle: 'BBB', duration: 4000, size: 128000, releaseDate: new Date('2010/01/01'), compilation: true, },
        { title: '012', trackArtist: 'bbb', albumTitle: 'CCC', duration: 4000, size: 128000, releaseDate: new Date(), compilation: false, },
        { title: '013', trackArtist: 'ccc', albumTitle: 'AAA', duration: 6000, size: 512000, releaseDate: new Date('2009/01/01'), compilation: false, },
        { title: '014', trackArtist: 'ccc', albumTitle: 'BBB', duration: 8500, size: 512000, releaseDate: computeDate(new Date(), -2, 'month'), compilation: true, },
        { title: '015', trackArtist: 'ccc', albumTitle: 'CCC', duration: 6000, size: 512000, releaseDate: new Date(), compilation: false, },
        { title: '016', trackArtist: 'ccc', albumTitle: 'AAA', duration: 4000, size: 128000, releaseDate: computeDate(new Date(), -2, 'month'), compilation: false, },
        { title: '017', trackArtist: 'ccc', albumTitle: 'BBB', duration: 4000, size: 128000, releaseDate: new Date('2010/01/01'), compilation: true, },
        { title: '018', trackArtist: 'ccc', albumTitle: 'CCC', duration: 4000, size: 128000, releaseDate: new Date(), compilation: false, },
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

    describe('Collection general', () => {
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

        it('check Collection#get', (): void => {
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
    });

    describe('Collection setup', () => {
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

        it('check Collection#add(object) single', async done => {
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

            done();
        });

        it('check Collection#add(object[]) multiple', async done => {
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

            done();
        });

        it('check Collection#add(Model) single', async done => {
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

            done();
        });

        it('check Collection#add(Model[]) multiple', async done => {
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

            done();
        });

        it('check Collection#add([], { at: positive }) multiple', async done => {
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

            done();
        });

        it('check Collection#add([], { at: negative }) multiple', async done => {
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

            done();
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

        it('check Collection#add([], { merge: false }) default', async done => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 8));
            playlist.on(['@add', '@update'], stub.onCallback);

            const refs = playlist.models.slice();

            const seeds = [
                { title: '004', trackArtist: 'mmm' },
                { title: '005', trackArtist: 'nnn' },
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

            done();
        });

        it('check Collection#add(object[], { merge: true })', async done => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 8));
            playlist.on(['@add', '@update'], stub.onCallback);

            const refs = playlist.models.map(m => m.toJSON());

            const seeds = [
                { title: '004', trackArtist: 'mmm' },
                { title: '005', trackArtist: 'nnn' },
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
            expect(added[0].trackArtist).toBe('mmm');
            expect(added[0].albumTitle).toBe(refs[0].albumTitle);
            expect(added[0].size).toBe(refs[0].size);
            expect(added[0].duration).toBe(refs[0].duration);
            expect(added[0].releaseDate).toEqual(refs[0].releaseDate);
            expect(added[0].compilation).toBe(refs[0].compilation);
            expect(added[1].trackArtist).toBe('nnn');
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
                changes: {
                    added: [],
                    removed: [],
                    merged: added,
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts); // @update
            expect(count).toBe(1);

            done();
        });

        it('check Collection#add(Model[], { merge: true, parse: true })', async done => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 8));
            playlist.on(['@add', '@update'], stub.onCallback);

            const refs = playlist.models.map(m => m.toJSON());

            const seeds = [
                { title: '004', trackArtist: 'mmm' },
                { title: '005', trackArtist: 'nnn' },
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
            expect(added[0].trackArtist).toBe('mmm');
            expect(added[0].albumTitle).toBe(refs[0].albumTitle);
            expect(added[0].size).toBe(refs[0].size);
            expect(added[0].duration).toBe(refs[0].duration);
            expect(added[0].releaseDate).toEqual(refs[0].releaseDate);
            expect(added[0].compilation).toBe(refs[0].compilation);
            expect(added[1].trackArtist).toBe('nnn');
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

            done();
        });

        it('check Collection#add([], { sort: false }) default', async done => {
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

            done();
        });

        it('check Collection#add([], { sort: true })', async done => {
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

            done();
        });

        it('check Collection#remove(object) single', async done => {
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

            expect(stub.onCallback).toHaveBeenCalledWith(removed, playlist,  { index: 4 }); // @remove
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);            // @update
            expect(count).toBe(2);

            playlist.off();

            done();
        });

        it('check Collection#remove(object[]) multiple', async done => {
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

            done();
        });

        it('check Collection#remove(Model) single', async done => {
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

            done();
        });

        it('check Collection#remove(Model[]) multiple', async done => {
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

            done();
        });

        it('check Collection#remove(object[]) no regist', async done => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks);
            playlist.on(['@remove', '@update'], stub.onCallback);

            const seeds = [
                { title: '111', trackArtist: 'bbb', albumTitle: 'BBB', duration: 4000, size: 128000, releaseDate: new Date('2010/01/01'), compilation: true, },
                { title: '112', trackArtist: 'bbb', albumTitle: 'CCC', duration: 4000, size: 128000, releaseDate: new Date(), compilation: false, },
            ];
            const removed = playlist.remove(seeds);

            expect(removed).toBeDefined();
            expect(removed.length).toBe(0);
            expect(playlist.length).toBe(18);

            await sleep(0);
            expect(stub.onCallback).not.toHaveBeenCalled();
            playlist.off();

            done();
        });

        it('check Collection#reset(object[])', async done => {
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

            done();
        });

        it('check Collection#reset(Model[])', async done => {
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

            done();
        });

        it('check Collection#reset()', async done => {
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

            done();
        });

        it('check Collection#set(undefined)', (): void => {
            const playlist = new Playlist(tracks.slice(3, 8));
            const seeds = undefined;
            expect(() => {
                expect(playlist.set(seeds)).toBeUndefined();
            }).not.toThrow();
        });

        it('check Collection#set(object[])', async done => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            // ['004', '006', '008']
            const src   = tracks.slice(3, 8).filter(t => !(parseInt(t.title, 10) % 2)).map(t => new Content(t));
            const seeds = [
                tracks[1],
                { title: '006', trackArtist: 'mmm', },
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
            };

            expect(stub.onCallback).toHaveBeenCalledWith(added[0], playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(added[1], playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(added[2], playlist, receiveOpts); // @add
            expect(stub.onCallback).toHaveBeenCalledWith(src[0], playlist, removeOpts);    // @remove
            expect(stub.onCallback).toHaveBeenCalledWith(src[2], playlist, removeOpts);    // @remove
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);           // @update
            expect(count).toBe(5);

            done();
        });

        it('check Collection handle Model#destroy()', async done => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 5));
            playlist.on(['@remove', '@destroy'], stub.onCallback);

            expect(playlist.length).toBe(2);

            const model = playlist.models[0];
            model.destroy();

            await sleep(0);

            expect(playlist.length).toBe(1);
            expect(stub.onCallback).toHaveBeenCalledWith(model, playlist, { wait: true, index: 0 }); // @remove
            expect(stub.onCallback).toHaveBeenCalledWith(model, playlist, { wait: true });           // @destroy
            expect(count).toBe(2);

            done();
        });
    });

    describe('Collection sort', () => {
        it('check Collection#sort() w/ callback', async done => {
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

            done();
        });

        it('check Collection#sort() error case', () => {
            const playlist = new Playlist(tracks);
            expect(() => {
                playlist.sort();
            }).toThrow(makeResult(RESULT_CODE.ERROR_MVC_INVALID_COMPARATORS, 'Cannot sort a set without a comparator.'));
        });
    });

    describe('Collection advanced', () => {
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
            private _prev: Track;
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
            parse(response: PlainObject | void, options?: CollectionSetOptions): undefined { // eslint-disable-line
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

        it('check Collection#add(CustomModel[]) multiple', async done => {
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

            done();
        });

        it('check Collection#remove(CustomModel[]) multiple', async done => {
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

            done();
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

        it('check Collection received notify w/ CustomModel', async done => {
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

            done();
        });

        it('check Collection#set({ merge: true }) w/ plain object', async done => {
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
                changes: {
                    added: [],
                    removed: [],
                    merged: [added[1]],
                }
            };
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, opts); // @update
            expect(count).toBe(1);

            done();
        });

        it('check Collection#set({ merge: true }) w/ CustomModel error case', () => {
            const list = new CustomTrackList(tracks.slice(3, 5).map(addId));

            expect(() => {
                list.set([
                    { title: '004', trackArtist: 'mmm' },
                    { title: '005', trackArtist: 'nnn' },
                ].map(addId), { merge: true });
            }).toThrowError();
        });

        it('check Collection#set() w/ InvalidModel', async done => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const seed = { title: '001', trackArtist: 'aaa', albumTitle: 'AAA', duration: 0, size: 0, releaseDate: new Date('2009/01/01'), compilation: false, };
            const playlist = new InvalidPlaylist();
            playlist.on('@invalid', stub.onCallback);

            const added = playlist.add([seed]);
            expect(added).toBeUndefined();

            await sleep(0);

            expect(stub.onCallback).toHaveBeenCalledWith(seed, playlist, errorInvalidData, jasmine.anything()); // @invalid
            expect(count).toBe(1);

            done();
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
                { title: '004', trackArtist: 'mmm' },
                { title: '005', trackArtist: 'nnn' },
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
                { title: '004', trackArtist: 'mmm' },
                { title: '005', trackArtist: 'nnn' },
            ].map(addCid), { merge: true, sort: true });
            expect(list.length).toBe(2);
            expect(list.models[0].title).toBe('005');
            expect(list.models[1].title).toBe('004');

            const invalidList = new InvalidPlaylist();
            ret = invalidList.set(tracks.slice(3, 5), { parse: true });
            expect(ret).toBeUndefined();
            expect(invalidList.length).toBe(0);
        });

        it('check Collection#[_onModelEvent(@change)] coverage', () => {
            let list = new CustomTrackList2(tracks.slice(3, 5));
            list.set([
                { title: '004', trackArtist: 'mmm', _cid: '004' },
                { title: '005', trackArtist: 'nnn', _cid: '005' },
            ], { merge: true });
            expect(list.models[0].context.trackArtist).toBe('mmm');
            expect(list.models[1].context.trackArtist).toBe('nnn');

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

        it('check Collection#[_onModelEvent(@add | @remove)] coverage', async done => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(3, 5));
            playlist.on(['@add', '@remove'], stub.onCallback);

            const other = new Playlist(tracks.slice(5, 7));
            const added = other.set(playlist.models);

            expect(playlist.length).toBe(2);
            expect(other.length).toBe(2);
            expect(added[0]).toBe(playlist.models[0]);
            expect(added[1]).toBe(playlist.models[1]);

            await sleep(0);

            expect(stub.onCallback).not.toHaveBeenCalled();
            expect(count).toBe(0);

            done();
        });
    });

});
