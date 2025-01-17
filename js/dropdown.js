document.addEventListener("DOMContentLoaded", () => {
    const dropdownButton = document.querySelector(".dropdown-button");
    const dropdownLinks = document.querySelector(".dropdown-links");
  
    dropdownButton.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdownLinks.style.display =
        dropdownLinks.style.display === "block" ? "none" : "block";
    });
  
    dropdownButton.addEventListener("click", () => {
      dropdownLinks.classList.toggle("show");
    });
  
    dropdownButton.addEventListener("click", () => {
      dropdownLinks.classList.remove("show");
    });
  });