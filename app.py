import os

from dotenv import load_dotenv
from flask import Flask
from flask_login import LoginManager

from map import register_map_routes
from model import Admin, init_db
from routes import register_routes


load_dotenv()

login_manager = LoginManager()


def create_app():
    app = Flask(__name__, static_url_path="/static")
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
    app.config["GOOGLE_MAPS_API_KEY"] = os.getenv("MAPS_API_KEY")
    app.config["JSON_ADD_STATUS"] = False

    init_db(app)
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return Admin.query.get(int(user_id))

    register_routes(app)
    register_map_routes(app)

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
