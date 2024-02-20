import { useDocument } from '@/hooks/use-document';
import { Option } from '@/types';
import React, { KeyboardEventHandler, useEffect, useState } from 'react';
import CreatableSelect from 'react-select/creatable';

type CreatableSelectProps = {
  modalTarget?: string;
  defaultOptions: Option[];
  selected: readonly Option[];
  setSelected: React.Dispatch<React.SetStateAction<readonly Option[]>>
  placeholder?: string;
  label?: string;
};

export const CreateableSelect = ({ defaultOptions, setSelected, selected, modalTarget, placeholder, label }: CreatableSelectProps) => {
  const [inputValue, setInputValue] = useState('');
  const { clientDocument } = useDocument();

  const handleKeyDown: KeyboardEventHandler = (event) => {
    if (!inputValue) return;
    switch (event.key) {
      case 'Enter':
      case 'Tab':
        setSelected((prev) => [...prev, { label: inputValue, value: inputValue }]);
        setInputValue('');
        event.preventDefault();
    }
  };

  return (
    <div>
      {label ? (
        <div className="label">
          <span className="label-text">{label}</span>
        </div>
      ) : null}

      <CreatableSelect
        options={defaultOptions}
        inputValue={inputValue}
        isClearable
        isMulti
        onChange={(newValue) => setSelected(newValue)}
        onInputChange={(newValue) => setInputValue(newValue)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Start typing to create an option...'}
        value={selected}
        menuPortalTarget={modalTarget ? clientDocument?.getElementById(modalTarget) ?? clientDocument?.body : clientDocument?.body}
      />
    </div>
  );
};
