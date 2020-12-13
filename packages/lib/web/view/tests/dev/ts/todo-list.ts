import { Collection, SortOrder } from '@cdp/collection';
import { setOrderProvider } from './utils';
import { ToDo } from './todo';

class ToDoList extends Collection<ToDo> {
    static readonly model = ToDo;

    constructor() {
        super([], {
            queryOptions: {
                sortKeys: [
                    { name: 'order', order: SortOrder.ASC, type: 'number' },
                ],
            }
        });
    }

    get url(): string {
        return 'dev-todos';
    }

    public done(): ToDo[] {
        return this.models.filter(m => m.done);
    }

    public remaining(): ToDo[] {
        return this.models.filter(m => !m.done);
    }

    public nextOrder(): number {
        if (!this.length) {
            return 1;
        } else {
            return this.last()?.order! + 1; // eslint-disable-line
        }
    }
}

export const todos = setOrderProvider(new ToDoList()) as ToDoList;
