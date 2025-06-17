<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let audioValues: number[] = new Array(8).fill(0.2); // Start with visible bars
  let isActive = false;
  let mounted = false;

  // Function to handle audio updates from Astal
  function handleAudioUpdate(values: number[]) {
    audioValues = [...values];
    isActive = values.some(v => v > 0.1); // Consider active if any bar > 10%
  }

  onMount(() => {
    mounted = true;
    console.log('AudioVisualizer component mounted');
    
    // Register the audio update handler
    if (typeof window !== 'undefined') {
      (window as any).updateAudioVisualization = handleAudioUpdate;
      console.log('Audio update handler registered');
      
      // Also register the main handler if it doesn't exist
      if (!(window as any).updateAudioFromAstal) {
        (window as any).updateAudioFromAstal = function(values: number[]) {
          handleAudioUpdate(values);
        };
      }
    }
  });

  onDestroy(() => {
    // Clean up
    if (typeof window !== 'undefined') {
      (window as any).updateAudioVisualization = null;
      console.log('Audio visualizer component destroyed');
    }
  });
</script>

<div class="audio-visualizer" class:active={isActive} class:mounted={mounted}>
  {#each audioValues as value, index}
    <div 
      class="audio-bar" 
      style="height: {Math.max(10, value * 80)}%; opacity: {value > 0.05 ? 0.8 + (value * 0.2) : 0.5}"
    ></div>
  {/each}
</div>

<style>
  .audio-visualizer {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    height: 25px;
    gap: 3px;
    padding: 0 10px;
    transition: opacity 0.3s ease;
    opacity: 0.8;
    min-width: 80px;
  }

  .audio-visualizer.mounted {
    opacity: 1;
  }

  .audio-visualizer.active {
    opacity: 1;
  }

  .audio-bar {
    width: 4px;
    background: linear-gradient(to top, #4a9eff, #00d4ff);
    border-radius: 2px;
    min-height: 10%;
    transition: height 0.1s ease-out, opacity 0.1s ease-out;
    box-shadow: 0 0 4px rgba(74, 158, 255, 0.3);
  }

  .audio-bar:nth-child(even) {
    background: linear-gradient(to top, #ff6b6b, #ff9999);
    box-shadow: 0 0 4px rgba(255, 107, 107, 0.3);
  }

  .audio-bar:nth-child(3n) {
    background: linear-gradient(to top, #4ecdc4, #44a08d);
    box-shadow: 0 0 4px rgba(78, 205, 196, 0.3);
  }
</style>
