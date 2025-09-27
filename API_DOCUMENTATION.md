# Helmet Detection API Documentation

This document provides comprehensive documentation for all API endpoints in the Helmet Detection system.

## Base URL
```
http://localhost:3000/api
```

## Authentication
Currently, the API uses environment variables for Roboflow authentication:
- `ROBOFLOW_API_KEY`: Your Roboflow API key
- `ROBOFLOW_MODEL_ID`: Your model ID
- `ROBOFLOW_MODEL_VERSION`: Model version (defaults to "1")
- `ROBOFLOW_CONFIDENCE`: Confidence threshold (defaults to "0.4")
- `ROBOFLOW_OVERLAP`: Overlap threshold (defaults to "0.5")

## Endpoints

### 1. Single Image Detection
**POST** `/api/infer`

Detects helmets and safety vests in a single image.

#### Request
- **Content-Type**: `multipart/form-data`
- **Body**: Form data with `file` field containing the image

#### Response
```json
{
  "time": 42,
  "predictions": [
    {
      "x": 320,
      "y": 220,
      "width": 180,
      "height": 160,
      "class": "helmet",
      "confidence": 0.91
    }
  ]
}
```

#### Example
```bash
curl -X POST http://localhost:3000/api/infer \
  -F "file=@image.jpg"
```

---

### 2. Batch Processing
**POST** `/api/detections/batch`

Process multiple images in a single request (up to 10 images).

#### Request
- **Content-Type**: `multipart/form-data`
- **Body**: Form data with multiple `files` fields

#### Response
```json
{
  "summary": {
    "totalFiles": 3,
    "successful": 2,
    "failed": 1,
    "totalDetections": 5
  },
  "results": [
    {
      "filename": "image1.jpg",
      "success": true,
      "data": { "predictions": [...] },
      "detections": 3
    },
    {
      "filename": "image2.jpg",
      "success": false,
      "error": "Invalid image format",
      "detections": 0
    }
  ]
}
```

#### Example
```bash
curl -X POST http://localhost:3000/api/detections/batch \
  -F "files=@image1.jpg" \
  -F "files=@image2.jpg" \
  -F "files=@image3.jpg"
```

---

### 3. Detection History
**GET** `/api/detections/history`

Retrieve stored detection history with filtering and pagination.

#### Query Parameters
- `limit` (optional): Number of records to return (default: 50)
- `offset` (optional): Number of records to skip (default: 0)
- `site` (optional): Filter by site name
- `supervisor` (optional): Filter by supervisor name
- `startDate` (optional): Filter by start date (ISO format)
- `endDate` (optional): Filter by end date (ISO format)

#### Response
```json
{
  "data": [
    {
      "id": "det_1234567890_abc123",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "filename": "site_photo.jpg",
      "site": "Construction Site A",
      "supervisor": "John Doe",
      "detections": [...],
      "summary": {
        "totalDetections": 5,
        "helmetCount": 3,
        "vestCount": 2,
        "noHelmetCount": 1,
        "noVestCount": 0
      }
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

#### Example
```bash
curl "http://localhost:3000/api/detections/history?limit=10&site=Construction%20Site%20A"
```

**POST** `/api/detections/history`

Store a new detection result in history.

#### Request
```json
{
  "filename": "site_photo.jpg",
  "site": "Construction Site A",
  "supervisor": "John Doe",
  "detections": [
    {
      "class": "helmet",
      "confidence": 0.91,
      "x": 320,
      "y": 220,
      "width": 180,
      "height": 160
    }
  ]
}
```

#### Response
```json
{
  "success": true,
  "id": "det_1234567890_abc123",
  "data": { ... }
}
```

**DELETE** `/api/detections/history?id={detection_id}`

Delete a specific detection record.

#### Response
```json
{
  "success": true,
  "message": "Detection deleted successfully"
}
```

---

### 4. Statistics and Analytics
**GET** `/api/detections/statistics`

Get comprehensive statistics and analytics for detections.

#### Query Parameters
- `period` (optional): Time period (`1d`, `7d`, `30d`, `90d`, `all`) - default: `7d`
- `site` (optional): Filter by site name
- `supervisor` (optional): Filter by supervisor name

#### Response
```json
{
  "period": "7d",
  "dateRange": {
    "start": "2024-01-08T00:00:00.000Z",
    "end": "2024-01-15T00:00:00.000Z"
  },
  "summary": {
    "totalScans": 45,
    "totalDetections": 180,
    "totalHelmets": 120,
    "totalVests": 95,
    "totalNoHelmets": 15,
    "totalNoVests": 8,
    "helmetComplianceRate": 88.89,
    "vestComplianceRate": 92.23
  },
  "dailyTrends": [
    {
      "date": "2024-01-15",
      "scans": 8,
      "detections": 32,
      "helmets": 22,
      "vests": 18,
      "noHelmets": 2,
      "noVests": 1
    }
  ],
  "siteStatistics": [
    {
      "site": "Construction Site A",
      "scans": 25,
      "totalDetections": 100,
      "helmetCompliance": 90.0,
      "vestCompliance": 85.0
    }
  ],
  "topDetections": {
    "mostDetections": [
      {
        "id": "det_123",
        "filename": "crowded_site.jpg",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "detections": 12,
        "site": "Construction Site A"
      }
    ]
  }
}
```

#### Example
```bash
curl "http://localhost:3000/api/detections/statistics?period=30d&site=Construction%20Site%20A"
```

---

### 5. Data Export
**GET** `/api/detections/export`

Export detection data in various formats.

#### Query Parameters
- `format` (optional): Export format (`json`, `csv`, `xlsx`) - default: `json`
- `startDate` (optional): Filter by start date (ISO format)
- `endDate` (optional): Filter by end date (ISO format)
- `site` (optional): Filter by site name
- `supervisor` (optional): Filter by supervisor name

#### Response
Returns a file download with the requested format.

#### Example
```bash
# Export as CSV
curl "http://localhost:3000/api/detections/export?format=csv&period=30d" -o detections.csv

# Export as JSON
curl "http://localhost:3000/api/detections/export?format=json&startDate=2024-01-01" -o detections.json
```

---

### 6. Model Validation
**POST** `/api/detections/validate`

Validate model performance against test images.

#### Request
```json
{
  "testImages": [
    {
      "imageUrl": "https://example.com/test1.jpg",
      "expectedDetections": [
        { "class": "helmet" },
        { "class": "vest" }
      ]
    },
    {
      "imageUrl": "https://example.com/test2.jpg",
      "expectedDetections": [
        { "class": "no-helmet" }
      ]
    }
  ]
}
```

#### Response
```json
{
  "summary": {
    "totalTests": 2,
    "successfulTests": 2,
    "failedTests": 0,
    "overallAccuracy": 0.85,
    "overallPrecision": 0.82,
    "overallRecall": 0.88,
    "overallF1Score": 0.85
  },
  "results": [
    {
      "testCaseIndex": 0,
      "imageUrl": "https://example.com/test1.jpg",
      "success": true,
      "predictions": [...],
      "expectedDetections": [...],
      "validation": {
        "accuracy": 0.9,
        "precision": 0.85,
        "recall": 0.9,
        "f1Score": 0.87,
        "falsePositives": 1,
        "falseNegatives": 0,
        "truePositives": 2
      }
    }
  ],
  "recommendations": [
    {
      "type": "success",
      "message": "Model performance is good. Continue monitoring with regular validation.",
      "severity": "low"
    }
  ]
}
```

#### Example
```bash
curl -X POST http://localhost:3000/api/detections/validate \
  -H "Content-Type: application/json" \
  -d '{
    "testImages": [
      {
        "imageUrl": "https://example.com/test1.jpg",
        "expectedDetections": [{"class": "helmet"}]
      }
    ]
  }'
```

---

### 7. Health Check
**GET** `/api/detections/health`

Check the health status of the API and connected services.

#### Response
```json
{
  "status": "healthy",
  "score": 95,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": {
    "apiKey": true,
    "modelId": true,
    "version": "1"
  },
  "roboflow": {
    "connected": true,
    "responseTime": 850,
    "error": null
  },
  "system": {
    "nodeVersion": "v18.17.0",
    "platform": "darwin",
    "uptime": 3600,
    "memoryUsage": {
      "rss": 45678592,
      "heapTotal": 20971520,
      "heapUsed": 15728640,
      "external": 1024000
    }
  },
  "endpoints": {
    "inference": "/api/infer",
    "batch": "/api/detections/batch",
    "history": "/api/detections/history",
    "statistics": "/api/detections/statistics",
    "export": "/api/detections/export",
    "validation": "/api/detections/validate",
    "health": "/api/detections/health"
  }
}
```

#### Example
```bash
curl http://localhost:3000/api/detections/health
```

---

### 8. Ping (Legacy)
**GET** `/api/ping`

Simple health check endpoint.

#### Response
```json
{
  "ok": true
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `404`: Not Found
- `500`: Internal Server Error
- `502`: Bad Gateway (Roboflow API error)

## Rate Limiting

Currently, no rate limiting is implemented. In production, consider implementing rate limiting to prevent abuse.

## CORS

The API supports CORS for cross-origin requests from web applications.

## Environment Variables

Required environment variables:
```bash
ROBOFLOW_API_KEY=your_api_key_here
ROBOFLOW_MODEL_ID=your_model_id_here
ROBOFLOW_MODEL_VERSION=1
ROBOFLOW_CONFIDENCE=0.4
ROBOFLOW_OVERLAP=0.5
```

Optional environment variables:
```bash
MOCK_INFER=1  # Enable mock mode for testing
```

## Development

To run the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000/api`

## Production Considerations

1. **Database**: Replace in-memory storage with a proper database (PostgreSQL, MongoDB)
2. **Authentication**: Implement proper API authentication
3. **Rate Limiting**: Add rate limiting to prevent abuse
4. **Logging**: Implement comprehensive logging
5. **Monitoring**: Add monitoring and alerting
6. **Caching**: Implement caching for frequently accessed data
7. **File Storage**: Use cloud storage for uploaded images
8. **Security**: Implement proper security headers and validation

