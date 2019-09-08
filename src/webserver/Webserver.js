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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = require("polar-shared/src/logger/Logger");
const Preconditions_1 = require("polar-shared/src/Preconditions");
const Paths_1 = require("polar-shared/src/util/Paths");
const express_1 = __importDefault(require("express"));
const serve_static_1 = __importDefault(require("serve-static"));
const ResourceRegistry_1 = require("./ResourceRegistry");
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const FilePaths_1 = require("polar-shared/src/util/FilePaths");
const Rewrites_1 = require("./Rewrites");
const PathToRegexps_1 = require("./PathToRegexps");
const log = Logger_1.Logger.create();
const STATIC_CACHE_MAX_AGE = 365 * 24 * 60 * 60;
class Webserver {
    constructor(webserverConfig, fileRegistry, resourceRegistry = new ResourceRegistry_1.ResourceRegistry()) {
        this.webserverConfig = Preconditions_1.Preconditions.assertNotNull(webserverConfig, "webserverConfig");
        this.fileRegistry = Preconditions_1.Preconditions.assertNotNull(fileRegistry, "fileRegistry");
        this.resourceRegistry = resourceRegistry;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            log.info("Running with config: ", this.webserverConfig);
            express_1.default.static.mime.define({ 'text/html': ['chtml'] });
            this.app = Webserver.createApp(this.webserverConfig.dir, this.webserverConfig.rewrites);
            const requestLogger = (req, res, next) => {
                console.info(`${req.method} ${req.url}`);
                console.info(req.headers);
                console.info();
                console.info('====');
                next();
            };
            this.registerFilesHandler();
            this.registerResourcesHandler();
            if (this.webserverConfig.useSSL) {
                Preconditions_1.Preconditions.assertPresent(this.webserverConfig.ssl, "No SSLConfig");
                const sslConfig = {
                    key: this.webserverConfig.ssl.key,
                    cert: this.webserverConfig.ssl.cert
                };
                this.server =
                    https.createServer(sslConfig, this.app)
                        .listen(this.webserverConfig.port, this.webserverConfig.host);
            }
            else {
                this.server =
                    http.createServer(this.app)
                        .listen(this.webserverConfig.port, this.webserverConfig.host);
            }
            return new Promise(resolve => {
                this.server.once('listening', () => resolve());
            });
        });
    }
    static createApp(dir, rewrites = []) {
        const app = express_1.default();
        this.registerRewrites(app, rewrites);
        app.use((req, res, next) => {
            next();
            if (req.path && req.path.endsWith('woff2')) {
                res.set({ 'Cache-Control': `public, max-age=${STATIC_CACHE_MAX_AGE}, immutable` });
            }
        });
        app.use(serve_static_1.default(dir, { immutable: true }));
        for (const page of ['login.html', 'index.html']) {
            const pagePath = FilePaths_1.FilePaths.join(dir, 'apps', 'repository', page);
            app.use(`/${page}`, serve_static_1.default(pagePath, { immutable: true }));
        }
        app.use(express_1.default.json());
        app.use(express_1.default.urlencoded());
        return app;
    }
    stop() {
        log.info("Stopping...");
        this.server.close();
        log.info("Stopping...done");
    }
    get(type, ...handlers) {
        this.app.get(type, ...handlers);
    }
    options(type, ...handlers) {
        this.app.options(type, ...handlers);
    }
    post(type, ...handlers) {
        this.app.post(type, ...handlers);
    }
    put(type, ...handlers) {
        this.app.put(type, ...handlers);
    }
    registerFilesHandler() {
        this.app.get(/files\/.*/, (req, res) => {
            try {
                log.info("Handling file at path: " + req.path);
                const hashcode = Paths_1.Paths.basename(req.path);
                if (!hashcode) {
                    const msg = "No key given for /file";
                    log.error(msg);
                    res.status(404).send(msg);
                }
                else if (!this.fileRegistry.hasKey(hashcode)) {
                    const msg = "File not found with hashcode: " + hashcode;
                    log.error(msg);
                    res.status(404).send(msg);
                }
                else {
                    const keyMeta = this.fileRegistry.get(hashcode);
                    const filename = keyMeta.filename;
                    log.info(`Serving file at ${req.path} from ${filename}`);
                    return res.sendFile(filename);
                }
            }
            catch (e) {
                log.error(`Could not handle serving file. (req.path=${req.path})`, e);
            }
        });
    }
    registerResourcesHandler() {
        this.app.get(/.*/, (req, res) => {
            try {
                log.info("Handling resource at path: " + req.path);
                if (!this.resourceRegistry.contains(req.path)) {
                    const msg = "Resource not found: " + req.path;
                    log.error(msg);
                    res.status(404).send(msg);
                }
                else {
                    const filePath = this.resourceRegistry.get(req.path);
                    return res.sendFile(filePath);
                }
            }
            catch (e) {
                log.error(`Could not handle serving file. (req.path=${req.path})`, e);
            }
        });
    }
    static registerRewrites(app, rewrites = []) {
        const computeRewrite = (url) => {
            for (const rewrite of rewrites) {
                const regex = PathToRegexps_1.PathToRegexps.pathToRegexp(rewrite.source);
                if (Rewrites_1.Rewrites.matchesRegex(regex, url)) {
                    return rewrite;
                }
            }
            return undefined;
        };
        app.use(function (req, res, next) {
            log.info("Rewrite at url: " + req.url);
            const rewrite = computeRewrite(req.url);
            if (rewrite) {
                console.log("URL rewritten to destination: " + rewrite.destination, rewrite);
                req.url = rewrite.destination;
            }
            next();
        });
    }
}
exports.Webserver = Webserver;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV2Vic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiV2Vic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLDJEQUFzRDtBQUN0RCxrRUFBNkQ7QUFDN0QsdURBQWtEO0FBRWxELHNEQUEwRjtBQUMxRixnRUFBdUM7QUFDdkMseURBQW9EO0FBQ3BELDJDQUE2QjtBQUM3Qiw2Q0FBK0I7QUFDL0IsK0RBQTBEO0FBQzFELHlDQUE2QztBQUM3QyxtREFBOEM7QUFJOUMsTUFBTSxHQUFHLEdBQUcsZUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRTVCLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBS2hELE1BQWEsU0FBUztJQVVsQixZQUFZLGVBQWdDLEVBQ2hDLFlBQTBCLEVBQzFCLG1CQUFxQyxJQUFJLG1DQUFnQixFQUFFO1FBRW5FLElBQUksQ0FBQyxlQUFlLEdBQUcsNkJBQWEsQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDdkYsSUFBSSxDQUFDLFlBQVksR0FBRyw2QkFBYSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDOUUsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDO0lBRTdDLENBQUM7SUFFWSxLQUFLOztZQUVkLEdBQUcsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBRXhELGlCQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFdkQsSUFBSSxDQUFDLEdBQUcsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxlQUFl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LG1CQUFRLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsRUFBRTtvQkFDbkMsT0FBTyxPQUFPLENBQUM7aUJBQ2xCO2FBRUo7WUFFRCxPQUFPLFNBQVMsQ0FBQztRQUVyQixDQUFDLENBQUM7UUFFRixHQUFHLENBQUMsR0FBRyxDQUFDLFVBQVMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJO1lBRzNCLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRXZDLE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFeEMsSUFBSSxPQUFPLEVBQUU7Z0JBRVQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsR0FBRyxPQUFPLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUM3RSxHQUFHLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUM7YUFDakM7WUFFRCxJQUFJLEVBQUUsQ0FBQztRQUVYLENBQUMsQ0FBQyxDQUFDO0lBRVAsQ0FBQztDQUVKO0FBblBELDhCQW1QQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7V2Vic2VydmVyQ29uZmlnfSBmcm9tICcuL1dlYnNlcnZlckNvbmZpZyc7XG5pbXBvcnQge0ZpbGVSZWdpc3RyeX0gZnJvbSAnLi9GaWxlUmVnaXN0cnknO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJ3BvbGFyLXNoYXJlZC9zcmMvbG9nZ2VyL0xvZ2dlcic7XG5pbXBvcnQge1ByZWNvbmRpdGlvbnN9IGZyb20gJ3BvbGFyLXNoYXJlZC9zcmMvUHJlY29uZGl0aW9ucyc7XG5pbXBvcnQge1BhdGhzfSBmcm9tICdwb2xhci1zaGFyZWQvc3JjL3V0aWwvUGF0aHMnO1xuXG5pbXBvcnQgZXhwcmVzcywge0V4cHJlc3MsIE5leHRGdW5jdGlvbiwgUmVxdWVzdCwgUmVxdWVzdEhhbmRsZXIsIFJlc3BvbnNlfSBmcm9tICdleHByZXNzJztcbmltcG9ydCBzZXJ2ZVN0YXRpYyBmcm9tICdzZXJ2ZS1zdGF0aWMnO1xuaW1wb3J0IHtSZXNvdXJjZVJlZ2lzdHJ5fSBmcm9tICcuL1Jlc291cmNlUmVnaXN0cnknO1xuaW1wb3J0ICogYXMgaHR0cCBmcm9tIFwiaHR0cFwiO1xuaW1wb3J0ICogYXMgaHR0cHMgZnJvbSBcImh0dHBzXCI7XG5pbXBvcnQge0ZpbGVQYXRoc30gZnJvbSAncG9sYXItc2hhcmVkL3NyYy91dGlsL0ZpbGVQYXRocyc7XG5pbXBvcnQge1Jld3JpdGUsIFJld3JpdGVzfSBmcm9tIFwiLi9SZXdyaXRlc1wiO1xuaW1wb3J0IHtQYXRoVG9SZWdleHBzfSBmcm9tIFwiLi9QYXRoVG9SZWdleHBzXCI7XG5pbXBvcnQge1BhdGhQYXJhbXN9IGZyb20gJ2V4cHJlc3Mtc2VydmUtc3RhdGljLWNvcmUnO1xuaW1wb3J0IHsgUGF0aFN0ciB9IGZyb20gJ3BvbGFyLXNoYXJlZC9zcmMvdXRpbC9TdHJpbmdzJztcblxuY29uc3QgbG9nID0gTG9nZ2VyLmNyZWF0ZSgpO1xuXG5jb25zdCBTVEFUSUNfQ0FDSEVfTUFYX0FHRSA9IDM2NSAqIDI0ICogNjAgKiA2MDtcblxuLyoqXG4gKiBTdGFydCBhIHNpbXBsZSBzdGF0aWMgSFRUUCBzZXJ2ZXIgb25seSBsaXN0ZW5pbmcgb24gbG9jYWxob3N0XG4gKi9cbmV4cG9ydCBjbGFzcyBXZWJzZXJ2ZXIgaW1wbGVtZW50cyBXZWJSZXF1ZXN0SGFuZGxlciB7XG5cbiAgICBwcml2YXRlIHJlYWRvbmx5IHdlYnNlcnZlckNvbmZpZzogV2Vic2VydmVyQ29uZmlnO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgZmlsZVJlZ2lzdHJ5OiBGaWxlUmVnaXN0cnk7XG4gICAgcHJpdmF0ZSByZWFkb25seSByZXNvdXJjZVJlZ2lzdHJ5OiBSZXNvdXJjZVJlZ2lzdHJ5O1xuXG4gICAgcHJpdmF0ZSBhcHA/OiBFeHByZXNzO1xuXG4gICAgcHJpdmF0ZSBzZXJ2ZXI/OiBodHRwLlNlcnZlciB8IGh0dHBzLlNlcnZlcjtcblxuICAgIGNvbnN0cnVjdG9yKHdlYnNlcnZlckNvbmZpZzogV2Vic2VydmVyQ29uZmlnLFxuICAgICAgICAgICAgICAgIGZpbGVSZWdpc3RyeTogRmlsZVJlZ2lzdHJ5LFxuICAgICAgICAgICAgICAgIHJlc291cmNlUmVnaXN0cnk6IFJlc291cmNlUmVnaXN0cnkgPSBuZXcgUmVzb3VyY2VSZWdpc3RyeSgpKSB7XG5cbiAgICAgICAgdGhpcy53ZWJzZXJ2ZXJDb25maWcgPSBQcmVjb25kaXRpb25zLmFzc2VydE5vdE51bGwod2Vic2VydmVyQ29uZmlnLCBcIndlYnNlcnZlckNvbmZpZ1wiKTtcbiAgICAgICAgdGhpcy5maWxlUmVnaXN0cnkgPSBQcmVjb25kaXRpb25zLmFzc2VydE5vdE51bGwoZmlsZVJlZ2lzdHJ5LCBcImZpbGVSZWdpc3RyeVwiKTtcbiAgICAgICAgdGhpcy5yZXNvdXJjZVJlZ2lzdHJ5ID0gcmVzb3VyY2VSZWdpc3RyeTtcblxuICAgIH1cblxuICAgIHB1YmxpYyBhc3luYyBzdGFydCgpOiBQcm9taXNlPHZvaWQ+IHtcblxuICAgICAgICBsb2cuaW5mbyhcIlJ1bm5pbmcgd2l0aCBjb25maWc6IFwiLCB0aGlzLndlYnNlcnZlckNvbmZpZyk7XG5cbiAgICAgICAgZXhwcmVzcy5zdGF0aWMubWltZS5kZWZpbmUoeyAndGV4dC9odG1sJzogWydjaHRtbCddIH0pO1xuXG4gICAgICAgIHRoaXMuYXBwID0gV2Vic2VydmVyLmNyZWF0ZUFwcCh0aGlzLndlYnNlcnZlckNvbmZpZy5kaXIsIHRoaXMud2Vic2VydmVyQ29uZmlnLnJld3JpdGVzKTtcblxuICAgICAgICBjb25zdCByZXF1ZXN0TG9nZ2VyID0gKHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSwgbmV4dDogTmV4dEZ1bmN0aW9uKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmluZm8oYCR7cmVxLm1ldGhvZH0gJHtyZXEudXJsfWApO1xuICAgICAgICAgICAgY29uc29sZS5pbmZvKHJlcS5oZWFkZXJzKTtcbiAgICAgICAgICAgIGNvbnNvbGUuaW5mbygpO1xuICAgICAgICAgICAgY29uc29sZS5pbmZvKCc9PT09Jyk7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH07XG5cblxuICAgICAgICAvLyB0aGlzLmFwcC51c2UocmVxdWVzdExvZ2dlcik7XG5cbiAgICAgICAgdGhpcy5yZWdpc3RlckZpbGVzSGFuZGxlcigpO1xuICAgICAgICB0aGlzLnJlZ2lzdGVyUmVzb3VyY2VzSGFuZGxlcigpO1xuXG4gICAgICAgIGlmICh0aGlzLndlYnNlcnZlckNvbmZpZy51c2VTU0wpIHtcblxuICAgICAgICAgICAgUHJlY29uZGl0aW9ucy5hc3NlcnRQcmVzZW50KHRoaXMud2Vic2VydmVyQ29uZmlnLnNzbCwgXCJObyBTU0xDb25maWdcIik7XG5cbiAgICAgICAgICAgIGNvbnN0IHNzbENvbmZpZyA9IHtcbiAgICAgICAgICAgICAgICBrZXk6IHRoaXMud2Vic2VydmVyQ29uZmlnLnNzbCEua2V5LFxuICAgICAgICAgICAgICAgIGNlcnQ6IHRoaXMud2Vic2VydmVyQ29uZmlnLnNzbCEuY2VydFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5zZXJ2ZXIgPVxuICAgICAgICAgICAgICAgIGh0dHBzLmNyZWF0ZVNlcnZlcihzc2xDb25maWcsIHRoaXMuYXBwKVxuICAgICAgICAgICAgICAgICAgICAubGlzdGVuKHRoaXMud2Vic2VydmVyQ29uZmlnLnBvcnQsIHRoaXMud2Vic2VydmVyQ29uZmlnLmhvc3QpO1xuXG4gICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgIHRoaXMuc2VydmVyID1cbiAgICAgICAgICAgICAgICBodHRwLmNyZWF0ZVNlcnZlcih0aGlzLmFwcClcbiAgICAgICAgICAgICAgICAgICAgLmxpc3Rlbih0aGlzLndlYnNlcnZlckNvbmZpZy5wb3J0LCB0aGlzLndlYnNlcnZlckNvbmZpZy5ob3N0KTtcblxuICAgICAgICB9XG5cbiAgICAgICAgLy8gYXdhaXQgZm9yIGxpc3RlbmluZy4uLlxuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPihyZXNvbHZlID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2VydmVyIS5vbmNlKCdsaXN0ZW5pbmcnLCAoKSA9PiByZXNvbHZlKCkpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBsb2cuaW5mbyhgV2Vic2VydmVyIHVwIGFuZCBydW5uaW5nIG9uIHBvcnRcbiAgICAgICAgLy8gJHt0aGlzLndlYnNlcnZlckNvbmZpZy5wb3J0fSB3aXRoIGNvbmZpZzogYCwgdGhpcy53ZWJzZXJ2ZXJDb25maWcpO1xuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGFuIGV4cHJlc3MgYXBwIHRoYXQgY2FuIGJlIHVzZWQgd2l0aCBvdXIgc2VydmVyLi5cbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZUFwcChkaXI6IFBhdGhTdHIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV3cml0ZXM6IFJlYWRvbmx5QXJyYXk8UmV3cml0ZT4gPSBbXSk6IEV4cHJlc3Mge1xuXG4gICAgICAgIGNvbnN0IGFwcCA9IGV4cHJlc3MoKTtcblxuICAgICAgICAvLyBoYW5kbGUgcmV3cml0ZXMgRklSU1Qgc28gdGhhdCB3ZSBjYW4gc2VuZCBVUkxzIHRvIHRoZSByaWdodCBkZXN0aW5hdGlvblxuICAgICAgICAvLyBiZWZvcmUgYWxsIG90aGVyIGhhbmRsZXJzLlxuICAgICAgICB0aGlzLnJlZ2lzdGVyUmV3cml0ZXMoYXBwLCByZXdyaXRlcyk7XG5cbiAgICAgICAgYXBwLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcblxuICAgICAgICAgICAgbmV4dCgpO1xuXG4gICAgICAgICAgICBpZiAocmVxLnBhdGggJiYgcmVxLnBhdGguZW5kc1dpdGgoJ3dvZmYyJykpIHtcbiAgICAgICAgICAgICAgICByZXMuc2V0KHsgJ0NhY2hlLUNvbnRyb2wnOiBgcHVibGljLCBtYXgtYWdlPSR7U1RBVElDX0NBQ0hFX01BWF9BR0V9LCBpbW11dGFibGVgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRPRE86IGFkZCBpbmZpbml0ZSBjYWNoaW5nIGlmIHRoZSBmaWxlcyBhcmUgd29mZjIgd2ViIGZvbnRzLi4uXG4gICAgICAgIGFwcC51c2Uoc2VydmVTdGF0aWMoZGlyLCB7aW1tdXRhYmxlOiB0cnVlfSkpO1xuXG4gICAgICAgIGZvciAoY29uc3QgcGFnZSBvZiBbJ2xvZ2luLmh0bWwnLCAnaW5kZXguaHRtbCddKSB7XG5cbiAgICAgICAgICAgIC8vIGhhbmRsZSBleHBsaWNpdCBwYXRocyBvZiAvbG9naW4uaHRtbCBhbmQgL2luZGV4Lmh0bWwgbGlrZSB3ZVxuICAgICAgICAgICAgLy8gZG8gaW4gdGhlIHdlYmFwcC5cblxuICAgICAgICAgICAgY29uc3QgcGFnZVBhdGggPSBGaWxlUGF0aHMuam9pbihkaXIsICdhcHBzJywgJ3JlcG9zaXRvcnknLCBwYWdlKTtcblxuICAgICAgICAgICAgYXBwLnVzZShgLyR7cGFnZX1gLCBzZXJ2ZVN0YXRpYyhwYWdlUGF0aCwge2ltbXV0YWJsZTogdHJ1ZX0pKTtcblxuICAgICAgICB9XG5cbiAgICAgICAgYXBwLnVzZShleHByZXNzLmpzb24oKSk7XG4gICAgICAgIGFwcC51c2UoZXhwcmVzcy51cmxlbmNvZGVkKCkpO1xuXG4gICAgICAgIHJldHVybiBhcHA7XG5cbiAgICB9XG5cbiAgICBwdWJsaWMgc3RvcCgpIHtcblxuICAgICAgICBsb2cuaW5mbyhcIlN0b3BwaW5nLi4uXCIpO1xuICAgICAgICB0aGlzLnNlcnZlciEuY2xvc2UoKTtcbiAgICAgICAgbG9nLmluZm8oXCJTdG9wcGluZy4uLmRvbmVcIik7XG4gICAgfVxuXG4gICAgcHVibGljIGdldCh0eXBlOiBQYXRoUGFyYW1zLCAuLi5oYW5kbGVyczogUmVxdWVzdEhhbmRsZXJbXSk6IHZvaWQge1xuICAgICAgICB0aGlzLmFwcCEuZ2V0KHR5cGUsIC4uLmhhbmRsZXJzKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgb3B0aW9ucyh0eXBlOiBQYXRoUGFyYW1zLCAuLi5oYW5kbGVyczogUmVxdWVzdEhhbmRsZXJbXSk6IHZvaWQge1xuICAgICAgICB0aGlzLmFwcCEub3B0aW9ucyh0eXBlLCAuLi5oYW5kbGVycyk7XG4gICAgfVxuXG4gICAgcHVibGljIHBvc3QodHlwZTogUGF0aFBhcmFtcywgLi4uaGFuZGxlcnM6IFJlcXVlc3RIYW5kbGVyW10pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5hcHAhLnBvc3QodHlwZSwgLi4uaGFuZGxlcnMpO1xuICAgIH1cblxuICAgIHB1YmxpYyBwdXQodHlwZTogUGF0aFBhcmFtcywgLi4uaGFuZGxlcnM6IFJlcXVlc3RIYW5kbGVyW10pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5hcHAhLnB1dCh0eXBlLCAuLi5oYW5kbGVycyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSByZWdpc3RlckZpbGVzSGFuZGxlcigpIHtcblxuICAgICAgICB0aGlzLmFwcCEuZ2V0KC9maWxlc1xcLy4qLywgKHJlcTogZXhwcmVzcy5SZXF1ZXN0LCByZXM6IGV4cHJlc3MuUmVzcG9uc2UpID0+IHtcblxuICAgICAgICAgICAgdHJ5IHtcblxuICAgICAgICAgICAgICAgIGxvZy5pbmZvKFwiSGFuZGxpbmcgZmlsZSBhdCBwYXRoOiBcIiArIHJlcS5wYXRoKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGhhc2hjb2RlID0gUGF0aHMuYmFzZW5hbWUocmVxLnBhdGgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFoYXNoY29kZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtc2cgPSBcIk5vIGtleSBnaXZlbiBmb3IgL2ZpbGVcIjtcbiAgICAgICAgICAgICAgICAgICAgbG9nLmVycm9yKG1zZyk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXMoNDA0KS5zZW5kKG1zZyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghdGhpcy5maWxlUmVnaXN0cnkuaGFzS2V5KGhhc2hjb2RlKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtc2cgPSBcIkZpbGUgbm90IGZvdW5kIHdpdGggaGFzaGNvZGU6IFwiICsgaGFzaGNvZGU7XG4gICAgICAgICAgICAgICAgICAgIGxvZy5lcnJvcihtc2cpO1xuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzKDQwNCkuc2VuZChtc2cpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qga2V5TWV0YSA9IHRoaXMuZmlsZVJlZ2lzdHJ5LmdldChoYXNoY29kZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVuYW1lID0ga2V5TWV0YS5maWxlbmFtZTtcblxuICAgICAgICAgICAgICAgICAgICBsb2cuaW5mbyhgU2VydmluZyBmaWxlIGF0ICR7cmVxLnBhdGh9IGZyb20gJHtmaWxlbmFtZX1gKTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzLnNlbmRGaWxlKGZpbGVuYW1lKTtcblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGxvZy5lcnJvcihgQ291bGQgbm90IGhhbmRsZSBzZXJ2aW5nIGZpbGUuIChyZXEucGF0aD0ke3JlcS5wYXRofSlgLCBlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KTtcblxuICAgIH1cblxuICAgIHByaXZhdGUgcmVnaXN0ZXJSZXNvdXJjZXNIYW5kbGVyKCkge1xuXG4gICAgICAgIHRoaXMuYXBwIS5nZXQoLy4qLywgKHJlcTogZXhwcmVzcy5SZXF1ZXN0LCByZXM6IGV4cHJlc3MuUmVzcG9uc2UpID0+IHtcblxuICAgICAgICAgICAgdHJ5IHtcblxuICAgICAgICAgICAgICAgIGxvZy5pbmZvKFwiSGFuZGxpbmcgcmVzb3VyY2UgYXQgcGF0aDogXCIgKyByZXEucGF0aCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMucmVzb3VyY2VSZWdpc3RyeS5jb250YWlucyhyZXEucGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbXNnID0gXCJSZXNvdXJjZSBub3QgZm91bmQ6IFwiICsgcmVxLnBhdGg7XG4gICAgICAgICAgICAgICAgICAgIGxvZy5lcnJvcihtc2cpO1xuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzKDQwNCkuc2VuZChtc2cpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSB0aGlzLnJlc291cmNlUmVnaXN0cnkuZ2V0KHJlcS5wYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlcy5zZW5kRmlsZShmaWxlUGF0aCk7XG5cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBsb2cuZXJyb3IoYENvdWxkIG5vdCBoYW5kbGUgc2VydmluZyBmaWxlLiAocmVxLnBhdGg9JHtyZXEucGF0aH0pYCwgZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBwcml2YXRlIHN0YXRpYyByZWdpc3RlclJld3JpdGVzKGFwcDogRXhwcmVzcywgcmV3cml0ZXM6IFJlYWRvbmx5QXJyYXk8UmV3cml0ZT4gPSBbXSkge1xuXG4gICAgICAgIGNvbnN0IGNvbXB1dGVSZXdyaXRlID0gKHVybDogc3RyaW5nKTogUmV3cml0ZSB8IHVuZGVmaW5lZCA9PiB7XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgcmV3cml0ZSBvZiByZXdyaXRlcykge1xuXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogaXQncyBwcm9iYWJseSBub3QgZWZmaWNpZW50IHRvIGJ1aWxkIHRoaXMgcmVnZXggZWFjaFxuICAgICAgICAgICAgICAgIC8vIHRpbWVcbiAgICAgICAgICAgICAgICBjb25zdCByZWdleCA9IFBhdGhUb1JlZ2V4cHMucGF0aFRvUmVnZXhwKHJld3JpdGUuc291cmNlKTtcblxuICAgICAgICAgICAgICAgIGlmIChSZXdyaXRlcy5tYXRjaGVzUmVnZXgocmVnZXgsIHVybCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJld3JpdGU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAgICAgfTtcblxuICAgICAgICBhcHAudXNlKGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG5cbiAgICAgICAgICAgIC8vIFRPRE86IG1ha2UgdGhpcyBkZWJ1ZyBsYXRlciBvbi4uLlxuICAgICAgICAgICAgbG9nLmluZm8oXCJSZXdyaXRlIGF0IHVybDogXCIgKyByZXEudXJsKTtcblxuICAgICAgICAgICAgY29uc3QgcmV3cml0ZSA9IGNvbXB1dGVSZXdyaXRlKHJlcS51cmwpO1xuXG4gICAgICAgICAgICBpZiAocmV3cml0ZSkge1xuICAgICAgICAgICAgICAgIC8vIFRPRE86IG1ha2UgdGhpcyBkZWJ1ZyBsYXRlciBvbi4uLlxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVVJMIHJld3JpdHRlbiB0byBkZXN0aW5hdGlvbjogXCIgKyByZXdyaXRlLmRlc3RpbmF0aW9uLCByZXdyaXRlKTtcbiAgICAgICAgICAgICAgICByZXEudXJsID0gcmV3cml0ZS5kZXN0aW5hdGlvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbmV4dCgpO1xuXG4gICAgICAgIH0pO1xuXG4gICAgfVxuXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2ViUmVxdWVzdEhhbmRsZXIge1xuXG4gICAgZ2V0KHR5cGU6IFBhdGhQYXJhbXMsIC4uLmhhbmRsZXJzOiBSZXF1ZXN0SGFuZGxlcltdKTogdm9pZDtcbiAgICBvcHRpb25zKHR5cGU6IFBhdGhQYXJhbXMsIC4uLmhhbmRsZXJzOiBSZXF1ZXN0SGFuZGxlcltdKTogdm9pZDtcbiAgICBwb3N0KHR5cGU6IFBhdGhQYXJhbXMsIC4uLmhhbmRsZXJzOiBSZXF1ZXN0SGFuZGxlcltdKTogdm9pZDtcbiAgICBwdXQodHlwZTogUGF0aFBhcmFtcywgLi4uaGFuZGxlcnM6IFJlcXVlc3RIYW5kbGVyW10pOiB2b2lkO1xuXG59XG4iXX0=