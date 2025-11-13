import React from 'react';

const FormButton = ({ type = 'submit', onClick, children, classname }) => {
  return (
    <div>
      <button
        type={type}
        onClick={onClick}
        className={`w-full px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors ${classname}`}
      >
        {children}
      </button>
    </div>
  );
};

export default FormButton;
