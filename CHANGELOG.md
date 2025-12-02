# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.18] - 2024-12-02

### Added
- Wall editor with interactive drawing on floor plan
- Wall properties: thickness, color, type (standard/load_bearing/glass/partition)
- Real-time wall preview with length measurement during drawing
- Wall list management with edit/delete capabilities
- WebSocket API handlers for wall CRUD operations
- Backend floor plan manager wall methods

## [0.1.0] - 2024-12-02

### Added
- Initial release of Hide-n-Seek Presence Tracker
- Multi-sensor triangulation support (ESP32, mmWave, Bluetooth)
- Advanced RSSI-based trilateration with Kalman filtering
- Interactive React/TypeScript frontend panel
- Visual zone editor with click-to-draw polygon zones
- Real-time device position tracking
- Zone occupancy detection with entry/exit events
- Device tracker entities for all tracked devices
- Position sensor entities (X, Y, confidence, sensor count)
- WebSocket API for real-time frontend communication
- Zone management with persistent storage
- Service calls for sensor/device/zone management
- HACS compatibility for easy installation
- Comprehensive documentation and examples
- Support for sensor fusion (combining multiple sensor types)
- Event-driven automations (zone_entered, zone_exited, position_update)

### Features
- **Backend Integration**
  - Custom Home Assistant integration with config flow
  - Device discovery and management
  - Triangulation engine with multiple algorithms
  - Zone manager with point-in-polygon detection
  - Data coordinator with automatic updates
  - WebSocket API handlers

- **Frontend Panel**
  - Canvas-based interactive map
  - Real-time device visualization
  - Zone editor with visual creation
  - Device list with confidence indicators
  - Sensor status monitoring
  - Pan and zoom controls
  - Color-coded zones

- **Entities Created**
  - `device_tracker.<device>` - Device tracker with zone info
  - `sensor.<device>_x_position` - X coordinate in meters
  - `sensor.<device>_y_position` - Y coordinate in meters
  - `sensor.<device>_confidence` - Position confidence (0-100%)
  - `sensor.<device>_sensor_count` - Number of tracking sensors

- **Events Fired**
  - `hide_n_seek_zone_entered` - When device enters a zone
  - `hide_n_seek_zone_exited` - When device exits a zone
  - `hide_n_seek_device_position_update` - On position updates

- **Services**
  - `hide_n_seek.calibrate_sensor` - Calibrate a sensor
  - `hide_n_seek.create_zone` - Create a new zone
  - `hide_n_seek.delete_zone` - Delete a zone

### Documentation
- Complete setup guide with ESPHome examples
- Quick start guide (10-minute setup)
- HACS installation instructions
- Example automations (lights, music, security, climate)
- Development guide for contributors
- Architecture documentation
- API documentation

### Technical Details
- Python 3.11+ backend
- React 18 + TypeScript frontend
- Material-UI components
- Webpack bundling
- HACS compatible
- Home Assistant 2024.1.0+

[0.1.0]: https://github.com/BenJaminBMorin/hide-n-seek/releases/tag/v0.1.0
