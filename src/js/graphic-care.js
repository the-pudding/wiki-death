import cleanData from './clean-data';
import tooltip from './tooltip';

const MAX_WEEKS = 12;

let peopleData = null;
let pageviewData = null;
let mobile = false;
const $section = d3.select('#care');
const $figure = $section.select('.figure--chart');
const $ul = $figure.select('ul');

let $tip = null;

function filter({ name, value }) {
	const $person = $ul.selectAll('.person');
	if (name) $person.classed('is-faded', d => !d[name].includes(value));
	else $person.classed('is-faded', false);
}

function handleNameEnter(datum) {
	const m = d3.mouse(this);
	// const sz = this.offsetWidth / 2;
	const [x, y] = d3.mouse($ul.node());
	const pos = { x: x - m[0], y };
	tooltip.show({ el: $tip, d: datum, pos, mobile, useY: true });
}

function resize() {
	mobile = d3.select('body').classed('is-mobile');
}

function setupChart() {
	const nested = d3
		.nest()
		.key(d => d.week_category)
		.entries(peopleData)
		.map(d => ({
			...d,
			key: +d.key
		}));

	const filled = d3.range(MAX_WEEKS + 3).map(i => {
		const match = nested.find(d => d.key === i);
		return match || { key: i, values: [] };
	});

	const $li = $ul
		.selectAll('.week')
		.data(filled)
		.enter()
		.append('li.week');

	$li.append('p.label').html(d => {
		if (d.key === MAX_WEEKS + 1) return `${d.key}+`;
		if (d.key === MAX_WEEKS + 2) return 'TBD';

		const suffix = d.key === 1 ? '' : 's';
		const first = d.key === 0 ? ' until normal traffic' : '';
		return `${d.key}&nbsp;<span>week${suffix}${first}</span>`;
	});

	const $people = $li.append('ul.people');

	const $person = $people
		.selectAll('.person')
		.data(d => d.values)
		.enter()
		.append('li.person');

	if (mobile) {
		$person.on('touchend', handleNameEnter);
	} else {
		$person.on('mouseenter', handleNameEnter).on('mouseleave', () => {
			tooltip.hide($tip);
		});
	}

	const $a = $person.append('a').text(d => d.display);

	if (!mobile) $a.at('href', d => d.link).at('target', '_blank');
}

function getWeeksUntilNorm({ last_updated, pageviews }) {
	const len = pageviews.length;
	const { timestamp } = pageviews[len - 1];
	if (timestamp === last_updated) return null;
	return Math.floor(len / 7);
}

function getWeekCategory(week) {
	if (!week && week !== 0) return MAX_WEEKS + 2;
	return week <= MAX_WEEKS ? week : MAX_WEEKS + 1;
}

function setupTooltip() {
	$tip = tooltip.init({ container: $ul });
	$ul.on('mouseleave', () => {
		tooltip.hide($tip);
	});
}

function loadData(people) {
	return new Promise((resolve, reject) => {
		const filenames = ['care'];
		const filepaths = filenames.map(f => `assets/data/${f}.csv`);
		d3.loadData(...filepaths, (err, response) => {
			if (err) reject(err);
			pageviewData = cleanData.pageview(response[0]);
			peopleData = people
				.map(d => ({
					...d,
					pageviews: pageviewData.filter(p => p.pageid === d.pageid)
				}))
				.map(d => {
					const days_until_norm = d.pageviews.length;
					const weeks_until_norm = getWeeksUntilNorm(d);
					const week_category = getWeekCategory(weeks_until_norm);
					return {
						...d,
						days_until_norm,
						weeks_until_norm,
						week_category
					};
				});
			resolve();
		});
	});
}

function init(people) {
	loadData(people).then(() => {
		resize();
		setupChart();
		setupTooltip();
	});
}

export default { init, resize, filter };
