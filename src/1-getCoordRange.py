import xarray as xr
import numpy as np

#Get all dataset WMO's
ncPrefix = "../Storage/nc/GL_PR_PF_"
ncSuffix = ".nc"
WMOArray = [
    "3902331",
    "6990668",
    "6990526"
]

Lats=[]
Longs=[]
minLat=None
maxLat=None
minLong=None
maxLong=None

for WMO in WMOArray:
    ds = xr.open_dataset(ncPrefix + WMO + ncSuffix)
    print(ds.dims)
    x = ds.coords["LATITUDE"].values
    y = ds.coords["LONGITUDE"].values
    Lats.extend(x.tolist())
    Longs.extend(y.tolist())

Lats = [float(v) for v in Lats]
Longs = [float(v) for v in Longs]

import math
minLat=math.floor(min(Lats))
maxLat=math.ceil(max(Lats))
minLong=math.floor(min(Longs))
maxLong=math.ceil(max(Longs))

print(minLat, maxLat)
print(minLong, maxLong)

import csv
with open("../Storage/coordRange.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["minLat", "maxLat", "minLong", "maxLong"])
    writer.writerow([minLat, maxLat, minLong, maxLong])