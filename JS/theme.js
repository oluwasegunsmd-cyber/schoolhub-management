(() => {
    const theme = localStorage.getItem("schoolhubTheme") || "light";
    document.documentElement.classList.toggle("dark-mode", theme === "dark");
})();