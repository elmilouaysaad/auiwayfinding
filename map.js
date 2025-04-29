let map;
let currentLocationMarker;
let pathLayer;

// Campus locations
const locations = {
    
    
    parking_1: {name: 'Parking 1', lat:33.53765498423474, lng:  -5.1049750712180435},
    academic_area: {name: 'Academic Area', lat: 33.538753431708265, lng: -5.107700991257563},
    athletic_area: {name: 'Athletic Area', lat: 33.53982118719424, lng: -5.108057817504243},
    health_center: {name: 'Health Center', lat: 33.54037004446834, lng: -5.105539775836056},

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
        <p>Path from ${locations[urlParams.get('location') || 'parking_1'].name}</p>
    `;
}