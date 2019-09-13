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
const PathToRegexps_1 = require("polar-shared/src/url/PathToRegexps");
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
                const matches = Rewrites_1.Rewrites.matchesRegex(regex, url);
                if (matches) {
                    return rewrite;
                }
            }
            return undefined;
        };
        app.use(function (req, res, next) {
            const handler = () => __awaiter(this, void 0, void 0, function* () {
                const rewrite = computeRewrite(req.url);
                if (rewrite) {
                    if (typeof rewrite.destination === 'string') {
                        req.url = rewrite.destination;
                    }
                    else {
                        const url = req.url;
                        const content = yield rewrite.destination(url);
                        res.send(content);
                    }
                }
                next();
            });
            handler().catch(err => console.error(err));
        });
    }
}
exports.Webserver = Webserver;
;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV2Vic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiV2Vic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLDJEQUFzRDtBQUN0RCxrRUFBNkQ7QUFDN0QsdURBQWtEO0FBQ2xELHNEQUEwRjtBQUMxRixnRUFBdUM7QUFDdkMseURBQW9EO0FBQ3BELDJDQUE2QjtBQUM3Qiw2Q0FBK0I7QUFDL0IsK0RBQTBEO0FBQzFELHlDQUE2QztBQUM3QyxzRUFBaUU7QUFJakUsTUFBTSxHQUFHLEdBQUcsZUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRTVCLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBS2hELE1BQWEsU0FBUztJQVVsQixZQUFZLGVBQWdDLEVBQ2hDLFlBQTBCLEVBQzFCLG1CQUFxQyxJQUFJLG1DQUFnQixFQUFFO1FBRW5FLElBQUksQ0FBQyxlQUFlLEdBQUcsNkJBQWEsQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDdkYsSUFBSSxDQUFDLFlBQVksR0FBRyw2QkFBYSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDOUUsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDO0lBRTdDLENBQUM7SUFFWSxLQUFLOztZQUVkLEdBQUcsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBRXhELGlCQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFdkQsSUFBSSxDQUFDLEdBQUcsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxlQUFl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LE9BQU8sR0FBRyxtQkFBUSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBSWxELElBQUksT0FBTyxFQUFFO29CQUNULE9BQU8sT0FBTyxDQUFDO2lCQUNsQjthQUVKO1lBRUQsT0FBTyxTQUFTLENBQUM7UUFFckIsQ0FBQyxDQUFDO1FBRUYsR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFTLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSTtZQUUzQixNQUFNLE9BQU8sR0FBRyxHQUFTLEVBQUU7Z0JBSXZCLE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBSXhDLElBQUksT0FBTyxFQUFFO29CQUVULElBQUksT0FBTyxPQUFPLENBQUMsV0FBVyxLQUFLLFFBQVEsRUFBRTt3QkFDekMsR0FBRyxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDO3FCQUNqQzt5QkFBTTt3QkFDSCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDO3dCQUNwQixNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQy9DLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7cUJBQ3JCO2lCQUVKO2dCQUVELElBQUksRUFBRSxDQUFDO1lBRVgsQ0FBQyxDQUFBLENBQUM7WUFFRixPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFL0MsQ0FBQyxDQUFDLENBQUM7SUFFUCxDQUFDO0NBRUo7QUE3UUQsOEJBNlFDO0FBR3lGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1dlYnNlcnZlckNvbmZpZ30gZnJvbSAnLi9XZWJzZXJ2ZXJDb25maWcnO1xuaW1wb3J0IHtGaWxlUmVnaXN0cnl9IGZyb20gJy4vRmlsZVJlZ2lzdHJ5JztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICdwb2xhci1zaGFyZWQvc3JjL2xvZ2dlci9Mb2dnZXInO1xuaW1wb3J0IHtQcmVjb25kaXRpb25zfSBmcm9tICdwb2xhci1zaGFyZWQvc3JjL1ByZWNvbmRpdGlvbnMnO1xuaW1wb3J0IHtQYXRoc30gZnJvbSAncG9sYXItc2hhcmVkL3NyYy91dGlsL1BhdGhzJztcbmltcG9ydCBleHByZXNzLCB7RXhwcmVzcywgTmV4dEZ1bmN0aW9uLCBSZXF1ZXN0LCBSZXF1ZXN0SGFuZGxlciwgUmVzcG9uc2V9IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IHNlcnZlU3RhdGljIGZyb20gJ3NlcnZlLXN0YXRpYyc7XG5pbXBvcnQge1Jlc291cmNlUmVnaXN0cnl9IGZyb20gJy4vUmVzb3VyY2VSZWdpc3RyeSc7XG5pbXBvcnQgKiBhcyBodHRwIGZyb20gXCJodHRwXCI7XG5pbXBvcnQgKiBhcyBodHRwcyBmcm9tIFwiaHR0cHNcIjtcbmltcG9ydCB7RmlsZVBhdGhzfSBmcm9tICdwb2xhci1zaGFyZWQvc3JjL3V0aWwvRmlsZVBhdGhzJztcbmltcG9ydCB7UmV3cml0ZSwgUmV3cml0ZXN9IGZyb20gXCIuL1Jld3JpdGVzXCI7XG5pbXBvcnQge1BhdGhUb1JlZ2V4cHN9IGZyb20gXCJwb2xhci1zaGFyZWQvc3JjL3VybC9QYXRoVG9SZWdleHBzXCI7XG5pbXBvcnQge1BhdGhQYXJhbXN9IGZyb20gJ2V4cHJlc3Mtc2VydmUtc3RhdGljLWNvcmUnO1xuaW1wb3J0IHtQYXRoU3RyfSBmcm9tICdwb2xhci1zaGFyZWQvc3JjL3V0aWwvU3RyaW5ncyc7XG5cbmNvbnN0IGxvZyA9IExvZ2dlci5jcmVhdGUoKTtcblxuY29uc3QgU1RBVElDX0NBQ0hFX01BWF9BR0UgPSAzNjUgKiAyNCAqIDYwICogNjA7XG5cbi8qKlxuICogU3RhcnQgYSBzaW1wbGUgc3RhdGljIEhUVFAgc2VydmVyIG9ubHkgbGlzdGVuaW5nIG9uIGxvY2FsaG9zdFxuICovXG5leHBvcnQgY2xhc3MgV2Vic2VydmVyIGltcGxlbWVudHMgV2ViUmVxdWVzdEhhbmRsZXIge1xuXG4gICAgcHJpdmF0ZSByZWFkb25seSB3ZWJzZXJ2ZXJDb25maWc6IFdlYnNlcnZlckNvbmZpZztcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZpbGVSZWdpc3RyeTogRmlsZVJlZ2lzdHJ5O1xuICAgIHByaXZhdGUgcmVhZG9ubHkgcmVzb3VyY2VSZWdpc3RyeTogUmVzb3VyY2VSZWdpc3RyeTtcblxuICAgIHByaXZhdGUgYXBwPzogRXhwcmVzcztcblxuICAgIHByaXZhdGUgc2VydmVyPzogaHR0cC5TZXJ2ZXIgfCBodHRwcy5TZXJ2ZXI7XG5cbiAgICBjb25zdHJ1Y3Rvcih3ZWJzZXJ2ZXJDb25maWc6IFdlYnNlcnZlckNvbmZpZyxcbiAgICAgICAgICAgICAgICBmaWxlUmVnaXN0cnk6IEZpbGVSZWdpc3RyeSxcbiAgICAgICAgICAgICAgICByZXNvdXJjZVJlZ2lzdHJ5OiBSZXNvdXJjZVJlZ2lzdHJ5ID0gbmV3IFJlc291cmNlUmVnaXN0cnkoKSkge1xuXG4gICAgICAgIHRoaXMud2Vic2VydmVyQ29uZmlnID0gUHJlY29uZGl0aW9ucy5hc3NlcnROb3ROdWxsKHdlYnNlcnZlckNvbmZpZywgXCJ3ZWJzZXJ2ZXJDb25maWdcIik7XG4gICAgICAgIHRoaXMuZmlsZVJlZ2lzdHJ5ID0gUHJlY29uZGl0aW9ucy5hc3NlcnROb3ROdWxsKGZpbGVSZWdpc3RyeSwgXCJmaWxlUmVnaXN0cnlcIik7XG4gICAgICAgIHRoaXMucmVzb3VyY2VSZWdpc3RyeSA9IHJlc291cmNlUmVnaXN0cnk7XG5cbiAgICB9XG5cbiAgICBwdWJsaWMgYXN5bmMgc3RhcnQoKTogUHJvbWlzZTx2b2lkPiB7XG5cbiAgICAgICAgbG9nLmluZm8oXCJSdW5uaW5nIHdpdGggY29uZmlnOiBcIiwgdGhpcy53ZWJzZXJ2ZXJDb25maWcpO1xuXG4gICAgICAgIGV4cHJlc3Muc3RhdGljLm1pbWUuZGVmaW5lKHsgJ3RleHQvaHRtbCc6IFsnY2h0bWwnXSB9KTtcblxuICAgICAgICB0aGlzLmFwcCA9IFdlYnNlcnZlci5jcmVhdGVBcHAodGhpcy53ZWJzZXJ2ZXJDb25maWcuZGlyLCB0aGlzLndlYnNlcnZlckNvbmZpZy5yZXdyaXRlcyk7XG5cbiAgICAgICAgLy8gRklYTUU6IG1vdmUgdGhpcyB0byB0aGUgZmlyc3QgYW5kIExBU1QgYWFwcC51c2Ugc28gd2UgY2FuIHNlZSBob3cgaXQgd2FzIGFjdHVhbGx5IGhhbmRsZWQ/XG4gICAgICAgIGNvbnN0IHJlcXVlc3RMb2dnZXIgPSAocmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlLCBuZXh0OiBOZXh0RnVuY3Rpb24pID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhgJHtyZXEubWV0aG9kfSAke3JlcS51cmx9YCk7XG4gICAgICAgICAgICBjb25zb2xlLmluZm8ocmVxLmhlYWRlcnMpO1xuICAgICAgICAgICAgY29uc29sZS5pbmZvKCk7XG4gICAgICAgICAgICBjb25zb2xlLmluZm8oJz09PT0nKTtcbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgfTtcblxuXG4gICAgICAgIC8vIHRoaXMuYXBwLnVzZShyZXF1ZXN0TG9nZ2VyKTtcblxuICAgICAgICB0aGlzLnJlZ2lzdGVyRmlsZXNIYW5kbGVyKCk7XG4gICAgICAgIHRoaXMucmVnaXN0ZXJSZXNvdXJjZXNIYW5kbGVyKCk7XG5cbiAgICAgICAgaWYgKHRoaXMud2Vic2VydmVyQ29uZmlnLnVzZVNTTCkge1xuXG4gICAgICAgICAgICBQcmVjb25kaXRpb25zLmFzc2VydFByZXNlbnQodGhpcy53ZWJzZXJ2ZXJDb25maWcuc3NsLCBcIk5vIFNTTENvbmZpZ1wiKTtcblxuICAgICAgICAgICAgY29uc3Qgc3NsQ29uZmlnID0ge1xuICAgICAgICAgICAgICAgIGtleTogdGhpcy53ZWJzZXJ2ZXJDb25maWcuc3NsIS5rZXksXG4gICAgICAgICAgICAgICAgY2VydDogdGhpcy53ZWJzZXJ2ZXJDb25maWcuc3NsIS5jZXJ0XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLnNlcnZlciA9XG4gICAgICAgICAgICAgICAgaHR0cHMuY3JlYXRlU2VydmVyKHNzbENvbmZpZywgdGhpcy5hcHApXG4gICAgICAgICAgICAgICAgICAgIC5saXN0ZW4odGhpcy53ZWJzZXJ2ZXJDb25maWcucG9ydCwgdGhpcy53ZWJzZXJ2ZXJDb25maWcuaG9zdCk7XG5cbiAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgdGhpcy5zZXJ2ZXIgPVxuICAgICAgICAgICAgICAgIGh0dHAuY3JlYXRlU2VydmVyKHRoaXMuYXBwKVxuICAgICAgICAgICAgICAgICAgICAubGlzdGVuKHRoaXMud2Vic2VydmVyQ29uZmlnLnBvcnQsIHRoaXMud2Vic2VydmVyQ29uZmlnLmhvc3QpO1xuXG4gICAgICAgIH1cblxuICAgICAgICAvLyBhd2FpdCBmb3IgbGlzdGVuaW5nLi4uXG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KHJlc29sdmUgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXJ2ZXIhLm9uY2UoJ2xpc3RlbmluZycsICgpID0+IHJlc29sdmUoKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIGxvZy5pbmZvKGBXZWJzZXJ2ZXIgdXAgYW5kIHJ1bm5pbmcgb24gcG9ydFxuICAgICAgICAvLyAke3RoaXMud2Vic2VydmVyQ29uZmlnLnBvcnR9IHdpdGggY29uZmlnOiBgLCB0aGlzLndlYnNlcnZlckNvbmZpZyk7XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYW4gZXhwcmVzcyBhcHAgdGhhdCBjYW4gYmUgdXNlZCB3aXRoIG91ciBzZXJ2ZXIuLlxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlQXBwKGRpcjogUGF0aFN0cixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXdyaXRlczogUmVhZG9ubHlBcnJheTxSZXdyaXRlPiA9IFtdKTogRXhwcmVzcyB7XG5cbiAgICAgICAgLy8gRklYTUU6IGFkZCBhIHRlc3QgdG8gbWFrZSBzdXJlIHRoZSBkaXJlY3Rvcnkgd2UncmUgZ29pbmcgdG8gdXNlIGFjdGF1bGx5IGV4aXN0cy4uLlxuICAgICAgICAvLyBGSVhNRTogdHJ5IHRoaXM6aHR0cHM6Ly93d3cubnBtanMuY29tL3BhY2thZ2UvZGlyZWN0b3J5LXRyZWVcblxuICAgICAgICBjb25zdCBhcHAgPSBleHByZXNzKCk7XG5cbiAgICAgICAgLy8gaGFuZGxlIHJld3JpdGVzIEZJUlNUIHNvIHRoYXQgd2UgY2FuIHNlbmQgVVJMcyB0byB0aGUgcmlnaHQgZGVzdGluYXRpb25cbiAgICAgICAgLy8gYmVmb3JlIGFsbCBvdGhlciBoYW5kbGVycy5cbiAgICAgICAgdGhpcy5yZWdpc3RlclJld3JpdGVzKGFwcCwgcmV3cml0ZXMpO1xuXG4gICAgICAgIGFwcC51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG5cbiAgICAgICAgICAgIG5leHQoKTtcblxuICAgICAgICAgICAgaWYgKHJlcS5wYXRoICYmIHJlcS5wYXRoLmVuZHNXaXRoKCd3b2ZmMicpKSB7XG4gICAgICAgICAgICAgICAgcmVzLnNldCh7ICdDYWNoZS1Db250cm9sJzogYHB1YmxpYywgbWF4LWFnZT0ke1NUQVRJQ19DQUNIRV9NQVhfQUdFfSwgaW1tdXRhYmxlYCB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBGSVhNRTogSSB0aGluayB0aGUgcHJvYmxtZSBub3cgaXMgdGhhdCBzZXR0aW5nIHRoZSBwYXRoIERPRVMgTk9UIGNoYW5nZSB0aGUgcGF0aCBmb3Igc2VydmVTdGF0aWMgaW5zaWRlXG4gICAgICAgIC8vIHRoZSBydW50aW1lIGVudmlyb25tZW50IG9uIHRlaCBzZXJ2ZXI/XG5cbiAgICAgICAgLy8gVE9ETzogYWRkIGluZmluaXRlIGNhY2hpbmcgaWYgdGhlIGZpbGVzIGFyZSB3b2ZmMiB3ZWIgZm9udHMuLi5cbiAgICAgICAgYXBwLnVzZShzZXJ2ZVN0YXRpYyhkaXIsIHtpbW11dGFibGU6IHRydWV9KSk7XG5cbiAgICAgICAgZm9yIChjb25zdCBwYWdlIG9mIFsnbG9naW4uaHRtbCcsICdpbmRleC5odG1sJ10pIHtcblxuICAgICAgICAgICAgLy8gaGFuZGxlIGV4cGxpY2l0IHBhdGhzIG9mIC9sb2dpbi5odG1sIGFuZCAvaW5kZXguaHRtbCBsaWtlIHdlXG4gICAgICAgICAgICAvLyBkbyBpbiB0aGUgd2ViYXBwLlxuXG4gICAgICAgICAgICBjb25zdCBwYWdlUGF0aCA9IEZpbGVQYXRocy5qb2luKGRpciwgJ2FwcHMnLCAncmVwb3NpdG9yeScsIHBhZ2UpO1xuXG4gICAgICAgICAgICBhcHAudXNlKGAvJHtwYWdlfWAsIHNlcnZlU3RhdGljKHBhZ2VQYXRoLCB7aW1tdXRhYmxlOiB0cnVlfSkpO1xuXG4gICAgICAgIH1cblxuICAgICAgICBhcHAudXNlKGV4cHJlc3MuanNvbigpKTtcbiAgICAgICAgYXBwLnVzZShleHByZXNzLnVybGVuY29kZWQoKSk7XG5cbiAgICAgICAgcmV0dXJuIGFwcDtcblxuICAgIH1cblxuICAgIHB1YmxpYyBzdG9wKCkge1xuXG4gICAgICAgIGxvZy5pbmZvKFwiU3RvcHBpbmcuLi5cIik7XG4gICAgICAgIHRoaXMuc2VydmVyIS5jbG9zZSgpO1xuICAgICAgICBsb2cuaW5mbyhcIlN0b3BwaW5nLi4uZG9uZVwiKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0KHR5cGU6IFBhdGhQYXJhbXMsIC4uLmhhbmRsZXJzOiBSZXF1ZXN0SGFuZGxlcltdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuYXBwIS5nZXQodHlwZSwgLi4uaGFuZGxlcnMpO1xuICAgIH1cblxuICAgIHB1YmxpYyBvcHRpb25zKHR5cGU6IFBhdGhQYXJhbXMsIC4uLmhhbmRsZXJzOiBSZXF1ZXN0SGFuZGxlcltdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuYXBwIS5vcHRpb25zKHR5cGUsIC4uLmhhbmRsZXJzKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcG9zdCh0eXBlOiBQYXRoUGFyYW1zLCAuLi5oYW5kbGVyczogUmVxdWVzdEhhbmRsZXJbXSk6IHZvaWQge1xuICAgICAgICB0aGlzLmFwcCEucG9zdCh0eXBlLCAuLi5oYW5kbGVycyk7XG4gICAgfVxuXG4gICAgcHVibGljIHB1dCh0eXBlOiBQYXRoUGFyYW1zLCAuLi5oYW5kbGVyczogUmVxdWVzdEhhbmRsZXJbXSk6IHZvaWQge1xuICAgICAgICB0aGlzLmFwcCEucHV0KHR5cGUsIC4uLmhhbmRsZXJzKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHJlZ2lzdGVyRmlsZXNIYW5kbGVyKCkge1xuXG4gICAgICAgIHRoaXMuYXBwIS5nZXQoL2ZpbGVzXFwvLiovLCAocmVxOiBleHByZXNzLlJlcXVlc3QsIHJlczogZXhwcmVzcy5SZXNwb25zZSkgPT4ge1xuXG4gICAgICAgICAgICB0cnkge1xuXG4gICAgICAgICAgICAgICAgbG9nLmluZm8oXCJIYW5kbGluZyBmaWxlIGF0IHBhdGg6IFwiICsgcmVxLnBhdGgpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgaGFzaGNvZGUgPSBQYXRocy5iYXNlbmFtZShyZXEucGF0aCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWhhc2hjb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IFwiTm8ga2V5IGdpdmVuIGZvciAvZmlsZVwiO1xuICAgICAgICAgICAgICAgICAgICBsb2cuZXJyb3IobXNnKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1cyg0MDQpLnNlbmQobXNnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLmZpbGVSZWdpc3RyeS5oYXNLZXkoaGFzaGNvZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IFwiRmlsZSBub3QgZm91bmQgd2l0aCBoYXNoY29kZTogXCIgKyBoYXNoY29kZTtcbiAgICAgICAgICAgICAgICAgICAgbG9nLmVycm9yKG1zZyk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXMoNDA0KS5zZW5kKG1zZyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBrZXlNZXRhID0gdGhpcy5maWxlUmVnaXN0cnkuZ2V0KGhhc2hjb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBrZXlNZXRhLmZpbGVuYW1lO1xuXG4gICAgICAgICAgICAgICAgICAgIGxvZy5pbmZvKGBTZXJ2aW5nIGZpbGUgYXQgJHtyZXEucGF0aH0gZnJvbSAke2ZpbGVuYW1lfWApO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXMuc2VuZEZpbGUoZmlsZW5hbWUpO1xuXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgbG9nLmVycm9yKGBDb3VsZCBub3QgaGFuZGxlIHNlcnZpbmcgZmlsZS4gKHJlcS5wYXRoPSR7cmVxLnBhdGh9KWAsIGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgcHJpdmF0ZSByZWdpc3RlclJlc291cmNlc0hhbmRsZXIoKSB7XG5cbiAgICAgICAgdGhpcy5hcHAhLmdldCgvLiovLCAocmVxOiBleHByZXNzLlJlcXVlc3QsIHJlczogZXhwcmVzcy5SZXNwb25zZSkgPT4ge1xuXG4gICAgICAgICAgICB0cnkge1xuXG4gICAgICAgICAgICAgICAgbG9nLmluZm8oXCJIYW5kbGluZyByZXNvdXJjZSBhdCBwYXRoOiBcIiArIHJlcS5wYXRoKTtcblxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5yZXNvdXJjZVJlZ2lzdHJ5LmNvbnRhaW5zKHJlcS5wYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtc2cgPSBcIlJlc291cmNlIG5vdCBmb3VuZDogXCIgKyByZXEucGF0aDtcbiAgICAgICAgICAgICAgICAgICAgbG9nLmVycm9yKG1zZyk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXMoNDA0KS5zZW5kKG1zZyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHRoaXMucmVzb3VyY2VSZWdpc3RyeS5nZXQocmVxLnBhdGgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzLnNlbmRGaWxlKGZpbGVQYXRoKTtcblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGxvZy5lcnJvcihgQ291bGQgbm90IGhhbmRsZSBzZXJ2aW5nIGZpbGUuIChyZXEucGF0aD0ke3JlcS5wYXRofSlgLCBlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KTtcblxuICAgIH1cblxuICAgIHByaXZhdGUgc3RhdGljIHJlZ2lzdGVyUmV3cml0ZXMoYXBwOiBFeHByZXNzLCByZXdyaXRlczogUmVhZG9ubHlBcnJheTxSZXdyaXRlPiA9IFtdKSB7XG5cbiAgICAgICAgY29uc3QgY29tcHV0ZVJld3JpdGUgPSAodXJsOiBzdHJpbmcpOiBSZXdyaXRlIHwgdW5kZWZpbmVkID0+IHtcblxuICAgICAgICAgICAgZm9yIChjb25zdCByZXdyaXRlIG9mIHJld3JpdGVzKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmRlYnVnKFwiVGVzdGluZyB3aXRoIHJld3JpdGU6IFwiLCByZXdyaXRlKTtcblxuICAgICAgICAgICAgICAgIC8vIFRPRE86IGl0J3MgcHJvYmFibHkgbm90IGVmZmljaWVudCB0byBidWlsZCB0aGlzIHJlZ2V4IGVhY2hcbiAgICAgICAgICAgICAgICAvLyB0aW1lXG4gICAgICAgICAgICAgICAgY29uc3QgcmVnZXggPSBQYXRoVG9SZWdleHBzLnBhdGhUb1JlZ2V4cChyZXdyaXRlLnNvdXJjZSk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBtYXRjaGVzID0gUmV3cml0ZXMubWF0Y2hlc1JlZ2V4KHJlZ2V4LCB1cmwpO1xuXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5kZWJ1ZyhgQ29tcGlsZWQgYXMgcmVnZXhwOiAke3JlZ2V4fSBtYXRjaGVzOiAke21hdGNoZXN9YCk7XG5cbiAgICAgICAgICAgICAgICBpZiAobWF0Y2hlcykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV3cml0ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgICAgICB9O1xuXG4gICAgICAgIGFwcC51c2UoZnVuY3Rpb24ocmVxLCByZXMsIG5leHQpIHtcblxuICAgICAgICAgICAgY29uc3QgaGFuZGxlciA9IGFzeW5jICgpID0+IHtcblxuICAgICAgICAgICAgICAgIC8vIGxvZy5kZWJ1ZyhcIlJld3JpdGUgYXQgdXJsOiBcIiArIHJlcS51cmwpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgcmV3cml0ZSA9IGNvbXB1dGVSZXdyaXRlKHJlcS51cmwpO1xuXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5kZWJ1ZyhgVVJMICR7cmVxLnVybH0gcmV3cml0dGVuIGFzIGAsIHJld3JpdGUpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJld3JpdGUpIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHJld3JpdGUuZGVzdGluYXRpb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXEudXJsID0gcmV3cml0ZS5kZXN0aW5hdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IHJlcS51cmw7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgcmV3cml0ZS5kZXN0aW5hdGlvbih1cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLnNlbmQoY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG5leHQoKTtcblxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaGFuZGxlcigpLmNhdGNoKGVyciA9PiBjb25zb2xlLmVycm9yKGVycikpO1xuXG4gICAgICAgIH0pO1xuXG4gICAgfVxuXG59XG5cblxuZXhwb3J0IHR5cGUgRXhwcmVzc1JlcXVlc3RIYW5kbGVyID0gKHJlcTogZXhwcmVzcy5SZXF1ZXN0LCByZXM6IGV4cHJlc3MuUmVzcG9uc2UpID0+IHZvaWQ7O1xuXG5leHBvcnQgaW50ZXJmYWNlIFdlYlJlcXVlc3RIYW5kbGVyIHtcblxuICAgIGdldCh0eXBlOiBQYXRoUGFyYW1zLCAuLi5oYW5kbGVyczogRXhwcmVzc1JlcXVlc3RIYW5kbGVyW10pOiB2b2lkO1xuICAgIG9wdGlvbnModHlwZTogUGF0aFBhcmFtcywgLi4uaGFuZGxlcnM6IEV4cHJlc3NSZXF1ZXN0SGFuZGxlcltdKTogdm9pZDtcbiAgICBwb3N0KHR5cGU6IFBhdGhQYXJhbXMsIC4uLmhhbmRsZXJzOiBFeHByZXNzUmVxdWVzdEhhbmRsZXJbXSk6IHZvaWQ7XG4gICAgcHV0KHR5cGU6IFBhdGhQYXJhbXMsIC4uLmhhbmRsZXJzOiBFeHByZXNzUmVxdWVzdEhhbmRsZXJbXSk6IHZvaWQ7XG5cbn1cbiJdfQ==