# Guest Room Management System

## Architecture & Deployment Documentation

---

## 1. Project Overview

The **Guest Room Management System (GRMS)** is a full-stack web application designed for **institutional guest house and hostel management** (Thapar University context).

The system supports:

* Guest enquiries
* Direct and consolidated bookings
* Room availability management
* Check-in / check-out workflows
* Payments (paid / partial / free)
* Document uploads and approvals
* Real-time dashboard updates

The architecture prioritizes:

* Security
* Stability
* Real-time consistency
* Production readiness

---

## 2. High-Level Architecture

```
Browser (React / Vercel)
        |
        | HTTPS + HttpOnly Cookies
        |
Nginx (Reverse Proxy)
        |
Node.js + Express (EC2, PM2)
        |
MongoDB Atlas
```

**Real-time layer:** Socket.IO (WebSocket + fallback)

---

## 3. Frontend Architecture

### 3.1 Technology Stack

* React (Create React App)
* Hosted on **Vercel**
* State managed via React hooks and context
* Real-time updates via Socket.IO client

---

### 3.2 Environment Configuration

Frontend uses **Vercel Environment Variables**, not committed `.env` files.

```env
REACT_APP_BACKEND_URL=https://api.guestapp.in
```

All API and socket connections use a **single centralized config**:

```
src/utils/apiConfig.js
```

This prevents:

* Hardcoded URLs
* Environment drift
* Accidental localhost references

---

### 3.3 API Communication

* REST APIs via `fetch` / `axios`
* Base URL imported from `apiConfig.js`
* Cookies sent automatically (`credentials: "include"`)

```js
import { BACKEND_URL } from "../utils/apiConfig";
```

---

### 3.4 Authentication Model (Frontend)

* JWT stored in **HttpOnly cookies**
* No tokens stored in:

  * LocalStorage
  * SessionStorage
* Frontend never accesses JWT directly
* Authentication validated server-side

This design:

* Prevents XSS token theft
* Aligns with production security standards

---

### 3.5 Real-Time Updates (Socket.IO)

Frontend:

* Single Socket.IO client
* Connects to backend base URL
* Joins logical rooms (e.g. `dashboard-room`)

Backend:

* Emits events from controllers using:

  ```js
  const io = req.app.get("io");
  io.to("dashboard-room").emit(...)
  ```

Used for:

* Room status updates
* Booking changes
* Dashboard refresh without reload

---

### 3.6 File Uploads (ImageKit)

* Frontend uses **ImageKit public key only**
* Backend handles secure metadata association
* No private keys in frontend
* Uploads used for:

  * Guest documents
  * Approval files
  * Payment proofs
  * Extensions

This separation ensures **credential safety**.

---

## 4. Backend Architecture

### 4.1 Technology Stack

* Node.js
* Express.js
* MongoDB (Atlas)
* Socket.IO
* PM2 (process manager)
* Nginx (reverse proxy)

---

### 4.2 Deployment Environment

* Hosted on **AWS EC2 (Ubuntu 22.04)**
* Application runs on internal port:

  ```
  10000
  ```
* Nginx terminates HTTPS and proxies traffic
* Let’s Encrypt used for SSL certificates

Public backend URL:

```
https://api.guestapp.in
```

---

### 4.3 Backend Responsibilities

* Authentication & authorization
* Booking lifecycle management
* Room availability logic
* Payment state handling
* File metadata persistence
* Socket event emission
* Data integrity enforcement

---

## 5. Database Design (MongoDB Atlas)

* Central collections for:

  * Hostels
  * Rooms
  * Bookings
  * Enquiries
  * Payments
  * Attachments
* Booking documents include:

  * Status
  * Payment breakdown
  * Reporting state
  * Attachment references

All date/time logic handled **server-side** to avoid client inconsistency.

---

## 6. Deployment Workflow

### 6.1 Frontend (Vercel)

* GitHub `main` branch auto-deploy
* Build command:

  ```
  npm run build
  ```
* CI warnings configured as non-blocking (`CI=false`)
* No secrets in repo

---

### 6.2 Backend (EC2)

Manual controlled deployment:

```bash
git pull origin main
pm2 restart guestroom-backend
```

This ensures:

* Predictable restarts
* No surprise downtime
* Controlled production changes

---

## 7. Security Considerations

✔ No frontend secrets
✔ HttpOnly cookies
✔ HTTPS enforced end-to-end
✔ CORS configured deliberately
✔ No token exposure in JS
✔ Environment variables isolated per platform

---

## 8. Known Trade-offs (Transparent)

* ESLint warnings allowed in production build to avoid risky refactors of tested logic
* CRA default CI behavior overridden intentionally
* Legacy code cleaned gradually post-demo

These are **documented decisions**, not oversights.

---

## 9. Production Readiness Status

| Area               | Status |
| ------------------ | ------ |
| Frontend stability | ✅      |
| Backend stability  | ✅      |
| Security           | ✅      |
| Real-time updates  | ✅      |
| Uploads            | ✅      |
| Payments           | ✅      |
| Demo readiness     | ✅      |

---

## 10. Next Phase (Post-Demo)

* Gradual ESLint cleanup
* Optional migration from CRA to Vite
* Test coverage addition
* Role-based access hardening
* Analytics optimizations

---

### Final Note

This system is **production-deployed, tested, and stable**.
All recent actions focused on **security, correctness, and deployment hygiene**, not feature experimentation.
