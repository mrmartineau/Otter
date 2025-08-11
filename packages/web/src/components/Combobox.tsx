import type { Props, StylesConfig } from 'react-select'
import CreatableSelect from 'react-select/creatable'

export const comboboxStyles: StylesConfig<
  {
    label: string | null
    value: string | null
  }[],
  true
> = {
  // @ts-ignore
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'var(--theme2)',
    borderColor: state.isFocused ? 'var(--theme6)' : 'var(--theme6)',
    borderRadius: 'var(--radii-l)',
    borderWidth: '2px',
    boxShadow: state.isFocused
      ? '0 0 0 2px var(--focus)'
      : '0 0 0 2px transparent',
  }),
  // @ts-ignore
  multiValue: (provided) => ({
    ...provided,
    alignItems: 'center',
    borderRadius: 'var(--radii-default)',
    fontSize: 'var(--step--1)',
    padding: 'var(--space-3xs)',
  }),
  // @ts-ignore
  multiValueRemove: (provided) => ({
    ...provided,
    ':hover': {
      backgroundColor: 'var(--theme8)',
      color: 'var(--theme12)',
    },
    borderRadius: 'var(--radii-full)',
    cursor: 'pointer',
    flexShrink: 0,
    height: '1.5em',
    marginLeft: '0.2em',
    svg: {
      height: '20px',
      width: '20px',
    },
    width: '1.5em',
  }),
  // @ts-ignore
  option: (provided) => ({
    ...provided,
    fontSize: 'var(--step--1)',
  }),
  // @ts-ignore
  valueContainer: (provided) => ({
    ...provided,
    fontSize: 'var(--step--1)',
    padding: 'var(--space-3xs) var(--space-2xs)',
  }),
}

export const comboboxTheme: Props['theme'] = (theme) => ({
  ...theme,
  colors: {
    ...theme.colors,
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
    primary: 'var(--accent3)',
    primary25: 'var(--accent4)',
    primary50: 'var(--accent5)',
    primary75: 'var(--accent6)',
  },
})

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
)
