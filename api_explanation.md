
# AQI Prediction API Details

This API serves as the "middleman" between an end-user (like a React web dashboard) and a complex Machine Learning model. It provides specific "URLs" (endpoints) that allow a user to do different tasks related to forecasting Air Quality Index (AQI).

Here is a breakdown of exactly what this API does, categorized by functionality:

### 1. Generating AQI Predictions (The Core Feature)
This is the primary job of the API.
* **`/predict`**: Someone sends the live weather and sensor data (CO, NOx, NO2, temperature, humidity), and the API passes it through your Random Forest ML model, gets the calculated future AQI score, saves it in a database, and returns it.
* **`/batch-predict`**: Does the exact same thing but allows the user to send dozens or hundreds of sensor readings combined in an array all at once to get bulk predictions.

### 2. Managing the ML Model & Data Setup
The API isn't just for predictions; it's also responsible for helping build and manage the underlying model.
* **`/upload-csv`**: Allows an admin to upload a new CSV file containing fresh historical sensor dataset to retrain the ML model.
* **`/validate-data`**: Checks the uploaded data to make sure it doesn't have missing values (`-200`s in your dataset), that timestamps are formatted correctly, and the schema is valid.
* **`/train-model`**: Once data is uploaded and validated, hitting this endpoint kicks off the actual training process of a new Random Forest model.
* **`/model-metrics`**: Returns how well the current model is performing (returning the Root Mean Square Error, Mean Absolute Error, and R² Score) so you know if your model is accurate or needs tuning.

### 3. Fetching Analytics & Reports
These API endpoints exist specifically to feed data into the charts on that dashboard.
* **`/aqi-trends`**: Pulls historical AQI predictions so a charting library (like Recharts) can plot a timeline showing if the air quality is getting better or worse over the week.
* **`/aqi-comparison`**: Fetches both "Actual AQI" and "Predicted AQI" records side-by-side. This is used to plot a graph showing how close your machine learning predictions were to reality.
* **`/aqi-filter`**: Allows the dashboard to ask a specific question, like: *"Give me the AQI data just for November 2024 filtering specifically by Nitrogen Dioxide (NO2)."*
* **`/export-predictions`**: Lets a user download a fresh CSV report of all the predictions the system has made so far.

### 4. Health Checks
* **`/` (Root)**: A quick ping to verify "Is the server actually turned on and running right now?".

**In summary:** It's an engine that ingests air quality monitoring data, manages the brain (the Random Forest Model) that understands air pollution, generates forecasting insights, and spits those insights back out to be drawn onto graphs and charts.
