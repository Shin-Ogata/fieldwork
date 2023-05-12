/**
 * @en Date unit definitions.
 * @ja 日時オブジェクトの単位定義
 */
export type DateUnit = 'year' | 'month' | 'day' | 'hour' | 'min' | 'sec' | 'msec';

/** @internal */
const _computeDateFuncMap = {
    year: (date: Date, base: Date, add: number) => {
        date.setUTCFullYear(base.getUTCFullYear() + add);
        return date;
    },
    month: (date: Date, base: Date, add: number) => {
        date.setUTCMonth(base.getUTCMonth() + add);
        return date;
    },
    day: (date: Date, base: Date, add: number) => {
        date.setUTCDate(base.getUTCDate() + add);
        return date;
    },
    hour: (date: Date, base: Date, add: number) => {
        date.setUTCHours(base.getUTCHours() + add);
        return date;
    },
    min: (date: Date, base: Date, add: number) => {
        date.setUTCMinutes(base.getUTCMinutes() + add);
        return date;
    },
    sec: (date: Date, base: Date, add: number) => {
        date.setUTCSeconds(base.getUTCSeconds() + add);
        return date;
    },
    msec: (date: Date, base: Date, add: number) => {
        date.setUTCMilliseconds(base.getUTCMilliseconds() + add);
        return date;
    },
};

/**
 * @en Calculate from the date which becomes a cardinal point before a N date time or after a N date time (by {@link DateUnit}).
 * @ja 基点となる日付から、N日後、N日前を算出
 *
 * @param base
 *  - `en` base date time.
 *  - `ja` 基準日
 * @param add
 *  - `en` relative date time.
 *  - `ja` 加算日. マイナス指定でn日前も設定可能
 * @param unit {@link DateUnit}
 */
export function computeDate(base: Date, add: number, unit: DateUnit = 'day'): Date {
    const date = new Date(base.getTime());
    const func = _computeDateFuncMap[unit];
    if (func) {
        return func(date, base, add);
    } else {
        throw new TypeError(`invalid unit: ${unit}`);
    }
}
