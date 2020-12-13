import { CursorPos, ArrayCursor } from '@cdp/collection';

describe('utils/array-cursor spec', () => {

    const targets = ['aaa', 'bbb', 'ccc', 'ddd', 'eee'];

    it('check construction', (): void => {
        const cursor1 = new ArrayCursor(targets);
        expect(cursor1.current).toBe('aaa');
        cursor1.reset(targets);
        expect(cursor1.index).toBe(CursorPos.OUT_OF_RANGE);

        const cursor2 = new ArrayCursor(targets, 3);
        expect(cursor2.current).toBe('ddd');
    });

    it('check forward iteration', (): void => {
        const cursor = new ArrayCursor(targets, CursorPos.OUT_OF_RANGE);
        expect(cursor.isBOF).toBe(true);
        expect(cursor.moveFirst().isBOF).toBe(false);
        expect(cursor.moveNext().moveNext().moveNext().moveNext().current).toBe('eee');
        expect(cursor.moveNext().isEOF).toBe(true);
    });

    it('check backward iteration', (): void => {
        const cursor = new ArrayCursor(targets);
        expect(cursor.moveLast().isEOF).toBe(false);
        expect(cursor.movePrevious().movePrevious().movePrevious().movePrevious().current).toBe('aaa');
        expect(cursor.movePrevious().isBOF).toBe(true);
    });

    it('check empty case', (): void => {
        const cursor = new ArrayCursor([]);
        expect(cursor.isBOF).toBe(true);
        expect(cursor.isEOF).toBe(false);
        expect(cursor.moveFirst().isBOF).toBe(true);
        expect(cursor.isEOF).toBe(false);
        expect(cursor.moveNext().isEOF).toBe(true);
        expect(cursor.isBOF).toBe(false);
        expect(cursor.moveLast().isEOF).toBe(true);
        expect(cursor.isBOF).toBe(false);
        expect(cursor.movePrevious().isBOF).toBe(true);
        expect(cursor.isEOF).toBe(false);
    });

    it('check backward seek', (): void => {
        const cursor = new ArrayCursor(targets);
        expect(cursor.seek(1).current).toBe('bbb');
        expect(cursor.index).toBe(1);
        expect(null == cursor.seek(5).current).toBe(true);
        expect(cursor.index).toBe(CursorPos.OUT_OF_RANGE);
        expect(cursor.seek((elem) => {
            return 'ddd' === elem;
        }).current).toBe('ddd');
        expect(cursor.index).toBe(3);
        expect(null == cursor.seek((elem) => {
            return 'fff' === elem;
        }).current).toBe(true);
        expect(cursor.index).toBe(CursorPos.OUT_OF_RANGE);
    });

    it('check reset', (): void => {
        const cursor = new ArrayCursor(targets);
        cursor.reset(targets, 3);
        expect(cursor.index).toBe(3);
        expect(cursor.length).toBe(5);
        cursor.reset();
        expect(cursor.array).not.toEqual(targets);
    });
});
