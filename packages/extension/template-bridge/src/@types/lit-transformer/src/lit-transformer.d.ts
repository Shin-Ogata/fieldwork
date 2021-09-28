import { TransformConfig, MustacheTransformer } from 'lit-transformer/src/interfaces';

declare const createCustom: (config: TransformConfig) => MustacheTransformer;
export default createCustom;
