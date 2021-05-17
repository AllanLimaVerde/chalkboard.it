import * as express from 'express';
export interface Req extends express.Request<any> {
    userId?: string;
    sessionId?: string;
}
export declare function parseCookies(str: string): {
    [name: string]: string;
};
