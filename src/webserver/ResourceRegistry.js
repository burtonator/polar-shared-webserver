"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
class ResourceRegistry {
    constructor() {
        this.registry = {};
    }
    register(appPath, filePath) {
        filePath = path_1.default.resolve(filePath);
        this.registry[appPath] = filePath;
    }
    contains(appPath) {
        return appPath in this.registry;
    }
    get(appPath) {
        if (!this.contains(appPath)) {
            throw new Error("Not registered: " + appPath);
        }
        return this.registry[appPath];
    }
}
exports.ResourceRegistry = ResourceRegistry;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmVzb3VyY2VSZWdpc3RyeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlJlc291cmNlUmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxnREFBd0I7QUFNeEIsTUFBYSxnQkFBZ0I7SUFBN0I7UUFLcUIsYUFBUSxHQUFnQyxFQUFFLENBQUM7SUEwQmhFLENBQUM7SUFyQlUsUUFBUSxDQUFDLE9BQWdCLEVBQUUsUUFBa0I7UUFFaEQsUUFBUSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxRQUFRLENBQUM7SUFFdEMsQ0FBQztJQUVNLFFBQVEsQ0FBQyxPQUFnQjtRQUM1QixPQUFPLE9BQU8sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3BDLENBQUM7SUFFTSxHQUFHLENBQUMsT0FBZTtRQUV0QixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxDQUFDO1NBQ2pEO1FBRUQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRWxDLENBQUM7Q0FFSjtBQS9CRCw0Q0ErQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuXG4vKipcbiAqIFZlcnkgc2ltaWxhciB0byBGaWxlUmVnaXN0cnkgYnV0IHdlIHN0b3JlIHBhdGggdG8gZmlsZXMgYW5kIHRoZSBiYWNraW5nXG4gKiBmaWxlIG9uIGRpc2suXG4gKi9cbmV4cG9ydCBjbGFzcyBSZXNvdXJjZVJlZ2lzdHJ5IHtcblxuICAgIC8qKlxuICAgICAqIFRoZSByZWdpc3RyeSBvZiBmaWxlIHBhdGhzIGFuZCByZXNvdXJjZXMgdG8gc2VydmUuXG4gICAgICovXG4gICAgcHJpdmF0ZSByZWFkb25seSByZWdpc3RyeToge1thcHBQYXRoOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqL1xuICAgIHB1YmxpYyByZWdpc3RlcihhcHBQYXRoOiBBcHBQYXRoLCBmaWxlUGF0aDogRmlsZVBhdGgpOiB2b2lkIHtcblxuICAgICAgICBmaWxlUGF0aCA9IHBhdGgucmVzb2x2ZShmaWxlUGF0aCk7XG4gICAgICAgIHRoaXMucmVnaXN0cnlbYXBwUGF0aF0gPSBmaWxlUGF0aDtcblxuICAgIH1cblxuICAgIHB1YmxpYyBjb250YWlucyhhcHBQYXRoOiBBcHBQYXRoKSB7XG4gICAgICAgIHJldHVybiBhcHBQYXRoIGluIHRoaXMucmVnaXN0cnk7XG4gICAgfVxuXG4gICAgcHVibGljIGdldChhcHBQYXRoOiBzdHJpbmcpOiBGaWxlUGF0aCB7XG5cbiAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5zKGFwcFBhdGgpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgcmVnaXN0ZXJlZDogXCIgKyBhcHBQYXRoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLnJlZ2lzdHJ5W2FwcFBhdGhdO1xuXG4gICAgfVxuXG59XG5cbi8qKlxuICogVGhlIGZ1bGwgcGF0aCB0byBsb2FkIHRoZSBmaWxlIGluIHRoZSB3ZWJhcHAuXG4gKi9cbmV4cG9ydCB0eXBlIEFwcFBhdGggPSBzdHJpbmc7XG5cbi8qKlxuICogVGhlIGZ1bGwgcGF0aCB0byBhIGxvY2FsIGZpbGUuXG4gKi9cbmV4cG9ydCB0eXBlIEZpbGVQYXRoID0gc3RyaW5nO1xuIl19