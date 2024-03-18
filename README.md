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

| module                                       | description                  |
|:---------------------------------------------|:-----------------------------|
| [core-utils](./packages/lib/core/utils)      | core utility                 |
| [events](./packages/lib/core/events)         | publish/subscribe library    |
| [promise](./packages/lib/core/promise)       | cancelable promise utility   |
| [observable](./packages/lib/core/observable) | observable object/array      |
| [result](./packages/lib/core/result)         | error w/ result code utility |
| [core-storage](./packages/lib/core/storage)  | core storage I/F defs        |
| [core-template](./packages/lib/core/storage) | core template library        |

- Node

| module                                       | description                         |
|:---------------------------------------------|:------------------------------------|
| [fs-storage](./packages/lib/node/storage)    | storage implementation w/ `node:fs` |

- Worker

| module                                               | description                  |
|:-----------------------------------------------------|:-----------------------------|
| [binary](./packages/lib/worker/binary)               | binary utility               |
| [ajax](./packages/lib/worker/ajax)                   | ajax utility                 |
| [inline-worker](./packages/lib/worker/inline-worker) | inline-worker utility        |

- Web/DOM

| module                                           | description                                |
|:-------------------------------------------------|:-------------------------------------------|
| [web-utils](./packages/lib/web/utils)            | web  utility                               |
| [dom](./packages/lib/web/dom)                    | dom manipulation library                   |
| [environment](./packages/lib/web/environment)    | judge for environment                      |
| [i18n](./packages/lib/web/i18n)                  | wrapper of `i18next`                       |
| [web-storage](./packages/web/window/storage)     | storage implementation w/ `localStorage`   |
| [data-sync](./packages/web/window/data-sync)     | web api entry point I/F defs               |
| [model](./packages/lib/web/model)                | abstract model class                       |
| [collection](./packages/lib/web/collection)      | abstract collection class                  |
| [view](./packages/lib/web/view)                  | abstract view class                        |
| [template](./packages/lib/web/template)          | template library collection                |
| [router](./packages/lib/web/router)              | router class                               |
| [app](./packages/lib/web/app)                    | application context                        |

- UI componets

| module                                       | description                     |
|:---------------------------------------------|:--------------------------------|
| [ui-utils](./packages/lib/ui/core)           | ui common utility               |
| [ui-forms](./packages/lib/ui/forms)          | forms collection                |
| [ui-listview](./packages/lib/ui/listview)    | list view component             |


## License

Copyright 2021, 2022, 2023 2024 Sony Group Corporation  
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
