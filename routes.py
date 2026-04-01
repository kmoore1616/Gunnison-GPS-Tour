from flask import abort, jsonify, redirect, render_template, request
from flask_login import login_required, login_user, logout_user

from model import Admin, Tour, Feedback, db, Review, tour_places, Place


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
        return render_template("edittours.html")

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

