"use strict";
/**
 * @license
 * Copyright 2025 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {openPopup} from './popup.js'
import {mapElement, tourMapReady} from './tourMap.js'

let id;
let target;
let coords;
let globalMap;
let route = [];
let userMarkers = [];
let userRoutes = [];
let testVar = 0;
let iterator = 1;
let current_stop = 0;

const tour_id = document.getElementById("tour-id").value;

const options = {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 0,
};

function createCurrentLocationMarkerContent() {
    const markerContent = document.createElement("div");
    markerContent.style.width = "0";
    markerContent.style.height = "0";
    markerContent.style.borderLeft = "9px solid transparent";
    markerContent.style.borderRight = "9px solid transparent";
    markerContent.style.borderBottom = "24px solid #4285F4";
    markerContent.style.filter = "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35))";
    markerContent.style.transform = "rotate(45deg)";
    markerContent.title = "Your current location";

    return markerContent;
}

function setupTourButtons() {
    let skip_element = document.getElementById("skipButton")
    let
        end_element = document.getElementById("endButton")

    if (skip_element != null){
        skip_element.addEventListener("click", skipStop);
    }

    if (end_element != null){
        end_element.addEventListener("click", endTour);
    }
}

// Draw the marker for the user's current location
async function drawUserPolyline(crd) {
    const { AdvancedMarkerElement } = (await google.maps.importLibrary('marker'));

    if(userMarkers.length != 0) {
        userMarkers[0].map = null;
        userMarkers = [];
    }

    const userPosition = { lat: crd.latitude, lng: crd.longitude };
    globalMap.panTo(userPosition);

    // Create marker at user position
    const userMarker = new AdvancedMarkerElement({
        map: globalMap,
        position: userPosition,
        title: "Your current location",
        content: createCurrentLocationMarkerContent(),
    });

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
        const nextSegment = coords[iterator];
        const nextDestination = nextSegment.destination;
        target = { lat: nextDestination.lat, lng: nextDestination.lng };
        iterator = iterator + 1;
        if (iterator == coords.length) {
            navigator.geolocation.clearWatch(id);
        }
    }
}

function error(err) {
    console.error(`ERROR(${err.code}): ${err.message}`);
}

export function endTour(tour_id) {
    openPopup(tour_id);

}

export function skipStop() {
    current_stop++;
    if(current_stop > route.length - 1) {
       endTour()
    }else {
        let latlng = {lat: route[current_stop][0], lng: route[current_stop][1]};
        globalMap.panTo(latlng);
    }
}

async function initTourNavigation() {
    const tourMap = await tourMapReady;

    coords = tourMap.coords;
    globalMap = tourMap.map;
    route = tourMap.route;
    target = tourMap.target;

    setupTourButtons();

    // Live location tracking -> calls the success function on update
    id = navigator.geolocation.watchPosition(success, error, options);
}

initTourNavigation().catch(console.error);
