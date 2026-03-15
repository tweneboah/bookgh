🏨 PRODUCT REQUIREMENTS DOCUMENT (Updated)
Product Type
Multi-Tenant, Multi-Branch Hotel & Event Management SaaS Platform
Tech Stack
Frontend & Backend: Next.js (App Router)


Database: MongoDB with Mongoose


Payments: Paystack


Authentication: JWT + Session-based tenant resolution



1️⃣ TENANT IDENTIFICATION STRATEGY
Since you are NOT using subdomains:
Tenant Resolution Flow
User logs in


System attaches:


tenantId


role


branchId (if branch-scoped)
 into session / JWT


All API calls validate tenantId


Middleware injects tenantId into every query


Security Requirements
No request executes without tenant context


Middleware must enforce tenant filtering


Index on:


tenantId


tenantId + branchId


No exceptions.

2️⃣ SYSTEM HIERARCHY
Platform (Super Admin)
 ↓
 Hotel (Tenant)
 ↓
 Branches
 ↓
 Rooms / Staff / Events / Finance / POS

3️⃣ CORE MODULES
Everything below is tenant-aware.

3.1 Platform Module (Super Admin)
Features
Create / manage hotels


Activate / suspend tenants


Manage subscription plans


View platform metrics:


Total hotels


Total branches


Total bookings


Platform revenue


System logs


Global configuration



3.2 Hotel (Tenant) Module
Features
Hotel profile


Logo upload


Tax settings


Currency


Timezone


Default policies


Subscription management


Plan upgrade/downgrade



3.3 Branch Management Module
Each hotel can create multiple branches.
Features
Branch creation


Address & contact details


Branch manager assignment


Branch-specific pricing


Branch operational status


Independent financial reporting



4️⃣ ROOM & ACCOMMODATION MANAGEMENT

4.1 Room Management
Features
Room categories


Room types


Amenities


Pricing rules


Seasonal pricing


Weekend pricing


Room status:


Available


Reserved


Occupied


Cleaning


Maintenance


Out of Service



4.2 Reservation & Booking
Features
Booking calendar


Availability engine


Walk-in booking


Online booking page


Group bookings


Booking modifications


Cancellations


Refund handling


Early check-in


Late check-out


No-show tracking



4.3 Check-In / Check-Out
Features
Fast check-in workflow


Guest ID upload


Deposit handling


Room assignment


Invoice generation


Damage charge


Auto room status update



5️⃣ GUEST MANAGEMENT (CRM)
Features
Guest profile


Stay history


Preferences


VIP tagging


Blacklist management


Notes & internal comments



6️⃣ BILLING & FINANCE

6.1 Billing Module
Auto invoice generation


Add-ons (laundry, minibar, etc.)


Split billing


Discounts


Tax breakdown


PDF invoice export



6.2 Payment Module
Supported
Cash


Card


Mobile Money


Bank Transfer (via Paystack)



6.3 Branch-Level Paystack Configuration
Each branch must configure:
Public key


Secret key


Webhook secret


Requirements
Encrypted key storage


Payment verification endpoint


Webhook listener


Automatic payment confirmation


Refund support


Failed transaction handling


Important:
 One branch’s Paystack must NEVER process another branch’s payment.

7️⃣ ACCOUNTING & REPORTS
Reports
Daily revenue


Monthly revenue


Occupancy rate


Revenue per room


Branch comparison


Cancellation rate


Event revenue


Expense tracking


Profit summary


Export formats:
CSV


Excel


PDF



8️⃣ HOUSEKEEPING MODULE
Assign cleaning tasks


Cleaning status


Room inspection


Lost & found


Linen tracking


Cleaning logs



9️⃣ MAINTENANCE MODULE
Maintenance ticket creation


Assign technician


Track status


Preventive maintenance schedule


Asset tracking



🔟 COMPREHENSIVE EVENT MANAGEMENT MODULE (NEW)
This is enterprise-level.
Events can be:
Weddings


Conferences


Meetings


Corporate retreats


Birthday parties


Banquets


Training sessions



10.1 Event Space Management
Features
Create event halls


Capacity management


Layout types:


Theater


Banquet


Classroom


U-shape


Availability calendar


Hall pricing


Hourly / daily pricing


🆕 NEW MODULE: Hotel Discovery & Search (Platform-Level)
This module operates across tenants.
It must be added to the PRD.

1️⃣ Hotel Location Management (Required Update)
Each branch must now store:
Country


Region


City


Full address


Latitude


Longitude


Google Place ID (optional)


Landmark description


Database requirement:
GeoJSON field


2dsphere index in MongoDB


Example:
location: {
 type: { type: String, enum: ['Point'] },
 coordinates: [longitude, latitude]
}
Without this, you can’t do distance filtering.

2️⃣ Enterprise Filtering Requirements
Public search page must support:
Location-Based Filters
Country


Region


City


Distance radius (5km, 10km, 50km)


“Near me” using browser geolocation


Hotel Filters
Price range


Star rating


Amenities (WiFi, Pool, AC)


Event hall availability


Room availability by date


Branch rating


Breakfast included


Refundable booking



3️⃣ Distance Search (Geo Search)
MongoDB Requirements:
2dsphere index on branch location


$near query for radius search


Example logic:
 Find hotels within 10km of user’s location.
This must be handled at platform level but still scoped by availability.

4️⃣ Google Maps Integration
You now need:
A. Maps Display
Show branches as markers


Cluster markers


Click → view hotel details


Directions link


B. Autocomplete Search
Google Places API


Suggest cities, regions, landmarks


C. Reverse Geocoding (Optional)
Convert coordinates to readable location.

5️⃣ Search Flow (Updated Public Booking Flow)
User visits:
yourplatform.com/search
Steps:
User selects:


Location


Check-in date


Check-out date


Guests


System:


Filters branches by geo


Filters by availability


Filters by room capacity


Applies pricing filters


Returns matching branches


User clicks branch


Goes to branch booking page


Booking handled within that tenant


Notice:
Search = Cross-tenant
 Booking = Tenant-specific

6️⃣ Performance Requirements (Critical)
Because now you’re querying across tenants:
You must:
Index:


location (2dsphere)


tenantId


branchId


room availability dates


Use pagination


Use projection


Avoid N+1 queries


Possibly precompute availability


Search performance must be under 500ms.

🌍 18️⃣ Hotel Discovery & Marketplace Module
18.1 Global Hotel Search
Search by city/region


Distance radius search


Availability filtering


Price range filtering


Amenity filtering


18.2 Map-Based Search
Google Maps integration


Marker clustering


Clickable branch markers


Directions support


18.3 Availability Engine
Real-time room availability


Event hall availability


Date-range filtering


18.4 Sorting
Price low to high


Price high to low


Distance


Rating


Popularity


18.5 SEO Support
SEO-friendly URLs:


/search/accra


/search/ghana/kumasi


Dynamic metadata



8️⃣ Security Consideration
Even in marketplace mode:
Public search should NOT expose:
Other branches’ financial data


Internal staff data


Tenant secrets


Only expose:
Public hotel profile


Public room availability


Public pricing

10.2 Event Booking Module
Features
Event inquiry form


Quote generation


Custom pricing


Event proposal


Event contract upload


Booking confirmation


Deposit handling


Event timeline tracking


Event status:


Inquiry


Quoted


Confirmed


Ongoing


Completed


Cancelled



10.3 Event Billing
Hall rental charges


Catering charges


Equipment rental


Decoration fees


Staff charges


Security fees


Add-ons


Installment payment tracking


Invoice generation


Paystack payment



10.4 Event Resource Management
Assign halls


Assign rooms for guests


Assign staff


Equipment management:


Projectors


Speakers


Microphones


Catering coordination


Setup checklist



10.5 Event Calendar
Calendar view


Conflict detection


Multi-hall booking prevention


Branch-level event tracking



10.6 Event Reporting
Revenue per event type


Monthly event income


Most booked hall


Catering revenue


Event profitability



11️⃣ POS / RESTAURANT (Optional Add-On)
Menu management


Table management


Order tickets


Add to room bill


Inventory tracking


Sales reports



12️⃣ STAFF MANAGEMENT
Staff profile


Role assignment


Branch assignment


Shift scheduling


Attendance tracking


Activity logs



13️⃣ SUBSCRIPTION MODULE (SaaS)
Plan-Based Limits
Number of branches


Number of rooms


Event module access


POS access


Staff user limit


Features
Free trial


Plan upgrade/downgrade


Payment via Paystack


Tenant suspension on non-payment



14️⃣ SECURITY REQUIREMENTS
JWT authentication


Session validation


Role-based permissions


Tenant enforcement middleware


Encrypted Paystack credentials


Audit logs


Activity tracking


Rate limiting


Backup strategy



15️⃣ NON-FUNCTIONAL REQUIREMENTS
Scalable architecture


Optimized MongoDB indexes


Response time < 500ms


Background jobs for:


Payment verification


Event reminders


Invoice generation


Night audit



16️⃣ DATABASE CORE STRUCTURE (High-Level)
Every operational document must include:
tenantId


branchId (when applicable)


createdBy


timestamps


Core collections:
tenants


branches


users


rooms


bookings


guests


invoices


payments


events


eventHalls


eventResources


housekeepingTasks


maintenanceTickets


subscriptions

🔥 What I Recommend for You

Since you are building:

Multi-tenant
Multi-branch
SaaS
With public booking + internal staff

Best architecture:

🔵 Combination Strategy

For Admin/Staff:
→ Session-based tenantId (login scoped)

For Public Booking:
→ URL path-based tenant slug

Example:

Internal:

yourplatform.com/dashboard

Public booking:

yourplatform.com/hotel/goldentulip/book

That gives you:

Clean internal system

SEO-friendly booking pages

No subdomain complexity

Clean architecture

🏗 Example Middleware Logic (Conceptually)

Check if route is public booking

Extract slug from URL

Resolve tenant

Else (authenticated routes)

Extract tenantId from session

Validate role

Inject tenant context

That’s enterprise-ready.

⚠️ Important Security Rule

No matter which method you use:

Every query must include:

tenantId

Never trust frontend.
Always enforce tenant filtering in backend.

One missing filter = data leak across hotels.

Game over.

🚀 If I Were Architecting This For Scale

I would use:

URL path-based tenant slug for public pages

Session/JWT-based tenantId for dashboard