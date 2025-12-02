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
  PhoneAndroid as PhoneIcon,
  SignalCellularAlt as SignalIcon,
} from '@mui/icons-material';
import { TrackedDevice, Position } from '../types';

interface DeviceListProps {
  devices: TrackedDevice[];
  positions: Record<string, Position>;
}

export const DeviceList: React.FC<DeviceListProps> = ({ devices, positions }) => {
  const formatPosition = (pos: Position | undefined): string => {
    if (!pos) return 'Unknown';
    return `(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`;
  };

  const getConfidenceColor = (confidence: number): 'success' | 'warning' | 'error' | 'default' => {
    if (confidence >= 0.7) return 'success';
    if (confidence >= 0.4) return 'warning';
    if (confidence > 0) return 'error';
    return 'default';
  };

  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <PhoneIcon sx={{ mr: 1 }} />
        <Typography variant="h6">Tracked Devices ({devices.length})</Typography>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <List dense>
        {devices.map((device) => {
          const position = positions[device.id];
          const hasPosition = position !== undefined;

          return (
            <ListItem
              key={device.id}
              sx={{
                mb: 1,
                bgcolor: 'action.hover',
                borderRadius: 1,
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {device.name}
                </Typography>
                {hasPosition && (
                  <Chip
                    icon={<SignalIcon />}
                    label={`${Math.round(position.confidence * 100)}%`}
                    size="small"
                    color={getConfidenceColor(position.confidence)}
                  />
                )}
              </Box>

              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Position: {formatPosition(position)}
                    </Typography>
                    {hasPosition && (
                      <>
                        <Typography variant="caption" color="text.secondary">
                          Sensors: {position.sensor_count} • Method: {position.method}
                        </Typography>
                        {device.mac_address && (
                          <Typography variant="caption" color="text.secondary">
                            MAC: {device.mac_address}
                          </Typography>
                        )}
                      </>
                    )}
                    {device.last_seen && (
                      <Typography variant="caption" color="text.secondary">
                        Last seen: {new Date(device.last_seen).toLocaleTimeString()}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>

      {devices.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
          No devices being tracked
        </Typography>
      )}
    </Paper>
  );
};
