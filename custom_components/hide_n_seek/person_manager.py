"""Person management with device linking."""
from __future__ import annotations

import logging
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import STORAGE_KEY_PERSONS, STORAGE_VERSION
from .triangulation import Position

_LOGGER = logging.getLogger(__name__)


@dataclass
class Person:
    """Person with linked devices."""

    id: str
    name: str
    default_device_id: str
    linked_device_ids: List[str]
    color: str = "#2196F3"
    avatar: Optional[str] = None

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> Person:
        """Create from dictionary."""
        return cls(**data)


class PersonManager:
    """Manages person-device associations."""

    def __init__(self, hass: HomeAssistant):
        """Initialize the person manager."""
        self.hass = hass
        self._store = Store(hass, STORAGE_VERSION, STORAGE_KEY_PERSONS)
        self.persons: Dict[str, Person] = {}
        self._initialized = False

    async def async_initialize(self) -> None:
        """Load persons from storage."""
        if self._initialized:
            return

        try:
            data = await self._store.async_load()
            if data and "persons" in data:
                for person_data in data["persons"]:
                    person = Person.from_dict(person_data)
                    self.persons[person.id] = person
                _LOGGER.info("Loaded %d persons from storage", len(self.persons))

            self._initialized = True

        except Exception as err:
            _LOGGER.error("Failed to load persons: %s", err)
            self._initialized = True  # Continue even if load fails

    async def async_save(self) -> None:
        """Save persons to storage."""
        try:
            data = {
                "persons": [person.to_dict() for person in self.persons.values()]
            }
            await self._store.async_save(data)
            _LOGGER.debug("Saved %d persons to storage", len(self.persons))

        except Exception as err:
            _LOGGER.error("Failed to save persons: %s", err)

    def add_person(
        self,
        person_id: str,
        name: str,
        default_device_id: str,
        linked_device_ids: Optional[List[str]] = None,
        color: str = "#2196F3",
        avatar: Optional[str] = None
    ) -> Person:
        """Add a new person."""
        if person_id in self.persons:
            raise ValueError(f"Person {person_id} already exists")

        if not linked_device_ids:
            linked_device_ids = [default_device_id]
        elif default_device_id not in linked_device_ids:
            linked_device_ids.append(default_device_id)

        person = Person(
            id=person_id,
            name=name,
            default_device_id=default_device_id,
            linked_device_ids=linked_device_ids,
            color=color,
            avatar=avatar,
        )

        self.persons[person_id] = person
        _LOGGER.info("Added person: %s", name)
        return person

    def update_person(
        self,
        person_id: str,
        name: Optional[str] = None,
        default_device_id: Optional[str] = None,
        linked_device_ids: Optional[List[str]] = None,
        color: Optional[str] = None,
        avatar: Optional[str] = None
    ) -> Person:
        """Update an existing person."""
        if person_id not in self.persons:
            raise ValueError(f"Person {person_id} not found")

        person = self.persons[person_id]

        if name is not None:
            person.name = name
        if default_device_id is not None:
            person.default_device_id = default_device_id
            # Ensure default device is in linked devices
            if default_device_id not in person.linked_device_ids:
                person.linked_device_ids.append(default_device_id)
        if linked_device_ids is not None:
            person.linked_device_ids = linked_device_ids
            # Ensure default device stays in list
            if person.default_device_id not in linked_device_ids:
                person.linked_device_ids.append(person.default_device_id)
        if color is not None:
            person.color = color
        if avatar is not None:
            person.avatar = avatar

        _LOGGER.info("Updated person: %s", person.name)
        return person

    def delete_person(self, person_id: str) -> None:
        """Delete a person."""
        if person_id not in self.persons:
            raise ValueError(f"Person {person_id} not found")

        person = self.persons.pop(person_id)
        _LOGGER.info("Deleted person: %s", person.name)

    def get_person(self, person_id: str) -> Optional[Person]:
        """Get a person by ID."""
        return self.persons.get(person_id)

    def get_all_persons(self) -> List[Person]:
        """Get all persons."""
        return list(self.persons.values())

    def set_active_device(self, person_id: str, device_id: str) -> Person:
        """Set the active tracking device for a person."""
        if person_id not in self.persons:
            raise ValueError(f"Person {person_id} not found")

        person = self.persons[person_id]

        if device_id not in person.linked_device_ids:
            raise ValueError(
                f"Device {device_id} is not linked to person {person.name}"
            )

        person.default_device_id = device_id
        _LOGGER.info("Set active device for %s to %s", person.name, device_id)
        return person

    def get_person_position(
        self,
        person_id: str,
        get_device_position_func
    ) -> Optional[Position]:
        """Get position of a person using their default device.

        Args:
            person_id: ID of the person
            get_device_position_func: Function to get device position (device_id) -> Position

        Returns:
            Position of the person's default device, or None if not available
        """
        person = self.get_person(person_id)
        if not person:
            return None

        return get_device_position_func(person.default_device_id)

    def link_device(self, person_id: str, device_id: str) -> Person:
        """Link a device to a person."""
        if person_id not in self.persons:
            raise ValueError(f"Person {person_id} not found")

        person = self.persons[person_id]

        if device_id not in person.linked_device_ids:
            person.linked_device_ids.append(device_id)
            _LOGGER.info("Linked device %s to person %s", device_id, person.name)

        return person

    def unlink_device(self, person_id: str, device_id: str) -> Person:
        """Unlink a device from a person."""
        if person_id not in self.persons:
            raise ValueError(f"Person {person_id} not found")

        person = self.persons[person_id]

        if device_id == person.default_device_id:
            raise ValueError(
                f"Cannot unlink default device. Set a different default device first."
            )

        if device_id in person.linked_device_ids:
            person.linked_device_ids.remove(device_id)
            _LOGGER.info("Unlinked device %s from person %s", device_id, person.name)

        return person
