# Overview of 2-getGridUsingRange.py

The `2-getGridUsingRange.py` script is a Python program designed to process geographic elevation data from a NetCDF dataset and generate 3D models in the OBJ format. The script is particularly focused on dividing the data into smaller tiles for efficient handling and visualization. Below is a detailed breakdown of its functionality:

## Purpose
The script processes elevation data within a specified geographic bounding box, converts the data into a 3D mesh, and saves the mesh as OBJ files. The mesh is divided into smaller tiles to facilitate easier manipulation and rendering in 3D software like Blender.

## Key Features
1. **Bounding Box Input**:
   - The script reads the geographic bounding box (latitude and longitude range) from a CSV file (`coordRange.csv`).
   - This bounding box defines the area of interest for the elevation data.

2. **NetCDF Dataset**:
   - The script loads elevation data from a NetCDF file (`gebco_2025_n90.0_s45.0_w-80.0_e5.0.nc`) using the `xarray` library.

3. **Grid Generation**:
   - The script calculates the number of latitude and longitude points required based on the bounding box and a target spacing of 0.5 km.
   - It generates evenly spaced latitude and longitude values to create a grid.

4. **Elevation Data Processing**:
   - Elevation values are extracted from the dataset for the generated grid points.
   - The data is smoothed using iterative median filtering and Gaussian blurring to remove spikes and divots.

5. **OBJ File Generation**:
   - The script converts the grid data into a 3D mesh and saves it as an OBJ file (`bathymetry.obj`).
   - Vertices are calculated in meters, and faces are defined to form a triangular mesh.

6. **Tile Division**:
   - The grid is divided into smaller tiles (e.g., 10x10 tiles).
   - Each tile is saved as a separate OBJ file in the `../Storage/tiles/` directory.
   - Overlapping edges are included to ensure seamless alignment between tiles.

7. **Precision and Alignment**:
   - Longitude scaling uses a fixed latitude to ensure consistent scaling across all tiles.
   - Tile edges are carefully aligned to eliminate gaps or overlaps.

## Improvements Made
- **Removed Re-Centering**: The geometry is now built as-is, without re-centering the mesh to the origin.
- **Consistent Tile Dimensions**: Adjustments ensure that all tiles have consistent dimensions, except for minor adjustments to the last tiles in each row/column.
- **Edge Alignment**: Overlapping edges between tiles ensure seamless alignment without gaps.
- **Fixed Longitude Scaling**: A fixed latitude is used for consistent longitude scaling across tiles.

## Outputs
- A single OBJ file (`bathymetry.obj`) representing the entire mesh.
- Multiple OBJ files (`tile_x_y.obj`) representing individual tiles, saved in the `../Storage/tiles/` directory.

## Dependencies
- Python libraries: `xarray`, `numpy`, `csv`, `scipy.ndimage`
- Input files: `coordRange.csv` (bounding box), NetCDF dataset (`gebco_2025_n90.0_s45.0_w-80.0_e5.0.nc`)

## Usage
1. Ensure the required input files are available in the `../Storage/` directory.
2. Run the script using Python:
   ```
   python 2-getGridUsingRange.py
   ```
3. The output OBJ files will be saved in the `../Storage/` and `../Storage/tiles/` directories.

This script is now optimized for generating accurate and seamless 3D tiles from elevation data, making it suitable for applications in geographic visualization and 3D modeling.