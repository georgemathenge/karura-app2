# 📊 Data Sources Summary

The Karura Trail Explorer supports multiple data sources. Choose based on your needs:

## Available Data Fetchers

### 1. 🏃 Strava API (RECOMMENDED)

**Best for**: Real-world trail data with popularity metrics

**File**: `fetch-strava-data.js`

**Features**:

- Real GPS tracks from athletes
- Elevation data
- Popularity scores (effort counts)
- Activity start points as markers

**Setup**:

```powershell
$env:STRAVA_ACCESS_TOKEN = "your_token"
node fetch-strava-data.js
```

**Pros**:
✅ Most accurate real-world data
✅ Elevation profiles
✅ Community-validated trails
✅ Easy integration

**Cons**:
⚠️ Requires Strava account
⚠️ Coverage depends on local activity
⚠️ Rate limits (600 req/15min)

---

### 2. 🌍 OpenStreetMap Overpass API

**Best for**: Free, open-source trail data

**File**: `fetch-karura-data.js`

**Features**:

- Public trail paths from OSM
- POI from various categories
- Community-maintained data
- No authentication required

**Setup**:

```powershell
node fetch-karura-data.js
```

**Pros**:
✅ Free and open
✅ No authentication needed
✅ Community maintained
✅ Covers all trail types

**Cons**:
⚠️ API can be slow/unreliable
⚠️ Depends on local OSM coverage
⚠️ May have incomplete data

---

### 3. 📍 Manual Data Entry

**Best for**: Custom trails, field surveys

**Files to Edit**:

- `public/karura-trails.geojson` - Add trail paths
- `public/markers.json` - Add POI markers

**Example Trail**:

```json
{
  "type": "Feature",
  "properties": {
    "name": "My Custom Trail",
    "difficulty": "Medium",
    "length_km": 5.2
  },
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [36.8045, -1.3031],
      [36.805, -1.3035]
    ]
  }
}
```

**Pros**:
✅ Complete control
✅ Instant updates
✅ No API limits

**Cons**:
⚠️ Manual work required
⚠️ Need coordinates
⚠️ Time-consuming for many trails

---

### 4. 🗺️ GeoJSON.io (Web Tool)

**Best for**: Quick visual trail mapping

**Steps**:

1. Go to https://geojson.io
2. Draw trails on the map
3. Export as GeoJSON
4. Save to `public/karura-trails.geojson`

**Pros**:
✅ Visual, easy to use
✅ Real-time map preview
✅ No coding required

**Cons**:
⚠️ Manual drawing required
⚠️ Less accurate than GPS

---

### 5. 🚴 GPS Export (Garmin, Fitbit, etc.)

**Best for**: Converting personal GPS tracks

**Process**:

1. Export GPX from your device
2. Convert to GeoJSON:

```bash
npm install -g gpx2geojson
gpx2geojson mytrail.gpx > mytrail.geojson
```

3. Merge with existing data

**Pros**:
✅ High accuracy from actual GPS
✅ Elevation data preserved
✅ Tested trails

**Cons**:
⚠️ Requires exporting data
⚠️ Conversion step needed

---

## Recommended Workflow

### For Best Results:

1. **Start with Strava** (if available in your area)

   ```powershell
   $env:STRAVA_ACCESS_TOKEN = "your_token"
   node fetch-strava-data.js
   ```

2. **Fill gaps with OSM** or manual data
   - Edit `public/markers.json` to add missing POIs
   - Add missing trails to `karura-trails.geojson`

3. **Test on the app**
   - Walk around with the app open
   - Verify snapping and path calculation
   - Add corrections as needed

---

## Comparison Table

| Feature    | Strava     | OSM    | Manual   | GeoJSON.io | GPS Export       |
| ---------- | ---------- | ------ | -------- | ---------- | ---------------- |
| Accuracy   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐       | ⭐⭐⭐⭐⭐       |
| Elevation  | ✅         | ⚠️     | ❌       | ❌         | ✅               |
| Effort     | ✅         | ❌     | ❌       | ❌         | ❌               |
| Setup Time | 5 min      | 1 min  | Varies   | 2 min      | 10 min           |
| Cost       | Free       | Free   | Free     | Free       | Device-dependent |
| Real-time  | ⚠️         | ⚠️     | Manual   | Manual     | Manual           |

---

## Hybrid Approach Example

```javascript
// Combine multiple sources
const stavaTrails = require('./strava-trails.geojson');
const osmTrails = require('./osm-trails.geojson');
const customTrails = require('./custom-trails.geojson');

const allTrails = {
  type: 'FeatureCollection',
  features: [
    ...stravaTrails.features,
    ...osmTrails.features,
    ...customTrails.features,
  ],
};

// Remove duplicates (same coordinates)
const unique = new Map();
allTrails.features.forEach((f) => {
  const key = JSON.stringify(f.geometry.coordinates[0]);
  if (!unique.has(key)) unique.set(key, f);
});

allTrails.features = Array.from(unique.values());
```

---

## Data Format Standards

### All sources must produce GeoJSON FeatureCollection:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Trail Name",
        "difficulty": "Easy|Medium|Hard",
        "length_km": 5.2
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [[lng, lat], [lng, lat]]
      }
    }
  ]
}
```

### Markers must be JSON array:

```json
{
  "markers": [
    {
      "id": 1,
      "name": "Point Name",
      "description": "Details",
      "latitude": -1.303,
      "longitude": 36.805,
      "type": "landmark|viewpoint|facility"
    }
  ]
}
```

---

## Troubleshooting

### "No data found"

- ✅ Try Strava first (most reliable)
- ✅ Check if area has coverage
- ✅ Expand search radius
- ✅ Mix with manual data

### "API rate limited"

- ✅ Wait 15 minutes (Strava)
- ✅ Use Overpass API alternative
- ✅ Manual entry for critical trails

### "Coordinates look wrong"

- ✅ Verify [lng, lat] order (not lat, lng)
- ✅ Check if coordinates are in Karura area
- ✅ Test on geojson.io first

### "Elevation not showing"

- ✅ Only Strava and GPS export have elevation
- ✅ Use Strava for elevation data
- ✅ Or export from Garmin/Fitbit devices

---

## Next Steps

1. **Choose your data source** (Strava recommended)
2. **Set up authentication** if needed
3. **Run the fetcher** script
4. **Reload the app**
5. **Test GPS tracking**
6. **Iterate** - add more trails/markers as needed

See [STRAVA_SETUP.md](./STRAVA_SETUP.md) for Strava details
See [DATA_SOURCES.md](./DATA_SOURCES.md) for manual entry
