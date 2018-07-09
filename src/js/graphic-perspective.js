import scrollama from 'scrollama';
import stickyfill from 'stickyfilljs';
import convertTimestampToDate from './convert-timestamp-to-date';

const MARGIN = { top: 10, bottom: 40, left: 10, right: 10 };
let width = 0;
let height = 0;
let peopleData = null;
let pageviewData = null;
let beyonceData = null;

const $section = d3.select('#perspective');
const $text = $section.select('.scroll__text');
const $graphic = $section.select('.scroll__graphic');
const $chart = $graphic.select('.graphic__chart');
const $svg = $chart.select('svg');
const $gVis = $svg.select('.g-vis');
const $gAxis = $svg.select('.g-axis');

let currentStep = 'context'

const STEP = {
	context: () => {
		// scales
		const scaleX = d3
			.scaleTime()
			.domain(d3.extent(beyonceData, d => d.date))
			.range([0, width]);

		const maxY = d3.max(beyonceData, d => d.views_adjusted);

		const scaleY = d3
			.scaleLinear()
			.domain([0, maxY])
			.range([height, 0]);

		// line function
		const line = d3
			.line()
			.x(d => scaleX(d.date))
			.y(d => scaleY(d.views_adjusted))
			.curve(d3.curveMonotoneX)
			.defined(d => d.views_adjusted);

		// axis
		// const axisY = d3.axisLeft(scaleY)
		// $axisY.call(axisY);

		// const axisX = d3.axisBottom(scaleX);
		// $axisX.call(axisX).at('transform', `translate(0, ${height})`);

		const $person = $gVis
			.select('.beyonce')
			.selectAll('.person')
			.data([beyonceData]);

		const $personEnter = $person.enter().append('g.person');
		$personEnter.append('path');

		$personEnter
			.selectAll('circle')
			.data(d => d)
			.enter()
			.append('circle')
			.at({
				cx: 0,
				cy: 0,
				r: 3
			});

		const $personMerge = $personEnter.merge($person);
		$personMerge
			.select('path')
			.datum(d => d)
			.at('d', line);

		$personMerge
			.selectAll('circle')
			.at(
				'transform',
				d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`
			);
	}
};

function updateDimensions() {
	const h = window.innerHeight;
	height = Math.floor(h * 0.8) - MARGIN.top - MARGIN.bottom;
	width = $chart.node().offsetWidth - MARGIN.left - MARGIN.right;
}

function resize() {
	updateDimensions();
	$svg.at({
		width: width + MARGIN.left + MARGIN.right,
		height: height + MARGIN.top + MARGIN.bottom
	});
	$gVis.at('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);
	STEP[currentStep]()
}

function cleanPeopleData(data) {
	return data.map(d => ({
		...d,
		max_change_before_share: +d.max_change_before_share,
		median_views_before: +d.median_views_before,
		median_share_before: +d.median_share_before,
		max_views: +d.max_views,
		max_share: +d.max_share,
		thumbnail_width: +d.thumbnail_width,
		thumbnail_height: +d.thumbnail_height,
		year_of_birth: +d.year_of_birth,
		year_of_death: +d.year_of_death
	}));
}

function cleanPageviewData(data) {
	return data.map(d => ({
		...d,
		bin: +d.bin,
		bin_death_index: +d.bin_death_index,
		views: +d.views,
		views_adjusted: +d.views_adjusted,
		share: +d.share,
		date: convertTimestampToDate(d.timestamp)
	}));
}

function loadData() {
	return new Promise((resolve, reject) => {
		const filenames = ['people', 'pageviews-bin-2', 'beyonce-pageviews-bin-2'];
		const filepaths = filenames.map(f => `assets/data/${f}.csv`);
		d3.loadData(...filepaths, (err, response) => {
			if (err) reject(err);
			peopleData = cleanPeopleData(response[0]);
			pageviewData = cleanPageviewData(response[1]);
			// filter beyonce to Mar - May
			const dateMarch = new Date(2016, 2, 1);
			const dateMay = new Date(2016, 5, 1);
			beyonceData = cleanPageviewData(response[2]).filter(
				d => d.date >= dateMarch && d.date < dateMay
			);
			resolve();
		});
	});
}

function init() {
	loadData().then(() => {
		resize();
	});
}

export default { init, resize };
