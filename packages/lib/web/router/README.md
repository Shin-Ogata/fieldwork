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

- subflow
  - back-destination (anchor も)

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

- Route から url を見えるかするか?
  - する

- params, query の parse

- 同じ url に対する navigate
  - History にあわせて許容する

- `:param` は必要. params, query 両対応
  - framework7 相当 (backbone は正規表現そのもの?)
    - [View のパラメータ](https://framework7.jp/docs/view.html#anchor-4)
  - [path matcher](https://github.com/pillarjs/path-to-regexp/tree/v1.7.0)
  - [Vue dynamic matching](https://v3.router.vuejs.org/ja/guide/essentials/dynamic-matching.html)

- css
  - barba css next が参考になる transitionend の判定とかも
    - animation-duration の確認必要
  - reverse はとりあえずなし?!. subflow も履歴管理を先に行えばできればいけるか?
    - router-transition-reverse は必要
    - router-transition-running も入れとく?
  - z-index は css のみで操作
  - visibility: hidden or display: none はどうするか?
    - alia-hidden のみ

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

- prev は専用キャッシュで実装

- anchor
  - https://framework7.jp/docs/view.html#anchor-8

</details></p>

#### memo & future work

- スクロール位置の記憶する/しない
  - → app/PageView クラスで対応

- swipe back

- マスター・ディーテイルレイアウト
  - https://framework7.io/docs/view#master-detail
  - https://framework7.jp/docs/view.html#anchor-12

- <a>リンクを shift 同時押下で別タブ開きたい
  - https://stackoverflow.com/questions/56892748/how-to-handle-intention-to-open-link-in-new-page-in-a-spa-application

- vue ナビゲーションガード(callback i/f)を理解する
  - [ナビゲーションガード](https://v3.router.vuejs.org/ja/guide/advanced/navigation-guards.html)


- html2canvas は何をやっているのか?
  - https://qiita.com/youwht/items/8b681a856f59aa82d671
    - ゴリゴリ解釈してる...

  - DOM オブジェクトを Canvas に描画する
    - https://developer.mozilla.org.cach3.com/ja/docs/Web/HTML/Canvas/Drawing_DOM_objects_into_a_canvas
    - https://bom-shibuya.hatenablog.com/entry/2018/05/15/203446
    - https://web.archive.org/web/20160625111122/https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Drawing_DOM_objects_into_a_canvas

  - 評価するならこっち(ただ完璧な再現は期待できない)
    - html-to-image
      - https://github.com/bubkoo/html-to-image#readme
      - https://marmooo.blogspot.com/2021/04/html-to-image-html.html


