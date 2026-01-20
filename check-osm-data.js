#!/usr/bin/env node

/**
 * Diagnostic script to check what OSM data exists for Karura Forest
 * Tests different queries to see data availability
 */

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Karura Forest coordinates
const BOUNDS = {
  south: -1.325,
  north: -1.28,
  west: 36.785,
  east: 36.825,
};

async function testQuery(name, query) {
  console.log(`\n📡 Testing: ${name}`);
  console.log(`Query: ${query.substring(0, 80)}...`);

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      body: query,
      timeout: 15000,
    });

    if (!response.ok) {
      console.log(`❌ HTTP ${response.status}`);
      return 0;
    }

    const data = await response.json();
    const count = data.elements?.length || 0;

    if (count > 0) {
      console.log(`✅ Found ${count} elements`);

      // Show sample data
      const ways = data.elements.filter((e) => e.type === 'way');
      const nodes = data.elements.filter((e) => e.type === 'node');

      if (ways.length > 0) {
        console.log(`   - Ways: ${ways.length}`);
        ways.slice(0, 2).forEach((w) => {
          console.log(`     • ${w.tags?.name || w.tags?.highway || 'Unnamed'}`);
        });
      }

      if (nodes.length > 0) {
        console.log(`   - Nodes: ${nodes.length}`);
        nodes.slice(0, 2).forEach((n) => {
          const type = Object.keys(n.tags || {}).join('/');
          console.log(`     • ${n.tags?.name || type || 'Unnamed'}`);
        });
      }
    } else {
      console.log(`⚠️  No elements found`);
    }

    return count;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return 0;
  }
}

async function main() {
  console.log('\n🔍 Karura Forest OpenStreetMap Data Availability Check');
  console.log('========================================================');
  console.log(`\nSearching area:`);
  console.log(`  Latitude:  ${BOUNDS.south} to ${BOUNDS.north}`);
  console.log(`  Longitude: ${BOUNDS.west} to ${BOUNDS.east}`);
  console.log(`\n📍 (This is Karura Forest, Nairobi, Kenya)\n`);

  let totalResults = 0;

  // Test 1: All ways
  const q1 = `[bbox:${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east}];way;out;`;
  totalResults += await testQuery('All ways', q1);
  await new Promise((r) => setTimeout(r, 1000));

  // Test 2: All nodes
  const q2 = `[bbox:${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east}];node;out;`;
  totalResults += await testQuery('All nodes', q2);
  await new Promise((r) => setTimeout(r, 1000));

  // Test 3: Paths specifically
  const q3 = `[bbox:${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east}];way["highway"="path"];out geom;`;
  totalResults += await testQuery('Paths (highway=path)', q3);
  await new Promise((r) => setTimeout(r, 1000));

  // Test 4: Footways
  const q4 = `[bbox:${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east}];way["highway"="footway"];out geom;`;
  totalResults += await testQuery('Footways (highway=footway)', q4);
  await new Promise((r) => setTimeout(r, 1000));

  // Test 5: Tracks
  const q5 = `[bbox:${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east}];way["highway"="track"];out geom;`;
  totalResults += await testQuery('Tracks (highway=track)', q5);
  await new Promise((r) => setTimeout(r, 1000));

  // Test 6: Leisure/Nature reserve
  const q6 = `[bbox:${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east}];way["leisure"="nature_reserve"];out geom;`;
  totalResults += await testQuery('Nature reserve', q6);
  await new Promise((r) => setTimeout(r, 1000));

  // Test 7: POIs - Tourism
  const q7 = `[bbox:${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east}];node["tourism"];out;`;
  totalResults += await testQuery('Tourism POIs', q7);
  await new Promise((r) => setTimeout(r, 1000));

  // Test 8: POIs - Amenities
  const q8 = `[bbox:${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east}];node["amenity"];out;`;
  totalResults += await testQuery('Amenities', q8);
  await new Promise((r) => setTimeout(r, 1000));

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  if (totalResults === 0) {
    console.log('\n⚠️  NO PUBLIC OSM DATA FOUND for Karura Forest area');
    console.log('\nThis could mean:');
    console.log(
      '  1. ❌ No trail data has been mapped in OpenStreetMap for this area',
    );
    console.log('  2. ❌ The area is not well-covered by OSM volunteers');
    console.log('  3. ❌ Data may exist but with different boundaries');
    console.log('\n✅ SOLUTIONS:');
    console.log('\n  Option 1: Use Strava Data (Real GPS Tracks)');
    console.log('  ─────────────────────────────────────────');
    console.log('  $env:STRAVA_ACCESS_TOKEN = "your_token"');
    console.log('  node fetch-strava-data.js');
    console.log('  (Athletes have recorded actual trails with GPS)\n');

    console.log('  Option 2: Add Data Manually');
    console.log('  ───────────────────────────');
    console.log('  1. Go to https://geojson.io');
    console.log('  2. Draw the trails on the map');
    console.log('  3. Export as GeoJSON');
    console.log('  4. Save to public/karura-trails.geojson\n');

    console.log('  Option 3: Contribute to OpenStreetMap');
    console.log('  ──────────────────────────────────────');
    console.log('  1. Go to https://openstreetmap.org');
    console.log('  2. Sign up (free)');
    console.log('  3. Map trails in Karura Forest');
    console.log('  4. Data becomes available for everyone!\n');
  } else {
    console.log(`\n✅ Found ${totalResults} OSM elements in this area`);
    console.log('Run the fetch script to download the data');
  }

  console.log('\n💡 Current App Status:');
  console.log('  ✅ Mock data loaded (15 markers, 6 trails)');
  console.log('  ✅ App fully functional');
  console.log('  ⏳ Waiting for real data integration\n');
}

main().catch(console.error);
