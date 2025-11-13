import React from 'react';

const SwitchAuthLink = ({ message, buttonText, onClick }) => {
  return (
    <div className="mt-4 text-center text-sm text-gray-600">
      {message}{' '}
      <button
        type="button"
        onClick={onClick}
        className="text-emerald-500 hover:text-emerald-600 font-medium transition-colors"
      >
        {buttonText}
      </button>
    </div>
  );
};

export default SwitchAuthLink;
