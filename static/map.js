async function drawTourPolylines(map, tourId, AdvancedMarkerElement) { // This is what draws all routes
    console.log(tourId);
    const res = await fetch(`/get_tour_poly/${tourId}`); // Get list of polylines
    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    const encodedList = data.polylines; // Error checking 

    const coords = data.segments;

    if (coords.length === 0) return;

    const firstStop = coords[0][0];
    map.setCenter({ lat: firstStop.lat, lng: firstStop.lng });

    new AdvancedMarkerElement({
        map,
        position: { lat: firstStop.lat, lng: firstStop.lng },
        title: "Stop 1",
    });

    for (let i = 0; i < coords.length; i += 1) {
        const latitude_org = coords[i][0].lat
        const longitude_org = coords[i][0].lng
        const latitude_dst = coords[i][1].lat
        const longitude_dst = coords[i][1].lng

        new AdvancedMarkerElement({
            map,
            position: { lat: latitude_dst, lng: longitude_dst},
            title: "Stop " + (i + 2),
        });

        const encoded = encodedList[i];
        if (!encoded) continue;

        const path = google.maps.geometry.encoding.decodePath(encoded);
        new google.maps.Polyline({ path, map, strokeWeight: 5 });
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

    const tourId = document.getElementById("tour-id").innerHTML;
    console.log(tourId);
    await drawTourPolylines(map, tourId, AdvancedMarkerElement);

}


initMap().catch(console.error);
