// Bridge to the Windows host (desktop/Program.cs); undefined when running in a normal browser.
export interface DesktopBridge {
  postMessage: (message: string) => void
  addEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void
  removeEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void
}
export const desktop = (window as Window & { chrome?: { webview?: DesktopBridge } }).chrome?.webview
