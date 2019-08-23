export { ElementBase, ElementResult, ElementifyArgBase, ElementifyArg, QueryContext, } from './utils';
declare function dom(): void;
declare namespace dom {
    var utils: typeof import("./utils");
}
export { dom };
export default dom;
