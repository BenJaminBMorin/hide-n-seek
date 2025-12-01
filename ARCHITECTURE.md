# Hide-n-Seek: Multi-Device Presence Tracking System

## Overview
A Home Assistant custom integration that provides real-time device tracking and zone management using triangulation from multiple ESP32, mmWave, and Bluetooth sensors throughout your home.

## Architecture

### Core Components

#### 1. Backend (Python - Home Assistant Integration)
- **Device Manager**: Discovery and management of ESP32, mmWave, and Bluetooth sensors
- **Triangulation Engine**: Real-time position calculation using RSSI, time-of-flight, and mmWave data
- **Data Collector**: Aggregates sensor readings from multiple sources
- **Zone Manager**: Handles zone configuration and occupancy detection
- **State Manager**: Maintains device positions and zone states in Home Assistant

#### 2. Frontend (TypeScript/React - Lovelace Panel)
- **Interactive Map**: Canvas-based floor plan with real-time device visualization
- **Zone Editor**: Visual tool to create/edit zones by clicking and dragging
- **Device List**: Shows tracked devices with position coordinates
- **Sensor Status**: Displays health and signal strength of all sensors
- **Configuration UI**: Setup wizard for sensor placement and calibration

#### 3. Integration Layer
- **ESPHome Integration**: Direct integration with ESPHome devices
- **MQTT Support**: Subscribe to sensor data from ESP32 devices
- **Bluetooth Tracker**: Native Bluetooth device discovery and RSSI tracking
- **API Endpoints**: WebSocket and REST APIs for frontend communication

## Data Flow

```
ESP32/Sensors → MQTT/ESPHome → Data Collector → Triangulation Engine → State Manager → Home Assistant States
                                                          ↓
                                                   Frontend Panel
                                                   (WebSocket)
```

## Triangulation Methods

### 1. RSSI-Based (Bluetooth)
- Uses signal strength from multiple Bluetooth receivers
- Trilateration using path loss model
- Kalman filtering for position smoothing

### 2. mmWave Sensors
- Direct coordinate data from mmWave radar
- Multiple sensors provide coverage overlap
- Sensor fusion for accuracy

### 3. Time-of-Flight (if supported)
- UWB or ESP32 with TWR (Two-Way Ranging)
- High accuracy indoor positioning

## Technology Stack

### Backend
- Python 3.11+
- Home Assistant Core APIs
- asyncio for concurrent sensor monitoring
- numpy/scipy for triangulation calculations
- paho-mqtt for MQTT communication

### Frontend
- TypeScript
- React 18+
- Canvas API for map rendering
- Material-UI components
- WebSocket for real-time updates

## Directory Structure

```
custom_components/hide_n_seek/
├── __init__.py              # Integration setup
├── manifest.json            # Integration metadata
├── config_flow.py          # Configuration UI
├── const.py                # Constants
├── coordinator.py          # Data update coordinator
├── device_manager.py       # Device discovery and management
├── triangulation.py        # Position calculation algorithms
├── zone_manager.py         # Zone configuration and detection
├── sensor.py               # Home Assistant sensor entities
├── device_tracker.py       # Device tracker entities
├── frontend/               # Frontend panel
│   ├── package.json
│   ├── tsconfig.json
│   ├── webpack.config.js
│   └── src/
│       ├── index.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── MapCanvas.tsx
│       │   ├── ZoneEditor.tsx
│       │   ├── DeviceList.tsx
│       │   └── SensorStatus.tsx
│       └── utils/
│           ├── websocket.ts
│           └── positioning.ts
└── translations/
    └── en.json
```

## Features

### Phase 1 (MVP)
- [ ] Basic custom component setup
- [ ] MQTT device discovery
- [ ] Simple RSSI-based triangulation
- [ ] Basic map visualization
- [ ] Zone creation and editing

### Phase 2
- [ ] ESPHome integration
- [ ] mmWave sensor support
- [ ] Advanced triangulation algorithms
- [ ] Kalman filtering
- [ ] Multi-floor support

### Phase 3
- [ ] Bluetooth tracker integration
- [ ] Historical tracking data
- [ ] Automation triggers for zones
- [ ] Calibration wizard
- [ ] Export/import floor plans

## Configuration Example

```yaml
hide_n_seek:
  sensors:
    - platform: mqtt
      name: "Living Room Sensor"
      topic: "esphome/living_room"
      location: [0, 0]  # X, Y coordinates in meters
    - platform: mqtt
      name: "Bedroom Sensor"
      topic: "esphome/bedroom"
      location: [5, 3]
    - platform: esphome
      device_id: kitchen_presence
      location: [2, 5]

  zones:
    - name: "Couch Area"
      coordinates: [[0, 0], [2, 0], [2, 1.5], [0, 1.5]]
    - name: "Kitchen"
      coordinates: [[1, 4], [3, 4], [3, 6], [1, 6]]

  tracking:
    update_interval: 1  # seconds
    smoothing: kalman
    confidence_threshold: 0.7
```

## API Endpoints

### WebSocket
- `subscribe_positions`: Real-time device position updates
- `subscribe_zones`: Zone occupancy changes
- `update_zone`: Modify zone configuration
- `calibrate_sensor`: Run sensor calibration

### REST
- GET `/api/hide_n_seek/devices`: List all tracked devices
- GET `/api/hide_n_seek/sensors`: List all sensors with status
- POST `/api/hide_n_seek/zones`: Create/update zones
- GET `/api/hide_n_seek/map_data`: Get current map state

## Development Roadmap

1. ✅ Architecture planning
2. Setup custom component skeleton
3. Implement MQTT data collection
4. Build triangulation engine
5. Create basic frontend panel
6. Add zone management
7. Implement ESPHome integration
8. Add advanced features (Kalman filtering, multi-floor)
9. Testing and refinement
10. Documentation and examples
