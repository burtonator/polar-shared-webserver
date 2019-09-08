export declare class Rewrites {
    static matchesRegex(regex: URLRegularExpressionStr, path: PathStr): boolean;
}
export interface Rewrite {
    readonly source: string;
    readonly destination: string;
}
export declare type PathStr = string;
export declare type RegexStr = string;
export declare type URLRegularExpressionStr = RegexStr;
export declare type Predicate<V, R> = (value: V) => R;
export declare type RewritePredicate = Predicate<string, Rewrite>;
