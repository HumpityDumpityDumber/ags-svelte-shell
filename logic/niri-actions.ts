import { subprocess } from "astal"

/**
 * Switch to a specific workspace using Niri IPC
 */
export async function switchToWorkspace(workspaceId: number): Promise<void> {
    try {
        console.log(`Switching to workspace ID: ${workspaceId}`)
        
        // Use Niri IPC to switch workspaces
        const result = await new Promise<void>((resolve, reject) => {
            subprocess(
                ["niri", "msg", "action", "focus-workspace", workspaceId.toString()],
                (stdout) => {
                    console.log(`Workspace switch success: ${stdout}`)
                    resolve()
                },
                (stderr) => {
                    console.error(`Workspace switch error: ${stderr}`)
                    reject(new Error(stderr))
                }
            )
        })
        
        console.log(`Successfully switched to workspace ${workspaceId}`)
    } catch (error) {
        console.error(`Failed to switch to workspace ${workspaceId}:`, error)
    }
}

/**
 * Create a new workspace using Niri IPC
 */
export async function createWorkspace(): Promise<void> {
    try {
        console.log("Creating new workspace")
        
        const result = await new Promise<void>((resolve, reject) => {
            subprocess(
                ["niri", "msg", "action", "spawn-workspace"],
                (stdout) => {
                    console.log(`Workspace creation success: ${stdout}`)
                    resolve()
                },
                (stderr) => {
                    console.error(`Workspace creation error: ${stderr}`)
                    reject(new Error(stderr))
                }
            )
        })
        
        console.log("Successfully created new workspace")
    } catch (error) {
        console.error("Failed to create workspace:", error)
    }
}
