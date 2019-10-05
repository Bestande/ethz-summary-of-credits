import fetchAll from './scraper';

const example = () => {
	return fetchAll(
		'<username>',
		'<password>',
		require('node-fetch'),
		progress => {
			console.log('progress', progress);
		}
	);
};

example()
	.then(result => {
		console.log('result is', result);
	})
	.catch(err => {
		console.log('got error', err);
	});
