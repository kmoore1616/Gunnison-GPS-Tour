async function drawTourPolylines(map, tourId, AdvancedMarkerElement) { // This is what draws all routes
    console.log(tourId);
    const res = await fetch(`/get_tour_poly/${tourId}`); // Get list of polylines
    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    const encodedList = data.polylines; // Error checking 

    const bounds = new google.maps.LatLngBounds(); // Automatic centering
    const coords = data.segments;
    
    var i = 0;

    for (const encoded of encodedList) { // Decode and draw each polyline
        const longitude_org = coords[i][0].lat
        const latitude_org = coords[i][0].lng
        const longitude_dst = coords[i][1].lat
        const latitude_dst = coords[i][1].lng

        const path = google.maps.geometry.encoding.decodePath(encoded);

        new AdvancedMarkerElement({
            map,
            position: { lat: latitude_org, lng: longitude_org},
            title: "Origin " + i,
        });
        
        new AdvancedMarkerElement({
            map,
            position: { lat: latitude_dst, lng: longitude_dst},
            title: "Origin " + i,
        });
        
        new google.maps.Polyline({
            path,
            map,
            strokeWeight: 5,
        });

            path.forEach((p) => bounds.extend(p)); // Automatic center

        if (!bounds.isEmpty()) {
            map.fitBounds(bounds); // Sets center to the route
        }
    }
}


async function initMap() {
    // Load libraries once, the right way
    await google.maps.importLibrary("maps");
    await google.maps.importLibrary("geometry"); // needed for decodePath
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    const mapElement = document.querySelector("gmp-map");
    const map = mapElement.innerMap;

    map.setOptions({ mapTypeControl: false });

    const tourId = 1;
    console.log(tourId);
    await drawTourPolylines(map, tourId, AdvancedMarkerElement);

}

initMap().catch(console.error);
