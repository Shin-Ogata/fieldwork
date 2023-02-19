import { getConfig } from '@cdp/core-utils';

export const entry = (signature: string): void => {
    getConfig()[signature] = signature;
};
