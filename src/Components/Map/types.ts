import { IBaseAsset, ITokenAsset } from "../../assets";
import { PlopperItem } from "../Plopper/types";

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

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
  monsters: MonsterScenario[];
  rotation: number;
  tokens: TokenScenario[];
}

export type MonsterScenario = Omit<IMonster, 'name'>;

export interface IMonster extends IBaseAsset {
  pos: number[];
  type: {
    2: 'hidden' | 'normal' | 'elite';
    3: 'hidden' | 'normal' | 'elite';
    4: 'hidden' | 'normal' | 'elite';
  };
}

export type TokenScenario = Omit<IToken, 'name'>;

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