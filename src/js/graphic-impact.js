import * as Annotate from 'd3-svg-annotation';
import cleanData from './clean-data';

const MARGIN = { top: 160, bottom: 10, left: 0, right: 12 };
const FONT_SIZE = 12;
const REM = 16;
const OFFSET = 0.4;
const NUM_DAYS = 91;
const BP = 640;

let maxHeight = FONT_SIZE * 5;
let textWidth = REM * 8;
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
const $gAnnotations = $svg.select('.g-annotations');
const $toggle = $figure.select('.annotation-toggle input');

let $person = null;

function handleToggle() {
	const { checked } = this;
	$gAnnotations.classed('is-visible', checked);
}

function createAnnotation(annoData) {
	$gAnnotations.select('.g-annotation').remove();
	const $anno = $gAnnotations.append('g.g-annotation');

	const types = {
		float: Annotate.annotationCustomType(Annotate.annotationLabel, {
			className: 'float',
			note: { dy: 2, align: 'middle', orientation: 'leftRight' }
		}),
		line: Annotate.annotationCustomType(Annotate.annotationLabel, {
			className: 'line',
			connector: { type: 'line' },
			note: { dy: 2, align: 'dynamic', orientation: 'leftRight' }
		})
	};

	const pad = FONT_SIZE * 0.75;

	const annotations = annoData.map(d => ({
		type: types[d.impact_type],
		note: {
			dy: 2,
			title: d.title,
			bgPadding: { top: pad, left: pad, right: pad, bottom: pad / 2 },
			padding: 0,
			wrap: 230
		},
		data: {
			s: d.name === 'Lil Peep' ? -120 : 0,
			impact_index: d.impact_index,
			bin_death_index: d.bin_death_index,
			diff_percent: d.diff_percent
		},
		dx: d.dx,
		dy: d.dy
	}));

	const makeAnnotations = Annotate.annotation()
		.accessors({
			x: d => scaleX(d.bin_death_index) + d.s,
			y: d => d.impact_index * maxHeight * OFFSET + scaleY(d.diff_percent)
		})
		.annotations(annotations);

	$anno.call(makeAnnotations);

	$anno
		.selectAll('.annotation-note-title')
		.selectAll('tspan')
		.filter((d, i) => i !== 0)
		.at('dy', '1.4em');
}

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
	const $p = d3.select(this).parent();
	const [x] = d3.mouse(this);
	const index = Math.floor(scaleX.invert(x));
	if (index >= 30) {
		const datum = d.pageviews.find(p => p.bin_death_index === index);
		const f = formatPercent(datum.diff_percent);
		const y = scaleY(datum.diff_percent);
		$p.selectAll('.tip')
			.text(`${f}`)
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
	width = $chart.node().offsetWidth - MARGIN.left - MARGIN.right;
	height = maxHeight * OFFSET * peopleData.length + maxHeight;
}

function adjustTspan($name) {
	$name.each((d, i, n) => {
		const $n = d3.select(n[i]);
		const $t = $n.selectAll('tspan');
		const sz = $t.size();
		$t.filter((d, i) => i !== 0).at('dy', '1.2em');
		const y = sz > 1 ? -10 : -5;
		$n.at('transform', `translate(0, ${y})`);
	});
}

function resize() {
	updateDimensions();
	const mobile = d3.select('body').node().offsetWidth < BP;
	textWidth = mobile ? REM * 5 : REM * 8;
	maxHeight = mobile ? FONT_SIZE * 6.5 : FONT_SIZE * 5;
	if (mobile) MARGIN.top = 190;

	$svg.at({
		width: width + MARGIN.left + MARGIN.right,
		height: height + MARGIN.top + MARGIN.bottom
	});
	$gVis.at('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);
	$gAnnotations.at('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);

	// scales
	const extent = d3.extent(pageviewData, d => d.bin_death_index);
	scaleX = d3
		.scaleLinear()
		.domain(extent)
		.range([textWidth + FONT_SIZE, width]);

	// const maxV = d3.max(pageviewData, v => Math.abs(v.diff_percent));
	// console.log(maxV);
	const max = 20;

	scaleY = d3
		.scaleLinear()
		.domain([0, max])
		.range([maxHeight, 0]);

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

	const $name = $person.select('.name');

	$name
		.at({
			x: textWidth,
			y: scaleY.range()[0],
			transform: 'translate(0, 0)'
		})
		.selectAll('tspan')
		.remove();

	if (mobile) {
		const $tspan = $name.tspans(d => d3.wordwrap(d.display, 11));
		adjustTspan($name);
	} else
		$person
			.select('.name')
			.text(d => d.display)
			.at('text-anchor', 'end');

	$person
		.select('.after--area')
		.datum(d => d.pageviews)
		.at('d', area);
	$person
		.select('.after--line')
		.datum(d => d.pageviews)
		.at('d', line);

	$person.at('transform', (d, i) => `translate(0,${i * maxHeight * OFFSET})`);

	const rectH = maxHeight * OFFSET;
	const rectY = maxHeight * (1 - OFFSET);
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
			`translate(${MARGIN.left}, ${MARGIN.top - maxHeight * OFFSET})`
		);

	if (mobile) {
		$gAxis
			.selectAll('.tick')
			.select('text')
			.at('text-anchor', 'middle');
	} else {
		$gAxis
			.select('.tick')
			.select('text')
			.at('text-anchor', 'start');
	}

	// ANNOTATIONS
	const getDiff = d => {
		const x = +d.impact_x;
		const match = d.pageviews.find(p => p.bin_death_index === x);
		return match.diff_percent;
	};
	const getDx = d => {
		if (+d.impact_x > 75) return d.impact_dx ? +d.impact_dx : -30;
		return d.impact_dx ? +d.impact_dx : 30;
	};

	const annoData = peopleData.filter(d => d.impact_annotation).map(d => ({
		name: d.name,
		impact_index: d.impact_index,
		impact_type: d.impact_type,
		bin_death_index: +d.impact_x,
		diff_percent: getDiff(d),
		dx: getDx(d),
		dy: d.impact_dy ? +d.impact_dy : -15,
		title: d.impact_annotation,
		padding: 0
	}));
	createAnnotation(annoData);
}

function setupChart() {
	// data
	peopleData.sort((a, b) => {
		const ma = d3.median(a.pageviews, v => v.diff_percent);
		const mb = d3.median(b.pageviews, v => v.diff_percent);
		return d3.descending(ma, mb);
	});

	peopleData.forEach((d, i) => (d.impact_index = i));

	$svg.on('mouseleave', handleSvgExit);
	$person = $gVis.selectAll('.person');

	const $personEnter = $person
		.data(peopleData)
		.enter()
		.append('g.person');

	$person = $personEnter.merge($person);

	$person.append('text.name');

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

function setupToggle() {
	$toggle.on('change', handleToggle);
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
		updateDimensions();
		setupChart();
		setupToggle();
		resize();
	});
}

export default { init, resize, filter };
