/*
 * Copyright 2019-2020 Antonio Román
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * The supported time types
 */
const enum TimeTypes {
	Second = 'SECOND',
	Minute = 'MINUTE',
	Hour = 'HOUR',
	Day = 'DAY',
	Week = 'WEEK',
	Month = 'MONTH',
	Year = 'YEAR'
}

/**
 * The duration of each time type in milliseconds
 */
const kTimeDurations: ReadonlyArray<[TimeTypes, number]> = [
	[TimeTypes.Year, 31536000000],
	// 29.53059 days is the official duration of a month: https://en.wikipedia.org/wiki/Month
	[TimeTypes.Month, 2628000000],
	[TimeTypes.Week, 1000 * 60 * 60 * 24 * 7],
	[TimeTypes.Day, 1000 * 60 * 60 * 24],
	[TimeTypes.Hour, 1000 * 60 * 60],
	[TimeTypes.Minute, 1000 * 60],
	[TimeTypes.Second, 1000],
];

const TIMES = {
	YEAR: {
		1: 'year',
		DEFAULT: 'years',
	},
	MONTH: {
		1: 'month',
		DEFAULT: 'months',
	},
	WEEK: {
		1: 'week',
		DEFAULT: 'weeks',
	},
	DAY: {
		1: 'day',
		DEFAULT: 'days',
	},
	HOUR: {
		1: 'hour',
		DEFAULT: 'hours',
	},
	MINUTE: {
		1: 'minute',
		DEFAULT: 'minutes',
	},
	SECOND: {
		1: 'second',
		DEFAULT: 'seconds',
	},
} as const;

/**
 * Adds an unit, if non zero
 * @param time The duration of said unit
 * @param unit The unit language assets
 */
function addUnit(time: number, unit: DurationFormatAssetsUnit) {
	if (time in unit) return `${time} ${unit[time]}`;
	return `${time} ${unit.DEFAULT}`;
}

/**
 * Display the duration
 * @param duration The duration in milliseconds to parse and display
 * @param assets The language assets
 */
export default function(duration: number, precision = 7) {
	const output: string[] = [];

	for (const [type, timeDuration] of kTimeDurations) {
		const substraction = duration / timeDuration;
		if (substraction < 1) continue;

		const floored = Math.floor(substraction);
		duration -= floored * timeDuration;
		output.push(addUnit(floored, TIMES[type]));

		// If the output has enough precision, break
		if (output.length >= precision) break;
	}

	return output.join(' ') || addUnit(0, TIMES.SECOND);
}

interface DurationFormatAssetsUnit extends Record<number, string> {
	DEFAULT: string;
}
