# Hide-n-Seek Setup Guide

This guide will walk you through setting up Hide-n-Seek for indoor presence tracking.

## Prerequisites

- Home Assistant installed and running
- At least 3 sensors for triangulation (ESP32, mmWave, or Bluetooth)
- Basic understanding of your home's floor plan

## Installation

### Option 1: HACS (Recommended - Coming Soon)

1. Open HACS in Home Assistant
2. Go to "Integrations"
3. Click "Explore & Download Repositories"
4. Search for "Hide-n-Seek"
5. Click "Download"
6. Restart Home Assistant

### Option 2: Manual Installation

1. Download the latest release from GitHub
2. Copy the `custom_components/hide_n_seek` directory to your Home Assistant's `custom_components` directory
3. Restart Home Assistant

## Initial Configuration

### 1. Add the Integration

1. Go to Settings → Devices & Services
2. Click "+ Add Integration"
3. Search for "Hide-n-Seek"
4. Click to add

### 2. Configure Settings

You'll be prompted to configure:

- **Update Interval**: How often to recalculate positions (default: 1 second)
  - Lower = more updates but higher CPU usage
  - Recommended: 1-2 seconds

- **Smoothing Method**: Position smoothing algorithm
  - `kalman`: Best for smooth, filtered positions (recommended)
  - `average`: Simple averaging
  - `none`: No smoothing (raw calculations)

- **Confidence Threshold**: Minimum confidence for reporting positions (0-1)
  - Higher = more accurate but fewer updates
  - Recommended: 0.7 for good balance

## Setting Up Sensors

### ESP32 with ESPHome

Create an ESPHome configuration for your ESP32:

```yaml
# esp32-living-room.yaml
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

ota:
  password: !secret ota_password

# Enable Bluetooth proxy for tracking
esp32_ble_tracker:
  scan_parameters:
    interval: 1100ms
    window: 1100ms
    active: true

bluetooth_proxy:
  active: true

# Publish RSSI data via MQTT (optional)
mqtt:
  broker: !secret mqtt_broker
  topic_prefix: esphome/living_room

sensor:
  - platform: ble_rssi
    mac_address: "AA:BB:CC:DD:EE:FF"  # Your device MAC
    name: "Phone RSSI"
    id: phone_rssi
```

### Adding Sensors to Hide-n-Seek

Once your sensors are set up, add them to Hide-n-Seek:

#### Method 1: Via Frontend Panel

1. Open the Hide-n-Seek panel in Home Assistant
2. The panel will be available under the sidebar (look for "Hide-n-Seek")
3. Use the sensor configuration section to add sensors

#### Method 2: Via WebSocket API

Use the Home Assistant Developer Tools → Services:

```yaml
service: hide_n_seek.add_sensor
data:
  sensor_id: living_room_esp32
  name: Living Room Sensor
  type: esphome
  location: [0, 0]  # X, Y coordinates in meters
```

### Measuring Sensor Locations

**Important**: Accurate sensor placement is crucial for triangulation!

1. Choose a reference point (e.g., corner of a room) as (0, 0)
2. Measure the X (horizontal) and Y (vertical) distance from this point to each sensor
3. Use meters as your unit
4. Draw a simple floor plan to visualize:

```
(0,0)────────────────────(10,0)
  │                         │
  │   [Sensor 1]            │
  │     (2, 2)              │
  │                         │
  │         [Sensor 2]      │
  │           (6, 3)        │
  │                         │
  │                [Sensor 3]
  │                  (8, 5) │
(0,10)──────────────────(10,10)
```

## Creating Zones

### Using the Visual Editor

1. Open the Hide-n-Seek panel
2. Click "Create New Zone"
3. Click on the map to add points (at least 3 required)
4. Enter a zone name (e.g., "Living Room Couch")
5. Choose a color
6. Click "Save Zone"

### Using Service Calls

```yaml
service: hide_n_seek.create_zone
data:
  name: "Kitchen"
  coordinates:
    - [1, 4]
    - [3, 4]
    - [3, 6]
    - [1, 6]
```

## Adding Tracked Devices

Devices are automatically discovered when they're detected by your sensors. You can also manually add devices:

```yaml
service: hide_n_seek.add_tracked_device
data:
  device_id: my_phone
  name: "My Phone"
  mac_address: "AA:BB:CC:DD:EE:FF"
```

## Calibration

For best results, calibrate your sensors:

1. Place a device at a known location
2. Measure the actual distance from each sensor
3. Compare with calculated distance
4. Adjust the `RSSI_REF` and `PATH_LOSS_EXPONENT` values in `const.py` if needed

Default values:
- `RSSI_REF = -59` (RSSI at 1 meter)
- `PATH_LOSS_EXPONENT = 2.5` (indoor environment)

## Testing

1. Walk around with a tracked device (phone, smartwatch, etc.)
2. Watch the map update in real-time
3. Check the confidence levels
4. Adjust sensor placement or add more sensors if confidence is low

## Troubleshooting

### Low Confidence Scores

- Add more sensors for better coverage
- Check sensor placement is accurate
- Ensure sensors are detecting the device (check logs)
- Increase `PATH_LOSS_EXPONENT` if distances are overestimated

### Jumpy Position Updates

- Enable Kalman filtering (recommended)
- Increase update interval to 2-3 seconds
- Check for sensor interference
- Ensure sensors are stable and not moving

### Devices Not Appearing

- Verify sensors are working (check ESPHome logs)
- Ensure device Bluetooth is enabled and discoverable
- Check MQTT topics are correct
- Review Home Assistant logs for errors

### Zone Events Not Firing

- Verify zones are enabled
- Check zone coordinates are correct
- Ensure device has sufficient confidence
- Review automation triggers

## Next Steps

- Create automations based on zone entry/exit
- Set up multiple floors (coming soon)
- Fine-tune triangulation parameters
- Add more sensors for better coverage

## Support

- GitHub Issues: https://github.com/BenJaminBMorin/hide-n-seek/issues
- Home Assistant Community: https://community.home-assistant.io/
