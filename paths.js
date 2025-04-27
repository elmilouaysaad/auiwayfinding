// Custom paths between locations
const paths = {
    // Path from Main Gate to Library
    'main_gate-library': [
        [33.536187, -5.102405],
        [33.536500, -5.103000],
        [33.537000, -5.104000],
        [33.538000, -5.105500],
        [33.539955, -5.107425]
    ],
    // Path from Main Gate to Auditorium 17
    'main_gate-aud_17': [
        [33.536187, -5.102405],
        [33.536800, -5.103500],
        [33.537200, -5.105000],
        [33.537669, -5.106613]
    ],
    // Path from Library to Building 56
    'library-B_56': [
        [33.539955, -5.107425],
        [33.540500, -5.107300],
        [33.541500, -5.107100],
        [33.542620, -5.106947]
    ],
    // Path from Auditorium 17 to Building 21
    'aud_17-B_21': [
        [33.537669, -5.106613],
        [33.538500, -5.106700],
        [33.539500, -5.106800],
        [33.540701, -5.106833]
    ],
    // Path from Building 21 to Building 56
    'B_21-B_56': [
        [33.540701, -5.106833],
        [33.541500, -5.106900],
        [33.542620, -5.106947]
    ]
};

function getPathCoordinates(startLat, startLng, endLat, endLng) {
    // Check if we have a predefined path
    const pathKey = Object.keys(paths).find(key => {
        const [from, to] = key.split('-');
        return (locations[from].lat === startLat && locations[from].lng === startLng &&
                locations[to].lat === endLat && locations[to].lng === endLng) ||
               (locations[to].lat === startLat && locations[to].lng === startLng &&
                locations[from].lat === endLat && locations[from].lng === endLng);
    });
    
    if (pathKey) {
        return paths[pathKey];
    }
    
    // Default straight line if no predefined path
    return [
        [startLat, startLng],
        [endLat, endLng]
    ];
}