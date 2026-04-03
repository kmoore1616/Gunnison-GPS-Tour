from flask import abort, jsonify, redirect, render_template, request
from flask_login import login_required, login_user, logout_user
from flask_json import FlaskJSON, json_response, as_json
from werkzeug.exceptions import BadRequestKeyError

from model import Admin, Tour, db


def json_answer(text):
    return jsonify({"text": text})


def register_routes(app):
    json = FlaskJSON(app)

    @app.route("/")
    def root():
        return render_template("home.html")

    @app.route("/Tours")
    def see_tours():
        col = []
        entries = Tour.query.all()
        for entry in entries:
            col.append([entry.id, entry.name, entry.description])
        return render_template("tour_list.html", col=col)

    @app.route("/Places")
    def place():
        return render_template("places.html")

    @app.route("/Tour")
    def tour():
        tour_list = 1
        return render_template("onTour.html", tour_list=tour_list)

    @app.route("/Contact")
    def contact():
        return render_template("contact.html")

    @app.route("/feedback")
    def feedback():
        return render_template("feedback.html")

    @app.route("/viewTour/<tour_id>")
    def viewtour(tour_id):
        currtour = Tour.query.filter_by(id=tour_id).first()

        return render_template(
            "viewTour.html",
            tour_id=tour_id,
            tour=currtour.name,
            rating=currtour.average_rating,
            time=currtour.estimated_completion_time,
        )

    @app.route("/adminhome")
    @login_required
    def adminhome():
        return render_template("adminhome.html")

    @app.route("/edittours")
    @login_required
    def edittours():
        tours = Tour.query.all()
        return render_template(
            "edittours.html",
            tours=tours
        )

    @app.route("/createTour")
    @login_required
    def createtour():
        tour = Tour(name="New Tour ",
                    description="A brand new tour!",
                    average_rating=0.0,
                    estimated_completion_time=0,
                    is_public=0
                    )

        db.session.add(tour)
        db.session.commit()

        tour = Tour.query.filter_by(name="New Tour ").first()
        tour.name = tour.name + str(tour.id)

        db.session.commit()

        return render_template(
            "editTour.html",
            tour=tour
        )

    @app.route("/editTour/<tour_id>")
    @login_required
    def edittour(tour_id):
        tour = Tour.query.filter_by(id=tour_id).first()
        return render_template(
            "editTour.html",
            tour=tour
        )

    @app.route("/saveTour/<tour_id>", methods=['POST'])
    @login_required
    def savetour(tour_id):

        tour = Tour.query.filter_by(id=tour_id).first()
        name = request.form['name']
        description = request.form['description']
        try:
            is_public = request.form['is_public']
        except BadRequestKeyError:
            is_public = 0

        if name != tour.name:
            tour.name = name
        if description != tour.description:
            tour.description = description
        if is_public != tour.is_public:
            tour.is_public = is_public

        db.session.commit()

        return redirect("/edittours")

    @app.route("/api/get_public", methods=['POST'])
    @as_json
    def get_public():
        data = request.get_json(force=True)
        name = data['name']
        tour = Tour.query.filter_by(name=name).first()
        return json_response(is_public=tour.is_public)

    @app.route("/api/delete_tour", methods=['POST'])
    @as_json
    def delete_tour():
        data = request.get_json(force=True)
        name = data['name']
        tour = Tour.query.filter_by(name=name).first()
        db.session.delete(tour)
        db.session.commit()
        return json_response(result=0)

    @app.route("/adminfeedback")
    @login_required
    def adminfeedback():
        return render_template("adminfeedback.html")

    @app.route("/adminreviews")
    @login_required
    def adminreviews():
        return render_template("adminreviews.html")

    @app.route("/login")
    def login():
        return render_template("adminlogin.html")

    @app.route("/api/login", methods=["POST"])
    def check_login():
        data = request.get_json(force=True)
        username = data["username"]
        password = data["password"]
        if username == "":
            return json_answer(text="Username can't be nothing")
        if password == "":
            return json_answer(text="Password can't be nothing")

        user = Admin.query.filter_by(username=username).first()
        if user is None:
            return json_answer(text="Incorrect username or password")

        if user.password == password:
            login_user(user)
            return json_answer(text="success")

        return json_answer(text="Incorrect username or password")

    @app.route("/logout")
    @login_required
    def logout():
        logout_user()
        return redirect("/login")
