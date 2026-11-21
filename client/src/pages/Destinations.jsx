import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeading from '../components/PageHeading.jsx';
import ResourceManager from '../components/ResourceManager.jsx';
import useApi from '../hooks/useApi.js';
import { money } from '../lib/format.js';

const countryFields = [
  { name: 'country_code', label: 'Country code', required: true, maxLength: 2, pattern: '[A-Z]{2}', readonlyOnEdit: true, hint: 'Two uppercase letters, e.g. JP.' },
  { name: 'country_name', label: 'Country name', required: true },
  { name: 'region', label: 'Region', required: true, placeholder: 'e.g. Asia' },
];
export default function Destinations() {
  const [region,setRegion]=useState("");
  const countries = useApi('/countries');
  const fields = [
    { name: 'name', label: 'Destination name', required: true, placeholder: 'e.g. Kyoto' },
    { name: 'country_code', label: 'Country', type: 'select', required: true, options: (countries.data || []).map((row) => ({ value: row.country_code, label: row.country_name })) },
    { name: 'estimated_base_cost_cents', label: 'Estimated base cost (SGD)', type: 'money', required: true, placeholder: '1200.00' },
    { name: 'popularity_rating', label: 'Popularity (0–5)', type: 'number', number: true, required: true, min: 0, max: 5, step: '0.1' },
  ];
  const columns = [
    { key: 'destination_id', label: 'Trip', render: id => <Link className='sub-link' to={'/trips?destination='+id}>Plan a trip here</Link> }, { key: 'name', label: 'Destination', render: (value, row) => <div className="table-primary">{value}<small>{row.country_name}</small></div> },
    { key: 'region', label: 'Region' }, { key: 'estimated_base_cost_cents', label: 'Base cost', render: money },
    { key: 'popularity_rating', label: 'Popularity', render: (value) => <span className="rating">★ {Number(value).toFixed(1)} / 5</span> },
  ];
  return <><PageHeading title="Explore destinations" description="Discover and maintain your destination catalog, from familiar favorites to somewhere new." /><label className="region-filter">Filter directory by region <select value={region} onChange={e=>setRegion(e.target.value)}><option value="">All regions</option>{[...new Set((countries.data||[]).map(c=>c.region))].map(r=><option key={r}>{r}</option>)}</select></label><ResourceManager regionFilter={region} resource="destinations" title="Destination directory" singular="Destination" idKey="destination_id" fields={fields} columns={columns} onRetryDependencies={countries.reload} dependenciesError={countries.error} formHint="Sorted by base cost, region, then popularity. Destinations referenced by trips cannot be deleted." />
    <details className="catalog-details"><summary>Manage the country catalog <span>Country names and regions are stored once</span></summary><ResourceManager resource="countries" title="Countries" singular="Country" idKey="country_code" fields={countryFields} columns={[{ key: 'country_code', label: 'Code' }, { key: 'country_name', label: 'Country' }, { key: 'region', label: 'Region' }]} onSaved={countries.reload} formHint="Add the country before adding its destinations. A country still referenced by a destination cannot be deleted." /></details>
  </>;
}
