from flask import abort, jsonify, redirect, render_template, request
from flask_login import login_required, login_user, logout_user

from model import Admin, Tour


def json_response(text):
    return jsonify({"text": text})


def register_routes(app):
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
        return render_template("edittours.html")

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
            return json_response(text="Username can't be nothing")
        if password == "":
            return json_response(text="Password can't be nothing")

        user = Admin.query.filter_by(username=username).first()
        if user is None:
            return json_response(text="Incorrect username or password")

        if user.password == password:
            login_user(user)
            return json_response(text="success")

        return json_response(text="Incorrect username or password")

    @app.route("/logout")
    @login_required
    def logout():
        logout_user()
        return redirect("/login")
