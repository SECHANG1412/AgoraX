import type { ChangeEvent } from 'react';

type CategorySelectProps = {
  categories: string[];
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
};

const CategorySelect = ({ categories, value, onChange }: CategorySelectProps) => {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        카테고리 <span className="text-red-500">*</span>
      </label>

      <select
        name="category"
        value={value}
        onChange={onChange}
        required
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
      >
        <option value="" disabled>
          카테고리를 선택하세요
        </option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CategorySelect;
