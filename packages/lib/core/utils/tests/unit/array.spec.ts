/* eslint-disable
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/require-await,
 */

import {
    shuffle,
    sort,
    unique,
    union,
    at,
    indices,
    groupBy,
    intersection,
    difference,
    without,
    sample,
    permutation,
    combination,
    map,
    filter,
    find,
    findIndex,
    some,
    every,
    reduce,
} from '@cdp/core-utils';

const tracks = [
    { title: '001', trackArtist: 'aaa', albumTitle: 'AAA', duration: 6000, size: 512000, },
    { title: '002', trackArtist: 'aaa', albumTitle: 'BBB', duration: 6000, size: 512000, },
    { title: '003', trackArtist: 'aaa', albumTitle: 'CCC', duration: 6000, size: 512000, },
    { title: '004', trackArtist: 'aaa', albumTitle: 'AAA', duration: 4000, size: 128000, },
    { title: '005', trackArtist: 'aaa', albumTitle: 'BBB', duration: 4000, size: 128000, },
    { title: '006', trackArtist: 'aaa', albumTitle: 'CCC', duration: 4000, size: 128000, },
    { title: '007', trackArtist: 'bbb', albumTitle: 'AAA', duration: 6000, size: 512000, },
    { title: '008', trackArtist: 'bbb', albumTitle: 'BBB', duration: 6000, size: 512000, },
    { title: '009', trackArtist: 'bbb', albumTitle: 'CCC', duration: 6000, size: 512000, },
    { title: '010', trackArtist: 'bbb', albumTitle: 'AAA', duration: 4000, size: 128000, },
    { title: '011', trackArtist: 'bbb', albumTitle: 'BBB', duration: 4000, size: 128000, },
    { title: '012', trackArtist: 'bbb', albumTitle: 'CCC', duration: 4000, size: 128000, },
    { title: '013', trackArtist: 'ccc', albumTitle: 'AAA', duration: 6000, size: 512000, },
    { title: '014', trackArtist: 'ccc', albumTitle: 'BBB', duration: 6000, size: 512000, },
    { title: '015', trackArtist: 'ccc', albumTitle: 'CCC', duration: 6000, size: 512000, },
    { title: '016', trackArtist: 'ccc', albumTitle: 'AAA', duration: 4000, size: 128000, },
    { title: '017', trackArtist: 'ccc', albumTitle: 'BBB', duration: 4000, size: 128000, },
    { title: '018', trackArtist: 'ccc', albumTitle: 'CCC', duration: 4000, size: 128000, },
];

describe('utils/array spec', () => {
    it('check shuffle()', () => {
        const array = [1, 2, 3, 4, 5];
        const shuffled = shuffle(array);
        expect(array === shuffled).toBe(false);
        expect(shuffled.length).toBe(5);
        const destructive = shuffle(array, true);
        expect(array === destructive).toBe(true);
        expect(destructive.length).toBe(5);
        expect(() => shuffle([])).not.toThrow();
    });

    it('check stable sort()', () => {
        const array = [
            { count: 0, id: '00', },
            { count: 0, id: '01', },
            { count: 1, id: '02', },
            { count: 1, id: '03', },
            { count: 3, id: '04', },
        ];
        const sorted = sort(array, (lhs, rhs) => {
            return lhs.count < rhs.count ? 1 : -1;
        });
        expect(array === sorted).toBe(false);
        expect(sorted.length).toBe(5);
        expect(sorted[0].id).toBe('04');
        expect(sorted[1].id).toBe('02');
        expect(sorted[2].id).toBe('03');
        expect(sorted[3].id).toBe('00');
        expect(sorted[4].id).toBe('01');
    });

    it('check unique()', () => {
        const array = [0, 3, 2, 1, 4, 2, 3, 1, 1, 2, 3, 5, 2, 3, 1, 2, 3, 1, 1, 3, 3, 1, 2];
        const uniq = unique(array);
        expect(array === uniq).toBe(false);
        expect(uniq.length).toBe(6);
        expect(uniq[0]).toBe(0);
        expect(uniq[1]).toBe(3);
        expect(uniq[2]).toBe(2);
        expect(uniq[3]).toBe(1);
        expect(uniq[4]).toBe(4);
        expect(uniq[5]).toBe(5);
    });

    it('check union()', () => {
        const result = union([1, 2, 3], [101, 2, 1, 10], [2, 1]);
        expect(result.length).toBe(5);
        expect(result[0]).toBe(1);
        expect(result[1]).toBe(2);
        expect(result[2]).toBe(3);
        expect(result[3]).toBe(101);
        expect(result[4]).toBe(10);
    });

    it('check at()', () => {
        const array = [1, 2, 3, 4, 5];
        let result = at(array, 0);
        expect(result).toBe(1);
        result = at(array, 1.1);
        expect(result).toBe(2);
        result = at(array, -1);
        expect(result).toBe(5);
        result = at(array, -2.8);
        expect(result).toBe(4);

        expect(() => at(array, 6)).toThrow(new RangeError('invalid array index. [length: 5, given: 6]'));
        expect(() => at(array, -6.1)).toThrow(new RangeError('invalid array index. [length: 5, given: -6.1]'));
    });

    it('check indecies()', () => {
        const array = ['a', 'b', 'c', 'd', 'e'];
        const indices1 = indices(array);
        expect(indices1[0]).toBe(0);
        expect(indices1[1]).toBe(1);
        expect(indices1[2]).toBe(2);
        expect(indices1[3]).toBe(3);
        expect(indices1[4]).toBe(4);

        const indices2 = indices(array, 3, 0, 5, 3);
        expect(indices2[0]).toBe(1);
        expect(indices2[1]).toBe(2);
        expect(indices2[2]).toBe(4);
        expect(indices2[3]).toBeUndefined();
        expect(indices2[4]).toBeUndefined();
    });

    it('check groupBy() return type', () => {
        const result1 = groupBy(tracks, { keys: ['trackArtist', 'albumTitle'] });
        expect(result1).toBeDefined();
        expect(result1[0].trackArtist).toBeDefined();
        expect(result1[0].albumTitle).toBeDefined();
        expect(result1[0]['duration']).toBeUndefined(); // compile error: result1[0].duration
        expect(result1[0]['size']).toBeUndefined();     // compile error: result1[0].size
        expect(result1[0].items).toBeDefined();

        const result2 = groupBy(tracks, { keys: ['albumTitle'], sumKeys: ['duration', 'size'] });
        expect(result2).toBeDefined();
        expect(result2[0]['trackArtist']).toBeUndefined();  // compile error: result2[0].trackArtist
        expect(result2[0].albumTitle).toBeDefined();
        expect(result2[0].duration).toBeDefined();
        expect(result2[0].size).toBeDefined();
        expect(result2[0].items).toBeDefined();

        const result3 = groupBy(tracks, { keys: ['albumTitle'], sumKeys: ['size'], groupKey: 'hoge' });
        expect(result3).toBeDefined();
        expect(result3[0]['trackArtist']).toBeUndefined();  // compile error: result3[0].trackArtist
        expect(result3[0].albumTitle).toBeDefined();
        expect(result3[0]['duration']).toBeUndefined();     // compile error: result3[0].duration
        expect(result3[0].size).toBeDefined();
        expect(result3[0]['items']).toBeUndefined();        // compile error: result3[0].items
        expect(result3[0].hoge).toBeDefined();
    });

    it('check groupBy()', () => {
        const result = groupBy(tracks, { keys: ['trackArtist', 'albumTitle'], sumKeys: ['duration', 'size'] });
        expect(result.length).toBe(9);

        // console.log(JSON.stringify(result, null, 4));

        const aaaAlbumSeeds = result.filter((album) => 'aaa' === album.trackArtist);
        expect(aaaAlbumSeeds.length).toBe(3);
        expect(aaaAlbumSeeds[0].items.length).toBe(2);
        expect(aaaAlbumSeeds[0].duration).toBe(10000);
        expect(aaaAlbumSeeds[0].size).toBe(640000);
        expect(aaaAlbumSeeds[0].albumTitle).toBe('AAA');
        expect(aaaAlbumSeeds[1].albumTitle).toBe('BBB');
        expect(aaaAlbumSeeds[2].albumTitle).toBe('CCC');

        const bbbAlbumSeeds = result.filter((album) => 'bbb' === album.trackArtist);
        expect(bbbAlbumSeeds.length).toBe(3);
        expect(bbbAlbumSeeds[0].items.length).toBe(2);
        expect(bbbAlbumSeeds[0].duration).toBe(10000);
        expect(bbbAlbumSeeds[0].size).toBe(640000);
        expect(bbbAlbumSeeds[0].albumTitle).toBe('AAA');
        expect(bbbAlbumSeeds[1].albumTitle).toBe('BBB');
        expect(bbbAlbumSeeds[2].albumTitle).toBe('CCC');

        const cccAlbumSeeds = result.filter((album) => 'ccc' === album.trackArtist);
        expect(cccAlbumSeeds.length).toBe(3);
        expect(cccAlbumSeeds[0].items.length).toBe(2);
        expect(cccAlbumSeeds[0].duration).toBe(10000);
        expect(cccAlbumSeeds[0].size).toBe(640000);
        expect(cccAlbumSeeds[0].albumTitle).toBe('AAA');
        expect(cccAlbumSeeds[1].albumTitle).toBe('BBB');
        expect(cccAlbumSeeds[2].albumTitle).toBe('CCC');
    });

    it('check groupBy() illegal', () => {
        const result = groupBy([] as typeof tracks, { keys: ['trackArtist', 'albumTitle'] });
        expect(result.length).toBe(0);
    });

    it('check groupBy() requery', () => {
        const filtered = tracks.filter((track) => ('011' === track.title && 'BBB' === track.albumTitle && 'bbb' === track.trackArtist));
        const result = groupBy(filtered, { keys: ['trackArtist', 'albumTitle'], sumKeys: ['duration', 'size'] });
        expect(result.length).toBe(1);

        expect(result[0].items.length).toBe(1);
        expect(result[0].duration).toBe(4000);
        expect(result[0].size).toBe(128000);
        expect(result[0].items[0].title).toBe('011');
        expect(result[0].albumTitle).toBe('BBB');
        expect(result[0].trackArtist).toBe('bbb');
    });

    it('check intersection()', () => {
        const result = intersection([1, 2, 3], [101, 2, 1, 10], [2, 1]);
        expect(result).toEqual([1, 2]);
    });

    it('check difference()', () => {
        const array = [1, 2, 3, 4, 5];
        let result = difference(array, [5, 2, 10]);
        expect(result).toEqual([1, 3, 4]);

        result = difference(array, [5, 10], [8, 2]);
        expect(result).toEqual([1, 3, 4]);
    });

    it('check without()', () => {
        const array = [1, 2, 1, 0, 3, 1, 4];
        let result = without(array, 1);
        expect(result).toEqual([2, 0, 3, 4]);

        result = without(array, 0, 1);
        expect(result).toEqual([2, 3, 4]);
    });

    it('check sample()', () => {
        const array = [1, 2, 3, 4, 5, 6];
        const res1 = sample(array);
        expect(array.includes(res1)).toBe(true);

        const res2 = sample(array, 3);
        expect(res2.length).toBe(3);
        expect(res2.every(el => array.includes(el))).toBe(true);
    });

    it('check permutation()', () => {
        const array = ['a', 'b', 'c'];
        const result = permutation(array, 2);
        expect(result).toEqual([
            ['a', 'b'],
            ['a', 'c'],
            ['b', 'a'],
            ['b', 'c'],
            ['c', 'a'],
            ['c', 'b'],
        ]);

        const result2 = permutation(array, 4);
        expect(result2).toEqual([]);
    });

    it('check combination()', () => {
        const array = ['a', 'b', 'c'];
        const result = combination(array, 2);
        expect(result).toEqual([
            ['a', 'b'],
            ['a', 'c'],
            ['b', 'c'],
        ]);

        const result2 = combination(array, 4);
        expect(result2).toEqual([]);
    });

    it('check combination() example', () => {
        const type = 'click.bb.aa.cc';
        const namespaces = type.split('.');
        const main = namespaces.shift() as string;
        namespaces.sort();

        const store: string[][] = [];
        for (let i = namespaces.length; i >= 1; i--) {
            store.push(...combination(namespaces, i));
        }

        const retval: { type: string; namespace: string; }[] = [];

        const signature = `.${namespaces.join('.')}.`;
        retval.push({ type: main, namespace: signature });
        for (const ns of store) {
            retval.push({ type: `${main}.${ns.join('.')}`, namespace: signature });
        }

        expect(retval[0]).toEqual({ type: 'click', namespace: '.aa.bb.cc.' });
        expect(retval[1]).toEqual({ type: 'click.aa.bb.cc', namespace: '.aa.bb.cc.' });
        expect(retval[2]).toEqual({ type: 'click.aa.bb', namespace: '.aa.bb.cc.' });
        expect(retval[3]).toEqual({ type: 'click.aa.cc', namespace: '.aa.bb.cc.' });
        expect(retval[4]).toEqual({ type: 'click.bb.cc', namespace: '.aa.bb.cc.' });
        expect(retval[5]).toEqual({ type: 'click.aa', namespace: '.aa.bb.cc.' });
        expect(retval[6]).toEqual({ type: 'click.bb', namespace: '.aa.bb.cc.' });
        expect(retval[7]).toEqual({ type: 'click.cc', namespace: '.aa.bb.cc.' });
    });

    it('check async map()', async () => {
        const array = [1, 2, 3, 4, 5];
        let results = await map(array, async (value) => value * 2);
        expect(results[0]).toBe(2);
        expect(results[1]).toBe(4);
        expect(results[2]).toBe(6);
        expect(results[3]).toBe(8);
        expect(results[4]).toBe(10);

        // sync callback
        results = await map(array, (value) => value * 3);
        expect(results[0]).toBe(3);
        expect(results[1]).toBe(6);
        expect(results[2]).toBe(9);
        expect(results[3]).toBe(12);
        expect(results[4]).toBe(15);
    });

    it('check async filter()', async () => {
        const array = [
            { count: 0, id: '00', },
            { count: 0, id: '01', },
            { count: 1, id: '02', },
            { count: 1, id: '03', },
            { count: 3, id: '04', },
        ];

        let results = await filter(array, async (value) => 1 === value.count);
        expect(results.length).toBe(2);
        expect(results[0]).toEqual({ count: 1, id: '02' });
        expect(results[1]).toEqual({ count: 1, id: '03' });

        // sync callback
        results = await filter(array, (value) => 3 === value.count);
        expect(results.length).toBe(1);
        expect(results[0]).toEqual({ count: 3, id: '04' });
    });

    it('check async find()', async () => {
        const array = [
            { count: 0, id: '00', },
            { count: 0, id: '01', },
            { count: 1, id: '02', },
            { count: 1, id: '03', },
            { count: 3, id: '04', },
        ];

        let result = await find(array, async (value) => 1 === value.count);
        expect(result).toEqual({ count: 1, id: '02' });

        // undefined
        result = await find(array, async (value) => 4 === value.count);
        expect(result).toBeUndefined();

        // sync callback
        result = await find(array, (value) => 3 === value.count);
        expect(result).toEqual({ count: 3, id: '04' });
    });

    it('check async findIndex()', async () => {
        const array = [
            { count: 0, id: '00', },
            { count: 0, id: '01', },
            { count: 1, id: '02', },
            { count: 1, id: '03', },
            { count: 3, id: '04', },
        ];

        let result = await findIndex(array, async (value) => 1 === value.count);
        expect(result).toBe(2);

        // undefined
        result = await findIndex(array, async (value) => 4 === value.count);
        expect(result).toBe(-1);

        // sync callback
        result = await findIndex(array, (value) => 3 === value.count);
        expect(result).toBe(4);
    });

    it('check async some()', async () => {
        const array = [1, 2, 3, 4, 5];
        let result = await some(array, async (value) => value % 2);
        expect(result).toBe(true);
        result = await some(array, async (value) => 6 < value);
        expect(result).toBe(false);

        // sync callback
        result = await some(array, (value) => value % 3);
        expect(result).toBe(true);
    });

    it('check async every()', async () => {
        const array = [1, 2, 3, 4, 5];
        let result = await every(array, async (value) => value % 2);
        expect(result).toBe(false);
        result = await every(array, async (value) => value < 6);
        expect(result).toBe(true);

        // sync callback
        result = await every(array, (value) => value % 3);
        expect(result).toBe(false);
    });

    it('check async reduce()', async () => {
        const array = [1, 2, 3, 4, 5];
        let result = await reduce(array, async (a: number, v: number) => a + v);
        expect(result).toBe(15);

        // sync callback
        result = await reduce(array, (a, v) => a + v, 2); // eslint-disable-line
        expect(result).toBe(17);

        // error
        await expectAsync(reduce([], async (a: number, v: number) => a + v)).toBeRejected();
    });
});
