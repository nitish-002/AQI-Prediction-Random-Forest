# Postman cURL Commands for AQI Prediction API

You can import these directly into Postman by going to `File > Import > Raw text` and pasting the cURL command, or by running them directly in your terminal.

## 1. Health Check (Root)
```bash
curl --location 'http://127.0.0.1:8000/'
```

## 2. Upload CSV Dataset
*Note: Replace `path/to/your/dataset.csv` with the actual path to your CSV file.*
```bash
curl --location 'http://127.0.0.1:8000/upload-csv' \
--form 'file=@"path/to/your/dataset.csv"'
```

## 3. Validate Data
```bash
curl --location --request POST 'http://127.0.0.1:8000/validate-data'
```

## 4. Train Model
```bash
curl --location --request POST 'http://127.0.0.1:8000/train-model'
```

## 5. Get Model Metrics
```bash
curl --location 'http://127.0.0.1:8000/model-metrics'
```

## 6. Predict Single AQI
```bash
curl --location 'http://127.0.0.1:8000/predict' \
--header 'Content-Type: application/json' \
--data '{
    "co": 2.5,
    "nox": 105.0,
    "no2": 85.0,
    "temperature": 25.5,
    "humidity": 45.0,
    "timestamp": "2026-04-10T12:00:00"
}'
```

## 7. Batch Predict AQI
```bash
curl --location 'http://127.0.0.1:8000/batch-predict' \
--header 'Content-Type: application/json' \
--data '{
    "records": [
        {
            "co": 2.5,
            "nox": 105.0,
            "no2": 85.0,
            "temperature": 25.5,
            "humidity": 45.0,
            "timestamp": "2026-04-10T12:00:00"
        },
        {
            "co": 3.1,
            "nox": 110.0,
            "no2": 90.0,
            "temperature": 26.0,
            "humidity": 50.0,
            "timestamp": "2026-04-10T13:00:00"
        }
    ]
}'
```

## 8. Get AQI Trends
```bash
curl --location 'http://127.0.0.1:8000/aqi-trends'
```

## 9. Get AQI Comparison
```bash
curl --location 'http://127.0.0.1:8000/aqi-comparison'
```

## 10. Filter AQI Data
```bash
curl --location 'http://127.0.0.1:8000/aqi-filter?start_date=2026-01-01&end_date=2026-04-10&pollutant=co'
```

## 11. Export Predictions
```bash
curl --location 'http://127.0.0.1:8000/export-predictions'
```
