"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Particle animation props
interface ParticleFieldProps {
  count?: number;
  moveParticlesOnHover?: boolean;
  particleHoverFactor?: number;
  speed?: number;
}

function ParticleField({
  count = 2000,
  moveParticlesOnHover = true,
  particleHoverFactor = 2,
  speed = 0.5
}: ParticleFieldProps) {
  const points = useRef<THREE.Points>(null);

  // Generate random points in a 3D space
  const particlePositions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 10;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    return positions;
  }, [count]);

  useFrame((state) => {
    if (!points.current) return;

    // Idle animation
    const time = state.clock.getElapsedTime() * speed * 0.1;
    // Base gentle rotation
    const baseRotationX = time * 0.2;
    const baseRotationY = time * 0.15;

    points.current.rotation.x = baseRotationX;
    points.current.rotation.y = baseRotationY;

    // Mouse interaction
    if (moveParticlesOnHover) {
      // Apply hover effect using pointer position (normalized -1 to 1)
      const x = state.pointer.x * particleHoverFactor;
      const y = state.pointer.y * particleHoverFactor;

      // Add interactive rotation/tilt
      // Smoothly buffer the movement using lerp if needed, or direct mapping for responsiveness
      // Here we add the mouse influence to the rotation
      points.current.rotation.x += y * 0.1;
      points.current.rotation.y += x * 0.1;

      // Also slight position shift for depth parallax
      points.current.position.x = THREE.MathUtils.lerp(points.current.position.x, x * 0.5, 0.1);
      points.current.position.y = THREE.MathUtils.lerp(points.current.position.y, y * 0.5, 0.1);
    }
  });

  return (
    <Points ref={points} positions={particlePositions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#8b5cf6"
        size={0.08}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

export default function ThreeCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 60 }}
      // Fix: Attach event source to body to capture events even when covered by overlays
      eventSource={typeof document !== 'undefined' ? document.body : undefined}
      className="w-full h-full"
    >
      <ambientLight intensity={0.2} />
      <ParticleField
        moveParticlesOnHover={true}
        particleHoverFactor={2} // Increased sensitivity
        speed={0.5} // Slower speed
      />
      <mesh scale={[80, 80, 1]} position={[0, 0, -5]}>
        <planeGeometry />
        <meshBasicMaterial color="#050505" />
      </mesh>
    </Canvas>
  );
} 