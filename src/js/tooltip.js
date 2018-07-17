import truncate from './utils/truncate';

const HEADER_HEIGHT = d3.select('header').node().offsetHeight;
const MARGIN = 32;

function getPos({ el, pos }) {
	el[1].st({
		top: pos.y,
		left: pos.x
	});
	const { top, bottom, left, right } = el[1].node().getBoundingClientRect();

	const topDiff = top - HEADER_HEIGHT;
	const t = topDiff < 0 ? topDiff : 0;

	const className = {
		center: true,
		left: false,
		right: false
	};
	if (right > window.innerWidth - MARGIN) {
		className.center = false;
		className.right = true;
	}
	if (left < MARGIN) {
		className.center = false;
		className.left = true;
	}

	return { top: pos.y + t, className };
}

function hide(el) {
	el[0].tip.classed('is-visible', false);
}

function show({ el, d, pos }) {
	const t = truncate({
		text: d.extract,
		chars: 150,
		clean: true,
		ellipses: true
	});

	// content
	el.forEach($el => {
		$el.select('.name').text(d.display);
		$el.select('.date-of-death').text(`${d.date_of_death}, ${d.year_of_death}`);
		$el.select('.bio span').text(t);
		$el
			.select('.thumbnail')
			.st('background-image', `url(${d.thumbnail_source})`);
	});

	el[1].st({
		top: pos.y,
		left: pos.x
	});

	const { top, className } = getPos({ el, pos });
	const left = pos.x;

	el[0]
		.st({ top, left })
		.classed('is-visible', true)
		.classed('is-center', className.center)
		.classed('is-right', className.right)
		.classed('is-left', className.left);
}

function init({ container }) {
	const tip = container.append('div.tooltip');
	const tipH = container.append('div.tooltip--hidden');
	const el = [tip, tipH];

	el.forEach($el => {
		const $info = $el.append('div.info');

		const $display = $info.append('p.display');
		$display.append('span.name');
		$display.append('span.date-of-death');

		const $bio = $info.append('p.bio');
		$bio.append('div.thumbnail');
		$bio.append('span');

		$el.append('div.stats');
	});

	return [tip, tipH];
}

export default { init, show, hide };
