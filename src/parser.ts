import {pickBy, flatten, isNumber, omit} from 'lodash';
import moment from 'moment-timezone';
import {periodToNumber} from './period-to-number';
import {EXAM, ModuleType} from './module-type';
import {Institution, CreditStatus, RoomType, EventType} from './types';

const ETH = 'ETH';
const currentPeriod = 20192;

const cheerio = require('cheerio-without-node-native');

const convertSessionToPeriod = (session: string) => {
	const isWinter = session[0] === 'W';
	const year = parseInt(session.substr(1), 10);
	return parseInt(
		String(2000 + year - (isWinter ? 1 : 0)) + String(isWinter ? '2' : '1'),
		10
	);
};

const getStatus = (grade: string): CreditStatus => {
	if (grade.match(/NB/)) {
		return 'FAILED';
	}
	if (grade.match(/Best/)) {
		return 'PASSED';
	}
	const number = parseFloat(grade);
	if (isNaN(number)) {
		return 'UNKNOWN_STATUS';
	}
	if (number >= 4) {
		return 'PASSED';
	}
	return 'FAILED';
};

const splitYearlyCourses = modules => {
	return flatten(
		modules.map(m => {
			if (m.combined_exam && m.name.includes('/')) {
				const [first, second] = m.name.split('/');
				return [
					{
						...m,
						name: second,
						short_name: second,
						weight: isNumber(m.weight) ? m.weight / 2 : m.weight,
						credits_received: m.credits_received
							? parseFloat(m.credits_received) / 2
							: null
					},
					{
						...m,
						name: first,
						short_name: first,
						weight: isNumber(m.weight) ? m.weight / 2 : m.weight,
						uni_identifier: 'orphan-' + m.uni_identifier,
						credits_received: m.credits_received
							? parseFloat(m.credits_received) / 2
							: null
					}
				];
			}
			return m;
		})
	);
};

export const parseSchedule = (body: string) => {
	const event_series_map: {[key: string]: number} = {};
	const getEventSeriesNumeration = (event_serie_id: string) => {
		if (!event_series_map[event_serie_id]) {
			event_series_map[event_serie_id] = 0;
		}
		return event_serie_id + '-' + event_series_map[event_serie_id]++;
	};
	const $ = cheerio.load(body);
	const rows = $('.tablelist > tbody > tr');
	return rows
		.map((ids: number, row: CheerioElement) => {
			const href = $(row)
				.find('td:nth-child(4) a')
				.attr('href');
			const event_serie_id = href
				? getEventSeriesNumeration(
						href.match(/lehrveranstaltungId=([0-9]+)/)[1]
				  )
				: null;
			const rooms = $(row)
				.find('td:nth-child(1)')
				.find('tr')
				.map((i: number, tr: CheerioElement) => {
					const id = $(tr)
						.text()
						.trim();
					return {
						room: id
							.replace('»', '')
							.replace(/\s/g, ' ')
							.trim(),
						checked:
							$(tr)
								.find('td input')
								.attr('checked') || null,
						day: $(row)
							.find('td:nth-child(4)')
							.text()
							.trim(),
						time: $(row)
							.find('td:nth-child(5)')
							.text()
							.trim(),
						event_serie_id
					};
				})
				.toArray();
			const uni_identifier = $(row)
				.find('td:nth-child(6)')
				.text()
				.trim();
			return {
				uni_identifier,
				selected: rooms.filter(r => r.checked).map(r => omit(r, 'checked'))
			};
		})
		.toArray()
		.filter(a => a.uni_identifier)
		.map(el => ({
			...el,
			uni_identifier:
				el.uni_identifier.substr(0, el.uni_identifier.length - 1).trim() + 'L'
		}));
};

export const parseGrades = (body: string) => {
	const $ = cheerio.load(body);
	const rows = $('.tablelist tr');
	const onlyMain = rows
		.filter((i: number, r: CheerioElement) => {
			return (
				$(r)
					.find('td')
					.eq(0)
					.attr('nowrap') === 'nowrap'
			);
		})
		.map((i: number, m: CheerioElement) => {
			const tds = $(m).find('td');
			const name = tds
				.eq(1)
				.text()
				.trim();
			const uni_identifier = tds
				.eq(0)
				.text()
				.trim();
			const received = parseFloat(tds.eq(5).text());
			const credits_received = isNaN(received) ? null : received;
			const period = convertSessionToPeriod(tds.eq(2).text());
			const grade = tds.eq(3).text();
			const weight = tds.eq(4).text();
			const parsedUniId =
				uni_identifier.substr(0, uni_identifier.length - 2) + 'L';
			const a = {
				uni_identifier: parsedUniId,
				name,
				grade,
				weight: weight ? parseInt(weight, 10) : null,
				credits_received,
				period,
				status: getStatus(grade),
				credits_worth: tds
					.eq(6)
					.text()
					.trim()
					? parseFloat(tds.eq(6).text())
					: credits_received,
				short_name: name,
				institution: ETH,
				...(uni_identifier.endsWith(' J')
					? {
							combined_exam: parsedUniId
					  }
					: {})
			};
			return a;
		})
		.toArray();
	const blocks = $('td[colspan="2"]');
	const blocksMapped = blocks
		.map((_: number, b: CheerioElement) => {
			const row = $(b).parent('tr');
			const tds = $(row).find('td');
			const name = tds.eq(0).text();
			const period = convertSessionToPeriod(tds.eq(1).text());
			const credits_received = parseFloat(tds.eq(4).text());
			const grade = tds.eq(2).text();
			const encompasses = [];
			const nextRows = row.nextAll('tr');
			let hasEnded = false;
			for (let i = 0; i < nextRows.length; i++) {
				if (
					!hasEnded &&
					$(nextRows.eq(i))
						.find('td')
						.eq(0)
						.attr('nowrap') === 'nowrap'
				) {
					const uni_identifier = $(nextRows.eq(i))
						.find('td')
						.eq(0)
						.text()
						.trim();
					encompasses.push(
						uni_identifier.substr(0, uni_identifier.length - 2) + 'L'
					);
				} else {
					hasEnded = true;
				}
			}
			return {
				name,
				period,
				grade,
				institution: ETH,
				status: getStatus(grade),
				credits_received,
				encompasses
			};
		})
		.toArray();
	return {modules: splitYearlyCourses(onlyMain), blocks: blocksMapped};
};

export const parseProjects = (body: string) => {
	const $ = cheerio.load(body);
	const rows = $('.tablelist tr');
	const onlyMain = rows.filter((i: number, r: CheerioElement) => {
		return $(r).find('td').length > 0;
	});
	const projects = onlyMain
		.map((i: number, m: CheerioElement) => {
			const uni_identifier = $(m)
				.find('td')
				.eq(0)
				.text()
				.trim();
			const name = $(m)
				.find('td')
				.eq(1)
				.text()
				.trim();
			const credits_worth = $(m)
				.find('td')
				.eq(2)
				.text()
				.match(/([0-9.]+)\sKP/);

			const grade = $(m)
				.find('td')
				.eq(7)
				.text()
				.trim();
			return pickBy({
				uni_identifier,
				name,
				short_name: name,
				institution: ETH,
				credits_worth: credits_worth ? credits_worth[1] : null,
				period: periodToNumber(
					$(m)
						.find('td')
						.eq(4)
						.text()
						.trim()
				),
				grade,
				status: grade ? getStatus(grade) : ('BOOKED' as CreditStatus)
			});
		})
		.toArray()
		.filter(p => p.period);
	return projects;
};

export interface EthPersonalExam extends EventType {
	start_date: string;
	end_date: string;
	uni_identifier: string;
	event_serie_id: string;
	number: number;
	category: ModuleType;
	university: Institution;
	rooms: RoomType[];
}

export const parseExams = (body: string): EthPersonalExam[] => {
	const $ = cheerio.load(body);
	const exams: EthPersonalExam[] = [];
	$('tr').each((_: number, tr: CheerioElement) => {
		const room = $(tr)
			.find('td')
			.eq(7)
			.text()
			.replace(/»/g, '')
			.trim();
		const type = $(tr)
			.find('td')
			.eq(1)
			.text()
			.trim();
		const date: string = $(tr)
			.find('td')
			.eq(2)
			.text()
			.trim();
		const time = $(tr)
			.find('td')
			.eq(3)
			.text()
			.trim();
		let uni_identifier: string = $(tr)
			.find('td')
			.eq(4)
			.text()
			.trim()
			.replace(/\s/g, '');
		const eth_exam_helpers =
			$(tr)
				.next('tr')
				.find('.kommentar-le')
				.text()
				.trim() || null;
		uni_identifier = uni_identifier.substr(0, uni_identifier.length - 1) + 'L';
		const dateParsed = date.match(/([0-9]{2})/g);
		const timeParsed = time.match(/([0-9]{2})/g);
		let start_date: string | null = null;
		let end_date: string | null = null;
		if (dateParsed) {
			const probe = `${new Date().getFullYear()}-${dateParsed[1]}-${
				dateParsed[0]
			}`;
			if (new Date(probe).getTime() < Date.now()) {
				start_date = `${new Date().getFullYear() + 1}-${dateParsed[1]}-${
					dateParsed[0]
				}`;
			} else {
				start_date = probe;
			}
		}
		if (timeParsed) {
			start_date = moment(start_date as string)
				.tz('Europe/Zurich')
				.set('hours', parseInt(timeParsed[0], 10))
				.set('minutes', parseInt(timeParsed[1], 10))
				.toDate()
				.toString();
			end_date = moment(start_date)
				.tz('Europe/Zurich')
				.set('hours', parseInt(timeParsed[2], 10))
				.set('minutes', parseInt(timeParsed[3], 10))
				.toDate()
				.toString();
		}
		if (
			type === 's' ||
			(type === 'm' && start_date !== null && end_date !== null)
		) {
			exams.push({
				eth_exam_type: type === 's' ? 'written' : type === 'm' ? 'oral' : null,
				start_date: start_date as string,
				end_date: end_date as string,
				uni_identifier,
				eth_personal_examinator: $(tr)
					.find('td')
					.eq(6)
					.text()
					.trim()
					.split(/\s/g)
					.filter(Boolean) as string[],
				event_serie_id: uni_identifier + '-personal-exam',
				number: 1,
				category: EXAM,
				university: ETH,
				eth_exam_helpers,
				rooms: [
					{
						university: ETH,
						id: room.replace(/\s/g, '-'),
						name: room,
						plan: null,
						plan_dimensions: null,
						subtitle: null,
						campus: null
					}
				],
				people: [],
				// TODO: Fake period
				period: 20191
			});
		}
	});
	return exams.filter(({eth_exam_type}) => {
		return eth_exam_type === 'written' || eth_exam_type === 'oral';
	});
};

export const parseTimetable = (body: string) => {
	const $ = cheerio.load(body);
	const rows = $('.tablelist tr');
	const onlyMain = rows.filter((i: number, r: CheerioElement) => {
		return $(r)
			.find('td')
			.eq(0)
			.hasClass('td-black');
	});
	const periods: number[] = $('option')
		.map((_: number, o: CheerioElement) => {
			return $(o).val();
		})
		.toArray();
	const period = periodToNumber($('option[selected]').val()) || currentPeriod;
	const timetable = onlyMain
		.map((i: number, m: CheerioElement) => {
			const uni_identifier = $(m)
				.find('td')
				.eq(0)
				.text()
				.trim();
			const name = $(m)
				.find('[target=detailFach]')
				.text()
				.trim();
			return {
				uni_identifier,
				name,
				short_name: name,
				status: 'BOOKED' as CreditStatus,
				institution: ETH,
				period,
				credits_worth: parseFloat(
					$(m)
						.find('td')
						.eq(2)
						.text()
						.match(/([0-9.]+)\sKP/)[1]
				),
				credits_received: null
			};
		})
		.toArray();
	return {timetable, otherPeriods: periods.filter(p => p !== period)};
};
