import { host } from '../../../config';

declare const global: { host: string; };

export default async function ap1() {
	global.host = host;
}
