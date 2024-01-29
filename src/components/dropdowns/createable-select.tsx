import { useDocument } from '@/hooks/use-document';
import { Option } from '@/types';
import React, { KeyboardEventHandler, useEffect, useState } from 'react';
import CreatableSelect from 'react-select/creatable';

type CreatableSelectProps = {
  modalTarget?: string;
  defaultOptions: Option[];
  setOptions: React.Dispatch<React.SetStateAction<string[]>>;
  placeholder?: string;
  label?: string;
};

export const CreateableSelect = ({ defaultOptions, setOptions, modalTarget, placeholder, label }: CreatableSelectProps) => {
  const [inputValue, setInputValue] = useState('');
  const { clientDocument } = useDocument();
  const [createdOptions, setCreatedOptions] = useState<readonly Option[]>([]);

  const handleKeyDown: KeyboardEventHandler = (event) => {
    if (!inputValue) return;
    switch (event.key) {
      case 'Enter':
      case 'Tab':
        setCreatedOptions((prev) => [...prev, { label: inputValue, value: inputValue }]);
        setInputValue('');
        event.preventDefault();
    }
  };

  useEffect(() => {
    setOptions(createdOptions.map((option) => option.value));
  }, [createdOptions]);

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
        onChange={(newValue) => setCreatedOptions(newValue)}
        onInputChange={(newValue) => setInputValue(newValue)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Start typing to create an option...'}
        value={createdOptions}
        menuPortalTarget={modalTarget ? clientDocument?.getElementById(modalTarget) ?? clientDocument?.body : clientDocument?.body}
      />
    </div>
  );
};
