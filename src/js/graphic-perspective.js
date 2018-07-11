import scrollama from 'scrollama';
import stickyfill from 'stickyfilljs';
import cleanData from './clean-data';

const MARGIN = { top: 10, bottom: 40, left: 40, right: 10 };
const FONT_SIZE = 12;
const PRINCE_ID = '57317';
const DATE_MARCH = new Date(2016, 2, 1);
const DATE_JUNE = new Date(2016, 5, 1);
const DATE_BEFORE_SPIKE = new Date(2016, 3, 21);
const DATE_SPIKE = new Date(2016, 3, 22);
const MIN_R = 3;
const MAX_R = 12;
const SEC = 1000;
const DURATION = SEC;
const DURATION_EXIT = DURATION / 2;
const EASE = d3.easeCubicInOut;

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

function getScaleR(data) {
	return d3
		.scaleSqrt()
		.domain(d3.extent(data, d => d.max_views_adjusted))
		.nice()
		.range([MIN_R, MAX_R]);
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
	const $path = $person.selectAll('path');

	const totalLength = $path.node().getTotalLength();
	const dashOffset = offset ? totalLength - offset : totalLength;

	$path.at({
		'stroke-dasharray': `${totalLength} ${totalLength}`,
		'stroke-dashoffset': dashOffset
	});
}

function enterPerson($person) {
	$person.at('data-id', d => d.pageid);
	$person.append('path');
	$person.append('g.circles');
}

function enterCircles($person, { scaleX, scaleY, r = MIN_R }) {
	$person
		.select('.circles')
		.selectAll('circle')
		.data(
			d =>
				d.pageviews.filter(
					p =>
						['beyonce', PRINCE_ID].includes(p.pageid) || p.bin_death_index === 0
				),
			k => k.timestamp
		)
		.enter()
		.append('circle')
		.classed('is-not-death-index', d => d.bin_death_index !== 0)
		.at({
			cx: 0,
			cy: 0,
			r
		})
		.at(
			'transform',
			d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`
		);
}

function updatePath($person, { scaleX, scaleY }) {
	const line = getLine({ scaleX, scaleY });
	$person
		.selectAll('path')
		.data(d => [d.pageviews])
		.at('d', line);
}

function trimPageviews(pageviews, { start = -1, end = 0 }) {
	return pageviews
		.map(p => ({ ...p }))
		.filter(p => p.bin_death_index >= start && p.bin_death_index <= end);
}

function findPrinceStart(date) {
	const data = peopleData.find(d => d.pageid === PRINCE_ID).pageviews;

	const views = data.map((d, i) => ({ i, date: d.date, diff: d.date - date }));
	const filtered = views.filter(d => d.diff > 0);
	return data[filtered[0].i].bin_death_index;
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
		const $person = $people.selectAll('.person').data(data, d => d.pageid);
		const $personEnter = $person
			.enter()
			.append('g.person')
			.call(enterPerson);
		const $personMerge = $personEnter.merge($person);
		$personMerge.call(updatePath, { scaleX, scaleY });
		$personMerge.call(enterCircles, { scaleX, scaleY });

		// highlight beyonce
		$personMerge.classed('is-highlight', true);
	},
	'prince-before': ({ reverse, leave }) => {
		// DATA
		const start = findPrinceStart(DATE_MARCH);
		const data = peopleData
			.filter(d => d.pageid === PRINCE_ID)
			.map(d => ({
				...d,
				pageviews: trimPageviews(d.pageviews, { start, end: -1 })
			}))
			.concat(beyonceData);

		// SCALE
		const scaleX = getScaleX();
		const scaleY = getScaleY();

		// AXIS
		updateAxis({ scaleX, scaleY });

		// PEOPLE
		const $person = $people.selectAll('.person').data(data, d => d.pageid);
		const $personEnter = $person
			.enter()
			.append('g.person')
			.call(enterPerson);
		const $personMerge = $personEnter.merge($person);
		$personMerge.call(updatePath, { scaleX, scaleY });
		$personMerge.call(enterCircles, { scaleX, scaleY, r: 0 });

		const $prince = $personMerge.filter(d => d.pageid === PRINCE_ID);

		$prince.call(resetLine);
		$prince
			.selectAll('path')
			.transition()
			.duration(DURATION)
			.ease(EASE)
			.at('stroke-dashoffset', 0);

		$prince
			.selectAll('circle')
			.transition()
			.duration(SEC)
			.delay((d, i, n) => (i / n.length) * DURATION)
			.ease(EASE)
			.at('r', d => (d.bin_death_index === 0 ? MAX_R : MIN_R));

		// highlight prince
		$personMerge.classed('is-highlight', d => d.pageid === PRINCE_ID);
		$personMerge.filter(d => d.pageid === PRINCE_ID).raise();

		// // CLEANUP
		// if (leave && reverse) {
		// 	$person
		// 		.data([])
		// 		.exit()
		// 		.remove();
		// }
	},
	'prince-spike': () => {
		// DATA
		const start = findPrinceStart(DATE_MARCH);
		const data = peopleData
			.filter(d => d.pageid === PRINCE_ID)
			.map(d => ({
				...d,
				pageviews: trimPageviews(d.pageviews, { start, end: 0 })
			}))
			.concat(beyonceData);

		// SCALE
		const princeViews = data.find(d => d.pageid === PRINCE_ID).pageviews;
		const scaleX = getScaleX();
		const scaleY = getScaleY(princeViews);

		// AXIS
		updateAxis({ scaleX, scaleY });

		// PEOPLE
		const $person = $people.selectAll('.person').data(data, d => d.pageid);
		const $personEnter = $person
			.enter()
			.append('g.person')
			.call(enterPerson);
		const $personMerge = $personEnter.merge($person);

		// TRANSITION
		const addSpike = () => {
			const $prince = $personMerge.filter(d => d.pageid === PRINCE_ID);

			const previousLen = $prince
				.selectAll('path')
				.node()
				.getTotalLength();

			$personMerge.call(updatePath, { scaleX, scaleY });
			$personMerge.call(enterCircles, { scaleX, scaleY, r: 0 });

			$prince.call(resetLine, previousLen);

			$prince
				.selectAll('path')
				.transition()
				.duration(DURATION)
				.ease(EASE)
				.at('stroke-dashoffset', 0);

			$prince
				.selectAll('circle')
				.transition()
				.duration(SEC)
				.delay((d, i, n) => (i / n.length) * DURATION)
				.ease(EASE)
				.at('r', d => (d.bin_death_index === 0 ? MAX_R : MIN_R));
		};

		const line = getLine({ scaleX, scaleY });

		$personMerge
			.selectAll('path')
			.transition()
			.duration(DURATION)
			.ease(EASE)
			.at('d', line)
			.on('end', d => {
				if (d[0].pageid === PRINCE_ID) addSpike();
			});

		$personMerge
			.selectAll('circle')
			.transition()
			.duration(DURATION)
			.ease(EASE)
			.at(
				'transform',
				d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`
			);

		// highlight prince
		$personMerge.classed('is-highlight', d => d.pageid === PRINCE_ID);
		$personMerge.filter(d => d.pageid === PRINCE_ID).raise();
	},
	others: () => {
		// DATA
		const data = peopleData.map(d => ({
			...d,
			pageviews: trimPageviews(d.pageviews, { start: -30, end: 0 })
		}));

		// SCALE
		data.sort((a, b) =>
			d3.descending(a.max_views_adjusted, b.max_views_adjusted)
		);

		const scaleX = getScaleX(pageviewData);
		const scaleY = getScaleY(pageviewData);
		const scaleR = getScaleR(data);

		// AXIS
		updateAxis({ scaleX, scaleY, ticks: null });

		// PEOPLE
		data.sort((a, b) =>
			d3.ascending(+a.timestamp_of_death, +b.timestamp_of_death)
		);

		const $person = $people.selectAll('.person').data(data, d => d.pageid);
		const $personEnter = $person
			.enter()
			.append('g.person')
			.call(enterPerson);

		// PEOPLE
		const addOthers = () => {
			const $personMerge = $personEnter.merge($person);
			$personMerge.call(updatePath, { scaleX, scaleY });
			$personMerge.call(enterCircles, { scaleX, scaleY, r: 0 });

			$personMerge
				.selectAll('circle')
				.transition()
				.duration(SEC)
				.delay(d => {
					const { index } = peopleData.find(p => p.pageid === d.pageid);
					return DURATION * (index / peopleData.length);
				})
				.ease(EASE)
				.at('r', d => scaleR(d.views_adjusted));

			$personMerge
				.selectAll('.is-not-death-index')
				.classed('is-transparent', true);

			$personMerge.selectAll('path').classed('is-transparent', true);
		};

		const line = getLine({ scaleX, scaleY });

		$person
			.selectAll('path')
			.transition()
			.duration(DURATION)
			.ease(EASE)
			.at('d', line)
			.st('opacity', 0)
			.on('end', d => {
				if (d[0].pageid === PRINCE_ID) addOthers();
			});

		$person
			.selectAll('circle')
			.transition()
			.duration(DURATION)
			.ease(EASE)
			.st('opacity', d => (d.bin_death_index === 0 ? 1 : 0))
			.at(
				'transform',
				d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`
			);

		// highlight prince
		$person.classed('is-highlight', false);

		// EXIT BEYONCE
		$person
			.exit()
			.transition()
			.duration(DURATION_EXIT)
			.st('opacity', 0)
			.remove();
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
	$step.st('padding-bottom', Math.floor(window.innerHeight * 0.98));
	const lasStep = $step.size() - 1;
	// $step.filter((d,i) => i === lastStep)
	// 	.st('margin-bottom', Math.floor(window.innerHeight * 0.98));

	updateStep({});
}

function handleStepEnter({ index, element, direction }) {
	// console.log({ step: 'enter', index, element, direction });
	currentStep = d3.select(element).at('data-step');
	updateStep({ reverse: direction === 'up' });
}

function handleStepExit({ index, element, direction }) {
	// updateStep({ reverse: direction === 'up', leave: true });
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
