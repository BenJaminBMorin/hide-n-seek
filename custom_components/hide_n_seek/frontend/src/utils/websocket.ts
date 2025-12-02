import { MapData, PositionUpdateEvent, ZoneEvent, Zone, Sensor, FloorPlan, Room, Person, PositionRecord } from '../types';

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

  async addSensor(sensorData: Omit<Sensor, 'last_seen'>): Promise<Sensor> {
    return new Promise((resolve, reject) => {
      const id = this.send({
        type: 'hide_n_seek/add_sensor',
        config_entry_id: this.configEntryId,
        sensor_data: sensorData,
      });

      this.callbacks.set(id, (response) => {
        if (response.success === false) {
          reject(new Error(response.error?.message || 'Failed to add sensor'));
        } else {
          resolve(response.result);
        }
      });
    });
  }

  async updateSensor(sensorId: string, sensorData: Partial<Sensor>): Promise<Sensor> {
    return new Promise((resolve, reject) => {
      const id = this.send({
        type: 'hide_n_seek/update_sensor',
        config_entry_id: this.configEntryId,
        sensor_id: sensorId,
        sensor_data: sensorData,
      });

      this.callbacks.set(id, (response) => {
        if (response.success === false) {
          reject(new Error(response.error?.message || 'Failed to update sensor'));
        } else {
          resolve(response.result);
        }
      });
    });
  }

  async deleteSensor(sensorId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = this.send({
        type: 'hide_n_seek/delete_sensor',
        config_entry_id: this.configEntryId,
        sensor_id: sensorId,
      });

      this.callbacks.set(id, (response) => {
        if (response.success === false) {
          reject(new Error(response.error?.message || 'Failed to delete sensor'));
        } else {
          resolve();
        }
      });
    });
  }

  async getSensors(): Promise<Sensor[]> {
    return new Promise((resolve, reject) => {
      const id = this.send({
        type: 'hide_n_seek/get_sensors',
        config_entry_id: this.configEntryId,
      });

      this.callbacks.set(id, (response) => {
        if (response.success === false) {
          reject(new Error(response.error?.message || 'Failed to get sensors'));
        } else {
          resolve(response.result.sensors);
        }
      });
    });
  }

  async getFloorPlan(): Promise<FloorPlan> {
    return new Promise((resolve, reject) => {
      const id = this.send({
        type: 'hide_n_seek/get_floor_plan',
        config_entry_id: this.configEntryId,
      });

      this.callbacks.set(id, (response) => {
        if (response.success === false) {
          reject(new Error(response.error?.message || 'Failed to get floor plan'));
        } else {
          resolve(response.result);
        }
      });
    });
  }

  async updateFloorPlanDimensions(width: number, height: number): Promise<FloorPlan> {
    return new Promise((resolve, reject) => {
      const id = this.send({
        type: 'hide_n_seek/update_floor_plan',
        config_entry_id: this.configEntryId,
        dimensions: { width, height },
      });

      this.callbacks.set(id, (response) => {
        if (response.success === false) {
          reject(new Error(response.error?.message || 'Failed to update floor plan'));
        } else {
          resolve(response.result);
        }
      });
    });
  }

  async createRoom(roomData: { name: string; coordinates: number[][]; color?: string }): Promise<Room> {
    return new Promise((resolve, reject) => {
      const id = this.send({
        type: 'hide_n_seek/update_room',
        config_entry_id: this.configEntryId,
        room_data: roomData,
      });

      this.callbacks.set(id, (response) => {
        if (response.success === false) {
          reject(new Error(response.error?.message || 'Failed to create room'));
        } else {
          resolve(response.result);
        }
      });
    });
  }

  async updateRoom(roomId: string, roomData: { name?: string; coordinates?: number[][]; color?: string }): Promise<Room> {
    return new Promise((resolve, reject) => {
      const id = this.send({
        type: 'hide_n_seek/update_room',
        config_entry_id: this.configEntryId,
        room_id: roomId,
        room_data: roomData,
      });

      this.callbacks.set(id, (response) => {
        if (response.success === false) {
          reject(new Error(response.error?.message || 'Failed to update room'));
        } else {
          resolve(response.result);
        }
      });
    });
  }

  async deleteRoom(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = this.send({
        type: 'hide_n_seek/delete_room',
        config_entry_id: this.configEntryId,
        room_id: roomId,
      });

      this.callbacks.set(id, (response) => {
        if (response.success === false) {
          reject(new Error(response.error?.message || 'Failed to delete room'));
        } else {
          resolve();
        }
      });
    });
  }

  async createWall(wallData: {
    start: [number, number];
    end: [number, number];
    thickness: number;
    color?: string;
    type?: string;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.send({
        type: 'hide_n_seek/update_wall',
        config_entry_id: this.configEntryId,
        wall_data: wallData,
      });

      this.callbacks.set(id, (response) => {
        if (response.success === false) {
          reject(new Error(response.error?.message || 'Failed to create wall'));
        } else {
          resolve(response.result);
        }
      });
    });
  }

  async updateWall(wallId: string, wallData: {
    start?: [number, number];
    end?: [number, number];
    thickness?: number;
    color?: string;
    type?: string;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.send({
        type: 'hide_n_seek/update_wall',
        config_entry_id: this.configEntryId,
        wall_id: wallId,
        wall_data: wallData,
      });

      this.callbacks.set(id, (response) => {
        if (response.success === false) {
          reject(new Error(response.error?.message || 'Failed to update wall'));
        } else {
          resolve(response.result);
        }
      });
    });
  }

  async deleteWall(wallId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = this.send({
        type: 'hide_n_seek/delete_wall',
        config_entry_id: this.configEntryId,
        wall_id: wallId,
      });

      this.callbacks.set(id, (response) => {
        if (response.success === false) {
          reject(new Error(response.error?.message || 'Failed to delete wall'));
        } else {
          resolve();
        }
      });
    });
  }

  async getPersons(): Promise<Person[]> {
    return new Promise((resolve, reject) => {
      const id = this.send({
        type: 'hide_n_seek/get_persons',
        config_entry_id: this.configEntryId,
      });

      this.callbacks.set(id, (response) => {
        if (response.success === false) {
          reject(new Error(response.error?.message || 'Failed to get persons'));
        } else {
          resolve(response.result.persons);
        }
      });
    });
  }

  async createPerson(personData: {
    name: string;
    default_device_id: string;
    linked_device_ids?: string[];
    color?: string;
    avatar?: string;
  }): Promise<Person> {
    return new Promise((resolve, reject) => {
      const id = this.send({
        type: 'hide_n_seek/update_person',
        config_entry_id: this.configEntryId,
        person_data: personData,
      });

      this.callbacks.set(id, (response) => {
        if (response.success === false) {
          reject(new Error(response.error?.message || 'Failed to create person'));
        } else {
          resolve(response.result);
        }
      });
    });
  }

  async updatePerson(
    personId: string,
    personData: {
      name?: string;
      default_device_id?: string;
      linked_device_ids?: string[];
      color?: string;
      avatar?: string;
    }
  ): Promise<Person> {
    return new Promise((resolve, reject) => {
      const id = this.send({
        type: 'hide_n_seek/update_person',
        config_entry_id: this.configEntryId,
        person_id: personId,
        person_data: personData,
      });

      this.callbacks.set(id, (response) => {
        if (response.success === false) {
          reject(new Error(response.error?.message || 'Failed to update person'));
        } else {
          resolve(response.result);
        }
      });
    });
  }

  async deletePerson(personId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = this.send({
        type: 'hide_n_seek/delete_person',
        config_entry_id: this.configEntryId,
        person_id: personId,
      });

      this.callbacks.set(id, (response) => {
        if (response.success === false) {
          reject(new Error(response.error?.message || 'Failed to delete person'));
        } else {
          resolve();
        }
      });
    });
  }

  async getPositionHistory(
    deviceId: string,
    startTime: number,
    endTime: number,
    downsample?: number
  ): Promise<PositionRecord[]> {
    return new Promise((resolve, reject) => {
      const id = this.send({
        type: 'hide_n_seek/get_position_history',
        config_entry_id: this.configEntryId,
        device_id: deviceId,
        start_time: startTime,
        end_time: endTime,
        downsample: downsample,
      });

      this.callbacks.set(id, (response) => {
        if (response.success === false) {
          reject(new Error(response.error?.message || 'Failed to get position history'));
        } else {
          resolve(response.result.positions);
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
