# Likely themes (web-e-thon style) and what to prepare

The task says "a theme or general problem". Expect a short brief with deliberately vague or conflicting parts: finding and resolving those is graded. Below: common themes, the entities and rules they usually need, and typical traps.

| Theme | Roles | Core entities | Rules that need validation | Typical ambiguity or contradiction |
|---|---|---|---|---|
| University / smart campus portal | Student, Teacher, Admin | Course, Enrollment, Timetable slot, Room, Attendance | No timetable clash, room capacity, max credit hours, prerequisites | "Students can register for any course" vs "max 18 credits"; who can drop a course after the deadline? |
| Event & ticket management | Attendee, Organizer, Admin | Event, Ticket type, Registration, Check-in | Seats left, one registration per user per event, sale window, QR check-in once | Refund policy missing; is capacity per event or per ticket type? |
| Healthcare appointments | Patient, Doctor, Receptionist | Doctor, Slot, Appointment, Visit notes | No double-booking, working hours, cancel window, privacy of notes | Who can see medical notes? Walk-ins vs booked slots |
| E-commerce / marketplace | Customer, Seller, Admin | Product, Cart, Order, Stock, Coupon | Stock never negative, price at purchase time stored, coupon limits | "Free shipping over X" with multiple sellers; returns not described |
| Library / inventory / asset tracking | Member, Librarian | Item, Copy, Loan, Fine | Max loans, due dates, fines, reservation queue | Fine rate unspecified; can items be renewed unlimited times? |
| Food ordering / restaurant | Customer, Kitchen, Admin | Menu item, Order, Order line, Status | Status flow (placed, preparing, ready, delivered), min order, availability | What happens to an order when an item sells out? |
| Job portal / recruitment | Candidate, Employer, Admin | Job, Application, Interview, Status | One application per job, deadline, allowed status transitions, file type/size | Who can see which applicant data? Multiple recruiters per company? |
| Travel / tourism planner | Traveler, Agent | Destination, Trip, Itinerary day, Booking, Budget | Dates in order, budget limits, seat/room availability | Currency, time zones, cancellation rules |
| Finance tracker / expense splitting | User, Group | Transaction, Category, Budget, Group, Settlement | Amount > 0, splits sum to total, budget alerts | Rounding of splits, multiple currencies |
| Civic / NGO / donation / complaint platform | Citizen, Staff, Admin | Complaint or Campaign, Update, Donation | Status workflow, duplicates, amount limits | Anonymous reporting vs accountability |
| Task / project / HR management | Employee, Manager, Admin | Project, Task, Leave request, Attendance | Leave balance, overlapping leave, assignment permissions | Manager approvals when the manager is absent |

## How to analyse any brief in 15 minutes
1. Copy each sentence of the brief into the requirements table (verbatim, numbered).
2. For each, label: **Clear** / **Unclear** (vague word: "fast", "easy", "manage", "etc.") / **Incomplete** (missing role, limit, status, error case) / **Ambiguous** (two valid readings) / **Contradictory** (conflicts with another line).
3. Write the assumption you will build, why, and the cost to change it.
4. Draw roles x features matrix (who can create/read/update/delete what).
5. List entities, relationships, status flows and the rules (limits, uniqueness, date logic).
6. Cut scope into Must / Should / Could. Build Musts first, finish them completely.

## Wow factors that stay simple (pick at most one)
Search + filters, CSV or PDF export (papaparse, jspdf), QR codes (qrcode), charts on a dashboard (recharts), drag and drop status board (dnd-kit), map (leaflet), dark mode (already there), one small AI helper (summaries, suggestions, auto-categorise).
