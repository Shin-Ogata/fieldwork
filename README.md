# fieldwork
feasibility study

## How to setup

<details>

<summary>npm v6 以下を使用時</summary>

### shell environment / 開発ツールにパスを通す

共通で利用する開発ツールは root の `node_modules/` 以下にインストールされるので、これらを CLI から利用するためにパスを通しておく。  
**この操作は terminal ごとに必要**

#### `bash` 環境の場合

```sh
# 設定
source bin/env

# 確認
echo $PATH
```

#### `Command Prompt` 環境の場合

```cmd
:: 設定
call bin\env

:: 確認
echo %PATH%
```

#### `PowerShell` 環境の場合

```ps1
# 設定
. bin\env

# 確認
$ENV:Path
```

※ 署名なしローカルスクリプトを実行するためにポリシーの変更が必要
```ps
$ Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

</details>

```sh
npm run install:all
```

## library compornent

- Core

| module                                                 | description                  |
|:-------------------------------------------------------|:-----------------------------|
| [core-utils](./packages/lib/core/utils/README.md)      | core utility                 |
| [events](./packages/lib/core/events/README.md)         | publish/subscribe library    |
| [promise](./packages/lib/core/promise/README.md)       | cancelable promise utility   |
| [observable](./packages/lib/core/observable/README.md) | observable object/array      |
| [result](./packages/lib/core/result/README.md)         | error w/ result code utility |
| [core-storage](./packages/lib/core/storage/README.md)  | core storage I/F defs        |
| [core-template](./packages/lib/core/storage/README.md) | core template library        |

- Node

| module                                                 | description                         |
|:-------------------------------------------------------|:------------------------------------|
| [fs-storage](./packages/lib/node/storage/README.md)    | storage implementation w/ `node:fs` |

- Worker

| module                                                         | description                  |
|:---------------------------------------------------------------|:-----------------------------|
| [binary](./packages/lib/worker/binary/README.md)               | binary utility               |
| [ajax](./packages/lib/worker/ajax/README.md)                   | ajax utility                 |
| [inline-worker](./packages/lib/worker/inline-worker/README.md) | inline-worker utility        |

- Web/DOM

| module                                                     | description                                |
|:-----------------------------------------------------------|:-------------------------------------------|
| [web-utils](./packages/lib/web/utils/README.md)            | web  utility                               |
| [dom](./packages/lib/web/dom/README.md)                    | dom manipulation library                   |
| [environment](./packages/lib/web/environment/README.md)    | judge for environment                      |
| [i18n](./packages/lib/web/i18n/README.md)                  | wrapper of `i18next`                       |
| [web-storage](./packages/web/window/storage/README.md)     | storage implementation w/ `localStorage`   |
| [data-sync](./packages/web/window/data-sync/README.md)     | web api entry point I/F defs               |
| [model](./packages/lib/web/model/README.md)                | abstract model class                       |
| [collection](./packages/lib/web/collection/README.md)      | abstract collection class                  |
| [view](./packages/lib/web/view/README.md)                  | abstract view class                        |
| [template](./packages/lib/web/template/README.md)          | template library collection                |
| [router](./packages/lib/web/router/README.md)              | router class                               |
| [app](./packages/lib/web/app/README.md)                    | application context                        |

- UI componets
| module                                                 | description                     |
|:-------------------------------------------------------|:--------------------------------|
| [ui-core](./packages/lib/ui/core/README.md)            | ui common logic                 |
| [ui-forms](./packages/lib/ui/forms/README.md)          | forms collection                |
| [ui-listview](./packages/lib/ui/listview/README.md)    | list view component             |


## License

Copyright 2021, 2022, 2023 Sony Group Corporation  
Copyright 2016, 2019, 2020 Sony Corporation  
Copyright 2017, 2018 Sony Network Communications Inc.  

Licensed under the Apache License, Version 2.0 (the "License");  
you may not use this file except in compliance with the License.  
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software  
distributed under the License is distributed on an "AS IS" BASIS,  
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  
See the License for the specific language governing permissions and  
limitations under the License.
