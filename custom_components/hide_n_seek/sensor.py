"""Sensor platform for Hide-n-Seek."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.sensor import SensorEntity, SensorDeviceClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, ATTR_CONFIDENCE, ATTR_SENSOR_COUNT
from .coordinator import HideNSeekCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Hide-n-Seek sensor entities."""
    coordinator: HideNSeekCoordinator = hass.data[DOMAIN][entry.entry_id]

    entities = []

    # Create position sensors for each tracked device
    for device in coordinator.device_manager.get_all_tracked_devices():
        entities.append(DeviceXPositionSensor(coordinator, device.id))
        entities.append(DeviceYPositionSensor(coordinator, device.id))
        entities.append(DeviceConfidenceSensor(coordinator, device.id))

    # Create sensor count sensors for tracked devices
    for device in coordinator.device_manager.get_all_tracked_devices():
        entities.append(DeviceSensorCountSensor(coordinator, device.id))

    async_add_entities(entities)


class HideNSeekSensorBase(CoordinatorEntity, SensorEntity):
    """Base class for Hide-n-Seek sensors."""

    def __init__(self, coordinator: HideNSeekCoordinator, device_id: str):
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._device_id = device_id
        self._attr_has_entity_name = True

    @property
    def device_info(self):
        """Return device information."""
        device = self.coordinator.device_manager.get_tracked_device(self._device_id)
        if device is None:
            return None

        return {
            "identifiers": {(DOMAIN, self._device_id)},
            "name": device.name,
            "manufacturer": "Hide-n-Seek",
            "model": "Tracked Device",
        }


class DeviceXPositionSensor(HideNSeekSensorBase):
    """Sensor for device X position."""

    _attr_native_unit_of_measurement = "m"
    _attr_icon = "mdi:map-marker-radius"

    def __init__(self, coordinator: HideNSeekCoordinator, device_id: str):
        """Initialize the sensor."""
        super().__init__(coordinator, device_id)
        self._attr_unique_id = f"{device_id}_x_position"
        self._attr_name = "X Position"

    @property
    def native_value(self) -> float | None:
        """Return the X position."""
        position = self.coordinator.get_position(self._device_id)
        if position is None:
            return None
        return round(position["x"], 2)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return additional attributes."""
        position = self.coordinator.get_position(self._device_id)
        if position is None:
            return {}

        return {
            ATTR_CONFIDENCE: position.get("confidence", 0),
            ATTR_SENSOR_COUNT: position.get("sensor_count", 0),
            "method": position.get("method", "unknown"),
        }


class DeviceYPositionSensor(HideNSeekSensorBase):
    """Sensor for device Y position."""

    _attr_native_unit_of_measurement = "m"
    _attr_icon = "mdi:map-marker-radius"

    def __init__(self, coordinator: HideNSeekCoordinator, device_id: str):
        """Initialize the sensor."""
        super().__init__(coordinator, device_id)
        self._attr_unique_id = f"{device_id}_y_position"
        self._attr_name = "Y Position"

    @property
    def native_value(self) -> float | None:
        """Return the Y position."""
        position = self.coordinator.get_position(self._device_id)
        if position is None:
            return None
        return round(position["y"], 2)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return additional attributes."""
        position = self.coordinator.get_position(self._device_id)
        if position is None:
            return {}

        return {
            ATTR_CONFIDENCE: position.get("confidence", 0),
            ATTR_SENSOR_COUNT: position.get("sensor_count", 0),
            "method": position.get("method", "unknown"),
        }


class DeviceConfidenceSensor(HideNSeekSensorBase):
    """Sensor for position confidence."""

    _attr_native_unit_of_measurement = "%"
    _attr_icon = "mdi:signal"

    def __init__(self, coordinator: HideNSeekCoordinator, device_id: str):
        """Initialize the sensor."""
        super().__init__(coordinator, device_id)
        self._attr_unique_id = f"{device_id}_confidence"
        self._attr_name = "Position Confidence"

    @property
    def native_value(self) -> float | None:
        """Return the confidence as percentage."""
        position = self.coordinator.get_position(self._device_id)
        if position is None:
            return None
        return round(position["confidence"] * 100, 1)


class DeviceSensorCountSensor(HideNSeekSensorBase):
    """Sensor for number of sensors tracking device."""

    _attr_icon = "mdi:counter"

    def __init__(self, coordinator: HideNSeekCoordinator, device_id: str):
        """Initialize the sensor."""
        super().__init__(coordinator, device_id)
        self._attr_unique_id = f"{device_id}_sensor_count"
        self._attr_name = "Tracking Sensors"

    @property
    def native_value(self) -> int | None:
        """Return the sensor count."""
        position = self.coordinator.get_position(self._device_id)
        if position is None:
            return None
        return position["sensor_count"]
