/* eslint-disable @typescript-eslint/no-explicit-any */

import { Arguments } from '@cdp/core-utils';
import {
    Subscribable,
    Subscription,
    EventSchema,
} from '@cdp/events';

const _subscriptions = Symbol('subscriptions');

/**
 * @en
 * @ja
 */
export class EventsListener {
    private readonly [_subscriptions]: Subscription[] = [];

    /**
     */
    public listenTo<T extends Subscribable<any>, Event extends EventSchema<T>, Channel extends keyof Event>(
        target: T,
        channel: Channel | Channel[],
        listener: (...args: Arguments<Event[Channel]>) => unknown
    ): Subscription {
        const subscription = target.on(channel as string, listener as any);
        this[_subscriptions].push(subscription);
        return subscription;
    }
}

/*
interface Hoge {
    str: string;
    num: number;
}

interface Fuga extends Subscribable<Hoge> {
    bool: boolean;
}

let hoge!: Hoge;
let fuga!: Fuga;
let listener = new EventsListener();
listener.listenTo(fuga, 'str', (arg: string) => { });
*/
