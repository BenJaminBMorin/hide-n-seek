"""Position history management with SQLite storage."""
from __future__ import annotations

import aiosqlite
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from homeassistant.core import HomeAssistant

from .triangulation import Position

_LOGGER = logging.getLogger(__name__)

SCHEMA_VERSION = 1
DB_FILENAME = "hide_n_seek_history.db"


@dataclass
class PositionRecord:
    """Historical position record."""
    id: Optional[int]
    device_id: str
    timestamp: float  # Unix timestamp
    x: float
    y: float
    confidence: float
    sensor_count: int
    method: str

    @classmethod
    def from_position(
        cls,
        device_id: str,
        position: Position,
        timestamp: Optional[float] = None
    ) -> PositionRecord:
        """Create record from Position object."""
        return cls(
            id=None,
            device_id=device_id,
            timestamp=timestamp or time.time(),
            x=position.x,
            y=position.y,
            confidence=position.confidence,
            sensor_count=position.sensor_count,
            method=position.method,
        )

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "device_id": self.device_id,
            "timestamp": self.timestamp,
            "x": self.x,
            "y": self.y,
            "confidence": self.confidence,
            "sensor_count": self.sensor_count,
            "method": self.method,
        }


class PositionHistoryManager:
    """Manages position history storage in SQLite."""

    def __init__(self, hass: HomeAssistant, data_path: Path):
        """Initialize the history manager."""
        self.hass = hass
        self._db_path = data_path / DB_FILENAME
        self._db: Optional[aiosqlite.Connection] = None
        self._initialized = False

    async def async_initialize(self) -> None:
        """Initialize the database and schema."""
        if self._initialized:
            return

        try:
            # Create database connection
            self._db = await aiosqlite.connect(str(self._db_path))

            # Enable WAL mode for better concurrency
            await self._db.execute("PRAGMA journal_mode=WAL")
            await self._db.execute("PRAGMA synchronous=NORMAL")
            await self._db.execute("PRAGMA cache_size=-64000")  # 64MB cache

            # Check schema version
            current_version = await self._get_schema_version()
            if current_version == 0:
                await self._create_schema()
            elif current_version < SCHEMA_VERSION:
                await self._migrate_schema(current_version)

            self._initialized = True
            _LOGGER.info("Position history database initialized at %s", self._db_path)

        except Exception as err:
            _LOGGER.error("Failed to initialize history database: %s", err)
            raise

    async def async_shutdown(self) -> None:
        """Close database connection."""
        if self._db:
            await self._db.close()
            self._db = None
            self._initialized = False

    async def _get_schema_version(self) -> int:
        """Get current schema version."""
        try:
            cursor = await self._db.execute(
                "SELECT version FROM schema_version ORDER BY version DESC LIMIT 1"
            )
            row = await cursor.fetchone()
            return row[0] if row else 0
        except aiosqlite.OperationalError:
            # Table doesn't exist
            return 0

    async def _create_schema(self) -> None:
        """Create database schema."""
        _LOGGER.info("Creating position history schema")

        # Position history table
        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS position_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                x REAL NOT NULL,
                y REAL NOT NULL,
                confidence REAL NOT NULL,
                sensor_count INTEGER,
                method TEXT
            )
        """)

        # Indexes for efficient queries
        await self._db.execute("""
            CREATE INDEX IF NOT EXISTS idx_device_time
            ON position_history(device_id, timestamp)
        """)

        await self._db.execute("""
            CREATE INDEX IF NOT EXISTS idx_timestamp
            ON position_history(timestamp)
        """)

        # Heat map cache table
        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS heat_map_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                hour_bucket INTEGER NOT NULL,
                grid_x INTEGER NOT NULL,
                grid_y INTEGER NOT NULL,
                visit_count INTEGER NOT NULL,
                UNIQUE(device_id, hour_bucket, grid_x, grid_y)
            )
        """)

        await self._db.execute("""
            CREATE INDEX IF NOT EXISTS idx_heatmap_lookup
            ON heat_map_cache(device_id, hour_bucket)
        """)

        # Schema version table
        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at INTEGER NOT NULL
            )
        """)

        await self._db.execute(
            "INSERT INTO schema_version (version, applied_at) VALUES (?, ?)",
            (SCHEMA_VERSION, int(time.time()))
        )

        await self._db.commit()
        _LOGGER.info("Position history schema created successfully")

    async def _migrate_schema(self, from_version: int) -> None:
        """Migrate schema to current version."""
        _LOGGER.info("Migrating schema from version %d to %d", from_version, SCHEMA_VERSION)
        # Add migration logic here when schema changes
        await self._db.commit()

    async def record_position(
        self,
        device_id: str,
        position: Position,
        timestamp: Optional[float] = None
    ) -> None:
        """Record a position to history."""
        if not self._initialized:
            _LOGGER.warning("History manager not initialized, skipping record")
            return

        try:
            record = PositionRecord.from_position(device_id, position, timestamp)

            await self._db.execute("""
                INSERT INTO position_history
                (device_id, timestamp, x, y, confidence, sensor_count, method)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                record.device_id,
                int(record.timestamp),
                record.x,
                record.y,
                record.confidence,
                record.sensor_count,
                record.method,
            ))

            await self._db.commit()

        except Exception as err:
            _LOGGER.error("Failed to record position: %s", err)

    async def get_positions(
        self,
        device_id: str,
        start_time: datetime,
        end_time: datetime,
        limit: Optional[int] = None,
        downsample_seconds: Optional[int] = None
    ) -> List[PositionRecord]:
        """Get position history for a device within a time range."""
        if not self._initialized:
            return []

        try:
            start_ts = int(start_time.timestamp())
            end_ts = int(end_time.timestamp())

            if downsample_seconds:
                # Downsampled query - group by time buckets
                query = """
                    SELECT
                        device_id,
                        (timestamp / ?) * ? as bucket_timestamp,
                        AVG(x) as x,
                        AVG(y) as y,
                        AVG(confidence) as confidence,
                        AVG(sensor_count) as sensor_count,
                        method
                    FROM position_history
                    WHERE device_id = ? AND timestamp BETWEEN ? AND ?
                    GROUP BY device_id, bucket_timestamp, method
                    ORDER BY bucket_timestamp
                """
                params = (downsample_seconds, downsample_seconds, device_id, start_ts, end_ts)
            else:
                # Full resolution query
                query = """
                    SELECT device_id, timestamp, x, y, confidence, sensor_count, method
                    FROM position_history
                    WHERE device_id = ? AND timestamp BETWEEN ? AND ?
                    ORDER BY timestamp
                """
                params = (device_id, start_ts, end_ts)

            if limit:
                query += f" LIMIT {limit}"

            cursor = await self._db.execute(query, params)
            rows = await cursor.fetchall()

            return [
                PositionRecord(
                    id=None,
                    device_id=row[0],
                    timestamp=float(row[1]),
                    x=row[2],
                    y=row[3],
                    confidence=row[4],
                    sensor_count=int(row[5]) if row[5] else 0,
                    method=row[6] if row[6] else "unknown",
                )
                for row in rows
            ]

        except Exception as err:
            _LOGGER.error("Failed to get positions: %s", err)
            return []

    async def get_heat_map_data(
        self,
        device_id: str,
        start_time: datetime,
        end_time: datetime,
        grid_size: float = 0.5
    ) -> Dict[Tuple[int, int], int]:
        """Get heat map data for a device within a time range."""
        if not self._initialized:
            return {}

        try:
            start_ts = int(start_time.timestamp())
            end_ts = int(end_time.timestamp())

            # Check if we can use cache (aligned to hour boundaries)
            start_hour = start_ts // 3600
            end_hour = end_ts // 3600

            if self._is_fully_cached(start_hour, end_hour):
                return await self._get_heat_map_from_cache(
                    device_id, start_hour, end_hour, grid_size
                )
            else:
                # Compute from raw data
                return await self._compute_heat_map_from_raw(
                    device_id, start_ts, end_ts, grid_size
                )

        except Exception as err:
            _LOGGER.error("Failed to get heat map data: %s", err)
            return {}

    def _is_fully_cached(self, start_hour: int, end_hour: int) -> bool:
        """Check if time range is fully cached (excluding current hour)."""
        current_hour = int(time.time()) // 3600
        return end_hour < current_hour

    async def _get_heat_map_from_cache(
        self,
        device_id: str,
        start_hour: int,
        end_hour: int,
        grid_size: float
    ) -> Dict[Tuple[int, int], int]:
        """Get heat map from pre-aggregated cache."""
        cursor = await self._db.execute("""
            SELECT grid_x, grid_y, SUM(visit_count)
            FROM heat_map_cache
            WHERE device_id = ? AND hour_bucket BETWEEN ? AND ?
            GROUP BY grid_x, grid_y
        """, (device_id, start_hour, end_hour))

        rows = await cursor.fetchall()
        return {(row[0], row[1]): row[2] for row in rows}

    async def _compute_heat_map_from_raw(
        self,
        device_id: str,
        start_ts: int,
        end_ts: int,
        grid_size: float
    ) -> Dict[Tuple[int, int], int]:
        """Compute heat map from raw position data."""
        cursor = await self._db.execute("""
            SELECT
                CAST(x / ? AS INTEGER) as grid_x,
                CAST(y / ? AS INTEGER) as grid_y,
                COUNT(*) as visit_count
            FROM position_history
            WHERE device_id = ? AND timestamp BETWEEN ? AND ?
            GROUP BY grid_x, grid_y
        """, (grid_size, grid_size, device_id, start_ts, end_ts))

        rows = await cursor.fetchall()
        return {(row[0], row[1]): row[2] for row in rows}

    async def pre_aggregate_heat_maps(self, hour_bucket: Optional[int] = None) -> None:
        """Pre-aggregate heat map data for the specified hour (or last hour if None)."""
        if not self._initialized:
            return

        try:
            if hour_bucket is None:
                # Aggregate previous hour
                hour_bucket = (int(time.time()) // 3600) - 1

            start_ts = hour_bucket * 3600
            end_ts = start_ts + 3600
            grid_size = 0.5  # Default grid size

            _LOGGER.debug("Pre-aggregating heat maps for hour bucket %d", hour_bucket)

            # Get list of all devices
            cursor = await self._db.execute("""
                SELECT DISTINCT device_id
                FROM position_history
                WHERE timestamp BETWEEN ? AND ?
            """, (start_ts, end_ts))

            devices = [row[0] for row in await cursor.fetchall()]

            for device_id in devices:
                # Aggregate positions into grid cells
                await self._db.execute("""
                    INSERT OR REPLACE INTO heat_map_cache
                    (device_id, hour_bucket, grid_x, grid_y, visit_count)
                    SELECT
                        device_id,
                        ? as hour_bucket,
                        CAST(x / ? AS INTEGER) as grid_x,
                        CAST(y / ? AS INTEGER) as grid_y,
                        COUNT(*) as visit_count
                    FROM position_history
                    WHERE device_id = ? AND timestamp BETWEEN ? AND ?
                    GROUP BY device_id, grid_x, grid_y
                """, (hour_bucket, grid_size, grid_size, device_id, start_ts, end_ts))

            await self._db.commit()
            _LOGGER.info("Pre-aggregated heat maps for %d devices", len(devices))

        except Exception as err:
            _LOGGER.error("Failed to pre-aggregate heat maps: %s", err)

    async def cleanup_old_data(self, retention_days: int = 7) -> int:
        """Remove position history older than retention period."""
        if not self._initialized:
            return 0

        try:
            cutoff_time = int((datetime.now() - timedelta(days=retention_days)).timestamp())

            # Delete old position history
            cursor = await self._db.execute("""
                DELETE FROM position_history WHERE timestamp < ?
            """, (cutoff_time,))

            positions_deleted = cursor.rowcount

            # Delete old heat map cache
            cutoff_hour = cutoff_time // 3600
            cursor = await self._db.execute("""
                DELETE FROM heat_map_cache WHERE hour_bucket < ?
            """, (cutoff_hour,))

            cache_deleted = cursor.rowcount

            await self._db.commit()

            # Vacuum database to reclaim space
            await self._db.execute("VACUUM")

            _LOGGER.info(
                "Cleaned up %d position records and %d cache entries older than %d days",
                positions_deleted,
                cache_deleted,
                retention_days
            )

            return positions_deleted

        except Exception as err:
            _LOGGER.error("Failed to cleanup old data: %s", err)
            return 0

    async def get_database_size(self) -> int:
        """Get database file size in bytes."""
        try:
            return self._db_path.stat().st_size
        except Exception:
            return 0

    async def get_record_count(self) -> int:
        """Get total number of position records."""
        if not self._initialized:
            return 0

        try:
            cursor = await self._db.execute("SELECT COUNT(*) FROM position_history")
            row = await cursor.fetchone()
            return row[0] if row else 0
        except Exception as err:
            _LOGGER.error("Failed to get record count: %s", err)
            return 0
