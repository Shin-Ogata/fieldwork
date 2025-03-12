import {
    type UnknownFunction,
    setInterval,
    clearInterval,
} from '@cdp/core-utils';
import { hooks } from '@cdp/template';

const { useState, useEffect } = hooks;

export const  useInterval = (
    { startImmediate, duration, callback }: { startImmediate?: boolean; duration: number; callback?: UnknownFunction; }
): { start: () => void; stop: () => void; } => {
    const [intervalState, setIntervalState] = useState(!!startImmediate);

    useEffect(
        (): UnknownFunction | void => {
            if (intervalState) {
                const intervalId = setInterval(
                    () => {
                        callback?.(intervalState);
                    },
                    duration,
                );

                return () => {
                    if (intervalId) {
                        clearInterval(intervalId);
                    }
                };
            } else {
                callback?.(intervalState);
            }
        }
    );

    return {
        start: () => {
            setIntervalState(true);
        },
        stop: () => {
            setIntervalState(false);
        },
    };
};
