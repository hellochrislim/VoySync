import { Link, useSearchParams } from 'react-router-dom';
import PageHeading from '../components/PageHeading.jsx';
import ResourceManager from '../components/ResourceManager.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import useApi from '../hooks/useApi.js';
import { money } from '../lib/format.js';

const transitions = { planning: ['planning', 'confirmed', 'cancelled'], confirmed: ['confirmed', 'completed', 'cancelled'], completed: ['completed'], cancelled: ['cancelled'] };
export default function Trips() {
  const [params] = useSearchParams();
  const users = useApi('/users');
  const destinations = useApi('/destinations');
  const fields = [
    { name: 'user_id', label: 'Traveler', type: 'select', number: true, required: true, options: (users.data || []).map((row) => ({ value: row.user_id, label: row.name })) },
    { name: 'destination_id', default: params.get('destination') || '', label: 'Destination', type: 'select', number: true, required: true, options: (destinations.data || []).map((row) => ({ value: row.destination_id, label: `${row.name}, ${row.country_name || row.country_code}` })) },
    { name: 'start_date', label: 'Start date', type: 'date', required: true },
    { name: 'end_date', label: 'End date', type: 'date', required: true },
    { name: 'planned_budget_cents', label: 'Planned budget (SGD)', type: 'money', required: true, placeholder: '2500.00' },
    { name: 'status', label: 'Trip status', type: 'select', required: true, default: 'planning', options: (editing) => (editing ? transitions[editing.status] : ['planning']).map((value) => ({ value, label: value })) },
  ];
  const columns = [
    { key: 'trip_id', label: 'ID' },
    { key: 'destination_name', label: 'Journey', render: (value, row) => <div className="table-primary"><Link to={`/trips/${row.trip_id}`}>{value}</Link><small>{row.user_name}</small></div> },
    { key: 'start_date', label: 'Travel dates', render: (value, row) => <span className="date-range">{value}<small>to {row.end_date}</small></span> },
    { key: 'planned_budget_cents', label: 'Budget', render: money },
    { key: 'booking_cost_cents', label: 'Booked', render: money },
    { key: 'status', label: 'Status', render: (value) => <StatusBadge value={value} /> },
  ];
  return <><PageHeading title="Trip details" description="Choose a traveler, destination and dates." /><ResourceManager resource="trips" title="All trips" singular="Trip" idKey="trip_id" fields={fields} columns={columns} onRetryDependencies={() => { users.reload(); destinations.reload(); }} dependenciesError={users.error || destinations.error} canDelete={(row) => row.status === 'cancelled'} deleteLabel="Purge" deleteMessage={(row) => `Permanently purge cancelled trip #${row.trip_id} and all its bookings and itinerary items? This cannot be undone.`} formHint="Cancel a trip by editing its status. Only cancelled trips can be permanently purged. Existing activities must fit within any new travel dates." /></>;
}
