import { NavLink } from "react-router-dom";
export default function NavBar() {
  return (
    <header className="flat-nav">
      <NavLink className="wordmark" to="/">
        <span className="brand-symbol" aria-hidden="true">
          ↗
        </span>
        VoySync
      </NavLink>
      <nav aria-label="Main navigation">
        {[
          ["/", "My trips"],
          ["/destinations", "Explore"],
          ["/profiles", "Travelers"],
          ["/admin", "Reports"],
        ].map(([url, name]) => (
          <NavLink end={url === "/"} key={url} to={url}>
            {name}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
