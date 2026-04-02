"use strict";

(function () {
    const DEFAULT_CENTER = { lat: 38.5449, lng: -106.9260 };
    const DEFAULT_ZOOM = 15;
    const STOP_ICON = "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
    const DANGER_STROKE = "#b42318";
    const ROUTE_SAFE = "#1d4ed8";
    const ROUTE_DANGER = "#b42318";

    let map;
    let directionsService;
    let mode = "stop";
    let stopMarkers = [];
    let routePolylines = [];
    let dangerPolylines = [];
    let activeDangerPoints = [];
    let activeDangerPolyline = null;
    let warningMessages = [];

    function getElement(id) {
        return document.getElementById(id);
    }

    function getCenterFromInputs() {
        const lat = Number.parseFloat(getElement("map-center-lat")?.value);
        const lng = Number.parseFloat(getElement("map-center-lng")?.value);

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { lat, lng };
        }

        return DEFAULT_CENTER;
    }

    function updateModeLabel() {
        const modeLabel = getElement("map-mode");
        if (!modeLabel) {
            return;
        }

        modeLabel.textContent = mode === "danger"
            ? "Danger zone drawing"
            : "Stop placement";
    }

    function setMode(nextMode) {
        mode = nextMode;
        updateModeLabel();
    }

    function serializeLatLng(latLng) {
        return {
            lat: Number(latLng.lat().toFixed(6)),
            lng: Number(latLng.lng().toFixed(6)),
        };
    }

    function syncSerializedData() {
        const stopInput = getElement("tour-stop-data");
        const dangerInput = getElement("danger-zone-data");

        if (stopInput) {
            stopInput.value = JSON.stringify(
                stopMarkers.map((marker, index) => ({
                    order: index + 1,
                    position: serializeLatLng(marker.getPosition()),
                })),
            );
        }

        if (dangerInput) {
            dangerInput.value = JSON.stringify(
                dangerPolylines.map((polyline, index) => ({
                    id: index + 1,
                    path: polyline.getPath().getArray().map(serializeLatLng),
                })),
            );
        }
    }

    function renderWarnings() {
        const warningList = getElement("route-warning-list");
        const warningSummary = getElement("route-warning-summary");

        if (!warningList || !warningSummary) {
            return;
        }

        warningList.innerHTML = "";

        if (warningMessages.length === 0) {
            warningSummary.textContent = "No dangerous route crossings detected.";
            return;
        }

        warningSummary.textContent = `${warningMessages.length} dangerous route crossing(s) detected.`;

        warningMessages.forEach((message) => {
            const item = document.createElement("li");
            item.textContent = message;
            warningList.appendChild(item);
        });
    }

    function addWarning(message) {
        warningMessages.push(message);
        renderWarnings();
    }

    function clearWarnings() {
        warningMessages = [];
        renderWarnings();
    }

    function createStopMarker(position) {
        const marker = new google.maps.Marker({
            map,
            position,
            label: String(stopMarkers.length + 1),
            icon: STOP_ICON,
        });

        stopMarkers.push(marker);
        syncSerializedData();
        return marker;
    }

    function finalizeDangerPolyline() {
        if (activeDangerPoints.length < 2) {
            activeDangerPoints = [];

            if (activeDangerPolyline) {
                activeDangerPolyline.setMap(null);
                activeDangerPolyline = null;
            }

            return;
        }

        dangerPolylines.push(activeDangerPolyline);
        activeDangerPolyline = null;
        activeDangerPoints = [];
        syncSerializedData();
        rebuildRoutesAndWarnings().catch((error) => {
            console.error("Failed to reevaluate routes after saving a danger zone.", error);
        });
    }

    function addDangerPoint(position) {
        activeDangerPoints.push(position);

        if (!activeDangerPolyline) {
            activeDangerPolyline = new google.maps.Polyline({
                map,
                path: activeDangerPoints,
                strokeColor: DANGER_STROKE,
                strokeOpacity: 0.95,
                strokeWeight: 5,
                clickable: false,
            });
        } else {
            activeDangerPolyline.setPath(activeDangerPoints);
        }
    }

    function clearRoutePolylines() {
        routePolylines.forEach((polyline) => polyline.setMap(null));
        routePolylines = [];
    }

    function clearDangerPolylines() {
        if (activeDangerPolyline) {
            activeDangerPolyline.setMap(null);
            activeDangerPolyline = null;
        }

        activeDangerPoints = [];
        dangerPolylines.forEach((polyline) => polyline.setMap(null));
        dangerPolylines = [];
        clearWarnings();
        syncSerializedData();
        rebuildRoutesAndWarnings().catch((error) => {
            console.error("Failed to reevaluate routes after clearing danger zones.", error);
        });
    }

    function clearStops() {
        clearRoutePolylines();
        stopMarkers.forEach((marker) => marker.setMap(null));
        stopMarkers = [];
        clearWarnings();
        syncSerializedData();
    }

    function lineSegmentsFromPath(path) {
        const segments = [];

        for (let index = 0; index < path.length - 1; index += 1) {
            segments.push([path[index], path[index + 1]]);
        }

        return segments;
    }

    function pointOnSegment(a, b, p) {
        const cross = (b.lng - a.lng) * (p.lat - a.lat) - (b.lat - a.lat) * (p.lng - a.lng);
        if (Math.abs(cross) > 1e-10) {
            return false;
        }

        const dot = (p.lng - a.lng) * (b.lng - a.lng) + (p.lat - a.lat) * (b.lat - a.lat);
        if (dot < 0) {
            return false;
        }

        const lengthSquared = (b.lng - a.lng) ** 2 + (b.lat - a.lat) ** 2;
        return dot <= lengthSquared;
    }

    function segmentsIntersect(startA, endA, startB, endB) {
        const orientation = (a, b, c) => {
            const value = (b.lat - a.lat) * (c.lng - b.lng) - (b.lng - a.lng) * (c.lat - b.lat);
            if (Math.abs(value) < 1e-10) {
                return 0;
            }

            return value > 0 ? 1 : 2;
        };

        const o1 = orientation(startA, endA, startB);
        const o2 = orientation(startA, endA, endB);
        const o3 = orientation(startB, endB, startA);
        const o4 = orientation(startB, endB, endA);

        if (o1 !== o2 && o3 !== o4) {
            return true;
        }

        if (o1 === 0 && pointOnSegment(startA, endA, startB)) {
            return true;
        }

        if (o2 === 0 && pointOnSegment(startA, endA, endB)) {
            return true;
        }

        if (o3 === 0 && pointOnSegment(startB, endB, startA)) {
            return true;
        }

        return o4 === 0 && pointOnSegment(startB, endB, endA);
    }

    function pathToPlainCoordinates(path) {
        return path.map((point) => ({
            lat: point.lat(),
            lng: point.lng(),
        }));
    }

    function intersectsDangerZones(routePath) {
        const routeSegments = lineSegmentsFromPath(routePath);

        for (let dangerIndex = 0; dangerIndex < dangerPolylines.length; dangerIndex += 1) {
            const dangerPath = pathToPlainCoordinates(dangerPolylines[dangerIndex].getPath().getArray());
            const dangerSegments = lineSegmentsFromPath(dangerPath);

            for (let routeIndex = 0; routeIndex < routeSegments.length; routeIndex += 1) {
                const [routeStart, routeEnd] = routeSegments[routeIndex];

                for (let segmentIndex = 0; segmentIndex < dangerSegments.length; segmentIndex += 1) {
                    const [dangerStart, dangerEnd] = dangerSegments[segmentIndex];

                    if (segmentsIntersect(routeStart, routeEnd, dangerStart, dangerEnd)) {
                        return {
                            intersects: true,
                            dangerZoneIndex: dangerIndex + 1,
                        };
                    }
                }
            }
        }

        return { intersects: false, dangerZoneIndex: null };
    }

    function drawRoute(path, isDangerous) {
        const polyline = new google.maps.Polyline({
            map,
            path,
            strokeColor: isDangerous ? ROUTE_DANGER : ROUTE_SAFE,
            strokeOpacity: 0.9,
            strokeWeight: 5,
        });

        routePolylines.push(polyline);
    }

    async function evaluateRouteRisk(origin, destination, segmentNumber) {
        let routePath = [origin, destination];

        if (directionsService) {
            try {
                const result = await directionsService.route({
                    origin,
                    destination,
                    travelMode: google.maps.TravelMode.WALKING,
                });

                if (result.routes?.[0]?.overview_path?.length) {
                    routePath = pathToPlainCoordinates(result.routes[0].overview_path);
                }
            } catch (error) {
                console.warn("Directions lookup failed. Falling back to straight-line segment.", error);
            }
        }

        const risk = intersectsDangerZones(routePath);
        drawRoute(routePath, risk.intersects);

        if (risk.intersects) {
            addWarning(
                `Route segment ${segmentNumber} crosses danger zone ${risk.dangerZoneIndex}.`,
            );
        }
    }

    async function rebuildRoutesAndWarnings() {
        clearRoutePolylines();
        clearWarnings();

        if (stopMarkers.length < 2) {
            return;
        }

        for (let index = 1; index < stopMarkers.length; index += 1) {
            const previous = stopMarkers[index - 1].getPosition();
            const current = stopMarkers[index].getPosition();

            await evaluateRouteRisk(
                { lat: previous.lat(), lng: previous.lng() },
                { lat: current.lat(), lng: current.lng() },
                index,
            );
        }
    }

    async function addStop(position) {
        createStopMarker(position);

        if (stopMarkers.length < 2) {
            return;
        }

        const previous = stopMarkers[stopMarkers.length - 2].getPosition();
        const current = stopMarkers[stopMarkers.length - 1].getPosition();

        await evaluateRouteRisk(
            { lat: previous.lat(), lng: previous.lng() },
            { lat: current.lat(), lng: current.lng() },
            stopMarkers.length - 1,
        );
    }

    async function handleMapClick(event) {
        const position = event.latLng;
        if (!position) {
            return;
        }

        if (mode === "danger") {
            addDangerPoint(position);
            return;
        }

        await addStop(position);
    }

    function bindControls() {
        getElement("add-stop-mode")?.addEventListener("click", () => setMode("stop"));
        getElement("add-danger-mode")?.addEventListener("click", () => setMode("danger"));
        getElement("finish-danger-polyline")?.addEventListener("click", finalizeDangerPolyline);
        getElement("clear-stops")?.addEventListener("click", clearStops);
        getElement("clear-danger-zones")?.addEventListener("click", clearDangerPolylines);
    }

    window.initTourSafetyMap = function initTourSafetyMap() {
        const mapCanvas = getElement("tour-safety-map");
        if (!mapCanvas) {
            return;
        }

        map = new google.maps.Map(mapCanvas, {
            center: getCenterFromInputs(),
            zoom: DEFAULT_ZOOM,
            mapTypeControl: false,
            streetViewControl: false,
        });

        directionsService = new google.maps.DirectionsService();

        google.maps.event.addListener(map, "click", (e) => {
            handleMapClick(e).catch((error) => {
                console.error("Failed to create stop or evaluate route safety.", error);
            });
        });

        bindControls();
        updateModeLabel();
        renderWarnings();
    };
}());
