import { auth, db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const userAvatar = document.getElementById("userAvatar");
const recentPaymentsContainer = document.getElementById("dashboardRecentPayments");

function formatCurrency(value) {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
}

function renderRecentPayments(paymentDocs) {
    if (!recentPaymentsContainer) return;
    recentPaymentsContainer.replaceChildren();

    const latestPayments = [...paymentDocs]
        .sort((a, b) => {
            const aData = a.data();
            const bData = b.data();
            const aTime = aData.createdAt?.toMillis?.() || 0;
            const bTime = bData.createdAt?.toMillis?.() || 0;
            return bTime - aTime || (bData.paymentDate || "").localeCompare(aData.paymentDate || "");
        })
        .slice(0, 3);

    if (latestPayments.length === 0) {
        const item = document.createElement("div");
        item.className = "activity-item";
        const text = document.createElement("p");
        text.className = "activity-description";
        text.textContent = "No payment records yet.";
        item.appendChild(text);
        recentPaymentsContainer.appendChild(item);
        return;
    }

    latestPayments.forEach((paymentDoc) => {
        const payment = paymentDoc.data();
        const item = document.createElement("div");
        item.className = "activity-item";

        const icon = document.createElement("div");
        icon.className = "activity-icon";
        icon.textContent = "💰";

        const details = document.createElement("div");
        const title = document.createElement("p");
        title.className = "activity-title";
        title.textContent = `${payment.studentName || "Student"} — ${formatCurrency(payment.amountPaid)}`;

        const description = document.createElement("p");
        description.className = "activity-description";
        description.textContent = `${payment.paymentType || "Payment"} · ${payment.paymentStatus || "Status unavailable"}`;

        details.append(title, description);
        item.append(icon, details);

        if (payment.paymentDate) {
            const date = document.createElement("span");
            date.className = "activity-time";
            date.textContent = payment.paymentDate;
            item.appendChild(date);
        }

        recentPaymentsContainer.appendChild(item);
    });
}

async function loadDashboardCounts() {
    const counters = [
        ["dashboardTotalStudents", "students"],
        ["dashboardTotalTeachers", "teachers"],
        ["dashboardTotalClasses", "classes"],
        ["dashboardTotalPayments", "payments"]
    ];
    const results = await Promise.allSettled(
        counters.map(([, collectionName]) => getDocs(collection(db, collectionName)))
    );

    results.forEach((result, index) => {
        const [elementId, collectionName] = counters[index];
        if (result.status === "fulfilled") {
            const counter = document.getElementById(elementId);
            if (counter) counter.textContent = String(result.value.size);
            if (collectionName === "payments") {
                renderRecentPayments(result.value.docs);
            }
        } else {
            console.error(`Unable to load ${collectionName} total:`, result.reason);
            if (collectionName === "payments") {
                renderRecentPayments([]);
                if (recentPaymentsContainer) {
                    const message = recentPaymentsContainer.querySelector(".activity-description");
                    if (message) message.textContent = "Payment records unavailable. Check Firestore permissions.";
                }
            }
        }
    });
}

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    loadDashboardCounts();
    if (userName) userName.textContent = user.email || "Administrator";
    if (userAvatar) userAvatar.textContent = (user.email || "A").charAt(0).toUpperCase();
});

logoutBtn?.addEventListener("click", async () => {
    try {
        await signOut(auth);
        window.location.href = "login.html";
    } catch (error) {
        console.error("Logout error:", error);
        await Swal.fire({
            icon: "error",
            title: "Logout failed",
            text: "Unable to log out. Please try again."
        });
    }
});