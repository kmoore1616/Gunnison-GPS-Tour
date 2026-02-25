let polylines = [];
let markers = [];

async function initMap() {
  const { Route } = await google.maps.importLibrary("routes");
  const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');

  const map = document.getElementById('map');
  const messageBox = document.getElementById('message-box');

  const computeRoutesForm = document.getElementById('compute-routes-form');
  computeRoutesForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageBox.textContent = '';
    polylines.forEach((p) => p.setMap(null));
    polylines = [];
    markers.forEach((m) => m.map = null);
    markers = [];

    const originLat = parseFloat(document.getElementById('origin-lat').value);
    const originLng = parseFloat(document.getElementById('origin-lng').value);
    const destLat = parseFloat(document.getElementById('dest-lat').value);
    const destLng = parseFloat(document.getElementById('dest-lng').value);

    if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
      messageBox.textContent = 'Please enter valid coordinates for origin and destination.';
      return;
    }

    const travelMode = document.getElementById('travel-mode').value;
    const { routes } = await Route.computeRoutes({
      origin: {
        location: {
          lat: originLat,
          lng: originLng
        }
      },
      destination: {
        location: {
          lat: destLat,
          lng: destLng
        }
      },
      travelMode: travelMode,
      fields: ['path', 'legs', 'viewport', 'localizedValues', 'warnings', 'distanceMeters', 'durationMillis'],
    });

    if (!routes || !routes.length) {
      messageBox.textContent = 'No routes found.';
      return;
    }
    const route = routes[0];
    polylines = route.createPolylines({
      polylineOptions: { map: map.innerMap },
    });
    markers = await route.createWaypointAdvancedMarkers({
        map: map.innerMap,
    });
    map.innerMap.fitBounds(route.viewport);

    const routeInfo = document.createElement('div');
    routeInfo.className = 'route-info';

    const distanceText = route.localizedValues?.distance?.text ??
      (route.distanceMeters ? `${(route.distanceMeters / 1000).toFixed(1)} km` : 'Not available');
    const durationText = route.localizedValues?.duration?.text ??
      (route.durationMillis ? `${Math.round(route.durationMillis / 60000)} min` : 'Not available');

    let summaryHTML = `
        <h3>Route Details</h3>
        <p>Distance: ${distanceText}</p>
        <p>Duration: ${durationText}</p>
    `;
    routeInfo.innerHTML = summaryHTML;

    if (route.warnings && route.warnings.length > 0) {
        const warningsList = document.createElement('ul');
        route.warnings.forEach(warning => {
            const li = document.createElement('li');
            li.textContent = warning;
            warningsList.appendChild(li);
        });
        routeInfo.appendChild(warningsList);
    }
    messageBox.appendChild(routeInfo);
  });
}

initMap();
