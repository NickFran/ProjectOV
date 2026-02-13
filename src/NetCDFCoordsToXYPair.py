import os
from pathlib import Path
Dirpath = Path(__file__).resolve().parent
storage_dir = Dirpath.parent / 'Storage'

try:
	import xarray as xr
except Exception as e:
	print("xarray import failed:", e)
	print("Install with: python -m pip install xarray")
	raise

#woa23_decav_s16_01.nc
#GL_PR_PF_1902698.nc
fileName = "GL_PR_PF_1902698.nc"

# build full path to the netCDF file in the project's Storage folder
nc_path = storage_dir / fileName
ds = xr.open_dataset(nc_path, decode_times=False)
lat = ds.coords['LATITUDE'].values
lon = ds.coords['LONGITUDE'].values

latLonPairs = []
for i in range(len(lat)):
    for j in range(len(lon)):
        latLonPairs.append((lat[i], lon[j]))

with open(storage_dir / "LatLong.csv", "w", encoding="utf-8") as f:
    f.write("latitude,longitude\n")  
    for lat, lon in latLonPairs:
        f.write(f"{lat},{lon}\n")

#x = ds.sizes['LATITUDE']
#y = ds.sizes['LONGITUDE']
#z = ds.sizes['depth']
#
#print("Dimensions (xyz): "+ str(x)+"x"+str(y)+"x"+str(z))
#print("Total points: " + str(x*y*z))

#convert LatLonPairs to XY pairs
xyPairs = []
for lat, lon in latLonPairs:
    x = (lon + 180) * (360 / 360)  
    y = (lat + 90) * (180 / 180)   
    xyPairs.append((x, y))

with open(storage_dir / "XY.csv", "w", encoding="utf-8") as f:
    f.write("latitude,longitude\n")  
    for x, y in xyPairs:
        f.write(f"{x},{y}\n")
