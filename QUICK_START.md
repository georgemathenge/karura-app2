# 🚀 Quick Reference - Satellite Map & Markers

## ⚡ TL;DR

You now have a satellite map of Karura Forest where you can:

1. Click **"Add Marker"** button → click map → enter name → save
2. See all markers in sidebar (right side)
3. Click navigation icon to route to any marker
4. Markers saved automatically in browser

## 🎯 Quick Actions

| Want to...           | Do this                                      | Result                                |
| -------------------- | -------------------------------------------- | ------------------------------------- |
| **Add marker**       | Click green "Add Marker" btn, then click map | Marker appears on map & list          |
| **Delete marker**    | Click trash icon in marker list              | Marker removed (can't undo)           |
| **Navigate**         | Click blue arrow icon next to marker         | Blue path appears, HUD shows distance |
| **See all markers**  | Look at right sidebar                        | Shows count & list of all markers     |
| **Save markers**     | Just use the app!                            | Auto-saved to browser storage         |
| **Check GPS**        | Blue dot on map                              | Shows your current location           |
| **Test without GPS** | DevTools → Sensors → set location            | Simulates movement                    |

## 🗺️ Map Controls

| Control                 | What it does                     |
| ----------------------- | -------------------------------- |
| **Scroll/Pinch**        | Zoom in/out on satellite imagery |
| **Drag**                | Pan around the map               |
| **"Add Marker" button** | Enter marker placement mode      |
| **Click on map**        | Place marker (when in Add mode)  |
| **Navigation icon**     | Route to that marker             |
| **Trash icon**          | Delete custom marker             |

## 🎨 Colors Explained

| Color           | Meaning                      |
| --------------- | ---------------------------- |
| 🔵 Cyan button  | Main actions (Add, Navigate) |
| 🟢 Green button | Confirm/Save                 |
| 🔴 Red button   | Delete/Cancel                |
| 📍 Cyan pin     | Marker on map                |
| 🔵 Blue dot     | Your location (GPS)          |
| 🟠 Orange line  | Breadcrumb trail (your path) |
| 🔵 Blue path    | Route to destination         |

## 📱 On Mobile

- Tap "Add Marker"
- Tap location on map
- Type name (keyboard appears)
- Tap "Save"
- Marker appears in list on right

All same controls, just touch instead of click.

## 🚨 Troubleshooting

**Q: Button doesn't work?**

- A: Refresh page (Ctrl+R or Cmd+R)

**Q: Markers disappear when I refresh?**

- A: Check DevTools → Application → LocalStorage → karura_custom_markers

**Q: Can't see satellite map?**

- A: Wait for tiles to load (1-2 seconds per zoom), check internet connection

**Q: GPS not working?**

- A:
  - Mobile: Enable location services
  - Desktop: Use DevTools Sensors to simulate

**Q: Delete button missing on marker?**

- A: Only custom markers have delete. Pre-loaded markers are fixed.

## 📊 Current Setup

- **Dev Server**: http://localhost:5174
- **Map**: Satellite imagery (Esri)
- **Zoom**: 1-18 levels
- **Markers**: 15 pre-loaded + unlimited custom
- **Storage**: Browser localStorage (~5MB)
- **Status**: ✅ Working & tested

## 🎓 Workflow Examples

### Create a 3-Marker Loop:

1. Click "Add Marker" → Click north point → Name "Trail Start" → Save
2. Click "Add Marker" → Click east point → Name "Viewpoint" → Save
3. Click "Add Marker" → Click south point → Name "Trail End" → Save
4. See 3 markers in list
5. Click navigation on "Trail Start" → walk that direction
6. When reached, click next marker, repeat

### Mark Important Places:

1. "Water Station"
2. "Park Entrance"
3. "Bird Sanctuary"
4. "Rest Area"
5. "Picnic Spot"

Then navigate between them while walking.

## 📝 Data Format

Markers stored as JSON:

```json
{
  "id": 16,
  "name": "My Marker",
  "latitude": -1.303,
  "longitude": 36.805,
  "type": "landmark"
}
```

In browser storage at: `localStorage['karura_custom_markers']`

## 🔧 Advanced

| Task                | Command                                  |
| ------------------- | ---------------------------------------- |
| Restart dev server  | Stop: `npm run dev`, then: `npm run dev` |
| Build for web       | `npm run build` → creates `dist/` folder |
| Check errors        | Open DevTools (F12), check Console tab   |
| View stored markers | DevTools → Application → LocalStorage    |
| Export markers      | DevTools → Copy JSON from localStorage   |
| Clear all markers   | DevTools → Application → Delete entry    |

## 🌐 Access from Other Devices

On same WiFi network:

1. Find your computer's IP:
   - Windows: Open Command Prompt, run `ipconfig`, look for "IPv4 Address" (e.g., `192.168.1.100`)

2. On phone, open browser: `http://192.168.1.100:5174`

3. If that doesn't work, try: `http://localhost:5174` (only if phone is connected to same computer somehow)

## 📞 Resources

- **Full Testing Guide**: See `MARKER_TESTING.md`
- **Implementation Details**: See `SATELLITE_MARKER_IMPLEMENTATION.md`
- **Complete Guide**: See `README.md`

---

**Status**: ✅ **LIVE & WORKING**  
**Last Updated**: Today  
**Node**: v20.15.1 (works, warnings are normal)  
**Vite**: v7.3.1

Ready to use! Open http://localhost:5174 in your browser.
