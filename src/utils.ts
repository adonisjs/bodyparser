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
 * We can detect file types for these files using the magic
 * number
 */
export const supportMagicFileTypes = [
	'jpg',
	'png',
	'apng',
	'gif',
	'webp',
	'flif',
	'cr2',
	'cr3',
	'orf',
	'arw',
	'dng',
	'nef',
	'rw2',
	'raf',
	'tif',
	'bmp',
	'icns',
	'jxr',
	'psd',
	'indd',
	'zip',
	'tar',
	'rar',
	'gz',
	'bz2',
	'7z',
	'dmg',
	'mp4',
	'mid',
	'mkv',
	'webm',
	'mov',
	'avi',
	'mpg',
	'mp1',
	'mp2',
	'mp3',
	'ogg',
	'ogv',
	'ogm',
	'oga',
	'spx',
	'ogx',
	'opus',
	'flac',
	'wav',
	'qcp',
	'amr',
	'pdf',
	'epub',
	'mobi',
	'exe',
	'swf',
	'rtf',
	'woff',
	'woff2',
	'eot',
	'ttf',
	'otf',
	'ico',
	'flv',
	'ps',
	'xz',
	'sqlite',
	'nes',
	'crx',
	'xpi',
	'cab',
	'deb',
	'ar',
	'rpm',
	'Z',
	'lz',
	'cfb',
	'mxf',
	'mts',
	'wasm',
	'blend',
	'bpg',
	'docx',
	'pptx',
	'xlsx',
	'jp2',
	'jpm',
	'jpx',
	'mj2',
	'aif',
	'odt',
	'ods',
	'odp',
	'xml',
	'heic',
	'cur',
	'ktx',
	'ape',
	'wv',
	'asf',
	'dcm',
	'mpc',
	'ics',
	'glb',
	'pcap',
	'dsf',
	'lnk',
	'alias',
	'voc',
	'ac3',
	'3gp',
	'3g2',
	'm4v',
	'm4p',
	'm4a',
	'm4b',
	'f4v',
	'f4p',
	'f4a',
	'f4b',
	'mie',
	'shp',
	'arrow',
	'aac',
	'it',
	's3m',
	'xm',
	'ai',
	'skp',
	'avif',
	'eps',
	'lzh',
	'pgp',
	'asar',
	'stl',
]

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
