export declare class ResourceRegistry {
    private readonly registry;
    register(appPath: AppPath, filePath: FilePath): void;
    contains(appPath: AppPath): boolean;
    get(appPath: string): FilePath;
}
export declare type AppPath = string;
export declare type FilePath = string;
