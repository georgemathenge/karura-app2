#!/usr/bin/env node

/**
 * Fetch real Karura Forest data from OpenStreetMap
 * Uses Overpass API to get trails, paths, and POIs
 * Populates karura-trails.geojson and markers.json with actual OSM data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Overpass API endpoints
const OVERPASS_INTERPRETER = 'https://overpass-api.de/api/interpreter';
const OVERPASS_TURBO = 'https://overpass.osm.ch/api/interpreter'; // Fallback

// Karura Forest coordinates (Nairobi, Kenya)
const KARURA_CENTER = [-1.303, 36.805]; // [lat, lng]
const KARURA_BOUNDS = {
  south: -1.325,
  north: -1.28,
  west: 36.785,
  east: 36.825,
};

async function fetchOverpassData(query, endpoint = OVERPASS_INTERPRETER) {
  try {
    console.log(`📡 Querying Overpass API: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: query,
      timeout: 30000,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✓ Received ${data.elements?.length || 0} elements`);
    return data;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return null;
  }
}

function buildWayGeometry(way, nodeMap) {
  if (!way.nodes || way.nodes.length < 2) return null;

  const coordinates = [];
  for (const nodeId of way.nodes) {
    const node = nodeMap.get(nodeId);
    if (node) {
      coordinates.push([node.lon, node.lat]);
    }
  }

  return coordinates.length >= 2 ? coordinates : null;
}

function convertToGeoJSON(osmData) {
  const features = [];

  // Build node map for faster lookup
  const nodeMap = new Map();
  if (osmData.elements) {
    osmData.elements.forEach((element) => {
      if (element.type === 'node') {
        nodeMap.set(element.id, element);
      }
    });
  }

  // Process ways (trails/paths)
  if (osmData.elements) {
    osmData.elements.forEach((element) => {
      if (element.type === 'way') {
        const coordinates = buildWayGeometry(element, nodeMap);

        if (!coordinates) return;

        const tags = element.tags || {};
        const name =
          tags.name || `${tags.highway || 'Path'} (OSM ${element.id})`;

        // Determine difficulty based on surface/tags
        let difficulty = 'Easy';
        if (tags.surface === 'rocky' || tags.surface === 'loose')
          difficulty = 'Medium';
        if (tags.surface === 'unpaved' && tags.smoothness === 'bad')
          difficulty = 'Hard';
        if (tags.incline || tags.hill === 'yes') difficulty = 'Hard';

        features.push({
          type: 'Feature',
          properties: {
            name,
            difficulty,
            surface: tags.surface || 'unpaved',
            length_km: calculateDistance(coordinates),
            highway_type: tags.highway || 'path',
            smoothness: tags.smoothness,
            incline: tags.incline,
            osmId: element.id,
            osmTags: tags,
          },
          geometry: {
            type: 'LineString',
            coordinates,
          },
        });
      }
    });
  }

  return features;
}

function calculateDistance(coordinates) {
  let distance = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];
    distance += haversineDistance(lat1, lon1, lat2, lon2);
  }
  return parseFloat(distance.toFixed(2));
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

async function fetchTrails() {
  console.log('\n🥾 Fetching trail and path data from OpenStreetMap...');

  // Proper Overpass query format
  const query = `[bbox:-1.325,36.785,-1.280,36.825];
(
  way["highway"="path"];
  way["highway"="footway"];
  way["highway"="track"];
);
out geom;`;

  let data = await fetchOverpassData(query);

  // Fallback to alternative endpoint
  if (!data || !data.elements || data.elements.length === 0) {
    console.log('⚠️  Primary endpoint failed, trying fallback...');
    data = await fetchOverpassData(query, OVERPASS_TURBO);
  }

  if (!data || !data.elements) {
    console.log('⚠️  No trail data found from OSM');
    return [];
  }

  return convertToGeoJSON(data);
}

async function fetchMarkers() {
  console.log('📍 Fetching points of interest from OpenStreetMap...');

  // Proper Overpass query for POIs
  const query = `[bbox:-1.325,36.785,-1.280,36.825];
(
  node["tourism"];
  node["amenity"];
  node["historic"];
  node["natural"];
);
out;`;

  let data = await fetchOverpassData(query);

  if (!data || !data.elements) {
    console.log('⚠️  Primary endpoint failed, trying fallback...');
    data = await fetchOverpassData(query, OVERPASS_TURBO);
  }

  if (!data || !data.elements) {
    console.log('⚠️  No POI data found from OSM');
    return [];
  }

  const markers = [];
  let id = 1;

  data.elements.forEach((node) => {
    if (node.type === 'node' && node.lat && node.lon) {
      const tags = node.tags || {};
      const type =
        tags.tourism ||
        tags.amenity ||
        tags.historic ||
        tags.natural ||
        'landmark';
      const name = tags.name || `${type} #${id}`;

      markers.push({
        id,
        name,
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} - OpenStreetMap`,
        latitude: node.lat,
        longitude: node.lon,
        type: tags.tourism
          ? 'viewpoint'
          : tags.amenity
            ? 'facility'
            : 'landmark',
        osmId: node.id,
        osmType: `${type}${tags[type] ? `/${tags[type]}` : ''}`,
        osmTags: tags,
      });
      id++;
    }
  });

  return markers;
}

async function main() {
  console.log('\n🌲 Karura Forest OpenStreetMap Data Fetcher');
  console.log('==========================================\n');
  console.log(`📍 Area: Karura Forest, Nairobi, Kenya`);
  console.log(
    `📐 Bounds: ${KARURA_BOUNDS.south} to ${KARURA_BOUNDS.north} (lat)`,
  );
  console.log(
    `         ${KARURA_BOUNDS.west} to ${KARURA_BOUNDS.east} (lng)\n`,
  );

  // Fetch trails
  const trails = await fetchTrails();
  console.log(`✓ Found ${trails.length} trail segments\n`);

  // Fetch markers
  const markersData = await fetchMarkers();
  console.log(`✓ Found ${markersData.length} points of interest\n`);

  // Save trails
  if (trails.length > 0) {
    const trailsGeoJSON = {
      type: 'FeatureCollection',
      properties: {
        name: 'Karura Forest Trail Network',
        description: 'Trails and paths in Karura Forest from OpenStreetMap',
        source: 'OpenStreetMap Overpass API',
        fetchedAt: new Date().toISOString(),
        totalTrails: trails.length,
      },
      features: trails,
    };

    const trailsPath = path.join(__dirname, 'public', 'karura-trails.geojson');
    fs.writeFileSync(trailsPath, JSON.stringify(trailsGeoJSON, null, 2));
    console.log(`✅ Saved ${trails.length} trails to karura-trails.geojson`);
  } else {
    console.log('⚠️  No trails found - keeping existing mock data');
  }

  // Save markers
  if (markersData.length > 0) {
    const markersOutput = {
      markers: markersData.slice(0, 20), // Limit to 20 markers
      source: 'OpenStreetMap Overpass API',
      fetchedAt: new Date().toISOString(),
      totalMarkers: markersData.length,
    };

    const markersPath = path.join(__dirname, 'public', 'markers.json');
    fs.writeFileSync(markersPath, JSON.stringify(markersOutput, null, 2));
    console.log(
      `✅ Saved ${Math.min(markersData.length, 20)} markers to markers.json`,
    );
  } else {
    console.log('⚠️  No markers found - keeping existing mock data');
  }

  console.log('\n📱 Data update complete!');
  console.log('🔄 Reload the app to see updated trail data.\n');

  if (trails.length === 0 && markersData.length === 0) {
    console.log('ℹ️  No OSM data found for this area.');
    console.log('💡 You can:');
    console.log('   1. Try adding data manually using geojson.io');
    console.log('   2. Use Strava data instead (fetch-strava-data.js)');
    console.log(
      '   3. Edit public/markers.json and public/karura-trails.geojson\n',
    );
  }
}

main().catch(console.error);
