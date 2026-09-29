import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

// Matches wireframe Screen 2 — Availability Dashboard.
// Desk grid reflects the (desk_id, date, timeslot) availability check
// exposed by GET /desks/availability.
export default function Dashboard() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [timeslot, setTimeslot] = useState("AM");
  const [desks, setDesks] = useState([]);
  const [selectedDesk, setSelectedDesk] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getAvailability(date, timeslot)
      .then(setDesks)
      .catch(() => setError("Could not load desk availability."));
  }, [date, timeslot]);

  async function handleBook() {
    if (!selectedDesk) return;
    setError(null);
    try {
      const booking = await api.createBooking(selectedDesk, date, timeslot);
      navigate("/confirmation", { state: { booking } });
    } catch (err) {
      if (err.status === 409) {
        setError(err.body?.message || "That booking could not be completed.");
        setSelectedDesk(null);
        api.getAvailability(date, timeslot).then(setDesks);
      } else {
        setError("Could not complete the booking.");
      }
    }
  }

  return (
    <div className="screen">
      <div className="screen-header">Available Desks</div>
      <div className="screen-body">
        <label className="field-label">Date</label>
        <input
          className="field"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {["AM", "PM", "FULL_DAY"].map((slot) => (
            <button
              key={slot}
              className="btn-outline"
              style={{
                width: "auto",
                padding: "6px 12px",
                fontWeight: timeslot === slot ? "bold" : "normal",
                borderWidth: timeslot === slot ? 2 : 1,
              }}
              onClick={() => setTimeslot(slot)}
            >
              {slot}
            </button>
          ))}
        </div>

        {error && <div className="error-text">{error}</div>}

        <div className="desk-grid">
          {desks.map(({ desk, available }) => (
            <div
              key={desk.id}
              className={`desk ${!available ? "taken" : ""} ${selectedDesk === desk.id ? "selected" : ""}`}
              onClick={() => available && setSelectedDesk(desk.id)}
            >
              {desk.label}
            </div>
          ))}
        </div>

        <button className="btn" disabled={!selectedDesk} onClick={handleBook}>
          Book Selected Desk
        </button>
      </div>
    </div>
  );
}
