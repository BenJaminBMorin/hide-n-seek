import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Slider,
  IconButton,
  Typography,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  SkipPrevious as SkipPreviousIcon,
  SkipNext as SkipNextIcon,
  Timeline as TimelineIcon,
  ShowChart as TrailIcon,
  Whatshot as HeatMapIcon,
} from '@mui/icons-material';

interface TimeSliderProps {
  minTime: number;
  maxTime: number;
  currentTime: number;
  onTimeChange: (time: number) => void;
  playing: boolean;
  onPlayPause: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  visualizationModes: string[];
  onVisualizationModeChange: (modes: string[]) => void;
}

export const TimeSlider: React.FC<TimeSliderProps> = ({
  minTime,
  maxTime,
  currentTime,
  onTimeChange,
  playing,
  onPlayPause,
  playbackSpeed,
  onSpeedChange,
  visualizationModes,
  onVisualizationModeChange,
}) => {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | 'custom'>('24h');
  const playbackRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    if (playing) {
      const animate = () => {
        const now = Date.now();
        const deltaMs = now - lastUpdateRef.current;
        lastUpdateRef.current = now;

        // Calculate time increment based on playback speed
        // playbackSpeed is multiplier (1x, 2x, 5x, 10x)
        const timeIncrement = (deltaMs / 1000) * playbackSpeed;

        const newTime = currentTime + timeIncrement;
        if (newTime >= maxTime) {
          onTimeChange(minTime); // Loop back
        } else {
          onTimeChange(newTime);
        }

        playbackRef.current = requestAnimationFrame(animate);
      };

      lastUpdateRef.current = Date.now();
      playbackRef.current = requestAnimationFrame(animate);

      return () => {
        if (playbackRef.current !== null) {
          cancelAnimationFrame(playbackRef.current);
        }
      };
    }
  }, [playing, currentTime, minTime, maxTime, playbackSpeed, onTimeChange]);

  const handleTimeRangeChange = (range: '1h' | '6h' | '24h' | '7d' | 'custom') => {
    setTimeRange(range);
    const now = Date.now() / 1000;
    let start = now;

    switch (range) {
      case '1h':
        start = now - 3600;
        break;
      case '6h':
        start = now - 6 * 3600;
        break;
      case '24h':
        start = now - 24 * 3600;
        break;
      case '7d':
        start = now - 7 * 24 * 3600;
        break;
    }

    onTimeChange(start);
  };

  const handleSkipBackward = () => {
    const skipAmount = 60; // 1 minute
    onTimeChange(Math.max(minTime, currentTime - skipAmount));
  };

  const handleSkipForward = () => {
    const skipAmount = 60; // 1 minute
    onTimeChange(Math.min(maxTime, currentTime + skipAmount));
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimelineIcon fontSize="small" />
          Timeline
        </Typography>

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <Select
            value={timeRange}
            onChange={(e) => handleTimeRangeChange(e.target.value as any)}
          >
            <MenuItem value="1h">Last Hour</MenuItem>
            <MenuItem value="6h">Last 6 Hours</MenuItem>
            <MenuItem value="24h">Last 24 Hours</MenuItem>
            <MenuItem value="7d">Last 7 Days</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ flexGrow: 1 }} />

        <ToggleButtonGroup
          size="small"
          value={visualizationModes}
          onChange={(_, newModes) => {
            if (newModes.length > 0) {
              onVisualizationModeChange(newModes);
            }
          }}
        >
          <ToggleButton value="live" aria-label="live positions">
            <Typography variant="caption">Live</Typography>
          </ToggleButton>
          <ToggleButton value="trails" aria-label="movement trails">
            <TrailIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton value="heatmap" aria-label="heat map">
            <HeatMapIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton size="small" onClick={handleSkipBackward}>
          <SkipPreviousIcon />
        </IconButton>

        <IconButton onClick={onPlayPause} color="primary">
          {playing ? <PauseIcon /> : <PlayIcon />}
        </IconButton>

        <IconButton size="small" onClick={handleSkipForward}>
          <SkipNextIcon />
        </IconButton>

        <Box sx={{ flexGrow: 1, mx: 2 }}>
          <Slider
            value={currentTime}
            min={minTime}
            max={maxTime}
            onChange={(_, value) => onTimeChange(value as number)}
            valueLabelDisplay="auto"
            valueLabelFormat={formatTime}
            sx={{ width: '100%' }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {formatTime(minTime)}
            </Typography>
            <Chip
              label={formatTime(currentTime)}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Typography variant="caption" color="text.secondary">
              {formatTime(maxTime)}
            </Typography>
          </Box>
        </Box>

        <FormControl size="small" sx={{ minWidth: 80 }}>
          <InputLabel>Speed</InputLabel>
          <Select
            value={playbackSpeed}
            onChange={(e) => onSpeedChange(e.target.value as number)}
            label="Speed"
          >
            <MenuItem value={1}>1x</MenuItem>
            <MenuItem value={2}>2x</MenuItem>
            <MenuItem value={5}>5x</MenuItem>
            <MenuItem value={10}>10x</MenuItem>
            <MenuItem value={30}>30x</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Duration: {formatDuration(maxTime - minTime)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          "
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Speed: {playbackSpeed}x
        </Typography>
      </Box>
    </Paper>
  );
};
