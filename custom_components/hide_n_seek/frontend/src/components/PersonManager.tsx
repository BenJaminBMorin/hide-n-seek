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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Devices as DevicesIcon,
} from '@mui/icons-material';
import { Person, TrackedDevice } from '../types';

interface PersonManagerProps {
  persons: Person[];
  devices: TrackedDevice[];
  onCreatePerson: (
    name: string,
    defaultDeviceId: string,
    linkedDeviceIds: string[],
    color: string
  ) => Promise<void>;
  onUpdatePerson: (person: Person) => Promise<void>;
  onDeletePerson: (personId: string) => Promise<void>;
}

export const PersonManager: React.FC<PersonManagerProps> = ({
  persons,
  devices,
  onCreatePerson,
  onUpdatePerson,
  onDeletePerson,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    defaultDeviceId: '',
    linkedDeviceIds: [] as string[],
    color: '#2196F3',
  });

  const handleOpenDialog = (person?: Person) => {
    if (person) {
      setEditingPerson(person);
      setFormData({
        name: person.name,
        defaultDeviceId: person.default_device_id,
        linkedDeviceIds: person.linked_device_ids,
        color: person.color,
      });
    } else {
      setEditingPerson(null);
      setFormData({
        name: '',
        defaultDeviceId: '',
        linkedDeviceIds: [],
        color: '#2196F3',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPerson(null);
    setFormData({
      name: '',
      defaultDeviceId: '',
      linkedDeviceIds: [],
      color: '#2196F3',
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a person name');
      return;
    }

    if (!formData.defaultDeviceId) {
      alert('Please select a default device');
      return;
    }

    try {
      if (editingPerson) {
        await onUpdatePerson({
          ...editingPerson,
          name: formData.name,
          default_device_id: formData.defaultDeviceId,
          linked_device_ids: formData.linkedDeviceIds,
          color: formData.color,
        });
      } else {
        await onCreatePerson(
          formData.name,
          formData.defaultDeviceId,
          formData.linkedDeviceIds,
          formData.color
        );
      }
      handleCloseDialog();
    } catch (err: any) {
      alert(`Failed to save person: ${err.message}`);
    }
  };

  const handleDeletePerson = async (personId: string) => {
    const person = persons.find((p) => p.id === personId);
    if (!person) return;

    if (!window.confirm(`Are you sure you want to delete person "${person.name}"?`)) {
      return;
    }

    try {
      await onDeletePerson(personId);
    } catch (err: any) {
      alert(`Failed to delete person: ${err.message}`);
    }
  };

  const getDeviceName = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    return device ? device.name : deviceId;
  };

  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Person Management
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={() => handleOpenDialog()}
        fullWidth
        sx={{ mb: 3 }}
      >
        Add Person
      </Button>

      <Typography variant="subtitle2" gutterBottom>
        Persons ({persons.length})
      </Typography>

      <List dense>
        {persons.map((person) => (
          <ListItem
            key={person.id}
            disablePadding
            secondaryAction={
              <Box>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => handleOpenDialog(person)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => handleDeletePerson(person.id)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            }
          >
            <ListItemButton>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  bgcolor: person.color,
                  borderRadius: '50%',
                  mr: 2,
                  border: '2px solid #fff',
                  boxShadow: '0 0 4px rgba(0,0,0,0.3)',
                }}
              />
              <ListItemText
                primary={person.name}
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="caption" display="block">
                      Default: {getDeviceName(person.default_device_id)}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      Linked: {person.linked_device_ids.length} device(s)
                    </Typography>
                  </Box>
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {persons.length === 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 2, textAlign: 'center' }}
        >
          No persons added yet. Click "Add Person" to start.
        </Typography>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPerson ? 'Edit Person' : 'Add New Person'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              autoFocus
            />

            <FormControl fullWidth>
              <InputLabel>Default Device</InputLabel>
              <Select
                value={formData.defaultDeviceId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultDeviceId: e.target.value,
                    linkedDeviceIds: formData.linkedDeviceIds.includes(e.target.value)
                      ? formData.linkedDeviceIds
                      : [...formData.linkedDeviceIds, e.target.value],
                  })
                }
                label="Default Device"
              >
                {devices.map((device) => (
                  <MenuItem key={device.id} value={device.id}>
                    {device.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Linked Devices</InputLabel>
              <Select
                multiple
                value={formData.linkedDeviceIds}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    linkedDeviceIds: e.target.value as string[],
                  })
                }
                label="Linked Devices"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((deviceId) => (
                      <Chip
                        key={deviceId}
                        label={getDeviceName(deviceId)}
                        size="small"
                      />
                    ))}
                  </Box>
                )}
              >
                {devices.map((device) => (
                  <MenuItem key={device.id} value={device.id}>
                    {device.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">Color:</Typography>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                style={{ width: 60, height: 40, cursor: 'pointer', border: 'none' }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="primary"
            disabled={!formData.name.trim() || !formData.defaultDeviceId}
          >
            {editingPerson ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
