"""Device discovery and management for Hide-n-Seek."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from datetime import datetime

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_send
import homeassistant.helpers.device_registry as dr

from .const import (
    DOMAIN,
    SENSOR_TYPE_MQTT,
    SENSOR_TYPE_ESPHOME,
    SENSOR_TYPE_BLUETOOTH,
    SENSOR_TYPE_MMWAVE,
)
from .triangulation import SensorReading

_LOGGER = logging.getLogger(__name__)


@dataclass
class Sensor:
    """Represents a sensor device."""

    id: str
    name: str
    type: str  # mqtt, esphome, bluetooth, mmwave
    location: tuple[float, float]  # (x, y) in meters
    enabled: bool = True
    last_seen: Optional[datetime] = None
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        """Convert sensor to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "location": self.location,
            "enabled": self.enabled,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
            "metadata": self.metadata,
        }


@dataclass
class TrackedDevice:
    """Represents a device being tracked."""

    id: str
    name: str
    mac_address: Optional[str] = None
    last_position: Optional[tuple[float, float]] = None
    last_confidence: float = 0.0
    last_seen: Optional[datetime] = None
    current_readings: Dict[str, SensorReading] = field(default_factory=dict)

    def to_dict(self) -> dict:
        """Convert device to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "mac_address": self.mac_address,
            "last_position": self.last_position,
            "last_confidence": self.last_confidence,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
        }


class DeviceManager:
    """Manages sensors and tracked devices."""

    def __init__(self, hass: HomeAssistant):
        """Initialize the device manager."""
        self.hass = hass
        self.sensors: Dict[str, Sensor] = {}
        self.tracked_devices: Dict[str, TrackedDevice] = {}
        self._mqtt_subscriptions = []

    async def async_setup(self) -> None:
        """Set up the device manager."""
        _LOGGER.info("Setting up device manager")

        # Load sensors from config
        # This will be populated from config entries
        await self._discover_mqtt_sensors()
        await self._discover_esphome_sensors()
        await self._discover_bluetooth_sensors()

    async def _discover_mqtt_sensors(self) -> None:
        """Discover MQTT sensors."""
        # Check if MQTT integration is available
        if "mqtt" not in self.hass.config.components:
            _LOGGER.info("MQTT not available, skipping MQTT sensor discovery")
            return

        _LOGGER.info("Discovering MQTT sensors")
        # Subscribe to discovery topics
        # This is a placeholder - actual implementation would subscribe to
        # MQTT topics and parse sensor data

    async def _discover_esphome_sensors(self) -> None:
        """Discover ESPHome sensors."""
        # Check if ESPHome integration is available
        if "esphome" not in self.hass.config.components:
            _LOGGER.info("ESPHome not available, skipping ESPHome sensor discovery")
            return

        _LOGGER.info("Discovering ESPHome sensors")
        # Discover ESPHome devices with presence detection capabilities
        # This is a placeholder for actual ESPHome API integration

    async def _discover_bluetooth_sensors(self) -> None:
        """Discover Bluetooth sensors."""
        # Check if Bluetooth integration is available
        if "bluetooth" not in self.hass.config.components:
            _LOGGER.info("Bluetooth not available, skipping Bluetooth sensor discovery")
            return

        _LOGGER.info("Discovering Bluetooth sensors")
        # Set up Bluetooth scanning
        # This is a placeholder for actual Bluetooth integration

    def add_sensor(
        self,
        sensor_id: str,
        name: str,
        sensor_type: str,
        location: tuple[float, float],
        metadata: Optional[dict] = None,
    ) -> Sensor:
        """Add a new sensor."""
        sensor = Sensor(
            id=sensor_id,
            name=name,
            type=sensor_type,
            location=location,
            metadata=metadata or {},
        )

        self.sensors[sensor_id] = sensor
        _LOGGER.info("Added sensor: %s (%s) at %s", name, sensor_type, location)

        return sensor

    def update_sensor(
        self,
        sensor_id: str,
        name: Optional[str] = None,
        sensor_type: Optional[str] = None,
        location: Optional[tuple[float, float]] = None,
        enabled: Optional[bool] = None,
        metadata: Optional[dict] = None,
    ) -> Optional[Sensor]:
        """Update an existing sensor."""
        sensor = self.sensors.get(sensor_id)
        if sensor is None:
            return None

        if name is not None:
            sensor.name = name
        if sensor_type is not None:
            sensor.type = sensor_type
        if location is not None:
            sensor.location = location
        if enabled is not None:
            sensor.enabled = enabled
        if metadata is not None:
            sensor.metadata = metadata

        _LOGGER.info("Updated sensor: %s", sensor.name)
        return sensor

    def remove_sensor(self, sensor_id: str) -> bool:
        """Remove a sensor."""
        if sensor_id in self.sensors:
            sensor = self.sensors.pop(sensor_id)
            _LOGGER.info("Removed sensor: %s", sensor.name)
            return True
        return False

    def get_sensor(self, sensor_id: str) -> Optional[Sensor]:
        """Get a sensor by ID."""
        return self.sensors.get(sensor_id)

    def get_all_sensors(self) -> List[Sensor]:
        """Get all sensors."""
        return list(self.sensors.values())

    def get_enabled_sensors(self) -> List[Sensor]:
        """Get all enabled sensors."""
        return [s for s in self.sensors.values() if s.enabled]

    def add_tracked_device(
        self, device_id: str, name: str, mac_address: Optional[str] = None
    ) -> TrackedDevice:
        """Add a device to track."""
        device = TrackedDevice(
            id=device_id,
            name=name,
            mac_address=mac_address,
        )

        self.tracked_devices[device_id] = device
        _LOGGER.info("Added tracked device: %s", name)

        return device

    def remove_tracked_device(self, device_id: str) -> bool:
        """Remove a tracked device."""
        if device_id in self.tracked_devices:
            device = self.tracked_devices.pop(device_id)
            _LOGGER.info("Removed tracked device: %s", device.name)
            return True
        return False

    def get_tracked_device(self, device_id: str) -> Optional[TrackedDevice]:
        """Get a tracked device by ID."""
        return self.tracked_devices.get(device_id)

    def get_all_tracked_devices(self) -> List[TrackedDevice]:
        """Get all tracked devices."""
        return list(self.tracked_devices.values())

    @callback
    def update_device_reading(
        self,
        device_id: str,
        sensor_id: str,
        rssi: Optional[float] = None,
        distance: Optional[float] = None,
        confidence: float = 1.0,
    ) -> None:
        """Update a sensor reading for a tracked device."""
        if device_id not in self.tracked_devices:
            # Auto-add device if not already tracked
            self.add_tracked_device(device_id, device_id)

        device = self.tracked_devices[device_id]
        sensor = self.sensors.get(sensor_id)

        if sensor is None:
            _LOGGER.warning("Unknown sensor: %s", sensor_id)
            return

        reading = SensorReading(
            sensor_id=sensor_id,
            location=sensor.location,
            rssi=rssi,
            distance=distance,
            timestamp=datetime.now().timestamp(),
            confidence=confidence,
        )

        device.current_readings[sensor_id] = reading
        device.last_seen = datetime.now()
        sensor.last_seen = datetime.now()

    def get_device_readings(self, device_id: str) -> List[SensorReading]:
        """Get all current sensor readings for a device."""
        device = self.tracked_devices.get(device_id)
        if device is None:
            return []

        return list(device.current_readings.values())

    def clear_stale_readings(self, max_age_seconds: float = 10.0) -> None:
        """Remove readings older than max_age_seconds."""
        now = datetime.now().timestamp()

        for device in self.tracked_devices.values():
            stale_sensors = [
                sensor_id
                for sensor_id, reading in device.current_readings.items()
                if reading.timestamp is not None
                and (now - reading.timestamp) > max_age_seconds
            ]

            for sensor_id in stale_sensors:
                del device.current_readings[sensor_id]

    async def async_shutdown(self) -> None:
        """Clean up resources."""
        _LOGGER.info("Shutting down device manager")

        # Unsubscribe from MQTT topics
        for unsub in self._mqtt_subscriptions:
            unsub()

        self._mqtt_subscriptions.clear()
