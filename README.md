# Hide-n-Seek: Multi-Device Presence Tracking for Home Assistant

A powerful Home Assistant custom integration that provides real-time indoor device tracking and zone management using triangulation from multiple ESP32, mmWave, and Bluetooth sensors throughout your home.

## Features

- **Multi-Sensor Support**: Works with ESP32, mmWave sensors, and Bluetooth devices
- **Advanced Triangulation**: RSSI-based trilateration with Kalman filtering for smooth, accurate positioning
- **Visual Zone Editor**: Interactive map interface for creating and managing zones
- **Real-time Tracking**: Live position updates and zone occupancy detection
- **Sensor Fusion**: Combines data from multiple sensor types for enhanced accuracy
- **Event-Driven Automations**: Trigger automations based on zone entry/exit events

## Installation

### HACS (Recommended)

1. Open HACS in Home Assistant
2. Click "Integrations"
3. Click the "+" button
4. Search for "Hide-n-Seek"
5. Click "Install"
6. Restart Home Assistant

### Manual Installation

1. Copy the `custom_components/hide_n_seek` directory to your Home Assistant's `custom_components` directory
2. Restart Home Assistant
3. Add the integration via Settings → Devices & Services → Add Integration → Hide-n-Seek

## Configuration

### Basic Setup

1. Go to Settings → Devices & Services
2. Click "Add Integration"
3. Search for "Hide-n-Seek"
4. Configure the following options:
   - **Update Interval**: How often to recalculate positions (default: 1 second)
   - **Smoothing Method**: Position smoothing algorithm (Kalman, average, or none)
   - **Confidence Threshold**: Minimum confidence for position reporting (0-1)

### Adding Sensors

Sensors can be added via the frontend panel or using the WebSocket API:

```yaml
# Example: Add an MQTT sensor via automation
service: hide_n_seek.add_sensor
data:
  sensor_id: living_room_esp32
  name: Living Room Sensor
  type: mqtt
  location: [0, 0]  # X, Y coordinates in meters
```

### Creating Zones

Create zones visually through the frontend panel or via service calls:

```yaml
service: hide_n_seek.create_zone
data:
  name: Couch Area
  coordinates:
    - [0, 0]
    - [2, 0]
    - [2, 1.5]
    - [0, 1.5]
```

## How It Works

### Triangulation

Hide-n-Seek uses multiple positioning methods:

1. **RSSI Trilateration**: Calculates position from signal strength of 3+ Bluetooth/WiFi sensors
2. **mmWave Direct Positioning**: Uses coordinate data from mmWave radar sensors
3. **Sensor Fusion**: Combines multiple sensor types for optimal accuracy

The system applies Kalman filtering to smooth position estimates and reduce jitter.

### Zone Detection

Zones are defined as polygons on your floor plan. The system uses ray-casting to detect when tracked devices enter or exit zones, firing events that can trigger automations.

## Automations

### Example: Turn on lights when entering a zone

```yaml
automation:
  - alias: "Lights on in living room"
    trigger:
      - platform: event
        event_type: hide_n_seek_zone_entered
        event_data:
          zone_name: "Living Room"
          device_id: "phone_123"
    action:
      - service: light.turn_on
        target:
          entity_id: light.living_room
```

### Example: Alert when device leaves home

```yaml
automation:
  - alias: "Device left home"
    trigger:
      - platform: event
        event_type: hide_n_seek_zone_exited
        event_data:
          zone_name: "Home"
    action:
      - service: notify.mobile_app
        data:
          message: "Device {{ trigger.event.data.device_id }} left home"
```

## Entities

For each tracked device, Hide-n-Seek creates:

- **Device Tracker**: Shows current zone location
- **X Position Sensor**: Current X coordinate (meters)
- **Y Position Sensor**: Current Y coordinate (meters)
- **Position Confidence**: Accuracy estimate (0-100%)
- **Tracking Sensors**: Number of sensors detecting the device

## Events

- `hide_n_seek_zone_entered`: Fired when a device enters a zone
- `hide_n_seek_zone_exited`: Fired when a device exits a zone
- `hide_n_seek_device_position_update`: Fired on each position update

## WebSocket API

The frontend panel communicates via WebSocket API:

- `hide_n_seek/subscribe_positions`: Subscribe to position updates
- `hide_n_seek/subscribe_zones`: Subscribe to zone events
- `hide_n_seek/get_map_data`: Get all sensors, devices, and zones
- `hide_n_seek/update_zone`: Create or update a zone
- `hide_n_seek/delete_zone`: Delete a zone

## Hardware Recommendations

### ESP32 Sensors
- ESP32 with ESPHome
- Configured with Bluetooth proxy or WiFi scanning
- Place at known locations throughout your home

### mmWave Sensors
- Everything Presence Lite/One
- Other ESPHome-compatible mmWave sensors
- Provides high-accuracy local positioning

### Tracked Devices
- Bluetooth devices (phones, smartwatches, tags)
- Must be detectable by your sensors

## Troubleshooting

### Low Confidence Scores
- Add more sensors for better coverage
- Ensure sensors are placed at different locations
- Check sensor placement coordinates are accurate

### Jumpy Position Updates
- Enable Kalman filtering in options
- Increase update interval
- Ensure stable sensor placement

### Devices Not Appearing
- Check sensor connectivity
- Verify MQTT/ESPHome integration is working
- Check Home Assistant logs for errors

## Development

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed technical documentation.

## Contributing

Contributions are welcome! Please open an issue or pull request on GitHub.

## License

MIT License - see LICENSE file for details

## Credits

Inspired by the Everything Presence Zone Configurator by Everything Smart Home.

## Support

- [GitHub Issues](https://github.com/BenJaminBMorin/hide-n-seek/issues)
- [Home Assistant Community](https://community.home-assistant.io/)
