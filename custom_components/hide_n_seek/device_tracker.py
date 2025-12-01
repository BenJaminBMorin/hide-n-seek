"""Device tracker platform for Hide-n-Seek."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.device_tracker import SourceType, TrackerEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import HideNSeekCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Hide-n-Seek device tracker entities."""
    coordinator: HideNSeekCoordinator = hass.data[DOMAIN][entry.entry_id]

    entities = []

    # Create device tracker for each tracked device
    for device in coordinator.device_manager.get_all_tracked_devices():
        entities.append(HideNSeekDeviceTracker(coordinator, device.id))

    async_add_entities(entities)


class HideNSeekDeviceTracker(CoordinatorEntity, TrackerEntity):
    """Representation of a Hide-n-Seek tracked device."""

    _attr_has_entity_name = True

    def __init__(self, coordinator: HideNSeekCoordinator, device_id: str):
        """Initialize the device tracker."""
        super().__init__(coordinator)
        self._device_id = device_id
        self._attr_unique_id = f"{device_id}_tracker"
        self._attr_name = "Device Tracker"

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

    @property
    def source_type(self) -> SourceType:
        """Return the source type."""
        return SourceType.BLUETOOTH

    @property
    def latitude(self) -> float | None:
        """Return latitude value (not used for indoor tracking)."""
        return None

    @property
    def longitude(self) -> float | None:
        """Return longitude value (not used for indoor tracking)."""
        return None

    @property
    def location_name(self) -> str | None:
        """Return a location name for the current position."""
        zones = self.coordinator.get_device_zones(self._device_id)
        if zones:
            return ", ".join([z["name"] for z in zones])
        return "Home"

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return additional state attributes."""
        device = self.coordinator.device_manager.get_tracked_device(self._device_id)
        position = self.coordinator.get_position(self._device_id)

        attributes = {}

        if device:
            if device.mac_address:
                attributes["mac_address"] = device.mac_address
            if device.last_seen:
                attributes["last_seen"] = device.last_seen.isoformat()

        if position:
            attributes["position_x"] = round(position["x"], 2)
            attributes["position_y"] = round(position["y"], 2)
            attributes["confidence"] = round(position["confidence"] * 100, 1)
            attributes["sensor_count"] = position["sensor_count"]
            attributes["method"] = position["method"]

        zones = self.coordinator.get_device_zones(self._device_id)
        if zones:
            attributes["zones"] = [z["name"] for z in zones]

        return attributes

    @property
    def available(self) -> bool:
        """Return if entity is available."""
        device = self.coordinator.device_manager.get_tracked_device(self._device_id)
        if device is None:
            return False

        # Consider device available if we have recent readings
        return len(device.current_readings) > 0
