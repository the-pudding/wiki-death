import convertTimestampToDate from './convert-timestamp-to-date';

function people(data) {
	return data.map((d, i) => ({
		...d,
		index: i,
		max_change_before_views: +d.max_change_before_views,
		max_change_before_views_adjusted: +d.max_change_before_views_adjusted,
		max_change_before_share: +d.max_change_before_share,

		median_views_before: +d.median_views_before,
		median_views_adjusted_before: +d.median_views_adjusted_before,
		median_share_before: +d.median_share_before,

		max_views: +d.max_views,
		max_views_adjusted: +d.max_views_adjusted,
		max_share: +d.max_share,

		thumbnail_width: +d.thumbnail_width,
		thumbnail_height: +d.thumbnail_height,
		year_of_birth: +d.year_of_birth,
		year_of_death: +d.year_of_death
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
		share: +d.share,
		date: convertTimestampToDate(d.timestamp)
	}));
}

export default { people, pageview };
