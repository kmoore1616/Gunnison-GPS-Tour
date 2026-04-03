
window.onload = function() {
    var name = document.getElementById('editTourName').innerHTML;
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

function movePlaceUp() {
    console.log("Move this place up!");
}

function movePlaceDown() {
    console.log("Move this place down!");
}

function removeStop() {
    console.log("Remove this stop!")
}

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
