import requests
from flask import current_app, jsonify
from sqlalchemy import text

from model import Place, Tour, db


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
    link_rows = db.session.execute(
        text(
            """
            SELECT place_id, next_stop_place_id
            FROM tour_places
            WHERE tour_id = :tour_id
            """
        ),
        {"tour_id": tour_id},
    ).fetchall()

    if not link_rows:
        return []

    next_by_place = {row[0]: row[1] for row in link_rows}
    place_ids = set(next_by_place.keys())
    referenced_ids = {next_id for next_id in next_by_place.values() if next_id is not None}
    head_candidates = sorted(place_ids - referenced_ids)

    current = head_candidates[0] if head_candidates else min(place_ids)
    ordered_place_ids = []
    visited = set()

    while current is not None and current not in visited and current in next_by_place:
        ordered_place_ids.append(current)
        visited.add(current)
        current = next_by_place[current]

    remaining = sorted(place_ids - visited)
    ordered_place_ids.extend(remaining)

    place_rows = Place.query.filter(Place.id.in_(ordered_place_ids)).all()
    place_by_id = {place.id: place for place in place_rows}
    return [place_by_id[place_id] for place_id in ordered_place_ids if place_id in place_by_id]


def register_map_routes(app):
    @app.route("/get_tour_poly/<tour_id>", methods=["GET"])
    def get_tour_poly(tour_id):
        tour = Tour.query.get(tour_id)
        if not tour:
            return jsonify({"error": f"Tour {tour_id} not found"}), 404

        places = get_ordered_places_for_tour(tour_id)
        if len(places) < 2:
            return jsonify(
                {
                    "tourId": tour_id,
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

            segments.append((origin, destination))
            polylines.append(compute_route(origin, destination))

        return jsonify({"tourId": tour_id, "polylines": polylines, "segments": segments})
