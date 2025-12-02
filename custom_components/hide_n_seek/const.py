"""Constants for the Hide-n-Seek Presence Tracker integration."""

DOMAIN = "hide_n_seek"
CONF_SENSORS = "sensors"
CONF_ZONES = "zones"
CONF_LOCATION = "location"
CONF_UPDATE_INTERVAL = "update_interval"
CONF_SMOOTHING = "smoothing"
CONF_CONFIDENCE_THRESHOLD = "confidence_threshold"

# Default values
DEFAULT_UPDATE_INTERVAL = 1.0  # seconds
DEFAULT_SMOOTHING = "kalman"
DEFAULT_CONFIDENCE_THRESHOLD = 0.7

# Sensor types
SENSOR_TYPE_MQTT = "mqtt"
SENSOR_TYPE_ESPHOME = "esphome"
SENSOR_TYPE_BLUETOOTH = "bluetooth"
SENSOR_TYPE_MMWAVE = "mmwave"

# Signal strength constants
RSSI_REF = -59  # Reference RSSI at 1 meter
PATH_LOSS_EXPONENT = 2.5  # Path loss exponent for indoor environments

# Triangulation methods
TRILATERATION = "trilateration"
MULTILATERATION = "multilateration"
SENSOR_FUSION = "sensor_fusion"

# WebSocket commands - Existing
WS_TYPE_SUBSCRIBE_POSITIONS = "hide_n_seek/subscribe_positions"
WS_TYPE_SUBSCRIBE_ZONES = "hide_n_seek/subscribe_zones"
WS_TYPE_UPDATE_ZONE = "hide_n_seek/update_zone"
WS_TYPE_DELETE_ZONE = "hide_n_seek/delete_zone"
WS_TYPE_CALIBRATE_SENSOR = "hide_n_seek/calibrate_sensor"
WS_TYPE_GET_MAP_DATA = "hide_n_seek/get_map_data"

# WebSocket commands - Sensor Management
WS_TYPE_ADD_SENSOR = "hide_n_seek/add_sensor"
WS_TYPE_UPDATE_SENSOR = "hide_n_seek/update_sensor"
WS_TYPE_DELETE_SENSOR = "hide_n_seek/delete_sensor"
WS_TYPE_GET_SENSORS = "hide_n_seek/get_sensors"

# WebSocket commands - Device Management
WS_TYPE_ADD_TRACKED_DEVICE = "hide_n_seek/add_tracked_device"
WS_TYPE_UPDATE_TRACKED_DEVICE = "hide_n_seek/update_tracked_device"
WS_TYPE_DELETE_TRACKED_DEVICE = "hide_n_seek/delete_tracked_device"
WS_TYPE_GET_TRACKED_DEVICES = "hide_n_seek/get_tracked_devices"

# WebSocket commands - Person Management
WS_TYPE_GET_PERSONS = "hide_n_seek/get_persons"
WS_TYPE_UPDATE_PERSON = "hide_n_seek/update_person"
WS_TYPE_DELETE_PERSON = "hide_n_seek/delete_person"
WS_TYPE_SET_ACTIVE_DEVICE = "hide_n_seek/set_active_device"
WS_TYPE_SUBSCRIBE_PERSON_UPDATES = "hide_n_seek/subscribe_person_updates"

# WebSocket commands - Position History
WS_TYPE_GET_POSITION_HISTORY = "hide_n_seek/get_position_history"
WS_TYPE_GET_HEAT_MAP_DATA = "hide_n_seek/get_heat_map_data"
WS_TYPE_GET_TIMELINE_POSITIONS = "hide_n_seek/get_timeline_positions"

# WebSocket commands - Floor Plan
WS_TYPE_GET_FLOOR_PLAN = "hide_n_seek/get_floor_plan"
WS_TYPE_UPDATE_FLOOR_PLAN = "hide_n_seek/update_floor_plan"
WS_TYPE_UPDATE_ROOM = "hide_n_seek/update_room"
WS_TYPE_DELETE_ROOM = "hide_n_seek/delete_room"

# Events
EVENT_ZONE_ENTERED = f"{DOMAIN}_zone_entered"
EVENT_ZONE_EXITED = f"{DOMAIN}_zone_exited"
EVENT_DEVICE_POSITION_UPDATE = f"{DOMAIN}_device_position_update"

# Attributes
ATTR_ZONE_NAME = "zone_name"
ATTR_DEVICE_ID = "device_id"
ATTR_POSITION = "position"
ATTR_CONFIDENCE = "confidence"
ATTR_SENSOR_COUNT = "sensor_count"
ATTR_LAST_SEEN = "last_seen"

# Storage keys
STORAGE_KEY_PERSONS = f"{DOMAIN}_persons"
STORAGE_KEY_FLOOR_PLAN = f"{DOMAIN}_floor_plan"
STORAGE_VERSION = 1

# History settings
DEFAULT_RETENTION_DAYS = 7
DEFAULT_HEAT_MAP_GRID_SIZE = 0.5  # meters
