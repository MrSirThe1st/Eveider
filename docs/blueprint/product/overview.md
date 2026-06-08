# What Is Eveider

Eveider is a **pickup locker platform** that connects **businesses**, customers, couriers, and operations teams around a shared parcel lifecycle — from business submission through locker drop-off to PIN-based collection.

## Problem

Last-mile delivery often fails when recipients are unavailable. Parcels bounce between re-delivery attempts, support calls pile up, and couriers lose time on failed handoffs. **Businesses** that sell and ship goods lack a simple way to hand off last-mile delivery to a locker network. Retailers and logistics operators lack a single view of locker occupancy, delivery exceptions, and pickup completion.

## Solution

Eveider provides:

- **Business onboarding** — companies register to send parcels through Eveider's locker network
- **Smart lockers** as a reliable handoff point between courier and customer
- **A unified mobile app** where customers track parcels and couriers complete deliveries — role determined after login
- **A business portal** to submit parcels and track shipment outcomes for their customers
- **An admin dashboard** for operations to monitor deliveries, manage businesses, lockers, and couriers, and resolve issues in real time

The customer receives a **pickup PIN** when their parcel is ready. They collect it from the assigned locker compartment without needing to coordinate schedules with a courier.

## Market

Eveider is operated in the **Democratic Republic of Congo (RDC)**.

- **Language:** French for all user-facing surfaces
- **Currencies:** USD and Congolese franc (FC / CDF)
- **Brand feel:** Industrial logistics network — professional, structured, operational (see [design-dna.md](design-dna.md))

## Surfaces

| Surface | Audience | Platform |
|---------|----------|----------|
| Mobile app | Customers and couriers | iOS / Android (single app, role-based UI) |
| Business portal | Registered businesses | Web |
| Admin dashboard | Eveider operations and management | Web |

## MVP Scope

The first release focuses on operational reliability, not feature breadth.

**In scope**

- Business registration and parcel submission
- Authentication with OTP / SMS verification
- Full parcel lifecycle tracking (created → collected)
- Customer home, tracking, PIN pickup, and notifications
- Courier assignment, scan, locker drop-off, and issue reporting
- Admin overview, business/parcel/user/courier/locker management, live monitoring, basic analytics
- Support and issue resolution workflows

**Out of scope (for now)**

- Advanced routing optimization
- Per-business white-label branding
- Complex billing or subscription management
- Deep integrations beyond locker selection at checkout (when added later)

## Success Metrics (MVP)

- Active businesses — registered companies submitting parcels
- Pickup success rate — parcels collected vs. ready for pickup
- Locker usage rate — active compartments vs. total capacity
- Failed delivery rate — exceptions per total deliveries
- Time to pickup — delivered to locker → collected

## Related Docs

- [Brand](brand.md)
- [Design DNA](design-dna.md)
- [Roles & flows](roles-and-flows.md)
- [Glossary](glossary.md)
- [Customer mobile features](features/customer-mobile.md)
- [Courier mobile features](features/courier-mobile.md)
- [Business portal features](features/business-portal.md)
- [Admin dashboard features](features/admin-dashboard.md)
