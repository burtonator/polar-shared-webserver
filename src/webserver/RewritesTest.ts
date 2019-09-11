import {assert} from 'chai';
import {Rewrites} from "./Rewrites";
import {PathToRegexps} from "./PathToRegexps";

describe('RewritesTest', function() {

    it("basic", async function() {

        assert.equal(Rewrites.matchesRegex(PathToRegexps.pathToRegexp("/product/:product"), "/product/windows"), true);

    });

});
