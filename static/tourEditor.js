
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
}

// Add new stop to the tour
function addStop(name) {
    console.log("Add stop!");
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

            console.log("Loading places on tour");
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
                window.location.href = "/edittours";
            }
        };
        xhttp.open('POST', '/api/delete_tour', true);
        xhttp.send(JSON.stringify(data));
    } else {
        console.log("Tour Deletion Successfully Cancelled.")
    }
}
