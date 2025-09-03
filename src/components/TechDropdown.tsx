"use client";
import { useState, useEffect } from "react";

type Tech = {
  id: string;
  name: string;
  email: string;
};

export default function TechDropdown() {
  const [tech, setTech] = useState<Tech | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load tech from localStorage on mount
    const savedTech = localStorage.getItem("tech");
    if (savedTech) {
      try {
        setTech(JSON.parse(savedTech));
      } catch (e) {
        localStorage.removeItem("tech");
      }
    }
  }, []);

  const handleLogin = async () => {
    if (!name.trim() || !email.trim()) return;
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/tech/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      
      const json = await res.json();
      if (json.ok) {
        const techData = { id: json.techId, name: name.trim(), email: email.trim() };
        setTech(techData);
        localStorage.setItem("tech", JSON.stringify(techData));
        setIsOpen(false);
        setName("");
        setEmail("");
      } else {
        alert("Login failed: " + json.error);
      }
    } catch (e) {
      alert("Login failed: " + e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setTech(null);
    localStorage.removeItem("tech");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 text-sm border rounded hover:bg-gray-50 flex items-center gap-2"
      >
        {tech ? (
          <>
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            {tech.name}
          </>
        ) : (
          <>
            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
            Anonymous
          </>
        )}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg p-4 z-50">
          {tech ? (
            <div className="space-y-3">
              <div className="text-sm">
                <div className="font-medium">Signed in as:</div>
                <div className="text-gray-600">{tech.name}</div>
                <div className="text-gray-600">{tech.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-medium">Sign in as Tech</div>
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded"
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded"
              />
              <button
                onClick={handleLogin}
                disabled={isLoading || !name.trim() || !email.trim()}
                className="w-full px-3 py-2 text-sm bg-black text-white rounded disabled:opacity-50"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
