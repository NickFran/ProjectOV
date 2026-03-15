import xarray as xr
import numpy as np
import csv
from scipy.ndimage import median_filter, gaussian_filter

ds = xr.open_dataset('../Storage/gebco_2025_n90.0_s45.0_w-80.0_e5.0.nc')

# Read bounding box from CSV
with open('../Storage/coordRange.csv', 'r') as f:
    reader = csv.DictReader(f)
    row = next(reader)
    lat_min, lat_max = float(row['minLat']), float(row['maxLat'])
    lon_min, lon_max = float(row['minLong']), float(row['maxLong'])


# Target spacing in km
target_km = 0.5

# Compute point counts based on target spacing and latitude correction
mid_lat_rad = np.radians((lat_min + lat_max) / 2)
km_per_deg_lat = 111.0
km_per_deg_lon = 111.0 * np.cos(mid_lat_rad)
n_lat = int(np.ceil((lat_max - lat_min) * km_per_deg_lat / target_km)) + 1
n_lon = int(np.ceil((lon_max - lon_min) * km_per_deg_lon / target_km)) + 1

# Build evenly-spaced sample coordinates
lats = np.linspace(lat_min, lat_max, n_lat)
lons = np.linspace(lon_min, lon_max, n_lon)

# Select nearest grid points for each sample coordinate
grid = ds.elevation.sel(lat=lats, lon=lons, method='nearest')

print(f"Grid shape: {grid.shape}  (lat x lon)")
print(f"Lat range:  {lats[0]:.2f} to {lats[-1]:.2f}")
print(f"Lon range:  {lons[0]:.2f} to {lons[-1]:.2f}")

elevations = grid.values

# Remove spikes/divots: iterative median filter + outlier clamping
for _ in range(3):
    elevations = median_filter(elevations, size=7)
    local_median = median_filter(elevations, size=15)
    diff = elevations - local_median
    std = np.std(diff)
    # Clamp both spikes (above) and divots (below)
    spike_mask = diff > 1 * std
    divot_mask = diff < -1 * std
    elevations[spike_mask] = local_median[spike_mask]
    elevations[divot_mask] = local_median[divot_mask]

# Smooth the surface with a Gaussian blur
elevations = gaussian_filter(elevations, sigma=1)

## No scaling: use raw elevation values (meters)

# Write OBJ file centered at origin (Y-up convention)
obj_path = "../Storage/bathymetry.obj"
lon_center = (lons[0] + lons[-1]) / 2
lat_center = (lats[0] + lats[-1]) / 2

with open(obj_path, 'w') as f:
    # Write vertices: v (lon-centered, meters) (elevation, meters) (lat-centered, meters)
    for i in range(n_lat):
        for j in range(n_lon):
            # Convert longitude to meters (centered)
            lat_here = lats[i]
            lon_m = (lons[j] - lon_center) * 111000 * np.cos(np.radians(lat_here))
            # Elevation is already in meters
            elev_m = float(elevations[i, j])
            # Convert latitude to meters (centered)
            lat_m = (lats[i] - lat_center) * 111000
            f.write(f"v {lon_m:.2f} {elev_m:.2f} {lat_m:.2f}\n")

    # Write triangle faces (two triangles per grid cell)
    for i in range(n_lat - 1):
        for j in range(n_lon - 1):
            # Vertex indices (1-based in OBJ)
            tl = i * n_lon + j + 1        # top-left
            tr = i * n_lon + (j + 1) + 1  # top-right
            bl = (i + 1) * n_lon + j + 1  # bottom-left
            br = (i + 1) * n_lon + (j + 1) + 1  # bottom-right
            f.write(f"f {tl} {bl} {tr}\n")
            f.write(f"f {tr} {bl} {br}\n")

print(f"\nOBJ saved to {obj_path}")
print(f"Vertices: {n_lat * n_lon}")
print(f"Faces: {(n_lat - 1) * (n_lon - 1) * 2}")

#split this into 10x10
# low res 10x10
# high res 10x10

# spawn a grid of the low res tiles, stream in the high res ones if a line trace is headding towards it.