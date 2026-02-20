from flask import Flask, render_template, requests

app = Flask(__name__, static_url_path='/static')

<<<<<<< GPS-11
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
    return render_template("tour.html")

@app.route("/Contact")
def contact():
    return render_template("contact.html")

app.run(debug=True)

=======

app.run(debug=True)
>>>>>>> main
