import {ModuleType} from './module-type';

export type Institution = 'UZH' | 'ETH';

export type CreditStatus =
	| 'PASSED'
	| 'DESELECTED'
	| 'FAILED'
	| 'ADDED'
	| 'BOOKED'
	| 'CONTINUE'
	| 'UNKNOWN_STATUS'
	| 'UNKNOWN'
	| 'NOT_BOOKED';

export type ImageSize = {
	width: number;
	height: number;
	type?: string;
	orientation?: number;
};

type BuildingFeature =
	| 'MUSEUM'
	| 'LIBRARY'
	| 'DEFIBRILLATOR'
	| 'VALIDATION'
	| 'CAFETERIA'
	| 'PC_ROOM'
	| 'ATM';

export type Building = {
	code: string;
	longitude: number;
	latitude: number;
	features: BuildingFeature[];
	hasPlan: boolean;
};

export type RoomType = {
	university: Institution;
	name: string;
	id: string;
	location?: {
		longitude: number;
		latitude: number;
	} | null;
	plan?: string | null;
	plan_dimensions?: ImageSize | null;
	subtitle?: string | null;
	campus?: string | null;
	building?: Building;
	address?: string;
};

export type ImageType = {
	cdn_identifier: string;
	alt_text?: string;
	source?: string;
	source_url?: string;
};

export type RawPerson = {
	title?: string;
	first_name?: string;
	last_name?: string;
	name: string;
	university: Institution;
	uni_identifier: string;
	image?: ImageType;
	header_image?: ImageType;
	_id?: string;
	titles?: string;
};

export type EventType = {
	_id?: string;
	university: Institution;
	event_serie_id: string;
	id?: string;
	period: number;
	start_date: string | Date | null;
	end_date: string | Date | null;
	people?: RawPerson[];
	rooms: RoomType[];
	uni_identifier?: string;
	semester?: string;
	category?: ModuleType;
	number?: number;
	smart?: boolean;
	comments?: string;
	eth_exam_type?: 'written' | 'oral' | null;
	eth_exam_helpers?: string | null;
	eth_personal_examinator?: string[];
};

export type CreditStats = {
	total_credits: number;
	weighted_average: number;
};

export type Direction = {
	code: string;
	name: string;
};

export type UntypedCreditAmount = null | string | number;
export type UntypedGrade = null | string | number;

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

export type Credit = {
	name: string;
	short_name: string;
	credits_worth: UntypedCreditAmount;
	credits_received: UntypedCreditAmount;
	status: CreditStatus;
	grade: UntypedGrade;
	// TODO: Remove this one
	lastWeighted?: boolean;
	institution?: Institution;
	university?: Institution;
	uni_identifier?: string | null;
	link?: string | null;
	weight?: number | null;
	period?: number;
	semester?: string | null;
	key?: string;
	// TODO: Add Semester type
	semesters?: any[];
	module?: null | string;
	encompasses?: string[];
	type?: undefined;
	exams_events?: EthPersonalExam[];
};

export type Block = {
	name: string;
	short_name: never;
	period: number;
	grade: string;
	institution: 'ETH';
	status: CreditStatus;
	credits_received: number;
	credits_worth?: number;
	encompasses: string[];
	weight: undefined;
	link: never;
	uni_identifier: never;
};

export interface MyStudiesConfig {
	event_serie_id: string;
	day: string;
	time: string;
	room: string;
}

export interface MyStudiesSchedule {
	uni_identifier: string;
	selected: MyStudiesConfig[];
}

export type LoginResponse = {
	demo?: boolean;
	version?: number;
	stats?: CreditStats;
	directions: Direction[];
	warning?: string | null;
	credits: Credit[];
	success: true;
	blocks?: Block[];
	schedule?: MyStudiesSchedule[];
	identity?: any;
};
