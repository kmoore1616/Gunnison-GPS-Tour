import os
from email.utils import parseaddr

from flask_mail import Mail, Message
from better_profanity import profanity

profanity.load_censor_words()
mail = None

def register_mail(mail_object):
    global mail
    mail = mail_object

def _is_valid_email(address):
    return bool(parseaddr(address)[1])

def _configured_recipients():
    raw_recipients = os.getenv("MAIL_RECIPIENTS") or os.getenv("MAIL_DEFAULT_SENDER") or os.getenv("MAIL_USERNAME", "")
    recipients = [
        address.strip()
        for address in raw_recipients.split(",")
        if _is_valid_email(address.strip())
    ]
    return recipients


def send_feedback_email(name, email, feedback):
    name = profanity.censor(name)
    email = profanity.censor(email)
    feedback = profanity.censor(feedback)

    recipients = _configured_recipients()
    if not recipients:
        print("Message failed to send: configure MAIL_RECIPIENTS, MAIL_DEFAULT_SENDER, or MAIL_USERNAME with a valid email address")
        return False

    sender = os.getenv("MAIL_DEFAULT_SENDER") or os.getenv("MAIL_USERNAME")
    if not _is_valid_email(sender or ""):
        print("Message failed to send: configure MAIL_DEFAULT_SENDER or MAIL_USERNAME with a valid email address")
        return False

    message = Message(f"Feedback Submission",
                      sender=sender,
                      recipients=recipients
                      )
    message.body = f"Name: {name}\nEmail: {email}\nFeedback:\n{feedback}"

    try:
        mail.send(message)
    except Exception as e:
        print("Message failed to send", e)
        return False

    return True
