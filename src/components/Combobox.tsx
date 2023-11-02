import type { Props } from 'react-select';
import CreatableSelect from 'react-select/creatable';

export const comboboxStyles: Props['styles'] = {
  control: (provided, state) => ({
    ...provided,
    borderRadius: 'var(--radii-m)',
    boxShadow: state.isFocused
      ? '0 0 0 2px var(--focus)'
      : '0 0 0 2px transparent',
    borderColor: state.isFocused ? 'var(--focus)' : 'transparent',
    ':hover': {
      borderColor: 'transparent',
    },
    // minHeight: '3.6rem',
    // paddingLeft: '0.3rem',
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: 'var(--space-3xs) var(--space-2xs)',
    fontSize: 'var(--step-0)',
  }),
  multiValue: (provided) => ({
    ...provided,
    borderRadius: 'var(--radii-default)',
    fontSize: 'var(--step-0)',
    padding: 'var(--space-3xs)',
    alignItems: 'center',
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    borderRadius: 'var(--radii-full)',
    marginLeft: '0.2em',
    cursor: 'pointer',
    height: '1em',
    width: '1em',
    flexShrink: 0,
    ':hover': {
      backgroundColor: 'var(--accent8)',
      color: 'var(--accent1)',
    },
  }),
  // option: (provided, state) => ({
  //   ...provided,
  //   color: state.isSelected ? stitchesTheme.colors.text.value : 'inherit',
  //   backgroundColor: state.isSelected
  //     ? stitchesTheme.colors.accent7.value
  //     : 'inherit',
  // }),
};

export const comboboxTheme: Props['theme'] = (theme) => ({
  ...theme,
  colors: {
    ...theme.colors,
    primary: 'var(--accent3)',
    primary25: 'var(--accent4)',
    primary50: 'var(--accent5)',
    primary75: 'var(--accent6)',
    neutral0: 'var(--theme5)',
    neutral5: 'var(--theme6)',
    neutral10: 'var(--theme7)',
    neutral20: 'var(--theme8)',
    neutral30: 'var(--theme9)',
    neutral40: 'var(--theme10)',
    neutral50: 'var(--theme11)',
    neutral60: 'var(--theme12)',
    neutral70: 'var(--theme12)',
    neutral80: 'var(--theme12)',
    neutral90: 'var(--theme12)',
  },
});

export const Combobox = ({ value, options, ...rest }: Props) => (
  <CreatableSelect
    isMulti
    value={value}
    options={options}
    theme={comboboxTheme}
    styles={comboboxStyles}
    {...rest}
  />
);
