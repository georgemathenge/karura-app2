/**
 * Trail Routing System for Karura Forest
 * Implements graph-based pathfinding using A* algorithm
 * Includes snap-to-path, junction detection, and off-track warnings
 */

import * as turf from 'turf';

// Build graph from GeoJSON trails
export class TrailGraph {
  constructor(geojsonTrails) {
    this.trails = geojsonTrails.features;
    this.nodes = new Map(); // Map of node ID -> {lat, lng, connectedSegments: []}
    this.segments = []; // Array of segments with distance and trail info
    this.nodeIndex = 0; // Counter for node IDs

    this.buildGraph();
  }

  buildGraph() {
    // Create nodes at trail endpoints and intersections
    const nodeCoordinateMap = new Map(); // Map of "lng,lat" -> nodeId

    this.trails.forEach((trail, trailIndex) => {
      const coords = trail.geometry.coordinates;

      // Create nodes at endpoints and detect intersections
      for (let i = 0; i < coords.length; i++) {
        const coord = coords[i];
        const key = `${coord[0].toFixed(6)},${coord[1].toFixed(6)}`; // Quantize to match nearby points

        let nodeId;
        if (nodeCoordinateMap.has(key)) {
          nodeId = nodeCoordinateMap.get(key);
        } else {
          nodeId = this.nodeIndex++;
          nodeCoordinateMap.set(key, nodeId);
          this.nodes.set(nodeId, {
            latitude: coord[1],
            longitude: coord[0],
            connectedSegments: [],
          });
        }

        // Create segments between consecutive trail points
        if (i < coords.length - 1) {
          const nextCoord = coords[i + 1];
          const nextKey = `${nextCoord[0].toFixed(6)},${nextCoord[1].toFixed(6)}`;

          let nextNodeId;
          if (nodeCoordinateMap.has(nextKey)) {
            nextNodeId = nodeCoordinateMap.get(nextKey);
          } else {
            nextNodeId = this.nodeIndex++;
            nodeCoordinateMap.set(nextKey, nextNodeId);
            this.nodes.set(nextNodeId, {
              latitude: nextCoord[1],
              longitude: nextCoord[0],
              connectedSegments: [],
            });
          }

          // Calculate segment distance
          const startPoint = turf.point(coord);
          const endPoint = turf.point(nextCoord);
          const distance = turf.distance(startPoint, endPoint, 'meters');

          const segmentId = this.segments.length;
          this.segments.push({
            id: segmentId,
            startNode: nodeId,
            endNode: nextNodeId,
            startCoord: coord,
            endCoord: nextCoord,
            distance, // meters
            trail: trail.properties?.name || `Trail ${trailIndex}`,
            trailIndex,
            coordinates: [coord, nextCoord],
          });

          // Link segments to nodes
          this.nodes.get(nodeId).connectedSegments.push({
            segmentId,
            direction: 'forward',
            targetNode: nextNodeId,
          });
          this.nodes.get(nextNodeId).connectedSegments.push({
            segmentId,
            direction: 'backward',
            targetNode: nodeId,
          });
        }
      }
    });
  }

  // Find nearest point on trail network and which segment it's on
  snapToTrail(userLat, userLng, maxSnapDistance = 50) {
    const userPoint = turf.point([userLng, userLat]);
    let closestPoint = null;
    let closestSegment = null;
    let closestDistance = maxSnapDistance;

    this.segments.forEach((segment) => {
      const segmentLine = turf.lineString([segment.startCoord, segment.endCoord]);
      const projectedPoint = this.projectPointOntoSegment(
        userPoint,
        segment.startCoord,
        segment.endCoord
      );

      const distToSegment = turf.distance(userPoint, projectedPoint, 'meters');

      if (distToSegment < closestDistance) {
        closestDistance = distToSegment;
        closestPoint = {
          latitude: projectedPoint.geometry.coordinates[1],
          longitude: projectedPoint.geometry.coordinates[0],
          distance: distToSegment,
        };
        closestSegment = segment;
      }
    });

    return closestPoint
      ? { ...closestPoint, segment: closestSegment }
      : null;
  }

  // Project a point onto a line segment
  projectPointOntoSegment(point, segStart, segEnd) {
    const px = point.geometry.coordinates[0];
    const py = point.geometry.coordinates[1];

    const x1 = segStart[0];
    const y1 = segStart[1];
    const x2 = segEnd[0];
    const y2 = segEnd[1];

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;

    let t;
    if (lengthSquared === 0) {
      t = 0;
    } else {
      t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
    }

    const projLng = x1 + t * dx;
    const projLat = y1 + t * dy;

    return turf.point([projLng, projLat]);
  }

  // Find shortest path between two points using A* algorithm
  findPath(startLat, startLng, endLat, endLng, maxSnapDistance = 50) {
    // Snap start and end to trail network
    const startSnap = this.snapToTrail(startLat, startLng, maxSnapDistance);
    const endSnap = this.snapToTrail(endLat, endLng, maxSnapDistance);

    if (!startSnap || !endSnap) {
      console.warn('Could not snap start or end point to trail network');
      return null;
    }

    // Find start and end nodes
    const startNode = this.findNearestNode(startSnap.latitude, startSnap.longitude);
    const endNode = this.findNearestNode(endSnap.latitude, endSnap.longitude);

    if (startNode === null || endNode === null) {
      console.warn('Could not find start or end node');
      return null;
    }

    // A* pathfinding
    const path = this.aStarSearch(startNode, endNode);

    if (!path || path.length === 0) {
      console.warn('No path found between nodes');
      return null;
    }

    // Convert node path to waypoints with segments
    const waypoints = [];
    let totalDistance = 0;

    // Add initial snap point
    waypoints.push({
      type: 'snap',
      latitude: startSnap.latitude,
      longitude: startSnap.longitude,
      segment: startSnap.segment,
      distanceFromStart: 0,
    });

    // Add path segments
    for (let i = 0; i < path.length - 1; i++) {
      const currentNodeId = path[i];
      const nextNodeId = path[i + 1];

      // Find segment connecting these nodes
      const currentNode = this.nodes.get(currentNodeId);
      const segmentInfo = currentNode.connectedSegments.find(
        (conn) => conn.targetNode === nextNodeId
      );

      if (segmentInfo) {
        const segment = this.segments[segmentInfo.segmentId];

        // Add node as waypoint
        const node = this.nodes.get(nextNodeId);
        waypoints.push({
          type: 'junction',
          nodeId: nextNodeId,
          latitude: node.latitude,
          longitude: node.longitude,
          segment,
          distanceFromStart: totalDistance + segment.distance,
        });

        totalDistance += segment.distance;
      }
    }

    // Add final snap point
    waypoints.push({
      type: 'destination',
      latitude: endSnap.latitude,
      longitude: endSnap.longitude,
      distanceFromStart: totalDistance,
    });

    return {
      waypoints,
      totalDistance, // meters
      startSnap,
      endSnap,
      segments: path.map((nodeId) => ({
        nodeId,
        node: this.nodes.get(nodeId),
      })),
    };
  }

  // A* algorithm for finding shortest path
  aStarSearch(startNodeId, endNodeId) {
    const openSet = new Set([startNodeId]);
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const heuristic = (nodeId) => {
      const node = this.nodes.get(nodeId);
      const endNode = this.nodes.get(endNodeId);
      return turf.distance(
        turf.point([node.longitude, node.latitude]),
        turf.point([endNode.longitude, endNode.latitude]),
        'meters'
      );
    };

    // Initialize scores
    this.nodes.forEach((node, nodeId) => {
      gScore.set(nodeId, Infinity);
      fScore.set(nodeId, Infinity);
    });

    gScore.set(startNodeId, 0);
    fScore.set(startNodeId, heuristic(startNodeId));

    while (openSet.size > 0) {
      // Find node with lowest fScore
      let current = null;
      let lowestFScore = Infinity;

      openSet.forEach((nodeId) => {
        if (fScore.get(nodeId) < lowestFScore) {
          lowestFScore = fScore.get(nodeId);
          current = nodeId;
        }
      });

      if (current === endNodeId) {
        // Reconstruct path
        const path = [current];
        while (cameFrom.has(current)) {
          current = cameFrom.get(current);
          path.unshift(current);
        }
        return path;
      }

      openSet.delete(current);

      // Check neighbors
      const currentNode = this.nodes.get(current);
      currentNode.connectedSegments.forEach((conn) => {
        const neighbor = conn.targetNode;
        const segment = this.segments[conn.segmentId];
        const tentativeGScore = gScore.get(current) + segment.distance;

        if (tentativeGScore < gScore.get(neighbor)) {
          cameFrom.set(neighbor, current);
          gScore.set(neighbor, tentativeGScore);
          fScore.set(neighbor, tentativeGScore + heuristic(neighbor));

          if (!openSet.has(neighbor)) {
            openSet.add(neighbor);
          }
        }
      });
    }

    return null; // No path found
  }

  // Find nearest node to a coordinate
  findNearestNode(lat, lng, maxDistance = 100) {
    const point = turf.point([lng, lat]);
    let nearestNodeId = null;
    let nearestDistance = maxDistance;

    this.nodes.forEach((node, nodeId) => {
      const distance = turf.distance(point, turf.point([node.longitude, node.latitude]), 'meters');

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestNodeId = nodeId;
      }
    });

    return nearestNodeId;
  }

  // Get coordinates for rendering path as polyline
  getPathCoordinates(pathInfo) {
    if (!pathInfo || !pathInfo.waypoints) {
      return [];
    }

    const coords = [];

    // Add snap line
    if (pathInfo.startSnap) {
      coords.push([
        pathInfo.startSnap.latitude,
        pathInfo.startSnap.longitude,
      ]);
    }

    // Add trail coordinates
    pathInfo.waypoints.forEach((waypoint, index) => {
      if (waypoint.segment) {
        // Add segment coordinates
        waypoint.segment.coordinates.forEach(([lng, lat]) => {
          coords.push([lat, lng]);
        });
      } else {
        // Add waypoint
        coords.push([waypoint.latitude, waypoint.longitude]);
      }
    });

    return coords;
  }

  // Find next junction ahead on current path
  getNextJunction(currentWaypoint, pathInfo) {
    if (!pathInfo || !pathInfo.waypoints) {
      return null;
    }

    for (let i = 0; i < pathInfo.waypoints.length; i++) {
      const waypoint = pathInfo.waypoints[i];
      if (waypoint.type === 'junction') {
        return waypoint;
      }
    }

    return null;
  }

  // Check if user is off-track
  isOffTrack(userLat, userLng, currentSegment, offTrackThreshold = 30) {
    if (!currentSegment) return false;

    const userPoint = turf.point([userLng, userLat]);
    const projectedPoint = this.projectPointOntoSegment(
      userPoint,
      currentSegment.startCoord,
      currentSegment.endCoord
    );

    const distance = turf.distance(userPoint, projectedPoint, 'meters');

    return distance > offTrackThreshold;
  }
}

// Calculate bearing from point A to point B (0-360 degrees, 0 = North)
export function calculateBearing(fromLat, fromLng, toLat, toLng) {
  const lat1 = (fromLat * Math.PI) / 180;
  const lat2 = (toLat * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let bearing = Math.atan2(y, x);
  bearing = (bearing * 180) / Math.PI;
  bearing = (bearing + 360) % 360;

  return bearing;
}

// Format distance for display
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
}

// Estimate walking time (average 1.4 m/s or 5 km/h)
export function estimateWalkingTime(meters) {
  const walkingSpeedMs = 1.4;
  const seconds = meters / walkingSpeedMs;
  const minutes = Math.round(seconds / 60);

  if (minutes < 1) return `${Math.round(seconds)}s`;
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}
