/**
 * Converts 3D meters into a single unique 64-bit ID
 */
function packCoordinate(x, y, z) {
    // We use 'n' at the end of numbers to tell JS these are BigInts
    return (BigInt(x) << 36n) | (BigInt(y) << 18n) | BigInt(z);
}

/**
 * Reverses the process to get your meters back
 */
function unpackCoordinate(key) {
    const x = Number(key >> 36n);
    const y = Number((key >> 18n) & 0x3FFFFn); // Masking the middle 18 bits
    const z = Number(key & 0x3FFFFn);          // Masking the last 18 bits
    return { x, y, z };
}

// Example:
const myKey = packCoordinate(125000, 450, 88000); 
// myKey will be a single massive number like 34359792000...

console.log("Packed Key:", myKey.toString()); // Display the packed key

const unpacked = unpackCoordinate(myKey);
console.log("Unpacked Coordinates:", unpacked); // Should show { x: 125000, y: 450, z: 88000 }




const X_OFFSET = 1n << 36n;
const Y_OFFSET = 1n << 18n;
const Z_OFFSET = 1n;

function getNeighborKeys(key) {
    const neighbors = [];
    
    // Loop through -1, 0, 1 for each axis
    for (let dx = -1n; dx <= 1n; dx++) {
        for (let dy = -1n; dy <= 1n; dy++) {
            for (let dz = -1n; dz <= 1n; dz++) {
                // Skip the center cell (0,0,0)
                if (dx === 0n && dy === 0n && dz === 0n) continue;
                
                // Calculate the neighbor key using offsets
                const neighborKey = key + (dx * X_OFFSET) + (dy * Y_OFFSET) + (dz * Z_OFFSET);
                neighbors.push(neighborKey);
            }
        }
    }
    return neighbors;
}

// Convert coordinate (degree) to meters
// isLon: true for longitude, false for latitude
function coordToMeters(coord, isLon, lat = 0) {
    if (isLon) {
        // 1 degree longitude = 111,000 * cos(latitude) meters
        // lat should be in degrees
        const latRad = lat * Math.PI / 180;
        return coord * 111000 * Math.cos(latRad);
    } else {
        // 1 degree latitude = 111,000 meters
        return coord * 111000;
    }
}

// Convert meters to coordinate (degree)
function metersToCoord(meters, isLon, lat = 0) {
    if (isLon) {
        const latRad = lat * Math.PI / 180;
        return meters / (111000 * Math.cos(latRad));
    } else {
        return meters / 111000;
    }
}

// Convert meters to longitude (degree), given latitude (degree)
function metersToLon(meters, lat) {
    const latRad = lat * Math.PI / 180;
    return meters / (111000 * Math.cos(latRad));
}

// Convert degrees to meters
function degreesToMeters(degrees, isLon = false, lat = 0) {
    if (isLon) {
        // Longitude: requires latitude
        const latRad = lat * Math.PI / 180;
        return degrees * 111000 * Math.cos(latRad);
    } else {
        // Latitude
        return degrees * 111000;
    }
}

// Convert meters to degrees
function metersToDegrees(meters, isLon = false, lat = 0) {
    if (isLon) {
        const latRad = lat * Math.PI / 180;
        return meters / (111000 * Math.cos(latRad));
    } else {
        return meters / 111000;
    }
}