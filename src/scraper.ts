import {sleep} from 'wait-promise';
import {uniqBy, uniq, flatten, map} from 'lodash';
import qs from 'qs';
import {LoginResponse} from './types';
import {periodToString} from './period-to-string';
import {makeShibbolethConsentBody, config} from './helpers';
import {
	parseExams,
	parseGrades,
	parseProjects,
	parseSchedule,
	parseTimetable
} from './parser';

const IsomorphicFetch = require('real-isomorphic-fetch');
const cheerio = require('cheerio-without-node-native');

const getSchedule = async (fetch, immatrikulationIndex) => {
	await fetch(
		'https://www.lehrbetrieb.ethz.ch/myStudies/studImmatrikulationPre.do',
		{
			method: 'post',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: qs.stringify({
				immatrikulationIndex
			})
		}
	);

	const response = await fetch(
		'https://www.lehrbetrieb.ethz.ch/myStudies/studWillkommen.do',
		{
			method: 'post',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: qs.stringify({
				stundenplan: 'Stundenplan'
			})
		}
	);

	const text = await response.text();
	return text;
};

const getTimetable = async (
	fetch,
	body: {
		immatrikulationIndex: number;
		semkez?: number;
		reload?: string;
	} = {immatrikulationIndex: 1}
) => {
	await fetch(
		'https://www.lehrbetrieb.ethz.ch/myStudies/studImmatrikulationPre.do',
		{
			method: 'post',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: qs.stringify({
				immatrikulationIndex: body.immatrikulationIndex
			})
		}
	);

	const response = await fetch(
		'https://www.lehrbetrieb.ethz.ch/myStudies/belegungenPre.do',
		{
			method: 'post',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: qs.stringify(body)
		}
	);

	const text = await response.text();
	return text;
};

const getExams = async (fetch, immatrikulationIndex) => {
	await fetch(
		'https://www.lehrbetrieb.ethz.ch/myStudies/studImmatrikulationPre.do',
		{
			method: 'post',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: qs.stringify({
				immatrikulationIndex
			})
		}
	);

	const response = await fetch(
		'https://www.lehrbetrieb.ethz.ch/myStudies/pruefungsplanPre.do',
		{
			method: 'post',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: qs.stringify({immatrikulationIndex})
		}
	);

	return response.text();
};

const getProjects = async (fetch, immatrikulationIndex) => {
	await fetch(
		'https://www.lehrbetrieb.ethz.ch/myStudies/studImmatrikulationPre.do',
		{
			method: 'post',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: qs.stringify({
				immatrikulationIndex
			})
		}
	);

	const response = await fetch(
		'https://www.lehrbetrieb.ethz.ch/myStudies/arbeitenAngemeldetPre.do',
		{
			method: 'post',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: qs.stringify({
				immatrikulationIndex
			})
		}
	);

	return response.text();
};

const getGrades = async (fetch, immatrikulationIndex) => {
	const response = await fetch(
		'https://www.lehrbetrieb.ethz.ch/myStudies/studLeistungsueberblickPre.do',
		{
			method: 'post',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: qs.stringify({
				immatrikulationIndex
			})
		}
	);
	return response.text();
};

const getDirections = html => {
	const $ = cheerio.load(html);
	return [
		{
			code: null,
			name: $('.tablelist')
				.nextAll('h4')
				.text()
		}
	];
};

const getImmatriculations = html => {
	html = html.replace('target="_blank""', 'target="_blank"');
	const $ = cheerio.load(html);
	return $('input[name="immatrikulationIndex"]')
		.map((i, elem) => $(elem).attr('value'))
		.toArray();
};

const getPersonal = html => {
	const $ = cheerio.load(html);
	const title = $('#servicenav div')
		.eq(0)
		.text();
	const parenthesesRegex = /\s*\(.*?\)\s*/g;
	const name = title.replace(parenthesesRegex, '');
	const names = name
		.trim()
		.split('\t')
		.map(s => s.trim())
		.filter(Boolean);
	const matriculate = title.match(parenthesesRegex)[0].trim();
	return {
		name: {
			last: names[names.length - 1],
			first: names.splice(0, names.length - 1).join(' ')
		},
		matriculateNumber: matriculate.substr(1, matriculate.length - 2)
	};
};

const getStuff = async (isomorphicFetch, immatrikulationIndex) => {
	const scheduleHtml = await getSchedule(isomorphicFetch, {
		immatrikulationIndex
	});
	const schedule = parseSchedule(scheduleHtml);
	const timetable = await getTimetable(isomorphicFetch, {immatrikulationIndex});
	const {timetable: timetableParsed, otherPeriods} = parseTimetable(timetable);
	const otherTimetables = [];
	for (const semkez of otherPeriods) {
		await sleep(1000);
		const other = await getTimetable(isomorphicFetch, {
			semkez,
			reload: 'Semester',
			immatrikulationIndex
		});
		otherTimetables.push(other);
	}
	const otherTimetablesParsed = flatten(
		otherTimetables.map(parseTimetable).map(t => t.timetable)
	);
	await sleep(1000);
	const grades = await getGrades(isomorphicFetch, immatrikulationIndex);
	await sleep(1000);
	const works = await getProjects(isomorphicFetch, immatrikulationIndex);
	const exams = await getExams(isomorphicFetch, immatrikulationIndex);
	const examsParsed = parseExams(exams);
	const {modules, blocks} = parseGrades(grades);
	const aggregatedCredits = [
		...modules,
		...parseProjects(works),
		...otherTimetablesParsed,
		...timetableParsed
	];
	const resolvedOrphanCredits = aggregatedCredits
		.map(c => {
			if (c.uni_identifier.startsWith('orphan')) {
				const replacement = aggregatedCredits.find(ac => {
					return ac.name === c.name && !ac.uni_identifier.startsWith('orphan');
				});
				if (replacement) {
					c.name = replacement.name;
					c.short_name = replacement.short_name;
					c.uni_identifier = replacement.uni_identifier;

					const correspondingBlock = blocks.find(block => {
						return block.encompasses.find(e => e === c.combined_exam);
					});
					if (correspondingBlock) {
						correspondingBlock.encompasses.push(replacement.uni_identifier);
						correspondingBlock.encompasses = uniq(
							correspondingBlock.encompasses
						);
					}
				}
			}
			const orphanCounterpart = aggregatedCredits.find(a => {
				return (
					a.uni_identifier.startsWith('orphan') && a.short_name === c.short_name
				);
			});
			if (orphanCounterpart) {
				return null;
			}
			return c;
		})
		.filter(c => {
			if (!c) {
				return false;
			}
			if (!c.uni_identifier) {
				return true;
			}
			return !c.uni_identifier.startsWith('orphan');
		});
	const credits = uniqBy(
		resolvedOrphanCredits.map(a => {
			return {
				...a,
				exams_events: examsParsed
					.filter(e => e.uni_identifier === a.uni_identifier)
					.map(e => {
						return {
							...e,
							semester: periodToString(a.period)
						};
					})
			};
		}),
		c => c.uni_identifier + c.period
	);
	return {
		credits,
		blocks,
		schedule
	};
};

const fetchAll = async (
	username: string,
	password: string,
	fetch,
	feedback
): Promise<LoginResponse> => {
	if (!username) {
		throw new Error('NO_USERNAME');
	}
	if (!password) {
		throw new Error('NO_PASSWORD');
	}
	const isomorphicFetch = new IsomorphicFetch(fetch);
	feedback('CONTACT_ETHZ_CH');
	const response = await isomorphicFetch(
		'https://www.lehrbetrieb.ethz.ch/Shibboleth.sso/LoginETHZ?target=https%3A%2F%2Fwww.lehrbetrieb.ethz.ch%2FmyStudies%2Flogin.do%3Flang%3Dde&javaScriptEnabled=true',
		{
			headers: {
				'Cache-Control': 'max-age='
			}
		}
	);
	const body = await response.text();
	const $1 = cheerio.load(body);
	const saml = $1('input[name="SAMLRequest"]').val();
	const relayState = $1('input[name="RelayState"]').val();
	feedback('CONNECTED');
	const response2 = await isomorphicFetch(
		'https://aai-logon.ethz.ch/idp/profile/SAML2/POST/SSO',
		{
			method: 'POST',
			body: qs.stringify({
				RelayState: relayState,
				SAMLRequest: saml
			}),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		}
	);
	const body2 = await response2.text();
	const url = body2.match(/action="(.*?)"/);
	if (!url) {
		throw new Error('Invalid first request ETH');
	}
	feedback('LOGGING_IN');
	const body3 = await isomorphicFetch(`https://aai-logon.ethz.ch${url[1]}`, {
		method: 'POST',
		body: qs.stringify({
			j_username: username,
			j_password: password,
			donotcache: 1,
			_shib_idp_revokeConsent: 'true',
			form_flavour: 'eth_form',
			_eventId_proceed: '',
			_charset_: 'UTF-8',
			':formstart': '/content/main/de/jcr:content/par/start',
			':formid': '_content_main_de_jcr_content_par_start'
		}),
		credentials: 'include',
		headers: {
			'User-Agent': config.USER_AGENT,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		redirect: 'manual'
	});
	const html3 = await body3.text();
	if (
		html3.match(/Authentication failed/) ||
		html3.match(/Anmeldung ist fehlgeschlagen/)
	) {
		throw new Error('USERNAME_PW_WRONG_ETH');
	}
	feedback('LOGGED_IN');

	const {_action, _data} = makeShibbolethConsentBody(html3);
	const response4 = await isomorphicFetch(
		`https://aai-logon.ethz.ch${_action}`,
		{
			body: qs.stringify({..._data, _eventId_proceed: ''}, {indices: false}),
			headers: {
				'User-Agent': config.USER_AGENT,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			method: 'POST',
			redirect: 'manual',
			credentials: 'include'
		}
	);
	const html4 = await response4.text();
	const data = {};
	const $ = cheerio.load(html4);
	map($('form input'), input => {
		if (!input.attribs.name) {
			return;
		}
		data[input.attribs.name] = input.attribs.value;
	});
	feedback('LOADING_MODULES');

	try {
		const a = $('form')[0].attribs.action; // @typescript-eslint/no-unused-vars
	} catch (err) {
		throw new Error(
			'Der ETH-Server hat eine unbekannte Antwort gegeben. Du kannst uns unter info@bestande.ch kontaktieren.'
		);
	}
	const response5 = await isomorphicFetch(`${$('form')[0].attribs.action}`, {
		method: 'POST',
		body: qs.stringify(data),
		headers: {
			'User-Agent': config.USER_AGENT,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		redirect: 'manual',
		credentials: 'include'
	});
	const html5 = await response5.text();
	if (!html5) {
		throw new Error('COOKIES_DISABLED');
	}
	const $2 = cheerio.load(html5);
	const html6 = await isomorphicFetch(
		`https://www.lehrbetrieb.ethz.ch/${$2('form')[0].attribs.action}`,
		{
			method: 'post',
			'Content-Type': 'application/x-www-form-urlencoded',
			body: qs.stringify({
				javaScriptEnabled: true
			})
		}
	);
	const body6 = await html6.text();
	const immatriculations = getImmatriculations(body6);

	let combinedCredits = [];
	let combinedBlocks = [];
	let combinedSchedules = [];
	for (const immatriculation of immatriculations) {
		const {credits, blocks, schedule} = await getStuff(
			isomorphicFetch,
			immatriculation
		);
		combinedCredits = [...combinedCredits, ...credits];
		combinedSchedules = [...combinedSchedules, ...schedule];
		combinedBlocks = [...combinedBlocks, ...blocks];
	}
	return {
		demo: false,
		credits: combinedCredits,
		blocks: combinedBlocks,
		schedule: combinedSchedules,
		directions: getDirections(body6),
		//identity: getPersonal(body6),
		success: true,
		version: 6
	};
};

export default fetchAll;
