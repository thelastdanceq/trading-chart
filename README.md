## Overview
This application is a comprehensive, interactive candlestick chart renderer for financial data visualization. It is designed for users who require detailed insights into market trends and price movements. The application features real-time data fetching and dynamic interactions such as zooming, panning, and detailed examination of specific data points.

## How to Use

### Setup and Initial Display

#### Starting the Application
Once you launch the application, the initial setup populates the user interface with controls for selecting a financial instrument (e.g., stocks, commodities) and setting the desired time frame for the data.

#### Loading Data
After configuring the settings, clicking the "Submit" button fetches the candlestick data for the specified symbol and time frame, rendering it on the canvas.

### Interacting with the Chart
The application supports several interactive features to explore the candlestick data:

#### Dragging/Panning
- **Action:** Click and hold the left mouse button over the chart, then move the mouse horizontally to drag the chart left or right. This allows you to view different parts of the data timeline.
- **Purpose:** This feature enables users to navigate through the time series data, allowing for an examination of earlier or later data points beyond what is initially visible on the screen.

#### Horizontal Scrolling
- **Action:** Use the horizontal scroll functionality of your mouse or trackpad to move the chart left or right. If your device does not support horizontal scrolling natively, you can also hold down the `Shift` key and use the vertical scroll wheel to achieve the same effect.
- **Purpose:** Provides a convenient and quick way to navigate through the chart without the need to click and drag. This method is especially useful for making smaller, more precise adjustments to the view.

#### Zooming
- **Horizontal Zoom:** Use the mouse wheel while hovering over the chart to zoom in or out. Scrolling up zooms in, and scrolling down zooms out, focusing on the point under the cursor.
- **Vertical Zoom:** Move the cursor to the rightmost edge of the canvas where the price scale is visible, and then use the mouse wheel to zoom in or out on the price axis.

### Automatic Data Fetching
The application detects when you are nearing the edge of the available data and automatically fetches additional data in the direction you are panning or zooming (forward or backward in time). This feature ensures a seamless and continuous data viewing experience.
