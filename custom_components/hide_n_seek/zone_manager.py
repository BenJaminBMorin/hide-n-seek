"""Zone management for Hide-n-Seek."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
import uuid

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import (
    DOMAIN,
    EVENT_ZONE_ENTERED,
    EVENT_ZONE_EXITED,
    ATTR_ZONE_NAME,
    ATTR_DEVICE_ID,
    ATTR_POSITION,
)

_LOGGER = logging.getLogger(__name__)

STORAGE_VERSION = 1
STORAGE_KEY = f"{DOMAIN}_zones"


@dataclass
class Zone:
    """Represents a defined zone in the tracking area."""

    id: str
    name: str
    coordinates: List[Tuple[float, float]]  # List of (x, y) points defining polygon
    occupied_by: List[str] = field(default_factory=list)  # List of device IDs
    color: str = "#3498db"  # Hex color for UI
    enabled: bool = True

    def contains_point(self, x: float, y: float) -> bool:
        """
        Check if a point is inside the zone using ray casting algorithm.

        Works for any polygon shape.
        """
        if len(self.coordinates) < 3:
            return False

        inside = False
        n = len(self.coordinates)

        p1x, p1y = self.coordinates[0]

        for i in range(n + 1):
            p2x, p2y = self.coordinates[i % n]

            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside

            p1x, p1y = p2x, p2y

        return inside

    def to_dict(self) -> dict:
        """Convert zone to dictionary for storage."""
        return {
            "id": self.id,
            "name": self.name,
            "coordinates": self.coordinates,
            "color": self.color,
            "enabled": self.enabled,
        }

    @classmethod
    def from_dict(cls, data: dict) -> Zone:
        """Create zone from dictionary."""
        return cls(
            id=data["id"],
            name=data["name"],
            coordinates=data["coordinates"],
            color=data.get("color", "#3498db"),
            enabled=data.get("enabled", True),
        )


class ZoneManager:
    """Manages zones and occupancy detection."""

    def __init__(self, hass: HomeAssistant):
        """Initialize the zone manager."""
        self.hass = hass
        self.zones: Dict[str, Zone] = {}
        self.device_zones: Dict[str, set] = {}  # device_id -> set of zone_ids
        self._store = Store(hass, STORAGE_VERSION, STORAGE_KEY)

    async def async_load(self) -> None:
        """Load zones from storage."""
        data = await self._store.async_load()

        if data is None:
            _LOGGER.info("No stored zones found, starting fresh")
            return

        for zone_data in data.get("zones", []):
            try:
                zone = Zone.from_dict(zone_data)
                self.zones[zone.id] = zone
                _LOGGER.info("Loaded zone: %s", zone.name)
            except Exception as err:
                _LOGGER.error("Failed to load zone: %s", err)

    async def async_save(self) -> None:
        """Save zones to storage."""
        data = {
            "zones": [zone.to_dict() for zone in self.zones.values()],
        }
        await self._store.async_save(data)

    async def create_zone(self, zone_data: dict) -> Zone:
        """Create a new zone."""
        zone = Zone(
            id=zone_data.get("id", str(uuid.uuid4())),
            name=zone_data["name"],
            coordinates=zone_data["coordinates"],
            color=zone_data.get("color", "#3498db"),
            enabled=zone_data.get("enabled", True),
        )

        self.zones[zone.id] = zone
        await self.async_save()

        _LOGGER.info("Created zone: %s", zone.name)
        return zone

    async def update_zone(self, zone_id: str, zone_data: dict) -> Optional[Zone]:
        """Update an existing zone."""
        if zone_id not in self.zones:
            _LOGGER.warning("Zone %s not found", zone_id)
            return None

        zone = self.zones[zone_id]

        if "name" in zone_data:
            zone.name = zone_data["name"]
        if "coordinates" in zone_data:
            zone.coordinates = zone_data["coordinates"]
        if "color" in zone_data:
            zone.color = zone_data["color"]
        if "enabled" in zone_data:
            zone.enabled = zone_data["enabled"]

        await self.async_save()

        _LOGGER.info("Updated zone: %s", zone.name)
        return zone

    async def delete_zone(self, zone_id: str) -> bool:
        """Delete a zone."""
        if zone_id not in self.zones:
            _LOGGER.warning("Zone %s not found", zone_id)
            return False

        zone = self.zones.pop(zone_id)
        await self.async_save()

        _LOGGER.info("Deleted zone: %s", zone.name)
        return True

    def get_zone(self, zone_id: str) -> Optional[Zone]:
        """Get a zone by ID."""
        return self.zones.get(zone_id)

    def get_all_zones(self) -> List[Zone]:
        """Get all zones."""
        return list(self.zones.values())

    async def update_device_position(
        self, device_id: str, x: float, y: float
    ) -> None:
        """
        Update device position and check for zone transitions.

        Fires events when devices enter or exit zones.
        """
        current_zones = set()

        # Check which zones the device is in
        for zone in self.zones.values():
            if not zone.enabled:
                continue

            if zone.contains_point(x, y):
                current_zones.add(zone.id)

        # Get previously occupied zones for this device
        previous_zones = self.device_zones.get(device_id, set())

        # Detect zone entries
        entered_zones = current_zones - previous_zones
        for zone_id in entered_zones:
            zone = self.zones[zone_id]
            zone.occupied_by.append(device_id)

            # Fire event
            self.hass.bus.async_fire(
                EVENT_ZONE_ENTERED,
                {
                    ATTR_ZONE_NAME: zone.name,
                    ATTR_DEVICE_ID: device_id,
                    ATTR_POSITION: {"x": x, "y": y},
                },
            )

            _LOGGER.info("Device %s entered zone %s", device_id, zone.name)

        # Detect zone exits
        exited_zones = previous_zones - current_zones
        for zone_id in exited_zones:
            zone = self.zones[zone_id]
            if device_id in zone.occupied_by:
                zone.occupied_by.remove(device_id)

            # Fire event
            self.hass.bus.async_fire(
                EVENT_ZONE_EXITED,
                {
                    ATTR_ZONE_NAME: zone.name,
                    ATTR_DEVICE_ID: device_id,
                    ATTR_POSITION: {"x": x, "y": y},
                },
            )

            _LOGGER.info("Device %s exited zone %s", device_id, zone.name)

        # Update device zones
        self.device_zones[device_id] = current_zones

    def get_device_zones(self, device_id: str) -> List[Zone]:
        """Get all zones a device is currently in."""
        zone_ids = self.device_zones.get(device_id, set())
        return [self.zones[zone_id] for zone_id in zone_ids if zone_id in self.zones]

    def get_zone_occupancy(self, zone_id: str) -> List[str]:
        """Get list of devices currently in a zone."""
        zone = self.zones.get(zone_id)
        if zone is None:
            return []
        return zone.occupied_by.copy()
