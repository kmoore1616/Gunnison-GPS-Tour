"use strict";
/**
 * @license
 * Copyright 2025 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const mapElement = document.querySelector('gmp-map');
async function initMap() {
    // Request needed libraries.
    const { Map, InfoWindow } = (await google.maps.importLibrary('maps'));
    const { AdvancedMarkerElement, PinElement } = (await google.maps.importLibrary('marker'));
    // Set LatLng and title text for the markers. The first marker (Taylor Lawn)
    // receives the initial focus when tab is pressed. Use arrow keys to move
    // between markers; press tab again to cycle through the map controls.

    // Create an info window to share between markers.
    const infoWindow = new InfoWindow();

    const pin1 = new PinElement({
        //@ts-ignore
        glyphText: `T`,              // This is what displays on the marker
        scale: 1.5,
        background: '#FBBC04',
    });
    const marker1 = new AdvancedMarkerElement({
        position: { lat: 38.54830361820475, lng: -106.9191492124279 },
        title: 'Taylor Lawn',        // This is what displays in the popup for the marker
        gmpClickable: true,
    });
    marker1.append(pin1);
    mapElement.append(marker1);
    marker1.addListener('click', ({ domEvent, latLng }) => {
        const { target } = domEvent;
        infoWindow.close();
        infoWindow.setContent(marker1.title);
        infoWindow.open(marker1.map, marker1);
    });
}
initMap();
