import { WebserverConfig } from './WebserverConfig';
import { FileRegistry } from './FileRegistry';
import express, { Express, RequestHandler } from 'express';
import { ResourceRegistry } from './ResourceRegistry';
import { Rewrite } from "./Rewrites";
import { PathParams } from 'express-serve-static-core';
import { PathStr } from 'polar-shared/src/util/Strings';
export declare class Webserver implements WebRequestHandler {
    private readonly webserverConfig;
    private readonly fileRegistry;
    private readonly resourceRegistry;
    private app?;
    private server?;
    constructor(webserverConfig: WebserverConfig, fileRegistry: FileRegistry, resourceRegistry?: ResourceRegistry);
    start(): Promise<void>;
    static createApp(dir: PathStr, rewrites?: ReadonlyArray<Rewrite>): Express;
    stop(): void;
    get(type: PathParams, ...handlers: RequestHandler[]): void;
    options(type: PathParams, ...handlers: RequestHandler[]): void;
    post(type: PathParams, ...handlers: RequestHandler[]): void;
    put(type: PathParams, ...handlers: RequestHandler[]): void;
    private registerFilesHandler;
    private registerResourcesHandler;
    private static registerRewrites;
}
export declare type ExpressRequestHandler = (req: express.Request, res: express.Response) => void;
export interface WebRequestHandler {
    get(type: PathParams, ...handlers: ExpressRequestHandler[]): void;
    options(type: PathParams, ...handlers: ExpressRequestHandler[]): void;
    post(type: PathParams, ...handlers: ExpressRequestHandler[]): void;
    put(type: PathParams, ...handlers: ExpressRequestHandler[]): void;
}
