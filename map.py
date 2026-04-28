import requests
from flask import current_app, jsonify

from model import Place, Tour, db, tour_places


def compute_route(origin, destination):
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

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "routes.polyline.encodedPolyline",
    }

    response = requests.post(url, json=body, headers=headers, timeout=20)

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

    return routes[0]["polyline"]["encodedPolyline"]


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
            polyline = compute_route(origin, destination)

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
