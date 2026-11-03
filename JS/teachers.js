import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    getFirestore,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const db = getFirestore(auth.app);

const teacherForm = document.getElementById("teacherForm");
const teachersTableBody = document.getElementById("teachersTableBody");
const totalTeachers = document.getElementById("totalTeachers");
const maleTeachers = document.getElementById("maleTeachers");
const femaleTeachers = document.getElementById("femaleTeachers");
const searchTeacher = document.getElementById("teacherSearch");
let message = document.getElementById("message");
if (!message && teacherForm) {
    message = document.createElement("p");
    message.id = "message";
    message.setAttribute("role", "status");
    message.style.marginTop = "12px";
    teacherForm.insertAdjacentElement("afterend", message);
}
const saveTeacherBtn = document.getElementById("saveTeacherBtn");

const teacherNameInput = document.getElementById("teacherName");
const emailInput = document.getElementById("teacherEmail");
const phoneInput = document.getElementById("teacherPhone");
const genderInput = document.getElementById("teacherGender");
const subjectInput = document.getElementById("teacherSubject");
const qualificationInput = document.getElementById("teacherQualification");
const dateEmployedInput = document.getElementById("teacherDateEmployed");

let teachers = [];

function updateTeacherCounts() {
    if (totalTeachers) {
        totalTeachers.textContent = String(teachers.length);
    }

    if (maleTeachers) {
        maleTeachers.textContent = String(
            teachers.filter((teacher) => (teacher.gender || "").trim().toLowerCase() === "male").length
        );
    }

    if (femaleTeachers) {
        femaleTeachers.textContent = String(
            teachers.filter((teacher) => (teacher.gender || "").trim().toLowerCase() === "female").length
        );
    }
}

updateTeacherCounts();

function showMessage(text, type = "success") {
    if (!message) return;

    message.textContent = text;
    message.style.display = "block";
    message.style.color = type === "success" ? "green" : "red";
}

function displayTeachers(teacherList = teachers) {
    if (!teachersTableBody) {
        console.error('Missing HTML element with id="teachersTableBody".');
        return;
    }

    teachersTableBody.replaceChildren();


    if (teacherList.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 8;
        cell.style.textAlign = "center";
        cell.style.padding = "20px";
        cell.textContent = "No teachers found.";
        row.appendChild(cell);
        teachersTableBody.appendChild(row);
        return;
    }

    for (const teacher of teacherList) {
        const row = document.createElement("tr");
        const values = [
            teacher.name,
            teacher.email,
            teacher.phone,
            teacher.gender,
            teacher.subject,
            teacher.qualification,
            teacher.dateEmployed,
            
        ];

        for (const value of values) {
            const cell = document.createElement("td");
            cell.textContent = value || "";
            row.appendChild(cell);
        }

        const actionCell = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-btn";
        deleteButton.addEventListener("click", () => deleteTeacher(teacher.id));
        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);
        teachersTableBody.appendChild(row);

        // <button
        //     type="button"
        //     class="action-btn delete-btn">
        //     Delete
        // </button>
    }
}

function applyTeacherSearch() {
    const query = searchTeacher?.value.trim().toLowerCase() || "";
    const filteredTeachers = teachers.filter((teacher) => {
        return (
            (teacher.name || "").toLowerCase().includes(query) ||
            (teacher.email || "").toLowerCase().includes(query) ||
            (teacher.subject || "").toLowerCase().includes(query) ||
            (teacher.phone || "").toLowerCase().includes(query)
        );
    });

    displayTeachers(filteredTeachers);
}

async function loadTeachers() {
    if (!teachersTableBody) return;

    try {
        const snapshot = await getDocs(collection(db, "teachers"));
        teachers = snapshot.docs.map((teacherDoc) => ({
            id: teacherDoc.id,
            ...teacherDoc.data()
        }));

        teachers.sort((a, b) => {
            const dateA = a.createdAt?.toMillis?.() || 0;
            const dateB = b.createdAt?.toMillis?.() || 0;
            return dateB - dateA;
        });

        updateTeacherCounts();
        applyTeacherSearch();
    } catch (error) {
        console.error("Error loading teachers:", error);
        showMessage(
            "Could not load teachers. Check your Firebase configuration and Firestore rules.",
            "error"
        );
    }
}

async function deleteTeacher(teacherId) {
    if (!teacherId) {
        showMessage("This teacher record has no ID and cannot be deleted.", "error");
        return;
    }

    const confirmation = await Swal.fire({
        title: "Delete teacher?",
        text: "Are you sure you want to delete this teacher?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#dc2626"
    });

    if (!confirmation.isConfirmed) return;

    try {
        await deleteDoc(doc(db, "teachers", teacherId));
        showMessage("Teacher deleted successfully.");
        await loadTeachers();
    } catch (error) {
        console.error("Error deleting teacher:", error);
        showMessage(
            error.code === "permission-denied"
                ? "Firestore denied this delete. Check your security rules."
                : "Could not delete teacher: " + (error.message || "unknown error"),
            "error"
        );
    }
}

if (searchTeacher) {
    searchTeacher.addEventListener("input", applyTeacherSearch);
}

if (teacherForm) {
    teacherForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const inputs = [
            teacherNameInput,
            emailInput,
            phoneInput,
            genderInput,
            subjectInput,
            qualificationInput,
            dateEmployedInput
        ];

        if (inputs.some((input) => !input)) {
            showMessage("One or more teacher form fields are missing from the HTML.", "error");
            return;
        }

        const teacher = {
            name: teacherNameInput.value.trim(),
            email: emailInput.value.trim(),
            phone: phoneInput.value.trim(),
            gender: genderInput.value,
            subject: subjectInput.value.trim(),
            qualification: qualificationInput.value.trim(),
            dateEmployed: dateEmployedInput.value,
            createdAt: serverTimestamp()
        };

        if (
            !teacher.name ||
            !teacher.email ||
            !teacher.phone ||
            !teacher.gender ||
            !teacher.subject ||
            !teacher.qualification ||
            !teacher.dateEmployed
        ) {
            showMessage("Please fill in all required fields.", "error");
            return;
        }

        if (saveTeacherBtn) {
            saveTeacherBtn.disabled = true;
            saveTeacherBtn.textContent = "Saving...";
        }

        try {
            const teacherRef = await addDoc(collection(db, "teachers"), teacher);
            teachers.unshift({
                id: teacherRef.id,
                ...teacher,
                createdAt: new Date()
            });
            updateTeacherCounts();
            applyTeacherSearch();
            teacherForm.reset();
            showMessage("Teacher registered successfully!");
            await loadTeachers();
        } catch (error) {
            console.error("Error registering teacher:", error);
            showMessage(
                "Registration failed: " + (error.message || "check your connection and Firestore rules."),
                "error"
            );
        } finally {
            if (saveTeacherBtn) {
                saveTeacherBtn.disabled = false;
                saveTeacherBtn.textContent = "Save Teacher";
            }
        }
    });
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    await loadTeachers();
});