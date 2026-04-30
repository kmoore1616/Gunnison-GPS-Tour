import requests
from flask import current_app, jsonify

from model import Place, Tour, db, tour_places


def parse_google_duration(duration):
    if not duration or not duration.endswith("s"):
        return None
    try:
        return int(float(duration[:-1]))
    except ValueError:
        return None


def format_duration(seconds):
    if seconds is None:
        return None

    total_minutes = round(seconds / 60)

    if total_minutes < 60:
        return f"{total_minutes} min"

    hours = total_minutes // 60
    minutes = total_minutes % 60

    if minutes == 0:
        return f"{hours} hr"

    return f"{hours} hr {minutes} min"

def compute_route(origin, destination, include_duration=False, include_polyline=True):
    api_key = current_app.config.get("GOOGLE_MAPS_API_KEY")
    url = "https://routes.googleapis.com/directions/v2:computeRoutes"

    body = {
        "origin": {
            "location": {"latLng": {"latitude": origin["lat"], "longitude": origin["lng"]}}
        },
        "destination": {
            "location": {
                "latLng": {
                    "latitude": destination["lat"],
                    "longitude": destination["lng"],
                }
            }
        },
        "travelMode": "WALK",
        "polylineEncoding": "ENCODED_POLYLINE",
    }

    field_mask = []

    if include_polyline:
        field_mask.append("routes.polyline.encodedPolyline")

    if include_duration:
        field_mask.append("routes.duration")

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": ",".join(field_mask),
    }

    try:
        response = requests.post(url, json=body, headers=headers, timeout=20)
    except requests.RequestException as error:
        print("Routes API REQUEST FAILED")
        print("ERROR:", error)
        return None

    if not response.ok:
        print("Routes API FAILED")
        print("STATUS:", response.status_code)
        print("TEXT:", response.text)
        return None

    try:
        payload = response.json()
    except Exception:
        print("Error on response.json()")
        return None

    routes = payload.get("routes")
    if not routes:
        print("error on getting routes")
        return None

    route = routes[0]
    route_data = {}

    if include_polyline:
        route_data["polyline"] = route.get("polyline", {}).get("encodedPolyline")

    if include_duration:
        duration_seconds = parse_google_duration(route.get("duration"))
        route_data.update(
            {
                "duration": route.get("duration"),
                "durationSeconds": duration_seconds,
                "durationText": format_duration(duration_seconds),
            }
        )

    return route_data


def get_ordered_places_for_tour(tour_id):
    return (
        Place.query.join(tour_places, Place.id == tour_places.c.place_id)
        .filter(tour_places.c.tour_id == tour_id)
        .order_by(tour_places.c.stop_num.asc())
        .all()
    )


def serialize_stop(place):
    return {
        "id": place.id,
        "name": place.name,
        "description": place.description,
        "lat": float(place.latitude),
        "lng": float(place.longitude),
    }


def serialize_stops(places):
    stops = []

    for place in places:
        stop = serialize_stop(place)
        stops.append(stop)

    return stops


def get_tour_duration_estimate(tour_id):
    places = get_ordered_places_for_tour(tour_id)
    total_duration_seconds = 0

    if len(places) < 2:
        return {
            "totalDurationSeconds": 0,
            "totalDurationText": "0 min",
            "estimatedCompletionMinutes": 0,
        }

    for first_place, second_place in zip(places, places[1:]):
        origin = {"lat": float(first_place.latitude), "lng": float(first_place.longitude)}
        destination = {
            "lat": float(second_place.latitude),
            "lng": float(second_place.longitude),
        }
        route = compute_route(origin, destination, include_duration=True, include_polyline=False)

        if route and route["durationSeconds"] is not None:
            total_duration_seconds += route["durationSeconds"]

    return {
        "totalDurationSeconds": total_duration_seconds,
        "totalDurationText": format_duration(total_duration_seconds),
        "estimatedCompletionMinutes": round(total_duration_seconds / 60),
    }


def register_map_routes(app):
    @app.route("/get_tour_poly/<tour_id>", methods=["GET"])
    def get_tour_poly(tour_id):
        tour = Tour.query.get(tour_id)
        if not tour:
            return jsonify({"error": f"Tour {tour_id} not found"}), 404

        places = get_ordered_places_for_tour(tour_id)
        stops = serialize_stops(places)

        if len(places) < 2:
            return jsonify(
                {
                    "tourId": tour_id,
                    "stops": stops,
                    "polylines": [],
                    "segments": [],
                    "message": "Need at least 2 places to create route segments",
                }
            )

        polylines = []
        segments = []

        for first_place, second_place in zip(places, places[1:]):
            origin = {"lat": float(first_place.latitude), "lng": float(first_place.longitude)}
            destination = {
                "lat": float(second_place.latitude),
                "lng": float(second_place.longitude),
            }
            route = compute_route(origin, destination)
            polyline = None

            if route:
                polyline = route["polyline"]

            segment = {
                "origin": origin,
                "destination": destination,
                "polyline": polyline,
            }

            segments.append(segment)
            polylines.append(polyline)

        return jsonify(
            {
                "tourId": tour_id,
                "stops": stops,
                "polylines": polylines,
                "segments": segments,
            }
        )
