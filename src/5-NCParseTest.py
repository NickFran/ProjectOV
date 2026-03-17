import xarray as xr
import numpy as np
import os
import time as t
#from typing import List


ncPrefix = "../Storage/nc/GL_PR_PF_"
ncSuffix = ".nc"
WMOArray = [
    "3902331",
    "6990668",
    "6990526"
]

ds = xr.open_dataset(ncPrefix + WMOArray[0] + ncSuffix)
time_sz = ds.sizes["TIME"]
depth_sz = ds.sizes["DEPTH"]

for timesindex in range(0, time_sz):
    for depthindex in range(0,depth_sz):
        t.sleep(1)
        entry = {
            "x": ds.coords["LATITUDE"].values[timesindex],
            "y": ds.coords["LATITUDE"].values[timesindex],
            "PRES": ds["PRES"].isel(TIME=timesindex, DEPTH=depthindex).values,
            "TEMP": ds["TEMP"].isel(TIME=timesindex, DEPTH=depthindex).values,
            "PSAL": ds["PSAL"].isel(TIME=timesindex, DEPTH=depthindex).values,
            "PHPH": ds["PHPH"].isel(TIME=timesindex, DEPTH=depthindex).values
        }
        print(entry)
        print(entry["TEMP"])

