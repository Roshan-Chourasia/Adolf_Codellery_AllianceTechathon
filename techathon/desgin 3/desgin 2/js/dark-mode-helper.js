// Dark Mode Helper
(function() {
    // Function to enable dark mode
    function enableDarkMode() {
        document.body.classList.add("dark");
        localStorage.setItem('darkMode', 'enabled');
        
        // Also update toggle button if it exists
        const toggleBtn = document.getElementById("toggle-btn");
        if (toggleBtn) {
            toggleBtn.classList.remove("fa-moon");
            toggleBtn.classList.add("fa-sun");
        }
    }
    
    // Function to disable dark mode
    function disableDarkMode() {
        document.body.classList.remove("dark");
        localStorage.setItem('darkMode', 'disabled');
        
        // Also update toggle button if it exists
        const toggleBtn = document.getElementById("toggle-btn");
        if (toggleBtn) {
            toggleBtn.classList.remove("fa-sun");
            toggleBtn.classList.add("fa-moon");
        }
    }
    
    // Function to toggle dark mode
    function toggleDarkMode() {
        if (document.body.classList.contains("dark")) {
            disableDarkMode();
        } else {
            enableDarkMode();
        }
    }
    
    // Export functions to global scope
    window.darkModeHelper = {
        enable: enableDarkMode,
        disable: disableDarkMode,
        toggle: toggleDarkMode,
        isEnabled: function() {
            return document.body.classList.contains("dark");
        }
    };
    
    // Auto-apply dark mode if it was previously enabled
    document.addEventListener("DOMContentLoaded", function() {
        if (localStorage.getItem('darkMode') === 'enabled') {
            enableDarkMode();
        }
    });
})(); 