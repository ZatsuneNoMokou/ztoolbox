import * as fs from "node:fs";
import * as path from "node:path";
import sass from "sass";

import {cp} from "./common/file-operations.js";
import {info, error} from "./common/custom-console.js";
import {projectRootDir} from "./projectRootDir.js";

const fontPath = path.join(projectRootDir, './webextension/assets/fonts/'),
	jsLib = path.join(projectRootDir, './webextension/lib/')
;

/**
 *
 * @param {string} src
 * @param {string} dest
 * @private
 */
function _cp(src, dest) {
	return cp(path.join(projectRootDir, src), dest);
}


const exist_jsLib = fs.existsSync(jsLib);
if (!exist_jsLib) {
	error("JS lib folder not found!");
	process.exit(1);
} else {
	info("Copying nunjucks-slim...");
	_cp("./node_modules/nunjucks/browser/nunjucks-slim.js", jsLib);

	info("Copying MaterialIcons (material-symbols)...");
	_cp("./node_modules/material-symbols/material-symbols-outlined.woff2", path.normalize(`${fontPath}/material-symbols-outlined.woff2`));
	_cp("./node_modules/material-symbols/material-symbols-rounded.woff2", path.normalize(`${fontPath}/material-symbols-rounded.woff2`));
	_cp("./node_modules/material-symbols/material-symbols-sharp.woff2", path.normalize(`${fontPath}/material-symbols-sharp.woff2`));
	fs.writeFileSync(
		path.join(projectRootDir, './webextension/assets/fonts/material-symbols.css'), sass.compile("./node_modules/material-symbols/index.scss").css
			.replace(/ {2}/g, '\t')
			.replace(/(font-family: "Material Symbols \w+?";)/g, '/*noinspection CssNoGenericFontName*/\n\t$1 /* stylelint-disable-line font-family-no-missing-generic-family-keyword */'),
		{ encoding: 'utf-8' }
	);

	info("Copying socket.io-client...");
	_cp("./node_modules/socket.io-client/dist/socket.io.esm.min.js", jsLib);
	_cp("./node_modules/socket.io-client/dist/socket.io.esm.min.js.map", jsLib);
}
