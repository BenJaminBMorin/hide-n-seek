import React from 'react';
import { Sensor } from '../types';
interface SensorManagerProps {
    sensors: Sensor[];
    onAddSensor: (sensor: Omit<Sensor, 'last_seen'>) => Promise<void>;
    onUpdateSensor: (sensorId: string, data: Partial<Sensor>) => Promise<void>;
    onDeleteSensor: (sensorId: string) => Promise<void>;
}
export declare const SensorManager: React.FC<SensorManagerProps>;
export {};
//# sourceMappingURL=SensorManager.d.ts.map