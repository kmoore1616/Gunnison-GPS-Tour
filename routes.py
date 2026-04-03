from flask import abort, jsonify, redirect, render_template, request
from flask_login import login_required, login_user, logout_user
from flask_json import FlaskJSON, json_response, as_json
from werkzeug.exceptions import BadRequestKeyError

from model import Admin, Tour, Feedback, db, Review, tour_places, Place
from mail import send_feedback_email


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

    @app.route("/feedback", methods=["GET", "POST"])
    def feedback():
        if request.method == "POST":
            name = request.form['name']
            email = request.form['mail']
            feedback = request.form["comment"]

            valid = name.strip() or email.strip() or feedback.strip()

            if not valid:
                return render_template("feedback.html", success="False")


            if(send_feedback_email(name, email, feedback)):
                return render_template("feedback.html", success="True")
            else:
                return render_template("feedback.html", success="False")
        else:
            return render_template("feedback.html", success="GET")



    @app.route("/viewTour/<tour_id>")
    def viewtour(tour_id):
        currtour = Tour.query.filter_by(id=tour_id).first()

        places = db.session.query(Place).join(tour_places, tour_places.c.place_id == Place.id).filter(tour_places.c.tour_id == tour_id).all()

        col = [(p.id, p.name, p.description)
               for p in places]

        return render_template(
            "viewTour.html",
            tour_id=tour_id,
            tour=currtour.name,
            rating=currtour.average_rating,
            time=currtour.estimated_completion_time,
            col=col
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
        if request.method == 'POST':
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

    @app.route("/api/edit_place_on_tour", methods=['POST'])
    @login_required
    @as_json
    def edit_place_on_tour():
        if request.method == 'POST':
            data = request.get_json(force=True)
            name = data['name']
            tour = Tour.query.filter_by(name=name).first()
            operation = data['operation']
            if operation == "move_up":
                print(operation)
                return json_response(result=0)
            elif operation == "move_down":
                print(operation)
                return json_response(result=0)
            elif operation == "delete":
                print(operation)
                return json_response(result=0)

    @app.route("/api/get_public", methods=['POST'])
    @login_required
    @as_json
    def get_public():
        if request.method == 'POST':
            data = request.get_json(force=True)
            name = data['name']
            tour = Tour.query.filter_by(name=name).first()
            return json_response(is_public=tour.is_public)

    @app.route("/api/delete_tour", methods=['POST'])
    @login_required
    @as_json
    def delete_tour():
        if request.method == 'POST':
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

        dropdown = Tour.query.all()
        tourdropdown = [(k.id,k.name) for k in dropdown]

        tour_id=request.args.get('tour_id',type=int)
        if tour_id:
            entries = Review.query.filter_by(tour_id=tour_id).order_by(Review.id.desc()).all()
        else:
            entries = Review.query.all()
        col = [(r.id, r.rating, r.comment, r.tour.name) for r in entries]
        return render_template("adminreviews.html", col=col,tourdropdown=tourdropdown)

    @app.route("/login")
    def login():
        return render_template("adminlogin.html")

    @app.route("/api/login", methods=["POST"])
    def check_login():
        if request.method == 'POST':
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

    @app.route('/popup')
    def popup():
        tour_id = request.args.get('tour_id')
        return render_template('popup.html', tour_id=tour_id)

    @app.route('/tourfeedback', methods=['GET', 'POST'])
    def tourreview():
        if request.method == 'POST':
            comment = request.form['comment']
            rating = int(request.form.get("rating", 0))
            tour_id = int(request.form.get("tour_id"))
            review = Review(rating=rating, comment=comment, tour_id=tour_id)
            db.session.add(review)
            db.session.commit()
            return redirect('/')

    @app.route('/delete/<int:id>', methods=['POST'])
    @login_required
    def delete(id):
        res = Review.query.filter_by(id=id).first()
        db.session.delete(res)
        db.session.commit()
        return '',204

