import cleanData from './clean-data';

const MARGIN = { top: 60, bottom: 10, left: 10, right: 10 };
const FONT_SIZE = 12;
const REM = 16;
const MAX_HEIGHT = FONT_SIZE * 5;
const TEXT_WIDTH = REM * 8;

let width = 0;
let height = 0;
let peopleData = null;
let pageviewData = null;

const $section = d3.select('#impact');
const $figure = $section.select('figure');
const $chart = $figure.select('.figure__chart');
const $svg = $chart.select('svg');
const $gVis = $svg.select('.g-vis');
const $gAxis = $svg.select('.g-axis');

function updateDimensions() {
	const h = window.innerHeight;
	width = $chart.node().offsetWidth - MARGIN.left - MARGIN.right;
	height = MAX_HEIGHT * peopleData.length;
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

	const $person = $gVis.selectAll('.person');

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

	$person.at('transform', (d, i) => `translate(0,${i * MAX_HEIGHT * 0.35})`);
}

function setupChart() {
	// data
	peopleData.sort((a, b) => {
		const ma = d3.median(a.pageviews, v => v.diff_percent);
		const mb = d3.median(b.pageviews, v => v.diff_percent);
		return d3.descending(ma, mb);
	});

	const $person = $gVis
		.selectAll('.person')
		.data(peopleData)
		.enter()
		.append('g.person');

	$person.append('text').text(d => d.display.replace(/\(.*\)/g, '').trim());

	$person.append('path.after--area');

	$person.append('path.after--line');
}

function loadData() {
	return new Promise((resolve, reject) => {
		const filenames = ['people', 'impact'];
		const filepaths = filenames.map(f => `assets/data/${f}.csv`);
		d3.loadData(...filepaths, (err, response) => {
			if (err) reject(err);
			const tempPeopleData = cleanData.people(response[0]);
			pageviewData = cleanData.ma(response[1]);
			peopleData = tempPeopleData.map(d => {
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
			});
			resolve();
		});
	});
}

function init() {
	loadData().then(() => {
		updateDimensions();
		setupChart();
		resize();
	});
}

export default { init, resize };
