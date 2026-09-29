import * as THREE from 'three';

export type Board3DThemeId = 'wood' | 'marble' | 'cyber' | 'royal';

export interface Board3DThemeConfig {
  id: Board3DThemeId;
  name: string;
  lightSquareColor: number;
  darkSquareColor: number;
  frameColor: number;
  rimColor: number;
  whitePieceColor: number;
  blackPieceColor: number;
  whitePieceRoughness: number;
  whitePieceMetalness: number;
  blackPieceRoughness: number;
  blackPieceMetalness: number;
  whitePieceClearcoat?: number;
  blackPieceClearcoat?: number;
  boardRoughness: number;
  boardMetalness: number;
  ambientLightColor: number;
  ambientIntensity: number;
  keyLightColor: number;
  keyIntensity: number;
  bgColor: string;
}

export const BOARD_3D_THEMES: Record<Board3DThemeId, Board3DThemeConfig> = {
  wood: {
    id: 'wood',
    name: 'Walnut & Maple Wood',
    lightSquareColor: 0xe8d2b0, // Light maple
    darkSquareColor: 0x8b5a2b,  // Rich walnut
    frameColor: 0x3d2314,       // Deep mahogany frame
    rimColor: 0xd4af37,         // Gold coordinate inlay
    whitePieceColor: 0xf4eedc,  // Polished ivory / boxwood
    blackPieceColor: 0x221a15,  // Deep ebony wood
    whitePieceRoughness: 0.35,
    whitePieceMetalness: 0.05,
    blackPieceRoughness: 0.28,
    blackPieceMetalness: 0.12,
    whitePieceClearcoat: 0.3,
    blackPieceClearcoat: 0.4,
    boardRoughness: 0.3,
    boardMetalness: 0.1,
    ambientLightColor: 0xfff3e0,
    ambientIntensity: 1.2,
    keyLightColor: 0xffeedd,
    keyIntensity: 2.2,
    bgColor: '#0a0d14',
  },
  marble: {
    id: 'marble',
    name: 'Carrara & Obsidian Marble',
    lightSquareColor: 0xededed, // White Carrara
    darkSquareColor: 0x263238,  // Deep slate/obsidian
    frameColor: 0x182026,       // Dark polished granite
    rimColor: 0x90caf9,         // Silver/ice coordinate rim
    whitePieceColor: 0xf8f9fa,  // White polished marble
    blackPieceColor: 0x121619,  // Obsidian stone
    whitePieceRoughness: 0.15,
    whitePieceMetalness: 0.10,
    blackPieceRoughness: 0.12,
    blackPieceMetalness: 0.15,
    whitePieceClearcoat: 0.8,
    blackPieceClearcoat: 0.8,
    boardRoughness: 0.15,
    boardMetalness: 0.15,
    ambientLightColor: 0xe0f2fe,
    ambientIntensity: 1.3,
    keyLightColor: 0xffffff,
    keyIntensity: 2.4,
    bgColor: '#080c14',
  },
  cyber: {
    id: 'cyber',
    name: 'Cyberpunk Neon',
    lightSquareColor: 0x1e293b, // Dark metallic slate
    darkSquareColor: 0x0f172a,  // Midnight onyx
    frameColor: 0x030712,       // Carbon fiber border
    rimColor: 0x00f0ff,         // Cyan neon glow
    whitePieceColor: 0x00e5ff,  // Glowing Cyan Holo-Chrome
    blackPieceColor: 0xff0055,  // Crimson Laser Chrome
    whitePieceRoughness: 0.2,
    whitePieceMetalness: 0.85,
    blackPieceRoughness: 0.2,
    blackPieceMetalness: 0.85,
    whitePieceClearcoat: 0.9,
    blackPieceClearcoat: 0.9,
    boardRoughness: 0.2,
    boardMetalness: 0.6,
    ambientLightColor: 0x0e7490,
    ambientIntensity: 1.5,
    keyLightColor: 0x38bdf8,
    keyIntensity: 2.8,
    bgColor: '#030712',
  },
  royal: {
    id: 'royal',
    name: 'Royal Gold & Platinum',
    lightSquareColor: 0xe2e8f0, // Brushed platinum
    darkSquareColor: 0x334155,  // Gunmetal steel
    frameColor: 0x0f172a,       // Royal velvet rim
    rimColor: 0xf59e0b,         // Crown gold
    whitePieceColor: 0xfacc15,  // 24K Royal Gold
    blackPieceColor: 0x94a3b8,  // Polished Sterling Silver
    whitePieceRoughness: 0.15,
    whitePieceMetalness: 0.95,
    blackPieceRoughness: 0.12,
    blackPieceMetalness: 0.92,
    whitePieceClearcoat: 0.5,
    blackPieceClearcoat: 0.5,
    boardRoughness: 0.25,
    boardMetalness: 0.4,
    ambientLightColor: 0xfef3c7,
    ambientIntensity: 1.4,
    keyLightColor: 0xffedd5,
    keyIntensity: 2.5,
    bgColor: '#090d16',
  },
};
