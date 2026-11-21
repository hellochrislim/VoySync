export default function InputId({ value }) {
  return value !== undefined && value !== null ? <p className="record-id">Editing record #{value}</p> : null;
}
