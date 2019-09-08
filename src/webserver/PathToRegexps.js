"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RegExps_1 = require("../../../polar-shared/src/util/RegExps");
class PathToRegexps {
    static pathToRegexp(pattern) {
        pattern = RegExps_1.RegExps.escape(pattern);
        return pattern.replace(/(\/)(:[^/]+)/g, (subst, ...args) => {
            return args[0] + "([^/]+)";
        });
    }
}
exports.PathToRegexps = PathToRegexps;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGF0aFRvUmVnZXhwcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlBhdGhUb1JlZ2V4cHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw2Q0FBd0M7QUFFeEMsTUFBYSxhQUFhO0lBU2YsTUFBTSxDQUFDLFlBQVksQ0FBQyxPQUFlO1FBRXRDLE9BQU8sR0FBRyxpQkFBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVsQyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsSUFBVyxFQUFVLEVBQUU7WUFDdEUsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDO1FBQy9CLENBQUMsQ0FBQyxDQUFDO0lBRVAsQ0FBQztDQUVKO0FBbkJELHNDQW1CQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7UmVnRXhwc30gZnJvbSBcIi4uL3V0aWwvUmVnRXhwc1wiO1xuXG5leHBvcnQgY2xhc3MgUGF0aFRvUmVnZXhwcyB7XG5cbiAgICAvLyBUT0RPOiBtaWdyYXRlIHRvIHVzaW5nOiBwYXRoLXRvLXJlZ2V4cCBhcyB0aGlzIGlzIHdoYXQgcmVhY3Qtcm91dGVyIGlzXG4gICAgLy8gdXNpbmcgaW50ZXJuYWxseS5cbiAgICAvL1xuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9waWxsYXJqcy9wYXRoLXRvLXJlZ2V4cC90cmVlL3YxLjcuMFxuICAgIC8vXG4gICAgLy8gV0FSTklORzogSSB0cmllZCBidXQgdGhlIHR5cGVzY3JpcHQgYmluZGluZ3MgYXJlbid0IGZ1bmN0aW9uYWxcblxuICAgIHB1YmxpYyBzdGF0aWMgcGF0aFRvUmVnZXhwKHBhdHRlcm46IHN0cmluZykge1xuXG4gICAgICAgIHBhdHRlcm4gPSBSZWdFeHBzLmVzY2FwZShwYXR0ZXJuKTtcblxuICAgICAgICByZXR1cm4gcGF0dGVybi5yZXBsYWNlKC8oXFwvKSg6W14vXSspL2csIChzdWJzdCwgLi4uYXJnczogYW55W10pOiBzdHJpbmcgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGFyZ3NbMF0gKyBcIihbXi9dKylcIjtcbiAgICAgICAgfSk7XG5cbiAgICB9XG5cbn1cbiJdfQ==
