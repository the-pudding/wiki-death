import cleanData from './clean-data';
import color from './color';

let peopleData = null;

const $section = d3.select('#change');
const $figure = $section.select('figure');
const $table = $figure.select('table');
const $tbody = $table.select('tbody');
const $btn = $section.select('.btn');

function filter({ name, value }) {
	const $person = $tbody.selectAll('tr');
	if (name) $person.classed('is-faded', d => !d[name].includes(value));
	else $person.classed('is-faded', false);
}

function formatComma(number) {
	return d3.format(',')(Math.round(number));
}

function formatPercent(number) {
	return d3.format(',.0%')(number);
}

function setupChart() {
	peopleData.sort((a, b) => d3.descending(a.change, b.change));
	const extent = d3.extent(peopleData, d => d.change);
	const scale = d3
		.scaleLinear()
		.domain(extent)
		.range([0, 0.8]);

	const $tr = $tbody
		.selectAll('tr')
		.data(peopleData)
		.enter()
		.append('tr');

	const $name = $tr.append('td.name');

	$name
		.append('a')
		.text(d => d.display)
		.at('href', d => d.link)
		.at('target', '_blank');

	$name.append('span').text(d => d.description_short);

	$tr
		.append('td.avg.number')
		.text(d => formatComma(d.median_views_adjusted_bd_2));
	$tr
		.append('td.death.number')
		.text(d => formatComma(d.death_views_adjusted_2));
	$tr
		.append('td.change.number')
		.text((d, i) => {
			const f = formatPercent(d.change);
			return f.replace('%', '');
		})
		.st('background-color', d => {
			const [r, g, b] = color.primary.rgb;
			return `rgba(${r},${g}, ${b}, ${scale(d.change)})`;
		});
}

function setupToggle() {
	$btn.on('click', () => {
		const truncated = $figure.classed('is-truncated');
		const text = truncated ? 'Show Fewer' : 'Show More';
		$btn.text(text);
		$figure.classed('is-truncated', !truncated);

		if (!truncated) {
			const y = +$btn.at('data-y');
			window.scrollTo(0, y);
		}

		$btn.at('data-y', window.scrollY);
		$figure.select('.show-more').classed('is-visible', !truncated);
	});
}

function loadData(people) {
	return new Promise((resolve, reject) => {
		peopleData = people.map(d => ({
			...d,
			change: d.death_views_adjusted_2 / d.median_views_adjusted_bd_2
		}));
		resolve();
	});
}

function resize() {}

function init(people) {
	loadData(people).then(() => {
		resize();
		setupChart();
		setupToggle();
	});
}

export default { init, resize, filter };
