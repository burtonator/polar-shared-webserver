/// <reference types="node" />
import { Rewrite } from "./Rewrites";
export declare class WebserverConfig implements IWebserverConfig {
    readonly dir: string;
    readonly port: number;
    readonly host: string;
    readonly useSSL?: boolean;
    readonly ssl?: SSLConfig;
    readonly rewrites?: ReadonlyArray<Rewrite>;
    constructor(dir: string, port: number);
}
export declare class WebserverConfigs {
    static create(config: IWebserverConfig): WebserverConfig;
}
export interface SSLConfig {
    key: string | Buffer;
    cert: string | Buffer;
}
export interface IWebserverConfig {
    readonly dir: string;
    readonly port: number;
    readonly host?: string;
    readonly useSSL?: boolean;
    readonly ssl?: SSLConfig;
    readonly rewrites?: ReadonlyArray<Rewrite>;
}
