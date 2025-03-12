import type { TemplateScanner } from './interfaces';
/**
 * A simple string scanner that is used by the template parser to find
 * tokens in template strings.
 */
export declare class Scanner implements TemplateScanner {
    private _source;
    private _tail;
    private _pos;
    /**
     * constructor
     */
    constructor(src: string);
    /**
     * Returns current scanning position.
     */
    get pos(): number;
    /**
     * Returns string  source.
     */
    get source(): string;
    /**
     * Returns `true` if the tail is empty (end of string).
     */
    get eos(): boolean;
    /**
     * Tries to match the given regular expression at the current position.
     * Returns the matched text if it can match, the empty string otherwise.
     */
    scan(regexp: RegExp): string;
    /**
     * Skips all text until the given regular expression can be matched. Returns
     * the skipped string, which is the entire tail if no match can be made.
     */
    scanUntil(regexp: RegExp): string;
}
