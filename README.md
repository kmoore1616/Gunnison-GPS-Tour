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
