// Three.js Scene Initialization Module
class SceneManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.cubesRenderer = null;
    this.clockRenderer = null;
    this.init();
  }

  init() {
    // Set up scene, camera, renderer
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(20, window.innerWidth/35, 0.1, 1000); // Reduced FOV from 45 to 20 degrees
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    
    this.renderer.setSize(window.innerWidth, 35);
    this.renderer.setClearColor(0x000000, 0.0); // Transparent background
    document.body.appendChild(this.renderer.domElement);

    // Add lighting for PBR materials
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    // Initialize modules
    this.cubesRenderer = new CubesRenderer(this.scene);
    this.clockRenderer = new ClockRenderer('time');

    // Set camera position
    this.camera.position.z = 18; // Moved farther back from 8 to 18 to compensate for narrower FOV
    this.camera.position.y = 0;

    // Store camera reference in scene userData for raycasting
    this.scene.userData.camera = this.camera;

    // Start animation loop
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.cubesRenderer.animate();
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the scene when the page loads
let sceneManager;
window.addEventListener('DOMContentLoaded', () => {
  sceneManager = new SceneManager();
});

// Add a global function to refresh the scene (called from Astal)
window.refreshScene = function() {
  console.log("Scene refresh requested");
  
  // If the scene has already been initialized, just refresh the cubes
  if (sceneManager && sceneManager.cubesRenderer) {
    // Re-initialize the cubes if needed
    sceneManager.scene.remove(sceneManager.cubesRenderer.cubes);
    sceneManager.cubesRenderer = new CubesRenderer(sceneManager.scene);
    console.log("Cubes refreshed successfully");
  } else {
    // Initialize the entire scene if not yet created
    console.log("Creating new scene manager");
    sceneManager = new SceneManager();
  }
};
