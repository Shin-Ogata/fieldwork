/* eslint-disable @typescript-eslint/no-namespace */
import {
    default as i18next,
    i18n as i18nextInstance,
    FallbackLngObjList as i18nextFallbackLngObjList,
    FallbackLng as i18nextFallbackLng,
    FormatFunction as i18nextFormatFunction,
    InterpolationOptions as i18nextInterpolationOptions,
    ReactOptions as i18nextReactOptions,
    InitOptions as i18nextInitOptions,
    TOptionsBase as i18nextTOptionsBase,
    StringMap as i18nextStringMap,
    TOptions as i18nextTOptions,
    Callback as i18nextCallback,
    ExistsFunction as i18nextExistsFunction,
    WithT as i18nextWithT,
    TFunctionResult as i18nextTFunctionResult,
    TFunctionKeys as i18nextTFunctionKeys,
    TFunction as i18nextTFunction,
    Resource as i18nextResource,
    ResourceLanguage as i18nextResourceLanguage,
    ResourceKey as i18nextResourceKey,
    Interpolator as i18nextInterpolator,
    ResourceStore as i18nextResourceStore,
    Services as i18nextServices,
    Module as i18nextModule,
    CallbackError as i18nextCallbackError,
    ReadCallback as i18nextReadCallback,
    MultiReadCallback as i18nextMultiReadCallback,
    BackendModule as i18nextBackendModule,
    LanguageDetectorModule as i18nextLanguageDetectorModule,
    LanguageDetectorAsyncModule as i18nextLanguageDetectorAsyncModule,
    PostProcessorModule as i18nextPostProcessorModule,
    LoggerModule as i18nextLoggerModule,
    I18nFormatModule as i18nextI18nFormatModule,
    ThirdPartyModule as i18nextThirdPartyModule,
    Modules as i18nextModules,
    Newable as i18nextNewable,
} from 'i18next';

const i18n: i18n.i18n = i18next;

declare namespace i18n {
    export type i18n = i18nextInstance;
    export type FallbackLngObjList = i18nextFallbackLngObjList;
    export type FallbackLng = i18nextFallbackLng;
    export type FormatFunction = i18nextFormatFunction;
    export type InterpolationOptions = i18nextInterpolationOptions;
    export type ReactOptions = i18nextReactOptions;
    export type InitOptions = i18nextInitOptions;
    export type TOptionsBase = i18nextTOptionsBase;
    export type StringMap = i18nextStringMap;
    export type TOptions<T extends object = StringMap> = i18nextTOptions<T>;
    export type Callback = i18nextCallback;
    export type ExistsFunction<K extends string = string, T extends object = StringMap> = i18nextExistsFunction<K, T>;
    export type WithT = i18nextWithT;
    export type TFunctionResult = i18nextTFunctionResult;
    export type TFunctionKeys = i18nextTFunctionKeys;
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
    export type BackendModule<T = object> = i18nextBackendModule<T>;
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
