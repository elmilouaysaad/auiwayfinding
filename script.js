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
// Replace the entire search functionality in script.js with:

// Search functionality
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('location-search');
    const searchResults = document.getElementById('search-results');
    let selectedResultIndex = -1;
    let searchTimeout = null;

    // Search with debounce
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(this.value.trim());
        }, 300);
    });

    // Keyboard navigation
    searchInput.addEventListener('keydown', function(e) {
        const results = document.querySelectorAll('.search-result-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedResultIndex = Math.min(selectedResultIndex + 1, results.length - 1);
            updateSelectedResult(results);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedResultIndex = Math.max(selectedResultIndex - 1, -1);
            updateSelectedResult(results);
        } else if (e.key === 'Enter' && selectedResultIndex >= 0) {
            results[selectedResultIndex].click();
        }
    });

    function performSearch(query) {
        searchResults.innerHTML = '';
        selectedResultIndex = -1;
        
        if (query.length < 2) {
            searchResults.style.display = 'none';
            if (currentHighlight) map.removeLayer(currentHighlight);
            return;
        }

        const matches = findMatches(query);
        displayResults(matches);
    }

    function findMatches(query) {
        const q = query.toLowerCase();
        return Object.entries(locations).filter(([id, loc]) => {
            return (
                loc.name.toLowerCase().includes(q) ||
                id.toLowerCase().includes(q) ||
                (loc.keywords && loc.keywords.some(kw => kw.toLowerCase().includes(q))
            ))
        });
    }

    function displayResults(matches) {
        if (matches.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
        } else {
            matches.forEach(([id, loc], index) => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.innerHTML = `
                    <div class="result-name">${loc.name}</div>
                   
                `;
                
                item.addEventListener('click', () => selectResult(id));
                item.addEventListener('mouseover', () => previewResult(id));
                
                searchResults.appendChild(item);
            });
        }
        searchResults.style.display = 'block';
    }

    function selectResult(id) {
        searchInput.value = locations[id].name;
        searchResults.style.display = 'none';
        document.getElementById('location-select').value = id;
        onLocationSelected(id); // This will now trigger QR generation
    }

    function previewResult(id) {
        highlightZone(id); // Temporary highlight on hover
    }

    function updateSelectedResult(results) {
        results.forEach((r, i) => {
            r.style.backgroundColor = i === selectedResultIndex ? '#f0f8ff' : '';
            if (i === selectedResultIndex) {
                previewResult(Object.keys(locations)[i]);
                r.scrollIntoView({ block: 'nearest' });
            }
        });
    }
});