document.addEventListener("DOMContentLoaded", () => {
  if (window.Auth.isLoggedIn()) {
    window.location.href = "./issues.html";
    return;
  }

  const loginForm = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const rememberMeInput = document.getElementById("rememberMe");
  const signInBtn = document.getElementById("signInBtn");
  const demoBtn = document.getElementById("demoBtn");
  const messageBox = document.getElementById("messageBox");

  function showMessage(text, type = "error") {
    const typeClassMap = {
      error: "border-red-200 bg-red-50 text-red-700",
      success: "border-green-200 bg-green-50 text-green-700",
      info: "border-blue-200 bg-blue-50 text-blue-700"
    };

    messageBox.className = `mt-6 rounded-xl border px-4 py-3 text-sm ${typeClassMap[type] || typeClassMap.error}`;
    messageBox.textContent = text;
    messageBox.classList.remove("hidden");
  }

  function hideMessage() {
    messageBox.classList.add("hidden");
  }

  demoBtn.addEventListener("click", () => {
    usernameInput.value = "admin";
    passwordInput.value = "admin123";
    rememberMeInput.checked = true;
    hideMessage();
    usernameInput.focus();
  });

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    hideMessage();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const remember = rememberMeInput.checked;

    if (!username || !password) {
      showMessage("Please enter both username and password.", "error");
      return;
    }

    signInBtn.disabled = true;
    signInBtn.textContent = "Signing In...";

    setTimeout(() => {
      const result = window.Auth.login(username, password, remember);

      if (result.success) {
        showMessage("Login successful. Redirecting...", "success");
        window.location.href = "./issues.html";
      } else {
        showMessage(result.message, "error");
        signInBtn.disabled = false;
        signInBtn.textContent = "Sign In";
      }
    }, 500);
  });
});