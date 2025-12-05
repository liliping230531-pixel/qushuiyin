export interface Point {
  x: number;
  y: number;
}

export interface Path {
  points: Point[];
  size: number;
}

export enum ToolMode {
  DRAW = 'draw',
  PAN = 'pan',
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface RemoveWatermarkResponse {
  imageUrl: string;
}
