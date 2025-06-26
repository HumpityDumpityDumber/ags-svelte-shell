import { Astal, Gdk, App } from "astal/gtk3"
import WebKit2 from "gi://WebKit2?version=4.1"
import GtkLayerShell from "gi://GtkLayerShell"
import { initCava } from "../logic/cava"
import { SwitchProControllerMonitor } from "../logic/controller"

export default function Bar(gdkmonitor: Gdk.Monitor) {
    const webview = WebKit2.WebView.new()
    const controllerMonitor = new SwitchProControllerMonitor() // ✅ Define here

    // Better monitor ID detection with fallbacks
    let monitorId = gdkmonitor.get_model()
    if (!monitorId || monitorId.trim() === '') {
        monitorId = gdkmonitor.get_manufacturer() || 'unknown'
        console.log(`Using monitor manufacturer as ID: ${monitorId}`)
    }

    if (monitorId === 'unknown') {
        const allMonitors = Array.from({ length: 10 }, (_, i) => {
            try { return App.get_monitors()[i] } catch { return null }
        }).filter(Boolean)
        const index = allMonitors.indexOf(gdkmonitor)
        monitorId = `monitor-${index >= 0 ? index : 0}`
        console.log(`Using index-based monitor ID: ${monitorId}`)
    }

    console.log(`Bar created for monitor: "${monitorId}"`)

    webview.set_background_color(new Gdk.RGBA())
    webview.set_can_focus(true)
    webview.set_sensitive(true)

    const settings = webview.get_settings()
    settings.allow_file_access_from_file_urls = true

    return <window
        gdkmonitor={gdkmonitor}
        className="Bar"
        anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
        exclusivity={Astal.Exclusivity.EXCLUSIVE}
        heightRequest={60}
        keymode={Astal.Keymode.ON_DEMAND}
        setup={async (self: any) => {
            GtkLayerShell.set_exclusive_zone(self, 35)
            self.set_can_focus(true)
            self.set_accept_focus(true)
            self.add(webview)
            webview.show_all()

            webview.load_uri(`file:///home/knee/.config/ags/svelte-web/dist/index.html?monitor=${encodeURIComponent(monitorId)}`)

            console.log("Setting up Cava and Controller initialization...")

            webview.connect("load-changed", (webview: any, load_event: number) => {
                console.log("WebView load changed:", load_event)
                if (load_event === 3) { // WEBKIT_LOAD_FINISHED
                    console.log("Load finished via load-changed, initializing Cava and Controller monitor...")
                    initCava(webview)
                    controllerMonitor.init(webview)
                }
            })
        }}
    />
}
