import { PlainObject } from '@cdp/core-utils';
import { AjaxDataTypes, AjaxRequestOptions, AjaxGetRequestShortcutOptions, AjaxResult } from './interfaces';
export declare const request: {
    get: <T extends object | keyof import("./interfaces").AjaxDataTypeList<PlainObject> = "json">(url: string, data?: PlainObject, dataType?: T extends AjaxDataTypes ? T : 'json', options?: AjaxRequestOptions) => Promise<AjaxResult<T>>;
    text: (url: string, options?: AjaxGetRequestShortcutOptions) => Promise<AjaxResult<'text'>>;
    json: <T_1 extends object | "json" = "json">(url: string, options?: AjaxGetRequestShortcutOptions) => Promise<AjaxResult<T_1>>;
    blob: (url: string, options?: AjaxGetRequestShortcutOptions) => Promise<AjaxResult<'blob'>>;
    post: <T_2 extends object | keyof import("./interfaces").AjaxDataTypeList<PlainObject> = "json">(url: string, data: PlainObject, dataType?: (T_2 extends keyof import("./interfaces").AjaxDataTypeList<PlainObject> ? T_2 : "json") | undefined, options?: AjaxRequestOptions) => Promise<AjaxResult<T_2>>;
    resource: <T_3 extends object | "json" | "text" = "json">(url: string, dataType?: (T_3 extends "json" | "text" ? T_3 : "json") | undefined, data?: PlainObject) => AjaxResult<T_3>;
};
