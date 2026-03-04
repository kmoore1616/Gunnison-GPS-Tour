import os
import requests
from flask import Flask, render_template, redirect, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from dotenv import load_dotenv
from sqlalchemy import text

load_dotenv()
api_key = os.getenv("MAPS_API_KEY")

app = Flask(__name__, static_url_path='/static')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///gps-database.sqlite'
db = SQLAlchemy(app)

tour_places = db.Table(
    "tour_places",
    db.Column('tour_id', db.Integer, db.ForeignKey('tour.id'), primary_key=True),
    db.Column('place_id', db.Integer, db.ForeignKey('place.id'), primary_key=True),
    db.Column('next_stop_place_id', db.Integer, db.ForeignKey('place.id'), nullable=True),
)

class Admin(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(40), unique=True, nullable=False)
    password = db.Column(db.String(40), nullable=False)

class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    comment = db.Column(db.String(1000), nullable=False)

class Tour(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(40), unique=True, nullable=False)
    description = db.Column(db.String(1000))
    average_rating = db.Column(db.Float)
    estimated_completion_time = db.Column(db.Integer)
    reviews = db.relationship('Review', backref='tour')
    places = db.relationship(
        'Place',
        secondary=tour_places,
        primaryjoin="Tour.id == tour_places.c.tour_id",
        secondaryjoin="Place.id == tour_places.c.place_id",
        back_populates='tours',
    )

class Place(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(40), unique=True, nullable=False)
    description = db.Column(db.String(1000))
    longitude = db.Column(db.String(25), nullable=False)
    latitude = db.Column(db.String(25), nullable=False)
    tours = db.relationship(
        'Tour',
        secondary=tour_places,
        primaryjoin="Place.id == tour_places.c.place_id",
        secondaryjoin="Tour.id == tour_places.c.tour_id",
        back_populates='places',
    )

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.String(1000))
    tour_id = db.Column(db.Integer, db.ForeignKey('tour.id'))

with app.app_context():
    db.create_all()


# Helper function that calls routes api
def compute_route(origin, destination):
    url = "https://routes.googleapis.com/directions/v2:computeRoutes"

    body = {
        "origin": {
            "location": {"latLng": {"latitude": origin["lat"], "longitude": origin["lng"]}}
        },
        "destination": {
            "location": {"latLng": {"latitude": destination["lat"], "longitude": destination["lng"]}}
        },
        "travelMode": "WALK",
        "polylineEncoding": "ENCODED_POLYLINE",
    }

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "routes.polyline.encodedPolyline",
    }

    r = requests.post(url, json=body, headers=headers, timeout=20)
    
    if not r.ok:
        print("Routes API FAILED")
        print("STATUS:", r.status_code)
        print("TEXT:", r.text)
        return None

    try:
        payload = r.json()
    except Exception:
        print("Error on r.json()")
        return None


    routes = payload.get("routes")
    if not routes:
        print("error on getting routes")
        return None

    encoded = routes[0]["polyline"]["encodedPolyline"]

    return encoded


def get_ordered_places_for_tour(tour_id):
    link_rows = db.session.execute( # More up to date sqlite API call
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

    # Linked list implementation
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

# This should never be routed to, its just called from the JS
@app.route("/get_tour_poly/<tour_id>", methods=["GET"])
def get_tour_poly(tour_id):
    tour = Tour.query.get(tour_id) # Get tour from DB

    if not tour:
        return jsonify({"error": f"Tour {tour_id} not found"}), 404

    places = get_ordered_places_for_tour(tour_id)
    if len(places) < 2:
        return jsonify({ # Equivalant of error just passed down to JS
            "tourId": tour_id,
            "polylines": [],
            "segments": [],
            "message": "Need at least 2 places to create route segments"
        })
    
    polylines = []
    segments = []
    
    for a, b in zip(places, places[1:]): # combine all places on tour into orgins and destinations
        origin = {"lat": float(a.latitude), "lng": float(a.longitude)}
        dest = {"lat": float(b.latitude), "lng": float(b.longitude)}

        
        segments.append((origin, dest))
        encoded = compute_route(origin, dest) # Call helper function to get polyline
        polylines.append(encoded) # Add to list of all routes

    return jsonify({"tourId": tour_id, "polylines": polylines, "segments": segments}) # Send data to JS


@app.route("/")
def root():
    return render_template('home.html')

@app.route("/Tours")
def see_tours():
    col = []
    entries = Tour.query.all()
    for e in entries:
        row = []
        row.append(e.id)
        row.append(e.name)
        row.append(e.description)
        col.append(row)
    return render_template('tour_list.html', col = col)

@app.route("/Places")
def place():
    return render_template('places.html')


@app.route("/Tour")
def tour():
    tour_list=1
    return render_template("onTour.html", api_key=api_key, tour_list=tour_list)

@app.route("/Contact")
def contact():
    return render_template("contact.html")

@app.route("/feedback")
def feedback():
    return render_template('feedback.html')

@app.route("/reviews")
def reviews():
    return render_template('reviews.html')

@app.route('/viewTour/<tour_id>')
def viewtour(tour_id):
    currtour = Tour.query.filter_by(id=tour_id).first()
    return render_template('viewTour.html',tour_id=tour_id, tour=currtour.name, rating=currtour.average_rating,time=currtour.estimated_completion_time)

##All of these will need to have login required but for testing reasons not doing that rn
@app.route("/adminhome")
def adminhome():
    return render_template('adminhome.html')

@app.route("/edittours")
def edittours():
    return render_template('edittours.html')

@app.route("/adminfeedback")
def adminfeedback():
    return render_template('adminfeedback.html')

@app.route("/adminreviews")
def adminreviews():
    return render_template('adminreviews.html')

if __name__ == "__main__":
    app.run(debug=True)
