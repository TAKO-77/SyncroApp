// Bridge to the Windows host (desktop/Program.cs); undefined in a normal browser, where the app runs without host features.
export interface DesktopBridge {
  postMessage: (message: string) => void
  addEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void
  removeEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void
}
export const desktop = (window as Window & { chrome?: { webview?: DesktopBridge } }).chrome?.webview
