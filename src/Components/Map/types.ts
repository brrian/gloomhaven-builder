import { IBaseAsset, ITokenAsset } from "../../assets";
import { PlopperItem } from "../Plopper/types";

export interface IMapDefaultProps {
  scenario: IScenario;
}

export interface IMapProps extends Partial<IMapDefaultProps> {
}

export interface IMapState {
  hoveredTile: IHoveredTile;
  isAbleToPan: boolean;
  isPanning: boolean;
  mapX: number;
  mapY: number;
  mouseX: number;
  mouseY: number;
  scale: number;
}

export interface IScenario {
  connections: IConnectionSet[];
  tiles: {
    [key: string]: ITileScenario;
  };
}

export interface IConnectionSet {
  anchor: IConnection;
  hook: IConnection;
}

export interface IConnection {
  tile: string;
  index: number;
}

interface ITileScenario {
  id: string;
  monsters: IMonster[];
  rotation: number;
  tokens: IToken[];
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

export interface IHoveredTile {
  name: string;
  orientation: string;
  rotation: number;
}

export type ItemPlopped = (item: PlopperItem, type: string, x: number, y: number, rotation: number) => void;

export type TileMouseEnter = (name: string, rotation: number, orientation: string) => void;

export type TileMouseLeave = () => void;

export type GetAbsCoords = (x: number, y: number) => { x: number, y: number };