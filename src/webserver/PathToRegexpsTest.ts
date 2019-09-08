import {assert} from 'chai';
import {PathToRegexps} from "./PathToRegexps";
import {Rewrites} from "./Rewrites";

describe('PathToRegexps', function() {

    it("basic", async function() {

        assert.equal(PathToRegexps.pathToRegexp("/:foo"), "/([^/]+)");
        assert.equal(PathToRegexps.pathToRegexp("/products/:product/page/:page"), "/products/([^/]+)/page/([^/]+)");

        const regexp = PathToRegexps.pathToRegexp("/webapp/icon.png");

        assert.ok(Rewrites.matchesRegex(regexp, '/webapp/icon.png'));

    });

});
