import { app } from '@mmstudio/wxapp';

import s from './s';

import a001 from './a001';

(() => {
	const actions = {
		a001
	};
	app(s, actions);
})();
