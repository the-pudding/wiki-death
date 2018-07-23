import cleanData from './clean-data';
import tooltip from './tooltip';

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
const $figure = $section.select('.figure--chart');
const $ul = $figure.select('ul');

let $tip = null;

function handleNameEnter(datum) {
	const m = d3.mouse(this);
	// const sz = this.offsetWidth / 2;
	const [x, y] = d3.mouse($ul.node());
	const pos = { x: x - m[0], y };
	tooltip.show({ el: $tip, d: datum, pos });
}

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

	const $li = $ul
		.selectAll('.week')
		.data(filled)
		.enter()
		.append('li.week');

	$li.append('p.label').html(d => {
		if (d.key === MAX_WEEKS + 1) return `${d.key}+`;
		if (d.key === MAX_WEEKS + 2) return 'TBD';
		return `${d.key}&nbsp;`;
	});

	const $people = $li.append('ul.people');

	const $person = $people
		.selectAll('.person')
		.data(d => d.values)
		.enter()
		.append('li.person')
		.on('mouseenter', handleNameEnter)
		.on('mouseleave', () => {
			tooltip.hide($tip);
		});

	$person
		.append('a')
		.text(d => d.display)
		.at('href', d => d.link)
		.at('target', '_blank');
}

function getWeeksUntilNorm({ last_updated, pageviews }) {
	const len = pageviews.length;
	const { timestamp } = pageviews[len - 1];
	if (timestamp === last_updated) return null;
	return Math.floor(len / 7);
}

function getWeekCategory(week) {
	if (!week && week !== 0) return MAX_WEEKS + 2;
	return week <= MAX_WEEKS ? week : MAX_WEEKS + 1;
}

function setupTooltip() {
	$tip = tooltip.init({ container: $ul });
	$ul.on('mouseleave', () => {
		tooltip.hide($tip);
	});
}

function loadData(people) {
	return new Promise((resolve, reject) => {
		const filenames = ['care'];
		const filepaths = filenames.map(f => `assets/data/${f}.csv`);
		d3.loadData(...filepaths, (err, response) => {
			if (err) reject(err);
			pageviewData = cleanData.pageview(response[0]);
			peopleData = people
				.map(d => ({
					...d,
					pageviews: pageviewData.filter(p => p.pageid === d.pageid)
				}))
				.map(d => {
					const days_until_norm = d.pageviews.length;
					const weeks_until_norm = getWeeksUntilNorm(d);
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

function init(people) {
	loadData(people).then(() => {
		resize();
		setupChart();
		setupTooltip();
	});
}

export default { init, resize };
