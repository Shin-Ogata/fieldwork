import { TransformConfig, TemplateTransformer } from 'lit-transformer/src/interfaces';

declare const createCustom: (config: TransformConfig) => TemplateTransformer;
export default createCustom;
