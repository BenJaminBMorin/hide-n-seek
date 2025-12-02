# Hide-n-Seek Presence Tracker

[![GitHub Release](https://img.shields.io/github/release/BenJaminBMorin/hide-n-seek.svg?style=flat-square)](https://github.com/BenJaminBMorin/hide-n-seek/releases)
[![License](https://img.shields.io/github/license/BenJaminBMorin/hide-n-seek.svg?style=flat-square)](LICENSE)
[![hacs](https://img.shields.io/badge/HACS-Default-orange.svg?style=flat-square)](https://hacs.xyz)

Advanced indoor presence tracking using triangulation from multiple ESP32, mmWave, and Bluetooth sensors.

## Features

- **Real-Time Tracking**: Live device position updates with sub-meter accuracy
- **Visual Zone Editor**: Draw zones directly on an interactive map
- **Multi-Sensor Support**: Works with ESP32, ESPHome, MQTT, Bluetooth, and mmWave sensors
- **Advanced Triangulation**: RSSI-based trilateration with Kalman filtering
- **Event-Driven**: Fires events for zone entry/exit to trigger automations
- **Beautiful Interface**: React-based frontend with Material-UI components

## Quick Start

1. **Add Sensors**: Configure at least 3 ESP32 or Bluetooth sensors in different locations
2. **Measure Positions**: Note the X,Y coordinates (in meters) of each sensor
3. **Add to Hide-n-Seek**: Register sensors with their positions
4. **Create Zones**: Use the visual editor to draw zones on your map
5. **Build Automations**: Create automations triggered by zone entry/exit events

## Example Automation

```yaml
automation:
  - alias: "Living Room Lights"
    trigger:
      - platform: event
        event_type: hide_n_seek_zone_entered
        event_data:
          zone_name: "Living Room"
    action:
      - service: light.turn_on
        target:
          entity_id: light.living_room
```

## Sensor Requirements

- Minimum 3 sensors for triangulation (more = better accuracy)
- Sensors must detect RSSI (signal strength) from tracked devices
- Supported types:
  - ESP32 with ESPHome Bluetooth Proxy
  - ESP32 with MQTT
  - Native Home Assistant Bluetooth
  - mmWave sensors (Everything Presence Lite/One, etc.)

## Configuration

After installation:
1. Go to Settings → Devices & Services → Add Integration
2. Search for "Hide-n-Seek"
3. Configure update interval and smoothing options
4. Access the panel from the sidebar

## Documentation

- [Setup Guide](https://github.com/BenJaminBMorin/hide-n-seek/blob/main/docs/SETUP_GUIDE.md)
- [Example Configurations](https://github.com/BenJaminBMorin/hide-n-seek/blob/main/examples/example_configuration.yaml)
- [Development Guide](https://github.com/BenJaminBMorin/hide-n-seek/blob/main/docs/DEVELOPMENT.md)
- [Architecture](https://github.com/BenJaminBMorin/hide-n-seek/blob/main/ARCHITECTURE.md)

## Support

- [Report Issues](https://github.com/BenJaminBMorin/hide-n-seek/issues)
- [Home Assistant Community](https://community.home-assistant.io/)

## License

MIT License - See [LICENSE](https://github.com/BenJaminBMorin/hide-n-seek/blob/main/LICENSE)
