import Stickyfill from 'stickyfilljs';
import scrollama from 'scrollama';
import cleanData from './clean-data';

const MARGIN = { top: 20, bottom: 40, left: 40, right: 20 };
const FONT_SIZE = 12;
const PRINCE_ID = '57317';
const DATE_START = new Date(2016, 2, 1);
const DATE_END = new Date(2016, 3, 27);
const MIN_R = 3;
const MAX_R = 12;
const SEC = 1000;
const DURATION = SEC * 3;
const EASE = d3.easeCubicInOut;
const HEADER_HEIGHT = d3.select('header').node().offsetHeight;

let width = 0;
let height = 0;
let innerHeight = 0;
let peopleData = null;
let pageviewData = null;
let beyonceData = null;
let currentStep = 'context';

const $section = d3.select('#perspective');

const $article = $section.select('article');
const $step = $article.selectAll('.step');

const $figure = $section.select('figure');
const $chart = $figure.select('.figure__chart');
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
		.domain(d3.extent(data, d => d.death_views_adjusted_2))
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

function updateAxis({ scaleX, scaleY, dur, ticks = d3.timeMonth.every(1) }) {
	const axisY = d3
		.axisLeft(scaleY)
		.tickFormat((val, i) => {
			const formatted = d3.format('.2s')(val);
			const suffix = i === 6 ? ' pageviews' : '';
			return `${formatted}${suffix}`;
		})
		.tickSize(-(width + MARGIN.left))
		.tickPadding(MARGIN.left)
		.ticks(5);

	$gAxis
		.select('.axis--y')
		.transition()
		.duration(dur.slow)
		.ease(EASE)
		.call(axisY)
		.at('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);

	$gAxis
		.selectAll('.axis--y text')
		.at('text-anchor', 'start')
		.at('y', -FONT_SIZE / 2);

	$gAxis
		.selectAll('.axis--y line')
		.at('transform', `translate(${-MARGIN.left}, 0)`);

	const $lastTick = $gAxis.select('.axis--y .tick:last-of-type');

	const $lastText = $lastTick.select('text');

	// $lastText;
	// .at('text-anchor', 'start')
	// .at('transform', `translate(${-MARGIN.left + 12}, 0)`);

	function multiFormat(date) {
		return (d3.timeYear(date) < date
			? d3.timeFormat('%b')
			: d3.timeFormat('%Y'))(date);
	}

	const axisX = d3
		.axisBottom(scaleX)
		.ticks(ticks)
		.tickSize(0)
		.tickPadding(0)
		.tickFormat(multiFormat);

	$gAxis
		.select('.axis--x')
		.transition()
		.duration(dur.slow)
		.ease(EASE)
		.call(axisX)
		.at(
			'transform',
			`translate(${MARGIN.left}, ${height + MARGIN.bottom - FONT_SIZE})`
		);
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
	const $c = $person
		.select('.circles')
		.selectAll('circle')
		.data(
			d =>
				d.pageviews.filter(
					p =>
						['beyonce', PRINCE_ID].includes(p.pageid) || p.bin_death_index === 0
				),
			k => k.timestamp
		);

	$c.enter()
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

	$c.exit().remove();
}

function updatePath($person, { scaleX, scaleY, render = true }) {
	const line = getLine({ scaleX, scaleY });
	$person.selectAll('path').data(d => [d.pageviews]);

	if (render) $person.selectAll('path').at('d', line);
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

function getDuration({ leave, reverse }) {
	let factor = 1;
	if (leave) factor = 0;
	else if (reverse) factor = 0.33;
	const slow = DURATION * factor;
	const medium = Math.floor(slow * 0.33);
	const fast = Math.floor(slow * 0.1);
	return {
		slow,
		medium,
		fast
	};
}

// step render
const STEP = {
	context: ({ reverse, leave }) => {
		const dur = getDuration({ leave, reverse });

		// DATA
		const data = beyonceData;

		// SCALE
		const scaleX = getScaleX();
		const scaleY = getScaleY();

		// AXIS
		updateAxis({ scaleX, scaleY, dur: { slow: 0 } });

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

		// EXIT
		$person
			.exit()
			.transition()
			.duration(dur.fast)
			.st('opacity', 0)
			.remove();
	},
	'prince-before': ({ reverse, leave }) => {
		if (!reverse && !leave) STEP.context({ leave: true });

		const dur = getDuration({ leave, reverse });

		// DATA
		const start = findPrinceStart(DATE_START);
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
		updateAxis({ scaleX, scaleY, dur });

		// PEOPLE
		const $person = $people.selectAll('.person').data(data, d => d.pageid);
		const $personEnter = $person
			.enter()
			.append('g.person')
			.call(enterPerson);
		const $personMerge = $personEnter.merge($person);
		$personMerge.call(enterCircles, { scaleX, scaleY, r: 0 });
		$personMerge.call(updatePath, { scaleX, scaleY, render: !reverse });

		// TRANSITION
		const line = getLine({ scaleX, scaleY });
		if (reverse) {
			$personMerge
				.selectAll('path')
				.transition()
				.duration(dur.slow)
				.ease(EASE)
				.at('d', line)
				.st('opacity', 1);

			$personMerge
				.selectAll('circle')
				.transition()
				.duration(dur.slow)
				.ease(EASE)
				.st('opacity', 1)
				.at(
					'transform',
					d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`
				);
		} else {
			const $prince = $personMerge.filter(d => d.pageid === PRINCE_ID);
			$prince.call(resetLine);
			$prince
				.selectAll('path')
				.transition()
				.duration(dur.slow)
				.ease(EASE)
				.at('stroke-dashoffset', 0);

			$prince
				.selectAll('circle')
				.transition()
				.duration(dur.fast)
				.delay((d, i, n) => dur.slow * EASE(i / n.length))
				.ease(EASE)
				.at('r', d => (d.bin_death_index === 0 ? MAX_R : MIN_R));
		}

		// highlight prince
		$personMerge.classed('is-highlight', d => d.pageid === PRINCE_ID);
		$personMerge.filter(d => d.pageid === PRINCE_ID).raise();
	},
	'prince-spike': ({ reverse, leave }) => {
		if (!reverse && !leave) STEP['prince-before']({ leave: true });

		const dur = getDuration({ leave, reverse });

		// DATA
		const start = findPrinceStart(DATE_START);
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
		updateAxis({ scaleX, scaleY, dur });

		// PEOPLE
		const $person = $people.selectAll('.person').data(data, d => d.pageid);
		const $personEnter = $person
			.enter()
			.append('g.person')
			.call(enterPerson);
		const $personMerge = $personEnter.merge($person);

		// TRANSITION
		const addSpike = end => {
			const $prince = $personMerge.filter(d => d.pageid === PRINCE_ID);

			const previousLen = $prince
				.selectAll('path')
				.node()
				.getTotalLength();

			$prince.call(updatePath, { scaleX, scaleY });
			$prince.call(enterCircles, { scaleX, scaleY, r: 0 });

			if (!leave && !reverse) $prince.call(resetLine, previousLen);

			$prince
				.selectAll('path')
				.transition()
				.duration(dur.slow)
				.ease(EASE)
				.at('stroke-dashoffset', 0);

			$prince
				.selectAll('circle')
				.transition()
				.duration(dur.medium)
				.delay(dur.slow)
				.ease(EASE)
				.at('r', d => (d.bin_death_index === 0 ? MAX_R : MIN_R));
		};

		const line = getLine({ scaleX, scaleY });

		if (reverse) {
			$personMerge.call(enterCircles, { scaleX, scaleY });
			$personMerge.call(updatePath, { scaleX, scaleY, render: !reverse });
			$personMerge
				.selectAll('path')
				.transition()
				.duration(dur.slow)
				.ease(EASE)
				.at('d', line)
				.st('opacity', 1);
			$personMerge
				.selectAll('circle')
				.transition()
				.duration(dur.slow)
				.ease(EASE)
				.st('opacity', 1)
				.at(
					'transform',
					d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`
				);
		} else {
			$personMerge
				.selectAll('path')
				.transition()
				.duration(dur.slow)
				.ease(EASE)
				.at('d', line)
				.st('opacity', 1)
				.on('end', d => {
					if (d[0].pageid === PRINCE_ID && !leave) addSpike(true);
				});

			$personMerge
				.selectAll('circle')
				.transition()
				.duration(dur.slow)
				.ease(EASE)
				.st('opacity', 1)
				.at(
					'transform',
					d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`
				);
		}

		// highlight prince
		$personMerge.classed('is-highlight', d => d.pageid === PRINCE_ID);
		$personMerge.filter(d => d.pageid === PRINCE_ID).raise();

		// EXIT
		$person
			.exit()
			.transition()
			.duration(dur.medium)
			.st('opacity', 0)
			.remove();
		// LEAVE
		if (leave && !reverse) addSpike();
	},
	others: ({ reverse, leave }) => {
		if (!reverse && !leave) STEP['prince-spike']({ leave: true });
		const dur = getDuration({ leave, reverse });

		// DATA
		const data = peopleData.map(d => ({
			...d,
			pageviews: trimPageviews(d.pageviews, { start: -50, end: 0 })
		}));
		// SCALE
		data.sort((a, b) =>
			d3.descending(a.death_views_adjusted_2, b.death_views_adjusted_2)
		);
		const scaleX = getScaleX(pageviewData);
		const scaleY = getScaleY(pageviewData);
		const scaleR = getScaleR(data);
		// AXIS
		updateAxis({ scaleX, scaleY, dur, ticks: null });
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
				.duration(dur.medium)
				.delay(d => {
					const { index } = peopleData.find(p => p.pageid === d.pageid);
					return dur.slow * (index / peopleData.length);
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
			.duration(dur.slow)
			.ease(EASE)
			.at('d', line)
			.st('opacity', 0)
			.on('end', d => {
				if (d[0].pageid === PRINCE_ID && !leave) addOthers();
			});
		$person
			.selectAll('circle')
			.transition()
			.duration(dur.slow)
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
			.duration(dur.fast)
			.st('opacity', 0)
			.remove();
		// LEAVE
		if (leave && !reverse) addOthers();
	}
};

function updateDimensions() {
	innerHeight = window.innerHeight;
	height = Math.floor(innerHeight * 0.8) - MARGIN.top - MARGIN.bottom;
	width = $chart.node().offsetWidth - MARGIN.left - MARGIN.right;
}

function updateStep({ reverse = true, leave = false }) {
	console.log({ currentStep, reverse, leave });
	if (STEP[currentStep]) STEP[currentStep]({ reverse, leave });
}

function resize() {
	updateDimensions();

	$figure.st({
		height: innerHeight,
		top: HEADER_HEIGHT
	});

	$svg.at({
		width: width + MARGIN.left + MARGIN.right,
		height: height + MARGIN.top + MARGIN.bottom
	});

	$gVis.at('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);

	// step height and padding
	const h = Math.floor(innerHeight * 0.99);
	$step.st('padding-bottom', h);
	$step.filter((d, i) => i === 0).st('margin-top', -h * 0.67);

	updateStep({});
}

function handleStepEnter({ index, element, direction }) {
	// console.log({ step: 'enter', index, element, direction });
	currentStep = d3.select(element).at('data-step');
	updateStep({ reverse: direction === 'up' });
}

// function handleStepExit({ index, element, direction }) {
// 	// updateStep({ reverse: direction === 'up', leave: true });
// 	// console.log({ step: 'exit', index, element, direction });
// }

function setupScroller() {
	Stickyfill.add($figure.node());

	scroller
		.setup({
			step: $step.nodes(),
			offset: 0.95
		})
		.onStepEnter(handleStepEnter);
	// .onStepExit(handleStepExit);
}

function loadData() {
	return new Promise((resolve, reject) => {
		const filenames = ['people', 'perspective', 'beyonce'];
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
						d => d.date >= DATE_START && d.date < DATE_END
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
