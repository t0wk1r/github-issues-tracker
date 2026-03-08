const AUTH_KEY = "github_issues_tracker_auth";
const SESSION_AUTH_KEY = "github_issues_tracker_session_auth";

(function () {
  const DEMO_USER = {
    username: "admin",
    password: "admin123"
  };

  function saveAuth(data, remember) {
    clearAuth();

    const payload = JSON.stringify({
      username: data.username,
      loginTime: new Date().toISOString()
    });

    if (remember) {
      localStorage.setItem(AUTH_KEY, payload);
    } else {
      sessionStorage.setItem(SESSION_AUTH_KEY, payload);
    }
  }

  function getAuth() {
    const localAuth = localStorage.getItem(AUTH_KEY);
    const sessionAuth = sessionStorage.getItem(SESSION_AUTH_KEY);

    try {
      if (localAuth) return JSON.parse(localAuth);
      if (sessionAuth) return JSON.parse(sessionAuth);
      return null;
    } catch (error) {
      clearAuth();
      return null;
    }
  }

  function clearAuth() {
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(SESSION_AUTH_KEY);
  }

  window.Auth = {
    login(username, password, remember = false) {
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();

      if (
        trimmedUsername === DEMO_USER.username &&
        trimmedPassword === DEMO_USER.password
      ) {
        saveAuth({ username: trimmedUsername }, remember);
        return {
          success: true,
          message: "Login successful"
        };
      }

      return {
        success: false,
        message: "Invalid username or password"
      };
    },

    isLoggedIn() {
      return !!getAuth();
    },

    getUser() {
      return getAuth();
    },

    logout() {
      clearAuth();
    }
  };
})();