import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
  Typography,
  Paper,
  Divider,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { Sensor } from '../types';

interface SensorManagerProps {
  sensors: Sensor[];
  onAddSensor: (sensor: Omit<Sensor, 'last_seen'>) => Promise<void>;
  onUpdateSensor: (sensorId: string, data: Partial<Sensor>) => Promise<void>;
  onDeleteSensor: (sensorId: string) => Promise<void>;
}

export const SensorManager: React.FC<SensorManagerProps> = ({
  sensors,
  onAddSensor,
  onUpdateSensor,
  onDeleteSensor,
}) => {
  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);
  const [validationError, setValidationError] = useState<string>('');

  // New sensor form state
  const [newSensor, setNewSensor] = useState({
    id: '',
    name: '',
    type: 'bluetooth' as Sensor['type'],
    location: [0, 0] as [number, number],
    enabled: true,
    metadata: {},
  });

  const validateSensorData = (
    id: string,
    name: string,
    location: [number, number]
  ): string | null => {
    if (!id.trim()) {
      return 'Sensor ID is required';
    }

    if (!name.trim()) {
      return 'Sensor name is required';
    }

    if (isNaN(location[0]) || isNaN(location[1])) {
      return 'Location coordinates must be valid numbers';
    }

    // Check for duplicate ID (only for new sensors)
    if (mode === 'add' && sensors.some((s) => s.id === id)) {
      return 'A sensor with this ID already exists';
    }

    return null;
  };

  const handleStartAdd = () => {
    setMode('add');
    setValidationError('');
    setNewSensor({
      id: `sensor_${Date.now()}`,
      name: '',
      type: 'bluetooth',
      location: [0, 0],
      enabled: true,
      metadata: {},
    });
  };

  const handleSaveAdd = async () => {
    const error = validateSensorData(newSensor.id, newSensor.name, newSensor.location);
    if (error) {
      setValidationError(error);
      return;
    }

    try {
      await onAddSensor(newSensor);
      setMode('list');
      setValidationError('');
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to add sensor');
    }
  };

  const handleCancelAdd = () => {
    setMode('list');
    setValidationError('');
  };

  const handleStartEdit = (sensor: Sensor) => {
    setEditingSensor({ ...sensor });
    setMode('edit');
    setValidationError('');
  };

  const handleSaveEdit = async () => {
    if (!editingSensor) return;

    const error = validateSensorData(
      editingSensor.id,
      editingSensor.name,
      editingSensor.location
    );
    if (error) {
      setValidationError(error);
      return;
    }

    try {
      await onUpdateSensor(editingSensor.id, {
        name: editingSensor.name,
        type: editingSensor.type,
        location: editingSensor.location,
        enabled: editingSensor.enabled,
        metadata: editingSensor.metadata,
      });
      setMode('list');
      setEditingSensor(null);
      setValidationError('');
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to update sensor');
    }
  };

  const handleCancelEdit = () => {
    setMode('list');
    setEditingSensor(null);
    setValidationError('');
  };

  const handleDelete = async (sensorId: string) => {
    if (!window.confirm('Are you sure you want to delete this sensor?')) {
      return;
    }

    try {
      await onDeleteSensor(sensorId);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to delete sensor');
    }
  };

  const handleToggleSensor = async (sensor: Sensor) => {
    try {
      await onUpdateSensor(sensor.id, { enabled: !sensor.enabled });
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to toggle sensor');
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Sensor Management
      </Typography>

      <Divider sx={{ my: 2 }} />

      {validationError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setValidationError('')}>
          {validationError}
        </Alert>
      )}

      {mode === 'add' && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Add New Sensor
          </Typography>

          <TextField
            fullWidth
            label="Sensor ID"
            value={newSensor.id}
            onChange={(e) => setNewSensor({ ...newSensor, id: e.target.value })}
            sx={{ mb: 2 }}
            size="small"
            helperText="Unique identifier for the sensor"
          />

          <TextField
            fullWidth
            label="Sensor Name"
            value={newSensor.name}
            onChange={(e) => setNewSensor({ ...newSensor, name: e.target.value })}
            sx={{ mb: 2 }}
            size="small"
            required
          />

          <FormControl fullWidth sx={{ mb: 2 }} size="small">
            <InputLabel>Sensor Type</InputLabel>
            <Select
              value={newSensor.type}
              label="Sensor Type"
              onChange={(e) =>
                setNewSensor({ ...newSensor, type: e.target.value as Sensor['type'] })
              }
            >
              <MenuItem value="bluetooth">Bluetooth</MenuItem>
              <MenuItem value="mqtt">MQTT</MenuItem>
              <MenuItem value="esphome">ESPHome</MenuItem>
              <MenuItem value="mmwave">mmWave</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="X Coordinate (m)"
              type="number"
              value={newSensor.location[0]}
              onChange={(e) =>
                setNewSensor({
                  ...newSensor,
                  location: [parseFloat(e.target.value) || 0, newSensor.location[1]],
                })
              }
              size="small"
              fullWidth
            />
            <TextField
              label="Y Coordinate (m)"
              type="number"
              value={newSensor.location[1]}
              onChange={(e) =>
                setNewSensor({
                  ...newSensor,
                  location: [newSensor.location[0], parseFloat(e.target.value) || 0],
                })
              }
              size="small"
              fullWidth
            />
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={newSensor.enabled}
                onChange={(e) => setNewSensor({ ...newSensor, enabled: e.target.checked })}
              />
            }
            label="Enabled"
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSaveAdd}
              fullWidth
            >
              Add Sensor
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<CancelIcon />}
              onClick={handleCancelAdd}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      )}

      {mode === 'edit' && editingSensor && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Editing Sensor
          </Typography>

          <TextField
            fullWidth
            label="Sensor Name"
            value={editingSensor.name}
            onChange={(e) => setEditingSensor({ ...editingSensor, name: e.target.value })}
            sx={{ mb: 2 }}
            size="small"
            required
          />

          <FormControl fullWidth sx={{ mb: 2 }} size="small">
            <InputLabel>Sensor Type</InputLabel>
            <Select
              value={editingSensor.type}
              label="Sensor Type"
              onChange={(e) =>
                setEditingSensor({
                  ...editingSensor,
                  type: e.target.value as Sensor['type'],
                })
              }
            >
              <MenuItem value="bluetooth">Bluetooth</MenuItem>
              <MenuItem value="mqtt">MQTT</MenuItem>
              <MenuItem value="esphome">ESPHome</MenuItem>
              <MenuItem value="mmwave">mmWave</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="X Coordinate (m)"
              type="number"
              value={editingSensor.location[0]}
              onChange={(e) =>
                setEditingSensor({
                  ...editingSensor,
                  location: [parseFloat(e.target.value) || 0, editingSensor.location[1]],
                })
              }
              size="small"
              fullWidth
            />
            <TextField
              label="Y Coordinate (m)"
              type="number"
              value={editingSensor.location[1]}
              onChange={(e) =>
                setEditingSensor({
                  ...editingSensor,
                  location: [editingSensor.location[0], parseFloat(e.target.value) || 0],
                })
              }
              size="small"
              fullWidth
            />
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={editingSensor.enabled}
                onChange={(e) =>
                  setEditingSensor({ ...editingSensor, enabled: e.target.checked })
                }
              />
            }
            label="Enabled"
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSaveEdit}
              fullWidth
            >
              Save
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<CancelIcon />}
              onClick={handleCancelEdit}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      )}

      {mode === 'list' && (
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleStartAdd}
          fullWidth
          sx={{ mb: 3 }}
        >
          Add New Sensor
        </Button>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" gutterBottom>
        Sensors ({sensors.length})
      </Typography>

      <List dense>
        {sensors.map((sensor) => (
          <ListItem
            key={sensor.id}
            disablePadding
            secondaryAction={
              <Box>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => handleStartEdit(sensor)}
                  disabled={mode !== 'list'}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => handleDelete(sensor.id)}
                  disabled={mode !== 'list'}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            }
          >
            <ListItemButton disabled={mode !== 'list'}>
              <ListItemText
                primary={sensor.name}
                secondary={`${sensor.type} • (${sensor.location[0].toFixed(1)}, ${sensor.location[1].toFixed(
                  1
                )}) • ${sensor.enabled ? 'Enabled' : 'Disabled'}`}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {sensors.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
          No sensors configured yet. Click "Add New Sensor" to start.
        </Typography>
      )}
    </Paper>
  );
};
