// AxonClaw - Preload Script
// Exposes safe APIs to renderer process
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { contextBridge, ipcRenderer } from 'electron';
// Expose electron IPC in the format expected by api-client.ts
contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        invoke: function (channel) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            return ipcRenderer.invoke.apply(ipcRenderer, __spreadArray([channel], args, false));
        },
        on: function (channel, listener) {
            var subscription = function (_event) {
                var args = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    args[_i - 1] = arguments[_i];
                }
                return listener.apply(void 0, args);
            };
            ipcRenderer.on(channel, subscription);
            return function () { return ipcRenderer.removeListener(channel, subscription); };
        },
        removeListener: function (channel, listener) {
            ipcRenderer.removeListener(channel, listener);
        },
        removeAllListeners: function (channel) {
            ipcRenderer.removeAllListeners(channel);
        },
        send: function (channel) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            ipcRenderer.send.apply(ipcRenderer, __spreadArray([channel], args, false));
        },
    },
    platform: process.platform,
});
// Also expose electronAPI for backward compatibility
contextBridge.exposeInMainWorld('electronAPI', {
    getAppVersion: function () { return ipcRenderer.invoke('get-app-version'); },
    // Gateway management
    startGateway: function () { return ipcRenderer.invoke('gateway:start'); },
    stopGateway: function () { return ipcRenderer.invoke('gateway:stop'); },
    getGatewayStatus: function () { return ipcRenderer.invoke('gateway:status'); },
    // Config management
    getConfig: function () { return ipcRenderer.invoke('config:get'); },
    setConfig: function (key, value) { return ipcRenderer.invoke('config:set', key, value); },
    // Skills management
    openSkillsFolder: function () { return ipcRenderer.invoke('skills:openFolder'); },
    // Generic IPC invoke
    invoke: function (channel) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return ipcRenderer.invoke.apply(ipcRenderer, __spreadArray([channel], args, false));
    },
});
