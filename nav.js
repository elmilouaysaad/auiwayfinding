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
    main_gate: { name: 'Main Gate', lat: 33.536187, lng: -5.102405, radius: 15 },
    library: { name: 'Mohammed 6 Library', lat: 33.539955, lng: -5.107425, radius: 20 },
    aud_17: { name: 'Auditorium 17', lat: 33.537669, lng: -5.106613, radius: 15 },
    B_56: { name: 'Building 56', lat: 33.542620, lng: -5.106947, radius: 15 },
    B_21: { name: 'Building 21', lat: 33.540701, lng: -5.106833, radius: 15 }
};

// Predefined paths between locations with more waypoints
const paths = {
    'main_gate-library': [
        [33.536187, -5.102405],
        [33.536300, -5.102600],
        [33.536400, -5.102800],
        [33.536500, -5.103000],
        [33.536700, -5.103300],
        [33.536900, -5.103600],
        [33.537100, -5.103900],
        [33.537300, -5.104200],
        [33.537500, -5.104500],
        [33.537700, -5.104800],
        [33.538000, -5.105100],
        [33.538300, -5.105400],
        [33.538600, -5.105700],
        [33.538900, -5.106000],
        [33.539200, -5.106300],
        [33.539500, -5.106600],
        [33.539800, -5.106900],
        [33.539955, -5.107425]
    ],
    'library-B_56': [
        [33.539955, -5.107425],
        [33.540100, -5.107380],
        [33.540250, -5.107350],
        [33.540400, -5.107320],
        [33.540550, -5.107290],
        [33.540700, -5.107260],
        [33.540850, -5.107230],
        [33.541000, -5.107200],
        [33.541150, -5.107170],
        [33.541300, -5.107140],
        [33.541450, -5.107110],
        [33.541600, -5.107080],
        [33.541750, -5.107050],
        [33.541900, -5.107020],
        [33.542050, -5.106990],
        [33.542200, -5.106960],
        [33.542620, -5.106947]
    ]
};

// Kalman Filter implementation for position smoothing
class KalmanFilter {
    constructor(R = 1, Q = 1) {
        this.R = R; // Measurement noise
        this.Q = Q; // Process noise
        this.P = 1; // Estimation error
        this.X = null; // Current state
    }
    
    filter(measurement) {
        if (this.X === null) {
            this.X = measurement;
            return this.X;
        }
        
        // Prediction
        const X_p = this.X;
        const P_p = this.P + this.Q;
        
        // Update
        const K = P_p / (P_p + this.R);
        this.X = X_p + K * (measurement - X_p);
        this.P = (1 - K) * P_p;
        
        return this.X;
    }
}

// Navigation variables
let map;
let userMarker;
let pathLayer;
let accuracyCircle;
let destinationMarker;
let watchId = null;
let userPosition = null;
let destinationReached = false;
let currentPath = [];
let destinationId = 'library'; // Default destination
let arrivalConfirmationCount = 0;

// Dead reckoning variables
let lastPosition = null;
let lastTimestamp = 0;
let lastSpeed = 0;
let lastHeading = 0;

// Kalman filters for position smoothing
const latFilter = new KalmanFilter(0.01, 0.01);
const lngFilter = new KalmanFilter(0.01, 0.01);

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
    arrivalConfirmationCount = 0;
    
    // Clear any existing watch
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    
    // Reset navigation state
    userPosition = null;
    destinationReached = false;
    lastPosition = null;
    lastTimestamp = 0;
    lastSpeed = 0;
    lastHeading = 0;
    
    // Remove existing map elements if they exist
    if (map) {
        map.remove();
        map = null;
    }
    
    if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
    }
    
    if (pathLayer) {
        map.removeLayer(pathLayer);
        pathLayer = null;
    }
    
    if (accuracyCircle) {
        map.removeLayer(accuracyCircle);
        accuracyCircle = null;
    }
    
    if (destinationMarker) {
        map.removeLayer(destinationMarker);
        destinationMarker = null;
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
    
    // Always show destination marker with radius
    const destination = locations[destinationId];
    destinationMarker = L.circleMarker([destination.lat, destination.lng], {
        radius: destination.radius,
        color: '#2ecc71',
        fillColor: '#2ecc71',
        fillOpacity: 0.2,
        weight: 2
    }).addTo(map);
    
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
            maximumAge: 0,
            timeout: 5000
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

    return minDistance < 50 ? closestPath : null; // Reduced threshold from 100 to 50 meters
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

    // Add markers for each waypoint
    pathCoordinates.forEach((coord, index) => {
        if (index > 0 && index < pathCoordinates.length - 1) {
            L.marker(coord, {
                icon: L.divIcon({
                    className: 'waypoint-marker',
                    html: '•',
                    iconSize: [12, 12]
                })
            }).addTo(map);
        }
    });

    map.fitBounds(pathLayer.getBounds());
}

function updateUserPosition(position) {
    const now = Date.now();
    const rawLat = position.coords.latitude;
    const rawLng = position.coords.longitude;
    
    // Apply Kalman filtering
    let filteredLat = latFilter.filter(rawLat);
    let filteredLng = lngFilter.filter(rawLng);
    
    // Dead reckoning if we have previous data
    if (lastPosition && position.coords.speed && position.coords.heading) {
        const timeDiff = (now - lastTimestamp) / 1000; // in seconds
        const distance = lastSpeed * timeDiff;
        
        // Only use dead reckoning if GPS accuracy is poor
        if (position.coords.accuracy > 10) {
            const bearing = lastHeading * Math.PI / 180;
            const latDiff = distance * Math.cos(bearing) / 111320;
            const lngDiff = distance * Math.sin(bearing) / (111320 * Math.cos(filteredLat * Math.PI / 180));
            
            filteredLat = lastPosition.lat + latDiff;
            filteredLng = lastPosition.lng + lngDiff;
        }
    }
    
    // Update last known values
    lastPosition = { lat: filteredLat, lng: filteredLng };
    lastTimestamp = now;
    lastSpeed = position.coords.speed || 0;
    lastHeading = position.coords.heading || 0;
    
    // Add accuracy circle visualization
    if (!accuracyCircle) {
        accuracyCircle = L.circle([filteredLat, filteredLng], {
            radius: position.coords.accuracy,
            color: '#0078A8',
            fillColor: '#0078A8',
            fillOpacity: 0.2,
            weight: 1
        }).addTo(map);
    } else {
        accuracyCircle.setLatLng([filteredLat, filteredLng])
                      .setRadius(position.coords.accuracy);
    }
    
    // Only update position if accuracy is good enough
    if (position.coords.accuracy < 20) {
        userPosition = lastPosition;
        
        if (!userMarker) {
            userMarker = L.marker([filteredLat, filteredLng], {
                icon: L.divIcon({
                    className: 'user-marker',
                    html: '📍',
                    iconSize: [30, 30]
                }),
                zIndexOffset: 1000
            }).addTo(map).bindPopup('Your location');
        } else {
            userMarker.setLatLng([filteredLat, filteredLng]);
        }
    }
    
    updateNavigationInfo(position.coords.accuracy);
    if (!destinationReached) map.setView([filteredLat, filteredLng]);
}

function updateNavigationInfo(accuracy) {
    if (!userPosition) return;

    const destination = locations[destinationId];
    const distance = calculateDistance(
        userPosition.lat,
        userPosition.lng,
        destination.lat,
        destination.lng
    );

    // More precise distance calculation along path
    const preciseDistance = calculatePathDistance(userPosition);
    document.getElementById('distance').textContent = `${preciseDistance.toFixed(0)} meters (Accuracy: ${accuracy.toFixed(1)}m)`;

    const instructions = document.getElementById('instructions');
    
    // Check if we're within destination radius plus GPS accuracy
    const arrivalThreshold = destination.radius + accuracy;
    
    if (distance < arrivalThreshold) {
        arrivalConfirmationCount++;
        
        // Require multiple confirmations to prevent false arrivals
        if (arrivalConfirmationCount >= 3) {
            instructions.textContent = 'You have arrived!';
            destinationReached = true;
            
            // Vibrate if supported
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
            }
        } else {
            instructions.textContent = `Approaching destination (${arrivalConfirmationCount}/3 confirmations)...`;
        }
    } else {
        arrivalConfirmationCount = 0; // Reset counter if we move away
        const bearing = calculateBearing(
            userPosition.lat, userPosition.lng,
            destination.lat, destination.lng
        );
        const progress = calculatePathProgress();
        instructions.textContent = getNavigationInstruction(progress, preciseDistance, bearing);
    }
}

function calculatePathDistance(userPos) {
    let minDistance = Infinity;
    let closestSegmentIndex = 0;
    
    // Find the closest point on the path to the user
    for (let i = 0; i < currentPath.length - 1; i++) {
        const segmentStart = currentPath[i];
        const segmentEnd = currentPath[i+1];
        
        const distance = pointToSegmentDistance(
            userPos.lat, userPos.lng,
            segmentStart[0], segmentStart[1],
            segmentEnd[0], segmentEnd[1]
        );
        
        if (distance < minDistance) {
            minDistance = distance;
            closestSegmentIndex = i;
        }
    }
    
    // Calculate remaining path distance from closest segment
    let remainingDistance = 0;
    
    // Add distance from user to the closest point on the closest segment
    const closestSegmentStart = currentPath[closestSegmentIndex];
    const closestSegmentEnd = currentPath[closestSegmentIndex + 1];
    const closestPoint = getClosestPointOnSegment(
        userPos.lat, userPos.lng,
        closestSegmentStart[0], closestSegmentStart[1],
        closestSegmentEnd[0], closestSegmentEnd[1]
    );
    
    remainingDistance += calculateDistance(
        userPos.lat, userPos.lng,
        closestPoint[0], closestPoint[1]
    );
    
    // Add distance from the closest point to the end of the path
    for (let i = closestSegmentIndex + 1; i < currentPath.length - 1; i++) {
        remainingDistance += calculateDistance(
            currentPath[i][0], currentPath[i][1],
            currentPath[i+1][0], currentPath[i+1][1]
        );
    }
    
    return remainingDistance;
}

function getClosestPointOnSegment(x, y, x1, y1, x2, y2) {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;

    if (len_sq !== 0) param = dot / len_sq;

    if (param < 0) {
        return [x1, y1];
    } else if (param > 1) {
        return [x2, y2];
    } else {
        return [x1 + param * C, y1 + param * D];
    }
}

function calculatePathProgress() {
    if (!userPosition || currentPath.length < 2) return 0;

    let closestSegment = 0;
    let minDistance = Infinity;

    for (let i = 0; i < currentPath.length - 1; i++) {
        const dist = pointToSegmentDistance(
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

function pointToSegmentDistance(x, y, x1, y1, x2, y2) {
    const closestPoint = getClosestPointOnSegment(x, y, x1, y1, x2, y2);
    return Math.sqrt((x - closestPoint[0]) ** 2 + (y - closestPoint[1]) ** 2);
}

function calculateBearing(lat1, lon1, lat2, lon2) {
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
    const bearing = Math.atan2(y, x) * 180/Math.PI;
    return (bearing + 360) % 360; // Normalize to 0-360
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

function getNavigationInstruction(progress, distance, bearing) {
    // Get the next waypoint (not just the final destination)
    const nextWaypoint = getNextWaypoint();
    const nextDistance = calculateDistance(
        userPosition.lat, userPosition.lng,
        nextWaypoint[0], nextWaypoint[1]
    );

    const nextBearing = calculateBearing(
        userPosition.lat, userPosition.lng,
        nextWaypoint[0], nextWaypoint[1]
    );
    
    const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
    const index = Math.round(((nextBearing + 360) % 360) / 45) % 8;
    const direction = directions[index];
    
    if (distance < 10) {
        return "Destination is very close!";
    }
    
    if (nextDistance < 5) {
        return "Continue straight to the next waypoint";
    }
    
    if (nextDistance < 20) {
        return `In ${Math.round(nextDistance)} meters, continue ${direction}`;
    }
    
    return `Head ${direction} for about ${Math.round(nextDistance)} meters`;
}

function getNextWaypoint() {
    let closestIndex = 0;
    let minDistance = Infinity;
    
    for (let i = 0; i < currentPath.length; i++) {
        const waypoint = currentPath[i];
        const distance = calculateDistance(
            userPosition.lat, userPosition.lng,
            waypoint[0], waypoint[1]
        );
        
        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
        }
    }
    
    // Return the next waypoint (not the closest one)
    const nextIndex = Math.min(closestIndex + 1, currentPath.length - 1);
    return currentPath[nextIndex];
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
                    accuracy: 5,
                    speed: 0,
                    heading: 0
                }
            });
            setupPath({
                coords: {
                    latitude: loc.lat,
                    longitude: loc.lng,
                    accuracy: 5
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