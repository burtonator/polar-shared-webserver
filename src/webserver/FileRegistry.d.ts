import { WebserverConfig } from './WebserverConfig';
export declare class FileRegistry {
    private readonly webserverConfig;
    private readonly registry;
    constructor(webserverConfig: WebserverConfig);
    registerFile(filename: string): RegisterEntry;
    register(key: string, filename: string): RegisterEntry;
    hasKey(key: string): boolean;
    get(key: string): FileEntry;
}
export interface FileEntry {
    readonly key: string;
    readonly filename: string;
}
export interface RegisterEntry extends FileEntry {
    readonly url: string;
}
