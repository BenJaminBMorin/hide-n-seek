import React from 'react';
import { FloorPlan, Point } from '../types';
interface FloorPlanEditorProps {
    floorPlan: FloorPlan;
    onUpdateDimensions: (width: number, height: number) => Promise<void>;
    onCreateRoom: (name: string, coordinates: Point[], color: string) => Promise<void>;
    onUpdateRoom: (roomId: string, name: string, coordinates: Point[], color: string) => Promise<void>;
    onDeleteRoom: (roomId: string) => Promise<void>;
    onEditModeChange: (mode: 'view' | 'draw_room') => void;
    editMode: 'view' | 'draw_room';
    drawingPoints: Point[];
    onClearDrawing: () => void;
}
export declare const FloorPlanEditor: React.FC<FloorPlanEditorProps>;
export {};
//# sourceMappingURL=FloorPlanEditor.d.ts.map