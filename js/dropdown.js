document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".dropdown-button").forEach((button, index) => {
        const links = button.parentElement.querySelector(".dropdown-links");
        if (!links) return;
        links.id ||= `more-options-${index}`;
        button.setAttribute("aria-controls", links.id);
        const setOpen = (open, returnFocus = false) => {
            links.classList.toggle("show", open);
            button.setAttribute("aria-expanded", String(open));
            if (returnFocus) button.focus();
        };
        setOpen(false);
        button.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") event.stopPropagation();
        });
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            setOpen(button.getAttribute("aria-expanded") !== "true");
        });
        document.addEventListener("click", (event) => {
            if (!links.contains(event.target)) setOpen(false);
        });
        button.parentElement.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
                event.preventDefault();
                event.stopImmediatePropagation();
                setOpen(false, true);
            }
        }, true);
    });
});

// Webflow owns accordion activation; mirror its expanded state to prevent
// clipped answers from receiving focus or appearing in accessibility navigation.
window.Webflow = window.Webflow || [];
window.Webflow.push(() => {
    document.querySelectorAll(".accordion-item").forEach((item) => {
        const toggle = item.querySelector(".accordion-toggle");
        const answer = item.querySelector(".accordion-list");
        if (!toggle || !answer) return;
        const sync = () => {
            const open = toggle.getAttribute("aria-expanded") === "true";
            if (!open && answer.contains(document.activeElement)) toggle.focus();
            answer.hidden = !open;
            answer.inert = !open;
        };
        new MutationObserver(sync).observe(toggle, { attributes: true, attributeFilter: ["aria-expanded"] });
        sync();
    });
});
