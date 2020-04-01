const gulp = require('gulp');
const shell = require('gulp-shell');

gulp.task('create-app.js', (cb) => {
	const fs = require('fs');
	const path = require('path');
	if (!fs.existsSync('./develop')) {
		fs.mkdirSync('./develop');
	}
	const app = path.join('develop', 'app.js');
	if (!fs.existsSync(app)) {
		fs.writeFileSync(app, `require('./js/mm');\nrequire('./js/app');\n`);
	}
	cb();
});

gulp.task('watch-page', () => {
	const path = require('path');
	const fs = require('fs');
	const glob = require("glob");
	function create_page(file) {
		const page_no = path.basename(path.dirname(file));
		const dir = path.join('./develop', 'pages', page_no);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.writeFileSync(path.join(dir, page_no + '.js'), `require('../../js/mm');\nrequire('../../js/${page_no}');\n`);
	}
	glob('./src/**/p.ts', (err, files) => {
		files.forEach(create_page);
	});
	return gulp.watch('./src/**/p.ts')
		.on('add', create_page);
});

gulp.task('watch-page-files', () => {
	const rename = require('gulp-rename');
	gulp.src(['./src/*/**.json', './src/*/**.wxml', './src/*/**.wxss'])
		.pipe(rename((file) => {
			const page_no = file.dirname;
			file.basename = page_no;
			file.dirname = `./pages/${page_no}/`;
		}))
		.pipe(gulp.dest('./develop'));
	gulp.watch(['./src/*/**.json', './src/*/**.wxml', './src/*/**.wxss'])
		.on('add', (file) => {
			const path = require('path');
			const arr = file.split(path.sep);
			const dir = path.join(process.cwd(), 'develop', 'pages', arr.slice(1, arr.length - 1).join(path.sep));
			const dev = path.join(process.cwd(), 'develop', 'pages', arr.slice(1, arr.length).join(path.sep));
			lazy(file, dir, dev, 0);
		})
		.on('change', (file) => {
			const path = require('path');
			const arr = file.split(path.sep);
			const dir = path.join(process.cwd(), 'develop', 'pages', arr.slice(1, arr.length - 1).join(path.sep));
			const dev = path.join(process.cwd(), 'develop', 'pages', arr.slice(1, arr.length).join(path.sep));
			lazy(file, dir, dev, 0);
		});
});

function lazy(file, dir, dev, time) {
	const fs = require('fs');
	if (time > 50) {
		return;
	}
	const content = fs.readFileSync(file, 'utf8');
	if (!content) {
		setTimeout(() => {
			lazy(file, dir, dev, time + 1);
		}, 50);
	} else {
		if (!fs.existsSync(dir)) {
			setTimeout(() => {
				lazy(file, dir, dev, time + 1);
			}, 50);
		} else {
			fs.writeFileSync(dev, content);
		}
	}
}

gulp.task('watch-css-images', () => {
	const path = require('path');
	gulp.src('./images/**/*')
		.pipe(gulp.dest('develop/images'));
	return gulp.watch(['./images/**/*'])
		.on('add', (file) => {
			const dir = path.dirname(file);
			gulp.src(file).pipe(gulp.dest(path.join('develop', dir)));
		})
		.on('change', (file) => {
			const dir = path.dirname(file);
			gulp.src(file).pipe(gulp.dest(path.join('develop', dir)));
		});
});

gulp.task('watch-file-app-debug', () => {
	const fs = require('fs');
	const source = './src/app-debug.json';
	if (!fs.existsSync(source)) {
		const buf = fs.readFileSync('./src/app.json');
		fs.writeFileSync(source, buf);
	}
	const dist = './develop/';
	const rename = require('gulp-rename');
	function cp() {
		return gulp.src(source)
			.pipe(rename('app.json'))
			.pipe(gulp.dest(dist));
	}
	cp();
	return gulp.watch(source).on('change', cp);
});

function sleep(timeout) {
	return new Promise((resolve) => {
		setTimeout(resolve, timeout);
	})
}

gulp.task('webpack-watch', async () => {
	await sleep(10000);
	const dest = './develop/js/';
	const path = require('path');
	const webpack = require('webpack');
	const named = require('vinyl-named');
	const ws = require('webpack-stream');
	const insert = require('gulp-insert');
	return gulp.src([`./dist/app/app.js`, `./dist/**/p.js`])
		.pipe(named((file, enc) => {
			return path.basename(path.dirname(file.path));
		}))
		.pipe(ws({
			watch: true,
			watchOptions: {
				aggregateTimeout: 300,
				poll: 1000,
				ignored: /node_modules/
			},
			mode: 'none',	// 开发模式下，不分割代码
			optimization: {
				minimize: false,
				splitChunks: {
					name: 'mm',
					chunks: 'all'
				}
			},
			watch: true,
			externals: [
				// "nools" // this is a bad js file
			],
			output: {
				globalObject: 'global',
				libraryTarget: "commonjs",
				filename: '[name].js'
			}
		}, webpack))
		.pipe(insert.transform(function (contents, file) {
			return `const regeneratorRuntime = require('./runtime.js');
${contents}`;
		}))
		.pipe(gulp.dest(dest));
});

gulp.task('dev', shell.task(`npm run test:server`));

gulp.task('test:ts', shell.task(`npm run test:ts`));

gulp.task('default', gulp.parallel('test:ts', 'create-app.js', 'watch-file-app-debug', 'dev', 'watch-page', 'watch-page-files', 'watch-css-images', 'webpack-watch'));
