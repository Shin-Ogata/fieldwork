import {
    Model,
    ModelConstructor,
    ModelConstructionOptions,
    ModelEventSource,
} from '@cdp/model';
import { nextOrder } from './utils';

export interface ToDoAttribute {
    title: string;
    order: number;
    done: boolean;
}

const ToDoBase = Model as ModelConstructor<Model<ToDoAttribute>, ToDoAttribute>;

export type ToDoEventSource = ModelEventSource<ToDoAttribute>;

export class ToDo extends ToDoBase {
    constructor(attrs?: Partial<ToDoAttribute>, options?: ModelConstructionOptions) {
        super(Object.assign({}, ToDo.defaults, attrs), options);
    }

    private static get defaults(): ToDoAttribute {
        return {
            title: 'empty todo...',
            order: nextOrder(),
            done: false,
        };
    }

    get url(): string {
        return 'dev-todos';
    }

    public toggle(): Promise<ToDoAttribute | void> {
        return this.save({ done: !this.done });
    }
}
