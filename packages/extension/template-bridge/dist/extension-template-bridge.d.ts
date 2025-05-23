/*!
 * @cdp/extension-template-bridge 0.9.19
 *   Generated by 'cdp-task bundle dts' task.
 *   - built with TypeScript 5.8.3
 */
import { DirectiveResult, SVGTemplateResult, TemplateResult, noChange, nothing } from '@cdp/extension-template';
export type TemplateBridgeArg = Record<string, {} | null | undefined>;
export type TemplateBridgeEndine = (view?: TemplateBridgeArg) => TemplateResult | SVGTemplateResult;
export type TemplateTransformer = (template: HTMLTemplateElement | string) => TemplateBridgeEndine;
export type TemplateTag = (strings: TemplateStringsArray, ...values: unknown[]) => TemplateResult | SVGTemplateResult;
export type TransformDirective = (value: string | typeof noChange | typeof nothing | null | undefined) => DirectiveResult;
export type TransformTester = (input: string, config: TransformConfig) => boolean;
export type TransformExecutor = (input: string, config: TransformConfig) => TemplateResult | SVGTemplateResult | undefined;
export interface TransformeContext {
    test: TransformTester;
    transform: TransformExecutor;
}
export interface TransformConfig {
    html: TemplateTag;
    transformVariable: TransformExecutor;
    delimiter?: {
        start: string;
        end: string;
    };
    transformers?: Record<string, TransformeContext>;
}
export declare function createMustacheTransformer(html: TemplateTag, unsafeHTML: TransformDirective): TemplateTransformer;
export declare function createMustacheTransformer(config: TransformConfig): TemplateTransformer;
export declare const transformer: {
    variable: TransformExecutor;
    unsafeVariable: (unsafeHTML: TransformDirective) => TransformeContext;
    section: () => TransformeContext;
    invertedSection: () => TransformeContext;
    comment: () => TransformeContext;
    customDelimiter: () => TransformeContext;
};
/**
 * A TemplateRenderer is responsible for rendering a block call, like
 * `<template name='foo'>`
 */
export declare type TemplateRenderer = (view: TemplateBridgeArg, handlers: TemplateHandlers, renderers: TemplateRenderers) => unknown;
export declare type TemplateRenderers = Record<string, TemplateRenderer>;
/**
 * A TemplateHandlers is responsible for rendering control flow like
 * `<template type='if' if='{{x}}'>`
 */
export declare type TemplateHandler = (template: HTMLTemplateElement, view: TemplateBridgeArg, handlers: TemplateHandlers, renderers: TemplateRenderers) => unknown;
export declare type TemplateHandlers = Record<string, TemplateHandler>;
/**
 * @returns {Function} a template function of the form (view) => TemplateResult
 */
export declare const prepareTemplate: (template: HTMLTemplateElement, handlers?: TemplateHandlers, renderers?: TemplateRenderers, superTemplate?: HTMLTemplateElement) => TemplateBridgeEndine;
export interface EvaluateTemplateResult {
    values: unknown[];
}
/**
 * Evaluates the given template and returns its result
 *
 * @param template
 * @param view
 * @param handlers
 * @param renderers
 * @returns
 */
export declare const evaluateTemplate: (template: HTMLTemplateElement, view: object, handlers?: TemplateHandlers, renderers?: TemplateRenderers) => EvaluateTemplateResult;
export interface CreateStampinoTemplateOptions {
    handlers?: TemplateHandlers;
    renderers?: TemplateRenderers;
    superTemplate?: HTMLTemplateElement | undefined;
}
export declare function createStampinoTransformer(options?: CreateStampinoTemplateOptions): TemplateTransformer;
