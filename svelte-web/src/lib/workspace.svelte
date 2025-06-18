<script lang="ts">
  import { onMount, onDestroy } from 'svelte'

  interface NiriWorkspace {
    id: number
    idx: number
    name?: string
    output?: string
    is_focused: boolean
    is_active: boolean
  }

  interface WorkspaceData {
    workspaces: NiriWorkspace[]
    current: number
    monitor?: string
  }

  let workspaces: NiriWorkspace[] = []
  let currentWorkspace: number = 0
  let monitorName: string = ""

  function updateWorkspaces(data: WorkspaceData) {
    workspaces = data.workspaces || []
    currentWorkspace = data.current || 0
    monitorName = data.monitor || ""
  }

  onMount(() => {
    // Make function globally available for injection from Astal
    ;(window as any).updateWorkspaces = updateWorkspaces

    // Also register with monitor-specific name if available
    const urlParams = new URLSearchParams(window.location.search)
    const monitor = urlParams.get('monitor')
    if (monitor) {
      const functionName = `updateWorkspaces_${monitor.replace(/[^a-zA-Z0-9]/g, '_')}`
      ;(window as any)[functionName] = updateWorkspaces
      console.log(`Registered workspace update function: ${functionName}`)
    }

    // Check if initial data was already injected
    if ((window as any).niriWorkspaceData) {
      updateWorkspaces((window as any).niriWorkspaceData)
    }
  })

  onDestroy(() => {
    delete (window as any).updateWorkspaces
  })
</script>

<div class="workspace-indicator">
  {#each workspaces as workspace (workspace.id)}
    <div 
      class="workspace-dot"
      class:active={workspace.is_focused}
      class:occupied={workspace.is_active}
      title="Workspace {workspace.idx}{monitorName ? ` on ${monitorName}` : ''}"
    >
      <span class="workspace-number">{workspace.idx}</span>
    </div>
  {/each}
</div>

<style>
  .workspace-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .workspace-dot {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 11px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.6);
  }

  .workspace-dot:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }

  .workspace-dot.occupied {
    background: rgba(100, 181, 246, 0.3);
    border-color: rgba(100, 181, 246, 0.5);
    color: rgba(255, 255, 255, 0.8);
  }

  .workspace-dot.active {
    background: rgba(100, 181, 246, 0.8);
    border-color: rgb(100, 181, 246);
    color: white;
    box-shadow: 0 0 8px rgba(100, 181, 246, 0.4);
  }

  .workspace-number {
    font-family: 'SF Pro Display', 'Inter', sans-serif;
  }
</style>
