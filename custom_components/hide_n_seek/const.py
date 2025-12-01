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

# WebSocket commands
WS_TYPE_SUBSCRIBE_POSITIONS = "hide_n_seek/subscribe_positions"
WS_TYPE_SUBSCRIBE_ZONES = "hide_n_seek/subscribe_zones"
WS_TYPE_UPDATE_ZONE = "hide_n_seek/update_zone"
WS_TYPE_DELETE_ZONE = "hide_n_seek/delete_zone"
WS_TYPE_CALIBRATE_SENSOR = "hide_n_seek/calibrate_sensor"
WS_TYPE_GET_MAP_DATA = "hide_n_seek/get_map_data"

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
