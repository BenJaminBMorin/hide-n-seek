"""Panel for Hide-n-Seek integration."""
from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

PANEL_URL = "/hide_n_seek_panel"
PANEL_TITLE = "Hide-n-Seek"
PANEL_ICON = "mdi:map-marker-radius"
PANEL_NAME = "hide-n-seek-panel"


async def async_register_panel(hass: HomeAssistant) -> None:
    """Register the Hide-n-Seek panel."""

    # Get the path to the frontend files
    panel_dir = Path(__file__).parent / "frontend" / "dist"

    if not panel_dir.exists():
        _LOGGER.warning(
            "Frontend panel files not found at %s. "
            "You may need to build the frontend. "
            "See documentation for instructions.",
            panel_dir
        )
        return

    # Register the frontend module
    hass.http.register_static_path(
        PANEL_URL,
        str(panel_dir),
        cache_headers=True,
    )

    # Register the panel
    await panel_custom.async_register_panel(
        hass,
        webcomponent_name=PANEL_NAME,
        frontend_url_path="hide-n-seek",
        config={
            "name": PANEL_TITLE,
        },
        require_admin=False,
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        config_panel_domain="hide_n_seek",
    )

    _LOGGER.info("Hide-n-Seek panel registered successfully")


async def async_unregister_panel(hass: HomeAssistant) -> None:
    """Unregister the Hide-n-Seek panel."""
    try:
        hass.components.frontend.async_remove_panel("hide-n-seek")
        _LOGGER.info("Hide-n-Seek panel unregistered successfully")
    except Exception as err:
        _LOGGER.error("Error unregistering panel: %s", err)
