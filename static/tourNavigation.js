"use strict";
/**
 * @license
 * Copyright 2025 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {openPopup} from './popup.js'
import {hideCompletedTourParts, mapElement, tourMapReady, updateNextStopMarker} from './tourMap.js'

let id;
let target;
let coords;
let globalMap;
let route = [];
let stops = [];
let userMarkers = [];
let userRoutes = [];
let testVar = 0;
let currentStopIndex = 0;
let latestUserPosition;
let recenterButton;

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
    recenterButton = document.getElementById("recenterButton")

    if (skip_element != null){
        skip_element.addEventListener("click", skipStop);
    }

    if (end_element != null){
        end_element.addEventListener("click", endTour);
    }

    if (recenterButton != null){
        recenterButton.addEventListener("click", recenterOnUser);
    }
}

function showRecenterButton() {
    if (recenterButton != null && latestUserPosition != null) {
        recenterButton.hidden = false;
    }
}

function hideRecenterButton() {
    if (recenterButton != null) {
        recenterButton.hidden = true;
    }
}

function recenterOnUser() {
    if (latestUserPosition == null) {
        return;
    }

    globalMap.panTo(latestUserPosition);
    hideRecenterButton();
}

function setTargetToStop(stopIndex) {
    const stop = stops[stopIndex];
    target = { lat: stop.lat, lng: stop.lng };
}

function routeUserToCurrentTarget() {
    if (latestUserPosition == null) {
        return;
    }

    createRoute(latestUserPosition.lat, latestUserPosition.lng);
}

function advanceToNextStop() {
    hideCompletedTourParts(currentStopIndex);

    if (currentStopIndex >= stops.length - 1) {
        navigator.geolocation.clearWatch(id);
        endTour(tour_id);
        return false;
    }

    currentStopIndex = currentStopIndex + 1;
    setTargetToStop(currentStopIndex);
    updateNextStopMarker(currentStopIndex);
    routeUserToCurrentTarget();
    return true;
}

// Draw the marker for the user's current location
async function drawUserPolyline(crd) {
    const { AdvancedMarkerElement } = (await google.maps.importLibrary('marker'));

    if(userMarkers.length != 0) {
        userMarkers[0].map = null;
        userMarkers = [];
    }

    const userPosition = { lat: crd.latitude, lng: crd.longitude };
    latestUserPosition = userPosition;

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
        advanceToNextStop();
    }
}

function error(err) {
    console.error(`ERROR(${err.code}): ${err.message}`);
}

export function endTour(tour_id) {
    openPopup(tour_id);

}

export function skipStop() {
    const advanced = advanceToNextStop();

    if (advanced) {
        globalMap.panTo(target);
    }
}

async function initTourNavigation() {
    const tourMap = await tourMapReady;

    coords = tourMap.coords;
    globalMap = tourMap.map;
    route = tourMap.route;
    stops = tourMap.stops;
    target = tourMap.target;

    if (stops.length === 0) {
        return;
    }

    setTargetToStop(currentStopIndex);
    updateNextStopMarker(currentStopIndex);

    setupTourButtons();
    globalMap.addListener("dragstart", showRecenterButton);

    // Live location tracking -> calls the success function on update
    id = navigator.geolocation.watchPosition(success, error, options);
}

initTourNavigation().catch(console.error);
