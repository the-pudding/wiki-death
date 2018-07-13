import cleanData from './clean-data';

const MARGIN = { top: 20, bottom: 40, left: 40, right: 20 };
const FONT_SIZE = 12;
const SEC = 1000;
const DURATION = SEC * 3;
const EASE = d3.easeCubicInOut;
const MAX_WEEKS = 12;

let width = 0;
let height = 0;
let peopleData = null;
let pageviewData = null;

const $section = d3.select('#care');
const $graphic = $section.select('.graphic');
const $chart = $graphic.select('.graphic__chart');

const LAST_TIMESTAMP = '20180712'; // UPDATE WITH NEW DATA

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

function setupChart() {
	const nested = d3
		.nest()
		.key(d => d.week_category)
		.entries(peopleData)
		.map(d => ({
			...d,
			key: +d.key
		}));

	const filled = d3.range(MAX_WEEKS + 3).map(i => {
		const match = nested.find(d => d.key === i);
		return match || { key: i, values: [] };
	});

	console.log(filled);
}

function getWeeksUntilNorm(pageviews) {
	const len = pageviews.length;
	const { timestamp } = pageviews[len - 1];
	if (timestamp === LAST_TIMESTAMP) return null;
	return Math.floor(len / 7);
}

function getWeekCategory(week) {
	if (!week && week !== 0) return MAX_WEEKS + 2;
	return week <= MAX_WEEKS ? week : MAX_WEEKS + 1;
}

function loadData() {
	return new Promise((resolve, reject) => {
		const filenames = ['people', 'care'];
		const filepaths = filenames.map(f => `assets/data/${f}.csv`);
		d3.loadData(...filepaths, (err, response) => {
			if (err) reject(err);
			const tempPeopleData = cleanData.people(response[0]);
			pageviewData = cleanData.pageview(response[1]);
			peopleData = tempPeopleData
				.map(d => ({
					...d,
					pageviews: pageviewData.filter(p => p.pageid === d.pageid)
				}))
				.map(d => {
					const days_until_norm = d.pageviews.length;
					const weeks_until_norm = getWeeksUntilNorm(d.pageviews);
					const week_category = getWeekCategory(weeks_until_norm);
					return {
						...d,
						days_until_norm,
						weeks_until_norm,
						week_category
					};
				});

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
