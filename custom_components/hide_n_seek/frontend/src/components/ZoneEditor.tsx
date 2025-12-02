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
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { Zone, Point } from '../types';

interface ZoneEditorProps {
  zones: Zone[];
  selectedZone: Zone | null;
  onSelectZone: (zone: Zone | null) => void;
  onCreateZone: (name: string, coordinates: Point[], color: string) => void;
  onUpdateZone: (zone: Zone) => void;
  onDeleteZone: (zoneId: string) => void;
  editMode: 'view' | 'draw' | 'edit' | 'draw_room';
  onEditModeChange: (mode: 'view' | 'draw' | 'edit' | 'draw_room') => void;
  drawingPoints: Point[];
  onClearDrawing: () => void;
}

export const ZoneEditor: React.FC<ZoneEditorProps> = ({
  zones,
  selectedZone,
  onSelectZone,
  onCreateZone,
  onUpdateZone,
  onDeleteZone,
  editMode,
  onEditModeChange,
  drawingPoints,
  onClearDrawing,
}) => {
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneColor, setNewZoneColor] = useState('#3498db');
  const [editingZone, setEditingZone] = useState<Zone | null>(null);

  const handleStartDrawing = () => {
    onEditModeChange('draw');
    onSelectZone(null);
    onClearDrawing();
  };

  const handleSaveDrawing = () => {
    if (drawingPoints.length < 3) {
      alert('A zone must have at least 3 points');
      return;
    }

    if (!newZoneName.trim()) {
      alert('Please enter a zone name');
      return;
    }

    onCreateZone(newZoneName, drawingPoints, newZoneColor);
    setNewZoneName('');
    setNewZoneColor('#3498db');
    onClearDrawing();
    onEditModeChange('view');
  };

  const handleCancelDrawing = () => {
    onClearDrawing();
    onEditModeChange('view');
    setNewZoneName('');
  };

  const handleEditZone = (zone: Zone) => {
    setEditingZone({ ...zone });
    onSelectZone(zone);
  };

  const handleSaveEdit = () => {
    if (editingZone) {
      onUpdateZone(editingZone);
      setEditingZone(null);
      onSelectZone(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingZone(null);
    onSelectZone(null);
  };

  const handleToggleZone = (zone: Zone) => {
    onUpdateZone({ ...zone, enabled: !zone.enabled });
  };

  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Zone Editor
      </Typography>

      <Divider sx={{ my: 2 }} />

      {editMode === 'draw' && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Drawing New Zone
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Click on the map to add points. At least 3 points required.
          </Typography>

          <TextField
            fullWidth
            label="Zone Name"
            value={newZoneName}
            onChange={(e) => setNewZoneName(e.target.value)}
            sx={{ mb: 2 }}
            size="small"
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="body2">Color:</Typography>
            <input
              type="color"
              value={newZoneColor}
              onChange={(e) => setNewZoneColor(e.target.value)}
              style={{ width: 60, height: 30, cursor: 'pointer' }}
            />
          </Box>

          <Typography variant="caption" display="block" sx={{ mb: 1 }}>
            Points: {drawingPoints.length}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSaveDrawing}
              disabled={drawingPoints.length < 3 || !newZoneName.trim()}
              fullWidth
            >
              Save Zone
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<CancelIcon />}
              onClick={handleCancelDrawing}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      )}

      {editMode !== 'draw' && (
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleStartDrawing}
          fullWidth
          sx={{ mb: 3 }}
        >
          Create New Zone
        </Button>
      )}

      {editingZone && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Editing Zone
          </Typography>

          <TextField
            fullWidth
            label="Zone Name"
            value={editingZone.name}
            onChange={(e) => setEditingZone({ ...editingZone, name: e.target.value })}
            sx={{ mb: 2 }}
            size="small"
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="body2">Color:</Typography>
            <input
              type="color"
              value={editingZone.color}
              onChange={(e) => setEditingZone({ ...editingZone, color: e.target.value })}
              style={{ width: 60, height: 30, cursor: 'pointer' }}
            />
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={editingZone.enabled}
                onChange={(e) =>
                  setEditingZone({ ...editingZone, enabled: e.target.checked })
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

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" gutterBottom>
        Zones ({zones.length})
      </Typography>

      <List dense>
        {zones.map((zone) => (
          <ListItem
            key={zone.id}
            disablePadding
            secondaryAction={
              <Box>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => handleEditZone(zone)}
                  disabled={editMode === 'draw'}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => onDeleteZone(zone.id)}
                  disabled={editMode === 'draw'}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            }
          >
            <ListItemButton
              selected={selectedZone?.id === zone.id}
              onClick={() => onSelectZone(zone)}
              disabled={editMode === 'draw'}
            >
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  bgcolor: zone.color,
                  borderRadius: '50%',
                  mr: 2,
                  opacity: zone.enabled ? 1 : 0.3,
                }}
              />
              <ListItemText
                primary={zone.name}
                secondary={`${zone.coordinates.length} points • ${
                  zone.enabled ? 'Enabled' : 'Disabled'
                }`}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {zones.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
          No zones created yet. Click "Create New Zone" to start.
        </Typography>
      )}
    </Paper>
  );
};
