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
  - page-root (object. dom-cache する. `string` は非同期読み込み用 reserve)
  - page-class (すべてのページイベントを確認)
  - page-factory (非同期)
  - page-view (RoutePathParams で複数のパスを扱う)

- 遷移アニメーション
- 画面遷移の拒否
- sub-flow

- 同一URL, 同一ページインスタンスへの遷移のケア?

- bug:
  - ☆初期ページ. `onPageLoaded` をハンドリングできない
  - ☆root → class → [戻る] → [進む]
    - ☆[戻る] ときの `this._prevRoute`, `cdp-page-previous` の管理がおかしい
  - ☆`aria-hidden` と表示・非表示の関係を整理
  - ☆`root` → `class` → [戻る] → `class` で class の js インスタンス 1 に対して DOM インスタンスが2つ
    - そもそも `id` が同じ場合は dom instance が使いまわせるべき? path param どうする?
      - 旧 cafeteria は DOM も使いまわし. (transition はあきらめている. 仕様でよさそう)
      - ∴ `id` = `path` は今のまま
      - ∴ `id` が同じなら DOM が再利用できる場合は再利用する
        - _stack.direct(id).state.el

## 参考

- [Framework7 View](https://framework7.jp/docs/view.html)
- [Vue Router](https://v3.router.vuejs.org/ja/)
