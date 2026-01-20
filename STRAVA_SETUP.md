# 🏃 Strava Integration for Karura Trails

This guide shows how to fetch real trail data from Strava's API.

## Quick Setup

### Step 1: Get Your Strava Access Token

1. Go to **https://www.strava.com/settings/apps**
2. Sign in with your Strava account
3. Click **"Create an app"**
4. Fill in:
   - **Application Name**: Karura Trail Explorer
   - **Website**: http://localhost
   - **Authorization Callback Domain**: localhost
5. Accept terms and create
6. Copy your **Access Token**

### Step 2: Set Environment Variable

**Windows (PowerShell):**

```powershell
$env:STRAVA_ACCESS_TOKEN = "your_token_here"
node fetch-strava-data.js
```

**Windows (Command Prompt):**

```cmd
set STRAVA_ACCESS_TOKEN=your_token_here
node fetch-strava-data.js
```

**macOS/Linux:**

```bash
export STRAVA_ACCESS_TOKEN="your_token_here"
node fetch-strava-data.js
```

### Step 3: Run the Fetcher

```bash
node fetch-strava-data.js
```

## What Gets Fetched?

✅ **Trail Segments**

- Real Strava segments in Karura area
- Decoded polyline coordinates
- Elevation data
- Popularity (effort counts)
- Trail difficulty (auto-calculated from gradient)

✅ **Activity Markers**

- Popular activity start points
- Distance and elevation info
- Strava activity links
- Direct activity data

## Expected Results

You'll see:

- 🏃 Segments found near Karura
- 🎯 Activities fetched
- ✅ Trails saved to `karura-trails.geojson`
- ✅ Markers saved to `markers.json`

Then reload the app to see real Strava data on the map!

## Troubleshooting

### "Invalid Strava token"

- Double-check your token at https://www.strava.com/settings/apps
- Make sure you set the environment variable correctly
- Tokens don't expire but can be regenerated

### "No segments found"

- Karura Forest may have limited Strava data
- Try expanding the search radius (edit script)
- Consider using a mix of Strava + OSM data

### Rate Limited (429 error)

- Strava allows 600 requests per 15 minutes
- Script auto-throttles, but first run takes time
- Wait 15 minutes and try again

## Data Quality

Strava data is great because:

- ✅ Real GPS tracks from actual athletes
- ✅ Popularity metrics (how many people run it)
- ✅ Accurate elevation data
- ✅ Up-to-date trail conditions via comments

Strava data limitations:

- ⚠️ Coverage depends on user activity in area
- ⚠️ Segments mainly for running/cycling
- ⚠️ May not include all hiking-only trails

## Mixing Strava + OSM Data

For complete coverage, you can combine both:

1. Fetch Strava segments (this script)
2. Manually add missing trails from OSM
3. Merge GeoJSON files

Example merger script:

```javascript
const strava = require('./public/karura-trails.geojson');
const osm = require('./manual-osm-data.geojson');

const merged = {
  type: 'FeatureCollection',
  features: [...strava.features, ...osm.features],
};
```

## API Limits

- **Rate Limit**: 600 requests per 15 minutes
- **Segments**: Unlimited per search
- **Activities**: Last 30 activities
- **Throttle**: Script delays 100ms between requests

## Privacy & Terms

- Only accesses **public** Strava data
- No personal athlete information is collected
- Complies with Strava API Terms of Service
- Data saved locally on your device

## Advanced: Custom Search Area

Edit `fetch-strava-data.js` line 20:

```javascript
const KARURA_CENTER = [-1.303, 36.805]; // [lat, lng]
```

Change coordinates to search different areas!

## Next Steps

1. Run the fetcher with your token
2. Check `karura-trails.geojson` and `markers.json`
3. Reload the app
4. Walk around to test GPS tracking!

---

Questions? Check the main [IMPLEMENTATION.md](./IMPLEMENTATION.md)
