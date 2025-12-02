import { MapData, PositionUpdateEvent, ZoneEvent, Zone } from '../types';
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
    disconnect(): void;
}
//# sourceMappingURL=websocket.d.ts.map