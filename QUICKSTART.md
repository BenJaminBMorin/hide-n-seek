# Hide-n-Seek Quick Start Guide

Get Hide-n-Seek up and running in 10 minutes!

## Installation (2 minutes)

### Via HACS (Recommended)

1. Open **HACS** → **Integrations**
2. Click **⋮** (three dots) → **Custom repositories**
3. Add: `https://github.com/BenJaminBMorin/hide-n-seek`
4. Category: **Integration**
5. Search for "Hide-n-Seek" and click **Download**
6. **Restart Home Assistant**
7. Settings → Devices & Services → **Add Integration** → "Hide-n-Seek"

[Detailed HACS Instructions →](docs/HACS_INSTALLATION.md)

## Initial Setup (3 minutes)

### 1. Configure Integration
- **Update Interval**: 1 second
- **Smoothing**: Kalman (recommended)
- **Confidence**: 0.7

### 2. Add Your First Sensor

Open the Hide-n-Seek panel from the sidebar and note you need at least 3 sensors for triangulation.

**Option A: Via Service Call**
```yaml
service: hide_n_seek.add_sensor
data:
  sensor_id: living_room_esp32
  name: "Living Room Sensor"
  type: esphome
  location: [0, 0]  # X, Y in meters
```

**Option B: Via WebSocket** (in the panel's browser console)
```javascript
// Coming soon - UI for adding sensors
```

### 3. Add More Sensors

Add at least 2 more sensors at different locations:
```yaml
service: hide_n_seek.add_sensor
data:
  sensor_id: kitchen_esp32
  name: "Kitchen Sensor"
  type: esphome
  location: [5, 3]
```

```yaml
service: hide_n_seek.add_sensor
data:
  sensor_id: bedroom_esp32
  name: "Bedroom Sensor"
  type: esphome
  location: [10, 0]
```

**Important**: Measure actual distances from your reference point (0,0)!

## Create Your First Zone (2 minutes)

1. Open the **Hide-n-Seek** panel
2. Click **"Create New Zone"**
3. Click on the map to add points (at least 3)
4. Enter zone name (e.g., "Living Room")
5. Choose a color
6. Click **"Save Zone"**

## Create Your First Automation (3 minutes)

Turn on lights when you enter a room:

```yaml
automation:
  - alias: "Living Room Lights On"
    trigger:
      - platform: event
        event_type: hide_n_seek_zone_entered
        event_data:
          zone_name: "Living Room"
    condition:
      - condition: sun
        after: sunset
    action:
      - service: light.turn_on
        target:
          entity_id: light.living_room
        data:
          brightness_pct: 80
```

## Verify It's Working

### Check Entities
Settings → Devices & Services → Hide-n-Seek → View all devices

You should see entities like:
- `sensor.device_x_position`
- `sensor.device_y_position`
- `sensor.device_confidence`
- `device_tracker.device`

### Check the Map
1. Open Hide-n-Seek panel
2. Walk around with your phone
3. Watch the map update in real-time
4. Check confidence levels

### Check Events
Developer Tools → Events → Listen to:
- `hide_n_seek_zone_entered`
- `hide_n_seek_zone_exited`
- `hide_n_seek_device_position_update`

Walk into a zone and watch for events!

## Sensor Requirements

For best results:

| Requirement | Details |
|------------|---------|
| **Minimum Sensors** | 3 (more = better accuracy) |
| **Placement** | Different locations, spread out |
| **Coverage** | Sensors should overlap coverage |
| **Type** | ESP32 + ESPHome, MQTT, or Bluetooth |

### Example ESP32 Setup

```yaml
# esp32-sensor.yaml
esphome:
  name: living-room-sensor
  platform: ESP32
  board: esp32dev

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password

api:
  encryption:
    key: !secret api_encryption_key

esp32_ble_tracker:
  scan_parameters:
    interval: 1100ms
    window: 1100ms
    active: true

bluetooth_proxy:
  active: true
```

## Common Issues

### "No devices tracked"
- Ensure your phone/device has Bluetooth enabled
- Check sensors are detecting devices (ESPHome logs)
- Verify MQTT topics if using MQTT

### "Low confidence"
- Add more sensors
- Check sensor placement accuracy
- Ensure sensors are detecting the device

### "Jumpy tracking"
- Enable Kalman filtering (default)
- Increase update interval to 2-3 seconds
- Check for WiFi interference

## Next Steps

- [📖 Full Setup Guide](docs/SETUP_GUIDE.md) - Detailed configuration
- [🎯 Example Automations](examples/example_configuration.yaml) - 15+ automation examples
- [🏗️ Architecture](ARCHITECTURE.md) - How it works
- [💻 Development Guide](docs/DEVELOPMENT.md) - Contribute

## Pro Tips

1. **Measure Carefully**: Accurate sensor positions = accurate tracking
2. **More Sensors = Better**: Start with 3, add more for better accuracy
3. **Calibrate**: Place device at known location to verify accuracy
4. **Use Zones**: Don't just track positions, create meaningful zones
5. **Events > Polling**: Use zone events instead of checking position sensors

## Example Full Setup

```yaml
# Quick configuration example
sensors:
  - id: sensor_1, location: [0, 0]    # Corner of living room
  - id: sensor_2, location: [8, 0]    # Other corner
  - id: sensor_3, location: [4, 6]    # Kitchen

zones:
  - name: "Couch Area", coordinates: [[0,0], [3,0], [3,2], [0,2]]
  - name: "Kitchen", coordinates: [[3,5], [7,5], [7,8], [3,8]]

automations:
  - Zone entry → Turn on lights
  - Zone exit → Turn off lights
  - Bedtime → Run night routine
```

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/BenJaminBMorin/hide-n-seek/issues)
- **Discussions**: [GitHub Discussions](https://github.com/BenJaminBMorin/hide-n-seek/discussions)
- **Community**: [Home Assistant Forums](https://community.home-assistant.io/)

## Updates

Hide-n-Seek is actively developed. Check HACS for updates regularly!

**Current Version**: 0.1.0
**Repository**: https://github.com/BenJaminBMorin/hide-n-seek

---

Happy tracking! 🎯
