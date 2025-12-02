# Development Guide

This guide will help you set up a development environment and contribute to Hide-n-Seek.

## Development Environment Setup

### Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- Home Assistant development environment
- Git

### Clone the Repository

```bash
git clone https://github.com/BenJaminBMorin/hide-n-seek.git
cd hide-n-seek
```

### Backend Development

#### Install Dependencies

```bash
pip install homeassistant
pip install numpy scipy paho-mqtt
```

#### Development Installation

Link the custom component to your Home Assistant config:

```bash
# From the hide-n-seek directory
ln -s $(pwd)/custom_components/hide_n_seek ~/.homeassistant/custom_components/hide_n_seek
```

#### Running Tests

```bash
# Install pytest
pip install pytest pytest-homeassistant-custom-component

# Run tests
pytest tests/
```

#### Code Quality

We use:
- `black` for code formatting
- `isort` for import sorting
- `pylint` for linting
- `mypy` for type checking

```bash
pip install black isort pylint mypy

# Format code
black custom_components/hide_n_seek/
isort custom_components/hide_n_seek/

# Check code
pylint custom_components/hide_n_seek/
mypy custom_components/hide_n_seek/
```

### Frontend Development

#### Install Dependencies

```bash
cd custom_components/hide_n_seek/frontend
npm install
```

#### Development Server

```bash
npm start
# Opens at http://localhost:8080
```

#### Build for Production

```bash
npm run build
# Output in dist/
```

#### Code Quality

We use:
- TypeScript for type safety
- ESLint for linting
- Prettier for formatting

```bash
npm run lint
npm run format
```

## Project Structure

```
hide-n-seek/
├── custom_components/
│   └── hide_n_seek/
│       ├── __init__.py          # Integration setup
│       ├── config_flow.py       # Configuration UI
│       ├── const.py             # Constants
│       ├── coordinator.py       # Data coordinator
│       ├── device_manager.py    # Device management
│       ├── device_tracker.py    # Device tracker platform
│       ├── manifest.json        # Integration metadata
│       ├── sensor.py            # Sensor platform
│       ├── triangulation.py     # Positioning algorithms
│       ├── websocket_api.py     # WebSocket API
│       ├── zone_manager.py      # Zone management
│       ├── translations/        # Translations
│       │   └── en.json
│       └── frontend/            # React frontend
│           ├── src/
│           ├── package.json
│           ├── tsconfig.json
│           └── webpack.config.js
├── docs/                        # Documentation
├── examples/                    # Example configurations
├── tests/                       # Test files
├── ARCHITECTURE.md              # Architecture documentation
├── LICENSE                      # MIT License
└── README.md                    # Main README
```

## Key Components

### Triangulation Engine (`triangulation.py`)

The triangulation engine is the heart of the positioning system. It implements:

- **RSSI to Distance Conversion**: Uses log-distance path loss model
- **Trilateration**: Calculates position from 3+ distance measurements
- **Kalman Filtering**: Smooths position estimates
- **Sensor Fusion**: Combines RSSI and mmWave data

Key algorithms:
```python
def rssi_to_distance(rssi: float) -> float:
    """Convert RSSI to distance in meters"""
    return 10 ** ((RSSI_REF - rssi) / (10 * PATH_LOSS_EXPONENT))
```

### Zone Manager (`zone_manager.py`)

Manages zones and occupancy detection:

- **Point-in-Polygon**: Ray casting algorithm
- **Zone Storage**: Persistent storage of zones
- **Event Firing**: Zone entry/exit events

### Coordinator (`coordinator.py`)

Orchestrates data flow:

- **Data Updates**: Periodic position calculations
- **Event Management**: Fires events for automations
- **State Management**: Updates Home Assistant entities

### WebSocket API (`websocket_api.py`)

Real-time communication with frontend:

- **Position Subscriptions**: Live position updates
- **Zone Management**: Create/update/delete zones
- **Map Data**: Fetch all sensors, devices, and zones

## Adding New Features

### Adding a New Sensor Type

1. Update `SENSOR_TYPE_*` constants in `const.py`
2. Add discovery logic in `device_manager.py`
3. Update sensor configuration UI
4. Add icon in frontend

### Adding a New Triangulation Method

1. Add method to `TriangulationEngine` class
2. Update `calculate_position()` to use new method
3. Add configuration option
4. Update tests

### Adding Frontend Features

1. Create new component in `frontend/src/components/`
2. Import in `App.tsx`
3. Add necessary state management
4. Update WebSocket API if needed

## Testing

### Backend Tests

```python
# tests/test_triangulation.py
import pytest
from custom_components.hide_n_seek.triangulation import TriangulationEngine, SensorReading

def test_trilateration():
    engine = TriangulationEngine()
    readings = [
        SensorReading("s1", (0, 0), distance=5.0),
        SensorReading("s2", (10, 0), distance=5.0),
        SensorReading("s3", (5, 8.66), distance=5.0),
    ]
    position = engine.trilateration(readings)
    assert position is not None
    assert abs(position.x - 5.0) < 0.1
    assert abs(position.y - 4.33) < 0.1
```

### Frontend Tests

```typescript
// frontend/src/components/MapCanvas.test.tsx
import { render, screen } from '@testing-library/react';
import { MapCanvas } from './MapCanvas';

test('renders map canvas', () => {
  render(<MapCanvas sensors={[]} devices={[]} zones={[]} positions={{}} />);
  const canvas = screen.getByRole('img');
  expect(canvas).toBeInTheDocument();
});
```

## Debugging

### Backend Debugging

Enable debug logging in Home Assistant:

```yaml
# configuration.yaml
logger:
  default: info
  logs:
    custom_components.hide_n_seek: debug
```

View logs:
```bash
tail -f ~/.homeassistant/home-assistant.log | grep hide_n_seek
```

### Frontend Debugging

Open browser DevTools (F12) and check:
- Console for JavaScript errors
- Network tab for WebSocket messages
- React DevTools for component state

## Performance Optimization

### Backend

- Use `asyncio` for concurrent operations
- Cache frequent calculations
- Batch database operations
- Optimize Kalman filter parameters

### Frontend

- Use React.memo for expensive components
- Debounce position updates
- Implement virtual scrolling for large lists
- Optimize canvas rendering (only redraw when needed)

## Contributing

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Message Format

Follow conventional commits:

```
feat: Add new sensor type support
fix: Correct triangulation calculation
docs: Update setup guide
style: Format code with black
refactor: Simplify zone detection logic
test: Add tests for RSSI conversion
```

### Code Review Guidelines

- All tests must pass
- Code must be formatted with black/prettier
- Add tests for new features
- Update documentation
- Follow existing code style

## Release Process

1. Update version in `manifest.json`
2. Update `CHANGELOG.md`
3. Create git tag (`git tag v0.2.0`)
4. Push tag (`git push origin v0.2.0`)
5. GitHub Actions will create release

## Resources

- [Home Assistant Developer Docs](https://developers.home-assistant.io/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Indoor Positioning Algorithms](https://en.wikipedia.org/wiki/Indoor_positioning_system)

## Getting Help

- GitHub Issues: Report bugs and request features
- GitHub Discussions: Ask questions and share ideas
- Home Assistant Community: General Home Assistant questions

## License

MIT License - see LICENSE file for details
