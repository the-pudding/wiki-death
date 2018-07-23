import convertTimestampToDate from './convert-timestamp-to-date';
import truncate from './utils/truncate';

function people(data) {
	const chars = 235;
	const clean = true;
	const ellipses = true;

	const output = data.map((d, i) => ({
		...d,
		index: i,
		display: d.display.replace(/\(.*\)/g, '').trim(),
		link: `https://en.wikipedia.org${d.link}`,
		extract_truncated: truncate({ text: d.extract, chars, clean, ellipses }),

		mean_views_adjusted_bd_1: +d.mean_views_adjusted_bd_1,
		mean_views_adjusted_bd_2: +d.mean_views_adjusted_bd_2,

		median_views_adjusted_bd_2: +d.median_views_adjusted_bd_2,

		death_views_2: +d.death_views_2,
		death_views_adjusted_2: +d.death_views_adjusted_2,

		thumbnail_width: +d.thumbnail_width,
		thumbnail_height: +d.thumbnail_height,
		year_of_birth: +d.year_of_birth,
		year_of_death: +d.year_of_death,

		iqr_1: +d.iqr_1,
		std_1: +d.std_1,

		industry: d.industry.split(',').map(v => v.trim()),
		cause: [d.cause.trim()],
		perspective_show: !!d.perspective_show
	}));
	const missing = output.filter(d => !d.industry[0].length);
	if (missing.length) console.log({ missing });
	return output;
}

function pageview(data) {
	return data.map(d => ({
		...d,
		pageid: d.pageid || 'beyonce',
		bin: +d.bin,
		bin_death_index: +d.bin_death_index,
		views: +d.views,
		views_adjusted: +d.views_adjusted,
		date: convertTimestampToDate(d.timestamp)
	}));
}

function ma(data) {
	return data.map(d => ({
		...d,
		pageid: d.pageid,
		bin_death_index: +d.bin_death_index,
		ma: +d.ma,
		diff: +d.diff,
		diff_percent: +d.diff_percent,
		diff_views: +d.diff_views,
		diff_percent_views: +d.diff_percent_views
	}));
}

export default { people, pageview, ma };
