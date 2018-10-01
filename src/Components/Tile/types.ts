import { ITileMap } from "../Scenario/types";

export interface IProps extends ITileMap {
  handleMonsterTypeClick: (tileId: string, pos: number[], party: number) => void;
  handleTileMouseEnter: (tileId: string, rotation: number, tokenOrientation: string) => void;
  handleTileMouseLeave: () => void;
  isHorizontal?: boolean;
  order: number;
  scale: number;
  startHex: number[];
}

export interface IState {
  tokenHeight: number;
  tokenOrientation: string;
  tokenWidth: number;
}