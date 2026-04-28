import requests
from flask import abort, jsonify, redirect, render_template, request, current_app
from flask_login import login_required, login_user, logout_user
from flask_json import FlaskJSON, json_response, as_json
from werkzeug.exceptions import BadRequestKeyError
from sqlalchemy import text

from model import Admin, Tour, Feedback, db, Review, tour_places, Place
from mail import send_feedback_email


def json_answer(texts):
    return jsonify({"texts": texts})


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
            tour=currtour,
            error="none"
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
            classes = data['place_id']
            id = classes.split(' ')
            place_id = id[1]

            currtour = Tour.query.filter_by(name=name).first()
            query = tour_places.select().where(tour_places.c.tour_id == currtour.id).order_by(tour_places.c.stop_num.asc())
            result = db.session.execute(query)
            rows = result.all()
            count = len(rows)

            if operation == "delete":
                target_place = db.session.execute(
                    tour_places.select().where(tour_places.c.tour_id == currtour.id,
                                               tour_places.c.place_id == place_id)
                ).mappings().first()

                if count != 1:
                    next_id = None
                    previous_id = None

                    # CHECK IF NEXT EXISTS
                    next_place = db.session.execute(
                        tour_places.select().where(tour_places.c.tour_id == currtour.id,
                                                   tour_places.c.place_id == target_place["next_stop_place_id"])
                    ).mappings().first()
                    if next_place:
                        next_id = next_place["place_id"]

                    # CHECK IF PREVIOUS EXISTS
                    previous_place = db.session.execute(
                        tour_places.select().where(tour_places.c.tour_id == currtour.id,
                                                   tour_places.c.next_stop_place_id == place_id)
                    ).mappings().first()
                    if previous_place:
                        previous_id = previous_place["place_id"]

                    # UPDATE PREVIOUS POINTER TO NEXT
                    if previous_id is not None:
                        db.session.execute(
                            text(
                                """
                                UPDATE tour_places
                                SET next_stop_place_id = :next_id
                                WHERE (tour_id = :currtour_id
                                AND place_id = :place_id
                                );
                                """
                            ),
                            {"next_id": next_id, "currtour_id": currtour.id, "place_id": previous_id}
                        )

                    temp_place = Place.query.filter_by(id=target_place["place_id"]).first()
                    currtour.places.remove(temp_place)

                    db.session.execute(
                        text(
                            """
                            UPDATE tour_places
                            SET stop_num = stop_num - 1
                            WHERE (tour_id = :currtour_id
                            AND stop_num > :target_num
                            );
                            """
                        ),
                        {"currtour_id": currtour.id, "target_num": target_place["stop_num"]}
                    )
                db.session.commit()
                return json_response(result=0)
            elif count == 1:
                print("Cannot change order of one object")
            elif operation == "move_up":
                target_place = db.session.execute(
                    tour_places.select().where(tour_places.c.tour_id == currtour.id,
                                               tour_places.c.place_id == place_id)
                ).mappings().first()

                if target_place["stop_num"] != 1:
                    previous_place = db.session.execute(
                        tour_places.select().where(tour_places.c.tour_id == currtour.id,
                                                   tour_places.c.next_stop_place_id == place_id)
                    ).mappings().first()

                    target_id = target_place["place_id"]
                    previous_id = previous_place["place_id"]

                    # UPDATE PREV PREV POINTER
                    if previous_place["stop_num"] != 1:
                        prev_prev_place = db.session.execute(
                            tour_places.select().where(tour_places.c.tour_id == currtour.id,
                                                       tour_places.c.next_stop_place_id == previous_id)
                        ).mappings().first()

                        prev_prev_id = prev_prev_place["place_id"]

                        db.session.execute(
                            text(
                                """
                                UPDATE tour_places
                                SET next_stop_place_id = :next_id
                                WHERE (tour_id = :currtour_id
                                AND place_id = :place_id
                                );
                                """
                            ),
                            {"next_id": target_id, "currtour_id": currtour.id, "place_id": prev_prev_id}
                        )

                    # UPDATE TARGET TO POINT TO PREVIOUS
                    db.session.execute(
                        text(
                            """
                            UPDATE tour_places
                            SET next_stop_place_id = :next_id
                            WHERE (tour_id = :currtour_id
                            AND place_id = :place_id
                            );
                            """
                        ),
                        {"next_id": previous_id, "currtour_id": currtour.id, "place_id": target_id}
                    )

                    # UPDATE TARGET POSITION
                    db.session.execute(
                        text(
                            """
                            UPDATE tour_places
                            SET stop_num = :stop_num
                            WHERE (tour_id = :currtour_id
                            AND place_id = :place_id
                            );
                            """
                        ),
                        {"stop_num": previous_place["stop_num"], "currtour_id": currtour.id, "place_id": target_id}
                    )

                    # UPDATE PREVIOUS TO POINT TO NEXT
                    db.session.execute(
                        text(
                            """
                            UPDATE tour_places
                            SET next_stop_place_id = :next_place_id
                            WHERE (tour_id = :currtour_id
                            AND place_id = :place_id
                            );
                            """
                        ),
                        {"next_place_id": target_place["next_stop_place_id"], "currtour_id": currtour.id, "place_id": previous_id}
                    )

                    # UPDATE PREVIOUS POSITION
                    db.session.execute(
                        text(
                            """
                            UPDATE tour_places
                            SET stop_num = :stop_num
                            WHERE (tour_id = :currtour_id
                            AND place_id = :place_id
                            );
                            """
                        ),
                        {"stop_num": target_place["stop_num"], "currtour_id": currtour.id, "place_id": previous_id}
                    )
                else:
                    print("Place is already at the top!")
                db.session.commit()
                return json_response(result=0)
            elif operation == "move_down":
                target_place = db.session.execute(
                    tour_places.select().where(tour_places.c.tour_id == currtour.id,
                                               tour_places.c.place_id == place_id)
                ).mappings().first()

                if target_place["stop_num"] != count:
                    next_place = db.session.execute(
                        tour_places.select().where(tour_places.c.tour_id == currtour.id,
                                                   tour_places.c.place_id == target_place["next_stop_place_id"])
                    ).mappings().first()

                    target_id = target_place["place_id"]
                    next_id = next_place["place_id"]
                    next_next_id = next_place["next_stop_place_id"]

                    # UPDATE PREVIOUS PLACE POINTER
                    if target_place["stop_num"] != 1:
                        previous_place = db.session.execute(
                            tour_places.select().where(tour_places.c.tour_id == currtour.id,
                                                       tour_places.c.next_stop_place_id == place_id)
                        ).mappings().first()

                        db.session.execute(
                            text(
                                """
                                UPDATE tour_places
                                SET next_stop_place_id = :next_id
                                WHERE (tour_id = :currtour_id
                                AND place_id = :previous_id
                                );
                                """
                            ),
                            {"next_id": next_id, "currtour_id": currtour.id, "previous_id": previous_place["place_id"]}
                        )

                    # UPDATE NEXT TO POINT TO TARGET
                    db.session.execute(
                        text(
                            """
                            UPDATE tour_places
                            SET next_stop_place_id = :next_id
                            WHERE (tour_id = :currtour_id
                            AND place_id = :place_id
                            );
                            """
                        ),
                        {"next_id": target_id, "currtour_id": currtour.id, "place_id": next_id}
                    )

                    # UPDATE TARGET TO POINT TO NEXT NEXT
                    db.session.execute(
                        text(
                            """
                            UPDATE tour_places
                            SET next_stop_place_id = :next_id
                            WHERE (tour_id = :currtour_id
                            AND place_id = :place_id
                            );
                            """
                        ),
                        {"next_id": next_next_id, "currtour_id": currtour.id, "place_id": target_id}
                    )

                    db.session.execute(
                        text(
                            """
                            UPDATE tour_places
                            SET stop_num = :stop_num
                            WHERE (tour_id = :currtour_id
                            AND place_id = :place_id
                            );
                            """
                        ),
                        {"stop_num": next_place["stop_num"], "currtour_id": currtour.id, "place_id": target_id}
                    )

                    db.session.execute(
                        text(
                            """
                            UPDATE tour_places
                            SET stop_num = :stop_num
                            WHERE (tour_id = :currtour_id
                            AND place_id = :place_id
                            );
                            """
                        ),
                        {"stop_num": target_place["stop_num"], "currtour_id": currtour.id, "place_id": next_id}
                    )
                else:
                    print("This place is already at the bottom!")
                db.session.commit()
                return json_response(result=0)

    @app.route("/addStop")
    @login_required
    def add_stop():
        name = request.args.get('name')
        return render_template("newStopPopup.html", name=name)

    @app.route("/adminError")
    @login_required
    def admin_error():
        err_msg = request.args.get('err_msg')
        return render_template("adminerror.html", err_msg=err_msg)

    @app.route("/api/addPlaceToTour", methods=['POST'])
    @login_required
    def add_stop_to_tour():
        if request.method == 'POST':
            existing_location = request.form['existingLocation']
            name = request.form['name']
            address = request.form['address']
            description = request.form['description']

            # Get this tour
            currtour_name = request.form['tour_name']
            currtour = Tour.query.filter_by(name=currtour_name).first()

            # Find places that are part of this tour
            query = tour_places.select().where(tour_places.c.tour_id == currtour.id)
            result = db.session.execute(query)
            place_ids = []
            for row in result:
                place_ids.append(row[1])
            currplaces = []
            for i in place_ids:
                placeI = Place.query.filter_by(id=i).first()
                currplaces.append(placeI)

            # Error check user's input
            if existing_location != "none":
                this_place = Place.query.filter_by(name=existing_location).first()
                query = tour_places.select().where(tour_places.c.tour_id == currtour.id).order_by(tour_places.c.stop_num.asc())
                result = db.session.execute(query)
                rows = result.all()
                count = len(rows)

                currtour.places.append(this_place)
                db.session.commit()

                if count > 0:
                    last_place = rows[count-1]

                    db.session.execute(
                        text(
                            """
                            UPDATE tour_places
                            SET next_stop_place_id = :next_place_id
                            WHERE (tour_id = :currtour_id
                            AND place_id = :place_id
                            );
                            """
                        ),
                        {"next_place_id": this_place.id, "currtour_id": currtour.id, "place_id": last_place[1]}
                    )
                    db.session.execute(
                        text(
                            """
                            UPDATE tour_places
                            SET stop_num = :stop_num
                            WHERE (tour_id = :currtour_id
                            AND place_id = :place_id
                            );
                            """
                        ),
                        {"stop_num": last_place[3]+1, "currtour_id": currtour.id, "place_id": this_place.id}
                    )
                else:
                    db.session.execute(
                        text(
                            """
                            UPDATE tour_places
                            SET stop_num = :stop_num
                            WHERE (tour_id = :currtour_id
                            AND place_id = :place_id
                            );
                            """
                        ),
                        {"stop_num": 1, "currtour_id": currtour.id, "place_id": this_place.id}
                    )

            elif name != "":
                if address != "":
                    if description != "":
                        # Conversion from address to coordinates is done via Geocoding
                        # Google Maps Geocoding API: https://developers.google.com/maps/documentation/geocoding/guides-v3/requests-geocoding
                        parsed_address = address.split(" ")
                        url_address = ""
                        i = 0
                        for a in parsed_address:
                            if i == 0:
                                url_address = url_address + a
                            else:
                                url_address = url_address + "%20" + a
                            i += 1
                        #Western Colorado University, 1 Western Way, Gunnison, CO 81231
                        api_key = current_app.config.get("GOOGLE_MAPS_API_KEY")
                        api_url = ("https://maps.googleapis.com/maps/api/geocode/json?address="
                                   + url_address
                                   + "&key="
                                   + api_key)
                        response = requests.post(api_url)

                        if not response.ok:
                            print("Error connecting to geolocation api")
                            print("STATUS:", response.status_code)
                            print("TEXT:", response.text)
                            return render_template("editTour.html", tour=currtour, error="geolocation_error")

                        try:
                            location_info = response.json()
                        except Exception:
                            return render_template("editTour.html", tour=currtour, error="json_error")

                        try:
                            results = location_info.get("results")
                            address_components = results[0] # error when bad address
                            geometry = address_components.get("geometry")
                            coords = geometry.get("location")
                        except Exception:
                            print("Invalid address")
                            return render_template("editTour.html", tour=currtour, error="invalid_address")

                        lat = coords.get("lat")
                        lng = coords.get("lng")

                        new_place = Place(name=name, description=description, longitude=str(lng), latitude=str(lat))
                        db.session.add(new_place)
                        db.session.commit()

                        this_place = Place.query.filter_by(name=name).first()
                        query = tour_places.select().where(tour_places.c.tour_id == currtour.id)
                        result = db.session.execute(query)
                        rows = result.all()
                        count = len(rows)

                        currtour.places.append(this_place)
                        db.session.commit()

                        if count > 0:
                            last_place = rows[count-1]

                            db.session.execute(
                                text(
                                    """
                                    UPDATE tour_places
                                    SET next_stop_place_id = :next_place_id
                                    WHERE (tour_id = :currtour_id
                                    AND place_id = :place_id
                                    );
                                    """
                                ),
                                {"next_place_id": this_place.id, "currtour_id": currtour.id, "place_id": last_place[1]}
                            )
                            db.session.execute(
                                text(
                                    """
                                    UPDATE tour_places
                                    SET stop_num = :stop_num
                                    WHERE (tour_id = :currtour_id
                                    AND place_id = :place_id
                                    );
                                    """
                                ),
                                {"stop_num": last_place[3] + 1, "currtour_id": currtour.id, "place_id": this_place.id}
                            )
                        else:
                            db.session.execute(
                                text(
                                    """
                                    UPDATE tour_places
                                    SET stop_num = :stop_num
                                    WHERE (tour_id = :currtour_id
                                    AND place_id = :place_id
                                    );
                                    """
                                ),
                                {"stop_num": 1, "currtour_id": currtour.id, "place_id": this_place.id}
                            )
                    else:
                        return render_template("editTour.html", tour=currtour, error="description_missing")
                else:
                    return render_template("editTour.html", tour=currtour, error="address_missing")
            else:
                return render_template("editTour.html", tour=currtour, error="empty_stop")

            db.session.commit()

            return render_template("editTour.html", tour=currtour, error="none")

    @app.route("/api/get_ordered_stops", methods=['POST'])
    @as_json
    def get_ordered_stops():
        if request.method == 'POST':
            data = request.get_json(force=True)
            name = data['name']
            currtour = Tour.query.filter_by(name=name).first()

            query = tour_places.select().where(tour_places.c.tour_id == currtour.id).order_by(tour_places.c.stop_num.asc())
            result = db.session.execute(query)
            rows = result.all()

            stops = []
            p_ids = []
            for r in rows:
                p = Place.query.filter_by(id=r[1]).first()
                stops.append(p.name)
                p_ids.append(p.id)

            return json_response(stops=stops, p_ids=p_ids)

    @app.route("/api/get_places_on_tour", methods=['POST'])
    @as_json
    def get_places():
        if request.method == 'POST':
            data = request.get_json(force=True)
            name = data['name']
            currtour = Tour.query.filter_by(name=name).first()
            currplaces = []
            all_places = Place.query.all()
            for p in all_places:
                if p not in currtour.places:
                    currplaces.append(p.name)
            return json_response(places=currplaces)

    @app.route("/api/get_public", methods=['POST'])
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
                return json_answer(texts="Username can't be nothing")
            if password == "":
                return json_answer(texts="Password can't be nothing")

            user = Admin.query.filter_by(username=username).first()
            if user is None:
                return json_answer(texts="Incorrect username or password")

            if user.password == password:
                login_user(user)
                return json_answer(texts="success")

            return json_answer(texts="Incorrect username or password")

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

