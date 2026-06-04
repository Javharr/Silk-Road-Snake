
import React, { useRef, useEffect, useMemo, Suspense, useState, useImperativeHandle, forwardRef } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls, RoundedBox, Sphere, Cylinder, MeshDistortMaterial, Octahedron, Cone, Stars, Float, Sparkles, Dodecahedron, Icosahedron, shaderMaterial, Html, Torus } from '@react-three/drei';
import * as THREE from 'three';
import { Position, Theme, Obstacle, GameState, Direction, Skin, AbilityType, FloatingText, GameEvent, VisualEventType, WeatherType, Artifact, ArtifactType } from '../types';
import { GRID_SIZE, COLORS, MAGNET_RADIUS } from '../constants';
import { soundManager } from '../audio';

// Declare standard HTML elements to fix R3F type errors in some environments
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      instancedMesh: any;
      dodecahedronGeometry: any;
      meshBasicMaterial: any;
      planeGeometry: any;
      cylinderGeometry: any;
      meshStandardMaterial: any;
      coneGeometry: any;
      sphereGeometry: any;
      pointLight: any;
      color: any;
      gridHelper: any;
      ringGeometry: any;
      latheGeometry: any;
      torusGeometry: any;
      boxGeometry: any;
      octahedronGeometry: any;
      ambientLight: any;
      directionalLight: any;
      orthographicCamera: any;
      spotLight: any;
      icosahedronGeometry: any;
      
      // Standard HTML elements
      div: any;
      span: any;
      p: any;
      button: any;
      h1: any;
      h2: any;
      h3: any;
      a: any;
      ul: any;
      li: any;
      input: any;
      label: any;
      form: any;
      img: any;
      
      // Custom Shaders
      accretionDiskMaterial: any;
      glowMaterial: any;
    }
  }
}

// --- CUSTOM SHADERS FOR BLACK HOLE ---
const AccretionDiskMaterial = shaderMaterial(
  { uTime: 0, uColorInner: new THREE.Color('#ffaa00'), uColorOuter: new THREE.Color('#ff0000') },
  `
    varying vec2 vUv;
    varying vec3 vPos;
    void main() {
      vUv = uv;
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  `
    uniform float uTime;
    uniform vec3 uColorInner;
    uniform vec3 uColorOuter;
    varying vec2 vUv;
    varying vec3 vPos;

    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
               -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vec2 centered = vUv - 0.5;
      float r = length(centered) * 2.0; 
      float a = atan(centered.y, centered.x); 

      float speed = 2.0 / (r * r + 0.1); 
      float angleOffset = a + uTime * speed * 0.2;

      float noiseVal = snoise(vec2(r * 10.0, angleOffset * 3.0));
      noiseVal += snoise(vec2(r * 20.0 - uTime, angleOffset * 6.0)) * 0.5;

      vec3 color = mix(uColorOuter, uColorInner, 1.0 - r);
      color += vec3(1.0, 1.0, 0.8) * smoothstep(0.4, 0.8, noiseVal); 

      float alpha = smoothstep(0.0, 0.2, r) * smoothstep(1.0, 0.8, r);
      alpha *= smoothstep(0.25, 0.3, r);

      gl_FragColor = vec4(color, alpha);
    }
  `
);

const GlowMaterial = shaderMaterial(
  { uColor: new THREE.Color('#ff5722'), uIntensity: 1.0 },
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  `
    uniform vec3 uColor;
    uniform float uIntensity;
    varying vec2 vUv;
    void main() {
      vec2 centered = vUv - 0.5;
      float dist = length(centered) * 2.0;
      float glow = 1.0 - smoothstep(0.0, 1.0, dist);
      glow = pow(glow, 2.0); 
      gl_FragColor = vec4(uColor, glow * uIntensity);
    }
  `
);

extend({ AccretionDiskMaterial, GlowMaterial });

interface Game3DProps {
  snake: Position[];
  food: Position[]; // Modified to accept multiple food items (Feast)
  obstacles: Obstacle[];
  artifacts: Artifact[]; // New Prop
  theme: Theme;
  gameState: GameState;
  speed: number;
  direction: Direction;
  isGameOver: boolean;
  activeSkin: Skin;
  activeBackgroundId: string;
  isAbilityActive: boolean;
  isAbilityReady: boolean;
  floatingTexts: FloatingText[];
  gameEvents: GameEvent[];
  weather: WeatherType;
}

// Convert grid coordinates to 3D world position
const gridToWorld = (pos: Position) => {
  const offset = GRID_SIZE / 2 - 0.5;
  return new THREE.Vector3(pos.x - offset, 0, pos.y - offset);
};

// --- ARTIFACTS ---

const ArtifactMesh: React.FC<{ artifact: Artifact }> = ({ artifact }) => {
    const pos = useMemo(() => gridToWorld(artifact.position), [artifact.position]);
    const ref = useRef<THREE.Group>(null);
    
    useFrame((state) => {
        if (ref.current) {
            ref.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
            ref.current.rotation.y += 0.02;
        }
    });

    return (
        <group ref={ref} position={pos}>
            <pointLight intensity={1} distance={3} color={
                artifact.type === ArtifactType.HOURGLASS ? "#00bcd4" : 
                artifact.type === ArtifactType.DAGGER ? "#f44336" : "#ffd700"
            } />
            
            {artifact.type === ArtifactType.HOURGLASS && (
                <group>
                    {/* Sands of Time */}
                    <Cone args={[0.3, 0.4, 8]} position={[0, 0.2, 0]} rotation={[0, 0, 0]}>
                        <meshStandardMaterial color="#00bcd4" transparent opacity={0.8} />
                    </Cone>
                    <Cone args={[0.3, 0.4, 8]} position={[0, -0.2, 0]} rotation={[Math.PI, 0, 0]}>
                         <meshStandardMaterial color="#00bcd4" transparent opacity={0.8} />
                    </Cone>
                    <mesh>
                         <cylinderGeometry args={[0.32, 0.32, 0.05]} />
                         <meshStandardMaterial color="#b0bec5" />
                    </mesh>
                </group>
            )}

            {artifact.type === ArtifactType.DAGGER && (
                <group rotation={[0, 0, Math.PI/4]}>
                    {/* Curved Blade */}
                    <mesh position={[0, 0.2, 0]}>
                        <boxGeometry args={[0.1, 0.6, 0.05]} />
                        <meshStandardMaterial color="#cfd8dc" metalness={0.9} roughness={0.2} />
                    </mesh>
                    <mesh position={[0, -0.2, 0]}>
                        <cylinderGeometry args={[0.05, 0.08, 0.2]} />
                        <meshStandardMaterial color="#8d6e63" />
                    </mesh>
                    <mesh position={[0, -0.1, 0]}>
                        <boxGeometry args={[0.3, 0.05, 0.08]} />
                        <meshStandardMaterial color="#ffd700" />
                    </mesh>
                </group>
            )}

            {artifact.type === ArtifactType.LAMP && (
                <group>
                    {/* Magic Lamp */}
                    <mesh position={[0.1, -0.1, 0]} rotation={[0, 0, 0.2]}>
                        <sphereGeometry args={[0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI/1.5]} />
                        <meshStandardMaterial color="#ffd700" metalness={0.6} roughness={0.3} />
                    </mesh>
                    <mesh position={[-0.2, 0.1, 0]} rotation={[0, 0, -0.5]}>
                        <cylinderGeometry args={[0.05, 0.08, 0.4]} />
                        <meshStandardMaterial color="#ffd700" />
                    </mesh>
                    <mesh position={[0.3, 0.1, 0]}>
                         <Torus args={[0.1, 0.03, 8, 16]} />
                         <meshStandardMaterial color="#ffd700" />
                    </mesh>
                    <Sparkles count={10} scale={0.8} size={2} color="gold" />
                </group>
            )}
        </group>
    );
};

// --- WEATHER EFFECTS ---

const SandstormEffect = () => {
  const { scene } = useThree();
  const fogRef = useRef<THREE.FogExp2>(null);

  useEffect(() => {
    const fog = new THREE.FogExp2('#e65100', 0.02);
    scene.fog = fog;
    fogRef.current = fog;
    return () => { scene.fog = null; };
  }, [scene]);

  useFrame((state) => {
    if (fogRef.current) {
       const t = state.clock.elapsedTime;
       const wave = Math.sin(t * 0.5); 
       const density = 0.08 + (wave * 0.05); 
       const jitter = Math.sin(t * 5) * 0.005;
       fogRef.current.density = Math.max(0.02, density + jitter);
       const pulse = Math.sin(t * 2);
       const hue = 0.08 + (pulse * 0.01); 
       fogRef.current.color.setHSL(hue, 1, 0.5); 
    }
  });

  return (
     <group>
        <Sparkles count={2000} scale={[60, 10, 60]} size={12} speed={8} opacity={0.6} color="#ffcc80" position={[0, 2, 0]} noise={20} />
        <Sparkles count={500} scale={[80, 40, 80]} size={25} speed={5} opacity={0.4} color="#e65100" position={[0, 15, 0]} noise={10} />
     </group>
  );
}

const BlizzardEffect = () => {
    const { scene } = useThree();
    useEffect(() => {
        const fog = new THREE.FogExp2('#eceff1', 0.06); 
        scene.fog = fog;
        return () => { scene.fog = null; };
    }, [scene]);
    
    return <Sparkles count={2500} scale={[50, 30, 50]} size={8} speed={5} opacity={0.8} color="#ffffff" />;
}

const GaleForceEffect = () => {
     return <Sparkles count={800} scale={[50, 20, 50]} size={15} speed={12} opacity={0.8} color="#d84315" />;
}


// --- VISUAL FX COMPONENTS ---

const RiceExplosion: React.FC<{ position: Position }> = ({ position }) => {
  const count = 20;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    return new Array(count).fill(0).map(() => ({
       velocity: new THREE.Vector3(
           (Math.random() - 0.5) * 0.2, 
           Math.random() * 0.3, 
           (Math.random() - 0.5) * 0.2
       ),
       scale: 1,
       position: new THREE.Vector3(0,0,0) 
    }));
  }, []);

  const [active, setActive] = useState(true);

  useFrame((_, delta) => {
    if (!meshRef.current || !active) return;
    let visibleCount = 0;
    
    particles.forEach((p, i) => {
        if (p.scale > 0) {
            p.position.add(p.velocity);
            p.velocity.y -= delta * 0.5; 
            p.scale -= delta * 1.5; 
            if (p.scale < 0) p.scale = 0;
            else visibleCount++;

            dummy.position.copy(p.position);
            dummy.scale.setScalar(p.scale);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        }
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (visibleCount === 0) setActive(false);
  });
  
  if (!active) return null;

  const worldPos = gridToWorld(position);
  return (
    <group position={[worldPos.x, 0.5, worldPos.z]}>
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
           <boxGeometry args={[0.1, 0.1, 0.1]} />
           <meshStandardMaterial color="#fff3e0" />
        </instancedMesh>
    </group>
  );
};

const ParticleExplosion: React.FC<{ position: Position, color?: string }> = ({ position, color="#78909c" }) => {
    const count = 15;
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const particles = useMemo(() => {
      return new Array(count).fill(0).map(() => ({
         velocity: new THREE.Vector3(
             (Math.random() - 0.5) * 0.5, 
             Math.random() * 0.5, 
             (Math.random() - 0.5) * 0.5
         ),
         scale: 1 + Math.random(),
         position: new THREE.Vector3(0,0,0),
         rotation: new THREE.Vector3(Math.random(), Math.random(), Math.random())
      }));
    }, []);
  
    const [active, setActive] = useState(true);
  
    useFrame((_, delta) => {
      if (!meshRef.current || !active) return;
      let visibleCount = 0;
      
      particles.forEach((p, i) => {
          if (p.scale > 0) {
              p.position.add(p.velocity);
              p.rotation.addScalar(delta * 2);
              p.scale -= delta * 2.0; 
              if (p.scale < 0) p.scale = 0;
              else visibleCount++;
  
              dummy.position.copy(p.position);
              dummy.rotation.setFromVector3(p.rotation);
              dummy.scale.setScalar(p.scale * 0.15);
              dummy.updateMatrix();
              meshRef.current!.setMatrixAt(i, dummy.matrix);
          }
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (visibleCount === 0) setActive(false);
    });
    
    if (!active) return null;
  
    const worldPos = gridToWorld(position);
    return (
      <group position={[worldPos.x, 0.5, worldPos.z]}>
          <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
             <dodecahedronGeometry args={[1, 0]} />
             <meshStandardMaterial color={color} />
          </instancedMesh>
      </group>
    );
};

// --- ENVIRONMENT COMPONENTS ---
// (Omitting full SnowParticles/LeafParticles/Trees/BlackHole logic for brevity as they are unchanged)
// Assume existing environment components are here...

// Re-including necessary simple env components for context if needed, but for XML limit will reference existing structure.
// Assuming existing components: SnowParticles, LeafParticles, WinterTree, AutumnTree, TwinklingStars, BlackHole, Environment, Palov, GoldenSparkles, MagneticField, SnakeSegment, ObstacleMesh, FloatingTextOverlay, IsometricCamera

// ... [Environment Components Logic same as previous version] ...
// Copying the previously defined components to ensure file integrity
const SnowParticles = () => {
  const count = 800; 
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    return new Array(count).fill(0).map(() => ({
      x: (Math.random() - 0.5) * 40,
      y: Math.random() * 20,
      z: (Math.random() - 0.5) * 40,
      speed: 0.02 + Math.random() * 0.08,
      size: 0.05 + Math.random() * 0.1
    }));
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    particles.forEach((particle, i) => {
      particle.y -= particle.speed;
      if (particle.y < 0) particle.y = 20;
      dummy.position.set(particle.x, particle.y, particle.z);
      dummy.scale.setScalar(particle.size);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
    </instancedMesh>
  );
};

const LeafParticles = () => {
    const count = 150;
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const particles = useMemo(() => {
      return new Array(count).fill(0).map(() => ({
        x: (Math.random() - 0.5) * 40,
        y: Math.random() * 15,
        z: (Math.random() - 0.5) * 40,
        speed: 0.01 + Math.random() * 0.03,
        rotSpeed: (Math.random() - 0.5) * 0.1
      }));
    }, []);
  
    useFrame(() => {
      if (!meshRef.current) return;
      particles.forEach((p, i) => {
        p.y -= p.speed;
        if (p.y < 0) p.y = 15;
        p.x += Math.sin(p.y) * 0.01;
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.x += p.rotSpeed;
        dummy.rotation.y += p.rotSpeed;
        dummy.scale.setScalar(0.15);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    });
  
    return (
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#e65100" side={THREE.DoubleSide} />
      </instancedMesh>
    );
};

const WinterTree: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    return (
        <group position={position}>
            <mesh position={[0, 0.2, 0]}>
                <cylinderGeometry args={[0.1, 0.15, 0.4]} />
                <meshStandardMaterial color="#5d4037" />
            </mesh>
            <mesh position={[0, 0.6, 0]}>
                <coneGeometry args={[0.4, 0.8, 8]} />
                <meshStandardMaterial color="#1b5e20" />
            </mesh>
            <mesh position={[0, 1.0, 0]}>
                <coneGeometry args={[0.3, 0.7, 8]} />
                <meshStandardMaterial color="#2e7d32" />
            </mesh>
             <mesh position={[0, 1.4, 0]}>
                <coneGeometry args={[0.2, 0.6, 8]} />
                <meshStandardMaterial color="#388e3c" />
            </mesh>
            <mesh position={[0.2, 0.7, 0.1]}>
                <sphereGeometry args={[0.05]} />
                <meshStandardMaterial color="red" />
            </mesh>
             <mesh position={[-0.15, 1.1, 0.15]}>
                <sphereGeometry args={[0.05]} />
                <meshStandardMaterial color="gold" />
            </mesh>
        </group>
    );
}

const AutumnTree: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    return (
        <group position={position}>
            <mesh position={[0, 0.4, 0]}>
                <cylinderGeometry args={[0.1, 0.2, 0.8]} />
                <meshStandardMaterial color="#3e2723" />
            </mesh>
            <mesh position={[0, 1.2, 0]}>
                <dodecahedronGeometry args={[0.7, 0]} />
                <meshStandardMaterial color="#ff6f00" />
            </mesh>
            <mesh position={[0.4, 0.9, 0]}>
                <dodecahedronGeometry args={[0.4, 0]} />
                <meshStandardMaterial color="#f57c00" />
            </mesh>
            <mesh position={[-0.4, 1.0, 0.2]}>
                <dodecahedronGeometry args={[0.5, 0]} />
                <meshStandardMaterial color="#ff8f00" />
            </mesh>
        </group>
    );
}

const TwinklingStars = () => {
    const count = 1500; 
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    const particles = useMemo(() => {
        return new Array(count).fill(0).map(() => ({
            x: (Math.random() - 0.5) * 200,
            y: (Math.random() - 0.5) * 150, 
            z: -30 + (Math.random() * -60), 
            phase: Math.random() * Math.PI * 2,
            speed: 1 + Math.random() * 3, 
            baseScale: 0.3 + Math.random() * 0.6 
        }));
    }, []);

    useFrame((state) => {
        if (!meshRef.current) return;
        const t = state.clock.elapsedTime;
        
        particles.forEach((p, i) => {
            const blink = Math.sin(t * p.speed + p.phase);
            const scale = p.baseScale + (blink > 0.5 ? blink * 0.4 : 0); 
            
            dummy.position.set(p.x, p.y, p.z);
            dummy.scale.setScalar(scale);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <dodecahedronGeometry args={[0.6, 0]} />
            <meshBasicMaterial color="#e0e7ff" transparent opacity={0.9} />
        </instancedMesh>
    );
};

const BlackHole = () => {
    const materialRef = useRef<any>(null);
    const lensingRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        if (materialRef.current) {
            materialRef.current.uTime = state.clock.elapsedTime;
        }
        if (lensingRef.current) {
            lensingRef.current.rotation.z -= delta * 0.1;
        }
    });

    return (
        <group position={[0, 30, -60]} rotation={[0.4, 0, 0.2]} scale={[1.5, 1.5, 1.5]}>
            <mesh>
                <sphereGeometry args={[4, 64, 64]} />
                <meshBasicMaterial color="#000000" />
            </mesh>
            <mesh rotation={[Math.PI/2.5, 0, 0]}>
                <planeGeometry args={[24, 24, 64, 64]} />
                <accretionDiskMaterial 
                    ref={materialRef} 
                    transparent 
                    side={THREE.DoubleSide} 
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    uColorInner={new THREE.Color('#fff7e6')} 
                    uColorOuter={new THREE.Color('#ff5722')} 
                />
            </mesh>
            <mesh ref={lensingRef} rotation={[Math.PI/2.5 + Math.PI/2, 0, 0]}>
                <ringGeometry args={[4.2, 5.5, 64]} />
                <meshBasicMaterial 
                    color="#ff6d00" 
                    transparent 
                    opacity={0.4} 
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>
            <mesh position={[0, 0, -1]}>
                <planeGeometry args={[45, 45]} />
                <glowMaterial
                   uColor={new THREE.Color('#ff5722')}
                   uIntensity={0.6}
                   transparent
                   blending={THREE.AdditiveBlending}
                   depthWrite={false}
                />
            </mesh>
            <pointLight intensity={3} color="#ff6d00" distance={100} />
        </group>
    );
};

const Environment = ({ id, theme }: { id: string, theme: Theme }) => {
    const isDay = theme === Theme.DAY;
    const autumnTrees = useMemo(() => {
      return Array.from({length: 30}).map((_, i) => {
         const angle = (i / 30) * Math.PI * 2 + (Math.random() * 0.5);
         const r = 12 + Math.random() * 8;
         const x = Math.cos(angle) * r;
         const z = Math.sin(angle) * r;
         return { x, z };
      });
    }, []);

    const winterTrees = useMemo(() => {
      return Array.from({length: 30}).map((_, i) => {
         const angle = (i / 30) * Math.PI * 2 + (Math.random() * 0.5);
         const r = 13 + Math.random() * 8;
         const x = Math.cos(angle) * r;
         const z = Math.sin(angle) * r;
         return { x, z };
      });
    }, []);

    if (id === 'space') {
        return (
            <>
               <color attach="background" args={['#000000']} />
               <Stars radius={120} depth={60} count={9000} factor={8} saturation={0} fade speed={0.5} />
               <TwinklingStars />
               <Suspense fallback={null}><BlackHole /></Suspense>
               <group position={[0, -25, 0]}>
                   <Sparkles count={400} scale={70} size={10} speed={0.4} opacity={0.5} color="#7c3aed" noise={15} />
                   <Sparkles count={300} scale={60} size={8} speed={0.2} opacity={0.4} color="#3b82f6" noise={8} />
               </group>
               <group position={[0, -0.5, 0]}>
                 <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[100, 100]} />
                    <meshStandardMaterial color="#0a0a0f" roughness={0.6} metalness={0.4} />
                 </mesh>
                 <gridHelper args={[GRID_SIZE, GRID_SIZE, '#673ab7', '#3b3b55']} position={[0, 0.01, 0]} />
               </group>
               <Float speed={0.5} rotationIntensity={0.5} floatIntensity={1}>
                  <mesh position={[-25, 10, -15]}>
                      <dodecahedronGeometry args={[1.5, 0]} />
                      <meshStandardMaterial color="#616161" roughness={0.9} />
                  </mesh>
                  <mesh position={[30, -5, 30]}>
                      <octahedronGeometry args={[2, 0]} />
                      <meshStandardMaterial color="#546e7a" roughness={0.8} />
                  </mesh>
               </Float>
            </>
        );
    }

    if (id === 'winter') {
        return (
            <>
               <color attach="background" args={[isDay ? '#e3f2fd' : '#0f172a']} />
               <SnowParticles />
               <group position={[0, -0.5, 0]}>
                 <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[100, 100]} />
                    <meshStandardMaterial color="#eceff1" roughness={0.9} />
                 </mesh>
                 <gridHelper args={[GRID_SIZE, GRID_SIZE, '#90a4ae', '#cfd8dc']} position={[0, 0.01, 0]} />
               </group>
               {winterTrees.map((pos, i) => <WinterTree key={i} position={[pos.x, -0.5, pos.z]} />)}
               {!isDay && (
                   <mesh position={[15, 20, -10]}>
                       <sphereGeometry args={[2, 32, 32]} />
                       <meshBasicMaterial color="#fffde7" />
                       <pointLight intensity={1} distance={50} />
                   </mesh>
               )}
            </>
        );
    }

    if (id === 'autumn') {
        return (
            <>
               <color attach="background" args={['#fff3e0']} />
               <LeafParticles />
               <group position={[0, -0.5, 0]}>
                 <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[100, 100]} />
                    <meshStandardMaterial color="#ffccbc" roughness={1} />
                 </mesh>
                 <gridHelper args={[GRID_SIZE, GRID_SIZE, '#8d6e63', '#d7ccc8']} position={[0, 0.01, 0]} />
               </group>
               {autumnTrees.map((pos, i) => <AutumnTree key={i} position={[pos.x, -0.5, pos.z]} />)}
            </>
        );
    }

    return (
        <>
            <color attach="background" args={[isDay ? COLORS.day.sky : COLORS.night.sky]} />
            <group position={[0, -0.5, 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color={isDay ? COLORS.day.ground : COLORS.night.ground} roughness={1} />
              </mesh>
              <gridHelper args={[GRID_SIZE, GRID_SIZE, new THREE.Color(isDay ? 0x8d6e63 : 0x475569), new THREE.Color(isDay ? 0xd7ccc8 : 0x334155)]} position={[0, 0.01, 0]} />
              <mesh position={[0, 0.02, 0]} rotation={[-Math.PI/2, 0, 0]}>
                 <ringGeometry args={[GRID_SIZE/2, GRID_SIZE/2 + 0.5, 4, 1, Math.PI/4]} />
                 <meshStandardMaterial color={COLORS.day.border} />
              </mesh>
            </group>
        </>
    );
}

const Palov: React.FC<{ position: Position }> = ({ position }) => {
  const targetPos = useMemo(() => gridToWorld(position), [position]);
  const groupRef = useRef<THREE.Group>(null);

  const points = useMemo(() => {
    const pts = [];
    for ( let i = 0; i < 10; i ++ ) {
      pts.push( new THREE.Vector2( Math.sin( i * 0.2 ) * 0.3 + 0.1, ( i - 5 ) * 0.05 + 0.25 ) );
    }
    return pts;
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = 0.2 + Math.sin(state.clock.getElapsedTime() * 3) * 0.1;
      groupRef.current.rotation.y += 0.02;
    }
  });

  return (
    <group position={targetPos} ref={groupRef}>
      <mesh position={[0, -0.2, 0]} castShadow>
        <latheGeometry args={[points, 20]} />
        <meshStandardMaterial color="white" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <torusGeometry args={[0.38, 0.02, 16, 32]} />
        <meshStandardMaterial color="#1a237e" />
      </mesh>
      <group position={[0, -0.1, 0]}>
         <mesh>
           <sphereGeometry args={[0.35, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
           <meshStandardMaterial color="#fff3e0" roughness={0.8} />
         </mesh>
         {Array.from({ length: 6 }).map((_, i) => (
           <mesh key={i} position={[Math.random() * 0.3 - 0.15, 0.1 + Math.random() * 0.1, Math.random() * 0.3 - 0.15]}>
              <boxGeometry args={[0.08, 0.05, 0.06]} />
              <meshStandardMaterial color={i % 2 === 0 ? "#d84315" : "#ef6c00"} />
           </mesh>
         ))}
      </group>
      <mesh position={[0, 0.6, 0]}>
         <Sphere args={[0.15, 8, 8]} scale={[1, 2, 1]}>
            <meshStandardMaterial color="#eceff1" transparent opacity={0.4} roughness={0.9} />
         </Sphere>
      </mesh>
    </group>
  );
};

const GoldenSparkles = () => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y -= 0.01;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
    }
  });
  
  const particles = useMemo(() => {
    return new Array(8).fill(0).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const r = 0.7;
        return {
            x: Math.cos(angle) * r,
            z: Math.sin(angle) * r,
            color: i % 2 === 0 ? '#ffd700' : '#ffecb3',
            yOff: Math.random() * 0.5
        };
    });
  }, []);

  return (
    <group ref={groupRef}>
        {particles.map((p, i) => (
            <mesh key={i} position={[p.x, 0.5 + p.yOff, p.z]} rotation={[Math.random(), Math.random(), 0]}>
                <octahedronGeometry args={[0.06, 0]} />
                <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.8} />
            </mesh>
        ))}
    </group>
  );
};

const MagneticField = () => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (ref.current) {
            const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
            ref.current.scale.set(scale, 1, scale);
            ref.current.rotation.y += 0.002;
        }
    });

    return (
        <group ref={ref} position={[0, -0.45, 0]}>
            <mesh rotation={[-Math.PI/2, 0, 0]}>
                <ringGeometry args={[MAGNET_RADIUS - 0.1, MAGNET_RADIUS, 64]} />
                <meshBasicMaterial color="#3949ab" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <mesh rotation={[-Math.PI/2, 0, 0]}>
                <ringGeometry args={[0, MAGNET_RADIUS, 32]} />
                <meshBasicMaterial color="#3949ab" transparent opacity={0.03} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
             <group position={[0, 0.5, 0]}>
                {Array.from({ length: 4 }).map((_, i) => (
                   <mesh key={i} rotation={[-Math.PI/2, 0, (i/4)*Math.PI*2]}>
                       <ringGeometry args={[MAGNET_RADIUS * 0.6, MAGNET_RADIUS * 0.62, 32, 1, 0, Math.PI/2]} />
                       <meshBasicMaterial color="#8c9eff" transparent opacity={0.3} side={THREE.DoubleSide} />
                   </mesh>
                ))}
             </group>
        </group>
    );
};

interface SnakeSegmentProps { 
  position: Position;
  isHead: boolean;
  isTail: boolean;
  index: number;
  direction: Position;
  skin: Skin;
  isAbilityActive: boolean;
  isAbilityReady: boolean;
  speed: number;
}

const SnakeSegment: React.FC<SnakeSegmentProps> = ({ 
  position, 
  isHead, 
  isTail,
  index, 
  direction,
  skin,
  isAbilityActive,
  isAbilityReady,
  speed
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const startPos = useRef(gridToWorld(position));
  const endPos = useRef(gridToWorld(position));
  const animationProgress = useRef(1);
  const targetLookAt = useRef(new THREE.Vector3());
  const currentLookAt = useRef(new THREE.Vector3());
  
  useEffect(() => {
      const newTarget = gridToWorld(position);
      const dist = endPos.current.distanceTo(newTarget);
      if (dist > 2) {
          startPos.current.copy(newTarget);
          if (meshRef.current) meshRef.current.position.copy(newTarget);
          animationProgress.current = 1; 
      } else {
          startPos.current.copy(endPos.current);
          animationProgress.current = 0; 
      }
      endPos.current.copy(newTarget);
      if (isHead) targetLookAt.current.set(direction.x, 0, direction.y);
  }, [position, direction.x, direction.y, isHead]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      if (animationProgress.current < 1) {
          animationProgress.current += (delta * 1000) / speed;
          if (animationProgress.current > 1) animationProgress.current = 1;
          meshRef.current.position.lerpVectors(startPos.current, endPos.current, animationProgress.current);
      }
      if (!isHead && animationProgress.current < 1) {
          const dx = endPos.current.x - startPos.current.x;
          const dz = endPos.current.z - startPos.current.z;
          if (Math.abs(dx) + Math.abs(dz) > 0.1) {
              const time = state.clock.elapsedTime;
              const offset = Math.sin(time * 10 + index * 0.8) * 0.05;
              meshRef.current.position.x += -dz * offset;
              meshRef.current.position.z += dx * offset;
          }
      }
      const breath = 1 + Math.sin(state.clock.elapsedTime * 5 + index) * 0.03;
      meshRef.current.scale.set(breath, breath, breath);
      if (isHead) {
          currentLookAt.current.lerp(targetLookAt.current, delta * 15);
          const lookTarget = new THREE.Vector3().copy(meshRef.current.position).add(currentLookAt.current);
          meshRef.current.lookAt(lookTarget);
      }
    }
  });

  const color = isHead ? skin.headColor : skin.bodyColors[index % skin.bodyColors.length];

  const Geometry = () => {
    const size = isHead ? 0.8 : 0.72;
    if (skin.shape === 'round') {
      return <Sphere args={[size / 2, 16, 16]} castShadow><meshStandardMaterial color={color} /></Sphere>;
    } else if (skin.shape === 'prism') {
      return <Cylinder args={[0, size/2, size, 4]} rotation={[Math.PI/4, Math.PI/4, 0]} castShadow><meshStandardMaterial color={color} flatShading /></Cylinder>;
    }
    return <RoundedBox args={[size, size, size]} radius={0.15} castShadow><meshStandardMaterial color={color} /></RoundedBox>;
  };

  return (
    <group ref={meshRef} position={startPos.current}> 
      {isAbilityActive && isHead ? (
        <Sphere args={[0.6, 16, 16]}>
            <meshStandardMaterial color="#9c27b0" transparent opacity={0.8} roughness={0.1} metalness={0.9} />
        </Sphere>
      ) : (
        <Geometry />
      )}
      {isTail && skin.ability === AbilityType.PASSIVE_WALL_WRAP && (
        <group position={[0, 0.5, 0]}>
            <Octahedron args={[0.2, 0]}>
               <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.5} transparent opacity={0.8} />
            </Octahedron>
            <pointLight intensity={0.5} color="#00e5ff" distance={2} />
        </group>
      )}
      {isHead && (
        <group position={[0, 0.2, 0.4]}>
             <mesh position={[0.2, 0, 0]}>
               <sphereGeometry args={[0.12, 16, 16]} />
               <meshStandardMaterial color="white" />
             </mesh>
             <mesh position={[0.2, 0, 0.1]}>
               <sphereGeometry args={[0.06, 16, 16]} />
               <meshStandardMaterial color="black" />
             </mesh>
             <mesh position={[-0.2, 0, 0]}>
               <sphereGeometry args={[0.12, 16, 16]} />
               <meshStandardMaterial color="white" />
             </mesh>
             <mesh position={[-0.2, 0, 0.1]}>
               <sphereGeometry args={[0.06, 16, 16]} />
               <meshStandardMaterial color="black" />
             </mesh>
             <mesh position={[0, 0.5, -0.2]}>
                <cylinderGeometry args={[0.25, 0.35, 0.3, 16]} />
                <meshStandardMaterial color="#fbc02d" />
             </mesh>
             {skin.ability === AbilityType.PASSIVE_WALL_WRAP && (
                 <group position={[0, 0.6, -0.2]} rotation={[0.2, 0, 0]}>
                     <mesh><cylinderGeometry args={[0.25, 0.2, 0.15, 8]} /><meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} /></mesh>
                     {Array.from({length: 4}).map((_, k) => (
                        <mesh key={k} position={[Math.sin(k * Math.PI/2)*0.22, 0.1, Math.cos(k * Math.PI/2)*0.22]}>
                             <coneGeometry args={[0.08, 0.2, 8]} /><meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} />
                        </mesh>
                     ))}
                 </group>
             )}
             {skin.ability === AbilityType.PASSIVE_BONUS_MONEY && <GoldenSparkles />}
             {skin.ability === AbilityType.PASSIVE_MAGNET && <MagneticField />}
             {skin.ability === AbilityType.BREAK_OBSTACLE && isAbilityReady && !isAbilityActive && (
               <mesh position={[0, 1.2, -0.5]}>
                  <sphereGeometry args={[0.15, 8, 8]} />
                  <meshStandardMaterial color="#e040fb" emissive="#e040fb" emissiveIntensity={2} />
               </mesh>
             )}
             {skin.ability === AbilityType.PASSIVE_SHIELD_COOLDOWN && isAbilityReady && (
               <group position={[0, 0.4, 0]}>
                 <mesh rotation={[Math.PI/2, 0, 0]}>
                    <torusGeometry args={[0.7, 0.05, 8, 32]} />
                    <meshStandardMaterial color="#4caf50" emissive="#4caf50" emissiveIntensity={1} transparent opacity={0.8} />
                 </mesh>
                 <Sphere args={[0.8, 16, 16]}>
                    <meshStandardMaterial color="#81c784" transparent opacity={0.1} side={THREE.DoubleSide} />
                 </Sphere>
               </group>
             )}
        </group>
      )}
    </group>
  );
};

interface ObstacleMeshProps {
  obstacle: Obstacle;
  activeBackgroundId: string;
}

const WarningIndicator: React.FC<{ position: THREE.Vector3 }> = ({ position }) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
      if (groupRef.current) {
          const scale = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.1;
          groupRef.current.scale.set(scale, scale, scale);
      }
  });
  return (
      <group ref={groupRef} position={[position.x, 0.01, position.z]}>
        <mesh rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[0.8, 0.8]} />
          <meshBasicMaterial color={COLORS.obstacleWarning} transparent opacity={0.4} />
          <mesh position={[0, 0, 0.01]}>
              <ringGeometry args={[0.3, 0.4, 32]} />
              <meshBasicMaterial color="red" />
          </mesh>
        </mesh>
      </group>
  );
};

const FallingBlock: React.FC<{ position: THREE.Vector3 }> = ({ position }) => {
    const groupRef = useRef<THREE.Group>(null);
    const dropState = useRef({ y: 20, velocity: 0 });
    const [landed, setLanded] = useState(false);
    
    useEffect(() => { soundManager.playObstacleDrop(); }, []);

    useFrame((_, delta) => {
        if (!groupRef.current || landed) return;
        const state = dropState.current;
        if (state.y > 0.5) {
            state.velocity += delta * 40; 
            state.y -= state.velocity * delta;
            if (state.y <= 0.5) {
                state.y = 0.5;
                state.velocity = -state.velocity * 0.25; 
                if (Math.abs(state.velocity) < 1) {
                    state.y = 0.5;
                    setLanded(true);
                }
                if (Math.abs(state.velocity) > 5 || state.y === 0.5) soundManager.playObstacleImpact();
            }
            groupRef.current.position.y = state.y;
        }
    });

    return (
        <group ref={groupRef} position={[position.x, landed ? 0.5 : 20, position.z]}>
           <mesh castShadow receiveShadow><boxGeometry args={[0.8, 1.2, 0.8]} /><meshStandardMaterial color="#795548" roughness={0.6} /></mesh>
           <mesh position={[0, 0.65, 0]}><coneGeometry args={[0.6, 0.5, 4]} /><meshStandardMaterial color="#3e2723" /></mesh>
        </group>
    );
};

const AsteroidObstacle: React.FC<{ position: THREE.Vector3 }> = ({ position }) => {
    const groupRef = useRef<THREE.Group>(null);
    const dropState = useRef({ y: 30, velocity: 0 });
    const [landed, setLanded] = useState(false);
    useEffect(() => { soundManager.playObstacleDrop(); }, []);

    useFrame((state, delta) => {
        if (!groupRef.current || landed) return;
        const s = dropState.current;
        if (s.y > 0.5) {
            s.velocity += delta * 60; 
            s.y -= s.velocity * delta;
            if (s.y <= 0.5) {
                s.y = 0.5;
                setLanded(true);
                soundManager.playObstacleImpact();
            }
            groupRef.current.position.y = s.y;
        }
        if (landed) {
            groupRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
            groupRef.current.rotation.x += delta * 0.2;
            groupRef.current.rotation.y += delta * 0.3;
        }
    });

    return (
        <group ref={groupRef} position={[position.x, landed ? 0.5 : 30, position.z]}>
           <mesh castShadow receiveShadow><dodecahedronGeometry args={[0.6, 0]} /><meshStandardMaterial color="#78909c" roughness={0.9} flatShading /></mesh>
           <mesh position={[0.3, 0.3, 0]}><dodecahedronGeometry args={[0.3, 0]} /><meshStandardMaterial color="#546e7a" roughness={0.9} flatShading /></mesh>
           <mesh position={[-0.2, -0.2, 0.3]}><dodecahedronGeometry args={[0.25, 0]} /><meshStandardMaterial color="#607d8b" roughness={0.9} flatShading /></mesh>
        </group>
    );
}

const ObstacleMesh: React.FC<ObstacleMeshProps> = ({ obstacle, activeBackgroundId }) => {
  const pos = useMemo(() => gridToWorld(obstacle.position), [obstacle.position]);
  return (
    <group>
        {obstacle.isWarning ? <WarningIndicator position={pos} /> : (
            activeBackgroundId === 'space' ? <AsteroidObstacle position={pos} /> : <FallingBlock position={pos} />
        )}
    </group>
  );
};

const FloatingTextOverlay: React.FC<{ textItem: FloatingText }> = ({ textItem }) => {
    const pos = gridToWorld(textItem.position);
    const yOffset = (1 - textItem.life) * 3; 
    return (
      <Html position={[pos.x, pos.y + 1 + yOffset, pos.z]} center pointerEvents="none">
          <div 
             className="font-display font-bold text-2xl drop-shadow-lg whitespace-nowrap select-none"
             style={{ 
                 color: textItem.color, 
                 opacity: textItem.life, 
                 transform: `scale(${0.5 + textItem.life * 0.5})`,
                 textShadow: '2px 2px 0px rgba(0,0,0,0.5)'
             }}
          >
              {textItem.text}
          </div>
      </Html>
    );
};

const IsometricCamera = ({ gameState, gameEvents }: { gameState: GameState, gameEvents: GameEvent[] }) => {
  const { camera, size } = useThree();
  const shakeIntensity = useRef(0);
  
  useEffect(() => {
     const lastEvent = gameEvents[gameEvents.length - 1];
     if (!lastEvent) return;
     if (lastEvent.type === 'SHAKE_SMALL') shakeIntensity.current = 0.3;
     if (lastEvent.type === 'SHAKE_LARGE') shakeIntensity.current = 0.8;
     if (lastEvent.type === 'EXPLOSION') shakeIntensity.current = 0.5;
  }, [gameEvents]);

  useFrame((_, delta) => {
    if (shakeIntensity.current > 0) {
        shakeIntensity.current = THREE.MathUtils.lerp(shakeIntensity.current, 0, delta * 5);
    }
    const zoom = Math.min(size.width / 15, size.height / 15) * 0.7; 
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
    if (gameState === GameState.MENU || gameState === GameState.SHOP) return;
    const shakeX = (Math.random() - 0.5) * shakeIntensity.current;
    const shakeY = (Math.random() - 0.5) * shakeIntensity.current;
    const shakeZ = (Math.random() - 0.5) * shakeIntensity.current;
    const isoPos = new THREE.Vector3(20 + shakeX, 20 + shakeY, 20 + shakeZ);
    camera.position.copy(isoPos);
    camera.lookAt(0, 0, 0);
  });
  return null;
};

// --- MAIN EXPORT ---

export const Game3D: React.FC<Game3DProps> = ({ 
  snake, 
  food, 
  obstacles, 
  artifacts,
  theme, 
  gameState, 
  speed,
  direction,
  activeSkin,
  activeBackgroundId,
  isAbilityActive,
  isAbilityReady,
  floatingTexts,
  gameEvents,
  weather
}) => {
  const lightIntensity = theme === Theme.DAY ? 1.2 : 0.4;
  const headDir = useMemo(() => {
    if (snake.length < 2) return { x: 0, y: -1 };
    return { x: snake[0].x - snake[1].x, y: snake[0].y - snake[1].y };
  }, [snake]);
  
  const [explosions, setExplosions] = useState<{id: number, position: Position, type: VisualEventType}[]>([]);

  useEffect(() => {
      const lastEvent = gameEvents[gameEvents.length - 1];
      if (!lastEvent) return;
      if (lastEvent.type === 'EAT' || lastEvent.type === 'EXPLOSION') {
          setExplosions(prev => [...prev, { id: lastEvent.id, position: lastEvent.position!, type: lastEvent.type }]);
          setTimeout(() => { setExplosions(p => p.filter(e => e.id !== lastEvent.id)); }, 1000);
      }
  }, [gameEvents]);

  return (
    <Canvas shadows orthographic camera={{ position: [20, 20, 20], zoom: 40, near: -50, far: 200 }}>
      <ambientLight intensity={activeBackgroundId === 'space' ? 0.6 : COLORS[theme === Theme.DAY ? 'day' : 'night'].ambient} />
      <directionalLight 
        position={[10, 20, 5]} 
        intensity={lightIntensity} 
        castShadow 
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={0.1}
        shadow-camera-far={40}
      />
      {theme === Theme.NIGHT && activeBackgroundId !== 'space' && <pointLight position={[-5, 10, -5]} intensity={0.8} color="#7986cb" />}
      <Environment id={activeBackgroundId} theme={theme} />
      {weather === WeatherType.SANDSTORM && activeBackgroundId === 'default' && <SandstormEffect />}
      {weather === WeatherType.BLIZZARD && activeBackgroundId === 'winter' && <BlizzardEffect />}
      {weather === WeatherType.GALE_FORCE && activeBackgroundId === 'autumn' && <GaleForceEffect />}

      {snake.map((pos, i) => (
        <SnakeSegment key={i} position={pos} isHead={i === 0} isTail={i === snake.length - 1} index={i} direction={headDir} skin={activeSkin} isAbilityActive={isAbilityActive} isAbilityReady={isAbilityReady} speed={speed} />
      ))}
      
      {/* Multiple food support for Feast artifact */}
      {food.map((f, i) => <Palov key={`food-${i}-${f.x}-${f.y}`} position={f} />)}
      
      {obstacles.map(obs => <ObstacleMesh key={obs.id} obstacle={obs} activeBackgroundId={activeBackgroundId} />)}

      {/* Artifacts */}
      {artifacts.map(art => <ArtifactMesh key={art.id} artifact={art} />)}
      
      {explosions.map(exp => (
         exp.type === 'EAT' ? <RiceExplosion key={exp.id} position={exp.position} /> : <ParticleExplosion key={exp.id} position={exp.position} color={activeBackgroundId === 'space' ? '#90a4ae' : '#795548'} />
      ))}
      {floatingTexts.map(ft => <FloatingTextOverlay key={ft.id} textItem={ft} />)}
      <IsometricCamera gameEvents={gameEvents} gameState={gameState} />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate={gameState === GameState.MENU || gameState === GameState.SHOP} autoRotateSpeed={1} />
    </Canvas>
  );
};
