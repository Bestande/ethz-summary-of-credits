const cheerio = require('cheerio-without-node-native');
const _ = require('underscore');

export const config = {
	AUTH_URL: 'https://idagreen.uzh.ch/re/',
	USER_AGENT:
		'Mozilla WebKit/537.36 (KHTML, like Gecko) eth-summary-of-credits 1.0' // Needs to be Mozilla Webkit in order to work, but also expose that the request is from 'eth-summary-of-credits'
};

export const makeShibbolethConsentBody = (body: string) => {
	const _$ = cheerio.load(body);
	const _action = _$('form')[0].attribs.action;
	const _data = {};
	_.each(_$('form input'), _input => {
		if (!_input.attribs.name) {
			return;
		}
		if (_input.attribs.name === '_eventId_AttributeReleaseRejected') {
			return;
		}
		if (_input.attribs.value === '_shib_idp_rememberConsent') {
			return;
		}
		if (_.isString(_data[_input.attribs.name])) {
			_data[_input.attribs.name] = [
				_data[_input.attribs.name],
				_input.attribs.value
			];
		} else if (_.isArray(_data[_input.attribs.name])) {
			_data[_input.attribs.name].push(_input.attribs.value);
		} else {
			_data[_input.attribs.name] = _input.attribs.value;
		}
	});
	return {_action, _data};
};
