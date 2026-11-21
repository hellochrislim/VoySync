import PageHeading from '../components/PageHeading.jsx';
import ResourceManager from '../components/ResourceManager.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import useApi from '../hooks/useApi.js';
import { money } from '../lib/format.js';

const transitions = { pending: ['pending', 'confirmed', 'cancelled'], confirmed: ['confirmed', 'completed', 'cancelled'], completed: ['completed'], cancelled: ['cancelled'] };
export default function Bookings({trip, onSaved}) {
  const trips = useApi('/trips');
  const fields = [
    { name: 'trip_id', default: trip?.trip_id, label: 'Trip', type: 'select', number: true, required: true, options: (trip ? [trip] : trips.data || []).map((row) => ({ value: row.trip_id, label: `#${row.trip_id} · ${row.destination_name} · ${row.start_date}` })) },
    { name: 'booking_type', label: 'Booking type', type: 'select', required: true, options: ['flight', 'hotel', 'tour'].map((value) => ({ value, label: value })) },
    { name: 'provider', label: 'Provider', required: true, placeholder: 'e.g. Singapore Airlines' },
    { name: 'reference_code', label: 'Reference code', required: true, placeholder: 'External booking reference' },
    { name: 'cost_cents', label: 'Cost (SGD)', type: 'money', required: true, placeholder: '450.00' },
    { name: 'status', label: 'Booking status', type: 'select', required: true, default: 'pending', options: (editing) => (editing ? transitions[editing.status] : ['pending', 'confirmed']).map((value) => ({ value, label: value })) },
  ];
  const columns = [
    { key: 'booking_id', label: 'ID' }, { key: 'provider', label: 'Reservation', render: (value, row) => <div className="table-primary">{value}<small>{row.reference_code}</small></div> },
    { key: 'destination_name', label: 'Trip', render: (value, row) => `#${row.trip_id} · ${value}` },
    { key: 'booking_type', label: 'Type' }, { key: 'cost_cents', label: 'Cost', render: money },
    { key: 'status', label: 'Status', render: (value) => <StatusBadge value={value} /> },
  ];
  return <>{!trip && <PageHeading title="Reservations" />}<ResourceManager resource="bookings" listQuery={trip ? "?trip_id="+trip.trip_id : ""} onSaved={onSaved} title="All bookings" singular="Booking" idKey="booking_id" fields={fields} columns={columns} onRetryDependencies={trips.reload} dependenciesError={trips.error} formHint="Record reservations made with external providers. Updating these records does not change a reservation with the provider. Cancelled bookings are excluded from trip spend." /></>;
}
