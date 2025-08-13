export interface Point {
  x: number;
  y: number;
}

export interface Place {
  id: string;
  type: 'place';
  position: Point;
  name: string;
  tokens: number;
}

export interface Transition {
  id: string;
  type: 'transition';
  position: Point;
  name: string;
  isFirable: boolean;
}

export interface Arc {
  id: string;
  sourceId: string;
  destinationId: string;
}
