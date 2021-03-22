import { i18n as i18nextInstance, FallbackLngObjList as i18nextFallbackLngObjList, FallbackLng as i18nextFallbackLng, FormatFunction as i18nextFormatFunction, InterpolationOptions as i18nextInterpolationOptions, ReactOptions as i18nextReactOptions, InitOptions as i18nextInitOptions, TOptionsBase as i18nextTOptionsBase, StringMap as i18nextStringMap, TOptions as i18nextTOptions, Callback as i18nextCallback, ExistsFunction as i18nextExistsFunction, WithT as i18nextWithT, TFunctionResult as i18nextTFunctionResult, TFunctionKeys as i18nextTFunctionKeys, TFunction as i18nextTFunction, Resource as i18nextResource, ResourceLanguage as i18nextResourceLanguage, ResourceKey as i18nextResourceKey, Interpolator as i18nextInterpolator, ResourceStore as i18nextResourceStore, Services as i18nextServices, Module as i18nextModule, CallbackError as i18nextCallbackError, ReadCallback as i18nextReadCallback, MultiReadCallback as i18nextMultiReadCallback, BackendModule as i18nextBackendModule, LanguageDetectorModule as i18nextLanguageDetectorModule, LanguageDetectorAsyncModule as i18nextLanguageDetectorAsyncModule, PostProcessorModule as i18nextPostProcessorModule, LoggerModule as i18nextLoggerModule, I18nFormatModule as i18nextI18nFormatModule, ThirdPartyModule as i18nextThirdPartyModule, Modules as i18nextModules, Newable as i18nextNewable } from 'i18next';
declare const i18n: i18n.i18n;
declare namespace i18n {
    type i18n = i18nextInstance;
    type FallbackLngObjList = i18nextFallbackLngObjList;
    type FallbackLng = i18nextFallbackLng;
    type FormatFunction = i18nextFormatFunction;
    type InterpolationOptions = i18nextInterpolationOptions;
    type ReactOptions = i18nextReactOptions;
    type InitOptions = i18nextInitOptions;
    type TOptionsBase = i18nextTOptionsBase;
    type StringMap = i18nextStringMap;
    type TOptions<T extends Record<string, unknown> = StringMap> = i18nextTOptions<T>;
    type Callback = i18nextCallback;
    type ExistsFunction<K extends string = string, T extends Record<string, unknown> = StringMap> = i18nextExistsFunction<K, T>;
    type WithT = i18nextWithT;
    type TFunctionResult = i18nextTFunctionResult;
    type TFunctionKeys = i18nextTFunctionKeys;
    type TFunction = i18nextTFunction;
    type Resource = i18nextResource;
    type ResourceLanguage = i18nextResourceLanguage;
    type ResourceKey = i18nextResourceKey;
    type Interpolator = i18nextInterpolator;
    type ResourceStore = i18nextResourceStore;
    type Services = i18nextServices;
    type Module = i18nextModule;
    type CallbackError = i18nextCallbackError;
    type ReadCallback = i18nextReadCallback;
    type MultiReadCallback = i18nextMultiReadCallback;
    type BackendModule<T = Record<string, unknown>> = i18nextBackendModule<T>;
    type LanguageDetectorModule = i18nextLanguageDetectorModule;
    type LanguageDetectorAsyncModule = i18nextLanguageDetectorAsyncModule;
    type PostProcessorModule = i18nextPostProcessorModule;
    type LoggerModule = i18nextLoggerModule;
    type I18nFormatModule = i18nextI18nFormatModule;
    type ThirdPartyModule = i18nextThirdPartyModule;
    type Modules = i18nextModules;
    type Newable<T> = i18nextNewable<T>;
}
export { i18n };