export interface Sensor {
    id: string;
    name: string;
    type: 'mqtt' | 'esphome' | 'bluetooth' | 'mmwave';
    location: [number, number];
    enabled: boolean;
    last_seen: string | null;
    metadata: Record<string, any>;
}
export interface TrackedDevice {
    id: string;
    name: string;
    mac_address?: string;
    last_position: [number, number] | null;
    last_confidence: number;
    last_seen: string | null;
}
export interface Zone {
    id: string;
    name: string;
    coordinates: Array<[number, number]>;
    color: string;
    enabled: boolean;
    occupied_by?: string[];
}
export interface Position {
    x: number;
    y: number;
    confidence: number;
    sensor_count: number;
    method: string;
}
export interface MapData {
    sensors: Sensor[];
    devices: TrackedDevice[];
    zones: Zone[];
    positions: Record<string, Position>;
}
export interface PositionUpdateEvent {
    device_id: string;
    position: {
        x: number;
        y: number;
    };
    confidence: number;
    sensor_count: number;
}
export interface ZoneEvent {
    zone_name: string;
    device_id: string;
    position: {
        x: number;
        y: number;
    };
}
export interface Point {
    x: number;
    y: number;
}
export interface Person {
    id: string;
    name: string;
    default_device_id: string;
    linked_device_ids: string[];
    color: string;
    avatar?: string;
}
export interface PositionRecord {
    device_id: string;
    timestamp: number;
    x: number;
    y: number;
    confidence: number;
    method: string;
}
export interface HeatMapData {
    grid_size: number;
    bounds: {
        min_x: number;
        max_x: number;
        min_y: number;
        max_y: number;
    };
    data: Record<string, number>;
}
export interface Room {
    id: string;
    name: string;
    coordinates: Array<[number, number]>;
    color: string;
}
export interface Wall {
    id: string;
    start: [number, number];
    end: [number, number];
    thickness: number;
    color?: string;
    type?: 'standard' | 'load_bearing' | 'glass' | 'partition';
    doors?: Array<{
        position: number;
        width: number;
    }>;
    windows?: Array<{
        position: number;
        width: number;
        height: number;
    }>;
}
export interface FloorPlan {
    rooms: Room[];
    walls: Wall[];
    dimensions: {
        width: number;
        height: number;
    };
}
//# sourceMappingURL=types.d.ts.map