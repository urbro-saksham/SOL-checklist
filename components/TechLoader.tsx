'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Image from 'next/image';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, Environment, ContactShadows, Float, Stars } from '@react-three/drei';

// --- 1. PROCEDURAL ASSETS (So we don't need external files) ---
function generateNoiseTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#f0f0f0';
    context.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 50000; i++) {
        context.fillStyle = Math.random() > 0.5 ? '#e0e0e0' : '#ffffff';
        context.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
  }
  return new THREE.CanvasTexture(canvas);
}

// --- 2. 3D BURNING CONE COMPONENT ---
function BurningCone({ progress }: { progress: number }) {
  const coneRef = useRef<THREE.Mesh>(null);
  const ashRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Group>(null);
  
  // Create a clipping plane that moves to slice the cone
  // Normal (1, 0, 0) means it slices along the X axis
  const [clippingPlane] = useState(() => new THREE.Plane(new THREE.Vector3(1, 0, 0), 0));
  
  // Texture for paper realism
  const paperTexture = useMemo(() => generateNoiseTexture(), []);

  useFrame((state) => {
    if (!coneRef.current || !flameRef.current) return;

    // --- A. CALCULATE BURN POSITION ---
    // The cone is roughly 6 units long in our local space.
    // We map progress (0-100) to X coordinates (-3 to 3).
    // Start at Tip (Right, X=3) -> Burn to Filter (Left, X=-3)
    const coneLength = 5.5; // Slightly less than full length to keep filter intact
    const startX = 2.8; 
    const currentX = startX - (progress / 100) * coneLength;

    // Update Clipping Plane (This makes the geometry visually disappear)
    clippingPlane.constant = -currentX;

    // Move the Flame/Ember Effect to the cut point
    flameRef.current.position.x = currentX;
    
    // Rotate cone slowly for 3D effect
    coneRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
  });

  return (
    <group rotation={[0, 0, -0.2]}> {/* Tilt the whole assembly */}
      
      {/* 1. THE CONE (Paper Body) */}
      <mesh ref={coneRef} position={[0, 0, 0]} rotation={[0, 0, 1.57]}> {/* Rotate to lie flat */}
        {/* TopRadius, BottomRadius, Height, Segments */}
        <cylinderGeometry args={[0.15, 0.55, 6, 64]} />
        <meshStandardMaterial 
          color="#f3f0eb"
          map={paperTexture}
          roughness={0.8}
          clippingPlanes={[clippingPlane]} // MAGIC: This cuts the mesh
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. THE FILTER (Gold/Brown Tip - Indestructible) */}
      <mesh position={[-3.2, 0, 0]} rotation={[0, 0, 1.57]}>
        <cylinderGeometry args={[0.55, 0.55, 1.5, 64]} />
        <meshStandardMaterial color="#c2a278" roughness={0.6} />
        {/* Shiny Gold Band */}
        <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.56, 0.56, 0.1, 64]} />
            <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} />
        </mesh>
      </mesh>

      {/* 3. THE BURNING EDGE (Moving Group) */}
      <group ref={flameRef}>
          
          {/* A. The "Cherry" (Glowing Ember Inside) */}
          <mesh rotation={[0, 1.57, 0]}>
              <ringGeometry args={[0, 0.45, 32]} />
              <meshBasicMaterial color="#ff4500" />
          </mesh>
          
          {/* B. Dynamic Light Source (The fire casts real light) */}
          <pointLight color="#ff6600" intensity={4} distance={3} decay={2} />

          {/* C. Particle System (Sparks & Smoke) */}
          <FireParticles />
      </group>

    </group>
  );
}

// --- 3. FIRE PARTICLES SYSTEM ---
function FireParticles() {
  const count = 40;
  const mesh = useRef<THREE.InstancedMesh>(null);
  
  // Store individual particle data (speed, phase)
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const speed = 0.5 + Math.random();
      const xFactor = -0.5 + Math.random() * 1; // Spread width
      const yFactor = -0.5 + Math.random() * 1;
      temp.push({ t, speed, xFactor, yFactor });
    }
    return temp;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!mesh.current) return;

    particles.forEach((particle, i) => {
      let { t, speed, xFactor, yFactor } = particle;
      
      // Update time for this particle
      t = particle.t += speed * 0.05;
      
      // Path logic: Rise up (+Y) and drift back slightly (+X relative to flame)
      // Since our flame group is rotated, +Y is "Up" in local space
      const life = (t % 1); // 0 to 1 cycle
      
      // Scale: Grow then shrink
      const scale = 1.0 * Math.sin(life * Math.PI); 
      
      // Position
      dummy.position.set(
        (Math.sin(t * 2) * 0.2) + (life * 0.5), // Drift right (trail)
        (life * 2) + (Math.cos(t) * 0.2),       // Rise up
        (Math.sin(t * 3) * 0.2)                 // Z wiggle
      );
      
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshBasicMaterial color="#ffaa00" transparent opacity={0.6} />
    </instancedMesh>
  );
}

// --- 4. MAIN EXPORT ---
export default function TechLoader() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + (Math.random() * 0.8 + 0.2); 
      });
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center">
      
      {/* 2D Overlay Elements */}
      <div className="absolute top-12 z-20 animate-pulse drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
         <div className="relative w-28 h-28">
            <Image src="/logo.webp" alt="Sol France" fill className="object-contain" priority />
         </div>
      </div>

      <div className="absolute bottom-20 z-20 text-center">
         <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-200 tracking-[0.3em] animate-pulse">
            IGNITING
         </h2>
         <div className="text-[10px] text-white/30 font-mono mt-2 tracking-[0.2em]">
            SYSTEM CHECK • {Math.round(progress)}%
         </div>
      </div>

      {/* --- THE REAL 3D SCENE --- */}
      <div className="w-full h-full absolute inset-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
            <color attach="background" args={['#050505']} />
            
            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            
            {/* Environment */}
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                <BurningCone progress={progress} />
            </Float>

            {/* Post-Processing Bloom (Simulated via overlay or simple bright colors for performance) */}
            <ContactShadows position={[0, -2, 0]} opacity={0.5} scale={10} blur={2.5} far={4} />
        </Canvas>
      </div>

    </div>
  );
}