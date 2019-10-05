export const periodToNumber = (period: string | null): number | null => {
	if (!period) {
		return null;
	}
	if (!period.match(/[0-9]{4}(S|W)/)) {
		throw new Error('Invalid ETH number');
	}
	const year = parseInt(period, 10);
	const semester = period.substr(-1);
	return parseInt(year.toString() + (semester === 'S' ? '1' : '2'), 10);
};
