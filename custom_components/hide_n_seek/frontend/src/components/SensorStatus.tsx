import React from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
} from '@mui/material';
import {
  Sensors as SensorsIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import { Sensor } from '../types';

interface SensorStatusProps {
  sensors: Sensor[];
}

export const SensorStatus: React.FC<SensorStatusProps> = ({ sensors }) => {
  const getSensorTypeLabel = (type: string): string => {
    const types: Record<string, string> = {
      mqtt: 'MQTT',
      esphome: 'ESPHome',
      bluetooth: 'Bluetooth',
      mmwave: 'mmWave',
    };
    return types[type] || type;
  };

  const getSensorTypeColor = (
    type: string
  ): 'primary' | 'secondary' | 'success' | 'warning' => {
    const colors: Record<string, 'primary' | 'secondary' | 'success' | 'warning'> = {
      mqtt: 'primary',
      esphome: 'success',
      bluetooth: 'secondary',
      mmwave: 'warning',
    };
    return colors[type] || 'primary';
  };

  const activeSensors = sensors.filter((s) => s.enabled);
  const inactiveSensors = sensors.filter((s) => !s.enabled);

  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <SensorsIcon sx={{ mr: 1 }} />
        <Typography variant="h6">
          Sensors ({activeSensors.length}/{sensors.length} active)
        </Typography>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {activeSensors.length > 0 && (
        <>
          <Typography variant="subtitle2" color="success.main" sx={{ mb: 1 }}>
            Active Sensors
          </Typography>
          <List dense>
            {activeSensors.map((sensor) => (
              <ListItem
                key={sensor.id}
                sx={{
                  mb: 1,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ActiveIcon color="success" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight="bold">
                      {sensor.name}
                    </Typography>
                  </Box>
                  <Chip
                    label={getSensorTypeLabel(sensor.type)}
                    size="small"
                    color={getSensorTypeColor(sensor.type)}
                  />
                </Box>

                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Location: ({sensor.location[0].toFixed(2)}, {sensor.location[1].toFixed(2)})
                      </Typography>
                      {sensor.last_seen && (
                        <Typography variant="caption" color="text.secondary">
                          Last seen: {new Date(sensor.last_seen).toLocaleTimeString()}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </>
      )}

      {inactiveSensors.length > 0 && (
        <>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, mt: 2 }}>
            Inactive Sensors
          </Typography>
          <List dense>
            {inactiveSensors.map((sensor) => (
              <ListItem
                key={sensor.id}
                sx={{
                  mb: 1,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  opacity: 0.6,
                }}
              >
                <InactiveIcon color="disabled" fontSize="small" sx={{ mr: 1 }} />
                <ListItemText
                  primary={sensor.name}
                  secondary={
                    <>
                      {getSensorTypeLabel(sensor.type)} • Location: ({sensor.location[0].toFixed(2)},{' '}
                      {sensor.location[1].toFixed(2)})
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </>
      )}

      {sensors.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
          No sensors configured
        </Typography>
      )}
    </Paper>
  );
};
