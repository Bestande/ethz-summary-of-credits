import fetchAll from './scraper';

require('isomorphic-fetch');

const example = () => {
	return fetchAll('<username>', '<password>', fetch, progress => {
		console.log('progress', progress);
	});
};

example()
	.then(result => {
		console.log('result is', result);
	})
	.catch(err => {
		console.log('got error', err);
	});
