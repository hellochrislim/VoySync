import { Outlet } from "react-router-dom";
import NavBar from "../components/NavBar.jsx";
import "../flat.css";
export default function Layout() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <NavBar />
      <main id="main-content" className="flat-main">
        <Outlet />
      </main>
    </>
  );
}
