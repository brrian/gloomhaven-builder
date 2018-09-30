export interface IProps {
  connections: IConnectionSet[];
  getAbsCoords: (x: number, y: number) => { x: number, y: number };
  handleTileMouseEnter: (name: string, rotation: number, orientation: string) => void;
  handleTileMouseLeave: () => void;
  hoveredTile: {
    name: string;
    orientation: string;
    rotation: number;
  };
  tiles: {
    [key: string]: ITileScenario;
  };
  scale: number;
}

export interface IState {
  availableConnections: IConnection[];
  tiles: ITileMap[];
}

export interface ITileMap extends ITileAsset {
  monsters: { [key: string]: IMonster };
  rotation: number;
  tokens: { [key: string]: IToken };
  x: number;
  y: number;
}

interface ITileScenario {
  id: string;
  monsters: IMonster[];
  rotation: number;
  tokens: IToken[];
}

export interface ITileAsset extends IBaseAsset {
  anchors: number[][];
  height: number;
  isHorizontal?: boolean;
  startHex: number[];
  width: number;
}

export interface IMonster extends IBaseAsset {
  pos: number[];
  type: {
    2: 'hidden' | 'normal' | 'elite';
    3: 'hidden' | 'normal' | 'elite';
    4: 'hidden' | 'normal' | 'elite';
  };
}

export interface IToken extends ITokenAsset {
  pos: number[];
  rotation: number;
}

export interface ITokenAsset extends IBaseAsset {
  hexes?: number;
  canOverlay?: boolean;
  isHorizontal?: boolean;
}

export interface IBaseAsset {
  id: string;
  name: string;
}

export interface IConnectionSet {
  anchor: IConnection;
  hook: IConnection;
}

export interface IConnection {
  tile: string;
  index: number;
};
