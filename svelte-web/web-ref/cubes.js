// Three.js Cubes Module
class CubesRenderer {
  constructor(scene) {
    this.scene = scene;
    this.cubes = new THREE.Group();
    this.cubeArray = [];
    this.shaderMaterial = this.createShaderMaterial();
    
    // Audio visualization properties
    this.audioValues = new Array(8).fill(0); // Initialize with 8 zeros
    this.smoothedValues = new Array(8).fill(0); // For smooth transitions
    this.basePositions = []; // Store original positions for collision avoidance
    
    this.init();
    this.setupAudioReceiver();
  }

  createShaderMaterial() {
    // Use Three.js built-in PBR material for better lighting and modern look
    return new THREE.MeshPhysicalMaterial({
      color: 0x8080ff,
      metalness: 0.0,
      roughness: 0.3,
      clearcoat: 0.2,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.9,
      emissive: 0x222222, // Add some emissive glow for visibility
      envMapIntensity: 1.0
    });
  }

  createRoundedCubeGeometry(width, height, depth, radius, smoothness = 8) {
    // Advanced rounded cube with proper beveling on all edges
    const shape = new THREE.Shape();
    const eps = 0.00001;
    const r = radius - eps;
    
    // Create rounded rectangle using arcs for smooth corners
    shape.absarc(eps, eps, eps, -Math.PI / 2, -Math.PI, true);
    shape.absarc(eps, height - radius * 2, eps, Math.PI, Math.PI / 2, true);
    shape.absarc(width - radius * 2, height - radius * 2, eps, Math.PI / 2, 0, true);
    shape.absarc(width - radius * 2, eps, eps, 0, -Math.PI / 2, true);
    
    // Extrude with proper beveling on all edges
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
    geometry.center(); // Center the geometry
    
    return geometry;
  }

  init() {
    // Create animated 3D cubes with properly rounded edges using ExtrudeGeometry
    for (let i = 0; i < 8; i++) {
      // Create rounded cube geometry with more pronounced beveling
      const geometry = this.createRoundedCubeGeometry(2, 2, 2, 0.3); // Bigger cubes to compensate for shorter bar
      
      // Use built-in material with different colors
      const material = this.shaderMaterial.clone();
      material.color = new THREE.Color().setHSL(i * 0.125, 0.8, 0.6);
      
      const cube = new THREE.Mesh(geometry, material);
      
      // Position cubes in a line across the screen
      cube.position.x = (i - 3.5) * 4; // Increased spacing from 2 to 3
      cube.position.y = 0;
      cube.position.z = 0;
      
      // Store original position for collision avoidance
      this.basePositions.push({
        x: cube.position.x,
        y: cube.position.y,
        z: cube.position.z
      });
      
      // Store reference for individual animation
      this.cubeArray.push(cube);
      this.cubes.add(cube);
    }
    this.scene.add(this.cubes);
  }

  setupAudioReceiver() {
    // Create global function to receive audio data from Astal Cava
    window.updateAudioFromAstal = (audioValues) => {
      if (audioValues && audioValues.length === 8) {
        this.audioValues = audioValues;
      }
    };
    
    // Confirm initialization in browser console for debugging
    console.log("Audio data receiver initialized for", this.cubeArray.length, "cubes");
    
    // Send a ready signal back to Astal to confirm WebView is ready
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ready) {
      window.webkit.messageHandlers.ready.postMessage("CubesRenderer initialized");
    }
  }

  animate() {
    const time = Date.now() * 0.002; // Doubled the time multiplier for faster animation
    
    // Make audio response more snappy - increased smoothing speed
    for (let i = 0; i < this.smoothedValues.length; i++) {
      this.smoothedValues[i] += (this.audioValues[i] - this.smoothedValues[i]) * 0.5; // Increased from 0.25 for even snappier response
    }
    
    // Simplified audio-reactive animations without complex collision avoidance
    this.cubeArray.forEach((cube, i) => {
      const offset = i * 0.5;
      const audioValue = this.smoothedValues[i] || 0;
      
      // Scale cubes based on audio values (1.0 to 2.0 range - reduced to prevent overlap issues)
      const audioScale = 1.0 + (audioValue * 1.0);
      const pulseScale = 1.0 + Math.sin(time * 2.4 + offset) * 0.1;
      const finalScale = audioScale * pulseScale;
      cube.scale.set(finalScale, finalScale, finalScale);
      
      // Keep cubes at their original positions - no collision avoidance movement
      cube.position.x = this.basePositions[i].x;
      cube.position.y = this.basePositions[i].y;
      cube.position.z = this.basePositions[i].z;
      
      // Constant rotation speed (no audio influence)
      cube.rotation.x = Math.sin(time * 1.4 + offset) * 0.4;
      cube.rotation.y = time * 0.6 + offset;
      cube.rotation.z = Math.cos(time * 1.0 + offset) * 0.2;
      
      // Keep original colors without audio influence
      const baseHue = i * 0.125;
      cube.material.color.setHSL(baseHue, 0.8, 0.6);
      
      // Remove emissive glow
      cube.material.emissive.setHSL(0, 0, 0);
    });
  }
}
