declare namespace Intl {
	type ListType = 'conjunction' | 'disjunction';

	interface ListFormatOptions {
		localeMatcher?: 'lookup' | 'best fit';
		type?: ListType;
		style?: 'long' | 'short' | 'narrow';
	}

	interface ListFormatPart {
		type: 'element' | 'literal';
		value: string;
	}

	class ListFormat {
		public constructor(locales?: string | string[], options?: ListFormatOptions);
		public format(values: any[]): string;
		public formatToParts(values: any[]): ListFormatPart[];
		public supportedLocalesOf(locales: string | string[], options?: ListFormatOptions): string[];
	}
}
