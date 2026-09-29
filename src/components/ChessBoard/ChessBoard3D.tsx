import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Chess, Square } from 'chess.js';
import { PieceColor } from '../../types/chess';
import { getPieceGeometry } from './three/pieceGeometries';
import { BOARD_3D_THEMES, Board3DThemeId } from './three/boardThemes';
import { PromotionModal } from './PromotionModal';
import { sound } from '../../utils/sound';
import { 
  Rotate3d, 
  Sparkles, 
  Compass, 
  Layers
} from 'lucide-react';

export interface ChessBoard3DProps {
  chess: Chess;
  isFlipped?: boolean;
  playerColor?: PieceColor;
  onMove: (move: { from: string; to: string; promotion?: string }) => boolean;
  disabled?: boolean;
  lastMove?: { from: string; to: string } | null;
  bestMoveHint?: { from: string; to: string } | null;
  boardTheme?: string;
  showCoordinates?: boolean;
  showLegalMoves?: boolean;
  autoQueen?: boolean;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

function map2DThemeTo3D(theme2D?: string): Board3DThemeId {
  if (!theme2D) return 'wood';
  if (theme2D === 'marble' || theme2D === 'midnight' || theme2D === 'cobalt') return 'marble';
  if (theme2D === 'cyber') return 'cyber';
  if (theme2D === 'wood') return 'wood';
  if (theme2D === 'emerald') return 'royal';
  return 'wood';
}

function squareToWorld(square: string, isFlipped: boolean = false): { x: number; z: number } {
  const fileIdx = FILES.indexOf(square[0] as any);
  const rankIdx = parseInt(square[1], 10) - 1;

  if (fileIdx === -1 || rankIdx < 0 || rankIdx > 7) {
    return { x: 0, z: 0 };
  }

  let x = fileIdx - 3.5;
  let z = -(rankIdx - 3.5);

  if (isFlipped) {
    x = -x;
    z = -z;
  }

  return { x, z };
}

function worldToSquare(x: number, z: number, isFlipped: boolean = false): string | null {
  let fileIdx = Math.round(x + 3.5);
  let rankIdx = Math.round(-z + 3.5);

  if (isFlipped) {
    fileIdx = 7 - fileIdx;
    rankIdx = 7 - rankIdx;
  }

  if (fileIdx < 0 || fileIdx > 7 || rankIdx < 0 || rankIdx > 7) {
    return null;
  }

  return `${FILES[fileIdx]}${rankIdx + 1}`;
}

function recursivelyDispose(obj: THREE.Object3D) {
  if ((obj as any).geometry) {
    (obj as any).geometry.dispose();
  }
  if ((obj as any).material) {
    if (Array.isArray((obj as any).material)) {
      (obj as any).material.forEach((mat: THREE.Material) => mat.dispose());
    } else {
      (obj as any).material.dispose();
    }
  }
  while (obj.children && obj.children.length > 0) {
    const child = obj.children[0];
    recursivelyDispose(child);
    obj.remove(child);
  }
}

export const ChessBoard3D: React.FC<ChessBoard3DProps> = ({
  chess,
  isFlipped = false,
  playerColor = 'w',
  onMove,
  disabled = false,
  lastMove,
  bestMoveHint,
  boardTheme,
  showCoordinates = true,
  showLegalMoves = true,
  autoQueen = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [themeId, setThemeId] = useState<Board3DThemeId>(() => map2DThemeTo3D(boardTheme));
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [promotionPending, setPromotionPending] = useState<{ from: string; to: string } | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [cameraPreset, setCameraPreset] = useState<'perspective' | 'top' | 'isometric'>('perspective');

  // Synchronize with external 2D theme if boardTheme changes
  useEffect(() => {
    if (boardTheme) {
      setThemeId(map2DThemeTo3D(boardTheme));
    }
  }, [boardTheme]);

  // Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const piecesGroupRef = useRef<THREE.Group | null>(null);
  const indicatorsGroupRef = useRef<THREE.Group | null>(null);
  const pieceMeshMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Demand-driven rendering trigger
  const needsRenderRef = useRef<boolean>(true);
  const requestRender = useCallback(() => {
    needsRenderRef.current = true;
  }, []);

  const theme = BOARD_3D_THEMES[themeId] || BOARD_3D_THEMES.wood;

  // Legal destinations
  const legalDestinations = useMemo(() => {
    if (!selectedSquare) return [];
    try {
      const moves = chess.moves({ square: selectedSquare as Square, verbose: true });
      return moves.map((m) => m.to);
    } catch {
      return [];
    }
  }, [chess, selectedSquare]);

  // King in check square
  const inCheck = chess.inCheck();
  const checkSquare = useMemo(() => {
    if (!inCheck) return null;
    const turn = chess.turn();
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = board[r][f];
        if (piece && piece.type === 'k' && piece.color === turn) {
          return `${FILES[f]}${8 - r}`;
        }
      }
    }
    return null;
  }, [chess, inCheck]);

  // 1. Initial Scene Setup with Demand-Driven RAF & Cleanup
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 480;
    const height = container.clientHeight || 480;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    const initialCamZ = isFlipped ? -8.5 : 8.5;
    camera.position.set(0, 8.5, initialCamZ);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer with safe devicePixelRatio
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 4.5;
    controls.maxDistance = 20.0;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Trigger render when user orbits or zooms
    controls.addEventListener('change', () => {
      needsRenderRef.current = true;
    });

    // Groups
    const piecesGroup = new THREE.Group();
    piecesGroupRef.current = piecesGroup;
    scene.add(piecesGroup);

    const indicatorsGroup = new THREE.Group();
    indicatorsGroupRef.current = indicatorsGroup;
    scene.add(indicatorsGroup);

    // Resize Observer / Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 480;
      const h = container.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      needsRenderRef.current = true;
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    // Animation Loop (Render only when dirty or autoRotate is active)
    let animationFrameId: number;
    let isRunning = true;

    const animate = () => {
      if (!isRunning) return;
      animationFrameId = requestAnimationFrame(animate);

      let dampingActive = false;
      if (controls) {
        controls.update();
        if (controls.autoRotate) {
          needsRenderRef.current = true;
        }
      }

      if (needsRenderRef.current) {
        renderer.render(scene, camera);
        needsRenderRef.current = false;
      }
    };
    animate();

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);

      controls.dispose();

      // Dispose all scene objects
      scene.children.forEach((child) => {
        recursivelyDispose(child);
      });
      scene.clear();

      renderer.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update camera on flip
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const controls = controlsRef.current;
    
    if (cameraPreset === 'perspective') {
      const targetZ = isFlipped ? -8.5 : 8.5;
      cam.position.set(0, 8.5, targetZ);
      cam.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      requestRender();
    }
  }, [isFlipped, cameraPreset, requestRender]);

  // Auto-rotate toggle
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
      controlsRef.current.autoRotateSpeed = 1.2;
      requestRender();
    }
  }, [autoRotate, requestRender]);

  // 2. Build 3D Board and Environment according to Theme
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear existing environment meshes (retain pieces and indicators group)
    const toRemove: THREE.Object3D[] = [];
    scene.children.forEach((child) => {
      if (child !== piecesGroupRef.current && child !== indicatorsGroupRef.current) {
        toRemove.push(child);
      }
    });
    toRemove.forEach((c) => {
      recursivelyDispose(c);
      scene.remove(c);
    });

    scene.background = new THREE.Color(theme.bgColor);

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(theme.ambientLightColor, theme.ambientIntensity);
    scene.add(ambientLight);

    // Directional Key Light with Soft Shadows
    const keyLight = new THREE.DirectionalLight(theme.keyLightColor, theme.keyIntensity);
    keyLight.position.set(6, 14, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.bias = -0.0005;
    const d = 6;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    scene.add(keyLight);

    // Soft Rim & Bounce Light
    const rimLight = new THREE.DirectionalLight(0x90caf9, 0.7);
    rimLight.position.set(-6, 8, -8);
    scene.add(rimLight);

    const bounceLight = new THREE.DirectionalLight(0xfff176, 0.25);
    bounceLight.position.set(0, -4, 0);
    scene.add(bounceLight);

    // 3D Board Group
    const boardGroup = new THREE.Group();

    // 1. Board Frame Casing
    const baseGeom = new THREE.BoxGeometry(9.6, 0.45, 9.6);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: theme.frameColor,
      roughness: theme.boardRoughness + 0.1,
      metalness: theme.boardMetalness,
    });
    const baseMesh = new THREE.Mesh(baseGeom, frameMaterial);
    baseMesh.position.y = -0.25;
    baseMesh.receiveShadow = true;
    boardGroup.add(baseMesh);

    // 2. Inlaid Gold / Metal Coordinate Rim
    const rimGeom = new THREE.BoxGeometry(8.5, 0.05, 8.5);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: theme.rimColor,
      roughness: 0.2,
      metalness: 0.8,
    });
    const rimMesh = new THREE.Mesh(rimGeom, rimMaterial);
    rimMesh.position.y = 0.01;
    rimMesh.receiveShadow = true;
    boardGroup.add(rimMesh);

    // 3. 64 Individual Square Tiles
    const tileGeom = new THREE.BoxGeometry(0.98, 0.06, 0.98);
    const lightSquareMat = new THREE.MeshStandardMaterial({
      color: theme.lightSquareColor,
      roughness: theme.boardRoughness,
      metalness: theme.boardMetalness,
    });
    const darkSquareMat = new THREE.MeshStandardMaterial({
      color: theme.darkSquareColor,
      roughness: theme.boardRoughness,
      metalness: theme.boardMetalness,
    });

    for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
      for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
        const isLight = (fileIdx + rankIdx) % 2 !== 0;
        const tileMesh = new THREE.Mesh(tileGeom, isLight ? lightSquareMat : darkSquareMat);
        const sq = `${FILES[fileIdx]}${rankIdx + 1}`;
        const { x, z } = squareToWorld(sq, false);

        tileMesh.position.set(x, 0.03, z);
        tileMesh.receiveShadow = true;
        tileMesh.name = `square_${sq}`;
        tileMesh.userData = { square: sq };
        boardGroup.add(tileMesh);
      }
    }

    // 4. Ground Reflection Plane
    const groundGeom = new THREE.PlaneGeometry(30, 30);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x05070a,
      roughness: 0.8,
      metalness: 0.1,
    });
    const groundMesh = new THREE.Mesh(groundGeom, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.5;
    groundMesh.receiveShadow = true;
    boardGroup.add(groundMesh);

    scene.add(boardGroup);
    requestRender();
  }, [theme, requestRender]);

  // 3. Update 3D Pieces based on chess state
  useEffect(() => {
    const piecesGroup = piecesGroupRef.current;
    if (!piecesGroup) return;

    // Dispose and clear existing piece meshes
    while (piecesGroup.children.length > 0) {
      const child = piecesGroup.children[0];
      recursivelyDispose(child);
      piecesGroup.remove(child);
    }
    pieceMeshMapRef.current.clear();

    const whitePieceMat = new THREE.MeshStandardMaterial({
      color: theme.whitePieceColor,
      roughness: theme.whitePieceRoughness,
      metalness: theme.whitePieceMetalness,
    });
    const blackPieceMat = new THREE.MeshStandardMaterial({
      color: theme.blackPieceColor,
      roughness: theme.blackPieceRoughness,
      metalness: theme.blackPieceMetalness,
    });

    const board = chess.board();

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = board[r][f];
        if (!piece) continue;

        const square = `${FILES[f]}${8 - r}`;
        const geom = getPieceGeometry(piece.type);
        const mat = piece.color === 'w' ? whitePieceMat : blackPieceMat;
        const mesh = new THREE.Mesh(geom, mat);

        const { x, z } = squareToWorld(square, isFlipped);
        const isSelected = selectedSquare === square;
        mesh.position.set(x, isSelected ? 0.35 : 0.05, z);

        if (piece.type === 'n') {
          mesh.rotation.y = piece.color === 'w' 
            ? (isFlipped ? Math.PI : 0) 
            : (isFlipped ? 0 : Math.PI);
        }

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.name = `piece_${square}`;
        mesh.userData = { square, piece };

        piecesGroup.add(mesh);
        pieceMeshMapRef.current.set(square, mesh);
      }
    }
    requestRender();
  }, [chess, isFlipped, selectedSquare, theme, requestRender]);

  // 4. Render 3D Indicators (Selected, Legal Moves, Check, Last Move)
  useEffect(() => {
    const indicatorsGroup = indicatorsGroupRef.current;
    if (!indicatorsGroup) return;

    while (indicatorsGroup.children.length > 0) {
      const child = indicatorsGroup.children[0];
      recursivelyDispose(child);
      indicatorsGroup.remove(child);
    }

    // A. Selected Square Ring
    if (selectedSquare) {
      const { x, z } = squareToWorld(selectedSquare, isFlipped);
      const ringGeom = new THREE.RingGeometry(0.25, 0.44, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.07, z);
      indicatorsGroup.add(ring);
    }

    // B. Legal Move Dots / Capture Rings
    if (showLegalMoves && selectedSquare && legalDestinations.length > 0) {
      legalDestinations.forEach((destSquare) => {
        const { x, z } = squareToWorld(destSquare, isFlipped);
        const targetPiece = chess.get(destSquare as Square);

        if (targetPiece) {
          const captureRingGeom = new THREE.RingGeometry(0.36, 0.46, 32);
          const captureRingMat = new THREE.MeshBasicMaterial({
            color: 0xef4444,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
          });
          const captureRing = new THREE.Mesh(captureRingGeom, captureRingMat);
          captureRing.rotation.x = -Math.PI / 2;
          captureRing.position.set(x, 0.07, z);
          indicatorsGroup.add(captureRing);
        } else {
          const discGeom = new THREE.CircleGeometry(0.16, 24);
          const discMat = new THREE.MeshBasicMaterial({
            color: 0x00e5ff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.75,
          });
          const disc = new THREE.Mesh(discGeom, discMat);
          disc.rotation.x = -Math.PI / 2;
          disc.position.set(x, 0.07, z);
          indicatorsGroup.add(disc);
        }
      });
    }

    // C. King in Check Warning Ring
    if (checkSquare) {
      const { x, z } = squareToWorld(checkSquare, isFlipped);
      const checkGeom = new THREE.RingGeometry(0.1, 0.48, 32);
      const checkMat = new THREE.MeshBasicMaterial({
        color: 0xdc2626,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const checkRing = new THREE.Mesh(checkGeom, checkMat);
      checkRing.rotation.x = -Math.PI / 2;
      checkRing.position.set(x, 0.07, z);
      indicatorsGroup.add(checkRing);
    }

    // D. Last Move Highlight
    if (lastMove) {
      [lastMove.from, lastMove.to].forEach((sq) => {
        const { x, z } = squareToWorld(sq, isFlipped);
        const lastGeom = new THREE.PlaneGeometry(0.92, 0.92);
        const lastMat = new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.28,
        });
        const plane = new THREE.Mesh(lastGeom, lastMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.set(x, 0.065, z);
        indicatorsGroup.add(plane);
      });
    }

    requestRender();
  }, [selectedSquare, legalDestinations, checkSquare, lastMove, isFlipped, showLegalMoves, chess, requestRender]);

  // 5. User Click / Interaction Handling
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || !mountRef.current || !cameraRef.current || !sceneRef.current) return;

      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);
      if (intersects.length === 0) {
        setSelectedSquare(null);
        return;
      }

      let clickedSquare: string | null = null;
      for (const hit of intersects) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj && obj !== sceneRef.current) {
          if (obj.userData && obj.userData.square) {
            clickedSquare = obj.userData.square;
            break;
          }
          obj = obj.parent;
        }
        if (clickedSquare) break;
      }

      if (!clickedSquare) {
        for (const hit of intersects) {
          if (Math.abs(hit.point.y) < 0.8) {
            clickedSquare = worldToSquare(hit.point.x, hit.point.z, isFlipped);
            if (clickedSquare) break;
          }
        }
      }

      if (!clickedSquare) {
        setSelectedSquare(null);
        return;
      }

      const pieceAtClicked = chess.get(clickedSquare as Square);

      if (selectedSquare) {
        if (selectedSquare === clickedSquare) {
          setSelectedSquare(null);
          return;
        }

        const isLegal = legalDestinations.includes(clickedSquare as Square);

        if (isLegal) {
          const movingPiece = chess.get(selectedSquare as Square);
          const isPawnPromotion =
            movingPiece?.type === 'p' &&
            ((movingPiece.color === 'w' && clickedSquare[1] === '8') ||
              (movingPiece.color === 'b' && clickedSquare[1] === '1'));

          if (isPawnPromotion && !autoQueen) {
            setPromotionPending({ from: selectedSquare, to: clickedSquare });
            return;
          }

          const promotionPiece = isPawnPromotion && autoQueen ? 'q' : undefined;
          const success = onMove({
            from: selectedSquare,
            to: clickedSquare,
            promotion: promotionPiece,
          });

          if (success) {
            sound.playMove();
            setSelectedSquare(null);
            return;
          }
        }

        if (pieceAtClicked && pieceAtClicked.color === chess.turn()) {
          setSelectedSquare(clickedSquare);
          return;
        }

        setSelectedSquare(null);
      } else {
        if (pieceAtClicked && pieceAtClicked.color === chess.turn()) {
          setSelectedSquare(clickedSquare);
        }
      }
    },
    [disabled, chess, selectedSquare, legalDestinations, isFlipped, autoQueen, onMove]
  );

  const handleSelectCameraPreset = (preset: 'perspective' | 'top' | 'isometric') => {
    setCameraPreset(preset);
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const controls = controlsRef.current;

    if (preset === 'perspective') {
      const targetZ = isFlipped ? -8.5 : 8.5;
      cam.position.set(0, 8.5, targetZ);
      cam.lookAt(0, 0, 0);
    } else if (preset === 'top') {
      const targetZ = isFlipped ? -0.1 : 0.1;
      cam.position.set(0, 12, targetZ);
      cam.lookAt(0, 0, 0);
    } else if (preset === 'isometric') {
      const targetZ = isFlipped ? -7.0 : 7.0;
      const targetX = isFlipped ? -7.0 : 7.0;
      cam.position.set(targetX, 9.0, targetZ);
      cam.lookAt(0, 0, 0);
    }
    controls.target.set(0, 0, 0);
    controls.update();
    requestRender();
  };

  const handlePromotionSelect = (pieceType: string) => {
    if (!promotionPending) return;
    onMove({
      from: promotionPending.from,
      to: promotionPending.to,
      promotion: pieceType,
    });
    setPromotionPending(null);
    setSelectedSquare(null);
  };

  return (
    <div className="relative w-full aspect-square max-w-[min(94vw,540px,72vh)] mx-auto rounded-2xl overflow-hidden bg-[#070c14] border border-slate-800 shadow-xl group select-none">
      {/* Three.js Canvas Mount */}
      <div
        ref={mountRef}
        onClick={handleCanvasClick}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
      />

      {/* Floating 3D Controls Overlay */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-[#0c1424]/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-md z-10 text-xs">
        {/* Camera Preset Quick Buttons */}
        <button
          onClick={() => handleSelectCameraPreset('perspective')}
          aria-label="3D Perspective View"
          title="Angled 3D Perspective"
          className={`px-2 py-1 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer ${
            cameraPreset === 'perspective'
              ? 'bg-slate-800 text-sky-400 border border-slate-700/80 font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Rotate3d className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">3D</span>
        </button>

        <button
          onClick={() => handleSelectCameraPreset('top')}
          aria-label="Top-Down View"
          title="Top-Down Tactical 3D View"
          className={`px-2 py-1 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer ${
            cameraPreset === 'top'
              ? 'bg-slate-800 text-sky-400 border border-slate-700/80 font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">Top</span>
        </button>

        <button
          onClick={() => setAutoRotate((prev) => !prev)}
          aria-label="Toggle Auto-Rotation"
          title="Auto-Spin Showcase Camera"
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            autoRotate
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>

        {/* 3D Theme Switcher */}
        <div className="relative">
          <select
            value={themeId}
            onChange={(e) => {
              setThemeId(e.target.value as Board3DThemeId);
              requestRender();
            }}
            aria-label="Select 3D Board Theme"
            className="bg-slate-900 border border-slate-700/80 text-slate-200 text-[11px] font-medium rounded-lg px-2 py-1 focus:outline-none focus:border-sky-400 cursor-pointer"
          >
            <option value="wood">🪵 Wood</option>
            <option value="marble">🏛️ Marble</option>
            <option value="cyber">⚡ Cyber</option>
            <option value="royal">👑 Gold</option>
          </select>
        </div>
      </div>

      {/* Camera Guidance Hint */}
      <div className="absolute bottom-2.5 left-2.5 pointer-events-none bg-[#0c1424]/80 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5 hidden sm:flex">
        <Compass className="w-3 h-3 text-sky-400" />
        <span>Drag to orbit • Scroll to zoom • Tap piece to move</span>
      </div>

      {/* Promotion Modal Overlay */}
      {promotionPending && (
        <PromotionModal
          isOpen={true}
          turn={chess.turn()}
          onSelectPromotion={handlePromotionSelect}
        />
      )}
    </div>
  );
};
