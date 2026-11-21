import PageHeading from '../components/PageHeading.jsx';
import ResourceManager from '../components/ResourceManager.jsx';
import { today } from '../lib/format.js';

export default function Profiles() {
  const fields = [
    { name: 'name', label: 'Full name', required: true },
    { name: 'email', label: 'Email address', type: 'email', required: true },
    { name: 'gender', label: 'Gender' },
    { name: 'date_of_birth', label: 'Date of birth', type: 'date', max: today() },
    { name: 'preferred_travel_style', label: 'Preferred travel style', placeholder: 'e.g. Culture & food' },
  ];
  const columns = [
    { key: 'user_id', label: 'ID' }, { key: 'name', label: 'Traveler' },
    { key: 'email', label: 'Email' }, { key: 'preferred_travel_style', label: 'Travel style' },
    { key: 'date_of_birth', label: 'Date of birth' },
  ];
  return <><PageHeading title="Travelers" description="A home for every traveler's details and preferences." /><ResourceManager resource="users" title="Traveler profiles" singular="Traveler" idKey="user_id" fields={fields} columns={columns} formHint="Name and email are required. A traveler with trips cannot be deleted." /></>;
}
