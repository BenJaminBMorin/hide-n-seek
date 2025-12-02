import React from 'react';
import { Sensor, TrackedDevice, Zone, Position, Point, FloorPlan, PositionRecord, Person } from '../types';
interface MapCanvasProps {
    sensors: Sensor[];
    devices: TrackedDevice[];
    zones: Zone[];
    positions: Record<string, Position>;
    selectedZone: Zone | null;
    onZoneClick: (zone: Zone) => void;
    onCanvasClick: (point: Point) => void;
    editMode: 'view' | 'draw' | 'edit' | 'draw_room';
    drawingPoints: Point[];
    floorPlan?: FloorPlan;
    showFloorPlan?: boolean;
    visualizationModes?: string[];
    historicalPositions?: Record<string, PositionRecord[]>;
    heatMapData?: Record<string, number>;
    persons?: Person[];
}
export declare const MapCanvas: React.FC<MapCanvasProps>;
export {};
//# sourceMappingURL=MapCanvas.d.ts.map