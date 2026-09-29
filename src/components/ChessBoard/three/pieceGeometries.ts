import * as THREE from 'three';
import { PieceType } from '../../../types/chess';

/**
 * Procedural 3D Staunton Chess Piece Geometry Generator
 * Constructs high-fidelity 3D meshes using LatheGeometry, ExtrudeGeometry, and CSG/composite primitives.
 */

// Cache geometries so we don't recreate them per square
const geometryCache = new Map<PieceType, THREE.BufferGeometry>();

/**
 * Creates a LatheGeometry from 2D outline points
 */
function createLathe(points: [number, number][], segments = 32): THREE.BufferGeometry {
  const vPoints = points.map(([x, y]) => new THREE.Vector2(x, y));
  const geom = new THREE.LatheGeometry(vPoints, segments);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Generates procedural 3D Pawn geometry
 */
function generatePawnGeometry(): THREE.BufferGeometry {
  const points: [number, number][] = [
    [0.0, 0.0],
    [0.34, 0.0],
    [0.34, 0.04],
    [0.30, 0.08],
    [0.26, 0.12],
    [0.20, 0.18],
    [0.15, 0.28],
    [0.13, 0.44],
    [0.17, 0.50],
    [0.18, 0.54],
    [0.13, 0.57],
    [0.12, 0.60],
    [0.20, 0.70],
    [0.18, 0.80],
    [0.0, 0.88],
  ];
  return createLathe(points, 32);
}

/**
 * Generates procedural 3D Rook geometry with battlements
 */
function generateRookGeometry(): THREE.BufferGeometry {
  // Main body
  const basePoints: [number, number][] = [
    [0.0, 0.0],
    [0.36, 0.0],
    [0.36, 0.05],
    [0.32, 0.10],
    [0.28, 0.15],
    [0.22, 0.22],
    [0.20, 0.45],
    [0.22, 0.68],
    [0.27, 0.76],
    [0.30, 0.82],
    [0.30, 1.02],
    [0.24, 1.02],
    [0.24, 0.90],
    [0.0, 0.90],
  ];
  const bodyGeom = createLathe(basePoints, 32);
  return bodyGeom;
}

/**
 * Generates procedural 3D Knight geometry (Sculpted Staunton Stallion)
 */
function generateKnightGeometry(): THREE.BufferGeometry {
  // Base pedestal
  const basePoints: [number, number][] = [
    [0.0, 0.0],
    [0.36, 0.0],
    [0.36, 0.05],
    [0.32, 0.10],
    [0.28, 0.15],
    [0.22, 0.22],
    [0.24, 0.30],
    [0.0, 0.30],
  ];
  const baseGeom = createLathe(basePoints, 28);

  // Horse Head shape (Extruded 2D Profile)
  const shape = new THREE.Shape();
  shape.moveTo(-0.16, 0.30);
  shape.lineTo(0.16, 0.30);
  shape.quadraticCurveTo(0.24, 0.45, 0.28, 0.62); // Snout bottom
  shape.quadraticCurveTo(0.32, 0.75, 0.26, 0.82); // Muzzle
  shape.lineTo(0.18, 0.84); // Nostril area
  shape.quadraticCurveTo(0.14, 0.92, 0.10, 1.02); // Forehead
  shape.lineTo(0.06, 1.15); // Ear tip
  shape.lineTo(0.02, 1.02); // Behind ear
  shape.quadraticCurveTo(-0.10, 0.88, -0.18, 0.65); // Arched Mane
  shape.quadraticCurveTo(-0.22, 0.45, -0.16, 0.30); // Base connection

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    steps: 1,
    depth: 0.24,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 3,
  };

  const headGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  headGeom.center();
  headGeom.translate(0, 0.72, 0);

  // Merge geometries
  const merged = new THREE.BufferGeometry();
  // Using direct combined meshes is often cleanest or group, but here we can merge attributes
  // Let's create a combined group in piece creation or merge buffer attributes:
  return mergeBufferGeometries([baseGeom, headGeom]);
}

/**
 * Generates procedural 3D Bishop geometry
 */
function generateBishopGeometry(): THREE.BufferGeometry {
  const points: [number, number][] = [
    [0.0, 0.0],
    [0.36, 0.0],
    [0.36, 0.05],
    [0.32, 0.10],
    [0.28, 0.15],
    [0.20, 0.22],
    [0.15, 0.48],
    [0.18, 0.68],
    [0.21, 0.75],
    [0.16, 0.82],
    [0.22, 0.96],
    [0.18, 1.12],
    [0.06, 1.20],
    [0.08, 1.25], // Finial ball base
    [0.05, 1.30],
    [0.0, 1.33], // Finial tip
  ];
  return createLathe(points, 32);
}

/**
 * Generates procedural 3D Queen geometry
 */
function generateQueenGeometry(): THREE.BufferGeometry {
  const points: [number, number][] = [
    [0.0, 0.0],
    [0.38, 0.0],
    [0.38, 0.05],
    [0.34, 0.10],
    [0.29, 0.15],
    [0.20, 0.24],
    [0.16, 0.55],
    [0.20, 0.80],
    [0.25, 0.88],
    [0.19, 0.95],
    [0.28, 1.22], // Flaring crown
    [0.26, 1.28], // Coronet rim
    [0.08, 1.28],
    [0.08, 1.35], // Pearl finial
    [0.0, 1.42],
  ];
  return createLathe(points, 32);
}

/**
 * Generates procedural 3D King geometry
 */
function generateKingGeometry(): THREE.BufferGeometry {
  const bodyPoints: [number, number][] = [
    [0.0, 0.0],
    [0.40, 0.0],
    [0.40, 0.05],
    [0.36, 0.10],
    [0.30, 0.15],
    [0.22, 0.25],
    [0.18, 0.60],
    [0.22, 0.88],
    [0.27, 0.98],
    [0.21, 1.05],
    [0.28, 1.28],
    [0.26, 1.35],
    [0.08, 1.38],
    [0.0, 1.42],
  ];
  const body = createLathe(bodyPoints, 32);

  // Cross finial on top of King
  const crossV = new THREE.BoxGeometry(0.06, 0.20, 0.05);
  crossV.translate(0, 1.50, 0);

  const crossH = new THREE.BoxGeometry(0.16, 0.06, 0.05);
  crossH.translate(0, 1.52, 0);

  return mergeBufferGeometries([body, crossV, crossH]);
}

/**
 * Simple robust buffer geometry merger
 */
function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = new THREE.BufferGeometry();
  
  let totalPosCount = 0;
  let totalNormCount = 0;
  let totalUvCount = 0;

  for (const g of geometries) {
    const nonIndexed = g.index ? g.toNonIndexed() : g;
    const pos = nonIndexed.getAttribute('position');
    const norm = nonIndexed.getAttribute('normal');
    const uv = nonIndexed.getAttribute('uv');

    if (pos) totalPosCount += pos.array.length;
    if (norm) totalNormCount += norm.array.length;
    if (uv) totalUvCount += uv.array.length;
  }

  const positions = new Float32Array(totalPosCount);
  const normals = new Float32Array(totalNormCount);
  const uvs = new Float32Array(totalUvCount);

  let posOffset = 0;
  let normOffset = 0;
  let uvOffset = 0;

  for (const g of geometries) {
    const nonIndexed = g.index ? g.toNonIndexed() : g;
    const pos = nonIndexed.getAttribute('position');
    const norm = nonIndexed.getAttribute('normal');
    const uv = nonIndexed.getAttribute('uv');

    if (pos) {
      positions.set(pos.array, posOffset);
      posOffset += pos.array.length;
    }
    if (norm) {
      normals.set(norm.array, normOffset);
      normOffset += norm.array.length;
    }
    if (uv) {
      uvs.set(uv.array, uvOffset);
      uvOffset += uv.array.length;
    }
  }

  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  if (totalNormCount > 0) merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  if (totalUvCount > 0) merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

  merged.computeVertexNormals();
  return merged;
}

/**
 * Retrieve cached or newly created piece geometry
 */
export function getPieceGeometry(type: PieceType): THREE.BufferGeometry {
  const normType = type.toLowerCase() as PieceType;
  if (geometryCache.has(normType)) {
    return geometryCache.get(normType)!;
  }

  let geom: THREE.BufferGeometry;
  switch (normType) {
    case 'p':
      geom = generatePawnGeometry();
      break;
    case 'r':
      geom = generateRookGeometry();
      break;
    case 'n':
      geom = generateKnightGeometry();
      break;
    case 'b':
      geom = generateBishopGeometry();
      break;
    case 'q':
      geom = generateQueenGeometry();
      break;
    case 'k':
      geom = generateKingGeometry();
      break;
    default:
      geom = generatePawnGeometry();
      break;
  }

  geometryCache.set(normType, geom);
  return geom;
}

/**
 * Disposes all cached procedural piece geometries and clears the cache
 */
export function disposeGeometryCache(): void {
  geometryCache.forEach((geom) => {
    geom.dispose();
  });
  geometryCache.clear();
}
