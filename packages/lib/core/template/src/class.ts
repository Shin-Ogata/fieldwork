import {
    JST,
    TemplateTags,
    ITemplate,
    TemplateScanner,
    TemplateContext,
    TemplateWriter,
    TemplateEscaper,
} from './interfaces';
import { globalSettings } from './internal';
import {
    PlainObject,
    isString,
    typeString,
} from './utils';
import { Scanner } from './scanner';
import { Context } from './context';
import { Writer } from './writer';

/** [[Template]] common settings */
globalSettings.writer = new Writer();

/**
 * @en [[Template]] compile options
 * @ja [[Template]] コンパイルオプション
 */
export interface TemplateCompileOptions {
    tags?: TemplateTags;
}

/**
 * @en Template utility class.
 * @ja Template ユーティリティクラス
 */
export class Template implements ITemplate {

///////////////////////////////////////////////////////////////////////
// public static methods:

    /**
     * @en Get [[JST]] from template source.
     * @ja テンプレート文字列から [[JST]] を取得
     */
    public static compile(template: string, options?: TemplateCompileOptions): JST {
        if (!isString(template)) {
            throw new TypeError(`Invalid template! the first argument should be a "string" but "${typeString(template)}" was given for Template.compile(template, options)`);
        }

        const { tags } = options || globalSettings;
        const { writer } = globalSettings;

        const jst = (view?: PlainObject, partials?: PlainObject): string => {
            return writer.render(template, view || {}, partials, tags);
        };
        jst.tokens = writer.parse(template, tags);

        return jst;
    }

    /**
     * @en Clears all cached templates in the default [[TemplateWriter]].
     * @ja 既定の [[TemplateWriter]] のすべてのキャッシュを削除
     */
    public static clearCache(): void {
        globalSettings.writer.clearCache();
    }

    /**
     * @en Change default [[TemplateWriter]].
     * @ja 既定の [[TemplateWriter]] の変更
     */
    public static setDefaultWriter(newWriter: TemplateWriter): TemplateWriter {
        const oldWriter = globalSettings.writer;
        globalSettings.writer = newWriter;
        return oldWriter;
    }

    /**
     * @en Change default [[TemplateTags]].
     * @ja 既定の [[TemplateTags]] の変更
     */
    public static setDefaultTags(newTags: TemplateTags): TemplateTags {
        const oldTags = globalSettings.tags;
        globalSettings.tags = newTags.slice() as TemplateTags;
        return oldTags;
    }

    /**
     * @en Change default `escape` method.
     * @ja 既定の `escape` の変更
     */
    public static setDefaultEscape(newEscaper: TemplateEscaper): TemplateEscaper {
        const oldEscaper = globalSettings.escape;
        globalSettings.escape = newEscaper;
        return oldEscaper;
    }

///////////////////////////////////////////////////////////////////////
// public static methods: for debug

    /** @internal Create [[TemplateScanner]] instance */
    public static createScanner(src: string): TemplateScanner {
        return new Scanner(src);
    }

    /** @internal Create [[TemplateContext]] instance */
    public static createContext(view: PlainObject, parentContext?: Context): TemplateContext {
        return new Context(view, parentContext);
    }

    /** @internal Create [[TemplateWriter]] instance */
    public static createWriter(): TemplateWriter {
        return new Writer();
    }
}
