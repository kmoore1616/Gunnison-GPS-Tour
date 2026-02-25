# Main Python Runner
import os
import requests
from flask import Flask, render_template, redirect, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("MAPS_API_KEY")

app = Flask(__name__, static_url_path='/static')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///gps-database.sqlite'
db = SQLAlchemy(app)

tour_places = db.Table(
    "tour_places",
    db.Column('tour_id', db.Integer, db.ForeignKey('tour.id'), primary_key=True),
    db.Column('place_id', db.Integer, db.ForeignKey('place.id'), primary_key=True)
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
    places = db.relationship('Place', secondary=tour_places, back_populates='tours')

class Place(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(40), unique=True, nullable=False)
    description = db.Column(db.String(1000))
    longitude = db.Column(db.String(25), nullable=False)
    latitude = db.Column(db.String(25), nullable=False)
    tours = db.relationship('Tour', secondary=tour_places, back_populates='places')

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.String(1000))
    tour_id = db.Column(db.Integer, db.ForeignKey('tour.id'))

with app.app_context():
    db.create_all()

@app.route("/api/route", methods=["POST"])
def api_route():
    data = request.get_json(force=True)
    origin = data["origin"]
    destination = data["destination"]

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

    try:
        payload = r.json()
    except Exception:
        return jsonify({"error": "Non-JSON response from Routes API", "status": r.status_code, "text": r.text}), 502

    if not r.ok:
        return jsonify({"error": payload}), r.status_code

    routes = payload.get("routes")
    if not routes:
        return jsonify({"error": "No routes returned", "payload": payload}), 502

    encoded = routes[0]["polyline"]["encodedPolyline"]
    return jsonify({"encodedPolyline": encoded})


@app.route("/admin/tours")
def tours():
    tours = Tour.query.all()
    return render_template("tours.html", tours=tours)

avalible_tours = ["Historic Tour", "Art Tour", "Campus Tour", "Nature Tour"]

@app.route("/")
def root():
    return render_template('home.html')

@app.route("/Tours")
def see_tours():
    return render_template('tour_list.html', tours=avalible_tours)

@app.route("/Places")
def place():
    return render_template('places.html')

@app.route("/Tour")
def tour():
    return render_template("tour.html", api_key=api_key, longitude=38.54906559678029, latitude=-106.91808868263226)

@app.route("/Contact")
def contact():
    return render_template("contact.html")

app.run(debug=True)
