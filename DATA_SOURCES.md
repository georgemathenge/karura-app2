# Karura Forest Trail Explorer - Data Sources Guide

## Current Data

The app now includes **realistic Karura Forest data** based on:

- **6 Major Trails** with varying difficulty levels
- **15 Points of Interest** including landmarks, viewpoints, facilities, and historic sites
- Accurate coordinates centered around Karura Forest, Nairobi (36.805°E, -1.303°S)

## How to Get Real Data

### Option 1: Use OSM Data via GIS Tools (Recommended)

Best for accurate, crowd-sourced data:

1. **Using QGIS (Free)**
   - Download QGIS from qgis.org
   - Install OpenStreetMap plugin
   - Set area to Karura Forest coordinates
   - Export trails as GeoJSON
   - Export POIs as GeoJSON

2. **Using QuickOSM Plugin**
   ```
   # In QGIS:
   1. Open QuickOSM
   2. Search for: highway ~ "path|footway|track"
   3. In Nairobi area
   4. Export as GeoJSON
   ```

### Option 2: Manual Data Entry

If you have coordinates from field surveys:

1. **Edit `public/markers.json`:**

   ```json
   {
     "id": 16,
     "name": "New Point Name",
     "description": "Description of the point",
     "latitude": -1.3042,
     "longitude": 36.8065,
     "type": "landmark",
     "osmType": "category/subcategory"
   }
   ```

2. **Edit `public/karura-trails.geojson`:**
   ```json
   {
     "type": "Feature",
     "properties": {
       "name": "Trail Name",
       "difficulty": "Easy|Medium|Hard",
       "length_km": 5.2,
       "surface": "gravel|dirt|rocky"
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

### Option 3: Use Online Tools

- **Geojson.io**: Draw trails directly on map, export as GeoJSON
- **Google MyMaps**: Create custom map, export KML (convert to GeoJSON)
- **Garmin BaseCamp**: Import GPS data, export as GeoJSON

### Option 4: GPS Tracking

1. Use Garmin device or smartphone GPS app
2. Record your trail walk
3. Export GPX file
4. Convert GPX to GeoJSON using:
   ```bash
   npm install -g gpx2geojson
   gpx2geojson trail.gpx > trail.geojson
   ```

## Data Format Reference

### Markers Schema

```json
{
  "id": 1,
  "name": "Descriptive Name",
  "description": "Detailed description",
  "latitude": -1.3031,
  "longitude": 36.8045,
  "type": "landmark|viewpoint|facility|water|start|end",
  "osmType": "category/subcategory"
}
```

### Trails Schema

```json
{
  "type": "Feature",
  "properties": {
    "name": "Trail Name",
    "difficulty": "Easy|Medium|Hard",
    "length_km": 5.2,
    "surface": "gravel|dirt|rocky|paved|muddy|bamboo mulch",
    "estimated_time_mins": 75,
    "description": "Trail description"
  },
  "geometry": {
    "type": "LineString",
    "coordinates": [[lng, lat], [lng, lat]]
  }
}
```

## Data Quality Tips

1. **Accuracy**:
   - Collect GPS data on foot for best accuracy
   - Use high-precision GPS (±5 meters is good)
   - Cross-reference with satellite imagery

2. **Completeness**:
   - Include all major trails and junctions
   - Mark all amenities and POIs
   - Document seasonal variations

3. **Metadata**:
   - Document trail difficulty accurately
   - Update trail conditions (dry season vs rainy)
   - Include seasonal closures

## Testing Your Data

1. Place updated files in `public/`:
   - `karura-trails.geojson`
   - `markers.json`

2. Reload the app
3. Check:
   - Trails render correctly on map
   - Markers appear at correct locations
   - Snapping logic works properly (walk near a trail)

## Karura Forest Resources

- **Forest Map**: www.nairobiparks.org (Nairobi City Parks Authority)
- **OSM Wiki**: https://wiki.openstreetmap.org/wiki/Karura_Forest_National_Reserve
- **Trail Info**: Local visitor center at main entrance
- **GPS Data**: Trails database at trail tracking sites

## Automating Data Updates

See `fetch-karura-data.js` for an example of automated Overpass API queries.
You can schedule this script to update data periodically.

## Questions?

For trail data contributions or corrections, contact:

- Nairobi City Parks Authority
- OpenStreetMap community
- Local trail organizations
