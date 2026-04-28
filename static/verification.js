window.onload = function(){
    var button = document.getElementById('loginbutton');
    window.addEventListener("keyup", function (event) {
        if (event.keyCode == 13) {
            button.click();
        }
    });
};

function go(texts){
    if(texts == "success"){
        window.location = '/adminhome';
    }
    else{
        document.getElementById('error').innerHTML = texts;
        document.getElementById('username').value = "";
        document.getElementById('password').value = "";
    }
}

function login(){
    document.getElementById('error').innerHTML = "";
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function(){
        if(this.readyState === 4 && this.status === 200){
            var json = JSON.parse(this.responseText);
            var texts = json['texts'];
            go(texts);
        }
    };
    var data = {username: username, password: password};
    xhttp.open("POST", '/api/login');
    xhttp.send(JSON.stringify(data));
}