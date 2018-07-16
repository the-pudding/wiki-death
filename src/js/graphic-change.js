import cleanData from './clean-data';

let peopleData = null;

const $section = d3.select('#change');
const $figure = $section.select('figure');
const $tbody = $figure.select('tbody');

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
		.range([0.1, 0.9]);

	const $tr = $tbody
		.selectAll('tr')
		.data(peopleData)
		.enter()
		.append('tr');

	$tr.append('td.name').text(d => d.display.replace(/\(.*\)/g, '').trim());
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
		.st('background-color', d => `rgba(255, 0, 0, ${scale(d.change)})`);
}

function loadData() {
	return new Promise((resolve, reject) => {
		const filenames = ['people'];
		const filepaths = filenames.map(f => `assets/data/${f}.csv`);
		d3.loadData(...filepaths, (err, response) => {
			if (err) reject(err);
			const tempPeopleData = cleanData.people(response[0]);
			peopleData = tempPeopleData.map(d => ({
				...d,
				change: d.death_views_adjusted_2 / d.median_views_adjusted_bd_2
			}));
			resolve();
		});
	});
}

function init() {
	loadData().then(() => {
		setupChart();
	});
}

export default { init };
