import {IDStr} from "polar-shared/src/util/Strings";

export class Rewrites {

    public static matchesRegex(regex: URLRegularExpressionStr, path: PathStr): boolean {

        const re = new RegExp(regex);
        const matches = re.exec(path);

        if (matches && matches[0] === path) {
            return true;
        }

        return false;

    }

}


export type ContentGenerator = (url: string) => Promise<string>;

export interface IDRewrite {
    readonly id: IDStr;
    readonly source: string;
    readonly destination: string | ContentGenerator;
}

export interface Rewrite {
    readonly source: string;
    readonly destination: string | ContentGenerator;
}

export type PathStr = string;

export type RegexStr = string;
export type URLRegularExpressionStr = RegexStr;

export type Predicate<V, R> = (value: V) => R;

export type RewritePredicate = Predicate<string, Rewrite>;
