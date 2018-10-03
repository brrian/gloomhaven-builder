import { ITileAsset } from "../../assets";
import {
  GetAbsCoords,
  IConnection,
  IHoveredTile,
  IMonster,
  IScenario,
  IToken,
  TileMouseEnter,
  TileMouseLeave,
} from "../Map/types";

export interface IProps {
  getAbsCoords: GetAbsCoords;
  handleTileMouseEnter: TileMouseEnter;
  handleTileMouseLeave: TileMouseLeave;
  hoveredTile: IHoveredTile;
  scale: number;
  scenario: IScenario;
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
