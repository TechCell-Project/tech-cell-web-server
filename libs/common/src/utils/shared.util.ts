import { RpcException } from '@nestjs/microservices';
import { catchError, throwError } from 'rxjs';

/**
 * @returns A function to catch exception from microservice and throw it to client
 */
export const catchException = () =>
    catchError((error) => throwError(() => new RpcException(error.response)));

// create a function to generate random string
export function generateRandomString(length: number) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters[(Math.random() * charactersLength) | 0];
    }
    return result;
}

export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert time string to ms (milliseconds)
 * @param timeString - e.g., 1d, 1h, 1m, 1s
 * @returns time in ms
 */
export function timeStringToMs(timeString: string): number {
    const timeValue = parseInt(timeString.slice(0, -1));
    const timeUnit = timeString.slice(-1);

    switch (timeUnit) {
        case 's':
            return timeValue * 1000;
        case 'm':
            return timeValue * 60 * 1000;
        case 'h':
            return timeValue * 60 * 60 * 1000;
        case 'd':
            return timeValue * 24 * 60 * 60 * 1000;
        case 'y':
            return timeValue * 365 * 24 * 60 * 60 * 1000;
        default:
            throw new Error(`Invalid time unit: ${timeUnit}`);
    }
}

export function dateFormat(date: Date, format: string): string {
    const pad = (n: number) => (n < 10 ? `0${n}` : n).toString();
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hour = pad(date.getHours());
    const minute = pad(date.getMinutes());
    const second = pad(date.getSeconds());

    return format
        .replace('yyyy', year.toString())
        .replace('MM', month)
        .replace('dd', day)
        .replace('HH', hour)
        .replace('mm', minute)
        .replace('ss', second);
}
