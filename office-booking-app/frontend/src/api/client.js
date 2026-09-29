// Thin wrapper around fetch, mapped to the endpoints in
// API_Reference.md / openapi.yaml.

const BASE_URL = "/v1";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = `Bearer ${getToken()}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || res.statusText);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export const api = {
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  register: (name, email, password) =>
    request("/auth/register", { method: "POST", body: { name, email, password } }),

  getAvailability: (date, timeslot) =>
    request(`/desks/availability?date=${date}&timeslot=${timeslot}`, { auth: true }),

  myBookings: (status) => request(`/bookings${status ? `?status=${status}` : ""}`, { auth: true }),

  // Returns 409 if the desk was just taken — handled by the caller.
  createBooking: (desk_id, booking_date, timeslot) =>
    request("/bookings", { method: "POST", auth: true, body: { desk_id, booking_date, timeslot } }),

  cancelBooking: (id) => request(`/bookings/${id}`, { method: "DELETE", auth: true }),

  // Returns 410 if the booking was already auto-released for a no-show.
  checkIn: (id) => request(`/bookings/${id}/check-in`, { method: "POST", auth: true }),
};
