
// Load page - Set status of the 'is_public' checkbox
window.onload = function() {
    var name = document.getElementById('editTourName').innerHTML;
    if(name) {
        var data = {name: name};
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if(this.readyState === 4 && this.status === 200) {
                var json = JSON.parse(this.responseText);
                var is_public = json.is_public;
                if(is_public == 0) {
                    document.getElementById('is_public').checked = false;
                } else {
                    document.getElementById('is_public').checked = true;
                }
            }
        };
        xhttp.open('POST', '/api/get_public', true);
        xhttp.send(JSON.stringify(data));
    }
    getStops(name);
}

function getStops(name) {
    console.log("Getting stops!");
    var data = {name: name};
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if(this.readyState === 4 && this.status === 200) {
            var json = JSON.parse(this.responseText);
            var stops = json.stops;
            var p_ids = json.p_ids;

            const elements = document.getElementsByClassName('list-class');
            while(elements.length > 0){
                elements[0].remove();
            }

            var table = document.getElementById('edit-tour-places');
            for(s in stops) {
                var row = document.createElement('tr');
                row.classList.add("edit-tour-items");
                row.classList.add("list-class");

                var tdNum = document.createElement('td');
                tdNum.classList.add("list-class");
                var rowNum = Number(s)+1;
                tdNum.innerHTML = `${rowNum}`;

                var td1 = document.createElement('td');
                td1.classList.add("list-class");
                td1.innerHTML = stops[s];

                var td2 = document.createElement('td');
                td2.classList.add("list-class");
                var upButton = document.createElement('button');
                upButton.classList.add("list-class");
                upButton.classList.add(p_ids[s].toString());
                upButton.type = "button";
                upButton.setAttribute("onclick", "movePlaceUp(this)");
                upButton.innerHTML = "↑";
                td2.appendChild(upButton);

                var td3 = document.createElement('td');
                td3.classList.add("list-class");
                var downButton = document.createElement('button');
                downButton.classList.add("list-class");
                downButton.classList.add(p_ids[s].toString());
                downButton.type = "button";
                downButton.setAttribute("onclick", "movePlaceDown(this)");
                downButton.innerHTML = "↓";
                td3.appendChild(downButton);

                var td4 = document.createElement('td');
                td4.classList.add("list-class");
                var removeButton = document.createElement('button');
                removeButton.classList.add("list-class");
                removeButton.classList.add(p_ids[s].toString());
                removeButton.type = "button";
                removeButton.setAttribute("onclick", "removeStop(this)");
                removeButton.innerHTML = "Remove Stop";
                td4.appendChild(removeButton);

                row.appendChild(tdNum);
                row.appendChild(td1);
                row.appendChild(td2);
                row.appendChild(td3);
                row.appendChild(td4);

                table.appendChild(row);
            }
            var error = document.getElementById('admin_error_code').value;
            adminErrorPopup(error);
        }
    };
    xhttp.open('POST', '/api/get_ordered_stops', true);
    xhttp.send(JSON.stringify(data));
}

// Add new stop to the tour
function addStop(name) {
    if (document.getElementById('new_stop_popup')){
        return;
    }

    fetch(`/addStop?name=${name}`)
        .then(response => response.text())
        .then(html => {
            const temp = document.createElement('div');
            temp.innerHTML = html;

            const overlay = temp.querySelector('#new_stop_popup');
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('show'));

            document.getElementById('cancelNewPopup').addEventListener('click', closePopup);

            var data = {name: name};
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if(this.readyState === 4 && this.status === 200) {
                    var json = JSON.parse(this.responseText);
                    var places = json.places;
                    var selector = document.getElementById('location_dropdown');
                    for(p in places) {
                        var option = document.createElement('option');
                        option.value = places[p];
                        option.innerHTML = places[p];
                        selector.appendChild(option);
                    }
                }
            };
            xhttp.open('POST', '/api/get_places_on_tour', true);
            xhttp.send(JSON.stringify(data));
        });
}

function closePopup() {
    const overlay = document.getElementById('new_stop_popup');
    if (overlay) overlay.remove();
}

function adminErrorPopup(error) {
    console.log("Error popup!");
    if (document.getElementById('admin_error_popup')){
        return;
    }

    let err_msg;

    if(error == "empty_stop") {
        err_msg = "No information was entered.";
    } else if(error == "address_missing") {
        err_msg = "An address must be given for a new place.";
    } else if(error == "description_missing") {
        err_msg = "A description must be given for a new place.";
    } else if(error == "invalid_address") {
        err_msg = "The address provided was incorrect or could not be found.";
    } else if(error == "json_error") {
        err_msg = "An error occurred in retrieving address information. Please try again later.";
    } else if(error == "geolocation_error") {
        err_msg = "An error occurred with the geolocation service. Please try again later.";
    } else {
        err_msg = "An unknown error occurred.";
    }

    if(error != "none" && error != "") {
        fetch(`/adminError?err_msg=${err_msg}`)
            .then(response => response.text())
            .then(html => {
                const temp = document.createElement('div');
                temp.innerHTML = html;

                const overlay = temp.querySelector('#admin_error_popup');
                document.body.appendChild(overlay);
                requestAnimationFrame(() => overlay.classList.add('show'));

                document.getElementById('closeErrorPopup').addEventListener('click', closeError);
            });
    }
}

function closeError() {
    const overlay = document.getElementById('admin_error_popup');
    if (overlay) overlay.remove();
}

// Move place up in the order of the tour
function movePlaceUp(button) {
    console.log("Move this place up!");
    console.log(button.className);
    var name = document.getElementById('editTourName').innerHTML;
    var data = {name: name, operation: "move_up", place_id: button.className};
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if(this.readyState === 4 && this.status === 200) {
            var json = JSON.parse(this.responseText);
            if(json.result == 0) {
                console.log("Successfully moved stop!");
                getStops(name);
            }
        }
    };
    xhttp.open('POST', '/api/edit_place_on_tour', true);
    xhttp.send(JSON.stringify(data));
}

// Move place down in the order of the tour
function movePlaceDown(button) {
    console.log("Move this place down!");
    console.log(button.className);
    var name = document.getElementById('editTourName').innerHTML;
    var data = {name: name, operation: "move_down", place_id: button.className};
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if(this.readyState === 4 && this.status === 200) {
            var json = JSON.parse(this.responseText);
            if(json.result == 0) {
                console.log("Successfully moved stop!");
                getStops(name);
            }
        }
    };
    xhttp.open('POST', '/api/edit_place_on_tour', true);
    xhttp.send(JSON.stringify(data));
}

// Remove stop from the tour
function removeStop(button) {
    console.log("Remove this stop!")
    console.log(button.className);
    var name = document.getElementById('editTourName').innerHTML;
    var data = {name: name, operation: "delete", place_id: button.className};
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if(this.readyState === 4 && this.status === 200) {
            var json = JSON.parse(this.responseText);
            if(json.result == 0) {
                console.log("Successfully deleted stop!");
                getStops(name);
            }
        }
    };
    xhttp.open('POST', '/api/edit_place_on_tour', true);
    xhttp.send(JSON.stringify(data));
}

// Delete the tour from the database
function deleteTour() {
    var text = "Are you sure you want to permanently delete this tour?\nClick OK to continue with deletion.";
    if(confirm(text) == true) {
        var name = document.getElementById('editTourName').innerHTML;
        var data = {name: name};
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if(this.readyState === 4 && this.status === 200) {
                var json = JSON.parse(this.responseText);
                if(json.result == 0) {
                    console.log("Successfully deleted!");
                }
                window.location.href = "/adminedittours";
            }
        };
        xhttp.open('POST', '/api/delete_tour', true);
        xhttp.send(JSON.stringify(data));
    } else {
        console.log("Tour Deletion Successfully Cancelled.")
    }
}
