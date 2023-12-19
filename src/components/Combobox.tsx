import type { Props, StylesConfig } from 'react-select';
import CreatableSelect from 'react-select/creatable';

export const comboboxStyles: StylesConfig<
  {
    label: string | null;
    value: string | null;
  }[],
  true
> = {
  // @ts-ignore
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'var(--theme2)',
    borderRadius: 'var(--radii-m)',
    boxShadow: state.isFocused
      ? '0 0 0 2px var(--focus)'
      : '0 0 0 2px transparent',
    borderWidth: '2px',
    borderColor: state.isFocused ? 'var(--theme6)' : 'var(--theme6)',
  }),
  // @ts-ignore
  valueContainer: (provided) => ({
    ...provided,
    padding: 'var(--space-3xs) var(--space-2xs)',
    fontSize: 'var(--step--1)',
  }),
  // @ts-ignore
  multiValue: (provided) => ({
    ...provided,
    borderRadius: 'var(--radii-default)',
    fontSize: 'var(--step--1)',
    padding: 'var(--space-3xs)',
    alignItems: 'center',
  }),
  // @ts-ignore
  multiValueRemove: (provided) => ({
    ...provided,
    borderRadius: 'var(--radii-full)',
    marginLeft: '0.2em',
    cursor: 'pointer',
    height: '1.5em',
    width: '1.5em',
    flexShrink: 0,
    ':hover': {
      backgroundColor: 'var(--theme8)',
      color: 'var(--theme12)',
    },
    svg: {
      height: '20px',
      width: '20px',
    },
  }),
  // @ts-ignore
  option: (provided) => ({
    ...provided,
    fontSize: 'var(--step--1)',
  }),
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
    // @ts-ignore
    styles={comboboxStyles}
    {...rest}
  />
);
