import { MapData, PositionUpdateEvent, ZoneEvent, Zone, Sensor, FloorPlan, Room, Person, PositionRecord } from '../types';
export declare class HideNSeekWebSocket {
    private ws;
    private messageId;
    private callbacks;
    private subscriptions;
    private configEntryId;
    private reconnectTimeout;
    private reconnectDelay;
    constructor(configEntryId: string);
    connect(url: string, authToken: string): Promise<void>;
    private scheduleReconnect;
    private handleMessage;
    private send;
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