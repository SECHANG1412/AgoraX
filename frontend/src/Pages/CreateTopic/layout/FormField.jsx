import React from 'react';

const FormField = ({ label, name, value, onChange, placeholder, required = true, type = 'text' }) => {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full px-3.5 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300 focus:outline-none h-24"
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full px-3.5 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300 focus:outline-none"
          placeholder={placeholder}
        />
      )}
    </div>
  );
};

export default FormField;
