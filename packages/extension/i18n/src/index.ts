/* eslint-disable
    @typescript-eslint/no-namespace,
    @typescript-eslint/no-explicit-any,
 */

import {
    default as i18next,
    type i18n as i18nextInstance,
    type FallbackLngObjList as i18nextFallbackLngObjList,
    type FallbackLng as i18nextFallbackLng,
    type InterpolationOptions as i18nextInterpolationOptions,
    type ReactOptions as i18nextReactOptions,
    type InitOptions as i18nextInitOptions,
    type TOptionsBase as i18nextTOptionsBase,
    type TOptions as i18nextTOptions,
    type ExistsFunction as i18nextExistsFunction,
    type WithT as i18nextWithT,
    type TFunction as i18nextTFunction,
    type Resource as i18nextResource,
    type ResourceLanguage as i18nextResourceLanguage,
    type ResourceKey as i18nextResourceKey,
    type Interpolator as i18nextInterpolator,
    type ResourceStore as i18nextResourceStore,
    type Services as i18nextServices,
    type Module as i18nextModule,
    type CallbackError as i18nextCallbackError,
    type ReadCallback as i18nextReadCallback,
    type MultiReadCallback as i18nextMultiReadCallback,
    type BackendModule as i18nextBackendModule,
    type LanguageDetectorModule as i18nextLanguageDetectorModule,
    type LanguageDetectorAsyncModule as i18nextLanguageDetectorAsyncModule,
    type PostProcessorModule as i18nextPostProcessorModule,
    type LoggerModule as i18nextLoggerModule,
    type I18nFormatModule as i18nextI18nFormatModule,
    type ThirdPartyModule as i18nextThirdPartyModule,
    type Modules as i18nextModules,
    type Newable as i18nextNewable,
} from 'i18next';

const i18n: i18n.i18n = i18next;

declare namespace i18n {
    export type i18n = i18nextInstance;
    export type FallbackLngObjList = i18nextFallbackLngObjList;
    export type FallbackLng = i18nextFallbackLng;
    export type InterpolationOptions = i18nextInterpolationOptions;
    export type ReactOptions = i18nextReactOptions;
    export type InitOptions = i18nextInitOptions;
    export type TOptionsBase = i18nextTOptionsBase;
    export type TOptions<T extends Record<string, unknown> = Record<string, any>> = i18nextTOptions<T>;
    export type ExistsFunction<K extends string = string, T extends Record<string, unknown> = Record<string, any>> = i18nextExistsFunction<K, T>;
    export type WithT = i18nextWithT;
    export type TFunction = i18nextTFunction;
    export type Resource = i18nextResource;
    export type ResourceLanguage = i18nextResourceLanguage;
    export type ResourceKey = i18nextResourceKey;
    export type Interpolator = i18nextInterpolator;
    export type ResourceStore = i18nextResourceStore;
    export type Services = i18nextServices;
    export type Module = i18nextModule;
    export type CallbackError = i18nextCallbackError;
    export type ReadCallback = i18nextReadCallback;
    export type MultiReadCallback = i18nextMultiReadCallback;
    export type BackendModule<T = Record<string, unknown>> = i18nextBackendModule<T>;
    export type LanguageDetectorModule = i18nextLanguageDetectorModule;
    export type LanguageDetectorAsyncModule = i18nextLanguageDetectorAsyncModule;
    export type PostProcessorModule = i18nextPostProcessorModule;
    export type LoggerModule = i18nextLoggerModule;
    export type I18nFormatModule = i18nextI18nFormatModule;
    export type ThirdPartyModule = i18nextThirdPartyModule;
    export type Modules = i18nextModules;
    export type Newable<T> = i18nextNewable<T>;
}

export { i18n };
