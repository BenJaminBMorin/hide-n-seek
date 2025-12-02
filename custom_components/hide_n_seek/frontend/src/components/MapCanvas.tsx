import React, { useEffect, useRef, useState } from 'react';
import { Sensor, TrackedDevice, Zone, Position, Point, FloorPlan } from '../types';

interface MapCanvasProps {
  sensors: Sensor[];
  devices: TrackedDevice[];
  zones: Zone[];
  positions: Record<string, Position>;
  selectedZone: Zone | null;
  onZoneClick: (zone: Zone) => void;
  onCanvasClick: (point: Point) => void;
  editMode: 'view' | 'draw' | 'edit' | 'draw_room';
  drawingPoints: Point[];
  floorPlan?: FloorPlan;
  showFloorPlan?: boolean;
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

    // Draw zones
    zones.forEach((zone) => drawZone(ctx, zone));

    // Draw drawing zone if in draw mode (zones or rooms)
    if ((editMode === 'draw' || editMode === 'draw_room') && drawingPoints.length > 0) {
      drawDrawingZone(ctx, drawingPoints);
    }

    // Draw sensors
    sensors.forEach((sensor) => drawSensor(ctx, sensor));

    // Draw devices
    devices.forEach((device) => {
      const position = positions[device.id];
      if (position) {
        drawDevice(ctx, device, position);
      }
    });
  };

  useEffect(() => {
    render();
  }, [sensors, devices, zones, positions, scale, offset, selectedZone, editMode, drawingPoints, floorPlan, showFloorPlan]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      // Middle click or Ctrl+click for panning
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (editMode === 'draw') {
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

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.max(10, Math.min(200, prev * delta)));
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
      onWheel={handleWheel}
      style={{
        border: '1px solid #ccc',
        cursor: isPanning ? 'grabbing' : editMode === 'draw' ? 'crosshair' : 'default',
        backgroundColor: '#fff',
      }}
    />
  );
};
