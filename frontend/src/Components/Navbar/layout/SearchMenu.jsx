import React from 'react';
import { BiSearch } from 'react-icons/bi';

const SearchMenu = ({ searchValue, onSearchInputChange, onSearchSubmit }) => {
  return (
    <form
      className="relative w-full"
      onSubmit={(e) => {
        e.preventDefault();
        onSearchSubmit?.();
      }}
    >
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <BiSearch className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        value={searchValue}
        onChange={onSearchInputChange}
        className="block w-full pl-10 pr-4 py-2 bg-[#f5f6f8] rounded-2xl text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition shadow-inner"
        placeholder="검색어를 입력하세요"
      />
    </form>
  );
};

export default SearchMenu;
