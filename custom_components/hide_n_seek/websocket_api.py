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
    WS_TYPE_ADD_TRACKED_DEVICE,
    WS_TYPE_UPDATE_TRACKED_DEVICE,
    WS_TYPE_DELETE_TRACKED_DEVICE,
    WS_TYPE_GET_TRACKED_DEVICES,
    WS_TYPE_GET_PERSONS,
    WS_TYPE_UPDATE_PERSON,
    WS_TYPE_DELETE_PERSON,
    WS_TYPE_SET_ACTIVE_DEVICE,
    WS_TYPE_GET_POSITION_HISTORY,
    WS_TYPE_GET_HEAT_MAP_DATA,
    WS_TYPE_GET_TIMELINE_POSITIONS,
    WS_TYPE_GET_FLOOR_PLAN,
    WS_TYPE_UPDATE_FLOOR_PLAN,
    WS_TYPE_UPDATE_ROOM,
    WS_TYPE_DELETE_ROOM,
    EVENT_DEVICE_POSITION_UPDATE,
    EVENT_ZONE_ENTERED,
    EVENT_ZONE_EXITED,
)
from .coordinator import HideNSeekCoordinator

_LOGGER = logging.getLogger(__name__)


@callback
def async_register_websocket_handlers(hass: HomeAssistant) -> None:
    """Register WebSocket API handlers."""
    # Position and zone subscriptions
    websocket_api.async_register_command(hass, handle_subscribe_positions)
    websocket_api.async_register_command(hass, handle_subscribe_zones)
    websocket_api.async_register_command(hass, handle_get_map_data)

    # Zone management
    websocket_api.async_register_command(hass, handle_update_zone)
    websocket_api.async_register_command(hass, handle_delete_zone)

    # Sensor management
    websocket_api.async_register_command(hass, handle_calibrate_sensor)
    websocket_api.async_register_command(hass, handle_add_sensor)
    websocket_api.async_register_command(hass, handle_update_sensor)
    websocket_api.async_register_command(hass, handle_delete_sensor)
    websocket_api.async_register_command(hass, handle_get_sensors)

    # Device management
    websocket_api.async_register_command(hass, handle_add_tracked_device)
    websocket_api.async_register_command(hass, handle_update_tracked_device)
    websocket_api.async_register_command(hass, handle_delete_tracked_device)
    websocket_api.async_register_command(hass, handle_get_tracked_devices)

    # Person management
    websocket_api.async_register_command(hass, handle_get_persons)
    websocket_api.async_register_command(hass, handle_update_person)
    websocket_api.async_register_command(hass, handle_delete_person)
    websocket_api.async_register_command(hass, handle_set_active_device)

    # History queries
    websocket_api.async_register_command(hass, handle_get_position_history)
    websocket_api.async_register_command(hass, handle_get_heat_map_data)
    websocket_api.async_register_command(hass, handle_get_timeline_positions)

    # Floor plan management
    websocket_api.async_register_command(hass, handle_get_floor_plan)
    websocket_api.async_register_command(hass, handle_update_floor_plan)
    websocket_api.async_register_command(hass, handle_update_room)
    websocket_api.async_register_command(hass, handle_delete_room)
    websocket_api.async_register_command(hass, handle_update_wall)
    websocket_api.async_register_command(hass, handle_delete_wall)


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


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_UPDATE_TRACKED_DEVICE,
        vol.Required("config_entry_id"): str,
        vol.Required("device_id"): str,
        vol.Optional("device_data"): {
            vol.Optional("name"): str,
            vol.Optional("mac_address"): str,
        },
    }
)
@websocket_api.async_response
async def handle_update_tracked_device(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update a tracked device."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        device = coordinator.device_manager.get_tracked_device(msg["device_id"])
        if not device:
            connection.send_error(msg["id"], "not_found", "Device not found")
            return

        device_data = msg.get("device_data", {})
        if "name" in device_data:
            device.name = device_data["name"]
        if "mac_address" in device_data:
            device.mac_address = device_data["mac_address"]

        connection.send_result(msg["id"], device.to_dict())

    except ValueError as err:
        connection.send_error(msg["id"], "invalid_data", str(err))
    except Exception as err:
        _LOGGER.exception("Error updating tracked device: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_DELETE_TRACKED_DEVICE,
        vol.Required("config_entry_id"): str,
        vol.Required("device_id"): str,
    }
)
@websocket_api.async_response
async def handle_delete_tracked_device(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a tracked device."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        success = coordinator.device_manager.remove_tracked_device(msg["device_id"])

        if success:
            connection.send_result(msg["id"], {"success": True})
        else:
            connection.send_error(msg["id"], "not_found", "Device not found")

    except ValueError as err:
        connection.send_error(msg["id"], "not_found", str(err))
    except Exception as err:
        _LOGGER.exception("Error deleting tracked device: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_GET_TRACKED_DEVICES,
        vol.Required("config_entry_id"): str,
    }
)
@websocket_api.async_response
async def handle_get_tracked_devices(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Get all tracked devices."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        devices = [d.to_dict() for d in coordinator.device_manager.get_all_tracked_devices()]

        connection.send_result(msg["id"], {"devices": devices})

    except ValueError as err:
        connection.send_error(msg["id"], "not_found", str(err))
    except Exception as err:
        _LOGGER.exception("Error getting tracked devices: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_GET_PERSONS,
        vol.Required("config_entry_id"): str,
    }
)
@websocket_api.async_response
async def handle_get_persons(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Get all persons."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        persons = [p.to_dict() for p in coordinator.person_manager.get_all_persons()]

        connection.send_result(msg["id"], {"persons": persons})

    except ValueError as err:
        connection.send_error(msg["id"], "not_found", str(err))
    except Exception as err:
        _LOGGER.exception("Error getting persons: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_UPDATE_PERSON,
        vol.Required("config_entry_id"): str,
        vol.Optional("person_id"): str,
        vol.Required("person_data"): {
            vol.Required("name"): str,
            vol.Required("default_device_id"): str,
            vol.Optional("linked_device_ids"): [str],
            vol.Optional("color"): str,
            vol.Optional("avatar"): str,
        },
    }
)
@websocket_api.async_response
async def handle_update_person(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update or create a person."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        person_id = msg.get("person_id")
        person_data = msg["person_data"]

        if person_id:
            # Update existing person
            person = coordinator.person_manager.update_person(
                person_id=person_id,
                name=person_data.get("name"),
                default_device_id=person_data.get("default_device_id"),
                linked_device_ids=person_data.get("linked_device_ids"),
                color=person_data.get("color"),
                avatar=person_data.get("avatar"),
            )
        else:
            # Create new person
            person_id = f"person_{person_data['name'].lower().replace(' ', '_')}"
            person = coordinator.person_manager.add_person(
                person_id=person_id,
                name=person_data["name"],
                default_device_id=person_data["default_device_id"],
                linked_device_ids=person_data.get("linked_device_ids"),
                color=person_data.get("color", "#2196F3"),
                avatar=person_data.get("avatar"),
            )

        # Save to storage
        await coordinator.person_manager.async_save()

        connection.send_result(msg["id"], person.to_dict())

    except ValueError as err:
        connection.send_error(msg["id"], "invalid_data", str(err))
    except Exception as err:
        _LOGGER.exception("Error updating person: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_DELETE_PERSON,
        vol.Required("config_entry_id"): str,
        vol.Required("person_id"): str,
    }
)
@websocket_api.async_response
async def handle_delete_person(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a person."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        coordinator.person_manager.delete_person(msg["person_id"])
        await coordinator.person_manager.async_save()

        connection.send_result(msg["id"], {"success": True})

    except ValueError as err:
        connection.send_error(msg["id"], "not_found", str(err))
    except Exception as err:
        _LOGGER.exception("Error deleting person: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_SET_ACTIVE_DEVICE,
        vol.Required("config_entry_id"): str,
        vol.Required("person_id"): str,
        vol.Required("device_id"): str,
    }
)
@websocket_api.async_response
async def handle_set_active_device(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Set the active tracking device for a person."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        person = coordinator.person_manager.set_active_device(
            msg["person_id"], msg["device_id"]
        )
        await coordinator.person_manager.async_save()

        connection.send_result(msg["id"], person.to_dict())

    except ValueError as err:
        connection.send_error(msg["id"], "invalid_data", str(err))
    except Exception as err:
        _LOGGER.exception("Error setting active device: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_GET_POSITION_HISTORY,
        vol.Required("config_entry_id"): str,
        vol.Required("device_id"): str,
        vol.Required("start_time"): str,  # ISO format
        vol.Required("end_time"): str,    # ISO format
        vol.Optional("limit"): int,
        vol.Optional("downsample_seconds"): int,
    }
)
@websocket_api.async_response
async def handle_get_position_history(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Get position history for a device."""
    try:
        from datetime import datetime

        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        start_time = datetime.fromisoformat(msg["start_time"])
        end_time = datetime.fromisoformat(msg["end_time"])

        positions = await coordinator.history_manager.get_positions(
            device_id=msg["device_id"],
            start_time=start_time,
            end_time=end_time,
            limit=msg.get("limit"),
            downsample_seconds=msg.get("downsample_seconds"),
        )

        result = [
            {
                "device_id": p.device_id,
                "timestamp": p.timestamp,
                "x": p.x,
                "y": p.y,
                "confidence": p.confidence,
                "method": p.method,
            }
            for p in positions
        ]

        connection.send_result(msg["id"], {"positions": result})

    except ValueError as err:
        connection.send_error(msg["id"], "invalid_data", str(err))
    except Exception as err:
        _LOGGER.exception("Error getting position history: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_GET_HEAT_MAP_DATA,
        vol.Required("config_entry_id"): str,
        vol.Required("device_id"): str,
        vol.Required("start_time"): str,  # ISO format
        vol.Required("end_time"): str,    # ISO format
        vol.Optional("grid_size"): float,
    }
)
@websocket_api.async_response
async def handle_get_heat_map_data(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Get heat map data for a device."""
    try:
        from datetime import datetime

        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        start_time = datetime.fromisoformat(msg["start_time"])
        end_time = datetime.fromisoformat(msg["end_time"])
        grid_size = msg.get("grid_size", 0.5)

        heat_map_data = await coordinator.history_manager.get_heat_map_data(
            device_id=msg["device_id"],
            start_time=start_time,
            end_time=end_time,
            grid_size=grid_size,
        )

        # Convert tuple keys to strings for JSON serialization
        data = {f"{k[0]},{k[1]}": v for k, v in heat_map_data.items()}

        connection.send_result(msg["id"], {"grid_size": grid_size, "data": data})

    except ValueError as err:
        connection.send_error(msg["id"], "invalid_data", str(err))
    except Exception as err:
        _LOGGER.exception("Error getting heat map data: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_GET_TIMELINE_POSITIONS,
        vol.Required("config_entry_id"): str,
        vol.Required("device_id"): str,
        vol.Required("start_time"): str,  # ISO format
        vol.Required("end_time"): str,    # ISO format
        vol.Optional("interval_seconds"): int,
    }
)
@websocket_api.async_response
async def handle_get_timeline_positions(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Get downsampled positions for timeline playback."""
    try:
        from datetime import datetime

        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        start_time = datetime.fromisoformat(msg["start_time"])
        end_time = datetime.fromisoformat(msg["end_time"])
        interval_seconds = msg.get("interval_seconds", 5)

        positions = await coordinator.history_manager.get_positions(
            device_id=msg["device_id"],
            start_time=start_time,
            end_time=end_time,
            downsample_seconds=interval_seconds,
        )

        result = [
            {
                "device_id": p.device_id,
                "timestamp": p.timestamp,
                "x": p.x,
                "y": p.y,
                "confidence": p.confidence,
                "method": p.method,
            }
            for p in positions
        ]

        connection.send_result(msg["id"], {"positions": result, "interval": interval_seconds})

    except ValueError as err:
        connection.send_error(msg["id"], "invalid_data", str(err))
    except Exception as err:
        _LOGGER.exception("Error getting timeline positions: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_GET_FLOOR_PLAN,
        vol.Required("config_entry_id"): str,
    }
)
@websocket_api.async_response
async def handle_get_floor_plan(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Get the complete floor plan."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        floor_plan = coordinator.floor_plan_manager.get_floor_plan()

        connection.send_result(msg["id"], floor_plan.to_dict())

    except ValueError as err:
        connection.send_error(msg["id"], "not_found", str(err))
    except Exception as err:
        _LOGGER.exception("Error getting floor plan: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_UPDATE_FLOOR_PLAN,
        vol.Required("config_entry_id"): str,
        vol.Optional("dimensions"): {
            vol.Required("width"): float,
            vol.Required("height"): float,
        },
    }
)
@websocket_api.async_response
async def handle_update_floor_plan(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update floor plan dimensions."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        dimensions = msg.get("dimensions")
        if dimensions:
            coordinator.floor_plan_manager.set_dimensions(
                dimensions["width"], dimensions["height"]
            )

        await coordinator.floor_plan_manager.async_save()

        floor_plan = coordinator.floor_plan_manager.get_floor_plan()
        connection.send_result(msg["id"], floor_plan.to_dict())

    except ValueError as err:
        connection.send_error(msg["id"], "invalid_data", str(err))
    except Exception as err:
        _LOGGER.exception("Error updating floor plan: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_UPDATE_ROOM,
        vol.Required("config_entry_id"): str,
        vol.Optional("room_id"): str,
        vol.Required("room_data"): {
            vol.Required("name"): str,
            vol.Required("coordinates"): [[float]],
            vol.Optional("color"): str,
        },
    }
)
@websocket_api.async_response
async def handle_update_room(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update or create a room."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        room_id = msg.get("room_id")
        room_data = msg["room_data"]

        if room_id:
            # Update existing room
            room = coordinator.floor_plan_manager.update_room(
                room_id=room_id,
                name=room_data.get("name"),
                coordinates=room_data.get("coordinates"),
                color=room_data.get("color"),
            )
            if not room:
                connection.send_error(msg["id"], "not_found", "Room not found")
                return
        else:
            # Create new room
            room_id = f"room_{room_data['name'].lower().replace(' ', '_')}"
            room = coordinator.floor_plan_manager.add_room(
                room_id=room_id,
                name=room_data["name"],
                coordinates=room_data["coordinates"],
                color=room_data.get("color", "#E0E0E0"),
            )

        await coordinator.floor_plan_manager.async_save()

        connection.send_result(msg["id"], room.to_dict())

    except ValueError as err:
        connection.send_error(msg["id"], "invalid_data", str(err))
    except Exception as err:
        _LOGGER.exception("Error updating room: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_DELETE_ROOM,
        vol.Required("config_entry_id"): str,
        vol.Required("room_id"): str,
    }
)
@websocket_api.async_response
async def handle_delete_room(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a room."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        success = coordinator.floor_plan_manager.delete_room(msg["room_id"])

        if success:
            await coordinator.floor_plan_manager.async_save()
            connection.send_result(msg["id"], {"success": True})
        else:
            connection.send_error(msg["id"], "not_found", "Room not found")

    except ValueError as err:
        connection.send_error(msg["id"], "not_found", str(err))
    except Exception as err:
        _LOGGER.exception("Error deleting room: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "hide_n_seek/update_wall",
        vol.Required("config_entry_id"): str,
        vol.Optional("wall_id"): str,
        vol.Required("wall_data"): {
            vol.Required("start"): [float, float],
            vol.Required("end"): [float, float],
            vol.Required("thickness"): float,
            vol.Optional("color"): str,
            vol.Optional("type"): str,
        },
    }
)
@websocket_api.async_response
async def handle_update_wall(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update or create a wall."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        wall_id = msg.get("wall_id")
        wall_data = msg["wall_data"]

        if wall_id:
            # Update existing wall
            wall = coordinator.floor_plan_manager.update_wall(
                wall_id=wall_id,
                start=wall_data.get("start"),
                end=wall_data.get("end"),
                thickness=wall_data.get("thickness"),
                color=wall_data.get("color"),
                wall_type=wall_data.get("type"),
            )
            if not wall:
                connection.send_error(msg["id"], "not_found", "Wall not found")
                return
        else:
            # Create new wall
            import uuid
            wall_id = f"wall_{uuid.uuid4().hex[:8]}"
            wall = coordinator.floor_plan_manager.add_wall(
                wall_id=wall_id,
                start=wall_data["start"],
                end=wall_data["end"],
                thickness=wall_data["thickness"],
                color=wall_data.get("color", "#333333"),
                wall_type=wall_data.get("type", "standard"),
            )

        await coordinator.floor_plan_manager.async_save()

        connection.send_result(msg["id"], wall.to_dict())

    except ValueError as err:
        connection.send_error(msg["id"], "invalid_data", str(err))
    except Exception as err:
        _LOGGER.exception("Error updating wall: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "hide_n_seek/delete_wall",
        vol.Required("config_entry_id"): str,
        vol.Required("wall_id"): str,
    }
)
@websocket_api.async_response
async def handle_delete_wall(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a wall."""
    try:
        coordinator = _get_coordinator(hass, msg["config_entry_id"])

        success = coordinator.floor_plan_manager.delete_wall(msg["wall_id"])

        if success:
            await coordinator.floor_plan_manager.async_save()
            connection.send_result(msg["id"], {"success": True})
        else:
            connection.send_error(msg["id"], "not_found", "Wall not found")

    except ValueError as err:
        connection.send_error(msg["id"], "not_found", str(err))
    except Exception as err:
        _LOGGER.exception("Error deleting wall: %s", err)
        connection.send_error(msg["id"], "unknown_error", str(err))
