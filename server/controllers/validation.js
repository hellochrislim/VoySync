export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function requiredText(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `${label} is required.`);
}

export function integer(value, label, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new HttpError(400, `${label} must be a whole number of at least ${minimum}.`);
  }
}

export function calendarDate(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, `${label} must use YYYY-MM-DD.`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, `${label} must be a valid calendar date.`);
  }
}

export function todayInSingapore() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

const tripTransitions = {
  planning: ['planning', 'confirmed', 'cancelled'],
  confirmed: ['confirmed', 'completed', 'cancelled'],
  completed: ['completed'],
  cancelled: ['cancelled'],
};
const bookingTransitions = { ...tripTransitions, pending: ['pending', 'confirmed', 'cancelled'] };

export function validateRecord(resource, data, previous) {
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && typeof value === 'object') throw new HttpError(400, `${key} must be a single value.`);
  }
  if (resource === 'users') {
    requiredText(data.name, 'Name');
    requiredText(data.email, 'Email');
    if (data.email !== data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new HttpError(400, 'Enter a valid email address without surrounding spaces.');
    }
    for (const field of ['gender', 'preferred_travel_style']) {
      if (data[field] != null && typeof data[field] !== 'string') throw new HttpError(400, `${field} must be text.`);
    }
    if (data.date_of_birth != null) {
      calendarDate(data.date_of_birth, 'Date of birth');
      if (data.date_of_birth > todayInSingapore()) throw new HttpError(400, 'Date of birth cannot be in the future.');
    }
  }
  if (resource === 'countries') {
    if (!/^[A-Z]{2}$/.test(data.country_code)) throw new HttpError(400, 'Country code must be two uppercase letters.');
    requiredText(data.country_name, 'Country name');
    requiredText(data.region, 'Region');
  }
  if (resource === 'destinations') {
    requiredText(data.name, 'Destination name');
    requiredText(data.country_code, 'Country code');
    integer(data.estimated_base_cost_cents, 'Base cost in cents');
    if (typeof data.popularity_rating !== 'number' || !Number.isFinite(data.popularity_rating) || data.popularity_rating < 0 || data.popularity_rating > 5) {
      throw new HttpError(400, 'Popularity rating must be a number between 0 and 5.');
    }
  }
  if (resource === 'trips') {
    integer(data.user_id, 'User ID', 1);
    integer(data.destination_id, 'Destination ID', 1);
    calendarDate(data.start_date, 'Start date');
    calendarDate(data.end_date, 'End date');
    if (data.end_date < data.start_date) throw new HttpError(400, 'End date cannot be before start date.');
    integer(data.planned_budget_cents, 'Planned budget in cents');
    if (!Object.hasOwn(tripTransitions, data.status)) throw new HttpError(400, 'Choose a valid trip status.');
    if (previous && !tripTransitions[previous.status].includes(data.status)) {
      throw new HttpError(409, `A ${previous.status} trip cannot become ${data.status}.`);
    }
  }
  if (resource === 'bookings') {
    integer(data.trip_id, 'Trip ID', 1);
    requiredText(data.provider, 'Provider');
    requiredText(data.reference_code, 'Reference code');
    if (!['flight', 'hotel', 'tour'].includes(data.booking_type)) throw new HttpError(400, 'Choose flight, hotel, or tour.');
    integer(data.cost_cents, 'Cost in cents');
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(data.status)) throw new HttpError(400, 'Choose a valid booking status.');
    if (previous && !bookingTransitions[previous.status].includes(data.status)) {
      throw new HttpError(409, `A ${previous.status} booking cannot become ${data.status}.`);
    }
  }
  if (resource === 'itinerary') {
    integer(data.trip_id, 'Trip ID', 1);
    requiredText(data.activity_name, 'Activity');
    requiredText(data.location, 'Location');
    if (data.place_id != null) integer(data.place_id, 'Place ID', 1);
    if (data.notes != null && typeof data.notes !== 'string') throw new HttpError(400, 'Notes must be text.');
    const value = data.scheduled_datetime;
    if (value == null) return;
    if (typeof value === 'string' && value.length === 10) return calendarDate(value, 'Activity date');
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
      throw new HttpError(400, 'Activity time must use YYYY-MM-DD HH:MM:SS in destination-local time.');
    }
    calendarDate(value.slice(0, 10), 'Activity date');
    if (+value.slice(11, 13) > 23 || +value.slice(14, 16) > 59 || +value.slice(17, 19) > 59) {
      throw new HttpError(400, 'Activity time must be a valid clock time.');
    }
    if (data.notes != null && typeof data.notes !== 'string') throw new HttpError(400, 'Notes must be text.');
  }
}
