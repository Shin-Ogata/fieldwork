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

## dev todo
- splash screen からの遷移
- 各 page 実装方法の検証 (全部 register する)
  - page-root (object. dom-cache する. `string` は非同期読み込み用 reserve)
  - page-class
  - page-factory (非同期)
  - page-view (RoutePathParams も何か試したい)

- 遷移アニメーション
- 同一URL, 同一ページインスタンスへの遷移のケア?


## 参考

- [Framework7 View](https://framework7.jp/docs/view.html)
- [Vue Router](https://v3.router.vuejs.org/ja/)
