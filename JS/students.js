import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const studentForm = document.getElementById("studentForm");
const studentsTableBody = document.getElementById("studentsTableBody");
const totalStudents = document.querySelectorAll("#totalStudents, #totalStudentsTable");
const searchStudent = document.getElementById("searchStudent");
const message = document.getElementById("message");
const saveStudentBtn = document.getElementById("saveStudentBtn");

const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const emailInput = document.getElementById("studentEmail");
const phoneInput = document.getElementById("phone");
const genderInput = document.getElementById("gender");
const classNameInput = document.getElementById("className");
const dateOfBirthInput = document.getElementById("dateOfBirth");
const admissionDateInput = document.getElementById("admissionDate");
const addressInput = document.getElementById("address");

const requiredElements = [studentsTableBody, message];

if (requiredElements.some((element) => !element)) {
    console.error("The student page is missing one or more required elements.");
} else {
    let students = [];

    function showMessage(text, type = "success") {
        message.textContent = text;
        message.style.color = type === "error" ? "red" : "green";
        message.style.display = "block";

        window.clearTimeout(showMessage.timeoutId);
        showMessage.timeoutId = window.setTimeout(() => {
            message.style.display = "none";
        }, 4000);
    }

    function displayStudents(studentList = students) {
        studentsTableBody.replaceChildren();
        totalStudents.forEach((counter) => {
            counter.textContent = String(students.length);
        });

        if (studentList.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 6;
            cell.textContent = "No students found.";
            row.appendChild(cell);
            studentsTableBody.appendChild(row);
            return;
        }

        for (const student of studentList) {
            const row = document.createElement("tr");
            const values = [
                [student.firstName, student.lastName].filter(Boolean).join(" "),
                student.email,
                student.phone,
                student.className,
                student.dateOfBirth,
                student.gender,
                student.admissionDate
            ];

            for (const value of values) {
                const cell = document.createElement("td");
                cell.textContent = value || "—";
                row.appendChild(cell);
            }

            const actionCell = document.createElement("td");
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "deleteButton";
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", () => {
                deleteStudent(student.id, [student.firstName, student.lastName].filter(Boolean).join(" "));
            });
            actionCell.appendChild(deleteButton);
            row.appendChild(actionCell);
            studentsTableBody.appendChild(row);
        }
    }

    function applyStudentSearch() {
        const searchTerm = searchStudent?.value.trim().toLowerCase() || "";
        const filteredStudents = students.filter((student) => {
            const fullName = [student.firstName, student.lastName]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return (
                fullName.includes(searchTerm) ||
                (student.email || "").toLowerCase().includes(searchTerm) ||
                (student.className || "").toLowerCase().includes(searchTerm)
            );
        });

        displayStudents(filteredStudents);
    }

    async function loadStudents() {
        studentsTableBody.innerHTML = `
    <tr>
        <td colspan="8">Loading students...</td>
    </tr>
`;
        try {
            const snapshot = await getDocs(collection(db, "students"));
            students = snapshot.docs.map((studentDoc) => ({
                id: studentDoc.id,
                ...studentDoc.data()
            }));

            students.sort((a, b) => {
                const dateA = a.createdAt?.toMillis?.() || 0;
                const dateB = b.createdAt?.toMillis?.() || 0;
                return dateB - dateA;
            });

            applyStudentSearch();
        } catch (error) {
            console.error("Loading students failed:", error);
            showMessage(
                "Unable to load students. Check your Firebase Firestore rules.",
                "error"
            );
        }
    }

    async function deleteStudent(studentId, studentName) {
        if (!studentId) {
            showMessage("This student record has no ID and cannot be deleted.", "error");
            return;
        }

        const confirmation = await Swal.fire({
            title: "Delete student?",
            text: `Are you sure you want to delete ${studentName || "this student"}?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Delete",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#dc2626"
        });

        if (!confirmation.isConfirmed) return;

        try {
            await deleteDoc(doc(db, "students", studentId));
            showMessage("Student deleted successfully!");
            await loadStudents();
        } catch (error) {
            console.error("Deleting student failed:", error);
            showMessage(
                error.code === "permission-denied"
                    ? "Firestore denied this delete. Check your security rules."
                    : "Delete failed: " + (error.message || "unknown error"),
                "error"
            );
        }
    }

    if (studentForm && saveStudentBtn && [firstNameInput, lastNameInput, emailInput, phoneInput, genderInput, classNameInput, dateOfBirthInput, admissionDateInput, addressInput].every(Boolean)) {
    studentForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const student = {
            firstName: firstNameInput.value.trim(),
            lastName: lastNameInput.value.trim(),
            email: emailInput.value.trim(),
            phone: phoneInput.value.trim(),
            gender: genderInput.value,
            className: classNameInput.value.trim(),
            dateOfBirth: dateOfBirthInput.value,
            admissionDate: admissionDateInput.value,
            address: addressInput.value.trim(),
            createdAt: serverTimestamp()
        };

        if (!student.firstName || !student.lastName || !student.className) {
            showMessage("Please fill in the required student details.", "error");
            return;
        }

        saveStudentBtn.disabled = true;
        saveStudentBtn.textContent = "Saving...";

        try {
            await addDoc(collection(db, "students"), student);
            showMessage("Student registered successfully!");
            studentForm.reset();
            await loadStudents();
        } catch (error) {
            console.error("Student registration error:", error);
            showMessage(
                "Could not register the student. Check your Firebase setup and permissions.",
                "error"
            );
        } finally {
            saveStudentBtn.disabled = false;
            saveStudentBtn.textContent = "Save Student";
        }
    });
    } else if (studentForm || saveStudentBtn) {
        console.error("The student form is missing one or more required fields.");
    }

    searchStudent?.addEventListener("input", applyStudentSearch);

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        await loadStudents();
    });

    displayStudents(students);
}
