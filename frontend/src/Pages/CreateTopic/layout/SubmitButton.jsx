import React from 'react';

const SubmitButton = ({ label }) => {
  return (
    <div className="flex justify-end">
      <button
        type="submit"
        className="px-6 py-3 border border-slate-900 text-white rounded-lg bg-slate-900 shadow-sm hover:bg-slate-800 hover:border-slate-800 transition-all duration-200 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
      >
        {label}
      </button>
    </div>
  );
};

export default SubmitButton;
