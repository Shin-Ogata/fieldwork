/* eslint-disable
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/no-use-before-define,
 */

import {
    UnknownFunction,
    isFunction,
    deepEqual,
    noop,
} from '@cdp/core-utils';
import {
    PartInfo,
    AsyncDirective,
    DirectiveResult,
    directive,
    noChange,
} from '@cdp/template';

interface Context {
    id: number;
    directive: HookDirective;
    renderer: UnknownFunction;
    values: any[];
    hooks: any[];
    args: any[];
}

class HookDirective extends AsyncDirective {
    constructor(part: PartInfo) {
        super(part);
        _map.set(this, {
            id: 0,
            directive: this,
            renderer: noop,
            values: [], hooks: [], args: [],
        });
    }

    render(renderer: UnknownFunction, ...args: unknown[]): DirectiveResult {
        const context = _map.get(this) as Context;
        context.renderer = renderer;
        context.args = args;
        _current = context;
        update(context);
        return noChange;
    }
}

const _map = new WeakMap<HookDirective, Context>();
let _current: Context;

const setCurrent = (context: Context): void => {
    _current = context;
    _current.id = 0;
};

const clearCurrent = (): void => {
    _current.id = 0;
    _current = null!;   // eslint-disable-line @typescript-eslint/no-non-null-assertion
};

const nextValue = (context = _current): number => {
    return context.id++;
};

const render = (context = _current): void => {
    setCurrent(context);
    const r = context.renderer(...context.args);
    context.directive.setValue(r);
    clearCurrent();
};

const runEffects = (context = _current): void => {
    // NOTE: unmount に非対応
    context.hooks = context.hooks.map((effect) => {
        if (effect) {
            return effect.call(context);
        }
    }).filter(effect => null != effect);
};

const update = (context = _current): void => {
    runEffects(context);  // clears last effects
    render(context);
    runEffects(context);
};

export const hooks = directive(HookDirective);

export const useState = <T>(val?: T): [T,  (v: T | ((v: T) => T), options?: { noUpdate?: boolean; }) => void] => {
    const context = _current;
    const id = nextValue(context);

    const setter = (v: T, options?: { noUpdate?: boolean; }): void => {
        const prev = context.values[id];
        context.values[id] = isFunction(v) ? v(context.values[id]) : v;
        if (!(options?.noUpdate) && !deepEqual(prev, context.values[id])) {
            update(context);
        }
    };

    if (context.values.length <= id) {
        context.values.push(val);
    }

    return [context.values[id], setter];
};

/*
NOTE: useEffect() は簡易実装. 第2引数, life-cycle イベントに非対応

Haunted を用いれば, 一通りの対応は可能
 - https://github.com/matthewp/haunted
 - https://gist.github.com/matthewp/92c4daa6588eaef484c6f389d20d5700

仕様:
useEffectは、componentWillUnmountに対応する機能を持っています。
useEffectに渡した関数がreturnする関数は、コンポーネントがアンマウントされるときに実行されます。
この関数は、副作用をクリーンアップするために使われます。例えば、タイマーをクリアしたり、イベントリスナーを削除したりするような処理です。

useEffectの第二引数に空の配列を渡すと、副作用関数は最初のレンダリング時に一度だけ実行されます。
その場合、returnする関数もコンポーネントがアンマウントされるときに一度だけ実行されます。

useEffectでcomponentWillUnmountに対応する処理を書く例は以下のようになります。

```js
useEffect(() => {
  // 副作用関数
  console.log("コンポーネントがマウントされました");
  // クリーンアップ関数
  return () => {
    console.log("コンポーネントがアンマウントされました");
  };
}, []); // 空の配列を渡す
```

このように、useEffectはcomponentWillUnmountの代わりに使えます。😊

----

useEffectに第二引数に空の配列を渡さない場合は、副作用関数（Block A）はコンポーネントがレンダリングされるたびに実行されます。
クリーンアップ関数（Block B）は、次の副作用関数が実行される前に実行されます。
また、コンポーネントがアンマウントされるときにも実行されます。

例えば、以下のようなコンポーネントがあったとします。

```js
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // 副作用関数 Block A
    console.log("Block A");
    // クリーンアップ関数 Block B
    return () => {
      console.log("Block B");
    };
  });

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

このコンポーネントをレンダリングすると、以下のような出力が得られます。

```
Block A
```

このとき、副作用関数（Block A）が実行されましたが、クリーンアップ関数（Block B）はまだ実行されていません。
次に、ボタンをクリックしてカウントを増やすと、以下のような出力が得られます。

```
Block B
Block A
```

このとき、クリーンアップ関数（Block B）が実行された後に、副作用関数（Block A）が再び実行されました。
これは、カウントの状態が変わったことでコンポーネントが再レンダリングされたためです。

もう一度ボタンをクリックすると、同じ出力が得られます。

```
Block B
Block A
```

このように、コンポーネントがレンダリングされるたびに、クリーンアップ関数と副作用関数のペアが実行されます。
最後に、コンポーネントをアンマウントすると、以下のような出力が得られます。

```
Block B
```

このとき、クリーンアップ関数（Block B）だけが実行されました。これは、コンポーネントがアンマウントされるときに副作用をクリーンアップする必要があるためです。
以上のように、useEffectに第二引数に空の配列を渡さない場合は、副作用関数とクリーンアップ関数はコンポーネントのライフサイクルに応じて複数回実行されることになります。
*/
export const useEffect = (v: any, args?: unknown[]): any => { // eslint-disable-line @typescript-eslint/no-unused-vars
    // TODO: second paramater to test if values have changed
    _current.hooks.push(v);
};
