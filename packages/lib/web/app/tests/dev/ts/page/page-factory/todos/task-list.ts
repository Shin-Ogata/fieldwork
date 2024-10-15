import { TemplateResult, html } from '@cdp/template';
import { Task, TaskId } from './interfaces';
import { TaskItem } from './task-item';

export const TaskList = (
    tasks: Task[],
    onCheck: (id: TaskId, checked: boolean) => void,
    onClickRemove: (id: TaskId) => void
): TemplateResult => html`
    <ul id="todos-list">
        ${tasks.map(t =>
            TaskItem(t, checked => onCheck(t.id, checked), () => onClickRemove(t.id))
        )}
    </ul>
`;
