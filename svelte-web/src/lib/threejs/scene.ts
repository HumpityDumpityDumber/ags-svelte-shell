import * as THREE from 'three';

export interface SceneConfig {
  fov: number;
  aspect: number;
  near: number;
  far: number;
  width: number;
  height: number;
}

export interface LightConfig {
  ambientIntensity: number;
  directionalIntensity: number;
  directionalPosition: THREE.Vector3;
  pointLightIntensity: number;
  pointLightDistance: number;
}

export class ThreeScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private animationId: number | null = null;
  private animationCallbacks: Array<(time: number) => void> = [];

  constructor(container: HTMLElement, config: Partial<SceneConfig> = {}) {
    const defaultConfig: SceneConfig = {
      fov: 20,
      aspect: window.innerWidth / 35,
      near: 0.1,
      far: 1000,
      width: window.innerWidth,
      height: 35,
      ...config
    };

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      defaultConfig.fov,
      defaultConfig.aspect,
      defaultConfig.near,
      defaultConfig.far
    );
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    
    this.setupRenderer(defaultConfig);
    this.setupLighting();
    
    container.appendChild(this.renderer.domElement);
    
    // Set default camera position
    this.camera.position.set(0, 0, 18);
    
    // Store camera reference for potential raycasting
    this.scene.userData.camera = this.camera;
  }

  private setupRenderer(config: SceneConfig): void {
    this.renderer.setSize(config.width, config.height);
    this.renderer.setClearColor(0x000000, 0.0); // Transparent background
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
  }

  private setupLighting(lightConfig: Partial<LightConfig> = {}): void {
    const config: LightConfig = {
      ambientIntensity: 0.6,
      directionalIntensity: 1.2,
      directionalPosition: new THREE.Vector3(5, 5, 5),
      pointLightIntensity: 0.8,
      pointLightDistance: 50,
      ...lightConfig
    };

    // Brighter ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, config.ambientIntensity);
    this.scene.add(ambientLight);
    
    // Main directional light (like sunlight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, config.directionalIntensity);
    directionalLight.position.copy(config.directionalPosition);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Additional point lights for more dynamic lighting
    const pointLight1 = new THREE.PointLight(0x4488ff, config.pointLightIntensity, config.pointLightDistance);
    pointLight1.position.set(-10, 5, 10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff8844, config.pointLightIntensity, config.pointLightDistance);
    pointLight2.position.set(10, 5, 10);
    this.scene.add(pointLight2);

    // Fill light from below to reduce harsh shadows
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(0, -1, 1);
    this.scene.add(fillLight);
  }

  public addAnimationCallback(callback: (time: number) => void): void {
    this.animationCallbacks.push(callback);
  }

  public removeAnimationCallback(callback: (time: number) => void): void {
    const index = this.animationCallbacks.indexOf(callback);
    if (index > -1) {
      this.animationCallbacks.splice(index, 1);
    }
  }

  public startAnimation(): void {
    if (this.animationId !== null) return;

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const time = Date.now() * 0.002;
      
      // Call all animation callbacks
      this.animationCallbacks.forEach(callback => callback(time));
      
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  public stopAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose(): void {
    this.stopAnimation();
    this.renderer.dispose();
    this.animationCallbacks.length = 0;
  }

  public addToScene(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  public removeFromScene(object: THREE.Object3D): void {
    this.scene.remove(object);
  }
}

export function createBasicMaterial(color: number = 0x8080ff): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.1,
    roughness: 0.2,
    clearcoat: 0.3,
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 0.95,
    emissive: 0x111111,
    envMapIntensity: 1.0
  });
}
