'use client';

import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  showPasswordToggle?: boolean; // เพิ่ม prop สำหรับเปิด/ปิดการแสดงรหัสผ่าน
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  type = 'text',
  showPasswordToggle = false, // ค่าเริ่มต้นเป็น false
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };
  
  // ปรับประเภท input ตามสถานะ showPassword ถ้าเป็น password
  const inputType = type === 'password' && showPassword ? 'text' : type;
  
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} 
            rounded-md shadow-sm ${showPasswordToggle ? 'pr-10' : ''}
            focus:outline-none focus:ring-blue-500 focus:border-blue-500 
            dark:bg-gray-800 dark:text-white 
            ${className}`}
          type={inputType}
          {...props}
        />
        
        {/* แสดงปุ่มเปิด/ปิดการแสดงรหัสผ่านเมื่อ type เป็น password และ showPasswordToggle เป็น true */}
        {type === 'password' && showPasswordToggle && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 dark:text-gray-400"
            onClick={togglePasswordVisibility}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default Input;