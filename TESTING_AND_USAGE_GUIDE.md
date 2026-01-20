# Karura Forest Trail Navigation - Testing & Usage Guide

## Quick Start

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari)
- GPS-enabled device (mobile or computer with location services)
- Location permission granted to browser

### Starting the App
```bash
npm run dev
# Open http://localhost:5175 in browser
```

## Usage Workflow

### Phase 1: Plan Your Route

1. **Enable Location**
   - Browser will ask for permission
   - Click "Allow" to enable GPS tracking
   - Your location appears as blue circle on map

2. **Add Destination Markers**
   - Click **"+ Add Marker"** button (bottom left)
   - Click on map to place marker
   - Enter marker name
   - Click **"Save"**
   - Marker appears with blue pin

3. **Build Your Route**
   - Click on a marker to select it
   - Click **"Set as Start"** (green button)
   - Select another marker
   - Click **"Add to Route"** (blue button)
   - Repeat to add more stops
   - Total distance shows in HUD

### Phase 2: Start Navigation

4. **Start Journey**
   - Click **"Start Journey"** button (green)
   - App calculates A* path through trails
   - Map auto-zooms to show entire path
   - Route appears with three layers:
     - **Gray dashed line**: Your GPS snapped to trail
     - **Green glowing line**: Trail path to destination
     - **Yellow arrow**: Points to next turn
   - HUD shows: Distance, estimated time, next turn

### Phase 3: Navigate & Arrive

5. **Navigate**
   - Walk along the glowing green trail
   - Direction arrow rotates to point toward next turn
   - Distance updates in real-time
   - If you go off-trail (>30m), red warning appears
   - Map auto-centers and pans with you

6. **Arrive at Destination**
   - When within 30m: Green celebration alert
   - Achievement badge updates (X visited)
   - Click **"Next Marker"** to advance to next stop
   - Path recalculates, map re-zooms

7. **Complete Journey**
   - After all markers: "🎉 Journey complete!"
   - Journey count increments
   - Start new journey anytime

## User Interface Elements

### Map Controls (Top Right)
- **Attribution**: Map source (Esri satellite)
- **Zoom**: +/- to zoom in/out

### Buttons (Bottom Left)
- **"+ Add Marker"**: Place custom waypoints
- **"🚶 Start Journey"**: Begin trail navigation
- **"Clear Route"**: Cancel current journey

### HUD Overlay (Top)

#### During Route Planning
```
🗺️ Route: 2 stops
📍 Total: 3.42 km
🚶 Start Journey     Cancel
```

#### During Active Navigation
```
⚠️ You are off-trail! Return to marked path. [Warning if >30m away]
🗺️ Destination Name
📍 250m remaining
⏱️ Est. time: 3m 42s
→ Next turn ahead
```

### Route Visualization

**Three-Layer System:**

1. **Snap Line** (Gray dashed, thin)
   - Shows your GPS connection to trail
   - Typically 0-20m long
   - Disappears if already on trail

2. **Trail Path** (Green glowing, thick)
   - Main navigational route
   - Follows actual trail segments
   - Pulses with glow animation
   - Updates as you move

3. **Direction Arrow** (Yellow)
   - Points to next turn location
   - Rotates with your bearing
   - Only appears if next junction detected

### Achievement Badge (Top Right)
```
🏆 X visited
```
- Shows number of markers visited
- Increments when you reach each marker

## Advanced Features

### A* Pathfinding
The app finds the shortest route along actual trails, not straight line:

```
User Position ─────┐
                   │ (Gray snap line)
                   ├─ Trail Start
                   │
                   ├─ Trail Winding Through Forest
                   │ (Green glowing path)
                   │
                   └─ Destination Marker
```

**Why it matters:**
- Realistic trail distances
- Avoids impossible straight-line routing
- Considers all available paths

### Live Distance Updates
Every time your GPS updates (~1/second):
1. Distance recalculated using A*
2. Estimated time updated (1.4 m/s walking speed)
3. Next junction detected
4. Off-track status checked

### Off-Track Detection
- **Threshold**: 30 meters from trail
- **Warning**: Red banner "⚠️ You are off-trail!"
- **Visual**: Red text and icon
- **Recovery**: Follow direction arrow back to trail
- **Auto-clear**: Warning disappears when back within 30m

### Auto-Zoom
When you click "Start Journey":
1. Full path calculated
2. Map zooms to show entire route
3. 50px padding for comfortable viewing
4. Works on all screen sizes

### Real-Time Bearing
Direction arrow calculates compass bearing:
- **0°**: North (toward destination)
- **90°**: East
- **180°**: South
- **270°**: West
- Updates every GPS update

## Tips & Tricks

### For Accurate Navigation
✓ Enable **High Accuracy** in browser GPS settings
✓ Keep phone screen on (uses more battery)
✓ Walk in open areas (trees block GPS)
✓ Zoom in on map to see exact trails
✓ Don't run too fast (snap calculation needs time)

### For Better Snapping
✓ Stay within 50m of trail network
✓ Walk in middle of trail (edges are fuzzy)
✓ Make gentle turns (sharp angles confuse GPS)
✓ Avoid dense forest if possible

### For Avoiding Off-Track Warnings
✓ Follow the green glowing line carefully
✓ If warning appears, slow down
✓ Follow direction arrow back to trail
✓ GPS accuracy is ~5-10m (some drift normal)

### For Faster Navigation
✓ Pre-plan route before heading out
✓ Zoom in on HUD details before starting
✓ Memorize first few turns
✓ Use landscape mode on mobile

## Troubleshooting

### "Could not find path on trail network"
**Problem:** A* search failed
**Solutions:**
1. Check both markers are near trails (within 50m)
2. Zoom in on map to see trail network
3. Try selecting markers that are clearly on trails
4. Check GPS has a fix (blue circle is steady, not pulsing)

### Off-Track Warning Won't Go Away
**Problem:** Snap calculation shows >30m distance
**Causes:**
- GPS signal is poor (multi-path in canyon)
- Actually walking off-trail
- In dense forest with GPS multipath
**Solutions:**
1. Move to open area for better GPS
2. Check phone isn't in low-power mode
3. Compare blue dot with trail on map
4. Temporarily increase threshold to 50m

### Map Not Auto-Zooming
**Problem:** fitBounds failed silently
**Check:**
1. Path has waypoints (not just start/end)
2. Browser has enough memory
3. Map container is visible
4. Try zoom manually with +/- buttons

### Direction Arrow Not Rotating
**Problem:** Next junction not found or bearing wrong
**Check:**
1. Path longer than 100m (too short to have junctions)
2. GPS is active (check blue dot moves)
3. Walk 50m in one direction (arrow updates)
4. Check browser console for errors (F12)

### GPS Not Working
**Problem:** Blue dot doesn't appear or move
**Check:**
1. Is browser permission granted? (Check URL bar)
2. Is Location Services on? (Settings → Privacy)
3. Is GPS antenna unobstructed?
4. Wait 30 seconds for initial fix
5. Try refreshing page
6. Check network isn't blocking geolocation

### Slow Path Calculation
**Problem:** Takes >200ms to calculate path
**Causes:**
- Markers are far apart (>5km)
- Device is under memory pressure
- Browser is background tab
**Solutions:**
1. Close unused browser tabs
2. Use closer destinations
3. Force page refresh (Ctrl+R)
4. Try different browser

## Performance Metrics

### Expected Performance
- **A* pathfinding**: 20-50ms
- **Snap-to-path**: 10-20ms
- **Rendering**: 60fps (smooth)
- **GPS updates**: 1Hz (1/second)
- **Battery drain**: 5-10% per hour (screen + GPS on)

### Monitor Performance
1. Open DevTools: **F12**
2. Go to **Performance** tab
3. Record 10 seconds of navigation
4. Check for frame drops or slow tasks
5. Look for turf.js operations >100ms

## Example Journeys

### Easy Walk: River Loop
1. Start: Main Entrance
2. Destination: River Viewpoint
3. Distance: ~2km
4. Time: 25-30 min
5. Difficulty: Easy (mostly flat)

### Medium Hike: Forest Ridge
1. Start: Main Entrance
2. Stop 1: Ridge Trail Start
3. Stop 2: Overlook
4. Stop 3: Main Entrance
5. Total: ~7km
6. Time: 90-120 min
7. Difficulty: Medium (some elevation)

### Advanced Trek: Complete Circuit
1. Start: Main Entrance
2. Stop 1: River Viewpoint
3. Stop 2: Bamboo Grove
4. Stop 3: Scenic Overlook
5. Stop 4: Ridge Trail
6. Stop 5: Main Entrance
7. Total: ~12km
8. Time: 2-3 hours
9. Difficulty: Hard (full elevation changes)

## Known Limitations

### Current Session
- Course-up map rotation not yet enabled (Leaflet limitation)
- Voice guidance not implemented
- Elevation profiles not shown
- Weather integration not available

### Device Limitations
- GPS accuracy: ±5-10 meters (can't be perfectly precise)
- Urban canyon effect near buildings (worse GPS)
- Dense forest reduces GPS signal strength
- Altitude lock takes ~30 seconds after turn-on

### Performance Ceilings
- Max 20 trails recommended
- Max 200 nodes recommended
- Max path length: unlimited but recalc takes longer

## Support & Feedback

### Report Bugs
- Note exact error message
- Screenshot of HUD
- GPS accuracy shown in browser
- Browser version (F12 → Device Emulation)

### Suggest Features
- "Voice guidance: 'Turn left in 50m'"
- "Elevation profile graph"
- "Save favorite routes"
- "Social route sharing"

## Next Steps

### To Learn More
→ Read [ADVANCED_ROUTING_GUIDE.md](./ADVANCED_ROUTING_GUIDE.md) for technical details

### To Contribute
→ Send bug reports and feature requests to project maintainers

### To Deploy
→ Follow [Deployment Checklist](./ADVANCED_ROUTING_GUIDE.md#deployment-checklist)

---

**Version:** 1.0  
**Last Updated:** January 20, 2026  
**Status:** Beta Ready for Testing
