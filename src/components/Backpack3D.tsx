"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Html,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import * as THREE from "three";
import { SPOTS, formatCOP, type SpotConfig, type SpotName } from "@/lib/spots";
import type { SpotView } from "@/lib/types";

const BODY_W = 0.32;
const BODY_H = 1.0;
const BODY_D = 0.36;

/** Material del cordura negro. */
function useFabric(roughness = 0.86) {
  return useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#131313",
        roughness,
        metalness: 0.12,
      }),
    [roughness]
  );
}

function Webbing({
  position,
  width = 0.22,
  rotation = [0, 0, 0] as [number, number, number],
}: {
  position: [number, number, number];
  width?: number;
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <boxGeometry args={[width, 0.022, 0.012]} />
      <meshStandardMaterial color="#0d0d0d" roughness={0.95} />
    </mesh>
  );
}

function Zipper({
  position,
  length = 0.5,
  rotation = [0, 0, 0] as [number, number, number],
}: {
  position: [number, number, number];
  length?: number;
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[0.012, length, 0.008]} />
        <meshStandardMaterial color="#242424" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[0, length / 2 - 0.03, 0.008]}>
        <boxGeometry args={[0.03, 0.05, 0.014]} />
        <meshStandardMaterial color="#1b1b1b" roughness={0.35} metalness={0.7} />
      </mesh>
    </group>
  );
}

/** Logo de una marca proyectado sobre una cara de la mochila. */
function LogoPlane({ spot, url }: { spot: SpotConfig; url: string }) {
  const texture = useLoader(THREE.TextureLoader, url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const [w, h] = spot.size;
  const aspect = texture.image
    ? (texture.image as HTMLImageElement).width /
      (texture.image as HTMLImageElement).height
    : 1;
  const boxAspect = w / h;
  const [pw, ph] = aspect > boxAspect ? [w, w / aspect] : [h * aspect, h];

  const { position, rotation } = faceTransform(spot, 0.006);

  return (
    <mesh position={position} rotation={rotation} renderOrder={2}>
      <planeGeometry args={[pw, ph]} />
      <meshStandardMaterial
        map={texture}
        transparent
        roughness={0.55}
        polygonOffset
        polygonOffsetFactor={-4}
      />
    </mesh>
  );
}

/** Posicion/rotacion de un plano pegado a la cara indicada por el spot. */
function faceTransform(spot: SpotConfig, lift: number) {
  const [x, y, z] = spot.hotspot;
  switch (spot.face) {
    case "left":
      return {
        position: [x - lift, y, z] as [number, number, number],
        rotation: [0, -Math.PI / 2, 0] as [number, number, number],
      };
    case "right":
      return {
        position: [x + lift, y, z] as [number, number, number],
        rotation: [0, Math.PI / 2, 0] as [number, number, number],
      };
    case "top":
      return {
        position: [x, y + lift, z] as [number, number, number],
        rotation: [-Math.PI / 2, 0, 0] as [number, number, number],
      };
    default:
      return {
        position: [x, y, z + lift] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
      };
  }
}

function Hotspot({
  spot,
  data,
  active,
  onHover,
  onSelect,
}: {
  spot: SpotConfig;
  data?: SpotView;
  active: boolean;
  onHover: (name: SpotName | null) => void;
  onSelect: (name: SpotName) => void;
}) {
  const { position, rotation } = faceTransform(spot, 0.02);
  const ring = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ring.current) return;
    const t = (clock.getElapsedTime() % 1.8) / 1.8;
    const s = 0.6 + t * 1.1;
    ring.current.scale.set(s, s, s);
    (ring.current.material as THREE.MeshBasicMaterial).opacity =
      (1 - t) * (active ? 0.9 : 0.45);
  });

  const taken = Boolean(data?.brand);

  return (
    <group position={position} rotation={rotation}>
      <mesh ref={ring}>
        <ringGeometry args={[0.022, 0.03, 32]} />
        <meshBasicMaterial
          color={taken ? "#ffffff" : "#c6f432"}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(spot.name);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(spot.name);
        }}
      >
        <circleGeometry args={[0.032, 32]} />
        <meshBasicMaterial
          color={taken ? "#ffffff" : "#c6f432"}
          transparent
          opacity={active ? 0.95 : 0.7}
          depthWrite={false}
        />
      </mesh>

      {active && (
        <Html center distanceFactor={1.4} zIndexRange={[30, 0]} position={[0, 0.09, 0]}>
          <button
            onClick={() => onSelect(spot.name)}
            className="w-52 -translate-y-1/2 cursor-pointer rounded-xl border border-white/15 bg-black/85 p-3 text-left backdrop-blur-md transition hover:border-lime/60"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-lime">
                {spot.displayName}
              </span>
              {spot.premium && (
                <span className="rounded bg-lime/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-lime">
                  Premium
                </span>
              )}
            </div>
            {data?.brand?.logo && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={data.brand.logo}
                alt={data.brand.name}
                className="my-2 h-8 w-auto max-w-full object-contain"
              />
            )}
            <p className="mt-1 text-[11px] text-white/60">
              {data?.brand ? data.brand.name : "Libre"}
            </p>
            <p className="mt-1 text-sm font-bold text-white">
              {formatCOP(data?.nextBid ?? spot.minBid)}
            </p>
            <span className="mt-2 block rounded-lg bg-lime px-2 py-1.5 text-center text-[11px] font-bold text-black">
              {data?.brand ? "Outbid" : "Poner logo"}
            </span>
          </button>
        </Html>
      )}
    </group>
  );
}

function Pack({
  spotData,
  hovered,
  onHover,
  onSelect,
  autoRotate,
}: {
  spotData: Record<string, SpotView>;
  hovered: SpotName | null;
  onHover: (n: SpotName | null) => void;
  onSelect: (n: SpotName) => void;
  autoRotate: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const fabric = useFabric();
  const softFabric = useFabric(0.95);

  useFrame((_, delta) => {
    if (autoRotate && group.current) group.current.rotation.y += delta * 0.18;
  });

  return (
    <group ref={group} position={[0, -0.1, 0]}>
      {/* Cuerpo principal */}
      <RoundedBox
        args={[BODY_W * 2, BODY_H, BODY_D]}
        radius={0.06}
        smoothness={6}
        castShadow
        receiveShadow
        material={fabric}
      />

      {/* Panel frontal (compartimento del portatil) */}
      <RoundedBox
        args={[BODY_W * 1.86, BODY_H * 0.86, 0.05]}
        radius={0.045}
        smoothness={5}
        position={[0, 0.02, BODY_D / 2 - 0.005]}
        castShadow
        material={fabric}
      />

      {/* Bolsillo frontal inferior */}
      <RoundedBox
        args={[BODY_W * 1.7, BODY_H * 0.3, 0.045]}
        radius={0.035}
        smoothness={5}
        position={[0, -0.19, BODY_D / 2 + 0.02]}
        castShadow
        material={softFabric}
      />

      {/* Solapa superior */}
      <RoundedBox
        args={[BODY_W * 1.8, BODY_H * 0.2, 0.06]}
        radius={0.04}
        smoothness={5}
        position={[0, 0.6, BODY_D / 2 - 0.02]}
        castShadow
        material={fabric}
      />

      {/* Asa superior */}
      <mesh position={[0, 0.55, 0]} rotation={[0, 0, 0]} castShadow>
        <torusGeometry args={[0.085, 0.019, 12, 40, Math.PI]} />
        <meshStandardMaterial color="#0f0f0f" roughness={0.9} />
      </mesh>

      {/* Tirantes */}
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x, 0.12, -BODY_D / 2 - 0.05]} rotation={[0.18, 0, 0]} castShadow>
          <capsuleGeometry args={[0.045, 0.62, 6, 12]} />
          <meshStandardMaterial color="#0e0e0e" roughness={0.95} />
        </mesh>
      ))}

      {/* Espalda acolchada */}
      <RoundedBox
        args={[BODY_W * 1.8, BODY_H * 0.9, 0.05]}
        radius={0.05}
        smoothness={5}
        position={[0, 0, -BODY_D / 2 - 0.005]}
        material={softFabric}
      />

      {/* MOLLE frontal */}
      {[-0.06, -0.13, -0.2].map((y) => (
        <Webbing key={y} position={[0, y, BODY_D / 2 + 0.045]} width={0.34} />
      ))}
      {[-0.1, 0, 0.1].map((x) => (
        <mesh key={x} position={[x, -0.13, BODY_D / 2 + 0.045]}>
          <boxGeometry args={[0.014, 0.17, 0.014]} />
          <meshStandardMaterial color="#0b0b0b" roughness={0.95} />
        </mesh>
      ))}

      {/* MOLLE laterales */}
      {[-1, 1].map((side) =>
        [-0.06, -0.16].map((y) => (
          <Webbing
            key={`${side}-${y}`}
            position={[side * (BODY_W + 0.005), y, 0]}
            width={0.2}
            rotation={[0, Math.PI / 2, 0]}
          />
        ))
      )}

      {/* Cremalleras */}
      <Zipper position={[-BODY_W * 0.92, 0.05, BODY_D / 2 - 0.03]} length={0.62} />
      <Zipper position={[BODY_W * 0.92, 0.05, BODY_D / 2 - 0.03]} length={0.62} />
      <Zipper
        position={[0, 0.69, BODY_D / 2 - 0.06]}
        length={0.5}
        rotation={[0, 0, Math.PI / 2]}
      />

      {/* Banda reflectiva */}
      <mesh position={[0, -0.36, BODY_D / 2 + 0.026]}>
        <planeGeometry args={[0.11, 0.018]} />
        <meshStandardMaterial color="#9a9a9a" roughness={0.25} metalness={0.4} />
      </mesh>

      {/* Logos vigentes */}
      {SPOTS.map((spot) => {
        const logo = spotData[spot.name]?.brand?.logo;
        if (!logo) return null;
        return (
          <Suspense key={`logo-${spot.name}`} fallback={null}>
            <LogoPlane spot={spot} url={logo} />
          </Suspense>
        );
      })}

      {/* Hotspots */}
      {SPOTS.map((spot) => (
        <Hotspot
          key={spot.name}
          spot={spot}
          data={spotData[spot.name]}
          active={hovered === spot.name}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

export default function Backpack3D({
  spots,
  onSelect,
}: {
  spots: SpotView[];
  onSelect: (name: SpotName) => void;
}) {
  const [hovered, setHovered] = useState<SpotName | null>(null);
  const [interacting, setInteracting] = useState(false);

  const spotData = useMemo(
    () => Object.fromEntries(spots.map((s) => [s.name, s])) as Record<string, SpotView>,
    [spots]
  );

  return (
    <div className="relative h-[70vh] min-h-[420px] w-full sm:h-[76vh]">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0.9, 0.45, 1.5], fov: 38 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#0a0a0a"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 3]} intensity={2.2} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.8} color="#c6f432" />
        <spotLight position={[0, 4, 2]} angle={0.6} intensity={1.4} penumbra={1} />

        <Suspense fallback={null}>
          <Pack
            spotData={spotData}
            hovered={hovered}
            onHover={setHovered}
            onSelect={onSelect}
            autoRotate={!interacting && !hovered}
          />
          <Environment preset="city" />
        </Suspense>

        <ContactShadows
          position={[0, -0.68, 0]}
          opacity={0.55}
          scale={3}
          blur={2.6}
          far={1.2}
        />

        <OrbitControls
          enablePan={false}
          minDistance={1.1}
          maxDistance={2.6}
          minPolarAngle={Math.PI / 5}
          maxPolarAngle={Math.PI / 1.75}
          enableDamping
          dampingFactor={0.08}
          onStart={() => setInteracting(true)}
          makeDefault
        />
      </Canvas>

      <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-center text-[11px] uppercase tracking-[0.2em] text-white/35">
        Arrastra para rotar · toca una zona
      </p>
    </div>
  );
}
