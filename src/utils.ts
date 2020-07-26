/*
 * @adonisjs/bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../adonis-typings/bodyparser.ts" />

import { extname } from 'path'
import { fromBuffer } from 'file-type'
import mediaTyper from 'media-typer'

/**
 * Attempts to parse the file mime type using the file magic number
 */
function parseMimeType(mime: string): { type: string; subtype: string } | null {
	try {
		const { type, subtype } = mediaTyper.parse(mime)
		return { type, subtype }
	} catch (error) {
		return null
	}
}

/**
 * Returns the file `type`, `subtype` and `extension`.
 */
export async function getFileType(
	fileContents: Buffer,
	clientName: string,
	headers: { [key: string]: string },
	force: boolean = false
): Promise<null | { ext: string; type?: string; subtype?: string }> {
	/**
	 * Attempt to detect file type from it's content
	 */
	const magicType = await fromBuffer(fileContents)
	if (magicType) {
		return Object.assign({ ext: magicType.ext }, parseMimeType(magicType.mime))
	}

	/**
	 * If we are unable to pull the file magicType and the current
	 * bytes of the content is under the minimumBytes required,
	 * then we should return `null` and force the consumer
	 * to re-call this method after receiving more content
	 * from the stream
	 */
	if (!force) {
		return null
	}

	/**
	 * Otherwise fallback to file extension from it's client name
	 * and pull type/subtype from the headers content type.
	 */
	return Object.assign(
		{ ext: extname(clientName).replace(/^\./, '') },
		parseMimeType(headers['content-type'])
	)
}
