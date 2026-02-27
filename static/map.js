async function drawTourPolylines(map, tourId) { // This is what draws all routes
  const res = await fetch(`/get_tour_poly/${tourId}`); // Get list of polylines
  if (!res.ok) throw new Error(await res.text());

  const data = await res.json();
  const encodedList = data.polylines || []; // Error checking 

  const bounds = new google.maps.LatLngBounds();

  for (const encoded of encodedList) { // Decode and draw each polyline
    const path = google.maps.geometry.encoding.decodePath(encoded);

    new google.maps.Polyline({
      path,
      map,
      strokeWeight: 5,
    });

    path.forEach((p) => bounds.extend(p));
  }

  if (!bounds.isEmpty()) {
    map.fitBounds(bounds); // Sets center to the route
  }
}


async function initMap() {
    // Load libraries once, the right way
    await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    await google.maps.importLibrary("geometry"); // needed for decodePath

    const mapElement = document.querySelector("gmp-map");
    const map = mapElement.innerMap;

    map.setOptions({ mapTypeControl: false });

    const tourId = 1; // or inject via Jinja
    await drawTourPolylines(map, tourId);

    /*
    new AdvancedMarkerElement({
        map,
        position: { lat: 38.542008891264835, lng: -106.9192208684668 },
        title: "Center",
    });

    new AdvancedMarkerElement({
        map,
        position: { lat: 38.54427083399328, lng: -106.91913450124804 },
        title: "Center",
    });
    */

    await plotRoute(map);
}

async function getEncodedPolylineFromBackend() { // This gets route from orgin to destination. This will end up in backend later
  const res = await fetch("/api/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.encodedPolyline;
}

async function plotRoute(map) {
  const origin = { lat: 38.542008891264835, lng: -106.9192208684668 };
  const destination = { lat: 38.54427083399328, lng: -106.91913450124804 };

  const encoded = await getEncodedPolylineFromBackend(origin, destination);

  const path = google.maps.geometry.encoding.decodePath(encoded);

  const polyline = new google.maps.Polyline({
    path,
    map,
    strokeWeight: 5,
  });

  const bounds = new google.maps.LatLngBounds();
  path.forEach((p) => bounds.extend(p));
  map.fitBounds(bounds);

  return { encoded, polyline };
}

initMap().catch(console.error);
