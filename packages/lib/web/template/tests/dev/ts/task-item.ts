import {
    TemplateResult,
    html,
    directives
} from '@cdp/template';
import { Task } from './interfaces';

const { classMap } = directives;

export const TaskItem = (
    task: Task,
    onCheck: (checked: boolean) => void,
    onClickRemove: () => void
): TemplateResult => html`
    <li class=${classMap({ done: !!task.done })}>
        <div class=${classMap({ view: true, task: true })}>
            <input
                class="toggle"
                type="checkbox"
                @change=${(e: InputEvent) => onCheck((e.currentTarget as HTMLInputElement).checked)}
                .checked=${task.done}
            />
            <label>${task.title}</label>
            <a class="destroy" @click=${onClickRemove}></a>
        </div>
    </li>
`;
