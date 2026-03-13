

// CONTENTS OF THIS FILE ARE BEING MOVED TO map.js DURING BRANCH GPS-63-2


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

// Borrick Hall: 38.54752661154228, -106.91834349316723
// Front of Rady: 38.54654720973891, -106.91798247641142

const destinationLatLng = { lat: 38.54472787327966, lng: -106.92136913002805 }; // Gunnison Visitor Center for testing

// 39.44169, -105.01355 // DENVER
// 38.54539051786304, -106.91779120648226 // TEST LOCALE
target = {
    latitude: 38.54539051786304,
    longitude: -106.91779120648226,
};

options = {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 0,
};

async function initMap() {
    // Request needed libraries.
    const { Map, InfoWindow } = (await google.maps.importLibrary('maps'));
    const { Route } = await google.maps.importLibrary('routes');
    const { AdvancedMarkerElement, PinElement } = (await google.maps.importLibrary('marker'));

    // Setting helper functions
    function success(pos) {
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


    const pin2 = new PinElement({
        //@ts-ignore
        glyphText: `D`,
        scale: 1.5,
        background: '#FBBC04',
    });
    const marker2 = new AdvancedMarkerElement({
        position: { lat: target.latitude, lng: target.longitude },
    });
    marker2.append(pin2);
    mapElement.append(marker2);


    const pin3 = new PinElement({
        //@ts-ignore
        glyphText: `C`,
        scale: 1.5,
        background: '#FBBC04',
    });
    const marker3 = new AdvancedMarkerElement({
        position: destinationLatLng,
    });
    marker3.append(pin3);
    mapElement.append(marker3);



    id = navigator.geolocation.watchPosition(success, error, options);


}

initMap();
