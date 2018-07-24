import cleanData from './clean-data';

const MARGIN = { top: 160, bottom: 10, left: 0, right: 20 };
const FONT_SIZE = 12;
const REM = 16;
const MAX_HEIGHT = FONT_SIZE * 5;
const TEXT_WIDTH = REM * 8;
const OFFSET = 0.4;
const NUM_DAYS = 91;

let width = 0;
let height = 0;
let peopleData = null;
let pageviewData = null;
let scaleX = null;
let scaleY = null;

const $section = d3.select('#impact');
const $figure = $section.select('figure');
const $chart = $figure.select('.figure__chart');
const $svg = $chart.select('svg');
const $gVis = $svg.select('.g-vis');
const $gAxis = $svg.select('.g-axis');

let $person = null;

function formatPercent(number) {
	return d3.format('.0%')(number);
}

function filter({ name, value }) {
	if (name) {
		$svg.classed('is-faded', true);
		$person.classed('is-faded', d => !d[name].includes(value));
	} else {
		$svg.classed('is-faded', false);
		$person.classed('is-faded', false);
	}
}

function handleMouseMove(d) {
	const $person = d3.select(this).parent();
	const [x] = d3.mouse(this);
	const index = Math.floor(scaleX.invert(x));
	if (index >= 30) {
		const datum = d.pageviews.find(p => p.bin_death_index === index);
		const f = formatPercent(datum.diff_percent);
		const y = scaleY(datum.diff_percent);
		$person
			.selectAll('.tip')
			.text(f)
			.at('transform', `translate(${x}, ${y})`);
	}
}

function handleMouseEnter({ pageid }) {
	$person.classed('is-active', d => d.pageid === pageid);
	$person.classed('is-inactive', d => d.pageid !== pageid);
}

function handleMouseExit() {
	d3.select(this)
		.parent()
		.selectAll('.tip')
		.text('');
}

function handleSvgExit() {
	$person.classed('is-active', false);
	$person.classed('is-inactive', false);
}

function updateDimensions() {
	const h = window.innerHeight;
	width = $chart.node().offsetWidth - MARGIN.left - MARGIN.right;
	height = MAX_HEIGHT * OFFSET * peopleData.length + MAX_HEIGHT;
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
	console.log({ extent });
	scaleX = d3
		.scaleLinear()
		.domain(extent)
		.range([TEXT_WIDTH + FONT_SIZE, width]);

	// const maxV = d3.max(pageviewData, v => Math.abs(v.diff_percent));
	// console.log(maxV);
	const max = 20;

	scaleY = d3
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

	$person.select('.name').at({
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

	const rectH = MAX_HEIGHT * OFFSET;
	const rectY = MAX_HEIGHT * (1 - OFFSET);
	$person.select('.interaction').at({ width, height: rectH, y: rectY });

	const axis = d3
		.axisTop(scaleX)
		.tickValues([30, 60, 90, 120, 150])
		.tickSize(-height)
		.tickFormat((val, i) => {
			const suffix = i === 0 ? ' days after death' : '';
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

	$svg.on('mouseleave', handleSvgExit);
	$person = $gVis.selectAll('.person');

	const $personEnter = $person
		.data(peopleData)
		.enter()
		.append('g.person');

	$person = $personEnter.merge($person);

	$person.append('text.name').text(d => d.display);

	$person.append('path.after--area');

	$person.append('path.after--line');

	$person
		.append('text.tip.tip--bg')
		.at({ x: 0, y: -FONT_SIZE / 2, 'text-anchor': 'middle' });
	$person
		.append('text.tip.tip--fg')
		.at({ x: 0, y: -FONT_SIZE / 2, 'text-anchor': 'middle' });

	$person
		.append('rect.interaction')
		.at({ x: 0, y: 0 })
		.on('mouseenter', handleMouseEnter)
		.on('mousemove', handleMouseMove)
		.on('mouseleave', handleMouseExit);
}

function loadData(people) {
	return new Promise((resolve, reject) => {
		const filenames = ['impact'];
		const filepaths = filenames.map(f => `assets/data/${f}.csv`);
		d3.loadData(...filepaths, (err, response) => {
			if (err) reject(err);
			pageviewData = cleanData.ma(response[0]);
			peopleData = people
				.map(d => {
					// // add last at 0 for smooth viz
					const pageviews = pageviewData.filter(p => p.pageid === d.pageid);
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
		console.log(peopleData);
		updateDimensions();
		setupChart();
		resize();
	});
}

export default { init, resize, filter };
