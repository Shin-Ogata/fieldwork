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

- 同一URL, 同一ページインスタンスへの遷移のケア?
  - push() に stack は紐づくので el を共有することはない. page instance の共有をどこまでケアするか?
  - 基本現実装でいけそう. 実験して試す -> 評価は `@cdp/app` にて

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

- HTML を Image へ変換 (ただ完璧な再現は期待できない)
  - html-to-image
    - https://github.com/bubkoo/html-to-image#readme
    - https://marmooo.blogspot.com/2021/04/html-to-image-html.html
