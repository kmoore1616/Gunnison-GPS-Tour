"use strict";
/**
 * @license
 * Copyright 2025 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Takes shared features from view tour and adds navigation and other onTour specific functionality

import {openPopup, openStopPopup} from './popup.js'
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
let imHereButton;

const tour_id = document.getElementById("tour-id").textContent.trim();
let stop_name = document.getElementById("next-stop-name")


// Gps Options
const options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
};

// Sets up marker for user position
function createCurrentLocationMarkerContent() {
    const markerContent = document.createElement("div");
    markerContent.style.width = "22px";
    markerContent.style.height = "22px";
    markerContent.style.border = "4px solid #D93025";
    markerContent.style.borderRadius = "50%";
    markerContent.style.background = "#FFFFFF";
    markerContent.style.boxSizing = "border-box";
    markerContent.style.outline = "2px solid #FFFFFF";
    markerContent.style.filter = "drop-shadow(0 2px 5px rgba(0, 0, 0, 0.45))";
    markerContent.title = "Your current location";

    return markerContent;
}

// Attaches functionality to tour buttons
function setupTourButtons() {
    let skip_element = document.getElementById("skipButton")
    let end_element = document.getElementById("endButton")
    recenterButton = document.getElementById("recenterButton")
    imHereButton = document.getElementById("imHereButton")

    if (skip_element != null){
        skip_element.addEventListener("click", skipStop);
    }

    if (end_element != null){
        end_element.addEventListener("click", endTour);
    }

    if (recenterButton != null){
        recenterButton.addEventListener("click", recenterOnUser);
    }

    if (imHereButton != null){
        imHereButton.addEventListener("click", showCurrentStopPopup);
    }
}

// Only show recenter if user pans
function showRecenterButton() {
    if (recenterButton != null && latestUserPosition != null) {
        recenterButton.hidden = false;
    }
}
// Note, recent button will now always be visible
function hideRecenterButton() {
    if (recenterButton != null) {
        // recenterButton.hidden = true;
    }
}
// Recenter button functionality
function recenterOnUser() {
    if (latestUserPosition == null) {
        return;
    }

    globalMap.panTo(latestUserPosition);
    hideRecenterButton();
}

function showCurrentStopPopup() {
    const currentStop = stops[currentStopIndex];

    if (currentStop == null) {
        return;
    }

    openStopPopup(currentStop.name, currentStop.description, advanceToNextStop);
}

// Sets the next navigation target (the next stop on the tour)
function setTargetToStop(stopIndex) {
    const stop = stops[stopIndex];
    target = { lat: stop.lat, lng: stop.lng };
}

// redraw if user latest position updates (keeps tracking user)
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
        endTour();
        return false;
    }

    currentStopIndex = currentStopIndex + 1;
    setTargetToStop(currentStopIndex);
    updateNextStopMarker(currentStopIndex);
    routeUserToCurrentTarget();
    stop_name.innerHTML = "Next Stop: " + stops[currentStopIndex].name;
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

export function endTour() {
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

    stop_name.innerHTML = "Next Stop: " + stops[0].name;

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
