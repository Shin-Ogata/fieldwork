/* eslint-disable
    @typescript-eslint/indent,
 */

import {
    TemplateResult,
    html,
    directives,
} from '@cdp/template';
import { luid } from '@cdp/core-utils';
import { store } from './store';
import { NewTask } from './new-task';
import { TaskList } from './task-list';

const { classMap } = directives;

export const App = (): TemplateResult => html`
<div id="todoapp">
    <header>
        <h1>Todos</h1>
        ${NewTask(
            store().inputText,
            inputText => store({ inputText }),
            e => {
                if ('Enter' === e.key) {
                    const state = store();
                    store({
                        tasks: [...state.tasks, { title: state.inputText, id: luid('task:') }],
                        inputText: '',
                    });
                }
            }
        )}
    </header>
    <section id="main" class=${classMap({ show: !!store().tasks.length })}>
        ${TaskList(
            store().tasks,
            (id, done) =>
                store({
                    tasks: store().tasks.map(t => (t.id === id ? { ...t, done } : t))
                }),
            id => store({ tasks: store().tasks.filter(t => t.id !== id) })
        )}
    </section>
</div>
<div id="credits">
    <br />Rewritten by: <a href="https://github.com/Shin-Ogata">Shin Ogata</a>.
</div>
`;
