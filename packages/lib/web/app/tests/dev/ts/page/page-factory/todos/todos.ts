import {
    TemplateResult,
    html,
    directives,
} from '@cdp/template';
import { luid } from '@cdp/core-utils';
import { t } from '@cdp/i18n';
import { store } from './store';
import { NewTask } from './new-task';
import { TaskList } from './task-list';

const { classMap } = directives;

export const Todos = (): TemplateResult => html`
<div id="todos">
    <header>
        <label>👈</label>
        <button><a href="#">${t('app.common.back')}</a></button>
        <h1>Todos</h1>
        ${NewTask(
            store().inputText,
            inputText => store({ inputText }),
            e => {
                if ('Enter' === e.code) {
                    const state = store();
                    store({
                        tasks: [...state.tasks, { title: state.inputText, id: luid('task:') }],
                        inputText: '',
                    });
                }
            }
        )}
    </header>
    <section id="todos-main" class=${classMap({ show: !!store().tasks.length })}>
        ${TaskList(
            store().tasks,
            (id, done) =>
                store({
                    tasks: store().tasks.map(task => (task.id === id ? { ...task, done } : task))
                }),
            id => store({ tasks: store().tasks.filter(task => task.id !== id) })
        )}
    </section>
</div>
`;
