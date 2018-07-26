// D3 is included by globally by default
import debounce from 'lodash.debounce';
import isMobile from './utils/is-mobile';
import graphicPerspective from './graphic-perspective';
import graphicCare from './graphic-care';
import graphicChange from './graphic-change';
import graphicImpact from './graphic-impact';
import preloadImages from './preload-images';
import filter from './filter';
import cleanData from './clean-data';

const $body = d3.select('body');
let previousWidth = 0;

function resize() {
	// only do resize on width changes, not height
	// (remove the conditional if you want to trigger on height change)
	const width = $body.node().offsetWidth;
	if (previousWidth !== width) {
		previousWidth = width;
		// graphicPerspective.resize();
		graphicChange.resize();
		// graphicCare.resize();
		// graphicImpact.resize();
	}
}

function setupStickyHeader() {
	const $header = $body.select('header');
	if ($header.classed('is-sticky')) {
		const $menu = $body.select('.header__menu');
		const $toggle = $body.select('.header__toggle');
		$toggle.on('click', () => {
			const visible = $menu.classed('is-visible');
			$menu.classed('is-visible', !visible);
			$toggle.classed('is-visible', !visible);
		});
	}
}

function init() {
	// add mobile class to body tag
	$body.classed('is-mobile', isMobile.any());
	// setup resize event
	window.addEventListener('resize', debounce(resize, 150));
	// setup sticky header menu
	setupStickyHeader();

	// kick off graphic code
	d3.loadData('assets/data/people.csv', (err, response) => {
		const peopleData = cleanData.people(response[0]);
		// graphicPerspective.init(peopleData);
		graphicChange.init(peopleData);
		// graphicCare.init(peopleData);
		// graphicImpact.init(peopleData);
		// filter({ name: 'Industry', data: peopleData });
		// filter({ name: 'Cause', data: peopleData });
		// preloadImages(peopleData);
	});
}

init();
