import type { PlainObject } from '@cdp/core-utils';
import type { AjaxDataTypes, AjaxRequestOptions, AjaxGetRequestShortcutOptions, AjaxResult } from './interfaces';
export declare const request: {
    get: <T extends AjaxDataTypes | object = "json">(url: string, data?: PlainObject, dataType?: T extends AjaxDataTypes ? T : "json", options?: AjaxRequestOptions) => Promise<AjaxResult<T>>;
    text: (url: string, options?: AjaxGetRequestShortcutOptions) => Promise<AjaxResult<"text">>;
    json: <T extends "json" | object = "json">(url: string, options?: AjaxGetRequestShortcutOptions) => Promise<AjaxResult<T>>;
    blob: (url: string, options?: AjaxGetRequestShortcutOptions) => Promise<AjaxResult<"blob">>;
    post: <T extends AjaxDataTypes | object = "json">(url: string, data: PlainObject, dataType?: T extends AjaxDataTypes ? T : "json", options?: AjaxRequestOptions) => Promise<AjaxResult<T>>;
    resource: <T extends "text" | "json" | object = "json">(url: string, dataType?: T extends "text" | "json" ? T : "json", data?: PlainObject) => AjaxResult<T>;
};
