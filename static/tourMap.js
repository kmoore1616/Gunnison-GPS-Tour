"use strict";
/**
 * @license
 * Copyright 2025 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

let coords;
let globalMap;
let route = [];
let stops = [];
let stopMarkers = [];
let segmentPolylines = [];
let stopMarkerPinElement;
let target;

const mapElement = document.querySelector("gmp-map");

function getTourId() {
    return document.getElementById("tour-id").innerHTML;
}

function getRandomColor() {
    return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

function createStopInfoContent(stop) {
    const content = document.createElement("div");

    const name = document.createElement("h3");
    name.textContent = stop.name;

    const description = document.createElement("p");
    description.textContent = stop.description;

    content.appendChild(name);
    content.appendChild(description);

    return content;
}

function shouldShowStopInfo() {
    const endTourButton = document.getElementById("endButton");
    return endTourButton !== null;
}

function getStopMarkerColor(isNextStop) {
    if (isNextStop) {
        return "#D4A017";
    }

    return "#8A8F98";
}

function createStopMarkerContent(PinElement, isNextStop) {
    const pin = new PinElement({
        background: getStopMarkerColor(isNextStop),
        borderColor: "white",
        glyphColor: "white",
    });

    return pin.element;
}

function updateNextStopMarker(nextStopIndex) {
    for (let i = 0; i < stopMarkers.length; i += 1) {
        const marker = stopMarkers[i];
        const isNextStop = i === nextStopIndex;

        marker.content = createStopMarkerContent(stopMarkerPinElement, isNextStop);
    }
}

function hideCompletedTourParts(completedStopIndex) {
    const marker = stopMarkers[completedStopIndex];

    if (marker) {
        marker.map = null;
    }

    const segmentPolyline = segmentPolylines[completedStopIndex];

    if (segmentPolyline) {
        segmentPolyline.setMap(null);
    }
}

function createStopMarker(map, AdvancedMarkerElement, PinElement, stop, stopNumber, infoWindow) {
    const isOnTour = shouldShowStopInfo();
    let markerContent;

    if (isOnTour) {
        const stopIndex = stopNumber - 1;
        const isNextStop = stopIndex === 0;
        markerContent = createStopMarkerContent(PinElement, isNextStop);
    }

    const marker = new AdvancedMarkerElement({
        map,
        position: { lat: stop.lat, lng: stop.lng },
        title: "Stop " + stopNumber,
        content: markerContent,
    });

    if (isOnTour) {
        stopMarkers.push(marker);

        marker.addListener("click", () => {
            const content = createStopInfoContent(stop);

            infoWindow.close();
            infoWindow.setContent(content);
            infoWindow.open({
                anchor: marker,
                map,
            });
        });
    }

    return marker;
}

// Draw the lines between each stop on the tour
async function drawTourPolylines(map, tourId, AdvancedMarkerElement, PinElement) {
    const res = await fetch(`/get_tour_poly/${tourId}`); // Get list of polylines
    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();

    coords = data.segments;
    stops = data.stops;

    if (stops.length === 0) return;

    const firstStop = stops[0];
    map.setCenter({ lat: firstStop.lat, lng: firstStop.lng });

    target = { lat: firstStop.lat, lng: firstStop.lng };

    const infoWindow = new google.maps.InfoWindow();
    const isOnTour = shouldShowStopInfo();
    stopMarkerPinElement = PinElement;

    for (let i = 0; i < stops.length; i += 1) {
        const stop = stops[i];
        const stopNumber = i + 1;


        createStopMarker(map, AdvancedMarkerElement, PinElement, stop, stopNumber, infoWindow);
    }

    for (let i = 0; i < coords.length; i += 1) {
        const segment = coords[i];
        const destination = segment.destination;
        const latitude_dst = destination.lat;
        const longitude_dst = destination.lng;

        route.push([latitude_dst, longitude_dst]);

        if (isOnTour) {
            continue;
        }

        const encoded = segment.polyline;
        if (!encoded) continue;

        let randomColor = getRandomColor();
        console.log(randomColor);

        const path = google.maps.geometry.encoding.decodePath(encoded);
        const segmentPolyline = new google.maps.Polyline({
            path,
            map,
            strokeColor: randomColor,
            strokeWeight: 5
        });

        segmentPolylines.push(segmentPolyline);
    }
}

// Map initialization function
async function initMap() {
    // Load libraries once, the right way
    await google.maps.importLibrary("maps");
    await google.maps.importLibrary("geometry"); // needed for decodePath
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

    const map = mapElement.innerMap;
    globalMap = map;

    map.setOptions({ mapTypeControl: false });

    const tourId = getTourId();
    await drawTourPolylines(map, tourId, AdvancedMarkerElement, PinElement);

    return {
        coords: coords,
        map: globalMap,
        route: route,
        stops: stops,
        target: target,
    };
}

const tourMapReady = initMap();

export {
    mapElement,
    hideCompletedTourParts,
    tourMapReady,
    updateNextStopMarker,
};
