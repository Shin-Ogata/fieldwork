import type { TemplateResult } from '@cdp/template';

export type TaskId = string;

export interface Task {
    id: TaskId;
    title: string;
    done?: boolean;
}

export interface State {
    tasks: Task[];
    inputText: string;
}

export type RenderAppContext = () => TemplateResult;

export type Store = (update?: Partial<State>) => State;
