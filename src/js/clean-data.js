import convertTimestampToDate from './convert-timestamp-to-date';

function people(data) {
	return data.map((d, i) => ({
		...d,
		index: i,
		mean_views_adjusted_bd_2: +d.mean_views_adjusted_bd_2,

		death_views_2: +d.death_views_2,
		death_views_adjusted_2: +d.death_views_adjusted_2,

		thumbnail_width: +d.thumbnail_width,
		thumbnail_height: +d.thumbnail_height,
		year_of_birth: +d.year_of_birth,
		year_of_death: +d.year_of_death,

		iqr_1: +d.iqr_1,
		std_1: +d.std_1
	}));
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

export default { people, pageview };
