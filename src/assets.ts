export interface ITileAsset extends IBaseAsset {
  anchors: number[][];
  height: number;
  isHorizontal?: boolean;
  startHex: number[];
  width: number;
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