# 🏨 Thapar Campus Connect

## Guest Room & Venue Management System

<p align="center">
  <img src="https://ik.imagekit.io/7khjnlfow/email-assets/thapar_logo.png?updatedAt=1769371086744" width="220"/>
</p>

<p align="center">
✨ Production Grade • 🔐 Enterprise Secure • ⚡ Real-Time Enabled  
</p>

---

# 🌐 Overview

**Thapar Campus Connect** is a **full-scale institutional operating system** designed for:

* 🏨 Guest Room Management
* 🏛️ Venue Booking & Event Management
* 🌍 Public Booking Systems
* 📅 Calendar & Event Ecosystem
* 📊 Advanced Analytics & Automation

Deployed entirely on **AWS EC2 (Frontend + Backend)** with **secure cookie-based authentication and real-time sync**.

---

# 🧩 System Modules

| Module                   | Status    | Description                 |
| ------------------------ | --------- | --------------------------- |
| 🏨 Guest Room System     | 🔒 Stable | Complete booking lifecycle  |
| 🏛️ Venue Booking System | 🚀 Active | Dynamic venue config        |
| 🌐 Public Systems        | ✅ Active  | External booking + calendar |
| 📅 Calendar Systems      | ✅ Active  | Event + venue calendar      |
| 🧭 Dashboard Selector    | ✅ Active  | Role routing                |
| 🤖 Eco Bot               | 🧠 New    | Smart assistant             |
| 📊 Analytics             | 🚀 New    | Advanced system insights    |

---

# 🏗️ Architecture

```
React Frontend (EC2)
        ↓
HTTPS + Cookies + WebSocket
        ↓
Nginx (Reverse Proxy + SSL)
        ↓
Node.js + Express (PM2)
        ↓
MongoDB Atlas
        ↓
ImageKit CDN
```

---

# 🔐 Security Controls

| Control              | Status | Details                |
| -------------------- | ------ | ---------------------- |
| HttpOnly Cookies     | ✅      | JWT secure from XSS    |
| HTTPS + TLS          | ✅      | Full encryption        |
| CORS Policy          | ✅      | Whitelisted domains    |
| Frontend Secrets     | ❌      | No secrets exposed     |
| Backend RBAC         | ✅      | Strict role validation |
| Token Exposure       | ❌      | No localStorage usage  |
| Rate Limiting        | ✅      | DDoS protection        |
| CSRF Protection      | ✅      | SameSite cookies       |
| Injection Protection | ✅      | Mongoose validation    |

---

# 🔐 Authentication Flow

```
1. User logs in
2. Server validates credentials
3. JWT issued in HttpOnly cookie
4. Cookie auto-sent with requests
5. Backend verifies token
6. Frontend never accesses JWT
```

---

# 🏨 Guest Room System

## 🎯 Core Features

### 📋 Booking Lifecycle

```
Enquiry → Approval → Booking → Payment → Check-in → Check-out
```

### 🔹 APIs

```
🔹 POST   /api/bookings              - Create booking
🔹 GET    /api/bookings              - List bookings
🔹 PUT    /api/bookings/:id          - Update booking
🔹 GET    /api/consolidated-bookings - Multi booking
🔹 GET    /api/guest-profile         - Guest profile
🔹 POST   /api/extensions            - Extend booking
🔹 POST   /api/cancellations         - Cancel booking
🔹 POST   /api/feedback              - Feedback
```

---

## 💳 Payment System

* Paid / Partial / Free
* Multi-room split payments
* Waiver billing
* Defaulter tracking
* Payment history

---

## 🧠 Smart Logic

* Date-time overlap detection
* Multi-room booking validation
* Real-time availability
* Guest history tracking

---

# 🏛️ Venue Booking System

## 🎯 Features

### 📋 Booking Lifecycle

```
Enquiry → Approval → Booking → Extension / Cancellation
```

---

### 🔹 APIs

```
🔹 POST   /api/venue/enquiry         - Create enquiry
🔹 GET    /api/venue/enquiry         - List enquiries
🔹 POST   /api/venue/booking         - Create booking
🔹 GET    /api/venue/booking         - List bookings
🔹 POST   /api/venue/direct-booking  - Direct booking
🔹 POST   /api/venue/extension       - Extend booking
🔹 POST   /api/venue/cancellation    - Cancel booking
🔹 GET    /api/venue/calendar        - Calendar data
```

---

## 🏢 Dynamic Venue Config (NEW)

* Add Tabs / Subtabs
* Add Rooms dynamically
* Enable / Disable rooms
* Backend-driven UI config

---

## 📄 Pages

| Page            | Description                   |
| --------------- | ----------------------------- |
| Common Bookings | Room-wise view                |
| All Bookings    | Full booking list + rebooking |
| Calendar        | Venue-wise events             |
| Analytics       | Usage insights                |

---

## 🔁 Rebooking System (NEW)

* Prefill previous booking data
* Editable before submission
* Works across venues
* Excludes:

  * Dates
  * Attachments

---

# 🌍 Public Systems

---

## 🏨 Guest Room Booking Form

* Public booking
* Email integration
* Approval workflow

---

## 🏛️ Event Venue Booking Form

* Availability check
* Date-time validation
* Email notifications

---

## 📅 Event Calendar

* Live events
* Upcoming events
* Past records
* Fully synced with bookings

---

## 🏛️ Venue Calendar

* Venue-wise filtering
* Real-time events
* Availability tracking

---

## 🧑‍🤝‍🧑 Community Page

* Posts + comments
* Engagement system

---

## 📚 Night Pass Systems

| Module             | Tech   | Status         |
| ------------------ | ------ | -------------- |
| Library Night Pass | Python | ✅ Active       |
| Society Night Pass | JS     | 🚧 Coming Soon |

---

# 📊 Advanced Systems

### 📊 Analytics

* Booking trends
* Revenue insights
* Occupancy

### 🤖 Eco Bot

* Smart assistant
* Context-aware actions

---

# ✉️ Email System

| Type         | Description        |
| ------------ | ------------------ |
| Guest Emails | Booking + feedback |
| DD Office    | Specific venues    |
| DoSA Office  | General venues     |

---

# 📁 Project Structure

## Backend

```
controllers/
models/
routes/
middleware/
emails/
utils/
services/
```

## Frontend

```
components/
pages/
hooks/
context/
utils/
theme/
```

---

# 🚀 Deployment (EC2 ONLY)

## Frontend

```
npm run build
scp build → EC2
copy to /var/www
restart nginx
```

## Backend

```
git pull
npm install
pm2 restart
```

---

# 📊 Production Readiness

| Area         | Status     | Notes             |
| ------------ | ---------- | ----------------- |
| Guest System | ✅ Stable   | Production locked |
| Venue System | ✅ Active   | Evolving          |
| Security     | ✅ Verified | Enterprise-grade  |
| Email        | ✅ Stable   | 3 pipelines       |
| Real-time    | ✅ Stable   | Socket.IO         |
| Deployment   | ✅ Active   | EC2               |

---

# 📋 Compliance

* ✅ GDPR Principles
* ✅ OWASP Top 10
* ✅ Secure Authentication
* ✅ Institutional Policy

---

# 🏢 Deployment

**Thapar Institute of Engineering & Technology**
Patiala, Punjab, India

🌐 https://campusconnect.thapar.edu

---

# 🧠 Final Note

This system is a **modular campus operating platform**, not just a booking app.

✔ Scalable
✔ Secure
✔ Real-time
✔ Enterprise-ready

---

**Version:** 3.0.0
**Status:** 🚀 Production Active
