import React from 'react';

const CategorySelect = ({ categories, value, onChange }) => {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        카테고리 <span className="text-red-500">*</span>
      </label>

      <select
        name="category"
        value={value}
        onChange={onChange}
        required
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
      >
        <option value="" disabled>
          카테고리를 선택하세요
        </option>
        {categories.map((category, idx) => (
          <option key={idx} value={category}>
            {category}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CategorySelect;
