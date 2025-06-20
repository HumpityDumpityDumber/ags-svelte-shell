import { subprocess } from "astal"
import { Astal } from "astal/gtk3"
import { switchToWorkspace } from "./niri-actions"

// Type definitions for Niri IPC messages
interface NiriWorkspace {
    id: number
    idx: number
    output: string
    is_active: boolean
    is_focused: boolean
    active_window_id?: number
}

interface WorkspacesChangedEvent {
    WorkspacesChanged: {
        workspaces: NiriWorkspace[]
    }
}

interface WorkspaceActivatedEvent {
    WorkspaceActivated: {
        id: number
        focused: boolean
    }
}

interface WindowFocusChangedEvent {
    WindowFocusChanged: {
        id?: number
    }
}

type NiriEvent = WorkspacesChangedEvent | WorkspaceActivatedEvent | WindowFocusChangedEvent

// WebView interface for communication
interface WebView {
    run_javascript(script: string, cancellable: any, callback: any): void
}

/**
 * Niri Workspace Manager
 * Handles workspace state and communicates with Svelte frontend
 */
export class NiriWorkspaceManager {
    private workspaces: Map<number, NiriWorkspace> = new Map()
    private webviews: Map<string, WebView> = new Map()
    private monitorOutputMapping: Map<string, string> = new Map() // monitor -> output
    private eventStreamProcess: any = null
    private isActive = false

    /**
     * Initialize workspace manager and start listening to Niri events
     */
    async init(): Promise<void> {
        console.log("Initializing Niri workspace manager...")
        
        try {
            // Start listening to Niri event stream
            await this.startEventStream()
            this.isActive = true
            console.log("Niri workspace manager initialized successfully")
        } catch (error) {
            console.error("Failed to initialize Niri workspace manager:", error)
            throw error
        }
    }

    /**
     * Register a WebView for a specific monitor
     */
    registerWebView(monitorId: string, webview: WebView): void {
        console.log(`Registering WebView for monitor: ${monitorId}`)
        this.webviews.set(monitorId, webview)
        
        // Try to establish monitor -> output mapping
        this.establishMonitorOutputMapping(monitorId)
        
        // Send current workspace state to the newly registered WebView
        this.sendWorkspaceDataToMonitor(monitorId)
    }

    /**
     * Unregister a WebView (monitor unplugged)
     */
    unregisterWebView(monitorId: string): void {
        console.log(`Unregistering WebView for monitor: ${monitorId}`)
        this.webviews.delete(monitorId)
        this.monitorOutputMapping.delete(monitorId)
    }

    /**
     * Start the Niri event stream process
     */
    private async startEventStream(): Promise<void> {
        try {
            console.log("Starting Niri event stream...")
            
            this.eventStreamProcess = subprocess(
                ["niri", "msg", "--json", "event-stream"],
                (stdout) => {
                    try {
                        const line = stdout.trim()
                        if (line) {
                            const event: NiriEvent = JSON.parse(line)
                            this.handleNiriEvent(event)
                        }
                    } catch (error) {
                        console.warn("Failed to parse Niri event:", error, "Raw line:", stdout)
                    }
                },
                (stderr) => {
                    console.error("Niri event stream error:", stderr)
                }
            )

            console.log("Niri event stream started successfully")
        } catch (error) {
            console.error("Failed to start Niri event stream:", error)
            throw error
        }
    }

    /**
     * Handle incoming Niri events
     */
    private handleNiriEvent(event: NiriEvent): void {
        if ("WorkspacesChanged" in event) {
            this.handleWorkspacesChanged(event.WorkspacesChanged.workspaces)
        } else if ("WorkspaceActivated" in event) {
            this.handleWorkspaceActivated(event.WorkspaceActivated)
        }
        // Ignore WindowFocusChanged as per requirements
    }

    /**
     * Handle WorkspacesChanged event (initial state or monitor hotplug)
     */
    private handleWorkspacesChanged(workspaces: NiriWorkspace[]): void {
        console.log("WorkspacesChanged event received:", workspaces.length, "workspaces")
        
        // Log the workspace details for debugging
        workspaces.forEach(ws => {
            console.log(`  Workspace ${ws.idx} (ID: ${ws.id}) on output: "${ws.output}", active: ${ws.is_active}, focused: ${ws.is_focused}`)
        })
        
        // Clear existing workspace state
        this.workspaces.clear()
        
        // Update workspace map
        workspaces.forEach(workspace => {
            this.workspaces.set(workspace.id, workspace)
        })

        // Re-establish monitor mappings with new workspace data
        this.webviews.forEach((webview, monitorId) => {
            this.establishMonitorOutputMapping(monitorId)
        })

        // Send updates to all monitors
        this.sendWorkspaceDataToAllMonitors()
    }

    /**
     * Handle WorkspaceActivated event
     */
    private handleWorkspaceActivated(event: { id: number; focused: boolean }): void {
        console.log("WorkspaceActivated event received:", event)
        
        const workspace = this.workspaces.get(event.id)
        if (!workspace) {
            console.warn("Unknown workspace activated:", event.id)
            return
        }

        // Update workspace state
        // First clear all active/focused states for workspaces on the same output
        this.workspaces.forEach(ws => {
            if (ws.output === workspace.output) {
                ws.is_active = false
                ws.is_focused = false
            }
        })

        // Set the activated workspace as active/focused
        workspace.is_active = true
        workspace.is_focused = event.focused

        // Send update ONLY to monitors that are showing this specific output
        this.webviews.forEach((webview, monitorId) => {
            // Check if this monitor should display workspaces from this output
            const shouldUpdate = this.shouldMonitorDisplayOutput(monitorId, workspace.output)
            if (shouldUpdate) {
                console.log(`Updating monitor ${monitorId} for output ${workspace.output}`)
                this.sendWorkspaceDataToSpecificOutput(monitorId, workspace.output)
            }
        })
    }

    /**
     * Send workspace data to all monitors
     */
    private sendWorkspaceDataToAllMonitors(): void {
        console.log("Sending workspace data to all monitors...")
        console.log("Registered WebViews:", Array.from(this.webviews.keys()))
        console.log("Workspace outputs:", Array.from(new Set(Array.from(this.workspaces.values()).map(ws => ws.output))))
        
        // Get all unique outputs from workspaces
        const workspaceOutputs = Array.from(new Set(Array.from(this.workspaces.values()).map(ws => ws.output)))
        
        // For each registered WebView, try to find matching workspace data
        this.webviews.forEach((webview, registeredMonitorId) => {
            console.log(`Processing registered monitor: ${registeredMonitorId}`)
            
            // First, try exact match
            let targetOutput = workspaceOutputs.find(output => output === registeredMonitorId)
            
            // If no exact match, and there's only one workspace output, use that
            if (!targetOutput && workspaceOutputs.length === 1) {
                targetOutput = workspaceOutputs[0]
                console.log(`No exact match for ${registeredMonitorId}, using single output: ${targetOutput}`)
            }
            
            if (targetOutput) {
                this.sendWorkspaceDataToSpecificOutput(registeredMonitorId, targetOutput)
            } else {
                console.warn(`No workspace data found for monitor: ${registeredMonitorId}`)
            }
        })
    }

    /**
     * Send workspace data to a specific monitor for a specific output
     */
    private sendWorkspaceDataToSpecificOutput(monitorId: string, outputId: string): void {
        const webview = this.webviews.get(monitorId)
        if (!webview) {
            console.log(`No WebView registered for monitor: ${monitorId}`)
            return
        }

        const workspacesForOutput = Array.from(this.workspaces.values())
            .filter(ws => ws.output === outputId)
            .sort((a, b) => a.idx - b.idx)

        const jsonData = JSON.stringify(workspacesForOutput)
        const jsCode = `if(window.updateWorkspacesFromAstal) window.updateWorkspacesFromAstal(${jsonData});`
        
        try {
            const webviewAny = webview as any
            webviewAny.run_javascript(jsCode, null, null)
            console.log(`Sent workspace data to monitor ${monitorId} (output: ${outputId}):`, workspacesForOutput.length, "workspaces")
        } catch (error) {
            console.warn(`Failed to send workspace data to monitor ${monitorId}:`, error)
        }
    }

    /**
     * Send workspace data to a specific monitor
     */
    private sendWorkspaceDataToMonitor(monitorId: string): void {
        this.sendWorkspaceDataToSpecificOutput(monitorId, monitorId)
    }

    /**
     * Get workspaces grouped by monitor
     */
    private getWorkspacesByMonitor(): Map<string, NiriWorkspace[]> {
        const monitorWorkspaces = new Map<string, NiriWorkspace[]>()
        
        this.workspaces.forEach(workspace => {
            const existing = monitorWorkspaces.get(workspace.output) || []
            existing.push(workspace)
            monitorWorkspaces.set(workspace.output, existing)
        })

        // Sort workspaces by idx within each monitor
        monitorWorkspaces.forEach(workspaces => {
            workspaces.sort((a, b) => a.idx - b.idx)
        })

        return monitorWorkspaces
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        console.log("Destroying Niri workspace manager...")
        this.isActive = false
        
        if (this.eventStreamProcess) {
            this.eventStreamProcess.kill()
            this.eventStreamProcess = null
        }
        
        this.workspaces.clear()
        this.webviews.clear()
        this.monitorOutputMapping.clear()
        console.log("Niri workspace manager destroyed")
    }

    /**
     * Switch to a specific workspace
     */
    async switchToWorkspace(workspaceId: number): Promise<void> {
        console.log(`Switching to workspace: ${workspaceId}`)
        
        const workspace = this.workspaces.get(workspaceId)
        if (!workspace) {
            console.warn("Workspace not found:", workspaceId)
            return
        }

        try {
            // Switch the workspace using the niri-actions module
            await switchToWorkspace(workspaceId)

            // Update the local state to reflect the switch
            this.handleWorkspaceActivated({ id: workspaceId, focused: true })
        } catch (error) {
            console.error("Failed to switch workspace:", error)
        }
    }

    /**
     * Handle workspace switch request from frontend
     */
    async switchWorkspace(workspaceId: number): Promise<void> {
        console.log(`Workspace switch requested: ${workspaceId}`)
        await switchToWorkspace(workspaceId)
    }

    /**
     * Establish mapping between monitor ID and Niri output
     */
    private establishMonitorOutputMapping(monitorId: string): void {
        const availableOutputs = Array.from(new Set(Array.from(this.workspaces.values()).map(ws => ws.output)))
        
        console.log(`Establishing mapping for monitor "${monitorId}"`)
        console.log(`Available outputs:`, availableOutputs)
        
        // Direct match first
        if (availableOutputs.includes(monitorId)) {
            this.monitorOutputMapping.set(monitorId, monitorId)
            console.log(`Direct match: ${monitorId} -> ${monitorId}`)
            return
        }
        
        // Try fuzzy matching
        for (const output of availableOutputs) {
            if (monitorId.includes(output) || output.includes(monitorId)) {
                this.monitorOutputMapping.set(monitorId, output)
                console.log(`Fuzzy match: ${monitorId} -> ${output}`)
                return
            }
        }
        
        // Smart assignment for dual monitor setups
        if (availableOutputs.length === 2 && this.webviews.size <= 2) {
            // Sort outputs for consistent assignment
            const sortedOutputs = availableOutputs.sort()
            const monitorKeys = Array.from(this.webviews.keys()).sort()
            const monitorIndex = monitorKeys.indexOf(monitorId)
            
            if (monitorIndex >= 0 && monitorIndex < sortedOutputs.length) {
                this.monitorOutputMapping.set(monitorId, sortedOutputs[monitorIndex])
                console.log(`Smart dual-monitor assignment: ${monitorId} -> ${sortedOutputs[monitorIndex]}`)
                return
            }
        }
        
        // If only one output available, use it
        if (availableOutputs.length === 1) {
            this.monitorOutputMapping.set(monitorId, availableOutputs[0])
            console.log(`Single output mapping: ${monitorId} -> ${availableOutputs[0]}`)
            return
        }
        
        // If no mapping found, we'll handle it later
        console.log(`No mapping established for monitor: ${monitorId}`)
    }

    /**
     * Check if a monitor should display workspaces from a specific output
     */
    private shouldMonitorDisplayOutput(monitorId: string, outputId: string): boolean {
        // Check established mapping first
        const mappedOutput = this.monitorOutputMapping.get(monitorId)
        if (mappedOutput) {
            return mappedOutput === outputId
        }
        
        // Direct match
        if (monitorId === outputId) {
            return true
        }
        
        // If we only have one monitor registered, it should show all outputs
        if (this.webviews.size === 1) {
            return true
        }
        
        // For multi-monitor setups, try fuzzy matching
        if (monitorId.includes(outputId) || outputId.includes(monitorId)) {
            return true
        }
        
        return false
    }
}

// Global instance
let niriWorkspaceManager: NiriWorkspaceManager | null = null

/**
 * Initialize Niri workspace manager for a WebView
 */
export async function initNiriWorkspaces(webview: WebView, monitorId: string): Promise<void> {
    console.log(`Initializing Niri workspaces for monitor: ${monitorId}`)
    
    try {
        // Create global manager if it doesn't exist
        if (!niriWorkspaceManager) {
            niriWorkspaceManager = new NiriWorkspaceManager()
            await niriWorkspaceManager.init()
        }

        // Register this WebView
        niriWorkspaceManager.registerWebView(monitorId, webview)
        
        console.log(`Niri workspaces initialized for monitor: ${monitorId}`)
    } catch (error) {
        console.error(`Failed to initialize Niri workspaces for monitor ${monitorId}:`, error)
    }
}

/**
 * Cleanup Niri workspaces for a monitor
 */
export function cleanupNiriWorkspaces(monitorId: string): void {
    console.log(`Cleaning up Niri workspaces for monitor: ${monitorId}`)
    
    if (niriWorkspaceManager) {
        niriWorkspaceManager.unregisterWebView(monitorId)
    }
}

/**
 * Cleanup all Niri workspace resources
 */
export function destroyNiriWorkspaces(): void {
    if (niriWorkspaceManager) {
        niriWorkspaceManager.destroy()
        niriWorkspaceManager = null
    }
}

/**
 * Global function for workspace switching (exposed to frontend)
 */
export async function switchWorkspace(workspaceId: number): Promise<void> {
    if (niriWorkspaceManager) {
        await niriWorkspaceManager.switchWorkspace(workspaceId)
    } else {
        console.warn("Niri workspace manager not initialized")
        // Fallback to direct call
        await switchToWorkspace(workspaceId)
    }
}
