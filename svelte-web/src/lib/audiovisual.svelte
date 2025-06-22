<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let audioValues: number[] = new Array(15).fill(0.1); // 15 points for mirrored pattern
  let isActive = false;
  let mounted = false;
  let splinePath = '';
  let gradientStops: Array<{offset: string, color: string}> = [];
  let intensity = 0; // Overall audio intensity
  let peakValue = 0; // Current peak value
  let smoothedValues: number[] = new Array(15).fill(0.1); // Smoothed values for less jitter
  let animationTime = 0; // Time for idle wave animation
  let animationFrameId: number | null = null; // Animation frame ID for cleanup

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

  // Function to create idle wave animation
  function createIdleWave(time: number, width: number, height: number): number[] {
    const waveValues: number[] = [];
    const frequency = 0.002; // Wave frequency
    const amplitude = 0.15; // Wave amplitude (subtle)
    const baseHeight = 0.1; // Base height when idle
    
    for (let i = 0; i < 15; i++) {
      const x = (i / 14) * width; // Normalize position across width
      const wave = Math.sin(time * frequency + x * 0.01) * amplitude + baseHeight;
      waveValues.push(Math.max(0.05, wave)); // Ensure minimum height
    }
    
    return waveValues;
  }

  // Function to animate idle state
  function animateIdleWave() {
    if (!mounted) return;
    
    animationTime += 16; // Increment by ~16ms for 60fps
    
    if (!isActive) {
      // Create idle wave when not receiving audio data
      const idleValues = createIdleWave(animationTime, window.innerWidth || 800, 60);
      const screenWidth = window.innerWidth || 800;
      splinePath = createSplinePath(idleValues, screenWidth, 60);
      updateGradient(idleValues);
    }
    
    animationFrameId = requestAnimationFrame(animateIdleWave);
  }
  function updateGradient(values: number[]) {
    const maxValue = Math.max(...values);
    const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    if (!isActive) {
      // Subtle, calming colors for idle state
      const timeBasedHue = (animationTime * 0.05) % 360; // Slowly cycling hue
      gradientStops = [
        { offset: '0%', color: `hsl(${timeBasedHue}, 40%, 35%)` },
        { offset: '25%', color: `hsl(${timeBasedHue + 30}, 45%, 40%)` },
        { offset: '50%', color: `hsl(${timeBasedHue + 60}, 50%, 45%)` },
        { offset: '75%', color: `hsl(${timeBasedHue + 30}, 45%, 40%)` },
        { offset: '100%', color: `hsl(${timeBasedHue}, 40%, 35%)` }
      ];
    } else {
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
  }

  // Function to handle audio updates from Astal
  function handleAudioUpdate(values: number[]) {
    // Calculate intensity metrics
    const currentPeak = Math.max(...values);
    const currentAvg = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Smooth the peak and intensity for less jarring transitions
    peakValue = peakValue * 0.7 + currentPeak * 0.3;
    intensity = intensity * 0.8 + currentAvg * 0.2;
    
    // Create mirrored pattern: 8,7,6,5,4,3,2,1,2,3,4,5,6,7,8
    if (values.length === 8) {
      audioValues = [
        values[7], // Band 8
        values[6], // Band 7
        values[5], // Band 6
        values[4], // Band 5
        values[3], // Band 4
        values[2], // Band 3
        values[1], // Band 2
        values[0], // Band 1
        values[1], // Band 2
        values[2], // Band 3
        values[3], // Band 4
        values[4], // Band 5
        values[5], // Band 6
        values[6], // Band 7
        values[7]  // Band 8
      ];
      
      // Debug: Log the mirrored pattern occasionally for verification
      if (Math.random() < 0.01) { // Log ~1% of the time to avoid spam
        console.log('Mirrored cava pattern:', [
          `8(${values[7].toFixed(2)})`,
          `7(${values[6].toFixed(2)})`, 
          `6(${values[5].toFixed(2)})`,
          `5(${values[4].toFixed(2)})`,
          `4(${values[3].toFixed(2)})`,
          `3(${values[2].toFixed(2)})`,
          `2(${values[1].toFixed(2)})`,
          `1(${values[0].toFixed(2)})`,
          `2(${values[1].toFixed(2)})`,
          `3(${values[2].toFixed(2)})`,
          `4(${values[3].toFixed(2)})`,
          `5(${values[4].toFixed(2)})`,
          `6(${values[5].toFixed(2)})`,
          `7(${values[6].toFixed(2)})`,
          `8(${values[7].toFixed(2)})`
        ].join(' '));
      }
      
      // Debug: Log the mirrored pattern for verification
      console.log('Mirrored cava pattern:', [
        `8(${values[7].toFixed(2)})`,
        `7(${values[6].toFixed(2)})`, 
        `6(${values[5].toFixed(2)})`,
        `5(${values[4].toFixed(2)})`,
        `4(${values[3].toFixed(2)})`,
        `3(${values[2].toFixed(2)})`,
        `2(${values[1].toFixed(2)})`,
        `1(${values[0].toFixed(2)})`,
        `2(${values[1].toFixed(2)})`,
        `3(${values[2].toFixed(2)})`,
        `4(${values[3].toFixed(2)})`,
        `5(${values[4].toFixed(2)})`,
        `6(${values[5].toFixed(2)})`,
        `7(${values[6].toFixed(2)})`,
        `8(${values[7].toFixed(2)})`
      ].join(' '));
    } else {
      // Fallback: if not 8 values, create mirrored pattern from available data
      const normalizedValues = new Array(8).fill(0);
      for (let i = 0; i < Math.min(8, values.length); i++) {
        normalizedValues[i] = values[i];
      }
      
      audioValues = [
        normalizedValues[7], // Band 8
        normalizedValues[6], // Band 7
        normalizedValues[5], // Band 6
        normalizedValues[4], // Band 5
        normalizedValues[3], // Band 4
        normalizedValues[2], // Band 3
        normalizedValues[1], // Band 2
        normalizedValues[0], // Band 1
        normalizedValues[1], // Band 2
        normalizedValues[2], // Band 3
        normalizedValues[3], // Band 4
        normalizedValues[4], // Band 5
        normalizedValues[5], // Band 6
        normalizedValues[6], // Band 7
        normalizedValues[7]  // Band 8
      ];
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
    
    // Start the idle wave animation
    animateIdleWave();
    
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
    // Clean up animation frame
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    
    // Clean up global handlers
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
    opacity: 0.6; /* Slightly more visible when idle */
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .audio-visualizer.mounted {
    opacity: 0.7; /* Slightly more visible when mounted */
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
    transition: stroke-width 0.2s ease, stroke 0.3s ease;
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
