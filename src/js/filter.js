import uniq from 'lodash.uniqby';
import graphicPerspective from './graphic-perspective';
import graphicCare from './graphic-care';
import graphicChange from './graphic-change';
import graphicImpact from './graphic-impact';

const $filters = d3.select('.filters');
const $label = $filters.select('.label');
const $remove = $filters.select('.remove');
const $value = $label.select('.label__value');

function toggle() {
	const visible = !$filters.classed('is-visible');
	$filters.classed('is-visible', visible);
}

function remove() {
	$value.html('');
	$filters.classed('is-visible', false);
	$filters.classed('is-active', false);
	graphicCare.filter({});
	graphicChange.filter({});
	graphicImpact.filter({});
	graphicPerspective.filter({});
}

function update() {
	const $sel = d3.select(this);
	const value = $sel.text();
	const name = $sel.at('data-name');
	$value.html(`${name}: ${value}`);
	$filters.classed('is-visible', false);
	$filters.classed('is-active', true);
	graphicCare.filter({ name: name.toLowerCase(), value });
	graphicChange.filter({ name: name.toLowerCase(), value });
	graphicImpact.filter({ name: name.toLowerCase(), value });
	graphicPerspective.filter({ name: name.toLowerCase(), value });
}

export default function init({ name, data }) {
	const lower = name.toLowerCase();
	const unique = uniq([].concat(...data.map(d => d[lower])));
	unique.sort(d3.ascending);
	// unique.unshift(name);

	const $ul = $filters.select(`.filter--${lower} ul`);

	$ul
		.selectAll('li')
		.data(unique)
		.enter()
		.append('li')
		.text(d => d)
		.at('data-name', name)
		.on('click', update);
}

$label.on('click', toggle);
$remove.on('click', remove);
