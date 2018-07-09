export default function convertTimestampToDate(timestamp) {
	const year = timestamp.substring(0, 4);
	const month = +timestamp.substring(4, 6) - 1;
	const date = timestamp.substring(6, 8);
	return new Date(year, month, date);
}
