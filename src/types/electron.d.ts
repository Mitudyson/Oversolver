export interface IElectronAPI {
  captureScreen(): unknown;
  hideWindow: () => void;
  minimizeWindow: () => void;
  onShow: (callback: () => void) => void;
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}
