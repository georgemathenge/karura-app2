import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import * as turf from 'turf';
import {
  Navigation,
  Award,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  AlertTriangle,
} from 'lucide-react';
import './MapComponent.css';
import {
  TrailGraph,
  calculateBearing,
  formatDistance,
  estimateWalkingTime,
} from './trailRouting';

// Fix for Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const MapComponent = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [snappedLocation, setSnappedLocation] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [trails, setTrails] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [guidePath, setGuidePath] = useState(null);
  const [visitedMarkers, setVisitedMarkers] = useState(new Set());
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [markerName, setMarkerName] = useState('');
  const [pendingMarkerLocation, setPendingMarkerLocation] = useState(null);
  const [editingMarker, setEditingMarker] = useState(null);
  const [startMarker, setStartMarker] = useState(null);
  const [routeMarkers, setRouteMarkers] = useState([]);
  const [currentRouteIndex, setCurrentRouteIndex] = useState(-1);
  const [arrivedAtDestination, setArrivedAtDestination] = useState(false);
  const [journeyTotal, setJourneyTotal] = useState(0);
  const [journeyCompleted, setJourneyCompleted] = useState(0);
  const [trailGraph, setTrailGraph] = useState(null);
  const [activeRoutePath, setActiveRoutePath] = useState(null);
  const [nextJunction, setNextJunction] = useState(null);
  const [isOffTrack, setIsOffTrack] = useState(false);
  const [mapBearing, setMapBearing] = useState(0); // For course-up rotation
  const [estimatedTime, setEstimatedTime] = useState('');
  const [currentSegment, setCurrentSegment] = useState(null);

  const userMarkerRef = useRef(null);
  const snappedMarkerRef = useRef(null);
  const breadcrumbPolylineRef = useRef(null);
  const guidePathPolylineRef = useRef(null);
  const markerLayersRef = useRef({});
  const trailLayersRef = useRef([]);
  const routeMarkerLayersRef = useRef([]);
  const routePolylineRef = useRef(null);
  const distanceLabelRef = useRef([]);
  const snapLineRef = useRef(null);
  const nextJunctionMarkerRef = useRef(null);
  const trailGraphRef = useRef(null);

  // Load GeoJSON trails and markers, build trail graph
  useEffect(() => {
    const loadData = async () => {
      try {
        const trailsResponse = await fetch('/karura-trails.geojson');
        const trailsData = await trailsResponse.json();
        setTrails(trailsData);

        console.log('Trails loaded:', trailsData.features.length);

        // Build trail graph for pathfinding
        const graph = new TrailGraph(trailsData);
        setTrailGraph(graph);
        trailGraphRef.current = graph;
        console.log('TrailGraph built and ready');

        const markersResponse = await fetch('/markers.json');
        const markersData = await markersResponse.json();
        setMarkers(markersData.markers);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  // Initialize map
  useEffect(() => {
    if (mapContainer.current && !map.current) {
      map.current = L.map(mapContainer.current).setView([-1.303, 36.805], 15);

      // Use satellite/aerial tiles for better trail visibility
      const satelliteTiles = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '© Esri, DigitalGlobe, Earthstar Geographics',
          maxZoom: 18,
        },
      );
      satelliteTiles.addTo(map.current);

      // Apply dark overlay for better contrast
      mapContainer.current.style.filter = 'brightness(0.9) contrast(1.1)';

      // Add click handler for adding markers
      map.current.on('click', (e) => {
        if (isAddingMarker) {
          setPendingMarkerLocation(e.latlng);
        }
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isAddingMarker]);

  // Render trails on map
  useEffect(() => {
    if (map.current && trails) {
      trailLayersRef.current.forEach((layer) => map.current.removeLayer(layer));
      trailLayersRef.current = [];

      trails.features.forEach((feature) => {
        const polyline = L.polyline(
          feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
          { color: '#10b981', weight: 4, opacity: 0.8 },
        );
        polyline.addTo(map.current);
        trailLayersRef.current.push(polyline);
      });
    }
  }, [trails]);

  // Render markers on map
  useEffect(() => {
    if (!map.current) {
      console.log('Map not ready yet, deferring marker rendering');
      return;
    }

    console.log('Rendering markers:', markers.length);

    if (markers.length > 0) {
      try {
        // Remove existing markers
        Object.values(markerLayersRef.current).forEach((layer) => {
          try {
            map.current.removeLayer(layer);
          } catch (e) {
            // Layer might already be removed
          }
        });
        markerLayersRef.current = {};

        // Add new markers
        markers.forEach((marker) => {
          try {
            const isVisited = visitedMarkers.has(marker.id);
            const color = isVisited ? '#22c55e' : '#6b7280';

            const markerIcon = L.divIcon({
              html: `
                <div style="
                  background: ${color};
                  color: white;
                  border-radius: 50%;
                  width: 36px;
                  height: 36px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  font-size: 14px;
                  border: 3px solid white;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  cursor: pointer;
                  transition: all 0.3s ease;
                ">
                  ${marker.id}
                </div>
              `,
              iconSize: [36, 36],
              className: 'custom-marker',
            });

            const leafletMarker = L.marker([marker.latitude, marker.longitude], {
              icon: markerIcon,
            });

            leafletMarker.bindPopup(
              `<strong>${marker.name}</strong><br/>${marker.description}<br/>
              <button onclick="window.selectMarker(${marker.id})" style="margin-top: 8px; padding: 4px 8px; background: #0ea5e9; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Navigate to
              </button>`,
            );

            leafletMarker.on('click', () => {
              setSelectedMarker(marker);
            });

            if (map.current) {
              leafletMarker.addTo(map.current);
              markerLayersRef.current[marker.id] = leafletMarker;
            }
          } catch (error) {
            console.error('Error rendering marker', marker.id, ':', error);
          }
        });

        // Make selectMarker available globally
        window.selectMarker = (id) => {
          const marker = markers.find((m) => m.id === id);
          if (marker) setSelectedMarker(marker);
        };

        console.log('Successfully rendered', Object.keys(markerLayersRef.current).length, 'markers');
      } catch (error) {
        console.error('Error in marker rendering effect:', error);
      }
    }
  }, [markers, visitedMarkers]);

  // Handle adding new marker
  const handleSaveMarker = useCallback(() => {
    if (!pendingMarkerLocation || !markerName.trim()) {
      alert('Please enter a marker name');
      return;
    }

    const newMarker = {
      id: Math.max(0, ...markers.map((m) => m.id)) + 1,
      name: markerName,
      description: 'User-added marker',
      latitude: pendingMarkerLocation.lat,
      longitude: pendingMarkerLocation.lng,
      type: 'landmark',
    };

    setMarkers([...markers, newMarker]);
    setMarkerName('');
    setPendingMarkerLocation(null);
    setIsAddingMarker(false);

    // Save to localStorage
    localStorage.setItem(
      'karura_custom_markers',
      JSON.stringify([...markers, newMarker]),
    );
  }, [pendingMarkerLocation, markerName, markers]);

  // Handle deleting marker
  const handleDeleteMarker = useCallback(
    (markerId) => {
      const updated = markers.filter((m) => m.id !== markerId);
      setMarkers(updated);
      localStorage.setItem('karura_custom_markers', JSON.stringify(updated));
      if (selectedMarker?.id === markerId) {
        setSelectedMarker(null);
      }
    },
    [markers, selectedMarker],
  );

  // Set starting point for journey
  const handleSetStart = useCallback((marker) => {
    setStartMarker(marker);
    setRouteMarkers([]);
    setCurrentRouteIndex(-1);
    setJourneyTotal(0);
    setJourneyCompleted(0);
    setArrivedAtDestination(false);
  }, []);

  // Add marker to route sequence
  const handleAddToRoute = useCallback(
    (marker) => {
      if (marker.id === startMarker?.id) {
        alert('Cannot add starting point to route again');
        return;
      }

      if (routeMarkers.some((m) => m.id === marker.id)) {
        alert('Marker already in route');
        return;
      }

      const newRoute = [...routeMarkers, marker];
      setRouteMarkers(newRoute);

      // Calculate total journey distance
      let total = 0;
      let prevMarker = startMarker;

      try {
        for (let i = 0; i < newRoute.length; i++) {
          const point1 = turf.point([prevMarker.longitude, prevMarker.latitude]);
          const point2 = turf.point([
            newRoute[i].longitude,
            newRoute[i].latitude,
          ]);
          total += turf.distance(point1, point2, 'kilometers');
          prevMarker = newRoute[i];
        }
      } catch (error) {
        console.error('Distance calculation error:', error);
        total = 0;
      }

      setJourneyTotal(total);
      setCurrentRouteIndex(0);
    },
    [startMarker, routeMarkers],
  );

  // Start journey to first marker in route with A* pathfinding
  const handleStartJourney = useCallback(() => {
    console.log('Start journey clicked');
    console.log('Route markers:', routeMarkers.length);
    console.log('Trail graph ready:', trailGraphRef.current ? 'yes' : 'no');
    console.log('User location:', userLocation);

    if (routeMarkers.length === 0) {
      alert('Add markers to your route first');
      return;
    }

    if (!trailGraphRef.current) {
      alert('Trail data still loading... please wait a moment');
      return;
    }

    if (!userLocation) {
      alert('Waiting for GPS fix... please enable location');
      return;
    }

    // Calculate path from current position to first marker using A*
    try {
      console.log('Finding path from', userLocation, 'to', routeMarkers[0]);

      // If the user has set a start marker and is far away, offer to use it
      let startLat = userLocation.latitude;
      let startLng = userLocation.longitude;
      if (startMarker) {
        try {
          const userToStart = turf.distance(
            turf.point([userLocation.longitude, userLocation.latitude]),
            turf.point([startMarker.longitude, startMarker.latitude]),
            'meters'
          );
          console.log('Distance to selected start marker:', Math.round(userToStart), 'm');
          if (userToStart > 2000) {
            const useStart = window.confirm(
              `You are ${Math.round(userToStart)}m away from the selected start marker. Use the selected marker as the journey start instead of your current GPS location?`
            );
            if (useStart) {
              startLat = startMarker.latitude;
              startLng = startMarker.longitude;
              console.log('Using selected start marker as start point');
            }
          }
        } catch (e) {
          console.warn('Could not compute distance to start marker:', e);
        }
      }
      // Inspect snap distances first for better diagnostics
      const startSnapInfo = trailGraphRef.current.snapToTrail(
        startLat,
        startLng,
        500
      );
      const endSnapInfo = trailGraphRef.current.snapToTrail(
        routeMarkers[0].latitude,
        routeMarkers[0].longitude,
        500
      );

      console.log('Start snap:', startSnapInfo);
      console.log('End snap:', endSnapInfo);

      // First try a conservative snap distance, then expand if needed
      let pathInfo = trailGraphRef.current.findPath(
        startLat,
        startLng,
        routeMarkers[0].latitude,
        routeMarkers[0].longitude,
        50 // initial max snap distance (meters)
      );

      console.log('Initial path attempt (50m):', pathInfo ? 'found' : 'not found');

      // If not found, try wider snap radii to accommodate slight GPS/trail mismatches
      if (!pathInfo) {
        pathInfo = trailGraphRef.current.findPath(
          startLat,
          startLng,
          routeMarkers[0].latitude,
          routeMarkers[0].longitude,
          200
        );
        console.log('Second path attempt (200m):', pathInfo ? 'found' : 'not found');
      }

      if (!pathInfo) {
        pathInfo = trailGraphRef.current.findPath(
          startLat,
          startLng,
          routeMarkers[0].latitude,
          routeMarkers[0].longitude,
          500
        );
        console.log('Third path attempt (500m):', pathInfo ? 'found' : 'not found');
      }

      console.log('Final path result:', pathInfo ? 'found' : 'not found');

      // If path wasn't found by snapping, fallback to nearest-node routing
      if (!pathInfo) {
        console.log('Attempting nearest-node fallback routing');
        const startNode = trailGraphRef.current.findNearestNode(
          userLocation.latitude,
          userLocation.longitude,
          5000
        );
        const endNode = trailGraphRef.current.findNearestNode(
          routeMarkers[0].latitude,
          routeMarkers[0].longitude,
          5000
        );

        console.log('Nearest nodes:', { startNode, endNode });

        if (startNode !== null && endNode !== null) {
          const nodesPath = trailGraphRef.current.aStarSearch(startNode, endNode);
          if (nodesPath && nodesPath.length > 0) {
            // Build a pathInfo-like object from nodesPath
            const waypoints = [];
            let totalDistance = 0;

            // Start waypoint: nearest node to user
            const startNodeObj = trailGraphRef.current.nodes.get(startNode);
            waypoints.push({
              type: 'snap',
              latitude: startNodeObj.latitude,
              longitude: startNodeObj.longitude,
              segment: null,
              distanceFromStart: 0,
            });

            for (let i = 0; i < nodesPath.length - 1; i++) {
              const currentNodeId = nodesPath[i];
              const nextNodeId = nodesPath[i + 1];

              const currentNode = trailGraphRef.current.nodes.get(currentNodeId);
              const conn = currentNode.connectedSegments.find((c) => c.targetNode === nextNodeId);
              if (conn) {
                const segment = trailGraphRef.current.segments[conn.segmentId];
                totalDistance += segment.distance;
                const nextNode = trailGraphRef.current.nodes.get(nextNodeId);
                waypoints.push({
                  type: 'junction',
                  nodeId: nextNodeId,
                  latitude: nextNode.latitude,
                  longitude: nextNode.longitude,
                  segment,
                  distanceFromStart: totalDistance,
                });
              }
            }

            // Destination waypoint: nearest node to destination
            const endNodeObj = trailGraphRef.current.nodes.get(endNode);
            waypoints.push({
              type: 'destination',
              latitude: endNodeObj.latitude,
              longitude: endNodeObj.longitude,
              distanceFromStart: totalDistance,
            });

            pathInfo = {
              waypoints,
              totalDistance,
              startSnap: { latitude: startNodeObj.latitude, longitude: startNodeObj.longitude },
              endSnap: { latitude: endNodeObj.latitude, longitude: endNodeObj.longitude },
              segments: nodesPath.map((nodeId) => ({ nodeId, node: trailGraphRef.current.nodes.get(nodeId) })),
            };

            console.log('Fallback path built, distance:', totalDistance);
          } else {
            console.log('Nearest-node A* failed to find connecting path');
          }
        } else {
          console.log('Could not find nearby graph nodes for fallback routing');
        }
      }

      if (pathInfo) {
        console.log('Path distance:', pathInfo.totalDistance, 'meters');
        setActiveRoutePath(pathInfo);
        setEstimatedTime(estimateWalkingTime(pathInfo.totalDistance));

        // Auto-zoom to fit entire path
        if (map.current) {
          const coords = trailGraphRef.current.getPathCoordinates(pathInfo);
          console.log('Path coordinates:', coords.length);
          
          if (coords.length > 0) {
            const latLngs = coords.map(([lat, lng]) => L.latLng(lat, lng));
            const bounds = L.latLngBounds(latLngs);
            map.current.fitBounds(bounds, { padding: [50, 50] });
            console.log('Map zoomed to path');
          }
        }

        // Start journey
        setCurrentRouteIndex(0);
        setSelectedMarker(routeMarkers[0]);
        setArrivedAtDestination(false);
        console.log('Journey started');
      } else {
        // Provide actionable diagnostics to the user
        try {
          const straightDist = turf.distance(
            turf.point([userLocation.longitude, userLocation.latitude]),
            turf.point([routeMarkers[0].longitude, routeMarkers[0].latitude]),
            'meters'
          );

          const startSnap = trailGraphRef.current.snapToTrail(
            userLocation.latitude,
            userLocation.longitude,
            1000
          );
          const endSnap = trailGraphRef.current.snapToTrail(
            routeMarkers[0].latitude,
            routeMarkers[0].longitude,
            1000
          );

          const startSnapDist = startSnap ? Math.round(startSnap.distance) + 'm' : 'not near trails';
          const endSnapDist = endSnap ? Math.round(endSnap.distance) + 'm' : 'not near trails';

          alert(
            `Could not find path on trail network. Straight-line distance: ${Math.round(straightDist)}m.\n` +
              `Distance to nearest trail — you: ${startSnapDist}, destination: ${endSnapDist}.\n` +
              `Try choosing a closer destination or move nearer a mapped trail.`
          );
        } catch (e) {
          alert('Could not find path on trail network. Try a closer destination.');
        }
      }
    } catch (error) {
      console.error('Path calculation error:', error);
      alert('Error calculating path: ' + error.message);
    }
  }, [routeMarkers, userLocation]);

  // Advance to next marker in route and recalculate path
  const handleNextMarker = useCallback(() => {
    if (currentRouteIndex < routeMarkers.length - 1) {
      const nextIndex = currentRouteIndex + 1;
      const nextMarker = routeMarkers[nextIndex];

      // Recalculate path to new destination
      if (trailGraphRef.current && userLocation) {
        try {
          const pathInfo = trailGraphRef.current.findPath(
            userLocation.latitude,
            userLocation.longitude,
            nextMarker.latitude,
            nextMarker.longitude,
            50
          );

          if (pathInfo) {
            setActiveRoutePath(pathInfo);
            setEstimatedTime(estimateWalkingTime(pathInfo.totalDistance));

            // Auto-zoom to new path
            if (map.current) {
              const coords = trailGraphRef.current.getPathCoordinates(pathInfo);
              if (coords.length > 0) {
                const latLngs = coords.map(([lat, lng]) => L.latLng(lat, lng));
                const bounds = L.latLngBounds(latLngs);
                map.current.fitBounds(bounds, { padding: [50, 50] });
              }
            }
          }
        } catch (error) {
          console.error('Path recalculation error:', error);
        }
      }

      setCurrentRouteIndex(nextIndex);
      setSelectedMarker(nextMarker);
      setArrivedAtDestination(false);
    } else {
      // Journey complete!
      alert('🎉 Journey complete! All markers visited!');
      setJourneyCompleted(journeyCompleted + 1);
      setRouteMarkers([]);
      setCurrentRouteIndex(-1);
      setSelectedMarker(null);
      setActiveRoutePath(null);
    }
  }, [currentRouteIndex, routeMarkers, journeyCompleted, trailGraphRef, userLocation]);

  // Clear route and return to normal navigation
  const handleClearRoute = useCallback(() => {
    setRouteMarkers([]);
    setCurrentRouteIndex(-1);
    setSelectedMarker(null);
    setStartMarker(null);
    setArrivedAtDestination(false);
  }, []);

  // Render advanced route visualization with A* path and course-up
  useEffect(() => {
    if (!map.current) return;

    // Clear existing route visualization
    routeMarkerLayersRef.current.forEach((marker) => {
      if (map.current) map.current.removeLayer(marker);
    });
    routeMarkerLayersRef.current = [];

    if (routePolylineRef.current) {
      map.current.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    if (snapLineRef.current) {
      map.current.removeLayer(snapLineRef.current);
      snapLineRef.current = null;
    }

    if (nextJunctionMarkerRef.current) {
      map.current.removeLayer(nextJunctionMarkerRef.current);
      nextJunctionMarkerRef.current = null;
    }

    // Only show when journey is active
    if (currentRouteIndex < 0 || !activeRoutePath) return;

    // Stage 1: Render snap line (gray dashed)
    if (userLocation && activeRoutePath.startSnap) {
      try {
        snapLineRef.current = L.polyline(
          [
            [userLocation.latitude, userLocation.longitude],
            [activeRoutePath.startSnap.latitude, activeRoutePath.startSnap.longitude],
          ],
          {
            color: '#9ca3af',
            weight: 2,
            opacity: 0.6,
            dashArray: '5, 5',
          }
        ).addTo(map.current);
      } catch (error) {
        console.error('Snap line error:', error);
      }
    }

    // Stage 2 & 3: Render main trail path (glowing green)
    const coords = trailGraphRef.current.getPathCoordinates(activeRoutePath);
    if (coords.length > 0) {
      routePolylineRef.current = L.polyline(coords, {
        color: '#10b981',
        weight: 6,
        opacity: 0.9,
        dashArray: '2, 4',
        className: 'active-route-glow',
      }).addTo(map.current);
    }

    // Add current destination marker (green)
    const currentDestination = routeMarkers[currentRouteIndex];
    const destIcon = L.divIcon({
      html: `
        <div style="
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
          font-weight: bold;
          font-size: 18px;
        ">
          📍
        </div>
      `,
      iconSize: [48, 48],
      className: 'destination-marker',
    });

    const destMarker = L.marker([currentDestination.latitude, currentDestination.longitude], {
      icon: destIcon,
    }).addTo(map.current);

    routeMarkerLayersRef.current.push(destMarker);

    // Add direction arrow to next junction
    if (userLocation && nextJunction) {
      try {
        const bearing = calculateBearing(
          userLocation.latitude,
          userLocation.longitude,
          nextJunction.latitude,
          nextJunction.longitude
        );

        const arrowIcon = L.divIcon({
          html: `
            <div style="
              transform: rotate(${bearing}deg);
              font-size: 32px;
              filter: drop-shadow(0 2px 8px rgba(0,0,0,0.6));
            ">
              ➔
            </div>
          `,
          iconSize: [32, 32],
          className: 'direction-arrow',
        });

        const arrowMarker = L.marker(
          [nextJunction.latitude, nextJunction.longitude],
          { icon: arrowIcon }
        ).addTo(map.current);

        routeMarkerLayersRef.current.push(arrowMarker);
      } catch (error) {
        console.error('Direction arrow error:', error);
      }
    }

    // Apply course-up rotation (map rotates to face direction of travel)
    if (mapBearing !== 0 && map.current.getBearing) {
      try {
        map.current.setBearing(-mapBearing); // Negative because map rotates opposite
      } catch (error) {
        // Leaflet doesn't support bearing natively, would need Leaflet.Rotatedmarker
        // For now, we'll skip the rotation feature
      }
    }

    // Auto-center on user with padding
    if (userLocation) {
      map.current.setView([userLocation.latitude, userLocation.longitude], null, {
        animate: true,
        duration: 0.5,
      });
    }
  }, [currentRouteIndex, activeRoutePath, userLocation, nextJunction, mapBearing, routeMarkers]);

  // Live distance recalculation during active journey
  useEffect(() => {
    if (currentRouteIndex < 0 || !activeRoutePath || !userLocation || !trailGraphRef.current) {
      setDistanceRemaining(0);
      return;
    }

    try {
      // Recalculate distance from current user position to destination
      const currentDestination = routeMarkers[currentRouteIndex];
      const updatedPath = trailGraphRef.current.findPath(
        userLocation.latitude,
        userLocation.longitude,
        currentDestination.latitude,
        currentDestination.longitude,
        50
      );

      if (updatedPath) {
        setDistanceRemaining(updatedPath.totalDistance);
        setEstimatedTime(estimateWalkingTime(updatedPath.totalDistance));
        setActiveRoutePath(updatedPath);

        // Find next junction for guidance
        const nextJunctionWaypoint = updatedPath.waypoints.find(
          (wp) => wp.type === 'junction'
        );
        if (nextJunctionWaypoint) {
          setNextJunction({
            latitude: nextJunctionWaypoint.latitude,
            longitude: nextJunctionWaypoint.longitude,
            segment: nextJunctionWaypoint.segment,
          });
        }
      }
    } catch (error) {
      console.error('Distance recalculation error:', error);
    }
  }, [userLocation, currentRouteIndex, activeRoutePath, routeMarkers]);

  // Load custom markers from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('karura_custom_markers');
    if (saved) {
      try {
        const customMarkers = JSON.parse(saved);
        setMarkers((prev) => [...prev, ...customMarkers]);
      } catch (e) {
        console.error('Error loading custom markers:', e);
      }
    }
  }, []);

  // Real-time geolocation tracking
  useEffect(() => {
    let watchId = null;

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
        },
        (error) => console.error('Geolocation error:', error),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 },
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Snap user location to nearest trail using TrailGraph
  useEffect(() => {
    if (userLocation && trailGraphRef.current) {
      const snappedResult = trailGraphRef.current.snapToTrail(
        userLocation.latitude,
        userLocation.longitude,
        50 // 50m max snap distance
      );

      if (snappedResult) {
        setSnappedLocation({
          latitude: snappedResult.latitude,
          longitude: snappedResult.longitude,
        });
        setCurrentSegment(snappedResult.segment);

        // Calculate map bearing for course-up (direction user is moving)
        if (breadcrumbs.length > 0) {
          const lastBc = breadcrumbs[breadcrumbs.length - 1];
          const bearing = calculateBearing(
            lastBc.latitude,
            lastBc.longitude,
            userLocation.latitude,
            userLocation.longitude
          );
          setMapBearing(bearing);
        }

        // Update user marker on map
        if (map.current) {
          if (userMarkerRef.current) {
            map.current.removeLayer(userMarkerRef.current);
          }

          const userIcon = L.divIcon({
            html: `
              <div style="
                background: #0ea5e9;
                color: white;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.5);
              ">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                </svg>
              </div>
            `,
            iconSize: [24, 24],
            className: 'user-marker',
          });

          userMarkerRef.current = L.marker([userLocation.latitude, userLocation.longitude], {
            icon: userIcon,
          }).addTo(map.current);

          // Pan map to follow user (only if not on active journey, let journey auto-center)
          if (currentRouteIndex < 0) {
            map.current.setView([userLocation.latitude, userLocation.longitude]);
          }
        }

        // Add to breadcrumbs
        setBreadcrumbs((prev) => {
          const newBreadcrumbs = [...prev, { latitude: userLocation.latitude, longitude: userLocation.longitude }];
          return newBreadcrumbs.slice(-100);
        });

        // Check if near any markers (20m radius) for achievements
        markers.forEach((marker) => {
          const markerPoint = turf.point([marker.longitude, marker.latitude]);
          const userPoint = turf.point([userLocation.longitude, userLocation.latitude]);
          const distance = turf.distance(userPoint, markerPoint, 'meters');

          if (distance < 20 && !visitedMarkers.has(marker.id)) {
            setVisitedMarkers((prev) => new Set([...prev, marker.id]));
          }

          // Check if arrived at current navigation destination (30m radius)
          if (
            selectedMarker &&
            marker.id === selectedMarker.id &&
            distance < 30 &&
            !arrivedAtDestination
          ) {
            setArrivedAtDestination(true);
          }
        });

        // Check if off-track during active journey
        if (currentRouteIndex >= 0 && snappedResult.segment) {
          const offTrack = trailGraphRef.current.isOffTrack(
            userLocation.latitude,
            userLocation.longitude,
            snappedResult.segment,
            30 // 30m threshold
          );
          setIsOffTrack(offTrack);
        } else {
          setIsOffTrack(false);
        }
      }
    }
  }, [
    userLocation,
    markers,
    visitedMarkers,
    selectedMarker,
    arrivedAtDestination,
    currentRouteIndex,
    breadcrumbs,
  ]);

  // Update breadcrumb polyline
  useEffect(() => {
    if (map.current && breadcrumbs.length > 1) {
      if (breadcrumbPolylineRef.current) {
        map.current.removeLayer(breadcrumbPolylineRef.current);
      }

      const polylineCoords = breadcrumbs.map((b) => [b.latitude, b.longitude]);
      breadcrumbPolylineRef.current = L.polyline(polylineCoords, {
        color: '#f59e0b',
        weight: 3,
        opacity: 0.6,
        dashArray: '5, 5',
      }).addTo(map.current);
    }
  }, [breadcrumbs]);

  // Calculate path guidance when marker is selected
  useEffect(() => {
    if (selectedMarker && snappedLocation && trails) {
      try {
        let guidingPath = null;
        let shortestDistance = Infinity;

        // Find the best path along trails from snapped location to marker
        trails.features.forEach((feature) => {
          const line = turf.lineString(feature.geometry.coordinates);
          const startPoint = turf.point([
            snappedLocation.longitude,
            snappedLocation.latitude,
          ]);
          const endPoint = turf.point([
            selectedMarker.longitude,
            selectedMarker.latitude,
          ]);

          try {
            // Try to slice the line from start to end
            const sliced = turf.lineSlice(startPoint, endPoint, line);
            const distance = turf.length(sliced, 'kilometers');

            if (distance < shortestDistance) {
              shortestDistance = distance;
              guidingPath = sliced;
            }
          } catch (error) {
            // Path doesn't intersect this line
          }
        });

        if (guidingPath) {
          setDistanceRemaining(shortestDistance);
          setGuidePath(guidingPath);

          // Calculate progress
          const totalDistance =
            breadcrumbs.length > 0
              ? turf.distance(
                  turf.point([
                    breadcrumbs[0].longitude,
                    breadcrumbs[0].latitude,
                  ]),
                  turf.point([
                    snappedLocation.longitude,
                    snappedLocation.latitude,
                  ]),
                  'kilometers',
                )
              : 0;

          const progress =
            totalDistance > 0
              ? (totalDistance / (totalDistance + shortestDistance)) * 100
              : 0;
          setProgressPercent(Math.min(progress, 100));

          // Render guide path on map
          if (map.current) {
            if (guidePathPolylineRef.current) {
              map.current.removeLayer(guidePathPolylineRef.current);
            }

            const coords = guidingPath.geometry.coordinates.map(
              ([lng, lat]) => [lat, lng],
            );
            guidePathPolylineRef.current = L.polyline(coords, {
              color: '#06b6d4',
              weight: 4,
              opacity: 0.8,
              dashArray: '3, 3',
            }).addTo(map.current);
          }
        }
      } catch (error) {
        console.error('Path calculation error:', error);
      }
    } else if (guidePathPolylineRef.current && map.current) {
      map.current.removeLayer(guidePathPolylineRef.current);
      guidePathPolylineRef.current = null;
    }
  }, [selectedMarker, snappedLocation, trails, breadcrumbs]);

  return (
    <div className="map-container">
      <div ref={mapContainer} className="map"></div>

      {/* Navigation HUD - Active Journey */}
      {currentRouteIndex >= 0 && selectedMarker && (
        <div className="hud-overlay journey-active">
          <div className="hud-content">
            {/* Off-Track Warning */}
            {isOffTrack && (
              <div className="off-track-warning">
                <AlertTriangle size={18} />
                <span>⚠️ You are off-trail! Return to marked path.</span>
              </div>
            )}

            <div className="hud-header">
              <Navigation size={20} className="icon" />
              <h2>{selectedMarker.name}</h2>
            </div>

            <div className="hud-distance">
              <MapPin size={16} />
              <span>{formatDistance(distanceRemaining)}</span>
            </div>

            {estimatedTime && (
              <div className="hud-time">
                <span>⏱️ Est. time: {estimatedTime}</span>
              </div>
            )}

            {nextJunction && (
              <div className="hud-next-junction">
                <span>→ Next turn ahead</span>
              </div>
            )}

            <p className="hud-description">{selectedMarker.description}</p>

            <button
              className="hud-close"
              onClick={() => {
                setSelectedMarker(null);
                setCurrentRouteIndex(-1);
                setActiveRoutePath(null);
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Route Planning HUD - Before Journey Starts */}
      {currentRouteIndex < 0 && selectedMarker && routeMarkers.length > 0 && (
        <div className="hud-overlay planning">
          <div className="hud-content">
            <div className="hud-header">
              <Navigation size={20} className="icon" />
              <h2>Route: {routeMarkers.length} stops</h2>
            </div>

            <div className="hud-distance">
              <MapPin size={16} />
              <span>Total: {(journeyTotal).toFixed(2)} km</span>
            </div>

            <p className="hud-description">
              Click "Start Journey" to begin navigation following the trail network.
            </p>

            <div className="hud-buttons">
              <button className="btn-start" onClick={handleStartJourney}>
                🚶 Start Journey
              </button>
              <button className="btn-cancel" onClick={handleClearRoute}>
                Cancel
              </button>
            </div>

            <button
              className="hud-close"
              onClick={() => setSelectedMarker(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Achievements */}
      {visitedMarkers.size > 0 && (
        <div className="achievements-badge">
          <Award size={20} />
          <span>{visitedMarkers.size} visited</span>
        </div>
      )}

      {/* Add Marker Mode */}
      {isAddingMarker && (
        <div className="add-marker-panel">
          <div className="add-marker-content">
            <h3>📍 Click on map to place marker</h3>
            {pendingMarkerLocation && (
              <>
                <input
                  type="text"
                  placeholder="Marker name..."
                  value={markerName}
                  onChange={(e) => setMarkerName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveMarker()}
                  className="marker-input"
                  autoFocus
                />
                <div className="marker-buttons">
                  <button className="btn-save" onClick={handleSaveMarker}>
                    <Save size={16} /> Save
                  </button>
                  <button
                    className="btn-cancel"
                    onClick={() => {
                      setIsAddingMarker(false);
                      setPendingMarkerLocation(null);
                      setMarkerName('');
                    }}
                  >
                    <X size={16} /> Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Marker Button */}
      {!isAddingMarker && (
        <button
          className="btn-add-marker"
          onClick={() => setIsAddingMarker(true)}
          title="Click to add new marker"
        >
          <Plus size={24} />
          <span>Add Marker</span>
        </button>
      )}

      {/* Marker List / Journey Planner */}
      {!selectedMarker && (
        <div className="marker-list">
          <div className="marker-list-header">
            <h3>📍 Markers ({markers.length})</h3>
          </div>

          {/* Journey Planning UI */}
          {!startMarker ? (
            <div className="marker-items">
              <div className="journey-info">
                <p className="journey-hint">Click ⭐ to start a journey</p>
              </div>
              {markers.map((m) => (
                <div
                  key={m.id}
                  className={`marker-item ${visitedMarkers.has(m.id) ? 'visited' : ''}`}
                >
                  <div className="marker-item-info">
                    <div className="marker-item-name">{m.name}</div>
                    <div className="marker-item-desc">{m.description}</div>
                  </div>
                  <div className="marker-item-actions">
                    <button
                      onClick={() => handleSetStart(m)}
                      className="btn-start-journey"
                      title="Set as starting point"
                    >
                      ⭐
                    </button>
                    <button
                      onClick={() => setSelectedMarker(m)}
                      className="btn-navigate"
                      title="Navigate to this marker"
                    >
                      <Navigation size={16} />
                    </button>
                    {m.type === 'landmark' && (
                      <button
                        onClick={() => handleDeleteMarker(m.id)}
                        className="btn-delete"
                        title="Delete this marker"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Route building UI
            <div className="marker-items">
              <div className="journey-status">
                <p className="journey-start">
                  🚀 Start: <strong>{startMarker.name}</strong>
                </p>
                {routeMarkers.length > 0 && (
                  <p className="journey-distance">
                    📏 Total: {journeyTotal.toFixed(1)} km
                  </p>
                )}
              </div>

              {routeMarkers.length > 0 && (
                <div className="route-preview">
                  <p className="route-title">Route:</p>
                  <ol className="route-list">
                    <li className="route-start">{startMarker.name}</li>
                    {routeMarkers.map((m) => (
                      <li key={m.id} className="route-stop">
                        {m.name}
                        <button
                          onClick={() => {
                            const updated = routeMarkers.filter(
                              (x) => x.id !== m.id,
                            );
                            setRouteMarkers(updated);
                          }}
                          className="btn-remove-route"
                          title="Remove from route"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="journey-buttons">
                {routeMarkers.length > 0 && (
                  <button
                    className="btn-start-route"
                    onClick={handleStartJourney}
                    disabled={!trailGraph || !userLocation}
                    title={!trailGraph ? 'Loading trails...' : !userLocation ? 'Waiting for GPS fix' : 'Start navigation'}
                  >
                    🗺️ Start Journey
                  </button>
                )}
                <button className="btn-clear-route" onClick={handleClearRoute}>
                  ✕ Cancel
                </button>
              </div>

              <p className="route-hint">
                {routeMarkers.length === 0
                  ? 'Click markers below to build your route'
                  : `Route: ${routeMarkers.length} stops`}
              </p>

              {markers
                .filter(
                  (m) =>
                    m.id !== startMarker.id &&
                    !routeMarkers.some((r) => r.id === m.id),
                )
                .map((m) => (
                  <div
                    key={m.id}
                    className={`marker-item ${visitedMarkers.has(m.id) ? 'visited' : ''}`}
                  >
                    <div className="marker-item-info">
                      <div className="marker-item-name">{m.name}</div>
                      <div className="marker-item-desc">{m.description}</div>
                    </div>
                    <div className="marker-item-actions">
                      <button
                        onClick={() => handleAddToRoute(m)}
                        className="btn-add-route"
                        title="Add to route"
                      >
                        ➕
                      </button>
                      {m.type === 'landmark' && (
                        <button
                          onClick={() => handleDeleteMarker(m.id)}
                          className="btn-delete"
                          title="Delete this marker"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Active Journey HUD */}
      {currentRouteIndex >= 0 && routeMarkers.length > 0 && (
        <div className="journey-hud">
          <div className="journey-header">
            <h3>🚀 Journey Progress</h3>
            <button className="btn-close-journey" onClick={handleClearRoute}>
              ✕
            </button>
          </div>
          <div className="journey-details">
            <p className="current-stop">
              Stop {currentRouteIndex + 1} of {routeMarkers.length}
            </p>
            <p className="destination-name">
              📍 {routeMarkers[currentRouteIndex].name}
            </p>
            {arrivedAtDestination && (
              <div className="arrival-alert">
                <p>🎉 Destination reached!</p>
                {currentRouteIndex < routeMarkers.length - 1 ? (
                  <button className="btn-next-stop" onClick={handleNextMarker}>
                    Next Stop →
                  </button>
                ) : (
                  <p className="journey-complete">✨ All stops visited!</p>
                )}
              </div>
            )}
            {!arrivedAtDestination && distanceRemaining > 0 && (
              <p className="distance-display">
                📍 {Math.round(distanceRemaining)}m to destination
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
