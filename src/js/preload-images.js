import loadImage from './utils/load-image';

export default function(people) {
	let i = 0;

	const next = () => {
		const url = people[i].thumbnail_source;
		loadImage(url, () => {
			i += 1;
			if (i < people.length) next();
			else console.log('done preloading images');
		});
	};

	next();
}
