# Developer API Reference - Trail Routing System

**For Developers Integrating or Extending the Trail Navigation System**

---

## Module: trailRouting.js

### Import the Library

```javascript
import {
  TrailGraph,
  calculateBearing,
  formatDistance,
  estimateWalkingTime
} from './trailRouting';
```

---

## Class: TrailGraph

### Constructor

```javascript
const graph = new TrailGraph(geojsonTrailsObject);

// Example with karura-trails.geojson
const response = await fetch('/karura-trails.geojson');
const trails = await response.json();
const graph = new TrailGraph(trails);
```

**Parameters:**
- `geojsonTrailsObject` (GeoJSON FeatureCollection)
  - Must have `.features` array
  - Each feature needs `.geometry.coordinates` (LineString)
  - Optional: `.properties.name` for trail names

**Returns:** TrailGraph instance ready for queries

### Method: buildGraph()

Called automatically in constructor. Builds the graph data structure.

**What it does:**
- Parses coordinates from each trail
- Creates nodes at endpoints
- Links segments between consecutive points
- Stores connectivity metadata

**Example (typically automatic):**
```javascript
const graph = new TrailGraph(trails);
// buildGraph() already called
console.log('Nodes:', graph.nodes.size);      // ~100
console.log('Segments:', graph.segments.length); // ~150
```

---

## Method: snapToTrail()

**Snap GPS coordinates to nearest point on trail network**

```javascript
const snapped = graph.snapToTrail(
  latitude,      // User GPS latitude
  longitude,     // User GPS longitude
  maxDistance    // Optional: max snap distance (default: 50m)
);
```

**Returns:**
```javascript
{
  latitude: 36.8065,
  longitude: -1.3045,
  distance: 12.5,                    // Distance from GPS to trail (meters)
  segment: {                         // The trail segment snapped to
    id: 42,
    startNode: 15,
    endNode: 16,
    startCoord: [36.8065, -1.3045],
    endCoord: [36.8075, -1.3050],
    distance: 58.3,                  // Segment length (meters)
    trail: "River Valley Walk"        // Trail name
  }
}
```

**Example:**
```javascript
const userGPS = { lat: 36.8068, lng: -1.3048 };

const snapped = graph.snapToTrail(
  userGPS.lat,
  userGPS.lng,
  50  // Within 50m of trail
);

if (snapped) {
  console.log(`Snapped to ${snapped.segment.trail}`);
  console.log(`Distance: ${snapped.distance.toFixed(1)}m`);
  
  // Update map marker
  updateUserMarker(snapped.latitude, snapped.longitude);
} else {
  console.log('User more than 50m from any trail');
}
```

**When to use:**
- Every GPS update (~1 second)
- To find nearest trail point
- For off-track detection

---

## Method: findPath()

**Calculate shortest route along trails from start to destination**

```javascript
const pathInfo = graph.findPath(
  startLat,      // Starting latitude
  startLng,      // Starting longitude
  endLat,        // Destination latitude
  endLng,        // Destination longitude
  maxSnapDist    // Optional: max snap distance (default: 50m)
);
```

**Returns:**
```javascript
{
  waypoints: [
    {
      type: 'snap',
      latitude: 36.8065,
      longitude: -1.3045,
      segment: {...},
      distanceFromStart: 0
    },
    {
      type: 'junction',
      nodeId: 15,
      latitude: 36.8070,
      longitude: -1.3050,
      segment: {...},
      distanceFromStart: 58.3
    },
    {
      type: 'junction',
      nodeId: 20,
      latitude: 36.8085,
      longitude: -1.3060,
      segment: {...},
      distanceFromStart: 145.8
    },
    {
      type: 'destination',
      latitude: 36.8095,
      longitude: -1.3065,
      distanceFromStart: 203.5
    }
  ],
  totalDistance: 203.5,              // Total distance (meters)
  startSnap: {...},                  // Start point snapped to trail
  endSnap: {...},                    // End point snapped to trail
  segments: [                        // Nodes along path
    { nodeId: 15, node: {...} },
    { nodeId: 20, node: {...} },
    { nodeId: 25, node: {...} }
  ]
}
```

**Example:**
```javascript
// User at (36.8068, -1.3048) wants to go to marker at (36.8095, -1.3065)
const path = graph.findPath(36.8068, -1.3048, 36.8095, -1.3065, 50);

if (path) {
  console.log(`Total distance: ${(path.totalDistance / 1000).toFixed(2)}km`);
  console.log(`Waypoints: ${path.waypoints.length}`);
  console.log(`Time estimate: ${estimateWalkingTime(path.totalDistance)}`);
  
  // Display route on map
  const coords = graph.getPathCoordinates(path);
  drawPolyline(coords, { color: 'green' });
  
  // Find next turn
  const nextJunction = path.waypoints.find(w => w.type === 'junction');
  if (nextJunction) {
    drawArrow(nextJunction.latitude, nextJunction.longitude);
  }
} else {
  alert('No path found. Ensure both points are near trails.');
}
```

**Error Cases:**
```javascript
const path = graph.findPath(lat1, lng1, lat2, lng2);

if (!path) {
  // Returned null - check:
  // 1. Are both points within 50m of trail?
  // 2. Is there a connected trail between them?
  // 3. Are coordinates in the right order (lat, lng)?
}
```

**Performance:**
- Typical: 20-50ms
- Worst case: <200ms (on large networks)
- Scales: O(E log V) where E=edges, V=nodes

---

## Method: aStarSearch()

**Low-level A* pathfinding (usually not called directly)**

```javascript
const path = graph.aStarSearch(startNodeId, endNodeId);
// Returns: [node1, node2, node3, ...] or null
```

**Example (advanced):**
```javascript
// Find nearest nodes to user and destination
const userNode = graph.findNearestNode(userLat, userLng);
const destNode = graph.findNearestNode(destLat, destLng);

if (userNode !== null && destNode !== null) {
  const nodePath = graph.aStarSearch(userNode, destNode);
  console.log(`Path through ${nodePath.length} nodes`);
}
```

---

## Method: projectPointOntoSegment()

**Project a point onto a line segment (perpendicular projection)**

```javascript
const projectedPoint = graph.projectPointOntoSegment(
  point,         // GeoJSON point
  segmentStart,  // [lng, lat]
  segmentEnd     // [lng, lat]
);

// Returns: GeoJSON point at closest location on segment
```

**Example:**
```javascript
const userPoint = turf.point([-1.3048, 36.8068]);
const segStart = [36.8065, -1.3045];
const segEnd = [36.8075, -1.3050];

const projected = graph.projectPointOntoSegment(userPoint, segStart, segEnd);
console.log(projected); // Point along segment closest to user

// Calculate distance
const distance = turf.distance(userPoint, projected, { units: 'meters' });
console.log(`Distance: ${distance}m`);
```

---

## Method: getPathCoordinates()

**Extract all coordinates from path for rendering**

```javascript
const coords = graph.getPathCoordinates(pathInfo);
// Returns: [[lat, lng], [lat, lng], ...]
```

**Example:**
```javascript
const path = graph.findPath(startLat, startLng, endLat, endLng);
const coords = graph.getPathCoordinates(path);

// Draw on Leaflet map
L.polyline(coords, {
  color: '#10b981',
  weight: 4,
  opacity: 0.8
}).addTo(map);
```

---

## Method: getNextJunction()

**Find next junction point along path**

```javascript
const junction = graph.getNextJunction(currentWaypoint, pathInfo);
// Returns: junction waypoint or null
```

**Example:**
```javascript
const path = graph.findPath(startLat, startLng, endLat, endLng);
const nextTurn = graph.getNextJunction(path.waypoints[0], path);

if (nextTurn) {
  const bearing = calculateBearing(
    userLat, userLng,
    nextTurn.latitude, nextTurn.longitude
  );
  rotateArrow(bearing);
  updateDistance(nextTurn.distanceFromStart);
}
```

---

## Method: findNearestNode()

**Find closest node to a coordinate**

```javascript
const nodeId = graph.findNearestNode(
  latitude,      // User GPS latitude
  longitude,     // User GPS longitude
  maxDistance    // Optional: max search distance (default: 100m)
);
// Returns: nodeId (number) or null
```

**Example:**
```javascript
const userNode = graph.findNearestNode(36.8068, -1.3048, 100);

if (userNode !== null) {
  const node = graph.nodes.get(userNode);
  console.log(`Nearest node: ${node.latitude}, ${node.longitude}`);
}
```

---

## Method: isOffTrack()

**Check if user has wandered off trail**

```javascript
const offTrack = graph.isOffTrack(
  userLat,       // User GPS latitude
  userLng,       // User GPS longitude
  segment,       // Trail segment object
  threshold      // Optional: distance threshold in meters (default: 30)
);
// Returns: boolean
```

**Example:**
```javascript
const snapped = graph.snapToTrail(userLat, userLng);

if (snapped && snapped.segment) {
  const offTrack = graph.isOffTrack(
    userLat, userLng,
    snapped.segment,
    30  // 30 meter threshold
  );
  
  if (offTrack) {
    showWarning('⚠️ You are 30+ meters from trail!');
  } else {
    hideWarning();
  }
}
```

---

## Helper Functions

### calculateBearing()

**Calculate compass direction from point A to point B**

```javascript
const bearing = calculateBearing(
  fromLat,      // Starting latitude
  fromLng,      // Starting longitude
  toLat,        // Destination latitude
  toLng         // Destination longitude
);
// Returns: 0-360 degrees (0=North, 90=East, 180=South, 270=West)
```

**Example:**
```javascript
const bearing = calculateBearing(
  36.8068, -1.3048,  // Current position
  36.8095, -1.3065   // Next junction
);

console.log(`Direction: ${bearing.toFixed(1)}°`);

// Rotate arrow to face that direction
const arrow = document.querySelector('.direction-arrow');
arrow.style.transform = `rotate(${bearing}deg)`;

// Also works with Leaflet marker icons
const icon = L.divIcon({
  html: `<div style="transform: rotate(${bearing}deg)">➔</div>`
});
```

---

### formatDistance()

**Convert meters to human-readable distance**

```javascript
const formatted = formatDistance(meters);
// Returns: string like "250m" or "1.25km"
```

**Example:**
```javascript
console.log(formatDistance(250));    // "250m"
console.log(formatDistance(1250));   // "1.25km"
console.log(formatDistance(750));    // "750m"
```

---

### estimateWalkingTime()

**Estimate walking time for distance (1.4 m/s = 5 km/h)**

```javascript
const timeStr = estimateWalkingTime(meters);
// Returns: string like "3m 42s" or "1h 15m"
```

**Example:**
```javascript
console.log(estimateWalkingTime(250));    // "3m 0s"
console.log(estimateWalkingTime(7000));   // "1h 39m"
console.log(estimateWalkingTime(30));     // "21s"
```

---

## Complete Usage Example

```javascript
// 1. Initialize graph
const response = await fetch('/karura-trails.geojson');
const trails = await response.json();
const graph = new TrailGraph(trails);

// 2. On journey start
const userGPS = { lat: 36.8068, lng: -1.3048 };
const destination = { lat: 36.8095, lng: -1.3065 };

const pathInfo = graph.findPath(
  userGPS.lat, userGPS.lng,
  destination.lat, destination.lng,
  50
);

if (pathInfo) {
  // 3. Display path
  const coords = graph.getPathCoordinates(pathInfo);
  L.polyline(coords, { color: '#10b981', weight: 4 }).addTo(map);
  
  // 4. Auto-zoom
  const bounds = L.latLngBounds(coords.map(c => L.latLng(c[0], c[1])));
  map.fitBounds(bounds, { padding: [50, 50] });
  
  console.log(`Journey distance: ${formatDistance(pathInfo.totalDistance)}`);
  console.log(`Est. time: ${estimateWalkingTime(pathInfo.totalDistance)}`);
}

// 5. During journey (every GPS update)
setInterval(() => {
  // Get current position (from browser geolocation)
  const currentGPS = { lat: 36.8070, lng: -1.3050 };
  
  // Snap to trail
  const snapped = graph.snapToTrail(currentGPS.lat, currentGPS.lng);
  if (snapped) {
    // Update marker position
    updateUserMarker(snapped.latitude, snapped.longitude);
    
    // Recalculate distance
    const updatedPath = graph.findPath(
      snapped.latitude, snapped.longitude,
      destination.lat, destination.lng,
      50
    );
    
    if (updatedPath) {
      updateHUD({
        distance: formatDistance(updatedPath.totalDistance),
        time: estimateWalkingTime(updatedPath.totalDistance)
      });
      
      // Check off-track
      if (snapped.segment) {
        const offTrack = graph.isOffTrack(
          currentGPS.lat, currentGPS.lng,
          snapped.segment, 30
        );
        
        if (offTrack) {
          showOffTrackWarning();
        } else {
          hideOffTrackWarning();
        }
      }
      
      // Update direction arrow
      const nextJunction = pathInfo.waypoints.find(w => w.type === 'junction');
      if (nextJunction) {
        const bearing = calculateBearing(
          currentGPS.lat, currentGPS.lng,
          nextJunction.latitude, nextJunction.longitude
        );
        rotateDirectionArrow(bearing);
      }
    }
  }
}, 1000);  // Update every second
```

---

## Performance Optimization Tips

### 1. Cache the Graph
```javascript
// Don't rebuild for every request
const graph = new TrailGraph(trails);  // Build once
window.trailGraph = graph;              // Store globally

// Later:
const path = window.trailGraph.findPath(...);
```

### 2. Throttle GPS Updates
```javascript
// Only process every Nth update
let updateCount = 0;
watchPosition((position) => {
  if (++updateCount % 5 === 0) {  // Process every 5th update
    const snapped = graph.snapToTrail(...);
    // Update HUD
  }
});
```

### 3. Batch Map Updates
```javascript
// Instead of updating markers one-by-one
// Collect all updates and render once
const updates = {
  userMarker: ...,
  pathPolyline: ...,
  arrowMarker: ...
};

// Apply all at once
Object.entries(updates).forEach(([id, data]) => {
  updateMapElement(id, data);
});
```

### 4. Profile Performance
```javascript
// Measure A* search time
console.time('findPath');
const path = graph.findPath(lat1, lng1, lat2, lng2);
console.timeEnd('findPath');  // Shows: findPath: 45.2ms

// Measure snap time
console.time('snap');
const snapped = graph.snapToTrail(lat, lng);
console.timeEnd('snap');  // Shows: snap: 12.1ms
```

---

## Integration with React (Example)

```jsx
import { TrailGraph, calculateBearing, estimateWalkingTime } from './trailRouting';

const MapComponent = () => {
  const graphRef = useRef(null);
  const [path, setPath] = useState(null);
  
  // Load graph once
  useEffect(() => {
    const loadGraph = async () => {
      const res = await fetch('/karura-trails.geojson');
      const trails = await res.json();
      graphRef.current = new TrailGraph(trails);
    };
    loadGraph();
  }, []);
  
  // Calculate path on journey start
  const handleStartJourney = () => {
    if (!graphRef.current) return;
    
    const pathInfo = graphRef.current.findPath(
      userLocation.lat,
      userLocation.lng,
      destination.lat,
      destination.lng,
      50
    );
    
    setPath(pathInfo);
  };
  
  // Update on GPS change
  useEffect(() => {
    if (!graphRef.current || !path) return;
    
    const snapped = graphRef.current.snapToTrail(
      userLocation.lat,
      userLocation.lng,
      50
    );
    
    // Update UI...
  }, [userLocation]);
  
  return <div>{/* Map rendering */}</div>;
};
```

---

## Debugging Tips

### Log Node Information
```javascript
console.log('Total nodes:', graph.nodes.size);
console.log('Total segments:', graph.segments.length);

// List first 5 nodes
Array.from(graph.nodes.entries()).slice(0, 5).forEach(([id, node]) => {
  console.log(`Node ${id}: (${node.latitude}, ${node.longitude})`);
});
```

### Check Path Quality
```javascript
const path = graph.findPath(lat1, lng1, lat2, lng2);
if (path) {
  console.log(`Distance: ${path.totalDistance}m`);
  console.log(`Waypoints: ${path.waypoints.length}`);
  console.log(`Segments: ${path.segments.length}`);
  
  // Check connectivity
  path.waypoints.forEach((wp, i) => {
    console.log(`${i}: ${wp.type} - ${wp.distanceFromStart.toFixed(0)}m`);
  });
}
```

### Verify GPS Snapping
```javascript
const snapped = graph.snapToTrail(lat, lng);
if (snapped) {
  console.log(`GPS: (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
  console.log(`Snapped: (${snapped.latitude.toFixed(6)}, ${snapped.longitude.toFixed(6)})`);
  console.log(`Distance: ${snapped.distance.toFixed(1)}m`);
  console.log(`Trail: ${snapped.segment.trail}`);
} else {
  console.log('GPS more than 50m from any trail');
}
```

---

## API Reference Summary

| Function | Input | Output | Use Case |
|----------|-------|--------|----------|
| `TrailGraph()` | GeoJSON | Graph instance | Initialize system |
| `snapToTrail()` | (lat, lng, dist) | Snapped position | Find GPS location on trail |
| `findPath()` | (lat1, lng1, lat2, lng2) | Path with waypoints | Calculate full route |
| `aStarSearch()` | (nodeId, nodeId) | Node path array | Low-level pathfinding |
| `projectPointOntoSegment()` | (point, seg1, seg2) | Projected point | Perpendicular distance |
| `getPathCoordinates()` | pathInfo | [[lat,lng]...] | Render polyline |
| `getNextJunction()` | (wp, path) | Junction waypoint | Get next turn |
| `findNearestNode()` | (lat, lng, dist) | nodeId | Find closest node |
| `isOffTrack()` | (lat, lng, seg, dist) | boolean | Detect deviation |
| `calculateBearing()` | (lat1, lng1, lat2, lng2) | 0-360° | Rotate arrow |
| `formatDistance()` | meters | "250m" or "1.25km" | Display distance |
| `estimateWalkingTime()` | meters | "3m 42s" | Estimate time |

---

**API Version**: 2.0  
**Last Updated**: January 20, 2026  
**Status**: Stable & Production Ready
