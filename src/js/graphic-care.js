import cleanData from './clean-data';

const MARGIN = { top: 20, bottom: 40, left: 40, right: 20 };
const FONT_SIZE = 12;
const SEC = 1000;
const DURATION = SEC * 3;
const EASE = d3.easeCubicInOut;

let width = 0;
let height = 0;
let peopleData = null;
let pageviewData = null;

const $section = d3.select('#care');
const $graphic = $section.select('.graphic');
const $chart = $graphic.select('.graphic__chart');

function updateDimensions() {
	const h = window.innerHeight;
	// height = Math.floor(h * 0.8) - MARGIN.top - MARGIN.bottom;
	// width = $chart.node().offsetWidth - MARGIN.left - MARGIN.right;
	height = 0;
	width = 0;
}

function resize() {
	updateDimensions();
	// $svg.at({
	// 	width: width + MARGIN.left + MARGIN.right,
	// 	height: height + MARGIN.top + MARGIN.bottom
	// });
}

function calculateNormal(datum) {
	const { mean_views_adjusted_before, std } = datum;
	const views = datum.pageviews
		.filter(d => d.bin_death_index > 0)
		.filter(d => d.views_adjusted < mean_views_adjusted_before + std * 2);
	const match = views.shift();

	return {
		// ...datum,
		name: datum.name,
		std: Math.round(datum.std),
		mean_views_adjusted_before: Math.round(mean_views_adjusted_before),
		count_until_norm: match ? match.bin_death_index : 999
	};
}

function setupChart() {
	const withNorm = peopleData.map(calculateNormal);
	console.table(
		withNorm.sort((a, b) =>
			d3.descending(a.count_until_norm, b.count_until_norm)
		)
	);
	const nested = d3
		.nest()
		.key(d => d.count_until_norm)
		.rollup(v => v.length)
		.entries(withNorm);
	console.table(nested.sort((a, b) => d3.ascending(+a.key, +b.key)));
}

function loadData() {
	return new Promise((resolve, reject) => {
		const filenames = ['people', 'pageviews-bin-2'];
		const filepaths = filenames.map(f => `assets/data/${f}.csv`);
		d3.loadData(...filepaths, (err, response) => {
			if (err) reject(err);
			const tempPeopleData = cleanData.people(response[0]);
			pageviewData = cleanData.pageview(response[1]);
			peopleData = tempPeopleData.map(d => ({
				...d,
				pageviews: pageviewData.filter(p => p.pageid === d.pageid)
			}));
			resolve();
		});
	});
}

function init() {
	loadData().then(() => {
		resize();
		setupChart();
	});
}

export default { init, resize };
