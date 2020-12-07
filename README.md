# fieldwork
feasibility study

### library compornent

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

| module                                                 | description                    |
|:-------------------------------------------------------|:-------------------------------|
| [fs-storage](./packages/lib/node/storage/README.md)    | storage implementation w/ `fs` |

- Worker

| module                                                 | description                  |
|:-------------------------------------------------------|:-----------------------------|
| [binary](./packages/lib/worker/binary/README.md)       | binary utility               |
| [ajax](./packages/lib/worker/ajax/README.md)           | ajax utility                 |

- Window/DOM

| module                                                     | description                                |
|:-----------------------------------------------------------|:-------------------------------------------|
| [dom](./packages/lib/window/dom/README.md)                 | dom manipulation library                   |
| [environment](./packages/lib/window/environment/README.md) | judge for environment                      |
| [i18n](./packages/lib/window/i18n/README.md)               | wrapper of `i18next`                      |
| [web-storage](./packages/lib/window/storage/README.md)     | storage implementation w/ `localStorage` |
| [data-sync](./packages/lib/window/data-sync/README.md)     | web api entry point I/F defs               |
| [model](./packages/lib/window/model/README.md)             | abstract model class                       |
| [collection](./packages/lib/window/collection/README.md)   | abstract collection class                  |
| [view](./packages/lib/window/view/README.md)               | abstract view class                        |
| [template](./packages/lib/window/template/README.md)       | template library collection                |

