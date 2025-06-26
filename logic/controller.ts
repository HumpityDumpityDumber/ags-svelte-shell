import { subprocess } from "astal"
import GLib from "gi://GLib"

interface WebView {
    run_javascript(script: string, cancellable: any, callback: any): void
}

export class SwitchProControllerMonitor {
    private webviews: WebView[] = []
    private intervalId: number | null = null
    private lastDetected = false

    init(webview: WebView) {
        this.webviews = [webview]
        this.start()
    }

    initMultiple(webviews: WebView[]) {
        this.webviews = webviews
        this.start()
    }

    private start() {
        this.intervalId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
            this.scan()
            return true
        })
    }

    private async scan() {
        const isConnected = await this.detectSwitchProController()
        if (isConnected !== this.lastDetected) {
            this.lastDetected = isConnected
            this.notifyWebViews(isConnected)
        }
    }

    private async detectSwitchProController(): Promise<boolean> {
        return new Promise((resolve) => {
            let output = ""
            subprocess(["lsusb"], (stdout) => output += stdout, () => {})
            setTimeout(() => {
                resolve(output.includes("057e:2009"))
            }, 300)
        })
    }

    private notifyWebViews(connected: boolean) {
        const controller = connected ? [{
            name: "Nintendo Switch Pro Controller",
            is_connected: true,
            type: "gamepad"
        }] : []

        const js = `if (window.updateControllersFromAstal) window.updateControllersFromAstal(${JSON.stringify(controller)});`

        for (const webview of this.webviews) {
            try {
                webview.run_javascript(js, null, null)
            } catch (e) {
                console.warn("WebView JS error:", e)
            }
        }
    }

    stop() {
        if (this.intervalId !== null) {
            GLib.source_remove(this.intervalId)
            this.intervalId = null
        }
    }
}