<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let audioValues: number[] = new Array(16).fill(0.1); // 16 points (8 cava bands repeated twice)
  let isActive = false;
  let mounted = false;
  let splinePath = '';
  let gradientStops: Array<{offset: string, color: string}> = [];
  let intensity = 0; // Overall audio intensity
  let peakValue = 0; // Current peak value
  let smoothedValues: number[] = new Array(16).fill(0.1); // Smoothed values for less jitter

  // Function to create dramatic curved spline from audio values
  function createSplinePath(values: number[], width: number, height: number): string {
    if (values.length === 0) return '';

    const points: Array<{x: number, y: number}> = [];
    const segmentWidth = width / (values.length - 1);

    // Create points from audio values with controlled deformation and clamping
    values.forEach((value, index) => {
      const x = index * segmentWidth;
      // Calculate y position with deformation
      const rawY = 25 + (value * (height - 25) * 1.0);
      // Clamp to ensure it doesn't exceed 58px (stay within bounds)
      const y = Math.min(rawY, 58);
      points.push({ x, y });
    });

    // Create smooth curve but with minimal control point influence
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      
      // Use quadratic curves with very short control points to maintain individual peaks
      const controlDistance = (curr.x - prev.x) * 0.2; // Short control distance
      const cp1x = prev.x + controlDistance;
      const cp1y = prev.y; // Keep control point at same height as previous point
      
      path += ` Q ${cp1x} ${cp1y} ${curr.x} ${curr.y}`;
    }

    return path;
  }

  // Function to create dynamic gradient based on audio activity
  function updateGradient(values: number[]) {
    const maxValue = Math.max(...values);
    const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // More dramatic color shifts based on audio
    const hueShift = maxValue * 120; // Wider hue range
    const saturation = 70 + (avgValue * 30); // Dynamic saturation
    const lightness = 45 + (intensity * 35); // Brightness based on overall intensity
    
    gradientStops = [
      { offset: '0%', color: `hsl(${180 + hueShift}, ${saturation}%, ${lightness}%)` },
      { offset: '25%', color: `hsl(${220 + hueShift * 0.8}, ${saturation + 10}%, ${lightness + 10}%)` },
      { offset: '50%', color: `hsl(${260 + hueShift * 0.6}, ${saturation + 5}%, ${lightness + 5}%)` },
      { offset: '75%', color: `hsl(${200 + hueShift * 1.2}, ${saturation + 15}%, ${lightness + 15}%)` },
      { offset: '100%', color: `hsl(${160 + hueShift * 1.4}, ${saturation + 20}%, ${lightness + 20}%)` }
    ];
  }

  // Function to handle audio updates from Astal
  function handleAudioUpdate(values: number[]) {
    // Calculate intensity metrics
    const currentPeak = Math.max(...values);
    const currentAvg = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Smooth the peak and intensity for less jarring transitions
    peakValue = peakValue * 0.7 + currentPeak * 0.3;
    intensity = intensity * 0.8 + currentAvg * 0.2;
    
    // Use cava values in repeating pattern: 1,2,3,4,5,6,7,8,1,2,3,4,5,6,7,8
    if (values.length === 8) {
      // Create 16 points by repeating the 8 cava bands twice
      audioValues = [];
      for (let cycle = 0; cycle < 2; cycle++) {
        for (let i = 0; i < 8; i++) {
          audioValues.push(values[i]);
        }
      }
    } else {
      // Fallback: if not 8 values, pad or truncate to exactly 16
      audioValues = new Array(16).fill(0);
      for (let i = 0; i < Math.min(16, values.length); i++) {
        audioValues[i] = values[i % values.length];
      }
    }
    
    // Apply almost no smoothing for maximum responsiveness
    for (let i = 0; i < audioValues.length; i++) {
      smoothedValues[i] = smoothedValues[i] * 0.05 + audioValues[i] * 0.95; // Almost direct response
    }
    
    // Enhanced activity detection with multiple thresholds
    isActive = values.some(v => v > 0.08) || intensity > 0.05 || peakValue > 0.15;
    
    const screenWidth = window.innerWidth || 800;
    splinePath = createSplinePath(smoothedValues, screenWidth, 60);
    updateGradient(smoothedValues);
  }

  onMount(() => {
    mounted = true;
    console.log('AudioVisualizer component mounted');
    
    // Initialize the spline path with screen width
    splinePath = createSplinePath(smoothedValues, window.innerWidth || 800, 60);
    updateGradient(smoothedValues);
    
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

<div class="audio-visualizer" class:active={isActive} class:mounted={mounted} class:intense={intensity > 0.3} class:peak={peakValue > 0.7}>
  <svg width="100%" height="60" viewBox="0 0 {window.innerWidth || 800} 60" class="spline-container" preserveAspectRatio="none">
    <defs>
      <linearGradient id="splineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        {#each gradientStops as stop}
          <stop offset={stop.offset} style="stop-color:{stop.color};stop-opacity:{0.6 + intensity * 0.4}" />
        {/each}
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="{1 + intensity * 2}" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="intenseglow">
        <feGaussianBlur stdDeviation="{2 + peakValue * 4}" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    <!-- Main spline line -->
    {#if splinePath}
      <path 
        d="{splinePath}" 
        fill="none" 
        stroke="url(#splineGradient)" 
        stroke-width="{1.5 + intensity * 2 + peakValue * 1.5}" 
        filter="{peakValue > 0.5 ? 'url(#intenseglow)' : 'url(#glow)'}"
        class="spline-line"
      />
    {/if}
  </svg>
</div>

<style>
  .audio-visualizer {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.3s ease;
    opacity: 0.7;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .audio-visualizer.mounted {
    opacity: 0.8;
  }

  .audio-visualizer.active {
    opacity: 1;
  }

  .audio-visualizer.intense {
    opacity: 1;
    filter: brightness(1.2);
  }

  .audio-visualizer.peak {
    opacity: 1;
    filter: brightness(1.4) saturate(1.3);
    animation: pulse 0.1s ease-in-out;
  }

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.01); }
    100% { transform: scale(1); }
  }

  .spline-container {
    width: 100%;
    height: 100%;
    overflow: visible;
    filter: drop-shadow(0 0 4px rgba(74, 158, 255, 0.1));
  }

  .spline-line {
    transition: stroke-width 0.2s ease;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .audio-visualizer.active .spline-line {
    stroke-width: 2;
  }

  @media (prefers-reduced-motion: reduce) {
    .audio-visualizer {
      transition: opacity 0.3s ease;
    }
  }
</style>
