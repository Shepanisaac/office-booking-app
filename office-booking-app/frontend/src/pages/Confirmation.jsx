import { useLocation, useNavigate } from "react-router-dom";

// Matches wireframe Screen 3 — Booking Confirmation.
// The check-in notice mirrors the auto-release job (see
// backend/jobs/releaseNoShows.js and the schema doc §3.2).
export default function Confirmation() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const booking = state?.booking;

  if (!booking) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="screen">
      <div className="screen-header">Confirmation</div>
      <div className="screen-body" style={{ textAlign: "center" }}>
        <div
          style={{
            width: 54, height: 54, borderRadius: "50%", border: "2px solid var(--line)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "6px auto 18px", fontSize: 22,
          }}
        >
          ✓
        </div>
        <h2 style={{ fontSize: 16, marginBottom: 4 }}>Desk Reserved</h2>
        <p style={{ fontSize: 12, color: "var(--text-soft)", marginBottom: 20 }}>
          A confirmation has been sent to your email
        </p>

        <div style={{ border: "1px solid var(--line-soft)", padding: 14, textAlign: "left", marginBottom: 16 }}>
          <Row label="Desk" value={booking.desk_id} />
          <Row label="Date" value={booking.booking_date} />
          <Row label="Timeslot" value={booking.timeslot} />
          <Row label="Status" value={booking.status} />
        </div>

        <div className="notice" style={{ textAlign: "left" }}>
          Reminder: check in within 15 minutes of your slot starting, or this desk will be
          automatically released for others to book.
        </div>

        <button className="btn" onClick={() => navigate("/dashboard")}>View My Bookings</button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 0" }}>
      <span style={{ color: "var(--text-soft)" }}>{label}</span>
      <span style={{ fontWeight: "bold" }}>{value}</span>
    </div>
  );
}
