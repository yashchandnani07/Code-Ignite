"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

// Dynamically import ThreeCanvas with no SSR to avoid hydration issues with Three.js
const ThreeCanvas = dynamic(() => import("./ThreeCanvas"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-black" />,
});

export default function ThreeBackgroundScene() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Suspense fallback={<div className="absolute inset-0 bg-black" />}>
        <ThreeCanvas />
      </Suspense>
    </div>
  );
}