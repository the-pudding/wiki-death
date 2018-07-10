import scrollama from 'scrollama';
import stickyfill from 'stickyfilljs';
import cleanData from './clean-data';

const MARGIN = { top: 10, bottom: 40, left: 40, right: 10 };
const FONT_SIZE = 12;
const PRINCE_ID = '57317';
const DATE_MARCH = new Date(2016, 2, 1);
const DATE_JUNE = new Date(2016, 5, 1);
const SEC = 1000;
const DURATION = SEC * 3;

let width = 0;
let height = 0;
let peopleData = null;
let pageviewData = null;
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
const $people = $gVis.select('.people');

const scroller = scrollama();

// helper functions
function getScaleX(data = beyonceData[0].pageviews) {
	// scales
	return d3
		.scaleTime()
		.domain(d3.extent(data, d => d.date))
		.nice()
		.range([0, width]);
}

function getScaleY(data = beyonceData[0].pageviews) {
	const maxY = d3.max(data, d => d.views_adjusted);

	return d3
		.scaleLinear()
		.domain([0, maxY])
		.nice()
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

function updateAxis({ scaleX, scaleY, ticks = d3.timeMonth.every(1) }) {
	const axisY = d3
		.axisLeft(scaleY)
		.tickFormat(d3.format('.2s'))
		.tickSize(-width)
		.ticks(5);

	$gAxis
		.select('.axis--y')
		.call(axisY)
		.at('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);

	function multiFormat(date) {
		return (d3.timeYear(date) < date
			? d3.timeFormat('%b')
			: d3.timeFormat('%Y'))(date);
	}

	const axisX = d3
		.axisBottom(scaleX)
		.ticks(ticks)
		.tickSize(0)
		.tickPadding(FONT_SIZE * 2)
		.tickFormat(multiFormat);

	$gAxis
		.select('.axis--x')
		.call(axisX)
		.at('transform', `translate(${MARGIN.left}, ${height})`);
}

function resetLine($person, offset) {
	const $path = $person.select('path');
	const totalLength = $path.node().getTotalLength();
	const dashOffset = offset ? totalLength - offset : totalLength;

	$path.at({
		'stroke-dasharray': `${totalLength} ${totalLength}`,
		'stroke-dashoffset': dashOffset
	});
}

function enterPerson($enter) {
	const $person = $enter.append('g.person').at('data-id', d => d.pageid);
	$person.append('path');
	$person.append('g.circles');
}

function enterCircles($person, { scaleX, scaleY }) {
	$person
		.select('.circles')
		.selectAll('circle')
		.data(d => d.pageviews)
		.enter()
		.append('circle')
		.classed('is-not-death-index', true)
		.at({
			cx: 0,
			cy: 0,
			r: 4
		})
		.at(
			'transform',
			d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`
		);
}

function trimPageviews(pageviews, endDate) {
	return pageviews
		.map(p => ({ ...p }))
		.filter(p => p.date >= DATE_MARCH && p.date < endDate);
}

// step render
const STEP = {
	context: ({ reverse, leave }) => {
		// DATA
		const data = beyonceData;

		// SCALE
		const scaleX = getScaleX();
		const scaleY = getScaleY();

		// AXIS
		updateAxis({ scaleX, scaleY });

		// PEOPLE
		const line = getLine({ scaleX, scaleY });

		const $person = $people.selectAll('.person').data(data, d => d.pageid);
		const $personEnter = $person.enter().call(enterPerson);
		const $personMerge = $personEnter.merge($person);
		$personMerge
			.select('path')
			.datum(d => d.pageviews)
			.at('d', line);

		$personMerge.call(enterCircles, { scaleX, scaleY });
	},

	'prince-before': ({ reverse, leave }) => {
		// DATA

		const dateBeforeSpike = new Date(2016, 3, 21);
		const data = peopleData
			.filter(d => d.pageid === PRINCE_ID)
			.map(d => ({
				...d,
				pageviews: trimPageviews(d.pageviews, dateBeforeSpike)
			}))
			.concat(beyonceData);

		// SCALE
		const scaleX = getScaleX();
		const scaleY = getScaleY();

		// AXIS
		updateAxis({ scaleX, scaleY });

		// PEOPLE
		const line = getLine({ scaleX, scaleY });

		const $person = $people.selectAll('.person').data(data, d => d.pageid);
		const $personEnter = $person.enter().call(enterPerson);
		const $personMerge = $personEnter.merge($person);
		
		$personMerge
			.select('path')
			.datum(d => d.pageviews)
			.at('d', line);

		$personMerge.call(enterCircles, { scaleX, scaleY });

		// $personMerge
		// 	.select('path')
		// 	.datum(d =>
		// 		d.pageviews.filter(
		// 			p => p.date >= DATE_MARCH && p.date < dateBeforeSpike
		// 		)
		// 	)
		// 	.at('d', line);

		// // // animate in line
		// $personMerge.call(resetLine);

		// $personMerge
		// 	.select('path')
		// 	.transition()
		// 	.duration(DURATION)
		// 	.at('stroke-dashoffset', 0);

		// $personMerge
		// 	.selectAll('circle')
		// 	.at(
		// 		'transform',
		// 		d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`
		// 	);

		// // CLEANUP
		// if (leave && reverse) {
		// 	$person
		// 		.data([])
		// 		.exit()
		// 		.remove();
		// }
	},
	'prince-spike': () => {
		const dateBeforeSpike = new Date(2016, 3, 21);
		const dateSpike = new Date(2016, 3, 22);

		const data = peopleData.filter(d => d.pageid === PRINCE_ID);

		// SCALE
		const scaleX = getScaleX();
		const scaleY = getScaleY(
			data[0].pageviews.filter(d => d.date >= DATE_MARCH && d.date < dateSpike)
		);

		// AXIS
		updateAxis({ scaleX, scaleY });

		// PEOPLE
		const line = getLine({ scaleX, scaleY });

		const addSpike = () => {
			const $person = $gVis
				.select('.deaths')
				.selectAll('.person')
				.data(data, d => d.pageid);

			const $personEnter = $person.enter().append('g.person');
			$personEnter.append('path');

			const $personMerge = $personEnter.merge($person);
			const previousLen = $personMerge
				.select('path')
				.node()
				.getTotalLength();

			$personMerge
				.select('path')
				.datum(d =>
					d.pageviews.filter(p => p.date >= DATE_MARCH && p.date < dateSpike)
				)
				.at('d', line);

			$personMerge.call(resetLine, previousLen);

			$personMerge
				.select('path')
				.transition()
				.duration(DURATION)
				.at('stroke-dashoffset', 0);

			$personMerge
				.selectAll('circle')
				.data(d =>
					d.pageviews.filter(p => p.date >= DATE_MARCH && p.date < dateSpike)
				)
				.enter()
				.append('circle')
				.at({
					cx: 0,
					cy: 0,
					r: 4
				})
				.at(
					'transform',
					d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`
				);
		};
		// transition previous lines
		$gVis
			.selectAll('.beyonce path')
			.transition()
			.duration(DURATION)
			.at('d', line);

		$gVis
			.selectAll('.deaths path')
			// .datum(d =>
			// 	d.pageviews.filter(
			// 		p => p.date >= DATE_MARCH && p.date < dateBeforeSpike
			// 	)
			// )
			.transition()
			.duration(DURATION)
			.at('d', line)
			.on('end', addSpike);

		$gVis
			.selectAll('.person circle')
			.transition()
			.duration(DURATION)
			.at(
				'transform',
				d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`
			);
	},
	others: () => {
		const data = peopleData;

		// SCALE
		const scaleX = getScaleX(pageviewData);
		const scaleY = getScaleY(pageviewData);

		// AXIS
		updateAxis({ scaleX, scaleY, ticks: null });

		// PEOPLE
		const line = getLine({ scaleX, scaleY });

		const addOthers = () => {
			const $person = $gVis
				.select('.deaths')
				.selectAll('.person')
				.data(data, d => d.pageid);

			const $personEnter = $person.enter().append('g.person');
			$personEnter.append('path');

			const $personMerge = $personEnter.merge($person);

			$personMerge
				.select('path')
				.datum(d => d.pageviews)
				.at('d', line)
				.classed('is-transparent', true);

			$personMerge
				.selectAll('circle')
				.data(d => d.pageviews.filter(p => p.bin_death_index === 0))
				.enter()
				.append('circle')
				.at({
					cx: 0,
					cy: 0,
					r: 4
				})
				.at(
					'transform',
					d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`
				);
		};

		$gVis.select('.beyonce').classed('is-transparent', true);
		// const addOthers
		// transition previous lines
		$gVis
			.selectAll('.deaths path')
			.transition()
			.duration(DURATION)
			.at('d', line)
			.on('end', (d, i) => {
				if (i === 0) addOthers();
			});

		$gVis
			.selectAll('.person circle')
			.transition()
			.duration(DURATION)
			.at(
				'transform',
				d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`
			);

		$gVis.selectAll('.is-not-death-index').classed('is-transparent', true);
	}
};

function updateDimensions() {
	const h = window.innerHeight;
	height = Math.floor(h * 0.8) - MARGIN.top - MARGIN.bottom;
	width = $chart.node().offsetWidth - MARGIN.left - MARGIN.right;
}

function updateStep({ reverse = true, leave = false }) {
	console.log({ currentStep, reverse, leave });
	STEP[currentStep]({ reverse, leave });
}

function resize() {
	updateDimensions();
	$svg.at({
		width: width + MARGIN.left + MARGIN.right,
		height: height + MARGIN.top + MARGIN.bottom
	});
	$gVis.at('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);
	$step.st('height', Math.floor(window.innerHeight * 0.9));
	updateStep({});
}

function handleStepEnter({ index, element, direction }) {
	// console.log({ step: 'enter', index, element, direction });
	currentStep = d3.select(element).at('data-step');
	updateStep({ reverse: direction === 'up' });
}

function handleStepExit({ index, element, direction }) {
	updateStep({ reverse: direction === 'up', leave: true });
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
			const tempPeopleData = cleanData.people(response[0]);
			pageviewData = cleanData.pageview(response[1]);
			peopleData = tempPeopleData.map(d => ({
				...d,
				pageviews: pageviewData.filter(p => p.pageid === d.pageid)
			}));

			const beyoncePageviews = cleanData.pageview(response[2]);
			beyonceData = [
				{
					pageid: 'beyonce',
					pageviews: beyoncePageviews.filter(
						d => d.date >= DATE_MARCH && d.date < DATE_JUNE
					)
				}
			];

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
