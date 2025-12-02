"""Floor plan management with rooms and walls."""
from __future__ import annotations

import logging
from dataclasses import dataclass, asdict, field
from typing import Dict, List, Optional

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import STORAGE_KEY_FLOOR_PLAN, STORAGE_VERSION

_LOGGER = logging.getLogger(__name__)


@dataclass
class Room:
    """Room with polygon coordinates."""

    id: str
    name: str
    coordinates: List[List[float]]  # [[x, y], [x, y], ...]
    color: str = "#E0E0E0"

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> Room:
        """Create from dictionary."""
        return cls(**data)


@dataclass
class Wall:
    """Wall defined by start and end points."""

    id: str
    start: List[float]  # [x, y]
    end: List[float]    # [x, y]
    thickness: float = 0.2

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> Wall:
        """Create from dictionary."""
        return cls(**data)


@dataclass
class FloorPlan:
    """Complete floor plan with rooms, walls, and dimensions."""

    rooms: List[Room] = field(default_factory=list)
    walls: List[Wall] = field(default_factory=list)
    width: float = 15.0   # meters
    height: float = 12.0  # meters

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "rooms": [r.to_dict() for r in self.rooms],
            "walls": [w.to_dict() for w in self.walls],
            "dimensions": {
                "width": self.width,
                "height": self.height,
            },
        }

    @classmethod
    def from_dict(cls, data: Dict) -> FloorPlan:
        """Create from dictionary."""
        return cls(
            rooms=[Room.from_dict(r) for r in data.get("rooms", [])],
            walls=[Wall.from_dict(w) for w in data.get("walls", [])],
            width=data.get("dimensions", {}).get("width", 15.0),
            height=data.get("dimensions", {}).get("height", 12.0),
        )


class FloorPlanManager:
    """Manages floor plan storage and operations."""

    def __init__(self, hass: HomeAssistant):
        """Initialize the floor plan manager."""
        self.hass = hass
        self._store = Store(hass, STORAGE_VERSION, STORAGE_KEY_FLOOR_PLAN)
        self.floor_plan = FloorPlan()
        self._initialized = False

    async def async_initialize(self) -> None:
        """Load floor plan from storage."""
        if self._initialized:
            return

        try:
            data = await self._store.async_load()
            if data and "floor_plan" in data:
                self.floor_plan = FloorPlan.from_dict(data["floor_plan"])
                _LOGGER.info(
                    "Loaded floor plan with %d rooms and %d walls",
                    len(self.floor_plan.rooms),
                    len(self.floor_plan.walls),
                )
            else:
                _LOGGER.info("No existing floor plan found, starting with empty plan")

            self._initialized = True

        except Exception as err:
            _LOGGER.error("Failed to load floor plan: %s", err)
            self._initialized = True  # Continue with empty floor plan

    async def async_save(self) -> None:
        """Save floor plan to storage."""
        try:
            data = {"floor_plan": self.floor_plan.to_dict()}
            await self._store.async_save(data)
            _LOGGER.debug(
                "Saved floor plan with %d rooms and %d walls",
                len(self.floor_plan.rooms),
                len(self.floor_plan.walls),
            )

        except Exception as err:
            _LOGGER.error("Failed to save floor plan: %s", err)

    def get_floor_plan(self) -> FloorPlan:
        """Get the current floor plan."""
        return self.floor_plan

    def set_dimensions(self, width: float, height: float) -> FloorPlan:
        """Set floor plan dimensions."""
        self.floor_plan.width = width
        self.floor_plan.height = height
        _LOGGER.info("Set floor plan dimensions to %.1f x %.1f meters", width, height)
        return self.floor_plan

    def add_room(
        self,
        room_id: str,
        name: str,
        coordinates: List[List[float]],
        color: str = "#E0E0E0",
    ) -> Room:
        """Add a new room."""
        if any(r.id == room_id for r in self.floor_plan.rooms):
            raise ValueError(f"Room {room_id} already exists")

        if len(coordinates) < 3:
            raise ValueError("Room must have at least 3 coordinates")

        room = Room(id=room_id, name=name, coordinates=coordinates, color=color)
        self.floor_plan.rooms.append(room)
        _LOGGER.info("Added room: %s with %d points", name, len(coordinates))
        return room

    def update_room(
        self,
        room_id: str,
        name: Optional[str] = None,
        coordinates: Optional[List[List[float]]] = None,
        color: Optional[str] = None,
    ) -> Optional[Room]:
        """Update an existing room."""
        room = next((r for r in self.floor_plan.rooms if r.id == room_id), None)
        if not room:
            return None

        if name is not None:
            room.name = name
        if coordinates is not None:
            if len(coordinates) < 3:
                raise ValueError("Room must have at least 3 coordinates")
            room.coordinates = coordinates
        if color is not None:
            room.color = color

        _LOGGER.info("Updated room: %s", room.name)
        return room

    def delete_room(self, room_id: str) -> bool:
        """Delete a room."""
        room = next((r for r in self.floor_plan.rooms if r.id == room_id), None)
        if not room:
            return False

        self.floor_plan.rooms = [r for r in self.floor_plan.rooms if r.id != room_id]
        _LOGGER.info("Deleted room: %s", room.name)
        return True

    def add_wall(
        self,
        wall_id: str,
        start: List[float],
        end: List[float],
        thickness: float = 0.2,
    ) -> Wall:
        """Add a new wall."""
        if any(w.id == wall_id for w in self.floor_plan.walls):
            raise ValueError(f"Wall {wall_id} already exists")

        if len(start) != 2 or len(end) != 2:
            raise ValueError("Wall start and end must have [x, y] coordinates")

        wall = Wall(id=wall_id, start=start, end=end, thickness=thickness)
        self.floor_plan.walls.append(wall)
        _LOGGER.info(
            "Added wall from (%.1f, %.1f) to (%.1f, %.1f)",
            start[0],
            start[1],
            end[0],
            end[1],
        )
        return wall

    def update_wall(
        self,
        wall_id: str,
        start: Optional[List[float]] = None,
        end: Optional[List[float]] = None,
        thickness: Optional[float] = None,
    ) -> Optional[Wall]:
        """Update an existing wall."""
        wall = next((w for w in self.floor_plan.walls if w.id == wall_id), None)
        if not wall:
            return None

        if start is not None:
            if len(start) != 2:
                raise ValueError("Wall start must have [x, y] coordinates")
            wall.start = start
        if end is not None:
            if len(end) != 2:
                raise ValueError("Wall end must have [x, y] coordinates")
            wall.end = end
        if thickness is not None:
            wall.thickness = thickness

        _LOGGER.info("Updated wall: %s", wall.id)
        return wall

    def delete_wall(self, wall_id: str) -> bool:
        """Delete a wall."""
        wall = next((w for w in self.floor_plan.walls if w.id == wall_id), None)
        if not wall:
            return False

        self.floor_plan.walls = [w for w in self.floor_plan.walls if w.id != wall_id]
        _LOGGER.info("Deleted wall: %s", wall.id)
        return True

    def clear_floor_plan(self) -> None:
        """Clear all rooms and walls."""
        self.floor_plan = FloorPlan(width=self.floor_plan.width, height=self.floor_plan.height)
        _LOGGER.info("Cleared floor plan")
