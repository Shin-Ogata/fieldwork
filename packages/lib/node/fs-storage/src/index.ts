export * from './fs-storage';
export * from './dummy1';
export * from './dummy2';
//export { webStorage as default } from './web-storage';

/*
// TODO:
 ☆ build
   ☆ fs-storage-spec.js の require(`@cdp/fs-storage`) を require('./fs-storage') になるように rollup-config で頑張る

 - ut:ci
   ☆ js ファイルのままカバレッジ
   -  report はいったん出力しない
   -  remap() だけ呼べるようにする
     - 修正
       - cli-plugin-unit-test.js
       - remap-coverage.js
       - coverage.json を解析し, パスを調整する
   -  report() を呼ぶ


file: C:\Users\shin\Projects\GitHub\CDP\fieldwork\packages\lib\node\fs-storage\.temp\cdp:\@cdp\fs-storage\fs-storage.ts
relative: ..\.temp\cdp:\@cdp\fs-storage\fs-storage.ts
  source : ../.temp/@cdp/fs-storage/fs-storage.ts
  ... resolved : C:\Users\shin\Projects\GitHub\CDP\fieldwork\packages\lib\node\.temp\src\fs-storage.ts

file: C:\Users\shin\Projects\GitHub\CDP\fieldwork\packages\lib\core\utils\dist\cdp:\@cdp\core-utils\misc.ts
relative: cdp:\@cdp\core-utils\misc.ts
source : @cdp/core-utils/timer.ts
  ... resolved : C:\Users\shin\Projects\GitHub\CDP\fieldwork\packages\lib\core\utils\src\timer.ts

 ☆ rollup-* config で共通化可能なものは共通化
 */
