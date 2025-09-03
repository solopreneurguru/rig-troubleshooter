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
        className="px-3 py-1 rounded-md bg-neutral-800 text-neutral-100 hover:bg-neutral-700 shadow-md text-sm flex items-center gap-2"
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
        <div className="mt-2 w-64 rounded-md border border-neutral-700 bg-neutral-900 text-neutral-100 shadow-lg p-4 z-50">
          {tech ? (
            <div className="space-y-3">
              <div className="text-sm">
                <div className="font-medium">Signed in as:</div>
                <div className="font-bold">{tech.name}</div>
                <div className="text-neutral-300">{tech.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 text-sm bg-red-600 text-white border border-red-500 rounded hover:bg-red-700"
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
                className="w-full px-3 py-2 text-sm border border-neutral-700 rounded bg-neutral-800 text-neutral-100 placeholder:text-neutral-400"
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-700 rounded bg-neutral-800 text-neutral-100 placeholder:text-neutral-400"
              />
              <button
                onClick={handleLogin}
                disabled={isLoading || !name.trim() || !email.trim()}
                className="w-full px-3 py-2 text-sm bg-neutral-700 text-neutral-100 rounded hover:bg-neutral-800 disabled:opacity-50"
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
