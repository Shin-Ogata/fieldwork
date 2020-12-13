import { setup } from './static';
import { DOMClass } from './class';

// init for static
setup(DOMClass.prototype, DOMClass.create);

export * from './exports';
export { default as default } from './exports';
