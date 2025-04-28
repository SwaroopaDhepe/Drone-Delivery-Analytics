document.addEventListener("DOMContentLoaded", function () {
    // Toggle between login and register forms
    function toggleForms() {
        document.getElementById("login-form").classList.toggle("hidden");
        document.getElementById("register-form").classList.toggle("hidden");
    }

    document.querySelectorAll(".toggle-btn").forEach(btn => {
        btn.addEventListener("click", toggleForms);
    });

    // Signup function - Store multiple users in JSON format
    function signup(event) {
        event.preventDefault();
        let username = document.getElementById("signup-username").value.trim();
        let email = document.getElementById("signup-email").value.trim();
        let password = document.getElementById("signup-password").value.trim();

        if (!username || !email || !password) {
            alert("Please fill in all fields.");
            return;
        }

        let users = JSON.parse(localStorage.getItem("users")) || [];

        let userExists = users.some(user => user.username === username || user.email === email);
        if (userExists) {
            alert("Username or email is already taken. Please try another.");
            return;
        }

        let newUser = { username, email, password };
        users.push(newUser);
        localStorage.setItem("users", JSON.stringify(users));

        alert("Signup successful! Please log in.");
        toggleForms();
    }

    document.querySelector("#register-form .btn").addEventListener("click", signup);

    // Login function - Validate user credentials
    function login(event) {
        event.preventDefault();
        let username = document.getElementById("login-username").value.trim();
        let password = document.getElementById("login-password").value.trim();

        let users = JSON.parse(localStorage.getItem("users")) || [];
        let validUser = users.find(user => user.username === username && user.password === password);

        if (validUser) {
            alert("Login successful!");
            window.location.href = "/dashboard/dashboard.html";
        } else {
            alert("Invalid username or password.");
        }
    }

    document.querySelector("#login-form .btn").addEventListener("click", login);
});