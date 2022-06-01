# @cdp/router

[description]

## 調査

- [Framework7 Router](https://framework7.jp/docs/routes.html)
- [Framework7 Router Events](https://framework7.io/docs/view.html#router-events)
- [Framework7 View](https://framework7.jp/docs/view.html)
- [Barba.js life cycle event](https://barba.js.org/docs/getstarted/lifecycle/)
- [Barba.js css](https://barba.js.org/docs/plugins/css/)
- [Vue3 transition class](https://v3.ja.vuejs.org/guide/transitions-enterleave.html)
- [Vue3 lifecycle hook](https://v3.ja.vuejs.org/api/options-lifecycle-hooks.html#%E3%83%A9%E3%82%A4%E3%83%95%E3%82%B5%E3%82%A4%E3%82%AF%E3%83%AB%E3%83%95%E3%83%83%E3%82%AF)
- [Vue3 lifecycle diaglam](https://v3.ja.vuejs.org/guide/instance.html#%E3%83%A9%E3%82%A4%E3%83%95%E3%82%B5%E3%82%A4%E3%82%AF%E3%83%AB%E3%82%BF%E3%82%99%E3%82%A4%E3%82%A2%E3%82%AF%E3%82%99%E3%83%A9%E3%83%A0)
- [Vue Router](https://v3.router.vuejs.org/ja/)
- [Onsen UI (swipable)](https://onsen.io/v2/api/js/ons-navigator.html#events-summary)
- [jQuery Mobile Page Events](https://jqmtricks.wordpress.com/2014/03/26/jquery-mobile-page-events/)
- [Backbone qiita](https://qiita.com/yuku_t/items/13f3d1f71d31f3e78123)
- [Backbone blog](https://yutapon.hatenablog.com/entry/2014/03/02/003937)

----

使用方法の参考

- https://qiita.com/d4te/items/ba25ecec99820faddd8e
- https://www.ccbaxy.xyz/blog/2020/09/28/vue02/
- https://barba.js.org/assets/diagram/lifecycle.png
- https://barba.js.org/docs/advanced/hooks/
- https://barba.js.org/docs/plugins/css/
- https://qiita.com/miwashutaro0611/items/bc4cf66bef3a825ace1c

#### TODO

- Route から url を見えるかするか?
  - する
- params, query の parse
- 同じ url に対する navigate

```ts
        it('should throw when it does not match the pattern', () => {
            const toPath = path2regexp.compile('/:foo(\\d+)');
            expect(() => {
                toPath({ foo: 'abc' });
            }).toThrow(
                new TypeError('Expected "foo" to match "\\d+", but got "abc"')
            );
        });
```

<p><details>
<summary>Done</summary>

- `Route` interface について見直し
  - `transition` を公開するかいなか
    - → navOptions やめる
  - `RouteContext` 専用プロパティに `@` をつけるかいなか
    - → つけない. `$template` があること. `@` は HistoryState

- IHistory#root について方針を出す (backbone)
  - 今のところ root 切り替えは不要
  - backbone#fragment は IHisotry#id

- RouteParameters の flatten 化

- cancel 可能なように IHistory から見直し
  - https://ninhlv.dev/disable-browserback/
  - https://localcoder.org/stop-firing-popstate-on-hashchange

  - `hashchange` はハンドリングしないほうがいいかも
    - `hashchange` はハッシュがなくなるときには発火しない
  - `popstate` は `history.go()` だけであればリロードされない

- vue に習い, `hash` と `history` は選択できたほうが良いかもしれない. そのためには `webRoot` を調査する
  - [Different History modes](https://router.vuejs.org/guide/essentials/history-mode.html)
  - [vue-routerのhashモードとhistoryモードの違いをざっくり理解する](https://qiita.com/kozzzz/items/af9ad63fa70d4724cc2a)

  - html5
    - changeLocation
    - createCurrentLocation
    - pauseListeners

  - route は `/@id` からはじめる. history hash prefixは `#/` とすることで `#/@id`にする. history 内部の id は `/` はつかない
  - path は `vue` を参考にする
 

</details></p>


#### Event

- will-change

- (load)

- before-leave
- leave
- after-leave

- mounted

- before-enter
- enter
- after-enter

- unmounted

- (unload)

- changed

#### CSS

- jquery-mobile viewport
```
'ui-mobile-viewport'
'ui-mobile-viewport ui-overlay-cdp'
'ui-mobile-viewport ui-overlay-cdp ui-mobile-viewport-transitioning'
'ui-mobile-viewport ui-overlay-cdp ui-mobile-viewport-transitioning viewport-floatup'
'ui-mobile-viewport ui-overlay-cdp viewport-floatup'
'ui-mobile-viewport ui-overlay-cdp'
```

- jquery-mobile page
```
'ui-page ui-page-theme-cdp ui-page-header-fixed ui-page-active ui-page-pre-in'
'ui-page ui-page-theme-cdp ui-page-header-fixed ui-page-active'
'ui-page ui-page-theme-cdp ui-page-header-fixed ui-page-active floatup in'
'ui-page ui-page-theme-cdp ui-page-header-fixed ui-page-active'

'ui-page ui-page-theme-cdp ui-page-header-fixed ui-page-active floatup out reverse'
'ui-page ui-page-theme-cdp ui-page-header-fixed'
```

#### memo

- `@cdp/template` には依存しない
  - page のベース html だけが欲しいので mustache compile は基本させない
  - ローカライズは必要?
    -  router の外で行う? (beforecreate?, beforeEnter?)

- `:param` は必要. params, query 両対応
  - framework7 相当 (backbone は正規表現そのもの?)
    - [View のパラメータ](https://framework7.jp/docs/view.html#anchor-4)
  - [path matcher](https://github.com/pillarjs/path-to-regexp/tree/v1.7.0)
  - [Vue dynamic matching](https://v3.router.vuejs.org/ja/guide/essentials/dynamic-matching.html)

- <a>リンクを shift 同時押下で別タブ開きたい
  - https://stackoverflow.com/questions/56892748/how-to-handle-intention-to-open-link-in-new-page-in-a-spa-application

```
// framework7 back.js
    navigateUrl = router.generateUrl({ name, params, query });
    query: parseUrlQuery(previousUrl),
    router.parseRouteUrl(newUrl);
    findMatchingRoute()
```

- `@cdp/dom` は~~まだ我慢. でも使うかも~~ 使う.
  - ただし I/F に染み出させない (意味はないかも?)
  - keepAlive で detach() を使いそう
  - https://framework7.jp/docs/routes.html#anchor-15

- 2page 間で `navigate()` を呼んでからのイベントフローを書いてみる
  - cancel も考慮してみる

- `intent` と `hisory.state` と協調? view 間でわたるので違うかも → できない
- `Route` と `hisory.state` と協調? → シリアライズできないものは格納できない? → SessionHisotry で対応

- `beforeRouteChange`は`beforeHide` or `beforeLeave`で賄える?
  - `will-change` を受けた後キャンセルできるか考える

- vue ナビゲーションガード(callback i/f)を理解する
  - [ナビゲーションガード](https://v3.router.vuejs.org/ja/guide/advanced/navigation-guards.html)

- スクロール位置の記憶する/しない

- マスター・ディーテイルレイアウト
  - https://framework7.io/docs/view#master-detail

- prev は専用キャッシュで実装

- 非 Promise 関数も await 可 (new も可)
```ts
async function check(arg) {
  const ret = await new arg();
  console.log('number' === typeof ret);
}
const func = function() { return 1; }

check(func); // true
```

- DOM が document に接続されているか否か
  - Node.isConnected
  - https://developer.mozilla.org/ja/docs/Web/API/Node/isConnected
