import { Link, Route, Routes } from 'react-router-dom';
import Layout from './pages/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profiles from './pages/Profiles.jsx';
import Destinations from './pages/Destinations.jsx';
import Trips from './pages/Trips.jsx';
import Bookings from './pages/Bookings.jsx';
import Itinerary from './pages/Itinerary.jsx';
import Admin from './pages/Admin.jsx';

import TripPlan from './pages/TripPlan.jsx';

export default function App() {
  return <Routes><Route path="/" element={<Layout />}>
    <Route index element={<Dashboard />} />
    <Route path="profiles" element={<Profiles />} />
    <Route path="destinations" element={<Destinations />} />
    <Route path="trips/:id" element={<TripPlan />} />
    <Route path="trips" element={<Trips />} />
    <Route path="bookings" element={<Bookings />} />
    <Route path="itinerary" element={<Itinerary />} />
    <Route path="admin" element={<Admin />} />
    <Route path="*" element={<div className="panel"><h1>A little off the map.</h1><p>This page could not be found.</p><Link to="/" className="button primary">Back to overview</Link></div>} />
  </Route></Routes>;
}
