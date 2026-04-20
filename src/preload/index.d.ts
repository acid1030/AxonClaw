export interface ElectronAPI {
    getAppVersion: () => Promise<string>;
    startGateway: () => Promise<void>;
    stopGateway: () => Promise<void>;
    getGatewayStatus: () => Promise<'running' | 'stopped' | 'error'>;
    getConfig: () => Promise<any>;
    setConfig: (key: string, value: any) => Promise<void>;
    openSkillsFolder: () => Promise<string>;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
}
declare global {
    interface Window {
        electron: {
            ipcRenderer: {
                invoke: (channel: string, ...args: any[]) => Promise<any>;
                on: (channel: string, listener: (...args: any[]) => void) => () => void;
                removeListener: (channel: string, listener: (...args: any[]) => void) => void;
                removeAllListeners: (channel: string) => void;
                send: (channel: string, ...args: any[]) => void;
            };
            platform: NodeJS.Platform;
        };
        electronAPI: ElectronAPI;
    }
}
