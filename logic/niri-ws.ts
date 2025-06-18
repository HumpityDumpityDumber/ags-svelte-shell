import { GLib, Gio } from "astal"

export interface NiriWorkspace {
    id: number
    idx: number
    name?: string
    output?: string
    is_focused: boolean
    is_active: boolean
}

export class NiriWorkspaceManager {
    private socket: Gio.SocketConnection | null = null
    private stream: Gio.DataInputStream | null = null
    private currentWorkspace: number = 0
    private workspaces: NiriWorkspace[] = []
    private workspaceMap: Map<number, number> = new Map()
    private connected: boolean = false
    private reconnectTimeoutId: number | null = null
    private callbacks: Array<(workspaces: NiriWorkspace[], current: number) => void> = []

    constructor() {
        this.connect()
    }

    private getNiriSocketPath(): string {
        const niriSocket = GLib.getenv("NIRI_SOCKET")
        if (niriSocket) return niriSocket

        const runtimeDir = GLib.getenv("XDG_RUNTIME_DIR") || `/run/user/${GLib.getenv("UID")}`
        return `${runtimeDir}/niri/niri.sock`
    }

    private async connect(): Promise<void> {
        try {
            const socketPath = this.getNiriSocketPath()
            console.log(`Connecting to Niri IPC socket: ${socketPath}`)

            const client = new Gio.SocketClient()
            const address = Gio.UnixSocketAddress.new(socketPath)
            
            this.socket = await new Promise((resolve, reject) => {
                client.connect_async(address, null, (source, result) => {
                    try {
                        const connection = client.connect_finish(result)
                        resolve(connection)
                    } catch (error) {
                        reject(error)
                    }
                })
            })

            this.stream = new Gio.DataInputStream({
                base_stream: this.socket!.get_input_stream()
            })

            this.connected = true
            console.log("Connected to Niri IPC socket")

            // Request initial workspace state
            await this.requestWorkspaces()
            
            // Start event stream
            await this.requestEventStream()
            
            // Start reading responses
            this.readResponses()

        } catch (error) {
            console.warn("Failed to connect to Niri IPC:", error)
            this.scheduleReconnect()
        }
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimeoutId) {
            GLib.source_remove(this.reconnectTimeoutId)
        }
        
        this.reconnectTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
            console.log("Attempting to reconnect to Niri IPC")
            this.connect()
            return GLib.SOURCE_REMOVE
        })
    }

    private async sendRequest(request: string | object): Promise<void> {
        if (!this.socket || !this.connected) {
            console.warn("Cannot send request - not connected to Niri socket")
            return
        }

        try {
            const jsonRequest = typeof request === 'string' ? `"${request}"` : JSON.stringify(request)
            const data = new TextEncoder().encode(jsonRequest + '\n')
            
            const outputStream = this.socket.get_output_stream()
            await new Promise<void>((resolve, reject) => {
                outputStream.write_async(data, GLib.PRIORITY_DEFAULT, null, (source, result) => {
                    try {
                        outputStream.write_finish(result)
                        resolve()
                    } catch (error) {
                        reject(error)
                    }
                })
            })
        } catch (error) {
            console.warn("Failed to send request to Niri:", error)
            this.connected = false
            this.scheduleReconnect()
        }
    }

    private async requestWorkspaces(): Promise<void> {
        await this.sendRequest("Workspaces")
    }

    private async requestEventStream(): Promise<void> {
        await this.sendRequest("EventStream")
    }

    private async readResponses(): Promise<void> {
        if (!this.stream) return

        try {
            while (this.connected) {
                const [line] = await new Promise<[string, number]>((resolve, reject) => {
                    this.stream!.read_line_async(GLib.PRIORITY_DEFAULT, null, (source, result) => {
                        try {
                            const [bytes, length] = this.stream!.read_line_finish(result)
                            const line = bytes ? new TextDecoder().decode(bytes) : ""
                            resolve([line, length])
                        } catch (error) {
                            reject(error)
                        }
                    })
                })

                if (line && line.trim()) {
                    this.handleNiriResponse(line.trim())
                }
            }
        } catch (error) {
            console.warn("Error reading from Niri socket:", error)
            this.connected = false
            this.scheduleReconnect()
        }
    }

    private handleNiriResponse(jsonData: string): void {
        if (!jsonData || jsonData.length === 0) return

        try {
            const response = JSON.parse(jsonData)

            // Handle wrapped responses
            if (response.Ok !== undefined) {
                this.handleSuccessResponse(response.Ok)
            } else if (response.Err !== undefined) {
                console.warn("Niri error response:", response.Err)
            } else {
                // Direct event (from event stream)
                this.handleNiriEvent(response)
            }
        } catch (e) {
            console.warn("Failed to parse Niri response:", e, "Data:", jsonData)
        }
    }

    private handleSuccessResponse(data: any): void {
        if (data.Workspaces !== undefined) {
            const workspaceList: NiriWorkspace[] = data.Workspaces
            console.log("Received workspaces:", workspaceList.length, "workspaces")

            // Store the workspace list
            this.workspaces = workspaceList

            // Build workspace mapping
            this.workspaceMap.clear()
            for (const workspace of workspaceList) {
                this.workspaceMap.set(workspace.id, workspace.idx)
                if (workspace.is_focused) {
                    this.currentWorkspace = workspace.idx
                    console.log("Initial current workspace detected:", this.currentWorkspace)
                }
            }

            this.notifyCallbacks()
        }
    }

    private handleNiriEvent(event: any): void {
        if (event.WorkspaceActivated) {
            const workspaceId = event.WorkspaceActivated.id

            // Look up the idx from our workspace map
            if (this.workspaceMap.has(workspaceId)) {
                const newWorkspace = this.workspaceMap.get(workspaceId)!

                // Find the workspace object to get monitor/output information
                const workspaceObj = this.workspaces.find(ws => ws.id === workspaceId)

                if (newWorkspace !== this.currentWorkspace) {
                    const monitorInfo = workspaceObj?.output || "unknown monitor"
                    console.log("Workspace changed:", this.currentWorkspace, "→", newWorkspace, "on", monitorInfo)
                    this.currentWorkspace = newWorkspace
                }
            }

            // Update focus state in workspaces array
            for (const workspace of this.workspaces) {
                workspace.is_focused = (workspace.id === workspaceId)
            }

            this.notifyCallbacks()

        } else if (event.WorkspacesChanged) {
            const workspaceList: NiriWorkspace[] = event.WorkspacesChanged.workspaces

            // Store the complete workspace list
            this.workspaces = workspaceList

            // Update workspace mapping
            this.workspaceMap.clear()
            for (const workspace of workspaceList) {
                this.workspaceMap.set(workspace.id, workspace.idx)
                if (workspace.is_focused) {
                    const newWorkspace = workspace.idx
                    if (newWorkspace !== this.currentWorkspace) {
                        console.log("Workspace changed (WorkspacesChanged):", this.currentWorkspace, "→", newWorkspace)
                        this.currentWorkspace = newWorkspace
                    }
                }
            }

            this.notifyCallbacks()
        }
    }

    private notifyCallbacks(): void {
        for (const callback of this.callbacks) {
            callback(this.workspaces, this.currentWorkspace)
        }
    }

    public onWorkspacesChanged(callback: (workspaces: NiriWorkspace[], current: number) => void): void {
        this.callbacks.push(callback)
    }

    public removeCallback(callback: (workspaces: NiriWorkspace[], current: number) => void): void {
        const index = this.callbacks.indexOf(callback)
        if (index !== -1) {
            this.callbacks.splice(index, 1)
        }
    }

    public getCurrentWorkspace(): number {
        return this.currentWorkspace
    }

    public getWorkspaces(): NiriWorkspace[] {
        return [...this.workspaces]
    }

    public destroy(): void {
        console.log("Cleaning up NiriWorkspaceManager")
        this.connected = false
        
        if (this.reconnectTimeoutId) {
            GLib.source_remove(this.reconnectTimeoutId)
            this.reconnectTimeoutId = null
        }

        if (this.socket) {
            try {
                this.socket.close(null)
            } catch (error) {
                console.warn("Error closing Niri socket:", error)
            }
            this.socket = null
            this.stream = null
        }

        this.callbacks = []
    }
}

// Global instance
let niriManager: NiriWorkspaceManager | null = null

export function getNiriWorkspaceManager(): NiriWorkspaceManager {
    if (!niriManager) {
        niriManager = new NiriWorkspaceManager()
    }
    return niriManager
}

export function initNiriWorkspaces(webview: any, monitorName?: string): void {
    const manager = getNiriWorkspaceManager()
    
    // Map monitor names to Niri output names
    // You may need to adjust these mappings based on your setup
    const monitorToOutput: { [key: string]: string } = {
        "VA2246 SERIES": "HDMI-A-1",
        "LS27AG55x": "DP-1"
    }
    
    const expectedOutput = monitorName ? monitorToOutput[monitorName] : undefined
    
    // Set up callback to inject workspace data into webview
    const updateWorkspaces = (workspaces: NiriWorkspace[], current: number) => {
        // Filter workspaces based on the expected output
        let filteredWorkspaces: NiriWorkspace[]
        
        if (expectedOutput) {
            filteredWorkspaces = workspaces.filter(ws => ws.output === expectedOutput)
        } else {
            filteredWorkspaces = workspaces
        }
        
        // Sort workspaces by index to ensure correct order
        filteredWorkspaces.sort((a, b) => a.idx - b.idx)
        
        const workspaceData = {
            workspaces: filteredWorkspaces,
            current: current,
            monitor: monitorName
        }
        
        const script = `
            if (window.updateWorkspaces) {
                window.updateWorkspaces(${JSON.stringify(workspaceData)});
            } else {
                window.niriWorkspaceData = ${JSON.stringify(workspaceData)};
            }
        `
        
        try {
            webview.run_javascript(script, null, (source: any, result: any) => {
                try {
                    webview.run_javascript_finish(result)
                } catch (error) {
                    console.warn("Error executing workspace update script:", error)
                }
            })
        } catch (error) {
            console.warn("Error injecting workspace data:", error)
        }
    }
    
    manager.onWorkspacesChanged(updateWorkspaces)
    
    // Inject initial data
    updateWorkspaces(manager.getWorkspaces(), manager.getCurrentWorkspace())
}
