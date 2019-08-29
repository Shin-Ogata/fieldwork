declare const win: Window;
declare const doc: Document;
declare const evt: {
    new <T>(typeArg: string, eventInitDict?: CustomEventInit<T> | undefined): CustomEvent<T>;
    prototype: CustomEvent<any>;
};
export { win as window, doc as document, evt as CustomEvent, };
