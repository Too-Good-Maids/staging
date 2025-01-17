document.addEventListener("DOMContentLoaded", () => {
  const dropdownButton = document.querySelector(".dropdown-button");
  const dropdownLinks = document.querySelector(".dropdown-links");

  if (dropdownButton && dropdownLinks) {
      console.log("Dropdown elements found:", dropdownButton, dropdownLinks);

      dropdownButton.addEventListener("click", (e) => {
          console.log("Dropdown button clicked");
          e.stopPropagation();
          dropdownLinks.classList.toggle("show");
          console.log("Dropdown links visibility toggled");
      });

      document.addEventListener("click", () => {
          console.log("Clicked outside dropdown, hiding dropdown");
          dropdownLinks.classList.remove("show");
      });
  } else {
      console.error("Dropdown elements not found");
  }
});
