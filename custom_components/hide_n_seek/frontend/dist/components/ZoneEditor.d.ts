import React from 'react';
import { Zone, Point } from '../types';
interface ZoneEditorProps {
    zones: Zone[];
    selectedZone: Zone | null;
    onSelectZone: (zone: Zone | null) => void;
    onCreateZone: (name: string, coordinates: Point[], color: string) => void;
    onUpdateZone: (zone: Zone) => void;
    onDeleteZone: (zoneId: string) => void;
    editMode: 'view' | 'draw' | 'edit' | 'draw_room';
    onEditModeChange: (mode: 'view' | 'draw' | 'edit' | 'draw_room') => void;
    drawingPoints: Point[];
    onClearDrawing: () => void;
}
export declare const ZoneEditor: React.FC<ZoneEditorProps>;
export {};
//# sourceMappingURL=ZoneEditor.d.ts.map