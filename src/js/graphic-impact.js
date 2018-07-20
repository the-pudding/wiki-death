import cleanData from './clean-data';
import color from './color';

const MARGIN = { top: 160, bottom: 10, left: 0, right: 20 };
const FONT_SIZE = 12;
const REM = 16;
const MAX_HEIGHT = FONT_SIZE * 5;
const TEXT_WIDTH = REM * 8;
const OFFSET = 0.4;

let width = 0;
let height = 0;
let rectH = 0;
let peopleData = null;
let pageviewData = null;

const $section = d3.select('#impact');
const $figure = $section.select('figure');
const $chart = $figure.select('.figure__chart');
const $svg = $chart.select('svg');
const $gVis = $svg.select('.g-vis');
const $gAxis = $svg.select('.g-axis');

let $person = null;

function handleMouseMove() {
	const [x, y] = d3.mouse(this);
	const len = peopleData.length;
	const index = Math.max(0, Math.min(Math.floor((y / rectH) * len), len - 1));
	$person.classed('is-inactive', (d, i) => i !== index);
	// d3.select(this).raise();
}

function handleMouseExit() {
	$person.classed('is-inactive', false);
}

function updateDimensions() {
	const h = window.innerHeight;
	width = $chart.node().offsetWidth - MARGIN.left - MARGIN.right;
	height = MAX_HEIGHT * OFFSET * peopleData.length + MARGIN.top + MARGIN.bottom;
}

function resize() {
	updateDimensions();
	$svg.at({
		width: width + MARGIN.left + MARGIN.right,
		height: height + MARGIN.top + MARGIN.bottom
	});
	$gVis.at('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);

	// scales
	const extent = d3.extent(pageviewData, d => d.bin_death_index);
	const scaleX = d3
		.scaleLinear()
		.domain(extent)
		.range([TEXT_WIDTH + FONT_SIZE, width]);

	// const max = d3.max(pageviewData, v => Math.abs(v.diff_percent));
	const max = 20;

	const scaleY = d3
		.scaleLinear()
		.domain([0, max])
		.range([MAX_HEIGHT, 0]);

	const line = d3
		.line()
		.x(d => scaleX(d.bin_death_index))
		.y(d => scaleY(d.diff_percent))
		.curve(d3.curveMonotoneX)
		.defined(d => d.ma);

	const area = d3
		.area()
		.x(d => scaleX(d.bin_death_index))
		.y0(scaleY(0))
		.y1(d => scaleY(d.diff_percent))
		.curve(d3.curveMonotoneX)
		.defined(d => d.ma);

	$person.select('text').at({
		x: TEXT_WIDTH,
		y: scaleY.range()[0],
		'text-anchor': 'end'
	});

	$person
		.select('.after--area')
		.datum(d => d.pageviews)
		.at('d', area);
	$person
		.select('.after--line')
		.datum(d => d.pageviews)
		.at('d', line);

	$person.at('transform', (d, i) => `translate(0,${i * MAX_HEIGHT * OFFSET})`);

	rectH = height - MARGIN.top + MARGIN.bottom + MAX_HEIGHT * OFFSET;

	$gVis.select('.interaction').at({
		x: 0,
		y: 0,
		width,
		height: rectH
	});

	const axis = d3
		.axisTop(scaleX)
		.tickValues([30, 60, 90, 120, 150])
		.tickSize(-height)
		.tickFormat((val, i) => {
			const suffix = i === 0 ? ' days' : '';
			return `${val}${suffix}`;
		});
	// .tickPadding(0)
	// .tickFormat(multiFormat);

	$gAxis
		.select('.axis')
		.call(axis)
		.at(
			'transform',
			`translate(${MARGIN.left}, ${MARGIN.top - MAX_HEIGHT * OFFSET})`
		);
	$gAxis
		.select('.tick')
		.select('text')
		.at('text-anchor', 'start');
}

function setupChart() {
	// data
	peopleData.sort((a, b) => {
		const ma = d3.median(a.pageviews, v => v.diff_percent);
		const mb = d3.median(b.pageviews, v => v.diff_percent);
		return d3.descending(ma, mb);
	});

	$person = $gVis.selectAll('.person');

	const $personEnter = $person
		.data(peopleData)
		.enter()
		.append('g.person');

	$person = $personEnter.merge($person);

	$person.append('text').text(d => d.display);

	$person.append('path.after--area');

	$person.append('path.after--line');

	$gVis
		.append('rect.interaction')
		.on('mousemove', handleMouseMove)
		.on('mouseleave', handleMouseExit);
}

function loadData(people) {
	const NUM_DAYS = 92;
	return new Promise((resolve, reject) => {
		const filenames = ['impact'];
		const filepaths = filenames.map(f => `assets/data/${f}.csv`);
		d3.loadData(...filepaths, (err, response) => {
			if (err) reject(err);
			pageviewData = cleanData.ma(response[0]);
			peopleData = people
				.map(d => {
					// add last at 0 for smooth viz
					const pageviews = pageviewData.filter(p => p.pageid === d.pageid);
					const last = pageviews[pageviews.length - 1];
					const add = {
						bin_death_index: last.bin_death_index,
						diff_percent: 0,
						ma: 1
					};
					pageviews.push(add);
					return {
						...d,
						pageviews
					};
				})
				.filter(d => d.pageviews.length === NUM_DAYS);
			resolve();
		});
	});
}

function init(people) {
	loadData(people).then(() => {
		updateDimensions();
		setupChart();
		resize();
	});
}

export default { init, resize };
