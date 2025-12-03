import React, { useEffect, useRef, useState } from 'react';
import { Sensor, TrackedDevice, Zone, Position, Point, FloorPlan, PositionRecord, Person } from '../types';

interface MapCanvasProps {
  sensors: Sensor[];
  devices: TrackedDevice[];
  zones: Zone[];
  positions: Record<string, Position>;
  selectedZone: Zone | null;
  onZoneClick: (zone: Zone) => void;
  onCanvasClick: (point: Point) => void;
  editMode: 'view' | 'draw' | 'edit' | 'draw_room' | 'draw_wall' | 'edit_wall';
  drawingPoints: Point[];
  floorPlan?: FloorPlan;
  showFloorPlan?: boolean;
  visualizationModes?: string[];
  historicalPositions?: Record<string, PositionRecord[]>;
  heatMapData?: Record<string, number>;
  persons?: Person[];
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  sensors,
  devices,
  zones,
  positions,
  selectedZone,
  onZoneClick,
  onCanvasClick,
  editMode,
  drawingPoints,
  floorPlan,
  showFloorPlan = true,
  visualizationModes = ['live'],
  historicalPositions = {},
  heatMapData = {},
  persons = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(50); // pixels per meter
  const [offset, setOffset] = useState({ x: 50, y: 50 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const worldToScreen = (x: number, y: number): Point => {
    return {
      x: x * scale + offset.x,
      y: y * scale + offset.y,
    };
  };

  const screenToWorld = (x: number, y: number): Point => {
    return {
      x: (x - offset.x) / scale,
      y: (y - offset.y) / scale,
    };
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    // Draw vertical lines every meter
    for (let x = 0; x <= 20; x++) {
      const screenX = worldToScreen(x, 0).x;
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, height);
      ctx.stroke();

      // Label every 5 meters
      if (x % 5 === 0) {
        ctx.fillStyle = '#999';
        ctx.font = '12px Arial';
        ctx.fillText(`${x}m`, screenX + 5, 15);
      }
    }

    // Draw horizontal lines every meter
    for (let y = 0; y <= 20; y++) {
      const screenY = worldToScreen(0, y).y;
      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(width, screenY);
      ctx.stroke();

      // Label every 5 meters
      if (y % 5 === 0) {
        ctx.fillStyle = '#999';
        ctx.font = '12px Arial';
        ctx.fillText(`${y}m`, 5, screenY - 5);
      }
    }
  };

  const drawSensor = (ctx: CanvasRenderingContext2D, sensor: Sensor) => {
    const pos = worldToScreen(sensor.location[0], sensor.location[1]);

    // Draw sensor icon
    ctx.fillStyle = sensor.enabled ? '#4CAF50' : '#999';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 8, 0, 2 * Math.PI);
    ctx.fill();

    // Draw sensor range circle
    ctx.strokeStyle = sensor.enabled ? 'rgba(76, 175, 80, 0.3)' : 'rgba(153, 153, 153, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 5 * scale, 0, 2 * Math.PI); // 5 meter range
    ctx.stroke();

    // Draw sensor label
    ctx.fillStyle = '#333';
    ctx.font = '11px Arial';
    ctx.fillText(sensor.name, pos.x + 12, pos.y + 4);
  };

  const drawDevice = (ctx: CanvasRenderingContext2D, device: TrackedDevice, position: Position) => {
    const pos = worldToScreen(position.x, position.y);

    // Draw confidence circle
    const alpha = position.confidence;
    ctx.fillStyle = `rgba(33, 150, 243, ${alpha * 0.3})`;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 15, 0, 2 * Math.PI);
    ctx.fill();

    // Draw device marker
    ctx.fillStyle = '#2196F3';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Draw device label
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(device.name, pos.x + 10, pos.y - 10);

    // Draw confidence percentage
    ctx.font = '10px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText(
      `${Math.round(position.confidence * 100)}%`,
      pos.x + 10,
      pos.y + 5
    );
  };

  const drawZone = (ctx: CanvasRenderingContext2D, zone: Zone) => {
    if (zone.coordinates.length < 3) return;

    const screenCoords = zone.coordinates.map(([x, y]) => worldToScreen(x, y));

    // Fill zone
    ctx.fillStyle = zone.enabled
      ? `${zone.color}33` // 20% opacity
      : 'rgba(200, 200, 200, 0.2)';
    ctx.beginPath();
    ctx.moveTo(screenCoords[0].x, screenCoords[0].y);
    for (let i = 1; i < screenCoords.length; i++) {
      ctx.lineTo(screenCoords[i].x, screenCoords[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // Draw zone border
    ctx.strokeStyle = selectedZone?.id === zone.id ? '#FF5722' : zone.color;
    ctx.lineWidth = selectedZone?.id === zone.id ? 3 : 2;
    ctx.stroke();

    // Draw zone label
    const centerX = screenCoords.reduce((sum, p) => sum + p.x, 0) / screenCoords.length;
    const centerY = screenCoords.reduce((sum, p) => sum + p.y, 0) / screenCoords.length;

    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(zone.name, centerX, centerY);

    // Draw corner handles if selected
    if (selectedZone?.id === zone.id) {
      ctx.fillStyle = '#FF5722';
      for (const point of screenCoords) {
        ctx.fillRect(point.x - 4, point.y - 4, 8, 8);
      }
    }
  };

  const drawDrawingZone = (ctx: CanvasRenderingContext2D, points: Point[]) => {
    if (points.length === 0) return;

    const screenPoints = points.map((p) => worldToScreen(p.x, p.y));

    if (points.length === 1) {
      // Just draw a point
      ctx.fillStyle = '#FF9800';
      ctx.beginPath();
      ctx.arc(screenPoints[0].x, screenPoints[0].y, 5, 0, 2 * Math.PI);
      ctx.fill();
      return;
    }

    // Draw lines connecting points
    ctx.strokeStyle = '#FF9800';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
    for (let i = 1; i < screenPoints.length; i++) {
      ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw points
    ctx.fillStyle = '#FF9800';
    for (const point of screenPoints) {
      ctx.fillRect(point.x - 4, point.y - 4, 8, 8);
    }
  };

  const drawFloorPlan = (ctx: CanvasRenderingContext2D) => {
    if (!floorPlan || !showFloorPlan) return;

    // Draw rooms
    floorPlan.rooms.forEach((room) => {
      if (room.coordinates.length < 3) return;

      const screenCoords = room.coordinates.map((coord) =>
        worldToScreen(coord[0], coord[1])
      );

      // Fill room
      ctx.fillStyle = room.color;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(screenCoords[0].x, screenCoords[0].y);
      for (let i = 1; i < screenCoords.length; i++) {
        ctx.lineTo(screenCoords[i].x, screenCoords[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Draw room border
      ctx.strokeStyle = room.color;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw room label
      const centerX = screenCoords.reduce((sum, p) => sum + p.x, 0) / screenCoords.length;
      const centerY = screenCoords.reduce((sum, p) => sum + p.y, 0) / screenCoords.length;

      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(room.name, centerX, centerY);
    });

    // Draw walls
    floorPlan.walls.forEach((wall) => {
      const start = worldToScreen(wall.start[0], wall.start[1]);
      const end = worldToScreen(wall.end[0], wall.end[1]);

      ctx.strokeStyle = '#333';
      ctx.lineWidth = wall.thickness * scale;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    });
  };

  const drawTrails = (ctx: CanvasRenderingContext2D) => {
    if (!visualizationModes.includes('trails')) return;

    Object.entries(historicalPositions).forEach(([deviceId, positions]) => {
      if (positions.length < 2) return;

      // Get device or person color
      const device = devices.find((d) => d.id === deviceId);
      const person = persons.find((p) => p.default_device_id === deviceId);
      const color = person?.color || '#2196F3';

      // Draw path
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();

      const firstPos = worldToScreen(positions[0].x, positions[0].y);
      ctx.moveTo(firstPos.x, firstPos.y);

      for (let i = 1; i < positions.length; i++) {
        const pos = worldToScreen(positions[i].x, positions[i].y);
        ctx.lineTo(pos.x, pos.y);
      }

      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Draw dots at intervals
      for (let i = 0; i < positions.length; i += Math.max(1, Math.floor(positions.length / 20))) {
        const pos = worldToScreen(positions[i].x, positions[i].y);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  };

  const drawHeatMap = (ctx: CanvasRenderingContext2D) => {
    if (!visualizationModes.includes('heatmap')) return;

    // Draw heat map as colored grid cells
    const gridSize = 0.5; // meters
    const maxValue = Math.max(...Object.values(heatMapData), 1);

    Object.entries(heatMapData).forEach(([key, value]) => {
      const [x, y] = key.split(',').map(Number);
      const intensity = value / maxValue;

      // Color gradient: blue -> green -> yellow -> red
      let r, g, b;
      if (intensity < 0.25) {
        // Blue to cyan
        r = 0;
        g = Math.floor(intensity * 4 * 255);
        b = 255;
      } else if (intensity < 0.5) {
        // Cyan to green
        r = 0;
        g = 255;
        b = Math.floor((0.5 - intensity) * 4 * 255);
      } else if (intensity < 0.75) {
        // Green to yellow
        r = Math.floor((intensity - 0.5) * 4 * 255);
        g = 255;
        b = 0;
      } else {
        // Yellow to red
        r = 255;
        g = Math.floor((1 - intensity) * 4 * 255);
        b = 0;
      }

      const topLeft = worldToScreen(x, y);
      const bottomRight = worldToScreen(x + gridSize, y + gridSize);

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
      ctx.fillRect(
        topLeft.x,
        topLeft.y,
        bottomRight.x - topLeft.x,
        bottomRight.y - topLeft.y
      );
    });
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw floor plan (bottom layer)
    drawFloorPlan(ctx);

    // Draw grid
    drawGrid(ctx, width, height);

    // Draw heat map (before zones)
    drawHeatMap(ctx);

    // Draw zones
    zones.forEach((zone) => drawZone(ctx, zone));

    // Draw trails (before devices so devices are on top)
    drawTrails(ctx);

    // Draw drawing zone if in draw mode (zones or rooms)
    if ((editMode === 'draw' || editMode === 'draw_room') && drawingPoints.length > 0) {
      drawDrawingZone(ctx, drawingPoints);
    }

    // Draw wall being drawn
    if (editMode === 'draw_wall' && drawingPoints.length > 0) {
      const screenPoints = drawingPoints.map((p) => worldToScreen(p.x, p.y));

      // Draw first point
      ctx.fillStyle = '#FF9800';
      ctx.beginPath();
      ctx.arc(screenPoints[0].x, screenPoints[0].y, 6, 0, 2 * Math.PI);
      ctx.fill();

      // Draw line if we have 2 points
      if (screenPoints.length === 2) {
        ctx.strokeStyle = '#FF9800';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
        ctx.lineTo(screenPoints[1].x, screenPoints[1].y);
        ctx.stroke();

        // Draw second point
        ctx.fillStyle = '#FF9800';
        ctx.beginPath();
        ctx.arc(screenPoints[1].x, screenPoints[1].y, 6, 0, 2 * Math.PI);
        ctx.fill();

        // Draw length label
        const dx = drawingPoints[1].x - drawingPoints[0].x;
        const dy = drawingPoints[1].y - drawingPoints[0].y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const midX = (screenPoints[0].x + screenPoints[1].x) / 2;
        const midY = (screenPoints[0].y + screenPoints[1].y) / 2;

        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(`${length.toFixed(2)}m`, midX, midY - 15);
        ctx.fillText(`${length.toFixed(2)}m`, midX, midY - 15);
      }
    }

    // Draw sensors
    sensors.forEach((sensor) => drawSensor(ctx, sensor));

    // Draw devices (only if in live mode or historical mode without live toggle)
    if (visualizationModes.includes('live')) {
      devices.forEach((device) => {
        const position = positions[device.id];
        if (position) {
          drawDevice(ctx, device, position);
        }
      });
    }
  };

  useEffect(() => {
    render();
  }, [sensors, devices, zones, positions, scale, offset, selectedZone, editMode, drawingPoints, floorPlan, showFloorPlan, visualizationModes, historicalPositions, heatMapData, persons]);

  // Attach wheel event listener with passive: false to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((prev) => Math.max(10, Math.min(200, prev * delta)));
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      // Middle click or Ctrl+click for panning
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (editMode === 'draw' || editMode === 'draw_room' || editMode === 'draw_wall') {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const worldPoint = screenToWorld(x, y);
      onCanvasClick(worldPoint);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setOffset({ x: offset.x + dx, y: offset.y + dy });
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  return (
    <canvas
      ref={canvasRef}
      width={1200}
      height={800}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        border: '1px solid #ccc',
        cursor: isPanning ? 'grabbing' : editMode === 'draw' ? 'crosshair' : 'default',
        backgroundColor: '#fff',
        width: '100%',
        height: 'auto',
        maxWidth: '1200px',
        display: 'block',
      }}
    />
  );
};
