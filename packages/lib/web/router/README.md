# @cdp/router

[description]

## 調査

- [Framework7 Router Events](https://framework7.io/docs/view.html#router-events)
- [Framework7 View](https://framework7.jp/docs/view.html)
- [Barba.js life cycle event](https://barba.js.org/docs/getstarted/lifecycle/)
- [Barba.js css](https://barba.js.org/docs/plugins/css/)
- [Vue3 transition class](https://v3.ja.vuejs.org/guide/transitions-enterleave.html)
- [Onsen UI (swipable)](https://onsen.io/v2/api/js/ons-navigator.html#events-summary)

----

使用方法の参考

- https://qiita.com/d4te/items/ba25ecec99820faddd8e
- https://www.ccbaxy.xyz/blog/2020/09/28/vue02/
- https://barba.js.org/assets/diagram/lifecycle.png
- https://barba.js.org/docs/advanced/hooks/
- https://barba.js.org/docs/plugins/css/
- https://qiita.com/miwashutaro0611/items/bc4cf66bef3a825ace1c



#### memo

- `@cdp/template` には依存しない
  - page のベース html だけが欲しいので mustache compile は基本させない
  - ローカライズは必要?
    -  router の外で行う (beforecreate?, beforeEnter?)

- `:param` は必要
  - framework7 相当 (backbone は正規表現そのもの?)
    - [View のパラメータ](https://framework7.jp/docs/view.html#anchor-4)

- `@cdp/dom` はまだ我慢
