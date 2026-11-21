import PageHeading from '../components/PageHeading.jsx';
import ResourceManager from '../components/ResourceManager.jsx';
import useApi from '../hooks/useApi.js';

export default function Itinerary() {
  const trips = useApi('/trips');
  const fields = [
    { name: 'trip_id', label: 'Trip', type: 'select', number: true, required: true, options: (trips.data || []).map((row) => ({ value: row.trip_id, label: `#${row.trip_id} · ${row.destination_name} · ${row.start_date} to ${row.end_date}` })) },
    { name: 'activity_name', label: 'Activity', required: true, placeholder: 'e.g. Explore the old town' },
    { name: 'scheduled_datetime', label: 'Local date & time', type: 'datetime', step: '1', required: true, hint: 'Use the destination’s local time, within the trip dates.' },
    { name: 'location', label: 'Location', required: true, placeholder: 'Where will you be?' },
    { name: 'notes', label: 'Notes', type: 'textarea', wide: true },
  ];
  const columns = [
    { key: 'item_id', label: 'ID' }, { key: 'activity_name', label: 'Activity', render: (value, row) => <div className="table-primary">{value}<small>{row.notes || 'No notes'}</small></div> },
    { key: 'destination_name', label: 'Trip', render: (value, row) => `#${row.trip_id} · ${value}` },
    { key: 'scheduled_datetime', label: 'Destination-local time' }, { key: 'location', label: 'Location' },
  ];
  return <><PageHeading title="Make room for discovery." description="Build your day-by-day plan, one memorable moment at a time." /><ResourceManager resource="itinerary" title="Scheduled activities" singular="Activity" idKey="item_id" fields={fields} columns={columns} onRetryDependencies={trips.reload} dependenciesError={trips.error} formHint="Activities are shown in chronological order. The database keeps every activity within its parent trip's dates." /></>;
}
