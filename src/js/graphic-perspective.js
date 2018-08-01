import 'intersection-observer';
import Stickyfill from 'stickyfilljs';
import scrollama from 'scrollama';
import * as Annotate from 'd3-svg-annotation';
import cleanData from './clean-data';
import tooltip from './tooltip';

const MEDIAN = 251755934.5 * 2; // july 30
const MARGIN = { top: 20, bottom: 40, left: 50, right: 50 };
const FONT_SIZE = 12;
const PRINCE_ID = '57317';
const BEYONCE_LAST = '20160425';
const DATE_START = new Date(2016, 2, 1);
const DATE_END = new Date(2016, 3, 27);
const SEC = 1000;
const DURATION = SEC * 3;
const EASE = d3.easeCubicInOut;
const HEADER_HEIGHT = d3.select('header').node().offsetHeight;
const BP = 640;

let minR = 4;
let maxR = 16;
let small = false;
let mobile = false;
let width = 0;
let height = 0;
let innerHeight = 0;
let peopleData = null;
let pageviewData = null;
let beyonceData = null;
let currentStep = 'context';
let hoverEnabled = false;

const $section = d3.select('#perspective');

const $article = $section.select('article');
const $step = $article.selectAll('.step');

const $figure = $section.select('figure');
const $chart = $figure.select('.figure__chart');
const $svg = $chart.select('svg');

const $gVis = $svg.select('.g-vis');
const $gAxis = $svg.select('.g-axis');
const $gVor = $svg.select('.g-voronoi');
const $people = $gVis.select('.people');
const $legend = $figure.select('.legend');
const $filter = d3.select('.filters');

let $tip = null;

const scroller = scrollama();
const scrollerHover = scrollama();
const voronoi = d3.voronoi();

function filter({ name, value }) {
	// if (currentStep === 'compare') {
	// }
	const $person = $people.selectAll('.person');
	if (name) $person.classed('is-faded', d => !d[name].includes(value));
	else $person.classed('is-faded', false);
}

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
		.range([minR, maxR]);
}

function getLine({ scaleX, scaleY }) {
	return d3
		.line()
		.x(d => scaleX(d.date))
		.y(d => scaleY(d.views_adjusted))
		.curve(d3.curveMonotoneX)
		.defined(d => d.views_adjusted);
}

function updateAxis({
	scaleX,
	scaleY,
	dur,
	ticks = d3.timeMonth.every(1),
	ease = EASE
}) {
	const axisY = d3
		.axisLeft(scaleY)
		.tickFormat((val, i) => {
			const formatted = d3.format('.2s')(val);
			const suffix = i === 6 ? ' adjusted pageviews' : '';
			return `${formatted}${suffix}`;
		})
		.tickSize(-(width + MARGIN.left))
		.tickPadding(MARGIN.left)
		.ticks(5);

	$gAxis
		.select('.axis--y')
		.transition()
		.duration(dur.slow)
		.ease(ease)
		.call(axisY)
		.at('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);

	$gAxis
		.selectAll('.axis--y text')
		.at('text-anchor', 'start')
		.at('y', -FONT_SIZE / 2);

	$gAxis
		.selectAll('.axis--y line')
		.at('transform', `translate(${-MARGIN.left}, 0)`);

	function multiFormat(date) {
		return (d3.timeYear(date) < date
			? small
				? () => {}
				: d3.timeFormat('%b')
			: d3.timeFormat('%Y'))(date);
	}

	function singleFormat(date) {
		return d3.timeFormat('%b')(date);
	}

	const formatter =
		small && scaleX.domain()[1] > new Date(2017, 0)
			? singleFormat
			: multiFormat;
	const axisX = d3
		.axisBottom(scaleX)
		.ticks(ticks)
		.tickSize(0)
		.tickPadding(0)
		.tickFormat(formatter);

	$gAxis
		.select('.axis--x')
		.transition()
		.duration(dur.slow)
		.ease(ease)
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

	$person
		.append('text.bg')
		.text(d => d.display)
		.at('x', 0)
		.at('y', 0)
		.at('text-anchor', 'middle')
		.at('alignment-baseline', 'baseline')
		.st('opacity', 0);

	$person
		.append('text.fg')
		.text(d => d.display)
		.at('x', 0)
		.at('y', 0)
		.at('text-anchor', 'middle')
		.at('alignment-baseline', 'baseline')
		.st('opacity', 0);
}

function exitPerson($person, dur) {
	// EXIT
	$person
		.exit()
		.transition()
		.duration(dur)
		.st('opacity', 0)
		.remove();
}

function enterCircles($person, { scaleX, scaleY, r = minR }) {
	const $c = $person
		.select('.circles')
		.selectAll('circle')
		.data(d => {
			return d.pageviews.filter(
				p =>
					['beyonce', PRINCE_ID].includes(p.pageid) || p.bin_death_index === 0
			)
		},k => k.timestamp
		);

	const $enter = $c
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

	$enter
		.merge($c)
		.at('data-x', d => scaleX(d.date))
		.at('data-y', d => scaleY(d.views_adjusted));

	$c.exit().remove();
}

function updatePath($person, { scaleX, scaleY, render = true }) {
	const line = getLine({ scaleX, scaleY });
	if ($person.datum().pageviews.length > 1) {
		$person.selectAll('path').data(d => [d.pageviews]);
		if (render) $person.selectAll('path').at('d', line);
	}
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

function handleVorEnter(d) {
	if (hoverEnabled && currentStep === 'compare') {
		const { pageid } = d.data;
		const datum = peopleData.find(v => v.pageid === pageid);
		$people.selectAll('.person').classed('is-active', v => v.pageid === pageid);
		const $person = d3.select(`[data-id='${pageid}'`);

		if ($person.size()) {
			$person.raise();
			const $circle = $person
				.selectAll('circle')
				.filter(v => v.bin_death_index === 0);
			const x = +$circle.at('data-x') + MARGIN.left;
			const y = +$circle.at('data-y') + MARGIN.top;

			const pos = { x, y };
			tooltip.show({ el: $tip, d: datum, pos, mobile: mobile || small });
		}
	}
}

function createAnnotation({ scaleX, scaleY, annoData, dur = 0, delay = 0 }) {
	$gVis.select('.g-annotation').remove();
	const $anno = $gVis.append('g.g-annotation');
	$anno.st('opacity', 0);

	// const type = Annotate.annotationCustomType(Annotate.annotationLabel, {
	// 	className: 'custom',
	// 	connector: { type: 'line' },
	// 	note: {
	// 		align: 'middle',
	// 		orientation: 'leftRight'
	// 	}
	// });

	const type = Annotate.annotationCustomType(Annotate.annotationCalloutCircle, {
		className: 'custom',
		connector: { type: 'line' },
		note: {
			// lineType: 'horizontal',
			align: 'dynamic'
		}
	});

	const pad = FONT_SIZE * 0.75;

	const annotations = annoData.map(d => ({
		note: {
			title: d.title,
			padding: d.padding,
			wrap: d.wrap || 110,
			bgPadding: { top: pad * 0.825, left: pad, right: pad, bottom: 0 }
		},
		data: { date: d.value.date, views_adjusted: d.value.views_adjusted },
		dx: d.dx,
		dy: d.dy,
		subject: {
			radius: d.r,
			radiusPadding: minR
		}
	}));

	const makeAnnotations = Annotate.annotation()
		.type(type)
		.accessors({
			x: d => scaleX(d.date),
			y: d => scaleY(d.views_adjusted)
		})
		.annotations(annotations);

	$anno.call(makeAnnotations);

	$anno
		.selectAll('.annotation-note-title')
		.selectAll('tspan')
		.filter((d, i) => i !== 0)
		.at('dy', '1.4em');

	$anno
		.transition()
		.duration(dur)
		.delay(delay)
		.ease(EASE)
		.st('opacity', 1);
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

		$personMerge
			.selectAll('circle')
			.transition()
			.duration(dur.fast)
			.ease(EASE)
			.at(
				'transform',
				d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`
			)
			.at('r', minR)
			.st('stroke-width', minR / 2);

		// ANNOTATION
		createAnnotation({ scaleX, scaleY, annoData: [] });

		exitPerson($person, dur.fast);
	},
	lemonade: ({ reverse, leave }) => {
		if (!reverse && !leave) STEP.context({ leave: true });
		const dur = getDuration({ leave, reverse });

		// DATA
		const data = beyonceData;
		const annoData = [
			{
				value: data[0].pageviews[data[0].pageviews.length - 1],
				title: 'Lemonade is released',
				wrap: 150,
				padding: FONT_SIZE * 0.5,
				dx: small ? -25 : -50,
				dy: 50,
				r: maxR * 1.25
			}
		];

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
		$personMerge
			.selectAll('circle')
			.at(
				'transform',
				d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`
			)
			.filter(d => d.timestamp === BEYONCE_LAST)
			.transition()
			.duration(dur.fast)
			.ease(EASE)
			.at('r', maxR)
			.st('stroke-width', maxR / 2);

		// ANNOTATION
		createAnnotation({ scaleX, scaleY, annoData, dur: dur.fast });

		exitPerson($person, dur.fast);
	},
	'prince-before': ({ reverse, leave }) => {
		if (!reverse && !leave) STEP.lemonade({ leave: true });

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
		$personMerge.call(enterCircles, { scaleX, scaleY, r: minR });
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
				.at('stroke-dashoffset', 0)
				.st('opacity', 1);

			$personMerge
				.selectAll('circle')
				.transition()
				.duration(dur.slow)
				.ease(EASE)
				.st('opacity', 1)
				.at('r', minR)
				.at(
					'transform',
					d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`
				);
		} else {
			$personMerge
				.selectAll('circle')
				.at(
					'transform',
					d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`
				);
			const $prince = $personMerge.filter(d => d.pageid === PRINCE_ID);
			const $bey = $personMerge.filter(d => d.pageid === 'beyonce');
			$prince.call(resetLine);

			// NEW
			const segments = [0];
			const princeData = data.find(d => d.pageid !== 'beyonce').pageviews;

			princeData.forEach((d, i) => {
				if (i === 0) return null;

				const prevData = princeData[i - 1];
				const tempPath = $svg
					.append('path.temp')
					.datum([prevData, d])
					.at('d', line);

				const prevSegment = segments[i - 1];
				const newSegment = prevSegment + tempPath.node().getTotalLength();
				segments.push(newSegment);
				tempPath.remove();
			});

			const totalLength = $prince
				.selectAll('path')
				.node()
				.getTotalLength();

			$prince.selectAll('circle').at('r', 0);

			const updateCircles = len => {
				$prince
					.selectAll('circle')
					.filter((d, i) => i < len)
					.at('r', d => (d.bin_death_index === 0 ? maxR : minR))
					.st(
						'stroke-width',
						d => (d.bin_death_index === 0 ? maxR / 2 : minR / 2)
					);
			};

			$prince
				.selectAll('path')
				.transition()
				.duration(dur.slow)
				.ease(EASE)
				.tween('stroke-dashoffset', (d, i, n) => {
					const $p = d3.select(n[i]);
					const interpolator = d3.interpolate(totalLength, 0);
					const sideEffect = time => {
						const offset = interpolator(time);
						const points = segments.filter(s => s <= totalLength - offset);
						updateCircles(princeData.slice(0, points.length).length);
						$p.at('stroke-dashoffset', offset);
					};
					return sideEffect;
				});

			$bey
				.selectAll('circle')
				.transition()
				.duration(dur.fast)
				.ease(EASE)
				.at('r', minR)
				.st('stroke-width', minR / 2);
		}

		// ANNOTATION
		createAnnotation({ scaleX, scaleY, annoData: [] });

		// highlight prince
		$personMerge.classed('is-highlight', d => d.pageid === PRINCE_ID);
		$personMerge.filter(d => d.pageid === PRINCE_ID).raise();

		exitPerson($person, dur.fast);
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
		const addSpike = () => {
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
				.duration(leave ? 0 : dur.slow)
				.ease(d3.easeCubicIn)
				.at('stroke-dashoffset', 0);

			$prince
				.selectAll('circle')
				.transition()
				.duration(dur.fast)
				.delay(leave ? 0 : dur.slow - 50)
				.ease(EASE)
				.at('r', d => (d.bin_death_index === 0 ? maxR : minR))
				.st(
					'stroke-width',
					d => (d.bin_death_index === 0 ? maxR / 2 : minR / 2)
				);
		};

		const line = getLine({ scaleX, scaleY });

		if (reverse) {
			$personMerge.call(enterCircles, { scaleX, scaleY, r: 0 });
			$personMerge.call(updatePath, { scaleX, scaleY, render: !reverse });
			$personMerge
				.selectAll('path')
				.at('d', line)
				.at('opacity', 0)
				.at('stroke-dashoffset', 0)
				.at('stroke-dasharray', '0 0')
				.transition()
				.duration(dur.fast)
				.delay(dur.slow)
				.ease(EASE)
				.st('opacity', 1);
			$personMerge
				.selectAll('circle')
				.transition()
				.duration(dur.slow)
				.delay(d => (d.pageid === 'beyonce' ? dur.slow : 0))
				.ease(EASE)
				.st('opacity', 1)
				.at('r', d => (d.bin_death_index === 0 ? maxR : minR))
				.at(
					'transform',
					d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`
				)
				.st(
					'stroke-width',
					d => (d.bin_death_index === 0 ? maxR / 2 : minR / 2)
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
				)
				.st(
					'stroke-width',
					d => (d.bin_death_index === 0 ? maxR / 2 : minR / 2)
				);
		}

		$personMerge
			.selectAll('text')
			.transition()
			.duration(dur.fast)
			.ease(EASE)
			.st('opacity', 0);

		// highlight prince
		$personMerge.classed('is-highlight', d => d.pageid === PRINCE_ID);
		$personMerge.filter(d => d.pageid === PRINCE_ID).raise();

		// ANNOTATION
		createAnnotation({ scaleX, scaleY, annoData: [] });

		// EXIT
		exitPerson($person);
		// LEAVE
		if (leave && !reverse) addSpike();
	},
	others: ({ reverse, leave }) => {
		if (!reverse && !leave) STEP['prince-spike']({ leave: true });

		tooltip.hide($tip);

		const dur = getDuration({ leave, reverse });

		// DATA
		const data = peopleData.map(d => ({
			...d,
			pageviews: trimPageviews(d.pageviews, { start: 0, end: 0 })
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
			$personMerge.call(enterCircles, { scaleX, scaleY, r: 0 });
			$personMerge
				.selectAll('circle')
				.classed('is-active', false)
				.transition()
				.duration(dur.medium)
				.delay(d => {
					const { index } = peopleData.find(p => p.pageid === d.pageid);
					return dur.slow * (index / peopleData.length);
				})
				.ease(EASE)
				.at('r', d => scaleR(d.views_adjusted))
				.at('stroke-width', minR / 2);

			$personMerge.each((d,i,n) => {
				const $p = d3.select(n[i])
				$p.selectAll('text')
					.at('transform', () => {
						const last = d.pageviews[0]
						const x = scaleX(last.date);
						const y = scaleY(last.views_adjusted);
						const r = scaleR(last.views_adjusted * 1.5);
						return `translate(${x}, ${y - r})`;
					})
					.transition()
					.duration(dur.medium)
					.delay(() => {
						if (reverse) return 0;
						const { index } = peopleData.find(p => p.pageid === d.pageid);
						return dur.slow * (index / peopleData.length);
					})
					.ease(EASE)
					.st('opacity', () => {
						const year = +d.timestamp_of_death.substring(0, 4);
						const month = +d.timestamp_of_death.substring(4, 6) - 1;
						const last = new Date(2018, 2);
						const date = new Date(year, month);
						if (small && d.display === 'Antonin Scalia') return 0;
						if (small && d.perspective_show && date < last) return 1;
						if (!small && d.perspective_show) return 1;
						return 0;
					});

			})
				
			$personMerge.filter(d => d.perspective_show).raise();
			$personMerge
				.selectAll('.is-not-death-index')
				.classed('is-transparent', true);
		};

		const line = getLine({ scaleX, scaleY });
		$person
			.selectAll('path')
			.transition()
			.duration(dur.fast)
			.ease(EASE)
			.st('opacity', 0)
			.on('end', (d, i, n) => d3.select(n[i]).at('d', line));

		$person
			.selectAll('circle')
			.transition()
			.duration(reverse ? 0 : dur.medium)
			.ease(EASE)
			.st('opacity', d => (d.bin_death_index === 0 ? 1 : 0))
			.at(
				'transform',
				d => `translate(${scaleX(d.date)}, ${scaleY(d.views_adjusted)})`
			)
			.on('end', d => {
				if (d && d.pageid === PRINCE_ID && d.bin_death_index === 0 && !leave) addOthers();
			});
		// highlight prince
		$person.classed('is-highlight', false);

		// ANNOTATION
		createAnnotation({ scaleX, scaleY, annoData: [] });

		exitPerson($person, dur.fast);

		// LEAVE
		if (leave && !reverse) addOthers();
	},
	compare: ({ reverse, leave }) => {		if (!reverse && !leave) STEP.others({ leave: true });
		const dur = getDuration({ leave, reverse });
		// DATA
		const data = peopleData.map(d => ({
			...d,
			pageviews: trimPageviews(d.pageviews, { start: -50, end: 0 })
		}));

		let annoData = [
			{
				value: {
					date: new Date(2016, 5, 20),
					views_adjusted: (1354216 / 500201369) * MEDIAN
				},
				title: 'LeBron James (NBA Finals)',
				padding: 0,
				dx: Math.floor(width * 0.01),
				dy: -Math.floor(width * 0.07),
				r: maxR / 2
			},
			{
				value: {
					date: new Date(2017, 0, 20),
					views_adjusted: (3635774 / 538696302) * MEDIAN
				},
				title: 'Donald Trump (inauguration)',
				padding: 0,
				dx: Math.floor(width * 0.02),
				dy: -Math.floor(width * 0.03),
				r: maxR / 2
			},
			{
				value: {
					date: new Date(2018, 4, 19),
					views_adjusted: (4503531 / 530076204) * MEDIAN
				},
				title: ' Meghan Markle (royal wedding)',
				padding: 0,
				dx: -Math.floor(width * 0.05),
				dy: -Math.floor(width * 0.05),
				r: maxR / 2
			}
		];

		annoData = annoData.filter((d, i) => {
			if (!small) return true;
			if (i === 1) return false;
			return true;
		});

		// SCALE
		data.sort((a, b) =>
			d3.descending(a.death_views_adjusted_2, b.death_views_adjusted_2)
		);

		const scaleX = getScaleX(pageviewData);
		const scaleY = getScaleY(pageviewData);

		// AXIS
		updateAxis({ scaleX, scaleY, dur, ticks: null });

		// PEOPLE
		data.sort((a, b) =>
			d3.ascending(+a.timestamp_of_death, +b.timestamp_of_death)
		);

		const $person = $people.selectAll('.person').data(data, d => d.pageid);
		$person
			.enter()
			.append('g.person')
			.call(enterPerson);

		// PEOPLE
		$person
			.selectAll('path')
			.transition()
			.duration(dur.slow)
			.ease(EASE)
			.st('opacity', 0);

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

		$person
			.selectAll('text')
			.transition()
			.duration(dur.fast)
			.ease(EASE)
			.st('opacity', 0);

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
		if (leave && !reverse) {
			// ANNOTATION
			createAnnotation({ scaleX, scaleY, annoData: [] });
		} else {
			// ANNOTATION
			createAnnotation({ scaleX, scaleY, annoData });
		}

		// VORONOI
		voronoi
			.x(d => scaleX(d.date))
			.y(d => scaleY(d.views_adjusted))
			.extent([
				[-MARGIN.left, -MARGIN.top],
				[width + MARGIN.left, height + MARGIN.top]
			]);

		let $vorPath = $gVor.selectAll('path');
		const vorData = data.map(d =>
			d.pageviews.find(v => v.bin_death_index === 0)
		);
		const polygons = voronoi.polygons(vorData);

		$vorPath = $vorPath
			.data(polygons)
			.enter()
			.append('path')
			.merge($vorPath);

		$vorPath.at('d', d => (d ? `M${d.join('L')}Z` : null));

		if (small || mobile) $vorPath.on('click', handleVorEnter);
		else $vorPath.on('mouseenter', handleVorEnter);

		exitPerson($person, dur.fast);
	}
};

function updateDimensions() {
	innerHeight = window.innerHeight;
	small = d3.select('body').node().offsetWidth < BP;
	if (small) MARGIN.right = 10;
	minR = small ? 2 : 4;
	maxR = small ? 8 : 16;
	const frac = small ? 0.7 : 0.8;
	height = Math.floor(innerHeight * frac) - MARGIN.top - MARGIN.bottom;
	width = $chart.node().offsetWidth - MARGIN.left - MARGIN.right;
}

function updateStep({ reverse = true, leave = false }) {
	if (STEP[currentStep]) STEP[currentStep]({ reverse, leave });
	$legend.classed('is-visible', currentStep === 'compare');
}

function resizeScroll() {
	scroller.resize();
	scrollerHover.resize();
}

function resize() {
	updateDimensions();
	mobile = d3.select('body').classed('is-mobile');

	$figure.st({
		height: innerHeight,
		top: small ? 0 : HEADER_HEIGHT,
		'padding-bottom': small ? 0 : HEADER_HEIGHT
	});

	$svg.at({
		width: width + MARGIN.left + MARGIN.right,
		height: height + MARGIN.top + MARGIN.bottom
	});

	$gVis.at('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);
	$gVor.at('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);

	// step height and padding
	const stepCount = $step.size();
	$step.st('padding-bottom', innerHeight);
	$step.filter((d, i) => i === 0).st('margin-top', -innerHeight * 0.67);
	$step
		.filter((d, i) => i === stepCount - 1)
		.st('padding-bottom', innerHeight * 0.9);

	$article.select('.step-hover').st('padding-bottom', innerHeight * 0.4);

	resizeScroll();
	updateStep({ reverse: false, leave: true });
}

function handleStepEnter({ element, index, direction }) {
	currentStep = d3.select(element).at('data-step');
	updateStep({ reverse: direction === 'up' });
}

function handleHoverEnter() {
	hoverEnabled = true;
	$chart.classed('is-hover', true);
	$article.classed('is-disabled', true);
	$filter.classed('is-onscreen', true);
}

function handleHoverExit({ direction }) {
	if (direction === 'up') {
		hoverEnabled = false;
		$chart.classed('is-hover', false);
		$article.classed('is-disabled', false);
		$filter.classed('is-onscreen', false);

		$people.selectAll('.person').classed('is-active', false);
		tooltip.hide($tip);
	}
}

function setupScroller() {
	Stickyfill.add($figure.node());

	scroller
		.setup({
			step: '#perspective article .step',
			offset: 0.99,
			debug: true
		})
		.onStepEnter(handleStepEnter);

	scrollerHover
		.setup({
			step: '#perspective article .step-hover',
			offset: 1
		})
		.onStepEnter(handleHoverEnter)
		.onStepExit(handleHoverExit);
}

function setupTooltip() {
	$tip = tooltip.init({ container: $chart });
	if (small || mobile) {
		$tip[0].select('.close').on('click', tooltip.hide($tip));
	} else {
		$svg.on('mouseleave', () => {
			tooltip.hide($tip);
			$people.selectAll('.person').classed('is-active', false);
		});
	}
}

function loadData(people) {
	return new Promise((resolve, reject) => {
		const filenames = ['perspective', 'beyonce'];
		const filepaths = filenames.map(f => `assets/data/${f}.csv`);
		d3.loadData(...filepaths, (err, response) => {
			if (err) reject(err);
			pageviewData = cleanData.pageview(response[0]);
			peopleData = people.map(d => ({
				...d,
				pageviews: pageviewData.filter(p => p.pageid === d.pageid)
			}));

			const beyoncePageviews = cleanData.pageview(response[1]);
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

function test() {
	handleHoverEnter();
	let i = 0;
	const s = [
		'context',
		'lemonade',
		'prince-before',
		'prince-spike',
		'others',
		'compare'
	];

	window.addEventListener('keyup', e => {
		const dir = e.key === 'ArrowLeft' ? -1 : 1;
		i += dir;
		i = Math.min(Math.max(0, i), s.length - 1);
		currentStep = s[i];
		updateStep({ reverse: dir === -1, leave: false });
	});
}

function init(people) {
	loadData(people).then(() => {
		resize();
		// setupScroller();
		setupTooltip();
		test();
	});
}

export default { init, resize, resizeScroll, filter };
