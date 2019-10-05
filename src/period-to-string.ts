export const periodToString = (period: number | string) => {
	const str = String(period);
	const year = str.substr(2, 2);
	const semesterMap = {
		1: 'FS',
		2: 'HS'
	};
	const lastPart = parseInt(str.substr(4, 5), 10);
	const semester =
		lastPart === 1 || lastPart === 2 ? semesterMap[lastPart] : '';
	return `${semester}${year}`;
};
