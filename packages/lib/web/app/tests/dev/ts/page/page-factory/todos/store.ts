import { Store, State } from './interfaces';
import { renderTodos } from './render';

const createStore = <T>(initialState: T): Store => {
    let data = initialState;

    return (update: Partial<State> | null = null): State => {
        if (update) {
            data = { ...data, ...update };
            renderTodos();
        }
        return data as unknown as State;
    };
};

export const store = createStore({
    tasks: [],
    selectedTasks: [],
    inputText: '',
});
