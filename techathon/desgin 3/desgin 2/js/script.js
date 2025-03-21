document.addEventListener("DOMContentLoaded", () => {
   // Check if dark mode was previously enabled
   const darkModeEnabled = localStorage.getItem('darkMode') === 'enabled';
   
   // Apply dark mode if it was enabled
   if (darkModeEnabled) {
      document.body.classList.add("dark");
   }
   
   let toggleBtn = document.getElementById("toggle-btn");
   if (toggleBtn) {
      // Set initial toggle button state
      if (darkModeEnabled) {
         toggleBtn.classList.remove("fa-moon");
         toggleBtn.classList.add("fa-sun");
      } else {
         toggleBtn.classList.remove("fa-sun");
         toggleBtn.classList.add("fa-moon");
      }
      
      toggleBtn.onclick = () => {
         toggleBtn.classList.toggle("fa-sun");
         toggleBtn.classList.toggle("fa-moon");
         document.body.classList.toggle("dark");
         
         // Save preference to localStorage
         if (document.body.classList.contains("dark")) {
            localStorage.setItem('darkMode', 'enabled');
         } else {
            localStorage.setItem('darkMode', 'disabled');
         }
      };
   }

   let profile = document.querySelector(".header .flex .profile");
   if (profile) {
      document.querySelector("#user-btn").onclick = () => {
         profile.classList.toggle("active");
         searchForm.classList.remove("active");
      };
   }

   let searchForm = document.querySelector(".header .flex .search-form");
   if (searchForm) {
      document.querySelector("#search-btn").onclick = () => {
         searchForm.classList.toggle("active");
         profile.classList.remove("active");
      };
   }

   let sideBar = document.querySelector(".side-bar");
   if (sideBar) {
      document.querySelector("#menu-btn").onclick = () => {
         sideBar.classList.toggle("active");
         document.body.classList.toggle("active");
      };
   }

   let closeBtn = document.querySelector("#close-btn");
   if (closeBtn) {
      closeBtn.onclick = () => {
         sideBar.classList.remove("active");
         document.body.classList.remove("active");
      };
   }

   window.onscroll = () => {
      if (profile) profile.classList.remove("active");
      if (searchForm) searchForm.classList.remove("active");
      if (sideBar) {
         sideBar.classList.remove("active");
         document.body.classList.remove("active");
      }
   };

   console.log("✅ script.js is loading!");

   // ✅ Register Form Handling
   const registerForm = document.getElementById("register-form");
   const tutorRegisterForm = document.getElementById("tutor-register-form");

   if (tutorRegisterForm) {
       console.log("✅ tutor-register-form detected, processing submission...");
       const availabilityContainer = document.getElementById('availability-container');
       const addAvailabilityBtn = document.getElementById('add-availability');

       // Add new availability slot
       addAvailabilityBtn.addEventListener('click', () => {
           const newEntry = document.createElement('div');
           newEntry.className = 'availability-entry';
           newEntry.innerHTML = `
               <select name="day" required>
                   <option value="">Select Day</option>
                   <option value="Monday">Monday</option>
                   <option value="Tuesday">Tuesday</option>
                   <option value="Wednesday">Wednesday</option>
                   <option value="Thursday">Thursday</option>
                   <option value="Friday">Friday</option>
                   <option value="Saturday">Saturday</option>
                   <option value="Sunday">Sunday</option>
               </select>
               <input type="time" name="startTime" required>
               <input type="time" name="endTime" required>
               <button type="button" class="remove-availability">Remove</button>
           `;
           availabilityContainer.appendChild(newEntry);
       });

       // Remove availability slot
       availabilityContainer.addEventListener('click', (e) => {
           if (e.target.classList.contains('remove-availability')) {
               e.target.parentElement.remove();
           }
       });

       tutorRegisterForm.addEventListener('submit', async (e) => {
           e.preventDefault();

           // Get form data
           const formDataObj = new FormData(tutorRegisterForm);
           
           // Validate password length
           const password = formDataObj.get('password');
           if (!password || password.length < 6) {
               alert('Password must be at least 6 characters long');
               return;
           }

           // Validate password confirmation
           const confirmPassword = formDataObj.get('confirm-password');
           if (!confirmPassword || password !== confirmPassword) {
               alert('Passwords do not match');
               return;
           }

           // Validate other required fields
           const name = formDataObj.get('name');
           const email = formDataObj.get('email');
           const subjects = formDataObj.get('subjects');
           const experience = formDataObj.get('experience');
           const education = formDataObj.get('education');
           const hourlyRate = formDataObj.get('hourlyRate');
           const bio = formDataObj.get('bio');

           if (!name || !email || !subjects || !experience || !education || !hourlyRate || !bio) {
               alert('Please fill in all required fields');
               return;
           }

           const availability = [];
           const entries = availabilityContainer.querySelectorAll('.availability-entry');

           entries.forEach(entry => {
               const day = entry.querySelector('select[name="day"]').value;
               const startTime = entry.querySelector('input[name="startTime"]').value;
               const endTime = entry.querySelector('input[name="endTime"]').value;

               if (!day || !startTime || !endTime) {
                   alert('Please fill in all availability fields');
                   return;
               }

               availability.push({
                   day,
                   startTime,
                   endTime
               });
           });

           if (availability.length === 0) {
               alert('Please add at least one availability slot');
               return;
           }

           const tutorData = {
               name: name.trim(),
               email: email.trim(),
               password: password,
               role: 'tutor',
               subjects: subjects.split(',').map(s => s.trim()),
               experience: parseInt(experience),
               education: education.trim(),
               hourlyRate: parseFloat(hourlyRate),
               bio: bio.trim(),
               availability
           };

           try {
               const response = await fetch('http://localhost:5001/api/auth/register', {
                   method: 'POST',
                   headers: {
                       'Content-Type': 'application/json'
                   },
                   body: JSON.stringify(tutorData)
               });

               const data = await response.json();

               if (response.ok) {
                   alert('Registration successful! Please login.');
                   window.location.href = 'login.html';
               } else {
                   alert(data.msg || data.error || 'Registration failed');
               }
           } catch (error) {
               console.error('Registration error:', error);
               alert('Registration failed. Please try again.');
           }
       });
   } else if (registerForm) {
       console.log("✅ register-form detected, processing submission...");

       registerForm.addEventListener("submit", async (event) => {
           event.preventDefault(); // Prevent page reload

           // Get input values
           const name = document.getElementById("name")?.value.trim();
           const email = document.getElementById("email")?.value.trim();
           const password = document.getElementById("password")?.value.trim();
           const confirmPassword = document.getElementById("confirm-password")?.value.trim();

           console.log("Form Data:", { name, email, password, confirmPassword });

           // ✅ 1. Validate Fields
           if (!name || !email || !password || !confirmPassword) {
               alert("All fields are required!");
               return;
           }

           // ✅ 2. Ensure Passwords Match
           if (password !== confirmPassword) {
               alert("Passwords do not match!");
               return;
           }

           // ✅ 3. Send Data as JSON
           const formData = { name, email, password };

           try {
               // ✅ 4. Send Data to Backend
               const response = await fetch("http://localhost:5001/api/auth/register", {
                   method: "POST",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify(formData)
               });

               const data = await response.json();
               console.log("Server Response:", data);

               // ✅ 5. Handle Response
               if (response.ok) {
                   alert("Registration Successful!");
                   window.location.href = "login.html"; // Redirect to login page
               } else {
                   alert("Error: " + (data.msg || "Registration failed!"));
               }
           } catch (error) {
               console.error("Registration error:", error);
               alert("Something went wrong! Try again.");
           }
       });
   } else {
       console.error("⚠️ register-form not found! Check if it's in register.html");
       console.log("Available elements:", document.body.innerHTML);
   }

   // ✅ Login Form Handling
   const loginForm = document.getElementById("login-form");
   if (loginForm) {
       console.log("✅ login-form detected, processing submission...");

       loginForm.addEventListener("submit", async (event) => {
           event.preventDefault(); // Prevent page reload

           // Get input values
           const email = document.getElementById("email")?.value.trim();
           const password = document.getElementById("password")?.value.trim();
           const role = document.getElementById("role")?.value;

           console.log("Login Form Data:", { email, password, role });

           // Validate Fields
           if (!email || !password || !role) {
               alert("All fields are required!");
               return;
           }

           try {
               // Send Data to Backend
               const response = await fetch("http://localhost:5001/api/auth/login", {
                   method: "POST",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({ email, password, role })
               });

               const data = await response.json();
               console.log("Login Response:", data);

               // Handle Response
               if (response.ok) {
                   console.log("Login successful, saving token:", data.token);
                   localStorage.setItem("token", data.token);
                   localStorage.setItem("user", JSON.stringify(data.user));
                   
                   // Redirect based on role
                   if (role === "tutor") {
                       console.log("Redirecting to tutor dashboard...");
                       window.location.href = "tutor-dashboard.html";
                   } else {
                       console.log("Redirecting to profile page...");
                       window.location.href = "profile.html";
                   }
               } else {
                   console.error("Login failed:", data.msg);
                   alert(data.msg || "Login failed!");
               }
           } catch (error) {
               console.error("Login error:", error);
               alert("Something went wrong! Try again.");
           }
       });
   } else {
       console.error("⚠️ login-form not found! Check if it's in login.html");
       console.log("Available elements:", document.body.innerHTML);
   }

   // Profile Update Functionality
   const updateProfileForm = document.getElementById("update-profile-form");
   if (updateProfileForm) {
       console.log("✅ update-profile-form detected, processing submission...");

       // Load current user data
       const loadUserProfile = async () => {
           try {
               const token = localStorage.getItem("token");
               console.log("Current token from localStorage:", token);
               
               if (!token) {
                   console.log("No token found, redirecting to login");
                   window.location.href = "login.html";
                   return;
               }

               console.log("Loading profile with token:", token);
               const response = await fetch("http://localhost:5001/api/user/profile", {
                   method: "GET",
                   headers: {
                       "Authorization": `Bearer ${token}`,
                       "Content-Type": "application/json"
                   }
               });

               console.log("Profile response status:", response.status);
               
               if (response.ok) {
                   const data = await response.json();
                   console.log("Profile data received:", data);
                   
                   // Update form fields
                   const nameInput = document.getElementById("name");
                   const emailInput = document.getElementById("email");
                   const roleInput = document.getElementById("role");
                   
                   if (nameInput) nameInput.value = data.user.name;
                   if (emailInput) emailInput.value = data.user.email;
                   if (roleInput) roleInput.value = data.user.role;
                   
                   // Update name in header profile
                   const headerName = document.querySelector(".header .flex .profile .name");
                   if (headerName) headerName.textContent = data.user.name;
                   
                   // Update name in sidebar profile
                   const sidebarName = document.querySelector(".side-bar .profile .name");
                   if (sidebarName) sidebarName.textContent = data.user.name;
                   
                   // Update role in both header and sidebar
                   const headerRole = document.querySelector(".header .flex .profile .role");
                   const sidebarRole = document.querySelector(".side-bar .profile .role");
                   if (headerRole) headerRole.textContent = data.user.role;
                   if (sidebarRole) sidebarRole.textContent = data.user.role;

                   // Update profile picture if available
                   const profileImages = document.querySelectorAll(".profile .image");
                   profileImages.forEach(img => {
                       if (data.user.profilePicture) {
                           img.src = data.user.profilePicture;
                       }
                   });
               } else {
                   const errorData = await response.json();
                   console.error("Profile load error:", errorData);
                   throw new Error(errorData.msg || "Failed to load profile");
               }
           } catch (error) {
               console.error("Error loading profile:", error);
               alert(error.message || "Failed to load profile data");
               // If unauthorized, redirect to login
               if (error.message.includes("unauthorized") || error.message.includes("invalid")) {
                   localStorage.removeItem("token");
                   localStorage.removeItem("user");
                   window.location.href = "login.html";
               }
           }
       };

       // Load profile data when page loads
       loadUserProfile();

       // Handle form submission
       updateProfileForm.addEventListener("submit", async (event) => {
           event.preventDefault();

           const name = document.getElementById("name").value.trim();
           const token = localStorage.getItem("token");

           if (!token) {
               window.location.href = "login.html";
               return;
           }

           try {
               console.log("Updating profile with name:", name);
               const response = await fetch("http://localhost:5001/api/user/profile", {
                   method: "PATCH",
                   headers: {
                       "Content-Type": "application/json",
                       "Authorization": `Bearer ${token}`
                   },
                   body: JSON.stringify({ name })
               });

               const data = await response.json();
               console.log("Update response:", data);

               if (response.ok) {
                   alert("Profile updated successfully!");
                   
                   // Update name in header profile
                   const headerName = document.querySelector(".header .flex .profile .name");
                   if (headerName) headerName.textContent = name;
                   
                   // Update name in sidebar profile
                   const sidebarName = document.querySelector(".side-bar .profile .name");
                   if (sidebarName) sidebarName.textContent = name;
                   
                   // Update role in both header and sidebar
                   const headerRole = document.querySelector(".header .flex .profile .role");
                   const sidebarRole = document.querySelector(".side-bar .profile .role");
                   if (headerRole) headerRole.textContent = data.user.role;
                   if (sidebarRole) sidebarRole.textContent = data.user.role;
               } else {
                   throw new Error(data.msg || "Failed to update profile");
               }
           } catch (error) {
               console.error("Error updating profile:", error);
               alert(error.message || "Failed to update profile");
               // If unauthorized, redirect to login
               if (error.message.includes("unauthorized") || error.message.includes("invalid")) {
                   localStorage.removeItem("token");
                   localStorage.removeItem("user");
                   window.location.href = "login.html";
               }
           }
       });
   }

   // Function to save session data
   async function saveSessionData(sessionData) {
       try {
           const token = localStorage.getItem("token");
           if (!token) {
               console.error("No token found");
               return;
           }

           const response = await fetch("http://localhost:5001/api/session/save", {
               method: "POST",
               headers: {
                   "Content-Type": "application/json",
                   "Authorization": `Bearer ${token}`
               },
               body: JSON.stringify(sessionData)
           });

           if (!response.ok) {
               throw new Error("Failed to save session data");
           }

           const data = await response.json();
           console.log("Session data saved:", data);
       } catch (error) {
           console.error("Error saving session data:", error);
       }
   }

   // Function to load session data
   async function loadSessionData() {
       try {
           const token = localStorage.getItem("token");
           if (!token) {
               console.error("No token found");
               return null;
           }

           const response = await fetch("http://localhost:5001/api/session/load", {
               headers: {
                   "Authorization": `Bearer ${token}`
               }
           });

           if (!response.ok) {
               throw new Error("Failed to load session data");
           }

           const data = await response.json();
           console.log("Session data loaded:", data);
           return data.sessionData;
       } catch (error) {
           console.error("Error loading session data:", error);
           return null;
       }
   }

   // Example usage:
   // Save session data when user makes progress
   function updateProgress(progress) {
       const sessionData = {
           progress: progress,
           lastUpdated: new Date().toISOString()
       };
       saveSessionData(sessionData);
   }

   // Load session data when user logs in
   async function initializeUserSession() {
       const sessionData = await loadSessionData();
       if (sessionData) {
           // Restore user's progress and state
           console.log("Restoring user session:", sessionData);
           // Add your code here to restore the user's state based on sessionData
       }
   }
});
