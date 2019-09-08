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
describe('PathToRegexps', function () {
    it("basic", function () {
        return __awaiter(this, void 0, void 0, function* () {
            chai_1.assert.equal(PathToRegexps_1.PathToRegexps.pathToRegexp("/:foo"), "/([^/]+)");
            chai_1.assert.equal(PathToRegexps_1.PathToRegexps.pathToRegexp("/products/:product/page/:page"), "/products/([^/]+)/page/([^/]+)");
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGF0aFRvUmVnZXhwc1Rlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJQYXRoVG9SZWdleHBzVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBLCtCQUE0QjtBQUM1QixtREFBOEM7QUFFOUMsUUFBUSxDQUFDLGVBQWUsRUFBRTtJQUVsQixFQUFFLENBQUMsT0FBTyxFQUFFOztZQUVSLGFBQU0sQ0FBQyxLQUFLLENBQUMsNkJBQWEsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDOUQsYUFBTSxDQUFDLEtBQUssQ0FBQyw2QkFBYSxDQUFDLFlBQVksQ0FBQywrQkFBK0IsQ0FBQyxFQUFFLGdDQUFnQyxDQUFDLENBQUM7UUFFaEgsQ0FBQztLQUFBLENBQUMsQ0FBQztBQUVYLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHthc3NlcnR9IGZyb20gJ2NoYWknO1xuaW1wb3J0IHtQYXRoVG9SZWdleHBzfSBmcm9tIFwiLi9QYXRoVG9SZWdleHBzXCI7XG5cbmRlc2NyaWJlKCdQYXRoVG9SZWdleHBzJywgZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgaXQoXCJiYXNpY1wiLCBhc3luYyBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKFBhdGhUb1JlZ2V4cHMucGF0aFRvUmVnZXhwKFwiLzpmb29cIiksIFwiLyhbXi9dKylcIik7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwoUGF0aFRvUmVnZXhwcy5wYXRoVG9SZWdleHAoXCIvcHJvZHVjdHMvOnByb2R1Y3QvcGFnZS86cGFnZVwiKSwgXCIvcHJvZHVjdHMvKFteL10rKS9wYWdlLyhbXi9dKylcIik7XG5cbiAgICAgICAgfSk7XG5cbn0pO1xuIl19