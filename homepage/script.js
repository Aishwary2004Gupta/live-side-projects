const hamburger = document.querySelector(".hamburger");
const NavMenu = document.querySelector(".nav-menu");

hamburger.addEventListener("click", () => {
	hamburger.classList.toggle("active");
	NavMenu.classList.toggle("active");
})

document.querySelectorAll(".nav-link").forEach(n => n.addEventListener("click", () => {
	hamburger.classList.remove("active");
	NavMenu.classList.remove("active");
}))