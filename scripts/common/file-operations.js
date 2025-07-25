import * as fs from "node:fs";
import path from "path";

/**
 * Copy `src` to `dest`, in Promise way.
 * @param {string} src
 * @param {string} dest
 * @return {void}
 */
export function cp(src, dest) {
	if(fs.existsSync(dest) && fs.lstatSync(dest).isDirectory()){
		dest = path.resolve(dest, "./" + path.basename(src));
	}

	return fs.copyFileSync(src, dest);
}
