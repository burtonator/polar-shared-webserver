import { IDStr } from "polar-shared/src/util/Strings";
import { URLPathStr, URLRegularExpressionStr } from "polar-shared/src/url/PathToRegexps";
export declare class Rewrites {
    static matchesRegex(regex: URLRegularExpressionStr, path: URLPathStr): boolean;
}
export declare type ContentGenerator = (url: string) => Promise<string>;
export interface IDRewrite {
    readonly id: IDStr;
    readonly source: string;
    readonly destination: string | ContentGenerator;
}
export interface DestinationRewrite {
    readonly source: string;
    readonly destination: string | ContentGenerator;
}
export interface FunctionRewrite {
    readonly source: string;
    readonly function: string;
}
export declare type Rewrite = DestinationRewrite;
export declare type Predicate<V, R> = (value: V) => R;
export declare type RewritePredicate = Predicate<string, Rewrite>;
