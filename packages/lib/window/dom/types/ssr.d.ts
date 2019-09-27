declare const win: Window & typeof globalThis;
declare const doc: Document;
declare const evt: {
    new <T>(typeArg: string, eventInitDict?: CustomEventInit<T> | undefined): CustomEvent<T>;
    prototype: CustomEvent<any>;
};
declare const requestAnimationFrame: ((callback: FrameRequestCallback) => number) & ((callback: FrameRequestCallback) => number);
export { win as window, doc as document, evt as CustomEvent, requestAnimationFrame, };
