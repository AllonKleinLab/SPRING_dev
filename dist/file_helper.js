var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define(["require", "exports", "d3", "./main"], function (require, exports, d3, main_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getData = (name, fileType) => __awaiter(this, void 0, void 0, function* () {
        if (window.cacheData && window.cacheData.has(name)) {
            console.log(`I have cached data for ${name}!`);
            return window.cacheData.get(name);
        }
        try {
            const filePath = `${main_1.project_directory}/${name}.${fileType}`;
            switch (fileType) {
                case 'txt':
                case 'csv':
                    return yield d3.text(filePath);
                case 'json':
                    return yield d3.json(filePath);
                default: {
                    console.log(`Sorry, currently no support for fileType '${fileType}'!`);
                    break;
                }
            }
        }
        catch (e) {
            console.log(e);
            return '';
        }
    });
    exports.addData = (key, value) => {
        window.cacheData.set(key, value);
    };
});
