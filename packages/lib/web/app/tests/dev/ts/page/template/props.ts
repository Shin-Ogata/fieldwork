import { type PlainObject, luid } from '@cdp/core-utils';
import { ObservableObject } from '@cdp/observable';

interface Item {
    id: string;
    score: number;
}

export class Props extends ObservableObject {
    interval     = 0;
    text         = '';
    list: Item[] = [];
    get now(): string {
        return this.interval ? new Date().toLocaleTimeString() : '';
    }

    addListItem(): void {
        this.list.push({
            id: luid('item-', 8),
            score: Math.random() * 0.5 + 0.5,
        });
        this.notify('list');
    }

    removeListItem(): void {
        if (this.list.length) {
            this.list.pop();
            this.notify('list');
        }
    }

    resetListItem(): void {
        if (this.list.length) {
            this.list.length = 0;
            this.notify('list');
        }
    }

    toJSON(): PlainObject {
        return { ...this, now: this.now } as unknown as PlainObject;
    }
}
