import { MapData, PositionUpdateEvent, ZoneEvent, Zone, Sensor, FloorPlan, Room, Person, PositionRecord } from '../types';
export declare class HideNSeekWebSocket {
    private hass;
    private configEntryId;
    private unsubscribers;
    constructor(hass: any, configEntryId: string);
    connect(): Promise<void>;
    getMapData(): Promise<MapData>;
    subscribeToPositions(callback: (event: PositionUpdateEvent) => void): () => void;
    subscribeToZones(callback: (event: ZoneEvent, eventType: string) => void): () => void;
    updateZone(zoneId: string | null, zoneData: Partial<Zone>): Promise<Zone>;
    deleteZone(zoneId: string): Promise<void>;
    addSensor(sensorData: Omit<Sensor, 'last_seen'>): Promise<Sensor>;
    updateSensor(sensorId: string, sensorData: Partial<Sensor>): Promise<Sensor>;
    deleteSensor(sensorId: string): Promise<void>;
    getSensors(): Promise<Sensor[]>;
    getFloorPlan(): Promise<FloorPlan>;
    updateFloorPlanDimensions(width: number, height: number): Promise<FloorPlan>;
    createRoom(roomData: {
        name: string;
        coordinates: number[][];
        color?: string;
    }): Promise<Room>;
    updateRoom(roomId: string, roomData: {
        name?: string;
        coordinates?: number[][];
        color?: string;
    }): Promise<Room>;
    deleteRoom(roomId: string): Promise<void>;
    createWall(wallData: {
        start: [number, number];
        end: [number, number];
        thickness: number;
        color?: string;
        type?: string;
    }): Promise<any>;
    updateWall(wallId: string, wallData: {
        start?: [number, number];
        end?: [number, number];
        thickness?: number;
        color?: string;
        type?: string;
    }): Promise<any>;
    deleteWall(wallId: string): Promise<void>;
    getPersons(): Promise<Person[]>;
    createPerson(personData: {
        name: string;
        default_device_id: string;
        linked_device_ids?: string[];
        color?: string;
        avatar?: string;
    }): Promise<Person>;
    updatePerson(personId: string, personData: {
        name?: string;
        default_device_id?: string;
        linked_device_ids?: string[];
        color?: string;
        avatar?: string;
    }): Promise<Person>;
    deletePerson(personId: string): Promise<void>;
    getPositionHistory(deviceId: string, startTime: number, endTime: number, downsample?: number): Promise<PositionRecord[]>;
    disconnect(): void;
}
//# sourceMappingURL=websocket.d.ts.map