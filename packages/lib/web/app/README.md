# @cdp/app

[description]

## TODO

- PageView
  - ☆ active は cssClass `<prefix>-page-current`
  - スクロール位置の記憶する/しない
  - header / footer どうするか
- ☆ route change localize
- ☆ global error handle
- ☆ config
- App?
  - ☆ activePage
  - ☆ onOrientationChanged
  - ☆ onHardwareBackButton
  - ☆ getOrientation
  - ☆ custom document ready
- Router
  - ☆ prefetch の見直し
- environment
  - prefers-color-scheme

## 覚書
- AppContext は main の router を管理する必要最低限のメンバを定義する
  - そのため,　ルート `#app` の element アクセスや配下の component instance アクセスを既定では提供しない
  - リッチなメンバアクセスがほしい場合、(panel等)はクライアント側でクラスでラップする or context インスタンスにメンバを追加(root elementアクセス等)する
  - 専用の初期化が必要な場合は `waitForReady` を使用する
  - ∵ パネルやアクションリスト等のコンポーネントを網羅するものではないため, 3rd と組み合わせるときの制約を減らしたいため

## dev todo
- ☆ splash screen からの遷移
- 各 page 実装方法の検証 (全部 register する)
  - ☆ page-root (object. dom-cache する. `string` は非同期読み込み用 reserve)
  - ☆ page-class (すべてのページイベントを確認)
  - ☆ page-factory (非同期)
  - ☆ page-view (RoutePathParams で複数のパスを扱う)
- ☆ reflesh(lv2) 多言語読み込み
- ☆ 遷移アニメーション

- ☆ 画面遷移の拒否
- ☆ sub-flow
  - ☆ sub-flow 終了時のブラウザ履歴管理があまい (以前から)

- ☆ 同一URL, 同一ページインスタンスへの遷移のケア?

## 参考

- [Framework7 View](https://framework7.jp/docs/view.html)
- [Vue Router](https://v3.router.vuejs.org/ja/)
