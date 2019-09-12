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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV2Vic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiV2Vic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLDJEQUFzRDtBQUN0RCxrRUFBNkQ7QUFDN0QsdURBQWtEO0FBQ2xELHNEQUEwRjtBQUMxRixnRUFBdUM7QUFDdkMseURBQW9EO0FBQ3BELDJDQUE2QjtBQUM3Qiw2Q0FBK0I7QUFDL0IsK0RBQTBEO0FBQzFELHlDQUE2QztBQUM3QyxtREFBOEM7QUFJOUMsTUFBTSxHQUFHLEdBQUcsZUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRTVCLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBS2hELE1BQWEsU0FBUztJQVVsQixZQUFZLGVBQWdDLEVBQ2hDLFlBQTBCLEVBQzFCLG1CQUFxQyxJQUFJLG1DQUFnQixFQUFFO1FBRW5FLElBQUksQ0FBQyxlQUFlLEdBQUcsNkJBQWEsQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDdkYsSUFBSSxDQUFDLFlBQVksR0FBRyw2QkFBYSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDOUUsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDO0lBRTdDLENBQUM7SUFFWSxLQUFLOztZQUVkLEdBQUcsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBRXhELGlCQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFdkQsSUFBSSxDQUFDLEdBQUcsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxlQUFl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LE9BQU8sR0FBRyxtQkFBUSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBSWxELElBQUksT0FBTyxFQUFFO29CQUNULE9BQU8sT0FBTyxDQUFDO2lCQUNsQjthQUVKO1lBRUQsT0FBTyxTQUFTLENBQUM7UUFFckIsQ0FBQyxDQUFDO1FBRUYsR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFTLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSTtZQUUzQixNQUFNLE9BQU8sR0FBRyxHQUFTLEVBQUU7Z0JBSXZCLE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBSXhDLElBQUksT0FBTyxFQUFFO29CQUVULElBQUksT0FBTyxPQUFPLENBQUMsV0FBVyxLQUFLLFFBQVEsRUFBRTt3QkFDekMsR0FBRyxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDO3FCQUNqQzt5QkFBTTt3QkFDSCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDO3dCQUNwQixNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQy9DLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7cUJBQ3JCO2lCQUVKO2dCQUVELElBQUksRUFBRSxDQUFDO1lBRVgsQ0FBQyxDQUFBLENBQUM7WUFFRixPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFL0MsQ0FBQyxDQUFDLENBQUM7SUFFUCxDQUFDO0NBRUo7QUE3UUQsOEJBNlFDO0FBR3lGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1dlYnNlcnZlckNvbmZpZ30gZnJvbSAnLi9XZWJzZXJ2ZXJDb25maWcnO1xuaW1wb3J0IHtGaWxlUmVnaXN0cnl9IGZyb20gJy4vRmlsZVJlZ2lzdHJ5JztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICdwb2xhci1zaGFyZWQvc3JjL2xvZ2dlci9Mb2dnZXInO1xuaW1wb3J0IHtQcmVjb25kaXRpb25zfSBmcm9tICdwb2xhci1zaGFyZWQvc3JjL1ByZWNvbmRpdGlvbnMnO1xuaW1wb3J0IHtQYXRoc30gZnJvbSAncG9sYXItc2hhcmVkL3NyYy91dGlsL1BhdGhzJztcbmltcG9ydCBleHByZXNzLCB7RXhwcmVzcywgTmV4dEZ1bmN0aW9uLCBSZXF1ZXN0LCBSZXF1ZXN0SGFuZGxlciwgUmVzcG9uc2V9IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IHNlcnZlU3RhdGljIGZyb20gJ3NlcnZlLXN0YXRpYyc7XG5pbXBvcnQge1Jlc291cmNlUmVnaXN0cnl9IGZyb20gJy4vUmVzb3VyY2VSZWdpc3RyeSc7XG5pbXBvcnQgKiBhcyBodHRwIGZyb20gXCJodHRwXCI7XG5pbXBvcnQgKiBhcyBodHRwcyBmcm9tIFwiaHR0cHNcIjtcbmltcG9ydCB7RmlsZVBhdGhzfSBmcm9tICdwb2xhci1zaGFyZWQvc3JjL3V0aWwvRmlsZVBhdGhzJztcbmltcG9ydCB7UmV3cml0ZSwgUmV3cml0ZXN9IGZyb20gXCIuL1Jld3JpdGVzXCI7XG5pbXBvcnQge1BhdGhUb1JlZ2V4cHN9IGZyb20gXCIuL1BhdGhUb1JlZ2V4cHNcIjtcbmltcG9ydCB7UGF0aFBhcmFtc30gZnJvbSAnZXhwcmVzcy1zZXJ2ZS1zdGF0aWMtY29yZSc7XG5pbXBvcnQge1BhdGhTdHJ9IGZyb20gJ3BvbGFyLXNoYXJlZC9zcmMvdXRpbC9TdHJpbmdzJztcblxuY29uc3QgbG9nID0gTG9nZ2VyLmNyZWF0ZSgpO1xuXG5jb25zdCBTVEFUSUNfQ0FDSEVfTUFYX0FHRSA9IDM2NSAqIDI0ICogNjAgKiA2MDtcblxuLyoqXG4gKiBTdGFydCBhIHNpbXBsZSBzdGF0aWMgSFRUUCBzZXJ2ZXIgb25seSBsaXN0ZW5pbmcgb24gbG9jYWxob3N0XG4gKi9cbmV4cG9ydCBjbGFzcyBXZWJzZXJ2ZXIgaW1wbGVtZW50cyBXZWJSZXF1ZXN0SGFuZGxlciB7XG5cbiAgICBwcml2YXRlIHJlYWRvbmx5IHdlYnNlcnZlckNvbmZpZzogV2Vic2VydmVyQ29uZmlnO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgZmlsZVJlZ2lzdHJ5OiBGaWxlUmVnaXN0cnk7XG4gICAgcHJpdmF0ZSByZWFkb25seSByZXNvdXJjZVJlZ2lzdHJ5OiBSZXNvdXJjZVJlZ2lzdHJ5O1xuXG4gICAgcHJpdmF0ZSBhcHA/OiBFeHByZXNzO1xuXG4gICAgcHJpdmF0ZSBzZXJ2ZXI/OiBodHRwLlNlcnZlciB8IGh0dHBzLlNlcnZlcjtcblxuICAgIGNvbnN0cnVjdG9yKHdlYnNlcnZlckNvbmZpZzogV2Vic2VydmVyQ29uZmlnLFxuICAgICAgICAgICAgICAgIGZpbGVSZWdpc3RyeTogRmlsZVJlZ2lzdHJ5LFxuICAgICAgICAgICAgICAgIHJlc291cmNlUmVnaXN0cnk6IFJlc291cmNlUmVnaXN0cnkgPSBuZXcgUmVzb3VyY2VSZWdpc3RyeSgpKSB7XG5cbiAgICAgICAgdGhpcy53ZWJzZXJ2ZXJDb25maWcgPSBQcmVjb25kaXRpb25zLmFzc2VydE5vdE51bGwod2Vic2VydmVyQ29uZmlnLCBcIndlYnNlcnZlckNvbmZpZ1wiKTtcbiAgICAgICAgdGhpcy5maWxlUmVnaXN0cnkgPSBQcmVjb25kaXRpb25zLmFzc2VydE5vdE51bGwoZmlsZVJlZ2lzdHJ5LCBcImZpbGVSZWdpc3RyeVwiKTtcbiAgICAgICAgdGhpcy5yZXNvdXJjZVJlZ2lzdHJ5ID0gcmVzb3VyY2VSZWdpc3RyeTtcblxuICAgIH1cblxuICAgIHB1YmxpYyBhc3luYyBzdGFydCgpOiBQcm9taXNlPHZvaWQ+IHtcblxuICAgICAgICBsb2cuaW5mbyhcIlJ1bm5pbmcgd2l0aCBjb25maWc6IFwiLCB0aGlzLndlYnNlcnZlckNvbmZpZyk7XG5cbiAgICAgICAgZXhwcmVzcy5zdGF0aWMubWltZS5kZWZpbmUoeyAndGV4dC9odG1sJzogWydjaHRtbCddIH0pO1xuXG4gICAgICAgIHRoaXMuYXBwID0gV2Vic2VydmVyLmNyZWF0ZUFwcCh0aGlzLndlYnNlcnZlckNvbmZpZy5kaXIsIHRoaXMud2Vic2VydmVyQ29uZmlnLnJld3JpdGVzKTtcblxuICAgICAgICAvLyBGSVhNRTogbW92ZSB0aGlzIHRvIHRoZSBmaXJzdCBhbmQgTEFTVCBhYXBwLnVzZSBzbyB3ZSBjYW4gc2VlIGhvdyBpdCB3YXMgYWN0dWFsbHkgaGFuZGxlZD9cbiAgICAgICAgY29uc3QgcmVxdWVzdExvZ2dlciA9IChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbikgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5pbmZvKGAke3JlcS5tZXRob2R9ICR7cmVxLnVybH1gKTtcbiAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhyZXEuaGVhZGVycyk7XG4gICAgICAgICAgICBjb25zb2xlLmluZm8oKTtcbiAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnPT09PScpO1xuICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9O1xuXG5cbiAgICAgICAgLy8gdGhpcy5hcHAudXNlKHJlcXVlc3RMb2dnZXIpO1xuXG4gICAgICAgIHRoaXMucmVnaXN0ZXJGaWxlc0hhbmRsZXIoKTtcbiAgICAgICAgdGhpcy5yZWdpc3RlclJlc291cmNlc0hhbmRsZXIoKTtcblxuICAgICAgICBpZiAodGhpcy53ZWJzZXJ2ZXJDb25maWcudXNlU1NMKSB7XG5cbiAgICAgICAgICAgIFByZWNvbmRpdGlvbnMuYXNzZXJ0UHJlc2VudCh0aGlzLndlYnNlcnZlckNvbmZpZy5zc2wsIFwiTm8gU1NMQ29uZmlnXCIpO1xuXG4gICAgICAgICAgICBjb25zdCBzc2xDb25maWcgPSB7XG4gICAgICAgICAgICAgICAga2V5OiB0aGlzLndlYnNlcnZlckNvbmZpZy5zc2whLmtleSxcbiAgICAgICAgICAgICAgICBjZXJ0OiB0aGlzLndlYnNlcnZlckNvbmZpZy5zc2whLmNlcnRcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMuc2VydmVyID1cbiAgICAgICAgICAgICAgICBodHRwcy5jcmVhdGVTZXJ2ZXIoc3NsQ29uZmlnLCB0aGlzLmFwcClcbiAgICAgICAgICAgICAgICAgICAgLmxpc3Rlbih0aGlzLndlYnNlcnZlckNvbmZpZy5wb3J0LCB0aGlzLndlYnNlcnZlckNvbmZpZy5ob3N0KTtcblxuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICB0aGlzLnNlcnZlciA9XG4gICAgICAgICAgICAgICAgaHR0cC5jcmVhdGVTZXJ2ZXIodGhpcy5hcHApXG4gICAgICAgICAgICAgICAgICAgIC5saXN0ZW4odGhpcy53ZWJzZXJ2ZXJDb25maWcucG9ydCwgdGhpcy53ZWJzZXJ2ZXJDb25maWcuaG9zdCk7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGF3YWl0IGZvciBsaXN0ZW5pbmcuLi5cblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNlcnZlciEub25jZSgnbGlzdGVuaW5nJywgKCkgPT4gcmVzb2x2ZSgpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gbG9nLmluZm8oYFdlYnNlcnZlciB1cCBhbmQgcnVubmluZyBvbiBwb3J0XG4gICAgICAgIC8vICR7dGhpcy53ZWJzZXJ2ZXJDb25maWcucG9ydH0gd2l0aCBjb25maWc6IGAsIHRoaXMud2Vic2VydmVyQ29uZmlnKTtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhbiBleHByZXNzIGFwcCB0aGF0IGNhbiBiZSB1c2VkIHdpdGggb3VyIHNlcnZlci4uXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGVBcHAoZGlyOiBQYXRoU3RyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJld3JpdGVzOiBSZWFkb25seUFycmF5PFJld3JpdGU+ID0gW10pOiBFeHByZXNzIHtcblxuICAgICAgICAvLyBGSVhNRTogYWRkIGEgdGVzdCB0byBtYWtlIHN1cmUgdGhlIGRpcmVjdG9yeSB3ZSdyZSBnb2luZyB0byB1c2UgYWN0YXVsbHkgZXhpc3RzLi4uXG4gICAgICAgIC8vIEZJWE1FOiB0cnkgdGhpczpodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9kaXJlY3RvcnktdHJlZVxuXG4gICAgICAgIGNvbnN0IGFwcCA9IGV4cHJlc3MoKTtcblxuICAgICAgICAvLyBoYW5kbGUgcmV3cml0ZXMgRklSU1Qgc28gdGhhdCB3ZSBjYW4gc2VuZCBVUkxzIHRvIHRoZSByaWdodCBkZXN0aW5hdGlvblxuICAgICAgICAvLyBiZWZvcmUgYWxsIG90aGVyIGhhbmRsZXJzLlxuICAgICAgICB0aGlzLnJlZ2lzdGVyUmV3cml0ZXMoYXBwLCByZXdyaXRlcyk7XG5cbiAgICAgICAgYXBwLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcblxuICAgICAgICAgICAgbmV4dCgpO1xuXG4gICAgICAgICAgICBpZiAocmVxLnBhdGggJiYgcmVxLnBhdGguZW5kc1dpdGgoJ3dvZmYyJykpIHtcbiAgICAgICAgICAgICAgICByZXMuc2V0KHsgJ0NhY2hlLUNvbnRyb2wnOiBgcHVibGljLCBtYXgtYWdlPSR7U1RBVElDX0NBQ0hFX01BWF9BR0V9LCBpbW11dGFibGVgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEZJWE1FOiBJIHRoaW5rIHRoZSBwcm9ibG1lIG5vdyBpcyB0aGF0IHNldHRpbmcgdGhlIHBhdGggRE9FUyBOT1QgY2hhbmdlIHRoZSBwYXRoIGZvciBzZXJ2ZVN0YXRpYyBpbnNpZGVcbiAgICAgICAgLy8gdGhlIHJ1bnRpbWUgZW52aXJvbm1lbnQgb24gdGVoIHNlcnZlcj9cblxuICAgICAgICAvLyBUT0RPOiBhZGQgaW5maW5pdGUgY2FjaGluZyBpZiB0aGUgZmlsZXMgYXJlIHdvZmYyIHdlYiBmb250cy4uLlxuICAgICAgICBhcHAudXNlKHNlcnZlU3RhdGljKGRpciwge2ltbXV0YWJsZTogdHJ1ZX0pKTtcblxuICAgICAgICBmb3IgKGNvbnN0IHBhZ2Ugb2YgWydsb2dpbi5odG1sJywgJ2luZGV4Lmh0bWwnXSkge1xuXG4gICAgICAgICAgICAvLyBoYW5kbGUgZXhwbGljaXQgcGF0aHMgb2YgL2xvZ2luLmh0bWwgYW5kIC9pbmRleC5odG1sIGxpa2Ugd2VcbiAgICAgICAgICAgIC8vIGRvIGluIHRoZSB3ZWJhcHAuXG5cbiAgICAgICAgICAgIGNvbnN0IHBhZ2VQYXRoID0gRmlsZVBhdGhzLmpvaW4oZGlyLCAnYXBwcycsICdyZXBvc2l0b3J5JywgcGFnZSk7XG5cbiAgICAgICAgICAgIGFwcC51c2UoYC8ke3BhZ2V9YCwgc2VydmVTdGF0aWMocGFnZVBhdGgsIHtpbW11dGFibGU6IHRydWV9KSk7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIGFwcC51c2UoZXhwcmVzcy5qc29uKCkpO1xuICAgICAgICBhcHAudXNlKGV4cHJlc3MudXJsZW5jb2RlZCgpKTtcblxuICAgICAgICByZXR1cm4gYXBwO1xuXG4gICAgfVxuXG4gICAgcHVibGljIHN0b3AoKSB7XG5cbiAgICAgICAgbG9nLmluZm8oXCJTdG9wcGluZy4uLlwiKTtcbiAgICAgICAgdGhpcy5zZXJ2ZXIhLmNsb3NlKCk7XG4gICAgICAgIGxvZy5pbmZvKFwiU3RvcHBpbmcuLi5kb25lXCIpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXQodHlwZTogUGF0aFBhcmFtcywgLi4uaGFuZGxlcnM6IFJlcXVlc3RIYW5kbGVyW10pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5hcHAhLmdldCh0eXBlLCAuLi5oYW5kbGVycyk7XG4gICAgfVxuXG4gICAgcHVibGljIG9wdGlvbnModHlwZTogUGF0aFBhcmFtcywgLi4uaGFuZGxlcnM6IFJlcXVlc3RIYW5kbGVyW10pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5hcHAhLm9wdGlvbnModHlwZSwgLi4uaGFuZGxlcnMpO1xuICAgIH1cblxuICAgIHB1YmxpYyBwb3N0KHR5cGU6IFBhdGhQYXJhbXMsIC4uLmhhbmRsZXJzOiBSZXF1ZXN0SGFuZGxlcltdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuYXBwIS5wb3N0KHR5cGUsIC4uLmhhbmRsZXJzKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgcHV0KHR5cGU6IFBhdGhQYXJhbXMsIC4uLmhhbmRsZXJzOiBSZXF1ZXN0SGFuZGxlcltdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuYXBwIS5wdXQodHlwZSwgLi4uaGFuZGxlcnMpO1xuICAgIH1cblxuICAgIHByaXZhdGUgcmVnaXN0ZXJGaWxlc0hhbmRsZXIoKSB7XG5cbiAgICAgICAgdGhpcy5hcHAhLmdldCgvZmlsZXNcXC8uKi8sIChyZXE6IGV4cHJlc3MuUmVxdWVzdCwgcmVzOiBleHByZXNzLlJlc3BvbnNlKSA9PiB7XG5cbiAgICAgICAgICAgIHRyeSB7XG5cbiAgICAgICAgICAgICAgICBsb2cuaW5mbyhcIkhhbmRsaW5nIGZpbGUgYXQgcGF0aDogXCIgKyByZXEucGF0aCk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBoYXNoY29kZSA9IFBhdGhzLmJhc2VuYW1lKHJlcS5wYXRoKTtcblxuICAgICAgICAgICAgICAgIGlmICghaGFzaGNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbXNnID0gXCJObyBrZXkgZ2l2ZW4gZm9yIC9maWxlXCI7XG4gICAgICAgICAgICAgICAgICAgIGxvZy5lcnJvcihtc2cpO1xuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzKDQwNCkuc2VuZChtc2cpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuZmlsZVJlZ2lzdHJ5Lmhhc0tleShoYXNoY29kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbXNnID0gXCJGaWxlIG5vdCBmb3VuZCB3aXRoIGhhc2hjb2RlOiBcIiArIGhhc2hjb2RlO1xuICAgICAgICAgICAgICAgICAgICBsb2cuZXJyb3IobXNnKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1cyg0MDQpLnNlbmQobXNnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGtleU1ldGEgPSB0aGlzLmZpbGVSZWdpc3RyeS5nZXQoaGFzaGNvZGUpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlbmFtZSA9IGtleU1ldGEuZmlsZW5hbWU7XG5cbiAgICAgICAgICAgICAgICAgICAgbG9nLmluZm8oYFNlcnZpbmcgZmlsZSBhdCAke3JlcS5wYXRofSBmcm9tICR7ZmlsZW5hbWV9YCk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlcy5zZW5kRmlsZShmaWxlbmFtZSk7XG5cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBsb2cuZXJyb3IoYENvdWxkIG5vdCBoYW5kbGUgc2VydmluZyBmaWxlLiAocmVxLnBhdGg9JHtyZXEucGF0aH0pYCwgZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBwcml2YXRlIHJlZ2lzdGVyUmVzb3VyY2VzSGFuZGxlcigpIHtcblxuICAgICAgICB0aGlzLmFwcCEuZ2V0KC8uKi8sIChyZXE6IGV4cHJlc3MuUmVxdWVzdCwgcmVzOiBleHByZXNzLlJlc3BvbnNlKSA9PiB7XG5cbiAgICAgICAgICAgIHRyeSB7XG5cbiAgICAgICAgICAgICAgICBsb2cuaW5mbyhcIkhhbmRsaW5nIHJlc291cmNlIGF0IHBhdGg6IFwiICsgcmVxLnBhdGgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnJlc291cmNlUmVnaXN0cnkuY29udGFpbnMocmVxLnBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1zZyA9IFwiUmVzb3VyY2Ugbm90IGZvdW5kOiBcIiArIHJlcS5wYXRoO1xuICAgICAgICAgICAgICAgICAgICBsb2cuZXJyb3IobXNnKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1cyg0MDQpLnNlbmQobXNnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gdGhpcy5yZXNvdXJjZVJlZ2lzdHJ5LmdldChyZXEucGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXMuc2VuZEZpbGUoZmlsZVBhdGgpO1xuXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgbG9nLmVycm9yKGBDb3VsZCBub3QgaGFuZGxlIHNlcnZpbmcgZmlsZS4gKHJlcS5wYXRoPSR7cmVxLnBhdGh9KWAsIGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVnaXN0ZXJSZXdyaXRlcyhhcHA6IEV4cHJlc3MsIHJld3JpdGVzOiBSZWFkb25seUFycmF5PFJld3JpdGU+ID0gW10pIHtcblxuICAgICAgICBjb25zdCBjb21wdXRlUmV3cml0ZSA9ICh1cmw6IHN0cmluZyk6IFJld3JpdGUgfCB1bmRlZmluZWQgPT4ge1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHJld3JpdGUgb2YgcmV3cml0ZXMpIHtcblxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUuZGVidWcoXCJUZXN0aW5nIHdpdGggcmV3cml0ZTogXCIsIHJld3JpdGUpO1xuXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogaXQncyBwcm9iYWJseSBub3QgZWZmaWNpZW50IHRvIGJ1aWxkIHRoaXMgcmVnZXggZWFjaFxuICAgICAgICAgICAgICAgIC8vIHRpbWVcbiAgICAgICAgICAgICAgICBjb25zdCByZWdleCA9IFBhdGhUb1JlZ2V4cHMucGF0aFRvUmVnZXhwKHJld3JpdGUuc291cmNlKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IG1hdGNoZXMgPSBSZXdyaXRlcy5tYXRjaGVzUmVnZXgocmVnZXgsIHVybCk7XG5cbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmRlYnVnKGBDb21waWxlZCBhcyByZWdleHA6ICR7cmVnZXh9IG1hdGNoZXM6ICR7bWF0Y2hlc31gKTtcblxuICAgICAgICAgICAgICAgIGlmIChtYXRjaGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXdyaXRlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgYXBwLnVzZShmdW5jdGlvbihyZXEsIHJlcywgbmV4dCkge1xuXG4gICAgICAgICAgICBjb25zdCBoYW5kbGVyID0gYXN5bmMgKCkgPT4ge1xuXG4gICAgICAgICAgICAgICAgLy8gbG9nLmRlYnVnKFwiUmV3cml0ZSBhdCB1cmw6IFwiICsgcmVxLnVybCk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCByZXdyaXRlID0gY29tcHV0ZVJld3JpdGUocmVxLnVybCk7XG5cbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmRlYnVnKGBVUkwgJHtyZXEudXJsfSByZXdyaXR0ZW4gYXMgYCwgcmV3cml0ZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmV3cml0ZSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcmV3cml0ZS5kZXN0aW5hdGlvbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcS51cmwgPSByZXdyaXRlLmRlc3RpbmF0aW9uO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdXJsID0gcmVxLnVybDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCByZXdyaXRlLmRlc3RpbmF0aW9uKHVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuc2VuZChjb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbmV4dCgpO1xuXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBoYW5kbGVyKCkuY2F0Y2goZXJyID0+IGNvbnNvbGUuZXJyb3IoZXJyKSk7XG5cbiAgICAgICAgfSk7XG5cbiAgICB9XG5cbn1cblxuXG5leHBvcnQgdHlwZSBFeHByZXNzUmVxdWVzdEhhbmRsZXIgPSAocmVxOiBleHByZXNzLlJlcXVlc3QsIHJlczogZXhwcmVzcy5SZXNwb25zZSkgPT4gdm9pZDs7XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2ViUmVxdWVzdEhhbmRsZXIge1xuXG4gICAgZ2V0KHR5cGU6IFBhdGhQYXJhbXMsIC4uLmhhbmRsZXJzOiBFeHByZXNzUmVxdWVzdEhhbmRsZXJbXSk6IHZvaWQ7XG4gICAgb3B0aW9ucyh0eXBlOiBQYXRoUGFyYW1zLCAuLi5oYW5kbGVyczogRXhwcmVzc1JlcXVlc3RIYW5kbGVyW10pOiB2b2lkO1xuICAgIHBvc3QodHlwZTogUGF0aFBhcmFtcywgLi4uaGFuZGxlcnM6IEV4cHJlc3NSZXF1ZXN0SGFuZGxlcltdKTogdm9pZDtcbiAgICBwdXQodHlwZTogUGF0aFBhcmFtcywgLi4uaGFuZGxlcnM6IEV4cHJlc3NSZXF1ZXN0SGFuZGxlcltdKTogdm9pZDtcblxufVxuIl19