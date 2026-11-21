import { useRef, useState } from 'react';
import useApi from '../hooks/useApi.js';
import { api, errorMessage } from '../lib/api.js';
import { dollars, toCents } from '../lib/format.js';
import DataTable from './DataTable.jsx';
import Field from './Field.jsx';
import InputId from './InputId.jsx';

function blankValues(fields) {
  return Object.fromEntries(fields.map((field) => [field.name, field.default ?? '']));
}

export default function ResourceManager({ resource, listQuery = "", regionFilter = "", title, singular, idKey, fields, columns, canDelete = () => true, deleteLabel = 'Delete', deleteMessage, formHint, dependenciesError, onSaved, onRetryDependencies }) {
  // The page owns form state and passes values and callbacks to reusable controls.
  const { data, loading, error, reload } = useApi(`/${resource}${listQuery}`);
  const [values, setValues] = useState(() => blankValues(fields));
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [search, setSearch] = useState('');
  const formRef = useRef(null);

  const reset = () => { setEditing(null); setValues(blankValues(fields)); setFailure(''); };
  const updateField = (name, value) => setValues((previous) => ({ ...previous, [name]: value }));
  const edit = (row) => {
    setMessage(''); setFailure(''); setEditing(row);
    setValues(Object.fromEntries(fields.map((field) => [field.name,
      field.type === 'money' ? dollars(row[field.name]) : field.type === 'datetime' ? row[field.name]?.replace(' ', 'T') : (row[field.name] ?? ''),
    ])));
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  async function submit(event) {
    event.preventDefault(); setSaving(true); setMessage(''); setFailure('');
    try {
      const payload = Object.fromEntries(fields.map((field) => {
        let value = values[field.name];
        if (field.type === 'money') value = toCents(value);
        else if (field.number) value = value === '' ? null : Number(value);
        else if (field.type === 'datetime') value = value?.replace('T', ' ') + (value?.length === 16 ? ':00' : '');
        else if (!field.required && value === '') value = null;
        return [field.name, value];
      }));
      if (editing) await api.put(`/${resource}/${encodeURIComponent(editing[idKey])}`, payload);
      else await api.post(`/${resource}`, payload);
      reset(); setMessage(`${singular} ${editing ? 'updated' : 'created'}.`); reload(); onSaved?.();
    } catch (problem) { setFailure(problem.response ? errorMessage(problem) : problem.message); }
    finally { setSaving(false); }
  }

  async function remove(row) {
    const detail = deleteMessage ? deleteMessage(row) : `Delete this ${singular.toLowerCase()}? This cannot be undone.`;
    if (!window.confirm(detail)) return;
    setSaving(true); setMessage(''); setFailure('');
    try {
      await api.delete(`/${resource}/${encodeURIComponent(row[idKey])}`);
      if (editing?.[idKey] === row[idKey]) reset();
      setMessage(`${singular} deleted.`); reload(); onSaved?.();
    } catch (problem) { setFailure(errorMessage(problem)); }
    finally { setSaving(false); }
  }

  return <section className="resource-manager">
    {(failure || dependenciesError || error) && <div className="alert error" role="alert">{failure || dependenciesError || error}<button className="text-button" onClick={() => { reload(); onRetryDependencies?.(); }}>Retry</button></div>}
    {message && <div className="alert success" role="status">{message}</div>}
    <div className="panel form-panel" ref={formRef}>
      <div className="section-title"><div><p className="eyebrow">{editing ? 'MAKE AN ADJUSTMENT' : 'MAKE IT YOURS'}</p><h2>{editing ? `Edit ${singular.toLowerCase()}` : `Add ${singular.toLowerCase()}`}</h2></div><InputId value={editing?.[idKey]} /></div>
      {formHint && <p className="muted form-hint">{formHint}</p>}
      <form onSubmit={submit}><fieldset disabled={saving}><div className="form-grid">{fields.map((field) => <Field key={field.name} field={field} value={values[field.name]} editing={editing} prefix={resource} onChange={updateField} />)}</div><div className="form-actions"><button className="button primary" type="submit">{saving ? 'Saving…' : editing ? 'Save changes' : `Add ${singular.toLowerCase()}`}</button><button className="button secondary" type="button" onClick={reset}>{editing ? 'Cancel editing' : 'Clear form'}</button></div></fieldset></form>
    </div>
    <div className="panel list-panel"><div className="section-title"><h2>{title}</h2><div className="inline-actions"><input className="table-search" type="search" aria-label={`Search ${title.toLowerCase()}`} placeholder="Search records…" value={search} onChange={(event) => setSearch(event.target.value)} /><span className="count">{data?.length ?? 0} total</span><button className="text-button" onClick={reload} disabled={loading}>Refresh</button></div></div>
      {loading ? <p className="loading" role="status">Loading {title.toLowerCase()}…</p> : !error && <DataTable rows={(data || []).filter((row) => (!regionFilter || row.region === regionFilter) && Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(search.toLowerCase())))} columns={columns} idKey={idKey} actions={(row) => <><button className="text-button" disabled={saving} onClick={() => edit(row)}>Edit</button>{canDelete(row) && <button className="text-button danger" disabled={saving} onClick={() => remove(row)}>{deleteLabel}</button>}</>} />}
    </div>
  </section>;
}
