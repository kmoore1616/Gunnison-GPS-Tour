let globalMap;
let root = "http://127.0.0.1:5000/";
let route = [];
let current_stop = 0;

document.getElementById("skipButton").addEventListener("click", skipStop);
document.getElementById("endButton").addEventListener("click", endTour);

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

        route.push([latitude_dst, longitude_dst]);

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
    globalMap = map;

    map.setOptions({ mapTypeControl: false });

    const tourId = document.getElementById("tour-id").innerHTML;
    await drawTourPolylines(map, tourId, AdvancedMarkerElement);

}

export function endTour() {
    // TODO Popup functionality and feedback goes here
    alert("Tour Ended");
    window.location.replace(root)

}

export function skipStop() {
    current_stop++;
    if(current_stop > route.length - 1) {
       alert("TOUR Finished!");
       window.location.replace(root)
    }else {
        let latlng = {lat: route[current_stop][0], lng: route[current_stop][1]};
        globalMap.panTo(latlng);
        alert("Stop Skipped!");
    }
}

initMap().catch(console.error);
