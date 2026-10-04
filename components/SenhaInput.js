'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Campo de senha com botão "olhinho" para mostrar/ocultar o que foi digitado.
// Aceita as mesmas props de um <input> normal (value, onChange, required, minLength, placeholder...).
export default function SenhaInput({ className = '', ...props }) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visivel ? 'text' : 'password'}
        className={`${className} pr-10`}
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visivel}
        title={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        className="absolute inset-y-0 right-0 px-3 flex items-center text-marinho/50 hover:text-marinho"
      >
        {visivel ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
