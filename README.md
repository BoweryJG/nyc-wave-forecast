# NYC Wave Forecast Visualization

A real-time 3D visualization of ocean wave conditions around New York City surf spots.

![Wave Forecast Demo](https://via.placeholder.com/800x400)

## Features

- **3D Ocean Simulation**: Realistic wave animations with multiple wave layers, foam effects, and particle spray
- **Real-time Wave Data**: Live wave height, period, and direction data for NYC surf spots
- **7-Day Forecast**: Interactive 3D bar chart showing wave conditions for the next week
- **Location Markers**: Animated beacons for Smith Point and The Rockaways (Brick) surf spots
- **Beautiful Graphics**: Dynamic sky, atmospheric fog, and water effects

## Technologies

- **Three.js**: 3D graphics and WebGL rendering
- **Vite**: Fast build tool and development server
- **GSAP**: Smooth animations and transitions
- **Custom Shaders**: GLSL shaders for realistic ocean rendering

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/nyc-wave-forecast.git
cd nyc-wave-forecast

# Install dependencies
npm install

# Start development server
npm run dev
```

## Usage

The visualization will open automatically in your browser at `http://localhost:5173/`

### Controls
- **Mouse**: Click and drag to rotate the camera
- **Scroll**: Zoom in/out
- **Click Markers**: View detailed wave conditions for each location

### Understanding the Forecast Chart
- **Gold Bars**: Excellent surf conditions (5ft+ waves)
- **Green Bars**: Good surf conditions (3-5ft waves)
- **Blue Bars**: Fair surf conditions (under 3ft waves)

## Project Structure

```
nyc-wave-forecast/
├── src/
│   ├── components/
│   │   ├── OceanScene.js      # Ocean rendering and wave animation
│   │   ├── LocationMarkers.js  # Surf spot location beacons
│   │   ├── UIController.js     # User interface elements
│   │   └── ForecastChart.js    # 7-day forecast visualization
│   ├── services/
│   │   └── WaveDataService.js  # Wave data fetching and processing
│   └── main.js                 # Application entry point
├── public/
├── index.html
├── package.json
└── vite.config.js
```

## API Data

The application uses the Stormglass API for ocean data. Wave conditions include:
- Wave height (feet)
- Wave period (seconds)
- Wave direction (degrees)
- Water temperature

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)