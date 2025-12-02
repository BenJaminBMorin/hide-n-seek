import { MapData, PositionUpdateEvent, ZoneEvent, Zone, Sensor, FloorPlan, Room, Person, PositionRecord } from '../types';

export class HideNSeekWebSocket {
  private hass: any;
  private configEntryId: string;
  private unsubscribers: (() => void)[] = [];

  constructor(hass: any, configEntryId: string) {
    this.hass = hass;
    this.configEntryId = configEntryId;
  }

  connect(): Promise<void> {
    // No need to connect - we're using hass's existing connection
    console.log('Using existing Home Assistant connection');
    return Promise.resolve();
  }

  async getMapData(): Promise<MapData> {
    return this.hass.callWS({
      type: 'hide_n_seek/get_map_data',
      config_entry_id: this.configEntryId,
    });
  }

  subscribeToPositions(callback: (event: PositionUpdateEvent) => void): () => void {
    const unsub = this.hass.connection.subscribeEvents(
      (event: any) => {
        callback(event.data);
      },
      'hide_n_seek_device_position_update'
    );

    this.unsubscribers.push(unsub);
    return unsub;
  }

  subscribeToZones(
    callback: (event: ZoneEvent, eventType: string) => void
  ): () => void {
    const unsubEntered = this.hass.connection.subscribeEvents(
      (event: any) => {
        callback(event.data, 'zone_entered');
      },
      'hide_n_seek_zone_entered'
    );

    const unsubExited = this.hass.connection.subscribeEvents(
      (event: any) => {
        callback(event.data, 'zone_exited');
      },
      'hide_n_seek_zone_exited'
    );

    this.unsubscribers.push(unsubEntered, unsubExited);

    return () => {
      unsubEntered();
      unsubExited();
    };
  }

  async updateZone(zoneId: string | null, zoneData: Partial<Zone>): Promise<Zone> {
    return this.hass.callWS({
      type: 'hide_n_seek/update_zone',
      config_entry_id: this.configEntryId,
      zone_id: zoneId,
      zone_data: zoneData,
    });
  }

  async deleteZone(zoneId: string): Promise<void> {
    return this.hass.callWS({
      type: 'hide_n_seek/delete_zone',
      config_entry_id: this.configEntryId,
      zone_id: zoneId,
    });
  }

  async addSensor(sensorData: Omit<Sensor, 'last_seen'>): Promise<Sensor> {
    return this.hass.callWS({
      type: 'hide_n_seek/add_sensor',
      config_entry_id: this.configEntryId,
      sensor_data: sensorData,
    });
  }

  async updateSensor(sensorId: string, sensorData: Partial<Sensor>): Promise<Sensor> {
    return this.hass.callWS({
      type: 'hide_n_seek/update_sensor',
      config_entry_id: this.configEntryId,
      sensor_id: sensorId,
      sensor_data: sensorData,
    });
  }

  async deleteSensor(sensorId: string): Promise<void> {
    return this.hass.callWS({
      type: 'hide_n_seek/delete_sensor',
      config_entry_id: this.configEntryId,
      sensor_id: sensorId,
    });
  }

  async getSensors(): Promise<Sensor[]> {
    const result = await this.hass.callWS({
      type: 'hide_n_seek/get_sensors',
      config_entry_id: this.configEntryId,
    });
    return result.sensors;
  }

  async getFloorPlan(): Promise<FloorPlan> {
    return this.hass.callWS({
      type: 'hide_n_seek/get_floor_plan',
      config_entry_id: this.configEntryId,
    });
  }

  async updateFloorPlanDimensions(width: number, height: number): Promise<FloorPlan> {
    return this.hass.callWS({
      type: 'hide_n_seek/update_floor_plan',
      config_entry_id: this.configEntryId,
      dimensions: { width, height },
    });
  }

  async createRoom(roomData: { name: string; coordinates: number[][]; color?: string }): Promise<Room> {
    return this.hass.callWS({
      type: 'hide_n_seek/update_room',
      config_entry_id: this.configEntryId,
      room_data: roomData,
    });
  }

  async updateRoom(roomId: string, roomData: { name?: string; coordinates?: number[][]; color?: string }): Promise<Room> {
    return this.hass.callWS({
      type: 'hide_n_seek/update_room',
      config_entry_id: this.configEntryId,
      room_id: roomId,
      room_data: roomData,
    });
  }

  async deleteRoom(roomId: string): Promise<void> {
    return this.hass.callWS({
      type: 'hide_n_seek/delete_room',
      config_entry_id: this.configEntryId,
      room_id: roomId,
    });
  }

  async createWall(wallData: {
    start: [number, number];
    end: [number, number];
    thickness: number;
    color?: string;
    type?: string;
  }): Promise<any> {
    return this.hass.callWS({
      type: 'hide_n_seek/update_wall',
      config_entry_id: this.configEntryId,
      wall_data: wallData,
    });
  }

  async updateWall(wallId: string, wallData: {
    start?: [number, number];
    end?: [number, number];
    thickness?: number;
    color?: string;
    type?: string;
  }): Promise<any> {
    return this.hass.callWS({
      type: 'hide_n_seek/update_wall',
      config_entry_id: this.configEntryId,
      wall_id: wallId,
      wall_data: wallData,
    });
  }

  async deleteWall(wallId: string): Promise<void> {
    return this.hass.callWS({
      type: 'hide_n_seek/delete_wall',
      config_entry_id: this.configEntryId,
      wall_id: wallId,
    });
  }

  async getPersons(): Promise<Person[]> {
    const result = await this.hass.callWS({
      type: 'hide_n_seek/get_persons',
      config_entry_id: this.configEntryId,
    });
    return result.persons;
  }

  async createPerson(personData: {
    name: string;
    default_device_id: string;
    linked_device_ids?: string[];
    color?: string;
    avatar?: string;
  }): Promise<Person> {
    return this.hass.callWS({
      type: 'hide_n_seek/update_person',
      config_entry_id: this.configEntryId,
      person_data: personData,
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
    return this.hass.callWS({
      type: 'hide_n_seek/update_person',
      config_entry_id: this.configEntryId,
      person_id: personId,
      person_data: personData,
    });
  }

  async deletePerson(personId: string): Promise<void> {
    return this.hass.callWS({
      type: 'hide_n_seek/delete_person',
      config_entry_id: this.configEntryId,
      person_id: personId,
    });
  }

  async getPositionHistory(
    deviceId: string,
    startTime: number,
    endTime: number,
    downsample?: number
  ): Promise<PositionRecord[]> {
    const result = await this.hass.callWS({
      type: 'hide_n_seek/get_position_history',
      config_entry_id: this.configEntryId,
      device_id: deviceId,
      start_time: startTime,
      end_time: endTime,
      downsample: downsample,
    });
    return result.positions;
  }

  disconnect(): void {
    // Unsubscribe from all events
    this.unsubscribers.forEach(unsub => {
      if (typeof unsub === 'function') {
        unsub();
      }
    });
    this.unsubscribers = [];
  }
}
