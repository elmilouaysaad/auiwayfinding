// Get location from URL (e.g., ?location=library)
const urlParams = new URLSearchParams(window.location.search);
const locationId = urlParams.get('location') || 'main_gate';

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
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.location-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            onLocationSelected(btn.dataset.locationId);
        });
    });
});