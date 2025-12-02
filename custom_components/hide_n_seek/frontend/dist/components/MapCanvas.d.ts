import React from 'react';
import { Sensor, TrackedDevice, Zone, Position, Point, FloorPlan } from '../types';
interface MapCanvasProps {
    sensors: Sensor[];
    devices: TrackedDevice[];
    zones: Zone[];
    positions: Record<string, Position>;
    selectedZone: Zone | null;
    onZoneClick: (zone: Zone) => void;
    onCanvasClick: (point: Point) => void;
    editMode: 'view' | 'draw' | 'edit';
    drawingPoints: Point[];
    floorPlan?: FloorPlan;
    showFloorPlan?: boolean;
}
export declare const MapCanvas: React.FC<MapCanvasProps>;
export {};
//# sourceMappingURL=MapCanvas.d.ts.map