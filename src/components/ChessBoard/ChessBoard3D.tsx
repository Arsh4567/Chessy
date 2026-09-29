import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Chess, Square } from 'chess.js';
import { PieceColor, PieceType } from '../../types/chess';
import { getPieceGeometry } from './three/pieceGeometries';
import { BOARD_3D_THEMES, Board3DThemeId } from './three/boardThemes';
import { PromotionModal } from './PromotionModal';
import { sound } from '../../utils/sound';
import { 
  Rotate3d, 
  Eye, 
  Palette, 
  Maximize2, 
  Sparkles, 
  Compass, 
  Layers,
  ChevronDown
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
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

// Helper to calculate 3D world position from algebraic square
function squareToWorld(square: string, isFlipped: boolean = false): { x: number; z: number } {
  const fileIdx = FILES.indexOf(square[0] as any);
  const rankIdx = parseInt(square[1], 10) - 1;

  if (fileIdx === -1 || rankIdx < 0 || rankIdx > 7) {
    return { x: 0, z: 0 };
  }

  // Centered from -3.5 to +3.5
  let x = fileIdx - 3.5;
  let z = -(rankIdx - 3.5); // rank 1 at z = +3.5 (near white), rank 8 at z = -3.5

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

export const ChessBoard3D: React.FC<ChessBoard3DProps> = ({
  chess,
  isFlipped = false,
  playerColor = 'w',
  onMove,
  disabled = false,
  lastMove,
  bestMoveHint,
  showCoordinates = true,
  showLegalMoves = true,
  autoQueen = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [themeId, setThemeId] = useState<Board3DThemeId>('wood');
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [promotionPending, setPromotionPending] = useState<{ from: string; to: string } | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [cameraPreset, setCameraPreset] = useState<'perspective' | 'top' | 'isometric'>('perspective');

  // Internal Three.js references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const piecesGroupRef = useRef<THREE.Group | null>(null);
  const indicatorsGroupRef = useRef<THREE.Group | null>(null);
  const pieceMeshMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Current active theme configuration
  const theme = BOARD_3D_THEMES[themeId] || BOARD_3D_THEMES.wood;

  // Compute legal destination squares for selected piece
  const legalDestinations = useMemo(() => {
    if (!selectedSquare) return [];
    try {
      const moves = chess.moves({ square: selectedSquare as Square, verbose: true });
      return moves.map((m) => m.to);
    } catch {
      return [];
    }
  }, [chess, selectedSquare]);

  // Is King in check?
  const inCheck = chess.inCheck();
  const checkSquare = useMemo(() => {
    if (!inCheck) return null;
    const turn = chess.turn();
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = board[r][f];
        if (piece && piece.type === 'k' && piece.color === turn) {
          const square = `${FILES[f]}${8 - r}`;
          return square;
        }
      }
    }
    return null;
  }, [chess, inCheck]);

  // 1. Initial Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 540;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    const initialCamZ = isFlipped ? -8.5 : 8.5;
    camera.position.set(0, 8.5, initialCamZ);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't allow camera to go underneath the board
    controls.minDistance = 5.0;
    controls.maxDistance = 22.0;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Pieces and indicators groups
    const piecesGroup = new THREE.Group();
    piecesGroupRef.current = piecesGroup;
    scene.add(piecesGroup);

    const indicatorsGroup = new THREE.Group();
    indicatorsGroupRef.current = indicatorsGroup;
    scene.add(indicatorsGroup);

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 540;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (controls) {
        controls.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  // Update camera when flipped
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const controls = controlsRef.current;
    
    if (cameraPreset === 'perspective') {
      const targetZ = isFlipped ? -8.5 : 8.5;
      cam.position.set(0, 8.5, targetZ);
      cam.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
    }
  }, [isFlipped, cameraPreset]);

  // Handle auto-rotation
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
      controlsRef.current.autoRotateSpeed = 1.2;
    }
  }, [autoRotate]);

  // 2. Build 3D Board and Lighting according to active Theme
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear existing environment meshes (keep pieces and indicators group)
    const toRemove: THREE.Object3D[] = [];
    scene.children.forEach((child) => {
      if (child !== piecesGroupRef.current && child !== indicatorsGroupRef.current) {
        toRemove.push(child);
      }
    });
    toRemove.forEach((c) => scene.remove(c));

    scene.background = new THREE.Color(theme.bgColor);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(theme.ambientLightColor, theme.ambientIntensity);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(theme.keyLightColor, theme.keyIntensity);
    keyLight.position.set(6, 14, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.bias = -0.0005;
    const d = 6;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    scene.add(keyLight);

    // Soft fill rim light from the opposite side
    const rimLight = new THREE.DirectionalLight(0x90caf9, 0.8);
    rimLight.position.set(-6, 8, -8);
    scene.add(rimLight);

    // Warm underside bounce light
    const bounceLight = new THREE.DirectionalLight(0xfff176, 0.3);
    bounceLight.position.set(0, -4, 0);
    scene.add(bounceLight);

    // --- 3D Chessboard Construction ---
    const boardGroup = new THREE.Group();

    // 1. Board Frame / Casing (Beveled Wooden/Stone Base)
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

    // 2. Inlaid Gold / Metal Border Rim
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

    // 3. 64 Individual Square Tiles with subtle bevels
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

    // 4. Subtle Ground Reflection Plane
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
  }, [theme]);

  // 3. Update 3D Pieces based on chess state
  useEffect(() => {
    const piecesGroup = piecesGroupRef.current;
    if (!piecesGroup) return;

    // Clear existing piece meshes
    while (piecesGroup.children.length > 0) {
      const child = piecesGroup.children[0];
      piecesGroup.remove(child);
    }
    pieceMeshMapRef.current.clear();

    // Piece materials
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
        
        // Slight vertical elevation if selected
        const isSelected = selectedSquare === square;
        mesh.position.set(x, isSelected ? 0.35 : 0.05, z);
        
        // Orient knights and pieces naturally
        if (piece.type === 'n') {
          // Point white knights toward black, black knights toward white
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
  }, [chess, isFlipped, selectedSquare, theme]);

  // 4. Render 3D Highlights (Selected, Legal Moves, Checks, Last Move)
  useEffect(() => {
    const indicatorsGroup = indicatorsGroupRef.current;
    if (!indicatorsGroup) return;

    // Clear previous indicators
    while (indicatorsGroup.children.length > 0) {
      indicatorsGroup.remove(indicatorsGroup.children[0]);
    }

    // A. Selected Square Ring
    if (selectedSquare) {
      const { x, z } = squareToWorld(selectedSquare, isFlipped);
      const ringGeom = new THREE.RingGeometry(0.25, 0.44, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.07, z);
      indicatorsGroup.add(ring);
    }

    // B. Legal Move Dots / Target Capture Rings
    if (showLegalMoves && selectedSquare && legalDestinations.length > 0) {
      legalDestinations.forEach((destSquare) => {
        const { x, z } = squareToWorld(destSquare, isFlipped);
        const targetPiece = chess.get(destSquare as Square);

        if (targetPiece) {
          // Capture target: Red outer pulsing ring
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
          // Safe destination: Glowing cyan disc
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

    // C. King in Check Warning Beacon
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

    // D. Last Move Glow
    if (lastMove) {
      [lastMove.from, lastMove.to].forEach((sq) => {
        const { x, z } = squareToWorld(sq, isFlipped);
        const lastGeom = new THREE.PlaneGeometry(0.92, 0.92);
        const lastMat = new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.3,
        });
        const plane = new THREE.Mesh(lastGeom, lastMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.set(x, 0.065, z);
        indicatorsGroup.add(plane);
      });
    }
  }, [selectedSquare, legalDestinations, checkSquare, lastMove, isFlipped, showLegalMoves, chess]);

  // 5. User Interaction & 3D Raycasting
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || !mountRef.current || !cameraRef.current || !sceneRef.current) return;

      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      // Intersect with pieces and board
      const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);
      if (intersects.length === 0) {
        setSelectedSquare(null);
        return;
      }

      // Find clicked square or piece
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

      // Fallback: Calculate from intersection point on board plane
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

      // Case 1: Already have a piece selected, attempting to make a move
      if (selectedSquare) {
        if (selectedSquare === clickedSquare) {
          // Deselect
          setSelectedSquare(null);
          return;
        }

        // Is this a legal move?
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

        // If clicking another piece of the player's own color, switch selection
        if (pieceAtClicked && pieceAtClicked.color === chess.turn()) {
          setSelectedSquare(clickedSquare);
          return;
        }

        setSelectedSquare(null);
      } else {
        // Case 2: No piece selected yet, select if it's the current player's piece
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
    <div className="relative w-full aspect-square max-w-[620px] mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl group select-none">
      {/* Three.js Canvas Mount */}
      <div
        ref={mountRef}
        onClick={handleCanvasClick}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Floating 3D Controls Overlay */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/60 shadow-lg z-10 text-xs">
        {/* Camera Preset Quick Buttons */}
        <button
          onClick={() => handleSelectCameraPreset('perspective')}
          title="Angled 3D Perspective"
          className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer ${
            cameraPreset === 'perspective'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Rotate3d className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">3D</span>
        </button>

        <button
          onClick={() => handleSelectCameraPreset('top')}
          title="Top-Down Tactical 3D View"
          className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 cursor-pointer ${
            cameraPreset === 'top'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Top</span>
        </button>

        <button
          onClick={() => setAutoRotate((prev) => !prev)}
          title="Auto-Spin Showcase Camera"
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            autoRotate
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>

        {/* 3D Theme Switcher */}
        <div className="relative group/theme">
          <select
            value={themeId}
            onChange={(e) => setThemeId(e.target.value as Board3DThemeId)}
            className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1.5 border border-slate-700 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="wood">🪵 Wood</option>
            <option value="marble">🏛️ Marble</option>
            <option value="cyber">⚡ Cyber</option>
            <option value="royal">👑 Gold</option>
          </select>
        </div>
      </div>

      {/* Camera Guidance Hint */}
      <div className="absolute bottom-3 left-3 pointer-events-none bg-slate-900/75 backdrop-blur-sm px-2.5 py-1 rounded-md border border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5">
        <Compass className="w-3 h-3 text-sky-400" />
        <span>Drag to orbit • Scroll to zoom • Click piece to move</span>
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
