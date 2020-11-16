import { isNumber } from '@cdp/core-utils';

/** @internal */
let _timeout: number | undefined;

export const settings = {
    get timeout(): number | undefined {
        return _timeout;
    },
    set timeout(value: number | undefined) {
        _timeout = (isNumber(value) && 0 <= value) ? value : undefined;
    },
};
