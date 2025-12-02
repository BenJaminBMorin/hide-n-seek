import React, { useEffect, useState, useRef } from 'react';
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
import { PersonManager } from './components/PersonManager';
import { PersonSwitcher } from './components/PersonSwitcher';
import { TimeSlider } from './components/TimeSlider';
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
  Wall,
  Person,
  PositionRecord,
} from './types';

// Get Home Assistant connection from global context
declare global {
  interface Window {
    hassConnection: any;
    __hideNSeekConfigEntryId?: string;
  }
}

interface AppProps {
  hass?: any;
}

export const App: React.FC<AppProps> = ({ hass }) => {
  const [ws, setWs] = useState<HideNSeekWebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [devices, setDevices] = useState<TrackedDevice[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [persons, setPersons] = useState<Person[]>([]);
  const [floorPlan, setFloorPlan] = useState<FloorPlan>({
    rooms: [],
    walls: [],
    dimensions: { width: 15, height: 12 },
  });

  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [editMode, setEditMode] = useState<'view' | 'draw' | 'edit' | 'draw_room' | 'draw_wall' | 'edit_wall'>('view');
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // History mode state
  const [historyMode, setHistoryMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now() / 1000);
  const [playbackPlaying, setPlaybackPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [visualizationModes, setVisualizationModes] = useState<string[]>(['live']);
  const [historicalPositions, setHistoricalPositions] = useState<Record<string, PositionRecord[]>>({});

  // Track initialization state to prevent duplicate initializations
  const initializingRef = useRef(false);
  const initializedRef = useRef(false);
  const wsRef = useRef<HideNSeekWebSocket | null>(null);

  useEffect(() => {
    // Wait for hass object to be available
    if (!hass || !hass.connection) {
      console.log('Waiting for hass connection...');
      setLoading(true);
      setError(null);
      return;
    }

    // Prevent duplicate initializations
    if (initializingRef.current || initializedRef.current) {
      return;
    }

    initializingRef.current = true;
    console.log('=== Hide-n-Seek Panel Initializing ===');
    console.log('Hass connection available');

    // FIRST: Find the config entry ID from entity states
    const initializePanel = async () => {
      try {
        console.log('Step 1: Searching for hide_n_seek entities in states...');

        // Find all hide_n_seek entities
        const hideNSeekEntityIds = Object.keys(hass.states).filter(entityId =>
          entityId.includes('hide_n_seek') || entityId.includes('hide-n-seek')
        );

        console.log('Found hide_n_seek entities:', hideNSeekEntityIds);

        if (hideNSeekEntityIds.length === 0) {
          throw new Error('No Hide-n-Seek entities found. Please ensure the integration is configured and has created entities.');
        }

        // Try to get config entry ID from the entity registry
        let configEntryId: string | null = null;

        // Try getting from entity registry
        try {
          console.log('Step 2: Getting config entry ID from entity registry...');
          const entityInfo: any = await hass.callWS({
            type: 'config/entity_registry/get',
            entity_id: hideNSeekEntityIds[0]
          });
          if (entityInfo && entityInfo.config_entry_id) {
            configEntryId = entityInfo.config_entry_id;
            console.log('Found config_entry_id:', configEntryId);
          }
        } catch (err) {
          console.log('Could not get entity from registry:', err);
        }

        if (!configEntryId) {
          throw new Error('Could not determine config entry ID. Please report this issue with the console logs.');
        }

        console.log('Step 3: Creating WebSocket wrapper...');
        const websocket = new HideNSeekWebSocket(hass, configEntryId);
        wsRef.current = websocket;

        await websocket.connect();
        console.log('Step 4: Connection established');

        setConnected(true);
        setWs(websocket);
        setError(null);

        console.log('Step 5: Fetching initial data...');
        const [mapData, floorPlanData, personsData] = await Promise.all([
          websocket.getMapData(),
          websocket.getFloorPlan(),
          websocket.getPersons(),
        ]);

        console.log('Step 6: Data received, updating UI...');
        setSensors(mapData.sensors);
        setDevices(mapData.devices);
        setZones(mapData.zones);
        setPositions(mapData.positions);
        setFloorPlan(floorPlanData);
        setPersons(personsData);
        setLoading(false);

        console.log('=== Panel Initialized Successfully ===');
        initializedRef.current = true;

        return websocket;
      } catch (err: any) {
        console.error('=== Initialization Failed ===');
        console.error('Error:', err);
        setError(err.message || 'Failed to initialize panel');
        setLoading(false);
        initializingRef.current = false;
        throw err;
      }
    };

    initializePanel().catch(() => {
      // Error already handled in initializePanel
    });

    return () => {
      // Cleanup on unmount
      if (wsRef.current && typeof wsRef.current.disconnect === 'function') {
        console.log('Cleaning up WebSocket connection...');
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      initializedRef.current = false;
      initializingRef.current = false;
    };
  }, [hass?.connection]);

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

  // Fetch historical data when visualization modes change
  useEffect(() => {
    if (!ws || !connected) return;
    if (!visualizationModes.includes('trails') && !visualizationModes.includes('heatmap')) {
      return;
    }

    const fetchHistoricalData = async () => {
      const now = Date.now() / 1000;
      const startTime = now - 24 * 3600; // Last 24 hours
      const endTime = now;

      try {
        const histData: Record<string, PositionRecord[]> = {};

        for (const device of devices) {
          const positions = await ws.getPositionHistory(
            device.id,
            startTime,
            endTime,
            60 // Downsample to 1 point per minute
          );
          histData[device.id] = positions;
        }

        setHistoricalPositions(histData);
      } catch (err: any) {
        console.error('Failed to fetch historical data:', err);
      }
    };

    fetchHistoricalData();
  }, [ws, connected, devices, visualizationModes]);

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
    if (editMode === 'draw' || editMode === 'draw_room' || editMode === 'draw_wall') {
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

  const handleCreateWall = async (
    start: Point,
    end: Point,
    thickness: number,
    color: string,
    type: string
  ) => {
    if (!ws) return;

    try {
      const wall = await ws.createWall({
        start: [start.x, start.y],
        end: [end.x, end.y],
        thickness,
        color,
        type,
      });

      setFloorPlan({
        ...floorPlan,
        walls: [...floorPlan.walls, wall],
      });
      showSnackbar('Wall created successfully');
    } catch (err: any) {
      showSnackbar(`Failed to create wall: ${err.message}`, 'error');
    }
  };

  const handleUpdateWall = async (wallId: string, wallData: Partial<Wall>) => {
    if (!ws) return;

    try {
      const updatedWall = await ws.updateWall(wallId, {
        start: wallData.start,
        end: wallData.end,
        thickness: wallData.thickness,
        color: wallData.color,
        type: wallData.type,
      });

      setFloorPlan({
        ...floorPlan,
        walls: floorPlan.walls.map((w) => (w.id === wallId ? updatedWall : w)),
      });
      showSnackbar('Wall updated successfully');
    } catch (err: any) {
      showSnackbar(`Failed to update wall: ${err.message}`, 'error');
    }
  };

  const handleDeleteWall = async (wallId: string) => {
    if (!ws) return;

    try {
      await ws.deleteWall(wallId);
      setFloorPlan({
        ...floorPlan,
        walls: floorPlan.walls.filter((w) => w.id !== wallId),
      });
      showSnackbar('Wall deleted successfully');
    } catch (err: any) {
      showSnackbar(`Failed to delete wall: ${err.message}`, 'error');
    }
  };

  const handleCreatePerson = async (
    name: string,
    defaultDeviceId: string,
    linkedDeviceIds: string[],
    color: string
  ) => {
    if (!ws) return;

    try {
      const person = await ws.createPerson({
        name,
        default_device_id: defaultDeviceId,
        linked_device_ids: linkedDeviceIds,
        color,
      });
      setPersons([...persons, person]);
      showSnackbar(`Person "${name}" created successfully`);
    } catch (err: any) {
      showSnackbar(`Failed to create person: ${err.message}`, 'error');
      throw err;
    }
  };

  const handleUpdatePerson = async (person: Person) => {
    if (!ws) return;

    try {
      const updatedPerson = await ws.updatePerson(person.id, {
        name: person.name,
        default_device_id: person.default_device_id,
        linked_device_ids: person.linked_device_ids,
        color: person.color,
      });
      setPersons(persons.map((p) => (p.id === person.id ? updatedPerson : p)));
      showSnackbar(`Person "${person.name}" updated successfully`);
    } catch (err: any) {
      showSnackbar(`Failed to update person: ${err.message}`, 'error');
      throw err;
    }
  };

  const handleDeletePerson = async (personId: string) => {
    if (!ws) return;

    try {
      await ws.deletePerson(personId);
      setPersons(persons.filter((p) => p.id !== personId));
      showSnackbar('Person deleted successfully');
    } catch (err: any) {
      showSnackbar(`Failed to delete person: ${err.message}`, 'error');
      throw err;
    }
  };

  const handleSetActiveDevice = async (personId: string, deviceId: string) => {
    if (!ws) return;

    try {
      const updatedPerson = await ws.updatePerson(personId, {
        default_device_id: deviceId,
      });
      setPersons(persons.map((p) => (p.id === personId ? updatedPerson : p)));
      showSnackbar('Active device updated');
    } catch (err: any) {
      showSnackbar(`Failed to set active device: ${err.message}`, 'error');
      throw err;
    }
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
        <TimeSlider
          minTime={currentTime - 24 * 3600}
          maxTime={Date.now() / 1000}
          currentTime={currentTime}
          onTimeChange={setCurrentTime}
          playing={playbackPlaying}
          onPlayPause={() => setPlaybackPlaying(!playbackPlaying)}
          playbackSpeed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
          visualizationModes={visualizationModes}
          onVisualizationModeChange={setVisualizationModes}
        />

        <PersonSwitcher
          persons={persons}
          devices={devices}
          positions={positions}
          onSetActiveDevice={handleSetActiveDevice}
        />

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
                visualizationModes={visualizationModes}
                historicalPositions={historicalPositions}
                persons={persons}
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
                  onCreateWall={handleCreateWall}
                  onUpdateWall={handleUpdateWall}
                  onDeleteWall={handleDeleteWall}
                  onEditModeChange={setEditMode}
                  editMode={editMode}
                  drawingPoints={drawingPoints}
                  onClearDrawing={handleClearDrawing}
                />
              </Grid>

              <Grid item xs={12}>
                <PersonManager
                  persons={persons}
                  devices={devices}
                  onCreatePerson={handleCreatePerson}
                  onUpdatePerson={handleUpdatePerson}
                  onDeletePerson={handleDeletePerson}
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
