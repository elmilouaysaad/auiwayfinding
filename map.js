let map;
let currentLocationMarker;
let pathLayer;

// Campus locations
const locations = {
    main_gate: {name: 'Main Gate', lat: 33.536187, lng: -5.102405},
    library: {name: 'Mohammed 6 Library', lat: 33.539955, lng: -5.107425},
    aud_17: {name: 'Auditorium 17', lat: 33.537669, lng: -5.106613},
    B_56: {name: 'Building 56', lat: 33.542620, lng: -5.106947},
    B_21: {name: 'Building 21', lat: 33.540701, lng: -5.106833}
};

function initMap(defaultLocationId) {
    const defaultLocation = locations[defaultLocationId];
    
    // Initialize map centered at default location
    map = L.map('map').setView([defaultLocation.lat, defaultLocation.lng], 17);
    
    // Add tile layer
    L.tileLayer('http://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        subdomains: ['mt0','mt1','mt2','mt3'],
        attribution: '© Google Maps',
        maxZoom: 20
    }).addTo(map);
    
    // Add current location marker
    currentLocationMarker = L.marker([defaultLocation.lat, defaultLocation.lng], {
        icon: L.divIcon({
            className: 'location-marker',
            html: '📍',
            iconSize: [30, 30]
        })
    }).addTo(map);
    
    // Add all location markers
    Object.entries(locations).forEach(([id, loc]) => {
        if (id !== defaultLocationId) {
            L.marker([loc.lat, loc.lng], {
                icon: L.divIcon({
                    className: 'location-marker',
                    html: '🏛️',
                    iconSize: [30, 30]
                })
            }).addTo(map).on('click', () => onLocationSelected(id));
        }
    });
}

function updateMapWithPath(destinationId) {
    const currentLocation = currentLocationMarker.getLatLng();
    const destination = locations[destinationId];
    
    // Remove previous path if exists
    if (pathLayer) {
        map.removeLayer(pathLayer);
    }
    
    // Get path coordinates (from paths.js)
    const pathCoordinates = getPathCoordinates(
        currentLocation.lat, 
        currentLocation.lng, 
        destination.lat, 
        destination.lng
    );
    
    // Draw path
    pathLayer = L.polyline(pathCoordinates, {
        color: '#3498db',
        weight: 5,
        opacity: 0.7,
        smoothFactor: 1
    }).addTo(map);
    
    // Fit map to show entire path
    map.fitBounds(pathLayer.getBounds());
    
    // Update location info
    document.getElementById('location-info').innerHTML = `
        <h2>${destination.name}</h2>
        <p>Path from ${locations[urlParams.get('location') || 'main_gate'].name}</p>
    `;
}