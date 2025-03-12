import { TemplateEngine } from '@cdp/core-template';
import { type DOM, dom as $ } from '@cdp/dom';
import { View, type ViewEventsHash } from '@cdp/view';
import type { ToDo } from './todo';
import { todos } from './todo-list';
import { ToDoView } from './todo-view';
import './utils';

const _template = TemplateEngine.compile($('#stats-template').html());

export class AppView extends View {

    private _$main: DOM<HTMLElement>;
    private _$footer: DOM<HTMLElement>;
    private _$input: DOM<HTMLInputElement>;
    private _allCheckbox: HTMLInputElement;

    constructor() {
        super({ el: '#todoapp' });
        this._$input      = this.$('#new-todo') as DOM<HTMLInputElement>;
        this._allCheckbox = this.$('#toggle-all')[0] as HTMLInputElement;

        this.listenTo(todos, '@add', this.addOne.bind(this));
        this.listenTo(todos, '@reset', this.addAll.bind(this));
        this.listenTo(todos, '*', this.render.bind(this));

        this._$footer = this.$('footer');
        this._$main = $('#main');

        void todos.fetch();
    }

    protected events(): ViewEventsHash<HTMLElement> {
        /* eslint-disable @typescript-eslint/unbound-method */
        return {
            'keypress #new-todo':     this.createOnEnter,
            'click #clear-completed': this.clearCompleted,
            'click #toggle-all':      this.toggleAllComplete,
        };
        /* eslint-enable @typescript-eslint/unbound-method */
    }

    render(): void {
        const done      = todos.done().length;
        const remaining = todos.remaining().length;
        const singular  = { done: 1 === done, remaining: 1 === remaining };

        if (todos.length) {
            this._$main.show();
            this._$footer.show();
            this._$footer.html(_template({ done, remaining, singular }));
        } else {
            this._$main.hide();
            this._$footer.hide();
        }

        this._allCheckbox.checked = !remaining;
    }

    private addOne(todo: ToDo): void {
        const view = new ToDoView(todo);
        this.$('#todo-list').append(view.render().el);
    }

    private addAll(): void {
        for (const model of todos.models) {
            this.addOne(model);
        }
    }

    private createOnEnter(e: KeyboardEvent): void {
        if (13 !== e.keyCode) {
            return;
        }
        if (!this._$input.val()) {
            return;
        }
        todos.create({ title: this._$input.val() });
        this._$input.val('');
    }

    private clearCompleted(): boolean {
        for (const model of todos.done()) {
            void model.destroy();
        }
        return false;
    }

    private toggleAllComplete(): void {
        const done = this._allCheckbox.checked;
        for (const model of todos.models) {
            void model.save({ done });
        }
    }
}
