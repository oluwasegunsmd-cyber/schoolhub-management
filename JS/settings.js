
import { auth, db } from "./firebase.js";

import {
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
    onAuthStateChanged,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

const schoolName = document.getElementById("schoolName");
const schoolEmail = document.getElementById("schoolEmail");
const schoolPhone = document.getElementById("schoolPhone");
const schoolAddress = document.getElementById("schoolAddress");

const adminName = document.getElementById("adminName");
const adminEmail = document.getElementById("adminEmail");

const themeSelect = document.getElementById("theme");

const settingsRef = doc(db, "settings", "school");

function showAlert(icon, title, text) {
    return Swal.fire({
        icon,
        title,
        text,
        confirmButtonText: "OK"
    });
}

async function loadSettings() {
    try {
        const snapshot = await getDoc(settingsRef);

        if (snapshot.exists()) {
            const data = snapshot.data();

            if (schoolName) schoolName.value = data.schoolName || "";
            if (schoolEmail) schoolEmail.value = data.schoolEmail || "";
            if (schoolPhone) schoolPhone.value = data.schoolPhone || "";
            if (schoolAddress) schoolAddress.value = data.schoolAddress || "";
            if (adminName && data.adminName !== undefined) {
                adminName.value = data.adminName;
            }
        }
    } catch (error) {
        console.error("Error loading school settings:", error);
        showAlert(
            "error",
            "School Information Unavailable",
            "Could not load saved school information. Check your Firestore permissions. Local preferences are still available."
        );
    }

    const currentUser = auth.currentUser;
    if (adminEmail && currentUser) {
        adminEmail.value = currentUser.email || "";
    }

    const savedTheme = localStorage.getItem("schoolhubTheme") || "light";
    if (themeSelect) themeSelect.value = savedTheme;
    applyTheme(savedTheme);
    loadNotificationPreferences();
}

async function saveSchoolSettings() {
    const schoolData = {
        schoolName: schoolName?.value.trim() || "",
        schoolEmail: schoolEmail?.value.trim() || "",
        schoolPhone: schoolPhone?.value.trim() || "",
        schoolAddress: schoolAddress?.value.trim() || "",
        updatedAt: new Date().toISOString()
    };

    if (!schoolData.schoolName) {
        showAlert(
            "warning",
            "School Name Required",
            "Please enter your school's name."
        );

        return;
    }

    try {
        Swal.fire({
            title: "Saving Settings...",
            text: "Please wait.",
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => Swal.showLoading()
        });

        await setDoc(
            settingsRef,
            schoolData,
            { merge: true }
        );

        await showAlert(
            "success",
            "Settings Saved!",
            "Your school information has been saved successfully."
        );

    } catch (error) {
        console.error("Error saving school settings:", error);

        showAlert(
            "error",
            "Save Failed",
            "Unable to save your school information. Check your Firebase connection and permissions."
        );
    }
}

async function saveAdminSettings() {
    const name = adminName?.value.trim() || "";

    if (!name) {
        showAlert(
            "warning",
            "Name Required",
            "Please enter the administrator's name."
        );

        return;
    }

    try {
        Swal.fire({
            title: "Saving Profile...",
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => Swal.showLoading()
        });

        await setDoc(
            settingsRef,
            {
                adminName: name,
                updatedAt: new Date().toISOString()
            },
            { merge: true }
        );

        await showAlert(
            "success",
            "Profile Saved!",
            "Administrator information has been saved."
        );

    } catch (error) {
        console.error("Error saving administrator profile:", error);

        showAlert(
            "error",
            "Save Failed",
            "Unable to save the administrator profile."
        );
    }
}
const schoolForm = document.getElementById("schoolForm");
const adminForm = document.getElementById("adminForm");

if (schoolForm) {
    schoolForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await saveSchoolSettings();
    });
}

if (adminForm) {
    adminForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await saveAdminSettings();
    });
}

if (!schoolForm || !adminForm) {
    const primaryButtons = document.querySelectorAll(".btn-primary");

    primaryButtons.forEach((button) => {
        button.addEventListener("click", async (event) => {
            const schoolSection = schoolName?.closest("section");
            const adminSection = adminName?.closest("section");

            if (
                !schoolForm &&
                schoolSection?.contains(button)
            ) {
                event.preventDefault();
                await saveSchoolSettings();
            } else if (
                !adminForm &&
                adminSection?.contains(button)
            ) {
                event.preventDefault();
                await saveAdminSettings();
            }
        });
    });
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark-mode', theme === 'dark');

    document.body.classList.toggle(
        "dark-mode",
        theme === "dark"
    );

    localStorage.setItem("schoolhubTheme", theme);
}

if (themeSelect) {
    themeSelect.addEventListener("change", async () => {
        const selectedTheme = themeSelect.value;

        if (!["light", "dark"].includes(selectedTheme)) {
            return;
        }

        applyTheme(selectedTheme);

        await showAlert(
            "success",
            "Theme Updated!",
            `Your theme has been changed to ${selectedTheme} mode.`
        );
    });
}

function loadNotificationPreferences() {
    const savedPreferences = JSON.parse(
        localStorage.getItem("schoolhubNotifications") || "{}"
    );

    document.querySelectorAll(".toggle input").forEach((toggle, index) => {
        const key = toggle.id || `notification${index}`;

        if (savedPreferences[key] !== undefined) {
            toggle.checked = savedPreferences[key];
        }
    });
}

function saveNotificationPreferences() {
    const preferences = {};

    document.querySelectorAll(".toggle input").forEach((toggle, index) => {
        const key = toggle.id || `notification${index}`;

        preferences[key] = toggle.checked;
    });

    localStorage.setItem(
        "schoolhubNotifications",
        JSON.stringify(preferences)
    );
}

document.querySelectorAll(".toggle input").forEach((toggle) => {
    toggle.addEventListener("change", () => {
        saveNotificationPreferences();
    });
});

async function resetAdminPassword() {
    const currentUser = auth.currentUser;

    if (!currentUser || !currentUser.email) {
        await showAlert(
            "warning",
            "Not Signed In",
            "Please sign in before requesting a password reset."
        );

        return;
    }

    const result = await Swal.fire({
        title: "Reset Password?",
        text: `We'll send a password reset email to ${currentUser.email}.`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Send Email",
        cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) {
        return;
    }

    try {
        await sendPasswordResetEmail(auth, currentUser.email);

        await showAlert(
            "success",
            "Email Sent!",
            "Check your inbox for the password reset instructions."
        );

    } catch (error) {
        console.error("Password reset error:", error);

        await showAlert(
            "error",
            "Request Failed",
            "We couldn't send the reset email. Please try again."
        );
    }
}
const passwordResetButton = document.getElementById(
    "resetPasswordBtn"
);

if (passwordResetButton) {
    passwordResetButton.addEventListener(
        "click",
        resetAdminPassword
    );
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    await loadSettings();
});

