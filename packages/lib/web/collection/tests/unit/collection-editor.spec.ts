import { ArrayChangeType } from '@cdp/observable';
import { RESULT_CODE, toResult } from '@cdp/result';
import { Model, ModelConstructor } from '@cdp/model';
import {
    Collection,
    CollectionEvent,
    ListChanged,
    ListEditOptions,
    clearCollection,
    appendCollection,
    insertCollection,
    reorderCollection,
    removeCollection,
} from '@cdp/collection';

describe('collection-editor spec', () => {

    interface TrackAttribute {
        id: string;
        title: string;
        artist: string;
        album: string;
    }

    const tracks: TrackAttribute[] = [
        { id: '01', title: '001', artist: 'aaa', album: 'AAA' },
        { id: '02', title: '002', artist: 'bbb', album: 'AAA' },
        { id: '03', title: '003', artist: 'ccc', album: 'AAA' },
        { id: '04', title: '004', artist: 'aaa', album: 'BBB' },
        { id: '05', title: '005', artist: 'bbb', album: 'BBB' },
        { id: '06', title: '006', artist: 'ccc', album: 'BBB' },
        { id: '07', title: '007', artist: 'aaa', album: 'CCC' },
        { id: '08', title: '008', artist: 'bbb', album: 'CCC' },
        { id: '09', title: '009', artist: 'ccc', album: 'CCC' },
    ];

    const TrackBase = Model as ModelConstructor<Model<TrackAttribute>, TrackAttribute>;
    class Track extends TrackBase {}

    class Playlist<TEvent extends CollectionEvent<Track> = CollectionEvent<Track>> extends Collection<Track, TEvent> {
        static readonly model = Track;
        get tracks(): readonly Track[] { return this.models; }
    }

    let count: number;

    beforeEach(() => {
        count = 0;
    });

    // eslint-disable-next-line
    const onCallback = (...args: any[]): void => {
        count++;
    };

    const oddPassFilter = (content: Track): boolean => {
        return !!(parseInt(content.title, 10) % 2);
    };

    describe('basic', () => {
        it('check clearCollection()', async done => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(0, 3));
            playlist.on(['@update', '@sort'], stub.onCallback);

            const prev = playlist.models.slice();

            const result = await clearCollection(playlist);

            expect(result.type).toBe('remove');
            expect(result.range).toEqual({ from: 0, to: 2 });
            expect(result.list[0].type).toBe(ArrayChangeType.REMOVE);
            expect(result.list[1].type).toBe(ArrayChangeType.REMOVE);
            expect(result.list[2].type).toBe(ArrayChangeType.REMOVE);
            expect(result.insertedTo).toBeUndefined();

            expect(playlist.models.length).toBe(0);

            const receiveOpts = {
                add: true,
                remove: true,
                merge: true,
                parse: undefined,
                changes: {
                    added: [],
                    removed: prev,
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts); // @update
            expect(count).toBe(1);

            done();
        });

        it('check appendCollection()', async done => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(0, 3));
            playlist.on(['@update', '@sort'], stub.onCallback);

            const added = tracks.slice(3, 6).map(t => new Track(t));

            const result = await appendCollection(playlist, added);

            expect(result.type).toBe('add');
            expect(result.range).toEqual({ from: 3, to: 5 });
            expect(result.list[0].type).toBe(ArrayChangeType.INSERT);
            expect(result.list[1].type).toBe(ArrayChangeType.INSERT);
            expect(result.list[2].type).toBe(ArrayChangeType.INSERT);
            expect(result.insertedTo).toBe(3);

            expect(playlist.length).toBe(6);
            expect(playlist.tracks[0].id).toBe('01');
            expect(playlist.tracks[1].id).toBe('02');
            expect(playlist.tracks[2].id).toBe('03');
            expect(playlist.tracks[3].id).toBe('04');
            expect(playlist.tracks[4].id).toBe('05');
            expect(playlist.tracks[5].id).toBe('06');

            const receiveOpts = {
                add: true,
                remove: true,
                merge: true,
                parse: undefined,
                changes: {
                    added,
                    removed: [],
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);        // @update
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, jasmine.anything()); // @sort
            expect(count).toBe(2);

            done();
        });

        it('check insertCollection()', async done => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(0, 3));
            playlist.on(['@update', '@sort'], stub.onCallback);

            const added = tracks.slice(3, 6).map(t => new Track(t));

            const result = await insertCollection(playlist, 1, added);

            expect(result.type).toBe('add');
            expect(result.range).toEqual({ from: 1, to: 5 });
            expect(result.list[0].type).toBe(ArrayChangeType.INSERT);
            expect(result.list[1].type).toBe(ArrayChangeType.INSERT);
            expect(result.list[2].type).toBe(ArrayChangeType.INSERT);
            expect(result.insertedTo).toBe(1);

            expect(playlist.length).toBe(6);
            expect(playlist.tracks[0].id).toBe('01');
            expect(playlist.tracks[1].id).toBe('04');
            expect(playlist.tracks[2].id).toBe('05');
            expect(playlist.tracks[3].id).toBe('06');
            expect(playlist.tracks[4].id).toBe('02');
            expect(playlist.tracks[5].id).toBe('03');

            const receiveOpts = {
                add: true,
                remove: true,
                merge: true,
                parse: undefined,
                changes: {
                    added,
                    removed: [],
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);        // @update
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, jasmine.anything()); // @sort
            expect(count).toBe(2);

            done();
        });

        it('check reorderCollection()', async done => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(0, 3));
            playlist.on(['@update', '@sort'], stub.onCallback);

            const result = await reorderCollection(playlist, 2, [2, 0]);

            expect(result.type).toBe('reorder');
            expect(result.range).toEqual({ from: 0, to: 2 });
            expect(result.list[0].type).toBe(ArrayChangeType.UPDATE);
            expect(result.list[1].type).toBe(ArrayChangeType.UPDATE);
            expect(result.list[2].type).toBe(ArrayChangeType.UPDATE);
            expect(result.insertedTo).toBe(2);

            expect(playlist.length).toBe(3);
            expect(playlist.tracks[0].id).toBe('02');
            expect(playlist.tracks[1].id).toBe('03');
            expect(playlist.tracks[2].id).toBe('01');

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, jasmine.anything()); // @sort
            expect(count).toBe(1);

            done();
        });

        it('check removeCollection()', async done => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new Playlist(tracks.slice(0, 3));
            playlist.on(['@update', '@sort'], stub.onCallback);

            const prev = playlist.tracks.slice();

            const result = await removeCollection(playlist, [0, 2]);

            expect(result.type).toBe('remove');
            expect(result.range).toEqual({ from: 0, to: 2 });
            expect(result.list[0].type).toBe(ArrayChangeType.REMOVE);
            expect(result.list[1].type).toBe(ArrayChangeType.REMOVE);
            expect(result.insertedTo).toBeUndefined();

            expect(playlist.length).toBe(1);
            expect(playlist.tracks[0].id).toBe('02');

            const receiveOpts = {
                add: true,
                remove: true,
                merge: true,
                parse: undefined,
                changes: {
                    added: [],
                    removed: [prev[0], prev[2]],
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts); // @update
            expect(count).toBe(1);

            done();
        });

        it('check edit w/ no effect', async done => {
            const playlist = new Playlist(tracks.slice(0, 3));

            const result = await reorderCollection(playlist, 2, []);
            expect(result.type).toBe('reorder');
            expect(result.range).toBeUndefined();
            expect(result.list.length).toBe(0);
            expect(result.insertedTo).toBeUndefined();

            done();
        });

        it('check edit w/ error', async done => {
            const playlist = new Playlist(tracks.slice(0, 3));
            playlist.filter(oddPassFilter);
            const added = tracks.slice(3, 6).map(t => new Track(t));

            try {
                await appendCollection<Track>(playlist, added);
                expect('UNEXPECTED FLOW').toBeNull();
            } catch (e) {
                expect(toResult(e).code).toBe(RESULT_CODE.ERROR_MVC_EDIT_PERMISSION_DENIED);
            }

            done();
        });
    });

    describe('example: editable collection', () => {

        interface EditablePlaylistEvent extends CollectionEvent<Track> {
            'clear': EditablePlaylist;
            'append': EditablePlaylist;
            'insert': EditablePlaylist;
            'reorder': EditablePlaylist;
            'detach': EditablePlaylist;
        }

        interface ListEditable<T> {
            clear(options?: ListEditOptions): Promise<ListChanged<T>>;
            append(elements: T[], options?: ListEditOptions): Promise<ListChanged<T>>;
            insert(index: number, elements: T[], options?: ListEditOptions): Promise<ListChanged<T>>;
            reorder(index: number, elements: number[], options?: ListEditOptions): Promise<ListChanged<T>>;
            detach(elements: number[], options?: ListEditOptions): Promise<ListChanged<T>>;
        }

        class EditablePlaylist extends Playlist<EditablePlaylistEvent> implements ListEditable<Track> {
            /** 要素の全破棄 */
            async clear(options?: ListEditOptions): Promise<ListChanged<Track>> {
                const result = await clearCollection(this, options);
                if (!options?.silent) {
                    this.trigger('clear', this);
                }
                return result;
            }

            /** 末尾に要素を追加 */
            async append(elements: Track[], options?: ListEditOptions): Promise<ListChanged<Track>> {
                const result = await appendCollection(this, elements, options);
                if (!options?.silent) {
                    this.trigger('append', this);
                }
                return result;
            }

            /** 指定した位置に要素を挿入 */
            async insert(index: number, elements: Track[], options?: ListEditOptions): Promise<ListChanged<Track>> {
                const result = await insertCollection(this, index, elements, options);
                if (!options?.silent) {
                    this.trigger('insert', this);
                }
                return result;
            }

            /** 要素項目の位置を変更 */
            async reorder(index: number, elements: number[], options?: ListEditOptions): Promise<ListChanged<Track>> {
                const result = await reorderCollection(this, index, elements, options);
                if (!options?.silent) {
                    this.trigger('reorder', this);
                }
                return result;
            }

            /** 要素の削除 */
            async detach(elements: number[], options?: ListEditOptions): Promise<ListChanged<Track>> {
                const result = await removeCollection(this, elements, options);
                if (!options?.silent) {
                    this.trigger('detach', this);
                }
                return result;
            }
        }

        it('check EditablePlaylist#clear()', async done => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new EditablePlaylist(tracks.slice(0, 3));
            playlist.on(['clear', '@update', '@sort'], stub.onCallback);

            const prev = playlist.models.slice();

            const result = await playlist.clear();

            expect(result.type).toBe('remove');
            expect(result.range).toEqual({ from: 0, to: 2 });
            expect(result.list[0].type).toBe(ArrayChangeType.REMOVE);
            expect(result.list[1].type).toBe(ArrayChangeType.REMOVE);
            expect(result.list[2].type).toBe(ArrayChangeType.REMOVE);
            expect(result.insertedTo).toBeUndefined();

            expect(playlist.models.length).toBe(0);

            const receiveOpts = {
                add: true,
                remove: true,
                merge: true,
                parse: undefined,
                changes: {
                    added: [],
                    removed: prev,
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts); // @update
            expect(stub.onCallback).toHaveBeenCalledWith(playlist);              // clear
            expect(count).toBe(2);

            done();
        });

        it('check EditablePlaylist#append()', async done => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new EditablePlaylist(tracks.slice(0, 3));
            playlist.on(['append', '@update', '@sort'], stub.onCallback);

            const added = tracks.slice(3, 6).map(t => new Track(t));

            const result = await playlist.append(added);

            expect(result.type).toBe('add');
            expect(result.range).toEqual({ from: 3, to: 5 });
            expect(result.list[0].type).toBe(ArrayChangeType.INSERT);
            expect(result.list[1].type).toBe(ArrayChangeType.INSERT);
            expect(result.list[2].type).toBe(ArrayChangeType.INSERT);
            expect(result.insertedTo).toBe(3);

            expect(playlist.length).toBe(6);
            expect(playlist.tracks[0].id).toBe('01');
            expect(playlist.tracks[1].id).toBe('02');
            expect(playlist.tracks[2].id).toBe('03');
            expect(playlist.tracks[3].id).toBe('04');
            expect(playlist.tracks[4].id).toBe('05');
            expect(playlist.tracks[5].id).toBe('06');

            const receiveOpts = {
                add: true,
                remove: true,
                merge: true,
                parse: undefined,
                changes: {
                    added,
                    removed: [],
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);        // @update
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, jasmine.anything()); // @sort
            expect(stub.onCallback).toHaveBeenCalledWith(playlist);                     // append
            expect(count).toBe(3);

            done();
        });

        it('check EditablePlaylist#insert()', async done => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new EditablePlaylist(tracks.slice(0, 3));
            playlist.on(['insert', '@update', '@sort'], stub.onCallback);

            const added = tracks.slice(3, 6).map(t => new Track(t));

            const result = await playlist.insert(1, added);

            expect(result.type).toBe('add');
            expect(result.range).toEqual({ from: 1, to: 5 });
            expect(result.list[0].type).toBe(ArrayChangeType.INSERT);
            expect(result.list[1].type).toBe(ArrayChangeType.INSERT);
            expect(result.list[2].type).toBe(ArrayChangeType.INSERT);
            expect(result.insertedTo).toBe(1);

            expect(playlist.length).toBe(6);
            expect(playlist.tracks[0].id).toBe('01');
            expect(playlist.tracks[1].id).toBe('04');
            expect(playlist.tracks[2].id).toBe('05');
            expect(playlist.tracks[3].id).toBe('06');
            expect(playlist.tracks[4].id).toBe('02');
            expect(playlist.tracks[5].id).toBe('03');

            const receiveOpts = {
                add: true,
                remove: true,
                merge: true,
                parse: undefined,
                changes: {
                    added,
                    removed: [],
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts);        // @update
            expect(stub.onCallback).toHaveBeenCalledWith(playlist, jasmine.anything()); // @sort
            expect(stub.onCallback).toHaveBeenCalledWith(playlist);                     // insert
            expect(count).toBe(3);

            done();
        });

        it('check EditablePlaylist#reorder()', async done => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new EditablePlaylist(tracks.slice(0, 3));
            playlist.on(['reorder', '@update', '@sort'], stub.onCallback);

            const result = await playlist.reorder(2, [2, 0]);

            expect(result.type).toBe('reorder');
            expect(result.range).toEqual({ from: 0, to: 2 });
            expect(result.list[0].type).toBe(ArrayChangeType.UPDATE);
            expect(result.list[1].type).toBe(ArrayChangeType.UPDATE);
            expect(result.list[2].type).toBe(ArrayChangeType.UPDATE);
            expect(result.insertedTo).toBe(2);

            expect(playlist.length).toBe(3);
            expect(playlist.tracks[0].id).toBe('02');
            expect(playlist.tracks[1].id).toBe('03');
            expect(playlist.tracks[2].id).toBe('01');

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, jasmine.anything()); // @sort
            expect(stub.onCallback).toHaveBeenCalledWith(playlist);                     // reorder
            expect(count).toBe(2);

            done();
        });

        it('check EditablePlaylist#detach()', async done => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const playlist = new EditablePlaylist(tracks.slice(0, 3));
            playlist.on(['detach', '@update', '@sort'], stub.onCallback);

            const prev = playlist.tracks.slice();

            const result = await playlist.detach([0, 2]);

            expect(result.type).toBe('remove');
            expect(result.range).toEqual({ from: 0, to: 2 });
            expect(result.list[0].type).toBe(ArrayChangeType.REMOVE);
            expect(result.list[1].type).toBe(ArrayChangeType.REMOVE);
            expect(result.insertedTo).toBeUndefined();

            expect(playlist.length).toBe(1);
            expect(playlist.tracks[0].id).toBe('02');

            const receiveOpts = {
                add: true,
                remove: true,
                merge: true,
                parse: undefined,
                changes: {
                    added: [],
                    removed: [prev[0], prev[2]],
                    merged: [],
                },
            };

            expect(stub.onCallback).toHaveBeenCalledWith(playlist, receiveOpts); // @update
            expect(stub.onCallback).toHaveBeenCalledWith(playlist);              // reorder
            expect(count).toBe(2);

            done();
        });
    });
});
