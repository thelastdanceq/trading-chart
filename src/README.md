Architecture of candlestick renderer

In general idea is to use simple MVC pattern 

# Chart Controller
responsibilities:
1. react on data update
2. update model based on user input (zoom, scroll)
3. update view based on model changes

# Chart View
responsibilities:
1. render candlesticks
2. render indicators
3. render price scale
4. render time scale
5. render crosshair

# Chart Model
responsibilities:
1. store data
2. store chart settings: scales etc(used indicators in future

# Model Adapters
responsibilities:
1. convert data from different sources to model format
