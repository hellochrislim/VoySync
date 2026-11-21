export default function Field({ field, value, onChange, editing, prefix }) {
  const id = `${prefix}-${field.name}`;
  const options = typeof field.options === 'function' ? field.options(editing) : field.options;
  const props = {
    id, name: field.name, value: value ?? '', required: field.required,
    disabled: field.readonlyOnEdit && Boolean(editing),
    onChange: (event) => onChange(field.name, event.target.value),
  };
  return <div className={`field ${field.wide ? 'field-wide' : ''}`}><label htmlFor={id}>{field.label}{!field.required && <span> Optional</span>}</label>
    {field.type === 'select' ? <select {...props}><option value="">Choose {field.label.toLowerCase()}</option>{(options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      : field.type === 'textarea' ? <textarea {...props} rows="3" />
        : <input {...props} type={field.type === 'money' ? 'text' : field.type === 'datetime' ? 'datetime-local' : (field.type || 'text')} min={field.min} max={field.max} step={field.step} placeholder={field.placeholder} inputMode={field.type === 'money' ? 'decimal' : undefined} pattern={field.type === 'money' ? '[0-9]+([.][0-9]{1,2})?' : field.pattern} maxLength={field.maxLength} />}
    {field.hint && <small>{field.hint}</small>}
  </div>;
}
