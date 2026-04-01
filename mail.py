import os

from flask_mail import Mail, Message
from alt_
from alt_profanity_filter import ProfanityFilter


mail = 0


def register_mail(mail_object):
    global mail
    mail = mail_object

def _configured_recipients():
    raw_recipients = os.getenv("MAIL_DEFAULT_SENDER", "")
    recipients = [address.strip() for address in raw_recipients.split(",") if address.strip()]
    return recipients


def send_feedback_email(name, email, feedback):
    print(email)
    recipients = _configured_recipients()
    if not recipients:

        print("Message failed to send: MAIL_DEFAULT_SENDER is not configured with a valid email address")
        return False


    message = Message(f"Feedback Submission",
                      sender=os.getenv("MAIL_USERNAME"),
                      recipients=recipients
                      )
    message.body = f"Name: {name}\nEmail: {email}\nFeedback:\n{feedback}"
    try:
        mail.send(message)
    except Exception as e:
        print("Message failed to send", e)
        return False

    return True
