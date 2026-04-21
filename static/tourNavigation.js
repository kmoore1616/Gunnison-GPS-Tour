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
let imHereButton;

const tour_id = document.getElementById("tour-id").value;
const arrivalRadiusMeters = 30;

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
        imHereButton.addEventListener("click", showCurrentStopDescription);
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

function showImHereButton() {
    if (imHereButton != null) {
        imHereButton.hidden = false;
    }
}

function hideImHereButton() {
    if (imHereButton != null) {
        imHereButton.hidden = true;
    }
}

function getDistanceToTargetInMeters(userPosition) {
    const userLatLng = new google.maps.LatLng(userPosition.lat, userPosition.lng);
    const targetLatLng = new google.maps.LatLng(target.lat, target.lng);

    return google.maps.geometry.spherical.computeDistanceBetween(userLatLng, targetLatLng);
}

function updateArrivalButton(userPosition) {
    const distanceToTarget = getDistanceToTargetInMeters(userPosition);

    if (distanceToTarget <= arrivalRadiusMeters) {
        showImHereButton();
    } else {
        hideImHereButton();
    }
}

function removeStopDescriptionPopup() {
    const popup = document.getElementById("stopDescriptionPopup");

    if (popup != null) {
        popup.remove();
    }
}

function showStopDescriptionPopup(stop) {
    removeStopDescriptionPopup();

    const overlay = document.createElement("div");
    overlay.id = "stopDescriptionPopup";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "1000";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "18px";
    overlay.style.background = "rgba(0, 0, 0, 0.42)";

    const box = document.createElement("div");
    box.style.width = "min(420px, 100%)";
    box.style.borderRadius = "8px";
    box.style.background = "white";
    box.style.boxShadow = "0 12px 30px rgba(0, 0, 0, 0.28)";
    box.style.padding = "22px";

    const title = document.createElement("h2");
    title.textContent = stop.name;
    title.style.margin = "0 0 10px";
    title.style.fontSize = "1.35rem";

    const description = document.createElement("p");
    description.textContent = stop.description;
    description.style.margin = "0 0 18px";
    description.style.lineHeight = "1.45";

    const continueButton = document.createElement("button");
    continueButton.type = "button";
    continueButton.textContent = "Continue";
    continueButton.style.border = "0";
    continueButton.style.borderRadius = "6px";
    continueButton.style.background = "#188038";
    continueButton.style.color = "white";
    continueButton.style.font = "inherit";
    continueButton.style.fontWeight = "700";
    continueButton.style.padding = "10px 14px";
    continueButton.style.cursor = "pointer";
    continueButton.addEventListener("click", () => {
        removeStopDescriptionPopup();
        advanceToNextStop();
    });

    box.appendChild(title);
    box.appendChild(description);
    box.appendChild(continueButton);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

function showCurrentStopDescription() {
    if (stops[currentStopIndex] == null) {
        return;
    }

    hideImHereButton();
    showStopDescriptionPopup(stops[currentStopIndex]);
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
    hideImHereButton();
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
    updateArrivalButton(userPosition);

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
