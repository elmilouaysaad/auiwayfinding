// Get location from URL (e.g., ?location=library)
const urlParams = new URLSearchParams(window.location.search);
const locationId = urlParams.get('location') || 'parking_1';

// Initialize map with the current location as default starting point
initMap(locationId);

// Function to handle location selection
function onLocationSelected(locationId) {
    // Update the map with the selected location
    updateMapWithPath(locationId);
    
    // Generate QR code for navigation
    generateQRCode(locationId);
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