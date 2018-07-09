import scrollama from 'scrollama';
import stickyfill from 'stickyfilljs';

// D3 is included by globally by default
let peopleData = null;
let pageviewData = null;

const $section = d3.select('#persective');
const $graphic = $section.select('.scroll__graphic');
const $text = $section.select('.scroll__text');
const $svg = $graphic.select('svg');
const $gVis = $svg.select('.g-vis');
const $gAxis = $svg.select('.g-axis');

function resize() {}

function setupChart() {}

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
		share: +d.share
	}));
}

function loadData() {
	const filenames = ['people', 'pageviews-bin-2'];
	const filepaths = filenames.map(f => `assets/data/${f}.csv`);
	d3.loadData(...filepaths, (err, response) => {
		peopleData = cleanPeopleData(response[0]);
		pageviewData = cleanPageviewData(response[1]);
		console.log({ peopleData, pageviewData });
		setupChart();
	});
}

function init() {
	loadData();
}

export default { init, resize };
