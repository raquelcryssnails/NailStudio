// src/app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Simula um redirecionamento após alguns segundos, pode ser removido
    const timer = setTimeout(() => {
      router.push("/login");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-pink-50 text-gray-800">
      <h1 className="text-4xl font-bold mb-4">Bem-vindo ao NailStudio-IA 💅</h1>
      <p className="text-lg">Seu painel inteligente para estúdios de beleza.</p>
      <p className="text-sm mt-2 text-gray-500">Redirecionando para o login...</p>
    </main>
  );
}
