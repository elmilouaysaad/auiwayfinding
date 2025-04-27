// Configuration for Google Maps
const config = {
    mapProvider: 'google', // Using Google Maps
    initialView: {
      center: [33.539955, -5.107425], // Default campus center
      zoom: 17
    }
  }; 
  
  // Campus locations data
  const locations = {
      main_gate: { name: 'Main Gate', lat: 33.536187, lng: -5.102405 },
      library: { name: 'Mohammed 6 Library', lat: 33.539955, lng: -5.107425 },
      aud_17: { name: 'Auditorium 17', lat: 33.537669, lng: -5.106613 },
      B_56: { name: 'Building 56', lat: 33.542620, lng: -5.106947 },
      B_21: { name: 'Building 21', lat: 33.540701, lng: -5.106833 }
  };
  
  // Predefined paths between locations
  const paths = {
      'main_gate-library': [
          [33.536187, -5.102405],
          [33.536500, -5.103000],
          [33.537000, -5.104000],
          [33.538000, -5.105500],
          [33.539955, -5.107425]
      ],
      'library-B_56': [
          [33.539955, -5.107425],
          [33.540500, -5.107300],
          [33.541500, -5.107100],
          [33.542620, -5.106947]
      ]
  };
  
  // Navigation variables
  let map;
  let userMarker;
  let pathLayer;
  let watchId = null;
  let userPosition = null;
  let destinationReached = false;
  let currentPath = [];
  let destinationId = 'library'; // Default destination
  
  // Initialize when DOM loads
  document.addEventListener('DOMContentLoaded', function() {
      parseURL();
      initNavigation();
      
      // Add refresh button handler if exists
      const refreshBtn = document.getElementById('refresh-gps');
      if (refreshBtn) {
          refreshBtn.addEventListener('click', function() {
              initNavigation();
          });
      }
  });
  
  function parseURL() {
      const urlParams = new URLSearchParams(window.location.search);
      
      // Try different parameter names
      const possibleKeys = ['to', 'destination', 'loc', 'place', 'target'];
      for (const key of possibleKeys) {
          if (urlParams.has(key)) {
              const value = urlParams.get(key);
              if (locations[value]) {
                  destinationId = value;
                  return;
              }
          }
      }
      
      // Try hash fragment
      if (window.location.hash) {
          const hashValue = window.location.hash.substring(1);
          if (locations[hashValue]) {
              destinationId = hashValue;
              return;
          }
      }
  }
  
  function initNavigation() {
      showLoading('Initializing navigation...');
      
      // Clear any existing watch
      if (watchId) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
      }
      
      // Reset navigation state
      userPosition = null;
      destinationReached = false;
      
      // Remove existing map if it exists
      if (map) {
          map.remove();
          map = null;
      }
      
      // Remove existing markers
      if (userMarker) {
          map.removeLayer(userMarker);
          userMarker = null;
      }
      
      if (pathLayer) {
          map.removeLayer(pathLayer);
          pathLayer = null;
      }
      
      // Initialize new map
      initMap();
      
      // Try GPS with timeout
      if (navigator.geolocation) {
          getPositionWithTimeout(5000)
              .then(position => {
                    console.log('Initial location:', position);
                  setupPath(position);
                  startGPSTracking();
              })
              .catch(error => {
                  console.error('Initial location error:', error);
                  showError('Could not get your location. Please ensure GPS is enabled and try again.');
                  // Add retry button functionality
                  const retryBtn = document.getElementById('retry-gps');
                  if (retryBtn) {
                      retryBtn.style.display = 'inline-block';
                      retryBtn.addEventListener('click', function() {
                          this.style.display = 'none';
                          initNavigation();
                      });
                  }
              });
      } else {
          showError('Geolocation is not supported by your browser. Please use a device with GPS capabilities.');
      }
  }
  
  function initMap() {
      // Create map with initial view
      map = L.map('map').setView(config.initialView.center, config.initialView.zoom);
      
      // Add Google Maps tile layer
      L.tileLayer('http://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
          subdomains: ['mt0','mt1','mt2','mt3'],
          attribution: '© Google Maps',
          maxZoom: 20
      }).addTo(map);
      
      // Always show destination marker
      const destination = locations[destinationId];
      L.marker([destination.lat, destination.lng], {
          icon: L.divIcon({
              className: 'destination-marker',
              html: '🏁',
              iconSize: [30, 30]
          })
      }).addTo(map).bindPopup(destination.name);
  }
  
  function getPositionWithTimeout(timeout) {
      return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
              reject(new Error('Timeout getting location'));
          }, timeout);
  
          navigator.geolocation.getCurrentPosition(
              position => {
                  clearTimeout(timer);
                  resolve(position);
              },
              error => {
                  clearTimeout(timer);
                  reject(error);
              },
              { 
                  enableHighAccuracy: true,
                  maximumAge: 0
              }
          );
      });
  }
  
  function startGPSTracking() {
      // Clear any existing watch
      if (watchId) {
          navigator.geolocation.clearWatch(watchId);
      }
      
      watchId = navigator.geolocation.watchPosition(
          position => {
              updateUserPosition(position);
          },
          error => {
              console.error('GPS tracking error:', error);
              showError('GPS signal lost. Please ensure your device has a clear view of the sky.');
              // Attempt to restart tracking after delay
              setTimeout(startGPSTracking, 5000);
          },
          { 
              enableHighAccuracy: true,
              maximumAge: 30000,
              timeout: 10000
          }
      );
  }
  
  function setupPath(position) {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      
      // Find closest path or create straight line
      const pathKey = findClosestPath(userLat, userLng, destinationId);
      currentPath = pathKey ? paths[pathKey] : createStraightPath(userLat, userLng);
      
      drawPath(currentPath);
      updateUserPosition(position);
      showActiveGPS();
  }
  
  function findClosestPath(userLat, userLng, destinationId) {
      const possiblePaths = Object.keys(paths).filter(key => key.endsWith(`-${destinationId}`));
      if (possiblePaths.length === 0) return null;
  
      let closestPath = null;
      let minDistance = Infinity;
  
      possiblePaths.forEach(pathKey => {
          const pathStart = paths[pathKey][0];
          const distance = calculateDistance(userLat, userLng, pathStart[0], pathStart[1]);
          if (distance < minDistance) {
              minDistance = distance;
              closestPath = pathKey;
          }
      });
  
      return minDistance < 100 ? closestPath : null;
  }
  
  function createStraightPath(startLat, startLng) {
      const destination = locations[destinationId];
      return [
          [startLat, startLng],
          [destination.lat, destination.lng]
      ];
  }
  
  function drawPath(pathCoordinates) {
      if (pathLayer) map.removeLayer(pathLayer);
  
      pathLayer = L.polyline(pathCoordinates, {
          color: '#3498db',
          weight: 6,
          opacity: 0.7,
          lineJoin: 'round'
      }).addTo(map);
  
      map.fitBounds(pathLayer.getBounds());
  }
  
  function updateUserPosition(position) {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      userPosition = { lat: userLat, lng: userLng };
  
      if (!userMarker) {
          userMarker = L.marker([userLat, userLng], {
              icon: L.divIcon({
                  className: 'user-marker',
                  html: '📍',
                  iconSize: [30, 30]
              }),
              zIndexOffset: 1000
          }).addTo(map).bindPopup('Your location');
      } else {
          userMarker.setLatLng([userLat, userLng]);
      }
  
      updateNavigationInfo();
      if (!destinationReached) map.setView([userLat, userLng]);
  }
  
  function updateNavigationInfo() {
      if (!userPosition) return;
  
      const destination = locations[destinationId];
      const distance = calculateDistance(
          userPosition.lat,
          userPosition.lng,
          destination.lat,
          destination.lng
      );
  
      document.getElementById('distance').textContent = `${distance.toFixed(0)} meters`;
  
      const instructions = document.getElementById('instructions');
      if (distance < 10) {
          instructions.textContent = 'You have arrived!';
          destinationReached = true;
      } else {
          const progress = calculatePathProgress();
          instructions.textContent = getNavigationInstruction(progress, distance);
      }
  }
  
  function calculatePathProgress() {
      if (!userPosition || currentPath.length < 2) return 0;
  
      let closestSegment = 0;
      let minDistance = Infinity;
  
      for (let i = 0; i < currentPath.length - 1; i++) {
          const dist = pointToLineDistance(
              userPosition.lat, userPosition.lng,
              currentPath[i][0], currentPath[i][1],
              currentPath[i+1][0], currentPath[i+1][1]
          );
          if (dist < minDistance) {
              minDistance = dist;
              closestSegment = i;
          }
      }
  
      return closestSegment / (currentPath.length - 1);
  }
  
  function pointToLineDistance(x, y, x1, y1, x2, y2) {
      const A = x - x1;
      const B = y - y1;
      const C = x2 - x1;
      const D = y2 - y1;
  
      const dot = A * C + B * D;
      const len_sq = C * C + D * D;
      let param = -1;
  
      if (len_sq !== 0) param = dot / len_sq;
  
      let xx, yy;
  
      if (param < 0) {
          xx = x1;
          yy = y1;
      } else if (param > 1) {
          xx = x2;
          yy = y2;
      } else {
          xx = x1 + param * C;
          yy = y1 + param * D;
      }
  
      return Math.sqrt((x - xx) ** 2 + (y - yy) ** 2);
  }
  
  function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371e3;
      const φ1 = lat1 * Math.PI/180;
      const φ2 = lat2 * Math.PI/180;
      const Δφ = (lat2-lat1) * Math.PI/180;
      const Δλ = (lon2-lon1) * Math.PI/180;
  
      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
      return R * c;
  }
  
  function getNavigationInstruction(progress, distance) {
      if (distance < 30) return 'Almost there!';
      if (progress < 0.3) return 'Follow the path to your destination';
      if (progress < 0.6) return 'Continue following the path';
      return 'You\'re getting close to your destination';
  }
  
  // UI Helper functions
  function showLoading(message) {
      const loadingEl = document.getElementById('gps-loading');
      const errorEl = document.getElementById('gps-error');
      
      if (loadingEl) {
          loadingEl.style.display = 'block';
          loadingEl.textContent = message;
      }
      if (errorEl) {
          errorEl.style.display = 'none';
      }
  }
  
  function showError(message) {
      const loadingEl = document.getElementById('gps-loading');
      const errorEl = document.getElementById('gps-error');
      
      if (loadingEl) loadingEl.style.display = 'none';
      if (errorEl) {
          errorEl.style.display = 'block';
          errorEl.innerHTML = message;
      }
  }
  
  function showActiveGPS() {
      const loadingEl = document.getElementById('gps-loading');
      const errorEl = document.getElementById('gps-error');
      
      if (loadingEl) loadingEl.style.display = 'none';
      if (errorEl) errorEl.style.display = 'none';
  }
  
  // Clean up when leaving page
  window.addEventListener('beforeunload', function() {
      if (watchId) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
      }
  });
  
  // Debugging tools
  window.debugLocation = {
      simulate: function(locationId) {
          if (locations[locationId]) {
              const loc = locations[locationId];
              updateUserPosition({
                  coords: {
                      latitude: loc.lat,
                      longitude: loc.lng,
                      accuracy: 10
                  }
              });
              setupPath({
                  coords: {
                      latitude: loc.lat,
                      longitude: loc.lng,
                      accuracy: 10
                  }
              });
          }
      },
      setPath: function(pathKey) {
          if (paths[pathKey]) {
              currentPath = paths[pathKey];
              drawPath(currentPath);
          }
      },
      setDestination: function(destId) {
          if (locations[destId]) {
              destinationId = destId;
              initNavigation();
          }
      }
  };