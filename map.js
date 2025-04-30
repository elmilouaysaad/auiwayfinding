let map;
let currentLocationMarker;
let pathLayer;
let activeMarker = null;
let highlightCircle = null;
// Campus locations
const locations = {
    
    
    parking_1: {name: 'Parking 1', lat:33.53765498423474, lng:  -5.1049750712180435, size:"large",icon:'🏛️' , radius:50},
    academic_area: {name: 'Academic Area', lat: 33.538753431708265, lng: -5.107700991257563, size:"large",icon:'🏛️', radius:50},
    athletic_area: {name: 'Athletic Area', lat: 33.53982118719424, lng: -5.108057817504243, size:"large",icon:'🏛️', radius:50},
    health_center: {name: 'Health Center', lat: 33.54037004446834, lng: -5.105539775836056, size:"large",icon:'🏛️', radius:30},
    administrative_area: {name: 'Administrative Area', lat: 33.5388999805765, lng: -5.106166462676498, size:"large",icon:'🏛️', radius:50},
    housing_department: {name: 'Housing Department', lat: 33.54230929503023, lng: -5.105320202086709, size:"large",icon:'🏛️', radius:50},
    // registrar office 33.538585036322445, -5.106267986778564
    registrar_office: {name: 'Registrar Office', lat: 33.538585036322445, lng: -5.106267986778564, size:"small",icon:'', radius:5,consideredAs:"administrative_area"},

};
function resolveLocation(locationId) {
    const location = locations[locationId];
    
    // If this is a virtual location, find all physical implementations
    if (!location.lat) {
        return Object.keys(locations).filter(
            id => locations[id].consideredAs === locationId
        );
    }
    
    // If this location is an alias, return what it's considered as
    if (location.consideredAs) {
        return [location.consideredAs];
    }
    
    // Regular physical location
    return [locationId];
}
function initMap(defaultLocationId) {
    const defaultLocation = locations[defaultLocationId];
    const sizeMapping = {
        small: [15, 15],   // [width, height] in pixels
        medium: [20, 20],
        large: [30, 30]
    };

    // Initialize map centered at default location
    map = L.map('map').setView([33.53944687014948, -5.106774445866627], 17); 
    
    // Add tile layer
    L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
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
        const size = sizeMapping[loc.size] || sizeMapping.medium;
        if (id !== defaultLocationId) {
            const marker= L.marker([loc.lat, loc.lng], {
                icon: L.divIcon({
                    className: 'location-marker',
                    html: loc.icon,
                    iconSize: size,
                })
            }).addTo(map).on('click', () => onLocationSelected(id)).bindTooltip(loc.name, { onhover: true, direction: 'top' });
            marker.on('click', function() {
                // Remove previous highlight
                if (highlightCircle) {
                    map.removeLayer(highlightCircle);
                }
                
                // Add new highlight circle (aura)
                highlightCircle = L.circle([loc.lat, loc.lng], {
                    radius: loc.radius, // Meters (adjust as needed)
                    color: '#ffffff', // Stroke color
                    fillColor: '#ffffff',
                    fillOpacity: 0.2,
                    weight: 2
                }).addTo(map);
                
                // Bring marker to front
                marker.bringToFront();
                
                // Call existing selection handler
                onLocationSelected(id);
            });
        }
        
    });

}

// In map.js - Replace your existing updateMapWithPath function

function updateMapWithPath(destinationId) {
    const currentLocation = currentLocationMarker.getLatLng();
    
    // Resolve both start and end locations
    const startIds = resolveLocation(urlParams.get('location') || 'parking_1');
    const endIds = resolveLocation(destinationId);
    
    // Clear previous paths
    if (pathLayer) {
        map.removeLayer(pathLayer);
    }
    
    // Create paths for all combinations
    startIds.forEach(startId => {
        endIds.forEach(endId => {
            const startLoc = locations[startId];
            const endLoc = locations[endId];
            
            const pathCoordinates = getPathCoordinates(
                startLoc.lat, startLoc.lng,
                endLoc.lat, endLoc.lng
            );
            
            pathLayer = L.polyline(pathCoordinates, {
                color: '#3498db',
                weight: 5,
                opacity: 0.7
            }).addTo(map);
        });
    });
    
    // Fit map to show all paths
    if (pathLayer) {
        map.fitBounds(pathLayer.getBounds());
    }
}