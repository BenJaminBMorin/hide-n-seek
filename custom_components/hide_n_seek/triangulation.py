"""Triangulation and positioning algorithms for Hide-n-Seek."""
from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from typing import List, Tuple, Optional

import numpy as np
from scipy.optimize import least_squares

from .const import RSSI_REF, PATH_LOSS_EXPONENT

_LOGGER = logging.getLogger(__name__)


@dataclass
class SensorReading:
    """Represents a reading from a single sensor."""

    sensor_id: str
    location: Tuple[float, float]  # (x, y) in meters
    rssi: Optional[float] = None
    distance: Optional[float] = None
    timestamp: Optional[float] = None
    confidence: float = 1.0


@dataclass
class Position:
    """Represents a calculated position."""

    x: float
    y: float
    confidence: float
    sensor_count: int
    method: str


class KalmanFilter:
    """Simple Kalman filter for position smoothing."""

    def __init__(
        self,
        process_variance: float = 0.1,
        measurement_variance: float = 1.0,
    ):
        """Initialize the Kalman filter."""
        self.process_variance = process_variance
        self.measurement_variance = measurement_variance
        self.estimate = None
        self.estimate_error = 1.0

    def update(self, measurement: Tuple[float, float]) -> Tuple[float, float]:
        """Update the filter with a new measurement."""
        if self.estimate is None:
            self.estimate = measurement
            return self.estimate

        # Prediction
        predicted_estimate = self.estimate
        predicted_error = self.estimate_error + self.process_variance

        # Update
        kalman_gain = predicted_error / (predicted_error + self.measurement_variance)

        self.estimate = (
            predicted_estimate[0] + kalman_gain * (measurement[0] - predicted_estimate[0]),
            predicted_estimate[1] + kalman_gain * (measurement[1] - predicted_estimate[1]),
        )

        self.estimate_error = (1 - kalman_gain) * predicted_error

        return self.estimate

    def reset(self):
        """Reset the filter."""
        self.estimate = None
        self.estimate_error = 1.0


class TriangulationEngine:
    """Engine for calculating positions from sensor readings."""

    def __init__(self):
        """Initialize the triangulation engine."""
        self.kalman_filters = {}  # device_id -> KalmanFilter

    def rssi_to_distance(self, rssi: float) -> float:
        """
        Convert RSSI to distance using the log-distance path loss model.

        Formula: RSSI = RSSI_REF - 10 * n * log10(d)
        Where:
        - RSSI_REF is the reference RSSI at 1 meter
        - n is the path loss exponent
        - d is the distance in meters
        """
        if rssi >= RSSI_REF:
            return 0.5  # Very close

        distance = 10 ** ((RSSI_REF - rssi) / (10 * PATH_LOSS_EXPONENT))
        return distance

    def trilateration(
        self, readings: List[SensorReading]
    ) -> Optional[Position]:
        """
        Calculate position using trilateration from 3+ sensors.

        Uses least squares optimization to find the best position that
        minimizes the error between measured and calculated distances.
        """
        if len(readings) < 3:
            _LOGGER.warning(
                "Trilateration requires at least 3 sensors, got %d", len(readings)
            )
            return None

        # Convert RSSI to distance if needed
        for reading in readings:
            if reading.distance is None and reading.rssi is not None:
                reading.distance = self.rssi_to_distance(reading.rssi)

        # Filter out readings without distance
        valid_readings = [r for r in readings if r.distance is not None]

        if len(valid_readings) < 3:
            _LOGGER.warning("Not enough valid distance readings for trilateration")
            return None

        def error_function(pos):
            """Calculate error for a given position."""
            x, y = pos
            errors = []
            for reading in valid_readings:
                sx, sy = reading.location
                measured_dist = reading.distance
                calculated_dist = math.sqrt((x - sx) ** 2 + (y - sy) ** 2)
                error = (calculated_dist - measured_dist) * reading.confidence
                errors.append(error)
            return errors

        # Initial guess: centroid of sensor positions
        initial_x = sum(r.location[0] for r in valid_readings) / len(valid_readings)
        initial_y = sum(r.location[1] for r in valid_readings) / len(valid_readings)

        # Optimize position
        result = least_squares(error_function, [initial_x, initial_y])

        if not result.success:
            _LOGGER.warning("Trilateration optimization failed")
            return None

        x, y = result.x

        # Calculate confidence based on residual error
        avg_error = np.mean(np.abs(result.fun))
        confidence = max(0.0, min(1.0, 1.0 - avg_error / 5.0))

        return Position(
            x=float(x),
            y=float(y),
            confidence=confidence,
            sensor_count=len(valid_readings),
            method="trilateration",
        )

    def weighted_average(
        self, readings: List[SensorReading]
    ) -> Optional[Position]:
        """
        Calculate position using weighted average of sensor positions.

        Weights are based on signal strength (closer = higher weight).
        This is a simple fallback method when trilateration isn't possible.
        """
        if not readings:
            return None

        # Convert RSSI to weights (higher RSSI = stronger signal = higher weight)
        total_weight = 0.0
        weighted_x = 0.0
        weighted_y = 0.0

        for reading in readings:
            if reading.rssi is not None:
                # Convert RSSI to weight (exponential to emphasize closer sensors)
                weight = 10 ** (reading.rssi / 20.0) * reading.confidence
                total_weight += weight
                weighted_x += reading.location[0] * weight
                weighted_y += reading.location[1] * weight

        if total_weight == 0:
            return None

        x = weighted_x / total_weight
        y = weighted_y / total_weight

        # Confidence is lower for this method
        confidence = min(0.6, len(readings) / 10.0)

        return Position(
            x=x,
            y=y,
            confidence=confidence,
            sensor_count=len(readings),
            method="weighted_average",
        )

    def calculate_position(
        self,
        device_id: str,
        readings: List[SensorReading],
        use_kalman: bool = True,
    ) -> Optional[Position]:
        """
        Calculate position from sensor readings.

        Tries trilateration first, falls back to weighted average if needed.
        Optionally applies Kalman filtering for smoothing.
        """
        if not readings:
            return None

        # Try trilateration first
        position = self.trilateration(readings)

        # Fall back to weighted average if trilateration fails
        if position is None:
            position = self.weighted_average(readings)

        if position is None:
            return None

        # Apply Kalman filtering if enabled
        if use_kalman:
            if device_id not in self.kalman_filters:
                self.kalman_filters[device_id] = KalmanFilter()

            smoothed_x, smoothed_y = self.kalman_filters[device_id].update(
                (position.x, position.y)
            )
            position.x = smoothed_x
            position.y = smoothed_y

        return position

    def sensor_fusion(
        self,
        rssi_readings: List[SensorReading],
        mmwave_position: Optional[Tuple[float, float]],
        mmwave_confidence: float = 0.9,
    ) -> Optional[Position]:
        """
        Fuse RSSI-based position with mmWave sensor data.

        mmWave sensors provide more accurate local positions, while
        RSSI provides broader coverage.
        """
        rssi_position = self.trilateration(rssi_readings)

        if mmwave_position is None:
            return rssi_position

        if rssi_position is None:
            return Position(
                x=mmwave_position[0],
                y=mmwave_position[1],
                confidence=mmwave_confidence,
                sensor_count=1,
                method="mmwave_only",
            )

        # Weighted fusion based on confidence
        rssi_weight = rssi_position.confidence
        mmwave_weight = mmwave_confidence

        total_weight = rssi_weight + mmwave_weight

        fused_x = (
            rssi_position.x * rssi_weight + mmwave_position[0] * mmwave_weight
        ) / total_weight
        fused_y = (
            rssi_position.y * rssi_weight + mmwave_position[1] * mmwave_weight
        ) / total_weight

        return Position(
            x=fused_x,
            y=fused_y,
            confidence=(rssi_position.confidence + mmwave_confidence) / 2,
            sensor_count=rssi_position.sensor_count + 1,
            method="sensor_fusion",
        )
