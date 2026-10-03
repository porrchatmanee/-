import React, { useState, useEffect } from 'react';
import { STANDARD_UNIT_GROUPS, ALL_STANDARD_UNITS } from '../lib/constants';

interface UnitSelectorProps {
  value: string;
  onChange: (unit: string) => void;
  className?: string;
  selectClassName?: string;
  id?: string;
  label?: string;
  compact?: boolean;
}

export function UnitSelector({
  value,
  onChange,
  className = '',
  selectClassName = '',
  id,
  label = 'หน่วยนับ',
  compact = false
}: UnitSelectorProps) {
  const isPredefined = ALL_STANDARD_UNITS.includes(value);
  const [isCustom, setIsCustom] = useState(!isPredefined && Boolean(value));
  const [customUnit, setCustomUnit] = useState(!isPredefined ? value : '');

  useEffect(() => {
    if (!ALL_STANDARD_UNITS.includes(value) && value) {
      setIsCustom(true);
      setCustomUnit(value);
    }
  }, [value]);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className={`font-bold text-slate-600 block ${compact ? 'text-[10px]' : 'text-xs'}`}>
            {label}
          </label>
          <button
            type="button"
            onClick={() => {
              const next = !isCustom;
              setIsCustom(next);
              if (next) {
                setCustomUnit(value || '');
              } else {
                onChange('กล่อง');
              }
            }}
            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
          >
            {isCustom ? '📋 รายการมาตรฐาน' : '✏️ กำหนดเอง'}
          </button>
        </div>
      )}

      {!isCustom ? (
        <select
          id={id}
          value={value}
          onChange={(e) => {
            if (e.target.value === '__custom__') {
              setIsCustom(true);
              setCustomUnit('');
            } else {
              onChange(e.target.value);
            }
          }}
          className={`w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-bold text-xs md:text-sm cursor-pointer ${selectClassName}`}
        >
          {STANDARD_UNIT_GROUPS.map((group) => (
            <optgroup key={group.groupName} label={group.groupName} className="font-bold text-slate-800">
              {group.units.map((u) => (
                <option key={u} value={u} className="font-normal text-slate-700">
                  {u}
                </option>
              ))}
            </optgroup>
          ))}
          <option value="__custom__" className="font-bold text-indigo-600">
            ✏️ อื่นๆ (พิมพ์ระบุหน่วยนับเอง)...
          </option>
        </select>
      ) : (
        <div className="flex items-center gap-1.5">
          <input
            id={id}
            type="text"
            required
            autoFocus
            placeholder="เช่น ริม, รีม, คิว, พาเลท..."
            value={customUnit}
            onChange={(e) => {
              setCustomUnit(e.target.value);
              onChange(e.target.value);
            }}
            className={`w-full bg-white border border-indigo-300 focus:border-indigo-500 px-3.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 text-slate-800 font-bold text-xs md:text-sm ${selectClassName}`}
          />
        </div>
      )}
    </div>
  );
}
