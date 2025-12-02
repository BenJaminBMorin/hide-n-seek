import React from 'react';
interface TimeSliderProps {
    minTime: number;
    maxTime: number;
    currentTime: number;
    onTimeChange: (time: number) => void;
    playing: boolean;
    onPlayPause: () => void;
    playbackSpeed: number;
    onSpeedChange: (speed: number) => void;
    visualizationModes: string[];
    onVisualizationModeChange: (modes: string[]) => void;
}
export declare const TimeSlider: React.FC<TimeSliderProps>;
export {};
//# sourceMappingURL=TimeSlider.d.ts.map