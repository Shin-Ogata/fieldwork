import {
    UnknownFunction,
    setInterval,
    clearInterval,
    post,
} from '@cdp/core-utils';
import { useState, useEffect } from './basic';

export const  useInterval = (
    { startImmediate, duration, callback }: { startImmediate?: boolean; duration: number; callback?: UnknownFunction; }
): { start: () => void; stop: () => void; } => {
    const [intervalState, setIntervalState] = useState(!!startImmediate);
    const [needStopCall, setStopCallState] = useState(false);

    useEffect(
        (): UnknownFunction | void => {
            if (intervalState) {
                const intervalId = setInterval(
                    () => {
                        callback && callback(intervalState);
                    },
                    duration,
                );

                // NOTE: unmount の代わりに使用している
                return () => {
                    if (intervalId) {
                        clearInterval(intervalId);
                    }
                };
            } else if (needStopCall) {
                setStopCallState(false, { noUpdate: true });
                // avoid recursive call
                callback && void post(() => callback(intervalState));
            }
        }
    );

    return {
        start: () => {
            setIntervalState(true);
        },
        stop: () => {
            setStopCallState(true, { noUpdate: true });
            setIntervalState(false);
        },
    };
};
