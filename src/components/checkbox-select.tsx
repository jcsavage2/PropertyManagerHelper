import { Option } from '@/types';
import React, { Dispatch, SetStateAction } from 'react';
import { BiCheckbox, BiCheckboxChecked } from 'react-icons/bi';

interface CheckboxSelectProps {
  dropdownLabel: string;
  options: Option[];
  selectedOptions: Record<string, boolean>;
  setSelectedOptions: Dispatch<SetStateAction<Record<string, boolean>>>;
}

const CheckboxSelect = ({ dropdownLabel, options, selectedOptions, setSelectedOptions }: CheckboxSelectProps) => {
  const handleUpdateSelectedOptions = (option: Option) => {
    setSelectedOptions((prev) => {
      return {
        ...prev,
        [option.value]: !prev[option.value],
      };
    });
  };

  //Close the modal when an option is selected
  const handleClick = () => {
    const elem = document.activeElement as HTMLElement;
    if (elem) {
      elem?.blur();
    }
  };

  return (
    <div className="dropdown m-1">
      <div tabIndex={0} role="button" className="btn btn-sm bg-base-300 border border-base-content border-opacity-10">
        {dropdownLabel}
      </div>
      <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
        {options &&
          options.length &&
          options.map((option: Option, index: number) => {
            console.log(option, selectedOptions[option.value]);
            return (
              <li
                key={`${index}-${option.value}`}
                onClick={() => {
                  handleUpdateSelectedOptions(option);
                  handleClick();
                }}
              >
                <label className="cursor-pointer label">
                  <div className="flex flex-row">
                    {/* <input type="checkbox" className="checkbox" /> */}
                    {selectedOptions[option.value] ? (
                      <BiCheckboxChecked className="justify-self-end my-auto flex-end" size={'1.5em'} />
                    ) : (
                      <BiCheckbox className="justify-self-end my-auto flex-end" size={'1.5em'} />
                    )}
                    <span className="label-text ml-3">{option.label}</span>
                  </div>
                </label>
              </li>
            );
          })}
      </ul>
    </div>
  );
};

export default CheckboxSelect;
