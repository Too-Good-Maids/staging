document.addEventListener("DOMContentLoaded", () => {
  const dropdownButton = document.querySelector(".dropdown-button");
  const dropdownLinks = document.querySelector(".dropdown-links");

  if (dropdownButton && dropdownLinks) {
      dropdownButton.addEventListener("click", (e) => {
          e.stopPropagation(); // Prevent click event from bubbling
          dropdownLinks.classList.toggle("show");
      });

      // Close dropdown if clicking outside
      document.addEventListener("click", () => {
          dropdownLinks.classList.remove("show");
      });
  }
});
