import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import { MapCanvas } from './components/MapCanvas';
import { ZoneEditor } from './components/ZoneEditor';
import { DeviceList } from './components/DeviceList';
import { SensorStatus } from './components/SensorStatus';
import { SensorManager } from './components/SensorManager';
import { FloorPlanEditor } from './components/FloorPlanEditor';
import { HideNSeekWebSocket } from './utils/websocket';
import {
  Sensor,
  TrackedDevice,
  Zone,
  Position,
  Point,
  PositionUpdateEvent,
  ZoneEvent,
  FloorPlan,
} from './types';

// Get Home Assistant connection from global context
declare global {
  interface Window {
    hassConnection: any;
    __hideNSeekConfigEntryId?: string;
  }
}

// Use Home Assistant's existing WebSocket connection
// This is provided by Home Assistant's frontend framework
const getHassConnection = () => {
  // For now, we'll use a simpler approach - connect directly
  // In a production panel, you'd use Home Assistant's connection API
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const WS_URL = `${protocol}//${window.location.host}/api/websocket`;
  return WS_URL;
};

const CONFIG_ENTRY_ID = window.__hideNSeekConfigEntryId || 'hide_n_seek_default';
const WS_URL = getHassConnection();
const AUTH_TOKEN = localStorage.getItem('hassTokens') ?
  JSON.parse(localStorage.getItem('hassTokens')!).access_token :
  '';

export const App: React.FC = () => {
  const [ws, setWs] = useState<HideNSeekWebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [devices, setDevices] = useState<TrackedDevice[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [floorPlan, setFloorPlan] = useState<FloorPlan>({
    rooms: [],
    walls: [],
    dimensions: { width: 15, height: 12 },
  });

  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [editMode, setEditMode] = useState<'view' | 'draw' | 'edit' | 'draw_room'>('view');
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    const websocket = new HideNSeekWebSocket(CONFIG_ENTRY_ID);

    websocket
      .connect(WS_URL, AUTH_TOKEN)
      .then(() => {
        setConnected(true);
        setWs(websocket);
        return Promise.all([
          websocket.getMapData(),
          websocket.getFloorPlan(),
        ]);
      })
      .then(([mapData, floorPlanData]) => {
        setSensors(mapData.sensors);
        setDevices(mapData.devices);
        setZones(mapData.zones);
        setPositions(mapData.positions);
        setFloorPlan(floorPlanData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    return () => {
      websocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!ws || !connected) return;

    // Subscribe to position updates
    const unsubPositions = ws.subscribeToPositions((event: PositionUpdateEvent) => {
      setPositions((prev) => ({
        ...prev,
        [event.device_id]: {
          x: event.position.x,
          y: event.position.y,
          confidence: event.confidence,
          sensor_count: event.sensor_count,
          method: 'real-time',
        },
      }));
    });

    // Subscribe to zone events
    const unsubZones = ws.subscribeToZones((event: ZoneEvent, eventType: string) => {
      const action = eventType.includes('entered') ? 'entered' : 'exited';
      showSnackbar(`Device ${event.device_id} ${action} ${event.zone_name}`, 'info');
    });

    return () => {
      unsubPositions();
      unsubZones();
    };
  }, [ws, connected]);

  const showSnackbar = (
    message: string,
    severity: 'success' | 'error' | 'info' = 'success'
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleCanvasClick = (point: Point) => {
    if (editMode === 'draw' || editMode === 'draw_room') {
      setDrawingPoints([...drawingPoints, point]);
    }
  };

  const handleClearDrawing = () => {
    setDrawingPoints([]);
  };

  const handleCreateZone = async (name: string, coordinates: Point[], color: string) => {
    if (!ws) return;

    try {
      const zone = await ws.updateZone(null, {
        name,
        coordinates: coordinates.map((p) => [p.x, p.y]),
        color,
        enabled: true,
      });

      setZones([...zones, zone]);
      showSnackbar(`Zone "${name}" created successfully`);
    } catch (err: any) {
      showSnackbar(`Failed to create zone: ${err.message}`, 'error');
    }
  };

  const handleUpdateZone = async (zone: Zone) => {
    if (!ws) return;

    try {
      const updatedZone = await ws.updateZone(zone.id, {
        name: zone.name,
        coordinates: zone.coordinates,
        color: zone.color,
        enabled: zone.enabled,
      });

      setZones(zones.map((z) => (z.id === zone.id ? updatedZone : z)));
      showSnackbar(`Zone "${zone.name}" updated successfully`);
    } catch (err: any) {
      showSnackbar(`Failed to update zone: ${err.message}`, 'error');
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    if (!ws) return;

    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;

    if (!confirm(`Are you sure you want to delete zone "${zone.name}"?`)) {
      return;
    }

    try {
      await ws.deleteZone(zoneId);
      setZones(zones.filter((z) => z.id !== zoneId));
      if (selectedZone?.id === zoneId) {
        setSelectedZone(null);
      }
      showSnackbar(`Zone "${zone.name}" deleted successfully`);
    } catch (err: any) {
      showSnackbar(`Failed to delete zone: ${err.message}`, 'error');
    }
  };

  const handleAddSensor = async (sensorData: Omit<Sensor, 'last_seen'>) => {
    if (!ws) return;

    const sensor = await ws.addSensor(sensorData);
    setSensors([...sensors, sensor]);
    showSnackbar(`Sensor "${sensor.name}" added successfully`);
  };

  const handleUpdateSensor = async (sensorId: string, sensorData: Partial<Sensor>) => {
    if (!ws) return;

    const updatedSensor = await ws.updateSensor(sensorId, sensorData);
    setSensors(sensors.map((s) => (s.id === sensorId ? updatedSensor : s)));
    showSnackbar(`Sensor "${updatedSensor.name}" updated successfully`);
  };

  const handleDeleteSensor = async (sensorId: string) => {
    if (!ws) return;

    await ws.deleteSensor(sensorId);
    setSensors(sensors.filter((s) => s.id !== sensorId));
    showSnackbar('Sensor deleted successfully');
  };

  const handleUpdateFloorPlanDimensions = async (width: number, height: number) => {
    if (!ws) return;

    const updatedFloorPlan = await ws.updateFloorPlanDimensions(width, height);
    setFloorPlan(updatedFloorPlan);
    showSnackbar('Floor plan dimensions updated');
  };

  const handleCreateRoom = async (name: string, coordinates: Point[], color: string) => {
    if (!ws) return;

    const room = await ws.createRoom({
      name,
      coordinates: coordinates.map((p) => [p.x, p.y]),
      color,
    });

    setFloorPlan({
      ...floorPlan,
      rooms: [...floorPlan.rooms, room],
    });
    showSnackbar(`Room "${name}" created successfully`);
  };

  const handleUpdateRoom = async (
    roomId: string,
    name: string,
    coordinates: Point[],
    color: string
  ) => {
    if (!ws) return;

    const updatedRoom = await ws.updateRoom(roomId, {
      name,
      coordinates: coordinates.map((p) => [p.x, p.y]),
      color,
    });

    setFloorPlan({
      ...floorPlan,
      rooms: floorPlan.rooms.map((r) => (r.id === roomId ? updatedRoom : r)),
    });
    showSnackbar(`Room "${name}" updated successfully`);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!ws) return;

    await ws.deleteRoom(roomId);
    setFloorPlan({
      ...floorPlan,
      rooms: floorPlan.rooms.filter((r) => r.id !== roomId),
    });
    showSnackbar('Room deleted successfully');
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress size={60} />
        <Typography variant="h6">Loading Hide-n-Seek...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        p={3}
      >
        <Alert severity="error" sx={{ maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            Connection Error
          </Typography>
          <Typography variant="body2">{error}</Typography>
          <Typography variant="caption" display="block" sx={{ mt: 2 }}>
            Make sure Home Assistant is running and WebSocket connection is configured correctly.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Hide-n-Seek Presence Tracker
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: connected ? 'success.main' : 'error.main',
              }}
            />
            <Typography variant="body2">
              {connected ? 'Connected' : 'Disconnected'}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ mt: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Tracking Map
              </Typography>
              <MapCanvas
                sensors={sensors}
                devices={devices}
                zones={zones}
                positions={positions}
                selectedZone={selectedZone}
                onZoneClick={setSelectedZone}
                onCanvasClick={handleCanvasClick}
                editMode={editMode}
                drawingPoints={drawingPoints}
                floorPlan={floorPlan}
                showFloorPlan={true}
              />
            </Paper>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <ZoneEditor
                  zones={zones}
                  selectedZone={selectedZone}
                  onSelectZone={setSelectedZone}
                  onCreateZone={handleCreateZone}
                  onUpdateZone={handleUpdateZone}
                  onDeleteZone={handleDeleteZone}
                  editMode={editMode}
                  onEditModeChange={setEditMode}
                  drawingPoints={drawingPoints}
                  onClearDrawing={handleClearDrawing}
                />
              </Grid>

              <Grid item xs={12}>
                <DeviceList devices={devices} positions={positions} />
              </Grid>

              <Grid item xs={12}>
                <SensorManager
                  sensors={sensors}
                  onAddSensor={handleAddSensor}
                  onUpdateSensor={handleUpdateSensor}
                  onDeleteSensor={handleDeleteSensor}
                />
              </Grid>

              <Grid item xs={12}>
                <FloorPlanEditor
                  floorPlan={floorPlan}
                  onUpdateDimensions={handleUpdateFloorPlanDimensions}
                  onCreateRoom={handleCreateRoom}
                  onUpdateRoom={handleUpdateRoom}
                  onDeleteRoom={handleDeleteRoom}
                  onEditModeChange={setEditMode}
                  editMode={editMode}
                  drawingPoints={drawingPoints}
                  onClearDrawing={handleClearDrawing}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
