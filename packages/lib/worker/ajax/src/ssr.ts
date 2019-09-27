import { safe } from '@cdp/core-utils';

const _fetch = safe(globalThis.fetch);

export { _fetch as fetch };
