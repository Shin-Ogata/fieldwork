import type { TemplateScanner } from './interfaces';

/**
 * A simple string scanner that is used by the template parser to find
 * tokens in template strings.
 */
export class Scanner implements TemplateScanner {
    private _source: string;
    private _tail: string;
    private _pos: number;

    /**
     * constructor
     */
    constructor(src: string) {
        this._source = this._tail = src;
        this._pos = 0;
    }

///////////////////////////////////////////////////////////////////////
// public methods:

    /**
     * Returns current scanning position.
     */
    get pos(): number {
        return this._pos;
    }

    /**
     * Returns string  source.
     */
    get source(): string {
        return this._source;
    }

    /**
     * Returns `true` if the tail is empty (end of string).
     */
    get eos(): boolean {
        return '' === this._tail;
    }

    /**
     * Tries to match the given regular expression at the current position.
     * Returns the matched text if it can match, the empty string otherwise.
     */
    scan(regexp: RegExp): string {
        const match = regexp.exec(this._tail);

        if (0 !== match?.index) {
            return '';
        }

        const string = match[0];

        this._tail = this._tail.substring(string.length);
        this._pos += string.length;

        return string;
    }

    /**
     * Skips all text until the given regular expression can be matched. Returns
     * the skipped string, which is the entire tail if no match can be made.
     */
    scanUntil(regexp: RegExp): string {
        const index = this._tail.search(regexp);
        let match: string;

        switch (index) {
            case -1:
                match = this._tail;
                this._tail = '';
                break;
            case 0:
                match = '';
                break;
            default:
                match = this._tail.substring(0, index);
                this._tail = this._tail.substring(index);
        }

        this._pos += match.length;

        return match;
    }
}
