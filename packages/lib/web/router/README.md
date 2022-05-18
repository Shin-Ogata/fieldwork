# @cdp/router

[description]

## 調査

- [Framework7 Router Events](https://framework7.io/docs/view.html#router-events)
- [Framework7 View](https://framework7.jp/docs/view.html)
- [Barba.js life cycle event](https://barba.js.org/docs/getstarted/lifecycle/)
- [Barba.js css](https://barba.js.org/docs/plugins/css/)
- [Vue3 transition class](https://v3.ja.vuejs.org/guide/transitions-enterleave.html)
- [Vue3 lifecycle hook](https://v3.ja.vuejs.org/api/options-lifecycle-hooks.html#%E3%83%A9%E3%82%A4%E3%83%95%E3%82%B5%E3%82%A4%E3%82%AF%E3%83%AB%E3%83%95%E3%83%83%E3%82%AF)
- [Vue3 lifecycle diaglam](https://v3.ja.vuejs.org/guide/instance.html#%E3%83%A9%E3%82%A4%E3%83%95%E3%82%B5%E3%82%A4%E3%82%AF%E3%83%AB%E3%82%BF%E3%82%99%E3%82%A4%E3%82%A2%E3%82%AF%E3%82%99%E3%83%A9%E3%83%A0)
- [Onsen UI (swipable)](https://onsen.io/v2/api/js/ons-navigator.html#events-summary)
- [jQuery Mobile Page Events](https://jqmtricks.wordpress.com/2014/03/26/jquery-mobile-page-events/)

----

使用方法の参考

- https://qiita.com/d4te/items/ba25ecec99820faddd8e
- https://www.ccbaxy.xyz/blog/2020/09/28/vue02/
- https://barba.js.org/assets/diagram/lifecycle.png
- https://barba.js.org/docs/advanced/hooks/
- https://barba.js.org/docs/plugins/css/
- https://qiita.com/miwashutaro0611/items/bc4cf66bef3a825ace1c

#### TODO

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

  - root は `/@id` からはじめる. hash prefixは `#/` とすることで `#/@id`にする. history 内部の id は `/` はつかない
  - path は `vue` を参考にする

####

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

#### memo

- `@cdp/template` には依存しない
  - page のベース html だけが欲しいので mustache compile は基本させない
  - ローカライズは必要?
    -  router の外で行う (beforecreate?, beforeEnter?)

- `:param` は必要
  - framework7 相当 (backbone は正規表現そのもの?)
    - [View のパラメータ](https://framework7.jp/docs/view.html#anchor-4)
  - [path matcher](https://github.com/pillarjs/path-to-regexp/tree/v1.7.0)

- `@cdp/dom` はまだ我慢. でも使うかも.

- 2page 間で `navigate()` を呼んでからのイベントフローを書いてみる
  - cancel も考慮してみる

- `beforeRouteChange`は`beforeHide` or `beforeLeave`で賄える?
  - `will-change` を受けた後キャンセルできるか考える

- vue ナビゲーションガード(callback i/f)を理解する
  - [ナビゲーションガード](https://v3.router.vuejs.org/ja/guide/advanced/navigation-guards.html)

- スクロール位置の記憶する/しない
