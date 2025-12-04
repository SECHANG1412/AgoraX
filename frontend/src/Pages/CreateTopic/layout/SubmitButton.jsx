import React from 'react';

const SubmitButton = ({ label }) => {
  return (
    <div className="flex justify-end">
      <button
        type="submit"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold"
      >
        {label}
      </button>
    </div>
  );
};

export default SubmitButton;
