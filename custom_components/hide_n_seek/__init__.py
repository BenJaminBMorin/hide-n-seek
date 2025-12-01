"""The Hide-n-Seek Presence Tracker integration."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .const import (
    DOMAIN,
    CONF_UPDATE_INTERVAL,
    DEFAULT_UPDATE_INTERVAL,
)
from .coordinator import HideNSeekCoordinator

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [
    Platform.SENSOR,
    Platform.DEVICE_TRACKER,
]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Hide-n-Seek integration from configuration.yaml."""
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Hide-n-Seek from a config entry."""
    _LOGGER.info("Setting up Hide-n-Seek Presence Tracker")

    # Create coordinator
    update_interval = entry.options.get(
        CONF_UPDATE_INTERVAL, DEFAULT_UPDATE_INTERVAL
    )

    coordinator = HideNSeekCoordinator(
        hass,
        update_interval=update_interval,
        entry=entry,
    )

    # Store coordinator
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = coordinator

    # Fetch initial data
    await coordinator.async_config_entry_first_refresh()

    # Set up platforms
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # Register WebSocket API handlers
    from .websocket_api import async_register_websocket_handlers
    async_register_websocket_handlers(hass)

    # Register services
    await async_setup_services(hass, coordinator)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    _LOGGER.info("Unloading Hide-n-Seek Presence Tracker")

    # Unload platforms
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

    if unload_ok:
        coordinator = hass.data[DOMAIN].pop(entry.entry_id)
        await coordinator.async_shutdown()

    return unload_ok


async def async_setup_services(
    hass: HomeAssistant, coordinator: HideNSeekCoordinator
) -> None:
    """Set up services for the integration."""

    async def handle_calibrate_sensor(call):
        """Handle sensor calibration service call."""
        sensor_id = call.data.get("sensor_id")
        await coordinator.calibrate_sensor(sensor_id)

    async def handle_create_zone(call):
        """Handle zone creation service call."""
        zone_data = {
            "name": call.data.get("name"),
            "coordinates": call.data.get("coordinates"),
        }
        await coordinator.zone_manager.create_zone(zone_data)

    async def handle_delete_zone(call):
        """Handle zone deletion service call."""
        zone_id = call.data.get("zone_id")
        await coordinator.zone_manager.delete_zone(zone_id)

    # Register services
    hass.services.async_register(DOMAIN, "calibrate_sensor", handle_calibrate_sensor)
    hass.services.async_register(DOMAIN, "create_zone", handle_create_zone)
    hass.services.async_register(DOMAIN, "delete_zone", handle_delete_zone)
