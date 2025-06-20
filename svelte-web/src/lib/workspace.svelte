<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  
  // Type definitions for workspace data
  interface NiriWorkspace {
    id: number
    idx: number
    output: string
    is_active: boolean
    is_focused: boolean
    active_window_id?: number
  }

  // Reactive workspace state
  let workspaces: NiriWorkspace[] = []
  let currentMonitor = 'unknown'

  // Get monitor ID from URL parameters
  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search)
    currentMonitor = urlParams.get('monitor') || 'unknown'
    console.log('Workspace component mounted for monitor:', currentMonitor)

    // Register global function for receiving workspace updates from Astal
    window.updateWorkspacesFromAstal = (newWorkspaces: NiriWorkspace[]) => {
      console.log('Received workspace update:', newWorkspaces)
      workspaces = newWorkspaces
    }
  })

  onDestroy(() => {
    // Cleanup global function
    if (window.updateWorkspacesFromAstal) {
      delete window.updateWorkspacesFromAstal
    }
  })

  // Handle workspace click (switch to workspace)
  async function switchToWorkspace(workspaceId: number) {
    console.log('Switching to workspace:', workspaceId)
    
    try {
      // Use the injected function if available
      if (window.switchNiriWorkspace) {
        await window.switchNiriWorkspace(workspaceId)
      } else {
        console.warn('Workspace switching function not available')
      }
    } catch (error) {
      console.error('Failed to switch workspace:', error)
    }
  }
</script>

<!-- Workspace indicator container -->
<div class="workspace-container">
  {#each workspaces as workspace (workspace.id)}
    <div 
      class="workspace-indicator"
      class:active={workspace.is_active}
      class:focused={workspace.is_focused}
      on:click={() => switchToWorkspace(workspace.id)}
      on:keydown={(e) => e.key === 'Enter' && switchToWorkspace(workspace.id)}
      role="button"
      tabindex="0"
      title="Workspace {workspace.idx}"
    >
      <span class="workspace-number">{workspace.idx}</span>
    </div>
  {/each}
</div>

<style>
  .workspace-container {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
  }

  .workspace-indicator {
    min-width: 24px;
    height: 24px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  }

  .workspace-indicator:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
    transform: scale(1.05);
  }

  .workspace-indicator.active {
    background: rgba(74, 144, 226, 0.6);
    border-color: rgba(74, 144, 226, 0.8);
    box-shadow: 0 0 8px rgba(74, 144, 226, 0.4);
  }

  .workspace-indicator.focused {
    background: rgba(129, 199, 132, 0.6);
    border-color: rgba(129, 199, 132, 0.8);
    box-shadow: 0 0 8px rgba(129, 199, 132, 0.4);
  }

  .workspace-number {
    font-size: 12px;
    font-weight: 600;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  /* Focus styles for accessibility */
  .workspace-indicator:focus {
    outline: 2px solid rgba(255, 255, 255, 0.6);
    outline-offset: 2px;
  }

  /* Responsive adjustments for smaller screens */
  @media (max-width: 768px) {
    .workspace-container {
      gap: 2px;
      padding: 0 4px;
    }

    .workspace-indicator {
      min-width: 20px;
      height: 20px;
    }

    .workspace-number {
      font-size: 10px;
    }
  }
</style>

<!-- Global declarations for TypeScript -->
<script lang="ts" context="module">
  // Type definitions for workspace data (global scope)
  interface NiriWorkspace {
    id: number
    idx: number
    output: string
    is_active: boolean
    is_focused: boolean
    active_window_id?: number
  }

  declare global {
    interface Window {
      updateWorkspacesFromAstal?: (workspaces: NiriWorkspace[]) => void
      switchNiriWorkspace?: (workspaceId: number) => Promise<void>
    }
  }
</script>
