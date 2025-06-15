import { Astal, Gdk } from "astal/gtk3"
import WebKit2 from "gi://WebKit2?version=4.1"
import GtkLayerShell from "gi://GtkLayerShell"

export default function Bar(gdkmonitor: Gdk.Monitor) {
    const webview = WebKit2.WebView.new()

    webview.set_background_color(new Gdk.RGBA())
    webview.set_can_focus(true)
    webview.set_sensitive(true)
    
    const settings = webview.get_settings();
    settings.allow_file_access_from_file_urls = true;


    return <window
        gdkmonitor={gdkmonitor}
        className="Bar"
        anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
        exclusivity={Astal.Exclusivity.EXCLUSIVE}
        heightRequest={35}
        keymode={Astal.Keymode.ON_DEMAND}
        setup={async (self) => {
            GtkLayerShell.set_exclusive_zone(self, 20)
            self.set_can_focus(true)
            self.set_accept_focus(true)
            self.add(webview)
            webview.show_all()

            webview.load_uri("file:///home/knee/.config/ags/svelte-web/dist/index.html")
        }}
    />
}
