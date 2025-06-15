<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { ThreeScene, createBasicMaterial } from './scene';

  let container: HTMLDivElement;
  let threeScene: ThreeScene;
  let cubes: THREE.Group;
  let cubeArray: THREE.Mesh[] = [];
  let basePositions: Array<{ x: number; y: number; z: number }> = [];

  function createRoundedCubeGeometry(
    width: number, 
    height: number, 
    depth: number, 
    radius: number, 
    smoothness: number = 8
  ): THREE.ExtrudeGeometry {
    const shape = new THREE.Shape();
    const eps = 0.00001;
    const r = radius - eps;
    
    // Create rounded rectangle using arcs for smooth corners
    shape.absarc(eps, eps, eps, -Math.PI / 2, -Math.PI, true);
    shape.absarc(eps, height - radius * 2, eps, Math.PI, Math.PI / 2, true);
    shape.absarc(width - radius * 2, height - radius * 2, eps, Math.PI / 2, 0, true);
    shape.absarc(width - radius * 2, eps, eps, 0, -Math.PI / 2, true);
    
    const extrudeSettings = {
      depth: depth - radius * 2,
      bevelEnabled: true,
      bevelSegments: smoothness * 2,
      steps: 1,
      bevelSize: r,
      bevelThickness: radius,
      curveSegments: smoothness
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();
    
    return geometry;
  }

  function createCubes(): void {
    cubes = new THREE.Group();
    
    for (let i = 0; i < 8; i++) {
      const geometry = createRoundedCubeGeometry(2, 2, 2, 0.3);
      const material = createBasicMaterial();
      material.color = new THREE.Color().setHSL(i * 0.125, 0.8, 0.6);
      
      const cube = new THREE.Mesh(geometry, material);
      
      // Position cubes in a line across the screen
      cube.position.x = (i - 3.5) * 4;
      cube.position.y = 0;
      cube.position.z = 0;
      
      // Store original position
      basePositions.push({
        x: cube.position.x,
        y: cube.position.y,
        z: cube.position.z
      });
      
      cubeArray.push(cube);
      cubes.add(cube);
    }
    
    threeScene.addToScene(cubes);
  }

  function animateCubes(time: number): void {
    cubeArray.forEach((cube, i) => {
      const offset = i * 0.5;
      
      // Simple pulse scale animation
      const pulseScale = 1.0 + Math.sin(time * 2.4 + offset) * 0.1;
      cube.scale.set(pulseScale, pulseScale, pulseScale);
      
      // Keep cubes at their original positions
      cube.position.x = basePositions[i].x;
      cube.position.y = basePositions[i].y;
      cube.position.z = basePositions[i].z;
      
      // Constant rotation
      cube.rotation.x = Math.sin(time * 1.4 + offset) * 0.4;
      cube.rotation.y = time * 0.6 + offset;
      cube.rotation.z = Math.cos(time * 1.0 + offset) * 0.2;
      
      // Keep original colors
      const baseHue = i * 0.125;
      (cube.material as THREE.MeshPhysicalMaterial).color.setHSL(baseHue, 0.8, 0.6);
      (cube.material as THREE.MeshPhysicalMaterial).emissive.setHSL(0, 0, 0);
    });
  }

  function handleResize(): void {
    if (threeScene) {
      threeScene.resize(window.innerWidth, 35);
    }
  }

  onMount(() => {
    threeScene = new ThreeScene(container);
    createCubes();
    threeScene.addAnimationCallback(animateCubes);
    threeScene.startAnimation();
    
    window.addEventListener('resize', handleResize);
  });

  onDestroy(() => {
    if (threeScene) {
      threeScene.removeAnimationCallback(animateCubes);
      
      // Clean up cubes
      cubeArray.forEach(cube => {
        cube.geometry.dispose();
        if (Array.isArray(cube.material)) {
          cube.material.forEach(material => material.dispose());
        } else {
          cube.material.dispose();
        }
      });
      
      threeScene.removeFromScene(cubes);
      threeScene.dispose();
    }
    
    window.removeEventListener('resize', handleResize);
  });
</script>

<div bind:this={container} class="cubes-container"></div>

<style>
  .cubes-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 35px;
    pointer-events: none;
    z-index: 1;
  }

  :global(.cubes-container canvas) {
    display: block;
  }
</style>
