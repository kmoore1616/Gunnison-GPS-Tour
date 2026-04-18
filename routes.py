from flask import abort, jsonify, redirect, render_template, request
from flask_login import login_required, login_user, logout_user
from sqlalchemy import func
from flask_json import FlaskJSON, json_response, as_json
from werkzeug.exceptions import BadRequestKeyError

from model import Admin, Tour, Feedback, db, Review, tour_places, Place
from mail import send_feedback_email
from map import get_ordered_places_for_tour


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

        sort_tour = request.args.get("sort_tour","none")

        if sort_tour == "longest":
            entries = Tour.query.order_by(Tour.estimated_completion_time.desc()).all()
        elif sort_tour == "shortest":
            entries = Tour.query.order_by(Tour.estimated_completion_time.asc()).all()
        elif sort_tour == "highreview":
            entries = Tour.query.join(Review).group_by(Tour.id).order_by(func.avg(Review.rating).desc()).all()
        elif sort_tour == "lowreview":
            entries = Tour.query.join(Review).group_by(Tour.id).order_by(func.avg(Review.rating).asc()).all()
        elif sort_tour == "atoz":
            entries = Tour.query.order_by(Tour.name.asc()).all()
        elif sort_tour == "ztoa":
            entries = Tour.query.order_by(Tour.name.desc()).all()
        else:
            entries = Tour.query.all()

        for entry in entries:
            avg_rating = db.session.query(func.avg(Review.rating)).filter_by(tour_id=entry.id).scalar()
            col.append([entry.id, entry.name, entry.description,avg_rating or "Be the first to review it"])
        return render_template("tour_list.html", col=col)

    @app.route("/Locations")
    def locations():
        col = []

        dropdown = Tour.query.all()
        tourlocations = [(k.id, k.name) for k in dropdown]

        tour_id=request.args.get('tour_id',type=int)
        if tour_id:
            entries = Place.query.join(tour_places, Place.id == tour_places.c.place_id).filter(tour_places.c.tour_id == tour_id).all()
        else:
            entries = Place.query.order_by(Place.name).all()

        for k in entries:
            col.append([k.id,k.name])
        return render_template("locations.html",col=col,tourlocations=tourlocations)

    @app.route("/Places/<place_id>")
    def place(place_id):
        col = []
        entries = Place.query.filter_by(id=place_id).all()

        feat_tours= Tour.query.join(tour_places,Tour.id==tour_places.c.tour_id).filter(tour_places.c.place_id==place_id).all()

        for k in entries:
            col.append([k.id,k.name,k.description])
        return render_template("places.html", col=col,feat_tours=feat_tours)


    @app.route("/Contact", methods=["GET", "POST"])
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

        if currtour is None:
            abort(404)

        places = get_ordered_places_for_tour(tour_id)

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


    @app.route("/onTour/<tour_id>")
    def onTour(tour_id):
        currtour = Tour.query.filter_by(id=tour_id).first()

        if currtour is None:
            abort(404)

        return render_template(
            "onTour.html",
            tour_id=tour_id,
            tour=currtour.name,
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
        currtour = Tour(name="New Tour ",
                    description="A brand new tour!",
                    average_rating=0.0,
                    estimated_completion_time=0,
                    is_public=0
                    )

        db.session.add(currtour)
        db.session.commit()

        currtour = Tour.query.filter_by(name="New Tour ").first()
        currtour.name = currtour.name + str(currtour.id)

        db.session.commit()

        return render_template(
            "editTour.html",
            tour=currtour
        )

    @app.route("/editTour/<tour_id>")
    @login_required
    def edittour(tour_id):
        currtour = Tour.query.filter_by(id=tour_id).first()
        return render_template(
            "editTour.html",
            tour=currtour
        )

    @app.route("/saveTour/<tour_id>", methods=['POST'])
    @login_required
    def savetour(tour_id):
        if request.method == 'POST':
            currtour = Tour.query.filter_by(id=tour_id).first()
            name = request.form['name']
            description = request.form['description']
            try:
                is_public = request.form['is_public']
            except BadRequestKeyError:
                is_public = 0

            if name != currtour.name:
                currtour.name = name
            if description != currtour.description:
                currtour.description = description
            if is_public != currtour.is_public:
                currtour.is_public = is_public

            db.session.commit()

            return redirect("/edittours")

    @app.route("/api/edit_place_on_tour", methods=['POST'])
    @login_required
    @as_json
    def edit_place_on_tour():
        if request.method == 'POST':
            data = request.get_json(force=True)
            name = data['name']
            operation = data['operation']
            place_id = data['place_id']

            currtour = Tour.query.filter_by(name=name).first()


            if operation == "move_up":
                return json_response(result=0)
            elif operation == "move_down":
                return json_response(result=0)
            elif operation == "delete":
                return json_response(result=0)

    @app.route("/api/get_public", methods=['POST'])
    @login_required
    @as_json
    def get_public():
        if request.method == 'POST':
            data = request.get_json(force=True)
            name = data['name']
            currtour = Tour.query.filter_by(name=name).first()
            return json_response(is_public=currtour.is_public)

    @app.route("/api/delete_tour", methods=['POST'])
    @login_required
    @as_json
    def delete_tour():
        if request.method == 'POST':
            data = request.get_json(force=True)
            name = data['name']
            currtour = Tour.query.filter_by(name=name).first()
            db.session.delete(currtour)
            db.session.commit()
            return json_response(result=0)

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

    @app.errorhandler(404)
    def e404(err):

        path = request.path
        if path.startswith('/admin'):
            return render_template('adminerror.html', err=404)
        else:
            return render_template('errorPage.html',err=404)

    @app.errorhandler(401)
    def unauthorized_handler(err):
        path = request.path
        if path.startswith('/admin'):
            return render_template('adminerror.html', err=401)
        else:
            return render_template('errorPage.html', err=401)

    @app.errorhandler(403)
    def forbidden_handler(err):
        path = request.path
        if path.startswith('/admin'):
            return render_template('adminerror.html', err=403)
        else:
            return render_template('errorPage.html', err=403)