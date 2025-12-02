"""WebSocket API for Hide-n-Seek integration."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv

from .const import (
    DOMAIN,
    WS_TYPE_SUBSCRIBE_POSITIONS,
    WS_TYPE_SUBSCRIBE_ZONES,
    WS_TYPE_UPDATE_ZONE,
    WS_TYPE_DELETE_ZONE,
    WS_TYPE_CALIBRATE_SENSOR,
    WS_TYPE_GET_MAP_DATA,
    WS_TYPE_ADD_SENSOR,
    WS_TYPE_UPDATE_SENSOR,
    WS_TYPE_DELETE_SENSOR,
    WS_TYPE_GET_SENSORS,
    EVENT_DEVICE_POSITION_UPDATE,
    EVENT_ZONE_ENTERED,
    EVENT_ZONE_EXITED,
)
from .coordinator import HideNSeekCoordinator

_LOGGER = logging.getLogger(__name__)


@callback
def async_register_websocket_handlers(hass: HomeAssistant) -> None:
    """Register WebSocket API handlers."""
    websocket_api.async_register_command(hass, handle_subscribe_positions)
    websocket_api.async_register_command(hass, handle_subscribe_zones)
    websocket_api.async_register_command(hass, handle_get_map_data)
    websocket_api.async_register_command(hass, handle_update_zone)
    websocket_api.async_register_command(hass, handle_delete_zone)
    websocket_api.async_register_command(hass, handle_calibrate_sensor)
    websocket_api.async_register_command(hass, handle_add_sensor)
    websocket_api.async_register_command(hass, handle_update_sensor)
    websocket_api.async_register_command(hass, handle_delete_sensor)
    websocket_api.async_register_command(hass, handle_get_sensors)
    websocket_api.async_register_command(hass, handle_add_tracked_device)


def _get_coordinator(hass: HomeAssistant, config_entry_id: str) -> HideNSeekCoordinator:
    """Get coordinator from entry ID."""
    if config_entry_id not in hass.data.get(DOMAIN, {}):
        raise ValueError(f"Unknown config entry: {config_entry_id}")
    return hass.data[DOMAIN][config_entry_id]


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_SUBSCRIBE_POSITIONS,
        vol.Required("config_entry_id"): str,
    }
)
@websocket_api.async_response
async def handle_subscribe_positions(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle subscribe to position updates."""

    @callback
    def position_update_listener(event):
        """Forward position updates to WebSocket."""
        connection.send_event(
            msg["id"],
            {
                "type": "position_update",
                "data": event.data,
            },
        )

    # Subscribe to position update events
    connection.subscriptions[msg["id"]] = hass.bus.async_listen(
        EVENT_DEVICE_POSITION_UPDATE, position_update_listener
    )

    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_SUBSCRIBE_ZONES,
        vol.Required("config_entry_id"): str,
    }
)
@websocket_api.async_response
async def handle_subscribe_zones(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle subscribe to zone events."""

    @callback
    def zone_event_listener(event):
        """Forward zone events to WebSocket."""
        connection.send_event(
            msg["id"],
            {
                "type": "zone_event",
                "event_type": event.event_type,
                "data": event.data,
            },
        )

    # Subscribe to zone events
    unsub_entered = hass.bus.async_listen(EVENT_ZONE_ENTERED, zone_event_listener)
    unsub_exited = hass.bus.async_listen(EVENT_ZONE_EXITED, zone_event_listener)

    @callback
    def unsub_all():
        """Unsubscribe from all events."""
        unsub_entered()
        unsub_exited()

    connection.subscriptions[msg["id"]] = unsub_all

    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_GET_MAP_DATA,
        vol.Required("config_entry_id"): str,
    }
)
@websocket_api.async_response
async def handle_get_map_data(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Get all map data (sensors, devices, zones, positions)."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        data = {
            "sensors": [s.to_dict() for s in coordinator.device_manager.get_all_sensors()],
            "devices": [
                d.to_dict() for d in coordinator.device_manager.get_all_tracked_devices()
            ],
            "zones": [z.to_dict() for z in coordinator.zone_manager.get_all_zones()],
            "positions": coordinator.data.get("positions", {}) if coordinator.data else {},
        }

        connection.send_result(msg["id"], data)

    except ValueError as err:
        connection.send_error(msg["id"], "not_found", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_UPDATE_ZONE,
        vol.Required("config_entry_id"): str,
        vol.Optional("zone_id"): str,
        vol.Required("zone_data"): {
            vol.Required("name"): str,
            vol.Required("coordinates"): [[float, float]],
            vol.Optional("color"): str,
            vol.Optional("enabled"): bool,
        },
    }
)
@websocket_api.async_response
async def handle_update_zone(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update or create a zone."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        zone_id = msg.get("zone_id")
        zone_data = msg["zone_data"]

        if zone_id:
            # Update existing zone
            zone = await coordinator.zone_manager.update_zone(zone_id, zone_data)
        else:
            # Create new zone
            zone = await coordinator.zone_manager.create_zone(zone_data)

        if zone:
            connection.send_result(msg["id"], zone.to_dict())
        else:
            connection.send_error(msg["id"], "update_failed", "Failed to update zone")

    except ValueError as err:
        connection.send_error(msg["id"], "not_found", str(err))
    except Exception as err:
        _LOGGER.exception("Error updating zone: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_DELETE_ZONE,
        vol.Required("config_entry_id"): str,
        vol.Required("zone_id"): str,
    }
)
@websocket_api.async_response
async def handle_delete_zone(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a zone."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        success = await coordinator.zone_manager.delete_zone(msg["zone_id"])

        if success:
            connection.send_result(msg["id"], {"success": True})
        else:
            connection.send_error(msg["id"], "not_found", "Zone not found")

    except ValueError as err:
        connection.send_error(msg["id"], "not_found", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_CALIBRATE_SENSOR,
        vol.Required("config_entry_id"): str,
        vol.Required("sensor_id"): str,
    }
)
@websocket_api.async_response
async def handle_calibrate_sensor(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Calibrate a sensor."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        await coordinator.calibrate_sensor(msg["sensor_id"])

        connection.send_result(msg["id"], {"success": True})

    except ValueError as err:
        connection.send_error(msg["id"], "not_found", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_ADD_SENSOR,
        vol.Required("config_entry_id"): str,
        vol.Required("sensor_data"): {
            vol.Required("id"): str,
            vol.Required("name"): str,
            vol.Required("type"): str,
            vol.Required("location"): [float, float],
            vol.Optional("metadata"): dict,
        },
    }
)
@websocket_api.async_response
async def handle_add_sensor(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Add a new sensor."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        sensor_data = msg["sensor_data"]
        sensor = coordinator.device_manager.add_sensor(
            sensor_id=sensor_data["id"],
            name=sensor_data["name"],
            sensor_type=sensor_data["type"],
            location=tuple(sensor_data["location"]),
            metadata=sensor_data.get("metadata"),
        )

        connection.send_result(msg["id"], sensor.to_dict())

    except ValueError as err:
        connection.send_error(msg["id"], "invalid_data", str(err))
    except Exception as err:
        _LOGGER.exception("Error adding sensor: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "hide_n_seek/add_tracked_device",
        vol.Required("config_entry_id"): str,
        vol.Required("device_data"): {
            vol.Required("id"): str,
            vol.Required("name"): str,
            vol.Optional("mac_address"): str,
        },
    }
)
@websocket_api.async_response
async def handle_add_tracked_device(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Add a new tracked device."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        device_data = msg["device_data"]
        device = coordinator.device_manager.add_tracked_device(
            device_id=device_data["id"],
            name=device_data["name"],
            mac_address=device_data.get("mac_address"),
        )

        connection.send_result(msg["id"], device.to_dict())

    except ValueError as err:
        connection.send_error(msg["id"], "invalid_data", str(err))
    except Exception as err:
        _LOGGER.exception("Error adding tracked device: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_UPDATE_SENSOR,
        vol.Required("config_entry_id"): str,
        vol.Required("sensor_id"): str,
        vol.Optional("sensor_data"): {
            vol.Optional("name"): str,
            vol.Optional("type"): str,
            vol.Optional("location"): [float, float],
            vol.Optional("enabled"): bool,
            vol.Optional("metadata"): dict,
        },
    }
)
@websocket_api.async_response
async def handle_update_sensor(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update an existing sensor."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        sensor_data = msg.get("sensor_data", {})
        sensor = coordinator.device_manager.update_sensor(
            sensor_id=msg["sensor_id"],
            name=sensor_data.get("name"),
            sensor_type=sensor_data.get("type"),
            location=tuple(sensor_data["location"]) if "location" in sensor_data else None,
            enabled=sensor_data.get("enabled"),
            metadata=sensor_data.get("metadata"),
        )

        if sensor:
            connection.send_result(msg["id"], sensor.to_dict())
        else:
            connection.send_error(msg["id"], "not_found", "Sensor not found")

    except ValueError as err:
        connection.send_error(msg["id"], "invalid_data", str(err))
    except Exception as err:
        _LOGGER.exception("Error updating sensor: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_DELETE_SENSOR,
        vol.Required("config_entry_id"): str,
        vol.Required("sensor_id"): str,
    }
)
@websocket_api.async_response
async def handle_delete_sensor(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a sensor."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        success = coordinator.device_manager.remove_sensor(msg["sensor_id"])

        if success:
            connection.send_result(msg["id"], {"success": True})
        else:
            connection.send_error(msg["id"], "not_found", "Sensor not found")

    except ValueError as err:
        connection.send_error(msg["id"], "not_found", str(err))
    except Exception as err:
        _LOGGER.exception("Error deleting sensor: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_GET_SENSORS,
        vol.Required("config_entry_id"): str,
    }
)
@websocket_api.async_response
async def handle_get_sensors(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Get all sensors."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        sensors = [s.to_dict() for s in coordinator.device_manager.get_all_sensors()]

        connection.send_result(msg["id"], {"sensors": sensors})

    except ValueError as err:
        connection.send_error(msg["id"], "not_found", str(err))
    except Exception as err:
        _LOGGER.exception("Error getting sensors: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))
