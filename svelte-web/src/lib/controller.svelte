<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  
  // Type definitions for controller data
  interface ControllerInfo {
    name: string
    vendor_id: string
    product_id: string
    device_path: string
    is_connected: boolean
    type: 'gamepad' | 'joystick' | 'other'
  }

  // Reactive controller state
  let controllers: ControllerInfo[] = []
  let isConnected = false
  let controllerName = ''

  // Calculate derived state
  $: {
    const connectedControllers = controllers.filter(c => c.is_connected)
    isConnected = connectedControllers.length > 0
    
    if (connectedControllers.length > 0) {
      controllerName = connectedControllers[0].name
    } else {
      controllerName = ''
    }
  }

  onMount(() => {
    console.log('Controller component mounted')

    // Register global function for receiving controller updates from Astal
    window.updateControllersFromAstal = (newControllers: ControllerInfo[]) => {
      console.log('Received controller update:', newControllers)
      controllers = newControllers
    }
  })

  onDestroy(() => {
    // Cleanup global function
    if (window.updateControllersFromAstal) {
      delete window.updateControllersFromAstal
    }
  })
</script>

<!-- Controller indicator -->
{#if isConnected}
  <div 
    class="controller-indicator"
    title="{controllerName} connected"
  >
    <!-- Generic controller icon -->
  <img src="../public/controller-svgrepo-com.svg" alt="Controller" width="20" height="20" />
  </div>
{/if}

<style>
  .controller-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 4px;
    background: transparent;
    transition: all 0.3s ease;
    cursor: pointer;
    color: #ffffff;
  }
</style>

<!-- Global declarations for TypeScript -->
<script lang="ts" context="module">
  // Type definitions for controller data (global scope)
  interface ControllerInfo {
    name: string
    vendor_id: string
    product_id: string
    device_path: string
    is_connected: boolean
    type: 'gamepad' | 'joystick' | 'other'
  }

  declare global {
    interface Window {
      updateControllersFromAstal?: (controllers: ControllerInfo[]) => void
    }
  }
</script>
