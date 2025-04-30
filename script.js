// Get location from URL (e.g., ?location=library)
const urlParams = new URLSearchParams(window.location.search);
const locationId = urlParams.get('location') || 'parking_1';

// Initialize map with the current location as default starting point
initMap(locationId);

// Function to handle location selection
// In script.js - Update your onLocationSelected function

function onLocationSelected(locationId) {
    // Resolve to actual physical locations
    const physicalLocations = resolveLocation(locationId);
    
    // Update UI to show relationship
    const location = locations[locationId];
    let infoHTML = `<h2>${location.name}</h2>`;
    
    if (physicalLocations.length > 1 || physicalLocations[0] !== locationId) {
        const names = physicalLocations.map(id => locations[id].name).join(', ');
        infoHTML += `<p>Included in: ${names}</p>`;
    }
    
    document.getElementById('location-info').innerHTML = infoHTML;
    
    // Update path
    updateMapWithPath(locationId);
}

// Connect location buttons
// Connect location select
document.addEventListener('DOMContentLoaded', () => {
    const locationSelect = document.getElementById('location-select');
    locationSelect.addEventListener('change', () => {
        onLocationSelected(locationSelect.value);
    });
    
    // Set initial value from URL
    const urlParams = new URLSearchParams(window.location.search);
    const locationId = urlParams.get('location');
    if (locationId) {
        locationSelect.value = locationId;
    }
});