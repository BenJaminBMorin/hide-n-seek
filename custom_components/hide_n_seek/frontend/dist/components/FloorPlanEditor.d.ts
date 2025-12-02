import React from 'react';
import { FloorPlan, Point, Wall } from '../types';
interface FloorPlanEditorProps {
    floorPlan: FloorPlan;
    onUpdateDimensions: (width: number, height: number) => Promise<void>;
    onCreateRoom: (name: string, coordinates: Point[], color: string) => Promise<void>;
    onUpdateRoom: (roomId: string, name: string, coordinates: Point[], color: string) => Promise<void>;
    onDeleteRoom: (roomId: string) => Promise<void>;
    onCreateWall: (start: Point, end: Point, thickness: number, color: string, type: string) => Promise<void>;
    onUpdateWall: (wallId: string, wall: Partial<Wall>) => Promise<void>;
    onDeleteWall: (wallId: string) => Promise<void>;
    onEditModeChange: (mode: 'view' | 'draw' | 'edit' | 'draw_room' | 'draw_wall' | 'edit_wall') => void;
    editMode: 'view' | 'draw' | 'edit' | 'draw_room' | 'draw_wall' | 'edit_wall';
    drawingPoints: Point[];
    onClearDrawing: () => void;
}
export declare const FloorPlanEditor: React.FC<FloorPlanEditorProps>;
export {};
//# sourceMappingURL=FloorPlanEditor.d.ts.map