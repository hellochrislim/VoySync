export default function PageHeading({ title, description, children }) {
  return <header className="page-heading"><div><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{children}</header>;
}
