import type { AtlasExample } from 'vite-plugin-atlas/types'
import { Flex } from './Flex'

const box = (color: string, label: string) => (
	<div
		style={{
			backgroundColor: color,
			padding: '8px 16px',
			borderRadius: 4,
			color: 'white',
			fontWeight: 600,
			fontSize: 14,
		}}
	>
		{label}
	</div>
)

export const Row: AtlasExample = () => (
	<Flex direction="row" gap="m">
		{box('#e74c3c', 'A')}
		{box('#3498db', 'B')}
		{box('#2ecc71', 'C')}
	</Flex>
)
Row.description = 'Default row direction with medium gap'

export const Column: AtlasExample = () => (
	<Flex direction="column" gap="m">
		{box('#e74c3c', 'A')}
		{box('#3498db', 'B')}
		{box('#2ecc71', 'C')}
	</Flex>
)
Column.description = 'Column direction with medium gap'

export const RowReverse: AtlasExample = () => (
	<Flex direction="rowReverse" gap="m">
		{box('#e74c3c', 'A')}
		{box('#3498db', 'B')}
		{box('#2ecc71', 'C')}
	</Flex>
)
RowReverse.description = 'Row reverse direction'

export const ColumnReverse: AtlasExample = () => (
	<Flex direction="columnReverse" gap="m">
		{box('#e74c3c', 'A')}
		{box('#3498db', 'B')}
		{box('#2ecc71', 'C')}
	</Flex>
)
ColumnReverse.description = 'Column reverse direction'

export const InlineDisplay: AtlasExample = () => (
	<Flex display="inline" gap="s">
		{box('#9b59b6', 'Inline')}
		{box('#e67e22', 'Flex')}
	</Flex>
)
InlineDisplay.description = 'Inline flex display'

export const AlignCenter: AtlasExample = () => (
	<Flex align="center" gap="m" style={{ height: 100, border: '1px dashed #ccc' }}>
		{box('#e74c3c', 'Short')}
		<div
			style={{
				backgroundColor: '#3498db',
				padding: '24px 16px',
				borderRadius: 4,
				color: 'white',
				fontWeight: 600,
			}}
		>
			Tall
		</div>
		{box('#2ecc71', 'Short')}
	</Flex>
)
AlignCenter.description = 'Items aligned to center'

export const AlignStart: AtlasExample = () => (
	<Flex align="start" gap="m" style={{ height: 100, border: '1px dashed #ccc' }}>
		{box('#e74c3c', 'A')}
		{box('#3498db', 'B')}
		{box('#2ecc71', 'C')}
	</Flex>
)
AlignStart.description = 'Items aligned to start'

export const AlignEnd: AtlasExample = () => (
	<Flex align="end" gap="m" style={{ height: 100, border: '1px dashed #ccc' }}>
		{box('#e74c3c', 'A')}
		{box('#3498db', 'B')}
		{box('#2ecc71', 'C')}
	</Flex>
)
AlignEnd.description = 'Items aligned to end'

export const AlignStretch: AtlasExample = () => (
	<Flex align="stretch" gap="m" style={{ height: 100, border: '1px dashed #ccc' }}>
		{box('#e74c3c', 'A')}
		{box('#3498db', 'B')}
		{box('#2ecc71', 'C')}
	</Flex>
)
AlignStretch.description = 'Items stretched to fill container'

export const AlignBaseline: AtlasExample = () => (
	<Flex align="baseline" gap="m" style={{ border: '1px dashed #ccc' }}>
		<div style={{ fontSize: 24, padding: 8, backgroundColor: '#e74c3c', color: 'white', borderRadius: 4 }}>
			Large
		</div>
		<div style={{ fontSize: 12, padding: 8, backgroundColor: '#3498db', color: 'white', borderRadius: 4 }}>
			Small
		</div>
	</Flex>
)
AlignBaseline.description = 'Items aligned to baseline'

export const JustifyBetween: AtlasExample = () => (
	<Flex justify="between">
		{box('#e74c3c', 'Start')}
		{box('#3498db', 'Middle')}
		{box('#2ecc71', 'End')}
	</Flex>
)
JustifyBetween.description = 'Space between items'

export const JustifyCenter: AtlasExample = () => (
	<Flex justify="center" gap="m">
		{box('#e74c3c', 'A')}
		{box('#3498db', 'B')}
	</Flex>
)
JustifyCenter.description = 'Items centered horizontally'

export const JustifyEnd: AtlasExample = () => (
	<Flex justify="end" gap="m">
		{box('#e74c3c', 'A')}
		{box('#3498db', 'B')}
	</Flex>
)
JustifyEnd.description = 'Items justified to end'

export const Wrapping: AtlasExample = () => (
	<Flex wrap="wrap" gap="s" style={{ maxWidth: 200, border: '1px dashed #ccc', padding: 8 }}>
		{box('#e74c3c', 'A')}
		{box('#3498db', 'B')}
		{box('#2ecc71', 'C')}
		{box('#9b59b6', 'D')}
		{box('#e67e22', 'E')}
	</Flex>
)
Wrapping.description = 'Items wrap to the next line'

export const NoWrap: AtlasExample = () => (
	<Flex wrap="noWrap" gap="s" style={{ maxWidth: 200, border: '1px dashed #ccc', padding: 8, overflow: 'hidden' }}>
		{box('#e74c3c', 'A')}
		{box('#3498db', 'B')}
		{box('#2ecc71', 'C')}
		{box('#9b59b6', 'D')}
	</Flex>
)
NoWrap.description = 'Items do not wrap'

export const GapSmall: AtlasExample = () => (
	<Flex gap="xs">
		{box('#e74c3c', 'A')}
		{box('#3498db', 'B')}
		{box('#2ecc71', 'C')}
	</Flex>
)
GapSmall.description = 'Extra small gap between items'

export const GapLarge: AtlasExample = () => (
	<Flex gap="xl">
		{box('#e74c3c', 'A')}
		{box('#3498db', 'B')}
		{box('#2ecc71', 'C')}
	</Flex>
)
GapLarge.description = 'Extra large gap between items'

export const GapXY: AtlasExample = () => (
	<Flex wrap="wrap" gapX="xl" gapY="xs" style={{ maxWidth: 250, border: '1px dashed #ccc', padding: 8 }}>
		{box('#e74c3c', 'A')}
		{box('#3498db', 'B')}
		{box('#2ecc71', 'C')}
		{box('#9b59b6', 'D')}
		{box('#e67e22', 'E')}
	</Flex>
)
GapXY.description = 'Different horizontal (xl) and vertical (xs) gaps'
