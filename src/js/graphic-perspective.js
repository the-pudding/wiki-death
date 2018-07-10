import scrollama from 'scrollama';
import stickyfill from 'stickyfilljs';
import cleanData from './clean-data';

const MARGIN = { top: 10, bottom: 40, left: 40, right: 10 };
const FONT_SIZE = 12;
const PRINCE_ID = '57317';
const DATE_MARCH = new Date(2016, 2, 1);
const DATE_JUNE = new Date(2016, 5, 1);

let width = 0;
let height = 0;
let peopleData = null;
let pageviewData = null;
let princeData = null;
let beyonceData = null;
let currentStep = 'context';

const $section = d3.select('#perspective');
const $text = $section.select('.scroll__text');
const $step = $text.selectAll('.step');
const $graphic = $section.select('.scroll__graphic');
const $chart = $graphic.select('.graphic__chart');
const $svg = $chart.select('svg');
const $gVis = $svg.select('.g-vis');
const $gAxis = $svg.select('.g-axis');

const scroller = scrollama();

function getScaleX(data) {
	// scales
	return d3
		.scaleTime()
		.domain(d3.extent(data, d => d.date))
		.nice()
		.range([0, width]);
}

function getScaleY(data) {
	const maxY = d3.max(data, d => d.views_adjusted);

	return d3
		.scaleLinear()
		.domain([0, maxY])
		.range([height, 0]);
}

function getLine({ scaleX, scaleY }) {
	return d3
		.line()
		.x(d => scaleX(d.date))
		.y(d => scaleY(d.views_adjusted))
		.curve(d3.curveMonotoneX)
		.defined(d => d.views_adjusted);
}

function updateAxis({ scaleX, scaleY }) {
	const axisY = d3
		.axisLeft(scaleY)
		.tickFormat(d3.format('.2s'))
		.tickSize(-width + MARGIN.left)
		.ticks(5);

	$gAxis
		.select('.axis--y')
		.call(axisY)
		.at('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);

	const axisX = d3
		.axisBottom(scaleX)
		.ticks(d3.timeMonth.every(1))
		.tickSize(0)
		.tickPadding(FONT_SIZE / 2);

	$gAxis
		.select('.axis--x')
		.call(axisX)
		.at('transform', `translate(${MARGIN.left}, ${height})`);
}

const STEP = {
	context: () => {
		// DATA
		const data = beyonceData.filter(
			d => d.date >= DATE_MARCH && d.date < DATE_JUNE
		);

		// SCALE
		const scaleX = getScaleX(data);
		const scaleY = getScaleY(data);

		// AXIS
		updateAxis({ scaleX, scaleY });

		// PEOPLE
		const line = getLine({ scaleX, scaleY });

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
				r: 4
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
	},
	'prince-before': () => {
		// DATA
		const axisData = beyonceData.filter(
			d => d.date >= DATE_MARCH && d.date < DATE_JUNE
		);

		const dateSpike = new Date(2016, 3, 21);
		const data = princeData.filter(
			d => d.date >= DATE_MARCH && d.date < dateSpike
		);

		// SCALE
		const scaleX = getScaleX(axisData);
		const scaleY = getScaleY(axisData);

		// AXIS
		updateAxis({ scaleX, scaleY });

		// PEOPLE
	},
	'prince-spike': () => {
		const data = princeData.filter(
			d => d.date >= DATE_MARCH && d.date < DATE_JUNE
		);

		// SCALE
		const scaleX = getScaleX(data);
		const scaleY = getScaleY(data);

		// AXIS
		updateAxis({ scaleX, scaleY });

		// PEOPLE
	},
	others: () => {}
};

function updateDimensions() {
	const h = window.innerHeight;
	height = Math.floor(h * 0.8) - MARGIN.top - MARGIN.bottom;
	width = $chart.node().offsetWidth - MARGIN.left - MARGIN.right;
}

function updateStep() {
	console.log({ currentStep });
	STEP[currentStep]();
}

function resize() {
	updateDimensions();
	$svg.at({
		width: width + MARGIN.left + MARGIN.right,
		height: height + MARGIN.top + MARGIN.bottom
	});
	$gVis.at('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);
	$step.st('height', Math.floor(window.innerHeight * 0.9));
	updateStep();
}

function handleStepEnter({ index, element, direction }) {
	// console.log({ step: 'enter', index, element, direction });
	currentStep = d3.select(element).at('data-step');
	updateStep();
}

function handleStepExit({ index, element, direction }) {
	// console.log({ step: 'exit', index, element, direction });
}

function setupScroller() {
	scroller
		.setup({
			step: $step.nodes()
		})
		.onStepEnter(handleStepEnter)
		.onStepExit(handleStepExit);
}

function loadData() {
	return new Promise((resolve, reject) => {
		const filenames = ['people', 'pageviews-bin-2', 'beyonce-pageviews-bin-2'];
		const filepaths = filenames.map(f => `assets/data/${f}.csv`);
		d3.loadData(...filepaths, (err, response) => {
			if (err) reject(err);
			peopleData = cleanData.people(response[0]);
			pageviewData = cleanData.pageview(response[1]);
			princeData = pageviewData.filter(d => d.pageid === PRINCE_ID);

			beyonceData = cleanData.pageview(response[2]);
			resolve();
		});
	});
}

function init() {
	loadData().then(() => {
		resize();
		setupScroller();
	});
}

export default { init, resize };
