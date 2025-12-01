"""Config flow for Hide-n-Seek integration."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import HomeAssistant, callback
from homeassistant.data_entry_flow import FlowResult
import homeassistant.helpers.config_validation as cv

from .const import (
    DOMAIN,
    CONF_UPDATE_INTERVAL,
    CONF_SMOOTHING,
    CONF_CONFIDENCE_THRESHOLD,
    DEFAULT_UPDATE_INTERVAL,
    DEFAULT_SMOOTHING,
    DEFAULT_CONFIDENCE_THRESHOLD,
)

_LOGGER = logging.getLogger(__name__)

STEP_USER_DATA_SCHEMA = vol.Schema(
    {
        vol.Optional(
            CONF_UPDATE_INTERVAL, default=DEFAULT_UPDATE_INTERVAL
        ): cv.positive_float,
        vol.Optional(CONF_SMOOTHING, default=DEFAULT_SMOOTHING): vol.In(
            ["none", "kalman", "average"]
        ),
        vol.Optional(
            CONF_CONFIDENCE_THRESHOLD, default=DEFAULT_CONFIDENCE_THRESHOLD
        ): vol.All(vol.Coerce(float), vol.Range(min=0.0, max=1.0)),
    }
)


class HideNSeekConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Hide-n-Seek."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the initial step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            # Check if already configured
            await self.async_set_unique_id(DOMAIN)
            self._abort_if_unique_id_configured()

            return self.async_create_entry(
                title="Hide-n-Seek Presence Tracker",
                data={},
                options=user_input,
            )

        return self.async_show_form(
            step_id="user",
            data_schema=STEP_USER_DATA_SCHEMA,
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> HideNSeekOptionsFlow:
        """Get the options flow for this handler."""
        return HideNSeekOptionsFlow(config_entry)


class HideNSeekOptionsFlow(config_entries.OptionsFlow):
    """Handle options flow for Hide-n-Seek."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow."""
        self.config_entry = config_entry

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Manage the options."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Optional(
                        CONF_UPDATE_INTERVAL,
                        default=self.config_entry.options.get(
                            CONF_UPDATE_INTERVAL, DEFAULT_UPDATE_INTERVAL
                        ),
                    ): cv.positive_float,
                    vol.Optional(
                        CONF_SMOOTHING,
                        default=self.config_entry.options.get(
                            CONF_SMOOTHING, DEFAULT_SMOOTHING
                        ),
                    ): vol.In(["none", "kalman", "average"]),
                    vol.Optional(
                        CONF_CONFIDENCE_THRESHOLD,
                        default=self.config_entry.options.get(
                            CONF_CONFIDENCE_THRESHOLD, DEFAULT_CONFIDENCE_THRESHOLD
                        ),
                    ): vol.All(vol.Coerce(float), vol.Range(min=0.0, max=1.0)),
                }
            ),
        )
