import { App, Gdk, Gtk } from "astal/gtk3"
import { subprocess } from "astal/process"
import Bar from "./elements/Bar"

let serverReady = false
let serverReadyPromise: Promise<void>
let resolveServerReady: (() => void)

serverReadyPromise = new Promise((resolve) => {
    resolveServerReady = resolve
})

export function waitUntilServerReady(): Promise<void> {
    return serverReady ? Promise.resolve() : serverReadyPromise
}

function main() {
    const bars = new Map<Gdk.Monitor, Gtk.Widget>()

    for (const gdkmonitor of App.get_monitors()) {
        bars.set(gdkmonitor, Bar(gdkmonitor))
    }

    App.connect("monitor-added", (_, gdkmonitor) => {
        bars.set(gdkmonitor, Bar(gdkmonitor))
    })

    App.connect("monitor-removed", (_, gdkmonitor) => {
        bars.get(gdkmonitor)?.destroy()
        bars.delete(gdkmonitor)
    })
}

subprocess(
    ["npm", "--prefix", "~/.config/ags/svelte-web", "run", "start"],
    (stdout) => {
        if (stdout.includes("➜  Local:   http://localhost:8125/")) {
            serverReady = true
            resolveServerReady()
        }
    }
)

App.start({ main })
