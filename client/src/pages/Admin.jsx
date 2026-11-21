import { useState } from 'react';
import PageHeading from '../components/PageHeading.jsx';
import DataTable from '../components/DataTable.jsx';
import useApi from '../hooks/useApi.js';
import { api, errorMessage } from '../lib/api.js';
import { money, today } from '../lib/format.js';

const reports = [
  { id: 'promotions', title: 'Promotion audience', tag: 'NESTED IN', description: 'Travelers with active trips to a selected region or country, as of the reporting date.', idKey: 'user_id', columns: [{ key: 'name', label: 'Traveler' }, { key: 'email', label: 'Email' }] },
  { id: 'rewards', title: 'Frequent travelers', tag: 'CORRELATED COUNT', description: 'At least two noncancelled trips or two noncancelled bookings on noncancelled trips.', idKey: 'user_id', columns: [{ key: 'name', label: 'Traveler' }, { key: 'email', label: 'Email' }, { key: 'trip_count', label: 'Trips' }, { key: 'booking_count', label: 'Bookings' }] },
  { id: 'undiscovered', title: 'Undiscovered destinations', tag: 'NOT EXISTS', description: 'Destinations without any retained trip, including cancelled trips.', idKey: 'destination_id', columns: [{ key: 'name', label: 'Destination' }, { key: 'country_name', label: 'Country' }, { key: 'estimated_base_cost_cents', label: 'Base cost', render: money }] },
  { id: 'high-budget', title: 'High-budget journeys', tag: 'ALL EQUIVALENT', description: 'Trips with a planned budget strictly greater than every destination base cost.', idKey: 'trip_id', columns: [{ key: 'trip_id', label: 'Trip' }, { key: 'destination_name', label: 'Destination' }, { key: 'user_name', label: 'Traveler' }, { key: 'planned_budget_cents', label: 'Budget', render: money }] },
];

export default function Admin() {
  const countries = useApi('/countries');
  const [selected, setSelected] = useState('promotions');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [asOf, setAsOf] = useState(today);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const report = reports.find((item) => item.id === selected);
  const regions = [...new Set((countries.data || []).map((item) => item.region))].sort();

  async function run(event) {
    event.preventDefault(); setLoading(true); setError(''); setResult(null);
    try {
      const response = await api.get(`/reports/${selected}`, { params: selected === 'promotions' ? { region: region || undefined, country_code: country || undefined, as_of: asOf } : undefined });
      setResult(response.data);
    } catch (problem) { setError(errorMessage(problem)); }
    finally { setLoading(false); }
  }

  function selectReport(id) { setSelected(id); setResult(null); setError(''); }
  return <><PageHeading eyebrow="A CLEARER VIEW" title="Travel reports" description="Explore your travel data with the report's four analysis queries." />
    <div className="report-grid">{reports.map((item) => <button key={item.id} className={`report-choice ${selected === item.id ? 'selected' : ''}`} onClick={() => selectReport(item.id)} disabled={loading}><small>{item.tag}</small><strong>{item.title}</strong><span>{item.description}</span></button>)}</div>
    <section className="panel"><div className="section-title"><h2>{report.title}</h2><span className="count">Report preview</span></div><p className="muted">{report.description}</p>
      <form onSubmit={run}><fieldset disabled={loading}><div className="form-grid report-filters">{selected === 'promotions' && <><div className="field"><label htmlFor="report-region">Region</label><select id="report-region" value={region} onChange={(event) => setRegion(event.target.value)}><option value="">Choose a region</option>{regions.map((value) => <option key={value}>{value}</option>)}</select></div><div className="field"><label htmlFor="report-country">Country</label><select id="report-country" value={country} onChange={(event) => setCountry(event.target.value)}><option value="">Choose a country</option>{(countries.data || []).map((item) => <option key={item.country_code} value={item.country_code}>{item.country_name}</option>)}</select></div><div className="field"><label htmlFor="report-date">Reporting date</label><input id="report-date" type="date" value={asOf} required onChange={(event) => setAsOf(event.target.value)} /></div></>}</div>{selected === 'promotions' && <p className="muted form-hint">Choose a region or country. With both selected, a match on either is included. This preview does not send messages.</p>}<button className="button primary" disabled={selected === 'promotions' && !region && !country}>{loading ? 'Running report…' : 'Run report'}</button></fieldset></form>
      {(error || countries.error) && <div className="alert error" role="alert">{error || countries.error}</div>}
      {result && <div className="report-results"><p className="eyebrow">{result.length} MATCHING RECORD{result.length === 1 ? '' : 'S'}</p><DataTable rows={result} columns={report.columns} idKey={report.idKey} empty="No records match this report. Try different filters or add more travel data." /></div>}
    </section>
  </>;
}
