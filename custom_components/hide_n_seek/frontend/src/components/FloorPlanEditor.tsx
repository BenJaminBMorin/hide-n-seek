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
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { FloorPlan, Room, Point, Wall } from '../types';

interface FloorPlanEditorProps {
  floorPlan: FloorPlan;
  onUpdateDimensions: (width: number, height: number) => Promise<void>;
  onCreateRoom: (name: string, coordinates: Point[], color: string) => Promise<void>;
  onUpdateRoom: (roomId: string, name: string, coordinates: Point[], color: string) => Promise<void>;
  onDeleteRoom: (roomId: string) => Promise<void>;
  onCreateWall: (start: Point, end: Point, thickness: number, color: string, type: string) => Promise<void>;
  onUpdateWall: (wallId: string, wall: Partial<Wall>) => Promise<void>;
  onDeleteWall: (wallId: string) => Promise<void>;
  onEditModeChange: (mode: 'view' | 'draw' | 'edit' | 'draw_room' | 'draw_wall' | 'edit_wall') => void;
  editMode: 'view' | 'draw' | 'edit' | 'draw_room' | 'draw_wall' | 'edit_wall';
  drawingPoints: Point[];
  onClearDrawing: () => void;
}

export const FloorPlanEditor: React.FC<FloorPlanEditorProps> = ({
  floorPlan,
  onUpdateDimensions,
  onCreateRoom,
  onUpdateRoom,
  onDeleteRoom,
  onCreateWall,
  onUpdateWall,
  onDeleteWall,
  onEditModeChange,
  editMode,
  drawingPoints,
  onClearDrawing,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomColor, setNewRoomColor] = useState('#E0E0E0');
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Wall drawing state
  const [newWallThickness, setNewWallThickness] = useState(0.2);
  const [newWallColor, setNewWallColor] = useState('#333333');
  const [newWallType, setNewWallType] = useState<'standard' | 'load_bearing' | 'glass' | 'partition'>('standard');
  const [editingWall, setEditingWall] = useState<Wall | null>(null);

  // Dimensions editing
  const [dimensions, setDimensions] = useState({
    width: floorPlan.dimensions.width,
    height: floorPlan.dimensions.height,
  });

  const handleStartDrawingRoom = () => {
    onEditModeChange('draw_room');
    onClearDrawing();
    setNewRoomName('');
    setNewRoomColor('#E0E0E0');
  };

  const handleSaveRoom = async () => {
    if (drawingPoints.length < 3) {
      alert('A room must have at least 3 points');
      return;
    }

    if (!newRoomName.trim()) {
      alert('Please enter a room name');
      return;
    }

    try {
      await onCreateRoom(newRoomName, drawingPoints, newRoomColor);
      setNewRoomName('');
      setNewRoomColor('#E0E0E0');
      onClearDrawing();
      onEditModeChange('view');
    } catch (err: any) {
      alert(`Failed to create room: ${err.message}`);
    }
  };

  const handleCancelDrawing = () => {
    onClearDrawing();
    onEditModeChange('view');
    setNewRoomName('');
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom({ ...room });
  };

  const handleSaveEdit = async () => {
    if (!editingRoom) return;

    try {
      await onUpdateRoom(
        editingRoom.id,
        editingRoom.name,
        editingRoom.coordinates.map((c) => ({ x: c[0], y: c[1] })),
        editingRoom.color
      );
      setEditingRoom(null);
    } catch (err: any) {
      alert(`Failed to update room: ${err.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingRoom(null);
  };

  const handleDeleteRoom = async (roomId: string) => {
    const room = floorPlan.rooms.find((r) => r.id === roomId);
    if (!room) return;

    if (!window.confirm(`Are you sure you want to delete room "${room.name}"?`)) {
      return;
    }

    try {
      await onDeleteRoom(roomId);
    } catch (err: any) {
      alert(`Failed to delete room: ${err.message}`);
    }
  };

  const handleUpdateDimensions = async () => {
    if (dimensions.width <= 0 || dimensions.height <= 0) {
      alert('Dimensions must be positive numbers');
      return;
    }

    try {
      await onUpdateDimensions(dimensions.width, dimensions.height);
    } catch (err: any) {
      alert(`Failed to update dimensions: ${err.message}`);
    }
  };

  // Wall handlers
  const handleStartDrawingWall = () => {
    onEditModeChange('draw_wall');
    onClearDrawing();
    setNewWallThickness(0.2);
    setNewWallColor('#333333');
    setNewWallType('standard');
  };

  const handleSaveWall = async () => {
    if (drawingPoints.length !== 2) {
      alert('Click two points to draw a wall');
      return;
    }

    try {
      await onCreateWall(
        drawingPoints[0],
        drawingPoints[1],
        newWallThickness,
        newWallColor,
        newWallType
      );
      onClearDrawing();
      onEditModeChange('view');
    } catch (err: any) {
      alert(`Failed to create wall: ${err.message}`);
    }
  };

  const handleCancelWallDrawing = () => {
    onClearDrawing();
    onEditModeChange('view');
  };

  const handleEditWall = (wall: Wall) => {
    setEditingWall({ ...wall });
  };

  const handleSaveWallEdit = async () => {
    if (!editingWall) return;

    try {
      await onUpdateWall(editingWall.id, {
        start: editingWall.start,
        end: editingWall.end,
        thickness: editingWall.thickness,
        color: editingWall.color,
        type: editingWall.type,
      });
      setEditingWall(null);
    } catch (err: any) {
      alert(`Failed to update wall: ${err.message}`);
    }
  };

  const handleCancelWallEdit = () => {
    setEditingWall(null);
  };

  const handleDeleteWall = async (wallId: string) => {
    if (!window.confirm('Are you sure you want to delete this wall?')) {
      return;
    }

    try {
      await onDeleteWall(wallId);
    } catch (err: any) {
      alert(`Failed to delete wall: ${err.message}`);
    }
  };

  const calculateWallLength = (wall: Wall): number => {
    const dx = wall.end[0] - wall.start[0];
    const dy = wall.end[1] - wall.start[1];
    return Math.sqrt(dx * dx + dy * dy);
  };

  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Floor Plan Editor
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
        <Tab label="Rooms" />
        <Tab label="Walls" />
        <Tab label="Settings" />
      </Tabs>

      {tabValue === 0 && (
        <Box>
          {editMode === 'draw_room' && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Drawing New Room
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Click on the map to add points. At least 3 points required.
              </Typography>

              <TextField
                fullWidth
                label="Room Name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                sx={{ mb: 2 }}
                size="small"
              />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="body2">Color:</Typography>
                <input
                  type="color"
                  value={newRoomColor}
                  onChange={(e) => setNewRoomColor(e.target.value)}
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
                  onClick={handleSaveRoom}
                  disabled={drawingPoints.length < 3 || !newRoomName.trim()}
                  fullWidth
                >
                  Save Room
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

          {editMode !== 'draw_room' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleStartDrawingRoom}
              fullWidth
              sx={{ mb: 3 }}
            >
              Draw New Room
            </Button>
          )}

          {editingRoom && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Editing Room
              </Typography>

              <TextField
                fullWidth
                label="Room Name"
                value={editingRoom.name}
                onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                sx={{ mb: 2 }}
                size="small"
              />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="body2">Color:</Typography>
                <input
                  type="color"
                  value={editingRoom.color}
                  onChange={(e) => setEditingRoom({ ...editingRoom, color: e.target.value })}
                  style={{ width: 60, height: 30, cursor: 'pointer' }}
                />
              </Box>

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
            Rooms ({floorPlan.rooms.length})
          </Typography>

          <List dense>
            {floorPlan.rooms.map((room) => (
              <ListItem
                key={room.id}
                disablePadding
                secondaryAction={
                  <Box>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleEditRoom(room)}
                      disabled={editMode === 'draw_room'}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleDeleteRoom(room.id)}
                      disabled={editMode === 'draw_room'}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemButton disabled={editMode === 'draw_room'}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      bgcolor: room.color,
                      borderRadius: '4px',
                      mr: 2,
                      border: '1px solid #ccc',
                    }}
                  />
                  <ListItemText
                    primary={room.name}
                    secondary={`${room.coordinates.length} points`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          {floorPlan.rooms.length === 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2, textAlign: 'center' }}
            >
              No rooms created yet. Click "Draw New Room" to start.
            </Typography>
          )}
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          {editMode === 'draw_wall' && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Drawing New Wall
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Click two points on the map to define the wall.
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  label="Thickness (m)"
                  type="number"
                  value={newWallThickness}
                  onChange={(e) => setNewWallThickness(parseFloat(e.target.value) || 0.2)}
                  size="small"
                  inputProps={{ min: 0.05, max: 1, step: 0.05 }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">Color:</Typography>
                  <input
                    type="color"
                    value={newWallColor}
                    onChange={(e) => setNewWallColor(e.target.value)}
                    style={{ width: 60, height: 30, cursor: 'pointer' }}
                  />
                </Box>
              </Box>

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Wall Type</InputLabel>
                <Select
                  value={newWallType}
                  onChange={(e) => setNewWallType(e.target.value as any)}
                  label="Wall Type"
                >
                  <MenuItem value="standard">Standard</MenuItem>
                  <MenuItem value="load_bearing">Load Bearing</MenuItem>
                  <MenuItem value="glass">Glass</MenuItem>
                  <MenuItem value="partition">Partition</MenuItem>
                </Select>
              </FormControl>

              <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                Points: {drawingPoints.length} / 2
              </Typography>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveWall}
                  disabled={drawingPoints.length !== 2}
                  fullWidth
                >
                  Save Wall
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<CancelIcon />}
                  onClick={handleCancelWallDrawing}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          )}

          {editMode !== 'draw_wall' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleStartDrawingWall}
              fullWidth
              sx={{ mb: 3 }}
            >
              Draw New Wall
            </Button>
          )}

          {editingWall && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Editing Wall
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  label="Thickness (m)"
                  type="number"
                  value={editingWall.thickness}
                  onChange={(e) =>
                    setEditingWall({ ...editingWall, thickness: parseFloat(e.target.value) || 0.2 })
                  }
                  size="small"
                  inputProps={{ min: 0.05, max: 1, step: 0.05 }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">Color:</Typography>
                  <input
                    type="color"
                    value={editingWall.color || '#333333'}
                    onChange={(e) => setEditingWall({ ...editingWall, color: e.target.value })}
                    style={{ width: 60, height: 30, cursor: 'pointer' }}
                  />
                </Box>
              </Box>

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Wall Type</InputLabel>
                <Select
                  value={editingWall.type || 'standard'}
                  onChange={(e) => setEditingWall({ ...editingWall, type: e.target.value as any })}
                  label="Wall Type"
                >
                  <MenuItem value="standard">Standard</MenuItem>
                  <MenuItem value="load_bearing">Load Bearing</MenuItem>
                  <MenuItem value="glass">Glass</MenuItem>
                  <MenuItem value="partition">Partition</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveWallEdit}
                  fullWidth
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<CancelIcon />}
                  onClick={handleCancelWallEdit}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>
            Walls ({floorPlan.walls.length})
          </Typography>

          <List dense>
            {floorPlan.walls.map((wall) => (
              <ListItem
                key={wall.id}
                disablePadding
                secondaryAction={
                  <Box>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleEditWall(wall)}
                      disabled={editMode === 'draw_wall'}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleDeleteWall(wall.id)}
                      disabled={editMode === 'draw_wall'}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemButton disabled={editMode === 'draw_wall'}>
                  <Box
                    sx={{
                      width: 40,
                      height: 10,
                      bgcolor: wall.color || '#333',
                      borderRadius: '2px',
                      mr: 2,
                      border: '1px solid #ccc',
                    }}
                  />
                  <ListItemText
                    primary={`${wall.type || 'standard'} wall`}
                    secondary={`${calculateWallLength(wall).toFixed(2)}m • ${wall.thickness}m thick`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          {floorPlan.walls.length === 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2, textAlign: 'center' }}
            >
              No walls created yet. Click "Draw New Wall" to start.
            </Typography>
          )}
        </Box>
      )}

      {tabValue === 2 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Floor Plan Dimensions
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="Width (meters)"
              type="number"
              value={dimensions.width}
              onChange={(e) =>
                setDimensions({ ...dimensions, width: parseFloat(e.target.value) || 0 })
              }
              size="small"
              fullWidth
            />
            <TextField
              label="Height (meters)"
              type="number"
              value={dimensions.height}
              onChange={(e) =>
                setDimensions({ ...dimensions, height: parseFloat(e.target.value) || 0 })
              }
              size="small"
              fullWidth
            />
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={handleUpdateDimensions}
            fullWidth
          >
            Update Dimensions
          </Button>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" gutterBottom>
            Statistics
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Total Rooms: {floorPlan.rooms.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Walls: {floorPlan.walls.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Area: {floorPlan.dimensions.width} × {floorPlan.dimensions.height} ={' '}
              {(floorPlan.dimensions.width * floorPlan.dimensions.height).toFixed(1)} m²
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
};
