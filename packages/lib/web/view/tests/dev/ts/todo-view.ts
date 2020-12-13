import { TemplateEngine } from '@cdp/core-template';
import { DOM, dom as $ } from '@cdp/dom';
import { View, ViewEventsHash } from '@cdp/view';
import { ToDo, ToDoEventSource } from './todo';

const _template = TemplateEngine.compile($('#item-template').html());

export class ToDoView extends View {
    private _model: ToDo;
    private _$input?: DOM<HTMLInputElement>;

    constructor(todo: ToDo) {
        super({ tagName: 'li' });
        this._model = todo;
        this.listenTo(this._model as ToDoEventSource, '@change', this.render.bind(this));
        this.listenTo(this._model as ToDoEventSource, '@destroy', this.remove.bind(this));
    }

    protected events(): ViewEventsHash<HTMLElement> {
        /* eslint-disable @typescript-eslint/unbound-method */
        return {
            'click .toggle':   this.toggleDone,
            'dblclick .view':  this.edit,
            'click a.destroy': this.clear,
            'keypress .edit':  this.updateOnEnter,
            'blur .edit':      this.close,
        };
        /* eslint-enable @typescript-eslint/unbound-method */
    }

    render(): this {
        this.$el.html(_template(this._model.toJSON()));
        this.$el.toggleClass('done', this._model.done);
        this._$input = this.$('.edit') as DOM<HTMLInputElement>;
        return this;
    }

    private toggleDone(): void {
        void this._model.toggle();
    }

    private edit(): void {
        this.$el.addClass('editing');
        this._$input?.focus();
    }

    private close(): void {
        const value = this._$input?.val();
        if (!value) {
            this.clear();
        } else {
            void this._model.save({ title: value });
            this.$el.removeClass('editing');
        }
    }

    private updateOnEnter(e: KeyboardEvent): void {
        if (13 === e.keyCode) {
            this.close();
        }
    }

    private clear(): void {
        void this._model.destroy();
    }
}
