from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin

db = SQLAlchemy()


# TOURS DATABASE
tour_places = db.Table(
    "tour_places",
    db.Column("tour_id", db.Integer, db.ForeignKey("tour.id"), primary_key=True),
    db.Column("place_id", db.Integer, db.ForeignKey("place.id"), primary_key=True),
    db.Column("next_stop_place_id", db.Integer, db.ForeignKey("place.id"), nullable=True),
)


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


# ADMIN DATABASE
class Admin(UserMixin, db.Model):
    __bind_key__ = 'admin'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(40), unique=True, nullable=False)
    password = db.Column(db.String(40), nullable=False)


# MESSAGES DATABASE - FOR FRONT PAGE WELCOME MESSAGES
class Welcome(db.Model):
    __bind_key__ = 'messages'
    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.String(10000), nullable=False, default="Welcome to the Gunnison GPS Walking Tours experience!")


class Event(db.Model):
    __bind_key__ = 'messages'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.String(10000), nullable=False)
    is_public = db.Column(db.Integer, nullable=False)


# INITIALIZE DATABASES
def init_db(app):
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///gps-database.sqlite"
    app.config['SQLALCHEMY_BINDS'] = {
        "admin": {
            "url": "sqlite:///admin.sqlite",
            "pool_recycle": 3600,
        },
        "messages": {
            "url": "sqlite:///messages.sqlite",
            "pool_recycle": 3700,
        },
    }

    db.init_app(app)

    with app.app_context():
        db.create_all(bind_key=[None, "admin", "messages"])
