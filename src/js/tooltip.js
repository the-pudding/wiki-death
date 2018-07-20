import truncate from './utils/truncate';

const HEADER_HEIGHT = d3.select('header').node().offsetHeight;
const MARGIN = 32;

function getPos({ el, pos }) {
	el[1].st({
		top: pos.y,
		left: pos.x
	});
	const { top, left, right } = el[1].node().getBoundingClientRect();

	const topDiff = top - HEADER_HEIGHT;

	const className = {
		center: true,
		left: false,
		right: false,
		bottom: false
	};

	if (topDiff < 0) className.bottom = true;

	if (right > window.innerWidth - MARGIN) {
		className.center = false;
		className.right = true;
	}
	if (left < MARGIN) {
		className.center = false;
		className.left = true;
	}

	return className;
}

function hide(el) {
	el[0].classed('is-visible', false);
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
		$el.select('.cause span').text(d.cause_specific);
		$el
			.select('.thumbnail')
			.st('background-image', `url(${d.thumbnail_source})`);
	});

	const left = pos.x;
	const top = pos.y;

	el[1].st({ top, left });

	const className = getPos({ el, pos });

	el[0]
		.st({ top, left })
		.classed('is-visible', true)
		.classed('is-center', className.center)
		.classed('is-right', className.right)
		.classed('is-left', className.left)
		.classed('is-bottom', className.bottom);
}

function init({ container }) {
	const tip = container.append('div.tooltip');
	const tipH = container.append('div.tooltip.tooltip--hidden');
	const el = [tip, tipH];

	el.forEach($el => {
		const $info = $el.append('div.info');

		const $display = $info.append('p.display');
		$display.append('span.name');
		$display.append('span.date-of-death');

		const $bio = $info.append('p.bio');
		$bio.append('div.thumbnail');
		$bio.append('span');

		$info.append('p.cause').html('Cause of death: <span></span>');

		$el.append('div.stats');
	});

	return [tip, tipH];
}

export default { init, show, hide };
