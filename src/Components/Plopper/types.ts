export interface IProps {
  handleItemPlopped: (item: IPlopperItem, type: string, x: number, y: number, rotation: number) => void;
  hoveredTile: IHoveredTile;
  isAbleToPan: boolean;
  scale: number;
  x: number;
  y: number;
}

export interface IState {
  hexes?: number;
  listItems: IPlopperItem[];
  listSource: IPlopperItem[];
  listSelected?: IPlopperItem;
  listVisible: boolean;
  listX: number;
  listY: number;
  plopperRotation: number;
  plopperVisible: boolean;
  type?: string;
}

interface IPlopperItem {
  id: string;
  name: string;
  hexes?: number;
  isHorizontal?: boolean;
}

export interface IHoveredTile {
  name: string;
  orientation: string;
  rotation: number;
}