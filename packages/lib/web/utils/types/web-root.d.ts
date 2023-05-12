/**
 * @en Get the directory to which `url` belongs.
 * @ja 指定 `url` の所属するディレクトリを取得
 *
 * @param url
 *  - `en` target URL
 *  - `ja` 対象の URL
 */
export declare const getWebDirectory: (url: string) => string;
/**
 * @en Accsessor for Web root location <br>
 *     Only the browser environment will be an allocating place in index.html, and becomes effective.
 * @ja Web root location へのアクセス <br>
 *     index.html の配置場所となり、ブラウザ環境のみ有効となる.
 */
export declare const webRoot: string;
/**
 * @en Convert to an absolute url string if given a relative path. <br>
 *     If you want to access to Assets and in spite of the script location, the function is available.
 * @ja 相対パスが指定されている場合は、絶対URL文字列に変換 <br>
 *     js の配置に依存することなく `assets` アクセスしたいときに使用する.
 *
 * @see https://stackoverflow.com/questions/2188218/relative-paths-in-javascript-in-an-external-file
 *
 * @example <br>
 *
 * ```ts
 *  console.log(toUrl('/res/data/collection.json'));
 *  // "http://localhost:8080/app/res/data/collection.json"
 * ```
 *
 * @param seed
 *  - `en` set relative path from {@link webRoot}.
 *  - `ja` {@link webRoot} からの相対パスを指定
 */
export declare const toUrl: (seed: string) => string;
