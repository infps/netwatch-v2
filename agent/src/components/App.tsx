import { useEffect, useState } from "react";
import Login from "../screens/Login";
import Main from "../screens/Main";

type User = { id: string; email: string };

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState<string>();

  useEffect(() => {
    // Check initial auth state
    window.electronAPI.getAuthState().then((state) => {
      setIsLoggedIn(state.isLoggedIn);
      setUser(state.user ?? null);
    });
  }, []);

  const handleLogin = async (email: string, password: string) => {
    setLoginError(undefined);
    const result = await window.electronAPI.login(email, password);
    if (result.success) {
      setIsLoggedIn(true);
      setUser(result.user);
    } else {
      setLoginError(result.error);
    }
  };

  const handleLogout = async () => {
    await window.electronAPI.logout();
    setIsLoggedIn(false);
    setUser(null);
  };

  // Loading state
  if (isLoggedIn === null) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} error={loginError} />;
  }

  return <Main user={user} onLogout={handleLogout} />;
};

export default App;
