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
const WebserverConfig_1 = require("./WebserverConfig");
const chai_1 = require("chai");
const FileRegistry_1 = require("./FileRegistry");
const Files_1 = require("polar-shared/src/util/Files");
const FilePaths_1 = require("polar-shared/src/util/FilePaths");
const Assertions_1 = require("polar-test/src/test/Assertions");
const webserverConfig = new WebserverConfig_1.WebserverConfig(".", 8080);
describe('FileRegistry', function () {
    describe('create', function () {
        it("basic", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const fileRegistry = new FileRegistry_1.FileRegistry(webserverConfig);
                chai_1.assert.equal(fileRegistry.hasKey("0x0001"), false);
                const path = FilePaths_1.FilePaths.tmpfile('file-registry.html');
                yield Files_1.Files.writeFileAsync(path, 'hello world');
                const registerData = fileRegistry.register("0x0001", path);
                const expected = {
                    "key": "0x0001",
                    "filename": path,
                    "url": "http://127.0.0.1:8080/files/0x0001"
                };
                Assertions_1.assertJSON(registerData, expected);
                chai_1.assert.equal(fileRegistry.hasKey("0x0001"), true);
            });
        });
        it("register with PHZ", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const fileRegistry = new FileRegistry_1.FileRegistry(webserverConfig);
                const path = "/home/burton/.polar/stash/12EEqbAeuX-YC_s_Essential_Startup_Advice.phz";
                const filename = FilePaths_1.FilePaths.basename(path);
                const fileMeta = fileRegistry.register(path, filename);
                console.log(fileMeta);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmlsZVJlZ2lzdHJ5VGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkZpbGVSZWdpc3RyeVRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQSx1REFBa0Q7QUFFbEQsK0JBQTRCO0FBQzVCLGlEQUE0QztBQUM1Qyx1REFBa0Q7QUFDbEQsK0RBQTBEO0FBQzFELCtEQUEwRDtBQUUxRCxNQUFNLGVBQWUsR0FBRyxJQUFJLGlDQUFlLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBRXZELFFBQVEsQ0FBQyxjQUFjLEVBQUU7SUFFckIsUUFBUSxDQUFDLFFBQVEsRUFBRTtRQUVmLEVBQUUsQ0FBQyxPQUFPLEVBQUU7O2dCQUVSLE1BQU0sWUFBWSxHQUFHLElBQUksMkJBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFFdkQsYUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUVuRCxNQUFNLElBQUksR0FBRyxxQkFBUyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO2dCQUNyRCxNQUFNLGFBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO2dCQUVoRCxNQUFNLFlBQVksR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFFM0QsTUFBTSxRQUFRLEdBQUc7b0JBQ2IsS0FBSyxFQUFFLFFBQVE7b0JBQ2YsVUFBVSxFQUFFLElBQUk7b0JBQ2hCLEtBQUssRUFBRSxvQ0FBb0M7aUJBQzlDLENBQUM7Z0JBRUYsdUJBQVUsQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBRW5DLGFBQU0sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUV0RCxDQUFDO1NBQUEsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLG1CQUFtQixFQUFFOztnQkFDcEIsTUFBTSxZQUFZLEdBQUcsSUFBSSwyQkFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUV2RCxNQUFNLElBQUksR0FBRyx3RUFBd0UsQ0FBQztnQkFFdEYsTUFBTSxRQUFRLEdBQUcscUJBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBRTFDLE1BQU0sUUFBUSxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUV2RCxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRTFCLENBQUM7U0FBQSxDQUFDLENBQUM7SUFFUCxDQUFDLENBQUMsQ0FBQztBQUVQLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtXZWJzZXJ2ZXJDb25maWd9IGZyb20gJy4vV2Vic2VydmVyQ29uZmlnJztcblxuaW1wb3J0IHthc3NlcnR9IGZyb20gJ2NoYWknO1xuaW1wb3J0IHtGaWxlUmVnaXN0cnl9IGZyb20gJy4vRmlsZVJlZ2lzdHJ5JztcbmltcG9ydCB7RmlsZXN9IGZyb20gJ3BvbGFyLXNoYXJlZC9zcmMvdXRpbC9GaWxlcyc7XG5pbXBvcnQge0ZpbGVQYXRoc30gZnJvbSAncG9sYXItc2hhcmVkL3NyYy91dGlsL0ZpbGVQYXRocyc7XG5pbXBvcnQge2Fzc2VydEpTT059IGZyb20gXCJwb2xhci10ZXN0L3NyYy90ZXN0L0Fzc2VydGlvbnNcIjtcblxuY29uc3Qgd2Vic2VydmVyQ29uZmlnID0gbmV3IFdlYnNlcnZlckNvbmZpZyhcIi5cIiwgODA4MCk7XG5cbmRlc2NyaWJlKCdGaWxlUmVnaXN0cnknLCBmdW5jdGlvbigpIHtcblxuICAgIGRlc2NyaWJlKCdjcmVhdGUnLCBmdW5jdGlvbigpIHtcblxuICAgICAgICBpdChcImJhc2ljXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICBjb25zdCBmaWxlUmVnaXN0cnkgPSBuZXcgRmlsZVJlZ2lzdHJ5KHdlYnNlcnZlckNvbmZpZyk7XG5cbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChmaWxlUmVnaXN0cnkuaGFzS2V5KFwiMHgwMDAxXCIpLCBmYWxzZSk7XG5cbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSBGaWxlUGF0aHMudG1wZmlsZSgnZmlsZS1yZWdpc3RyeS5odG1sJyk7XG4gICAgICAgICAgICBhd2FpdCBGaWxlcy53cml0ZUZpbGVBc3luYyhwYXRoLCAnaGVsbG8gd29ybGQnKTtcblxuICAgICAgICAgICAgY29uc3QgcmVnaXN0ZXJEYXRhID0gZmlsZVJlZ2lzdHJ5LnJlZ2lzdGVyKFwiMHgwMDAxXCIsIHBhdGgpO1xuXG4gICAgICAgICAgICBjb25zdCBleHBlY3RlZCA9IHtcbiAgICAgICAgICAgICAgICBcImtleVwiOiBcIjB4MDAwMVwiLFxuICAgICAgICAgICAgICAgIFwiZmlsZW5hbWVcIjogcGF0aCxcbiAgICAgICAgICAgICAgICBcInVybFwiOiBcImh0dHA6Ly8xMjcuMC4wLjE6ODA4MC9maWxlcy8weDAwMDFcIlxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgYXNzZXJ0SlNPTihyZWdpc3RlckRhdGEsIGV4cGVjdGVkKTtcblxuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGZpbGVSZWdpc3RyeS5oYXNLZXkoXCIweDAwMDFcIiksIHRydWUpO1xuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KFwicmVnaXN0ZXIgd2l0aCBQSFpcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlUmVnaXN0cnkgPSBuZXcgRmlsZVJlZ2lzdHJ5KHdlYnNlcnZlckNvbmZpZyk7XG5cbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSBcIi9ob21lL2J1cnRvbi8ucG9sYXIvc3Rhc2gvMTJFRXFiQWV1WC1ZQ19zX0Vzc2VudGlhbF9TdGFydHVwX0FkdmljZS5waHpcIjtcblxuICAgICAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBGaWxlUGF0aHMuYmFzZW5hbWUocGF0aCk7XG5cbiAgICAgICAgICAgIGNvbnN0IGZpbGVNZXRhID0gZmlsZVJlZ2lzdHJ5LnJlZ2lzdGVyKHBhdGgsIGZpbGVuYW1lKTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coZmlsZU1ldGEpO1xuXG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn0pO1xuIl19