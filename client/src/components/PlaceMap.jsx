import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
export default function PlaceMap({ places, stops, selected, onSelect, city }) {
  const host = useRef(null),
    instance = useRef(null);
  const [streets, setStreets] = useState(false),
    [tileError, setTileError] = useState(false);
  useEffect(() => {
    const map = L.map(host.current, {
      scrollWheelZoom: false,
      zoomSnap: 0.25,
      maxZoom: 18,
      minZoom: 2,
    });
    instance.current = map;
    const points = places.map((p) => [p.latitude, p.longitude]);
    const fit = () => {
      if (points.length > 1)
        map.fitBounds(points, {
          paddingTopLeft: [32, 40],
          paddingBottomRight: [110, 38],
          maxZoom: 15,
        });
      else map.setView(points[0] || [0, 0], points.length ? 14 : 2);
    };
    fit();
    // A schematic river gives the offline Kyoto map a geographic reference.
    if (city === "Kyoto") {
      // Approximate central-Kyoto corridors for offline orientation, never for directions.
      const streets = [
        [
          "Shijo-dori",
          [
            [35.0035, 135.733],
            [35.0035, 135.778],
          ],
        ],
        [
          "Sanjo-dori",
          [
            [35.0087, 135.743],
            [35.0091, 135.77],
            [35.0098, 135.782],
          ],
        ],
        [
          "Oike-dori",
          [
            [35.0108, 135.739],
            [35.0113, 135.768],
          ],
        ],
        [
          "Karasuma-dori",
          [
            [34.981, 135.759],
            [35.007, 135.7596],
            [35.024, 135.7599],
          ],
        ],
        [
          "Kawaramachi-dori",
          [
            [34.985, 135.764],
            [35.0035, 135.769],
            [35.011, 135.7682],
            [35.022, 135.768],
          ],
        ],
      ];
      for (const [name, coords] of streets) {
        L.polyline(coords, {
          color: "#cfc9d9",
          weight: 5,
          interactive: false,
        }).addTo(map);
        L.polyline(coords, { color: "#ffffff", weight: 3 })
          .addTo(map)
          .bindTooltip(name);
      }
      L.rectangle(
        [
          [35.016, 135.7538],
          [35.024, 135.7636],
        ],
        { stroke: false, fillColor: "#b8d8bc", fillOpacity: 0.85 },
      )
        .addTo(map)
        .bindTooltip("Kyoto Gyoen");

      L.polyline(
        [
          [35.045, 135.773],
          [35.03, 135.7715],
          [35.021, 135.7715],
          [35.01, 135.7716],
          [35.003, 135.7719],
          [34.995, 135.7678],
          [34.984, 135.7648],
          [34.976, 135.7625],
          [34.969, 135.7568],
          [34.96, 135.7505],
        ],
        { color: "#9ccbd7", weight: 7, interactive: false },
      )
        .addTo(map)
        .bindTooltip("Kamo River");
    }
    L.control.scale({ imperial: false }).addTo(map);
    const observer = new ResizeObserver(() => {
      if (host.current?.clientWidth) {
        map.invalidateSize();
        fit();
      }
    });
    observer.observe(host.current);
    return () => {
      observer.disconnect();
      map.remove();
      instance.current = null;
    };
  }, [places, city]);
  useEffect(() => {
    if (!streets) return;
    const tiles = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    ).addTo(instance.current);
    tiles.on("tileerror", () => setTileError(true));
    return () => tiles.remove();
  }, [streets, places]);
  useEffect(() => {
    const map = instance.current,
      layer = L.layerGroup().addTo(map);
    for (const place of places) {
      const matching = stops.filter((s) => s.place_id === place.place_id);
      const stop = matching.find((s) => s.item_id === selected) || matching[0];
      const active = stop && stop.item_id === selected;
      const node = document.createElement("span");
      node.className = "pin" + (active ? " picked" : "");
      node.style.background = stop?.color || "#778092";
      node.textContent = stop?.number || "·";
      const marker = L.marker([place.latitude, place.longitude], {
        icon: L.divIcon({
          className: "",
          html: node,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
        title: place.name,
        zIndexOffset: active ? 2000 : stop ? 1000 : 0,
      }).addTo(layer);
      const label = document.createElement("span");
      label.textContent = place.name;
      marker.bindTooltip(label, {
        permanent: true,
        direction: place.name === "Nishiki Market" ? "left" : "right",
        offset: [10, 0],
        className: "place-label",
      });
      marker.on("click", () => onSelect(place, stop));
      if (active) map.panInside(marker.getLatLng(), { padding: [35, 35] });
    }
    return () => layer.remove();
  }, [places, stops, selected, onSelect]);
  return (
    <section className="map-panel">
      <div className="map-head">
        <h2>{city} map</h2>
        <label>
          <input
            type="checkbox"
            checked={streets}
            onChange={(e) => {
              setStreets(e.target.checked);
              setTileError(false);
            }}
          />{" "}
          Streets
        </label>
      </div>
      <div className="place-map" ref={host} />
      <div className="map-key">
        {tileError ? "Street tiles unavailable. " : ""}
        {places.length
          ? "Local landmark map · Gray pins are places without a scheduled day."
          : "No mapped places in this destination yet."}
      </div>
    </section>
  );
}
