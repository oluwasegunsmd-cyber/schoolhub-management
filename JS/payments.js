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

const paymentForm = document.getElementById("paymentForm");
const studentNameInput = document.getElementById("studentName");
const studentIdInput = document.getElementById("studentId");
const studentClassInput = document.getElementById("studentClass");
const paymentTableBody = document.getElementById("paymentsTableBody");
const paymentSearch = document.getElementById("paymentSearch");
const statusFilter = document.getElementById("statusFilter");
const typeFilter = document.getElementById("typeFilter");
const paymentSummary = document.getElementById("paymentSummary");
const paymentDateInput = document.getElementById("paymentDate");
const paymentsCollection = collection(db, "payments");

const studentsCollection = collection(db, "students");

async function loadStudents() {
    try {
        const snapshot = await getDocs(studentsCollection);
        studentNameInput.replaceChildren(new Option("Select a student", ""));

        snapshot.docs.forEach((studentDoc) => {
            const student = studentDoc.data();
            const fullName = `${student.firstName || ""} ${student.lastName || ""}`.trim();
            if (!fullName) return;

            const option = new Option(fullName, studentDoc.id);
            option.dataset.studentId = student.studentId || studentDoc.id;
            option.dataset.studentClass = student.className || "";
            studentNameInput.appendChild(option);
        });

        if (studentNameInput.options.length === 1) {
            studentNameInput.options[0].textContent = "No registered students found";
            studentNameInput.options[0].disabled = true;
        }
    } catch (error) {
        console.error("Error loading students:", error);
        studentNameInput.replaceChildren(new Option("Unable to load students", ""));
        await showMessage(
            "error",
            "Student Loading Failed",
            "Unable to retrieve students from Firestore. Check the students collection read rule."
        );
    }
}

studentNameInput.addEventListener("change", () => {
    const selectedOption = studentNameInput.selectedOptions[0];
    studentIdInput.value = selectedOption?.dataset.studentId || "";
    studentClassInput.value = selectedOption?.dataset.studentClass || "";
});
let payments = [];

function getLocalDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
}

function showMessage(icon, title, text) {
    return Swal.fire({ icon, title, text, confirmButtonText: "OK" });
}

function updateStatistics() {
    const collected = payments.reduce((total, payment) => {
        return total + (["Paid", "Partial"].includes(payment.paymentStatus)
            ? Number(payment.amountPaid) || 0
            : 0);
    }, 0);
    const outstanding = payments.reduce((total, payment) => {
        return total + (payment.paymentStatus === "Pending"
            ? Number(payment.amountPaid) || 0
            : 0);
    }, 0);

    document.getElementById("feesCollected").textContent = formatCurrency(collected);
    document.getElementById("outstandingAmount").textContent = formatCurrency(outstanding);
    document.getElementById("totalPayments").textContent = String(payments.length);
    document.getElementById("pendingPayments").textContent = String(
        payments.filter((payment) => payment.paymentStatus === "Pending").length
    );
}

function renderPayments() {
    const searchTerm = paymentSearch.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    const selectedType = typeFilter.value;
    const filteredPayments = payments.filter((payment) => {
        const matchesSearch =
            (payment.studentName || "").toLowerCase().includes(searchTerm) ||
            (payment.studentId || "").toLowerCase().includes(searchTerm);
        return matchesSearch &&
            (!selectedStatus || payment.paymentStatus === selectedStatus) &&
            (!selectedType || payment.paymentType === selectedType);
    });

    paymentTableBody.replaceChildren();
    if (filteredPayments.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 9;
        cell.textContent = payments.length ? "No matching payment records." : "No payment records yet.";
        cell.style.textAlign = "center";
        row.appendChild(cell);
        paymentTableBody.appendChild(row);
    } else {
        filteredPayments.forEach((payment) => {
            const row = document.createElement("tr");
            const paymentId = `PAY-${payment.id.slice(-6).toUpperCase()}`;
            const values = [
                paymentId,
                payment.studentName || "Unknown",
                payment.studentClass || "—",
                payment.paymentType || "—",
                formatCurrency(payment.amountPaid),
                payment.paymentDate || "—",
                payment.paymentMethod || "—"
            ];

            values.forEach((value) => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            const statusCell = document.createElement("td");
            const badge = document.createElement("span");
            const statusClass = (payment.paymentStatus || "").toLowerCase();
            badge.className = `status-badge status-${statusClass}`;
            badge.textContent = payment.paymentStatus || "Unknown";
            statusCell.appendChild(badge);
            row.appendChild(statusCell);

            const actionsCell = document.createElement("td");
            const viewButton = document.createElement("button");
            viewButton.type = "button";
            viewButton.className = "action-btn view-btn";
            viewButton.textContent = "View";
            viewButton.addEventListener("click", () => viewPayment(payment, paymentId));

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "action-btn delete-btn";
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", () => deletePayment(payment));

            actionsCell.append(viewButton, deleteButton);
            row.appendChild(actionsCell);
            paymentTableBody.appendChild(row);
        });
    }

    paymentSummary.textContent = `Showing ${filteredPayments.length} of ${payments.length} payment records`;
}

function viewPayment(payment, paymentId) {
    const details = [
        `Payment ID: ${paymentId}`,
        `Student: ${payment.studentName || "Unknown"}`,
        `Student ID: ${payment.studentId || "—"}`,
        `Class: ${payment.studentClass || "—"}`,
        `Type: ${payment.paymentType || "—"}`,
        `Amount: ${formatCurrency(payment.amountPaid)}`,
        `Date: ${payment.paymentDate || "—"}`,
        `Method: ${payment.paymentMethod || "—"}`,
        `Status: ${payment.paymentStatus || "Unknown"}`
    ].join("\n");
    return Swal.fire({ title: "Payment Details", text: details, icon: "info" });
}

async function loadPayments() {
    paymentTableBody.innerHTML = '<tr><td colspan="9" style="text-align:center">Loading payment records...</td></tr>';
    try {
        const snapshot = await getDocs(paymentsCollection);
        payments = snapshot.docs.map((paymentDoc) => ({
            id: paymentDoc.id,
            ...paymentDoc.data()
        }));
        payments.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        updateStatistics();
        renderPayments();
    } catch (error) {
        console.error("Error loading payments:", error);
        paymentTableBody.innerHTML = '<tr><td colspan="9" style="text-align:center">Could not load payments. Check your Firestore permissions.</td></tr>';
        paymentSummary.textContent = "Payment records unavailable";
        await showMessage("error", "Could Not Load Payments", "Check that you are signed in and that Firestore rules allow access to the payments collection.");
    }
}

paymentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const amountPaid = Number(document.getElementById("amountPaid").value);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
        await showMessage("warning", "Invalid Amount", "Enter an amount greater than zero.");
        return;
    }

    const payment = {
        studentName: studentNameInput.selectedOptions[0]?.textContent.trim() || "",
        studentRecordId: studentNameInput.value,
        studentId: studentIdInput.value.trim(),
        studentClass: studentClassInput.value.trim(),
        paymentType: document.getElementById("paymentType").value,
        amountPaid,
        paymentDate: paymentDateInput.value,
        paymentMethod: document.getElementById("paymentMethod").value,
        paymentStatus: document.getElementById("paymentStatus").value,
        createdAt: serverTimestamp()
    };

    try {
        await addDoc(paymentsCollection, payment);
        paymentForm.reset();
        paymentDateInput.value = getLocalDate();
        await loadPayments();
        await showMessage("success", "Payment Recorded", "The payment was saved successfully.");
    } catch (error) {
        console.error("Error saving payment:", error);
        await showMessage("error", "Could Not Save Payment", "Check that you are signed in and that Firestore rules allow writes to the payments collection.");
    }
});

async function deletePayment(payment) {
    const result = await Swal.fire({
        title: "Delete payment?",
        text: `Delete the payment for ${payment.studentName || "this student"}?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#dc2626"
    });
    if (!result.isConfirmed) return;

    try {
        await deleteDoc(doc(db, "payments", payment.id));
        await loadPayments();
        await showMessage("success", "Payment Deleted", "The payment record was deleted.");
    } catch (error) {
        console.error("Error deleting payment:", error);
        await showMessage("error", "Could Not Delete Payment", "Check your Firestore rules and try again.");
    }
}

function exportPayments() {
    const rows = [
        ["Payment ID", "Student Name", "Student ID", "Class", "Payment Type", "Amount", "Date", "Method", "Status"],
        ...payments.map((payment) => [
            `PAY-${payment.id.slice(-6).toUpperCase()}`,
            payment.studentName,
            payment.studentId,
            payment.studentClass,
            payment.paymentType,
            payment.amountPaid,
            payment.paymentDate,
            payment.paymentMethod,
            payment.paymentStatus
        ])
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "school-payments.csv";
    link.click();
    URL.revokeObjectURL(url);
}

document.getElementById("exportPaymentsButton").addEventListener("click", exportPayments);
paymentSearch.addEventListener("input", renderPayments);
statusFilter.addEventListener("change", renderPayments);
typeFilter.addEventListener("change", renderPayments);
paymentDateInput.value = getLocalDate();

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    await Promise.all([loadStudents(), loadPayments()]);
});