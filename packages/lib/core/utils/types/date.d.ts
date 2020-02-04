/**
 * @en Date unit definitions.
 * @ja 日時オブジェクトの単位定義
 */
export declare type DateUnit = 'year' | 'month' | 'day' | 'hour' | 'min' | 'sec' | 'msec';
/**
 * @en Calculate from the date which becomes a cardinal point before a N date time or after a N date time (by [[DateUnit]]).
 * @ja 基点となる日付から、N日後、N日前を算出
 *
 * @param base
 *  - `en` base date time.
 *  - `ja` 基準日
 * @param add
 *  - `en` relative date time.
 *  - `ja` 加算日. マイナス指定でn日前も設定可能
 * @param unit [[DateUnit]]
 */
export declare function computeDate(base: Date, add: number, unit?: DateUnit): Date;
