import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F5F9] px-4 font-poppins">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="https://media.base44.com/images/public/6a0ed744d2266f7b5226f8a2/25416f4d0_OpFin_83x.png"
              alt="OpFin"
              className="h-11 w-auto"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1D29] font-poppins">{title}</h1>
          {subtitle && <p className="text-gray-500 mt-1.5 text-sm">{subtitle}</p>}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
          {children}
        </div>

        {footer && (
          <p className="text-center text-sm text-gray-500 mt-5">{footer}</p>
        )}

        {/* Brand tagline */}
        <p className="text-center text-xs text-gray-400 mt-4 font-medium tracking-wide">
          Smart Finance. Simple Solutions.
        </p>
      </div>
    </div>
  );
}