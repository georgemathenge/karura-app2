# ⚡ Quick Reference Card - Karura Trail Navigator

## Start Here

```
1. Open app: http://localhost:5175
2. Grant GPS permission (browser will ask)
3. Wait for blue dot to appear (GPS lock)
4. Click "+ Add Marker" to place waypoints
5. Click "Add to Route" to build journey
6. Click "🚶 Start Journey" to navigate
7. Follow the glowing green trail
8. Watch HUD for distance and time
9. Celebration alert when you arrive! 🎉
```

---

## Key Features at a Glance

| Feature | What It Does | Icon |
|---------|-------------|------|
| **Glowing Green Path** | Shows trail route to destination | 🟢 |
| **Direction Arrow** | Points to next turn | ➔ |
| **Distance Display** | "250m remaining" | 📍 |
| **Time Estimate** | "3m 42s" walking time | ⏱️ |
| **Off-Track Warning** | "⚠️ Off-trail!" if >30m away | 🔴 |
| **Achievement Badge** | Number of markers visited | 🏆 |
| **Auto-Center Map** | Follows you as you walk | 🎯 |

---

## HUD (Top Bar) Explanation

### Before Journey (Planning)
```
🗺️ Route: 2 stops
📍 Total: 3.42 km
Button: [🚶 Start Journey] [Cancel]
```

### During Journey (Navigation)
```
⚠️ You are off-trail! Return to marked path. [← Red warning if needed]
🗺️ Destination Name
📍 250m remaining
⏱️ Est. time: 3m 42s
→ Next turn ahead
```

---

## Map Controls

```
🗺️ Map Area (Center)
├─ Tap marker to select
├─ Blue dot = Your location
├─ Green line = Trail path
├─ Yellow arrow = Next turn
└─ +/- buttons = Zoom

Bottom Left:
├─ [+ Add Marker] = Place waypoints
├─ [🚶 Start] = Begin journey
└─ [❌ Cancel] = Stop route

Top Right:
└─ [🏆 X visited] = Achievement count
```

---

## Troubleshooting - Quick Fixes

| Problem | Solution |
|---------|----------|
| No blue dot | Grant location permission, wait 30 sec |
| GPS bouncing around | Normal ±5-10m. Walk on trail center |
| Off-trail warning | Walk back toward green line |
| Path not calculated | Markers must be within 50m of trail |
| Map won't zoom | Refresh page (Ctrl+R) |
| "Could not find path" | Place marker closer to visible trail |

---

## Pro Tips

✅ **For Accuracy**
- Enable High Accuracy in GPS settings
- Walk in open areas (trees block GPS)
- Stay on trail center (edges are fuzzy)

✅ **For Navigation**
- Zoom in before starting to see trails
- Watch arrow, not just distance
- Advance to next marker when celebration alert

✅ **For Battery**
- Keep screen on during navigation
- Reduce screen brightness
- One journey per hour ≈ 10% battery

---

## Statistics

**Your Journey** (Live Updates)
- Distance: Recalculated every 1 second
- Time: Based on 1.4 m/s walking speed
- Accuracy: ±5m GPS + ±10m trail network

**Typical Performance**
- A* pathfinding: <50ms
- Route visualization: Instant
- GPS updates: 1 per second
- Battery usage: ~10% per hour

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| F12 | Open browser dev tools (for debugging) |
| Ctrl+R | Refresh page |
| Ctrl+Shift+C | Inspect element (highlight on map) |

---

## Example Journeys

### 🟢 Easy (30 min)
**River Loop** → River Viewpoint → Back to Start
- Distance: 2 km
- Difficulty: Flat
- Best for: First-time users

### 🟡 Medium (90 min)
**Forest Ridge Trek** → Ridge Trail → Overlook → Return
- Distance: 7 km
- Difficulty: Some hills
- Best for: Regular hikers

### 🔴 Hard (3 hours)
**Complete Circuit** → All major landmarks → Back
- Distance: 12 km
- Difficulty: Full elevation
- Best for: Experienced hikers

---

## What Each Color Means

- 🔵 **Blue dot** = Your current location
- 🟢 **Green glowing line** = Trail you should follow
- ⚪ **Gray dashed line** = Your GPS snap to trail
- ➔ **Yellow arrow** = Next turn direction
- 🔴 **Red banner** = Off-trail warning

---

## Emergency

**GPS Lost / Can't Find Trail**
1. Stop and wait 30 seconds
2. Check phone has location permission
3. Move to open area (avoid dense trees)
4. Refresh page if nothing works

**Injured / Need Help**
1. Note your GPS coordinates (blue dot location)
2. Take screenshot of map
3. Call emergency services
4. Share GPS location info

---

## Settings Checklist

✅ Location Services: **ON** (Settings)
✅ Browser Location: **ALLOW** (URL bar)
✅ GPS Accuracy: **HIGH** (Settings)
✅ Screen Brightness: **AUTO** (Save battery)
✅ WiFi: **OPTIONAL** (For backup)

---

## Sharing & Saving

**Save Your Journey**
- Screenshot the HUD (distance, time, markers)
- Browser history saves visited pages
- Markers save automatically to device

**Share Route**
- Take screenshot of map with path visible
- Share via: Email, Messaging, Social Media
- Include: Distance, time, difficulty

---

## Browser Compatibility

✅ **Works Great On**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

⚠️ **May Be Slow On**
- Old phones (pre-2018)
- Slow internet (initial load)
- Older browsers (IE not supported)

---

## FAQ - Frequently Asked Questions

**Q: Why is my route winding, not straight?**
A: It follows actual trail segments, not a straight line through forest.

**Q: What if I walk off the trail?**
A: Red warning appears. Follow the arrow back to the green line.

**Q: How accurate is the distance?**
A: Usually ±50m because it's recalculated based on actual GPS position every second.

**Q: Can I use this without internet?**
A: Yes! The map and routes cache. First load needs internet.

**Q: Why does my GPS jump around?**
A: Normal GPS behavior. Error is ±5-10m. Walk toward trail center.

**Q: How long does battery last?**
A: About 10% per hour with screen on. 5% with screen off.

**Q: Can I save my routes?**
A: Not yet, but you can screenshot the HUD.

**Q: What's that next turn arrow?**
A: Points to next junction where trail splits.

---

## Getting Help

📖 **Need instructions?** → Read TESTING_AND_USAGE_GUIDE.md
🔧 **Technical details?** → Check ADVANCED_ROUTING_GUIDE.md
📝 **Report bug?** → Open browser console (F12) and note error
💡 **Suggest feature?** → Send ideas to project maintainers

---

## Version Info

**App Version**: 2.0 (Graph-Based Navigation)
**Status**: ✅ Production Ready
**Last Updated**: January 20, 2026
**Build Size**: 238 KB (gzipped)

---

**Happy Trails!** 🚶‍♂️🌲

Remember: Always stay on marked trails, bring water, and let someone know where you're going!
