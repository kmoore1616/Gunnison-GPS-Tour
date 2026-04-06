from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


tour_places = db.Table(
    "tour_places",
    db.Column("tour_id", db.Integer, db.ForeignKey("tour.id"), primary_key=True),
    db.Column("place_id", db.Integer, db.ForeignKey("place.id"), primary_key=True),
    db.Column("next_stop_place_id", db.Integer, db.ForeignKey("place.id"), nullable=True),
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
    is_public = db.Column(db.Integer, nullable=False)
    reviews = db.relationship("Review", backref="tour")
    places = db.relationship(
        "Place",
        secondary=tour_places,
        primaryjoin="Tour.id == tour_places.c.tour_id",
        secondaryjoin="Place.id == tour_places.c.place_id",
        back_populates="tours",
    )


class Place(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(40), unique=True, nullable=False)
    description = db.Column(db.String(1000))
    longitude = db.Column(db.String(25), nullable=False)
    latitude = db.Column(db.String(25), nullable=False)
    tours = db.relationship(
        "Tour",
        secondary=tour_places,
        primaryjoin="Place.id == tour_places.c.place_id",
        secondaryjoin="Tour.id == tour_places.c.tour_id",
        back_populates="places",
    )


class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.String(1000))
    tour_id = db.Column(db.Integer, db.ForeignKey("tour.id"))


def init_db(app):
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///gps-database.sqlite"
    db.init_app(app)

    with app.app_context():
        db.create_all()
