function openNav() {
  document.getElementById("Sidebar").style.width = "250px";
  document.getElementById("main").style.marginRight = "250px";
}

function closeNav() {
  document.getElementById("Sidebar").style.width = "0";
  document.getElementById("main").style.marginRight= "0";
}

window.addEventListener('scroll', () => {
  const footer = document.querySelector('footer');
  const scrolledToBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 10;

  if (scrolledToBottom) {
    footer.style.display = 'block';
  } else {
    footer.style.display = 'none';
  }
});