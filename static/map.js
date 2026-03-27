"use strict";
/**
 * @license
 * Copyright 2025 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

let id, target, coords;
let userMarkers = [];
let userRoutes = [];
let testVar = 0;
let iterator = 1;
let globalMap;
let root = "http://127.0.0.1:5000/";
let route = [];
let current_stop = 0;

document.getElementById("skipButton").addEventListener("click", skipStop);
document.getElementById("endButton").addEventListener("click", endTour);

const mapElement = document.querySelector('gmp-map');
const options = {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 0,
};


// Draw the lines between each stop on the tour
async function drawTourPolylines(map, tourId, AdvancedMarkerElement) {
    const res = await fetch(`/get_tour_poly/${tourId}`); // Get list of polylines
    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    const encodedList = data.polylines; // Error checking

    coords = data.segments;

    if (coords.length === 0) return;

    const firstStop = coords[0][0];
    map.setCenter({ lat: firstStop.lat, lng: firstStop.lng });

    target = { lat: firstStop.lat, lng: firstStop.lng };

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


// Draw the marker for the user's current location
async function drawUserPolyline(crd) {
    const { AdvancedMarkerElement, PinElement } = (await google.maps.importLibrary('marker'));

    if(userMarkers.length != 0) {
        userMarkers[0].map = null;
        userMarkers = [];
    }

    // Create marker at user position
    const userPin = new PinElement({
        //@ts-ignore
        scale: 1.5,
        background: '#4285F4',
        borderColor: 'white',
        glyphColor: 'white',
    });
    const userMarker = new AdvancedMarkerElement({
        position: { lat: crd.latitude, lng: crd.longitude },
    });
    userMarker.append(userPin);
    mapElement.append(userMarker);

    userMarkers.push(userMarker);

    // Call to routing function
    createRoute(crd.latitude, crd.longitude);
}


// Draw line from user to the next stop on the tour
async function createRoute(lat, lng) {
    const { Route } = await google.maps.importLibrary('routes');

    if(userRoutes.length != 0) {
        for(let i = 0; i < userRoutes.length; i++) {
            userRoutes[i].setMap(null);
        }
        userRoutes = [];
    }

    // Compute route
    const request = {
        origin: { lat: lat, lng: lng },
        destination: { lat: target.lat, lng: target.lng },
        travelMode: 'WALKING',
        fields: ['path'],
    };

    await customElements.whenDefined('gmp-map');
    const map = mapElement.innerMap;

    const { routes } = await Route.computeRoutes(request);

    // Draw route path on map
    if (routes && routes.length > 0) {
        const routePath = new google.maps.Polyline({
            path: routes[0].path,
            strokeColor: '#4285F4',
            strokeWeight: 5,
        });

        routePath.setMap(map);
        userRoutes.push(routePath);
    }
}


// Live location tracking
async function success(pos) {
    const crd = pos.coords;
    testVar = testVar + 1;
    console.log("Hit " + testVar + ": " + crd.latitude + ", " + crd.longitude);

    drawUserPolyline(crd);

    if (target.lat === crd.latitude && target.lng === crd.longitude) {
        console.log("Congratulations, you reached the target");
        target = { lat: coords[iterator][1].lat, lng: coords[iterator][1].lng };
        iterator = iterator + 1;
        if (iterator == coords.length) {
            navigator.geolocation.clearWatch(id);
        }
    }
}


function error(err) {
    console.error(`ERROR(${err.code}): ${err.message}`);
}


// Map initialization function
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

    // Live location tracking -> calls the success function on update
    id = navigator.geolocation.watchPosition(success, error, options);
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
