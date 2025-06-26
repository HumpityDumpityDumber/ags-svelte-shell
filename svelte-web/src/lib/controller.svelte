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
  let controllerType: 'gamepad' | 'joystick' | 'other' = 'gamepad'
  let controllerName = ''

  // Calculate derived state
  $: {
    const connectedControllers = controllers.filter(c => c.is_connected)
    isConnected = connectedControllers.length > 0
    
    if (connectedControllers.length > 0) {
      const primary = connectedControllers[0]
      controllerType = primary.type
      controllerName = primary.name
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
    class:gamepad={controllerType === 'gamepad'}
    class:joystick={controllerType === 'joystick'}
    title="{controllerName} connected"
  >
    <!-- Gamepad icon -->
    {#if controllerType === 'gamepad'}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 6C5.34315 6 4 7.34315 4 9V15C4 16.6569 5.34315 18 7 18H8.5C9.32843 18 10 17.3284 10 16.5V12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12V16.5C14 17.3284 14.6716 18 15.5 18H17C18.6569 18 20 16.6569 20 15V9C20 7.34315 18.6569 6 17 6H7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- D-pad -->
        <circle cx="8" cy="12" r="1" fill="currentColor"/>
        <circle cx="8" cy="10" r="0.5" fill="currentColor"/>
        <circle cx="8" cy="14" r="0.5" fill="currentColor"/>
        <circle cx="6" cy="12" r="0.5" fill="currentColor"/>
        <circle cx="10" cy="12" r="0.5" fill="currentColor"/>
        <!-- Action buttons -->
        <circle cx="16" cy="10" r="0.8" fill="currentColor"/>
        <circle cx="18" cy="12" r="0.8" fill="currentColor"/>
        <circle cx="16" cy="14" r="0.8" fill="currentColor"/>
        <circle cx="14" cy="12" r="0.8" fill="currentColor"/>
      </svg>
    {:else if controllerType === 'joystick'}
      <!-- Joystick icon -->
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="9" y="14" width="6" height="8" rx="3" stroke="currentColor" stroke-width="2"/>
        <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/>
        <circle cx="12" cy="8" r="2" fill="currentColor"/>
        <line x1="12" y1="12" x2="12" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    {:else}
      <!-- Generic controller icon -->
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="8" width="16" height="8" rx="4" stroke="currentColor" stroke-width="2"/>
        <circle cx="8" cy="12" r="1.5" fill="currentColor"/>
        <circle cx="16" cy="12" r="1.5" fill="currentColor"/>
      </svg>
    {/if}
    
    <!-- Connection indicator dot -->
    <div class="connection-dot"></div>
  </div>
{/if}

<style>
  .controller-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 4px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.3s ease;
    cursor: pointer;
    color: #ffffff;
  }

  .controller-indicator:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
    transform: scale(1.05);
  }

  .controller-indicator.gamepad {
    color: #4ade80; /* Green for gamepads */
  }

  .controller-indicator.joystick {
    color: #60a5fa; /* Blue for joysticks */
  }

  .connection-dot {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 4px #10b981;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 4px #10b981;
    }
    50% {
      box-shadow: 0 0 8px #10b981, 0 0 12px #10b981;
    }
    100% {
      box-shadow: 0 0 4px #10b981;
    }
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .controller-indicator {
      padding: 3px;
    }
    
    .connection-dot {
      width: 4px;
      height: 4px;
    }
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
