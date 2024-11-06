document.addEventListener("DOMContentLoaded", () => {
    let slideIndex = 0;
    let slides = document.getElementsByClassName("landing-home-pages-wrapper");
    let autoSlideInterval;
  
    // Function to show the current slide based on slideIndex
    function showSlide(n) {
      // Hide all slides
      for (let slide of slides) {
        slide.classList.remove('active');
      }
      // Show the current slide
      slideIndex = (n + slides.length) % slides.length;
      slides[slideIndex].classList.add('active');
    }
  
    // Function to handle manual slide change
    function changeSlide(n) {
      stopAutoSlide(); // Stop auto-slide when manually changing slides
      showSlide(slideIndex + n);
      startAutoSlide(); // Restart auto-slide after manual interaction
    }
  
    // Auto-slide functionality
    function startAutoSlide() {
      autoSlideInterval = setInterval(() => {
        showSlide(slideIndex + 1);
      }, 10000); // Change slide every 10 seconds
    }
  
    function stopAutoSlide() {
      clearInterval(autoSlideInterval);
    }
  
    // Event listeners for next and previous buttons
    document.querySelector(".prev").addEventListener("click", () => changeSlide(-1));
    document.querySelector(".next").addEventListener("click", () => changeSlide(1));
  
    // Optional: Pause auto-slide on hover
    document.querySelector(".slideshow-container").addEventListener("mouseenter", stopAutoSlide);
    document.querySelector(".slideshow-container").addEventListener("mouseleave", startAutoSlide);
  
    // Start the slideshow
    showSlide(slideIndex);
    startAutoSlide();
  });
  
    
  
  