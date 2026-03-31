function openPopup() {
  if (document.getElementById('popupOverlay')) return;

  fetch('/popup')
    .then(response => response.text())
    .then(html => {
      const temp = document.createElement('div');
      temp.innerHTML = html;

      const overlay = temp.querySelector('#popupOverlay');
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('show'));
    });
}

function closePopup() {
  const overlay = document.getElementById('popupOverlay');
  if (overlay) overlay.remove();
}

let stars =
    document.getElementsByClassName("star");
let output =
    document.getElementById("output");

// Funtion to update rating
function rate(n) {
    remove();
    for (let i = 0; i < n; i++) {
        if (n == 1) cls = "one";
        else if (n == 2) cls = "two";
        else if (n == 3) cls = "three";
        else if (n == 4) cls = "four";
        else if (n == 5) cls = "five";
        stars[i].className = "star " + cls;
    }
    document.getElementById("ratingValue").value = n;
}
function remove() {
    let i = 0;
    while (i < 5) {
        stars[i].className = "star";
        i++;
    }
}