import React from 'react';
import {
  Box,
  Chip,
  Select,
  MenuItem,
  Typography,
  Paper,
  FormControl,
} from '@mui/material';
import { Person as PersonIcon, Devices as DevicesIcon } from '@mui/icons-material';
import { Person, TrackedDevice, Position } from '../types';

interface PersonSwitcherProps {
  persons: Person[];
  devices: TrackedDevice[];
  positions: Record<string, Position>;
  onSetActiveDevice: (personId: string, deviceId: string) => Promise<void>;
}

export const PersonSwitcher: React.FC<PersonSwitcherProps> = ({
  persons,
  devices,
  positions,
  onSetActiveDevice,
}) => {
  const getDeviceName = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    return device ? device.name : deviceId;
  };

  const getPersonPosition = (person: Person): Position | null => {
    return positions[person.default_device_id] || null;
  };

  const handleDeviceChange = async (personId: string, deviceId: string) => {
    try {
      await onSetActiveDevice(personId, deviceId);
    } catch (err: any) {
      alert(`Failed to set active device: ${err.message}`);
    }
  };

  if (persons.length === 0) {
    return null;
  }

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        mb: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonIcon fontSize="small" />
        Person Tracking
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          mt: 1,
        }}
      >
        {persons.map((person) => {
          const position = getPersonPosition(person);
          const linkedDevices = person.linked_device_ids.filter((id) =>
            devices.some((d) => d.id === id)
          );

          return (
            <Box
              key={person.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1.5,
                bgcolor: 'action.hover',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                minWidth: 280,
              }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  bgcolor: person.color,
                  borderRadius: '50%',
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 'medium',
                  minWidth: 80,
                }}
              >
                {person.name}
              </Typography>

              <FormControl size="small" sx={{ minWidth: 150, flexGrow: 1 }}>
                <Select
                  value={person.default_device_id}
                  onChange={(e) => handleDeviceChange(person.id, e.target.value)}
                  disabled={linkedDevices.length === 0}
                  sx={{ height: 32 }}
                >
                  {linkedDevices.map((deviceId) => (
                    <MenuItem key={deviceId} value={deviceId}>
                      {getDeviceName(deviceId)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {position && (
                <Chip
                  label={`${position.x.toFixed(1)}m, ${position.y.toFixed(1)}m`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};
