import { MapData, PositionUpdateEvent, ZoneEvent, Zone } from '../types';

export class HideNSeekWebSocket {
  private ws: WebSocket | null = null;
  private messageId = 1;
  private callbacks: Map<number, (data: any) => void> = new Map();
  private subscriptions: Map<string, (data: any) => void> = new Map();
  private configEntryId: string;
  private reconnectTimeout: number | null = null;
  private reconnectDelay = 5000;

  constructor(configEntryId: string) {
    this.configEntryId = configEntryId;
  }

  connect(url: string, authToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        // Send auth message
        this.send({ type: 'auth', access_token: authToken });
      };

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.handleMessage(message);

        if (message.type === 'auth_ok') {
          resolve();
        } else if (message.type === 'auth_invalid') {
          reject(new Error('Authentication failed'));
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.scheduleReconnect(url, authToken);
      };
    });
  }

  private scheduleReconnect(url: string, authToken: string): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = window.setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.connect(url, authToken).catch((err) => {
        console.error('Reconnection failed:', err);
      });
    }, this.reconnectDelay);
  }

  private handleMessage(message: any): void {
    if (message.id && this.callbacks.has(message.id)) {
      const callback = this.callbacks.get(message.id)!;
      callback(message);
      this.callbacks.delete(message.id);
    }

    if (message.type === 'event') {
      const subscription = this.subscriptions.get(message.id);
      if (subscription) {
        subscription(message.event);
      }
    }
  }

  private send(data: any): number {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const id = this.messageId++;
    const message = { ...data, id };
    this.ws.send(JSON.stringify(message));
    return id;
  }

  async getMapData(): Promise<MapData> {
    return new Promise((resolve, reject) => {
      const id = this.send({
        type: 'hide_n_seek/get_map_data',
        config_entry_id: this.configEntryId,
      });

      this.callbacks.set(id, (response) => {
        if (response.success === false) {
          reject(new Error(response.error?.message || 'Failed to get map data'));
        } else {
          resolve(response.result);
        }
      });
    });
  }

  subscribeToPositions(callback: (event: PositionUpdateEvent) => void): () => void {
    const id = this.send({
      type: 'hide_n_seek/subscribe_positions',
      config_entry_id: this.configEntryId,
    });

    this.subscriptions.set(String(id), (event) => {
      if (event.type === 'position_update') {
        callback(event.data);
      }
    });

    return () => {
      this.subscriptions.delete(String(id));
    };
  }

  subscribeToZones(
    callback: (event: ZoneEvent, eventType: string) => void
  ): () => void {
    const id = this.send({
      type: 'hide_n_seek/subscribe_zones',
      config_entry_id: this.configEntryId,
    });

    this.subscriptions.set(String(id), (event) => {
      if (event.type === 'zone_event') {
        callback(event.data, event.event_type);
      }
    });

    return () => {
      this.subscriptions.delete(String(id));
    };
  }

  async updateZone(zoneId: string | null, zoneData: Partial<Zone>): Promise<Zone> {
    return new Promise((resolve, reject) => {
      const id = this.send({
        type: 'hide_n_seek/update_zone',
        config_entry_id: this.configEntryId,
        zone_id: zoneId,
        zone_data: zoneData,
      });

      this.callbacks.set(id, (response) => {
        if (response.success === false) {
          reject(new Error(response.error?.message || 'Failed to update zone'));
        } else {
          resolve(response.result);
        }
      });
    });
  }

  async deleteZone(zoneId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = this.send({
        type: 'hide_n_seek/delete_zone',
        config_entry_id: this.configEntryId,
        zone_id: zoneId,
      });

      this.callbacks.set(id, (response) => {
        if (response.success === false) {
          reject(new Error(response.error?.message || 'Failed to delete zone'));
        } else {
          resolve();
        }
      });
    });
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
