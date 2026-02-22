#hi
from flask import Flask, render_template, redirect, request
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user

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

@app.route("/admin/tours")
def tours():
    tours = Tour.query.all()
    return render_template("viewTour.html", tours=tours)
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
    return render_template("onTour.html")

@app.route("/Contact")
def contact():
    return render_template("contact.html")

@app.route('/feedback')
def feedback():
    return render_template('feedback.html')

@app.route('/reviews')
def reviews():
    return render_template('reviews.html')

##All of these will need to have login required but for testing reasons not doing that rn
@app.route('/adminhome')
def home():
    return render_template('adminhome.html')

@app.route('/edittours')
def tours():
    return render_template('edittours.html')

@app.route('/adminfeedback')
def feedback():
    return render_template('adminfeedback.html')

@app.route('/adminreviews')
def reviews():
    return render_template('adminreviews.html')



app.run(debug=True)

