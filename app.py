import os

from dotenv import load_dotenv
from flask import Flask
from flask_login import LoginManager
from flask_mail import Mail

from map import register_map_routes
from model import Admin, init_db
from routes import register_routes
from mail import register_mail


load_dotenv()

login_manager = LoginManager()

def create_app():
    app = Flask(__name__, static_url_path="/static")
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
    app.config["GOOGLE_MAPS_API_KEY"] = os.getenv("MAPS_API_KEY")
    app.config["JSON_ADD_STATUS"] = False
    app.config["MAIL_SERVER"] = os.getenv("MAIL_SERVER")
    app.config["MAIL_PORT"] = int(os.getenv("MAIL_PORT", "587"))
    app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")
    app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")
    app.config["MAIL_USE_TLS"] = os.getenv("MAIL_USE_TLS", "true").lower() == "true"
    app.config["MAIL_USE_SSL"] = os.getenv("MAIL_USE_SSL", "false").lower() == "true"
    app.config["MAIL_DEFAULT_SENDER"] = os.getenv("MAIL_DEFAULT_SENDER") or os.getenv("MAIL_USERNAME")
    app.config["MAIL_RECIPIENTS"] = os.getenv("MAIL_RECIPIENTS") or os.getenv("MAIL_USERNAME")

    mail = Mail(app)
    register_mail(mail)


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
