import { auth, db } from "./firebase.js";

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";


// ========================================
// HTML ELEMENTS
// ========================================

const classForm = document.getElementById("classForm");
const classNameInput = document.getElementById("className");
const classLevelInput = document.getElementById("classLevel");
const classTeacherInput = document.getElementById("classTeacher");
const academicSessionInput = document.getElementById("academicSession");

const classesTableBody = document.getElementById("classesTableBody");
const classSearch = document.getElementById("classSearch");
const totalClassesCounter = document.getElementById("totalClasses");
const totalStudentsCounter = document.getElementById("classPageTotalStudents");
const totalTeachersCounter = document.getElementById("classPageTotalTeachers");


// ========================================
// VARIABLES
// ========================================

let classes = [];


// ========================================
// LOAD TEACHERS INTO THE SELECT MENU
// ========================================

async function loadTeachers() {
    try {
        const snapshot = await getDocs(collection(db, "teachers"));

        const currentValue = classTeacherInput.value;

        classTeacherInput.innerHTML =
            '<option value="">Select class teacher</option>';

        snapshot.forEach((teacherDoc) => {
            const teacher = teacherDoc.data();

            const option = document.createElement("option");

            option.value = teacherDoc.id;

            option.textContent =
                `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim() ||
                teacher.name ||
                teacher.email ||
                "Unnamed Teacher";

            classTeacherInput.appendChild(option);
        });

        // Restore selection if the teacher still exists.
        if (
            currentValue &&
            [...classTeacherInput.options].some(
                option => option.value === currentValue
            )
        ) {
            classTeacherInput.value = currentValue;
        }

    } catch (error) {
        console.error("Error loading teachers:", error);
    }
}


// ========================================
// DISPLAY CLASSES
// ========================================

function displayClasses(classList = classes) {
    classesTableBody.innerHTML = "";

    if (classList.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 7;
        cell.textContent = "No classes found.";
        cell.style.textAlign = "center";
        cell.style.padding = "20px";

        row.appendChild(cell);
        classesTableBody.appendChild(row);

        return;
    }

    classList.forEach((schoolClass, index) => {
        const row = document.createElement("tr");

        const levelNames = {
            Nursery: "Nursery",
            Primary: "Primary",
            JSS: "Junior Secondary",
            SSS: "Senior Secondary"
        };

        const teacherName =
            schoolClass.teacherName ||
            schoolClass.classTeacherName ||
            "Not assigned";

        const values = [
            index + 1,
            schoolClass.className || "",
            levelNames[schoolClass.classLevel] ||
                schoolClass.classLevel ||
                "",
            teacherName,
            schoolClass.academicSession || "",
            schoolClass.studentCount ?? 0
        ];

        values.forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = String(value);
            row.appendChild(cell);
        });

        // Actions cell
        const actionsCell = document.createElement("td");

        const viewButton = document.createElement("button");
        viewButton.type = "button";
        viewButton.className = "btn btn-small btn-view";
        viewButton.textContent = "View";

        viewButton.addEventListener("click", () => {
            Swal.fire({ icon: "info", title: "Class details", text: [`Class: ${schoolClass.className}`, `Level: ${levelNames[schoolClass.classLevel] || schoolClass.classLevel}`, `Teacher: ${teacherName}`, `Academic Session: ${schoolClass.academicSession}`, `Students: ${schoolClass.studentCount ?? 0}`].join("\n") });
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "btn btn-small btn-delete";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteClass(schoolClass.id);
        });

        actionsCell.append(viewButton, deleteButton);
        row.appendChild(actionsCell);

        classesTableBody.appendChild(row);
    });
}


// ========================================
// LOAD CLASSES FROM FIRESTORE
// ========================================

async function loadClassPageCounts() {
    const counters = [
        [totalClassesCounter, "classes"],
        [totalStudentsCounter, "students"],
        [totalTeachersCounter, "teachers"]
    ];
    const results = await Promise.allSettled(
        counters.map(([, collectionName]) => getDocs(collection(db, collectionName)))
    );
    results.forEach((result, index) => {
        const [counter, collectionName] = counters[index];
        if (result.status === "fulfilled") {
            if (counter) counter.textContent = String(result.value.size);
        } else {
            console.error(`Unable to load ${collectionName} total:`, result.reason);
        }
    });
}
async function loadClasses() {
    try {
        // Load all classes
        const classesSnapshot = await getDocs(
            collection(db, "classes")
        );

        // Load all students
        const studentsSnapshot = await getDocs(
            collection(db, "students")
        );

        // Convert student documents into an array
        const students = studentsSnapshot.docs.map((document) => ({
            id: document.id,
            ...document.data()
        }));

        // Count students belonging to each class
        classes = classesSnapshot.docs.map((document) => {
            const schoolClass = {
                id: document.id,
                ...document.data()
            };

            const studentCount = students.filter((student) => {
                return (
                    (student.className || "").trim().toLowerCase() ===
                    (schoolClass.className || "").trim().toLowerCase()
                );
            }).length;

            return {
                ...schoolClass,
                studentCount
            };
        });

        // Sort classes alphabetically
        classes.sort((a, b) =>
            (a.className || "").localeCompare(b.className || "")
        );

        // Display the updated classes
        applyClassSearch();
        await loadClassPageCounts();

    } catch (error) {
        console.error("Error loading classes:", error);
        await loadClassPageCounts();

        classesTableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    Could not load classes or student counts.
                    Check your Firestore permissions.
                </td>
            </tr>
        `;
    }
}

// async function loadClasses() {
//     try {
//         const snapshot = await getDocs(collection(db, "classes"));

//         classes = snapshot.docs.map((document) => ({
//             id: document.id,
//             ...document.data()
//         }));

//         classes.sort((a, b) =>
//             (a.className || "").localeCompare(b.className || "")
//         );

//         applyClassSearch();
//         await loadClassPageCounts();

//     } catch (error) {
//         console.error("Error loading classes:", error);

//         classesTableBody.innerHTML = `
//             <tr>
//                 <td colspan="7">
//                     Could not load classes. Check your Firestore rules.
//                 </td>
//             </tr>
//         `;
//     }
// }


// ========================================
// SEARCH CLASSES
// ========================================

function applyClassSearch() {
    const query = classSearch.value.trim().toLowerCase();

    const filteredClasses = classes.filter((schoolClass) => {
        const teacherName =
            schoolClass.teacherName ||
            schoolClass.classTeacherName ||
            "";

        return (
            (schoolClass.className || "").toLowerCase().includes(query) ||
            (schoolClass.classLevel || "").toLowerCase().includes(query) ||
            teacherName.toLowerCase().includes(query) ||
            (schoolClass.academicSession || "").toLowerCase().includes(query)
        );
    });

    displayClasses(filteredClasses);
}

classSearch.addEventListener("input", applyClassSearch);


// ========================================
// ADD CLASS
// ========================================

classForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const className = classNameInput.value.trim();
    const classLevel = classLevelInput.value;
    const teacherId = classTeacherInput.value;
    const academicSession = academicSessionInput.value;

    if (!className || !classLevel || !teacherId || !academicSession) {
        await Swal.fire({ icon: "warning", title: "Incomplete form", text: "Please complete all class fields." });
        return;
    }

    const selectedTeacher = classTeacherInput.selectedOptions[0];

    const teacherName = selectedTeacher.textContent;

    // Avoid duplicate class names in the same academic session.
    const duplicate = classes.some((schoolClass) =>
        (schoolClass.className || "").toLowerCase() === className.toLowerCase() &&
        schoolClass.academicSession === academicSession
    );

    if (duplicate) {
        await Swal.fire({ icon: "warning", title: "Duplicate class", text: "This class already exists for that academic session." });
        return;
    }

    const saveButton = classForm.querySelector('button[type="submit"]');

    try {
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = "Saving...";
        }

        await addDoc(collection(db, "classes"), {
            className,
            classLevel,
            teacherId,
            teacherName,
            academicSession,
            studentCount: 0,
            createdAt: serverTimestamp()
        });

        await Swal.fire({ icon: "success", title: "Class saved", text: "Class saved successfully!" });

        classForm.reset();

        await loadClasses();

    } catch (error) {
        console.error("Error saving class:", error);

        await Swal.fire({ icon: "error", title: "Save failed", text: "Could not save class. Check your Firebase connection and Firestore rules." });

    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Save Class";
        }
    }
});


// ========================================
// DELETE CLASS
// ========================================

async function deleteClass(classId) {
    const confirmation = await Swal.fire({ title: "Delete class?", text: "Are you sure you want to delete this class?", icon: "warning", showCancelButton: true, confirmButtonText: "Delete", cancelButtonText: "Cancel", confirmButtonColor: "#dc2626" });

    if (!confirmation.isConfirmed) return;

    try {
        await deleteDoc(doc(db, "classes", classId));

        await Swal.fire({ icon: "success", title: "Class deleted", text: "Class deleted successfully!" });

        await loadClasses();

    } catch (error) {
        console.error("Error deleting class:", error);

        await Swal.fire({ icon: "error", title: "Delete failed", text: "Could not delete class. Check your Firestore rules." });
    }
}


// ========================================
// AUTHENTICATION
// ========================================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    await loadTeachers();
    await loadClasses();
});