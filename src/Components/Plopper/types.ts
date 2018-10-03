import { IBaseAsset, ITileAsset, ITokenAsset } from "../../assets";
import { IHoveredTile, ItemPlopped } from "../Map/types";

export interface IProps {
  handleItemPlopped: ItemPlopped;
  hoveredTile: IHoveredTile;
  isAbleToPan: boolean;
  scale: number;
  x: number;
  y: number;
}

export interface IState {
  hexes?: number;
  listItems: PlopperItem[];
  listSource: PlopperItem[];
  listSelected?: PlopperItem;
  listVisible: boolean;
  listX: number;
  listY: number;
  plopperRotation: number;
  plopperVisible: boolean;
  type?: string;
}

export type PlopperItem = ITileAsset | ITokenAsset | IBaseAsset;
