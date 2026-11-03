import { auth } from "./firebase.js";
import {
    browserLocalPersistence,
    browserSessionPersistence,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    setPersistence,
    signInWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const fullName = document.getElementById("fullName").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        const message = document.getElementById("message");
        const button = document.getElementById("registerBtn");

        if (password !== confirmPassword) {
            message.textContent = "Passwords do not match.";
            message.style.color = "red";
            return;
        }

        button.disabled = true;
        button.textContent = "Creating Account...";
        try {
            const credential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(credential.user, { displayName: fullName });
            message.textContent = "Account created successfully!";
            message.style.color = "green";
            registerForm.reset();
        } catch (error) {
            console.error("Registration error:", error);
            message.textContent = error.message || "Registration failed. Please try again.";
            message.style.color = "red";
        } finally {
            button.disabled = false;
            button.textContent = "Create Account";
        }
    });
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const message = document.getElementById("message");
        const button = document.getElementById("loginBtn");

        button.disabled = true;
        button.textContent = "Signing In...";
        try {
            const remember = document.getElementById("remember").checked;
            await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
            await signInWithEmailAndPassword(auth, email, password);
            await Swal.fire({
                icon: "success",
                title: "Login successful",
                text: "Redirecting to your dashboard...",
                timer: 1000,
                showConfirmButton: false
            });
            window.setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1000);
        } catch (error) {
            console.error("Login error:", error);
            await Swal.fire({
                icon: "error",
                title: "Login failed",
                text: error.message || "Please check your email and password and try again."
            });
        } finally {
            button.disabled = false;
            button.textContent = "Login";
        } 
    });
}

const forgotPassword = document.getElementById("forgotPassword");
if (forgotPassword) {
    forgotPassword.addEventListener("click", async (event) => {
        event.preventDefault();
        const email = document.getElementById("email").value.trim();
        const message = document.getElementById("message");
        if (!email) {
            message.textContent = "Enter your email address first.";
            message.style.color = "red";
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            message.textContent = "Password reset email sent.";
            message.style.color = "green";
        } catch (error) {
            console.error("Password reset error:", error);
            message.textContent = error.message || "Could not send the reset email.";
            message.style.color = "red";
        }
    });
}

