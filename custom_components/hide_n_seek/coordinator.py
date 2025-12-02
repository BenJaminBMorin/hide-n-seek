"""Data update coordinator for Hide-n-Seek."""
from __future__ import annotations

import asyncio
import logging
from datetime import timedelta
from pathlib import Path
from typing import Any, Dict

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.helpers.event import async_track_time_interval, async_track_time_change

from .const import (
    DOMAIN,
    EVENT_DEVICE_POSITION_UPDATE,
    ATTR_DEVICE_ID,
    ATTR_POSITION,
    ATTR_CONFIDENCE,
    ATTR_SENSOR_COUNT,
    DEFAULT_RETENTION_DAYS,
)
from .device_manager import DeviceManager
from .triangulation import TriangulationEngine
from .zone_manager import ZoneManager
from .history_manager import PositionHistoryManager
from .person_manager import PersonManager

_LOGGER = logging.getLogger(__name__)


class HideNSeekCoordinator(DataUpdateCoordinator):
    """Coordinator to manage Hide-n-Seek data updates."""

    def __init__(
        self,
        hass: HomeAssistant,
        update_interval: float,
        entry: ConfigEntry,
    ):
        """Initialize the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(seconds=update_interval),
        )

        self.entry = entry
        self.device_manager = DeviceManager(hass)
        self.triangulation_engine = TriangulationEngine()
        self.zone_manager = ZoneManager(hass)

        # Initialize history and person managers
        data_path = Path(hass.config.path(DOMAIN))
        data_path.mkdir(exist_ok=True)
        self.history_manager = PositionHistoryManager(hass, data_path)
        self.person_manager = PersonManager(hass)

        self._update_interval = update_interval
        self._unsub_timer = None
        self._unsub_cleanup = None

    async def _async_update_data(self) -> Dict[str, Any]:
        """Fetch data from sensors and calculate positions."""
        try:
            # Clear stale readings (older than 3x update interval)
            self.device_manager.clear_stale_readings(self._update_interval * 3)

            positions = {}

            # Calculate position for each tracked device
            for device in self.device_manager.get_all_tracked_devices():
                readings = self.device_manager.get_device_readings(device.id)

                if not readings:
                    continue

                # Calculate position using triangulation
                position = self.triangulation_engine.calculate_position(
                    device.id, readings, use_kalman=True
                )

                if position is None:
                    continue

                # Update device state
                device.last_position = (position.x, position.y)
                device.last_confidence = position.confidence

                # Update zone occupancy
                await self.zone_manager.update_device_position(
                    device.id, position.x, position.y
                )

                # Store position data
                positions[device.id] = {
                    "x": position.x,
                    "y": position.y,
                    "confidence": position.confidence,
                    "sensor_count": position.sensor_count,
                    "method": position.method,
                }

                # Fire position update event
                self.hass.bus.async_fire(
                    EVENT_DEVICE_POSITION_UPDATE,
                    {
                        ATTR_DEVICE_ID: device.id,
                        ATTR_POSITION: {"x": position.x, "y": position.y},
                        ATTR_CONFIDENCE: position.confidence,
                        ATTR_SENSOR_COUNT: position.sensor_count,
                    },
                )

                # Record position to history
                await self.history_manager.record_position(device.id, position)

            return {
                "positions": positions,
                "sensors": {
                    s.id: s.to_dict() for s in self.device_manager.get_all_sensors()
                },
                "devices": {
                    d.id: d.to_dict()
                    for d in self.device_manager.get_all_tracked_devices()
                },
                "zones": {z.id: z.to_dict() for z in self.zone_manager.get_all_zones()},
            }

        except Exception as err:
            _LOGGER.exception("Error updating Hide-n-Seek data: %s", err)
            raise UpdateFailed(f"Error updating data: {err}") from err

    async def async_config_entry_first_refresh(self) -> None:
        """Perform first refresh and setup."""
        # Set up device manager
        await self.device_manager.async_setup()

        # Load zones from storage
        await self.zone_manager.async_load()

        # Initialize history manager
        await self.history_manager.async_initialize()

        # Initialize person manager
        await self.person_manager.async_initialize()

        # Schedule daily cleanup at 3 AM
        self._unsub_cleanup = async_track_time_change(
            self.hass,
            self._async_cleanup_old_data,
            hour=3,
            minute=0,
            second=0
        )

        # Perform first data refresh
        await super().async_config_entry_first_refresh()

    async def _async_cleanup_old_data(self, now=None) -> None:
        """Clean up old position history data."""
        try:
            retention_days = self.entry.options.get("retention_days", DEFAULT_RETENTION_DAYS)
            deleted_count = await self.history_manager.cleanup_old_data(retention_days)
            _LOGGER.info("Cleaned up %d old position records", deleted_count)

            # Pre-aggregate heat maps for the previous hour
            await self.history_manager.pre_aggregate_heat_maps()

        except Exception as err:
            _LOGGER.error("Error during cleanup: %s", err)

    async def calibrate_sensor(self, sensor_id: str) -> None:
        """Calibrate a sensor (placeholder for future implementation)."""
        sensor = self.device_manager.get_sensor(sensor_id)
        if sensor is None:
            _LOGGER.warning("Cannot calibrate unknown sensor: %s", sensor_id)
            return

        _LOGGER.info("Calibrating sensor: %s", sensor.name)
        # Calibration logic would go here
        # This could involve measuring RSSI at known distances, adjusting path loss exponent, etc.

    def get_position(self, device_id: str) -> Dict[str, Any] | None:
        """Get the current position of a device."""
        if self.data is None:
            return None

        return self.data.get("positions", {}).get(device_id)

    def get_device_zones(self, device_id: str) -> list:
        """Get zones a device is currently in."""
        zones = self.zone_manager.get_device_zones(device_id)
        return [{"id": z.id, "name": z.name} for z in zones]

    async def async_shutdown(self) -> None:
        """Clean up resources."""
        _LOGGER.info("Shutting down Hide-n-Seek coordinator")

        if self._unsub_timer:
            self._unsub_timer()
            self._unsub_timer = None

        await self.device_manager.async_shutdown()
