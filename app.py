from flask import Flask, render_template

app = Flask(__name__, static_url_path='/static')

##All of these will need to have login required but for testing reasons not doing that rn
@app.route('/')
def home():
    return render_template('home.html')

@app.route('/tours')
def tours():
    return render_template('tours.html')

@app.route('/feedback')
def feedback():
    return render_template('feedback.html')

@app.route('/reviews')
def reviews():
    return render_template('reviews.html')

##error handling to be done later

app.run(debug=True)
