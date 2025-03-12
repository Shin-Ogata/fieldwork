import { type CancelToken, Promise } from '@cdp/promise';

export function resolve100(token?: CancelToken): Promise<string> {
    return new Promise((resolve) => {
        setTimeout(() => resolve('resolve:100'), 100);
    }, token);
}

export function resolve50(token?: CancelToken): Promise<string> {
    return new Promise((resolve) => {
        setTimeout(() => resolve('resolve:50'), 50);
    }, token);
}

export function resolve0(token?: CancelToken): Promise<string> {
    return new Promise((resolve) => {
        setTimeout(() => resolve('resolve:0'), 0);
    }, token);
}

export function reject100(token?: CancelToken): Promise<string> {
    return new Promise((resolve, reject) => {
        setTimeout(() => reject('reject:100'), 100);
    }, token);
}

export function reject50(token?: CancelToken): Promise<string> {
    return new Promise((resolve, reject) => {
        setTimeout(() => reject('reject:50'), 50);
    }, token);
}

export function reject0(token?: CancelToken): Promise<string> {
    return new Promise((resolve, reject) => {
        setTimeout(() => reject('reject:0'), 0);
    }, token);
}
