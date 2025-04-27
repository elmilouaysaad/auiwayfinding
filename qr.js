function generateQRCode(destinationId) {
    const destination = locations[destinationId];
    const currentLocation = urlParams.get('location') || 'main_gate';
    
    // Create navigation URL with both current location and destination
    const navUrl = `${window.location.origin}/nav.html?from=${currentLocation}&to=${destinationId}`;
    
    // Clear previous QR code
    const qrContainer = document.getElementById('qr-container');
    qrContainer.innerHTML = '<h3>Scan for Navigation</h3>';
    
    // Create canvas element for QR code
    const canvas = document.createElement('canvas');
    qrContainer.appendChild(canvas);
    
    // Generate QR code
    QRCode.toCanvas(canvas, navUrl, { 
        width: 200,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    }, function(error) {
        if (error) {
            console.error('QR Code generation error:', error);
            qrContainer.innerHTML = '<p>Failed to generate QR code</p>';
        }
    });
}