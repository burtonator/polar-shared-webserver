"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const PathToRegexps_1 = require("./PathToRegexps");
const Rewrites_1 = require("./Rewrites");
describe('PathToRegexps', function () {
    it("basic", function () {
        return __awaiter(this, void 0, void 0, function* () {
            chai_1.assert.equal(PathToRegexps_1.PathToRegexps.pathToRegexp("/:foo"), "/([^/]+)");
            chai_1.assert.equal(PathToRegexps_1.PathToRegexps.pathToRegexp("/products/:product/page/:page"), "/products/([^/]+)/page/([^/]+)");
            const regexp = PathToRegexps_1.PathToRegexps.pathToRegexp("/webapp/icon.png");
            chai_1.assert.ok(Rewrites_1.Rewrites.matchesRegex(regexp, '/webapp/icon.png'));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGF0aFRvUmVnZXhwc1Rlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJQYXRoVG9SZWdleHBzVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBLCtCQUE0QjtBQUM1QixtREFBOEM7QUFDOUMseUNBQW9DO0FBRXBDLFFBQVEsQ0FBQyxlQUFlLEVBQUU7SUFFdEIsRUFBRSxDQUFDLE9BQU8sRUFBRTs7WUFFUixhQUFNLENBQUMsS0FBSyxDQUFDLDZCQUFhLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQzlELGFBQU0sQ0FBQyxLQUFLLENBQUMsNkJBQWEsQ0FBQyxZQUFZLENBQUMsK0JBQStCLENBQUMsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO1lBRTVHLE1BQU0sTUFBTSxHQUFHLDZCQUFhLENBQUMsWUFBWSxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFFOUQsYUFBTSxDQUFDLEVBQUUsQ0FBQyxtQkFBUSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1FBRWpFLENBQUM7S0FBQSxDQUFDLENBQUM7QUFFUCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7YXNzZXJ0fSBmcm9tICdjaGFpJztcbmltcG9ydCB7UGF0aFRvUmVnZXhwc30gZnJvbSBcIi4vUGF0aFRvUmVnZXhwc1wiO1xuaW1wb3J0IHtSZXdyaXRlc30gZnJvbSBcIi4vUmV3cml0ZXNcIjtcblxuZGVzY3JpYmUoJ1BhdGhUb1JlZ2V4cHMnLCBmdW5jdGlvbigpIHtcblxuICAgIGl0KFwiYmFzaWNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgYXNzZXJ0LmVxdWFsKFBhdGhUb1JlZ2V4cHMucGF0aFRvUmVnZXhwKFwiLzpmb29cIiksIFwiLyhbXi9dKylcIik7XG4gICAgICAgIGFzc2VydC5lcXVhbChQYXRoVG9SZWdleHBzLnBhdGhUb1JlZ2V4cChcIi9wcm9kdWN0cy86cHJvZHVjdC9wYWdlLzpwYWdlXCIpLCBcIi9wcm9kdWN0cy8oW14vXSspL3BhZ2UvKFteL10rKVwiKTtcblxuICAgICAgICBjb25zdCByZWdleHAgPSBQYXRoVG9SZWdleHBzLnBhdGhUb1JlZ2V4cChcIi93ZWJhcHAvaWNvbi5wbmdcIik7XG5cbiAgICAgICAgYXNzZXJ0Lm9rKFJld3JpdGVzLm1hdGNoZXNSZWdleChyZWdleHAsICcvd2ViYXBwL2ljb24ucG5nJykpO1xuXG4gICAgfSk7XG5cbn0pO1xuIl19