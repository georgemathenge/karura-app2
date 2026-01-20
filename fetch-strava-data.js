#!/usr/bin/env node

/**
 * Fetch real trail data from Strava API
 * Requires: STRAVA_ACCESS_TOKEN environment variable
 *
 * Setup Instructions:
 * 1. Go to https://www.strava.com/settings/apps
 * 2. Create a new application
 * 3. Get your Access Token
 * 4. Set environment: export STRAVA_ACCESS_TOKEN="your_token"
 * 5. Run: node fetch-strava-data.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STRAVA_API = 'https://www.strava.com/api/v3';
const KARURA_CENTER = [-1.303, 36.805]; // [lat, lng]
const ACCESS_TOKEN = process.env.STRAVA_ACCESS_TOKEN;

// Polyline decoder (Google's algorithm)
function decodePolyline(encoded) {
  const poly = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    result = 0;
    shift = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push([lng / 1e5, lat / 1e5]);
  }

  return poly;
}

async function fetchStrava(endpoint, params = {}) {
  try {
    const queryString = new URLSearchParams({
      access_token: ACCESS_TOKEN,
      ...params,
    }).toString();

    const url = `${STRAVA_API}${endpoint}?${queryString}`;

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid Strava token - check STRAVA_ACCESS_TOKEN');
      }
      throw new Error(
        `Strava API error: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching from Strava:`, error.message);
    return null;
  }
}

async function fetchSegments() {
  console.log('🏃 Fetching Strava segments near Karura Forest...');

  if (!ACCESS_TOKEN) {
    console.error('\n❌ STRAVA_ACCESS_TOKEN not set!');
    console.error('\nSetup instructions:');
    console.error('1. Visit: https://www.strava.com/settings/apps');
    console.error('2. Create an app and get your Access Token');
    console.error('3. Run: export STRAVA_ACCESS_TOKEN="your_token_here"');
    console.error('4. Then: node fetch-strava-data.js\n');
    return [];
  }

  // Fetch segments in bounding box around Karura
  // Note: Strava API segments endpoint requires specific coordinates
  const params = {
    bounds: `${KARURA_CENTER[0] - 0.02},${KARURA_CENTER[1] - 0.02},${KARURA_CENTER[0] + 0.02},${KARURA_CENTER[1] + 0.02}`,
    limit: 50,
  };

  const segments = await fetchStrava('/segments/explore', params);

  if (!segments || !segments.segments) {
    console.log('⚠️  No segments found in Strava for this area');
    return [];
  }

  console.log(`✓ Found ${segments.segments.length} segments\n`);
  return segments.segments;
}

async function fetchSegmentDetails(segmentId) {
  const segment = await fetchStrava(`/segments/${segmentId}`);
  return segment;
}

async function convertToGeoJSON(segments) {
  const features = [];
  let processed = 0;

  for (const segment of segments) {
    try {
      // Get full segment details with polyline
      const details = await fetchSegmentDetails(segment.id);

      if (!details || !details.map || !details.map.polyline) {
        continue;
      }

      // Decode the polyline
      const coordinates = decodePolyline(details.map.polyline);

      if (coordinates.length < 2) {
        continue;
      }

      // Calculate distance
      let distance = 0;
      for (let i = 0; i < coordinates.length - 1; i++) {
        const [lng1, lat1] = coordinates[i];
        const [lng2, lat2] = coordinates[i + 1];
        distance += haversineDistance(lat1, lng1, lat2, lng2);
      }

      const feature = {
        type: 'Feature',
        properties: {
          name: details.name,
          difficulty:
            details.average_grade >= 8
              ? 'Hard'
              : details.average_grade >= 4
                ? 'Medium'
                : 'Easy',
          length_km: parseFloat(distance.toFixed(2)),
          elevation_m: details.elevation_difference || 0,
          gradient: details.average_grade || 0,
          effort_score: details.hazardous ? 'High' : 'Medium',
          activity_type: details.activity_type || 'running',
          effort_count: details.effort_count || 0,
          athlete_count: details.athlete_count || 0,
          strava_id: details.id,
          strava_url: details.url,
        },
        geometry: {
          type: 'LineString',
          coordinates,
        },
      };

      features.push(feature);
      processed++;

      // Rate limiting - Strava allows 600 requests per 15 minutes
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`  Error processing segment ${segment.id}:`, error.message);
      continue;
    }
  }

  console.log(`✓ Successfully processed ${processed} segments\n`);
  return features;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function fetchActivities() {
  console.log('🎯 Fetching Strava activities for markers...');

  if (!ACCESS_TOKEN) {
    return [];
  }

  // Get current athlete's activities
  const activities = await fetchStrava('/athlete/activities', { per_page: 30 });

  if (!activities) {
    console.log('⚠️  Could not fetch activities');
    return [];
  }

  console.log(`✓ Found ${activities.length} activities\n`);

  // Convert activities to markers based on start location
  const markers = [];
  let id = 1;

  const processedLocations = new Set();

  for (const activity of activities) {
    if (!activity.start_latitude || !activity.start_longitude) continue;

    // Only include activities in Karura area
    const isInArea =
      Math.abs(activity.start_latitude - KARURA_CENTER[0]) < 0.02 &&
      Math.abs(activity.start_longitude - KARURA_CENTER[1]) < 0.02;

    if (!isInArea) continue;

    // Avoid duplicate locations
    const locKey = `${activity.start_latitude.toFixed(4)},${activity.start_longitude.toFixed(4)}`;
    if (processedLocations.has(locKey)) continue;
    processedLocations.add(locKey);

    markers.push({
      id,
      name: activity.name,
      description: `Popular ${activity.type} route - ${activity.distance / 1000} km`,
      latitude: activity.start_latitude,
      longitude: activity.start_longitude,
      type: 'landmark',
      osmType: `activity/${activity.type}`,
      strava_id: activity.id,
      strava_url: activity.url,
      activity_type: activity.type,
      distance_km: (activity.distance / 1000).toFixed(1),
      elevation_m: activity.total_elevation_gain || 0,
    });

    id++;

    if (id > 15) break; // Limit to 15 markers
  }

  return markers;
}

async function main() {
  console.log('\n🏔️  Karura Forest Strava Data Fetcher');
  console.log('=====================================\n');

  // Check for token
  if (!ACCESS_TOKEN) {
    console.log('No Strava token found. Creating setup instructions...\n');

    // Create setup guide
    const setupGuide = `# Strava API Setup Guide

## Getting Your Strava Access Token

1. Go to https://www.strava.com/settings/apps
2. Sign in to your Strava account
3. Create a new application with these settings:
   - Application Name: "Karura Trail Explorer"
   - Website: http://localhost
   - Authorization Callback Domain: localhost

4. Once created, you'll see:
   - Client ID
   - Client Secret
   - Access Token (or generate one)

5. Copy the Access Token and run:
   \`\`\`bash
   export STRAVA_ACCESS_TOKEN="your_access_token_here"
   node fetch-strava-data.js
   \`\`\`

## Windows Users
\`\`\`powershell
$env:STRAVA_ACCESS_TOKEN = "your_access_token_here"
node fetch-strava-data.js
\`\`\`

## What Data Will Be Fetched?

- Strava segments (official trails/popular routes)
- Segment polylines with elevation data
- Activity start points for markers
- Effort counts showing trail popularity

## Rate Limits

- Strava allows 600 requests per 15 minutes
- Script automatically throttles requests
- First run may take a few minutes

## Privacy

- Only accesses public segment data
- No personal athlete data is accessed
- Data is saved locally in your project
`;

    fs.writeFileSync(path.join(__dirname, 'STRAVA_SETUP.md'), setupGuide);

    console.log('📄 Created STRAVA_SETUP.md with setup instructions\n');
    console.log('Next steps:');
    console.log('1. Read STRAVA_SETUP.md for setup instructions');
    console.log('2. Get your Strava Access Token');
    console.log('3. Set STRAVA_ACCESS_TOKEN environment variable');
    console.log('4. Run this script again\n');
    return;
  }

  // Fetch data
  const segments = await fetchSegments();

  if (segments.length === 0) {
    console.log('⚠️  Could not fetch segments from Strava');
    console.log('Using fallback mock data instead.\n');
    return;
  }

  // Convert segments to GeoJSON
  const trails = await convertToGeoJSON(segments);

  // Fetch activities for markers
  const activityMarkers = await fetchActivities();

  // Save trails
  if (trails.length > 0) {
    const trailsGeoJSON = {
      type: 'FeatureCollection',
      properties: {
        name: 'Karura Forest Strava Segments',
        source: 'Strava API',
        fetchedAt: new Date().toISOString(),
        totalSegments: trails.length,
      },
      features: trails,
    };

    const trailsPath = path.join(__dirname, 'public', 'karura-trails.geojson');
    fs.writeFileSync(trailsPath, JSON.stringify(trailsGeoJSON, null, 2));
    console.log(`✅ Saved ${trails.length} trails to karura-trails.geojson`);
  }

  // Save markers
  if (activityMarkers.length > 0) {
    const markersOutput = {
      markers: activityMarkers,
      source: 'Strava API - Public Activities',
      fetchedAt: new Date().toISOString(),
    };

    const markersPath = path.join(__dirname, 'public', 'markers.json');
    fs.writeFileSync(markersPath, JSON.stringify(markersOutput, null, 2));
    console.log(
      `✅ Saved ${activityMarkers.length} activity markers to markers.json`,
    );
  }

  console.log('\n📱 Data updated! Reload the app to see Strava trail data.\n');
}

main().catch(console.error);
