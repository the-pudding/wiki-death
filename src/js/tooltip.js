import truncate from './utils/truncate';

function hide(el) {
	el.classed('is-visible', false);
}

function show({ el, d, pos }) {
	const t = truncate({
		text: d.extract_html,
		chars: 200,
		clean: true,
		ellipses: true
	});

	el.select('.name').text(d.display.replace(/\(.*\)/g, '').trim());
	el.select('.date-of-death').text(`${d.date_of_death}, ${d.year_of_death}`);
	el.select('.year-of-death').text(d.year_of_birth);
	el.select('.bio').text(t);
	el.select('.thumbnail').at('src', d.thumbnail_source);
	el.st({
		top: pos.y,
		left: pos.x
	}).classed('is-visible', true);
}

function init({ container }) {
	const $tip = container.append('div.tooltip');

	const $info = $tip.append('div.info');

	$info.append('p.name');
	$info.append('p.date-of-death');
	$info.append('p.year-of-death');

	const $bio = $info.append('p.bio');
	$bio.append('img.thumbnail');

	const $stats = $tip.append('div.stats');

	return $tip;
}

export default { init, show, hide };
