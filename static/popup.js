export function openPopup(tour_id) {
  if (document.getElementById('popupOverlay')){
    return;
  }

  fetch(`/popup?tour_id=${tour_id}`)
    .then(response => response.text())
    .then(html => {
      const temp = document.createElement('div');
      temp.innerHTML = html;

      const overlay = temp.querySelector('#popupOverlay');
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('show'));

      const stars = document.getElementsByClassName("star");

      document.getElementById('closePopup').addEventListener('click', closePopup);

      document.querySelectorAll('.star').forEach((star, index) => {
        star.addEventListener('click', () => rate(index + 1, stars));

      });
    });
}

export function closePopup() {
  const overlay = document.getElementById('popupOverlay');
  if (overlay) overlay.remove();
}

function remove(stars) {
  for (let i = 0; i < 5; i++) {
    stars[i].className = "star";
  }
}

function rate(n, stars) {
  remove(stars);
  let cls;
  if (n == 1) cls = "one";
  else if (n == 2) cls = "two";
  else if (n == 3) cls = "three";
  else if (n == 4) cls = "four";
  else if (n == 5) cls = "five";

  for (let i = 0; i < n; i++) {
    stars[i].className = "star " + cls;
  }

  document.getElementById("ratingValue").value = n;
}