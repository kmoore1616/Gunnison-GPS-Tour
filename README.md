# Gunnison GPS Tour
Gunnison GPS Tour is a Flask web app for browsing local tours and viewing a tour-specific walking route on an interactive Google Map. The app stores tours, places, and reviews in SQLite (`gps-database.sqlite`), orders each tour's stops through the `tour_places` table, and serves encoded route polylines from `/get_tour_poly/<tour_id>` so the frontend can draw paths and markers. Current user-facing routes include `/`, `/Tours`, `/Places`, `/Tour`, `/Contact`, and `/viewTour/<tour_id>`, with admin templates wired at `/adminhome`, `/edittours`, `/adminfeedback`, and `/adminreviews`.

To run locally, use Python and install dependencies with `pip install flask flask-sqlalchemy flask-login python-dotenv requests`. Create a `.env` file in the project root with `MAPS_API_KEY=your_google_maps_key`, then start the app with `python app.py` and open `http://127.0.0.1:5000`.

# Overview
This software is designed to offer walking tours with GPS around downtown Gunnison that can be fully customized by the Gunnison County Chamber of Commerce. It will allow visitors to take a custom tour that includes GPS so there is instant feedback about their location so navigation will be esier. Either by using the contact page or at the end of a tour a user is able to submit comments directly to the Chamber of Commerce allowing the Chamber to get feedback. Tours and locations can be filtered to a users personal preference.

This software will give the Chamber of Commerce the ability to update tours to keep up to date with what's happening and the ability to make public or not so a seasonal tour will not have to be remade every season. It will also allow the Chamber of Commerce to fully customize the events and welcome message so the homepage to whatever is relevant. 

# Installation and Setup Instructions
Basic visitor and admin usage for the system will only require a web browser and internet connection.

## Visitor (URL)
1. Open web browser
2. Input the URL

## Visitor (QR Scan)
1. Scan QR via camera

## Admin
1. Open browser
2. Naviagte to the provided URL
3. Login

# User Guide
## Visitor
### Taking a Tour
By either selecting the "Tours" button on the home page, selecting "Tours" through the hamburger menu, or at the very bottom of the page selecting "Tours" will redirect to a page list of all the currently available tours and their star rating. There is the ability to filter the tours alphabetically, by star rating, or resetting the filter and selecting the prefered filter will display the tours as selected. A specific tour can also be naviagted to from a location page. Once a tour is selected it will display an overview of the tour including the name, estimated length, the average star rating, and an overview of the route of the tour. Once the tour is started it can be followed like a standard GPS system. Once a location is reached the "I'm here" button can be pressed and a blurb on the info of the location will be displayed. From there the "Go Back" button can be pressed to resume to the current location or the "Continue to Next stop" button can be pressed to route to the next stop on the tour. The "Skip" button can be selected if the user wants to skip and will be automatically routed to the stop after. If the end of the tour is reached or the "End" button is selected a pop up will be displayed with a star rating and a review box will be required if a star rating is given and the "Submit" button was selected. There is also the ability to decline to give a review via the "No thanks" button. Once either have been selected it will automatically route back to the home page.

### Finding a Location
By either selecting the "Locations" button on the home page, selecting "Locations" through the hamburger menu, or at the very bottom of the page selecting "Locations" will redirect to a page list of all the locations. There is the ability to filter the tours alphabetically, by which tour it is featured on, or resetting the filter, when the prefered filter is selected it will display the locations as selected. Once a location is selected it will display an overview of the location including its name, description, and what tours it is featured on.

## Contacting the Chamber of Commerce
By either selecting the "Contact Us" button on the home page, selecting "Contact" through the hamburger menu, or at the very bottom of the page selecting "Contact" will redirect to a page where in order to send a message the name, email, and a comment is required and select the "Send" button. The "reset" button will clear the text fields.

## Admin
### Viewing Feedback
Once logged in either via the "View Feedback" button on the homescreen or the "Feedback" tab in the navigation bar it will redirect to the feedback page. This page will automatically populate by most recent but can be filter by a specific tour or resetting the filter. Each feeback comment will include the name of the tour it was given after, the star rating, and it's comment. These can also be deleted if desired.

### Editing Welcome Message
Once logged in either via the "Edit Welcome Message" button on the homescreen or "Edit welcome" selected from the "edit" dropdown tab in the navigation bar it will redirect to where the welcome message on the main websites home screen can be edited. If there is a current custom message then the text box will auto populate with that message where it can be eddited or changed and saved once the "save" button has been selected. If the text box is saved while empty a default message will be displayed.

### Editing Events
Once logged in either via the "Edit Welcome Message" button on the homescreen or "Edit welcome" selected from the "edit" dropdown tab in the navigation bar it will redirect to where events can be eddited. The welcome message is automatically saved as an event so it will be shown as a current event. Any events that have been added will also be displayed with their event name, description and if it is currently public. If an event is no longer relevant it can be deleted or marked as not public to be used lated. To create a new event the event requires a name, description and if it's going to be public before it can be saved. 

### Editing/Adding Tours 
An important aspect of this app is the ability to Create, Update, and Delete tours. This functionality is behind Edit Tours button on /adminhome. Here the admin is presented with all current tours on the site, an edit button for each, and a create new tour button. Upon clicking any of these, the admin can edit any of the stops along the tour and the ability to add new places as stops. This menu allows for quick selection of locations that are already a part of other tours and the ability to add new ones. Clicking save will update the tour with the values specified

# Troubleshooting and FAQ
- How do I add another Admin?
  - Currently the site does not support adding new admins directly. Instead this must be done via modifying the database directly. This option shoul be a last resort for admins
- I updated/created a new tour but it doesnt show up in the site
  - Make sure tour is set to public
  - Make sure you hit save after updating/creating tour
- The Map/Routes are not showing up
  - The main cause of this issue is usage limits on Google's API's. If this happens either generate new credentials with a Google API account or contact the developers of the site
- The pages are showing 404 errors
  - This issue would most likely stem from a server issue. Either have a system administrator look into the server to determine the issue, or if not available, contact the developers for more help
- I'm recieving email spam
  - Contact Kyle Moore to have the SMTP email system tempoarily disabled.

# Temporary or Hacky Solutions
Although, we did our best to enforce best practcice throughout the project, time constrictions and general inexperience caused this to become a lower priority. This can be seen in the following areas that could be improved
- Routes.py - While this file was originaly designed to contain solely the routing information and relavant Jinja varibales, it ended up containing significant funcionality beyond its scope. While the functionality works correctly, this ballooned the size of this file beyond reason and impacts readability.
- Html naming - Throughtout the project, we went through many iterations of how the html worked, and much of these files are very similar and codged together in a unoptimal manner
- Overuse of API calls - During the routing process, the routes are fetched at runtime rather than being stored on tour creation. This causes undue route API calls and increases usage. While we never got near our limits, this would be the first place to cut down on usage.
   

# Technical Documentation
This will cover all details for somebody who might be extending or maintain this project.

Gunnison GPS Tours is a server-rendered app with Flask/Jinja templates. Client-side JavaScript is used for map rendering, tour navigation, login requests, popup loading, and admin tour editing.

## The Technology stack consists of:
### Backend
- **Python**
- **Flask**: web framework and route handling.
- **Jinja2**: HTML templating through Flask.
- **Flask-SQLAlchemy / SQLAlchemy**: ORM and database connection management.
- **Flask-Login**: admin session management.
- **Flask-JSON**: JSON response helpers for several admin API routes.
- **Flask-Mail**: sends contact form email.
- **Requests**: calls Google Maps web APIs.
- **python-dotenv**: loads environment variables from `.env`.
- **better-profanity**: censors contact form submissions before email is sent.
- ### Frontend

- **HTML/Jinja templates** in `templates/`.
- **CSS** in `static/style.css`.
- **Raw JavaScript** in `static/*.js`.
- **Bootstrap classes** are used in several templates for layout and button/dropdown behavior.
- **Google Maps JavaScript API** is loaded from templates for maps, markers, geometry, and routes.

### Database

The application uses SQLite databases in `instance/`:

- `gps-database.sqlite`: tours, places, tour ordering, reviews, and feedback.
- `admin.sqlite`: admin login records.
- `messages.sqlite`: homepage welcome/event records.

## 3. Data Dictionary

### Backend Files

| File/Class | Purpose | Key Dependencies |
|---|---|---|
| `app.py` | Flask app registrar/orchestrator, environment config, mail setup, DB initialization, login manager setup, route registration. | Flask, dotenv, Flask-Mail, Flask-Login, `model.py`, `routes.py`, `map.py`, `mail.py`. |
| `model.py` | SQLAlchemy database models and SQLite bind setup. | Flask-SQLAlchemy, Flask-Login. |
| `Tour` | Model for tours. | `Review`, `Place`, `tour_places`. |
| `Place` | Model for map/tour locations. | `Tour`, `tour_places`, Google Maps coordinates. |
| `Review` | Model for tour ratings/comments. | `Tour`. |
| `Admin` | Model for admin login. | Flask-Login `UserMixin`, `admin.sqlite`. |
| `Event` | Model for homepage events and welcome message. | `messages.sqlite`. |
| `Feedback` | Feedback Model | `gps-database.sqlite`. |
| `tour_places` | Association table that links tours and places and stores stop order. | `Tour`, `Place`. |
| `routes.py` | Main visitor/admin routes, API endpoints, CRUD operations, auth, and error handlers. | Flask, Flask-Login, Flask-JSON, SQLAlchemy, Requests, `model.py`, `mail.py`, `map.py`. |
| `map.py` | Ordered stop lookup, route polyline generation, route duration calculation. | Requests, Google Routes API, `model.py`. |
| `mail.py` | Contact form email sending and profanity filtering. | Flask-Mail, better-profanity, environment variables. |

### Template Files

| Template | Purpose | Dependencies |
|---|---|---|
| `visitornav.html` | Visitor navigation layout. | `static/style.css`, header/nav JS. |
| `adminnav.html` | Admin navigation layout. | Admin templates. |
| `adminloginnav.html` | Login page navigation/layout. | `adminlogin.html`. |
| `home.html` | Visitor home page with public events/images. | `Event`, static photos. |
| `tour_list.html` | Tour listing and sort dropdown. | `/Tours`, tour/rating/time data. |
| `viewTour.html` | Tour detail page and overview map. | `tourMap.js`, `/get_tour_poly`. |
| `onTour.html` | Active tour navigation map and buttons. | `tourMap.js`, `tourNavigation.js`, browser geolocation. |
| `locations.html` | Location list with tour filter. | `Place`, `Tour`. |
| `places.html` | Place detail page and featured tours. | `Place`, `Tour`. |
| `feedback.html` | Contact form. | `/Contact`, `mail.py`. |
| `popup.html` | End-of-tour review popup. | `popup.js`, `/tourfeedback`. |
| `stopPopup.html` | Stop information popup. | `popup.js`, `tourNavigation.js`. |
| `adminhome.html` | Admin dashboard. | Admin routes. |
| `adminedittours.html` | Admin tour list. | `edittours` route. |
| `admineditTour.html` | Admin tour editor. | `tourEditor.js`, admin APIs. |
| `newStopPopup.html` | Add stop popup. | `/api/addPlaceToTour`, `/api/get_places_on_tour`. |
| `adminreviews.html` | Admin review list and filtering. | `Review`, `Tour`, delete review API. |
| `admineditevent.html` | Event management. | `Event`. |
| `admineditwelcome.html` | Welcome message editor. | `Event`. |
| `adminerror.html` | Admin error popup. | Error handlers/admin JS. |
| `errorPage.html` | Visitor error page. | Error handlers. |

### Static JavaScript Files

| File | Purpose | Dependencies |
|---|---|---|
| `static/tourMap.js` | Loads Google Maps libraries, fetches route data, draws stop markers and route polylines. | Google Maps JS API, `/get_tour_poly`. |
| `static/tourNavigation.js` | Active tour GPS tracking, user marker, route from user to next stop, Here/Skip/End controls. | Browser geolocation, Google Maps routes library, `tourMap.js`, `popup.js`. |
| `static/tourEditor.js` | Admin tour stop editing, add stop popup, move/remove stops, public flag lookup, delete tour. | Admin JSON APIs and popup templates. |
| `static/popup.js` | Dynamically loads end-of-tour and stop popups, handles review stars. | `/popup`, `/stop_popup`, `/tourfeedback`. |
| `static/verification.js` | Admin login AJAX flow. | `/api/login`. |
| `static/deleteevent.js` | Deletes events from admin page. | `/deleteevent/<id>`. |
| `static/deletereview.js` | Deletes reviews from admin page. | `/deletereview/<id>`. |
| `static/header.js` | Header scroll behavior. | CSS variables. |
| `static/navbar.js` | Navigation/sidebar behavior. | Visitor/admin nav templates. |

### Static Assets

| Asset | Purpose |
|---|---|
| `static/style.css` | Global styling, popup styling, tour lists, admin tables, on-tour controls, responsive behavior. |
| `static/filter.svg` | Filter icon used in dropdown controls. |
| `static/chamber_logo_2026_v2.png` | Chamber logo. |
| `static/photos/*` | Homepage image assets. |

# Known Limitations
The biggest gap in functionality is the lack of CRUD operations on places themselves. While most of the logic is present, there just wasn't enought time to implement a satisfactory implementation. We imagined this functionality looking very similar to tour editing operations, just with different operations.

Beyond this there are a couple of small things
- SQLite is used for its simplicity to deploy, but has limitations under high pressure situations.
- The model contains both stop number and next stop. If extended, prefer tour_places.stop_num as the source of truth, or remove next stop entirely.
- Admin creation is limited
- The app does not cache Google route polyline responses.
