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

function show({ el, d, pos, mobile }) {
	// content
	el.forEach($el => {
		$el.select('.name').text(d.display);
		$el.select('.date-of-death').text(`${d.date_of_death}, ${d.year_of_death}`);
		$el.select('.bio span').text(d.extract_truncated);
		$el.select('.cause span').text(d.cause_specific);
		$el
			.select('.thumbnail')
			.st('background-image', `url(${d.thumbnail_source})`);
	});

	const left = pos.x;
	const top = pos.y;

	el[1].st({ top, left });

	const className = getPos({ el, pos });

	if (!mobile) {
		el[0]
			.st({ top, left })
			.classed('is-visible', true)
			.classed('is-center', className.center)
			.classed('is-right', className.right)
			.classed('is-left', className.left)
			.classed('is-bottom', className.bottom);
	} else {
		el[0].classed('is-visible', true);
	}
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

		$el
			.append('div.close')
			.append('button')
			.text('Close');
	});

	return [tip, tipH];
}

export default { init, show, hide };
