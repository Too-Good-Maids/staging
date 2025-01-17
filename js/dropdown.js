document.addEventListener("DOMContentLoaded", () => {
    const dropdownButton = document.querySelector(".dropdown-button");
    const dropdownLinks = document.querySelector(".dropdown-links");

    if (dropdownButton && dropdownLinks) {
        dropdownButton.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdownLinks.classList.toggle("show");
        });

        document.addEventListener("click", () => {
            dropdownLinks.classList.remove("show");
        });
    }
});
