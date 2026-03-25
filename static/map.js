"use strict";
/**
 * @license
 * Copyright 2025 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

let id;
let target;
let options;
let userMarkers = [];
let userRoutes = [];
let testVar = 0;

const mapElement = document.querySelector('gmp-map');

const destinationLatLng = { lat: 38.54472787327966, lng: -106.92136913002805 }; // Gunnison Visitor Center for testing

target = {
    latitude: 38.54539051786304,
    longitude: -106.91779120648226,
};

options = {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 0,
};

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


async function success(pos) {
    const { AdvancedMarkerElement, PinElement } = (await google.maps.importLibrary('marker'));

    testVar = testVar + 1;
    const crd = pos.coords;
    console.log("Hit " + testVar + ": " + crd.latitude + ", " + crd.longitude)

    if(userMarkers.length != 0) {
        userMarkers[0].map = null;
        userMarkers = [];
    }

    //create marker at user position
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

    if (target.latitude === crd.latitude && target.longitude === crd.longitude) {
        console.log("Congratulations, you reached the target");
        navigator.geolocation.clearWatch(id);
    }
}


function error(err) {
    console.error(`ERROR(${err.code}): ${err.message}`);
}

async function createRoute(lat, lng) {
    const { Route } = await google.maps.importLibrary('routes');
    if(userRoutes.length != 0) {
        for(let i = 0; i < userRoutes.length; i++) {
            userRoutes[i].setMap(null);
        }
        userRoutes = [];
    }

    //create route
    const request = {
        origin: { lat: lat, lng: lng },
        destination: destinationLatLng,
        travelMode: 'WALKING',
        fields: ['path'],
    };

    await customElements.whenDefined('gmp-map');
    const map = mapElement.innerMap;

    const { routes } = await Route.computeRoutes(request);

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

    id = navigator.geolocation.watchPosition(success, error, options);
}

initMap().catch(console.error);
