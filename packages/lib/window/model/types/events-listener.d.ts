import { Arguments } from '@cdp/core-utils';
import { Subscribable, Subscription, EventSchema } from '@cdp/events';
declare const _subscriptions: unique symbol;
/**
 * @en
 * @ja
 */
export declare class EventsListener {
    private readonly [_subscriptions];
    /**
     */
    listenTo<T extends Subscribable<any>, Event extends EventSchema<T>, Channel extends keyof Event>(target: T, channel: Channel | Channel[], listener: (...args: Arguments<Event[Channel]>) => unknown): Subscription;
}
export {};
