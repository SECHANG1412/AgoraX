import React from 'react';

const Header = ({ title, total, sort, onSortChange }) => {
  return (
    <div className="flex flex-col gap-3 mb-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-500">카테고리 · 게시판</p>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">총 {total}개의 토픽</p>
        </div>

      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold text-gray-800 text-sm">정렬</span>
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={sort}
          onChange={onSortChange}
        >
          <option value="recent">최신순</option>
          <option value="likes">HOT · 좋아요순</option>
          <option value="views">BEST · 조회순</option>
        </select>
      </div>
    </div>
  );
};

export default Header;
