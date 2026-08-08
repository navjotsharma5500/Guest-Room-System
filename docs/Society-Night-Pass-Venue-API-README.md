# Society Night Pass — Private Venue Availability API

## Purpose

This private, read-only API lets the Society Night Pass backend check venue availability. It does not reserve a venue, create a Venue Enquiry or Venue Booking, send email, or emit dashboard/socket notifications.

The Society Night Pass system owns and stores its own permission requests. This API returns only a point-in-time availability result from Campus Connect.

## Base URL

```text
https://campusconnect.thapar.edu
```

All requests must use HTTPS.

## Architecture

```text
Society Night Pass frontend
→ Society Night Pass backend
→ authenticated private GET API
→ Venue Booking backend
→ venue availability response only
```

The Society Night Pass frontend must call its own backend. It must never call this API directly from React or other browser code.

## Authentication

Include the private API key in every request:

```http
x-venue-api-key: <secret>
```

Store the credential only in backend environment variables:

```dotenv
VENUE_API_BASE_URL=https://campusconnect.thapar.edu
VENUE_API_KEY=<secret-shared-securely>
```

Never expose the key in frontend source, frontend environment variables, URLs, logs, screenshots, analytics, error reports, Git, or API responses. If the key may have been exposed, replace it in both backends immediately.

## Check venue availability

```http
GET /api/integration/venues
Accept: application/json
x-venue-api-key: <secret>
```

### Query parameters

| Parameter | Required | Format | Description |
|---|---:|---|---|
| `fromDate` | Yes | `YYYY-MM-DD` | First requested date, inclusive |
| `toDate` | Yes | `YYYY-MM-DD` | Last requested date, inclusive |
| `startTime` | Yes | `HH:mm` | Daily start time in 24-hour format |
| `endTime` | Yes | `HH:mm` | Daily end time in 24-hour format |

The timezone is `Asia/Kolkata` (IST). For a multi-day request, the time range applies on every included date. `toDate` must be on or after `fromDate`, and `endTime` must be later than `startTime`. Overnight slots are not accepted.

### Success response

```http
200 OK
```

```json
[
  {
    "venueName": "COS Hall",
    "available": true
  },
  {
    "venueName": "Main Auditorium",
    "available": false
  }
]
```

The response contains every configured venue. `available` is `false` when the venue is disabled or conflicts with a Venue Booking whose status is `booked` or `checked_in`.

Pending Venue Enquiries are not included in this check. Availability is a point-in-time snapshot and does not reserve the venue.

### Node.js backend example

```js
export async function getVenueAvailability({ fromDate, toDate, startTime, endTime }) {
  const query = new URLSearchParams({ fromDate, toDate, startTime, endTime });
  const response = await fetch(
    `${process.env.VENUE_API_BASE_URL}/api/integration/venues?${query}`,
    {
      headers: {
        "x-venue-api-key": process.env.VENUE_API_KEY,
        Accept: "application/json"
      }
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Venue API failed with ${response.status}`);
  }
  return data;
}
```

### Axios backend example

```js
import axios from "axios";

export async function getVenueAvailability(params) {
  const response = await axios.get(
    `${process.env.VENUE_API_BASE_URL}/api/integration/venues`,
    {
      params,
      headers: {
        "x-venue-api-key": process.env.VENUE_API_KEY,
        Accept: "application/json"
      }
    }
  );
  return response.data;
}
```

### cURL example

Set the key locally before running this command; do not paste a production key into shell history:

```bash
curl --get "https://campusconnect.thapar.edu/api/integration/venues" \
  --header "x-venue-api-key: $VENUE_API_KEY" \
  --header "Accept: application/json" \
  --data-urlencode "fromDate=2026-08-05" \
  --data-urlencode "toDate=2026-08-05" \
  --data-urlencode "startTime=18:00" \
  --data-urlencode "endTime=22:00"
```

## Error responses

| Status | Meaning | Recommended handling |
|---:|---|---|
| `400` | A date/time parameter is missing or invalid | Correct the request; do not retry unchanged |
| `401` | `x-venue-api-key` is missing | Fix the backend credential configuration |
| `403` | API key is invalid | Verify or rotate the privately shared key |
| `500` | Availability could not be checked | Log safely and retry later; never log the key |

Errors use this shape:

```json
{
  "success": false,
  "message": "Description of the error"
}
```

## Integration flow

1. Society Night Pass React sends the requested date/time to the Society Night Pass backend.
2. The Society Night Pass backend calls `GET /api/integration/venues` with its private API key.
3. The Society Night Pass backend returns the availability result needed by its frontend.
4. Society Night Pass stores and processes its own permission request in its own system.

No Society Night Pass operation creates or changes data in the Venue Booking system.

## Production checklist

- Keep the API key only in the Society Night Pass backend secret store.
- Send requests only over HTTPS.
- Use a reasonable request timeout.
- Handle all non-2xx responses explicitly.
- Treat availability as a point-in-time snapshot, not a reservation.
- Never expose the API key or private Venue Booking data to a browser.
