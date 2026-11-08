
import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const attendanceForm = document.getElementById("attendanceForm");

const studentNameInput = document.getElementById("studentName");
const studentClassInput = document.getElementById("studentClass");
const attendanceDateInput = document.getElementById("attendanceDate");
const attendanceStatusInput = document.getElementById("attendanceStatus");

const attendanceTableBody = document.getElementById("attendanceTableBody");

const attendanceSearch = document.getElementById("attendanceSearch");
const classFilter = document.getElementById("classFilter");
const statusFilter = document.getElementById("statusFilter");

const attendanceCollection = collection(db, "attendance");

let attendanceRecords = [];

attendanceDateInput.value = getLocalDate();

function getLocalDate() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}




async function loadAttendance() {
    try {
        const snapshot = await getDocs(attendanceCollection);

        attendanceRecords = snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data()
        }));

        renderAttendance();
        updateStatistics();

    } catch (error) {
        console.error("Error loading attendance:", error);

        Swal.fire({
            icon: "error",
            title: "Loading Failed",
            text: "Unable to load attendance records. Please try again."
        });
    }
}


function renderAttendance() {

    const searchTerm = attendanceSearch.value.trim().toLowerCase();
    const selectedClass = classFilter.value;
    const selectedStatus = statusFilter.value;

    const filteredRecords = attendanceRecords.filter((record) => {

        const name = (record.studentName || "").toLowerCase();
        const studentClass = record.studentClass || "";
        const status = record.attendanceStatus || "";

        const matchesSearch = name.includes(searchTerm);

        const matchesClass =
            !selectedClass || studentClass === selectedClass;

        const matchesStatus =
            !selectedStatus || status === selectedStatus;

        return matchesSearch && matchesClass && matchesStatus;
    });

    attendanceTableBody.innerHTML = "";

    if (filteredRecords.length === 0) {

        attendanceTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 25px;">
                    No attendance records found.
                </td>
            </tr>
        `;

        return;
    }

    filteredRecords.forEach((record, index) => {

        const row = document.createElement("tr");

        const numberCell = document.createElement("td");
        numberCell.textContent = index + 1;

        const nameCell = document.createElement("td");
        nameCell.textContent = record.studentName || "Unknown";

        const classCell = document.createElement("td");
        classCell.textContent = record.studentClass || "Unknown";

        const dateCell = document.createElement("td");
        dateCell.textContent = record.attendanceDate || "N/A";

        const statusCell = document.createElement("td");

        const badge = document.createElement("span");
        badge.classList.add("status-badge");

        if (record.attendanceStatus === "Present") {
            badge.classList.add("status-present");
        } else if (record.attendanceStatus === "Absent") {
            badge.classList.add("status-absent");
        } else if (record.attendanceStatus === "Late") {
            badge.classList.add("status-late");
        }

        badge.textContent = record.attendanceStatus || "Unknown";

        statusCell.appendChild(badge);

        const actionsCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "btn btn-small btn-edit";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            editAttendance(record.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "btn btn-small btn-delete";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteAttendance(record.id);
        });

        actionsCell.append(editButton, deleteButton);

        row.append(
            numberCell,
            nameCell,
            classCell,
            dateCell,
            statusCell,
            actionsCell
        );

        attendanceTableBody.appendChild(row);
    });
}


attendanceForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const studentName = studentNameInput.value.trim();
    const studentClass = studentClassInput.value;
    const attendanceDate = attendanceDateInput.value;
    const attendanceStatus = attendanceStatusInput.value;

    if (
        !studentName ||
        !studentClass ||
        !attendanceDate ||
        !attendanceStatus
    ) {
        Swal.fire({
            icon: "warning",
            title: "Incomplete Form",
            text: "Please complete all attendance fields."
        });

        return;
    }

    const duplicate = attendanceRecords.some((record) => {

        return (
            (record.studentName || "").trim().toLowerCase() ===
                studentName.toLowerCase() &&
            record.studentClass === studentClass &&
            record.attendanceDate === attendanceDate
        );
    });

    if (duplicate) {

        Swal.fire({
            icon: "warning",
            title: "Already Recorded",
            text: "Attendance has already been recorded for this student, class and date."
        });

        return;
    }

    try {

        Swal.fire({
            title: "Saving Attendance...",
            text: "Please wait.",
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        await addDoc(attendanceCollection, {

            studentName,
            studentClass,
            attendanceDate,
            attendanceStatus,

            createdAt: serverTimestamp()

        });

        attendanceForm.reset();

        attendanceDateInput.value = getLocalDate();

        await loadAttendance();

        Swal.fire({
            icon: "success",
            title: "Attendance Saved!",
            text: "The attendance record has been saved successfully.",
            confirmButtonText: "Great!"
        });

    } catch (error) {

        console.error("Error saving attendance:", error);

        Swal.fire({
            icon: "error",
            title: "Save Failed",
            text: "Unable to save attendance. Please check your Firebase connection and try again."
        });
    }
});

async function editAttendance(id) {

    const record = attendanceRecords.find(
        (item) => item.id === id
    );

    if (!record) {
        return;
    }

    const result = await Swal.fire({

        title: "Edit Attendance",

        html: `
            <p style="margin-bottom: 12px;">
                <strong>${escapeHTML(record.studentName || "Unknown")}</strong>
            </p>

            <label for="editAttendanceDate"
                   style="display:block; text-align:left; margin-bottom:5px;">
                Attendance Date
            </label>

            <input
                id="editAttendanceDate"
                type="date"
                class="swal2-input"
                value="${escapeHTML(record.attendanceDate || "")}"
            >

            <label for="editAttendanceStatus"
                   style="display:block; text-align:left; margin-bottom:5px;">
                Attendance Status
            </label>

            <select id="editAttendanceStatus" class="swal2-select">
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
            </select>
        `,

        didOpen: () => {
            document.getElementById("editAttendanceStatus").value =
                record.attendanceStatus || "Present";
        },

        showCancelButton: true,

        confirmButtonText: "Save Changes",
        cancelButtonText: "Cancel",

        preConfirm: () => {

            const date = document.getElementById(
                "editAttendanceDate"
            ).value;

            const status = document.getElementById(
                "editAttendanceStatus"
            ).value;

            if (!date || !status) {

                Swal.showValidationMessage(
                    "Please select a date and status."
                );

                return false;
            }

            const duplicate = attendanceRecords.some((item) => {

                return (
                    item.id !== id &&
                    item.studentClass === record.studentClass &&
                    item.attendanceDate === date &&
                    (item.studentName || "").trim().toLowerCase() ===
                        (record.studentName || "").trim().toLowerCase()
                );
            });

            if (duplicate) {

                Swal.showValidationMessage(
                    "Attendance already exists for this student, class and date."
                );

                return false;
            }

            return { date, status };
        }

    });

    if (!result.isConfirmed) {
        return;
    }

    try {

        await updateDoc(doc(db, "attendance", id), {

            attendanceDate: result.value.date,
            attendanceStatus: result.value.status

        });

        await loadAttendance();

        Swal.fire({
            icon: "success",
            title: "Updated!",
            text: "Attendance has been updated successfully."
        });

    } catch (error) {

        console.error("Error updating attendance:", error);

        Swal.fire({
            icon: "error",
            title: "Update Failed",
            text: "Unable to update this attendance record."
        });
    }
}

async function deleteAttendance(id) {

    const record = attendanceRecords.find(
        (item) => item.id === id
    );

    if (!record) {
        return;
    }

    const result = await Swal.fire({

        title: "Delete Attendance?",
        text: `Delete the attendance record for ${record.studentName}?`,
        icon: "warning",

        showCancelButton: true,

        confirmButtonText: "Yes, Delete",
        cancelButtonText: "Cancel",

        confirmButtonColor: "#d33",
        cancelButtonColor: "#6c757d"

    });

    if (!result.isConfirmed) {
        return;
    }

    try {

        await deleteDoc(doc(db, "attendance", id));

        await loadAttendance();

        Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: "The attendance record has been deleted."
        });

    } catch (error) {

        console.error("Error deleting attendance:", error);

        Swal.fire({
            icon: "error",
            title: "Delete Failed",
            text: "Unable to delete this attendance record."
        });
    }
}

function updateStatistics() {

    const today = getLocalDate();

    const todayRecords = attendanceRecords.filter(
        (record) => record.attendanceDate === today
    );

    const totalStudents = document.querySelector(
        ".stats-container .stat-card:nth-child(1) .stat-number"
    );

    const presentStudents = document.querySelector(
        ".stats-container .stat-card:nth-child(2) .stat-number"
    );

    const absentStudents = document.querySelector(
        ".stats-container .stat-card:nth-child(3) .stat-number"
    );

    const lateStudents = document.querySelector(
        ".stats-container .stat-card:nth-child(4) .stat-number"
    );

    if (totalStudents) {
        totalStudents.textContent = attendanceRecords.length;
    }

    if (presentStudents) {
        presentStudents.textContent = todayRecords.filter(
            (record) => record.attendanceStatus === "Present"
        ).length;
    }

    if (absentStudents) {
        absentStudents.textContent = todayRecords.filter(
            (record) => record.attendanceStatus === "Absent"
        ).length;
    }

    if (lateStudents) {
        lateStudents.textContent = todayRecords.filter(
            (record) => record.attendanceStatus === "Late"
        ).length;
    }
}

attendanceSearch.addEventListener("input", renderAttendance);

classFilter.addEventListener("change", renderAttendance);

statusFilter.addEventListener("change", renderAttendance);

function escapeHTML(value) {

    return String(value).replace(/[&<>"']/g, (character) => {

        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

loadAttendance();